# describe-fill-synthesis ledger -- mvdsv `sv_idlesleep`

- **project:** mvdsv
- **knob:** `sv_idlesleep` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_idlesleep: synthesized -- >0 sleeps that many ms/frame while the server is empty to cut idle CPU; early-returns (no sleep) once any client connects; default 0 = off -- origin=synthesized ref=src/sv_main.c:3149 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Reduces CPU use on an idle server by making it sleep briefly each frame while no clients are connected. The value is the number of milliseconds the server sleeps per frame when the server is empty; once any client is connected, no sleeping occurs and the server runs at full frame rate.
>
> 0 = off (no extra idle sleep is added; the server still does its normal short per-frame network wait, so it does not pin the CPU).
> Any value above 0 = sleep that many milliseconds per frame while the server is empty.
>
> Default: 0.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| Default 0 | src/sv_main.c:144 | `cvar_t sv_idlesleep = {"sv_idlesleep", "0"}` | MATCH |
| >0 enables; 0 = off (never sleeps) | src/sv_main.c:3375 | `if ((int)sv_idlesleep.value > 0) SV_IdleSleep();` | MATCH |
| sleeps only when server empty (early-return if any client connected) | src/sv_main.c:3143-3146 | `for (i = 0; i < MAX_CLIENTS; i++) { if (svs.clients[i].state >= cs_preconnected) return; }` | MATCH |
| value = milliseconds slept per frame | src/sv_main.c:3149 | `Sys_Sleep((int)sv_idlesleep.value);` | MATCH |
| purpose: cut idle CPU (corroborating comment) | src/sv_main.c:3135-3136 | `// If the server is empty, avoid a busy loop by sleeping for the number of milliseconds specified by sv_idlesleep per frame to reduce CPU usage.` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Reduces CPU use on an idle server by making it sleep briefly each frame while no clients are connected" | src/sv_main.c:3135-3136 (comment) + 3143-3149 (impl) | `// If the server is empty, avoid a busy loop by sleeping for the number of // milliseconds specified by sv_idlesleep per frame to reduce CPU usage.` / `for (i = 0; i < MAX_CLIENTS; i++){ if (svs.clients[i].state >= cs_preconnected) return; } Sys_Sleep((int)sv_idlesleep.value);` | MATCH |
| 2 | "The value is the number of milliseconds the server sleeps per frame" (units = ms) | src/sv_main.c:3149 -> src/sv_sys_unix.c:494-497 / src/sv_sys_win.c:662-665 | `Sys_Sleep((int)sv_idlesleep.value);` ; `void Sys_Sleep(unsigned long ms){ usleep(ms*1000); }` (unix) ; `void Sys_Sleep (unsigned long ms){ Sleep (ms); }` (win32 Sleep = ms) | MATCH |
| 3 | "per frame" (once per server frame) | src/sv_main.c:3284 + 3375-3376 | `void SV_Frame (double time1)` ... `if ((int)sv_idlesleep.value > 0) SV_IdleSleep();` (call sits in SV_Frame, the per-frame loop body; SV_Frame called once per main-loop iteration at sv_sys_unix.c:799 / sv_sys_win.c:797) | MATCH |
| 4 | "while no clients are connected" / "when the server is empty" | src/sv_main.c:3143-3147 + src/server.h:148-153 | `if (svs.clients[i].state >= cs_preconnected) return;` ; enum `cs_free, cs_zombie, cs_preconnected, cs_connected, cs_spawned` | MATCH (minor: returns/skips-sleep when any slot >= cs_preconnected, i.e. a client that has been ASSIGNED but not yet fully in-game already counts; a cs_zombie/settling slot does NOT count, so "empty" is slightly approximate at the edges) |
| 5 | "once any client is connected, no sleeping occurs and the server runs at full frame rate" | src/sv_main.c:3143-3147 | `if (svs.clients[i].state >= cs_preconnected) return;` (early return -> Sys_Sleep skipped) | MATCH (minor: trips at cs_preconnected, before "connected"/in-game; "full frame rate" is governed by main-loop timing + sys_select_timeout, not by this cvar -- this cvar only removes the EXTRA idle sleep) |
| 6 | "0 = off (the server never sleeps; it busy-loops while idle)" | src/sv_sys_unix.c:789-799 + src/sv_main.c:55 (refutes) | main loop ALWAYS calls `NET_Sleep((int)sys_select_timeout.value / 1000, do_stdin);` before `SV_Frame (time1);` ; `sys_select_timeout = {"sys_select_timeout", "10000", ...}; // microseconds` ; NET_Sleep is a blocking `select(... &timeout)` (net.c:1214). At sv_idlesleep=0 the server still blocks ~10 ms/frame in select() -- it does NOT busy-loop. | MISMATCH |
| 7 | "Any value above 0 = sleep that many milliseconds per frame while the server is empty" | src/sv_main.c:3375-3376 + 3149 | `if ((int)sv_idlesleep.value > 0) SV_IdleSleep();` ; `Sys_Sleep((int)sv_idlesleep.value);` | MATCH |
| 8 | "Default: 0" | src/sv_main.c:144 | `cvar_t	sv_idlesleep = {"sv_idlesleep", "0"};` (and Cvar_Register at 3440 with no override) | MATCH |
| 9 | "Set by: server config / rcon" (freely settable at runtime) | src/sv_main.c:144 + 3440 | `cvar_t sv_idlesleep = {"sv_idlesleep", "0"};` -- no CVAR_ROM/CVAR_LATCH flag, no on-change callback; plain registration -> settable via console/rcon/config | MATCH |

