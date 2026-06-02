# describe-fill-synthesis ledger -- mvdsv `-d`

- **project:** mvdsv
- **knob:** `-d` (cmdline_param)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `cmdline-params` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:-d: synthesized -- no-value switch; runs server detached/unattended (Unix: fork+setsid+/dev/null+do_stdin=false; Windows: isdaemon silences console + suppresses crash dialog); both builds; no KTX override -- origin=synthesized ref=src/sv_sys_unix.c:640 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Runs the server detached in the background with no interactive console, for use as a daemon/service. On Linux it forks into the background, detaches from the controlling terminal, and discards console input and output. On Windows it suppresses all console output and the crash/error dialog boxes so the server can run unattended. A no-value switch -- present enables this mode, absent runs the server in the foreground with a normal console.
>
> Default: off (foreground, console attached).
> Set by: launch flag (no argument).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| no-value switch (no COM_Argv read), present-enables | src/sv_sys_unix.c:640 | `if (COM_CheckParm ("-d"))` (bare; no COM_Argv(p+1)) | MATCH |
| no-value switch (Windows site) | src/sv_sys_win.c:827 | `if (COM_CheckParm ("-d"))` (bare) | MATCH |
| Unix: forks into background (parent exits) | src/sv_sys_unix.c:642-650 | `switch (fork()) { ... default: _exit(0); }` | MATCH |
| Unix: detaches from terminal | src/sv_sys_unix.c:652 | `if (setsid() == -1)` | MATCH |
| Unix: redirects std streams to /dev/null | src/sv_sys_unix.c:655-659 | `open(_PATH_DEVNULL,...); dup2(j, STDIN_FILENO); dup2(j, STDOUT_FILENO); dup2(j, STDERR_FILENO);` | MATCH |
| Unix: stops console input | src/sv_sys_unix.c:663 | `do_stdin = false;` (default true @:31; gates reads @:410,:790) | MATCH |
| Unix: runs in dedicated server (live) | src/sv_sys_unix.c:774 | `SV_System_Init(); // daemonize and so...` called from main() | MATCH |
| Windows: sets daemon + disable-gpf flags | src/sv_sys_win.c:829 | `isdaemon = disable_gpf = true;` | MATCH |
| Windows: suppresses all Sys_Printf output | src/sv_sys_win.c:577 | `if (isdaemon) { return; }` | MATCH |
| Windows: suppresses error/crash dialogs | src/sv_sys_win.c:407,833-836 | `if (!(COM_CheckParm("-noerrormsgbox") || isdaemon)) MessageBox(...)` / `SetErrorMode(... SEM_NOGPFAULTERRORBOX)` | MATCH |
| Windows: stops console stdin read | src/sv_sys_win.c:506 | `if (!isdaemon)` (guards _kbhit loop) | MATCH |
| OFF/default (foreground) | src/sv_sys_unix.c:31 / sv_sys_win.c:33 | `static qbool do_stdin = true;` / `static qbool isdaemon = false;` | MATCH |
| F-MV1 no KTX override | ktx/src | grep COM_CheckParm = 0 hits | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | clause | enforcing file:line | snippet | verdict |
|---|---|---|---|---|
| 1 | Runs detached/background daemon, no interactive console | src/sv_sys_unix.c:640-665 + src/sv_sys_win.c:577 | `if (COM_CheckParm ("-d")) { switch(fork()) ... }` (unix) / `if (isdaemon) { return; }` in Sys_Printf (win) | MATCH |
| 2 | Linux: forks into the background | src/sv_sys_unix.c:642-650 | `switch (fork()) { case -1: exit(-1); case 0: break; default: _exit(0); }` (parent exits, child continues) | MATCH |
| 3 | Linux: detaches from controlling terminal | src/sv_sys_unix.c:652 | `if (setsid() == -1) Sys_Printf("setsid: %s\n", strerror(qerrno));` | MATCH |
| 4 | Linux: discards console input AND output | src/sv_sys_unix.c:655-664 (read at :410, :790) | `open(_PATH_DEVNULL,O_RDWR)` then `dup2(j,STDIN_FILENO); dup2(j,STDOUT_FILENO); dup2(j,STDERR_FILENO); ... do_stdin = false;` — do_stdin gates `if(!do_stdin||!stdin_ready)` (:410) and NET_Sleep stdin-watch (:790) | MATCH |
| 5 | Windows: suppresses all console output | src/sv_sys_win.c:577 (set at :829) | `if (isdaemon) { return; }` at top of Sys_Printf — short-circuits BOTH `_CONSOLE` fprintf(stdout) and windowed ConsoleAddText paths; `isdaemon=disable_gpf=true` set in `-d` block (:829) | MATCH |
| 6 | Windows: suppresses crash/error dialog boxes (plural) | src/sv_sys_win.c:835 + :407 + :372 | `SetErrorMode(SEM_NOGPFAULTERRORBOX)` (:835, OS crash/GPF box) AND `if (!(COM_CheckParm("-noerrormsgbox")||isdaemon)) MessageBox(...)` (:407 Sys_Error, :372 restart-failed) — daemon suppresses in-app error MessageBoxes too | MATCH |
| 7 | No-value switch (present=enable, absent=foreground) | src/common.c:816-827 | `int COM_CheckParm(const char*parm){ for(i=1;i<com_argc;i++){ if(!strcmp(parm,com_argv[i])) return i; } return 0; }` — pure presence check, consumes no value | MATCH |
| 8 | Default: off (foreground, console attached) | src/sv_sys_unix.c:640 / src/sv_sys_win.c:827 | `if (COM_CheckParm ("-d"))` — when absent CheckParm returns 0, daemon block skipped, normal foreground main loop (`main`/`WinMain`) runs | MATCH |

