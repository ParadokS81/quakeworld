# Phase 3 executor resume handoff -- KTX source-synthesis (2026-05-17)

> **!!! STAGE B DONE -- cat-2 AND cat-3 FULLY DRAINED. Only the
> uniform cat-1 per-knob loop (~508) + Task 3/4/5 + phase boundary
> remain !!!** The cat-2 index-twin lane (all 6 families) and the
> cat-3 k_fbskill cohort-scaffold lane (all 38) are 100% persisted,
> zero-fabrication, idempotent. The remaining 508 are EXACTLY the
> cat-1 heterogeneous bulk -- no more special lanes, just the proven
> per-knob loop (many terminals). The HARD proof gate is RETIRED.
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
> - **Cat-2 COMPLETE -- all 6 families persisted, idempotent.**
>   ChangeDM (prior); xfav_go + favx_add + UserMode (2026-05-18);
>   **TimeSet (6) + ksound (6) this session 2026-05-18b**. Recipe held
>   end-to-end every time: `--verify-binding` -> ONE Opus-4.7-MAX family
>   eval -> F-D6a grep-verify EVERY cited line at `67253dc9` (zero
>   fabrication across all 6 -- bar held) -> divergence-catch EJECTED a
>   planted false-twin every time (ChangeDM `dm`, xfav_go `fav5_add`,
>   favx_add bare `fav_add`, UserMode `totmode`, TimeSet `timeup`
>   ->DEF(TimeUp), ksound `tpmsg` ->TeamplayMessage) -> shape-check ->
>   `--persist --dry-run` == `--persist` -> cursor advanced by the exact
>   fitting count. ksound was the F-C3c canary (CD `// useless command
>   now` is coder-WHY; described the live TeamSay stuffcmd mechanism, no
>   dead-stamp -- regex-scanned clean).
> - **Cat-3 COMPLETE -- all 38 k_fbskill persisted, idempotent.** 5-member
>   proof slice (prior) + this session 2026-05-18b the remaining 33 in 3
>   cohort-scaffold slices: **aim_* (10) + vol_* (12) + misc (11)**, ONE
>   Opus-4.7-MAX shared-mechanism scaffold pass each + INDIVIDUAL
>   mechanically-distinct source-grounded records (anti-collapse verified
>   33/33 unique incl. every THRESHOLD vs its INCREASE twin; D8
>   mechanism-only, L3 tuning routed OUT). F-D6a byte-verified every
>   cited line at `67253dc9` across bot_botimp.c + up to 9 downstream
>   bot_*.c consumers; normal-vs-easy divergences (8 aim, distanceerror/
>   movement/combatjump) flagged-not-collapsed and spot-verified EXACT;
>   the `k_fbskill_use_rocketjumps` normal-mode asymmetry (no setSkill-
>   Attributes fset) verified as a real negative claim, not fabricated,
>   not dead-stamped.
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
- **Volume persisted to date (116 / 624 evaluated):**
  - Prior sessions -> 71 (calibration 6 + batch-01/02 20 cat-1 cmds +
    cat-2 ChangeDM 5 + xfav_go 5 + favx_add 20 + UserMode 11 + cat-3
    k_fbskill proof slice 5, net).
  - **This session 2026-05-18b (+45): cat-2 done + cat-3 done.** cat-2
    TimeSet `time5..time30` (6) + ksound `ksound1..ksound6` (6); cat-3
    k_fbskill aim_* (10) + vol_* (12) + misc (11). Records:
    `output/describe-fill/phase3-records-cat2-{timeset,ksound}.json` +
    `phase3-records-cat3-fbskill-{aim,vol,misc}.json` (gitignored;
    re-runnable, idempotent). All `synthesized`, anchor `1.47-2-g67253dc`
    stamped, F-D6a grep-verified zero-fabrication, divergence/anti-collapse
    proven each, dry-run==live fp every persist (F-P3a non-vacuous).

## Live cursor state at this wrap (re-verify first thing -- a mismatch means investigate)

- `--status`: **116 evaluated / 508 remaining** (command evaluated=75
  remaining=283; cvar evaluated=41 remaining=218; info_key evaluated=0
  remaining=7). `k_short_gib` terminal=true, counted-once (C4/D19/P3).
  The 508 remaining are 100% cat-1 (cat-2 + cat-3 fully drained).
- `--fingerprint`: **`3a7ac3e4c5425e3347802df115121dd0`**. Lineage this
  session (each step dry-run == live fp; non-vacuous, F-P3a):
  `5c7e9c95...` (prior wrap) -> `8e3b092a...` (+TimeSet 6) ->
  `dd89b6c9...` (+ksound 6) -> `09aa0bec...` (+cat-3 aim 10) ->
  `d91c27e7...` (+cat-3 vol 12) -> **`3a7ac3e4...`** (+cat-3 misc 11).
- Evaluated command (75) = 63 prior + cat-2 TimeSet 6 + ksound 6.
  Evaluated cvar (41) = 8 prior + cat-3 aim 10 + vol 12 + misc 11.
  info_key 0/7 untouched (all 7 are cat-1, remaining).
