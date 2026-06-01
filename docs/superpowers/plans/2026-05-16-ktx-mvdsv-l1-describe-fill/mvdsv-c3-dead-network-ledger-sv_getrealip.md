# describe-fill-synthesis ledger -- mvdsv `sv_getrealip`

- **project:** mvdsv
- **knob:** `sv_getrealip` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `c3-dead-network` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_getrealip: synthesized -- 0 off / 1 probe-but-allow / 2 probe-and-refuse-on-failure for discovering a client's real IP behind proxy/NAT, used for VIP-by-real-IP matching; default 1 -- origin=synthesized ref=src/sv_user.c:228 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether the server tries to discover a connecting client's real IP address when the client is behind a proxy or address translation, so the server's IP-based checks (VIP entries and IP bans/penalties) see the client's true address rather than the proxy's. During connect the server bounces a small probe back to the client (retried a few times) to learn that address.
>
> 0 = off; do not probe, accept the address the client connects from.
> 1 = probe for the real IP, but let the client connect anyway if the probe fails.
> 2 = probe for the real IP and refuse the connection if it cannot be validated.
>
> Default: 1.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 1 | src/sv_main.c:140 | `cvar_t	sv_getrealip = {"sv_getrealip", "1"};` | MATCH |
| 0 = off (block gated on truthy value) | src/sv_user.c:228 | `if (sv_client->state == cs_preconnected && !sv_client->realip.ip[0] && (int)sv_getrealip.value)` | MATCH |
| probe: stuff ip-request packet back to client, retried | src/sv_user.c:244-250 | `if (sv_client->realip_count++ < 10) { ... MSG_WriteString(... va("packet %s \"ip %d %d\"\ncmd new\n", ...)); }` | MATCH |
| retry budget ~3s / 10 tries | src/sv_user.c:252 | `if (SV_ClientConnectedTime(sv_client) > 3 || sv_client->realip_count > 10) {` | MATCH |
| discovered real IP used for VIP matching | src/sv_user.c:269 | `if ((sv_client->vip = SV_VIPbyIP(sv_client->realip)) == 0)` | MATCH |
| 2 = refuse on validation failure (set rip_vip, print) | src/sv_user.c:253-255 | `if ((int)sv_getrealip.value == 2) { Netchan_OutOfBandPrint(... "Failed to validate client's IP."...); sv_client->rip_vip = 2; }` | MATCH |
| rip_vip client dropped/refused | src/sv_user.c:471-473 | `if (sv_client->rip_vip) ... SV_LogPlayer(sv_client, va("dropped %d", sv_client->rip_vip), 1);` | MATCH |
| 1 = connect anyway on failure | src/sv_user.c:257 | `sv_client->state = cs_connected;` (failure branch, no rip_vip set here) | MATCH |
| set by config (registration) | src/sv_main.c:3436 | `Cvar_Register (&sv_getrealip);` | MATCH |
| no KTX consumer | ktx/src (grep) | (no match for sv_getrealip) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Controls whether server tries to discover a client's real IP behind a proxy/NAT | sv_user.c:228 | `if (sv_client->state == cs_preconnected && !sv_client->realip.ip[0] && (int)sv_getrealip.value)` | MATCH (gate fires only when value != 0; server.h:360 comment "client's ip, not latest proxy's") |
| 2 | Used for matching VIP entries keyed to a real IP | sv_user.c:269,285-286 + sv_main.c:2722-2733 | `(sv_client->vip = SV_VIPbyIP(sv_client->realip))`; `SV_VIPbyIP` scans `ipvip[]` | MATCH (VIP-by-IP list `ipvip[]`, fed by vip_addip/vip_ip.cfg) |
| 3 | ...and ADMIN entries keyed to a real IP | (none) | no IP-keyed admin table; admin = rcon password (sv_main.c:1804) or QVM `mod_admin` field (sv_main.c:2522); `AF_REAL_ADMIN` is "pass/vip granted admin", not IP-keyed | UNTRACEABLE (over-broadening of "VIP" -> "VIP/admin"; no enforcing read-site) |
| 4 | During connect, server bounces a small probe back to the client | sv_user.c:247-250 | `MSG_WriteString(... va("packet %s \"ip %d %d\"\ncmd new\n", server_ip, sv_client - svs.clients, sv_client->realip_num))` | MATCH (stuffs a `packet ... ip <num> <token>` back; client replies via SVC_IP, sv_main.c:1869-1900) |
| 5 | ...retried a few times | sv_user.c:244,252 | `if (sv_client->realip_count++ < 10)` ... `if (... || sv_client->realip_count > 10)` | MATCH (bounded retries, up to ~10; "a few" is loose but not wrong) |
| 6 | 0 = off; do not probe, accept the connecting address | sv_user.c:228 | gate `&& (int)sv_getrealip.value` is false at 0 -> whole probe block skipped; realip stays unset, client proceeds on netchan address | MATCH (value 0 disables the entire probe path) |
| 7 | 1 = probe, but let client connect anyway if probe fails | sv_user.c:252-258 (value==1 falls through) | timeout sets `sv_client->state = cs_connected` with NO `rip_vip` assignment for value 1; downstream `if (sv_client->rip_vip)` drop (449,471-475) is skipped | MATCH (failed probe in mode 1 -> rip_vip stays 0 -> no drop) |
| 8 | 2 = probe and refuse connection if it cannot be validated | sv_user.c:253-256 + 471-475 | `if ((int)sv_getrealip.value == 2) { Netchan_OutOfBandPrint(... "Failed to validate client's IP." ...); sv_client->rip_vip = 2; }` then `if (sv_client->rip_vip) { SV_LogPlayer(... "dropped" ...); SV_DropClient(sv_client); return; }` | MATCH (value 2 + failed/timed-out probe -> rip_vip=2 -> SV_DropClient) |
| 9 | Default: 1 | sv_main.c:140 (registered 3436) | `cvar_t sv_getrealip = {"sv_getrealip", "1"};` ; `Cvar_Register (&sv_getrealip);` | MATCH (registered default string "1") |
| 10 | Set by: server config / rcon | sv_main.c:140 + Cvar_Register | plain server cvar, no CVAR_USERINFO/locked flags; settable via console/config/rcon | MATCH (ordinary server cvar) |

