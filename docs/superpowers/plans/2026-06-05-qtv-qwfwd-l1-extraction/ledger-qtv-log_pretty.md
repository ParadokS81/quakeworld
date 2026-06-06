# describe-fill-synthesis ledger -- qtv `log_pretty`

- **Project:** qtv
- **Knob:** `log_pretty` (cvar)
- **Registered name string:** `log_pretty`; registered `pkg/qtv/log.go:17` (`qtv.qvs.RegEx("log_pretty", "1", 0, logPrettyOnChange)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease = "1.16-dev"`).
- **Mechanical candidate:** none (cold-synth; the register site has no trailing comment. The `qtv.cfg` seed carries a commented hint `// log_pretty toggles between json and pretty log format. 0 - json, 1 - pretty (default).` but is NOT ground truth / NOT a seed per SR-1; it does corroborate the traced polarity).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause (including the on/off polarity) enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qtv:log_pretty: synthesized -- cold-synth, no comment; toggles log output between human-readable console (1, default) and machine-readable JSON (0); polarity traced to logPrettyOnChange Bool branch; default "1" -- origin=synthesized ref=pkg/qtv/log.go:39 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> Chooses how log output is formatted.
>
> 1 = human-readable console output, with the fields laid out for reading directly in a terminal.
> 0 = compact machine-readable JSON, one object per line, suited to log files and log-processing tools.
>
> Any non-zero value is treated as 1.
>
> Default: 1.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`log_pretty` / `logPrettyOnChange` / `logSetPrettyOutput` / `ConsoleWriter`) confirms ALL use-sites live in `pkg/qtv/log.go`. The numeric->boolean coercion is enforced in `pkg/qtv/var.go` (`qVar.Bool`). All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/log.go:17` | registers name `log_pretty`, default `"1"`, flags `0`, on-change `logPrettyOnChange` |
| On-change branch | `pkg/qtv/log.go:41-45` | `if new.Bool { logSetPrettyOutput() } else { log.Logger = log.Output(os.Stderr) }` -- on (true) -> pretty; off (false) -> raw JSON to stderr |
| Pretty writer | `pkg/qtv/log.go:49-57` | `logSetPrettyOutput` builds a `zerolog.ConsoleWriter` (the human-readable formatter) and installs it as the logger output |
| Boolean coercion | `pkg/qtv/var.go:57` | `Bool: fv != 0` where `fv` is the value parsed as a float -- so `"0"` (and any value that parses to 0) is false, any non-zero number is true |
| Cross-read by timeformat | `pkg/qtv/log.go:33` | `log_timeformat`'s on-change reads `log_pretty`'s `.Bool` to decide whether to re-apply the pretty writer (consumer, not a setter) |

## D5 rubric check (Step 3)

Cold-synth: register site `pkg/qtv/log.go:17` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. Use-sites are fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (the output FORMAT, console vs JSON) not WHY; (2) not a name restatement (the name says "pretty"; the prose spells what each value produces); (3) this is a two-value toggle -> both values are spelled with their meaning, and the "any non-zero = 1" coercion is stated; (4) mechanism only, no recommendation; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/log.go` + `pkg/qtv/var.go` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: it chooses the log output FORMAT (it switches the logger's output writer) | `pkg/qtv/log.go:41-45` | `if new.Bool { logSetPrettyOutput() } else { log.Logger = log.Output(os.Stderr) }` -- the on-change replaces the logger output | MATCH |
| Polarity: `1` (true) = human-readable console output | `pkg/qtv/log.go:41-42` -> `:49-57` | `if new.Bool { logSetPrettyOutput() }`; `logSetPrettyOutput` builds `zerolog.ConsoleWriter{ Out: os.Stderr, TimeFormat: ... }` and `log.Logger = log.Output(prettyOutPut)` (ConsoleWriter is zerolog's human-readable formatter) | MATCH |
| Polarity: `0` (false) = machine-readable JSON, one object per line | `pkg/qtv/log.go:43-44` | `} else { log.Logger = log.Output(os.Stderr) }` -- plain `os.Stderr` output = zerolog's default newline-delimited JSON (no ConsoleWriter) | MATCH |
| Coercion: any non-zero value is treated as 1 (and `0` as off) | `pkg/qtv/var.go:57` (`Bool` derivation) | `Bool: fv != 0` where `fv, _ := strconv.ParseFloat(value, 64)` (`var.go:51`) -- the `.Bool` the branch tests is true for any non-zero numeric value, false for `"0"` | MATCH |
| Default: `1` | `pkg/qtv/log.go:17` (WI-2 registered default) | `qtv.qvs.RegEx("log_pretty", "1", 0, logPrettyOnChange)` -- second arg `"1"` is the registered default | MATCH |
| Set by: server config | `pkg/qtv/log.go:17` (flags arg `0`) + dispatch `pkg/qtv/cmd.go:227` -> `var.go:227-241` (`CommandIsVar` -> `Set`) | flags `0` (no read-only / init-only / serverinfo); set via the bare `<name> <value>` command form, fed from the config file (`exec`, `cmd.go:305-331`) and the startup command line (`qtv.go:88-90`); no dedicated `set` command exists (commented out, `var.go:84-86`) | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the dependency name (`zerolog`), the identifiers (`logPrettyOnChange`, `logSetPrettyOutput`, `zerolog.ConsoleWriter`, `log.Output`, `os.Stderr`, `qVar.Bool`, `strconv.ParseFloat`, `CommandIsVar`), the `Bool: fv != 0` coercion mechanism, and the fact that `log_timeformat` reads this cvar. The user doc states the admin-observable WHAT (console vs JSON output), the value=meaning lines, the non-zero coercion, Default, and Set-by.

## Rationale

Cold-synth from fully-legible use-sites. `log_pretty` switches the logger's output writer between two formats. The on-change handler `logPrettyOnChange` (`pkg/qtv/log.go:39-47`) branches on `new.Bool`: when true it calls `logSetPrettyOutput` (`:42`), which installs a `zerolog.ConsoleWriter` (`:49-57`) -- zerolog's human-readable, field-laid-out console formatter; when false it sets `log.Logger = log.Output(os.Stderr)` (`:44`), which is zerolog's default newline-delimited JSON. So `1` = pretty/console, `0` = JSON.

The polarity rests on `qVar.Bool`, derived in `var.go:50-62`: `fv, _ := strconv.ParseFloat(value, 64)` then `Bool: fv != 0` (`:57`). So `"0"` is false (JSON) and any non-zero number is true (pretty) -- this is what makes "any non-zero value is treated as 1" a traced fact rather than an inference.

WI-2: registered default is the literal `"1"` at the `RegEx` call (`pkg/qtv/log.go:17`), corroborated (HINT only, not ground truth, SR-1) by the commented `// log_pretty toggles between json and pretty log format. 0 - json, 1 - pretty (default).` and `// log_pretty 1` in `resources/qtv.cfg:26,29`. That comment independently states the same polarity I traced from `logPrettyOnChange` -- a corroboration, not the source of the claim. Set-by: flags arg is `0`; there is no `set` command (commented out at `var.go:84-86`); variables are assigned by the bare `<name> <value>` command form (`CommandIsVar`, `var.go:227-241`, from `execLine` `cmd.go:227`), fed from the auto-exec'd config file (`exec qtv` at startup, `qtv.go:90`; `execCmd` reads `.cfg`, `cmd.go:305-331`) and the startup command line (`qtv.go:88-89`). Admin-facing framing: `Set by: server config`.

No C2 conflict (source polarity/default and the qtv.cfg hint agree: 0=json, 1=pretty, default 1). `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30).

Self-classification: TRACED-CLEAN -- every clause (including both polarity directions and the non-zero coercion) maps to an enforcing branch/derivation line; no clause rests on the cvar name or solely on the config comment. No L3 breadcrumb (logging knob; not one of the three SR-5 concept-note candidates).

## D6Record

```json
{
  "project": "qtv",
  "knob": "log_pretty",
  "type": "cvar",
  "description": "Chooses how log output is formatted.\n\n1 = human-readable console output, with the fields laid out for reading directly in a terminal.\n0 = compact machine-readable JSON, one object per line, suited to log files and log-processing tools.\n\nAny non-zero value is treated as 1.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/log.go:17 (RegEx(\"log_pretty\",\"1\",0,logPrettyOnChange)); no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep confirms all use-sites in pkg/qtv/log.go; the numeric->bool coercion is in pkg/qtv/var.go. Clauses->cites: chooses output format (switches the logger writer) -> on-change branch pkg/qtv/log.go:41-45. Polarity 1=human console -> :41-42 if new.Bool -> logSetPrettyOutput :49-57 builds zerolog.ConsoleWriter and log.Output(prettyOutPut) (ConsoleWriter is zerolog's readable formatter). Polarity 0=JSON -> :43-44 else log.Logger = log.Output(os.Stderr) (plain stderr = zerolog default newline-delimited JSON). Non-zero coercion -> var.go:57 Bool: fv != 0 with fv from strconv.ParseFloat (var.go:51) so '0' false, any non-zero number true. Default 1 -> WI-2 registered literal pkg/qtv/log.go:17 (HINT corroboration qtv.cfg:26,29 which independently states 0-json/1-pretty default 1, SR-1 not a seed -- corroboration not the source). Set-by server config -> flags arg 0; no set command (commented var.go:84-86); set via bare <name> <value> form (CommandIsVar var.go:227-241 from execLine cmd.go:227), fed from auto-exec'd config (exec qtv qtv.go:90; execCmd cmd.go:305-331) and startup cmdline (qtv.go:88-89). No clause rests on name/comment alone; each maps to an enforcing branch/derivation line. No C2 conflict (source and hint agree on polarity+default). provenance=null (cold-synth, operator 2026-05-30). Grading: synthesized, high confidence, every clause TRACED-CLEAN. No L3 breadcrumb (logging knob, not an SR-5 candidate).",
  "description_proposed": null
}
```
