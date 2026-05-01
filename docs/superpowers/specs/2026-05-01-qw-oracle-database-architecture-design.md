# QW Oracle — Database & Distribution Architecture (Public-MCP v1)

**Status:** Design, awaiting operator review.
**Author:** Claude (Opus 4.7) + ParadokS, brainstorm session 2026-05-01.
**Supersedes:** the implicit "SQLite over Postgres" rule in `apps/qw-oracle/CLAUDE.md`.
**Companion plan:** to be written under `docs/superpowers/plans/` once this spec is approved.

---

## Summary

Move the QW Oracle authoritative store from SQLite + FTS5 to **Postgres 16 + pgvector + tsvector**, and add **hybrid retrieval** (lexical + semantic) on Layer 1 entity descriptions and Layer 3 concept notes. Keep the snapshot-distribution pattern but make it **manifest-driven with content-hashed delta fetch** so consumers (slipgate-app first) update independently of app releases. Embedding model is **Voyage `voyage-4-large`** via hosted API. Deploy as Docker containers — locally on WSL during dev, on Unraid behind Cloudflare Tunnel for the public demo, graduating into the future Hetzner-based quake.world platform without schema or consumer-protocol changes.

The arc that triggered this design was a real retrieval miss: a query that should have hit the `weapon-scripts` concept note returned nothing because Layer 3 has no search tool today, only direct ID lookup. Fixing that gap is the smallest piece of this design and also the most user-visible.

---

## Why now

Three failure modes in the current architecture:

1. **Layer 3 has no search.** `get_concept_note(id)` requires the caller to already know the slug. Notes are reachable only if `search_entities` happens to return a Layer 1 row whose `related_entities` mentions a note's slug — and even that reverse lookup isn't exposed as a tool.
2. **Layer 2 is FTS5-only.** Lexical search on a 2.66M-row chat corpus misses any question that doesn't share literal tokens with the answer. "Screen wobble" never finds messages about `cl_bob`.
3. **Layer 1 entity discovery is keyword-bound.** `search_entities` matches on name and description substrings. Vague natural-language queries that don't include the cvar name die in round 1.

The retrieval failure on round 1 is the load-bearing problem. Modern consumers (Claude Desktop, Cursor, future quad chatbot) iterate — search, read, search again with new context. They iterate fine *once they have a foothold*. They cannot iterate from zero hits, so they fall back on training-data confabulation. The fix is to make round 1 reliable for vague queries; the rest of the iteration loop already works.

Separately, the operator wants to demonstrate the public-MCP shape on Unraid as a stepping-stone to a future quake.world platform graduation (Hetzner Postgres + Cloudflare Workers + R2). The architecture must align with that endgame so graduation is `pg_dump | pg_restore` plus a redeployment, not a rewrite.

---

## Non-goals

- **Public chatbot frontend.** Cost model not yet validated; out of scope.
- **Layer 2 v2 pipeline (segment / classify / summarise / embed).** Its own arc, its own design pass. v1 leaves Layer 2 on the existing FTS5-only `search_solved_issues` tool.
- **Authentication for the MCP endpoint.** v1 is anonymous + per-IP rate limiting at Cloudflare. Auth (Auth0/Clerk per the platform diagram) joins in the endgame, not the demo.
- **HTTP API surface in addition to MCP.** Documented as a future extension; not built in v1.
- **Local-on-4090 embedding model.** Documented as a fallback; v1 uses the hosted Voyage API.
- **Slipgate consuming vectors locally.** Slipgate keeps receiving vector-free JSON snapshots; vectors live only in the MCP server's authoritative DB.

---

## Architecture decisions

### Storage: Postgres 16 + pgvector + tsvector

- **Authoritative store** for Layer 1 (engine + game-content facts), Layer 3 (concept notes + bidirectional graph), and the embedding metadata table.
- **Layer 2 stays in `qw.db` SQLite for v1.** Migrating Layer 2 to Postgres is part of the Layer 2 v2 arc, not this one.
- **pgvector** for embeddings. HNSW indexes for kNN search.
- **tsvector + GIN** for lexical search on Layer 1 entity descriptions and Layer 3 chunks. Note: Layer 1 today has only substring-match (no FTS); Layer 3 today has no search at all (only direct ID lookup). The Postgres lexical layer is a strict addition, not a replacement. Layer 2's existing SQLite FTS5 is untouched in v1.

