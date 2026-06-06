# describe-fill-synthesis ledger -- qtv `address`

- **Project:** qtv
- **Knob:** `address` (cvar)
- **Registered name string:** `address` -- registered `pkg/qtv/qtv.go:210` (`qtv.qvs.Reg("address", "")`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (NULL description; no trailing comment at the register site; the seed `qtv.cfg` carries a hint comment but is NOT ground truth / NOT a seed-of-record).
- **Suspect-pool member:** FALSE (frozen snapshot; no C3 runtime-dead pool in this arc).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qtv:address: synthesized -- the proxy's external (publicly reachable) address:port; advertised to the game server in the upstream handshake and used in the "Watch now" links on the web page; empty -> upstream key omitted and the web page falls back to the request host; default empty -- origin=synthesized ref=pkg/qtv/upstream.go:636 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> The proxy's own publicly reachable address and port, as other machines should connect to it. The game server is told this address when the proxy connects to it, and it is used to build the "Watch now" links on the proxy's web page. Set this when the proxy sits behind NAT or a different public hostname than the one it listens on. If left empty, the proxy does not advertise an address to the game server, and the web page links fall back to whatever address the visitor used to reach the page.
>
> Default: empty.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`"address"` / `.address(` / `.Address`) confirms the GLOBAL `address` cvar use-sites live in `pkg/qtv/qtv.go`, `pkg/qtv/upstream.go`, and `pkg/qtv/http.go`. (`pkg/qtv/upstream_storage.go:382-385` parses a PER-STREAM `address` option override, NOT this global cvar; `listenAddress`/`remoteHostName`/`sourceFromServerAddress` are unrelated. The per-stream override is the fallback ANTECEDENT to this cvar -- see `upstream.go:617-624`.) All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/qtv.go:210` | registers name `address`, default `""`, no flags |
| Upstream address resolve | `pkg/qtv/upstream.go:617-624` | `address()` returns the per-stream override if set, else the global `address` cvar (`us.qtv.qvs.Get("address")`) |
| Upstream userinfo advertise | `pkg/qtv/upstream.go:630-638` | if the resolved address is non-empty, sets `address` + `streamid` keys in the userinfo sent to the game server in the QTV headers handshake |
| Web page link source | `pkg/qtv/http.go:122,124-125` | `Address: ...Get("address").Str`; if empty, `data.Address = r.Host` (falls back to the HTTP request host) |
| Web page "Watch now" link | `pkg/qtv/http.go:234-235` | `qw://{{.Id}}@{{$address}}/qtvplay` -- the per-stream address, falling back to the global page address | 

## D5 rubric check (Step 3)

Cold-synth: register site `pkg/qtv/qtv.go:210` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm; D5-amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (the proxy's external address and where it is advertised); (2) not a name restatement (the name is `address`; the prose spells the two surfaces -- upstream handshake + web links -- the NAT use-case, and the empty-state fallbacks); (3) it is a host:port string (no enum), format stated; (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: this is the proxy's external/public address (vs its listen address) | `pkg/qtv/upstream.go:617-624` (resolve) + the comment | `// Get address for this upstream. Upstream could have either own address or global qtv address.` then `address := us.qtv.qvs.Get("address"); return address.Str` -- a separate cvar from `listen_address`, used as the advertised address | MATCH |
| Surface: advertised to the game server in the handshake | `pkg/qtv/upstream.go:630-638` | `address := us.address()` ... `if address != "" { ui.Set("address", address); ui.Set("streamid", us.id) }` inside `userInfo()` (the "upstream user info for QTV headers handshake") | MATCH |
| Surface: used to build the "Watch now" web links | `pkg/qtv/http.go:122` + `:234-235` | `Address: sv.qtv.qvs.Get("address").Str`; template `qw://{{.Id}}@{{$address}}/qtvplay` with `{{if not $address}}{{$address = $.Address}}{{end}}` | MATCH |
| OFF-state: empty -> not advertised to the game server | `pkg/qtv/upstream.go:635-638` | `if address != "" { ui.Set("address", address); ... }` -- empty address means the `address`/`streamid` keys are NOT set | MATCH |
| OFF-state: empty -> web page falls back to the request host | `pkg/qtv/http.go:124-125` | `if data.Address == "" { data.Address = r.Host }` | MATCH |
| Default: empty | `pkg/qtv/qtv.go:210` | `qtv.qvs.Reg("address", "")` (2nd arg `""`) | MATCH |
| Set-by: server config | `pkg/qtv/qtv.go:210` | registered with no init-only/read-only flag; no command/vote writes the global cvar (the per-stream `address` option at `upstream_storage.go:382` is a separate stream-add option, not a set of this cvar) | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`address()`, `userInfo()`, `ui.Set`, `streamid`, `r.Host`, the `qw://...qtvplay` template), the per-stream-override resolve mechanism (stated only as "the game server is told this address"), and the userinfo-key mechanics. The cross-engine consequence (the game server, MVDSV, forwards this address to clients' server browsers so they can connect to the proxy) is routed to reasoning + the SR-5 breadcrumb, NOT inlined, because it does not change how an admin sets `address` (an admin sets it to its own external addr regardless of which downstream consumes it) -- per D20 default, cross-engine context goes to L3, not a `See also:` and not the description. The user doc states only the admin-observable WHAT (the proxy's external address, advertised to the server + used in the web links), the NAT use-case, the two empty-state fallbacks, Default, and Set-by.

