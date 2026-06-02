# describe-fill-synthesis ledger -- mvdsv `sys_restart_on_error`

- **project:** mvdsv
- **knob:** `sys_restart_on_error` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sys_restart_on_error: synthesized -- 1 diverts the fatal-error path into Sys_Quit(true) which execv-relaunches the server with the same argv; 0 exits (Sys_Error read-site + Sys_Quit callee) -- origin=synthesized ref=src/sv_sys_unix.c:349 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls what the server does when it hits a fatal error. When on, instead of just shutting down, the server automatically relaunches itself with the same command-line arguments. When off, a fatal error shuts the server down.
>
> 0 = exit on a fatal error.
> 1 = automatically restart the server on a fatal error.
>
> Default: 0.
> Set by: server config / command line.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 0 | src/sv_main.c:57 | `cvar_t sys_restart_on_error = {"sys_restart_on_error", "0"};` | MATCH |
| 1 = restart on fatal error (polarity, in the error path) | src/sv_sys_unix.c:349 | `if ((int)sys_restart_on_error.value) Sys_Quit (true);` inside Sys_Error | MATCH |
| 0 = exit (fall-through) | src/sv_sys_unix.c:352 | `Sys_Exit (1);` unconditional, reached when cvar is 0 | MATCH |
| restart = relaunch same binary + argv (callee-follow) | src/sv_sys_unix.c:305 | `if (execv(com_argv[0], com_argv) == -1)` inside Sys_Quit(restart=true) | MATCH |
| same behavior on Windows | src/sv_sys_win.c:424 | `if ((int)sys_restart_on_error.value) Sys_Quit (true);` -> Sys_Quit win:349 execv | MATCH |
| Set-by engine (no KTX override) | ktx/src (grep) | grep sys_restart_on_error in ktx/src = empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|------------------|---------|
| 1 | Scope: applies "when it hits a fatal error" | sv_sys_unix.c:319 / sv_sys_win.c:386 | `void Sys_Error (const char *error, ...)` -- the enforcing `if` lives inside the fatal-error handler | MATCH |
| 2 | ON -> "automatically relaunches itself" (polarity, nonzero) | sv_sys_unix.c:349 / sv_sys_win.c:424 | `if ((int)sys_restart_on_error.value)` then `Sys_Quit (true);` | MATCH |
| 3 | "relaunches ... with the same command-line arguments" (callee-followed) | sv_sys_unix.c:305 / sv_sys_win.c:365 | unix: `if (execv(com_argv[0], com_argv) == -1)`; win: `if (execv(argv[0], com_argv) == -1)` -- inside `Sys_Quit(qbool restart)` guarded by `if (restart)` (unix:297 / win:351); `com_argv` is the original argv captured by `COM_InitArgv` (common.c:797-805); win `argv[0]` = `Sys_GetModuleName()` (the same binary) | MATCH |
| 4 | OFF -> "a fatal error shuts the server down" (fall-through to exit) | sv_sys_unix.c:352 + 285-288 / sv_sys_win.c:427 + 326-332 | `Sys_Exit (1);` then `void Sys_Exit (int code){ ... exit(code); }` -- reached when the `if` is false (value 0) | MATCH |
| 5 | Enum "0 = exit on a fatal error" | sv_sys_unix.c:349 / sv_sys_win.c:424 | `(int)sys_restart_on_error.value` is 0 -> branch false -> exit path (clause 4) | MATCH |
| 6 | Enum "1 = automatically restart" | sv_sys_unix.c:349-350 / sv_sys_win.c:424-425 | nonzero truthiness -> `Sys_Quit (true)` -> restart (clause 3). Strictly ANY nonzero restarts, not only 1; "1" is the representative on-value, consistent with the truthiness test | MATCH (1 is representative of the truthy branch) |
| 7 | "Default: 0" (registered default, WI-2) | sv_main.c:57 (+ 3482 register; cvar.h:66-75 layout) | `cvar_t sys_restart_on_error = {"sys_restart_on_error", "0"};` -> struct order {name,string,flags,...} so string="0", flags=0; `Cvar_Register`->`Cvar_SetROM` sets `.value = Q_atof("0") = 0` (cvar.c:155) | MATCH |
| 8 | "Set by: server config / command line" (settability, WI-2) | sv_main.c:57; cvar.c:134-135, 168-179 | flags=0 (no `CVAR_ROM`); `Cvar_SetROM` clears+restores flags (`var->flags = saved_flags`, cvar.c:178) leaving 0; `Cvar_Set` early-returns only `if (var->flags & CVAR_ROM)` -- so it is writable from config/cmdline | MATCH |

