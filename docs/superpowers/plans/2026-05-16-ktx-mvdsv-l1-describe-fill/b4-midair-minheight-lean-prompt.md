# KTX D7 B4 -- midair_minheight cluster (LEAN v2 calibration)

**Run this terminal on Opus 4.7, MAX reasoning.** Single terminal,
inline work, NO per-row subagent dispatch. This is the **lean v2
calibration** -- the first cluster under a slimmer B4 model that
drops per-row Opus dispatch in favor of one inline understanding +
inline per-row authoring + one sample blind verify. If this shape
validates here, the remaining 2 small clusters + the ~65 unique-row
triage derive from this prompt.

Paste this whole file into a FRESH terminal. C4 non-negotiable: NO
DB writes, NO L1 row mutated. Output is a B5 Stage-2 ledger.

## What changed from v1 (read this first)

v1 (fav_go + dead-CF_SPC_ADMIN clusters): dispatched N synth Opus
subagents + N verify Opus subagents per cluster -- ~40-80k tokens per
cluster for ~6-14 rows. Operator critique 2026-05-20: for parametric
or near-parametric families the per-row dispatch is overkill -- the
EXPENSIVE work is the source-of-truth understanding (one read of
combat.c:660-700), not authoring N descriptions from it.

v2 (this prompt): ONE inline source-of-truth understanding +
per-row inline authoring + ONE sample blind verify (one subagent, one
row) + one orchestrator HG2 sample at receipt. Methodology gains
from v1 (cluster-root-is-hypothesis, ELABORATION DISCIPLINE,
callee-follow) are preserved -- they're caught at the inline
understanding step instead of by N parallel synth subagents.

## What you are doing

V-pass Stage-1 flagged 96 rows in the synthesized KTX fleet
(`v-pass-stage-1-collation.md`). Of those, 2 form the midair_minheight
cluster: a CMD that cycles a CVAR, both carrying clauses that
contradict the source's actual floor + medal-rank behavior. Shared
source-of-truth: the k_midair_minheight handling in combat.c:660-693
(per-tier height assignment + the runtime height-floor enforcement)
+ medal rank logic at combat.c:374-399 (computed INDEPENDENTLY from
the cvar, contradicting any tier->medal correspondence claim).

## Mandatory pre-reads (in order)

1. `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
   -- the B1 method (mandatory inline at understanding + authoring;
   the callee-follow 2026-05-20 amendment is in there).
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-stage-1-collation.md`
   -- cohort framing + the V-pass classification enum.
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
   D7 Amendment 2026-05-19, B4 specifically -- the seeded re-synth
   contract (the lean v2 honors B4 in spirit: seeded re-derivation,
   not blind second synthesis; the change is dispatch shape only).
4. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-dead-spc-admin-cluster.md`
   -- the prior cluster + the v1 methodology evidence (Init_cmds
   halt, dropquad rev=3 callee-follow). v2 inherits the discipline.

## The cluster -- 2 canonical_ids

```
CLUSTER = [
  'ktx:command:midair_minheight',     # C-FIX (batch-04)  threshold-contradiction
  'ktx:cvar:k_midair_minheight',      # C-FIX + WI-2 (batch-05)  medal-tier wrong + default wrong
]
```

## Step 0 -- identity + ledger init

```
CLUSTER_ID = "midair-minheight-lean-v2-calibration"
LEDGER = "docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-midair-minheight.md"
```

Create LEDGER with a header (cluster id, oracle tag, member count,
v2-shape note, pointer to pre-reads). Then proceed.

## Step 1 -- source oracle HARD GATE 1

```
[ -d /tmp/ktx-src-67253dc9/.git ] || git clone https://github.com/QW-Group/ktx.git /tmp/ktx-src-67253dc9
git -C /tmp/ktx-src-67253dc9 checkout 67253dc9ab4f643f1e6523a923a41caab9ea587f
git -C /tmp/ktx-src-67253dc9 describe --tags     # MUST print: 1.47-2-g67253dc
```

If the tag is wrong, STOP and report.

## Step 2 -- pull current L1 state (read-only)

```
docker.exe exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -A -F $'\x1f' -t -c \
"SELECT canonical_id, name, type, coalesce(description,description_proposed), description_reasoning, description_origin, description_verdict, source_ref, anchor, description_provenance::text \
 FROM entities WHERE canonical_id IN ('ktx:command:midair_minheight','ktx:cvar:k_midair_minheight');"
```

Save to `/tmp/b4-midair-minheight/l1_state.tsv`.

## Step 3 -- extract V-pass seeds for the cluster

```
mkdir -p /tmp/b4-midair-minheight
for id_full in ktx:command:midair_minheight ktx:cvar:k_midair_minheight; do
  src=$(grep -l "^### ${id_full}$" docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-ledger-batch-*.md)
  safe=$(echo "$id_full" | tr ':/' '__')
  awk -v id="### ${id_full}" '$0==id{f=1;next} /^### /{f=0} /^RESULT \|/{f=0} f' "$src" > "/tmp/b4-midair-minheight/seed_${safe}.md"
