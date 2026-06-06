# describe-fill-synthesis ledger -- qtv `tick_time`

- **Project:** qtv
- **Knob:** `tick_time` (cvar)
- **Registered name string:** `tick_time` -- registered `pkg/qtv/qtv.go:212` (`qtv.qvs.Reg("tick_time", "100")`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (NULL description; no trailing comment at the register site; the seed `qtv.cfg` carries a hint comment but is NOT ground truth / NOT a seed-of-record).
- **Suspect-pool member:** FALSE (frozen snapshot; no C3 runtime-dead pool in this arc).
- **SR-5 breadcrumb:** breadcrumb (b) "MVD streaming + parse_delay ghosting" FIRES -- the centralized tick this knob paces drives BOTH the upstream MVD-source read loop and the downstream viewer write loop (trace below). See `description_reasoning`.
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qtv:tick_time: synthesized -- how often (ms) the proxy's central tick wakes; this tick paces both the upstream MVD read loop and the downstream viewer send loop; value clamped to 100-1000ms; default 100 -- origin=synthesized ref=pkg/qtv/qtv.go:390 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> How often, in milliseconds, the proxy wakes up to do its periodic work, including relaying stream data from game servers to viewers. A larger value makes the proxy wake less often, which lowers its CPU use but makes it relay slightly less smoothly; a smaller value relays more frequently at higher CPU cost. Values are kept within 100 to 1000 milliseconds (anything lower or higher is clamped to that range).
>
> Default: 100 (milliseconds).
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`tick_time` / `tickTime`) confirms the cvar's direct use-sites are in `pkg/qtv/qtv.go`. The centralized tick it drives (`qtv.tick`, a `*sync.Cond`) is awaited in `pkg/qtv/upstream.go` and `pkg/qtv/downstream.go` (the breadcrumb trace). All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/qtv.go:212` | registers name `tick_time`, default `"100"`, no flags |
| Read + clamp + ticker build | `pkg/qtv/qtv.go:384-391` | `getMainTicker()` reads `tick_time`, clamps via `durationBound(100, tickTime.Dur, 1000)`, builds a `time.Ticker` of that many ms |
| Clamp helper | `pkg/qtv/math.go:66-77` | `durationBound(min, val, max)` -> floor 100, ceiling 1000 |
| Value unit conversion | `pkg/qtv/var.go:50-57` | the cvar string is parsed to `Dur = time.Duration(fv)` (a raw number), multiplied by `time.Millisecond` at `qtv.go:390` -> milliseconds |
| Main loop tick | `pkg/qtv/qtv.go:402-408` | on each ticker fire, `qtv.tick.Broadcast()` wakes all tick waiters; re-reads the ticker if `tick_time` changed |
| Tick field | `pkg/qtv/qtv.go:48` | `tick *sync.Cond // Centralized tick.` |
| Breadcrumb: upstream MVD read loop waits on the tick | `pkg/qtv/upstream.go:992-994` + `:1084-1086` | `us.qtv.tick.L.Lock(); us.qtv.tick.Wait(); us.qtv.tick.L.Unlock()` -- the per-upstream stream loop blocks until the next tick |
| Breadcrumb: downstream viewer loop waits on the tick | `pkg/qtv/downstream.go:435-437` | `ds.qtv.tick.L.Lock(); ds.qtv.tick.Wait(); ds.qtv.tick.L.Unlock()` -- the per-downstream send loop blocks until the next tick |

## D5 rubric check (Step 3)

