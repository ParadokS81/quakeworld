# describe-fill-synthesis ledger -- qwfwd `net_ip`

- **Project:** qwfwd
- **Knob:** `net_ip` (cvar)
- **C variable / registered name string:** both `net_ip` -- declared `src/net.c:5` (`cvar_t *net_ip;`), registered `src/net.c:277` (cmdline path, `Cvar_FullSet`) and `src/net.c:279` (no-cmdline path, `Cvar_Get`); `extern` at `src/qwfwd.h:381`.
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at either register site; the example config carries a commented hint but is NOT ground truth / NOT a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## SR-8 / F11 note (the reason this knob is in a careful batch)

The extractor emitted `default_value="ip"` -- a C VARIABLE NAME (the local `char *ip` in `NET_Init`), not a runtime literal. An AST extractor cannot data-flow-resolve the variable. The REAL default is read from `src/net.c:271`: `char *ip = (*ps.params.ip) ? ps.params.ip : "0.0.0.0";` -- when no IP is supplied on the command line, the registered value is the literal `"0.0.0.0"` (bind all interfaces). The `Default:` line in the description surfaces `0.0.0.0`, NOT the column's `ip`. The static `default_value` column is left as-is (re-extraction re-emits the variable name; column override is out of phase scope, SR-8).

## Halt verdict

