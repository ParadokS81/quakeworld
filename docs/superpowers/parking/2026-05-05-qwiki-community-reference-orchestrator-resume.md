# Orchestrator-resume handoff -- QWiki community-reference arc (mid-arc)

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.** This terminal runs the `arc-orchestrator` skill cold against the QWiki community-reference arc, picking up from Phase 4 after orchestrator session #1 wrapped at ~400k context per the operator's smell-zone discipline.

Orchestrator session #1 drove Phases 0 through 3 to ship state. Session #2 picks up from Phase 4 (tournaments).

---

## Skill to invoke

`arc-orchestrator` (in `~/.claude/skills/arc-orchestrator/`). The skill has a hybrid mode for this arc: operator helps with tuning decisions at executor halt-and-report gates, orchestrator dispatches per-phase executor terminals via parking-doc prompts, orchestrator owns cross-phase memory captures (review-findings.md, README.md, arc-history.md), orchestrator does NOT touch project code.

## Where things are right now

**State:** Phases 0-3 SHIPPED. 4 phases pending: Phase 4 (tournaments), Phase 5 (cross-link backfill), Phase 6 (MCP tools), Phase 7 (L2 primer).

**Branch:** `main`. Latest commits:

- `2a467645` -- Phase 3 ship (clans parser + 822 rows + 350 clan-notes).
- `a0e3ec67` -- Phase 2 reconciliation (DB re-derive from HEAD; supersedes d6efa1cd reported numbers).
- `d6efa1cd` -- Phase 2 ship (players parser + 5,900 rows + 571 player-notes).
- `af7f5b5b` -- Phase 1 ship (curated/ rename + community schema migration 008).
- `408938c1` + `296efc67` + `af888e45` -- Phase 0 ship trio (snapshot commit + redirect-bug fix + snapshotter script).
- `b5868fc1` -- Phase 2 wrap-up commit (arc-history Phase 1+2 entries + concept-notes path fixes + Phase 0/1/2 parking executor prompts).
- `7acbd83e` -- KTX Phase 8 prompt augmentation (unrelated to QWiki; cleanly re-committed after orphan reset).

**Orphan note:** commit `7a53d957` was a parallel KTX terminal that inadvertently swept staged Phase 3 work; it was reset out of main's lineage and superseded by `2a467645` (Phase 3) + `7acbd83e` (KTX). Mention only for git-archaeology context.

**Live DB state (verified cold via `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`):**

- `community.players`: 5,900 rows / is_substantive=2,008 / has_note=571 / source_template player_info=2867, bullet_prose=2543, infobox_player=475, none=15. `.devil` row present (F17). Vo0 row present (F21).
- `community.clans`: 822 rows / is_substantive=397 / has_note=350 / source_template clan_info=450, bullet_prose=326, infobox_4on4team=44, infobox_clan=2, none=0.
- `community.tournaments`: 0 rows (Phase 4 populates).
- `community.player_clan_eras`: 0 rows (Phase 5 populates).
- `community.tournament_results`: 0 rows (Phase 5 populates).
- Migration 008 applied. F8/F9/F10 amendments live. Last applied migration: `008_community_schema.sql`.

**Curated files:**
- `apps/qw-oracle/curated/concept-notes/`: 9 Layer 3 concept notes (pre-arc; renamed from `concept-notes/` in Phase 1).
- `apps/qw-oracle/curated/player-notes/`: 571 markdown files (matches has_note=TRUE row set; verified file/DB match cold).
- `apps/qw-oracle/curated/clan-notes/`: 350 markdown files (matches has_note=TRUE row set).
- `apps/qw-oracle/curated/tournament-notes/`: empty + `.gitkeep` (Phase 4 populates).

**Snapshot:** `apps/qw-oracle/data/wiki-snapshots/2026-05-04/` -- 9,178 article files, 767 templates, 2,337 redirects (refetched per F4/F14), uniform `__` slug scheme, committed to git (Path A locked per Phase 0 D12 decision).

## Active findings ledger (F1-F27)

`docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md` is the source of truth. Key findings to carry forward:

| F# | Status | Phase 4+ relevance |
|----|--------|---------------------|
| F6 | drafter awareness | Phase 4: spec DDL is pre-D5; `decisions.md` D9 is authoritative for tournament column shape (Phase 4 ships migration 009 with tournament-specific columns post-pilot). |
| F8 | applied (Phase 1) | Phase 4 + 5: `community.tournament_results.tournament_slug` has NO FK to `community.tournaments(slug)`. Soft reference; Phase 5 backfill loads cross-link rows from achievements BEFORE Phase 4 populates tournaments. Do not add FK. |
| F12 | Phase 5 awareness | `redirects.json` is populated (2,337 entries). Phase 5 title-matcher Pass 2 will work as designed. |
| F13 | Phase 7 + L2 awareness | Phase 7 ships sensible default L2 primer shape; L2 reconstruction arc Pass 2 confirms or adjusts. |
| F16 | Phase 4 awareness | Empty wikitext from snapshot returns rows with all-three-flags-false; D5 model handles natively. |
| F17 | Phase 4 awareness | T# CLI dispatcher must walk articles directory using `readdirSync` / `Bun.Glob` / Python `iterdir()` -- NOT `ls` shell-out. |
| F23 | orchestrator discipline | Silent DB drift between phase ship and orchestrator cold audit; **always re-run V probes cold via psql, never trust executor's PASS on faith**. Phase 2 reconciliation taught this. |
| F24 | drafter discipline | Phase MD V-probe expected values prone to spec drift from parser rules. Verify expected values at critical-review time, not by trusting MD. |
| F26 | future tuning arc | D6 5-signal heuristic omits achievements_count; deferred. Doesn't block Phase 4. |
| F27 | 27a applied; 27b deferred | Local fix in clans/parse.ts; broader shared/wiki-text.ts fix deferred to future small arc. Doesn't block Phase 4. |

Other findings (F1-F5, F7, F9-F11, F14-F22, F25) are phase-historical and resolved in their respective phases.

## Reads required (priority order)

1. **`docs/superpowers/parking/2026-05-04-qwiki-community-reference-orchestrator-handoff.md`** -- the original arc handoff written by arc-planner. Sets the arc-wide context (spec, scaffold, orchestrator skill invocation).

2. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/README.md`** -- phase index ("Where we are right now" shows Phases 0-3 SHIPPED). Status column reflects ship state per phase.

3. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md`** -- 20 cross-cutting commitments. D14 Python carve-out is amended (Phase 0). All other decisions stable.

4. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md`** -- 27 findings as of Phase 3 ship. F1-F27.

5. **Phase MDs (read just-in-time per phase via Explore subagent; each exceeds 25k Read limit):**
   - `docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-tournaments.md` (next; 27k tokens)
   - `phase-5-cross-link-backfill.md` (38k tokens)
   - `phase-6-mcp-tools.md` (52k tokens)
   - `phase-7-l2-primer.md` (~9k tokens; small enough for direct Read)

6. **Per-phase parking docs (already drafted by orchestrator session #1):**
   - `docs/superpowers/parking/2026-05-05-qwiki-community-reference-phase-0-executor.md` (shipped)
   - `docs/superpowers/parking/2026-05-05-qwiki-community-reference-phase-1-executor.md` (shipped)
   - `docs/superpowers/parking/2026-05-05-qwiki-community-reference-phase-2-executor.md` (shipped)
   - `docs/superpowers/parking/2026-05-05-qwiki-community-reference-phase-2-reconciliation.md` (recovery doc; lessons for F23 baked in)
   - `docs/superpowers/parking/2026-05-05-qwiki-community-reference-phase-3-executor.md` (shipped; Sonnet MAX bumped + F23/F24 lessons baked in)
   - **Phase 4-7 prompts NOT YET DRAFTED.** New orchestrator drafts them.

7. **Operator memory (in `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/`):**
   - `feedback_orchestrator_terminal_pattern.md` -- 350k smell zone, hand-off discipline.
   - `feedback_no_subagents_for_mechanical_edits.md` -- inline only for purely textual edits.
   - `feedback_model_effort_range.md` -- two-axis selection; Sonnet medium floor, Sonnet MAX for judgment-dense, Opus for architectural.
   - `feedback_every_finding_gets_a_track.md` -- drain-now / capture / explicit-reject; "fix-later" is anti-pattern.
   - `feedback_audit_predictions_not_contracts.md` -- prior-claim verification != fresh verification.
   - `feedback_no_inference.md` -- verify against primary sources.
   - `feedback_be_decisive.md` -- recommend decisively, don't poll for agreement.
   - `feedback_planning_first.md` -- read code, present plan, get approval before coding.

8. **Project context:**
   - `apps/qw-oracle/CLAUDE.md` -- subsystem CLAUDE; D13 ASCII discipline; D14 Bun runtime.
   - `apps/qw-oracle/SCHEMA.md` -- live schema reference (community schema added in Phase 1).
   - `apps/qw-oracle/docs/arc-history.md` -- chronicle; Phases 0-3 sub-bullets present under "QWiki community-reference arc -- Phases 0-3 SHIPPED" heading.

## Critical rules for orchestrator session #2

1. **Hybrid orchestrator/executor split.** Orchestrator drafts per-phase executor prompts to parking docs. Operator opens fresh terminal per phase, pastes prompt. Executor runs `arc-executor` skill, halts at boundary with structured status report. Operator pastes report back to orchestrator. Orchestrator runs cold V probes via `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle ...`, audits findings, captures cross-phase memory, drafts next phase. **Orchestrator does NOT touch project code.**

2. **Sonnet MAX for executor terminals.** Phases 0/1/2/3 all ran Sonnet MAX. Phase 4 should also run Sonnet MAX -- it has an LLM-shaped pilot (~50-page tournament schema discovery) that benefits from reasoning headroom for the in-phase Opus MAX subagent dispatch. Phases 5-6 are Sonnet MAX defaults; Phase 7 same.

3. **Sonnet medium for in-phase subagents** (per phase MD execution-mode annotations). Exception: Phase 4's tournament pilot is the ONE Opus MAX dispatch in this arc (D9; one-time schema-discovery LLM task per `feedback_no_subagents_for_mechanical_edits.md`'s sharpened version). Phase 2's parser was Sonnet MAX as central technical risk; Phase 4's pilot is Opus MAX.

4. **Cold verify every phase boundary.** F23 lesson: never trust executor's "PASS" claim on faith. Re-run V probes via psql + filesystem checks. Spot-check 5-7 reference rows. Verify schema amendments live in DB (not just claimed). Audit count drift between executor's report and live DB.

5. **Phase MD V-probe expected values are prone to spec drift (F24, F27 family).** When critical-reviewing a phase MD, verify expected counts/values against the parser spec, not by trusting hand-written numbers in the MD. Phase 2 had off-by-3 row count + wrong status values in V5; Phase 3 had off-by-50 source_template counts + wrong V3 hard-zero. Pattern: real-data wins over hand-written expectations.

6. **Capture findings F28+ as new ones emerge.** Phase 4-7 will accrue new findings; append to `review-findings.md` at orchestrator-level after each phase boundary. Do not let executor write to review-findings; orchestrator owns cross-phase memory.

7. **Operator pace estimates beat conservative pacing** (`feedback_trust_operator_pace_estimates.md`). Surface concrete blockers, not generic risk anxiety.

8. **Plain English at decision points** (`feedback_plain_english_at_decision_points.md`). At sub-decision sign-offs, lead with plain-English summary; SQL DDL / JSON schemas go to spec/MD, not the conversation.

9. **D13 ASCII discipline** for code, console output, doc additions, commit messages. Wiki content preserves non-ASCII (Finnish/Russian/Swedish player + clan names; that's data, not output).

## Phase 4 specifics (next phase to draft)

Phase 4 is the only phase in this arc with a mid-phase LLM-shaped pilot (per D9 + `feedback_model_effort_range.md`). Sequence:

1. Phase 4 ships migration 009 (tournament-specific columns: parent_series, season_number, year, mode, format, prize_pool, organizer, dates, status, etc. -- exact column set surfaces from the pilot).
2. **Pilot subtask (Opus MAX subagent):** stratified sample of ~50 tournament articles read by an LLM to surface template variants + column candidates. Output: column list + parser branch list. Operator approves before migration 009 is written.
3. Migration 009 written + applied.
4. Deterministic parser (no LLM) loads ~700-900 tournament rows.
5. Note emitter for has_note=TRUE tournaments.
6. SCHEMA.md update.
7. T# verification gate (similar shape to Phase 2 T9 / Phase 3 T8) for has_note rule tuning.

**Phase 4 draft sequence (when this orchestrator session reaches Phase 4):**

1. Read `docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-tournaments.md` (27k tokens) via offset/limit chunks OR via Explore subagent summary (recommended; lighter on orchestrator context budget).
2. Identify the tasks that warrant Opus MAX (the pilot), which are Sonnet MAX (parser if multi-branch; emit-note for tournament-specific markdown), which are Sonnet medium (CLI dispatcher, upsert, tests, flags).
3. Draft executor prompt at `docs/superpowers/parking/2026-05-05-qwiki-community-reference-phase-4-executor.md` following the Phase 0/1/2/3 template (BEGIN/END markers; Recommended model + effort; Required reads; Operator-confirmed decisions; Critical rules; Execution-mode annotations; Pre-flight; First three actions; Halt-and-report contract; When in doubt; Orchestrator notes).
4. Bake in Phase 0-3 lessons:
   - F23 lesson: cold-verification posture; orchestrator re-runs probes
   - F24/F27 lesson: V-probe expected values verified against parser spec at critical-review time
   - F22 lesson: phase MD count expectations may be off; investigate before flagging FAIL
   - F16 awareness: empty wikitext handled gracefully (D5 two-threshold model)
   - F17 awareness: dotfile-inclusive directory walk
   - D9 reminder: Phase 1 migration 008 shipped placeholder tournaments columns; Phase 4 ships migration 009 with full column set
   - **Last applied migration is 008. Phase 4 ships 009.** (KTX arc planning surfaced a slot-collision risk -- see commit e85de674 -- but migration 009 is correctly assigned to QWiki Phase 4; KTX renumbers at execution time per its D5 amendment. The KTX arc is unrelated to QWiki except for the migration numbering.)

## First three actions for orchestrator session #2

1. **Read this resume handoff + the arc handoff (`docs/superpowers/parking/2026-05-04-qwiki-community-reference-orchestrator-handoff.md`) + the scaffold docs (decisions / review-findings / README) cold.** Confirm the live DB state matches what's documented (re-run cold V queries from this doc's "Live DB state" section; should match exactly).

2. **Cold-verify Phase 3's ship state independently** before drafting Phase 4. Even though session #1 already verified at sign-off, fresh-context cold-read should re-confirm: 822 clans / 350 has_note files / file-DB match / spot-check 6 fixture clans (Apocalypse_2000, Euthanasia, Firing_Squad, Morituri, Slackers, Sublime). If any drift surfaces, that's an F28+ finding -- surface to operator before proceeding.

3. **Dispatch Explore subagent (Sonnet medium) to summarize phase-4-tournaments.md.** Brief shape: task list + execution mode per task + V probes + open questions + F-references + smells. Same shape as the Phase 2 Explore dispatch from session #1. Then draft `phase-4-executor.md` parking doc; surface to operator with "ready to fire fresh terminal" recommendation.

## When in doubt

- **Phase MD spec text contradicts live data or parser rules** -> live data wins; capture as F-family finding (F24/F27 pattern).
- **Executor reports counts that don't match live DB** -> halt; investigate; reconciliation pattern is `TRUNCATE + fresh run from HEAD` per F23.
- **Orchestrator context approaches 350k mid-phase** -> wrap current phase boundary cleanly; write next resume handoff (orchestrator-resume-2.md) per `feedback_orchestrator_terminal_pattern.md` discipline.
- **Operator is offline / slow to respond at executor halt** -> queue; do not auto-proceed past gates that require operator judgment (D7 has_note tuning is operator-owned).
- **Subagent dispatch returns confused output** -> trust-but-verify; read the live code the subagent reported on; don't accept on faith.
- **A new findings count is climbing without resolution** (per `feedback_every_finding_gets_a_track.md`) -> pause; assess pattern; surface to operator.

## Outstanding open questions / deferrals (carry-forward)

- **F26 -- D6 6th signal (achievements_count).** Deferred for future tuning arc; doesn't block Phase 4-7. Same shape applies to player heuristic (D6 originally for players; same 5-signal limitation). Could land as a future small arc that re-runs Phase 2 + Phase 3 with the 6th signal.
- **F27 27b -- broader shared/wiki-text.ts fix for HTML-comment-aware trim.** Deferred; could benefit Phase 2 player parsing if same pattern surfaces there. Future small arc candidate.
- **Phase 6 Q6 (multi-disambiguator clusters).** Phase 7 phase MD references this; will surface during Phase 6 drafting/execution.

## Wave-2 status

Wave 2 (arc-orchestrator + arc-executor skills) is shipped. Both used in session #1 hybrid mode.

---

*This handoff doc was written by orchestrator session #1 at ~400k context, before context budget hits 500k failure zone. Per `feedback_orchestrator_terminal_pattern.md` smell-zone discipline.*
