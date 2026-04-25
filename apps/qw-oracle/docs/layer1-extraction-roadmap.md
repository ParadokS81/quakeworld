# Layer 1 Extraction Roadmap

> Living document. The path from current state to "Layer 1 complete across every supported QW engine, validated end-to-end by the quality grid." Update as cliffs land or get scaled.

## Goal

Layer 1 is engine-source-derived facts (cvars, commands, macros, cmdline params, keynames, HUD elements, rulesets, token primitives, asset consumption, flag bits) extracted at every release of every engine, with per-field provenance. ezQuake first, then FTE, MVDSV, KTX. Each tag's snapshot must pass the grid.

Vision context: `apps/qw-oracle/VISION.md`. Schema: `scripts/load-knowledge/schema.ts`.

## Validation loop

The single workflow that drives everything below:

1. `extract-tag --project <p> --version <v>` (omit `--ordinal` for head; default for tags is the semver-encoded number, e.g. 3.6.6 -> 366).
2. `quality-grid --project <p>`.
3. **All regression PASS, anomalies CLEAN or expected** -> proceed to next tag.
4. **Anomaly surfaces**:
   - Investigate: hypothesise a cause, write a probe to test, verify against primary source (`git grep` or libclang trace).
   - Fix at the right layer (extractor / loader / schema). Each fix promotes its surfacing anomaly to a Family 1 regression probe.
   - Re-run the affected tags.
   - Confirm grid clean before proceeding.

Each lap adds permanent invariants. The grid carries forward what each session learned.

## Status snapshot (2026-04-25)

- ezQuake: 7 tags loaded clean (3.6.1 / 3.6.2 / 3.6.5 / 3.6.6 / 3.6.8 / 3.6.9 / head).
- 5 regression probes PASS. 4 anomaly probes CLEAN. 1 informational (doc_only_crosstab). 1 known residue (per-version source_state on 2 entities, captured in `HANDOVER.md`).
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

### 5. Per-version source_state

Schema gap surfaced 2026-04-25 (joystick, sv_enableprofile). Entity-level `source_state` can't represent "source-backed at some versions, doc_only at others." Across a decade of additions / retirements / re-additions, this will affect more entities. See HANDOVER for the two-path discussion.

What to watch for: `F2.source_backed_missing_citation` rows that aren't explained by extractor coverage gaps. When 2-3 more concrete cases surface, decide between Path 1 (per-version source_state column) and Path 2 (auto-trigger source_retired transitions in load-version).

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
