# describe-fill-synthesis ledger -- mvdsv `deathmatch`

- **project:** mvdsv
- **knob:** `deathmatch` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:deathmatch: synthesized -- F-MV1 compat cvar; engine enforces only 0-vs-nonzero spawn filter (pr_edict.c:1011), mode-number rules are mod-governed (KTX); cross-mod flag raised -- origin=synthesized ref=src/pr_edict.c:1011 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Selects the deathmatch game mode for the server. 0 turns deathmatch off (the world spawns as a single-player / co-op map, keeping single-player-only items); any non-zero value runs a deathmatch game, with the specific mode the number selects enforced by the game mod (e.g. KTX). Forced to 0 while co-op is on.
>
> Default: 3.
> Set by: server config / rcon (published in server info).
> See also: ktx-game-modes.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| non-zero removes single-player-only items at map load | src/pr_edict.c:1011-1018 | `if ((int)deathmatch.value) { if (((int)ent->v->spawnflags & SPAWNFLAG_NOT_DEATHMATCH)) { ED_Free (ent); inhibit++; continue; } }` | MATCH |
| 0 = single-player/co-op world (skill-spawnflag branch runs instead) | src/pr_edict.c:1020-1024 | `else if ((current_skill == 0 && ...NOT_EASY)...) ED_Free (ent);` | MATCH |
| default 3, serverinfo | src/sv_main.c:166 | `cvar_t deathmatch = {"deathmatch","3",CVAR_SERVERINFO};` | MATCH |
| forced to 0 while coop on | src/sv_init.c:339-340 | `if ((int)coop.value) Cvar_Set (&deathmatch, "0");` | MATCH |
| value-number semantics enforced by mod, not engine (KTX reads by name) | ktx src/world.c:1558 | `int dm = deathmatch = cvar("deathmatch");` | MATCH |
| no mvdsv engine read of mode numbers (only 0-vs-nonzero) | src (grep) | only reads: pr_edict.c:1011 (bool), sv_save.c:102 (!=0), sv_init.c set-sites, sv_init.c:583 NQ-only copy, sv_demo_misc.c demo meta | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | "Selects the deathmatch game mode for the server" (purpose) | src/sv_main.c:166 ; src/pr_edict.c:1011 | `cvar_t deathmatch = {"deathmatch","3",CVAR_SERVERINFO};` / `if ((int)deathmatch.value)` | MATCH |
| 2 | "0 turns deathmatch off" (OFF polarity) | src/pr_edict.c:1011-1019 | `if ((int)deathmatch.value){ if(...SPAWNFLAG_NOT_DEATHMATCH){ ED_Free; ... }}` -- 0 takes the else branch | MATCH |
| 3 | OFF "spawns as a single-player / co-op map, keeping single-player-only items" | src/pr_edict.c:1011-1027 ; src/server.h:691 | else-branch applies skill filtering (NOT_EASY/MEDIUM/HARD) and does NOT remove `SPAWNFLAG_NOT_DEATHMATCH (2048)` items -> SP/coop items retained | MATCH |
| 4 | "any non-zero value runs a deathmatch game" (ON / threshold) | src/pr_edict.c:1011 | `if ((int)deathmatch.value)` -- engine treats any non-zero as deathmatch-on (boolean) | MATCH |
| 5 | "specific mode the number selects enforced by the game mod (e.g. KTX)" (cross-mod) | engine: src/pr_edict.c:1011 (boolean only) ; mod: research/repos/ktx/src/match.c:865,875,917 ; ktx/src/teamplay.c:415-422 | KTX branches on exact values: `if(deathmatch==2)`, `if(deathmatch>=4)`, `if(deathmatch==4)`, `deathmatch>=1 && deathmatch<=4` -- engine does not decode the number, the mod does | MATCH |
| 6 | "Forced to 0 while co-op is on" (side-effect) | src/sv_init.c:339-340 | `if ((int)coop.value)` -> `Cvar_Set (&deathmatch, "0");` | MATCH |
| 7 | "Default: 3" (metadata, WI-2) | src/sv_main.c:166 | `cvar_t deathmatch = {"deathmatch","3",CVAR_SERVERINFO};` -- registered default is literal "3" | MATCH |
| 8 | "Set by: server config / rcon (published in server info)" (access-class, WI-2) | src/cvar.h:62 ; src/sv_main.c:166 ; src/sv_ccmds.c:1442-1445,1889 ; src/cvar.c:107-114 | CVAR_SERVERINFO=(1<<0) set, NO CVAR_ROM -> writable; settable via cvar or server-console cmd `serverinfo` (`Cmd_AddCommand("serverinfo",...)`); special-cased to stay in serverinfo even at "0" | MATCH |
| 9 | "See also: ktx-game-modes" (cross-ref pointer, not a code clause) | research/repos/ktx/src/match.c, teamplay.c (value-decoding read-sites) | KTX is the consumer that maps the numeric value to modes | MATCH (pointer) |

