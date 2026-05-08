You are executing Phase 1 of the extractor discipline catch-up arc.

CRITICAL ARC IDENTIFICATION: This is the **2026-05-08 extractor-discipline-catchup** arc, NOT the **2026-05-04 KTX onboarding** arc. The two arcs have similarly-named phase files in adjacent directories. If you see references to "Pattern 6 cross-header lift", "migrations 008/009/010", "ktx_log_template_logfile_channel", or any other KTX onboarding content in your reads, you are in the WRONG arc -- halt immediately and surface to operator. The right reads start with `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`.

PHASE 1 SCOPE: Lift the KTX-only bash idempotency probe to a universal
TypeScript probe under `bun run load-knowledge -- idempotency`. Per-project
config dict carries 5 entries; dispatcher case mirrors quality-grid; KTX
bash deleted in same commit; 5-project catch-up audit baked in. The phase
MD ships full TS body inline; all 5 tasks declared `inline` execution per
feedback_no_subagents_for_mechanical_edits.md.

Working directory: /home/paradoks/projects/quakeworld

You ARE executing this phase. You DO modify the live codebase, run probes,
re-run extract-tag, and commit + push. The phase MD is the source of truth
for what to do.

REQUIRED READING (read all before executing; do not skip):

1. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-1-idempotency-probe.md
   The phase MD itself. Source of truth for tasks, file content, verification.

2. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
   17 locked cross-cutting decisions. The phase MD respects these. Pay
   particular attention to D6 (5-project audit), D7 (real-bug-fix rides
   commit), D8 (per-finding triage), D12 (JSONB binding -- this probe is
   read-only against JSONB), D13 (phase atomicity -- one commit), D17
   (main tree, no PR ceremony, push at phase boundary).

3. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
   Empty initially; F-entries you append during Task 4 land here.

4. apps/qw-oracle/CLAUDE.md
   Project context. JSONB-binding rule + Bun runtime + idempotency
   invariants.

5. apps/qw-oracle/scripts/load-knowledge/idempotency.ts
   The full TS body that the phase MD ships inline. This file does NOT
   exist yet; you create it in Task 1.

PRE-FLIGHT CRITICAL REVIEW (per arc-executor skill):

Before executing any task, critically review the phase MD's plan against
decisions.md and review-findings.md. The drafter session was sub-agent-
verified on 2026-05-08, but you (the executor) are running cold against
live state. Flag any of:

a. Phase MD references file paths that no longer exist (e.g., a file
   moved or renamed since drafting). Spot check: apps/qw-oracle/scripts/
   load-knowledge/index.ts, apps/qw-oracle/scripts/load-knowledge/
   quality-grid.ts, apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh
   should all exist.

b. Phase MD's per-project config dict (PROJECT_IDEMPOTENCY_CONFIG) carries
   tables that have zero rows in your current dev DB. Run:
     docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle \
       -c "SELECT project, COUNT(*) FROM entities GROUP BY project ORDER BY project;"
   All 5 projects (ezquake / fte / qwcl / mvdsv / ktx) should have non-zero
   counts. If any project shows 0, prerequisites.md is not satisfied --
   halt.

c. Phase MD's volatile-strip list omits a column that's actually volatile
   in your current schema. Cross-check: read apps/qw-oracle/db/migrations/
   012_description_origin.sql to confirm description_origin is deterministic
   (not volatile -- the phase MD intentionally keeps it IN the snapshot).

d. Source repos present at research/repos/ezquake-source / fteqw / qwcl-original
   / mvdsv / ktx (Task 4 needs these for extract-tag --force to succeed).

If a CRITICAL pre-flight finding emerges, halt with status NEEDS_CONTEXT
before executing any task; report the finding and recommend a phase MD
amendment.

If pre-flight is clean, proceed to execution.

EXECUTE THE PHASE:

Tasks 1-5 per the phase MD. All declared `inline` per D15 + operator
memory. Use Edit / Write / Bash directly; do NOT dispatch subagents (the
phase MD ships full content inline; subagent overhead is unnecessary
when the synthesis was already done at draft time).

Task 1 -- Author idempotency.ts:
  Write the full ~250-line TS body from the phase MD's "Inlined: idempotency.ts"
  section verbatim to apps/qw-oracle/scripts/load-knowledge/idempotency.ts.
  Verify via `cd apps/qw-oracle && bunx tsc --noEmit` (returns 0).

Task 2 -- Wire dispatcher:
  Apply the 3 inlined diffs from the phase MD's "Inlined: index.ts dispatcher
  diff" section to apps/qw-oracle/scripts/load-knowledge/index.ts (case +
  usage docstring + lazy-import wrapper). Verify dispatch via
  `bun run load-knowledge -- idempotency --help` (exit 0; help output
  printed to stderr).

Task 3 -- Delete KTX bash:
  `git rm apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh`. Then:
    grep -rn "idempotency-ktx.sh" apps/qw-oracle/ docs/
  Rewrite each hit to `bun run load-knowledge -- idempotency --project ktx`.
  Empty grep result = nothing to do.

Task 4 -- 5-project catch-up audit:
  Run the probe per project (ezquake / fte / qwcl / mvdsv / ktx); capture
  --json output to /tmp. For each FAIL, triage per D8 (exactly one of):
    - drain-now: real loader bug -> fix rides this commit (D7); append
      F-entry to review-findings.md.
    - HANDOVER: pre-existing anomaly -> defer with explicit reason in
      HANDOVER.md; append F-entry with track=HANDOVER.
    - reject: benign drift -> document in commit body; no F-entry unless
      cross-arc relevant.
  If any FAIL is a genuinely deep loader rewrite (>1 day fix), halt with
  status NEEDS_CONTEXT before staging the bugfix; ask operator whether
  drain-now-with-scope-growth or explicit-defer-to-HANDOVER per D8.

Task 5 -- Commit + push:
  Stage idempotency.ts (added) + index.ts (modified) + idempotency-ktx.sh
  (deleted) + any drain-now bugfixes + any HANDOVER edits + any F-entries
  in review-findings.md. Commit per the phase MD's "Commit body shape"
  template (one-line subject + structured body capturing findings).
  Push to origin per D17.

VERIFICATION (phase boundary):

Run V1-V10 from the phase MD's Verification section in order. Each ends
PASS or FAIL. Per D6, V4's per-project run is the catch-up audit; per D7,
real-bug-fix rides this commit; per D8, every finding gets a track.

If any V fails AND the phase MD's Recovery section doesn't cover the
failure mode, halt with status BLOCKED; report the failure + what was
attempted + recommended next steps.

HALT WITH STRUCTURED STATUS:

Reply to the operator with one of:

- DONE: all V1-V10 PASS; phase MD complete; commit pushed; clean tree.
  Report: commit SHA, V-status summary (V1-V10 all PASS), 5-project audit
  summary (which projects PASS / FAIL), F-entries created (if any).

- DONE_WITH_CONCERNS: V1-V10 PASS but execution surfaced something
  unexpected (e.g., an extract-tag warning that didn't fail but is worth
  noting). Report: same as DONE plus the concern + recommendation.

- NEEDS_CONTEXT: pre-flight critical review flagged a CRITICAL finding;
  OR Task 4 surfaced a deep-fix decision needing operator triage; OR
  mid-execution blocker requires operator decision. Report: the finding
  + recommended phase MD amendment OR the triage question.

- BLOCKED: V failed AND Recovery section doesn't cover; OR an exception
  that's not anticipatable. Report: the failure + what was attempted +
  what's still in flight.

Do NOT proceed to Phase 2. Do NOT modify decisions.md or scaffold
artifacts (review-findings.md F-entry additions are fine; structural
changes are not -- those need explicit operator approval).
