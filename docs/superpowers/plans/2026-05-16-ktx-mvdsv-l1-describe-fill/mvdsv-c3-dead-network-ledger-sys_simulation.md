# describe-fill-synthesis ledger -- mvdsv `sys_simulation`

- **project:** mvdsv
- **knob:** `sys_simulation` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `c3-dead-network` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sys_simulation: synthesized -- non-zero makes the server main loop skip its per-cycle network wait (NET_Sleep); 0 (default) keeps the normal wait; dev/test knob -- origin=synthesized ref=src/sv_sys_unix.c:789 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Developer/testing knob that disables the server's normal network wait. At the default of 0 the server's main loop waits on the network socket each cycle as usual. Any non-zero value makes the loop skip that wait entirely, so it runs continuously without pausing for incoming network activity.
>
> Default: 0.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| 0 (default) keeps the normal per-loop network wait | src/sv_sys_unix.c:789-790 | `if (!sys_simulation.value) { stdin_ready = NET_Sleep((int)sys_select_timeout.value / 1000, do_stdin); }` | MATCH |
| Non-zero skips the network wait (negated polarity) | src/sv_sys_unix.c:789 | `if (!sys_simulation.value)` | MATCH |
| Windows console build: same gate | src/sv_sys_win.c:787 | `if (!sys_simulation.value) { NET_Sleep((int)sys_select_timeout.value / 1000, false); }` | MATCH |
| Windows GUI build: same gate | src/sv_sys_win.c:883 | `if (!sys_simulation.value) { NET_Sleep((int)sys_select_timeout.value / 1000, false); }` | MATCH |
| No other read-site / no further behavior claimed | src/ (grep `sys_simulation.value`) | only the three gate sites | MATCH |
| Registered default 0 | src/sv_main.c:61 | `cvar_t sys_simulation = { "sys_simulation", "0" }` | MATCH |
| No KTX override | ktx/src (grep) | (no match) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | "Developer/testing knob" (soft framing) | sv_sys_unix.c:801 (sibling context) | `// extrasleep is just a way to generate a fucked up connection on purpose` | MATCH (soft inference; behavioral substance traced below; name + same network-loop-control family as sys_extrasleep/sys_sleep support the framing) |
| 2 | "disables the server's normal network wait" / "waits on the network socket" | net.c:1208, 1214 (callee NET_Sleep) | `FD_SET(svs.socketip, &fdset); // network socket` ... `switch (select(maxfd + 1, &fdset, NULL, NULL, &timeout))` | MATCH (NET_Sleep is a blocking select() on the net socket + optional stdin with a timeout) |
| 3 | "At the default of 0 ... the loop waits ... as usual" | sv_sys_unix.c:789-791 (also sv_sys_win.c:787-789, 883-885) | `if (!sys_simulation.value) {`<br>`    stdin_ready = NET_Sleep((int)sys_select_timeout.value / 1000, do_stdin);`<br>`}` | MATCH (value 0 -> `!0`=true -> NET_Sleep IS called -> waits) |
| 4 | "Any non-zero value makes the loop skip that wait entirely" | sv_sys_unix.c:789 (same gate, all 3 loops) | `if (!sys_simulation.value) {` | MATCH (value != 0 -> `!nonzero`=false -> NET_Sleep SKIPPED -> no wait) |
| 5 | "runs continuously without pausing for incoming network activity" | sv_sys_unix.c:789-799 (loop body) | gate skips NET_Sleep; loop falls straight through to `SV_Frame (time1)` with no blocking call between | MATCH (no other blocking wait on the network path in the gated region) |
| 6 | "Default: 0" | sv_main.c:61 (registered sv_main.c:3913) | `cvar_t  sys_simulation = { "sys_simulation", "0" };` | MATCH (registered default "0"; no value override at Cvar_Register) |
| 7 | "Set by: server config / rcon" | sv_main.c:61 | `cvar_t  sys_simulation = { "sys_simulation", "0" };` (no CVAR_ROM / no CVAR_USERINFO / no CVAR_SERVERINFO / no access flag) | MATCH (plain settable server cvar; no restriction flag) |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. Trace discipline applied per clause.

