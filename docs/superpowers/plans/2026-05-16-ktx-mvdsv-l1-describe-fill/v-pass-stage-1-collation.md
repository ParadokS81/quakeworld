# KTX D7 V-pass -- Stage-1 collation (all 9 batches, canary-filtered)

B5 Stage-1 GLOBAL INDEX per `decisions.md` D7 Amendment 2026-05-19
(B5). The per-batch ledgers (`v-pass-ledger-batch-01..09.md`) ARE the
durable Stage-1 records per slice -- per-row clause-by-clause
enforcing-line citations + classification + rationale, append-only,
committed per slice. This file is the GLOBAL INDEX across all 9 slices:
the population sanity, the per-batch + global tally, the flagged set
(the B4 cohort), and the systemic-pattern clusters. Canary controls
(`autotrack` / `k_teamoverlay` / `k_yawnmode`) are filtered out of the
spine -- they are controls, not data, per F-V2.

## Population sanity

**N = 571 rows.** Matches exactly the expected V-pass population per
the F-V1 strided partition: 574 KTX confident-fleet synthesized rows
minus 10 FIX-queue knobs (B4 cohort from the operator-tail walk, not
V-passed) minus 3 canary controls. 9 buckets, 51-82 rows each.

## Global tally (canary-filtered, all 9)

- **N = 571**
- **TRACED-CLEAN: 475 (83.2%)** -- the **B2 retirement evidence**:
  these rows pass the V-pass and D7 tier-1 is RETIRED for them per B2.
- **flavour-C-positive: 84 (14.71%)**
  - C-FIX: 55 (wrong clause vs enforcing line)
  - C-NEAR-MISS: 29 (clause untraceable on the feature's own path)
- **WI2-FIX: 12** (metadata clause wrong, core behavior fine; reported
  separately from flavour-C per the classification enum)
- **Total flagged (B4 cohort): 96 rows = 55 C-FIX + 29 C-NEAR-MISS + 12 WI2-FIX**

The **14.71% global rate matches the random-fleet probe (2/14 ~14%)**
at full scale -- calibration prediction validated.

## Per-batch (canary-filtered)

  batch 01: N=63  TC=49  C-NM=5  C-FIX=4  WI2=5  | flavourC= 9 (14.3%)
  batch 02: N=82  TC=69  C-NM=6  C-FIX=6  WI2=1  | flavourC=12 (14.6%)
  batch 03: N=65  TC=55  C-NM=2  C-FIX=6  WI2=2  | flavourC= 8 (12.3%)
  batch 04: N=59  TC=50  C-NM=2  C-FIX=7  WI2=0  | flavourC= 9 (15.3%)
  batch 05: N=55  TC=41  C-NM=6  C-FIX=7  WI2=1  | flavourC=13 (23.6%)
  batch 06: N=51  TC=44  C-NM=0  C-FIX=7  WI2=0  | flavourC= 7 (13.7%)
  batch 07: N=72  TC=62  C-NM=2  C-FIX=8  WI2=0  | flavourC=10 (13.9%)
  batch 08: N=61  TC=53  C-NM=4  C-FIX=4  WI2=0  | flavourC= 8 (13.1%)
  batch 09: N=63  TC=52  C-NM=2  C-FIX=6  WI2=3  | flavourC= 8 (12.7%)

Batch 05 is the high outlier (23.6%) -- bucket variance, well below the
~40% halt threshold (stride de-clustering proven). All other batches
12-15%.

## Flagged set (the B4 cohort -- C4: operator-gated, NOT started)

### 55 C-FIX (wrong clause vs enforcing line)

  -scores, 11fav_go, 15fav_go, 16fav_go, 18fav_go, 1fav_go, 20fav_go,
  2fav_go, 3fav_go, auto_pow, autotrackktx, berzerk, commands,
  ctfbasedspawn, dinfo, dlist, effi, fav_show, fill:frogbot:std,
  forcebreak, fragsdown, handicap, instagib_coilgun_kickback,
  midair_minheight, report, rnd, rpickup, shownick,
  summary:frogbot:editor, teleportcap, togglequad:frogbot:std,
  _k_coachteam1, _k_coachteam2, _k_worldspawns, k_btime, k_cmd_fp_per,
  k_ctf_based_spawn, k_ctf_hook, k_ctf_hookstyle, k_ctf_rune_bounce,
  k_entityfile, k_fbskill_aim_pitch_multiplier, k_fbskill_wiggleframes,
  k_freshteams_weapon_time, k_hoonymode, k_matchless,
  k_matchless_max_idle_time, k_midair_minheight, k_on_end_f_modified,
  k_on_end_f_ruleset, k_on_end_f_version, k_race_match, k_socd,
  k_vp_map, *ml:userinfo

### 29 C-NEAR-MISS (untraceable scope/clause on feature's own path)

  13fav_go, admin, dmm1, dmm3, fragsup, health:frogbot:std, info,
  infospec, kinfo, laststats, lgcmode, pickspawn, prewar, qenemy,
  qlag, race_countdown_up, removeitem, socd, uinfo, k_allow_vwep,
  k_clan_arena, k_extralog, k_fbskill_aim_lgpref, k_pow_p,
  k_spm_color_rgba, k_spw, k_vp_admin, k_vp_antilag, lock_practice

### 12 WI2-FIX (metadata / access-class wrong; core behavior fine)

  dmm4, droppack, dropquad, dropring, fav_add, fav_all_del, fav_del,
  fav_next, qizmo, race_set_finish, upplayers, upspecs

## Systemic patterns (B4 cluster-batching candidates)

Clusters where a single methodological fix resolves multiple flagged
rows -- B4 cohort-batching amortizes the "understand the enforcing
pattern" cost (one seeded re-synth template per cluster instead of N
independent re-syntheses).

