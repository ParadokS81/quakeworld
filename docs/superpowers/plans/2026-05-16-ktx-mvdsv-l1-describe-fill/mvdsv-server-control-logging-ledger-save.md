# describe-fill-synthesis ledger -- mvdsv `save`

- **project:** mvdsv
- **knob:** `save` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:save: synthesized -- admin-only console/rcon savegame for a single-player/coop local game (refuses multiplayer); writes <gamedir>/save/<name>.sav -- origin=synthesized ref=src/sv_save.c:127 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Saves the current single-player game to a file on the server, recording the map, player spawn parameters, skill level, and all entity state so it can be reloaded later with 'load'. Only works for a local, non-deathmatch game with one human player who is alive; it refuses to save while a multiplayer match is running.
>
> save <name> = write the current game to <name>.sav in the server's save folder.
>
> Set by: server console / rcon.
> See also: load.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| writes game state to file | src/sv_save.c:127,135-157 | `fopen (fname, "w")` ... `fprintf (f, "%s\n", sv.mapname)` / `ED_WriteGlobals (f)` / `ED_Write (f, EDICT_NUM(i))` | MATCH |
| path = <gamedir>/save/<name>.sav | src/sv_save.c:42,124 | `snprintf(buffer,...,"%s/save/%s", fs_gamedir, name)` ; `COM_DefaultExtension (fname, ".sav")` | MATCH |
| SERVERONLY is the live build | CMakeLists.txt:169 | `target_compile_definitions(${PROJECT_NAME} PRIVATE SERVERONLY)` | MATCH |
| requires one arg | src/sv_save.c:88-90 | `if (Cmd_Argc() != 2) { Con_Printf ("Usage: %s <savefname>..."` | MATCH |
| rejects '..' traversal | src/sv_save.c:91-93 | `else if (strstr(Cmd_Argv(1), "..")) { Con_Printf ("Relative pathfnames are not allowed.\n")` | MATCH |
| refuses multiplayer / requires single alive human | src/sv_save.c:102-104,107-121 | `if (deathmatch.value != 0 || coop.value != 0 || maxclients.value != 1)` ; `svs.clients[0].edict->v->health <= 0 ... "Can't save game with a dead player"` | MATCH |
| requires active local game | src/sv_save.c:94-96 | `else if (sv.state != ss_active) { Con_Printf ("Not playing a local game.\n")` | MATCH |
| admin-only (not in ucmds[]) | src/sv_user.c:3408-3424 | `for (u=ucmds ; u->name ; u++)` ... `else Con_Printf("Bad user command: %s\n", Cmd_Argv(0))` | MATCH |
| no KTX override | ktx/src (grep) | only FrogBot `{ "save", FrogbotSaveBotFile, ...}` bot_commands.c:2345 | MATCH (unrelated) |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Saves the current single-player **or cooperative** game" | src/sv_save.c:102-104 | `} else if (deathmatch.value != 0 || coop.value != 0 || maxclients.value != 1) {` / `Con_Printf ("Can't save multiplayer games.\n"); return;` | **MISMATCH** -- guard REFUSES when `coop.value != 0`. A cooperative game cannot be saved; the only savable case is single-player (coop=0, deathmatch=0, maxclients=1). |
| 2 | "recording the map" | src/sv_save.c:141 | `fprintf (f, "%s\n", sv.mapname);` | MATCH |
| 3 | "player spawn parameters" | src/sv_save.c:138-139 | `for (i = 0 ; i < NUM_SPAWN_PARMS; i++)` / `fprintf (f, "%f\n", svs.clients->spawn_parms[i]);` (NUM_SPAWN_PARMS=16, server.h:136) | MATCH |
| 4 | "skill level" | src/sv_save.c:140 | `fprintf (f, "%d\n", current_skill);` (current_skill = active skill, sv_init.c:341) | MATCH |
| 5 | "all entity state" | src/sv_save.c:152-156 | `ED_WriteGlobals (f);` / `for (i = 0; i < sv.num_edicts; i++) { ED_Write (f, EDICT_NUM(i)); ...}` (+ light styles :145-150, unmentioned but consistent) | MATCH |
| 6 | "reloaded later with 'load'" | src/sv_ccmds.c:1872; src/sv_save.c:164 | `Cmd_AddCommand ("load", SV_LoadGame_f);` / `void SV_LoadGame_f(void)` | MATCH |
| 7 | "Only works for a local ... game; it refuses ... multiplayer match running" | src/sv_save.c:94-95 | `} else if (sv.state != ss_active) { Con_Printf ("Not playing a local game.\n");` | MATCH |
| 8 | "non-deathmatch game" | src/sv_save.c:102-103 | `deathmatch.value != 0 ... Con_Printf ("Can't save multiplayer games.\n");` | MATCH |
| 9 | "one human player" | src/sv_save.c:102 + :107-112 + :114-116 | `maxclients.value != 1` ; `for (i = 1; i < MAX_CLIENTS; i++) if (svs.clients[i].state == cs_spawned) {...return;}` ; `if (svs.clients[0].state != cs_spawned) {...client #0 not spawned...}` | MATCH |
| 10 | "who is alive" | src/sv_save.c:117-120 | `} else if (svs.clients[0].edict->v->health <= 0) { Con_Printf ("Can't save game with a dead player\n"); // in fact, we can, but does it make sense? return;` | MATCH (deliberate guard per adjacent comment) |
| 11 | "save <name> = write to <name>.sav" | src/sv_save.c:123-124 | `SV_SaveGameFileName (fname, sizeof(fname), Cmd_Argv(1));` / `COM_DefaultExtension (fname, ".sav");` | MATCH |
| 12 | "in the server's save folder" | src/sv_save.c:42 (SERVERONLY) | `snprintf(buffer, buffer_size, "%s/save/%s", fs_gamedir, name);` | MATCH |
| 13 | "Set by: server console / rcon" | src/sv_ccmds.c:1871; src/sv_main.c:1828; src/sv_user.c:3299-3383 (absence) | `Cmd_AddCommand ("save", SV_SaveGame_f);` (outside `#ifdef SERVERONLY` say/quit block; registered in dedicated build); rcon path `Cmd_ExecuteString(str);`; NOT present in client `ucmds[]` table -> connected players cannot invoke | MATCH |
| 14 | "See also: load" | src/sv_ccmds.c:1872 | `Cmd_AddCommand ("load", SV_LoadGame_f);` | MATCH |

