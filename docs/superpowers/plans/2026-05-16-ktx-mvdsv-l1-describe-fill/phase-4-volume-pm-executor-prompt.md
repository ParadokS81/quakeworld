# EXECUTE Phase 4 -- MVDSV volume batch 1: `pm_*` movement (post-calibration scale-up)

You are the **arc-executor** for the **first MVDSV volume subsystem batch** of
the 2026-05-16 KTX/MVDSV L1 describe-fill arc, Phase 4. The 12-knob
calibration is DONE and the operator gave the scale-up GO. You ship ONE
subsystem cluster -- the 6 `pm_*` movement cvars -- end to end: synthesize ->
V-pass -> (seeded re-synth if flagged) -> **persist durably + idempotently**,
then HALT with a report. This is the first batch in a "one subsystem at a
time" scale-up; you also stand up the reusable MVDSV persistence path that
later batches reuse.

Invoke the `arc-executor` skill first. Working dir:
`/home/paradoks/projects/quakeworld`.

## Where things are (verified 2026-05-30 -- but RE-VERIFY live; a prior session's "verified" is a hypothesis)

- **The calibration validated the loop.** 12 known-answer knobs ran blind
  through synthesize (Opus MAX) -> independent V-pass -> seeded re-synth.
  Result: V-pass caught the planted floodprot C-FIX; 12/12 real rows
  TRACED-CLEAN on first synthesis; 0% re-synth; zero fabrication (HARD GATE 2
  held). The proven-pattern record is
  `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-calibration-ledger.md`
  -- READ IT; it is your loop template.
- **Operator scale decisions (2026-05-30, locked):**
  - **(A) full synthesis** -- every knob is synthesized; there is NO
    affirm-and-reshape lane. Verbatim-affirm only when a comment is already in
    D20 template shape (rare). (`pm_*` are all cold-synth anyway -- no
    comments.)
  - **Cross-engine consequence policy:** `See also: <L3 slug>` by DEFAULT;
    inline a cross-engine clause ONLY if it changes the admin's action.
  - **scale one subsystem at a time, not all at once.** This batch = `pm_*`.
  - **`sv_antilag` is OUT** of these batches -- it is the D10 cross-fork DUAL,
    handled separately.
- **D20 is NOW ENCODED in the `describe-fill-synthesis` skill** (it was not,
  at calibration time -- I hand-injected it then). The skill now carries
  `references/d20-description-template.md` (the condensed template, the
  description/reasoning cite-split, the See-also-L3 policy) and Step 3/5/6
  wiring. GREEN-tested: a subagent given a MINIMAL brief (no D20 hint)
  produced a correct D20-shaped row. **CONSEQUENCE: your synthesis briefs are
  MINIMAL** -- the 9 non-inferential elements from
  `~/.claude/skills/describe-fill-synthesis/references/subagent-brief-template.md`,
  nothing more. Do NOT re-inject the D20 template; the skill supplies it. (The
  skill lives in `~/.claude`, which is NOT a git repo -- the edit is live but
  uncommitted.)
- **Persistence is NOT yet built.** The calibration deliberately did NOT write
  the DB (it was a measurement). This batch is scaling, so it MUST persist.
  The MVDSV synthesis-write path does not exist yet -- you build it here
  (small, on 6 knobs) and later batches reuse it.

## Scope -- the 6 `pm_*` knobs (all `cvar`, all cold-synth, all suspect_pool=FALSE)

`pm_airstep`, `pm_bunnyspeedcap`, `pm_ktjump`, `pm_pground`, `pm_rampjump`,
`pm_slidefix`. All `description_origin IS NULL` (no comment -- cold synthesis,
D5 amendment: absence is not a skip). None are in the Phase-0 C3 suspect pool
(`phase-0-artifacts/c3-suspect-pool.md` -- the genuine MVDSV pool is the 9
`sv_www_*`/`sv_web_*`/`sys_sleep`/`localcommand` rows). `pm_ktjump` was already
synthesized TRACED-CLEAN in the calibration (ledger has the proven text) --
re-run it through the same loop for a uniform batch, or reuse; either way it
ends persisted.

## Required reading (all, before executing)

