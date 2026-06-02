# describe-fill-synthesis ledger -- mvdsv `-noerrormsgbox`

- **project:** mvdsv
- **knob:** `-noerrormsgbox` (cmdline_param)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- medium confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `cmdline-params` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:-noerrormsgbox: synthesized -- Windows-only bare boolean; suppresses fatal-error MessageBox (logs instead) + OS GPF crash dialog; LIVE under live CMake/MinGW build (no _CONSOLE) though inert under legacy MSVC vcxproj (_CONSOLE) -- origin=synthesized ref=src/sv_sys_win.c:407 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Windows server only. Stops the server from popping up Windows error dialog boxes, so a fatal error or a crash never blocks on a window waiting for someone to click OK. With this flag set, a fatal server error is printed to the console instead of shown in a pop-up, and the operating system's crash dialog is suppressed as well; fatal errors are written to the error log either way, when one is open. Intended for unattended/headless servers where no one is at the screen to dismiss a dialog.
>
> This is an on/off flag and takes no value.
>
> Default: off (error dialogs are shown).
> Set by: command line at server launch only.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| bare boolean, takes no value | src/sv_sys_win.c:407,372,824 | `COM_CheckParm("-noerrormsgbox")` (no COM_Argv(p+1) read at any site) | MATCH |
| present => fatal error logged/printed instead of MessageBox | src/sv_sys_win.c:407-410 | `if (!(COM_CheckParm ("-noerrormsgbox") || isdaemon)) MessageBox (NULL, text, "Error", 0 ); else Sys_Printf ("ERROR: %s\n", text);` | MATCH |
| same suppression on a failed restart | src/sv_sys_win.c:372-373 | `if (!(COM_CheckParm("-noerrormsgbox") || isdaemon)) MessageBox(NULL, strerror(qerrno), "Restart failed", 0 );` | MATCH |
| present => OS general-protection-fault crash dialog suppressed | src/sv_sys_win.c:824-825, 833-836 | `if (COM_CheckParm("-noerrormsgbox")) disable_gpf = true;` ... `if (disable_gpf) { ... SetErrorMode(dwMode | SEM_NOGPFAULTERRORBOX); }` | MATCH |
| Windows-only | src/sv_sys_win.c | file is the Windows dedicated-server sys layer | MATCH |
| compiled only when _CONSOLE undefined (sites in #else / WinMain) | src/sv_sys_win.c:368-374, 403-412, 803-902 | sites 372/407 in `#else` of `#ifdef _CONSOLE`; site 824 inside `WinMain` under `#else // _CONSOLE` | MATCH |
| live build (CMake/MinGW) does NOT define _CONSOLE | CMakeLists.txt:133-135, .github/workflows/build-and-deploy-release.yml:58 | `if(CMAKE_C_COMPILER_ID STREQUAL "MSVC") set(TARGET_TYPE WIN32) endif()`; no `_CONSOLE` define anywhere; CI `gcc-mingw-w64` | MATCH |
| no KTX override (mod cannot parse cmdline) | ktx/src (grep) | grep `COM_CheckParm`/`-noerrormsgbox` in ktx/src = empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Windows server only" (scope) | src/sv_sys_win.c (only file referencing the param); no unix/cross-platform site found | `if (COM_CheckParm("-noerrormsgbox"))` (824), `if (!(COM_CheckParm ("-noerrormsgbox") \|\| isdaemon))` (372, 407) — all in the Windows system file; MVDSV is SERVERONLY | MATCH |
| 2 | "Stops the server from popping up Windows error dialog boxes" / "fatal error ... never blocks on a window waiting for someone to click OK" | src/sv_sys_win.c:407-409 | `if (!(COM_CheckParm ("-noerrormsgbox") \|\| isdaemon))` then `MessageBox (NULL, text, "Error", 0 /* MB_OK */ );` — flag present skips the blocking MessageBox | MATCH |
| 3 | "a fatal server error is written to ... console instead of shown in a pop-up" | src/sv_sys_win.c:409-410 -> Sys_Printf 563 -> 588-589 | `else` / `Sys_Printf ("ERROR: %s\n", text);` then (non-_CONSOLE GUI build) `ConsoleAddText(text);` writes to the server console window | MATCH |
| 4 | "...written to the log..." (presented as the flag-gated substitute for the pop-up) | src/sv_sys_win.c:414-416 | `if (logs[ERROR_LOG].sv_logfile)` / `SV_Write_Log (ERROR_LOG, 1, va ("ERROR: %s\n", text));` — log write is OUTSIDE the #ifdef/#else, UNCONDITIONAL w.r.t. the flag and conditional on the error log being open | MISMATCH (real enforcing line exists, but it is NOT gated on the flag; the error is logged whether or not the dialog is shown — the only flag-conditional substitute is the console write at clause 3) |
| 5 | "the operating system's crash dialog is suppressed as well" | src/sv_sys_win.c:824-825, 833-837 | `if (COM_CheckParm("-noerrormsgbox")) disable_gpf = true;` then `if (disable_gpf) { ... SetErrorMode(dwMode \| SEM_NOGPFAULTERRORBOX); }` — suppresses the Win32 GPF/crash error box | MATCH (canonical CMake/GUI build only; see flag) |
| 6 | "This is an on/off flag and takes no value" | src/common.c:816-827 | `COM_CheckParm` returns argv index if `parm` present else 0 — pure presence, no value parsed | MATCH |
| 7 | "Default: off (error dialogs are shown)" | src/common.c:826 + sv_sys_win.c:407 | `return 0;` when absent -> `!(0 \|\| isdaemon)` true -> MessageBox shown | MATCH |
| 8 | "Set by: command line at server launch only" | src/sv_sys_win.c:816-825 (WinMain startup) | `ParseCommandLine(lpCmdLine); COM_InitArgv(...); ... if (COM_CheckParm("-noerrormsgbox"))` — read at process start from the command line; not a cvar, no runtime mutation | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. enforce-trace-discipline.md read and applied per-clause. The param has exactly three read-sites, all in src/sv_sys_win.c (Sys_Reinit/restart path 372, Sys_Error 407, WinMain 824); no registration, no cvar, no help/doc table, no unix counterpart.

Classification C-NEAR-MISS rests on clause 4. The sentence "a fatal server error is written to the log and console instead of shown in a pop-up" presents BOTH the log-write and the console-write as the flag-gated replacement for the pop-up. Only the console-write (Sys_Printf -> ConsoleAddText, the #else of the flag branch at 409-410) is actually flag-conditional. The log-write (sv_sys_win.c:414-416) sits OUTSIDE the #ifdef _CONSOLE / #else MessageBox block: it runs unconditionally with respect to -noerrormsgbox (the error is logged even when the MessageBox IS shown) and is gated only on the error log file being open (`logs[ERROR_LOG].sv_logfile`). So the "to the log ... instead of [pop-up]" coupling has no enforcing line that gates logging on the flag -- the standard flavour-C shape (a true-sounding behavior attributed to the flag whose enforcing site does not condition on the flag). It is not a hard contradiction (the error genuinely is logged when an error log is open), hence near-miss, not C-FIX. A precise rewrite: drop "the log and" from the substitution clause, or state separately that fatal errors are always written to the error log when one is open, independent of this flag.

Everything else traces clean against the CANONICAL build. Build determination (load-bearing): the current build is CMake (CMakeLists.txt + build_cmake.sh). CMake does NOT define _CONSOLE and sets TARGET_TYPE WIN32 for MSVC -> the non-_CONSOLE GUI variant compiles: WinMain (805) is the entry point, the SEM_NOGPFAULTERRORBOX block (833-837) is compiled in, and Sys_Error's MessageBox/else-Sys_Printf path (406-410) is active. Under this build all of clauses 2/3/5 hold. The only _CONSOLE-defining build artifact in the tree is tools/old_mvs_files/mvdsv_vc2017.vcxproj (a legacy/"old" VS project). Verifying against the canonical CMake build is correct; I flag the _CONSOLE divergence below because it silently inverts clauses 3 and 5 under that variant.

Two unmentioned side-effects (omissions, not errors, so not scored): (a) the flag ALSO suppresses the "Restart failed" MessageBox in the Sys_Reinit/restart path (sv_sys_win.c:372-373); (b) -d (daemon) sets disable_gpf=true (829) AND isdaemon=true, so -d implies the same crash-box suppression plus dialog suppression -- i.e. -noerrormsgbox's dialog-suppression behavior is a strict subset of what -d already does. The description's "headless/unattended" framing is consistent with this.

## flags_for_review

- [review/cross-mod-override/synthesis] -noerrormsgbox liveness depends on the build toolchain. All 3 read-sites (sv_sys_win.c:372,407,824) compile ONLY when _CONSOLE is undefined. The LIVE shipped build is CMake/MinGW (CI: gcc-mingw-w64) which defines _CONSOLE nowhere -> flag is LIVE. But the legacy MSVC project tools/old_mvs_files/mvdsv_vc2017.vcxproj defines _CONSOLE (line 163) -> under that toolchain the flag is completely inert (the _CONSOLE branches print to stdout and never reference the flag, and the _CONSOLE entry point is `int main` at line 752, not WinMain). Documented as LIVE per the shipped CMake build; flagged because a reader building with the old vcxproj would observe no effect. Worth a human confirm that CMake/MinGW is the canonical distribution build.
- [review/cross-mod-override/vpass] _CONSOLE build variant silently inverts two clauses. Under a _CONSOLE build (defined ONLY by the legacy tools/old_mvs_files/mvdsv_vc2017.vcxproj, NOT by the canonical CMakeLists.txt), Sys_Error takes the #ifdef _CONSOLE branch (sv_sys_win.c:404-405: printf gated on sys_nostdout/isdaemon, NOT on -noerrormsgbox) so the flag has NO effect on the error-output path; and the entire SEM_NOGPFAULTERRORBOX suppression block lives inside WinMain (the #else // _CONSOLE region 803-902) so it is NOT compiled at all -> clause 5 (OS crash dialog suppression) would be FALSE in a _CONSOLE build. The description is correct for the canonical CMake (GUI/WinMain) build but would mislead anyone running the legacy console build. Recommend the description either stay anchored to the canonical build (current behavior) or add a one-line note that suppression applies to the GUI server build.
- [review/other/vpass] Clause 4 mechanism (log write at sv_sys_win.c:414-416 is flag-independent and gated only on logs[ERROR_LOG].sv_logfile being open) -- the error is written to the error log regardless of -noerrormsgbox, including when the MessageBox is shown. The 'instead of shown in a pop-up' framing wrongly couples logging to the flag. This is the basis for the C-NEAR-MISS and the recommended wording fix is in notes.
- [fyi/other/vpass] FYI provenance: the only definition of this parameter's behavior is the three COM_CheckParm read-sites; there is no registration table, cvar, or help entry, so 'command-line param, presence-only, launch-time' is structurally guaranteed and not just inferred.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: -nohwtimer=C-FIX, -heapsize=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "-noerrormsgbox",
  "type": "cmdline_param",
  "description": "Windows server only. Stops the server from popping up Windows error dialog boxes, so a fatal error or a crash never blocks on a window waiting for someone to click OK. With this flag set, a fatal server error is printed to the console instead of shown in a pop-up, and the operating system's crash dialog is suppressed as well; fatal errors are written to the error log either way, when one is open. Intended for unattended/headless servers where no one is at the screen to dismiss a dialog.\n\nThis is an on/off flag and takes no value.\n\nDefault: off (error dialogs are shown).\nSet by: command line at server launch only.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "medium",
  "description_reasoning": "primary source_ref src/sv_sys_win.c:407. Windows-only: all read-sites live in sv_sys_win.c. Bare boolean -- every site is `COM_CheckParm(\"-noerrormsgbox\")` with NO COM_Argv(i+1) read -> takes no value. THREE enforcing sites: (1) sv_sys_win.c:407 Sys_Error `if (!(COM_CheckParm(\"-noerrormsgbox\") || isdaemon)) MessageBox(NULL, text, \"Error\", 0); else Sys_Printf(\"ERROR: %s\\n\", text);` -- present => log/print instead of MessageBox (the `!(... )` makes PRESENT suppress the box; polarity traced to the `!` and the `else` branch). (2) sv_sys_win.c:372 Sys_Quit restart-failure path, same `if (!(COM_CheckParm(\"-noerrormsgbox\") || isdaemon)) MessageBox(...)`. (3) sv_sys_win.c:824 WinMain `if (COM_CheckParm(\"-noerrormsgbox\")) disable_gpf = true;` -> sv_sys_win.c:833-836 `if (disable_gpf) SetErrorMode(... | SEM_NOGPFAULTERRORBOX)` enforces the 'suppress the OS GPF crash dialog' clause. BUILD/PLATFORM GUARD (the load-bearing determination): sites 372/407 sit in the `#else` of `#ifdef _CONSOLE` (368-374, 403-412) and site 824 sits inside `WinMain` which is itself inside `#else // _CONSOLE` (sv_sys_win.c:803-902) -- i.e. ALL THREE compile ONLY when `_CONSOLE` is UNDEFINED. The LIVE shipped build is CMake (CI uses gcc-mingw-w64 per .github/workflows/build-and-deploy-release.yml:58); CMakeLists.txt and Makefile define `_CONSOLE` NOWHERE (grep empty), and CMake sets the WIN32/GUI TARGET_TYPE only under MSVC (CMakeLists.txt:133-135), so the MinGW build is non-_CONSOLE and compiles the WinMain path -> the flag IS LIVE. Confidence medium (not high) because the legacy MSVC project tools/old_mvs_files/mvdsv_vc2017.vcxproj DOES define `_CONSOLE` (line 163 et al), under which all three sites are excluded and the flag is inert -- a real build-divergence flagged for review. F-MV1: KTX (QVM mod) cannot parse cmdline -> no override.",
  "description_proposed": null
}
```
