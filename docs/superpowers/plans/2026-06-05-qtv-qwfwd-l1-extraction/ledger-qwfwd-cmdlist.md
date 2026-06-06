# Ledger -- qwfwd `cmdlist` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill
**Handler:** `Cmd_CmdList_f` (src/cmd.c:757-766), registered src/cmd.c:1075
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.40-dev

## Enforce-trace

| Clause | Enforcing line | Snippet | Result |
|---|---|---|---|
| Prints every registered console command, one per line | src/cmd.c:762-763 | `for (cmd=cmd_functions, i=0 ; cmd ; cmd=cmd->next, i++) Sys_Printf("%s\n", cmd->name)` | MATCH |
| Walks the full registered-command list | src/cmd.c:762 | iterates `cmd_functions` linked list to the end | MATCH |
| Prints the total command count at the end | src/cmd.c:765 | `Sys_Printf("------------\n%d commands\n", i)` | MATCH |
| Takes no arguments | src/cmd.c:757-766 | handler body reads no argv | MATCH |

```json
{
  "project": "qwfwd",
  "knob": "cmdlist",
  "type": "command",
  "description": "Lists every console command the proxy supports, one name per line, and prints the total count at the end. Useful for discovering which commands are available. It takes no arguments.\n\nSet by: proxy server console / qwfwd.cfg.\nSee also: cvarlist (the equivalent listing for settings).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cmd_CmdList_f (src/cmd.c:757-766). src/cmd.c:762 `for (cmd=cmd_functions, i=0 ; cmd ; cmd=cmd->next, i++)` walks the whole registered-command linked list; src/cmd.c:763 `Sys_Printf(\"%s\\n\", cmd->name)` prints each command name one per line; src/cmd.c:765 `Sys_Printf(\"------------\\n%d commands\\n\", i)` prints the running count as the trailer. Handler reads no argv -> no arguments. See-also cvarlist is the sibling settings listing surfaced by Cmd_Help_f (src/cmd.c:754 \"Use cmdlist to get a list of commands or cvarlist to get a list of variables\") -- an in-engine same-codebase pointer, not a cross-engine L3 route. No Default line (command, no value). Set-by: QWFWD has no access tiers / no own rcon (ACCESS MODEL) -- issued from the proxy console or qwfwd.cfg. TRACED-CLEAN.",
  "description_proposed": null
}
```
