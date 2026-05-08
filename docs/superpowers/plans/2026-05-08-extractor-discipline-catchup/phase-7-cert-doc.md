# Phase 7 -- Arc-close cert doc

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full). DONE.
> 2. Read `review-findings.md` (F1 HANDOVER at draft time). DONE.
> 3. Read parking doc Pass 2.1 (per-gate ship discipline + arc-close cert doc shape) + Pass 2.3. DONE.
> 4. Read per-phase MDs P1-P4 (post-execution amendments + verification sections). DONE.
> 5. Read the KTX onboarding arc review at `docs/superpowers/reviews/2026-05-07-ktx-onboarding-arc-review.md` for shape exemplar. DONE.
> 6. Read `apps/qw-oracle/docs/arc-history.md` for entry shape. DONE.
> 7. Run git log + git show per-phase commit bodies (f64ef308 / 2e7808eb / 8f561cba / 9901f308). DONE.
> 8. Confirm P5 and P6 ship state: NOT SHIPPED at draft time (drafter prompts only). DONE.
> 9. After drafting, dispatch the verification sub-agent. DONE (see bottom of file).

## Goal

Write the arc-close graduation-readiness cert doc for the 2026-05-08
extractor-discipline-catchup arc at
`docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md`.
The cert doc consolidates pass state once at arc close -- one section per runtime gate
recording the cross-project audit disposition for each of the 5 extractor projects
(ezquake / fte / qwcl / mvdsv / ktx) across the 4 runtime gates (P1 idempotency / P2
reproducibility / P3 parallel-vs-serial / P4 migration-probes), a summary of the 2
doc/process gates (P5 authoring guide / P6 audit cadence + SKILL.md updates), the total
findings ledger (F1 plus any others surfaced during P5/P6 execution), HANDOVER
carry-forwards, and a graduation-readiness statement. This phase is paper-only (no
extractor runs, no DB operations). The executor's job is to Write the cert doc file
verbatim from the "Inlined: cert doc" section below (substituting P5/P6 placeholder
blocks with actual SHAs if those phases have shipped at execution time), and to prepend
one entry to `apps/qw-oracle/docs/arc-history.md`. Runnable state at phase boundary:
`docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md` exists;
`apps/qw-oracle/docs/arc-history.md` carries the extractor-discipline-catchup arc entry
above the KTX Layer 1 Onboarding entry.

## Inputs from previous phase

Phase 6 complete (or placeholder if P6 not shipped at execution time):
- P5 (`phase-5-authoring-guide.md`): VALIDATION-GATES.md (7 sections) shipped;
  SKILL.md update part 1 (register-in-config-dict step + validation-step expansion
  to 4-5 probes). Commit: [fill at execution time if shipped; else leave placeholder].
- P6 (`phase-6-audit-cadence.md`): EXTRACTOR-PLAYBOOK.md audit-cadence section +
  HANDOVER.md tracker entry + SKILL.md update part 2 (no-per-project-bash callout).
  Commit: [fill at execution time if shipped; else leave placeholder].
- P1-P4: shipped (f64ef308 / 2e7808eb / 8f561cba / 9901f308). Cross-project audit
  pass state confirmed per each phase's commit body and post-execution amendments.
- `review-findings.md` carries F1 (HANDOVER track; per-project conftest.py fix
  deferred from Phase 3).

## Files touched

### Created

```
docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md
```

### Modified

```
apps/qw-oracle/docs/arc-history.md   # prepend extractor-discipline-catchup arc entry above KTX entry
```

### Deleted

```
(none)
```

## Tasks

### Task 1 -- Write the cert doc

**Goal:** Write `docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md`
verbatim from the "Inlined: cert doc" section below.

**Files:** `docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md` (create)

**Steps:**
- [ ] Verify the parent directory exists: `test -d docs/superpowers/reviews && echo "OK"`.
- [ ] If P5 has shipped at execution time, replace the `[P5 placeholder -- TBD]` block in
  the cert doc with the actual commit SHA, deliverable summary, and verification probe results.
  Otherwise leave the placeholder verbatim.
- [ ] If P6 has shipped at execution time, replace the `[P6 placeholder -- TBD]` block with
  actual commit SHA, deliverable summary, and verification probe results.
- [ ] Write the file from the "Inlined: cert doc" section below.

**Verification:**
- `test -f docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md && echo "PASS"`
- `wc -l docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md` -- >= 80 lines.
- `grep -c "PASS" docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md` -- >= 10.

