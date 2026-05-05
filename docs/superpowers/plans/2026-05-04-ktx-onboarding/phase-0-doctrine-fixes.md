# Phase 0 -- Doctrine fixes

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` for the spec commitment behind this phase.
> 4. Source-walk the relevant KTX files at `research/repos/ktx/` -- spec sketches drift; live source wins. Reproduce the count anchors locked in `review-findings.md`.
> 5. Read the analogous prior-engine handler / loader as a template (e.g., MVDSV's `_handler_log_templates.py` for KTX's match_event loader). Do NOT subclass; port (D3).
> 6. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

Phase 0 ships a markdown-only, low-risk surgery pass that aligns repo doctrine with reality before any KTX extraction code lands. Three deliverables: (1) correct the "canonical KTX is QuakeC + tree-sitter" doctrine error across five reference sites (the four named in F19 plus VALIDATION-RUNBOOK.md surfaced as F22 during Phase 0 drafting); (2) delete the obsolete TS regex extractor at `apps/qw-oracle/scripts/extractors/ktx/commands.ts` (writes to a retired output path; superseded by Phase 2's libclang `_handler_commands.py`); (3) create `apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md` populated with the seven SKIP entries D13 pre-decided. Runnable state at boundary: repo doctrine matches the libclang reality; obsolete TS extractor gone; KTX SKIP catalog established for arc-reviewer + future maintainers + the cross-project audit in Phase 7.

## Inputs from previous phase

Phase 0 is the first phase. Inputs are the items in `prerequisites.md`:
- Postgres dev container running (Arc 1 inheritance check; not exercised in Phase 0 but verified to pass).
- KTX research repo cloned at `research/repos/ktx/` (Phase 0 does NOT source-walk KTX; the repo is needed only for the OUT_OF_SCOPE.md citations Phase 0 ships, which were resolved during drafting -- executor does not need to re-walk).
- `bun --version` >= 1.3 (not exercised; markdown-only phase).
- F22 already appended to `review-findings.md` during Phase 0 drafting (see drafter notes below).

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md
```

Hand-written. Content shipped inline in Task 7 below.

### Modified

```
apps/qw-oracle/OVERVIEW.md                                 # 3 doctrine line edits (F19)
apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md    # 5 doctrine line edits (F19)
apps/qw-oracle/scripts/extractors/CLAUDE.md                # 1 doctrine line edit (F19)
apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md    # 2 doctrine line edits (F22)
/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_extraction_pipeline_vision.md   # 3 doctrine line edits (F19)
```

The user-memory file is outside the project tree but is named in F19 + D2 as a doctrine site. Edit it via the standard Edit tool.

### Deleted

```
apps/qw-oracle/scripts/extractors/ktx/commands.ts          # Obsolete TS regex parser. Wrong language for the canonical pipeline (all 4 shipped extractors are Python + libclang). Wrong output path (writes to retired packages/qw-config/src/data/). Superseded by Phase 2's _handler_commands.py via libclang Pattern 4. Not imported anywhere (verified during drafting). F18.
```

Note: the sibling output directory `apps/qw-oracle/scripts/extractors/ktx/output/` is NOT deleted. Phase 2 will land KTX handler outputs in that directory (e.g., `ktx-variables-ast.json`, `ktx-commands-ast.json`).

## Tasks

### Task 1: Fix doctrine in `apps/qw-oracle/OVERVIEW.md`

**Goal:** Replace three "tree-sitter / QuakeC" claims about canonical KTX with libclang-correct prose.

**Files:**
- `apps/qw-oracle/OVERVIEW.md`

**Steps:**

- [ ] Edit `apps/qw-oracle/OVERVIEW.md` line 33. Replace:
  ```
  | `ktx` | engine (mod, QuakeC) | per-version arc | — | not started; tree-sitter spike done; use `py-tree-sitter` (NOT Node `tree-sitter@0.25` which segfaulted on WSL/Node 20) |
  ```
  With:
  ```
  | `ktx` | engine (mod, C) | per-version arc | — | not started; libclang-based (canonical KTX is pure C; dusty-ktx fork's `qcsrc/` is QuakeC and out of scope for canonical onboarding) |
  ```

- [ ] Edit `apps/qw-oracle/OVERVIEW.md` line 44. Replace:
  ```
  - **Phase 2e KTX** — tree-sitter-based; foundations cleaned by zero-debt-before-KTX arc 2026-04-29.
  ```
  With:
  ```
  - **Phase 2e KTX** — libclang-based (canonical KTX is pure C); foundations cleaned by zero-debt-before-KTX arc 2026-04-29; ships under arc plan `docs/superpowers/plans/2026-05-04-ktx-onboarding/`.
  ```
  (The `Phase 2e` label remains -- broader phase-numbering hygiene is Phase 8 territory, not Phase 0 scope.)

