# describe-fill-synthesis ledger -- mvdsv `sv_minping`

- **project:** mvdsv
- **knob:** `sv_minping` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_minping: synthesized -- per-player artificial-latency floor in ms (players only, not paused), settable via cvar or gated minping cmd, 0=off -- origin=synthesized ref=src/sv_user.c:4502 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Imposes a minimum ping (in milliseconds) on every connected player by adding artificial delay to their connection. The server continuously nudges each player's delay up or down so that nobody plays with a ping below this floor, evening out the advantage low-ping players would otherwise have. The floor is applied only to active players, not spectators, and not while the server is paused.
>
> Unit: milliseconds.
> 0 = no minimum (no artificial delay added).
>
> Default: 0.
> Set by: server config / rcon; also the 'minping <value>' console command when sv_enable_cmd_minping is on and no demo or match is in progress (range 0-300).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| adds artificial delay to reach a ping floor | src/sv_user.c:4502-4505 | `if (... > sv_minping.value + 1) cl->delay -= 0.001; else if (... < sv_minping.value) cl->delay += 0.001;` | MATCH |
| delay bounded 0..1s | src/sv_user.c:4507 | `cl->delay = bound(0, cl->delay, 1);` | MATCH |
| players only, not when paused | src/sv_user.c:4500 | `if (!cl->spectator && !sv.paused)` | MATCH |
| unit ms | src/sv_user.c:4502 | `frame->ping_time * 1000 > sv_minping.value + 1` | MATCH |
| 0 = no floor | src/sv_user.c:4504 | `else if (... < sv_minping.value)` (never true at 0) | MATCH |
| default 0 | src/sv_user.c:35 | `cvar_t sv_minping = {"sv_minping", "0"}` | MATCH |
| minping cmd gated by sv_enable_cmd_minping + no match/demo, range 0-300 | src/sv_user.c:2518-2528 | `if (GameStarted()) ... else if (!(int)sv_enable_cmd_minping.value) ... if (minping < 0 || minping > 300) ... Cvar_SetValue` | MATCH |
| KTX only broadcasts, no override | ktx/src/world.c:1807-1810 | `G_bprint(2, "%s changed to %d\n", redtext("sv_minping"), sv_minping)` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | clause | enforcing file:line | verbatim snippet | verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Imposes a minimum ping (ms) by adding artificial delay to the connection | sv_user.c:4499-4505 (delay set); consumed sv_main.c:2985 + 3039-3049 (queue/hold) | `// update delay based on ping and sv_minping` ... `cl->delay -= 0.001;` / `cl->delay += 0.001;`  + `while (cl->packets && (realtime - cl->packets->time >= cl->delay ...))` / `if (cl->delay > 0) { ... insert at end of list ...}` | MATCH |
| 2 | Continuously nudges each player's delay up or down toward the floor | sv_user.c:4502-4505 | `if (frame->ping_time * 1000 > sv_minping.value + 1) cl->delay -= 0.001; else if (frame->ping_time * 1000 < sv_minping.value) cl->delay += 0.001;` | MATCH (note: +1ms hysteresis deadband on the upper edge; "up or down toward floor" still accurate) |
| 3 | Evens out the advantage low-ping players would otherwise have | (intent/why-statement, no code clause) | -- | MATCH (rationale; consistent with mechanism, raises low pings to floor) |
| 4 | Applied only to active players, not spectators, not while paused | sv_user.c:4500 | `if (!cl->spectator && !sv.paused)` | MATCH |
| 5 | Unit: milliseconds | sv_user.c:4502 / 4504 | `frame->ping_time * 1000 > sv_minping.value` (seconds*1000 compared to cvar) | MATCH |
| 6 | 0 = no minimum (no artificial delay added) | sv_user.c:4502 + 4507 | `> sv_minping.value + 1` true for any real ping at value 0 -> `cl->delay -= 0.001` then `cl->delay = bound(0, cl->delay, 1)` -> driven to 0 | MATCH |
| 7 | Default: 0 | sv_user.c:35 (decl) + 4907 (register) | `cvar_t sv_minping = {"sv_minping", "0"};` ... `Cvar_Register (&sv_minping);` | MATCH (registered default, WI-2 satisfied; no ROM flag => settable) |
| 8a | Set by server config / rcon (normal settable cvar) | sv_user.c:35 + 4907 | plain `Cvar_Register (&sv_minping)`, no CVAR_ROM flag | MATCH |
| 8b | 'minping <value>' console command exists | sv_user.c:3345 | `{"minping", Cmd_MinPing_f, true},` | MATCH |
| 8c | ...only when sv_enable_cmd_minping is on | sv_user.c:2520-2521 | `else if (!(int)sv_enable_cmd_minping.value) Con_Printf("Can't change sv_minping: sv_enable_cmd_minping == 0.\n");` | MATCH |
| 8d | ...and no demo or match in progress | sv_user.c:2518-2519 -> GameStarted() sv_main.c:218-227 | `if (GameStarted()) Con_Printf("Can't change sv_minping: demo recording or match in progress.\n");` ; callee: `return (d || strncasecmp(Info_ValueForKey(svs.info,"status"),"Standby",8));` (non-stream demo dest OR status != Standby) | MATCH (callee-followed) |
| 8e | range 0-300 | sv_user.c:2525-2526 | `if (minping < 0 || minping > 300) Con_Printf("Value must be >= 0 and <= 300.\n");` | MATCH |