**V-pass notes:** Verdict C-FIX. Oracle confirmed at mvdsv 1.11-53-g18d0362. Handler SV_SaveGame_f (src/sv_save.c:82-162) is the single enforcing site for every behavioral clause; registration is src/sv_ccmds.c:1871. 13 of 14 clauses traced MATCH.

The ONE defect (clause 1, flavour-C contradiction): the opening sentence says save writes "the current single-player OR cooperative game." The guard at sv_save.c:102 is `deathmatch.value != 0 || coop.value != 0 || maxclients.value != 1` -> on ANY of those it prints "Can't save multiplayer games." and returns. Because `coop.value != 0` is a refusal condition, a cooperative game is explicitly NON-savable. The savable case is strictly single-player: coop=0 AND deathmatch=0 AND maxclients=1, exactly one spawned, alive human (client #0). The "or cooperative" phrasing reads like name/intuition inference (Quake savegames historically support coop in single-player engines) and is contradicted by the code. This is invisible at output-inspection -- the sentence is fluent and otherwise accurate -- which is the textbook flavour-C signature.

Fix direction for re-synth: drop "or cooperative"; state the savable condition as single-player only (non-deathmatch, non-coop, maxclients=1, one alive spawned human). Everything else in the description is enforcement-traced and should be preserved verbatim.

Verified secondary points that did NOT change the verdict: (a) the intermission guard (sv_save.c:98 "Can't save in intermission") is wrapped in `#ifndef SERVERONLY`, so it is ABSENT on the dedicated server build -- the description correctly omits intermission, no defect either way. (b) The dead-player guard is intentional per the adjacent source comment "// in fact, we can, but does it make sense?" -- supports clause 10. (c) `save` is reachable only from server console and rcon (Cmd_AddCommand, not in client ucmds[]); the rcon dispatch is password-gated and runs Cmd_ExecuteString -- the access-class line is correct.

## flags_for_review

- [fyi/suspected-bug/synthesis] SV_LoadGame_f (src/sv_save.c:164) does NOT carry the '..' path-traversal guard that SV_SaveGame_f has (src/sv_save.c:91-93); load passes Cmd_Argv(1) straight to SV_SaveGameFileName. Both are admin/rcon-only so impact is bounded, but it is an asymmetry an operator/upstream may want to know about.
- [fyi/hidden-family/synthesis] KTX FrogBot registers its own console subcommands named 'save' (bot_commands.c:2345, FrogbotSaveBotFile -- saves bot routing to a .bot file) and uses 'load'/'save' as QC waypoint classnames (bot_load.c:29,57). These are NOT overrides of the mvdsv engine 'save'/'load' commands (different dispatch path), but the name collision could confuse documentation consumers.
- [blocker/contradiction/vpass] Clause 1 contradicts code: description claims save writes a 'cooperative' game, but sv_save.c:102 `coop.value != 0` is an explicit refusal condition ('Can't save multiplayer games.'). Only single-player (coop=0, deathmatch=0, maxclients=1, one alive spawned human) is savable. flavour-C, invisible at output-inspection.
- [fyi/runtime-dead-suspect/vpass] Runtime-reality / near-dead command on a stock dedicated server: registered defaults are deathmatch="3" (sv_main.c:166) and maxclients="24" (sv_main.c:163). The save guard refuses unless deathmatch==0 AND coop==0 AND maxclients==1, so on an out-of-the-box MVDSV dedicated server `save` ALWAYS prints 'Can't save multiplayer games.' It is functional only on a deliberately reconfigured single-player-style server. Not a description error (the proposed text already frames it as single-player/non-deathmatch only), but the operator may want the description to note that the stock-server default makes this effectively a no-op -- and that this whole command is a legacy id-Quake singleplayer savegame path, atypical for a competitive QW server.
- [fyi/other/vpass] Build-conditional behavior the description does not surface (acceptably): the intermission refusal (sv_save.c:98-101) is `#ifndef SERVERONLY`, so the dedicated server build cannot hit it; the SAVEGAME_COMMENT also reads sv.mapname / PR_GLOBAL(killed_monsters) under SERVERONLY vs cl.* under client build (sv_save.c:56-64). For the MVDSV dedicated oracle the SERVERONLY branch is authoritative; the save-folder path is `fs_gamedir/save/` (sv_save.c:42). No defect; logged so a future re-V on the client-hosted variant knows the branch split exists.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "save",
  "type": "command",
  "description": "Saves the current single-player game to a file on the server, recording the map, player spawn parameters, skill level, and all entity state so it can be reloaded later with 'load'. Only works for a local, non-deathmatch game with one human player who is alive; it refuses to save while a multiplayer match is running.\n\nsave <name> = write the current game to <name>.sav in the server's save folder.\n\nSet by: server console / rcon.\nSee also: load.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_save.c:127. Handler SV_SaveGame_f registered at src/sv_ccmds.c:1871 (Cmd_AddCommand) -> body src/sv_save.c:82-162. WHAT (saves game state to file): file opened/written at src/sv_save.c:127 (fopen), contents written src/sv_save.c:135-157 (version, comment, spawn_parms, current_skill, sv.mapname, sv.time, lightstyles, ED_WriteGlobals + per-edict ED_Write). Path '<gamedir>/save/<name>.sav': SERVERONLY branch SV_SaveGameFileName at src/sv_save.c:40-43 ('%s/save/%s', fs_gamedir, name) + COM_DefaultExtension '.sav' at src/sv_save.c:124; mvdsv builds -DSERVERONLY (CMakeLists.txt:169, build/CMakeFiles/mvdsv.dir/flags.make:5), so the SERVERONLY path is the live one. Requires exactly one arg: src/sv_save.c:88-90 (Cmd_Argc()!=2 -> usage). Rejects path traversal: src/sv_save.c:91-93 (strstr(Cmd_Argv(1),'..')). 'Only local non-deathmatch single human, alive' enforced at src/sv_save.c:102-104 (deathmatch.value!=0 || coop.value!=0 || maxclients.value!=1 -> 'Can't save multiplayer games'), :107-112 (any other client cs_spawned -> reject), :114-116 (client #0 must be cs_spawned), :117-121 (health<=0 -> 'Can't save game with a dead player'); requires active game src/sv_save.c:94-96 (sv.state!=ss_active). Admin-only access class: not present in ucmds[] (grep of src/sv_user.c:3299-3400 block returned only download/upload entries); SV_ExecuteUserCommand (src/sv_user.c:3408-3424) dispatches client stringcmds ONLY against ucmds[]/QC progs and prints 'Bad user command' on no match (no fall-through to console commands), so a Cmd_AddCommand-only registration is console/rcon-only. F-MV1: ktx/src has no override of 'save' (grep matches are FrogBot's bot-waypoint-file save in bot_commands.c:2345 and a QC classname in bot_load.c, unrelated to this engine command). Default omitted (no meaningful no-arg behavior; no-arg prints usage).",
  "description_proposed": null
}
```
