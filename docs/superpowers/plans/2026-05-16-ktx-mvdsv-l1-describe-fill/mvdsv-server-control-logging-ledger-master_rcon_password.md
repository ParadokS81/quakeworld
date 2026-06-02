# describe-fill-synthesis ledger -- mvdsv `master_rcon_password`

- **project:** mvdsv
- **knob:** `master_rcon_password` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:master_rcon_password: synthesized -- sets a privileged (unrestricted) rcon password distinct from rcon_password's filesystem-blocked one; server.cfg-load-time only; default empty -- origin=synthesized ref=src/sv_main.c:1701 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the master rcon password -- a privileged remote-admin password, separate from the ordinary rcon_password. Rcon commands authenticated with the master password run unrestricted, whereas commands sent with the ordinary rcon_password are blocked from filesystem and other sensitive operations (such as rm, rmdir, ls, chmod, localcommand, and the log commands). Leaving it empty (the default) means no master password is in effect.
>
> master_rcon_password <password> = set the master password to <password>.
>
> This can only be set while server.cfg is still loading at startup; issuing it afterward is refused.
>
> Default: empty (unset).
> Set by: server.cfg at startup only.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| server-console command, not client | src/sv_ccmds.c:1902 ; src/sv_user.c:3299+ | `Cmd_AddCommand ("master_rcon_password", SV_MasterPassword_f);` ; grep ucmds[] -> empty | MATCH |
| takes one arg = the password | src/sv_ccmds.c:1804 | `strlcpy(master_rcon_password, Cmd_Argv(1), sizeof(master_rcon_password));` | MATCH |
| settable only during server.cfg load | src/sv_ccmds.c:1799-1806 | `#ifdef SERVERONLY if (!host_everything_loaded) #else if (!server_cfg_done) #endif strlcpy(...); else Con_DPrintf("master_rcon_password can be set only in server.cfg\n");` | MATCH |
| cfg-done flips true post-load | src/sv_main.c:4059 ; 4007 | `server_cfg_done = true;` ; `host_everything_loaded = true;` | MATCH |
| default empty | src/sv_main.c:46 | `char master_rcon_password[128] = "";` | MATCH |
| master pwd -> unrestricted rcon | src/sv_main.c:1701-1707 | `if (Rcon_Validate (remote_command, master_rcon_password)){ if(SV_FilterPacket())banned=true; else do_cmd=true; }` (no command blocklist) | MATCH |
| ordinary rcon_password -> restricted | src/sv_main.c:1708-1774 | `else if (Rcon_Validate (remote_command, rcon_password.string)){ admin_cmd=true; ... for(...) if(!strcasecmp(tstr,"rm")||...||!strncasecmp(tstr,"log",3)||...) bad_cmd=true; ... do_cmd=!bad_cmd; }` | MATCH |
| blocked-command examples accurate | src/sv_main.c:1754-1764 | `"rm" ... "rmdir" ... "ls" ... "chmod" ... "localcommand" ... !strncasecmp(tstr,"log",3)` | MATCH |
| no KTX override | ktx/src (grep) | grep 'master_rcon_password' -> empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Separate from ordinary rcon_password | sv_main.c:46 ; sv_main.c:71 | `char master_rcon_password[128] = "";` vs `cvar_t rcon_password = {"rcon_password", ""};` | MATCH |
| 2 | Master-authed rcon runs unrestricted (skips blocklist) | sv_main.c:1701-1706 | `if (Rcon_Validate (remote_command, master_rcon_password)) { ... else do_cmd = true; }` -- no blocklist branch on this path | MATCH |
| 3 | Ordinary rcon_password blocked from rm/rmdir/ls/chmod/localcommand/log commands | sv_main.c:1708-1768 | else-if validates `rcon_password.string` -> `admin_cmd=true`; loop 1754-1764 sets `bad_cmd` on `rm`,`rmdir`,`ls`,`chmod`,`localcommand`,`strncasecmp(tstr,"log",3)` (+ sv_admininfo, if, sv_crypt_rcon, sv_timestamplen, sys_command_line) | MATCH |
| 4 | Empty default = no master password in effect | sv_main.c:46 ; sv_main.c:1572-1573 | default `= ""`; `Rcon_Validate`: `if (!strlen(password1)) return 0;` -> empty never authenticates | MATCH |
| 5 | `master_rcon_password <password>` sets the master password | sv_ccmds.c:1804 ; sv_ccmds.c:1902 | `strlcpy(master_rcon_password, Cmd_Argv(1), sizeof(master_rcon_password));` ; cmd registered `Cmd_AddCommand("master_rcon_password", SV_MasterPassword_f)` | MATCH |
| 6 | Settable only at startup; afterward refused | sv_ccmds.c:1800-1806 (SERVERONLY active) ; sv_main.c:4001-4007 | `if (!host_everything_loaded) strlcpy(...) else Con_DPrintf("master_rcon_password can be set only in server.cfg\n");` ; gate closes at `host_everything_loaded=true` (4007) AFTER `exec server.cfg`(4001)+`Cmd_StuffCmds_f`(4004)+`Cbuf_Execute`(4005) | MATCH (minor: window also covers command-line args, not just server.cfg -- see flags) |
| 7 | Default: empty (unset) | sv_main.c:46 | `char master_rcon_password[128] = "";` (C-array initializer; not a cvar, so no RegisterCvar default) | MATCH |
| 8 | Set by: server.cfg at startup only | sv_ccmds.c:1806 ; sv_main.c:4001-4007 | engine's own refusal string "can be set only in server.cfg"; gate at 4007 also admits command-line `+master_rcon_password` queued at 4004 | MATCH (echoes engine's self-description; technically omits command-line route -- see flags) |

