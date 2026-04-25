# Layer 1 Extraction Roadmap

> Living document. The path from current state to "Layer 1 complete across every supported QW engine, validated end-to-end by the quality grid." Update as cliffs land or get scaled.

## Goal

Layer 1 is engine-source-derived facts (cvars, commands, macros, cmdline params, keynames, HUD elements, rulesets, token primitives, asset consumption, flag bits) extracted at every release of every engine, with per-field provenance. ezQuake first, then FTE, MVDSV, KTX. Each tag's snapshot must pass the grid.

Vision context: `apps/qw-oracle/VISION.md`. Schema: `scripts/load-knowledge/schema.ts`.

## Validation loop

The single workflow that drives everything below:

1. `extract-tag --project <p> --version <v> --skip-prune` (omit `--ordinal` for head; default for tags is the semver-encoded number, e.g. 3.6.6 -> 366).
2. `quality-grid --project <p>` -- F1.cross_type_orphans may FAIL during a walk; that's expected (see "Walk procedure" below). Other regressions must PASS.
3. **All regression PASS (modulo cross_type_orphans during walk), anomalies CLEAN or expected** -> proceed to next tag.
4. **Anomaly surfaces**:
   - Investigate: hypothesise a cause, write a probe to test, verify against primary source (`git grep` or libclang trace).
   - Fix at the right layer (extractor / loader / schema). Each fix promotes its surfacing anomaly to a Family 1 regression probe.
   - Re-run the affected tags.
   - Confirm grid clean before proceeding.

Each lap adds permanent invariants. The grid carries forward what each session learned.

### Walk procedure (deep-time walks)

The cross-type help-JSON orphan prune is order-sensitive: when walking
backward (newer tags first), it will incorrectly delete entities that are
doc_only at newer tags but real-source-defined at not-yet-loaded older tags
(e.g. `scr_weaponstats_x` cvar at v3.0.1 was deleted during 3.6.x loads,
forcing re-extraction once v3.0.1 revealed the cvar's actual source
presence). The fix:

1. **During the walk:** pass `--skip-prune` to every `extract-tag`
   invocation. The per-load prune is skipped; orphans accumulate during
   the walk. F1.cross_type_orphans WILL fail; treat as informational.
2. **After all tags loaded:** run `npm run load-knowledge -- prune-cross-type-orphans --project <p>`.
   The finalize sweeps all entity types project-wide, and the entity-level
   `source_state` now reflects the full picture so the prune correctly
   identifies permanent help-JSON mislabels (radar, password, etc.) vs.
   real legacy aliases with older-version source presence.
3. **Re-run the grid:** F1.cross_type_orphans now passes.

Single-tag loads (no walk) can omit `--skip-prune`; the per-load prune
fires as before because there is no "later" tag to reveal source presence.

## Status snapshot (2026-04-25, late session)

