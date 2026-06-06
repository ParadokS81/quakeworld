# Ledger -- qtv `list` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill (QTV half)
**Handler:** `listCmd` (pkg/qtv/upstream_storage.go:440-451), registered pkg/qtv/upstream_storage.go:141
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.16-dev
**Confidence:** high

## Halt verdict

```
list: synthesized -- takes no arguments; prints the active upstream connections (proxy-to-source streams) as an id + name table, sorted by id, with a total count -- ref=pkg/qtv/upstream_storage.go:440 -- self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Prints the proxy's currently active upstream connections -- the source streams it is pulling from (game servers it has connected to, or demo files it is replaying). Each entry is shown as a numeric stream id and its name, sorted by id, followed by a total count. The stream id shown here is what the close command takes to drop a connection.
>
> list = print the active upstream connections.
>
> Set by: proxy console / config.

## Read use-sites / handler-trace (WI-1 wide read)

Tree-wide grep (`listCmd`, `uss.list(`, `uStreamListInfo`) confirms the handler is `listCmd` and the data source is `uStreamStorage.list()`; no other use-site.

| Site | file:line | Observable admin-facing behavior |
|---|---|---|
| Register | pkg/qtv/upstream_storage.go:141 | `qtv.cmd.Register("list", listCmd)` -- name `list` -> handler `listCmd` |
| Handler | pkg/qtv/upstream_storage.go:440-451 | takes no args; calls `uss.list()`, sorts by id, prints header + each `id name` row + a `N stream(s)` total |
| Data source | pkg/qtv/upstream_storage.go:343-357 | `uStreamStorage.list()` walks the live `uss.stream` map, returns `{id, name}` per upstream |
| What an upstream is | pkg/qtv/upstream_storage.go:158, :19-21 | an upstream = a connection the storage allocates and tracks (a proxy-to-source stream); file header comment "Allocate upstream connections, keep track of all upstreams, assign ids" |

## D5 rubric check (Step 3)

Cold-synth: register site has no trailing comment, no shipped-doc candidate -> nothing to affirm; D5 amendment requires evaluation anyway. Handler fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (it prints the live upstream connections as id+name+count); (2) not a name restatement ("list" alone says nothing about WHAT is listed -- the prose names it: active upstream/source streams, with the id-to-close linkage); (3) no enum/units (a no-arg report command); (4) mechanism only, no opinion; (5) self-contained. All hold.

## Per-clause enforce-trace table (B1)

All sites in pkg/qtv/upstream_storage.go at anchor 1.16-dev.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Takes no arguments | pkg/qtv/upstream_storage.go:440-441 | `func listCmd(qtv *QTV, cmdArgs *qCmdArgs) error { infos := qtv.uss.list()` -- no `Argc()` check, no `Argv` read; args are ignored | MATCH |
| Prints the active upstream connections (source streams the proxy pulls from) | pkg/qtv/upstream_storage.go:441 + :343-357 | `infos := qtv.uss.list()`; `list()` ranges `for name, us := range uss.stream` building `{id, name}` per live upstream | MATCH |
| Upstream = proxy-to-source stream (connected game server or replayed demo) | pkg/qtv/upstream_storage.go:19-21, :414, :426 | header comment "Allocate upstream connections, keep track of all upstreams"; sources are opened as `"tcp:"+addr` (qtvCmd :414) or `"file:"+name` (playDemoCmd :426) | MATCH |
| Each entry = numeric id + name | pkg/qtv/upstream_storage.go:444-447 | `fmt.Println(" #id", "name")` then `fmt.Printf("%4v %v\n", info.id, info.name)` | MATCH |
| Sorted by id | pkg/qtv/upstream_storage.go:442 | `sort.Slice(infos, func(i, j int) bool { return infos[i].id < infos[j].id })` | MATCH |
| Followed by a total count | pkg/qtv/upstream_storage.go:448-449 | `fmt.Println("--------------------------------"); fmt.Printf("%4v stream(s)\n", len(infos))` | MATCH |
| The id shown is what `close` takes | pkg/qtv/upstream_storage.go:430-437 + :283-294 | `closeCmd` -> `uss.close(cmdArgs.Argv(1))`; `close` does `isUsId(usId)` then `getStreamById(id)` -- the same `us.id` `list` prints | MATCH |
| Set by: console / config | pkg/qtv/cmd.go:412-414 (console), pkg/qtv/qtv.go:90 + pkg/qtv/cmd.go:328 (config exec) | console channel `case s := <-qtv.console: qtv.cmd.Prepend(s)`; config via `exec qtv` -> `qtv.cmd.Prepend(string(data))` | MATCH |

## D20 split note

Routed to reasoning, kept OUT of `description`: every file:line, the Go identifiers (`listCmd`, `uStreamStorage.list`, `uss.stream` map, `uStreamListInfo`, `qCmdArgs`), the sort predicate, the `fmt.Printf` format strings, and the console/`exec` plumbing. The user doc states only the admin-observable WHAT (prints active upstreams as id+name+count, sorted by id, id feeds `close`) and Set-by.

## Rationale

Cold-synth from a fully-legible handler. `listCmd` (upstream_storage.go:440-451) ignores its arguments, pulls the live set of upstream streams from `uStreamStorage.list()` (:343-357, which ranges the `uss.stream` map), sorts them by id ascending (:442), prints a `#id name` header and one `id name` row per stream (:444-447), then a separator and a `N stream(s)` total (:448-449). An "upstream" is the proxy's connection to a source it pulls MVD data from -- a game server (opened `tcp:` by the `qtv` command, :414) or a demo file (opened `file:` by `playdemo`, :426); the file header comment (:19-21) frames the storage as the owner of these connections and their ids. The numeric id `list` prints is the same `us.id` the `close` command resolves via `isUsId`/`getStreamById` (:289-291), so the two commands compose (stated as an admin-observable linkage). No Default line (a no-arg report command; the no-arg form IS the only form). Set-by: QTV commands are issued from the proxy console (stdin channel, qtv.go:412-414) or a config file run via `exec` (qtv.go:90 `exec qtv` -> cmd.go:328 prepend); there are no access tiers and no rcon in Go QTV. D6 reject-list (mvdport/admin_password/floodprot/allow_http) not implicated -- this command touches none of them. Self-classification: TRACED-CLEAN -- every clause maps to an enforcing print/sort/range/dispatch line; no clause rests on the command name.

## D6Record

```json
{
  "project": "qtv",
  "knob": "list",
  "type": "command",
  "description": "Prints the proxy's currently active upstream connections -- the source streams it is pulling from (game servers it has connected to, or demo files it is replaying). Each entry is shown as a numeric stream id and its name, sorted by id, followed by a total count. The stream id shown here is what the close command takes to drop a connection.\n\nlist = print the active upstream connections.\n\nSet by: proxy console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth from handler listCmd (pkg/qtv/upstream_storage.go:440-451), registered pkg/qtv/upstream_storage.go:141 (qtv.cmd.Register(\"list\", listCmd)); no trailing comment, no shipped-doc candidate -> synthesize. Tree-wide grep (listCmd / uss.list( / uStreamListInfo) confirms one handler, data from uStreamStorage.list(). Clauses->cites: takes no args -> :440-441 (no Argc/Argv read, args ignored); prints active upstreams -> :441 infos := qtv.uss.list() feeding :343-357 list() which ranges `for name, us := range uss.stream`; an upstream is a proxy-to-source stream (connected game server or replayed demo) -> file header :19-21 'Allocate upstream connections, keep track of all upstreams', sources opened tcp: (qtvCmd :414) / file: (playDemoCmd :426); each entry id+name -> :444-447 fmt.Println(\" #id\",\"name\") + fmt.Printf(\"%4v %v\\n\", info.id, info.name); sorted by id -> :442 sort.Slice ... infos[i].id < infos[j].id; total count -> :448-449 fmt.Printf(\"%4v stream(s)\\n\", len(infos)); the printed id feeds close -> closeCmd :430-437 -> uss.close(Argv(1)) -> isUsId + getStreamById (:283-294) resolves the same us.id. No Default (no-arg report command). Set-by console/config -> console channel qtv.go:412-414 (case s := <-qtv.console: qtv.cmd.Prepend(s)) + config exec qtv.go:90 'exec qtv' -> cmd.go:328 qtv.cmd.Prepend(string(data)); no access tiers, no rcon in Go QTV. D6 reject-list (mvdport/admin_password/floodprot/allow_http) not implicated. Grading: synthesized, high confidence, every clause TRACED-CLEAN; no clause rests on the command name. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
