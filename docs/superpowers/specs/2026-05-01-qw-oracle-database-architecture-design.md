# QW Oracle — Database & Distribution Architecture (Public-MCP v1)

**Status:** Design, awaiting operator review (revised 2026-05-02 after second-opinion review).
**Author:** Claude (Opus 4.7) + ParadokS, brainstorm session 2026-05-01; revisions 2026-05-02.
**Supersedes:** the implicit "SQLite over Postgres" rule in `apps/qw-oracle/CLAUDE.md`.
**Companion plan:** to be written under `docs/superpowers/plans/` once this spec is approved.

---

## Summary

Move the QW Oracle authoritative store from SQLite + FTS5 to **Postgres 16 + pgvector + tsvector**, in one engine for all three layers. Add **hybrid retrieval** (lexical + semantic) on Layer 1 entity descriptions and Layer 3 concept notes. Layer 2 (the chat corpus) is *ported* to Postgres in v1 with tsvector lexical search preserving today's `search_solved_issues` behaviour; the *enrichment* pipeline (segment / classify / summarise / embed) is deferred to its own arc. Keep the snapshot-distribution pattern but make it **manifest-driven with content-hashed delta fetch** so consumers (slipgate-app first) update independently of app releases. Embedding models are **Voyage v4 series** (`voyage-4-large` at build, `voyage-4-lite` at query, shared embedding space). Deploy as Docker containers — locally on WSL during dev, on Unraid behind Cloudflare Tunnel for the public demo, graduating into the future Hetzner-based quake.world platform without schema or consumer-protocol changes.

The arc that triggered this design was a real retrieval miss: a query that should have hit the `weapon-scripts` concept note returned nothing because Layer 3 has no search tool today, only direct ID lookup. Fixing that gap is the smallest piece of this design and also the most user-visible. The biggest piece is removing the dual-engine split — running Postgres alongside SQLite for an indeterminate "v1 duration" was a quiet maintenance tax we declined to pay.

---

## Why now

Three failure modes in the current architecture:

1. **Layer 3 has no search.** `get_concept_note(id)` requires the caller to already know the slug. Notes are reachable only if `search_entities` happens to return a Layer 1 row whose `related_entities` mentions a note's slug — and even that reverse lookup isn't exposed as a tool.
2. **Layer 2 is FTS5-only.** Lexical search on a 2.66M-row chat corpus misses any question that doesn't share literal tokens with the answer. "Screen wobble" never finds messages about `cl_bob`.
3. **Layer 1 entity discovery is keyword-bound.** `search_entities` matches on name and description substrings. Vague natural-language queries that don't include the cvar name die in round 1.

The retrieval failure on round 1 is the load-bearing problem. Modern consumers (Claude Desktop, Cursor, future quad chatbot) iterate — search, read, search again with new context. They iterate fine *once they have a foothold*. They cannot iterate from zero hits, so they fall back on training-data confabulation. The fix is to make round 1 reliable for vague queries; the rest of the iteration loop already works.

**Note on Layer 2's vague-query failure.** Arc 1 ports Layer 2 to Postgres tsvector but does not yet add semantic retrieval over chat — the lexical-mismatch problem on the chat corpus persists into Arc 1 by design. Arc 3 (Layer 2 enrichment) closes that gap with session-summary embeddings and hybrid retrieval on `search_solved_issues`. Arc 1 fixes round 1 for *Layer 1 + Layer 3* queries, which is where curated answers live; Arc 3 extends it to historical chat evidence.

Separately, the operator wants to demonstrate the public-MCP shape on Unraid as a stepping-stone to a future quake.world platform graduation (Hetzner Postgres + Cloudflare Workers + R2). The architecture must align with that endgame so graduation is `pg_dump | pg_restore` plus a redeployment, not a rewrite.

---

## Non-goals

