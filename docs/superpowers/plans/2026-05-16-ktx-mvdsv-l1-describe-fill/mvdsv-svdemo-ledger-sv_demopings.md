# D6 describe-fill ledger -- mvdsv `sv_demopings`

- **Skill:** `describe-fill-synthesis` (Opus 4.7 MAX, spec-locked dial), MAX reasoning effort.
- **Project / knob / type:** mvdsv / `sv_demopings` / cvar.
- **Anchor version:** `1.11-53-g18d0362` (HARD GATE: `git describe --tags` printed `1.11-53-g18d0362` -- PASS).
- **L1 entity:** `mvdsv:cvar:sv_demopings`, `source_state=source_backed`, `help_desc=null` (cold-synth confirmed), registered default `"3"`, `flag_names=[]`.
- **mechanical_candidate:** none (cold-synth -- no trailing comment, no shipped-config candidate).
- **suspect_pool_member:** FALSE (verified vs Phase-0 C3 pool -- not runtime-dead). C3 dead-stamp path skipped.
- **Verdict:** `synthesized` (no comment to affirm -> Step 5 synthesis from read use-sites).
- **Confidence:** high (every clause enforce-traced to its line; behavior fully source-legible).

## Final user-facing `description`

> Records each connected player's ping and packet loss into the MVD demo at a
> fixed interval, so viewers watching the recorded demo can see live
> ping/packet-loss readouts. The value is the number of seconds between those
> updates.
>
> 0 = do not record pings in the demo.
> A higher value records them less often; a lower value records them more often.
>
> Default: 3.
> Set by: server config.

(No file:line / engine jargon in `description` per D20 -- all cites live in the enforce-trace table + `description_reasoning` below.)

## Read use-sites (Step 1)

- **Registration (LOCATOR AID, not the citation):** `src/sv_demo.c:42` --
  `cvar_t sv_demoPings = {"sv_demopings", "3"};` (registered name string is
  lowercase `sv_demopings`; C VARIABLE is `sv_demoPings`); registered at
  `src/sv_demo.c:1843` via `Cvar_Register (&sv_demoPings);`. No `CVAR_*` flags,
  no OnChange handler.
- **Declaration:** `src/server.h:993` `extern cvar_t sv_demoPings;`; local extern
  re-decl at `src/sv_send.c:1318`.
- **THE READ / CONSUME SITE:** `SV_SendDemoMessage()` in `src/sv_send.c`:
  - `sv_send.c:1351` -- `if ((int)sv_demoPings.value)` -- OFF-state gate
    (int-truncated; 0 skips the whole ping block).
  - `sv_send.c:1353` -- `if (curtime - demo.pingtime > sv_demoPings.value)` --
    elapsed-time-since-last-write threshold; value = seconds.
  - `sv_send.c:1355` -- `SV_MVDPings();` -- the side-effect (callee).
  - `sv_send.c:1356` -- `demo.pingtime = curtime;` -- resets the interval timer.
  - Callee `SV_MVDPings()` `src/sv_send.c:1221-1241` -- per spawned client writes
    `svc_updateping` + `SV_CalcPing(client)` (lines 1233-1235) AND `svc_updatepl`
    + `client->lossage` (lines 1236-1238) into the MVD stream (`dem_all`).
  - Units anchor: `curtime` is a `double` in seconds, "not bounded or scaled"
    (`src/sv_main.c:30`; declared `src/server.h:520`).

WI-1 wide read: tree-wide grep of `src/` shows the ONLY `.value` reads are
`sv_send.c:1351` and `:1353`; no `.string`/`.integer` reads; no other consumer.

## Per-clause enforce-trace table (B1 -- every clause -> enforcing line)

