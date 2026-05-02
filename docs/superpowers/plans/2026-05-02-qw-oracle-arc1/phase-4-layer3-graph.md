# Phase 4 - Layer 3 + bidirectional graph

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `_legacy-monolithic-plan.md` for inspiration only - do NOT copy SQL or code blocks; verify against live source files.
> 4. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

Land the Layer 3 storage layer in Postgres: migration `005_layer3_concepts.sql` creates 5 new tables (`concepts`, `concept_chunks`, `concept_entities`, `concept_concepts`, `redirect_targets`), a markdown-aware chunker is added under `apps/qw-oracle/shared/chunking.ts`, and a new loader at `apps/qw-oracle/scripts/load-concepts/` parses the 9 hand-authored concept notes under `apps/qw-oracle/concept-notes/*.md`, chunks each body, partitions `related_entities:` frontmatter into entity refs vs external refs (commits / PRs / extensions), upserts everything atomically per slug, and runs a body-link drift check warning on cross-concept links missing from `related_concepts:` frontmatter. Embeddings are NOT computed in this phase - `concept_chunks.embedding` stays NULL and `embedding_stale` defaults FALSE; Phase 5 fills the column. The `redirect_targets` table is created empty; Phase 6 seeds it when wiring the `redirect_to_human` tool.

The current MCP-side concept reader (`serve/mcp/src/concept-loader.ts`) keeps reading concept notes from disk into an in-memory `Map`; Phase 4 does not touch it. Phase 6 cuts the MCP server over to `concepts` and the bidirectional graph tables. Phase 4's contract is "Postgres now holds the graph the MCP will query later."

Runnable state at phase boundary: 5 new tables exist in `qw_oracle` and `qw_oracle_test`; `bun run load-concepts` reports `loaded 9, skipped 4` (the 4 skipped are `CLAUDE.md`, `README.md`, `OPERATIONS.md`, `_gap-report.md`, none of which carry a `slug:` frontmatter); `concepts`, `concept_chunks`, and `concept_entities` are populated; `concept_concepts` is empty until operator authoring adds `related_concepts:` lists (no current note carries them, verified at draft time); `bun test shared/chunking.test.ts scripts/load-concepts/` green; legacy MCP read path still works.

## Inputs from previous phase

Phase 3 (Discord-only Layer 2 port) complete:
- Postgres dev container `qw-oracle-postgres-dev` running at `127.0.0.1:5432`; both `qw_oracle` (dev) and `qw_oracle_test` (D13) databases exist with Phase 1's `001_init.sql`, Phase 2's `002_layer1_schema.sql` + `003_layer1_entities_search.sql`, and Phase 3's `004_layer2_chat.sql` applied. Phase 4 reserves filename `005_layer3_concepts.sql`.
- Migrator (`bun db/migrate.ts`) is append-only and sha256-verified per file; re-running is a no-op when no new file is present (Phase 1).
- `apps/qw-oracle/shared/db.ts` exports the postgres-js singleton; `import { db, closeDb } from '../../shared/db.ts'` works from any script (Phase 1).
- `apps/qw-oracle/package.json` runs everything under Bun (D2). `tsx` is gone. `js-yaml` is in `dependencies` (already used by the legacy `import-discord.mjs` and `load-knowledge` paths). `gray-matter` is NOT in the outer package.json today; this phase adds it. Verified at draft time: `apps/qw-oracle/serve/mcp/package.json` carries `"gray-matter": "^4.0.3"` for the MCP-side concept reader, so the version is established.
- `apps/qw-oracle/concept-notes/*.md` exist and are the source of truth for Layer 3 content. Verified at draft time: 13 files total, of which 9 carry a `slug:` frontmatter and are real notes (`weapon-scripts.md`, `lightning-gun-customization.md`, `player-skins.md`, `kmap-legacy-keymap-system.md`, `engine-internal-vs-player-facing-files.md`, `skywind-animated-skyboxes.md`, `completing-legacy-fte-protocol-extensions.md`, `client-side-server-exec-allowlist.md`, `ruleset-anti-script-restriction-pattern.md`); 4 are scaffolding without `slug:` (`CLAUDE.md`, `README.md`, `OPERATIONS.md`, `_gap-report.md`) and the loader silently skips them.
- The MCP server (`apps/qw-oracle/serve/mcp/src/concept-loader.ts`) still reads concept notes from disk via `gray-matter`. Phase 4 leaves this code path untouched. Phase 6 will replace it with a Postgres read.
- Phase 2's loader has populated `entities` so concept->entity refs in `concept_entities` point at rows that already exist for the Phase 4 verification step (5 of the 9 notes carry `ezquake:cvar:*` and `ezquake:command:*` refs that Phase 2 produced).
- No current concept note carries a `related_concepts:` frontmatter list. Phase 4 introduces the convention and ships the loader that consumes it; backfill is operator authoring work, not Phase 4 scope.

If any of these is not true, stop and resolve at the prior phase before proceeding.

## Files touched

### Created

```
apps/qw-oracle/db/migrations/005_layer3_concepts.sql      # hand-written; 5 new tables (concepts + chunks + 2 graph tables + redirect_targets) plus HNSW + GIN indexes
apps/qw-oracle/shared/chunking.ts                         # hand-written; markdown-heading chunker + sha256 helper
apps/qw-oracle/shared/chunking.test.ts                    # hand-written; bun test
apps/qw-oracle/scripts/load-concepts/index.ts             # hand-written; Bun CLI entry
apps/qw-oracle/scripts/load-concepts/parse.ts             # hand-written; frontmatter parse + ref partition + drift detection
apps/qw-oracle/scripts/load-concepts/upsert.ts            # hand-written; atomic per-slug upsert
apps/qw-oracle/scripts/load-concepts/parse.test.ts        # hand-written; unit tests for partitionRefs + drift detection
apps/qw-oracle/scripts/load-concepts/upsert.test.ts       # hand-written; integration test against qw_oracle_test
apps/qw-oracle/scripts/load-concepts/CLAUDE.md            # hand-written; subsystem entry doc
```

### Modified

```
apps/qw-oracle/package.json                               # add gray-matter dep; add load-concepts script entry
```

### Deleted

```
(none)
```

`serve/mcp/src/concept-loader.ts` is not deleted - the MCP server keeps reading concept notes from disk through Phase 5. Phase 6 retires that file when the MCP cuts over to Postgres. Removing it now would break a still-running MCP without giving the bidirectional graph tables a consumer.

## Tasks

### Task 1: Migration `005_layer3_concepts.sql`

**Goal.** Land the 5 Layer 3 tables in Postgres dialect, with HNSW on `concept_chunks.embedding` and GIN on the chunk + entities-graph indexes, all in one migration file. The migration is idempotent only via `db/migrate.ts`'s sha256 tracking; the SQL itself is plain `CREATE TABLE`. Migration ordinal `005` follows Phase 3's `004_layer2_chat.sql` (verified at draft time).

**Files.** `apps/qw-oracle/db/migrations/005_layer3_concepts.sql`. Parent directory `apps/qw-oracle/db/migrations/` already exists from Phase 1.

**Steps.**

- [ ] Create `apps/qw-oracle/db/migrations/005_layer3_concepts.sql` with the full content below.

