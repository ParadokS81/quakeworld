// apps/qw-oracle/scripts/load-knowledge/load-release-notes.ts
//
// Fetches a tag's GitHub release body, parses it as markdown, and writes one
// row per bullet into release_notes. Fills the gap left by the entity-diff
// pipeline: release bodies carry code-only fixes, feature framing, and
// bitmask-flag additions that never surface as change_events.
//
// Parsing is intentionally forgiving: maintainers write these free-form. We
// track section state via `### ` headers, split on top-level bullets (`- `),
// and extract four inline-pattern kinds per bullet:
//   - entity references (identifiers matching loaded entity names, project-scoped)
//   - commit URLs (github.com/<owner>/<repo>/commit/<sha>)
//   - PR numbers (#NNN)
//   - author handles (@name)
//
// Results stored as JSON arrays on the row. Consumers that need to pivot can
// SELECT ... json_each(referenced_entity_ids_json). This keeps junction-table
// scaffolding off the critical path while preserving lookup flexibility.

import { createHash } from 'crypto';
import type postgres from 'postgres';
import { GitHubClient } from './github.js';
import { upsertReleaseNote } from './natural-keys.js';
import type { Project, ReleaseNoteRow } from './types.js';

// `null` for projects without a GitHub upstream (qwcl). Caller must skip
// release-notes ingestion for those — see hasGithubUpstream().
const PROJECT_REPOS: Record<Project, { owner: string; repo: string } | null> = {
  ezquake: { owner: 'QW-Group', repo: 'ezquake-source' },
  fte:     { owner: 'fte-team', repo: 'fteqw' },
  mvdsv:   { owner: 'QW-Group', repo: 'mvdsv' },
  ktx:     { owner: 'QW-Group', repo: 'ktx' },
  qwcl:    null,
  // qw is the game-itself namespace; no GitHub repo for release notes.
  qw:      null,
  // frozen vendored snapshots; no release-notes flow (D1)
  qtv:   null,
  qwfwd: null,
};

export function projectHasGithubUpstream(project: Project): boolean {
  return PROJECT_REPOS[project] !== null;
}

export interface LoadReleaseNotesOptions {
  sql: postgres.Sql;
  project: Project;
  version: string;
  githubToken: string;
}

export interface LoadReleaseNotesResult {
  bulletsInserted: number;
  sectionsSeen: string[];
  entityRefsResolved: number;
  bulletsWithEntityRef: number;
  releaseBodyFound: boolean;
}

