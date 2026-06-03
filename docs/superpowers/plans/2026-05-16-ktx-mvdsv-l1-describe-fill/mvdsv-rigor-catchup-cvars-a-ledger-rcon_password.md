# describe-fill-synthesis ledger -- mvdsv `rcon_password`

- **project:** mvdsv
- **knob:** `rcon_password` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:rcon_password: synthesized -- password for normal/admin rcon (restricted vs master); empty disables rcon; enforced at the Rcon_Validate admin branch + empty-string guard -- origin=synthesized ref=src/sv_main.c:1708 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the password for normal (admin) remote console access. A remote client that authenticates with this password may run server commands over rcon, but is blocked from a set of dangerous operations (file removal/listing, chmod, log control, sv_admininfo, and toggling rcon encryption) -- those require the higher master rcon password instead.
>
> An empty value disables normal rcon entirely: no client can authenticate against it.
>
> Default: empty (normal rcon disabled).
> Set by: server config / rcon.
> See also: rcon_password, spectator_password, vip_password, password.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| gates normal/admin rcon auth | src/sv_main.c:1708 | `else if (Rcon_Validate (remote_command, rcon_password.string))` | MATCH |
| success = admin command path | src/sv_main.c:1710 | `admin_cmd = true;` | MATCH |
| empty value disables rcon (OFF-state) | src/sv_main.c:1572-1574 | `if (!strlen(password1)) { return 0; }` | MATCH |
| default empty | src/sv_main.c:71 | `cvar_t rcon_password = {"rcon_password", ""};` | MATCH |
| restricted vs master (dangerous cmds blocked) | src/sv_main.c:1754-1768 | blocklist sets `bad_cmd = true` for rm/chmod/log/sv_crypt_rcon/... | MATCH |
| refusal of blocklisted cmd | src/sv_main.c:1774 | `do_cmd = !bad_cmd;` | MATCH |
| value compared/hashed, never printed | src/sv_main.c:1602,1613 | `SHA1_Update(...password1)` / `strcmp(Cmd_Argv(1), password1)` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Default: empty | src/sv_main.c:71 + :3443 | `cvar_t rcon_password = {"rcon_password", ""};` ... `Cvar_Register (&rcon_password);` | MATCH — registered default is empty string, no flags/OnChange. SERVERONLY path is live (CMakeLists.txt:169 defines SERVERONLY). |
| 2 | Empty value disables normal rcon; no client can authenticate against it (OFF-state) | src/sv_main.c:1572-1574 | `if (!strlen(password1)) { return 0; }` | MATCH — Rcon_Validate returns 0 for empty password before any comparison; the `else if (Rcon_Validate(..., rcon_password.string))` at :1708 can never set admin_cmd when empty. |
| 3 | Scope: this is the "normal (admin)" password (distinct from master) | src/sv_main.c:1701 vs :1708 | `if (Rcon_Validate (remote_command, master_rcon_password)) {...} else if (Rcon_Validate (remote_command, rcon_password.string)) { admin_cmd = true; ...}` | MATCH — two distinct password buffers; rcon_password feeds the `admin_cmd=true` branch, master_rcon_password feeds the unrestricted branch. |
| 4 | Authenticated client may run server commands over rcon | src/sv_main.c:1799-1828 | `if (do_cmd) {...} Cmd_ExecuteString(str);` | MATCH — successful admin auth (no ban, no bad_cmd) sets do_cmd → command is executed. |
| 5 | Normal rcon is BLOCKED from a dangerous set; those require master rcon instead | src/sv_main.c:1747-1770 (filter only on admin_cmd branch) + :1701-1706 (master branch sets do_cmd with NO filter) | blocklist loop sets `bad_cmd = true` for matching tokens, then `do_cmd = !bad_cmd;` (:1774). Master branch at :1701-1706 sets `do_cmd = true` directly, bypassing the filter. | MATCH on the core assertion. See notes: the enumerated examples are a STRICT SUBSET of the real blocklist (3 tokens omitted). |
| 5a | Blocked: file removal/listing | src/sv_main.c:1754-1756 | `!strcasecmp(tstr, "rm") || !strcasecmp(tstr, "rmdir") || !strcasecmp(tstr, "ls")` | MATCH |
| 5b | Blocked: chmod | src/sv_main.c:1757 | `!strcasecmp(tstr, "chmod")` | MATCH |
| 5c | Blocked: log control | src/sv_main.c:1763 | `!strncasecmp(tstr, "log", 3)` | MATCH (prefix match — any token starting "log"). |
| 5d | Blocked: sv_admininfo | src/sv_main.c:1758 | `!strcasecmp(tstr, "sv_admininfo")` | MATCH |
| 5e | Blocked: toggling rcon encryption | src/sv_main.c:1761-1762 | `!strcasecmp(tstr, "sv_crypt_rcon") || !strcasecmp(tstr, "sv_timestamplen")` | MATCH (sv_crypt_rcon = encryption toggle; sv_timestamplen = its timestamp validity window). |
| 5f | (OMITTED by description) Blocked: if / localcommand / sys_command_line | src/sv_main.c:1759, :1760, :1764 | `!strcasecmp(tstr, "if") ... !strcasecmp(tstr, "localcommand") ... !strcasecmp(tstr, "sys_command_line")` | NOT REPRESENTED in the description's example list. Real blocklist is broader (safe direction — normal rcon is more restricted, not less). |
| 6 | "master rcon password" is a real, higher-privilege thing | src/sv_main.c:46, :1634, :1701 | `char master_rcon_password[128] = "";` ... `Rcon_Validate (client_string, master_rcon_password)` | MATCH — separate 128-byte buffer; settable only in server.cfg (sv_ccmds.c:1797-1807 SV_MasterPassword_f guards on host_everything_loaded / server_cfg_done). |
| 7 | Set by: server config / rcon | src/sv_main.c:71 (no OnChange, no CVAR_ROM) | `cvar_t rcon_password = {"rcon_password", ""};` | MATCH — plain cvar, no set-restriction; settable wherever a cvar can be set (config, console, rcon). Contrast master_rcon_password which IS config-only. |
| 8 | See also: spectator_password / vip_password / password (+ self) | src/sv_main.c:72, :102, :103 | `password`, `spectator_password`, `vip_password` all declared as real cvars | MATCH — peers exist. Note: list redundantly includes rcon_password itself (self-reference). |