```
qwfwd:net_ip: synthesized -- cold-synth, no comment; F11 variable-name default resolved from net.c:271 to literal 0.0.0.0 (=all interfaces, confirmed at bind site net.c:117 INADDR_ANY); set-once-at-startup-then-read-only (CVAR_NOSET after ps.initialized, cvar.c:169) every clause enforce-traced -- origin=synthesized ref=src/net.c:271 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Sets which local IP address (network interface) the proxy binds its UDP socket to when it starts. With the default, the proxy listens on every IP address the host has; set a specific address to restrict it to one interface.
>
> 0.0.0.0 = listen on all of the host's IP addresses. Any other value = listen only on that one address.
>
> Default: 0.0.0.0 (all interfaces).
> Set by: the command line at startup (run the proxy as `qwfwd [port [ip]]` -- the IP is the second argument), or the server config (`set net_ip <address>`); a value given on the command line overrides the config. It is fixed once the proxy is running and cannot be changed from the console.

## Read use-sites (WI-1 wide read)

Tree-wide grep for `net_ip` / `net_port` at anchor `1.40-dev` (`grep -rn "net_ip\|net_port" src/`). Every `net_ip` site:

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Declaration | `src/net.c:5` | the cvar pointer (locator only) |
| Default resolution | `src/net.c:271` | local `ip` = command-line IP if given, else literal `"0.0.0.0"` (this is the F11 real default) |
| Registration (cmdline path) | `src/net.c:277` | `Cvar_FullSet("net_ip", ip, CVAR_NOSET)` -- forces value when an IP was passed on the command line (priority over cfg) |
| Registration (no-cmdline path) | `src/net.c:279` | `Cvar_Get("net_ip", ip, CVAR_NOSET)` -- registers with the resolved default; keeps any value a prior cfg `set net_ip` created |
| Bind read | `src/net.c:295` | `NET_UDP_OpenSocket(net_ip->string, ...)` -- the string is the IP the socket binds to |
| Bind enforcement | `src/net.c:117` | `address.sin_addr.s_addr = (ip && *ip) ? inet_addr(ip) : INADDR_ANY;` -- non-empty -> that address; empty -> INADDR_ANY (all interfaces) |
| Startup banner | `src/main.c:158` | prints `net_ip->string` in "ready to rock at %s:%d" (display only) |
| `extern` decl | `src/qwfwd.h:381` | header export (locator only) |

## D5 rubric check (Step 3)

Cold-synth: neither register site (`src/net.c:277`/`:279`) has a trailing comment and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. Use-sites are fully source-legible -> SYNTHESIZE (not hedge/residue). Rubric: (1) states admin-observable WHAT (which interface the proxy listens on); (2) not a name restatement (the name says "net_ip"; the prose spells the bind/interface effect and the all-interfaces meaning of the default); (3) the special value `0.0.0.0` is spelled out (= all host IPs) vs any specific address; (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `src/` at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: sets which local IP / interface the proxy binds its UDP socket to | `src/net.c:295` -> callee `src/net.c:117` | `net_socket = NET_UDP_OpenSocket(net_ip->string, net_port->integer, true)` then in callee `address.sin_addr.s_addr = (ip && *ip) ? inet_addr(ip) : INADDR_ANY;` | MATCH |
| Semantic: binding happens at startup | `src/main.c:148` (`NET_Init();` in init sequence) -> `src/net.c:269-296` | `NET_Init` opens + binds the socket once during init | MATCH |
| Value `0.0.0.0` (the default / empty) = listen on ALL host IPs | `src/net.c:117` (callee follow from `:295`) | `(ip && *ip) ? inet_addr(ip) : INADDR_ANY` -- `"0.0.0.0"` resolves via `inet_addr` to `INADDR_ANY` (0); empty also -> `INADDR_ANY` | MATCH |
| Any other value = listen only on that one address | `src/net.c:117` | `inet_addr(ip)` for a non-empty/non-zero `ip` sets `sin_addr` to that address | MATCH |
| Default: `0.0.0.0` (F11 -- the real default, not the column's `"ip"`) | `src/net.c:271` (resolution) + `:279` (registration with resolved value) | `char *ip = (*ps.params.ip) ? ps.params.ip : "0.0.0.0";` then `Cvar_Get("net_ip", ip, CVAR_NOSET)` | MATCH |
| Set by: command line at startup, IP is the SECOND positional arg (`qwfwd [port [ip]]`) | `src/main.c:223` (usage string) + `:229` (parse) | `Sys_Printf("Usage: %s [port [ip]]\n", argv[0]);` and `strlcpy(params.ip, (argc > 2 && argv[2][0] != '-' && argv[2][0] != '+') ? argv[2] : "", ...)` | MATCH |
| Set by: server config `set net_ip <addr>` also works (cfg path preserved) | `src/main.c:142` (`exec qwfwd.cfg` before `NET_Init`) + `src/cvar.c:113-128` (Cvar_Get keeps existing value) + `src/net.c:279` | `exec qwfwd.cfg` runs at `:142`, NET_Init at `:148`; a cfg `set net_ip` creates the var first, then `Cvar_Get` at `:279` or's in `CVAR_NOSET` but does NOT overwrite ("the value will not be set" if var exists, cvar.c:94) | MATCH |
| Command-line value OVERRIDES config | `src/net.c:276-277` | comment `// if cmd line - force it, so we have priority over cfg` then `Cvar_FullSet(...)` (forces value) | MATCH |
| Fixed once running -- cannot be changed from console | `src/cvar.c:169` (Set2 guard) + flag `CVAR_NOSET` at registration `:277`/`:279` + `ps.initialized=true` at `src/main.c:152` | `if ((var->flags & CVAR_READONLY) \|\| ((var->flags & CVAR_NOSET) && ps.initialized)) { Sys_Printf("%s is write protected.\n", ...); return var; }`; init sets `ps.initialized` true AFTER NET_Init registers the cvar | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the C identifiers (`NET_UDP_OpenSocket`, `INADDR_ANY`, `inet_addr`, `Cvar_FullSet`, `Cvar_Get`, `ps.params.ip`, `ps.initialized`), the `CVAR_NOSET` flag name (rendered as the plain "fixed once running / cannot be changed from the console"), and the F11 variable-name resolution mechanics. The user doc states only the admin-observable bind behavior + the `0.0.0.0` meaning + Default + Set-by. The command-line usage string `qwfwd [port [ip]]` is the program's own `--help` output (main.c:223), an admin-observable usage form, so it is admissible in the user doc (it is not code jargon). No cross-engine consequence is action-changing (the bind is proxy-local), so no `See also:` line. No SR-5 concept-note breadcrumb (this knob is not in the masters/parse_delay/qtv_password candidate set).

## Rationale

