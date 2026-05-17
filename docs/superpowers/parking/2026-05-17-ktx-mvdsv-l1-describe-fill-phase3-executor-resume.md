# Phase 3 executor resume handoff -- KTX source-synthesis (2026-05-17)

Fresh-terminal resume for the **arc-executor** of Phase 3 of the
`2026-05-16-ktx-mvdsv-l1-describe-fill` arc. The prior terminal wrapped at
context budget AFTER building + proving the full machinery and a
calibration batch. This is NOT a fresh start: Tasks 1 + 2-machinery are
DONE + committed; the volume D6 fan-out is the remaining bulk.

Open the Phase 3 executor prompt
(`docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-3-executor-prompt.md`)
and invoke the `arc-executor` skill first, exactly as a cold start would.
This doc is the augmentation layer ON TOP of that prompt -- it records
what is already verified + done so you do NOT re-derive it, and the exact
resumable loop.

## Where things are (verified live this session, do not re-derive blind)

- **Pre-flight CLEAN. Phase 0/1/2 verified EXECUTED** against live source
  (not relayed): commits `95e8d726`->`a02ba558`->`953fa0cd`->`a091221d`;
  migration `014` applied; D6 skill `~/.claude/skills/describe-fill-synthesis/`
  (SKILL.md + 4 references/ files) present; D7 gate
  `apps/qw-oracle/scripts/describe-fill/review-gate.ts` present; D11/D15
  serializer `apps/qw-oracle/scripts/load-knowledge/serialize-audit-review.ts`
  present; F-D4a owned-row guard live in
  `scripts/load-knowledge/derive-entity-description.ts` (membership-alone,
  no anchor conjunct); 4 Phase-1/2 C5 probes registered + [PASS] at
  baseline.
- **Live denominators (POST-Phase-0, the C1 gate-shape):** cvar **260** /
  command **358** / info_key **7**. In-scope to fan = **624** (M_total 625
  minus the idempotent Phase-1-terminal `ktx:cvar:k_short_gib`).
- **Anchor (live, stamp every synthesized KTX row):**
  `1.47-2-g67253dc` (ktx versions.commit_sha `67253dc9`, == ktx clone
  `git describe --tags`). Do not hardcode blind elsewhere; it is derived
  into the manifest.
- **F-C3c CONFIRMED from the Phase-0 artifact:** the KTX C3 legs are
  `ktx/cvar = 0 suspects` and `ktx/command = NON-DIAGNOSTIC (excluded)`.
  Therefore **every KTX entity's `suspect_pool_member = FALSE`** and
  **NO KTX entity is ever dead-stamped** -- KTX commands are described
  from source behaviour like any non-suspect knob (dead-stamping a knob
  the oracle cannot observe is the exact shipped lie C3/F-C3c forbid).
- **F-D11c CONFIRMED live:** `review-gate.ts:83-89` `ProvenanceEntry.
  structured_choices?: Array<{value:string;label:string}>` -- FLAT.
  Phase-2 retained provenance carries the flat per-source shape; the
  manifest passes it through UNCHANGED (verified on the `k_noframechecks`
  canary: in-repo `(0=no,1=yes)` vs nQuake `(0=yes,1=no)` polarity
  inversion preserved per-source).

## What is DONE + committed (do NOT rebuild)

- **Task 1 (assembler)** -- commit `546610a2`.
  `apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts --assemble-only`
  emits the deterministic 624-entity manifest at
  `apps/qw-oracle/output/describe-fill/phase3-ktx-manifest.json` (md5
  `8c7a8682...`, gitignored per F-D11b), each entity carrying the
  9-element D6 brief packet + `canonical_id`/`entity_type`/`source_ref`/
  `research_aids_dir`; the 11 config-drift non-resolvers as a separate
  no-entity section (D9 fill-not-create).
- **Task 2 machinery (persist/status/fingerprint)** -- commit `54b27d0f`.
  `--persist <records.json> [--dry-run]` (idempotent UPSERT, `tx.json`
  P2, `UPDATE ... WHERE canonical_id` fill-not-create, `k_short_gib`
  whole-skip F-D9b/D19, `--dry-run` rolls back); `--status` = the
  cross-terminal resume cursor; `--fingerprint` = idempotency/F-D4a
  baseline.
- **F-P3a fix** -- commit `c8a17cd3` (subagent self-committed; on-arc,
  on-main; lacks the Co-Authored-By trailer -- cosmetic, left as-is).
  `computeFingerprint(exec)` now takes the executor: `--persist` passes
  `tx` (sees its own writes -- live=to-commit, dry-run=would-be), proven
  non-vacuous; `--fingerprint`/`--status` pass `sql`. The earlier
  vacuous-dry-run signal is gone. **F-P3a (Substantive, FIXED) is for the
  orchestrator ledger** -- a Phase-3-built-component verification-gate
  defect caught + fixed in-task (single iteration), not a decision
  conflict.