**V-pass notes:** CLASSIFICATION: C-FIX. The core mechanism is correctly described and fully traceable -- 8 of 9 clauses MATCH (two with minor edge-imprecision noted but still acceptable). One OFF-state side-clause CONTRADICTS the code, which is the flavour-C defect that forces C-FIX.

THE DEFECT (clause 6): "0 = off (the server never sleeps; it busy-loops while idle)." The parenthetical "it busy-loops while idle" has NO enforcing line and is refuted by the actual main loop. In sv_sys_unix.c:789-799 and sv_sys_win.c (mirror), the dedicated-server main loop UNCONDITIONALLY calls NET_Sleep(sys_select_timeout/1000, ...) before every SV_Frame. NET_Sleep (net.c:1191-1227) is a blocking select() with that timeout. sys_select_timeout defaults to "10000" microseconds (= 10 ms) per the comment at sv_main.c:55. So even with sv_idlesleep=0, an idle server blocks up to ~10 ms per frame in select() (waking early on socket/stdin activity) -- it is NOT a busy loop and does NOT pin CPU at 100%. sv_idlesleep is an ADDITIONAL sleep stacked on top of the always-present select() wait, to push idle CPU even lower. The correct OFF-state framing is "no EXTRA idle sleep is added" (the select()-based wait still happens), not "busy-loops."

This is textbook flavour-C: a confident, plausible OFF-state characterization inferred from the knob's "reduce busy loop" framing (the source comment at sv_main.c:3135 even says "avoid a busy loop", which describes the PURPOSE of idlesleep, not the behavior of the 0/off state) -- with the surrounding enforcing context (the main loop) flatly contradicting it. Invisible at output-inspection; only the main-loop trace surfaces it.

RECOMMENDED FIX for clause 6 (for the re-synth, not applied here -- READ-ONLY): drop the "busy-loops while idle" parenthetical. Replace with something like "0 = off (no extra idle sleep is added; the server still uses its normal per-frame network wait, sys_select_timeout, default ~10 ms)." This keeps the OFF-state honest without overstating CPU behavior.

MINOR (acceptable, not fix-forcing): The "empty"/"no clients connected" framing (clauses 4-5) is enforced by `state >= cs_preconnected`. Per server.h:148-153 the enum is cs_free(0), cs_zombie(1), cs_preconnected(2), cs_connected(3), cs_spawned(4). So (a) a client mid-handshake (cs_preconnected = "assigned, login/realip not settled yet") already stops the sleep -- i.e. sleep stops slightly BEFORE the client is "connected"/in-game; and (b) cs_zombie slots (recently-disconnected, settling) do NOT stop the sleep, so a strictly-not-empty slot table can still sleep. These are edge nuances around the words "connected"/"empty"; the everyday-case description is correct and these do not rise to a fix.

