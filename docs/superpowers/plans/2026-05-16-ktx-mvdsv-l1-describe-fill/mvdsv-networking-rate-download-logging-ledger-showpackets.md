# describe-fill-synthesis ledger -- mvdsv `showpackets`

- **project:** mvdsv
- **knob:** `showpackets` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:showpackets: synthesized -- truthy gates per-packet seq/ack/size console debug print (--> sent, <-- recv) in shared netchan code; default 0 -- origin=synthesized ref=src/net_chan.c:327 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Prints a console line for every network packet the engine sends and receives, as a network-debugging aid. Each line shows the packet's outgoing/incoming sequence number, the acknowledged sequence, and the packet size in bytes; outgoing packets are marked --> and incoming packets <--.
>
> 0 = off (no per-packet logging).
> 1 = log every sent and received packet.
>
> Default: 0.
> Set by: console (rcon on a dedicated server).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| Default 0 | src/net_chan.c:80 | `cvar_t showpackets = {"showpackets", "0"}` | MATCH |
| value truthy = on, 0 = off | src/net_chan.c:327 | `if (showpackets.value)` (and :377 same) | MATCH |
| logs outgoing packet, --> marker, seq/ack/size bytes | src/net_chan.c:332-337 | `Con_Printf("--> s=%i(%i) a=%i(%i) %i\n", chan->outgoing_sequence, send_reliable, chan->incoming_sequence, chan->incoming_reliable_sequence, send.cursize)` | MATCH |
| logs incoming packet, <-- marker, seq/ack/size bytes | src/net_chan.c:382-387 | `Con_Printf("<-- s=%i(%i) a=%i(%i) %i\n", sequence, reliable_message, sequence_ack, reliable_ack, net_message.cursize)` | MATCH |
| shared client/server netchan scope | src/net_chan.c:329,379 | `#ifndef SERVERONLY` guards only the Print_flags line, not the Con_Printf | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Prints a console line for every packet the engine SENDS | net_chan.c:327,332 | `if (showpackets.value)` ... `Con_Printf ("--> s=%i(%i) a=%i(%i) %i\n", ...)` | MATCH |
| 2 | ...and RECEIVES | net_chan.c:377,382 | `if (showpackets.value)` ... `Con_Printf ("<-- s=%i(%i) a=%i(%i) %i\n", ...)` | MATCH |
| 3 | (both fire in dedicated/SERVERONLY build) | net_chan.c:329-331,379-381 | `#ifndef SERVERONLY` wraps ONLY `Print_flags[Print_current] \|= PR_TR_SKIP;` -- the Con_Printf at :332/:382 is OUTSIDE the guard, so it compiles into the server | MATCH |
| 4 | network-debugging aid (characterization) | net_chan.c:101-103 | `Cvar_SetCurrentGroup(CVAR_GROUP_SCREEN); Cvar_Register (&showpackets);` (registered alongside showdrop, screen-debug group) | MATCH (non-load-bearing framing) |
| 5 | line shows outgoing/incoming SEQUENCE number (`s=`) | net_chan.c:333,383 | out: `, chan->outgoing_sequence` ; in: `, sequence` | MATCH |
| 6 | line shows the ACKNOWLEDGED sequence (`a=`) | net_chan.c:335,385 | out: `, chan->incoming_sequence` ; in: `, sequence_ack` | MATCH |
| 7 | line shows PACKET SIZE IN BYTES | net_chan.c:337,387 + common.h:33 | out: `, send.cursize` ; in: `, net_message.cursize` ; `sizebuf_t { ... byte *data; int maxsize; int cursize; }` (cursize = byte count) | MATCH |
| 8 | outgoing marked `-->`, incoming marked `<--` | net_chan.c:332,382 | `"--> s=..."` vs `"<-- s=..."` | MATCH |
| 9 | (field enumeration completeness) | net_chan.c:332-337,382-387 | actual format is `s=%i(%i) a=%i(%i) %i` -- the parenthesized `(%i)` reliable-bit fields (send_reliable / incoming_reliable_sequence out; reliable_message / reliable_ack in) are real visible output the closed "shows X, Y, and Z" list omits | MATCH-with-imprecision (still-true, traced) |
| 10 | 0 = off (no per-packet logging) | net_chan.c:327,377 | `if (showpackets.value)` -- false at 0.0, branch skipped | MATCH |
| 11 | 1 = log every sent+received packet | net_chan.c:327,377 + cvar.h:72 | `if (showpackets.value)` over `float value` -- gate is NON-ZERO, not `==1`; value 2 / 0.5 also logs | MATCH-with-imprecision (boolean-idiom; gate is non-zero) |
| 12 | Default: 0 (WI-2) | net_chan.c:80 | `cvar_t showpackets = {"showpackets", "0"};` -- registered default; no .cfg override (tree grep outside net_chan.c returns nothing); no CVAR_ROM | MATCH |
| 13 | Set by: console (rcon on dedicated server) | net_chan.c:80 | no `CVAR_ROM` flag -> user-settable; MVDSV is a dedicated server so runtime set channels are server console (stdin) + rcon | MATCH |

**V-pass notes:** CLASSIFICATION: TRACED-CLEAN. All four use-sites live in src/net_chan.c (registration :80/:103, two enforcing reads :327 outgoing and :377 incoming). Every material clause maps to a located, verified enforcing line; no clause is wrong; nothing is inferred from a name/enum/string without a read-site.

