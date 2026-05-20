# KTX D7 B4 -- dead-CF_SPC_ADMIN cluster handover prompt

**Run this terminal on Opus 4.7, MAX reasoning.** If this session is
not Opus, STOP and tell the operator -- D7 spec-locks the synth +
verify dial (B1/B3); degrades on weaker models.

Paste this whole file into a FRESH terminal. This is the B4 seeded
re-synth loop defined in `decisions.md` D7 Amendment 2026-05-19 (B4),
running on the dead-CF_SPC_ADMIN cluster (post-calibration cluster #2,
the structural-access-class systemic identified by the V-pass Stage-1
collation + Session #8 B4 receipt regrouping). Output is a B5 Stage-2
change-report ledger. **C4 (non-negotiable): NO DB writes. NO L1 row
mutated.** The ledger is the operator-gated input to a SEPARATE L1
update step that this terminal NEVER takes.

## What you are doing

V-pass Stage-1 identified 96 flagged rows in the synthesized KTX fleet
(`v-pass-stage-1-collation.md`). The dead-CF_SPC_ADMIN cluster is 6
rows that share an identical structural access-class defect at the
KTX command-table level. The fav_go calibration (`b4-ledger-fav_go-calibration.md`,
2026-05-20) validated the seeded re-synth loop end-to-end (14/14
TRACED-CLEAN, methodology hardened with the ELABORATION DISCIPLINE
addition below). This run applies that hardened template to the
dead-CF_SPC_ADMIN cluster.

You re-synthesize each of the 6 rows through the D6
`describe-fill-synthesis` skill with the V-pass finding as a mandatory
anchor seed, then verify each new description with an independent
**blind** V-pass sub-agent, then independently re-grep a sample at the
terminal level. You do NOT write to the database. You do NOT modify L1
rows. The operator decides afterward whether to apply your ledger to
L1.

## Mandatory pre-reads (in order)

1. `~/.claude/skills/describe-fill-synthesis/SKILL.md` -- the D6
   synthesis engine you dispatch per row.
2. `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
   -- the B1 method (mandatory for both synth + verify; same
   classification enum).
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-stage-1-collation.md`
   -- the cluster framing + the flagged set (the input). Read the
   Session #8 receipt addendum at the bottom for the dead-CF_SPC_ADMIN
   regrouping (3 rows moved here from the CF_MATCHLESS cohort).
4. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
   D7 Amendment 2026-05-19, B4 specifically -- the re-synth loop
   contract (seeded, full trace not patch, re-V-passed, operator-gated).
5. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-fav_go-calibration.md`
   -- the calibration's worked output; the ELABORATION DISCIPLINE
   below is the methodology gain from its Wave-2 attempt-1 failures.

## The cluster -- 6 canonical_ids

```
CLUSTER = [
  'ktx:command:droppack',         # WI2-FIX (batch-01)
  'ktx:command:dropquad',         # WI2-FIX (batch-09)
  'ktx:command:dropring',         # WI2-FIX (batch-05)
  'ktx:command:race_set_finish',  # WI2-FIX (batch-01)
  'ktx:command:upspecs',          # WI2-FIX (batch-01)
  'ktx:command:upplayers',        # WI2-FIX (batch-02)
]
```

## Cluster-shared root context (the seed PREAMBLE for every row)

ESTABLISHED at the source oracle 1.47-2-g67253dc by orchestrator
re-grep at Session #8 B4 calibration receipt (2026-05-20):

**The structural pattern (universal across all 6):** every row in this
cluster is registered with flags `CF_PLAYER | CF_SPC_ADMIN` and NO
`CF_SPECTATOR` bit. The DoCommand dispatch path at commands.c:1088-1100
checks the spec branch in this order:

```c
if (spc)                                          // commands.c:1088
{
    if (!(cmds[icmd].cf_flags & CF_SPECTATOR))    // commands.c:1091
    {
        return DO_WRONG_CLASS;                    // commands.c:1093
    }
    if ((cmds[icmd].cf_flags & CF_SPC_ADMIN) && !is_adm(self))   // 1096
    {
        ...
    }
}
```

For any command lacking `CF_SPECTATOR`, ALL spectators (including
admins) hit `DO_WRONG_CLASS` at line 1093 BEFORE the `CF_SPC_ADMIN`
check at line 1096 ever executes. **CF_SPC_ADMIN is structurally
dead** for the 6 cluster members. Any description claiming
"spectator-admin command" or "spectator admin" or analogous is a
WI-2-FIX -- the access class is player-only at the dispatch level.

**Registration sites:**

```
commands.c:741  { "dropquad",        ToggleDropQuad,    0, CF_PLAYER | CF_SPC_ADMIN, ... }
commands.c:742  { "dropring",        ToggleDropRing,    0, CF_PLAYER | CF_SPC_ADMIN, ... }
commands.c:743  { "droppack",        ToggleDropPack,    0, CF_PLAYER | CF_SPC_ADMIN, ... }
commands.c:980  { "upplayers",       DEF(upplayers),    1, CF_PLAYER | CF_SPC_ADMIN, ... }
commands.c:982  { "upspecs",         DEF(upplayers),    2, CF_PLAYER | CF_SPC_ADMIN, ... }
commands.c:1014 { "race_set_finish", DEF(r_Xset),       3, CF_PLAYER | CF_SPC_ADMIN, ... }
```

**Per-row runtime admin gate (variation -- trace each row's handler):**

- `upspecs` and `upplayers` BOTH dispatch through the shared `upplayers`
  handler and DO carry a runtime admin gate:
  `commands.c:8027 if (!check_perm(self, cvar("k_allowcountchange"))) { return; }`.
  So their actual access is "any player whose k_allowcountchange
  permission is granted" -- a runtime check, not a CF_*_ADMIN
  compile-time check.
- `droppack` / `dropquad` / `dropring` -- the V-pass seeds report NO
  runtime admin gate on the handler path (any in-game player toggles).
  Verify per row at the handler.
- `race_set_finish` -- the V-pass seed reports no admin gate (the
  race-mode check at race.c:2793 is a different gate); verify per row.

**Match-state clause (universal across all 6):** every row carries a
"refused while a match is in progress" or analogous clause in its
existing description. These clauses are TRUE and ENFORCED -- by
handler-internal `if (match_in_progress) return;` guards (the V-pass
seeds report MATCH on every such clause). Do NOT remove or hedge them.
The match-state semantics are NOT the WI-2 here -- this cluster is
NOT the CF_MATCHLESS additive-misread cohort (that cohort was
exhausted in the fav_go cluster). Keep match-state clauses; correct
the access-class clause.

This shared context is a MANDATORY input to every per-row D6
re-synth in this cluster -- include it verbatim in each synth
sub-agent's seed brief.

## ELABORATION DISCIPLINE (carried from fav_go calibration)

Every NEW clause you add beyond addressing the seed is itself a
flavour-C surface. Trace it the same way you trace the seeded clause.
Three recurring patterns surfaced in the fav_go Wave-2 attempt-1
failures and tend to recur:

1. **Flag-NAME inversions** (the autotrack canary class extends).
   A flag's name can semantically invert what it means. Before citing
   any flag, locate and quote its defining comment.
   Example from fav_go: `STUFFCMD_IGNOREINDEMO` reads as "ignore
   during demo playback" but g_syscalls.h:57 says `// do not put in
   mvd demo` (omit-from-MVD-recording, opposite direction).

2. **Callee-branch dead code.** A generic helper may carry a branch
   that is unreachable from a specific dispatch entry point. If a
   clause cites a generic-helper bounds check or guard, verify the
   dispatch path actually reaches it.
   Example from fav_go: the xfav_go bounds check at commands.c:5826
   is dead when fav_num is dispatch-hardwired to a literal in [1,20].
   For this cluster: the CF_SPC_ADMIN check at commands.c:1096 is
   ITSELF dead-code-from-this-dispatch-entry (the cluster-shared
   root above). Do not invert this: stating "CF_SPC_ADMIN gate
   permits admins" is wrong because the spec branch returns
   DO_WRONG_CLASS first.

3. **Command-name pattern inversions.** Use the cluster-shared root's
   EXACT registered names. Do not reconstruct from the cluster
   description; digit position and underscore placement matter.

If you add a new clause that is correct elaboration but unverified at
the source, drop it or hedge it. A correct unverified clause is
still flavour-C by definition.

## Step 0 -- identity + ledger init

```
CLUSTER_ID = "dead-spc-admin-cluster"
LEDGER = "docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-dead-spc-admin-cluster.md"
```

Create LEDGER with a header (cluster id, oracle tag, member count,
pointer to pre-reads + cluster-shared root + ELABORATION DISCIPLINE
above). Then proceed.

## Step 1 -- restore + verify source oracle (HARD GATE)

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
 FROM entities WHERE canonical_id IN ('ktx:command:droppack','ktx:command:dropquad','ktx:command:dropring','ktx:command:race_set_finish','ktx:command:upspecs','ktx:command:upplayers');"
```

Save to `/tmp/b4-dead-spc-admin/l1_state.tsv`. Read-only fetch.

## Step 3 -- extract V-pass seed per row

The seed for each row is its canonical ### block in the V-pass batch
ledgers (per-clause table with the wrong-clause + enforcing
file:line). Auto-find which batch holds each:

```
mkdir -p /tmp/b4-dead-spc-admin
for id in droppack dropquad dropring race_set_finish upspecs upplayers; do
  src=$(grep -l "^### ktx:command:$id$" docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-ledger-batch-*.md)
  awk -v id="### ktx:command:$id" '$0==id{f=1;next} /^### /{f=0} /^RESULT \|/{f=0} f' "$src" > "/tmp/b4-dead-spc-admin/seed_${id}.md"
done
```

Each seed block IS the MANDATORY per-row anchor input
(decisions.md B4: "SEEDED with the V-pass finding as a mandatory
input"). NEVER override or dismiss a seed in-terminal. If you
genuinely believe a seed is wrong, HALT and escalate the row to the
operator -- never proceed past a contested seed.

## Step 4 -- per-row D6 re-synth (sub-agent, Opus 4.7 MAX)

For each canonical_id in CLUSTER, dispatch a synth sub-agent. Process
in 2 waves of 3 rows in parallel.

- **Model:** Opus 4.7, MAX reasoning effort (D7 spec-locked, B1).
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

  ELABORATION DISCIPLINE (mandatory):
  <the ELABORATION DISCIPLINE section from this prompt's preamble>

  Source oracle: /tmp/ktx-src-67253dc9 @ 1.47-2-g67253dc.

  Output: a new D6 record per D11 (description / description_reasoning
  / source_ref / anchor / verdict). The new description MUST address
  the seeded wrong-clause directly with a corrected version that cites
  the enforcing line, and every other clause MUST trace clean. Per-row
  runtime admin gates vary: for upspecs/upplayers trace
  k_allowcountchange; for the others verify whether ANY runtime admin
  gate exists.
  ```
- The sub-agent dispatches the `describe-fill-synthesis` skill (via
  Skill tool) on the canonical_id with the seed context above.

Collect the new D6 record per row.

## Step 5 -- per-row blind V-pass verify (DIFFERENT sub-agent, Opus 4.7 MAX)

For each row's new D6 record, dispatch a SEPARATE sub-agent (NEVER the
synth sub-agent) to re-V-pass the new description:

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

Blindness is structural -- it defeats the synth sub-agent's
self-rationalisation failure mode (V-pass FAILURE-B analogue). Do not
include the synth sub-agent's per-clause table or source_ref in the
verify brief.

## Step 6 -- orchestrator HARD GATE 2 (per row, YOU do this)

After both sub-agents return for a row, YOU (the terminal) re-grep
independently:

- Pick 1-2 load-bearing clauses of the new description -- grep the
  source oracle for their cited enforcing line + confirm the line
  says what the description claims.
- For this cluster specifically: spot-check the access-class
  correction (does the new description correctly state player-only
  + flag the dead CF_SPC_ADMIN bit OR cite the runtime admin gate
  where one exists?).
- Confirm the new description's correction directly addresses the
  V-pass seed's enforcing-line citation.

If the orchestrator re-grep does NOT hold, the row is REJECTED.
Re-dispatch synth with a sharpened brief toward DISCRIMINATION
(quote the enforcing line explicitly; cite the source verbatim).
**Do NOT** add an "avoid over-correcting" or "the original was
defensible" anti-flag brief (V-pass FAILURE-B; fav_go Wave-2
discrimination-sharpened briefs are the model). Bounded at **3
attempts per row**. If no convergence by attempt 3, HALT that row
(record the residue + skip to the next row + flag for operator
review at the report).

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

When all 6 rows are processed (converged or halted):

1. **Self-check the ledger:**
   ```
   grep -cE '^B4-RESULT \|' <LEDGER>     # MUST equal 6
   grep -nE '^B4-RESULT \| .* \| HALT-' <LEDGER>     # halted rows (may be 0)
   ```
2. `git add` ONLY the LEDGER and commit:
   `docs(arc-ktx-mvdsv): B4 dead-CF_SPC_ADMIN cluster -- <N> converged, <M> halted`.
3. Report, verbatim shape:
   ```
   B4 DEAD-CF_SPC_ADMIN CLUSTER DONE -- 6 rows
   CONVERGED-TRACED-CLEAN: <n>
   HALT-residue: <m>
   waves: <total synth dispatches incl. re-dispatches>
   per-row attempts avg: <a.b>
   orch HG2 re-greps: <total, all held / N failed-then-rejected>
   ledger: b4-ledger-dead-spc-admin-cluster.md
   ```
4. **STOP.** No DB writes. No L1 row mutation.

## Constraints (C4 -- non-negotiable)

- Read-only on the L1 database. No `UPDATE`, no `INSERT`, no schema change.
- No file writes outside the cluster LEDGER + `/tmp/b4-dead-spc-admin/`
  scratch files.
- The V-pass finding (seed) is MANDATORY input per row; never
  overridden in-terminal. Contested seed -> HALT + escalate.
- Synth and verify run as SEPARATE sub-agents. Verify is BLIND. Both
  at Opus 4.7 MAX.
- Re-dispatch sharpens TOWARD discrimination only. NEVER an "avoid
  over-correcting" / "be defensible" anti-flag brief.
- Bounded retries: 3 attempts per row. No convergence -> HALT that
  row, escalate, move on.
- The ELABORATION DISCIPLINE applies to every NEW clause beyond the
  seed -- not just the seeded clause. The synth sub-agent must
  enforce-trace every elaboration.
- If the oracle tag is wrong, the DB is unreachable, or a row's L1
  state is empty -- STOP and report, never improvise or guess.

## Result interpretation (for the operator's read of your report)

Post-calibration cluster #2. The fav_go calibration validated the
loop end-to-end (100% convergence) and surfaced the synth-elaboration
flavour-C class (now named in ELABORATION DISCIPLINE above). Bar:

- **Convergence >= 5/6 (>= 83.3%):** loop holds under the hardened
  template; proceed to the remaining 4 small clusters (midair_minheight
  pair, k_on_end_f_* trio, dmm1/dmm3 pair) + the ~65 unique rows.
- **Convergence < 5/6:** something new surfaced. Operator reviews the
  HALT residue + decides whether to harden again or rethink.

Halted rows are not failures -- they are the loop correctly refusing
to ship questionable corrections. They surface methodology gaps for
the operator.
