# KTX D7 V-pass -- per-batch handover prompt (template, F-V1/F-V2 hardened 2026-05-19)

**Run this terminal on Opus 4.7, MAX reasoning.** If this session is not
Opus, STOP and tell the operator -- HARD GATE 2 (Step 4) is per-clause
enforcement verification and degrades on weaker models; the D7 dial is
spec-locked (decisions.md D7 / B1-B3), not a per-run choice.

Paste this whole file into a FRESH terminal. Change exactly ONE line --
`BATCH_ID` in step 0. Everything else is identical across all terminals.
This is the B3 verification-shaped pass defined in `decisions.md` D7
Amendment 2026-05-19 (B1-B5). It is READ-ONLY: you CLASSIFY rows, you
NEVER edit a description, write the DB, or run a re-synth (B4 is a
separate operator-gated step).

## What you are doing

KTX Phase-3 ship-gate condition: every synthesized KTX row must pass a
clean per-clause enforcement re-trace before D7 tier-1 is retired (B2).
571 such rows (574 minus 3 canary controls) are partitioned into 9
disjoint batches by a deterministic `md5(canonical_id)` stride (F-V1 --
families spread across batches). You own ONE batch. You verify each
row's description against the source oracle clause-by-clause and emit a
classification. You do not fix anything.

## Mandatory pre-reads (read these THREE before tracing anything)

1. `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
   -- the full method (core rule, r42 anti-shortcut, WI-1/WI-2/PROC-1,
   the classification enum, the two canonical worked cases).
2. The ledger probe block: in
   `docs/superpowers/parking/2026-05-18-ktx-phase3-d7-operator-tail-ledger.md`,
   the section `## !!! FLAVOUR-C FLEET PROBE 2026-05-19 !!!` -- the
   validated prototype run + its two worked positives.
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-batch-00-calibration.md`
   -- the calibration findings (why F-V1 strided partition + F-V2
   structural canary exist; the `autotrack` false-negative worked
   example). Your output format is defined in Step 5 below.

## Step 0 -- set your batch (the ONLY edit)

```
BATCH_ID = <1..9>      # which terminal you are
```

Your slice (F-V1 -- deterministic STRIDED partition, NOT contiguous; a
contiguous slice clusters knob-families and skews the rate -- proven in
calibration). The Step-2 SQL assigns every row a bucket via
`md5(canonical_id)` and you get bucket `BATCH_ID - 1`. 9 buckets cover
all 571 V-pass rows (574 minus the 10 FIX knobs minus the 3 canary
controls), ~51-82 rows per bucket, families spread across buckets.
Nothing to compute -- just substitute `BATCH_ID` into the SQL. There is
no calibration carve-out: the strided scheme re-covers the whole
population (the earlier batch-0 was calibration-grade, not a ledger).

## Step 1 -- restore + verify the source oracle (HARD GATE)

The oracle MUST be byte-identical to the synthesis source or every trace
is meaningless.

```
[ -d /tmp/ktx-src-67253dc9/.git ] || git clone https://github.com/QW-Group/ktx.git /tmp/ktx-src-67253dc9
git -C /tmp/ktx-src-67253dc9 checkout 67253dc9ab4f643f1e6523a923a41caab9ea587f
git -C /tmp/ktx-src-67253dc9 describe --tags     # MUST print: 1.47-2-g67253dc
```

If `git describe --tags` is not exactly `1.47-2-g67253dc`, STOP and
report -- do not trace against a wrong tree.

## Step 2 -- pull YOUR batch (read-only)

DB: `docker.exe exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`
(post-reboot Docker is Windows-side; if `docker.exe` is absent use
`docker`). Substitute YOUR `BATCH_ID` (1..9) for the single `<BATCH_ID>`
literal. Do NOT change anything else in the SQL -- it is verified:

```
docker.exe exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -A -F $'\x1f' -t -c \
"SELECT canonical_id, name, type, coalesce(description,description_proposed) \
 FROM entities \
 WHERE project='ktx' AND description_origin='synthesized' AND description_verdict='synthesized' \
 AND name NOT IN ('dmm5','allow_toggle_practice','k_disallow_weapons','k_free_mode','votemap','k_overtime','k_highspeed','k_pow_pickup','timing_players_action','k_instagib') \
 AND canonical_id NOT IN ('ktx:command:autotrack','ktx:cvar:k_teamoverlay','ktx:cvar:k_yawnmode') \
 AND ((('x'||substr(md5(canonical_id),1,8))::bit(32)::bigint) % 9 + 9) % 9 = (<BATCH_ID> - 1) \
 ORDER BY canonical_id;"
