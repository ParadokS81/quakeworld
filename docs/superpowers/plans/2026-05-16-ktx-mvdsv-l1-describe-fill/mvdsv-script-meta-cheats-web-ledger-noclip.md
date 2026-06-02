# describe-fill-synthesis ledger -- mvdsv `noclip`

- **project:** mvdsv
- **knob:** `noclip` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified WI2-FIX
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:noclip: synthesized -- cheat-gated movetype toggle (walls); client self or console/rcon by userid; no KTX override -- origin=synthesized ref=src/sv_ccmds.c:302 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Toggles no-clipping mode for a player, letting them move freely through walls and other solid objects. Issuing it again turns it back off. The server only honours this when cheats are enabled; otherwise it prints that cheats are not allowed and does nothing.
>
> Set by: a connected player on themselves when cheats are enabled (sv_cheats 1 or a devmap), and the server console / rcon (target a player by userid: noclip <userid>).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| toggles no-clip movement through solids | src/sv_ccmds.c:302-310 | `if (sv_player->v->movetype != MOVETYPE_NOCLIP) { sv_player->v->movetype = MOVETYPE_NOCLIP; ... } else { sv_player->v->movetype = MOVETYPE_WALK; ... }` | MATCH |
| second issue turns it off | src/sv_ccmds.c:307-310 | else-branch sets MOVETYPE_WALK + prints 'noclip OFF' | MATCH |
| requires cheats enabled, else no-op with message | src/sv_ccmds.c:293-297 | `if (!sv_allow_cheats) { Con_Printf("Cheats are not allowed on this server\n"); return; }` | MATCH |
| client-issuable (acts on self) | src/sv_user.c:3360 + src/sv_ccmds.c:243-247 | ucmds[] `{"noclip", SV_Noclip_f, true}`; SV_SetPlayer forces own userid when RD_CLIENT | MATCH |
| console/rcon targets by userid | src/sv_ccmds.c:241,260 | `idnum = Q_atoi(Cmd_Argv(1));` then 'Userid %i is not on the server' | MATCH |
| no KTX override | ktx/src grep | no cmd_t entry for "noclip" | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: WI2-FIX**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | Toggles no-clip mode (move freely through walls/solids) | sv_ccmds.c:302-304; sv_phys.c:654/657-666; sv_user.c:3517-3520 | `if (sv_player->v->movetype != MOVETYPE_NOCLIP){ sv_player->v->movetype = MOVETYPE_NOCLIP;` / `SV_Physics_Noclip ... A moving object that doesn't obey physics ... VectorMA(...origin...velocity...)` / `if (movetype == MOVETYPE_NOCLIP){... return PM_(OLD_)SPECTATOR;}` | MATCH |
| 2 | Issuing again turns it back off (toggle) | sv_ccmds.c:307-310 | `else { sv_player->v->movetype = MOVETYPE_WALK; SV_ClientPrintf(sv_client, PRINT_HIGH, "noclip OFF\n"); }` | MATCH |
| 3 | Server only honours when cheats enabled | sv_ccmds.c:293 | `if (!sv_allow_cheats) { ... return; }` | MATCH (gate exists & enforces; control NAME issue tracked in clause 6) |
| 4 | Otherwise prints cheats-not-allowed and does nothing | sv_ccmds.c:295-296 | `Con_Printf("Cheats are not allowed on this server\n"); return;` | MATCH (wording: "Cheats are not allowed on this server") |
| 5 | Connected player acts on themselves | sv_user.c:3406 + sv_ccmds.c:243-247 | `SV_BeginRedirect(RD_CLIENT);` / `// HACK: for cheat commands which comes from client ... if (sv_client && sv_redirected == RD_CLIENT) idnum = sv_client->userid;` | MATCH |
| 6 | Gated by sv_allow_cheats (named as the operator control) | enforcing: sv_ccmds.c:293; control: sv_ccmds.c:25-26 + sv_init.c:348-353 + sv_ccmds.c:1819 | `qbool sv_allow_cheats = false;` (internal) vs `cvar_t sv_cheats = {"sv_cheats","0"}; ... Cvar_Register(&sv_cheats); ... if((sv_cheats.value || devmap) && !sv_allow_cheats) sv_allow_cheats = true;` | MISMATCH (metadata) -- enforcing flag is `sv_allow_cheats`, but it is NOT a cvar; the operator-facing control is the `sv_cheats` cvar (default 0), `+cheats` cmdline, or `devmap`. Naming `sv_allow_cheats` as the thing the server "allows cheats" via is the internal flag, not the settable knob. |
| 7 | From console/rcon, target a player by userid: noclip <userid> | sv_ccmds.c:1883 (`#ifdef SERVERONLY`) + sv_main.c:1819/1828 + sv_ccmds.c:232/241 | `Cmd_AddCommand("noclip", SV_Noclip_f);` / rcon: `SV_BeginRedirect(RD_PACKET); ... Cmd_ExecuteString(str);` / `// Sets sv_client and sv_player to the player with idnum Cmd_Argv(1)` `idnum = Q_atoi(Cmd_Argv(1));` | MATCH (rcon uses RD_PACKET, so the HACK self-target does NOT fire and Cmd_Argv(1) userid is honoured) |

