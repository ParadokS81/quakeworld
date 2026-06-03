# describe-fill-synthesis ledger -- mvdsv `maxfps`

- **project:** mvdsv
- **knob:** `maxfps` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:maxfps: synthesized -- server packet/update rate cap published to clients for pacing, clamped 20-1000 else 77 -- origin=synthesized ref=src/sv_user.c:4520 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Publishes a recommended packet rate (packets per second) in the server info -- classic QuakeWorld clients read it to pace how often they send to the server. The cvar is named 'maxfps' but means max packets-per-second; the server does NOT cap its own outgoing traffic by it. The value is also used internally for bot-physics and antilag prediction timing, where anything outside 20-1000 is treated as 77 (the published value itself is left unclamped).
>
> Default: 77.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 77 | src/sv_main.c:50 | `cvar_t sv_maxfps = {"maxfps", "77", CVAR_SERVERINFO};` | MATCH |
| published in server info / clients pace packets | src/sv_main.c:50-52 | `CVAR_SERVERINFO` + comment `max packets per second... clients relay on its name 'maxfps'` | MATCH |
| values outside 20-1000 treated as 77 | src/sv_user.c:4522-4523 | `if (max_physfps < 20 || max_physfps > 1000) max_physfps = 77.0;` | MATCH |
| same clamp at second read-site | src/sv_phys.c:1036-1038 | `if (max_physfps < 20 || max_physfps > 1000) { max_physfps = 77.0; }` | MATCH |
| .value is the read input | src/sv_user.c:4520 | `double target_time, max_physfps = sv_maxfps.value;` | MATCH |
| settable (not read-only) | src/sv_main.c:3480 | `Cvar_Register (&sv_maxfps);` (no ROM flag) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|------------------|---------|
| C1 | "Caps the server's outgoing update rate, in packets per second" (server-side throttle) | NONE for outgoing-packet path. Actual outgoing gate: src/sv_send.c:1179-1182 + src/net_chan.c:199-206 | sv_send.c:1179 `if (!c->send_message) continue;` ; sv_send.c:1182 `if (!sv.paused && !Netchan_CanPacket (&c->netchan))` ; net_chan.c:206 `return (chan->cleartime < curtime + MAX_BACKUP * chan->rate) ? true : false;` (rate set net_chan.c:186 `chan->rate = 1.0/2500;`). maxfps absent from sv_send.c entirely. Its ONLY consumers: src/sv_phys.c:1031/1046/1057 (bot physics frame rate) and src/sv_user.c:4520/4530 (antilag prediction). | MISMATCH |
| C2a | "published in the server info" | src/cvar.c:157-159 (via CVAR_SERVERINFO flag, src/sv_main.c:50) | cvar.c:157 `if (var->flags & CVAR_SERVERINFO)` -> cvar.c:159 `SV_ServerinfoChanged (var->name, var->string);` ; sv_main.c:50 `cvar_t sv_maxfps = {"maxfps", "77", CVAR_SERVERINFO};` | MATCH |
| C2b | "so connecting clients pace their own packet rate to match" (client behavior) | Not in this server-only repo; corroborated by author comment sv_main.c:50-52 | sv_main.c:50 `// It actually should be called maxpps (max packets per second).` ; sv_main.c:52 `// ...clients relay on its name 'maxfps' already.` | UNTRACEABLE (server-only oracle; client-side, not enforceable here) |
| C3 | "Values outside 20-1000 are ignored and treated as 77" (stated as global) | src/sv_phys.c:1036-1038 AND src/sv_user.c:4522-4523 -- but LOCAL to bot/antilag consumers, no write-back | sv_phys.c:1036 `if (max_physfps < 20 || max_physfps > 1000) {` / 1037 `max_physfps = 77.0;` ; sv_user.c:4522 `if (max_physfps < 20 || max_physfps > 1000)` / 4523 `max_physfps = 77.0;`. Clamps a LOCAL `max_physfps` var only; cvar value + published serverinfo string are NOT clamped (no `Cvar_Set`/write-back to sv_maxfps anywhere). | MISMATCH (scope overstated: local to bot/antilag math, not global; clients reading serverinfo see the unclamped value) |
| C4 | "Default: 77" | src/sv_main.c:50 + src/sv_main.c:3480 | sv_main.c:50 `... = {"maxfps", "77", CVAR_SERVERINFO};` ; sv_main.c:3480 `Cvar_Register (&sv_maxfps);` (no OnChange, no override) | MATCH |
| C5 | "Set by: server config / rcon" | src/sv_ccmds.c:1442-1445 (serverinfo command) + registered cvar | sv_ccmds.c:1442 `var = Cvar_Find(key);` / 1443 `if (var && (var->flags & CVAR_SERVERINFO))` / 1445 `Cvar_Set (var, value);`. CVAR_SERVERINFO server cvar; settable in config or via serverinfo/rcon; not player-accessible. | MATCH |

