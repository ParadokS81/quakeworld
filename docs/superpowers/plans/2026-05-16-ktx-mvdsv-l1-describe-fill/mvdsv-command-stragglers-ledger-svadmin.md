# describe-fill-synthesis ledger -- mvdsv `svadmin`

- **project:** mvdsv
- **knob:** `svadmin` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `hedged` -- medium confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `command-stragglers` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:svadmin: hedged -- sets/clears the WatcherId 'Rcon Watch' pointer (sv_main.c:1672) + prints state, but NO source consumer reads WatcherId to forward rcon, so the watch effect is not realized in this tree -- origin=synthesized ref=src/sv_main.c:1672 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Marks the connected player who issues it as the current "Rcon Watch" recipient, and prints a confirmation to the server console. Issued again with the argument "off" by that same player, it clears the watch. If a watch is already held by another player, it reports who holds it.
>
> svadmin = claim the Rcon Watch (must be issued by a player connected to this server).
> svadmin off = release the watch (only the holder can release it).
>
> Note: in the current server source nothing reads this "Rcon Watch" selection to actually forward rcon commands or their output to the watcher, so beyond the console confirmation and the held/released state the command has no further observable effect here.
>
> Set by: a connected player (resolved by the issuer's network address); the watch is auto-released if that player disconnects.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registration (locator) | src/sv_main.c:3614 | `Cmd_AddCommand ("svadmin", SV_Admin_f);` (QW262) | MATCH |
| sets issuer as WatcherId | src/sv_main.c:1672 | `WatcherId = cl;` | MATCH |
| issuer must be a connected player (by address) | src/sv_main.c:1657-1670 | `for (...){ if (cl->state != cs_spawned) continue; if (NET_CompareAdr(cl->netchan.remote_address, net_from)) break; } if (i == MAX_CLIENTS) { Con_Printf("You are not connected to server!\n"); return; }` | MATCH |
| 'off' clears, holder-only | src/sv_main.c:1645-1651 | `if (Cmd_Argc()==2 && !strcmp(Cmd_Argv(1),"off") && WatcherId && NET_CompareAdr(WatcherId->netchan.remote_address, net_from)) { Con_Printf("Rcon Watch stopped\n"); WatcherId = NULL; return; }` | MATCH |
| already-held report | src/sv_main.c:1653-1654 | `if (WatcherId) Con_Printf("Rcon Watch is already being made by %s\n", WatcherId->name);` | MATCH |
| auto-release on disconnect | src/sv_main.c:431-432 | `if (drop == WatcherId) WatcherId = NULL;` | MATCH |
| WatcherId has NO output consumer (hedge) | (tree-wide) src/sv_main.c only: 214,431-432,1645-1672 | exhaustive `grep -rni watcher src/` returns only def + drop-cleanup + SV_Admin_f; SV_FlushRedirect (sv_send.c:58-67) sends RD_PACKET to net_from, never WatcherId | MATCH (absence verified) |
| admin/connection-scoped (not in client ucmds) | src/sv_user.c:3299-3358 | no "svadmin" entry | MATCH |
| not on normal-rcon blocklist | src/sv_main.c:1754-1764 | 'svadmin' absent | MATCH |
| no KTX override | research/repos/ktx/src | no `Cmd_AddCommand("svadmin"...)` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | Registered command name `svadmin` -> handler `SV_Admin_f` | src/sv_main.c:3614 | `Cmd_AddCommand ("svadmin", SV_Admin_f);` | MATCH |
| 2 | "Marks the connected player who issues it as the current Rcon Watch recipient" (claim) | src/sv_main.c:1672 | `WatcherId = cl;` (cl = the `cs_spawned` client whose addr == net_from, loop 1657-1664) | MATCH |
| 3 | "prints a confirmation to the server console" | src/sv_main.c:1673 | `Con_Printf ("Rcon Watch started for %s\n", cl->name);` | MATCH |
| 4 | "Issued again with argument 'off' by that same player, it clears the watch" | src/sv_main.c:1645-1650 | `if (Cmd_Argc()==2 && !strcmp(Cmd_Argv(1),"off") && WatcherId && NET_CompareAdr(WatcherId->netchan.remote_address, net_from)) { Con_Printf("Rcon Watch stopped\n"); WatcherId = NULL; return; }` | MATCH |
| 5 | "off only the holder can release it" (non-holder off falls through to held-report) | src/sv_main.c:1646 + 1653 | `NET_CompareAdr (WatcherId->netchan.remote_address, net_from)` gates the stop; otherwise `if (WatcherId)` -> report | MATCH |
| 6 | "If a watch is already held by another player, it reports who holds it" | src/sv_main.c:1653-1654 | `if (WatcherId) Con_Printf ("Rcon Watch is already being made by %s\n", WatcherId->name);` | MATCH (minor: fires for ANY holder incl. self, not strictly "another" -- report behavior itself correct) |
| 7 | "must be issued by a player connected to this server" / "You are not connected" path | src/sv_main.c:1657-1670 | loop over `svs.clients` requiring `cl->state == cs_spawned` and `NET_CompareAdr(cl->...remote_address, net_from)`; `if (i==MAX_CLIENTS) Con_Printf("You are not connected to server!\n"); return;` | MATCH |
| 8 | "resolved by the issuer's network address" (full IP+port) | src/net.c:282 + src/net.h:155 | `if (a.ip[0]==b.ip[0] && ... && a.port==b.port) return true;` ; `net_from // address of who sent the packet` | MATCH |
| 9 | "the watch is auto-released if that player disconnects" | src/sv_main.c:431-432 | `if (drop == WatcherId) WatcherId = NULL;` (in SV_DropClient) | MATCH |
| 10 | WI2 note: "nothing reads this Rcon Watch selection to actually forward rcon commands ... to the watcher" | whole-tree grep | `WatcherId` has exactly 8 refs (decl :214; cleanup :431-432; and 5 inside SV_Admin_f). No reader outside SV_Admin_f. | MATCH (no consumer) |
| 11 | WI2 note: "...or their output to the watcher" | src/sv_main.c:1819 -> src/sv_send.c:58-68 | rcon path `SV_BeginRedirect(RD_PACKET)`; flush sends `NET_SendPacket(NS_SERVER, ..., net_from)` -- to the rcon sender, never WatcherId | MATCH (output goes to sender, not watcher) |
| 12 | "console confirmation and held/released state the command has no further observable effect" | SVC_RemoteCommand src/sv_main.c:1687-1828 | entire rcon execution/log/redirect path; no `WatcherId` reference anywhere in it | MATCH |

**V-pass notes:** VERDICT: TRACED-CLEAN. Oracle confirmed at 1.11-53-g18d0362. Every material clause maps to a located, verified enforcing line (handler SV_Admin_f at src/sv_main.c:1640-1675; disconnect cleanup src/sv_main.c:431-432; address helper src/net.c:273-285; net_from semantics src/net.h:155; cs_spawned src/server.h:153).

The description is unusually careful and handled the WI2 risk CORRECTLY rather than committing a defect. This command's selection (`WatcherId`) is read by NOTHING that forwards rcon -- and the description explicitly STATES that no-consumer fact instead of fabricating a forwarding behavior. That is the opposite of a WI2-FIX: WI2-FIX is for asserting behavior with no read-site; here the text asserts the ABSENCE of behavior, which is verified true. I exhaustively grepped: `WatcherId`/`Watcher` (case-insensitive) across src/ and tools/ yields exactly 8 sites, all accounted for. The rcon execution path SVC_RemoteCommand never consults it, and rcon output is redirected via RD_PACKET back to net_from (the sender) at sv_send.c:67, never to the watcher.

One sub-clean nuance (kept TRACED-CLEAN, not escalated to C-NEAR-MISS): clause 6 says the held-report fires when "another player" holds the watch. The code (sv_main.c:1653 `if (WatcherId)`) has no self-vs-other distinction, so a current holder who re-issues plain `svadmin` (no "off") also hits this branch and is told the watch is "already being made by <themselves>". The reported behavior ("reports who holds it") is accurate and HAS an enforcing line; the word "another" is a one-word over-narrowing (the code is BROADER than the description), not a flavour-C name/enum/string inference and not a contradiction. Per the enum, every material clause maps to a verified enforcing line and the residual is still-true minor vagueness -> TRACED-CLEAN. Flagged below for optional copy tightening.

Two further accurate precisions worth noting as confirmed-correct (not defects): (a) "resolved by the issuer's network address" -- NET_CompareAdr compares full IP + port (net.c:282), so the identity is the exact remote address, which the description's parenthetical captures; (b) the connection check ("must be issued by a player connected") only runs in the claim branch (no watch held) -- the off branch and the held-report branch do not re-run a spawned-client loop, but they gate on net_from matching the existing holder, so the net effect ("must be a connected player") still holds for every state-changing path. No clause overstates this.

No C-FIX, no C-NEAR-MISS, no WI2-FIX. Description is safe to keep as-is.

## flags_for_review

- [review/runtime-dead-suspect/synthesis] svadmin (SV_Admin_f, sv_main.c:1640) sets a global 'Rcon Watch' client pointer WatcherId (sv_main.c:1672), but an exhaustive tree-wide grep (grep -rni watcher src/) shows WatcherId is read NOWHERE except SV_Admin_f's own set/query/clear (sv_main.c:1645-1672) and the drop-cleanup (sv_main.c:431-432). No code in the rcon path (SVC_RemoteCommand sv_main.c:1687+) or the print-redirect (SV_FlushRedirect sv_send.c:54-97) ever reads WatcherId to forward rcon commands or their output to the watching client. The feature is a QW262-inherited stub whose output side was never wired into MVDSV: the command toggles state and prints confirmations but produces no rcon-watching effect. Not in the C3 suspect pool, so this is a code-legible inert-consumer finding rather than a runtime-dead-dump artifact. Worth a human look / possible upstream report or removal.
- [fyi/other/vpass] Description clause 'If a watch is already held by another player, it reports who holds it' uses 'another' but the code (src/sv_main.c:1653 `if (WatcherId)`) has no self/other distinction -- a current holder re-issuing plain `svadmin` (without `off`) is also told the watch is 'already being made by <themselves>'. The report behavior is correct and enforcement-traced; only the word 'another' slightly over-narrows. Optional one-word copy tighten (e.g. 'if a watch is already held' / 'reports who currently holds it'); not a defect, classification stays TRACED-CLEAN.
- [fyi/runtime-dead-suspect/vpass] runtime-dead / no-consumer confirmation (matches what the description already states): the `WatcherId` selection set by svadmin is read by NO code path that forwards rcon input or output to the watcher. Exhaustive whole-tree grep = 8 references total: declaration src/sv_main.c:214, disconnect cleanup src/sv_main.c:431-432, and 5 inside SV_Admin_f (1645,1646,1649,1653,1654,1672). The rcon path SVC_RemoteCommand (src/sv_main.c:1687-1828) never reads it; rcon output redirect RD_PACKET flushes to net_from (the sender) at src/sv_send.c:67, not the watcher. Origin marker `// QW262` (src/sv_main.c:214,1639,3613) indicates this is inherited QW262 functionality whose consumer side was never present/ported in mvdsv. The description correctly surfaces this rather than fabricating forwarding behavior -- recording here so the no-consumer status is captured at oracle level.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, quit=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "svadmin",
  "type": "command",
  "description": "Marks the connected player who issues it as the current \"Rcon Watch\" recipient, and prints a confirmation to the server console. Issued again with the argument \"off\" by that same player, it clears the watch. If a watch is already held by another player, it reports who holds it.\n\nsvadmin = claim the Rcon Watch (must be issued by a player connected to this server).\nsvadmin off = release the watch (only the holder can release it).\n\nNote: in the current server source nothing reads this \"Rcon Watch\" selection to actually forward rcon commands or their output to the watcher, so beyond the console confirmation and the held/released state the command has no further observable effect here.\n\nSet by: a connected player (resolved by the issuer's network address); the watch is auto-released if that player disconnects.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "hedged",
  "description_confidence": "medium",
  "description_reasoning": "primary source_ref src/sv_main.c:1672. Registered Cmd_AddCommand(\"svadmin\", SV_Admin_f) at sv_main.c:3614 (QW262 block). Handler SV_Admin_f at sv_main.c:1640. SET clause: WatcherId = cl (sv_main.c:1672) after locating the connected client whose netchan.remote_address matches net_from (sv_main.c:1657-1664); 'You are not connected to server!' if no match (1666-1670) -- enforces 'must be issued by a connected player, resolved by issuer address'. This is the principal state mutation, hence source_ref. OFF clause: Cmd_Argc()==2 && Cmd_Argv(1)==\"off\" && WatcherId && NET_CompareAdr(WatcherId->netchan.remote_address, net_from) -> 'Rcon Watch stopped' and WatcherId=NULL (sv_main.c:1645-1651) -- enforces 'only the holder can release'. ALREADY-HELD clause: if WatcherId set, 'Rcon Watch is already being made by %s' (sv_main.c:1653-1654). AUTO-RELEASE clause: SV_DropClient path sets WatcherId=NULL when the dropped client is the watcher (sv_main.c:431-432). HEDGE (the load-bearing finding): I grepped the WHOLE tree for WatcherId/Watcher (case-insensitive) -- the ONLY occurrences are the definition (sv_main.c:214), the drop-cleanup (431-432), and SV_Admin_f's own set/query/clear (1645-1672). NO consumer reads WatcherId to redirect or copy rcon commands/output to that client: the rcon path SVC_RemoteCommand (sv_main.c:1687+) and SV_FlushRedirect (sv_send.c:54-97, RD_PACKET sends only back to net_from) never reference WatcherId. So the 'watch rcon' effect that the names imply is NOT enforced anywhere in this tree; only the console-print + pointer-toggle behavior is source-legible. Per the confabulation guard I assert only the legible part and explicitly mark the downstream watch effect as not realized in source (verdict hedged), rather than describe svadmin as a working rcon-watch command. ACCESS: registered only via Cmd_AddCommand, NOT in ucmds[] (absent from sv_user.c:3299-3358) and NOT on the normal-rcon blocklist (sv_main.c:1754-1764); however the handler's effect is keyed to a CONNECTED player's address (net_from), so it is meaningfully issued by a player over their connection / matching rcon source rather than the detached local console. F-MV1: KTX does not override 'svadmin'. Not a C3 suspect_pool_member (per brief), so not dead-stamped; the inert-consumer condition is a separate, source-legible observation captured as a flag.",
  "description_proposed": null
}
```
