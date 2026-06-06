# describe-fill-synthesis ledger -- qwfwd `masters`

- **Project:** qwfwd
- **Knob:** `masters` (cvar)
- **C variable / registered name string:** registered NAME is `masters`; the C variable holding it is `masters_list` -- declared `src/query.c:31` (`static cvar_t *masters_list;`), registered `src/query.c:699` (`masters_list = Cvar_Get("masters", QW_DEFAULT_MASTER_SERVERS, 0);`).
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; the example config carries a hint comment but is NOT ground truth / NOT a seed).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qwfwd:masters: synthesized -- cold-synth, no comment; the master-server address list the proxy registers with / queries; whitespace-separated host[:port] entries (port defaults 27000), rebuilt on change, max 8; registered default = the 3 built-in QW masters (SR-3: nQuake adds a 4th, reasoning-only) -- origin=synthesized ref=src/query.c:192 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> The list of QuakeWorld master servers this proxy talks to -- the masters it registers with (heartbeats) and asks for the current server list. Entries are separated by spaces, and each entry may be a hostname or hostname:port; if no port is given, 27000 is used. Changing this list re-reads it and rebuilds the proxy's set of masters. At most 8 masters are kept; any beyond that are ignored.
>
> Default: the 3 built-in QuakeWorld master servers (master.quakeworld.nu, qwmaster.fodquake.net, master.quakeservers.net).
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`masters` / `masters_list` / `QW_DEFAULT_MASTER_SERVERS` / `MAX_MASTERS` / `QRY_AddMaster`) confirms ALL use-sites live in `src/query.c` -- no use-site anywhere else in `src/`. All sites below at anchor `1.40-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Declaration | `src/query.c:31` | the cvar pointer `masters_list` (locator only) |
| Default macro | `src/query.c:19` | `QW_DEFAULT_MASTER_SERVERS "master.quakeworld.nu qwmaster.fodquake.net master.quakeservers.net"` -- 3 space-separated masters, no explicit ports |
| Default-port macro | `src/query.c:20` | `QW_DEFAULT_MASTER_SERVER_PORT 27000` -- port used when an entry omits `:port` |
| Cap macro | `src/query.c:22` | `MAX_MASTERS 8` -- fixed-size master array |
| Registration | `src/query.c:699` | registers name `masters` + default macro + flags `0` (no SERVERINFO) |
| Change gate | `src/query.c:181-186` | force-reinit timer sets `modified`; if `masters` (or `masters_query`) changed, rebuild; else return |
| Parse + add loop | `src/query.c:192-195` | `COM_Parse(masters_list->string)` tokenizes the string; each token -> `QRY_AddMaster` |
| Per-entry host:port split + default port | `src/query.c:114-120` | splits `host:port` on `:`; `port = (port>0 && port<65535) ? port : 27000` |
| Slot-fill (cap enforcement) | `src/query.c:140-155` | fills first unused slot in the `MAX_MASTERS`-size array; if none free, "failed to add" (entries past 8 dropped) |
| Use: query masters | `src/query.c:212-222` | the registered masters are the ones queried for the server list (gated by `masters_query`) |
| Use: heartbeat masters | `src/query.c:252-258` | the registered masters are the ones sent heartbeats (gated by `masters_heartbeat`) |

## D5 rubric check (Step 3)

Cold-synth: register site `src/query.c:699` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but D5-amendment requires evaluation anyway. Use-sites are fully source-legible -> SYNTHESIZE (not hedge/residue). Rubric: (1) states admin-observable WHAT (the address book of masters the proxy registers with and queries); (2) not a name restatement (the name is just `masters`; the prose spells the format, the port default, the rebuild-on-change behavior, and the cap); (3) format/units spelled (space-separated, host or host:port, default port 27000, max 8) -- this is a list-valued cvar, not an enum, so there is no value=meaning table; (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `src/query.c` at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: this is the list of MASTER servers the proxy registers with / queries | `src/query.c:192-195` (parse) feeding `src/query.c:212-222` (query) + `:252-258` (heartbeat) | `for ( mlist = masters_list->string; (mlist = COM_Parse(mlist)); ) { QRY_AddMaster(com_token); }`; the resulting `masters.master[]` is iterated in `QRY_QueryMasters` (`NET_SendPacket(... QW_MASTER_QUERY ...)` `:222`) and `QRY_HeartbeatMasters` (`NET_SendPacket(..., string, &m->addr)` `:258`) | MATCH |
| Format: entries are space-separated | `src/query.c:192` via `token.c` `COM_Parse` | `COM_Parse(mlist)` -- whitespace tokenizer (`token.c:16+`); each token is one master | MATCH |
| Format: each entry is host or host:port | `src/query.c:114-119` (in `QRY_AddMaster`) | `strlcpy(host, master, ...); if ((column = strchr(host, ':'))) { column[0] = 0; port = atoi(column + 1); }` | MATCH |
| Default port 27000 when `:port` omitted | `src/query.c:120` (clamp) + `:20` (macro) | `port = (port > 0 && port < 65535) ? port : QW_DEFAULT_MASTER_SERVER_PORT;` with `#define QW_DEFAULT_MASTER_SERVER_PORT 27000` | MATCH |
| Behavior: changing the list re-reads it and rebuilds the master set | `src/query.c:185-195` (in `QRY_CheckMastersModified`, called from `QRY_Frame` `:687`) | `if (!masters_list->modified && !masters_query->modified) return;` then `QRY_MastersInit();` (clears) then the parse/add loop `:192-195` | MATCH |
| Cap: at most 8 masters; extras ignored | `src/query.c:22` (`#define MAX_MASTERS 8`) + `:140-155` (slot fill) | add loop scans `master[MAX_MASTERS]` for a free slot; if none, falls through to `Sys_Printf("failed to add master server: %s\n", master); return false;` (`:154`) | MATCH |
| Default: the 3 built-in QW masters | `src/query.c:699` (registration; WI-2) + `:19` (macro) | `Cvar_Get("masters", QW_DEFAULT_MASTER_SERVERS, 0)` with `#define QW_DEFAULT_MASTER_SERVERS "master.quakeworld.nu qwmaster.fodquake.net master.quakeservers.net"` (exactly 3, space-separated) | MATCH |
| Set by: server config (registered flags `0`; no `CVAR_SERVERINFO`, no command/vote sets it) | `src/query.c:699` (flags arg `0`) | `Cvar_Get("masters", QW_DEFAULT_MASTER_SERVERS, 0)` (third arg `0` = no flags); only commands in `QRY_Init` are `svlist` + `heartbeat` (`:702-703`), neither sets this cvar | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the C identifiers (`masters_list`, `QRY_AddMaster`, `QRY_CheckMastersModified`, `QRY_QueryMasters`, `QRY_HeartbeatMasters`, `COM_Parse`, `QW_DEFAULT_MASTER_SERVERS`, `QW_DEFAULT_MASTER_SERVER_PORT`, `MAX_MASTERS`), the `->modified`/`->string` mechanism, the `Cvar_Get(..., 0)` flag-arg reasoning, and the heartbeat/query interval constants. The user doc states only the admin-observable WHAT (the masters the proxy registers with/queries), the format (space-separated, host[:port], default port 27000), the rebuild-on-change behavior, the cap (8), Default, and Set-by.