The CLAUDE.md "SQLite over Postgres" rule is retired for the authoritative store. SQLite remains acceptable for derived artefacts (e.g. if a future consumer ships a small embeddable cache file) and remains in place for `qw.db` until the Layer 2 v2 arc.

### Embedding model: Voyage 4 series (shared embedding space)

- **Build time (corpus embedding): `voyage-4-large`** — 1024 dimensions, top retrieval quality.
- **Query time (per-query embedding): `voyage-4-lite`** — same shared embedding space, lower latency, lower cost. Geometric compatibility is guaranteed by Voyage; build-time vectors and query-time vectors land in the same space.
- 200M free tokens per account at signup; per-million pricing $0.12 (`voyage-4-large`) and $0.02 (`voyage-4-lite`) above the free tier.
- Model names + dimension stored in Postgres `embedding_metadata`; mismatched model strings at MCP startup throw loudly.
- Swapping the build-time model is a re-embed; swapping the query-time model within the v4 family is a one-line config change with no re-embed.

The Voyage 4 series shared embedding space is the load-bearing feature here: it lets us pay for quality where it matters (build time, embed-the-corpus-once) and pay for speed/cost where that matters (query time, embed-once-per-question). v3-series and earlier did not share spaces across model sizes, so this is a v4-specific design choice.

Local fallback path: **`voyage-4-nano` (open weights, available on HuggingFace)** sits in the same shared space. If the operator ever wants zero-API operation, `voyage-4-nano` runs on the 4090 (or even on Unraid CPU at lower throughput) and the corpus does not need re-embedding. This is a strictly cleaner fallback story than the v3-era "switch to BGE-M3 and re-embed everything" plan. Not built in v1; documented as a real option.

### Retrieval shape: hybrid (lexical + semantic), Reciprocal Rank Fusion

- Every search tool runs **two queries in parallel**: a tsvector lexical query and a pgvector kNN query, both against the same row population.
- Results are merged using **Reciprocal Rank Fusion (RRF)** — a stateless, parameter-free fusion algorithm that does not require score normalisation between the two retrievers.
- The fused top-N rows are returned with a `match_quality` flag (`strong` / `weak` / `none`) computed from a configurable score threshold. Threshold value is calibrated post-deploy against the eval set (see "Evaluation" below).
- Exact-name lookups (`lookup_entity(id=...)`, `get_concept_note(slug=...)`) bypass retrieval entirely and remain pure structured fetches. Vectors are a round-1 rescue for vague queries, not a replacement for direct lookup.

### New tool: `search_concepts`

The single most important consumer-visible change. Today's MCP has no way to find a Layer 3 note from a free-text query. The new tool:

```ts
search_concepts(query: string, limit?: number)
  -> {
       results: Array<{
         slug: string,
         title: string,
         summary: string,                      // YAML frontmatter `summary:` field
         match_score: number,                  // fused RRF score
         match_quality: 'strong' | 'weak' | 'none',
         snippet: string,                      // the chunk that matched
         related_entities: string[],           // canonical Layer 1 IDs
         related_concepts: string[],           // sibling concept slugs
       }>,
       match_quality: 'strong' | 'weak' | 'none',  // overall, not per-row
       suggested_fallback: string | null,
       meta: { tool, server_version, queried_at }
     }
```

- Returns the **chunk that matched**, not the whole note body. The LLM gets a focused signal first; if it wants the full body it calls `get_concept_note(slug)` as a follow-up.
- `related_entities` and `related_concepts` ship inline so the LLM immediately knows where to iterate next.
- `match_quality` lets the consumer LLM honour orientation instructions about when to redirect rather than synthesise.

### Bidirectional graph

Today: concept-note frontmatter `related_entities:` is parsed into an in-memory `Map` at MCP startup, queryable concept→entity but not the reverse.

New: derived tables in Postgres, rebuilt on every loader run:

```sql
CREATE TABLE concept_entities (
  concept_slug         TEXT NOT NULL,
  entity_canonical_id  TEXT NOT NULL,
  weight               INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (concept_slug, entity_canonical_id)
);
CREATE INDEX idx_concept_entities_entity ON concept_entities(entity_canonical_id);

CREATE TABLE concept_concepts (
  source_slug TEXT NOT NULL,
  target_slug TEXT NOT NULL,
  PRIMARY KEY (source_slug, target_slug)
);
```

- **Source of truth stays the YAML frontmatter** in `concept-notes/*.md`. Tables are derived; rebuilding them is part of the loader.
- The reverse direction means `lookup_entity(id)` now returns `related_concepts: [...]` inline — every entity hit immediately tells the consumer LLM where curated notes about it live.

