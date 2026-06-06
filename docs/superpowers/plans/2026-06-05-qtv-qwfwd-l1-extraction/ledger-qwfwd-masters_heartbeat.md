# describe-fill-synthesis ledger -- qwfwd `masters_heartbeat`

- **Project:** qwfwd
- **Knob:** `masters_heartbeat` (cvar)
- **C variable / registered name string:** both `masters_heartbeat` (no case difference) -- declared `src/query.c:30` (`static cvar_t *masters_heartbeat;`), registered `src/query.c:698` (`masters_heartbeat = Cvar_Get("masters_heartbeat", "1", 0);`).
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; the example config carries a hint comment but is NOT ground truth / NOT a seed).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qwfwd:masters_heartbeat: synthesized -- cold-synth, no comment; heartbeat-to-masters switch fully source-legible, every clause enforce-traced (1=send periodic heartbeat, 0=send none even when 'heartbeat' command is used; registered default "1"; no SERVERINFO/vote) -- origin=synthesized ref=src/query.c:238 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Controls whether this proxy announces itself to the QuakeWorld master servers. When enabled, the proxy periodically sends a heartbeat to each configured master so it stays listed and can be found by users. When disabled, no heartbeat is sent and the proxy is not advertised to the masters; the manual `heartbeat` command also has no effect while this is off.
>
> 0 = disabled (no heartbeat). 1 = enabled.
>
> Default: 1.
> Set by: server config.

## Read use-sites (WI-1 wide read)

