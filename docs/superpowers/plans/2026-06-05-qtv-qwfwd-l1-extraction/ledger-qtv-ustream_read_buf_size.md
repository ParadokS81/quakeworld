# describe-fill-synthesis ledger -- qtv `ustream_read_buf_size`

- **Project:** qtv
- **Knob:** `ustream_read_buf_size` (cvar)
- **Registered name string:** `ustream_read_buf_size`; registered `pkg/qtv/upstream_storage.go:88` (`qtv.qvs.Regf("ustream_read_buf_size", "%v", 1024*320)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; `resources/qtv.cfg` is a HINT only, not ground truth / not a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- the QTV-side behavior is source-legible; every asserted clause enforce-traced to its enforcing line. (The ring-buffer library's internal over-allocation is a third-party detail, deliberately NOT asserted -- see Rationale.)
- **Confidence:** high

## Halt verdict

```
qtv:ustream_read_buf_size: synthesized -- cold-synth, no comment; the size in bytes of each upstream's input (read) buffer, where data arriving from the source server is held before parsing; set per upstream at connect time -- origin=synthesized ref=pkg/qtv/upstream.go:103 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> The size, in bytes, of the input buffer used for each upstream connection. This is where data arriving from the source game server is held before QTV parses and relays it. A larger buffer can hold more incoming data before it must be processed; a smaller one uses less memory per upstream. The buffer is created when an upstream connection is opened, so changing this affects upstreams opened afterward.
>
> Default: 327680 (bytes, i.e. 320 KB).
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`ustream_read_buf_size`, `ReadBufSize`, `readBufSize`, the `rb` field, `ringbuffer.NewExtended`) across `pkg/`. All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/upstream_storage.go:88` | `qtv.qvs.Regf("ustream_read_buf_size", "%v", 1024*320)` -- registers default `1024*320` = 327680 |
| Read at buffer construction | `pkg/qtv/upstream.go:103` | `rb: ringbuffer.NewExtended(qtv.qvs.Get("ustream_read_buf_size").Int, false, true), // Underlying buffer is two times more.` -- read as int, used as the ring-buffer size for `rb` |
| Field role (struct doc) | `pkg/qtv/upstream.go:63` | `rb *ringbuffer.RingBuffer // Input buffer from upstream.` |
| Consumer of `rb` | `pkg/qtv/upstream.go:267` (`parseMVD`), `upstream_io_tcp.go:66-72` (`Read` writes into the stream feeding `rb`) | `b := us.rb.BytesOneReader()` -- the parser reads incoming MVD bytes out of `rb` |

## D5 rubric check (Step 3)

Cold-synth: register site has no trailing comment, no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. The QTV-side use is source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (the byte size of the per-upstream input buffer and what is held there); (2) not a name restatement ("read buf size" is spelled as the input buffer holding data from the source server, with the per-upstream + open-time scope); (3) unit spelled (bytes, with the KB equivalent), numeric scalar raise/lower described; (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: it sizes the per-upstream INPUT (read) buffer | `pkg/qtv/upstream.go:103` + `:63` | `rb: ringbuffer.NewExtended(qtv.qvs.Get("ustream_read_buf_size").Int, ...)`; field doc `rb ... // Input buffer from upstream.` | MATCH |
| Semantic: the value is read as an integer byte count | `pkg/qtv/upstream.go:103` | `qtv.qvs.Get("ustream_read_buf_size").Int` (first arg to `NewExtended` is the buffer size) | MATCH |
| Semantic: holds data arriving from the source before parsing | `pkg/qtv/upstream.go:267` (`parseMVD`) | `b := us.rb.BytesOneReader()` -- the MVD parser consumes bytes from `rb` | MATCH |
| Scope: created when the upstream is opened (per-upstream) | `pkg/qtv/upstream.go:88-106` (`newUStream`) | the `rb:` field is initialized in the `uStream` struct literal built by `newUStream`, called from `uStreamStorage.open` (`upstream_storage.go:218`) | MATCH |
| Polarity: larger holds more incoming data; smaller uses less memory | `pkg/qtv/upstream.go:103` | the int value is the ring-buffer capacity argument; a larger capacity is a larger allocation (size arg) | MATCH |
| Default: 327680 bytes (320 KB) | `pkg/qtv/upstream_storage.go:88` (WI-2: registered literal) | `Regf("ustream_read_buf_size", "%v", 1024*320)` -> `1024*320 = 327680` | MATCH |
| Set by: server config (flags `0`, no SERVERINFO/readonly, no command sets it) | `pkg/qtv/upstream_storage.go:88` | `Regf(...)` resolves to `Reg`/`RegEx(name, value, 0, nil)` (no flags); no `Set`/command writes this cvar in `pkg/` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`ringbuffer.NewExtended`, `rb`, `RingBuffer`, `newUStream`, `BytesOneReader`, `parseMVD`, `Regf`), the `1024*320` arithmetic form, the boolean constructor args, and the third-party "Underlying buffer is two times more" allocation detail. The user doc states only the admin-observable WHAT (byte size of the per-upstream input buffer, what it holds, open-time scope, raise/lower effect), Default (with the KB equivalent), and Set-by.

## Rationale

