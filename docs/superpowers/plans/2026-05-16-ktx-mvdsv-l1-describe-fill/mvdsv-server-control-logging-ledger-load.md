# describe-fill-synthesis ledger -- mvdsv `load`

- **project:** mvdsv
- **knob:** `load` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:load: synthesized -- admin-only console/rcon command that loads a saved game, respawns the saved map and restores entity state; rejects mismatched save-format version (6) -- origin=synthesized ref=src/sv_save.c:237 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Loads a previously saved single-player game from a file on the server, restarting the server on the saved map and restoring the saved entity and player state. The save file must match this server's savegame format version (currently 6); a file written in a different format version is rejected.
>
> load <name> = load the game saved as <name>.sav from the server's save folder.
>
> Set by: server console / rcon.
> See also: save.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| restarts server on the saved map | src/sv_save.c:237 | `SV_SpawnServer(mapname, false, NULL, true)` | MATCH |
| restores saved entity/player state | src/sv_save.c:263-300 | `sv.loadgame = true;` ... `ED_ParseGlobals (start)` / `ED_ParseEdict (start, ent)` | MATCH |
| reads from a save file | src/sv_save.c:183 | `if (!(f = fopen (name, "rb")))` | MATCH |
| rejects incompatible save version | src/sv_save.c:194-198 | `if (version != SAVEGAME_VERSION) { ... "Savegame is version %i, not %i\n", version, SAVEGAME_VERSION }` | MATCH |
| save format version is 6 | src/sv_save.c:37 | `#define SAVEGAME_VERSION 6` | MATCH |
| path = <gamedir>/save/<name>.sav | src/sv_save.c:42,180 | `"%s/save/%s", fs_gamedir, name` ; `COM_DefaultExtension (name, ".sav")` | MATCH |
| requires one arg | src/sv_save.c:174-176 | `if (Cmd_Argc() != 2) { Con_Printf ("Usage: %s <savename>...")` | MATCH |
| admin-only (not in ucmds[]) | src/sv_user.c:3408-3424 | client stringcmd loop over `ucmds`, else `"Bad user command"` | MATCH |
| no KTX override | ktx/src (grep) | only FrogBot QC classname `"load"` bot_load.c:29 | MATCH (unrelated) |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Loads a previously saved **single-player** game from a file on the server | src/sv_save.c:164,183 / src/sv_save.c:102 / src/sv_init.c:316,319 | `void SV_LoadGame_f(void)` ... `f = fopen(name,"rb")`; save gate `deathmatch.value != 0 \|\| coop.value != 0 \|\| maxclients.value != 1`; on load `Cvar_SetValue(&deathmatch,0)` / `Cvar_SetValue(&maxclients,1)` | MATCH |
| 2 | "or **cooperative** game" | src/sv_save.c:102 (save gate) + src/sv_init.c:317,319 (load force) | save: `else if (deathmatch.value != 0 \|\| coop.value != 0 \|\| maxclients.value != 1) { Con_Printf("Can't save multiplayer games.\n"); return; }` ; load: `Cvar_SetValue(&coop, 0);` and `Cvar_SetValue(&maxclients, 1);` | MISMATCH (C-FIX) -- coop save is rejected at write time; load forcibly sets coop=0 + maxclients=1. No cooperative path exists on either side. |
| 3 | restarting the server on the saved map | src/sv_save.c:221,237 | `fscanf(f,"%s\n",mapname)` then `SV_SpawnServer(mapname, false, NULL, true)` (4th arg loading_savegame=true) | MATCH |
| 4 | restoring the saved entity and player state | src/sv_save.c:289-304 (entities/globals), 311-312 (spawn_parms) | `ED_ParseGlobals(start)` / `ED_ParseEdict(start, ent)` / `SV_LinkEdict(...)`; `svs.clients->spawn_parms[i] = spawn_parms[i]` | MATCH |
| 5 | file must have been written by **this server version**; incompatible version rejected | src/sv_save.c:37,194,196 (+comment 213) | `#define SAVEGAME_VERSION 6`; `if (version != SAVEGAME_VERSION) { fclose(f); Con_Printf("Savegame is version %i, not %i\n", version, SAVEGAME_VERSION); return; }` ; line 213 comment `// ... so we can load 1.06 save files` | MATCH-with-imprecision -- gate is the savegame FORMAT version (6), not the MVDSV build version. Older 1.06 saves at v6 are explicitly accepted. "this server version" overstates the check. C-NEAR-MISS grade. |
| 6 | `load <name>` -> loads `<name>.sav` from save folder | src/sv_save.c:179,180,42 + src/bothtools.c:621-634 | `SV_SaveGameFileName(name,...,Cmd_Argv(1))` -> `"%s/save/%s"` (fs_gamedir); `COM_DefaultExtension(name, ".sav")` (appends only if no extension) | MATCH (`.sav` is the default-appended ext; folder = `<gamedir>/save/`) |
| 7 | Set by: server console / rcon | src/sv_ccmds.c:1871-1872 (outside SERVERONLY guard) + src/cmd.c:706 + src/sv_main.c:1828 | `Cmd_AddCommand("load", SV_LoadGame_f)` (no client-cmd flag); rcon dispatch `Cmd_ExecuteString(str)` | MATCH |
| 8 | See also: save | src/sv_save.c:82 + src/sv_ccmds.c:1871 | `void SV_SaveGame_f(void)` registered as `save` adjacent to `load` | MATCH |

**V-pass notes:** VERDICT: C-FIX. Oracle confirmed mvdsv @ 1.11-53-g18d0362.