PASS condition: all three checks satisfied.
FAIL condition: file missing, too short, or fewer than 10 PASS instances.

**Execution mode:** `inline` -- markdown authoring with full cert-doc content shipped below.
Per D15: P5-P7 are markdown-heavy; inline is the correct mode. No code synthesis.

---

### Task 2 -- Prepend arc-history entry

**Goal:** Prepend the extractor-discipline-catchup arc entry to `apps/qw-oracle/docs/arc-history.md`
above the "## 2026-05-05 -- KTX Layer 1 Onboarding" header.

**Files:** `apps/qw-oracle/docs/arc-history.md` (modify)

**Steps:**
- [ ] Read the existing `apps/qw-oracle/docs/arc-history.md` (lines 1-10) to locate the
  `---` separator line and the subsequent `## 2026-05-05 -- KTX Layer 1 Onboarding` header.
- [ ] Insert the arc entry from "Inlined: arc-history entry" below between the `---` separator
  and the KTX header. The result should have the extractor-discipline-catchup section
  immediately before the KTX Layer 1 Onboarding section.
- [ ] If P5 or P6 are not shipped at execution time, note their status inline in the arc
  entry paragraph ("P5 pending / P6 pending").

**Verification:**
- `grep -n "extractor-discipline-catchup\|KTX Layer 1" apps/qw-oracle/docs/arc-history.md | head -4`
  PASS condition: extractor-discipline-catchup appears at a lower line number than KTX Layer 1.
- `head -15 apps/qw-oracle/docs/arc-history.md` shows the extractor-discipline-catchup
  section header appearing after the preamble `---` separator.

PASS condition: extractor-discipline-catchup entry above KTX entry; no merge artifacts.
FAIL condition: ordering reversed, entry absent, or arc-history.md corrupted.

**Execution mode:** `inline` -- paragraph text prepend. Per D15.

---

### Task 3 -- Commit the phase as one logical unit

**Goal:** Ship Phase 7 as a single commit per D13 and D17.

**Files:** Staging area only.

**Steps:**
- [ ] `git add docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md`
- [ ] `git add apps/qw-oracle/docs/arc-history.md`
- [ ] Commit with the message from "Commit body" below.
- [ ] `git push origin main`

**Verification:**
- `git log -1 --stat` shows cert doc (added) and arc-history (modified) in one commit.
- `git status` returns clean.
- Remote main matches local HEAD.

PASS condition: single commit; clean tree; remote up to date.
FAIL condition: multiple commits, untracked files remain, or push failed.

**Execution mode:** `inline` -- standard git workflow per D17.

---

## Inlined: cert doc

Write verbatim to
`docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md`.