- **Public chatbot frontend.** Cost model not yet validated; out of scope.
- **Layer 2 enrichment pipeline (segment / classify / summarise / embed).** Its own arc (Arc 3), its own design pass. v1 *ports* Layer 2 to Postgres + tsvector but does not yet add summarisation or vector search on the chat corpus. The `search_solved_issues` tool keeps its current lexical-only behaviour.
- **Authentication for the MCP endpoint.** v1 is anonymous + per-IP rate limiting at Cloudflare. Auth (Auth0/Clerk per the platform diagram) joins in the endgame, not the demo.
- **HTTP API surface in addition to MCP.** Documented as a future extension; not built in v1.
- **Local-on-4090 embedding model at runtime.** `voyage-4-nano` (open weights, same shared space) is documented as a drop-in fallback; not built in v1.
- **Slipgate consuming vectors locally.** Slipgate keeps receiving vector-free JSON snapshots; vectors live only in the MCP server's authoritative DB. Slipgate's eventual chatbot-plugin vision will require it to call the MCP server directly for hybrid retrieval — a future-arc dependency, not this design's concern.
- **Shipping the authoritative DB to consumers.** Snapshot JSONs are the contract. We declined to keep the "embeddable-DB" property the SQLite era theoretically afforded — see "Considered alternative" below for the explicit tradeoff.

---

## Architecture decisions

### Storage: Postgres 16 + pgvector + tsvector — single engine, all three layers

- **Authoritative store** for Layer 1 (engine + game-content facts), Layer 2 (chat corpus, ported in v1), Layer 3 (concept notes + bidirectional graph), plus shared metadata.
- **One database engine across the project.** No `better-sqlite3` alongside `postgres-js`, no two backup paths, no two query-shape conventions. The qw.db SQLite store is retired in v1.
- **pgvector** for embeddings. HNSW indexes for kNN search.
- **tsvector + GIN** for lexical search on Layer 1 entity descriptions, Layer 3 chunks, and Layer 2 messages. Layer 1 today has only substring-match; Layer 3 today has no search at all; Layer 2 today has SQLite FTS5. After v1 all three layers expose lexical search via the same Postgres mechanism.
- **Layer 2 in v1: port-only.** Messages, sessions, message_labels port to Postgres tables; tsvector indexes on `messages.content` and the existing session-search aggregation reproduce FTS5's behaviour at the consumer interface. `search_solved_issues` returns the same shape it returns today. No segmentation rework, no summarisation, no chat embeddings — that's Arc 3.

The CLAUDE.md "SQLite over Postgres" rule is retired in this arc. SQLite remains acceptable for genuinely-derived artefacts (e.g. test fixtures), but the authoritative store is Postgres for all three layers.

### Considered alternative: SQLite + sqlite-vec + FTS5

A real alternative the spec considered and rejected: stay on SQLite, add `sqlite-vec` (or `sqlite-vss`) for embeddings, keep FTS5 for lexical, RRF over the two retrievers. Same hybrid-retrieval shape, no migration, lower operational floor.

Why we're not doing this:

1. **Vector index maturity.** `pgvector` ships HNSW (graph-based, high-recall, well-tuned at scale) and IVFFlat, with multiple distance metrics, in production at thousands of organisations as of mid-2026. `sqlite-vec` is the actively-developed successor to the deprecated `sqlite-vss`; it works but its production deployment volume and index sophistication are meaningfully behind. For a system the operator wants to *trust*, the maturity gap matters more than the operational savings.
2. **Concurrency model.** SQLite serialises writes through a single writer lock; Postgres handles concurrent loaders, concurrent MCP processes, and future eval-set / observability writers natively. The demo doesn't need concurrent writes today, but Arc 2 (snapshot rebuilds while MCP serves traffic) and Arc 3 (Layer 2 enrichment jobs running in parallel with the live MCP) start needing it.
3. **Ops familiarity in the broader Quake.World ecosystem.** `qw-stats` already runs Postgres 16. The platform diagram has Postgres at its core. A future contributor — or operator-future-self — has one engine to learn, not two with extension subtleties.
4. **No live consumer was using SQLite-as-distribution.** The spec is honest that going Postgres forecloses one theoretical capability: shipping the authoritative DB file itself to a consumer for offline use. But no consumer today does this — slipgate consumes JSON snapshots, not `knowledge.db`. We're declining a path we weren't on, not retreating from one we were.

The endgame-graduation argument (Hetzner Postgres + Workers + Hyperdrive) is *aligned* with this choice, but not the primary justification. Even if the demo runs forever on Unraid, the maturity / concurrency / ops-familiarity case stands on its own.

Capability cost we're explicitly accepting: the authoritative DB is no longer a single file you can `cp` around. Backup is `pg_dump`, not file copy. Sharing dev state with a future collaborator is `pg_dump | gzip` → restore, not git-clone. Cheap operational adjustment; named here so it's not a surprise.

