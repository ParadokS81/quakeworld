# describe-fill-synthesis ledger -- qtv `http_writetimeout`

- **Project:** qtv
- **Knob:** `http_writetimeout` (cvar)
- **Registered name string:** `http_writetimeout`; registered `pkg/qtv/http.go:53` (`qtv.qvs.RegEx("http_writetimeout", "600", qVarFlagInitOnly, nil)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (NULL description; cold-synth from read use-sites). Seed `resources/qtv.cfg` is a HINT only (SR-1).
- **Suspect-pool member:** FALSE (per brief; entity confirmed live). DB not touched.
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qtv:http_writetimeout: synthesized -- cold-synth; max seconds the built-in HTTP server is allowed to take writing a whole response (e.g. a demo download) before timing out; value in seconds, clamped 1..900 (15 min); init-only (config-only); default 600 (10 min) -- origin=synthesized ref=pkg/qtv/http.go:72-73 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> How long the proxy's built-in web server is allowed to take sending a complete response to a web client before timing out. This is the overall limit for a whole transfer, so it is set generously to let clients on slow connections finish downloading a demo. Lower values cut off slow downloads sooner; higher values give them more time. The value is in seconds and is capped at 900 seconds, i.e. 15 minutes (values above 900 are treated as 900, values below 1 as 1). Only applies when the web interface is enabled.
>
> Value: time in seconds (1 to 900).
> Default: 600 (10 minutes).
> Set by: server config (can only be set before the proxy starts; changing it on a running proxy has no effect).

## Read use-sites (WI-1 wide read)

Tree-wide grep (`http_writetimeout` / `writeTimeOut` / `durationBound` / `WriteTimeout`) over `pkg/`. Verified at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/http.go:53` | registers `http_writetimeout`, default `"600"`, flag `qVarFlagInitOnly` |
| Reader + clamp + unit | `pkg/qtv/http.go:72-73` | `writeTimeOut()` = `durationBound(1, Get("http_writetimeout").Dur, 60*15) * time.Second` -- clamp [1,900], then * seconds. Adjacent comment `:71` "Limit is up to 15 minutes." |
| `.Dur` derivation | `pkg/qtv/var.go:56` | `Dur: time.Duration(fv)` -- raw numeric value; `* time.Second` at the reader makes it seconds |
| Clamp helper | `pkg/qtv/math.go:66-77` | `durationBound`: val<min->min, val>max->max (cap is real); max here = `60*15` = 900 |
| Applied to http.Server + intent comment | `pkg/qtv/http.go:558-563` | `s := &http.Server{... WriteTimeout: sv.writeTimeOut() ...}`; comment `:561-562` "It is overall timeout for write, should be quite huge so client with slow connection has a chance to download data." |
| Init-only enforcement | `pkg/qtv/var.go:139-142` (+ notify `:101-107` / `qtv.go:471`) | once initialized, set on init-only var refused with logged error -- flag enforced |

## D5 rubric check (Step 3)

Cold-synth (NULL description). Source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (overall response-write time, e.g. demo download); (2) not a name restatement (spells seconds, the 15-minute cap, the slow-download rationale-as-behavior, raise/lower effect, scope); (3) unit spelled (seconds; 900 = 15 min; default 600 = 10 min); (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: HTTP server's response-WRITE timeout (overall transfer) | `pkg/qtv/http.go:558-563` | `s := &http.Server{ ... WriteTimeout: sv.writeTimeOut() ... }` + comment "It is overall timeout for write, should be quite huge so client with slow connection has a chance to download data." | MATCH |
| Why generous / demo-download framing | `pkg/qtv/http.go:561-562` (intent comment) | "...should be quite huge so client with slow connection has a chance to download data." (download path = the demo `/demos/` FileServer http.go:545) | MATCH |
| Unit: seconds | `pkg/qtv/http.go:73` + `pkg/qtv/var.go:56` | `durationBound(1, ... .Dur, 60*15) * time.Second`; `.Dur` raw number; `* time.Second` sets the unit | MATCH |
| Cap: at most 900 s (15 min); >900 -> 900, <1 -> 1 | `pkg/qtv/http.go:73` -> `pkg/qtv/math.go:70-75` | `durationBound(1, val, 60*15)` (max = 60*15 = 900); clamp branches. Adjacent comment http.go:71 "Limit is up to 15 minutes." | MATCH |
| Polarity: lower cuts off sooner, higher gives more time | `pkg/qtv/http.go:72-73` + stdlib semantics | value passed straight as `WriteTimeout` deadline -- larger = longer (no inversion) | MATCH |
| Scope: only when web interface enabled | `pkg/qtv/qtv.go:493-505` | `if qtv.httpSv.isEnabled() { ... }` gating the serve goroutine that builds this `http.Server` | MATCH |
| Default: 600 (10 min) | `pkg/qtv/http.go:53` | `RegEx("http_writetimeout", "600", qVarFlagInitOnly, nil)` (600 s = 10 min) | MATCH |
| Set by: server config, init-only | `pkg/qtv/http.go:53` (flag) + `pkg/qtv/var.go:139-142` (enforce) | flag `qVarFlagInitOnly`; post-init set refused with logged error | MATCH |

## D20 split note

Kept OUT of `description`: file:line cites, `durationBound`, `http.Server.WriteTimeout`, `.Dur`/`* time.Second`, `60*15`, `qVarFlagInitOnly`. The user doc states the observable WHAT (overall response-write limit, demo-download framing), the seconds unit with the 15-minute cap, the raise/lower effect, the enabled-only scope, Default (with the 10-minute gloss), init-only Set-by. The "overall transfer / slow-download" framing is taken from the source intent comment and stated as user-observable behavior (why the limit is large), which is action-relevant (an admin lowering it risks cutting off legitimate slow downloads), so it is inline-justified.

## Rationale

Cold-synth from legible use-sites. `http_writetimeout` is the built-in web server's overall response-write timeout. The reader `writeTimeOut()` (`http.go:72-73`) takes the cvar's `.Dur` (raw number, `var.go:56`), clamps to [1, 60*15=900] via `durationBound` (`math.go:66-77`), then multiplies by `time.Second` -- so SECONDS, capped at 900 = 15 minutes (adjacent comment `http.go:71` corroborates). It is assigned to `http.Server{WriteTimeout: ...}` (`http.go:558-563`); the in-code comment `:561-562` states it is the OVERALL write timeout, deliberately large so slow-connection clients can finish a download (the download path being the `/demos/` file server, `http.go:545`). Built inside `serve()`, which runs only when `http_enabled` is on (`qtv.go:493-505`) -- enabled-only scope. Lower = cut off slow downloads sooner; higher = more time (value passes straight through, no inversion).

WI-2: registered default `"600"` (`http.go:53`) = 600 s = 10 minutes. Init-only: `qVarFlagInitOnly` (`http.go:53`) enforced at `var.go:139-142` after `QtvWasInitializedNotify()` (`qtv.go:471`) -- config/startup-only.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing line (clamp with max=900, unit multiply, assignment, intent comment, enable-gate, register default, flag enforcement). No clause rests on the name. No C2 conflict (no shipped-doc candidate; seed cfg hint-only). `description_provenance` null. No SR-5 breadcrumb.

## D6Record

```json
{
  "project": "qtv",
  "knob": "http_writetimeout",
  "type": "cvar",
  "description": "How long the proxy's built-in web server is allowed to take sending a complete response to a web client before timing out. This is the overall limit for a whole transfer, so it is set generously to let clients on slow connections finish downloading a demo. Lower values cut off slow downloads sooner; higher values give them more time. The value is in seconds and is capped at 900 seconds, i.e. 15 minutes (values above 900 are treated as 900, values below 1 as 1). Only applies when the web interface is enabled.\n\nValue: time in seconds (1 to 900).\nDefault: 600 (10 minutes).\nSet by: server config (can only be set before the proxy starts; changing it on a running proxy has no effect).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (NULL description); use-sites fully source-legible so synthesize. Registered pkg/qtv/http.go:53 RegEx(\"http_writetimeout\", \"600\", qVarFlagInitOnly, nil). Clauses->cites: HTTP server response-write (overall transfer) timeout -> http.Server{WriteTimeout: sv.writeTimeOut()} pkg/qtv/http.go:558-563 with in-code comment :561-562 'It is overall timeout for write, should be quite huge so client with slow connection has a chance to download data.'; demo-download framing -> that comment + the /demos/ FileServer download path http.go:545; unit seconds -> writeTimeOut() pkg/qtv/http.go:72-73 returns durationBound(1, .Dur, 60*15) * time.Second, .Dur raw number var.go:56, * time.Second sets unit; cap 1..900 (15 min) clamp -> durationBound math.go:70-75 with max=60*15=900, adjacent comment http.go:71 'Limit is up to 15 minutes.'; polarity lower=cut off sooner / higher=more time -> value passes straight through as deadline, no inversion (http.go:72-73); scope enabled-only -> http.Server built in serve(), started only when http_enabled on (qtv.go:493-505); Default 600 (=10 min) -> registered literal http.go:53 (WI-2); Set-by config + init-only -> flag qVarFlagInitOnly http.go:53 enforced var.go:139-142 after QtvWasInitializedNotify (qtv.go:471). Self-class TRACED-CLEAN: every clause maps to clamp(max=900)/unit-multiply/assignment/intent-comment/enable-gate/register-default/flag-enforce; no clause rests on the name. No C2 conflict (no shipped-doc candidate; seed cfg hint-only, SR-1). provenance=null (cold-synth, operator 2026-05-30). No SR-5 breadcrumb.",
  "description_proposed": null
}
```
