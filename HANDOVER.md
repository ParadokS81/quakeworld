# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [qw-config dissolution (PRIORITY: before any new extraction work)](#qw-config-dissolution-priority-before-any-new-extraction-work) — **NEW 2026-04-25 (late).** Operator decision after wrap-up review: complete the qw-config → qw-oracle migration BEFORE adding QWCL or any other extractor. Rationale: each new extractor added to packages/qw-config means more code to relocate later. Half 1 (extractor relocation) is ~1 session; Half 2 (slipgate snapshot consumption) is 2-3 sessions but can run in parallel after Half 1. Gates the QWCL extraction handover entry below.
- [QWCL 2.33 extraction (after qw-config Half 1)](#qwcl-233-extraction-after-qw-config-half-1) — **NEW 2026-04-25 (late).** First cross-codebase port of the unified Layer 1 pipeline. Foundational for slipgate-app's planned config converter ("pandoc for configs") mapping QWCL → ezQuake → FTE. Libclang already parses qwcl-original cleanly; cliff is adapter code for the simpler 1996-era cvar_t shape + `Cvar_RegisterVariable` registration + no-help-JSON loader path. Build the new extractor in its NEW home (post-Half-1) to avoid adding to a soon-to-be-deleted package.
- [Phase 2d-2h: remaining QW knowledge rollout](#phase-2d-2h-remaining-qw-knowledge-rollout) — ezQuake deep-time walk reached **v3.0 floor (14 versions: v3.0 through head)** 2026-04-25 late; pre-3.0 era de-scoped on community-security framing. Walk infrastructure shipped same session: `extract-tag --skip-prune` + `prune-cross-type-orphans` finalize CLI + per-version `backfill_match` detection. Reusable for FTE/MVDSV/KTX. Remaining: Phase 2d QWCL (separate handover entry above), Phase 2d FTE, Phase 2e MVDSV+KTX, Phase 2g MCP tool upgrades, Phase 2h automation.
- [Semantic-pass abbreviation-bridge heuristic](#semantic-pass-abbreviation-bridge-heuristic) — P3 from 2026-04-24 sanity-sample calibration. Release-notes using feature full-names (joystick) don't match clusters of abbreviated entity names (joy*). Not a Phase 2f blocker; worth fixing during or before real walks reach affected pairs.
- [Layer 1 doc_only audit](#layer-1-doc_only-audit--closed-with-one-deferred-row) — **CLOSED 2026-04-25 with one deferred row.** Six extractor patterns + one architectural change + one loader dedup shipped across the session: P1 Cmd_AddLegacyCommand, P2 log_t table, P3 nested cvar_t tables, P5a SERVER_ONLY misplacement, P6 #define resolution, Item A 4-variant parse architecture, Item B cross-type help-JSON orphan prune. Prior retraction was itself wrong (extractor was missing these; the "all 73 cat1 present in AST" claim was based on a second misreading). Doc_only 269 -> 210; zero regressions; +24 newly-discovered command entities; +1 asset cvar binding; +1 cmdline usage. Deferred: `-nopriority` cmdline_param at sv_sys_win.c:645 (requires Windows SDK headers unreachable on Linux libclang). One entry remains until MVDSV/FTE hit the same wall — then stub-headers solution lands in one place.
- [Interactive HTML dashboard (deferred)](#interactive-html-dashboard-deferred) — Pass 3 shipped as a markdown reshape instead of an HTML dashboard. The dashboard is not killed; it's shelved until a concrete trigger fires. See the entry for unshelve conditions.
- [Workstream B: concept-note authoring scaffolding](#workstream-b-concept-note-authoring-scaffolding) — provenance frontmatter landed in `concept-notes/README.md` 2026-04-23; still open: template MDX-compatibility test against ezquake.com vitepress, authoring-ritual shape (prompt/slash-command).
- [Workstream C: /docs ingest pipeline prep](#workstream-c-docs-ingest-pipeline-prep) — **Audit completed 2026-04-24** (15 mirror, 10 ignore, 4 split, 1 historical across 30 guide pages). **License resolved by operator decision 2026-04-24**: treat as CC-BY-4.0, vikpe consented verbally on Discord, no LICENSE commit required. **Framing flipped 2026-04-25**: ezquake.com/docs is single-maintainer-plus-stepped-back (vikpe: "1 edit beyond myself submitted in 6 years"); Oracle is the authoritative current-state source and upstream is the downstream human-readable surface. Most "imports" will actually be Path 2 rewrites citing upstream as source material rather than Path 1 mirrors. **Role map shipped 2026-04-24** (`docs/superpowers/specs/2026-04-24-layer3-role-map.md`): scale revised to ~22-26 notes; 7 roles surfaced; D1 voice resolved to tiered-per-shape; D2 (R7) parked as open bucket. **Two Path-2 rewrites shipped 2026-04-24/25**: `weapon-scripts.md` (first R7 exemplar) and `lightning-gun-customization.md` (second R7+R2 exemplar). Authority-grounding triad and progressive-disclosure structure both confirmed across 2 notes — pending 3rd-instance promotion to README rule. **Skill process improvements landed 2026-04-25**: Phase 7.5 operator consult gate + Phase 5b six-mechanism ruleset scan + help_remarks pull (in `~/.claude/skills/guide-rewrite/SKILL.md`). Remaining: gap-report output format as contributor onboarding kit (continues to grow), next guide rewrite (candidates: `scripting.md` for multi-concept ROI, `player-skins.md` for tighter scope).
- [Sub-pattern 2b: cmdline variant-matrix gaps](#sub-pattern-2b-cmdline-variant-matrix-gaps) — 2026-04-25. **Partially resolved 2026-04-25 (late):** `-U__linux__` added to Apple+Win clang variants flipped 2 of 4 entities — `-gl_ext` now cited at vid_common_gl.c:340, `-allowmultiple` now cited at sys_win.c:682. Remaining 2 (`-nohwtimer` at sys_win.c:572 and `-gl-forward-only-profile` at gl_sdl.c:50) are blocked on the same SDK-stub-headers solve as the deferred `-nopriority` row from the Layer 1 doc_only audit — both call sites live inside function bodies whose surrounding statements use unresolved Windows SDK / SDL types under Linux libclang, so PARSE_INCOMPLETE recovery skips the compound expressions even though simpler `if (COM_CheckParm(...))` calls in the same files succeed.

---

## qw-config dissolution (PRIORITY: before any new extraction work)

**Added:** 2026-04-25 (late session, after the wrap-up surfaced the qw-config = transitional holding pen reminder via realignment-roadmap memory + monorepo OVERVIEW.md).
**Status:** Scoped, not started. **Strict priority gate on QWCL and any future extractor work.** Operator's framing: "complete that transition before we do more extraction work, otherwise it's gonna be more messy" — each extractor added to packages/qw-config is one more thing to relocate when the package is deleted.
**Verification first:** `ls packages/qw-config/scripts/extract-ezquake-unified.py` should still exist. `grep -n 'packages/qw-config' apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` should still return matches at lines ~38, 54, 170. `grep -A1 'qw-config' apps/slipgate-app/package.json` should still show `"qw-config": "workspace:*"`. If any of those return clean, this entry is partially or fully resolved.

### Why now and not later

The realignment-roadmap (`docs/superpowers/specs/2026-04-22-knowledge-service-realignment-roadmap.md`) declared qw-config a transitional "holding pen" with two roles: (a) AST extraction machinery that should live in qw-oracle's build, and (b) legacy scraped JSON consumed by slipgate-app's ConfigViewer that should retire when slipgate switches to oracle-snapshot consumption. Both halves were gated on:

- Half 1 dissolution gate: "oracle's extraction pipeline feature-complete"
- Half 2 dissolution gate: "slipgate migrates to oracle-snapshot consumption"

Phase 2d (FTE/QWCL) and 2e (MVDSV/KTX) are still open per HANDOVER's own definition of feature-complete, AND build-snapshot CLI for slipgate doesn't exist yet. So technically neither gate has cleared by the original framing. **But the operator's call 2026-04-25 reverses the dependency:** doing more extraction work IN qw-config increases the surface area to migrate. Better to migrate now (Half 1 at minimum) so the next extractor (QWCL) lands in its permanent home.

### Half 1 — Extractor relocation to qw-oracle (~1 session)

**Files to move from `packages/qw-config/scripts/`** into a new location under `apps/qw-oracle/`:

- `extract-ezquake-unified.py` — the unified driver
- `extractor_lib/` — Visitor protocol + handlers (`_visitor.py`, `_base.py`, `clang_config.py`, the per-entity handler files)
- `extract-ezquake-rulesets-clang.py` — legacy single-purpose
- `extract-ezquake-token-primitives-clang.py` — legacy single-purpose
- `extract-ezquake-flag-bits-clang.py` — legacy single-purpose
- `_legacy/` — archived per-entity legacy scripts (kept as fallback per memory `project_extraction_pipeline_vision`)
- `seeds/` — hand-authored YAMLs (asset taxonomy, cvar bindings, path rules)
- `tests/` — Python fixture-based tests for parameterized paths + extractor coverage
- `verify-inventory-coverage.ts` — bundle rules vs slipgate inventory dump verifier
- `derive-reserved-subdirs.ts` — bundle helper
- `docs/extraction-comparison-report.md`, `docs/ast-rulesets-diagnostics.log` — extraction docs

**Suggested new location:** `apps/qw-oracle/scripts/extractors/` (a sibling of `scripts/load-knowledge/`). Rationale: keeps the "produces JSON for the loader to consume" relationship adjacent. The scripts directory already houses the loader; extractors fit there.

**AST JSON outputs** (`packages/qw-config/src/data/ezquake-*-ast.json`): currently versioned in git. Two reasonable destinations:
- `apps/qw-oracle/scripts/extractors/output/` (versioned alongside extractors)
- `apps/qw-oracle/data/extractor-output/` (with knowledge.db — but knowledge.db is gitignored and these JSONs are versioned, so the dirs would have different gitignore semantics)
- Decision deferred to next session; the extractor caller in qw-oracle just needs a constant path to point at.

**References to update across the monorepo:**

- `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts`:
  - Line ~38: `PROJECT_EXTRACTOR.ezquake` path
  - Line ~54: `EXTRACTOR_OUTPUT_DIR`
  - Line ~170: `scriptsDir` for legacy extractors
- `apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts` — likely reads seed YAMLs from `packages/qw-config/seeds/` (verify and update)
- `apps/qw-oracle/scripts/load-knowledge/load-assets.ts` — verify any path references
- Memory files referencing `packages/qw-config/scripts/...` paths (per the grep hits at wrap-up time): `reference_qw_teamsay_scripts.md`, `reference_asset_loader_extractor_capabilities.md`, `project_extraction_pipeline_vision.md`, `project_qw_oracle_vision.md`
- Monorepo `OVERVIEW.md` § "qw-config (transitional)" — rewrite to reflect Half 1 done; flag Half 2 as remaining
- `apps/qw-oracle/CLAUDE.md` and `apps/qw-oracle/OVERVIEW.md` — note new extractor location
- Any extraction-review skill or CLI references — `apps/qw-oracle/scripts/load-knowledge/review/` likely has paths

**Slipgate-app coupling during Half 1:** slipgate still needs the legacy scraped JSON at `packages/qw-config/src/data/ezquake-variables.json` etc. Half 1 does NOT delete those — they stay where slipgate expects them. Only the extraction machinery moves. Slipgate's `qw-config` workspace dependency stays intact. The package shrinks but persists.

**Half 1 success criteria:**
- `apps/qw-oracle/scripts/extractors/extract-ezquake-unified.py` runs identically to the current packages/qw-config invocation
- `extract-tag --version head` produces an identical-shape AST JSON output (just at a new path)
- Quality grid stays clean (5/5 + 5/5)
- Slipgate-app still builds and reads its legacy scraped JSON (Half 2 is what touches that)

### Half 2 — Slipgate migration to oracle snapshots (~2-3 sessions, separate)

**Bigger lift, can run in parallel to other extraction work after Half 1 lands.** Builds the bridge that lets slipgate retire the legacy scraped JSON.

**Sub-phases:**

1. **`build-snapshot` CLI in qw-oracle** — produces slipgate-shaped JSON files from Layer 1. Reads from `knowledge.db` and emits the same shape slipgate consumes today (`ezquake-variables.json`, `ezquake-commands.json`, etc.). This is referenced in memory `project_qw_oracle_vision.md` ("snapshot distribution" section) but doesn't exist yet. Tests verify shape parity against current packages/qw-config/src/data/ files.
2. **Slipgate refactor** — point `apps/slipgate-app/src/lib/assets/bundle.ts` and any other consumers at the new snapshot location. Likely: `apps/qw-oracle/data/snapshots/` or a published artifact that slipgate fetches at build time.
3. **Workspace dependency removal** — drop `"qw-config": "workspace:*"` from `apps/slipgate-app/package.json` once all references migrate.
4. **Package deletion** — at this point `packages/qw-config/` has no consumers. Delete the entire directory. Update root `OVERVIEW.md` to remove the "qw-config (transitional)" section. Update memory: `project_realignment_roadmap.md` description (currently "qw-config = dissolving holding pen" → "qw-config dissolved YYYY-MM-DD"). Update slipgate-app's CLAUDE.md if it references qw-config.

**Half 2 success criteria:**
- Slipgate runs the same as today (no functional regression in ConfigViewer)
- `packages/qw-config/` no longer exists in the working tree
- All memory and doc references updated

### Pressure

High for Half 1 — gates QWCL and all subsequent extractor ports. The longer this waits, the more code accumulates in qw-config that needs migration.

Medium for Half 2 — gates the qw-config directory deletion but not new extractor work. Can interleave with FTE / MVDSV / KTX walks.

### Related

- Realignment-roadmap spec: `docs/superpowers/specs/2026-04-22-knowledge-service-realignment-roadmap.md`
- Monorepo OVERVIEW.md § "qw-config (transitional)" — has the framing the operator decided to act on early
- Memory: `project_realignment_roadmap.md` (will need a description update post-Half-1), `project_extraction_pipeline_vision.md`, `project_qw_oracle_vision.md`
- Operator's framing decision logged 2026-04-25 (late) during this wrap-up

---

## QWCL 2.33 extraction (after qw-config Half 1)

**Added:** 2026-04-25 (late session, after deep-time walk reached v3.0 and pivoted on community-security framing).
**Status:** Scoped, not started. **Gated on qw-config dissolution Half 1** (extractor relocation) — the new QWCL extractor should land in qw-oracle's permanent extractor home, not in soon-to-be-deleted packages/qw-config. Strategic priority — first cross-codebase port. Foundational for slipgate-app's planned config converter ("pandoc for configs") that maps QWCL → ezQuake → FTE. Per the 2026-04-25 chat with infiniti, pre-3.0 ezQuake era is de-scoped (security: pre-3.6 has known attack vectors); QWCL is the cleaner "where it all started" reference for the converter.
**Verification first:** `ls research/repos/qwcl-original/QW/client/cl_main.c` should exist. `git -C research/repos/qwcl-original log --oneline | wc -l` should return 1 (single-commit snapshot of the 1996-1998 id Software QuakeWorld release). If both check out, this entry is unresolved.

### Why this matters

The slipgate-app config viewer is the user-facing front for cross-engine config translation. The vision (per `memory/project_config_viewer_next.md`, `memory/project_qw_config.md`): ezQuake users frequently want to migrate to FTE for streaming/recording features, FTE users sometimes want ezQuake for clean baseline; both want a way to reuse muscle memory across clients. Implementing that converter requires a **canonical baseline** of what QW cvars/commands originally were — that is QWCL 2.33. Then ezQuake (already loaded) shows what's been added/renamed/shifted; then FTE (Phase 2d after this) shows the parallel evolution. The converter rules emerge from the three-way diff.

Until now slipgate's converter prep was scraping source code ad-hoc. With Layer 1 in good shape, slipgate will consume Oracle's Layer 1 directly — making the QWCL extraction the first non-ezQuake project loaded into knowledge.db.

### Scout findings (2026-04-25)

Repo state: `research/repos/qwcl-original/` is already cloned. 1 commit (`bf4ac42`), no tags. Layout: `QW/client/`, `QW/server/`, `QW/qw-qc/`, plus `WinQuake/` (id Software's original Quake — out of scope for this entry). 240 .c files across the QW subtree.

Probe results on `qwcl-original/QW/client/cl_main.c` with the current ezQuake clang_args_for(...):
- Diagnostics: 3 errors, all trivial (pre-C99 implicit declarations of `stricmp`, `isspace`). Libclang recovers past them. **No missing-header errors.**
- Visible cursors: 43 `Cvar_RegisterVariable` + 29 `Cmd_AddCommand` + 1 `COM_CheckParm` + 35 `cvar_t` VAR_DECLs.

Whole-tree counts via plain grep on `QW/client/`: ~19 cvar_t literal-init lines (sample is one dir; more in sibling files), 202 `Cvar_RegisterVariable` calls, 116 `Cmd_AddCommand` calls, 133 `COM_CheckParm` calls.

Manifest presence: **NO `help_*.json`, NO `cmdline_params_ids.h`, NO `macro_ids.h`, NO `rulesets.[ch]`, NO `cvar_groups.h`.** Pure pre-tooling 1996-era source.

cvar_t struct shape (from `QW/client/cvar.h`):
```c
typedef struct cvar_s {
    char     *name;
    char     *string;       // default value
    qboolean  archive;      // optional 3rd field
    qboolean  info;         // optional 4th field
    float     value;
    struct cvar_s *next;
}
```
Initialization is positional, 2-4 fields:
- `cvar_t cl_warncmd = {"cl_warncmd", "0"};` (2-field)
- `cvar_t vid_mode = {"vid_mode","0",false};` (3-field, archive flag)
- `cvar_t _windowed_mouse = {"_windowed_mouse", "1", true};` (3-field)

Registration: `Cvar_RegisterVariable(&cvar)` (different function name from ezquake's `Cvar_Register`).

### Implementation plan

The 1-day estimate breaks down roughly:

1. **Project entry plumbing (~1h):** add `qwcl-original` to `Project` type, `PROJECT_REPO_PATH`, `PROJECT_EXTRACTOR`, `PROJECT_SRC_PREFIX` in `apps/qw-oracle/scripts/load-knowledge/`. Schema CHECK constraint on `entities.project` widens to add `qwcl-original` (or `qwcl` — name choice TBD).
2. **New extractor `extract-qwcl-clang.py` (~4-6h)** at `packages/qw-config/scripts/`. Follows `extract-ezquake-unified.py`'s Visitor pattern but with handlers for the qwcl shape:
   - `Cvar_RegisterVariable(&X)` call sites + matching `cvar_t X = {...}` VAR_DECLs to capture cvar definitions and defaults.
   - `Cmd_AddCommand("name", fn)` for commands.
   - `COM_CheckParm("name")` for cmdline params (literal-string mode, since no manifest).
   - Skip rulesets/HUD/macros/keynames/token_primitives/flag_bits — those entity types don't exist in QWCL.
   - Skip the legacy single-purpose extractors (rulesets / token_primitives / flag_bits) — `LEGACY_EXTRACTORS_EZQUAKE` constant is ezquake-only; the QWCL path bypasses it.
3. **Loader no-help-JSON path (~2-3h):** the per-type adapters (load-cvars.ts, load-commands.ts, load-cmdline-params.ts) currently merge AST + help-JSON entries. For QWCL the JSON has only AST entries; the loader should accept entries with no `desc`/`help_desc`/`help_remarks`/etc. The cross-type orphan prune is a no-op here (no help-JSON to mislabel) but should not error. This loader work is **partially reusable for any future pre-help-JSON ezQuake walk** if scope ever changes. Likely lands as defensive guards in build-asset-bundle.ts and the per-type adapters.
4. **First load + grid validation (~1-2h):** `extract-tag --project qwcl-original --version 2.33 --ordinal 233`. Expected: ~200 cvars, ~120 commands, ~50 cmdline_params, no other types. F1 regression probes should all PASS; F2 anomaly probes filter the qwcl entities correctly (no help-JSON-only orphans, no doc_only entities, no flicker because only one version).
5. **Lifecycle metadata (~1h, optional):** infiniti's security framing motivates a `lifecycle_status` field on entities or projects (active / legacy-reference / unsafe-defaults). Not required to ship qwcl extraction but worth adding before slipgate-app consumes the data so consumers can filter on safety. Could defer to a separate session.

### Tests / validation

- E2E: extract qwcl 2.33, load, run grid, verify 5/5 regression PASS + anomaly probes scoped sanely.
- Sample probe (post-load): `sqlite3 data/knowledge.db "SELECT COUNT(*) FROM entities WHERE project='qwcl-original' AND type='cvar'"` ≈ 200.
- Cross-project sanity: pick 5 cvars present in BOTH qwcl-original and ezquake (e.g. `cl_warncmd`, `vid_mode`) and confirm both rows exist with project-scoped first/last_seen versions.
- Default-value capture: `cl_warncmd` should show default `"0"` at qwcl-original 2.33 — the literal-positional-init parsing must work.

### Pressure

Medium. Not blocking ezQuake work. Slipgate-app can't ship the config converter until this lands, but slipgate doesn't have the converter UI built yet either. Doable in 1 session of focused work.

### Related

- Strategic context: chat with infiniti 2026-04-25 (security framing for de-scoping pre-3.0 ezQuake), user note that this is the "first of three" for the converter (QWCL → ezQuake → FTE)
- Memory: `project_config_viewer_next.md`, `project_qw_config.md`, `project_extraction_pipeline_vision.md` (all need refresh post-this-session)
- Repo: `research/repos/qwcl-original/` (already cloned, single commit)
- Cross-codebase pattern reference: ezquake's `extract-ezquake-unified.py` + Visitor protocol at `packages/qw-config/scripts/extractor_lib/_visitor.py`
- Walk procedure (if loading multiple QWCL versions ever surfaces — though only 2.33 is currently in the repo): `apps/qw-oracle/docs/layer1-extraction-roadmap.md` § "Walk procedure"

---

## Phase 2d-2h: remaining QW knowledge rollout

**Added:** 2026-04-18 (originally as "Phase 2 schema + rollout")
**Updated:** 2026-04-20 — Phase 2c (4 more ezQuake types), 2c.5 (4 more + schema v2), and 2c.6 (asset consumption + schema v3) all shipped. ezQuake is fully loaded at head across 9 entity types (3849 entities total).
**Updated:** 2026-04-25 (late) — Deep-time walk reached **v3.0 floor**: 14 ezQuake versions clean (v3.0, v3.0.1, 3.1, 3.2, 3.2.1, 3.2.2, 3.2.3, 3.6.0/.1/.2/.5/.6/.8/.9, head). Pre-3.0 era explicitly de-scoped on community-security framing (infiniti). Walk infrastructure shipped: `extract-tag --skip-prune` + `prune-cross-type-orphans` finalize CLI + per-version `backfill_match` detection + flicker-probe doc_only filter — all reusable for FTE/MVDSV/KTX walks. Schema v9 stamped (per-version transition log). Phase 2d ordering REVISED: QWCL 2.33 is now first cross-codebase port (foundational for slipgate-app config converter); FTE follows. See dedicated `QWCL 2.33 extraction` entry above.
**Status:** ezQuake head + deep-time walk complete (v3.0 to head). Next terminal session priorities:

### What shipped through Phase 2c.6

- **Schema v3** at `apps/qw-oracle/scripts/load-knowledge/schema.ts` — entities with 9 type values (cvar, command, macro, cmdline_param, keyname, hud_element, ruleset, token_primitive, asset_category) plus per-type version tables and 4 asset relation tables (asset_extensions, asset_path_rules, asset_cvar_bindings, asset_loader_sites).
- **Loader pipeline** with `load-version`, `load-assets`, `diff`, `enrich` CLIs. Seed-first + AST auto-pass reconciliation proven against ezQuake head (bea2515). Phase 2b loader follow-ups (version-string comparison, blame memoization, src-prefix map, extractor trailing-whitespace) all drained 2026-04-20.
- **Extractors** in `packages/qw-config/scripts/` for all 8 ezQuake entity types plus asset loader sites, cvar bindings, path-rules verifier. Hand-authored seed YAMLs in `packages/qw-config/seeds/` for asset taxonomy and cvar bindings.
- **End-to-end loaded**: 3849 ezQuake entities, 110 asset_loader_sites, 26 asset_cvar_bindings, 14 source-verified path_rules, 17 asset_categories.

### Remaining sub-phases (roadmap reordered 2026-04-20)

**Tier 1 — Phase 2f Historical backfill (UNBLOCKED 2026-04-24).** Walk every ezQuake tag, diff consecutive tags, git-blame → PR enrichment. Reuses all extractors; pure orchestration. **Sanity-sample calibration cleared the same day:** 4 tag pairs eyeball-reviewed (3.6.5→3.6.6 regression + 3.6.1→3.6.2 oldest + 3.6.6→3.6.8 recent + 3.6.2→3.6.5 stress), all §8 thresholds hold at starting values, P1 detector bug (commit-UNKNOWN sentinel) fixed in-flight in `clusters.ts`, P3 semantic-pass abbreviation-bridge captured to its own HANDOVER entry. Full calibration note at `docs/superpowers/specs/2026-04-24-extraction-review-sanity-sample-calibration.md`. Extraction is ~55x faster via `extract-ezquake-unified.py` (shared-walk + 12-core parallelism, ~14s per tag vs 749s legacy sequential). Byte-equivalent to legacy output across HEAD + 3.6.6 + 3.6.0 + 3.2.3. Remaining cost is the per-pair walk time (operator judgment, not machine throughput).

**Tier 2 — Phase 2d FTE cvars.** First second-engine port. Biggest structural risk left — validates the project-keyed schema on a codebase with different layout (`engine/client/`, `engine/server/`, etc.). The `PROJECT_SRC_PREFIX` map in `diff-versions.ts` has an empty FTE entry signaling the extractor must emit repo-relative paths directly.

**Tier 3 — Phase 2e MVDSV + KTX.** MVDSV is a small port (189 cvars, same struct form). KTX is tree-sitter-based (use `py-tree-sitter`, NOT Node `tree-sitter@0.25` which segfaulted on WSL/Node 20 during the spike).

**Tier 4 — Phase 2g MCP tool upgrades (deprioritized).** Adds `version` parameter to `lookup_entity`, new `get_entity_history` tool, version/date filters on `search_entities`. Was higher priority before the dir-browser context shifted — dir-browser reads SQLite directly so MCP upgrades serve Oracle-bot / Claude-session users only.

**Tier 5 — Layer 3 curated content.** Concept notes adapted from ezquake.com docs and community wisdom. Orthogonal to data expansion.

**Tier 6 — Phase 2h Automation.** Scheduled job to detect new tags, run delta extraction, enrich, insert.

### Out of scope for Phase 2

- **dusty-ktx QuakeC client module (`qcsrc/`)** — different language, needs its own spike later.
- **QWFWD** — not yet cloned to `research/repos/`. Add to Phase 2e when cloned.
- **Slipgate app refactor to consume new data** — deliberately deferred by the user. Phase 2 is about building the solid data foundation first; app consumption comes after the DB is complete.
- **Layer 2 / Layer 3 Oracle work** (chat log summarization, curated concept notes) — orthogonal track, proceeds independently.

### Key references

- Spike output: `packages/qw-config/src/data/ezquake-variables-ast.json`
- Spike report: `packages/qw-config/docs/extraction-comparison-report.md`
- Oracle design spec: `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md`
- Memory: `project_qw_oracle_vision.md` (updated 2026-04-18 to reflect spike completion)
- Memory: `reference_libclang_ezquake_extraction.md` (WSL setup + ezQuake-specific conditional macros)

### Pressure

Not blocking anything. User is proceeding at their own pace. No freeze, no deadline.

---

## Semantic-pass abbreviation-bridge heuristic

**Added:** 2026-04-24 (sanity-sample calibration P3)
**Status:** Spec-ready. Not a Phase 2f blocker — operators catch these at walk time. Worth fixing during or before Phase 2f walks reach the affected pairs for better automation.
**Verification first:** `grep -n "abbreviation\|startsWith.*entity\|prefix.*release" apps/qw-oracle/scripts/load-knowledge/review/semantic-match.ts` — if any match surfaces, this entry has been acted on and should be removed or updated.

The semantic pass in `apps/qw-oracle/scripts/load-knowledge/review/semantic-match.ts` currently matches release-note bodies to clusters via (a) entity-name token overlap, (b) commit-message prefix tags (SECURITY:, RENDERER:, etc.), and (c) cross-name transforms for protocol extensions (`FTE_PEXT_*` ↔ `cl_pext_*`). It does not bridge **abbreviation ↔ expansion**.

### Concrete case that failed during calibration

3.6.1 → 3.6.2 has a 55-member cluster (PR 567 by ewhac, "INPUT: Restore joystick support") containing entities `joyadvanced`, `joyflysensitivity`, `joypitchsensitivity`, `joyindex`, `joyname`, `aux1`-`aux32`, etc. The associated release-note bullet reads *"Restore joystick support (ewhac)"*. The semantic pass did not propose cluster membership because no entity token literally equals "joystick" — they tokenize as `joy*` single-token names (no underscore) and `aux*`.

A human would bridge trivially: "joystick" starts with "joy", which is the common prefix of N cluster members. The detector should do the same.

### Proposed heuristic

Add to `semantic-match.ts` a fourth match path after (a)-(c):

1. For each cluster, compute a `prefix_signature`: the set of first-3-char substrings shared by at least 3 cluster members' first token. Example: joy-cluster → `{'joy'}`; hud_ammo cluster → `{'hud'}`; gl_outline → `{'gl_'}` (rejected, contains underscore — single-token only).
2. For each release-note body, tokenize to words (split on whitespace + punctuation).
3. For each word W of length ≥ 6, test whether W starts with any cluster's `prefix_signature` entry.
4. When match, propose cluster membership with rationale: *"abbreviation match: release-note word 'joystick' starts with cluster prefix 'joy' (N members share prefix)"*.

### Guard rails

- **Min word length ≥ 6:** avoids short-word coincidences. "joystick" (8) matches; "joy" (3) would not trigger match against itself (too short to be release-note expansion of anything).
- **Min shared-prefix char length ≥ 3:** avoids 2-char noise.
- **Min members sharing prefix ≥ 3:** avoids 2-member coincidences. 3+ members sharing `joy` as first 3 chars is a real family signal; 2 is too noisy.
- **Single-token names only:** gl_outline-family already clusters via `prefix:gl_outline` in the mechanical pass. Abbreviation bridge is specifically for entities whose names are single tokens without underscores (joy*, aux*, vmi*, etc.) where the mechanical prefix pass can't help.
- **Over-proposal is the designed failure mode.** Semantic pass output is a hint for operator confirmation at walk time. The mechanical pass's "17/26 annotated on 3.6.5→3.6.6" already demonstrates operators handle over-propose-then-filter comfortably.

### Known false-positive risk

"hudson" (6 chars) starts with "hud" → would propose match to a `hud_*` cluster even though it's coincidence. 3.6.2→3.6.5 release-notes contain no such words, but future tags may. Acceptable — operator rejects at walk. If the noise rate becomes a problem, tighten min-word-length to 7 or require the shared prefix to appear in ≥5 members.

### Test cases to include

- 3.6.1 → 3.6.2 release_notes:25 ("Restore joystick support (ewhac)") should propose joy-cluster.
- Grep past ezQuake release-notes for other candidates (particle, screen, console, etc.) and verify each proposes correctly or benignly misses.
- Negative: release-notes with no abbreviation-expansion content should not over-propose.

### File inventory

- Modify: `apps/qw-oracle/scripts/load-knowledge/review/semantic-match.ts`
- Verify: re-run `review --project ezquake --from 3.6.1 --to 3.6.2` and confirm release_notes:25 gains `proposed_cluster_id` pointing at the joystick cluster.

### Pressure

Low. Not blocking Phase 2f. Real walks will catch the gap at operator judgment time. If Phase 2f walks reach 3.6.1 → 3.6.2 before this ships, that's fine — manual bridge at walk.

---

## Layer 1 doc_only audit — closed with one deferred row

**Added:** 2026-04-24 (during weapon-scripts guide-rewrite Phase 3+4).
**Closed:** 2026-04-25 after seven shipped fixes (six extractor patterns + one loader dedup + one architectural multi-variant-parse change) with full primary-source verification per fix.
**Verification first:** `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT type, COUNT(*) FROM entities WHERE project='ezquake' AND source_state='doc_only' GROUP BY type"` — current state: 160 cvar, 45 command, 3 cmdline_param, 2 macro = 210. Was 269 before fixes (269 → 239 extractor fixes → 232 Item A platform variants → 210 Item B type-mismatch dedup).

### What shipped (2026-04-25)

| Commit | Pattern | Recovery |
|---|---|---|
| c6fdcf3 | P5a (move `-DSERVER_ONLY` from client clang args to server) | +1 cvar |
| a099231 | P1 (detect `Cmd_AddLegacyCommand(old, new)` alias shims) | +40 commands (16 audit-flagged + 24 newly-discovered) |
| 8f67843 | P2 (struct-literal table: `log_t logs[]` in sv_ccmds.c) | +7 commands |
| 0f8f170 | P3 (nested cvar_t tables: `custom_model_color_t custom_model_colors[]`) | +10 cvars |
| 5dd466c | P6 (resolve `#define NAME "literal"` at Cmd_AddCommand call sites) | +1 command (vid_reload) |
| Item A | 4-variant parse architecture: `clang_args_win_for` + `clang_args_apple_for`, unified driver runs two extra TU parses per file with variant="client". Handlers unchanged — existing `variant == "client"` primary path covers the additive detection; per-file `_seen_in_file` dedup handles repeat visits. | +7 cvars (cl_verify_qwprotocol, con_deadkey, demo_capture_{codec,mp3,mp3_kbps,vid_maxlen}, in_ignore_deadkeys); bonus +1 asset cvar binding (demo_capture_dir at movie.c:430, WAVCaptureStart) and +1 cmdline usage site (gl_sdl.c:85). |

**Net:** 18 cvars flipped + 19 commands flipped + 24 new command entities discovered + 1 asset binding + 1 cmdline usage. Zero regressions (per-type before/after diff on all previously-source-backed names showed none lost).

### Pattern 4 reclassified — NOT an extractor bug

Handler `handler_macros.py` already parses `MACRO_DEF(name)` tokens from `macro_ids.h` at setup. The three remaining `doc_only` macro-family rows (`mp3_volume` as command, `mp3_volume` as macro, `mp3info` as macro) are genuine cat2 drift: the MACRO_DEF declarations persist in source but the corresponding `Cmd_AddMacro(macro_mp3_volume, ...)` call sites were removed when the MP3 feature was deprecated. These belong in the upstream help-JSON gap report, not the extractor fix queue.

### Deferred — `-nopriority` cmdline_param

Item A shipped 7 of 8 expected rows. The eighth — `-nopriority` at `sv_sys_win.c:645` — remains unrecovered. The 4-variant architecture is architecturally sound and reaches the file, but `sv_sys_win.c`'s `Sys_Init` function body references Windows SDK types (`VER_PLATFORM_WIN32_NT`, `GetCurrentProcess()`, `SetPriorityClass`, `HIGH_PRIORITY_CLASS`) via `#include <mmsystem.h>` and `<winsock2.h>` — headers that don't exist in the Linux libclang environment. With `PARSE_INCOMPLETE`, the file's top-level parses and the two `COM_CheckParm("-noerrormsgbox")` calls at lines 374/409 ARE captured (those call sites live in function bodies with fewer Windows SDK dependencies). The Sys_Init body at line ~623 refuses to parse cleanly past the SDL.h / winsock2.h errors, so the COM_CheckParm at line 645 is never visited by the walker.

Recovery options when this becomes pressure:
1. **Stub Windows SDK headers.** A minimal directory of empty/declarative `.h` files for winsock2, mmsystem, SDL, etc. at the root of `research/repos/ezquake-source/win-sdk-stubs/`, added to `clang_args_win_for` via `-I`. Adds env complexity; unblocks parsing of all Windows-specific TUs in one go.
2. **Hand-register the -nopriority row** in `help_cmdline_params.json` upstream and treat Linux-side extraction as silent on Windows-SDK-dependent call sites.
3. **Source refactor upstream** — split Sys_Init so the COM_CheckParm call isn't intertwined with Windows-SDK type usage. Unlikely to happen just for Oracle's benefit.

Low priority. Deferred until MVDSV or another engine hits the same wall — then solve in one place.

### Item B — help-JSON type-mismatch dedup (SHIPPED, commit `146cd73`)

Loader-side cleanup added to `load-version.ts`. At the end of each load-version transaction, entities of the current type with `source_state='doc_only'` and a same-name same-project `source_backed` counterpart under any OTHER type are deleted (version rows, transitions, overrides, entity row). Per-type-scoped + idempotent — each re-run cleans only what its own type would produce; already-clean DBs yield zero prunes.

Initial cleanup on ezquake head: **22 orphan rows pruned**:
- 15 `command doc_only` (12 HUD elements labeled-as-command in help_commands.json; 3 cvars labeled-as-command: `password`, `spectator_password`, `vid_fullscreen`)
- 7 `cvar doc_only` (2 commands labeled-as-cvar: `floodprotmsg`, `userdir`; 5 `scr_weaponstats_*` that became `command source_backed` via P1's Cmd_AddLegacyCommand detection while help_variables.json still lists them as cvars)

Verify-after-cleanup: `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT name, type, source_state FROM entities WHERE project='ezquake' AND name='radar' ORDER BY type"` — returns one row (`hud_element source_backed`). The earlier `command doc_only` orphan is gone.

### Pressure

None. Audit closed. `-nopriority` remains a known deferral with a clear recovery path (Windows SDK stub headers) if MVDSV/FTE need the same solve later.

### Related

- Findings doc (supersedes retraction): `docs/superpowers/specs/2026-04-24-layer1-doc-only-audit-findings.md` — being rewritten in same session
- Raw sweep TSVs: `docs/superpowers/specs/assets/2026-04-24-doc-only-sweep.tsv` + `assets/2026-04-24-doc-only-cat1-semantic.tsv`
- Extractor reference: `memory/reference_libclang_ezquake_extraction.md`, `memory/reference_asset_loader_extractor_capabilities.md`
- Schema field: `source_state` on `entities` table — `source_backed | doc_only | source_retired`. Load-bearing for data-quality queries.
- Cross-session lesson: every derived conclusion needs a primary-source check. This session overturned two prior rounds of analysis; the pattern of "analysis looked right at step N, was actually wrong" appears when queries aren't structure-verified first. Always `jq 'keys'` or equivalent before assuming the shape of what you're querying.

---

## Sub-pattern 2b: cmdline variant-matrix gaps

**Added:** 2026-04-25 (surfaced during 3.6.0 deep-time walk, parked while shipping 2a + case-fold-merge + Path 2).
**Updated:** 2026-04-25 late — Recovery option 1 (`-U__linux__` to Apple+Win variants) shipped and flipped 2 of 4 entities. `clang_config.py` change in commit forthcoming.
**Status:** Partial. 2 entities now source-cited at head: `-gl_ext` at vid_common_gl.c:340 (Win/Apple variant catches the FreeBSD/Apple block now that `__linux__` is undef'd) and `-allowmultiple` at sys_win.c:682 (Win variant reaches the simpler `Sys_Init_` body). 2 entities remain manifest-fallback only and are gated on a separate SDK-stub-headers solve.
**Verification first:** check the AST output JSON. From `apps/qw-oracle/`: `python3 -c "import json; d=json.load(open('../../packages/qw-config/src/data/ezquake-cmdline-params-ast.json')); [print(k, len(d['params'][k]['ast']['usage_sites']) if d['params'][k]['ast'] else 0) for k in ['-gl_ext', '-nohwtimer', '-allowmultiple', '-gl-forward-only-profile']]"`. Expected current counts: `-gl_ext=1`, `-nohwtimer=0`, `-allowmultiple=1`, `-gl-forward-only-profile=0`. If `-nohwtimer` or `-gl-forward-only-profile` now shows ≥1, the SDK stub-headers solve has landed and this entry can be closed entirely.

### Remaining unresolved entities

Two cmdline_params still rely on the manifest-fallback citation only; their real `COM_CheckParm` call sites stay invisible to libclang under Linux:

| Entity | Real call site | Why libclang misses it |
|---|---|---|
| `-nohwtimer` | `sys_win.c:572` (inside `Sys_InitDoubleTime`) | Function body opens with `__int64 freq; ... QueryPerformanceFrequency((LARGE_INTEGER *)&freq)`. Windows SDK types (`__int64`, `LARGE_INTEGER`, `QueryPerformanceFrequency`) fail under Linux libclang; PARSE_INCOMPLETE recovery skips the compound expression containing the COM_CheckParm. Note: the simpler `if (COM_CheckParm(...))` at sys_win.c:682 (in `Sys_Init_`) and sys_win.c:1278 (in `WinMain`) ARE reached by the Win variant — only function bodies whose surrounding code can't be type-checked get skipped. |
| `-gl-forward-only-profile` | `gl_sdl.c:50` (inside `GL_SDL_SetupAttributes`) | Function body uses unresolved SDL macros (`SDL_GL_CONTEXT_PROFILE_MASK`, `SDL_GL_CONTEXT_FORWARD_COMPATIBLE_FLAG`, etc.) because `SDL.h` isn't found under Linux libclang. The COM_CheckParm at L50 is embedded in a compound expression `flags \|= cond && COM_CheckParm(X) ? Y : 0`; the parse-incomplete state of the surrounding statements blocks the cursor from surfacing. The simpler `if (COM_CheckParm(...))` calls at L78 and L97 in the next function (`GL_SDL_CreateBestContext`) DO surface — same SDL-missing context, simpler call structure. |

Probe-confirmed 2026-04-25 by directly parsing gl_sdl.c with the Linux client args: libclang surfaces only L78 and L97, not L50, despite L50 being in the always-compiled `#else`-of-`#ifdef __APPLE__` branch.

### Recovery option (consolidated with `-nopriority`)

Both remaining entities share the root cause of the deferred `-nopriority` cmdline_param in the (closed) Layer 1 doc_only audit: function bodies whose surrounding code references SDK types Linux libclang can't resolve. The previously-listed Recovery option 2 (stub Windows SDK / SDL headers under `research/repos/ezquake-source/win-sdk-stubs/`) would unblock all three at once. When MVDSV or FTE eventually hits the same wall, a stub-headers directory becomes the cleanest single solve for ezQuake / FTE / MVDSV / KTX simultaneously. Until then, manifest-fallback coverage means these are not grid anomalies.

### Pressure

Low. Manifest-fallback citations satisfy the grid; the residual gap is `loader_sites` analytics fidelity (queries like "which files actually call -nohwtimer" return empty for these two). The fix is consolidated with `-nopriority` so a single stub-headers effort closes all three deferred entities together.

### Related

- Cmdline handler: `packages/qw-config/scripts/extractor_lib/handler_cmdline.py`
- 4-variant clang args: `packages/qw-config/scripts/extractor_lib/clang_config.py` (now with `-U__linux__` for Apple/Win)
- AST output: `packages/qw-config/src/data/ezquake-cmdline-params-ast.json`
- Loader fallback: `apps/qw-oracle/scripts/load-knowledge/load-cmdline-params.ts:28-40`
- Sibling deferred row: Layer 1 doc_only audit § Deferred — `-nopriority` cmdline_param

---

## Interactive HTML dashboard (deferred)

**Added:** 2026-04-22 late evening (during Pass 3 planning, after the design review surfaced conflicts between the original HTML dashboard plan and the monorepo doc philosophy).
**Status:** Shelved, not killed. Pass 3 shipped as a GitHub-navigable markdown reshape of `apps/qw-oracle/docs/entity-types.md` instead of a standalone HTML dashboard.
**Verification first:** `ls docs/architecture.html docs/architecture-data.json 2>&1` - if either exists, this entry has been acted on and should be removed or updated.

Why deferred (design review findings):

1. The doc-philosophy template has no class for a monorepo-wide HTML dashboard. Layer 1 quartet + Layer 2 conditionals + Layer 3 in-app reference docs is the full shape. Adding `docs/architecture.html` at monorepo root is a new artifact class that hasn't been planned.
2. Separate `.html` + `.json` forces double-bookkeeping between the authoritative JSON and the HTML's embedded copy (browsers block fetch on `file://`). That's exactly the drift risk the realignment is paying down.
3. GitHub doesn't execute HTML dashboards in the repo UI; a dashboard is only useful via GitHub Pages or a local clone. For the "external reviewers can see what we extract" goal, GitHub-rendered markdown is strictly better than HTML that requires a deploy or checkout.
4. The markdown reshape achieves the same reviewer outcome (top-of-file TOC + collapsible per-entity blocks + status-at-a-glance) with one file touched, zero build step, and doc-philosophy compliance.

### Unshelve triggers

Revisit if either fires:

- `entity-types.md` stops serving the user's mental-model-refresh need - i.e. scrolling through 14 collapsibles becomes meaningfully worse than a click-to-drill dashboard for quick orientation.
- External reviewers ask for something more visual than a markdown document.

### Fix shape (if unshelved)

The right shape for a dashboard at that point is likely:

- A ~50-line `scripts/build-dashboard.ts` (Bun/Node) that reads `apps/qw-oracle/docs/entity-types.md` and writes `docs/architecture.html` + `docs/architecture-data.json`. Markdown stays the single source; the HTML is regenerated.
- GitHub Pages deploy to publish the dashboard at a stable URL, so external reviewers click a link rather than clone the repo.
- docs-check integration to flag dashboard staleness when `entity-types.md` or the extractors change.

Committed reference assets for this future work:

- Visual target: `docs/superpowers/specs/assets/2026-04-22-dashboard-mockup-v2.html` (three-column + detail-panel pattern).
- Source content: `apps/qw-oracle/docs/entity-types.md` (10 entity types + 4 asset sub-relations with Pass 2 verification-status audit).

### Pressure

Zero. Not blocking anything. Only revive if the triggers above actually fire, not speculatively.

### Related

- Pass 3 final shape: `docs/superpowers/specs/2026-04-22-knowledge-service-realignment-roadmap.md` § "Pass 3 — GitHub-navigable per-entity doc + README refresh" (revised 2026-04-22 late evening to drop the dashboard deliverables).
- Doc philosophy spec that drove the revision: `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`.

## Workstream B: concept-note authoring scaffolding

**Added:** 2026-04-23 (session-close, after shakedown walk)
**Status:** Frontmatter schema + two-path framing + earn-the-note tests + note-shape taxonomy + all 4 note bodies landed in `apps/qw-oracle/concept-notes/` (2026-04-23). Still open: template MDX-compatibility test + authoring-ritual shape (lower priority now — 4 notes drafted successfully without formal ritual tooling, suggests natural authoring flow is sufficient).
**Verification first:** grep `concept-notes/README.md` for `primary_contributors` — if present, full frontmatter is landed. `ls apps/qw-oracle/concept-notes/*.md | wc -l` should return 7 (6 notes + README).

Concept-note bodies aren't the review skill's job; this workstream handled the non-body infrastructure. With all 4 queued bodies drafted and template stabilized across 3 drafting sessions, remaining items are minor polish rather than blockers.

### Done

- **Provenance frontmatter schema.** Fields `authored_by`, `source_url`, `imported_from`, `last_imported_at`, `upstream_status`, `upstream_target`, `primary_contributors` added to the template in `concept-notes/README.md`. Applies to both imported (path 1) and authored-here (path 2) notes.
- **Two-path curation framing.** Added to `concept-notes/README.md` ahead of the earn-the-note tests.
- **Earn-the-note tests.** 5 tests explicitly documented in `concept-notes/README.md` (previously only implicit in the `last_updated: 2026-04-22` bootstrap notes).
- **Entity-ref format formalized.** `<project>:<kind>:<identifier>` vocabulary including `ezquake:pr:<n>` for load-bearing PR provenance.
- **Topic vocabulary guidance.** `domain-guide` is intentionally broad / audience-agnostic; new topic values only when existing ones would actively miscategorize.
- **Recognized note shapes enumerated.** Narrative/history, taxonomy/classifier, domain walkthrough, policy+iteration-story — each with an exemplar note in the directory.
- **All 4 queued concept-note bodies from the 3.6.5 -> 3.6.6 shakedown walk landed** (2026-04-23 same-day). Security family (`client-side-server-exec-allowlist.md`), skywind (`skywind-animated-skyboxes.md`), FTE protocol extensions (`completing-legacy-fte-protocol-extensions.md`), ruleset anti-script pattern (`ruleset-anti-script-restriction-pattern.md`). Concept-notes directory now holds 6 notes (2 bootstrap + 4 from this session). **Correction captured during Track 2 drafting:** the greenfield-vs-retrofit framing in the original walk rationale was inaccurate — the 5 restriction primitives did not exist when smackdrive launched (Oct 2024); all 4 rulesets were retrofitted in one commit 2dbb3f1d (Feb 2025). The note reflects ground truth rather than the paraphrased rationale.

### Still open

- **Template MDX-compatibility test.** Generate one test note in the current template, check it renders through ezquake.com's vitepress pipeline (`research/repos/ezquake-docs/`). Fix template before writing four note bodies in a shape that won't PR cleanly upstream. Probably a 30-minute experiment: copy one concept note into `research/repos/ezquake-docs/docs/docs/_test.md`, run the vitepress build, eyeball output, delete.
- **Authoring ritual.** Session prompt shape, disposition-record handoff (skill -> author), cross-reference handling. Possibly a small skill or slash command; possibly just documentation in the README. Decide after drafting the first note (skywind) — implementation-level rituals are best derived from real experience.

### Pressure

Low. Does not block any other work. The four note bodies can be drafted without the MDX test — but if the test surfaces a template change, the notes would need retrofitting. Cheap to do the test first; cheap to retrofit if needed.

### Related

- Design doc: `docs/superpowers/specs/2026-04-23-layer3-pivot-design.md` (Workstream B section)
- Authoring template: `apps/qw-oracle/concept-notes/README.md`
- The 4 drafted notes: `apps/qw-oracle/concept-notes/{client-side-server-exec-allowlist,skywind-animated-skyboxes,completing-legacy-fte-protocol-extensions,ruleset-anti-script-restriction-pattern}.md`

---

## Workstream C: /docs ingest pipeline prep

**Added:** 2026-04-23 (session-close, after shakedown walk)
**Status:** Audit done (2026-04-24). License resolved by operator decision — treat as CC-BY-4.0. **Framing flipped 2026-04-25** after vikpe Discord confirmation that ezquake.com/docs is single-maintainer-plus-stepped-back: Oracle is the producer, ezquake.com is the downstream consumer, most "imports" become Path 2 rewrites. **Role map shipped 2026-04-24** resolving scale + voice questions (see Item 4). Gap-report format open and reframed as contributor onboarding kit. First Path-2 rewrite session on `weapon-scripts` pending.
**Verification first:** `ls research/repos/ezquake-docs/docs/docs/*.md | wc -l` should return 26; `ls research/repos/ezquake-docs/docs/docs/settings/*.md | wc -l` should return ~7-8. Total ~33 guide pages.

Preparation for importing ezquake.com/docs guide content into `apps/qw-oracle/concept-notes/` as Layer 3 baseline. No ingest work starts until remaining items resolve.

### Item 1 — audit (DONE 2026-04-24)

Full per-page classification of 30 guide pages. Buckets: **15 mirror** (community-earned guides worth importing), **10 ignore** (auto-gen reference already in Layer 1 — the 9 `settings/*.md` + commands/structure/faq), **4 split** (guide + reference mix requiring separation: command-line-parameters, macros, textures, triggers), **1 historical** (`upgrading.md`, pre-3.5 changelog). 32/33 guide pages content-stale since 2022-11-21, confirming the guide-frozen / reference-auto-updated asymmetry.

Mirror set (import candidates): `charsets.md`, `crosshairs.md`, `fakeshaft.md`, `frag-tracker.md`, `hud.md`, `independent-physics.md`, `message-filtering.md`, `multiview.md`, `particles.md`, `player-skins.md`, `scripting.md`, `server-browser.md`, `teamplay-communication.md`, `video-capture.md`, `voice-support.md`, `weapon-scripts.md`.

Split set (partial import, guide section only): `command-line-parameters.md`, `macros.md`, `textures.md`, `triggers.md`.

### Item 2 — license (RESOLVED 2026-04-24 by operator decision)

`QW-Group/ezquake.com` has no LICENSE file and `gh api` returns `"license": null`. Vikpe (original author of ezquake.com and /docs, confirmed in Discord 2026-04-24) stated his intent was GPL-2.0 "same as client." Adjacent `QW-Group/ezquake-source` is GPL-2.0.

**Operator decision 2026-04-24:** treat mirrored content as CC-BY-4.0. Rational community-scale risk assessment — guides were originally curated from old QW forums / articles / self-written over many years; original author consented verbally; QW community is small and nobody will contest a mirror. No LICENSE commit required before proceeding. Save the Discord screenshot as evidence alongside the per-note `source_url` + `primary_contributors` frontmatter.

**Not in scope for this HANDOVER:** persuading QW-Group to add a formal LICENSE file. If a future consumer ever needs cleaner legal footing, revisit.

### Item 3 — gap-report output format as contributor onboarding kit (OPEN)

Machine-readable + human-readable digest emitted per review run listing new entities that are reference-present but guide-absent, with enough surrounding context that a non-Oracle contributor can write the missing page from solid ground rather than from scratch.

**Reframed 2026-04-25** after Discord with vikpe: the guide corpus has had "1 edit beyond myself submitted in 6 years." The gap report isn't a PR queue — it's an onboarding kit. Someone wanting to help update ezquake.com should consume the gap report + Oracle's Layer 1/2/3 snapshots and be able to write a draft page without doing fresh research.

Output shape implications:

- **Per-gap entry carries everything needed to write the page:** Layer 1 facts (when added, by whom, related entities), Layer 2 testimony pointers (community discussion excerpts with message IDs), Layer 3 concept-note cross-reference if we've authored one.
- **Target primary format: Markdown** (human-readable, PR-ready-ish) with a JSON sidecar for future tooling. Not JSON-only — humans are the intended consumers of this specific output.
- **Explicit "suggested page target"** per gap (new page vs existing page + section vs multi-page split) to lower onboarding friction.

**Canonical "needs human docs" source set:** the help JSON emits `system-generated: true` for rows the extractor produced from source without any human-authored description. Combined with absent-desc detection (Workstream A item 8), the predicate `system-generated: true && desc: absent` is the canonical upstream-documentation-gap set — cvars/commands that ezquake.com reference pages auto-surface with empty descriptions because no human has written docs. Separate from the guide-gap set (entity undocumented in any `docs/docs/*.md` guide page). Both categories belong in the gap report but should be distinguished: help-desc PR to ezQuake vs guide-page PR to ezquake.com.

### Item 4 — role map + voice decision (DONE 2026-04-24)

Fresh-session analysis of the full 20-candidate /docs corpus against the 6 existing concept notes. Artifact at `docs/superpowers/specs/2026-04-24-layer3-role-map.md` (3873 words, evidence-cited). Resolves three load-bearing questions before Workstream C execution starts:

- **Scale.** Revised from ~15 mirror notes to **~22-26 Layer 3 notes** (11 full-note + 4 multi-concept guides yielding 2-3 notes each + 4 nugget-patch absorbed into siblings + 6 existing notes). Ignore-set validated (9 settings + commands.md auto-gen; `structure.md` is trivially-absorbable convention, not auto-gen — minor rationale correction from the audit).
- **D1 voice.** Seven roles surface in the corpus (R1 why-it-exists, R2 feature-family workflow, R3 pattern library, R4 convention specs, R5 infrastructure, R6 short how-to, R7 opinionated best-practice). Existing 6 notes are all R5. Incoming ~18 guide-derived notes are mostly R2/R3. **Tiered-voice decision**: one skeleton, voice register and length flex per shape. Captured in `concept-notes/README.md` § "Voice and length by shape" with a per-shape table. Two new shapes added to the shape catalog (Pattern library, Short how-to).
- **D2 R7.** Opinionated best-practice is absent from /docs (guides are toolbox-presentation, not normative) and absent from existing notes (template excludes editorial voice). **Parked as open bucket**: not required for C, not forbidden later. If/when R7 content is authored, it comes from Layer 2 testimony synthesis, separate authoring lane, does not block this workstream. README `Outside current Layer 3 scope` paragraph captures the parking.

**D3-D6 deferred to per-guide judgment during walks**: multi-concept splitting (4 guides), Layer-1-seed-vs-Layer-3 boundary for ~3 convention specs, R6 short-how-to posture, Path-1-vs-Path-2 per guide. No blocker; per-walk operator call.

**Coverage gaps** flagged in the role-map spec § 5: rulesets, cmdline params, macros, keynames, token primitives, flag bits, HUD child cvars at scale, and all post-2022 features are unserved by /docs. The gap-report output format (Item 3) should surface these for contributor onboarding.

### Why prep-before-ingest

The two-halves asymmetry of ezquake.com/docs (reference auto-updates via `data/ezquake/*.json`; guides frozen at ~2022-11-21) means the import target is well-scoped (the 33 guide pages, not the reference data). But the shape of the relationship with ezquake.com maintainers is load-bearing for the longer-term bi-directional flow — rushing into mirroring without license confirmation or nano's buy-in risks building on an unstable foundation.

### Pressure

Low. No downstream work blocked. Can proceed in parallel with Workstream A and B.

### Related

- Design doc: `docs/superpowers/specs/2026-04-23-layer3-pivot-design.md` (Workstream C section)
- Role map: `docs/superpowers/specs/2026-04-24-layer3-role-map.md` (evidence-based; resolves scale, D1, D2)
- Template with voice guidance: `apps/qw-oracle/concept-notes/README.md` § "Voice and length by shape"
- ezquake.com repo cloned: `research/repos/ezquake-docs/`
- Memory: `memory/project_layer3_two_path_curation.md` (updated 2026-04-23)
- Git-trail audit finding: 32/33 guide pages last content-edited <= 2022-11-21

---