### Embedding model: Voyage 4 series (shared embedding space)

- **Build time (corpus embedding): `voyage-4-large`** — 1024 dimensions, top retrieval quality.
- **Query time (per-query embedding): `voyage-4-lite`** — same shared embedding space, lower latency, lower cost. Geometric compatibility is guaranteed by Voyage; build-time vectors and query-time vectors land in the same space.
- 200M free tokens per account at signup; per-million pricing $0.12 (`voyage-4-large`) and $0.02 (`voyage-4-lite`) above the free tier.
- Model names + dimension stored in Postgres `embedding_metadata`; mismatched model strings at MCP startup throw loudly.
- Swapping the build-time model is a re-embed; swapping the query-time model within the v4 family is a one-line config change with no re-embed.

The Voyage 4 series shared embedding space is the load-bearing feature here: it lets us pay for quality where it matters (build time, embed-the-corpus-once) and pay for speed/cost where that matters (query time, embed-once-per-question). v3-series and earlier did not share spaces across model sizes, so this is a v4-specific design choice.

#### Token-budget walkthrough

Showing the work, since "200M free tokens" is meaningless without the corpus numbers next to it.

| Workload | Token estimate | Notes |
|---|---|---|
| Layer 1 entity descriptions, full embed | ~0.5M | ~9000 entities × ~50 tokens of description text per entity |
| Layer 3 concept notes, full embed at today's 9 notes | ~0.07M | 9 notes × ~1500 body tokens × ~5 chunks |
| Layer 3 concept notes, projected at 200 notes | ~1.5M | Same per-note shape, scaled to operator's 100-200 future-notes target |
| Full L1+L3 re-embed (e.g. model swap) | ~2.0M | Sum of above, worst case |
| Query traffic, 1M queries | ~20M | 20 tokens/query average, `voyage-4-lite` |
| Layer 2 enrichment (Arc 3), session summaries | ~10-30M | Estimated 50-200K sessions × ~100 tokens of summary; embedding only |
| Layer 2 enrichment (Arc 3), full chat embed if we ever did it | ~130M+ | 2.66M raw messages × ~50 tokens; **deliberately not the v3 plan** — embedding summaries is cheaper and more useful |

**v1 sits comfortably inside the 200M-token free tier.** The full Arc 1 corpus, plus a year of realistic query traffic, plus a model-swap re-embed, fits in the free grant several times over. Arc 3 (Layer 2 enrichment) is where token cost starts to matter and is a planning input for that arc's design — not v1's problem. Even Arc 3's projected ceiling sits at ~30M tokens for *embedding* (the expensive step is *generating* the summaries via a chat model, which is separate billing).

#### Local fallback path

**`voyage-4-nano` (open weights, available on HuggingFace)** sits in the same shared space. If the operator ever wants zero-API operation, `voyage-4-nano` runs on the 4090 (or even on Unraid CPU at lower throughput) and the corpus does not need re-embedding. This is a strictly cleaner fallback story than the v3-era "switch to BGE-M3 and re-embed everything" plan. Not built in v1; documented as a real option.

Vendor-lock-in note: the shared-embedding-space property is a Voyage contractual claim. If Voyage pivots, deprecates the shared-space guarantee, or changes its open-weights stance, the fallback is "freeze on the last `voyage-4-nano` weights you have a copy of, run it locally indefinitely." Model rot (drift in retrieval quality versus newer techniques) is real over multi-year horizons — but the corpus stays usable. Worst-case fallback timeline is "many years."

### Retrieval shape: hybrid (lexical + semantic), Reciprocal Rank Fusion