KEY TRACE RESULT (the non-obvious one): the description's "sends AND receives" claim is CORRECT for MVDSV specifically. The `#ifndef SERVERONLY` guards at :329-331 / :379-381 wrap ONLY the client-side `Print_flags[Print_current] |= PR_TR_SKIP;` line -- NOT the `Con_Printf` calls. The Con_Printf at :332 and :382 are outside the guard, so a dedicated (SERVERONLY) build logs both directions. A blind reader could have wrongly assumed the SERVERONLY guard suppressed the incoming/outgoing print on a server; it does not. Verified.

Packet-size-in-bytes verified by following the field to `sizebuf_t.cursize` (common.h:33), an `int` current-byte-count -- not inferred.

Default verified at the registered initializer (:80 `"0"`), not from any .cfg. Tree-wide grep returns ZERO showpackets references outside net_chan.c (no shipped-cfg drift, no second registration, no ROM flag).

TWO MINOR IMPRECISIONS, both still-true and both enforcement-traced (hence TRACED-CLEAN, not C-NEAR-MISS -- neither is name/enum inference and neither is wrong):
(a) Field enumeration is a CLOSED list ("Each line shows the sequence number, the acknowledged sequence, and the packet size") but the actual format string `s=%i(%i) a=%i(%i) %i` also emits parenthesized reliable-bit sub-fields after the sequence and the ack (send_reliable/incoming_reliable_sequence outgoing; reliable_message/reliable_ack incoming). The description's enumeration was clearly read off the format string (the `-->`/`<--` markers and s/a/size fields are verbatim), it just simplified away the `(R)` reliable flags. Completeness gap, not a contradiction.
(b) "1 = log" -- the gate is `if (showpackets.value)` over a float, i.e. ANY non-zero enables (2, 0.5 also log); it is not specifically `==1`. Standard boolean-cvar idiom; "1 = on" is the conventional reading and is true.

Neither imprecision rises to C-NEAR-MISS: the V-pass C-NEAR-MISS bar is "a clause is only name/enum/string/comment inference (no enforcing line, OR the real code is narrower/more conditional than implied)." Here the real code is BROADER than implied (any non-zero, both directions on server), not narrower, and every clause has a real enforcing read-site. Borderline-but-clean; flagged for FYI in case the operator wants the reliable-flag fields and the non-zero gate spelled out for max precision.

## flags_for_review

- [fyi/other/vpass] Field enumeration in the description is a closed list ('shows the sequence number, the acknowledged sequence, and the packet size') but the actual Con_Printf format is `s=%i(%i) a=%i(%i) %i` -- it also prints parenthesized reliable-bit sub-fields (send_reliable + incoming_reliable_sequence outgoing at net_chan.c:332-336; reliable_message + reliable_ack incoming at :382-386). Output is real and visible. FYI-only: still-true, traced, just an incomplete enumeration; operator may want '(with a reliable-message flag after each sequence)' added for max precision.
- [fyi/other/vpass] Threshold precision: gate is `if (showpackets.value)` over `float value` (cvar.h:72), so ANY non-zero enables logging (2, 0.5, etc.), not specifically 1. Description says '1 = log'. Standard boolean-cvar idiom and conventionally correct; FYI in case the operator standardizes the wording to 'non-zero = on' across the chunk.
- [fyi/suspected-bug/vpass] Latent pre-existing bug NOT introduced by this description, surfaced while tracing the outgoing path: net_chan.c:245 sets `chan->fatal_error = true;` immediately followed by an in-source comment `//FIXME: THIS DOES NOTHING`. Off-scope for showpackets (it is in the overflow branch of Netchan_Transmit, same function) but a real self-documented dead-write in the engine.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "showpackets",
  "type": "cvar",
  "description": "Prints a console line for every network packet the engine sends and receives, as a network-debugging aid. Each line shows the packet's outgoing/incoming sequence number, the acknowledged sequence, and the packet size in bytes; outgoing packets are marked --> and incoming packets <--.\n\n0 = off (no per-packet logging).\n1 = log every sent and received packet.\n\nDefault: 0.\nSet by: console (rcon on a dedicated server).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/net_chan.c:327. Registered net_chan.c:80 `cvar_t showpackets = {\"showpackets\", \"0\"}` -> Default 0 (WI-2: bare two-field cvar_t literal, no register-time override). Two enforcing read-sites, both `if (showpackets.value)`: net_chan.c:327 in Netchan_Transmit prints the OUTGOING line `Con_Printf(\"--> s=%i(%i) a=%i(%i) %i\\n\", chan->outgoing_sequence, send_reliable, chan->incoming_sequence, chan->incoming_reliable_sequence, send.cursize)` -> clauses: --> marker, outgoing sequence, ack sequence, packet size in bytes; net_chan.c:377 in Netchan_Process prints the INCOMING line `Con_Printf(\"<-- s=%i(%i) a=%i(%i) %i\\n\", sequence, reliable_message, sequence_ack, reliable_ack, net_message.cursize)` -> <-- marker, incoming sequence/ack, size. Polarity: `.value` truthy gates the print (1=log, 0=silent). Scope: both sites live in shared netchan code compiled into client and dedicated server (the `#ifndef SERVERONLY` only guards the Print_flags PR_TR_SKIP line, not the print itself), so the toggle is a console/rcon debug print on either build -- Set-by stated as console / rcon on a dedicated server, not server-config-only.",
  "description_proposed": null
}
```