### Honest-failure machinery

Three additions, all small, all necessary if the public MCP is to behave well:

1. **`match_quality` on every search response.** Already in the codebase pattern (`search_solved_issues` exposes it for FTS5). Extend to fused RRF scores.
2. **Server-level orientation instructions** at MCP `initialize`. The MCP protocol supports a server `instructions` field returned at handshake. We ship a short orientation block telling the consumer LLM:
   - The three layers and what each is authoritative for.
   - When `match_quality` is `weak` or `none`, do not synthesise from training data — either redirect or state that the corpus does not cover this.
   - The recommended iteration order: `search_concepts` for how-to questions, `search_entities` / `lookup_entity` for engine facts, `search_solved_issues` for historical debugging context.
3. **`redirect_to_human` tool.** When the corpus genuinely lacks coverage, give the LLM a structured non-confabulating action it can take — return a curated pointer to the right Discord channel, expert, or wiki page. Static seed list of redirect targets in the loader; tool reads them. Cheaper than asking the LLM to be honest in prose.

These three together convert the typical "I don't know" failure mode from confabulation to honest redirect. The architecture cannot make an LLM honest, but it can make the corpus useful often enough that the LLM has no reason to bypass it, and route the remaining failures through a structured exit.

### Snapshot distribution: manifest + content-hashed delta fetch

Slipgate-app's existing pattern is good but couples corpus updates to app releases. Replace with:

```
oracle.slipgate.me/snapshots/manifest.json     <-- versioned index, ~5 KB
oracle.slipgate.me/snapshots/ezquake-cvars.v18.124.json
oracle.slipgate.me/snapshots/fte-cvars.v18.123.json
oracle.slipgate.me/snapshots/qw-maps.v18.123.json
...
```

Manifest shape:

```json
{
  "schema_version": 18,
  "generated_at": "2026-05-01T14:00:00Z",
  "files": {
    "ezquake-cvars": {
      "version": 124,
      "url": "https://oracle.slipgate.me/snapshots/ezquake-cvars.v18.124.json",
      "sha256": "abc123...",
      "size_bytes": 2481232
    }
  }
}
```

Client (slipgate-app) update loop:

1. Fetch `manifest.json` (~5 KB).
2. Diff against local manifest. For each entry, is `version` newer?
3. Download only changed files. Verify SHA256.
4. Atomic swap: write to `<file>.tmp`, fsync, rename. Update local manifest last.

Failure modes:
- Network down → fall back to local cache, surface non-blocking notice.
- SHA256 mismatch → reject and retry once; on second failure, keep current cache and surface error.
- Manifest schema version mismatch → consumer-side decision (slipgate aborts the update; app keeps using its bundled fallback).

The snapshot files are upstream-DB-agnostic. `build-snapshot` reads from Postgres in v1 (was reading from SQLite); consumers don't notice. Slipgate's bundled JSONs (current behaviour) become the seed cache for first-run before the manifest fetch.

The manifest schema is promoted to **`contracts/`** so future snapshot consumers (quad chatbot mode, slipgate web help surfaces) join the same pipeline without a per-consumer redesign.

---

## Schema additions (Postgres dialect)

The full migration ships in the implementation plan, not this spec. The new tables introduced by this design:

```sql
-- Concept notes
CREATE TABLE concepts (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  summary      TEXT NOT NULL,
  body         TEXT NOT NULL,
  shape        TEXT,
  frontmatter  JSONB NOT NULL,
  body_sha256  TEXT NOT NULL
);

-- Chunked-for-embedding pieces of each concept
CREATE TABLE concept_chunks (
  id              BIGSERIAL PRIMARY KEY,
  concept_slug    TEXT NOT NULL REFERENCES concepts(slug) ON DELETE CASCADE,
  chunk_index     INTEGER NOT NULL,
  text            TEXT NOT NULL,
  text_sha256     TEXT NOT NULL,
  embedding       vector(1024),               -- pgvector type
  tsv             tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);
CREATE INDEX concept_chunks_embedding_hnsw ON concept_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX concept_chunks_tsv_gin ON concept_chunks USING GIN (tsv);

-- Bidirectional graph (already shown above)
CREATE TABLE concept_entities ( ... );
CREATE TABLE concept_concepts ( ... );

-- Layer 1 entity description vectors + lexical index
ALTER TABLE entities ADD COLUMN description_embedding vector(1024);
ALTER TABLE entities ADD COLUMN description_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(description, ''))) STORED;
CREATE INDEX entities_desc_embedding_hnsw ON entities USING hnsw (description_embedding vector_cosine_ops);
CREATE INDEX entities_desc_tsv_gin ON entities USING GIN (description_tsv);

-- Embedding model metadata (one row, source of truth)
CREATE TABLE embedding_metadata (
  id                INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  model_name        TEXT NOT NULL,
  model_version     TEXT NOT NULL,
  dimension         INTEGER NOT NULL,
  embedded_at       TIMESTAMPTZ NOT NULL,
  rows_embedded     INTEGER NOT NULL
);

-- Redirect targets (for redirect_to_human tool)
CREATE TABLE redirect_targets (
  topic        TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  url          TEXT NOT NULL,
  description  TEXT
);
```

