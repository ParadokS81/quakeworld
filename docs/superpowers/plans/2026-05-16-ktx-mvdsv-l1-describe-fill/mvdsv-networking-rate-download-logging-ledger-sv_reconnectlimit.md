# describe-fill-synthesis ledger -- mvdsv `sv_reconnectlimit`

- **project:** mvdsv
- **knob:** `sv_reconnectlimit` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_reconnectlimit: synthesized -- seconds cooldown before same-address reconnect; reject-if-connected-time-below; default 0 = no limit (OFF-state traced) -- origin=synthesized ref=sv_main.c:1123 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets a cooldown, in seconds, before a client may reconnect from the same network address. If a client tries to reconnect sooner than this after their current connection started, the new connection attempt is rejected with a "reconnect rejected: too soon" message.
>
> Value is in seconds; raising it forces a longer wait between a client's reconnect attempts, lowering it shortens the wait.
>
> Default: 0 (no cooldown -- reconnects are never rejected for being too soon).
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| rejects reconnect when too soon | sv_main.c:1123-1126 | `if (SV_ClientConnectedTime(cl) < sv_reconnectlimit.value) { Con_Printf("%s:reconnect rejected: too soon\n"...); return false; }` | MATCH |
| polarity = reject when below threshold | sv_main.c:1123 | `< sv_reconnectlimit.value` | MATCH |
| units = seconds (real-world) | sv_main.c:4206 / server.h:1100 | `return curtime - client->connection_started_curtime;` // `real-world time passed` | MATCH |
| scope = same network address reconnect | sv_main.c:1120-1121 | `NET_CompareBaseAdr (adr, cl->netchan.remote_address) && (cl->netchan.qport == qport || ...)` | MATCH |
| default 0 | sv_main.c:118 | `cvar_t sv_reconnectlimit = {"sv_reconnectlimit", "0"};` | MATCH |
| OFF-state at 0 = never rejects | sv_main.c:1123 | `< 0` never true since connected-time >= 0 | MATCH |
| set by config/rcon (no flags) | sv_main.c:118,3548 | `{"sv_reconnectlimit", "0"}` ... `Cvar_Register (&sv_reconnectlimit);` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | Sets a cooldown in SECONDS | sv_main.c:1123 + 4201-4206 | `if (SV_ClientConnectedTime(cl) < sv_reconnectlimit.value)` ; callee `return curtime - client->connection_started_curtime;` (comment `// real-world time passed`) | MATCH -- compared quantity is real-world elapsed seconds since connection start; `.value` is the float-parsed cvar | 
| 2 | Before a client may reconnect FROM THE SAME NETWORK ADDRESS | sv_main.c:1120-1123 + net.c:259-270 | `if (NET_CompareBaseAdr (adr, cl->netchan.remote_address) && (cl->netchan.qport == qport || adr.port == cl->netchan.remote_address.port))` ; `NET_CompareBaseAdr` compares only the 4 IP octets | MATCH -- gate fires only on a client whose base IP matches an existing slot (plus same qport/port identifying it as the same connection). "Same network address" = the IP-level base-address match; secondary qport/port narrows to same client, does not contradict | 
| 3 | If reconnect attempted SOONER than this AFTER current connection STARTED -> rejected | sv_main.c:1123-1126 + 4201-4206 | `if (SV_ClientConnectedTime(cl) < sv_reconnectlimit.value) { ... return false; }` ; callee anchors on `connection_started_curtime` (set by SV_SetClientConnectionTime, l.4219-4223) | MATCH -- threshold compared against time since the EXISTING (current) connection started; if elapsed < limit -> rejected | 
| 4 | Rejection message "reconnect rejected: too soon" | sv_main.c:1125 | `Con_Printf ("%s:reconnect rejected: too soon\n", NET_AdrToString (adr));` | MATCH -- verbatim | 
| 5 | Scope: on a reconnect attempt (connect-request path) | sv_main.c:1323 (in SVC_DirectConnect, l.1237) | `if ( !CheckReConnect( adr, qport ) ) return;` | MATCH -- CheckReConnect (the only reader) is called from SVC_DirectConnect, the connectionless connect handler; reject returns from the connect flow | 
| 6 | Polarity: raising forces longer wait, lowering shortens | sv_main.c:1123 | `if (SV_ClientConnectedTime(cl) < sv_reconnectlimit.value)` | MATCH -- higher limit requires more elapsed time to pass the `<` test; strictly monotonic | 
| 7 | Default: 0 | sv_main.c:118 (+ Cvar_Register l.3548) | `cvar_t sv_reconnectlimit = {"sv_reconnectlimit", "0"};` | MATCH -- registered default string "0"; bare RegisterCvar, no OnChange, no clamp, no flags | 
| 8 | OFF-state: 0 => reconnects NEVER rejected for being too soon | sv_main.c:1123 + 4201-4206 | `SV_ClientConnectedTime(cl) < 0` ; callee returns 0 or non-negative `curtime - start` | MATCH -- elapsed is always >= 0, so `elapsed < 0` is never true; with default 0 the reject branch is unreachable | 
| 9 | Set by: server config / rcon | sv_main.c:118, 3548 | no CVAR_ROM / CVAR_SERVERINFO / CVAR_USERINFO flag on registration | MATCH -- ordinary server cvar, settable via config or rcon; no special flags |

