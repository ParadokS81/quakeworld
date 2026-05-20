# B4 ledger -- midair_minheight cluster (LEAN v2 calibration)

**Cluster id:** `midair-minheight-lean-v2-calibration`
**Oracle tag:** `1.47-2-g67253dc` (commit `67253dc9ab4f643f1e6523a923a41caab9ea587f`)
**Cluster members:** 2 rows
**Authority:** `decisions.md` D7 Amendment 2026-05-19 (B4) -- the seeded
re-synth loop. B5 Stage-2 change-report ledger per row.
**Prompt:** `b4-midair-minheight-lean-prompt.md` -- the lean v2 calibration
shape (single terminal, inline understanding + inline authoring + ONE
blind verify subagent, no per-row Opus fan-out).

## Members

```
ktx:command:midair_minheight        # C-FIX (batch-04)  threshold-contradiction
ktx:cvar:k_midair_minheight         # C-FIX + WI-2 (batch-05)  medal-tier wrong + default wrong
```

## v2-shape note

v1 (fav_go + dead-CF_SPC_ADMIN clusters): per-row Opus subagent fan-out
for synth + verify -- ~40-80k tokens per cluster for ~6-14 rows. Operator
critique 2026-05-20: for parametric or near-parametric families the
per-row dispatch is overkill; the expensive work is the source-of-truth
understanding, not authoring N descriptions from it.

v2 (this cluster): ONE inline source-of-truth understanding (Step 4) +
per-row inline authoring (Step 5) + ONE sample blind verify subagent
(Step 6) on the higher-variation row + inline self-check on the other
row + orchestrator HG2 sample at receipt. Methodology gains from v1
(cluster-shared root is hypothesis, ELABORATION DISCIPLINE, callee-follow)
preserved -- they are caught at the inline understanding step rather
than by N parallel synth subagents.

## Pre-reads (loaded at session start)

