# describe-fill-synthesis ledger -- mvdsv `sv_serverip`

- **project:** mvdsv
- **knob:** `sv_serverip` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_serverip: synthesized -- server's own public IP for the getrealip client-probe; empty = auto-detect, warns if auto wrong; default empty -- origin=synthesized ref=sv_user.c:230 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Tells the server its own public IP address, used when the server probes a connecting client to learn that client's real IP (the real-IP check controlled by sv_getrealip). The server directs the client to send a small identification packet to this address. If left empty, the server uses the address it auto-detected for itself; when that auto-detected address looks wrong (for example a LAN address behind NAT) and this is empty, the server logs a warning that its detected server IP appears incorrect.
>
> Set this to the server's correct externally-reachable IP when automatic detection picks the wrong address.
>
> Default: empty (use the auto-detected local address).
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| provides server IP, falls back to auto-detected when empty | sv_user.c:230 | `char *server_ip = sv_serverip.string[0] ? sv_serverip.string : NET_AdrToString(net_local_sv_ipadr);` | MATCH |
| used as the address the client is told to probe | sv_user.c:248-250 | `va("packet %s \"ip %d %d\"\ncmd new\n", server_ip, ...)` | MATCH |
| only active during sv_getrealip real-IP check | sv_user.c:228 | `if (... && (int)sv_getrealip.value)` | MATCH |
| auto-detected address source | net.c:1419 | `NET_GetLocalAddress (svs.socketip, &net_local_sv_ipadr);` | MATCH |
| warning when empty and auto address wrong | sv_user.c:234-238 | `... && !sv_serverip.string[0]) { Sys_Printf("WARNING: Incorrect server ip address: ... set correctly sv_serverip cvar.\n", server_ip); ...}` | MATCH |
| default empty | sv_main.c:141 | `cvar_t sv_serverip = {"sv_serverip", ""};` | MATCH |
| set by config/rcon (no flags) | sv_main.c:141,3438 | `{"sv_serverip", ""}` ... `Cvar_Register (&sv_serverip);` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| A | "Tells the server its own public IP address" (role) | src/sv_main.c:141; src/sv_user.c:230 | `cvar_t sv_serverip = {"sv_serverip", ""};` / `char *server_ip = sv_serverip.string[0] ? sv_serverip.string : NET_AdrToString(net_local_sv_ipadr);` | MATCH |
| B | "used when the server probes a connecting client to learn that client's real IP (real-IP check controlled by sv_getrealip)" (scope/gate) | src/sv_user.c:228 | `if (sv_client->state == cs_preconnected && !sv_client->realip.ip[0] && (int)sv_getrealip.value)` -- sv_serverip is read only inside this sv_getrealip-gated block | MATCH |
| C | "directs the client to send a small identification packet to this address" | src/sv_user.c:247-250 (send) -> src/sv_main.c:1887-1894 (receive) | `va("packet %s \"ip %d %d\"\ncmd new\n", server_ip, sv_client - svs.clients, sv_client->realip_num)` ; `if (client->realip_num != Q_atoi(Cmd_Argv(2))) return; ... client->realip = net_from;` | MATCH |
| D | "If left empty, the server uses the address it auto-detected for itself" (OFF-state) | src/sv_user.c:230 -> src/net.c:1419 | `sv_serverip.string[0] ? ... : NET_AdrToString(net_local_sv_ipadr)` ; `NET_GetLocalAddress (svs.socketip, &net_local_sv_ipadr);` | MATCH |
| E | "when auto-detected address is wrong (e.g. behind NAT) and this is empty, the server logs a warning that the IP could not be determined" (side-effect) | src/sv_user.c:232-238 | `if (!((IsLocalIP(local)&&IsLocalIP(remote)) \|\| (IsInetIP(local)&&IsInetIP(remote))) && remote.ip[0]!=127 && !sv_serverip.string[0]) { Sys_Printf("WARNING: Incorrect server ip address: %s\n" "Set hostname ... or set correctly sv_serverip cvar.\n", server_ip);` | MISMATCH (paraphrase) -- gate (class-mismatch AND non-loopback AND sv_serverip empty) and the NAT example are CORRECT; but the message is "Incorrect server ip address", i.e. the detected IP looks inconsistent with the client's address class, NOT "could not be determined" (an address WAS detected). Wording overstates as a detection failure. |
| F | "Set this to the server's correct externally-reachable IP when automatic detection picks the wrong address" (advice) | src/sv_user.c:230, 237 | ternary prefers `sv_serverip.string`; message says `"...or set correctly sv_serverip cvar."` | MATCH |
| G | "Default: empty (use the auto-detected local address)" (WI-2) | src/sv_main.c:141, 3438; src/cvar.h:66-75 | `{"sv_serverip", ""}` (struct order name,string,flags,OnChange,value -> string=""); `Cvar_Register (&sv_serverip);` no override | MATCH |
| H | "Set by: server config / rcon" (settability) | src/sv_main.c:141, 3438 | no flags arg (not CVAR_ROM; the ROM one is sv_local_addr via Cvar_SetROM, a different cvar), no OnChange -> writable normally | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. Enforcing logic is entirely in src/sv_user.c Cmd_New_f (lines 227-262), a DIFFERENT file from registration (sv_main.c:141/3438); I traced the full call chain including the stufftext "packet" send (sv_user.c:247-250) and its receiving handler (sv_main.c:1887-1894 SVC_Verify_RealIP-style path that sets client->realip = net_from), plus net_local_sv_ipadr provenance (net.c:1419 NET_GetLocalAddress = genuinely auto-detected) and the IsLocalIP/IsInetIP class helpers (sv_user.c:112-120).

