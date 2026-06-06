# describe-fill-synthesis ledger -- qwfwd `masters_query`

- **Project:** qwfwd
- **Knob:** `masters_query` (cvar)
- **C variable / registered name string:** both `masters_query` (no case difference) -- declared `src/query.c:29` (`static cvar_t *masters_query;`), registered `src/query.c:697` (`masters_query = Cvar_Get("masters_query", "1", 0);`).
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; the example config carries a hint comment but is NOT ground truth / NOT a seed).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qwfwd:masters_query: synthesized -- cold-synth, no comment; master-list query/maintain switch fully source-legible, every clause enforce-traced (1=query+ping+serve, 0=skip all + ignore replies + serve empty list; registered default "1"; no SERVERINFO/command/vote) -- origin=synthesized ref=src/query.c:209 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Controls whether this proxy fetches the QuakeWorld server list from the master servers and keeps it up to date. When enabled, the proxy periodically asks the masters for the current server list, pings those servers to measure their response, and hands that list out to clients who ask the proxy for servers. When disabled, the proxy does none of this: it sends no query to the masters, ignores any server list a master sends back, stops pinging servers, and returns an empty server list to clients.
>
> 0 = disabled (no server-list querying). 1 = enabled.
>
> Default: 1.
> Set by: server config.

## Read use-sites (WI-1 wide read)

