# describe-fill-synthesis ledger -- mvdsv `map`

- **project:** mvdsv
- **knob:** `map` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:map: synthesized -- loads maps/<name>.bsp via FS and reconnects clients; admin-only; cheats follow sv_cheats; no KTX override -- origin=synthesized ref=src/sv_ccmds.c:486 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Loads a new map and continues play on it. The server tells all connected clients to reconnect to the new level. The map file must already be present on the server (it is looked up as maps/<levelname>.bsp); if it cannot be found, nothing changes. Server cheats are left in whatever state sv_cheats sets (use devmap instead to force cheats on).
>
> map <levelname> [<entityfile>] = switch to <levelname>; the optional <entityfile> loads an alternate entity layout for that map.
>
> Set by: server console / rcon (admin only).
> See also: devmap.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| takes <levelname> + optional <entityfile>; arg count 2-3 | src/sv_ccmds.c:473-477 | `if (Cmd_Argc() < 2 \|\| Cmd_Argc() > 3) { Con_Printf("map <levelname> [<entityfile>] : continue game on a new level\n"); return; }` | MATCH |
| level name read from arg 1 | src/sv_ccmds.c:479 | `strlcpy (level, Cmd_Argv(1), MAX_QPATH);` | MATCH |
| optional entity file from arg 2 | src/sv_ccmds.c:482-483 | `if (Cmd_Argc() >= 3) strlcpy (entityfile, Cmd_Argv(2), MAX_QPATH);` | MATCH |
| map looked up as maps/<name>.bsp in FS (not OS path) | src/sv_ccmds.c:486 | `snprintf (expanded, MAX_QPATH, "maps/%s.bsp", level);` | MATCH |
| missing map = no change | src/sv_ccmds.c:491-495 | `if (!FS_FLocateFile(expanded, FSLFRT_IFFOUND, NULL)) { Con_Printf ("Can't find %s\n", expanded); return; }` | MATCH |
| clients told to reconnect to new level | src/sv_ccmds.c:461-465 | `SV_BroadcastCommand ("changing\nreconnect\n");` | MATCH |
| plain map: cheats follow sv_cheats (not forced on) | src/sv_init.c:348-355 | `if ((sv_cheats.value \|\| devmap) && !sv_allow_cheats) { sv_allow_cheats = true; ... "*cheats","ON" }` with devmap=false from :458 | MATCH |
| admin-only (not client-issuable) | src/sv_ccmds.c:1859 + src/sv_user.c:3299 | `Cmd_AddCommand ("map", SV_Map_f);` and absent from `ucmds[]` | MATCH |
| no KTX override | ktx/src/g_spawn.c:104 | `{ "map", FOFS(map), F_LSTRING }` = entity field, not a command | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | "Loads a new map and continues play on it" | src/sv_ccmds.c:401-404, 475, 458 | hdr `map <mapname> command`; usage `Con_Printf("map <levelname> [<entityfile>] : continue game on a new level\n")`; `SV_SpawnServer(level, !strcasecmp(Cmd_Argv(0),"devmap"), entityfile, false)` | MATCH |
| 2 | "Server tells all connected clients to reconnect to the new level" | src/sv_ccmds.c:461-463 (SERVERONLY branch, active) -> src/sv_send.c:373,387-388 | `SV_BroadcastCommand("changing\n" "reconnect\n"); SV_SendMessagesToAll();` ; SV_BroadcastCommand comment `Sends text to all active clients`, writes `svc_stufftext` + string to `sv.reliable_datagram` | MATCH |
| 3 | "Map file must already be present, looked up as maps/<levelname>.bsp" | src/sv_ccmds.c:486 | `snprintf (expanded, MAX_QPATH, "maps/%s.bsp", level);` then `FS_FLocateFile(expanded, FSLFRT_IFFOUND, NULL)` at :491 | MATCH |
| 4 | "If it cannot be found, nothing changes" | src/sv_ccmds.c:491-495 vs :497 | `if (!FS_FLocateFile(...)) { Con_Printf ("Can't find %s\n", expanded); return; }` returns BEFORE `changed = true;` at :497 | MATCH |
| 5 | "Cheats left in whatever state sv_cheats sets; use devmap to force cheats on" | src/sv_init.c:348-355 | `if ((sv_cheats.value \|\| devmap) && !sv_allow_cheats) { sv_allow_cheats=true; ...} else if ((!sv_cheats.value && !devmap) && sv_allow_cheats) {sv_allow_cheats=false; ...}` -- for `map` devmap=false so state==sv_cheats exactly; devmap=true forces ON | MATCH |
| 6 | "map <levelname> [<entityfile>]; optional entityfile loads alternate entity layout" | src/sv_ccmds.c:473-483, 475; src/sv_init.c:602,609-635 | arg parse `if (Cmd_Argc() >= 3) strlcpy(entityfile, Cmd_Argv(2), ...)`; usage string `[<entityfile>]`; `External Entity support (.ent file(s))`, `snprintf(ent_path,...,"maps/%s.ent", entityfile)` -> `entitystring` overrides `CM_EntityString()` at :631-635 | MATCH |
| 7 | "Set by: server console / rcon (admin only)" | src/sv_ccmds.c:1859; src/sv_main.c:1701-1775,1754-1764 | `Cmd_AddCommand ("map", SV_Map_f)` (plain 2-arg, no player/userinfo path); rcon `Rcon_Validate(... master_rcon_password)` / `rcon_password.string` gate; `map` absent from normal-rcon blacklist (rm/rmdir/ls/chmod/if/localcommand/log...) | MATCH |
| 8 | "See also: devmap" | src/sv_ccmds.c:1861, 458 | `Cmd_AddCommand ("devmap", SV_Map_f)`; devmap shares handler, differs only via `!strcasecmp(Cmd_Argv(0),"devmap")` forcing cheats ON | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. Applied enforce-trace-discipline.md per-clause.

