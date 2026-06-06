# describe-fill-synthesis ledger -- qtv `masters`

- **Project:** qtv
- **Knob:** `masters` (cvar)
- **Registered name string:** `masters`; registered `pkg/qtv/udp.go:67` (`qtv.qvs.Reg("masters", qwDefaultMasters)`). The runtime value is read via `qtv.qvs.Get("masters")` (`pkg/qtv/udp.go:226`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease = "1.16-dev"`).
- **Mechanical candidate:** none (cold-synth; the register site has no trailing comment. The `qtv.cfg` seed carries a commented hint `// masters provides list of QW master servers.` but is NOT ground truth / NOT a seed per SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line in QTV's OWN Go code (NOT copied from the qwfwd C analogue).
- **Confidence:** high

## QTV-vs-qwfwd divergence note (read first)

This is the QTV-side analogue of qwfwd `masters`, but the Go implementation differs from the qwfwd C one in three ways that change the user doc. Each is traced below:

1. **No per-entry `host:port`.** QTV always appends `:27000` to every entry (`udp.go:236`: `masterStrAddr+":"+qwDefaultMasterPort`). It does NOT split a `:port` suffix. So the entries are bare hostnames; a hostname written with an explicit port would fail to resolve. (qwfwd DOES split host:port -- do not carry that clause here.)
2. **No fixed cap.** The QTV master set is a Go map (`udp.go:46,231`), not a fixed-size array, so there is no "max 8" limit (qwfwd has `MAX_MASTERS 8` -- do not carry that clause here). Duplicates are de-duplicated (`udp.go:240-242`).
3. **QTV is registration-only over UDP.** The QTV UDP server sends heartbeats to these masters but (in this Go code) does not query them for a server list. The heartbeat is what makes the QTV discoverable.

## Halt verdict

```
qtv:masters: synthesized -- cold-synth, no comment; the list of QW master servers this QTV proxy sends heartbeats to so it is discoverable; space-separated bare hostnames, each contacted on UDP port 27000 (QTV appends it -- no host:port form); list rebuilt when changed + re-resolved daily; registered default = 3 built-in masters (SR-3: nQuake may differ, reasoning-only) -- origin=synthesized ref=pkg/qtv/udp.go:235 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> The list of QuakeWorld master servers this QTV proxy registers with by sending periodic heartbeats, so that it shows up in server browsers that read those masters. Entries are hostnames separated by spaces; each is contacted on the standard QuakeWorld master port (27000), which is added automatically, so entries are plain hostnames without a port. Duplicate entries are ignored. Changing the list rebuilds the set of masters, and the addresses are also re-resolved once a day in case their DNS records change.
>
> Default: the 3 built-in QuakeWorld master servers (master.quakeworld.nu, master.quakeservers.net, qwmaster.fodquake.net).
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`"masters"` / `qwDefaultMasters` / `qwDefaultMasterPort` / `mastersUpdate` / `mastersHeartBeat` / `mastersLoop` / `masterUpdateTime` / `masterForcedUpdateTime` / `s2m_heartBeat`) confirms ALL use-sites live in `pkg/qtv/udp.go` -- no use-site anywhere else in `pkg/`. All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Default const | `pkg/qtv/udp.go:33` | `qwDefaultMasters = "master.quakeworld.nu master.quakeservers.net qwmaster.fodquake.net"` -- 3 space-separated masters, no explicit ports |
| Default-port const | `pkg/qtv/udp.go:34` | `qwDefaultMasterPort = "27000"` -- the port appended to every entry |
| Heartbeat interval | `pkg/qtv/udp.go:38` | `masterUpdateTime = time.Minute * 5` -- heartbeat sent every 5 minutes |
| Forced re-resolve interval | `pkg/qtv/udp.go:39` | `masterForcedUpdateTime = time.Hour * 24` -- master addresses re-resolved once per day (DNS may change) |
| Registration | `pkg/qtv/udp.go:67` | `qtv.qvs.Reg("masters", qwDefaultMasters)` -- registers name `masters` + default; `Reg` = flags `0`, no on-change |
| Loop driver | `pkg/qtv/udp.go:209-221` | timer ticks: every `masterUpdateTime` -> `mastersUpdate(false)` + `mastersHeartBeat()`; every `masterForcedUpdateTime` -> `mastersUpdate(true)` |
| Change gate | `pkg/qtv/udp.go:226-229` | `masters := Get("masters")`; `if !masters.Modified.CAS(true,false) && !forceUpdate { return }` -- only rebuild when the cvar changed (or on the forced daily tick) |
| Parse + resolve loop | `pkg/qtv/udp.go:231-249` | clears the map, then `for _, masterStrAddr := range strings.Fields(masters.Str)` resolves `masterStrAddr+":"+qwDefaultMasterPort`; duplicates skipped; resolved entry added to the map |
| Heartbeat send | `pkg/qtv/udp.go:252-262` | builds an `s2m_heartBeat` ("a") packet with a bumped sequence + downstream client count and sends it to every master in the map |

## D5 rubric check (Step 3)

Cold-synth: register site `pkg/qtv/udp.go:67` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. Use-sites are fully source-legible -> SYNTHESIZE (not hedge/residue). Rubric: (1) states admin-observable WHAT (the masters this QTV announces itself to so it is discoverable); (2) not a name restatement (the name is just `masters`; the prose spells the format, the auto-appended port, the de-dup, and the rebuild/re-resolve behavior); (3) format/units spelled (space-separated bare hostnames, port 27000 auto-added) -- this is a list-valued cvar, not an enum, so there is no value=meaning table; (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/udp.go` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: this is the list of MASTER servers the QTV registers with via heartbeats | `pkg/qtv/udp.go:231-249` (parse->map) feeding `:252-262` (heartbeat send) | parse loop builds `sv.masters` from `strings.Fields(masters.Str)`; `mastersHeartBeat` iterates `for _, master := range sv.masters { sv.conn.WriteTo(b, master.addr) }` with `b` an `s2m_heartBeat` packet | MATCH |
| Semantic: the heartbeat is what makes the QTV discoverable in browsers reading those masters | `pkg/qtv/udp.go:256` (heartbeat payload) | `s := fmt.Sprintf("%s\n%v\n%v\n", s2m_heartBeat, sv.mastersSequence, sv.qtv.dss.count())` with `s2m_heartBeat = "a"` (`:29`, the QW server->master heartbeat opcode) -- registering presence + current client count with the master | MATCH |
| Format: entries are space-separated | `pkg/qtv/udp.go:235` | `for _, masterStrAddr := range strings.Fields(masters.Str)` -- `strings.Fields` splits on runs of whitespace | MATCH |
| Format: each entry is a bare hostname; port 27000 is appended automatically (NOT a host:port form) | `pkg/qtv/udp.go:236` + `:34` | `net.ResolveUDPAddr(network, masterStrAddr+":"+qwDefaultMasterPort)` with `qwDefaultMasterPort = "27000"` -- the port is concatenated onto the raw entry; no `:` split is performed anywhere in the loop | MATCH |
| Behavior: duplicate entries are ignored | `pkg/qtv/udp.go:240-242` | `if sv.masters[addr.String()] != nil { continue // Ignore duplicate. }` -- a resolved address already in the map is skipped | MATCH |
| Behavior: changing the list rebuilds the set of masters | `pkg/qtv/udp.go:226-231` | `masters := sv.qtv.qvs.Get("masters"); if !masters.Modified.CAS(true,false) && !forceUpdate { return }` then `sv.masters = map[string]*masterSv{}` (clear) and re-populate -- rebuild happens only when the cvar's `Modified` flag was set (i.e. it changed) or on a forced tick | MATCH |
| Behavior: addresses re-resolved once a day | `pkg/qtv/udp.go:217-219` + `:39` | `case <-forcedUpdateTimer.C: forcedUpdateTimer.Reset(masterForcedUpdateTime); sv.mastersUpdate(true)` with `masterForcedUpdateTime = time.Hour * 24`; the `true` forces `mastersUpdate` past the `Modified` gate so the addresses are re-resolved even when the cvar is unchanged | MATCH |
| Default: the 3 built-in QW masters | `pkg/qtv/udp.go:67` (registration; WI-2) + `:33` (const) | `qtv.qvs.Reg("masters", qwDefaultMasters)` with `qwDefaultMasters = "master.quakeworld.nu master.quakeservers.net qwmaster.fodquake.net"` (exactly 3, space-separated, bare hostnames) | MATCH |
| Set by: server config (registered via `Reg` = flags `0`, no on-change; no command/vote sets it) | `pkg/qtv/udp.go:67` -> `var.go:202-204` (`Reg`) + dispatch `cmd.go:227` -> `var.go:227-241` | `Reg` calls `RegEx(name, value, 0, nil)` -- flags `0`, no `qVarFlagServerInfo`, no on-change; set via the bare `<name> <value>` command form from the config file (`exec`, `cmd.go:305-331`) and the startup command line (`qtv.go:88-90`); no `set` command (commented out, `var.go:84-86`) | MATCH |

NOT carried into the user doc (QTV-vs-qwfwd divergence -- asserting either would be a flavour-C defect imported from the sibling): a `host:port` per-entry form (QTV does not split `:port`; `:236` always appends `:27000`) and a fixed cap such as "max 8" (the QTV master set is a Go `map`, `:46,231`, with no size limit; qwfwd's `MAX_MASTERS 8` has no QTV equivalent). The 5-minute heartbeat interval (`masterUpdateTime`, `:38`) and the internal heartbeat sequence/payload are mechanism detail; the user doc states only the observable "registers with by sending periodic heartbeats" and the daily re-resolve (which an admin can observe as the list picking up DNS changes without a restart).

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`qwDefaultMasters`, `qwDefaultMasterPort`, `masterUpdateTime`, `masterForcedUpdateTime`, `mastersUpdate`, `mastersHeartBeat`, `mastersLoop`, `s2m_heartBeat`, `strings.Fields`, `net.ResolveUDPAddr`, `Modified.CAS`, `qvs.Reg`/`Get`), the map-based dedup mechanism, the timer/CAS control flow, and the heartbeat packet layout. The user doc states only the admin-observable WHAT (the masters this QTV announces to / is discoverable through), the format (space-separated bare hostnames, port 27000 auto-added), the de-dup, the rebuild-on-change + daily re-resolve, Default, and Set-by.

The cross-engine consequence (these are the same QuakeWorld master servers an ezQuake client queries via its own master-list cvars; the heartbeat is what makes THIS QTV discoverable to those clients) is master-server-registration domain context -- it does NOT change how an admin sets `masters` on this QTV, so per D20 and per the qwfwd-masters precedent it is routed to the L3 breadcrumb (SR-5), NOT inlined as a `See also:` and NOT put in the description.

## Rationale

Cold-synth from fully-legible use-sites, traced in QTV's OWN Go code (the qwfwd C analogue was read only to know which clauses must NOT be carried -- see the divergence note). `masters` is the list of QuakeWorld master servers this QTV proxy registers with. The UDP server's `mastersLoop` (`udp.go:198-222`) ticks every `masterUpdateTime` = 5 minutes (`:38`), calling `mastersUpdate(false)` then `mastersHeartBeat()` (`:215-216`); `mastersUpdate` (`:225-250`) reads the cvar, and only rebuilds when its `Modified` flag was set (`:227` `Modified.CAS(true,false)`) or on a forced tick. On rebuild it clears the map and, for each whitespace-separated field of the cvar string (`strings.Fields`, `:235`), resolves `entry + ":27000"` (`:236`, port from `qwDefaultMasterPort` `:34`) and adds the resolved address to the map, skipping duplicates (`:240-242`). `mastersHeartBeat` (`:252-262`) then sends an `s2m_heartBeat` ("a", `:29`) packet -- the QW server->master heartbeat carrying a sequence and the downstream client count -- to every master in the map. That heartbeat is what registers the QTV's presence so it appears in server browsers reading those masters.

Three QTV-specific facts shape the user doc and separate it from the qwfwd sibling: (a) QTV always APPENDS `:27000` and never parses a `:port` suffix (`:236`), so entries are bare hostnames and there is no host:port form; (b) the master set is a Go `map` (`:46,231`) with no fixed size, so there is no cap clause; (c) the forced daily re-resolve (`masterForcedUpdateTime` = 24h, `:39,217-219`) re-resolves addresses even when the cvar is unchanged (`mastersUpdate(true)` bypasses the `Modified` gate), which an admin observes as the list absorbing DNS changes without a restart.

WI-2: registered default is the const `qwDefaultMasters` (`:33`), exactly 3 space-separated masters: `master.quakeworld.nu master.quakeservers.net qwmaster.fodquake.net` (no explicit ports, so each is contacted on 27000). This is read from the `Reg` call/const at `:67`, NOT from a shipped cfg. `Reg` -> `RegEx(name, value, 0, nil)` (`var.go:202-204`): flags `0` -> no `qVarFlagServerInfo`, and no on-change; the only command in this subsystem region is nothing that sets the cvar, so `Set by: server config` (the bare `<name> <value>` form via `CommandIsVar` `var.go:227-241` from `execLine` `cmd.go:227`, fed by the auto-exec'd `qtv.cfg` `qtv.go:90` / `execCmd` `cmd.go:305-331` and the startup command line `qtv.go:88-89`).

SR-3 deployment-default divergence (recorded here, NOT in the description): the SOURCE default lists 3 masters. nQuake-style deployments may add a 4th master in their shipped template (the same pattern flagged for qwfwd, where nQuake adds `qwmaster.ocrana.de`). Describe the SOURCE default (3). The `qtv.cfg` seed (`resources/qtv.cfg:53,56`, commented `// masters provides list of QW master servers.` and `// masters "master.quakeworld.nu master.quakeservers.net qwmaster.fodquake.net"`) corroborates exactly the same 3 masters and is an admissible HINT only, not ground truth and not a seed (SR-1). No C2 conflict (source default and the qtv.cfg hint agree on the 3 masters). `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing parse/resolve/branch/send line in QTV's Go code; no clause rests on the cvar name, a string, or a config comment, and no qwfwd-only clause (host:port, max-8) was imported. [L3 breadcrumb: master-server registration/heartbeat] -- `masters` is the QTV-side sender half of the master-server registration/heartbeat concept-note candidate (a) (SR-5), the cross-engine pair to ezQuake's client-side master querier and to the qwfwd `masters` sender already tagged.

## D6Record

```json
{
  "project": "qtv",
  "knob": "masters",
  "type": "cvar",
  "description": "The list of QuakeWorld master servers this QTV proxy registers with by sending periodic heartbeats, so that it shows up in server browsers that read those masters. Entries are hostnames separated by spaces; each is contacted on the standard QuakeWorld master port (27000), which is added automatically, so entries are plain hostnames without a port. Duplicate entries are ignored. Changing the list rebuilds the set of masters, and the addresses are also re-resolved once a day in case their DNS records change.\n\nDefault: the 3 built-in QuakeWorld master servers (master.quakeworld.nu, master.quakeservers.net, qwmaster.fodquake.net).\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/udp.go:67 (qvs.Reg(\"masters\", qwDefaultMasters)); no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Traced in QTV's OWN Go code; the qwfwd C analogue was read only to know which clauses NOT to carry. Tree-wide grep confirms all use-sites are in pkg/qtv/udp.go only. Clauses->cites: it is the master list the QTV heartbeats/registers with -> parse pkg/qtv/udp.go:231-249 (strings.Fields(masters.Str) -> resolve -> map) feeding mastersHeartBeat :252-262 (WriteTo each master.addr); discoverability via heartbeat -> :256 s2m_heartBeat ('a' opcode :29) payload = sequence + downstream client count. Space-separated -> strings.Fields :235. Bare hostname + auto-appended port 27000 (NO host:port form) -> :236 ResolveUDPAddr(network, masterStrAddr+\":\"+qwDefaultMasterPort) with qwDefaultMasterPort='27000' :34, no ':' split anywhere (DIVERGES from qwfwd which splits host:port -- not carried). Duplicates ignored -> :240-242 (map key present -> continue). Rebuild on change -> :226-231 (Get masters; Modified.CAS(true,false) gate; clear map + repopulate). Daily re-resolve -> :217-219 forcedUpdateTimer + masterForcedUpdateTime=24h :39 (mastersUpdate(true) bypasses Modified gate). Default = 3 built-in masters (WI-2, registered const) -> :67 + qwDefaultMasters :33 ('master.quakeworld.nu master.quakeservers.net qwmaster.fodquake.net', exactly 3 space-separated bare hostnames=port 27000). Set-by server config -> Reg=RegEx(...,0,nil) var.go:202-204 (flags 0, no SERVERINFO, no on-change); set via bare <name> <value> form (CommandIsVar var.go:227-241 from execLine cmd.go:227), fed from auto-exec'd config (exec qtv qtv.go:90; execCmd cmd.go:305-331) and startup cmdline (qtv.go:88-89). NOT carried (QTV-vs-qwfwd divergence, asserting either = flavour-C import): host:port per-entry form (QTV appends :27000, never splits) and a fixed cap/max-8 (QTV master set is a Go map :46,231 with no limit; qwfwd MAX_MASTERS 8 has no QTV equivalent). 5-min heartbeat interval (masterUpdateTime :38) + heartbeat packet layout are mechanism detail, kept out of prose. SR-3 divergence (reasoning-only, NOT in description): source default = 3 masters; nQuake-style templates may add a 4th (same pattern as qwfwd's qwmaster.ocrana.de) -> describe SOURCE default (3). qtv.cfg :53,56 corroborates the same 3 masters (HINT only, SR-1 not a seed). No C2 conflict (source and hint agree on 3 masters). provenance=null (cold-synth, operator 2026-05-30). Grading: synthesized, high confidence, every clause TRACED-CLEAN, no qwfwd-only clause imported. Cross-engine note (same masters an ezQuake client queries; heartbeat makes this QTV discoverable) is non-action-changing for setting this cvar -> routed to the L3 breadcrumb, not the description, not a See-also (D20). [L3 breadcrumb: master-server registration/heartbeat]",
  "description_proposed": null
}
```
