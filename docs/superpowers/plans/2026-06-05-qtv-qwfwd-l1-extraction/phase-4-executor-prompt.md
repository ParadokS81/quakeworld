# Phase 4 executor prompt -- arc 2026-06-05-qtv-qwfwd-l1-extraction

You are the **arc-executor** for **Phase 4 -- validate + concept-note decision** -- the FINAL phase. Invoke the `arc-executor` skill and execute against the phase MD. Phase 4 validates both extractors post-ship (Postgres-translated VALIDATION-RUNBOOK), adds F1 floor probes for qtv+qwfwd to the quality grid, and produces the written if/which concept-note DECISION (D9 -- decide, do NOT author). At the end you HALT to the orchestrator; you do NOT author concept notes, you do NOT tag, you do NOT push.

**Arc identity (halt if mismatch):** arc `2026-06-05-qtv-qwfwd-l1-extraction`, scaffold `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/`. You are validating the QWFWD (C) + QTV (Go) Layer 1 extractors and DECIDING (not authoring) concept notes. If you find yourself writing a file under `apps/qw-oracle/curated/`, STOP -- that is a D9 violation (authoring is a separate follow-on arc).

**Working directory:** `/home/paradoks/projects/quakeworld` (qw-oracle at `apps/qw-oracle/`).

## Read first (in order)