- [ ] Edit `apps/qw-oracle/OVERVIEW.md` line 80. Replace:
  ```
  | Add a new extractor codebase | `scripts/extractors/<project>/extract.py` (Python + libclang 18 — KTX uses tree-sitter). Cross-engine pattern in `scripts/extractors/EXTRACTOR-PLAYBOOK.md`. Use the `onboard-extractor` user-global skill. |
  ```
  With:
  ```
  | Add a new extractor codebase | `scripts/extractors/<project>/extract.py` (Python + libclang 18; canonical KTX uses libclang too). Cross-engine pattern in `scripts/extractors/EXTRACTOR-PLAYBOOK.md`. Use the `onboard-extractor` user-global skill. |
  ```

**Verification:** `grep -inE "tree-?sitter|quakec" apps/qw-oracle/OVERVIEW.md` returns either no lines OR only lines explicitly attributing tree-sitter / QuakeC to dusty-ktx (the fork). Canonical KTX must not be associated with either.
- PASS condition: zero matches OR all matches reference dusty-ktx.
- FAIL condition: any line still attributes tree-sitter / QuakeC to canonical KTX.

**Execution mode:** `inline` -- pure markdown edit, full before/after content shipped above; mechanical Edit calls.

### Task 2: Fix doctrine in `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`

**Goal:** Replace five "tree-sitter / QuakeC" claims about canonical KTX with libclang-correct prose.

**Files:**
- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`

**Steps:**

- [ ] Edit line 3. Replace:
  ```
  Reusable knowledge for building and operating the static AST extractors that populate QW Oracle Layer 1 (`apps/qw-oracle/data/knowledge.db`). Four projects ship today: ezQuake (15 versions, deep-time walked to v3.0 floor), FTE (build-6698 with engine + ezhud plugin + asset bundle), QWCL (single tag 2.33), MVDSV (head, 2026-01-04 snapshot). KTX is pending and uses tree-sitter rather than libclang -- see `VALIDATION-RUNBOOK.md` Section  "Out of scope" for the parallel-runbook plan. Each engine has its own registration idioms; the architecture, pattern catalog, and porting checklist here are the reusable scaffold.
  ```
  With:
  ```
  Reusable knowledge for building and operating the static AST extractors that populate QW Oracle Layer 1 (`apps/qw-oracle/data/knowledge.db`). Four projects ship today: ezQuake (15 versions, deep-time walked to v3.0 floor), FTE (build-6698 with engine + ezhud plugin + asset bundle), QWCL (single tag 2.33), MVDSV (head, 2026-01-04 snapshot). KTX onboarding is in progress: canonical KTX is pure C and uses libclang like the other four (the dusty-ktx fork adds a `qcsrc/` QuakeC tree, which is out of scope for canonical onboarding -- a separate parallel runbook will land when dusty-ktx ships). Each engine has its own registration idioms; the architecture, pattern catalog, and porting checklist here are the reusable scaffold.
  ```

- [ ] Edit line 127 (inside the "Cross-codebase port pattern" subsection). Replace:
  ```
  When porting a wholly distinct codebase (FTE was a fresh port from ezQuake; KTX-after-tree-sitter will be another), do NOT inherit from any parent project. Start fresh in `<project>/_handler_*.py`, inherit from `Visitor` only:
  ```
  With:
  ```
  When porting a wholly distinct codebase (FTE was a fresh port from ezQuake; canonical KTX is the next), do NOT inherit from any parent project. Start fresh in `<project>/_handler_*.py`, inherit from `Visitor` only:
  ```

- [ ] Edit line 230 (inside Pattern 5's "Side-effect for other engines"). Replace:
  ```
  **Side-effect for other engines:** inventory EVERY `Cmd_Add*` API variant the source uses. FTE has `Cmd_AddCommandD` (description variant); MVDSV may have legacy shims; KTX is QuakeC (completely different -- see Known limits).
  ```
  With:
  ```
  **Side-effect for other engines:** inventory EVERY `Cmd_Add*` API variant the source uses. FTE has `Cmd_AddCommandD` (description variant); MVDSV may have legacy shims; KTX uses its own command-table shape (see KTX onboarding spec at `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md`).
  ```

- [ ] Edit line 632 (inside Architectural exclusions). Replace:
  ```
  **QuakeC (.qc) sources:** KTX and dusty-ktx include QuakeC modules. QuakeC is a distinct language; libclang cannot parse it. Requires `py-tree-sitter` with a QuakeC grammar or a dedicated lexer. Architectural decision, not an incremental fix. User-loaded `progs.dat` from mods is fundamentally out of static reach regardless.
  ```
  With:
  ```
  **QuakeC (.qc) sources:** the dusty-ktx fork includes a `qcsrc/` QuakeC tree (canonical KTX is pure C). QuakeC is a distinct language; libclang cannot parse it. Requires `py-tree-sitter` with a QuakeC grammar or a dedicated lexer when dusty-ktx onboarding ships -- separate methodology, separate runbook. User-loaded `progs.dat` from mods is fundamentally out of static reach regardless.
  ```

- [ ] Edit line 679 (inside Porting checklist Section 0a). Replace:
  ```
  **Cross-codebase port (e.g., FTE was a fresh port; future engines like KTX-after-tree-sitter):** start fresh in `<project>/_handler_*.py`. Inherit from `Visitor` only (no parent project import). Steps 1-9 below apply unchanged.
  ```
  With:
  ```
  **Cross-codebase port (e.g., FTE was a fresh port; canonical KTX is the next):** start fresh in `<project>/_handler_*.py`. Inherit from `Visitor` only (no parent project import). Steps 1-9 below apply unchanged.
  ```

**Verification:** `grep -inE "tree-?sitter|quakec" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` returns zero matches that attribute either to canonical KTX. Surviving matches must reference dusty-ktx exclusively.
- PASS condition: every match in dusty-ktx context (or no matches).
- FAIL condition: canonical KTX still appears alongside tree-sitter / QuakeC.

**Execution mode:** `inline` -- pure markdown edit, full before/after content shipped above; mechanical Edit calls.

### Task 3: Fix doctrine in `apps/qw-oracle/scripts/extractors/CLAUDE.md`

**Goal:** Replace the single "tree-sitter for KTX" claim with libclang-correct prose.

**Files:**
- `apps/qw-oracle/scripts/extractors/CLAUDE.md`

**Steps:**

- [ ] Find the line in the Always-on rules section that reads:
  ```
  - **libclang for C/C++ ports** (ezquake, fte, mvdsv, qwcl); **tree-sitter for KTX** (QuakeC, separate methodology -- not yet onboarded).
  ```
  Replace with:
  ```
  - **libclang for C/C++ ports** (ezquake, fte, mvdsv, qwcl, KTX-canonical); **tree-sitter** is reserved for the dusty-ktx fork's `qcsrc/` (QuakeC), not yet onboarded -- separate methodology / separate runbook.
  ```

**Verification:** `grep -inE "tree-?sitter|quakec" apps/qw-oracle/scripts/extractors/CLAUDE.md` returns no canonical-KTX attribution; any survivors must reference dusty-ktx.
- PASS condition: zero matches or only dusty-ktx context.
- FAIL condition: canonical KTX still attributed to tree-sitter / QuakeC.

**Execution mode:** `inline` -- pure markdown edit, full before/after content shipped above.

### Task 4: Fix doctrine in `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` (F22)

**Goal:** Replace two "tree-sitter for KTX" claims (lines 5 + 373) with libclang-correct prose. This site was discovered during Phase 0 drafting; F22 documents the surfacing.

**Files:**
- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`

