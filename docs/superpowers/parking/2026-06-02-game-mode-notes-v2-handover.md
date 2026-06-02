# Game-mode concept-notes v2 -- fresh-terminal handover (2026-06-02)

**Date:** 2026-06-02. **Status:** rosters + modifiers complete; methodology locked + extended this session. ~12 non-roster modes remain. Supersedes `2026-06-01-game-mode-notes-v2-handover.md`. Pick up cold in a fresh terminal.

## Where things are

All **9 standard-game rosters** and all **5 match-modifiers** are now on v2 and pushed:
- **Full notes:** `1on1`, `2on2`, `4on4`.
- **Lean roster notes:** `3on3`, `2on2on2`, `3on3on3`, `4on4on4`, `10on10`, `XonX`.
- **Modifiers:** `berzerk`, `killquad`, `freshteams`, `nosweep`, `yawnmode`.
- **Also done earlier:** `ctf` (objective), `dmm4` (aim baseline).
- **Methodology updated** + `4on4`/`ctf` trimmed to match (this session's refinements, below).

Commits this session are on `main`, pushed through `bd24bdb5`.

## The locked rules (v2 + this session's additions)

The four methodology docs in `apps/qw-oracle/curated/concept-notes/_methodology/game-modes/` are the authority. Read `concept-note-section-structure.md` first. This session added three refinements (now IN that doc):

1. **Describe this mode, not the others (principle 7).** A note explains its own mode; comparisons that explain how a *different* mode works are noise that drown the subject ("if I want 4on4 I'll read 4on4"). A one-clause distinctive contrast is fine; a sentence re-explaining another mode's economy is not. Cross-refs live in See-also, terse.
2. **Compressed Hosting availability.** Not a bitmask paragraph -- a practical restrict-line + pointer:
   ```
   set k_defmode <mode>              // boot into it
   set k_allowed_free_modes <bit>    // allow nothing else  (default 4095 = all modes)
   ```
   Give the bit value + any bit-sharing as a half-clause (4on4/ca/wipeout share `8`; ffa/tot share `32`). Deep bitmask mechanics + the read-at-map-load caveat live in `server-setup`.
3. **Brief ready-up allowed in Activate.** A one-line "both players `ready` to start the countdown" is fine; the exhaustive pre-match/ready-up flow lives in `server-setup`. The command is `ready` (and `break` to unready) -- `commands.c:707`.

**Lean vs full:** 1on1/2on2/4on4 are full (most-played); other rosters are lean (short How-it-plays, size-guidance Maps, no History). For the non-roster modes, judge per-mode -- ca/wipeout/race/ffa are distinct enough to be full; instagib is a documented-for-completeness novelty.

## Critical gotchas (carry these forward)

- **Source is truth.** KTX checkout at `research/repos/ktx` (`1.47-2-g67253dc`). Presets are the `_<mode>_um_init[]` arrays in `src/commands.c`; UM bits in `include/g_local.h:693-705`; mode_cmd entries `commands.c:4537+`. KTX `k_*` cvars carry NULL in L1 -- read values from source.
- **Verified respawn times** (`items.c`): armour 20s after pickup; megahealth 20s after its +100 expires; **ammo 15s in dmm3 / 30s in dmm1** (the "Xian DM3.0" halving, `items.c:1347`); weapons 30s (`weapon_time`, `items.c:812`); Quad 60s. The dmm3/dmm1 ammo split is a real catch -- duels (dmm3) get fast ammo.
- **dmm cutoff:** players-per-team, not headcount. <=2/side = `deathmatch 3` (weapons stay): 1on1/2on2/2on2on2. >=3/side = `deathmatch 1` (weapons vanish, respawn 30s): 3on3/3on3on3/4on4/4on4on4/10on10/XonX. dmm1's real game is armour/powerup/map control, NOT "weapon denial" (weapons respawn).
- **Parallel session shares the main tree.** Another Claude session commits MVDSV describe-fill work to `main` in the same working tree. Use file-targeted `git add <path>` (never `git add -A`/`.`); run `git diff --cached --stat` before every commit; commits interleave in the log -- that's expected, not drift.
- **The operator reads every note's prose.** Show the draft (in chat or written), let him confirm/tell you changes, then commit. He owns git only as a tool -- you run it silently, commit per note.
- **Operator IS the map authority** (a famous dueller). Bring source-verified mechanics; let him confirm/correct map pools. Big-team pool (confirmed): `death32c`, `superdm32`, `bloodwalk`, `schobble`.

## Remaining work

1. **~12 non-roster modes still on v1**, by experience group:
   - **Arena:** `ca`, `wipeout` (`deathmatch 5`, full-spawn, round elimination -- richer full notes; `ca` activates via `/carena`, the lone slug!=command case).
   - **Free-for-all:** `ffa` (matchless public form is the living experience; the `ffa` command is the secondary timed-match form).
   - **Spawn-rotation:** `hoonymode`, `blitz2v2`, `blitz4v4`.
   - **Movement:** `race`. **PvE:** `tot`, `bloodfest`. **Novelty:** `instagib`. **Aim:** `midair`, `lgc` (dmm4-based, like the done `dmm4`).
   - **Outside the 27:** `rocket-arena` (`/arena`, NOT `/carena`).
2. **`deathmatch-modes` reference note** -- needs the stale "dmm5 absent from KTX" correction (KTX uses `deathmatch 5` for arena; what's absent is KTPro's dmm5-8 gametypes). See `experience-group-classification.md`.
3. **`server-setup.md`** -- PARKED. It's cross-domain (KTX + MVDSV + qtv-go) and can't be finished until those are synthesized; the operator deprioritized it. It's a good-enough KTX deferral target as-is. Known dangling item: the "k_allowed_free_modes read at map load -> map restart" caveat should land there eventually (not lost, just deferred).

## The recast process (repeatable, per note)

1. Read the existing v1 note + the methodology section-structure doc.
2. Recast into the v2 sections; apply the access split + describe-own-mode + compressed Hosting.
3. Re-verify every value + inherited claim against KTX source (presets, bits, timings). v1 prose can be subtly wrong -- re-check, don't trust.
4. Show the operator the prose (he reads every one). Iterate.
5. Write + commit per note (file-targeted `git add`; verify staging). Push at natural checkpoints.

## First three actions (cold start)

1. Read the four methodology docs (esp. the updated `concept-note-section-structure.md`) + 3-4 v2 exemplars (`1on1` duel, `4on4` team, `ctf` objective, `berzerk` modifier).
2. Confirm with the operator which non-roster group to start -- `ca`/`wipeout` (arena) is a natural first (distinct, full notes).
3. Pull the mode's L1 row + `_um_init` preset + UM bit from source before drafting.

## When in doubt

The operator works at intent level (player experience, useful-vs-noise). Bring mechanical facts verified against source, not against the v1 notes. Describe the mode in front of you; cross-refs stay terse. Keep notes tight -- fine phrasing is the operator's co-edit, so draft well and let him tweak.
