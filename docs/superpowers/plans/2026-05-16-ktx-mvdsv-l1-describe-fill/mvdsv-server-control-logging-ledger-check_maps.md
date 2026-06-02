# describe-fill-synthesis ledger -- mvdsv `check_maps`

- **project:** mvdsv
- **knob:** `check_maps` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:check_maps: synthesized -- admin-only console/rcon command that rescans the id1/qw map dirs and rebuilds the localinfo custom-map vote list players read via 'maps' -- origin=synthesized ref=src/sv_ccmds.c:1294 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Rebuilds the server's custom-map vote list by scanning the map folders (the id1 and qw maps directories) and recording every map found. After running it, the up-to-date list is what players see when they use the 'maps' command to vote for a map by name. Run it after adding new map files so they become votable without restarting.
>
> Set by: server console / rcon.
> See also: maps.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| scans id1 and qw map dirs for .bsp | src/sv_ccmds.c:1286,1298 | `d = Sys_listdir("id1/maps", ".bsp$", SORT_BY_NAME);` ; `d = Sys_listdir("qw/maps", ".bsp$", SORT_BY_NAME);` | MATCH |
| records each map name (ext stripped) | src/sv_ccmds.c:1290,1294,1312 | `list->name[strlen(list->name) - 4] = 0;` ; `SV_Localinfo_Set(va("%d", i), list->name);` | MATCH |
| dedups qw vs id1, clears leftover slots | src/sv_ccmds.c:1306-1318 | `if (j <= maps_id1) continue;` ; `SV_Localinfo_Set(va("%d", i), "");` | MATCH |
| list is the map-vote list players see via 'maps' | src/sv_user.c:2595-2598 | `Con_Printf("Vote for maps by typing the mapname, for example \"%s\"...")` ; `for (i = LOCALINFO_MAPS_LIST_START; i <= LOCALINFO_MAPS_LIST_END; i++)` | MATCH |
| 'maps' display command is client-accessible | src/sv_user.c:3347 | `{"maps", Cmd_ShowMapsList_f, true},` | MATCH |
| check_maps itself is admin-only (not in ucmds[]) | src/sv_user.c:3408-3424 | client stringcmd loop over `ucmds`, else `"Bad user command"` | MATCH |
| no KTX override | ktx/src (grep) | no `Cmd_AddCommand("check_maps"...)` in KTX | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | check_maps is a server command (registration) | src/sv_ccmds.c:1832 | `Cmd_AddCommand ("check_maps", SV_Check_maps_f);` (inside SV_InitOperatorCommands, sv_ccmds.c:1815) | MATCH |
| 2 | "Rebuilds the server's custom-map vote list" (full repopulate, not append) | src/sv_ccmds.c:1280-1319 | handler fills localinfo slots from id1 then qw, then 1315-1318 `for(; i<=...END; i++) SV_Localinfo_Set(va("%d",i),"")` clears trailing slots -> full rebuild | MATCH |
| 3a | "scanning the map folders" -> id1 maps dir | src/sv_ccmds.c:1286 | `d = Sys_listdir("id1/maps", ".bsp$", SORT_BY_NAME);` | MATCH |
| 3b | "...and qw maps directories" | src/sv_ccmds.c:1298 | `d = Sys_listdir("qw/maps", ".bsp$", SORT_BY_NAME);` | MATCH |
| 4 | "recording every map found" | src/sv_ccmds.c:1294, 1312 | `SV_Localinfo_Set(va("%d", i), list->name);` (each .bsp name, ext stripped at 1290/1302) | MATCH (minor: 4000-slot cap [server.h:706-707 START=1000/END=4999] + qw maps duplicating an id1 name are skipped via de-dup loop 1306-1310; still-true vagueness) |
| 5 | "the up-to-date list is what players see when they use the 'maps' command" | src/sv_user.c:2598-2616 | `for (i = LOCALINFO_MAPS_LIST_START; i <= LOCALINFO_MAPS_LIST_END; i++){ value = Info_Get(&_localinfo_, key); ... Con_Printf(...)}` -- maps command reads the exact same localinfo range check_maps wrote | MATCH |
| 6 | "to vote for a map by name" | src/sv_user.c:2595-2596 | `Con_Printf("Vote for maps by typing the mapname, for example \"%s\"...---%s\n", Q_redtext(ztndm3), Q_redtext(list_of_custom_maps));` -- command's own text confirms vote-by-name + "list of custom maps" | MATCH |
| 7 | "Run it after adding new map files so they become votable without restarting" | src/sv_ccmds.c:1286,1298 + sys.h:60 | `Sys_listdir(...)` performs a live filesystem rescan; localinfo updated in place -> no restart needed; this is the command's purpose | MATCH |
| 8 | "Set by: server console / rcon" | src/sv_ccmds.c:1832 + src/sv_main.c:1828 | registered via `Cmd_AddCommand` (operator table); rcon path concatenates args and calls `Cmd_ExecuteString(str);` against the same table after password check | MATCH |
| 9 | "See also: maps" | src/sv_user.c:3347 | `{"maps", Cmd_ShowMapsList_f, true},` -- maps is the direct consumer of check_maps output | MATCH |
| meta | "maps" is a client/userland command (supports clause 5/6 player framing) | src/sv_user.c:3294, 3347 | struct field is `qbool overrideable;` (NOT an access flag); maps lives in ucmds[] client table -> any connected client issues it | MATCH |

