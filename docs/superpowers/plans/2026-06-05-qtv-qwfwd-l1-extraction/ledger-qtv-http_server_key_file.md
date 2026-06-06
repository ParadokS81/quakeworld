# describe-fill-synthesis ledger -- qtv `http_server_key_file`

- **Project:** qtv
- **Knob:** `http_server_key_file` (cvar)
- **Registered name string:** `http_server_key_file` -- registered `pkg/qtv/http.go:59` (`qtv.qvs.RegEx("http_server_key_file", "", qVarFlagInitOnly, nil)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (NULL description; no trailing comment at the register site; `qtv.cfg` is a HINT only, not ground truth / not a seed).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar; do NOT touch the DB).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
http_server_key_file: synthesized -- path to the TLS private key file for the QTV web server; serving HTTPS requires BOTH this and http_server_cert_file non-empty, else plain HTTP; empty (default) = plain HTTP; init-only -- ref=pkg/qtv/http.go:569 anchor=1.16-dev -- self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Path to the TLS private key file (the key that matches http_server_cert_file) the QTV web server uses to serve pages over HTTPS instead of plain HTTP.
>
> HTTPS is enabled only when both this and http_server_cert_file are set to non-empty paths. If either is left empty, the web server runs as plain HTTP. When HTTPS is enabled but the key file cannot be found or read, the web server fails to start and QTV shuts down.
>
> Default: empty (plain HTTP, no TLS).
> Set by: server config (read once at startup; cannot be changed while QTV is running).
> See also: http_server_cert_file (the matching certificate; both are required for HTTPS).

## Read use-sites (WI-1 wide read)

Tree-wide grep (`http_server_key_file`) confirms the use-sites live in `pkg/qtv/http.go` only (registration + the TLS gate in `serve`). All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/http.go:59` | registers name `http_server_key_file`, default `""` (empty), flag `qVarFlagInitOnly`, no OnChange (`nil`) |
| Read | `pkg/qtv/http.go:568` | `keyFile := sv.qtv.qvs.Get("http_server_key_file").Str` |
| Enforcing gate | `pkg/qtv/http.go:569-574` | `isTls := certFile != "" && keyFile != ""`; if `isTls` -> `s.ServeTLS(l, certFile, keyFile)` (HTTPS) else `s.Serve(l)` (plain HTTP) |
| Failure path | `pkg/qtv/http.go:575-579` | comment: "case when ServeTLS() could not find cert/key file"; on serve error (not `cmux.ErrServerClosed`) -> `sv.qtv.Stop()` |

## D5 rubric check (Step 3)

NULL description, no trailing comment, no shipped-doc candidate -> nothing to affirm; D5-amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (the private-key path that, with the cert, switches the web server to HTTPS); (2) not a name restatement (spells the both-required rule, the empty-means-plain-HTTP behavior, the start-failure path); (3) the empty/non-empty meanings spelled out; (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/http.go` / `pkg/qtv/var.go` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: path to the TLS private key the web server uses for HTTPS | `pkg/qtv/http.go:568,571` | `keyFile := sv.qtv.qvs.Get("http_server_key_file").Str`; `err = s.ServeTLS(l, certFile, keyFile)` | MATCH |
| Pairing: it is the key matching the certificate | `pkg/qtv/http.go:571` | `s.ServeTLS(l, certFile, keyFile)` -- Go `ServeTLS(l, certFile, keyFile)` loads the cert/key as a matched pair | MATCH |
| Condition: HTTPS only when BOTH cert and key are non-empty | `pkg/qtv/http.go:569` | `isTls := certFile != "" && keyFile != ""` (logical AND of both non-empty) | MATCH |
| OFF-state: empty -> plain HTTP | `pkg/qtv/http.go:570-573` | `if isTls { s.ServeTLS(...) } else { s.Serve(l) }` -- not-TLS branch serves plain `Serve` | MATCH |
| Failure: HTTPS on but key unreadable -> server fails to start, QTV stops | `pkg/qtv/http.go:575-579` | `// This mostly required for the case when ServeTLS() could not find cert/key file.` `if err != cmux.ErrServerClosed { sv.qtv.Stop() }` | MATCH |
| Default: empty (no TLS) | `pkg/qtv/http.go:59` (WI-2) | `RegEx("http_server_key_file", "", ...)` -- registered default empty string | MATCH |
| Set by: server config, init-only (cannot change while running) | `pkg/qtv/http.go:59` + `pkg/qtv/var.go:40,139` | flag `qVarFlagInitOnly`; `set()` blocks at `var.go:139` once `qs.initialized` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`ServeTLS`, `Serve`, `isTls`, `cmux.ErrServerClosed`, `qVarFlagInitOnly`, `.Str`, `sv.qtv.Stop()`), and the `set()`/`initialized` enforcement mechanism. The user doc states only the admin-observable WHAT (private-key path -> HTTPS; both required; empty -> plain HTTP; bad key -> server fails to start and QTV shuts down), Default, Set-by, and a See-also to the cert file.

## Rationale

Cold-synth from fully-legible use-sites. `http_server_key_file` holds the filesystem path to the TLS private key paired with the certificate in `http_server_cert_file`; both are passed together to `ServeTLS(l, certFile, keyFile)` (`http.go:571`), Go's matched cert/key loader. The gate is `isTls := certFile != "" && keyFile != ""` (`http.go:569`): HTTPS is selected only when BOTH paths are non-empty; otherwise the server runs plain HTTP (`Serve`, `http.go:573`). Hence the empty default (`http.go:59`) means plain HTTP / no TLS. If TLS is selected but the key file cannot be found or read, `ServeTLS` errors and the post-serve guard (`http.go:575-579`, the source comment naming exactly this case) calls `sv.qtv.Stop()`, so a misconfigured key path takes QTV down rather than silently falling back. Flag `qVarFlagInitOnly` -> Set-by server config, read once at startup, rejected after init (`var.go:139`).

The cert and key knobs are a matched pair (the `&&` at `http.go:569` requires both), so each carries a `See also:` to the other -- action-changing, since setting only one of the two does NOT enable HTTPS and an admin must set both.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing line (the `&&` gate, the ServeTLS/Serve branch, the Stop() failure guard, the registered empty default); no clause rests on the knob name or a config comment.

D6 REJECT-LIST: Go-HTTP-server TLS knob, no C-QTV counterpart; not seeded from `allow_http`/`mvdport`/`admin_password`/`floodprot` (fteqtv-only). `qtv.cfg` is a HINT only (SR-1). `description_provenance` = null (cold-synth, operator clarification 2026-05-30).

## D6Record

```json
{
  "project": "qtv",
  "knob": "http_server_key_file",
  "type": "cvar",
  "description": "Path to the TLS private key file (the key that matches http_server_cert_file) the QTV web server uses to serve pages over HTTPS instead of plain HTTP.\n\nHTTPS is enabled only when both this and http_server_cert_file are set to non-empty paths. If either is left empty, the web server runs as plain HTTP. When HTTPS is enabled but the key file cannot be found or read, the web server fails to start and QTV shuts down.\n\nDefault: empty (plain HTTP, no TLS).\nSet by: server config (read once at startup; cannot be changed while QTV is running).\nSee also: http_server_cert_file (the matching certificate; both are required for HTTPS).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, NULL description, no trailing comment at registration pkg/qtv/http.go:59 (RegEx(\"http_server_key_file\", \"\", qVarFlagInitOnly, nil)), no shipped-doc candidate -> synthesize from legible use-sites. Tree-wide grep: use-sites in pkg/qtv/http.go only (registration + serve TLS gate). Clauses->cites: private key path used for HTTPS -> http.go:568 (keyFile := Get('http_server_key_file').Str) + http.go:571 (ServeTLS(l, certFile, keyFile)); it is the key matching the cert -> http.go:571 (Go ServeTLS(l, certFile, keyFile) loads cert+key as a pair); HTTPS only when BOTH non-empty -> http.go:569 (isTls := certFile != \"\" && keyFile != \"\", logical AND); OFF-state empty -> plain HTTP -> http.go:570-573 (if isTls ServeTLS else Serve(l)); bad key -> server fails to start + QTV stops -> http.go:575-579 (comment 'case when ServeTLS() could not find cert/key file' + if err != cmux.ErrServerClosed { sv.qtv.Stop() }); Default empty -> registered '' (WI-2, http.go:59); Set-by server config + init-only -> flag qVarFlagInitOnly (var.go:40) enforced var.go:139 (set() blocks once qs.initialized). cert+key are a matched pair (&& at http.go:569 requires both) -> See-also http_server_cert_file (action-changing: setting only one does NOT enable HTTPS). No clause rests on name/comment. D6 REJECT-LIST: Go-HTTP TLS knob, no C-QTV counterpart; not seeded from allow_http/mvdport/admin_password/floodprot (fteqtv-only). qtv.cfg is a HINT only (SR-1). Grading: synthesized, high confidence, TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
