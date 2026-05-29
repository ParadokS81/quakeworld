# Handover: KTX game-mode arc -- the 3 extras (dmm4, rocket-arena, deathmatch-modes)

**Date:** 2026-05-30. **Owner:** fresh terminal, model of your choice.
**Supersedes for next-steps:** `2026-05-29-game-mode-grind-standalones-handover.md`. That doc's methodology + per-mode discipline still apply; this one covers ONLY the 3 extras left after the 27-mode set shipped.

## The headline

**The 27-mode KTX game-mode corpus is DONE** (all 27 notes on disk + committed + pushed). What remains is **3 "extras"** that sit *outside* the 27 because none has a `game_mode` row in L1. They were deferred all along pending an operator decision. This doc explains the decision precisely and gives the approach for each.

This session shipped the last 5 standalones + 1 correction: `ffa`, `instagib`, `race`, `tot`, `bloodfest` (new) and `midair` (rewritten -- the v1 draft had the quad/scoring/loadout backwards). The arc's umbrella entry is `apps/qw-oracle/docs/arc-history.md` (2026-05-29); the FINAL "shipped" arc-history paragraph + the arc tag are deliberately deferred until the 3 extras land (per the prior handover's "tag when the last extra lands, not before").

## Why these 3 are blocked: it is TWO different problems, not one

The `game-mode-curate` skill pre-flights `SELECT ... FROM gameplay_mechanics WHERE kind='game_mode' AND name='<slug>'`. There are exactly **27** such rows; these 3 have **none** (verified `SELECT count(*) WHERE name IN ('dmm4','rocket-arena','arena','deathmatch-modes')` = 0), so the skill HALTS on L1-GAP. But the *reason* each is missing differs:

### Problem A -- two real played modes the L1 extractor's net missed

The KTX extractor harvested "game modes" from two source structures: the `um_list[]` UserMode table (`commands.c:4535-4554` -> the 27) and the `k_<name>` cvar-toggle mutators. Two real modes fall outside both nets:

- **`dmm4`** -- a `ChangeDM(4)` command (the `dmm1`..`dmm5` family, dispatched via `ChangeDM`, NOT `um_list[]`). It is the bare full-arsenal aim mode that `midair` and `lgc` build on (write `dmm4`, play 1on1 on an aim map like povdmm4, spawn with everything, no items). A genuinely-played mode. The extractor never walked the `ChangeDM` dispatch, so no `game_mode` row exists -- but the **`dmm4` command entity DOES exist in L1** (`entities`, `type=command`; also `dmm1/2/3/5`).
- **`rocket-arena`** -- `/arena` -> `k_rocketarena` cvar (`commands.c:971` registration, `ToggleArena` handler at `commands.c:8842`, `k_rocketarena` default 0 at `commands.c:4180`). A 1on1 winner-stays duel; NOT Clan Arena (`/carena`) despite the name. Source helpers: `isRA()` = `isDuel() && cvar("k_rocketarena")`. The `arena` + `ra_break` command entities exist in L1; no `game_mode` row.

