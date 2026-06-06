# describe-fill-synthesis ledger -- qtv `parse_delay`

- **Project:** qtv
- **Knob:** `parse_delay` (cvar)
- **Registered name string:** `parse_delay`; registered `pkg/qtv/upstream_storage.go:85` (`qtv.qvs.Reg("parse_delay", "7")`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; `resources/qtv.cfg` is a HINT only, not ground truth / not a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qtv:parse_delay: synthesized -- cold-synth, no comment; the delay (in seconds) QTV holds back a live MVD stream before relaying it to viewers, to prevent ghosting; demos are never delayed; per-stream 'delay' option overrides it; effective value bounded 0-15s -- origin=synthesized ref=pkg/qtv/upstream_mvd.go:215 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> How far behind the live game QTV holds the stream before sending it on to connected viewers, in seconds. This deliberate delay keeps QTV slightly behind real time so it always has enough buffered data to play out smoothly, which prevents "ghosting" (players appearing to flicker or jump because the stream ran out of data). Demos played back through QTV are never delayed -- this applies only to live game streams. A larger value adds more delay and a bigger safety margin; a smaller value keeps viewers closer to live. Values above 15 seconds have no extra effect. Opening an upstream with an explicit per-stream delay option overrides this setting for that stream.
>
> Default: 7 (seconds).
> Set by: server config; per-stream override via the upstream open command's `delay <seconds>` option.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`parse_delay`, `parseDelay`, `expectedIngameDelay`, `ingameDelay`, `guessPlaybackSpeed`, `parseTime`) across `pkg/`. All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/upstream_storage.go:85` | registers name `parse_delay` default `"7"`, flags `0` |
| Primary read | `pkg/qtv/upstream_mvd.go:215` | `expectedDelay := us.qtv.qvs.Get("parse_delay").Float` -- read as float seconds inside `expectedIngameDelay()` |
| Demo exemption | `pkg/qtv/upstream_mvd.go:209-213` | `if us.isDemo() { return 0 }` with comment "We delay only live games to prevent ghosting and that is demo, so no delay." |
| Per-stream override | `pkg/qtv/upstream_mvd.go:216-218` | `if us.options.ingameDelay.Present() { expectedDelay = us.options.ingameDelay.OrElse(0) }` -- per-stream `delay` option replaces the cvar value |
| Effective-value clamp | `pkg/qtv/upstream_mvd.go:219` | `return bound(0, expectedDelay, 15)` -- effective delay clamped to 0..15 seconds |
| Delay applied to live stream | `pkg/qtv/upstream.go:257` | `us.parseTime = us.curTime + (uint64)(us.expectedIngameDelay()*1000)` -- sets the parse target time forward by delay (ms), i.e. holds the stream back |
| Playback pacing | `pkg/qtv/upstream_mvd.go:222-261` | `guessPlaybackSpeed` uses `expectedIngameDelay()` to pace playback against buffered data (`demoSpeed = currentDelay / expectedDelay`), and treats delay==0 as low-latency mode |
| Option field decl | `pkg/qtv/upstream.go:149` | `ingameDelay optional.Float64 // Stream may overwrite 'parse_delay' setting.` |
| Option parse + usage text | `pkg/qtv/upstream_storage.go:375-381`, `:403` | `delay` option parsed (`ParseFloat` -> `options.ingameDelay`); usage line `delay <delay>  // in seconds (defaults to 'parse_delay')` |

## D5 rubric check (Step 3)

Cold-synth: register site has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. Use-sites are fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (how far behind live the stream is held, in seconds, and the ghosting it prevents); (2) not a name restatement (the name is `parse_delay`; the prose spells the unit, the demo exemption, the override, the cap, and the observable effect); (3) unit spelled (seconds), the >15s no-op stated, this is a numeric scalar so raising/lowering is described; (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: it is a delay, measured in seconds, read as a float | `pkg/qtv/upstream_mvd.go:215` | `expectedDelay := us.qtv.qvs.Get("parse_delay").Float` | MATCH |
| Semantic: the delay holds the live stream back before it reaches viewers (delays relaying by `delay` ms) | `pkg/qtv/upstream.go:257` | `us.parseTime = us.curTime + (uint64)(us.expectedIngameDelay()*1000)` | MATCH |
| Purpose: prevents ghosting / ensures enough buffered data | `pkg/qtv/upstream_mvd.go:211` (adjacent comment) + `:222-237` (pacing) | `// We delay only live games to prevent ghosting and that is demo, so no delay.`; `guessPlaybackSpeed` uses `expectedDelay` to pace against buffered ms (`currentDelay / expectedDelay`) | MATCH |
| Scope: demos are never delayed (applies only to live games) | `pkg/qtv/upstream_mvd.go:209-213` | `if us.isDemo() { ... return 0 }` | MATCH |
| Polarity: larger value = more delay / bigger margin; smaller = closer to live | `pkg/qtv/upstream.go:257` (linear `+delay*1000`) + `:235-237` (delay==0 => low latency) | `parseTime = curTime + delay*1000`; `if expectedDelay == 0 { return 1, true // Low latency. }` | MATCH |
| Cap: values above 15 seconds have no extra effect | `pkg/qtv/upstream_mvd.go:219` | `return bound(0, expectedDelay, 15)` with `bound` clamping to max (`math.go:10-21`) | MATCH |
| Override: per-stream `delay` option overrides this cvar for that stream | `pkg/qtv/upstream_mvd.go:216-218` + `pkg/qtv/upstream_storage.go:375-381` | `if us.options.ingameDelay.Present() { expectedDelay = us.options.ingameDelay.OrElse(0) }`; option parsed from `delay <delay>` arg | MATCH |
| Default: 7 (seconds) | `pkg/qtv/upstream_storage.go:85` (WI-2: registered literal) | `qtv.qvs.Reg("parse_delay", "7")` | MATCH |
| Set by: server config; per-stream override via upstream open command `delay` option | `pkg/qtv/upstream_storage.go:85` (flags `0`, no SERVERINFO/readonly) + `:375-381`, `:403` | `Reg(...)` (no flags); usage `delay <delay>  // in seconds (defaults to 'parse_delay')` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the C/Go identifiers (`expectedIngameDelay`, `ingameDelay`, `guessPlaybackSpeed`, `parseTime`, `curTime`, `bound`, `isDemo`), the `*1000` ms conversion mechanism, the `demoSpeed = currentDelay/expectedDelay` pacing formula, the `optional.Float64` override plumbing, and the `bound(0, x, 15)` clamp identifiers. The user doc states only the admin-observable WHAT (seconds of delay held behind live, ghosting prevention, demo exemption, raise/lower effect, >15s no-op, per-stream override), Default, and Set-by.

The cross-codebase context (this QTV-side delay sits between the upstream MVD source -- an mvdsv `mvd`/svc stream -- and the downstream ezQuake viewers, so it is the QTV half of the end-to-end MVD streaming/ghosting story) is concept-note domain context and does NOT change how an admin sets `parse_delay` on QTV itself -> routed to the L3 breadcrumb (SR-5), NOT inlined and NOT a `See also:`.

## Rationale

Cold-synth from fully-legible use-sites. `parse_delay` is the number of seconds QTV deliberately stays behind the live game when relaying an upstream MVD stream to downstream viewers. The cvar is read as a float in `expectedIngameDelay()` (`upstream_mvd.go:215`); that function returns 0 for demos (`:209-213`, the adjacent comment states the WHY: "We delay only live games to prevent ghosting") and otherwise returns the cvar value (or a per-stream `delay` option override, `:216-218`) clamped to 0..15 seconds (`:219`). The returned delay is applied at `upstream.go:257` by pushing `parseTime` forward by `delay*1000` ms relative to `curTime`, i.e. QTV will not parse/relay stream data until that much wall-time has elapsed -- the live stream is held back by exactly this delay. `guessPlaybackSpeed` (`:222-261`) then uses the same delay to pace playback so the buffer neither starves (ghosting) nor overflows; a delay of 0 selects an explicit low-latency path (`:235-237`).

WI-2: registered default is the literal `"7"` at `upstream_storage.go:85` -> Default 7 seconds. Flags arg is `0` (no `qVarFlagServerInfo`, no read-only) -> Set by server config; additionally a per-stream `delay <seconds>` option on the upstream open command overrides it for one stream (`:375-381`, usage text `:403`). The `resources/qtv.cfg` seed is an admissible HINT only (SR-1), not ground truth; the source register-site is authoritative.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing read/branch/compare/assignment line (incl. the adjacent ghosting comment for the purpose clause); no clause rests on the cvar name, an enum/string, or a config comment.

**SR-5 breadcrumb decision: PRESENT (strong).** `parse_delay` is exactly the QTV-side knob of concept-note candidate (b) "MVD streaming + parse_delay ghosting." The read-sites show it is the live-stream hold-back delay (`upstream.go:257` pushes the parse position forward by the delay) whose explicit, source-stated purpose is anti-ghosting (`upstream_mvd.go:211` comment) and whose value paces the buffer against starvation (`guessPlaybackSpeed`). This is the QTV half of the end-to-end chain: mvdsv MVD source -> QTV `parse_delay` buffer -> ezQuake viewer. The behavior genuinely matches the streaming-delay/ghosting concept. [L3 breadcrumb: MVD streaming + parse_delay ghosting]

(Note for Phase 4: the brief's SR-5 also pairs `parse_delay` with `tick_time`; `tick_time` is NOT in this worker's 6-knob set, so this ledger speaks only to the `parse_delay` half. The `parse_delay` half of candidate (b) is load-bearing and present.)

## D6Record

```json
{
  "project": "qtv",
  "knob": "parse_delay",
  "type": "cvar",
  "description": "How far behind the live game QTV holds the stream before sending it on to connected viewers, in seconds. This deliberate delay keeps QTV slightly behind real time so it always has enough buffered data to play out smoothly, which prevents \"ghosting\" (players appearing to flicker or jump because the stream ran out of data). Demos played back through QTV are never delayed -- this applies only to live game streams. A larger value adds more delay and a bigger safety margin; a smaller value keeps viewers closer to live. Values above 15 seconds have no extra effect. Opening an upstream with an explicit per-stream delay option overrides this setting for that stream.\n\nDefault: 7 (seconds).\nSet by: server config; per-stream override via the upstream open command's `delay <seconds>` option.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/upstream_storage.go:85 (Reg(\"parse_delay\", \"7\")), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep: parse_delay read only in expectedIngameDelay() at pkg/qtv/upstream_mvd.go:215 (.Float). Clauses->cites: it is a delay in seconds -> upstream_mvd.go:215 (.Float read); the delay holds the live stream back before viewers -> upstream.go:257 (us.parseTime = us.curTime + (uint64)(us.expectedIngameDelay()*1000), pushes parse target forward by delay ms); purpose=prevent ghosting / keep buffer fed -> adjacent comment upstream_mvd.go:211 ('We delay only live games to prevent ghosting...') + guessPlaybackSpeed upstream_mvd.go:222-237 (paces playback via currentDelay/expectedDelay); demos never delayed -> upstream_mvd.go:209-213 (if us.isDemo() return 0); larger=more delay, smaller=closer to live, 0=low-latency -> linear +delay*1000 at upstream.go:257 and upstream_mvd.go:235-237 (expectedDelay==0 -> return 1,true low latency); >15s no extra effect -> upstream_mvd.go:219 bound(0, expectedDelay, 15) (bound clamps to max, math.go:10-21); per-stream delay option overrides -> upstream_mvd.go:216-218 (options.ingameDelay.Present()) + upstream_storage.go:375-381 (parse 'delay <delay>') + usage text :403 ('in seconds (defaults to parse_delay)'); Default 7s (WI-2, registered literal) -> upstream_storage.go:85; Set-by server config (flags 0, no SERVERINFO/readonly) plus per-stream delay option -> upstream_storage.go:85 + :375-381,:403. No clause rests on name/enum/string/comment alone (the ghosting purpose IS backed by the source comment AND the pacing code). resources/qtv.cfg is a HINT only (SR-1), not a seed. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). D20: all file:line + identifiers (expectedIngameDelay, ingameDelay, guessPlaybackSpeed, parseTime, curTime, bound, the *1000 ms conversion, demoSpeed formula) kept out of description, in reasoning. Cross-codebase end-to-end story (mvdsv MVD source -> QTV parse_delay -> ezQuake viewer) is non-action-changing for setting this cvar on QTV -> routed to breadcrumb, not the description, not a See-also (D20). SR-5 breadcrumb decision: PRESENT (strong) -- parse_delay is the QTV-side hold-back delay whose source-stated purpose is anti-ghosting and whose value paces the stream buffer; it genuinely matches candidate (b). Note: tick_time (the other half SR-5 pairs with parse_delay) is outside this worker's 6 knobs; this ledger covers the parse_delay half only. [L3 breadcrumb: MVD streaming + parse_delay ghosting]",
  "description_proposed": null
}
```
