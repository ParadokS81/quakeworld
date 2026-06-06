# Ledger -- qtv `playdemo` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill (QTV half)
**Handler:** `playDemoCmd` (pkg/qtv/upstream_storage.go:418-428), registered pkg/qtv/upstream_storage.go:139
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.16-dev
**Confidence:** high

## Halt verdict

```
playdemo: synthesized -- takes one argument, an .mvd demo filename; opens that demo file as an upstream stream so the proxy replays it to downstream viewers just like a live source; usage error if no filename -- ref=pkg/qtv/upstream_storage.go:418 -- self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Opens a recorded MVD demo file as an upstream source, so the proxy replays it to connected viewers exactly as if it were streaming a live game. The demo then appears as an active stream (visible in the list command and closable with close). Takes the demo filename as its argument.
>
> playdemo <demo.mvd> = replay that demo file as a stream.
>
> Set by: proxy console / config.

## Read use-sites / handler-trace (WI-1 wide read)

Tree-wide grep (`playDemoCmd`, `"file:"`, `openAndRun`, `protocolFromServerStr`) confirms the handler is `playDemoCmd`; it opens the source with a `file:` protocol prefix (vs the `tcp:` prefix the `qtv` command uses for live servers).

| Site | file:line | Observable admin-facing behavior |
|---|---|---|
| Register | pkg/qtv/upstream_storage.go:139 | `qtv.cmd.Register("playdemo", playDemoCmd)` -- name `playdemo` -> handler `playDemoCmd` |
| Handler | pkg/qtv/upstream_storage.go:418-428 | `Argc() < 2` -> usage error; else `qtv.uss.openAndRun("file:"+cmdArgs.Argv(1), true, options)` with empty options |
| Open path | pkg/qtv/upstream_storage.go:232-248, :158-229 | `openAndRun` -> `open` allocates a new upstream stream + `run()`s it (the same path the live `qtv` command uses) |
| Protocol = file | pkg/qtv/upstream.go:551-559 | `protocolFromServerStr`: a `file:` prefix selects the demo-file source type (vs `tcp:` for a live server) |
| Replays like a live source | pkg/qtv/upstream_storage.go:343-357 (list), :283-295 (close) | the opened demo becomes an entry in `uss.stream` -- it lists and closes identically to a live upstream |

## D5 rubric check (Step 3)

Cold-synth: no trailing comment at the register site, no shipped-doc candidate -> nothing to affirm; D5 amendment requires evaluation. Handler fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (replays an MVD demo file as an upstream stream to viewers); (2) not a name restatement ("playdemo" does not say it becomes a proxy upstream that viewers watch, nor that it lists/closes like a live source -- the prose supplies that); (3) the argument is spelled out (an .mvd demo filename); (4) mechanism only; (5) self-contained. All hold.

## Per-clause enforce-trace table (B1)

Sites in pkg/qtv/upstream_storage.go + pkg/qtv/upstream.go at anchor 1.16-dev.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Takes one argument (a demo filename); none -> usage error | pkg/qtv/upstream_storage.go:421-423 | `if cmdArgs.Argc() < 2 { return fmt.Errorf("Usage: %s demo.mvd: open demo file as upstream", cmdArgs.Name()) }` | MATCH |
| Opens the demo FILE as the source (file:, not a live server) | pkg/qtv/upstream_storage.go:426 + upstream.go:551-557 | `qtv.uss.openAndRun("file:"+cmdArgs.Argv(1), true, options)`; `protocolFromServerStr` maps a `file:` prefix to the file source type | MATCH |
| Opened as an upstream stream (same open path as a live source) | pkg/qtv/upstream_storage.go:426 -> :232-248 -> :158-229 | `openAndRun` -> `open` creates a `newUStream` and `run()`s it -- identical allocation path to the `qtv` (tcp) command at :414 | MATCH |
| The demo becomes an active stream (shows in `list`, closable by `close`) | pkg/qtv/upstream_storage.go:223-224 (insert) + :343-357 (list) + :283-295 (close) | `open` inserts into `uss.stream[ussName] = us` / `uss.streamById[us.id] = us`; `list()` ranges that map; `close` resolves an id from it -- a demo upstream is indistinguishable to those commands | MATCH |
| No password/delay/address options (empty options) | pkg/qtv/upstream_storage.go:425 | `options := uStreamOptions{}` -- left zero; `playDemoCmd` does not call `parseOptions` | MATCH |
| Set by: console / config | pkg/qtv/cmd.go:412-414 (console), pkg/qtv/qtv.go:90 + pkg/qtv/cmd.go:328 (config exec) | console channel prepend+exec; config `exec qtv` -> prepend of file data | MATCH |

## D20 split note

Routed to reasoning, kept OUT of `description`: every file:line, the Go identifiers (`playDemoCmd`, `openAndRun`/`open`/`newUStream`/`run`, `protocolFromServerStr`, the `"file:"` prefix vs `"tcp:"`, `uStreamOptions`, the `uss.stream`/`streamById` maps, `qCmdArgs`), and the console/`exec` plumbing. The user doc states only the admin-observable WHAT (replays an MVD demo as an upstream to viewers; shows in `list`, closable by `close`; takes a demo filename) and Set-by. The exact on-disk lookup directory for the demo file is resolved deeper in the file source's Open path (not in this handler) and is not asserted in the user doc beyond "the demo filename".

## Rationale

Cold-synth from a fully-legible handler. `playDemoCmd` (upstream_storage.go:418-428) requires at least one argument (`Argc() < 2` -> usage string `Usage: <name> demo.mvd: open demo file as upstream`, :421-422). It then opens the source as `"file:"+cmdArgs.Argv(1)` via `uss.openAndRun` (:426) with empty options (`uStreamOptions{}`, :425 -- so no upstream password / delay / advertised address). The `file:` prefix selects the demo-file source type in `protocolFromServerStr` (upstream.go:551-557), in contrast to the `tcp:` prefix the live `qtv` command uses (:414). `openAndRun` -> `open` allocates a `newUStream` and `run()`s it (:232-248, :158-229) -- the identical upstream-allocation path a live source takes -- and inserts it into the `uss.stream` / `streamById` maps (:223-224). Because the demo is now an ordinary upstream, it appears in `list` (:343-357) and is closable by `close` (:283-295) exactly like a live game source. Functionally this lets the proxy serve a recorded demo to downstream viewers as though it were live. No Default line (the only valid form takes one required filename; no-arg is a usage error). Set-by: proxy console (stdin channel, qtv.go:412-414) or config file via `exec` (qtv.go:90 -> cmd.go:328); no access tiers, no rcon in Go QTV. D6 reject-list not implicated. Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/open/insert line; no clause rests on the command name.

## D6Record

```json
{
  "project": "qtv",
  "knob": "playdemo",
  "type": "command",
  "description": "Opens a recorded MVD demo file as an upstream source, so the proxy replays it to connected viewers exactly as if it were streaming a live game. The demo then appears as an active stream (visible in the list command and closable with close). Takes the demo filename as its argument.\n\nplaydemo <demo.mvd> = replay that demo file as a stream.\n\nSet by: proxy console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth from handler playDemoCmd (pkg/qtv/upstream_storage.go:418-428), registered pkg/qtv/upstream_storage.go:139 (qtv.cmd.Register(\"playdemo\", playDemoCmd)); no trailing comment, no shipped-doc candidate -> synthesize. Tree-wide grep (playDemoCmd / \"file:\" / openAndRun / protocolFromServerStr) confirms handler opens the source with a file: prefix vs tcp: for live servers. Clauses->cites: one arg (filename), none -> usage error -> :421-423 if cmdArgs.Argc() < 2 { return Errorf(\"Usage: %s demo.mvd: open demo file as upstream\", Name()) }; opens the demo FILE as source (file:, not live) -> :426 qtv.uss.openAndRun(\"file:\"+cmdArgs.Argv(1), true, options) + protocolFromServerStr upstream.go:551-557 maps file: prefix to file source type (tcp: at :553); opened as an upstream via the same open path -> :426 openAndRun -> :232-248 -> open :158-229 newUStream + run(), identical path to qtv (tcp) command :414; demo becomes an active stream (list/close) -> open inserts uss.stream[ussName]=us + streamById[us.id]=us (:223-224), list() ranges that map (:343-357), close resolves id from it (:283-295); empty options (no password/delay/address) -> :425 options := uStreamOptions{} (playDemoCmd does not call parseOptions). No Default (only valid form takes one required filename; no-arg = usage error). Set-by console/config -> qtv.go:412-414 console channel prepend+exec, config exec qtv.go:90 -> cmd.go:328 prepend; no access tiers/no rcon in Go QTV. The on-disk demo lookup directory is resolved in the file source's Open path (not this handler) -> not asserted in the user doc beyond the filename. D6 reject-list (mvdport/admin_password/floodprot/allow_http) not implicated. Grading: synthesized, high confidence, every clause TRACED-CLEAN; no clause rests on the command name. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