The cross-engine consequence (these masters are the same QuakeWorld master servers an ezQuake client queries via its own master-list cvars; the heartbeat is what makes this proxy DISCOVERABLE to those clients) is master-server-registration domain context -- it does NOT change how an admin sets `masters` on this proxy, so per D20 it is routed to the L3 breadcrumb (SR-5) in reasoning, NOT inlined as a `See also:` and NOT put in the description.

## Rationale

Cold-synth from fully-legible use-sites. `masters` (C variable `masters_list`) is the address book of QuakeWorld master servers this proxy interacts with. Its string is whitespace-tokenized by `COM_Parse` (`:192`) and each token added via `QRY_AddMaster` (`:194`), which splits an optional `:port` and defaults the port to `27000` (`:114-120`). The resulting master set is what `QRY_QueryMasters` queries for the server list (`:212-222`) and what `QRY_HeartbeatMasters` sends heartbeats to (`:252-258`) -- i.e. the masters this proxy registers with and discovers servers through. The list is rebuilt whenever the cvar is changed (`QRY_CheckMastersModified` `:185-195`), and there is also a periodic forced re-init (`:178-182`) to absorb DNS changes (an internal robustness detail, not stated in the user doc). At most `MAX_MASTERS` = 8 (`:22`) entries are kept; entries past the 8th find no free slot and are dropped with a "failed to add" log (`:140-155`) -- stated as an admin-observable cap.

