# Game-mode concept-notes v2 -- fresh-terminal handover (2026-06-03)

**Date:** 2026-06-03. **Status:** arena + spawn-rotation + aim-practice families complete this session; rosters + modifiers + ctf + dmm4 done earlier. **~5 modes + 1 reference note + 2 touch-ups remain.** Supersedes `2026-06-02-game-mode-notes-v2-handover.md`. Pick up cold in a fresh terminal.

## Where things are

**v2 and pushed (20 of the 27 + dmm4):**
- **Standard-game rosters (9):** `1on1` `2on2` `3on3` `4on4` `10on10` `XonX` `2on2on2` `3on3on3` `4on4on4` (full notes for 1on1/2on2/4on4; lean for the rest).
- **Match-modifiers (5):** `berzerk` `killquad` `freshteams` `nosweep` `yawnmode`.
- **Objective:** `ctf`. **Aim baseline:** `dmm4` (not one of the 27; the base midair/lgc/instagib ride on).
- **Arena (2) -- THIS session:** `ca` (`/carena`, the slug≠command case), `wipeout` (the respawn-budget sibling).
- **Spawn-rotation (3) -- THIS session:** `hoonymode` (duel head), `blitz2v2`, `blitz4v4`.
- **Aim-practice (2) -- THIS session:** `midair`, `lgc`.

This session's commits are on `main`, pushed through `cbd094b7`. Each note's commit body carries its full source-verification audit trail (every number/cvar/interlock cited to `file:line`) -- read the relevant commit if you need the cites.

## The locked rules (v2 methodology)

The four methodology docs in `apps/qw-oracle/curated/concept-notes/_methodology/game-modes/` are the authority. Read `concept-note-section-structure.md` first. v2 structure:

```
Summary | Activate | Basic ruleset | (Settings to tune) | How it plays (+ optional ### subsections) | (Maps) | (History) | Hosting & settings | See also
```

Five core sections, conditional ones absent-not-empty. Access split: **Basic ruleset** = enforced preset (cvars, body-complete, never defer to the dead `mode_default_init_array` pointer); **Settings to tune** = in-game player commands (omit if none); **Hosting & settings** = admin/server.cfg surface (compressed: restrict-line + bit + the cvars worth editing, NOT a restatement of Basic ruleset). **Mutators** carry `kind: mutator`, omit the queryable frontmatter facts (deathmatch_flag/roster/loadout/objective/init-array), and lead How-it-plays with the delta vs the base. **Drop `activation_summary`** (retired field).

## Critical gotchas (carry these forward -- this session reinforced all of them)

- **Source is truth; RE-VERIFY every inherited claim.** v1 prose is regularly wrong. This session the verify pass caught: wipeout's round-end (it's a *simultaneous* full-team wipe, timer-waiters count as dead -- `CA_check_alive_teams`/`ISLIVE`, not "respawns exhausted"); hoonymode's win score ("first to **seven**, win by two" -- the wiki's "6" is wrong; `hoonymode.c:283/224`, `HM_rounds()/2`); midair's loadout (RL+axe, **not** "full arsenal" -- `client.c:2187`) and its two-height scoring (128 gate is **above ground** `playerheight`; tier cutoffs 256/512/1024 are **relative** `midheight` = target above your shot). Don't trust v1; open the handler.
- **The `game-mode-curate` SKILL is STALE -- do not trust it for structure.** It documents the v1 section set (`Starting a game` / `Strategy`), the retired `activation_summary` field, and lists `ca`/`wipeout` as "conformant" while calling `ctf` "un-recast" -- all reversed from reality. Drive structure off the `_methodology/` docs; use the skill only for its source-verification discipline (specific-numbers-from-handlers, drafter-honesty, commit-body audit). **Backporting the skill to v2 is a pending task (see Remaining).**
- **The operator reads every note and co-edits for TERSENESS + DE-DUP.** One home per fact -- do not repeat the same idea across Summary / How-it-plays / History (he caught this hard on LGC's bot-format story and wipeout's self-damage). Basic ruleset states facts; How-it-plays carries experience without re-listing them. Draft tight; he'll tweak.
- **Operator is the map authority; maphub_v2 is the canonical per-mode pool source.** Sibling notes cite "the community's `maphub_v2` hub." He confirmed wipeout's pool against a maphub screenshot. Bring source-verified mechanics; let him confirm/correct map pools (he may not know every mode -- he'd never played hoonymode).
- **Parallel session shares the main tree.** Another Claude session commits MVDSV describe-fill work to `main` in the same working tree. Use file-targeted `git add <path>` (never `-A`/`.`); run `git diff --cached --stat` before every commit; commits interleave -- expected, not drift.
- **Mutator interlocks need toggle-handler verification.** `midair`↔`lgc`↔`instagib` are mutually exclusive (`incompatible-with`) -- verified at `ToggleMidair`/`ToggleLGC`/`ToggleInstagib` (each clears the others). killquad/berzerk coexist (`similar-shape`, NOT incompatible).