```markdown
# Extractor discipline catch-up -- arc-close cert doc (2026-05-08)

**Arc:** 2026-05-08-extractor-discipline-catchup
**Cert date:** [fill at Phase 7 execution time]
**Authored by:** Phase 7 executor; consolidates per-phase commit bodies and post-execution
amendments cold.
**Sources read:**
- `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/` (per-phase MDs P1-P7)
- `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md` (arc spec)
- `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md`
- Per-phase commit bodies: f64ef308 (P1) / 2e7808eb (P2) / 8f561cba (P3) / 9901f308 (P4)
  / [P5 SHA] / [P6 SHA]

---

## Graduation-readiness verdict

**Verdict:** CERTIFIED -- discipline is visible and runnable across all 5 extractor
projects. Full self-bootstrapping pending P5 + P6 ship (see placeholders below).

The extractor-discipline-catchup arc lifts KTX-grade extractor validation discipline
to universal coverage. Four runtime gates certified across all 5 extraction projects.
Authoring-guide doc (P5) + audit-cadence rule (P6) complete the documentation and
process tail. Onboard-extractor SKILL.md updates (P5 + P6) make the discipline
self-bootstrapping for future engine ports.

---

## Per-gate cross-project pass state

    Gate                 | ezquake       | fte           | qwcl          | mvdsv         | ktx
    ---------------------|---------------|---------------|---------------|---------------|---------------
    idempotency (P1)     | PASS          | PASS          | PASS          | PASS          | PASS
    reproducibility (P2) | PASS          | PASS          | PASS          | PASS          | PASS
    parallel-serial (P3) | deferred-safe | deferred-safe | deferred-safe | NEW PASS      | UPDATED PASS
    migration-probes (P4)| GLOBAL: 12/12 PASS (gate is not per-project)

Notes on P1 fte + qwcl: first-run showed drift (extract-tag materializing HEAD for
projects that had only one version loaded pre-phase). Explicit reject per D8 -- loader
IS idempotent; first-run drift was state-fill catch-up, not a regression. Steady-state
audit: all 5 PASS.

Notes on P3 deferred-safe: ezquake / fte / qwcl have no parallel-aggregation-risky
handlers. All handlers in those projects use the safe end_file -> finalize(all_rows=...)
pattern with no cross-worker instance state. Formally deferred per D8 with per-handler
rationale documented in phase-3-parallel-serial-tests.md. "Deferred-safe" is NOT
"untested" -- it is a documented negative conclusion from the catch-up audit.

---

## P1 -- Idempotency gate

**Commit:** f64ef308
**Phase MD:** `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-1-idempotency-probe.md`
**Deliverable:** `apps/qw-oracle/scripts/load-knowledge/idempotency.ts` (universal probe;
lifts KTX-only idempotency-ktx.sh). Dispatcher case `case 'idempotency':` in index.ts.
Per-project config dict (5 entries). KTX-only idempotency-ktx.sh deleted in same commit.
**Invocation:** `bun run load-knowledge -- idempotency --project <p>` | `--all`

Per-project audit (D6):

    Project | Tables checked | Audit result | Notes
    --------|----------------|--------------|------
    ezquake | 11             | PASS         | First run; idempotent
    fte     | 7              | PASS         | Steady state; first-run state-fill: explicit reject (D8)
    qwcl    | 4              | PASS         | Steady state; first-run state-fill: explicit reject (D8)
    mvdsv   | 8              | PASS         | First run; idempotent
    ktx     | 8              | PASS         | First run; idempotent

Concern noted at phase close (V6 stdout contamination, phase-1 post-execution amendment):
extract-tag's Python child processes use stdio:'inherit', interleaving progress lines
with the gate's JSON output on fd 1. JSON is valid when isolated. Workaround:
`2>/dev/null | sed -n '/^[\[{]/,$p'`. Full fix belongs in the CI arc (scope Python child
stdio to stderr uniformly across all gates, OR add --json-out <path> file-output flag).
Not a correctness defect; tracked as a CI-arc carry-forward.

CI-readiness conventions (D2): --project / --all / --json / --help / env-var DATABASE_URL
/ no CWD assumptions / deterministic output -- all present.

---

## P2 -- Reproducibility gate

**Commit:** 2e7808eb
**Phase MD:** `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-2-reproducibility-probe.md`
**Deliverable:** `apps/qw-oracle/scripts/load-knowledge/reproducibility-check.ts`.
Dispatcher case `case 'reproducibility-check':` in index.ts. Per-project config dict
(5 entries; source roots + optional --workers). Packages VALIDATION-RUNBOOK Section 1.1
methodology as runnable. Filesystem-only; no database required.
**Invocation:** `bun run load-knowledge -- reproducibility-check --project <p>`

Per-project audit (D6):

    Project | Audit result | Notes
    --------|--------------|------
    ezquake | PASS         | Zero git diff on output/
    fte     | PASS         | Zero git diff on output/
    qwcl    | PASS         | Zero git diff on output/
    mvdsv   | PASS         | Zero git diff on output/
    ktx     | PASS         | Zero git diff on output/

FTE asset-bundle re-stamp concern (carried from P1): slipgate bundle file
(apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json) is NOT in
extractors/fte/output/; out of reproducibility probe scope. Explicit reject per D8.

Two drain-now fixes applied inline (not in phase MD; committed in P2 commit): git diff
scoped to output/ dir via path spec; extractResult.stderr optional chaining.

CI-readiness conventions (D2): all present.

---

## P3 -- Parallel-vs-serial gate

**Commit:** 8f561cba
**Phase MD:** `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-3-parallel-serial-tests.md`
**Deliverable:** `apps/qw-oracle/scripts/extractors/extractor_lib/tests/parallel_serial_helpers.py`
(lifted universal helper). `extractor_lib/tests/__init__.py` exports
`assert_parallel_serial_equivalent`. New: `mvdsv/tests/__init__.py` +
`mvdsv/tests/test_handler_protocol_parallel_serial.py`. Updated:
`ktx/tests/test_handler_gameplay_taxonomies.py` + `ktx/tests/test_handler_modes.py`.
**Invocation:** `pytest apps/qw-oracle/scripts/extractors/`

Per-project audit (D6):

    Project | Action              | Audit result  | Rationale
    --------|---------------------|---------------|----------
    ezquake | deferred-safe       | n/a           | 8 handlers; all use end_file -> finalize(all_rows=...) safe pattern
    fte     | deferred-safe       | n/a           | Same safe pattern; self._all_rows confirmed dead init
    qwcl    | deferred-safe       | n/a           | Simplest handler set; same safe pattern
    mvdsv   | NEW test            | PASS          | _handler_protocol.py: MACRO_DEFINITION walk + source_total invariance certified
    ktx     | UPDATED tests PASS  | PASS          | gameplay_taxonomies (D.3.1 fix) + modes (F25 fix) tests use lifted helper

Note: pytest is the universal dispatcher for this gate (D4 carve-out). No dispatcher
case in index.ts; CI-ready by being pytest.

V6 (full-suite pytest --collect-only) fails due to F1 sys.path pollution. V7 with
--continue-on-collection-errors: all 3 parallel-serial tests PASS.

---

## P4 -- Migration probes gate

**Commit:** 9901f308
**Phase MD:** `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-4-migration-probes.md`
**Deliverable:** `apps/qw-oracle/scripts/load-knowledge/migration-probes.ts` (CLI runner) +
`apps/qw-oracle/db/migration-probes.ts` (explicit probe registry; 12 entries mapping
migration filename to probe function). Dispatcher case `case 'migration-probes':` in
index.ts. Migrations are global (not per-project); --migration NNN filters to single probe.
**Invocation:** `bun run load-knowledge -- migration-probes [--migration NNN]`

Probe results (global gate; 12/12 PASS):

    Migration                                    | Status | Notes
    ---------------------------------------------|--------|------
    001_init.sql                                 | PASS   | Tables / columns / indexes / sentinel inserts
    002_layer1_schema.sql                        | PASS   | Structural assertions
    003_layer1_entities_search.sql               | PASS   | Structural assertions
    004_layer2_chat.sql                          | PASS   | Structural assertions
    005_layer3_concepts.sql                      | PASS   | Structural assertions
    006_embedding_api_log.sql                    | PASS   | Structural assertions
    007_query_log.sql                            | PASS   | Structural assertions
    008_community_schema.sql                     | PASS   | Structural assertions
    009_ktx_log_template_logfile_channel.sql     | PASS   | Port of VALIDATION-RUNBOOK SQL; CHECK sentinels correct
    010_ktx_match_event_type.sql                 | PASS   | match_event CHECK sentinels correct
    011_ktx_gameplay_kinds.sql                   | PASS   | gameplay_sources ktx pre-flight satisfied; CHECK sentinels correct
    012_description_origin.sql                   | PASS   | Column exists; 0 rows with non-NULL description + NULL origin

Findings: none. No drain-now bugs; no HANDOVER items. 012 backfill gap was 0 rows.

JSONB binding (D12): 009/010/011 sentinel inserts use JS values direct (as any cast for
postgres-js overload constraints). No JSON.stringify to TEXT.

---

## P5 -- Authoring guide doc + SKILL.md update part 1

[P5 placeholder -- TBD]

Status at cert draft time (2026-05-08): not shipped. Drafter prompt at
`docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-5-drafter-prompt.md`.

When P5 ships, replace this block with:
  Commit: <SHA>
  Deliverable: apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md (7 sections per
    Pass 1.2.6); one-line cross-link from VALIDATION-RUNBOOK.md top; SKILL.md update part 1
    (new register-in-config-dict step + validation-step expansion to 4-5 probes).
  Verification: V1-VN PASS.

---

## P6 -- Audit cadence rule + SKILL.md update part 2

[P6 placeholder -- TBD]

Status at cert draft time (2026-05-08): not shipped. Drafter prompt at
`docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-6-drafter-prompt.md`.

When P6 ships, replace this block with:
  Commit: <SHA>
  Deliverable: EXTRACTOR-PLAYBOOK.md new audit-cadence section (trigger set: new project /
    new entity type / schema migration / extractor_lib or load-version.ts modification);
    HANDOVER.md tracking entry; SKILL.md update part 2 (no-per-project-bash callout;
    cross-link to feedback_retrofit_later_discipline.md).
  Verification: V1-VN PASS.

---

## Total findings ledger

    F-num | Title                                               | Track    | Phase     | Disposition
    ------|-----------------------------------------------------|----------|-----------|------------
    F1    | Full-suite pytest sys.path pollution (FTE + QW)     | HANDOVER | Phase 3   | Per-project conftest.py fix deferred; all per-handler tests PASS in isolation

No drain-now bugs across all 4 shipped runtime gates (P1-P4). P1 first-run anomalies
(fte + qwcl state-fill) triaged as explicit-reject per D8 (loader IS idempotent). P2
FTE asset-bundle concern triaged as explicit-reject (out of probe scope). P3 deferred
handlers formally documented as safe-pattern per D8.

---

## HANDOVER carry-forwards from this arc

**F1 -- Per-project conftest.py (from Phase 3):**
Root cause: multiple tests/ package namespaces in the same pytest session
(extractor_lib/tests/ + qw/tests/ + mvdsv/tests/) cause sys.path pollution when pytest
discovers all projects in one run. All per-handler tests PASS in isolation. Fix: add
per-project conftest.py files inserting the project-specific handler dir at sys.path[0]
and excluding the ezquake handler dir, OR rename per-project test packages
(ktx_tests / fte_tests / qw_tests / mvdsv_tests) to avoid the shared `tests` namespace.
Evidence: phase-3-parallel-serial-tests.md + review-findings.md F1.

**V6 stdout contamination (from Phase 1 post-execution amendment):**
Extract-tag's Python children use stdio:'inherit'; their progress lines interleave with
JSON output on fd 1. Workaround documented. Full fix: CI arc scopes child stdio to
stderr uniformly across all gates, OR gates add --json-out <path> flag. Tracked under
CI arc carry-forward; no review-findings.md entry (P1 commit was clean in steady state).

**Separate future arcs (from brainstorm parking doc, unchanged):**
- CI setup arc: wires universal probes into workflow YAML + Postgres service container.
  Unblocked the moment P1-P4 ship.
- Contributor onboarding doc / CONTRIBUTING.md: holistic graduation-shape doc.
- Test-coverage parity per project: ezquake 1 / fte 1 / qwcl 0 / mvdsv 0 / ktx 3
  test files (excluding parallel-serial tests added in this arc).
- Stage 3 snapshot probes: parked until slipgate-app snapshot needs stabilize.
- "Tag every generated output" probe: low-priority HANDOVER small followup.
- "Schema evolution is append-only" manifest-hash check: low-priority HANDOVER.
- Regen-after-extract automation: folds into CI arc.

---

## Graduation-readiness statement

The arc shipped 4 universal runtime probes (idempotency / reproducibility /
parallel-vs-serial pytest pattern / migration-probes) + [1 doc pending P5] +
[1 process rule pending P6] + 1 cert doc.

The discipline is:

1. VISIBLE -- VALIDATION-GATES.md authoring guide [P5; pending] and cross-link from
   VALIDATION-RUNBOOK.md document the producer-perspective conventions. EXTRACTOR-PLAYBOOK.md
   audit-cadence section [P6; pending] documents the trigger-based cross-project audit rule.
   HANDOVER.md [P6; pending] carries the tracking entry for future audits. When P5 + P6 ship,
   every authoring-time and onboarding-time reference to "how do I validate an extractor"
   points to running the universal gates.

2. RUNNABLE -- 4 runtime gates dispatch via standard CLI:
   `bun run load-knowledge -- idempotency --project <p>`
   `bun run load-knowledge -- reproducibility-check --project <p>`
   `pytest apps/qw-oracle/scripts/extractors/` (parallel-vs-serial)
   `bun run load-knowledge -- migration-probes [--migration NNN]`
   No per-project bash scripts remain (KTX-only idempotency-ktx.sh deleted in P1).
   Exit 0 = pass; non-zero = fail; --json flag on TS gates for CI parsing.

3. SELF-BOOTSTRAPPING -- onboard-extractor SKILL.md [P5 + P6 updates; pending] teaches
   future arcs to inherit the universal gates by default. The next project onboarding adds
   4-5 small config-dict entries per gate file; gates run against the new project; all must
   pass before onboarding is declared done.

Pending P5 + P6: runtime gates (P1-P4) are fully runnable and certified cross-project.
Full visibility and self-bootstrapping require P5 + P6 to ship. The discipline is
partially visible (VALIDATION-RUNBOOK.md covers consumer-perspective validation;
VALIDATION-GATES.md producer-perspective and EXTRACTOR-PLAYBOOK.md audit-cadence rule
are pending) and fully runnable.

---

*End of cert doc. Reviewer: arc-reviewer skill in fresh terminal per arc-reviewer skill
structural requirement (a terminal that ran any phase has anchored expectations and
cannot deliver an honest spec-vs-shipped read).*
```

