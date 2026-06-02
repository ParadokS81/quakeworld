# describe-fill-synthesis ledger -- mvdsv `qconsole_log_say`

- **project:** mvdsv
- **knob:** `qconsole_log_say` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qconsole_log_say: synthesized -- toggles whether chat (say) messages are written to the console log (0=excluded, 1=included; level-0 console output always kept); live via OnChange -- origin=synthesized ref=src/sv_ccmds.c:138 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether chat (say and say_team) messages are included in the server's console log file. Has no effect unless console logging is already enabled.
>
> 0 = chat messages are not written to the console log (normal console output still is).
> 1 = chat messages are also written to the console log.
>
> Changing this takes effect immediately, even while the console log is open.
>
> Default: 0.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| cvar sets CONSOLE_LOG message-level threshold (at log-open) | src/sv_ccmds.c:138 | `case CONSOLE_LOG: logs[CONSOLE_LOG].log_level = Cvar_Value("qconsole_log_say");` | MATCH |
| threshold gates writes (msg suppressed if log_level < level) | src/sv_main.c:4145 | `if (logs[sv_log].log_level < level) return;` | MATCH |
| chat/say lines written at level 1 (gated by threshold) | src/sv_user.c:1873 ; src/sv_ccmds.c:1365 ; src/sv_demo_qtv.c:794 | `SV_Write_Log(CONSOLE_LOG, 1, text);` (all PRINT_CHAT paths) | MATCH |
| non-chat console output written at level 0 (always kept) | src/sv_send.c:160 ; src/sv_broadcast.c:617 | `SV_Write_Log(CONSOLE_LOG, 0, msg);` | MATCH |
| 0=chat excluded, 1=chat included (polarity) | src/sv_main.c:4145 + level-1 sites | log_level 0 < 1 -> return (suppress); log_level 1 not < 1 -> write | MATCH |
| change applies immediately, even while log open | src/sv_main.c:3902-3904 | `void OnChange_qconsolelogsay_var(...) { logs[CONSOLE_LOG].log_level = Q_atoi(value);` | MATCH |
| no effect unless console log open | src/sv_main.c:4142 | `if (!(logs[sv_log].sv_logfile && *msg)) return;` | MATCH |
| default 0 | src/sv_main.c:96 | `cvar_t qconsole_log_say = {"qconsole_log_say", "0", 0, OnChange_qconsolelogsay_var}` | MATCH |
| no KTX override | ktx/src (grep) | (no match for qconsole_log_say) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Controls whether **players'** in-game chat (say) messages are included in the server's console log file | sv_user.c:1873 (say write, level 1) + sv_main.c:4145 (gate) + sv_main.c:97 (file/comment) | `SV_Write_Log(CONSOLE_LOG, 1, text);` / `if (logs[sv_log].log_level < level) return;` / `// logging "say" and "say_team" messages to the qconsole_PORT.log file` | MATCH (mechanism) / scope NARROW: see clause-1b |
| 1b | scope qualifier "players'" | sv_ccmds.c:1365 (SV_ConSay_f, console `say` cmd) + sv_demo_qtv.c:794 (QTV chat) | `SV_Write_Log(CONSOLE_LOG, 1, text);` (both also level 1) | MISMATCH (under-scoped): the same level-1 gate also covers the server-console `say` command and QTV proxy chat, not only player say |
| 2 | Has no effect unless console logging is already enabled | sv_main.c:4142 | `if (!(logs[sv_log].sv_logfile && *msg)) return;` | MATCH (no open logfile -> nothing written regardless of value) |
| 3 | 0 = chat NOT written; normal console output still IS | sv_main.c:4145 + sv_send.c:160 (Con_Printf, level 0) + sv_user.c:1873 (say, level 1) | gate `log_level < level`; `SV_Write_Log(CONSOLE_LOG, 0, msg);` (normal) vs `...,1,text)` (say) | MATCH (lvl0: say `0<1` skipped; normal `0<0` false -> written) |
| 4 | 1 = chat messages also written | sv_main.c:4145 | `if (logs[sv_log].log_level < level) return;` | MATCH (lvl1: say `1<1` false -> written) |
| 5 | Changing takes effect immediately, even while the log is open | sv_main.c:3902-3904 (OnChange) | `void OnChange_qconsolelogsay_var(...) { logs[CONSOLE_LOG].log_level = Q_atoi(value); }` | MATCH (handler writes log_level on every cvar change, independent of logfile state) |
| 6 | Default: 0 | sv_main.c:96 (decl) + sv_main.c:3459 (plain Cvar_Register) | `cvar_t qconsole_log_say = {"qconsole_log_say", "0", 0, OnChange_qconsolelogsay_var};` | MATCH (registered default "0", flags 0) |
| 7 | Set by: server config / rcon | sv_main.c:96 (flags field = 0, no CVAR_ROM) | `{"qconsole_log_say", "0", 0, ...}` | MATCH (ordinary non-ROM server cvar; no access restriction in code to contradict) |

**V-pass notes:** Oracle confirmed: mvdsv `1.11-53-g18d0362`. Trace discipline applied per enforce-trace-discipline.md.

