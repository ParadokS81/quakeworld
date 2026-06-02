# MVDSV describe-fill -- chunk-8c batch ledger: `spectator-voip-mod-system`

Workflow chunk-runner batch (run `wf_9c1f7021-a2c` / task `wczu88dwm`, 37 agents / ~2.24M tokens).
Third of the chunk-8 split -- the catch-all remainder. MAIN-owned gates recorded here.

- **anchor:** `1.11-53-g18d0362`
- **shape:** cvar (PROVEN) -- **26 knobs** (7 synth groups; 26 reals + 4 canaries V-passed)
- **committed in-scope MVDSV fingerprint:** `5c298ef6d0c0711c3201cf1982a70117` (was `daa50516` after 8b)
- **synthesized-origin mvdsv rows:** 214 -> **240** (DB-verified; +26). cvar `description IS NULL`: 28 -> **2** -- only `sv_antilag` + `sv_antilag_projectiles` remain (OUT/D10). **cvar bucket DONE.**
- **verdicts:** 26 synthesized (0 hedged).

## Recon (live set == plan)

26 cvars: spectator chat/print (sv_spectalk/sv_sayteam_to_spec/sv_specprint), VOIP (sv_voip/_record/_echo),
mod+protocol extensions (sv_pext_mvdsv_serversideweapon/pext_ezquake_verfortrans/sv_mod_msg_file/vip_values/
filterban), progs-debug (sv_debug_antilag/usercmd/weapons), demo-event hooks (serverdemo/sv_silentrecord/
sv_onDemoRemove/sv_onRecordFinish), admin/identity (sv_admininfo/sv_allowlastscores/sv_kicktop/
sv_kickuserinfospamcount/time/sv_default_name/sv_reliable_sound/version).

## HG1 -- canary gate: **PASS** (no re-dispatch, first wave)

4 canaries (3 C-FIX + 1 control), MAIN-ground-truthed. New spectator-themed C-FIX added (sv_spectatormaxspeed).

| canary | groundTruth | got | enforcing line MAIN verified |
|---|---|---|---|
| `sv_spectatormaxspeed` (planted "minimum spectator speed") | C-FIX | C-FIX | sv_phys.c:1127 `movevars.spectatormaxspeed = sv_spectatormaxspeed.value` -- it is the spectator speed CAP, default 500 |
| `allow_download_models` (planted "0=allow") | C-FIX | C-FIX | sv_user.c:1470 value IS the allow flag |
| `sv_gravity` (planted "higher=fall slower") | C-FIX | C-FIX | sv_phys.c:379 higher = falls faster |
| `allow_download_maps` (control) | TRACED-CLEAN | TRACED-CLEAN | sv_user.c:1474, default 1 |

## F-D6a -- source_ref audit: 22/26 literal-clean, 4 fixes

| knob | issue | fix |
|---|---|---|
| `sv_mod_msg_file` | ref `sv_send.c:332` is the downstream consumer (parse_mod_string call), not the knob read | tightened to `src/sv_mod_frags.c:52` (`sv_mod_msg_file_OnChange`, the loader that reads the knob) |
| `sv_onDemoRemove` | C var is lowercase `sv_ondemoremove` (cvar name is camelCase); ref read OK, missing `src/` | `src/sv_demo_misc.c:631` |
| `sv_onRecordFinish` | same camelCase C-var (`sv_onrecordfinish`); missing `src/` | `src/sv_demo_misc.c:228` |
| `sv_pext_mvdsv_serversideweapon` | missing `src/` prefix | `src/sv_init.c:424` |

`sv_admininfo` ref `sv_main.c:3887` is its OnChange handler header (`OnChange_admininfo_var`) -- the enforcing
site for a serverinfo cvar with an OnChange; left as-is.

## HG2 -- cold V-pass flagged 7/26 reals (4 C-FIX + 3 C-NEAR-MISS); ALL confirmed REAL + surgically edited

Heaviest C-FIX count of the campaign (4). All 4 were single defects with clear V-pass fix directions -> surgical
MAIN edits (the core identity/mechanism of each was intact; no fundamentally-broken description -> no seeded
re-synth). All 7 confirmed REAL (zero false positives).

