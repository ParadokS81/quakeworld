# describe-fill-synthesis ledger -- qtv `maxclients`

- **Project:** qtv
- **Knob:** `maxclients` (cvar) -- registered NAME string `"maxclients"`; read via `qtv.qvs.Get("maxclients").Int`.
- **Anchor version:** `1.16-dev` (`pkg/qtv/qtv.go:29` `qtvRelease`).
- **Registration:** `pkg/qtv/downstream_storage.go:201` `qtv.qvs.RegEx("maxclients", "1000", qVarFlagServerInfo, nil)` -> default `"1000"`, flags `[qVarFlagServerInfo]` (locator aid only, NOT the citation).
- **Mechanical candidate:** none (cold-synth; no trailing comment at register site; `resources/qtv.cfg` is a HINT only -- SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live; do NOT dead-stamp).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qtv:maxclients: synthesized -- cold-synth; caps the number of simultaneous downstream connections (viewers/relay proxies) this QTV accepts; new connections beyond the cap are silently closed; clamped 0..2048; published in server info -- SR-3 SOURCE default 1000 (nQuake template ships 100; reasoning-only) -- origin=synthesized ref=pkg/qtv/downstream_storage.go:123 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> Limits how many downstream connections this QTV proxy will accept at once -- that is, how many viewers and relay proxies can be pulling the stream from it simultaneously. When the limit is already reached, any further incoming connection is closed immediately without being served. Setting it to 0 refuses all downstream connections. Values above the built-in ceiling of 2048 are treated as 2048. The current limit is published in the proxy's server info so it is visible to server browsers.
>
> Default: 1000.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`maxclients` / `Get("maxclients")` / `maxClients()` / `qtvMaxClients` / `qVarFlagServerInfo`) over the whole `pkg/` tree. The cvar is read at exactly one `Get("maxclients")` call-site (`downstream_storage.go:114`, inside the `maxClients()` accessor), consumed at exactly one enforcement site (`:123`). All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration (locator) | `pkg/qtv/downstream_storage.go:201` | `qtv.qvs.RegEx("maxclients", "1000", qVarFlagServerInfo, nil)` -- default `"1000"`, serverinfo flag |
| Accessor + clamp | `pkg/qtv/downstream_storage.go:113-115` | `func (dss *dStreamStorage) maxClients() int { return iBound(0, dss.qtv.qvs.Get("maxclients").Int, qtvMaxClients) }` -- clamps the cvar to `[0, qtvMaxClients]` |
| Ceiling constant | `pkg/qtv/qtv.go:33` | `qtvMaxClients = 2048` -- the hard upper bound |
| Enforcement (accept gate) | `pkg/qtv/downstream_storage.go:122-126` | `if len(dss.stream) >= dss.maxClients() || dss.closing { conn.Close(); return nil }` -- a new downstream connection is closed when the current count is at or above the cap |
| Serverinfo mirror | `pkg/qtv/var.go:165-166` | `if (newValue.Flags & qVarFlagServerInfo) != 0 { qs.qtv.serverInfo.Set(name, newValue.Str) }` -- the value is mirrored into the proxy's server info |
| Serverinfo zero-strip | `pkg/qtv/var.go:157-158` | a serverinfo var set to `"0"` is stored as `""` (removed from serverinfo) -- a serverinfo-presentation detail, not stated in the user doc |

## D5 rubric check (Step 3)

