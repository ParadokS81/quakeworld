You are executing Phase 3 of the extractor discipline catch-up arc.

CRITICAL ARC IDENTIFICATION: This is the **2026-05-08 extractor-discipline-catchup** arc, NOT the **2026-05-04 KTX onboarding** arc. The two arcs touch the same KTX test files (`apps/qw-oracle/scripts/extractors/ktx/tests/`) and reference the same finding numbers (F25, D.3.1) -- but Phase 3 is a paper-only test refactor that LIFTS the KTX-only helper into `extractor_lib/tests/`, NOT a re-do of the KTX onboarding arc's handler refactors. If you see references to "Pattern 6 cross-header lift", "modes-handler refactor in extract.py", "migrations 008/009/010", "ktx_log_template_logfile_channel", "election_type / death_rule", or any other KTX onboarding implementation work, you are in the WRONG arc -- halt immediately and surface to operator. The right reads start with `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`.

PHASE 3 SCOPE: Lift the KTX-only parallel-vs-serial test helper to a universal location at `apps/qw-oracle/scripts/extractors/extractor_lib/tests/parallel_serial_helpers.py` so every project can import `assert_parallel_serial_equivalent`. Update both KTX test files (`test_handler_gameplay_taxonomies.py` and `test_handler_modes.py`) to import from the lifted helper instead of an inner `run_with_workers` closure. Add one new MVDSV test (`mvdsv/tests/test_handler_protocol_parallel_serial.py`) for the MACRO_DEFINITION-walk handler that's structurally similar to KTX's risk class. All other handlers are explicitly audited and deferred per D8 (safe finalize-via-param pattern; no test needed). pytest is the universal dispatcher for this gate (D4 carve-out); NO `index.ts` dispatcher case is added in this phase.

Working directory: /home/paradoks/projects/quakeworld

You ARE executing this phase. You DO modify the live codebase, run pytest, and commit + push. The phase MD is the source of truth for what to do.

REQUIRED READING (read all before executing; do not skip):

1. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-3-parallel-serial-tests.md
   The phase MD itself. Source of truth for tasks, full file content (Tasks 1 + 3), exact replacement specs (Task 2), and verification probes V1-V7.

2. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
   17 locked cross-cutting decisions. Phase 3 respects D3 (per-handler config inline; not a unified registry), D4 (pytest as universal dispatcher; carve-out from F1 quality-grid TS pattern), D6 (5-project catch-up via pytest discovery), D7 (real-bug-fix rides commit), D8 (per-finding triage), D13 (phase atomicity -- one commit), D15 (Tasks 1 + 2 are subagent Sonnet medium; Task 3 is inline), D16 (ASCII), D17 (main tree, no PR ceremony, push at phase boundary).

3. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
   Empty initially; if MVDSV protocol test surfaces a parallelism bug at V7, append F-entry per D7 + D8.

4. apps/qw-oracle/CLAUDE.md
   Project context. Bun runtime + Python extractor conventions.

5. apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py
   Lift source #1: contains the inner `run_with_workers` closure that gets replaced with the lifted helper call. Read end-to-end so the Task 2 edit preserves all surrounding assertions (F7/F8 anchor invariants, D.3.1 regression gate).

6. apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py
   Lift source #2: same shape; preserves the `_f25_guard_active()` skipif predicate + per-handler assertions (27 game_modes count, mode_defaults equality, sort-and-compare loop).

7. apps/qw-oracle/scripts/extractors/extractor_lib/tests/__init__.py
   Currently empty (package marker). Task 1 adds the `assert_parallel_serial_equivalent` export.

PRE-FLIGHT CRITICAL REVIEW (per arc-executor skill):

Before executing any task, critically review the phase MD's plan against decisions.md and the live codebase. The drafter session was sub-agent-verified on 2026-05-08, but you (the executor) are running cold against live state. Spot-check:

a. KTX lift sources exist:
     ls apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py \
        apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py
   Both should exist. If either is missing, halt -- the arc's lift source is broken.

b. extractor_lib/tests/__init__.py exists and is empty:
     wc -c apps/qw-oracle/scripts/extractors/extractor_lib/tests/__init__.py
   Should report 0 bytes. If non-zero, your Task 1 export-line addition appends rather than overwrites.

