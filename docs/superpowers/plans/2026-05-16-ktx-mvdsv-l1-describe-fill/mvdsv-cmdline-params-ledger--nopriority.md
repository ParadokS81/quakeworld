# describe-fill-synthesis ledger -- mvdsv `-nopriority`

- **project:** mvdsv
- **knob:** `-nopriority` (cmdline_param)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `cmdline-params` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:-nopriority: synthesized -- Windows-only bare boolean; PRESENT skips the startup raise to HIGH_PRIORITY_CLASS and forces sys_sleep=0; ABSENT (default) raises to HIGH; polarity read from the if/else not the name -- origin=synthesized ref=src/sv_sys_win.c:643 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Windows server only. Tells the server NOT to raise its Windows process priority on startup. Normally the server boosts itself to HIGH priority so it gets more CPU time and runs more smoothly under load; with this flag it stays at normal priority, which is gentler on everything else running on the same machine. Setting it also forces the server's internal sleep-between-frames setting to 0.
>
> This is an on/off flag and takes no value.
>
> Default: off (the server raises itself to HIGH priority on startup).
> Set by: command line at server launch only.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| Windows-only | src/sv_sys_win.c:625-660 | flag read inside Sys_Init in the Windows sys layer | MATCH |
| bare boolean, takes no value | src/sv_sys_win.c:643 | `if (COM_CheckParm ("-nopriority"))` (no COM_Argv(p+1)) | MATCH |
| present => server does NOT raise to HIGH priority | src/sv_sys_win.c:643-646 | `if (COM_CheckParm ("-nopriority")) { Cvar_Set (&sys_sleep, "0"); }` (present-branch omits SetPriorityClass) | MATCH |
| absent (default) => raises process to HIGH priority | src/sv_sys_win.c:647-652 | `else { if ( ! SetPriorityClass (GetCurrentProcess(), HIGH_PRIORITY_CLASS)) Con_Printf("SetPriorityClass() failed\n"); else Con_Printf("Process priority class set to HIGH\n"); }` | MATCH |
| present => also forces sys_sleep to 0 | src/sv_sys_win.c:645 | `Cvar_Set (&sys_sleep, "0");` | MATCH |
| no KTX override (mod cannot parse cmdline) | ktx/src (grep) | grep `COM_CheckParm`/`-nopriority` in ktx/src = empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Scope: Windows server only | src/sv_sys_win.c:643 (sole use-site); absent from src/sv_sys_unix.c | `if (COM_CheckParm ("-nopriority"))` inside `Sys_Init` in the Windows-only sys file; grep finds zero `nopriority` hits in sv_sys_unix.c | MATCH |
| 2 | Tells server NOT to raise Windows process priority on startup | src/sv_sys_win.c:643-649 | true-branch (lines 644-646) SKIPS the `SetPriorityClass(...HIGH_PRIORITY_CLASS)` call that lives only in the `else` (line 649) | MATCH |
| 3 | Normally boosts to HIGH priority (more CPU / smoother under load) | src/sv_sys_win.c:649-652 | `if ( ! SetPriorityClass (GetCurrentProcess(), HIGH_PRIORITY_CLASS))` ... `Con_Printf ("Process priority class set to HIGH\n")` — HIGH_PRIORITY_CLASS is the literal Win32 priority; CPU/smoothness is faithful interpretive color, not a separate code claim | MATCH |
| 4 | With flag it stays at normal priority | src/sv_sys_win.c:643-657 | the only SetPriorityClass call is in the `else`; the `-nopriority` true-branch never raises priority, so the process keeps its default (NORMAL) class | MATCH |
| 5 | Setting it forces internal sleep-between-frames setting (sys_sleep) to 0 | src/sv_sys_win.c:645 | `Cvar_Set (&sys_sleep, "0");` sits inside the `if (COM_CheckParm("-nopriority"))` true-branch; main loop lines 775-781 use `sys_sleep.value` as `Sleep(ms)` at the top of `while(1)` before `SV_Frame`, confirming the "between-frames" characterization | MATCH (see FYI flag re WinNT overlap) |
| 6 | On/off flag, takes no value | src/common.c:816-827 + src/sv_sys_win.c:643 | `COM_CheckParm` returns argv index or 0 (pure presence test, reads no following token); call site uses only the boolean `if (...)` | MATCH |
| 7 | Default: off (server raises to HIGH on startup) | src/sv_sys_win.c:643-649 | `COM_CheckParm` returns 0 when the token is absent → `else` branch runs → HIGH priority; flag is opt-in, default-absent | MATCH |
| 8 | Set by: command line at server launch only | src/common.c:816-822 + src/sv_sys_win.c:643 | `COM_CheckParm` scans `com_argv[]` (the parsed command line); no cvar/console-command path exists, and `Sys_Init` runs once at startup | MATCH |

