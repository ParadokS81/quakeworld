# describe-fill-synthesis ledger -- mvdsv `timeout`

- **project:** mvdsv
- **knob:** `timeout` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:timeout: synthesized -- seconds a client may send nothing before SV_CheckTimeouts drops it with a "<name> timed out" broadcast; default 65s -- origin=synthesized ref=src/sv_main.c:3088 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets how many seconds a client may go without sending any packet before the server drops it as timed out. When a connected client (or spectator) has sent nothing for longer than this, the server disconnects them and announces "<name> timed out" to everyone.
>
> Value is in seconds; raising it tolerates longer silences before a drop, lowering it drops unresponsive clients sooner.
>
> Default: 65.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| drop when no packet for timeout seconds (threshold + seconds unit) | src/sv_main.c:3088 | `droptime = curtime - timeout.value;` | MATCH |
| the drop condition + announce + disconnect | src/sv_main.c:3101-3105 | `if (cl->netchan.last_received < droptime) { SV_BroadcastPrintf(PRINT_HIGH, "%s timed out\n", cl->name); SV_DropClient(cl); cl->state = cs_free; }` | MATCH |
| applies to connected clients and spectators | src/sv_main.c:3097-3100 | `if (cl->state >= cs_preconnected ...) { if (!cl->spectator) nclients++; ...` | MATCH |
| announce text "<name> timed out" to all | src/sv_main.c:3103 | `SV_BroadcastPrintf (PRINT_HIGH, "%s timed out\n", cl->name);` | MATCH |
| Default 65 | src/sv_main.c:66 | `cvar_t timeout = {"timeout", "65"};` | MATCH |
| Set by server config / rcon (not blocklisted) | src/sv_main.c:1754-1764 | timeout absent from blocklist | MATCH |
| no KTX override | ktx/src (grep) | `(none in ktx)` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Drops a client that has sent no packet for longer than `timeout` seconds | src/sv_main.c:3088, 3101-3104 | `droptime = curtime - timeout.value;` ... `if (cl->netchan.last_received < droptime) { SV_BroadcastPrintf(...); SV_DropClient(cl); }` | MATCH |
| 1a | "any packet" (not a specific message type) refreshes the clock | src/net_chan.c:454 | `chan->last_received = curtime;` (set in Netchan_Process, the inbound-packet handler) | MATCH |
| 2 | Scope = connected clients AND spectators | src/sv_main.c:3097-3106 | gate is `if (cl->state >= cs_preconnected)`; the drop block has NO `cl->spectator` guard. `!cl->spectator` at 3099 only affects `nclients` (pause logic), not the drop | MATCH |
| 3 | Side-effect: server disconnects them AND announces "<name> timed out" to everyone | src/sv_main.c:3103-3104 | `SV_BroadcastPrintf (PRINT_HIGH, "%s timed out\n", cl->name); SV_DropClient (cl);` (only "timed out" string in the whole tree) | MATCH |
| 4 | Units = seconds | src/sv_main.c:3088 + src/sv_sys_unix.c:794,798 + src/net_chan.c:454 | `curtime = newtime;` where `newtime = Sys_DoubleTime()` (seconds, double); both `curtime` and `last_received` share this base, so `curtime - timeout.value` treats the value as seconds. Reg comment + server.h:404 corroborate | MATCH |
| 5 | Direction: raising tolerates longer silence; lowering drops sooner | src/sv_main.c:3088, 3101 | larger `timeout.value` -> smaller `droptime` -> `last_received < droptime` harder to satisfy -> longer tolerance; smaller value -> larger droptime -> drops sooner | MATCH |
| 6 | Default 65 | src/sv_main.c:66 (+ register 3507) | `cvar_t timeout = {"timeout", "65"};` registered default string "65", flags=0 (WI-2: registered default, not shipped-cfg) | MATCH |
| 7 | Set by: server config / rcon | src/sv_main.c:66; src/cvar.h:60-64 | initializer flags field = 0 (CVAR_NONE): no CVAR_SERVERINFO, no CVAR_ROM -> writable server cvar (console/config/rcon), not userinfo/ROM | MATCH |

