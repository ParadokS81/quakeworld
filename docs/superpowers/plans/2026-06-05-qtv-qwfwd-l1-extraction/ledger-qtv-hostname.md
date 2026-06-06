# describe-fill-synthesis ledger -- qtv `hostname`

- **Project:** qtv
- **Knob:** `hostname` (cvar)
- **Registered name string:** `hostname` -- registered `pkg/qtv/qtv.go:211` (`qtv.qvs.RegEx("hostname", "unnamed", qVarFlagServerInfo, nil)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (NULL description; no trailing comment at the register site; the seed `qtv.cfg` carries a hint comment but is NOT ground truth / NOT a seed-of-record).
- **Suspect-pool member:** FALSE (frozen snapshot; no C3 runtime-dead pool in this arc).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qtv:hostname: synthesized -- the proxy's display name; mirrored into serverinfo, shown on the web page header, and prefixed onto each relayed stream's name so viewers see the proxy plus the original server; default "unnamed" -- origin=synthesized ref=pkg/qtv/protocol_reader.go:167 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> The display name of this proxy. It appears in the server browser, on the proxy's web page, and in front of each stream's name so viewers can tell which proxy they are watching through and which game server the stream comes from. For a live game the stream is labelled as live; for a recorded demo it is labelled as recorded.
>
> Default: unnamed.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`hostname` / `hostName` / `HostName`) confirms use-sites in `pkg/qtv/qtv.go`, `pkg/qtv/protocol_reader.go`, `pkg/qtv/http.go`, and `pkg/qtv/upstream.go`. (`remoteHostName` and the upstream comments at `upstream.go:581-586` refer to the REMOTE server's hostname, not this cvar -- excluded.) All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/qtv.go:211` | registers name `hostname`, default `"unnamed"`, flag `qVarFlagServerInfo` (mirrored into serverinfo) |
| Read accessor | `pkg/qtv/qtv.go:236-238` | `hostName()` returns the raw cvar string |
| Status print | `pkg/qtv/qtv.go:455` | the `status` console command prints `hostname: <value>` |
| Stream-name rewrite (live) | `pkg/qtv/protocol_reader.go:155,167` | the relayed stream's serverinfo `hostname` becomes `"<our hostname> (live: <server hostname>)"` |
| Stream-name rewrite (demo) | `pkg/qtv/protocol_reader.go:164-167` | for a demo the tag is `recorded from` instead of `live` |
| Stream-name rewrite (proxy chain) | `pkg/qtv/protocol_reader.go:159-161` | when relaying from another proxy, our hostname is placed first and the upstream's bracketed part is kept |
| Web page header | `pkg/qtv/http.go:121,227` | `HostName: sv.qtv.hostName()` -> rendered as `QuakeTV: Now Playing on <hostname>` |
| Per-stream upstream label | `pkg/qtv/upstream.go:631-632` | `name := fmt.Sprintf("%v (%v)", hostname, us.id)` -- the upstream's display name is the proxy hostname + stream id |

## D5 rubric check (Step 3)

Cold-synth: register site `pkg/qtv/qtv.go:211` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm; D5-amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (the proxy's display name and where it surfaces); (2) not a name restatement (the name is `hostname`; the prose spells the three surfaces -- browser, web page, stream-name prefix -- and the live/recorded labelling); (3) it is a free-text string (no enum) so the format is just "a name", stated; (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Surface: appears in the server browser (mirrored into serverinfo) | `pkg/qtv/qtv.go:211` (flag) + `pkg/qtv/var.go:41` (flag meaning) | `RegEx("hostname", "unnamed", qVarFlagServerInfo, nil)`; `var.go:41` `// Variable mirrored inside server info.` (serverinfo is what a client's server browser reads) | MATCH |
| Surface: appears on the proxy's web page | `pkg/qtv/http.go:121` + `:227` | `HostName: sv.qtv.hostName()` rendered by template `QuakeTV: Now Playing on {{.HostName}}` | MATCH |
| Surface: prefixed onto each relayed stream's name | `pkg/qtv/protocol_reader.go:155,167` | `localHostName := qp.us.qtv.hostName()` then `remoteHostName = fmt.Sprintf("%s (%s: %s)", localHostName, tag, remoteHostName)` then `qp.serverInfo.Set("hostname", remoteHostName)` (`:169`) | MATCH |
| Label: live game vs recorded demo | `pkg/qtv/protocol_reader.go:163-166` | `tag := "live"` then `if qp.us.isDemo() { tag = "recorded from" }` | MATCH |
| Default: unnamed | `pkg/qtv/qtv.go:211` | `RegEx("hostname", "unnamed", ...)` (2nd arg `"unnamed"`) | MATCH |
| Set-by: server config | `pkg/qtv/qtv.go:211` | registered with no init-only/read-only restriction beyond serverinfo mirroring; no command/vote sets it (no `Cmd.Register` writes `hostname`; only `statusCmd` reads it) | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`hostName()`, `qVarFlagServerInfo`, `serverInfo.Set`, `fmt.Sprintf`, `isDemo`, the template name), the exact bracket grammar `"%s (%s: %s)"`, the "serverinfo mirror" mechanism (stated in plain English as "appears in the server browser"), and the proxy-chain special case (an internal display nicety, not stated in the user doc). The user doc states only the admin-observable WHAT (the proxy's display name and the three places it shows up) plus the live/recorded labelling, Default, and Set-by.

## Rationale

Cold-synth from fully-legible use-sites. `hostname` is the proxy's own display name. Three observable surfaces: (1) it is flagged `qVarFlagServerInfo` (`pkg/qtv/qtv.go:211`, meaning at `var.go:41` "mirrored inside server info"), so it reaches a client's server browser; (2) it is rendered on the proxy's web page header as "QuakeTV: Now Playing on <hostname>" (`http.go:121,227`); (3) most importantly, when the proxy relays a stream it rewrites that stream's serverinfo hostname to put its OWN name first, as `"<our hostname> (live: <server hostname>)"` for a live game or `"<our hostname> (recorded from: <server hostname>)"` for a demo (`protocol_reader.go:155-169`, tag chosen at `:163-166` via `isDemo()`). It is also used as the per-stream upstream label prefix (`upstream.go:631-632`). The live/recorded labelling is enforce-traced to the `tag` assignment and is a genuinely admin-observable consequence, so it is stated in plain English; the exact bracket grammar and the proxy-chain special case (`:159-161`) are internal display mechanics routed to reasoning per D20.

Default is `"unnamed"` (`:211`, WI-2 from the registered literal). No command or vote writes the cvar (the only command touching it, `statusCmd` at `qtv.go:449-462`, only reads it), so `Set by: server config`. The seed `qtv.cfg:7-8` comment ("hostname provides ability to specify description of this QTV. It would be seen in clients server browser.") is an admissible HINT only (SR-1, not a seed-of-record); it corroborates the server-browser surface, which is independently confirmed by the `qVarFlagServerInfo` flag.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing flag/render/rewrite line; no clause rests on the cvar name alone.

## D6Record

```json
{
  "project": "qtv",
  "knob": "hostname",
  "type": "cvar",
  "description": "The display name of this proxy. It appears in the server browser, on the proxy's web page, and in front of each stream's name so viewers can tell which proxy they are watching through and which game server the stream comes from. For a live game the stream is labelled as live; for a recorded demo it is labelled as recorded.\n\nDefault: unnamed.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/qtv.go:211 (qtv.qvs.RegEx(\"hostname\", \"unnamed\", qVarFlagServerInfo, nil)), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep confirms use-sites in qtv.go, protocol_reader.go, http.go, upstream.go (remoteHostName + upstream.go:581-586 comments refer to the REMOTE server's hostname, excluded). Clauses->cites: appears in server browser (serverinfo mirror) -> flag qVarFlagServerInfo qtv.go:211, meaning var.go:41 (// Variable mirrored inside server info.); appears on web page -> http.go:121 (HostName: sv.qtv.hostName()) rendered by template http.go:227 (QuakeTV: Now Playing on {{.HostName}}); prefixed onto each relayed stream's name -> protocol_reader.go:155 (localHostName := qp.us.qtv.hostName()) + :167 (fmt.Sprintf(\"%s (%s: %s)\", localHostName, tag, remoteHostName)) + :169 (serverInfo.Set(\"hostname\", remoteHostName)); live vs recorded label -> protocol_reader.go:163-166 (tag := \"live\"; if isDemo() tag = \"recorded from\"); Default unnamed -> qtv.go:211 (2nd arg); Set-by server config -> no command/vote writes it (only statusCmd qtv.go:449-462 reads it). The proxy-chain special case (protocol_reader.go:159-161) and the exact bracket grammar are internal display mechanics routed to reasoning per D20; the live/recorded label is enforce-traced and admin-observable so stated in plain English. No clause rests on name alone; each maps to an enforcing flag/render/rewrite line. Seed qtv.cfg:7-8 comment corroborates the server-browser surface but is a HINT only (SR-1, not a seed-of-record); independently confirmed by qVarFlagServerInfo. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