- Every search tool runs **two queries in parallel**: a tsvector lexical query and a pgvector kNN query, both against the same row population.
- Results are merged using **Reciprocal Rank Fusion (RRF)** — a stateless, parameter-free fusion algorithm that does not require score normalisation between the two retrievers.
- The fused top-N rows are returned with a `match_quality` flag (`strong` / `weak` / `none`) computed from a configurable score threshold. **Thresholds are calibrated as a deploy-gate step** — committed to config before public DNS opens — so initial public users see calibrated `match_quality`, not placeholder values. See "Evaluation" below.
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
- **Snippet length is bounded** — chunks are stored at ~300 tokens but the snippet returned in `search_concepts` results is post-processed to ~120-150 tokens centred on the matched span (with `...` ellipsis padding). The full chunk would eat consumer context fast at limit=10; the bounded snippet is enough to triage, the `get_concept_note` follow-up is for the rest.
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
- **`concept_entities` is sourced from the existing `related_entities:` frontmatter list** — already present in every shipped note today.
- **`concept_concepts` is sourced from a new `related_concepts:` frontmatter list** — operator-authored, same shape as `related_entities`. Body-link parsing (extracting `[ref](concept-notes/other-slug.md)` style links from prose) is *not* the source of truth. We considered it; it would couple link semantics to markdown rendering choices and create surprise edges. Frontmatter is explicit, reviewable, and round-trips through the YAML editor cleanly. A loader pre-flight check warns if a body link points at a slug that isn't in `related_concepts:`, so authoring drift gets caught.
- The reverse direction means `lookup_entity(id)` now returns `related_concepts: [...]` inline — every entity hit immediately tells the consumer LLM where curated notes about it live.

### Honest-failure machinery

Three additions, layered from softest to hardest. The architecture cannot make an LLM honest; it can route confabulation pressure into a structured exit.

1. **Server-level orientation instructions** at MCP `initialize` — *advisory*, not enforced. The MCP protocol supports a server `instructions` field returned at handshake. We ship a short orientation block telling the consumer LLM:
   - The three layers and what each is authoritative for.
   - When `match_quality` is `weak` or `none`, do not synthesise from training data — either redirect or state that the corpus does not cover this.
   - The recommended iteration order: `search_concepts` for how-to questions, `search_entities` / `lookup_entity` for engine facts, `search_solved_issues` for historical debugging context.

   **Compliance is best-effort.** Claude Desktop and Claude Code respect `instructions` reliably; behaviour in Cursor, Zed, Continue, and custom clients is mixed and changes between releases. We rely on the harder backstops below for everything that matters.
2. **`match_quality` on every search response** — *structured*, not advisory. Computed deterministically from the fused RRF score against config thresholds. Doesn't require LLM cooperation to be useful — a downstream wrapper, an analytics dashboard, or a future enforcement layer can act on it without trusting the consumer.
3. **`redirect_to_human` tool** — *gives the LLM a non-confabulating action it can take instead of guessing*. When the corpus genuinely lacks coverage, the LLM can call this tool and return a curated pointer to the right Discord channel, expert, or wiki page. Static seed list of redirect targets in Postgres `redirect_targets`; tool reads them. Effective because it offers a better default action than confabulation, not because it asks for honesty.

The combination converts the typical "I don't know" failure mode from confabulation to honest redirect *for the consumers that respect the orientation*, and exposes the failure structurally (`match_quality`) for everyone else. Future arcs can layer enforcement (e.g. an HTTP API wrapper that hides results below a threshold) on top of the structured signals; the orientation layer itself is just the polite-protocol path.

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
- Manifest `schema_version` mismatch → see versioning policy below.

#### Versioning policy

The manifest is the contract. To preserve "consumers update independently of app releases" at major-version boundaries, evolution rules are explicit:

- **Additive changes are always compatible.** New file types (e.g. `qw-mechanics.v18.X.json`) added to `files`, new top-level fields on the manifest, new optional fields on per-file entries. Consumers must ignore unknown keys. Operator can ship these without coordinating with consumer releases.
- **Schema-version-bumping changes are breaking.** Reshaping the manifest itself (rename `files`, change the per-file entry shape), or breaking a file-internal schema in a way the consumer's parser can't tolerate. These require a coordinated app release.
- **`schema_version` lockstep.** When a breaking change is necessary, the operator publishes manifest at the new version under a path-versioned URL (`oracle.slipgate.me/snapshots/v19/manifest.json`) for a transition window. Old consumers continue reading the v18 manifest from the old path; new consumers read v19. The transition window ends when the operator retires the old path — coordinated with the app-release that switches consumers over.
- **Slipgate aborting the update on `schema_version` mismatch is the *worst-case* fallback**, not the default. The default is path-versioned coexistence so consumers can update on their own cadence within a major version, and only need an app release to cross a major boundary.

The snapshot files are upstream-DB-agnostic. `build-snapshot` reads from Postgres in v1 (was reading from SQLite); consumers don't notice. Slipgate's bundled JSONs (current behaviour) become the seed cache for first-run before the manifest fetch.