Complete enforcement surface: registration at sv_main.c:61 (`#ifdef SERVERONLY`), registered via Cvar_Register at sv_main.c:3913. Three IDENTICAL enforcing read-sites, all `if (!sys_simulation.value) { ...NET_Sleep... }`: sv_sys_unix.c:789 (Unix main loop, passes do_stdin), sv_sys_win.c:787 (Windows _CONSOLE build), sv_sys_win.c:883 (Windows WinMain/GUI build). No OnChange handler, no macro alias, no other reads (verified by grep of "simulation" tree-wide; the only other hit, sv_main.c:3295 "decide the simulation time", is an unrelated SV_Frame timing comment).

Callee-follow (mandatory per discipline): NET_Sleep (net.c:1191-1227) builds an fdset including the network socket svs.socketip (line 1208, comment "// network socket") and optionally stdin, then calls select() (line 1214) with a timeout. It is exactly the network-socket wait the description names. The caller gate logic IS the asserted clause, and the substance ("waits on the network socket") lives in the traced callee.

SHARPENED POLARITY CHECK (the calibration concern): enforcing line is `if (!sys_simulation.value)`. value==0 (default) -> !0==true -> NET_Sleep called -> loop WAITS (matches clause 3). value!=0 -> !nonzero==false -> NET_Sleep SKIPPED -> loop runs continuously, no wait (matches clauses 4-5). Polarity correct in BOTH directions; which value enables vs blocks is exactly as the description states.

Two harmless simplifications, neither a defect: (a) description says "the server's main loop" (singular) but there are three platform-specific loops gated identically -- behavior is uniform, MVDSV is one server with per-platform entry points. (b) "Developer/testing" framing is a soft name+sibling-context inference (no literal "developer" comment adjacent), but it asserts no semantic/polarity/threshold/scope/OFF-state claim; the behavioral substance is fully enforcement-traced. Per PROC-1 this is a still-true characterization, not a judgment absorbed into CLEAN.

Default and access (WI-2): registered default literally "0"; no CVAR flags of any kind, so settable via server config / rcon as stated. Both metadata clauses MATCH.

Verdict: every material clause maps to a located, verified enforcing line incl. adjacent comments. TRACED-CLEAN.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sys_nostdout=C-FIX, sv_idlesleep=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sys_simulation",
  "type": "cvar",
  "description": "Developer/testing knob that disables the server's normal network wait. At the default of 0 the server's main loop waits on the network socket each cycle as usual. Any non-zero value makes the loop skip that wait entirely, so it runs continuously without pausing for incoming network activity.\n\nDefault: 0.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_sys_unix.c:789. Enforcing read-sites guard the per-loop network wait. Unix: src/sv_sys_unix.c:789 `if (!sys_simulation.value) { stdin_ready = NET_Sleep((int)sys_select_timeout.value / 1000, do_stdin); }` -- the NET_Sleep call (the socket/stdin wait) runs ONLY when the value is 0; any non-zero value skips it (polarity = negated: non-zero turns the wait OFF). Windows console build: same gate at src/sv_sys_win.c:787 `if (!sys_simulation.value) { NET_Sleep(...); }`; Windows GUI build: src/sv_sys_win.c:883 identical. All three are the complete set of `.value` reads (grep), so the only effect is suppressing the main-loop network wait. Registered default 0: src/sv_main.c:61 `cvar_t sys_simulation = { \"sys_simulation\", \"0\" }` (WI-2). I name it a developer/testing knob from the observable effect (a server that never waits on the socket spins the CPU and is not a normal operating mode); I do NOT assert any further simulation behavior beyond the traced NET_Sleep suppression -- there is no other enforcing read-site, so nothing more is claimed. F-MV1: grep of ktx/src = NONE. No recommended value.",
  "description_proposed": null
}
```
