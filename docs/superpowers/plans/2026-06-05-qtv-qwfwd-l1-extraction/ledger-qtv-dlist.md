# Ledger -- qtv `dlist` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill (QTV half)
**Handler:** `dListCmd` (pkg/qtv/downstream_storage.go:232-243), registered pkg/qtv/downstream_storage.go:219
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.16-dev (pkg/qtv/qtv.go:29 `qtvRelease`)
**Confidence:** high

## Halt verdict

```
dlist: synthesized -- lists all DOWNSTREAM (viewer/relay) connections: id + player name, sorted by id, plus a total count; Usage: dlist (no args) -- ref=pkg/qtv/downstream_storage.go:232 -- self-class=TRACED-CLEAN
```

Downstream confirmation: `dListCmd` calls `qtv.dss.list()` -- `dss` is the `dStreamStorage` (downstream storage, the proxy's viewer/relay clients), NOT the upstream `uss`. Confirmed downstream.

## Final description (user-facing, D20 shape)

> Lists the downstream connections -- the viewers and relays currently connected to this proxy. Each line shows the connection's numeric id and its name; the list is ordered by id, and a total connection count is printed at the end. The id shown here is what dclose takes to close a connection.
>
> dlist = list the current downstream connections.
>
> Set by: proxy server console / qtv.cfg.

## Handler-trace table

| Aspect | Enforcing line | Snippet | Observable behavior |
|---|---|---|---|
| Registered name | downstream_storage.go:219 | `qtv.cmd.Register("dlist", dListCmd)` | console command `dlist` |
| Takes no argument | downstream_storage.go:232-233 | `func dListCmd(qtv *QTV, cmdArgs *qCmdArgs) error { infos := qtv.dss.list()` | reads args nowhere; no-arg command |
| Acts on DOWNSTREAM storage | downstream_storage.go:233 | `infos := qtv.dss.list()` | `dss` = `dStreamStorage` (downstream) |
| Each entry is id + name | downstream_storage.go:183-196 | `info := &dStreamListInfo{ id: ds.id, name: ds.name() }` | per-connection id + name |
| name = the connection's userinfo "name" | downstream.go:204-206 | `func (ds *dStream) name() string { return ds.userInfo.Get("name") }` | the player/viewer name |
| Sorted by id ascending | downstream_storage.go:234 | `sort.Slice(infos, func(i, j int) bool { return infos[i].id < infos[j].id })` | rows ordered by id |
| Header + per-row print + total count | downstream_storage.go:235-241 | `fmt.Println("downstream list:")` ... `fmt.Printf("%4v %v\n", info.id, info.name)` ... `fmt.Printf("%4v stream(s)\n", len(infos))` | "downstream list:" header, id/name rows, "N stream(s)" total |

## D5 rubric check (Step 3)

Cold-synth: register/handler site has no trailing comment and there is no shipped-doc candidate -> nothing to affirm; D5-amendment requires evaluation anyway. Handler is fully source-legible -> SYNTHESIZE. (1) States admin-observable WHAT (lists viewer/relay connections with id + name + count); (2) not a name restatement (spells out downstream = viewers/relays, the id+name columns, the count, the dclose link); (3) takes no argument and that is stated; the output fields are spelled out; (4) mechanism only, no opinion; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | Result |
|---|---|---|---|
| Semantic: lists DOWNSTREAM connections (viewers/relays connected to this proxy) | downstream_storage.go:233 -> :183-196 | `infos := qtv.dss.list()` ; `func (dss *dStreamStorage) list() (list []*dStreamListInfo) { ... for _, ds := range dss.stream { ... } }` (`dss` is `*dStreamStorage`, the downstream container per file header :17-19) | MATCH |
| Each line shows the connection id | downstream_storage.go:190-192 + :238 | `info := &dStreamListInfo{ id: ds.id, ... }` ; `fmt.Printf("%4v %v\n", info.id, info.name)` | MATCH |
| ... and its name | downstream_storage.go:192 + downstream.go:204-206 | `name: ds.name()` ; `func (ds *dStream) name() string { return ds.userInfo.Get("name") }` | MATCH |
| Ordered by id (ascending) | downstream_storage.go:234 | `sort.Slice(infos, func(i, j int) bool { return infos[i].id < infos[j].id })` | MATCH |
| Total connection count printed at the end | downstream_storage.go:241 | `fmt.Printf("%4v stream(s)\n", len(infos))` | MATCH |
| Takes no argument | downstream_storage.go:232-243 | handler never reads `cmdArgs.Argv`/`Argc` -- args ignored entirely | MATCH |
| The id is what `dclose` takes | downstream_storage.go:218 + :225-229 | `qtv.cmd.Register("dclose", dCloseCmd)` ; `dCloseCmd` takes `<id>` and calls `dss.close(argv1)` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of `description` per D20: every file:line cite, the Go identifiers (`dListCmd`, `dStreamStorage`, `dss`, `dStreamListInfo`, `ds.name`, `ds.userInfo.Get`, `sort.Slice`, `fmt.Printf`), the `%4v stream(s)` format string, and the "stream(s)" internal wording. The user doc states only the admin-observable WHAT (lists viewer/relay connections with id + name + a count), the ordering, and the dclose cross-reference. No Default line (no-arg listing command). No See-also L3 (a same-codebase console listing; no cross-engine action-changing consequence).

## Rationale

`dListCmd` (downstream_storage.go:232-243) is the downstream-connection roster. It takes no argument (the handler never touches `cmdArgs`). It calls `qtv.dss.list()` (:233), and `dss` is the `dStreamStorage` -- the file header comment (:17-19) "keep track of all downstreams" and the QTV struct field `dss *dStreamStorage // Downstream storage` (qtv.go:43) make this the DOWNSTREAM (viewer/relay) side, distinct from upstream `uss`. `dss.list()` (:183-196) snapshots each live `dStream` into a `dStreamListInfo{id, name}` (the in-code comment :188-189 notes id and name are the only race-safe fields to read), where `name` is the connection's userinfo "name" (`ds.name()` -> `ds.userInfo.Get("name")`, downstream.go:204-206). The handler sorts the slice by id ascending (:234), prints the header "downstream list:" and a "#id name" column header (:235-236), one `%4v %v` row per connection (:238), a separator, and finally the count `%4v stream(s)` (:241). The dclose cross-reference is grounded in the sibling `dCloseCmd` (:222-230), which consumes exactly the id this list prints.

Access model: QTV has no rcon and no access tiers -- commands are registered in a flat `map[string]cmdFunc` and dispatched by `execLine` (cmd.go:216-234) with no permission gate; the only command surfaces are the proxy console and a qtv.cfg. So `Set by: proxy server console / qtv.cfg` (matches the QWFWD-half precedent).

D6 reject-list (SR-2): not applicable -- `dlist` is sourced strictly from the Go handler; none of the four C-only knobs appears in `pkg/` (grep-confirmed NONE FOUND).

`description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30). No L3 breadcrumb (local connection-listing op, not an SR-5 candidate). Self-classification: TRACED-CLEAN -- every clause maps to an enforcing assignment/sort/print line; no clause rests on the command name, an enum/string, or a config comment.

## D6Record

```json
{
  "project": "qtv",
  "knob": "dlist",
  "type": "command",
  "description": "Lists the downstream connections -- the viewers and relays currently connected to this proxy. Each line shows the connection's numeric id and its name; the list is ordered by id, and a total connection count is printed at the end. The id shown here is what dclose takes to close a connection.\n\ndlist = list the current downstream connections.\n\nSet by: proxy server console / qtv.cfg.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "dListCmd (pkg/qtv/downstream_storage.go:232-243), registered :219. Cold-synth: no trailing comment at the register/handler site, no shipped-doc candidate -> nothing to affirm; handler fully source-legible so synthesize. DOWNSTREAM confirmation: handler calls qtv.dss.list() (:233); dss is *dStreamStorage (QTV struct field qtv.go:43 'dss *dStreamStorage // Downstream storage'; file header downstream_storage.go:17-19 'keep track of all downstreams'), distinct from upstream uss. Clauses->cites: lists downstream connections -> dss.list() :183-196 (iterates dss.stream into dStreamListInfo{id,name}); each line id+name -> :190-192 (id: ds.id, name: ds.name()) printed :238 (fmt.Printf('%4v %v', info.id, info.name)); name = userinfo 'name' -> ds.name() downstream.go:204-206 (ds.userInfo.Get('name')); ordered by id -> :234 (sort.Slice infos[i].id < infos[j].id); total count at end -> :241 (fmt.Printf('%4v stream(s)', len(infos))); takes no arg -> handler never reads cmdArgs.Argv/Argc; id is what dclose takes -> sibling dCloseCmd :222-230 consumes <id> via dss.close. Access model: QTV has no rcon/no access tiers -- flat command map, no permission gate (cmd.go:216-234), surfaces are proxy console + qtv.cfg -> Set by console/config (matches QWFWD precedent). No Default line (no-arg listing command). D6 reject-list (SR-2) N/A: sourced from Go handler; mvdport/admin_password/floodprot/allow_http absent from pkg/ (grep NONE FOUND). No See-also L3 (local console listing, no cross-engine action-changing consequence); no SR-5 breadcrumb. provenance=null (cold-synth, operator 2026-05-30). Grading: synthesized, high confidence, every clause TRACED-CLEAN.",
  "description_proposed": null
}
```