**V-pass notes:** Oracle confirmed: mvdsv `git describe --tags` == 1.11-53-g18d0362. All sv_minping use-sites live in src/sv_user.c (registration :35, command handler :2512-2536, command-table :3345, enforcing delay-update :4499-4508, register :4907); the only other "minping" hit is sv_user.c:37/2520-2521 = the sibling gate cvar sv_enable_cmd_minping, and server.h:60 = a sizing comment on MAX_DELAYED_PACKETS (`max minping 0.3` -> non-enforcing, just documents the 300ms cap rationale). No cross-file enforcer beyond the cl->delay consumer in sv_main.c.

Enforcing mechanism fully traced through the callee chain: sv_minping nudges per-client `cl->delay` (server.h:364, a double), which SV_ReadPackets (sv_main.c:2985, 3039-3049) uses as the hold-duration for an incoming-packet queue -- packets are buffered and only executed once `realtime - packet->time >= cl->delay`. That is genuine added connection latency, so "adds artificial delay to their connection" is literally correct, not a name-inference. The ms unit is enforced by the `ping_time * 1000` conversion at the comparison sites. Default 0 verified at the registered cvar (not a cfg value). The OFF-state (value 0 => delay driven to 0 by the `>value+1` branch + bound(0,...)) is enforced. Scope gate `!cl->spectator && !sv.paused` matches "active players, not spectators, not while paused" exactly. The minping command's three gates (GameStarted, sv_enable_cmd_minping, range 0-300) all match. Every material clause maps to a located, verified enforcing line including adjacent comments. No flavour-C inference, no contradiction, no metadata error. TRACED-CLEAN.

Minor (non-defect, not in description, FYI only): `case 2:` in Cmd_MinPing_f (sv_user.c:2517-2529) has no `break`, so it intentionally falls through to `case 1:` (set-then-echo). Benign and does not contradict any clause; flagged below only so a future reader does not mistake it for a missing-break bug.

## flags_for_review

- [fyi/other/vpass] Cmd_MinPing_f (sv_user.c:2517-2529) case 2 has no break and intentionally falls through to case 1, echoing the value after setting it. Benign set-then-echo idiom, not a bug, and the description makes no claim contradicted by it -- noted only so it is not later mis-triaged as a missing-break defect.
- [fyi/other/vpass] Upper-edge comparison at sv_user.c:4502 uses `sv_minping.value + 1` (a ~1ms hysteresis deadband) while the lower-edge at 4504 uses bare `sv_minping.value`. The description's 'nudges up or down so nobody plays below this floor' is accurate, but the steady-state floor settles in a roughly [value, value+1] ms band rather than exactly at value. Sub-ms imprecision, not worth surfacing in user-doc text; FYI for completeness.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_minping",
  "type": "cvar",
  "description": "Imposes a minimum ping (in milliseconds) on every connected player by adding artificial delay to their connection. The server continuously nudges each player's delay up or down so that nobody plays with a ping below this floor, evening out the advantage low-ping players would otherwise have. The floor is applied only to active players, not spectators, and not while the server is paused.\n\nUnit: milliseconds.\n0 = no minimum (no artificial delay added).\n\nDefault: 0.\nSet by: server config / rcon; also the 'minping <value>' console command when sv_enable_cmd_minping is on and no demo or match is in progress (range 0-300).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:4502. Enforcing read-site src/sv_user.c:4499-4508 (per-packet ping update in SV_ExecuteClientMessage path): `if (frame->ping_time * 1000 > sv_minping.value + 1) cl->delay -= 0.001; else if (frame->ping_time * 1000 < sv_minping.value) cl->delay += 0.001;` then `cl->delay = bound(0, cl->delay, 1);`. So delay is raised when measured ping is below the floor and lowered when above -> artificial latency that converges effective ping to the floor (added delay = floor). Unit ms: `ping_time * 1000` compared to `sv_minping.value`. Scope: enclosing `if (!cl->spectator && !sv.paused)` (src/sv_user.c:4500) -> players only, not while paused. OFF-state: at 0 the up-branch condition `< 0` is never true and the down-branch drives delay toward 0 -> no floor/no added delay. Default 0 from registration `cvar_t sv_minping = {\"sv_minping\", \"0\"}` (src/sv_user.c:35). Set-by: server cvar (Cvar_Register src/sv_user.c:4907) AND the `minping` command Cmd_MinPing_f (src/sv_user.c:2512-2536): case 2 path sets `Cvar_SetValue(&sv_minping, (int)minping)` (src/sv_user.c:2528) but only when `!GameStarted()` (else \"demo recording or match in progress\", src/sv_user.c:2518-2519) and `sv_enable_cmd_minping.value` (else refused, src/sv_user.c:2520-2521), with range guard `minping < 0 || minping > 300` (src/sv_user.c:2525). GameStarted defined sv_main.c:218. KTX cross-check: ktx/src reads sv_minping only to BROADCAST changes (world.c:1120,1807-1810 `G_bprint(... redtext(\"sv_minping\") ...)`); it does not re-enforce or override the delay logic -> engine behavior is live.",
  "description_proposed": null
}
```
