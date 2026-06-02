# describe-fill-synthesis ledger -- mvdsv `sv_enable_cmd_minping`

- **project:** mvdsv
- **knob:** `sv_enable_cmd_minping` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_enable_cmd_minping: synthesized -- 0 refuses the player-issued minping command, 1 honors it (sets sv_minping); default 1; KTX has no minping override -- origin=synthesized ref=src/sv_user.c:2520 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether players are allowed to change the server's minimum-ping setting from their own console using the minping command. When enabled, a connected player can run minping <value> to set sv_minping (accepted only while no match or demo recording is in progress, and only for values 0-300); when disabled, such requests are refused with a console message and sv_minping can be changed by the admin only.
>
> 0 = ignore the player minping command.
> 1 = honor the player minping command.
>
> Default: 1.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| Default 1 | src/sv_user.c:37 | `cvar_t sv_enable_cmd_minping = {"sv_enable_cmd_minping", "1"}` | MATCH |
| 0 = refuse player command (+ console msg) | src/sv_user.c:2520-2521 | `else if (!(int)sv_enable_cmd_minping.value) Con_Printf("Can't change sv_minping: sv_enable_cmd_minping == 0.\n");` | MATCH |
| 1 = honor: sets sv_minping | src/sv_user.c:2528 | `Cvar_SetValue (&sv_minping, (int)minping);` | MATCH |
| issued by a connected player (client command) | src/sv_user.c:3345 | `{"minping", Cmd_MinPing_f, true}` in ucmds[] (cf :3311 'issued by hand at client consoles') | MATCH |
| accepted only when no match/demo in progress | src/sv_user.c:2518-2519 | `if (GameStarted()) Con_Printf("Can't change sv_minping: demo recording or match in progress.\n");` | MATCH |
| value range 0-300 | src/sv_user.c:2525-2526 | `if (minping < 0 \|\| minping > 300) Con_Printf("Value must be >= 0 and <= 300.\n");` | MATCH |
| KTX does not override minping (live = mvdsv) | ktx src/world.c:1120 | `sv_minping = cvar("sv_minping");` (reads cvar only; no Cmd_AddCommand("minping")) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Cvar exists / registered | sv_user.c:37 + sv_user.c:4909 | `cvar_t sv_enable_cmd_minping = {"sv_enable_cmd_minping", "1"};` / `Cvar_Register (&sv_enable_cmd_minping);` | MATCH |
| 2 | Player command is `minping`, reachable from player console | sv_user.c:3345 + sv_user.c:4769-4772 | `{"minping", Cmd_MinPing_f, true},` / `case clc_stringcmd: s = MSG_ReadString(); ... SV_ExecuteUserCommand (s);` | MATCH (client stringcmd channel; no spectator gate, so any connected client) |
| 3 | minping <value> sets sv_minping | sv_user.c:2528 | `Cvar_SetValue (&sv_minping, (int)minping);` | MATCH |
| 4 | Enabled (non-zero) honors the command | sv_user.c:2520-2522 | `else if (!(int)sv_enable_cmd_minping.value) ... else { minping = Q_atof... }` | MATCH (the else-branch sets the value; framed 0/1 — strictly "non-zero", standard framing) |
| 5 | Disabled (0) refuses the command | sv_user.c:2520-2521 | `else if (!(int)sv_enable_cmd_minping.value)` -> `Con_Printf("Can't change sv_minping: sv_enable_cmd_minping == 0.\n");` | MATCH |
| 6 | OFF-state emits a console message | sv_user.c:2521 | `Con_Printf("Can't change sv_minping: sv_enable_cmd_minping == 0.\n");` | MATCH |
| 7 | Accepted only while no match/demo recording in progress | sv_user.c:2518-2519 + sv_main.c:218-227 | `if (GameStarted()) Con_Printf("Can't change sv_minping: demo recording or match in progress.\n");` ; `GameStarted` = non-stream demo dest OR status != "Standby" | MATCH (checked FIRST, before the enable gate) |
| 8 | Only for values 0-300 | sv_user.c:2525-2526 | `if (minping < 0 || minping > 300) Con_Printf("Value must be >= 0 and <= 300.\n");` | MATCH |
| 9 | sv_minping still changeable by admin only when gate is off | sv_user.c:35 (plain cvar) + cvar.c:205 Cvar_SetValue | `cvar_t sv_minping = {"sv_minping", "0"};` — gate at 2520 governs ONLY the client `minping` command; admin console/rcon set path is unaffected | MATCH |
| 10 | Default: 1 | sv_user.c:37 | `{"sv_enable_cmd_minping", "1"}` (2-field initializer, no flags) | MATCH |
| 11 | Set by: server config / rcon | sv_user.c:37 + :4909 | plain `cvar_t`, no CVAR_USERINFO / no client-write flag (initializer has only name+default) | MATCH (standard server-side cvar settability) |