METADATA (WI-2): Default "0" verified against the REGISTERED default at sv_main.c:144 (`{"sv_idlesleep", "0"}`), not a shipped-cfg value -- MATCH. No CVAR_ROM/CVAR_LATCH, no on-change callback, no cmdline override, no programmatic Cvar_Set; the cvar is freely runtime-settable, so "Set by: server config / rcon" is correct -- MATCH.

SURFACE COMPLETENESS: Wide-grep found exactly 5 use-sites, all in sv_main.c (registration 144; comment 3135-3136; Sys_Sleep call 3149; gate 3375; Cvar_Register 3440). No alternate idlesleep path, no -noidle cmdline flag, no min/max bound, no second main loop. mvdsv is SERVERONLY (CMakeLists.txt:169 `target_compile_definitions(... PRIVATE SERVERONLY)`), dedicated-only, so the sys_unix/sys_win select()-based loop is the only loop -- the contradiction is unconditional. Callee-follow performed for Sys_Sleep (both platform impls) and NET_Sleep (select semantics).

ORACLE PIN CONFIRMED: git describe --tags == 1.11-53-g18d0362.

## flags_for_review

- [fyi/other/vpass] sv_idlesleep does not interact with sys_extrasleep (sv_sys_unix.c:802-803, a deliberate connection-degradation knob in MICROseconds via usleep) -- different units (idlesleep ms vs extrasleep us) and different purpose; no conflict, just noting the two sleep knobs in the same loop for any future doc that groups 'server sleep' cvars.
- [review/contradiction/vpass] The source comment at sv_main.c:3135 ('avoid a busy loop ... to reduce CPU usage') describes the PURPOSE/benefit of enabling sv_idlesleep, not the behavior when it is 0. A synth reading this comment could (and here did) over-translate it into 'at 0 the server busy-loops.' The real anti-busy-loop mechanism that is ALWAYS on is NET_Sleep/select() with sys_select_timeout. Recommend the re-synth not lean on the word 'busy loop' for the OFF state.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_idlesleep",
  "type": "cvar",
  "description": "Reduces CPU use on an idle server by making it sleep briefly each frame while no clients are connected. The value is the number of milliseconds the server sleeps per frame when the server is empty; once any client is connected, no sleeping occurs and the server runs at full frame rate.\n\n0 = off (no extra idle sleep is added; the server still does its normal short per-frame network wait, so it does not pin the CPU).\nAny value above 0 = sleep that many milliseconds per frame while the server is empty.\n\nDefault: 0.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3149. Registered sv_main.c:144 `cvar_t sv_idlesleep = {\"sv_idlesleep\", \"0\"}` -> Default 0 (WI-2: two-field literal). Two enforcing sites: sv_main.c:3375 `if ((int)sv_idlesleep.value > 0) SV_IdleSleep();` -> polarity/OFF-state: >0 enables, 0 (or negative) means SV_IdleSleep is never called = off / busy-loop. Inside SV_IdleSleep (sv_main.c:3139-3150): loop `for (i=0; i<MAX_CLIENTS; i++) if (svs.clients[i].state >= cs_preconnected) return;` -> EARLY RETURN (no sleep) the moment any client slot is at/above cs_preconnected, i.e. sleeping only happens when the server is EMPTY (scope clause: 'while no clients are connected'); then `Sys_Sleep((int)sv_idlesleep.value)` -> unit = milliseconds, sleep duration = the value, per frame (SV_Frame tail). Adjacent comment sv_main.c:3135-3136 corroborates 'If the server is empty, avoid a busy loop by sleeping for the number of milliseconds specified by sv_idlesleep per frame to reduce CPU usage' (comment used only as corroboration; the enforcing code matches it). Units stated as ms (Sys_Sleep takes ms).",
  "description_proposed": null
}
```
