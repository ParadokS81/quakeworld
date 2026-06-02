# MVDSV describe-fill -- chunk-8b batch ledger: `networking-rate-download-logging`

Workflow chunk-runner batch (run `wf_69f2d3de-22d` / task `w9eom7peo`, 38 agents / ~2.22M tokens).
Second of the chunk-8 split. MAIN-owned gates (F-D6a, HG1/HG2, prose spot-check, persist) recorded here.

- **anchor:** `1.11-53-g18d0362`
- **shape:** cvar (PROVEN) -- **27 knobs** (7 synth groups; 27 reals + 4 canaries V-passed)
- **committed in-scope MVDSV fingerprint:** `daa5051622773b9638568d0554752ef6` (was `b64a5ca2` after 8a)
- **synthesized-origin mvdsv rows:** 187 -> **214** (DB-verified; +27). cvar `description IS NULL`: 55 -> **28** (in-scope remainder 26 for 8c; the 2 `sv_antilag*` stay OUT/D10).
- **verdicts:** 26 synthesized + 1 hedged (`telnet_log_level` -- dead telnet log, no observable effect).

## Recon (live set == plan)

27 cvars: download remainder (allow_download_skins/sounds/demos/pakmaps), rate/throttle (sv_maxrate/
sv_maxdownloadrate/sv_maxuploadsize/sv_downloadchunksperframe), ping-gate (sv_minping/sv_maxping/
sv_enable_cmd_minping), logging (sv_maxlogsize/sv_logdir/sv_timestamplen/frag_log_type/qconsole_log_say/
sys_command_line/telnet_log_level), net-addr/debug (sv_local_addr/sv_serverip/showdrop/showpackets),
system (fs_cache/sv_idlesleep/sys_nostdout/sys_restart_on_error), + sv_reconnectlimit. This folds the
download cluster 4/8 remainder (skins/sounds/demos/pakmaps) -> download cluster now 8/8 DONE.

## HG1 -- canary gate: **PASS** (no re-dispatch, first wave)

4 canaries (3 C-FIX + 1 control), MAIN-ground-truthed. allow_download (master) C-FIX is on-axis for the
download set (polarity of the master gate).

| canary | groundTruth | got | enforcing line MAIN verified |
|---|---|---|---|
| `allow_download` (planted "1 disables all downloads; 0 allows") | C-FIX | C-FIX | sv_user.c:1459 `else if (!(int)allow_download.value) allow_dl = false;` -- 0 disables, not 1 |
| `allow_download_models` (planted "0 = allow, 1 = block") | C-FIX | C-FIX | sv_user.c:1470 value IS the allow flag (1=allow) |
| `sv_gravity` (planted "higher = fall more slowly") | C-FIX | C-FIX | sv_phys.c:379 higher gravity = falls faster |
| `allow_download_maps` (verbatim-correct control) | TRACED-CLEAN | TRACED-CLEAN | sv_user.c:1474, default 1 |

## F-D6a -- source_ref audit: 25/27 literal-clean, 5 fixes

Every source_ref printed from live source. 25 read/set their knob literally. 2 cite an enforcing line via a
local alias / OnChange body (both legitimate), plus 4 had a missing `src/` prefix -> 5 ref fixes:

| knob | issue | fix |
|---|---|---|
| `sv_maxping` | ref `sv_user.c:185` is `if (maxping && playerping > maxping)` (local alias `maxping`); the knob is READ at :182 `int maxping = Q_atof(sv_maxping.string)` | tightened to `src/sv_user.c:182` |
| `sv_reconnectlimit` | missing `src/` prefix (`sv_main.c:1123`) | `src/sv_main.c:1123` |
| `sv_serverip` | missing `src/` prefix (`sv_user.c:230`) | `src/sv_user.c:230` |
| `sv_timestamplen` | missing `src/` prefix (`sv_main.c:1595`) | `src/sv_main.c:1595` |
| `sys_command_line` | missing `src/` prefix (`sv_main.c:3469`) | `src/sv_main.c:3469` |

`telnet_log_level` ref `sv_main.c:3899` is the OnChange body (`logs[TELNET_LOG].log_level = Q_atoi(value)`) --
correct enforcing line for the hedged dead cvar; left as-is.

## HG2 -- cold V-pass flagged 9/27 reals (2 C-FIX + 7 C-NEAR-MISS); ALL confirmed REAL + surgically edited

Re-grepped each contested clause both directions. **All 9 confirmed REAL** (zero false positives). Both C-FIX
were single-clause defects with clear localized fixes -> surgical MAIN edits (no seeded re-synth; chunk-1..8a
practice -- re-synth is for fundamentally-broken descriptions, not one-clause corrections).

