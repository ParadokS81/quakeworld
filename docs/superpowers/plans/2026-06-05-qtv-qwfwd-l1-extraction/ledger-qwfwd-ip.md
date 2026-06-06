# Ledger -- QWFWD cmdline param `ip`

```json
{
  "project": "qwfwd",
  "knob": "ip",
  "type": "cmdline_param",
  "description": "Sets the local IP address the proxy binds to, for hosts with more than one network interface. Given as the second positional argument on the command line: qwfwd [port [ip]] (a port must be given first). An address given here overrides any net_ip value set in the config file.\n\nDefault: 0.0.0.0, which binds to all available network interfaces.\nSet by: command line (second positional argument).\nSee also: net_ip.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "CMDLINE PARAM, positional. Usage banner src/main.c:223 'Usage: %s [port [ip]]' establishes the positional form; the brackets nest port outside ip, so ip is only reachable as argv[2] after a port argv[1] -- hence 'a port must be given first'. ENFORCE-TRACE per clause: (1) 'second positional argument' / from argv[2] -- src/main.c:229 'strlcpy(params.ip, (argc > 2 && argv[2][0] != '-' && argv[2][0] != '+') ? argv[2] : \"\", sizeof(params.ip));' copies argv[2] into params.ip, but only when argv[2] does not start with '-' or '+' (so a flag-shaped token is not mistaken for an IP); otherwise empty. (2) 'Default: 0.0.0.0, all interfaces' -- src/net.c:271 'char *ip = (*ps.params.ip) ? ps.params.ip : \"0.0.0.0\";' falls back to the literal \"0.0.0.0\" when params.ip is empty (the no-arg case); 0.0.0.0 as a bind address = all local interfaces (standard INADDR_ANY bind semantics; the value flows to net_ip then to the listen socket). (3) 'overrides config net_ip' -- src/net.c:276-277 'if (*ps.params.ip) net_ip = Cvar_FullSet(\"net_ip\", ip, CVAR_NOSET)'; else branch net.c:279 uses Cvar_Get (does not override). Cvar_FullSet (src/cvar.c:222) force-sets, so a cmdline ip wins over any cfg-set net_ip. Type char[64] per fwd_params_t.ip (src/qwfwd.h:168). 'more than one network interface' is the admin-observable reason to set it (bind to one specific interface instead of all). D20: file:line/jargon kept out of description; 'See also: net_ip' wires to the cvar it forces (SR-8: net_ip real default is 0.0.0.0, surfaced here). No suspect-pool membership (suspect_pool_member=FALSE); L1 entity confirmed live.",
  "description_proposed": null
}
```
