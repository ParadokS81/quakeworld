# describe-fill-synthesis ledger -- mvdsv `sv_admininfo`

- **project:** mvdsv
- **knob:** `sv_admininfo` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_admininfo: synthesized -- publishes/removes the *admin serverinfo contact string; settable via config or master rcon, blocked for normal rcon (finding #20) -- origin=synthesized ref=src/sv_main.c:3887 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the server administrator's contact information, which the server then publishes in its server info for clients and server browsers to display. Setting it to a non-empty value publishes that text as the admin contact; setting it to empty removes the admin contact entry.
>
> Default: empty (no admin contact published).
> Set by: server config, or rcon using the master rcon password. It is blocked for normal (non-master) rcon, so an admin using the ordinary rcon password cannot change it.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| non-empty value => publish as *admin serverinfo | src/sv_main.c:3890 | `Info_SetValueForStarKey (svs.info, "*admin", value, MAX_SERVERINFO_STRING);` | MATCH |
| empty value => remove *admin key | src/sv_main.c:3892 | `Info_RemoveKey (svs.info, "*admin");` | MATCH |
| empty/non-empty branch condition | src/sv_main.c:3889 | `if (value[0])` | MATCH |
| default empty + OnChange wired | src/sv_main.c:121 | `cvar_t sv_admininfo = {"sv_admininfo", "", 0, OnChange_admininfo_var};` | MATCH |
| master rcon: no blocklist (full access) | src/sv_main.c:1701-1706 | `if (Rcon_Validate (remote_command, master_rcon_password)) ... do_cmd = true;` | MATCH |
| normal rcon: blocklist path entered | src/sv_main.c:1708-1710 | `else if (Rcon_Validate (remote_command, rcon_password.string)) { admin_cmd = true;` | MATCH |
| sv_admininfo blocked for normal rcon | src/sv_main.c:1758,1767 | `!strcasecmp(tstr, "sv_admininfo") || ... bad_cmd = true;` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Sets the server administrator's contact information | src/sv_main.c:121, :3887-3893 | `cvar_t sv_admininfo = {"sv_admininfo", "", 0, OnChange_admininfo_var};` ... OnChange writes the value to `"*admin"` key | MATCH (free-text string; `*admin` key + `//bliP: admininfo` comment confirm contact-info intent) |
| 2 | server publishes it in server info for clients AND server browsers to display | src/sv_main.c:3890 (write) -> :629 (SVC_Status to browsers) + src/sv_user.c:484 (fullserverinfo to clients) | `Info_SetValueForStarKey (svs.info, "*admin", value, ...)`; SVC_Status: `Con_Printf ("%s\n", svs.info)`; sv_user.c:484: `va("fullserverinfo \"%s\"\n", svs.info)` | MATCH (svs.info = serverinfo sent to clients on connect AND returned to qplug/qspy browsers via out-of-band status query) |
| 3 | non-empty value publishes that text as the admin contact | src/sv_main.c:3889-3890 | `if (value[0]) Info_SetValueForStarKey (svs.info, "*admin", value, MAX_SERVERINFO_STRING);` | MATCH |
| 4 | empty removes the admin contact entry | src/sv_main.c:3891-3892 (+ common.c:949 Info_RemoveKey) | `else Info_RemoveKey (svs.info, "*admin");` -- Info_RemoveKey memmove-splices the key out | MATCH |
| 5 | Default: empty (no admin contact published) | src/sv_main.c:121 | `{"sv_admininfo", "", 0, OnChange_admininfo_var}` -- registered default is "" (empty string -> else branch -> no key) | MATCH (registered default, not a cfg-drift value) |
| 6 | Set by: server config, or rcon using the master rcon password | src/sv_main.c:3547 (register, flags=0 no ROM) + :1701-1707 (master path) + sv_ccmds.c:1797-1807 (master pw is server.cfg-only) | `if (Rcon_Validate (remote_command, master_rcon_password)) { ... do_cmd = true; }` -- master path sets do_cmd with NO bad_cmd scan -> Cmd_ExecuteString (:1828) | MATCH |
| 7 | blocked for normal (non-master) rcon | src/sv_main.c:1708-1710, :1758, :1767, :1774, :1860-1861 | `else if (Rcon_Validate (remote_command, rcon_password.string)) { admin_cmd = true; ...` then `!strcasecmp(tstr, "sv_admininfo")` -> `bad_cmd = true`; `do_cmd = !bad_cmd`; admin_cmd path prints `"Command not valid."` and does NOT execute | MATCH |
| 8 | an admin using the ordinary rcon password cannot change it | src/sv_main.c:1708 (rcon_password.string == ordinary/admin pw) + :1774 (do_cmd false) | same restricted-scan path as clause 7; ordinary rcon = `rcon_password.string` (`admin_cmd`), command suppressed | MATCH (restatement of clause 7, accurate) |

**V-pass notes:** CLASSIFICATION: TRACED-CLEAN. Every material clause (semantic, default, OFF-state side-effect, set-scope, access-class block) maps to a located, verified enforcing line with matching code + adjacent comments. No flavour-C inference: the access-class block clause (the highest-risk clause, per WI-2) was traced through the actual SVC_RemoteCommand dispatch (sv_main.c:1687-1866), NOT inferred from the var name.

Oracle version confirmed: `git describe --tags` == 1.11-53-g18d0362.

KEY TRACE -- the two-tier rcon control flow (sv_main.c, SVC_RemoteCommand):
- Line 1701: `Rcon_Validate(remote_command, master_rcon_password)` valid -> `do_cmd = true` directly (only gated by SV_FilterPacket ban check). NO bad_cmd scan on this path -> sv_admininfo executes.
- Line 1708: `else if Rcon_Validate(remote_command, rcon_password.string)` -> `admin_cmd = true`, then the restricted-command token scan (1747-1770) sets `bad_cmd = true` when token == "sv_admininfo" (strcasecmp, line 1758). `do_cmd = !bad_cmd` (1774) -> false -> "Command not valid." (1861), command never reaches Cmd_ExecuteString.
- master_rcon_password is settable ONLY in server.cfg (SV_MasterPassword_f, sv_ccmds.c:1797-1807: guarded by `!server_cfg_done` / `!host_everything_loaded`), and Rcon_Validate returns 0 for an empty password -- so the unrestricted path requires an operator-configured master password. This makes the description's "master rcon password" vs "ordinary rcon password" distinction precise and correct.

The full-tree grep (only 3 functional use-sites: registration :121/:3547, the rcon block-list :1758, the OnChange :3887) confirms there is NO other gate, reader, or write path for sv_admininfo or the `*admin` serverinfo key. No untraced callees remain.

WI-2 default check: registered default is "" at sv_main.c:121 (the cvar_t initializer's 2nd field; struct order name/string/flags/OnChange confirmed via cvar.h:66-75). Not a shipped-cfg value. PASS.

## flags_for_review

- [fyi/other/synthesis] sv_admininfo is on the normal-rcon blocklist (src/sv_main.c:1758), alongside sv_crypt_rcon, sv_timestamplen, sys_command_line, log*, localcommand, if, and filesystem cmds (rm/rmdir/ls/chmod). This confirms the finding #20 cluster: a set of cvars/commands deliberately denied to normal (rcon_password) rcon and allowed only via master_rcon_password / config. Worth a human look as a coherent 'master-rcon-only' access tier if that finding is being consolidated.
- [fyi/other/vpass] sv_admininfo carries flags=0 (sv_main.c:121) -- it does NOT set CVAR_SERVERINFO (cvar.h:62, the auto-mirror-to-serverinfo flag). Serverinfo publication is done MANUALLY inside OnChange_admininfo_var, which writes the special `*admin` star-key rather than a plain key. The proposed description says 'the server then publishes in its server info' without claiming a mechanism, so it stays accurate -- flagging only because a reader who assumes CVAR_SERVERINFO auto-mirroring would be wrong about HOW it is published (it is the handler, into `*admin`, not the flag).
- [fyi/other/vpass] The block-list scan at sv_main.c:1747-1770 only inspects the FIRST non-empty token (the `break;` at line 1769 exits the for-loop after the first non-empty argument). This means the block on sv_admininfo for ordinary rcon relies on sv_admininfo being the leading token. The comment block at 1718-1745 documents that this list exists to defend against macro-expansion exploits ($coop . *), and Cmd_ExpandString is run first (line 1725) so an expanded leading token is what gets checked. Not a defect in the description (clause 7/8 remain true for the normal `rcon sv_admininfo ...` form), but the single-leading-token scope is a real structural property of the block that a deeper write-up of the protection might need to qualify.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_admininfo",
  "type": "cvar",
  "description": "Sets the server administrator's contact information, which the server then publishes in its server info for clients and server browsers to display. Setting it to a non-empty value publishes that text as the admin contact; setting it to empty removes the admin contact entry.\n\nDefault: empty (no admin contact published).\nSet by: server config, or rcon using the master rcon password. It is blocked for normal (non-master) rcon, so an admin using the ordinary rcon password cannot change it.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3887. Enforcing behavior is the OnChange handler OnChange_admininfo_var src/sv_main.c:3887-3893: if value[0] (non-empty) it writes the value into the serverinfo *admin star-key via Info_SetValueForStarKey(svs.info, \"*admin\", value, ...) (:3890); else it removes the key via Info_RemoveKey(svs.info, \"*admin\") (:3892). So the cvar's observable effect is publishing/removing the *admin serverinfo contact string. Registered default empty with the OnChange callback at src/sv_main.c:121 (cvar_t sv_admininfo = {\"sv_admininfo\", \"\", 0, OnChange_admininfo_var}). Access restriction (Set-by): in SV_Rcon-style handling, master_rcon_password auth (src/sv_main.c:1701-1706) sets do_cmd with no blocklist; normal rcon_password auth (src/sv_main.c:1708-1710) takes the blocklist path where the expanded/tokenized command is scanned and 'sv_admininfo' as any token sets bad_cmd=true (src/sv_main.c:1758 inside the comment-marked 'normal rcon can't use these commands' block at :1740-1768). Hence settable via config or master rcon, blocked via normal rcon -- finding #20 territory (normal-rcon blocklist). No KTX override of this engine serverinfo key.",
  "description_proposed": null
}
```