| knob | V-pass | defect (confirmed) | fix |
|---|---|---|---|
| `sv_idlesleep` | C-FIX | OFF-state "it busy-loops while idle" is wrong -- the dedicated loop ALWAYS does a `NET_Sleep`/select() wait (sys_select_timeout ~10 ms) regardless; sv_idlesleep is ADDITIONAL sleep | "no extra idle sleep is added; the server still does its normal short per-frame network wait, so it does not pin the CPU" |
| `sv_local_addr` | C-FIX | "on the public interface" is wrong -- it is the OS-local/hostname address (often LAN/RFC1918 behind NAT); sv_serverip is the explicit public override | reworded to auto-detected local address + NAT note + See also: sv_serverip |
| `allow_download_skins` | C-NEAR-MISS | "clients fall back to a default skin" is client-side, no mvdsv enforcing line | dropped the client-side clause |
| `allow_download_pakmaps` | C-NEAR-MISS | "only has inside a copy-protected pak" -- the gate (sv_user.c:1556 VFS_COPYPROTECTED) keys on which searchpath OPENED the handle, not exclusivity | "a map file that it opened from a copy-protected pak" |
| `qconsole_log_say` | C-NEAR-MISS | "players' chat (say)" under-scopes -- the level-1 gate also covers say_team, the console `say` command, and QTV chat | "chat (say and say_team) messages" |
| `sv_maxping` | C-NEAR-MISS | "each client only checked once" -- maxping_met caches only on PASS (sv_user.c:190); a rejected client is re-checked on retry | "once a client's ping passes it is not re-checked, but a client rejected for high ping is re-checked if it tries to join again" |
| `sv_maxuploadsize` | C-NEAR-MISS | "remote" scope = rcon/remote `snap` (local-console snap is exempt); "discarded" overstates (SV_CancelUpload leaves the partial .pcx on disk) | named the rcon/remote snap trigger + local-console exemption; "cancelled (partial file left on disk)" |
| `sv_serverip` | C-NEAR-MISS | warning is "Incorrect server ip address" (detected IP looks wrong), not "could not be determined" (an address WAS detected) | "logs a warning that its detected server IP appears incorrect" |
| `sys_command_line` | C-NEAR-MISS | "empty only if started with no arguments" -- argv[0] (exe path) is always present, so effectively never empty | "registered empty; the engine fills it at startup ... in practice never empty (the executable path is always present)" |

## Prose spot-check (MAIN)

All 27 reviewed -- concise D20 shape. Download per-type cvars correctly route the master-switch/techlogin
precedence to See-also. Rate/ping cvars state units (bytes/sec, ms) + what 0 means. telnet_log_level is a clean
hedge (states the intended level semantics + that it has no observable effect, the dead telnet log). No bloat;
the 9 HG2 edits + 5 ref fixes were the only changes.

## Persist + gates

- `--from-ledger` dry-run: 27 parsed / 27 persisted / **0 errors**.
- LIVE: 27 persisted / 0 errors; committed fingerprint `daa5051622773b9638568d0554752ef6`.
- Idempotency re-run: 0 persisted / **27 skipped-terminal** / same fingerprint -> stable.
- `quality-grid --project mvdsv --family regression`: 116 probes, 115 clean. 2 describe_fill gates +
  `jsonb_columns_not_strings` + all mvdsv F1 floor counts PASS. `origin_vocabulary` RED (1266 = 633x2) is the
  unchanged ktx `recast_v2` baseline; mvdsv origins = source_inline + synthesized (214) only, 0 mvdsv.

## Findings seeded

6 issue-worthy findings appended to `mvdsv-describe-fill-findings.md` (#49-#54), all cites grep-verified against
live mvdsv + ktx source (verify-before-write):
- **#49 cross-mod/L3** -- KTX overwrites `sv_maxrate` (clamps to <=500000, writes back; world.c:1560/1749-1751).
- **#50 cross-mod/L3** -- KTX reads `sv_local_addr` for stats/frag/race upload identity (stats.c:559, logs.c:100, race.c:186).
- **#51 security** -- `sys_command_line` exposes the full launch line (may contain secrets); only console/master-rcon can read (cross-ref #20).
- **#52 upstream-bug** -- `sv_maxuploadsize`: SV_CancelUpload leaves the partial .pcx on disk (no unlink).
- **#53 dead-suspect** -- `telnet_log_level` gates a never-written log (no SV_Write_Log(TELNET_LOG) caller; cross-ref #19).
- **#54 upstream-bug** -- net_chan.c:245 `chan->fatal_error = true; //FIXME: THIS DOES NOTHING` (self-documented dead write; surfaced via showpackets).

Note: the C-FIX/C-NEAR-MISS above were DESCRIPTION defects fixed at persist, NOT engine findings. sys_nostdout
confirmed LIVE on the unix dedicated build (refutes the chunk-1 #7 concern for unix; the Windows `_CONSOLE`
build-variant nuance stands). Download cluster now 8/8 DONE.
