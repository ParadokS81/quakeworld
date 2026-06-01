# describe-fill-synthesis ledger -- mvdsv `sys_sleep`

- **project:** mvdsv
- **knob:** `sys_sleep` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `c3-dead-network` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sys_sleep: synthesized -- Windows-only per-loop sleep in ms (cap 13, 0=off) to lower idle CPU; init forces it to 0 under -nopriority and on WinNT -- origin=synthesized ref=src/sv_sys_win.c:775 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Makes the server pause briefly each cycle of its main loop to lower idle CPU usage. The value is the pause in milliseconds, capped at 13; 0 disables the pause. This knob exists only on the Windows build and has no effect on other platforms.
>
> Note: on startup the server forces this to 0 if launched with -nopriority, and also forces it to 0 on Windows NT-class systems (where a non-zero pause was found to cause packet loss).
>
> Default: 8.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| Value is milliseconds, slept per main-loop cycle | src/sv_sys_win.c:775,780 | `sleep_msec = (int)sys_sleep.value;` ... `Sleep(sleep_msec)` | MATCH |
| 0 disables the pause (OFF-state) | src/sv_sys_win.c:776 | `if (sleep_msec > 0)` | MATCH |
| Capped at 13 ms | src/sv_sys_win.c:778-779 | `if (sleep_msec > 13) sleep_msec = 13;` | MATCH |
| Same logic in GUI build | src/sv_sys_win.c:871-877 | `sleep_msec = (int)sys_sleep.value; if (sleep_msec > 0) { if (sleep_msec > 13) sleep_msec = 13; Sleep(sleep_msec); }` | MATCH |
| Windows-only (no Unix read/registration) | src/sv_sys_win.c (whole file) | cvar declared+read only in sv_sys_win.c | MATCH |
| Registered default 8 | src/sv_sys_win.c:29 | `cvar_t sys_sleep = {"sys_sleep", "8"}` | MATCH |
| Forced to 0 under -nopriority | src/sv_sys_win.c:643-645 | `if (COM_CheckParm("-nopriority")) { Cvar_Set(&sys_sleep, "0"); }` | MATCH |
| Forced to 0 on WinNT (packet-loss comment) | src/sv_sys_win.c:654-656 | `// sys_sleep > 0 seems to cause packet loss on WinNT (why?) if (WinNT) Cvar_Set(&sys_sleep, "0")` | MATCH |
| No KTX override | ktx/src (grep) | (no match) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Pauses each cycle of the main loop | sv_sys_win.c:773-780 (and :853,871-876) | `while (1) { sleep_msec = (int)sys_sleep.value; if (sleep_msec > 0) { ... Sleep (sleep_msec); }` | MATCH |
| 2 | Lowers idle CPU usage (intent) | sv_sys_win.c:780 / :876 | `Sleep (sleep_msec);` (yields CPU in busy poll loop; no contradicting comment) | MATCH (intent-level) |
| 3 | Value is the pause in milliseconds | sv_sys_win.c:775,780 | `sleep_msec = (int)sys_sleep.value;` -> Win32 `Sleep(sleep_msec)` takes ms | MATCH |
| 4 | Capped at 13 | sv_sys_win.c:778-779 (and :874-875) | `if (sleep_msec > 13)\n\t\t\t\tsleep_msec = 13;` | MATCH |
| 5 | 0 disables the pause | sv_sys_win.c:776 (and :872) | `if (sleep_msec > 0)` gates the entire Sleep block; 0 (or <=0) skips it | MATCH (minor: any <=0 skips; 0 is canonical/forced value) |
| 6 | Exists only on Windows build / no effect on other platforms | CMakeLists.txt:84-99 + sv_sys_win.c:29; grep sv_sys_unix.c => no match | `if(UNIX) ... sv_sys_unix.c ... else() ... sv_sys_win.c`; cvar declared only in win file | MATCH (precisely: not registered at all on UNIX) |
| 7 | Startup forces 0 if launched with -nopriority | sv_sys_win.c:643-645 | `if (COM_CheckParm ("-nopriority"))\n\t{\n\t\tCvar_Set (&sys_sleep, "0");` | MATCH |
| 8 | Also forces 0 on Windows NT-class systems | sv_sys_win.c:638,655-656 | `WinNT = (vinfo.dwPlatformId == VER_PLATFORM_WIN32_NT ...)` ; `if (WinNT)\n\t\t\tCvar_Set (&sys_sleep, "0");` | MATCH (VER_PLATFORM_WIN32_NT = NT platform family) |
| 9 | Non-zero pause found to cause packet loss (rationale) | sv_sys_win.c:654 | `// sys_sleep > 0 seems to cause packet loss on WinNT (why?)` | MATCH (faithful paraphrase of adjacent comment) |
| 10 | Default: 8 (registered default) | sv_sys_win.c:29 + cvar.c:267-269 | `cvar_t sys_sleep = {"sys_sleep", "8"};` ; `value = variable->string; ... Cvar_SetROM (variable, value);` | MATCH (registered default per WI-2) |
| 11 | Set by: server config / rcon (no access restriction) | sv_sys_win.c:29,641 | `{"sys_sleep", "8"}` (no ROM/locked flag); plain `Cvar_Register (&sys_sleep);` | MATCH (ordinary settable cvar) |

