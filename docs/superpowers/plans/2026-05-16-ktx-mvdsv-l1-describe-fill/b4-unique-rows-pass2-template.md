# KTX D7 B4 -- unique-rows Pass 2 template (one terminal per batch)

**Run this terminal on Opus 4.7, MAX reasoning.** Single terminal,
inline lean v2 work, ONE blind sample-verify subagent at the end.

Paste this whole file into a FRESH terminal. Change exactly ONE line:
`BATCH_ID` in Step 0. The six batch definitions (rows + shared-root
hypothesis) are encoded in the lookup table below. Everything else is
shared across the six terminals.

C4 non-negotiable: NO DB writes. NO L1 row mutated. Output is a B5
Stage-2 ledger per batch.

## What you are doing

V-pass Stage-1 flagged 96 rows. 27 already routed (fav_go cluster /
dead-CF_SPC_ADMIN cluster / midair_minheight cluster / 5 deferred). The
remaining 69 rows are classified by Pass 1 (Sonnet medium) at
`b4-unique-rows-triage-plan.md` into 6 defect-class batches. You own
ONE batch. You run lean v2 against it: source-of-truth understanding
inline (the batch's shared-root hypothesis V-passed up front), per-row
inline authoring under enforce-trace discipline, ONE blind sample-
verify subagent on the highest-variation row, ledger commit, report.

The 6 batches:

| BATCH_ID | Name | Size | Confidence |
|---|---|---|---|
| 1 | C-FIX flag/name inversion | 8 | MEDIUM |
| 2 | WI-2 access-class / permission errors | 7 | MEDIUM |
| 3 | C-FIX wrong mechanism/scope | 13 | MEDIUM |
| 4 | C-FIX specific-value / threshold contradiction | 19 | HYPOTHESIS-WEAK |
| 5 | C-NEAR-MISS engine-boundary untraceables | 5 | STRONG |
| 6 | C-NEAR-MISS scope/path untraceables | 17 | MEDIUM |

## Mandatory pre-reads (in order)

1. `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
   -- B1 method + canonical worked cases + the 2026-05-20 callee-follow
   amendment.
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-unique-rows-triage-plan.md`
   -- the 6-batch plan; YOUR batch's section is the seed input for
   Step 4.
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
   D7 Amendment 2026-05-19 (B4) -- the seeded re-synth contract.
4. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-midair-minheight.md`
   -- the lean v2 calibration; the ledger shape + the Step 8 report.
5. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-dead-spc-admin-cluster.md`
   -- prior cluster; the Init_cmds finding (B2's shared root is
   already V-passed there) + the dropquad rev=3 callee-follow case.

## Step 0 -- set your batch (the ONLY edit)

```
BATCH_ID = <1..6>      # which batch you are
```

Substitute the rest from the lookup table below.

```
case $BATCH_ID in
  1) BATCH_NAME="flag-name-inversion"
     BATCH_ROWS=(
       ktx:command:auto_pow
       ktx:command:autotrackktx
       ktx:command:dinfo
       ktx:command:dlist
       ktx:command:fill:frogbot:std
       ktx:cvar:k_ctf_hook
       ktx:cvar:k_vp_map
       ktx:info_key:*ml:userinfo
     )
     ;;
  2) BATCH_NAME="wi2-access-class"
     BATCH_ROWS=(
       ktx:command:forcebreak
       ktx:command:dmm4
       ktx:command:qizmo
       ktx:command:admin
       ktx:cvar:k_vp_admin
       ktx:cvar:k_vp_antilag
       ktx:cvar:lock_practice
     )
     ;;
  3) BATCH_NAME="wrong-mechanism-scope"
     BATCH_ROWS=(
       ktx:command:-scores
       ktx:command:commands
       ktx:command:effi
       ktx:command:fragsdown
       ktx:command:shownick
       ktx:command:summary:frogbot:editor
       ktx:command:togglequad:frogbot:std
       ktx:cvar:_k_coachteam1
       ktx:cvar:_k_coachteam2
       ktx:cvar:k_ctf_rune_bounce
       ktx:cvar:k_fbskill_wiggleframes
       ktx:cvar:k_freshteams_weapon_time
       ktx:cvar:k_hoonymode
     )
     ;;
  4) BATCH_NAME="specific-value-contradiction"
     BATCH_ROWS=(
       ktx:command:berzerk
       ktx:command:ctfbasedspawn
       ktx:command:handicap
       ktx:command:instagib_coilgun_kickback
       ktx:command:report
       ktx:command:rnd
       ktx:command:rpickup
       ktx:command:teleportcap
       ktx:cvar:_k_worldspawns
       ktx:cvar:k_btime
       ktx:cvar:k_cmd_fp_per
       ktx:cvar:k_ctf_based_spawn
       ktx:cvar:k_ctf_hookstyle
       ktx:cvar:k_entityfile
       ktx:cvar:k_fbskill_aim_pitch_multiplier
       ktx:cvar:k_matchless
       ktx:cvar:k_matchless_max_idle_time
       ktx:cvar:k_race_match
       ktx:cvar:k_socd
     )
     ;;
  5) BATCH_NAME="engine-boundary-untraceable"
     BATCH_ROWS=(
       ktx:command:info
       ktx:command:kinfo
       ktx:command:qlag
       ktx:cvar:k_allow_vwep
       ktx:cvar:k_spm_color_rgba
     )
     ;;
  6) BATCH_NAME="scope-path-untraceable"
     BATCH_ROWS=(
       ktx:command:fragsup
       ktx:command:health:frogbot:std
       ktx:command:infospec
       ktx:command:laststats
       ktx:command:lgcmode
       ktx:command:pickspawn
       ktx:command:prewar
       ktx:command:qenemy
       ktx:command:race_countdown_up
       ktx:command:removeitem
       ktx:command:socd
       ktx:command:uinfo
       ktx:cvar:k_clan_arena
       ktx:cvar:k_extralog
       ktx:cvar:k_fbskill_aim_lgpref
       ktx:cvar:k_pow_p
       ktx:cvar:k_spw
     )
     ;;
esac
LEDGER="docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-${BATCH_NAME}.md"
```

Create LEDGER with a header (batch id, batch name, oracle tag, member
count, pointer to triage plan section, lean v2 shape note). Then
proceed.

## Step 1 -- source oracle HARD GATE 1

```
[ -d /tmp/ktx-src-67253dc9/.git ] || git clone https://github.com/QW-Group/ktx.git /tmp/ktx-src-67253dc9
git -C /tmp/ktx-src-67253dc9 checkout 67253dc9ab4f643f1e6523a923a41caab9ea587f
git -C /tmp/ktx-src-67253dc9 describe --tags     # MUST print: 1.47-2-g67253dc
```

If the tag is wrong, STOP and report.

## Step 2 -- pull current L1 state for the batch (read-only)

```
ids_quoted=$(printf "'%s'," "${BATCH_ROWS[@]}")
ids_quoted="${ids_quoted%,}"
docker.exe exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -A -F $'\x1f' -t -c \
"SELECT canonical_id, name, type, coalesce(description,description_proposed), description_reasoning, description_origin, description_verdict, source_ref, anchor, description_provenance::text \
 FROM entities WHERE canonical_id IN ($ids_quoted);"
```

Save to `/tmp/b4-${BATCH_NAME}/l1_state.tsv`. Read-only.

## Step 3 -- extract V-pass seeds for the batch

```
mkdir -p /tmp/b4-${BATCH_NAME}
for id_full in "${BATCH_ROWS[@]}"; do
  src=$(grep -l "^### ${id_full}\$" docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-ledger-batch-*.md)
  safe=$(echo "$id_full" | tr ':/*' '___')
  awk -v id="### ${id_full}" '$0==id{f=1;next} /^### /{f=0} /^RESULT \|/{f=0} f' "$src" > "/tmp/b4-${BATCH_NAME}/seed_${safe}.md"
done
```

If any seed is missing, HALT and report. Each seed is the MANDATORY
anchor for its row's authoring (per decisions.md B4).

## Step 4 -- V-pass the shared root (read your batch's hypothesis)

Open `b4-unique-rows-triage-plan.md` and read YOUR batch's section
verbatim (`### Batch B<BATCH_ID> -- ...`). The "Shared-root hypothesis"
paragraph is your starting point. The "Hypothesis confidence" tag
tells you how much you can trust the starting point:

- **STRONG** (B5 only): the hypothesis is structurally tight. V-pass
  1 falsifiable claim from it against the source oracle as a sanity
  check, then proceed to Step 5.
- **MEDIUM** (B1, B2, B3, B6): the hypothesis is directionally right
  but may contain residue. V-pass 2-3 falsifiable claims from it +
  tree-wide grep for any source that mutates the cited shared
  field(s) (the Init_cmds-class lesson). If a claim fails, narrow
  the batch -- some rows may not share the root; mark them for
  per-row treatment in Step 5.
- **HYPOTHESIS-WEAK** (B4 only): the batch is shape-only with no
  shared code site. Skip the cluster-shared root V-pass entirely.
  Step 5 authors per-row using each row's own V-pass seed citation
  as the per-row anchor (no shared root to V-pass).

For non-WEAK batches, write the V-pass evidence inline at the top of
the LEDGER as a structural-fact block (compact: 2-4 claims + cited
file:line + verdict). The synth subagents in v1 had this as their
preamble; in lean v2 it's authored inline before any per-row work.

If a STRONG/MEDIUM hypothesis fails to V-pass entirely (the cited
shared field does not exist, or another source mutates it
contradictorily, or the hypothesis is structurally wrong), HALT and
escalate. The orchestrator's session-#8 Init_cmds precedent is the
canonical case -- a contested cluster-shared root halts before
authoring, never after.

## Step 5 -- per-row inline authoring (lean v2 core)

For each row in BATCH_ROWS, author a corrected description inline
(YOU the terminal, not a dispatched subagent). The shape:

- Read the row's V-pass seed (`/tmp/b4-${BATCH_NAME}/seed_<safe>.md`)
  + its current L1 state (from Step 2).
- Apply the B1 method (enforce-trace-discipline.md) to every clause
  you author. The V-pass seed's wrong-clause + enforcing-line citation
  is the MANDATORY anchor for the corrected version; every OTHER clause
  in your authored description must also enforce-trace to a located
  line (no new flavour-C in elaborations -- the v1 ELABORATION
  DISCIPLINE carried forward).
- For batches with a shared root (B1, B2, B3, B5, B6), use the Step-4
  V-passed root as a force-multiplier: the structural fact is
  established once, the per-row authoring describes the row's
  specific manifestation of it.
- For B4 (WEAK), each row's V-pass seed citation is the anchor; no
  shared force-multiplier; per-row work is the work.
- Callee-follow (per the 2026-05-20 enforce-trace-discipline.md
  amendment): if a clause cites a function-call-mediated effect,
  follow the call chain into the callee. Do NOT stop at the caller.
- If a row's seed is contested (you believe it's wrong), HALT and
  escalate. NEVER override or dismiss a seed in-terminal.