Registered default is the macro `QW_DEFAULT_MASTER_SERVERS` (`:19`), exactly 3 space-separated masters: `master.quakeworld.nu qwmaster.fodquake.net master.quakeservers.net` (no explicit ports, so each resolves to port 27000). WI-2: this is read from the `Cvar_Get` literal/macro at `:699`, NOT from a shipped cfg. Flags arg is `0` -> no `CVAR_SERVERINFO`; the only commands registered in this subsystem (`svlist`, `heartbeat` at `:702-703`) do not set the cvar, so `Set by: server config`.

SR-3 deployment-default divergence (recorded here, NOT in the description): the SOURCE default lists 3 masters. nQuake's shipped template adds a 4th master, `qwmaster.ocrana.de`, so an nQuake-installed QWFWD will appear to default to 4 masters. The describe-fill default is the SOURCE default (3). The example config (`resources/example-configs/qwfwd.cfg:24-25`, comment "Quakeworld master servers help your QWFWD be found by users", value `master.quakeworld.nu:27000 qwmaster.fodquake.net:27000 master.quakeservers.net:27000`) corroborates the same 3 masters (here written with explicit `:27000` ports, which resolve identically to the source default's bare hostnames) and corroborates the format -- it is an admissible HINT only, not ground truth and not a seed (SR-1). No C2 conflict (source default and example config agree on the 3 masters; the only divergence is the nQuake 4th-master template, flagged above per SR-3). `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30 -- provenance holds retained shipped-doc DATA only).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing parse/branch/compare line; no clause rests on the cvar name, an enum/string, or a config comment. [L3 breadcrumb: master-server registration/heartbeat] -- `masters` is the proxy-side sender half of the master-server registration/discovery concept-note candidate (a), the cross-codebase pair to ezQuake's client-side master querier (SR-5).

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "masters",
  "type": "cvar",
  "description": "The list of QuakeWorld master servers this proxy talks to -- the masters it registers with (heartbeats) and asks for the current server list. Entries are separated by spaces, and each entry may be a hostname or hostname:port; if no port is given, 27000 is used. Changing this list re-reads it and rebuilds the proxy's set of masters. At most 8 masters are kept; any beyond that are ignored.\n\nDefault: the 3 built-in QuakeWorld master servers (master.quakeworld.nu, qwmaster.fodquake.net, master.quakeservers.net).\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/query.c:699 (Cvar_Get(\"masters\", QW_DEFAULT_MASTER_SERVERS, 0); registered NAME 'masters', C var masters_list), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep confirms all use-sites are in src/query.c only. Clauses->cites: it is the master-server list the proxy queries+heartbeats -> parse src/query.c:192-195 (COM_Parse over masters_list->string -> QRY_AddMaster) feeding QRY_QueryMasters src/query.c:212-222 (QW_MASTER_QUERY send :222) and QRY_HeartbeatMasters src/query.c:252-258 (heartbeat send :258); space-separated -> COM_Parse tokenizer (token.c:16+); host or host:port -> src/query.c:114-119 (strchr ':' split); default port 27000 -> src/query.c:120 clamp to QW_DEFAULT_MASTER_SERVER_PORT (macro :20); rebuild on change -> QRY_CheckMastersModified src/query.c:185-195 (gate on ->modified, MastersInit then re-add); cap 8 + extras ignored -> #define MAX_MASTERS 8 (:22) + slot-fill loop src/query.c:140-155 (no free slot -> 'failed to add' :154); Default = 3 built-in masters (WI-2, registered macro) -> src/query.c:699 + macro QW_DEFAULT_MASTER_SERVERS :19 ('master.quakeworld.nu qwmaster.fodquake.net master.quakeservers.net', exactly 3 space-separated, bare hostnames=port 27000); Set-by server config (flags arg 0, no CVAR_SERVERINFO; commands svlist/heartbeat at :702-703 do not set it) -> src/query.c:699. No clause rests on name/enum/string/comment; each maps to an enforcing parse/branch/compare. SR-3 divergence (reasoning-only, NOT in description): source default = 3 masters; nQuake template adds a 4th, qwmaster.ocrana.de -> describe SOURCE default (3). Example config resources/example-configs/qwfwd.cfg:24-25 corroborates the same 3 masters (written with explicit :27000 ports, resolving identically) + the format, but is a HINT only (SR-1, not a seed). No C2 conflict (source and example config agree on 3 masters; only the nQuake template adds a 4th, flagged per SR-3). Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). Cross-engine note (these are the same masters an ezQuake client queries; heartbeat makes this proxy discoverable) is non-action-changing for setting this cvar -> routed to the L3 breadcrumb, not the description, not a See-also (D20). [L3 breadcrumb: master-server registration/heartbeat]",
  "description_proposed": null
}
```