- **fav_go family (~14 rows).** 8 C-FIX (1/2/3/11/15/16/18/20 fav_go),
  1 C-NEAR-MISS (13fav_go), 1 C-FIX (fav_show) + partner WI-2
  (fav_add/fav_del/fav_all_del/fav_next). **Root:** descriptions claim
  `fav_add` populates per-slot favourites, but `fav_add` writes
  `self->fav[]` (the auto-list consumed by `fav_next`), while
  `Nfav_go` / `xfav_go` reads `self->favx[]` populated only by
  `favN_add`/`favx_add`. One D6 re-synth template covers the family.
- **CF_MATCHLESS additive-misread WI-2 cohort (~7 rows).**
  fav_add / fav_del / fav_all_del / fav_next / droppack / dropquad /
  dropring carry "not during a match" or analogous, all misreading
  CF_MATCHLESS as a match block (it is additive matchless permission,
  NOT a match restriction). One access-class re-synth template.
- **dead-CF_SPC_ADMIN structural (~3 rows).** race_set_finish /
  upspecs / upplayers: CF_PLAYER|CF_SPC_ADMIN with no CF_SPECTATOR
  means every spectator (incl. admin) gets DO_WRONG_CLASS-rejected
  BEFORE the CF_SPC_ADMIN check. CF_SPC_ADMIN is dead for these
  commands. One access-class re-synth template; also worth a standing
  fleet-sweep verification rule (likely catches more).
- **midair_minheight pair (2 rows).** Both `midair_minheight` cmd +
  `k_midair_minheight` cvar carry "no minimum" -- contradicted by the
  real 64u tier-0 floor at combat.c:682. One re-synth.
- **k_on_end_f_* trio (3 rows).** k_on_end_f_modified /
  k_on_end_f_ruleset / k_on_end_f_version: "every player / once per
  player" claim wrong -- a static `f_*_done` bool one-shot means
  EXACTLY ONE player issues the announce. One re-synth template.
- **dmm1 / dmm3 force-off near-miss (2 rows).** "Switching to mode
  1/3 forces k_midair/k_instagib off" enforced only by the generic
  `if (dmm != 4)` branch. Strict-but-defensible C-NEAR-MISS --
  operator judgment call: keep, or re-scope to "any non-dmm4 mode".

Clusters cover ~31 of the 96 flagged rows. The remaining ~65 are
unique rows requiring individual seeded re-synth.

## Pointers

- Per-row clause-by-clause detail: `v-pass-ledger-batch-NN.md` (the
  durable Stage-1 record per slice). Each `###` block carries the
  located wrong-clause enforcing file:line as the **mandatory B4
  re-synth seed** per decisions.md B4.
- Canary ground truth + the enforce-trace-discipline method:
  `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`.
- V-pass template (paste-and-go, F-V1/F-V2 hardened + canary-strip +
  re-dispatch discipline):
  `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-handover-prompt.md`.
- Authority: `decisions.md` D7 Amendment 2026-05-19 (B1-B5).
- Resume contract:
  `docs/superpowers/parking/2026-05-19-ktx-mvdsv-l1-describe-fill-orchestrator-resume.md`.

## C4

Nothing applied. No L1 row mutated. No re-synth run. This collation is
the Stage-1 record only; B4 (seeded re-synth via the D6 pipeline) is
the operator-gated next step.