```sql
-- apps/qw-oracle/db/migrations/005_layer3_concepts.sql
-- Layer 3 storage: concept notes + chunks + bidirectional graph + redirect targets.
--
-- Source-of-truth for content stays in apps/qw-oracle/concept-notes/*.md;
-- these tables are derived. The loader (scripts/load-concepts/) is the only
-- writer. Phase 5 fills concept_chunks.embedding; Phase 6 seeds redirect_targets
-- and wires search_concepts + redirect_to_human MCP tools against these tables.
--
-- tsvector config is 'english' (NOT 'simple' as Layer 2 uses): Layer 3 corpus
-- is curated English content where stemming improves recall. D7 explicitly
-- scopes 'simple' to chat content (Layer 2). See decisions.md.

-- One row per concept note. The body is the post-frontmatter markdown text;
-- frontmatter is preserved as JSONB so non-graph fields (topic, shape,
-- primary_contributors, status, source_url, last_updated, related_messages, ...)
-- survive without a column-per-field schema and Phase 6's get_concept_note can
-- pass through whatever the operator authored.
CREATE TABLE concepts (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  summary      TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL,
  shape        TEXT,                              -- frontmatter `shape:` (one of the named tiers; nullable)
  frontmatter  JSONB NOT NULL,                    -- full frontmatter passthrough (includes related_entities, external refs, etc.)
  body_sha256  TEXT NOT NULL,                     -- hash of body; loader uses this to skip chunk re-write when unchanged
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chunked-for-embedding pieces of each note's body. Phase 4 inserts with
-- embedding NULL; Phase 5's embed-chunks worker fills the vector and clears
-- embedding_stale. The UNIQUE (concept_slug, chunk_index) lets the loader
-- delete-and-rebuild chunks per slug without orphan rows.
CREATE TABLE concept_chunks (
  id                BIGSERIAL PRIMARY KEY,
  concept_slug      TEXT NOT NULL REFERENCES concepts(slug) ON DELETE CASCADE,
  chunk_index       INTEGER NOT NULL,
  text              TEXT NOT NULL,
  text_sha256       TEXT NOT NULL,
  embedding         vector(1024),                                 -- NULL until Phase 5 fills
  embedding_stale   BOOLEAN NOT NULL DEFAULT FALSE,               -- TRUE only when Phase 5 API call fails on a row
  tsv               tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
  UNIQUE (concept_slug, chunk_index)
);
CREATE INDEX concept_chunks_embedding_hnsw ON concept_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX concept_chunks_tsv_gin        ON concept_chunks USING GIN (tsv);

-- Concept-to-entity edges, derived from each note's `related_entities:`
-- frontmatter list, partitioned to drop non-entity refs (commit/pr/extension).
-- entity_canonical_id is NOT a foreign key to entities(canonical_id):
--   (a) authoring may forward-reference an entity not yet ingested,
--   (b) the table outlives any single Layer 1 rebuild,
--   (c) FK ON DELETE behavior would silently prune edges when an entity is
--       retired by extraction (which is the OPPOSITE of what we want -
--       retired entities still appear in historical concept notes).
-- Reverse-lookup index on entity_canonical_id is what Phase 6's lookup_entity
-- uses to populate `linked_concepts: [...]` in its response.
CREATE TABLE concept_entities (
  concept_slug         TEXT NOT NULL REFERENCES concepts(slug) ON DELETE CASCADE,
  entity_canonical_id  TEXT NOT NULL,
  weight               INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (concept_slug, entity_canonical_id)
);
CREATE INDEX concept_entities_entity ON concept_entities(entity_canonical_id);

-- Concept-to-concept edges, derived from each note's `related_concepts:`
-- frontmatter list (a Phase-4-introduced convention; no current note carries it).
-- target_slug is NOT a foreign key to concepts(slug): authoring may
-- forward-reference a sibling note that has not been written yet. The loader
-- emits a console warning at load time when target_slug points at a slug not
-- present in concepts, so drift surfaces operationally.
CREATE TABLE concept_concepts (
  source_slug TEXT NOT NULL REFERENCES concepts(slug) ON DELETE CASCADE,
  target_slug TEXT NOT NULL,
  PRIMARY KEY (source_slug, target_slug)
);

-- redirect_to_human seed targets. Phase 4 creates the table empty; Phase 6
-- seeds it when wiring the redirect_to_human MCP tool. Per the architecture
-- spec the seed list is "Discord channels, expert handles, ezquake.com docs,
-- wiki.quakeworld.nu" - operator-curated. Listed in the spec's open-question 6.
CREATE TABLE redirect_targets (
  topic        TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  url          TEXT NOT NULL,
  description  TEXT
);
```

**Verification.**

```
cd apps/qw-oracle
bun db/migrate.ts
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle \
  -c "\dt concepts concept_chunks concept_entities concept_concepts redirect_targets"
```

- PASS condition: `bun db/migrate.ts` reports `[migrate] applying 005_layer3_concepts.sql`; `\dt` lists all 5 tables. Re-running `bun db/migrate.ts` exits with `[migrate] up-to-date` and applies nothing.
- FAIL condition: a CREATE fails (most likely `relation "concepts" already exists` from a prior partial run; see Recovery), or any of the 5 tables is missing in the post-migrate listing.

### Task 2: Markdown-aware chunker + tests

**Goal.** A small `shared/chunking.ts` module that splits a concept-note body into chunks: one chunk per `## section`, plus the lead-in (text before the first `##`) as its own chunk. Sections that exceed `MAX_TOKENS = 500` (estimated at 4 chars/token) are sub-split on sentence boundaries; sentences that themselves exceed the cap fall back to char-window splitting so no chunk is unbounded. Output is stable - same input always produces the same chunk sequence.

**Files.** `apps/qw-oracle/shared/chunking.ts`, `apps/qw-oracle/shared/chunking.test.ts`. The `apps/qw-oracle/shared/` directory already exists from Phase 1.

**Steps.**

- [ ] Create `apps/qw-oracle/shared/chunking.ts` with the full content below.

```ts
// apps/qw-oracle/shared/chunking.ts
//
// Markdown-aware chunker for Layer 3 concept notes. Splits primarily on `##`
// headings; falls back to sentence-boundary splitting (then char-window
// splitting) when a single section exceeds MAX_TOKENS. Token estimate is the
// 4-chars-per-token heuristic, fine for budget hygiene at this granularity -
// real Voyage tokenization happens in Phase 5 at embedding time.
//
// Stable output: equal input always produces equal output. No timestamps, no
// randomness. The loader's per-chunk sha256 lets Phase 5 skip re-embedding
// chunks whose text hasn't changed.

const MAX_TOKENS = 500;
const APPROX_CHARS_PER_TOKEN = 4;
const MAX_CHARS = MAX_TOKENS * APPROX_CHARS_PER_TOKEN;

export interface Chunk {
  index: number;
  text: string;
}

export function chunkMarkdown(md: string): Chunk[] {
  const sections = splitOnH2(md);
  const chunks: Chunk[] = [];
  let idx = 0;
  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length <= MAX_CHARS) {
      chunks.push({ index: idx++, text: trimmed });
      continue;
    }
    for (const sub of splitBySentence(trimmed)) {
      chunks.push({ index: idx++, text: sub });
    }
  }
  return chunks;
}

function splitOnH2(md: string): string[] {
  const out: string[] = [];
  let current = '';
  for (const line of md.split('\n')) {
    if (/^##\s/.test(line) && current.trim().length > 0) {
      out.push(current);
      current = '';
    }
    current += line + '\n';
  }
  if (current.trim().length > 0) out.push(current);
  return out;
}

function splitBySentence(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    // Single sentence longer than the cap: flush buf, then char-window-split
    // the giant sentence so no produced chunk exceeds MAX_CHARS.
    if (sentence.length > MAX_CHARS) {
      if (buf.trim().length > 0) {
        out.push(buf.trim());
        buf = '';
      }
      for (let i = 0; i < sentence.length; i += MAX_CHARS) {
        out.push(sentence.slice(i, i + MAX_CHARS).trim());
      }
      continue;
    }
    if (buf.length + sentence.length > MAX_CHARS && buf.length > 0) {
      out.push(buf.trim());
      buf = '';
    }
    buf += sentence + ' ';
  }
  if (buf.trim().length > 0) out.push(buf.trim());
  return out;
}

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] Create `apps/qw-oracle/shared/chunking.test.ts` with the full content below. The tests run under `bun test` and do not need a database.

```ts
// apps/qw-oracle/shared/chunking.test.ts
import { describe, expect, test } from 'bun:test';
import { chunkMarkdown, sha256 } from './chunking.ts';

describe('chunkMarkdown', () => {
  test('splits a multi-section note into one chunk per ## heading plus the lead-in', () => {
    const md = '# Top\nintro\n\n## A\nbody A\n\n## B\nbody B';
    const chunks = chunkMarkdown(md);
    expect(chunks.length).toBe(3);
    expect(chunks[0]!.text).toContain('# Top');
    expect(chunks[1]!.text).toContain('## A');
    expect(chunks[1]!.text).toContain('body A');
    expect(chunks[2]!.text).toContain('## B');
  });

  test('further splits a section that exceeds the 500-token cap', () => {
    // ~4000 chars => >500 tokens at 4 chars/token. Sentences ensure
    // splitBySentence has clean break points.
    const sentence = 'one short sentence here. ';
    const longBody = sentence.repeat(200);
    const md = `# Top\n\n## Big\n${longBody}`;
    const chunks = chunkMarkdown(md);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(2000);
    }
  });

  test('falls back to char-window splitting when a single sentence exceeds the cap', () => {
    // 'word ' x 800 = 4000 chars, no sentence terminators.
    const md = `# Top\n\n## Wall\n${'word '.repeat(800)}`;
    const chunks = chunkMarkdown(md);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(2000);
    }
  });

  test('chunks are stable under no-op re-chunking', () => {
    const md = '# T\n\n## A\nfoo\n\n## B\nbar';
    expect(chunkMarkdown(md)).toEqual(chunkMarkdown(md));
  });

  test('empty and whitespace-only input produce no chunks', () => {
    expect(chunkMarkdown('')).toEqual([]);
    expect(chunkMarkdown('   \n\n   ')).toEqual([]);
  });

  test('a single section without ## headings is one chunk', () => {
    const chunks = chunkMarkdown('# Title\nbody only, no h2 sections.');
    expect(chunks.length).toBe(1);
    expect(chunks[0]!.text).toContain('# Title');
  });
});