The manifest schema is promoted to **`contracts/`** so future snapshot consumers (quad chatbot mode, slipgate web help surfaces) join the same pipeline without a per-consumer redesign.

### Observability (named, not yet built)

For a public MCP, observability is a v1 commitment but the implementation can land toward the end of Arc 1. The categories that matter:

- **Query log.** Every MCP tool call captured (tool, query string, result count, top-1 score, match_quality, latency, error). This feeds back into eval-set growth — vague queries that returned `match_quality: 'none'` are concept-note authoring leads. Stored in a Postgres `query_log` table with a retention policy (e.g. 90 days, since the volume is small and historical patterns are useful).
- **Latency p95 per tool.** A simple Postgres-side rollup over `query_log`, exposed via a `/metrics` endpoint or a query the operator runs ad-hoc.
- **Embedding-API spend tracking.** Loader and MCP server log token counts on every Voyage call into a dedicated table; a daily roll-up reports spend trajectory against the free-tier ceiling.
- **Error rate.** Exceptions on tool calls land in the `query_log` with error context; alerting (even just an operator dashboard view) flags spikes.
- **Cloudflare cache-hit rate for snapshots.** Read from CF analytics; surfaces whether snapshot fetches are hitting edge or origin. Operational signal for whether the CF caching policy is working.

No external monitoring stack is required for v1 (Grafana/OTel arrives in the endgame per the platform diagram). v1's observability lives in Postgres tables the operator can SQL against, with optional log shipping to a future stack as the project graduates.

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
  id                BIGSERIAL PRIMARY KEY,
  concept_slug      TEXT NOT NULL REFERENCES concepts(slug) ON DELETE CASCADE,
  chunk_index       INTEGER NOT NULL,
  text              TEXT NOT NULL,
  text_sha256       TEXT NOT NULL,
  embedding         vector(1024),               -- pgvector type
  embedding_stale   BOOLEAN NOT NULL DEFAULT FALSE,  -- set when API failed at last load
  tsv               tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);
CREATE INDEX concept_chunks_embedding_hnsw ON concept_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX concept_chunks_tsv_gin ON concept_chunks USING GIN (tsv);

-- Bidirectional graph (already shown above)
CREATE TABLE concept_entities ( ... );
CREATE TABLE concept_concepts ( ... );

-- Layer 1 entity description vectors + lexical index (added to ported entities table)
ALTER TABLE entities ADD COLUMN description_embedding vector(1024);
ALTER TABLE entities ADD COLUMN description_embedding_sha256 TEXT;  -- track which text the vector was computed from
ALTER TABLE entities ADD COLUMN description_embedding_stale BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE entities ADD COLUMN description_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(description, ''))) STORED;
CREATE INDEX entities_desc_embedding_hnsw ON entities USING hnsw (description_embedding vector_cosine_ops);
CREATE INDEX entities_desc_tsv_gin ON entities USING GIN (description_tsv);

-- Layer 2 ported tables (existing SQLite shape, Postgres dialect).
-- Full schema port lives in the implementation plan; the retrieval-relevant addition is:
ALTER TABLE messages ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;
CREATE INDEX messages_content_tsv_gin ON messages USING GIN (content_tsv);
-- The session_search aggregation that backed FTS5 in SQLite becomes a materialised view
-- over messages + sessions + message_labels with its own GIN index. Implementation plan
-- decides materialised-view vs on-the-fly aggregation based on query latency.

-- Query log (observability, written by every MCP tool call)
CREATE TABLE query_log (
  id              BIGSERIAL PRIMARY KEY,
  queried_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  tool            TEXT NOT NULL,
  query_text      TEXT,
  result_count    INTEGER,
  top_score       REAL,
  match_quality   TEXT,
  latency_ms      INTEGER,
  error           TEXT,
  consumer_hint   TEXT  -- best-effort client identifier from MCP handshake
);
CREATE INDEX query_log_queried_at ON query_log(queried_at);
CREATE INDEX query_log_match_quality ON query_log(match_quality)
  WHERE match_quality IN ('weak', 'none');  -- partial index for "what failed?" queries

