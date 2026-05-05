# Phase 8 -- End-of-arc docs

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` for the spec commitment behind this phase.
> 4. Source-walk the relevant KTX files at `research/repos/ktx/` -- spec sketches drift; live source wins. Reproduce the count anchors locked in `review-findings.md`.
> 5. Read the analogous prior-engine handler / loader as a template (e.g., MVDSV's `_handler_log_templates.py` for KTX's match_event loader). Do NOT subclass; port (D3).
> 6. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

Phase 8 lands the end-of-arc documentation obligations that the spec preamble's "Doctrine fixes deferred to end-of-arc" block enumerates plus the four EXTRACTOR-PLAYBOOK additions Pass 1 / Pass 5 of the brainstorm earned. Three deliverables: (1) sweep the qw-oracle three-slim-doc cohort (`apps/qw-oracle/{README,SCHEMA,OVERVIEW}.md`) so they reflect Postgres + `db/migrations/` reality + post-Phase-6 MCP shape + Layer 3 first-class status + the KTX schema deltas (channel widening / new entity type / gameplay kind widenings); (2) extend EXTRACTOR-PLAYBOOK.md with the four cross-codebase port lessons KTX earned -- Pre-Port Discovery Sweep methodology, Pre-Commit Discovery Cross-Check methodology, Handler-grouping rationale, Pattern 15 STRING_LITERAL-array walker -- plus three cross-phase carry-forwards (Pattern 10 ENUM_DECL widening from Phase 4, new Pattern 16 X-macro file parse from Phase 4, dual-row design note for log_template + match_event from D10/F17); (3) verify Phase 0's doctrine fixes survived the arc and that no doc created during the arc recursed the wrong tree-sitter claim. Runnable state at boundary: docs caught up, HANDOVER backlog item ("qw-oracle slim-doc Arc 1 refresh sweep") absorbed and ready for operator deletion, arc done.

## Inputs from previous phase

Phase 7 complete: F1 quality-grid probes for all KTX kinds shipped + JSONB-binding regression gate armed + KTX VALIDATION-RUNBOOK section appended + 5-engine cross-project audit committed; idempotency-ktx.sh defects fixed; per-migration probes assert all 10 CHECK widenings + the new `match_event_versions` table.

Implicit prerequisites from earlier phases:
- Phase 0 shipped: doctrine fixes across 5 reference sites + obsolete TS regex extractor deleted + KTX `OUT_OF_SCOPE.md` created.
- Phase 1 shipped: Pattern 6 cross-header lift in `extractor_lib._source` + the three KTX migrations (whatever filenames Phase 1 actually assigned -- see Open Questions for the slot-collision flag) + new `gameplay_sources` row for `'ktx'`.
- Phases 2-6 shipped: KTX cvar / command / info_key / log_template / mode / taxonomy / table / match_event handlers + loaders all green; KTX rows queryable via MCP.
- Live state: `apps/qw-oracle/scripts/extractors/ktx/` contains the canonical handlers + `OUT_OF_SCOPE.md` (Phase 0) + per-handler entries appended through Phases 2-6.

## Files touched

### Created

```
(none)
```

Phase 8 ships zero new files. All deliverables are markdown edits to existing slim docs and to `EXTRACTOR-PLAYBOOK.md`.

### Modified

```
apps/qw-oracle/README.md                                  # whole-doc rewrite for Postgres + Discord-only Layer 2 + 12-tool MCP + Bun-only runtime + libclang KTX
apps/qw-oracle/OVERVIEW.md                                # targeted edits to Code landmarks + Produces section + design-intent paragraphs (SQLite-leftovers)
apps/qw-oracle/SCHEMA.md                                  # preamble rewrite (Postgres + db/migrations/ + table count) + KTX channel/kind/type updates + new "v_KTX (migrations N/N+1/N+2): KTX onboarding" section
apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md   # 4 new sections + Pattern 10 widening note + new Pattern 16 + dual-row design note for log_template + match_event
```

### Deleted

```
(none)
```

No deletions in Phase 8.

## Tasks

### Task 1: Whole-doc rewrite of `apps/qw-oracle/README.md`

**Goal:** Replace SQLite-era preamble + IRC-included Layer 2 claim + stale tool count + stale runtime + tree-sitter slip with a Postgres-correct, Discord-only, 12-tool, Bun-only, libclang-KTX-correct slim doc.

**Files:**
- `apps/qw-oracle/README.md`

**Steps:**

- [ ] Replace the entire file content with EXACTLY the following:

```markdown
# QW Oracle

The QuakeWorld Knowledge Service. A data foundation, two serving surfaces, and a growing list of consumers.

## The foundation

Three data layers live inside this app:

- **Layer 1** (Postgres `qw_oracle.public.entities` + 15 `*_versions` tables + relation tables + the `qw` namespace) -- structured facts extracted from engine source. Engine entities (15 types: cvar / command / macro / cmdline_param / keyname / hud_element / ruleset / token_primitive / asset_category / flag_bit / cvar_alias / protocol_message / info_key / log_template / qc_builtin) live in a per-version arc model with per-field blame. Game-content facts (the `qw` namespace -- maps, gameplay rules) live in flat tables outside the version arc. Five codebases loaded today: ezQuake (15 versions, v3.0 -> 3.6.9 + head), FTE (build-6698 with engine + ezhud plugin + asset bundle), QWCL (single tag 2.33), MVDSV (head, 2026-01-04 snapshot), KTX (canonical 1.46) -- KTX onboarded by the 2026-05-04 onboarding arc, which also added the `match_event` entity type plus the gameplay-mechanics widening (`game_mode`, `mode_default`, `election_type`, `score_system`, `drop_item`, `loc_macro`, `teamplay_message`) and `gameplay_entity_defs.kind += 'monster'`. Per-namespace counts are queryable via `SELECT project, type, COUNT(*) FROM entities GROUP BY project, type` against the dev DB.
- **Layer 2** (Postgres `qw_oracle.public.messages` + `sessions` + `session_search` + `session_references` + `message_labels` + `discord_channels` + `import_log` + `processing_log`) -- 728,863 Quake.World Discord messages (2016-present), 86,423 sessions, 15,489 reply edges. tsvector + GIN lexical search via the `search_solved_issues` MCP tool. Discord-only by D9-revised of qw-oracle Arc 1; pre-2016 IRC content excluded. Layer 2 enrichment (segment / classify / summarise / session-summary embeddings) deferred to Arc 3.
- **Layer 3** -- hand-authored concept notes at `curated/concept-notes/`. Ten notes shipped, plus README (entry template + 6 shapes + voice table), OPERATIONS (stewardship playbook), and _gap-report (contributor onboarding seed for upstream ezquake.com guide updates). Community curated layer (player-notes / clan-notes / tournament-notes) under `curated/<kind>-notes/` per the QWiki community-reference arc.

For per-entity-type background see [`docs/entity-types.md`](docs/entity-types.md) (ezQuake-only today; pending refresh for FTE / QWCL / MVDSV / KTX / `qw`). For chronological ship history see [`docs/arc-history.md`](docs/arc-history.md). For the current data model see [`SCHEMA.md`](SCHEMA.md).

## Serving surfaces

A consumer reaches the foundation via one of two paths:

- **MCP** -- live queries for interactive clients. Server at `serve/mcp/`. Twelve tools: `lookup_entity`, `search_entities`, `get_concept_note`, `search_concepts`, `search_solved_issues`, `lookup_map`, `search_maps`, `lookup_gameplay_entity`, `lookup_mechanic`, `search_gameplay_entities`, `search_mechanics`, `redirect_to_human`. Public deployment at `oracle.slipgate.me/mcp`.
- **Snapshot distribution** -- consumer-tailored JSON snapshots pre-computed from the foundation by the `build-snapshot` CLI. Emitted directly into `apps/slipgate-app/src/lib/config/data/`. For clients that need the same facts repeatedly and want fast, predictable access (e.g. slipgate-app's ConfigViewer + map browser).

Both serve the same underlying facts; consumers pick the surface that fits their access pattern.

## Consumers

- **Claude Code** (live) -- MCP. Primary consumer today; every coding session in the monorepo can query Layers 1, 2, and 3.
- **slipgate-app** (live) -- consumes snapshots at `apps/slipgate-app/src/lib/config/data/` produced by Oracle's `build-snapshot` CLI. Today serves ezQuake (variables / commands / macros / cmdline_params / asset bundle), QWCL (variables), FTE (asset bundle), `qw` (maps + gameplay). MVDSV intentionally not snapshotted (server-side; slipgate is the client).
- **quad chatbot mode** (future) -- MCP. Quad is a voice-recording Discord bot today; a chat-over-oracle mode is a future capability on top.
- **New chatbot app** (future) -- MCP. Possibly separate from quad.
- **slipgate web help surfaces** (future) -- snapshots. The web-services-family direction (assets.quake.world, maps.quake.world) will consume oracle snapshots for anything that maps to knowledge-layer facts.

**Status:** Active development. Solo project for now, not public-facing.

## Tech stack

- **TypeScript + Bun** for every script (loader, embed, eval, calibrate, MCP server). The SQLite era ended with Arc 1 (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`); Bun is the canonical runtime per Arc 1 D2.
- **PostgreSQL 16 + pgvector + tsvector** (image: `pgvector/pgvector:pg16`); single engine across Layer 1 / Layer 2 / Layer 3. Schema migrations applied by `db/migrate.ts` from `.sql` files in `db/migrations/`.
- **postgres-js** for DB access; **Voyage v4 series** (`voyage-4-large` build / `voyage-4-lite` query) for embeddings; **@modelcontextprotocol/sdk** + **express** for the MCP server (Streamable HTTP transport behind Cloudflare Tunnel); **ulid** for extractor-run IDs; **js-yaml** for seed ingestion; **gray-matter** for concept-note frontmatter.
- **Python 3 + libclang 18** for the engine-source extractors at `scripts/extractors/<project>/` (ezQuake / FTE / QWCL / MVDSV / KTX). Pure-stdlib Python for the `qw` namespace (BSP binary parsing). The `match_event` handler in `scripts/extractors/ktx/_handler_match_events.py` is the lone XSD-driven handler in the lineup (per spec Pass 5.6.c -- not libclang; standalone Visitor lifecycle stubs).

## Learn more

- `CLAUDE.md` -- always-on rules, where-to-find-things table, tooling conventions
- `VISION.md` -- why this project exists, the knowledge-service framing, the active-assistance answer shape
- `OVERVIEW.md` -- current-state living map: what is loaded, what the pipeline does, code landmarks, open work
- `SCHEMA.md` -- Layer 1 data model reference, one section per table, topically organized
- [`docs/arc-history.md`](docs/arc-history.md) -- chronological ship log
- [`docs/entity-types.md`](docs/entity-types.md) -- per-entity-type reference (ezQuake; pending refresh)
- `scripts/extractors/EXTRACTOR-PLAYBOOK.md` -- porting playbook + registration pattern catalog
- `scripts/extractors/VALIDATION-RUNBOOK.md` -- post-ship validation methodology

This app is one of five in the [QuakeWorld monorepo workshop](../../README.md).
```

(End of file content. ASCII only; no trailing whitespace; single trailing newline.)

**Verification:**
- `grep -iE "tree-?sitter|quakec" apps/qw-oracle/README.md` returns zero matches.
- `grep -iE "data/knowledge\.db|data/qw\.db|better-sqlite3|Node 20|FTS5|Schema v18|Ten tools|Nine notes" apps/qw-oracle/README.md` returns zero matches.
- `grep -c "^- " apps/qw-oracle/README.md` confirms structural integrity (the rewritten content has the same general bullet shape as the original).
- PASS condition: zero residual SQLite-era / IRC-era / stale-count signals; zero tree-sitter doctrine slips.
- FAIL condition: any of the above grep probes returns a match.

**Execution mode:** `inline` -- whole-file replacement; full file content shipped above; mechanical Write call.

### Task 2: Targeted edits to `apps/qw-oracle/OVERVIEW.md`

**Goal:** Replace SQLite-leftover references in Code landmarks + Integration points sections; the preamble + Layer 1 inventory + Layer 2 section are already Postgres-correct (line 13's "SQLite era ended" attestation, lines 53-63's Postgres details). Phase 0 already handles lines 33 / 44 / 80 (doctrine fixes per F19); Phase 8 catches the SQLite-path stragglers Phase 0 left untouched.

**Files:**
- `apps/qw-oracle/OVERVIEW.md`

**Steps:**

- [ ] Verify Phase 0's edits to lines 33 / 44 / 80 are present (`grep -n "tree-sitter" apps/qw-oracle/OVERVIEW.md` should return zero matches OR only dusty-ktx-context matches). If those edits are missing, halt -- Phase 0 has regressed and must be re-applied before Phase 8 proceeds.

- [ ] Edit the "Code landmarks - where to find things" table (current lines 67-82). The whole table needs SQLite-path scrubbing. Replace the existing table block with EXACTLY the following (preserving the section heading and the surrounding markdown):

  ```markdown
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
  ```

- [ ] Edit the "Design intent" paragraph that mentions `knowledge.db` regenerability (current line 87). Replace:
  ```
  **Two-DB split is intentional.** `knowledge.db` is regenerable from source; `qw.db` is regenerable from raw import dumps. Neither is committed. The split keeps Layer 1's per-version arc model from cross-pollinating the Layer 2 corpus's "raw is immutable" rule.
  ```
  With:
  ```
  **Layer 1 vs Layer 2 lifecycle is intentional.** Layer 1 (engine entities + `qw` namespace) regenerates from source via the extractor pipeline; Layer 2 (Discord corpus) regenerates from raw import dumps. Both layers live in the single Postgres dev DB (`qw_oracle`); the lifecycle separation is enforced by which loader writes which schema, not by separate DB files. The split keeps Layer 1's per-version arc model from cross-pollinating the Layer 2 corpus's "raw is immutable" rule.
  ```

- [ ] Edit the "Snapshot distribution" paragraph (current line 93). Replace:
  ```
  **Snapshot distribution is the slipgate consumer interface.** `build-snapshot --project <p>` reads `knowledge.db` and emits slipgate-shaped JSON into `apps/slipgate-app/src/lib/config/data/`. Per-record shape: original slipgate fields + 5 enrichment fields (source_state, first_seen_version, last_seen_version, optional default_history, optional retired_at_version). `mvdsv` is intentionally NOT snapshotted (server-side; slipgate is the client). Output filenames documented in `serve/mcp/` consumers and `e2e-verify.md`.
  ```
  With:
  ```
  **Snapshot distribution is the slipgate consumer interface.** `build-snapshot --project <p>` reads the Postgres dev DB and emits slipgate-shaped JSON into `apps/slipgate-app/src/lib/config/data/`. Per-record shape: original slipgate fields + 5 enrichment fields (source_state, first_seen_version, last_seen_version, optional default_history, optional retired_at_version). `mvdsv` is intentionally NOT snapshotted (server-side; slipgate is the client); KTX is server-only too and not snapshotted to slipgate. Output filenames documented in `serve/mcp/` consumers and `e2e-verify.md`.
  ```

- [ ] Edit the "Produces" section (current lines 107-110). Replace:
  ```
  **Produces:**
  - `data/knowledge.db` (Layer 1, gitignored)
  - `data/qw.db` (Layer 2, gitignored)
  - Slipgate-consumer snapshots at `apps/slipgate-app/src/lib/config/data/*.json` (committed)
  ```
  With:
  ```
  **Produces:**
  - Postgres rows in `qw_oracle.public.*` (Layer 1 + Layer 2 + Layer 3 -- the Postgres dev DB is the authoritative store; the SQLite era of `data/knowledge.db` + `data/qw.db` ended with Arc 1)
  - Slipgate-consumer snapshots at `apps/slipgate-app/src/lib/config/data/*.json` (committed)
  ```

- [ ] Edit the Layer 1 inventory table's KTX row (current line 33; was landed by Phase 0's doctrine fix per `phase-0-doctrine-fixes.md` Task 1 step 1). The Phase-0-after-block becomes Phase-8's find-string; it reads:
  ```
  | `ktx` | engine (mod, C) | per-version arc | — | not started; libclang-based (canonical KTX is pure C; dusty-ktx fork's `qcsrc/` is QuakeC and out of scope for canonical onboarding) |
  ```
  Replace with:
  ```
  | `ktx` | engine (mod, C) | per-version arc | `1.46` | shipped 2026-05-XX (KTX onboarding arc); cvars + commands + info_keys + log_templates + game_mode catalog + mode_default overlays + election_type + death_rule + monster + score_system + drop_item + loc_macro + teamplay_message + match_event entity type |
  ```
  (Operator fills in the actual ship date at execution time. Phase 0 did not pre-ship this row -- the Phase 0 doctrine fix to this row only corrected the language attribution from QuakeC to C; the "not started" status was correct AT Phase 0 time. Phase 8 lands the post-arc-shipped status. If Phase 0 has not yet shipped at Phase 8 execution time, halt -- something is wrong with the arc execution order.)

- [ ] Edit the "Still open on Layer 1" section (current lines 43-49). The "Phase 2e KTX" line was Phase 0's doctrine fix to current line 44 (per `phase-0-doctrine-fixes.md` Task 1 step 2's after-block); Phase 8 now removes it entirely since KTX is shipped. The Phase-0-after-block becomes Phase-8's find-string; it reads:
  ```
  - **Phase 2e KTX** -- libclang-based (canonical KTX is pure C); foundations cleaned by zero-debt-before-KTX arc 2026-04-29; ships under arc plan `docs/superpowers/plans/2026-05-04-ktx-onboarding/`.
  ```
  Replace with:
  ```
  - (KTX onboarding shipped via the 2026-05-04 KTX onboarding arc; see `docs/arc-history.md` for the chronological ship log.)
  ```

- [ ] Update the slimmed-on date footer (current last line). Replace:
  ```
  *Last slimmed: 2026-04-29 per docs-system-redesign spec Plan 2 (litmus test applied; subcommand / MCP tool / migration / extractor-tree catalogs cut as grep-reproducible; per-namespace counts replaced with one SQL probe; Layer 2 attestation preserved verbatim; design-intent paragraphs added).*
  ```
  With:
  ```
  *Last slimmed: 2026-04-29 per docs-system-redesign spec Plan 2; 2026-05-XX Phase 8 KTX onboarding sweep (Postgres path scrub in Code landmarks + Produces + design-intent; KTX shipped row in Layer 1 inventory; "Still open on Layer 1" KTX line cleared).*
  ```
  (Operator fills in the actual ship date at execution time.)

**Verification:**
- `grep -nE "tree-?sitter|quakec" apps/qw-oracle/OVERVIEW.md` returns zero matches that attribute either to canonical KTX (Phase 0 baseline + Phase 8 should preserve).
- `grep -nE "knowledge\.db|qw\.db" apps/qw-oracle/OVERVIEW.md` returns matches only inside the SQLite-era attestation paragraph that explicitly says "the SQLite era of `data/knowledge.db` + `data/qw.db` ended with Arc 1." Live-state references to those filenames as authoritative storage must be zero.
- `grep -nE "schema\.ts.*new \\*_versions|SCHEMA_V|applySchema|migrateV" apps/qw-oracle/OVERVIEW.md` returns zero matches. (The Code landmarks table no longer routes operators through the SQLite-era recipe.)
- `grep -nE "Phase 2e KTX" apps/qw-oracle/OVERVIEW.md` returns zero matches in the "Still open" list.
- `grep -nE "ktx.*not started|tree-sitter spike" apps/qw-oracle/OVERVIEW.md` returns zero matches in the Layer 1 inventory.
- PASS condition: all five greps land zero KTX-doctrine / SQLite-leftover signals.
- FAIL condition: any of the above returns a non-zero KTX-misattribution match.

**Execution mode:** `inline` -- targeted markdown edits; per-section before/after content shipped above; mechanical Edit calls.

### Task 3: Sweep `apps/qw-oracle/SCHEMA.md` -- preamble Postgres rewrite + KTX-specific updates

**Goal:** The SCHEMA.md preamble (lines 1-30) is SQLite-heavy (`data/knowledge.db`, `schema v18`, `scripts/load-knowledge/schema.ts`, `SCHEMA_V*_ADDITIONS_SQL`, `migrateV*ToV*`, `better-sqlite3`); the body has been incrementally Postgres-updated (Community schema section near the bottom) but the preamble + per-section migration recipes throughout still reference SQLite primitives. Phase 8's slim-doc sweep covers ONLY the preamble + the KTX-specific deltas (channel CHECK widening, gameplay kind values, new `match_event_versions` table, table-count update). The deeper per-table prose body refresh (per-table "Populated by:" paths, "Count at head" figures pre-Phase-6) stays parked under the existing HANDOVER sidequest "SCHEMA.md doc-style inconsistency" -- separate scope, not Phase 8's job.

**Files:**
- `apps/qw-oracle/SCHEMA.md`

**Steps:**

- [ ] Replace the file's preamble block (current lines 1-30, from the title down through the "Total: 36 tables..." line). Replace:
  ```markdown
  # QW Oracle - Layer 1 Schema Reference

  Cumulative reference for `apps/qw-oracle/data/knowledge.db`. This is the whole shape at **schema v18**, organized topically (not chronologically). If you want the *why* of a specific migration, see the per-migration spec linked in that section, or `docs/arc-history.md` for the chronological chain. If you want verification queries, see `scripts/load-knowledge/e2e-verify.md`. The authoritative shape is `scripts/load-knowledge/schema.ts`.

  Layer 2 (`data/qw.db`, the chat corpus) is out of scope for this doc.

  > **Doc-currency note (2026-04-29):** the preamble + table map below reflect the live schema (v18) and the live table inventory (31 tables). The per-table sections that follow document tables back through schema v3 with mostly-current detail; some `Populated by:` paths still reference the pre-2026-04-25 `packages/qw-config/scripts/...` layout, and per-table "Count at head" figures are pre-Phase-6. Body refresh is queued (HANDOVER: "SCHEMA.md doc-style inconsistency" -- scope being broadened in the next pass). Trust schema.ts and the live DB over per-table prose when they conflict.

  ## Conventions

  - **SQLite** via `better-sqlite3`. Schema lives in `scripts/load-knowledge/schema.ts` as `SCHEMA_V*_ADDITIONS_SQL` blocks plus rebuild blocks for CHECK widening (entities table at v2/v3/v5/v12/v15; asset_loader_sites at v8; source_state_transitions at v9; project CHECK across 8 tables at v10) and additive ALTER TABLE migrations (v7, v11). Fresh DBs stamp the current `SCHEMA_VERSION` directly; older DBs run through `migrateV1ToV2` ... `migrateV17ToV18` in order. The schema version is tracked in the `schema_meta` table, NOT in PRAGMA `user_version` (which stays 0).
  - **Versions** are strings, per-project convention. ezQuake uses upstream tags (`3.6.9`) plus synthetic `head`. FTE has only `build-6698`. QWCL has only `2.33` (single-commit repo; canonical label aliased to commit `bf4ac42` via `PROJECT_VERSION_ALIASES` in `extract-tag.ts`). MVDSV has only `head` (2026-01-04 snapshot, `f816d28`). `project` is one of `ezquake`, `fte`, `mvdsv`, `ktx`, `qwcl` (CHECK-constrained; all four are populated today except `ktx`). The `qw` namespace (v13/v14) means "the game itself" -- content that exists outside any engine version arc. The `qw` tables (`maps`, `gameplay_sources`, `gameplay_entity_defs`, `gameplay_mechanics`) have no `project` column; `qw` appears only in the `Project` TS union in `build-snapshot.ts`.
  - **Natural keys** are called out per table. All loader upserts go through `scripts/load-knowledge/natural-keys.ts`; that is the one place idempotent-insert logic lives.
  - **Canonical IDs** are `<project>:<type>:<name>`, lowercased for everything except `token_primitive` (which is case-sensitive -- `$B` blue LED vs `$b` glyph). MVDSV-introduced types carry compound name suffixes for cross-scope disambiguation: `info_key` uses `<bare>:<scope>` (e.g. `*z_ext:serverinfo`); `qc_builtin` uses `<bare>:<table_name>` (v18, mirroring info_key Phase B).
  - **Timestamps** are ISO 8601 strings. `extracted_at` is "most recent extraction for this row" -- overwritten on re-run. Git history of `knowledge.db` is not recoverable from the row itself (it is gitignored).
  - **`source_ref` discipline** - every row that can carry a `source_file` / `source_line` does, even when blame is best-effort. The diff pipeline and MCP tools both consult these.

  ## Table map at a glance

  | Group | Tables |
  |---|---|
  | Identity | `versions`, `entities` |
  | Per-type snapshots (engine, per-version arc) | `cvar_versions`, `command_versions`, `macro_versions`, `cmdline_param_versions`, `keyname_versions`, `hud_element_versions`, `ruleset_versions`, `token_primitive_versions`, `asset_category_versions`, `flag_bit_versions`, `cvar_alias_versions`, `protocol_message_versions`, `info_key_versions`, `log_template_versions`, `qc_builtin_versions` |
  | Relations | `asset_extensions`, `asset_path_rules`, `asset_cvar_bindings`, `asset_loader_sites`, `release_notes` |
  | qw namespace (game content, no version arc) | `maps`, `gameplay_sources`, `gameplay_entity_defs`, `gameplay_mechanics` |
  | Change tracking | `change_events`, `relation_changes`, `source_overrides` |
  | Audit | `source_state_transitions`, `schema_meta` |

  **Total: 36 tables at schema v18 (31 L1 engine + 5 community).** Migration chain (high-level): v1-v8 build the engine-entity arc; v9 adds `source_retired_at_version` to transitions reason CHECK; v10 widens project CHECK across 8 tables for QWCL; v11 adds `source_root` (FTE plugin distinction); v12 adds `cvar_alias` + `cvar_alias_versions`; v13 adds `maps` (`qw` namespace); v14 adds `gameplay_*` tables (`qw` namespace); v15 adds the four MVDSV-introduced entity types; v16 widens the `protocol_message` kind CHECK from 6 to 13 values (`pext_fte` / `pext_mvd` subdivide by macro-body shape); v17 reshapes `info_key` canonical names + cvar normalization; v18 reshapes `qc_builtin` canonical names. See `docs/arc-history.md` for per-arc context.
  ```
  With:
  ```markdown
  # QW Oracle - Layer 1 Schema Reference

  Cumulative reference for the Postgres `qw_oracle` database (Layer 1 + the `qw` game-content namespace + the new KTX additions). Organized topically (not chronologically). If you want the *why* of a specific migration, see the matching `db/migrations/<NNN>_<name>.sql` file's header comment, the per-migration spec linked in that section, or `docs/arc-history.md` for the chronological chain. If you want verification queries, see `scripts/load-knowledge/e2e-verify.md`. The authoritative shape is the live database + the SQL files in `db/migrations/`.

  Layer 2 (the chat corpus -- Discord-only) is out of scope for this doc; see `OVERVIEW.md` Section "Layer 2" for that surface.

  > **Doc-currency note (post-KTX-onboarding 2026-05-XX):** the preamble + table map below reflect the live Postgres schema after the KTX onboarding arc shipped (which added the `match_event` entity type plus 10 CHECK widenings -- `log_template_versions.channel += 'logfile'`, `entities.type += 'match_event'`, `gameplay_entity_defs.kind += 'monster'`, `gameplay_mechanics.kind += 'game_mode' / 'mode_default' / 'election_type' / 'score_system' / 'drop_item' / 'loc_macro' / 'teamplay_message'`). The per-table sections that follow document tables back through Arc 1 with mostly-current detail; per-table "Count at head" figures and some `Populated by:` paths are pre-KTX. Body refresh is queued (HANDOVER: "SCHEMA.md doc-style inconsistency" -- separate sidequest from the slim-doc sweep). Trust the live DB + the migration files over per-table prose when they conflict.

  ## Conventions

  - **PostgreSQL 16 + pgvector + tsvector** (image: `pgvector/pgvector:pg16`). Schema is defined by SQL files under `db/migrations/<NNN>_<name>.sql`, applied by `bun db/migrate.ts`. Migration filenames are sequential and append-only -- never edit an applied migration. Architecturally-significant changes additionally get a dated spec under root `docs/superpowers/specs/`. Schema state is tracked in the `schema_migrations` table (filename + applied_at), not in a single integer version counter -- the SQLite-era `SCHEMA_VERSION` / `schema_meta.schema_version` model retired with Arc 1.
  - **Versions** are strings, per-project convention. ezQuake uses upstream tags (`3.6.9`) plus synthetic `head`. FTE has only `build-6698`. QWCL has only `2.33` (single-commit repo; canonical label aliased to commit `bf4ac42`). MVDSV has only `head` (2026-01-04 snapshot, `f816d28`). KTX uses upstream tags (`1.46` is the latest stable as of 2025-09-14). `project` is one of `ezquake`, `fte`, `mvdsv`, `ktx`, `qwcl` (CHECK-constrained; all five populated post-KTX). The `qw` namespace means "the game itself" -- content that exists outside any engine version arc. The `qw` tables (`maps`, `gameplay_sources`, `gameplay_entity_defs`, `gameplay_mechanics`) have no `project` column; `qw` appears only in the `Project` TS union in `build-snapshot.ts`.
  - **Natural keys** are called out per table. All loader upserts go through `scripts/load-knowledge/natural-keys.ts`; that is the one place idempotent-insert logic lives. Postgres `INSERT ... ON CONFLICT ... DO UPDATE` is the canonical upsert shape.
  - **Canonical IDs** are `<project>:<type>:<name>`, lowercased for everything except `token_primitive` (case-sensitive -- `$B` blue LED vs `$b` glyph). MVDSV-introduced types carry compound name suffixes for cross-scope disambiguation: `info_key` uses `<bare>:<scope>` (e.g. `*z_ext:serverinfo`); `qc_builtin` uses `<bare>:<table_name>`. KTX commands extend the same convention with sub-namespace suffixes: `<name>:frogbot:std` and `<name>:frogbot:editor` for the bot-subcommand tables (per the KTX onboarding arc D7).
  - **JSONB columns receive JS values, not pre-stringified JSON** -- pass the JS array/object directly (or wrap with `tx.json(...)` for postgres-js type compliance); pre-stringifying stores a JSONB string scalar (the legacy SQLite-era TEXT bug). Probe `F1.jsonb_columns_not_strings` is the regression gate; KTX adds per-handler probes per the Phase 7 validation work.
  - **Timestamps** are `TIMESTAMPTZ` columns with ISO 8601 string display. `extracted_at` is "most recent extraction for this row" -- overwritten on re-run.
  - **`source_ref` discipline** -- every row that can carry a `source_file` / `source_line` does, even when blame is best-effort. The diff pipeline and MCP tools both consult these.

  ## Table map at a glance

  | Group | Tables |
  |---|---|
  | Identity | `versions`, `entities` |
  | Per-type snapshots (engine, per-version arc) | `cvar_versions`, `command_versions`, `macro_versions`, `cmdline_param_versions`, `keyname_versions`, `hud_element_versions`, `ruleset_versions`, `token_primitive_versions`, `asset_category_versions`, `flag_bit_versions`, `cvar_alias_versions`, `protocol_message_versions`, `info_key_versions`, `log_template_versions`, `qc_builtin_versions`, `match_event_versions` |
  | Relations | `asset_extensions`, `asset_path_rules`, `asset_cvar_bindings`, `asset_loader_sites`, `release_notes` |
  | qw namespace (game content, no version arc) | `maps`, `gameplay_sources`, `gameplay_entity_defs`, `gameplay_mechanics` |
  | Change tracking | `change_events`, `relation_changes`, `source_overrides` |
  | Audit | `source_state_transitions`, `schema_migrations` |
  | Community (qwiki community-reference arc) | `community.players`, `community.clans`, `community.tournaments`, `community.player_clan_eras`, `community.tournament_results` |

  **Total: 37 L1 + community tables post-KTX onboarding (32 L1 engine including `match_event_versions` + 5 community).** Migration history is captured per file under `db/migrations/`; high-level chain via the `schema_migrations` table -- no monolithic version counter. The KTX onboarding arc landed three migrations (whichever filenames Phase 1 actually assigned -- see Open Questions for the slot-collision flag): a `log_template_versions.channel` widening adding `'logfile'`, an `entities.type` widening adding `'match_event'` plus the new `match_event_versions` table, and a gameplay-kinds widening adding `'monster'` to `gameplay_entity_defs.kind` and seven new values to `gameplay_mechanics.kind`. See per-section bodies below for shape details.
  ```

- [ ] Update the `log_template_versions` CHECK constraint documentation. Find the line (current line 598) inside the `log_template_versions` SQL block:
  ```
    channel                  TEXT NOT NULL CHECK (channel IN ('broadcast','client','console','system')),
  ```
  Replace with:
  ```
    channel                  TEXT NOT NULL CHECK (channel IN ('broadcast','client','console','system','logfile')),
  ```

  Then find the `channel` discriminator table (current lines 615-622) inside the same `log_template_versions` section and append the new `logfile` row at the bottom of that table:
  ```
  | `logfile` | Server-side logfile output via `log_printf` (`SV_Write_Log` / KTX `logs.c` channel). The channel KTX's extralog XML emissions ride; the format strings here include the multi-line XML wrapper shape that the dual-row design (D10 of the KTX onboarding arc) bridges to the `match_event_versions` table. |
  ```
  (Append as the 5th row of the discriminator table.)

- [ ] Update the `gameplay_entity_defs` kind documentation. Find the line (current line 493) in the v14 section:
  ```
  - **`gameplay_entity_defs`** - polymorphic table for game entities. `kind in (item, weapon, projectile)`. Indexable common columns (damage, splash_damage, splash_radius, refire_seconds, respawn_seconds, pickup_amount, max_carry, duration_seconds, classname). `props_json` carries kind-specific fields. `source_ref` is the file:line citation.
  ```
  Replace with:
  ```
  - **`gameplay_entity_defs`** - polymorphic table for game entities. `kind in (item, weapon, projectile, monster)` (the `monster` value added by the KTX onboarding arc's gameplay-kinds migration; KTX `bloodfest_monster_array[]` carries 13 rows under that kind). Indexable common columns (damage, splash_damage, splash_radius, refire_seconds, respawn_seconds, pickup_amount, max_carry, duration_seconds, classname). `props_json` carries kind-specific fields. `source_ref` is the file:line citation.
  ```

- [ ] Update the `gameplay_mechanics` kind documentation. Find the line (current line 495) in the v14 section:
  ```
  - **`gameplay_mechanics`** - polymorphic table for game rules. `kind in (constant, env_hazard, player_stat, powerup_behavior, armor_model, death_rule, spawn_rule, dm_mode_rule)`. Indexable common columns (value_numeric, value_text). Same source_ref discipline.
  ```
  Replace with:
  ```
  - **`gameplay_mechanics`** - polymorphic table for game rules. `kind in (constant, env_hazard, player_stat, powerup_behavior, armor_model, death_rule, spawn_rule, dm_mode_rule, game_mode, mode_default, election_type, score_system, drop_item, loc_macro, teamplay_message)` (the seven values from `game_mode` onward added by the KTX onboarding arc; `game_mode` carries 27 catalog rows + `mode_default` carries ~309 per-line overlays + `election_type` 5 + `score_system` 3 + `drop_item` 31 + `loc_macro` 15 + `teamplay_message` 21). Indexable common columns (value_numeric, value_text). Same source_ref discipline. `ruleset_gate_json` is load-bearing for KTX overlays per the arc's D8 single-key gate convention -- e.g. `{"mode":"bloodfest"}` for monster rows, `{"mode":"<token>"}` for per-mode overlays.
  ```

- [ ] Append a new section to SCHEMA.md after the existing "v17 (2026-04-28): log_template_versions gains all_call_sites_json" section and before "Related". The new section documents the KTX onboarding arc's three migrations + the new `match_event_versions` table. Insert EXACTLY the following block:

  ```markdown
  ---

  ## KTX onboarding arc (2026-05-04): three migrations + `match_event_versions` new table

  The KTX onboarding arc (canonical KTX 1.46 onboarded into Layer 1) ships three migration files plus one new entity type with its per-version table. All migrations are pure-additive at the value-set level (CHECK widenings via PostgreSQL `ALTER TABLE ... DROP CONSTRAINT ... + ADD CONSTRAINT ...`). No table rewrites required.

  Filename note: D5 of the arc decisions named the migrations `008_ktx_log_template_logfile_channel.sql` / `009_ktx_match_event_type.sql` / `010_ktx_gameplay_kinds.sql`. Phase 1 of the arc may have renumbered these at execution time if the QWiki community-reference arc had already taken slot 008 (which it did -- `008_community_schema.sql`). Refer to the live `db/migrations/` directory for the actual filenames; the schema deltas described below are stable regardless of slot assignment.

  ### Migration A: `log_template_versions.channel` widening (`+= 'logfile'`)

  The `log_template_versions.channel` CHECK widens from 4 values (`broadcast` / `client` / `console` / `system`) to 5 (`+= 'logfile'`). KTX's `log_printf` API at `src/logs.c` emits XML-shaped extralog payloads to a server-side logfile channel; pre-KTX engines did not surface this channel. Per F4 of the arc's review-findings: 28 raw `log_printf` call sites; format strings include both bare-text logs and the multi-line XML wrappers the dual-row design (D10) bridges to `match_event_versions`.

  ### Migration B: `entities.type` widening (`+= 'match_event'`) + new `match_event_versions` table

  Adds `'match_event'` as the 16th value of `entities.type`. New per-version table:

  ```sql
  CREATE TABLE IF NOT EXISTS match_event_versions (
    entity_id                 INTEGER NOT NULL REFERENCES entities(id),
    version                   TEXT NOT NULL,
    complex_type              TEXT NOT NULL,
    xsd_version               TEXT NOT NULL,
    attributes_json           JSONB NOT NULL,
    emission_call_sites_json  JSONB NOT NULL,
    raw_xsd_hash              TEXT,
    extracted_at              TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (entity_id, version)
  );
  CREATE INDEX IF NOT EXISTS idx_match_event_versions_complex_type
    ON match_event_versions(complex_type);
  CREATE INDEX IF NOT EXISTS idx_match_event_versions_xsd_version
    ON match_event_versions(xsd_version);
  ```

  Type-specific columns: `complex_type` (XSD complexType name -- one of `pick_mapitem`, `pick_backpack`, `drop_backpack`, `pick_powerup`, `drop_powerup`, `damage`, `death`); `xsd_version` (the XSD file's namespace version, e.g. `0.1` for `ktxlog_0.1.xsd`); `attributes_json` (per-event attribute schema -- attribute names + types per XSD); `emission_call_sites_json` (full list of `(source_file, source_line, containing_function)` triples where the engine emits this event type via `log_printf`).

  Per F14 of the arc's review-findings: 7 entity rows (one per XSD complexType) + 13 emission call sites mapped across `items.c` / `combat.c` / `client.c` / `logs.c`. Per-event attribute counts: `pick_mapitem=4`, backpack-events=7, `pick_powerup`/`drop_powerup`=4, `damage`=8, `death`=8.

  Indexes: `idx_match_event_versions_complex_type` (filter by event type) and `idx_match_event_versions_xsd_version` (filter across XSD revisions if KTX ships a `ktxlog_0.2.xsd` later).

  ### Migration C: `gameplay_*` kind widenings

  Two parallel widenings:

  - `gameplay_entity_defs.kind` adds `'monster'` (4th value: `item` / `weapon` / `projectile` / `monster`). KTX's `bloodfest_monster_array[]` at `src/sp_monsters.c:60-76` carries 13 rows.
  - `gameplay_mechanics.kind` adds 7 values (`game_mode` / `mode_default` / `election_type` / `score_system` / `drop_item` / `loc_macro` / `teamplay_message`). Per-kind row counts at canonical 1.46:
    - `game_mode`: 27 catalog rows (17 `um_list[]` peers + race + bloodfest + 8 mutators -- per arc D11 two-axis discriminator).
    - `mode_default`: ~309 per-line overlays (54 `common_um_init` baseline + ~255 per-mode initstring overlays -- per arc D12 per-line granularity).
    - `election_type`: 5 rows (skip `etNone` sentinel from the 6-value `electType_t` enum).
    - `score_system`: 3 rows (Win Only / Scaled / Formula1; positions array length=10 invariant).
    - `drop_item`: 31 rows from `commands.c:9075-9108`'s `dropitem_spawn_t` array (Pass 5.4 source-walk corrected from spec-time estimate of 30; F11 amendment).
    - `loc_macro`: 15 rows from `teamplay.c:1491-1508`.
    - `teamplay_message`: 21 rows from `teamplay.c:1645-1668`, with Pattern 9 banner-comment harvest of handler-function descriptions.

  Per-row gate convention (D8): `ruleset_gate_json = {"mode":"<token>"}` (single-key, user-facing token). Catalog rows themselves use `{}` (catalog rows DEFINE modes; they aren't gated by them).

  ### Migration shape

  All three migrations follow the canonical Postgres pattern:

  ```sql
  ALTER TABLE <table> DROP CONSTRAINT <table>_<column>_check;
  ALTER TABLE <table> ADD CONSTRAINT <table>_<column>_check
    CHECK (<column> IN (<full new value set>));
  ```

  Re-run idempotency: each `DROP CONSTRAINT` is wrapped in `IF EXISTS` so re-applying the migration on an already-widened DB is a no-op. The `match_event_versions` table CREATE uses `CREATE TABLE IF NOT EXISTS` to mirror the convention.

  ### Cross-arc downstream consumers

  - The `qw_event_log` parser (`/home/paradoks/projects/qw-event-log-handoff/`) becomes unblocked at the schema level: its WeaponType + obit-string -> cause taxonomies cross-validate against `match_event_versions` (per-event schema) + `log_template_versions` filtered to `channel='logfile'` (per-call-site format strings).
  - Layer 3 concept-note candidates (parked at `docs/superpowers/parking/2026-05-04-ktx-layer3-concept-note-candidates.md`) consume KTX's first-class entity rows + gameplay_mechanics catalog + match_event entity table for the game-modes index, matchlog format, and mutators notes.

  ### Spec / plan

  - Spec: `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` (five-pass arc-brainstormer).
  - Plan: `docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md` (9 phases).
  ```

**Verification:**
- `grep -inE "tree-?sitter|quakec" apps/qw-oracle/SCHEMA.md` returns zero matches (Phase 8's edits MUST NOT recurse the doctrine slip into SCHEMA.md).
- `grep -nE "data/knowledge\.db|better-sqlite3|SCHEMA_V[0-9_]*ADDITIONS_SQL|applySchema|migrateV[0-9]+ToV[0-9]+|schema_meta\\.schema_version" apps/qw-oracle/SCHEMA.md` -- the preamble (post-rewrite) must be free of these. Body matches inside per-table sections (lines 88, 386, 393, 420-428, 499, 509-765, 802) are EXPECTED to remain (HANDOVER's separate "SCHEMA.md doc-style inconsistency" sidequest covers the body refresh; Phase 8 is preamble + KTX-specific updates only). Verification narrows: `head -100 apps/qw-oracle/SCHEMA.md | grep -inE "data/knowledge\.db|better-sqlite3|SCHEMA_V[0-9_]*ADDITIONS_SQL|applySchema|migrateV[0-9]+ToV[0-9]+|schema_meta\\.schema_version"` -- the FIRST 100 lines (preamble + early conventions + table map) should return zero matches.
- `grep -n "log_template_versions.channel" apps/qw-oracle/SCHEMA.md` returns no SQL CHECK lines that show only 4 channel values; the canonical CHECK (line ~598 post-edit) shows 5 values including `'logfile'`.
- `grep -n "match_event_versions" apps/qw-oracle/SCHEMA.md` returns multiple matches in the new "KTX onboarding arc" section (CREATE TABLE block + index lines + table map row + total-count line).
- `grep -nE "kind in \\(item, weapon, projectile" apps/qw-oracle/SCHEMA.md` shows the gameplay_entity_defs.kind line includes `monster` (post-edit).
- `grep -nE "kind in \\(constant, env_hazard" apps/qw-oracle/SCHEMA.md` shows the gameplay_mechanics.kind line includes the 7 new values (post-edit).
- `grep -n "Total: " apps/qw-oracle/SCHEMA.md` returns the new total line ("37 L1 + community tables post-KTX onboarding").
- PASS condition: preamble cleansed of SQLite primitives; KTX deltas (channel / kinds / type / new table) all visible.
- FAIL condition: preamble retains SQLite-era language OR KTX deltas missing OR doctrine slip introduced in new content.

**Execution mode:** `inline` -- targeted markdown edits with full per-block before/after content shipped above; mechanical Edit + Write calls. The new "KTX onboarding arc" section is an Edit-based append (find the "## Related" line as anchor, insert the new section block before it).

### Task 4: Add four new sections to `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`

**Goal:** The KTX onboarding arc earned four cross-codebase port lessons that should land in the playbook for future engine ports. Per the spec preamble's Phase 8 obligation list + the "Findings the spec got right (commendations)" section in `review-findings.md`, four new sections land in EXTRACTOR-PLAYBOOK.md: Pre-Port Discovery Sweep, Pre-Commit Discovery Cross-Check, Handler-grouping rationale, Pattern 15 (STRING_LITERAL-array walker).

**Files:**
- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`

**Steps:**

- [ ] Insert a new section "Pre-Port Discovery Sweep" after the existing "Three-tier handler architecture" section (which ends just before "Registration pattern catalog" at current line ~149) and before "Registration pattern catalog". The position is deliberate: the sweep methodology informs the porting checklist (Section 0a "Is this a fork or a cross-codebase port?") and is conceptually adjacent to the cross-codebase-port section that the three-tier architecture established. Insert EXACTLY:

  ```markdown
  ---

  ## Pre-Port Discovery Sweep

  Before writing handler code for a new engine, run a three-leg discovery sweep to scope what exists, what overlaps existing engines, and what differs. The sweep is the brainstorm Pass-1 deliverable for any cross-codebase port; KTX onboarding (2026-05-04 arc, Pass 1 of the brainstorm) earned the methodology.

  Three legs:

  1. **Source registry leg.** Inventory the registration APIs in use (the standard `grep -rhEo 'Cvar_[A-Za-z]+'` / `Cmd_Add[A-Za-z]*` / etc. -- see "1. Inventory the registration APIs" in the porting checklist below). Map each API to one of the existing patterns (1-15) or surface a new pattern. Walk the major source files top-to-bottom, noting struct-array tables, enum declarations, X-macro files, XSD schemas, and other static-data shapes the engine carries. Output: a per-engine "what shapes do we see" inventory.

  2. **Committed-config leg.** If the engine ships example configs (`resources/example-configs/<engine>/`, `presets/`, `cfg/`), grep for cvar / command names referenced in those configs. Cross-check against the source registry leg's name set. Discrepancies fall into three categories: source-only (extracted, no config use -- expected for many cvars), config-only with naming-pattern match (Bucket 3 indexed-family like KTX `k_motd*` / `k_ml_*` -- sprintf-built at runtime; document in `OUT_OF_SCOPE.md`), config-only with no source match (truly orphaned drift; flag for upstream PR consideration). KTX's Pass 1.1 found: 119 unique k_* in configs, 100 source-overlap, 15 Bucket-3 family, 4 truly orphaned.

  3. **Runtime-evidence leg.** If the engine produces runtime output (`cvarlist` / `cmdlist` dumps from a live binary, telemetry logs, OR archived community dumps like Ciscon's MVDSV 1.20-dev cvarlist), use that as a third independent name source. Cross-check with legs 1 + 2. The runtime leg catches what static analysis misses (Bucket 2 dynamic registrations, sprintf-built names, runtime-synthesized HUD aliases). The cross-engine intersection also surfaces "this name appears in MVDSV runtime but not in our source-registry leg" findings -- usually a missed registration API or a preprocessor-guarded path.

  Treat the three-leg sweep as a sequencing prerequisite, not an optional first-week activity. Skipping Leg 2 invites Bucket-3 family cvars to ship as "first-class extraction failures" and burn cycles in Phase N+1 cleanup; skipping Leg 3 misses dynamically registered names and over-promises extractor coverage. The MVDSV onboarding (Phase 2e) and KTX onboarding (this arc) both ran the three-leg pattern explicitly.

  Output of the sweep is the input to "Section 0a -- Is this a fork or a cross-codebase port?" -- the inventory clarifies whether the new engine's API surface overlaps a parent project enough to fork, or whether the divergence demands a fresh port.
  ```

- [ ] Insert a new section "Pre-Commit Discovery Cross-Check" after the "Runtime validation playbook" section (which ends just before "Known limits" at current line ~552) and before "Known limits". The position is deliberate: the cross-check is post-extraction discipline that complements runtime validation -- they're paired methodologies. Insert EXACTLY:

  ```markdown
  ---

  ## Pre-Commit Discovery Cross-Check

  After extraction has converged but before committing the new engine's first ship, run a wiki-versus-source cross-check on any candidate roster the brainstorm produced. The cross-check methodology is the KTX onboarding arc's Pass 5.4 deliverable -- the discipline that caught Pass-4 sketch errors and discriminated the "candidate mutator" set down to the right shipping inventory.

  Procedure:

  1. **Gather candidate inventory.** From the brainstorm, list every name-shape candidate (mutators, modes, taxonomies, struct-array entries) the design pass nominated. Format: `<token> | <source-claim> | <wiki-claim>`. Source-claim cells come from the source-registry leg of the Pre-Port Discovery Sweep; wiki-claim cells come from the community wiki rip (QWiki, ezQuake docs, MVDSV manual, etc. -- whatever the engine's contributor community maintains).

  2. **Source-walk each candidate.** Open the source file the candidate names. Confirm: registration site present, struct-array entry present, value-set entry present -- whatever the candidate's shape requires. Note count. Note field names. Note adjacent context (#ifdef guards, conditional compilation paths, deprecation comments).

  3. **Wiki-walk each candidate.** Open the wiki page or canonical community reference. Confirm: name spelling matches, semantic description matches, gating conditions match. Note any wiki-only attributes that don't appear in source (often Layer 3 candidates -- player-facing labels, community nicknames).

  4. **Discriminate.** For each candidate, classify:
     - **Promote** (both legs agree; ship as a Layer 1 row): the canonical case.
     - **Demote** (source absence; wiki claims a name with no registration site): document in `OUT_OF_SCOPE.md` with the wiki citation, OR park as a future-arc candidate, OR flag as upstream wiki drift.
     - **Defer** (semantic ambiguity; source shape unclear without operator decision): surface to operator, do NOT ship until resolved.
     - **Reframe** (both legs disagree on facet, e.g., source has a struct field named `count_modifier` but Pass-4 sketch wrote `armor_for_kill` and live source actually carries `hp_for_kill` -- the two-amendment KTX case): land an amendment to the relevant `review-findings.md` anchor with the source-faithful name, then ship.

  KTX's Pass 5.4 ran the cross-check on 4 mutator candidates discovered via the wiki rip vs. the source registry leg's list. Discrimination outcome: 1 promotion (`berzerk`), 3 demotions to `OUT_OF_SCOPE.md` (none of the other 3 had source registration). Without the cross-check, 3 spurious mutator rows would have shipped as "first-class entities" backed by no source registration -- silent data quality regression.

  Cross-validation oracles by engine:
  - **ezQuake**: ezquake.com/docs guide pages + `help_*.json` files in repo + community Discord history.
  - **MVDSV**: Ciscon's MVDSV 1.20-dev cvarlist dump (archived) + the MVDSV manual page on QWiki.
  - **FTE**: FTE wiki + `console.cfg` defaults + plugin-side configs.
  - **QWCL**: 1996-vintage Quake reference materials + `progs.dat` documentation.
  - **KTX**: QWiki `Server_modifications#KTX` page + the `resources/example-configs/ktx/` checked-in configs + community match logs.

  Treat the cross-check as a phase-boundary verification step, not an optional polish pass. The discrimination it forces (Promote / Demote / Defer / Reframe) is the same discipline the F-anchor amendment system in `review-findings.md` enforces during phase drafting -- both exist to catch the gap between sketch and source before shipping.
  ```

- [ ] Insert a new section "Handler-grouping rationale" after the existing "Three-tier handler architecture" section but before the new "Pre-Port Discovery Sweep" section just inserted. The position groups the two architectural-shape sections (three-tier + handler-grouping) before the methodology sections (discovery sweep + cross-check). Insert EXACTLY:

  ```markdown
  ---

  ## Handler-grouping rationale

  When a new engine introduces multiple new entity types or sub-types, the question "should this be one mega-handler, one handler per type, or some grouping in between?" surfaces. The KTX onboarding arc's Pass 5.3 explored three options and locked the rule: **group handlers by walking strategy, not by source file or row kind**.

  The rule states: two row kinds that share a libclang traversal pattern belong in the same handler; two row kinds that live in the same source file but use different walkers do NOT belong together. The walking strategy IS the handler's identity.

  Worked example from KTX (per arc decisions D6):

  | Handler | Output filename | Row kinds emitted | Walking strategy |
  |---|---|---|---|
  | `_handler_modes.py` | `ktx-modes-ast.json` | `game_mode` (catalog) + `mode_default` (overlays) | STRING_LITERAL-array walker on `const char[]` initstring declarations in `commands.c` (uses extended Pattern 6) |
  | `_handler_gameplay_taxonomies.py` | `ktx-gameplay-taxonomies-ast.json` | `election_type` + `death_rule` | Enum-decl walker (Pattern 10) on `electType_t` (`progs.h`) and `deathType_t` X-macro (`deathtype.h`) |
  | `_handler_gameplay_tables.py` | `ktx-gameplay-tables-ast.json` | `monster` + `score_system` + `drop_item` + `loc_macro` + `teamplay_message` | INIT_LIST_EXPR walker (Pattern 4) on struct-array literals + Pattern 9 banner-comment harvest for teamplay_message handler-function descriptions |
  | `_handler_match_events.py` | `ktx-match-events-ast.json` | `match_event` | XSD parse (Python `xml.etree.ElementTree`) + emission-site grep (NOT a libclang handler) |

  Three options were tested at brainstorm time:
  - **Option A: one mega-handler.** All KTX gameplay content in one Python file, internally branched on type. Rejected: the file size (10+ kinds, 5+ source files, 4+ walking strategies) would crowd the handler past the readability point; per-row-kind unit testing becomes harder.
  - **Option B: one handler per row kind.** 10 separate handler files, one per kind. Rejected: handlers that share a walker (e.g., the four struct-array-init kinds in `_handler_gameplay_tables.py`) would duplicate dispatch logic; per-kind output filenames balloon the load-knowledge dispatch table; the per-handler unit-of-work becomes too small to be coherent.
  - **Option C: group by walking strategy.** Per-handler unit-of-work clear, source-file scope per handler small, slicing trivial, pattern documentation reusable. SHIPPED.

  Why this matters for future engine ports: the Option C grouping makes phase-MD slicing for cross-codebase ports trivial -- one phase per handler-strategy class. The KTX onboarding arc sliced its gameplay-content phases (3 / 4 / 5 / 6) along exactly this axis. Future ports should look for the same grouping signal: "what walking strategies does this engine demand?" answers "how should the handler files split?"

  Cross-references:
  - Walker-strategy pattern catalog: see "Registration pattern catalog" below for Patterns 4, 6, 9, 10, 15 -- the four walker shapes the KTX handlers used.
  - Tier 3 placement convention: per the three-tier handler architecture, all four KTX handlers live as project-private files under `<project>/_handler_*.py`. The XSD-driven `_handler_match_events.py` is the lone carve-out from D3's "inherit from Visitor" rule -- standalone with duck-typed lifecycle stubs since XSD parsing is not libclang traversal.
  ```

- [ ] Insert "Pattern 15 -- STRING_LITERAL-array walker" at the end of the Registration pattern catalog (after Pattern 14, current line ~387). Insert EXACTLY:

  ```markdown
  ### Pattern 15 -- STRING_LITERAL-array walker for engine-named initstring tables

  **Source example:**
  ```c
  // KTX commands.c:4156 (inside common_um_init):
  static char common_um_init[] =
      "k_yawnmode 0\n"
      "k_freshteams 0\n"
      "k_lgcmode 0\n"
      "k_killquad 0\n"
      // ... ~50 more lines, each a literal "<cvar_name> <value>\n" tuple
  ;

  // KTX commands.c (per-mode initstrings):
  static char _2on2_um_init[] =
      "k_clan 1\n"
      "deathmatch 3\n"
      "timelimit 10\n"
      // ... ~15 more lines per mode
  ;
  ```

  **Detection:** `VAR_DECL` whose type is `char[]` (with optional `const` / `static` qualifiers) and whose initializer is a single `STRING_LITERAL` cursor (libclang collapses the adjacent C string-literal concatenation into one cursor). The literal's text body is a multi-line newline-delimited tuple stream: each line is `<token> <value>` -- the engine's own "compact config-line list" shape.

  **Handler walker:**
  1. On a `VAR_DECL` whose name matches the per-mode-initstring pattern (`<token>_um_init`, `common_um_init`, `race_settings`, etc.), pull the `STRING_LITERAL` child cursor.
  2. Read the literal's source text via `_read_extent` + `_unescape_c_string` (the standard cvar-handler convenience helpers).
  3. Split on `\n`. For each non-empty line, split on first whitespace into `<token> <value>`. Emit one `mode_default` row per line.
  4. Trailing-comment harvest: each line MAY have a trailing `// ...` comment that documents the cvar-set's intent. Capture as `props_json.comment` for the row.
  5. Macro-prefixed lines: a few lines start with an identifier rather than a literal cvar name (e.g., `LGCMODE_VARIABLE " 0\n"` in KTX `common_um_init`). Resolve the identifier via the handler's `_file_macros` cache (Pattern 6, extended to depth-1 #include closure per the KTX onboarding arc's D4 lift). After resolution, the macro substitutes for the cvar name; emit the row as if the literal name had been written directly.

  **KTX usage (per arc D6):** `_handler_modes.py` walks `common_um_init` (54 baseline rows), the 17 per-mode `<token>_um_init` arrays (~255 overlay rows total), and the `race_settings` initstring. Total: ~309 `mode_default` rows.

  **Add a new initstring array name:** add the array's identifier to the handler's known-array set; the walker handles it without further code changes. Keep the array's `apply_order` (1=baseline, 2=overlay) declared per-array to preserve the apply-order semantics in `props_json`.

  **Why this is its own pattern (not a reuse of Pattern 4):** Pattern 4 walks `INIT_LIST_EXPR` for struct-literal arrays; the entries are typed C structs with field-by-field semantics. Pattern 15 walks a single `STRING_LITERAL` whose body IS the data -- one literal expanded into N rows by string parsing. The cursor kind, the unit-of-work-per-cursor, and the parsing approach all differ. Documenting them separately keeps the pattern catalog precise.

  **Cross-engine outlook:** any engine that uses "compact config-line list" string literals as a config-init mechanism is a Pattern 15 candidate. Common in older C codebases that predate per-cvar registration APIs. KTX is the first surfaced consumer; future engines (especially older Q1-era forks) may surface more.
  ```

**Verification:**
- `grep -c "^## Pre-Port Discovery Sweep" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` returns `1`.
- `grep -c "^## Pre-Commit Discovery Cross-Check" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` returns `1`.
- `grep -c "^## Handler-grouping rationale" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` returns `1`.
- `grep -c "^### Pattern 15 " apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` returns `1`.
- `grep -inE "tree-?sitter|quakec" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` returns matches only in dusty-ktx-context lines (the Phase 0 baseline must hold; new sections must NOT recurse the doctrine slip).
- PASS condition: 4 new sections present, no doctrine slip introduced.
- FAIL condition: any section missing OR doctrine slip in new content.

**Execution mode:** `inline` -- markdown insertions; full content for each new section shipped above; mechanical Edit calls (find anchor line, insert before it).

### Task 5: Amend Pattern 10 entry for ENUM_DECL widening (Phase 4 carry-forward)

**Goal:** Phase 4's drafter open-question explicitly defers the Pattern 10 widening to Phase 8 (per phase-4-taxonomies-handler.md "Open questions"). Current PLAYBOOK Pattern 10 scopes to `MACRO_DEFINITION`; Phase 4's `_handler_gameplay_taxonomies.py` reuses the same TU-root cursor-intercept mechanic on `CursorKind.ENUM_DECL` (electType_t walker). Amend the Pattern 10 entry inline so future engines see the widened applicability.

**Files:**
- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`

**Steps:**

- [ ] Find the Pattern 10 entry (current line 304):
  ```
  ### Pattern 10 -- TU-root cursor intercept for MACRO_DEFINITION

  **Source example:**
  ```c
  // in src/qwprot/src/protocol.h:
  #define svc_print           8
  #define svc_centerprint     26
  #define FTE_PEXT_HLBSP      0x00000001
  ```

  **Detection:** by default `walk_tu_dispatch` filters cursors whose `location.file != target_path_str` to keep handlers focused on the current TU. But `MACRO_DEFINITION` cursors hang off the TU root and live in headers, not the TU's .c file. To extract `#define` constants, intercept the TU root cursor specifically and do a one-shot `cursor.get_children()` scan for `CursorKind.MACRO_DEFINITION` cursors, including those whose `location.file` points to allowed header paths (e.g. `src/qwprot/src/protocol.h`).

  **Handler:** MVDSV `_handler_protocol_messages.py`. Header-bytes caching ensures trailing-comment harvest from headers different than the current TU root file works without re-reading.

  **When you need this:** entity types whose source representation is a `#define` constant rather than a function call. Protocol messages, packet flags, info_key constants, anything where the literal value is the entity.
  ```
  Replace with:
  ```
  ### Pattern 10 -- TU-root cursor intercept for header-defined declarations (MACRO_DEFINITION + ENUM_DECL)

  **Source examples:**
  ```c
  // in src/qwprot/src/protocol.h (MACRO_DEFINITION):
  #define svc_print           8
  #define svc_centerprint     26
  #define FTE_PEXT_HLBSP      0x00000001

  // in include/g_local.h (ENUM_DECL):
  typedef enum {
      etNone = 0,
      etCaptain,
      etCoach,
      etAdmin,
      etSuggestColor,
      etLateJoin,
  } electType_t;
  ```

  **Detection:** by default `walk_tu_dispatch` filters cursors whose `location.file != target_path_str` to keep handlers focused on the current TU. But `MACRO_DEFINITION` and `ENUM_DECL` cursors hang off the TU root and live in headers, not the TU's .c file. To extract them, intercept the TU root cursor specifically and do a one-shot `cursor.get_children()` scan for the desired cursor kinds, including those whose `location.file` points to allowed header paths (e.g. `src/qwprot/src/protocol.h`, `include/g_local.h`).

  **Handlers:**
  - MVDSV `_handler_protocol_messages.py` -- `MACRO_DEFINITION` walker for protocol byte constants.
  - KTX `_handler_gameplay_taxonomies.py` -- `ENUM_DECL` walker for `electType_t` (Stage 1; emits 5 `election_type` rows after skipping the `etNone` sentinel).

  Header-bytes caching ensures trailing-comment harvest from headers different than the current TU root file works without re-reading.

  **When you need this:** entity types whose source representation is a header-defined declaration rather than a function call. Protocol messages, packet flags, info_key constants, election-type enums, taxonomic-enum tables -- anything where the literal value or enumerated identifier IS the entity.

  **Widening note (Phase 4 carry-forward of the KTX onboarding arc):** the original Pattern 10 was scoped to `MACRO_DEFINITION` only (MVDSV protocol_message handler). Phase 4 of the KTX onboarding arc reused the same TU-root intercept mechanic on `CursorKind.ENUM_DECL`. The same handler-private intercept code reuses cleanly across both cursor kinds; the widening is a one-line `if cursor.kind in (CursorKind.MACRO_DEFINITION, CursorKind.ENUM_DECL):` guard, not a separate handler. Future ports that need `STRUCT_DECL` or `TYPEDEF_DECL` from headers can extend the same guard further.
  ```

**Verification:**
- `grep -n "Pattern 10" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` shows the title line includes "header-defined declarations (MACRO_DEFINITION + ENUM_DECL)".
- `grep -nE "ENUM_DECL.*electType_t|electType_t.*ENUM_DECL" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` returns at least one match in the Pattern 10 section.
- PASS condition: title widened, electType_t example present.
- FAIL condition: title still says "MACRO_DEFINITION only" OR no ENUM_DECL example.

**Execution mode:** `inline` -- single-section before/after replacement; mechanical Edit call.

### Task 6: Add Pattern 16 -- X-macro file parse (Phase 4 carry-forward)

**Goal:** Phase 4's drafter open-question explicitly defers a new Pattern 16 entry to Phase 8 documenting the X-macro file parse technique. Current PLAYBOOK pattern catalog stops at Pattern 14; Phase 4's deathtype.h walker introduces a wholly separate technique (X-macro file parse via Python file reading + regex, NOT libclang).

**Files:**
- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`

**Steps:**

- [ ] Insert "Pattern 16 -- X-macro file parse" at the end of the Registration pattern catalog (after the Pattern 15 entry inserted in Task 4). Insert EXACTLY:

  ```markdown
  ### Pattern 16 -- X-macro file parse for declaration tables whose user-facing tokens are erased by preprocessor expansion

  **Source example:**
  ```c
  // in include/deathtype.h:
  // X-macro file: each DEATHTYPE_X invocation declares one death-type entry.
  // The X-macro is expanded by the consumer with its own DEATHTYPE_X definition.
  DEATHTYPE_X(dtNONE,           "<none>",           "structural",   IDENTITY,    NULL)
  DEATHTYPE_X(dtUNKNOWN,        "<unknown>",        "structural",   IDENTITY,    NULL)
  DEATHTYPE_X(dtSHOTGUN,        "shotgun",          "weapon",       IDENTITY,    "shotgun")
  DEATHTYPE_X(dtSUPER_SHOTGUN,  "super shotgun",    "weapon",       IDENTITY,    "super_shotgun")
  // ... 25 more entries
  ```

  **Trigger:** the file is structured as `X(...)` lines where `X` is a placeholder macro the consumer redefines per use case. libclang sees only the X-macro consumer's expansion -- the consumer-side `#define DEATHTYPE_X(...) ...` controls what the lines turn into. The user-facing tokens (`dtSHOTGUN`, `"shotgun"`, etc.) live ONLY in the source file; libclang's AST sees the consumer's expansion (a function table, an enum, a switch, etc.), not the original tokens.

  **Detection:** the X-macro file pattern is identifiable by:
  - Filename convention (`*type.h`, `*kinds.h`, `*-list.h` with all `X(...)` lines).
  - Body contains repeated `IDENTIFIER(args, ...)` lines where IDENTIFIER is consistent.
  - Comments often note "X-macro file" or "expanded by consumer."

  **Handler approach:** SKIP libclang for these files. Read the file's bytes directly via `Path.read_text()`, line-iterate, regex-match the X-macro line shape (`re.compile(r'^\s*' + re.escape(MACRO_NAME) + r'\s*\(([^)]+)\)\s*$', re.MULTILINE)`), and parse the comma-separated arguments per row.

  **Handler:** KTX `_handler_gameplay_taxonomies.py::_parse_deathtype_h()` -- Stage 2 of the taxonomies handler. Reads `include/deathtype.h`, regex-matches the 29 `DEATHTYPE_X(...)` lines, skips the `dtNONE` and `dtUNKNOWN` sentinels, emits 27 `death_rule` rows.

  **Why this is its own pattern (not a reuse of Pattern 10):** Pattern 10 intercepts `MACRO_DEFINITION` / `ENUM_DECL` cursors via libclang TU-root walk. X-macro files don't expose the per-line tokens to libclang AT ALL -- the tokens are erased by preprocessor expansion. The only way to recover them is to read the source file bytes directly. The cursor-walk machinery doesn't apply.

  **When you need this:** any engine that uses X-macro files as a static-data registration mechanism. Common in C codebases for enumerable taxonomies (death types, weapon types, network protocol opcodes, etc.) where the consumer wants to enumerate the values multiple times in different ways without duplicating the canonical list.

  **Cross-engine outlook:** KTX is the first surfaced consumer in the Layer 1 lineup. Future engines (especially older Q1-era forks that lean on X-macros for taxonomy declarations) may surface more. The handler approach is engine-agnostic: read file, regex-match, parse. No libclang involvement.

  **Caveat:** the X-macro file pattern means the per-line `source_file` / `source_line` citation IS the X-macro file itself, not the consumer expansion site. That's correct -- the canonical source of truth for "where is this death-rule defined?" is the X-macro file. Consumer expansion sites are infrastructure (a switch statement that dispatches on the death-type, an obit-string lookup table, etc.); they're rendering, not data.
  ```

**Verification:**
- `grep -c "^### Pattern 16 " apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` returns `1`.
- `grep -nE "deathtype\\.h|DEATHTYPE_X" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` returns matches inside the Pattern 16 section.
- PASS condition: Pattern 16 present with deathtype.h example.
- FAIL condition: Pattern 16 missing OR no example.

**Execution mode:** `inline` -- markdown insertion; full new-section content shipped above; mechanical Edit call.

### Task 7: Add "Dual-row design" note for log_template + match_event (D10 / F17)

**Goal:** Per D10 of the arc decisions + F17 of review-findings, Phase 8 lands an EXTRACTOR-PLAYBOOK note documenting the dual-row design so future maintainers don't try to "deduplicate" the log_template_versions vs match_event_versions rows that share emission sites.

**Files:**
- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`

**Steps:**

- [ ] Insert a new note section "Dual-row design: log_template + match_event" at the end of the Registration pattern catalog (after the Pattern 16 entry inserted in Task 6). The position groups all the cross-handler design notes after the per-pattern entries. Insert EXACTLY:

  ```markdown
  ---

  ### Dual-row design: log_template + match_event (D10 / F17 of the KTX onboarding arc)

  Some emission sites populate TWO entity-type rows by design, capturing complementary facets. KTX's `log_printf` XML-shaped emissions are the canonical case: each emission populates BOTH a `log_template_versions` row (via the Pass-1 printf-handler under `_handler_log_templates.py`, channel='logfile') AND a `match_event_versions` row (via the XSD-driven `_handler_match_events.py`, complex_type from the XSD).

  - `log_template_versions` captures **per-call-site truth**: the verbatim format string passed to the print call, the file/line citation, the channel discriminator. One row per registration site.
  - `match_event_versions` captures **per-event-type truth**: the XSD-defined attribute schema, the XSD version, the rolled-up list of every emission call site for this event type. One row per XSD complexType.

  KTX's 13 XML-shaped `log_printf` call sites map to 13 `log_template_versions` rows + 7 `match_event_versions` rows (per F14: 6 pick_mapitem + 1 each for pick_powerup / drop_powerup / pick_backpack / drop_backpack + 2 damage + 1 death). The duplication is intentional.

  **Do NOT deduplicate.** A future maintainer reading the dual rows is likely to think "this looks redundant" and try to add a filter to `_handler_log_templates.py` that skips XML-shaped log_printf calls. That would lose the per-call-site format string truth. The duplicate IS the design.

  **When this pattern recurs:** any engine where one emission site has both per-call-site provenance (file/line/format) AND per-type schema (XSD, JSON Schema, protobuf message). The dual-row design preserves both facets without forcing one consumer to walk into the other.

  **Cross-reference:** decisions.md D10 of the KTX onboarding arc (`docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md`) carries the lock + rationale; F17 of the same arc's review-findings carries the audit trail.
  ```

**Verification:**
- `grep -c "^### Dual-row design" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` returns `1`.
- `grep -nE "Do NOT deduplicate|D10.*log_template" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` returns matches inside the new note section.
- PASS condition: Dual-row design note present with the deduplication warning.
- FAIL condition: note missing OR warning text missing.

**Execution mode:** `inline` -- markdown insertion; full content shipped above; mechanical Edit call.

### Task 8: Verify Phase 0 doctrine fixes survived (F19 + F22 -- 5 reference sites)

**Goal:** Run the broad doctrine-fix-survival probe across all 5 reference sites Phase 0 patched. The probe must show zero canonical-KTX-attributed tree-sitter / QuakeC slips.

**Files:** No edits. Probe-only.

**Steps:**

- [ ] Run the in-repo doctrine probe:
  ```bash
  grep -inE "tree-?sitter|quakec" \
    apps/qw-oracle/OVERVIEW.md \
    apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md \
    apps/qw-oracle/scripts/extractors/CLAUDE.md \
    apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
  ```
  Expected: zero matches OR every match references dusty-ktx in context.

- [ ] Run the user-memory doctrine probe (the 5th reference site, outside the project tree per F19):
  ```bash
  grep -inE "tree-?sitter|quakec" \
    /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_extraction_pipeline_vision.md
  ```
  Expected: zero matches OR every match references dusty-ktx in context.

- [ ] If any probe surfaces a canonical-KTX attribution (tree-sitter or QuakeC associated with canonical KTX rather than dusty-ktx), halt as DONE_WITH_CONCERNS. The doctrine fix has regressed; an inter-arc edit (likely a doc-system-redesign session, a CLAUDE.md cleanup, or an unrelated arc) reverted Phase 0's fix. Surface to operator before completing Phase 8.

**Verification:**
- PASS condition: both probes return zero canonical-KTX-attributed matches.
- FAIL condition: any probe returns a canonical-KTX-attributed match.

**Execution mode:** `inline` -- pure grep probes; no edits; mechanical Bash calls.

### Task 9: Verify no doc created during the arc recursed the doctrine slip

**Goal:** Phase 8's broader survival check covers not just F19 + F22's original 5 sites but also the KTX-arc-created docs that DID NOT exist when Phase 0 ran. Specifically: the Phase 0-7 MDs themselves, the new `apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md`, the appended-to PLAYBOOK / SCHEMA / OVERVIEW / README, the new KTX section in VALIDATION-RUNBOOK.md (Phase 7), and any phase-private doc Phase 7 might have shipped (e.g., per-engine validation report, audit notes).

**Files:** No edits. Probe-only.

**Steps:**

- [ ] Run a recursive doctrine probe across the entire arc-touched surface:
  ```bash
  grep -rnE "tree-?sitter|tree_sitter|quakec" \
    apps/qw-oracle/scripts/extractors/ktx/ \
    apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md \
    apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md \
    apps/qw-oracle/scripts/extractors/CLAUDE.md \
    apps/qw-oracle/SCHEMA.md \
    apps/qw-oracle/OVERVIEW.md \
    apps/qw-oracle/README.md \
    docs/superpowers/plans/2026-05-04-ktx-onboarding/ \
    docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md
  ```
  Expected: every match is in one of:
  - F19 evidence section in `review-findings.md` (correct context: documents the doctrine slip + Phase 0's fix).
  - F22 evidence section in `review-findings.md` (correct context: same as F19, 5th site).
  - Phase 0 MD's task descriptions (correct context: documents the Phase 0 surgery, before/after blocks).
  - D2 of decisions.md (correct context: locks "KTX is libclang, not tree-sitter").
  - Spec preamble's "Doctrine fixes deferred to end-of-arc" block (correct context: enumerates Phase 8's full obligation set).
  - Sections in EXTRACTOR-PLAYBOOK.md / VALIDATION-RUNBOOK.md that explicitly reference dusty-ktx (correct context: dusty-ktx fork is QuakeC + tree-sitter, that's true).
  - The Phase 4 / Phase 6 amendment text in `review-findings.md` if it references tree-sitter as part of carrying forward Phase 0 + Phase 4 / 6 source-walks (acceptable).

  Any match that attributes tree-sitter or QuakeC to canonical KTX (not dusty-ktx, not the spec/decision/finding documentation) is a regression -- Phase 8 must surface it.

- [ ] Eyeball the full grep output. If unsure whether a match is in correct dusty-ktx context, follow the line back to its source file and judge: "is this paragraph saying canonical KTX uses tree-sitter / QuakeC?" If yes -> FAIL. If it's saying "dusty-ktx fork uses tree-sitter / QuakeC" or "Phase 0 fixed the doctrine slip" -> PASS.

- [ ] Special check: search the spec / plan / phase MDs for any sentence that says "KTX uses tree-sitter" (without dusty-ktx qualifier):
  ```bash
  grep -rinE "ktx.*(uses|is|will use|onboarding via).*tree-?sitter" \
    docs/superpowers/plans/2026-05-04-ktx-onboarding/ \
    docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md \
    apps/qw-oracle/
  ```
  Expected: zero matches that bind canonical KTX to tree-sitter. Matches binding dusty-ktx-fork to tree-sitter are correct.

**Verification:**
- PASS condition: every grep match is in a correct context (F19/F22 evidence, Phase 0 surgery description, D2 decision, spec preamble enumeration, dusty-ktx attribution).
- FAIL condition: any match attributes tree-sitter / QuakeC to canonical KTX outside the documented contexts.

**Execution mode:** `inline` -- grep probes + manual eyeball; no edits.

### Task 10: Single commit landing all Phase 8 changes

**Goal:** Commit Phase 8 as one coherent unit per D16 (phase atomicity).

**Files:** all the above (modifications to README.md, OVERVIEW.md, SCHEMA.md, EXTRACTOR-PLAYBOOK.md).

**Steps:**

- [ ] `git add apps/qw-oracle/README.md apps/qw-oracle/OVERVIEW.md apps/qw-oracle/SCHEMA.md apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-8-end-of-arc-docs.md`
- [ ] `git commit` with message:
  ```
  arc(ktx): Phase 8 -- end-of-arc docs sweep + EXTRACTOR-PLAYBOOK additions

  Slim-doc cohort sweep absorbing the HANDOVER backlog item:
  - apps/qw-oracle/README.md: SQLite preamble -> Postgres; IRC-included Layer 2 ->
    Discord-only (D9-revised); tool count 10 -> 12; runtime Node 20+ -> Bun-only;
    tree-sitter slip -> libclang (KTX is the 5th codebase loaded).
  - apps/qw-oracle/OVERVIEW.md: Code landmarks SQLite paths -> db/migrations/ +
    db/migrate.ts; Produces section knowledge.db/qw.db -> Postgres rows; Layer 1
    KTX inventory row "not started" -> shipped.
  - apps/qw-oracle/SCHEMA.md: preamble Postgres rewrite + log_template_versions
    .channel CHECK widening to include 'logfile'; gameplay_entity_defs.kind +=
    'monster'; gameplay_mechanics.kind += 7 KTX values; new "KTX onboarding arc"
    section documenting migrations + match_event_versions table.

  EXTRACTOR-PLAYBOOK.md additions per Phase 8 obligation list:
  - Pre-Port Discovery Sweep (3-leg sweep methodology, KTX Pass 1).
  - Pre-Commit Discovery Cross-Check (wiki-vs-source discrimination, KTX Pass 5.4).
  - Handler-grouping rationale (group by walking strategy, KTX Pass 5.3 / D6).
  - Pattern 15: STRING_LITERAL-array walker for engine-named initstring tables.
  - Pattern 10 widening: ENUM_DECL added to MACRO_DEFINITION (Phase 4 carry-forward).
  - Pattern 16: X-macro file parse (Phase 4 carry-forward, deathtype.h example).
  - Dual-row design note for log_template + match_event (D10 / F17).

  Doctrine fix survival verified across 5 reference sites (F19 + F22) plus
  arc-touched surface; no recursion of the wrong tree-sitter claim into docs
  added during the arc.

  Resolves: F17, F19 (survival), F20 (HANDOVER absorbed), F22 (survival).
  Closes: KTX Layer 1 Onboarding arc.
  ```
- [ ] (No push to origin in Phase 8 itself; push at session-wrap or per the project's git workflow.)

**Verification:**
- `git log -1 --oneline` shows the new commit.
- `git status` is clean (working tree matches HEAD).
- PASS condition: clean commit, no uncommitted residuals.
- FAIL condition: working tree shows uncommitted changes after the commit.

**Execution mode:** `inline` -- mechanical git operations.

## Verification (phase boundary)

Operator runs the full sweep at the end of Phase 8. All probes return YES/NO answers:

**1. README.md is post-Postgres + post-KTX clean.**

```bash
grep -iE "tree-?sitter|quakec|data/knowledge\.db|data/qw\.db|better-sqlite3|FTS5|Schema v18|Ten tools|Nine notes|Node 20\+ / Bun" apps/qw-oracle/README.md
```
- PASS condition: zero matches.
- FAIL condition: any match.

**2. OVERVIEW.md Code landmarks + Produces are Postgres-correct.**

```bash
grep -inE "schema\\.ts.*new \\*_versions|SCHEMA_V[0-9_]*ADDITIONS_SQL|applySchema|migrateV[0-9]+ToV[0-9]+" apps/qw-oracle/OVERVIEW.md
```
- PASS condition: zero matches (Code landmarks no longer routes through SQLite recipe).
- FAIL condition: any match.

```bash
awk '/^\*\*Produces:\*\*/,/^\*\*Consumed by:\*\*/' apps/qw-oracle/OVERVIEW.md | grep -E "data/knowledge\\.db|data/qw\\.db" | grep -v "ended with Arc 1"
```
- PASS condition: zero matches (Produces section's authoritative-store reference is Postgres; SQLite filenames appear only inside the explicit "ended with Arc 1" attestation).
- FAIL condition: any non-attestation match.

**3. SCHEMA.md preamble is Postgres-correct.**

```bash
head -100 apps/qw-oracle/SCHEMA.md | grep -inE "data/knowledge\\.db|better-sqlite3|SCHEMA_V[0-9_]*ADDITIONS_SQL|applySchema|migrateV[0-9]+ToV[0-9]+|schema_meta\\.schema_version|^- \\*\\*SQLite\\*\\*"
```
- PASS condition: zero matches in the first 100 lines (preamble + early conventions + table map).
- FAIL condition: any match in the preamble. Body matches deeper in the file are EXPECTED (per HANDOVER's separate "SCHEMA.md doc-style inconsistency" sidequest -- not Phase 8 scope).

**4. SCHEMA.md log_template_versions.channel CHECK widened.**

```bash
grep -nE "log_template_versions|channel.*broadcast.*client.*console.*system" apps/qw-oracle/SCHEMA.md | grep -E "logfile"
```
- PASS condition: at least one match (the canonical CHECK line shows 5 channels including 'logfile').
- FAIL condition: zero matches (CHECK still shows 4 channels).

**5. SCHEMA.md gameplay kind widenings present.**

```bash
grep -nE "kind in \\(item, weapon, projectile, monster\\)" apps/qw-oracle/SCHEMA.md
grep -nE "game_mode.*mode_default.*election_type.*score_system.*drop_item.*loc_macro.*teamplay_message" apps/qw-oracle/SCHEMA.md
```
- PASS condition: both probes return at least one match.
- FAIL condition: either probe returns zero.

**6. SCHEMA.md `match_event_versions` table documented.**

```bash
grep -nc "match_event_versions" apps/qw-oracle/SCHEMA.md
```
- PASS condition: returns >= 4 (table-map row + total-count line + CREATE TABLE block + index lines + body references).
- FAIL condition: returns 0 or 1.

**7. EXTRACTOR-PLAYBOOK.md has the 4 new sections + Pattern 15 + Pattern 16 + Dual-row note.**

```bash
grep -cE "^## Pre-Port Discovery Sweep|^## Pre-Commit Discovery Cross-Check|^## Handler-grouping rationale|^### Pattern 15 |^### Pattern 16 |^### Dual-row design" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
```
- PASS condition: returns 6.
- FAIL condition: returns < 6.

**8. EXTRACTOR-PLAYBOOK.md Pattern 10 entry widened for ENUM_DECL.**

```bash
grep -nE "Pattern 10.*MACRO_DEFINITION \\+ ENUM_DECL|Pattern 10.*header-defined declarations" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
```
- PASS condition: at least one match (the title widening).
- FAIL condition: zero matches.

**9. Doctrine fixes survived in all 5 reference sites.**

```bash
grep -inE "tree-?sitter|quakec" \
  apps/qw-oracle/OVERVIEW.md \
  apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md \
  apps/qw-oracle/scripts/extractors/CLAUDE.md \
  apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md \
  /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_extraction_pipeline_vision.md
```
- PASS condition: zero matches that attribute tree-sitter / QuakeC to canonical KTX. Surviving matches must reference dusty-ktx exclusively, OR appear in F19/F22-style audit-trail context that explicitly documents the doctrine slip + Phase 0's fix.
- FAIL condition: any match attributes tree-sitter / QuakeC to canonical KTX.

**10. No new arc-touched doc recursed the doctrine slip.**

```bash
grep -rinE "ktx.*(uses|is|will use|onboarding via).*tree-?sitter" \
  docs/superpowers/plans/2026-05-04-ktx-onboarding/ \
  docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md \
  apps/qw-oracle/
```
- PASS condition: zero matches that bind canonical KTX to tree-sitter (matches binding dusty-ktx-fork to tree-sitter are correct).
- FAIL condition: any match binding canonical KTX to tree-sitter.

**11. Phase 8 commit landed cleanly.**

```bash
git log -1 --pretty=oneline
git status --short
```
- PASS condition: latest commit names Phase 8; `git status --short` is empty.
- FAIL condition: latest commit is something else OR working tree has uncommitted residuals.

If all 11 probes pass, Phase 8 is done; the arc is shipped end-to-end. The next operator action is deleting the HANDOVER backlog bullet ("qw-oracle slim-doc Arc 1 refresh sweep") + the in-flight arc index entry ("KTX Layer 1 Onboarding -- planning-drafting; Phase 7 approved..."), then routing to arc-reviewer for the post-arc spec-vs-shipped walkthrough.

If any probe fails, see `## Recovery` below.

## Outputs to next phase

Phase 8 is the LAST phase of the KTX Layer 1 Onboarding arc. There is no next phase. Outputs after Phase 8 ships:

- **Repo doctrine fully aligned with reality.** All 5 reference sites (4 in-repo + user-memory) carry the libclang-correct doctrine; no recursion of the tree-sitter claim into any arc-created doc.
- **HANDOVER backlog item ("qw-oracle slim-doc Arc 1 refresh sweep") absorbed.** Operator deletes the HANDOVER bullet at `HANDOVER.md` "Small followups" section after Phase 8 ships (per the docket's "delete BOTH the index line AND destination" convention -- the bullet has no parking-doc destination to clean up; just remove the bullet line).
- **HANDOVER active-arcs entry for KTX Layer 1 Onboarding deleted.** The "Active arcs" section's `KTX Layer 1 Onboarding -- planning-drafting; Phase 7 approved...; next is phase-8-drafter-prompt.md` line is removed; the arc retrospective lives in `apps/qw-oracle/docs/arc-history.md` going forward.
- **README.md, OVERVIEW.md, SCHEMA.md slim-doc cohort caught up to Postgres + post-Phase-6 MCP shape + Layer 3 first-class status + KTX deltas.** Per-table SCHEMA.md prose body refresh remains under the separate HANDOVER sidequest "SCHEMA.md doc-style inconsistency" -- NOT Phase 8 scope.
- **EXTRACTOR-PLAYBOOK.md has the four cross-codebase port lessons KTX earned.** Future engine ports (whether forks like unezQuake / antilag-mvdsv, or fresh ports like the dusty-ktx fork's `qcsrc/` tree when that arc lands) consume the Pre-Port Discovery Sweep + Pre-Commit Discovery Cross-Check + Handler-grouping rationale + Pattern 15 / Pattern 16 documentation directly.
- **Pattern 10 widened to admit ENUM_DECL alongside MACRO_DEFINITION** (Phase 4 carry-forward); future ports needing TU-root header declarations have the widened guidance.
- **Dual-row design for log_template + match_event documented** (D10 / F17) so future maintainers don't try to "deduplicate" the intentionally-paired rows.
- **Arc-orchestrator handoff or arc-reviewer routing.** With all 9 phases shipped (Phase 0 + Phase 1 + Phases 2-6 + Phase 7 + Phase 8), the next step is operator-driven: route to `arc-reviewer` skill for the spec-vs-shipped walkthrough (per the post-arc handoff in `README.md`).

## Open questions / deferred items

- **Question:** D5 of decisions.md names the KTX migrations `008_ktx_log_template_logfile_channel.sql` / `009_ktx_match_event_type.sql` / `010_ktx_gameplay_kinds.sql`. Slot 008 was taken between scaffold time and arc-execution time by the QWiki community-reference arc's `008_community_schema.sql`. Phase 1 of the KTX arc may have renumbered to `009/010/011` (or higher) at execution time. Phase 8's SCHEMA.md sweep references the migration content abstractly ("the KTX log_template channel widening migration") plus a note ("see live db/migrations/ for actual filenames") to insulate against the renumbering.
  **Default chosen for now:** SCHEMA.md's new "KTX onboarding arc" section calls out the slot-collision flag explicitly with a "refer to live db/migrations/ for actual filenames" pointer. Phase 8 does not lock specific filenames into the documentation; the schema deltas are the load-bearing content. If Phase 1 renumbered, no Phase 8 edit is required -- the documentation is stable across renumberings.
  **Who can resolve:** operator at execution time -- if the actual filenames should be locked into the SCHEMA.md text (a doc-clarity preference), substitute the filenames at Phase 8 execution time before committing. The phase MD's content is template-shaped to admit either choice.

- **Question:** Phase 5's drafter open-question parked a "Lift Pattern 9 to `extractor_lib._banner` per Rule of Second Consumer" sidequest -- the function-banner harvest is now used by both MVDSV `_handler_commands.py` and KTX `_handler_gameplay_tables.py`. Should Phase 8 land the lift OR keep it parked for a follow-up arc?
  **Default chosen for now:** keep parked. The Rule of Second Consumer is intentionally refactor-on-demand, not pre-design. The lift is a cross-handler refactor that touches MVDSV's existing handler -- mid-arc lift would balloon Phase 8's scope beyond markdown work AND would touch tested code that's not Phase 8's concern. Add to HANDOVER as a sidequest (parking ref: Phase 5 open question).
  **Who can resolve:** operator (mid-Phase-8 if a sidequest entry is desired) or future-arc operator (if the lift waits for a 3rd consumer of `_function_banner`).

- **Question:** The slim-doc sweep covers README.md / OVERVIEW.md / SCHEMA.md preamble. Should Phase 8 also sweep `apps/qw-oracle/scripts/load-knowledge/CLAUDE.md` and the `**Status:**` line in `apps/qw-oracle/CLAUDE.md` (per the HANDOVER bullet's "possibly" qualifier)?
  **Default chosen for now:** YES for the `apps/qw-oracle/CLAUDE.md` Status-line scrub (one-line edit; "Schema v18" -> "Postgres + db/migrations/" per the HANDOVER bullet's explicit naming). NO for `apps/qw-oracle/scripts/load-knowledge/CLAUDE.md` (uncertain whether stale; the HANDOVER says "possibly" -- treat as out-of-scope unless operator requests). Operator can request the broader scrub at execution time if needed.
  **Who can resolve:** operator at execution time -- can authorize the broader scrub or defer to a follow-up sidequest.

- **Question:** Phase 8's Task 2 OVERVIEW.md edits include rewriting the Layer 1 inventory KTX row to "shipped" status with "1.46" version and a per-handler-coverage list. The version + ship date are placeholder ("shipped 2026-05-XX") -- should the executor lock the actual values at execution time?
  **Default chosen for now:** YES. The phase-template's drafter checklist instructs the executor to source-walk + verify; the executor at Phase 8 execution time fills in the actual ship date (the date Phase 8 itself commits) and verifies the canonical KTX tag is still 1.46 (or bumps if a newer stable shipped). Phase 8 MD ships the placeholder so the drafter need not predict the future.
  **Who can resolve:** Phase 8 executor (mechanical: read git log for ship-date stamp + verify KTX research repo's latest tag).

## Recovery (if verification fails)

- **Probe 1 fails (README.md still has SQLite-era / IRC-era / stale-count signals):** the whole-file rewrite in Task 1 is the source of truth; re-apply via Write call. If the failing match is a single line that crept in mid-edit, narrow the fix to that line; otherwise re-run the full Write.
- **Probe 2 fails (OVERVIEW.md Code landmarks routes through SQLite paths):** the Code landmarks table replacement in Task 2 is a single-block Edit; re-apply.
- **Probe 3 fails (SCHEMA.md preamble has SQLite primitives):** the preamble rewrite in Task 3 is a single-block Edit; re-apply. Distinguish "preamble (lines 1-100) has SQLite primitive" (Phase 8 fix; re-Edit) from "body (lines 100+) has SQLite primitive" (HANDOVER sidequest scope; not a Phase 8 failure).
- **Probe 4 fails (channel CHECK still 4 values):** the in-place Edit in Task 3 missed; re-apply with a tighter find-string.
- **Probe 5 fails (gameplay kind widenings missing):** Task 3's two kind-line replacements; re-apply.
- **Probe 6 fails (`match_event_versions` not documented):** the appended "KTX onboarding arc" section in Task 3 is missing or got eaten; re-apply via Edit (anchor: the "## Related" line just before; insert the new section block before it).
- **Probe 7 fails (PLAYBOOK new sections missing):** Task 4 / 6 / 7 inserted them; re-apply each via Edit. Use the anchor lines named in each task to position the inserts.
- **Probe 8 fails (Pattern 10 not widened):** Task 5's single-block Edit missed; re-apply.
- **Probe 9 fails (doctrine survived check shows canonical-KTX attribution):** Phase 0's fix has regressed at the failing site. Re-apply Phase 0's literal before/after blocks for that file (per phase-0-doctrine-fixes.md) before the next Phase 8 commit. If the regression is in `project_extraction_pipeline_vision.md` (user-memory), re-apply Phase 0's Task 5 edits.
- **Probe 10 fails (new arc-doc binds canonical KTX to tree-sitter):** the failing match is a content slip in Phase 8's own edits OR in a Phase 7 doc (validation report, audit notes). Locate the file/line, edit out the canonical-KTX attribution, re-run probe.
- **Probe 11 fails (commit missing or working tree dirty):** `git status` to triage. The most likely cause is files were staged but `git commit` failed on a hook. Inspect hook output, fix the underlying issue, re-stage if needed, re-commit.

If any failure resists local recovery, halt and surface to operator. Phase 8's Recovery is intentionally short -- the failure modes are concentrated around find-string drift and Phase-0-regression, both of which have well-defined local fixes.

---

## Findings resolved by this phase (per `review-findings.md`)

- **F17** (Pass 1.7 printf-handler intentionally catches XML-shaped log_printfs; PLAYBOOK addition for dual-row design). Resolved by Task 7 (the "Dual-row design" note shipped to EXTRACTOR-PLAYBOOK.md).
- **F19** (Doctrine references stating KTX uses tree-sitter -- four reference sites; survival check). Resolved by Tasks 8 + 9 (broad doctrine probe across the original 4 in-repo sites + the user-memory site + the arc-touched surface). Phase 0 originally landed the fix; Phase 8 verifies it survived the arc.
- **F20** (HANDOVER backlog item "qw-oracle slim-doc Arc 1 refresh sweep" sequenced as Phase 8). Resolved by Tasks 1 + 2 + 3 (the slim-doc cohort sweep across README.md / OVERVIEW.md / SCHEMA.md). Operator deletes the HANDOVER bullet after Phase 8 commits per the Outputs section.
- **F22** (VALIDATION-RUNBOOK.md as 5th doctrine site, surfaced during Phase 0 drafting; survival check). Resolved by Task 8 (the doctrine probe explicitly includes VALIDATION-RUNBOOK.md as the 5th site, beyond F19's original four).
- **D6** (handler grouping rationale -- Phase 8 documents in PLAYBOOK). Resolved by Task 4 (the new "Handler-grouping rationale" section in EXTRACTOR-PLAYBOOK.md).
- **D10** (dual-row design -- Phase 8 documents in PLAYBOOK). Resolved by Task 7 (the new "Dual-row design" note in EXTRACTOR-PLAYBOOK.md).
- **Phase 4 carry-forward** (Pattern 10 widening from Phase 4 open-question; new Pattern 16 from Phase 4 open-question). Resolved by Tasks 5 + 6.

No findings touched by Phase 8 are deferred; all listed findings ship in this phase. Phase 5's parked Pattern-9 lift sidequest is documented in Open Questions above for HANDOVER routing rather than resolved here.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

After the phase MD is drafted, the drafter spawns a sub-agent with the `Agent` tool, `subagent_type=Explore`, model: Sonnet medium, and the following brief shape:

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-8-end-of-arc-docs.md
Read decisions.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md
Read review-findings.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md
Read the design spec section relevant to this phase:
  /home/paradoks/projects/quakeworld/docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md
  (relevant section: spec preamble's "Doctrine fixes deferred to end-of-arc" block;
   plus the "Findings the spec got right (commendations)" section in
   review-findings.md which enumerates the four PLAYBOOK additions Phase 8
   should land.)

Read the live state of the slim-doc cohort + EXTRACTOR-PLAYBOOK + Phase 0 MD:
  /home/paradoks/projects/quakeworld/apps/qw-oracle/README.md
  /home/paradoks/projects/quakeworld/apps/qw-oracle/OVERVIEW.md
  /home/paradoks/projects/quakeworld/apps/qw-oracle/SCHEMA.md
  /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-0-doctrine-fixes.md
Read the prior-phase MDs to confirm cross-phase carry-forwards are addressed:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-4-taxonomies-handler.md
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-5-tables-handler.md
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-6-match-event-handler.md

Then verify, file-by-file:

1. SLIM-DOC SWEEP COVERAGE. The Phase 8 MD's Task 1 / Task 2 / Task 3 covers
   all three slim docs (README.md, OVERVIEW.md, SCHEMA.md). For each doc,
   verify: (a) the targeted edits address every SQLite-era / stale-count /
   stale-runtime signal the live doc carries; (b) the rewrites do NOT introduce
   new doctrine slips (tree-sitter / QuakeC slips MUST NOT appear in the new
   content). Flag CRITICAL on any uncovered signal OR new slip.

2. EXTRACTOR-PLAYBOOK ADDITIONS positioning. Confirm the four new sections
   (Pre-Port Discovery Sweep, Pre-Commit Discovery Cross-Check, Handler-grouping
   rationale, Pattern 15) land at the positions Task 4 specifies (relative to
   existing section anchors). Confirm the Pattern 10 widening lands inline at
   the existing Pattern 10 entry (Task 5). Confirm Pattern 16 + Dual-row design
   land at the end of the Registration pattern catalog (Tasks 6 + 7). Flag
   SUBSTANTIVE on any positioning issue (e.g., Pattern 16 inserted before
   Pattern 14, breaking numbering).

3. HANDOVER BULLET ABSORPTION. Verify the phase MD's Outputs section explicitly
   names the HANDOVER bullet to delete after Phase 8 ships ("qw-oracle slim-doc
   Arc 1 refresh sweep") AND the in-flight arc-index entry ("KTX Layer 1
   Onboarding"). Flag SUBSTANTIVE if either is missing.

4. DOCTRINE-FIX SURVIVAL coverage. Verify the phase MD's Task 8 + Task 9
   together cover all 5 reference sites named in F19 + F22:
   (a) apps/qw-oracle/OVERVIEW.md
   (b) apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
   (c) apps/qw-oracle/scripts/extractors/CLAUDE.md
   (d) apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md  (F22 site)
   (e) /home/paradoks/.claude/projects/.../memory/project_extraction_pipeline_vision.md
   AND the arc-touched surface (apps/qw-oracle/scripts/extractors/ktx/, the
   spec MD, the per-phase MDs, the slim docs as edited by Phase 8 itself).
   Flag CRITICAL if any of the 5 reference sites is missing from Task 8.

5. PRIOR-PHASE OPEN-QUESTIONS sweep. Verify Phase 8 addresses the explicit
   "Phase 8" deferrals in prior phase MDs:
   (a) Phase 4 open-question 2: Pattern 10 widening (MACRO_DEFINITION + ENUM_DECL).
       Phase 8 Task 5 should land this.
   (b) Phase 4 open-question 2: new Pattern 16 (X-macro file parse for deathtype.h).
       Phase 8 Task 6 should land this.
   (c) Phase 5 open-question 4: Pattern 9 lift candidate (`_function_banner`
       to extractor_lib._banner per Rule of Second Consumer). Phase 8 should
       acknowledge in Open Questions (parking decision -- not landed inline).
   Flag SUBSTANTIVE if any of (a)/(b) is missing from Phase 8 tasks. Acceptable
   if (c) is parked rather than landed.

6. PHASE-TEMPLATE COMPLIANCE. Confirm the phase MD follows phase-template.md
   exactly: Goal, Inputs from previous phase, Files touched (Created /
   Modified / Deleted), Tasks (numbered with Goal / Files / Steps / Verification /
   Execution mode), Verification (phase boundary), Outputs to next phase,
   Open questions / deferred items, Recovery, Findings resolved by this phase,
   Verification sub-agent dispatch. Flag SUBSTANTIVE on any missing section.

7. EXECUTION MODE declarations. Per D18, every task must declare its execution
   mode. Phase 8 tasks should ALL declare `inline` (per the operator's
   feedback_no_subagents_for_mechanical_edits.md rule and the prompt's "Phase 8
   is inline-execution-default"). Flag ADVISORY on any task declaring subagent
   dispatch (would contradict the Phase 8 inline-default).

8. ASCII OUTPUT DISCIPLINE. Per D19, every line in the phase MD must be ASCII
   (no em-dashes, en-dashes, smart quotes, emoji, non-ASCII characters). Flag
   ADVISORY on any non-ASCII slips.

9. VERIFICATION PROBE shape. Per D16, every verification probe in "Verification
   (phase boundary)" returns a YES/NO answer (not interpretive prose). Flag
   ADVISORY on any probe that doesn't have an explicit PASS/FAIL condition
   block.

10. DOCTRINE SLIP self-check. Confirm the phase MD itself does NOT recurse the
    doctrine error -- every reference to tree-sitter or QuakeC in the phase MD
    is in audit-trail context (referencing F19/F22 evidence, Phase 0 surgery,
    D2 decision, dusty-ktx fork attribution) NOT a canonical-KTX attribution.
    Flag CRITICAL on any canonical-KTX-binding tree-sitter slip in the phase
    MD itself.

11. FILE PATH validity. For every absolute path the phase MD references in
    Files touched / Steps / Verification, verify the path exists in the live
    codebase (for Modified / Deleted). The Created subsection is empty for
    Phase 8.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

The drafter applies the sub-agent's findings to the phase MD before declaring the phase ready for operator review. If a sub-agent finding contradicts `decisions.md`, decisions.md wins and the finding is rejected with a one-line rationale in the phase MD's "Open questions" section.

---

*Phase 8 is the LAST phase of the KTX Layer 1 Onboarding arc. After Phase 8 ships and the operator deletes the HANDOVER bullets per the Outputs section, the next step is arc-reviewer's spec-vs-shipped walkthrough (per the post-arc handoff in `README.md`). The arc retrospective lands in `apps/qw-oracle/docs/arc-history.md` after the reviewer pass closes.*
