# Ledger -- qtv `dclose` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill (QTV half)
**Handler:** `dCloseCmd` (pkg/qtv/downstream_storage.go:222-230), registered pkg/qtv/downstream_storage.go:218
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.16-dev (pkg/qtv/qtv.go:29 `qtvRelease`)
**Confidence:** high

## Halt verdict

```
dclose: synthesized -- closes one DOWNSTREAM (viewer/relay) connection by its numeric id; Usage: dclose <id> -- ref=pkg/qtv/downstream_storage.go:222 -- self-class=TRACED-CLEAN
```

Downstream confirmation: `dCloseCmd` calls `qtv.dss.close(...)` -- `dss` is the `dStreamStorage` (downstream storage, the proxy's viewer/relay clients), NOT the upstream `uss`. Confirmed downstream.

## Final description (user-facing, D20 shape)

> Closes one downstream connection -- a viewer or relay currently connected to this proxy -- selected by its numeric id. Use dlist to see the current ids. If no connection has that id, it reports that no such id exists and closes nothing.
>
> dclose <id> = close the downstream connection whose id is <id>.
>
> Set by: proxy server console / qtv.cfg.

## Handler-trace table

| Aspect | Enforcing line | Snippet | Observable behavior |
|---|---|---|---|
| Registered name | downstream_storage.go:218 | `qtv.cmd.Register("dclose", dCloseCmd)` | console command `dclose` |
| Takes exactly one arg (the id); else usage error | downstream_storage.go:225-227 | `if cmdArgs.Argc() != 2 { return fmt.Errorf("Usage: %s <id>: close downstream connection\n", cmdArgs.Name()) }` | needs one id arg; otherwise prints usage |
| Acts on DOWNSTREAM storage | downstream_storage.go:229 | `return qtv.dss.close(cmdArgs.Argv(1))` | `dss` = `dStreamStorage` (downstream) |
| id is a base-10 unsigned integer | downstream.go:85-88 + upstream.go:543-549 | `isDsId` -> `isId` -> `strconv.ParseUint(server, 10, 32)` | numeric id; non-numeric -> parse error |
| Looks up the downstream by id and cancels it | downstream_storage.go:153-157 | `if id, err := isDsId(dsId); err == nil { if ds := dss.stream[id]; ds != nil { return ds.cancel() } }` | matching connection is canceled (closed) |
| No matching id -> "no such Id", nothing closed | downstream_storage.go:158 + upstream.go:31 | `return errNoSuchId` ; `errNoSuchId = errors.New("no such Id")` | unknown id closes nothing, reports no-such-id |

## D5 rubric check (Step 3)

Cold-synth: register site has no trailing comment and there is no shipped-doc candidate -> nothing to affirm; D5-amendment requires evaluation anyway. Handler is fully source-legible -> SYNTHESIZE. (1) States admin-observable WHAT (closes a viewer/relay connection by id); (2) not a name restatement (spells out downstream = viewer/relay, the id selector, the no-such-id outcome); (3) the one argument and its meaning are spelled in the usage line (`dclose <id>`); (4) mechanism only, no recommended use; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | Result |
|---|---|---|---|
| Semantic: closes one DOWNSTREAM connection (a viewer/relay connected to this proxy) | downstream_storage.go:229 -> downstream_storage.go:148-157 | `return qtv.dss.close(cmdArgs.Argv(1))` ; `func (dss *dStreamStorage) close(dsId string) ... if ds := dss.stream[id]; ds != nil { return ds.cancel() }` (`dss` is `*dStreamStorage`, the downstream container per the file's header comment "keep track of all downstreams") | MATCH |
| Argument: selected by its numeric id | downstream.go:86 -> upstream.go:544 | `id, err := isId(str)` ; `strconv.ParseUint(server, 10, 32)` (base-10 uint32) | MATCH |
| Usage form `dclose <id>` (exactly one arg) | downstream_storage.go:225-227 | `if cmdArgs.Argc() != 2 { return fmt.Errorf("Usage: %s <id>: close downstream connection\n", cmdArgs.Name()) }` | MATCH |
| Outcome: matching connection is closed (canceled) | downstream_storage.go:155-156 + downstream.go:96-104 | `return ds.cancel()` ; `func (ds *dStream) cancel() error { if !ds.canceled.CAS(false, true) { return nil } if ds.cancelFunc != nil { ds.cancelFunc() } ...` | MATCH |
| Outcome: no connection with that id -> reports no-such-id, closes nothing | downstream_storage.go:158 + upstream.go:31 | `return errNoSuchId` ; `errNoSuchId = errors.New("no such Id")` | MATCH |
| "use dlist to see the current ids" | downstream_storage.go:219 + :232-243 | `qtv.cmd.Register("dlist", dListCmd)` ; `dListCmd` prints id+name of each downstream | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of `description` per D20: every file:line cite, the C/Go identifiers (`dCloseCmd`, `dStreamStorage`, `dss`, `isDsId`, `isId`, `strconv.ParseUint`, `ds.cancel`, `errNoSuchId`), and the `cmdArgs.Argc()` gate mechanics. The user doc states only the admin-observable WHAT (closes a downstream viewer/relay by id), the usage form, the no-such-id outcome, and the dlist cross-reference. No Default line (no meaningful no-arg default; the no-arg form is a usage error). No See-also L3 (a same-codebase console operation; no cross-engine action-changing consequence).

## Rationale

`dCloseCmd` (downstream_storage.go:222-230) is the downstream-connection kill switch. It requires exactly one argument (the id) -- `Argc() != 2` returns the usage string `dclose <id>: close downstream connection` (:225-227). On a valid invocation it calls `qtv.dss.close(argv1)` (:229), and `dss` is the `dStreamStorage` -- the file's header comment (:17-19) reads "Accept incoming downstream connections, keep track of all downstreams, assign ids," and the QTV struct field is `dss *dStreamStorage // Downstream storage` (qtv.go:43). So this is unambiguously the DOWNSTREAM (viewer/relay client) side, distinct from the upstream `uss *uStreamStorage`. `dss.close` (:148-159) parses the id with `isDsId` -> `isId` -> `strconv.ParseUint(server, 10, 32)` (base-10 uint32; non-numeric fails parse), looks up `dss.stream[id]`, and on a hit calls `ds.cancel()` (which CAS-flags canceled and invokes the stream's `cancelFunc`, downstream.go:96-104, tearing the connection down). A miss (or parse failure) falls through to `return errNoSuchId` ("no such Id", upstream.go:31) -- nothing is closed. The dlist cross-reference is grounded in the sibling command `dListCmd` (:232-243) which prints each downstream's id, the natural way to discover the id to pass.

Access model: QTV has no rcon and no access tiers -- the only command surfaces are the proxy console and a qtv.cfg (commands are registered in a flat `map[string]cmdFunc` and dispatched by `execLine`, cmd.go:216-234, with no permission gate). So `Set by: proxy server console / qtv.cfg`. This matches the QWFWD-half precedent (no own rcon / console+config only).

D6 reject-list (SR-2): not applicable -- `dclose` is sourced strictly from the Go handler; none of `mvdport`/`admin_password`/`floodprot`/`allow_http` appears anywhere in `pkg/` (grep-confirmed NONE FOUND).

`description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30). No L3 breadcrumb (this is a local connection-management op, not one of the three SR-5 candidates). Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/call/compare; no clause rests on the command name, an enum/string, or a config comment.

## D6Record

```json
{
  "project": "qtv",
  "knob": "dclose",
  "type": "command",
  "description": "Closes one downstream connection -- a viewer or relay currently connected to this proxy -- selected by its numeric id. Use dlist to see the current ids. If no connection has that id, it reports that no such id exists and closes nothing.\n\ndclose <id> = close the downstream connection whose id is <id>.\n\nSet by: proxy server console / qtv.cfg.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "dCloseCmd (pkg/qtv/downstream_storage.go:222-230), registered :218. Cold-synth: no trailing comment at the register/handler site, no shipped-doc candidate -> nothing to affirm; handler fully source-legible so synthesize. DOWNSTREAM confirmation: handler calls qtv.dss.close (:229); dss is *dStreamStorage (QTV struct field qtv.go:43 'dss *dStreamStorage // Downstream storage'; file header comment downstream_storage.go:17-19 'keep track of all downstreams'), distinct from upstream uss. Clauses->cites: takes exactly one id arg else usage -> :225-227 (Argc()!=2 -> 'Usage: %s <id>: close downstream connection'); id is base-10 uint -> isDsId downstream.go:85-88 -> isId upstream.go:543-549 (strconv.ParseUint(server,10,32)); looks up by id and cancels -> dss.close :153-157 (dss.stream[id] -> ds.cancel()), ds.cancel downstream.go:96-104 (CAS canceled + cancelFunc tears down the connection); no matching id -> errNoSuchId :158 = errors.New('no such Id') upstream.go:31, nothing closed; 'use dlist' grounded in sibling dListCmd :232-243 which prints downstream ids. Access model: QTV has no rcon/no access tiers -- commands dispatched from a flat map with no permission gate (cmd.go:216-234), only surfaces are proxy console + qtv.cfg -> Set by console/config (matches QWFWD precedent). No Default line (no meaningful no-arg default; no-arg form is a usage error). D6 reject-list (SR-2) N/A: sourced from the Go handler; mvdport/admin_password/floodprot/allow_http absent from pkg/ (grep NONE FOUND). No See-also L3 (local console op, no cross-engine action-changing consequence); no SR-5 breadcrumb. provenance=null (cold-synth, operator 2026-05-30). Grading: synthesized, high confidence, every clause TRACED-CLEAN.",
  "description_proposed": null
}
```
