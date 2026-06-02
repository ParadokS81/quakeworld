# describe-fill-synthesis ledger -- mvdsv `telnet_log_level`

- **project:** mvdsv
- **knob:** `telnet_log_level` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `hedged` -- medium confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:telnet_log_level: hedged -- sets the TELNET_LOG channel verbosity threshold (OnChange src/sv_main.c:3899; gate src/sv_main.c:4145) but NO SV_Write_Log(TELNET_LOG,...) caller exists tree-wide, so the telnet log is never written and the setting has no observable effect; document-as-live runtime-dead-suspect, C1-routed -- origin=synthesized ref=src/sv_main.c:3899 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Intended to set the detail level for the server's telnet log channel: only messages at or below this level would be written to that log. In the current source no message is ever sent to the telnet log channel, so this setting has no observable effect on a running server.
>
> 0 = lowest verbosity (the registered default).
> Higher values = would admit more-detailed messages, if any were written.
>
> Default: 0.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 0 + OnChange-wired | src/sv_main.c:87 | `cvar_t telnet_log_level = {"telnet_log_level", "0", 0, OnChange_telnetloglevel_var};` | MATCH |
| sets TELNET_LOG channel threshold | src/sv_main.c:3899 | `logs[TELNET_LOG].log_level = Q_atoi(value);` | MATCH |
| threshold re-applied on logfile open | src/sv_ccmds.c:135 | `logs[TELNET_LOG].log_level = Cvar_Value("telnet_log_level");` | MATCH |
| higher level admits more messages (threshold semantics) | src/sv_main.c:4145 | `if (logs[sv_log].log_level < level) return;` in SV_Write_Log | MATCH |
| no observable effect: TELNET_LOG channel is never written | sv_*.c (exhaustive grep) | `grep -rho 'SV_Write_Log([A-Z_]*'` -> no `SV_Write_Log(TELNET_LOG` exists; only CONSOLE/ERROR/FRAG/PLAYER/RCON_LOG (+commented MOD_FRAG_LOG) | MATCH (absence) |
| Set-by engine (no KTX override) | ktx/src (grep) | grep telnet_log_level in ktx/src = empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | "set the detail level for the server's telnet log channel: only messages at or below this level would be written" | sv_main.c:3899 (store) + sv_main.c:4145 (gate) | `logs[TELNET_LOG].log_level = Q_atoi(value);` ... `if (logs[sv_log].log_level < level) return;` | MATCH -- value is parsed into the TELNET channel's log_level; SV_Write_Log skips when log_level < msg level, i.e. writes iff msg level <= log_level ("at or below this level"). |
| 2 | "In the current source no message is ever sent to the telnet log channel" | (absence) exhaustive grep of all SV_Write_Log / SV_LogPlayer call sites | No `SV_Write_Log(TELNET_LOG, ...)` and no SV_LogPlayer->TELNET anywhere; all log writes target CONSOLE/ERROR/RCON/FRAG/MOD_FRAG/PLAYER. SV_LogPlayer hardcodes PLAYER_LOG (sv_main.c:4119). | MATCH -- verified by absence: zero writers of TELNET_LOG. |
| 3 | "this setting has no observable effect on a running server" | sv_main.c:4145 (sole reader of logs[TELNET_LOG].log_level) | `if (logs[sv_log].log_level < level) return;` | MATCH -- the only consumer of the stored value is this gate, reachable only when sv_log==TELNET_LOG, which no call site produces; so the value gates nothing at runtime. |
| 4 | "0 = lowest verbosity (the registered default)" | sv_main.c:4145 + sv_main.c:87 | `if (logs[sv_log].log_level < level) return;` ... `cvar_t telnet_log_level = {"telnet_log_level", "0", 0, OnChange_telnetloglevel_var};` | MATCH -- log_level=0 admits only level<=0 msgs (lowest); cvar_t default field literal is "0". |
| 5 | "Higher values = would admit more-detailed messages, if any were written" | sv_main.c:4145 | `if (logs[sv_log].log_level < level) return;` | MATCH -- a higher log_level admits messages of higher `level` numbers; polarity correct (conditional framing "if any were written" is accurate given clause 2). |
| 6 | "Default: 0" (WI-2 registered-default) | sv_main.c:87 | `cvar_t telnet_log_level = {"telnet_log_level", "0", 0, ...}` | MATCH -- registered default literal is "0"; confirmed against the cvar_t initializer, not a shipped cfg. |
| 7 | "Set by: server config / rcon" | sv_main.c:87 (flags field = 0) | `{"telnet_log_level", "0", 0, OnChange_telnetloglevel_var}` | MATCH -- flags field is 0 (no CVAR_ROM/serverinfo); normally settable via config/rcon. No SetROM/flag-mutation anywhere. |