- `git log --oneline` should show `2fd1421e` on top of
  `546610a2`/`54b27d0f`/`c8a17cd3` + the handoff-doc/amendment commits
  (this wrap adds one more `docs(arc-ktx-mvdsv): Phase 3 ... volume
  wrap` commit -- the new git-immutable drift-check baseline below).

## The remaining work (cat-1 only -- the bulk, many terminals)

- **cat-2 DONE** (all 6 families) and **cat-3 DONE** (all 38 k_fbskill).
  Carried, idempotent -- the `--status`/`--fingerprint` cursor skips
  them. Do NOT re-run them.
1. **cat-1 bulk -- ~508 heterogeneous (508 = 283 command + 218 cvar +
   7 info_key).** The proven per-knob loop + SHARPENED dispatch +
   grep-verify-claims (calibration/batch-01/02 precedent). Manifest-
   ordered command-first, then cvars (incl. `shipped_doc` candidates +
   residue + the 11 config-drift non-resolvers, D9 fill-not-create),
   then the 7 info_keys. When a name-cluster looks twinnable,
   `--verify-binding <Handler>` still decides (FAMILY_OK -> a late cat-2
   family; MASS_REJECT/no shared DEF -> cat-1 or a cat-3 cohort) -- but
   the two big known cohorts are already drained, so expect almost all
   to be genuine cat-1 individuals.
2. **Then Task 3 (build + run the D7 tier-1 `gate()` -- still a stub),
   Task 4 (C5 probe + harness + `--twice` + run report), Task 5
   (operator tail), then the phase-boundary block** incl. the verbatim
   F-D4a re-derive-safe fingerprint pair + `k_short_gib` byte-identical.
   Halt; do NOT proceed to Phase 4; do NOT re-run the holistic gate.

## The proven cat-2 / cat-3 lane recipes (Stage B -- use these verbatim)

Both lanes PROVEN. They produce the SAME `D6Record` shape the cat-1
loop produces and feed the SAME `--persist`. Only new tool:
`--verify-binding`. **Run every lane under the "Execution efficiency
protocol" below** -- it is rigor-preserving (F-D6a / divergence-catch /
idempotency identical) and roughly doubles families-per-terminal by
removing context plumbing, not verification.

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

## Execution efficiency protocol (2026-05-18 -- DEFAULT next session; rigor-preserving)

Operator-directed (2026-05-18) after the cat-2 run showed the cost was
context PLUMBING, not rigor. These two changes roughly double
families-per-terminal. They remove ZERO verification steps. NOT a
`decisions.md`/spec change (D5/D6/D7/D8/F-D6a/C1 untouched); an
executor-process optimization recorded here (the executor's mutable
augmentation layer). Read this as "be equally rigorous for less
context," NOT "do less" -- if a step here ever feels like corner-cutting
you have mis-read it; the rigor invariants are spelled out so a future
executor can check them.

### 1. Sub-agent writes records to disk; dispatcher verifies WITHOUT ingesting prose

- The family/cohort/per-knob sub-agent WRITES its records JSON array to
  `output/describe-fill/phase3-records-<lane>-<name>.json` itself, and
  returns INLINE only a compact control summary: records written + path,
  verdict/confidence distribution, the divergence-catch verdict, and
  every hedged/residue member with its one-line reason. It still must
  NOT touch the DB and NOT commit (override the manifest packet's "do
  not write files" line FOR THIS records-file ONLY, in the brief --
  explicitly; the DB/commit prohibition stands; the assembler code is
  NOT changed). The dispatcher remains the sole F-D6a verifier and the
  sole `--persist` caller -- the single control point is intact.
- The dispatcher verifies the file WITHOUT reading the prose into
  context: `python3` extracts the `description_provenance[]`
  `(source_file,source_line)` set + runs the 11-field/array shape-check
  (never prints `description`/`description_reasoning`/`_proposed`); then
  `grep` independently confirms EVERY cited line at `67253dc9` (+
  spot-check the asserted config VALUES for config-applying families,
  e.g. the `_um_init` cvars -- as done for UserMode); the
  divergence-catch is mechanical (`--verify-binding`) and needs no
  prose. **F-D6a is unchanged: it only ever needed the cited
  `(file,line)` set + the live source tree, never the prose.** Proven
  this session on favx_add (56KB output -> file -> python-extract ->
  grep-verify, never ingested).
- **Prose-quality tripwire (the only thing the full ingest gave that
  this doesn't):** spot-read 2 RANDOM descriptions per batch (targeted
  `python3` print of just those `description` fields) for gross
  violations only -- a dead-stamped KTX command (F-C3c), a
  recommended/opinion value (D5/D8), or a bare name-restatement.
  Per-row prose quality is D7 tier-1's job (a SEPARATE spec-locked Opus
  re-check, Task 3) and the operator tail's (Task 5) -- the volume
  executor doing it for every row was redundant over-reach; the
  2-sample tripwire keeps a sanity net without the full ingest.

### 2. Tiered re-verification (cheap-verify the git-immutable, full-verify the live-mutable)