Cold-synth from the legible QTV-side use. `ustream_read_buf_size` is the byte capacity of the input ring buffer (`rb`) created for each upstream connection. It is read at `upstream.go:103` as the size argument to `ringbuffer.NewExtended(...)` when `newUStream` builds the per-stream object; the struct field doc (`:63`) names `rb` "Input buffer from upstream," and the MVD parser consumes incoming bytes from `rb` (`parseMVD`, `:267`). So the cvar sizes the buffer that holds data arriving from the source game server before QTV parses and relays it. Because the buffer is constructed at open time, the value takes effect for upstreams opened after it is changed (an admin-observable scope, traced to the construction site).

WI-2: registered default is `Regf("ustream_read_buf_size", "%v", 1024*320)` -> `327680` bytes (320 KB). Flags arg is `0` (`Regf` -> `Reg` -> `RegEx(name, value, 0, nil)`); no `Set`/command writes this cvar anywhere in `pkg/` -> Set by server config. The `resources/qtv.cfg` seed is an admissible HINT only (SR-1), not ground truth.

Confabulation-guard note (deliberate non-assertion): the constructor `ringbuffer.NewExtended` lives in the third-party package `github.com/qqshka/ringbuffer` (go.mod:10), which is NOT present in this source tree or any local module cache. The inline comment at `upstream.go:103` says "Underlying buffer is two times more," implying the library internally allocates roughly double the requested size. I do NOT assert that doubling as cvar behavior in the description: it is a library implementation detail I cannot enforce-trace against package source, and per the Step 4 guard I state only the QTV-side fact that is legible (the value is the requested input-buffer size in bytes). The first `NewExtended` argument being the buffer size is confirmed by symmetry with `ustream_write_buf_size` (same call shape, `wb`, "Output buffer to upstream") and by the value being read straight from the size cvar.

Self-classification: TRACED-CLEAN -- every asserted clause maps to an enforcing QTV-side read/construction/consumer line; no clause rests on the cvar name, an enum/string, a config comment, or the un-traceable third-party doubling.

No SR-5 breadcrumb: a per-upstream buffer-size knob, not the master-server, MVD-streaming/ghosting, or auth-matrix candidates. (Buffer SIZE is distinct from `parse_delay`'s streaming-delay/ghosting concept -- it bounds memory, not the live-stream hold-back.) No `See also:` (sizing is entirely within QTV).

## D6Record

```json
{
  "project": "qtv",
  "knob": "ustream_read_buf_size",
  "type": "cvar",
  "description": "The size, in bytes, of the input buffer used for each upstream connection. This is where data arriving from the source game server is held before QTV parses and relays it. A larger buffer can hold more incoming data before it must be processed; a smaller one uses less memory per upstream. The buffer is created when an upstream connection is opened, so changing this affects upstreams opened afterward.\n\nDefault: 327680 (bytes, i.e. 320 KB).\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/upstream_storage.go:88 (Regf(\"ustream_read_buf_size\", \"%v\", 1024*320)), no shipped-doc candidate -> nothing to affirm; QTV-side use legible so synthesize. Tree-wide grep: read only at pkg/qtv/upstream.go:103. Clauses->cites: sizes per-upstream INPUT (read) buffer -> upstream.go:103 (rb: ringbuffer.NewExtended(Get(\"ustream_read_buf_size\").Int, ...)) + field doc upstream.go:63 (rb // Input buffer from upstream); value is an int byte count -> upstream.go:103 (.Int as first/size arg to NewExtended); holds data from source before parsing -> parseMVD upstream.go:267 (b := us.rb.BytesOneReader()); created at open time per-upstream -> newUStream upstream.go:88-106 struct literal, called from open() upstream_storage.go:218; larger=more incoming data held / smaller=less memory -> the int is the ring-buffer capacity arg; Default 327680 bytes=320KB (WI-2, registered literal) -> upstream_storage.go:88 (1024*320); Set-by server config (flags 0 via Regf->Reg->RegEx(...,0,nil); no Set/command writes it in pkg/) -> upstream_storage.go:88. CONFABULATION GUARD (deliberate non-assertion): ringbuffer.NewExtended is in third-party github.com/qqshka/ringbuffer (go.mod:10), NOT in this tree or any local module cache; inline comment 'Underlying buffer is two times more' implies internal ~2x over-allocation, which I do NOT assert as cvar behavior in the description (not enforce-traceable against package source, Step 4 guard) -- I state only the legible QTV-side fact (the value is the requested input-buffer byte size). First NewExtended arg = size confirmed by symmetry with ustream_write_buf_size (same call shape, wb 'Output buffer to upstream') and the value coming straight from the size cvar. No clause rests on name/enum/string/comment or the un-traceable doubling. resources/qtv.cfg is a HINT only (SR-1). Grading: synthesized, high confidence, every asserted clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). D20: all file:line + identifiers (ringbuffer.NewExtended, rb, RingBuffer, newUStream, BytesOneReader, parseMVD, Regf, the 1024*320 form, the bool ctor args, the 2x doubling detail) kept out of description, in reasoning. No SR-5 breadcrumb (buffer-size knob, distinct from parse_delay's streaming-delay/ghosting -- bounds memory not hold-back). No See-also (sizing entirely within QTV).",
  "description_proposed": null
}
```