All 8 material clauses enforce-traced to located source lines (incl. adjacent comments). Both `map` and `devmap` register the SAME handler SV_Map_f -> SV_Map(qbool); the differentiator is `Cmd_Argv(0)` passed as the `devmap` bool into SV_SpawnServer.

Deferred-execution model verified (not a defect, correctly abstracted by the description): the `map` command runs SV_Map(false) which only validates the .bsp + sets static `changed=true`; the actual SV_SpawnServer + reconnect-broadcast happen later when the server frame loop calls SV_Map(true) (src/sv_main.c:3327). User-observable behavior == "load new map, all clients reconnect", matching the text.

Cheats clause (5) is the load-bearing one and is exactly right: for `map` (devmap=false), sv_allow_cheats tracks sv_cheats.value (ON when set, OFF when unset); `devmap` is the OR-term that forces cheats ON regardless. The "use devmap instead to force cheats on" cross-ref is correct.

SERVERONLY is defined UNCONDITIONALLY for this project (CMakeLists.txt:169 `target_compile_definitions(${PROJECT_NAME} PRIVATE SERVERONLY)`), so the active broadcast path is the "changing\nreconnect\n" SERVERONLY branch -- confirmed before relying on it.

Two minor conditionalities that are NOT defects (clause describes the argument's purpose / human-invocation surface, both accurate at the user-doc altitude):
- Entityfile (.ent) override only takes effect when cvar sv_loadentfiles is enabled (src/sv_init.c:605 `if ((int)sv_loadentfiles.value)`). The clause describes what the optional arg DOES, which is correct.
- Access clause omits the progs route: QC builtin #70 PF_changelevel (src/pr_cmds.c:2289) / PF2_changelevel issue the SAME `map <name>` via Cbuf_AddText. That is an internal mod call, not an end-user "Set by" surface, so omitting it from "Set by: console/rcon" is correct scoping for a user-doc.

No flavour-C clause (none inferred from name/enum/string with no enforcing read-site). No contradiction. No metadata error (no Default claim made; access-class verified against rcon validation + command-table registration, not inferred from the name).

## flags_for_review

- [fyi/off-scope-entity/vpass] QC builtin #70 PF_changelevel (src/pr_cmds.c:2278-2290) and PF2_changelevel (src/pr2_cmds.c:1484) both issue the map change by emitting `map <name>` through Cbuf_AddText/Cbuf, routing through the SAME `map` command rather than a parallel code path. The mod (e.g. KTX) is therefore an off-text invoker of `map`. The description's 'Set by: server console / rcon (admin only)' covers only the human surface, which is correct for a user-doc, but FYI the command is also reachable internally from progs.
- [fyi/other/vpass] PF_changelevel has a same-frame dedupe guard: `if (svs.spawncount == last_spawncount) return; last_spawncount = svs.spawncount;` (src/pr_cmds.c:2284-2286) preventing two changelevels in one spawncount. Not relevant to the `map` command's own behavior (it's in the progs builtin, not SV_Map), purely an FYI on the progs-side caller.
- [fyi/other/vpass] Entityfile (.ent) alternate-layout load is gated on cvar sv_loadentfiles being enabled (src/sv_init.c:605). If sv_loadentfiles=0 the optional <entityfile> argument is silently ignored and the BSP's embedded entities are used (CM_EntityString, :631-632). The description does not state this dependency; acceptable at user-doc altitude since the clause describes the argument's purpose, but flagging in case a stricter pass wants the conditionality noted.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "map",
  "type": "command",
  "description": "Loads a new map and continues play on it. The server tells all connected clients to reconnect to the new level. The map file must already be present on the server (it is looked up as maps/<levelname>.bsp); if it cannot be found, nothing changes. Server cheats are left in whatever state sv_cheats sets (use devmap instead to force cheats on).\n\nmap <levelname> [<entityfile>] = switch to <levelname>; the optional <entityfile> loads an alternate entity layout for that map.\n\nSet by: server console / rcon (admin only).\nSee also: devmap.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:486. Handler SV_Map_f (src/sv_ccmds.c:506) -> SV_Map (src/sv_ccmds.c:406). Arg grammar 'map <levelname> [<entityfile>]': src/sv_ccmds.c:473-477 requires Cmd_Argc 2 or 3 and prints the usage string 'map <levelname> [<entityfile>] : continue game on a new level' at :475; level = Cmd_Argv(1) at :479; optional entityfile = Cmd_Argv(2) at :482-483. Map resolves to a fixed FS path, NOT an arbitrary OS path: src/sv_ccmds.c:486 snprintf(expanded,\"maps/%s.bsp\",level), located via FS_FLocateFile at :491 which prints 'Can't find %s' and returns (no change) if absent. On the deferred apply, SV_SpawnServer is called at :458 and clients are told to reconnect at :461-465 (SERVERONLY broadcasts 'changing\\nreconnect\\n'). Cheats state for plain map (devmap arg = false): src/sv_init.c:348-355 -- *cheats serverinfo set ON only if (sv_cheats.value || devmap); with devmap=false cheats follow sv_cheats. Access-class admin-only: registered Cmd_AddCommand(\"map\",SV_Map_f) at src/sv_ccmds.c:1859 and ABSENT from the client ucmds[] table (table at src/sv_user.c:3299; grep of map/devmap/quit/restart inside it returned nothing) -- consistent with the section comment at src/sv_ccmds.c:40 'These commands can only be entered from stdin or by a remote operator datagram'. F-MV1: no KTX command override -- grep of ktx/src cmd_t entries for \"map\" returns only src/g_spawn.c:104 { \"map\", FOFS(map), F_LSTRING } which is an entity spawn-field descriptor, not a command.",
  "description_proposed": null
}
```
