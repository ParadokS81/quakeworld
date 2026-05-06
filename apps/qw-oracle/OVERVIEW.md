# QW Oracle — Overview

> **Doc type: load-bearing slim.** Three-layer design intent, domain inventory at-a-glance, attestation about parked Layer 2 work, code landmarks, integration boundaries. Catalog content (subcommand tables, MCP tool rosters, schema migration lists, extractor directory trees) lives in source — see the pointers below.

**Lifecycle status:** Active. Layer 1 covers six namespaces (ezQuake / FTE / QWCL / MVDSV engine ports + the `qw` game-content namespace) with KTX as the only outstanding port. Schema at v18, Postgres dialect, single-engine since Arc 1 (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`). Layer 2 ported to Postgres + tsvector (Discord-only); enrichment deferred to Arc 3. Public MCP live at `oracle.slipgate.me/mcp`. Most recent shipped arc: postgres-arc1 (2026-05-03) — see `docs/arc-history.md` for the chronological log.

---

## What the project is

Oracle is the **knowledge service** for the monorepo: three data layers plus the machinery around them. See `VISION.md` for the framing.

**Layer 1** — Postgres `qw_oracle.public.entities` + 15 `*_versions` tables + relation tables (`asset_*`, `release_notes`) + the `qw` namespace (`maps`, `gameplay_*`). Source-extracted engine facts (15 entity types) plus game content. Engine entities live in the per-version arc model with per-field blame and diff streams. `qw` content lives in flat per-domain tables. Schema at v18 (tracked in `oracle_meta`, not PRAGMA). Covered by `SCHEMA.md`. The SQLite era (`data/knowledge.db`) ended with Arc 1.

**Layer 2** — Postgres `qw_oracle.public.messages` + `sessions` + `session_search` + `session_references` + `message_labels` + `discord_channels` + `import_log` + `processing_log`. 728,863 Quake.World Discord messages (2016-present), 86,423 sessions, 15,489 reply edges. tsvector + GIN lexical search via the `search_solved_issues` MCP tool. Discord-only by D9-revised; IRC excluded. Enrichment (segment / classify / summarise / session-summary embeddings) deferred to Arc 3 — see "Layer 2 — ported to Postgres in Arc 1" below.

**Layer 3** — `curated/concept-notes/`. Hand-authored notes synthesizing Layer 1 + Layer 2 into usable guidance. 9 notes plus `README.md` (entry template + 6 recognized shapes), `OPERATIONS.md` (stewardship playbook), `_gap-report.md` (contributor onboarding seed for ezquake.com). `weapon-scripts.md` (2026-04-24) is the first R7 opinionated-best-practice exemplar. The `get_concept_note` MCP tool serves this directory live.

Both DBs are gitignored — they regenerate from source (Layer 1) or from raw import dumps (Layer 2).

---

## Layer 1 — domain inventory

The single source of truth for "what does Oracle currently know about?". Update this table whenever a new domain or codebase lands.

| Namespace | Project / domain | Model | Tags loaded | Status |
|---|---|---|---|---|
| `ezquake` | engine | per-version arc | 14 release tags v3.0 → 3.6.9 + head | head + deep-time walk to v3.0 floor |
| `fte` | engine | per-version arc | `build-6698` (SHA `35843773`) | Phase 2d-core + Phase 2d-bundle SHIPPED 2026-04-26/27 |
| `qwcl` | engine | per-version arc | `2.33` (canonical alias for commit `bf4ac42`) | shipped 2026-04-25 (single tag, no asset taxonomy) |
| `mvdsv` | engine (server) | per-version arc | `head` (`f816d28`, 2026-01-04 snapshot) | Phase 2e SHIPPED 2026-04-27; no client snapshot |
| `ktx` | engine (mod, C) | per-version arc | `1.46` | shipped 2026-05-06 (KTX onboarding arc); cvars + commands + info_keys + log_templates + game_mode catalog + mode_default overlays + election_type + death_rule + monster + score_system + drop_item + loc_macro + teamplay_message + match_event entity type |
| `qw` | game content + game mechanics | flat per-domain tables (no version arc) | sentinel `static` | maps + id1 baseline gameplay shipped 2026-04-27 |

For per-namespace entity counts at HEAD, query `entities` directly:
```sql
SELECT project, type, COUNT(*) FROM entities GROUP BY project, type;
```

**Deep-time walk floor for ezQuake is `v3.0`** (2016-06-04). Pre-3.0 era is **deliberately de-scoped** per 2026-04-25 chat with infiniti — security framing (pre-3.6 has known attack vectors; Oracle should not surface settings nudging users into vulnerable defaults) plus diminishing-returns. Walk procedure documented in `docs/layer1-extraction-roadmap.md`.

**Still open on Layer 1:**
- (KTX onboarding shipped via the 2026-05-04 KTX onboarding arc; see `docs/arc-history.md` for the chronological ship log.)
- **Phase 2f historical backfill** beyond ezQuake — FTE / QWCL / MVDSV today are single-version. Multi-version walks must re-extract under post-Phase-6 handlers (HANDOVER: "Cross-extractor Phase 6 residuals — Deep-time-walk re-extract obligation").
- **Phase 2g MCP tool upgrades** — `version` / `as_of` parameters, `get_entity_history`, version/date filters on `search_entities`.
- **Phase 2h automation** — scheduled tag-delta job (detect new upstream tag → extract → load → enrich → insert).
- **Asset reference-resolution graph** — research-foundation spec at `docs/superpowers/specs/2026-04-21-asset-reference-resolution-graph-design.md` proposes the shift from category-classification to consumer-reference graph. Implementation plan not yet written.
- **`qw` namespace expansion** — future game-content domains (KTX gameplay overrides, official match-stats subset, player registry, event metadata) land as additional flat tables under the `qw` namespace.

---

## Layer 2 — ported to Postgres in Arc 1

`messages`, `sessions`, `session_search`, `session_references`, `message_labels`, `discord_channels`, `import_log`, `processing_log` live in Postgres at `qw_oracle.public.*`. Discord-only by D9-revised: the `messages.platform` / `sessions.platform` / `session_search.platform` / `import_log.platform` CHECK constraints lock to `'discord'`; pre-2016 IRC content is excluded (operator decision 2026-05-02). Lexical search uses `to_tsvector('simple', ...)` per D7 to preserve the language-agnostic SQLite FTS5 behaviour the Discord corpus needs (mixed Swedish / Russian / German handles + snippets).

The `search_solved_issues` MCP tool serves Layer 2 with the same response shape as the SQLite era; internals are tsvector + GIN indexes, not FTS5.

Hygiene tightenings absorbed into the port (D18): filter-then-segment session boundaries (only `category IN ('chat','link')` advances the gap clock), nullable `message_labels.session_id` for bot/reaction/system rows, `BOT_COMMAND_PATTERNS` removed (Discord exposes `author_is_bot` reliably), and `session_references` reply-graph table for Phase 6's cross-session lookup. Final state: 728,863 messages, 86,423 sessions, 15,489 reply edges.

Layer 2 enrichment — segment / classify / summarise / session-summary embeddings — is deferred to Arc 3. The arc's design starts only after Arc 2 (snapshot delta-fetch) ships.

`data/qw.db` and `data/knowledge.db` are gone. The authoritative store is Postgres only.

---

## Code landmarks - where to find things

| If you want to... | Look at... |
|---|---|
| Add a new entity type | Author a new migration in `db/migrations/<NNN>_<name>.sql` (new `*_versions` table + CHECK widening) -> `scripts/load-knowledge/types.ts` (row interface) -> `scripts/load-knowledge/natural-keys.ts` (upsert helper) -> new `scripts/load-knowledge/load-<type>.ts` adapter -> `scripts/load-knowledge/load-version.ts` (register in dispatcher) -> `scripts/load-knowledge/diff-versions.ts` (`TYPE_DIFF_CONFIGS` entry) |
| Change how diff blame is resolved | `scripts/load-knowledge/diff-versions.ts` -- the Map preload + override-lookup hot loop |
| Add per-field blame for a new type | Extractor emits `field_source_lines` payload -> adapter calls `upsertSourceOverride` with `override_kind` |
| Tune the regression drop-guard | `scripts/load-knowledge/load-version.ts` -- the `dropGuard` check |
| Add a loader CLI subcommand | `scripts/load-knowledge/index.ts` (the dispatcher is the source of truth for what's wired) |
| Add an MCP tool | `serve/mcp/src/tools/<name>.ts` + register in `src/index.ts`. The 12 current tools live there. |
| Migrate schema (additive -- new column on existing table) | New migration file in `db/migrations/<NNN>_<name>.sql`; apply with `bun db/migrate.ts`. Pure-additive `ALTER TABLE ADD COLUMN` is the simplest case. Update `SCHEMA.md` alongside. |
| Migrate schema (CHECK widening on existing column) | New migration file under `db/migrations/`. PostgreSQL `ALTER TABLE ... DROP CONSTRAINT ... + ADD CONSTRAINT ...` -- no table rebuild required for additive value-set changes (the SQLite-era table-rebuild pattern is gone). |
| Verify a phase ran correctly | `scripts/load-knowledge/e2e-verify.md` |
| Add a new extractor codebase | `scripts/extractors/<project>/extract.py` (Python + libclang 18; canonical KTX uses libclang too -- only dusty-ktx fork's `qcsrc/` would need tree-sitter when that arc lands). Cross-engine pattern in `scripts/extractors/EXTRACTOR-PLAYBOOK.md`. Use the `onboard-extractor` user-global skill. |
| Author or update a Layer 3 concept note | `curated/concept-notes/`. Template at `curated/concept-notes/README.md`; stewardship at `curated/concept-notes/OPERATIONS.md`; gap-report seeds the upstream contributor kit. Use the `guide-rewrite` user-global skill. |

---

## Design intent — invariants that aren't grep-able

**Layer 1 vs Layer 2 lifecycle is intentional.** Layer 1 (engine entities + `qw` namespace) regenerates from source via the extractor pipeline; Layer 2 (Discord corpus) regenerates from raw import dumps. Both layers live in the single Postgres dev DB (`qw_oracle`); the lifecycle separation is enforced by which loader writes which schema, not by separate DB files. The split keeps Layer 1's per-version arc model from cross-pollinating the Layer 2 corpus's "raw is immutable" rule.

**Per-version arc model is for engine entities only.** The `qw` namespace skips the entire arc (no `entities` row, no per-version snapshot, no `project` column on `qw`-namespace tables, sentinel version `static`). Game content doesn't change with engine versions; engine ports do.

**`source_state` is biographical-by-design.** Entity-level `source_state` captures "ever was source-backed at some loaded version" — per-version `source_file` is current-state. Documented at `scripts/load-knowledge/load-version.ts:580-585` and aligns with the source-truth-dichotomy memory (`memory/project_qw_oracle_source_truth.md`). Consumers reading entity-level state without checking the per-version transition log will misclassify retired entities; that's a CONSUMER-side concern (slipgate), not an extractor bug.

**Snapshot distribution is the slipgate consumer interface.** `build-snapshot --project <p>` reads the Postgres dev DB and emits slipgate-shaped JSON into `apps/slipgate-app/src/lib/config/data/`. Per-record shape: original slipgate fields + 5 enrichment fields (source_state, first_seen_version, last_seen_version, optional default_history, optional retired_at_version). `mvdsv` is intentionally NOT snapshotted (server-side; slipgate is the client); KTX is server-only too and not snapshotted to slipgate. Output filenames documented in `serve/mcp/` consumers and `e2e-verify.md`.

**MCP librarian volunteers cross-references.** v0.2.0 rewrite (2026-04-25) made one tool call return rich records — entity + source_state + version arc + asset relations + linked concept notes — instead of forcing follow-up calls. Voice-neutral; consumer voice and orchestration recipes live in each consumer's surface.

---

## Integration points

**Consumes:**
- `apps/qw-oracle/scripts/extractors/<project>/output/*-ast.json` (extractor outputs, committed)
- `apps/qw-oracle/scripts/extractors/<project>/seeds/*.yaml` (hand-authored seed taxonomies)
- `research/repos/ezquake-source` (and FTE / MVDSV / QWCL clones) for git blame + tag resolution
- GitHub API for release bodies + PR enrichment

**Produces:**
- Postgres rows in `qw_oracle.public.*` (Layer 1 + Layer 2 + Layer 3 -- the Postgres dev DB is the authoritative store; the SQLite era of `data/knowledge.db` + `data/qw.db` ended with Arc 1)
- Slipgate-consumer snapshots at `apps/slipgate-app/src/lib/config/data/*.json` (committed)

**Consumed by:**
- MCP server (local) → Claude Code sessions (live)
- Slipgate-app ConfigViewer (replaces the legacy qw-config-JSON path)
- Planned MCP consumers: a public QW community chatbot (web app or Discord bot calling Claude API), quad chatbot mode, slipgate web chat surface

---

## What this doc intentionally does NOT cover

- **Layer 1 data model + per-table shape** → `SCHEMA.md`
- **Per-entity-type formal documentation** → `docs/entity-types.md` (Pass 2 of the 2026-04-22 realignment roadmap)
- **Loader CLI subcommand catalog** → `scripts/load-knowledge/index.ts` is canonical
- **Per-arc schema migration list** → `docs/arc-history.md` + `schema.ts` source comments
- **MCP tool roster** → `serve/mcp/src/tools/` + `serve/mcp/scripts/verify-rewrite.ts`
- **Extractor directory layout + per-handler details** → `scripts/extractors/EXTRACTOR-PLAYBOOK.md`
- **Why this project exists** → `VISION.md`
- **Rules for Claude sessions** → `CLAUDE.md`
- **Per-arc design intent** → `docs/superpowers/specs/`
- **Verification queries** → `scripts/load-knowledge/e2e-verify.md`

---

*Last slimmed: 2026-04-29 per docs-system-redesign spec Plan 2; 2026-05-06 Phase 8 KTX onboarding sweep (Postgres path scrub in Code landmarks + Produces + design-intent; KTX shipped row in Layer 1 inventory; "Still open on Layer 1" KTX line cleared).*
