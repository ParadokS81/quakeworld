# Handoff: game-mode hosting-section reframe + the bots gap

**Date:** 2026-05-30. **Owner:** fresh terminal, model of your choice.
**Why a handoff:** the game-mode concept-note arc shipped (27 modes + 3 extras `deathmatch-modes`/`dmm4`/`rocket-arena`; tag `arc-ktx-game-modes-shipped`). Operator review of the hosting model then surfaced a follow-on -- a per-audience reframe of the activation/hosting sections across the notes -- plus a newly-spotted **bots gap**. The driving session hit context budget mid-reframe, so this captures the verified model + the remaining work.

## What this session established (source-verified -- do NOT re-derive)

The full KTX hosting/gating model is captured in two places:
- **`apps/qw-oracle/curated/concept-notes/server-setup.md`** -- seeded this session as a proper (draft) served note. This is the single home for hosting mechanics; read it first.
- `docs/superpowers/parking/2026-05-29-served-admin-knowledge-from-methodology.md` -- the same model as harvest notes (server-setup.md is its promotion).

Load-bearing facts (all verified against KTX `1.47-2-g67253dc`):
- **Two mode families:** UserModes (the 17 in `um_list[]`, gated by the `k_allowed_free_modes` bitmask) vs **toggle modes** (own `k_<name>` cvar, NOT in the bitmask).
- **`common_um_init` (`commands.c:4161`) resets 10 toggle cvars on every mode activation** -- `k_killquad k_yawnmode k_instagib k_clan_arena k_rocketarena k_race k_freshteams k_nosweep k_midair k_bzk`. So **"set `k_x 1` in server.cfg to enable" DOES NOT WORK** for those (the command is the only activation). **`k_lgcmode` is the exception** -- reset nowhere, so it persists.
- `k_allowed_free_modes` default `4095` is a *config* default (`ktx.cfg`), not an engine one (bare cvar = `0`). Bit-sharing (ca/wipeout/4on4 = one bit), `UM_RACEMODE` at bit 31, ban-by-association, `k_lockmode`=teams-not-modes, and the force-via-per-usermode-config path are all in server-setup.md.

## The decision that drives the work: the per-audience split

The methodology directive (`apps/qw-oracle/curated/concept-notes/_methodology/game-modes/concept-note-section-structure.md`) was rewritten this session to:
- **`Starting a game`** = the USER path only -- the activation command(s). No server-side content.
- **`Hosting & settings`** = the ADMIN half -- availability (usually one line: *"available by default; nothing to enable"*) + the mode's tunable knobs. Defers `k_defmode` / bitmask-depth / the force-path to `server-setup.md`, never repeating them per mode.

**`rocket-arena.md` is the worked example** -- read its `Starting a game` + `Hosting & settings` to see the target shape. (`dmm4.md` Hosting was also operator-reviewed and is a decent reference for tunable-knob curation.)

## Remaining work

### 1. Reframe the 8 toggle-mode notes' Hosting (verified scope)
The fix per note: not a free-mode (no `k_allowed_free_modes` bit) -> activate via `/command` on its base -> the cvar resets on every mode change so it's not a config switch -> then the mode's existing tunables (keep those). Section line numbers (may have drifted -- re-grep `^## Starting` / `^## Hosting`):

| Note | base | Starting / Hosting | note |
|---|---|---|---|
| midair | dmm4 | 50 / 58 | clear |
| instagib | dmm4 | 53 / 63 | clear |
| killquad | any | 47 / 51 | clear |
| berzerk | any | 41 / 45 | clear |
| freshteams | dmm1 | 43 / 47 | clear |
| nosweep | dmm1 | 38 / 42 | clear |
| yawnmode | any | 41 / 45 | clear |
| **lgc** | dmm4 | 48 / 58 | **`k_lgcmode` persists -- do NOT claim it resets; just "activate via `/lgcmode`; dedicated server -> server-setup"** |

`race.md` (uses the bitmask via `UM_RACEMODE` -- already correct) and `bloodfest.md` (vote-entry -- already different) need only a light pass for tone consistency, not the enable-fix.

### 2. Reframe the ~17 UserMode notes' Hosting (milder issue)
They show `set k_allowed_free_modes 4095` as if it's an enable step. `4095` is the config default; the bit is **restrict-only**. Reframe to *"available by default; remove the bit to restrict (bit-sharing caveat)."* Keep each note's tunables. UserModes: `1on1 2on2 3on3 4on4 10on10 XonX 2on2on2 3on3on3 4on4on4 ffa ctf hoonymode blitz2v2 blitz4v4 wipeout ca tot`.

### 3. Open structure question -- get operator brainstorm BEFORE mass-editing
Where do a mode's **enforced** settings (the `_um_init` / mode_default array values, e.g. `deathmatch 5`) live vs the admin-**tunable** knobs (`k_clan_arena_rounds`)? Current convention: 3-7 curated knobs in Hosting, full array via the `mode_default_init_array` L1 pointer. Operator is unsure this is right -- especially for bot-heavy modes (the `botcmd` family). Settle this first; it shapes every Hosting section.

### 4. The bots / frogbots gap (possibly the bigger find)
There is **no concept note for frogbots**, yet bots are used under the hood -- tot's firebot, the LGC bot benchmark, practice. Bots aren't a mode (they don't fit the game-mode shape), and the `botcmd` command family is undocumented anywhere. Likely a standalone `frogbots.md` feature note (domain-guide shape). Operator flagged this as possibly a bigger gap than it looks -- scope it (what `botcmd` covers, skill settings, which modes consume bots).

## First three actions
1. Read `server-setup.md` + the updated `section-structure.md` (`Starting a game` + `Hosting & settings` directives) + `rocket-arena.md` (worked example) + this doc.
2. Get the operator's call on **Q3 (structure)** and **Q4 (frogbots note)** -- both shape the reframe, so resolve before mass-editing.
3. Then batch the 8 toggle reframes (per the table; lgc differs), then the 17 UserMode reframes. One commit per logical batch; stage only the notes you touch (working tree carries unrelated pre-existing drift).

## Don'ts
- Don't claim `k_lgcmode` resets -- it doesn't.
- Don't repeat the bitmask / `k_defmode` / force-path mechanics in per-mode notes -- they live once in `server-setup.md`.
- Don't re-derive the hosting model -- it's verified in `server-setup.md` with citations.
