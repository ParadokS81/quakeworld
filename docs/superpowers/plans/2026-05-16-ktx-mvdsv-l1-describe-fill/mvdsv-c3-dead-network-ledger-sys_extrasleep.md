# describe-fill-synthesis ledger -- mvdsv `sys_extrasleep`

- **project:** mvdsv
- **knob:** `sys_extrasleep` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `c3-dead-network` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sys_extrasleep: synthesized -- Unix-only dev/test knob; non-zero microsecond usleep after each frame to deliberately degrade the connection; 0 (default) = off -- origin=synthesized ref=src/sv_sys_unix.c:802 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Developer/testing knob that deliberately degrades the server connection by adding artificial delay. The value is a number of microseconds the server pauses after processing each frame; 0 (the default) adds no delay. It is used to reproduce poor network conditions on purpose, not for normal operation. This knob exists only on the Unix build and has no effect on Windows.
>
> Default: 0.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| Non-zero adds delay; 0 = no delay (OFF-state) | src/sv_sys_unix.c:802 | `if ((int)sys_extrasleep.value)` | MATCH |
| Value is microseconds | src/sv_sys_unix.c:803 | `usleep ((unsigned long)sys_extrasleep.value)` | MATCH |
| Pause is per-frame (after SV_Frame) | src/sv_sys_unix.c:799,802-803 | `SV_Frame (time1);` ... `if ((int)sys_extrasleep.value) usleep(...)` | MATCH |
| Intent = deliberately degrade the connection | src/sv_sys_unix.c:801 | `// extrasleep is just a way to generate a fucked up connection on purpose` | MATCH |
| Unix-only (no Windows read-site) | src/sv_sys_unix.c (whole file) | declared/registered/read only in sv_sys_unix.c | MATCH |
| Registered default 0 | src/sv_sys_unix.c:27 | `cvar_t sys_extrasleep = {"sys_extrasleep", "0"}` | MATCH |
| No KTX override | ktx/src (grep) | (no match) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Deliberately degrades connection by adding artificial delay (on purpose, not normal op) | sv_sys_unix.c:801-803 | `// extrasleep is just a way to generate a fucked up connection on purpose` / `if ((int)sys_extrasleep.value)` / `usleep ((unsigned long)sys_extrasleep.value);` | MATCH (code + adjacent comment directly states intent) |
| 2 | Value = number of microseconds; server pauses AFTER processing each frame | sv_sys_unix.c:799 then 803 | `SV_Frame (time1);` (l.799) immediately followed by `usleep ((unsigned long)sys_extrasleep.value);` (l.803). usleep is POSIX system call (microseconds); NO custom shim in tree; internal `Sys_Sleep` at l.496 `usleep(ms*1000)` independently corroborates microsecond unit | MATCH |
| 3 | 0 (the default) adds no delay (OFF-state) | sv_sys_unix.c:802 | `if ((int)sys_extrasleep.value)` -- value 0 is falsy, usleep is skipped entirely | MATCH |
| 4 | Used to reproduce poor network conditions on purpose / not for normal operation | sv_sys_unix.c:801 | `// extrasleep is just a way to generate a fucked up connection on purpose` | MATCH (adjacent comment) |
| 5 | Exists only on the Unix build | sv_sys_unix.c:27 (`cvar_t sys_extrasleep = {"sys_extrasleep", "0"};`), :491 (`Cvar_Register (&sys_extrasleep);` in Sys_Init); tree-wide grep returns ZERO hits outside sv_sys_unix.c | (def + register both Unix-only) | MATCH |
| 6 | Has no effect on Windows | sv_sys_win.c (no symbol present), :621 Windows `Sys_Init` registers only `sys_nostdout` + `sys_sleep`; no `usleep`/`sys_extrasleep` anywhere in Windows sources | `Cvar_Register (&sys_nostdout); Cvar_Register (&sys_sleep);` | MATCH (Windows analog is a different cvar `sys_sleep`, not this knob) |
| 7 | Default: 0 (registered default, WI-2) | sv_sys_unix.c:27 | `cvar_t sys_extrasleep = {"sys_extrasleep", "0"};` -- string initializer "0" | MATCH |
| 8 | Set by: server config / rcon | sv_sys_unix.c:27 (flags field zero-init = CVAR_NONE); cvar.h:61-63 (`CVAR_ROM (1<<1)` not set) | flags=0 -> not read-only, freely settable via console/cfg-exec/rcon command interpreter | MATCH |