**V-pass notes:** Polarity, thresholds, default, OFF-state, and the probe/retry/drop side-effects all trace cleanly to enforcing lines. The control flow: gate at sv_user.c:228 (any non-zero enters the probe block); probe stuffed at 247-250 (client replies via SVC_IP at sv_main.c:1869-1900, which sets cl->realip = net_from); after timeout (>3s connected OR realip_count>10) value==2 prints "Failed to validate" and sets rip_vip=2 (255), value==1 simply connects with no rip_vip; downstream rip_vip-truthy clients are SV_DropClient'd at sv_user.c:474. Verified default "1" at registration (sv_main.c:140, bare Cvar_Register at 3436), NOT a shipped-cfg value.

The single defect (C-NEAR-MISS, flavour-C-positive): clause 3, "...and admin entries that are keyed to a real IP." The realip-based connect-gate consults ONLY the VIP list (ipvip[], SV_VIPbyIP at sv_main.c:2722, fed by vip_addip / vip_ip.cfg). There is no IP-keyed admin table in MVDSV: admin authority comes from rcon_password (sv_main.c:1804) or the QVM-exported mod_admin field (sv_main.c:2522/2618/2683); AF_REAL_ADMIN (sv_main.c:2398) is "pass/vip granted admin," not an IP entry. "admin" appears to be an over-broadening of "VIP" with no enforcing read-site -- the canonical flavour-C shape (a category clause with no enforcing line). It is not a flat contradiction (the VIP half is correct and the realip IS used in other connect-time checks), so this is C-NEAR-MISS, not C-FIX. Recommended minimal fix: drop "/admin" -> "...for matching VIP entries that are keyed to a real IP."