done
```

Each seed is the MANDATORY per-row anchor. If you genuinely believe a
seed is wrong, HALT and escalate to the operator (the v1 Init_cmds
precedent).

## Step 4 -- inline source-of-truth understanding (V-pass the shared root)

**This is the load-bearing step.** Read the seeds first, then derive
the cluster's source-of-truth understanding inline. State the
understanding as a small structural diagram + a list of falsifiable
claims, then V-pass each claim (chase to its enforcing line + grep
for any source that mutates the same field).

Claims to V-pass (minimum set; the seed will surface others):

1. **The k_midair_minheight value space is {0,1,2,3,4}** -- enforced
   by `bound(0, cvar("k_midair_minheight"), 4)` at commands.c:7567 +
   the `bound(0, ..., 4)` shape in the cmd's cycle increment.
2. **The 5-tier assignment table maps cvar value -> midair_minheight
   floor:** value 1=128, 2=256, 3=512, 4=1024, else (incl. 0)=64.
   Enforced at combat.c:660-683 (the if/else if/else chain).
3. **The floor is enforced as a damage-nullifier**: at
   combat.c:690-693 `if ((playerheight < midair_minheight) && rl_dmg)
   { take = 0; }`. So a "no minimum" claim is FALSE for tier 0 -- the
   floor is 64 (less than 45 also kills RL damage at combat.c:694-697
   but that is a different gate).
4. **Medal-rank labels (bronze/silver/gold/platinum) are computed
   INDEPENDENTLY of k_midair_minheight in MidairDamageBonus** at
   combat.c:374-399 via strict > on the actual `midheight` (frag
   height), with boundaries 256 / 512 / 1024. There is no enforcing
   line that maps k_midair_minheight tier value 1/2/3/4 to a medal
   label. 128 (the tier-1 floor) is NOT a medal boundary at all. Any
   description claiming "tier 1 = bronze" is name/string inference
   wrongly applied (the medal label comes from the cmd's broadcast
   `redtext("bronze")` at commands.c:7591 -- which is the CMD'S OWN
   broadcast string, NOT the medal-rank-computation logic).
5. **The registered default is k_midair_minheight = "1"** (= 128
   units), NOT 0/64. Verify at `RegisterCvarEx("k_midair_minheight",
   "1")` in src/world.c (V-pass seed says line 967).
6. **The whole block is gated on `if (midair)`** at combat.c:658,
   which is set from `cvar("k_midair")` at combat.c:527-529. So the
   "no effect unless k_midair on" clause MATCHes.

Tree-wide grep for any other source that writes `midair_minheight`
(the local variable) or that mutates `k_midair_minheight` (the cvar):

```
cd /tmp/ktx-src-67253dc9 && grep -rn 'midair_minheight\b' src/ | grep -v '^Binary'
```

Confirm: only the commands.c cycle + combat.c read sites. No other
mutators. Cluster-shared understanding holds.

If a claim fails to V-pass (no enforcing line / contradicted by a
hidden site / startup-init promotion / etc), STOP and surface to the
operator. The v1 Init_cmds finding is what this step exists to catch.

## Step 5 -- per-row corrected descriptions (inline authoring)

For each row in CLUSTER, author a corrected description that:
- Addresses the seeded wrong-clause directly (the V-pass finding's
  enforcing-line citation is mandatory in the reasoning).
- States the corrected behavior using the Step-4 shared understanding.
- Carries every other clause cleanly enforce-traced to its line
  (no new flavour-C in elaborations -- the v1 ELABORATION DISCIPLINE
  carried forward).

Authored inline -- you (the terminal) write each row's NEW
description directly, not via a dispatched subagent. Each row's draft
includes the per-clause source-ref citations as a compact inline list
(file:line per clause). The lean v2 record contract (Step 7) defines
the exact ledger shape.

If two rows share most clauses (they do -- both rows describe the
same runtime mechanism), authoring is faster by writing the shared
clauses once and varying only the per-row defect address (the cmd
focuses on the cycle behavior + the wrong "no minimum" / wrong
medal-tier; the cvar focuses on the value-space + the threshold +
the wrong-default WI-2). Do NOT mechanically copy-paste -- each row
must still read cleanly as a standalone L1 description.

## Step 6 -- sample blind verify (ONE subagent, ONE row, Opus 4.7 MAX)

Pick the row with the MOST per-row variation from the cluster-shared
root -- for this cluster that is `ktx:cvar:k_midair_minheight`
(carries both the C-FIX medal-tier correction AND the WI-2 default
correction, while the cmd carries only the C-FIX threshold-
contradiction correction). Dispatch ONE blind verify subagent:

- **Model:** Opus 4.7, MAX reasoning.
- **Tool access:** read-only.
- **Brief:** apply the V-pass method
  (`enforce-trace-discipline.md` -- including the 2026-05-20
  callee-follow amendment) to the NEW description text. The verifier
  sees ONLY:
  - the canonical_id,
  - the NEW description text (no reasoning, no source_ref, no anchor),
  - the source oracle path,
  - the V-pass classification enum.
- Output: classification + per-clause table (clause | file:line |
  verbatim snippet | MATCH / MISMATCH / UNTRACEABLE) + one-line
  rationale.

If the sampled row returns TRACED-CLEAN, the cluster's shared
understanding is considered sound; the OTHER row (cmd) is recorded
without an additional dispatched verify -- but YOU (the terminal)
must do a quick inline self-check of the cmd's description against
the same enforce-trace method (do not skip; just do it inline rather
than dispatching).

If the sampled row returns C-NEAR-MISS / C-FIX / WI2-FIX, the
cluster shared understanding has a residue. Read the verifier's
table, sharpen, re-author the sampled row, re-dispatch the verify.
Bounded 3 attempts.

If the cluster is too small to justify a sample (2 rows here = both
rows could be verified, costing a 2nd subagent), use orchestrator
judgment: 2-row clusters get sample-verify on the higher-variation
row + inline self-check on the other. 3+row clusters get sample-
verify on 1 row + inline on the rest. The principle: blind verify
catches synth self-rationalization, and ONE blind sample per cluster
defeats that failure mode without N parallel verify dispatches.

## Step 7 -- ledger append (LEAN B5 Stage-2 shape)

For each row in CLUSTER, append to LEDGER:

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
- verify verdict: TRACED-CLEAN (per-clause table at /tmp/b4-midair-minheight/sample_verify.md if sampled)
- attempts: <n>
```

