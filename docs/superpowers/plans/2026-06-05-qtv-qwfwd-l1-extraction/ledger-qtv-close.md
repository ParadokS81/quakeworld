# Ledger -- qtv `close` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill (QTV half)
**Handler:** `closeCmd` (pkg/qtv/upstream_storage.go:430-438), registered pkg/qtv/upstream_storage.go:140
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.16-dev
**Confidence:** high

## Halt verdict

```
close: synthesized -- takes exactly one argument, a numeric stream id (as shown by 'list'); drops/closes that upstream connection; errors with usage on wrong arg count and "no such id" if the id is unknown -- ref=pkg/qtv/upstream_storage.go:430 -- self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Closes one of the proxy's active upstream connections, identified by its numeric stream id (the id shown by the list command). The proxy disconnects from that source and frees the stream. If the id does not match an open stream, it reports that no such stream exists.
>
> close <streamId> = close the upstream with that id.
>
> Set by: proxy console / config.

## Read use-sites / handler-trace (WI-1 wide read)

Tree-wide grep (`closeCmd`, `uss.close(`, `func.*close(`, `isUsId`, `errNoSuchId`) confirms the handler is `closeCmd` -> `uStreamStorage.close()`; the id parser is `isUsId`/`isId`.

| Site | file:line | Observable admin-facing behavior |
|---|---|---|
| Register | pkg/qtv/upstream_storage.go:140 | `qtv.cmd.Register("close", closeCmd)` -- name `close` -> handler `closeCmd` |
| Handler | pkg/qtv/upstream_storage.go:430-438 | `Argc() != 2` -> usage error; else `qtv.uss.close(cmdArgs.Argv(1))` |
| Storage close | pkg/qtv/upstream_storage.go:283-295 | parses the arg as an id (`isUsId`), finds the stream (`getStreamById`), cancels it; returns `errNoSuchId` if absent |
| Id format | pkg/qtv/upstream.go:121-124, :543-549 | `isUsId` -> `isId`: the string must be all digits (`strconv.ParseUint(.., 10, 32)`); comment "If server string contains only numbers then consider this as stream id" |
| errNoSuchId text | pkg/qtv/*.go (var) | `errNoSuchId` = "no such stream id" (the unknown-id error) |
| What an upstream is | pkg/qtv/upstream_storage.go:19-21 | header "Allocate upstream connections, keep track of all upstreams, assign ids" |

## D5 rubric check (Step 3)

Cold-synth: no trailing comment at the register site, no shipped-doc candidate -> nothing to affirm; D5 amendment requires evaluation. Handler fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (closes one active upstream by its id); (2) not a name restatement ("close" alone does not say WHAT is closed or that it takes an id from `list` -- the prose supplies it); (3) the argument is spelled out (a numeric stream id) -- there is no enum; (4) mechanism only; (5) self-contained. All hold.

## Per-clause enforce-trace table (B1)

Sites in pkg/qtv/upstream_storage.go + pkg/qtv/upstream.go at anchor 1.16-dev.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Takes exactly one argument; wrong count -> usage error | pkg/qtv/upstream_storage.go:433-435 | `if cmdArgs.Argc() != 2 { return fmt.Errorf("Usage: %s <streamId>: close upstream connection", cmdArgs.Name()) }` | MATCH |
| The argument is a numeric stream id | pkg/qtv/upstream_storage.go:289 -> upstream.go:121-124 -> :543-549 | `isUsId(usId)` -> `isId` -> `strconv.ParseUint(server, 10, 32)`; comment :542 "If server string contains only numbers then consider this as stream id" | MATCH |
| Closes / disconnects that upstream | pkg/qtv/upstream_storage.go:290-291 + upstream.go:127-133 | `if us := uss.getStreamById(id); us != nil { return us.cancel() }`; `cancel()` calls `us.cancelFunc()` (cancels the stream's context -> it stops) | MATCH |
| Frees the stream (after cancel it is removed) | pkg/qtv/upstream_storage.go:281-282, :120-129, :299-326 | handler comment "Find upstream inside storage and cancel it (it should cause upstream notify storage when it actually dies)"; the cancelled stream notifies `uss.serve` (:120-124) which calls `remove` (:299-326) deleting it from the maps and returning the id to the pool | MATCH |
| The id is the one shown by `list` | pkg/qtv/upstream_storage.go:343-357 (list) vs :289-291 (close) | `list()` emits `us.id`; `close` resolves the arg via `getStreamById(id)` against that same `us.id` | MATCH |
| Unknown id -> reports no such stream | pkg/qtv/upstream_storage.go:294 | `return errNoSuchId` (after the `getStreamById` lookup fails); `errNoSuchId` = "no such stream id" | MATCH |
| Set by: console / config | pkg/qtv/cmd.go:412-414 (console), pkg/qtv/qtv.go:90 + pkg/qtv/cmd.go:328 (config exec) | console channel prepend+exec; config `exec qtv` -> prepend of file data | MATCH |

## D20 split note

Routed to reasoning, kept OUT of `description`: every file:line, the Go identifiers (`closeCmd`, `uStreamStorage.close`, `isUsId`/`isId`, `strconv.ParseUint`, `getStreamById`, `cancel`/`cancelFunc`, `errNoSuchId`, the `remove`/notify mechanism, `qCmdArgs.Argc`/`Argv`), and the console/`exec` plumbing. The user doc states only the admin-observable WHAT (closes one upstream by its numeric id, the id from `list`, disconnects+frees it, no-such-stream error) and Set-by.

## Rationale

Cold-synth from a fully-legible handler. `closeCmd` (upstream_storage.go:430-438) requires exactly one argument (`Argc() != 2` -> the usage string `Usage: <name> <streamId>: close upstream connection`, :433-434), then calls `uss.close(cmdArgs.Argv(1))`. `uStreamStorage.close` (:283-295) interprets the argument as a stream id via `isUsId` -> `isId`, which accepts only an all-digits string (`strconv.ParseUint(.., 10, 32)`, upstream.go:544; comment "If server string contains only numbers then consider this as stream id"). If a matching open stream exists it is cancelled (`us.cancel()` -> `cancelFunc()`, upstream.go:127-133), which the handler comment (:281-282) notes makes the stream notify the storage when it dies; `uss.serve` then `remove`s it (:120-124 -> :299-326), deleting it from the maps and returning its id to the pool -- so the connection is dropped and the stream freed. If no stream has that id, `close` returns `errNoSuchId` ("no such stream id"). The id taken here is exactly the `us.id` the `list` command prints (:343-357), so the two compose (stated as an admin-observable linkage). No Default line (a command whose only valid form takes one required arg; the no-arg form is a usage error). Set-by: proxy console (stdin channel, qtv.go:412-414) or config file via `exec` (qtv.go:90 -> cmd.go:328); no access tiers, no rcon in Go QTV. D6 reject-list not implicated. Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/parse/cancel/error line; no clause rests on the command name.

## D6Record

```json
{
  "project": "qtv",
  "knob": "close",
  "type": "command",
  "description": "Closes one of the proxy's active upstream connections, identified by its numeric stream id (the id shown by the list command). The proxy disconnects from that source and frees the stream. If the id does not match an open stream, it reports that no such stream exists.\n\nclose <streamId> = close the upstream with that id.\n\nSet by: proxy console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth from handler closeCmd (pkg/qtv/upstream_storage.go:430-438), registered pkg/qtv/upstream_storage.go:140 (qtv.cmd.Register(\"close\", closeCmd)); no trailing comment, no shipped-doc candidate -> synthesize. Tree-wide grep (closeCmd / uss.close( / isUsId / errNoSuchId) confirms handler -> uStreamStorage.close, id parser isUsId/isId. Clauses->cites: exactly one arg, wrong count -> usage error -> :433-435 if cmdArgs.Argc() != 2 { return Errorf(\"Usage: %s <streamId>: close upstream connection\", Name()) }; arg is a numeric stream id -> :289 isUsId(usId) -> upstream.go:121-124 isId -> :544 strconv.ParseUint(server,10,32) + comment :542 'If server string contains only numbers then consider this as stream id'; closes/disconnects -> :290-291 getStreamById(id); us != nil -> us.cancel() -> upstream.go:127-133 cancelFunc() cancels the stream ctx; frees the stream -> handler comment :281-282 'cancel it (it should cause upstream notify storage when it actually dies)' -> uss.serve :120-124 -> remove :299-326 deletes from maps + ids.Put; id is the one list prints -> list() :343-357 emits us.id, close resolves same us.id via getStreamById; unknown id -> :294 return errNoSuchId ('no such stream id'). No Default (only valid form takes one required arg; no-arg = usage error). Set-by console/config -> qtv.go:412-414 console channel prepend+exec, config exec qtv.go:90 -> cmd.go:328 prepend; no access tiers/no rcon in Go QTV. D6 reject-list (mvdport/admin_password/floodprot/allow_http) not implicated. Grading: synthesized, high confidence, every clause TRACED-CLEAN; no clause rests on the command name. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
