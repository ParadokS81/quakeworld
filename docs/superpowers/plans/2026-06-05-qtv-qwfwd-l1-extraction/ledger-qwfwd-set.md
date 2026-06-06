# Ledger -- qwfwd `set` (command)

Handler `Cvar_Set_f`, src/cvar.c:431-455; registered src/cvar.c:526.

## Enforce-trace (per clause)

- "sets a cvar to a value" -- src/cvar.c:443-449: `var_name = Cmd_Argv(1)`;
  `Cmd_Args_Range(2, Cmd_Argc()-1, string, ...)` joins argv(2)..last into `string`
  (cmd.c:605-628 joins the token range with single spaces); if the cvar exists,
  `Cvar_Set(var_name, string)` (src/cvar.c:449). TRACED.
- "value can be multiple words / everything after the name is the value" --
  `Cmd_Args_Range(2, Cmd_Argc()-1, ...)` (src/cvar.c:445) spans argv index 2 to the
  last argument, space-joined (cmd.c:620-625). TRACED.
- "creates the cvar if it does not exist" -- src/cvar.c:447-454: `if (var)` set it,
  `else var = Cvar_Create(var_name, string, CVAR_USER_CREATED)` (src/cvar.c:453).
  CVAR_USER_CREATED = (1<<4), src/cvar.h:63 comment "// created by a set command".
  TRACED.
- "needs a name and a value" -- src/cvar.c:437 `if (Cmd_Argc() < 3)` prints
  `usage: set <cvar> <value>` (src/cvar.c:439) and returns. TRACED.
- write-protection asymmetry (NOT asserted in description; verified for honesty):
  the EXISTING-cvar path uses `Cvar_Set` -> non-forced `Cvar_Set2`, so a
  write-protected existing cvar is refused (src/cvar.c:167-174). The NEW-cvar path
  goes through `Cvar_Create` -> `Cvar_ForceSet` (src/cvar.c:280), force-setting the
  freshly created (unprotected) cvar. Both reduce to "the value is applied" for the
  user; the protection edge is a target property kept out of the prose. TRACED.
- "Set by: server console / config" -- verified access model; no per-command access
  gate in cmd.c dispatch. TRACED.

No "Default:" line (D20: command).

```json
{
  "project": "qwfwd",
  "knob": "set",
  "type": "command",
  "description": "Assigns a value to a cvar. Everything typed after the cvar name becomes the value, so multi-word values do not need quoting. If the named cvar does not already exist it is created.\n\nset <cvar> <value> = the cvar to set and the value to give it.\n\nSet by: server console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Synthesized from handler Cvar_Set_f (src/cvar.c:431-455). Enforce-trace: name = argv(1) (src/cvar.c:443); value = Cmd_Args_Range(2, Cmd_Argc()-1, ...) which space-joins argv index 2 through the last token (def cmd.c:605-628, join loop cmd.c:620-625) -- hence multi-word values without quoting. Existing cvar -> Cvar_Set(var_name, string) (src/cvar.c:449); missing cvar -> Cvar_Create(var_name, string, CVAR_USER_CREATED) (src/cvar.c:453), flag def src/cvar.h:63 ('created by a set command'). Arg guard: Cmd_Argc() < 3 prints 'usage: set <cvar> <value>' (src/cvar.c:437-440). Write-protection asymmetry verified but kept out of prose: existing-cvar path is non-forced Cvar_Set (refuses CVAR_READONLY / post-init CVAR_NOSET at src/cvar.c:167-174); new-cvar path force-sets via Cvar_Create->Cvar_ForceSet (src/cvar.c:280) on the fresh unprotected cvar. Set-by per verified QWFWD access model (console/config; no per-command access gate in cmd.c). D20: no Default line for a command.",
  "description_proposed": null
}
```
