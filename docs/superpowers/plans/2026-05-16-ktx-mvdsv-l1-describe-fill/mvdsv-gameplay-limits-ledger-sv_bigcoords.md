# describe-fill-synthesis ledger -- mvdsv `sv_bigcoords`

- **project:** mvdsv
- **knob:** `sv_bigcoords` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_bigcoords: synthesized -- on selects high-precision (4-byte/2-byte) network coords/angles for big maps, off=standard; serverinfo-published, old clients can't connect; no KTX override -- origin=synthesized ref=src/sv_init.c:327 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Switches the server to high-precision network coordinates, allowing maps with geometry that extends beyond the standard coordinate range to be played correctly. When off, the server uses the standard, more compact coordinate precision. Turning it on requires clients that support the extended coordinate format; older clients will not be able to connect.
>
> 0 (or empty) = standard coordinate precision.
> 1 = high-precision (extended-range) coordinates and angles.
>
> Default: off (empty).
> Set by: server config.
> See also: sv_extlimits.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| on -> high-precision coords/angles | src/sv_init.c:327-330 | `if (sv_bigcoords.value) { msg_coordsize = 4; msg_anglesize = 2; }` | MATCH |
| off -> standard precision | src/sv_init.c:334-335 | `else { msg_coordsize = 2; msg_anglesize = 1; }` | MATCH |
| guarded by FTE float-coords build | src/sv_init.c:326 | `#ifdef FTE_PEXT_FLOATCOORDS` | MATCH |
| default empty/off; published in serverinfo | src/sv_main.c:195 | `cvar_t sv_bigcoords = {"sv_bigcoords", "", CVAR_SERVERINFO};` | MATCH |
| older clients cannot connect (extension-gated) | src/sv_demo.c:1249-1253 | `//fix up extensions to match sv_bigcoords correctly. sorry for old clients not working.` then FTE_PEXT_FLOATCOORDS set iff msg_coordsize==4 | MATCH (consequence, hedged in prose) |
| no KTX override | ktx/src (grep) | grep sv_bigcoords -> 0 hits | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | ON switches server to high-precision network coordinates | sv_init.c:327-330 | `if (sv_bigcoords.value) { msg_coordsize = 4; msg_anglesize = 2; }` (4-byte coord = raw float, common.c:53/73 `r.f`/`c.f`) | MATCH |
| 2 | Allows maps with geometry beyond standard coordinate range | common.c:50 | `case 2: //encode 1/8th precision, giving -4096 to 4096 map sizes` (4-byte path stores full float -> larger range) | MATCH |
| 3 | OFF: server uses standard, more compact coordinate precision | sv_init.c:332-335 | `else { msg_coordsize = 2; msg_anglesize = 1; }` (2 bytes < 4 = more compact) | MATCH |
| 4 | Turning on requires clients supporting extended format; older clients cannot connect | sv_user.c:334-347 (fn Cmd_New_f, ucmds "new" @3301 = connect handshake) | `if (msg_coordsize > 2 && !(sv_client->fteprotocolextensions & FTE_PEXT_FLOATCOORDS)) { ... "Your client lacks the necessary extensions to connect..."; if (!sv_client->spectator) { SV_DropClient(sv_client); return; } }` | MATCH (players dropped; spectator nuance flagged) |
| 5 | 0 / empty = standard precision | sv_init.c:332-335 + sv_main.c:195 default `""` | empty/`0` -> `.value`==0 -> else branch coordsize 2 | MATCH |
| 6 | 1 = high-precision coords AND angles | sv_init.c:329-330 | `msg_coordsize = 4; msg_anglesize = 2;` (angles widened too: common.c:211 MSG_WriteAngle16 when anglesize==2) | MATCH (on "and angles"); threshold is any nonzero `.value`, not strictly literal 1 -- FYI |
| 7 | Default: off (empty) | sv_main.c:195 + :3575 | `cvar_t sv_bigcoords = {"sv_bigcoords", "", CVAR_SERVERINFO};` registered bare via `Cvar_Register(&sv_bigcoords)` | MATCH |
| 8 | Set by: server config | sv_main.c:195 | `CVAR_SERVERINFO` server-side cvar, normally settable; no CVAR_ROM/lock | MATCH |
| 9 | See also: sv_extlimits | sv_main.c:202 | `cvar_t sv_extlimits = { "sv_extlimits", "2" };` (related extended-limits server cvar) | MATCH (editorial, valid) |

**V-pass notes:** VERDICT: TRACED-CLEAN. Oracle confirmed 1.11-53-g18d0362. Every material clause maps to a located, verified enforcing line, including adjacent comments.

Mechanism chain traced end to end: registration sv_main.c:195 (default "", CVAR_SERVERINFO) + Cvar_Register sv_main.c:3575 -> read at SpawnServer sv_init.c:327 which sets the globals msg_coordsize (4 vs 2) and msg_anglesize (2 vs 1) -> these widths drive the wire encoders MSG_WriteCoord/MSG_WriteAngle (common.c:191/208) and MSG_ToCoord/MSG_FromCoord (common.c:46/60). The 2-byte path is 1/8-step short with range -4096..4096 (common.c:50 comment); the 4-byte path is a raw float, giving both extended range and finer precision -- so "high-precision (extended-range)" and the map-geometry rationale are both source-grounded, not name-inferred.