describe('sha256', () => {
  test('hex-encodes a 64-char hash and is deterministic', async () => {
    const a = await sha256('hello');
    const b = await sha256('hello');
    expect(a).toBe(b);
    expect(a.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(a)).toBe(true);
  });

  test('different inputs produce different hashes', async () => {
    const a = await sha256('hello');
    const b = await sha256('world');
    expect(a).not.toBe(b);
  });
});
```

- [ ] Run the tests:

```
cd apps/qw-oracle
bun test shared/chunking.test.ts
```

**Verification.**

- PASS condition: all 8 tests pass (6 chunkMarkdown + 2 sha256), exit 0.
- FAIL condition: any test fails. Most likely cause: the regex or buffer handling in `splitOnH2` / `splitBySentence` regressed; inspect the failing assertion's actual vs expected.

### Task 3: `load-concepts/parse.ts` + parse.test.ts

**Goal.** A pure-functional parse module: it takes the raw markdown bytes of a concept note and returns a `ParsedConcept` (or `null` if no `slug:` frontmatter). Three named exports: `parseConceptFile`, `partitionRefs`, `extractBodyConceptLinks`. The partition logic mirrors the existing `serve/mcp/src/concept-loader.ts:partitionRefs` but uses a slightly broader entity set and is exposed as a named export so Phase 4's tests can verify it directly.

**Files.** `apps/qw-oracle/scripts/load-concepts/parse.ts`, `apps/qw-oracle/scripts/load-concepts/parse.test.ts`. The directory `apps/qw-oracle/scripts/load-concepts/` is created by this task; parent `scripts/` already exists.

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/load-concepts/parse.ts`:

```ts
// apps/qw-oracle/scripts/load-concepts/parse.ts
//
// Parse a concept-note .md file. Pure: no IO, no DB. Returns null when the
// frontmatter has no slug (skips README.md / OPERATIONS.md / _gap-report.md
// the same way serve/mcp/src/concept-loader.ts already does).
//
// gray-matter is the YAML+body splitter the existing MCP-side concept reader
// uses (apps/qw-oracle/serve/mcp/src/concept-loader.ts:1). Phase 4 reuses the
// same library so frontmatter parsing has one shape across the project.

import matter from 'gray-matter';
import { chunkMarkdown, sha256, type Chunk } from '../../shared/chunking.ts';

// Refs whose 3-part canonical form points at a non-entity artifact. Used to
// keep concept_entities pointing at real Layer 1 entities. The narrower set in
// serve/mcp/src/concept-loader.ts (cvar/command/macro/cmdline_param/ruleset
// only) is a current MCP-surface filter, not a graph-storage filter; Phase 4's
// concept_entities table backs lookup_entity for ALL Layer 1 entity types so
// the partition is "exclude known external prefixes" rather than "include only
// the user-facing five."
const EXTERNAL_REF_PREFIXES: ReadonlySet<string> = new Set(['commit', 'pr', 'extension']);

// Body-link patterns the drift check recognises:
//   [text](concept-notes/<slug>.md)   - relative from the app root
//   [text](<slug>.md)                  - sibling reference within concept-notes/
const CONCEPT_LINK_RE = /\(\s*(?:concept-notes\/)?([a-z0-9][a-z0-9-]*)\.md\s*(?:#[^)]*)?\)/g;

export interface ChunkWithHash extends Chunk {
  sha256: string;
}

export interface ParsedConcept {
  slug: string;
  title: string;
  summary: string;
  body: string;
  bodySha256: string;
  shape: string | null;
  frontmatter: Record<string, unknown>;
  relatedEntities: string[];        // partitioned in: 3-part canonical_ids whose middle segment is an entity type
  externalRefs: string[];           // partitioned out: commits / PRs / extensions (preserved on the parsed object for callers that want them, but not written to concept_entities)
  relatedConcepts: string[];        // from `related_concepts:` frontmatter (Phase-4-introduced convention)
  chunks: ChunkWithHash[];
}

export function partitionRefs(raw: unknown): { entities: string[]; external: string[] } {
  if (!Array.isArray(raw)) return { entities: [], external: [] };
  const entities: string[] = [];
  const external: string[] = [];
  for (const ref of raw) {
    if (typeof ref !== 'string' || ref.length === 0) continue;
    const parts = ref.split(':');
    if (parts.length !== 3 || parts[0]!.length === 0 || parts[1]!.length === 0 || parts[2]!.length === 0) {
      external.push(ref);
      continue;
    }
    if (EXTERNAL_REF_PREFIXES.has(parts[1]!)) {
      external.push(ref);
    } else {
      entities.push(ref);
    }
  }
  return { entities, external };
}

export function extractBodyConceptLinks(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.matchAll(CONCEPT_LINK_RE)) {
    out.add(m[1]!);
  }
  return [...out];
}

export async function parseConceptFile(text: string): Promise<ParsedConcept | null> {
  const parsed = matter(text);
  const fm = parsed.data as Record<string, unknown>;
  const slug = fm.slug;
  if (typeof slug !== 'string' || slug.length === 0) return null;

  const body = parsed.content.trim();
  const bodySha = await sha256(body);
  const rawChunks = chunkMarkdown(body);
  const chunks: ChunkWithHash[] = await Promise.all(
    rawChunks.map(async (c) => ({ ...c, sha256: await sha256(c.text) })),
  );

  const { entities: relatedEntities, external: externalRefs } = partitionRefs(fm.related_entities);
  const relatedConceptsRaw = Array.isArray(fm.related_concepts) ? (fm.related_concepts as unknown[]) : [];
  const relatedConcepts: string[] = [];
  for (const v of relatedConceptsRaw) {
    if (typeof v === 'string' && v.length > 0) relatedConcepts.push(v);
  }

  return {
    slug,
    title: typeof fm.title === 'string' ? fm.title : slug,
    summary: typeof fm.summary === 'string' ? fm.summary : '',
    body,
    bodySha256: bodySha,
    shape: typeof fm.shape === 'string' ? fm.shape : null,
    frontmatter: fm,
    relatedEntities,
    externalRefs,
    relatedConcepts,
    chunks,
  };
}
```

- [ ] Create `apps/qw-oracle/scripts/load-concepts/parse.test.ts`:

```ts
// apps/qw-oracle/scripts/load-concepts/parse.test.ts
//
// Pure-function tests; no DB. Bun test runner.
import { describe, expect, test } from 'bun:test';
import { partitionRefs, extractBodyConceptLinks, parseConceptFile } from './parse.ts';

describe('partitionRefs', () => {
  test('cvar / command / macro 3-part refs go to entities', () => {
    const { entities, external } = partitionRefs([
      'ezquake:cvar:cl_bob',
      'ezquake:command:+fire',
      'ezquake:macro:dingus',
    ]);
    expect(entities).toEqual(['ezquake:cvar:cl_bob', 'ezquake:command:+fire', 'ezquake:macro:dingus']);
    expect(external).toEqual([]);
  });

  test('commit / pr / extension refs go to external', () => {
    const { entities, external } = partitionRefs([
      'ezquake:commit:7c328aa4',
      'ezquake:pr:1234',
      'ezquake:extension:fbsp',
    ]);
    expect(entities).toEqual([]);
    expect(external).toEqual(['ezquake:commit:7c328aa4', 'ezquake:pr:1234', 'ezquake:extension:fbsp']);
  });

  test('keyname / hud_element / ruleset / qw-namespace refs are entities (broader set than MCP user-surface)', () => {
    const { entities, external } = partitionRefs([
      'ezquake:keyname:F1',
      'ezquake:hud_element:fps',
      'ezquake:ruleset:smackdown',
      'qw:map:dm6',
    ]);
    expect(entities).toEqual(['ezquake:keyname:F1', 'ezquake:hud_element:fps', 'ezquake:ruleset:smackdown', 'qw:map:dm6']);
    expect(external).toEqual([]);
  });

  test('malformed refs (1-part, 2-part, empty segments) go to external', () => {
    const { entities, external } = partitionRefs([
      'just-a-name',
      'ezquake:cvar',
      ':cvar:foo',
      'ezquake::foo',
      'ezquake:cvar:',
    ]);
    expect(entities).toEqual([]);
    expect(external.length).toBe(5);
  });

  test('non-array input returns empty result', () => {
    expect(partitionRefs(undefined)).toEqual({ entities: [], external: [] });
    expect(partitionRefs('ezquake:cvar:cl_bob')).toEqual({ entities: [], external: [] });
    expect(partitionRefs(null)).toEqual({ entities: [], external: [] });
  });

  test('non-string array members are dropped', () => {
    const { entities, external } = partitionRefs([42, null, 'ezquake:cvar:cl_bob', undefined]);
    expect(entities).toEqual(['ezquake:cvar:cl_bob']);
    expect(external).toEqual([]);
  });
});

describe('extractBodyConceptLinks', () => {
  test('matches [text](concept-notes/<slug>.md) pattern', () => {
    const body = 'See [weapon scripts](concept-notes/weapon-scripts.md) for the full story.';
    expect(extractBodyConceptLinks(body)).toEqual(['weapon-scripts']);
  });

  test('matches sibling [text](<slug>.md) pattern', () => {
    const body = 'See [weapon scripts](weapon-scripts.md) for context.';
    expect(extractBodyConceptLinks(body)).toEqual(['weapon-scripts']);
  });

  test('deduplicates repeated links', () => {
    const body = '[a](x.md) and again [b](x.md) and finally [c](concept-notes/x.md).';
    expect(extractBodyConceptLinks(body)).toEqual(['x']);
  });

  test('ignores non-md links', () => {
    const body = '[outside](https://example.com) and [code](path/to/file.ts) and [readme](../README.md).';
    expect(extractBodyConceptLinks(body)).toEqual([]);
  });

  test('matches multiple distinct slugs', () => {
    const body = 'Read [a](concept-notes/alpha.md) and [b](beta.md).';
    expect(extractBodyConceptLinks(body).sort()).toEqual(['alpha', 'beta']);
  });
});

describe('parseConceptFile', () => {
  test('returns null when frontmatter has no slug', async () => {
    const text = '---\ntitle: README\n---\n\n# Header\nbody';
    expect(await parseConceptFile(text)).toBeNull();
  });

  test('returns null when frontmatter has empty slug', async () => {
    const text = '---\ntitle: T\nslug: ""\n---\n\nbody';
    expect(await parseConceptFile(text)).toBeNull();
  });

  test('returns null when there is no frontmatter at all', async () => {
    expect(await parseConceptFile('# just a body')).toBeNull();
  });

  test('parses a complete note: slug, title, body, chunks, partitioned refs', async () => {
    const text = [
      '---',
      'slug: weapon-scripts',
      'title: Weapon scripts',
      'summary: Three methods.',
      'shape: domain-walkthrough',
      'related_entities:',
      '  - ezquake:cvar:cl_weaponpreselect',
      '  - ezquake:command:+fire',
      '  - ezquake:commit:7c328aa4',
      'related_concepts:',
      '  - lightning-gun-customization',
      '---',
      '',
      '# Weapon scripts',
      '',
      '## Summary',
      'short.',
      '',
      '## Methods',
      'three of them.',
    ].join('\n');

    const parsed = await parseConceptFile(text);
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(parsed.slug).toBe('weapon-scripts');
    expect(parsed.title).toBe('Weapon scripts');
    expect(parsed.summary).toBe('Three methods.');
    expect(parsed.shape).toBe('domain-walkthrough');
    expect(parsed.relatedEntities).toEqual(['ezquake:cvar:cl_weaponpreselect', 'ezquake:command:+fire']);
    expect(parsed.externalRefs).toEqual(['ezquake:commit:7c328aa4']);
    expect(parsed.relatedConcepts).toEqual(['lightning-gun-customization']);
    expect(parsed.chunks.length).toBeGreaterThanOrEqual(2);  // lead-in + 2 sections (or 3 chunks total)
    expect(parsed.frontmatter.slug).toBe('weapon-scripts');
  });
});
```

- [ ] Run the tests:

```
cd apps/qw-oracle
bun test scripts/load-concepts/parse.test.ts
```

**Verification.**

- PASS condition: all tests pass (6 partitionRefs + 5 extractBodyConceptLinks + 4 parseConceptFile = 15), exit 0.
- FAIL condition: any test fails. Common causes: typo in the regex, missed branch in the partition rule.

### Task 4: `load-concepts/upsert.ts` + upsert.test.ts (integration)

**Goal.** A single transactional upsert per slug. The function takes a `ParsedConcept` and rewrites the concept row, the entity-graph rows, the concept-graph rows, and (when body changed) the chunks - all in one `db.begin()` transaction so a partial failure leaves no half-state visible to the MCP. Hash-based skip on chunk rebuild keeps re-running cheap when bodies are unchanged.

**Files.** `apps/qw-oracle/scripts/load-concepts/upsert.ts`, `apps/qw-oracle/scripts/load-concepts/upsert.test.ts`.

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/load-concepts/upsert.ts`:

```ts
// apps/qw-oracle/scripts/load-concepts/upsert.ts
//
// Atomic per-slug upsert. Single transaction:
//   1. UPSERT concepts row (frontmatter passthrough as JSONB).
//   2. DELETE+INSERT concept_entities for slug (cheap; rebuild always - drift-proof).
//   3. DELETE+INSERT concept_concepts for slug.
//   4. If body_sha256 changed (or no prior row): DELETE+INSERT concept_chunks for slug.
//      Phase 5 re-fills embeddings on chunks where embedding IS NULL OR embedding_stale.
//
// All four steps are in one transaction so a partial failure rolls back; the
// MCP never sees a half-rebuilt concept.

import { db } from '../../shared/db.ts';
import type { ParsedConcept } from './parse.ts';

export async function upsertConcept(c: ParsedConcept): Promise<{ slug: string; chunksRewritten: boolean }> {
  let chunksRewritten = false;
  await db.begin(async (tx) => {
    const existing = await tx<{ body_sha256: string }[]>`
      SELECT body_sha256 FROM concepts WHERE slug = ${c.slug}
    `;
    const skipChunks = existing.length > 0 && existing[0]!.body_sha256 === c.bodySha256;

    // frontmatter is JSONB. Pass via tx.json(value as never) per the
    // qw-oracle CLAUDE.md always-on rule: pre-stringifying with
    // JSON.stringify(...)::jsonb stores a JSONB string scalar (the legacy
    // SQLite-era TEXT bug Phase 2 fixed). Phase 2/3 code (load-knowledge,
    // load-chat) all use tx.json(... as never); Phase 4 matches.
    await tx`
      INSERT INTO concepts (slug, title, summary, body, shape, frontmatter, body_sha256, updated_at)
      VALUES (
        ${c.slug}, ${c.title}, ${c.summary}, ${c.body}, ${c.shape},
        ${tx.json(c.frontmatter as never)}, ${c.bodySha256}, now()
      )
      ON CONFLICT (slug) DO UPDATE SET
        title       = EXCLUDED.title,
        summary     = EXCLUDED.summary,
        body        = EXCLUDED.body,
        shape       = EXCLUDED.shape,
        frontmatter = EXCLUDED.frontmatter,
        body_sha256 = EXCLUDED.body_sha256,
        updated_at  = now()
    `;

    await tx`DELETE FROM concept_entities WHERE concept_slug = ${c.slug}`;
    for (const eid of c.relatedEntities) {
      await tx`
        INSERT INTO concept_entities (concept_slug, entity_canonical_id)
        VALUES (${c.slug}, ${eid})
        ON CONFLICT DO NOTHING
      `;
    }

    await tx`DELETE FROM concept_concepts WHERE source_slug = ${c.slug}`;
    for (const target of c.relatedConcepts) {
      await tx`
        INSERT INTO concept_concepts (source_slug, target_slug)
        VALUES (${c.slug}, ${target})
        ON CONFLICT DO NOTHING
      `;
    }

    if (!skipChunks) {
      await tx`DELETE FROM concept_chunks WHERE concept_slug = ${c.slug}`;
      for (const ch of c.chunks) {
        await tx`
          INSERT INTO concept_chunks (concept_slug, chunk_index, text, text_sha256)
          VALUES (${c.slug}, ${ch.index}, ${ch.text}, ${ch.sha256})
        `;
      }
      chunksRewritten = true;
    }
  });
  return { slug: c.slug, chunksRewritten };
}
```

- [ ] Create `apps/qw-oracle/scripts/load-concepts/upsert.test.ts`:

```ts
// apps/qw-oracle/scripts/load-concepts/upsert.test.ts
//
// Integration test: hits qw_oracle_test (per decisions.md D13). Refuses to run
// against a non-test DB to prevent an accidental `bun test` from clobbering
// dev data.

import { describe, expect, test, beforeEach, afterAll } from 'bun:test';
import { db, closeDb } from '../../shared/db.ts';
import { upsertConcept } from './upsert.ts';
import type { ParsedConcept, ChunkWithHash } from './parse.ts';

