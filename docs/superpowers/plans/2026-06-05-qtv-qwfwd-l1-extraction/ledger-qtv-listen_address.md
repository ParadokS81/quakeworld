# describe-fill-synthesis ledger -- qtv `listen_address`

- **Project:** qtv
- **Knob:** `listen_address` (cvar)
- **Registered name string:** `listen_address` -- registered `pkg/qtv/qtv.go:209` (`qtv.qvs.RegEx("listen_address", ":28000", qVarFlagInitOnly, nil)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (NULL description; no trailing comment at the register site; the seed `qtv.cfg` carries a hint comment but is NOT ground truth / NOT a seed-of-record).
- **Suspect-pool member:** FALSE (frozen snapshot; no C3 runtime-dead pool in this arc).
- **D6-sensitivity:** this is the Go equivalent of the C-QTV `mvdport` knob (SR-2 / D6 reject-list). The description is sourced STRICTLY from the Go `listen_address` read-sites; `mvdport` is never mentioned and never folded in.
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qtv:listen_address: synthesized -- the interface:port the proxy binds its TCP (QTV+HTTP, multiplexed) and UDP sockets to; empty host = all interfaces; default :28000; init-only -- origin=synthesized ref=pkg/qtv/qtv.go:480 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> The local address and port this proxy listens on for incoming connections. The same address and port is used for both the QuakeTV viewer protocol and the built-in web interface (they share one port), and for the proxy's UDP socket. Written as host:port; if the host part is left empty (just ":port"), the proxy listens on all of the machine's network interfaces.
>
> Default: :28000 (all interfaces, port 28000).
> Set by: server config (only while the proxy is still starting up; it cannot be changed once running).

## Read use-sites (WI-1 wide read)

Tree-wide grep (`listen_address` / `listenAddress`) confirms all use-sites live in `pkg/qtv/qtv.go` and `pkg/qtv/udp.go`. All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/qtv.go:209` | registers name `listen_address`, default `":28000"`, flag `qVarFlagInitOnly` |
| Read accessor | `pkg/qtv/qtv.go:232-234` | `listenAddress()` returns the raw cvar string |
| Status print | `pkg/qtv/qtv.go:456` | the `status` console command prints `listen addr: <value>` (admin-observable) |
| TCP bind | `pkg/qtv/qtv.go:480` | `net.Listen(qtv.networkTCP(), qtv.listenAddress())` -- the TCP listener bound to this address |
| TCP multiplex | `pkg/qtv/qtv.go:487-495` | one TCP listener is cmux-multiplexed: a `QTV`-prefix matcher -> downstream QTV viewers, `cmux.Any()` -> HTTP -- same port serves both |
| UDP bind | `pkg/qtv/udp.go:73` | `net.ListenPacket(sv.qtv.networkUDP(), sv.qtv.listenAddress())` -- the UDP socket bound to this same address |

## D5 rubric check (Step 3)

Cold-synth: register site `pkg/qtv/qtv.go:209` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm; D5-amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (the local address:port the proxy binds); (2) not a name restatement (the name is `listen_address`; the prose spells the host:port format, the shared-port multiplexing, the all-interfaces empty-host behavior, and the init-only timing); (3) format spelled (host:port, empty host = all interfaces); (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: this is the local listen address for incoming connections (TCP) | `pkg/qtv/qtv.go:480` | `listener, err := net.Listen(qtv.networkTCP(), qtv.listenAddress())` | MATCH |
| Scope: same address+port serves BOTH the viewer protocol AND the web interface (shared port) | `pkg/qtv/qtv.go:487-495` | `// Since we listen QTV and HTTP protocol on the same port we have to do multiplexing.` then `mux := cmux.New(listener)`, `downstreamListener := mux.Match(cmux.PrefixMatcher("QTV"))`, `httpListener = mux.Match(cmux.Any())` | MATCH |
| Scope: also used for the UDP socket | `pkg/qtv/udp.go:73` | `conn, err := net.ListenPacket(sv.qtv.networkUDP(), sv.qtv.listenAddress())` | MATCH |
| Format: host:port; empty host (`:port`) -> all interfaces | `pkg/qtv/qtv.go:480` + `:209` (default `:28000`) | the value is passed verbatim to Go `net.Listen`/`net.ListenPacket`; Go binds an empty host (`:port`) to all interfaces; the registered default `":28000"` itself has an empty host | MATCH (empty-host=all-interfaces is Go stdlib bind semantics; the source passes the value verbatim and the default exhibits the empty-host form) |
| Default: :28000 | `pkg/qtv/qtv.go:209` | `qtv.qvs.RegEx("listen_address", ":28000", qVarFlagInitOnly, nil)` (2nd arg `":28000"`) | MATCH |
| Set-by: server config, init-only (cannot change once running) | `pkg/qtv/qtv.go:209` (flag) + `pkg/qtv/var.go:40` (flag meaning) + `pkg/qtv/qtv.go:471` (`QtvWasInitializedNotify`) | flag `qVarFlagInitOnly`; `var.go:40` `// Variable could be changed only while QTV is not fully initialized.`; `ListenAndServe` calls `qtv.qvs.QtvWasInitializedNotify()` before binding | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`net.Listen`, `net.ListenPacket`, `cmux`, `PrefixMatcher`, `networkTCP`, `qVarFlagInitOnly`, `QtvWasInitializedNotify`), the cmux-multiplexing mechanism (named in plain English as "they share one port"), and the var-flag constant. The user doc states only the admin-observable WHAT (the local address:port the proxy binds), the host:port format, the shared-port + UDP scope, the all-interfaces empty-host behavior, Default, and Set-by (with the plain-English init-only consequence).

## Rationale

Cold-synth from fully-legible use-sites. `listen_address` is the local bind address for the proxy's sockets. Its string is passed verbatim to `net.Listen` for the TCP listener (`pkg/qtv/qtv.go:480`) and to `net.ListenPacket` for the UDP socket (`udp.go:73`). The single TCP listener is then cmux-multiplexed (`qtv.go:487-495`): connections beginning with the `QTV` prefix are routed to the downstream viewer handler, everything else to the HTTP handler -- the explicit code comment at `:487` confirms "we listen QTV and HTTP protocol on the same port." So one address:port serves both the viewer protocol and the web interface; this is the load-bearing admin-observable fact and is stated plainly ("they share one port"). The empty-host form (`:port`) binds to all interfaces -- this is Go stdlib `net.Listen` semantics; the source passes the value verbatim and the registered default `":28000"` (`:209`) itself exhibits the empty-host form, so the clause traces to enforcing code + the default literal rather than the knob name. Flag `qVarFlagInitOnly` (`:209`, meaning at `var.go:40`) plus the `QtvWasInitializedNotify()` lock (`:471`) make it server-config-and-init-only, stated as "cannot be changed once running."

D6-sensitivity (SR-2): this is the Go counterpart of the C-QTV `mvdport` knob, which exists ONLY in fteqtv (D13 fence) and is on the D6 reject-list. The description here is sourced strictly from the Go `listen_address` read-sites; `mvdport` is not mentioned and not folded in. The seed `qtv.cfg:14-16` comment ("Interface address:port QTV listen for incoming connections. If address is empty then QTV will listen on all interfaces.") is an admissible HINT only (SR-1, not a seed-of-record); it corroborates the empty-host=all-interfaces behavior, which is independently confirmed by the verbatim pass-through to Go's bind and the empty-host default.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing bind/multiplex/flag line; no clause rests on the cvar name alone, and the C-side `mvdport` is excluded per D6.

## D6Record

```json
{
  "project": "qtv",
  "knob": "listen_address",
  "type": "cvar",
  "description": "The local address and port this proxy listens on for incoming connections. The same address and port is used for both the QuakeTV viewer protocol and the built-in web interface (they share one port), and for the proxy's UDP socket. Written as host:port; if the host part is left empty (just \":port\"), the proxy listens on all of the machine's network interfaces.\n\nDefault: :28000 (all interfaces, port 28000).\nSet by: server config (only while the proxy is still starting up; it cannot be changed once running).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/qtv.go:209 (qtv.qvs.RegEx(\"listen_address\", \":28000\", qVarFlagInitOnly, nil)), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep confirms use-sites in qtv.go + udp.go only. Clauses->cites: local TCP listen address -> pkg/qtv/qtv.go:480 (net.Listen(networkTCP(), listenAddress())); same address+port serves viewer AND web interface (shared port) -> qtv.go:487-495 (explicit comment 'we listen QTV and HTTP protocol on the same port', cmux.New(listener), PrefixMatcher(\"QTV\") -> downstream, cmux.Any() -> HTTP); also UDP socket -> udp.go:73 (net.ListenPacket(networkUDP(), listenAddress())); host:port + empty-host=all-interfaces -> value passed verbatim to Go net.Listen/net.ListenPacket (Go binds empty host to all interfaces), registered default ':28000' at qtv.go:209 itself has empty host; Default :28000 -> qtv.go:209 (2nd arg); Set-by server config init-only -> flag qVarFlagInitOnly (qtv.go:209), meaning var.go:40 (// Variable could be changed only while QTV is not fully initialized.), startup lock QtvWasInitializedNotify() qtv.go:471. No clause rests on name alone; each maps to an enforcing bind/multiplex/flag line. D6-sensitivity (SR-2): Go counterpart of C-QTV mvdport (fteqtv-only, D6 reject-list) -- sourced strictly from Go listen_address read-sites, mvdport not mentioned/not folded in. Seed qtv.cfg:14-16 comment corroborates empty-host=all-interfaces but is a HINT only (SR-1, not a seed-of-record); independently confirmed by verbatim pass-through + empty-host default. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