**V-pass notes:** All eleven material clauses map to located, verified enforcing lines (incl. the adjacent packet-loss comment) -> TRACED-CLEAN.

Polarity confirmed by quoting the gate: sv_sys_win.c:776 `if (sleep_msec > 0)` -- a value >0 ENABLES the pause; 0 (or any <=0) BLOCKS it. The engine itself uses "0" as the OFF value at the two forcing sites. Cap confirmed at :778-779 `if (sleep_msec > 13) sleep_msec = 13;`. Both enforcement copies (text-console main loop :773-781 and GUI WinMain loop :853-877) are byte-identical in the sleep logic, so the description holds for both build flavours.

Scope clause is exactly right, not loose: `sys_sleep` is declared and registered ONLY in sv_sys_win.c (grep of sv_sys_unix.c returns nothing, exit 1), and CMakeLists.txt:84-99 compiles sv_sys_win.c only in the non-UNIX `else()` branch. So on Linux/Mac the cvar does not exist; setting it in a config there is a no-op. "Has no effect on other platforms" is true (slightly understated -- it doesn't exist rather than existing-but-inert), within TRACED-CLEAN tolerance.

Default 8 verified per WI-2 against the REGISTERED default: the struct initializer `{"sys_sleep","8"}` is applied as the default by Cvar_Register -> Cvar_SetROM (cvar.c:267-269), not sourced from a shipped .cfg. Note the description is internally honest about the startup-forcing: the registered default is 8, but on -nopriority OR any WinNT-class host (essentially all modern Windows) startup forces the effective value to 0; the note states both forces, so "Default: 8" plus the note is accurate.

Branch-structure nuance (not a defect): the -nopriority force (:645) and the WinNT force (:656) sit in mutually-exclusive if/else arms -- -nopriority sets 0 and skips the WinNT check; the else arm does the HIGH_PRIORITY_CLASS bump and the WinNT->0 force. The description's "forces 0 if -nopriority ... and also forces 0 on NT-class" reads them as two independent conditions, which is functionally accurate because both terminate at value 0 and -nopriority already yields 0; the skipped WinNT branch is immaterial to the outcome. No mismatch.

"Set by: server config / rcon" verified: the initializer carries no ROM/locked flag and registration is plain Cvar_Register (not a read-only variant), so it is an ordinary settable cvar with no access-class gate in code.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sys_nostdout=C-FIX, sv_idlesleep=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sys_sleep",
  "type": "cvar",
  "description": "Makes the server pause briefly each cycle of its main loop to lower idle CPU usage. The value is the pause in milliseconds, capped at 13; 0 disables the pause. This knob exists only on the Windows build and has no effect on other platforms.\n\nNote: on startup the server forces this to 0 if launched with -nopriority, and also forces it to 0 on Windows NT-class systems (where a non-zero pause was found to cause packet loss).\n\nDefault: 8.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_sys_win.c:775. Two enforcing read-sites, both Windows-only (file is sv_sys_win.c; not registered or read on the Unix path). Console build: src/sv_sys_win.c:775-781 `sleep_msec = (int)sys_sleep.value; if (sleep_msec > 0) { if (sleep_msec > 13) sleep_msec = 13; Sleep(sleep_msec); }` -- value is milliseconds, only sleeps when >0 (OFF-state at 0), clamped to a max of 13. WinMain/GUI build: identical logic at src/sv_sys_win.c:871-877. Both run once per main-loop iteration before the network wait. Registered default 8: src/sv_sys_win.c:29 `cvar_t sys_sleep = {\"sys_sleep\", \"8\"}` (WI-2). Startup override side-effect: src/sv_sys_win.c:643-646 `if (COM_CheckParm(\"-nopriority\")) { Cvar_Set(&sys_sleep, \"0\"); }` and src/sv_sys_win.c:654-656 `// sys_sleep > 0 seems to cause packet loss on WinNT (why?) if (WinNT) Cvar_Set(&sys_sleep, \"0\")` -- both reset it to 0 at init, action-relevant so noted inline. Platform scope inline per C3 rule (the cvar is absent on the Unix build, so 'no effect elsewhere' changes the admin's action). F-MV1: grep of ktx/src = NONE. Mechanism only; the CPU-vs-latency framing is stated as observable effect, no recommended value.",
  "description_proposed": null
}
```