## Remaining work

1. **~5 modes still on v1**, by experience group:
   - **Solo / PvE (2):** `tot` (Tribe of Tjernobyl -- `deathmatch 4` + firebot `k_fb_enabled 1`; `tot_um_init` at `commands.c:4511`, mode_cmd `commands.c:4553`) and `bloodfest` (monster waves, solo/coop; `world.c:971`). `tot`'s wiki = `ToT_Mode.json` (hybrid); `bloodfest` = `Bloodfest.json` (hybrid).
   - **Free-for-all (1):** `ffa` -- lead with the **matchless public form** (the living experience: dedicated FFA servers, no match wrapper); the `ffa` command is the secondary timed-match form (`ffa_um_init`, mode_cmd `commands.c:4542`, `UM_FFA` bit 32). Wiki `Free_For_All.json` is a minimal stub (l3-upstream).
   - **Movement (1):** `race` (`race.c:242`, `UM_RACEMODE` bit `1<<31`; per-map routes). Wiki `Race.json` (hybrid).
   - **Novelty (1):** `instagib` (`world.c:975`, `ToggleInstagib` `commands.c:7723`; railgun import, set up as FFA, documented-for-completeness). **Drafting it closes the `incompatible-with` refs that `midair`/`lgc` already point at.** Wiki `Instagib.json` -- check Step-0 (may be wrong-topic like LGC).
   - **Outside the 27:** `rocket-arena` (`/arena`, `k_rocketarena` -- a 1on1 winner-stays duel; NOT `/carena`, NOT Clan Arena. The lone "create the slug" case -- no `gameplay_mechanics` row; anchor on the command entity like `dmm4` did).
2. **`deathmatch-modes` reference note** -- needs the stale "dmm5 absent from KTX" correction (KTX uses `deathmatch 5` for arena; what's absent is KTPro's dmm5-8 *gametypes*). See `experience-group-classification.md` "The dmm commands".
3. **`killquad` de-dup touch-up** -- it's on v2 structure but predates the 2026-06-01 de-dup rules; its `Hosting & settings` restates gameplay. Trim Hosting to admin-only.
4. **`game-mode-curate` skill backport** -- update SKILL.md to the v2 section set + frontmatter (drop `activation_summary`, add `Activate`/`Basic ruleset`/`Settings to tune`), and fix the "shape reference" (ctf is the exemplar; ca/wipeout/etc. are now done v2). Do before any sub-agent fan-out leans on it. (Flagged on ~8 commit bodies.)
5. **`server-setup.md`** -- still PARKED/cross-domain (KTX + MVDSV + qtv-go); per-mode Hosting defers its generic bitmask/pre-match mechanics there. Good-enough KTX deferral target as-is.

## The recast process (repeatable, per note)

1. Read the existing v1 note + the methodology section-structure doc.
2. **Pre-flight from source** -- pull the `_<mode>_um_init` preset (`commands.c`), the UM bit (`g_local.h:693-705`), the mode_cmd entry (`commands.c:4537+`), and the relevant handler (spawn loadout, scoring, win condition). KTX `k_*` carry NULL in L1 -- values come from source.
3. **Re-verify every inherited value/claim against the handler** (not the init array, not the wiki, not the v1 prose). Mutators: verify interlock guards at the Toggle handler before using `incompatible-with`.
4. Recast into the v2 sections; apply the access split + describe-own-mode + de-dup (one home per fact).
5. Show the operator the prose (he reads every one). Iterate -- he co-edits for terseness/de-dup and confirms map pools.
6. Write + commit per note (file-targeted `git add`; `git diff --cached --stat` before commit; commit body = full source-cite audit trail). Push at natural checkpoints.

## First three actions (cold start)

1. Read the four methodology docs (esp. `concept-note-section-structure.md`) + 3-4 v2 exemplars across shapes (`4on4` standard, `ctf` objective rich, `berzerk` modifier, `midair`/`lgc` mutator, `wipeout` variant-led).
2. Confirm with the operator which group to start -- **PvE (`tot` + `bloodfest`)** or the **singletons (`ffa`/`race`/`instagib`)** are the natural next batches; `instagib` also closes `midair`/`lgc`'s dangling refs.
3. Pull the chosen mode's L1 row + `_um_init` preset + UM bit + handler from source before drafting.

## When in doubt

The operator works at intent level (player experience, useful-vs-noise, terseness). Bring mechanical facts verified against the handler, not against v1 or the wiki. Describe the mode in front of you; cross-refs stay terse; never repeat a fact across sections. Draft well and let him co-edit the phrasing.
