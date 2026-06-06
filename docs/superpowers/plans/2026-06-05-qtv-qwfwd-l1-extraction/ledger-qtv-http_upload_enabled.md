# describe-fill-synthesis ledger -- qtv `http_upload_enabled`

- **Project:** qtv
- **Knob:** `http_upload_enabled` (cvar)
- **Registered name string:** `http_upload_enabled` -- registered `pkg/qtv/http.go:55` (`qtv.qvs.RegEx("http_upload_enabled", "1", qVarFlagInitOnly, nil)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (NULL description; no trailing comment at the register site; `qtv.cfg` is a HINT only, not ground truth / not a seed).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar; do NOT touch the DB).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
http_upload_enabled: synthesized -- whether the built-in QTV web server accepts demo file uploads via /upload/; 1=on, 0=off (off returns HTTP 403); init-only -- ref=pkg/qtv/http.go:340 anchor=1.16-dev -- self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Controls whether the built-in QTV web server accepts demo file uploads (the "upload demo" form on the demo-listing page, served at /upload/).
>
> 1 = uploads accepted. 0 = uploads refused; the server answers any upload attempt with an HTTP 403 "Upload is not allowed" response.
>
> Default: 1 (uploads accepted).
> Set by: server config (read once at startup; cannot be changed while QTV is running).

## Read use-sites (WI-1 wide read)

Tree-wide grep (`http_upload_enabled` / `uploadEnabled`) confirms the use-sites live in `pkg/qtv/http.go` (gate) and `pkg/qtv/qtv.go` (status display only). All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/http.go:55` | registers name `http_upload_enabled`, default `"1"`, flag `qVarFlagInitOnly`, no OnChange (`nil`) |
| Accessor | `pkg/qtv/http.go:82` | `uploadEnabled()` returns `Get("http_upload_enabled").Bool` |
| Enforcing gate | `pkg/qtv/http.go:340-344` | in `uploadFile` HTTP handler: `if !sv.uploadEnabled()` -> `w.WriteHeader(http.StatusForbidden)`; writes "Upload is not allowed\n"; `return` |
| Status display | `pkg/qtv/qtv.go:459` | `status` command prints `http upload: <enabled/disabled>` -- display only, not a behavior gate |

## D5 rubric check (Step 3)

NULL description, no trailing comment, no shipped-doc candidate -> nothing to affirm; D5-amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE (not hedge/residue). Rubric: (1) states admin-observable WHAT (whether the web server accepts demo uploads); (2) not a name restatement (spells the 403 OFF behavior, the /upload/ surface); (3) enum spelled (1=accepted, 0=refused with 403); (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/http.go` / `pkg/qtv/var.go` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: gates whether the web server accepts demo uploads | `pkg/qtv/http.go:340-344` | `if !sv.uploadEnabled() { w.WriteHeader(http.StatusForbidden); fmt.Fprintf(w, "Upload is not allowed\n"); return }` | MATCH |
| Polarity / enum: 1=accepted, 0=refused | `pkg/qtv/http.go:82` + `pkg/qtv/var.go:57` | `Get("http_upload_enabled").Bool`; `Bool: fv != 0` (so "1"->true=accepted, "0"->false=refused) | MATCH |
| OFF-state: refusal is HTTP 403 "Upload is not allowed" | `pkg/qtv/http.go:341-342` | `w.WriteHeader(http.StatusForbidden)` (403); `fmt.Fprintf(w, "Upload is not allowed\n")` | MATCH |
| Scope: the upload surface is /upload/ on the built-in web server | `pkg/qtv/http.go:535` | `r.HandleFunc("/upload/", sv.uploadFile)` (the gated handler is the /upload/ route) | MATCH |
| Default: 1 | `pkg/qtv/http.go:55` (WI-2) | `RegEx("http_upload_enabled", "1", ...)` -- registered literal `"1"` | MATCH |
| Set by: server config, init-only (cannot change while running) | `pkg/qtv/http.go:55` + `pkg/qtv/var.go:40,139` | flag `qVarFlagInitOnly` (`// Variable could be changed only while QTV is not fully initialized`); `set()` blocks at `var.go:139`: `if (cur.Flags&qVarFlagInitOnly)!=0 && qs.initialized { ... return }` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`uploadEnabled`, `httpSv`, `qVarFlagInitOnly`, `qvs.Get(...).Bool`), the `http.StatusForbidden` constant name, and the `set()`/`initialized` enforcement mechanism. The user doc states only the admin-observable WHAT (uploads accepted vs refused), the OFF-state in plain terms (an HTTP 403 refusal), Default, and Set-by.

## Rationale

Cold-synth from fully-legible use-sites. `http_upload_enabled` is the master switch for the QTV web server's demo-upload feature. Its `.Bool` accessor (`http.go:82`) is the first check in the `/upload/` HTTP handler (`http.go:340`); when false, the handler short-circuits with a 403 and the "Upload is not allowed" body (`http.go:341-342`) and never touches the file. Default `"1"` -> `Bool` true (uploads accepted) via the `fv != 0` rule (`var.go:57`). The other upload throttles in the handler (single concurrent upload `http.go:347`, one-per-minute `http.go:354`) are hardcoded and NOT driven by any cvar, so they are not attributed to this knob. The `status` command line (`qtv.go:459`) only DISPLAYS the flag; it does not gate behavior. Flag `qVarFlagInitOnly` makes the knob settable from config / before init but rejected after QTV is initialized (`var.go:139`), so Set-by = server config, read once at startup.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/compare/registration line; no clause rests on the knob name or a config comment.

D6 REJECT-LIST: this is a Go-HTTP-server knob with no C-QTV counterpart; not seeded from or related to `allow_http`/`mvdport`/`admin_password`/`floodprot` (fteqtv-only). `qtv.cfg` consulted only as a HINT (SR-1); not ground truth. `description_provenance` = null (cold-synth, operator clarification 2026-05-30).

## D6Record

```json
{
  "project": "qtv",
  "knob": "http_upload_enabled",
  "type": "cvar",
  "description": "Controls whether the built-in QTV web server accepts demo file uploads (the \"upload demo\" form on the demo-listing page, served at /upload/).\n\n1 = uploads accepted. 0 = uploads refused; the server answers any upload attempt with an HTTP 403 \"Upload is not allowed\" response.\n\nDefault: 1 (uploads accepted).\nSet by: server config (read once at startup; cannot be changed while QTV is running).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, NULL description, no trailing comment at registration pkg/qtv/http.go:55 (RegEx(\"http_upload_enabled\", \"1\", qVarFlagInitOnly, nil)), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep: use-sites in pkg/qtv/http.go (gate) + pkg/qtv/qtv.go:459 (status display only). Clauses->cites: gates whether the web server accepts demo uploads -> enforcing gate pkg/qtv/http.go:340-344 (if !sv.uploadEnabled() { w.WriteHeader(http.StatusForbidden); Fprintf 'Upload is not allowed\\n'; return }); polarity 1=accepted/0=refused -> accessor http.go:82 (.Bool) + var.go:57 (Bool: fv != 0, so '1'->true, '0'->false); OFF-state is HTTP 403 -> http.go:341-342 (StatusForbidden + 'Upload is not allowed'); upload surface = /upload/ -> route http.go:535 (HandleFunc /upload/ -> sv.uploadFile); Default 1 -> registered literal http.go:55 (WI-2); Set-by server config + init-only -> flag qVarFlagInitOnly (var.go:40 comment 'changed only while QTV is not fully initialized') enforced at var.go:139 (set() blocks change once qs.initialized). Hardcoded throttles in the handler (single-concurrent http.go:347, one-per-minute http.go:354) are NOT cvar-driven -> not attributed to this knob. status command qtv.go:459 only displays the flag, no behavior gate. No clause rests on name/comment; each maps to an enforcing branch/compare/registration. D6 REJECT-LIST: Go-HTTP knob, no C-QTV counterpart; not seeded from allow_http/mvdport/admin_password/floodprot (fteqtv-only). qtv.cfg is a HINT only (SR-1), not ground truth. Grading: synthesized, high confidence, TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