All sites in `src/query.c` at anchor `1.40-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Declaration | `src/query.c:30` | the cvar pointer (locator only) |
| Registration | `src/query.c:698` | registers name + default `"1"` + flags `0` (no SERVERINFO) |
| Heartbeat gate | `src/query.c:238-239` | OFF -> proxy sends NO heartbeat to any master (function early-returns before the send loop) |

Related (NOT gated by this cvar, traced to disprove a bypass): the manual `heartbeat` command (`:158-161`, registered `:703`) only resets `masters.last_heartbeat` to force the next scheduled heartbeat ASAP; the actual send still runs through the gate at `:238`, so the command sends nothing while `masters_heartbeat` is 0.

## D5 rubric check (Step 3)

Cold-synth: register site `src/query.c:698` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but D5-amendment requires evaluation anyway. The one read use-site (`:238`) plus the send loop it guards (`:241-259`) are fully source-legible -> SYNTHESIZE (not hedge/residue). Rubric: (1) states admin-observable WHAT (does the proxy advertise itself to masters); (2) not a name restatement (spells "announces itself / stays listed / found by users"); (3) enum spelled (0=disabled, 1=enabled); (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `src/query.c` at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: gates whether the proxy SENDS a heartbeat to the masters | `src/query.c:238-239` (in `QRY_HeartbeatMasters`, called from `QRY_Frame` `:689`) | `if (!masters_heartbeat->integer)` / `return;` (guards the per-master `NET_SendPacket(net_socket, len, string, &m->addr)` at `:258`) | MATCH |
| Semantic: the heartbeat is what keeps the proxy listed / findable on the masters | `src/query.c:246` + `:258` (the packet sent past the gate) | `snprintf(string, ..., "%c\n%i\n%i\n", S2M_HEARTBEAT, masters.heartbeat_sequence, FWD_peers_count());` then `NET_SendPacket(... string ...)` to each master (S2M_HEARTBEAT defined `qwfwd.h:193`) | MATCH |
| Semantic: heartbeat is sent PERIODICALLY (not once) | `src/query.c:241-244` | `if (current_time < masters.last_heartbeat + QW_MASTER_HEARTBEAT_SECONDS) return;` then `masters.last_heartbeat = current_time;` (interval `QW_MASTER_HEARTBEAT_SECONDS` = 5 min, `:17`); `QRY_Frame` calls each tick (`:689`) | MATCH |
| OFF-state: 0 -> no heartbeat sent | `src/query.c:238-239` | `if (!masters_heartbeat->integer) return;` | MATCH |
| OFF-state: 0 -> the manual `heartbeat` command also sends nothing (no bypass) | `src/query.c:158-161` (command) gated downstream by `:238` | command body: `masters.last_heartbeat = time(NULL) - QW_MASTER_HEARTBEAT_SECONDS - 1;` (only moves the timer; the send still passes through the `:238` gate which returns early when off) | MATCH |
| Polarity: nonzero = enabled, zero = disabled | `src/query.c:238` uses `->integer` truthiness | `if (!masters_heartbeat->integer)` | MATCH |
| Default: 1 | `src/query.c:698` (registration; WI-2) | `masters_heartbeat = Cvar_Get("masters_heartbeat", "1", 0);` | MATCH |
| Set by: server config (registered with flags `0`; no `CVAR_SERVERINFO`, no vote path) | `src/query.c:698` (flags arg `0`) | `Cvar_Get("masters_heartbeat", "1", 0)` (third arg `0` = no flags) | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the C identifiers (`QRY_HeartbeatMasters`, `QRY_Cmd_Heartbeat_f`, `S2M_HEARTBEAT`, `FWD_peers_count`, `NET_SendPacket`), the `->integer` mechanism, the `Cvar_Get(..., 0)` flag-arg reasoning, and the interval constant `QW_MASTER_HEARTBEAT_SECONDS` (5 min). The user doc keeps `heartbeat` in backticks because it is an admin-typed command name the operator can act on (admin-observable surface), not internal jargon. The 5-minute interval is omitted from the user doc as an internal timing detail (not action-changing). No cross-engine consequence is action-changing for this self-contained proxy-local switch, so no `See also:` line; the master-server-registration concept-note breadcrumb is recorded in reasoning only (SR-5).

## Rationale

Cold-synth from a fully-legible use-site. `masters_heartbeat` gates exactly one thing: whether `QRY_HeartbeatMasters` (called every frame from `QRY_Frame` `:689`) actually emits the heartbeat. When nonzero, every `QW_MASTER_HEARTBEAT_SECONDS` (5 min) the proxy sends an `S2M_HEARTBEAT` ('a') packet carrying its sequence and peer count to each registered master (`:241-259`); that heartbeat is what keeps the proxy registered and discoverable on the masters. When zero, the function early-returns at `:238` and no heartbeat is ever sent. The manual `heartbeat` command (`:158-161`) only rewinds the timer to force the next scheduled beat sooner; it does NOT bypass the gate, so it sends nothing while the cvar is off (traced to disprove a name-inferred bypass per WI-1). Polarity is plain truthiness (`->integer`). Registered default is the literal `"1"` at `:698` (WI-2: read from the `Cvar_Get` literal, not a cfg). Flags arg is `0` -> no `CVAR_SERVERINFO`, no vote/command setter -> `Set by: server config`.

The example config (`resources/example-configs/qwfwd.cfg:27-28`, `set masters_heartbeat 1` with comment "Notify master servers when QWFWD is up (0=disabled, 1=enabled)") corroborates the polarity and default but is an admissible HINT only, not ground truth and not a seed (SR-1). No SR-3 deployment-default divergence applies (both source and the example config set this to `1`; the 3-vs-4 master divergence is on the `masters` list cvar). No C2 conflict. `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30 -- provenance holds retained shipped-doc DATA only). Self-classification: TRACED-CLEAN -- every clause maps to an enforcing comparison/branch line; no clause rests on the cvar name, an enum/string, or a config comment.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "masters_heartbeat",
  "type": "cvar",
  "description": "Controls whether this proxy announces itself to the QuakeWorld master servers. When enabled, the proxy periodically sends a heartbeat to each configured master so it stays listed and can be found by users. When disabled, no heartbeat is sent and the proxy is not advertised to the masters; the manual `heartbeat` command also has no effect while this is off.\n\n0 = disabled (no heartbeat). 1 = enabled.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/query.c:698 (Cvar_Get(\"masters_heartbeat\",\"1\",0)), no shipped-doc candidate -> nothing to affirm; use-site fully source-legible so synthesize. Clauses->cites: gates whether heartbeat is SENT to masters -> src/query.c:238-239 (guards per-master NET_SendPacket at :258); heartbeat keeps proxy listed/findable -> packet built :246 (S2M_HEARTBEAT, qwfwd.h:193) and sent :258; sent PERIODICALLY (5 min) -> src/query.c:241-244 (QW_MASTER_HEARTBEAT_SECONDS, :17) + QRY_Frame per-tick :689; OFF-state no heartbeat -> src/query.c:238-239; OFF-state manual 'heartbeat' command sends nothing (no bypass) -> command :158-161 only rewinds masters.last_heartbeat, send still passes through gate :238 (traced to disprove name-inferred bypass, WI-1); polarity nonzero=on via ->integer truthiness at :238; Default 1 (WI-2, registered literal) -> src/query.c:698; Set-by server config (flags arg 0, no CVAR_SERVERINFO/vote) -> src/query.c:698. No clause rests on name/enum/string/comment; each maps to an enforcing branch. Example config resources/example-configs/qwfwd.cfg:27-28 corroborates polarity+default but is a HINT only (SR-1, not a seed). No SR-3 divergence on this cvar (masters list 3-vs-4 is a different knob). No C2 conflict. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). [L3 breadcrumb: master-server registration/heartbeat]",
  "description_proposed": null
}
```