Per-row output goes into a working table. Final shape lands in the
LEDGER at Step 7.

## Step 6 -- sample blind verify (ONE subagent, ONE row, Opus 4.7 MAX)

Pick the row with the MOST per-row variation from the batch's shared
root (or, for B4, the row with the most-complex per-clause structure).
For B2 specifically: pick the row whose access-class clause is most
non-trivial (e.g., includes a runtime admin gate beyond CF_*_ADMIN).
For B5: pick the row whose engine-boundary clause is most
load-bearing.

Dispatch ONE blind verify subagent:

- **Model:** Opus 4.7, MAX reasoning.
- **Tool access:** read-only (Read, Grep, Bash for read-only ops).
- **Brief:** apply the V-pass method
  (`enforce-trace-discipline.md` -- including callee-follow) to the
  NEW description text. Verifier sees ONLY:
  - canonical_id,
  - NEW description text (no reasoning, no source_ref, no anchor),
  - source oracle path,
  - V-pass classification enum.
- Output: classification + per-clause table + one-line rationale.

If the sampled row returns TRACED-CLEAN, the batch's shared
understanding is considered sound; the OTHER rows are recorded after
YOUR inline self-check (apply the same enforce-trace method to each
remaining row's authored description -- do NOT skip; just do it
inline rather than dispatching).

