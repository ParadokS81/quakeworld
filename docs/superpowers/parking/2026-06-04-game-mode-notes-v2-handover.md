# Game-mode concept-notes v2 -- fresh-terminal handover (2026-06-04)

**Date:** 2026-06-04. **Status:** singletons (`ffa` / `race` / `instagib`) + PvE pair (`tot` / `bloodfest`) complete this session. **All 27 modes + `dmm4` are now on v2.** Only `rocket-arena` (outside the 27) remains as a mode note; the rest of the open work is the skill backport + two touch-ups. Supersedes `2026-06-03-game-mode-notes-v2-handover.md`. Pick up cold in a fresh terminal.

## Where things are

**The full 27-mode v2 corpus + `dmm4` is shipped and pushed.** This session added the last five:

| Note | Commit | One-line |
|---|---|---|
| `instagib` | `86359e9a` | novelty mutator; closed midair/lgc's dangling `incompatible-with` refs; fixed scoring (coil 1 / axe 2 / stomp 4) + airgib error |
| `ffa` | `e9b2494c` | free-for-all standalone; matchless-vs-match duality; v1 was source-accurate |
| `race` | `487713b6` | movement standalone; first real `Settings to tune`; F1 points 25/18/15/... verified |
| `tot` | `9f4bb4a3` | solo-pve bot-blaster; per-map config hook; frogbot defaults skill 15 / quad-base 4 |
| `bloodfest` | `7bdaa8ae` | solo-pve monster survival; per-monster reward table; boss dead-code; per-map drop config |

Each note's commit body carries its full source-verification audit trail (every number/cvar/interlock cited to `file:line`) -- read the relevant commit if you need the cites. Commits interleave with a parallel MVDSV describe-fill session on `main` -- expected.

## The locked rules (v2 methodology) + THIS SESSION'S REFINEMENTS

The four methodology docs in `apps/qw-oracle/curated/concept-notes/_methodology/game-modes/` are the structural authority; read `concept-note-section-structure.md` first. Structure:

```
Summary | Activate | Basic ruleset | (Settings to tune) | How it plays (+ ### subsections) | (Maps) | (History) | Hosting & settings | See also
```

**CRITICAL: five refinements were locked this session by operator co-edit and are NOT yet written into the `_methodology/` docs. Apply them now; the skill-backport task must fold them into the docs + skill.**

1. **`Basic ruleset` = cvar-led, one per line.** Lead each bullet with the enforced cvar -- `` **`deathmatch 3`** -- weapons stay... `` -- left-aligned, one value per line, a scannable menu. Do NOT bury cvars mid-sentence in prose. **Exception:** behavioral-rule modes (`instagib` `midair` `lgc` `killquad` `freshteams` `nosweep` `yawnmode`) keep bold *prose labels* (`**Every hit kills** -- ...`) because their rules are handler-set with no cvar to lead with. (Audited 2026-06-04: every cvar-driven preset already conformed; `ffa` was the lone fix.)
2. **`Hosting & settings` = show-and-tell, never a prose blob.** Shape: a one-line availability statement (what to do to allow it) -> a code block (server.cfg, or the per-map config) -> a short cvar list (one per line: `` **`cvar`** (default) -- effect ``) -> optional one-line wrinkle. Calibrate against `midair` / `race` / `ca` / `berzerk`. It answers the admin's two questions only: *is it allowed*, and *what are the relevant settings*.
3. **Activation lives in ONE place -- `Activate` -- and says HOW only.** Never restate the start mechanism in `Summary` or `Hosting`; never document "how NOT to start" (a disabled command, etc.). (The section spec already bans activation steps in `Summary`; enforce it.)
4. **`Summary` is a hook, not a how-to.** The **frontmatter `summary:`** field IS read in isolation -- the MCP `search_concepts` tool returns it as the result snippet -- so it must be self-contained, but carry the *experience/what-it-is*, not activation or the ruleset. The **`## Summary` body section** is only read with the full note (`get_concept_note`), so keep it a lean wiki-lead with minimal overlap. **OPEN methodology question (operator flagged):** slim or drop the `## Summary` body section globally, since the frontmatter already covers the isolation case -- decide in the backport.
5. **De-dup hard; draft tight.** One home per fact. The operator reads and co-edits every note for terseness + de-dup -- the source-verification and structure are yours, the final phrasing is his.

