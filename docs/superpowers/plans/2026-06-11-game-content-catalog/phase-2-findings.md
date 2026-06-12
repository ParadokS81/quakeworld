# Phase 2 findings ledger -- id1 monster stats + wiki cross-check

Per-monster extraction + cross-check record for the 15 id1 single-player
monster rows (`kind='monster'`, `gameplay_source_id='id1'`, gate `{}`) added to
`id1-gameplay.yaml` Cluster 4. Source: the pristine Quake v1.06 QuakeC tree at
`/research/repos/QuakeC-releases/progs/` (commit `85ccafd2`, branch
`id1-original`). Values cited per-prop into that tree (leading-slash form, D7).
Wiki cross-check values NEVER enter rows (D2/D15) -- they live here.

This is the per-monster ledger. Material execution findings are appended to
`review-findings.md` (F17, F18). Roster pin + fan-out + boundary record is in
the executor halt report.

---

## Fan-out honesty counts (Task 3)

- Dispatched: 15 (trial 3: shambler, ogre, boss; then 12 in 3 waves of 4).
- Returned: 15. Re-dispatched (null/died): 0.
- Stage 1 (extract) + Stage 2 (independent re-derive) per monster, Sonnet, low
  concurrency (waves of 4, ~2s natural pacing), schema-enforced with REQUIRED
  per-value citations (D10/D11). Zero uncited values.
- Source-vs-source (Stage 1 vs Stage 2) health/gib/projectile-speed agreement:
  **15/15 -- zero value discrepancies.**
- Wiki (quakewiki.org) health/gib cross-check: **13/15 exact match**, 1 mismatch
  (fish gib; adjudicated below), 1 no-data (tarbaby; quakewiki page is a "Spawn"
  disambiguation, not a stats page -- `wiki_present=false`, degrade gracefully).

## Per-monster final stats (as written to the rows)

Spawn ref = the row `source_ref`. All refs leading-slash form under
`/research/repos/QuakeC-releases/progs/`.

| # | monster | health (ref) | gib (ref) | attacks | bloodfest? |
|---|---|---|---|---|---|
| 1 | monster_army | 30 (soldier.qc:313) | -35 (soldier.qc:259) | shotgun_burst hitscan, 4x4 pellets (16 max) | yes |
| 2 | monster_dog | 25 (dog.qc:398) | -35 (dog.qc:268) | melee_bite (r+r+r)*8; leap_bite 10+10r | yes |
| 3 | monster_fish | 25 (fish.qc:197) | null (no vanilla gib) | melee_bite (r+r)*3 | yes |
| 4 | monster_knight | 75 (knight.qc:283) | -40 (knight.qc:233) | sword_melee (r+r+r)*3 | yes |
| 5 | monster_hell_knight | 250 (hknight.qc:485) | -40 (hknight.qc:237) | sword_melee (r+r+r)*3; magic_spike_volley 9 dmg, speed 300 (6 spikes) | yes |
| 6 | monster_zombie | 60 (zombie.qc:549) | 0 (zombie.qc:426; pain-reset mechanic) | gib_lob 10 dmg, speed 600 | yes |
| 7 | monster_ogre | 200 (ogre.qc:502) | -80 (ogre.qc:438) | chainsaw_melee (r+r+r)*4; grenade_lob 40 splash, speed 600 | yes |
| 8 | monster_demon1 | 300 (demon.qc:231) | -80 (demon.qc:184) | claw_swipe 10+5r; leap_bite 40+10r | yes |
| 9 | monster_shambler | 600 (shambler.qc:397) | -60 (shambler.qc:349) | smash_melee (r+r+r)*40; claw_melee (r+r+r)*20; lightning beam 10/bolt | yes |
| 10 | monster_wizard | 80 (wizard.qc:444) | -40 (wizard.qc:384) | acid_spike 9 dmg, speed 600 (2 per attack) | yes |
| 11 | monster_enforcer | 80 (enforcer.qc:380) | -35 (enforcer.qc:325) | laser_bolt 15 dmg, speed 600 (2-shot burst) | yes |
| 12 | monster_tarbaby | 80 (tarbaby.qc:229) | null (no gib; kamikaze) | jump_touch 10+10r (+ 120 death splash) | yes |
| 13 | monster_shalrath | 400 (shalrath.qc:273) | -90 (shalrath.qc:129) | homing_missile 40 splash, launch speed 400 (homes 250/350) | yes |
| 14 | monster_boss | null (immune, DAMAGE_NO) | null (scripted death) | lavaball 100+r*20 direct + 120 splash, speed 300 | NO (boss) |
| 15 | monster_oldone | 40000 (oldone.qc:312; unreachable) | null (telefrag death) | none (Shub never attacks) | NO (boss) |