## Rationale

Cold-synth from fully-legible use-sites. `address` is the proxy's externally-reachable address:port -- distinct from `listen_address` (the local bind). It is resolved by `uStream.address()` (`upstream.go:617-624`), which prefers a per-stream override and otherwise returns the global `address` cvar; the accompanying comment ("Upstream could have either own address or global qtv address") confirms the two-tier resolve. The resolved address has two observable surfaces: (1) inside `userInfo()` (`upstream.go:627-640`, "upstream user info for QTV headers handshake") it is advertised to the game server as the `address` key (with `streamid`) -- but only if non-empty (`:635`); (2) on the web now-playing page it is the host in the `qw://<id>@<address>/qtvplay` "Watch now" links (`http.go:234-235`), with the page-level fallback `data.Address = r.Host` when the cvar is empty (`http.go:124-125`). Both empty-state fallbacks are enforce-traced and stated plainly.

Default is empty (`:210`, WI-2 from the registered literal; `Reg` with `""`). No flags, and no command/vote writes the global cvar (the `case "address"` at `upstream_storage.go:382-385` parses a per-stream stream-add option, a different mechanism, not a set of this cvar), so `Set by: server config`. The seed `qtv.cfg:10-12` comment ("External address:port of QTV. QTV provides that address to MVDSV. MVDSV provides that address to clients server browser.") is an admissible HINT only (SR-1, not a seed-of-record); it corroborates exactly the source-traced behavior -- the advertise-to-server surface and the external-address semantics -- and names the downstream MVDSV->client-browser path, which I route to the breadcrumb rather than the description (non-action-changing, D20). No C2 conflict (source and seed agree).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing resolve/advertise/fallback line; no clause rests on the cvar name alone. [L3 breadcrumb: MVD streaming + parse_delay ghosting] is NOT applicable to `address` (it is a discovery/addressing knob, not a streaming-timing knob); the cross-engine note here is master/discovery-shaped context recorded in reasoning, not forced onto either Phase-4 candidate.

## D6Record

```json
{
  "project": "qtv",
  "knob": "address",
  "type": "cvar",
  "description": "The proxy's own publicly reachable address and port, as other machines should connect to it. The game server is told this address when the proxy connects to it, and it is used to build the \"Watch now\" links on the proxy's web page. Set this when the proxy sits behind NAT or a different public hostname than the one it listens on. If left empty, the proxy does not advertise an address to the game server, and the web page links fall back to whatever address the visitor used to reach the page.\n\nDefault: empty.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/qtv.go:210 (qtv.qvs.Reg(\"address\", \"\")), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep: GLOBAL address cvar use-sites in qtv.go, upstream.go, http.go (upstream_storage.go:382-385 parses a PER-STREAM address option override, a different mechanism, not a set of this cvar; that override is the fallback antecedent at upstream.go:617-624). Clauses->cites: external/public address (vs listen_address) -> upstream.go:617-624 resolve + comment (// Upstream could have either own address or global qtv address.), a separate cvar used as advertised address; advertised to the game server in the handshake -> upstream.go:630-638 (address := us.address(); if address != \"\" { ui.Set(\"address\", address); ui.Set(\"streamid\", us.id) } inside userInfo(), the 'upstream user info for QTV headers handshake'); used in 'Watch now' web links -> http.go:122 (Address: Get(\"address\").Str) + template http.go:234-235 (qw://{{.Id}}@{{$address}}/qtvplay); empty -> not advertised -> upstream.go:635-638 (guard if address != \"\"); empty -> web page falls back to request host -> http.go:124-125 (if data.Address == \"\" { data.Address = r.Host }); Default empty -> qtv.go:210 (Reg 2nd arg \"\"); Set-by server config -> no flag, no command/vote writes the global cvar. Cross-engine consequence (MVDSV forwards this address to client server browsers) is routed to reasoning, NOT inlined and NOT a See-also: it is non-action-changing for setting this cvar (admin sets its own external addr regardless), per D20 default cross-engine context -> L3. Seed qtv.cfg:10-12 comment ('External address:port of QTV. QTV provides that address to MVDSV. MVDSV provides that address to clients server browser.') is a HINT only (SR-1, not a seed-of-record); it corroborates the advertise-to-server surface + names the MVDSV->client-browser path. No C2 conflict (source and seed agree). [L3 breadcrumb: MVD streaming + parse_delay ghosting] NOT applied -- address is a discovery/addressing knob, not a streaming-timing knob; this cross-engine note is discovery-shaped context in reasoning, not forced onto either Phase-4 candidate. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