- ezQuake: 8 tags + head loaded clean (3.2.3 / 3.6.0 / 3.6.1 / 3.6.2 / 3.6.5 / 3.6.6 / 3.6.8 / 3.6.9 / head).
- 5 regression probes PASS. 5 anomaly probes CLEAN. 1 informational (doc_only_crosstab at 201 doc_only entities).
- Schema v9: per-version retirement transitions (`source_retired_at_version`) landed; entity biographies queryable via `source_state_transitions`.
- Loader fixes shipped this session: cmdline manifest-fallback citation (params declared but not COM_CheckParm'd), case-fold dict-key merge (loadFragfile vs loadfragfile, HUD262_* family, -forceTextureReload), per-version retirement detection.
- FTE / MVDSV / KTX: not started.

## Cliffs ahead — ezQuake deep-time walk (3.0 → 3.6.0)

Walking back to 2016 (commit history goes to ~3.0) will surface structural shapes the current marathon hasn't tested. None of these are blockers; each is "watch for, address when grid surfaces it."

### 1. Pre-`src/` layout era

Tags before 2023-01-05 carry C files at repo root, not `src/`. The unified extractor's `EZQ_SRC` auto-detection handles this for 3.6.1 (Nov 2022); only one pre-`src/` tag is validated so far. Older tags may have additional layout shapes (header subdirs, optional folders, missing files).

What to watch for: a tag's load yields suspiciously few entities for a type, or an entire entity type returns 0 rows. Probe `F2.flickering_presence` at type-level catches sudden disappearances.

### 2. Pre-`help_*.json` era

Older tags don't ship `help_variables.json` / `help_commands.json` / etc. The doc_only-vs-source_backed reconciliation degrades gracefully (entities become AST-only, no `help_desc` populated), but the loader's "incoming JSON" assumption needs to handle the no-help-JSON case cleanly.

What to watch for: load errors complaining about missing payload fields, or entities created without any descriptive metadata. The extractor should produce an entry from AST evidence alone; the loader must accept entries with no `help_*` fields.

### 3. Macro / `#ifdef` divergence over a decade

Today's 4-variant parse architecture (Linux client/server, Win client, Apple client) was tuned against modern source. 2016-era code may need additional or different `-D` flags, or have headers that fail Linux libclang parsing entirely. The deferred `-nopriority` Windows-SDK case (HANDOVER) is a small preview.

What to watch for: parse failures, entities the older source clearly contains but the extractor misses. Probe `F2.source_backed_missing_citation` flags it directly. Recovery options ranked: stub headers (one place, all engines benefit), additional `-D` per-tag, hand-register specific entities.

### 4. Renames and predecessor tracking

Cvars and commands get renamed across years. The schema has `entities.predecessor_id` for this; the loader does not auto-populate it. Renames are detected by the `extraction-review` skill at walk time as operator judgment.

What to watch for: a deletion at tag N alongside a creation at tag N+1 with similar name. The skill clusters these; operator decides if it's a rename or coincidence. Rename annotation is manual but bounded; one rename = one operator decision.

### 5. Per-version source_state — RESOLVED 2026-04-25

Schema gap surfaced and resolved in same session. Loading 3.2.3 surfaced 17 entities (11 cvar + 5 command + 1 cmdline_param) source-backed at older tags but only doc_only at modern tags (`gl_motion_blur` family, `gl_particle_fasttrails`, `r_glstats`, `showram`, `sv_enableprofile`, etc.). Resolution went with Path 2: per-version retirement transitions (`source_retired_at_version`) on the existing `source_state_transitions` log. Entity-level `source_state` stays meaningful as "was real at some loaded version"; the per-version biography lives on the transition rows. Schema v9 widens the reason CHECK; loader runs the retirement scan after each orphan-prune; quality-grid F2 probe filters NULL rows that are explained by either retirement (at-or-before the row) or backfill_match (strictly-after the row, for the inverse "introduced at version X" case).

Outcome on the loaded set: F2.source_backed_missing_citation went 80 -> 9 -> 123 -> 0 across the session as fixes landed and 3.2.3 came in.

## Cross-engine generalisation

The extraction infrastructure is project-keyed. Adding a new engine = writing engine-specific extractor handlers; the loader, grid, and schema all extend without code changes.

### FTE (Phase 2d)

First port. Biggest structural risk: codebase layout differs (`engine/client/`, `engine/server/`). The `PROJECT_SRC_PREFIX` map in `diff-versions.ts` has an empty FTE entry signalling the extractor must emit repo-relative paths directly. Macro-heavy codebase (regex extraction historically painful — see Phase 2 motivation in `project_extraction_pipeline_vision` memory).

### MVDSV + KTX (Phase 2e)

MVDSV: small port, 189 cvars, same `cvar_t` struct shape as ezQuake. Reuse Visitor handlers.
KTX: tree-sitter-based. Use `py-tree-sitter` (NOT Node `tree-sitter@0.25`, which segfaults on WSL/Node 20).

### QWFWD

Not yet cloned to `research/repos/`. Add when scoping Phase 2e.

## Out of scope until specifically triggered

These are roadmapped but should not be pulled forward without an explicit blocker forcing them:

- **Phase 2g — MCP tool upgrades**: `version` parameter on `lookup_entity`, new `get_entity_history` tool, etc. Wait until an active consumer needs version-aware queries.
- **Phase 2h — automation**: scheduled job to detect new tags, run delta extraction, enrich. Wait until manual cadence becomes a friction.
- **Slipgate-app refactor to consume new data**: deferred by operator. Phase 2 builds the foundation; consumption follows when foundation is complete.
- **dusty-ktx QuakeC client module** (`qcsrc/`): different language. Separate spike.

## How this document evolves

- New cliff encountered and scaled: add it to the relevant section with a one-line summary of the fix shape.
- New engine onboarded: add a subsection under cross-engine.
- Deep-time milestones reached (e.g. all ezQuake tags 3.0+ loaded clean): update the status snapshot.
- This file points at HANDOVER for active todo state, not the other way around.

## Anchors

- Quality grid: `scripts/load-knowledge/quality-grid.ts`
- Extract-tag CLI: `scripts/load-knowledge/extract-tag.ts` + `index.ts`
- Schema: `scripts/load-knowledge/schema.ts`
- Vision: `apps/qw-oracle/VISION.md`
- Open todos / deferred items: `HANDOVER.md` (root)
- Per-entity-type reference: `apps/qw-oracle/docs/entity-types.md`
- Project memory: `memory/project_qw_oracle_vision.md`, `memory/project_extraction_pipeline_vision.md`
