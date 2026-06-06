# describe-fill-synthesis ledger -- qtv `log_timeformat`

- **Project:** qtv
- **Knob:** `log_timeformat` (cvar)
- **Registered name string:** `log_timeformat`; registered `pkg/qtv/log.go:16` (`qtv.qvs.RegEx("log_timeformat", "2006-01-02T15:04:05.000", 0, logTimeFormatOnChange)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease = "1.16-dev"`).
- **Mechanical candidate:** none (cold-synth; the register site has no trailing comment. The `qtv.cfg` seed carries a commented hint `// log_timeformat provides time format for logging.` but is NOT ground truth / NOT a seed per SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qtv:log_timeformat: synthesized -- cold-synth, no comment; the timestamp layout stamped on each log line, in Go reference-time format; applied to both JSON and pretty output; default "2006-01-02T15:04:05.000" -- origin=synthesized ref=pkg/qtv/log.go:31 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> Sets the format of the timestamp shown at the start of each log line. The format is written using Go's reference-time layout, where a fixed example moment (Mon Jan 2 15:04:05 2006) is rewritten in the layout you want -- for example, the field positions stand for the year, month, day, hour, minute, second, and fractional second. The same format is used whether the log is in plain JSON or in the readable console output.
>
> Default: 2006-01-02T15:04:05.000 (date and time down to the millisecond, for example 2026-06-06T14:30:05.123).
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`log_timeformat` / `logTimeFormatOnChange` / `TimeFieldFormat`) confirms ALL use-sites live in `pkg/qtv/log.go`. The layout STRING is interpreted by the zerolog dependency (`zerolog.TimeFieldFormat`), which uses Go's standard `time` reference-layout convention. All QTV sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/log.go:16` | registers name `log_timeformat`, default `"2006-01-02T15:04:05.000"`, flags `0`, on-change `logTimeFormatOnChange` |
| On-change apply | `pkg/qtv/log.go:31` | `zerolog.TimeFieldFormat = new.Str` -- the new string becomes the timestamp layout for all subsequent log lines |
| Pretty re-apply gate | `pkg/qtv/log.go:32-35` | if `log_pretty` is on, also re-builds the pretty writer so the new format takes effect there too |
| Pretty writer consumes it | `pkg/qtv/log.go:53` | `TimeFormat: zerolog.TimeFieldFormat` -- the console (pretty) writer renders timestamps using the same layout |

## D5 rubric check (Step 3)

Cold-synth: register site `pkg/qtv/log.go:16` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. Use-sites are fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (the timestamp format on each log line) not WHY; (2) not a name restatement (the name says "time format"; the prose explains it is the Go reference-time layout and that it applies to both output modes); (3) this is a free-form layout string, not an enum -- so there is no value=meaning table; instead the format convention is explained and the default is decoded into what it produces; (4) mechanism only, no recommended format; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

