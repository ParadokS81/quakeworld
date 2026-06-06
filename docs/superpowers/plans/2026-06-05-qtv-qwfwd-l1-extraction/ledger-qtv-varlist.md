# Ledger -- qtv `varlist` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill (QTV half)
**Handler:** `varListCmd` (pkg/qtv/var.go:254-279), registered pkg/qtv/var.go:87
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.16-dev (pkg/qtv/qtv.go:29 `qtvRelease`)
**Confidence:** high

## Halt verdict

```
varlist: synthesized -- lists the proxy's configuration variable names alphabetically; an optional argument is a case-insensitive pattern that filters to names matching it; Usage: varlist [pattern] -- ref=pkg/qtv/var.go:254 -- self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Lists the names of the proxy's configuration variables, sorted alphabetically. With no argument it lists them all; with one argument, that argument is treated as a case-insensitive search pattern and only variable names matching it are listed. (To see a single variable's current value, type its name on its own.)
>
> varlist [pattern] = list variable names, optionally filtered to those matching <pattern>.
>
> Set by: proxy server console / qtv.cfg.

## Handler-trace table

| Aspect | Enforcing line | Snippet | Observable behavior |
|---|---|---|---|
| Registered name | var.go:87 | `qtv.cmd.Register("varlist", varListCmd)` | console command `varlist` |
| Optional 1 arg = case-insensitive pattern | var.go:257-261 | `if cmdArgs.Argc() > 1 { if r, err = regexp.Compile("(?i)" + cmdArgs.Argv(1)); err != nil { return err } }` | with arg: compile `(?i)<arg>` as filter; bad regex -> error |
| Iterates all registered variables | var.go:263-265 | `vars := qtv.qvs.v.Load().(qvarMap)` ; `for k := range vars {` | source = the cvar storage map |
| Filter: skip names not matching the pattern | var.go:266-268 | `if r != nil && !r.Match([]byte(k)) { continue }` | only matching names kept (when arg given) |
| Sorted ascending | var.go:271 | `sort.Slice(sortedVars, func(i, j int) bool { return sortedVars[i] < sortedVars[j] })` | alphabetical order |
| Header + one name per line | var.go:272-277 | `fmt.Println("list of variables:")` ... `fmt.Fprintln(&b, v)` | "list of variables:" then names |
| Single-name lookup is a SEPARATE path (not varlist) | var.go:227-241 | `CommandIsVar(...)` -> `if cmdArgs.Argc() == 1 { fmt.Printf("%q is %q\n", name, qv.Str) }` | typing a var name prints its value |

## D5 rubric check (Step 3)

Cold-synth: register/handler site has no trailing comment and there is no shipped-doc candidate -> nothing to affirm; D5-amendment requires evaluation anyway. Handler is fully source-legible -> SYNTHESIZE. (1) States admin-observable WHAT (lists variable names, optionally filtered); (2) not a name restatement (spells out the alphabetical listing, the optional pattern argument and its case-insensitivity, and the separate "type the name to see its value" path); (3) the optional argument and its meaning (a case-insensitive match pattern) are spelled out; (4) mechanism only, no opinion; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | Result |
|---|---|---|---|
| Semantic: lists the proxy's configuration variable NAMES | var.go:263-269 + :272-277 | `vars := qtv.qvs.v.Load().(qvarMap)` ; `for k := range vars { ... sortedVars = append(sortedVars, k) }` ; `fmt.Fprintln(&b, v)` (prints keys = names only) | MATCH |
| Sorted alphabetically | var.go:271 | `sort.Slice(sortedVars, func(i, j int) bool { return sortedVars[i] < sortedVars[j] })` | MATCH |
| No argument -> lists them all | var.go:257-258 + :266 | `if cmdArgs.Argc() > 1 {` (regex only compiled when an arg exists) ; `if r != nil && ...` (nil r when no arg -> no filtering) | MATCH |
| One argument -> case-insensitive pattern filter | var.go:259 + :266-268 | `regexp.Compile("(?i)" + cmdArgs.Argv(1))` (`(?i)` = case-insensitive) ; `if r != nil && !r.Match([]byte(k)) { continue }` | MATCH |
| Bad pattern -> reports the error | var.go:259-261 | `if r, err = regexp.Compile(...); err != nil { return err }` | MATCH (not asserted in user prose; recorded) |
| Single-variable value lookup is a different action (type the name) | var.go:227-241 (`CommandIsVar`) | `if cmdArgs.Argc() == 1 { fmt.Printf("%q is %q\n", name, qv.Str) }` -- dispatched by execLine (cmd.go:227) for any registered var name, NOT by varListCmd | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of `description` per D20: every file:line cite, the Go identifiers (`varListCmd`, `qtv.qvs`, `qvarMap`, `regexp.Compile`, `r.Match`, `sort.Slice`, `CommandIsVar`, `execLine`), the literal `(?i)` regex flag, and the "list of variables:" header string. The user doc states only the admin-observable WHAT (lists variable names alphabetically; optional case-insensitive pattern filter; type a name to see its value). The fact that the filter is a Go regex specifically is rendered to the admin as "a case-insensitive search pattern" -- describing it as "regex" would be engine-jargon leakage, but the case-insensitive substring/pattern behavior IS the observable effect and is stated. No Default line (no-arg listing command with an optional arg). No See-also L3 (a same-codebase variable listing; no cross-engine action-changing consequence).

## Rationale

`varListCmd` (var.go:254-279) lists configuration-variable names. With no argument, `r` stays nil and the filter branch (:266) is skipped, so every key in the variable map is collected. With one argument, the handler compiles `(?i)<arg>` (:259) -- the `(?i)` prefix makes the match case-insensitive -- and skips any name the pattern does not match (:266-268); a malformed pattern returns the compile error (:259-261). The collected names are sorted ascending (:271) and printed one per line under the header "list of variables:" (:272-277). The output is NAMES only -- the loop appends the map key `k` (the variable name), never the value.

The "type a name to see its value" clause is a separate dispatch path, deliberately distinguished: `varlist` itself never prints values. When a bare registered variable name is entered at the console, `execLine` (cmd.go:227) routes it to `CommandIsVar` (var.go:227-241), which with one token prints `"<name>" is "<value>"` (:237) and with more tokens SETS the variable (:239). That is the value-inspection path; `varlist` is purely the name index. Including this clause prevents an admin from expecting `varlist` to dump values.

Note (Chesterton's fence, recorded not asserted): a `set` command is present but commented out (var.go:85-86 register; :244-252 body), with the in-code comment "There is no need for set command right now." Variables are set by typing `name value` (the `CommandIsVar` Argc>1 path) or via config -- there is no live `set` command. This does not affect the `varlist` description; recorded for completeness.

Access model: QTV has no rcon and no access tiers -- commands are dispatched from a flat `map[string]cmdFunc` via `execLine` (cmd.go:216-234) with no permission gate; surfaces are the proxy console and a qtv.cfg. So `Set by: proxy server console / qtv.cfg` (matches the QWFWD-half precedent).

D6 reject-list (SR-2): not applicable -- `varlist` is sourced strictly from the Go handler; none of the four C-only knobs appears in `pkg/` (grep-confirmed NONE FOUND).

`description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30). No L3 breadcrumb (a local variable listing, not an SR-5 candidate). Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/compile/match/sort/print line; no clause rests on the command name, an enum/string, or a config comment.

## D6Record

```json
{
  "project": "qtv",
  "knob": "varlist",
  "type": "command",
  "description": "Lists the names of the proxy's configuration variables, sorted alphabetically. With no argument it lists them all; with one argument, that argument is treated as a case-insensitive search pattern and only variable names matching it are listed. (To see a single variable's current value, type its name on its own.)\n\nvarlist [pattern] = list variable names, optionally filtered to those matching <pattern>.\n\nSet by: proxy server console / qtv.cfg.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "varListCmd (pkg/qtv/var.go:254-279), registered :87. Cold-synth: no trailing comment at the register/handler site, no shipped-doc candidate -> nothing to affirm; handler fully source-legible so synthesize. Clauses->cites: lists variable NAMES -> vars := qtv.qvs.v.Load().(qvarMap) :263, for k := range vars append k :265+:269, print keys fmt.Fprintln(&b, v) :273-274 (names only, never values); sorted alphabetically -> sort.Slice sortedVars[i] < sortedVars[j] :271; no arg -> all -> regex compiled only when Argc()>1 :257-258, r stays nil so filter :266 skipped; one arg -> case-insensitive pattern filter -> regexp.Compile('(?i)' + cmdArgs.Argv(1)) :259 ('(?i)' = case-insensitive) + if r != nil && !r.Match([]byte(k)) continue :266-268; bad pattern -> return err :259-261 (recorded, not in user prose). Single-variable value lookup is a SEPARATE path, not varlist -> CommandIsVar var.go:227-241 (Argc==1 -> fmt.Printf('%q is %q', name, qv.Str) :237), dispatched by execLine cmd.go:227 for any registered var name; included so admins don't expect varlist to dump values. D20: the Go-regex nature is rendered to the admin as 'a case-insensitive search pattern' (saying 'regex' would be jargon leakage); the case-insensitive pattern-match behavior is the observable effect and is stated. Chesterton's-fence note (recorded, not asserted): a `set` command is present but commented out (var.go:85-86 + :244-252, comment 'There is no need for set command right now'); vars are set via 'name value' (CommandIsVar Argc>1 :239) or config -- no live set command; does not affect this description. Access model: QTV no rcon/no access tiers -- flat command map, no permission gate (cmd.go:216-234), surfaces proxy console + qtv.cfg -> Set by console/config (matches QWFWD precedent). No Default line (no-arg listing command with optional arg). D6 reject-list (SR-2) N/A: sourced from Go handler; mvdport/admin_password/floodprot/allow_http absent from pkg/ (grep NONE FOUND). No See-also L3 (local variable listing, no cross-engine action-changing consequence); no SR-5 breadcrumb. provenance=null (cold-synth, operator 2026-05-30). Grading: synthesized, high confidence, every clause TRACED-CLEAN.",
  "description_proposed": null
}
```
