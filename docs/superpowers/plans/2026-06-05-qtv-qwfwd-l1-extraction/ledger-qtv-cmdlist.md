# Ledger -- qtv `cmdlist` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill
**Handler:** `cmdListCmd` (pkg/qtv/cmd.go:333-358), registered pkg/qtv/cmd.go:38
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.16-dev

## Halt verdict

```
qtv:cmdlist: synthesized -- cold-synth, no comment; prints the names of all registered console commands, sorted alphabetically; an optional argument is a case-insensitive regular expression that filters which names are shown -- usage: cmdlist [pattern] -- ref=pkg/qtv/cmd.go:344-349 anchor=1.16-dev -- self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Lists the names of the console commands this QTV proxy understands, sorted alphabetically. Given an optional pattern, it shows only the command names that match that pattern; the pattern is a regular expression and is matched without regard to upper/lower case.
>
> cmdlist = list every command.
> cmdlist <pattern> = list only commands whose name matches <pattern>.
>
> Set by: QTV console / qtv.cfg.

## Handler-trace table

All sites in `pkg/qtv/cmd.go` at anchor `1.16-dev`.

| Site | file:line | Observable behavior it controls |
|---|---|---|
| Registration | pkg/qtv/cmd.go:38 | `cmd.Register("cmdlist", cmdListCmd)` -- name `cmdlist` maps to the handler |
| Optional pattern compile | pkg/qtv/cmd.go:337-341 | `if cmdArgs.Argc() > 1 { r, err = regexp.Compile("(?i)" + cmdArgs.Argv(1)) }` -- if an argument is given, compile it as a case-insensitive regexp |
| Source set = all registered commands | pkg/qtv/cmd.go:342-344 | `cmd := qtv.cmd; ... for k := range cmd.commands {` -- iterates the whole command map |
| Filter by pattern | pkg/qtv/cmd.go:345-347 | `if r != nil && !r.Match([]byte(k)) { continue }` -- skip names that do not match the compiled regexp |
| Alphabetical sort | pkg/qtv/cmd.go:350 | `sort.Slice(sortedCmds, func(i, j int) bool { return sortedCmds[i] < sortedCmds[j] })` -- sorted ascending |
| Output | pkg/qtv/cmd.go:351-356 | builds one name per line; `fmt.Println("list of commands:")` then prints the list |
| The command map (what is being listed) | pkg/qtv/cmd.go:35-38, qtv.go:446, var.go:87, upstream_storage.go:138-141, downstream_storage.go:218-219 | the union of all `cmd.Register(...)` call-sites is what cmdlist enumerates |

## D5 rubric check (Step 3)

Cold-synth: register site cmd.go:38 has no trailing comment; no shipped-doc candidate -> nothing to affirm; D5 amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (lists the console commands); (2) not a name restatement -- it spells the sorting and the optional-pattern filter; (3) the argument is enumerated (no-arg vs pattern) and its nature stated (regular expression, case-insensitive); (4) mechanism only; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/cmd.go` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Lists the names of the console commands the proxy understands | pkg/qtv/cmd.go:343-348 | `for k := range cmd.commands { ... sortedCmds = append(sortedCmds, k) }` -- enumerates the registered-command map keys (names) | MATCH |
| Sorted alphabetically | pkg/qtv/cmd.go:350 | `sort.Slice(sortedCmds, func(i, j int) bool { return sortedCmds[i] < sortedCmds[j] })` (ascending string order) | MATCH |
| An optional argument filters which names are shown | pkg/qtv/cmd.go:337-347 | `if cmdArgs.Argc() > 1 { ... regexp.Compile(...) }` then `if r != nil && !r.Match([]byte(k)) { continue }` | MATCH |
| The pattern is a regular expression | pkg/qtv/cmd.go:338 | `regexp.Compile("(?i)" + cmdArgs.Argv(1))` (Go `regexp`, not a substring test) | MATCH |
| Matched without regard to case (case-insensitive) | pkg/qtv/cmd.go:338 | the `"(?i)"` flag prefix prepended to the user pattern makes the compiled regexp case-insensitive | MATCH |
| Set by: console / config (no flags, no access tier) | pkg/qtv/cmd.go:38 (registration) | `cmd.Register("cmdlist", cmdListCmd)` -- plain map registration; QTV has no per-command access tiers | MATCH |

## D20 split note

Kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`cmdListCmd`, `cmd.commands`, `regexp.Compile`, `r.Match`, `sort.Slice`, the `"(?i)"` flag literal), and the map-iteration/sort mechanism. The user doc states only the admin-observable WHAT (lists the proxy's command names, sorted; optional case-insensitive regular-expression filter). The literal "list of commands:" header line and the bad-pattern error (an invalid regexp returns the compile error) are mechanism kept in reasoning. No Default line (the no-arg form -- list everything -- is the documented default behavior, already in the prose). No `See also:`.

## Rationale

Cold-synth from fully-legible use-sites. `cmdListCmd` (cmd.go:333-358): if at least one argument is given (`Argc() > 1`), it compiles `"(?i)" + cmdArgs.Argv(1)` as a Go regexp (cmd.go:337-341); a compile failure returns the error (so an invalid pattern is reported, not silently ignored). It then iterates the entire registered-command map `cmd.commands` (cmd.go:344), skipping any key whose name the compiled regexp does not match (`!r.Match([]byte(k))`, cmd.go:345-347) when a pattern was given; with no pattern `r` is nil and every name is kept. The collected names are sorted ascending (`sort.Slice` with `<`, cmd.go:350) and printed one per line under a "list of commands:" header (cmd.go:351-356).

Two load-bearing precision points, both enforce-traced rather than name-inferred:
- The optional argument is a REGULAR EXPRESSION (`regexp.Compile`, cmd.go:338), not a literal substring -- so `cmdlist ^d` lists commands starting with `d`. I state "regular expression" because that is what the code enforces.
- The match is CASE-INSENSITIVE because of the `"(?i)"` flag prepended to the user's pattern (cmd.go:338), not because of any lowercasing of the command names (the names are already lowercased at registration by `Register`, cmd.go:282, but the case-insensitivity the USER observes on the PATTERN is the `(?i)` flag).

What is being listed is the union of every `cmd.Register(...)` call-site in the package -- at anchor 1.16-dev: echo/quit/exec/cmdlist (cmd.go:35-38), status (qtv.go:446), varlist (var.go:87; `set` is commented out at var.go:86), qtv/playdemo/close/list (upstream_storage.go:138-141), dclose/dlist (downstream_storage.go:218-219). The description deliberately says "the console commands this proxy understands" rather than enumerating a fixed set, because the set is assembled across modules and `cmdlist` reflects whatever is registered at runtime; pinning a count in the user doc would rot.

Set-by: registered in the plain `cmd.commands` map (cmd.go:38), no access flags; QTV has no per-command access tiers, so it is issued from the QTV console or a qtv.cfg. No Default line (D20: the no-arg "list everything" is the default behavior, already stated in prose).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing iterate/match/sort/compile line; the "regular expression" and "case-insensitive" clauses are traced to `regexp.Compile` and the `(?i)` flag, not inferred. No D6 reject-list term. No L3 breadcrumb (cmdlist is a generic introspection primitive). `description_provenance` stays `null` (cold-synth).

## D6Record

```json
{
  "project": "qtv",
  "knob": "cmdlist",
  "type": "command",
  "description": "Lists the names of the console commands this QTV proxy understands, sorted alphabetically. Given an optional pattern, it shows only the command names that match that pattern; the pattern is a regular expression and is matched without regard to upper/lower case.\n\ncmdlist = list every command.\ncmdlist <pattern> = list only commands whose name matches <pattern>.\n\nSet by: QTV console / qtv.cfg.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/cmd.go:38 (cmd.Register(\"cmdlist\", cmdListCmd)), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Handler cmdListCmd cmd.go:333-358. Clauses->cites: lists the registered console command names -> cmd.go:343-348 for k := range cmd.commands { ... sortedCmds = append(sortedCmds, k) } (map keys are the names); sorted alphabetically -> cmd.go:350 sort.Slice(... sortedCmds[i] < sortedCmds[j]); optional arg filters -> cmd.go:337-341 if Argc()>1 { regexp.Compile(...) } + cmd.go:345-347 if r != nil && !r.Match([]byte(k)) { continue }; pattern is a REGULAR EXPRESSION (not substring) -> cmd.go:338 regexp.Compile(\"(?i)\" + cmdArgs.Argv(1)); case-INSENSITIVE -> the \"(?i)\" flag prefix on the user pattern at cmd.go:338 (not from lowercasing names -- names are pre-lowercased at Register cmd.go:282, but the user-observed case-insensitivity is the (?i) flag); invalid pattern is reported -> cmd.go:338-340 returns the compile err (mechanism, reasoning-only). What is listed = union of all cmd.Register call-sites at 1.16-dev: echo/quit/exec/cmdlist (cmd.go:35-38), status (qtv.go:446), varlist (var.go:87; set commented out var.go:86), qtv/playdemo/close/list (upstream_storage.go:138-141), dclose/dlist (downstream_storage.go:218-219) -- description says 'the commands this proxy understands' not a fixed count (set is assembled across modules + runtime-registered; a count would rot). Set-by console/config -> plain map registration cmd.go:38, no access flags; QTV has no per-command access tiers. No Default line (no-arg 'list everything' is the default, stated in prose). 'list of commands:' header is mechanism (reasoning-only). Every clause TRACED-CLEAN; 'regular expression' + 'case-insensitive' traced to regexp.Compile + (?i), not inferred. No D6 reject-list term. provenance=null (cold-synth). No L3 breadcrumb (generic introspection primitive).",
  "description_proposed": null
}
```
