# describe-fill-synthesis ledger -- mvdsv `sys_nostdout`

- **project:** mvdsv
- **knob:** `sys_nostdout` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sys_nostdout: synthesized -- 1 suppresses all server stdout incl the fatal ERROR line (unix Sys_Printf/Sys_Error read-sites); Windows-GUI build is _CONSOLE-gated/inert -- origin=synthesized ref=src/sv_sys_unix.c:449 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Silences the server's normal console output. When on, the dedicated server stops printing its usual status and message lines to the terminal (stdout), including the ERROR line shown when the server hits a fatal error.
>
> 0 = print console output normally.
> 1 = suppress all console output.
>
> Default: 0.
> Set by: server config / command line.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 0 | src/sv_sys_unix.c:26 | `cvar_t sys_nostdout = {"sys_nostdout", "0"};` | MATCH |
| 1 = suppress all stdout (polarity + scope) | src/sv_sys_unix.c:449 | `if (sys_nostdout.value)` then `return;` at top of Sys_Printf, before the fprintf(stdout) loop | MATCH |
| 0 = print normally | src/sv_sys_unix.c:466 | `fprintf(stdout, "[%s] %s\n", date.str, startpos);` reached only when cvar is 0 | MATCH |
| suppresses the fatal ERROR line too | src/sv_sys_unix.c:336 | `if (!(int)sys_nostdout.value) Sys_Printf ("ERROR: %s\n", text);` | MATCH |
| Set-by engine (no KTX override) | ktx/src (grep) | grep sys_nostdout in ktx/src = empty | MATCH |
| Windows-GUI build gate (flagged, not in prose) | src/sv_sys_win.c:571 | `#ifdef _CONSOLE` wrapping `if ((int)sys_nostdout.value) { return; }` in win Sys_Printf | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|---|---|---|---|
| 1 | "Silences the server's normal console output / stops printing usual status+message lines to stdout" | sv_sys_unix.c:449 (gate) <- chain sv_send.c:159 (Con_Printf body) | `if (sys_nostdout.value)\n\t\treturn;` ... and Con_Printf: `Sys_Printf ("%s", msg);	// also echo to debugging console` | MATCH -- status/message lines go Con_Printf -> Sys_Printf, which returns early when set |
| 2 | Polarity: on = suppress (nonzero blocks output) | sv_sys_unix.c:449 / sv_sys_win.c:572 | unix: `if (sys_nostdout.value)\n\t\treturn;` ; win (`#ifdef _CONSOLE`): `if ((int)sys_nostdout.value) {\n\t\treturn;\n\t}` | MATCH |
| 3 | OFF-state: 0 = print normally | sv_sys_unix.c:466 / sv_sys_win.c:598 (fall-through past gate) | `fprintf(stdout, "[%s] %s\n", date.str, startpos);` | MATCH -- when 0, gate is skipped and line is written to stdout |
| 4 | "suppress ALL console output" (no ungated normal stdout path) | hash.c:407 (only other raw stdout `printf`, inside `#if 0`); win ERROR printf gated sv_sys_win.c:404; restart printf gated sv_sys_win.c:369 | hash.c: `#if 0 ... printf("table[%d] = %d\n", ...) ... #endif` ; `if (!((int)sys_nostdout.value || isdaemon))\n\t\tprintf ("ERROR: %s\n", text);` | MATCH -- every real console-output stdout write is either inside Sys_Printf (gated) or itself gated; the lone bypass is dead code |
| 5 | "including the ERROR line shown when the server hits a fatal error" | sv_sys_unix.c:336-337 ; sv_sys_win.c:404-405 (`#ifdef _CONSOLE`) | unix: `if (!(int)sys_nostdout.value)\n\t\tSys_Printf ("ERROR: %s\n", text);` ; win: `if (!((int)sys_nostdout.value || isdaemon))\n\t\tprintf ("ERROR: %s\n", text);` | MATCH -- in Sys_Error, the ERROR line is explicitly suppressed when sys_nostdout is set |
| 6 | Default: 0 | sv_sys_unix.c:26 / sv_sys_win.c:28 (registration) | `cvar_t sys_nostdout = {"sys_nostdout", "0"};` ; `Cvar_Register (&sys_nostdout)` (unix:490 / win:640) | MATCH -- registered default string "0", no CVAR_ROM flag |
| 7 | Scope: dedicated server, terminal/stdout only (log file NOT suppressed) | sv_send.c:160 (log write outside the gated Sys_Printf echo) | `Sys_Printf ("%s", msg);	// also echo to debugging console\n\tSV_Write_Log(CONSOLE_LOG, 0, msg);` | MATCH -- desc scopes to "the terminal (stdout)"; CONSOLE_LOG file write is unaffected, consistent with wording |
| 8 | Set by: server config | sv_main.c:4001 (SV_Init) | `Cbuf_InsertText ("exec server.cfg\n");` | MATCH -- server.cfg is exec'd at init; cvar reachable from config |
| 9 | Set by: command line | sv_main.c:4004 (SV_Init) -> cmd.c:299-319 (Cmd_StuffCmds_f body) | `Cmd_StuffCmds_f ();` ; `if (text[i] == '+') { ... Cbuf_AddText (build); }` | MATCH -- `+set sys_nostdout 1` / `+sys_nostdout 1` from argv become console commands; plain cvar, user-settable |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362.

VERDICT: TRACED-CLEAN. Every material clause (polarity, OFF-state, default, "suppress all", the fatal-ERROR-line side-effect, dedicated-server/stdout scope, and BOTH "Set by" channels) maps to a located, verified enforcing line, including adjacent context. No flavour-C inference detected.