CLASSIFICATION: C-NEAR-MISS. Seven of eight clauses MATCH their enforcing lines, including all polarity/gate/default/settability claims. The single defect is clause E's characterization of the warning side-effect. The gate is correct (address-class mismatch AND remote!=127 AND sv_serverip empty), and "behind NAT" is a correct concrete instance of the mismatch (private local + public remote). But the description says the warning is that "the IP could not be determined", whereas the actual Sys_Printf says "Incorrect server ip address: <ip>" with the address printed -- the engine DID auto-detect an address; it is flagging that the detected address is inconsistent with the connecting client's class (private-vs-public), not that detection failed. This is a flavour-C-adjacent paraphrase: the clause was shaped toward a plausible meaning ("could not be determined") rather than the message's actual meaning ("the detected IP looks wrong"). It is an imprecision, not a contradiction (the warning genuinely does fire under the stated empty+wrong-address condition), so C-NEAR-MISS rather than C-FIX. Suggested tighten: "...the server logs a warning that its detected IP address appears incorrect (inconsistent with the connecting client) and advises setting sv_serverip."

No WI-2 metadata defect: default empty and normal (config/rcon) settability both verified at the registered cvar_t, not inferred. No untraceable behavioral clause (not WI2-FIX). Not C-FIX: no clause contradicts its enforcing line.

## flags_for_review

- [fyi/other/vpass] Warning-branch fallback behavior (sv_user.c:239-240): when the address-class-mismatch warning fires, the server immediately accepts the netchan/proxy remote address as realip (`*(int *)&sv_client->realip = *(int *)&sv_client->netchan.remote_address;`) and promotes state to cs_connected -- i.e. it abandons the real-IP probe and trusts the proxy-visible address. The proposed description does not claim otherwise (so not a defect), but this fallback is adjacent behavior an operator might expect documented: setting sv_serverip correctly is what KEEPS the server in the probe path rather than this give-up path.
- [fyi/other/vpass] Asymmetry worth noting for any sibling sv_getrealip row: sv_getrealip==2 path (sv_user.c:253-256) sends 'Failed to validate client's IP.' and sets rip_vip=2 only after timeout/retry exhaustion -- a stricter mode than the default 1. sv_serverip feeds the probe destination for both modes identically; no sv_serverip-specific branch on the getrealip value. Confirms clause B's coupling is value-agnostic (any nonzero sv_getrealip enables the block).

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_serverip",
  "type": "cvar",
  "description": "Tells the server its own public IP address, used when the server probes a connecting client to learn that client's real IP (the real-IP check controlled by sv_getrealip). The server directs the client to send a small identification packet to this address. If left empty, the server uses the address it auto-detected for itself; when that auto-detected address looks wrong (for example a LAN address behind NAT) and this is empty, the server logs a warning that its detected server IP appears incorrect.\n\nSet this to the server's correct externally-reachable IP when automatic detection picks the wrong address.\n\nDefault: empty (use the auto-detected local address).\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:230. Enforcing read-sites in Cmd_New_f realip path, all gated by `sv_getrealip.value` being set (sv_user.c:228 `if (sv_client->state == cs_preconnected && !sv_client->realip.ip[0] && (int)sv_getrealip.value)`). (1) sv_user.c:230 `char *server_ip = sv_serverip.string[0] ? sv_serverip.string : NET_AdrToString(net_local_sv_ipadr);` -- when set, sv_serverip is the address used; when empty, falls back to net_local_sv_ipadr (the auto-detected local server address, set at net.c:1419 NET_GetLocalAddress). (2) server_ip is the destination the client is told to probe: sv_user.c:248-250 `MSG_WriteString(..., va(\"packet %s \\\"ip %d %d\\\"\\ncmd new\\n\", server_ip, ...))` -- a stuffcmd making the client send an 'ip' identification packet back to that address (this is how the server learns the client's real IP). (3) empty-string guard at sv_user.c:234 `&& !sv_serverip.string[0]` -> sv_user.c:236-238 Sys_Printf(\"WARNING: Incorrect server ip address: %s\\nSet hostname in your operation system or set correctly sv_serverip cvar.\\n\") when the local/inet classification of the auto address fails AND sv_serverip is unset. Default: registered cvar_t literal `{\"sv_serverip\", \"\"}` (sv_main.c:141) -> empty; empty triggers the auto-detect fallback (traced). Set-by: plain cvar_t no flags (sv_main.c:141), registered sv_main.c:3438 -> server config / rcon. The cross-engine consequence (a client acts on the stuffcmd) is the mechanism, but the admin-action-relevant fact (set it to the correct external IP when auto-detect fails) is what the warning string itself instructs, so kept inline. No KTX override (grep empty).",
  "description_proposed": null
}
```
