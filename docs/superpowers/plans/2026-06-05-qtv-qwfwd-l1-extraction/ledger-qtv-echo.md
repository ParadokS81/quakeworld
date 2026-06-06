# Ledger -- qtv `echo` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill
**Handler:** `echoCmd` (pkg/qtv/cmd.go:286-293), registered pkg/qtv/cmd.go:35
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.16-dev

## Halt verdict

```
qtv:echo: synthesized -- cold-synth, no comment; prints its arguments back to the console as one space-joined line (empty line if none) -- usage: echo <text> -- ref=pkg/qtv/cmd.go:291 anchor=1.16-dev -- self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Prints the text you give it back to the QTV console, on its own line. The words you pass are echoed as a single line separated by single spaces; with no arguments it just prints a blank line. Because the console expands variables before a command runs, an argument written as a variable reference is printed as that variable's current value rather than literally.
>
> echo <text> = print <text> to the console.
>
> Set by: QTV console / qtv.cfg.

## Handler-trace table

All sites in `pkg/qtv/cmd.go` at anchor `1.16-dev`.

| Site | file:line | Observable behavior it controls |
|---|---|---|
| Registration | pkg/qtv/cmd.go:35 | `cmd.Register("echo", echoCmd)` -- name `echo` maps to the handler |
| No-arg branch | pkg/qtv/cmd.go:287-289 | `if cmdArgs.Argc() < 2 { fmt.Println(); return nil }` -- with no argument, prints an empty line |
| Print branch | pkg/qtv/cmd.go:291 | `fmt.Println(cmdArgs.Args())` -- prints the arguments string + newline |
| `Args()` join | pkg/qtv/cmd.go:80-86 | `strings.Join(cmdArgs.args[1:argc], " ")` -- args after the command name, joined by single spaces (empty string if argc<=1) |
| Variable expansion (upstream of handler) | pkg/qtv/cmd.go:174 | `ts = cmd.qtv.qvs.ExpandString(ts)` in `scanLine` -- each non-raw token is variable-expanded during tokenization, BEFORE the handler receives args |

## D5 rubric check (Step 3)

Cold-synth: register site cmd.go:35 has no trailing comment; no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. Use-sites are fully source-legible -> SYNTHESIZE. Rubric: (1) states the admin-observable WHAT (prints the given text to the console); (2) not a name restatement -- it spells out the space-joining, the blank-line-on-no-args behavior, and the expansion consequence; (3) no enum/units (a free-text command), the argument form is shown in the usage line; (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/cmd.go` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Prints the given text back to the console on its own line | pkg/qtv/cmd.go:291 | `fmt.Println(cmdArgs.Args())` (`Println` appends a newline) | MATCH |
| Words are echoed as a single line separated by single spaces | pkg/qtv/cmd.go:84 (in `Args()`) | `strings.Join(cmdArgs.args[1:argc], " ")` (separator is one space) | MATCH |
| With no arguments it prints a blank line | pkg/qtv/cmd.go:287-289 | `if cmdArgs.Argc() < 2 { fmt.Println(); return nil }` | MATCH |
| A variable-reference argument is printed as the variable's current value (console expands before the command runs) | pkg/qtv/cmd.go:174 | `ts = cmd.qtv.qvs.ExpandString(ts)` (token expansion in `scanLine`, before `execLine` dispatches) | MATCH |
| Set by: console / config (no flags, no access tier) | pkg/qtv/cmd.go:35 (registration) | `cmd.Register("echo", echoCmd)` -- plain map registration; QTV has no per-command access tiers | MATCH |

## D20 split note

Kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`echoCmd`, `cmdArgs.Args()`, `strings.Join`, `fmt.Println`, `ExpandString`, `scanLine`), and the tokenizer mechanism. The user doc states only the admin-observable WHAT (prints the arguments as one space-joined line; blank line when empty; variable args show their value) and the usage line. No Default line: `echo` has no meaningful no-arg default behavior worth stating beyond "prints a blank line", which is already in the prose. No `See also:` (no cross-engine consequence for echo).