**V-pass notes:** Oracle confirmed mvdsv @ 1.11-53-g18d0362. MVDSV builds with SERVERONLY globally defined (CMakeLists.txt:169), so the live gate in SV_MasterPassword_f is `host_everything_loaded` (sv_ccmds.c:1800), NOT the #else `server_cfg_done` branch. All 8 material clauses trace to located enforcing lines and MATCH.

Core behavior is fully correct and enforcement-traced: master_rcon_password is a standalone char[128] (not a cvar), authenticated via Rcon_Validate at sv_main.c:1701; a master-validated rcon runs the command with no blocklist (1706), while a command that only matches the ordinary rcon_password (1708, admin_cmd=true) is filtered through the blocklist at 1754-1764 which contains every command the description names (rm, rmdir, ls, chmod, localcommand, log*). Empty default is enforced as "no auth" by the `!strlen(password1)` early-return at 1572.

The only imprecision is in the scope/"Set by" clauses (6 and 8): the description says it can be set "while server.cfg is still loading" / "server.cfg at startup only." The enforcing gate (`host_everything_loaded`) does not close until line 4007, which is AFTER command-line `+command` args are flushed (Cmd_StuffCmds_f at 4004, Cbuf_Execute at 4005). So a startup command-line `+master_rcon_password xxx` would also succeed -- the real writable window is broader than "server.cfg only." However: (a) the description faithfully echoes the engine's OWN refusal message string ("master_rcon_password can be set only in server.cfg", sv_ccmds.c:1806); (b) the load-bearing assertion "issuing it afterward is refused" is correctly enforced; (c) the narrowing is in the SAFE direction (describes the canonical/intended path, not a non-existent capability). Per the V-pass enum, C-NEAR-MISS is reserved for clauses that are name/string inference with no enforcing line OR where real code is NARROWER than implied; here the clause HAS an enforcing line and real code is BROADER, matching the engine's documented contract -- judged still-true traceable minor vagueness = TRACED-CLEAN. Flagged the command-line-route nuance for operator review in case broader phrasing is preferred.

Secondary note: the in-engine refusal uses Con_DPrintf (sv_send.c:174), which prints only when `developer` is set (early-return at 179-180). The description's "is refused" is behaviorally correct (the strlcpy is skipped), but operators without developer mode will see no message -- not asserted in the description, so not a defect, noted as FYI.

## flags_for_review