**V-pass notes:** CLASSIFICATION: TRACED-CLEAN. Every material clause (default, OFF-state, normal-vs-master scope, command-execution, blocked-set + master-required, provenance, see-also) maps to a located enforcing line in src/sv_main.c and matches that line's code and adjacent comments. The central trace site is SVC_RemoteCommand (sv_main.c:1687-1866) with the validator Rcon_Validate (:1564-1617); the registration/default is :71 + :3443; the master-password set-restriction is sv_ccmds.c:1797-1807.

ONE IMPRECISION (kept as TRACED-CLEAN, flagged FYI, not C-NEAR-MISS): the blocked-operations parenthetical lists "file removal/listing, chmod, log control, sv_admininfo, and toggling rcon encryption" but the actual blocklist (sv_main.c:1754-1764) ALSO blocks three more tokens for normal rcon: `if`, `localcommand`, and `sys_command_line`. Why this is still TRACED-CLEAN rather than C-NEAR-MISS: (a) the enforcing line EXISTS and the listed items all MATCH it (no name/string/enum inference — the failure mode the discipline targets); (b) the clause is framed as "a set of dangerous operations (...)", i.e. illustrative not exhaustive; (c) the real blocklist is BROADER than stated, so the error is in the SAFE direction — it does not overstate what normal rcon is permitted to do, only understates how much is blocked. C-NEAR-MISS in the discipline is reserved for "the real code is NARROWER / more conditional than implied" or a clause with no enforcing site; this is the opposite (real code is broader, fully enforced). If the operator wants completeness, add `if`, `localcommand`, `sys_command_line` to the parenthetical.

