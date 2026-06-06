# Orchestrator resume handoff -- arc 2026-06-05-qtv-qwfwd-l1-extraction (mid-arc, after Phase 2)

**Routes to:** the `arc-orchestrator` skill, in a FRESH terminal. Invoke it and pick up cross-phase coordination from the Phase-3 boundary onward. The prior orchestrator session approached its context budget and handed off here (arc-orchestrator Step 7/8) so Phase-3 boundary verification gets full judgment fidelity.

**Written:** 2026-06-06, after Phase 2 shipped + verified and the Phase-3 executor prompt was handed off.

You are the coordination layer, NOT the executor. You do NOT modify project code -- you dispatch per-phase executor terminals (the prompts already exist), verify their output against live source at each boundary (do NOT trust their "PASS"), own cross-phase memory, and write the post-arc handoff. This doc is orientation; the orchestrator-ledger is the live source of truth.

---

## Where things are

- **Phases 0, 1, 2: SHIPPED + independently orchestrator-verified green.** Commits: `bf944a3f` (P0 schema/plumbing), `161c6c1a` (P1 qwfwd extractor), `cc80ea6a` (P2 qtv extractor). Pushed.
- **Phase 3 (describe-fill): executor prompt handed off** at `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-3-executor-prompt.md`. It may be running or pending when you start. When its executor halts, YOUR first real job is to verify that boundary.
- **Phase 4 (validate + concept-note decision): pending.** You generate its executor prompt after Phase 3 verifies.
- **Live state board:** `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/orchestrator-ledger.md` -- read it FIRST. It has the phase status, the captured Phase-4 floor baselines, the cross-phase wires, the D4 amendment, and the per-phase boundary-verification log.
- **A parallel l2-calibration session commits to `main` concurrently** (different topic, shared tree + Postgres-different-tables). Not a collision. Scope every `git add` to this arc's files; verify `git diff --cached --stat` before commit; HEAD moves between turns.

## Reads required (in order)

1. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/orchestrator-ledger.md` -- the live state (start here).
2. The scaffold: `README.md` (status board) -> `decisions.md` (esp. the **D4 2026-06-06 F12 amendment** -- head+tag load) -> `review-findings.md` (**F9-F14** -- the execution-discovered findings; F12/F14 are load-bearing) -> `prerequisites.md`.
3. `phase-3-describe-fill.md` + `phase-4-validate-decision.md` (the two remaining phase MDs).
4. The executor prompts already written: `phase-{0,1,2,3}-executor-prompt.md` (they carry the augmentations + corrections that diverge from the MDs).
5. The `arc-orchestrator` skill (your operating manual) + memory: `feedback_orchestrator_terminal_pattern`, `feedback_no_inference`, `feedback_audit_predictions_not_contracts`, `feedback_every_finding_gets_a_track`, `feedback_idempotency_before_staleness`, `feedback_plain_english_at_decision_points`.

## Critical rules

- **Independent boundary verification is mandatory.** This arc has surfaced a real correctness item at EVERY boundary that the executor's self-check or the plan missed: F9 (pre-flight: introspection query doubly broken), F10 (P0: 13th Record site), F12 (P1: tag-only load retires all entities -> head+tag), F14 (P2: `*version` dropped -> count 40 not 41). Re-run the phase's probes yourself; do not relay "PASS" on faith.
- **psql:** host `psql` is NOT installed. From `apps/qw-oracle/`: `set -a && . ./.env && set +a` then `docker exec -i qw-oracle-postgres-dev psql "$DATABASE_URL" -c "<q>"`.
- **The captured Phase-4 floor baselines (use these EXACT numbers, all `source_backed` -- do NOT re-derive from the design hand-counts; F7/F14):**
  - qwfwd: `cvar=13, command=29, cmdline_param=2, info_key=6`.
  - qtv: `cvar=40, command=12` (NOT 41/12 -- `*version` dropped, F14). The Phase-4 MD still says 41/12 in places; it is stale -- 40/12 wins.
- **F10 reproducibility method for Phase 4:** qtv/qwfwd reproducibility uses **standalone extractor re-run + `git diff` on output/**, NOT `idempotency --project` (the CLI rejects qtv/qwfwd by design). The qwfwd extractor: `python3 extract.py ...`; the qtv extractor: `/usr/local/go/bin/go run . ...` (Go 1.24.4 at `/usr/local/go/bin`; bare `go` may not be on a non-interactive shell PATH).
- **The Phase-3 breadcrumb harvest is the Phase-4 concept-note evidence.** Capture which knobs carried which `[L3 breadcrumb: <candidate>]` tag from the Phase-3 executor's report AND independently (`SELECT name, description_reasoning FROM entities WHERE project IN ('qtv','qwfwd') AND description_reasoning ILIKE '%[L3 breadcrumb:%'`). If candidate (b) parse_delay/tick_time harvest is empty, Phase 4 defers (b).
- **Concept-note decision (D9) is DECIDE not author, and the FINAL call is the OPERATOR's** at Phase-4 sign-off. Endorsed starting bias (operator eyes-on 2026-06-05): (a) master-server = author (strong); (b) MVD streaming/parse_delay = author-lean, defer if breadcrumbs thin; (c) qtv_password = defer (MVDSV ledger already documents the matrix; qtv row See-also-links it). Authoring, if greenlit, is a SEPARATE follow-on arc.
- **ASCII only (D7).** Commit, never push from the executor; orchestrator pushes at checkpoints.

## First three actions

1. **Scope check.** Read the orchestrator-ledger + scaffold cold. Confirm arc identity. Spot-verify Phases 0-2 are still green: migration 020 applied; `SELECT project, type, source_state, count(*) FROM entities WHERE project IN ('qwfwd','qtv') GROUP BY 1,2,3` returns the captured baselines all `source_backed`; `bunx tsc --noEmit` exit 0.
2. **Verify the Phase-3 boundary** (when its executor halts -- or, if it already halted, do this now). Independently run: V1 coverage (every qtv/qwfwd entity has a description, missing=0), **V6 D6 probes** (Probe A: 0 qtv descriptions naming a C-only knob; Probe B: every described qtv entity anchored to a `pkg/` source_file), V2/V3 origin+anchor, the origin_vocabulary + synthesized_requires_anchor regression probes (extended to qtv/qwfwd), idempotency + F-D4a. Capture the breadcrumb harvest. Capture any new findings (next is F15). Update the ledger boundary-verification log + README status; commit + push.
3. **Generate the Phase-4 executor prompt** (`phase-4-executor-prompt.md`, same shape as the prior prompts): validate-extractor Mode-A **Postgres-only** (F3/D12 -- the runbook's sqlite commands are stale); add `QWFWD_FLOOR_PROBES` + `QTV_FLOOR_PROBES` to quality-grid.ts with the captured baselines above; reproducibility via standalone-rerun+git-diff (F10); the concept-note if/which DECISION grounded in the breadcrumb harvest + the endorsed bias, operator ratifies. Then drive the Phase-4 boundary, tag the arc ship (`git tag -a arc-qtv-qwfwd-l1-shipped`), and write the post-arc handoff to `arc-reviewer` at `docs/superpowers/parking/<date>-qtv-qwfwd-l1-extraction-postarc-handoff.md`.

## When in doubt

- Route to the operator with plain-English consequences (what changes / tradeoff / recommendation).
- **Open operator items carried (all non-blocking, all default defer):** (1) F13+F14 -- capture `*version:serverinfo` for qwfwd+qtv cross-engine parity, or defer (recommend defer; version already in the versions row + `*qwfwd:userinfo`); (2) fold the F12 head+tag rule into EXTRACTOR-PLAYBOOK / onboard-extractor (recommend HANDOVER follow-up); (3) the F10 grep-undercounts-derived-types lesson as memory (recommend hold -- MEMORY.md over budget). These are tracked in the ledger; surface them at arc wrap, do not let them float.
- A finding that conflicts with a decision: the decision wins unless you amend it first (dated block in decisions.md, mirrored in the ledger -- D4 is the worked example).
- Scope creep into a D13 non-goal (fteqtv as target, the web QTV viewer, re-opening MVDSV qtv_* rows, the MVDSV qtv_password trim, concept-note authoring in-arc, qtv-go predecessor): flag, do not proceed.

---

*The prior orchestrator verified Phases 0-2 and unblocked Phase 3 (Q-SKILL gate widened). Two phases remain: verify Phase 3, then drive Phase 4 to the arc ship + arc-reviewer handoff. The ledger is the live board; keep its status column + boundary-verification log current.*
