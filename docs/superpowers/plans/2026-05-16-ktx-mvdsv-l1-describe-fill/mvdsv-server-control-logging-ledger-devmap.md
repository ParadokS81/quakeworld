# describe-fill-synthesis ledger -- mvdsv `devmap`

- **project:** mvdsv
- **knob:** `devmap` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:devmap: synthesized -- map variant that forces server cheats ON for the level (sv_init.c:348 devmap branch); admin-only; no KTX override -- origin=synthesized ref=src/sv_init.c:348 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Loads a new map exactly like the map command, but forces server cheats ON for the loaded level (regardless of the sv_cheats setting). The map file must already be present on the server (looked up as maps/<levelname>.bsp); if it cannot be found, nothing changes. Clients are told to reconnect to the new level.
>
> devmap <levelname> [<entityfile>] = switch to <levelname> with cheats enabled; the optional <entityfile> loads an alternate entity layout.
>
> Set by: server console / rcon (admin only).
> See also: map.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| same handler as map | src/sv_ccmds.c:1861,1864 | `Cmd_AddCommand ("devmap", SV_Map_f);` | MATCH |
| distinguished from map by Cmd_Argv(0) | src/sv_ccmds.c:458 | `SV_SpawnServer (level, !strcasecmp(Cmd_Argv(0), "devmap"), entityfile, false);` | MATCH |
| devmap forces cheats ON regardless of sv_cheats | src/sv_init.c:348-350 | `if ((sv_cheats.value \|\| devmap) && !sv_allow_cheats) { sv_allow_cheats = true; Info_SetValueForStarKey (svs.info, "*cheats", "ON", ...); }` | MATCH |
| arg grammar <levelname> [<entityfile>] | src/sv_ccmds.c:473-477 | `if (Cmd_Argc() < 2 \|\| Cmd_Argc() > 3) { ... return; }` | MATCH |
| loads maps/<name>.bsp, missing = no change | src/sv_ccmds.c:486,491-495 | `snprintf (expanded, MAX_QPATH, "maps/%s.bsp", level);` / `if (!FS_FLocateFile(...)) { Con_Printf("Can't find %s\n", expanded); return; }` | MATCH |
| clients reconnect | src/sv_ccmds.c:461-465 | `SV_BroadcastCommand ("changing\nreconnect\n");` | MATCH |
| admin-only (not client-issuable) | src/sv_ccmds.c:1861 + src/sv_user.c:3299 | `Cmd_AddCommand("devmap",SV_Map_f)` and absent from `ucmds[]` | MATCH |
| no KTX override | ktx/src (grep) | no `cmd_t` entry for "devmap" | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| C1 | Loads a new map "exactly like the map command" | sv_ccmds.c:1859-1861; sv_ccmds.c:458 | `Cmd_AddCommand("map",SV_Map_f)` / `Cmd_AddCommand("devmap",SV_Map_f)`; `SV_SpawnServer(level, !strcasecmp(Cmd_Argv(0),"devmap"), entityfile, false)` | MATCH -- map and devmap share handler SV_Map_f; the ONLY behavioral difference is the `devmap` bool computed from argv[0], which only affects cheats. |
| C2 | Forces server cheats ON for the loaded level | sv_init.c:348-350 | `if ((sv_cheats.value \|\| devmap) && !sv_allow_cheats) { sv_allow_cheats = true; Info_SetValueForStarKey(svs.info,"*cheats","ON",...); }` | MATCH -- devmap true sets `sv_allow_cheats=true` and serverinfo `*cheats=ON`; this is the runtime gate every cheat command checks (god/noclip at sv_ccmds.c:274,293). |
| C3 | Regardless of the sv_cheats setting | sv_init.c:348, 352 | enable branch uses `(sv_cheats.value \|\| devmap)` -- devmap alone satisfies via OR; disable branch `(!sv_cheats.value && !devmap)` can never fire when devmap is true | MATCH -- with devmap, cheats are enabled even when sv_cheats.value==0, and cannot be disabled by this call. Independent of sv_cheats confirmed by the `\|\|` and the `!devmap` guard on the disable branch. |
| C4 | Map looked up as maps/<levelname>.bsp; if not found, nothing changes | sv_ccmds.c:486, 491-495 (also 423-427 in now-path) | `snprintf(expanded,MAX_QPATH,"maps/%s.bsp",level);` ... `if (!FS_FLocateFile(expanded,...)) { Con_Printf("Can't find %s\n",expanded); return; }` | MATCH -- exact path format; on lookup failure returns before setting `changed=true` / before SV_SpawnServer, so no state changes. |
| C5 | Clients are told to reconnect | sv_ccmds.c:461-462 (SERVERONLY -- the live mvdsv build) | `SV_BroadcastCommand("changing\nreconnect\n"); SV_SendMessagesToAll();` | MATCH -- SERVERONLY is defined for mvdsv (CMakeLists.txt:169); clients receive changing+reconnect. (non-SERVERONLY path at :465 also sends reconnect.) |
| C6 | Optional <entityfile> loads an alternate entity layout | sv_ccmds.c:482-483; sv_init.c:609-635 | `if (Cmd_Argc()>=3) strlcpy(entityfile,Cmd_Argv(2),...)` ; SpawnServer loads `maps/<entityfile>.ent` via FS_LoadHunkFile then `PR_LoadEnts(entitystring)` instead of `CM_EntityString()` | MATCH (with FYI) -- entityfile is argv[2], optional; it loads an external .ent overriding the BSP entity lump. Loading is gated by `sv_loadentfiles` (sv_init.c:605); if that cvar is 0 the arg is silently ignored. Description states the feature purpose accurately at user-doc altitude. |
| C7 | Set by server console / rcon (admin only) | sv_ccmds.c:1861 (Cmd_AddCommand, no CF_ flag system); sv_main.c:1701-1710, 1799-1828 | console command via `Cmd_AddCommand`; rcon validated by `Rcon_Validate(...rcon_password/master_rcon_password)` then `Cmd_ExecuteString(str)` | MATCH -- no per-command access flag exists; gate is local console or valid rcon password (the admin trust boundary). devmap is dispatchable through Cmd_ExecuteString once rcon auth passes. |
| C8 | See also: map | sv_ccmds.c:1859 | `Cmd_AddCommand("map",SV_Map_f)` | MATCH -- map is the sibling command sharing the identical handler. |