1. `mvdsv-calibration-ledger.md` -- the proven loop + the yield bar + the two
   worked examples (floodprot, sv_accelerate) in D20 shape. Your template.
2. `~/.claude/skills/describe-fill-synthesis/SKILL.md` + its 6 `references/`
   (esp. the NEW `d20-description-template.md` and `enforce-trace-discipline.md`
   = B1). This is the unit you fan out.
3. `decisions.md` DATED blocks: **D7 Amendment 2026-05-19 (B1-B5)** -- the
   V-pass contract; **D20** -- the description template; D5 (+ amendment), D6,
   D8, D9 (fill-not-create), C1-C5, P1-P5.
4. The phase MD `phase-4-mvdsv-fill.md` -- Tasks 4-7 (the synthesis-side
   driver: assemble -> fan-out -> gate -> write -> coverage/idempotency
   harness) are the relevant ones. **Tasks 1-3 (the `mvdsv.6` + shipped-config
   mechanical siblings) are NOT needed for `pm_*`** -- they are all cold-synth
   with no shipped-config candidates; defer the mechanical siblings to a batch
   that has shipped-doc candidates (e.g. the `sv_*` admin slice).
5. The KTX persistence precedents (READ to mirror, do not reinvent):
   `apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts`,
   `apply-l1-from-ledgers.py`, `apply-l1-category.py`,
   `gen-fleet-prompts.mjs`. The KTX flow = run the loop -> capture to a ledger
   -> an apply script persists from the ledger with the clobber-guard + P2
   JSONB binding. Mirror the faithful pattern for MVDSV.
6. The V-pass template `v-pass-handover-prompt.md` (adapt for MVDSV; source
   oracle = the loaded MVDSV head, NOT KTX).

## The loop (proven in calibration -- repeat it, then persist)

1. **Synthesis fan-out.** One `describe-fill-synthesis` subagent per knob at
   **model `opus`, MAXIMUM reasoning**. MINIMAL brief (the 9 elements;
   subagent reads the skill + all 6 references itself; do NOT re-inject D20).
   anchor_version = the live MVDSV `git describe` (recon it:
   `git -C research/repos/mvdsv describe --tags` -- session value
   `1.11-53-g18d0362`; do NOT hardcode blind). suspect_pool_member=FALSE for
   all 6. source root `research/repos/mvdsv` (`src/`). Collect the structured
   records.
2. **F-D6a grep-verify.** Before trusting/persisting any subagent's
   `source_ref`/line/conflict claim, independently `grep` it against live
   MVDSV source. A fabricated line is a shipped lie.