export async function loadReleaseNotes(
  options: LoadReleaseNotesOptions,
): Promise<LoadReleaseNotesResult> {
  const repoInfo = PROJECT_REPOS[options.project];
  if (!repoInfo) {
    throw new Error(
      `Project '${options.project}' has no GitHub upstream; release-notes ingestion is not applicable.`,
    );
  }

  const versionRows = await options.sql<{ one: number }[]>`
    SELECT 1 AS one FROM versions WHERE project = ${options.project} AND version = ${options.version}
  `;
  if (versionRows.length === 0) {
    throw new Error(
      `No versions row for ${options.project}:${options.version}. Run load-version first so entity cross-references resolve.`,
    );
  }

  const gh = new GitHubClient(options.githubToken);
  const body = await gh.getReleaseBody(repoInfo.owner, repoInfo.repo, options.version);
  if (body === null) {
    return {
      bulletsInserted: 0,
      sectionsSeen: [],
      entityRefsResolved: 0,
      bulletsWithEntityRef: 0,
      releaseBodyFound: false,
    };
  }

  const bullets = parseReleaseBody(body);
  const entityNames = await loadEntityNameIndex(options.sql, options.project);

  // Resolve every bullet's commit URLs to their associated PR numbers. Release
  // bodies overwhelmingly cite commits (not #NNNN inline), so without this
  // step the cross-reference back to change_events (which enrich-prs keys on
  // PR number) would almost never light up. One GitHub call per unique SHA,
  // cached across bullets within this run.
  const commitToPr = new Map<string, number | null>();
  for (const b of bullets) {
    for (const url of b.commitUrls) {
      const sha = parseShaFromCommitUrl(url);
      if (!sha || commitToPr.has(sha)) continue;
      const pr = await gh.getPrsForCommit(repoInfo.owner, repoInfo.repo, sha);
      commitToPr.set(sha, pr?.pr_number ?? null);
    }
  }

  const now = new Date().toISOString();
  const sectionsSeen = new Set<string>();
  let entityRefsResolved = 0;
  let bulletsWithEntityRef = 0;

  await options.sql.begin(async (tx) => {
    for (const b of bullets) {
      sectionsSeen.add(b.section);
      const refs = resolveEntityRefs(b.body, entityNames);
      if (refs.length > 0) bulletsWithEntityRef += 1;
      entityRefsResolved += refs.length;

      // Union of inline #NNNN refs and commit-URL-resolved PRs. Duplicates
      // collapse; any bullet with neither source stays null.
      const prSet = new Set<number>(b.prNumbers);
      for (const url of b.commitUrls) {
        const sha = parseShaFromCommitUrl(url);
        const pr = sha ? commitToPr.get(sha) : null;
        if (pr) prSet.add(pr);
      }
      const prNumbers = [...prSet].sort((a, b) => a - b);

      const row: ReleaseNoteRow = {
        project: options.project,
        version: options.version,
        section: b.section,
        ordinal: b.ordinal,
        body_md: b.body,
        // JSONB columns. Pass JS arrays directly so postgres-js encodes as JSONB
        // arrays, not JSONB strings (legacy SQLite-era TEXT bug).
        referenced_entity_ids_json: refs.length ? refs : null,
        commit_urls_json: b.commitUrls.length ? b.commitUrls : null,
        pr_numbers_json: prNumbers.length ? prNumbers : null,
        author_handles_json: b.authorHandles.length ? b.authorHandles : null,
        raw_body_hash: createHash('sha1').update(b.body).digest('hex'),
        extracted_at: now,
      };
      await upsertReleaseNote(tx, row);
    }
  });

  return {
    bulletsInserted: bullets.length,
    sectionsSeen: [...sectionsSeen],
    entityRefsResolved,
    bulletsWithEntityRef,
    releaseBodyFound: true,
  };
}

interface ParsedBullet {
  section: string;
  ordinal: number;
  body: string;
  commitUrls: string[];
  prNumbers: number[];
  authorHandles: string[];
}

// Section state machine: `### Name` sets current section; bullets inherit it.
// Any bullet seen before a section header lands in `_preamble`.
export function parseReleaseBody(body: string): ParsedBullet[] {
  const lines = body.split(/\r?\n/);
  const bullets: ParsedBullet[] = [];
  let section = '_preamble';
  const perSectionCounter = new Map<string, number>();

  let currentBuf: string | null = null;
  let currentSection = section;

  const flush = () => {
    if (currentBuf === null) return;
    const trimmed = currentBuf.trim();
    if (trimmed.length > 0) {
      const ord = (perSectionCounter.get(currentSection) ?? 0) + 1;
      perSectionCounter.set(currentSection, ord);
      bullets.push({
        section: currentSection,
        ordinal: ord,
        body: trimmed,
        commitUrls: extractCommitUrls(trimmed),
        prNumbers: extractPrNumbers(trimmed),
        authorHandles: extractAuthorHandles(trimmed),
      });
    }
    currentBuf = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const headerMatch = /^##+\s+(.+?):?\s*$/.exec(line);
    if (headerMatch) {
      flush();
      // Skip the document-level H2 ("## ezQuake 3.6.9 Release Notes"). Only
      // H3+ resets section state.
      if (line.startsWith('### ')) {
        section = normaliseSection(headerMatch[1]!);
        currentSection = section;
      }
      continue;
    }

    const bulletMatch = /^\s*[-*+]\s+(.+)$/.exec(line);
    if (bulletMatch) {
      flush();
      currentBuf = bulletMatch[1]!;
      currentSection = section;
      continue;
    }

    // Continuation line: indented text under a bullet. Append to current buf
    // if it's non-empty; otherwise ignore.
    if (currentBuf !== null && line.trim().length > 0 && /^\s/.test(raw)) {
      currentBuf += ' ' + line.trim();
      continue;
    }

    // Blank line or unindented prose: flushes the current bullet.
    if (line.trim().length === 0) {
      flush();
    }
  }
  flush();

  return bullets;
}

