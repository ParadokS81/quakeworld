# Phase 3 executor resume handoff -- KTX source-synthesis (2026-05-17)

> **!!! STAGE B IS BUILT + PROVEN -- resume the THREE-way volume
> split !!!** The cat-2 index-twin lane + the cat-3 cohort-scaffold
> lane are built, PROVED end-to-end, and producing real persisted
> volume. The HARD proof gate (the load-bearing Stage-B risk) is RETIRED.
> The dated D6 amendment in
> `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
> still LOCKS + governs (read it in full + the Phase-3-MD RECON NOTE +
> the phase-3-executor-prompt.md "Augmentation 2026-05-17"). What is now
> DONE (do NOT rebuild):
>
> - **`--verify-binding` helper SHIPPED** (commit `2fd1421e`, tsc EXIT=0,
>   F-C5c non-vacuous). `bun scripts/describe-fill/synthesize-ktx.ts
>   --verify-binding <HandlerSymbol>` = the authoritative live cmd_t
>   DEF()-family binding table (manifest-consistency checked, keyed off
>   loader-lowercased `canonical_id` per F-D10b, case-insensitive).
>   `--verify-binding --cohort <namePrefix>` = the cat-3 classifier
>   (k_fbskill 0/38 fit -> MASS_REJECT). Read-only; no DB/no entity touch.
>   It is the ONLY new code; cat-2/cat-3 are executor-orchestrated
>   processes reusing the existing `--persist`/`--status`/`--fingerprint`.
> - **Cat-2 lane PROVEN + now run on 4 of 6 families** (ChangeDM prior;
>   xfav_go + favx_add + UserMode this session 2026-05-18). Recipe held
>   end-to-end every time: `--verify-binding` -> ONE Opus-4.7-MAX family
>   eval -> F-D6a grep-verify EVERY cited line at `67253dc9` (zero
>   fabrication across all 4 -- bar held) -> divergence-catch (planted/
>   natural false-twin EJECTED by the Opus eval AND mechanically every
>   time: ChangeDM `dm`, xfav_go `fav5_add`, favx_add bare `fav_add`,
>   UserMode `totmode`) -> shape-check -> `--persist --dry-run` ==
>   `--persist` (idempotent) -> cursor advanced by exactly the fitting
>   count. UserMode confirmed the meatier sub-case (per-preset `_um_init`
>   config, not pure slot-twins) still works in ONE eval.
> - **Cat-3 lane PROVEN on a 5-member k_fbskill slice (option b):** ONE
>   Opus-4.7-MAX shared-mechanism scaffold pass + 5 INDIVIDUAL,
>   mechanically-distinct source-grounded records (non-collapse verified;
>   D8 mechanism-only, L3 tuning routed OUT per member). F-D6a: ~20 line
>   claims across 6 source files byte-verified incl. the reactiontime
>   easy-mode `:231` vs `:180` divergence (flagged, not collapsed).
>   Persisted idempotently. cat-3 VOLUME must use the `--status` cursor
>   to skip the proven-done members (the proof-slice overlap was
>   one-time).
>
> The divergence-catch is a proven **CLASSIFIER, not only a safety net**.
> F-D6a (independently grep-verify any sub-agent line/handler/conflict
> claim BEFORE persist) applies per-member in ALL three lanes --
> concentrated, not relaxed (proven: zero fabrication across the prior
> batch-1 precedent AND all 4 cat-2 family proofs). The done laneable
> members are carried, NOT redone; `--status`/`--fingerprint` are the
> idempotent cursor.

Fresh-terminal resume for the **arc-executor** of Phase 3 of the
`2026-05-16-ktx-mvdsv-l1-describe-fill` arc. Machinery (Tasks 1 +
2-machinery) DONE + committed; the Stage-B lanes BUILT + PROVEN; the
**three-way D6 volume fan-out is IN PROGRESS** (71 / 624 evaluated as of
this wrap). This is NOT a fresh start and NOT blocked -- it is a clean
mid-loop budget wrap right after a strong cat-2 run (3 families,
+36 members, zero fabrication, all idempotent). Pick up the three-way
volume loop where `--status` says it is.

Open the Phase 3 executor prompt
(`docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-3-executor-prompt.md`)
and invoke the `arc-executor` skill first, exactly as a cold start
would. This doc is the augmentation layer ON TOP of that prompt -- it
records what is already verified + done so you do NOT re-derive it, plus
the exact resumable loop and the batch-loop learnings.

## Where things are (verified live 2026-05-18; re-verify, do not trust blind)

- **Pre-flight CLEAN. Phase 0/1/2 verified EXECUTED** against live
  source (re-verified this session): M denominators live = cvar **260**
  / command **358** / info_key **7** (psql, POST-Phase-0 did not churn);
  F-D4a owned-row guard LIVE in
  `scripts/load-knowledge/derive-entity-description.ts` -- phrased
  `description_origin IS DISTINCT FROM 'synthesized' AND ... IS DISTINCT
  FROM 'shipped_doc'` (NULL-safe, membership-alone). NOTE: a literal
  `grep "description_origin IN"` returns nothing -- the guard uses `IS
  DISTINCT FROM`, not `IN`; that is NOT "guard absent" (a recurring
  prior-session grep false alarm -- do not re-raise it).
- **Live denominators (POST-Phase-0, the C1 gate-shape):** cvar **260** /
  command **358** / info_key **7**. In-scope to fan = **624** (manifest
  excludes the idempotent Phase-1-terminal `k_short_gib`).
- **Anchor (live, stamp every synthesized KTX row):**
  `1.47-2-g67253dc` (ktx clone `git rev-parse --short=8 HEAD` ==
  `67253dc9`, `git describe --tags` == `1.47-2-g67253dc`; re-verified
  this session). Derived into the manifest packets; do not hardcode
  blind elsewhere.
- **Manifest:** `apps/qw-oracle/output/describe-fill/phase3-ktx-manifest.json`
  (gitignored per F-D11b), 624 entities each carrying the full
  self-contained brief packet + an 11-entry `config_drift_nonresolvers`
  section (D9 fill-not-create; no entity). Top-level keys:
  `generated_against` / `entities` / `config_drift_nonresolvers`.
- **F-C3c CONFIRMED live (Phase-0 artifact):** every KTX entity's
  `suspect_pool_member = FALSE`. NO KTX entity is ever dead-stamped --
  KTX commands described from source behaviour like any non-suspect knob.
- **F-D11c / F-D9b** carried as in the prior wrap (flat
  `structured_choices`, terminal-owned whole-record skip). Not exercised
  by the cat-2 command lanes this session (commands carry no
  structured_choices); will matter at the cvar bulk + cat-3.

## What is DONE + committed (do NOT rebuild)

- **Task 1 (assembler)** -- commit `546610a2`. The deterministic
  624-entity manifest.
- **Task 2 machinery (persist/status/fingerprint)** -- commit
  `54b27d0f`. `--persist <records.json> [--dry-run]` (idempotent UPSERT
  matched by **project+type+name** -- name == `entities.name`, see the
  NEW learning below; `tx.json` P2, fill-not-create, `k_short_gib`
  whole-skip F-D9b/D19, `--dry-run` rolls back); `--status` = the
  cross-terminal resume cursor; `--fingerprint` = idempotency/F-D4a
  baseline. **`gate()` (Task 3 D7 tier-1) is still a stub** -- the
  volume loop is Task-2-only; Task 3 runs AFTER all 624 are evaluated.
- **F-P3a fix** -- commit `c8a17cd3`. `computeFingerprint(exec)` is
  non-vacuous (committed == dry-run, proven every batch).
- **`--verify-binding` helper** -- commit `2fd1421e`.
- **Volume persisted to date (71 / 624 evaluated):**
  - Prior sessions: calibration (6) + batch-01/02 (20 cat-1 commands) +
    cat-2 ChangeDM (5) + cat-3 k_fbskill proof slice (net) -> 35.
  - **This session (cat-2, +36):** xfav_go `5fav_go..9fav_go` (5);
    favx_add `fav1_add..fav20_add` (20); UserMode `4on4 ffa ctf
    hoonymode blitz2v2 blitz4v4 4on4on4 XonX wipeout carena tot` (11).
    Records: `output/describe-fill/phase3-records-cat2-{xfav_go,favx_add,usermode}.json`
    (gitignored; re-runnable, idempotent). All `synthesized`, anchor
    stamped, F-D6a grep-verified zero-fabrication, divergence-catch
    proven each.

## Live cursor state at this wrap (re-verify first thing -- a mismatch means investigate)

- `--status`: **71 evaluated / 553 remaining** (command evaluated=63
  remaining=295; cvar evaluated=8 remaining=251; info_key evaluated=0
  remaining=7). `k_short_gib` terminal=true, counted-once (C4/D19/P3).
- `--fingerprint`: **`5c7e9c95784d9a3fdc03cbaa5299c406`**. Lineage this
  session (each step had dry-run == live fp; non-vacuous, F-P3a):
  `9a5a7eaa...` (prior wrap) -> `869c69c7...` (+xfav_go 5) ->
  `eeb1a83e...` (+favx_add 20) -> `242fd007...` (transient: usermode
  partial +10, the XonX knob-casing error) -> **`5c7e9c95...`** (after
  the XonX fix re-persist, +11 usermode net; idempotent re-persist of
  the 10 + the corrected 1, C4/P3 as designed).
- Evaluated command (63) = 22 prior cat-1 + ChangeDM 5 + xfav_go 5 +
  favx_add 20 + UserMode 11. Evaluated cvar (8) = unchanged from the
  prior wrap (3 prior cat-1 + the 5-member k_fbskill proof slice).
  info_key 0/7 untouched.
- `git log --oneline` should show `2fd1421e` on top of
  `546610a2`/`54b27d0f`/`c8a17cd3` + the handoff-doc/amendment commits.

## The remaining work (the bulk -- many terminals)

1. **cat-2 -- 2 families left (~12 members).** `TimeSet`
   (`DEF(TimeSet)`, `timeN` float 5.0f..30.0f, commands.c 763-768; 6
   remaining -- pure float index-twins, the simplest remaining family,
   xfav_go-class) and `ksound` (members `ksoundN` 1..6 but the SHARED
   HANDLER is `DEF(TeamSay)` -- use `--verify-binding TeamSay`,
   commands.c 770-775; 6 remaining). ChangeDM/xfav_go/favx_add/UserMode
   DONE (carried, idempotent).
2. **cat-3 -- k_fbskill cohort-scaffold (option b).** ~33 remaining
   (skip the proven-done via the `--status` cursor). Recipe unchanged
   (below).
3. **cat-1 bulk -- ~508 heterogeneous.** The proven per-knob loop +
   SHARPENED dispatch + grep-verify-claims. Manifest-ordered
   command-first, then cvars (incl. shipped_doc candidates + residue),
   then 7 info_keys.
4. **Then Task 3 (build + run the D7 tier-1 `gate()`), Task 4 (C5
   probe + harness + `--twice` + run report), Task 5 (operator tail),
   then the phase-boundary block** incl. the verbatim F-D4a
   re-derive-safe fingerprint pair + `k_short_gib` byte-identical.
   Halt; do NOT proceed to Phase 4; do NOT re-run the holistic gate.

## The proven cat-2 / cat-3 lane recipes (Stage B -- use these verbatim)

Both lanes PROVEN. They produce the SAME `D6Record` shape the cat-1
loop produces and feed the SAME `--persist`. Only new tool:
`--verify-binding`.

### Cat-2 index-twin family lane (PROVEN 4x: ChangeDM/xfav_go/favx_add/UserMode)

Remaining families + handler symbol:
- `TimeSet` (`DEF(TimeSet)`, `timeN` 5.0f..30.0f, commands.c 763-768;
  6 remaining)
- `ksound` (`DEF(TeamSay)`, members `ksoundN` 1..6, commands.c 770-775;
  6 remaining -- family handler is `TeamSay`, members are `ksoundN`;
  `--verify-binding TeamSay`)
- DONE: ChangeDM, xfav_go, favx_add, UserMode.

Per family: (1) `bun scripts/describe-fill/synthesize-ktx.ts
--verify-binding <Handler>` -> the live per-member table (canonical_id /
literal / line / manifest-consistency). Cross-ref `--status` for the
verdict-NULL subset (use an EXACT set intersection, NOT substring grep
-- `comm -12` of sorted exact id lists; substring matched
`ctf`->`ctfbasedspawn` / `4on4`->`4on4on4` this session). (2) Dispatch
ONE Opus (`subagent_type:"general-purpose"`, `model:"opus"`, MAX)
family-eval sub-agent -- the proven brief template: read the shared
`DEF(<Handler>)` body for the parameter axis; per-member literal ->
meaning; per-member self-contained `description`; the sharpened
provenance + F-D6a requirements verbatim; include a plausible adjacent
real-command-different-handler name as the planted false-twin so the
catch is exercised (ChangeDM `dm`/ShowDMM, xfav_go `fav5_add`/favx_add,
favx_add bare `fav_add`, UserMode `totmode`/ToggleToT all worked).
(3) **F-D6a two-stage review:** independently grep EVERY cited line at
`67253dc9` -- structural anchors AND the load-bearing config values
(for config-applying families like UserMode, spot-check the actual
asserted cvar values in the `_um_init`/handler body, not just that the
line exists; the wipeout-vs-carena distinguishing values were the
highest-risk check and were exact). Zero fabrication is the held bar.
(4) **Divergence-catch:** diff the Opus per-member list against the
`--verify-binding` table; any Opus-claimed member NOT in the live table
(or a different literal/handler) is EJECTED to cat-1, NOT
family-templated. (5) Expand fitting members -> one `D6Record` each.
(6) shape-check (python3 json.load + 11-field + provenance-array) ->
`--persist --dry-run` (persisted==N, errors==0, fp moves) ->
`--persist` -> `--status`/`--fingerprint` advanced by the fitting
count. Records file:
`output/describe-fill/phase3-records-cat2-<family>.json` (gitignored).

### Cat-3 cohort-scaffold lane (k_fbskill_*, option b; ~33 remaining)

(1) `--verify-binding --cohort k_fbskill` reconfirms `MASS_REJECT`
(0/38 fit) -- the classifier proof; never twin-collapse. (2) Take the
remaining-NULL k_fbskill members from `--status` (skip the proven done
-- the cursor is the source of truth). A sub-namespace slice
(`k_fbskill_aim_*`, `k_fbskill_vol_*`, other) per dispatch is clean.
(3) Dispatch ONE Opus (MAX) cohort-scaffold sub-agent: ONE
shared-mechanism pass (the frogbot skill-init -> `cvar(FB_CVAR_*)` ->
`self->fb.skill.*` -> AI read-site chain) THEN each member INDIVIDUALLY
source-grounded, mechanism-only (D8), NO semantic collapse, L3 tuning
routed OUT per member. (4) F-D6a grep-verify every macro/RegisterCvar/
skill-init/consumption/behaviour line at `67253dc9` (the slice proof
spanned 6 files, all byte-exact; the `:231` easy-mode divergence is
real -- flag, don't collapse). (5) shape-check (distinct descriptions
== no collapse) -> `--persist --dry-run` -> `--persist` -> verify
cursor.

### Three-way routing for the residue (cat-1)

Everything not a cat-2 `DEF()` family member and not `k_fbskill_*` is
cat-1: the proven per-knob loop, UNCHANGED. The manifest is ordered
command-first; `--status` lists remaining canonical_ids. When a
name-cluster looks twinnable, `--verify-binding <Handler>` decides:
FAMILY_OK -> cat-2; no shared `DEF()` / MASS_REJECT -> cat-1 or cat-3.

## Batch-loop learnings (carry forward -- proven, use them)

- **NEW 2026-05-18 -- mixed-case source names (load-bearing).**
  `--persist` matches each record to its entity by **project + type +
  `knob`**, where `knob` must equal the entity's `entities.name`
  column. The loader preserves SOURCE CASE in `entities.name` but
  lowercases `canonical_id` (F-D10b). So for a member whose source name
  is mixed-case (e.g. cmd_t `"XonX"`): `canonical_id` =
  `ktx:command:xonx` (lowercased) but `entities.name` = `XonX`, and the
  record's `knob` MUST be **`XonX`** (source case), NOT the lowercased
  canonical suffix. Setting `knob:"xonx"` -> `ERROR knob=xonx: entity
  not found (D9 fill-not-create)`. Symptom: a partial persist
  (`persisted: N-1, errors: 1`) where exactly the mixed-case member
  fails. Fix in-task: set that record's `knob` to the source-case
  entity name, re-persist (idempotent -- the already-persisted re-UPSERT
  identically, C4/P3). The `--verify-binding` table prints
  `ktx:command:xonx` (canonical, lowercased) -- to get the persist
  `knob` use `entities.name` (psql) or the manifest packet's `knob`
  field (it is `row.name`, source case). Watch every future family/
  cohort/cat-1 knob with upper-case letters in source.
- **Use the SHARPENED dispatch prompt** (verbatim, UPFRONT):
  (a) `description_provenance` MUST be a populated JS array (NEVER null,
  NEVER pre-stringified), each entry exactly `{source_file,
  source_line:int, shipped_value:string|null, raw_comment:string|null}`;
  (b) verify EVERY source line by grepping the live tree at HEAD
  `67253dc9` == anchor; do NOT reason line numbers from memory; do NOT
  assert an off-by-one and do NOT fabricate a C2 conflict that does not
  exist; (c) do NOT add a top-level `source_ref` field.
- **F-D6a two-stage review is the dispatcher's job and is
  non-negotiable.** A sub-agent factual claim (line numbers, handler
  identity, asserted config values, conflicts) is a HYPOTHESIS until
  grep/psql-verified. For config-applying families, verify the asserted
  cvar VALUES against the source body, not only that the cited line
  exists (CLAUDE.md verification discipline;
  `feedback_verify_dispatched_terminal_claims`). All 4 cat-2 proofs hit
  zero fabrication -- hold that bar; do not relax it under budget
  pressure (wrap instead).
- **Large subagent outputs persist to a file** (the favx_add 20-record
  output was 56KB -> tool-results file). Extract the ```json block with
  a small python3 reader + shape-check + write the records file in ONE
  step (keeps ~25k tokens out of context -- budget-efficient). For
  inline outputs, transcribe faithfully then `python3 json.load` before
  `--persist`.
