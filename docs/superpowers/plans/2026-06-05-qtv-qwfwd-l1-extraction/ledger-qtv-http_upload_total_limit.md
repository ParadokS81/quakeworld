# describe-fill-synthesis ledger -- qtv `http_upload_total_limit`

- **Project:** qtv
- **Knob:** `http_upload_total_limit` (cvar)
- **Registered name string:** `http_upload_total_limit` -- registered `pkg/qtv/http.go:56` (`qtv.qvs.RegEx("http_upload_total_limit", 1024*1024*64, qVarFlagInitOnly, nil)`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (NULL description; no trailing comment at the register site; `qtv.cfg` is a HINT only, not ground truth / not a seed).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar; do NOT touch the DB).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
http_upload_total_limit: synthesized -- TOTAL/aggregate disk budget in bytes for ALL uploaded demos combined; a periodic cleanup deletes oldest uploads to stay under it (NOT a per-request reject); default 67108864 bytes = 64 MiB; clamped to 1 MiB..2 GiB; init-only -- ref=pkg/qtv/qtv.go:372 anchor=1.16-dev -- self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> The combined disk space, in bytes, that uploaded demo files are allowed to occupy on the QTV server. This is a total budget across all uploads, not a per-file limit.
>
> Value is in bytes. A background task checks periodically how much space the uploaded demos take up, and when the total exceeds this budget it deletes the oldest uploaded demos until the total is back under the limit. Out-of-range values are clamped: anything below 1 MiB (1048576 bytes) is treated as 1 MiB, and anything above 2 GiB (2147483648 bytes) is treated as 2 GiB.
>
> Default: 67108864 bytes (64 MiB).
> Set by: server config (read once at startup; cannot be changed while QTV is running).
> See also: http_upload_file_limit (the maximum size of a single uploaded demo).

## Read use-sites (WI-1 wide read)

Tree-wide grep (`http_upload_total_limit` / `uploadTotalLimit`) confirms the use-sites: registration + accessor in `pkg/qtv/http.go`, the single CONSUMER in `pkg/qtv/qtv.go`. All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/http.go:56` | registers name `http_upload_total_limit`, default `1024*1024*64` (=67108864 bytes), flag `qVarFlagInitOnly`, no OnChange (`nil`) |
| Accessor + clamp | `pkg/qtv/http.go:85-87` | `uploadTotalLimit()` returns `i64Bound(1024*1024*1, int64(Get("http_upload_total_limit").Float), 1024*1024*1024*2)` -- clamp [1 MiB, 2 GiB] |
| Consumer (the only one) | `pkg/qtv/qtv.go:357-381` | `uploadCleanUp()`: sums sizes of all `upload`-prefixed demos; while that sum `> uploadMaxSize`, removes oldest uploads (`os.Remove`) until under the budget |
| Cleanup cadence | `pkg/qtv/qtv.go:257-270` | the demo-list updater loop calls `uploadCleanUp()` then `t.Reset(60 * time.Second)` -- runs roughly every 60 seconds |

## D5 rubric check (Step 3)

NULL description, no trailing comment, no shipped-doc candidate -> nothing to affirm; D5-amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (total disk budget for uploads, enforced by deleting oldest); (2) not a name restatement (spells the aggregate-not-per-file scope, the delete-oldest behavior, the clamp); (3) units spelled (bytes; default and clamp bounds in bytes and MiB/GiB); (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/http.go` / `pkg/qtv/qtv.go` / `pkg/qtv/math.go` / `pkg/qtv/var.go` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Scope: a TOTAL budget across all uploaded demos (aggregate, not per-file) | `pkg/qtv/qtv.go:364-369` | `// Calculate how much space occupied by uploads.` `for _, d := range demos { if strings.HasPrefix(d.FileInfo.Name(), "upload") { uploadSize += d.FileInfo.Size() } }` -- sums ALL upload files | MATCH |
| Behavior: when the total exceeds the budget, oldest uploads are deleted until back under | `pkg/qtv/qtv.go:371-380` | `for i := len(demos)-1; i >= 0 && uploadSize > uploadMaxSize; i-- { ... os.Remove(file); uploadSize -= d.FileInfo.Size() ... }` (demos pre-sorted newest-first, so index from the end = oldest) | MATCH |
| Periodic: a background task checks periodically (~60s) | `pkg/qtv/qtv.go:257-270` | demo-list updater `for { select { case <-t.C: ...; qtv.uploadCleanUp(); t.Reset(60 * time.Second) } }` | MATCH |
| Units: value is in bytes | `pkg/qtv/http.go:56` + `:86` | registered literal `1024*1024*64` (byte count); accessor passes `int64(...Float)` byte count compared against `d.FileInfo.Size()` (bytes) | MATCH |
| Clamp: below 1 MiB -> 1 MiB; above 2 GiB -> 2 GiB | `pkg/qtv/http.go:86` + `pkg/qtv/math.go:38-49` | `i64Bound(1024*1024*1, ..., 1024*1024*1024*2)`; `i64Bound`: `if val<min return min; if val>max return max` (min=1048576, max=2147483648) | MATCH |
| Default: 67108864 bytes (64 MiB) | `pkg/qtv/http.go:56` (WI-2) | `RegEx("http_upload_total_limit", 1024*1024*64, ...)` -- `1024*1024*64` = 67108864 = 64 MiB | MATCH |
| Set by: server config, init-only (cannot change while running) | `pkg/qtv/http.go:56` + `pkg/qtv/var.go:40,139` | flag `qVarFlagInitOnly`; `set()` blocks at `var.go:139` once `qs.initialized` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`uploadTotalLimit`, `uploadCleanUp`, `i64Bound`, `os.Remove`, `FileInfo.Size`, `demoListUpdater`, `qVarFlagInitOnly`, `.Float`), the newest-first sort detail, and the `set()`/`initialized` enforcement mechanism. The user doc states only the admin-observable WHAT (a total disk budget; oldest uploads deleted when exceeded; the clamp bounds in bytes/MiB/GiB), Default, Set-by, and a See-also to the per-file cap.

