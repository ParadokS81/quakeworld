# Ledger -- qtv `qtv` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill (QTV half)
**Handler:** `qtvCmd` (pkg/qtv/upstream_storage.go:394-416), registered pkg/qtv/upstream_storage.go:138
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.16-dev
**Confidence:** high

## Halt verdict

```
qtv: synthesized -- opens an upstream connection to a live source; address syntax [streamId@]host:port, chainable as hostN:portN@...@host1:port1 (dials host1 first, then back up the chain); optional positional upstream password + named options password/delay/address; usage error if no address -- ref=pkg/qtv/upstream_storage.go:394 -- self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Opens a new upstream connection: tells the proxy to connect to a live game server (an MVD source such as an mvdsv server, or another QTV proxy) and start relaying its stream to downstream viewers.
>
> qtv <[streamId@]host:port> [password] [options] = connect to that source.
>
> Address forms:
> host:port = connect to that server.
> streamId@host:port = connect to host:port and ask it for the stream with that id (used when the source is another proxy carrying several streams).
> hostN:portN@...@host2:port2@host1:port1 = chain through several proxies; the proxy connects to host1 first, then asks host1 for host2, and so on up the chain. The number of @ links allowed is capped by the maxchains setting.
>
> The optional bare password (before any named option) is the password this proxy uses to authenticate to the source it is connecting to.
>
> Options (each followed by a value):
> password <password> = sets the password that downstream viewers must give to watch this particular stream.
> delay <seconds> = the broadcast delay for this stream, overriding parse_delay for it (used to prevent ghosting on live games).
> address <address> = the address this stream advertises to server browsers.
>
> Set by: proxy console / config.

## Read use-sites / handler-trace (WI-1 wide read)

Tree-wide grep (`qtvCmd`, `parseOptions`, `"tcp:"`, `maxChains`, `addressFromServerStr`, `sourceFromServerAddress`, `usPassword`/`dsPassword`/`ingameDelay`/`options.address`) confirms the handler `qtvCmd`, the option parser `parseOptions`, the `tcp:` source prefix, the `@`-chain cap `maxChains`, and the address-string decomposition in `upstream.go`.

| Site | file:line | Observable admin-facing behavior |
|---|---|---|
| Register | pkg/qtv/upstream_storage.go:138 | `qtv.cmd.Register("qtv", qtvCmd)` -- name `qtv` -> handler `qtvCmd` |
| Handler + usage text | pkg/qtv/upstream_storage.go:394-416 | `Argc() < 2` -> prints the full usage/options block and errors; else parses options and opens `"tcp:"+Argv(1)` |
| In-source usage block | pkg/qtv/upstream_storage.go:400-408 | the literal help text: `<[streamId@]host:port> [password] [options]`, the 3 options, and the chaining explanation ("connect to host1, then host2 and finally host3") |
| Option parser | pkg/qtv/upstream_storage.go:360-392 | Argv(2) (bare) -> `usPassword`; named `password`/`delay`/`address` from index 3 -> `dsPassword`/`ingameDelay`/`options.address`; unknown -> warning |
| Option meanings (struct comments) | pkg/qtv/upstream.go:145-151 | `usPassword`=password THIS proxy uses connecting to remote; `dsPassword`=password downstream clients must give; `ingameDelay`=may overwrite `parse_delay`; `address`=broadcast to server browsers |
| tcp: source prefix | pkg/qtv/upstream.go:551-557 | `protocolFromServerStr` -- `tcp:` selects the live-server source type (vs `file:` for `playdemo`) |
| @-chain cap | pkg/qtv/upstream_storage.go:170-172 + :154-156 | `if strings.Count(server, "@") > uss.maxChains()` -> reject; `maxChains` = `maxchains` cvar bounded [0,5] |
| Address decomposition (chain order) | pkg/qtv/upstream.go:561-607 | `addressFromServerStr` uses the part after the LAST `@` as the host to dial; `sourceFromServerAddress` peels that off and passes the rest as the "source" requested -- recursing up the chain |
| parse_delay default | pkg/qtv/upstream_storage.go:85 | `qtv.qvs.Reg("parse_delay", "7")` -- the per-stream delay default the `delay` option overrides |

## D5 rubric check (Step 3)

Cold-synth: no trailing comment at the register site (only the in-handler usage strings, which are user-facing help, not a struct/source description to affirm), no shipped-doc candidate -> SYNTHESIZE from the handler + its callees. Rubric: (1) admin-observable WHAT (connects the proxy to a live source and relays it to viewers); (2) not a name restatement (the prose spells the address forms, chaining, the two distinct passwords, and the three options -- "qtv" alone says none of this); (3) the argument grammar and each option are spelled out, including the chain order and the two password meanings; (4) mechanism only, no recommended value; (5) self-contained. All hold.

## Per-clause enforce-trace table (B1)

Sites in pkg/qtv/upstream_storage.go + pkg/qtv/upstream.go at anchor 1.16-dev.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Opens an upstream connection to a live source | pkg/qtv/upstream_storage.go:414 | `_, err = qtv.uss.openAndRun("tcp:"+cmdArgs.Argv(1), true, options)` (openAndRun creates + runs an upstream) | MATCH |
| Source type is a live server (tcp:, not a demo file) | pkg/qtv/upstream.go:551-557 | `protocolFromServerStr`: `if strings.HasPrefix(server, "tcp:") { return "tcp:" }` (vs `file:` :555) | MATCH |
| No address arg -> usage error | pkg/qtv/upstream_storage.go:398-409 | `if cmdArgs.Argc() < 2 { fmt.Printf("Usage: %s <[streamId@]host:port> [password] [options]: open upstream connection\n", name) ... return fmt.Errorf(...) }` | MATCH |
| Address form `[streamId@]host:port` | pkg/qtv/upstream_storage.go:400 (usage) + upstream.go:561-585 | usage literal `<[streamId@]host:port>`; `addressFromServerStr` (:572-575) takes the part after the last `@` as host:port; `sourceFromServerAddress` (:584) maps a leading `streamId@` to the requested stream id | MATCH |
| streamId@ asks the source for that stream id | pkg/qtv/upstream.go:579-607 | comment `"tcp:streamId@hostname:port" -> "streamId"`; the function returns the pre-`@` token as the source the upstream requests | MATCH |
| Chaining hostN@...@host1; dials host1 (last) first, recurses up | pkg/qtv/upstream.go:561-607 + upstream_storage.go:407-408 (usage) | `addressFromServerStr` uses `LastIndexByte(server, '@')` -> dials the last segment; `sourceFromServerAddress` cuts the last segment and passes the rest as the source (recursing); usage comment "This will connect to host1, then host2 and finally host3" | MATCH |
| Number of @ links capped by `maxchains` | pkg/qtv/upstream_storage.go:170-172 + :154-156 + :87 | `if strings.Count(server, "@") > uss.maxChains() { return ... "maxchains reached" }`; `maxChains()` = `iBound(0, qvs.Get("maxchains").Int, 5)`; `Reg("maxchains","1")` :87 | MATCH |
| Bare positional password = password THIS proxy uses to connect to the source | pkg/qtv/upstream_storage.go:361-363 + upstream.go:147 | `if cmdArgs.Argc() > 2 { options.usPassword = optional.NewString(cmdArgs.Argv(2)) }`; struct comment `usPassword ... this upstream use that password when connecting to remote server` | MATCH |
| Option `password <pw>` = password downstream viewers must give | pkg/qtv/upstream_storage.go:368-374 + upstream.go:148 | `case "password": ... options.dsPassword = optional.NewString(p)`; struct comment `dsPassword ... clients should provide it in order to connect to this upstream` | MATCH |
| Option `delay <seconds>` = per-stream delay, overrides parse_delay | pkg/qtv/upstream_storage.go:375-381 + upstream.go:149 + :85 | `case "delay": ... strconv.ParseFloat(delayStr, 64) ... options.ingameDelay = optional.NewFloat64(delay)`; struct comment `ingameDelay ... Stream may overwrite 'parse_delay' setting`; `parse_delay` reg :85 | MATCH |
| Option `address <addr>` = address advertised to server browsers | pkg/qtv/upstream_storage.go:382-387 + upstream.go:150 + :617-625 | `case "address": ... options.address = optional.NewString(addr)`; struct comment `address ... broadcast it to server-browsers`; `us.address()` returns this option or the global | MATCH |
| Options come after the address (and bare password) | pkg/qtv/upstream_storage.go:360-391 | `parseOptions`: Argv(2) read as bare password, then `for i := 3; i < Argc()-1; i++` scans named options | MATCH |
| Set by: console / config | pkg/qtv/cmd.go:412-414 (console), pkg/qtv/qtv.go:90 + pkg/qtv/cmd.go:328 (config exec) | console channel prepend+exec; config `exec qtv` -> prepend of file data | MATCH |

## D20 split note

Routed to reasoning, kept OUT of `description`: every file:line, the Go identifiers (`qtvCmd`, `parseOptions`, `openAndRun`, `protocolFromServerStr`, `addressFromServerStr`, `sourceFromServerAddress`, `maxChains`/`iBound`, `uStreamOptions` and its fields `usPassword`/`dsPassword`/`ingameDelay`/`address`, `optional.NewString`, `qCmdArgs`, the `"tcp:"` prefix, `strings.Count`/`LastIndexByte`), and the console/`exec` plumbing. The user doc keeps the admin-observable WHAT (connect to a live source and relay it), the address grammar incl. chaining order, the maxchains cap (named as the setting, no internal bound), the two distinct passwords in plain terms, the three named options, and Set-by.

Note (D6 reject-list): the usage text mentions "mvdsv" (the typical source) and "server-browsers". This does NOT pull in any C-QTV reject-list knob (`mvdport`/`admin_password`/`floodprot`/`allow_http`). The `address` option here is the Go option that advertises this stream to server browsers (struct comment + `us.address()`), wholly distinct from the C `allow_http`/`mvdport` knobs; described strictly from the Go handler.

## Rationale

Cold-synth from a fully-legible handler and its callees. `qtvCmd` (upstream_storage.go:394-416) requires at least one argument; with none it prints the full in-source usage/options block (:400-408) and returns an error. Otherwise it parses options (`parseOptions`, :413) and opens the source as `"tcp:"+cmdArgs.Argv(1)` via `uss.openAndRun` (:414) -- creating and running a new upstream connection to a LIVE source. The `tcp:` prefix selects the live-server source type in `protocolFromServerStr` (upstream.go:551-557), distinct from the `file:` prefix `playdemo` uses.

Address grammar (all from the handler's usage literal :400-408 cross-checked against the parsing callees, NOT inferred from the strings):
- `host:port` -- plain connect. `addressFromServerStr` (upstream.go:561-577) returns the part after the last `@` (here the whole string) as the dial target.
- `streamId@host:port` -- `sourceFromServerAddress` (upstream.go:579-607) returns the pre-`@` token (`streamId`) as the source the upstream requests from `host:port`; its own doc-comment maps `"tcp:streamId@hostname:port" -> "streamId"`. Used when the source is itself a proxy carrying several streams.
- chaining `hostN:portN@...@host1:port1` -- `addressFromServerStr` dials the LAST `@` segment first (`host1`), and `sourceFromServerAddress` cuts that segment off and hands the remainder back as the "source" to request, which resolves to `host2`, then `host3` -- exactly the usage comment "connect to host1, then host2 and finally host3" (:407-408). The number of `@` links is rejected when it exceeds `maxChains()` (:170-172), which bounds the `maxchains` cvar to [0,5] (:154-156; `maxchains` default 1, :87) -- stated as "capped by the maxchains setting" (the [0,5] internal bound is engine detail, kept in reasoning).

Two distinct passwords (the load-bearing precision the brief asks for):
- the BARE positional token (Argv(2), before any named option) -> `options.usPassword` (:361-363), which struct comment upstream.go:147 defines as the password THIS proxy uses when connecting to the remote source ("upstream password"). This is the `[password]` in the usage line.
- the NAMED `password <pw>` option (:368-374) -> `options.dsPassword`, which struct comment upstream.go:148 defines as the password downstream clients must provide to watch this stream.
Described separately so an admin does not conflate them.

Other named options: `delay <seconds>` (:375-381) -> `options.ingameDelay`, a per-stream broadcast delay that overwrites the global `parse_delay` for this stream (struct comment upstream.go:149; `parse_delay` reg :85, default 7, and its own help comment frames it as anti-ghosting); `address <addr>` (:382-387) -> `options.address`, the address this stream advertises to server browsers (struct comment upstream.go:150; consumed by `us.address()` :617+). An unknown option name prints a warning and is skipped (:388-389).

No Default line (the only valid form takes a required address; no-arg is a usage error). Set-by: proxy console (stdin channel, qtv.go:412-414) or config file via `exec` (qtv.go:90 `exec qtv` -> cmd.go:328 prepend) -- and the qtv.cfg seed (resources/qtv.cfg:127-132, HINT only) documents exactly this `qtv host:port PASSWORD` usage as the way to add streams. No access tiers, no rcon in Go QTV.

D6 reject-list HELD: the description is sourced entirely from the Go handler + callees; it does not mention or seed from `mvdport`/`admin_password`/`floodprot`/`allow_http`. The "mvdsv" / "server-browsers" wording comes from the Go usage text and the Go `address` option, not from any C-QTV knob.

Self-classification: TRACED-CLEAN -- every clause (open/relay, tcp: source type, each address form, the chain dial order, the maxchains cap, both passwords, all three options, the options-after-address position, Set-by) maps to an enforcing branch/parse/compare/call line and its adjacent struct comment; no clause rests on the command name or on an un-traced help string alone (each usage-string claim was re-verified against the parsing callee).

[L3 breadcrumb: MVD streaming + parse_delay ghosting] -- the per-stream `delay` option overriding `parse_delay` is the qtv-side half of the parse_delay/ghosting concept-note candidate (SR-5 candidate b), the cross-codebase pair to the mvdsv MVD source and the ezquake viewer.

## D6Record

```json
{
  "project": "qtv",
  "knob": "qtv",
  "type": "command",
  "description": "Opens a new upstream connection: tells the proxy to connect to a live game server (an MVD source such as an mvdsv server, or another QTV proxy) and start relaying its stream to downstream viewers.\n\nqtv <[streamId@]host:port> [password] [options] = connect to that source.\n\nAddress forms:\nhost:port = connect to that server.\nstreamId@host:port = connect to host:port and ask it for the stream with that id (used when the source is another proxy carrying several streams).\nhostN:portN@...@host2:port2@host1:port1 = chain through several proxies; the proxy connects to host1 first, then asks host1 for host2, and so on up the chain. The number of @ links allowed is capped by the maxchains setting.\n\nThe optional bare password (before any named option) is the password this proxy uses to authenticate to the source it is connecting to.\n\nOptions (each followed by a value):\npassword <password> = sets the password that downstream viewers must give to watch this particular stream.\ndelay <seconds> = the broadcast delay for this stream, overriding parse_delay for it (used to prevent ghosting on live games).\naddress <address> = the address this stream advertises to server browsers.\n\nSet by: proxy console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth from handler qtvCmd (pkg/qtv/upstream_storage.go:394-416), registered pkg/qtv/upstream_storage.go:138 (qtv.cmd.Register(\"qtv\", qtvCmd)); the only in-source text is the handler's own usage/options block (user-facing help, not a struct description to affirm) -> synthesize from handler + callees, re-verifying every usage-string claim against the parsing code. Tree-wide grep (qtvCmd / parseOptions / \"tcp:\" / maxChains / addressFromServerStr / sourceFromServerAddress / usPassword,dsPassword,ingameDelay,options.address) confirms all use-sites. Clauses->cites: opens an upstream to a live source -> :414 qtv.uss.openAndRun(\"tcp:\"+cmdArgs.Argv(1), true, options); tcp: = live server source type (vs file:) -> protocolFromServerStr upstream.go:551-557; no address -> usage error -> :398-409 if Argc()<2 { Printf usage... return Errorf }; address form [streamId@]host:port -> usage literal :400 + addressFromServerStr upstream.go:561-577 (after-last-@ = host:port) + sourceFromServerAddress upstream.go:579-585 (leading streamId@ = requested stream id, doc-comment '\"tcp:streamId@hostname:port\" -> \"streamId\"'); chaining hostN@...@host1 dials host1 (LAST segment) first, recurses up -> addressFromServerStr LastIndexByte(server,'@') :572 dials last segment, sourceFromServerAddress :595-599 cuts last segment + passes remainder as source (recurse), usage comment :407-408 'connect to host1, then host2 and finally host3'; @-count capped by maxchains -> :170-172 if strings.Count(server,\"@\") > uss.maxChains() return 'maxchains reached', maxChains() = iBound(0, qvs.Get(\"maxchains\").Int, 5) :154-156, maxchains reg default 1 :87 (the [0,5] internal bound kept in reasoning, prose says 'capped by the maxchains setting'); BARE positional password = password THIS proxy uses to connect to the source -> :361-363 if Argc()>2 { options.usPassword = NewString(Argv(2)) } + struct comment upstream.go:147 'usPassword ... this upstream use that password when connecting to remote server'; named password <pw> = password downstream viewers must give -> :368-374 case \"password\" -> options.dsPassword + struct comment upstream.go:148 'dsPassword ... clients should provide it in order to connect to this upstream'; delay <seconds> = per-stream delay overriding parse_delay -> :375-381 case \"delay\" ParseFloat -> options.ingameDelay + struct comment upstream.go:149 'Stream may overwrite parse_delay setting' + parse_delay reg :85 (default 7, anti-ghosting per its help comment); address <addr> = advertised to server browsers -> :382-387 case \"address\" -> options.address + struct comment upstream.go:150 'broadcast it to server-browsers' + us.address() :617+; options come after address+bare password -> parseOptions :360-391 (Argv(2) bare, then for i:=3 named); unknown option -> warning :388-389. No Default (only valid form takes a required address; no-arg = usage error). Set-by console/config -> qtv.go:412-414 console channel prepend+exec, config exec qtv.go:90 -> cmd.go:328 prepend; qtv.cfg seed resources/qtv.cfg:127-132 documents 'qtv host:port PASSWORD' usage (HINT only, SR-1); no access tiers/no rcon. D6 reject-list HELD: described strictly from the Go handler; does NOT mention/seed mvdport/admin_password/floodprot/allow_http; the 'mvdsv'/'server-browsers' wording is from the Go usage text + Go address option, not a C-QTV knob. Grading: synthesized, high confidence, every clause TRACED-CLEAN; every usage-string claim re-verified against the parsing callee (no clause rests on the command name or an un-traced help string). [L3 breadcrumb: MVD streaming + parse_delay ghosting] -- the per-stream delay option overriding parse_delay is the qtv-side half of SR-5 candidate b. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