All sites in `src/query.c` at anchor `1.40-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Declaration | `src/query.c:29` | the cvar pointer (locator only) |
| Registration | `src/query.c:697` | registers name + default `"1"` + flags `0` (no SERVERINFO) |
| Re-init gate | `src/query.c:185-186` | when the cvar (or `masters`) is changed, the master list is rebuilt; OFF still re-inits but the query loop below is gated |
| Query loop gate | `src/query.c:209-210` | OFF -> proxy sends NO query packet to the masters (no `QW_MASTER_QUERY`) |
| Master-reply parse gate | `src/query.c:280-284` | OFF -> incoming master replies (server lists) are ignored |
| Server-ping gate | `src/query.c:453-454` | OFF -> proxy does not ping discovered servers (no ping measurement) |
| Server-ping-reply gate | `src/query.c:497-501` | OFF -> server ping replies are ignored |
| Status-answer gate | `src/query.c:535` | OFF -> proxy omits its server list when answering a client status request (advertises no servers) |

## D5 rubric check (Step 3)

Cold-synth: register site `src/query.c:697` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but D5-amendment requires evaluation anyway. Use-sites are fully source-legible -> SYNTHESIZE (not hedge/residue). Rubric: (1) states admin-observable WHAT (does the proxy fetch + maintain + serve the server list); (2) not a name restatement (the name says "masters_query"; the prose spells the four concrete effects); (3) enum spelled (0=disabled, 1=enabled); (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `src/query.c` at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: gates whether the proxy QUERIES the masters for the server list | `src/query.c:209-210` (in `QRY_QueryMasters`, called from `QRY_Frame` `:688`) | `if (!masters_query->integer)` / `return;` (guards the loop that `NET_SendPacket(... QW_MASTER_QUERY ...)` at `:222`) | MATCH |
| Semantic: when enabled, the proxy keeps the list up to date by re-querying / rebuilding | `src/query.c:185-189` (in `QRY_CheckMastersModified`) + `:209-224` | `if (!masters_list->modified && !masters_query->modified) return;` then `QRY_MastersInit();` + add masters; query loop at `:212-224` | MATCH |
| Semantic: when enabled, the proxy PINGS discovered servers | `src/query.c:453-454` (in `QRY_SV_PingServers`, called from `QRY_Frame` `:690`) | `if (!masters_query->integer)` / `return;` (guards the `NET_SendPacket(... QW_SERVER_PING_QUERY ...)` at `:488`) | MATCH |
| Semantic: when enabled, the proxy SERVES its server list to clients who ask | `src/query.c:535` (in `SVC_QRY_PingStatus`) | `if (masters_query->integer)` then loop writing each `sv->addr`/`port`/`ping` into the reply buffer (`:537-542`) | MATCH |
| OFF-state: 0 -> no query sent to masters | `src/query.c:209-210` | `if (!masters_query->integer) return;` | MATCH |
| OFF-state: 0 -> incoming master replies (server lists) ignored | `src/query.c:280-284` (in `SVC_QRY_ParseMasterReply`) | `if (!masters_query->integer) { Sys_DPrintf("master server reply ignored\n"); return; }` | MATCH |
| OFF-state: 0 -> server ping replies ignored | `src/query.c:497-501` (in `QRY_SV_PingReply`) | `if (!masters_query->integer) { Sys_DPrintf("server reply ignored\n"); return; }` | MATCH |
| OFF-state: 0 -> empty server list returned to clients | `src/query.c:535` (negated branch in `SVC_QRY_PingStatus`) | `if (masters_query->integer) { ... }` -- false means the server-write loop is skipped, so the status reply carries no servers (comment `:534`: "if we does not query masters then we can't proved reliable info, so do not send servers list") | MATCH |
| Polarity: nonzero = enabled, zero = disabled | all gate sites above use `->integer` truthiness | `if (!masters_query->integer)` / `if (masters_query->integer)` | MATCH |
| Default: 1 | `src/query.c:697` (registration; WI-2) | `masters_query = Cvar_Get("masters_query", "1", 0);` | MATCH |
| Set by: server config (registered with flags `0`; no `CVAR_SERVERINFO`, no command/vote dispatch path) | `src/query.c:697` (flags arg `0`); only commands registered in `QRY_Init` are `svlist` + `heartbeat` (`:702-703`), neither sets this cvar | `Cvar_Get("masters_query", "1", 0)` (third arg `0` = no flags) | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the C identifiers (`QRY_QueryMasters`, `QRY_HeartbeatMasters`, `SVC_QRY_ParseMasterReply`, `SVC_QRY_PingStatus`, `QW_MASTER_QUERY`), the `->integer` mechanism, the `Cvar_Get(..., 0)` flag-arg reasoning, and the internal query/ping interval constants (`QW_MASTER_QUERY_TIME`, `QW_SERVER_RATE`, etc.). The user doc states only the four admin-observable effects + the enum + Default + Set-by. No cross-engine consequence is action-changing for this knob (it is a self-contained proxy-local switch), so no `See also:` line is needed; the master-server-registration concept-note breadcrumb is recorded in reasoning only (SR-5).

## Rationale

Cold-synth from fully-legible use-sites. `masters_query` is the master switch for the proxy's server-discovery subsystem: when nonzero the proxy queries the masters for the server list (`QRY_QueryMasters` `:209-224`), rebuilds the list when the cvar/`masters` changes (`QRY_CheckMastersModified` `:185-195`), pings the discovered servers (`QRY_SV_PingServers` `:453`), accepts master replies (`SVC_QRY_ParseMasterReply` `:280`) and server ping replies (`QRY_SV_PingReply` `:497`), and serves the list to clients (`SVC_QRY_PingStatus` `:535`). When zero, every one of those six paths early-returns or is skipped, so the proxy neither queries, pings, accepts, nor advertises a server list. Polarity is plain truthiness (`->integer`). Registered default is the literal `"1"` at `:697` (WI-2: read from the `Cvar_Get` literal, not from a cfg). Flags arg is `0` -> no `CVAR_SERVERINFO`; the only commands registered in this subsystem (`svlist`, `heartbeat` at `:702-703`) do not set the cvar, so `Set by: server config`.

The example config (`resources/example-configs/qwfwd.cfg:30-31`, `set masters_query 1` with comment "Query the master server list (0=disabled, 1=enabled)") corroborates the polarity and default but is an admissible HINT only, not ground truth and not a seed (SR-1). No SR-3 deployment-default divergence applies to this knob (the `masters`-list 3-vs-4 divergence is a different cvar; both source and the example config set `masters_query` to `1`). No C2 conflict. `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30 -- provenance holds retained shipped-doc DATA only). Self-classification: TRACED-CLEAN -- every clause maps to an enforcing comparison/branch line; no clause rests on the cvar name, an enum/string, or a config comment.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "masters_query",
  "type": "cvar",
  "description": "Controls whether this proxy fetches the QuakeWorld server list from the master servers and keeps it up to date. When enabled, the proxy periodically asks the masters for the current server list, pings those servers to measure their response, and hands that list out to clients who ask the proxy for servers. When disabled, the proxy does none of this: it sends no query to the masters, ignores any server list a master sends back, stops pinging servers, and returns an empty server list to clients.\n\n0 = disabled (no server-list querying). 1 = enabled.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/query.c:697 (Cvar_Get(\"masters_query\",\"1\",0)), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Clauses->cites: gates QUERY to masters -> src/query.c:209-210 (guards QW_MASTER_QUERY send at :222); keeps list up-to-date / rebuild on change -> src/query.c:185-195 + :212-224; PINGS discovered servers -> src/query.c:453-454 (guards QW_SERVER_PING_QUERY send at :488); SERVES list to clients -> src/query.c:535 (server-write loop :537-542); OFF-state ignores master replies -> src/query.c:280-284; OFF-state ignores server ping replies -> src/query.c:497-501; OFF-state returns empty list -> src/query.c:535 negated branch (comment :534 'do not send servers list'); polarity nonzero=on via ->integer truthiness at all gate sites; Default 1 (WI-2, registered literal) -> src/query.c:697; Set-by server config (flags arg 0, no CVAR_SERVERINFO; commands svlist/heartbeat at :702-703 do not set it) -> src/query.c:697. No clause rests on name/enum/string/comment; each maps to an enforcing branch. Example config resources/example-configs/qwfwd.cfg:30-31 corroborates polarity+default but is a HINT only (SR-1, not a seed). No SR-3 divergence on this cvar (masters list 3-vs-4 is a different knob). No C2 conflict. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). [L3 breadcrumb: master-server registration/heartbeat]",
  "description_proposed": null
}
```