**V-pass notes:** VERSION CONFIRMED: git describe == 1.11-53-g18d0362.

Exactly three use-sites tree-wide: registration (sv_main.c:118), the SOLE enforcing read (sv_main.c:1123 inside CheckReConnect), and Cvar_Register (sv_main.c:3548). No other reader exists -- the enforcing line is unambiguous.

Every material clause (seconds-unit, same-address scope, since-connection-start anchor, the exact reject string, connect-path scope, polarity, default 0, OFF-state, settability) maps to a located, verified enforcing line. The callee SV_ClientConnectedTime (sv_main.c:4201) was followed per the trace rule -- it defines the measured quantity as `curtime - connection_started_curtime` (real-world elapsed, comment-confirmed `// real-world time passed`), which is precisely what the description's "after their current connection started" asserts. Distinguished from SV_ClientGameTime (pause-affected, realtime-based) -- the reconnect path correctly uses the curtime variant, and the description's "in seconds" without a pause caveat is accurate for this branch.

Boundary checked: with the `<` operator and default value 0, the reject condition `elapsed < 0` is never satisfiable (elapsed is always non-negative), so the OFF-state claim ("never rejected for being too soon") is exactly enforced, not merely inferred.

WI-2 metadata: registered default is the bare struct literal "0" (sv_main.c:118), not a shipped-cfg value -- description's Default: 0 is the true registered default. Registration carries no OnChange and no CVAR flags, so "Set by: server config / rcon" is correct (no ROM/serverinfo/userinfo restriction).

One sub-clause worth noting (does NOT change the classification): clause 2's "same network address" is the user-doc-level framing of a two-part match -- base-IP equality (NET_CompareBaseAdr, octets only) AND (same qport OR same source port). The IP match is the primary discriminator; the qport/port condition narrows to the same client's existing slot and does not contradict the IP-level statement. Acceptable L1 precision (still-true minor compression that is fully traceable), not a near-miss.

Runtime reachability: code is inside the server build (SV_ClientConnectedTime closes the `#ifndef CLIENTONLY` block at l.4225); SVC_DirectConnect is the standard connectionless connect dispatcher (l.1941). Live path, not dead code.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_reconnectlimit",
  "type": "cvar",
  "description": "Sets a cooldown, in seconds, before a client may reconnect from the same network address. If a client tries to reconnect sooner than this after their current connection started, the new connection attempt is rejected with a \"reconnect rejected: too soon\" message.\n\nValue is in seconds; raising it forces a longer wait between a client's reconnect attempts, lowering it shortens the wait.\n\nDefault: 0 (no cooldown -- reconnects are never rejected for being too soon).\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:1123. Enforcing read-site: CheckReConnect at sv_main.c:1123 `if (SV_ClientConnectedTime(cl) < sv_reconnectlimit.value)` -> sv_main.c:1125 Con_Printf(\"%s:reconnect rejected: too soon\") + return false. Polarity: rejects when the client's connected-time is BELOW the threshold. Units: SV_ClientConnectedTime (sv_main.c:4201-4207) returns `curtime - connection_started_curtime` = real-world seconds elapsed since the connection started (server.h:1100 comment \"real-world time passed\"; same value is /60.0 for minutes at sv_main.c:659). Scope: the surrounding loop (sv_main.c:1120-1121) matches a client by NET_CompareBaseAdr + qport/port, i.e. a reconnect from the same base network address. Default: registered cvar_t literal `{\"sv_reconnectlimit\", \"0\"}` (sv_main.c:118) -> 0; at 0 the comparison `connected_time < 0` is never true (connected-time is >= 0), so no reject ever fires (verified OFF-state). Set-by: plain cvar_t with no flags (sv_main.c:118), registered sv_main.c:3548 -> settable via server config / rcon. No KTX override (grep of ktx/src empty).",
  "description_proposed": null
}
```
