# Batch ledger -- QWFWD cmdline_param + info_key (final QWFWD wave)

**Date:** 2026-06-06
**Project:** qwfwd  **Anchor:** 1.40-dev
**Knobs:** 8 -- 2 cmdline_param + 6 info_key. All `synthesized`, all TRACED-CLEAN.
**F15:** the 6 info_keys were the last of the 11 source_inline stubs -> all converted to `synthesized`. F15 FULLY RESOLVED (5 commands earlier + 6 info_keys here = 11).

## Per-knob verdicts (all synthesized / TRACED-CLEAN)

| knob | type | ref | note |
|---|---|---|---|
| port | cmdline_param | src/main.c:228 | positional argv[1]; default 30000; See also net_port |
| ip | cmdline_param | src/main.c:229 | positional argv[2]; default 0.0.0.0; See also net_ip |
| challenge:userinfo | info_key | src/clc.c:116 / svc.c:235 | Q3-path connect token; in=verify, out=inject dest token |
| name:userinfo | info_key | src/peer.c:76 | client display name; proxy reads + remembers |
| protocol:userinfo | info_key | src/svc.c:228 | Q3-path version; READ BUT NOT ENFORCED (svc.c:157 #if 0) |
| qport:userinfo | info_key | src/svc.c:232 | Q3-path client qport; read + relayed |
| prx:userinfo | info_key | src/svc.c:247/264/269 | forward destination (host / host:port / proxyB@host chain); removed/rewritten before final hop |
| *qwfwd:userinfo | info_key | src/svc.c:290 | proxy version stamp (QWFWD_VERSION_SHORT); server-controlled (* key); client cannot set |

## Verification (mother)

- **F-D6a grep-verify (load-bearing info_key claims, confirmed live):**
  - `*qwfwd` stamp -> src/svc.c:290 `Info_SetValueForStarKey(userinfo, "*qwfwd", QWFWD_VERSION_SHORT, ...)` (comment :289 "so server/proxy can detect that client use qwfwd").
  - protocol not-enforced -> src/svc.c:157 `#if 0 // who care which version it is?` (the worker's "read but not enforced" is source-true; a version-gate clause here would have been a flavour-C defect).
- **Dry-run apply (all 50 qwfwd ledgers):** parsed=50, persisted=50 (dry-run), errors=0.
- **LIVE apply (all 50 qwfwd ledgers):** persisted=50, errors=0, skipped-terminal=0. Committed fingerprint 6a871898f40abb57dac99d0a7e1b782c (== dry-run fp, deterministic).
- **Boundary (qwfwd half):** V1 coverage missing=0 (cvar 13 / command 29 / cmdline_param 2 / info_key 6); V2 origin = `synthesized` only (50); V3 anchor_null=0; V7 prov_text=0; V8 idempotency re-apply skipped-terminal=50 / persisted=0 / fingerprint unchanged.

## Findings (surfaced to halt report)

1. **protocol:userinfo version check is `#if 0` (svc.c:157)** -- read but not enforced on the Q3 path; described honestly (flavour-C trap avoided).
2. **challenge / protocol / qport are Q3-protocol-path-only userinfo reads** -- on standard QW protocol those values are positional connect args (clc.c:17 / svc.c:207-214), not userinfo keys. prx / name / *qwfwd are protocol-agnostic. Scope clause traced into every relevant description.
3. SR-5: no master/parse_delay/qtv_password breadcrumbs from this wave (all client-forwarding handshake keys).
