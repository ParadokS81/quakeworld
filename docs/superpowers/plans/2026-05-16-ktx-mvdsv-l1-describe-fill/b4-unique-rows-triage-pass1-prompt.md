# KTX D7 B4 -- unique-rows triage Pass 1 (classifier)

**Run this terminal on Sonnet 4.6, MEDIUM reasoning.** This is the Pass 1
classifier for the ~69 unique-row long tail of the B4 cohort. Pass 1
is mechanical-shape classification of already-existing V-pass seeds --
it does NOT do enforce-trace synthesis (that's Pass 2's Opus 4.7 MAX
work). Sonnet medium is sufficient and cheap; Opus is overkill here.

Paste this whole file into a FRESH terminal. C4 non-negotiable: NO DB
writes, NO L1 row mutated, NO V-pass seed mutated. Output is ONE markdown
doc: `b4-unique-rows-triage-plan.md`.

## What you are doing

V-pass Stage-1 flagged 96 rows. 27 already routed:
- fav_go cluster (14 rows, b4-ledger-fav_go-calibration.md)
- dead-CF_SPC_ADMIN cluster (6 rows, b4-ledger-dead-spc-admin-cluster.md)
- midair_minheight cluster (2 rows, b4-ledger-midair-minheight.md)
- Small clusters deferred (5 rows): k_on_end_f_modified / k_on_end_f_ruleset /
  k_on_end_f_version / dmm1 / dmm3

That leaves **69 rows in the unique-row long tail**. You read each row's
existing V-pass seed (the per-clause table the V-pass already produced),
classify the row by **defect-class shape**, and group into batches.

The output is a batching plan -- one batch per defect class, each with
a shared-root hypothesis. Pass 2 (Opus 4.7 MAX) then runs lean-v2
seeded re-synth per batch under the hypothesis. Lean v2's
amortization sweet spot is ~5-20 rows per batch; you target that.

You do NOT re-synthesize. You do NOT verify against source. You do NOT
amend any V-pass seed. You CLASSIFY existing seeds and GROUP rows.

## Mandatory pre-reads (in order)

1. `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
   -- the V-pass classification enum (TRACED-CLEAN / C-NEAR-MISS /
   C-FIX / WI2-FIX) + the canonical worked cases (autotrack flag-name
   inversion, k_teamoverlay correct-by-accident, dropquad callee-follow).
   These are the defect-class shape exemplars.
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-stage-1-collation.md`
   -- the full B4 cohort + the 6-cluster systemic-pattern list. The 3
   classes you'll see in seeds (C-FIX / C-NEAR-MISS / WI2-FIX) split
   further by sub-shape; see below.
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-fav_go-calibration.md`,
   `b4-ledger-dead-spc-admin-cluster.md`, `b4-ledger-midair-minheight.md`
   -- prior cluster ledgers. The "Methodology observations" + the
   per-row rejection-reason lines are concrete defect-class exemplars.
4. `decisions.md` D7 Amendment 2026-05-19 (B4) -- the seeded re-synth
   contract Pass 2 honors.

## The 69 rows (enumerated)

Use these canonical_ids verbatim. Source: `v-pass-stage-1-collation.md`
flagged sets minus the 27 already routed.

```
# C-FIX (41 rows)
ktx:command:-scores
ktx:command:auto_pow
ktx:command:autotrackktx
ktx:command:berzerk
ktx:command:commands
ktx:command:ctfbasedspawn
ktx:command:dinfo
ktx:command:dlist
ktx:command:effi
ktx:command:fill:frogbot:std
ktx:command:forcebreak
ktx:command:fragsdown
ktx:command:handicap
ktx:command:instagib_coilgun_kickback
ktx:command:report
ktx:command:rnd
ktx:command:rpickup
ktx:command:shownick
ktx:command:summary:frogbot:editor
ktx:command:teleportcap
ktx:command:togglequad:frogbot:std
ktx:cvar:_k_coachteam1
ktx:cvar:_k_coachteam2
ktx:cvar:_k_worldspawns
ktx:cvar:k_btime
ktx:cvar:k_cmd_fp_per
ktx:cvar:k_ctf_based_spawn
ktx:cvar:k_ctf_hook
ktx:cvar:k_ctf_hookstyle
ktx:cvar:k_ctf_rune_bounce
ktx:cvar:k_entityfile
ktx:cvar:k_fbskill_aim_pitch_multiplier
ktx:cvar:k_fbskill_wiggleframes
ktx:cvar:k_freshteams_weapon_time
ktx:cvar:k_hoonymode
ktx:cvar:k_matchless
ktx:cvar:k_matchless_max_idle_time
ktx:cvar:k_race_match
ktx:cvar:k_socd
ktx:cvar:k_vp_map
ktx:info_key:*ml:userinfo