Cold-synth: register site `downstream_storage.go:201` has no trailing comment; no shipped-doc candidate -> nothing to affirm, but D5-amendment requires full evaluation. Behavior fully source-legible -> SYNTHESIZE. Step 2 N/A (not suspect-pool). Rubric: (1) admin-observable WHAT (caps simultaneous downstream connections) -- not WHY; (2) not a name restatement -- spells what "clients" are here (downstream viewers/relay proxies, NOT in-game players), what happens at the cap, the 0 and ceiling behaviors; (3) it is a numeric scalar (count of connections), and the load-bearing edge values (0 = refuse all; >2048 -> 2048) are spelled out; (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Caps simultaneous DOWNSTREAM connections (semantic + scope) | `pkg/qtv/downstream_storage.go:122-123` | `// If we reached maximum clients (or about to quit) then silently close incoming connection.` / `if len(dss.stream) >= dss.maxClients() || dss.closing {` | MATCH -- the gate is in `dStreamStorage.open`, which handles accepted DOWNSTREAM (`dStream`) connections; `len(dss.stream)` is the count of live downstreams compared against the cap. |
| At/above the cap, a further connection is closed immediately without being served (side-effect) | `pkg/qtv/downstream_storage.go:123-125` | `if len(dss.stream) >= dss.maxClients() || dss.closing { conn.Close(); return nil }` | MATCH -- `conn.Close()` then `return nil` before `newDStream` is constructed; the connection is dropped, never handed to the stream pipeline. Adjacent comment `:122` "silently close incoming connection" confirms the silent-drop. |
| 0 refuses all downstream connections (OFF-state / boundary) | `pkg/qtv/downstream_storage.go:113-114` + `:123` | `iBound(0, ... , qtvMaxClients)` (floor 0) + `if len(dss.stream) >= dss.maxClients()` | MATCH -- floor is 0; with cap 0, `len(dss.stream) >= 0` is always true, so every incoming connection hits the close branch. (`iBound` `math.go:24-35`: min wins when `val < min`.) |
| Values above 2048 are treated as 2048 (threshold) | `pkg/qtv/downstream_storage.go:114` + `pkg/qtv/qtv.go:33` | `iBound(0, dss.qtv.qvs.Get("maxclients").Int, qtvMaxClients)` with `qtvMaxClients = 2048` | MATCH -- `iBound` returns `max` when `val > max` (`math.go:31-32`); ceiling is the constant 2048. |
| Published in server info (cross-engine, action-relevant) | `pkg/qtv/var.go:165-166` + registration flag | `if (newValue.Flags & qVarFlagServerInfo) != 0 { qs.qtv.serverInfo.Set(name, newValue.Str) }`; registered with `qVarFlagServerInfo` at `downstream_storage.go:201` | MATCH -- the `qVarFlagServerInfo` flag (`var.go:41` "Variable mirrored inside server info.") causes the value to be written into the proxy's serverinfo on set. |
| Default 1000 (metadata, WI-2) | `pkg/qtv/downstream_storage.go:201` | `qtv.qvs.RegEx("maxclients", "1000", qVarFlagServerInfo, nil)` | MATCH -- registered default literal is `"1000"`. NOT the nQuake template's `100` (SR-3; that is a distribution-drift datum, reasoning-only). |
| Set by server config (metadata, WI-2 access-class) | `pkg/qtv/downstream_storage.go:201` | `RegEx("maxclients", "1000", qVarFlagServerInfo, nil)` (flag is serverinfo only; not read-only / not init-only) | MATCH -- no `qVarFlagReadOnly` / `qVarFlagInitOnly`; QTV registers no `set` command (`var.go:85-87`), so the value comes from the config file at startup. Serverinfo mirroring is a publish side-effect, not a set channel. |

V-pass self-classification of the produced text: **TRACED-CLEAN** -- every material clause maps to a located, verified enforcing line (incl. the adjacent comment at `:122`). No clause derives only from the knob name (note the name `maxclients` invites the WRONG reading "max in-game players"; the enforce-trace at `:123` proves it is downstream connections, not players, which is exactly why name-only synthesis is forbidden here).

## D20 split note

All file:line / Go identifiers (`maxClients()`, `dStreamStorage.open`, `dss.stream`, `iBound`, `qtvMaxClients`, `qVarFlagServerInfo`, `serverInfo.Set`, `conn.Close`, `RegEx`) stay OUT of `description` and live in `description_reasoning` + this human table. The `description` prose carries zero file:line and zero engine jargon. "downstream connections", "viewers", "relay proxies", "stream", "server browsers" are admin-facing QW/QTV terms.

Cross-engine / serverinfo clause: the value is published in serverinfo via the `qVarFlagServerInfo` flag. Per D20, a published-in-serverinfo consequence is kept inline ONLY when action-changing. Here it is mildly action-relevant (an admin reading a server browser will see this number, and it is the only flagged behavior beyond the cap itself), so a SHORT user-observable clause ("published in the proxy's server info so it is visible to server browsers") is inline-justified; the mechanism (the flag, `serverInfo.Set`, the `"0"`-strip) stays in reasoning. No `See also:` slug is forced (no cross-engine concept-note candidate is anchored on maxclients).

## description_provenance

`null` -- cold-synth. Per operator clarification 2026-05-30, `description_provenance` holds retained shipped-doc DATA only; this row has no shipped doc / trailing comment. Grounding is `source_ref` + anchor + the reasoning cites.

## Rationale

Cold-synth from fully-legible use-sites. `maxclients` is read once, inside `dStreamStorage.maxClients()` (`downstream_storage.go:113-115`), which clamps it to `[0, qtvMaxClients]` (`qtvMaxClients = 2048`, `qtv.go:33`). The single enforcement site is the downstream accept path `dStreamStorage.open` (`:122-126`): when `len(dss.stream)` (the count of live downstream connections) is at or above the cap, the incoming `conn` is closed and dropped before a `dStream` is created. The name `maxclients` is a trap -- these are DOWNSTREAM connections (viewers and relay proxies pulling the stream), NOT in-game players; the enforce-trace at `:123` establishes the correct scope and is why name-only synthesis is forbidden. Boundary behaviors: floor 0 -> refuses all (the `>= 0` test is always true); ceiling 2048 -> larger values clamp down (`iBound` `math.go:31-32`).

The `qVarFlagServerInfo` flag (`var.go:41`) mirrors the value into the proxy's serverinfo on set (`var.go:165-166`), so a server browser sees it. (The `"0"`-strips-from-serverinfo special case at `var.go:157-158` is a serverinfo-presentation detail; it does NOT change the accept-gate behavior -- a clamped value of 0 still refuses all connections internally regardless of how it appears in serverinfo -- so it is reasoning-only.)

WI-2: registered default literal is `"1000"` (`downstream_storage.go:201`). Set-by is server config -- the only flag is serverinfo (a publish flag, not a set channel), there is no read-only/init-only flag, and QTV registers no `set` command (`var.go:85-87`), so the value is read from the config file at startup. SR-1: `resources/qtv.cfg` is a hint only, not a seed.

SR-3 deployment-default divergence (recorded here, NOT in the description): the SOURCE default is `1000` (registered literal at `:201`). nQuake's shipped QTV template sets `maxclients 100`, so an nQuake-installed QTV will appear to default to 100. The describe-fill default is the SOURCE default (`1000`). No C2 conflict on the source side; the only divergence is the nQuake template value, flagged here per SR-3.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/compare/clamp incl. adjacent comments; no clause rests on the cvar name (the name is in fact misleading and was corrected by the trace), an enum/string, or a config comment.

## D6Record

```json
{
  "project": "qtv",
  "knob": "maxclients",
  "type": "cvar",
  "description": "Limits how many downstream connections this QTV proxy will accept at once -- that is, how many viewers and relay proxies can be pulling the stream from it simultaneously. When the limit is already reached, any further incoming connection is closed immediately without being served. Setting it to 0 refuses all downstream connections. Values above the built-in ceiling of 2048 are treated as 2048. The current limit is published in the proxy's server info so it is visible to server browsers.\n\nDefault: 1000.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (no trailing comment at registration pkg/qtv/downstream_storage.go:201 qtv.qvs.RegEx(\"maxclients\", \"1000\", qVarFlagServerInfo, nil); no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize). Read once via the maxClients() accessor pkg/qtv/downstream_storage.go:113-115 which clamps the cvar to iBound(0, ..., qtvMaxClients), qtvMaxClients=2048 (pkg/qtv/qtv.go:33). Single enforcement: downstream accept path dStreamStorage.open pkg/qtv/downstream_storage.go:122-126 -- if len(dss.stream) >= maxClients() the incoming conn.Close()s and returns before newDStream (adjacent comment :122 'silently close incoming connection'). SCOPE TRAP: name 'maxclients' invites 'max in-game players' but the trace proves these are DOWNSTREAM connections (viewers/relay proxies pulling the stream), not players -- name-only synthesis would be wrong here. Boundary: floor 0 -> refuses all (>=0 always true; iBound math.go:24-35); ceiling 2048 -> larger values clamp down (iBound returns max when val>max). qVarFlagServerInfo (var.go:41 'mirrored inside server info') -> value written to serverinfo on set (var.go:165-166); the '0'-strips-from-serverinfo special case (var.go:157-158) is presentation-only and does not change the internal accept gate -> reasoning-only. WI-2: default literal '1000' (:201); Set-by server config -- only flag is serverinfo (a publish flag), no read-only/init-only, QTV registers no 'set' command (var.go:85-87), value read from config file at startup. SR-1: resources/qtv.cfg is a hint only. SR-3 divergence (reasoning-only, NOT in description): SOURCE default = 1000; nQuake template sets maxclients 100 -> describe SOURCE default (1000). No C2 conflict on source side. V-pass self-classification TRACED-CLEAN; no clause from name/enum/string/comment alone (name actively corrected by trace). suspect_pool_member FALSE -> not dead-stamped. provenance=null (cold-synth, operator 2026-05-30). Serverinfo-publish clause kept inline per D20 (mildly action-relevant: visible in server browser, only flagged behavior beyond the cap); mechanism in reasoning. No See-also (no concept-note candidate anchored on maxclients).",
  "description_proposed": null
}
```