**Steps:**

- [ ] Edit line 5. Replace:
  ```
  **Scope:** libclang-based extractors (ezQuake, FTE, QWCL, MVDSV today; future ezQuake-family forks like unezQuake; future MVDSV-family forks like antilag-mvdsv). Tree-sitter extractors (KTX) get a separate runbook when KTX ships.
  ```
  With:
  ```
  **Scope:** libclang-based extractors (ezQuake, FTE, QWCL, MVDSV today; canonical KTX onboarding via the KTX onboarding arc; future ezQuake-family forks like unezQuake; future MVDSV-family forks like antilag-mvdsv). Tree-sitter is reserved for the dusty-ktx fork's `qcsrc/` (QuakeC), out of scope for canonical onboarding -- a parallel runbook will land when dusty-ktx ships.
  ```

- [ ] Edit line 373 (inside the "Out of scope" section listing parallel runbooks). Replace:
  ```
  - **KTX (tree-sitter).** Different methodology. When KTX ships, write a parallel runbook (`VALIDATION-RUNBOOK-KTX.md`) covering tree-sitter-specific concerns.
  ```
  With:
  ```
  - **dusty-ktx (`qcsrc/` tree-sitter).** Different methodology -- only the `qcsrc/` QuakeC tree, not the canonical KTX C source. When dusty-ktx onboarding ships, write a parallel runbook (`VALIDATION-RUNBOOK-DUSTY-KTX.md`) covering tree-sitter-specific concerns. Canonical KTX is pure C; it uses this runbook (KTX onboarding arc lands in `docs/superpowers/plans/2026-05-04-ktx-onboarding/`).
  ```

**Verification:** `grep -inE "tree-?sitter|quakec" apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` returns no canonical-KTX attribution.
- PASS condition: zero matches or only dusty-ktx context.
- FAIL condition: canonical KTX still attributed to tree-sitter / QuakeC.

