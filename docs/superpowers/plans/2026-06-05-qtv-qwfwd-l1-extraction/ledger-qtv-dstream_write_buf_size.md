# describe-fill-synthesis ledger -- qtv `dstream_write_buf_size`

- **Project:** qtv
- **Knob:** `dstream_write_buf_size` (cvar)
- **Registered name string:** `dstream_write_buf_size` -- registered `pkg/qtv/downstream_storage.go:213` (`qtv.qvs.Regf("dstream_write_buf_size", "%v", 1024*64)`; the `Regf` formats `1024*64` = `65536` into the registered default string).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease = "1.16-dev"`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; the example config `resources/qtv.cfg:61-62` carries a hint comment but is NOT ground truth / NOT a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar; `suspect_pool_member = FALSE`).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior source-legible on the QTV side; the one asserted size clause enforce-traces to its read site. The third-party ringbuffer's internal allocation behavior is deliberately NOT asserted (Step 4 confabulation guard).
- **Confidence:** high

## Halt verdict

```
dstream_write_buf_size: synthesized -- cold-synth, no comment; the requested size in bytes of the per-downstream output (write) buffer holding stream data queued for sending to a connected viewer/relay; default 65536 -- origin=synthesized ref=pkg/qtv/downstream.go:69 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> The size, in bytes, of the output buffer QTV allocates for each connected downstream client (a viewer or relay proxy that connects to this QTV to pull the stream). This buffer holds the stream data and replies that QTV has queued to send to that client. A larger value lets QTV queue more outgoing data per client before it must wait for the client to catch up; a smaller value uses less memory per client. This is the per-downstream write buffer; the matching incoming buffer is dstream_read_buf_size, and the upstream (source) connection has its own separate ustream_write_buf_size.
>
> Default: 65536.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`grep -rn "dstream_write_buf_size" . --include="*.go"`) confirms exactly ONE register site and ONE read site; no use-site anywhere else in the tree (no tests, no http, no other file). All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/downstream_storage.go:213` | `qtv.qvs.Regf("dstream_write_buf_size", "%v", 1024*64)` -- registers the name with default `65536` (`1024*64`); flags arg defaults to `0` (no SERVERINFO, no init-only, no read-only -- `Regf` -> `Reg` -> `RegEx(..., 0, nil)`) |
| Read site (buffer allocation) | `pkg/qtv/downstream.go:69` | `wb: ringbuffer.NewExtended(qtv.qvs.Get("dstream_write_buf_size").Int, true, false)` -- the value (as `.Int`) is the requested size of the per-downstream output ringbuffer `wb`, allocated in `newDStream` (one per accepted downstream connection) |
| Consumer of `wb` (writer goroutine) | `pkg/qtv/downstream.go:600` | `ds.wb.WriteToWithContext(ctx, ds.conn)` -- the `ioWriter` goroutine drains `wb` to the downstream TCP connection (`ds.conn`); `wb` is documented "Output buffer to downstream" (`downstream.go:39`) |
| Producer into `wb` (stream/reply send) | `pkg/qtv/downstream.go:310` (and `:274`, `:289`) | `ds.wb.WriteFull(b)` in `send` (stream data) and `WriteFull([]byte(...))` in `sendReplyEx`/`sendReplyWithBuilder` (handshake replies) -- the data queued into `wb` is what gets sent to the downstream client |

## D5 rubric check (Step 3)

Cold-synth: register site `pkg/qtv/downstream_storage.go:213` has no trailing comment, and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. The example-config comment (`resources/qtv.cfg:61` "Downstream write buffer size in bytes") is a HINT only (SR-1), and as a candidate description it FAILS D5 clause 2 (it restates the name and adds only the unit) -> SYNTHESIZE, do not affirm. Rubric on the synthesized text: (1) states the admin-observable WHAT (the per-client output buffer holding data queued to send); (2) not a name restatement (spells out which connection it is -- downstream viewer/relay -- what the buffer holds, and the memory-vs-capacity tradeoff); (3) units spelled (bytes); numeric scalar, so it states the unit + what raising/lowering does; (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Scope: this is the DOWNSTREAM (viewer/relay) connection, distinct from upstream | `pkg/qtv/qtv.go:502` (`dss.serve(downstreamListener)`) + `downstream_storage.go:94-110` (accept loop) + `downstream.go:28,39` | `g.Go(func() error { return qtv.dss.serve(downstreamListener) })`; `conn, err := l.Accept()` then `dss.open(conn)`; struct doc `// Downstream representation object.`, field `wb ... // Output buffer to downstream.` -- the `dstream_*` knobs are read only in `downstream.go`, the upstream half uses `ustream_*` in `upstream.go` (`qtv.go:501` `uss.serve()`) | MATCH |
| Semantic: it sizes the per-downstream OUTPUT (write) buffer holding data QUEUED TO SEND | `pkg/qtv/downstream.go:69` (alloc) feeding `:600` (writer) | `wb: ringbuffer.NewExtended(qtv.qvs.Get("dstream_write_buf_size").Int, true, false)`; `ds.wb.WriteToWithContext(ctx, ds.conn)` (`:600`) drains `wb` to the downstream conn (`wb` doc `:39` "Output buffer to downstream") | MATCH |
| Semantic: the buffer holds stream data AND replies | `pkg/qtv/downstream.go:310` (`send`) + `:274` (`sendReplyEx`) | `ds.wb.WriteFull(b)` in `send`; `ds.wb.WriteFull([]byte(h + s + "\n\n"))` in `sendReplyEx` -- both queue into `wb` | MATCH |
| Semantic: one buffer per connected client (allocated at accept) | `pkg/qtv/downstream.go:56-71` (`newDStream`) called from `downstream_storage.go:129` (`dss.open`) | `ds = &dStream{ ... wb: ringbuffer.NewExtended(qtv.qvs.Get("dstream_write_buf_size").Int, ...) ...}` in `newDStream`; `dss.open` calls `newDStream(...)` once per accepted `conn` | MATCH |
| Units: bytes | `pkg/qtv/downstream_storage.go:213` (raw byte count) + `downstream.go:69` (`.Int` passed straight to ringbuffer size) | `Regf("dstream_write_buf_size", "%v", 1024*64)` (a raw byte count `65536`); `ringbuffer.NewExtended(qtv.qvs.Get(...).Int, ...)` -- the `.Int` is passed directly as the byte size, no scaling | MATCH |
| Effect: larger = more outgoing data queued before waiting; smaller = less memory | `pkg/qtv/downstream.go:69` (the size is the ringbuffer capacity arg) | `ringbuffer.NewExtended(<size>, true, false)` -- the value IS the requested buffer size; a buffer's capacity in bytes is monotonic in this arg (the only source-legible effect) | MATCH |
| Default: 65536 | `pkg/qtv/downstream_storage.go:213` (WI-2: registered default) + `var.go:55` (`.Int` derivation) | `Regf("dstream_write_buf_size", "%v", 1024*64)` -> registered string `"65536"`; `newQVar`/`Reset` (`var.go:51,55`) `Int: int(fv)` where `fv = ParseFloat("65536")` = `65536` | MATCH |
| Set by: server config (flags `0`; no SERVERINFO, no command/vote sets it) | `pkg/qtv/downstream_storage.go:213` + `var.go:207-203,189` (`Regf`->`Reg`->`RegEx(...,0,nil)`) | `Regf(...)` -> `Reg(name, value)` -> `RegEx(name, value, 0, nil)` (third arg `0` = no flags); the only `regCommands` registered (`downstream_storage.go:218-219` `dclose`, `dlist`) do not set this cvar | MATCH |