QTV sites in `pkg/qtv/log.go` at anchor `1.16-dev`; the layout convention is the Go standard `time` package reference layout, consumed via zerolog `v1.34.0`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: it sets the timestamp shown at the start of each log line | `pkg/qtv/log.go:31` (apply) | `zerolog.TimeFieldFormat = new.Str` -- zerolog stamps each event's time field using this layout | MATCH |
| Format: the string is Go's reference-time layout (a fixed example moment rewritten in the desired shape) | `pkg/qtv/log.go:16` default + `:31` apply (the value is passed straight to `zerolog.TimeFieldFormat`, which is fed to Go `time.Format`) | default literal `"2006-01-02T15:04:05.000"` -- the canonical Go reference time `01/02 03:04:05PM '06 -0700`; the digits `2006`/`01`/`02`/`15`/`04`/`05` are the reference-layout field tokens | MATCH |
| Scope: the same format applies to both JSON and pretty output | `pkg/qtv/log.go:31` (sets the global field format used by the default JSON writer) + `:32-35`/`:53` (pretty path re-reads the same `TimeFieldFormat`) | `zerolog.TimeFieldFormat = new.Str` (global, used by JSON output); pretty: `if logPretty := qtv.qvs.Find("log_pretty"); logPretty != nil && logPretty.Bool { logSetPrettyOutput() }`, and `logSetPrettyOutput` sets `TimeFormat: zerolog.TimeFieldFormat` (`:53`) | MATCH |
| Default: `2006-01-02T15:04:05.000` (down to the millisecond) | `pkg/qtv/log.go:16` (WI-2 registered default) | `qtv.qvs.RegEx("log_timeformat", "2006-01-02T15:04:05.000", 0, logTimeFormatOnChange)` -- second arg is the registered default; the trailing `.000` is the milliseconds field in Go's layout | MATCH |
| Set by: server config | `pkg/qtv/log.go:16` (flags arg `0`) + dispatch `pkg/qtv/cmd.go:227` -> `var.go:227-241` (`CommandIsVar` -> `Set`) | flags `0` (no read-only / init-only / serverinfo); set via the bare `<name> <value>` command form, fed from the config file (`exec`, `cmd.go:305-331`) and the startup command line (`qtv.go:88-90`); no dedicated `set` command exists (commented out, `var.go:84-86`) | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the dependency name (`zerolog`), the identifiers (`logTimeFormatOnChange`, `zerolog.TimeFieldFormat`, `ConsoleWriter.TimeFormat`, `logSetPrettyOutput`, `qVarStorage.set`, `CommandIsVar`), the Go `time`-package reference-layout token mechanism (`2006`/`01`/`02`/`15`/`04`/`05` as field tokens), and the `log_pretty`-gated re-apply control flow. The user doc states the admin-observable WHAT (the per-line timestamp format), explains the reference-layout convention in plain terms, notes it applies to both output modes, decodes the Default, and gives Set-by.

## Rationale

Cold-synth from fully-legible use-sites. `log_timeformat` is assigned straight to `zerolog.TimeFieldFormat` by the on-change handler `logTimeFormatOnChange` (`pkg/qtv/log.go:30-37`, apply at `:31`), which is the layout zerolog uses to render the time field of every log event. The string is a Go `time`-package reference-time layout: you write the fixed reference instant (`Mon Jan 2 15:04:05 MST 2006`) in the shape you want, and Go substitutes the real time into those field positions. The registered default `"2006-01-02T15:04:05.000"` (`pkg/qtv/log.go:16`) decodes to a year-month-day `T` hour:minute:second with a 3-digit millisecond fraction (e.g. `2026-06-06T14:30:05.123`).

Scope: the assignment at `:31` sets the global `TimeFieldFormat`, which the default (JSON) writer uses; the handler then checks `log_pretty` and, if pretty mode is on, calls `logSetPrettyOutput` (`:32-35`) which builds the console writer with `TimeFormat: zerolog.TimeFieldFormat` (`:53`) -- so the same layout governs both the JSON and the human-readable console output. (This `log_pretty`-gated re-apply is internal control flow; the user-doc states only the observable consequence "same format in both modes".)

WI-2: registered default is the literal at the `RegEx` call (`pkg/qtv/log.go:16`), corroborated (HINT only, not ground truth, SR-1) by the commented `// log_timeformat "2006-01-02T15:04:05.000"` in `resources/qtv.cfg:33`. Set-by: flags arg is `0`; there is no `set` command (commented out at `var.go:84-86`); variables are assigned by the bare `<name> <value>` command form (`CommandIsVar`, `var.go:227-241`, from `execLine` `cmd.go:227`), fed from the auto-exec'd config file (`exec qtv` at startup, `qtv.go:90`; `execCmd` reads `.cfg`, `cmd.go:305-331`) and the startup command line (`qtv.go:88-89`). Admin-facing framing: `Set by: server config`.

No C2 conflict (source default and the qtv.cfg hint agree on `2006-01-02T15:04:05.000`; the hint is commented-out and corroborative only). `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing apply/registration/dispatch line; no clause rests on the cvar name, a string, or a config comment. No L3 breadcrumb (logging knob; not one of the three SR-5 concept-note candidates).

## D6Record

```json
{
  "project": "qtv",
  "knob": "log_timeformat",
  "type": "cvar",
  "description": "Sets the format of the timestamp shown at the start of each log line. The format is written using Go's reference-time layout, where a fixed example moment (Mon Jan 2 15:04:05 2006) is rewritten in the layout you want -- for example, the field positions stand for the year, month, day, hour, minute, second, and fractional second. The same format is used whether the log is in plain JSON or in the readable console output.\n\nDefault: 2006-01-02T15:04:05.000 (date and time down to the millisecond, for example 2026-06-06T14:30:05.123).\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/log.go:16 (RegEx(\"log_timeformat\",\"2006-01-02T15:04:05.000\",0,logTimeFormatOnChange)); no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep confirms all use-sites in pkg/qtv/log.go only. Clauses->cites: per-line timestamp format -> apply pkg/qtv/log.go:31 zerolog.TimeFieldFormat = new.Str (the layout zerolog uses for each event's time field). Go reference-time layout convention -> the value is passed straight to TimeFieldFormat (Go time.Format); default literal '2006-01-02T15:04:05.000' is the canonical Go reference instant with field tokens 2006/01/02/15/04/05 and a .000 ms fraction (pkg/qtv/log.go:16). Applies to BOTH JSON and pretty -> :31 sets the global format used by the JSON writer; :32-35 re-applies for the pretty writer when log_pretty is on, and logSetPrettyOutput sets TimeFormat: zerolog.TimeFieldFormat (:53). Default decoded (down to ms) -> WI-2 registered literal pkg/qtv/log.go:16 (HINT corroboration qtv.cfg:33, commented, SR-1 not a seed). Set-by server config -> flags arg 0; no set command (commented var.go:84-86); set via bare <name> <value> form (CommandIsVar var.go:227-241 from execLine cmd.go:227), fed from auto-exec'd config (exec qtv qtv.go:90; execCmd cmd.go:305-331) and startup cmdline (qtv.go:88-89). No clause rests on name/string/comment; each maps to an enforcing apply/registration/dispatch line. No C2 conflict. provenance=null (cold-synth, operator 2026-05-30). Grading: synthesized, high confidence, every clause TRACED-CLEAN. No L3 breadcrumb (logging knob, not an SR-5 candidate).",
  "description_proposed": null
}
```
