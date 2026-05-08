# Extractor discipline catch-up -- post-arc analysis (2026-05-08)

**Reviewer:** post-arc fresh terminal (did not execute any phase).
**Cert doc separate:** the executor's per-phase summary lives at
`docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md`. This doc
is the cold spec-vs-shipped read; the cert doc reads as anchored-on-execution by design.

**Sources read:**

- Brainstorm parking doc: `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md` (Pass 1 + Pass 2 outcomes, locked 2026-05-08).
- Pass 2 handoff + arc-planner handoff + arc-planner resume:
  `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup-{pass2,planner,planner-resume}-handoff.md`.
- Arc scaffold: `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`
  (README + decisions + review-findings + prerequisites + phase-template + phase MDs P1-P7
  + drafter / executor prompts).
- Cert doc: `docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md`.
- arc-history entry at `apps/qw-oracle/docs/arc-history.md` (2026-05-08 prepended block).
- Live shipped artifacts: `apps/qw-oracle/scripts/load-knowledge/{idempotency,reproducibility-check,migration-probes,VALIDATION-GATES.md}` + `apps/qw-oracle/db/migration-probes.ts` + `apps/qw-oracle/scripts/extractors/extractor_lib/tests/parallel_serial_helpers.py` + `apps/qw-oracle/scripts/extractors/{mvdsv,ktx}/tests/` + `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` (Cross-project audit cadence section) + `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` (cross-link) + `~/.claude/skills/onboard-extractor/SKILL.md` (Phases F4.5 + F5 + anti-pattern callout).
- Git log: phase commits f64ef308 / 2e7808eb / 8f561cba / 9901f308 / b2f8a107 / aae53d38 / ab1551db plus ship-housekeeping commits.
- HANDOVER.md (lines 28 + 33 -- new entries from this arc).

---

## Verdict

The arc shipped what it promised. All seven phases delivered runnable, documented gates;
all four shipped runtime probes pass cleanly across all five projects in steady state; the
authoring guide + audit-cadence rule + skill update + cert doc all landed at the spec-named
paths. Two spec sections are DELIVERED-DIFFERENT (idempotency probe shipped without the
optional `--no-extract` flag; parallel-vs-serial three projects are formally
"deferred-safe" rather than tested-with-blanket-coverage). Three Pass-1 carry-forwards are
properly DEFERRED (CI setup / contributor onboarding doc / Stage 3 snapshot probes) per
their explicit non-goal status.

Zero items are MISSING. Decisions.md carries the original 17 locked decisions with no
mid-arc amendments needed -- the brainstorm pre-locked the surface area cleanly. F1 (pytest
sys.path pollution; HANDOVER) is the lone open finding, with per-handler tests passing in
isolation; safe deferral.

Six items shipped beyond spec (genuine execution-time learning -- not scope creep): a
dual-shape Section 1 in VALIDATION-GATES.md (TS subcommand AND pytest discovery), a
critical export-name-discrepancy guard in Section 2, two drain-now drafter fixes in
Phase 2, an F4 stale-commands fix folded into Phase 5, and a quality-grid.ts comment-only
sqlite3->psql cleanup in Phase 5.

Three YELLOWs at sign-off: F1 conftest pollution (HANDOVER, sized 1-2 hours), V6 stdout
contamination during JSON output (extract-tag stdio:'inherit' interleaving; CI-arc
carry-forward), and Phase 2's commit-subject convention break (informational, not
actionable per D17). One housekeeping miss surfaced during this review: the
`phase-2-executor-prompt.md` file is absent from the scaffold while every other phase
carries one.

The arc closed clean enough to graduate to the next arc (CI setup) without any drain-now
prerequisites.

---

## Spec section walkthrough

### Pass 1.1 -- Gate inventory: 5 universal probes + 1 process rule + 1 doc deliverable

Status: **DELIVERED**.
Evidence: `apps/qw-oracle/scripts/load-knowledge/{idempotency,reproducibility-check,migration-probes}.ts` exist (13064 / 9361 / 4636 bytes); `apps/qw-oracle/scripts/extractors/extractor_lib/tests/parallel_serial_helpers.py` exists (3824 bytes); `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md` exists (16022 bytes); `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` carries the new "Cross-project audit cadence" section at line 1075. Five probes + one process rule + one doc deliverable accounted for. Cert doc (P7) is the seventh artifact and is in place.

### Pass 1.2.1 -- Idempotency probe (Phase 1)