**V-pass notes:** TRACED-CLEAN. All 8 material clauses map to located, verified enforcing lines (incl. adjacent code/comments). Nothing is name/enum/string/comment inference; every behavioral claim has a hard enforcing read-site.

Two enforcing registration sites: src/sv_sys_unix.c:640 (inside SV_System_Init) and src/sv_sys_win.c:827 (inside WinMain).

Linux (sv_sys_unix.c): `-d` -> fork (parent `_exit(0)`, child continues) [claim 2]; `setsid()` detaches controlling terminal [claim 3]; dup2 of /dev/null onto STDIN/STDOUT/STDERR + `do_stdin=false` discards both input and output [claim 4]. do_stdin=false is genuinely consumed at :410 and :790, so input is not merely redirected but also not polled.

Windows (sv_sys_win.c): `-d` sets `isdaemon=disable_gpf=true` (:829). The "suppresses all console output" claim is enforced by the hard `if(isdaemon){return;}` guard at the TOP of Sys_Printf (:577), which precedes both the `_CONSOLE` and windowed output branches — robust, not name-inference. The dialog-box claim is enforced by SetErrorMode(SEM_NOGPFAULTERRORBOX) (:835, the OS crash/GPF box) plus the `||isdaemon` guards on the in-app MessageBox calls in Sys_Error (:407) and the restart-failed path (:372). "crash/error dialog boxes" (plural) is therefore accurate.

COM_CheckParm (common.c:816) is a pure strcmp presence check returning argv index or 0, confirming the "no-value switch" framing and the "absent = foreground" default exactly.