**V-pass notes:** Every material clause enforce-traces to a located line. Full chain verified end-to-end: check_maps (SV_Check_maps_f, sv_ccmds.c:1280) scans id1/maps then qw/maps for .bsp files and writes each map name into localinfo keys 1000-4999 (SV_Localinfo_Set, the same primitive the localinfo admin command uses); the client-side `maps` command (Cmd_ShowMapsList_f, sv_user.c:2587) reads back that exact localinfo range and prints it under the header "Vote for maps by typing the mapname" / "list of custom maps". The vote-by-name framing is NOT inference -- it is the consumer command's own literal output string (sv_user.c:2595-2596). Access class verified by tracing rcon dispatch (sv_main.c:1828 Cmd_ExecuteString) into the same operator command table check_maps registers in, so "server console / rcon" is correct; check_maps appears in NO client command table.

One soft spot, not a defect: "recording every map found" carries two un-stated caveats -- a hard cap of 4000 slots (1000..4999) and a de-dup that skips a qw map whose name already matched an id1 map (loop sv_ccmds.c:1306-1310). Both leave the clause still-true in practice (the de-dup is desirable; the cap is unreachable for real map sets), so this is traceable minor vagueness, not flavour-C. Classification stands TRACED-CLEAN.

## flags_for_review

- [fyi/hidden-family/synthesis] check_maps writes the same localinfo key range (1000-4999) that the client-issuable 'maps' command (ucmds[] entry at src/sv_user.c:3347, Cmd_ShowMapsList_f) reads. This is a deliberate builder(admin)/display(client) pair, not a dual-registration of one command -- documented as 'See also: maps'. Flagging the relationship so a reviewer confirms 'maps' is treated as its own entity if/when it is in scope.
- [fyi/other/vpass] Description says the list scans 'the id1 and qw maps directories'. This is literally correct, but the handler HARDCODES exactly id1/maps and qw/maps (sv_ccmds.c:1286,1298) -- it does NOT scan the active mod gamedir's maps folder. A reader could over-read 'the map folders' as 'all gamedir maps dirs'. Current wording is accurate; flagging only so the operator can decide whether to make the id1+qw scope explicit.
- [fyi/other/vpass] 'recording every map found' omits two real constraints: (1) a fixed cap of 4000 localinfo slots (server.h:706-707, LOCALINFO_MAPS_LIST_START=1000 / END=4999) -- maps beyond 4000 are silently dropped; (2) a qw map whose stripped name duplicates an id1 map name is skipped (de-dup loop sv_ccmds.c:1306-1310), so it is not 'recorded' a second time. Neither breaks the clause for realistic map counts; FYI in case precision is desired.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "check_maps",
  "type": "command",
  "description": "Rebuilds the server's custom-map vote list by scanning the map folders (the id1 and qw maps directories) and recording every map found. After running it, the up-to-date list is what players see when they use the 'maps' command to vote for a map by name. Run it after adding new map files so they become votable without restarting.\n\nSet by: server console / rcon.\nSee also: maps.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1294. Handler SV_Check_maps_f registered at src/sv_ccmds.c:1832 (Cmd_AddCommand) -> body src/sv_ccmds.c:1280-1319. WHAT (scans map dirs, records maps): Sys_listdir('id1/maps', '.bsp$', SORT_BY_NAME) at src/sv_ccmds.c:1286 and Sys_listdir('qw/maps', '.bsp$', ...) at src/sv_ccmds.c:1298; each found map has '.bsp' stripped (src/sv_ccmds.c:1290,1302) and is stored via SV_Localinfo_Set into numbered localinfo keys at src/sv_ccmds.c:1294 and :1312 (the authoritative write use-site). Slot range = localinfo keys 1000-4999 (LOCALINFO_MAPS_LIST_START/END defined src/server.h:706-707, loop bounds src/sv_ccmds.c:1288,1300); qw maps duplicating an id1 map are skipped (src/sv_ccmds.c:1306-1310); leftover slots cleared (src/sv_ccmds.c:1315-1318). 'What players see via maps / map voting': the SAME localinfo range is read by Cmd_ShowMapsList_f (src/sv_user.c:2587-2614), which prints 'Vote for maps by typing the mapname, for example \"ztndm3\"' and '---list of custom maps' (src/sv_user.c:2595-2596); that command is registered in ucmds[] as {\"maps\", Cmd_ShowMapsList_f, true} (src/sv_user.c:3347), so in-game clients can display the list (consumer is client-facing; the builder check_maps is admin-only). Takes no args (handler is void(), no Cmd_Argc gate). Admin-only access class: 'check_maps' is NOT in ucmds[] (grep src/sv_user.c:3299-3400) and SV_ExecuteUserCommand (src/sv_user.c:3408-3424) does not fall through from client stringcmds to console commands, so Cmd_AddCommand-only = console/rcon-only; this is the proven distinction vs the client-issuable 'maps' display command. F-MV1: ktx/src has no override of 'check_maps' (grep returned no KTX registration). Default omitted (no-arg command). Localinfo / slot-range internals kept out of description per D20.",
  "description_proposed": null
}
```