### Deliberately NOT asserted (Step 4 confabulation guard)

The read site `pkg/qtv/downstream.go:69` carries the adjacent comment `// Underlying buffer is two times more.`, and `ringbuffer.NewExtended`'s first two bool args (`true, false`) select behavior. `NewExtended` lives in the THIRD-PARTY package `github.com/qqshka/ringbuffer` (`go.mod:10`; NOT vendored in this tree -- no `vendor/` dir). Its internal allocation (the "two times more" multiplier, what `true`/`false` mean) is NOT source-legible from this tree. Per the brief's Step 4 guard, the description asserts ONLY the source-legible QTV-side fact -- the requested buffer size in bytes -- and does NOT claim the actual allocated size, any doubling, or the meaning of the bool flags. The adjacent comment is treated as an untraceable hint (a config/declaration comment about untraced code, the flavour-C trap), NOT an enforcing line.

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`ringbuffer.NewExtended`, `wb`, `WriteToWithContext`, `WriteFull`, `newDStream`, `dStreamStorage.serve`, `qvs.Regf`, `.Int`), the `1024*64` arithmetic, the ringbuffer bool-arg / "two times more" detail, and the flags-arg reasoning. The user doc states only the admin-observable WHAT (per-downstream output buffer size in bytes), the downstream-vs-upstream distinction, the capacity-vs-memory tradeoff, Default, and Set-by. No `See also:` line: the cross-reference to `dstream_read_buf_size` and `ustream_write_buf_size` is same-codebase sibling-knob context (action-relevant disambiguation for an admin tuning buffers), stated inline in plain terms rather than as an L3 concept-note slug; there is no cross-engine consequence here.