---

## Inlined: arc-history entry

Prepend to `apps/qw-oracle/docs/arc-history.md` immediately after the `---` separator line
and before the existing `## 2026-05-05 -- KTX Layer 1 Onboarding` header. One paragraph
followed by per-phase one-liners (matching the KTX onboarding shape in arc-history.md).

```markdown
## 2026-05-08 -- Extractor discipline catch-up -- ARC SHIPPED (Phases 1-7 complete)

Extractor discipline catch-up arc lifts KTX-grade extractor validation discipline
(idempotency / reproducibility / parallel-vs-serial / per-migration probes) to universal
coverage across all 5 extraction projects (ezquake / fte / qwcl / mvdsv / ktx),
retroactively certifies existing projects against the 4 runtime gates, and bakes the
discipline into the onboarding skill so future codebases inherit by default. Arc spec:
`docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md`. Plan:
`docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`. Cert doc:
`docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md`. Single
F1 HANDOVER (pytest sys.path pollution in full-suite mode; per-handler tests PASS in
isolation). KTX-only idempotency-ktx.sh deleted in P1. Next arc: CI setup for qw-oracle
(wires universal probes into workflow YAML; unblocked once P1-P4 ship).

- **Phase 1 (2026-05-08): idempotency gate -- DONE (f64ef308).** Universal idempotency.ts
  lifts KTX-only bash. All 5 projects PASS in steady state. DONE_WITH_CONCERNS (V6 stdout
  contamination + V8 historical-narration grep; both amended in phase MD).
- **Phase 2 (2026-05-08): reproducibility gate -- DONE (2e7808eb).** reproducibility-check.ts;
  filesystem-only; all 5 PASS. Two drain-now fixes (git diff scoped to output/; stderr
  optional chaining) committed inline.
- **Phase 3 (2026-05-08): parallel-vs-serial gate -- DONE (8f561cba).** parallel_serial_helpers.py
  lifted to extractor_lib/tests/; mvdsv new test PASS; ktx tests updated PASS;
  ezquake/fte/qwcl deferred-safe. F1 HANDOVER (sys.path pollution).
- **Phase 4 (2026-05-08): migration probes gate -- DONE (9901f308).** migration-probes.ts
  runner + db/migration-probes.ts registry; 12/12 PASS; no findings.
- **Phase 5: authoring guide + SKILL.md part 1 -- [status at arc close].** VALIDATION-GATES.md
  (7 sections) + VALIDATION-RUNBOOK.md cross-link + onboard-extractor SKILL.md update
  (register-in-config-dict step + validation-step expansion to 4-5 probes).
- **Phase 6: audit cadence + SKILL.md part 2 -- [status at arc close].** EXTRACTOR-PLAYBOOK.md
  audit-cadence section + HANDOVER.md tracker entry + SKILL.md no-per-project-bash callout.
- **Phase 7: cert doc -- DONE.** Arc-close graduation-readiness cert doc. This entry.
```

