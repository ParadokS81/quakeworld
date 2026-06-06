# Ledger -- qwfwd `help` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction | **Phase:** 3 describe-fill
**Project:** qwfwd | **Anchor:** 1.40-dev
**Handler:** `Cmd_Help_f` (src/cmd.c:752-755) | **Registered:** src/cmd.c:1076
**Verdict:** synthesized | **Class:** TRACED-CLEAN

## Enforce-trace (per-clause)

| Clause | Enforcing file:line | Snippet | Result |
|---|---|---|---|
| Prints a single hint line, no per-command help | src/cmd.c:754 | `Sys_Printf("Use cmdlist to get a list of commands or cvarlist to get a list of variables.\n");` | MATCH -- one printf, the entire body |
| Directs the user to `cmdlist` for commands | src/cmd.c:754 | (same line) text names `cmdlist` | MATCH; `cmdlist` is real: registered src/cmd.c:1075 -> `Cmd_CmdList_f` (src/cmd.c:757-766) lists every command |
| Directs the user to `cvarlist` for variables | src/cmd.c:754 | (same line) text names `cvarlist` | MATCH; `cvarlist` is real: registered src/cvar.c:524 -> `Cvar_CvarList_f` (src/cvar.c:416-428) lists every cvar |
| Takes no arguments / ignores any given | src/cmd.c:752-755 | handler reads no `Cmd_Argc`/`Cmd_Argv` | MATCH -- argv never consulted |
| Set by: server console / config (no access tiers) | src/cmd.c:1076 ; src/cmd.c:693 | `Cmd_AddCommand ("help", Cmd_Help_f);` ; `void Cmd_AddCommand (char *cmd_name, xcommand_t function)` | MATCH -- name+function only; no access-class flag |

## Notes
- COMMAND shape: no args; "Default:" omitted per D20 command rule.
- `help` does NOT print the command/cvar lists itself -- it only points at `cmdlist` and `cvarlist`. Describing it as "lists commands" would overstate the body (the registration comment `// A bit more logical :)` at src/cmd.c:1076 is dev banter, not behavior, and is ignored per D20/B1).
- No suspect-pool membership (suspect_pool_member=FALSE); no mechanical candidate; cold synthesis from the handler body.
- SR-7 N/A: `help` is not one of the 11 source_inline stubs (it arrived with a NULL description).

```json
{
  "project": "qwfwd",
  "knob": "help",
  "type": "command",
  "description": "Prints a short hint telling you which two commands list what is available: 'cmdlist' for all commands and 'cvarlist' for all variables. It does not show help for any individual command; run those two commands to see the full lists. Takes no arguments.\n\nSet by: server console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold synthesis from handler Cmd_Help_f (src/cmd.c:752-755); no comment to affirm, no mechanical candidate, suspect_pool_member=FALSE. The entire handler body is a single Sys_Printf (src/cmd.c:754) emitting 'Use cmdlist to get a list of commands or cvarlist to get a list of variables.' -- so 'prints a short hint' and 'does not show help for any individual command' are the literal body. The two referenced commands are real: cmdlist registered src/cmd.c:1075 -> Cmd_CmdList_f (src/cmd.c:757-766) prints every command; cvarlist registered src/cvar.c:524 -> Cvar_CvarList_f (src/cvar.c:416-428) prints every cvar -- hence the hint is accurate. No-arg: the handler never reads Cmd_Argc/Cmd_Argv. The registration trailing comment '// A bit more logical :)' (src/cmd.c:1076) is dev banter, not behavior, and is excluded from the description per D20. Set-by per verified QWFWD access model: registration at src/cmd.c:1076 via Cmd_AddCommand(char*, xcommand_t) (src/cmd.c:693) carries name+function only, no access-class flag; QWFWD has no access tiers and no own rcon -- commands run from the proxy console/config. D20: no Default line for a no-arg command.",
  "description_proposed": null
}
```