**V-pass notes:** Oracle confirmed: `git describe --tags` == 1.11-53-g18d0362. Trace discipline file read and applied per-clause with callee-follow.

Wide-grep: maxfps appears in exactly 4 files -- src/sv_main.c (registration sv_main.c:50, register sv_main.c:3480), src/server.h:727 (extern), src/sv_phys.c (SV_RunBots: 1031/1036/1046/1057), src/sv_user.c (antilag: 4520/4522/4530). No other read-sites tree-wide.

WHY C-FIX (not C-NEAR-MISS): The leading, defining clause C1 -- "Caps the server's outgoing update rate, in packets per second" -- asserts SERVER-SIDE throttling of outgoing client packets. Tracing the actual outgoing-packet path (SV_SendClientMessages -> Netchan_CanPacket) shows the server gates outgoing packets on (a) c->send_message, set when a client packet arrives [client-driven, sv_send.c:1179], and (b) the bandwidth choke via chan->rate = 1/2500 [net_chan.c:186,206] -- NEVER on maxfps. maxfps is absent from sv_send.c entirely. The server does NOT cap its own outgoing rate by maxfps; the traced enforcing path CONTRADICTS the clause. This is the autotrack/flavour-C pattern: a confident behavioral claim inferred from the knob's serverinfo NAME / historical "max packets per second" meaning (author comment sv_main.c:50: "It actually should be called maxpps"), asserted as server enforcement, with the enforcing code never traced. Per PROC-1 + the autotrack precedent in the discipline doc, a defining behavioral clause whose enforcing path contradicts it is C-FIX, not a near-miss.

What maxfps ACTUALLY does in MVDSV (the omitted real behavior): it is a CVAR_SERVERINFO value published to clients (the serverinfo CONTRACT -- classic QW client reads it to self-pace pps, corroborated by the author comment but NOT enforceable in this server-only repo), and its `.value` is consumed SERVER-SIDE in exactly two places -- bot physics frame rate (SV_RunBots) and antilag prediction timing (sv_user.c) -- each clamping a LOCAL copy to 77 when out of [20,1000]. The description inverts the emphasis: it foregrounds an unenforced server-throttle claim and omits the two genuine server-side consumers.

C3 reinforces the defect: "Values outside 20-1000 are ignored and treated as 77" is stated globally but the clamp is LOCAL to the bot/antilag math (local var max_physfps); there is no write-back to the cvar (grep for `Cvar_Set.*maxfps` / `sv_maxfps =` finds only the static init). A client reading maxfps from serverinfo sees the UNCLAMPED value, so "ignored and treated as 77" is false for the published/client-facing value and true only inside the two internal consumers.

Correct clauses (keep): C2a serverinfo publication [cvar.c:157-159], C4 default 77 [sv_main.c:50 + register 3480, no OnChange], C5 set by server config/rcon [sv_ccmds.c:1442-1445, CVAR_SERVERINFO, server-admin scope]. These three are clean.

Re-synth guidance (seed for B4): C1+C3 are the wrong/overstated clauses; the fix is to (1) reframe maxfps as a serverinfo value clients read to pace their own pps (the historical maxpps contract) rather than a server-side outgoing cap, (2) state the two genuine server-side consumers (bot physics rate + antilag prediction), and (3) scope the 20-1000->77 clamp to those internal consumers (local, not a write-back; serverinfo value itself is unclamped). C2a/C4/C5 carry forward as-is.