If the sampled row returns C-NEAR-MISS / C-FIX / WI2-FIX, read the
verifier's table, sharpen, re-author the sampled row, re-dispatch the
verify. Bounded 3 attempts per sampled row. If still fails after 3,
HALT the batch + escalate the residue.

For B4 (no shared root): the sample-verify pick rotates -- choose a
DIFFERENT row each attempt, since per-row work is per-row. After
sample-verify on ~2 rows succeeds, inline self-check the remaining
~17.

## Step 7 -- per-row ledger append (LEAN B5 Stage-2 shape)

For each TRACED-CLEAN row in BATCH_ROWS, append to LEDGER:

```
B4-RESULT | <canonical_id> | TRACED-CLEAN | rev=<n> | seed-clause: <one-line> | new-clause: <one-line>
### <canonical_id>
- canonical_id: <id>
- prior L1 verdict: <description_verdict> (origin=<description_origin>)
- V-pass finding (seed): <wrong-clause + enforcing file:line>

- OLD description:
  > <verbatim>

- NEW description:
  > <verbatim>
- NEW description_reasoning (compact):
  > <2-4 sentences pointing at the per-clause enforce-trace; cite key file:line refs inline>
- NEW source_ref: <file:line>
- NEW anchor: <if any>
- NEW verdict: <D11>

- per-clause cites (inline list):
  - "<clause>" -> <file:line>
  - ...
- verify route: sample-verify (subagent) | inline-self-check
- verify verdict: TRACED-CLEAN (per-clause table at /tmp/b4-${BATCH_NAME}/sample_verify_<safe>.md if sampled)
- attempts: <n>
```