Cold-synth: register site `pkg/qtv/qtv.go:212` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm; D5-amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (how often the proxy wakes to do periodic work incl. relaying streams) -- NOT the WHY ("reduce CPU usage" is the seed's rationale; I state the observable CPU/smoothness tradeoff as the consequence of the wake frequency, not as the motivation); (2) not a name restatement (the name is `tick_time`; the prose spells the ms unit, the relay role, the tradeoff, and the clamp); (3) units spelled (milliseconds) and the scalar direction stated (larger = less often/lower CPU, smaller = more often) plus the 100-1000 clamp; (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Unit: milliseconds | `pkg/qtv/qtv.go:390` + `pkg/qtv/var.go:56` | `tickTimeDuration := time.Millisecond * durationBound(100, tickTime.Dur, 1000)`; `Dur: time.Duration(fv)` (raw number from the parsed string, scaled to ms here) | MATCH |
| Semantic: how often the central tick wakes | `pkg/qtv/qtv.go:390-391` + `:402-405` | `return time.NewTicker(tickTimeDuration)`; main loop `case <-ticker.C: qtv.tick.Broadcast()` | MATCH |
| Scope: the tick paces stream relaying (upstream read + downstream send) | `pkg/qtv/upstream.go:992-994` (+ `:1084-1086`) and `pkg/qtv/downstream.go:435-437`, woken by `pkg/qtv/qtv.go:405` | upstream loop and downstream loop each `qtv.tick.Wait()`; the only periodic `qtv.tick.Broadcast()` is the ticker fire at `qtv.go:405` | MATCH |
| Tradeoff: larger = wakes less often (lower CPU, less smooth); smaller = more often | `pkg/qtv/qtv.go:390-391` | a larger `tickTimeDuration` -> a longer ticker period -> fewer `Broadcast()` wakes per second -> the waiting stream loops run less frequently (direct consequence of the ticker period; the CPU/smoothness direction follows from fewer/more iterations) | MATCH |
| Clamp: kept within 100-1000 ms | `pkg/qtv/qtv.go:390` + `pkg/qtv/math.go:66-77` | `durationBound(100, tickTime.Dur, 1000)`; `durationBound`: `if val < min { return min }; if val > max { return max }` (min 100, max 1000) | MATCH |
| Default: 100 | `pkg/qtv/qtv.go:212` | `qtv.qvs.Reg("tick_time", "100")` (2nd arg `"100"`) | MATCH |
| Set-by: server config | `pkg/qtv/qtv.go:212` | registered with no init-only/read-only flag (it IS re-read live at `qtv.go:406`); no command/vote writes the cvar | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`getMainTicker`, `durationBound`, `time.Ticker`, `time.Millisecond`, `qtv.tick`, `sync.Cond`, `Broadcast`, `Wait`, `tickTime.Dur`), the `sync.Cond` Broadcast/Wait mechanism (stated in plain English as "wakes up to do its periodic work"), and the live-re-read detail. The cross-stack relay-timing consequence (this paces the MVD source read AND the viewer send) IS stated in the description in plain English ("including relaying stream data from game servers to viewers") because it is action-relevant -- an admin tunes `tick_time` precisely to trade relay smoothness against CPU; the deeper cross-codebase ghosting context (interaction with `parse_delay`, the MVDSV MVD source, ezQuake viewer rendering) is routed to the SR-5 breadcrumb, not inlined.

## Rationale

Cold-synth from fully-legible use-sites. `tick_time` sets the period of the proxy's central tick. `getMainTicker()` (`qtv.go:384-391`) reads the cvar, clamps it with `durationBound(100, tickTime.Dur, 1000)` (floor 100, ceiling 1000 -- `math.go:66-77`), and builds a `time.Ticker` of `time.Millisecond * <clamped>` (so the value is in milliseconds; the cvar string is parsed to a raw `time.Duration` number at `var.go:56` and scaled to ms here). On each ticker fire the main loop calls `qtv.tick.Broadcast()` (`qtv.go:402-405`), waking everything blocked on the centralized tick (`qtv.tick`, a `*sync.Cond`, `qtv.go:48`). A changed value is picked up live (`qtv.go:406` re-reads the ticker), so it is config-settable with no init-only flag.

The unit, the clamp, the default, and the wake-frequency semantics are all directly enforce-traced. The CPU/smoothness tradeoff is the observable consequence of the ticker period (a longer period = fewer wakes/sec = the stream loops iterate less often); I state it as a consequence, deliberately NOT as the motivation -- the seed `qtv.cfg:48,51` comment frames it as "controls how frequently QTV wake up in milliseconds, this helps to reduce CPU usage," which is the WHY; per the D5 rubric (clause 1: WHAT not WHY) the description states the observable wake-frequency + its CPU/smoothness effect, not the rationale. The seed is an admissible HINT only (SR-1, not a seed-of-record); it corroborates the ms unit and the wake-frequency semantics. No C2 conflict.

