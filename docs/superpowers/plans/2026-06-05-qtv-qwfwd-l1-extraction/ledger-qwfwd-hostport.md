# describe-fill-synthesis ledger -- qwfwd `hostport`

- **Project:** qwfwd
- **Knob:** `hostport` (cvar)
- **C variable / registered name string:** both `hostport` (no case difference) -- declared `src/main.c:18` (`cvar_t *hostport;`) + `src/qwfwd.h:227` (`extern`), registered `src/main.c:130` (`hostport = Cvar_Get("hostport", "", CVAR_SERVERINFO);`).
- **Anchor version:** `1.40-dev` (per mother ledger; `src/qwfwd.h:118` `QWFWD_VERSION_SHORT "1.40-dev"`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; the example config carries a hint comment but is NOT ground truth / NOT a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- the serverinfo-mirror behavior is fully source-legible; every asserted clause enforce-traced. The critical clause (advertised port, NOT the bound listen port) is traced to disprove the name-inferred "sets the port" reading.
- **Confidence:** high

## Halt verdict

```
qwfwd:hostport: synthesized -- cold-synth, no comment; pure CVAR_SERVERINFO mirror cvar with zero ->integer/->string reads, so it advertises a host:port value in the proxy's server info but does NOT bind the listen port (that is net_port); empty default = key absent/unadvertised; every clause enforce-traced -- origin=synthesized ref=src/cvar.c:189 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Sets the address and port that this proxy advertises in its server info, so server browsers and connecting clients see where to reach it. This is purely an advertised label -- it does not change the UDP port the proxy actually listens on. While left empty, no address is published.
>
> Default: empty (nothing advertised).
> Set by: server config (or the `serverinfo` console command).

## Read use-sites (WI-1 wide read)

Grepped the WHOLE `src/` tree for `hostport` in every form (`grep -rnw`). The ONLY occurrences are the declaration, the `extern`, and the registration -- there is NO `hostport->integer`, `hostport->string`, or `hostport->value` read anywhere. Its entire observable behavior therefore flows through the generic `CVAR_SERVERINFO` machinery, which is the real read/use surface and is traced below.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Declaration | `src/main.c:18` | the cvar pointer (locator only) |
| Extern | `src/qwfwd.h:227` | export of the pointer (locator only) |
| Registration | `src/main.c:130` | registers name + default `""` + flag `CVAR_SERVERINFO` (no other flag) |
| Serverinfo mirror on set | `src/cvar.c:184-192` (in `Cvar_Set2`) | when the value is changed, it is written into the serverinfo string `ps.info` (key `hostport`) |
| Empty-value removal | `src/info.c:162-164` (in `Info_SetValueForStarKeyEx`, called from `:189`) | an empty value removes the key from `ps.info` -> nothing advertised |
| Serverinfo publication | `src/svc.c:360-363` (in `SVC_Status`) | the full `ps.info` string is sent in the proxy's status reply to anyone querying it (server browser / qstat / qplug / qspy / connecting client) |

Traced to DISPROVE a name-inferred bypass (WI-1): the port the proxy actually binds is `net_port`, NOT `hostport`. `net_port` is registered at `src/net.c:282/284` (`CVAR_NOSET`, default `ps.params.port ? port : QWFWD_DEFAULT_PORT`) and is the value passed to `bind()` -- `src/net.c:295` `NET_UDP_OpenSocket(net_ip->string, net_port->integer, true)` -> `src/net.c:118-120` `address.sin_port = htons((short)port); bind(...)`. `hostport` is never read into any socket call. (The example-config value `"example.com:30000"` is a host:port STRING that `->integer` could not meaningfully parse, independently confirming `hostport` is an advertised label, not a port number consumed by the engine -- HINT only, SR-1.)

## D5 rubric check (Step 3)

Cold-synth: register site `src/main.c:130` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. The serverinfo machinery (`Cvar_Set2` mirror at `:184`, the empty-removal at `info.c:162`, the status publication at `svc.c:362`) is fully source-legible -> SYNTHESIZE (not hedge/residue). Rubric: (1) states admin-observable WHAT (a value advertised in the proxy's server info, seen by browsers/clients); (2) not a name restatement (the name "hostport" would wrongly suggest it sets the listen port -- the description corrects that, the highest-value clause here); (3) the empty default's meaning is spelled out (nothing advertised); (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: the value is published in the proxy's server info | `src/cvar.c:184-189` (`Cvar_Set2`, gated on the cvar's `CVAR_SERVERINFO` flag set at `main.c:130`) | `if (var->flags & CVAR_SERVERINFO) { ... Info_SetValueForStarKey (ps.info, var->name, var->string, sizeof(ps.info)); ...}` | MATCH |
| Semantic: that server info is what server browsers / connecting clients see (reach-the-proxy info) | `src/svc.c:360-363` (`SVC_Status`) | `snprintf(tmp, sizeof(tmp), "%s\n", ps.info); SZ_Print(&buf, tmp);` (status reply; field comment `ps.info` = "Used by cvars which mirrored in serverinfo", `qwfwd.h:215`) | MATCH |
| Semantic (load-bearing): does NOT change the bound listen port | `src/net.c:295` + `:118-120` bind `net_port`, never `hostport`; `hostport` has zero socket-path reads (WI-1 grep) | `net_socket = NET_UDP_OpenSocket(net_ip->string, net_port->integer, true)` -> `address.sin_port = htons((short)port); bind(...)` | MATCH (negative clause: bound port is `net_port`; `hostport` absent from all socket code) |
| OFF/empty-state: empty value -> nothing advertised (key absent) | `src/info.c:162-164` (`Info_SetValueForStarKeyEx`, called from `cvar.c:189`) | `Info_RemoveKey (s, key);` then `if (!value || !strlen(value)) return;` (removes the key, does not re-add it for an empty value) | MATCH |
| Default: empty | `src/main.c:130` (registration; WI-2) | `hostport = Cvar_Get("hostport", "", CVAR_SERVERINFO);` (literal `""`) | MATCH |
| Default-state: empty default + no startup mirror -> not in serverinfo until set | `src/cvar.c:98-141` (`Cvar_Get` -> `Cvar_Create`, neither writes `ps.info`); mirror happens only in `Cvar_Set2` `:189` | `Cvar_Get` body contains no `Info_Set*` call; `Cvar_Create` body (`cvar.c`) contains no `Info_Set*` call | MATCH |
| Set by: server config / `serverinfo` command (no vote) | `src/main.c:142` (`exec qwfwd.cfg`) reaches `Cvar_Set`; `src/main.c:80-85` (`serverinfo` command) routes serverinfo-cvar keys through `Cvar_Set` | `Cbuf_InsertText ("exec qwfwd.cfg\n");` ; `if (var && (var->flags & CVAR_SERVERINFO)) Cvar_Set (var->name, value);` (no vote system exists in qwfwd) | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the C identifiers (`Cvar_Set2`, `Cvar_Get`, `Cvar_Create`, `Info_SetValueForStarKey`, `Info_RemoveKey`, `SVC_Status`, `ps.info`, `net_port`, `net_socket`, `NET_UDP_OpenSocket`, `bind`), the `CVAR_SERVERINFO` flag name, the `CVAR_NOSET` flag on `net_port`, and the serverinfo-string mechanism. The user doc says only the admin-observable effect (value advertised in the proxy's server info; does not change the listen port). The `serverinfo` command name stays in backticks because it is an admin-typed command the operator can act on, not internal jargon. No `See also:` -- the behavior is self-contained to this proxy's own advertised info; the cross-engine consequence (which client/browser fields read it) is context, not action-changing (D20 default routes context to L3, and this is thin -- no breadcrumb warranted).

## Rationale

Cold-synth from the generic serverinfo machinery (no per-cvar read use-site exists, which is itself the key fact). `hostport` is a `CVAR_SERVERINFO` cvar with NO direct read anywhere in the tree (WI-1 `grep -rnw` over `src/` returns only declaration + extern + registration). Its only effect: when set to a non-empty value, `Cvar_Set2` (`cvar.c:184-192`) mirrors it into `ps.info`, the serverinfo string, which `SVC_Status` (`svc.c:362`) returns in the proxy's status reply to any querying browser/client. The name strongly implies "the port the proxy listens on," so the load-bearing synthesized clause is the correction: the bound port is `net_port` (`net.c:282/284`, `CVAR_NOSET`, default `QWFWD_DEFAULT_PORT`=30000), passed to `bind()` at `net.c:118-120` via `net.c:295`; `hostport` is never read into any socket call. The empty default means the key is never published until set: registration (`Cvar_Get`->`Cvar_Create`, `cvar.c:98-141`) does NOT mirror to `ps.info` (only `Cvar_Set2` does), and `Info_SetValueForStarKeyEx` (`info.c:162-164`) removes the key on an empty value. `Set by` is server config (`exec qwfwd.cfg`, `main.c:142`) or the `serverinfo` console command (`main.c:80-85`, which routes serverinfo-cvar keys through `Cvar_Set`); qwfwd has no vote system. The example config (`resources/example-configs/qwfwd.cfg:7-8`, commented `// set hostport "example.com:30000"` with note "Domain (or ip) and port number") corroborates the advertised-address semantics and the host:port-string shape but is an admissible HINT only, not ground truth and not a seed (SR-1). No SR-3 deployment-default divergence. No C2 conflict. `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30). Self-classification: TRACED-CLEAN -- every clause maps to an enforcing line (the mirror branch, the status send, the bind site for the negative clause, the empty-removal, the registration literal); no clause rests on the cvar name (indeed the name is actively contradicted by the trace), an enum/string, or a config comment.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "hostport",
  "type": "cvar",
  "description": "Sets the address and port that this proxy advertises in its server info, so server browsers and connecting clients see where to reach it. This is purely an advertised label -- it does not change the UDP port the proxy actually listens on. While left empty, no address is published.\n\nDefault: empty (nothing advertised).\nSet by: server config (or the `serverinfo` console command).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/main.c:130 (Cvar_Get(\"hostport\",\"\",CVAR_SERVERINFO)), no shipped-doc candidate -> nothing to affirm; serverinfo machinery fully source-legible so synthesize. hostport has ZERO direct reads (WI-1 grep -rnw over src/ returns only decl src/main.c:18, extern src/qwfwd.h:227, registration src/main.c:130); all behavior flows through the generic CVAR_SERVERINFO path. Clauses->cites: value published in server info -> src/cvar.c:184-189 (Cvar_Set2 mirrors to ps.info via Info_SetValueForStarKey when CVAR_SERVERINFO set); that info is what browsers/clients see -> src/svc.c:360-363 (SVC_Status sends ps.info in status reply; ps.info field comment qwfwd.h:215 'mirrored in serverinfo'); LOAD-BEARING negative clause does NOT change the bound listen port -> bound port is net_port (src/net.c:282/284 CVAR_NOSET default QWFWD_DEFAULT_PORT=30000) passed to bind() at src/net.c:118-120 via src/net.c:295, hostport never in any socket call (traced to disprove the name-inferred 'sets the port' reading, WI-1); empty value -> key removed/unadvertised -> src/info.c:162-164 (Info_RemoveKey then early-return on empty); empty default not mirrored at startup -> src/cvar.c:98-141 (Cvar_Get->Cvar_Create write no ps.info; mirror only in Cvar_Set2 :189); Default empty (WI-2 registered literal) -> src/main.c:130; Set-by server config (exec qwfwd.cfg src/main.c:142) or serverinfo command (src/main.c:80-85 routes serverinfo-cvar keys through Cvar_Set), no vote system in qwfwd. No clause rests on name/enum/string/comment (the name is contradicted by the trace). Example config resources/example-configs/qwfwd.cfg:7-8 (// set hostport \"example.com:30000\", 'Domain (or ip) and port number') corroborates advertised-address semantics + host:port-string shape but is a HINT only (SR-1, not a seed); the host:port string value independently shows ->integer would be meaningless, confirming it is a label not a port. No SR-3 divergence. No C2 conflict. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
