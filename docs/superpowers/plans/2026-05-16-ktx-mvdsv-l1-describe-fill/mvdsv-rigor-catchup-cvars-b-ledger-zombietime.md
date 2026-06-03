# describe-fill-synthesis ledger -- mvdsv `zombietime`

- **project:** mvdsv
- **knob:** `zombietime` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:zombietime: synthesized -- slot-retention seconds after disconnect before cs_free reuse; enforced at sv_main.c:3111, default 2, settable -- origin=synthesized ref=src/sv_main.c:3111 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets how many seconds a disconnected client's player slot is held in reserve before the server frees it for reuse. While the timer runs, the departing connection's slot is not handed straight to a new client.
>
> Number of seconds. Raising it keeps the slot reserved longer after a disconnect; lowering it releases it for a new connection sooner.
>
> Default: 2.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| only `.value` read; enforcing site | src/sv_main.c:3111-3114 | `if (cl->state == cs_zombie && SV_ClientConnectedTime(cl) > zombietime.value) { cl->state = cs_free; // can now be reused }` | MATCH |
| slot held / reserved after disconnect (enters zombie) | src/sv_main.c:427 | `drop->state = cs_zombie; // become free in a few seconds` | MATCH |
| zombie = disconnected-but-not-reused slot | src/server.h:149-150 | `cs_zombie, // client has been disconnected, but don't reuse // connection for a couple seconds` | MATCH |
| timer reset at drop -> measures time-since-disconnect | src/sv_main.c:428 | `SV_SetClientConnectionTime(drop);   // for zombie timeout` | MATCH |
| SetClientConnectionTime resets the curtime field | src/sv_main.c:4219-4222 | `void SV_SetClientConnectionTime(...) { client->connection_started_curtime = curtime; }` | MATCH |
| unit = real-world seconds (curtime, not pause-affected) | src/sv_main.c:4201-4207 | `return curtime - client->connection_started_curtime;` (sibling SV_ClientGameTime uses realtime, `// affected by pause` 4209) | MATCH |
| raise=longer / lower=sooner (threshold direction) | src/sv_main.c:3111 | `SV_ClientConnectedTime(cl) > zombietime.value` | MATCH |
| Default 2 (registered literal) | src/sv_main.c:67 | `cvar_t zombietime = {"zombietime", "2"};` | MATCH |
| settable (plain register, no ROM/blocklist) | src/sv_main.c:3508 | `Cvar_Register (&zombietime);` | MATCH |
| KTX override? none (F-MV1) | ktx/src (grep) | only `monster_zombie` SP hits; no `zombietime` cvar | MATCH (no override) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | "seconds a disconnected client's slot is held in reserve before the server frees it for reuse" | sv_main.c:3111-3113 | `if (cl->state == cs_zombie && SV_ClientConnectedTime(cl) > zombietime.value) { cl->state = cs_free; // can now be reused }` | MATCH |
| 1a | timer measures seconds since disconnect (reset AT drop) | sv_main.c:427-428 + 4201-4207 | drop: `drop->state = cs_zombie; SV_SetClientConnectionTime(drop); // for zombie timeout` ; helper: `return curtime - client->connection_started_curtime;` | MATCH |
| 1b | cs_zombie="disconnected, don't reuse" -> cs_free="reusable" | server.h:148-150 | `cs_free, // can be reused for a new connection` / `cs_zombie, // client has been disconnected, but don't reuse // connection for a couple seconds` | MATCH |
| 2 | "While the timer runs, the slot is not handed straight to a new client" | sv_main.c:1165-1168 | `if (cl->state == cs_free) { if (!newcl) newcl = cl; // grab first available slot continue; }` (new-conn allocator grabs only cs_free; zombie slot skipped until 3113) | MATCH |
| 3 | "Number of seconds. Raising keeps slot reserved longer; lowering releases sooner" (polarity) | sv_main.c:3111 | threshold is `SV_ClientConnectedTime(cl) > zombietime.value` -- larger value -> longer until cs_free | MATCH |
| 4 | "Default: 2" | sv_main.c:67 (registered :3508) | `cvar_t zombietime = {"zombietime", "2"}; // seconds to sink messages` ; `Cvar_Register (&zombietime);` | MATCH |
| 5 | "Set by: server config / rcon" | sv_main.c:67, 3508 | plain registration, no CVAR_ROM/special flags; SERVERONLY server-side cvar -> settable via cfg/rcon | MATCH |

