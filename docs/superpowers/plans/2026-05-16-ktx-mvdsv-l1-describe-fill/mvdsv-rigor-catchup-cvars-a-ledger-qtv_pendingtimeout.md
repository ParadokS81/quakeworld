# describe-fill-synthesis ledger -- mvdsv `qtv_pendingtimeout`

- **project:** mvdsv
- **knob:** `qtv_pendingtimeout` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qtv_pendingtimeout: synthesized -- seconds the server waits for a pending QTV/MVD stream handshake before dropping it -- origin=synthesized ref=src/sv_demo_qtv.c:236 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets how long, in seconds, the server waits for a connecting QTV/MVD stream client to finish its handshake before giving up and closing the connection. The countdown is measured from the connection's last activity; once it elapses the pending connection is dropped with a timeout notice.
>
> Default: 5.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 5 | src/sv_demo_qtv.c:28 | `static cvar_t qtv_pendingtimeout = {"qtv_pendingtimeout", "5"};` | MATCH |
| units seconds | src/sv_demo_qtv.c:236 | value added to `p->io_time` and compared to `Sys_DoubleTime()` (seconds) | MATCH |
| applies to pending (handshaking) stream connections | src/sv_demo_qtv.c:223,235 | `SV_MVD_RunPendingConnections` over `demo.pendingdest` | MATCH |
| measured from last activity (io_time) | src/sv_demo_qtv.c:236 | `if (p->io_time + qtv_pendingtimeout.value <= Sys_DoubleTime())` | MATCH |
| on expiry the connection is dropped | src/sv_demo_qtv.c:238-240,242-249 | `Con_Printf("Pending dest timeout"); p->error = true;` then close/free loop | MATCH |
| settable (not read-only) | src/sv_demo_qtv.c:1515 | `Cvar_Register (&qtv_pendingtimeout);` (no ROM flag) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Governs a connecting QTV/MVD stream client (scope = pending stream, distinct from established streams) | sv_demo_qtv.c:235-236 (loop over `demo.pendingdest`) | `for (p = demo.pendingdest; p; p = p->nextdest)\n\t\tif (p->io_time + qtv_pendingtimeout.value <= Sys_DoubleTime())` | MATCH (pending list only; established `mvddest_t` uses qtv_streamtimeout at sv_demo.c:221) |
| 2 | Value is in seconds | sv_demo_qtv.c:236 + :28 comment | `p->io_time + qtv_pendingtimeout.value <= Sys_DoubleTime()` ; `// 5  seconds must be enough` | MATCH (.value added to/compared against Sys_DoubleTime seconds) |
| 3 | "finish its handshake" (pending phase = initial protocol/challenge/userinfo parse before promotion) | sv_demo_qtv.c:86-102 (InitPendingStream: socket+challenge), :294-360 (recv + qizmo/QTV detection, userinfo parse) | `dst->io_time = Sys_DoubleTime();` ... `strlcpy(dst->challenge, ...)` ; `len = recv(p->socket, ...)` | MATCH (characterization; pending struct is the pre-established connect/parse phase) |
| 4 | On elapse, gives up and closes the connection | sv_demo_qtv.c:239 -> 242-250 | `p->error = true;` then `if (demo.pendingdest->socket != -1) closesocket(...); Q_free(demo.pendingdest);` | MATCH |
| 5 | Countdown measured from connection's LAST ACTIVITY (not connect-start only) | server.h:496 (field doc); sv_demo_qtv.c:92 (init), :278 (send), :300 (recv) | `double io_time; // when last IO occur on socket, so we can timeout this dest` ; `p->io_time = Sys_DoubleTime(); // update IO activity` | MATCH (io_time reset on every successful send/recv) |
| 6 | Dropped with a "timeout notice" | sv_demo_qtv.c:238 | `Con_Printf("Pending dest timeout\n");` | MATCH (server console log; NO client-facing message sent on drop -- notice is server-side only) |
| 7 | Default: 5 | sv_demo_qtv.c:28 + :1515 | `static cvar_t qtv_pendingtimeout = {"qtv_pendingtimeout",  "5"};` ; `Cvar_Register (&qtv_pendingtimeout);` | MATCH (struct-literal default; no Ex override, no cfg override anywhere in tree) |
| 8 | Set by: server config / rcon (plain server cvar, no special access flag) | sv_demo_qtv.c:1515 | `Cvar_Register (&qtv_pendingtimeout);` | MATCH (bare 2-field struct, no flags -> standard settable server cvar) |

**V-pass notes:** Oracle confirmed: mvdsv @ 1.11-53-g18d0362. Trace discipline applied per enforce-trace-discipline.md.

Wide read complete: only 3 use-sites exist, all in src/sv_demo_qtv.c -- registration struct (:28), the single enforcing comparison (:236), and Cvar_Register (:1515). No reads, overrides, or Cvar_Set on this cvar anywhere else in the tree; no .cfg override.

Every material clause enforce-traced to a located line + adjacent comment. The enforcing branch (:236) marks the pending dest as errored when `io_time + qtv_pendingtimeout.value <= Sys_DoubleTime()`; the subsequent drop loop (:242-250) closesocket+Q_free, which is the "gives up and closes" behavior. The "last activity" framing is exactly right: io_time is documented (server.h:496) as "when last IO occur on socket" and is reset on every successful send (:278) and recv (:300), not just at connect (:92).

Two soft spots, both traceable and not contradictory:
- "finish its handshake": a characterization of the pending phase, not a code token, but accurately grounded in the connect/challenge/recv/userinfo-parse logic of the pending struct (the pending dest is precisely the pre-promotion handshake phase; once promoted it becomes an mvddest_t governed by qtv_streamtimeout).
- "timeout notice": the only notice is the server-console `Con_Printf("Pending dest timeout\n")` at :238. The drop path sends NOTHING to the client. The phrase reads naturally as the server-side log line (which exists) and does not assert the client is notified, so it is minor vagueness, not a flavour-C inference. Acceptable under TRACED-CLEAN ("still-true minor vagueness that was traceable").

Both default (5) and access-class (server config/rcon) metadata verified per WI-2 against the registration, not inferred. Classification: TRACED-CLEAN.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qtv_pendingtimeout",
  "type": "cvar",
  "description": "Sets how long, in seconds, the server waits for a connecting QTV/MVD stream client to finish its handshake before giving up and closing the connection. The countdown is measured from the connection's last activity; once it elapses the pending connection is dropped with a timeout notice.\n\nDefault: 5.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_demo_qtv.c:236. Registered {\"qtv_pendingtimeout\",\"5\"} at src/sv_demo_qtv.c:28 -- default 5, units seconds (registration comment '5 seconds must be enough'). Single read at src/sv_demo_qtv.c:236 inside SV_MVD_RunPendingConnections (iterates demo.pendingdest, the list of incoming-but-not-yet-completed MVD/QTV stream destinations created by SV_MVD_InitPendingStream / 'MVD streaming client connected' at src/sv_demo_qtv.c:218,220): `if (p->io_time + qtv_pendingtimeout.value <= Sys_DoubleTime()) { Con_Printf(\"Pending dest timeout\\n\"); p->error = true; }` -- so the timeout is measured from p->io_time (last I/O on that pending connection) and on expiry the entry is flagged errored; the immediately following loop (src/sv_demo_qtv.c:242-250) closes the socket and frees it. Units = seconds (value compared directly against Sys_DoubleTime() seconds). Higher = longer grace before a stalled pending stream is dropped. No read-only flag; settable via server config / rcon. No KTX reference to this cvar (grep ktx/src empty).",
  "description_proposed": null
}
```
