# KTX D7 B4 -- fav_go cluster CALIBRATION handover prompt

**Run this terminal on Opus 4.7, MAX reasoning.** If this session is
not Opus, STOP and tell the operator -- D7 spec-locks the synth +
verify dial (B1/B3); degrades on weaker models.

Paste this whole file into a FRESH terminal. This is the B4 seeded
re-synth loop defined in `decisions.md` D7 Amendment 2026-05-19 (B4),
running on the fav_go calibration cluster (first of 6 systemic clusters
identified by the V-pass Stage-1 collation). Output is a B5 Stage-2
change-report ledger. **C4 (non-negotiable): NO DB writes. NO L1 row
mutated.** The ledger is the operator-gated input to a SEPARATE L1
update step that this terminal NEVER takes.

## What you are doing

V-pass Stage-1 identified 96 flagged rows in the synthesized KTX fleet
(`v-pass-stage-1-collation.md`); 14 collapse into the fav_go family --
one shared root defect across the per-slot consumers + their add/del
partners. You re-synthesize each of those 14 rows through the D6
`describe-fill-synthesis` skill with the V-pass finding as a mandatory
anchor seed, then verify each new description with an independent
**blind** V-pass sub-agent, then independently re-grep a sample at the
terminal level. You do NOT write to the database. You do NOT modify L1
rows. The operator decides afterward whether to apply your ledger to
L1.

This is the FIRST B4 cluster, run as CALIBRATION (V-pass batch-0
analogue). If the seeded re-synth loop has gaps, we want to find them
here before running 5 more clusters + ~65 unique rows.

## Mandatory pre-reads (in order)

1. `~/.claude/skills/describe-fill-synthesis/SKILL.md` -- the D6
   synthesis engine you dispatch per row.
2. `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
   -- the B1 method (mandatory for both synth + verify; same
   classification enum).
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-stage-1-collation.md`
   -- the cluster framing + the flagged set (the input).
4. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
   D7 Amendment 2026-05-19, B4 specifically -- the re-synth loop
   contract (seeded, full trace not patch, re-V-passed, operator-gated).

## The cluster -- 14 canonical_ids

```
CLUSTER = [
  'ktx:command:1fav_go',          # C-FIX
  'ktx:command:2fav_go',          # C-FIX
  'ktx:command:3fav_go',          # C-FIX
  'ktx:command:11fav_go',         # C-FIX
  'ktx:command:13fav_go',         # C-NEAR-MISS
  'ktx:command:15fav_go',         # C-FIX
  'ktx:command:16fav_go',         # C-FIX
  'ktx:command:18fav_go',         # C-FIX
  'ktx:command:20fav_go',         # C-FIX
  'ktx:command:fav_show',         # C-FIX
  'ktx:command:fav_add',          # WI2-FIX
  'ktx:command:fav_del',          # WI2-FIX
  'ktx:command:fav_all_del',      # WI2-FIX
  'ktx:command:fav_next',         # WI2-FIX
]
```

## Cluster-shared root context (the seed PREAMBLE for every row)

ESTABLISHED at the source oracle 1.47-2-g67253dc by orchestrator
re-grep across batches 01 (20fav_go), 08 (3fav_go), and the per-row
V-pass findings:

- `favN_add` for N=1..20 (registered via `DEF(favx_add)` at
  commands.c:842-865) is the per-slot populator. It writes
  `self->favx[N-1]` -- commands.c:5732
  `self->favx[(int)fav_num - 1] = diff;`.
- `Nfav_go` for N=1..20 (registered via `DEF(xfav_go)` at
  commands.c:866-885) is the per-slot consumer. It READS
  `self->favx[N-1]` -- commands.c:5831
  `pl_num = self->favx[(int)fav_num - 1];`.