(r = random(); each `random()` returns [0,1). Full per-attack + per-behavior
citations are in the YAML rows.)

## Wiki cross-check (quakewiki.org primary; source is truth -- D2/D15)

quakewiki.org `/wiki/<classname>` resolved richly via Jina for all 15. Health
and gib threshold compared source-vs-wiki:

| monster | src health | wiki health | src gib | wiki gib | verdict |
|---|---|---|---|---|---|
| monster_army | 30 | 30 | -35 | -35 | match |
| monster_dog | 25 | 25 | -35 | -35 | match |
| monster_fish | 25 | 25 | null | -20 | **MISMATCH (gib)** |
| monster_knight | 75 | 75 | -40 | -40 | match |
| monster_hell_knight | 250 | 250 | -40 | -40 | match |
| monster_zombie | 60 | 60 | 0 | 0 | match |
| monster_ogre | 200 | 200 | -80 | -80 | match |
| monster_demon1 | 300 | 300 | -80 | -80 | match |
| monster_shambler | 600 | 600 | -60 | -60 | match |
| monster_wizard | 80 | 80 | -40 | -40 | match |
| monster_enforcer | 80 | 80 | -35 | -35 | match |
| monster_tarbaby | 80 | (no stats page) | null | (no stats page) | no external data |
| monster_shalrath | 400 | 400 | -90 | -90 | match |
| monster_boss | null | N/A | null | N/A | match (both N/A) |
| monster_oldone | 40000 | 40000 | null | N/A | match |

Non-gib wiki note (not a row mismatch -- the cross-check compares health/gib):
shalrath wiki states "~30 dmg" for the voreball vs the source T_RadiusDamage
parameter 40 (the ~30 is a mid-range falloff approximation; the coded max is 40).
Recorded for transparency; the row uses the source param 40.

## SME-gate adjudication (Task 4, D12 surface 3)

One wiki-vs-source mismatch surfaced. Operator decision recorded 2026-06-12:

- **monster_fish gib_health: source null vs quakewiki -20.**
  - Source (v1.06 QC): `fish.qc` has zero `ThrowGib`/`ThrowHead` calls; death is a
    single `f_death1..f_death21` animation with no `health < -N` gib branch. Both
    the extract and the independent verify agent confirmed this (grep-verified no
    gib code). gib_health = null.
  - quakewiki -20: the wiki itself attributes the -20 threshold to the Scourge of
    Armagon expansion (a separate codebase), NOT vanilla Quake v1.06.
  - **Decision: keep-source (gib_health = null).** SoA caveat noted in the row's
    `notes`. Wiki value never enters the row (D2/D15). Disposition: keep-source,
    note-only.

## Fandom status (F8 -- best-effort, degraded to STUB)

quake.fandom.com via Jina is unusable for the `monster_<classname>` slug for all
15: 12 hit the Cloudflare bot gate (HTTP 403 "Just a moment..."), 3 (army, boss,
shambler) return HTTP 404 (fandom uses common-name pages like `/wiki/Shambler`,
not the classname slug). All 15 `*.fandom.md` cache files are one-line STUBs
recording the block/404 reason; `_manifest.json` records `fandom_status`. This
is a refinement of F8 (fandom 404s on the classname slug, not only 403s) and
stays within D15's degrade-gracefully rule -- quakewiki.org is the sole
cross-check, and it is rich for all 15. Fandom was NOT chased via common-name
slugs (would re-introduce the Cloudflare risk and is unneeded -- quakewiki
covers the roster).

## Boundary note: MCP roster visibility (see review-findings F18)

`search_gameplay_entities kind=monster gameplay_source=id1` returns the full
15-row roster (match_quality strong) when the tool implementation runs against
the dev DB (`qw-oracle-postgres-dev`) -- verified by invoking the real
`searchGameplayEntities` impl locally. The qw-oracle MCP connected to the
executor session is the deployed REMOTE prod server (`oracle.slipgate.me`),
which still returns `[]` for id1 monsters because the dev-DB change has not been
deployed (a separate op; Phase 4 owns the slipgate snapshot; D14 = no new MCP
surface this arc). The runnable state is achieved at the dev-DB + code level,
which is what this phase produces.
