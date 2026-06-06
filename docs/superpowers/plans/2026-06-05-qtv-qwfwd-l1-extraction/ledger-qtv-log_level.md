# describe-fill-synthesis ledger -- qtv `log_level`

- **Project:** qtv
- **Knob:** `log_level` (cvar)
- **Registered name string:** `log_level`; registered `pkg/qtv/log.go:15` (`qtv.qvs.RegEx("log_level", "info", 0, logLevelOnChange)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease = "1.16-dev"`).
- **Mechanical candidate:** none (cold-synth; the register site has no trailing comment. The `qtv.cfg` seed carries a commented hint `// log_level provides verbosity logging level.` but is NOT ground truth / NOT a seed per SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; the accepted level strings are traced to the zerolog v1.34.0 `ParseLevel` source (the enum is NOT inferred from the name).
- **Confidence:** high

## Halt verdict

```
qtv:log_level: synthesized -- cold-synth, no comment; sets the minimum log severity that is written (verbosity threshold); accepted level names traced to zerolog v1.34.0 ParseLevel = trace/debug/info/warn/error/fatal/panic/disabled (case-insensitive); invalid string rejected; default "info" -- origin=synthesized ref=pkg/qtv/log.go:21 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> Sets how much detail the server writes to its log. Each message has a severity, and only messages at or above the chosen level are written; everything below it is suppressed. The lowest level logs the most, the highest level logs the least.
>
> trace = log everything, including the most fine-grained tracing.
> debug = log debugging detail and above.
> info = log normal operational messages and above.
> warn = log warnings and above only.
> error = log errors and above only.
> fatal = log only fatal errors.
> panic = log only panics.
> disabled = turn logging off entirely.
>
> The level name is not case-sensitive. An unrecognized value is rejected and the current level is kept.
>
> Default: info.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`log_level` / `logLevelOnChange` / `ParseLevel` / `SetGlobalLevel`) confirms ALL QTV use-sites live in `pkg/qtv/log.go`. The accepted level set is enforced inside the zerolog dependency (`github.com/rs/zerolog v1.34.0`, pinned in `go.sum`), reached via `zerolog.ParseLevel`. All QTV sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/log.go:15` | registers name `log_level`, default `"info"`, flags `0`, on-change `logLevelOnChange` |
| On-change parse | `pkg/qtv/log.go:21` | `zerolog.ParseLevel(new.Str)` -- the new value is parsed as a level name; parse failure -> change refused |
| On-change reject | `pkg/qtv/log.go:22-23` | on parse error, logs the error and `return false` (the on-change vetoes the set; old value kept) |
| On-change apply | `pkg/qtv/log.go:25` | `zerolog.SetGlobalLevel(level)` -- sets the process-wide minimum level; messages below it are dropped |
| Enum source (dep) | zerolog `log.go:178-207` (`ParseLevel`) + `log.go:152-174` (`Level.String`) + `globals.go:36-54` (`LevelXxxValue` + default `LevelFieldMarshalFunc`) | the accepted names and their meanings (see enforce-trace below) |

## D5 rubric check (Step 3)

Cold-synth: register site `pkg/qtv/log.go:15` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. Use-sites are fully source-legible (including the dependency enum) -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (how much the server logs; a severity threshold) not WHY; (2) not a name restatement (the name says "log level"; the prose spells the threshold semantics and every accepted value); (3) this is an enum -> every accepted value is spelled with its meaning, and the case-insensitivity + reject-on-invalid behavior is stated; (4) mechanism only, no recommended level; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

QTV sites in `pkg/qtv/log.go` at anchor `1.16-dev`; enum sites in zerolog `v1.34.0` (the pinned dependency that `ParseLevel` resolves to).

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: it sets a minimum severity; only messages at or above it are written, lower ones suppressed | `pkg/qtv/log.go:25` (apply) -> zerolog `SetGlobalLevel` | `zerolog.SetGlobalLevel(level)` -- zerolog drops events whose level is below the global level (the global-level gate is the library's documented filter semantics; `SetGlobalLevel` stores into `gLevel`) | MATCH |
| Polarity: lowest level logs the most, highest the least | zerolog `log.go:129-148` (Level iota ordering) | `DebugLevel Level = iota` ... ascending to `PanicLevel`; `TraceLevel Level = -1` (below Debug). Higher numeric level = fewer events pass the >= gate | MATCH |
| Enum value `trace` = most fine-grained | zerolog `globals.go:37` + `log.go:155` | `LevelTraceValue = "trace"`; `case TraceLevel: return LevelTraceValue` (TraceLevel = -1, the lowest) | MATCH |
| Enum value `debug` | zerolog `globals.go:39` + `log.go:157` | `LevelDebugValue = "debug"`; `case DebugLevel: return LevelDebugValue` | MATCH |
| Enum value `info` | zerolog `globals.go:41` + `log.go:159` | `LevelInfoValue = "info"`; `case InfoLevel: return LevelInfoValue` | MATCH |
| Enum value `warn` | zerolog `globals.go:43` + `log.go:161` | `LevelWarnValue = "warn"`; `case WarnLevel: return LevelWarnValue` | MATCH |
| Enum value `error` | zerolog `globals.go:45` + `log.go:163` | `LevelErrorValue = "error"`; `case ErrorLevel: return LevelErrorValue` | MATCH |
| Enum value `fatal` | zerolog `globals.go:47` + `log.go:165` | `LevelFatalValue = "fatal"`; `case FatalLevel: return LevelFatalValue` | MATCH |
| Enum value `panic` | zerolog `globals.go:49` + `log.go:167` | `LevelPanicValue = "panic"`; `case PanicLevel: return LevelPanicValue` | MATCH |
| Enum value `disabled` = logging off | zerolog `log.go:168-169` | `case Disabled: return "disabled"` (`Disabled` is the highest sentinel; nothing passes the gate) | MATCH |
| Accepted names are case-insensitive | zerolog `log.go:180-197` (ParseLevel) | each branch is `strings.EqualFold(levelStr, LevelFieldMarshalFunc(<Level>))` -- `EqualFold` = case-insensitive compare; default `LevelFieldMarshalFunc = l.String()` (`globals.go:52-54`) | MATCH |
| Unrecognized value is rejected, current level kept | `pkg/qtv/log.go:21-23` | `if level, err := zerolog.ParseLevel(new.Str); err != nil { log.Err(err)...; return false }` -- the on-change returns false; `qVarStorage.set` aborts the set on a false on-change (`var.go:161-163`: `if newValue.OnChange != nil && !newValue.OnChange(...) { return }`) | MATCH |
| Default: info | `pkg/qtv/log.go:15` (WI-2 registered default) | `qtv.qvs.RegEx("log_level", "info", 0, logLevelOnChange)` -- second arg `"info"` is the registered default | MATCH |
| Set by: server config | `pkg/qtv/log.go:15` (flags arg `0`) + dispatch `pkg/qtv/cmd.go:227` -> `var.go:227-241` (`CommandIsVar` -> `Set`) | flags `0` (no read-only / init-only / serverinfo); set via the bare `<name> <value>` command form, fed from the config file (`exec`, `pkg/qtv/cmd.go:305-331`) and the startup command line (`pkg/qtv/qtv.go:88-90`); no dedicated `set` command exists (commented out, `var.go:84-86`) | MATCH |

Not asserted in the user doc (so not required to enforce, but noted for completeness): `ParseLevel` also accepts the empty string (`NoLevel`, zerolog `log.go:196-197`) and a bare integer in the range -128..127 (`log.go:199-206`). These are library escape hatches, not admin-facing knobs; omitting them from the prose is a deliberate D20 simplification, not a dropped clause (they do not change how an admin uses the named levels).

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the dependency name (`zerolog`/`github.com/rs/zerolog`), the C/Go identifiers (`logLevelOnChange`, `ParseLevel`, `SetGlobalLevel`, `LevelFieldMarshalFunc`, `Level.String`, `LevelTraceValue`..`LevelPanicValue`, `EqualFold`, `qVarStorage.set`, `CommandIsVar`), the iota ordering mechanism, the on-change `return false` veto mechanism, and the integer/empty-string escape hatches. The user doc states only the admin-observable WHAT (a verbosity threshold), the value=meaning lines, the case-insensitivity + reject-on-invalid behavior, Default, and Set-by.

## Rationale

Cold-synth from fully-legible use-sites. `log_level` sets the process-wide minimum log severity via `zerolog.SetGlobalLevel` (`pkg/qtv/log.go:25`); zerolog then drops any event whose level is below that global level, so a higher level logs less and a lower level logs more. The on-change handler `logLevelOnChange` (`pkg/qtv/log.go:20-28`) parses the new string with `zerolog.ParseLevel`; on failure it logs the error and returns false, and `qVarStorage.set` (`var.go:161-163`) treats a false on-change as a veto -- so an invalid level name is rejected and the previous level is retained.

The accepted level NAMES are NOT inferred from the cvar name (that would be a flavour-C enum-from-name defect). They are traced into the pinned dependency `github.com/rs/zerolog v1.34.0` (`go.sum`): `ParseLevel` (zerolog `log.go:178-207`) compares the input case-insensitively (`strings.EqualFold`) against `LevelFieldMarshalFunc(<Level>)`, which defaults to `Level.String()` (`globals.go:52-54`, never overridden in QTV -- grep of `pkg/` for `LevelFieldMarshalFunc` / `LevelInfoValue` etc. returns nothing). `Level.String()` (zerolog `log.go:152-174`) plus the `LevelXxxValue` constants (`globals.go:36-49`) yield the literal strings: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, `panic`, `disabled`. The numeric ordering (`log.go:129-148`: `DebugLevel = iota` ascending, `TraceLevel = -1` below it, `Disabled` the top sentinel) is what makes trace the most verbose and disabled the off state.

WI-2: registered default is the literal `"info"` at the `RegEx` call (`pkg/qtv/log.go:15`), corroborated (HINT only, not ground truth, SR-1) by the commented `// log_level "info"` in `resources/qtv.cfg:24`. Set-by: flags arg is `0` (no read-only/init-only/serverinfo), and there is no `set` command (commented out at `var.go:84-86`); variables are assigned by the bare `<name> <value>` command form (`CommandIsVar`, `var.go:227-241`, dispatched from `execLine`, `cmd.go:227`), which is fed from the auto-exec'd config file (`exec qtv` at startup, `qtv.go:90`; `execCmd` reads `.cfg`, `cmd.go:305-331`) and equivalently from the startup command line (`qtv.go:88-89`). The admin-facing framing is `Set by: server config`.

No C2 conflict (source default and the qtv.cfg hint agree on `info`; the hint is commented-out and corroborative only). `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30 -- provenance holds retained shipped-doc DATA only).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing line (QTV apply/veto sites + the zerolog enum sites); no clause rests on the cvar name, a string, or a config comment. No L3 breadcrumb (logging knob; not one of the three SR-5 concept-note candidates).

## D6Record

```json
{
  "project": "qtv",
  "knob": "log_level",
  "type": "cvar",
  "description": "Sets how much detail the server writes to its log. Each message has a severity, and only messages at or above the chosen level are written; everything below it is suppressed. The lowest level logs the most, the highest level logs the least.\n\ntrace = log everything, including the most fine-grained tracing.\ndebug = log debugging detail and above.\ninfo = log normal operational messages and above.\nwarn = log warnings and above only.\nerror = log errors and above only.\nfatal = log only fatal errors.\npanic = log only panics.\ndisabled = turn logging off entirely.\n\nThe level name is not case-sensitive. An unrecognized value is rejected and the current level is kept.\n\nDefault: info.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/log.go:15 (RegEx(\"log_level\",\"info\",0,logLevelOnChange)); no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep confirms QTV use-sites are in pkg/qtv/log.go only; the enum is enforced in the pinned dep github.com/rs/zerolog v1.34.0 (go.sum). Clauses->cites: minimum-severity gate (lower passes, lower=more verbose) -> apply pkg/qtv/log.go:25 zerolog.SetGlobalLevel(level) + zerolog level ordering log.go:129-148 (DebugLevel=iota ascending, TraceLevel=-1, Disabled top sentinel). Accepted level NAMES traced (NOT name-inferred) into zerolog ParseLevel (log.go:178-207): each branch strings.EqualFold(levelStr, LevelFieldMarshalFunc(<Level>)); default LevelFieldMarshalFunc=l.String() (globals.go:52-54, NOT overridden in QTV -- grep of pkg/ empty); Level.String() log.go:152-174 + LevelXxxValue globals.go:36-49 yield literals trace/debug/info/warn/error/fatal/panic/disabled. Case-insensitivity -> EqualFold. Reject-on-invalid -> pkg/qtv/log.go:21-23 (ParseLevel err -> return false), and var.go:161-163 treats a false on-change as a veto so old value kept. Default info -> WI-2 registered literal pkg/qtv/log.go:15 (HINT corroboration qtv.cfg:24, commented, SR-1 not a seed). Set-by server config -> flags arg 0; no set command (commented var.go:84-86); set via bare <name> <value> form (CommandIsVar var.go:227-241 from execLine cmd.go:227), fed from auto-exec'd config (exec qtv qtv.go:90; execCmd cmd.go:305-331) and the startup cmdline (qtv.go:88-89). Not asserted in prose (D20 simplification, not dropped clauses): ParseLevel also accepts empty string=NoLevel (log.go:196-197) and a bare int -128..127 (log.go:199-206) -- library escape hatches, not admin knobs. No clause rests on name/string/comment; each maps to an enforcing apply/veto/enum line. No C2 conflict. provenance=null (cold-synth, operator 2026-05-30). Grading: synthesized, high confidence, every clause TRACED-CLEAN. No L3 breadcrumb (logging knob, not an SR-5 candidate).",
  "description_proposed": null
}
```