const url = process.env.DATABASE_URL;
if (!url || !url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run upsert.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url ?? '<unset>'}`,
  );
}

const SLUG = 'phase4-test-note';

function makeSample(overrides: Partial<ParsedConcept> = {}): ParsedConcept {
  const chunk: ChunkWithHash = {
    index: 0,
    text: '## A\nbody',
    sha256: 'a'.repeat(64),
  };
  return {
    slug: SLUG,
    title: 'Phase 4 test',
    summary: 'A test note.',
    body: '## A\nbody',
    bodySha256: 'b'.repeat(64),
    shape: 'domain-walkthrough',
    frontmatter: {
      slug: SLUG,
      summary: 'A test note.',
      title: 'Phase 4 test',
      shape: 'domain-walkthrough',
      primary_contributors: ['@operator'],
    },
    relatedEntities: ['ezquake:cvar:cl_bob'],
    externalRefs: ['ezquake:commit:abc123'],
    relatedConcepts: ['weapon-scripts'],
    chunks: [chunk],
    ...overrides,
  };
}

describe('upsertConcept', () => {
  beforeEach(async () => {
    await db`DELETE FROM concepts WHERE slug = ${SLUG}`;
  });
  afterAll(async () => {
    await db`DELETE FROM concepts WHERE slug = ${SLUG}`;
    await closeDb();
  });

  test('inserts a new concept with chunks, entity-graph, concept-graph rows', async () => {
    await upsertConcept(makeSample());
    const c = await db`SELECT * FROM concepts WHERE slug = ${SLUG}`;
    expect(c.length).toBe(1);
    expect((c[0] as { title: string }).title).toBe('Phase 4 test');

    const chunks = await db`SELECT * FROM concept_chunks WHERE concept_slug = ${SLUG}`;
    expect(chunks.length).toBe(1);
    expect((chunks[0] as { embedding: unknown }).embedding).toBeNull();
    expect((chunks[0] as { embedding_stale: boolean }).embedding_stale).toBe(false);

    const entities = await db`SELECT * FROM concept_entities WHERE concept_slug = ${SLUG}`;
    expect(entities.length).toBe(1);
    expect((entities[0] as { entity_canonical_id: string }).entity_canonical_id).toBe('ezquake:cvar:cl_bob');

    const sibling = await db`SELECT * FROM concept_concepts WHERE source_slug = ${SLUG}`;
    expect(sibling.length).toBe(1);
    expect((sibling[0] as { target_slug: string }).target_slug).toBe('weapon-scripts');
  });

  test('preserves external refs in concepts.frontmatter JSONB (not in concept_entities)', async () => {
    await upsertConcept(makeSample());
    const fm = (await db`SELECT frontmatter FROM concepts WHERE slug = ${SLUG}`)[0] as { frontmatter: Record<string, unknown> };
    expect(fm.frontmatter.primary_contributors).toEqual(['@operator']);
    const entityRows = await db`
      SELECT entity_canonical_id FROM concept_entities WHERE concept_slug = ${SLUG}
    `;
    const ids = entityRows.map((r) => (r as { entity_canonical_id: string }).entity_canonical_id);
    expect(ids).not.toContain('ezquake:commit:abc123');
  });

  test('skips chunk rewrite when body_sha256 unchanged on second call', async () => {
    const sample = makeSample();
    const first = await upsertConcept(sample);
    expect(first.chunksRewritten).toBe(true);

    const second = await upsertConcept(sample);
    expect(second.chunksRewritten).toBe(false);
    const chunks = await db`SELECT * FROM concept_chunks WHERE concept_slug = ${SLUG}`;
    expect(chunks.length).toBe(1);
  });

  test('rewrites chunks when body_sha256 changes', async () => {
    await upsertConcept(makeSample());
    const changed = makeSample({
      bodySha256: 'c'.repeat(64),
      body: '## A\nbody\n\n## B\nmore',
      chunks: [
        { index: 0, text: '## A\nbody', sha256: 'a'.repeat(64) },
        { index: 1, text: '## B\nmore', sha256: 'd'.repeat(64) },
      ],
    });
    const result = await upsertConcept(changed);
    expect(result.chunksRewritten).toBe(true);
    const chunks = await db`SELECT * FROM concept_chunks WHERE concept_slug = ${SLUG} ORDER BY chunk_index`;
    expect(chunks.length).toBe(2);
  });

  test('rebuilds graph rows on every call (rebuild always - drift-proof)', async () => {
    await upsertConcept(makeSample());
    // Second call drops one entity ref:
    const changed = makeSample({ relatedEntities: [] });
    await upsertConcept(changed);
    const entities = await db`SELECT * FROM concept_entities WHERE concept_slug = ${SLUG}`;
    expect(entities.length).toBe(0);
  });
});
```

- [ ] Run the tests against `qw_oracle_test` (the `npm run test` script sets `DATABASE_URL` to the test DB; per `package.json` from Phase 1):

```
cd apps/qw-oracle
npm run test -- scripts/load-concepts/upsert.test.ts
```

**Verification.**

- PASS condition: all 5 tests green, exit 0. Tests run inside a transaction-cleanup `beforeEach` so a half-failed run leaves no orphan rows.
- FAIL condition: any test fails. Most likely cause: a column name typo against the migration (`embedding_stale` vs `stale_embedding`, or `concept_slug` vs `slug`); cross-check against `005_layer3_concepts.sql`.

### Task 5: `load-concepts/index.ts` (CLI dispatcher)

**Goal.** A small CLI script that walks `apps/qw-oracle/concept-notes/*.md`, parses each, runs the body-link drift check, upserts, and reports a summary line. Skips files without a `slug:` frontmatter (README.md / OPERATIONS.md / _gap-report.md). Closes the DB cleanly so `npm run load-concepts` exits 0.

**Files.** `apps/qw-oracle/scripts/load-concepts/index.ts`.

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/load-concepts/index.ts`:

```ts
// apps/qw-oracle/scripts/load-concepts/index.ts
//
// CLI dispatcher. Walks concept-notes/*.md, parses, runs body-link drift check,
// upserts each, prints a summary.
//
// Bun-native (D2). Uses import.meta.main so the module is also importable from
// tests without auto-running.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, closeDb } from '../../shared/db.ts';
import { parseConceptFile, extractBodyConceptLinks } from './parse.ts';
import { upsertConcept } from './upsert.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONCEPTS_DIR = resolve(__dirname, '..', '..', 'concept-notes');

export async function loadAllConcepts(): Promise<{ loaded: number; skipped: number; warnings: number }> {
  const files = readdirSync(CONCEPTS_DIR).filter((f) => f.endsWith('.md'));
  let loaded = 0;
  let skipped = 0;
  let warnings = 0;

  for (const f of files) {
    const fullPath = resolve(CONCEPTS_DIR, f);
    const text = readFileSync(fullPath, 'utf8');
    const parsed = await parseConceptFile(text);
    if (!parsed) {
      skipped++;
      continue;
    }

    const bodyLinks = extractBodyConceptLinks(parsed.body);
    const declared = new Set(parsed.relatedConcepts);
    for (const link of bodyLinks) {
      if (link === parsed.slug) continue;
      if (!declared.has(link)) {
        console.warn(`[load-concepts] WARN ${parsed.slug}: body links concept "${link}" but does not declare it in related_concepts:`);
        warnings++;
      }
    }

    await upsertConcept(parsed);
    loaded++;
  }
  console.log(`[load-concepts] loaded ${loaded}, skipped ${skipped}, warnings ${warnings}`);
  return { loaded, skipped, warnings };
}

