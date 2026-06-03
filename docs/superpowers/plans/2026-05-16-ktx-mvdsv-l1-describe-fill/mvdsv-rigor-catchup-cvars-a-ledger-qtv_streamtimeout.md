# describe-fill-synthesis ledger -- mvdsv `qtv_streamtimeout`

- **project:** mvdsv
- **knob:** `qtv_streamtimeout` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qtv_streamtimeout: synthesized -- seconds an outbound QTV/MVD stream may stall (no successful send) before the server closes it; enforced at the DEST_STREAM flush check -- origin=synthesized ref=src/sv_demo.c:221 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets how long an outbound QTV/MVD stream connection may stall before the server drops it. If no data is successfully sent to a connected QTV proxy or stream client for this many seconds, the server closes that stream destination.
>
> Value is in seconds; raising it tolerates longer network stalls before disconnecting a stream, lowering it drops stalled streams sooner.
>
> Default: 45.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| drops stalled stream after N seconds | src/sv_demo.c:221 | `if (d->io_time + qtv_streamtimeout.value <= Sys_DoubleTime())` | MATCH |
| effect = mark dest errored / close | src/sv_demo.c:225-226 | `Sys_Printf("DestFlush: stream timeout\n"); d->error = true;` | MATCH |
| io_time = last successful send time | src/sv_demo.c:244 | `d->io_time = Sys_DoubleTime(); // update IO activity` | MATCH |
| io_time meaning (socket timeout clock) | src/server.h:467 | `double io_time; // when last IO occur on socket, so we can timeout this dest` | MATCH |
| unit = seconds, default 45 | src/sv_demo_qtv.c:30 | `cvar_t qtv_streamtimeout = {"qtv_streamtimeout", "45"}; // 45 seconds` | MATCH |
| settable via config/rcon (not blocklisted) | src/sv_main.c:1754-1764 | blocklist lacks qtv_streamtimeout | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Scope: outbound QTV/MVD stream connection (drops it when stalled) | sv_demo.c:220-221 (gate); sv_demo_qtv.c:66,79 (dest origin) | `case DEST_STREAM:` / `if (d->io_time + qtv_streamtimeout.value <= Sys_DoubleTime())` ; `dst->desttype = DEST_STREAM;` ... `Con_Printf("Connected to QTV...")` | MATCH -- timeout fires only inside `case DEST_STREAM`; every DEST_STREAM dest is a QTV TCP stream |
| 2 | "no data successfully sent for N seconds" -> server closes the stream dest | sv_demo.c:221, 226, 244, 274 | `if (d->io_time + qtv_streamtimeout.value <= Sys_DoubleTime())` ... `d->error = true;` ; `d->io_time = Sys_DoubleTime(); // update IO activity` (only on `len > 0`) ; `DestClose(t, false);` | MATCH -- io_time refreshes only on a successful `send()` (len>0); on timeout error=true, dest is DestClose'd |
| 3 | "connected QTV proxy or stream client" | sv_demo_qtv.c:35,66,78-82 (SV_InitStream) | `dst->desttype = DEST_STREAM;` ... `if (dst->qtvname[0]) Con_Printf("Connected to QTV(%s)") else Con_Printf("Connected to QTV")` | MATCH (plain-English gloss) -- code gates only on DEST_STREAM and does not sub-distinguish proxy vs client; both are DEST_STREAM, so the phrasing does not contradict the code |
| 4 | Value is in seconds | sv_demo.c:221 ; sv_demo_qtv.c:30 | `d->io_time + qtv_streamtimeout.value <= Sys_DoubleTime()` (added to a Sys_DoubleTime seconds value) ; `{"qtv_streamtimeout", "45"}; // 45 seconds` | MATCH |
| 5 | Polarity: raising tolerates longer stalls; lowering drops sooner | sv_demo.c:221 | `if (d->io_time + qtv_streamtimeout.value <= Sys_DoubleTime())` | MATCH -- larger value pushes the `<=` trigger later (more tolerance), smaller fires earlier |
| 6 | Default: 45 | sv_demo_qtv.c:30 (registered default); sv_demo_qtv.c:1516 (Cvar_Register) | `cvar_t qtv_streamtimeout = {"qtv_streamtimeout", "45"};` ; `Cvar_Register(&qtv_streamtimeout);` | MATCH (WI-2: registered default, no cfg-drift involved) |
| 7 | Set by: server config / rcon | sv_demo_qtv.c:1516 | `Cvar_Register(&qtv_streamtimeout);` (no CVAR_ROM/SERVERINFO/read-only flag) | MATCH -- plain registered server cvar; nothing restricts it from config/rcon |