**V-pass notes:** TRACED-CLEAN. Every material clause (polarity, threshold direction, OFF/no-effect, default, settability) maps to a located, verified enforcing line, including the central "no observable effect" claim which is confirmed by an exhaustive absence-of-writer trace.

Oracle confirmed: mvdsv `git describe --tags` == 1.11-53-g18d0362.

Trace chain:
- Registration: sv_main.c:87 `cvar_t telnet_log_level = {"telnet_log_level", "0", 0, OnChange_telnetloglevel_var}` -> registered sv_main.c:3456. Default "0", flags 0 (settable).
- OnChange (the value's enforcement): sv_main.c:3897-3900 -> `logs[TELNET_LOG].log_level = Q_atoi(value);`. Sets ONLY the telnet channel (no cross-channel side effect; the adjacent OnChange_qconsolelogsay_var at :3902-3905 is a SEPARATE handler for qconsole_log_say -- not wired to this cvar).
- Re-assert on log-file open: sv_ccmds.c:134-135 re-reads the cvar into log_level when `logtelnet` opens the file.
- Q_atoi (bothtools.c): standard decimal/hex string-to-int; stores the literal integer.
- Sole consumer of the stored threshold: sv_main.c:4137 SV_Write_Log -> :4145 `if (logs[sv_log].log_level < level) return;` (write iff msg level <= log_level).
- WRITERS of TELNET_LOG: NONE. Exhaustive grep of every SV_Write_Log(...) and SV_LogPlayer(...) call site (and SV_LogPlayer's hardcoded PLAYER_LOG at sv_main.c:4119) shows zero calls passing TELNET_LOG. The gate at :4145 is therefore never reached with sv_log==TELNET_LOG, so the cvar's value gates nothing observable at runtime. The proposed "no observable effect" is correct.

WI-2 default: registered default verified at the cvar_t initializer literal ("0"), not a shipped cfg -> "Default: 0" is correct. Settability: flags field literal 0, no CVAR_ROM / Cvar_SetROM / serverinfo treatment anywhere -> "Set by: server config / rcon" correct.

Minor (non-defect) phrasing observations, both still-true and traceable, so they do NOT move the row off TRACED-CLEAN:
- The proposed text's two threshold framings ("messages at or below this level" in clause 1, "higher values admit more-detailed messages" in clause 5) are the same gate viewed from both directions and both match `log_level < level -> skip`.
- The struct-literal logs[TELNET_LOG] entry (sv_ccmds.c:222) carries an initial log_level field of 0, but that is a C initializer, not the cvar default; the description correctly attributes the default to the registered cvar, not the struct literal.

## flags_for_review

- [review/runtime-dead-suspect/synthesis] telnet_log_level is registered (src/sv_main.c:87) with a working OnChange handler that sets logs[TELNET_LOG].log_level (src/sv_main.c:3899), and the value is re-applied when a telnet logfile is opened (src/sv_ccmds.c:135). But an exhaustive census of every SV_Write_Log() first-argument tree-wide finds NO `SV_Write_Log(TELNET_LOG, ...)` caller -- the TELNET_LOG channel is never written. The threshold therefore gates a log that does not exist; the cvar has no observable runtime effect. The companion `telnet` command (SV_TelnetLogfile_f -> SV_Logfile(TELNET_LOG,...), src/sv_ccmds.c:182) opens the file but nothing ever writes to it. Registered-but-effect-unreachable (runtime-dead-suspect / candidate upstream dead code). HEDGED + document-as-live per F-C3b (this is not a Phase-0 suspect-pool member, so not dead-stamped); flagged for a human/upstream look.
- [fyi/runtime-dead-suspect/vpass] telnet_log_level is a runtime-dead cvar: it is registered, settable, has a working OnChange + threshold gate, but NO code path ever calls SV_Write_Log(TELNET_LOG, ...) anywhere in src, so the telnet log channel is never written and the cvar has no observable runtime effect. This is a genuine vestigial/dead feature (bliP-era telnet logging, log.h (C) 2004), not a bug in the description. The proposed description correctly documents it as a no-effect setting. Flagging for awareness in case the fleet wants a consistent 'runtime-dead / vestigial' marker across such knobs.
- [fyi/off-scope-entity/vpass] The TELNET_LOG channel is fully wired EXCEPT for writers: it has a console command `logtelnet` (sv_ccmds.c:222 + SV_TelnetLogfile_f sv_ccmds.c:180), a file prefix `qtelnet_`, on/off messages, and the cvar threshold -- an operator can open the telnet log file and set its level, and nothing will ever be written to it. If a future mvdsv version adds a telnet console/feed, these hooks would activate; today the whole TELNET_LOG path is dormant. Off-scope to telnet_log_level itself but relevant if the logtelnet command is also being described.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "telnet_log_level",
  "type": "cvar",
  "description": "Intended to set the detail level for the server's telnet log channel: only messages at or below this level would be written to that log. In the current source no message is ever sent to the telnet log channel, so this setting has no observable effect on a running server.\n\n0 = lowest verbosity (the registered default).\nHigher values = would admit more-detailed messages, if any were written.\n\nDefault: 0.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "hedged",
  "description_confidence": "medium",
  "description_reasoning": "primary source_ref src/sv_main.c:3899. HEDGED (runtime-dead-suspect, document-as-live per F-C3b -- NOT dead-stamped, since this is a registered+OnChange-wired cvar, not a Phase-0 suspect-pool member). Source-legible part: the cvar writes a threshold into the TELNET_LOG channel. Registration + default \"0\" and OnChange wiring: src/sv_main.c:87 `cvar_t telnet_log_level = {\"telnet_log_level\", \"0\", 0, OnChange_telnetloglevel_var};`; the handler src/sv_main.c:3899 `logs[TELNET_LOG].log_level = Q_atoi(value);` (also re-applied when the telnet logfile is opened, src/sv_ccmds.c:135 `logs[TELNET_LOG].log_level = Cvar_Value(\"telnet_log_level\");`). The threshold semantics are the generic SV_Write_Log gate at src/sv_main.c:4145 `if (logs[sv_log].log_level < level) return;` -- a message of priority `level` is written only when the channel's log_level >= level, hence higher cvar = more messages admitted. NOT source-legible (the hedge): the effect never manifests because there is no producer. Exhaustive census of every SV_Write_Log(...) call site (grep of `SV_Write_Log([A-Z_]*` tree-wide) yields only CONSOLE_LOG, ERROR_LOG, FRAG_LOG, PLAYER_LOG, RCON_LOG, and (all commented-out) MOD_FRAG_LOG -- there is NO `SV_Write_Log(TELNET_LOG, ...)` caller anywhere, so the TELNET_LOG channel is never written and the threshold gates nothing observable. No KTX override (grep of ktx/src = empty); Set-by the MVDSV engine: server config / rcon. Routed to C1 outreach as a runtime-dead-suspect, not dead-stamped.",
  "description_proposed": null
}
```
