# describe-fill-synthesis ledger -- mvdsv `inc`

- **project:** mvdsv
- **knob:** `inc` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:inc: synthesized -- adds delta (default 1, negative subtracts) to a cvar via Cvar_SetValue; console/rcon, no client path, no KTX override -- origin=synthesized ref=src/cvar.c:541 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Adds a number to a cvar's current value. With no amount given it adds 1; pass a negative amount to subtract.
>
> inc <cvar> = add 1 to <cvar>.
> inc <cvar> <amount> = add <amount> (may be negative) to <cvar>.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| adds delta to current value | src/cvar.c:541 | `Cvar_SetValue (var, var->value + delta);` | MATCH |
| default amount is 1 | src/cvar.c:538-539 | `else delta = 1;` | MATCH |
| explicit amount via 3rd arg | src/cvar.c:536-537 | `if (c == 3) delta = Q_atof (Cmd_Argv(2));` | MATCH |
| negative amount subtracts (Q_atof parses sign) | src/cvar.c:537 | `delta = Q_atof (Cmd_Argv(2));` | MATCH |
| 2-or-3 arg gate | src/cvar.c:522-525 | `if (c != 2 && c != 3) { Con_Printf ("inc <cvar> [value]\n");` | MATCH |
| unknown var is a no-op | src/cvar.c:530-533 | `if (!var) { Con_Printf ("Unknown variable ..."); return; }` | MATCH |
| not client-issuable (ucmds absent) | src/sv_user.c | grep `"inc"` empty | MATCH |
| not on normal-rcon blocklist | src/sv_main.c:1750-1767 | 'inc' absent from blocklist | MATCH |
| no KTX override | ktx/src | grep AddCommand "inc" empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| C1 | Adds a number to a cvar's current value | cvar.c:541 (+ Cvar_SetValue cvar.c:205-217) | `Cvar_SetValue (var, var->value + delta);` | MATCH |
| C2 | With no amount given it adds 1 | cvar.c:536-539 | `if (c == 3) delta = Q_atof (Cmd_Argv(2)); else delta = 1;` | MATCH |
| C3 | Pass a negative amount to subtract | cvar.c:537 (+ Q_atof bothtools.c:133-137) | `delta = Q_atof (Cmd_Argv(2));` / `if (*str == '-') { sign = -1; str++; }` | MATCH |
| C4 | inc <cvar> = add 1 to <cvar> | cvar.c:522-527, 538-539 | `c = Cmd_Argc(); if (c != 2 && c != 3) { Con_Printf ("inc <cvar> [value]\n"); return; }` + `else delta = 1;` (c==2 path) | MATCH |
| C5 | inc <cvar> <amount> (may be negative) = add <amount> | cvar.c:536-537, 541 (+ Q_atof) | `if (c == 3) delta = Q_atof (Cmd_Argv(2));` then `Cvar_SetValue (var, var->value + delta);` | MATCH |
| C6a | Set by: server console | sv_main.c:3166-3170 (SV_GetConsoleCommands) -> Cbuf_Execute -> Cmd_ExecuteString -> cmd_functions | `cmd = Sys_ConsoleInput (); ... Cbuf_AddText (cmd); Cbuf_AddText ("\n");` | MATCH |
| C6b | Set by: rcon | sv_main.c:1828 (after Rcon_Validate, SVC_RemoteCommand) | `Cmd_ExecuteString(str);` | MATCH |
| C6-neg | (implied) NOT reachable by a connected player | sv_user.c:3399-3424 (SV_ExecuteUserCommand) + ucmds[] cvar table sv_user.c:3299-3385 | client clc_stringcmd dispatches only `for (u=ucmds ; u->name ; u++)` + `SV_ExecutePRCommand()`, else `Con_Printf("Bad user command...")`; `inc` is absent from ucmds[] | MATCH (closed) |

**V-pass notes:** Oracle version confirmed: git describe == 1.11-53-g18d0362. Single registration tree-wide (cvar.c:568 `Cmd_AddCommand ("inc", Cvar_Inc_f)`), single handler (Cvar_Inc_f, cvar.c:516-542), no client-side or #ifdef variant, no cross-mod override of the name.