THE DEFECT (clause 2, "or cooperative game"): MVDSV's savegame system is single-player ONLY. Two independent enforcing sites contradict the "cooperative" claim:
  - WRITE side: SV_SaveGame_f (sv_save.c:102) refuses to write any save when `coop.value != 0` (also dm!=0 or maxclients!=1) -> "Can't save multiplayer games." So no coop .sav can ever be produced by this server.
  - READ side: SV_LoadGame_f calls SV_SpawnServer(..., loading_savegame=true), and that branch (sv_init.c:314-324) FORCES deathmatch=0, coop=0, teamplay=0, maxclients=1, sv_progsname="spprogs". So even a hand-crafted coop save would be loaded into a forced single-player config.
This is a classic flavour-C inheritance: NetQuake/Quake upstream `load` does support coop saves, and the word "cooperative" almost certainly came from that lineage / the knob's general reputation -- not from MVDSV's enforcing code, which actively prevents it. Invisible at output inspection; only the enforcement trace exposes it.

RECOMMENDED FIX for clause 2: drop "or cooperative" -- describe as "a previously saved single-player game." (If desired, can add that the save/load path forces a single-player configuration, i.e. deathmatch/coop/teamplay off and maxclients 1.)

SECONDARY (clause 5, not the row-driver): "written by this server version" is imprecise. The reject gate compares the file's format version integer to SAVEGAME_VERSION (=6), NOT the MVDSV build/release version. The code even has an explicit accommodation (comment at sv_save.c:213) for loading 1.06-era saves whose skill was a float. A different MVDSV build sharing format v6 loads fine; an NQ save at a different format version is rejected. More accurate phrasing: "must use the server's savegame format version (rejected otherwise)." This is C-NEAR-MISS grade on its own; row stays C-FIX because of clause 2.

Everything else (single-player framing, map restart, entity/player-state restore, .sav default extension, save-folder path, console/rcon access, see-also save) traced clean to enforcing lines.

## flags_for_review

- [blocker/contradiction/vpass] MVDSV savegame (save/load) is single-player ONLY by enforcement: SV_SaveGame_f (src/sv_save.c:102) rejects coop/dm/multiclient saves, and SV_SpawnServer loading_savegame branch (src/sv_init.c:314-324) forces deathmatch=0, coop=0, teamplay=0, maxclients=1, sv_progsname=spprogs on every load. The proposed description's 'or cooperative game' is contradicted on BOTH the write and read paths -- likely inherited from upstream NetQuake `load` semantics where coop saves are supported.
- [review/other/vpass] Clause 5 framing imprecision: the version-reject check (src/sv_save.c:194) gates on the savegame FORMAT version (SAVEGAME_VERSION = 6, src/sv_save.c:37), not the MVDSV build/release version. Comment at src/sv_save.c:213 explicitly accommodates older 1.06 saves. 'written by this server version' overstates the gate; correct concept is 'savegame format version'.
- [fyi/off-scope-entity/vpass] The save/load commands are registered OUTSIDE the #ifdef SERVERONLY block in SV_InitOperatorCommands (src/sv_ccmds.c:1871-1872; the SERVERONLY guard starts at line 1874). They therefore register in both qwsv (SERVERONLY) and the client-embedded server build. The SERVERONLY save-path uses fs_gamedir ('%s/save/%s', src/sv_save.c:42); the non-SERVERONLY path uses FS_SaveGameDirectory(), which has no definition inside this repo's src/ (only a call site) -- presumably client-side. For the MVDSV dedicated-server oracle the SERVERONLY path is authoritative; no action needed, recorded for completeness.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "load",
  "type": "command",
  "description": "Loads a previously saved single-player game from a file on the server, restarting the server on the saved map and restoring the saved entity and player state. The save file must match this server's savegame format version (currently 6); a file written in a different format version is rejected.\n\nload <name> = load the game saved as <name>.sav from the server's save folder.\n\nSet by: server console / rcon.\nSee also: save.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_save.c:237. Handler SV_LoadGame_f registered at src/sv_ccmds.c:1872 (Cmd_AddCommand) -> body src/sv_save.c:164-300+. WHAT (restarts on saved map, restores state): reads file src/sv_save.c:183 (fopen 'rb'), parses header/skill/mapname/time src/sv_save.c:188-230, then SV_SpawnServer(mapname,...) at src/sv_save.c:237 (re-spawns the server on the saved map -- the authoritative observable effect), restores lightstyles src/sv_save.c:246-257, sets sv.loadgame and parses globals + per-edict state in the load loop src/sv_save.c:263,266-300+ (ED_ParseGlobals / ED_ParseEdict). 'File from this server version only': version compared to SAVEGAME_VERSION at src/sv_save.c:194-198 ('Savegame is version %i, not %i') with SAVEGAME_VERSION defined 6 at src/sv_save.c:37; described in admin terms as 'written by this server version' (the .sav format version, not a numeric the admin sets). Path '<gamedir>/save/<name>.sav': SV_SaveGameFileName SERVERONLY branch src/sv_save.c:40-43 + COM_DefaultExtension '.sav' src/sv_save.c:180; mvdsv builds -DSERVERONLY (CMakeLists.txt:169). Requires exactly one arg: src/sv_save.c:174-176 (Cmd_Argc()!=2 -> usage). Admin-only access class: not in ucmds[] (grep src/sv_user.c:3299-3400) and SV_ExecuteUserCommand (src/sv_user.c:3408-3424) has no fall-through from client stringcmds to console commands, so Cmd_AddCommand-only = console/rcon. F-MV1: ktx/src has no override of 'load' (grep matches are FrogBot internals -- bot_load.c QC classname, unrelated). Default omitted (no-arg prints usage).",
  "description_proposed": null
}
```