The existing Layer 1 schema (entities, *_versions, source_lines, etc.) is preserved structurally, ported to Postgres dialect. There is no SQLite-to-Postgres data migration: Layer 1 content is regenerable by re-running the loader against the committed extractor JSON outputs at `scripts/extractors/<project>/output/*-ast.json`, and Layer 3 content is regenerable by running the new concept-loader against `concept-notes/*.md`. The "migration" is therefore a schema port plus an idempotent rebuild from sources already in the repo.

---

## Deploy topology

### Dev (operator's WSL)

- Docker Desktop (already installed).
- `docker-compose.dev.yml` ships a single Postgres container using the `pgvector/pgvector:pg16` image.
- Loader and MCP server run as Node processes in WSL (not containerised in dev), connecting to Postgres on `localhost:5432`.
- Local `.env` holds `VOYAGE_API_KEY` and `DATABASE_URL`.

### Demo (Unraid)

- Docker container for Postgres (`pgvector/pgvector:pg16`) on Unraid's existing Docker network.
- Docker container for the qw-oracle MCP server (Node 20-alpine, multi-stage build).
- Existing nginx (or Unraid's reverse proxy) serves snapshot files from a volume-mounted directory and reverse-proxies the MCP HTTP/SSE endpoint.
- Cloudflare Tunnel (existing) routes:
  - `oracle.slipgate.me/mcp` → MCP container.
  - `oracle.slipgate.me/snapshots/` → static files, aggressively cached at the CF edge.
- Postgres data lives in `/mnt/user/appdata/qw-oracle/postgres-data/`. Snapshot files live in `/mnt/user/appdata/qw-oracle/snapshots/`.
- Backup posture: the existing weekly Unraid → Synology snapshot covers Postgres data, snapshot files, and configs. No additional backup tooling required for v1.
- Auth: anonymous, with per-IP rate limiting at Cloudflare. Read-only, public knowledge — no abuse vector worth protecting against beyond traffic shaping.

### Endgame (future quake.world platform)

Per the platform architecture diagram (operator-provided 2026-05-01):

- Postgres on Hetzner CAX21 (or managed equivalent).
- MCP server as a Cloudflare Worker (via Hyperdrive) or as a Backend Services container — both fit; deciding-time deferred.
- Snapshot files in Cloudflare R2, served via CF CDN.
- Auth0/Clerk integration for any logged-in surfaces.
- Cold backups to S3 Glacier.

The migration from demo to endgame is:
- `pg_dump` from Unraid Postgres → `pg_restore` to Hetzner Postgres.
- Update manifest URLs from `oracle.slipgate.me` to whatever the platform's snapshot domain becomes.
- Redeploy MCP container image to the new runtime.
- One env var change for `PUBLIC_BASE_URL`.

No schema change. No re-embedding. No consumer-protocol change. Slipgate-app sees only the URL change in the next manifest fetch.

### Configuration

All deployment-specific values are env vars on the MCP server:

```
DATABASE_URL=postgresql://...
VOYAGE_API_KEY=...
PUBLIC_BASE_URL=https://oracle.slipgate.me
SNAPSHOT_DIR=/var/oracle/snapshots
EMBEDDING_MODEL_BUILD=voyage-4-large
EMBEDDING_MODEL_QUERY=voyage-4-lite
EMBEDDING_DIMENSION=1024
MATCH_QUALITY_STRONG_THRESHOLD=<calibrated post-deploy>
MATCH_QUALITY_WEAK_THRESHOLD=<calibrated post-deploy>
RATE_LIMIT_PER_MINUTE=60
```

---

## Authoring loop

The mechanics of editing a concept note end-to-end:

1. Operator edits `concept-notes/<slug>.md` in their normal editor. Save.
2. Operator runs `npm run load-concepts` (or however the loader CLI is named).
3. The loader, in one transactional pass per slug:
   - Parses YAML frontmatter; extracts `slug + title + summary + related_entities + shape`.
   - Hashes the body. If hash unchanged → skip embedding entirely. **No API call.**
   - If hash changed: chunks the body (~300 token chunks at section boundaries), per-chunk hash, embed only changed chunks via Voyage API.
   - Rewrites `concepts`, `concept_chunks`, `concept_entities`, `concept_concepts` rows for this slug atomically. Other slugs untouched.
4. Done. Typical edit: ~2 seconds, ~$0.0001 in API cost (well inside free tier).

Failure modes:
- Voyage API down → loader updates structured rows + graph, marks chunks `embedding_stale = true`, MCP keeps serving stale vectors until the next successful re-run.
- Loader crashes mid-update → transaction rolls back, slug stays at previous version. No half-state visible to MCP.

---

## Evaluation

The single highest-ROI piece of infrastructure in this arc, and the part most projects skip.

**Eval set:** 15-20 questions hand-picked from the Quake.World Discord helpdesk channel by the operator. Mix of:
- Questions where the answer should hit a concept note (e.g. "screen wobble" → `weapon-scripts` / `cl_bob`).
- Questions where the answer should hit Layer 1 directly (e.g. "what does `cl_bob` do" → entity lookup).
- Questions genuinely out-of-corpus (the corpus should report `match_quality = none` and `redirect_to_human` should fire).

For each question, operator pre-records the expected top-1 to top-3 hits.

**Use 1 — Regression gate.** Any change to retrieval (new model, chunking strategy change, threshold tweak, RRF weight change) runs the eval set first. Must not regress.

**Use 2 — Concept-note gap finder.** Questions that *should* have a concept-note answer but don't are the prioritised list of new notes to author. The eval set becomes a living queue, not a static fixture. Existing operator workflow (browse helpdesk → spot recurring question → write a concept note) becomes structured.

The eval set lives at `apps/qw-oracle/eval/queries.json` with expected-hits annotations. A simple `npm run eval` script runs the queries against a loaded DB and reports recall@1, recall@3, and per-question pass/fail.

`helpdesk-coverage.mjs` (existing throwaway POC) is the spiritual ancestor; the new eval is its successor and replaces it.

---

## Arc sequencing

This design is too large for one implementation plan. Three arcs, each independently shippable:

### Arc 1 — Postgres migration + hybrid retrieval + graph + `search_concepts`

The work this spec primarily describes. Includes:
- Postgres migration of Layer 1 (extractor outputs → Postgres tables).
- Embedding pipeline for Layer 1 entities + Layer 3 chunks.
- New `search_concepts` tool, bidirectional graph tables, redirect_to_human tool.
- Server-level orientation instructions on MCP `initialize`.
- Eval set authored, regression gate wired up.
- MCP container deployed to Unraid behind CF Tunnel.

Layer 2 stays untouched (FTS5 SQLite, existing `search_solved_issues`).

### Arc 2 — Snapshot delta-fetch pipeline

After Arc 1 ships and the public MCP is live. Includes:
- Manifest schema spec promoted to `contracts/`.
- `build-snapshot` writes manifest + content-hashed JSONs to nginx-served directory.
- Slipgate-app gains an update-loop module (Rust + frontend wire-up) that fetches manifest, diffs, downloads changed files, atomic-swaps, falls back gracefully on errors.
- Slipgate's bundled JSONs become first-run seed cache.

### Arc 3 — Layer 2 v2

Separate design pass. Includes:
- Discord-only ingest (IRC parked).
- Segment / classify / summarise / embed pipeline.
- Layer 2 migrates from SQLite `qw.db` to the same Postgres instance as Layer 1+3.
- `search_solved_issues` upgrades from FTS5-only to hybrid.

Each arc closes with eval-set verification. Arc 2 cannot regress Arc 1's MCP behaviour; Arc 3 cannot regress Arc 1+2.

---

## Risks and mitigations

**Risk: Voyage deprecates the v4 series and we have to re-embed.**
Mitigation: model name + dimension stored as DB metadata; `re-embed.ts` script wipes vectors and rebuilds with whatever model is configured. Cost is dollars (or zero, inside free tier of the new model). Workflow event, not a schema event.

**Risk: Voyage API outage at query time.**
Mitigation, layered:
1. Short-term outage: query-side embedding fails → MCP returns `match_quality: 'none'` with `suggested_fallback` pointing at exact-name lookup tools (`lookup_entity` / `get_concept_note`). Public-MCP availability is degraded but not broken.
2. Long-term outage or principled cut-over: switch query-time embedding to `voyage-4-nano` running locally on the 4090 (open-weights, same shared embedding space as `voyage-4-large`). One env var change. Corpus is **not** re-embedded.

**Risk: Postgres-on-Workers performance unknowns at endgame.**
Mitigation: not v1's problem. Demo runs against a co-located Postgres on Unraid; endgame Workers + Hyperdrive performance gets validated when graduation happens. If it doesn't fit Workers, MCP server runs as a Backend Services container instead (also in the diagram). The MCP code stays the same.

**Risk: Score thresholds picked badly, `match_quality` is mis-labelled.**
Mitigation: thresholds in env config, calibrated post-deploy against the eval set. Initial thresholds are placeholders; the eval-set run is the calibration step.

**Risk: SQLite-in-Layer-2 / Postgres-in-Layer-1+3 split confuses the codebase.**
Mitigation: tolerable for the duration of v1 (Layer 2 is in maintenance; no active development against it). Arc 3 closes the split. Document the split prominently in `apps/qw-oracle/CLAUDE.md`.

**Risk: 200M-token Voyage free tier expires or changes terms.**
Mitigation: `voyage-4-large` at $0.12/M post-free-tier is still negligible at expected query volume (worst-case dollars per year). Fallback to local-on-4090 (BGE-M3 / GTE-large) is documented but not built; would slot in via the model-swap mechanism.

---

## Operator decisions documented in this spec

For traceability — these are the decisions the operator made during the brainstorm session, recorded so a future reader knows the spec is grounded:

| Decision | Choice | Reason captured |
|---|---|---|
| Primary serving surface | MCP-first, public | Clients pick their own LLM; we don't bear inference cost |
| HTTP API | Future, low-priority | "Freedom of choice" but not a design driver |
| Public chatbot | Deferred | Cost model not validated |
| Embedding model (build) | Voyage `voyage-4-large` | Quality + free tier + Anthropic ecosystem alignment |
| Embedding model (query) | Voyage `voyage-4-lite` | Same shared embedding space as build model; lower latency + cost |
| Embedding location | Hosted API at runtime | `voyage-4-nano` (open weights, same shared space) is a drop-in local fallback if API access ever needs to be cut; not built in v1 |
| Eval set size | 15-20 helpdesk-sourced questions | Operator domain expertise replaces large eval-team rigour |
| Layer 2 in v1 | Untouched | Bug that triggered this conversation was Layer 3, not Layer 2 |
| IRC corpus | Parked for Layer 2 v2 archive | Multilingual / archaic-format complexity, lower signal |
| Storage engine | Postgres 16 + pgvector from day 1 | Endgame requires Postgres; avoid double-migration |
| Local dev DB | Postgres in Docker Desktop | Dev = demo deployment shape |
| Public domain | `oracle.slipgate.me` | Operator-owned; quake.world delegation later if it lands |
| Auth in v1 | Anonymous + CF rate limiting | Read-only, public knowledge; no abuse vector |
| Backup posture in v1 | Weekly Unraid → Synology covers it | No additional tooling needed |

---

## Open questions for the implementation plan

These are decisions that don't need to be made now but need to be made in the implementation plan:

1. **Chunking strategy.** Section-based (split on markdown headings) vs token-window (split on size with overlap)? Which produces better matches against the eval set?
2. **RRF k parameter.** Standard RRF uses `k=60`. Possibly tune against the eval set.
3. **Match-quality thresholds.** Initial values; calibrated post-deploy against eval set.
4. **Migrator tool.** Hand-rolled `.sql` runner vs `node-pg-migrate` vs Drizzle migrations? Operator preference for transparency-vs-tooling.
5. **MCP transport.** stdio (existing) for local Claude Code consumers vs HTTP/SSE for public consumers. Likely both, with the same tool implementations behind two transports.
6. **Redirect targets seed list.** Initial set of `(topic, display_name, url, description)` rows. Discord channels, expert handles, ezquake.com docs, wiki.quakeworld.nu.

---

*End of spec.*