-- Embedding-API spend (loader + MCP server log every Voyage call)
CREATE TABLE embedding_api_log (
  id            BIGSERIAL PRIMARY KEY,
  called_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  source        TEXT NOT NULL,        -- 'loader' or 'mcp-query'
  model         TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL,
  latency_ms    INTEGER,
  error         TEXT
);

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

## Authoring + embedding loop

The mechanics differ slightly per layer; the embedding rule is the same across all three: **hash the source text, embed only what's actually changed, skip the API call when the hash matches.**

### Layer 3 — concept notes

1. Operator edits `concept-notes/<slug>.md`. Save.
2. Operator runs `npm run load-concepts`.
3. The loader, in one transactional pass per slug:
   - Parses YAML frontmatter; extracts `slug + title + summary + related_entities + related_concepts + shape`.
   - Hashes the body. If `body_sha256` unchanged since last load → skip chunking and embedding entirely. **No API call.**
   - If hash changed: chunks the body (default: split on markdown headings; see open question on token-window overlap), per-chunk hash. Embed only chunks whose `text_sha256` is new or changed.
   - Rewrites `concepts`, `concept_chunks`, `concept_entities`, `concept_concepts` rows for this slug atomically. Other slugs untouched.
   - Pre-flight check: warn if any in-body markdown link points to a concept slug that isn't in the slug's `related_concepts:` frontmatter.
4. Typical edit: ~2 seconds, ~$0.0001 in API cost (well inside free tier).

### Layer 1 — engine + game-content entities

Symmetric to Layer 3, fired from the existing extractor pipeline:

1. The loader (`load-version` and the `qw`-namespace loaders) writes / updates entity rows as part of its existing pipeline.
2. **After structured-row writes commit**, an embedding pass runs over rows whose description text is new or changed (`description_embedding_sha256` mismatched against the current `description` hash).
3. Voyage API embeds the batch (one HTTPS call per batch of N rows, configurable; default N=64).
4. Vectors written back to `entities.description_embedding`, hash recorded in `description_embedding_sha256`, stale flag cleared.

Triggers for re-embedding a Layer 1 row:
- Description changed at extraction time (typical case).
- Loader run with a new `EMBEDDING_MODEL_BUILD` (e.g. model swap).
- Operator forces it via `npm run re-embed-entities` (escape hatch).

The embedding step is non-blocking for the loader's main work — if Voyage is down, structured rows still update, embeddings are marked stale, MCP keeps serving stale vectors until the next successful pass.

### Layer 2 — chat corpus (v1 port-only)

No embeddings in v1. The loader populates the ported tables once at migration; tsvector columns are `GENERATED ALWAYS AS ... STORED`, so lexical search works the moment data is loaded. The Arc 3 enrichment pipeline will add session-summary embeddings later.

### Failure modes (all layers)

- **Voyage API down at embedding time** → structured rows + graph still update, vectors marked stale (`embedding_stale = true` for chunks; `description_embedding_stale = true` for entities). MCP keeps serving last-known-good vectors. Stale rows can still be retrieved via lexical search; the round-1-rescue degrades but doesn't fail.
- **Loader crashes mid-update** → transaction rolls back, source-of-truth row stays at previous version. No half-state visible to MCP.
- **Voyage API returns mismatched dimension** (rare, but possible if model is silently swapped server-side) → loader rejects the response, marks the row stale, surfaces error. Will not write a vector with the wrong dimension to the indexed column.

---

## Evaluation

The single highest-ROI piece of infrastructure in this arc, and the part most projects skip.

**Eval set:** 15-20 questions hand-picked from the Quake.World Discord helpdesk channel by the operator. Mix of:
- Questions where the answer should hit a concept note (e.g. "screen wobble" → `weapon-scripts` / `cl_bob`).
- Questions where the answer should hit Layer 1 directly (e.g. "what does `cl_bob` do" → entity lookup).
- Questions genuinely out-of-corpus (the corpus should report `match_quality = none` and `redirect_to_human` should fire).

For each question, operator pre-records the expected top-1 to top-3 hits.

**Authoring-effort note.** For exact-name and concept-anchored queries, expected hits are easy to pre-record. For genuinely-vague queries (the ones the design exists to fix), the operator may not know the right answer node — that's the whole problem. The pragmatic approach: bootstrap with the operator's best guess, run the eval, treat queries where the system finds something *better* than the operator's guess as a successful surfacing rather than a regression. Update expected-hits over time as understanding grows. The eval set is alive, not frozen.