- The GENERIC `fav_add` (commands.c:886 -- distinct from favN_add!)
  writes a DIFFERENT array, `self->fav[]` -- commands.c:5613
  `self->fav[(int)fav_num - 1] = diff;`. That array is consumed by
  `fav_next` (commands.c:5793 `pl_num = self->fav[fav_num - 1];`),
  NOT by Nfav_go.
- No command literally named "Nfav_add" (digit-first) exists; the
  populator name pattern is `favN_add` (digit-last after the prefix).
- WI-2 cohort (fav_add, fav_del, fav_all_del, fav_next): the
  CF_MATCHLESS flag is ADDITIVE permission ("also valid in matchless
  mode"), NOT a match-block. Any "not during a match" / "blocked
  during matches" clause on these commands is a flavour-C WI-2.

This shared context is a MANDATORY input to every per-row D6
re-synth in this cluster -- include it verbatim in each synth
sub-agent's seed brief.

## Step 0 -- identity + ledger init

```
CLUSTER_ID = "fav_go-calibration"
LEDGER = "docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-fav_go-calibration.md"
```

Create LEDGER with a header (cluster id, oracle tag, member count,
pointer to pre-reads + cluster-shared root above). Then proceed.

## Step 1 -- restore + verify source oracle (HARD GATE)

Identical to V-pass:

```
[ -d /tmp/ktx-src-67253dc9/.git ] || git clone https://github.com/QW-Group/ktx.git /tmp/ktx-src-67253dc9
git -C /tmp/ktx-src-67253dc9 checkout 67253dc9ab4f643f1e6523a923a41caab9ea587f
git -C /tmp/ktx-src-67253dc9 describe --tags     # MUST print: 1.47-2-g67253dc
```

If the tag is not exactly `1.47-2-g67253dc`, STOP and report.

## Step 2 -- pull current L1 state for the cluster (read-only)

DB: `docker.exe exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`
(post-reboot Docker is Windows-side; if `docker.exe` is absent use `docker`).

For each canonical_id in CLUSTER, fetch the current L1 row:

```
docker.exe exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -A -F $'\x1f' -t -c \
"SELECT canonical_id, name, type, coalesce(description,description_proposed), description_reasoning, description_origin, description_verdict, source_ref, anchor, description_provenance::text \
 FROM entities WHERE canonical_id IN ('ktx:command:1fav_go','ktx:command:2fav_go','ktx:command:3fav_go','ktx:command:11fav_go','ktx:command:13fav_go','ktx:command:15fav_go','ktx:command:16fav_go','ktx:command:18fav_go','ktx:command:20fav_go','ktx:command:fav_show','ktx:command:fav_add','ktx:command:fav_del','ktx:command:fav_all_del','ktx:command:fav_next');"
```

Save to `/tmp/b4-fav_go/l1_state.tsv`. Read-only fetch.

## Step 3 -- extract V-pass seed per row

The seed for each row is its canonical ### block in the V-pass batch
ledgers (per-clause table with the wrong-clause + enforcing
file:line). Auto-find which batch holds each:

```
for id in <CLUSTER>; do
  src=$(grep -l "^### $id$" docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-ledger-batch-*.md)
  awk -v id="### $id" '$0==id{f=1;next} /^### /{f=0} /^RESULT \|/{f=0} f' "$src" > "/tmp/b4-fav_go/seed_${id//[:\/]/_}.md"
done
```

Each seed block IS the MANDATORY per-row anchor input
(decisions.md B4: "SEEDED with the V-pass finding as a mandatory
input"). NEVER override or dismiss a seed in-terminal. If you
genuinely believe a seed is wrong, HALT and escalate the row to the
operator -- never proceed past a contested seed (this is the analogue
of batch-03's correct halt during V-pass).

## Step 4 -- per-row D6 re-synth (sub-agent, Opus 4.7 MAX)

For each canonical_id in CLUSTER, dispatch a synth sub-agent. Process
in waves of 5 rows in parallel (3 waves for 14 rows).

- **Model:** Opus 4.7, MAX reasoning effort (D7 spec-locked, B1; not
  a per-row choice).
- **Tool access:** read-only (Read, Grep, Bash for read-only ops, Skill
  for invoking describe-fill-synthesis). NO database writes, NO file
  writes outside the temp seed area.
- **Brief shape (per row):**
  ```
  Task: Re-synthesize the L1 description for <canonical_id> via the
  describe-fill-synthesis skill, addressing the V-pass finding seeded
  below. This is a B4 re-synth (decisions.md D7 Amendment 2026-05-19,
  B4) -- under the B1-strengthened enforce-trace discipline, every
  clause MUST trace to a line that ENFORCES it. Re-derive the WHOLE
  description (full trace, not a patch of the seeded clause alone) --
  a row flagged on one clause may carry a second untraced clause.

  Current L1 state (the description being corrected):
  <description, description_reasoning, source_ref, anchor, provenance from Step 2>

  V-pass finding (MANDATORY anchor -- the specific wrong clause + the
  enforcing file:line; do not override or dismiss):
  <the ### block from Step 3>

  Cluster-shared root context (the family-level defect understanding):
  <the cluster-shared root from this prompt's preamble>

  Source oracle: /tmp/ktx-src-67253dc9 @ 1.47-2-g67253dc.

  Output: a new D6 record per D11 (description / description_reasoning
  / source_ref / anchor / verdict). The new description MUST address
  the seeded wrong-clause directly with a corrected version that cites
  the enforcing line, and every other clause MUST trace clean.
  ```
- The sub-agent dispatches the `describe-fill-synthesis` skill (via
  Skill tool) on the canonical_id with the seed context above. The
  skill operates per its definition; this brief is the seed
  contract layered around it.

Collect the new D6 record per row.

## Step 5 -- per-row blind V-pass verify (DIFFERENT sub-agent, Opus 4.7 MAX)

This is the closure gate. For each row's new D6 record, dispatch a
SEPARATE sub-agent (NEVER the synth sub-agent) to re-V-pass the new
description:

- **Model:** Opus 4.7, MAX reasoning.
- **Tool access:** read-only.
- **Brief:** apply the V-pass method
  (`enforce-trace-discipline.md`) to the NEW description text. The
  verify sub-agent sees ONLY:
  - the canonical_id,
  - the NEW description text (no synth sub-agent reasoning, no
    description_reasoning field, no source_ref, no anchor),
  - the source oracle path,
  - the V-pass classification enum (TRACED-CLEAN / C-NEAR-MISS /
    C-FIX / WI2-FIX) + the per-clause table format.
- Output: classification + per-clause table (clause | file:line |
  verbatim snippet | MATCH / MISMATCH / UNTRACEABLE) + a one-line
  rationale.

**Blindness is structural** -- it defeats the "synth sub-agent
rationalizes its own re-synth" failure mode (analogous to V-pass
FAILURE-B). Do not include the synth sub-agent's per-clause table or
source_ref in the verify brief; the verify must independently locate
its own enforcing lines.

## Step 6 -- orchestrator HARD GATE 2 (per row, YOU do this)

After both sub-agents return for a row, YOU (the terminal) re-grep
independently:

- Pick 1-2 load-bearing clauses of the new description -- grep the
  source oracle for their cited enforcing line + confirm the line
  says what the description claims.
- Confirm the new description's correction directly addresses the
  V-pass seed's enforcing-line citation (i.e., the seeded wrong
  clause is fixed by tracing to the same line the seed identified
  or a defensibly related one).

If the orchestrator re-grep does NOT hold, the row is REJECTED.
Re-dispatch synth (with a sharpened brief toward DISCRIMINATION --
quote the enforcing line explicitly; cite the source verbatim).
**Do NOT** add an "avoid over-correcting" or "the original was
defensible" anti-flag brief -- that demonstrably backfires (V-pass
batch-03 Finding 2 / FAILURE-B). Bounded at **3 attempts per row**.
If no convergence by attempt 3, HALT that row (record the residue
+ skip to the next row + flag for operator review at the report).