if (import.meta.main) {
  try {
    await loadAllConcepts();
  } finally {
    await closeDb();
  }
}
```

- [ ] Add the `load-concepts` entry to `apps/qw-oracle/package.json`'s `scripts` block, and add `gray-matter` to `dependencies`. The full updated file:

```json
{
  "name": "qw-oracle",
  "version": "0.1.0",
  "description": "QuakeWorld community knowledge base — IRC + Discord chat intelligence",
  "type": "module",
  "scripts": {
    "import:discord": "bun scripts/import-discord.mjs",
    "import:irc": "bun scripts/import-irc.mjs",
    "stats": "bun scripts/stats.mjs",
    "typecheck": "tsc --noEmit",
    "load-knowledge": "bun scripts/load-knowledge/index.ts",
    "load-concepts": "bun scripts/load-concepts/index.ts",
    "db:up": "docker compose -f db/docker-compose.dev.yml up -d",
    "db:down": "docker compose -f db/docker-compose.dev.yml down",
    "db:logs": "docker compose -f db/docker-compose.dev.yml logs -f postgres",
    "db:psql": "docker compose -f db/docker-compose.dev.yml exec postgres psql -U qworacle -d qw_oracle",
    "migrate": "bun db/migrate.ts",
    "migrate:reset": "bun db/migrate.ts --reset",
    "test": "DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun test"
  },
  "dependencies": {
    "@qw/version-resolution": "workspace:*",
    "better-sqlite3": "^11.0.0",
    "gray-matter": "^4.0.3",
    "js-yaml": "^4.1.1",
    "postgres": "^3.4.5",
    "ulid": "^2.4.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.19.39",
    "bun-types": "^1.3.12",
    "typescript": "^5.9.3"
  }
}
```

The pre-existing em-dash in `description` is preserved per Phase 1's Open question (one-character edit deferred to a unrelated phase). Phase 4 does not widen its blast radius to fix it. `better-sqlite3` may have already been dropped by Phase 3; if so, leave it dropped (do not re-add it here). The `dependencies` block above assumes Phase 3 left it; if Phase 3 removed it, the version that lands in Phase 4 omits it.

- [ ] Install:

```
cd apps/qw-oracle
npm install --no-workspaces
```

- [ ] Run the loader against the dev DB end-to-end:

```
cd apps/qw-oracle
npm run load-concepts
```

**Verification.**

```
cd apps/qw-oracle
npm run load-concepts
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT slug FROM concepts ORDER BY slug"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT count(*) FROM concept_chunks"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT count(*) FROM concept_entities"
```

- PASS condition: stdout reads `[load-concepts] loaded 9, skipped 4, warnings 0`. `concepts` lists 9 slugs; `concept_chunks` count > 9; `concept_entities` count > 0.
- FAIL condition: `loaded 0, skipped N` (CONCEPTS_DIR resolved wrong - see Recovery), or chunk count is 0 (chunker returned empty for every note - see Recovery).

### Task 6: `scripts/load-concepts/CLAUDE.md` subsystem doc

**Goal.** A one-page entry doc paralleling `scripts/load-knowledge/CLAUDE.md` so future drafters land on a navigation surface, not raw source. Names the parse/upsert/index split, the partition rule, the body-link drift check, and what Phase 5 will add.

**Files.** `apps/qw-oracle/scripts/load-concepts/CLAUDE.md`.

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/load-concepts/CLAUDE.md`:

