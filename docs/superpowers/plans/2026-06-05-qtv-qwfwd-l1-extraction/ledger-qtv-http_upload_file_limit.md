# describe-fill-synthesis ledger -- qtv `http_upload_file_limit`

- **Project:** qtv
- **Knob:** `http_upload_file_limit` (cvar)
- **Registered name string:** `http_upload_file_limit` -- registered `pkg/qtv/http.go:57` (`qtv.qvs.RegEx("http_upload_file_limit", 1024*1024*32, qVarFlagInitOnly, nil)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (NULL description; no trailing comment at the register site; `qtv.cfg` is a HINT only, not ground truth / not a seed).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar; do NOT touch the DB).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
http_upload_file_limit: synthesized -- PER-FILE upload size cap in bytes; a single demo upload exceeding it is rejected (http.MaxBytesReader); default 33554432 bytes = 32 MiB; clamped to 1 MiB..128 MiB; init-only -- ref=pkg/qtv/http.go:362 anchor=1.16-dev -- self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> The largest size, in bytes, allowed for a single demo file uploaded to the QTV web server. An upload whose body exceeds this size is cut off and rejected.
>
> Value is in bytes. Raising it allows larger individual demos to be uploaded; lowering it rejects them sooner. Out-of-range values are clamped: anything below 1 MiB (1048576 bytes) is treated as 1 MiB, and anything above 128 MiB (134217728 bytes) is treated as 128 MiB.
>
> Default: 33554432 bytes (32 MiB).
> Set by: server config (read once at startup; cannot be changed while QTV is running).
> See also: http_upload_total_limit (the combined disk budget for all uploaded demos).

## Read use-sites (WI-1 wide read)

Tree-wide grep (`http_upload_file_limit` / `uploadFileLimit`) confirms the use-sites live in `pkg/qtv/http.go` only. All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/http.go:57` | registers name `http_upload_file_limit`, default `1024*1024*32` (=33554432 bytes), flag `qVarFlagInitOnly`, no OnChange (`nil`) |
| Accessor + clamp | `pkg/qtv/http.go:89-91` | `uploadFileLimit()` returns `i64Bound(1024*1024*1, int64(Get("http_upload_file_limit").Float), 1024*1024*128)` -- clamp [1 MiB, 128 MiB] |
| Enforcing site | `pkg/qtv/http.go:361-362` | `// Limit upload size of one file by 32 megabytes.` then `r.Body = http.MaxBytesReader(w, r.Body, sv.uploadFileLimit())` -- caps the per-request body |

## D5 rubric check (Step 3)

NULL description, no trailing comment, no shipped-doc candidate -> nothing to affirm; D5-amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (max bytes for a single uploaded demo); (2) not a name restatement (spells the reject-on-exceed behavior, the clamp, the byte->MiB values); (3) units spelled (bytes; default and clamp bounds given in both bytes and MiB); (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/http.go` / `pkg/qtv/math.go` / `pkg/qtv/var.go` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic + scope: caps the size of a SINGLE uploaded demo file (per-file, not aggregate) | `pkg/qtv/http.go:361-362` | `// Limit upload size of one file by 32 megabytes.` `r.Body = http.MaxBytesReader(w, r.Body, sv.uploadFileLimit())` (per HTTP request body) | MATCH |
| Behavior: an over-size upload is cut off / rejected | `pkg/qtv/http.go:362` (semantics of `http.MaxBytesReader`) | `http.MaxBytesReader(w, r.Body, sv.uploadFileLimit())` -- reads beyond the limit fail; the subsequent `r.FormFile("file")` (`:365`) errors out and the handler returns (`:366-369`) | MATCH |
| Units: value is in bytes | `pkg/qtv/http.go:57` + `:90` | registered literal `1024*1024*32` (a byte count); accessor passes `int64(...Float)` byte count to `MaxBytesReader` (a byte limit) | MATCH |
| Clamp: below 1 MiB -> 1 MiB; above 128 MiB -> 128 MiB | `pkg/qtv/http.go:90` + `pkg/qtv/math.go:38-49` | `i64Bound(1024*1024*1, ..., 1024*1024*128)`; `i64Bound`: `if val<min return min; if val>max return max` (min=1048576, max=134217728) | MATCH |
| Default: 33554432 bytes (32 MiB) | `pkg/qtv/http.go:57` (WI-2) | `RegEx("http_upload_file_limit", 1024*1024*32, ...)` -- `1024*1024*32` = 33554432 = 32 MiB | MATCH |
| Set by: server config, init-only (cannot change while running) | `pkg/qtv/http.go:57` + `pkg/qtv/var.go:40,139` | flag `qVarFlagInitOnly`; `set()` blocks at `var.go:139` once `qs.initialized` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`uploadFileLimit`, `i64Bound`, `http.MaxBytesReader`, `r.FormFile`, `qVarFlagInitOnly`, `.Float`), and the `set()`/`initialized` enforcement mechanism. The user doc states only the admin-observable WHAT (per-file byte cap, reject-on-exceed, the clamp bounds in bytes and MiB), Default, Set-by, and a See-also to the aggregate cap.

## Rationale

Cold-synth from fully-legible use-sites. `http_upload_file_limit` is the PER-FILE cap: its byte value (clamped to [1 MiB, 128 MiB] by `i64Bound` at `http.go:90`) is passed to `http.MaxBytesReader` (`http.go:362`), which wraps the request body so a single upload that exceeds the cap is cut off; the downstream `FormFile` read then fails and the handler returns without saving the file. The adjacent source comment (`http.go:361`, "Limit upload size of one file by 32 megabytes") corroborates both the per-file scope and the 32 MiB default. Default literal `1024*1024*32` = 33554432 bytes = 32 MiB (WI-2, read from the `RegEx` literal, not a cfg). Flag `qVarFlagInitOnly` -> Set-by server config, read once at startup, rejected after init (`var.go:139`).

The per-file vs total distinction is the load-bearing one (brief): `http_upload_file_limit` rejects a single over-size REQUEST (`MaxBytesReader`, `http.go:362`); the sibling `http_upload_total_limit` is the aggregate DISK budget enforced by a periodic cleanup that deletes oldest uploads (`qtv.go:357-381`). They are different mechanisms, so a `See also:` points at the aggregate cap (action-changing context: an admin sizing uploads needs both numbers). Verified: `http_upload_file_limit` is NOT consumed anywhere except `MaxBytesReader`; `http_upload_total_limit` is NOT consumed by `MaxBytesReader`.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing line (the `MaxBytesReader` call, the `i64Bound` clamp, the registered literal); no clause rests on the knob name or a config comment.

D6 REJECT-LIST: Go-HTTP knob, no C-QTV counterpart; not seeded from `allow_http`/`mvdport`/`admin_password`/`floodprot` (fteqtv-only). `qtv.cfg` is a HINT only (SR-1). `description_provenance` = null (cold-synth, operator clarification 2026-05-30).

## D6Record

```json
{
  "project": "qtv",
  "knob": "http_upload_file_limit",
  "type": "cvar",
  "description": "The largest size, in bytes, allowed for a single demo file uploaded to the QTV web server. An upload whose body exceeds this size is cut off and rejected.\n\nValue is in bytes. Raising it allows larger individual demos to be uploaded; lowering it rejects them sooner. Out-of-range values are clamped: anything below 1 MiB (1048576 bytes) is treated as 1 MiB, and anything above 128 MiB (134217728 bytes) is treated as 128 MiB.\n\nDefault: 33554432 bytes (32 MiB).\nSet by: server config (read once at startup; cannot be changed while QTV is running).\nSee also: http_upload_total_limit (the combined disk budget for all uploaded demos).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, NULL description, no trailing comment at registration pkg/qtv/http.go:57 (RegEx(\"http_upload_file_limit\", 1024*1024*32, qVarFlagInitOnly, nil)), no shipped-doc candidate -> synthesize from legible use-sites. Tree-wide grep: use-sites in pkg/qtv/http.go only. Clauses->cites: PER-FILE cap on a single upload -> enforcing site pkg/qtv/http.go:361-362 (comment 'Limit upload size of one file by 32 megabytes.' + r.Body = http.MaxBytesReader(w, r.Body, sv.uploadFileLimit()), which caps one request body); over-size upload rejected -> MaxBytesReader cuts the body so the following r.FormFile('file') http.go:365 errors and the handler returns http.go:366-369; units=bytes -> registered literal is a byte count and MaxBytesReader takes a byte limit; clamp 1 MiB..128 MiB -> accessor http.go:89-91 i64Bound(1024*1024*1, ..., 1024*1024*128) with math.go:38-49 (val<min->min, val>max->max; min=1048576, max=134217728); Default 33554432 bytes=32 MiB -> registered literal 1024*1024*32 (WI-2, math confirmed 1024*1024*32=33554432); Set-by server config + init-only -> flag qVarFlagInitOnly (var.go:40) enforced var.go:139 (set() blocks once qs.initialized). LOAD-BEARING per-file-vs-total distinction (brief): this knob is consumed ONLY by MaxBytesReader (per-request reject); the sibling http_upload_total_limit is the aggregate disk budget enforced by periodic uploadCleanUp deleting oldest uploads (qtv.go:357-381) and is NOT passed to MaxBytesReader. See-also -> http_upload_total_limit (action-changing: admin sizing uploads needs both). No clause rests on name/comment. D6 REJECT-LIST: Go-HTTP knob, no C-QTV counterpart; not seeded from allow_http/mvdport/admin_password/floodprot (fteqtv-only). qtv.cfg is a HINT only (SR-1). Grading: synthesized, high confidence, TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