Note the differences from v1 ledger shape: no per-row "re-V per-clause
table" expanded inline (compact source_ref list replaces it for
inline-self-check rows); the sampled row carries the full per-clause
table in a sidecar `/tmp/` file referenced from the ledger line.

For HALT rows (rare in lean v2; usually surfaces at Step 4 instead):

```
B4-RESULT | <canonical_id> | HALT-<reason> | rev=<n> | residue: <one-line>
### <canonical_id> (HALT)
- ... (last-attempt state + the residue + what blocked convergence)
```

## Step 8 -- halt + report (do NOT continue past this)

When both rows processed (converged or halted):

1. **Self-check the ledger:**
   ```
   grep -cE '^B4-RESULT \|' <LEDGER>     # MUST equal 2
   grep -nE '^B4-RESULT \| .* \| HALT-' <LEDGER>
   ```
2. `git add` ONLY the LEDGER and commit:
   `docs(arc-ktx-mvdsv): B4 midair_minheight cluster (lean v2 calibration) -- <N> converged, <M> halted`
3. Report, verbatim shape:
   ```
   B4 MIDAIR_MINHEIGHT (LEAN v2 CALIBRATION) DONE -- 2 rows
   CONVERGED-TRACED-CLEAN: <n>
   HALT-residue: <m>
   verify routes: sample-verify <count> | inline-self-check <count>
   sampled row: <id>
   sampled verifier verdict: TRACED-CLEAN
   per-row attempts avg: <a.b>
   token cost (compared to v1 estimate ~10-20k per row): <observed>
   ledger: b4-ledger-midair-minheight.md
   ```
4. **STOP.** No DB writes. No L1 row mutation.

## Constraints (C4 -- non-negotiable)

- Read-only on the L1 database. No `UPDATE`, no `INSERT`, no schema change.
- No file writes outside the LEDGER + `/tmp/b4-midair-minheight/` scratch.
- The V-pass finding (seed) is mandatory input per row; never overridden
  in-terminal. Contested seed -> HALT + escalate.
- Source-of-truth understanding (Step 4) must V-pass before authoring
  (Step 5). If a Step-4 claim fails to V-pass, HALT.
- Step-6 sample-verify subagent is BLIND (sees only the new description
  text, not the reasoning).
- ELABORATION DISCIPLINE + callee-follow from
  `enforce-trace-discipline.md` apply to every authored clause.
- Bounded retries: 3 attempts per row. No convergence -> HALT row,
  escalate, move on.
- If the oracle tag is wrong or the DB is unreachable -- STOP and
  report.

## Result interpretation (for the operator's read of your report)

Lean v2 calibration. Two questions the report answers:

- **Per-cluster cost** -- how many tokens did the cluster actually
  consume vs the v1 baseline (~40-80k for 6-14 rows). Goal: 5-15k for
  this 2-row cluster (~2.5-7.5k per row, vs ~5-7k per row v1 with
  parallel dispatch overhead). Significant savings come from skipping
  the per-row subagent fan-out.
- **Correctness equivalence** -- does the 1-sample blind verify catch
  the same class of defects as the v1 N-sample model? The Init_cmds
  precedent says: if the cluster-shared root is V-passed up front
  (Step 4), there is no per-row defect class N samples would catch
  that 1 sample misses. The risk would be a row-specific defect
  unique to ONE row; for parametric clusters that is structurally
  unlikely, but the inline self-check (Step 5/6) is the backup.

If convergence holds and cost meets the goal, the lean v2 shape
scales to the remaining 2 small clusters (k_on_end_f_* trio +
dmm1/dmm3 pair) and to the ~65 unique-row triage (where the same
inline-author-with-sample-verify pattern fits naturally, batched per
defect class). If convergence drops or a row-specific defect
escapes, fall back to v1 per-row dispatch for the remaining work.