**Execution mode:** `inline` -- pure markdown edit, full before/after content shipped above.

### Task 5: Fix doctrine in user-memory `project_extraction_pipeline_vision.md`

**Goal:** Replace three "tree-sitter / QuakeC" claims about canonical KTX with libclang-correct prose. This file is the user's pre-onboarding architectural snapshot, named in F19 + D2 as one of the four reference sites.

**Files:**
- `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_extraction_pipeline_vision.md`

**Steps:**

- [ ] Edit line 3 (the file's frontmatter `description:` field). Replace:
  ```
  description: AST-based extractor pipeline shipped across all four QW Oracle Layer 1 projects (ezQuake 14 tags, FTE@build-6698 core+bundle, QWCL@2.33, MVDSV@head). 2026-04-28 architecture consolidation lands the canonical project-private handler shape (`<project>/_handler_*.py`) across all four; `extractor_lib/` collapses to Tier 1 shared infrastructure only. Three-tier handler architecture documented (shared / family-base / project-private) with fork-vs-port branch in the porting checklist; ezQuake + MVDSV handlers carry fork-override hooks (class docstrings, `# Fork override hook:` comments, class-level registration-API tuple hoists) ready for unezQuake and antilag-mvdsv onboarding via direct subclassing. KTX remains the only outstanding port (tree-sitter, separate methodology).
  ```
  With:
  ```
  description: AST-based extractor pipeline shipped across all four QW Oracle Layer 1 projects (ezQuake 14 tags, FTE@build-6698 core+bundle, QWCL@2.33, MVDSV@head). 2026-04-28 architecture consolidation lands the canonical project-private handler shape (`<project>/_handler_*.py`) across all four; `extractor_lib/` collapses to Tier 1 shared infrastructure only. Three-tier handler architecture documented (shared / family-base / project-private) with fork-vs-port branch in the porting checklist; ezQuake + MVDSV handlers carry fork-override hooks (class docstrings, `# Fork override hook:` comments, class-level registration-API tuple hoists) ready for unezQuake and antilag-mvdsv onboarding via direct subclassing. KTX remains the only outstanding port; canonical KTX is pure C and onboards via libclang under the KTX onboarding arc (tree-sitter is reserved for the dusty-ktx fork's `qcsrc/`, separate methodology).
  ```

- [ ] Edit line 32. Replace:
  ```
  KTX is the only outstanding port. Tree-sitter-based (use py-tree-sitter, not Node tree-sitter@0.25 which segfaulted on WSL/Node 20). Separate runbook will be written when KTX ships.
  ```
  With:
  ```
  KTX is the only outstanding port. Canonical KTX is pure C; libclang-based extraction (same toolchain as the other four projects), under arc plan `docs/superpowers/plans/2026-05-04-ktx-onboarding/`. Tree-sitter is reserved for the dusty-ktx fork's `qcsrc/` (QuakeC), out of scope for canonical onboarding -- a separate runbook will land when dusty-ktx ships.
  ```

- [ ] Edit line 47 (inside "How to apply"). Replace:
  ```
  - Adding a cross-codebase port (KTX-after-tree-sitter, future engines): create `<project>/_handler_*.py`. Inherit from `Visitor` only. No parent project import. Steps 1-9 of the porting checklist apply unchanged.
  ```
  With:
  ```
  - Adding a cross-codebase port (canonical KTX, future engines): create `<project>/_handler_*.py`. Inherit from `Visitor` only. No parent project import. Steps 1-9 of the porting checklist apply unchanged.
  ```

**Verification:** `grep -inE "tree-?sitter|quakec" /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_extraction_pipeline_vision.md` returns no canonical-KTX attribution; only dusty-ktx survives if anything.
- PASS condition: zero matches or only dusty-ktx context.
- FAIL condition: canonical KTX still attributed to tree-sitter / QuakeC.

**Execution mode:** `inline` -- pure markdown edit, full before/after content shipped above.

### Task 6: Delete obsolete TS regex extractor (F18)

**Goal:** Remove `apps/qw-oracle/scripts/extractors/ktx/commands.ts`. Wrong language, wrong output path, wrong methodology; superseded by Phase 2's `_handler_commands.py` via libclang Pattern 4.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/commands.ts` (deleted)

**Steps:**

- [ ] Pre-delete sanity: `grep -rn "extractors/ktx/commands\|extract-ktx-commands" /home/paradoks/projects/quakeworld --include="*.ts" --include="*.js" --include="*.json" --include="*.py"` should return zero matches outside the spec/plan markdown. (Drafter verified: matches exist only in `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` and `docs/superpowers/plans/2026-05-04-ktx-onboarding/{review-findings,phase-template,README,handoff-prompt}.md` -- all are spec/plan references, none are runtime imports.)
- [ ] Run `git rm apps/qw-oracle/scripts/extractors/ktx/commands.ts`. The sibling output directory `apps/qw-oracle/scripts/extractors/ktx/output/` is preserved; Phase 2 lands handler outputs there.

**Verification:**
- `ls apps/qw-oracle/scripts/extractors/ktx/commands.ts` returns "No such file or directory."
- `git status` shows the deletion staged.
- `grep -rn "extractors/ktx/commands\|extract-ktx-commands" /home/paradoks/projects/quakeworld --include="*.ts" --include="*.js" --include="*.json" --include="*.py"` still returns zero non-doc matches (idempotent re-check post-deletion).
- PASS condition: file gone, no broken imports.
- FAIL condition: file still present OR new import surface (would mean a runtime caller crept in mid-arc).

**Execution mode:** `inline` -- single-file deletion via `git rm`; mechanical.

### Task 7: Create `apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md` (D13)

**Goal:** Land the SKIP catalog with the seven entries D13 pre-decided, in the format used by prior engines. Subsequent phases append to this file as their handlers run.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md` (created)

**Steps:**

- [ ] Create the file at `apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md` with EXACTLY the following content:

```markdown
# KTX Extractor Out-of-Scope Findings

This file documents extraction decisions where canonical KTX (https://github.com/QW-Group/ktx) source surfaces something a phase-N handler chooses NOT to extract, with rationale. Future maintainers + arc-reviewer + cross-project audits all consult this when a "missing entity" question surfaces.

Format: per-item section with `## <token>`, `**Why skip:**`, `**Source:**` (file:line for the consumer / declaration), `**Related (if any):**` (Layer 3 concept-note candidate or sibling row).

The seven Phase-0 entries below capture pre-decided SKIPs from the design spec at `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` (Pass 1.1 buckets + Pass 4.3 / 4.4 deferrals). Subsequent phases (1-8) append entries here as their handlers run.

---

## k_motd1-9 / k_ml_0-5 (Bucket-3 indexed-family cvars)

**Why skip:** Sprintf-built at runtime via `va("k_motd%d", i)` and `snprintf(mapid, ..., "k_ml_%d", i)`. Operator-defined via configs; iterate by index. No `RegisterCvar*` registration site by design (Pass 1.1 Bucket 3 classification). Layer 1 cannot statically enumerate the family without a synthetic family-row design (deferred, low pressure).

**Source:**
- Consumer (k_motd*): `research/repos/ktx/src/motd.c:56` -- `cvar_string(va("k_motd%d", i))`.
- Consumer (k_ml_*): `research/repos/ktx/src/maps.c:566`, `:596`, `:612`, `:667` -- `snprintf(mapid, sizeof(mapid), "k_ml_%d", i)`.

**Related:** none. If a future arc decides to surface family templates, do it as one row per template name (not one per resolved index).

## k_666 / k_dm2mod / k_no_vote_break / k_specktalk (Truly orphaned drift cvars)

**Why skip:** Zero `RegisterCvar*` site in source; named only in `resources/example-configs/ktx/` files. Upstream config drift candidates (configs reference cvars that no longer exist or never did).

**Source:** none in source. Documented as upstream drift in the spec at Pass 1.1 cross-validation findings.

**Related:** consider QW-Group/ktx issue or PR on the example configs to drop these. Future contributor-handoff task; not arc-bound.

## lsType_t (post-match scoreboard formatting classifier)

**Why skip:** Derived classification, not a registry-shaped entity. Consumers compute the active `lsType_t` value at scoreboard-display time from active mode + cvar state; persisting per-value Layer 1 rows would not represent stable truth (Pass 4.3 deferral).

**Source:**
- Definition: `research/repos/ktx/include/g_local.h:202` -- `} lsType_t; // lastscores type`.
- Example consumers: `research/repos/ktx/src/commands.c:6746`, `:6802`, `:6988`, `:6989` (lastscores formatting paths).

**Related:** Layer 3 concept note on scoreboard interpretation could cite `lsType_t` semantics if such a note is later authored.

## gameType_t (game-type classifier enum)

**Why skip:** Subsumed into the `game_mode` catalog row's `props_json.game_type` field (Phase 3). Standalone Layer 1 rows would duplicate per-mode data already carried on game_mode (Pass 4.3 deferral).

**Source:**
- Definition: `research/repos/ktx/include/g_local.h:169` -- `} gameType_t;`.
- Example consumer: `research/repos/ktx/src/world.c:1553` -- `gameType_t km = k_mode = cvar("k_mode");`.

**Related:** Phase 3 emits `props_json.game_type` per `game_mode` row; `gameType_t` semantics live there.

## fb_spawn_t stdSpawnFunctions[] / itemSpawnFunctions[] (bot-subsystem dispatch tables)

**Why skip:** Pure path-finding-init registration. Tables map classnames to spawn-function pointers; entries are dispatch glue rather than gameplay behavior worth a Layer 1 entity (Pass 4.4 deferral).

**Source:**
- Struct definition: `research/repos/ktx/include/fb_globals.h:24` -- `} fb_spawn_t;`.
- `stdSpawnFunctions[]`: `research/repos/ktx/src/bot_loadmap.c:170`.
- `itemSpawnFunctions[]`: `research/repos/ktx/src/bot_items.c:938`.

**Related:** Layer 3 concept note on bot subsystem internals could cite the dispatch shape if interest emerges.

## stats_format_t file_formats[] (xml + json formatter dispatch)

**Why skip:** Pure infrastructure -- one entry per output format with handler-function pointer. No gameplay semantics; loader does not extract dispatch infrastructure (Pass 4.4 deferral).

**Source:**
- Struct definition: `research/repos/ktx/include/stats.h:51` -- `} stats_format_t;`.
- Array site: `research/repos/ktx/src/stats.c:10` -- `static stats_format_t file_formats[]`.

**Related:** `match_event` entity rows (Phase 6) carry the actual extralog event semantics; `file_formats[]` is rendering glue around them.

## fixed_maps_list[] (MVDSV-engine-compat workaround)

**Why skip:** All 38 names already exist as `qw.maps` rows. Re-extracting via KTX would double-count and add no new information (Pass 4.4 deferral).

**Source:** `research/repos/ktx/src/maps.c:24` -- `static char *fixed_maps_list[]` (38 entries; consumer at `:175` via `Map_AddMapToList`).

**Related:** `qw.maps` table rows are the authoritative source for these map names.
```

(End of file content. ASCII only; no trailing whitespace; single trailing newline.)

**Verification:**
- `test -f apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md` exits 0.
- `grep -c "^## " apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md` returns 7 (one per SKIP entry).
- `grep -iE "tree-?sitter|quakec" apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md` returns zero matches (the file shouldn't perpetuate the doctrine error).
- PASS condition: file present, exactly 7 `## ` headings, zero tree-sitter / QuakeC slips.
- FAIL condition: file missing OR wrong heading count OR contains a tree-sitter slip.

**Execution mode:** `inline` -- full file content shipped above; mechanical Write call.

### Task 8: Single commit landing all Phase 0 changes

**Goal:** Commit Phase 0 as one coherent unit per D16 (phase atomicity).

**Files:** all the above (creates + modifies + delete).

**Steps:**
- [ ] `git add apps/qw-oracle/OVERVIEW.md apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md apps/qw-oracle/scripts/extractors/CLAUDE.md apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-0-doctrine-fixes.md`
- [ ] (The deletion of `apps/qw-oracle/scripts/extractors/ktx/commands.ts` is already staged from Task 6's `git rm`.)
- [ ] (User-memory file `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_extraction_pipeline_vision.md` is OUTSIDE the project tree and is NOT staged. Memory edits live in the user-global tree; no commit needed.)
- [ ] `git commit` with message:
  ```
  arc(ktx): Phase 0 -- doctrine fixes + delete TS regex extractor + KTX OUT_OF_SCOPE
  
  Five doctrine reference sites corrected: canonical KTX is pure C, not
  QuakeC; libclang is the toolchain, not tree-sitter. Tree-sitter is
  reserved for dusty-ktx fork's qcsrc/, out of scope for canonical
  onboarding.
  
  Sites fixed:
  - apps/qw-oracle/OVERVIEW.md (3 lines)
  - apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md (5 lines)
  - apps/qw-oracle/scripts/extractors/CLAUDE.md (1 line)
  - apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md (2 lines, F22)
  - user-memory project_extraction_pipeline_vision.md (3 lines; not staged)
  
  Plus:
  - delete apps/qw-oracle/scripts/extractors/ktx/commands.ts (F18; obsolete
    TS regex extractor; wrong language + wrong output path; superseded by
    Phase 2's libclang _handler_commands.py).
  - create apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md with 7
    pre-decided SKIP entries (D13).
  - review-findings.md gains F22 (5th doctrine site discovered during
    Phase 0 drafting) + Phase ownership row updated.
  
  Resolves: F18, F19, F22 (partial -- Phase 8 verifies survival).
  Lays scaffold: D13 (OUT_OF_SCOPE.md present for subsequent phases).
  ```
- [ ] (No push to origin in Phase 0; push at session-wrap or end of arc segment per the project's git workflow.)

**Verification:**
- `git log -1 --oneline` shows the new commit.
- `git status` is clean (working tree matches HEAD).
- PASS condition: clean commit, no uncommitted residuals.
- FAIL condition: working tree shows uncommitted changes after the commit.

**Execution mode:** `inline` -- mechanical git operations.

## Verification (phase boundary)

Operator runs the full sweep at the end of Phase 0. All probes return YES/NO answers:

**1. Doctrine survives in all five sites.**

```bash
grep -iEn "tree-?sitter|quakec" \
  apps/qw-oracle/OVERVIEW.md \
  apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md \
  apps/qw-oracle/scripts/extractors/CLAUDE.md \
  apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md \
  /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_extraction_pipeline_vision.md
```
- PASS condition: zero matches OR every match references dusty-ktx in context (none attribute tree-sitter / QuakeC to canonical KTX).
- FAIL condition: any match attributes tree-sitter / QuakeC to canonical KTX.

**2. TS regex extractor is gone.**

```bash
test ! -f apps/qw-oracle/scripts/extractors/ktx/commands.ts && echo "GONE" || echo "STILL HERE"
```
- PASS condition: prints `GONE`.
- FAIL condition: prints `STILL HERE`.

**3. KTX OUT_OF_SCOPE.md is present with 7 entries.**

```bash
test -f apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md \
  && echo "headings=$(grep -c '^## ' apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md)" \
  || echo "MISSING"
```
- PASS condition: prints `headings=7`.
- FAIL condition: prints `MISSING` or any other heading count.

**4. KTX OUT_OF_SCOPE.md does not perpetuate the doctrine error.**

```bash
grep -iE "tree-?sitter|quakec" apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md && echo "SLIP" || echo "CLEAN"
```
- PASS condition: prints `CLEAN`.
- FAIL condition: prints `SLIP` (means a tree-sitter / QuakeC reference crept into the new file).

**5. Output directory preserved.**

```bash
test -d apps/qw-oracle/scripts/extractors/ktx/output && echo "PRESERVED" || echo "DELETED"
```
- PASS condition: prints `PRESERVED`. Phase 2 lands handler outputs in this directory.
- FAIL condition: prints `DELETED`. Recovery: `mkdir apps/qw-oracle/scripts/extractors/ktx/output`.

**6. F22 captured in review-findings.md.**

```bash
grep -c "^### F22 " docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md
```
- PASS condition: returns `1`.
- FAIL condition: returns `0` (or anything else).

**7. Phase 0 commit landed cleanly.**

```bash
git log -1 --pretty=oneline
git status --short
```
- PASS condition: latest commit names Phase 0; `git status --short` is empty.
- FAIL condition: latest commit is something else OR working tree has uncommitted residuals.

**8. No regressions in unrelated greps.**

```bash
grep -rn "extractors/ktx/commands\|extract-ktx-commands" \
  /home/paradoks/projects/quakeworld \
  --include="*.ts" --include="*.js" --include="*.json" --include="*.py"
```
- PASS condition: zero matches outside `docs/superpowers/specs/` and `docs/superpowers/plans/2026-05-04-ktx-onboarding/` (those reference the deletion intentionally).
- FAIL condition: any match in runtime code.

If all eight probes pass, Phase 0 is done; proceed to Phase 1. If any probe fails, see `## Recovery` below.

## Outputs to next phase

After Phase 0 ships, the following hold for Phase 1:

- Repo doctrine matches the libclang reality. `EXTRACTOR-PLAYBOOK.md`'s "Cross-codebase port pattern" no longer rotates around a stale "KTX-after-tree-sitter" framing; Phase 1 + later phases reference the playbook's clean libclang doctrine.
- The obsolete TS regex extractor at `apps/qw-oracle/scripts/extractors/ktx/commands.ts` is gone; Phase 2's `_handler_commands.py` lands in a clean directory layout.
- KTX OUT_OF_SCOPE.md exists with 7 pre-decided SKIP entries; Phase 2 / 3 / 4 / 5 / 6 handlers append phase-specific SKIP entries as they discover them.
- F22 documented in `review-findings.md`; Phase 8's "doctrine fixes survived" check covers all five sites, not the original four.
- The `apps/qw-oracle/scripts/extractors/ktx/output/` directory is preserved (Phase 2 needs it for handler outputs).

## Open questions / deferred items

- **Question:** Phase 0 fixes the "Phase 2e KTX" stale phase-numbering label only at the tree-sitter level, leaving the `Phase 2e` prefix on `apps/qw-oracle/OVERVIEW.md:44`. The MVDSV row at `OVERVIEW.md:32` already claims "Phase 2e SHIPPED", so two rows now compete for the `2e` label.
  **Default chosen for now:** Leave the `Phase 2e` prefix. Phase 8's slim-doc Arc 1 refresh sweep is the broader doc-currency catch-all; surfacing it in Phase 0 risks scope creep into doc-hygiene work that is already sequenced post-arc.
  **Who can resolve:** Phase 8.

- **Question:** F19 originally enumerated four reference sites; F22 surfaced VALIDATION-RUNBOOK.md as a 5th. Should F19's evidence section be amended in place to subsume F22, OR should F22 stand as a standalone finding?
  **Default chosen for now:** F22 stands as a standalone finding (already appended to `review-findings.md` during Phase 0 drafting). The audit trail is more useful when discovered-during-execution findings are visible as separate entries with their own discovery context. F19's wording "four reference sites" is now stale but appears only inside F19's evidence block; the cross-cutting commitment in D2 names sites by file path, not by count.
  **Who can resolve:** operator -- if a clean-up amendment is preferred, append a 2026-05-05 amendment block to F19 noting "scope expanded to 5 sites; see F22 for the addition."

- **Question:** The KTX `output/` directory exists from a prior session. Should Phase 0 verify it is empty, or leave whatever artifacts may be there?
  **Default chosen for now:** Leave the directory contents alone. Phase 2's first run produces fresh handler-output JSONs that overwrite by name; stale files (if any) from the deleted TS regex extractor would carry the old `ktx-commands.json` filename that Phase 2 does not produce. Phase 7's validation runbook + cross-project audit catches any stale artifacts that survive into the deployed dataset.
  **Who can resolve:** Phase 2 drafter (if a sweep of the output dir at handler-startup time is desired) OR Phase 7 (if validation probes catch stale files); operator can also delete the directory contents now if preferred.

## Recovery (if verification fails)

- **Probe 1 fails (canonical KTX still attributed to tree-sitter / QuakeC):** review the failing line; the inline before/after blocks above are exact-text replacements. Re-apply the missed edit. If the file has drifted between drafting and execution, `git diff HEAD~1` shows the staged changes; use that as a sanity check.
- **Probe 2 fails (TS regex extractor still present):** re-run `git rm apps/qw-oracle/scripts/extractors/ktx/commands.ts`. If `git rm` reports the file is untracked, it was already deleted but with `rm` not `git rm`; run `git add apps/qw-oracle/scripts/extractors/ktx/commands.ts` and commit (will record as a deletion).
- **Probe 3 fails (OUT_OF_SCOPE.md missing or wrong heading count):** the inline content for Task 7 above is the source of truth; re-write the file from that block.
- **Probe 4 fails (OUT_OF_SCOPE.md contains tree-sitter / QuakeC):** the only way this happens is if a Task-7 paste went wrong; the canonical content above has zero such references.
- **Probe 5 fails (output directory deleted):** `mkdir apps/qw-oracle/scripts/extractors/ktx/output`. The directory is empty until Phase 2 runs.
- **Probe 6 fails (F22 missing in review-findings.md):** Phase 0 drafter appended F22 during drafting; if the append got lost (file reverted, conflict), re-apply F22 by inserting the block from the drafted MD's "Findings resolved by this phase" section back into review-findings.md.
- **Probe 7 fails (commit missing or working tree dirty):** `git status` to triage; the most likely cause is files were staged but `git commit` failed on a hook. Inspect hook output, fix the underlying issue, re-stage if needed, re-commit.
- **Probe 8 fails (runtime imports of the deleted TS extractor surfaced):** an import crept in mid-arc OR a test file references the deleted path; the Phase 0 fix is to grep the offending caller and either delete it (if dead) or replace with a Phase 2 reference (if a real consumer that wants the libclang output path).

If any failure resists local recovery, halt and surface to operator.

---

## Findings resolved by this phase (per `review-findings.md`)

- **F18** (Obsolete TS regex extractor at `scripts/extractors/ktx/commands.ts`). Resolved by Task 6 (`git rm`).
- **F19** (Doctrine references stating KTX uses tree-sitter -- four reference sites). Resolved by Tasks 1, 2, 3, and 5 (OVERVIEW.md, EXTRACTOR-PLAYBOOK.md, extractors/CLAUDE.md, user-memory file).
- **F22** (VALIDATION-RUNBOOK.md as 5th doctrine site, surfaced during Phase 0 drafting). Resolved by Task 4. NEW finding appended to `review-findings.md` during Phase 0 drafting (2026-05-05) plus Phase ownership table updated to include F22 in Phase 0 + Phase 8 rows. Phase 8 verifies survival of the F22 fix alongside the F19 fixes.
- **D13** (OUT_OF_SCOPE.md as canonical disposition record). Resolved by Task 7 (creates the file with all 7 pre-decided entries). Subsequent phases append per-handler SKIP entries as they run.

No findings touched by Phase 0 are deferred; all four (F18, F19, F22, D13) ship in this phase.

---

*Phase 0 is the simplest phase in the arc -- markdown + one delete + one new markdown file. No code synthesis. Phase 1 lands the foundation (Pattern 6 lift + 3 migrations + gameplay_sources row).*
