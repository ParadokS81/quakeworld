# describe-fill-synthesis ledger -- mvdsv `sv_gamedir`

- **project:** mvdsv
- **knob:** `sv_gamedir` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_gamedir: synthesized -- shows/sets ONLY the serverinfo *gamedir display key (no filesystem change; distinct from 'gamedir'), single-name only; console/rcon -- origin=synthesized ref=src/sv_ccmds.c:1583 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Shows or changes only the *gamedir value reported in the server's serverinfo (the game-directory name clients see), without changing the directory the server actually loads game files from. Use it to advertise a different gamedir name than the one in use.
>
> sv_gamedir = show the current advertised *gamedir.
> sv_gamedir <name> = set the advertised *gamedir to <name>.
>
> <name> must be a single directory name: values containing "..", "/", "\", or ":" are rejected.
>
> Set by: server console / rcon.
> See also: gamedir.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| no-arg shows current *gamedir | src/sv_ccmds.c:1562-1566 | `if (Cmd_Argc()==1){ Con_Printf("Current *gamedir: %s\n", Info_ValueForKey(svs.info,"*gamedir")); return; }` | MATCH |
| 1-arg sets the value | src/sv_ccmds.c:1574 | `dir = Cmd_Argv(1);` | MATCH |
| sets ONLY the serverinfo *gamedir display key | src/sv_ccmds.c:1583 | `Info_SetValueForStarKey (svs.info, "*gamedir", dir, MAX_SERVERINFO_STRING);` | MATCH |
| does NOT change the loaded gamedir | src/sv_ccmds.c:1558-1584 | function body has no FS_SetGamedir call (cf. SV_Gamedir_f which does, next clause) | MATCH |
| 'gamedir' command DOES change FS + requires empty server (distinct sibling) | src/sv_ccmds.c:1684-1692 | `if (CL_ClientState()){ Con_Printf("you must disconnect before changing gamedir\n"); return; } ... FS_SetGamedir (dir, false);` | MATCH |
| single-filename reject | src/sv_ccmds.c:1576-1581 | `if (strstr(dir,"..") || strchr(dir,'/') || strchr(dir,'\\') || strchr(dir,':')) { Con_Printf("*Gamedir should be a single filename, not a path\n"); return; }` | MATCH |
| admin-only (not a client cmd) | src/sv_user.c (ucmds[]) | grep `{"sv_gamedir"` -> no match | MATCH |
| normal rcon NOT blocked | src/sv_main.c:1754-1764 | no "sv_gamedir" entry in blocklist | MATCH |
| no KTX override | ktx/src | grep `"sv_gamedir"`/`"gamedir"` -> 0 matches | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1a | Changes ONLY the *gamedir serverinfo value (no filesystem change) | src/sv_ccmds.c:1583 (and the ABSENCE of any FS_SetGamedir call in SV_Gamedir, 1558-1584) | `Info_SetValueForStarKey (svs.info, "*gamedir", dir, MAX_SERVERINFO_STRING);` -- SV_Gamedir body has NO FS_SetGamedir call, unlike SV_Gamedir_f at 1692 | MATCH |
| 1b | The directory the server actually loads from is unaffected | src/fs.c:455-493 (FS_SetGamedir mutates fs_gamedir + search paths) NOT called by SV_Gamedir | `snprintf (fs_gamedir, ...); FS_AddGameDirectory(...)` -- only invoked by SV_Gamedir_f (gamedir cmd) at sv_ccmds.c:1692, never by sv_gamedir | MATCH |
| 1c | The value is what clients see (serverinfo) | src/sv_user.c:484 (svs.info sent as fullserverinfo); sv_user.c:318 reads "*gamedir" from svs.info | `MSG_WriteString (..., va("fullserverinfo \"%s\"\n", svs.info));` / `gamedir = Info_ValueForKey (svs.info, "*gamedir");` | MATCH |
| 1d | Function-comment confirms "fake/advertise-only" intent | src/sv_ccmds.c:1555 | `Sets the fake *gamedir to a different directory.` (contrast: SV_Gamedir_f comment 1657 "Sets the gamedir and path") | MATCH |
| 2 | Bare `sv_gamedir` shows current advertised *gamedir | src/sv_ccmds.c:1562-1565 | `if (Cmd_Argc() == 1) { Con_Printf ("Current *gamedir: %s\n", Info_ValueForKey (svs.info, "*gamedir")); return; }` | MATCH |
| 3 | `sv_gamedir <name>` sets advertised *gamedir to <name> | src/sv_ccmds.c:1574,1583 | `dir = Cmd_Argv(1); ... Info_SetValueForStarKey (svs.info, "*gamedir", dir, MAX_SERVERINFO_STRING);` (reached only when Cmd_Argc()==2; argc>2 -> usage msg 1568-1572) | MATCH |
| 4 | <name> must be single dir name; reject if contains "..", "/", "\", ":" | src/sv_ccmds.c:1576-1581 | `if (strstr(dir, "..") || strchr(dir, '/') || strchr(dir, '\\') || strchr(dir, ':') ) { Con_Printf ("*Gamedir should be a single filename, not a path\n"); return; }` -- exact 4-element reject set | MATCH |
| 5 | Set by: server console / rcon | src/sv_ccmds.c:1894 (plain Cmd_AddCommand, no CF_ flags -- MVDSV server table has none); rcon path sv_main.c:1701/1708 Rcon_Validate -> 1828 Cmd_ExecuteString; NOT in sv_user.c client ucmd table | `Cmd_AddCommand ("sv_gamedir", SV_Gamedir);` / `Cmd_ExecuteString(str);` (after Rcon_Validate gate). Grep for "gamedir" in sv_user.c ucmd table = empty (not client-reachable) | MATCH |
| 6 | See also: gamedir | src/sv_ccmds.c:1893 (gamedir -> SV_Gamedir_f, the sibling that DOES change load path via FS_SetGamedir at 1692) | `Cmd_AddCommand ("gamedir", SV_Gamedir_f);` | MATCH |