**V-pass notes:** Behavior is correct and fully enforce-traced. Handler: SV_Noclip_f (sv_ccmds.c:291-312). Dual registration confirmed: client path via ucmds[] (sv_user.c:3360, overrideable=true) dispatched through SV_ExecuteUserCommand (sv_user.c:3408-3422, progs get first refusal via SV_ExecutePRCommand before SV_Noclip_f runs); console/rcon path via Cmd_AddCommand under #ifdef SERVERONLY (sv_ccmds.c:1880-1884) -- compiled because mvdsv is the SERVERONLY build.

The single defect is metadata-precision (WI2), clause 6. The description states the gate is "when the server allows cheats (sv_allow_cheats)". The enforcing check `if (!sv_allow_cheats)` (sv_ccmds.c:293) is real and matches -- so this is NOT flavour-C (there IS an enforcing read-site). But `sv_allow_cheats` is a plain internal `qbool` (sv_ccmds.c:26), NEVER registered as a cvar (zero cvar matches). The operator-facing control that an admin would actually set is the `sv_cheats` cvar (sv_ccmds.c:25, default "0", registered sv_ccmds.c:1819), or the `+cheats` command line, or `devmap`; SV_SpawnServer (sv_init.c:348-353) and SV_InitOperatorCommands (sv_ccmds.c:1821-1826) derive sv_allow_cheats from those. So the parenthetical points the reader at a name they cannot set. Fix: name the gate as the `sv_cheats` cvar (and optionally note `+cheats` / devmap also enable it). The third ucmds field is `overrideable` (struct sv_user.c:3290-3296), NOT an access-class flag -- so there is no admin restriction beyond the cheat gate, consistent with the description not claiming admin-only.

Wording nit (still MATCH, not flagged as a fix): exact message is "Cheats are not allowed on this server"; description paraphrases as "cheats are not allowed". Fine for a user-doc.

## flags_for_review

- [fyi/other/synthesis] noclip is correctly NOT admin-only: it is in ucmds[] under the '// cheat commands' block (src/sv_user.c:3360, overrideable=true) and is client-issuable when sv_allow_cheats is on, exactly like its already-filled siblings god/fly. The cheat gate (src/sv_ccmds.c:293) is the only restriction. Chunk-5 rule (A) confirmed against source.
- [review/other/vpass] Description names 'sv_allow_cheats' as the cheat gate, but that is an internal qbool flag (sv_ccmds.c:26), not a cvar. The settable operator control is the 'sv_cheats' cvar (sv_ccmds.c:25, default 0), plus '+cheats' cmdline and 'devmap'; sv_allow_cheats is derived from those (sv_init.c:348-353, sv_ccmds.c:1821-1826). Re-synth should cite sv_cheats (the cvar) as the control. Note: the cheat-gated cvars god/give/fly share this exact gate pattern -- if any sibling row also cites sv_allow_cheats as the control, it carries the same WI2 miss.
- [fyi/runtime-dead-suspect/vpass] Console/rcon registration of noclip is under #ifdef SERVERONLY (sv_ccmds.c:1880-1884). This is compiled for the mvdsv (qwsv) server build, so the rcon/userid-targeting path in the description is real. Flagging only so the gate is explicit in the trace record, not because it disables anything for this oracle.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "noclip",
  "type": "command",
  "description": "Toggles no-clipping mode for a player, letting them move freely through walls and other solid objects. Issuing it again turns it back off. The server only honours this when cheats are enabled; otherwise it prints that cheats are not allowed and does nothing.\n\nSet by: a connected player on themselves when cheats are enabled (sv_cheats 1 or a devmap), and the server console / rcon (target a player by userid: noclip <userid>).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:302. Handler SV_Noclip_f (src/sv_ccmds.c:291). Cheat gate: src/sv_ccmds.c:293 `if (!sv_allow_cheats) { Con_Printf(\"Cheats are not allowed on this server\\n\"); return; }`. Effect (enforcing): src/sv_ccmds.c:302-310 toggles `sv_player->v->movetype` between MOVETYPE_NOCLIP and MOVETYPE_WALK (movetype noclip = passes through solids), printing 'noclip ON'/'noclip OFF'. Access class: registered both via Cmd_AddCommand (src/sv_ccmds.c:1883) AND in ucmds[] in the '// cheat commands' block at src/sv_user.c:3360 `{\"noclip\", SV_Noclip_f, true}` (overrideable=true) -> client-issuable. Target resolution: SV_SetPlayer (src/sv_ccmds.c:235) at src/sv_ccmds.c:243-247 forces idnum to the issuing client's own userid when sv_redirected==RD_CLIENT (so a client only no-clips themselves); from console it reads Cmd_Argv(1) as the userid. Default = cheats off: sv_allow_cheats governs. F-MV1: grep ktx/src for 'noclip' command-table entry returned none -- KTX does not override; behaviour above is the live engine behaviour. [MAIN-HG2 edit: cheat gate named as the sv_cheats cvar (operator-settable), not the internal sv_allow_cheats qbool (sv_ccmds.c:25-26).]",
  "description_proposed": null
}
```