**Use 1 — Deploy gate.** Before public DNS opens, the eval set runs against a loaded DB; thresholds (`MATCH_QUALITY_STRONG_THRESHOLD`, `MATCH_QUALITY_WEAK_THRESHOLD`) are calibrated such that the strong/weak/none labels match operator expectations on the eval queries. Calibrated values are committed to config. **Initial public users see calibrated `match_quality`, not placeholder values.** Re-runs after any retrieval-affecting change (new model, chunking strategy change, RRF weight change) gate further deploys.

**Use 2 — Concept-note gap finder.** Questions that *should* have a concept-note answer but don't are the prioritised list of new notes to author. The eval set becomes a living queue, not a static fixture. Existing operator workflow (browse helpdesk → spot recurring question → write a concept note) becomes structured.

The eval set lives at `apps/qw-oracle/eval/queries.json` with expected-hits annotations. A simple `npm run eval` script runs the queries against a loaded DB and reports recall@1, recall@3, and per-question pass/fail.

`helpdesk-coverage.mjs` (existing throwaway POC) is the spiritual ancestor; the new eval is its successor and replaces it.

---

## Arc sequencing

This design is too large for one implementation plan. Three arcs, each independently shippable:

### Arc 1 — Single-engine Postgres + hybrid retrieval (L1+L3) + Layer 2 port + `search_concepts`

The work this spec primarily describes. Includes:
- Postgres setup (Docker Compose dev + Unraid container).
- Schema port for all three layers (Layer 1 entities + version arc + game content; Layer 2 messages + sessions + message_labels; Layer 3 concepts + chunks + graph + observability tables).
- Loader rewrites: `load-version` and `qw`-namespace loaders write to Postgres; new `load-concepts` loader; new `import-discord` / `import-irc` loaders that write to Postgres (replacing the existing `.mjs` POC scripts).
- Embedding pipeline for Layer 1 entities + Layer 3 chunks (Voyage v4 series, hash-based incremental).
- Hybrid retrieval (RRF) on Layer 1 (`search_entities`) and Layer 3 (`search_concepts` — new tool).
- Layer 2's `search_solved_issues` keeps its current consumer-facing behaviour (lexical-only); internal implementation switches from FTS5 to tsvector + GIN.
- Bidirectional graph tables (`concept_entities`, `concept_concepts`); reverse direction surfaced in `lookup_entity` responses.
- `redirect_to_human` tool with seed redirect targets.
- Server-level orientation instructions on MCP `initialize`.
- Eval set authored; thresholds calibrated as deploy-gate before public DNS opens.
- Observability tables (`query_log`, `embedding_api_log`) wired up; basic operator-facing SQL queries documented.
- MCP container deployed to Unraid behind CF Tunnel; `oracle.slipgate.me` live.

**Single-engine deliverable.** End of Arc 1 the project runs Postgres only. `qw.db` SQLite is retired.

### Arc 2 — Snapshot delta-fetch pipeline

After Arc 1 ships and the public MCP is live. Includes:
- Manifest schema spec promoted to `contracts/`.
- `build-snapshot` writes manifest + content-hashed JSONs to nginx-served directory.
- Slipgate-app gains an update-loop module (Rust + frontend wire-up) that fetches manifest, diffs, downloads changed files, atomic-swaps, falls back gracefully on errors.
- Slipgate's bundled JSONs become first-run seed cache.

### Arc 3 — Layer 2 enrichment pipeline (the genuinely-novel work)

Separate design pass. Now scoped to *just the enrichment*, not the migration (which Arc 1 covers). Includes:
- Discord-only enrichment (IRC archived as raw, not enriched).
- Segment / classify / summarise pipeline (LLM-driven; design pass needed for prompt strategy, summarisation grain, classifier taxonomy).
- Session-summary embeddings written to a new `session_summaries` table with `embedding` + `tsv` columns.
- `search_solved_issues` upgrades from lexical-only to hybrid retrieval over session summaries.
- Eval set extended with chat-corpus-flavoured queries.

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
Mitigation: calibrated as a deploy-gate step against the eval set, before public DNS opens. Initial public users see calibrated values. Re-calibration runs after any retrieval-affecting change as a gate before redeploy.