**V-pass notes:** Every material clause maps to a located, verified enforcing line including adjacent comments. The load-bearing distinction -- sv_gamedir changes ONLY the serverinfo *gamedir key without touching the filesystem load path -- is structurally confirmed: SV_Gamedir (sv_ccmds.c:1558-1584) does a single Info_SetValueForStarKey write at line 1583 and contains NO FS_SetGamedir call, whereas its sibling SV_Gamedir_f (gamedir command, line 1660) pairs the same serverinfo write (1693) WITH FS_SetGamedir (1692), and FS_SetGamedir (fs.c:455-493) is what actually mutates fs_gamedir and rebuilds the search paths. The two function-comments at 1555 ("fake *gamedir") and 1657 ("gamedir and path") corroborate the code-level distinction. The reject-set in clause 4 is verbatim-exact (strstr ".." plus strchr '/', '\\', ':') -- four checks, no more, no less; phrasing "single directory name" mirrors the engine's own error string. Show/set branches map cleanly to Cmd_Argc()==1 vs ==2 (argc>2 falls to a usage message, not a set, so "set the advertised *gamedir to <name>" is not over-claimed). WI-2 access check: MVDSV's server command table uses plain Cmd_AddCommand with no CF_ flags (the CF_ flag family is KTX-only; tree-grep for CF_MATCHLESS/CF_PLAYER/CF_SPC_ADMIN in mvdsv/src returned nothing), so "server console / rcon" is verified by reachability, not name -- rcon reaches it via Rcon_Validate -> Cmd_ExecuteString (sv_main.c:1701/1708/1828) and it is absent from the client ucmd table (sv_user.c), so a connected player cannot invoke it. All write/read sites of the "*gamedir" key were enumerated (fs.c:561 startup cmdline, sv_ccmds.c:1583/1693 the two commands, sv_user.c:318 + sv_demo.c:1217 reads); none contradicts the serverinfo-only framing.

## flags_for_review