## Step 7 -- per-row ledger append (B5 Stage-2 shape)

For each TRACED-CLEAN row, append to LEDGER:

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
- NEW description_reasoning:
  > <verbatim>
- NEW source_ref: <file:line>
- NEW anchor: <if any>
- NEW verdict: <D11>

- re-V (blind) verdict: TRACED-CLEAN
- re-V per-clause table:
  - "<clause>" -> <file:line> `<verbatim snippet>` -> MATCH
  - ...
- orchestrator HG2 re-grep: <load-bearing clauses confirmed>
- attempts: <n>
```

For HALT rows (no convergence in 3), append the residue:

```
B4-RESULT | <canonical_id> | HALT-<last-verdict> | rev=3 | residue: <one-line>
### <canonical_id> (HALT)
- ... (last attempt's record + the residue analysis + what blocked convergence)
```

## Step 8 -- halt + report (do NOT continue past this)

When all 14 rows are processed (converged or halted):

1. **Self-check the ledger:**
   ```
   grep -cE '^B4-RESULT \|' <LEDGER>     # MUST equal 14
   grep -nE '^B4-RESULT \| .* \| HALT-' <LEDGER>     # halted rows (may be 0)
   ```
2. `git add` ONLY the LEDGER and commit:
   `docs(arc-ktx-mvdsv): B4 fav_go calibration -- <N> converged, <M> halted`.
3. Report, verbatim shape:
   ```
   B4 FAV_GO CALIBRATION DONE -- 14 rows
   CONVERGED-TRACED-CLEAN: <n>
   HALT-residue: <m>
   waves: <total synth dispatches incl. re-dispatches>
   per-row attempts avg: <a.b>
   orch HG2 re-greps: <total, all held / N failed-then-rejected>
   ledger: b4-ledger-fav_go-calibration.md
   ```
4. **STOP.** No DB writes. No L1 row mutation. The cluster ledger is
   the input to the operator's SEPARATE L1 update step.

## Constraints (C4 -- non-negotiable)

- Read-only on the L1 database. No `UPDATE`, no `INSERT`, no schema change.
- No file writes outside the cluster LEDGER + `/tmp/b4-fav_go/`
  scratch files.
- The V-pass finding (seed) is MANDATORY input per row; never
  overridden in-terminal. Contested seed -> HALT + escalate.
- Synth and verify run as SEPARATE sub-agents. Verify is BLIND (sees
  only the new description text, not the synth's reasoning). Both at
  Opus 4.7 MAX.
- Re-dispatch sharpens TOWARD discrimination only (quote enforcing
  lines verbatim). NEVER an "avoid over-correcting" / "be defensible"
  anti-flag brief (V-pass batch-03 FAILURE-B).
- Bounded retries: 3 attempts per row. No convergence -> HALT that
  row, escalate, move on.
- If the oracle tag is wrong, the DB is unreachable, or a row's L1
  state is empty -- STOP and report, never improvise or guess.

## Calibration interpretation (for the operator's read of your report)

This is a calibration run. The result shape tells us whether to scale:

- **Convergence >= 90% (>= 13/14 TRACED-CLEAN):** the seeded re-synth
  loop works. Scale to the other 5 clusters + the ~65 unique rows
  under the same template (swap CLUSTER + shared root per run).
- **Convergence 70-90%:** the loop works but the prompt needs
  hardening based on whatever the HALT rows surfaced. Operator
  reviews the residue + decides on the prompt edit before scaling.
- **Convergence < 70%:** halt + redesign. Something structural is
  wrong (the seed isn't anchoring well, or the verify is over- or
  under-flagging the new descriptions, or the shared root is
  miscalibrated). Diagnose before any more clusters fire.

Halted rows are not failures -- they are the loop correctly refusing
to ship questionable corrections (analogous to V-pass batch-03's
halt). They surface methodology gaps for the operator.