# C-NEAR-MISS (26 rows)
ktx:command:admin
ktx:command:fragsup
ktx:command:health:frogbot:std
ktx:command:info
ktx:command:infospec
ktx:command:kinfo
ktx:command:laststats
ktx:command:lgcmode
ktx:command:pickspawn
ktx:command:prewar
ktx:command:qenemy
ktx:command:qlag
ktx:command:race_countdown_up
ktx:command:removeitem
ktx:command:socd
ktx:command:uinfo
ktx:cvar:k_allow_vwep
ktx:cvar:k_clan_arena
ktx:cvar:k_extralog
ktx:cvar:k_fbskill_aim_lgpref
ktx:cvar:k_pow_p
ktx:cvar:k_spm_color_rgba
ktx:cvar:k_spw
ktx:cvar:k_vp_admin
ktx:cvar:k_vp_antilag
ktx:cvar:lock_practice

# WI2-FIX (2 rows)
ktx:command:dmm4
ktx:command:qizmo
```

Verify count: 41 + 26 + 2 = 69. If the count differs after extraction,
STOP and report.

## Defect-class shapes to classify by

Expected sub-classes (you'll discover the actual mix in the seeds):

- **WI-2-admin-class.** Access-class clause overstates "admin only" or
  "spectator-admin" when the registered flags + Init_cmds promotion +
  any runtime admin gate produce a different access. Worked example:
  dead-CF_SPC_ADMIN cluster (droppack family). Likely candidates in
  this tail: `admin`, `k_vp_admin`, `lock_practice`, possibly more.
- **C-FIX flag-NAME inversion.** A flag's NAME implies a semantic
  direction that the flag's actual interpretation inverts. Worked
  example: STUFFCMD_IGNOREINDEMO (g_syscalls.h:57 says "do not put
  in mvd demo", not "ignore during demo playback"); CF_MATCHLESS
  additive permission read as match-block. Candidates: any clause
  citing a flag name without quoting its definition.
- **C-FIX threshold-contradiction.** A clause states an absence or a
  threshold value that the code's actual enforcing line contradicts.
  Worked example: midair_minheight "0 = no minimum" -> actually 64-unit
  floor. Likely candidates: any quantitative clause where the V-pass
  flagged the value/polarity.
- **C-FIX scope-narrowing or correct-by-accident.** Clause is true but
  enforced on a different code path than the feature's; or no enforcing
  line exists on the feature's own path. Worked example: k_teamoverlay
  "not in duel". Likely candidates: any clause flagged C-NEAR-MISS
  with "no enforcing line on feature's own path" in the V-pass note.
- **C-FIX callee-mediation.** Clause asserts an effect mediated by a
  function call; verifier stops at caller missing the callee's gate.
  Worked example: dropquad rev=3 (DropPowerups caller vs DropPowerup
  callee). Likely candidates: any clause whose seed cites a helper
  function or "drops on X" / "triggers Y" effect.
- **C-FIX command-name pattern inversion.** Description names a command
  with wrong syntax (digit-first vs digit-last, missing prefix, etc.).
  Worked example: fav_add attempt-1 "1fav_add..20fav_add" (registered
  pattern is fav1_add..fav20_add). Likely candidates: rows referencing
  command families in their description.
- **C-FIX default-value WI-2.** Stated default differs from the
  RegisterCvar(Ex) value. Worked example: k_midair_minheight "0 or
  unset = 64" (registered default = "1" -> 128).
- **C-NEAR-MISS untraceable scope/clause.** Clause is essentially
  correct but no enforcing line on the feature's own path; an
  adjacent-feature read coincidentally validates it.
- **Other.** Note any seed that doesn't fit the above; surface in
  your output for orchestrator review.

A single row may carry MULTIPLE sub-class tags (e.g., the cvar that's
both threshold-contradiction AND WI-2 default-value). Tag all that
apply.

## Step 0 -- identity + output init

```
OUTPUT = "docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-unique-rows-triage-plan.md"
```

Create OUTPUT with a header (one-liner explaining what it is, pointer
to this Pass 1 prompt, oracle tag from the prior ledgers
`1.47-2-g67253dc`, member count 69, the 27-row prior-routed table for
context).

## Step 1 -- extract all 69 V-pass seeds

```
mkdir -p /tmp/b4-triage-pass1
for id_full in $(grep -oE 'ktx:[a-z_]+:[a-zA-Z0-9_:*-]+' <<< "$ROWS"); do
  src=$(grep -l "^### ${id_full}$" docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-ledger-batch-*.md)
  if [ -z "$src" ]; then echo "NOT FOUND: $id_full"; continue; fi
  safe=$(echo "$id_full" | tr ':/*' '___')
  awk -v id="### ${id_full}" '$0==id{f=1;next} /^### /{f=0} /^RESULT \|/{f=0} f' "$src" > "/tmp/b4-triage-pass1/seed_${safe}.md"
