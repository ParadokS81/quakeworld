# Batch ledger -- QWFWD cvars (QWFWD-1 cluster)

**Date:** 2026-06-06
**Project:** qwfwd  **Type:** cvar  **Anchor:** 1.40-dev
**Knobs:** 13 (all cvars) -- all `synthesized`, all V-pass TRACED-CLEAN.
**Waves:** calibration (masters_query, masters_heartbeat) + cvar wave (remaining 11).

## Per-knob verdicts

| knob | verdict | default | primary ref | class |
|---|---|---|---|---|
| masters_query | synthesized | 1 | src/query.c:209 | TRACED-CLEAN |
| masters_heartbeat | synthesized | 1 | src/query.c:238 | TRACED-CLEAN |
| masters | synthesized | 3 built-in masters | src/query.c:192 / :19 | TRACED-CLEAN (independent V-pass) |
| masters_filter_servers | synthesized | 127.0.0.1 | src/query.c:384 / :27 | TRACED-CLEAN |
| net_ip | synthesized | 0.0.0.0 (F11) | src/net.c:271 | TRACED-CLEAN |
| net_port | synthesized | 30000 (F11) | src/net.c:274 / qwfwd.h:121 | TRACED-CLEAN |
| hostname | synthesized | "unnamed qwfwd" | src/svc.c:242 (serverinfo) | TRACED-CLEAN |
| maxclients | synthesized | 128 | src/svc.c:240 | TRACED-CLEAN |
| developer | synthesized | 0 | src/sys.c:156 | TRACED-CLEAN |
| city | synthesized | empty | src/cvar.c:189 (serverinfo) | TRACED-CLEAN |
| coords | synthesized | empty | src/cvar.c:189 | TRACED-CLEAN |
| countrycode | synthesized | empty | src/cvar.c:189 | TRACED-CLEAN |
| hostport | synthesized | empty | src/cvar.c:189 | TRACED-CLEAN |

## Verification (mother)

- **F-D6a grep-verify (load-bearing facts, confirmed live):**
  - `QWFWD_DEFAULT_PORT 30000` -> src/qwfwd.h:121.
  - net_ip/net_port real defaults -> src/net.c:271-284 (`ip = (*ps.params.ip) ? ps.params.ip : "0.0.0.0"`; port snprintf w/ QWFWD_DEFAULT_PORT). CLI is positional `qwfwd [port [ip]]`; cfg `set` works; cmdline overrides via Cvar_FullSet (net.c:276-284).
  - `QW_DEFAULT_MASTER_SERVERS` = exactly 3 hosts (master.quakeworld.nu qwmaster.fodquake.net master.quakeservers.net) -> src/query.c:19.
  - `QW_DEFAULT_SV_FILTER "127.0.0.1"` -> src/query.c:27.
  - serverinfo mirror -> src/cvar.c:184-189 (`if (var->flags & CVAR_SERVERINFO) ... Info_SetValueForStarKey(ps.info,...)`); published in status reply -> src/svc.c:362 (`SVC_Status`).
- **Independent V-pass canary (`masters`):** TRACED-CLEAN; all 6 clauses MATCH (incl. callee QRY_AddMaster port-27000 default, MAX_MASTERS=8, the 3 named hosts, flags=0 -> server config only).
- **Apply pipeline:** dry-run of synthesize-qwfwd.ts --from-ledger over the calibration subset = parsed/persisted with 0 errors, fingerprint computed + rolled back.

## Findings (surfaced to mother / halt report)

1. **Flavour-C trap (stale source comment), caught not absorbed:** `src/qwfwd.h:193` comments `S2M_HEARTBEAT` as "+ serverinfo + userlist + fraglist", but the heartbeat builder (`src/query.c:246`) sends only the sequence + live peer count. hostname/maxclients were described via the status reply (ps.info -> SVC_Status), NOT as advertised to the masters. Watch for recurrence in *version / QTV knobs.
2. **F11 CLI wording imprecise (descriptions are correct):** F11/SR-8 say "when no -ip cmdline" -- there is NO `-ip` flag; the CLI is positional `qwfwd [port [ip]]` (main.c:223/228/229). A `set net_ip/net_port` in qwfwd.cfg DOES take effect (exec before NET_Init); a command-line value force-overrides the cfg. The net_ip/net_port descriptions surface the true positional shape. (No fix needed -- descriptions correct; F11 column default stays the source-true variable name per SR-8.)
3. **SR-5 breadcrumbs captured (candidate (a) master-server registration/heartbeat):** masters, masters_query, masters_heartbeat, masters_filter_servers -- 4 tags in description_reasoning. (Candidate (b) parse_delay/tick_time and (c) qtv_password are QTV-side, pending.)

All 13 description_origin='synthesized', anchor=1.40-dev, provenance=null. No SR-3 divergence applied to any (the 3-vs-4 masters divergence is on `masters`, noted in its reasoning only).
