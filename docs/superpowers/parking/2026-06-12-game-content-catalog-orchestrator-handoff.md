# Orchestrator handoff -- game-content-catalog completion arc (2026-06-12)

**For:** a FRESH terminal running **`arc-orchestrator`** when the execution gate is met. Planning is COMPLETE (scaffold + all five phase MDs drafted, planner-reviewed against live source, approved 2026-06-11/12). Do NOT relitigate D-locks or redraft approved MDs.

## Execution gate (check FIRST)

Execution starts only after **the first Track-A weapon-pair concept notes ship** (demand-driven-l3 arc; spec M4 / plan D16). If they have not shipped, stop here -- there is nothing to orchestrate yet. Drafting did not wait; execution does.

## Where things are

- **Plan dir (everything):** `docs/superpowers/plans/2026-06-11-game-content-catalog/` -- README (phase index, all 5 `approved`), `decisions.md` (22 decisions incl. the D22 `{"cvar":...}` gate-form amendment), `review-findings.md` (F1-F10), `prerequisites.md`, `phase-template.md`, five approved phase MDs.
- **Design spec:** `docs/superpowers/specs/2026-06-11-game-content-catalog-completion.md` (D1-D7 + M1-M5).
- **Phases:** 0 prereqs+loader / 1 id1 audit / 2 monsters / 3 KTX overlay / 4 join keys + docs + surfacing. Strictly sequential at execution (each consumes the prior's outputs; Phase 3 needs 1+2's baselines; 4 closes out).
- **Executor prompts are NOT pre-written.** Generate one per phase from the approved phase MD + `arc-executor`'s expectations; the `phase-N-drafter-prompt.md` files are the DRAFTING prompts (already consumed) -- do not reuse them for execution.
- **Findings carry-forwards:** F9 (describe_mode does not surface override rows) is DEFERRED to the standing MCP-realignment backlog entry (HANDOVER "Active arcs") -- do not "fix" it mid-arc; D14 forbids new MCP surface. F7 + F10 carry the verification lesson (below).

## Reads required (in order)

1. The plan-dir README, `decisions.md`, `review-findings.md` -- end to end.
2. The phase MD being dispatched (per phase, at dispatch time).
3. `prerequisites.md` -- the environment checks before Phase 0.
4. Operator memories: `reference_workflow_rate_limit_and_args` (Sonnet high, low concurrency, args-as-JSON quirk), `feedback_model_effort_range`, `feedback_no_subagents_for_mechanical_edits` (execution-mode annotations are content-conditional -- honor them BOTH ways), `feedback_verify_dispatched_terminal_claims`.

## Critical rules

- **Phase-boundary verification is the orchestrator's job, against live source/DB -- never trust the executor's "verified" claims.** The planning stage set the bar: every phase review re-derived load-bearing claims and caught real defects the drafters' own verifiers missed (F7: a citation line-accurate but role-wrong; F10: a gate characterization contradicted by the enclosing `deathmatch == 3` branch). Verify the ROLE a cited line plays and its ENCLOSING branch, not just the value on the line.
- **D-locks amend via explicit operator sign-off only** -- dated blocks in `decisions.md`, never silently in a phase MD or executor session.
- **Operator gates are the three D12 SME surfaces only:** Phase 1 gap candidates, Phase 3 delta list (incl. per-delta triage of cvar-gated rows -- the FORM is D22-settled, membership is not), Phase 2 wiki mismatches. Plus the exceptional disputes lists. Never per-citation review.
- **Execution-time recounts (D16):** every fan-out / assembler enumerates rows from the LIVE YAML/DB, never from lists frozen in the MDs. Track-A inline backfills may have landed since drafting; the MDs are written for this -- hold executors to it.
- **expected_counts lockstep (D8):** any seed edit bumps that file's `expected_counts` in the same commit; the F1 probe `expected` values are the same live counts read twice (Phase 1 Task 5 states the lockstep rule). A STOP or probe FAIL means recount, and suspect idempotency before staleness.
- **Sibling-arc git guard (D17):** scope every `git add` to the exact paths each phase MD's verification step 7 names; never `-A`; fresh commits over amend.
- **Context budget:** executor smell zone ~350k. Phases 1-3 are Workflow-fan-out-heavy by design -- the executor main thread orchestrates and assembles, it does not extract. If an executor balloons, hand off to a fresh executor terminal at a task boundary (option 3 is last resort; prefer more delegation first).
- **Commit cadence:** per the monorepo CLAUDE.md -- commit each phase's coherent unit, push at phase boundaries, tag `arc-game-content-catalog-shipped` at arc close.

## First three actions

1. **Gate + environment check:** confirm the Track-A first notes shipped (HANDOVER / demand-driven-l3 state); run the `prerequisites.md` checks (dev container up, pak-cache present, Jina reachable). Also `git pull` and confirm the plan dir is at its approved state.
2. **Dispatch Phase 0:** generate the Phase 0 executor prompt from `phase-0-prereqs-loader.md` (file-as-prompt, arc-identification header like the drafter prompts), open a fresh executor terminal on it (arc-executor). Phase 0's only deviation-prone spot is the v1.06 mirror choice -- the MD's criteria + spot-verify greps (shambler 600 / ogre 200) decide it; HALT to operator only if no candidate passes.
3. **Set up cross-phase memory:** at each boundary, independently run the phase MD's verification list, append execution findings to `review-findings.md` (sequential F-numbers + ownership table), land any decision amendments in `decisions.md` (operator-signed), flip the README status column, and write the next phase's executor prompt incorporating prior-phase learnings.

## When in doubt

Route to the operator at SME level only (community-reality calls, wiki-vs-source arbitration, gap-candidate relevance). Technical calls resolve against the live DB + `decisions.md` + the phase MDs -- in that priority order, decisions win. The id1 seed YAML answers row-shape questions; the KTX onboarding arc's SCHEMA.md section answers gate/probe questions; `review-findings.md` F1-F10 is the trap catalog (count gates, dual-writer keyspace, line-vs-role citations, fandom-403). The planner session's review precedent (commits `e26b4117`..`f23336b6`) shows the verification bar each boundary must meet.