function normaliseSection(raw: string): string {
  return raw.trim().replace(/\s+/g, '_').toLowerCase();
}

function parseShaFromCommitUrl(url: string): string | null {
  const m = /\/commit\/([a-f0-9]{7,40})/i.exec(url);
  return m ? m[1]!.toLowerCase() : null;
}

const COMMIT_URL_RE = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/commit\/([a-f0-9]{7,40})/gi;
function extractCommitUrls(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(COMMIT_URL_RE)) {
    set.add(m[0]!);
  }
  return [...set];
}

const PR_NUMBER_RE = /(?:^|[\s(])#(\d{2,6})\b/g;
function extractPrNumbers(text: string): number[] {
  const set = new Set<number>();
  for (const m of text.matchAll(PR_NUMBER_RE)) {
    set.add(Number(m[1]));
  }
  return [...set].sort((a, b) => a - b);
}

const AUTHOR_HANDLE_RE = /\(@([A-Za-z0-9_-]+)\)/g;
function extractAuthorHandles(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(AUTHOR_HANDLE_RE)) {
    set.add(m[1]!);
  }
  return [...set];
}

// Token candidates for entity lookup. Precision beats recall here: release
// bodies are prose, so matching loose identifiers produces dozens of false
// positives against short entity names like ruleset:default or
// asset_category:sound. Signals trusted as identifier references:
//   1. Technical idents: contain at least one underscore or dot (ezQuake's
//      canonical cvar / command / macro style).
//   2. +/- prefix commands: `+showscores`, `-attack`. Unambiguous in prose.
//   3. Backtick-wrapped tokens: author-marked identifier references.
//   4. Quote-wrapped tokens: a weaker signal, used for "smackdrive"-style
//      callouts that maintainers write without backticks.
//   5. Token primitives: `$X` (case-sensitive by design).
//   6. Brace expansion: `set_{calc,eval,ex,ex2}` -> `set_calc`, etc.
//   7. Bracket range: `hud_gun[2-8]_frame_hide` -> `hud_gun2_frame_hide`, etc.
// Single-word command names ("connect", "say") are handled separately by an
// explicit allowlist in BARE_WORD_COMMANDS to keep prose words from matching
// blindly.

