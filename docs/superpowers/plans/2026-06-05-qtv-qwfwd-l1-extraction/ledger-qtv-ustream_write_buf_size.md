# describe-fill-synthesis ledger -- qtv `ustream_write_buf_size`

- **Project:** qtv
- **Knob:** `ustream_write_buf_size` (cvar)
- **Registered name string:** `ustream_write_buf_size`; registered `pkg/qtv/upstream_storage.go:89` (`qtv.qvs.Regf("ustream_write_buf_size", "%v", 1024*32)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; `resources/qtv.cfg` is a HINT only, not ground truth / not a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- the QTV-side behavior is source-legible; every asserted clause enforce-traced to its enforcing line. (The ring-buffer library's internal over-allocation is a third-party detail, deliberately NOT asserted -- see Rationale.)
- **Confidence:** high

## Halt verdict

```
qtv:ustream_write_buf_size: synthesized -- cold-synth, no comment; the size in bytes of each upstream's output (write) buffer, where data QTV sends back to the source server is held before transmission; set per upstream at connect time -- origin=synthesized ref=pkg/qtv/upstream.go:104 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> The size, in bytes, of the output buffer used for each upstream connection. This is where data QTV sends back to the source game server (such as the initial handshake and keep-alive traffic) is held before it is transmitted. A larger buffer can queue more outgoing data; a smaller one uses less memory per upstream. The buffer is created when an upstream connection is opened, so changing this affects upstreams opened afterward.
>
> Default: 32768 (bytes, i.e. 32 KB).
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`ustream_write_buf_size`, `WriteBufSize`, `writeBufSize`, the `wb` field, `ringbuffer.NewExtended`) across `pkg/`. All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/upstream_storage.go:89` | `qtv.qvs.Regf("ustream_write_buf_size", "%v", 1024*32)` -- registers default `1024*32` = 32768 |
| Read at buffer construction | `pkg/qtv/upstream.go:104` | `wb: ringbuffer.NewExtended(qtv.qvs.Get("ustream_write_buf_size").Int, false, false), // Underlying buffer is two times more.` -- read as int, used as the ring-buffer size for `wb` |
| Field role (struct doc) | `pkg/qtv/upstream.go:64` | `wb *ringbuffer.RingBuffer // Output buffer to upstream.` |

## D5 rubric check (Step 3)

Cold-synth: register site has no trailing comment, no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. The QTV-side use is source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (the byte size of the per-upstream output buffer and what is held there); (2) not a name restatement ("write buf size" is spelled as the output buffer holding data QTV sends to the source server, with the per-upstream + open-time scope); (3) unit spelled (bytes, with the KB equivalent), numeric scalar raise/lower described; (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: it sizes the per-upstream OUTPUT (write) buffer | `pkg/qtv/upstream.go:104` + `:64` | `wb: ringbuffer.NewExtended(qtv.qvs.Get("ustream_write_buf_size").Int, ...)`; field doc `wb ... // Output buffer to upstream.` | MATCH |
| Semantic: the value is read as an integer byte count | `pkg/qtv/upstream.go:104` | `qtv.qvs.Get("ustream_write_buf_size").Int` (first arg to `NewExtended` is the buffer size) | MATCH |
| Semantic: holds data QTV sends back toward the source server | `pkg/qtv/upstream.go:64` (direction) + `upstream_io_tcp.go:74-77` (`Write` drains toward the conn) | `wb ... // Output buffer to upstream.`; `uStreamTCP.Write` writes bytes to the upstream connection | MATCH |
| Scope: created when the upstream is opened (per-upstream) | `pkg/qtv/upstream.go:88-106` (`newUStream`) | the `wb:` field is initialized in the `uStream` struct literal built by `newUStream`, called from `uStreamStorage.open` (`upstream_storage.go:218`) | MATCH |
| Polarity: larger queues more outgoing data; smaller uses less memory | `pkg/qtv/upstream.go:104` | the int value is the ring-buffer capacity argument; a larger capacity is a larger allocation (size arg) | MATCH |
| Default: 32768 bytes (32 KB) | `pkg/qtv/upstream_storage.go:89` (WI-2: registered literal) | `Regf("ustream_write_buf_size", "%v", 1024*32)` -> `1024*32 = 32768` | MATCH |
| Set by: server config (flags `0`, no SERVERINFO/readonly, no command sets it) | `pkg/qtv/upstream_storage.go:89` | `Regf(...)` resolves to `Reg`/`RegEx(name, value, 0, nil)` (no flags); no `Set`/command writes this cvar in `pkg/` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`ringbuffer.NewExtended`, `wb`, `RingBuffer`, `newUStream`, `Write`, `Regf`), the `1024*32` arithmetic form, the boolean constructor args, and the third-party "Underlying buffer is two times more" allocation detail. The user doc states only the admin-observable WHAT (byte size of the per-upstream output buffer, what it holds, open-time scope, raise/lower effect), Default (with the KB equivalent), and Set-by.

## Rationale

