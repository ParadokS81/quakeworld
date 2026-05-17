# Phase 3 executor resume handoff -- KTX source-synthesis (2026-05-17)

Fresh-terminal resume for the **arc-executor** of Phase 3 of the
`2026-05-16-ktx-mvdsv-l1-describe-fill` arc. Machinery (Tasks 1 +
2-machinery) DONE + committed; calibration proven; the F-D4a mini-proof
PASSED; the **D6 volume fan-out is IN PROGRESS** (26 / 624 evaluated as
of this wrap). This is NOT a fresh start and NOT blocked -- it is a
clean mid-loop budget wrap. Pick up the volume loop where `--status`
says it is.

Open the Phase 3 executor prompt
(`docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-3-executor-prompt.md`)
and invoke the `arc-executor` skill first, exactly as a cold start
would. This doc is the augmentation layer ON TOP of that prompt -- it
records what is already verified + done so you do NOT re-derive it, plus
the exact resumable loop and the batch-loop learnings.

## Where things are (verified live this session 2026-05-17; do not re-derive blind, but DO re-verify)

- **Pre-flight CLEAN. Phase 0/1/2 verified EXECUTED** against live source
  (not relayed) this session: commits `546610a2`/`54b27d0f`/`c8a17cd3`
  present (`git log --oneline`); migration `014` applied (proven: the
  `shipped_doc`/verdict/anchor columns carry live data); D6 skill
  `~/.claude/skills/describe-fill-synthesis/` (SKILL.md + 4 references/)
  present; D7 gate `apps/qw-oracle/scripts/describe-fill/review-gate.ts`
  present; D11/D15 serializer
  `apps/qw-oracle/scripts/load-knowledge/serialize-audit-review.ts`
  present; F-D4a owned-row guard LIVE in
  `scripts/load-knowledge/derive-entity-description.ts` -- phrased
  `description_origin IS DISTINCT FROM 'synthesized' AND ... IS DISTINCT
  FROM 'shipped_doc'` (NULL-safe, membership-alone, NO anchor conjunct;
  in deriveCvar + deriveCommand + the other 2 arc-bucket derivers; file
  header documents the WHY). NOTE: a literal `grep "description_origin
  IN"` returns nothing -- the guard uses `IS DISTINCT FROM`, not `IN`;
  do not read that as "guard absent" (a prior-session grep false alarm).
- **Live denominators (POST-Phase-0, the C1 gate-shape):** cvar **260** /
  command **358** / info_key **7**. In-scope to fan = **624** (manifest
  excludes the idempotent Phase-1-terminal `k_short_gib`).
- **Anchor (live, stamp every synthesized KTX row):**
  `1.47-2-g67253dc` (ktx versions.commit_sha `67253dc9ab4f`, == ktx
  clone `git describe --tags` and `git rev-parse --short=8 HEAD`).
  Derived into the manifest packets; do not hardcode blind elsewhere.
- **Manifest:** `apps/qw-oracle/output/describe-fill/phase3-ktx-manifest.json`
  (md5 `8c7a8682a336b1c118d61382378fb25e`, gitignored per F-D11b), 624
  entities each carrying the full self-contained brief packet
  (project/knob/anchor_version/mechanical_candidate/suspect_pool_member/
  source_root/model_dial/output_contract/out_of_scope + source_ref +
  research_aids_dir + canonical_id + entity_type) + an 11-entry
  `config_drift_nonresolvers` section (D9 fill-not-create; no entity).
- **F-C3c CONFIRMED live (Phase-0 artifact):** every KTX entity's
  `suspect_pool_member = FALSE` (ktx/cvar 0 suspects; ktx/command leg
  NON-DIAGNOSTIC/excluded). NO KTX entity is ever dead-stamped -- KTX
  commands are described from source behaviour like any non-suspect knob.
- **F-D11c CONFIRMED live:** `review-gate.ts` LOCKS the FLAT
  `structured_choices?: Array<{value:string;label:string}>`. Phase-2
  retained provenance is passed through UNCHANGED (per-source polarity
  preserved). The `--persist` `D6Record` has NO `source_ref` column --
  the synthesized row's citation rides the EXISTING
  `cvar_versions`/`command_versions` source_file+source_line (P3/D6, no
  new format); the C5 `synthesized_requires_source_ref` probe checks
  that mechanism's EXISTENCE, not the record.

## What is DONE + committed (do NOT rebuild)

- **Task 1 (assembler)** -- commit `546610a2`. The deterministic
  624-entity manifest (above).