1. `.../README.md`
2. `.../decisions.md` -- D12 (validate against Postgres, NOT sqlite -- the runbook's sqlite commands are stale, F3), D9 (concept notes DEFERRED -- decide if/which, author nothing), D13 (non-goals: fteqtv-as-target / web QTV viewer / re-opening MVDSV qtv_* rows / authoring are scope creep), D7 (ASCII).
3. `.../review-findings.md` -- **Phase 4 owns F3 (sqlite stale -> Postgres), F7 (extractor counts are truth), F10 (reproducibility method)**; plus the LOAD-BEARING F13/F14 (`*version` loader-drop -> the count-reconciliation delta below) + F16 (qtv flood-triplet names).
4. `.../phase-4-validate-decision.md` -- the phase MD. Read cold + critically. It was drafted 2026-06-05 (before Phase 1/2 execution surfaced F12/F13/F14); the orchestrator has since **patched its counts/recipe/MCP-framing to match execution reality** (each fix carries a dated `[F12]`/`[F13/F14]` tag), so the MD and this prompt AGREE. The load-bearing points are restated below as reminders -- the subtleties that bite if skimmed.

## Orchestrator pre-flight (already done -- do NOT redo)

- **Phases 0-3 SHIPPED + independently orchestrator-verified green.** 102 L1 rows, ALL `description_origin='synthesized'`, all `source_backed`:
  - **qwfwd (50):** cvar 13 / command 29 / cmdline_param 2 / info_key 6.
  - **qtv (52):** cvar 40 / command 12.
- versions head+tag for both: `{1.40-dev ord1, head ord999999}` (qwfwd), `{1.16-dev ord1, head ord999999}` (qtv).
- Phase-3 describe pass complete, V6 D6 gate clean, breadcrumb harvest captured (see the concept-note section).

## LOAD-BEARING reminders (now reflected in BOTH the MD and this prompt)

### 1. The `*version` count delta (F13/F14) -- the count-reconciliation trap

The count reconciliation (V2 + Task-1 Section 1.2) is exact for every type EXCEPT **cvar**, where it is **JSON minus 1 = DB**. The extractor emits `*version` as a cvar (source truth: qtv JSON=41, qwfwd JSON=14), but the loader correctly DROPS it (`*`-prefixed names are `info_key`-only, never `cvar` -- F13/F14):
- **qtv cvar:** JSON `_stats.count` = **41** -> DB = **40** (delta 1 = `*version`; documented drop, NOT silent loss).
- **qwfwd cvar:** JSON `_stats.count` = **14** -> DB = **13** (delta 1 = `*version`).
- **Every OTHER type reconciles EXACTLY** (JSON = DB): qwfwd command 29 / cmdline_param 2 / info_key 6; qtv command 12.

Record the cvar `-1` as the expected F13/F14 behavior in Section 1.2 + V2. A finding is: any NON-cvar type with a delta, OR a cvar delta that is not exactly the `*version` row.

### 2. The head+tag load recipe (F12) -- the idempotency re-run is 8 / 4 calls, not 4 / 2

The idempotency re-run (V3 + Section 1.3) uses the F12 **head+tag** recipe: qwfwd = **8 calls** (4 types x {head, tag}), qtv = **4 calls** (2 types x {head, tag}). Re-run the COMPLETE recipe and confirm `inserted: 0` for every call. The reload is **F-D4a-safe** -- the owned-row guard (`derive-entity-description.ts` `... IS DISTINCT FROM 'synthesized'`) means the Phase-3 synthesized descriptions SURVIVE (proven at Phase-3 V9). After the reload, spot-confirm one described row still carries its description -- verify, do not assume.

### 3. Floor baselines (Task 2) -- use these EXACT numbers (captured live, all `source_backed`)

- `QWFWD_FLOOR_PROBES`: cvar **13**, command **29**, cmdline_param **2**, info_key **6** (8 probes = count + source_state per type).
- `QTV_FLOOR_PROBES`: cvar **40** (NOT 41 -- F14), command **12** (4 probes).

Do NOT re-derive from the MD's hand-counts or the spec (F7: the loaded DB count is truth). Mirror `makeFloorCountProbe` / `makeFloorSourceStateProbe`; spread both arrays into `REGRESSION_PROBES`.

### 4. MCP smoke (V10 + Section 8) -- the live MCP is PROD-scoped; verify at the DATA LAYER

The session's qw-oracle MCP targets **PROD** (scope: ezquake/fte/mvdsv/ktx/qwcl) -- it has NO qtv/qwfwd rows, so `lookup_entity(qwfwd|qtv, ...)` returns EMPTY. That is the known PROD-refresh gap (ledger-documented; Phases 1/2/3 all hit it), NOT a Phase-4 failure. Verify V10 + the Section-8 MCP smoke at the DATA LAYER -- `SELECT name, description, description_origin, source_file FROM entities WHERE project=... AND name=...` confirming the row is `synthesized` + anchored. Record "live MCP PROD-scoped (known gap); verified at data layer."

### 5. Reproducibility (V1 / Section 1.1) -- MD method is correct (F10); mind the Go path

V1 = standalone re-extract + `git diff --stat output/` (F10 -- NOT `idempotency --project`, which rejects qtv/qwfwd by design). The MD has this right. The qtv extractor needs Go at **`/usr/local/go/bin/go`** (bare `go` may be absent on a non-interactive shell PATH). Use `--workers 1` for the qwfwd re-extract determinism check.

### 6. F16 (informational, for the Section-4b code review / field-accuracy audit)

The qtv flood triplet is `fp_messages` / `fp_persecond` / `fp_secondsdead` (the planning docs' `fp_time`/`fp_limit`/`fp_message` were wrong -- corrected 2026-06-06). `fp_persecond` is a seconds-window, NOT a per-second rate. These are ground truth if Section 3.1 / sub-agent 4b samples them.

## Concept-note decision (Task 3, D9 -- DECIDE, do NOT author; the FINAL call is the OPERATOR's at sign-off)

The Phase-3 breadcrumb harvest is IN (orchestrator-verified live). Run the Step-0 query yourself, then write the per-candidate author/defer/drop recommendation grounded in it. The harvest:
- **(a) master-server registration/heartbeat -- 6 knobs** (qtv `masters` + qwfwd `masters`/`masters_heartbeat`/`masters_query`/`masters_filter_servers`/`heartbeat`). Prior AUTHOR (strong) -- confirmed.
- **(b) MVD streaming + parse_delay ghosting -- 4 knobs** (qtv `parse_delay`, `tick_time`, `qtv`, `address`). The "defer if breadcrumb-thin" condition did NOT trigger -- the harvest is rich. Prior shifts DEFER-if-thin -> **AUTHOR-LEAN**.
- **(c) qtv_password cross-codebase auth matrix -- 1 knob** (qtv `qtv_password`, See-also the shipped MVDSV `qtv_password` ledger). Prior DEFER -- stands (already See-also-wired; lower actionability).

Write the recommendation grounded in this evidence (the prior is a starting position, not a lock -- if the described knobs contradict it, the evidence wins). The operator ratifies/overrides at sign-off. Author NOTHING under `curated/` (V8 enforces 0 curated files touched). Any greenlit candidate becomes a SEPARATE follow-on authoring arc.

## Execution notes

- ASCII only (D7).
- Section 4 code review (4a qwfwd handlers / 4b qtv extractor / 4c cross-project adapters) = `subagent (Sonnet medium, Explore-shape)`, three in parallel, read-and-report (no fixes).
- Task 3 concept-note decision = `subagent (Opus MAX)` -- or `inline` if you judge the harvested evidence unambiguous (it is fairly clear post-harvest).
- Task 2 floor probes = `subagent (Sonnet medium)` or `inline` (mechanical mirror of the existing factories).
- The remaining validation sections (0/1/2/3/5/6/8) = `inline`.
- Shared DB: the dev DB is shared with a parallel l2-calibration session (different tables). The V3 idempotency reload is scoped to `project IN ('qtv','qwfwd')` -- no global ops. psql access: from `apps/qw-oracle/`, `set -a && . ./.env && set +a` then `docker exec -i qw-oracle-postgres-dev psql "$DATABASE_URL" -c "<q>"`.
- Two validation reports: `docs/superpowers/reviews/2026-06-05-qwfwd-1.40-dev-validation.md` + `docs/superpowers/reviews/2026-06-05-qtv-1.16-dev-validation.md`. The concept-note decision section lives in the QWFWD report (per MD).

## Verification (phase boundary, Postgres-only) -- run V1-V10 WITH the corrections above

V1 reproducibility (empty diff, both extractors); V2 count reconciliation (**cvar JSON-1 = DB per F13/F14**, every other type exact); V3 idempotency (**head+tag re-run = 8/4 calls**, inserted:0, F-D4a-safe); V4 field-accuracy spot-check; V5 floor probes (8 qwfwd + 4 qtv, ALL PASS, baselines above); V6 full regression grid all 7 projects (no prior-project regression); V7 tsc exit 0; V8 concept-note decision documented + 0 curated files; V9 both reports complete + every finding dispositioned; **V10 MCP smoke at the DATA LAYER** (PROD-gap caveat). Any new finding is F17+.

## Halt and report (do NOT auto-author, do NOT tag, do NOT push)

Commit Phase 4 on `main` (the quality-grid floor-probe edit + the 2 validation reports; one-line message). Do NOT push. Then **halt** with a structured `DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED` report including: the V1-V10 results (esp. V2's cvar `-1` = `*version`, V5's 12 floor probes PASS, V8's 0 curated files), the concept-note recommendation (per-candidate author/defer/drop + the summary table), any new findings (next is F17), and the open operator items (F13/F14 `*version:serverinfo` parity; the concept-note ratification). Report to the orchestrator. The ORCHESTRATOR then verifies the boundary independently, tags the arc ship (`git tag -a arc-qtv-qwfwd-l1-shipped`), pushes, and writes the post-arc handoff to `arc-reviewer`. Do NOT do those yourself.
