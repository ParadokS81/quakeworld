# describe-fill-synthesis ledger -- qtv `dstream_timeout`

- **Project:** qtv
- **Knob:** `dstream_timeout` (cvar)
- **Registered name string:** `dstream_timeout` -- registered `pkg/qtv/downstream_storage.go:214` (`qtv.qvs.Reg("dstream_timeout", "30")`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease = "1.16-dev"`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; the example config `resources/qtv.cfg:64-65` carries a hint comment but is NOT ground truth / NOT a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar; `suspect_pool_member = FALSE`).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
dstream_timeout: synthesized -- cold-synth, no comment; the send-deadline in seconds bounding an actively-streaming downstream (viewer/relay) -- if no data is successfully sent within it the connection is dropped; refreshed on each successful send; clamped 1..999999 s; default 30 -- origin=synthesized ref=pkg/qtv/downstream.go:415 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> How long, in seconds, QTV waits while streaming to a connected downstream client (a viewer or relay proxy pulling the stream) before giving up and dropping that connection. The deadline is refreshed every time QTV successfully sends data to the client, so a healthy client that keeps receiving the stream is never dropped; a client that stops accepting data is disconnected once this many seconds pass with no successful send. Values are clamped to between 1 and 999999 seconds. This is the downstream (viewer-side) timeout; the upstream (source) connection has its own separate ustream_timeout.
>
> Default: 30.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`grep -rn "dstream_timeout" . --include="*.go"`) confirms exactly ONE register site and ONE read site; no use-site anywhere else in the tree (no tests, no http, no other file). All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/downstream_storage.go:214` | `qtv.qvs.Reg("dstream_timeout", "30")` -- registers the name with default `30`; flags arg defaults to `0` (no SERVERINFO, no init-only, no read-only -- `Reg` -> `RegEx(..., 0, nil)`) |
| Read site (deadline computation) | `pkg/qtv/downstream.go:415` | `deadLine := durationBound(1, ds.qtv.qvs.Get("dstream_timeout").Dur, 999999) * time.Second` -- the value (as `.Dur`) is clamped to `[1, 999999]` then multiplied by `time.Second` to form the connection deadline |
| Enforcement (deadline set on conn) | `pkg/qtv/downstream.go:416` | `ds.conn.SetDeadline(time.Now().Add(deadLine))` -- applies the deadline to the downstream TCP connection; a Go net deadline that elapses with no I/O makes the next read/write fail, which drops the connection |
| Gate (when the deadline is refreshed) | `pkg/qtv/downstream.go:412-414` | `case <-ds.wb.RC:` then `if ds.linkedUs != nil {` -- the deadline is (re)set on the branch taken when output-buffer data was successfully consumed (sent) AND the downstream is linked to an upstream (i.e. actively streaming) |
| Failure path (what happens on timeout) | `pkg/qtv/downstream.go:594-605` (`ioWriter`) + `:600` | `ds.wb.WriteToWithContext(ctx, ds.conn)` returns an error when the conn deadline elapses; the error goes to `ds.ioECh`, which `mainLoop` (`:389,397`) returns on, ending the stream and closing the conn (`:372`, `cancel` `:96-110`) |

## D5 rubric check (Step 3)

Cold-synth: register site `pkg/qtv/downstream_storage.go:214` has no trailing comment, and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. The example-config comment (`resources/qtv.cfg:64` "Downstream timeout in seconds") is a HINT only (SR-1), and as a candidate description it FAILS D5 clause 2 (it restates the name and adds only the unit) -> SYNTHESIZE, do not affirm. Rubric on the synthesized text: (1) states the admin-observable WHAT (how long before a stalled downstream is dropped); (2) not a name restatement (spells out which connection, the refresh-on-send behavior, the drop consequence, and the clamp); (3) units spelled (seconds) and the clamp range stated; numeric scalar; (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Scope: this is the DOWNSTREAM (viewer/relay) connection, distinct from upstream | `pkg/qtv/qtv.go:502` (`dss.serve(downstreamListener)`) + `downstream.go:28,35` + `downstream.go:415` (read only here) | `g.Go(func() error { return qtv.dss.serve(downstreamListener) })`; struct doc `// Downstream representation object.`, `conn ... // Network connection with downstream.`; `dstream_timeout` read only in `downstream.go`, the upstream half uses `ustream_timeout` in `upstream_io_tcp.go:67` (`qtv.go:501` `uss.serve()`) | MATCH |
| Semantic: it is a deadline; elapsing it drops the connection | `pkg/qtv/downstream.go:416` (SetDeadline) + `:600`/`:585` (I/O on conn) + `:389,397` (return on ioECh) | `ds.conn.SetDeadline(time.Now().Add(deadLine))`; a Go `net.Conn` deadline makes `WriteToWithContext`/`ReadFromWithContext` fail once it elapses; that error is pushed to `ds.ioECh` and `mainLoop` returns on `case err := <-ds.ioECh: return err`, closing the conn | MATCH |
| Semantic: refreshed on each SUCCESSFUL send while actively streaming | `pkg/qtv/downstream.go:412-416` | `case <-ds.wb.RC:` (output buffer was consumed/read out) ` if ds.linkedUs != nil { // Update dead line if we parsed header and successfully sending data.` then `SetDeadline(...)` -- the only refresh is on this successfully-sent + linked branch; comment confirms "successfully sending data" | MATCH |
| Semantic: a healthy receiving client is not dropped; a client that stops accepting data is | `pkg/qtv/downstream.go:412-416` (refresh) vs `:416` deadline elapsing | refresh only fires on `<-ds.wb.RC` (data successfully moved out toward the client); if the client stops reading, `wb.RC` stops firing, the deadline is not refreshed, and the previously-set deadline elapses -> drop (per the SetDeadline + I/O-fail chain above) | MATCH |
| Units: seconds | `pkg/qtv/downstream.go:415` (`* time.Second`) + `var.go:56` (`.Dur` derivation) | `durationBound(1, ...Dur, 999999) * time.Second` -- the bounded integer value is multiplied by `time.Second`; `.Dur = time.Duration(fv)` (`var.go:56`) where `fv = ParseFloat("30") = 30`, so `Dur = 30` (a raw count), clamped to `[1,999999]`, then `*time.Second` = 30 s | MATCH |
| Clamp: values clamped to [1, 999999] seconds | `pkg/qtv/downstream.go:415` + `math.go:66-77` (`durationBound`) | `durationBound(1, <val>, 999999)`; `durationBound` returns `min` if `val<min`, `max` if `val>max`, else `val` (`math.go:70-76`); the clamp is applied to the integer count BEFORE `*time.Second`, so the effective range is 1..999999 seconds | MATCH |
| Default: 30 (seconds) | `pkg/qtv/downstream_storage.go:214` (WI-2: registered default) + `var.go:56` + `downstream.go:415` (`* time.Second`) | `Reg("dstream_timeout", "30")` -> registered string `"30"`; `.Dur = time.Duration(ParseFloat("30")) = 30`, within `[1,999999]`, `* time.Second` -> 30 seconds | MATCH |
| Set by: server config (flags `0`; no SERVERINFO, no command/vote sets it) | `pkg/qtv/downstream_storage.go:214` + `var.go:202-203,189` (`Reg`->`RegEx(...,0,nil)`) | `Reg(name, value)` -> `RegEx(name, value, 0, nil)` (third arg `0` = no flags); the only `regCommands` registered (`downstream_storage.go:218-219` `dclose`, `dlist`) do not set this cvar | MATCH |

### Cross-check note (handshake deadline is a SEPARATE, fixed timeout -- correctly excluded)

During the header-handshake phase (`dsParsingHeader`) the connection deadline is a FIXED `5 * time.Second` (`downstream.go:187`), and the various `sendReply*` helpers set their own fixed 100ms / 5s deadlines (`downstream.go:220,226,232,239`). These are NOT governed by `dstream_timeout`; `dstream_timeout` governs ONLY the active-streaming send deadline (`downstream.go:415`, gated on `linkedUs != nil`). The description therefore scopes the clause to "while streaming" and does not claim `dstream_timeout` covers the handshake. (The upstream sibling `ustream_timeout`, `upstream_io_tcp.go:67`, uses the identical `durationBound(1, ..., 999999) * time.Second` pattern -- corroborating the seconds units and clamp reading.)

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`durationBound`, `SetDeadline`, `ds.wb.RC`, `linkedUs`, `ioWriter`, `WriteToWithContext`, `ioECh`, `mainLoop`, `qvs.Reg`, `.Dur`, `time.Second`), the `time.Duration(fv)` derivation, the channel-branch mechanism, and the flags-arg reasoning. The user doc states only the admin-observable WHAT (the send-deadline in seconds; refresh-on-successful-send; drop-on-stall), the downstream-vs-upstream distinction, the clamp range, Default, and Set-by. No `See also:` line: the cross-reference to `ustream_timeout` is same-codebase sibling-knob context (action-relevant disambiguation for an admin tuning timeouts), stated inline in plain terms rather than as an L3 concept-note slug; there is no cross-engine consequence here.

## Rationale

Cold-synth from fully-legible use-sites. `dstream_timeout` is read exactly once, at `pkg/qtv/downstream.go:415`, where its `.Dur` value is clamped by `durationBound(1, ..., 999999)` and multiplied by `time.Second` to form a connection deadline applied via `ds.conn.SetDeadline(...)` (`downstream.go:416`). The deadline is (re)set ONLY on the `<-ds.wb.RC` branch when `ds.linkedUs != nil` (`downstream.go:412-414`) -- i.e. each time output data was successfully consumed/sent toward the downstream while it is actively streaming (the adjacent comment, `downstream.go:414`, says "Update dead line if we parsed header and successfully sending data"). A Go `net.Conn` deadline that elapses with no further I/O makes the writer/reader goroutines' calls fail (`WriteToWithContext`/`ReadFromWithContext`, `downstream.go:600,585`); that error flows to `ds.ioECh` and `mainLoop` returns on it (`downstream.go:389,397`), which closes the connection (`downstream.go:372`, `cancel` `downstream.go:96-110`). Hence: a client that keeps receiving the stream perpetually refreshes its deadline and is never dropped; a client that stops accepting data stops refreshing and is dropped after the deadline elapses. The connection is unambiguously the DOWNSTREAM half (`dStreamStorage.serve` on `downstreamListener`, `qtv.go:502`; struct "Downstream representation object", `downstream.go:28`); the upstream (source) connection uses the separate `ustream_timeout` (`upstream_io_tcp.go:67`, `qtv.go:501`), so the description distinguishes them.

Units / clamp (WI-2 + B1): the registered value is the string `"30"` (`downstream_storage.go:214`); `.Dur = time.Duration(ParseFloat("30")) = 30` as a raw count (`var.go:56`). At the read site it is clamped to `[1, 999999]` by `durationBound` (`math.go:66-77`) and THEN multiplied by `time.Second` (`downstream.go:415`), so the clamp applies to the integer count and the effective range is 1..999999 SECONDS, default 30 s. (Note the clamp is on the unscaled count -- the description states the range in seconds, which is the admin-meaningful form.) Flags arg is `0` (`Reg`->`RegEx(..., 0, nil)`, `var.go:202-203,189`) -> no `CVAR_SERVERINFO`, not init-only, not read-only; no command or vote sets it (the only downstream commands are `dclose`/`dlist`, `downstream_storage.go:218-219`), so `Set by: server config`.

The handshake-phase deadline (`5 * time.Second`, `downstream.go:187`) and the per-reply deadlines (100ms / 5s, `downstream.go:220,226,232,239`) are FIXED and are NOT governed by `dstream_timeout` -- the description correctly scopes the clause to active streaming and does not over-claim (see the cross-check note above). No Step 4 hedge is needed: every asserted clause is source-legible in this tree (unlike the buffer-size siblings, this knob does not touch the third-party ringbuffer internals).

The example config `resources/qtv.cfg:64-65` ("Downstream timeout in seconds" / commented `dstream_timeout 30`) corroborates BOTH the unit (seconds) and the default (30) and the downstream scope -- it is an admissible HINT only (SR-1), not ground truth and not a seed; its comment is a name-restatement that does not clear D5, so it is not affirmed. No C2 conflict (source default and config hint agree on 30). `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30 -- provenance holds retained shipped-doc DATA only).

Self-classification: TRACED-CLEAN -- every asserted clause maps to an enforcing branch/compare/assign line; no clause rests on the cvar name, an enum/string, or the config comment. No SR-4/SR-5 breadcrumb fires (this is a local per-connection idle/send-timeout knob with no master-server, MVD-streaming/parse_delay, or qtv_password auth cross-codebase surface).

## D6Record

```json
{
  "project": "qtv",
  "knob": "dstream_timeout",
  "type": "cvar",
  "description": "How long, in seconds, QTV waits while streaming to a connected downstream client (a viewer or relay proxy pulling the stream) before giving up and dropping that connection. The deadline is refreshed every time QTV successfully sends data to the client, so a healthy client that keeps receiving the stream is never dropped; a client that stops accepting data is disconnected once this many seconds pass with no successful send. Values are clamped to between 1 and 999999 seconds. This is the downstream (viewer-side) timeout; the upstream (source) connection has its own separate ustream_timeout.\n\nDefault: 30.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/downstream_storage.go:214 (qtv.qvs.Reg(\"dstream_timeout\", \"30\"); registered default 30), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep (grep -rn dstream_timeout . --include=*.go) confirms exactly ONE register site + ONE read site, nowhere else (no tests/http/other). Clauses->cites: DOWNSTREAM scope (distinct from upstream) -> qtv.go:502 dss.serve(downstreamListener) + downstream.go:28,35 struct doc 'Downstream representation object'/conn 'Network connection with downstream' (dstream_timeout read only in downstream.go; upstream half uses ustream_timeout in upstream_io_tcp.go:67, qtv.go:501 uss.serve()). It is a deadline whose elapse drops the conn -> downstream.go:416 ds.conn.SetDeadline(time.Now().Add(deadLine)); a Go net.Conn deadline makes WriteToWithContext/ReadFromWithContext (downstream.go:600,585) fail on elapse, error -> ds.ioECh, mainLoop returns on case err:=<-ds.ioECh (downstream.go:389,397), conn closed (downstream.go:372, cancel :96-110). Refreshed on each SUCCESSFUL send while actively streaming -> only refresh is downstream.go:412-416 case <-ds.wb.RC: if ds.linkedUs != nil { ...SetDeadline }, adjacent comment :414 'Update dead line if we parsed header and successfully sending data'. Healthy receiving client not dropped / stalled client dropped -> refresh fires only when wb.RC fires (data moved out toward client); client that stops reading stops refreshing -> previously-set deadline elapses -> drop. Units seconds -> downstream.go:415 durationBound(1, ...Dur, 999999) * time.Second; var.go:56 .Dur=time.Duration(ParseFloat(\"30\"))=30 (raw count), clamped [1,999999] then *time.Second = 30s. Clamp [1,999999] seconds -> durationBound math.go:66-77 (returns min if val<min, max if val>max, else val) applied to the integer count BEFORE *time.Second -> effective 1..999999 seconds. Default 30 (WI-2) -> Reg literal :214 ('30') + var.go:56 + *time.Second. Set-by server config -> flags arg 0 (Reg->RegEx(...,0,nil) var.go:202-203,189; no CVAR_SERVERINFO/init-only/read-only); only downstream commands dclose/dlist (downstream_storage.go:218-219) do not set it. CROSS-CHECK (correctly excluded): the handshake-phase deadline is a SEPARATE fixed 5*time.Second (downstream.go:187, dsParsingHeader) and the sendReply* helpers set fixed 100ms/5s deadlines (downstream.go:220,226,232,239); none are governed by dstream_timeout, which covers ONLY the active-streaming send deadline (gated linkedUs!=nil) -> description scoped to 'while streaming', no over-claim. Sibling ustream_timeout (upstream_io_tcp.go:67) uses identical durationBound(1,...,999999)*time.Second pattern, corroborating seconds+clamp. No Step 4 hedge needed (this knob does not touch third-party ringbuffer internals; every clause legible in-tree). Example config resources/qtv.cfg:64-65 ('Downstream timeout in seconds' / dstream_timeout 30) corroborates unit+default+downstream scope but is a HINT only (SR-1, not a seed; its name-restatement comment does not clear D5). No C2 conflict (source and config agree on 30). provenance=null (cold-synth, operator 2026-05-30). No See-also/L3 breadcrumb: local per-connection timeout knob, no master/MVD-parse_delay/qtv_password cross-codebase surface. Grading: synthesized, high confidence, every asserted clause TRACED-CLEAN.",
  "description_proposed": null
}
```