- [fyi/hidden-family/synthesis] The two sibling commands 'gamedir' (handler SV_Gamedir_f, src/sv_ccmds.c:1660) and 'sv_gamedir' (handler SV_Gamedir, src/sv_ccmds.c:1558) carry near-identical doc-comment headers in source -- both say 'Sets the gamedir...' / 'Sets the fake *gamedir...' -- which is the exact copy-paste trap the chunk warned about. They are genuinely distinct: 'gamedir' calls FS_SetGamedir + gates on an empty server, 'sv_gamedir' only sets the serverinfo *gamedir display key. 'gamedir' is registered UNCONDITIONALLY at src/sv_ccmds.c:1893 (not #ifdef SERVERONLY), so it is in scope as a sibling command in this same registration block; flagging so the 'gamedir' record (a sibling in this 22-command chunk) is checked for the same FS-vs-display distinction and not given sv_gamedir's description.
- [fyi/other/vpass] The 'See also: gamedir' pointer is correct and useful, but the two commands are an easy-to-conflate pair: gamedir (SV_Gamedir_f) changes BOTH the load path (FS_SetGamedir) AND the serverinfo value, while sv_gamedir changes only the serverinfo value. The description's body already draws this distinction sharply, so no change is needed -- flagging only so a downstream consumer reading the cross-reference in isolation is aware the sibling is the path-changing one.
- [fyi/off-scope-entity/vpass] FS_SetGamedir (fs.c:455-461) duplicates the same '.. / \ :' path-sanitization check that SV_Gamedir_f already performs at sv_ccmds.c:1678 before calling it -- harmless defense-in-depth, not a defect, and unrelated to sv_gamedir itself (sv_gamedir never calls FS_SetGamedir). Noted only as an off-scope observation hit while tracing the filesystem callee.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_gamedir",
  "type": "command",
  "description": "Shows or changes only the *gamedir value reported in the server's serverinfo (the game-directory name clients see), without changing the directory the server actually loads game files from. Use it to advertise a different gamedir name than the one in use.\n\nsv_gamedir = show the current advertised *gamedir.\nsv_gamedir <name> = set the advertised *gamedir to <name>.\n\n<name> must be a single directory name: values containing \"..\", \"/\", \"\\\", or \":\" are rejected.\n\nSet by: server console / rcon.\nSee also: gamedir.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1583. Handler SV_Gamedir (NOTE: distinct from SV_Gamedir_f) registered src/sv_ccmds.c:1894 as command 'sv_gamedir'; body src/sv_ccmds.c:1558-1584. Clauses enforce-traced: (no-arg = show current *gamedir) Cmd_Argc()==1 -> Con_Printf 'Current *gamedir: %s' Info_ValueForKey(svs.info, \"*gamedir\"), src/sv_ccmds.c:1562-1566. (1-arg = set) dir=Cmd_Argv(1), src/sv_ccmds.c:1574. (sets ONLY the serverinfo *gamedir display key, no filesystem change) Info_SetValueForStarKey(svs.info, \"*gamedir\", dir, MAX_SERVERINFO_STRING), src/sv_ccmds.c:1583 -- and there is NO FS_SetGamedir call in this function (the whole body is lines 1558-1584); contrast SV_Gamedir_f (the 'gamedir' command, body src/sv_ccmds.c:1660-1694) which DOES call FS_SetGamedir(dir,false) at src/sv_ccmds.c:1692 AND requires the server be empty (CL_ClientState() check 'you must disconnect before changing gamedir' :1684-1690). So sv_gamedir is display-only; kept DISTINCT from gamedir per chunk rule. (single-name reject) if (strstr(dir,\"..\") || strchr(dir,'/') || strchr(dir,'\\\\') || strchr(dir,':')) -> '*Gamedir should be a single filename, not a path' and return, src/sv_ccmds.c:1576-1581. ACCESS-CLASS: 'sv_gamedir' not in ucmds[] (grep {\"sv_gamedir\" empty) -> Cmd_AddCommand-only = admin/console. NOT in the normal-rcon blocklist (src/sv_main.c:1754-1764) -> Set-by 'server console / rcon'. The 'clients see' clause is action-relevant (an admin uses this command precisely to control the advertised gamedir name) so a short user-observable clause is inline per D20; the serverinfo-key mechanism (Info_SetValueForStarKey, the '*' star-key) stays in reasoning. F-MV1: grep of ktx/src for \"sv_gamedir\"/\"gamedir\" returned no matches -- no KTX override. Default omitted (no-arg is the show action). See also 'gamedir' added because the two are easily confused and an admin needing to change the REAL loaded gamedir must use 'gamedir', not this command.",
  "description_proposed": null
}
```
