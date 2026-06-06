# Ledger -- qwfwd `quit` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction | **Phase:** 3 describe-fill
**Project:** qwfwd | **Anchor:** 1.40-dev
**Handler:** `Cmd_Quit_f` (src/main.c:92-99) | **Registered:** src/main.c:136
**Verdict:** synthesized | **Class:** TRACED-CLEAN

## Enforce-trace (per-clause)

| Clause | Enforcing file:line | Snippet | Result |
|---|---|---|---|
| Shuts down the qwfwd proxy | src/main.c:96-98 ; src/main.c:160 | no-arg sets `ps.wanttoexit = true`; the run loop `while(!ps.wanttoexit)` (src/main.c:160) then exits and the thread returns (src/main.c:176-179) | MATCH -- terminates the proxy |
| No-arg = clean / delayed shutdown | src/main.c:97-98 | `else ps.wanttoexit = true; // delayed exit, clean` | MATCH -- flag-driven; loop finishes current frame first |
| Any argument = immediate / non-clean exit | src/main.c:95-96 | `if (Cmd_Argc() > 1) Sys_Exit(0); // immidiate, non clean` | MATCH -- arg count >1 triggers Sys_Exit |
| Immediate exit terminates the process now | src/main.c:96 -> src/sys.c:166-178 | `Sys_Exit(0)` calls `exit(code)` (or `ExitThread`/`pthread_exit` under APP_DLL) | MATCH -- no loop unwind, no cleanup pass |
| Clean path runs shutdown cleanup; immediate path does not | src/main.c:176-177 | after the loop: `Cmd_DeInit(); Cvar_DeInit();` -- reached only via the wanttoexit path, skipped by Sys_Exit | MATCH |
| Set by: server console / config (no access tiers) | src/main.c:136 ; src/cmd.c:693 | `Cmd_AddCommand("quit", Cmd_Quit_f);` ; `void Cmd_AddCommand (char *cmd_name, xcommand_t function)` | MATCH -- name+function only; no access-class flag |

## Notes
- COMMAND shape: optional arg distinguishes clean vs immediate; arg is a presence flag (`Cmd_Argc() > 1`), the value/text is not parsed -- so the arg spelled as a bare `<anything>` toggle, not a typed parameter.
- "Default:" omitted per D20 command rule (no meaningful no-arg default value to state; the no-arg case IS the documented clean path).
- No suspect-pool membership (suspect_pool_member=FALSE); no mechanical candidate; cold synthesis from the handler body.
- SR-7 N/A: `quit` is not one of the 11 source_inline stubs (arrived with NULL description).

```json
{
  "project": "qwfwd",
  "knob": "quit",
  "type": "command",
  "description": "Shuts the proxy down. With no argument it exits cleanly, letting the proxy finish its current work and run its shutdown cleanup first. If you pass any argument, it exits immediately without that clean shutdown.\n\nquit = clean, orderly shutdown.\nquit <anything> = immediate exit (skips cleanup).\n\nSet by: server console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold synthesis from handler Cmd_Quit_f (src/main.c:92-99); no comment to affirm, no mechanical candidate, suspect_pool_member=FALSE. Two branches gated on argument count: src/main.c:95-96 `if (Cmd_Argc() > 1) Sys_Exit(0); // immidiate, non clean` -> immediate exit; src/main.c:97-98 `else ps.wanttoexit = true; // delayed exit, clean` -> sets the run-loop sentinel. The run loop is `while(!ps.wanttoexit)` (src/main.c:160); after it falls through, src/main.c:176-177 runs `Cmd_DeInit(); Cvar_DeInit();` (the cleanup pass), so 'clean / finishes current work / runs cleanup' is enforce-traced. Sys_Exit (src/sys.c:166-178) calls exit()/ExitThread()/pthread_exit() with no loop unwind, so the arg path skips that cleanup -- 'immediate, skips cleanup' is enforce-traced. The argument is a presence flag only (Cmd_Argc()>1); the handler never reads Cmd_Argv, so the arg is described as bare '<anything>', not a typed parameter. Set-by per verified QWFWD access model: registration at src/main.c:136 via Cmd_AddCommand(char*, xcommand_t) (src/cmd.c:693), name+function only, no access-class flag; QWFWD has no access tiers and no own rcon -- console/config dispatch. D20: no Default line (no-arg case is the documented clean path, not a value default).",
  "description_proposed": null
}
```