**V-pass notes:** Every material clause (existence, command name, target cvar, polarity, OFF-state message, match/demo scope, 0-300 range, default, settability, admin-still-can framing) maps to a located enforcing line and matches the code plus its adjacent Con_Printf messages. Whole handler (Cmd_MinPing_f, sv_user.c:2512-2536), command-table entry (:3345), dispatch path (SV_ExecuteUserCommand :3399-3428, clc_stringcmd :4769), GameStarted (sv_main.c:218), and registration (:37,:4909) all live in the trace. No clause is name/string/enum inference. The OFF-state "admin only" clause is correctly framed: the gate at :2520 only blocks the *client-issued* minping command; sv_minping is a normal cvar an admin can always set via console/rcon. Default "1" verified against the registered 2-field initializer (not a shipped-cfg value). Result: TRACED-CLEAN.

Two minor, non-defect nuances (do NOT change classification): (a) Polarity is technically "non-zero honors / zero refuses" via `!(int)...value`, which the description renders as the standard 0/1 enum — accurate and conventional. (b) The clause-7 scope is checked BEFORE the enable gate (GameStarted first, then sv_enable_cmd_minping), so during a live match the refusal message is the match/demo one even when the cvar is also 0 — the description's ordering ("accepted only while no match or demo recording ... and only for 0-300") matches this precedence and is not misleading.

## flags_for_review

- [fyi/cross-mod-override/vpass] minping is registered overrideable=true in ucmds[] (sv_user.c:3345). In SV_ExecuteUserCommand (:3408-3422) overrideable commands let the mod/QC progs intercept first via SV_ExecutePRCommand(); Cmd_MinPing_f only runs if the mod does not handle 'minping'. The proposed description documents stock-engine behavior, which is correct, but a mod could replace this entirely (including the sv_enable_cmd_minping gate). Off-scope for a stock-engine L1 description; noting for completeness.
- [fyi/other/vpass] Cmd_MinPing_f has C switch fall-through: case 2 has no break before case 1 (sv_user.c:2517-2532). After a refusal or a successful set, execution falls into case 1 and ALSO prints `sv_minping = <value>`. Intentional (shows resulting/current value after any 2-arg invocation) and does not contradict any description clause, but it is a non-obvious control-flow detail.
- [fyi/other/vpass] No spectator gate on minping, unlike sibling player commands airstep/god/etc. which check sv_client->spectator. So a connected SPECTATOR can also issue minping (subject to the same GameStarted + enable gate). The description's 'connected player' wording is the natural user-doc framing and not wrong, but the engine does not restrict to non-spectators.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_enable_cmd_minping",
  "type": "cvar",
  "description": "Controls whether players are allowed to change the server's minimum-ping setting from their own console using the minping command. When enabled, a connected player can run minping <value> to set sv_minping (accepted only while no match or demo recording is in progress, and only for values 0-300); when disabled, such requests are refused with a console message and sv_minping can be changed by the admin only.\n\n0 = ignore the player minping command.\n1 = honor the player minping command.\n\nDefault: 1.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:2520. Registered sv_user.c:37 `cvar_t sv_enable_cmd_minping = {\"sv_enable_cmd_minping\", \"1\"}` -> Default 1 (WI-2: two-field literal). Enforcing read-site sv_user.c:2520-2521 inside Cmd_MinPing_f: `else if (!(int)sv_enable_cmd_minping.value) Con_Printf(\"Can't change sv_minping: sv_enable_cmd_minping == 0.\\n\");` -> polarity: 0 (falsy) -> refuse + print, otherwise (1) the next else-branch at :2523-2528 runs `Cvar_SetValue(&sv_minping, (int)minping)` -> 1=honor. F-MV1 cross-mod: KTX has NO `minping` command override (ktx grep finds only globals.c:114 / world.c:1120,1807-1810 which READ the sv_minping cvar to broadcast its changes, no Cmd registration), so the LIVE handler is the mvdsv engine Cmd_MinPing_f. Who issues it: `minping` is in the ucmds[] user-command table (sv_user.c:3345 `{\"minping\", Cmd_MinPing_f, true}`, same table family as the :3311 'issued by hand at client consoles' commands rate/kill/pause), i.e. a connected player's console command -> 'players ... from their own console'. Additional guards stated as context, each traced: :2518 `if (GameStarted())` -> refused during demo recording / match in progress; :2525 `if (minping < 0 || minping > 300)` -> value range 0-300. These gate the command's effect but the cvar itself only toggles enable/disable; admin-can-still-set follows from these being client-command guards while an admin sets sv_minping directly.",
  "description_proposed": null
}
```
