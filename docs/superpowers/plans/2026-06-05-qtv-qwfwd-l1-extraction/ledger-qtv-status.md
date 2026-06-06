# Ledger -- qtv `status` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill (QTV half)
**Handler:** `statusCmd` (pkg/qtv/qtv.go:449-462), registered pkg/qtv/qtv.go:446
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.16-dev (pkg/qtv/qtv.go:29 `qtvRelease`)
**Confidence:** high

## Halt verdict

```
status: synthesized -- prints a one-shot proxy status: connected servers (upstream) and clients (downstream) each as current/max, plus hostname, listen address, whether HTTP is enabled, and (if HTTP on) whether HTTP upload is enabled; Usage: status (no args) -- ref=pkg/qtv/qtv.go:449 -- self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Prints a snapshot of the proxy's current state. It reports how many servers it is pulling from (its upstream connections) and how many clients are watching through it (its downstream connections), each shown as the current count out of the configured maximum. It then lists the proxy's hostname, the address it listens on, whether its web (HTTP) interface is on, and -- when the web interface is on -- whether uploads to it are allowed.
>
> status = print the current proxy status.
>
> Set by: proxy server console / qtv.cfg.

## Handler-trace table

| Aspect | Enforcing line | Snippet | Observable behavior |
|---|---|---|---|
| Registered name | qtv.go:446 | `qtv.cmd.Register("status", statusCmd)` | console command `status` |
| Takes no argument | qtv.go:449 | `func statusCmd(qtv *QTV, cmdArgs *qCmdArgs) error {` (never reads `cmdArgs`) | no-arg command |
| servers line = upstream current/max | qtv.go:451 | `fmt.Printf(" servers: %4v/%v\n", qtv.uss.count(), qtv.uss.maxServers())` | upstream count / max |
| upstream max = `maxservers` clamped 0..1024 | upstream_storage.go:150-152 | `func (uss *uStreamStorage) maxServers() int { return iBound(0, uss.qtv.qvs.Get("maxservers").Int, 1024) }` | configured server cap |
| clients line = downstream current/max | qtv.go:452 | `fmt.Printf(" clients: %4v/%v\n", qtv.dss.count(), qtv.dss.maxClients())` | downstream count / max |
| downstream max = `maxclients` clamped 0..2048 | downstream_storage.go:113-115 + qtv.go:33 | `func (dss *dStreamStorage) maxClients() int { return iBound(0, dss.qtv.qvs.Get("maxclients").Int, qtvMaxClients) }` ; `qtvMaxClients = 2048` | configured client cap |
| hostname line | qtv.go:455 + :236-238 | `fmt.Printf("   hostname: %v\n", qtv.hostName())` ; `hostName()` returns `qvs.Get("hostname").Str` | the `hostname` cvar |
| listen addr line | qtv.go:456 + :232-234 | `fmt.Printf("listen addr: %v\n", qtv.listenAddress())` ; `listenAddress()` returns `qvs.Get("listen_address").Str` | the `listen_address` cvar |
| http enabled/disabled | qtv.go:457 + http.go:62-64 + strings.go:216-222 | `fmt.Printf("       http: %v\n", isEnabledFromBool(qtv.httpSv.isEnabled()))` ; `isEnabled()` = `http_enabled` Bool ; `isEnabledFromBool` -> "enabled"/"disabled" | HTTP on/off |
| http upload line shown ONLY if http enabled | qtv.go:458-460 + http.go:81-83 | `if qtv.httpSv.isEnabled() { fmt.Printf("http upload: %v\n", isEnabledFromBool(qtv.httpSv.uploadEnabled())) }` ; `uploadEnabled()` = `http_upload_enabled` Bool | upload on/off, conditional |

## D5 rubric check (Step 3)

Cold-synth: register/handler site has no trailing comment and there is no shipped-doc candidate -> nothing to affirm; D5-amendment requires evaluation anyway. Handler is fully source-legible -> SYNTHESIZE. (1) States admin-observable WHAT (prints the live status: server/client counts, hostname, listen addr, HTTP state); (2) not a name restatement (spells out exactly which fields print and that counts are current/max); (3) takes no argument, stated; each reported field is named; the current/max shape is spelled; (4) mechanism only, no opinion; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | Result |
|---|---|---|---|
| Semantic: prints a one-shot snapshot of current state | qtv.go:449-462 | `func statusCmd(... ) error { fmt.Printf("Status:\n") ... return nil }` (pure print, no mutation) | MATCH |
| servers = upstream connections, current/max | qtv.go:451 + upstream_storage.go:144-152 | `fmt.Printf(" servers: %4v/%v\n", qtv.uss.count(), qtv.uss.maxServers())` ; `count()` = `len(uss.stream)`, `maxServers()` = `iBound(0, Get("maxservers").Int, 1024)` | MATCH |
| clients = downstream connections, current/max | qtv.go:452 + downstream_storage.go:142-115 | `fmt.Printf(" clients: %4v/%v\n", qtv.dss.count(), qtv.dss.maxClients())` ; `count()` = `len(dss.stream)`, `maxClients()` = `iBound(0, Get("maxclients").Int, qtvMaxClients)` | MATCH |
| hostname reported | qtv.go:455 + :236-238 | `fmt.Printf("   hostname: %v\n", qtv.hostName())` ; `return qtv.qvs.Get("hostname").Str` | MATCH |
| listen address reported | qtv.go:456 + :232-234 | `fmt.Printf("listen addr: %v\n", qtv.listenAddress())` ; `return qtv.qvs.Get("listen_address").Str` | MATCH |
| whether HTTP is on | qtv.go:457 + http.go:62-64 | `isEnabledFromBool(qtv.httpSv.isEnabled())` ; `return sv.qtv.qvs.Get("http_enabled").Bool` | MATCH |
| HTTP upload reported ONLY when HTTP is on | qtv.go:458-460 + http.go:81-83 | `if qtv.httpSv.isEnabled() { ... isEnabledFromBool(qtv.httpSv.uploadEnabled()) }` ; `return sv.qtv.qvs.Get("http_upload_enabled").Bool` | MATCH |
| Takes no argument | qtv.go:449-462 | handler never reads `cmdArgs.Argv`/`Argc` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of `description` per D20: every file:line cite, the Go identifiers (`statusCmd`, `uss`/`uStreamStorage`, `dss`/`dStreamStorage`, `count`, `maxServers`, `maxClients`, `iBound`, `qtvMaxClients`, `hostName`, `listenAddress`, `httpSv.isEnabled`, `uploadEnabled`, `isEnabledFromBool`), the underlying cvar names (`maxservers`, `maxclients`, `hostname`, `listen_address`, `http_enabled`, `http_upload_enabled`), the numeric clamp ceilings (1024 / 2048), and the literal "enabled"/"disabled" tokens. The user doc states only the admin-observable WHAT: which facts the status prints (upstream/downstream counts as current/max, hostname, listen address, HTTP on/off, and the conditional upload on/off). No Default line (no-arg reporting command). No See-also L3 (a same-codebase status readout; no cross-engine action-changing consequence).

## Rationale

`statusCmd` (qtv.go:449-462) is a pure, no-argument readout (it never reads `cmdArgs` and never mutates state). It prints two count lines and four/five option lines:

- `servers: <count>/<max>` (:451) -- `qtv.uss.count()` (live upstream count = `len(uss.stream)`, upstream_storage.go:144-148) over `qtv.uss.maxServers()` (the `maxservers` cvar clamped to 0..1024, :150-152). The upstreams are the game servers this proxy pulls MVD data FROM.
- `clients: <count>/<max>` (:452) -- `qtv.dss.count()` (live downstream count = `len(dss.stream)`, downstream_storage.go:142-146) over `qtv.dss.maxClients()` (the `maxclients` cvar clamped to 0..`qtvMaxClients`=2048, downstream_storage.go:113-115 + qtv.go:33). The downstreams are the viewers/relays watching THROUGH this proxy.
- `hostname` (:455 -> `hostName()` -> `hostname` cvar), `listen addr` (:456 -> `listenAddress()` -> `listen_address` cvar).
- `http` enabled/disabled (:457 -> `httpSv.isEnabled()` = `http_enabled` Bool, rendered by `isEnabledFromBool` to "enabled"/"disabled", strings.go:216-222).
- `http upload` enabled/disabled (:458-460) -- printed ONLY inside `if qtv.httpSv.isEnabled()`, so the upload line is suppressed when HTTP is off; value is `httpSv.uploadEnabled()` = `http_upload_enabled` Bool (http.go:81-83). The description's "and -- when the web interface is on -- whether uploads to it are allowed" matches this conditional exactly.

The description deliberately renders the upstream/downstream split in plain admin terms ("servers it is pulling from" / "clients watching through it") rather than the raw "servers"/"clients" labels, because that is the admin-observable meaning the counts carry; the literal field labels are an output-format detail kept in reasoning.

Access model: QTV has no rcon and no access tiers -- commands are dispatched from a flat `map[string]cmdFunc` via `execLine` (cmd.go:216-234) with no permission gate; surfaces are the proxy console and a qtv.cfg. So `Set by: proxy server console / qtv.cfg` (matches the QWFWD-half precedent).

D6 reject-list (SR-2): not applicable -- `status` is sourced strictly from the Go handler; none of the four C-only knobs appears in `pkg/` (grep-confirmed NONE FOUND).

`description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30). No L3 breadcrumb (a local status readout, not an SR-5 candidate). Self-classification: TRACED-CLEAN -- every clause maps to an enforcing print/getter/clamp/branch line; no clause rests on the command name, an enum/string, or a config comment.