Every material clause enforce-traces to a located line, with callees followed:
- Core add/default: handler cvar.c:536-541 is the whole enforcing body. c==2 -> delta=1; c==3 -> delta=Q_atof(arg2); both -> Cvar_SetValue(var, var->value + delta). Cvar_SetValue (cvar.c:205-217) writes value+delta back via Cvar_Set. MATCH for C1/C2/C4/C5.
- Negative: followed the callee Q_atof (bothtools.c:121-) -- explicit leading-`-` -> sign=-1, result * sign. So a negative arg yields a negative delta and subtracts. C3 / "may be negative" MATCH. (Q_atof also parses 0x-hex and 'char literals, but the description's plain-number framing is correct for the common case and not contradicted.)
- Access-class clause "server console / rcon" was NOT taken from the command name. mvdsv `Cmd_AddCommand` (cmd.c:706-740) has NO CF_-flag field at all -- the server-console dispatch model is flagless, governed entirely by which interpreter feeds Cmd_ExecuteString. Traced BOTH halves: server console input -> SV_GetConsoleCommands -> Cbuf -> Cmd_ExecuteString (sv_main.c:3166-3170); rcon -> SVC_RemoteCommand after Rcon_Validate -> Cmd_ExecuteString(str) (sv_main.c:1828). Also verified the NEGATIVE that makes "server console / rcon" an exhaustive list rather than a guess: the connected-client clc_stringcmd path (sv_user.c:4769-4772 -> SV_ExecuteUserCommand, 3399-3424) dispatches ONLY the ucmds[] table + the QC-mod PR hook and prints "Bad user command" on miss -- it does not fall through to cmd_functions, and `inc` is not in ucmds[] (3299-3385). A player therefore cannot invoke `inc` over the network. C6 MATCH.

Residuals are FYI only (see flags), not defects -- the description does not claim them:
1. `inc` does NOT create a missing cvar (cvar.c:529-534 prints "Unknown variable" and returns), unlike `set` which Cvar_Creates. Description's "current value" correctly presumes existence; silent on not-found, which is acceptable for a user-doc error-state.
2. The write goes through Cvar_Set, so CVAR_ROM cvars (cvar.c:134-135 `return`) and OnChange-cancelled cvars (137-147) are silent no-ops. These are general cvar-write semantics shared by set/toggle/inc, not `inc`-specific, so the unconditional "Adds..." is an acceptable user-doc simplification.

PROC-1: no judgment residual; the one presentation-policy-adjacent item (whether to mention not-found/ROM no-op) is a coverage choice, not a correctness flag -- left as FYI for the operator, not absorbed into the verdict.

## flags_for_review

- [fyi/other/vpass] inc does not create a missing cvar -- handler cvar.c:529-534 prints 'Unknown variable "%s"' and returns if Cvar_Find fails. This differs from the sibling `set` command (cvar.c:512) which Cvar_Creates a CVAR_USER_CREATED cvar when the name is unknown. The proposed description is silent on the not-found case (acceptable for a user-doc), but if the operator wants symmetry with how `set` is documented, a one-line 'the cvar must already exist' could be added.
- [fyi/other/vpass] inc writes through Cvar_Set, so it is a silent no-op on CVAR_ROM (read-only) cvars (cvar.c:134-135) and on cvars whose OnChange callback cancels the change (cvar.c:137-147). This is general cvar-write behavior shared by set/toggle/inc, not specific to inc, so the unconditional 'Adds a number...' wording is not wrong -- just an FYI on the boundary.
- [fyi/other/vpass] Access surface verified structurally, not from the command name: mvdsv server-side Cmd_AddCommand (cmd.c:706) carries no CF_-style access flag, and the connected-client stringcmd path (SV_ExecuteUserCommand, sv_user.c:3399) is closed to the ucmds[] table + QC hook and does not fall through to cmd_functions. `inc` is absent from ucmds[], so a player cannot trigger it. The 'server console / rcon' scope is therefore exhaustive for this binary. Flagged only so a future reviewer knows the negative was traced, not assumed.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "inc",
  "type": "command",
  "description": "Adds a number to a cvar's current value. With no amount given it adds 1; pass a negative amount to subtract.\n\ninc <cvar> = add 1 to <cvar>.\ninc <cvar> <amount> = add <amount> (may be negative) to <cvar>.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cvar.c:541. Cvar_Inc_f (src/cvar.c:516-542), registered cvar.c:568. Arg-count gate: c != 2 && c != 3 -> usage 'inc <cvar> [value]' (cvar.c:522-525). Unknown variable -> error, no-op (cvar.c:530-534). Delta: c==3 -> delta = Q_atof(Cmd_Argv(2)) else delta = 1 (cvar.c:536-539) -- so the optional second arg is the increment amount, defaulting to 1; Q_atof parses a negative literal so a negative amount decrements. Enforcing line: Cvar_SetValue(var, var->value + delta) (cvar.c:541) -- adds delta to the current numeric value. Set-by: Cmd_AddCommand only (cvar.c:568), absent from ucmds[] (grep src/sv_user.c empty) so not client-issuable; absent from normal-rcon blocklist (src/sv_main.c:1750-1767) so regular rcon reaches it. F-MV1: KTX registers no 'inc' command (grep ktx/src empty) -- engine command is live.",
  "description_proposed": null
}
```
