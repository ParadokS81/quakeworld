# describe-fill-synthesis ledger -- mvdsv `sv_broadcast_enabled`

- **project:** mvdsv
- **knob:** `sv_broadcast_enabled` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `c3-dead-network` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_broadcast_enabled: synthesized -- master switch for the cross-server .qw broadcast feature; 0 disables outgoing+incoming, default 1, pre-game only; live via 3 enforcing reads -- origin=synthesized ref=src/sv_broadcast.c:345 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Turns the cross-server broadcast feature on or off. When on, a player can send a short message to other QuakeWorld servers by typing ".qw <message>" in chat; on the receiving server it is shown to spectators, and to all players too if that server has no game in progress. This server will likewise accept and display incoming broadcast messages from other servers. Broadcasts can only be sent before a game has started.
>
> 0 = broadcasts disabled (outgoing attempts are refused and incoming broadcast packets are ignored).
> 1 = broadcasts enabled.
>
> Default: 1.
> Set by: server config.
> See also: sv_broadcast_sender_validation_enabled.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 1 | src/sv_main.c:145 | `cvar_t sv_broadcast_enabled = {"sv_broadcast_enabled", "1", 0, SV_BroadcastEnabledOnChange};` | MATCH |
| polarity 0=off / non-zero=on | src/sv_broadcast.c:345 | `if (!sv_broadcast_enabled.value)` | MATCH |
| OFF rejects outgoing player broadcast | src/sv_broadcast.c:345-349 | `if (!sv_broadcast_enabled.value){ SV_ClientPrintf(sv_client, PRINT_HIGH, "Broadcasting is not enabled on this server\n"); return false; }` | MATCH |
| OFF ignores incoming broadcast packet | src/sv_broadcast.c:522 | `if (!sv_broadcast_enabled.value || Cmd_Argc() < 1){ return; }` | MATCH |
| OFF aborts server-list sync | src/sv_broadcast.c:99-107 | `if (!sv_broadcast_enabled.value){ ... return; }` | MATCH |
| player triggers via ".qw <msg>" chat | src/sv_user.c:1812-1814 + src/sv_broadcast.h:25 | `strncmp(text, BROADCAST_PREFIX, ...)==0 ... SV_Broadcast(text+BROADCAST_PREFIX_LEN)`; `#define BROADCAST_PREFIX ".qw "` | MATCH |
| incoming `broadcast` packet -> SVC_Broadcast | src/sv_main.c:1962-1963 | `else if (!strcmp(c,"broadcast")) SVC_Broadcast ();` | MATCH |
| only before game start | src/sv_broadcast.c:351-355 | `if (GameStarted()){ ... "Broadcasting is not available during games"; return false; }` | MATCH |
| serverinfo published under key 'broadcast' (reasoning only) | src/sv_broadcast.c:91 | `SV_ServerinfoChanged("broadcast", value);` | MATCH |
| no KTX override (F-MV1) | ktx/src (grep) | no `sv_broadcast_enabled` / `broadcast` cvar or command in ktx | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|------------------|---------|
| 1 | Turns cross-server broadcast feature on/off | src/sv_main.c:145 | `cvar_t sv_broadcast_enabled = {"sv_broadcast_enabled", "1", 0, SV_BroadcastEnabledOnChange};` | MATCH (boolean cvar gating all three broadcast paths) |
| 2 | Player sends a short message to other QW servers by typing ".qw <message>" in chat | src/sv_broadcast.h:25 + src/sv_user.c:1812-1814 | `#define BROADCAST_PREFIX ".qw "` ; `if (!team && strncmp(text, BROADCAST_PREFIX, BROADCAST_PREFIX_LEN) == 0) { if (!SV_Broadcast(text+BROADCAST_PREFIX_LEN))` | MATCH (public say, prefix `.qw `, prefix stripped before send) |
| 3 | "...(and have it shown to spectators there)" | src/sv_broadcast.c:624-631 | `if (client->state != cs_spawned || (started && !client->spectator && !spectalk)) continue; SV_ClientPrintf2(client, PRINT_CHAT, "%s\n", out);` | MISMATCH (imprecise): incoming msg shown to spectators ALWAYS (when spawned), but ALSO to players when receiver has no game in progress; spectator-only restriction applies at receiver ONLY during a live game (plus players if KTX `k_spectalk`). Prose implies spectator-only. |
| 4 | This server will likewise accept and display incoming broadcast packets from other servers | src/sv_broadcast.c:500-522,616,631 | `void SVC_Broadcast(void)` ... `Con_Printf("%s\n", out);` ... `SV_ClientPrintf2(client, PRINT_CHAT, ...)` | MATCH (connectionless `broadcast` cmd dispatched at sv_main.c:1962 -> SVC_Broadcast, logs + prints to clients) |
| 5 | Broadcasts only allowed before a game has started (sending side) | src/sv_broadcast.c:351-354 | `if (GameStarted()) { SV_ClientPrintf(sv_client, PRINT_HIGH, "Broadcasting is not available during games\n"); return false; }` | MATCH (outgoing send gated on `!GameStarted()`; server-list update likewise gated at line 109) |
| 6 | 0 = disabled, outgoing attempts refused | src/sv_broadcast.c:345-348 | `if (!sv_broadcast_enabled.value) { SV_ClientPrintf(sv_client, PRINT_HIGH, "Broadcasting is not enabled on this server\n"); return false; }` | MATCH (zero/falsey value blocks outgoing) |
| 7 | 0 = incoming broadcast packets ignored | src/sv_broadcast.c:522-525 | `if (!sv_broadcast_enabled.value || Cmd_Argc() < 1) { return; }` | MATCH (zero value -> early return, incoming dropped) |
| 8 | 1 = enabled | src/sv_broadcast.c:345,522 (inverse of OFF) | `if (!sv_broadcast_enabled.value) ... return` (non-zero passes the gate) | MATCH (any non-zero `.value` passes all gates; polarity confirmed: OFF=0 blocks, non-zero enables) |
| 9 | Default: 1 | src/sv_main.c:145 | `{"sv_broadcast_enabled", "1", 0, SV_BroadcastEnabledOnChange}` | MATCH (registered default string "1") |
| 10 | Set by: server config | src/sv_main.c:145 (no CF_/flags=0) + sv_broadcast.c:85-91 OnChange | `cvar_t sv_broadcast_enabled = {..., "1", 0, ...}` ; OnChange -> `SV_ServerinfoChanged("broadcast", value)` | MATCH (plain server cvar, flags arg = 0; not a per-client/player toggle) |
| 11 | See also: sv_broadcast_sender_validation_enabled | src/sv_main.c:146 + src/sv_broadcast.c:537 | `cvar_t sv_broadcast_sender_validation_enabled = {"sv_broadcast_sender_validation_enabled", "1"};` ; `if (sv_broadcast_sender_validation_enabled.value)` | MATCH (real, related: gates incoming-sender address validation) |