---

## Verification (phase boundary)

### V1 -- Cert doc exists

```
test -f docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md && echo "PASS"
```

PASS condition: prints "PASS".
FAIL condition: file missing.

### V2 -- Cert doc has all four runtime gate sections

```
grep -E "^## P[1-4]" docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md
```

PASS condition: 4 lines returned (P1 / P2 / P3 / P4 headers).
FAIL condition: fewer than 4.

### V3 -- PASS count sanity (per-gate tables populated)

```
grep -c "PASS" docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md
```

PASS condition: >= 10 (5 idempotency rows + 5 reproducibility rows + 2 parallel-serial
rows + 12 migration probe rows + graduation-readiness section).
FAIL condition: < 10.

### V4 -- F1 HANDOVER documented

```
grep "F1" docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md | head -3
```

PASS condition: at least one match referencing pytest sys.path pollution.
FAIL condition: no matches.

### V5 -- Arc-history ordering correct

```
grep -n "extractor-discipline-catchup\|KTX Layer 1" apps/qw-oracle/docs/arc-history.md | head -4
```

PASS condition: extractor-discipline-catchup entry line number < KTX Layer 1 entry line number.
FAIL condition: ordering reversed or extractor-discipline-catchup entry missing.

### V6 -- ASCII discipline (D16)