c. mvdsv/tests/ directory does NOT exist yet:
     ls apps/qw-oracle/scripts/extractors/mvdsv/tests/ 2>&1
   Expected: "No such file or directory". If the directory already exists, the explicit mkdir step in Task 3 is a no-op (`mkdir -p`); proceed.

d. F25 serial guard state in ktx/extract.py (auto-resolves Q2):
     grep -n "forcing --workers 1 (F25)" apps/qw-oracle/scripts/extractors/ktx/extract.py
   Expected: empty (the F25 guard was removed prior to Phase 3). With no match, `_f25_guard_active()` returns False and the modes test will run actively rather than skip. This is the desired state -- no Phase 3 action needed regardless of guard state. If the grep DOES match (guard somehow re-introduced), the modes test will skip; that's also fine -- the lift still ships and Task 2 edit is unaffected.

e. MVDSV protocol handler signature matches phase MD claims:
     grep -n "ProtocolMvdsvHandler\|payload_field\|protocol_messages\|source_total" \
       apps/qw-oracle/scripts/extractors/mvdsv/_handler_protocol.py
   Should show: class ProtocolMvdsvHandler definition, `payload_field = "protocol_messages"`, finalize emitting both `protocol_messages` and `source_total` (under `_stats`). If signature drifted, the Task 3 test assertions point at wrong keys -- halt and surface.

f. Source repos present:
     ls research/repos/ktx research/repos/mvdsv
   Both directories should exist with extractor sources. Required for V7 to actually run tests rather than SKIP.

g. libclang availability:
     python3 -c "import clang.cindex; clang.cindex.Config.set_library_file('libclang-18.so.1'); from clang.cindex import Index; Index.create()"
   Should run without error. If it errors, libclang 18 isn't installed -- halt.

If any pre-flight check fails CRITICALLY, halt with status NEEDS_CONTEXT before executing any task; report the finding and recommend a phase MD amendment.

If pre-flight is clean, proceed to execution.

EXECUTE THE PHASE:

Tasks 1-3 per the phase MD. Per-task execution mode declarations (D15):

Task 1 -- Create extractor_lib/tests/parallel_serial_helpers.py + update __init__.py:
  Execution mode: subagent (Sonnet medium).
  Dispatch the Agent tool with subagent_type=general-purpose, model=sonnet (default effort=medium). Brief shape:
    "Read the Phase 3 MD's Task 1 section at /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-3-parallel-serial-tests.md. Create the file at apps/qw-oracle/scripts/extractors/extractor_lib/tests/parallel_serial_helpers.py with the FULL content from the MD's 'Steps' section verbatim (no edits, no summaries, no truncation). Edit apps/qw-oracle/scripts/extractors/extractor_lib/tests/__init__.py to add the export line specified. Verify with the V1 import test from the MD's Verification section. Halt with PASS/FAIL + the import test output."
  Apply the subagent's result. If FAIL, surface the error and halt with NEEDS_CONTEXT.

Task 2 -- Update KTX tests to import the lifted helper:
  Execution mode: subagent (Sonnet medium).
  Dispatch the Agent tool with subagent_type=general-purpose, model=sonnet (default effort=medium). Brief shape:
    "Read the Phase 3 MD's Task 2 section. Edit apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py and apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py per the MD's steps. For each file: (1) add the import line `from extractor_lib.tests import assert_parallel_serial_equivalent  # noqa: E402` after existing imports, before any KTX_REPO existence check. (2) Replace the inner `def run_with_workers(n_workers: int) -> dict:` closure body with the `assert_parallel_serial_equivalent(...)` call shown in the MD. Preserve all per-handler assertion code unchanged (F7/F8 counts, D.3.1 regression gate, mode_defaults equality, sort-and-compare loop). Verify both files collect with `python3 -m pytest apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py --collect-only -q` from the monorepo root. Halt with PASS/FAIL + collection output."
  Apply the subagent's result. If FAIL, surface the error and halt.

Task 3 -- Create MVDSV protocol parallel-serial test:
  Execution mode: inline (full file content shipped in MD).
  Direct ops in this terminal:
    1. mkdir -p apps/qw-oracle/scripts/extractors/mvdsv/tests
    2. Write apps/qw-oracle/scripts/extractors/mvdsv/tests/__init__.py as empty file (use Write with empty content; just creates the package marker).
    3. Write apps/qw-oracle/scripts/extractors/mvdsv/tests/test_handler_protocol_parallel_serial.py with the full Python content from the MD's Task 3 section verbatim.
    4. Verify with `python3 -m pytest apps/qw-oracle/scripts/extractors/mvdsv/tests/ --collect-only -q` from the monorepo root.