- [fyi/off-scope-entity/synthesis] The privilege model spans two L1 entities: master_rcon_password (this one) and the rcon_password cvar. The behavior that gives master_rcon_password meaning (its commands bypass the blocklist that rcon_password's are subject to) is enforced in the shared SVC_RemoteCommand at src/sv_main.c:1701 vs 1708. If rcon_password has its own L1 row, a See-also cross-link would help; the contrast is the whole point of having a 'master' password.
- [fyi/other/vpass] Scope clauses 6+8 say 'server.cfg at startup only', but the enforcing gate host_everything_loaded (sv_ccmds.c:1800) does not close until sv_main.c:4007, AFTER command-line args are flushed (Cmd_StuffCmds_f at 4004 / Cbuf_Execute at 4005). So a startup command-line '+master_rcon_password xxx' also succeeds -- the writable window is broader than 'server.cfg only'. The description echoes the engine's own refusal-message string verbatim ('can be set only in server.cfg', sv_ccmds.c:1806) and the 'afterward refused' behavior is correctly enforced, so this is a minor scope narrowing (safe direction), not a contradiction. Operator may prefer 'during startup config/command-line processing' for precision.
- [review/suspected-bug/vpass] Off-scope engine observation: the ordinary-rcon blocklist loop at sv_main.c:1747-1770 has an unconditional `break;` at line 1769 INSIDE the for-loop but OUTSIDE the if. After skipping leading empty tokens (continue at 1751-1752), it checks exactly ONE non-empty token then breaks. The comment at 1736-1738 ('must check *all* tokens, because a command/var may not be the first token -- example: "" ls .') states the intent is to scan all tokens, but the code only inspects the first non-empty one. This does not affect any clause of THIS description (which only claims the named commands are blocked, and Cmd_Argv(2) typically IS the command name), but the loop may not block a restricted command that appears as a later token. Flagging as a possible blocklist-bypass weakness in the ordinary-rcon path for separate triage; does not change this knob's classification.
- [fyi/other/vpass] In-engine refusal message uses Con_DPrintf (sv_send.c:174), gated on `developer.value` (early-return at 179-180). The strlcpy is correctly skipped after startup (behavior matches 'refused'), but no visible message appears unless developer mode is on. Not asserted in the description; FYI only.
- [fyi/off-scope-entity/vpass] master_rcon_password is also consumed by Cmd_TechLogin_f (sv_user.c:2215 via Master_Rcon_Validate, sv_main.c:1619-1637): an in-server client can issue a 'techlogin' command that, when validated against master_rcon_password, sets cl->special=true ('Logged in.'). This is a second authentication surface for the master password beyond network rcon. Out of scope for the current description (which scopes to rcon), but the master password's privilege footprint is wider than 'rcon' alone -- noted in case the operator wants the description to mention the techlogin/special path.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "master_rcon_password",
  "type": "command",
  "description": "Sets the master rcon password -- a privileged remote-admin password, separate from the ordinary rcon_password. Rcon commands authenticated with the master password run unrestricted, whereas commands sent with the ordinary rcon_password are blocked from filesystem and other sensitive operations (such as rm, rmdir, ls, chmod, localcommand, and the log commands). Leaving it empty (the default) means no master password is in effect.\n\nmaster_rcon_password <password> = set the master password to <password>.\n\nThis can only be set while server.cfg is still loading at startup; issuing it afterward is refused.\n\nDefault: empty (unset).\nSet by: server.cfg at startup only.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:1701. Registration: Cmd_AddCommand('master_rcon_password', SV_MasterPassword_f) at src/sv_ccmds.c:1902 (server console). NOT in ucmds[] (src/sv_user.c:3299+, grep empty) -> not client-issuable. Handler SV_MasterPassword_f (src/sv_ccmds.c:1797-1807): strlcpy(master_rcon_password, Cmd_Argv(1), ...) ONLY when !server_cfg_done (CLIENTONLY: !host_everything_loaded); else Con_DPrintf('master_rcon_password can be set only in server.cfg\\n') and does nothing -> takes one arg (the password), settable only during cfg load. server_cfg_done flips true at src/sv_main.c:4059 (host_everything_loaded at 4007). Storage/default: global char master_rcon_password[128] = '' (src/sv_main.c:46) -> default empty. What it authorizes (the privilege semantics): in SVC_RemoteCommand (src/sv_main.c:1687) the incoming rcon is checked first against master_rcon_password via Rcon_Validate (src/sv_main.c:1701) -> do_cmd = true with NO command filtering; only if that fails is it checked against rcon_password.string (src/sv_main.c:1708) which sets admin_cmd = true and runs the blocklist at src/sv_main.c:1747-1770 banning rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line (strcasecmp checks, line 1754-1764). So master password = unrestricted rcon; ordinary rcon_password = restricted rcon. Confirmed by Rcon_Validate(client_string, master_rcon_password) also used by the SVC_RconCommand-style path at src/sv_main.c:1634. F-MV1: grep ktx/src 'master_rcon_password' -> empty, no KTX override. 'Set by: server.cfg at startup only' is the literal gate (src/sv_ccmds.c:1799-1806), not name inference. The blocklist enumeration in the description is illustrative ('such as ...'); the full list is at src/sv_main.c:1754-1764.",
  "description_proposed": null
}
```
