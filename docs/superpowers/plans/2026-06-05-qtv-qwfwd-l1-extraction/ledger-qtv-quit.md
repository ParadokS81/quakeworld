# Ledger -- qtv `quit` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill
**Handler:** `quitCmd` (pkg/qtv/cmd.go:295-303), registered pkg/qtv/cmd.go:36
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.16-dev

## Halt verdict

```
qtv:quit: synthesized -- cold-synth, no comment; shuts the proxy down -- with ANY argument = graceful (cancels main context), with no argument = immediate process exit (exit code 0) -- usage: quit [anything] -- ref=pkg/qtv/cmd.go:297-301 anchor=1.16-dev -- self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Shuts down the QTV proxy. Run with no argument, it stops the process immediately. Run with any argument after it (the argument's value does not matter), it instead asks the proxy to shut down gracefully, letting the running parts wind down rather than exiting on the spot.
>
> quit = stop immediately.
> quit <anything> = stop gracefully.
>
> Set by: QTV console / qtv.cfg.

## Handler-trace table

All sites in `pkg/qtv` at anchor `1.16-dev`.

| Site | file:line | Observable behavior it controls |
|---|---|---|
| Registration | pkg/qtv/cmd.go:36 | `cmd.Register("quit", quitCmd)` -- name `quit` maps to the handler |
| Arg-present branch (graceful) | pkg/qtv/cmd.go:297-298 | `if cmdArgs.Argc() > 1 { return ... qtv.Stop() ... }` -- with at least one argument, calls the graceful Stop path |
| No-arg branch (immediate) | pkg/qtv/cmd.go:299-301 | `else { os.Exit(0) }` -- with no argument, terminates the process immediately with exit code 0 |
| `Stop()` (graceful mechanism) | pkg/qtv/qtv.go:198-203 | `if qtv.cancelFunc != nil { qtv.cancelFunc() }` -- cancels the QTV main context, which the running goroutines observe and wind down |
| `cancelFunc` origin | pkg/qtv/qtv.go:47, :66 | `cancelFunc context.CancelFunc` set to the main context's `cancel` -- the orderly-shutdown signal |

## D5 rubric check (Step 3)

Cold-synth: register site cmd.go:36 has no trailing comment (the only comment, cmd.go:296 "Perform graceful quit if at least one argument provided", is coder-WHY but happens to confirm the behavior -- it is corroboration, not the citation). No shipped-doc candidate -> nothing to affirm; D5 amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (shuts the proxy down); (2) not a name restatement -- it spells out the two argument modes; (3) the two argument forms are enumerated (no-arg vs any-arg) with their distinct meanings; (4) mechanism only; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Shuts down the QTV proxy | pkg/qtv/cmd.go:295-301 (both branches terminate/stop) | `os.Exit(0)` (cmd.go:300) / `qtv.Stop()` (cmd.go:298) | MATCH |
| With no argument, stops the process immediately | pkg/qtv/cmd.go:299-301 | `} else { os.Exit(0) }` (`os.Exit` terminates at once, no deferred cleanup) | MATCH |
| With ANY argument after it, shuts down gracefully | pkg/qtv/cmd.go:297-298 | `if cmdArgs.Argc() > 1 { return multierror.Prefix(qtv.Stop(), "quit:") }` (gate is arg COUNT > 1, not a specific value) | MATCH |
| Graceful = lets the running parts wind down (not an on-the-spot exit) | pkg/qtv/qtv.go:198-203 | `func (qtv *QTV) Stop() error { if qtv.cancelFunc != nil { qtv.cancelFunc() } ... }` -- cancels the main context rather than calling os.Exit | MATCH |
| The argument's value does not matter | pkg/qtv/cmd.go:297 | `cmdArgs.Argc() > 1` -- the branch reads only the COUNT; `cmdArgs` value at index 1 is never inspected in this handler | MATCH |
| Set by: console / config (no flags, no access tier) | pkg/qtv/cmd.go:36 (registration) | `cmd.Register("quit", quitCmd)` -- plain map registration; QTV has no per-command access tiers | MATCH |

## D20 split note

Kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`quitCmd`, `qtv.Stop()`, `cancelFunc`, `context.CancelFunc`, `os.Exit`, `multierror.Prefix`), and the context-cancellation mechanism. The user doc states only the admin-observable WHAT: it shuts the proxy down, and the no-arg vs any-arg distinction (immediate vs graceful). "Exit code 0" is a shell-observable detail kept in reasoning, not the user prose. No Default line beyond the documented no-arg behavior (already in the prose). No `See also:`.

## Rationale

Cold-synth from fully-legible use-sites. `quitCmd` (cmd.go:295-303) branches on argument COUNT: `if cmdArgs.Argc() > 1` (i.e. at least one argument after the command name) it returns `qtv.Stop()` (cmd.go:298); else (`os.Exit(0)`, cmd.go:300) it exits the process immediately.

The two paths are genuinely different shutdown mechanisms, and this is the load-bearing, counterintuitive point: the PRESENCE of any argument (not a specific keyword like "graceful") selects the graceful path. The branch at cmd.go:297 tests only `Argc() > 1`; the handler never inspects `cmdArgs.Argv(1)`, so the argument's actual value is irrelevant. `qtv.Stop()` (qtv.go:198-203) calls `qtv.cancelFunc()`, cancelling the QTV main `context` (the cancel func is wired from the main context at qtv.go:66, field declared qtv.go:47). Cancelling the context is the orderly-shutdown signal that the running goroutines observe (e.g. the `select { case <-ctx.Done(): }` loops elsewhere in qtv.go) and use to wind down, rather than the abrupt `os.Exit(0)` which terminates the process on the spot with no deferred cleanup.

The trailing source comment at cmd.go:296 ("Perform graceful quit if at least one argument provided") is coder-WHY and corroborates the behavior, but the citation is the enforcing branch at cmd.go:297, not the comment (B1: a clause must trace to the enforcing line, not a comment).

Set-by: registered in the plain `cmd.commands` map (cmd.go:36), no access flags; QTV has no per-command access tiers, so it is issued from the QTV console or a qtv.cfg.

Self-classification: TRACED-CLEAN -- both branches and the Stop() callee are enforce-traced; the "any argument" clause is traced to the COUNT-only gate, not inferred. No D6 reject-list term. No L3 breadcrumb (quit is a generic lifecycle primitive). `description_provenance` stays `null` (cold-synth).

## D6Record

```json
{
  "project": "qtv",
  "knob": "quit",
  "type": "command",
  "description": "Shuts down the QTV proxy. Run with no argument, it stops the process immediately. Run with any argument after it (the argument's value does not matter), it instead asks the proxy to shut down gracefully, letting the running parts wind down rather than exiting on the spot.\n\nquit = stop immediately.\nquit <anything> = stop gracefully.\n\nSet by: QTV console / qtv.cfg.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no user-doc comment at registration pkg/qtv/cmd.go:36 (cmd.Register(\"quit\", quitCmd)); the only comment cmd.go:296 ('Perform graceful quit if at least one argument provided') is coder-WHY corroboration, NOT the citation (B1: cite the enforcing branch, not the comment). Handler quitCmd cmd.go:295-303. Clauses->cites: shuts the proxy down -> both branches terminate/stop (os.Exit cmd.go:300 / qtv.Stop cmd.go:298); no-arg = immediate -> cmd.go:299-301 } else { os.Exit(0) } (os.Exit terminates at once, no deferred cleanup); ANY argument = graceful -> cmd.go:297-298 if cmdArgs.Argc() > 1 { return multierror.Prefix(qtv.Stop(), \"quit:\") } -- gate is arg COUNT>1, the handler never reads cmdArgs.Argv(1), so the argument value is irrelevant (load-bearing, counterintuitive: presence of any arg, not a keyword, selects graceful); graceful = orderly wind-down -> qtv.Stop() qtv.go:198-203 calls qtv.cancelFunc() which cancels the main context (cancelFunc wired from main ctx at qtv.go:66, field qtv.go:47), observed by the ctx.Done() select loops, vs the abrupt os.Exit. Set-by console/config -> plain map registration cmd.go:36, no access flags; QTV has no per-command access tiers. 'Exit code 0' is shell-observable detail kept in reasoning, not user prose. Every clause TRACED-CLEAN. No D6 reject-list term. provenance=null (cold-synth). No L3 breadcrumb (generic lifecycle primitive).",
  "description_proposed": null
}
```
