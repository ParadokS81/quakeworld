# describe-fill-synthesis ledger -- qwfwd `masters_filter_servers`

- **Project:** qwfwd
- **Knob:** `masters_filter_servers` (cvar)
- **C variable / registered name string:** both `masters_filter_servers` (no case difference) -- declared `src/query.c:32` (`static cvar_t *masters_filter_servers;`), registered `src/query.c:700` (`masters_filter_servers = Cvar_Get("masters_filter_servers", QW_DEFAULT_SV_FILTER, 0);`).
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; the example config carries a hint comment but is NOT ground truth / NOT a seed).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qwfwd:masters_filter_servers: synthesized -- cold-synth, no comment; an IP blocklist applied to servers discovered from the masters; whitespace-separated addresses, port ignored (IP-only compare), max 16, re-applied (incl. retroactive removal) on change; registered default 127.0.0.1 -- origin=synthesized ref=src/query.c:384 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> A blocklist of server addresses that this proxy should never include in the server list it discovers from the masters. Any server whose address matches an entry here is left out of the proxy's list -- and if it is already on the list, it is removed. Entries are separated by spaces; only the IP address is matched, so any port on an entry is ignored. Changing this list re-applies it immediately. At most 16 entries are kept; any beyond that are ignored.
>
> Default: 127.0.0.1 (blocks the local address, which masters sometimes hand out as an unusable server).
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`masters_filter_servers` / `QW_DEFAULT_SV_FILTER` / `server_filter` / `MAX_SV_FILTERS` / `QRY_FL_`) confirms ALL use-sites live in `src/query.c` -- no use-site anywhere else in `src/`. All sites below at anchor `1.40-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Declaration | `src/query.c:32` | the cvar pointer (locator only) |
| Default macro | `src/query.c:27` | `QW_DEFAULT_SV_FILTER "127.0.0.1"` (comment: "some masters provide unusable servers, filter them") |
| Cap macro | `src/query.c:26` | `MAX_SV_FILTERS 16` -- fixed-size filter array |
| Registration | `src/query.c:700` | registers name + default macro + flags `0` (no SERVERINFO) |
| Change gate | `src/query.c:642-643` | when the cvar is changed, re-apply the filter set; else return |
| Parse + add loop | `src/query.c:649-652` | `COM_Parse(masters_filter_servers->string)` tokenizes; each token -> `QRY_FL_AddFilter` |
| Per-entry port strip | `src/query.c:590-593` (in `QRY_FL_AddFilter`) | strips any `:port` from each entry before resolving (filter is IP-only) |
| Cap enforcement | `src/query.c:582-586` (in `QRY_FL_AddFilter`) | refuses to add past `MAX_SV_FILTERS`; logs "filter list are full!" |
| Filter test (exclude on add) | `src/query.c:384-389` (in `QRY_SV_new`) | a newly-discovered server matching the filter is NOT added to the list |
| IP-only compare | `src/query.c:564-575` (`QRY_FL_Filtered`) | match via `NET_CompareBaseAddress` (base address = IP, port-agnostic) |
| Retroactive removal on change | `src/query.c:620-634` (`QRY_FL_RemoveFilteredServers`) + `:655` | after re-applying filters, already-listed servers matching the filter are freed/removed |

## D5 rubric check (Step 3)

Cold-synth: register site `src/query.c:700` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but D5-amendment requires evaluation anyway. Use-sites are fully source-legible -> SYNTHESIZE (not hedge/residue). Rubric: (1) states admin-observable WHAT (a blocklist excluding matching servers from the proxy's discovered list); (2) not a name restatement (the name says "filter servers"; the prose spells what is filtered, against what list, the IP-only match, the retroactive removal, and the cap); (3) format/units spelled (space-separated addresses, IP-only / port ignored, max 16) -- list-valued cvar, not an enum, so no value=meaning table; (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `src/query.c` at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: it is a blocklist of server addresses excluded from the discovered server list | `src/query.c:384-389` (in `QRY_SV_new`) | `if (QRY_FL_Filtered(&addr)) { ... Sys_DPrintf("filtered: ...") ; return NULL; }` -- a filtered server is not added (function returns NULL before `sv_count++`) | MATCH |
| Semantic: the filtered list it applies to is the servers discovered from the masters | `src/query.c:322` (master-reply -> `QRY_SV_new`) gated through `:384` | `QRY_SV_new(ip, port, true);` (called from `SVC_QRY_ParseMasterReply` for each server in a master reply), and `QRY_SV_new` applies the filter at `:384` | MATCH |
| Format: entries are space-separated | `src/query.c:649` via `token.c` `COM_Parse` | `for ( mlist = masters_filter_servers->string; (mlist = COM_Parse(mlist)); )` -- whitespace tokenizer | MATCH |
| Scope: IP-only match, port ignored (1) parse side | `src/query.c:590-593` (in `QRY_FL_AddFilter`) | `if ((column = strchr(host, ':'))) { column[0] = 0; // get rid of port. }` | MATCH |
| Scope: IP-only match, port ignored (2) compare side | `src/query.c:570` (in `QRY_FL_Filtered`) | `if (NET_CompareBaseAddress(addr, &server_filter.addr[i]))` -- base (IP) compare, not full addr | MATCH |
| Behavior: changing the list re-applies it immediately | `src/query.c:642-657` (in `QRY_FL_CheckVarsModified`, called from `QRY_Frame` `:686`) | `if (!masters_filter_servers->modified) return;` then `QRY_FL_Init();` (clear) + parse/add loop `:649-652` + `QRY_FL_RemoveFilteredServers();` (`:655`) | MATCH |
| Behavior: already-listed matching servers are removed | `src/query.c:620-634` (`QRY_FL_RemoveFilteredServers`) called at `:655` | `for (i = 0; i < server_filter.count; i++) { if ((sv = QRY_SV_ByAddrEx(&server_filter.addr[i], true))) { ... QRY_SV_free(sv, true); } }` | MATCH |
| Cap: at most 16 entries; extras ignored | `src/query.c:26` (`#define MAX_SV_FILTERS 16`) + `:582-586` | `if (server_filter.count >= MAX_SV_FILTERS) { Sys_Printf("failed to add server filter: %s - filter list are full!\n", filter); return false; }` | MATCH |
| Default: 127.0.0.1 | `src/query.c:700` (registration; WI-2) + `:27` (macro) | `Cvar_Get("masters_filter_servers", QW_DEFAULT_SV_FILTER, 0)` with `#define QW_DEFAULT_SV_FILTER "127.0.0.1"` | MATCH |
| Default rationale: masters sometimes hand out the local address as an unusable server | `src/query.c:27` (adjacent comment) | `#define QW_DEFAULT_SV_FILTER "127.0.0.1" // some masters provide unusable servers, filter them.` | MATCH |
| Set by: server config (registered flags `0`; no `CVAR_SERVERINFO`, no command/vote sets it) | `src/query.c:700` (flags arg `0`) | `Cvar_Get("masters_filter_servers", QW_DEFAULT_SV_FILTER, 0)` (third arg `0` = no flags); commands `svlist`/`heartbeat` (`:702-703`) do not set this cvar | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the C identifiers (`QRY_FL_AddFilter`, `QRY_FL_Filtered`, `QRY_FL_RemoveFilteredServers`, `QRY_FL_CheckVarsModified`, `QRY_SV_new`, `NET_CompareBaseAddress`, `COM_Parse`, `QW_DEFAULT_SV_FILTER`, `MAX_SV_FILTERS`, `server_filter`), the `->modified`/`->string` mechanism, and the `Cvar_Get(..., 0)` flag-arg reasoning. The user doc states only the admin-observable WHAT (a blocklist excluding matching servers from the discovered list, with retroactive removal), the format (space-separated, IP-only/port-ignored), the cap (16), Default, and the one-clause default rationale (blocks localhost which masters sometimes hand out) -- stated as user-observable, not as code WHY.

No cross-engine consequence is action-changing for this knob (it is a proxy-local blocklist applied to the proxy's own discovered server list; nothing downstream reads it), so no `See also:` line; the master-server-discovery breadcrumb is recorded in reasoning only (SR-5).

## Rationale

Cold-synth from fully-legible use-sites. `masters_filter_servers` is a blocklist applied to servers the proxy discovers from the master servers. Its string is whitespace-tokenized by `COM_Parse` (`:649`) and each token added via `QRY_FL_AddFilter` (`:651`), which strips any `:port` (`:590-593`) so filtering is by IP address only. The match is `NET_CompareBaseAddress` (`QRY_FL_Filtered` `:570`), a base-address (IP, port-agnostic) compare. The filter is consulted in `QRY_SV_new` (`:384-389`): a newly-discovered server (added from a master reply, `SVC_QRY_ParseMasterReply` -> `QRY_SV_new(ip, port, true)` `:322`) whose IP matches the filter is not added to the proxy's server list. When the cvar changes, `QRY_FL_CheckVarsModified` (`:642-657`) clears and rebuilds the filter set AND calls `QRY_FL_RemoveFilteredServers` (`:655` -> `:620-634`), which removes any servers already on the list that now match -- so the change is retroactive, not only forward-looking. At most `MAX_SV_FILTERS` = 16 (`:26`) entries are kept; entries past the 16th are rejected with a "filter list are full!" log (`:582-586`) -- stated as an admin-observable cap.

Registered default is the macro `QW_DEFAULT_SV_FILTER` = `"127.0.0.1"` (`:27`). WI-2: read from the `Cvar_Get` literal/macro at `:700`, NOT from a shipped cfg. The adjacent comment (`:27`, "some masters provide unusable servers, filter them") supplies the default's rationale; I surfaced it as a user-observable clause (blocks the local address, which masters sometimes list as an unusable server) rather than as code WHY. Flags arg is `0` -> no `CVAR_SERVERINFO`; the only commands registered in this subsystem (`svlist`, `heartbeat` at `:702-703`) do not set the cvar, so `Set by: server config`.

The example config (`resources/example-configs/qwfwd.cfg:33-34`, comment "Specify a list of QW servers which are not allowed to be queried", value `127.0.0.1`) corroborates the default and the blocklist semantics but is an admissible HINT only, not ground truth and not a seed (SR-1). Note the config comment phrases it as "not allowed to be queried"; the enforcing code is slightly more precise -- a filtered server is excluded from the proxy's server LIST (not added / removed), and since the proxy only pings/serves servers on that list, the observable effect is that the filtered server is never queried or advertised. The description states the source-true mechanism (excluded from the list, removed if present), consistent with the config's intent. No SR-3 deployment-default divergence applies to this knob (the 3-vs-4 masters divergence is on the `masters` cvar; both source and the example config set `masters_filter_servers` to `127.0.0.1`). No C2 conflict. `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30 -- provenance holds retained shipped-doc DATA only).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing parse/branch/compare line (incl. the adjacent default-rationale comment at `:27`); no clause rests on the cvar name, an enum/string, or a config comment as its sole source. [L3 breadcrumb: master-server registration/heartbeat] -- `masters_filter_servers` is the discovery-side sanitizer in the master-server registration/discovery concept-note candidate (a): it filters the server list the proxy obtains from the masters (SR-5).

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "masters_filter_servers",
  "type": "cvar",
  "description": "A blocklist of server addresses that this proxy should never include in the server list it discovers from the masters. Any server whose address matches an entry here is left out of the proxy's list -- and if it is already on the list, it is removed. Entries are separated by spaces; only the IP address is matched, so any port on an entry is ignored. Changing this list re-applies it immediately. At most 16 entries are kept; any beyond that are ignored.\n\nDefault: 127.0.0.1 (blocks the local address, which masters sometimes hand out as an unusable server).\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/query.c:700 (Cvar_Get(\"masters_filter_servers\", QW_DEFAULT_SV_FILTER, 0)), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep confirms all use-sites are in src/query.c only. Clauses->cites: it is a blocklist excluding matching servers from the discovered list -> QRY_SV_new src/query.c:384-389 (if QRY_FL_Filtered -> return NULL before sv_count++); the list it filters is servers discovered from masters -> SVC_QRY_ParseMasterReply calls QRY_SV_new(ip,port,true) src/query.c:322, filtered at :384; space-separated -> COM_Parse over masters_filter_servers->string src/query.c:649 (token.c tokenizer); IP-only/port-ignored -> parse side strips ':port' src/query.c:590-593 + compare side NET_CompareBaseAddress src/query.c:570 (base addr); change re-applies immediately -> QRY_FL_CheckVarsModified src/query.c:642-657 (gate on ->modified, FL_Init then re-add); already-listed matches removed (retroactive) -> QRY_FL_RemoveFilteredServers src/query.c:620-634 called at :655; cap 16 + extras ignored -> #define MAX_SV_FILTERS 16 (:26) + QRY_FL_AddFilter src/query.c:582-586 ('filter list are full!'); Default 127.0.0.1 (WI-2, registered macro) -> src/query.c:700 + #define QW_DEFAULT_SV_FILTER '127.0.0.1' (:27); default rationale (masters hand out unusable/local servers) -> adjacent comment :27 'some masters provide unusable servers, filter them'; Set-by server config (flags arg 0, no CVAR_SERVERINFO; commands svlist/heartbeat :702-703 do not set it) -> src/query.c:700. No clause rests solely on name/enum/string/comment; each maps to an enforcing parse/branch/compare (the :27 comment only supplies the default-rationale clause, whose enforcement is the registration literal). Example config resources/example-configs/qwfwd.cfg:33-34 corroborates default+blocklist semantics but is a HINT only (SR-1, not a seed); its comment says 'not allowed to be queried' -- the code is more precise (excluded from / removed from the server list, hence never pinged or advertised); description states the source-true mechanism. No SR-3 divergence on this cvar (3-vs-4 masters is the 'masters' knob; source and example config both set this to 127.0.0.1). No C2 conflict. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). No cross-engine consequence is action-changing (proxy-local blocklist on the proxy's own discovered list) -> no See-also. [L3 breadcrumb: master-server registration/heartbeat]",
  "description_proposed": null
}
```
