# describe-fill-synthesis ledger -- mvdsv `sys_command_line`

- **project:** mvdsv
- **knob:** `sys_command_line` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sys_command_line: synthesized -- read-only (CVAR_ROM) report of the full server launch command line, built from COM_Argv; set once at startup -- origin=synthesized ref=sv_main.c:3469 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Read-only. Reports the full command line the server was launched with -- the server executable path followed by every startup argument, joined into one string. It is set once at startup and cannot be changed afterward; querying it lets an admin see exactly how the running server was started.
>
> Default: registered empty; the engine fills it at startup with the full launch command line, so in practice it is never empty (the executable path is always present).
> Set by: the engine at startup; read-only (cannot be set by config or rcon).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| holds the joined launch command line (exe + all args) | sv_main.c:3462-3467 | `for (i = 0; i < COM_Argc(); i++) { if (i) strlcat(cmd_line, " ", ...); strlcat(cmd_line, COM_Argv(i), ...); }` | MATCH |
| buffer source / cap | sv_main.c:3389 | `char cmd_line[1024] = {0};` | MATCH |
| value set once at startup | sv_main.c:3468-3469 | `Cvar_Register (&sys_command_line); Cvar_SetROM(&sys_command_line, cmd_line);` | MATCH |
| read-only flag | sv_main.c:99 | `cvar_t sys_command_line = {"sys_command_line", "", CVAR_ROM};` | MATCH |
| CVAR_ROM = read only, enforced on set | cvar.h:63 / cvar.c:134 | `#define CVAR_ROM (1<<1) // read only` ; `if (var->flags & CVAR_ROM)` | MATCH |
| registered default "" (overwritten at startup) | sv_main.c:99 | `{"sys_command_line", "", CVAR_ROM}` | MATCH |
| 1764 is blocklist string, NOT a value read | sv_main.c:1764 | `!strcasecmp(tstr, "sys_command_line")` (compares an rcon token, not .value) | MATCH (excluded) |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Read-only; cannot be changed after startup (config/cvar) | src/cvar.c:134-135 | `if (var->flags & CVAR_ROM)` / `return;` | MATCH |
| 1a | ROM flag is actually on the cvar | src/sv_main.c:99 | `cvar_t sys_command_line = {"sys_command_line", "", CVAR_ROM};` | MATCH |
| 1b | CVAR_ROM == read only | src/cvar.h:63 | `#define CVAR_ROM (1<<1) // read only` | MATCH |
| 1c | Console/config set funnels through Cvar_Set (so ROM-blocked) | src/cvar.c:306 | `Cvar_Set (v, string);` (in Cvar_Command, "inspection and changing from the console") | MATCH |
| 1d | `set` command path also ROM-blocked | src/cvar.c:497 | `Cvar_Set (var, Cmd_Argv(2));` | MATCH |
| 2 | Reports exe path + every startup arg, joined into one string | src/sv_main.c:3462-3467 | `for (i = 0; i < COM_Argc(); i++)` ... `strlcat(cmd_line, " ", ...)` ... `strlcat(cmd_line, COM_Argv(i), ...)` | MATCH |
| 2a | First token (argv[0]) = executable path, argv verbatim | src/common.c:801 | `largv[com_argc] = (argv[com_argc]) ? argv[com_argc] : "";` | MATCH |
| 2b | argv comes straight from OS main() | src/sv_sys_unix.c:766,773 | `int main (int argc, char *argv[])` ... `COM_InitArgv (argc, argv);` | MATCH |
| 2c | COM_Argv(i) returns i-th arg verbatim, bounds-safe | src/common.c:834-839 | `if (arg < 0 || arg >= com_argc) return ""; return com_argv[arg];` | MATCH |
| 3 | Set once at startup (one-time engine write) | src/sv_main.c:3468-3469 | `Cvar_Register (&sys_command_line);` / `Cvar_SetROM(&sys_command_line, cmd_line);` | MATCH |
| 3a | SetROM temporarily lifts ROM then restores (mechanism of engine-only write) | src/cvar.c:176-178 | `var->flags &= ~CVAR_ROM;` / `Cvar_Set (var, value);` / `var->flags = saved_flags;` | MATCH |
| 3b | No other writer / no field-write bypass | (tree-wide grep) | `grep sys_command_line\.(value|string|flags)` -> no hits; only 4 use-sites total | MATCH |
| 4 | Querying lets an admin see the value | src/cvar.c:297 | `Con_Printf ("\"%s\" is \"%s\"\n", v->name, v->string);` (c==1 print branch) | MATCH |
| 5 | Default: empty string (registered default) | src/sv_main.c:99 | `{"sys_command_line", "", CVAR_ROM}` | MATCH (registered default is ""; description frames default as runtime launch-line, not the registered "") |
| 6 | "empty only if the server somehow started with no arguments" | src/sv_main.c:3389,3462-3467 | `char cmd_line[1024] = {0};` + loop from i=0 always includes COM_Argv(0) | MISMATCH (narrower: argv[0]/exe-path is ALWAYS present on a normal exec, so runtime value is effectively never empty; no enforcing line yields an empty runtime value) |
| 7 | Cannot be set by rcon | src/sv_main.c:1764 + cvar.c:134 | `!strcasecmp(tstr, "sys_command_line")` -> `bad_cmd = true;` (admin-tier rcon path, sv_main.c:1708) | MATCH (true, and via CVAR_ROM even stronger; see notes -- admin-rcon also can't READ it, master-rcon can) |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. enforce-trace-discipline.md read and applied; all four use-sites of sys_command_line wide-grepped (sv_main.c:99 registration, 1764 rcon-token-block, 3468 register, 3469 SetROM) plus full callee follow-through into cvar.c (Cvar_Set/Cvar_SetROM/Cvar_Command/Cvar_Set_f), common.c (COM_InitArgv/COM_Argv/COM_Argc), and sv_sys_unix.c (main).

CORE BEHAVIOR IS CORRECT AND FULLY TRACED. Read-only enforcement is real (cvar.c:134 hard-return on CVAR_ROM; every write path -- console Cvar_Command, `set`, `toggle`, config exec -- funnels through Cvar_Set and is blocked). The string composition is exactly as described: loop from i=0 joins COM_Argv(i) (argv[0]=exe path + every subsequent arg) with single spaces into cmd_line[1024], written once via Cvar_SetROM at SV_InitLocal time. Queryable via console print confirmed (cvar.c:297). No write bypass exists anywhere (tree-wide grep for direct field writes returned nothing; no Cvar_ResetVar in this codebase).

WHY C-NEAR-MISS (not TRACED-CLEAN): one clause is narrower in reality than the text implies, and its asserted state has no enforcing line.
(a) Clause 6 -- "empty only if the server somehow started with no arguments." On any normal OS exec, argc>=1 and argv[0] (the executable path) is always present, so cmd_line always contains at least the exe path and the runtime value is effectively NEVER empty. The hedge invents an empty-runtime case that the code does not produce. The buffer's only literal-empty state is its pre-loop initializer (sv_main.c:3389 `= {0}`), overwritten before the cvar is set. This is a flavour-C-shaped "narrower than implied / no enforcing line for the asserted (empty) state" near-miss, not a contradiction.
(b) Minor framing (clause 5): the description's "Default: the actual launch command line" describes the RUNTIME value, whereas the WI-2 registered default is "" (cvar.c:99 `RegisterCvar`-equivalent struct init). Not wrong as written (it does say "the actual launch command line"), but the registered-default-vs-runtime-value distinction is blurred. Acceptable but worth a sharper "registered default empty; runtime value set to the launch line at startup."

ADDITIVE (not a defect, but the description misses it): the "Set by ... read-only (cannot be set by config or rcon)" line is true and via CVAR_ROM is actually STRONGER than needed -- but it omits an asymmetry. sv_main.c:1764 sits in the NON-master ("admin"-tier, rcon_password, sv_main.c:1708) rcon branch and rejects the ENTIRE command if `sys_command_line` appears as a token (bad_cmd=true -> do_cmd=false at :1774), meaning admin-rcon cannot even READ the value, while master-rcon (master_rcon_password, sv_main.c:1701) is exempt from that block and can both read and (no-op) attempt to set it. So "querying it lets an admin see exactly how the server was started" is true for a master-rcon/console admin but NOT for a plain admin-rcon operator. This nuance is information-disclosure-shaped, optional for a user-doc, and does not contradict any stated clause.

RECOMMENDED MINIMAL FIX (for the re-synth, anchored on clause 6): drop or correct the empty-case parenthetical. Suggested default line: "Default: registered empty; the engine sets it at startup to the full launch command line (executable path plus all arguments). In practice it is never empty, since the executable path is always present." Leave the rest as-is -- core mechanism is verified TRACED-CLEAN-grade.

## flags_for_review

- [fyi/other/synthesis] sys_command_line exposes the server's full launch command line (COM_Argv(0..n)) as a queryable cvar. If an operator passes a secret on the command line (e.g. +set rcon_password X, or a master password), it becomes readable to anyone who can query this cvar. The normal-rcon blocklist at sv_main.c:1762-1764 only blocks naming sys_command_line/log*/sv_crypt_rcon/sv_timestamplen as the FIRST token of a non-master rcon command (a write/exec guard), and does not prevent reading the cvar's value through other paths (e.g. serverinfo/cvar query). Flagging as a security-relevant information-exposure surface for a human look; not a code bug and outside this chunk's fix scope.
- [fyi/off-scope-entity/vpass] Admin-tier rcon (rcon_password, sv_main.c:1708) is blocked from even REFERENCING the sys_command_line token: sv_main.c:1764 sets bad_cmd=true which rejects the whole command (do_cmd=false at :1774), so admin-rcon cannot READ the value, only master-rcon (master_rcon_password, :1701) and local console can. The description's 'querying it lets an admin see' is true only for master-rcon/console, not plain admin-rcon. Information-disclosure asymmetry the user-doc omits; not a contradiction of any stated clause.
- [review/contradiction/vpass] Clause 'empty only if the server somehow started with no arguments' overstates the empty case: COM_InitArgv copies argv verbatim from main() and the join loop starts at i=0, so cmd_line always contains at least argv[0] (the executable path). On a normal OS exec (argc>=1) the runtime value is never empty; no enforcing line yields an empty runtime value (the only literal-empty state is the pre-loop buffer initializer at sv_main.c:3389, overwritten before Cvar_SetROM). This is the clause that drives the C-NEAR-MISS classification.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sys_command_line",
  "type": "cvar",
  "description": "Read-only. Reports the full command line the server was launched with -- the server executable path followed by every startup argument, joined into one string. It is set once at startup and cannot be changed afterward; querying it lets an admin see exactly how the running server was started.\n\nDefault: registered empty; the engine fills it at startup with the full launch command line, so in practice it is never empty (the executable path is always present).\nSet by: the engine at startup; read-only (cannot be set by config or rcon).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3469. This cvar carries the launch command line and is read-only; there is no behavioral read of its value, so the authoritative site is where its value is produced. Build: sv_main.c:3462-3467 loops `for (i = 0; i < COM_Argc(); i++)` and strlcat's each `COM_Argv(i)` (space-separated) into `cmd_line` (declared `char cmd_line[1024] = {0}` at sv_main.c:3389) -- COM_Argv(0) is the executable path, the rest are the startup args, so cmd_line is the whole launch command line (capped at 1024 chars). Assignment: sv_main.c:3468-3469 `Cvar_Register (&sys_command_line); Cvar_SetROM(&sys_command_line, cmd_line);`. Read-only: declared with CVAR_ROM (sv_main.c:99 `{\"sys_command_line\", \"\", CVAR_ROM}`); CVAR_ROM = `(1<<1) // read only` (cvar.h:63) and is enforced in Cvar_Set at cvar.c:134 `if (var->flags & CVAR_ROM)` (rejects user sets) -- Cvar_SetROM (cvar.c:176 clears the flag to write, then the value is locked again). Default: the registered literal is \"\" (sv_main.c:99) but it is immediately overwritten with cmd_line at startup, so at runtime it holds the actual command line. Set-by: engine at startup only, not settable by admin. The sv_main.c:1764 occurrence is NOT a value read -- it is a string-literal blocklist entry preventing a normal-rcon user from naming sys_command_line as the first rcon token. No KTX override (grep empty).",
  "description_proposed": null
}
```