```
python3 -c "
with open('docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md', 'rb') as f:
    data = f.read()
hits = [(i, b) for i, b in enumerate(data) if b > 127]
print('PASS') if not hits else print('FAIL: non-ASCII at', hits[:3])
"
```

PASS condition: prints "PASS".
FAIL condition: any non-ASCII bytes reported (em-dash / en-dash / smart quote / emoji).

### V7 -- Commit clean and pushed

```
git log -1 --stat
git status
git log origin/main -1 --oneline
```

PASS condition: log shows cert doc (added) + arc-history (modified) in one commit;
status clean; remote matches local HEAD.
FAIL condition: untracked files remain; remote behind.

---

## Outputs to next phase

n/a -- Phase 7 is the final phase in the arc.

Post-arc actions (operator-initiated, not executor-automated):
- Run `arc-reviewer` in a fresh terminal per `arc-reviewer` skill structural requirement.
  Reviewer reads parking doc + decisions + per-phase MDs + cert doc cold; produces
  DELIVERED / DELIVERED-DIFFERENT / DEFERRED / MISSING walkthrough + Arc N+1 prep
  recommendations.
- Update `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/README.md`
  "Where we are right now" to reflect Phase 7 shipped.

---

## Open questions / deferred items

- **Question:** P5 and P6 are not shipped at cert draft time. Should Phase 7 execute
  before or after P5 and P6?
  **Default chosen for now:** Phase 7 executes after P5 and P6 ship. The cert doc's
  placeholder blocks will be filled in at execution time when P5 and P6 SHAs are available.
  The graduation-readiness statement already accounts for the pending state (partial
  visibility language). If the operator decides to execute Phase 7 before P5/P6, the
  placeholders commit as-is and Phase 7 is amended later (not the recommended path; prefer
  execution order P5 -> P6 -> P7).
  **Who can resolve:** Operator.