## D6Record

```json
{
  "project": "qtv",
  "knob": "status",
  "type": "command",
  "description": "Prints a snapshot of the proxy's current state. It reports how many servers it is pulling from (its upstream connections) and how many clients are watching through it (its downstream connections), each shown as the current count out of the configured maximum. It then lists the proxy's hostname, the address it listens on, whether its web (HTTP) interface is on, and -- when the web interface is on -- whether uploads to it are allowed.\n\nstatus = print the current proxy status.\n\nSet by: proxy server console / qtv.cfg.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "statusCmd (pkg/qtv/qtv.go:449-462), registered :446. Cold-synth: no trailing comment at the register/handler site, no shipped-doc candidate -> nothing to affirm; handler fully source-legible so synthesize. Pure no-arg readout (never reads cmdArgs, never mutates). Clauses->cites: servers line = upstream current/max -> :451 (qtv.uss.count() / qtv.uss.maxServers()); uss.count() = len(uss.stream) upstream_storage.go:144-148; maxServers() = iBound(0, Get('maxservers').Int, 1024) :150-152 (upstreams = game servers pulled FROM). clients line = downstream current/max -> :452 (qtv.dss.count() / qtv.dss.maxClients()); dss.count() = len(dss.stream) downstream_storage.go:142-146; maxClients() = iBound(0, Get('maxclients').Int, qtvMaxClients) downstream_storage.go:113-115 with qtvMaxClients=2048 qtv.go:33 (downstreams = viewers/relays watching THROUGH). hostname -> :455 hostName() = Get('hostname').Str :236-238; listen addr -> :456 listenAddress() = Get('listen_address').Str :232-234; http on/off -> :457 isEnabledFromBool(httpSv.isEnabled()), isEnabled()=Get('http_enabled').Bool http.go:62-64, isEnabledFromBool->'enabled'/'disabled' strings.go:216-222; http upload line printed ONLY inside `if qtv.httpSv.isEnabled()` :458-460 so suppressed when HTTP off, value httpSv.uploadEnabled()=Get('http_upload_enabled').Bool http.go:81-83. Description renders the servers/clients split in plain admin terms (pulling-from / watching-through) = the observable meaning of the counts; raw field labels are output-format kept in reasoning. Access model: QTV no rcon/no access tiers -- flat command map, no permission gate (cmd.go:216-234), surfaces proxy console + qtv.cfg -> Set by console/config (matches QWFWD precedent). No Default line (no-arg reporting command). D6 reject-list (SR-2) N/A: sourced from Go handler; mvdport/admin_password/floodprot/allow_http absent from pkg/ (grep NONE FOUND). No See-also L3 (local status readout, no cross-engine action-changing consequence); no SR-5 breadcrumb. provenance=null (cold-synth, operator 2026-05-30). Grading: synthesized, high confidence, every clause TRACED-CLEAN.",
  "description_proposed": null
}
```