- **Task 2 machinery (persist/status/fingerprint)** -- commit
  `54b27d0f`. `--persist <records.json> [--dry-run]` (idempotent UPSERT
  matched by project+type+name, `tx.json` P2,
  `UPDATE ... WHERE canonical_id` fill-not-create, `k_short_gib`
  whole-skip F-D9b/D19, `--dry-run` rolls back); `--status` = the
  cross-terminal resume cursor; `--fingerprint` = idempotency/F-D4a
  baseline. **`gate()` (Task 3 D7 tier-1) is still a "not yet
  implemented" stub** -- the volume loop is Task-2-only; Task 3 runs
  AFTER all 624 are evaluated.
- **F-P3a fix** -- commit `c8a17cd3`. `computeFingerprint(exec)` takes
  the tx so `--persist` is non-vacuous (committed == dry-run would-be,
  proven both batches this session).
- **Calibration batch (6) PROVEN + persisted** (prior session): records
  template `output/describe-fill/phase3-records-calibration.json`
  (gitignored; the worked example shape -- command rows
  `autotrackktx`/`10fav_go` show mc=none commands DO carry a populated
  `description_provenance` JS array of read-site grounding entries).
- **F-D4a mini-proof PASSED** (prior session): a real `re-derive
  --project ktx --type cvar` left the owned-row set byte-identical;
  the Phase-1-spine owned-row guard protects Phase-3 `synthesized`
  rows. The FULL phase-boundary F-D4a proof is still the
  final-terminal deliverable.
- **Volume batches 1 + 2 persisted this session (20 KTX commands):**
  batch-01 = `10on10`,`11fav_go`..`19fav_go`; batch-02 =
  `1fav_go`,`1on1`,`20fav_go`,`2fav_go`,`2on2`,`2on2on2`,`3fav_go`,
  `3on3`,`3on3on3`,`4fav_go`. All `synthesized|high`, anchor stamped,
  read-site-grounded (xfav_go spectator-slot family / UserMode mode
  presets), F-C3c honoured (none dead-stamped), D5-amendment applied
  (CD_NODESC "no desc" / CD_ name-restatement / `.......etc........`
  ditto-filler all treated as ONE input -> synthesize). Records:
  `output/describe-fill/phase3-records-batch-01.json` +
  `-batch-02.json` (gitignored; re-runnable, idempotent).

## Live cursor state at this wrap (re-verify first thing -- a mismatch means investigate)

- `--status`: **26 evaluated / 598 remaining** (command evaluated=22
  remaining=336; cvar evaluated=4 remaining=255; info_key evaluated=0
  remaining=7). `k_short_gib` terminal=true, counted-once (C4/D19/P3).
- `--fingerprint`: **`87349f25a85a37b0c25e5529ea5600f5`** (was
  `6062e6b3...` at session start -> `6320b04c...` after batch 1 ->
  `87349f25...` after batch 2; it is non-vacuous, F-P3a fixed).
- `git log --oneline -6` should still show
  `546610a2`/`54b27d0f`/`c8a17cd3` plus the handoff-doc commits.

## The remaining work (the bulk -- many terminals)

1. **Task 2 volume D6 fan-out: 598 remaining knobs.** `--status` is the
   cursor (any manifest entity with `description_verdict IS NULL`). The
   manifest is ordered; the next remaining knobs are still the command
   bucket (the `*on*` mode presets + remaining families), then cvars
   (incl. the 100 `shipped_doc` candidates + the 38 bot `k_fbskill_*`
   D8 set + residue), then 7 info_keys.
2. **Task 3: D7 tier-1 independent re-check.** Build the `gate()` half
   of `synthesize-ktx.ts` (stub throws). Wire `review-gate.ts` over
   every `synthesized` row as an INDEPENDENT Opus-4.7-MAX invocation
   (separate context from Task 2). PASS->commit; FAIL->one bounded
   retry OR C1 residue. Mark the tier-2 tail set.
3. **Task 4: the C5 probe + harness.** Add
   `F1.describe_fill.synthesized_requires_source_ref` to
   `quality-grid.ts` REGRESSION_PROBES; the coverage/residue/idempotency
   harness + the `--twice` byte-identical proof + the run report.
4. **Task 5: D7 tier-2 OPERATOR tail.** Emit the `serialize-audit-review.ts`
   page (subagent, Sonnet medium -- a projection); operator works every
   hedged + residue + C2-flagged D10 meaning-conflict + spot-check.
   THIS is the phase boundary -- operator-run.
