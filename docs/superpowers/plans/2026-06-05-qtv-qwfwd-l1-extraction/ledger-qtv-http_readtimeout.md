# describe-fill-synthesis ledger -- qtv `http_readtimeout`

- **Project:** qtv
- **Knob:** `http_readtimeout` (cvar)
- **Registered name string:** `http_readtimeout`; registered `pkg/qtv/http.go:52` (`qtv.qvs.RegEx("http_readtimeout", "45", qVarFlagInitOnly, nil)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (NULL description; cold-synth from read use-sites). Seed `resources/qtv.cfg` is a HINT only (SR-1).
- **Suspect-pool member:** FALSE (per brief; entity confirmed live). DB not touched.
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qtv:http_readtimeout: synthesized -- cold-synth; max seconds the built-in HTTP server waits to read a request from a client before timing out; value in seconds, clamped 1..60; init-only (config-only); default 45 -- origin=synthesized ref=pkg/qtv/http.go:67-68 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> How long the proxy's built-in web server will wait to read an incoming request from a web client before giving up on it. Lower values drop slow or stalled clients sooner; higher values give clients on slow connections more time to send their request. The value is in seconds and is capped at 60 seconds (values above 60 are treated as 60, values below 1 as 1). Only applies when the web interface is enabled.
>
> Value: time in seconds (1 to 60).
> Default: 45.
> Set by: server config (can only be set before the proxy starts; changing it on a running proxy has no effect).

## Read use-sites (WI-1 wide read)

Tree-wide grep (`http_readtimeout` / `readTimeOut` / `durationBound` / `ReadTimeout`) over `pkg/`. Verified at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/http.go:52` | registers `http_readtimeout`, default `"45"`, flag `qVarFlagInitOnly` |
| Reader + clamp + unit | `pkg/qtv/http.go:67-68` | `readTimeOut()` = `durationBound(1, Get("http_readtimeout").Dur, 60) * time.Second` -- clamp [1,60], then * seconds. Adjacent comment `:66` "Limit is up to 60 seconds." |
| `.Dur` derivation | `pkg/qtv/var.go:56` | `Dur: time.Duration(fv)` -- the raw numeric value (NOT yet a unit); the `* time.Second` at the reader makes it seconds |
| Clamp helper | `pkg/qtv/math.go:66-77` | `durationBound(min,val,max)`: val<min->min, val>max->max, else val (the cap is real) |
| Applied to http.Server | `pkg/qtv/http.go:558-564` | `s := &http.Server{... ReadTimeout: sv.readTimeOut() ...}` -- fed into the stdlib HTTP server's request-read deadline |
| Init-only enforcement | `pkg/qtv/var.go:139-142` (+ notify `:101-107` / `qtv.go:471`) | once initialized, set on init-only var refused with logged error -- flag enforced |

## D5 rubric check (Step 3)

Cold-synth (NULL description). Source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (request-read wait time); (2) not a name restatement (spells the seconds unit, the 60s cap, what raising/lowering does, the enabled-only scope); (3) unit spelled (seconds) + the clamp bounds; (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: it is the HTTP server's request-READ timeout | `pkg/qtv/http.go:558-564` | `s := &http.Server{ ... ReadTimeout: sv.readTimeOut() ... }` (stdlib `http.Server.ReadTimeout` = max duration to read the entire request) | MATCH |
| Unit: seconds | `pkg/qtv/http.go:68` + `pkg/qtv/var.go:56` | `durationBound(1, ... .Dur, 60) * time.Second`; `.Dur` is `time.Duration(fv)` (raw number), the `* time.Second` sets the unit | MATCH |
| Cap: at most 60 s; >60 -> 60, <1 -> 1 | `pkg/qtv/http.go:68` -> `pkg/qtv/math.go:70-75` | `durationBound(1, val, 60)`; `if val < min { return min }; if val > max { return max }` (min=1, max=60). Adjacent comment http.go:66 "Limit is up to 60 seconds." | MATCH |
| Polarity: lower drops slow clients sooner, higher allows more time | `pkg/qtv/http.go:67-68` + stdlib semantics | timeout value passed directly as `ReadTimeout` -- a larger deadline = longer wait before drop (no inversion in the path) | MATCH |
| Scope: only when web interface enabled | `pkg/qtv/qtv.go:493-505` (http server only started if `http_enabled`) | `if qtv.httpSv.isEnabled() { ... }` gating the serve goroutine that builds this `http.Server` | MATCH |
| Default: 45 | `pkg/qtv/http.go:52` | `RegEx("http_readtimeout", "45", qVarFlagInitOnly, nil)` | MATCH |
| Set by: server config, init-only | `pkg/qtv/http.go:52` (flag) + `pkg/qtv/var.go:139-142` (enforce) | flag `qVarFlagInitOnly`; post-init set refused with logged error | MATCH |

## D20 split note

Kept OUT of `description`: file:line cites, `durationBound`, `http.Server.ReadTimeout`, `.Dur = time.Duration(fv)`, `* time.Second`, `qVarFlagInitOnly`. The user doc states only the observable WHAT (read-request wait), the seconds unit, the 60s cap with clamp behavior, the enabled-only scope, Default, init-only Set-by. The cap is stated in plain terms ("capped at 60 seconds; values above 60 are treated as 60") rather than naming the clamp helper.

## Rationale

Cold-synth from legible use-sites. `http_readtimeout` is the built-in web server's request-read timeout. The reader `readTimeOut()` (`http.go:67-68`) takes the cvar's `.Dur` (raw number, `var.go:56`), clamps it to [1,60] via `durationBound` (`math.go:66-77`), then multiplies by `time.Second` -- so the value is in SECONDS and capped at 60 (adjacent comment `http.go:66` "Limit is up to 60 seconds" corroborates). The result is assigned to `http.Server{ReadTimeout: ...}` (`http.go:558-564`), the stdlib field bounding how long the server waits to read a client's request. The whole `http.Server` is built inside `serve()`, which only runs when `http_enabled` is on (`qtv.go:493-505`) -- hence the enabled-only scope. Lower = drop slow/stalled clients sooner; higher = more grace for slow connections (the value flows straight through as the deadline, no polarity inversion).

WI-2: registered default `"45"` at the register site (`http.go:52`). Init-only: `qVarFlagInitOnly` (`http.go:52`) enforced at `var.go:139-142` after `QtvWasInitializedNotify()` (`qtv.go:471`) -- config/startup-only, not changeable on a running proxy.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing line (the clamp, the unit multiply, the assignment, the enable-gate, the register default, the flag enforcement). No clause rests on the name. No C2 conflict (no shipped-doc candidate; seed cfg is a hint only). `description_provenance` null (cold-synth). No SR-5 breadcrumb.

## D6Record

```json
{
  "project": "qtv",
  "knob": "http_readtimeout",
  "type": "cvar",
  "description": "How long the proxy's built-in web server will wait to read an incoming request from a web client before giving up on it. Lower values drop slow or stalled clients sooner; higher values give clients on slow connections more time to send their request. The value is in seconds and is capped at 60 seconds (values above 60 are treated as 60, values below 1 as 1). Only applies when the web interface is enabled.\n\nValue: time in seconds (1 to 60).\nDefault: 45.\nSet by: server config (can only be set before the proxy starts; changing it on a running proxy has no effect).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (NULL description); use-sites fully source-legible so synthesize. Registered pkg/qtv/http.go:52 RegEx(\"http_readtimeout\", \"45\", qVarFlagInitOnly, nil). Clauses->cites: it is the HTTP server's request-read timeout -> applied as http.Server{ReadTimeout: sv.readTimeOut()} pkg/qtv/http.go:558-564 (stdlib ReadTimeout = max time to read the whole request); unit seconds -> readTimeOut() pkg/qtv/http.go:67-68 returns durationBound(1, .Dur, 60) * time.Second, where .Dur is time.Duration(fv) raw number (var.go:56) and the * time.Second sets the unit; cap 1..60 with clamp (>60->60, <1->1) -> durationBound pkg/qtv/math.go:70-75 (if val<min return min; if val>max return max) with min=1 max=60, adjacent comment http.go:66 'Limit is up to 60 seconds.'; polarity lower=drop sooner / higher=more grace -> value flows straight through as the deadline, no inversion (http.go:67-68); scope enabled-only -> the http.Server is built in serve(), started only when http_enabled on (qtv.go:493-505); Default 45 -> registered literal http.go:52 (WI-2); Set-by config + init-only -> flag qVarFlagInitOnly http.go:52 enforced var.go:139-142 after QtvWasInitializedNotify (qtv.go:471). Self-class TRACED-CLEAN: every clause maps to clamp/unit-multiply/assignment/enable-gate/register-default/flag-enforce; no clause rests on the name. No C2 conflict (no shipped-doc candidate; seed cfg hint-only, SR-1). provenance=null (cold-synth, operator 2026-05-30). No SR-5 breadcrumb.",
  "description_proposed": null
}
```
