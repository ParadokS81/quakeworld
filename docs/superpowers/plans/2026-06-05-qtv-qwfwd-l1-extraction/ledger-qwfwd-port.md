# Ledger -- QWFWD cmdline param `port`

```json
{
  "project": "qwfwd",
  "knob": "port",
  "type": "cmdline_param",
  "description": "Sets the UDP port the proxy listens on. Given as the first positional argument on the command line: qwfwd [port [ip]]. A port given here overrides any net_port value set in the config file.\n\nDefault: 30000 (when no port is given on the command line).\nSet by: command line (first positional argument).\nSee also: net_port.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "CMDLINE PARAM, positional. Usage banner src/main.c:223 'Usage: %s [port [ip]]' establishes the positional form. ENFORCE-TRACE per clause: (1) 'first positional argument' / parsed from argv[1] -- src/main.c:228 'params.port = (argc > 1) ? atoi(argv[1]) : 0;' reads argv[1] as the port via atoi; absent -> 0. (2) 'Default: 30000 when no port given' -- src/net.c:274 'snprintf(port, ..., ps.params.port ? ps.params.port : QWFWD_DEFAULT_PORT)' uses QWFWD_DEFAULT_PORT when params.port is 0 (the no-arg sentinel from main.c:228); src/qwfwd.h:121 '#define QWFWD_DEFAULT_PORT 30000' fixes the literal at 30000. (3) 'overrides config net_port' -- src/net.c:281-282 'if (ps.params.port) net_port = Cvar_FullSet(\"net_port\", port, CVAR_NOSET)'; the else branch net.c:284 uses Cvar_Get (does not override an existing value). Cvar_FullSet (src/cvar.c:222) force-sets the value, so a cmdline port wins over any cfg-set net_port. Type int per fwd_params_t.port (src/qwfwd.h:167). 'UDP port' -- net_port feeds the UDP listen socket (NET_UDP_OpenSocket, src/qwfwd.h:390). D20: file:line/jargon kept out of description; 'See also: net_port' wires the cmdline param to the cvar it forces (SR-8: net_port real default is 30000, surfaced here). No suspect-pool membership (suspect_pool_member=FALSE); L1 entity confirmed live.",
  "description_proposed": null
}
```
