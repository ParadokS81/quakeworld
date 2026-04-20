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
import type Database from 'better-sqlite3';
import { GitHubClient } from './github.js';
import { upsertReleaseNote } from './natural-keys.js';
import type { Project, ReleaseNoteRow } from './types.js';

const PROJECT_REPOS: Record<Project, { owner: string; repo: string }> = {
  ezquake: { owner: 'QW-Group', repo: 'ezquake-source' },
  fte:     { owner: 'fte-team', repo: 'fteqw' },
  mvdsv:   { owner: 'QW-Group', repo: 'mvdsv' },
  ktx:     { owner: 'QW-Group', repo: 'ktx' },
};

export interface LoadReleaseNotesOptions {
  db: Database.Database;
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
  if (!repoInfo) throw new Error(`Unknown project: ${options.project}`);

  const versionRow = options.db.prepare(
    `SELECT 1 FROM versions WHERE project = ? AND version = ?`,
  ).get(options.project, options.version);
  if (!versionRow) {
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
  const entityNames = loadEntityNameIndex(options.db, options.project);

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

  const txn = options.db.transaction(() => {
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
        referenced_entity_ids_json: refs.length ? JSON.stringify(refs) : null,
        commit_urls_json: b.commitUrls.length ? JSON.stringify(b.commitUrls) : null,
        pr_numbers_json: prNumbers.length ? JSON.stringify(prNumbers) : null,
        author_handles_json: b.authorHandles.length ? JSON.stringify(b.authorHandles) : null,
        raw_body_hash: createHash('sha1').update(b.body).digest('hex'),
        extracted_at: now,
      };
      upsertReleaseNote(options.db, row);
    }
  });

  txn();

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
// asset_category:sound. Only three signals are trusted:
//   1. Technical idents: contain at least one underscore or dot, or start
//      with +/- (ezQuake's canonical cvar / command / macro style).
//   2. Backtick-wrapped tokens: author-marked identifier references.
//   3. Token primitives: `$X` (case-sensitive by design).
// Single-word command names ("connect", "say") will be missed. That's an
// accepted tradeoff -- the loss here is far smaller than the noise gained
// by allowing bare English words.

const TECHNICAL_IDENT_RE = /(?:^|[\s`()[\]"',.:;!?/])([+\-]?[a-z_][a-z0-9_.+\-]*(?:[_.][a-z0-9_.+\-]+)+)(?=$|[\s`()[\]"',.:;!?/])/gi;
const BACKTICK_RE = /`([^`]+)`/g;
const BACKTICK_IDENT_RE = /^[+\-$]?[\w.+\-]+$/;
const TOKEN_PRIMITIVE_RE = /\$([a-zA-Z0-9])/g;

function extractCandidateTokens(text: string): string[] {
  const set = new Set<string>();

  for (const m of text.matchAll(TECHNICAL_IDENT_RE)) {
    set.add(m[1]!.toLowerCase());
  }

  for (const m of text.matchAll(BACKTICK_RE)) {
    const token = m[1]!.trim();
    if (!BACKTICK_IDENT_RE.test(token) || token.length < 2) continue;
    // Token primitives (`$X`) stay case-sensitive; everything else canonicalises.
    set.add(token.startsWith('$') ? token : token.toLowerCase());
  }

  for (const m of text.matchAll(TOKEN_PRIMITIVE_RE)) {
    set.add('$' + m[1]!);
  }

  return [...set];
}

function loadEntityNameIndex(
  db: Database.Database,
  project: Project,
): Map<string, string> {
  const rows = db.prepare(
    `SELECT name, canonical_id FROM entities WHERE project = ?`,
  ).all(project) as Array<{ name: string; canonical_id: string }>;
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
