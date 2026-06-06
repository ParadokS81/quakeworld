# describe-fill-synthesis ledger -- qwfwd `net_port`

- **Project:** qwfwd
- **Knob:** `net_port` (cvar)
- **C variable / registered name string:** both `net_port` -- declared `src/net.c:6` (`cvar_t *net_port;`), registered `src/net.c:282` (cmdline path, `Cvar_FullSet`) and `src/net.c:284` (no-cmdline path, `Cvar_Get`); `extern` at `src/qwfwd.h:381`.
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at either register site; the example config carries a commented hint but is NOT ground truth / NOT a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## SR-8 / F11 note (the reason this knob is in a careful batch)

The extractor emitted `default_value="port"` -- a C VARIABLE NAME (the local `char port[64]` in `NET_Init`), not a runtime literal. An AST extractor cannot data-flow-resolve the variable. The REAL default is read from `src/net.c:274`: `snprintf(port, sizeof(port), "%d", ps.params.port ? ps.params.port : QWFWD_DEFAULT_PORT);` together with `src/qwfwd.h:121` `#define QWFWD_DEFAULT_PORT 30000` -- when no port is supplied on the command line, the registered value is `30000`. The `Default:` line in the description surfaces `30000`, NOT the column's `port`. The static `default_value` column is left as-is (re-extraction re-emits the variable name; column override is out of phase scope, SR-8).

## Halt verdict

```
qwfwd:net_port: synthesized -- cold-synth, no comment; F11 variable-name default resolved from net.c:274 + qwfwd.h:121 to 30000 (QWFWD_DEFAULT_PORT); UDP listen port read at bind net.c:295->:118 htons(port); set-once-at-startup-then-read-only (CVAR_NOSET after ps.initialized, cvar.c:169) every clause enforce-traced -- origin=synthesized ref=src/net.c:274 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Sets the UDP port the proxy listens on for connecting clients. This is the port players (or their client's connect command) point at to reach the proxy.
>
> Default: 30000.
> Set by: the command line at startup (run the proxy as `qwfwd [port [ip]]` -- the port is the first argument), or the server config (`set net_port <number>`); a value given on the command line overrides the config. It is fixed once the proxy is running and cannot be changed from the console.

## Read use-sites (WI-1 wide read)

Tree-wide grep for `net_ip` / `net_port` at anchor `1.40-dev` (`grep -rn "net_ip\|net_port" src/`). Every `net_port` site:

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Declaration | `src/net.c:6` | the cvar pointer (locator only) |
| Default resolution | `src/net.c:274` | local `port` string = command-line port if given, else `QWFWD_DEFAULT_PORT` (this is the F11 real default) |
| Default macro | `src/qwfwd.h:121` | `#define QWFWD_DEFAULT_PORT 30000` (the literal value) |
| Registration (cmdline path) | `src/net.c:282` | `Cvar_FullSet("net_port", port, CVAR_NOSET)` -- forces value when a port was passed on the command line (priority over cfg) |
| Registration (no-cmdline path) | `src/net.c:284` | `Cvar_Get("net_port", port, CVAR_NOSET)` -- registers with the resolved default; keeps any value a prior cfg `set net_port` created |
| Bind read | `src/net.c:295` | `NET_UDP_OpenSocket(..., net_port->integer, true)` -- the integer is the port the socket binds to |
| Bind enforcement | `src/net.c:118` | `address.sin_port = htons ((short) port);` -- the listening port the socket is bound to |
| Startup banner | `src/main.c:158` | prints `net_port->integer` in "ready to rock at %s:%d" (display only) |
| `extern` decl | `src/qwfwd.h:381` | header export (locator only) |

## D5 rubric check (Step 3)