**V-pass notes:** Oracle confirmed: mvdsv @ 1.11-53-g18d0362. All four use-sites of sys_extrasleep live in src/sv_sys_unix.c (registration l.27, Cvar_Register l.491, guard+usleep l.802-803); tree-wide grep returns no other hits. Every material clause maps to a located, verified enforcing line (including the adjacent comment at l.801).

Most-scrutinized clause was "microseconds" (the unit), since a hidden usleep shim would invert it: grep confirms `usleep` has NO custom redefinition anywhere in src/, so it is the POSIX system call (microsecond unit). Independent corroboration: the in-file `Sys_Sleep(unsigned long ms)` shim at l.494-496 does `usleep(ms*1000)`, i.e. ms->microseconds, which only makes sense if usleep's argument is microseconds. Confirmed.

Polarity/OFF-state: `if ((int)sys_extrasleep.value)` at l.802 -- NONZERO enables the sleep, 0 skips it. Default "0" (registered, l.27) therefore = no delay. Both directions confirmed against the exact enforcing line.

Windows exclusion firmly traced: src/sv_sys_win.c exists, its Sys_Init (l.621) registers sys_nostdout + sys_sleep but NOT sys_extrasleep, and contains no usleep. The Windows side has a differently-named knob (sys_sleep) for an unrelated purpose; the description's "no effect on Windows / Unix-only" is precise.

WI-2 metadata: Default 0 verified against the registered struct default, not a shipped .cfg. "Set by server config / rcon" verified against flags=CVAR_NONE (cvar.h shows CVAR_ROM=(1<<1) is NOT set), so the cvar is freely settable through the command interpreter that both cfg-exec and rcon route through.

No flavour-C inference detected -- no clause rests on the knob name, an enum/string, or a config comment without an enforcing read-site. Classification: TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] The phrase 'the server pauses after processing each frame' is exact -- the usleep sits at the bottom of the qwsv dedicated-server main loop directly after SV_Frame(time1) (sv_sys_unix.c:799-803). No misframing; flagged only as an FYI that 'server' here is the dedicated server process, which is correct.
- [fyi/off-scope-entity/vpass] Windows has a separate cvar 'sys_sleep' registered in its Sys_Init (sv_sys_win.c:641) which is NOT the same mechanism as sys_extrasleep. A future reader scanning for a Windows equivalent should not conflate the two. Not in scope of this knob; FYI only.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sys_nostdout=C-FIX, sv_idlesleep=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sys_extrasleep",
  "type": "cvar",
  "description": "Developer/testing knob that deliberately degrades the server connection by adding artificial delay. The value is a number of microseconds the server pauses after processing each frame; 0 (the default) adds no delay. It is used to reproduce poor network conditions on purpose, not for normal operation. This knob exists only on the Unix build and has no effect on Windows.\n\nDefault: 0.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_sys_unix.c:802. Enforcing read-site src/sv_sys_unix.c:802-803 `if ((int)sys_extrasleep.value) usleep((unsigned long)sys_extrasleep.value);` -- runs only when the value is non-zero (so 0 = no delay, the OFF-state), and `usleep()` takes microseconds, so the value is microseconds. It sits at the very end of the main-loop body, immediately after `SV_Frame(time1)` (src/sv_sys_unix.c:799), so the pause is per-frame. The adjacent enforcing comment src/sv_sys_unix.c:801 `// extrasleep is just a way to generate a fucked up connection on purpose` directly states the intent (deliberately worsening the connection); the 'artificial degradation / testing' framing is grounded in that comment plus the usleep effect, not inferred from the name. Unix-only: the cvar is declared, registered (src/sv_sys_unix.c:491) and read only in sv_sys_unix.c -- no Windows read-site (grep), so platform scope is action-changing and stated inline per C3 rule. Registered default 0: src/sv_sys_unix.c:27 `cvar_t sys_extrasleep = {\"sys_extrasleep\", \"0\"}` (WI-2). F-MV1: grep of ktx/src = NONE. No recommended value.",
  "description_proposed": null
}
```
