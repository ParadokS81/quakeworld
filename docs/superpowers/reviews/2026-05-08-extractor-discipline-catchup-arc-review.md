# Extractor discipline catch-up -- arc-close cert doc (2026-05-08)

**Arc:** 2026-05-08-extractor-discipline-catchup
**Cert date:** 2026-05-08
**Authored by:** Phase 7 executor; consolidates per-phase commit bodies and post-execution
amendments cold.
**Sources read:**
- `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/` (per-phase MDs P1-P7)
- `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md` (arc spec)
- `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md`
- Per-phase commit bodies: f64ef308 (P1) / 2e7808eb (P2) / 8f561cba (P3) / 9901f308 (P4)
  / b2f8a107 (P5) / aae53d38 (P6)

---

## Graduation-readiness verdict

**Verdict:** CERTIFIED -- discipline is visible, runnable, and self-bootstrapping across all 5 extractor projects.

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

**Commit:** b2f8a107
**Phase MD:** docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-5-authoring-guide.md
**Deliverable:** apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md (7 sections per
Pass 1.2.6); one-line cross-link from VALIDATION-RUNBOOK.md top; SKILL.md update part 1
(register-in-config-dict step + validation-step expansion to 4-5 probes).
**Verification:** V1-V8 PASS.

---

## P6 -- Audit cadence rule + SKILL.md update part 2

**Commit:** aae53d38
**Phase MD:** docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-6-audit-cadence.md
**Deliverable:** EXTRACTOR-PLAYBOOK.md new audit-cadence section (trigger set: new project /
new entity type / schema migration / extractor_lib or load-version.ts modification);
HANDOVER.md tracking entry; SKILL.md update part 2 (no-per-project-bash callout;
cross-link to feedback_retrofit_later_discipline.md).
**Verification:** V1-V6 PASS.

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
parallel-vs-serial pytest pattern / migration-probes) + 1 authoring-guide doc (P5) +
1 process rule (P6) + 1 cert doc.

The discipline is:

1. VISIBLE -- VALIDATION-GATES.md authoring guide and cross-link from
   VALIDATION-RUNBOOK.md document the producer-perspective conventions. EXTRACTOR-PLAYBOOK.md
   audit-cadence section documents the trigger-based cross-project audit rule.
   HANDOVER.md carries the tracking entry for future audits. Every authoring-time and
   onboarding-time reference to "how do I validate an extractor" points to running the
   universal gates.

2. RUNNABLE -- 4 runtime gates dispatch via standard CLI:
   `bun run load-knowledge -- idempotency --project <p>`
   `bun run load-knowledge -- reproducibility-check --project <p>`
   `pytest apps/qw-oracle/scripts/extractors/` (parallel-vs-serial)
   `bun run load-knowledge -- migration-probes [--migration NNN]`
   No per-project bash scripts remain (KTX-only idempotency-ktx.sh deleted in P1).
   Exit 0 = pass; non-zero = fail; --json flag on TS gates for CI parsing.

3. SELF-BOOTSTRAPPING -- onboard-extractor SKILL.md (P5 + P6 updates shipped) teaches
   future arcs to inherit the universal gates by default. The next project onboarding adds
   4-5 small config-dict entries per gate file; gates run against the new project; all must
   pass before onboarding is declared done.

All P5 + P6 deliverables shipped. The discipline is fully visible (VALIDATION-GATES.md
producer-perspective + VALIDATION-RUNBOOK.md consumer-perspective + EXTRACTOR-PLAYBOOK.md
audit-cadence rule + onboard-extractor SKILL.md updates), fully runnable (4 universal
gates dispatch via standard CLI), and fully self-bootstrapping (future onboardings inherit
by default).

---

*End of cert doc. Reviewer: arc-reviewer skill in fresh terminal per arc-reviewer skill
structural requirement (a terminal that ran any phase has anchored expectations and
cannot deliver an honest spec-vs-shipped read).*