THE GATE (single enforcing line for all polarity/threshold clauses): sv_main.c:4145 inside SV_Write_Log -- `if (logs[sv_log].log_level < level) return;`. Say messages are emitted with level=1, normal Con_Printf output with level=0. The cvar value flows to `logs[CONSOLE_LOG].log_level` via TWO paths, both verified: (a) OnChange_qconsolelogsay_var sv_main.c:3902-3904 (live, fires on every set -> "immediate effect" clause), and (b) re-read on log open sv_ccmds.c:138 `Cvar_Value("qconsole_log_say")`; on log close sv_ccmds.c:103 forces log_level=0. The "no effect unless logging enabled" clause is independently enforced one line earlier at sv_main.c:4142 (early return when sv_logfile is NULL).

Core mechanism is fully traced and CORRECT -- polarity (0=off/1=on), threshold, default (registered "0"), immediate-effect, and the "normal output still logged" carve-out all map to real enforcing lines with no contradiction.

WHY C-NEAR-MISS (not TRACED-CLEAN): the actor qualifier "players'" in clause 1 under-scopes the gated set. The level-1 CONSOLE_LOG gate covers THREE say/say_team paths, not just player chat: sv_user.c:1873 (player SV_Say), sv_ccmds.c:1365 (SV_ConSay_f -- the server-console/rcon `say` command, registered at sv_ccmds.c:1875), and sv_demo_qtv.c:794 (QTV proxy chat relayed to console). This is the "real code is broader than implied" mirror of the enum's narrower-than-implied case -- a scope clause where the enforcement is real but the description's actor framing is imprecise. The registration comment itself (sv_main.c:97) states the accurate scope: `logging "say" and "say_team" messages`. Suggested tightening: replace "players' in-game chat (say) messages" with "say / say_team chat messages" (covers player say, the server `say` command, and QTV chat).

WHY NOT C-FIX: nothing in the description contradicts the code; every stated behavior is true. WHY NOT WI2-FIX: both metadata clauses (default 0, set-by config/rcon) verified against the registration -- correct.

Minor non-defect note on the 0/1 framing: the gate is `log_level >= level`, so any value >=1 (e.g. "2") would also enable say logging; the description's binary 0/1 presentation matches documented/intended usage and the comment, and does not misstate any traced behavior.

## flags_for_review

- [fyi/other/vpass] Scope-precision: qconsole_log_say's level-1 gate covers 3 say/say_team write-sites (player say sv_user.c:1873; server-console `say` command SV_ConSay_f sv_ccmds.c:1365; QTV proxy chat sv_demo_qtv.c:794), all sharing the single gate at sv_main.c:4145. The proposed 'players'' qualifier names only the first. Registration comment sv_main.c:97 gives the accurate scope ('say' and 'say_team' messages).
- [fyi/other/vpass] Triple-sync of logs[CONSOLE_LOG].log_level worth knowing for any future log-related knob: OnChange (sv_main.c:3904, live), re-read on open (sv_ccmds.c:138), forced-0 on close (sv_ccmds.c:103). The 'immediate effect while open' claim rests specifically on the OnChange path; the open/close paths additionally re-derive it from the cvar. No contradiction among the three for the 0/1 case.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qconsole_log_say",
  "type": "cvar",
  "description": "Controls whether chat (say and say_team) messages are included in the server's console log file. Has no effect unless console logging is already enabled.\n\n0 = chat messages are not written to the console log (normal console output still is).\n1 = chat messages are also written to the console log.\n\nChanging this takes effect immediately, even while the console log is open.\n\nDefault: 0.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:138. qconsole_log_say sets the CONSOLE_LOG channel's message-level threshold, which gates which console-log writes are kept. Threshold-set sites: src/sv_ccmds.c:138 `case CONSOLE_LOG: logs[CONSOLE_LOG].log_level = Cvar_Value(\"qconsole_log_say\");` (applied when the console logfile is opened) and the OnChange handler src/sv_main.c:3902-3904 `logs[CONSOLE_LOG].log_level = Q_atoi(value);` (live update). The gate itself is SV_Write_Log src/sv_main.c:4145 `if (logs[sv_log].log_level < level) return;`. Chat (say) lines are written to CONSOLE_LOG at level 1: src/sv_user.c:1873 (player `say` handler, PRINT_CHAT, after flood-prot), src/sv_ccmds.c:1365 (say broadcast, PRINT_CHAT), src/sv_demo_qtv.c:794 (QTV chat, PRINT_CHAT). Non-chat console output is written at level 0 (src/sv_send.c:160, src/sv_broadcast.c:617) and is therefore ALWAYS kept regardless of this cvar. So 0 -> log_level 0 -> level-1 chat suppressed but level-0 console output retained; 1 -> log_level 1 -> chat also kept. 'Has no effect unless console logging enabled' is enforced because all writes require the logfile open (src/sv_main.c:4142). 'Takes effect immediately' enforced by the OnChange handler. Default `\"0\"` from registration literal src/sv_main.c:96 `cvar_t qconsole_log_say = {\"qconsole_log_say\", \"0\", 0, OnChange_qconsolelogsay_var}`. Set-by: cvar with OnChange but not ROM, registered src/sv_main.c:3459 -> server config / rcon. F-MV1: grep of ktx/src for qconsole_log_say = NONE (engine console-log layer), so this documents live MVDSV behavior.",
  "description_proposed": null
}
```