Scoping nuance (FYI, not a defect): mvdsv has TWO Windows builds. The windowed `WinMain` (#else //_CONSOLE) sets `isdaemon` from `-d`; the `_CONSOLE` `main()` (:752) does NOT check `-d` and never sets `isdaemon`, so in a pure console-build Windows binary `-d` is effectively a no-op (and SetErrorMode is also WinMain-only). The proposed description speaks of "Windows" generically without distinguishing build variants. It is NOT wrong as worded for the shipped/distributed windowed server binary (the one with the notify-icon/dialog UI, per :842-843), whose behavior the description matches. Flagged below as an off-scope/build-variant observation for the operator, not a clause contradiction.

Comment at unix:662 `//isdaemon = true;` and `//close(0);close(1);close(2);` at win:830 are commented-out dead lines; they do not affect any clause (the live equivalents — dup2 on Linux, isdaemon-set on Windows — are present and active).

## flags_for_review

- [fyi/off-scope-entity/vpass] mvdsv has two Windows server builds: windowed (WinMain, #else //_CONSOLE) and console (main, #ifdef _CONSOLE). Only WinMain (sv_sys_win.c:827-831) checks -d and sets isdaemon/SEM_NOGPFAULTERRORBOX. The _CONSOLE main() at sv_sys_win.c:752 never references -d, so in a pure console-build Windows binary, -d is effectively inert (no output suppression, no error-mode change). The proposed description describes 'Windows' generically and matches the shipped windowed binary, but does not flag that the console build ignores -d. FYI-level scoping detail for the operator; not a clause contradiction.
- [fyi/other/vpass] Likely-asymmetric daemon behavior across platforms (not a description error, just a fidelity note): on Linux -d performs a real double-detach (fork + setsid + /dev/null dup2) so the process truly daemonizes and survives terminal close. On Windows the windowed -d does NOT fork/detach a process — it only sets isdaemon to mute output + suppress dialogs and keeps running in the same WinMain process (the //close(0);close(1);close(2); at :830 is commented out). The description's phrase 'run unattended' is accurate for both, but 'detached in the background' is literally true only on Linux; on Windows it is 'silent, no-dialog, same-process'. Current wording already splits the per-OS sentences correctly, so this is FYI not a fix.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: -nohwtimer=C-FIX, -heapsize=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "-d",
  "type": "cmdline_param",
  "description": "Runs the server detached in the background with no interactive console, for use as a daemon/service. On Linux it forks into the background, detaches from the controlling terminal, and discards console input and output. On Windows it suppresses all console output and the crash/error dialog boxes so the server can run unattended. A no-value switch -- present enables this mode, absent runs the server in the foreground with a normal console.\n\nDefault: off (foreground, console attached).\nSet by: launch flag (no argument).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_sys_unix.c:640. Bare boolean, BOTH dedicated-server builds, but per-OS mechanism (same launch intent: run detached/unattended). NO COM_Argv(p+1) read at either site => no-value switch (VALUE-VS-FLAG: both sites are bare `if (COM_CheckParm(\"-d\"))`). UNIX (sv_sys_unix.c, SV_System_Init called unconditionally from main() at sv_sys_unix.c:774; the block's own comment at sv_sys_unix.c:626-628 `// daemon ... (-d ...) was copied from bind`): src/sv_sys_unix.c:640 `if (COM_CheckParm (\"-d\"))` then fork() (642-650: parent _exit(0), child continues), setsid() (652, detach controlling terminal), dup2 STDIN/STDOUT/STDERR to _PATH_DEVNULL (655-661), and sv_sys_unix.c:663 `do_stdin = false;` -- do_stdin default true at sv_sys_unix.c:31, consumed at 410 `if (!do_stdin || !stdin_ready)` and 790 (stops console-input reads) => discards console I/O. WINDOWS (sv_sys_win.c WinMain): src/sv_sys_win.c:827 `if (COM_CheckParm (\"-d\"))` -> sv_sys_win.c:829 `isdaemon = disable_gpf = true;`. isdaemon (default false, sv_sys_win.c:33) suppresses ALL Sys_Printf output (577 `if (isdaemon) { return; }`), console restart-error printf (369), the GPF/error MessageBox (372/407), and console stdin reading (506 `if (!isdaemon)`); disable_gpf at sv_sys_win.c:833-836 calls SetErrorMode(SEM_NOGPFAULTERRORBOX) => no crash dialog. F-MV1: KTX has zero COM_CheckParm references -- no override. Polarity: present-enables at both sites (plain `if (COM_CheckParm(...))`, no `!`).",
  "description_proposed": null
}
```
