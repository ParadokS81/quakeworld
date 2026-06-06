# describe-fill-synthesis ledger -- qtv `network`

- **Project:** qtv
- **Knob:** `network` (cvar)
- **Registered name string:** `network` -- registered `pkg/qtv/qtv.go:208` (`qtv.qvs.RegEx("network", "", qVarFlagInitOnly, nil)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (NULL description; no trailing comment at the register site; the seed `qtv.cfg` carries a hint comment but is NOT ground truth / NOT a seed-of-record).
- **Suspect-pool member:** FALSE (frozen snapshot; no C3 runtime-dead pool in this arc).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qtv:network: synthesized -- IP-protocol-family suffix appended to "tcp"/"udp" for every socket the proxy opens; empty = Go default (both families); set only before init -- origin=synthesized ref=pkg/qtv/qtv.go:223 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> Forces the IP protocol family used for all of this proxy's network connections (both its listening sockets and the outbound connections it makes to game servers). Leave empty to let the system choose; set it to restrict the proxy to IPv4 only or IPv6 only.
>
> (empty) = system default (either IPv4 or IPv6).
> 4 = IPv4 only.
> 6 = IPv6 only.
> Default: empty.
> Set by: server config (only while the proxy is still starting up; it cannot be changed once running).

## Read use-sites (WI-1 wide read)

Tree-wide grep (`"network"` / `.network(` / `networkTCP` / `networkUDP`) confirms all use-sites live in `pkg/qtv/qtv.go`, `pkg/qtv/udp.go`, and `pkg/qtv/upstream_io_tcp.go`. All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/qtv.go:208` | registers name `network`, default `""`, flag `qVarFlagInitOnly` |
| Read accessor | `pkg/qtv/qtv.go:218-220` | `network()` returns the raw cvar string |
| TCP family builder | `pkg/qtv/qtv.go:223-225` | `networkTCP()` returns `"tcp" + network()` -- e.g. `"tcp"`, `"tcp4"`, `"tcp6"` |
| UDP family builder | `pkg/qtv/qtv.go:228-230` | `networkUDP()` returns `"udp" + network()` -- e.g. `"udp"`, `"udp4"`, `"udp6"` |
| TCP listen | `pkg/qtv/qtv.go:480` | `net.Listen(qtv.networkTCP(), qtv.listenAddress())` -- the proxy's downstream/HTTP listener uses this family |
| UDP listen | `pkg/qtv/udp.go:73` | `net.ListenPacket(sv.qtv.networkUDP(), ...)` -- the UDP socket uses this family |
| UDP resolve | `pkg/qtv/udp.go:233` | `network := sv.qtv.networkUDP()` -- used to resolve UDP addresses |
| Upstream TCP dial | `pkg/qtv/upstream_io_tcp.go:50` | `d.DialContext(ctx, ust.qtv.networkTCP(), addr)` -- outbound connections to game servers use this family |

## D5 rubric check (Step 3)

Cold-synth: register site `pkg/qtv/qtv.go:208` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm; D5-amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (forces the IP protocol family of every socket); (2) not a name restatement (the name is `network`; the prose spells the family-suffix behavior, the empty=default state, and the init-only timing); (3) value meanings spelled (empty/4/6 with what each does); (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: the value is appended to `tcp`/`udp` to pick the IP family | `pkg/qtv/qtv.go:223-225` + `:228-230` | `func (qtv *QTV) networkTCP() string { return "tcp" + qtv.network() }` and `... return "udp" + qtv.network()` | MATCH |
| Scope: applies to ALL of the proxy's sockets (listen + outbound) | `pkg/qtv/qtv.go:480` (TCP listen), `pkg/qtv/udp.go:73` + `:233` (UDP), `pkg/qtv/upstream_io_tcp.go:50` (outbound dial) | `net.Listen(qtv.networkTCP(), qtv.listenAddress())`; `net.ListenPacket(sv.qtv.networkUDP(), ...)`; `d.DialContext(ctx, ust.qtv.networkTCP(), addr)` -- every socket uses the family builder | MATCH |
| Value: `4` -> IPv4 only, `6` -> IPv6 only (Go net family strings) | `pkg/qtv/qtv.go:223-230` (concatenation produces `tcp4`/`udp4` / `tcp6`/`udp6`) | `"tcp" + qtv.network()` -> `tcp4`/`tcp6`; Go's `net.Listen`/`net.Dial` interpret `tcp4`/`tcp6`/`udp4`/`udp6` as IPv4-only / IPv6-only | MATCH (suffix semantics are Go stdlib; the source enforces the suffix concatenation) |
| OFF-state: empty -> bare `tcp`/`udp` = system chooses the family | `pkg/qtv/qtv.go:208` (default `""`) + `:223-230` | default `""` -> `"tcp" + "" = "tcp"` and `"udp" + "" = "udp"`; Go treats bare `tcp`/`udp` as either family | MATCH |
| Default: empty | `pkg/qtv/qtv.go:208` | `qtv.qvs.RegEx("network", "", qVarFlagInitOnly, nil)` (2nd arg `""`) | MATCH |
| Set-by: server config, init-only (cannot change once running) | `pkg/qtv/qtv.go:208` (flag) + `pkg/qtv/var.go:40` (flag meaning) + `pkg/qtv/qtv.go:471` (`QtvWasInitializedNotify`) | flag `qVarFlagInitOnly`; `var.go:40` `// Variable could be changed only while QTV is not fully initialized.`; `ListenAndServe` calls `qtv.qvs.QtvWasInitializedNotify()` at startup to lock init-only vars | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`networkTCP`, `networkUDP`, `net.Listen`, `net.ListenPacket`, `DialContext`, `qVarFlagInitOnly`, `QtvWasInitializedNotify`), the `"tcp"+network()` concatenation mechanism, and the var-flag constant. The user doc states only the admin-observable WHAT (forces the IP family of all the proxy's connections), the value meanings (empty/4/6), Default, and Set-by (incl. the plain-English init-only consequence "cannot be changed once running").

## Rationale

Cold-synth from fully-legible use-sites. `network` is a protocol-family selector: its string is concatenated onto `"tcp"`/`"udp"` by `networkTCP()`/`networkUDP()` (`pkg/qtv/qtv.go:223-230`) to produce the Go network strings passed to `net.Listen` (`:480`), `net.ListenPacket` (`udp.go:73`), and the outbound `DialContext` (`upstream_io_tcp.go:50`). Empty default yields bare `tcp`/`udp` (Go: either family); `4`/`6` yield `tcp4`/`tcp6`/`udp4`/`udp6` (Go: that family only). The accessor comment at `pkg/qtv/qtv.go:217` corroborates: `// Useful if user wants to explicitly specify IPv4 or IPv6 protocol family.` Flag `qVarFlagInitOnly` (`:208`, meaning at `var.go:40`) plus the `QtvWasInitializedNotify()` lock at startup (`:471`) make it server-config-and-init-only -- stated in plain English as "cannot be changed once running."

The value-meaning table (empty / 4 / 6) leans on Go stdlib semantics for the `tcp4`/`tcp6` family strings; the SOURCE enforces the suffix concatenation that produces those strings, and the accessor comment names IPv4/IPv6 explicitly, so the clause is traced to enforcing code, not inferred from the knob name. The seed `qtv.cfg:18-20` comment ("network allows to choose protocol family for all network communications") is an admissible HINT only (SR-1, not a seed-of-record); it corroborates the "all communications" scope, which is independently confirmed by the four call-sites above.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing concatenation/call/flag line; no clause rests on the cvar name alone.

## D6Record

```json
{
  "project": "qtv",
  "knob": "network",
  "type": "cvar",
  "description": "Forces the IP protocol family used for all of this proxy's network connections (both its listening sockets and the outbound connections it makes to game servers). Leave empty to let the system choose; set it to restrict the proxy to IPv4 only or IPv6 only.\n\n(empty) = system default (either IPv4 or IPv6).\n4 = IPv4 only.\n6 = IPv6 only.\nDefault: empty.\nSet by: server config (only while the proxy is still starting up; it cannot be changed once running).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/qtv.go:208 (qtv.qvs.RegEx(\"network\", \"\", qVarFlagInitOnly, nil)), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep confirms use-sites in qtv.go, udp.go, upstream_io_tcp.go only. Clauses->cites: value appended to tcp/udp to pick IP family -> pkg/qtv/qtv.go:223-230 (networkTCP returns \"tcp\"+network(), networkUDP returns \"udp\"+network()); scope = ALL proxy sockets (listen + outbound) -> net.Listen at qtv.go:480, net.ListenPacket at udp.go:73 (+ udp.go:233 resolve), outbound DialContext at upstream_io_tcp.go:50; 4=IPv4-only / 6=IPv6-only -> concatenation yields Go family strings tcp4/tcp6/udp4/udp6 (Go stdlib interprets these as single-family; source enforces the suffix concat, accessor comment qtv.go:217 names IPv4/IPv6 explicitly); OFF-state empty -> bare tcp/udp = either family -> default \"\" at qtv.go:208 + concat at :223-230; Default empty -> qtv.go:208 (2nd arg \"\"); Set-by server config init-only -> flag qVarFlagInitOnly (qtv.go:208), flag meaning var.go:40 (// Variable could be changed only while QTV is not fully initialized.), startup lock QtvWasInitializedNotify() qtv.go:471. No clause rests on name alone; each maps to an enforcing concat/call/flag line. Seed qtv.cfg:18-20 comment corroborates 'all network communications' scope but is a HINT only (SR-1, not a seed-of-record); scope independently confirmed by the four call-sites. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