## Rationale

Cold-synth from fully-legible use-sites. `http_upload_total_limit` is the AGGREGATE disk budget for uploads -- not a per-request reject. Its byte value (clamped to [1 MiB, 2 GiB] by `i64Bound` at `http.go:86`) is read by exactly one consumer, `uploadCleanUp()` (`qtv.go:357`), which sums the sizes of all `upload`-prefixed demo files (`qtv.go:364-369`) and, while that sum exceeds the budget, deletes the oldest uploaded demos via `os.Remove` until the sum is back under the limit (`qtv.go:371-380`; the demo list is sorted newest-first at `qtv.go:341`, so iterating from the end removes oldest). `uploadCleanUp()` runs on the demo-list updater loop about every 60 seconds (`qtv.go:257-270`), so the description says "periodically" rather than naming an exact interval. Default literal `1024*1024*64` = 67108864 bytes = 64 MiB (WI-2, from the `RegEx` literal, not a cfg). Flag `qVarFlagInitOnly` -> Set-by server config, read once at startup, rejected after init (`var.go:139`).

The per-file vs total distinction is the load-bearing one (brief). Verified by call-graph: `uploadTotalLimit()` is consumed ONLY by `uploadCleanUp` (`qtv.go:358`), never by `http.MaxBytesReader`; the per-request cap is the sibling `http_upload_file_limit` (`http.go:362`). So this knob does NOT reject an over-size upload at request time -- a single 64 MiB+ file is still bounded by `http_upload_file_limit` (default 32 MiB) at upload, while this total budget governs how much accumulated upload data is retained on disk. The `See also:` points at `http_upload_file_limit` (action-changing: an admin sizing uploads needs both numbers, and they bound different things).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing line (the size-sum loop, the delete-oldest loop with the `uploadSize > uploadMaxSize` guard, the `i64Bound` clamp, the registered literal, the 60s reset); no clause rests on the knob name or a config comment.

D6 REJECT-LIST: Go-HTTP knob, no C-QTV counterpart; not seeded from `allow_http`/`mvdport`/`admin_password`/`floodprot` (fteqtv-only). `qtv.cfg` is a HINT only (SR-1). `description_provenance` = null (cold-synth, operator clarification 2026-05-30).

## D6Record

```json
{
  "project": "qtv",
  "knob": "http_upload_total_limit",
  "type": "cvar",
  "description": "The combined disk space, in bytes, that uploaded demo files are allowed to occupy on the QTV server. This is a total budget across all uploads, not a per-file limit.\n\nValue is in bytes. A background task checks periodically how much space the uploaded demos take up, and when the total exceeds this budget it deletes the oldest uploaded demos until the total is back under the limit. Out-of-range values are clamped: anything below 1 MiB (1048576 bytes) is treated as 1 MiB, and anything above 2 GiB (2147483648 bytes) is treated as 2 GiB.\n\nDefault: 67108864 bytes (64 MiB).\nSet by: server config (read once at startup; cannot be changed while QTV is running).\nSee also: http_upload_file_limit (the maximum size of a single uploaded demo).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, NULL description, no trailing comment at registration pkg/qtv/http.go:56 (RegEx(\"http_upload_total_limit\", 1024*1024*64, qVarFlagInitOnly, nil)), no shipped-doc candidate -> synthesize from legible use-sites. Tree-wide grep: registration+accessor in pkg/qtv/http.go, single consumer in pkg/qtv/qtv.go. Clauses->cites: TOTAL/aggregate budget (not per-file) -> qtv.go:364-369 sums sizes of ALL 'upload'-prefixed demos (comment 'Calculate how much space occupied by uploads.'); when total exceeds budget delete oldest until under -> qtv.go:371-380 (for ... uploadSize > uploadMaxSize ... os.Remove(file); uploadSize -= Size()); demos sorted newest-first qtv.go:341 so iterating from end = oldest; periodic ~60s -> demoListUpdater loop qtv.go:257-270 calls uploadCleanUp then t.Reset(60*time.Second); units=bytes -> registered byte literal + compared against FileInfo.Size() bytes; clamp 1 MiB..2 GiB -> accessor http.go:85-87 i64Bound(1024*1024*1, ..., 1024*1024*1024*2) with math.go:38-49 (min=1048576, max=2147483648); Default 67108864 bytes=64 MiB -> registered literal 1024*1024*64 (WI-2, math confirmed 1024*1024*64=67108864); Set-by server config + init-only -> flag qVarFlagInitOnly (var.go:40) enforced var.go:139 (set() blocks once qs.initialized). LOAD-BEARING per-file-vs-total distinction (brief): call-graph verified uploadTotalLimit() consumed ONLY by uploadCleanUp (qtv.go:358), NEVER by http.MaxBytesReader; this is a disk-retention budget, NOT a per-request reject -- the per-request cap is the sibling http_upload_file_limit (http.go:362, default 32 MiB). See-also -> http_upload_file_limit (action-changing: they bound different things; admin sizing uploads needs both). No clause rests on name/comment. D6 REJECT-LIST: Go-HTTP knob, no C-QTV counterpart; not seeded from allow_http/mvdport/admin_password/floodprot (fteqtv-only). qtv.cfg is a HINT only (SR-1). Grading: synthesized, high confidence, TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