- **Question:** Should the arc-history entry include per-phase commit SHAs for P5 and P6?
  **Default chosen for now:** Leave P5 + P6 phase bullets as "[status at arc close]" in the
  inlined template; executor fills in actual SHAs at execution time.
  **Who can resolve:** No further resolution needed; executor fills in at run time.

- **Question:** Should the cert doc migration probe table list all 12 migrations individually,
  or group 001-008?
  **Default chosen for now:** List all 12 individually. The commit body confirms all 12 by
  name (P4 skeleton shipped the full registry); individual rows give the graduation artifact
  more specificity.
  **Who can resolve:** Operator at review time if grouping preferred.

---

## Recovery (if verification fails)

- **V1 fails (file not found):** Write step was not executed or wrote to wrong path.
  Verify `test -d docs/superpowers/reviews && echo "OK"` first; re-write the file.
- **V2 fails (P1-P4 headers missing):** Section header typo in cert doc. Headers must start
  with `## P1`, `## P2`, `## P3`, `## P4`.
- **V3 fails (<10 PASS instances):** Per-project audit tables or probe-result rows were
  dropped from cert doc. Verify the inlined content was written verbatim.
- **V4 fails (F1 not mentioned):** Findings ledger section was dropped or the F1 row was
  omitted. Re-check inlined cert doc content.
- **V5 fails (ordering wrong):** Arc-history entry was appended at end instead of prepended.
  Re-write arc-history.md prepending the entry between the `---` separator and the
  `## 2026-05-05 -- KTX Layer 1 Onboarding` line.
- **V6 fails (non-ASCII bytes):** Cert doc contains an em-dash, en-dash, smart quote, or
  emoji (D16 violation). Locate the offending bytes; replace with ASCII hyphen-minus or
  ASCII equivalent.
- **V7 fails (dirty tree):** Standard git status / push triage.

---

## Findings resolved by this phase (per `review-findings.md`)

- F1 (Full-suite pytest sys.path pollution): Phase 3 surfaced this; Phase 7 records it in
  the cert doc findings ledger. The finding itself is not resolved here -- it remains
  HANDOVER. The cert doc records the track and disposition for the graduation artifact.

---

## Commit body

```
extractor-discipline-catchup phase 7: arc-close cert doc

Arc-close graduation-readiness cert doc at
docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md.
Prepends extractor-discipline-catchup arc entry to
apps/qw-oracle/docs/arc-history.md.

Per-gate pass state (P1-P4 consolidated from commit bodies):
  P1 idempotency:       all 5 projects PASS steady state (f64ef308)
  P2 reproducibility:   all 5 projects PASS (2e7808eb)
  P3 parallel-serial:   ezquake/fte/qwcl deferred-safe; mvdsv NEW PASS;
                        ktx UPDATED PASS; F1 HANDOVER (8f561cba)
  P4 migration-probes:  12/12 global PASS (9901f308)
  P5 authoring guide:   [SHA at execution time]
  P6 audit cadence:     [SHA at execution time]

Total findings: F1 HANDOVER (pytest sys.path pollution; per-handler tests all
PASS in isolation). No drain-now bugs across P1-P4.

Graduation-readiness: 4 runtime gates runnable and certified cross-project.
Full visibility + self-bootstrapping pending P5 + P6 ship.
```