SR-5 breadcrumb decision (REPORTED): breadcrumb (b) "MVD streaming + parse_delay ghosting" FIRES for `tick_time`. The mother ledger flagged it as a candidate IF its read-sites touch the upstream MVD tick/stream loop -- they do, decisively. The tick this knob paces is awaited by the per-upstream MVD-source read loop (`upstream.go:992-994` and `:1084-1086`) AND the per-downstream viewer send loop (`downstream.go:435-437`); the ONLY periodic broadcaster of that tick is the `tick_time`-driven ticker (`qtv.go:405`). So `tick_time` is the wall-clock pacing of the whole MVD relay pipeline (source read cadence -> viewer send cadence), which is exactly the timing axis of the parse_delay/ghosting concept-note candidate. This is NOT a generic internal scheduler tick unrelated to MVD -- it is THE MVD relay tick. [L3 breadcrumb: MVD streaming + parse_delay ghosting]

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing read/clamp/ticker/broadcast/wait line; no clause rests on the cvar name alone, and the WHY ("reduce CPU usage") was deliberately demoted to a stated-consequence per the D5 WHAT-not-WHY rule.

## D6Record

```json
{
  "project": "qtv",
  "knob": "tick_time",
  "type": "cvar",
  "description": "How often, in milliseconds, the proxy wakes up to do its periodic work, including relaying stream data from game servers to viewers. A larger value makes the proxy wake less often, which lowers its CPU use but makes it relay slightly less smoothly; a smaller value relays more frequently at higher CPU cost. Values are kept within 100 to 1000 milliseconds (anything lower or higher is clamped to that range).\n\nDefault: 100 (milliseconds).\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/qtv.go:212 (qtv.qvs.Reg(\"tick_time\", \"100\")), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Direct use-sites in qtv.go; the central tick it drives is awaited in upstream.go + downstream.go. Clauses->cites: unit milliseconds -> qtv.go:390 (time.Millisecond * durationBound(100, tickTime.Dur, 1000)) + var.go:56 (Dur: time.Duration(fv) raw number scaled to ms here); how often the central tick wakes -> qtv.go:390-391 (time.NewTicker(tickTimeDuration)) + :402-405 (case <-ticker.C: qtv.tick.Broadcast()); paces stream relaying (upstream read + downstream send) -> upstream.go:992-994 (+ :1084-1086) and downstream.go:435-437 each qtv.tick.Wait(), woken by the only periodic Broadcast at qtv.go:405; tradeoff larger=less often(lower CPU, less smooth)/smaller=more often -> direct consequence of the ticker period at qtv.go:390-391 (longer period = fewer Broadcast wakes/sec = stream loops iterate less often); clamp 100-1000ms -> qtv.go:390 durationBound + math.go:66-77 (if val<min return min; if val>max return max; min 100 max 1000); Default 100 -> qtv.go:212 (2nd arg); Set-by server config -> no init-only/read-only flag (re-read live at qtv.go:406), no command/vote writes it. The CPU/smoothness effect is stated as a CONSEQUENCE, not the motivation: seed qtv.cfg:48,51 frames it as 'helps to reduce CPU usage' (the WHY); per D5 rubric clause 1 (WHAT not WHY) the description states the observable wake-frequency + effect, not the rationale. Seed is a HINT only (SR-1, not a seed-of-record); corroborates the ms unit + wake-frequency semantics; no C2 conflict. SR-5 breadcrumb (b) 'MVD streaming + parse_delay ghosting' FIRES: the tick this knob paces is awaited by the per-upstream MVD-source read loop (upstream.go:992-994, :1084-1086) AND the per-downstream viewer send loop (downstream.go:435-437), and the only periodic broadcaster is the tick_time-driven ticker (qtv.go:405) -- so tick_time is the wall-clock pacing of the whole MVD relay pipeline, exactly the timing axis of the parse_delay/ghosting candidate. NOT a generic scheduler tick. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). [L3 breadcrumb: MVD streaming + parse_delay ghosting]",
  "description_proposed": null
}
```
