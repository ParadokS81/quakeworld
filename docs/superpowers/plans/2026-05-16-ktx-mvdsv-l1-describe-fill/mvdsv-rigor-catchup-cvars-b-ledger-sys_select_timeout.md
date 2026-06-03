# describe-fill-synthesis ledger -- mvdsv `sys_select_timeout`

- **project:** mvdsv
- **knob:** `sys_select_timeout` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sys_select_timeout: synthesized -- per-cycle network/stdin select() wait in microseconds, clamped 1000-1000000 by OnChange (reject), default 10000us=10ms -- origin=synthesized ref=src/sv_sys_unix.c:790 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets how long the server waits for network activity (or console input) each cycle before moving on, in microseconds. A larger value lets the server idle longer between events when nothing is happening; a smaller value makes it poll more often. The accepted range is 1000 (1 millisecond) to 1000000 (1 second) -- values outside that range are rejected.
>
> Value is in microseconds; default 10000 = 10 milliseconds.
>
> Default: 10000.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| value is the per-cycle select() wait timeout | src/sv_sys_unix.c:790 | `NET_Sleep((int)sys_select_timeout.value / 1000, do_stdin)` | MATCH |
| same read on Windows main loop | src/sv_sys_win.c:788 | `NET_Sleep((int)sys_select_timeout.value / 1000, false)` | MATCH |
| NET_Sleep arg is milliseconds -> select timeval | src/net.c:1212-1214 | `timeout.tv_sec = msec/1000; timeout.tv_usec = (msec%1000)*1000; switch(select(...,&timeout))` | MATCH |
| input unit microseconds; range 1000..1000000 enforced (reject) | src/sv_main.c:3862-3867 | `if (t < 1000 || t > 1000000) { Con_Printf("...1000 (1 millisecond)...1 000 000 (1 second)."); *cancel = true; return; }` | MATCH |
| default 10000 (microseconds = 10 ms) | src/sv_main.c:55 | `cvar_t sys_select_timeout = {"sys_select_timeout", "10000", 0, OnChange_sysselecttimeout_var};` | MATCH |
| purpose: bound delay so a timed-out client is noticed promptly | src/sv_sys_unix.c:785-789 | `// the only reason we have a timeout at all is so that if the last connected client times out, the message would not otherwise be printed until the next event.` | MATCH |
| Set by server config / rcon (not blocklisted) | src/sv_main.c:1754-1764 | sys_select_timeout absent from blocklist | MATCH |
| no KTX override | ktx/src (grep) | `(none in ktx)` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Value is in microseconds (default 10000 = 10ms) | sv_main.c:55 | `cvar_t sys_select_timeout = {"sys_select_timeout", "10000", 0, OnChange_sysselecttimeout_var}; // microseconds.` | MATCH |
| 1b | Microsecond units corroborated by conversion to ms at read | sv_sys_unix.c:790 / sv_sys_win.c:788,884 | `NET_Sleep((int)sys_select_timeout.value / 1000, ...)` (µs/1000 -> ms passed to NET_Sleep) | MATCH |
| 2 | Server waits for network activity (or console input) each cycle before moving on | net.c:1191-1226 | `qbool NET_Sleep(int msec, qbool stdinissocket)` ... `FD_SET(svs.socketip,&fdset); // network socket` ... `FD_SET(0,&fdset); // stdin` ... `select(maxfd+1,&fdset,NULL,NULL,&timeout)` | MATCH |
| 2b | "(or console input)" path is real and gated by this select | sv_sys_unix.c:790 + 410-415 | loop: `stdin_ready = NET_Sleep(..., do_stdin);` then `Sys_ConsoleInput`: `if (!do_stdin || !stdin_ready) return NULL;` ... `read(STDIN_FILENO,...)` | MATCH |
| 2c | "before moving on" = per-cycle wait, then frame runs | sv_sys_unix.c:786-799 | comment `// the only reason we have a timeout at all is so that if the last connected client times out, the message would not otherwise be printed until the next event.` then `SV_Frame(time1)` | MATCH |
| 3 | Larger value idles longer; smaller polls more often (polarity) | net.c:1212-1214 | `timeout.tv_sec = msec/1000; timeout.tv_usec = (msec%1000)*1000;` -> select blocks up to timeout; larger timeout = longer max idle wait | MATCH |
| 4 | Accepted range 1000..1000000; outside rejected | sv_main.c:3862-3869 | `int t = Q_atoi(value); if (t < 1000 || t > 1000000) { Con_Printf("WARNING: ... can't be less then 1000 (1 millisecond) and more then 1 000 000 (1 second).\n"); *cancel = true; return; }` | MATCH |
| 4b | Range gloss "1000 (1 millisecond) / 1000000 (1 second)" | sv_main.c:3866 | WARNING string text matches the parenthetical equivalences in the description | MATCH |
| 5 | Default: 10000 (registered default) | sv_main.c:55 | `{"sys_select_timeout", "10000", 0, ...}` -- bare registered default, not a cfg value | MATCH |
| 6 | Set by: server config / rcon (runtime-settable) | sv_main.c:55 + 3481 | flags field `0` (not CVAR_ROM); `Cvar_Register(&sys_select_timeout);` -- OnChange only range-validates, value otherwise freely settable | MATCH |

