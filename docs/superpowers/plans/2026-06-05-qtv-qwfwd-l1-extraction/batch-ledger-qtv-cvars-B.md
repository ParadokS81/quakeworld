# Batch ledger -- QTV cvars batch B (Wave 2)

**Date:** 2026-06-06
**Project:** qtv  **Type:** cvar  **Anchor:** 1.16-dev
**Knobs:** 19 (all cvars) -- all `synthesized`, all V-pass TRACED-CLEAN.
**Workers (4):** W5 http core (4) / W6 http uploads+TLS (5) / W7 allow_download family (7) / W8 dstream buffers (3).

## Per-knob verdicts (all synthesized / TRACED-CLEAN)

| knob | default (source) | primary read-ref | class |
|---|---|---|---|
| http_enabled | 1 | pkg/qtv/qtv.go:493 (cmux gate) | TRACED-CLEAN (V-pass; D6 allow_http equiv) |
| http_readtimeout | 45 | pkg/qtv/http.go:67 | TRACED-CLEAN (1..60s) |
| http_writetimeout | 600 | pkg/qtv/http.go:72 | TRACED-CLEAN (1..900s=15min) |
| http_idletimeout | 60 | pkg/qtv/http.go:77 | TRACED-CLEAN (1..60s) |
| http_upload_enabled | 1 | pkg/qtv/http.go:340 | TRACED-CLEAN (403 when off) |
| http_upload_total_limit | 67108864 (64 MiB) | pkg/qtv/qtv.go:372 | TRACED-CLEAN (V-pass; disk-retention) |
| http_upload_file_limit | 33554432 (32 MiB) | pkg/qtv/http.go:362 | TRACED-CLEAN (V-pass; per-file reject) |
| http_server_cert_file | "" | pkg/qtv/http.go:569 | TRACED-CLEAN (TLS; empty=HTTP) |
| http_server_key_file | "" | pkg/qtv/http.go:569 | TRACED-CLEAN (TLS; empty=HTTP) |
| allow_download | 1 | pkg/qtv/downstream_client_commands.go:421 | TRACED-CLEAN (V-pass; master gate) |
| allow_download_skins | 1 | downstream_client_commands.go:432 (skins/) | TRACED-CLEAN |
| allow_download_models | 1 | downstream_client_commands.go:434 (progs/) | TRACED-CLEAN (V-pass; progs not models) |
| allow_download_sounds | 1 | downstream_client_commands.go:436 (sound/) | TRACED-CLEAN (singular sound/) |
| allow_download_maps | 1 | downstream_client_commands.go:438 (maps/) | TRACED-CLEAN |
| allow_download_demos | 1 | downstream_client_commands.go:440 | TRACED-CLEAN (V-pass; ext whitelist) |
| allow_download_other | 1 | downstream_client_commands.go:442 (fallthrough) | TRACED-CLEAN |
| dstream_read_buf_size | 32768 | pkg/qtv/downstream.go:68 | TRACED-CLEAN (downstream) |
| dstream_write_buf_size | 65536 | pkg/qtv/downstream.go:69 | TRACED-CLEAN (downstream) |
| dstream_timeout | 30 | pkg/qtv/downstream.go:415 | TRACED-CLEAN (1..999999s send-deadline) |

## Verification (mother)

- **F-D6a grep-verify (load-bearing claims, confirmed live independently):**
  - allow_download cascade (downstream_client_commands.go:405-443): `allow:=false`; `if !Get("allow_download").Bool {}` (master off -> stays false -> deny); else-if exclusions (`fileNameHasSensitiveExtension` .cfg/.key, `name[0]=='.'`, `name[0]=='/'`, `!strings.Contains(name,"/")`); else-if per-type `skins/`/`progs/`(models)/`sound/`/`maps/`/isDemo(`&& demoNameHasValidExtension`)/else(other). Hierarchical AND confirmed; progs/-not-models/ confirmed.
  - http_upload_total_limit -> `uploadCleanUp` (qtv.go:371-377): `for ... uploadSize > uploadMaxSize ... os.Remove(file)` -- deletes oldest uploads; run every 60s (demoListUpdater). Disk-retention, NOT per-request reject.
  - http_upload_file_limit -> `http.MaxBytesReader(w, r.Body, sv.uploadFileLimit())` (http.go:362, comment "Limit upload size of one file by 32 megabytes") -- per-file reject.
  - http_enabled -> `if qtv.httpSv.isEnabled() { httpListener = mux.Match(cmux.Any()) }` (qtv.go:493) + serve goroutine gated on `httpListener != nil` (:503-505). Go cmux gate, NOT C allow_http (absent from pkg/).
- **Independent Opus V-pass (B3 cold) on http_enabled (D6) + http_upload_total_limit + http_upload_file_limit + allow_download + allow_download_models + allow_download_demos:** ALL TRACED-CLEAN. 0 defects. Cold re-derivation confirmed the disk-retention-vs-perfile distinction (two separate enforcement sites), the progs/ keying, the .mvd/.gz/.zip/.bz2 whitelist (demosAllowedExtentions), and the cmux gate.
- DB untouched; no worker committed.

## Findings (surfaced to mother / halt report)

1. **http upload limits -- the names mislead, source corrects:** `http_upload_total_limit` is an AGGREGATE disk-retention budget enforced by a periodic cleanup that DELETES OLDEST uploads (not a per-upload reject); `http_upload_file_limit` is the PER-FILE reject (`MaxBytesReader`). Two different mechanisms, two different sites. Descriptions state the traced behavior.
2. **allow_download path-keying source truth:** `allow_download_models` gates the `progs/` prefix (Quake stores models in progs/, not models/); `allow_download_sounds` gates singular `sound/`; `allow_download_demos` additionally requires a recognized extension (.mvd/.gz/.zip/.bz2); `allow_download_other` is the fallthrough for subdirectory files in none of the named categories. Always-refused regardless of any toggle: .cfg/.key extensions, leading-dot names, absolute paths, files not in a subdirectory.
3. **HTTP server:** the built-in web interface shares listen_address's port via cmux multiplexing (no extra port); HTTPS requires BOTH http_server_cert_file AND http_server_key_file non-empty (else plain HTTP); a bad/missing cert makes the server fail to start and QTV shut down. All http_* are qVarFlagInitOnly (set before start; no effect on a running proxy) -- the init-only flag is actually enforced (var.go:139-142).
4. **dstream ringbuffer internal deliberately NOT asserted (Step 4 confabulation guard):** dstream_read/write_buf_size pass to `ringbuffer.NewExtended` in third-party `github.com/qqshka/ringbuffer` (not vendored); the adjacent "Underlying buffer is two times more" comment is NOT traceable, so the descriptions state only the source-legible requested byte size. Same as the ustream pair in batch A.
5. **No breadcrumbs in this wave** (http/download/buffer knobs are not master-server/streaming/auth concept-note candidates).

All 19 description_origin='synthesized', anchor=1.16-dev, provenance=null.
