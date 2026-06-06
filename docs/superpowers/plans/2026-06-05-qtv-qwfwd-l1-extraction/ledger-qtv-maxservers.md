# describe-fill-synthesis ledger -- qtv `maxservers`

- **Project:** qtv
- **Knob:** `maxservers` (cvar)
- **Registered name string:** `maxservers`; registered `pkg/qtv/upstream_storage.go:86` (`qtv.qvs.Reg("maxservers", "100")`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; `resources/qtv.cfg` is a HINT only, not ground truth / not a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qtv:maxservers: synthesized -- cold-synth, no comment; caps the number of simultaneous upstream (source) connections QTV will hold open; a new upstream is refused once the count reaches this limit; effective value bounded 0-1024 -- origin=synthesized ref=pkg/qtv/upstream_storage.go:213 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> The maximum number of upstream connections QTV will keep open at the same time. Each upstream is one game server (or demo) that QTV is pulling a stream from. Once this many are already open, any attempt to open another upstream is refused until one closes. The effective limit is capped at 1024 even if a higher value is set.
>
> Default: 100.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`maxservers`, `maxServers`, `MaxServers`) across `pkg/`. All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/upstream_storage.go:86` | registers name `maxservers` default `"100"`, flags `0` |
| Read + clamp accessor | `pkg/qtv/upstream_storage.go:150-152` | `func (uss *uStreamStorage) maxServers() int { return iBound(0, uss.qtv.qvs.Get("maxservers").Int, 1024) }` -- read as int, clamped 0..1024 |
| Enforcement (capacity gate) | `pkg/qtv/upstream_storage.go:213-214` | `if len(uss.stream) >= uss.maxServers() { return nil, false, errors.New("maxservers reached") }` -- refuse new upstream at the cap |
| Status display | `pkg/qtv/qtv.go:451` | `fmt.Printf(" servers: %4v/%v\n", qtv.uss.count(), qtv.uss.maxServers())` -- shown as current/limit |

## D5 rubric check (Step 3)

Cold-synth: register site has no trailing comment, no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (the cap on simultaneous upstream connections and what happens at the cap); (2) not a name restatement ("servers" is spelled out as upstream/source connections, and the refusal behavior + the 1024 ceiling are stated); (3) numeric scalar, the unit (count of connections) and the 1024 hard cap are spelled; (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: caps the number of simultaneous upstream connections | `pkg/qtv/upstream_storage.go:213-214` | `if len(uss.stream) >= uss.maxServers() { return nil, false, errors.New("maxservers reached") }` (where `uss.stream` is the map of open upstreams) | MATCH |
| Semantic: each upstream is a game server / demo QTV streams from | `pkg/qtv/upstream_storage.go:158-228` (`open`) + `:23-29` (struct doc) | `open(server string, ...)` builds a `*uStream` per source; `stream map[string]*uStream` "Both maps contains exactly the same streams" | MATCH |
| Behavior: opening another is refused once at the limit | `pkg/qtv/upstream_storage.go:213-214` | `return nil, false, errors.New("maxservers reached")` | MATCH |
| Cap: effective limit capped at 1024 | `pkg/qtv/upstream_storage.go:151` | `return iBound(0, uss.qtv.qvs.Get("maxservers").Int, 1024)` (`iBound` clamps to max, `math.go:24-35`) | MATCH |
| Default: 100 | `pkg/qtv/upstream_storage.go:86` (WI-2: registered literal) | `qtv.qvs.Reg("maxservers", "100")` | MATCH |
| Set by: server config (flags `0`, no SERVERINFO/readonly, no command sets it) | `pkg/qtv/upstream_storage.go:86` | `qtv.qvs.Reg("maxservers", "100")` (no flags); no `Set`/command writes this cvar anywhere in `pkg/` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`uStreamStorage`, `maxServers`, `iBound`, `uss.stream`, `open`, `count`), the `len(uss.stream) >= ...` comparison mechanism, the `iBound(0, x, 1024)` clamp identifiers, and the status-print format. The user doc states only the admin-observable WHAT (cap on simultaneous upstream connections, refusal at the cap, the 1024 ceiling), Default, and Set-by.

## Rationale

Cold-synth from fully-legible use-sites. `maxservers` is the ceiling on how many upstream connections (`uStream` objects, one per source game server or demo) QTV holds open concurrently. The cvar is read through the `maxServers()` accessor (`upstream_storage.go:150-152`), which clamps it to 0..1024 via `iBound`. The single enforcement site is the capacity gate in `open()` (`:213-214`): when the count of open upstreams (`len(uss.stream)`) is already at or above `maxServers()`, a new upstream is refused with "maxservers reached". The same accessor is also surfaced in the status line (`qtv.go:451`, `current/limit`), which corroborates the meaning but is not enforcement.

WI-2: registered default is the literal `"100"` at `upstream_storage.go:86`. Flags arg is `0` (no `qVarFlagServerInfo`, no read-only) and no `Set`/command writes this cvar anywhere in `pkg/` -> Set by server config. The `resources/qtv.cfg` seed is an admissible HINT only (SR-1), not ground truth.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing read/compare/clamp line; no clause rests on the cvar name, an enum/string, or a config comment.

No SR-5 breadcrumb: `maxservers` is a connection-count cap, unrelated to the master-server, MVD-streaming/ghosting, or auth-matrix concept-note candidates. No `See also:` (no cross-engine action-changing consequence; the limit is enforced entirely within QTV).

## D6Record

```json
{
  "project": "qtv",
  "knob": "maxservers",
  "type": "cvar",
  "description": "The maximum number of upstream connections QTV will keep open at the same time. Each upstream is one game server (or demo) that QTV is pulling a stream from. Once this many are already open, any attempt to open another upstream is refused until one closes. The effective limit is capped at 1024 even if a higher value is set.\n\nDefault: 100.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/upstream_storage.go:86 (Reg(\"maxservers\", \"100\")), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep: maxservers read only via maxServers() accessor at pkg/qtv/upstream_storage.go:150-152. Clauses->cites: caps simultaneous upstream connections + refusal at cap -> enforcement gate upstream_storage.go:213-214 (if len(uss.stream) >= uss.maxServers() { return ... 'maxservers reached' }); each upstream = one source server/demo -> open() builds a *uStream per source (upstream_storage.go:158-228) + struct doc :23-29 (stream map[string]*uStream); effective limit capped 1024 -> upstream_storage.go:151 (iBound(0, Get(\"maxservers\").Int, 1024); iBound clamps to max, math.go:24-35); Default 100 (WI-2, registered literal) -> upstream_storage.go:86; Set-by server config (flags 0, no SERVERINFO/readonly; no Set/command writes it in pkg/) -> upstream_storage.go:86. Status line qtv.go:451 ('servers: current/limit') corroborates meaning, not enforcement. No clause rests on name/enum/string/comment. resources/qtv.cfg is a HINT only (SR-1). Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). D20: all file:line + identifiers (uStreamStorage, maxServers, iBound, uss.stream, the len()>= comparison, the 0..1024 clamp) kept out of description, in reasoning. No SR-5 breadcrumb (connection-count cap, not master/streaming/auth). No See-also (limit enforced entirely within QTV).",
  "description_proposed": null
}
```