Status: **DELIVERED-DIFFERENT**.
Evidence: `idempotency.ts` shipped at `f64ef308`; KTX-only `idempotency-ktx.sh` deleted in same commit (verified absent); per-project config dict has 5 entries (PROJECT_IDEMPOTENCY_CONFIG); 5-project catch-up audit clean in steady state (FTE / QWCL first-run state-fill triaged as explicit-reject per D8 -- loader IS idempotent).
Notes: The optional `--no-extract` flag from Pass 1.2.1 ("recommend including") was consciously deferred at draft time -- Phase 1 MD's Open question 1 documents the rationale (state-management complexity for snapshot-now-then-diff-later workflow; other 4 gates ship without analogues). This is documented deferral, not an oversight; drainable as a post-arc HANDOVER followup if operationally useful. The `--all` optional flag did ship.

### Pass 1.2.2 -- Per-migration validation probes (Phase 4)

Status: **DELIVERED**.
Evidence: `migration-probes.ts` runner + `db/migration-probes.ts` registry shipped at `9901f308`; registry has all 12 entries (001_init.sql through 012_description_origin.sql); 12/12 PASS on dev DB; explicit registry pattern (NOT auto-discovery from migration SQL) implemented per Pass 1.2.2's explicit-vs-discovery decision; --migration NNN filter works.
Notes: Probes 009-011 are mechanical ports of VALIDATION-RUNBOOK SQL (already authored as positive-shape and negative-shape blocks); probes 001-008 are the retroactive Pass 2 additions; probe 012 is the new description_origin migration. Sentinel inserts use JSONB direct-bind (typed `as any` for postgres-js overload constraints) per D12; no JSON.stringify-to-TEXT regressions. 012 backfill gap was 0 rows.

### Pass 1.2.3 -- Parallel-vs-serial test pattern (Phase 3)