- **Calibration batch PROVEN end-to-end + persisted** (6 deliberately
  diverse knobs, the cheap-probes discipline before the expensive
  volume): `k_noframechecks` (F-C2a/D10 -- C2 meaning-conflict surfaced
  in reasoning for the D7 tail, both per-source flat structured_choices
  preserved, NOT auto-resolved), `k_admincode` (NULL residue ->
  synthesize), `k_fbskill_aim_accuracy` (D8 -- mechanism-only, tuning
  routed OUT to L3), `allow_timing` (D5-amendment -- shipped comment did
  NOT auto-count, cryptic -> synthesize), `autotrackktx` (F-C3c -- KTX
  command described-from-source NOT dead-stamped), `10fav_go` (CD_NODESC
  command, F-C3c, source-legible). All `synthesized|high`, anchor
  stamped, landed in the DB. `--status` now **6 evaluated / 618
  remaining**; `--fingerprint` committed baseline `6062e6b3...`;
  `k_short_gib` terminal/excluded/counted-once intact. Records template:
  `output/describe-fill/phase3-records-calibration.json` (gitignored;
  shape is the worked example for the volume loop).

## The remaining work (the bulk -- this is what the next terminals do)

1. **Task 2 volume D6 fan-out: 618 remaining knobs.** `--status` lists
   them (the resume cursor: any manifest entity with
   `description_verdict IS NULL`). Per knob: one **Opus 4.7 MAX**
   sub-agent (`model:"opus"`, `subagent_type:"general-purpose"`) invoking
   the `describe-fill-synthesis` Skill on exactly that knob, returning the
   structured JSON record. SPEC-LOCKED by D7 -- not lowerable, not
   inlineable.
2. **Task 3: D7 tier-1 independent re-check.** Build the `gate()` half of
   `synthesize-ktx.ts` (the stub throws "not yet implemented"): wire the
   Phase-1 `review-gate.ts` over every `synthesized` row as an
   INDEPENDENT Opus-4.7-MAX invocation (separate context from the Task-2
   author). PASS->commit; FAIL->bounce one bounded retry OR route to C1
   residue (never massaged). Mark the tier-2 tail set.
3. **Task 4: the C5 probe + harness.** Build the `probe()` half: add
   `F1.describe_fill.synthesized_requires_source_ref` to
   `quality-grid.ts` REGRESSION_PROBES; the coverage/residue/idempotency
   harness + the `--twice` byte-identical proof + the run report
   (coverage vs M per bucket, the C1-outreach residue, the 11
   config-drift non-resolvers, the D10 meaning-conflict tail list).
4. **Task 5: the D7 tier-2 OPERATOR tail.** Emit the Phase-1
   `serialize-audit-review.ts` page over the full evaluated set
   (subagent, Sonnet medium -- a projection); the operator works every
   hedged + residue + C2-flagged D10 meaning-conflict (`k_noframechecks`
   the worked canary) + a spot-check, Claude proposes / operator
   approves. THIS is the phase boundary -- operator-run, not
   Claude-automatable.
5. **Phase-boundary verification** -- the 7 automated YES/NO probes +
   the non-negotiable **F-D4a owned-row re-derive-safe proof**:
   fingerprint owned rows BEFORE, run `bun scripts/load-knowledge/index.ts
   re-derive --project ktx --type cvar`, fingerprint AFTER -- byte
   identical, `k_short_gib` still byte-identical synthesized. Then commit
   + halt. Do NOT proceed to Phase 4. Do NOT re-run the holistic gate.

## The resumable volume loop (the recipe that worked)

Per batch (size by context budget -- ~6-10 parallel sub-agents/batch was
clean; collect, persist, discard detail, repeat):

1. `bun scripts/describe-fill/synthesize-ktx.ts --status` -> the
   remaining canonical_ids. Read the next N packets from
   `output/describe-fill/phase3-ktx-manifest.json` (each carries the full
   9-element brief; `mechanical_candidate` carries the FLAT
   structured_choices Phase-2 provenance -- pass through verbatim, never
   reshape to `{enum?,bitmask?}`).