Trace chain for the central claim: status/message lines -> Con_Printf (sv_send.c:146) -> Sys_Printf -> early-return gate on sys_nostdout.value (sv_sys_unix.c:449 for the dedicated/unix build; sv_sys_win.c:572 under #ifdef _CONSOLE for the Windows console build). MVDSV is itself the dedicated server, so the description's "dedicated server" scoping is correct.

"Suppress ALL" verification (the over-claim risk): I wide-grepped every raw printf/fprintf(stdout)/puts in src. All non-gated fprintf calls write to FILE* handles (savegames sv_save.c, ban lists sv_main.c, login db sv_login.c, edict dumps pr_edict.c) -- not console stdout. The two raw `printf` ERROR/restart lines in sv_sys_win.c (:370, :405) are each gated by `sys_nostdout || isdaemon`. The only raw `printf` to stdout that is NOT gated is hash.c:407, which sits inside an `#if 0` block (dead, never compiled). So in any real build there is no normal-output stdout path that bypasses the gate -- "suppress all console output" holds at the action level.

Precision note on the stdout-vs-logfile distinction (clean, not a defect): Con_Printf also calls SV_Write_Log(CONSOLE_LOG...) at sv_send.c:160, OUTSIDE the gated Sys_Printf echo. sys_nostdout suppresses only the terminal echo, not the console log file. The description is precise about this -- it says "to the terminal (stdout)" rather than "all logging" -- so the scope clause is accurate, not an overclaim.

Two benign, non-contradicting edges I confirmed and deliberately did NOT downgrade the row for:
1. Threshold is float-truthy: the gate is `if (sys_nostdout.value)` / `if (!(int)sys_nostdout.value)` -- ANY nonzero suppresses, not strictly 1. The description's "1 = suppress all" is the canonical boolean on-value and does not claim only-1-works, so it stays clean.
2. The gate reads the live cvar value, so early-startup banner lines emitted BEFORE `exec server.cfg` / `Cmd_StuffCmds_f` run (cvar still 0) are not suppressed. The description makes no claim about the pre-config banner, so no contradiction.

Cvar is a plain `cvar_t {"sys_nostdout","0"}` with no flags (not CVAR_ROM/archive) -- user-settable, consistent with the "Set by" line.

## flags_for_review

- [fyi/cross-mod-override/synthesis] sys_nostdout is fully live on the unix dedicated-server build (read at src/sv_sys_unix.c:336 and :449 unconditionally) but on Windows all three read-sites (src/sv_sys_win.c:369, :404, :572) sit inside `#ifdef _CONSOLE`. A non-_CONSOLE (GUI) Windows build never reads the cvar -- its Sys_Printf returns on `isdaemon` and uses ConsoleAddText instead (src/sv_sys_win.c:577-589), so the cvar is build-variant-inert there. Confirmed build gate. Documented-as-live (F-C3b) because the unix dedicated server is the dominant deployment; flagging the Windows-GUI inertness for the human record.
- [fyi/other/vpass] sys_nostdout is duplicated as a separate cvar_t in both sv_sys_unix.c (line 26) and sv_sys_win.c (line 28), each with its own enforcing read-sites. Only the platform-matching file compiles, so behavior is identical across platforms and there is no conflict -- noting only because the per-clause sites differ by file (unix uses Sys_Error:336 + Sys_Printf:449; win uses #ifdef _CONSOLE Sys_Error:404 + Sys_Printf:572).
- [fyi/other/vpass] No cross-mod read-site: grep of research/repos/ktx/src for sys_nostdout returned nothing. This is a pure server-engine console cvar with no KTX consumer; the description correctly does not assert any mod-side behavior.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sys_nostdout",
  "type": "cvar",
  "description": "Silences the server's normal console output. When on, the dedicated server stops printing its usual status and message lines to the terminal (stdout), including the ERROR line shown when the server hits a fatal error.\n\n0 = print console output normally.\n1 = suppress all console output.\n\nDefault: 0.\nSet by: server config / command line.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_sys_unix.c:449. Name-only synthesis avoided; traced to read use-sites. Registration default \"0\": src/sv_sys_unix.c:26 cvar_t sys_nostdout = {\"sys_nostdout\", \"0\"} (matches win registration src/sv_sys_win.c:28). Polarity + 'suppress ALL stdout' clause: src/sv_sys_unix.c:449 `if (sys_nostdout.value) return;` at the top of Sys_Printf -- a non-zero value makes the server's general console printer return before writing anything to stdout (the fprintf(stdout,...) loop at :466 is skipped), so all normal console output is suppressed; 0 = output prints. ERROR-line clause: src/sv_sys_unix.c:336 `if (!(int)sys_nostdout.value) Sys_Printf(\"ERROR: %s\\n\", text);` inside Sys_Error -- the fatal-error banner print is gated on the same cvar. No KTX override (grep of ktx/src for sys_nostdout = empty), so Set-by is the MVDSV engine: server config / command line. Build-variant note (kept OUT of the user doc, raised as a flag): on Windows all three read-sites are inside `#ifdef _CONSOLE` (src/sv_sys_win.c:369, :404, :572) -- a non-_CONSOLE (GUI) Windows build never reads the cvar (its Sys_Printf returns on `isdaemon` and routes to ConsoleAddText instead, src/sv_sys_win.c:577-589); documented-as-live because the dominant deployment is the unix dedicated server where both read-sites are unconditionally live.",
  "description_proposed": null
}
```