5. **Phase-boundary verification** -- the 7 automated YES/NO probes +
   the non-negotiable F-D4a owned-row re-derive-safe fingerprint pair +
   `k_short_gib` byte-identical. Commit + halt. Do NOT proceed to
   Phase 4. Do NOT re-run the holistic gate.

## The resumable volume loop (the recipe that worked 26/26 so far)

Per batch (size by context budget -- 10 parallel sub-agents/batch was
clean; collect, two-stage review, persist, discard detail, repeat):

1. Generate the next N from the manifest filtered to verdict-IS-NULL
   (manifest order). One-liner pattern (worked this session):
   `python3` reads `phase3-ktx-manifest.json`, subtracts the
   `description_verdict IS NOT NULL` set from a `psql` query, takes the
   first N, dumps their packets to a temp file.
2. Dispatch N **Opus** sub-agents in ONE message
   (`subagent_type:"general-purpose"`, `model:"opus"`; concurrent,
   independent, no shared state). Each invokes the
   `describe-fill-synthesis` Skill on exactly its packet. Brief = the
   manifest packet ONLY + the per-finding reminders verbatim; the skill
   hard-codes the rubric/guards (do NOT re-explain them). Each returns
   one fenced ```json record (fields: project, knob, type, description,
   description_origin, description_anchor_version, description_provenance,
   description_verdict, description_confidence, description_reasoning,
   description_proposed) + the one-line halt.
3. Two-stage review the records; assemble into a batch records JSON
   under `output/describe-fill/` (gitignored). `python3 json.load`
   shape-check (10 records, all 11 D6Record fields, no extra keys,
   provenance is array-or-null never a string, project/type/origin/
   anchor/verdict correct). Then `--persist <batchfile> --dry-run`
   (expect persisted==N, errors==0, would-be fingerprint != current),
   then `--persist <batchfile>` (real). Verify `--status` advanced by N
   and `--fingerprint` == the dry-run value.
4. Approaching the smell zone -> wrap with an updated copy of THIS
   handoff (advance counts + fingerprint, keep the recipe + learnings).
   The DB is the source of truth; `--status` is the cursor; the loop is
   fully idempotent (C4/P3) so re-persisting an already-applied batch is
   safe.

### Batch-loop learnings (carry forward -- these are proven, use them)

- **Use the SHARPENED dispatch prompt** (batch 2 used it: 0
  re-dispatches vs batch 1's 4). Beyond the packet + per-finding
  reminders, state UPFRONT, verbatim:
  (a) "`description_provenance` MUST be a populated JS array (NEVER
  null, NEVER pre-stringified), each entry shaped exactly
  `{source_file, source_line:int, shipped_value:string|null,
  raw_comment:string|null}`, mirroring the calibration `10fav_go`/
  `10on10` precedent (CD_/CD_NODESC define line, cmd_t registration row,
  authoritative handler/mode-init site, cited companion/dispatcher)";
  (b) "verify EVERY source line by grepping the live tree at HEAD
  67253dc9 == anchor; do NOT reason line numbers from memory; the
  L1/manifest source_ref is byte-accurate at this anchor -- do NOT
  assert an off-by-one and do NOT fabricate a C2 conflict that does not
  exist (only a GENUINE meaning/polarity inversion gets a C2 note)";
  (c) "do NOT add a top-level `source_ref` field".
- **Two-stage review MUST independently grep-verify any subagent claim
  of a source-line discrepancy or C2 conflict BEFORE persisting.**
  Batch 1 precedent: a sub-agent fabricated a "L1 says 879 / live 880
  off-by-one" with a C2-style note for the D7 tail; `grep -n` disproved
  it (live IS 879, L1 IS 879, byte-exact). Accepting it would have
  persisted wrong provenance + a fabricated narrative misleading the D7
  operator tail. A sub-agent factual claim is a hypothesis until you
  grep/SQL it (CLAUDE.md verification discipline;
  `feedback_verify_dispatched_terminal_claims`).
- **An extraneous top-level `source_ref` key is HARMLESS** (the persist
  path only binds the 11 known D6Record fields; unknown keys are
  ignored). Strip it during batch assembly for calibration-shape
  consistency -- do NOT bounce a sub-agent just for that (mechanical
  cleanup, not a content defect).
- **Transcription fidelity matters at assembly.** The reasoning/raw_comment
  strings are long with embedded quotes; write the batch JSON, then
  `python3 json.load` it BEFORE `--persist` (a malformed file fails the
  whole batch). Re-emit `track %d\n`-style sequences as plain text in
  raw_comment to avoid JSON-escape ambiguity (the value-correctness
  lives in description/reasoning, raw_comment is evidence-trail prose).
- **Batch shape:** the manifest is ordered with the command bucket
  first; the `*fav_go` family (xfav_go spectator-slot, CD_NODESC) and
  the `*on*` UserMode presets (CD_ name-restatement -> _Xon X_um_init)
  are contiguous, homogeneous, fully source-legible -> clean 10-knob
  batches, all `synthesized|high`. Expect this through the command
  bucket; cvars (shipped_doc candidates, bot k_fbskill_* D8, residue)
  will be more heterogeneous -- watch for real C2 meaning-conflicts
  (the `k_noframechecks` polarity canary is a cvar, already calibrated)
  and genuine residue/hedge there.

## Critical rules (locked; carry verbatim from the executor prompt)

- D6 + D7 are **Opus 4.7 MAX, spec-locked (D7), not lowerable**. "cheap"
  = the in-invocation fast-affirm early exit, never a cheaper model.
- **F-C3c: never D6-dead-stamp a KTX entity** (suspect_pool_member
  FALSE arc-wide). Describe from source; not source-legible ->
  hedge/residue (never guess, never dead-stamp).
- **F-C2a/D10:** GENUINE meaning-conflicts (k_noframechecks-class
  polarity) -> source tiebreaker, C2-note in `description_reasoning`
  for the operator D7 tier-2 tail, NEVER auto-resolved, NEVER
  fabricated. Value-differences -> L3 candidate, NOT an L1 flag.
- **F-D9b:** the moment Phase 3 stamps a verdict on a `shipped_doc` row
  it is terminal-owned; the Phase-2 loader will NOT re-touch it.
- **F-D10c / F-C3b (boundary):** `sv_antilag` DUAL via Phase-4
  cross-reference source evidence only; do NOT create a KTX
  `sv_antilag` entity, do NOT extract the `dusty-*` fork, do NOT
  classify reachability.
- C1: residue is tracked + enumerated to the C1-outreach track, never
  importance-cut; M (260/358/7) is never lowered. The 11 config-drift
  non-resolvers are recorded + routed, never created (D9).
- P1-P5: Bun, append-only migrations + SCHEMA.md, main-tree commit-on-
  main (no PR/worktree; run git silently; commit ONLY this arc's files
  -- the pre-existing parallel-arc working-tree drift is NOT ours),
  ASCII only, JSONB as JS values (`tx.json`/`sql.json`).
- Verification discipline is highest priority: re-derive every
  load-bearing number/path via psql/grep/ls; a prior session's
  "verified" (including THIS doc) is a hypothesis -- the executor
  prompt + the live DB are the contract.

## First three actions (next terminal)

1. Open the Phase 3 executor prompt; invoke `arc-executor`;
   spot-re-verify the live anchors: M=260/358/7 via psql; `--status` ==
   **26 evaluated / 598 remaining**; `--fingerprint` ==
   **`87349f25a85a37b0c25e5529ea5600f5`**; `git log --oneline -6` shows
   `546610a2`/`54b27d0f`/`c8a17cd3`; F-D4a guard live (`IS DISTINCT
   FROM`, not `IN`). A mismatch means investigate, not proceed.
2. Resume the volume loop above with the SHARPENED dispatch prompt and
   the grep-verify-claims discipline: `--status` -> next batch of ~10
   Opus D6 sub-agents -> two-stage review (independently grep-verify any
   line/conflict claim) -> assemble + json.load shape-check -> `--persist
   --dry-run` -> `--persist` -> verify `--status`/`--fingerprint`
   advanced. Pace to the context budget; this is many terminals.
3. When all 624 are evaluated (`--status` 624/0 + k_short_gib intact),
   move to Task 3 (build + run the D7 tier-1 `gate()`), then Task 4
   (probe + harness + `--twice` + run report), then Task 5 (operator
   tail), then the phase-boundary block incl. the verbatim F-D4a
   re-derive-safe fingerprint pair. Halt with the structured status.

## When in doubt

The phase MD + decisions.md + review-findings.md + the executor prompt
are the contract; this doc is the verified-state shortcut. If this doc
and the live DB disagree, the live DB wins (re-derive). If a D6
sub-agent is unsure it must hedge/residue-route (never guess) -- that is
the designed behaviour, tracked not dropped (C1). A sub-agent factual
claim (line numbers, conflicts) is a hypothesis -- grep/SQL it before
persisting. Do not push D6/D7 (highest-judgment) work past the smell
zone -- wrap and hand off; one extra terminal is cheap, a degraded
shipped L1 description is not.