**V-pass notes:** Oracle confirmed at 1.11-53-g18d0362. Every material clause maps to a located, verified enforcing line including adjacent comments.

Trace chain: registration (sv_main.c:55) sets default "10000" with the literal comment `// microseconds.` and wires OnChange_sysselecttimeout_var. Range enforcement is the SOLE OnChange handler (sv_main.c:3860-3870), thresholds `t < 1000 || t > 1000000` with `*cancel = true` -- exact match to the description's 1000..1000000 bounds and "values outside that range are rejected". I confirmed there is no second OnChange/clamp anywhere (grep of `sysselecttimeout` returns only the proto, registration, and the one definition).

Semantics followed into the callee per the trace-discipline core rule: read-sites pass `(int)value / 1000` (µs->ms) into NET_Sleep (net.c:1191), which performs `select()` on the network socket (svs.socketip) and, on unix, stdin (do_stdin) with the timeout derived from the value. This enforces both the "network activity (or console input)" semantics and the polarity (larger timeout = longer blocking idle wait). The unix console-input branch is genuinely gated by the same select result (Sys_ConsoleInput at sv_sys_unix.c:410 returns NULL unless stdin_ready). Windows read-sites pass `false` for stdinissocket, so the "console input" half applies to the unix build; the description's parenthetical "(or console input)" is accurate for the platform where it exists and is not contradicted on Windows (it just doesn't select stdin there). This is a platform nuance, not a defect -- the clause is true at its enforcing site.

Units clause triangulated three ways: registration comment, the /1000 conversion at every read-site, and the WARNING text's own "1000 (1 millisecond)"/"1 000 000 (1 second)" equivalences. Default and set-by/scope clauses verified against the registered default and the flags field (0, not CVAR_ROM -> runtime-settable via config/rcon). No flavour-C inference detected; no clause rests on name/enum/string-only inference without an enforcing read.

## flags_for_review

- [fyi/other/vpass] Windows server loop read-sites (sv_sys_win.c:788, 884) call NET_Sleep with stdinissocket=false, so the '(or console input)' half of the description applies only to the unix build (sv_sys_unix.c:790 passes do_stdin). Not a defect -- the clause is true where the path exists and is not contradicted on Windows -- but worth noting that console-input-while-idle is a unix-only behavior of this cvar.
- [fyi/other/vpass] sys_simulation gates the NET_Sleep call at all read-sites (`if (!sys_simulation.value)`). When sys_simulation is set, sys_select_timeout has no effect (the select-sleep is skipped entirely). The description does not mention this interaction; it is an edge condition for a simulation/test mode rather than normal operation, so omitting it is reasonable, but flagging in case a cross-reference between the two cvars is desired.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sys_select_timeout",
  "type": "cvar",
  "description": "Sets how long the server waits for network activity (or console input) each cycle before moving on, in microseconds. A larger value lets the server idle longer between events when nothing is happening; a smaller value makes it poll more often. The accepted range is 1000 (1 millisecond) to 1000000 (1 second) -- values outside that range are rejected.\n\nValue is in microseconds; default 10000 = 10 milliseconds.\n\nDefault: 10000.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_sys_unix.c:790. Trailing comment is only `// microseconds.` (sv_main.c:55) -- not a user description, so synthesized. READ use-sites: sv_sys_unix.c:790 `stdin_ready = NET_Sleep((int)sys_select_timeout.value / 1000, do_stdin)` and sv_sys_win.c:788/884 `NET_Sleep((int)sys_select_timeout.value / 1000, false)` -- the value is the timeout for the main-loop select() wait. Unit + the /1000: the cvar value is in MICROSECONDS (registration comment + OnChange warning both say so); the read divides by 1000 to pass MILLISECONDS to NET_Sleep(int msec). NET_Sleep (net.c:1191-1227) sets `timeout.tv_sec = msec/1000; timeout.tv_usec = (msec%1000)*1000;` then select(...,&timeout): so default 10000 us /1000 = 10 ms effective select wait. Range clause: OnChange_sysselecttimeout_var (sv_main.c:3860-3868) `int t = Q_atoi(value); if (t < 1000 || t > 1000000) { Con_Printf(\"WARNING: ...less then 1000 (1 millisecond) and more then 1 000 000 (1 second).\"); *cancel = true; return; }` -- out-of-range writes are cancelled (rejected), so the value is always 1000..1000000. Purpose/scope (comment at sv_sys_unix.c:785-789): the select wait exists so that when the last connected client times out, the message is not delayed until the next event -- i.e. it bounds the server's idle responsiveness. Skipped entirely when sys_simulation.value is set (sv_sys_unix.c:789). Default: registered literal `{\"sys_select_timeout\", \"10000\", 0, OnChange_sysselecttimeout_var}` at sv_main.c:55 (WI-2). Set-by: not on the rcon blocklist (sv_main.c:1754-1764) -> server config / rcon. F-MV1: grep ktx/src -> none; no KTX override. (Note: framing as 'waits for network activity or console input' -- the do_stdin/stdinissocket arg makes stdin part of the same select on unix; kept user-observable, the select internals stay in reasoning.)",
  "description_proposed": null
}
```