## Rationale

Cold-synth from a fully QTV-side-legible use-site. `dstream_write_buf_size` is read exactly once, at `pkg/qtv/downstream.go:69`, where its `.Int` value is passed as the requested size of the per-downstream output ringbuffer `wb`. `wb` is allocated once per accepted downstream connection in `newDStream` (`downstream.go:56-71`); the `ioWriter` goroutine (`downstream.go:600`) drains `wb` to that downstream's TCP connection (`ds.conn`), and data is queued INTO `wb` by `send` (stream data, `downstream.go:310`) and the `sendReply*` helpers (handshake replies, `downstream.go:274,289`). The connection is unambiguously the DOWNSTREAM half: `dStreamStorage.serve` is launched on `downstreamListener` (`qtv.go:502`), accepts incoming viewer/relay connections (`downstream_storage.go:94-110`), and the struct is documented "Downstream representation object" with `wb` = "Output buffer to downstream" (`downstream.go:28,39`). The upstream (source) connection is a separate object using the `ustream_*` knobs (`upstream.go:104`, `qtv.go:501`), so the description explicitly distinguishes them.

Registered default (WI-2) is `1024*64` = `65536` bytes, read from the `Regf` literal at `downstream_storage.go:213`, NOT from a shipped cfg. The `.Int` accessor derives `65536` via `ParseFloat` -> `int(fv)` (`var.go:51,55`). Flags arg is `0` (`Regf`->`Reg`->`RegEx(..., 0, nil)`, `var.go:207,202-203,189`) -> no `CVAR_SERVERINFO`, not init-only, not read-only; no command or vote sets it (the only downstream commands are `dclose`/`dlist`, `downstream_storage.go:218-219`), so `Set by: server config`.

Step 4 confabulation guard applied (see the dedicated section above): the "two times more" comment and the ringbuffer bool flags describe third-party-package internals (`github.com/qqshka/ringbuffer`, not in this tree) and are NOT asserted. The description claims only the requested size in bytes.

