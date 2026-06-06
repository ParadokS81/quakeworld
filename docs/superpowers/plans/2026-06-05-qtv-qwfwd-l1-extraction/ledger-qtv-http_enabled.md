# describe-fill-synthesis ledger -- qtv `http_enabled`

- **Project:** qtv
- **Knob:** `http_enabled` (cvar)
- **Registered name string:** `http_enabled`; registered `pkg/qtv/http.go:51` (`qtv.qvs.RegEx("http_enabled", "1", qVarFlagInitOnly, nil)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (NULL description; cold-synth from read use-sites). The seed `resources/qtv.cfg` is a HINT only (SR-1), not ground truth.
- **Suspect-pool member:** FALSE (per brief; entity confirmed live, project=qtv, type=cvar). DB not touched.
- **D6 status:** LOAD-BEARING. This is the Go analogue of the C-only knob `allow_http`. Described STRICTLY from Go read-sites; `allow_http` (and `mvdport`/`admin_password`/`floodprot`) verified ABSENT from `pkg/` (tree-wide grep, exit 1 / zero matches). No C paraphrase.
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qtv:http_enabled: synthesized -- cold-synth; turns the proxy's built-in HTTP(S) web interface (demo browser / download / now-playing / upload) on or off; when on, the HTTP server shares the QTV listen port via cmux multiplexing; init-only (set in config before startup); default on -- origin=synthesized ref=pkg/qtv/qtv.go:493 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> Turns the proxy's built-in web interface on or off. When on, the proxy runs an HTTP(S) server that lets people browse and download the recorded demos, see what is playing live, and upload demos. The web server listens on the same address and port as the proxy itself (the two protocols share one port), so no extra port is needed. When off, no web pages are served and the proxy still works as a normal QTV stream relay.
>
> 0 = off (no web interface).
> 1 = on.
> Default: 1 (on).
> Set by: server config (can only be set before the proxy starts; changing it on a running proxy has no effect).

## Read use-sites (WI-1 wide read)

Tree-wide grep (`http_enabled` / `isEnabled` / `newHttpSv` / `httpSv` / `cmux` / `listen_address` / `.serve(`) over `pkg/`. Every use-site below verified at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/http.go:51` | registers name `http_enabled`, default `"1"`, flag `qVarFlagInitOnly` (locator + default + init-only) |
| Reader | `pkg/qtv/http.go:62-63` | `isEnabled()` returns `Get("http_enabled").Bool` -- the boolean the gates below read |
| `.Bool` derivation | `pkg/qtv/var.go:57` | `Bool: fv != 0` in `Reset` -- any non-zero value = on, `"0"`/empty = off |
| Gate: HTTP cmux matcher | `pkg/qtv/qtv.go:493-495` | `if qtv.httpSv.isEnabled() { httpListener = mux.Match(cmux.Any()) }` -- the catch-all matcher that routes non-QTV (i.e. HTTP) traffic is wired up ONLY when enabled |
| Gate: HTTP serve goroutine | `pkg/qtv/qtv.go:503-505` | `if httpListener != nil { g.Go(... qtv.httpSv.serve(httpListener)) }` -- the HTTP server goroutine starts ONLY if the matcher above exists |
| Shared-port context | `pkg/qtv/qtv.go:480, 487-491` | single TCP `net.Listen` on `listenAddress()`; cmux splits it: `PrefixMatcher("QTV")` -> downstream QTV protocol (always), `cmux.Any()` -> HTTP (gated). Comment :487-488 "we listen QTV and HTTP protocol on the same port we have to do multiplexing" |
| What `serve()` provides | `pkg/qtv/http.go:528-551` | the HTTP routes: `/nowplaying/`, `/demolist/`, `/upload/`, `/demos/...` download, `/demo_filenames` compat, static file server |
| TLS upgrade path | `pkg/qtv/http.go:567-573` | if `http_server_cert_file`+`http_server_key_file` both set -> `ServeTLS` (HTTPS); else plain `Serve` (HTTP). Justifies "HTTP(S)" |
| Status echo | `pkg/qtv/qtv.go:457-460` | `status` command prints `http: enabled/disabled` and, if enabled, the upload state (observability only; does not gate behavior) |
| Init-only enforcement | `pkg/qtv/var.go:139-142` (+ notify `:101-107`, called `qtv.go:471`) | once initialized, `set` on an init-only var logs "can't change variable after QTV initialized" and returns -- the flag is actually enforced |

## D5 rubric check (Step 3)

Cold-synth (NULL description, no comment to affirm). Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (whether the web interface runs); (2) not a name restatement (the name says "http_enabled"; the prose spells what the HTTP interface DOES -- demo browse/download/now-playing/upload -- and the shared-port consequence); (3) enum spelled (0=off, 1=on; any non-zero=on noted in reasoning); (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: this turns the built-in HTTP server on/off | `pkg/qtv/qtv.go:493-495` + `:503-505` | `if qtv.httpSv.isEnabled() { httpListener = mux.Match(cmux.Any()) }` ... `if httpListener != nil { g.Go(func() error { return qtv.httpSv.serve(httpListener) }) }` | MATCH |
| Polarity / OFF-state: when off, no web pages served; relay still works | `pkg/qtv/qtv.go:492-505` | `var httpListener net.Listener` (stays nil when disabled) -> serve goroutine skipped; the QTV downstream matcher `:491` + `dss.serve` `:502` are unconditional | MATCH |
| Enum: 0 = off, any non-zero = on | `pkg/qtv/http.go:62-63` -> `pkg/qtv/var.go:57` | `return sv.qtv.qvs.Get("http_enabled").Bool`; `Bool: fv != 0` | MATCH |
| What "on" provides (browse/download demos, live, upload) | `pkg/qtv/http.go:528-551` (routes) | `r.HandleFunc("/nowplaying/", ...)`, `r.HandleFunc("/demolist/", ...)`, `r.HandleFunc("/upload/", ...)`, `r.PathPrefix("/demos/").Handler(... http.FileServer ...)` | MATCH |
| HTTP(S): plain HTTP, or HTTPS if cert+key set | `pkg/qtv/http.go:567-573` | `isTls := certFile != "" && keyFile != ""` then `s.ServeTLS(...)` else `s.Serve(l)` | MATCH |
| Shared port: web server uses the same address/port as the proxy (cmux) | `pkg/qtv/qtv.go:480` + `:487-494` | single `net.Listen(qtv.networkTCP(), qtv.listenAddress())` then `mux := cmux.New(listener)`; HTTP gets `mux.Match(cmux.Any())`; comment "we listen QTV and HTTP protocol on the same port" | MATCH |
| Default: on | `pkg/qtv/http.go:51` | `RegEx("http_enabled", "1", qVarFlagInitOnly, nil)` -- registered default `"1"` (-> `Bool` true) | MATCH |
| Set by: server config, init-only (no effect once running) | `pkg/qtv/http.go:51` (flag) + `pkg/qtv/var.go:139-142` (enforce) + `:101-107`/`qtv.go:471` (notify) | flag `qVarFlagInitOnly`; `if (cur.Flags&qVarFlagInitOnly) != 0 && qs.initialized { log.Error(...).Msgf("can't change variable after QTV initialized: %q", name); return }`; `QtvWasInitializedNotify()` called before listen | MATCH |

## D20 split note

Kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`httpSv`, `isEnabled`, `cmux`, `mux.Match`, `cmux.Any()`, `cmux.PrefixMatcher`, `net.Listener`, `qVarFlagInitOnly`, `ServeTLS`), the goroutine/`multierror.Group` mechanism, and the `.Bool = fv != 0` derivation. The user doc states only the admin-observable WHAT: web interface on/off, what it serves, the shared-port consequence (stated plainly as "same address and port... no extra port needed" because it IS action-relevant for an admin planning firewall/port exposure -- so it is inline-justified, not routed to L3), the 0/1 enum, Default, and the init-only Set-by.

The cmux mechanism name and the `cmux.Any()`/`PrefixMatcher("QTV")` split are routed to reasoning; the user only needs to know the web pages ride the same port, not how cmux demultiplexes.

## Rationale

Cold-synth from fully-legible use-sites. `http_enabled` is the on/off switch for QTV's built-in web interface. The reader `isEnabled()` (`http.go:62-63`) returns the cvar's `.Bool` (`var.go:57`: `fv != 0`, so default `"1"` = on, `"0"` = off). Two gates consume it in `ListenAndServe`: the HTTP cmux catch-all matcher is wired only when enabled (`qtv.go:493-495`), and the HTTP serve goroutine starts only if that matcher exists (`qtv.go:503-505`). When disabled, `httpListener` stays nil, the goroutine is skipped, and no HTTP routes are served -- while the QTV-protocol downstream path (`PrefixMatcher("QTV")` `:491` feeding `dss.serve` `:502`) is unconditional, so the proxy still relays streams. What the server provides when on is the route table at `http.go:528-551` (now-playing, demo list, demo download, upload, static files); it is HTTPS when both `http_server_cert_file` and `http_server_key_file` are set (`http.go:567-573`), otherwise plain HTTP -- hence "HTTP(S)".

D6 (LOAD-BEARING): this is the Go equivalent of the C-only `allow_http`. The description is built ONLY from the Go read-sites above; `allow_http` and the other three C-only knobs were grep-verified absent from `pkg/` (zero matches). No clause is paraphrased from C semantics. The HTTP server SHARES `listen_address`'s port through cmux multiplexing (single `net.Listen` at `qtv.go:480`; cmux splits it `:489-494`; source comment `:487-488` states the same-port design): `http_enabled` gates whether the `cmux.Any()` HTTP matcher is wired up, so the shared-port behavior is traced, not assumed.

Init-only: registered with `qVarFlagInitOnly` (`http.go:51`), and the flag is genuinely enforced -- after `QtvWasInitializedNotify()` (called `qtv.go:471`, just before the listen) any attempt to set an init-only var is refused with a logged error (`var.go:139-142`). So it is settable in the config / before startup only, NOT changeable on a running proxy. WI-2: registered default is the literal `"1"` at the register site (not from a cfg).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/compare/route line; no clause rests on the cvar name or on C `allow_http`. No C2 conflict (no shipped-doc candidate; the seed cfg is a hint only). `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30). No L3 breadcrumb (SR-5 candidates a/b/c do not cover the HTTP interface).

## D6Record

```json
{
  "project": "qtv",
  "knob": "http_enabled",
  "type": "cvar",
  "description": "Turns the proxy's built-in web interface on or off. When on, the proxy runs an HTTP(S) server that lets people browse and download the recorded demos, see what is playing live, and upload demos. The web server listens on the same address and port as the proxy itself (the two protocols share one port), so no extra port is needed. When off, no web pages are served and the proxy still works as a normal QTV stream relay.\n\n0 = off (no web interface).\n1 = on.\nDefault: 1 (on).\nSet by: server config (can only be set before the proxy starts; changing it on a running proxy has no effect).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (NULL description, no comment); use-sites fully source-legible so synthesize. Registered pkg/qtv/http.go:51 RegEx(\"http_enabled\", \"1\", qVarFlagInitOnly, nil). D6 LOAD-BEARING: Go analogue of C-only allow_http; described strictly from Go read-sites; allow_http/mvdport/admin_password/floodprot grep-verified ABSENT from pkg/ (exit 1, zero matches); zero C paraphrase. Clauses->cites: on/off of the built-in HTTP server -> isEnabled() pkg/qtv/http.go:62-63 (Get(\"http_enabled\").Bool) gating BOTH the cmux HTTP matcher pkg/qtv/qtv.go:493-495 (if isEnabled() { httpListener = mux.Match(cmux.Any()) }) and the serve goroutine pkg/qtv/qtv.go:503-505 (if httpListener != nil { g.Go(...httpSv.serve...) }); OFF-state (no pages, relay still works) -> httpListener stays nil when disabled so goroutine skipped, while downstream QTV matcher PrefixMatcher(\"QTV\") qtv.go:491 + dss.serve :502 are unconditional; enum 0=off / non-zero=on -> .Bool derivation var.go:57 (Bool: fv != 0); what 'on' serves (browse/download demos, live, upload) -> route table http.go:528-551 (/nowplaying/, /demolist/, /upload/, /demos/ FileServer); HTTP(S) -> http.go:567-573 (isTls := certFile!=\"\" && keyFile!=\"\" -> ServeTLS else Serve); shared-port (same address/port as proxy via cmux) -> single net.Listen(listenAddress()) qtv.go:480 + cmux split :487-494 + source comment :487-488 'we listen QTV and HTTP protocol on the same port'; Default on -> registered literal \"1\" http.go:51 (WI-2); Set-by server config + init-only enforced -> flag qVarFlagInitOnly http.go:51 enforced at var.go:139-142 (post-QtvWasInitializedNotify, called qtv.go:471, set on init-only var is refused with logged error). durationBound/timeout not relevant to this knob. Shared-port clause inlined (not L3) because it is action-relevant for firewall/port planning (D20 action-changing carve-out); cmux mechanism name routed to reasoning. Self-class TRACED-CLEAN: every clause maps to an enforcing branch/compare/route; no clause rests on the name or on C allow_http. No C2 conflict (no shipped-doc candidate; seed cfg is a hint only, SR-1). provenance=null (cold-synth, operator 2026-05-30). No SR-5 breadcrumb (HTTP interface is outside candidates a/b/c).",
  "description_proposed": null
}
```
