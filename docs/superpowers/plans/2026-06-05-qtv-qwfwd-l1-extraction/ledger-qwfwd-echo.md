# Ledger -- qwfwd `echo` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill
**Handler:** `Cmd_Echo_f` (src/cmd.c:352-359), registered src/cmd.c:1072
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.40-dev

## Enforce-trace

| Clause | Enforcing line | Snippet | Result |
|---|---|---|---|
| Prints the supplied arguments to the console | src/cmd.c:357 | `Sys_Printf("%s ",Cmd_Argv(i))` | MATCH |
| Loops over arguments after the command name (argv 1..argc-1) | src/cmd.c:356 | `for (i=1 ; i<Cmd_Argc() ; i++)` | MATCH |
| Arguments rendered space-separated | src/cmd.c:357 | format string `"%s "` (trailing space per token) | MATCH |
| Emits a trailing newline | src/cmd.c:358 | `Sys_Printf("\n")` | MATCH |
| No-arg form prints just a blank line | src/cmd.c:356-358 | loop body skipped when argc==1, newline still printed | MATCH |

SR-7: the prior `source_inline` stub was the raw C comment block "Just prints the
rest of the line to the console" (src/cmd.c:349). Ignored per SR-7; synthesized
fresh from the handler body. End-state origin = `synthesized`.

No cvar/`$var` expansion claimed: expansion is a tokenizer-stage concern
(`Cmd_ExpandString`, src/cmd.c:777), not performed inside `Cmd_Echo_f`; the handler
prints already-tokenized argv values. Nothing to trace -> not asserted.

```json
{
  "project": "qwfwd",
  "knob": "echo",
  "type": "command",
  "description": "Prints its arguments back to the proxy console, separated by spaces and followed by a newline. With no arguments it prints a blank line. Mainly useful for adding readable progress messages inside a config file run with exec.\n\necho <text...> = print <text...> to the console.\n\nSet by: proxy server console / qwfwd.cfg.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cmd_Echo_f (src/cmd.c:352-359). Loop src/cmd.c:356 `for (i=1 ; i<Cmd_Argc() ; i++)` walks argv[1..argc-1] (the tokens after the command name); src/cmd.c:357 `Sys_Printf(\"%s \",Cmd_Argv(i))` prints each token with a trailing space (space-separated); src/cmd.c:358 `Sys_Printf(\"\\n\")` always emits the closing newline, so a no-arg `echo` prints a blank line. SR-7: prior source_inline stub was the raw dev comment at src/cmd.c:349 (\"Just prints the rest of the line to the console\") -- ignored, synthesized fresh; end-state origin synthesized. No $cvar expansion asserted: Cmd_ExpandString (src/cmd.c:777) runs at tokenization, not in this handler -- no enforcing line in Cmd_Echo_f, so not claimed. No Default line (command, no meaningful no-arg default value). Set-by: QWFWD has no access tiers / no own rcon (ACCESS MODEL) -- commands are issued from the proxy server console or qwfwd.cfg. TRACED-CLEAN.",
  "description_proposed": null
}
```