**V-pass notes:** Every material clause maps to a located, verified enforcing line. Core enforcement is SV_CheckTimeouts (src/sv_main.c:3079-3129), called once per server frame at sv_main.c:3303 (runtime-reachable, not dead). Drop predicate: droptime = curtime - timeout.value (3088); if (cl->netchan.last_received < droptime) -> broadcast "%s timed out" + SV_DropClient (3101-3104). Polarity verified at the predicate level, not inferred from the knob name. Units verified by tracing curtime -> Sys_DoubleTime() (seconds) AND last_received -> same base (net_chan.c:454), so the comparison genuinely treats timeout.value as seconds -- the reg comment "seconds without any message" and server.h:404 are corroborated, not relied upon. Scope (clients + spectators) verified: the drop block is gated only on cl->state >= cs_preconnected; the cl->spectator check at 3099 governs nclients/pause-unpause, NOT the drop. Default 65 and set-by both verified against the registration initializer (flags=0). Exhaustive grep confirms a single "timed out" string and a single functional timeout.value read-site for the client drop; other *timeout.value hits are unrelated cvars (qtv_streamtimeout, sys_select_timeout, qtv_pendingtimeout). No clause is name/enum/string/comment-only inference. No OnChange clamp/minimum exists, and the description claims none -- no contradiction.

## flags_for_review

- [fyi/off-scope-entity/vpass] SV_CheckTimeouts skips bots from the timeout sweep: under USE_PR2, `if (cl->isBot) continue;` (src/sv_main.c:3094-3096) runs before the drop check, so frik-bot/PR2 bots are never timed-out-dropped. The description scopes to 'connected client (or spectator)', which a reader naturally reads as real network clients, so this is not misleading -- FYI only, no fix needed.
- [fyi/other/vpass] The same loop also drives an independent login-timeout path: `if (!cl->logged && !cl->logged_in_via_web) SV_LoginCheckTimeOut(cl);` (src/sv_main.c:3107-3109), which is governed by a SEPARATE login-timeout mechanism (see 'Login timeout expired', src/sv_login.c:839), not by the `timeout` cvar. This is a distinct knob/feature co-located in SV_CheckTimeouts and does not affect any clause of the `timeout` description. FYI for whoever documents login timeout.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "timeout",
  "type": "cvar",
  "description": "Sets how many seconds a client may go without sending any packet before the server drops it as timed out. When a connected client (or spectator) has sent nothing for longer than this, the server disconnects them and announces \"<name> timed out\" to everyone.\n\nValue is in seconds; raising it tolerates longer silences before a drop, lowering it drops unresponsive clients sooner.\n\nDefault: 65.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3088. Trailing comment `// seconds without any message` (sv_main.c:66) is close but a fragment, not D20-shaped; synthesized. READ use-site: SV_CheckTimeouts, sv_main.c:3088 `droptime = curtime - timeout.value;` then sv_main.c:3101-3105 `if (cl->netchan.last_received < droptime) { SV_BroadcastPrintf(PRINT_HIGH, \"%s timed out\\n\", cl->name); SV_DropClient(cl); cl->state = cs_free; }`. Unit (seconds): droptime is curtime minus timeout.value directly, both in the server's seconds timebase, so the value is seconds. Threshold/polarity: a client whose last_received is older than (now - timeout) is dropped, so larger value = longer tolerated silence (verified by the subtraction direction). Side-effect: drops the client AND broadcasts \"<name> timed out\" at PRINT_HIGH to all (the observable announce). Scope: applies to any client with state >= cs_preconnected (sv_main.c:3097), spectators included (only nclients-counting distinguishes them at :3099-3100). Default: registered literal `{\"timeout\", \"65\"}` at sv_main.c:66 (WI-2). Set-by: not on the rcon blocklist (sv_main.c:1754-1764) -> server config / rcon. F-MV1: grep ktx/src for \"timeout\"/timeout.value -> none; no KTX override. (Internal, kept out of user doc: under USE_PR2, cl->isBot clients are `continue`-skipped at sv_main.c:3094 so bots never time out; and zombie-slot reclaim uses a separate cvar zombietime at sv_main.c:3111 -- not this knob.)",
  "description_proposed": null
}
```