**V-pass notes:** Tag confirmed 1.11-53-g18d0362. Exhaustive use-site grep done: only 3 behavioral `.value` reads exist -- SV_BroadcastUpdateServerList (sv_broadcast.c:99, OFF blocks master-server-list fetch), SV_Broadcast outgoing (345), SVC_Broadcast incoming (522) -- plus registration (sv_main.c:145) and Cvar_Register (3446). Polarity rigorously confirmed: every gate is `if (!sv_broadcast_enabled.value) { reject }`, so 0/empty BLOCKS and any non-zero ENABLES; default registered string is "1" (enabled). 10 of 11 clauses MATCH their enforcing lines.

The single defect is clause 3, the parenthetical "(and have it shown to spectators there)". Enforcing line is the receiver's display loop at sv_broadcast.c:624-631. Skip condition is `(started && !client->spectator && !spectalk)`: when the RECEIVING server has a live game, only spectators (and players if KTX `k_spectalk` is set, per the comment at lines 620-621) see the message; when the receiver has NO game in progress, ALL spawned clients -- players AND spectators -- see it. The sender can only send pre-game (clause 5), but the receiver's game-state is independent of the sender's, so the displayed message commonly lands on a mid-game receiver where the spectator-only behavior is the design intent. The clause is therefore correct for the characteristic case and the spectator visibility IS enforced at line 631, but the prose implies spectator-only when the real behavior is broader pre-game on the receiver. This is "narrower/more conditional than implied" -> C-NEAR-MISS, not C-FIX (spectators genuinely do see it; nothing is flatly wrong). Suggested tightening: "...and have it displayed to spectators (and, before a game has started on the receiving server, to all players) there." All metadata (default, set-by, see-also) is correct, so this is NOT a WI2-FIX.

## flags_for_review