| # | Clause | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|---|
| 1 | Records each player's ping + packet loss into the MVD demo | `src/sv_send.c:1233-1238` (callee `SV_MVDPings`, invoked `sv_send.c:1355`) | `MVD_MSG_WriteByte (svc_updateping); MVD_MSG_WriteByte (j); MVD_MSG_WriteShort(SV_CalcPing(client)); MVD_MSG_WriteByte (svc_updatepl); MVD_MSG_WriteByte (j); MVD_MSG_WriteByte (client->lossage);` | MATCH -- writes ping (svc_updateping) and packet loss (svc_updatepl/lossage) per spawned client |
| 2 | Value = interval in SECONDS between updates | `src/sv_send.c:1353` (+ `src/sv_main.c:30`) | `if (curtime - demo.pingtime > sv_demoPings.value)` ; `double curtime; // not bounded or scaled` | MATCH -- elapsed seconds since last write compared against the value |
| 3 | It is a minimum interval (timer reset after each write), not a name restatement | `src/sv_send.c:1356` | `demo.pingtime = curtime;` | MATCH -- resets the reference time, so the value gates time-since-last-write |
| 4 | OFF-state: 0 disables recording pings | `src/sv_send.c:1351` | `if ((int)sv_demoPings.value)` | MATCH -- int-truncated gate; value 0 skips the entire write block |
| 5 | Polarity: higher = less often, lower = more often | `src/sv_send.c:1353` | `curtime - demo.pingtime > sv_demoPings.value` | MATCH -- larger threshold => longer wait => fewer writes |
| 6 | Default 3 | `src/sv_demo.c:42` | `cvar_t  sv_demoPings = {"sv_demopings", "3"};` | MATCH -- registered cvar_t literal (WI-2: registered default, not a shipped-cfg value) |
| 7 | Set by: server config | `src/sv_demo.c:42` + `src/sv_demo.c:1843` | `cvar_t sv_demoPings = {...}` (no `CVAR_SERVERINFO`, no OnChange, no admin-command handler) ; `Cvar_Register (&sv_demoPings);` | MATCH -- plain registered cvar set from config; not serverinfo / vote / command |

V-pass self-classification: **TRACED-CLEAN** -- every material clause maps to a
located, verified enforcing line incl. the callee and the adjacent units anchor.

## Rationale (Step 3 + Step 5)

- **Step 2 (C3):** `suspect_pool_member=FALSE`; `SV_SendDemoMessage` is in the
  server frame path and the cvar is reachable. No dead-stamp.
- **Step 3 (affirm vs synthesize):** no trailing comment exists at the
  registration site and no mechanical candidate -- nothing to affirm. Cold-synth
  -> Step 5. (D5 amendment: absence is evaluated, not skipped.)
- **Step 4 (confabulation guard):** N/A -- behavior fully source-legible; no clause
  rests on the name, an enum, a string, or a comment.
- **Step 5 (synthesize, D20 shape):** 1-line what (records ping/packet loss into
  the demo periodically) + value-as-seconds + explicit OFF-state (0) + polarity +
  Default 3 + Set-by server config. No recommended value (L1/L3 line). No
  file:line/jargon in `description`. No cross-engine clause needed: the demo is
  consumed by an external MVD viewer, but that does not change how an admin sets
  this knob, so no `See also: L3` is action-required (D20 cross-engine default).
- **WI-2:** default verified against the cvar_t literal (`"3"`), not a shipped cfg.
  Set-by traced to the registration (no serverinfo flag / no OnChange / no command
  handler) -- server-config only.

## D6 record (parsed by `synthesize-mvdsv.ts --from-ledger` -- EXACTLY ONE json block)

```json
{
  "project": "mvdsv",
  "knob": "sv_demopings",
  "type": "cvar",
  "description": "Records each connected player's ping and packet loss into the MVD demo at a fixed interval, so viewers watching the recorded demo can see live ping/packet-loss readouts. The value is the number of seconds between those updates.\n\n0 = do not record pings in the demo.\nA higher value records them less often; a lower value records them more often.\n\nDefault: 3.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (no trailing comment / no mechanical candidate); D5-amendment evaluated, no affirm -> Step 5 synthesis. suspect_pool_member=FALSE so no C3 dead-stamp. Enforce-trace (B1), all TRACED-CLEAN: ping+packetloss write -> callee SV_MVDPings src/sv_send.c:1233-1238 (svc_updateping/SV_CalcPing + svc_updatepl/lossage), invoked src/sv_send.c:1355; value=seconds interval -> src/sv_send.c:1353 (curtime-demo.pingtime > value; curtime is double seconds, src/sv_main.c:30); minimum-interval/timer-reset -> src/sv_send.c:1356; OFF-state 0 disables -> src/sv_send.c:1351 (int-truncated gate skips block); polarity higher=less-often -> src/sv_send.c:1353. WI-2 default '3' from cvar_t literal src/sv_demo.c:42 (not shipped cfg); Set-by server config -- no CVAR_SERVERINFO/no OnChange/no command handler, registered src/sv_demo.c:1843. Cross-engine: demo consumed by external MVD viewer but not action-changing for the admin, so no See also (D20 default).",
  "description_proposed": null
}
```

## source_ref(s)

- Primary read use-site (behavior-exhibiting): `src/sv_send.c:1351` (OFF-state gate)
  and `src/sv_send.c:1353` (seconds interval); side-effect callee
  `src/sv_send.c:1221` (`SV_MVDPings`).
- Registration / default (locator aid + WI-2 default): `src/sv_demo.c:42`.