Cold-synth from fully-legible use-sites. `net_ip` is the bind-address selector for the proxy's single UDP listening socket. The default is resolved at `src/net.c:271` to the literal `"0.0.0.0"` when no IP positional arg is present (F11: the extractor's `default_value="ip"` is the local variable name, not this literal). The bind at `src/net.c:117` (reached via `src/net.c:295`) maps an empty/`0.0.0.0` value to `INADDR_ANY` (all interfaces) and any specific address through `inet_addr`. The command line accepts the IP as the SECOND positional argument (`qwfwd [port [ip]]`, parsed at `main.c:229`, usage banner `main.c:223`); the config path also works because `exec qwfwd.cfg` (main.c:142) runs before `NET_Init` (main.c:148) and `Cvar_Get` (cvar.c:113-128) preserves a value a prior `set net_ip` created (it only or's flags, never overwrites an existing var). A command-line IP wins because the cmdline branch uses `Cvar_FullSet` which force-sets (net.c:276-277, comment "we have priority over cfg"); the no-cmdline branch uses `Cvar_Get` (net.c:279). The cvar carries `CVAR_NOSET`, so after `ps.initialized` is set true (main.c:152, AFTER NET_Init registers it) any console `set` is rejected as "write protected" (cvar.c:169) -- i.e. fixed once running. WI-2: there is no `cvar_t` table literal here; the default is the runtime-resolved string, traced to its resolution site. The example config (`resources/example-configs/qwfwd.cfg:18-19`, commented `// set net_ip X.X.X.X` with comment "IP address on which QWFWD will listen for client, default is all host IP addresses") corroborates the all-interfaces default and the `set net_ip` config form but is an admissible HINT only, not ground truth and not a seed (SR-1). No C2 conflict. `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30). Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/assignment/comparison line (the bind ternary, the default ternary, the parse, the cfg-exec ordering, the write-protect guard); no clause rests on the cvar name, an enum/string, or a config comment.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "net_ip",
  "type": "cvar",
  "description": "Sets which local IP address (network interface) the proxy binds its UDP socket to when it starts. With the default, the proxy listens on every IP address the host has; set a specific address to restrict it to one interface.\n\n0.0.0.0 = listen on all of the host's IP addresses. Any other value = listen only on that one address.\n\nDefault: 0.0.0.0 (all interfaces).\nSet by: the command line at startup (run the proxy as `qwfwd [port [ip]]` -- the IP is the second argument), or the server config (`set net_ip <address>`); a value given on the command line overrides the config. It is fixed once the proxy is running and cannot be changed from the console.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/net.c:277 (Cvar_FullSet, cmdline path) or :279 (Cvar_Get, no-cmdline path), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. F11/SR-8: extractor default_value='ip' is a C VARIABLE NAME (local `char *ip` in NET_Init), not a literal; the REAL default is resolved at src/net.c:271 `char *ip = (*ps.params.ip) ? ps.params.ip : \"0.0.0.0\";` -> default 0.0.0.0; static default_value column left as-is per SR-8. Clauses->cites: binds local IP/interface for the UDP socket -> src/net.c:295 (NET_UDP_OpenSocket(net_ip->string,...)) callee-follow to src/net.c:117 `address.sin_addr.s_addr = (ip && *ip) ? inet_addr(ip) : INADDR_ANY;`; 0.0.0.0/empty = all interfaces -> src/net.c:117 INADDR_ANY branch; specific address -> inet_addr branch; happens at startup -> NET_Init called at src/main.c:148; Default 0.0.0.0 -> src/net.c:271 (resolution) + :279 (register); Set-by command line second positional arg `qwfwd [port [ip]]` -> usage src/main.c:223 + parse src/main.c:229 (params.ip = argv[2] guarded against leading -/+); Set-by config `set net_ip` also works -> exec qwfwd.cfg at src/main.c:142 runs BEFORE NET_Init at :148, and Cvar_Get (cvar.c:113-128) keeps an existing var's value (only or's flags) so a cfg-created net_ip survives :279; cmdline overrides cfg -> src/net.c:276-277 comment 'if cmd line - force it, so we have priority over cfg' + Cvar_FullSet force-set; fixed once running / no console change -> CVAR_NOSET flag at :277/:279 + guard src/cvar.c:169 ((flags&CVAR_NOSET)&&ps.initialized -> 'write protected') with ps.initialized set true at src/main.c:152 AFTER NET_Init registers it. CVAR_NOSET flag name kept OUT of user doc per D20 (rendered 'fixed once running'). The usage string `qwfwd [port [ip]]` is the program's own --help output (main.c:223), admin-observable, so admissible in description (not code jargon). Example config resources/example-configs/qwfwd.cfg:18-19 (commented `// set net_ip X.X.X.X`, comment 'default is all host IP addresses') corroborates default+config-form but is a HINT only (SR-1, not a seed). Brief/SR-8 mention a `-ip` flag; the ACTUAL cmdline shape is POSITIONAL (port then ip), per main.c:228-229 + the usage banner -- described the real positional shape, not a -ip flag. No C2 conflict. No SR-3 divergence on this knob. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