**V-pass notes:** Version confirmed 1.11-53-g18d0362. Wide-grep found exactly 3 zombietime use-sites (registration sv_main.c:67, enforcing read sv_main.c:3111, Cvar_Register sv_main.c:3508) -- all traced. The single enforcing branch (SV_CheckTimeouts, sv_main.c:3111-3113) and its callee SV_ClientConnectedTime (sv_main.c:4201) were both read; the timer is reset to curtime at the drop (SV_SetClientConnectionTime, sv_main.c:428, comment "for zombie timeout"), so it genuinely measures elapsed-since-disconnect, matching the description. State-enum comments (server.h:148-150) and the cs_free new-connection allocator (sv_main.c:1165-1168) independently corroborate the "held in reserve / not handed to a new client / freed for reuse" semantics with no polarity/threshold inversion. Default "2" is the registered default, not a shipped-cfg value (WI-2 clean). No clause rests on name/comment inference -- every material clause maps to an enforcing line whose actual code and adjacent comments confirm it. Registration comment "seconds to sink messages after disconnect" describes the same window from the netchan/message-sink angle; the description's slot-reuse framing is the runtime-enforced effect at 3113 and is accurate, so the differing framing is not a defect. PROC-1: no residual judgment -- every residual reduces to a checkable fact confirmed at its enforcing line. Classification: TRACED-CLEAN.

## flags_for_review

- [fyi/off-scope-entity/vpass] CheckReConnect (sv_main.c:1110-1153) is a SEPARATE, second path that frees a cs_zombie slot: when the SAME base-address+qport endpoint reconnects, it immediately sets the zombie slot to cs_free (line 1146) gated by sv_reconnectlimit.value (line 1123), NOT by zombietime. This does not contradict the description -- its wording is about a 'new client' / 'new connection' (a fresh endpoint), whereas this path is the same departing endpoint returning. So the zombietime gate is the only thing holding the slot against OTHER/new clients, exactly as described. Flagging only so the reviewer is aware the slot can also be reclaimed early by the original client via the reconnect path under a different cvar (sv_reconnectlimit).

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "zombietime",
  "type": "cvar",
  "description": "Sets how many seconds a disconnected client's player slot is held in reserve before the server frees it for reuse. While the timer runs, the departing connection's slot is not handed straight to a new client.\n\nNumber of seconds. Raising it keeps the slot reserved longer after a disconnect; lowering it releases it for a new connection sooner.\n\nDefault: 2.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3111. Trailing registration comment `// seconds to sink messages` (sv_main.c:67) is cryptic dev shorthand (\"sink messages\" is jargon, not admin-observable) and fails D5 clauses 1+5, so synthesized from the read use-site. ENFORCING read-site src/sv_main.c:3111-3114 (SV_CheckTimeouts): `if (cl->state == cs_zombie && SV_ClientConnectedTime(cl) > zombietime.value) { cl->state = cs_free; }` with adjacent comment `// can now be reused` -- this is the only `.value` read; registration at sv_main.c:67, Cvar_Register at sv_main.c:3508. Clause 'slot held after disconnect': cs_zombie is entered by SV_DropClient at sv_main.c:427 (`drop->state = cs_zombie; // become free in a few seconds`); enum comment server.h:149-150 `cs_zombie // client has been disconnected, but don't reuse connection for a couple seconds` confirms slot-reserved-not-reused semantics. Clause 'timer measures time since disconnect (not since original connect)': SV_DropClient at sv_main.c:428 calls SV_SetClientConnectionTime(drop) `// for zombie timeout`, which resets connection_started_curtime = curtime (sv_main.c:4219-4222), so SV_ClientConnectedTime (sv_main.c:4201-4207, `return curtime - client->connection_started_curtime`) for a zombie = real-world wall-clock seconds since the drop. Clause 'seconds / real-world unit': SV_ClientConnectedTime uses curtime, NOT the pause-affected realtime sibling SV_ClientGameTime (sv_main.c:4210-4217 `// affected by pause`); so the unit is real seconds, unaffected by server pause. Clause 'raise=longer / lower=sooner': directly the `>` comparison at 3111 -- larger threshold delays the cs_free transition. Default: registered cvar_t literal {\"zombietime\", \"2\"} at sv_main.c:67 -> 2 (WI-2). Set-by: plain Cvar_Register (no CVAR_ROM / blocklist), so settable via server config / rcon. F-MV1: grep of ktx/src for zombietime found only singleplayer monster_zombie hits (sp_zombie.c etc.) -- unrelated; KTX does not override this engine cvar. No explicit OFF-state branch exists, so none asserted (a 0 value is not special-cased; deliberately omitted rather than inferred).",
  "description_proposed": null
}
```