2. Dispatch N **Opus** sub-agents in ONE message (concurrent;
   independent, no shared state). Brief = the 9 non-inferential elements
   ONLY; the skill hard-codes the rubric/guards (do NOT re-explain them).
   Each returns one fenced ```json record (fields:
   project,knob,type,description,description_origin,
   description_anchor_version,description_provenance,description_verdict,
   description_confidence,description_reasoning,description_proposed) +
   the one-line halt. Use the calibration dispatch prompts as the exact
   template (they worked 6/6); reuse the per-finding reminders verbatim:
   F-C3c (KTX never dead-stamped), F-C2a/D10 (meaning-conflict ->
   C2-note in reasoning for the D7 tail, value-difference -> L3 not an L1
   flag), D8 (k_fbskill_* mechanism-only + L3 route), D5-amendment (every
   entity evaluated; a comment is one input never a verdict).
3. Two-stage review the records (spec + quality); collect into a batch
   records JSON (gitignored `output/describe-fill/`); run
   `--persist <batchfile>` (idempotent; re-runnable). Verify `--status`
   advanced + `--fingerprint` changed (it is now non-vacuous, F-P3a
   fixed).
4. Approaching the smell zone -> wrap with an updated copy of THIS
   handoff (advance the done/remaining counts, keep the recipe). The DB
   is the source of truth for progress; `--status` is the cursor. The
   loop is fully idempotent (C4/P3) so a re-run of an already-persisted
   batch is safe.

## Critical rules (locked; carry verbatim from the executor prompt)

- D6 + D7 are **Opus 4.7 MAX, spec-locked (D7), not lowerable**. "cheap"
  = the in-invocation fast-affirm early exit, never a cheaper model.
- **F-C3c: never D6-dead-stamp a KTX entity** (cvar 0 suspects, command
  leg non-diagnostic). Describe from source; if not source-legible ->
  hedge/residue (never guess, never dead-stamp).
- **F-C2a/D10:** meaning-conflicts (k_noframechecks-class polarity) ->
  source is tiebreaker, C2-note in `description_reasoning` for the
  operator D7 tier-2 tail, NEVER auto-resolved. Value-differences (e.g.
  `k_short_gib` 1/0, `sv_maxrate`) -> L3 candidate, NOT an L1 conflict
  flag. Retained per-source provenance is evidence -- never merge it.
- **F-D9b:** the moment Phase 3 stamps a verdict on a `shipped_doc` row
  it is terminal-owned; the Phase-2 loader will NOT re-touch it. Phase 3
  owns provenance integrity from the verdict-write onward.
- **F-D10c / F-C3b (boundary):** describe `sv_antilag` DUAL via Phase-4
  cross-reference source evidence only; do NOT create a KTX `sv_antilag`
  entity, do NOT extract the `dusty-*` fork, do NOT classify
  reachability.
- C1: residue is tracked + enumerated to the C1-outreach track, never
  importance-cut; M (260/358/7) is never lowered. The 11 config-drift
  non-resolvers are recorded + routed, never created (D9).
- P1-P5: Bun, append-only migrations + SCHEMA.md, main-tree commit-on-
  main (no PR/worktree; run git silently; commit ONLY this arc's files
  -- the pre-existing parallel-arc working-tree drift is NOT ours), ASCII
  only, JSONB as JS values (`tx.json`/`sql.json`).
- Verification discipline is highest priority: re-derive every
  load-bearing number/path via psql/grep/ls; a prior session's
  "verified" (including THIS doc) is a hypothesis -- the executor prompt
  + the live DB are the contract. (F-P3a is the cautionary precedent: a
  verification signal was itself vacuous until perturbation-proven.)

## First three actions (next terminal)

1. Open the Phase 3 executor prompt; invoke `arc-executor`; spot-re-verify
   the live anchors (M=260/358/7 via psql; `--status` = 6/618;
   `--fingerprint` = `6062e6b3`; `git log --oneline -4` shows
   `546610a2`/`54b27d0f`/`c8a17cd3`). A mismatch means investigate, not
   proceed.
2. Resume the volume loop above: `--status` -> dispatch the next batch of
   Opus D6 sub-agents using the calibration prompt template -> review ->
   `--persist` -> verify `--status`/`--fingerprint` advanced. Pace to the
   context budget; this is many terminals.
3. When all 624 are evaluated (`--status` 624/0 + k_short_gib intact),
   move to Task 3 (build + run the D7 tier-1 `gate()`), then Task 4
   (probe + harness + `--twice` + run report), then Task 5 (operator
   tail), then the phase-boundary block incl. the verbatim F-D4a
   re-derive-safe fingerprint pair. Halt with the structured status.

## When in doubt

The phase MD + decisions.md + review-findings.md + the executor prompt
are the contract; this doc is the verified-state shortcut. If this doc
and the live DB disagree, the live DB wins (re-derive). If a D6 sub-agent
is unsure it must hedge/residue-route (never guess) -- that is the
designed behaviour, tracked not dropped (C1). Do not push D6/D7
(highest-judgment) work past the smell zone -- wrap and hand off; one
extra terminal is cheap, a degraded shipped L1 description is not.