**V-pass notes:** All 8 clauses enforce-traced to live MVDSV @ 1.11-53-g18d0362. Mechanism verified end-to-end: map and devmap both register to SV_Map_f (sv_ccmds.c:1859-1861); SV_Map computes the devmap bool from argv[0] via strcasecmp (sv_ccmds.c:458) and passes it to SV_SpawnServer; the cheats enforcement at sv_init.c:348 uses `(sv_cheats.value || devmap)` so devmap alone forces sv_allow_cheats=true + serverinfo *cheats=ON, regardless of sv_cheats.value, and the disable branch (sv_init.c:352) is guarded by `!devmap` so devmap can never turn cheats off. sv_allow_cheats is the actual runtime gate cheat commands check (verified at SV_God_f:274, SV_Noclip_f:293). The map-existence check (maps/%s.bsp) and the early-return-on-miss are at sv_ccmds.c:486/491-495. The reconnect side-effect resolves to the SERVERONLY branch (sv_ccmds.c:461-462: "changing\nreconnect") because CMakeLists.txt:169 defines SERVERONLY for the mvdsv build -- so clients are told to reconnect, confirmed. The entityfile arg (argv[2]) loads an external maps/<name>.ent that overrides the BSP entity lump via PR_LoadEnts (sv_init.c:609-635). rcon reachability confirmed: Rcon_Validate -> Cmd_ExecuteString (sv_main.c:1828). No clause contradicts code; no clause is asserted without an enforcing read-site. Classification: TRACED-CLEAN.