The example config `resources/qtv.cfg:61-62` ("Downstream write buffer size in bytes" / commented `dstream_write_buf_size 65536`) corroborates BOTH the unit (bytes) and the default (65536) and the downstream scope -- it is an admissible HINT only (SR-1), not ground truth and not a seed; its comment is a name-restatement that does not clear D5, so it is not affirmed. No C2 conflict (source default and config hint agree on 65536). `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30 -- provenance holds retained shipped-doc DATA only).

Self-classification: TRACED-CLEAN -- every asserted clause maps to an enforcing register/read/derive line on the QTV side; no clause rests on the cvar name, an enum/string, the adjacent "two times more" comment, or the config comment. No SR-4/SR-5 breadcrumb fires (this is a local per-client buffer-sizing knob with no master-server, MVD-streaming/parse_delay, or qtv_password auth cross-codebase surface).

## D6Record

```json
{
  "project": "qtv",
  "knob": "dstream_write_buf_size",
  "type": "cvar",
  "description": "The size, in bytes, of the output buffer QTV allocates for each connected downstream client (a viewer or relay proxy that connects to this QTV to pull the stream). This buffer holds the stream data and replies that QTV has queued to send to that client. A larger value lets QTV queue more outgoing data per client before it must wait for the client to catch up; a smaller value uses less memory per client. This is the per-downstream write buffer; the matching incoming buffer is dstream_read_buf_size, and the upstream (source) connection has its own separate ustream_write_buf_size.\n\nDefault: 65536.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/downstream_storage.go:213 (qtv.qvs.Regf(\"dstream_write_buf_size\", \"%v\", 1024*64); registered default 65536), no shipped-doc candidate -> nothing to affirm; QTV-side use-site fully legible so synthesize. Tree-wide grep (grep -rn dstream_write_buf_size . --include=*.go) confirms exactly ONE register site + ONE read site, nowhere else (no tests/http/other). Clauses->cites: DOWNSTREAM scope (distinct from upstream) -> qtv.go:502 dss.serve(downstreamListener) + downstream_storage.go:94-110 accept loop + downstream.go:28,39 struct doc 'Downstream representation object' / wb 'Output buffer to downstream' (dstream_* read only in downstream.go; upstream half uses ustream_* in upstream.go, qtv.go:501 uss.serve()). Sizes per-downstream OUTPUT buffer holding data queued to send -> downstream.go:69 wb: ringbuffer.NewExtended(qtv.qvs.Get(\"dstream_write_buf_size\").Int, true, false) feeding downstream.go:600 ds.wb.WriteToWithContext(ctx, ds.conn) (wb doc :39 'Output buffer to downstream'); holds stream data AND replies -> producers ds.wb.WriteFull(b) in send :310 and sendReplyEx :274; one buffer per connected client -> allocated in newDStream downstream.go:56-71, called once per accepted conn from dss.open downstream_storage.go:129. Units bytes -> raw byte count 1024*64 at :213, .Int passed straight to ringbuffer size arg at :69 (no scaling). Effect larger=more queued / smaller=less memory -> the value IS the requested capacity arg at :69 (only source-legible effect). Default 65536 (WI-2) -> Regf literal :213 (1024*64) + var.go:51,55 .Int=int(ParseFloat(\"65536\")). Set-by server config -> flags arg 0 (Regf->Reg->RegEx(...,0,nil) var.go:207,202-203,189; no CVAR_SERVERINFO/init-only/read-only); only downstream commands dclose/dlist (downstream_storage.go:218-219) do not set it. STEP 4 CONFABULATION GUARD: read site :69 has adjacent comment '// Underlying buffer is two times more.' and ringbuffer.NewExtended bool args (true,false); NewExtended lives in third-party github.com/qqshka/ringbuffer (go.mod:10, NOT vendored, no vendor/ dir) -- its internal allocation/doubling and bool-flag meaning are NOT source-legible from this tree, so the description asserts ONLY the requested size in bytes and does NOT claim actual allocated size, doubling, or flag semantics; the comment is treated as an untraceable hint, not an enforcing line. Example config resources/qtv.cfg:61-62 ('Downstream write buffer size in bytes' / dstream_write_buf_size 65536) corroborates unit+default+downstream scope but is a HINT only (SR-1, not a seed; its name-restatement comment does not clear D5). No C2 conflict (source and config agree on 65536). provenance=null (cold-synth, operator 2026-05-30). No See-also/L3 breadcrumb: local per-client buffer knob, no master/MVD-parse_delay/qtv_password cross-codebase surface. Grading: synthesized, high confidence, every asserted clause TRACED-CLEAN; the only untraced surface (ringbuffer internals) is deliberately excluded, not asserted.",
  "description_proposed": null
}
```
