# describe-fill-synthesis ledger -- mvdsv `toggle`

- **project:** mvdsv
- **knob:** `toggle` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:toggle: synthesized -- flips cvar nonzero->0 / zero->1 via Cvar_Set ternary; console/rcon, no client path, no KTX override -- origin=synthesized ref=src/cvar.c:332 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Flips a cvar between off and on. If the cvar's current value is nonzero it is set to 0; otherwise it is set to 1.
>
> toggle <cvar> = if <cvar> is currently nonzero set it to 0, else set it to 1.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| nonzero -> 0, else -> 1 | src/cvar.c:332 | `Cvar_Set (var, var->value ? "0" : "1");` | MATCH |
| 1-arg usage gate | src/cvar.c:319-321 | `if (Cmd_Argc() != 2) { Con_Printf ("toggle <cvar> : toggle a cvar on/off\n");` | MATCH |
| unknown var is a no-op | src/cvar.c:326-329 | `if (!var) { Con_Printf ("Unknown variable \"%s\"\n", Cmd_Argv(1)); return; }` | MATCH |
| not client-issuable (ucmds absent) | src/sv_user.c | grep `"toggle"` empty | MATCH |
| not on normal-rcon blocklist | src/sv_main.c:1750-1767 | 'toggle' absent from blocklist | MATCH |
| no KTX override | ktx/src | grep AddCommand "toggle" empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|---|---|---|---|
| 1 | `toggle` is a command that flips a cvar between off/on (takes <cvar> arg) | src/cvar.c:325,332 (handler `Cvar_Toggle_f`; registered src/cvar.c:566 `Cmd_AddCommand("toggle", Cvar_Toggle_f)`) | `var = Cvar_Find (Cmd_Argv(1)); ... Cvar_Set (var, var->value ? "0" : "1");` | MATCH |
| 2 | If current value is nonzero -> set to 0 | src/cvar.c:332 + type at src/cvar.h:72 | `Cvar_Set (var, var->value ? "0" : "1");` with `float value;` -> nonzero float is truthy -> selects `"0"` | MATCH |
| 3 | Otherwise (zero) -> set to 1 | src/cvar.c:332 | `var->value ? "0" : "1"` -> false (zero) branch yields `"1"` | MATCH |
| 4a | Scope: server console | src/cmd.c:933-938 (`Cmd_ExecuteString` global-table dispatch, no access gate) | `for (cmd=cmd_hash_array[key]...) { if (!strcasecmp(Cmd_Argv(0), cmd->name)) { if (cmd->function) cmd->function (); return; } }` | MATCH |
| 4b | Scope: rcon | src/sv_main.c:1828 dispatch + src/sv_main.c:1754-1764 blocklist (toggle NOT listed) | `Cmd_ExecuteString(str);` ; "normal rcon can't use these commands" list (rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line) excludes `toggle` | MATCH |
| 4c | Scope excludes connected players (client stringcmd) | src/sv_user.c:3299-3424; `toggle` absent from `ucmds[]`; `SV_ExecuteUserCommand` has no fallthrough to global cmd table | `for (u=ucmds ; u->name ; u++) {...}` then `SV_ExecutePRCommand()` else `Con_Printf("Bad user command: %s\n", ...)` -- never reaches `Cmd_ExecuteString` | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. enforce-trace-discipline.md loaded and applied per-clause.

Handler is `Cvar_Toggle_f` (src/cvar.c:315-333), registered via plain `Cmd_AddCommand("toggle", Cvar_Toggle_f)` at src/cvar.c:566. The entire enforcing logic is one line: `Cvar_Set (var, var->value ? "0" : "1");` (cvar.c:332).

Clause-by-clause:
- Polarity/threshold (clauses 2-3): `var->value` is `float` (cvar.h:72). C ternary truthiness means ANY nonzero float -> "0", exactly zero -> "1". This is the precise "nonzero" semantics the description states, not name/string inference. Verified at the enforcing line + adjacent type declaration. MATCH.
- Target values: passes string literals "0"/"1" to Cvar_Set; cvar lands on 0/1. Matches "set it to 0 / set it to 1". MATCH.
- Scope (clause 4): mvdsv has a SINGLE `Cmd_AddCommand` variant (no per-command access flags -- verified: only one `void Cmd_AddCommand` definition in cmd.c:706). The only access gate is the dispatch surface. Traced all three surfaces:
  (a) Server console / Cbuf -> Cmd_ExecuteString (cmd.c:916) finds it in cmd_hash_array and calls cmd->function() with no gate.
  (b) Rcon -> sv_main.c:1828 Cmd_ExecuteString; the normal-rcon blocklist (1754-1764) does NOT contain `toggle`, so both master-rcon and normal-rcon can run it.
  (c) Client `cmd toggle x` -> SV_ExecuteUserCommand (sv_user.c:3399) walks the closed `ucmds[]` table; `toggle` is absent and there is NO fallthrough to the global command table (it falls to SV_ExecutePRCommand then "Bad user command"). So a connected player CANNOT invoke toggle. This confirms the description's "server console / rcon" scope is complete and exclusive.

No metadata clause to check (WI-2): `toggle` is a command, not a cvar -- the description correctly asserts no "Default X". Access-class framing "server console / rcon" verified against the dispatch surfaces (not inferred from name).

No side-effect over-claim: description stays at "sets to 0/1"; Cvar_Set's OnChange machinery is generic and not asserted. PROC-1: every residual reduces to a checkable fact confirmed at its enforcing line; nothing left as judgment.

Every material clause maps to a located, verified enforcing line incl. adjacent code/type. No flavour-C inference. Classification: TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] toggle on an unregistered cvar prints 'Unknown variable "%s"' and is a no-op (src/cvar.c:326-330). The description describes only the happy path; this is appropriate for a user-doc and not a defect. FYI only.
- [fyi/other/vpass] mvdsv has no per-command access tier -- a single Cmd_AddCommand(name, fn) with no CF_ flags (unlike KTX's command-table flags). Server-command scope is therefore determined purely by which dispatch surfaces reach the global cmd table (console + rcon yes; client stringcmd no). Generalizes to all plainly-registered mvdsv commands; relevant for any sibling describe-fill rows that try to state an access class.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "toggle",
  "type": "command",
  "description": "Flips a cvar between off and on. If the cvar's current value is nonzero it is set to 0; otherwise it is set to 1.\n\ntoggle <cvar> = if <cvar> is currently nonzero set it to 0, else set it to 1.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cvar.c:332. Cvar_Toggle_f (src/cvar.c:315-333), registered cvar.c:566. Arg-count gate: Cmd_Argc() != 2 -> usage 'toggle <cvar> : toggle a cvar on/off' (cvar.c:319-321). Unknown variable -> 'Unknown variable' error, no-op (cvar.c:325-329). Enforcing line for the flip: Cvar_Set (var, var->value ? \"0\" : \"1\") (cvar.c:332) -- ternary on var->value (the parsed numeric), so ANY nonzero current value goes to \"0\" and zero goes to \"1\" (NOT a strict 0<->1 swap of arbitrary values; e.g. value 5 toggles to 0). Set-by: Cmd_AddCommand only (cvar.c:566), absent from ucmds[] (grep src/sv_user.c empty) so not client-issuable; absent from normal-rcon blocklist (src/sv_main.c:1750-1767) so regular rcon reaches it. F-MV1: KTX registers no 'toggle' command (grep ktx/src empty) -- engine command is live.",
  "description_proposed": null
}
```
