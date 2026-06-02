# describe-fill-synthesis ledger -- mvdsv `sv_cheats`

- **project:** mvdsv
- **knob:** `sv_cheats` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_cheats: synthesized -- 1 allows cheat commands (god/noclip/give) and advertises *cheats=ON, 0 refuses them; default 0; also settable via command line; no KTX override -- origin=synthesized ref=src/sv_init.c:348 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Allows cheat commands (such as god mode, noclip, and give) to be used on the server. When enabled, the server advertises that cheats are on; when disabled, attempts to use cheat commands are refused.
>
> 0 = cheats not allowed.
> 1 = cheats allowed.
>
> Default: 0 (cheats off).
> Set by: server config, or the server command line.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 0 (off) | src/sv_ccmds.c:25 | `cvar_t sv_cheats = {"sv_cheats", "0"};` | MATCH |
| nonzero -> cheats allowed + 'ON' advertised | src/sv_init.c:348-350 | `if ((sv_cheats.value || devmap) && !sv_allow_cheats) { sv_allow_cheats = true; Info_SetValueForStarKey(svs.info, "*cheats", "ON", ...); }` | MATCH |
| zero -> cheats refused + advertisement cleared | src/sv_init.c:352-354 | `else if ((!sv_cheats.value && !devmap) && sv_allow_cheats) { sv_allow_cheats = false; Info_SetValueForStarKey(svs.info, "*cheats", "", ...); }` | MATCH |
| god/noclip/give gated when off | src/sv_ccmds.c:274,293,325,373 | `if (!sv_allow_cheats) { Con_Printf ("Cheats are not allowed on this server\n"); return; }` | MATCH |
| also enableable via command line | src/sv_ccmds.c:1821-1824 | `if (SV_CommandLineEnableCheats()) { sv_allow_cheats = true; Cvar_SetValue (&sv_cheats, 1); ... }` | MATCH |
| no KTX override | ktx/src (grep) | grep sv_cheats -> 0 hits | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Allows cheat commands god/noclip/give on the server | sv_ccmds.c:272-283 (god), :291-311 (noclip), :320-368 (give); gated by sv_init.c:348 | `if ((sv_cheats.value \|\| devmap) && !sv_allow_cheats) { sv_allow_cheats = true; ... }` then each handler `if (!sv_allow_cheats) {...return;}` else applies FL_GODMODE / MOVETYPE_NOCLIP / items+ammo | MATCH |
| 2 | When enabled, server advertises cheats are on | sv_init.c:350 + sv_ccmds.c:1825 (set); delivered sv_user.c:484 | `Info_SetValueForStarKey (svs.info, "*cheats", "ON", MAX_SERVERINFO_STRING);` ... `MSG_WriteString(... va("fullserverinfo \"%s\"\n", svs.info))` -- svs.info incl. *cheats is sent to clients | MATCH |
| 2b | When disabled, advertisement cleared | sv_init.c:354 | `else if ((!sv_cheats.value && !devmap) && sv_allow_cheats) { sv_allow_cheats = false; Info_SetValueForStarKey (svs.info, "*cheats", "", ...); }` | MATCH |
| 3 | OFF-state: cheat-command attempts refused | sv_ccmds.c:274-278 (and :293,:325,:373 identical) | `if (!sv_allow_cheats) { Con_Printf ("Cheats are not allowed on this server\n"); return; }` | MATCH |
| 4 | Polarity: 0=not allowed, 1=allowed | sv_init.c:348,352 | enable when `sv_cheats.value` truthy; disable when `!sv_cheats.value` (and !devmap) -- standard nonzero=on boolean | MATCH |
| 5 | Default: 0 (cheats off) | sv_ccmds.c:25 (registered sv_ccmds.c:1819) | `cvar_t sv_cheats = {"sv_cheats", "0"};` -- registered default string "0" via Cvar_Register->Cvar_SetROM | MATCH |
| 6a | Set by: server config / console | sv_ccmds.c:25,1819 | bare `cvar_t` struct (no CVAR_ROM/lock flags), single `Cvar_Register (&sv_cheats);` -- writable via config/console | MATCH |
| 6b | Set by: server command line | sv_ccmds.c:1821-1824 + server.h:1106 (SERVERONLY build, CMakeLists.txt:169) | `if (SV_CommandLineEnableCheats()) { sv_allow_cheats = true; Cvar_SetValue (&sv_cheats, 1); ... }` where macro = `COM_CheckParm("-cheats")` | MATCH |

**V-pass notes:** Version confirmed 1.11-53-g18d0362. Every material clause (semantic, side-effect/advertise, OFF-state, polarity, default, set-by) maps to a located, verified enforcing line incl. adjacent comments -> TRACED-CLEAN.

