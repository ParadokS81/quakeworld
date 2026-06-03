# describe-fill-synthesis ledger -- mvdsv `gamedir`

- **project:** mvdsv
- **knob:** `gamedir` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:gamedir: synthesized -- admin switches the loaded gamedir (FS_SetGamedir reload at fs.c:471); empty-server guard is client-only/compiled-out on SERVERONLY, distinct from sv_gamedir display-key, KTX no override -- origin=synthesized ref=src/sv_ccmds.c:1692 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Switches the server's active game directory, changing which folder it loads maps, configs and the game progs from. With no argument it prints the current game directory.
>
> gamedir <dir> = load game data from <dir> (e.g. gamedir ktx). Accepts a single folder name only; values containing a path separator, drive letter, or '..' are rejected.
>
> Default: no argument (prints current).
> Set by: server console / rcon.
> See also: sv_gamedir (sets only the advertised *gamedir info key, without changing the loaded directory).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered as admin command (not client-issuable) | src/sv_ccmds.c:1893 | `Cmd_AddCommand ("gamedir", SV_Gamedir_f);` | MATCH (absent from ucmds[]) |
| not on normal-rcon blocklist -> console/rcon | src/sv_main.c:1754-1764 | blocklist token list; gamedir absent | MATCH |
| no-arg prints current gamedir | src/sv_ccmds.c:1664-1668 | `if (Cmd_Argc()==1){Con_Printf("Current gamedir: %s\n", fs_gamedir); return;}` | MATCH |
| takes a single dir argument | src/sv_ccmds.c:1670-1673 | `if (Cmd_Argc()!=2){Con_Printf("Usage: gamedir <newdir>\n"); return;}` | MATCH |
| rejects path separators / .. / drive | src/sv_ccmds.c:1679-1682 | `if (strstr(dir,"..") || strchr(dir,'/') || strchr(dir,'\\') || strchr(dir,':')){Con_Printf("Gamedir should be a single filename, not a path\n"); return;}` | MATCH |
| actually switches loaded dir (reload) | src/sv_ccmds.c:1692 -> src/fs.c:471-496 | `FS_SetGamedir(dir,false);` -> closes searchpaths, `filesystemchanged=true`, `FS_AddGameDirectory(...)` | MATCH |
| empty-server requirement is client-build-only (compiled out) | src/sv_ccmds.c:1684-1689 + CMakeLists.txt:169 | `#ifndef SERVERONLY\n if (CL_ClientState()){Con_Printf("you must disconnect...")...}\n#endif` ; SERVERONLY defined | MATCH (NOT enforced on dedicated server; clause omitted) |
| distinct from sv_gamedir (display-key only) | src/sv_ccmds.c:1558-1583 | `void SV_Gamedir(void){... Info_SetValueForStarKey(svs.info,"*gamedir",dir,...)}` (no FS_SetGamedir) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| C1 | Switches the server's active game directory; changes which folder loads maps/configs/progs | src/sv_ccmds.c:1692 -> src/fs.c:455,473-493 -> src/fs.c:432-444 | `FS_SetGamedir(dir,false)`; FS_SetGamedir frees `fs_searchpaths` down to base then `FS_AddGameDirectory(va("%s/%s",fs_basedir,dir),FS_LOAD_FILE_ALL)`; AddGameDirectory sets `fs_gamedir`/`fs_gamedirfile` and prepends path to `fs_searchpaths` | MATCH |
| C1b | "maps" load from gamedir | src/sv_init.c:493,499 -> src/cmodel.c:990 (FS_LoadHunkFile) -> src/fs.c:208-234 (FS_FLocateFile walks fs_searchpaths) | `CM_LoadMap("maps/%s.bsp")` resolves via `for(search=fs_searchpaths...)` | MATCH |
| C1c | "configs" load from gamedir | src/cmd.c:344 -> src/fs.c:975 (FS_LoadHunkFile) -> src/fs.c:208-234 | `Cmd_Exec_f`: `f=FS_LoadHunkFile(Cmd_Argv(1),NULL)` resolves via fs_searchpaths | MATCH |
| C1d | "game progs" load from gamedir | src/pr_edict.c:1163-1172 (FS_LoadHunkFile "qwprogs.dat"/"progs.dat") -> src/fs.c:208-234 | `progs=(dprograms_t*)FS_LoadHunkFile("qwprogs.dat",&filesize)` resolves via fs_searchpaths | MATCH |
| C2 | No-arg prints current game directory | src/sv_ccmds.c:1664-1667 | `if (Cmd_Argc()==1){Con_Printf("Current gamedir: %s\n",fs_gamedir);return;}` | MATCH |
| C3 | `gamedir <dir>` loads game data from `<dir>`; single folder name only | src/sv_ccmds.c:1670-1676,1692 | `if (Cmd_Argc()!=2){Con_Printf("Usage: gamedir <newdir>\n");return;}` then `dir=Cmd_Argv(1)` -> `FS_SetGamedir(dir,false)` | MATCH |
| C4 | Values with path separator, drive letter, or '..' rejected | src/sv_ccmds.c:1678-1681 (and reinforced src/fs.c:457-461) | `if (strstr(dir,"..")||strchr(dir,'/')||strchr(dir,'\\')||strchr(dir,':')){Con_Printf("Gamedir should be a single filename, not a path\n");return;}` -- `:` = drive-letter reject; `/`,`\\` = separators; `..` = parent-traversal | MATCH |
| C5 (meta) | Default: no argument (prints current) | src/sv_ccmds.c:1664-1667 | command (not cvar); no-arg branch is the "default" behavior | MATCH |
| C6 (meta) | Set by: server console / rcon | src/sv_ccmds.c:1893 (reg) + src/sv_main.c:1828 (rcon dispatch) | `Cmd_AddCommand("gamedir",SV_Gamedir_f)` unconditional (no #ifdef guard, no CF_ flag); rcon handler concatenates args -> `Cmd_ExecuteString(str)` after password gate -- same dispatcher as console | MATCH |
| C7 (see also) | sv_gamedir sets only `*gamedir` info key, without changing loaded dir | src/sv_ccmds.c:1558-1584 | `SV_Gamedir`: comment "Sets the fake *gamedir"; body only `Info_SetValueForStarKey(svs.info,"*gamedir",dir,...)` -- never calls FS_SetGamedir, so loaded searchpath untouched | MATCH |

**V-pass notes:** All ten material clauses enforcement-traced to located lines; every one MATCH. The command registration -> FS_SetGamedir -> fs_searchpaths-rebuild -> FS_FLocateFile chain confirms the action-level claim that gamedir changes where maps/configs/progs load (each loader independently verified to walk fs_searchpaths, the list FS_SetGamedir rebuilds). The path-rejection clause (C4) is enforced at TWO layers (SV_Gamedir_f line 1678 AND FS_SetGamedir line 457), with `:` correctly characterized as the drive-letter rejection. The "see also" for sv_gamedir is precise: SV_Gamedir only writes the *gamedir info key and never touches the filesystem searchpath, exactly as stated. Metadata (default / set-by) verified against registration (unconditional Cmd_AddCommand, no CF_ access flag) and the rcon dispatch path. Description is well-calibrated user-doc: it omits the engine-internal `*gamedir` mechanism detail except in the see-also and does not over-claim. No clause derived from name/string/enum/comment inference without an enforcing read-site.

## flags_for_review

- [review/contradiction/synthesis] The brief stated gamedir 'requires the server be empty (clients must disconnect).' That guard ('you must disconnect before changing gamedir', sv_ccmds.c:1684-1689) is wrapped in #ifndef SERVERONLY and mvdsv ships SERVERONLY (CMakeLists.txt:169), so it is compiled OUT of the dedicated server -- a dedicated mvdsv accepts a gamedir switch with clients still connected, no empty-server check. The brief's empty-server claim describes the non-shipped CLIENTONLY build. Surfacing because it contradicts a brief assumption; I omitted the clause from the description per the flavour-C guard.
- [fyi/runtime-dead-suspect/vpass] SV_Gamedir_f (src/sv_ccmds.c:1684-1690) contains a `you must disconnect before changing gamedir` guard wrapped in `#ifndef SERVERONLY`. The standard mvdsv server binary defines SERVERONLY (CMakeLists.txt:169), so this branch is compiled OUT of the dedicated server and never executes there. The proposed description correctly does NOT mention this client-only guard, so this is NOT a contradiction -- flagging only as FYI that a reader inspecting the handler source will see a branch that is dead in the server build.
- [fyi/other/vpass] FS_LOAD_FILE_ALL is `#define`d equal to FS_LOAD_FILE_PAK (src/fs.c:43-45), and FS_AddGameDirectory's header comment (fs.c:418-419) says it loads only `pak0.pak pak1.pak ...` paks at add-time. The osfile directory itself is still added to the searchpath (fs.c:444), so loose files (maps/*.bsp, *.cfg, qwprogs.dat) in the gamedir ARE still found via FS_FLocateFile's directory walk -- the description's maps/configs/progs claim holds. FYI only: the `_ALL` token is slightly misleading in the source (it does not eagerly load non-pak files), but this does not affect any clause in the description.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "gamedir",
  "type": "command",
  "description": "Switches the server's active game directory, changing which folder it loads maps, configs and the game progs from. With no argument it prints the current game directory.\n\ngamedir <dir> = load game data from <dir> (e.g. gamedir ktx). Accepts a single folder name only; values containing a path separator, drive letter, or '..' are rejected.\n\nDefault: no argument (prints current).\nSet by: server console / rcon.\nSee also: sv_gamedir (sets only the advertised *gamedir info key, without changing the loaded directory).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1692. Registration: Cmd_AddCommand(\"gamedir\", SV_Gamedir_f) at sv_ccmds.c:1893 -- Cmd_AddCommand only, NOT in ucmds[] (sv_user.c:3315-3380), so admin-only. Not on the normal-rcon blocklist (sv_main.c:1754-1764), so Set-by = server console / rcon. Handler SV_Gamedir_f (sv_ccmds.c:1660-1694) -- DISTINCT from SV_Gamedir (sv_ccmds.c:1558, the sv_gamedir display-key setter): no-arg prints 'Current gamedir' from fs_gamedir (sv_ccmds.c:1664-1668); requires exactly 1 arg else usage 'gamedir <newdir>' (sv_ccmds.c:1670-1673); rejects path chars via strstr(\"..\")/strchr('/'),('\\\\'),(':') -> 'Gamedir should be a single filename, not a path' (sv_ccmds.c:1679-1682) -- single-name-only, no '/mask' or path form; then calls FS_SetGamedir(dir,false) (sv_ccmds.c:1692) and Info_SetValueForStarKey(svs.info,\"*gamedir\",...) (sv_ccmds.c:1693). ENFORCING read-site for 'switches the loaded directory' is FS_SetGamedir (fs.c:455-497): closes current searchpaths down to fs_base_searchpaths (fs.c:471-479), sets filesystemchanged=true (fs.c:482), rebuilds fs_gamedir and calls FS_AddGameDirectory (fs.c:493-496) -- so maps/configs/progs are reloaded from the new dir. FLAVOUR-C GUARD on the empty-server claim: the 'you must disconnect before changing gamedir' check is under '#ifndef SERVERONLY' (sv_ccmds.c:1684-1689) and mvdsv is built SERVERONLY (CMakeLists.txt:169), so that guard is compiled OUT of the dedicated server -- the brief's 'requires the server be empty' is a CLIENTONLY-build behavior and is NOT enforced here, so I do NOT state it. F-MV1: KTX grep clean (no 'gamedir' override in ktx/src). C2 note: distinct from sv_gamedir which only writes the *gamedir info key (SV_Gamedir, sv_ccmds.c:1558-1583) without touching the filesystem.",
  "description_proposed": null
}
```