WI2 (metadata) checks both pass: Default verified against the REGISTERED cvar (`{"rcon_password", ""}` -> empty), not a shipped cfg. "Set by" verified against the absence of any OnChange/CVAR_ROM on rcon_password (contrast master_rcon_password's explicit server.cfg-only guard) -- the "server config / rcon" provenance is correct and the asymmetry with master is real.

Build path confirmed live: rcon_password's registration is inside `#ifdef SERVERONLY` (the client build takes the `extern` branch at :75). MVDSV defines SERVERONLY (CMakeLists.txt:169), so the empty-default registration is the runtime-reachable path -- not dead.

## flags_for_review

- [fyi/hidden-family/synthesis] master_rcon_password is a sibling rcon credential not in this chunk's set: it is a COMMAND (registered SV_MasterPassword_f at sv_ccmds.c:1902), settable only in server.cfg (sv_ccmds.c:1804-1806 `master_rcon_password can be set only in server.cfg`), and grants unrestricted rcon (sv_main.c:1701) vs rcon_password's restricted set. Worth a paired L1 entry / cross-link if not already present.
- [fyi/other/vpass] The normal-rcon blocked-command filter (sv_main.c:1747-1770) only inspects the FIRST non-empty token: the loop `for (i = 2; i < Cmd_Argc(); i++)` skips leading empty tokens but executes an unconditional `break;` at :1769 after the first non-empty token. So the block is shallow by design (the comment at :1743-1745 notes this would still be vulnerable to semicolons if they were re-enabled, but semicolons are disabled). This is below the description's altitude and does not contradict it, but the operator should know the block is per-first-token, not a deep scan of the whole command line.
- [fyi/other/vpass] The description omits the IP-ban interaction: even with a correct rcon_password, SV_FilterPacket() (sv_main.c:1711) on a banned IP forces bad_cmd/banned and refuses execution (and triggers SV_SendBan at :1855). Not a contradiction -- an unstated additional gate. Could be worth a one-clause mention if the operator wants the auth picture complete.
- [fyi/other/vpass] The 'See also' list includes rcon_password itself (self-reference) alongside spectator_password / vip_password / password. Cosmetic redundancy only; the three real peers all exist as cvars (sv_main.c:72, :102, :103).

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "rcon_password",
  "type": "cvar",
  "description": "Sets the password for normal (admin) remote console access. A remote client that authenticates with this password may run server commands over rcon, but is blocked from a set of dangerous operations (file removal/listing, chmod, log control, sv_admininfo, and toggling rcon encryption) -- those require the higher master rcon password instead.\n\nAn empty value disables normal rcon entirely: no client can authenticate against it.\n\nDefault: empty (normal rcon disabled).\nSet by: server config / rcon.\nSee also: rcon_password, spectator_password, vip_password, password.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:1708. Enforcing read-site: src/sv_main.c:1708 `else if (Rcon_Validate (remote_command, rcon_password.string))` is the normal/admin-rcon authentication branch; on success it sets `admin_cmd = true` (1710) and runs the command unless it hits the blocklist. OFF-state enforced in the validator: src/sv_main.c:1572-1574 `if (!strlen(password1)) { return 0; }` -- an empty rcon_password makes Rcon_Validate always return 0, so normal rcon cannot authenticate (rcon disabled). Default empty verified at the registered literal src/sv_main.c:71 `cvar_t rcon_password = {\"rcon_password\", \"\"};` (registered sv_main.c:3443). Privilege split: the master_rcon_password branch (1701) grants unrestricted access; the rcon_password (admin) branch is restricted by the blocklist at sv_main.c:1747-1770 -- tokens rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line set `bad_cmd=true` so `do_cmd = !bad_cmd` (1774) refuses them. Both branches share the SHA1 crypto path (sv_main.c:1576-1611) when sv_crypt_rcon is on. Sensitive: the value is only ever compared (strcmp at 1613 / hashed into SHA1 at 1602), never printed -- description must not imply it is displayed; it is not. Set-by: rcon_password is NOT on the rcon blocklist, so it can be changed via server config or rcon -> 'server config / rcon' (this is the cvar; the separate master_rcon_password command at sv_ccmds.c:1804-1806 is server.cfg-only, but that is a different entity). F-MV1: grep of ktx/src finds no rcon_password override; rcon auth is engine-only.",
  "description_proposed": null
}
```