---

## Verification sub-agent dispatch

After drafting this phase MD, dispatch a sub-agent with:
- Tool: Agent
- subagent_type: Explore
- model: Sonnet medium

Prompt (with absolute paths substituted):

```
You are verifying a draft plan phase against the live codebase.

Working directory: /home/paradoks/projects/quakeworld

Read this phase MD:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-7-cert-doc.md
Read decisions.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
Read review-findings.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
Read the relevant section of the brainstorm parking doc:
  /home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
  (relevant Pass section: Pass 2.1 -- per-gate ship discipline + arc-close cert doc shape)
Read the arc-history.md to confirm entry shape:
  /home/paradoks/projects/quakeworld/apps/qw-oracle/docs/arc-history.md

Then verify:

1. Every file path in "Files touched":
   - Modified: verify `apps/qw-oracle/docs/arc-history.md` exists in the live codebase.
   - Created: verify `docs/superpowers/reviews/` directory exists. Flag CRITICAL if missing.

2. Per-gate pass state accuracy:
   Run `git -C /home/paradoks/projects/quakeworld show f64ef308 --format="%B" --no-patch | head -30`
   to verify P1 5-project audit. Cross-check against the cert doc's P1 table.
   Run `git -C /home/paradoks/projects/quakeworld show 2e7808eb --format="%B" --no-patch | head -30`
   for P2. Cross-check against cert doc P2 table.
   Run `git -C /home/paradoks/projects/quakeworld show 8f561cba --format="%B" --no-patch | head -30`
   for P3. Cross-check against cert doc P3 table.
   Run `git -C /home/paradoks/projects/quakeworld show 9901f308 --format="%B" --no-patch | head -30`
   for P4. Cross-check against cert doc P4 table.
   Flag CRITICAL on any mismatch between commit body and cert doc.

3. F1 finding accuracy:
   Read review-findings.md F1 entry. Verify the cert doc findings ledger matches the
   finding description, track (HANDOVER), and disposition. Flag SUBSTANTIVE on mismatch.

4. Arc commit SHAs in git log:
   Run `git -C /home/paradoks/projects/quakeworld log --pretty=format:"%H %s" | grep "extractor-discipline-catchup phase [1-4]"`
   to confirm all 4 phase commits are present. Flag CRITICAL if any is missing.

5. Arc-history entry shape:
   Read the first 15 lines of arc-history.md. Confirm the entry in "Inlined: arc-history
   entry" would prepend ABOVE the existing "## 2026-05-05 -- KTX Layer 1 Onboarding" block.
   Confirm the header format matches the existing arc entries (## YYYY-MM-DD -- Name -- STATUS).
   Flag SUBSTANTIVE on shape mismatch.

6. Execution mode declarations:
   All 3 tasks declared inline. For a markdown-authoring-only phase (P7), per D15, this is
   correct. Confirm all 3 have inline declaration with rationale. Flag SUBSTANTIVE if any
   task lacks a rationale.

7. ASCII discipline (D16):
   Scan the inlined cert doc section of the phase MD for em-dashes (--), en-dashes,
   smart quotes, or emoji. Flag ADVISORY for any non-ASCII characters found.

8. Phase MD shape vs phase-template.md:
   Confirm all mandatory sections are present: Goal / Inputs from previous phase /
   Files touched (Created / Modified / Deleted) / Tasks / Verification (phase boundary) /
   Outputs to next phase / Open questions / Recovery / Findings resolved /
   Verification sub-agent dispatch. Flag CRITICAL for any missing mandatory section.

9. Graduation-readiness statement covers three items:
   Per Pass 2.1, verify the cert doc's graduation-readiness statement covers:
   (1) discipline is visible; (2) discipline is runnable; (3) discipline is self-bootstrapping.
   Flag SUBSTANTIVE if any of the three is missing.

10. Parallel-serial deferred-safe rationale:
    Verify that the cert doc explicitly explains WHY ezquake/fte/qwcl were deferred
    ("deferred-safe" with documented rationale, not "untested"). Read phase-3-parallel-serial-tests.md
    to confirm the rationale matches. Flag SUBSTANTIVE if the cert doc frames deferred handlers
    as untested without documented rationale.

11. Migration names accuracy:
    Read `apps/qw-oracle/db/migration-probes.ts` or the phase-4 MD to verify the 12 migration
    filenames listed in the cert doc's P4 table are correct. Flag SUBSTANTIVE on any mismatch.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

---

*End of Phase 7 phase MD.*