**V-pass notes:** COLD V-pass. Oracle confirmed: git describe == "1.11-53-g18d0362". Exhaustive grep of sys_restart_on_error across mvdsv/src: 5 hits -- 1 declaration (sv_main.c:57), 1 register (sv_main.c:3482), 2 externs (sv_sys_unix.c:23, sv_sys_win.c:25), 2 enforcing reads (sv_sys_unix.c:349, sv_sys_win.c:424). Both enforcing reads live inside Sys_Error (the fatal-error handler), in a DIFFERENT file from registration -- located per WI-1. Both are structurally identical (unix + win parity).

The load-bearing flavour-C-prone clause -- "relaunches itself with the same command-line arguments" -- could NOT be inferred from the cvar name; it was enforce-traced through the callee Sys_Quit(true) into execv(com_argv[0]/argv[0], com_argv), and com_argv was further traced to COM_InitArgv capturing the original argc/argv. This is the autotrack/dropquad callee-follow lesson applied: the caller's `if ((int)value)` only gates entry; the actual restart semantics live in the callee, which was read. execv replaces the process image with the same executable + argv = self-relaunch with same args. MATCH on both platforms.

OFF-state, default, and settability all enforce-traced (not name/comment inference): exit via Sys_Exit->exit(); default 0 via registered string "0" with flags=0; settable because no CVAR_ROM (Cvar_SetROM restores the original 0 flags at cvar.c:178, and Cvar_Set only blocks ROM). Every material clause maps to a located, verified enforcing line. Classification: TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] Fidelity nuance (NOT a defect, no clause is wrong): SV_Shutdown(...) is called in BOTH the restart and exit paths -- it runs unconditionally BEFORE the sys_restart_on_error branch (sv_sys_unix.c:346-347 `if (svs.socketip != -1) SV_Shutdown(...)`; sv_sys_win.c:421-422). The description's framing 'instead of just shutting down, the server automatically relaunches' reads at the process level (exit vs execv-relaunch) and is accurate; it does not claim SV_Shutdown is skipped on restart. So no clause contradicts the code. Flagged only so an editor knows the server-state teardown (socket release / client disconnect) happens regardless of the cvar; the cvar only chooses exit() vs execv() afterward.
- [fyi/other/vpass] Enum precision: the enforcing test is `if ((int)sys_restart_on_error.value)` -- a plain truthiness test, so ANY nonzero value (e.g. 2, -1) triggers the restart branch, not strictly the value 1. The proposed '1 = automatically restart' line is correct as a representative on-value and is consistent with the truthiness gate, so it is not a near-miss. Noted only because a stricter reader might expect '1' to be the literal threshold; it is not -- it is nonzero-vs-zero.
- [fyi/other/vpass] Windows execv arg-vector asymmetry (cosmetic, behavior identical): unix passes execv(com_argv[0], com_argv) while win passes execv(argv[0], com_argv) -- the win path[0] is argv[0] = Sys_GetModuleName() (the running module's full path, sv_sys_win.c:66/77) rather than com_argv[0]. Both resolve to the same executable being re-exec'd with the same argument vector com_argv, so the 'same command-line arguments' clause holds on both platforms. No action needed; documented for completeness of the callee trace.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sys_restart_on_error",
  "type": "cvar",
  "description": "Controls what the server does when it hits a fatal error. When on, instead of just shutting down, the server automatically relaunches itself with the same command-line arguments. When off, a fatal error shuts the server down.\n\n0 = exit on a fatal error.\n1 = automatically restart the server on a fatal error.\n\nDefault: 0.\nSet by: server config / command line.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_sys_unix.c:349. Name-only synthesis avoided; traced to read use-site inside the fatal-error path. Registration default \"0\": src/sv_main.c:57 `cvar_t sys_restart_on_error = {\"sys_restart_on_error\", \"0\"};`. Polarity + restart clause: src/sv_sys_unix.c:349 `if ((int)sys_restart_on_error.value) Sys_Quit (true);` -- this is inside Sys_Error (the fatal-error handler), AFTER SV_Shutdown and BEFORE the unconditional `Sys_Exit (1)` at :352, so a non-zero value diverts the error path into Sys_Quit with restart=true; 0 falls through to Sys_Exit (plain shutdown). 'Relaunches with the same arguments' clause traced into the callee (B1 callee-follow): Sys_Quit(true) at src/sv_sys_unix.c:295-310 runs `execv(com_argv[0], com_argv)` (:305) which re-executes the server binary with the original argv -- i.e. an automatic process restart; on execv failure it falls back to Sys_Exit(1) (:308). Same behavior on Windows: src/sv_sys_win.c:424 `if ((int)sys_restart_on_error.value) Sys_Quit (true);` -> Sys_Quit at src/sv_sys_win.c:349 (execv-based restart, _CONSOLE branch). No KTX override (grep of ktx/src = empty); Set-by is the MVDSV engine: server config / command line.",
  "description_proposed": null
}
```
