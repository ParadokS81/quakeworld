# describe-fill-synthesis ledger -- qwfwd `maxclients`

- **Project:** qwfwd
- **Knob:** `maxclients` (cvar)
- **C variable / registered name string:** both `maxclients` (no case difference) -- declared `src/main.c:17` (`cvar_t *maxclients;`), extern `src/qwfwd.h:226`, registered `src/main.c:129` (`maxclients = Cvar_Get("maxclients", "128", CVAR_SERVERINFO);`).
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; the example config does not set this knob).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qwfwd:maxclients: synthesized -- cold-synth, no comment; caps simultaneous forwarded client connections (peers), enforced at two connection-admit sites, every clause enforce-traced (>= cap -> new connection rejected "is full"; registered default "128"; CVAR_SERVERINFO so published in status) -- origin=synthesized ref=src/svc.c:240 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Sets the maximum number of clients the proxy will forward at the same time. Once this many client connections are active, any further client trying to connect is refused with a "proxy is full" message until a slot frees up. The current limit is also published in the proxy's server info, so server browsers can show it.
>
> Whole number of simultaneous forwarded client connections.
>
> Default: 128.
> Set by: server config.

## Read use-sites (WI-1 wide read)

All reads compare `FWD_peers_count()` against `maxclients->integer`; sites span the whole `src/` tree at anchor `1.40-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Declaration | `src/main.c:17` | the cvar pointer (locator only) |
| Extern | `src/qwfwd.h:226` | shared pointer decl (locator only) |
| Registration | `src/main.c:129` | registers name + default `"128"` + flags `CVAR_SERVERINFO` |
| Admit gate (direct-connect handler) | `src/svc.c:240-244` | active peer count `>=` cap -> connect refused, client gets "proxy@<hostname> is full" |
| Admit gate (peer allocation) | `src/peer.c:59-60` | active peer count `>=` cap -> `FWD_peer_new` returns NULL, no new peer/socket allocated |
| Serverinfo publication | `src/cvar.c:184-192` (CVAR_SERVERINFO mirror) -> `src/svc.c:362` (status reply) | the cap value is mirrored into the proxy's server-info string and returned in the `status` query response |

## D5 rubric check (Step 3)

Cold-synth: register site `src/main.c:129` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. The two admit-gate read use-sites and the serverinfo publication path are fully source-legible -> SYNTHESIZE (not hedge/residue). Rubric: (1) states admin-observable WHAT (the connection ceiling and the refusal behavior at the ceiling); (2) not a name restatement -- spells out that it is simultaneous FORWARDED CLIENT connections and what happens at the cap (clause-2 trap the rubric warns about with `sv_maxclients`); (3) unit spelled (whole number of simultaneous forwarded connections); (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

Sites span the whole `src/` tree at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: caps the number of clients forwarded SIMULTANEOUSLY (compares against the live active-peer count) | `src/svc.c:240` and `src/peer.c:59` | `if (FWD_peers_count() >= maxclients->integer)` (both sites); `FWD_peers_count` counts the live `peers` linked list -> `src/peer.c:367-377` | MATCH |
| Semantic: each forwarded client connection (peer) counts toward the limit | `src/peer.c:367-377` (`FWD_peers_count`) | `for (cnt = 0, p = peers; p; p = p->next) { cnt++; } return cnt;` (counts linked peers) | MATCH |
| Threshold/polarity: at-or-above the cap rejects (`>=`, not `>`) | `src/svc.c:240`, `src/peer.c:59` | `>= maxclients->integer` (inclusive) | MATCH |
| Behavior at cap: further connect is refused with a "full" message | `src/svc.c:241-243` | `Netchan_OutOfBandPrint (..., "%c\n" "proxy@%s is full\n\n", A2C_PRINT, hostname->string); return;` | MATCH |
| Behavior at cap: no new peer/socket is created | `src/peer.c:59-60` | `if (FWD_peers_count() >= maxclients->integer) return NULL;` (returns before `NET_UDP_OpenSocket` / `Sys_malloc` at `:63-66`) | MATCH |
| Behavior: a freed slot allows new connections again (transient cap, not a hard ban) | `src/peer.c:59` re-evaluated per connect; `FWD_peer_free` `src/peer.c:94-128` unlinks a peer (lowering the count) | gate reads the live count each connect attempt; peer-free decrements via unlink in the `:106-118` loop | MATCH |
| Semantic: the limit is published in the proxy's server info | `src/main.c:129` (`CVAR_SERVERINFO`) -> `src/cvar.c:184-192` (mirror into `ps.info`) -> `src/svc.c:360-363` (status reply prints `ps.info`) | `Cvar_Get("maxclients","128",CVAR_SERVERINFO)`; `if (var->flags & CVAR_SERVERINFO) { ... Info_SetValueForStarKey (ps.info, var->name, var->string, ...) }`; `snprintf(tmp, ..., "%s\n", ps.info)` in `SVC_Status` | MATCH |
| Default: 128 | `src/main.c:129` (registration; WI-2) | `maxclients = Cvar_Get("maxclients", "128", CVAR_SERVERINFO);` | MATCH |
| Set by: server config (registered with `CVAR_SERVERINFO`; no vote/command setter, no `CVAR_READONLY`) | `src/main.c:129` (flags arg `CVAR_SERVERINFO` only) | `Cvar_Get("maxclients", "128", CVAR_SERVERINFO)` (no `CVAR_READONLY`/`CVAR_NOSET`; editable from config) | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the C identifiers (`FWD_peers_count`, `FWD_peer_new`, `maxclients->integer`, `ps.info`, `CVAR_SERVERINFO`, `SVC_Status`, `Netchan_OutOfBandPrint`), the `>=` operator, and the registration flags reasoning. The user doc says "active client connections", "refused with a proxy is full message", and "published in the proxy's server info" in admin-observable terms. The serverinfo-publication clause is kept in `description` (one short clause) because it IS action-relevant -- it is why a browser shows the slot count, and an admin sets `maxclients` partly to advertise capacity -- which meets the D20 "inline only if action-changing" bar; the cross-stack detail (which browser/client parses the field) is not asserted. No cross-engine `See also:` is warranted beyond that inline clause. SR-3 note: the standing rule's `maxclients=1000` divergence is QTV-only; this QWFWD knob's source default is `128` and is described as such -- no QWFWD deployment-default divergence was found in the example config (which does not set it), so nothing to flag.

## Rationale

Cold-synth from fully-legible use-sites. `maxclients` is the simultaneous-forwarded-connection ceiling for the proxy. Two admit gates enforce it identically: `src/svc.c:240` in the direct-connect handler (`SVC_DirectConnect`) and `src/peer.c:59` in `FWD_peer_new`. Both compare `FWD_peers_count() >= maxclients->integer`, where `FWD_peers_count` (`src/peer.c:367-377`) walks the live `peers` linked list and returns its length -- so the count is the number of currently active forwarded clients (peers), and the comparison is inclusive (`>=`), meaning the Nth+1 connection is refused once N == cap. At the svc.c gate the rejected client receives a connectionless "proxy@<hostname> is full" print (`src/svc.c:241-243`); at the peer.c gate `FWD_peer_new` returns NULL before allocating a socket or peer struct (`src/peer.c:60` vs `:63-66`). Because the gate reads the live count on every connect attempt and `FWD_peer_free` (`src/peer.c:94-128`) unlinks a peer when a client leaves/times out (lowering the count), the cap is transient -- a freed slot immediately admits a new client; it is not a permanent ban. The cvar is registered `CVAR_SERVERINFO` (`src/main.c:129`), so its value is mirrored into the proxy server-info string `ps.info` (`src/cvar.c:184-192`, at registration via `Cvar_ForceSet` and on any later change) and that string is returned to a querying browser in the `status` reply (`src/svc.c:360-363`, gated on the oldstyle / `STATUS_SERVERINFO` request flag). I confirmed the heartbeat to masters (`src/query.c:246`) sends only the sequence number and peer count, NOT the serverinfo string (despite the `qwfwd.h:193` comment claiming "+ serverinfo"), so I do NOT claim maxclients is advertised to the masters -- only that it is in the status reply (flavour-C trap avoided: the comment was not taken as the enforcing line). Registered default is the literal `"128"` at `src/main.c:129` (WI-2: read from the `Cvar_Get` literal, not a cfg). Flags carry `CVAR_SERVERINFO` only (no `CVAR_READONLY`/`CVAR_NOSET`), so it is editable from config -> `Set by: server config`. No C2 conflict (no shipped-doc candidate). SR-3 is QTV-scoped (1000 vs 100); this QWFWD knob describes the source default 128 with no divergence to flag. `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30). Self-classification: TRACED-CLEAN -- every clause maps to an enforcing comparison/branch or the verified mirror+reply path; no clause rests on the cvar name or a comment.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "maxclients",
  "type": "cvar",
  "description": "Sets the maximum number of clients the proxy will forward at the same time. Once this many client connections are active, any further client trying to connect is refused with a \"proxy is full\" message until a slot frees up. The current limit is also published in the proxy's server info, so server browsers can show it.\n\nWhole number of simultaneous forwarded client connections.\n\nDefault: 128.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/main.c:129 (Cvar_Get(\"maxclients\",\"128\",CVAR_SERVERINFO)), no shipped-doc candidate, example config does not set it -> nothing to affirm; use-sites fully source-legible so synthesize. Clauses->cites: caps SIMULTANEOUS forwarded clients -> two admit gates src/svc.c:240 and src/peer.c:59, both if (FWD_peers_count() >= maxclients->integer); count = live peers linked-list length -> FWD_peers_count src/peer.c:367-377 (for p=peers;p;p=p->next cnt++); inclusive >= threshold -> both gate sites use >=; at-cap refusal message -> src/svc.c:241-243 Netchan_OutOfBandPrint \"proxy@%s is full\" then return; at-cap no peer/socket alloc -> src/peer.c:60 return NULL before NET_UDP_OpenSocket/Sys_malloc :63-66; transient (freed slot re-admits) -> gate re-reads live count each connect + FWD_peer_free src/peer.c:94-128 unlinks/decrements; published in server info -> CVAR_SERVERINFO at registration -> mirror into ps.info src/cvar.c:184-192 -> SVC_Status prints ps.info src/svc.c:360-363; Default 128 (WI-2, registered literal) -> src/main.c:129; Set-by server config -> flags CVAR_SERVERINFO only, no CVAR_READONLY/NOSET. FLAVOUR-C TRAP AVOIDED: heartbeat src/query.c:246 sends only sequence + FWD_peers_count, NOT serverinfo, despite qwfwd.h:193 comment '+ serverinfo' -- so I claim publication only in the status reply, not to masters; the comment was not taken as the enforcing line. SR-3 is QTV-only (1000 vs 100); this QWFWD knob's source default is 128 and is described as such, no example-config divergence to flag. No C2 conflict. provenance=null (cold-synth, operator 2026-05-30). Grading: synthesized, high confidence, every clause TRACED-CLEAN. No SR-5 concept-note breadcrumb (connection-cap knob does not touch masters-registration/streaming/auth candidates).",
  "description_proposed": null
}
```