Cold-synth: neither register site (`src/net.c:282`/`:284`) has a trailing comment and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. Use-sites are fully source-legible -> SYNTHESIZE (not hedge/residue). Rubric: (1) states admin-observable WHAT (the UDP port clients reach the proxy on); (2) not a name restatement (the name says "net_port"; the prose spells the listen/connect-target effect); (3) it is a single numeric scalar (a port number) -- no enum to spell; the unit (UDP port) is stated; (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `src/` at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: sets the UDP port the proxy listens on | `src/net.c:295` -> callee `src/net.c:118` | `net_socket = NET_UDP_OpenSocket(net_ip->string, net_port->integer, true)` then in callee `address.sin_port = htons ((short) port);` (with `bind()` at `:120`) | MATCH |
| Semantic: it is the port clients point at to reach the proxy | `src/net.c:84` + `:120` (the bound socket is the one that recvfrom's client packets in `NET_GetPacket`) | socket created `SOCK_DGRAM`/`IPPROTO_UDP` at `:84`, bound at `:120`; `NET_GetPacket` (`:16-57`) reads incoming client datagrams on it | MATCH |
| Semantic: binding happens at startup | `src/main.c:148` (`NET_Init();` in init sequence) -> `src/net.c:269-296` | `NET_Init` opens + binds the socket once during init | MATCH |
| Default: `30000` (F11 -- the real default, not the column's `"port"`) | `src/net.c:274` (resolution) + `src/qwfwd.h:121` (macro) + `:284` (registration) | `... ps.params.port ? ps.params.port : QWFWD_DEFAULT_PORT` and `#define QWFWD_DEFAULT_PORT 30000` then `Cvar_Get("net_port", port, CVAR_NOSET)` | MATCH |
| Set by: command line at startup, port is the FIRST positional arg (`qwfwd [port [ip]]`) | `src/main.c:223` (usage string) + `:228` (parse) | `Sys_Printf("Usage: %s [port [ip]]\n", argv[0]);` and `params.port = (argc > 1) ? atoi(argv[1]) : 0;` | MATCH |
| Set by: server config `set net_port <n>` also works (cfg path preserved) | `src/main.c:142` (`exec qwfwd.cfg` before `NET_Init`) + `src/cvar.c:113-128` (Cvar_Get keeps existing value) + `src/net.c:284` | `exec qwfwd.cfg` runs at `:142`, NET_Init at `:148`; a cfg `set net_port` creates the var first, then `Cvar_Get` at `:284` or's in `CVAR_NOSET` but does NOT overwrite (cvar.c:94 "the value will not be set" if var exists) | MATCH |
| Command-line value OVERRIDES config | `src/net.c:281-282` | comment `// if cmd line - force it, so we have priority over cfg` then `Cvar_FullSet(...)` (forces value) | MATCH |
| Fixed once running -- cannot be changed from console | `src/cvar.c:169` (Set2 guard) + flag `CVAR_NOSET` at registration `:282`/`:284` + `ps.initialized=true` at `src/main.c:152` | `if ((var->flags & CVAR_READONLY) \|\| ((var->flags & CVAR_NOSET) && ps.initialized)) { Sys_Printf("%s is write protected.\n", ...); return var; }`; init sets `ps.initialized` true AFTER NET_Init registers the cvar | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the C identifiers (`NET_UDP_OpenSocket`, `htons`, `bind`, `Cvar_FullSet`, `Cvar_Get`, `QWFWD_DEFAULT_PORT`, `ps.params.port`, `ps.initialized`), the `CVAR_NOSET` flag name (rendered as the plain "fixed once running / cannot be changed from the console"), and the F11 variable-name resolution mechanics. The user doc states only the admin-observable listen-port behavior + Default + Set-by. The command-line usage string `qwfwd [port [ip]]` is the program's own `--help` output (main.c:223), an admin-observable usage form, so it is admissible in the user doc (it is not code jargon). No cross-engine consequence is action-changing (the listen port is proxy-local; clients merely connect to it), so no `See also:` line. No SR-5 concept-note breadcrumb (this knob is not in the masters/parse_delay/qtv_password candidate set).

## Rationale

Cold-synth from fully-legible use-sites. `net_port` is the UDP listening port for the proxy's single socket. The default is resolved at `src/net.c:274` to `QWFWD_DEFAULT_PORT` when no port positional arg is present, and `src/qwfwd.h:121` defines that macro as `30000` (F11: the extractor's `default_value="port"` is the local `char port[64]` variable name, not this literal). The bind at `src/net.c:118` (`htons((short) port)`, reached via `src/net.c:295`) sets the port the socket is bound to, and that bound `SOCK_DGRAM` socket (`:84`/`:120`) is the one `NET_GetPacket` (`:16-57`) reads incoming client datagrams on -- so it is the port clients connect to. The command line accepts the port as the FIRST positional argument (`qwfwd [port [ip]]`, parsed at `main.c:228` via `atoi(argv[1])`, usage banner `main.c:223`); the config path also works because `exec qwfwd.cfg` (main.c:142) runs before `NET_Init` (main.c:148) and `Cvar_Get` (cvar.c:113-128) preserves a value a prior `set net_port` created (it only or's flags, never overwrites an existing var). A command-line port wins because the cmdline branch uses `Cvar_FullSet` which force-sets (net.c:281-282, comment "we have priority over cfg"); the no-cmdline branch uses `Cvar_Get` (net.c:284). The cvar carries `CVAR_NOSET`, so after `ps.initialized` is set true (main.c:152, AFTER NET_Init registers it) any console `set` is rejected as "write protected" (cvar.c:169) -- i.e. fixed once running. WI-2: there is no `cvar_t` table literal here; the default is the runtime-resolved string from the `QWFWD_DEFAULT_PORT` macro, traced to both the resolution site and the macro. The example config (`resources/example-configs/qwfwd.cfg:15-16`, commented `// set net_port 30000` with comment "UDP port on which QWFWD will listen for client, default port is 30000") corroborates the 30000 default and the `set net_port` config form but is an admissible HINT only, not ground truth and not a seed (SR-1). No C2 conflict. `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30). Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/assignment/comparison line (the bind htons, the default ternary + macro, the parse, the cfg-exec ordering, the write-protect guard); no clause rests on the cvar name, an enum/string, or a config comment.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "net_port",
  "type": "cvar",
  "description": "Sets the UDP port the proxy listens on for connecting clients. This is the port players (or their client's connect command) point at to reach the proxy.\n\nDefault: 30000.\nSet by: the command line at startup (run the proxy as `qwfwd [port [ip]]` -- the port is the first argument), or the server config (`set net_port <number>`); a value given on the command line overrides the config. It is fixed once the proxy is running and cannot be changed from the console.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/net.c:282 (Cvar_FullSet, cmdline path) or :284 (Cvar_Get, no-cmdline path), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. F11/SR-8: extractor default_value='port' is a C VARIABLE NAME (local `char port[64]` in NET_Init), not a literal; the REAL default is resolved at src/net.c:274 `snprintf(port,...,ps.params.port ? ps.params.port : QWFWD_DEFAULT_PORT)` with src/qwfwd.h:121 `#define QWFWD_DEFAULT_PORT 30000` -> default 30000; static default_value column left as-is per SR-8. Clauses->cites: listens on this UDP port -> src/net.c:295 (NET_UDP_OpenSocket(...,net_port->integer,...)) callee-follow to src/net.c:118 `address.sin_port = htons((short) port);` + bind at :120; it is the client connect target -> the bound SOCK_DGRAM/UDP socket (:84/:120) is read by NET_GetPacket (:16-57) for incoming client datagrams; happens at startup -> NET_Init called at src/main.c:148; Default 30000 -> src/net.c:274 (resolution) + src/qwfwd.h:121 (macro) + :284 (register); Set-by command line first positional arg `qwfwd [port [ip]]` -> usage src/main.c:223 + parse src/main.c:228 (params.port = atoi(argv[1])); Set-by config `set net_port` also works -> exec qwfwd.cfg at src/main.c:142 runs BEFORE NET_Init at :148, and Cvar_Get (cvar.c:113-128) keeps an existing var's value (only or's flags) so a cfg-created net_port survives :284; cmdline overrides cfg -> src/net.c:281-282 comment 'if cmd line - force it, so we have priority over cfg' + Cvar_FullSet force-set; fixed once running / no console change -> CVAR_NOSET flag at :282/:284 + guard src/cvar.c:169 ((flags&CVAR_NOSET)&&ps.initialized -> 'write protected') with ps.initialized set true at src/main.c:152 AFTER NET_Init registers it. CVAR_NOSET flag name kept OUT of user doc per D20 (rendered 'fixed once running'). The usage string `qwfwd [port [ip]]` is the program's own --help output (main.c:223), admin-observable, so admissible in description (not code jargon). Example config resources/example-configs/qwfwd.cfg:15-16 (commented `// set net_port 30000`, comment 'default port is 30000') corroborates default+config-form but is a HINT only (SR-1, not a seed). Brief/SR-8 mention 'port command-line args'; the ACTUAL cmdline shape is POSITIONAL (port is argv[1], ip is argv[2]), per main.c:228-229 + the usage banner -- described the real positional shape. No C2 conflict. No SR-3 divergence on this knob. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