3. **V-pass.** Independent, READ-ONLY, cold-context subagents (model `opus`,
   max), each given ONLY the knob + the synthesized `description` (NOT the
   synth's reasoning -- B3 context independence). Per-clause enforce-trace
   against MVDSV source at the anchor; classify TRACED-CLEAN / C-NEAR-MISS /
   C-FIX / WI2-FIX. 6 knobs -> ~2 subagents of 3, or 1 of 6. Good practice:
   inject one F-V2 structural canary (a deliberately-wrong row with a known
   verdict) to keep the V-pass honest at volume -- optional at this size but
   recommended.
4. **HARD GATE 2.** YOU (orchestrator) independently re-grep >=1 flagged
   row's wrong-clause enforcing line AND >=1 TRACED-CLEAN row's load-bearing
   clause per wave. Not a sample -- a gate.
5. **Seeded re-synth (B4)** for any flagged row: route back through the D6
   skill FROM STEP 1, seeded with the V-pass finding (wrong clause + enforcing
   file:line) as a mandatory anchor, FULL trace-every-clause pass, re-V-pass.
   Terminate at TRACED-CLEAN or a genuine hedge/residue.
6. **Persist (the new part).** Build the minimal MVDSV synthesis-write path
   (mirror `synthesize-ktx.ts` + `apply-l1-from-ledgers.py`): write each
   evaluated `pm_*` row's `description` (D20 shape), `description_origin`,
   `source_ref`, `description_anchor_version`, `description_provenance` (JS
   value via `tx.json` -- NEVER pre-stringified, P2/F-C5a),
   `description_verdict`/`confidence`/`reasoning` (D11 trail; the enforce-trace
   cites live in reasoning, NOT description -- D20). **Clobber-guard** (skip
   terminal-owned rows; UPSERT on the entity key; NEVER create an entity --
   D9 fill-not-create). **Extend `F1.jsonb_columns_not_strings` to mvdsv**
   (MD Task 7 -- this batch is the first MVDSV provenance JSONB write) and
   assert it + the four Phase-1/2/3 `describe_fill` probes GREEN. Prove
   **idempotency**: run the write twice -> byte-identical row fingerprint.
   Append-only migration + `SCHEMA.md` same task if you touch schema.

## Critical rules (locked)

- **Verification discipline -- highest priority.** Re-derive every
  load-bearing number/path/anchor via psql/grep/git. Re-confirm: the 6 `pm_*`
  rows + NULL origin; the live anchor; the spine files; the calibration
  ledger's claims; the D20-in-skill change. This handoff is a hypothesis.
- **Completeness (C1).** All 6 end synthesized-or-residue; never importance-cut.
- **D6 confabulation guard.** Not source-legible -> hedge or C1-route; NEVER
  guess, even at Opus MAX. Name-only synthesis is FORBIDDEN.
- **D20 split.** `description` = condensed user-doc, NO file:line / engine
  jargon; cites + trace -> `description_reasoning`. Cross-engine consequence ->
  `See also: L3` unless action-changing. The skill enforces this now -- verify
  the output honors it.
- **C4 -- repair by re-running the corrected pipeline, never a hand `UPDATE`.**
  JSONB binds JS values / `tx.json`, never pre-stringified (P2).
- **Dial caveat (honest):** "Opus 4.8 MAX" is approximated -- model `opus` +
  prompted max reasoning + session `/effort max`; the Agent tool exposes no
  per-subagent reasoning dial. The **verify-independence** (separate
  cold-context V-pass) is the load-bearing safeguard, not a guaranteed tier --
  the calibration bore this out (the catch came from independence). Keep the
  V-pass strictly independent.
- ASCII only in committed docs/code. Bun runner
  (`bun scripts/load-knowledge/index.ts ...`), not npm. Main-tree git,
  commit-on-main, push at checkpoint, no worktree/PR ceremony (you run git
  silently; operator does not touch git). Commit ONLY this arc's MVDSV files
  (the new driver/migration/probe + an updated ledger) -- the pre-existing
  uncommitted parallel-arc drift is not ours; `git diff --cached --stat`
  between add and commit.

## First actions (cold start)

1. Invoke `arc-executor`. Read the calibration ledger + the D6 skill (incl. the
   new D20 reference) + the decisions DATED blocks + phase MD Tasks 4-7 + the
   KTX persistence precedents.
2. Re-verify live: the 6 `pm_*` rows (NULL origin); `git -C research/repos/mvdsv
   describe`; migration 018 + the trail columns; the DB up
   (`docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`).
3. Run the 6 knobs through synthesize -> V-pass -> (re-synth) at Opus 4.8 MAX,
   minimal briefs (D20 from the skill). HARD GATE 2 each wave.
4. Build the minimal MVDSV persistence path; persist the 6; extend the jsonb
   probe to mvdsv; prove idempotency + probes GREEN.
5. Update `mvdsv-calibration-ledger.md` (or a new `mvdsv-pm-batch-ledger.md`)
   with the batch's records + V-pass results + HG2. Commit + push (this arc's
   files only).

## Halt-and-report contract

HALT with: **DONE** (6 persisted, idempotent, probes GREEN, V-pass clean) /
**DONE_WITH_CONCERNS** (name it) / **NEEDS_CONTEXT** / **BLOCKED** (name the
missing precondition). Report: per-knob verdict + V-pass classification + any
re-synth, the idempotency fingerprint result, the jsonb-probe-GREEN result,
any HG2 catch with wrong-clause + enforcing-line, and a one-line
recommendation for batch 2 (candidate: `qtv_*` (9), or a first `sv_*` admin
slice -- which needs the Task 1-3 mechanical siblings for its shipped-config
candidates). Do NOT proceed to batch 2 in the same terminal if you near the
~350k smell zone -- wrap and write the next handoff.