Status: **DELIVERED-DIFFERENT**.
Evidence: `extractor_lib/tests/parallel_serial_helpers.py` lifted (was KTX-only); `extractor_lib/tests/__init__.py` added (85 bytes; exports `assert_parallel_serial_equivalent`); MVDSV new `test_handler_protocol_parallel_serial.py` (4281 bytes) PASSES; KTX existing taxonomies + modes tests updated to use the lifted helper; commit `8f561cba`.
Notes: ezQuake / FTE / QWCL formally documented as "deferred-safe" per D8 explicit-reject -- all handlers in those projects use the safe `end_file -> finalize(all_rows=...)` pattern with no cross-worker instance state. This is a documented negative conclusion from the catch-up audit (Pass 1.2.3's "NOT blanket coverage" principle; spec said add tests only for handlers with parallel-aggregation risk). The shape "deferred-safe" matches the spec intent. F1 HANDOVER finding (sys.path pollution in full-suite pytest mode; per-handler tests PASS in isolation) is the lone open issue from this phase.

### Pass 1.2.4 -- Reproducibility probe (Phase 2)

Status: **DELIVERED**.
Evidence: `reproducibility-check.ts` shipped at `2e7808eb`; filesystem-only (no DB); per-project config dict has 5 entries (PROJECT_REPRODUCIBILITY_CONFIG with extractPy / repoRoot / outputDir); `--workers <N>` flag shipped per Pass 1.2.4; all 5 projects PASS (zero git diff on output/).
Notes: Two drain-now fixes shipped inside the phase commit -- (1) `git diff --stat HEAD -- <outputDir>` pathspec scoping (the original `-C <outputDir>` form would false-FAIL on workspaces with unrelated uncommitted changes), and (2) `extractResult.stderr?.toString() ?? ''` optional chaining (Bun.spawnSync's pipe-vs-inherit type-soundness gap). These are drafter-level corrections, not scope deviations -- the gate's contract is unchanged. FTE asset-bundle re-stamp concern (cross-arc, carried from Phase 1) was triaged as EXPLICIT REJECT here (slipgate bundle is downstream of `extract-tag.ts`, not `extract.py`; out of probe scope).

### Pass 1.2.5 -- Cross-project audit cadence rule (Phase 6)

Status: **DELIVERED**.
Evidence: `EXTRACTOR-PLAYBOOK.md` "Cross-project audit cadence" section at line 1075 contains the four-trigger rule verbatim from Pass 1.2.5 (new project / new entity type / schema migration / modifies extractor_lib or load-version.ts); skip-rule for per-handler tweaks is present; rationale paragraph references `feedback_retrofit_later_discipline.md`; pointer to most recent audit (`2026-05-06-ktx-onboarding-cross-project-audit.md`) is current. HANDOVER.md tracking entry landed at line 33 with ASCII discipline (no em-dash). Commit `aae53d38`.
Notes: D11's audit-doc filename pattern (`docs/superpowers/reviews/YYYY-MM-DD-<arc>-cross-project-audit.md`) is documented in the section. Per-gate audits during this arc were inlined in commit bodies per D6 + Pass 2.1 ("no central living audit doc") -- the cert doc serves the consolidated graduation-readiness role. This is consistent with the spec.

### Pass 1.2.6 -- VALIDATION-GATES.md authoring guide (Phase 5)

Status: **DELIVERED**.
Evidence: `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md` exists (16022 bytes); section count is exactly 7 matching Pass 1.2.6's locked list (CLI shape conventions / F1 quality-grid mirror / Env-var DB config / Volatile-column strip / Per-project config dict / Test pattern / CI-readiness checklist); cross-link from VALIDATION-RUNBOOK.md present at line 5. Commit `b2f8a107`.
Notes: D9's two-doc model (RUNBOOK consumer-side, VALIDATION-GATES producer-side) is preserved -- RUNBOOK gets the one-line cross-link with no structural change. Section 1 ships richer than the spec implied (sub-shapes A and B for TS subcommand vs pytest discovery -- see "Shipped beyond spec" below). Section 2's thin-wrapper guidance includes the export-name-discrepancy guard surfaced by the verification sub-agent (also in "Shipped beyond spec").

### Pass 2.1 -- Catch-up audit pattern + arc-close cert doc

Status: **DELIVERED**.
Evidence: each phase commit body carries its 5-project audit findings inline per D6 (verified by `git show <sha>` for f64ef308 / 2e7808eb / 8f561cba / 9901f308); cert doc at `docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md` is 279 lines with one section per gate, cross-project pass-state matrix, findings ledger (F1 only), HANDOVER carry-forwards block, and the three-claim graduation-readiness statement (visible / runnable / self-bootstrapping). Phase 7 commit `ab1551db` clean.
Notes: Pass 2.1's "no central living audit doc" intent is honored -- per-gate findings are commit-body-only; cert doc is a one-shot graduation artifact, not living documentation. The cert doc is anchored-on-execution by design (per the skill's structural fresh-terminal requirement) and explicitly defers cold review to this post-arc analysis.

### Pass 2.2 -- onboard-extractor SKILL.md update (split P5 + P6)

Status: **DELIVERED**.
Evidence: `~/.claude/skills/onboard-extractor/SKILL.md` carries:
- Phase F4.5 "Register in universal gate config dicts" section at line 207 (P5).
- Phase F5 "Validation handoff" expanded to run all universal gates (4-5 probes; P5).
- "Anti-pattern -- no per-project bash scripts" callout at line 238 (P6) referencing `idempotency-ktx.sh` retirement.
- Mode P (port mode) section updated to mirror Mode F's F3 -> F4 -> F4.5 -> F5-F7 sequence (P5).
- Cross-references to `scripts/load-knowledge/VALIDATION-GATES.md` Section 5 for config-dict shape.
Notes: D10's split (P5 = part 1 register-in-config-dict + F5 expansion; P6 = part 2 no-per-project-bash callout) shipped exactly as specified. Phase 5 + Phase 6 executed in parallel; P6 committed first (`aae53d38`), P5 second (`b2f8a107`). At P5 execution time, the SKILL.md already carried P6's callout; the executor adapted CHANGE 1's anchor accordingly per the pre-flight gate (g) -- documented in P5's Post-execution amendments. Final ordering F4 -> F4.5 -> Anti-pattern callout -> F5 matches spec intent ("callout sits between F4.5 and F5").

### Pass 2.3 -- Roadmap (7 phases, manual probes)

Status: **DELIVERED**.
Evidence: 7 phase MDs landed in scaffold; commit log confirms all 7 in order (P1 idempotency first per Pass 2.3 framing; P2 / P3 / P4 mutually independent at data level; P5 references shipped P1-P4 conventions; P6 markdown parallel-safe with P5; P7 last as graduation artifact); manual-only probes per D5 (no auto-invocation hooks added; mirrors F1 quality-grid pattern); CI-readiness conventions baked into all four runtime gates per D2.
Notes: Three execution-time amendments anticipated by Pass 2.3 surfaced (Phase 1 surfacing concerns ride amendments / Phase 3 deferred-safe handlers / Phase 5 mid-execution scope additions) -- all handled per D8 triage without decisions.md amendments needed.

### Pass 1 carry-forwards / "Parked as separate future arcs"

Status: **DEFERRED** (correctly per D1 explicit non-goals).
Evidence: README.md "What this arc deliberately does NOT cover" section + decisions.md D1 + parking doc Pass 1.1 carry-forward table all consistent on the four parks (CI setup; contributor onboarding doc; test-coverage parity; Stage 3 snapshot probes). HANDOVER.md does not promote any of these to active backlog. Cert doc graduation-readiness statement defers them correctly.

### Pass 1 "Deferred indefinitely" items

Status: **DEFERRED** (correctly per spec).
Evidence: Tag-every-output probe + schema-evolution-append-only manifest-hash check are listed in HANDOVER carry-forwards from cert doc as "low-priority HANDOVER small followup" / "low-priority HANDOVER" -- consistent with parking doc framing.

### Pass 2 carry-forwards

Status: **DELIVERED** (resolved-by-Phase-1 per spec).
Evidence: KTX `idempotency-ktx.sh` deletion shipped in P1 commit `f64ef308` (file absent from live tree); Issue #5 false-positive drift fix from KTX post-review inherited by universal probe via `to_jsonb(row) - 'key'` chain (verified in idempotency.ts strip list).

---

## Shipped beyond spec

Six items exceeded the brainstorm scope -- all healthy execution-time learning, none scope-creep concerns.

- **VALIDATION-GATES.md Section 1 dual-shape (Shape A TS subcommand + Shape B pytest discovery).** Pass 1.2.6 specified Section 1 as "CLI shape conventions" implicitly framing TS subcommands. The shipped file documents both dispatch shapes explicitly with a "Pick the one that fits" framing. This is correct -- the parallel-vs-serial gate (P3) IS pytest-discovery-shaped, not a TS subcommand, and a doc that only covered TS-shape would mislead future gate authors. Recommendation: accept-as-shipped; this richness IS the producer-perspective the doc is meant to provide.

- **VALIDATION-GATES.md Section 2 export-name-discrepancy guard.** The shipped doc (Section 2 step 3) teaches `{ <exportName>: run }` rename syntax with a verification command (`grep "^export async function" scripts/load-knowledge/<gate>.ts`) -- a CRITICAL finding from the verification sub-agent. The live `runReproducibilityCheckCli` wrapper imports `{ runReproducibilityCli: run }` (names differ); a new gate author following an export-name=wrapper-name template literally would get a runtime error on dispatch. Recommendation: accept-as-shipped; this guard is load-bearing and prevents a subtle silent failure mode in future onboardings.

- **Phase 2 drain-now fix 1 -- git diff pathspec scoping.** Original phase MD specified `git diff --stat HEAD` with `-C <outputDir>`. Executor surfaced that `-C` runs the diff against the entire repo from the output dir's CWD -- on a workspace with unrelated uncommitted changes the probe would false-FAIL. Amended invocation uses `git diff --stat HEAD -- <pathspec>` form which restricts diff to the pathspec regardless of CWD. Recommendation: accept-as-shipped; documented in P2's Post-execution amendments. This kind of CLI-ergonomics drafter-correction is exactly what executor sessions exist to surface.

- **Phase 2 drain-now fix 2 -- Bun.spawnSync stderr type narrowing.** Original phase MD assumed `extractResult.stderr` was non-undefined when `stderr: 'pipe'` was passed. Bun's spawnSync return type does not narrow stderr; the original direct access compiled but was a type-soundness latent. Amended access uses optional chaining + default empty string. Recommendation: accept-as-shipped; cross-language-runtime ergonomics finding -- worth promoting to VALIDATION-GATES.md Section 3 (Env-var driven DB config) as a side-note when subprocess output handling is in scope, OR letting Section 6 carry it.

- **Phase 5 F4 stale-commands fix.** Phase 5 expanded scope at draft time (operator-confirmed audit finding 2026-05-08; D7 drain-now per ADVISORY) to fix actively-broken commands in onboard-extractor SKILL.md Phase F4 -- pre-Postgres-era `npm --prefix` (rejected by npm because workspace: deps don't load) and `sqlite3 "$DATABASE_URL"` (data/knowledge.db no longer exists). Replaced with `bun --cwd` + `psql "$DATABASE_URL"` equivalents. Recommendation: accept-as-shipped; this kept onboarding skill executable for future arcs. The pattern -- "skill audit catches actively-broken commands; ride the doc-phase commit per D7" -- is a useful exemplar for future skill-update arcs; consider promoting to a HANDOVER pattern note or to `feedback_retrofit_later_discipline.md` cross-link.

- **Phase 5 quality-grid.ts comment-only sqlite3->psql cleanup.** Two stale `sqlite3 "$DB"` references in floor-probe seed-capture comments at lines 1379, 1397; replaced with `psql "$DATABASE_URL"` form. Comment-only edit, no logic change. Spec didn't mandate this -- it was scope expansion to keep the doc-comments executable for future floor-probe seeding. Recommendation: accept-as-shipped; minor scope expansion that improved consistency.

---

## Open YELLOWs from sign-off

Three open issues at arc close, plus one housekeeping miss surfaced during this review.

- **F1 -- Full-suite pytest sys.path pollution (FTE + QW collection errors).** HANDOVER track. Per-handler tests PASS in isolation; only affects collection in `pytest extractors/` full-suite mode. Multiple `tests/` package namespaces (`extractor_lib/tests/`, `qw/tests/`, `mvdsv/tests/`) cause sys.path contamination when pytest discovers all projects in one run. Pre-existing root cause -- the `extractor_lib/tests/` package shape predates this arc; Phase 3 surfaced it but did not introduce it. Investigation status: root cause known. Disposition: **drain in next test-authoring arc**, OR add as a low-priority HANDOVER item. Proposed fix: per-project conftest.py files inserting the project-specific handler dir at sys.path[0] AND excluding the ezquake handler dir, OR rename per-project test packages (ktx_tests / fte_tests / qw_tests / mvdsv_tests) to avoid the shared `tests` namespace. Sized 1-2 hours. Evidence: HANDOVER.md line 28; review-findings.md F1.

- **V6 stdout contamination -- extract-tag children stdio:'inherit'.** Not a correctness defect in any gate. Extract-tag's Python child processes use `stdio:'inherit'`, interleaving progress lines with the gate's JSON output on fd 1. JSON IS valid when isolated; current dev workaround documented (`2>/dev/null | sed -n '/^[\[{]/,$p'`). Investigation status: root cause known. Disposition: **fold into CI setup arc** -- the natural fix is uniform either (a) extract-tag's Python children write progress to stderr OR (b) all probes adopt `--json-out <path>` file-output flag. CI integration is the work that exposes this gap most acutely (CI tooling parses fd 1 JSON deterministically). Evidence: cert doc P1 section + Phase 1 MD Post-execution amendments.

- **Phase 2 commit-subject convention break.** P2's commit subject `feat(qw-oracle): universal reproducibility probe + 5-project audit -- Phase 2` does not follow the `extractor-discipline-catchup phase N: ...` convention used by P1 / P3-P7. Investigation status: root cause known (executor wrote commit body per a different style; not caught at boundary review). Disposition: **accept and document** -- D17 forbids force-push to main, so amendment-via-rewrite is excluded. Only impact is a hypothetical future grep-by-prefix tool would return 6 matches (P1 + P3 + P4 + P5 + P6 + P7) by subject prefix and 7 by SHA range. SHA references in cert doc + arc-history are correct. Recommendation: in the next multi-phase arc, the orchestrator's first-action checklist should confirm commit subject prefix at executor-prompt boundary; promote to a one-line addition in arc-orchestrator skill or in arc-history's "convention rules" if such a section gets added. Evidence: README "Where we are right now" line 16 explicitly callsouts this.

- **Phase 2 executor prompt missing from scaffold.** During this review, `ls phase-*-executor-prompt.md` returns six prompts (P1 / P3 / P4 / P5 / P6 / P7). Phase 2 has only the drafter prompt. The arc-planner skill convention is "executor prompt at `phase-N-executor-prompt.md` in file-as-prompt shape" (per planner-resume handoff). Investigation status: root cause unknown; not flagged in any phase boundary review. Possible explanations: (a) P2 executed off the drafter prompt directly because P1 had set the canonical shape; (b) the P2 executor prompt was created in a session and never committed; (c) the executor prompt was inlined in conversation rather than committed per file-as-prompt convention. Disposition: **document and route to Arc N+1 prep** -- not actionable retrospectively but worth flagging in the next arc orchestrator's pre-flight as "verify each phase has both a drafter and executor prompt committed before declaring scaffold complete." Evidence: `ls docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-*-executor-prompt.md`.

---

## Recommendations for Arc N+1 prep

Listed in increasing scope. Operator picks what fits the next arc's energy.

1. **Pre-flight discipline addition for arc-planner / arc-orchestrator.** During scaffold completion, verify each phase MD has BOTH a drafter prompt AND an executor prompt committed in file-as-prompt shape. The Phase 2 executor-prompt absence is small enough that a one-line check ("ls phase-*-executor-prompt.md returns N entries where N = phase count") in the planner / orchestrator skill catches this class of drift. Effort: ~10 minutes (one-line addition to a skill checklist). Source: this review's cross-checks. Dependencies: none.

2. **Promote Phase 2's git-diff pathspec finding to VALIDATION-GATES.md.** Phase 2's drain-now fix #1 (`git diff --stat HEAD -- <pathspec>` vs `-C` form) is an unhealthy default for any future gate that diffs git state. VALIDATION-GATES.md Section 6 (test pattern conventions) or a new mini-section under Section 7 (CI-readiness) could document this in 5 lines, preventing the next gate author from re-deriving the lesson. Effort: ~15 minutes inline. Source: shipped-beyond-spec item; YELLOW-adjacent. Dependencies: none.

3. **Promote Phase 5's F4-stale-commands pattern to a `feedback_retrofit_later_discipline.md` cross-link.** The "Phase 5 expanded scope at draft time to fix actively-broken commands in the onboard-extractor skill, drain-now per D7" is a healthy exemplar for any future skill-audit work. A one-paragraph addition to `feedback_retrofit_later_discipline.md` (or a new `feedback_skill_audit_during_doc_phase.md` memory) captures the pattern. Effort: ~15-20 minutes. Source: shipped-beyond-spec item. Dependencies: none.

4. **Drain F1 (per-project conftest.py) into the next test-authoring arc.** F1 is HANDOVER-deferred. Per-handler tests PASS in isolation. The fix is sized 1-2 hours. The natural arc to drain it is whichever arc next adds tests -- bundle into that arc's first phase rather than spinning up a dedicated "fix conftest pollution" arc. If no test-authoring arc materializes within ~2 weeks, promote to a small dedicated followup. Effort: 1-2 hours when bundled. Source: F1 HANDOVER. Dependencies: another arc that touches `apps/qw-oracle/scripts/extractors/<project>/tests/`.

5. **CI setup arc (Pass 1 carry-forward).** UNBLOCKED by this arc landing -- all 4 universal probes are CI-wireable. The natural follow-on arc. Wires probes into a workflow YAML + Postgres service container + fixture project. The V6 stdout contamination YELLOW (extract-tag stdio:'inherit') folds into this arc as part of the "uniform stderr discipline OR `--json-out <path>` flag" decision; the CI arc forces the choice. Effort: arc-shaped (multi-phase; arc-brainstormer + arc-planner). Source: cert doc HANDOVER carry-forwards + parking doc Pass 1 separate-arc parks. Dependencies: P1-P4 ship state (already met).

6. **Bundle "tag every generated output" probe + "schema evolution append-only" manifest-hash check into the CI arc.** Pass 1 listed both as "Deferred indefinitely; low priority HANDOVER." Both are gate-shaped and CI-natural -- adding them mid-CI-arc is cheaper than later. Effort: ~30-60 minutes per probe, additive to the CI arc. Source: parking doc Pass 1 deferred-indefinitely list. Dependencies: CI arc plan.

7. **Contributor onboarding doc / CONTRIBUTING.md (Pass 1 carry-forward).** Holistic graduation-shape doc that bundles VALIDATION-GATES.md + EXTRACTOR-PLAYBOOK.md + RUNBOOK + onboard-extractor skill into a single contributor-facing entry point. NOT urgent until / unless a non-operator contributor arrives. Effort: arc-shaped (small; one-pass brainstorm + one or two phases). Source: parking doc Pass 1 separate-arc parks. Dependencies: not blocking.

8. **Test-coverage parity per project (Pass 1 carry-forward).** Per-project test-authoring effort (ezquake 1 / FTE 1 / QWCL 0 / MVDSV 0 / KTX 3 test files excluding the parallel-serial tests added in this arc). Operator-initiated; surfaces per-project. Bundles cleanly with F1 conftest fix per recommendation #4. Effort: arc-shaped; depends on which projects need coverage first. Source: parking doc Pass 1. Dependencies: none.

The arc shipped clean. Six DELIVERED + two DELIVERED-DIFFERENT + four DEFERRED + zero MISSING. The single open finding (F1) is HANDOVER-tracked with per-handler tests passing in isolation. CI setup is the natural next arc and is fully unblocked.