| knob | V-pass | defect (confirmed) | fix |
|---|---|---|---|
| `sv_onDemoRemove` | C-FIX | named trigger commands `rmdemo`/`rmdemonum` do NOT exist -- they are help-text strings only; the real commands are `sv_demoremove`/`sv_demonumremove` (sv_demo.c:1947-1948); also only single-named removal fires it (bulk/wildcard does not) | corrected command names + scoped to single-named removal |
| `sv_reliable_sound` | C-FIX | scope INVERTED -- it is OPT-OUT (sv_send.c:496: reliable for any rsnd != "0", incl. absent), not opt-in | reworded to "all clients in range except those who set rsnd 0" |
| `sv_mod_msg_file` | C-FIX | record is BACKSLASH-delimited not "tab-style" (sv_mod_frags.c:162/170 `%s\\%s\\...`); destination is the MOD frag log (modfraglogfile), a separate log from the plain frag log | "backslash-delimited" + "mod frag log (opened with modfraglogfile)" |
| `sv_specprint` | C-FIX | `sp` does NOT "override" -- sv_specprint is a master AND-gate; the per-client bit can only narrow; and for centerprint/stuffcmd the inner bit checked is the FOLLOWED PLAYER's, not the spectator's (finding #55) | reframed to master-gate + narrowing + the followed-player nuance |
| `sv_debug_usercmd` | C-NEAR-MISS | OFF-state too broad -- a client can still be traced via `sv_usercmdtrace` even at 0 (the gate is an OR, sv_user.c:4936) | added the sv_usercmdtrace carve-out |
| `sv_kickuserinfospamcount` | C-NEAR-MISS | counts EVERY setinfo command, not actual userinfo value changes | "setinfo commands ... whether or not the value actually changes" |
| `sv_sayteam_to_spec` | C-NEAR-MISS | omitted co-equal gate -- delivery to specs also requires the message to carry the `$\` location marker (sv_user.c:1897 `!fake`); a bare say_team is treated as private | added the `$\` location-marker condition |

## Prose spot-check (MAIN)

All 26 reviewed -- concise D20 shape. filterban states both polarities (1=ban-list / 0=allow-list). voip cvars
state .ival gates + the record value-2 nuance. serverdemo + version correctly "Set by: engine (read-only)".
The 4 C-FIX rewrites are accurate to the enforce-trace; sv_specprint's master-gate/followed-player rewrite is
the meatiest but stays in user-doc register.

## Persist + gates

- `--from-ledger` dry-run: 26 parsed / 26 persisted / **0 errors**.
- LIVE: 26 persisted / 0 errors; committed fingerprint `5c298ef6d0c0711c3201cf1982a70117`.
- Idempotency re-run: 0 persisted / **26 skipped-terminal** / same fingerprint -> stable.
- `quality-grid --project mvdsv --family regression`: 116 probes, 115 clean. 2 describe_fill gates + jsonb + all
  mvdsv F1 floor counts PASS. `origin_vocabulary` RED (1266) is the unchanged ktx baseline; mvdsv origins =
  source_inline 991 + synthesized **240**, 0 mvdsv contribution.

## Findings seeded

6 issue-worthy findings (#55-#60), all cites grep-verified against live mvdsv + ktx source (verify-before-write):
- **#55 upstream-bug** -- `sv_specprint` centerprint/stuffcmd check the FOLLOWED player's spec_print bit, not the spectator's (sprint checks the right one; likely copy-paste bug).
- **#56 cross-mod/L3** -- `sv_allowlastscores` gates only the connectionless lastscores/laststats query, not in-game lastscores (cross-ref #27/#28).
- **#57 cross-mod/L3** -- `vip_values` assigns the VIP level, published to *VIP userinfo and consumed by the mod's QC ClientConnect.
- **#58 cross-mod/L3** -- `pext_ezquake_verfortrans` is a cross-engine gate that strips entity-transparency for ezQuake clients below a build revision.
- **#59 upstream-bug** -- `sv_mod_msg_file` parses `id` from the pattern file with no bound, then indexes qw_weapon[]/qw_system[] -> OOB read on a malformed file.
- **#60 dead-suspect** -- `sv_voip_record`/voip: the spectator-hears-tracked-player block is `#if 0`'d out.

Note: the 7 V-pass catches were DESCRIPTION defects, distinct from the engine findings. The spectator-chat
cvars (sv_spectalk/sv_sayteam_to_spec) interact with KTX's say ownership via the PR_ClientSay short-circuit
(reinforces #16). `version` is the legacy read-only version carrier (chunk-7 #39 territory). cvar bucket DONE;
only the 3 command stragglers (say/floodprotmsg/svadmin) remain.