For HALT rows:

```
B4-RESULT | <canonical_id> | HALT-<reason> | rev=<n> | residue: <one-line>
### <canonical_id> (HALT)
- ... (last-attempt state + residue + what blocked convergence)
```

## Step 8 -- halt + report

When all rows in BATCH_ROWS are processed (converged or halted):

1. **Self-check the ledger:**
   ```
   grep -cE '^B4-RESULT \|' <LEDGER>     # MUST equal batch size
   grep -nE '^B4-RESULT \| .* \| HALT-' <LEDGER>
   ```
2. `git add` ONLY the LEDGER and commit:
   `docs(arc-ktx-mvdsv): B4 unique-rows batch B<BATCH_ID> (${BATCH_NAME}) -- <N> converged, <M> halted`
3. Report, verbatim shape:
   ```
   B4 UNIQUE-ROWS BATCH B<BATCH_ID> (<BATCH_NAME>) DONE -- <batch_size> rows
   CONVERGED-TRACED-CLEAN: <n>
   HALT-residue: <m>
   shared-root V-pass: PASSED | FAILED-narrowed | SKIPPED-B4-WEAK
   verify routes: sample-verify <count> | inline-self-check <count>
   sampled row: <id>
   sampled verifier verdict: TRACED-CLEAN
   per-row attempts avg: <a.b>
   token cost: <observed; informational, may be omitted if context compaction>
   ledger: b4-ledger-${BATCH_NAME}.md
   ```
4. **STOP.** No DB writes. No L1 row mutation.

## Constraints (C4 -- non-negotiable)

- Read-only on the L1 database. No `UPDATE`, no `INSERT`, no schema
  change.
- No file writes outside the batch LEDGER + `/tmp/b4-${BATCH_NAME}/`
  scratch.
- The V-pass seed is mandatory input per row; never overridden
  in-terminal. Contested seed -> HALT + escalate.
- Shared-root hypothesis V-pass (Step 4) must hold before authoring
  (Step 5) for non-WEAK batches. Failed V-pass -> HALT + escalate.
- ELABORATION DISCIPLINE + callee-follow from
  `enforce-trace-discipline.md` apply to every authored clause.
- Bounded retries: 3 attempts per sampled row. No convergence -> HALT
  row, escalate, move on.
- If the oracle tag is wrong or the DB is unreachable -- STOP and
  report.

## Cost expectations (for the operator's read of your report)

This template runs once per BATCH_ID. Expected per-batch cost:

- B5 (size 5, STRONG): ~70-100k. Mechanical engine-boundary work, low
  per-row cost. Sweet spot for the lean v2 fixed-cost amortization
  IF the strong hypothesis holds (which the Pass 1 plan estimates is
  likely).
- B2 (size 7, MEDIUM): ~80-110k. Shared root already V-passed in the
  dead-CF_SPC_ADMIN cluster -- Step 4 mostly confirms the prior
  finding extends to this batch's rows.
- B1 (size 8, MEDIUM with sub-group residue): ~90-120k. Sub-group A
  + B share roots from prior clusters; sub-group C may degrade to
  per-row treatment for some rows.
- B6 (size 17, MEDIUM): ~150-200k. Each row's scope-path trace is
  per-row work; shared methodology amortizes the discipline but not
  the per-row enforcing-line search.
- B3 (size 13, MEDIUM): ~130-170k. Similar shape to B6 with shorter
  row count.
- B4 (size 19, WEAK): ~200-270k. Explicit per-row work; lean v2
  saves on subagent dispatch but the per-row enforce-trace
  authoring is the real cost.

Total across all 6: ~720-970k for the 69-row long tail. Per-row
~10-14k. This is the lean v2 amortization sweet spot, in line with
the Pass 1 projection.