Other locked rules (unchanged from prior handover): access split (`Basic ruleset` = enforced preset, body-complete, never defer to the dead `mode_default_init_array` pointer; `Settings to tune` = in-game player commands, omit if none; `Hosting` = admin/server.cfg surface). Mutators carry `kind: mutator`, omit queryable frontmatter facts. `activation_summary` is retired (drop it). Conditional sections absent-not-empty.

## Critical gotchas (carry forward -- this session hammered all of them)

- **Source is truth; RE-VERIFY every inherited v1 claim against the handler.** v1 prose is regularly wrong -- this session caught: instagib's airgib ("both off the ground" -> actually attacker grounded / target airborne, `client.c:5020`); tot's bot skill ("default 10" -> 15); bloodfest's reward table (wiki's "flat +3/+2" wrong; the per-monster table `sp_monsters.c:60-76` is right), bloodfest's boss (v1 claimed live; it's dead code), bloodfest's wave cadence (v1 cited `k_monster_spawn_time`; it's a hardcoded const).
- **Distinguish dead/disabled code from live features.** instagib's AirGib-Master rune is commented out (`client.c:5064`); bloodfest's boss never spawns (`k_bloodfest_boss_chance = -1` static const -> `g_random() < -1` always false, `sp_monsters.c:359`). Don't document dead features as live -- omit, and flag to operator.
- **A cvar's `RegisterCvar` default != its value in the mode.** The `_um_init` preset OR a per-map config overrides it. Always read the preset/config, not just the registration. Examples: race `k_race_simultaneous` registers `0` but the preset sets `1` (`race.c:308`); tot `k_fb_quad_multiplier` base `4` but preset sets `8` (`commands.c:4520`); bloodfest droprate engine-default `0.15` but `bloodfest.cfg` sets `0.04`.
- **Per-map configs are a real, load-bearing mechanism.** UserMode modes exec `configs/usermodes/<mode>/{default,<map>}.cfg` (each overriding, `commands.c:4796-4835`); coop/bloodfest execs `configs/usermodes/matchless/<map>.cfg` (`vote.c:1148`). These SHIP with KTX (`research/repos/ktx/resources/example-configs/`) and nquake (`research/repos/nquake-distfiles/sv-configs/`) and override the preset -- this is how tot's per-map challenges and bloodfest's per-map drops work.
- **Operator is the authority on live/community facts.** He supplied frogbot defaults the source doesn't `RegisterCvar` (skill 15 / quad-base 4), confirms map pools, and knows community history. Bring source-verified MECHANICS; let him confirm community/live values. When source and operator conflict (tot quad `8` in source vs his "base `4`"), reconcile (preset overrides base) and surface it -- don't silently pick one.
- **The `game-mode-curate` SKILL is STALE for structure** (v1 section set, retired `activation_summary`, reversed conformance claims). Drive structure off the `_methodology/` docs + this handover. Backport pending (task #2).
- **Parallel session shares the main tree.** Use file-targeted `git add <path>` (never `-A`/`.`); run `git diff --cached --stat` before every commit; commits interleave -- expected, not drift.

## Environment / source locations

- **KTX source:** `research/repos/ktx/src/` (+ `research/repos/ktx/include/` for headers like `g_local.h` UM bits, `g_consts.h` IT_ weapon bits, `fb_globals.h` FB_CVAR_ names). Version `1.47-2-g67253dc`.
- **`fd` is NOT installed** -- use `find` / `grep`. (Earlier `fd` calls silently returned nothing.)
- **Wiki snapshots:** `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/<Page>.json`.
- **Shipped server configs (per-map):** `research/repos/ktx/resources/example-configs/ktx/configs/usermodes/...` and `research/repos/nquake-distfiles/sv-configs/ktx/configs/usermodes/...`.

## Remaining work

1. **`game-mode-curate` skill backport (RECOMMENDED NEXT -- gates fan-out).** Update `SKILL.md` to the v2 section set + frontmatter (drop `activation_summary`; add `Activate` / `Basic ruleset` / `Settings to tune`), fix the "shape reference" (ctf/ca/etc. are done v2), AND fold in this session's five refinements (above) -- writing them into BOTH the skill and the `_methodology/` docs (esp. `concept-note-section-structure.md`). Resolve the open `## Summary` question while there. Flagged on ~10 commit bodies.
2. **`rocket-arena`** -- the last mode note, outside the 27 (`/arena`, `k_rocketarena`; a 1on1 winner-stays duel, NOT `/carena`, NOT Clan Arena). The lone "create the slug" case -- no `gameplay_mechanics` row; anchor on the command entity like `dmm4` did.
3. **`deathmatch-modes` reference note** -- needs the stale "dmm5 absent from KTX" correction (KTX uses `deathmatch 5` for arena; what's absent is KTPro's dmm5-8 *gametypes*). See `experience-group-classification.md` "The dmm commands".
4. **`killquad` de-dup touch-up** -- on v2 but predates the 2026-06-01 de-dup rules; its `Hosting` restates gameplay. Trim to admin-only.
5. **`server-setup.md`** -- still PARKED/cross-domain (KTX + MVDSV + qtv-go). Good-enough KTX deferral target as-is.

## The recast process (repeatable, per mode note)

1. Read the existing v1 note + `concept-note-section-structure.md`.
2. **Pre-flight from source** -- the `_<mode>_um_init` preset (`commands.c`) or the mode's settings array, the UM bit (`include/g_local.h:693-705`), the mode_cmd entry (`commands.c:4537+`), the relevant handler (spawn loadout / scoring / win condition), AND any per-map config that overrides the preset. KTX `k_*` carry NULL in L1 -- values come from source.
3. **Re-verify every inherited value/claim against the handler** (not the init array alone, not the wiki, not v1 prose). Check for dead/disabled code. Mutators: verify interlock guards at the Toggle handler before `incompatible-with`.
4. Recast into the v2 sections; apply cvar-led `Basic ruleset`, show-and-tell `Hosting`, activation-in-one-place, lean hook `Summary`, de-dup.
5. Show the operator the prose (he reads every one). Iterate -- he co-edits for terseness/de-dup, confirms map pools + live/community values.
6. Write + commit per note (file-targeted `git add`; `git diff --cached --stat` before commit; commit body = full source-cite audit trail; `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`). Push at natural checkpoints.

## First three actions (cold start)

1. Read the four `_methodology/` docs + this handover's "locked rules + refinements" (the refinements are NOT yet in the docs). Skim 2-3 v2 exemplars for shape: `race` (rich standalone + `Settings to tune`), `midair` (mutator), `bloodfest`/`tot` (solo-pve, per-map configs, show-and-tell Hosting).
2. Confirm the next task with the operator -- **skill backport** is recommended (overdue, gates fan-out, captures this session's refinements); `rocket-arena` / the touch-ups are the alternatives.
3. For the backport: read the stale `SKILL.md` + the `_methodology/` docs, draft the doc+skill updates folding in the five refinements, show the operator. For a mode note: pull the L1 row + preset + UM bit + handler + per-map config from source before drafting.

## When in doubt

The operator works at intent level (player experience, useful-vs-noise, terseness, structure-matches-siblings). Bring mechanical facts verified against the handler and the per-map configs, not against v1 or the wiki. Describe the mode in front of you; activation in one place; Hosting as show-and-tell; never repeat a fact across sections. Draft tight and let him co-edit the phrasing.