**The decision (Problem A):** for each of dmm4 + rocket-arena, choose:
- **(a) Draft as a plain L3 concept note now**, anchored on the command entity (e.g. `ktx:command:dmm4`, `ktx:command:arena`) + `k_rocketarena` cvar, with `kind`/`experience_group` set by hand rather than read from a `game_mode` row. The `game-mode-curate` skill will halt, so these get authored *like* game-mode notes but without the skill's pre-flight -- follow the methodology docs manually (same section structure, same frontmatter shape). Fastest; ships the player-facing value today. Experience groups already assigned in the methodology doc: dmm4 -> aim-practice (the baseline of that group); rocket-arena -> its own (arena-adjacent but a duel).
- **(b) Extend L1 extraction first** so the KTX extractor emits `game_mode` rows for the `ChangeDM` family + `k_rocketarena`, THEN run `game-mode-curate` normally. Cleaner provenance (the note's frontmatter pointer resolves to a real row), but it is an extractor-code arc (Python handler work in `apps/qw-oracle/scripts/extractors/ktx/`) gated behind its own test/reload cycle -- much bigger than authoring two notes.

Recommendation to weigh (operator decides): **(a) for both.** These are 1-of-1 oddities; the extractor-extension cost (option b) is hard to justify for two modes, and the methodology already assigns their experience groups. If the extractor later grows `ChangeDM` support for other reasons, the notes can be re-pointed. BUT this is exactly the kind of scope-deferral the operator should approve explicitly -- do NOT default it.

### Problem B -- `deathmatch-modes` was never a mode; it is a reference note

`deathmatch-modes` is NOT a playable mode -- it is the **reference concept** for the `deathmatch` flag taxonomy (dmm0 coop / dmm1 items-vanish-then-respawn / dmm2 weapons-stay-no-respawn [Doom2 holdover, unused] / dmm3 weapons-stay-respawn [most common: duels/FFA/some TDM] / dmm4 full-arsenal-no-respawn [aim maps] / dmm5 = KTX arena ruleset). There is no `game_mode` row to expect and the `deathmatch` cvar is not even an L1 entity. It was always meant to be a hand-authored L3 reference note.

**Why it has real payoff:** **19 of the shipped concept notes already link to `deathmatch-modes (pending)`** in their See-also sections (verified: `grep -l 'deathmatch-modes' = 19`). Writing it resolves 19 dangling cross-refs in one shot.

**The decision (Problem B):** none, really -- just write it. It is a plain L3 reference note (NOT a game-mode note; no `game-mode-curate`, no experience_group). One caveat to honor from the methodology doc: **one wiki claim is stale and MUST be corrected** -- `Deathmatch.json` says "dmm5 absent from KTX," but KTX uses `deathmatch 5` as the clan-arena/wipeout ruleset (live at `items.c:1347/2604`, `client.c:2308`, set by `carena_um_init`/`wipeout_um_init`). What is absent from KTX is KTPro's dmm5-8 *gametypes*, not the deathmatch value 5. Source the dmm flag meanings from the `entities` table (the `deathmatch`-setting init arrays at `commands.c:4221-4532` show which mode uses which value) + the QWiki "Deathmatch Modes" page.

## Corpus state (final, 27/27)

| State | Count | Modes |
|---|---|---|
| Conformant (have notes, committed) | 27 | all 27 -- the 9 standard-game + ca/wipeout + ctf + hoonymode/blitz2v2/blitz4v4 + berzerk/freshteams/nosweep/yawnmode/killquad + midair/lgc/instagib + ffa/race/tot/bloodfest |
| Extras (outside 27, L1-gap) | 3 | **dmm4, rocket-arena** (Problem A -- real modes, extractor-gap) + **deathmatch-modes** (Problem B -- reference note) |

## First three actions

1. Read this doc + the methodology quartet in `apps/qw-oracle/curated/concept-notes/_methodology/game-modes/` (esp. the "dmm commands and bare dmm4" + "Rocket Arena" + "Open L1 gaps" sections of `experience-group-classification.md`, which already scoped all 3). DB: `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`.
2. **Get the Problem A decision from the operator** (option a draft-as-L3 vs option b extend-extraction). Plain-English, one question. Do not guess -- the operator flagged this as a real decision.
3. Start with **`deathmatch-modes`** regardless of the Problem-A answer -- it is unblocked, needs no decision, resolves 19 dangling refs, and writing it clarifies the dmm taxonomy you will reference when drafting dmm4. Then do dmm4 + rocket-arena per the operator's option-a/b call.

## Per-extra quick facts (verified this session against HEAD 1.47-2-g67253dc)

- **dmm4** -- `ChangeDM(4)` command family `commands.c:725-729`; command entity `ktx:command:dmm4` exists in L1; experience-group = aim-practice (baseline). dmm4 inherent property worth noting: **ammo never decrements in dmm4** (every weapon's decrement is guarded `(deathmatch != 4) && !k_bloodfest` -- `weapons.c:830/879/1037/1247/1375/1653/1712`). The bare dmm4 spawn loadout is the `else` branch at `client.c:2250-2276` (250hp/200RA, all weapons, 255 each ammo).
- **rocket-arena** -- `/arena` command `commands.c:971`, `ToggleArena` `commands.c:8842`, `k_rocketarena` `commands.c:4180` (default 0); `isRA()` = `isDuel() && k_rocketarena`; `ra_break` command `commands.c:969`. 1on1 winner-stays. NOT `/carena` (Clan Arena). Wiki: no clean gameplay page (only `UK_Rocket_Arena_Championship.json`, a tournament page -- likely l3-upstream).
- **deathmatch-modes** -- reference note; wiki `Deathmatch.json` (~5000 chars, umbrella). Correct the dmm5 claim (above). 19 notes link to it as `(pending)`.

## Out of scope

- The 27 modes (done).
- `maphub_v2`'s own note (separate maps-asset project owns it).
- Extending L1 extraction UNLESS operator picks Problem-A option (b).
- MVDSV / QWFWD / QTV forks (KTX-scoped).

## Git state (2026-05-30)

- 6 note commits this session on `main` (`258c66cb` ffa .. `19aa0dec` bloodfest); **all 6 UNPUSHED at handover time** (operator's wrap-up triggers the push -- if you are the next terminal and `git log origin/main..HEAD` shows them, push at your first checkpoint).
- ~16 uncommitted working-tree files remain -- ALL pre-existing unrelated drift (matchscheduler / slipgate / settings / untracked parking). Stage only the note file on each commit.
- Tag the arc ship (`git tag -a arc-ktx-game-modes-shipped`) AND write the final "shipped" arc-history paragraph once the 3 extras land (or the operator declares them a separate follow-on). Neither done yet -- do not tag/retrospective before that call.
