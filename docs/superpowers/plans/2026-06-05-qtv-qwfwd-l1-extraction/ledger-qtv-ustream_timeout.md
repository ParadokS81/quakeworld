# describe-fill-synthesis ledger -- qtv `ustream_timeout`

- **Project:** qtv
- **Knob:** `ustream_timeout` (cvar)
- **Registered name string:** `ustream_timeout`; registered `pkg/qtv/upstream_storage.go:90` (`qtv.qvs.Reg("ustream_timeout", "60")`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; `resources/qtv.cfg` is a HINT only, not ground truth / not a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qtv:ustream_timeout: synthesized -- cold-synth, no comment; the read-timeout in seconds for an upstream connection -- if no data arrives from the source within this window the read fails and the upstream is dropped; effective value bounded 1-999999s -- origin=synthesized ref=pkg/qtv/upstream_io_tcp.go:67 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> How long, in seconds, QTV waits for data from an upstream connection before giving up on that read. Each time QTV reads from a source game server it sets this as a deadline; if no data arrives within the window, the read fails and QTV treats the upstream as dropped (it will then reconnect or close). A larger value tolerates longer silences from the source; a smaller value detects a stalled or dead upstream sooner. The effective value is at least 1 second and at most 999999 seconds.
>
> Default: 60 (seconds).
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`ustream_timeout`, then a broader `timeout`/`Timeout`/`deadLine`/`SetDeadline` sweep across `pkg/`). All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/upstream_storage.go:90` | registers name `ustream_timeout` default `"60"`, flags `0` |
| Read + clamp + unit | `pkg/qtv/upstream_io_tcp.go:67` | `deadLine := durationBound(1, ust.qtv.qvs.Get("ustream_timeout").Dur, 999999) * time.Second` -- read as `.Dur` (raw integer), clamped 1..999999, then multiplied by `time.Second` -> the value is a count of seconds |
| Enforcement (read deadline) | `pkg/qtv/upstream_io_tcp.go:68-71` | `ust.conn.SetDeadline(time.Now().Add(deadLine))` then `n, err = ust.conn.Read(b)` -- the read fails with a timeout error if no data arrives within `deadLine` |

Note: the `doneTimeout` / `3 * time.Second` references in `upstream_storage.go:101-119` are the storage's graceful-shutdown timer and are UNRELATED to this cvar (an earlier narrow grep surfaced them; the wide grep confirms `ustream_timeout` is read only at `upstream_io_tcp.go:67`).

## D5 rubric check (Step 3)

Cold-synth: register site has no trailing comment, no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (the per-read timeout and the drop-on-silence behavior); (2) not a name restatement ("timeout" is spelled as the read deadline and what happens when it expires); (3) unit spelled (seconds), the 1..999999 bound stated, numeric scalar raise/lower described; (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: it is a read timeout for the upstream connection | `pkg/qtv/upstream_io_tcp.go:66-71` (inside `uStreamTCP.Read`) | `func (ust *uStreamTCP) Read(b []byte) ... { deadLine := ...; ust.conn.SetDeadline(time.Now().Add(deadLine)); n, err = ust.conn.Read(b) }` | MATCH |
| Unit: the value is a count of seconds | `pkg/qtv/upstream_io_tcp.go:67` + `var.go:56` | `durationBound(1, ...Dur, 999999) * time.Second`; `.Dur` is `time.Duration(fv)` (raw int of the parsed value), so `60` -> `60 * time.Second` = 60s | MATCH |
| Behavior: if no data arrives within the window the read fails / upstream dropped | `pkg/qtv/upstream_io_tcp.go:68-71` | `ust.conn.SetDeadline(time.Now().Add(deadLine))` -> a subsequent `conn.Read` returns a timeout error when the deadline passes (Go net.Conn deadline semantics) | MATCH |
| Polarity: larger tolerates longer silence; smaller detects a dead upstream sooner | `pkg/qtv/upstream_io_tcp.go:67-68` | the deadline is `now + deadLine`; a larger `deadLine` is a later deadline (more silence tolerated) | MATCH |
| Bound: effective value at least 1, at most 999999 seconds | `pkg/qtv/upstream_io_tcp.go:67` | `durationBound(1, ..., 999999)` (`durationBound` clamps to [min,max], `math.go:66-77`) | MATCH |
| Default: 60 (seconds) | `pkg/qtv/upstream_storage.go:90` (WI-2: registered literal) | `qtv.qvs.Reg("ustream_timeout", "60")` | MATCH |
| Set by: server config (flags `0`, no SERVERINFO/readonly, no command sets it) | `pkg/qtv/upstream_storage.go:90` | `qtv.qvs.Reg("ustream_timeout", "60")` (no flags); no `Set`/command writes this cvar in `pkg/` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`uStreamTCP.Read`, `durationBound`, `SetDeadline`, `conn.Read`, `.Dur`, `time.Second`), the `.Dur = time.Duration(fv)` raw-integer mechanism, the `* time.Second` multiply, and the `durationBound(1, x, 999999)` clamp identifiers. The user doc states only the admin-observable WHAT (seconds to wait for upstream data, drop-on-silence, raise/lower effect, the 1..999999 bound), Default, and Set-by.

## Rationale

Cold-synth from fully-legible use-sites. `ustream_timeout` is the read timeout, in seconds, applied to an upstream TCP connection. It is read at `upstream_io_tcp.go:67` inside `uStreamTCP.Read`: the cvar's `.Dur` value is clamped to 1..999999 via `durationBound` and then multiplied by `time.Second`, so the configured number is interpreted as seconds. (The `.Dur` accessor is `time.Duration(fv)` from `var.go:56`, i.e. the raw parsed integer with no time unit of its own; the `* time.Second` at the read-site is what gives the value its seconds unit -- this is the load-bearing detail for the unit clause.) The resulting `deadLine` is set as the connection deadline (`SetDeadline(time.Now().Add(deadLine))`, `:68`) immediately before each `conn.Read` (`:70`); if no data arrives before the deadline, the read returns a timeout error and the upstream is treated as failed (it then reconnects or closes via the surrounding stream machinery). A larger value tolerates longer source silences; a smaller value surfaces a stalled/dead upstream faster.

WI-2: registered default is the literal `"60"` at `upstream_storage.go:90` -> Default 60 seconds. Flags arg is `0` (no `qVarFlagServerInfo`, no read-only) and no `Set`/command writes this cvar anywhere in `pkg/` -> Set by server config. The `resources/qtv.cfg` seed is an admissible HINT only (SR-1), not ground truth.

WI-1 disambiguation: an earlier narrow grep surfaced `doneTimeout` and `3 * time.Second` in `upstream_storage.go` (`:101-119`); those are the storage subsystem's graceful-shutdown timer and have nothing to do with this cvar. The wide grep confirms `ustream_timeout` is read at exactly one site (`upstream_io_tcp.go:67`).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing read/clamp/deadline line, including the unit clause which is traced through `.Dur` (`var.go:56`) and the `* time.Second` multiply; no clause rests on the cvar name, an enum/string, or a config comment.

No SR-5 breadcrumb: a per-connection read-timeout knob, not the master-server, MVD-streaming/ghosting, or auth-matrix candidates. No `See also:` (the timeout is enforced entirely within QTV's upstream I/O).

## D6Record

```json
{
  "project": "qtv",
  "knob": "ustream_timeout",
  "type": "cvar",
  "description": "How long, in seconds, QTV waits for data from an upstream connection before giving up on that read. Each time QTV reads from a source game server it sets this as a deadline; if no data arrives within the window, the read fails and QTV treats the upstream as dropped (it will then reconnect or close). A larger value tolerates longer silences from the source; a smaller value detects a stalled or dead upstream sooner. The effective value is at least 1 second and at most 999999 seconds.\n\nDefault: 60 (seconds).\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/upstream_storage.go:90 (Reg(\"ustream_timeout\", \"60\")), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. WIDE grep: ustream_timeout read at exactly one site, pkg/qtv/upstream_io_tcp.go:67 (an earlier narrow grep surfaced doneTimeout / 3*time.Second in upstream_storage.go:101-119, but those are the storage graceful-shutdown timer, UNRELATED to this cvar). Clauses->cites: it is a read timeout for the upstream conn -> uStreamTCP.Read upstream_io_tcp.go:66-71; UNIT = seconds -> upstream_io_tcp.go:67 (durationBound(1, ...Dur, 999999) * time.Second) where .Dur = time.Duration(fv) raw int (var.go:56), so '60' -> 60*time.Second = 60s (the *time.Second multiply is what supplies the seconds unit -- load-bearing); no data in window -> read fails / upstream dropped -> SetDeadline(time.Now().Add(deadLine)) upstream_io_tcp.go:68 then conn.Read :70 (Go net.Conn deadline => timeout error); larger=tolerate longer silence, smaller=detect dead sooner -> deadline = now+deadLine, larger deadLine = later deadline; bound 1..999999s -> durationBound(1, ..., 999999) (clamps to [min,max], math.go:66-77); Default 60s (WI-2, registered literal) -> upstream_storage.go:90; Set-by server config (flags 0, no SERVERINFO/readonly; no Set/command writes it in pkg/) -> upstream_storage.go:90. No clause rests on name/enum/string/comment. resources/qtv.cfg is a HINT only (SR-1). Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). D20: all file:line + identifiers (uStreamTCP.Read, durationBound, SetDeadline, conn.Read, .Dur, time.Second, the time.Duration(fv) mechanism, the *time.Second multiply, the 1..999999 clamp) kept out of description, in reasoning. No SR-5 breadcrumb (per-connection read-timeout, not master/streaming/auth). No See-also (enforced entirely within QTV upstream I/O).",
  "description_proposed": null
}
```