Client-compat clause is the strongest of the set and is NOT name/string inference: the actual SV_DropClient enforcement lives in Cmd_New_f (sv_user.c:334-347), the handler for the connection-handshake "new" ucmd (sv_user.c:3301), gated exactly on msg_coordsize>2 AND absent FTE_PEXT_FLOATCOORDS. sv_demo.c:1249-1253 independently corroborates ("fix up extensions to match sv_bigcoords ... sorry for old clients not working").

Compile-reachability checked: all sv_bigcoords sites are under #ifdef FTE_PEXT_FLOATCOORDS, which is defined under #ifdef PROTOCOL_VERSION_FTE; PROTOCOL_VERSION_FTE is defined unconditionally (protocol.h:31). So the cvar and its enforcement are compiled into any normal mvdsv build -- no runtime-dead concern.

Two FYI imprecisions that do NOT contradict the text as written (kept TRACED-CLEAN, not C-NEAR-MISS, because the description's literal claims hold): (a) the connect-drop exempts spectators (sv_user.c:344 `if (!sv_client->spectator)`) -- a non-floatcoords spectator is warned but NOT dropped; the description's "older clients will not be able to connect" is true for the player case the operator cares about but is slightly broader than code. (b) The "1 = ..." row is really "any nonzero .value" (sv_init.c:327 tests `.value`, not `==1`); presenting 1 as the canonical on-value is conventional and harmless. Neither is a flavour-C defect.

## flags_for_review

- [fyi/other/vpass] Connect-drop for missing FTE_PEXT_FLOATCOORDS exempts spectators: sv_user.c:344 `if (!sv_client->spectator) { SV_DropClient(sv_client); return; }`. A spectator on a non-floatcoords client is warned but allowed to stay (then SV_SkipCommsBotMessage path). The description's 'older clients will not be able to connect' is accurate for players but slightly over-broad vs spectators. FYI only -- the player-facing claim is the load-bearing one and it is correct.
- [fyi/other/vpass] Threshold is `if (sv_bigcoords.value)` (sv_init.c:327) -- ANY nonzero value enables bigcoords, not strictly the literal 1. The proposed '1 = ...' line is the conventional canonical on-value and is not wrong, but a value like 2 would also enable it.
- [fyi/other/vpass] sv_extlimits (See-also) is registered with default "2" (sv_main.c:202), is a related extended-limits server cvar, and notably ALSO gates on bspversion (sv_init.c:519). It is a reasonable cross-reference; no issue, recorded for completeness of the See-also justification.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_bigcoords",
  "type": "cvar",
  "description": "Switches the server to high-precision network coordinates, allowing maps with geometry that extends beyond the standard coordinate range to be played correctly. When off, the server uses the standard, more compact coordinate precision. Turning it on requires clients that support the extended coordinate format; older clients will not be able to connect.\n\n0 (or empty) = standard coordinate precision.\n1 = high-precision (extended-range) coordinates and angles.\n\nDefault: off (empty).\nSet by: server config.\nSee also: sv_extlimits.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_init.c:327. Registration src/sv_main.c:195 cvar_t sv_bigcoords = {\"sv_bigcoords\", \"\", CVAR_SERVERINFO} -> default empty (=0, off), and CVAR_SERVERINFO means the value is published in the server info string. Enforcing read-site src/sv_init.c:327 `if (sv_bigcoords.value)` (inside `#ifdef FTE_PEXT_FLOATCOORDS`, sv_init.c:326): nonzero -> `msg_coordsize = 4; msg_anglesize = 2` (sv_init.c:329-330); else `msg_coordsize = 2; msg_anglesize = 1` (sv_init.c:334-335) -- this is the network coordinate/angle field width, i.e. precision/range, hence the 'high-precision / extended-range' framing rather than a name restatement. The 'older clients cannot connect' clause is enforced indirectly via the protocol-extension negotiation: the demo/connection extension fixup at src/sv_demo.c:1250-1253 sets FTE_PEXT_FLOATCOORDS in the advertised extensions iff msg_coordsize==4, and the source comment at src/sv_demo.c:1249 states 'fix up extensions to match sv_bigcoords correctly. sorry for old clients not working.' -- I kept this as a hedged, user-observable consequence ('older clients will not be able to connect') rather than asserting an exact negotiation mechanism, and routed the precise cross-stack detail out. Side effect (not surfaced in the user doc): src/sv_ents.c:50-51 `if (msg_coordsize != 2) return false; // Do not allow nailhack in case of sv_bigcoords.` disables nail-update packing when bigcoords is on. F-MV1: grep of ktx/src for sv_bigcoords returns zero hits -> no KTX override; pure engine knob.",
  "description_proposed": null
}
```
