# Batch ledger -- QTV cvars batch A (Wave 1)

**Date:** 2026-06-06
**Project:** qtv  **Type:** cvar  **Anchor:** 1.16-dev
**Knobs:** 21 (all cvars) -- all `synthesized`, all V-pass TRACED-CLEAN.
**Workers (4):** W1 qtv.go core (6) / W2 downstream auth+flood (5) / W3 upstream_storage (6) / W4 log+masters (4).

## Per-knob verdicts (all synthesized / TRACED-CLEAN)

| knob | default (source) | primary read-ref | class |
|---|---|---|---|
| address | "" | pkg/qtv/upstream.go:636 | TRACED-CLEAN |
| demo_dir | demos | pkg/qtv/qtv.go:240 | TRACED-CLEAN |
| hostname | unnamed | pkg/qtv/protocol_reader.go:167 | TRACED-CLEAN |
| listen_address | :28000 | pkg/qtv/qtv.go:480 | TRACED-CLEAN (V-pass; cmux single-port) |
| network | "" | pkg/qtv/qtv.go:223 | TRACED-CLEAN (V-pass canary) |
| tick_time | 100 | pkg/qtv/qtv.go:390 | TRACED-CLEAN (V-pass) |
| qtv_password | "" | pkg/qtv/downstream_pending_request.go:118 | TRACED-CLEAN (V-pass; SHA3-512) |
| maxclients | 1000 | pkg/qtv/downstream_storage.go:123 | TRACED-CLEAN (V-pass; SR-3) |
| fp_messages | 4 | pkg/qtv/downstream_client_commands.go:647 | TRACED-CLEAN (V-pass) |
| fp_persecond | 2 | pkg/qtv/downstream_client_commands.go:636 | TRACED-CLEAN (V-pass) |
| fp_secondsdead | 2 | pkg/qtv/downstream_client_commands.go:638 | TRACED-CLEAN (V-pass) |
| parse_delay | 7 | pkg/qtv/upstream_mvd.go:215 | TRACED-CLEAN (V-pass) |
| maxservers | 100 | pkg/qtv/upstream_storage.go:213 | TRACED-CLEAN |
| maxchains | 1 | pkg/qtv/upstream_storage.go:170 | TRACED-CLEAN |
| ustream_read_buf_size | 327680 | pkg/qtv/upstream.go:103 | TRACED-CLEAN |
| ustream_write_buf_size | 32768 | pkg/qtv/upstream.go:104 | TRACED-CLEAN |
| ustream_timeout | 60 | pkg/qtv/upstream_io_tcp.go:67 | TRACED-CLEAN |
| log_level | info | pkg/qtv/log.go:21 | TRACED-CLEAN |
| log_timeformat | 2006-01-02T15:04:05.000 | pkg/qtv/log.go:31 | TRACED-CLEAN |
| log_pretty | 1 | pkg/qtv/log.go:39 | TRACED-CLEAN |
| masters | 3 built-in masters | pkg/qtv/udp.go:235 | TRACED-CLEAN (V-pass) |

## Verification (mother)

- **F-D6a grep-verify (load-bearing read use-sites, confirmed live independently):**
  - fp triplet -> `downstream_client_commands.go` `isSayFlood` (:621-649): `fp_persecond` is the seconds-WINDOW (`curTime-sayTime < fp_persecond*1000`, curTime=UnixMilli), `fp_secondsdead` the silence (`fp.locked = curTime + 1000*fp_secondsdead`), `fp_messages` the ring count (`iBound(1, ..., maxFpCommands)`, maxFpCommands=10). The names are misleading by design; arithmetic traced.
  - maxclients cap+silent-close -> `downstream_storage.go:123` (`len(dss.stream) >= dss.maxClients()` -> `conn.Close()`, comment "silently close incoming connection"); clamp `iBound(0, ..., qtvMaxClients=2048)`; source default 1000 (ParseFloat at register :201).
  - parse_delay anti-ghost -> `upstream_mvd.go:210-219` (`isDemo() -> return 0`; comment "We delay only live games to prevent ghosting"; `bound(0, expectedDelay, 15)`); applied `upstream.go:257` (`parseTime = curTime + delay*1000`).
  - qtv_password dual-direction -> downstream `validateReqAuth` + upstream fallback `qvs.Get("qtv_password").Str` (`downstream_pending_request.go:118`); SHA3-512 via `golang.org/x/crypto/sha3` (NOT crypto.go's XXH3).
  - masters -> `udp.go:235` (`strings.Fields(masters.Str)`), `:236` (always appends `:`+qwDefaultMasterPort=27000), map dedup `:240`, daily re-resolve `masterForcedUpdateTime = time.Hour*24`; default `qwDefaultMasters` = 3 hosts.
  - listen_address single-port -> `qtv.go:487-495` cmux multiplexing (QTV + HTTP same port); UDP same bind `udp.go:73`; init-only enforced via `qVarFlagInitOnly` + `var.go:139-142`.
- **Independent Opus V-pass (B3 cold-context) on all 9 D6-sensitive knobs + network canary:** ALL TRACED-CLEAN. 0 C-FIX, 0 C-NEAR-MISS, 0 WI2-FIX. The cold re-derivation confirmed every flavour-C exclusion held (masters no-host:port/no-cap; fp_persecond window-not-rate; qtv_password real SHA3-512).
- DB untouched (0 qtv described); no worker committed.

## Findings (surfaced to mother / halt report)

1. **F-QTV1 (planning-doc drift, NON-blocking, corrected in briefs):** mother-ledger SR-2 / phase MD Mechanism 2 / handoff name the C-`floodprot` Go equivalent as `fp_time`/`fp_limit`/`fp_message` -- those do NOT exist in Go QTV (verified 0 in pkg/). The real Go flood triplet is `fp_messages`/`fp_persecond`/`fp_secondsdead`. The reject-list's core job (reject the 4 C knobs) is intact; only the orientation hint was wrong. Worker briefs used the corrected names.
2. **D6 flavour-C exclusion working (the teeth bit):** W4 (masters) deliberately EXCLUDED the qwfwd-C clauses (host:port suffix, max-8 cap, 27000-when-omitted) because the Go code does not have them -- a correct C-vs-Go discrimination, independently confirmed by the V-pass. W2 (fp_persecond) caught the name-vs-arithmetic trap.
3. **Breadcrumbs:** (a) master-server registration/heartbeat -> `masters`. (b) MVD streaming + parse_delay ghosting -> BOTH `parse_delay` (the live-stream hold-back, demos exempt) AND `tick_time` (the centralized tick pacing both upstream MVD read + downstream send loops) fire. Candidate (b) is NOT thin -- strong Phase-4 signal. (c) qtv_password cross-codebase auth matrix -> `qtv_password` (See-also MVDSV qtv_password; SHA3-512 challenge or PLAIN).
4. **Non-defect notes (PROC-1, flagged not absorbed):** (a) qtv cvars are also settable at the console via the generic set-var path (var.go:239), not strictly config-only -- `Set by: server config` is the correct primary channel and consistent with the shipped QWFWD half; left as-is. (b) `maxclients=0` strips the serverinfo key entirely rather than publishing "0" (var.go:157-159) -- the publication clause is about the normal case; TRACED-CLEAN.

All 21 description_origin='synthesized', anchor=1.16-dev, provenance=null. No SR-3 divergence folded into any description (maxclients 1000-vs-100 and masters source-default noted in reasoning only).