done
```

(`$ROWS` = the full 69-row list from above.) Verify 69 seed files
landed. If any row's seed is NOT FOUND, surface to operator -- a
flagged row whose seed is missing is a data-integrity issue (it should
exist somewhere in the 9 V-pass ledgers).

## Step 2 -- classify each seed

For each of the 69 seed files, read the per-clause table + the
classification line + the WI-2 line, and assign 1-3 defect-class tags
from the list above. The classification is mechanical pattern matching
against the V-pass-already-produced evidence, not source synthesis.

Capture per row in a working table:

```
{canonical_id} | {primary_class} | {sub_class_tags} | {one-line seed-summary}
```

Example:
```
ktx:command:admin | C-NEAR-MISS | wi2-admin-class | "admin command claims spectator-only; actual access broader"
```

## Step 3 -- group into batches

Group the 69 rows by defect-class shape. Target batch size: 5-20 rows.
Rationale: lean v2's fixed overhead (~80-100k per terminal) amortizes
well at ~10+ rows, badly at <5. A batch of 5 hits ~20k/row; a batch
of 15 hits ~10-12k/row.

Rules:
- One batch per dominant defect class shape.
- If a class has >20 rows, sub-split by topic (e.g., "WI-2 admin-class
  in CTF cvars" vs "WI-2 admin-class in racing cvars") to keep
  per-batch context manageable.
- If a class has <5 rows, merge with a structurally-adjacent class
  (e.g., "default-value WI-2" merges with "threshold-contradiction"
  -- both are numerical mis-statements).
- Aim for 4-8 batches total. More batches = more fixed-cost overhead;
  fewer batches = harder context in each.

## Step 4 -- per-batch shared-root hypothesis

For each batch, write a 2-4 sentence shared-root hypothesis: what
structural feature of the KTX code do all rows in this batch
misread? The hypothesis is what Pass 2's Step 4 will V-pass before
authoring (the cluster-shared root V-pass per the dead-CF_SPC_ADMIN
Init_cmds finding). A hypothesis must be FALSIFIABLE -- a specific
claim about a specific code site that Pass 2 can chase.

Example shape:
> Batch B3: WI-2 admin-class misreads. Hypothesis: every row in this
> batch is registered with `CF_PLAYER | CF_SPC_ADMIN` (no
> CF_SPECTATOR) and is subject to the Init_cmds promotion at
> commands.c:1448 (CF_SPC_ADMIN -> CF_SPECTATOR at startup). Effective
> runtime access for each row: any in-game player + admin spectator;
> per-row variation is the runtime admin-gate (e.g., check_perm /
> k_allowcountchange) if any. Pass 2 V-passes the registration sites
> + Init_cmds + dispatch order for ONE row, then templates the rest.

If a batch's hypothesis is uncertain, flag it `HYPOTHESIS-WEAK` and
note what Pass 2 will need to verify first.

## Step 5 -- write OUTPUT

`b4-unique-rows-triage-plan.md` shape (one heading per batch):

```markdown
# B4 unique-rows triage plan (Pass 1 output)

