# Ledger -- qtv `exec` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill
**Handler:** `execCmd` (pkg/qtv/cmd.go:305-331), registered pkg/qtv/cmd.go:37
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.16-dev

> Sibling note: this is the direct QTV counterpart to qwfwd `exec`, but the behavior was traced against QTV's OWN Go handler + the `qfs` package. It DIFFERS from the qwfwd C version on three points that are verified below, not copied: (1) QTV auto-appends `.cfg` to a bare filename (qwfwd rejects a name with no `.cfg`); (2) QTV's `.cfg` match is case-SENSITIVE (qwfwd uses case-insensitive `stricmp`); (3) QTV's search order is root-then-`qtv`-then-`qw`-then-`id1` (qwfwd is `qwfwd`-then-`qw`).

## Halt verdict

```
qtv:exec: synthesized -- cold-synth, no comment; reads and runs a .cfg script file (bare name auto-gets .cfg; .cfg match is case-sensitive; searched root dir, then qtv/, qw/, id1/, first match wins; commands run AHEAD of the rest of the buffer; absolute paths + leading-dot names rejected, .. cannot climb above the search dir) -- usage: exec <filename.cfg> -- ref=pkg/qtv/cmd.go:324 anchor=1.16-dev -- self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Runs a config file: reads the named .cfg file and executes the commands inside it as if they had been typed at the QTV console. If you give a name with no extension, .cfg is added for you; if you give an extension it must be .cfg (and must be lower-case .cfg), otherwise the command is refused. The file is looked for in the QTV root directory first, then in the qtv, qw and id1 directories, and the first copy found is the one that runs. The file's commands run ahead of anything still queued. Absolute paths are not allowed, and the name cannot reach above the directory it is searched in.
>
> exec <filename.cfg> = read and run <filename.cfg>.
>
> Set by: QTV console / qtv.cfg (configs commonly exec other configs).

## Handler-trace table

`execCmd` body in `pkg/qtv/cmd.go`; path resolution in `pkg/qfs/qfs.go`. Anchor `1.16-dev`.

| Site | file:line | Observable behavior it controls |
|---|---|---|
| Registration | pkg/qtv/cmd.go:37 | `cmd.Register("exec", execCmd)` -- name `exec` maps to the handler |
| Arg-count gate | pkg/qtv/cmd.go:308-310 | `if cmdArgs.Argc() < 2 { return fmt.Errorf("Usage: %s filename.cfg: execute a script file", ...) }` -- requires a filename arg |
| Filename | pkg/qtv/cmd.go:312 | `name := cmdArgs.Argv(1)` -- the first argument is the filename |
| Extension switch | pkg/qtv/cmd.go:314-320 | `switch filepath.Ext(name) { case "": name += ".cfg"; case ".cfg": ; default: return errors.New("cfg extension required") }` -- bare name gets `.cfg`; exact `.cfg` accepted; anything else refused |
| File read (empty base) | pkg/qtv/cmd.go:324 | `data, err := qfs.Read("", name)` -- reads the file via the qfs search path, with empty base (root allowed) |
| `qfs.Open` search path | pkg/qfs/qfs.go:45-69 | `sp = [base] + searchPath` = `["", "qtv", "qw", "id1"]`; first successful open wins |
| `searchPath` constant | pkg/qfs/qfs.go:14 | `searchPath = []string{"qtv", "qw", "id1"}` |
| `BasePath` safety | pkg/qfs/qfs.go:18-32 | rejects absolute paths + leading-dot names; `filepath.Clean("/"+name)` neutralizes leading `..` so a name cannot climb above the base |
| Prepend to buffer | pkg/qtv/cmd.go:328 | `qtv.cmd.Prepend(string(data))` -- the file's text is inserted at the FRONT of the command buffer |
| `Prepend` semantics | pkg/qtv/cmd.go:269-275 | `cmd.buf = s + "\n" + cmd.buf` -- new text precedes already-queued text |

## D5 rubric check (Step 3)

Cold-synth: register site cmd.go:37 has no trailing comment (the comment cmd.go:322-323 is coder-WHY about C backward-compat, corroboration not citation). No shipped-doc candidate -> nothing to affirm; D5 amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (runs a config file); (2) not a name restatement -- spells the extension handling, the search order, the run-ahead ordering, the path restrictions; (3) the argument form is shown, the extension rule is enumerated (bare->.cfg / exact .cfg / else refused); (4) mechanism only; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

`execCmd` in `pkg/qtv/cmd.go`; `qfs` in `pkg/qfs/qfs.go`. Anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Reads the named .cfg file and runs its commands as if typed at the console | pkg/qtv/cmd.go:324 + :328 | `data, err := qfs.Read("", name)` then `qtv.cmd.Prepend(string(data))` (text re-enters the same command buffer Exec() processes) | MATCH |
| Requires a filename argument (else prints usage) | pkg/qtv/cmd.go:308-310 | `if cmdArgs.Argc() < 2 { return fmt.Errorf("Usage: %s filename.cfg: execute a script file", cmdArgs.Name()) }` | MATCH |
| A name with no extension gets `.cfg` added | pkg/qtv/cmd.go:315-316 | `case "": name += ".cfg"` | MATCH |
| An explicit extension must be `.cfg`, else refused | pkg/qtv/cmd.go:317-319 | `case ".cfg":` (accept) `default: return errors.New("cfg extension required")` | MATCH |
| The `.cfg` match is case-SENSITIVE (must be lower-case) | pkg/qtv/cmd.go:314 + `filepath.Ext` | `switch filepath.Ext(name)` compared to literal `".cfg"` -- `filepath.Ext` preserves case (verified: `Ext("foo.CFG")=".CFG"`), and the `case ".cfg"` is exact, so `.CFG`/`.Cfg` fall to `default` and are refused | MATCH |
| Searched in the root directory first | pkg/qfs/qfs.go:48 + cmd.go:324 | `sp = append(sp, base)` with `base==""` from `qfs.Read("", name)`; `open("", name)` -> `BasePath` sets base `"."` (the QTV root) and it is tried at loop index 0 | MATCH |
| then in qtv, qw and id1 directories, first match wins | pkg/qfs/qfs.go:14, :49-66 | `searchPath = []string{"qtv", "qw", "id1"}`; loop tries each `open(v, name)` in order and `return` on the first that opens + stats | MATCH |
| The file's commands run ahead of anything still queued | pkg/qtv/cmd.go:328 + :269-275 | `qtv.cmd.Prepend(string(data))`; `Prepend`: `cmd.buf = s + "\n" + cmd.buf` (new text precedes existing buffer) | MATCH |
| Absolute paths are not allowed | pkg/qfs/qfs.go:23-27 | `if filepath.IsAbs(fullName) || (fullName[0]=='\\'||fullName[0]=='/') || (fullName[1]==':') { return "", fmt.Errorf("absolute path is not allowed: %s", ...) }` | MATCH |
| The name cannot reach above the directory it is searched in (leading `..` neutralized) | pkg/qfs/qfs.go:22 + :28-30 | `fullName := filepath.Join(base, filepath.Clean(string(os.PathSeparator)+name))` -- Clean of a rooted path drops leading `..` (verified: `BasePath("qtv","../../etc/passwd.cfg")="qtv/etc/passwd.cfg"`); plus a resulting leading-dot name is rejected at :28 | MATCH |
| Set by: console / config (no flags, no access tier) | pkg/qtv/cmd.go:37 (registration) | `cmd.Register("exec", execCmd)` -- plain map registration; QTV has no per-command access tiers | MATCH |

## D20 split note

Kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`execCmd`, `qfs.Read`, `qfs.Open`, `BasePath`, `filepath.Ext`, `filepath.Clean`, `filepath.IsAbs`, `searchPath`, `Prepend`, `cmd.buf`), and the `Clean`-neutralizes-`..` mechanism. The user doc states only admin-observable behavior: it runs a .cfg file's commands at the console, the extension handling (bare->.cfg, lower-case .cfg only), the search order (root, then qtv/qw/id1, first match), the run-ahead ordering, and the path restrictions (no absolute, cannot climb above the search dir). The empty-base "root allowed (not recommended security-wise)" qfs note (qfs.go:44) is engine plumbing -> reasoning only. No Default line (no meaningful no-arg default; the no-arg form is a usage error). No `See also:`.

## Rationale

Cold-synth from fully-legible use-sites. `execCmd` (cmd.go:305-331): requires at least one argument (`Argc() < 2` -> usage error, cmd.go:308-310); takes `name := cmdArgs.Argv(1)` (cmd.go:312). The extension switch (cmd.go:314-320) is the first QTV-specific behavior: `filepath.Ext(name)` of `""` -> append `.cfg` (auto-complete a bare name); `".cfg"` -> accept unchanged; any other extension -> `errors.New("cfg extension required")`. I verified `filepath.Ext` is case-preserving (a probe gave `Ext("foo.CFG")==".CFG"`), and the `case ".cfg"` is an exact-string match, so `foo.CFG` / `foo.Cfg` fall through to `default` and are refused -- the match is case-SENSITIVE. (This is the explicit divergence from qwfwd, which uses case-insensitive `stricmp(".cfg", ...)` and does NOT auto-append; the QTV behavior is traced, not copied.)

The file is read via `qfs.Read("", name)` (cmd.go:324) -- an EMPTY base. Following the callee: `Read` -> `Open("", name)` (qfs.go:74-81 -> :45-69) builds `sp = append([base], searchPath...)` = `["", "qtv", "qw", "id1"]` (searchPath constant qfs.go:14). The loop tries `open(v, name)` for each entry in order and returns on the first that opens and stats successfully (qfs.go:50-66). For `v==""`, `open("", name)` -> `BasePath("", name)` sets `base="."` (qfs.go:19-21), i.e. the QTV ROOT directory with no gamedir. So the admin-observable search order is: root directory first, then `qtv/`, `qw/`, `id1/`, first match wins. The root-first lookup is the C-version backward-compat path the code comment at cmd.go:322-323 calls out ("execute config files from the root directory without gamedir, would be nice to get rid of it"); that comment is corroboration, and the enforcing line is the empty base passed at cmd.go:324 feeding qfs.go:48.

Path safety is in `BasePath` (qfs.go:18-32): it `filepath.Join`s the base with `filepath.Clean(os.PathSeparator + name)`, then rejects the result if it is absolute / starts with `\` or `/` / has a drive `:` at index 1 (qfs.go:23-27), or if the cleaned name starts with `.` (qfs.go:28-30). The `..`-traversal behavior is the third point I verified by probe rather than inferring: prepending a separator and `Clean`ing collapses any LEADING `..` (Go's rule "rooted-path leading .. are removed"), so `../../etc/passwd.cfg` resolves to `etc/passwd.cfg` UNDER the base, never above it (probe: `BasePath("qtv","../../etc/passwd.cfg")=="qtv/etc/passwd.cfg"`). So the user-doc claim is the accurate one: the name cannot climb ABOVE the search directory. (I deliberately did NOT write "paths containing .. are rejected" -- that would be the qwfwd behavior, and it is FALSE for QTV; a mid-path `..` is resolved, a leading `..` is silently neutralized, neither is rejected.)

On success, `qtv.cmd.Prepend(string(data))` (cmd.go:328) inserts the file's text at the FRONT of the command buffer: `Prepend` does `cmd.buf = s + "\n" + cmd.buf` (cmd.go:269-275), so the file's commands run ahead of whatever was already queued. The buffer is the same one `Exec()` (cmd.go:93-127) tokenizes and dispatches, which is why the file's lines run "as if typed at the console."

Set-by: registered in the plain `cmd.commands` map (cmd.go:37), no access flags; QTV has no per-command access tiers, so it is issued from the QTV console or a qtv.cfg (which commonly execs other configs). No Default line (D20: the no-arg form is a usage error, not a default).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/compare/call line, including the three QTV-specific points (auto-append, case-sensitive .cfg, root-first search) and the `..`-neutralization, all verified against code (and a Go probe for the `filepath` semantics) rather than inferred from the name or copied from the qwfwd sibling. No D6 reject-list term. No L3 breadcrumb (exec is a generic console primitive). `description_provenance` stays `null` (cold-synth).

## D6Record

```json
{
  "project": "qtv",
  "knob": "exec",
  "type": "command",
  "description": "Runs a config file: reads the named .cfg file and executes the commands inside it as if they had been typed at the QTV console. If you give a name with no extension, .cfg is added for you; if you give an extension it must be .cfg (and must be lower-case .cfg), otherwise the command is refused. The file is looked for in the QTV root directory first, then in the qtv, qw and id1 directories, and the first copy found is the one that runs. The file's commands run ahead of anything still queued. Absolute paths are not allowed, and the name cannot reach above the directory it is searched in.\n\nexec <filename.cfg> = read and run <filename.cfg>.\n\nSet by: QTV console / qtv.cfg (configs commonly exec other configs).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no user-doc comment at registration pkg/qtv/cmd.go:37 (cmd.Register(\"exec\", execCmd)); the comment cmd.go:322-323 (C backward-compat root-dir lookup) is corroboration, not citation. Handler execCmd cmd.go:305-331; path resolution in pkg/qfs/qfs.go. Clauses->cites: reads the .cfg and runs its commands as if typed -> cmd.go:324 qfs.Read(\"\", name) + cmd.go:328 qtv.cmd.Prepend(string(data)) re-entering the same buffer Exec() processes (cmd.go:93-127); requires a filename arg -> cmd.go:308-310 Argc()<2 -> usage error; bare name gets .cfg -> cmd.go:315-316 case \"\": name += \".cfg\"; explicit ext must be .cfg else refused -> cmd.go:317-319 case \".cfg\": / default: errors.New(\"cfg extension required\"); .cfg match is CASE-SENSITIVE -> cmd.go:314 switch filepath.Ext(name) vs literal \".cfg\", filepath.Ext is case-preserving (Go probe: Ext(\"foo.CFG\")==\".CFG\"), exact case match so .CFG/.Cfg hit default + refused (DIVERGES from qwfwd stricmp case-insensitive + qwfwd has no auto-append -- traced, not copied); searched root first -> qfs.Read(\"\", name) empty base => qfs.Open sp=append([base],searchPath...)=[\"\",\"qtv\",\"qw\",\"id1\"] (qfs.go:48 + searchPath qfs.go:14), open(\"\",name)->BasePath sets base \".\" = QTV root (qfs.go:19-21), tried at loop idx0; then qtv/qw/id1 first-match-wins -> qfs.go:49-66 returns on first successful open+stat; commands run ahead of queued -> cmd.go:328 Prepend + cmd.go:269-275 cmd.buf = s + \"\\n\" + cmd.buf; absolute paths rejected -> qfs.go:23-27 filepath.IsAbs || leading \\ or / || in[1]==':' -> 'absolute path is not allowed'; name cannot climb above the search dir -> qfs.go:22 filepath.Join(base, filepath.Clean(os.PathSeparator+name)) neutralizes leading .. (Go rooted-path rule; probe: BasePath(\"qtv\",\"../../etc/passwd.cfg\")==\"qtv/etc/passwd.cfg\") + leading-dot name rejected qfs.go:28-30. DELIBERATELY did NOT assert 'paths containing .. are rejected' (that is the qwfwd behavior and is FALSE for QTV: mid-path .. resolves, leading .. is silently collapsed, neither is rejected). Set-by console/config -> plain map registration cmd.go:37, no access flags; QTV has no per-command access tiers. No Default line (no-arg = usage error). qfs empty-base 'root allowed (not recommended)' note (qfs.go:44) = engine plumbing, reasoning-only. Every clause TRACED-CLEAN, three QTV-specific points + .. semantics verified vs code + Go probe, not inferred/copied. No D6 reject-list term. provenance=null (cold-synth). No L3 breadcrumb (generic console primitive).",
  "description_proposed": null
}
```