```

Two exclusions, both load-bearing -- keep verbatim:
- `name NOT IN (...)` = the 10 FIX-queue knobs -> B4 re-synth, never
  V-pass.
- `canonical_id NOT IN ('ktx:command:autotrack','ktx:cvar:k_teamoverlay','ktx:cvar:k_yawnmode')`
  = the 3 F-V2 canary CONTROLS (their verdicts are already known; they
  are injected into your waves as controls in Step 4, never counted as
  batch rows).

The `md5(canonical_id) % 9` expression is the F-V1 strided partition
(validated: 571 rows, 9 buckets, ~51-82 each, no gaps).

## Step 3 -- the method (per row, per clause -- NON-NEGOTIABLE)

Full method = pre-read 1. The core, inlined so laziness has no excuse:

For EVERY semantic / threshold / polarity / scope / OFF-state /
side-effect clause in the row's description:

- `cd /tmp/ktx-src-67253dc9` and WIDE-grep the WHOLE `src/` tree for
  every use-site of the knob (registration + every read + every gated
  branch + any global it loads into). Do not stop at one site.
- Locate the line that ENFORCES that specific clause. Verify the
  clause's exact assertion (threshold value, polarity/direction, scope
  condition, restore-set, OFF-state behavior) against that line's actual
  code AND its adjacent comments. If deciding the clause needs a callee,
  read the callee.
- A cited, consistent-LOOKING line is NOT a pass (the r42 lesson). A
  clause that could only come from the knob name / an announce-or-redtext
  string / an enum name / a config comment, with no enforcing read-site,
  is flavour-C even if it happens to be true.
- **Callee-follow on call-chain-mediated clauses (2026-05-20, B4
  dead-CF_SPC_ADMIN cluster dropquad rev=3 finding).** If a clause
  asserts an effect that is enforced through a function call (caller
  invokes a helper that carries the actual gating logic), **follow the
  call chain into the callee before classifying**. The line in the
  caller that invokes the helper is NOT the enforcing line if the
  gating logic the clause asserts lives in the callee. The dropquad
  worked example (now also in `enforce-trace-discipline.md`): the
  caller `DropPowerups` plural gates on `dq`/`k_pow_q`/`Get_Powerups`;
  the callee `DropPowerup` singular at items.c:1874 carries the
  `match_in_progress != 2` live-match gate. A verifier that stops at
  the caller false-negatives the live-match clause as UNTRACEABLE
  even when the synth reasoning names the callee explicitly. Read the
  callee, classify against the callee's enforcing line.

Classify the row (exactly one):

- `TRACED-CLEAN` -- every material clause maps to a located, verified
  enforcing line (incl. adjacent comments); still-true minor vagueness
  that was traceable is OK.
- `C-NEAR-MISS` -- essentially correct but >=1 clause is only
  name/enum/string/comment inference (no enforcing line, or real code
  narrower/more conditional than implied). flavour-C-positive.
- `C-FIX` -- >=1 clause WRONG vs its enforcing line. flavour-C-positive
  + defect.
- `WI2-FIX` -- core behavior fine, a metadata clause (default value, or
  admin/player/spectator class) wrong (WI-2). Reported separately, not
  counted flavour-C. A row can be flavour-C-positive AND carry a WI-2
  note.

## Step 4 -- execution: parallel sub-agents + F-V2 structural canary (HARD GATE)

Do NOT trace ~60 rows serially in this terminal, and do NOT trust
sub-agents blindly. Calibration PROVED a sub-agent will false-negative a
ground-truth defect under the full prompt (the `autotrack` canary fired:
a known C-FIX returned TRACED-CLEAN). The canary + re-grep below are not
advisory -- they are the only thing that keeps the scaled run honest.

- Dispatch read-only general-purpose sub-agents at model `opus`, **MAX
  reasoning effort** (the D7 spec-locked dial -- B1/B3; NOT a per-run
  choice; calibration proved even Opus false-negatives the invisible
  class, so Opus-MAX is the floor, never lower), in
  waves. Each wave = ~5 of YOUR batch rows PLUS exactly 1 injected
  CANARY row (6 rows total). The sub-agent is NOT told which row is the
  canary -- it classifies all 6 identically with the Step-3 method and
  returns the per-row classification + per-clause table (clause |
  file:line | verbatim snippet | MATCH/MISMATCH/UNTRACEABLE) +
  one-line rationale.
- **Canary pool (rotate one per wave; expected verdicts are GROUND
  TRUTH, established by probe + orchestrator re-grep):**
  - `ktx:command:autotrack` -> expected **C-FIX** ("allowed only outside
    a live match" is a CF_MATCHLESS name-inference; CF_MATCHLESS (1<<4)
    = valid FOR matchless, not matchless-only; no match_in_progress
    guard in the autotrack path).
  - `ktx:cvar:k_teamoverlay` -> expected **C-NEAR-MISS** ("not in duel"
    has no enforcing line on the team-info stream; the only `!isDuel()`
    is the `match.c:1639` settings-summary display string).
  - `ktx:cvar:k_yawnmode` -> expected **TRACED-CLEAN** (every
    quantitative clause -- axe 50/20 dmm3, shotgun 21/14, projectile
    1800/1000, backpack-drop, teleport-cap prereq -- maps to an
    enforcing line). This control catches a sub-agent that
    over-flags.
  Pull a canary's text with the same Step-2 SELECT but
  `WHERE canonical_id = '<canary id>'` (canaries are excluded from the
  batch population on purpose; here you add one back as a control).
- **HARD GATE 1 -- canary verdict.** If the wave's returned verdict for
  the injected canary != its expected verdict, the ENTIRE wave is
  REJECTED. Record nothing from it. Re-dispatch with a sharpened prompt
  (quote the canary's enforcing line). A wave only counts when its
  canary matches.
- **Re-dispatch discipline (batch-03 finding -- read before you
  re-dispatch a single wave).**
  1. The canaries are NOT equally hard. `k_teamoverlay` (C-NEAR-MISS) is
     the HARDEST -- it IS the exact invisible correct-by-accident class
     the V-pass exists to catch, so sub-agents WILL false-negative it as
     TRACED-CLEAN repeatedly. That is the canary doing its job. It is
     NOT evidence the ground truth is wrong. Canary ground truth is
     RATIFIED (decisions.md D7 / the probe + cross-batch
     orchestrator re-greps): NEVER amend it from inside a batch, and
     never let repeated `k_teamoverlay` GATE-1 failures spiral into a
     ground-truth-doubt loop. If you believe a canary verdict is wrong,
     HALT and escalate to the operator (as batch-03 correctly did) --
     do not override and do not loop.
  2. Sharpen the re-dispatch prompt TOWARD discrimination only: quote
     the canary's enforcing line and the specific clause that has NO
     enforcing line. Do NOT add a "do not over-flag / these are
     defensible generalizations" instruction -- it demonstrably
     backfires into systematic UNDER-flagging of genuine defects
     (batch-03 Finding 2: a false TRACED-CLEAN on an invisible defect is
     the single worst V-pass outcome). The `k_yawnmode` over-flag
     control already guards the over-flag direction; do not trade it
     for under-flagging.
  3. Bounded retries: if a wave's canary still fails GATE 1 after 2
     toward-discrimination re-dispatches, do NOT keep looping and do NOT
     switch briefs -- rotate that wave's canary to a different pool
     member and continue; the wave's batch rows still require the HARD
     GATE 2 orchestrator re-grep before they are recorded. Persistent
     GATE-1 failure across the whole batch -> HALT + escalate, never
     ship.
- **HARD GATE 2 -- orchestrator re-grep.** Independently of the canary,
  for every accepted wave YOU re-grep the oracle for >=1 flagged row's
  wrong-clause enforcing line AND >=1 TRACED-CLEAN row's most
  load-bearing clause. If either does not hold, the wave is REJECTED and
  re-dispatched. This is a gate, not a sample.
- Strip the canary row from recorded output: it is a control, never a
  batch row, never counted in your N or your flavour-C tally.

## Step 5 -- output contract (B5; machine-collatable)

Append to `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-ledger-batch-<NN>.md`
(`<NN>` = your BATCH_ID, zero-padded: batch 1 -> `v-pass-ledger-batch-01.md`).
Per row, EXACTLY this shape (canary rows excluded -- controls only):

```
RESULT | <canonical_id> | <CLASSIFICATION> | flavourC=<0|1> | wi2=<0|1> | clauses=<n> | <one-line rationale>
### <canonical_id>
- "<clause>" -> <file:line> `<verbatim snippet>` -> MATCH|MISMATCH(<why>)|UNTRACEABLE(<what is missing>)
- ... (one per material clause)
WI-2: <n/a | result>
```

The `RESULT |` line is the machine spine (a later merge greps `^RESULT |`
across all batch files for the Stage-1 ledger index, the flagged set, and
the rate). The `###` block is the durable human detail. Both required.

