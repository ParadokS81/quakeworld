# MVDSV describe-fill -- chunk-8 tail batch ledger: `command-stragglers`

Workflow chunk-runner batch (run `wf_3926e000-787` / task `wvd1kv1px`, 6 agents / ~0.40M tokens).
The final chunk-8 piece -- the 3 command stragglers deferred since chunk 4. **Command bucket DONE after this.**

- **anchor:** `1.11-53-g18d0362`
- **shape:** command -- **3 knobs** (1 synth group; 3 reals + 2 canaries V-passed)
- **committed in-scope MVDSV fingerprint:** `5e94a76983ed72c28be135eef609e838` (was `5c298ef6` after 8c)
- **synthesized-origin mvdsv rows:** 240 -> **243** (DB-verified; +3). Remaining mvdsv `description IS NULL`: now **only `sv_antilag` + `sv_antilag_projectiles`** (2 cvars, OUT/D10). command bucket 108/108 evaluated.
- **verdicts:** 2 synthesized (say, floodprotmsg) + 1 hedged (svadmin -- dead Rcon Watch).

## HG1 -- canary gate: **PASS** (no re-dispatch, first wave)

2 command canaries (1 C-FIX access-class + 1 control), MAIN-ground-truthed.

| canary | groundTruth | got | enforcing line MAIN verified |
|---|---|---|---|
| `addip` (planted "any connected player can issue; Set by: any client") | C-FIX | C-FIX | SV_AddIP_f Cmd_AddCommand-only (sv_main.c:3617), NOT in ucmds[] -> admin-only; the no-client-path negative re-verified |
| `quit` (verbatim-correct "shuts down + exits; console/rcon" -- control) | TRACED-CLEAN | TRACED-CLEAN | SV_Quit_f -> SV_Quit(false) (sv_ccmds.c:1876), admin-only |

The addip canary tests the command access-class NEGATIVE (no client path) -- the worker caught the over-claim.

## F-D6a -- source_ref audit: 3/3 clean

| knob | ref | reads/enforces |
|---|---|---|
| `say` | src/sv_ccmds.c:1347 | the broadcast loop (`SV_ClientPrintf2(client, PRINT_CHAT, ...)`) |
| `floodprotmsg` | src/sv_user.c:1858 | the consumer (`if (fp_msg[0]) ... "FloodProt: %s"`) |
| `svadmin` | src/sv_main.c:1672 | `WatcherId = cl` (the handler's only effect) |

## HG2 -- cold V-pass: say C-FIX (2 defects, surgical); floodprotmsg + svadmin clean

| knob | V-pass | outcome |
|---|---|---|
| `say` | C-FIX | 2 defects, both surgically fixed: C6 "recorded in the console log" is UNCONDITIONAL in prose but SV_Write_Log(CONSOLE_LOG,1,...) (sv_ccmds.c:1365) is gated by qconsole_log_say + logfile-open -> reworded "written to the console log only when console logging is enabled (see qconsole_log_say)"; C2 "every connected player" overstates -> the loop skips state != cs_spawned (sv_ccmds.c:1349) -> "every spawned (in-game) player". The unconditional server-console print (Sys_Printf :1364) is correct and kept. Dual-access (console SV_ConSay_f vs player Cmd_Say_f) correctly captured. |
| `floodprotmsg` | TRACED-CLEAN | clean -- correct custom-silence-message behavior + the empty->built-in fallback + worked example + See also: floodprot. No edit. |
| `svadmin` | TRACED-CLEAN | the description is a correct HEDGE -- svadmin sets a "Rcon Watch" pointer (WatcherId) that NO code consumes (dead feature, finding #61); the hedge states it has no observable effect beyond the console confirmation. No edit. |

## Persist + gates

- `--from-ledger` dry-run: 3 parsed / 3 persisted / **0 errors**.
- LIVE: 3 persisted / 0 errors; committed fingerprint `5e94a76983ed72c28be135eef609e838`.
- Idempotency re-run: 0 persisted / **3 skipped-terminal** / same fingerprint -> stable.
- `quality-grid --project mvdsv --family regression`: 116 probes, 115 clean. 2 describe_fill gates + jsonb + all
  mvdsv F1 floor counts (incl. command 108/108) PASS. `origin_vocabulary` RED (1266) unchanged ktx baseline;
  mvdsv origins = source_inline 991 + synthesized 243, 0 mvdsv contribution.

## Findings seeded

1 issue-worthy finding (#61), cite grep-verified:
- **#61 dead-suspect** -- `svadmin`'s Rcon Watch (WatcherId) is set but read by no rcon-forwarding path -> the feature is non-functional (vestigial QW262-era). L1 row hedged.

## Chunk 8 campaign COMPLETE

All 79 in-scope cvars (8a 26 + 8b 27 + 8c 26) + the 3 command stragglers filled across 4 runner runs. cvar
bucket DONE, command bucket DONE. Only `sv_antilag*` (D10) remain NULL by design. 21 findings total (#41-#61).
Fingerprint chain: 2333be4d (post-ch7) -> b64a5ca2 -> daa50516 -> 5c298ef6 -> 5e94a76983ed72c28be135eef609e838.
