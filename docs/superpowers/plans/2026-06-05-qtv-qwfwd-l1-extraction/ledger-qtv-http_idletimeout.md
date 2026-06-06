# describe-fill-synthesis ledger -- qtv `http_idletimeout`

- **Project:** qtv
- **Knob:** `http_idletimeout` (cvar)
- **Registered name string:** `http_idletimeout`; registered `pkg/qtv/http.go:54` (`qtv.qvs.RegEx("http_idletimeout", "60", qVarFlagInitOnly, nil)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (NULL description; cold-synth from read use-sites). Seed `resources/qtv.cfg` is a HINT only (SR-1).
- **Suspect-pool member:** FALSE (per brief; entity confirmed live). DB not touched.
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qtv:http_idletimeout: synthesized -- cold-synth; max seconds the built-in HTTP server keeps an idle keep-alive connection open between requests before closing it; value in seconds, clamped 1..60; init-only (config-only); default 60 -- origin=synthesized ref=pkg/qtv/http.go:77-78 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> How long the proxy's built-in web server keeps a reusable (keep-alive) connection open while it is idle, waiting for the client's next request, before closing it. Lower values free up idle connections sooner; higher values let a client reuse the same connection for longer between requests. The value is in seconds and is capped at 60 seconds (values above 60 are treated as 60, values below 1 as 1). Only applies when the web interface is enabled.
>
> Value: time in seconds (1 to 60).
> Default: 60.
> Set by: server config (can only be set before the proxy starts; changing it on a running proxy has no effect).

## Read use-sites (WI-1 wide read)

Tree-wide grep (`http_idletimeout` / `idleTimeOut` / `durationBound` / `IdleTimeout`) over `pkg/`. Verified at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/http.go:54` | registers `http_idletimeout`, default `"60"`, flag `qVarFlagInitOnly` |
| Reader + clamp + unit | `pkg/qtv/http.go:77-78` | `idleTimeOut()` = `durationBound(1, Get("http_idletimeout").Dur, 60) * time.Second` -- clamp [1,60], then * seconds. Adjacent comment `:76` "Limit is up to 60 seconds." |
| `.Dur` derivation | `pkg/qtv/var.go:56` | `Dur: time.Duration(fv)` -- raw numeric value; `* time.Second` at the reader makes it seconds |
| Clamp helper | `pkg/qtv/math.go:66-77` | `durationBound`: val<min->min, val>max->max (cap is real); max here = 60 |
| Applied to http.Server | `pkg/qtv/http.go:558-565` | `s := &http.Server{... IdleTimeout: sv.idleTimeOut() ...}` -- fed into the stdlib HTTP server's keep-alive idle deadline |
| Init-only enforcement | `pkg/qtv/var.go:139-142` (+ notify `:101-107` / `qtv.go:471`) | once initialized, set on init-only var refused with logged error -- flag enforced |

## D5 rubric check (Step 3)

Cold-synth (NULL description). Source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (idle keep-alive hold time between requests); (2) not a name restatement (spells the keep-alive idle meaning, the seconds unit, the 60s cap, raise/lower effect, scope); (3) unit spelled (seconds) + clamp bounds; (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: it is the HTTP server's IDLE (keep-alive) timeout between requests | `pkg/qtv/http.go:558-565` | `s := &http.Server{ ... IdleTimeout: sv.idleTimeOut() ... }` (stdlib `http.Server.IdleTimeout` = max time to wait for the next request when keep-alives are enabled) | MATCH |
| Unit: seconds | `pkg/qtv/http.go:78` + `pkg/qtv/var.go:56` | `durationBound(1, ... .Dur, 60) * time.Second`; `.Dur` raw number; `* time.Second` sets the unit | MATCH |
| Cap: at most 60 s; >60 -> 60, <1 -> 1 | `pkg/qtv/http.go:78` -> `pkg/qtv/math.go:70-75` | `durationBound(1, val, 60)`; clamp branches (min=1, max=60). Adjacent comment http.go:76 "Limit is up to 60 seconds." | MATCH |
| Polarity: lower frees idle conns sooner, higher allows longer reuse | `pkg/qtv/http.go:77-78` + stdlib semantics | value passed straight as `IdleTimeout` deadline -- larger = longer idle hold (no inversion) | MATCH |
| Scope: only when web interface enabled | `pkg/qtv/qtv.go:493-505` | `if qtv.httpSv.isEnabled() { ... }` gating the serve goroutine that builds this `http.Server` | MATCH |
| Default: 60 | `pkg/qtv/http.go:54` | `RegEx("http_idletimeout", "60", qVarFlagInitOnly, nil)` | MATCH |
| Set by: server config, init-only | `pkg/qtv/http.go:54` (flag) + `pkg/qtv/var.go:139-142` (enforce) | flag `qVarFlagInitOnly`; post-init set refused with logged error | MATCH |

## D20 split note

Kept OUT of `description`: file:line cites, `durationBound`, `http.Server.IdleTimeout`, `.Dur`/`* time.Second`, `qVarFlagInitOnly`, the term "keep-alive" is kept because it is the standard user-facing HTTP term for connection reuse (not engine/code jargon) and is glossed inline ("reusable (keep-alive) connection"). The user doc states the observable WHAT (idle hold between requests), the seconds unit, the 60s cap, the raise/lower effect, the enabled-only scope, Default, init-only Set-by.

## Rationale

Cold-synth from legible use-sites. `http_idletimeout` is the built-in web server's idle keep-alive timeout. The reader `idleTimeOut()` (`http.go:77-78`) takes the cvar's `.Dur` (raw number, `var.go:56`), clamps to [1,60] via `durationBound` (`math.go:66-77`), then multiplies by `time.Second` -- SECONDS, capped at 60 (adjacent comment `http.go:76` corroborates). It is assigned to `http.Server{IdleTimeout: ...}` (`http.go:558-565`), the stdlib field bounding how long the server keeps a keep-alive connection open while idle, waiting for the next request. Built inside `serve()`, which runs only when `http_enabled` is on (`qtv.go:493-505`) -- enabled-only scope. Lower = free idle connections sooner; higher = longer reuse between requests (value passes straight through, no inversion).

WI-2: registered default `"60"` (`http.go:54`). Init-only: `qVarFlagInitOnly` (`http.go:54`) enforced at `var.go:139-142` after `QtvWasInitializedNotify()` (`qtv.go:471`) -- config/startup-only.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing line (the clamp with max=60, unit multiply, assignment, enable-gate, register default, flag enforcement). No clause rests on the name. No C2 conflict (no shipped-doc candidate; seed cfg hint-only). `description_provenance` null. No SR-5 breadcrumb.

## D6Record

```json
{
  "project": "qtv",
  "knob": "http_idletimeout",
  "type": "cvar",
  "description": "How long the proxy's built-in web server keeps a reusable (keep-alive) connection open while it is idle, waiting for the client's next request, before closing it. Lower values free up idle connections sooner; higher values let a client reuse the same connection for longer between requests. The value is in seconds and is capped at 60 seconds (values above 60 are treated as 60, values below 1 as 1). Only applies when the web interface is enabled.\n\nValue: time in seconds (1 to 60).\nDefault: 60.\nSet by: server config (can only be set before the proxy starts; changing it on a running proxy has no effect).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (NULL description); use-sites fully source-legible so synthesize. Registered pkg/qtv/http.go:54 RegEx(\"http_idletimeout\", \"60\", qVarFlagInitOnly, nil). Clauses->cites: HTTP server idle keep-alive timeout between requests -> http.Server{IdleTimeout: sv.idleTimeOut()} pkg/qtv/http.go:558-565 (stdlib IdleTimeout = max wait for next request when keep-alives on); unit seconds -> idleTimeOut() pkg/qtv/http.go:77-78 returns durationBound(1, .Dur, 60) * time.Second, .Dur raw number var.go:56, * time.Second sets unit; cap 1..60 clamp -> durationBound math.go:70-75 (min=1 max=60), adjacent comment http.go:76 'Limit is up to 60 seconds.'; polarity lower=free sooner / higher=longer reuse -> value passes straight through as deadline, no inversion (http.go:77-78); scope enabled-only -> http.Server built in serve(), started only when http_enabled on (qtv.go:493-505); Default 60 -> registered literal http.go:54 (WI-2); Set-by config + init-only -> flag qVarFlagInitOnly http.go:54 enforced var.go:139-142 after QtvWasInitializedNotify (qtv.go:471). Term 'keep-alive' retained as standard user-facing HTTP terminology, glossed inline as 'reusable (keep-alive) connection' (not engine/code jargon). Self-class TRACED-CLEAN: every clause maps to clamp(max=60)/unit-multiply/assignment/enable-gate/register-default/flag-enforce; no clause rests on the name. No C2 conflict (no shipped-doc candidate; seed cfg hint-only, SR-1). provenance=null (cold-synth, operator 2026-05-30). No SR-5 breadcrumb.",
  "description_proposed": null
}
```