## Step 6 -- halt + report (do NOT continue past this)

1. **Canary-strip self-check (HARD -- batch-01 leaked one; do NOT skip).**
   A canary is a CONTROL: it is never a recorded row. Before committing,
   verify your ledger body carries ZERO canary canonical_ids:
   ```
   grep -nE '^(RESULT \| |### )(ktx:command:autotrack|ktx:cvar:k_teamoverlay|ktx:cvar:k_yawnmode)\b' v-pass-ledger-batch-<NN>.md
   ```
   This MUST print nothing. If it prints any line, DELETE that `RESULT |`
   line AND its following `### <id>` detail block (through the line before
   the next `RESULT |`), then re-confirm `grep -c '^RESULT |'
   v-pass-ledger-batch-<NN>.md` equals your reported `<N>`. The canary
   verdicts still go in the prose wave headers (that is the GATE-1
   evidence) -- only the machine `RESULT |` + `### ` spine is canary-free.
2. `git add` ONLY your `v-pass-ledger-batch-<NN>.md` and commit:
   `docs(arc-ktx-mvdsv): D7 V-pass batch <NN> -- <N> rows, <F> flavour-C-positive, <W> WI2`.
3. Report, verbatim shape:
   ```
   V-PASS BATCH <NN> DONE -- <N> rows (canaries excluded from N)
   TRACED-CLEAN: <n>  C-NEAR-MISS: <n>  C-FIX: <n>  WI2-FIX: <n>
   flavour-C-positive: <F>/<N>
   flagged canonical_ids: <comma list, or none>
   waves: <total>  canary-rejected+redispatched: <count>
   spot-verify (HARD GATE 2): <rows re-grepped per wave, all held>
   canary-strip self-check: PASS (zero canary ids in RESULT/### spine)
   ```
4. STOP. Do not re-synth. Do not touch other batches. Do not edit any
   description or the DB. B4 (correcting the flagged rows) is a separate
   operator-gated step that consumes your ledger.

## Constraints (C4 -- non-negotiable)

Read-only. No DB writes. No description edits. No git beyond your one
batch file. If the oracle tag is wrong, or the DB is unreachable, or a
row's text is empty -- STOP and report, never improvise or guess.
