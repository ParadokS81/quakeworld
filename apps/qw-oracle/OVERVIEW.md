# QW Oracle — Overview

> **Doc type: load-bearing slim.** Three-layer design intent, domain inventory at-a-glance, attestation about parked Layer 2 work, code landmarks, integration boundaries. Catalog content (subcommand tables, MCP tool rosters, schema migration lists, extractor directory trees) lives in source — see the pointers below.

**Lifecycle status:** Active. Layer 1 covers six namespaces (ezQuake / FTE / QWCL / MVDSV engine ports + the `qw` game-content namespace) with KTX as the only outstanding port. Schema at v18. Layer 2 corpus is imported but the processing pipeline on top of it hasn't been touched in weeks (see "Layer 2 — state unknown" below). Most recent shipped arc: zero-debt-before-KTX (2026-04-29) — see `docs/arc-history.md` for the chronological log.

---

## What the project is

Oracle is the **knowledge service** for the monorepo: three data layers plus the machinery around them. See `VISION.md` for the framing.

**Layer 1** — `data/knowledge.db`. Source-extracted engine facts (15 entity types) plus the `qw` namespace for game content. Engine entities live in the per-version arc model with per-field blame and diff streams. `qw` content lives in flat per-domain tables. Schema at v18 (tracked in `schema_meta`, not PRAGMA). Covered by `SCHEMA.md`.

**Layer 2** — `data/qw.db`. 2.66M community chat messages (1.94M QuakeNet IRC 2005-2016 + 717K Quake.World Discord 2016-present). Raw + FTS5 search index. Processing pipeline incomplete — see "Layer 2 — state unknown" below.

**Layer 3** — `concept-notes/`. Hand-authored notes synthesizing Layer 1 + Layer 2 into usable guidance. 9 notes plus `README.md` (entry template + 6 recognized shapes), `OPERATIONS.md` (stewardship playbook), `_gap-report.md` (contributor onboarding seed for ezquake.com). `weapon-scripts.md` (2026-04-24) is the first R7 opinionated-best-practice exemplar. The `get_concept_note` MCP tool serves this directory live.

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
| `ktx` | engine (mod, QuakeC) | per-version arc | — | not started; tree-sitter spike done; use `py-tree-sitter` (NOT Node `tree-sitter@0.25` which segfaulted on WSL/Node 20) |
| `qw` | game content + game mechanics | flat per-domain tables (no version arc) | sentinel `static` | maps + id1 baseline gameplay shipped 2026-04-27 |

For per-namespace entity counts at HEAD, query `entities` directly:
```sql
SELECT project, type, COUNT(*) FROM entities GROUP BY project, type;
```

**Deep-time walk floor for ezQuake is `v3.0`** (2016-06-04). Pre-3.0 era is **deliberately de-scoped** per 2026-04-25 chat with infiniti — security framing (pre-3.6 has known attack vectors; Oracle should not surface settings nudging users into vulnerable defaults) plus diminishing-returns. Walk procedure documented in `docs/layer1-extraction-roadmap.md`.

**Still open on Layer 1:**
- **Phase 2e KTX** — tree-sitter-based; foundations cleaned by zero-debt-before-KTX arc 2026-04-29.
- **Phase 2f historical backfill** beyond ezQuake — FTE / QWCL / MVDSV today are single-version. Multi-version walks must re-extract under post-Phase-6 handlers (HANDOVER: "Cross-extractor Phase 6 residuals — Deep-time-walk re-extract obligation").
- **Phase 2g MCP tool upgrades** — `version` / `as_of` parameters, `get_entity_history`, version/date filters on `search_entities`.
- **Phase 2h automation** — scheduled tag-delta job (detect new upstream tag → extract → load → enrich → insert).
- **Asset reference-resolution graph** — research-foundation spec at `docs/superpowers/specs/2026-04-21-asset-reference-resolution-graph-design.md` proposes the shift from category-classification to consumer-reference graph. Implementation plan not yet written.
- **`qw` namespace expansion** — future game-content domains (KTX gameplay overrides, official match-stats subset, player registry, event metadata) land as additional flat tables under the `qw` namespace.

---

## Layer 2 — state unknown

The corpus is imported into `data/qw.db` and a basic FTS5 search index exists. The processing pipeline on top of it — tier classification, session segmentation, summarization, curation — **hasn't been touched in weeks and has not been audited.** The scripts at `scripts/*.mjs` are what exists, not necessarily what is still in use:

- `import-discord.mjs` / `import-irc.mjs` — raw import from the respective dumps
- `db.mjs` — Layer 2 schema + connection (legacy `.mjs`, not TypeScript)
- `build-search-index.mjs` — FTS5 index build
- `search.mjs` — search CLI
- `stats.mjs` / `stats-tier1.mjs` — dataset stats
- `process-tier1.mjs` — early tier-1 classification work
- `sample-*.mjs` — ad-hoc sampling scripts from design spikes
- `helpdesk-benchmark.mjs` / `helpdesk-coverage.mjs` — the "can this answer a real question" bench