**V-pass notes:** Single enforcing read-site: sv_demo.c:221, inside `DestFlush()` -> `case DEST_STREAM`. Registration + default live in a different file (sv_demo_qtv.c:30), Cvar_Register at sv_demo_qtv.c:1516 -- traced both per WI-1/WI-2. Full enforcement chain verified end-to-end: io_time is seeded at dest creation (sv_demo_qtv.c:70) and refreshed at sv_demo.c:244 ONLY when send() returns len>0 (data actually pushed through the socket); the timeout at line 221 compares `io_time + qtv_streamtimeout.value` against now, and on fire sets `d->error = true` (line 226) which the loop at sv_demo.c:269-275 turns into a `DestClose`. So "no data successfully sent for N seconds -> drop the stream" is exactly what the code does. Adjacent comment (lines 223-224) reinforces the semantics: send() has an internal buffer so the timeout may lag actual peer death by the buffer-drain time -- this nuance is omitted from the description but does not contradict any clause (it is an engine-internal latency caveat, not user-doc material).

All 6 material clauses + the WI-2 default + the Set-by metadata MATCH their enforcing lines. Default 45 is the REGISTERED literal, not a shipped-cfg value -- WI-2 clean. The cvar is registered with no special flags, so "server config / rcon" is correct and nothing makes it read-only or serverinfo.

Polarity and units both confirmed at the comparison site. No OFF-state clause is asserted by the description (there is none in code -- value 0 would just make the timeout fire whenever io_time <= now, but the description makes no zero-special claim, so nothing to verify there).

Scope is correctly bounded to ESTABLISHED streams: a SEPARATE cvar qtv_pendingtimeout (default 5, sv_demo_qtv.c:236) governs streams still in the pending/handshake state. qtv_streamtimeout touches only DEST_STREAM (post-connect) dests. The description's "connected QTV proxy or stream client" wording correctly stays on the connected side and does not bleed into pending-timeout territory. Clean separation, not a defect.

Verdict: TRACED-CLEAN. No flavour-C inference detected; no clause rests on name/enum/string/comment alone.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qtv_streamtimeout",
  "type": "cvar",
  "description": "Sets how long an outbound QTV/MVD stream connection may stall before the server drops it. If no data is successfully sent to a connected QTV proxy or stream client for this many seconds, the server closes that stream destination.\n\nValue is in seconds; raising it tolerates longer network stalls before disconnecting a stream, lowering it drops stalled streams sooner.\n\nDefault: 45.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_demo.c:221. Enforcing read-site: src/sv_demo.c:221 `if (d->io_time + qtv_streamtimeout.value <= Sys_DoubleTime())` -> on a DEST_STREAM destination, marks `d->error = true` and prints \"DestFlush: stream timeout\" (sv_demo.c:225-226), which tears down the stream dest. Unit=seconds (added to a Sys_DoubleTime() wall-clock value). `d->io_time` semantics: updated to current time on every successful send (sv_demo.c:244 `d->io_time = Sys_DoubleTime(); // update IO activity`) and initialized at stream creation (sv_demo_qtv.c:70,92); server.h:467/496 comment `// when last IO occur on socket, so we can timeout this dest`. So the clause \"time since last successful send\" is enforced. Default \"45\" verified at the registered cvar_t literal src/sv_demo_qtv.c:30 `cvar_t qtv_streamtimeout = {\"qtv_streamtimeout\", \"45\"}; // 45 seconds` (registered sv_demo_qtv.c:1516). Set-by: not present on the normal-rcon blocklist (sv_main.c:1754-1764), so normal/admin rcon and server config can both set it -> 'server config / rcon'. F-MV1: grep of ktx/src finds no qtv_streamtimeout override; this is engine-only QTV transport plumbing.",
  "description_proposed": null
}
```