**V-pass notes:** Every material clause (polarity, threshold, OFF-state, side-effect, cross-mod scope, default, access-class) maps to a located, verified enforcing line incl. adjacent comments. Engine semantics: mvdsv reads `deathmatch` only as a BOOLEAN -- `(int)deathmatch.value` at pr_edict.c:1011 gates entity-spawn filtering (non-zero removes SPAWNFLAG_NOT_DEATHMATCH items; zero instead applies skill-level filtering and keeps SP/coop items). The numeric MEANING (1/2/3/4/5 = specific modes) lives entirely in the mod -- verified directly against KTX read-sites (match.c, teamplay.c, bot_*.c) which branch on exact deathmatch values. This makes clause 5 ("specific mode enforced by the game mod (e.g. KTX)") a precise, correct split of engine-vs-mod responsibility rather than an inference. Co-op forcing (clause 6) is one-directional and confirmed verbatim at sv_init.c:339-340. Default 3 is the REGISTERED default (sv_main.c:166), not a cfg value -- WI-2 clean. Access-class: CVAR_SERVERINFO with no CVAR_ROM, settable via config/rcon/server-console `serverinfo` command -- no admin-class or match-lock gate in the engine; WI-2 clean. Two minor incompletenesses noted (NOT defects, classification stays TRACED-CLEAN): (a) the OFF-state branch ALSO applies skill-level entity filtering, which the description folds implicitly into "single-player / co-op map" rather than spelling out; (b) deathmatch is additionally forced to 0 on savegame load (sv_init.c:316), an SP-only edge path beyond the co-op forcing the description names. Both are still-true omissions of secondary detail, traceable, acceptable per the enum's "still-true minor vagueness" allowance.

## flags_for_review

- [review/cross-mod-override/synthesis] F-MV1 cross-mod override: mvdsv stores `deathmatch` in serverinfo and only enforces a 0-vs-nonzero spawn filter (pr_edict.c:1011) + coop-forces-0 (sv_init.c:340); the actual game-mode rules keyed on the value (deathmatch==2/==4/>=4 etc.) live in KTX, which loads `deathmatch = cvar("deathmatch")` at world.c:1558 and branches/overwrites in match.c. The per-value (1/2/3/4/5) semantics are KTX's and were routed to See also: L3 rather than asserted as engine behavior.
- [fyi/cross-mod-override/vpass] Cross-mod L3: the entire numeric semantics of deathmatch (values 1-5 selecting concrete modes) is enforced ONLY in the KTX mod, not in mvdsv. mvdsv reads it as a pure boolean (pr_edict.c:1011). KTX decodes exact values at match.c:865 (==2), match.c:875 (>=4), match.c:917 (==4), teamplay.c:415-422 (1..4 range), bot_botstat.c:113/236 (==4), bot_client.c:249 (<=3). The 'See also: ktx-game-modes' pointer and clause 5 are well-grounded by these read-sites. Worth confirming the ktx-game-modes concept note enumerates these specific numeric meanings since the engine L1 cannot.
- [fyi/other/vpass] OFF-state has a third forcing condition not in the description: sv_init.c:316 Cvar_SetValue(&deathmatch,0) inside the loading_savegame branch (alongside coop=0, teamplay=0, maxclients=1). This is an SP-savegame-only path, so not a general-behavior gap, but it is a second engine site that forces deathmatch off besides the co-op interaction at sv_init.c:339-340.
- [fyi/other/vpass] serverinfo special-case: cvar.c:107-114 (Cvar_ServerInfoValue) and the meag comment at cvar.c:110-111 deliberately keep deathmatch in serverinfo even when value is '0' (unlike all other serverinfo cvars which are stripped to empty at value 0), because clients default a missing deathmatch key to non-coop. This supports the 'published in server info' clause at ALL values, including 0 -- a non-obvious detail that strengthens, not weakens, the description.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "deathmatch",
  "type": "cvar",
  "description": "Selects the deathmatch game mode for the server. 0 turns deathmatch off (the world spawns as a single-player / co-op map, keeping single-player-only items); any non-zero value runs a deathmatch game, with the specific mode the number selects enforced by the game mod (e.g. KTX). Forced to 0 while co-op is on.\n\nDefault: 3.\nSet by: server config / rcon (published in server info).\nSee also: ktx-game-modes.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pr_edict.c:1011. F-MV1 compatibility cvar: mvdsv stores the value and the game mod enforces the mode. The ONE genuine engine-side gameplay read is pr_edict.c:1011 `if ((int)deathmatch.value)` -> entities flagged SPAWNFLAG_NOT_DEATHMATCH are freed at map load (pr_edict.c:1013-1018), i.e. non-zero = single-player-only items removed; 0 = single-player/co-op world (the spawnflag-NOT_EASY/MEDIUM/HARD skill branch runs instead). Registered default \"3\", CVAR_SERVERINFO at sv_main.c:166. Forced to 0 when coop is on: sv_init.c:339-340 `if ((int)coop.value) Cvar_Set(&deathmatch,\"0\")`; also forced to 0 on savegame load sv_init.c:316. Serverinfo special-case cvar.c:111 keeps deathmatch in serverinfo even when \"0\" (other 0-cvars are blanked). Copied to NQ progs global pr_globals[35] ONLY when pr_nqprogs (sv_init.c:583); not relevant to QW progs. The mode-NUMBER meanings (1/2/3/4/5) are NOT enforced by mvdsv -- they are read by name in the mod: KTX loads `deathmatch = cvar(\"deathmatch\")` at ktx world.c:1558 and branches on the value (match.c:865 deathmatch==2, :875 >=4, :917/:843 ==4 instagib/midair) and even overwrites it; so the per-value semantics route to See also: L3, not L1 prose. sv_save.c:102 reads deathmatch.value!=0 to block multiplayer savegame. cmodel/protocol untouched. enum spelled only to the 0-vs-nonzero boundary that mvdsv itself enforces.",
  "description_proposed": null
}
```
