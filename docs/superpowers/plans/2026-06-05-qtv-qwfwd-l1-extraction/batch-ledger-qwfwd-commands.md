# Batch ledger -- QWFWD commands (QWFWD-2/3 clusters)

**Date:** 2026-06-06
**Project:** qwfwd  **Type:** command  **Anchor:** 1.40-dev
**Knobs:** 29 (all commands) -- all `synthesized`, all V-pass self-class TRACED-CLEAN.
**Waves:** cmd-A (ban/whitelist/query, 13) + cmd-B (cvar/cmd-buffer/misc, 16).

## Per-subsystem verdicts (all synthesized / TRACED-CLEAN)

- **IP filter list (src/ban.c):** addip, removeip, listip, writeip, banip, banremove, banlist. ONE shared in-memory list `ipfilters[MAX_IPFILTERS=1024]`; only `ipft_ban` entries block (SV_IsBanned ban.c:75); `safe` entries protect from banip. banip = wrapper buffering `addip ... ban` + writeip. banremove takes a banlist ID; removeip takes an IP. Auto-restored from `qwfwd_listip.cfg` at startup.
- **Destination whitelist (src/whitelist.c):** whitelist, whitelistadd, whitelistremove, whitelistpurge. Gates the DESTINATION server the proxy forwards TO (peer.c consumer), NOT the client source. Empty = allow-all (opt-in); cap 4096; auto-purged on config reload.
- **Master query (src/query.c):** heartbeat [breadcrumb (a)], svlist. heartbeat forces a beat but does NOT bypass the masters_heartbeat gate; svlist prints the cached discovered-server list (no breadcrumb).
- **Cvar manipulation (src/cvar.c):** cvarlist [SR-7], toggle, set, inc.
- **Alias / control-flow (src/cmd.c):** alias [SR-7], unalias, unaliasall, if (operators ==,=,!=,<>,>,<,>=,<=,isin,!isin; numeric-vs-string auto).
- **Command buffer / exec (src/cmd.c, src/fs.c):** echo [SR-7], exec (qwfwd dir then qw; .cfg only; rejects abs/.. paths; front-inserts), wait [SR-7], cmdlist.
- **Misc:** help, quit (clean vs immediate-with-arg), cllist (id/from/to/minutes/name), serverinfo [SR-7].

## SR-7 conversions (5 of the 11 source_inline stubs) -- all now synthesized

cvarlist, alias, echo, wait, serverinfo. Each stub (raw C comment / `TODO` / misspelling) was IGNORED and re-synthesized fresh from the handler. End state description_origin='synthesized'. (Remaining 6 source_inline = the info_keys, next wave.)

## Verification (mother)

- **F-D6a grep-verify (structural claims, confirmed live):**
  - ban shared list + ban-only-blocks: src/ban.c:38 (MAX_IPFILTERS 1024), :56 (ipfilters[]), :75 (`type == ipft_ban`); SV_IsBanned called peer.c:48/255/326.
  - whitelist cap: src/whitelist.c:3 (WHITELIST_MAX_ADDRS 4096).
  - access model (no own rcon): src/svc.c:465 (`// we do not have own rcon command, we forward it to the server`). QWFWD Cmd dispatch has no access tiers -> "Set by: server console / config" is source-true for all 29.
- **V-pass calibration note:** for the QWFWD command set (lower flavour-C risk; admin ops, no thresholds/polarity), the mechanical grep-verify of structural claims served as the per-wave canary instead of a separate Opus V-pass worker. Opus independent V-pass workers are reserved for the QTV D6-sensitive knobs (Layer-4 semantic teeth). Workers self-classified TRACED-CLEAN with genuine enforce-trace (multiple flavour-C traps caught: stale ban.c header, whitelist destination-vs-source, alias shadowing, heartbeat-gate).

## Findings (surfaced to halt report)

1. **Access model (cross-cutting):** QWFWD has NO command access-class system and NO own rcon command (rcon is forwarded to the backend server, svc.c:464-465). All commands are console/config only; this is source-verified, not name-inferred.
2. **Stale ban.c header comment** (mvdsv-derived): documents `filterban` (dead/commented out), `listip.cfg` (real: qwfwd_listip.cfg), and "not saved/restored by default" (real: auto-exec'd at startup). Descriptions reflect live code, not the comment.
3. SR-5: heartbeat carries the master-server breadcrumb; svlist does not (cached-list print only).

All 29 description_origin='synthesized', anchor=1.40-dev, provenance=null.
