# describe-fill-synthesis ledger -- mvdsv `echo`

- **project:** mvdsv
- **knob:** `echo` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:echo: synthesized -- prints the remaining args to the server console (script/alias status output); admin-only (not in ucmds[]) -- origin=synthesized ref=src/cmd.c:365 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Prints the rest of the command line back to the server console, separated by spaces. Mainly used inside config scripts and aliases to print status or progress messages.
>
> echo <text...> = print <text> to the console.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| prints args to console | src/cmd.c:369-370 | `for (i=1 ; i<Cmd_Argc() ; i++) Con_Printf ("%s ",Cmd_Argv(i));` | MATCH |
| space-separated + trailing newline | src/cmd.c:370-371 | `Con_Printf ("%s ",...); ... Con_Printf ("\n");` | MATCH |
| starts at arg 1 (skips command name) | src/cmd.c:369 | `for (i=1 ; ...)` | MATCH |
| registration / handler | src/cmd.c:1069 | `Cmd_AddCommand ("echo",Cmd_Echo_f);` | MATCH |
| admin-only (not client-issuable) | src/sv_user.c:3299-3368 | ucmds[] table -- no "echo" entry | MATCH (absence verified) |
| not on normal-rcon blocklist | src/sv_main.c:1754-1764 | blocklist token list excludes echo | MATCH (absence verified) |
| no KTX override | ktx/src (grep) | no Cmd_AddCommand("echo",...) | MATCH (absence verified) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|---|---|---|---|
| 1 | "Prints the rest of the command line back to the server console" | src/cmd.c:362, 369-371 ; src/sv_send.c:159 | handler comment "Just prints the rest of the line to the console"; `for (i=1 ; i<Cmd_Argc() ; i++) Con_Printf ("%s ",Cmd_Argv(i)); Con_Printf ("\n");` ; Con_Printf -> `Sys_Printf ("%s", msg)` (local server console) + CONSOLE_LOG | MATCH |
| 2 | "separated by spaces" | src/cmd.c:370 | `Con_Printf ("%s ",Cmd_Argv(i));` -- each arg emitted followed by a space | MATCH (minor: a trailing space is also emitted after the last token before the newline; immaterial to a user-doc) |
| 3 | "Mainly used inside config scripts and aliases to print status or progress messages" | src/cmd.c:374+ (ALIASES section / cmd_alias_t) ; src/cmd.c:240 (Cbuf_ExecuteEx -> Cmd_ExecuteString for exec'd configs) | alias + cbuf/exec infrastructure exists and dispatches echo like any command; soft usage framing, nothing contradicts it | MATCH (soft framing, traceable to alias/exec infra) |
| 4 | "echo <text...> = print <text> to the console" (usage form) | src/cmd.c:365-372 | `void Cmd_Echo_f (void){ int i; for (i=1; i<Cmd_Argc(); i++) Con_Printf("%s ",Cmd_Argv(i)); Con_Printf("\n"); }` | MATCH |
| 5 | "Set by: server console / rcon" (access class) | src/cmd.c:1069 (registration) ; src/sv_main.c:1819-1828 (rcon) ; src/sv_user.c:3399-3428 (client path) | `Cmd_AddCommand ("echo",Cmd_Echo_f);` -- no access flags; rcon: `SV_BeginRedirect(RD_PACKET); ... Cmd_ExecuteString(str);` reaches echo; client `SV_ExecuteUserCommand` matches only fixed `ucmds[]` table or mod (`SV_ExecutePRCommand`), else "Bad user command" -- it does NOT fall through to Cmd_ExecuteString, so a connected player cannot invoke echo | MATCH |

**V-pass notes:** Oracle confirmed: mvdsv git describe == 1.11-53-g18d0362.

All five clauses map to located, verified enforcing lines (incl. adjacent comments). Single handler Cmd_Echo_f (src/cmd.c:365-372), single registration (src/cmd.c:1069) -- no hidden family, no PR2/mod-VM shadow, no cross-mod override (grep of pr2_cmds.c/pr_cmds.c for a game-side echo: none).

Highest-risk clause was the access class ("server console / rcon"). MVDSV commands registered via Cmd_AddCommand carry NO per-command access flags (signature is name+function only), so the access class is set by which dispatch path reaches Cmd_ExecuteString. Traced all three relevant paths: (a) local console / exec'd config via Cbuf_ExecuteEx->Cmd_ExecuteString (cmd.c:240); (b) rcon via SV_Rcon_f, which builds the arg string and calls Cmd_ExecuteString (sv_main.c:1822-1828) -- so `rcon <pw> echo ...` dispatches echo; (c) connected-client commands via SV_ExecuteUserCommand (sv_user.c:3399-3428), which ONLY matches the fixed ucmds[] table or hands off to the mod, and on no match prints "Bad user command" -- it never falls through to the general command system. Therefore a connected player cannot invoke echo, and "server console / rcon" is correct AND complete.

"separated by spaces" is faithful to the observable output. The code emits `%s ` per arg (trailing space, including after the final token before `\n`); the visible effect is space-separated tokens. The extra trailing space is immaterial to a user-facing doc and does not rise to a near-miss.

FYI nuance (not a defect, did not affect classification): "prints back to the server console" is exact for the local-invocation path. For rcon, Con_Printf's redirect branch (sv_send.c:156 `if (SV_AddToRedirect(msg)) return;`) diverts output to the rcon client instead of the local console -- this is the standard rcon return mechanism and is correctly implied by listing rcon as an access path, so the "server console" framing remains accurate as the local/primary description.

No flavour-C inference: every clause has an enforcing read-site. No metadata (default/access) errors. Classification: TRACED-CLEAN.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "echo",
  "type": "command",
  "description": "Prints the rest of the command line back to the server console, separated by spaces. Mainly used inside config scripts and aliases to print status or progress messages.\n\necho <text...> = print <text> to the console.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cmd.c:365. Handler Cmd_Echo_f registered at src/cmd.c:1069 (single registration; no client-side or KTX variant -- grep \"echo\" returned only cmd.c:1069, ktx/src grep empty). Enforcing body src/cmd.c:365-372: `for (i=1 ; i<Cmd_Argc() ; i++) Con_Printf (\"%s \",Cmd_Argv(i)); Con_Printf (\"\\n\");` -- loops args 1..Argc()-1, prints each space-separated then a trailing newline (the trailing space after each arg + final newline is the exact format). Con_Printf on a dedicated server writes to the server console (admin-observable surface). Access class: NOT present in ucmds[] (src/sv_user.c:3299 table, full read -- no \"echo\" entry), and not on the normal-rcon blocklist (src/sv_main.c:1754-1764 token list: rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line) -> Cmd_AddCommand-only = server console / rcon, not client-issuable. Pre-existing one-line description ignored per chunk rule; synthesized from handler. F-MV1: no KTX override (ktx/src grep for echo/edict empty).",
  "description_proposed": null
}
```