- **Live-mutable -> FULL re-verify every terminal (unchanged):** the DB
  `--status` cursor, `--fingerprint`, M=260/358/7, the anchor commit,
  the F-D4a guard presence. These silently drift; the 6 one-liners in
  "First three actions" stay mandatory.
- **Git-immutable -> cheap drift-check, deep-read only on drift:** the
  phase MD, `decisions.md`, `review-findings.md`, the executor prompt.
  These change ONLY via commits/working-tree edits, both detectable in
  ONE command: `git -C . log --oneline <handoff-commit>..HEAD --
  docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/ ` plus
  `git status --porcelain` over the same paths. (This handoff was
  committed at `89b9ffbf`; use that as `<handoff-commit>`.) BOTH empty
  -> the contract docs are byte-identical to what THIS handoff's author
  read; trust this doc's distilled critical-rules + recipes and do NOT
  re-read the 26k-token phase MD / decisions in full. ANY non-empty ->
  read the diff of the changed file(s) only. "Prior-verified is a
  hypothesis" is preserved -- it is re-verified, just by the cheaper
  equally-sound mechanism (git is the source of truth for git-tracked
  files; an unverifiable silent edit to a committed file cannot exist).
  This is the single biggest pre-flight token saving and removes no
  diligence that catches real drift.

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

1. Invoke `arc-executor`; read this handoff. Then run the TIERED
   re-verification ("Execution efficiency protocol" #2):
   (a) **git-immutable drift-check (cheap, do first):** `git -C
   /home/paradoks/projects/quakeworld log --oneline a21b76cd..HEAD --
   docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/` and
   `git status --porcelain docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/`.
   (`a21b76cd` = the `docs(arc-ktx-mvdsv): Phase 3 cat-2+cat-3
   volume wrap` commit that ships THIS updated handoff -- its own hash,
   filled in at the bottom of this doc + via `git log --oneline -1
   docs/superpowers/parking/2026-05-17-ktx-mvdsv-l1-describe-fill-phase3-executor-resume.md`.)
   BOTH empty -> the phase MD / decisions.md / review-findings /
   executor prompt are byte-identical to this handoff's basis: trust
   this doc's "Critical rules" + recipes, do NOT full-read the 26k phase
   MD / decisions. ANY non-empty -> read ONLY the changed file's diff.
   Still open + skim the executor prompt's "Augmentation 2026-05-17"
   (short) and the Phase-3-MD RECON NOTE for the three-way taxonomy
   framing if this is your first exposure.
   (b) **live-mutable full re-verify (mandatory, unchanged):**
   M=260/358/7 via psql; `--status` == **116 evaluated / 508 remaining**
   (command 75/283, cvar 41/218, info_key 0/7); `--fingerprint` ==
   **`3a7ac3e4c5425e3347802df115121dd0`**; `git log --oneline` shows
   `2fd1421e` on top of `546610a2`/`54b27d0f`/`c8a17cd3`; F-D4a guard
   live (`IS DISTINCT FROM`, not `IN`); `bun
   scripts/describe-fill/synthesize-ktx.ts --verify-binding ChangeDM`
   prints FAMILY_OK (machinery-health sanity only -- ChangeDM itself is
   already persisted; do NOT re-eval it). A mismatch in EITHER tier
   means investigate, not proceed.
2. Resume the **cat-1 bulk loop ONLY** -- cat-2 + cat-3 are DONE
   (carried by the cursor, do NOT re-run). Use the proven per-knob loop
   (calibration/batch-01/02 precedent) + the SHARPENED dispatch prompt +
   grep-verify-claims. Manifest-ordered command-first (283), then cvar
   (218 incl. shipped_doc candidates + residue + 11 config-drift
   non-resolvers, D9 fill-not-create), then 7 info_keys. The "proven
   cat-2 / cat-3 lane recipes" section stays below ONLY as a fallback if
   `--verify-binding` flags a late twinnable cluster (unlikely -- the
   two big cohorts are drained). For EVERY knob/batch: two-stage review +
   F-D6a grep-verify any line/handler/conflict/config-value claim BEFORE
   persist (zero fabrication is the held bar -- 6 cat-2 + 38 cat-3 +
   batch-1 precedent clean), watch mixed-case knobs (the NEW learning),
   shape-check, `--persist --dry-run` -> `--persist`, verify
   `--status`/`--fingerprint` advanced by the exact count. Pace to the
   context budget; this is still many terminals; wrap with an updated
   copy of THIS handoff at the smell zone (advance counts + fingerprint
   + git-immutable baseline commit, keep the recipes + learnings).
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

---

**This wrap committed at:** `a21b76cd` (the
`docs(arc-ktx-mvdsv): Phase 3 cat-2+cat-3 volume wrap` commit) -- the
git-immutable drift-check baseline used in "First three actions" (a).
A later wrap will supersede this with its own commit hash; cross-check
with `git -C /home/paradoks/projects/quakeworld log --oneline -1
docs/superpowers/parking/2026-05-17-ktx-mvdsv-l1-describe-fill-phase3-executor-resume.md`.
