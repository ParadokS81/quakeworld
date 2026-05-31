# MVDSV L1 describe-fill ledger -- `qtv_streamport`

**Skill:** `describe-fill-synthesis` (Opus 4.7 MAX, locked dial) -- one knob per invocation.
**Project:** mvdsv | **Anchor:** `1.11-53-g18d0362` (gate: `git describe --tags` printed exactly this).
**Mechanical candidate:** none -- cold-synth (registration line carries no trailing comment).
**Suspect-pool member:** FALSE (verified vs Phase-0 C3 pool; not runtime-dead).
**Verdict:** `synthesized` -- origin `synthesized`, confidence `high`.

L1 entity confirmed live: registered name string `"qtv_streamport"` at `src/sv_demo_qtv.c:25`
(C variable `qtv_streamport`, same case); `Cvar_Register(&qtv_streamport)` at `src/sv_demo_qtv.c:1512`.
Registered default literal `"0"` (matches extractor-recorded default `0`).

The registration site (`:25`) and the `Cvar_Register` site (`:1512`) are LOCATOR AIDS only.
The authoritative read use-site (the `source_ref`) is `src/sv_demo_qtv.c:122`, where
`qtv_streamport.value` is consumed and turned into the TCP listen port; the behavior is
enforced through the `SV_CheckQTVPort` body (`:118-143`) and its callee `NET_InitServer_TCP`
(`src/net.c:1373-1399`).

---

## Final `description` (D20 lean shape)

> Sets the TCP port the server listens on for direct QTV/MVD proxy stream connections. When set
> to a non-zero port, the server opens that port and accepts incoming proxy connections on it;
> at 0 the port is closed and no proxy can connect to the server directly. Changing the value
> while the server is running closes the old port (dropping any current proxy connections) and
> reopens on the new one. Valid range is 0 to 65534.
>
> Default: 0 (disabled).
> Set by: server config.

No file:line / engine jargon in the user-doc prose (D20). All trace cites live in
`description_reasoning` and the table below.

---

## Per-clause enforce-trace table

| # | Clause (in `description`) | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|---|
| 1 | TCP listen port for incoming QTV/MVD proxy stream connections | `src/sv_demo_qtv.c:122` -> `:139` -> `:142`; callee `src/net.c:1386` | `unsigned short int streamport = bound(0, (unsigned short int)qtv_streamport.value, 65534);` / `listenport = streamport;` / `NET_InitServer_TCP(listenport);` / (net.c) `svs.sockettcp = TCP_OpenListenSocket (port);` | MATCH |
| 1b | accepts incoming proxy connections on it | `src/sv_demo_qtv.c:159`, `:168`, `:218` | `SV_CheckQTVPort();` / `client = accept (NET_GetSocket(NS_SERVER, true), ...)` / `Con_Printf("MVD streaming client connected from %s\n", ...)` | MATCH |
| 2 | Valid range 0 to 65534 (clamp) | `src/sv_demo_qtv.c:121-122` | `// so user can't specify something stupid` / `bound(0, (unsigned short int)qtv_streamport.value, 65534)` | MATCH (upper bound is 65534, NOT 65535) |
| 3 | at 0 the port is closed / no proxy connects directly (OFF-state) | `src/sv_demo_qtv.c:127`; callee `src/net.c:1384`, `:1376-1382` | `|| (!streamport && NET_GetSocket(NS_SERVER, true) != INVALID_SOCKET) // stream port is zero but socket still open, lets close socket then.` / (net.c) `if (port) { svs.sockettcp = TCP_OpenListenSocket (port); ... }` preceded by unconditional close block | MATCH |
| 4 | changing live closes old port (drops current connections) + reopens on new one | `src/sv_demo_qtv.c:125`, `:134`, `:139`, `:142` | `changed = ( streamport != listenport // port changed.` / `SV_MVDCloseStreams(); // also close ative connects if any...` / `listenport = streamport;` / `NET_InitServer_TCP(listenport);` | MATCH |
| 5 | Default: 0 | `src/sv_demo_qtv.c:25` | `static cvar_t qtv_streamport     = {"qtv_streamport",      "0"};` | MATCH (registered cvar_t literal; WI-2 -- not a shipped-cfg value) |
| 6 | Set by: server config | `src/sv_demo_qtv.c:25`, `:1512` | initializer `{"qtv_streamport", "0"}` carries NO `CVAR_*` flag (not userinfo/serverinfo); `Cvar_Register (&qtv_streamport);` | MATCH (plain server console/config cvar; no vote/admin-command/info-key dispatch in any use-site) |