**Risk: 200M-token Voyage free tier expires or changes terms.**
Mitigation: `voyage-4-large` at $0.12/M post-free-tier is still negligible at expected v1 query volume. Arc 3 (Layer 2 enrichment) is where token cost actually matters — that arc's design pass treats budget as an explicit input. Local fallback via `voyage-4-nano` (open weights, same shared embedding space) slots in via the model-swap mechanism with no corpus re-embed.

**Risk: Voyage's "shared embedding space across v4" guarantee changes or is withdrawn.**
Mitigation: it's a vendor claim, not a mathematical property — worth treating as a contract that could be unilaterally revised. If withdrawn, the architecture still works but the build/query model-mix loses its no-re-embed property. Worst case: the operator picks one v4 model for both build and query (a one-line config change, plus one re-embed). Not catastrophic.

**Risk: Layer 2 port turns out larger than expected and slows Arc 1.**
Mitigation: the Layer 2 *port* is structurally simpler than its current loader makes it look — the existing `db.mjs` schema and the `import-discord.mjs` / `import-irc.mjs` ingest scripts are what get rewritten, but the consumer-facing tool (`search_solved_issues`) keeps the same shape. The implementation plan can sequence the port early in Arc 1 so a slip is visible early. If the port genuinely blocks, a fallback split-arc remains available — but the spec's position is that running two engines for an indeterminate duration is the costlier option.

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
| Layer 2 in v1 | **Ported to Postgres + tsvector (lexical only)**; enrichment deferred to Arc 3 | Single-engine ops trumps avoiding migration work; revised 2026-05-02 after second-opinion review |
| IRC corpus enrichment | Parked for Arc 3 | Multilingual / archaic-format complexity, lower signal — but raw rows port in Arc 1 to keep one engine |
| Storage engine | Postgres 16 + pgvector + tsvector from day 1 | pgvector / HNSW maturity, concurrency model, ops familiarity across the QW ecosystem (qw-stats already runs Postgres). Endgame alignment is a bonus, not the primary justification |
| Local dev DB | Postgres in Docker Desktop | Dev = demo deployment shape |
| Public domain | `oracle.slipgate.me` | Operator-owned; quake.world delegation later if it lands |
| Auth in v1 | Anonymous + CF rate limiting | Read-only, public knowledge; no abuse vector |
| Backup posture in v1 | Weekly Unraid → Synology covers it | No additional tooling needed |

---

## Open questions for the implementation plan

These are decisions that don't need to be made now but need to be made in the implementation plan:

1. **Chunking strategy.** Default: split on markdown headings (one chunk per `##` section, max ~500 tokens, split further if a section exceeds the cap). Open question is whether to also generate token-window chunks with overlap as a parallel chunking pass — useful for matching across heading boundaries, doubles chunk count. Decision against eval set in Arc 1.
2. **RRF `k` parameter.** Standard RRF uses `k=60`. Possibly tune against the eval set.
3. **Match-quality thresholds.** Initial values; calibrated as deploy-gate step against eval set.
4. **Migrator tool.** Hand-rolled `.sql` runner vs `node-pg-migrate` vs Drizzle migrations? Operator preference for transparency-vs-tooling. Default lean: hand-rolled .sql runner so migrations are pure SQL and reviewable without learning a tool's DSL.
5. **MCP transport.** stdio (existing) for local Claude Code consumers vs HTTP/SSE for public consumers. Likely both, with the same tool implementations behind two transports.
6. **Redirect targets seed list.** Initial set of `(topic, display_name, url, description)` rows. Discord channels, expert handles, ezquake.com docs, wiki.quakeworld.nu.
7. **Layer 2 port granularity.** Implementation plan decides whether to port-then-rewrite-loader (port the existing tables faithfully, then refactor the ingest scripts) or rewrite-and-port (fresh Postgres-shaped ingest scripts, schema can be cleaned up at the same time). The reviewer's point that the existing ingest scripts are throwaway POCs argues for the rewrite-and-port path; defer the call to the implementation plan based on actual loader audit.
8. **`session_search` materialised view vs on-the-fly aggregation.** Today's FTS5 backs a virtual table joining sessions + messages + message_labels. Postgres can do this as a materialised view (refresh on ingest) or as a query-time CTE/JOIN with a GIN index on `messages.content_tsv`. Latency comparison against the eval set decides.

---

*End of spec.*