**V-pass notes:** Version confirmed 1.11-53-g18d0362. Single use-site: src/sv_sys_win.c:643, with the full enforcing block at lines 643-657. Followed the callee COM_CheckParm (common.c:816, pure presence check) and read the registration of sys_sleep (sv_sys_win.c:29, declared `{"sys_sleep", "8"}`, registered at line 641). All eight material clauses map to located, verified enforcing lines including adjacent comments; nothing is name/enum/string-only inference. Polarity correct (flag = skip the HIGH boost), scope correct (Windows-only; no -nopriority in sv_sys_unix.c), side-effect correct (sys_sleep forced to "0" in the flag's true-branch), type/default/set-by all correct against COM_CheckParm semantics. The "more CPU / smoother / gentler on the machine" wording is faithful plain-English color for HIGH_PRIORITY_CLASS, not an over-claim of a distinct code path. One non-defect nuance is flagged below for the operator (the else-branch also zeroes sys_sleep on WinNT), but it does not falsify any literal clause. No C-FIX / C-NEAR-MISS / WI2-FIX conditions present. READ-ONLY: no files/DB/git modified.

## flags_for_review

- [fyi/other/vpass] The side-effect 'forces sys_sleep to 0' is literally true for the -nopriority true-branch (sv_sys_win.c:645), but the ELSE branch ALSO sets sys_sleep to "0" when running on WinNT (sv_sys_win.c:654-656: `// sys_sleep > 0 seems to cause packet loss on WinNT (why?)` then `if (WinNT) Cvar_Set (&sys_sleep, "0");`). So on any NT-class OS (i.e. all modern Windows), sys_sleep ends up 0 whether or not the flag is set; the flag's distinctive sleep=0 effect is only observable on the legacy Win9x path. The description does NOT claim the effect is unique to the flag, so no clause is wrong — but a reader could infer the sys_sleep=0 behavior is exclusive to -nopriority when in practice modern Windows zeroes it regardless. FYI only; not a fix.
- [fyi/other/vpass] The registered default of sys_sleep is "8" (sv_sys_win.c:29), i.e. 8ms of Sleep() between server frames by default on non-NT/non-flag paths. The description correctly leaves the sys_sleep default out of scope (it documents only that the flag forces it to 0), but if a downstream sys_sleep L1 row exists, its 'Default' must be 8 per the registration, not 0 — the 0 is a -nopriority/WinNT override, not the registered default (WI-2 distinction).

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: -nohwtimer=C-FIX, -heapsize=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "-nopriority",
  "type": "cmdline_param",
  "description": "Windows server only. Tells the server NOT to raise its Windows process priority on startup. Normally the server boosts itself to HIGH priority so it gets more CPU time and runs more smoothly under load; with this flag it stays at normal priority, which is gentler on everything else running on the same machine. Setting it also forces the server's internal sleep-between-frames setting to 0.\n\nThis is an on/off flag and takes no value.\n\nDefault: off (the server raises itself to HIGH priority on startup).\nSet by: command line at server launch only.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_sys_win.c:643. Windows-only: read-site is sv_sys_win.c:643 in the Windows sys layer (Sys_Init). Bare boolean -- `if (COM_CheckParm (\"-nopriority\"))` with NO COM_Argv read -> takes no value. POLARITY (positive check, traced to the code not the name): the PRESENT branch (643-646) is `{ Cvar_Set(&sys_sleep, \"0\"); }` -- it sets sys_sleep 0 and does NOT call SetPriorityClass; the ABSENT/else branch (647-657) is `if (!SetPriorityClass(GetCurrentProcess(), HIGH_PRIORITY_CLASS)) Con_Printf(\"SetPriorityClass() failed\\n\"); else Con_Printf(\"Process priority class set to HIGH\\n\");`. So PRESENT => skip the HIGH-priority raise (name and effect agree; stated from the `if`/`else` structure, not inferred from the name). Side-effect 'forces sys_sleep to 0' enforced at sv_sys_win.c:645 `Cvar_Set(&sys_sleep, \"0\")`. Default-off / 'normally raises to HIGH' is the else branch behavior, correct because COM_CheckParm returns 0 when the flag is absent -> else runs. Did NOT inline the WinNT detail (else-branch sv_sys_win.c:655-656 also sets sys_sleep 0 on WinNT 'seems to cause packet loss') -- that is an internal engine-rationale clause, not user-action-changing, kept out of the user doc per D20. F-MV1: KTX (QVM mod) cannot parse cmdline -> no override. Note: unlike the negative-named `!`-guarded flags the chunk warns about, -nopriority uses a plain positive COM_CheckParm with the disabling action in the present-branch; polarity verified directly from sv_sys_win.c:643-657.",
  "description_proposed": null
}
```