**V-pass self-classification:** TRACED-CLEAN. Every material clause maps to a located, verified
enforcing line incl. adjacent comments. The callee `NET_InitServer_TCP` was followed into
`src/net.c` (B1 callee-follow) to confirm the open/close polarity and the `if (port)` OFF-state
rather than stopping at the caller's `NET_InitServer_TCP(listenport)` invocation.

---

## Rationale

- **Cold-synth, not affirm.** The registration line has no trailing comment; the only nearby
  comments are dev-WHY about the clamp (`// so user can't specify something stupid`) and the
  socket open/close logic. No user-WHAT comment exists to affirm, so Step 3 routes to Step 5
  full synthesis (D5 amendment). Expected `synthesized` verdict confirmed.
- **r42 / WI-1 discipline on the clamp.** The clamp upper bound is 65534, not the full 65535 --
  asserted directly from the `bound(0, ..., 65534)` enforcing line, not inferred from "it's a
  port so 65535".
- **WI-2 default.** Default 0 taken from the `cvar_t` initializer literal, not any shipped cfg.
- **Set-by.** No `CVAR_SERVERINFO`/`CVAR_USERINFO`/access flag on the registration; no
  vote/admin-command/info-key read-site anywhere in the grep -- it is a plain server config cvar.
- **Cross-engine note routed OUT (D20).** The downstream consequence (an external QTV/fteqtv
  proxy connects TO this port, vs. `mvdport` which is the server pulling/pushing differently)
  is cross-codebase context, not action-changing for the admin setting this cvar, so it is not
  inlined; it belongs to L3 if/when a QTV-streaming concept note exists. The L1 `description`
  states only the same-codebase, source-enforced behavior.
- **`description_provenance` = null** -- cold-synth; no retained shipped-doc DATA (operator
  clarification 2026-05-30). Grounding is `source_ref` + anchor + the reasoning cites.

---

```json
{
  "project": "mvdsv",
  "knob": "qtv_streamport",
  "type": "cvar",
  "description": "Sets the TCP port the server listens on for direct QTV/MVD proxy stream connections. When set to a non-zero port, the server opens that port and accepts incoming proxy connections on it; at 0 the port is closed and no proxy can connect to the server directly. Changing the value while the server is running closes the old port (dropping any current proxy connections) and reopens on the new one. Valid range is 0 to 65534.\n\nDefault: 0 (disabled).\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (no user-WHAT trailing comment at registration src/sv_demo_qtv.c:25; only dev-WHY clamp/socket comments) -> Step 5. Read use-site src/sv_demo_qtv.c:122 (qtv_streamport.value -> streamport). Clauses: TCP-listen-port-for-QTV-proxy -> :122/:139/:142 + callee net.c:1386 (TCP_OpenListenSocket); accepts incoming proxies -> :159/:168/:218 (accept + 'MVD streaming client connected'); range 0..65534 -> :122 bound(0,...,65534) w/ adjacent comment :121 'so user can't specify something stupid' (upper bound 65534 not 65535); OFF-state 0=closed -> :127 ('!streamport && socket open -> close') + callee net.c:1384 'if (port)' guard preceded by unconditional close block net.c:1376-1382; live-change closes+reopens dropping connections -> :125 changed-detect, :134 SV_MVDCloseStreams, :139, :142; Default 0 -> WI-2 cvar_t literal :25 {\"qtv_streamport\",\"0\"} (not shipped-cfg); Set-by server config -> :25 no CVAR_* flag + :1512 Cvar_Register, no userinfo/serverinfo/vote/admin/info-key read-site in tree. Callee net.c NET_InitServer_TCP followed per B1 to verify open/close polarity + OFF-state. V-pass self-class: TRACED-CLEAN. Cross-engine proxy-connects-to-port consequence routed OUT to L3 (not action-changing). No suspect-pool membership; live cvar.",
  "description_proposed": null
}
```