## Rationale

Cold-synth from fully-legible use-sites. `echoCmd` (cmd.go:286-293) has two branches: if fewer than two args (`Argc() < 2`, i.e. only the command name), it prints an empty line via `fmt.Println()` (cmd.go:288); otherwise it prints `cmdArgs.Args()` via `fmt.Println()` (cmd.go:291). `Args()` (cmd.go:80-86) returns the arguments after the command name (`args[1:]`) joined by a single space, or the empty string when there are no such args. `Println` appends a trailing newline, so the output is one line.

The variable-expansion clause is traced to the tokenizer, not the handler: in `scanLine` (cmd.go:130-213) each non-raw-string token is passed through `cmd.qtv.qvs.ExpandString(ts)` (cmd.go:174) before the tokens are assembled into `qCmdArgs` and dispatched by `execLine` (cmd.go:216-234). So by the time `echoCmd` runs, an argument written as a variable reference has already been replaced with its current value. This is a console-wide behavior, but it is the admin-observable result of running `echo $somevar`, so it is stated as a consequence; it is enforce-traced to ExpandString at cmd.go:174 (not inferred). Raw-string (backquoted) tokens are the one exception that skips expansion (cmd.go:173 `if quote != '`'`), an edge detail kept out of the user doc.

Set-by: the command is registered in the plain `cmd.commands` map (cmd.go:35) with no access flags; QTV has no per-command access tiers (the dispatch in `execLine` cmd.go:223-226 simply looks up the name and calls the handler), so it is issued from the QTV console or a qtv.cfg that contains `echo` lines. No Default line (D20: no meaningful no-arg default beyond the blank-line behavior already in prose).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing print/join/expand line; no clause rests on the command name. No D6 reject-list term involved. No L3 breadcrumb (echo is a generic console primitive, not part of the masters / parse_delay / qtv_password concept-note candidates). `description_provenance` stays `null` (cold-synth).

## D6Record

```json
{
  "project": "qtv",
  "knob": "echo",
  "type": "command",
  "description": "Prints the text you give it back to the QTV console, on its own line. The words you pass are echoed as a single line separated by single spaces; with no arguments it just prints a blank line. Because the console expands variables before a command runs, an argument written as a variable reference is printed as that variable's current value rather than literally.\n\necho <text> = print <text> to the console.\n\nSet by: QTV console / qtv.cfg.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/cmd.go:35 (cmd.Register(\"echo\", echoCmd)), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Handler echoCmd pkg/qtv/cmd.go:286-293. Clauses->cites: prints text on its own line -> pkg/qtv/cmd.go:291 fmt.Println(cmdArgs.Args()) (Println appends newline); single-space-joined -> Args() pkg/qtv/cmd.go:84 strings.Join(cmdArgs.args[1:argc], \" \"); blank line when no args -> pkg/qtv/cmd.go:287-289 if cmdArgs.Argc() < 2 { fmt.Println(); return nil }; variable-reference arg prints the variable's value -> tokenizer scanLine pkg/qtv/cmd.go:174 ts = cmd.qtv.qvs.ExpandString(ts) runs per-token BEFORE execLine dispatch (cmd.go:216-234), so echo receives already-expanded args (raw backquoted tokens skip expansion, cmd.go:173 -- edge detail, omitted from user doc). Set-by console/config -> plain map registration cmd.go:35, no access flags; QTV has no per-command access tiers (execLine looks up name + calls handler, cmd.go:223-226). No Default line (D20: no meaningful no-arg default beyond the blank-line behavior already stated). Every clause TRACED-CLEAN; no clause rests on the command name or a string/enum. No D6 reject-list term. provenance=null (cold-synth). No L3 breadcrumb (generic console primitive).",
  "description_proposed": null
}
```