## flags_for_review

- [fyi/cross-mod-override/synthesis] KTX also registers and reads 'maxfps' (ktx/src/world.c:772 RegisterCvarEx("maxfps","77"); ktx/src/world.c:1580-1585 reads it into current_maxfps and re-clamps to a DIFFERENT range bound(50,current_maxfps,1981) with fallback 77; ktx/src/client.c:3859 polices client-reported fps against current_maxfps + 2). So on a live KTX server the mod independently consumes the same cvar with a wider clamp [50,1981] and uses it to police player framerate -- a cross-mod consequence beyond the engine's own [20,1000] packet-rate clamp. Candidate 'See also' L3 (cross-stack maxfps), not inlined since it does not change how the admin sets the base value.
- [blocker/contradiction/vpass] C1 (defining clause) asserts server-side capping of outgoing packet rate by maxfps. Traced outgoing path SV_SendClientMessages (sv_send.c:1179-1182) -> Netchan_CanPacket (net_chan.c:199-206) gates on c->send_message (client-driven) and chan->rate (1/2500 bandwidth), NOT maxfps. maxfps is absent from sv_send.c. Clause contradicts enforcing code -> C-FIX.
- [review/runtime-dead-suspect/vpass] maxfps SERVER-SIDE effect is narrow: only SV_RunBots bot-physics frame rate (sv_phys.c:1031/1046/1057, gated #ifdef USE_PR2 + #ifdef SERVERONLY for the rate-limit branch) and antilag prediction (sv_user.c:4520, gated by sv_antilag.value). On a server with no bots and antilag off, sv_maxfps.value has NO server-side consumer at all -- it is purely a serverinfo string clients read. The description's real-behavior re-synth should reflect this conditionality.
- [fyi/other/vpass] Clamp-to-77 (sv_phys.c:1036-1038, sv_user.c:4522-4523) is LOCAL (var max_physfps), never written back to the cvar. Confirmed no `Cvar_Set` on sv_maxfps and no `sv_maxfps =` assignment tree-wide besides the static initializer. Published serverinfo value is therefore unclamped -- a client can read an out-of-range maxfps from serverinfo.
- [fyi/other/vpass] C2b ('clients pace their own packet rate to match') is a client-side behavior unverifiable in this server-only repo. Corroborated only by author comment (sv_main.c:50-52). Marked UNTRACEABLE rather than MATCH/MISMATCH -- correct in spirit (the serverinfo contract) but outside the MVDSV oracle's enforcement surface.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "maxfps",
  "type": "cvar",
  "description": "Publishes a recommended packet rate (packets per second) in the server info -- classic QuakeWorld clients read it to pace how often they send to the server. The cvar is named 'maxfps' but means max packets-per-second; the server does NOT cap its own outgoing traffic by it. The value is also used internally for bot-physics and antilag prediction timing, where anything outside 20-1000 is treated as 77 (the published value itself is left unclamped).\n\nDefault: 77.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:4520. Registered {\"maxfps\",\"77\",CVAR_SERVERINFO} at src/sv_main.c:50 -- default 77, published to server info (CVAR_SERVERINFO) under the name 'maxfps' that clients rely on (registration comment src/sv_main.c:50-52: 'should be called maxpps (max packets per second)... clients relay on its name maxfps already'). Read at src/sv_user.c:4520 (antilag prediction window) and src/sv_phys.c:1031 (bot physics step); BOTH enforce the clamp 'if (max_physfps < 20 || max_physfps > 1000) max_physfps = 77.0' (src/sv_user.c:4522-4523, src/sv_phys.c:1036-1038), so values outside [20,1000] fall back to 77. The 'packets per second' framing and serverinfo-publication-for-client-pacing is enforced by the CVAR_SERVERINFO flag + the registration comment; the client-pacing clause is kept inline per D20 because an admin sets maxfps precisely to cap the client packet rate (action-changing). Default verified against the cvar_t literal (WI-2). No read-only flag; settable via server config / rcon. The two internal .value reads (bot-frame rate, antilag interpolation target_time = src/sv_user.c:4530) are implementation detail and kept out of the user doc.",
  "description_proposed": null
}
```