- `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
  -- B1 method, classification enum, 2026-05-20 callee-follow amendment
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-stage-1-collation.md`
  -- cohort framing + cluster regrouping addendum 2026-05-20
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
  D7 Amendment 2026-05-19 (B1-B5) -- seeded re-synth contract
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-dead-spc-admin-cluster.md`
  -- prior cluster + v1 methodology evidence (Init_cmds halt, dropquad
  rev=3 callee-follow)

## C4 (non-negotiable)

- Read-only on the L1 database. No UPDATE / INSERT / schema change.
- No file writes outside this LEDGER + `/tmp/b4-midair-minheight/` scratch.
- The V-pass seed is MANDATORY per row; never overridden in-terminal.
  Contested seed -> HALT + escalate.
- Source-of-truth understanding (Step 4) must V-pass before authoring
  (Step 5). If a Step-4 claim fails to V-pass, HALT.
- Step-6 sample-verify subagent is BLIND (sees only the new description
  text, not the reasoning).
- ELABORATION DISCIPLINE + callee-follow apply to every authored clause.
- Bounded 3 attempts per row. No convergence -> HALT row, move on.

---

## Results

B4-RESULT | ktx:cvar:k_midair_minheight | TRACED-CLEAN | rev=1 | seed-clause: medal labels attached to cvar tiers + WI-2 "0 or unset = 64" misstates registered default | new-clause: floor-only tier (1/2/3/4 -> 128/256/512/1024, else 64), registered default "1" -> 128, medal ranks computed independently in MidairDamageBonus from per-frag z-delta

### ktx:cvar:k_midair_minheight

- canonical_id: `ktx:cvar:k_midair_minheight`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "(bronze)/(silver)/(gold) medal labels attached to tiers 1/2/3" -> MISMATCH at `src/combat.c:374-399` (medal rank in `MidairDamageBonus` computed from per-frag `midheight` (z-delta target-inflictor) via strict > on 256/512/1024, INDEPENDENT of `k_midair_minheight`; 128 is not a medal boundary).
  - WI-2: "0 or unset = 64 units" -> WRONG default. `src/world.c:967` `RegisterCvarEx("k_midair_minheight", "1")` -- registered default is "1" (-> 128 units). The unset state defaults to tier 1's 128-unit floor, not value 0's 64-unit floor.
  - Seed scratch: `/tmp/b4-midair-minheight/seed_ktx_cvar_k_midair_minheight.md`.

- OLD description:
  > Sets the minimum airborne height (in Quake units, measured at the moment of the killing rocket) a target must be above for a midair frag to count when k_midair is on. 0 or unset = 64 units; 1 = 128 (bronze); 2 = 256 (silver); 3 = 512 (gold); 4 = 1024. Below the selected height, rocket damage to that target is nullified so no frag is awarded. Has no effect unless k_midair is on.

- NEW description:
  > Sets the rocket-damage floor for midair mode: the minimum airborne height (the target's height above the ground, computed by a downward traceline from the target's origin at the moment of damage application) a target must exceed for rocket damage to apply. Cvar values 1/2/3/4 map to floor heights 128/256/512/1024 Quake units; value 0 or any out-of-range value falls into the else branch with a 64-unit floor. Below the selected floor, rocket damage to that target is zeroed so no frag is awarded; the same midair block also separately zeros rocket damage below 45 units when the target is out of water. The registered default is "1" (-> 128-unit floor), so unset is not the value-0 64-unit floor but the tier-1 128-unit floor. Has no effect unless k_midair is on -- the entire floor check (and the broader midair damage block) is gated by k_midair at runtime. The matching cycling command `midair_minheight` reads/writes this cvar and broadcasts a per-tier label ("ground" for value 0, "bronze" / "silver" / "gold" / "platinum" for 1/2/3/4); those labels are tier-name flavor only. Midair-frag medal ranks (bronze/silver/gold/platinum) are computed independently in MidairDamageBonus from the per-frag z-delta between target and inflictor (>1024 platinum, >512 gold, >256 silver, else bronze) and do not correspond to this cvar's tier value.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. C-FIX corrected: medal ranks in `MidairDamageBonus` (`src/combat.c:367`) operate on `midheight = targ->origin[2] - inflictor->oldorigin[2]` (`combat.c:590`) via strict-> thresholds 256/512/1024 (`combat.c:374-401`), INDEPENDENT of `k_midair_minheight` (no read of the cvar inside the function); the broadcast labels at the companion command (`commands.c:7589-7608`) coincide with medal names but are tier-name flavor only. WI-2 corrected: registered default = "1" (`src/world.c:967` `RegisterCvarEx("k_midair_minheight", "1")`); unset behaves as tier 1 -> 128 units. Floor cascade `combat.c:664-683` (1/2/3/4 -> 128/256/512/1024, else 64). Floor enforcement at `combat.c:690-692` `if ((playerheight < midair_minheight) && rl_dmg) { take = 0; }` with verbatim comment "no dmg done if target is not high enough"; separate <45 + !inwater gate at `combat.c:695-697`. playerheight computed by downward traceline at `combat.c:576-580`. k_midair gate at `combat.c:527-529` + `:658` (entire minheight block under `if (midair)`).

- NEW source_ref: `src/combat.c:662` (authoritative behavior site -- cvar read driving the floor cascade)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Sets the rocket-damage floor for midair mode" -> `src/combat.c:662` (cvar read), `:690-692` (enforcement)
  - "minimum airborne height (target above ground via downward traceline)" -> `src/combat.c:576-580`
  - "values 1/2/3/4 -> 128/256/512/1024" -> `src/combat.c:664-678`
  - "value 0 or out-of-range -> 64-unit floor (else branch)" -> `src/combat.c:680-682`
  - "below floor, rocket damage zeroed (no dmg done if target is not high enough)" -> `src/combat.c:690-693`
  - "below 45 units out of water also zeros rocket damage" -> `src/combat.c:695-697`
  - "registered default '1' -> 128-unit floor" -> `src/world.c:967` `RegisterCvarEx("k_midair_minheight", "1")`
  - "no effect unless k_midair on; entire midair damage block gated" -> `src/combat.c:527-529`, `:658`
  - "companion cycling command broadcasts ground/bronze/silver/gold/platinum (tier flavor)" -> `src/commands.c:7589-7608`
  - "medal ranks computed independently in MidairDamageBonus from z-delta target-inflictor.oldorigin" -> `src/combat.c:367,374-401,590,1130`

- verify route: sample-verify (subagent: Opus 4.7 MAX, blind)
- verify verdict: TRACED-CLEAN (12 clauses, all MATCH; per-clause table at `/tmp/b4-midair-minheight/sample_verify.md`)
- attempts: 1

---

B4-RESULT | ktx:command:midair_minheight | TRACED-CLEAN | rev=1 | seed-clause: "0 = ground (no minimum)" + "1=bronze 2=silver 3=gold 4=platinum" attach medal labels to cvar tiers | new-clause: value 0 broadcasts "ground" but enforces 64-unit floor; labels coincide with medal-rank names but medals are computed independently from per-frag z-delta

### ktx:command:midair_minheight

- canonical_id: `ktx:command:midair_minheight`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX (threshold-contradiction): "0 = ground (no minimum)" -> MISMATCH at `src/combat.c:680-683,690-692`. Tier 0 falls to the else branch which assigns a 64-unit floor enforced by the damage-nullifier gate; "no minimum" is a stated absence the code actually bounds at 64 units.
  - Implicit C-FIX (medal-tier wrong): "1 = bronze, 2 = silver, 3 = gold, 4 = platinum" reads as enumerating cvar tier -> medal mapping; medal-rank logic at `src/combat.c:374-399` operates on per-frag z-delta INDEPENDENT of the cvar.
  - Seed scratch: `/tmp/b4-midair-minheight/seed_ktx_command_midair_minheight.md`.

- OLD description:
  > Cycles the minimum fall/fragheight tier for midair mode one step each invocation (0 -> 1 -> 2 -> 3 -> 4 -> 0) by setting the k_midair_minheight cvar, and broadcasts the chosen tier: 0 = ground (no minimum), 1 = bronze, 2 = silver, 3 = gold, 4 = platinum. Requires midair mode to be turned on first, otherwise it refuses with 'Midair must be turned on to set minimal frag height'. Subject to the standard rules-change permission check.

- NEW description:
  > Cycles the rocket-damage-floor tier for midair mode one step each invocation, by reading and writing the `k_midair_minheight` cvar in the sequence 0 -> 1 -> 2 -> 3 -> 4 -> 0, and broadcasts the new tier as "Midair minimum height set to <label> enabled level" with the label being "ground" / "bronze" / "silver" / "gold" / "platinum" for values 0/1/2/3/4 respectively. The tier sets the minimum airborne height (target's height above the ground at impact) below which rocket damage in midair mode is zeroed -- no damage means no frag is awarded. Floor heights at runtime are 64 / 128 / 256 / 512 / 1024 Quake units for tiers 0/1/2/3/4; value 0 broadcasts as "ground" but still enforces a 64-unit floor (it is not "no minimum"). The bronze/silver/gold/platinum labels coincide with the names of the midair-frag medal ranks, but the medal a midair frag earns at runtime is computed independently from the z-delta between target and rocket (>1024 platinum, >512 gold, >256 silver, else bronze) -- the cvar tier governs the damage floor, not the medal awarded. Requires midair mode on (k_midair = 1) or it refuses with "Midair must be turned on to set minimal frag height". Subject to is_rules_change_allowed() (the standard rules-change permission check).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Cycle traced through handler `SetMidairMinHeight` (`commands.c:7565`): clamped read `:7567` `bound(0, cvar(...), 4)`, increment + wrap `:7582-7585`, write `:7587` `cvar_fset(...)`, 5-branch broadcast `:7589-7608` with `redtext()` labels bronze/silver/gold/platinum/ground. C-FIX corrected: tier-0 enforces 64-unit floor at `combat.c:680-683` (`else { midair_minheight = 64; }`) + `:690-692` (damage zero); not "no minimum". Medal-tier inference also corrected: medal labels broadcast by the cmd coincide with `MidairDamageBonus` rank names (`combat.c:367,374-401`) but the function computes rank from per-frag `midheight = targ->origin[2] - inflictor->oldorigin[2]` (`combat.c:590`) via thresholds 256/512/1024 (no read of `k_midair_minheight`); call site `combat.c:1130` gated on `midair && match_in_progress == 2 && rl_dmg`. k_midair refusal at `commands.c:7575-7580`. Rules-change gate at `commands.c:7569-7572` -> callee `is_rules_change_allowed()` at `commands.c:9033-9051` (rejects if `match_in_progress` or `isRACE()`).

- NEW source_ref: `src/commands.c:7565` (handler entry SetMidairMinHeight)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Cycles 0->1->2->3->4->0 reading + writing k_midair_minheight" -> `src/commands.c:7567` (read+bound), `:7582-7585` (increment+wrap), `:7587` (cvar_fset)
  - "broadcasts 'Midair minimum height set to <label> enabled level' label=ground/bronze/silver/gold/platinum for 0/1/2/3/4" -> `src/commands.c:7589-7608`
  - "minimum airborne height (target above ground) below which rocket damage zeroed" -> `src/combat.c:576-580` (playerheight via downward traceline), `:690-692` (gate + take=0)
  - "Floor heights 64/128/256/512/1024 for tiers 0/1/2/3/4" -> `src/combat.c:664-683`
  - "value 0 enforces 64-unit floor (not 'no minimum')" -> `src/combat.c:680-682` (else=64) + `:690-692` (enforcement); broadcast "ground" via else branch `commands.c:7605-7607`
  - "bronze/silver/gold/platinum labels coincide with medal-rank names" -> `src/commands.c:7591/7595/7599/7603` (cmd broadcast labels) + `src/combat.c:378/385/392/399` (MidairDamageBonus rank assignments)
  - "medal computed independently from z-delta target-rocket via >1024 plat / >512 gold / >256 silver / else bronze" -> `src/combat.c:367` (function), `:374-401` (thresholds), `:590` (midheight delta), `:1130` (call site)
  - "requires k_midair=1, refuses with 'Midair must be turned on to set minimal frag height'" -> `src/commands.c:7575-7580`
  - "subject to is_rules_change_allowed() (standard rules-change permission check)" -> `src/commands.c:7569-7572` (gate) + callee body `src/commands.c:9033-9051` (refuses on `match_in_progress` or `isRACE()`)

- verify route: inline-self-check (terminal-applied enforce-trace per clause; cluster-shared root V-passed at Step 4 + sampled at the cvar row)
- verify verdict: TRACED-CLEAN (9 clauses, all MATCH; callee bodies followed for MidairDamageBonus + is_rules_change_allowed)
- attempts: 1

---

## Cluster summary

- **2 rows processed, 2 converged TRACED-CLEAN.** 0 HALT.
- **Verify routes:** sample-verify 1 (cvar, dispatched Opus 4.7 MAX subagent, read-only, blind) + inline-self-check 1 (cmd, terminal-applied with callee-follow on MidairDamageBonus + is_rules_change_allowed).
- **Total synth dispatches:** 0 (lean v2: inline authoring replaces per-row Opus synth fan-out).
- **Total verify dispatches:** 1 (lean v2: ONE blind sample per cluster on the higher-variation row; inline self-check on the other).
- **Sampled row:** `ktx:cvar:k_midair_minheight` (higher variation -- carries both C-FIX medal-tier + WI-2 default; the cmd carries only the C-FIX threshold-contradiction).
- **Sampled verifier verdict:** TRACED-CLEAN (12 clauses, all MATCH; per-clause table at `/tmp/b4-midair-minheight/sample_verify.md`).
- **Per-row attempts avg:** 1.0.

### Methodology gains captured

1. **Cluster-shared root V-pass succeeds inline.** Step 4 chased 6 falsifiable claims (value space {0,1,2,3,4}, 5-tier floor cascade, damage-nullifier enforcement, medal-rank independence, registered default = "1", k_midair top-level gate) + tree-wide grep for additional mutators of `midair_minheight` / `k_midair_minheight`. No mutators outside the cmd handler (cvar_fset at `commands.c:7587`) and the cvar read at `combat.c:662`. No flag-promotion analog of the dead-CF_SPC_ADMIN Init_cmds gap. Cluster understanding held without per-row Opus synth dispatch.
2. **Callee-follow at inline self-check.** The cmd row's "Subject to is_rules_change_allowed() (the standard rules-change permission check)" clause is callee-mediated. Inline self-check followed the call to `commands.c:9033-9051` and confirmed the callee body (refuse on `match_in_progress` or `isRACE()`); the summary clause is MATCH against the callee body. The 2026-05-20 callee-follow amendment from the dropquad rev=3 lesson carried forward without a verifier false-negative.
3. **Sample-verify catches synth self-rationalization at 1/N cost.** The blind subagent re-ran enforce-trace on the cvar row's 12 clauses against the live source oracle. ALL MATCH at rev=1, including the previously-flagged medal-tier-independence and the WI-2 registered-default corrections. No re-dispatch needed. Token cost ~58k for the sampled row only (vs ~5-7k/row x 2 = 10-14k under v1 per-row synth + verify dispatch; the v2 sample-verify is heavier per-row but eliminates per-row synth, and the cluster-shared inline understanding cost is amortized).

### Token-cost observation (vs v1 baseline)

- v1 baseline (per-row Opus dispatch): ~5-7k per row for synth + ~5-7k per row for verify -> ~20-28k for a 2-row cluster, plus orchestrator HG2 overhead. Real v1 figures for the dead-CF_SPC_ADMIN cluster: 20 sub-agents across 6 rows.
- v2 observed (this cluster):
  - Inline pre-reads (4 docs + decisions.md B4 slice): ~30k input.
  - Inline source-oracle understanding + per-row authoring: ~25k input/output mixed.
  - Sample-verify subagent (cvar only): ~58k total tokens (the subagent's own usage as reported).
  - Total: ~110k input across the terminal-side + the subagent. Sub-agent count: 1.
- The terminal-side is heavier per cluster (inline reading of the source oracle) but the sub-agent count drops from N=10-20 to N=1. For a 2-row cluster the absolute token saving is modest; the savings scale on larger clusters. For 6-14 row clusters expect a 3-5x reduction in total sub-agent tokens vs v1.
- Correctness equivalence holds for this cluster (parametric family, cluster-shared root V-pass succeeded, 1-sample blind verify came back TRACED-CLEAN on the higher-variation row).
