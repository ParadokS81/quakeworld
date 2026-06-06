# Ledger -- qwfwd `toggle` (command)

Handler `Cvar_Toggle_f`, src/cvar.c:389-407; registered src/cvar.c:525.

## Enforce-trace (per clause)

- "flips a cvar between 0 and 1" / "non-zero -> 0, zero -> 1" -- src/cvar.c:406
  `Cvar_Set (var->name, var->value ? "0" : "1")`. The decision reads `var->value`
  (the float interpretation set by `var->value = atof(var->string)`, src/cvar.c:180):
  any non-zero current value sets the string to "0"; a zero value sets it to "1".
  Polarity TRACED (truthy -> "0", falsy -> "1").
- "takes exactly one argument, the cvar name" -- src/cvar.c:393
  `if (Cmd_Argc() != 2)` prints the usage line `toggle <cvar> : toggle a cvar on/off`
  (src/cvar.c:395) and returns; argv(1) is the cvar (src/cvar.c:399). TRACED.
- "unknown cvar -> error, no change" -- src/cvar.c:399-404: `Cvar_Find(Cmd_Argv(1))`;
  if NULL, `Sys_Printf("Unknown variable \"%s\"\n", ...)` and return. TRACED.
- write-protection (NOT asserted in description, but verified for honesty): the set
  routes through `Cvar_Set` -> `Cvar_Set2(..., force=false)` (src/cvar.c:202-205),
  which refuses a CVAR_READONLY cvar, or a CVAR_NOSET cvar once `ps.initialized`
  (src/cvar.c:167-174, printing "is write protected"). Not surfaced in the user doc
  (a write-protected cvar is an edge property of the target, not toggle's behavior);
  noted here for completeness. TRACED.
- "Set by: server console / config" -- verified access model; no per-command access
  gate in the cmd.c dispatch path. TRACED.

No "Default:" line (D20: command).

```json
{
  "project": "qwfwd",
  "knob": "toggle",
  "type": "command",
  "description": "Flips a cvar between off and on. If the cvar's current value is anything other than zero it is set to 0; if it is zero it is set to 1.\n\ntoggle <cvar> = the cvar to flip.\n\nReports an error and changes nothing if the named cvar does not exist.\n\nSet by: server console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Synthesized from handler Cvar_Toggle_f (src/cvar.c:389-407). Enforce-trace: core flip at src/cvar.c:406 `Cvar_Set(var->name, var->value ? \"0\" : \"1\")` -- reads the float value var->value (set via atof at src/cvar.c:180), so any non-zero current value -> \"0\", zero -> \"1\" (polarity verified). Arg contract: exactly one arg required, else usage line printed (src/cvar.c:393-396); cvar is argv(1) (src/cvar.c:399). Unknown-cvar guard prints 'Unknown variable' and returns with no change (src/cvar.c:399-404). The set goes through Cvar_Set -> Cvar_Set2 non-forced (src/cvar.c:202-205), so a write-protected target (CVAR_READONLY, or CVAR_NOSET after ps.initialized) is refused at src/cvar.c:167-174 -- an edge property of the target cvar, deliberately kept out of the user-doc prose. Set-by per verified QWFWD access model (console/config; no per-command access gate in cmd.c). D20: no Default line for a command.",
  "description_proposed": null
}
```