Two non-blocking observations captured as flags: (1) the entityfile load is conditional on sv_loadentfiles being enabled -- a deeper gate the user-doc description omits but does not misstate; (2) the non-SERVERONLY `if (IsDeveloperMode())` registration gate on devmap (sv_ccmds.c:1863-1864) is dead code in the shipped mvdsv dedicated server (SERVERONLY defined), so devmap is always available -- consistent with the description's "Set by: server console / rcon" framing.

## flags_for_review

- [fyi/other/vpass] entityfile (argv[2]) loading is gated by `if ((int)sv_loadentfiles.value)` at sv_init.c:605. If sv_loadentfiles is 0/off, the optional <entityfile> argument is silently ignored and the BSP's built-in entities (CM_EntityString) are used. The description's 'loads an alternate entity layout' states the feature's purpose accurately at user-doc altitude but does not mention this enabling cvar. Minor incompleteness, not a contradiction; flagged FYI in case the phase wants a one-clause hedge.
- [fyi/runtime-dead-suspect/vpass] In the non-SERVERONLY (qwsv client+server) build, devmap registration is gated by `if (IsDeveloperMode())` (sv_ccmds.c:1863-1864). IsDeveloperMode() has NO definition anywhere in the source tree -- it is an unresolved function-like macro (presumably build-system injected or in a generated header not in this checkout). For the actual mvdsv dedicated server this whole branch is dead: SERVERONLY is defined (CMakeLists.txt:169), so devmap registers unconditionally at sv_ccmds.c:1860-1861. No clause depends on this; flagged because the unresolved IsDeveloperMode symbol is an oddity and the dev-mode gate is runtime-dead in the shipped binary.
- [fyi/other/vpass] Access model note (not a defect): devmap, like all mvdsv server-console commands, uses plain Cmd_AddCommand with NO CF_-style per-command access flag (that flag system is KTX, not mvdsv). The 'admin only' gate is purely 'has local console OR valid rcon_password/master_rcon_password' -- there is no finer-grained permission. C7's '(admin only)' is correct under that reading.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "devmap",
  "type": "command",
  "description": "Loads a new map exactly like the map command, but forces server cheats ON for the loaded level (regardless of the sv_cheats setting). The map file must already be present on the server (looked up as maps/<levelname>.bsp); if it cannot be found, nothing changes. Clients are told to reconnect to the new level.\n\ndevmap <levelname> [<entityfile>] = switch to <levelname> with cheats enabled; the optional <entityfile> loads an alternate entity layout.\n\nSet by: server console / rcon (admin only).\nSee also: map.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_init.c:348. devmap shares the SV_Map_f handler with map (registered Cmd_AddCommand(\"devmap\",SV_Map_f) at src/sv_ccmds.c:1861 under SERVERONLY and at :1864 under developer mode). The ONLY behavioral difference vs map is the cheats flag: SV_Map distinguishes the two by the invoked name at src/sv_ccmds.c:458 -- SV_SpawnServer(level, !strcasecmp(Cmd_Argv(0),\"devmap\"), entityfile, false) passes the second (qbool devmap) param TRUE when issued as 'devmap'. That param is consumed at src/sv_init.c:348-350: if ((sv_cheats.value || devmap) && !sv_allow_cheats) { sv_allow_cheats = true; Info_SetValueForStarKey(svs.info,\"*cheats\",\"ON\",...) } -- so devmap forces server cheats on even when sv_cheats is 0 (verified, not assumed, per the chunk rule 'document what actually differs'). All other behavior identical to map: arg grammar src/sv_ccmds.c:473-477, FS lookup maps/<name>.bsp src/sv_ccmds.c:486 + existence gate :491, reconnect broadcast :461-465. Access-class admin-only: ABSENT from client ucmds[] (table src/sv_user.c:3299), section comment src/sv_ccmds.c:40. F-MV1: no KTX command override (ktx/src has no cmd_t \"devmap\"; grep returned nothing).",
  "description_proposed": null
}
```