Source: `b4-unique-rows-triage-pass1-prompt.md` (Pass 1 classifier).
Oracle: `1.47-2-g67253dc`. Member count: 69 rows. Batches: <N>.

## Prior routing (context only -- NOT in this plan's scope)

[27-row table: fav_go 14 / dead-CF_SPC_ADMIN 6 / midair_minheight 2 /
small clusters deferred 5]

## Batches

### Batch B1 -- <class shape name>

- Rows (<n>): `ktx:command:X`, `ktx:command:Y`, ... (full list)
- Shared-root hypothesis: <2-4 sentences, falsifiable>
- Hypothesis confidence: STRONG | MEDIUM | HYPOTHESIS-WEAK
- Pass 2 notes: <any per-row variation Pass 2 should attend to>

### Batch B2 -- <class shape name>
...

## Unclassified residue (if any)

[Rows that didn't fit cleanly into a batch; routed to operator review.]
```

## Step 6 -- halt + report

When OUTPUT is written:

1. **Self-check:**
   ```
   grep -cE '^### Batch B' <OUTPUT>   # equal to N (number of batches)
   wc -l <OUTPUT>                      # rough size
   # Sum of row counts across batches MUST equal 69
   ```
2. `git add` ONLY the OUTPUT and commit:
   `docs(arc-ktx-mvdsv): B4 unique-rows triage Pass 1 -- <N> batches, 69 rows classified`
3. Report, verbatim shape:
   ```
   B4 UNIQUE-ROWS TRIAGE PASS 1 DONE
   batches: <N>
   per-batch sizes: <list, e.g., 12/8/15/10/7/12/5>
   sum row count: 69
   hypothesis confidence: <STRONG count> STRONG / <MEDIUM> MEDIUM / <WEAK> WEAK
   unclassified residue: <count, may be 0>
   token cost: <observed>
   output: b4-unique-rows-triage-plan.md
   ```
4. **STOP.** Pass 2 prompts (one per batch, Opus 4.7 MAX, lean v2 shape)
   are drafted by the orchestrator from the triage plan; you do NOT
   write those.

## Constraints (C4 -- non-negotiable)

- Read-only across all files. NO writes outside OUTPUT + `/tmp/b4-triage-pass1/`.
- No source-oracle reads (you do NOT verify against KTX source -- Pass 2
  does that). Sonnet medium is sufficient because you're classifying
  already-produced V-pass evidence, not re-deriving truth.
- No edits to existing V-pass seeds, ledgers, or prompts.
- If any row's seed is NOT FOUND across the 9 V-pass ledgers, HALT
  and report -- do NOT improvise a classification.
- If a row's seed evidence does not fit any defect-class shape AND
  cannot be reasonably merged with another, route to "Unclassified
  residue" -- do NOT force-fit.

## Why Sonnet medium and not Opus

The classification work is mechanical pattern matching against
already-produced V-pass evidence. Opus's strength (synthesis under
uncertainty) is not needed -- the V-pass already located the wrong
clause and the enforcing line. Pass 1 just groups by shape.
Opus-MAX for this work would burn 5-10x the tokens for the same
outcome. Operator memory `feedback_model_effort_range` applies:
Sonnet medium floor for reasoning, Opus only where the work
genuinely needs it.

If a particular seed's classification is ambiguous and you need to
read source to disambiguate, surface to "Unclassified residue" with
a note -- DO NOT escalate yourself to Opus mid-Pass-1. The orchestrator
handles ambiguous residue in Pass 2 routing.