This list is a file inventory, not a working map. **Before the next Layer 2 push, this section needs its own audit pass** — which scripts are current, which are scratchpads to delete, which compose into a pipeline.

---

## Code landmarks — where to find things

| If you want to... | Look at... |
|---|---|
| Add a new entity type | `scripts/load-knowledge/schema.ts` (new `*_versions` table + CHECK widening) → `types.ts` (row interface) → `natural-keys.ts` (upsert helper) → new `load-<type>.ts` adapter → `load-version.ts` (register in dispatcher) → `diff-versions.ts` (`TYPE_DIFF_CONFIGS` entry) |
| Change how diff blame is resolved | `scripts/load-knowledge/diff-versions.ts` — the Map preload + override-lookup hot loop |
| Add per-field blame for a new type | Extractor emits `field_source_lines` payload → adapter calls `upsertSourceOverride` with `override_kind` |
| Tune the regression drop-guard | `scripts/load-knowledge/load-version.ts` — the `dropGuard` check |
| Add a loader CLI subcommand | `scripts/load-knowledge/index.ts` (the dispatcher is the source of truth for what's wired) |
| Add an MCP tool | `serve/mcp/src/tools/<name>.ts` + register in `src/index.ts`. The 10 current tools live there. |
| Migrate schema (additive — new column on existing table) | `schema.ts` — bump `SCHEMA_VERSION`, add `SCHEMA_V<N>_MIGRATION_SQL`, add `migrateV<N-1>ToV<N>`, extend `applySchema` chain. Pattern at v7. |
| Migrate schema (CHECK widening on existing column) | `schema.ts` — table rebuild required (SQLite can't ALTER CHECK in place). Pattern at v8 / v10 / v12. Update the v3 `CREATE TABLE` block too so fresh DBs land on the widened CHECK. |
| Verify a phase ran correctly | `scripts/load-knowledge/e2e-verify.md` |
| Add a new extractor codebase | `scripts/extractors/<project>/extract.py` (Python + libclang 18 — KTX uses tree-sitter). Cross-engine pattern in `scripts/extractors/EXTRACTOR-PLAYBOOK.md`. Use the `onboard-extractor` user-global skill. |
| Author or update a Layer 3 concept note | `concept-notes/`. Template at `concept-notes/README.md`; stewardship at `concept-notes/OPERATIONS.md`; gap-report seeds the upstream contributor kit. Use the `guide-rewrite` user-global skill. |

---

## Design intent — invariants that aren't grep-able

**Two-DB split is intentional.** `knowledge.db` is regenerable from source; `qw.db` is regenerable from raw import dumps. Neither is committed. The split keeps Layer 1's per-version arc model from cross-pollinating the Layer 2 corpus's "raw is immutable" rule.

**Per-version arc model is for engine entities only.** The `qw` namespace skips the entire arc (no `entities` row, no per-version snapshot, no `project` column on `qw`-namespace tables, sentinel version `static`). Game content doesn't change with engine versions; engine ports do.

**`source_state` is biographical-by-design.** Entity-level `source_state` captures "ever was source-backed at some loaded version" — per-version `source_file` is current-state. Documented at `scripts/load-knowledge/load-version.ts:580-585` and aligns with the source-truth-dichotomy memory (`memory/project_qw_oracle_source_truth.md`). Consumers reading entity-level state without checking the per-version transition log will misclassify retired entities; that's a CONSUMER-side concern (slipgate), not an extractor bug.

**Snapshot distribution is the slipgate consumer interface.** `build-snapshot --project <p>` reads `knowledge.db` and emits slipgate-shaped JSON into `apps/slipgate-app/src/lib/config/data/`. Per-record shape: original slipgate fields + 5 enrichment fields (source_state, first_seen_version, last_seen_version, optional default_history, optional retired_at_version). `mvdsv` is intentionally NOT snapshotted (server-side; slipgate is the client). Output filenames documented in `serve/mcp/` consumers and `e2e-verify.md`.

**MCP librarian volunteers cross-references.** v0.2.0 rewrite (2026-04-25) made one tool call return rich records — entity + source_state + version arc + asset relations + linked concept notes — instead of forcing follow-up calls. Voice-neutral; consumer voice and orchestration recipes live in each consumer's surface.

---

## Integration points

**Consumes:**
- `apps/qw-oracle/scripts/extractors/<project>/output/*-ast.json` (extractor outputs, committed)
- `apps/qw-oracle/scripts/extractors/<project>/seeds/*.yaml` (hand-authored seed taxonomies)
- `research/repos/ezquake-source` (and FTE / MVDSV / QWCL clones) for git blame + tag resolution
- GitHub API for release bodies + PR enrichment

**Produces:**
- `data/knowledge.db` (Layer 1, gitignored)
- `data/qw.db` (Layer 2, gitignored)
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

*Last slimmed: 2026-04-29 per docs-system-redesign spec Plan 2 (litmus test applied; subcommand / MCP tool / migration / extractor-tree catalogs cut as grep-reproducible; per-namespace counts replaced with one SQL probe; Layer 2 attestation preserved verbatim; design-intent paragraphs added).*