VERIFICATION (phase boundary):

Run V1-V7 from the phase MD's Verification section in order. Each ends PASS or FAIL.

V1: Helper import works.
V2: pytest collection -- 3+ `test_parallel_serial_equivalence` discovered.
V3: KTX taxonomy test collects + imports helper.
V4: KTX modes test collects + imports helper.
V5: MVDSV protocol test collects.
V6: Full pytest discovery -- no errors.
V7: Full suite passes -- KTX + MVDSV repos available; tests PASS or SKIP only (no FAIL or ERROR).

Per D6 (5-project audit): V7's pytest run constitutes the catch-up. All 5 projects either covered (ktx: 2 updated; mvdsv: 1 new) or explicitly deferred per the Recon findings table in the phase MD.

Per D7: if V7 surfaces a real parallelism bug in mvdsv/_handler_protocol.py (source_total drift between workers=1 and workers=4, OR row-level inequality after sort), drain-now -- fix the handler in same commit. Append F-entry to review-findings.md with track=drain-now and a one-line root-cause description.

If any V fails AND the phase MD's Recovery section doesn't cover the failure mode, halt with status BLOCKED.

COMMIT + PUSH:

Stage:
  - apps/qw-oracle/scripts/extractors/extractor_lib/tests/parallel_serial_helpers.py (added)
  - apps/qw-oracle/scripts/extractors/extractor_lib/tests/__init__.py (modified)
  - apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py (modified)
  - apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py (modified)
  - apps/qw-oracle/scripts/extractors/mvdsv/tests/__init__.py (added)
  - apps/qw-oracle/scripts/extractors/mvdsv/tests/test_handler_protocol_parallel_serial.py (added)
  - any drain-now bugfix to mvdsv/_handler_protocol.py (only if V7 surfaced one)
  - any review-findings.md F-entry update (only if drain-now F-entry was added)

Commit subject (one line, ASCII, <= 72 chars where possible):
  extractor-discipline-catchup phase 3: parallel-vs-serial test pattern lift

Commit body shape (HEREDOC; fill in actual audit dispositions):
  Lift KTX-only parallel-vs-serial test helper to extractor_lib/tests/
  parallel_serial_helpers.py for universal reuse. Update KTX tests to
  import the lifted helper. Add MVDSV protocol parallel-serial test as
  the structural-risk-class certification.

  pytest is the universal dispatcher (D4 carve-out); no index.ts
  dispatcher case added.

  5-project catch-up audit (D6, pytest-based):
    ezquake: deferred (no parallel-aggregation-risky handlers; safe pattern)
    fte:     deferred (safe pattern; FTE _all_rows dead init flagged for P5)
    qwcl:    deferred (simplest pattern; safe)
    mvdsv:   NEW test_handler_protocol_parallel_serial.py
    ktx:     UPDATED test_handler_gameplay_taxonomies.py + test_handler_modes.py

  Findings (D8 triage):
    - <if drain-now> F-NN: <bug summary>; fixed in same commit per D7.
    - <if HANDOVER> F-NN: pre-existing anomaly; tracked in HANDOVER.md.
    - <if reject> <handler> drift in <project> rejected because <rationale>.
    - <if no findings> All audited handlers ship green; no drain-now bugs.

  Verification (phase boundary): V1-V7 PASS.

Push to origin per D17 (`git push origin main`).

HALT WITH STRUCTURED STATUS:

Reply to the operator with one of:

- DONE: V1-V7 all PASS; phase MD complete; commit pushed; clean tree.
  Report: commit SHA, V-status summary, 5-project audit dispositions, F-entries created (if any).

- DONE_WITH_CONCERNS: V1-V7 PASS but execution surfaced something unexpected.
  Report: same as DONE plus the concern + recommendation.

- NEEDS_CONTEXT: pre-flight CRITICAL finding OR mid-execution blocker requires operator triage.
  Report: the finding + recommended phase MD amendment OR the triage question.

- BLOCKED: V failed AND Recovery section doesn't cover; OR an unanticipatable exception.
  Report: the failure + what was attempted + what's still in flight.

Do NOT proceed to Phase 4. Do NOT modify decisions.md or scaffold artifacts (review-findings.md F-entry additions are fine; structural changes need explicit operator approval).