Cold-synth from the legible QTV-side use. `ustream_write_buf_size` is the byte capacity of the output ring buffer (`wb`) created for each upstream connection. It is read at `upstream.go:104` as the size argument to `ringbuffer.NewExtended(...)` when `newUStream` builds the per-stream object; the struct field doc (`:64`) names `wb` "Output buffer to upstream," and the TCP `Write` path drains bytes toward the upstream connection (`upstream_io_tcp.go:74-77`). So the cvar sizes the buffer that holds data QTV sends back to the source game server (the handshake and keep-alive traffic an upstream client sends) before transmission. Because the buffer is constructed at open time, the value takes effect for upstreams opened after it is changed (an admin-observable scope, traced to the construction site).

WI-2: registered default is `Regf("ustream_write_buf_size", "%v", 1024*32)` -> `32768` bytes (32 KB). Flags arg is `0` (`Regf` -> `Reg` -> `RegEx(name, value, 0, nil)`); no `Set`/command writes this cvar anywhere in `pkg/` -> Set by server config. The `resources/qtv.cfg` seed is an admissible HINT only (SR-1), not ground truth.

Confabulation-guard note (deliberate non-assertion): the constructor `ringbuffer.NewExtended` lives in the third-party package `github.com/qqshka/ringbuffer` (go.mod:10), which is NOT present in this source tree or any local module cache. The inline comment at `upstream.go:104` says "Underlying buffer is two times more," implying the library internally allocates roughly double the requested size. I do NOT assert that doubling as cvar behavior in the description: it is a library implementation detail I cannot enforce-trace against package source, and per the Step 4 guard I state only the QTV-side fact that is legible (the value is the requested output-buffer size in bytes). The first `NewExtended` argument being the buffer size is confirmed by symmetry with `ustream_read_buf_size` (same call shape, `rb`, "Input buffer from upstream") and by the value being read straight from the size cvar.

Self-classification: TRACED-CLEAN -- every asserted clause maps to an enforcing QTV-side read/construction/direction line; no clause rests on the cvar name, an enum/string, a config comment, or the un-traceable third-party doubling.

No SR-5 breadcrumb: a per-upstream buffer-size knob, not the master-server, MVD-streaming/ghosting, or auth-matrix candidates. (Buffer SIZE is distinct from `parse_delay`'s streaming-delay/ghosting concept -- it bounds memory, not the live-stream hold-back.) No `See also:` (sizing is entirely within QTV).

## D6Record

```json
{
  "project": "qtv",
  "knob": "ustream_write_buf_size",
  "type": "cvar",
  "description": "The size, in bytes, of the output buffer used for each upstream connection. This is where data QTV sends back to the source game server (such as the initial handshake and keep-alive traffic) is held before it is transmitted. A larger buffer can queue more outgoing data; a smaller one uses less memory per upstream. The buffer is created when an upstream connection is opened, so changing this affects upstreams opened afterward.\n\nDefault: 32768 (bytes, i.e. 32 KB).\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/upstream_storage.go:89 (Regf(\"ustream_write_buf_size\", \"%v\", 1024*32)), no shipped-doc candidate -> nothing to affirm; QTV-side use legible so synthesize. Tree-wide grep: read only at pkg/qtv/upstream.go:104. Clauses->cites: sizes per-upstream OUTPUT (write) buffer -> upstream.go:104 (wb: ringbuffer.NewExtended(Get(\"ustream_write_buf_size\").Int, ...)) + field doc upstream.go:64 (wb // Output buffer to upstream); value is an int byte count -> upstream.go:104 (.Int as first/size arg to NewExtended); holds data QTV sends back to source -> field direction upstream.go:64 + uStreamTCP.Write upstream_io_tcp.go:74-77 (drains bytes to the upstream conn); created at open time per-upstream -> newUStream upstream.go:88-106 struct literal, called from open() upstream_storage.go:218; larger=more outgoing queued / smaller=less memory -> the int is the ring-buffer capacity arg; Default 32768 bytes=32KB (WI-2, registered literal) -> upstream_storage.go:89 (1024*32); Set-by server config (flags 0 via Regf->Reg->RegEx(...,0,nil); no Set/command writes it in pkg/) -> upstream_storage.go:89. CONFABULATION GUARD (deliberate non-assertion): ringbuffer.NewExtended is in third-party github.com/qqshka/ringbuffer (go.mod:10), NOT in this tree or any local module cache; inline comment 'Underlying buffer is two times more' implies internal ~2x over-allocation, which I do NOT assert as cvar behavior in the description (not enforce-traceable against package source, Step 4 guard) -- I state only the legible QTV-side fact (the value is the requested output-buffer byte size). First NewExtended arg = size confirmed by symmetry with ustream_read_buf_size (same call shape, rb 'Input buffer from upstream') and the value coming straight from the size cvar. No clause rests on name/enum/string/comment or the un-traceable doubling. resources/qtv.cfg is a HINT only (SR-1). Grading: synthesized, high confidence, every asserted clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). D20: all file:line + identifiers (ringbuffer.NewExtended, wb, RingBuffer, newUStream, Write, Regf, the 1024*32 form, the bool ctor args, the 2x doubling detail) kept out of description, in reasoning. No SR-5 breadcrumb (buffer-size knob, distinct from parse_delay's streaming-delay/ghosting -- bounds memory not hold-back). No See-also (sizing entirely within QTV).",
  "description_proposed": null
}
```