Architecture: the cvar `sv_cheats` is NOT read directly by the cheat-command handlers. It drives an intermediate qbool `sv_allow_cheats` (sv_ccmds.c:26), and the four handlers (god/noclip/give/fly) gate on `!sv_allow_cheats`. I followed the call chain: registration (sv_ccmds.c:25,1819) -> mirror into sv_allow_cheats at every map spawn (SV_SpawnServer, sv_init.c:348-355) and at init from cmdline (sv_ccmds.c:1821-1826) -> the 4 enforcing handler gates (sv_ccmds.c:274/293/325/373). The synth's named examples (god, noclip, give) are all real handlers and correctly gated; a 4th gated handler (fly, sv_ccmds.c:371) exists but is not claimed, which is fine for an examples-list.

"Advertises" clause traced to ground truth, not inferred from a string name: `*cheats`="ON" is written into svs.info (sv_init.c:350, sv_ccmds.c:1825) and svs.info is transmitted to clients via fullserverinfo (sv_user.c:484). Cleared to "" when disabled (sv_init.c:354). This is a real client-facing publication channel.

Default verified against REGISTERED value `{"sv_cheats","0"}` (WI-2 compliant), not a shipped-cfg value.

Command-line clause: mvdsv builds SERVERONLY (CMakeLists.txt:169), so the active macro is `COM_CheckParm("-cheats")` (server.h:1106). The non-SERVERONLY branch (server.h:1114) uses `cmdline_param_server_enablecheats`, whose string is not vendored in this src tree (dead branch for this build). Either branch = a command-line cheats-enable check, so the clause holds.

No second registration, no client-side reader of this cvar (server binary). Settability confirmed: bare cvar_t with no CVAR_ROM, plus a live `Cvar_SetValue(&sv_cheats,1)` write.

## flags_for_review

- [fyi/other/vpass] Indirection/timing nuance the description abstracts away (not a defect): config-setting `sv_cheats 1` does not gate commands directly -- it is mirrored into `sv_allow_cheats` only at the next SV_SpawnServer (map load, sv_init.c:348-355). A live console `sv_cheats 1` mid-map has no effect until the next map change. The description's 'Set by: server config' is accurate but elides this deferred-effect; acceptable as user-doc, flagging in case the L1 wants a 'takes effect on next map' note.
- [fyi/other/vpass] Alternate cheat-enable path not mentioned by the description: `devmap` independently raises sv_allow_cheats (sv_init.c:348 `(sv_cheats.value || devmap)`), so cheats can be ON even with sv_cheats=0 after a devmap load. The description describes the cvar in isolation, which is correct scope; noting the fuller cheat-enable surface (sv_cheats OR devmap OR -cheats) as FYI.
- [fyi/off-scope-entity/vpass] server.h:1114 references `cmdline_param_server_enablecheats` but no string definition for that identifier exists anywhere in the vendored src tree. It lives only in the #else (non-SERVERONLY) branch which is dead for the mvdsv build (SERVERONLY is defined). Not a bug for mvdsv; flagging as a hidden/external symbol in case a future non-SERVERONLY build path is ever exercised.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_cheats",
  "type": "cvar",
  "description": "Allows cheat commands (such as god mode, noclip, and give) to be used on the server. When enabled, the server advertises that cheats are on; when disabled, attempts to use cheat commands are refused.\n\n0 = cheats not allowed.\n1 = cheats allowed.\n\nDefault: 0 (cheats off).\nSet by: server config, or the server command line.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_init.c:348. Registration src/sv_ccmds.c:25 cvar_t sv_cheats = {\"sv_cheats\", \"0\"} -> default 0, off. Enforcing read-site src/sv_init.c:348 `if ((sv_cheats.value || devmap) && !sv_allow_cheats)` -> sets sv_allow_cheats = true (sv_init.c:349) and the *cheats serverinfo key to \"ON\" (sv_init.c:350); the inverse branch sv_init.c:352 `else if ((!sv_cheats.value && !devmap) && sv_allow_cheats)` clears the flag and the serverinfo key (sv_init.c:353-354). The admin-observable effect of sv_allow_cheats is the cheat-command gate: each cheat handler checks `if (!sv_allow_cheats) { Con_Printf(\"Cheats are not allowed on this server\\n\"); return; }` -- verified at src/sv_ccmds.c:274 (SV_God_f / god mode), :293 (SV_Noclip_f / noclip), :325, :373 (the give / further cheat commands). I named god/noclip/give as concrete examples (all confirmed at those gate sites) rather than enumerating internal flag mechanics. The OR with `devmap` is an alternate enable path, not part of this cvar's own polarity, so it is omitted from the user doc. Additional enable path: command line -- src/sv_ccmds.c:1821-1824 `if (SV_CommandLineEnableCheats()) { sv_allow_cheats = true; Cvar_SetValue(&sv_cheats, 1); ... }`, which is why 'Set by' lists the server command line as well as config. F-MV1: grep of ktx/src for sv_cheats returns zero hits -> no KTX override.",
  "description_proposed": null
}
```