Two omissions (not errors, FYI only): the discovered realip is ALSO used at connect for ban-filtering -- SVC_IP at sv_main.c:1897 calls SV_FilterPacket() and SV_DropClient if the realip is banned -- and for login-account IP matching when an account uses use_ip (sv_login.c:211). The description frames the purpose narrowly around VIP; the ban-evasion-defeat purpose is arguably the more central reason the probe exists, but omitting it is not a commission error.

## flags_for_review

- [fyi/other/vpass] sv_getrealip's discovered realip is consumed by SV_FilterPacket()/SV_DropClient at SVC_IP (sv_main.c:1897) for ban-evasion defeat, and by login-account use_ip matching (sv_login.c:211), in addition to the VIP gate the description names. These are accurate-but-omitted purposes, not contradictions.
- [fyi/other/vpass] The rip_vip==1 branch (sv_user.c:267) is driven by the spectator-2 over-capacity VIP path (sv_main.c:1349 'vip = rip_vip = 1'), NOT by sv_getrealip. sv_getrealip's value==2 failure path sets rip_vip=2 (sv_user.c:255). A future edit conflating these two rip_vip producers would be a flavour-C trap; flagging so it is not mis-merged.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sys_nostdout=C-FIX, sv_idlesleep=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_getrealip",
  "type": "cvar",
  "description": "Controls whether the server tries to discover a connecting client's real IP address when the client is behind a proxy or address translation, so the server's IP-based checks (VIP entries and IP bans/penalties) see the client's true address rather than the proxy's. During connect the server bounces a small probe back to the client (retried a few times) to learn that address.\n\n0 = off; do not probe, accept the address the client connects from.\n1 = probe for the real IP, but let the client connect anyway if the probe fails.\n2 = probe for the real IP and refuse the connection if it cannot be validated.\n\nDefault: 1.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:228. Read use-sites in Cmd_New_f (src/sv_user.c). OFF-state clause (value 0): src/sv_user.c:228 'if (sv_client->state == cs_preconnected && !sv_client->realip.ip[0] && (int)sv_getrealip.value)' -- the entire realip-discovery block is gated on the value being truthy, so 0 skips it and the client is treated with the address it connected from (no probe). Probe clause: when ON and realip not yet known, src/sv_user.c:244-250 increments realip_count (< 10) and stuffs back 'packet %s \"ip %d %d\"\\ncmd new\\n' -> the server asks the client to report its real IP, retried up to ~10 times / 3s (src/sv_user.c:252 'SV_ClientConnectedTime > 3 || realip_count > 10'). Purpose clause (VIP-by-real-IP): the discovered sv_client->realip feeds SV_VIPbyIP(sv_client->realip) at src/sv_user.c:269 and :285 -> real IP is used for VIP/admin matching; admin-observable framing kept generic. Value==2 (strict) clause: src/sv_user.c:253 'if ((int)sv_getrealip.value == 2)' on probe failure sends 'Failed to validate client's IP' and sets sv_client->rip_vip = 2 (:255); a non-zero rip_vip client without a matching VIP is refused -- 'server is full' at :272 when rip_vip==1, and the rip_vip drop/log path at :471-473 -> value 2 enforces validation (refuse on failure). Value==1 (lenient) clause: on the same failure with value 1, line :257 sets state = cs_connected without setting rip_vip from this branch -> client connects anyway. Default clause (WI-2): registered at src/sv_main.c:140 as cvar_t {\"sv_getrealip\", \"1\"} -> 1. Set-by: Cvar_Register at src/sv_main.c:3436 -> server config / rcon (no command). Cross-mod (F-MV1): no KTX reference to sv_getrealip (grep of ktx/src returned nothing for it). Not a suspect-pool member; synthesized normally. No new citation format (P3).",
  "description_proposed": null
}
```