```markdown
# scripts/load-concepts/

Layer 3 loader. Walks `apps/qw-oracle/concept-notes/*.md`, parses each into a normalised `ParsedConcept`, and upserts into Postgres atomically per slug. The MCP `get_concept_note` tool reads `concepts` / `concept_chunks` / `concept_entities` / `concept_concepts` after Phase 6 cuts over.

## Files

- `parse.ts` - pure: frontmatter parse via `gray-matter`, body chunked via `shared/chunking.ts`, `related_entities:` partitioned into entity refs vs external refs (commits / PRs / extensions), per-chunk sha256 computed.
- `upsert.ts` - one transaction per slug: UPSERT `concepts`, DELETE+INSERT `concept_entities`, DELETE+INSERT `concept_concepts`, conditionally DELETE+INSERT `concept_chunks` (only when `body_sha256` changed).
- `index.ts` - CLI walker: reads the directory, runs the body-link drift check, calls upsert, prints a summary.
- `parse.test.ts` / `upsert.test.ts` - bun test; the upsert test hits `qw_oracle_test` per D13 and refuses to run against any other DB.

## Partition rule

`related_entities:` in note frontmatter mixes real entity refs (`ezquake:cvar:cl_bob`) with external artifact refs (`ezquake:commit:7c328aa4`, `ezquake:pr:1234`, `ezquake:extension:fbsp`). Only the entity refs land in `concept_entities`; external refs stay only in `concepts.frontmatter` JSONB so the original frontmatter shape is recoverable.

The partition rule is "3-part canonical_id where parts[1] is NOT in `{commit, pr, extension}` -> entity." Broader than the `serve/mcp/src/concept-loader.ts` set (which is the user-surface filter for the in-memory map). The graph table is the source of truth for `lookup_entity(id).linked_concepts` across all Layer 1 entity types after Phase 6.

## Body-link drift check

Loader pre-flight: any markdown link in a body that points at a concept slug (`[text](concept-notes/<slug>.md)` or `[text](<slug>.md)`) emits a warning if that slug is not in the note's `related_concepts:` frontmatter. No current note carries `related_concepts:`, so the warning fires once per cross-link until operator backfills.

## What Phase 5 will add

- `embed-chunks.ts` worker that reads `concept_chunks WHERE embedding IS NULL OR embedding_stale = TRUE`, calls Voyage `voyage-4-large`, writes the vector back, clears the stale flag.
- Per-call `embedding_api_log` row.
- Batch sizing per Voyage's API rate limits.

Phase 4 does NOT integrate embeddings - the column is created NULL and embedding_stale defaults FALSE.

## What Phase 6 will add

- `search_concepts` MCP tool over RRF(tsv_score, vector_score) on `concept_chunks`.
- Bidirectional graph reads: `lookup_entity` adds `linked_concepts: [...]` from `concept_entities`.
- Reads concepts directly from Postgres (retiring `serve/mcp/src/concept-loader.ts`'s in-memory map).
- `redirect_to_human` MCP tool seeded against `redirect_targets` (Phase 4 ships the table empty).
```

**Verification.**

```
cd apps/qw-oracle
ls scripts/load-concepts/CLAUDE.md && grep -c "^## " scripts/load-concepts/CLAUDE.md
```

- PASS condition: file exists; section count >= 4 (Files / Partition rule / Body-link drift check / What Phase 5 will add / What Phase 6 will add).
- FAIL condition: missing file. (Style nits do not block.)

## Verification (phase boundary)

Run from `apps/qw-oracle/`. Each block is YES/NO; operator eyeballs.

```
# 1. Migration applied; 5 new tables exist in dev DB.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle \
  -c "\dt concepts concept_chunks concept_entities concept_concepts redirect_targets"
```
PASS condition: all 5 tables listed.

```
# 2. concept_chunks.embedding is vector(1024) and nullable; embedding_stale is BOOLEAN DEFAULT FALSE.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle \
  -c "SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'concept_chunks'
      ORDER BY ordinal_position"
```
PASS condition: `embedding | USER-DEFINED | YES | NULL`; `embedding_stale | boolean | NO | false`; `tsv | tsvector | YES | NULL`.

```
# 3. concept_chunks.tsv config is 'english' (Layer 3 differs from Layer 2's 'simple' per D7).
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle \
  -c "SELECT generation_expression
      FROM information_schema.columns
      WHERE table_name = 'concept_chunks' AND column_name = 'tsv'"
```
PASS condition: result contains `to_tsvector('english'::regconfig, text)` (or the equivalent literal Postgres returns).

```
# 4. HNSW + GIN indexes on concept_chunks.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle \
  -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'concept_chunks' ORDER BY indexname"
```
PASS condition: index list includes `concept_chunks_embedding_hnsw` (`USING hnsw`) and `concept_chunks_tsv_gin` (`USING gin`) along with the implicit pkey + UNIQUE.

```
# 5. Loader runs end-to-end.
npm run load-concepts
```
PASS condition: stdout reads `[load-concepts] loaded 9, skipped 4, warnings 0`. (Warnings count may be > 0 if the operator has backfilled `related_concepts:` and a body link is missing - that is correct behaviour.)

```
# 6. Row counts non-zero where expected.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "
  SELECT
    (SELECT count(*) FROM concepts)         AS concepts,
    (SELECT count(*) FROM concept_chunks)   AS chunks,
    (SELECT count(*) FROM concept_entities) AS entities,
    (SELECT count(*) FROM concept_concepts) AS sibling_links
"
```
PASS condition: `concepts = 9`; `chunks > 9`; `entities > 0`. `sibling_links` may be 0 (no current note carries `related_concepts:`) - this is expected and not a failure.

```
# 7. embedding_stale defaults are correct: every chunk has embedding IS NULL and embedding_stale = false.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "
  SELECT count(*) FILTER (WHERE embedding IS NULL)         AS null_embedding,
         count(*) FILTER (WHERE embedding_stale = FALSE)   AS not_stale,
         count(*) AS total
  FROM concept_chunks
"
```
PASS condition: `null_embedding == not_stale == total`.

```
# 8. partitionRefs filter: no commit / PR / extension refs land in concept_entities.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "
  SELECT count(*) AS leaked_external
  FROM concept_entities
  WHERE entity_canonical_id LIKE '%:commit:%'
     OR entity_canonical_id LIKE '%:pr:%'
     OR entity_canonical_id LIKE '%:extension:%'
"
```
PASS condition: `leaked_external = 0`.

```
# 9. external_refs ARE preserved in concepts.frontmatter JSONB.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "
  SELECT slug
  FROM concepts
  WHERE jsonb_path_exists(frontmatter, '$.related_entities ? (@ like_regex \":commit:\")')
"
```
PASS condition: returns at least one slug (e.g. `weapon-scripts`, which has `ezquake:commit:7c328aa4` in its frontmatter at draft time).

```
# 9b. F1.jsonb_columns_not_strings regression gate (Phase 4 adds 1 JSONB col).
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "
  SELECT 'concepts.frontmatter' AS probe, COUNT(*) AS bad_rows
  FROM concepts WHERE jsonb_typeof(frontmatter) = 'string'
"
```
PASS condition: `bad_rows = 0`. If non-zero, the upsert path regressed to pre-stringifying JSONB (the Phase 2 bug pattern). Fix in `scripts/load-concepts/upsert.ts` -- pass JS objects via `tx.json(... as never)`, never `JSON.stringify(...)::jsonb`.

```
# 10. Bidirectional graph reverse-lookup index exists and is usable.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "
  SET LOCAL enable_seqscan = OFF;
  EXPLAIN SELECT concept_slug FROM concept_entities WHERE entity_canonical_id = 'ezquake:cvar:cl_weaponpreselect'
"
```
PASS condition: plan uses `Index Scan using concept_entities_entity` (or `Bitmap Index Scan using concept_entities_entity`). `enable_seqscan = OFF` is forced because at Phase 4 row counts (~9 concepts, ~30-50 entity edges) the planner will rationally pick Seq Scan -- the index existing and being usable when forced is what we are verifying. Step 4 already confirmed the index exists; step 10 confirms it is wired correctly enough to be picked under planner pressure.

```
# 11. Tests green.
bun test shared/chunking.test.ts
npm run test -- scripts/load-concepts/parse.test.ts
npm run test -- scripts/load-concepts/upsert.test.ts
```
PASS condition: every invocation reports passing tests, exit 0.

```
# 12. Test DB carries the same schema as dev DB.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_test \
  -c "SELECT filename FROM schema_migrations ORDER BY applied_at" \
  | grep 005_layer3_concepts
```
PASS condition: line found. (Phase 1's `db-up.sh` migrates both DBs; if not run since Phase 4 added the migration, run it again.)

If all 12 PASS, Phase 5 may proceed.

## Outputs to next phase

State now true that wasn't before:

- 5 new tables exist in `qw_oracle` and `qw_oracle_test`. `concepts` holds 9 rows; `concept_chunks` holds N rows (N > 9; depends on chunk granularity); `concept_entities` is non-empty; `concept_concepts` is empty until operator authoring backfills `related_concepts:`.
- `apps/qw-oracle/shared/chunking.ts` exports `chunkMarkdown` + `sha256` for any caller.
- `apps/qw-oracle/scripts/load-concepts/` is the canonical Layer 3 loader. Re-running it is cheap when bodies are unchanged (per-slug body sha256 skip).
- `concept_chunks.embedding` is the column Phase 5's `embed-chunks` worker fills.
- `concept_chunks.embedding_stale` is the flag Phase 5's worker sets when an API call fails on a row; the worker re-tries those rows on subsequent runs (predicate: `embedding IS NULL OR embedding_stale = TRUE`).
- `concept_entities` is the table Phase 6's upgraded `lookup_entity` reads to populate `linked_concepts: [...]`.
- `concept_concepts` is the table Phase 6's upgraded `get_concept_note` reads to populate sibling navigation.
- `redirect_targets` exists empty; Phase 6 seeds it.
- The MCP server's existing `serve/mcp/src/concept-loader.ts` keeps reading from disk; Phase 4 has not changed that contract. Phase 6 retires it when it cuts over.

Phase 5 inputs: this state. Phase 5 adds the Voyage client wrapper, the `embed-entities` worker (against Phase 2's entities table), and the `embed-chunks` worker (against Phase 4's `concept_chunks` table). Phase 5 does not add new schema.

## Open questions / deferred items

- **Question:** `concept_chunks.tsv` config: Phase 4 picks `'english'`. Is that right when a future imported note may carry primarily non-English content?
  **Default chosen for now:** `'english'`. Rationale: the 9 currently-shipped notes are 100% English; Layer 3 is operator-curated content where "match `running` against the chunk that contains `runs`" is desirable; D7 explicitly scopes `'simple'` to the Layer 2 chat corpus where multi-language tokenisation is a real concern.
  **Who can resolve:** Phase 5+ revisit if a non-English note lands and stemming is observed to mangle retrieval. Migration to `'simple'` later is one ALTER + GENERATED column rebuild + GIN reindex.

- **Question:** Body-link drift check pattern: Phase 4 matches `concept-notes/<slug>.md` AND sibling `<slug>.md` forms. Will operator authoring drift produce false positives (e.g. a note links a non-concept .md filename that coincidentally matches a slug-shaped capture)?
  **Default chosen for now:** Match both forms; emit warnings, not errors. The drift check is informational; nothing fails the load. If false positives become noisy, the regex narrows to `concept-notes/<slug>.md` only and the sibling form is dropped.
  **Who can resolve:** operator. No current note carries body links to other notes (verified at draft time), so the check is prophylactic.

- **Question:** `partitionRefs` broader-than-MCP set. Phase 4's `partitionRefs` accepts any non-`{commit, pr, extension}` 3-part canonical_id as an entity. The MCP user-surface set is narrower (cvar/command/macro/cmdline_param/ruleset). When Phase 6 wires `lookup_entity` against `concept_entities`, will the broader set carry into the MCP response?
  **Default chosen for now:** Yes; the broader set is correct for the bidirectional graph. Phase 6's `lookup_entity` already accepts non-user-surface entity types (keyname / hud_element / etc.) in its current SQLite implementation; the new MCP code path matches that contract. The narrower set in `serve/mcp/src/concept-loader.ts` was a v1-MCP-surface decision, not a graph-storage decision.
  **Who can resolve:** Phase 6 drafter, who locks the contract for the new `lookup_entity` query against `concept_entities`.

- **Question:** `redirect_targets` seed data. Phase 4 ships the table empty. Where do the seed rows come from?
  **Default chosen for now:** Phase 6 owns the seed list and the `redirect_to_human` tool that consumes it. Per `architecture-design.md` "open question 6": initial set is operator-curated (Discord channels, expert handles, ezquake.com docs, wiki.quakeworld.nu).
  **Who can resolve:** Phase 6 drafter, in coordination with operator.

- **Question:** `gray-matter` dep on the outer `package.json`. The existing MCP server (`serve/mcp/`) already pins `gray-matter` in its own `package.json`; Phase 4 adds it to the outer too. Could Phase 4 instead reuse `js-yaml` (already a dep) plus a hand-rolled frontmatter splitter?
  **Default chosen for now:** Add `gray-matter`. Rationale: same library the existing reader uses, fewer surprises around BOM / CRLF / leading whitespace handling, smaller blast radius. If a future "single dep set" cleanup happens, this is a candidate. Cost is one mature, well-maintained dependency.
  **Who can resolve:** operator, if a stricter dep policy is preferred.

- **Question:** No current note carries `related_concepts:`. Phase 4 introduces the convention in this loader. Should Phase 4 also backfill the existing notes?
  **Default chosen for now:** No. Backfill is operator authoring work, not Phase 4's scope. The loader is correct on day one with `concept_concepts` empty; the body-link drift check produces zero warnings until cross-links exist; Phase 6's `get_concept_note` will return empty `related_concepts: []` until backfilled.
  **Who can resolve:** operator, in a separate authoring pass.

- **Question:** `concepts.updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` is added in Phase 4's migration but is not present in the architecture spec's `CREATE TABLE concepts` block (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md:256-264`). Additive deviation from the spec.
  **Default chosen for now:** Keep `updated_at`. Rationale: (1) free audit trail for "when did this slug last get rewritten" - useful when investigating retrieval drift; (2) matches Phase 1's `oracle_meta.updated_at` pattern that the operator approved (Phase 1 Open question 4); (3) zero downstream callers depend on its absence; (4) the legacy plan's draft shipped this column verbatim, so removing it widens scope unnecessarily. The deviation is benign and does not change the consumer-facing contract.
  **Who can resolve:** operator. If strict spec-literal compliance is preferred, drop the column and the `DEFAULT now()` clause from `005_layer3_concepts.sql` before approving the phase. If kept, the architecture spec gets a one-line amendment.

- **Question:** `concepts.summary TEXT NOT NULL DEFAULT ''` includes a default that is not in the architecture spec's column definition (spec: `summary TEXT NOT NULL`, no default).
  **Default chosen for now:** Keep the default. Rationale: lets `parseConceptFile` upsert without forcing a `summary: ""` frontmatter line on every note. No current note has an empty summary, so the default never actually fires today; it is forward-looking ergonomics. Same status as `updated_at`: additive, benign, no consumer-contract impact.
  **Who can resolve:** operator, same as above.

## Recovery (if verification fails)

- **Migration 005 fails on a `relation already exists` error.** A prior partial run left tables behind. Drop them and re-apply: `docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "DROP TABLE IF EXISTS concept_chunks, concept_concepts, concept_entities, concepts, redirect_targets CASCADE"`, then `bun db/migrate.ts`. (`migrate:reset` is also available but wipes ALL Layer 1/2 data; only reach for it on a known-empty dev DB.)
- **Migration 005 fails with `extension "vector" is not available`.** Phase 1's `001_init.sql` should have installed `pgvector`. Re-run `bun db/migrate.ts` to confirm; if `001_init.sql` is missing from `schema_migrations`, the dev DB volume was recreated and Phase 1's smoke is needed first.
- **`npm run load-concepts` reports `loaded 0, skipped N`.** `CONCEPTS_DIR` is wrong. The path resolves to `apps/qw-oracle/concept-notes/` from `scripts/load-concepts/index.ts` via `resolve(__dirname, '..', '..', 'concept-notes')`. Confirm the resolved path with a one-shot `bun -e "import { fileURLToPath } from 'node:url'; import { resolve, dirname } from 'node:path'; console.log(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'concept-notes'))"` from `apps/qw-oracle/scripts/load-concepts/`.
- **Loader reports `loaded 9` but `concept_chunks` count is 0.** Chunker returned an empty array per body. Spot-check one file: `bun -e "import { readFileSync } from 'node:fs'; import { chunkMarkdown } from './shared/chunking.ts'; const t = readFileSync('concept-notes/weapon-scripts.md', 'utf8').replace(/^---[\\s\\S]*?---/, ''); console.log(chunkMarkdown(t).length)"`. Expected: > 1.
- **`upsert.test.ts` errors with `Refusing to run ... against a non-test database`.** `npm run test` script wasn't used; invoke `npm run test -- scripts/load-concepts/upsert.test.ts` instead of plain `bun test`.
- **`leaked_external` > 0 in verification step 8.** `partitionRefs` regression: a `commit` / `pr` / `extension` ref reached `concept_entities`. Re-run `parse.test.ts`; if green there, inspect the failing slug's frontmatter for an unrecognised middle-segment that should be added to `EXTERNAL_REF_PREFIXES` in `parse.ts`. (Conceivable additions: `wiki`, `doc`, `gh-discussion`. None present today.)
- **Test DB lacks migration 005 (verification step 12).** Re-run `./scripts/db-up.sh` from `apps/qw-oracle/`; the Phase 1 helper migrates both `qw_oracle` and `qw_oracle_test`.

## Sub-agent findings: applied or rejected with rationale

Sub-agent run: 2026-05-02. Findings (under 400 words) reported the following.

**CRITICAL:** none.

**SUBSTANTIVE 1 - File-count miscount (3 vs 4 skipped).** APPLIED. The phase MD claimed "the 3 skipped are README / OPERATIONS / _gap-report"; correct count is 4 because `concept-notes/CLAUDE.md` also exists and lacks a `slug:`. Verified by listing the directory at draft time (13 .md files, 9 with slug, 4 without). Three occurrences of the wrong number were corrected: the runnable-state line in Goal, the Task 5 verification PASS line, and the phase-boundary verification step 5 PASS line.

**SUBSTANTIVE 2 - `concepts.updated_at` not in architecture spec.** APPLIED via documentation. Column is preserved with rationale captured under Open questions. Matches Phase 1's pattern (`oracle_meta.updated_at`) that the operator already approved; the deviation is additive and benign. Operator decides at phase review whether to drop or to amend the spec.

**SUBSTANTIVE 3 - `concepts.summary DEFAULT ''` not in architecture spec.** APPLIED via documentation. Column default is preserved with rationale captured under Open questions. Same shape as #2: forward-looking ergonomics; no current note exercises the default; benign for downstream contract.

**ADVISORY items:** all confirmatory ("partition rule covers commit/pr/extension - all three present in live frontmatter"; "chunker tests cover both sentence-break and char-window paths"; "FK comments match SQL"; "no F-finding misclaim"; "`import.meta.main` D2-compliant"; "verification SQL parses on PG 16 including `jsonb_path_exists` with `like_regex`"). No changes.

No sub-agent finding contradicts `decisions.md`. Nothing was rejected on D-doc grounds.

**Orchestrator post-approval audit (2026-05-02, before execution):** caught two issues the drafter's sub-agent missed.

- **CRITICAL: JSONB pre-stringify regression in `upsert.ts`.** Original code block had `${JSON.stringify(c.frontmatter)}::jsonb` -- the exact pattern Phase 2's loader fix replaced with `tx.json(... as never)`. The qw-oracle CLAUDE.md always-on rule names this explicitly: "JSONB columns receive JS values, not pre-stringified JSON ... pre-stringifying stores a JSONB string scalar (the legacy SQLite-era TEXT bug)." Phase 2/3 codebases (`load-knowledge`, `load-chat`) all use `tx.json`. Fix applied in upsert.ts code block + a comment naming the rule. Verification block gained a step 9b: `jsonb_typeof(frontmatter) = 'string'` regression gate, mirroring Phase 2's F1 probe.

- **YELLOW: Verification step 10 EXPLAIN flake on tiny tables.** Original PASS condition demanded `Index Scan` and rejected `Seq Scan`. At Phase 4 row counts (~9 concepts, ~30-50 entity edges) the Postgres planner will rationally pick Seq Scan because heap I/O is cheaper than index lookup on a single-page table. Amended step 10 to force `SET LOCAL enable_seqscan = OFF` so the test verifies the index is wired correctly under planner pressure rather than betting on row-count thresholds. Step 4 still verifies the index physically exists.

---

## Findings resolved by this phase (per `review-findings.md`)

The "Phase ownership of findings" table in `review-findings.md` lists no F-numbered findings for Phase 4: "(none - legacy plan got Layer 3 mostly right)." Phase 4 inherits a clean slate; the legacy plan's Layer 3 sketch was correct on schema shape, chunker strategy, and idempotent-rebuild approach. The corrections Phase 4 makes vs the legacy plan are not from review-findings.md but from in-draft verification:

- Legacy plan's chunker test fixture used `'word '.repeat(800)` (no sentence boundaries) yet asserted `>= 3` chunks; the splitBySentence as written would produce exactly 1 sub-chunk for that input and the test would fail. Phase 4 ships a chunker with a char-window fallback for sentences that themselves exceed the cap, plus tests that exercise both the sentence-break path and the char-window path.
- Legacy plan's `upsertConcept` did not partition `related_entities:` - it would write commit / PR / extension refs into `concept_entities`. Phase 4 partitions per the same logic the existing `serve/mcp/src/concept-loader.ts` uses, and surfaces it as a tested named export.
- Legacy plan's `concept_chunks.embedding_stale` defaulted FALSE in the migration and the implementation never flipped it; that is correct and Phase 4 keeps it. Phase 5 sets it TRUE only on API failures.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

Brief shape (paste into `Agent` tool, `subagent_type=Explore`):

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-4-layer3-graph.md
Read decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md
Read review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-02-qw-oracle-arc1/review-findings.md

Then verify, file-by-file:

1. Every CREATE TABLE column list - the Phase 4 tables (concepts, concept_chunks,
   concept_entities, concept_concepts, redirect_targets) are NEW tables not
   present in scripts/load-knowledge/schema.ts. Compare them against the
   schema sketch in docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md.
   Report any drift.
2. Every CHECK constraint - none expected on Phase 4 tables; flag if any was
   added without rationale.
3. Every FK reference - `concept_chunks.concept_slug -> concepts(slug)`,
   `concept_concepts.source_slug -> concepts(slug)` are real FKs;
   `concept_entities.entity_canonical_id` is intentionally NOT an FK to
   `entities(canonical_id)` per the rationale in the migration comment.
   Verify the comment matches the SQL.
4. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF is
     expected NOT to exist yet - this is a paper plan, not executed code.
     Do NOT flag a Created file's non-existence as CRITICAL or anything else.
     Skip it entirely.
5. Every `import.meta.main` usage - confirmed allowed (D2 says yes under Bun).
6. Every shell command - does it use `bun` for scripts (D2)?
7. Every reference to a finding (F1-F18 in review-findings.md) - does this
   phase actually resolve the findings it claims to? Phase 4 claims none
   per the ownership table; flag any drift.
8. Every SQL query in verification - does it parse against the schema this
   phase produces?
9. "Engineer ports X" / "fills in details" / TODO smell - list any.
10. Any tables, columns, or fields the phase introduces that aren't in
    decisions.md and aren't in the architecture spec - flag as potential drift.
11. The chunker logic in shared/chunking.ts - verify the test fixtures don't
    produce the off-by-one bug the legacy plan had (where 'word '.repeat(800)
    failed `>= 3` chunks because no sentence boundary existed).
12. The partitionRefs logic in scripts/load-concepts/parse.ts - verify the
    EXTERNAL_REF_PREFIXES set covers the artifact prefixes used in the live
    concept-notes/*.md frontmatter (commit / pr / extension at minimum).

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```