- **Exact set intersection for "remaining members," never substring.**
  `comm -12` two sorted exact-id lists. Substring grep mis-matched
  `ctf`->`ctfbasedspawn`, `tot`->`totmode`, `4on4`->`4on4on4`,
  `2on2`->`2on2on2` this session.
- **Cat-2 covers meatier sub-cases too.** UserMode members are not pure
  slot-twins -- each preset applies a distinct `_um_init` config blob.
  Still ONE family eval (the family is the unit; per-member meaning
  enumerated within it -- D6 amendment). The terse CD strings ("FFA
  settings", "toggle wipeout", `....etc....` ditto-filler, CD_NODESC)
  are ALL "no genuine user description" per D5-amendment -> synthesize
  from behaviour, record the CD string as `shipped_value`.

## Critical rules (locked; carry verbatim from the executor prompt)

- D6 + D7 are **Opus 4.7 MAX, spec-locked (D7), not lowerable**. "cheap"
  = the in-invocation fast-affirm early exit, never a cheaper model. The
  cat-2 family eval IS Opus-4.7-MAX (the family is the unit).
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
- C1: residue is tracked + enumerated, never importance-cut; M
  (260/358/7) never lowered. The 11 config-drift non-resolvers are
  recorded + routed, never created (D9).
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
   **71 evaluated / 553 remaining** (command 63/295, cvar 8/251,
   info_key 0/7); `--fingerprint` ==
   **`5c7e9c95784d9a3fdc03cbaa5299c406`**; `git log --oneline` shows
   `2fd1421e` on top of `546610a2`/`54b27d0f`/`c8a17cd3`; F-D4a guard
   live (`IS DISTINCT FROM`, not `IN`); `bun
   scripts/describe-fill/synthesize-ktx.ts --verify-binding ChangeDM`
   prints FAMILY_OK. A mismatch means investigate, not proceed.
2. Resume the THREE-way volume split (use "The proven cat-2 / cat-3
   lane recipes" verbatim). Suggested order: finish cat-2 (TimeSet 6 ->
   ksound 6 via `--verify-binding TeamSay`, ~12 members, one Opus
   family-eval each) -> cat-3 cohort-scaffold (~33 remaining k_fbskill,
   skip done via the cursor) -> then the cat-1 bulk (~508
   heterogeneous, the proven per-knob loop + SHARPENED dispatch +
   grep-verify-claims). For EVERY lane: two-stage review + F-D6a
   grep-verify any line/handler/conflict/config-value claim BEFORE
   persist (zero fabrication is the held bar -- 4 cat-2 proofs clean),
   watch mixed-case knobs (the NEW learning), shape-check, `--persist
   --dry-run` -> `--persist`, verify `--status`/`--fingerprint`
   advanced. Pace to the context budget; this is still many terminals;
   wrap with an updated copy of THIS handoff at the smell zone (advance
   counts + fingerprint, keep the recipes + learnings).
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
claim (line numbers, conflicts, asserted config values) is a hypothesis
-- grep/SQL it before persisting. Do not push D6/D7 (highest-judgment)
work past the smell zone -- wrap and hand off; one extra terminal is
cheap, a degraded shipped L1 description is not.