- [fyi/other/vpass] GameStarted() (sv_main.c:218-227) returns true if any non-DEST_STREAM mvd destination exists OR serverinfo 'status' != 'Standby'. The outgoing/sender gate (sv_broadcast.c:351) and the receiver's per-client visibility gate (sv_broadcast.c:626) both call it independently against THIS server's state. Worth noting in any concept-note: the sender-side 'pre-game only' and the receiver-side 'spectators-only-during-game' are two separate evaluations of two separate servers' states, not one shared condition.
- [fyi/cross-mod-override/vpass] KTX cross-mod override on the visibility clause: sv_broadcast.c:622 sets `spectalk = strstr(Cvar_String("qwm_name"), "KTX") && Cvar_Value("k_spectalk")`. When the server runs KTX and `k_spectalk` is non-zero, incoming broadcasts are shown to players even during a live game. This is a real KTX-specific widening of the receiver visibility and is not mentioned in the description (acceptable for an MVDSV-scoped L1 doc, but relevant if a downstream note claims spectator-only during games is absolute).

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sys_nostdout=C-FIX, sv_idlesleep=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_broadcast_enabled",
  "type": "cvar",
  "description": "Turns the cross-server broadcast feature on or off. When on, a player can send a short message to other QuakeWorld servers by typing \".qw <message>\" in chat; on the receiving server it is shown to spectators, and to all players too if that server has no game in progress. This server will likewise accept and display incoming broadcast messages from other servers. Broadcasts can only be sent before a game has started.\n\n0 = broadcasts disabled (outgoing attempts are refused and incoming broadcast packets are ignored).\n1 = broadcasts enabled.\n\nDefault: 1.\nSet by: server config.\nSee also: sv_broadcast_sender_validation_enabled.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_broadcast.c:345. Polarity/default: registered cvar_t literal `{\"sv_broadcast_enabled\", \"1\", 0, SV_BroadcastEnabledOnChange}` at src/sv_main.c:145 -> default 1; all gates test `if (!sv_broadcast_enabled.value)` so 0=off, non-zero=on. OFF-state enforced at THREE read-sites: (a) src/sv_broadcast.c:99 `if (!sv_broadcast_enabled.value){...return;}` aborts the master-server-list sync; (b) src/sv_broadcast.c:345 (CITED) `if (!sv_broadcast_enabled.value){ SV_ClientPrintf(..., \"Broadcasting is not enabled on this server\\n\"); return false; }` rejects a player's outgoing broadcast; (c) src/sv_broadcast.c:522 `if (!sv_broadcast_enabled.value || Cmd_Argc() < 1){ return; }` makes the inbound connectionless `broadcast` packet handler SVC_Broadcast a no-op. Player-facing trigger (the \".qw <message>\" UX): src/sv_user.c:1812-1814 checks `strncmp(text, BROADCAST_PREFIX, ...)==0` then calls SV_Broadcast(text+prefix_len), with BROADCAST_PREFIX defined `\".qw \"` at src/sv_broadcast.h:25. Inbound packet dispatch: src/sv_main.c:1962-1963 routes connectionless `broadcast` to SVC_Broadcast. \"Only before a game has started\": SV_Broadcast checks `if (GameStarted()){ ...\"Broadcasting is not available during games\"; return false; }` at src/sv_broadcast.c:351-355, and the sync at src/sv_broadcast.c:109 likewise aborts once GameStarted(). Side-effect NOT surfaced in user prose (D20 -> reasoning): the SV_BroadcastEnabledOnChange callback (src/sv_broadcast.c:85-92) republishes the value into serverinfo under the key `broadcast` (not under the cvar name) via SV_ServerinfoChanged(\"broadcast\", value); automatic on set, does not change the admin's action. F-MV1: grep of ktx/src finds NO override of this cvar or a `broadcast` command/cvar (the KTX hits are unrelated 'broadcast changes to all clients' uses); the only KTX coupling is the reverse -- MVDSV reads KTX's mod identity at src/sv_broadcast.c:622 (`strstr(Cvar_String(\"qwm_name\"),\"KTX\") && Cvar_Value(\"k_spectalk\")`) to decide whether in-progress-game spectalk lets players see broadcasts. Set-by: registered with flags 0 (no CVAR_SERVERINFO), so server config / rcon; the OnChange handles the serverinfo publish manually (comment at src/sv_broadcast.c:87-90). Not suspect-pool (suspect_pool_member=FALSE) and confirmed live via the three enforcing reads.",
  "description_proposed": null
}
```