const TECHNICAL_IDENT_RE = /(?:^|[\s`()[\]"',.:;!?/])([+\-]?[a-z_][a-z0-9_.+\-]*(?:[_.][a-z0-9_.+\-]+)+)(?=$|[\s`()[\]"',.:;!?/])/gi;

// +/- prefix command: 2+ letters after the sign, no internal underscore required.
// Matches +showscores, -attack, -r-dump-shaders (already covered by TECHNICAL_IDENT
// when underscored; this catches the plain-word form).
const PLUS_MINUS_COMMAND_RE = /(?:^|[\s`()[\]"',.:;!?/])([+\-][a-z][a-z0-9_\-]+)(?=$|[\s`()[\]"',.:;!?/])/gi;

const BACKTICK_RE = /`([^`]+)`/g;
const BACKTICK_IDENT_RE = /^[+\-$]?[\w.+\-]+$/;

// Quote-wrapped identifier ("smackdrive", "default", "cl_foo"). Separately
// required because maintainers sometimes use quotes instead of backticks.
const QUOTE_WRAP_RE = /"([+\-]?[a-z][a-z0-9_.+\-]{1,40})"/gi;

// Negative lookahead rejects matches inside longer identifiers like `$dateiso`,
// which would otherwise incorrectly link to `token_primitive:$d` via the first
// char. Token primitives are single-character by definition.
const TOKEN_PRIMITIVE_RE = /\$([a-zA-Z0-9])(?![a-zA-Z0-9])/g;

// Brace expansion: `set_{calc,eval,ex,ex2}` => set_calc, set_eval, set_ex, set_ex2.
// Suffix support (`{a,b}_foo`) would bloat the regex for marginal gain -- not seen.
const BRACE_EXPAND_RE = /([a-z][a-z0-9_]*)(_)?\{([a-z0-9_,\s]+)\}/gi;

// Bracket range: `hud_gun[2-8]_frame_hide` => hud_gun2_frame_hide ... hud_gun8_frame_hide.
// Caps the range at 16 to avoid pathological `[1-999]`-style cases.
const BRACKET_RANGE_RE = /([a-z][a-z0-9_]*)\[(\d{1,3})-(\d{1,3})\]([a-z0-9_]*)/gi;
const BRACKET_RANGE_LIMIT = 16;

// Hand-curated bare-word entity names that appear in release notes without
// backticks or quotes. Only distinctive names go here -- anything whose
// English co-occurrence is plausible (say, kill, connect, echo, ...) is
// deliberately excluded. Expand with evidence from real release bodies, not
// speculation: an entry that produces false positives hurts every version.
const BARE_WORD_ALLOWLIST: readonly string[] = [
  // Rulesets often mentioned by name in prose ("Add smackdrive", "thunderdome restrictions")
  'smackdrive', 'smackdown', 'thunderdome', 'mtfl', 'qcon',
  // Distinctive command families whose root is a bare word
  'skywind',
];
const BARE_WORD_ALLOWLIST_RE = new RegExp(
  `\\b(${BARE_WORD_ALLOWLIST.join('|')})\\b`,
  'gi',
);

function extractCandidateTokens(text: string): string[] {
  const set = new Set<string>();

  for (const m of text.matchAll(TECHNICAL_IDENT_RE)) {
    set.add(m[1]!.toLowerCase());
  }

  for (const m of text.matchAll(PLUS_MINUS_COMMAND_RE)) {
    set.add(m[1]!.toLowerCase());
  }

  for (const m of text.matchAll(BACKTICK_RE)) {
    const token = m[1]!.trim();
    if (!BACKTICK_IDENT_RE.test(token) || token.length < 2) continue;
    // Token primitives (`$X`) stay case-sensitive; everything else canonicalises.
    set.add(token.startsWith('$') ? token : token.toLowerCase());
  }

  for (const m of text.matchAll(QUOTE_WRAP_RE)) {
    set.add(m[1]!.toLowerCase());
  }

  for (const m of text.matchAll(TOKEN_PRIMITIVE_RE)) {
    set.add('$' + m[1]!);
  }

  for (const m of text.matchAll(BRACE_EXPAND_RE)) {
    const prefix = m[1]!.toLowerCase();
    const sep = m[2] ? '_' : '';
    const parts = m[3]!.split(',').map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      set.add(`${prefix}${sep}${part}`);
    }
  }

  for (const m of text.matchAll(BRACKET_RANGE_RE)) {
    const prefix = m[1]!.toLowerCase();
    const suffix = m[4]!.toLowerCase();
    const from = Math.min(Number(m[2]), Number(m[3]));
    const to = Math.max(Number(m[2]), Number(m[3]));
    if (to - from + 1 > BRACKET_RANGE_LIMIT) continue;
    for (let n = from; n <= to; n++) {
      set.add(`${prefix}${n}${suffix}`);
    }
  }

  for (const m of text.matchAll(BARE_WORD_ALLOWLIST_RE)) {
    set.add(m[1]!.toLowerCase());
  }

  return [...set];
}

async function loadEntityNameIndex(
  sql: postgres.Sql,
  project: Project,
): Promise<Map<string, string>> {
  const rows = await sql<Array<{ name: string; canonical_id: string }>>`
    SELECT name, canonical_id FROM entities WHERE project = ${project}
  `;
  const index = new Map<string, string>();
  for (const r of rows) {
    // entities.name is already canonicalised (lowercase except token_primitive).
    index.set(r.name, r.canonical_id);
  }
  return index;
}

function resolveEntityRefs(text: string, index: Map<string, string>): string[] {
  const candidates = extractCandidateTokens(text);
  const hits = new Set<string>();
  for (const c of candidates) {
    const id = index.get(c);
    if (id) hits.add(id);
  }
  return [...hits].sort();
}
