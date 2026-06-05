You are drafting **Phase 4 -- validate + concept-note decision** of the QTV + QWFWD Layer 1 extraction arc. This is the LAST phase; after it is approved you also write the arc-orchestrator handoff and the plan is complete.

**Arc identity (read first -- halt if it does not match):** this arc is `2026-06-05-qtv-qwfwd-l1-extraction`. Scaffold at `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/`. Phases 0-3 are APPROVED (schema/plumbing; QWFWD libclang extractor; QTV Go extractor; describe-fill). This phase validates both extractors and makes the deferred concept-note if/which decision. If your material is about the C-vs-Go describe guard as the thing you are building, or about extractor handlers, you are in an earlier phase -- STOP.

This is a structured **planning** task. Output is one markdown file. You do NOT execute anything (no validation runs, no probe runs, no concept-note authoring). The phase MD becomes input to a separate execution session.

**Working directory:** `/home/paradoks/projects/quakeworld`

**Required reading (all before drafting):**

1. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/README.md`
2. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/decisions.md` -- especially D9 (concept notes deferred -- this phase DECIDES if/which, it does NOT author), D12 (validation runs against Postgres, not sqlite; add F1 floor probes), D7 (ASCII), D11 (YES/NO probes), D13 (non-goals).
3. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/review-findings.md` -- F3 (VALIDATION-RUNBOOK sqlite commands are stale -- translate to Postgres) and F7 (counts are extractor-truth) are yours.
4. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-template.md` -- the mandatory shape; annotate each task's execution mode.
5. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-1-qwfwd-extractor.md` + `phase-2-qtv-extractor.md` -- the per-type entity COUNTS (recorded at each phase's V4) become the F1 floor-probe baselines. `phase-3-describe-fill.md` -- the describe pass produced `[L3 breadcrumb: <candidate>]` tags in `description_reasoning` (the input to the concept-note decision).
6. `docs/superpowers/specs/2026-06-05-qtv-qwfwd-l1-extraction-design.md` -- the "Verify pass" section + the "Concept notes (deferred)" section naming the three candidates.

**Phase-4-specific live recon (verify against the tree):**

- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` -- the canonical validation methodology (modes, the section-by-section checks, reproducibility, no-silent-data-loss). TRANSLATE every `sqlite3 .../knowledge.db` example to Postgres (psql / postgres-js); the DB is Postgres (F3/D12).
- The `validate-extractor` skill (its SKILL.md) -- how it dispatches parallel sub-agent checks and the report shape. Note: it predates the Postgres port; apply its METHOD, not its stale sqlite commands.
- `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` -- the `makeFloorCountProbe(project, type, expected)` and `makeFloorSourceStateProbe(project, type, expected)` factories, the `REGRESSION_PROBES` array they spread into, and where the existing per-project floor-probe arrays live. Phase 4 adds `QWFWD_FLOOR_PROBES` and `QTV_FLOOR_PROBES` (baselines = the actual loaded counts from Phase 1/2 V4 -- post-v17 these are equality assertions, not floors).
- The three concept-note candidate anchors: `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-svdemo-ledger-qtv_*.md` (the shipped MVDSV `qtv_*` See-also targets). Skim them for the cross-codebase shape each candidate would take.

**Phase 4 scope (what this phase delivers):**

1. **Validate both extractors** via the `validate-extractor` / VALIDATION-RUNBOOK methodology, Postgres-only: reproducibility (re-extract = empty diff -- already proven per-phase, re-confirm cross-project), no-silent-data-loss (source -> JSON `_stats` -> DB count reconciliation), field-accuracy spot-check (sample rows vs source_file:source_line), and the cross-project field-shape audit (qwfwd/qtv `ast` shapes vs the C-port siblings).
2. **Add F1 floor probes** for `qtv` and `qwfwd` to `quality-grid.ts` (`makeFloorCountProbe` + `makeFloorSourceStateProbe` per type, baselines from the loaded counts), spread into `REGRESSION_PROBES`. After this, `quality-grid --family regression` covers the two new projects.
3. **The concept-note if/which decision (D9):** against the three candidates -- (a) master-server registration/heartbeat (`masters*` across qwfwd+qtv+mvdsv senders vs ezquake querier), (b) MVD streaming + `parse_delay` ghosting (qtv `parse_delay`/`tick_time` <-> mvdsv MVD source <-> ezquake viewer), (c) `qtv_password` cross-codebase auth matrix (PLAIN/MD4/CCITT/SHA3). Use the Phase-3 breadcrumbs + the now-described knobs as evidence. Produce a written **if/which recommendation** with rationale per candidate (author / defer / drop). Do NOT author any concept note in this arc (D9); if the operator later greenlights authoring, that is a follow-on arc.
4. **The validation report artifact(s)** at `docs/superpowers/reviews/` (one per project, or a combined report), with the findings table + dispositions.

**Verification (phase boundary) -- Postgres, YES/NO, self-contained:** both projects pass the runbook checks (reproducibility re-confirmed; count reconciliation source->JSON->DB exact; field-accuracy sample clean); `quality-grid --family regression` green WITH the new qtv/qwfwd floor probes; the concept-note decision is documented with per-candidate verdicts; `bunx tsc --noEmit` green (the quality-grid edit compiles).

**Drafting rules:** ASCII only (D7). Postgres in every probe/command -- NO sqlite (D12/F3). No concept-note authoring (D9 -- decision only). No new entity types. Annotate every task's execution mode (the validation sub-agent fan-out is subagent; the quality-grid probe additions are subagent code synthesis; the concept-note decision write-up is inline or a single Opus-MAX analysis subagent given its judgment density; the report assembly is inline).

**Step by step:**
1. Read all required + recon files. Note F3 (Postgres translation) + the Phase-1/2 baselines + the Phase-3 breadcrumbs.
2. Run live recon (VALIDATION-RUNBOOK; the quality-grid probe factories + where floor-probe arrays live; the validate-extractor skill's dispatch shape; the 3 candidate anchors).
3. Draft `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-4-validate-decision.md` per `phase-template.md`.
4. **Verification sub-agent:** if the Agent tool is unavailable to you, perform the verification brief (bottom of `phase-template.md`) yourself and say so. (The planner will run an INDEPENDENT verifier afterward.)
5. Apply findings; decisions win (note rejections in "Open questions").
6. Halt. Reply with: the MD path; self-verification counts; open questions; an explicit note that the validation is Postgres-only (no stale sqlite) and the concept-note step DECIDES not authors; and a recommendation.

**After Phase 4 is approved:** write the arc-orchestrator handoff at `docs/superpowers/parking/2026-06-05-qtv-qwfwd-l1-extraction-orchestrator-handoff.md` (shape: Where things are / Reads required / Critical rules / First three actions / When in doubt) -- then the arc plan is COMPLETE. Also remember the one execution-time prerequisite carried from Phase 3: Q-SKILL Option A (widen the `describe-fill-synthesis` line-102 gate to include qtv/qwfwd + the 4 doc references) must be applied before Phase 3 executes; it does not block Phase 4 planning.

Do NOT execute anything. Drafting is paper-only.
