# Orchestrator ledger -- arc 2026-06-05-qtv-qwfwd-l1-extraction

Running cross-phase memory for the arc-orchestrator session. Append-only per phase boundary. The README phase-index is the public status board; this ledger is the orchestrator's working memory (pre-flight state, cross-phase wires, decision amendments, boundary-verification log).

**Role:** orchestrator (coordination only -- does NOT modify project code; dispatches arc-executor terminals per phase, verifies boundaries independently).
**Execution mode chosen:** fresh arc-executor terminal per phase (operator decision, 2026-06-05).

---

## Pre-flight (2026-06-05) -- COMPLETE

- All 5 phase MDs `approved`; full scaffold + spec + seed + all phase MDs read cold. Cross-phase contract chain consistent 0->1->2->3->4.
- **Prerequisites:** P1 PASS (Postgres up+healthy, migrator clean at `019`, 0 pending). P2 PASS (qtv/qwfwd sources present, no `.git` in either -- D1/F2 holds). P5 PASS (libclang-18 + python3-clang clean).
- **P6 (Go 1.24) -- ABSENT.** `go` not on PATH nor in `/usr/local/go` / `~/go`. Needed before **Phase 2** (not Phase 0/1). MUST be installed before Phase 2 kickoff. <-- carry-forward.
- **F9 recorded** (review-findings.md): Phase 0 introspection/V2 query doubly broken (ORDER BY alias-cast error + `ILIKE '%project%'` projectile false-positive -> 11 rows not 10). Migration DDL correct. Corrected query (key on `'ezquake'`) verified to return exactly 10. Fix carried in `phase-0-executor-prompt.md`, not the approved MD.
- psql access: host `psql` NOT installed; use `docker exec -i qw-oracle-postgres-dev psql "$DATABASE_URL"` (DATABASE_URL from `apps/qw-oracle/.env`).

---

## Phase status board

| Phase | Status | Boundary verified by orchestrator? | Notes |
|---|---|---|---|
| 0 schema+plumbing | executor prompt handed off (2026-06-05) | pending | F9 fix carried in executor prompt |
| 1 qwfwd extractor | not started | -- | needs P5 (have it) |
| 2 qtv extractor | not started | -- | **needs Go toolchain (P6) installed first** |
| 3 describe-fill | not started | -- | **needs Q-SKILL gate-widening applied first** |
| 4 validate+decide | not started | -- | -- |

---

## Cross-phase capture obligations (the wires that silently break)

1. **Phase 1 V4 QWFWD per-type counts -> Phase 4 floor baselines.** NOT hardcoded (F7: extractor count is truth). Record the exact `entities` per-type counts for `project='qwfwd'` at the Phase-1 boundary; they become `QWFWD_FLOOR_PROBES` `expected` values in Phase 4 Task 2.
   - STATE: pending (Phase 1 not run).
2. **Phase 2 V4 QTV counts.** Known: cvar=41, command=12 (Phase-2 V4 hardcoded + grep-verified). Re-confirm against live count at Phase-2 boundary; feed `QTV_FLOOR_PROBES`.
   - STATE: pending (Phase 2 not run).
3. **Phase 3 `[L3 breadcrumb: <candidate>]` tags -> Phase 4 concept-note decision evidence.** New convention (mother-ledger SR-5; absent from sibling arc) written into `entities.description_reasoning`. Phase 4 Task 3 Step 0 queries these. If the `parse_delay`/`tick_time` harvest comes back empty, Phase 4 defers candidate (b) per the endorsed bias.
   - STATE: pending (Phase 3 not run).
4. **Q-SKILL Option A gate-widening BEFORE Phase 3 Task 4.** `~/.claude/skills/describe-fill-synthesis/SKILL.md` line 102 hard-aborts when project not in `{ktx,mvdsv}`. Widen to `{ktx,mvdsv,qtv,qwfwd}` + update 4 doc refs (SKILL.md lines 4/53/354 + `references/subagent-brief-template.md:17`). Operator-approved (Option A). Safe-additive. Shared user-global skill edit.
   - STATE: pending (apply before Phase 3 executes).

## Concept-note decision bias (Phase 4, operator-endorsed starting point; live breadcrumbs refine; operator ratifies)
- (a) master-server registration/heartbeat = AUTHOR (strong).
- (b) MVD streaming + `parse_delay` ghosting = author-lean; DEFER if breadcrumbs thin.
- (c) `qtv_password` auth matrix = DEFER (MVDSV ledger already documents the matrix; QTV row See-also-links to it).

---

## Decision amendments log

(none yet -- amendments land as dated blocks in decisions.md, mirrored here.)

---

## Boundary-verification log

(append one entry per phase boundary: what the orchestrator independently re-ran, the result, and the sign-off.)
