# Promote methodology learnings to served admin/player concept notes

**Parked:** 2026-05-29 (surfaced mid game-mode methodology-reconciliation).
**Status:** future stream, waiting on trigger. Not blocking the game-mode note arc.

## The insight

A lot of genuinely user-useful knowledge produced during the game-mode work lives only in **internal** `_methodology/game-modes/` docs, which are **never served** — the concept-note loader ingests only top-level `curated/concept-notes/*.md` (non-recursive), so anything under `_methodology/` is authoring guidance for the curator, invisible to the MCP/oracle.

That's the right place for *authoring* guidance. But some of what's in there is exactly what a **user** — especially a **server-admin user** — would ask for, and it currently has no served home:

- How the game-mode classifications relate (the 10 experience groups; standalone vs mutator as mechanism-metadata; what "arena"/"standard"/"modifier" mean).
- The **hosting model**: `k_allowed_free_modes` as a bitmask (enable vs restrict), the `UM_*` bit-sharing groups, the `dmm0-5` deathmatch flags, the dynamic one-server-runs-all-modes model, matchless-FFA dedicated servers, where the per-mode configs live (`configs/usermodes/<mode>/`).

A query like *"what game modes should I run on my server?"* should pull a **server-setup** concept note + a **"what modes are available and how they relate"** concept note. Today it pulls neither — only the siloed per-mode notes (each of which has its own `Hosting & settings`, but no cross-mode overview).

## Candidate served notes (when triggered)

- **`game-modes.md`** — foundational overview. Player half: the experience-group landscape + how modes relate. Admin half: the hosting model above. (This is the "foundational how-KTX-modes-work note" already flagged as parked in `experience-group-classification.md:83`.)
- **`server-setup.md`** (or similar) — how to stand up / configure a KTX server; overlaps with the outdated, poorly-structured old-wiki admin guides we'll eventually restructure.
- Possibly a **`deathmatch-modes.md`** reference (dmm0-5 flags) — already referenced as `(pending)` from 4on4/ca/wipeout `See also`.

## Harvest sources (do NOT re-derive — these carry source-verified facts)

- `_methodology/game-modes/experience-group-classification.md` — the locked taxonomy + the 27-mode appendix + command-table triage + (post-reconciliation) the mutation interlocks + `mode_class` advisory.
- The shipped per-mode notes' `Hosting & settings` sections (4on4 / ca / wipeout / killquad) — bit-sharing prose, `k_allowed_free_modes` defaults (4095), the `UM_4ON4`=8 group.
- The bit-sharing patterns table + dmm-flags notes already verified during the methodology work.

## Verified hosting model (captured 2026-05-30, KTX `1.47-2-g67253dc`)

The spine of the future `server-setup` / `game-modes` notes. KTX wires modes **two different ways**, and an admin configures each differently -- conflating them is a real trap (it produced a wrong `Hosting` section in the `rocket-arena` note before this was nailed down).

**Family A -- UserModes (bitmask-gated).** The 17 entries in `um_list[]` (`commands.c`): the 9 rosters + `ffa` + `ctf` + `hoonymode`/`blitz2v2`/`blitz4v4` + `wipeout` + `ca` + `tot`. There is **no per-mode `k_<name>` enable cvar** for these. Configured by:
- **`k_defmode <name>`** (registered `world.c:793`, read at first map-spawn `world.c:1119`) -- the mode the server boots into.
- **`k_allowed_free_modes`** (registered `world.c:873`; gate at `commands.c:4730`) -- a bitmask of `UM_*` bits controlling which UserModes a player may switch to in-console. Default all-on = **4095** (bits 0-11). Lower it only to *restrict* the menu.
- **`UM_*` bits** (`g_local.h:693-705`): 12 contiguous bits (0-11), values 1..2048. **Bit-sharing:** ca + wipeout ride `UM_4ON4` (8); tot rides `UM_FFA` (32) -- so 17 modes over 12 bits. Bits **12-30 are unused** (~19 free slots).

**Family B -- independent cvar toggles (NOT in the bitmask).** Activated purely by their own `k_<name>` cvar: set it in `server.cfg` to force-on, leave `0` to make it player-toggleable in warmup. The bitmask does not touch these:

| Mode | cvar | base it needs |
|---|---|---|
| rocket-arena | `k_rocketarena` | 1on1 (`isRA = isDuel && k_rocketarena`) |
| midair | `k_midair` | dmm4 |
| lgc | `k_lgcmode` | dmm4 |
| instagib | `k_instagib` | dmm4 |
| berzerk | `k_bzk` | any base |
| killquad | `k_killquad` | any base |
| freshteams | `k_freshteams` | dmm1 |
| nosweep | `k_nosweep` | dmm1 |
| yawnmode | `k_yawnmode` | any base |
| race | `k_race` | (see seam) |
| bloodfest | `k_bloodfest` | coop/single only; `/bloodfest` command commented out (`commands.c:740`) |

Plus the `dmm1`-`dmm5` deathmatch-flag commands (`ChangeDM`).

**The seams (wiring is ad-hoc, not principled -- worth a sidebar in the served note):**
- **race has a `UM_` bit it doesn't use through the menu** -- `UM_RACEMODE = 1<<31` (`g_local.h:705`, lone high bit, not in the default 4095) -- yet race activates via the `k_race` toggle, not the free-modes path.
- **rocket-arena has no bit at all** -- could trivially have been a UserMode (bits 12-30 free); made a bare toggle instead. Same root cause that hid it from the L1 extractor.
- **bloodfest's command is commented out** -- pure server cvar.

**Config-recipe pattern:**
- Default to a UserMode: `set k_defmode 4on4` (+ optionally restrict via `k_allowed_free_modes`).
- Run a toggle mode permanently: set its base (via `k_defmode`) + force its cvar -- e.g. a Rocket Arena server = `set k_defmode 1on1` + `set k_rocketarena 1`. The cvar alone is inert without the base.
- Per-mode enforced settings live in `configs/usermodes/<mode>/` (e.g. `1on1/ra/default.cfg`: `fraglimit 10`, `k_mode 1`, `maxclients 10`).

**One-server-runs-all:** a single KTX server hosts every UserMode; players switch in-console (gated by `k_allowed_free_modes`). Exception: matchless FFA (dedicated public servers, no match wrapper). (From `experience-group-classification.md`.)

## Trigger

Either: (a) an admin-facing query stream emerges ("what should I run?", "how do I set up X"), or (b) the old-wiki admin-guide restructuring arc kicks off (this stream folds into it). Until then, the knowledge stays in the internal docs as the harvest source — captured here so it isn't forgotten in a drawer.

## Relation to the live arc

The game-mode **methodology reconciliation** (simplify internal docs to the experience-first flat structure) proceeds independently and is the *reason* this was surfaced: simplifying the internal docs is fine precisely because the user-facing relational/admin knowledge is meant to live in served notes (this stream), not in `_methodology/`. The reconciliation keeps the knowledge in the internal docs (as harvest source); it does not delete it.
