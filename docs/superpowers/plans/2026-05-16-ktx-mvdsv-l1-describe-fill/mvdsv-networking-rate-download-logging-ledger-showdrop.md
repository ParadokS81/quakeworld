# describe-fill-synthesis ledger -- mvdsv `showdrop`

- **project:** mvdsv
- **knob:** `showdrop` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:showdrop: synthesized -- network diagnostic toggle; non-zero prints out-of-order/dropped-packet notices (per client addr) to console, packet handling unchanged -- origin=synthesized ref=src/net_chan.c:416 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Toggles a network diagnostic: when on, the server prints a console message whenever it receives an out-of-order packet or detects that packets were dropped (lost) for a connection.
>
> 0 = no such messages are printed.
> 1 = print 'Out of order packet' and 'Dropped N packets' notices to the console (each tagged with the client's network address).
>
> This only affects console output; packet handling is unchanged either way.
>
> Default: 0.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| non-zero prints 'Out of order packet' for stale/dup packets | src/net_chan.c:393-404 | `if (sequence <= ...incoming_sequence) { if (showdrop.value) { ... Con_Printf("%s:Out of order packet %i at %i\n", ...) } return false; }` | MATCH |
| non-zero prints 'Dropped N packets' on a sequence gap | src/net_chan.c:412-425 | `if (chan->dropped > 0) { chan->drop_count += 1; if (showdrop.value) { ... Con_Printf("%s:Dropped %i packets at %i\n", ...) } }` | MATCH |
| messages tagged with client address | src/net_chan.c:401,422 | `NET_AdrToString (chan->remote_address)` | MATCH |
| zero = silent (polarity) | src/net_chan.c:395,416 | `if (showdrop.value)` guards only the Con_Printf | MATCH |
| packet handling unchanged by the cvar | src/net_chan.c:405,411-414 | `return false;` and `chan->dropped = ...; chan->drop_count += 1;` are outside the showdrop guard | MATCH |
| default 0 | src/net_chan.c:81 | `cvar_t showdrop = {"showdrop", "0"}` | MATCH |
| no KTX override | ktx/src (grep) | (no match for showdrop) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | ON: prints on out-of-order packet (1st branch) | net_chan.c:393-395 | `if (sequence <= (unsigned)chan->incoming_sequence) {` ... `if (showdrop.value) {` | MATCH |
| 2 | ON: prints on detected dropped packets (2nd branch) | net_chan.c:412-416 | `if (chan->dropped > 0) {` `chan->drop_count += 1;` `if (showdrop.value) {` | MATCH |
| 3 | OFF: 0 = no messages printed | net_chan.c:395 & 416 | `if (showdrop.value)` (gates both Con_Printf) | MATCH |
| 4 | Message text 'Out of order packet' | net_chan.c:400 | `Con_Printf ("%s:Out of order packet %i at %i\n"` | MATCH |
| 5 | Message text 'Dropped N packets' | net_chan.c:421 | `Con_Printf ("%s:Dropped %i packets at %i\n"` | MATCH |
| 6 | Each message tagged with client's network address | net_chan.c:401, 422 | `, NET_AdrToString (chan->remote_address)` (1st arg of both prints) | MATCH |
| 7 | Side-effect: only console output, packet handling unchanged (1st branch discard) | net_chan.c:405 | `return false;` -- OUTSIDE the showdrop `if`, executes regardless | MATCH |
| 8 | Side-effect: packet handling unchanged (2nd branch state still updated) | net_chan.c:411,414,438 + sv_user.c:4261 | `chan->dropped = ...` / `chan->drop_count += 1;` / `chan->incoming_sequence = sequence;` all outside gate; `net_drop = cl->netchan.dropped;` consumed independently | MATCH |
| 9 | Default: 0 | net_chan.c:81 | `cvar_t showdrop = {"showdrop", "0"};` (registered default, no cfg-drift) | MATCH |
| 10 | Set by: server config / rcon | net_chan.c:81, 104 | `{"showdrop", "0"}` (no CVAR_ROM/USERINFO flags) + `Cvar_Register (&showdrop);` | MATCH |
| 11 | Threshold framing "1 = print" | net_chan.c:395, 416 | gate is `showdrop.value` (any nonzero), not `==1` | MATCH (conventional 0/1 toggle; still-true vagueness, traceable) |

**V-pass notes:** All 11 material clauses enforce-trace to located lines in net_chan.c (function Netchan_Process, registration block) with adjacent comments confirming intent; no clause contradicts its enforcing line and none is name/string/enum inference lacking a read-site. Full trace:

POLARITY/ON-STATE (clauses 1-2): Two read-sites, both `if (showdrop.value)`. Branch 1 (net_chan.c:393) fires when `sequence <= chan->incoming_sequence` -- comment line 391 labels it "discard stale or duplicated packets"; prints "Out of order packet". Branch 2 (net_chan.c:412) fires when `chan->dropped > 0` (gap in sequence numbers); prints "Dropped N packets". Both gated solely on showdrop being nonzero. MATCH.

OFF-STATE (clause 3): default "0" -> showdrop.value is 0 -> both `if (showdrop.value)` are false -> no Con_Printf. MATCH.

MESSAGE STRINGS + ADDRESS (clauses 4-6): Verbatim "%s:Out of order packet %i at %i\n" (line 400) and "%s:Dropped %i packets at %i\n" (line 421); the leading `%s` is `NET_AdrToString(chan->remote_address)` in both (lines 401, 422). Description's "Out of order packet" / "Dropped N packets" / "tagged with client's network address" are faithful (format is `addr:` colon-prefixed). MATCH.

SIDE-EFFECT "console output only; packet handling unchanged" (clauses 7-8) -- the load-bearing claim, traced hardest: Branch 1's `return false;` (line 405) sits AFTER the closing brace of the showdrop `if` (line 404), so the stale/dup packet is discarded whether or not showdrop is set -- showdrop does not change the discard. Branch 2: `chan->dropped` (411), `chan->drop_count += 1` (414), and the later `chan->incoming_sequence = sequence` (438) all execute outside the showdrop gate; `chan->dropped` is read independently at sv_user.c:4261 (`net_drop = cl->netchan.dropped`) and `drop_count` is reset per-client in sv_user.c:1003 / pr2_cmds.c:2241 (net.h:230 "dropped packets, cleared each level"). So showdrop is purely a logging toggle; packet/state handling is identical either way. MATCH.

DEFAULT (clause 9, WI-2): `cvar_t showdrop = {"showdrop", "0"}` (net_chan.c:81) -- registered default is "0", verified in source, not inferred from a shipped cfg. MATCH.

SET-BY (clause 10, WI-2): registration carries only name+default, no CVAR_ROM/CVAR_USERINFO/etc., registered via plain Cvar_Register under CVAR_GROUP_SCREEN (a help-grouping category, not an access gate) -- so it is an ordinary settable cvar (config / rcon set). MATCH.

THRESHOLD (clause 11): the gate is `showdrop.value` (any nonzero truthy), so strictly the ON condition is "nonzero," not literally "1." Describing it as "1" for a 0/1 toggle is the fleet-wide convention and is traceable (not a false narrowing, not name/string inference) -- acceptable still-true vagueness under TRACED-CLEAN, NOT a C-NEAR-MISS.

BUILD CONTEXT (validates server-console framing): mvdsv compiles with SERVERONLY defined (CMakeLists.txt:169 `target_compile_definitions(... PRIVATE SERVERONLY)`), so the `#ifndef SERVERONLY` lines (`Print_flags[Print_current] |= PR_TR_SKIP;`) are compiled out and the Con_Printf drop notices go to the server console -- the description's "the server prints a console message" is correct for the actual mvdsv build.

Net: zero MISMATCH, zero UNTRACEABLE. Classification TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] Description's opening sentence calls branch-1 an 'out-of-order packet', but the actual trigger condition is sequence <= chan->incoming_sequence (net_chan.c:393) -- mechanically that is a STALE/OLD/DUPLICATE packet (sequence number not advancing), which the comment at line 391 calls 'stale or duplicated'. The engine's own printed string is literally 'Out of order packet', so the description is faithful to engine terminology and this is NOT a defect; flagging only because 'stale/duplicate' is the more precise mechanical reading if a future edit wants tighter wording.
- [fyi/other/vpass] The 'Out of order packet' branch ALSO covers exact-duplicate packets (sequence == incoming_sequence satisfies sequence <= incoming_sequence), not only strictly-earlier ones. The description's single phrase 'out-of-order packet' subsumes both old and duplicate; accurate enough but the duplicate case is not separately called out. FYI only.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "showdrop",
  "type": "cvar",
  "description": "Toggles a network diagnostic: when on, the server prints a console message whenever it receives an out-of-order packet or detects that packets were dropped (lost) for a connection.\n\n0 = no such messages are printed.\n1 = print 'Out of order packet' and 'Dropped N packets' notices to the console (each tagged with the client's network address).\n\nThis only affects console output; packet handling is unchanged either way.\n\nDefault: 0.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/net_chan.c:416. showdrop is a console-diagnostic toggle read in Netchan_Process (the incoming-packet handler). Two enforcing sites: src/net_chan.c:395 `if (showdrop.value)` -> `Con_Printf(\"%s:Out of order packet %i at %i\\n\", NET_AdrToString(chan->remote_address), sequence, chan->incoming_sequence)` for stale/duplicate packets (sequence <= incoming_sequence); src/net_chan.c:416 `if (showdrop.value)` -> `Con_Printf(\"%s:Dropped %i packets at %i\\n\", ...)` when a sequence gap is detected (chan->dropped > 0). Polarity: non-zero prints, zero is silent. 'Packet handling unchanged' is enforced because the discard `return false;` (src/net_chan.c:405) and `chan->dropped`/`drop_count` accounting (src/net_chan.c:411-414) happen OUTSIDE the showdrop guard -- the cvar wraps only the Con_Printf calls. Default `\"0\"` from registration literal src/net_chan.c:81 `cvar_t showdrop = {\"showdrop\", \"0\"}`. Set-by: plain cvar_t, registered src/net_chan.c:104 -> server config / rcon. F-MV1: grep of ktx/src for showdrop = NONE (engine netchan layer), so this documents live MVDSV behavior. (The `#ifndef SERVERONLY` Print_flags PR_TR_SKIP lines at :398/:419 are client-build colorization only and do not change the server-observable behavior.)",
  "description_proposed": null
}
```
