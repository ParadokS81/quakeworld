# Ledger -- qwfwd `inc` (command)

Handler `Cvar_Inc_f`, src/cvar.c:457-483; registered src/cvar.c:527.

## Enforce-trace (per clause)

- "adds an amount to a cvar's numeric value" -- src/cvar.c:482
  `Cvar_SetValue (var->name, var->value + delta)`. `var->value` is the current float
  (set via atof at src/cvar.c:180); `Cvar_SetValue` (src/cvar.c:239-246) formats the
  result with `%.8g` and calls `Cvar_Set`. TRACED.
- "default step is 1 when no amount is given" -- src/cvar.c:477-480:
  `if (c == 3) delta = atof(Cmd_Argv(2)); else delta = 1`. With one arg (c==2),
  delta = 1. TRACED.
- "an explicit amount can be a decimal, and a negative amount decreases the value" --
  `delta = atof(Cmd_Argv(2))` (src/cvar.c:478) accepts a signed/fractional float;
  `var->value + delta` (src/cvar.c:482) therefore subtracts when delta is negative.
  TRACED (polarity: negative delta lowers the value).
- "takes the cvar name and an optional amount" -- src/cvar.c:463-468:
  `c = Cmd_Argc(); if (c != 2 && c != 3)` prints `inc <cvar> [value]` (src/cvar.c:466)
  and returns; so 1 or 2 args accepted. TRACED.
- "unknown cvar -> error, no change" -- src/cvar.c:470-475: `Cvar_Find(Cmd_Argv(1))`;
  if NULL, `Sys_Printf("Unknown variable \"%s\"\n", ...)` and return. TRACED.
- write-protection (NOT asserted in description; verified for honesty):
  `Cvar_SetValue` -> `Cvar_Set` -> non-forced `Cvar_Set2`, so a write-protected target
  is refused (src/cvar.c:167-174). Target-property edge kept out of the prose. TRACED.
- "Set by: server console / config" -- verified access model; no per-command access
  gate in cmd.c dispatch. TRACED.

No "Default:" line (D20: command; the no-amount default step of 1 is stated in the
value-meaning line, not as a cvar Default).

```json
{
  "project": "qwfwd",
  "knob": "inc",
  "type": "command",
  "description": "Adds an amount to a cvar's current numeric value. With no amount given it increases the value by 1. The amount may be a decimal, and a negative amount decreases the value instead.\n\ninc <cvar> [amount] = the cvar to change and, optionally, how much to add (default 1).\n\nReports an error and changes nothing if the named cvar does not exist.\n\nSet by: server console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Synthesized from handler Cvar_Inc_f (src/cvar.c:457-483). Enforce-trace: core at src/cvar.c:482 `Cvar_SetValue(var->name, var->value + delta)` -- reads current float var->value (set via atof at src/cvar.c:180); Cvar_SetValue formats with %.8g and calls Cvar_Set (src/cvar.c:239-246). Default step: src/cvar.c:477-480, delta = atof(argv(2)) when 2 args (c==3), else delta = 1 -- so a bare 'inc <cvar>' adds 1. Decimal/negative amount: atof accepts signed fractional input (src/cvar.c:478), and var->value + delta subtracts when delta < 0 (polarity verified -- negative lowers the value). Arg guard: c != 2 && c != 3 prints 'inc <cvar> [value]' (src/cvar.c:463-466), so 1 or 2 args. Unknown-cvar guard prints 'Unknown variable' and returns with no change (src/cvar.c:470-475). Write-protection: Cvar_SetValue -> Cvar_Set -> non-forced Cvar_Set2 refuses a write-protected target (src/cvar.c:167-174) -- a target-property edge, kept out of the prose. Set-by per verified QWFWD access model (console/config; no per-command access gate in cmd.c). D20: no cvar Default line; the no-amount step of 1 is stated in the value-meaning line.",
  "description_proposed": null
}
```
