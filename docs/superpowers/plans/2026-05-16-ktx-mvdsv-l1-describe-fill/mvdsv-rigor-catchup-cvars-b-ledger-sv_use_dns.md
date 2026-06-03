# describe-fill-synthesis ledger -- mvdsv `sv_use_dns`

- **project:** mvdsv
- **knob:** `sv_use_dns` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_use_dns: synthesized -- status command resolves client IPs to hostnames when on (1), raw IP when off (0); reverse-DNS via SV_Resolve with raw-IP fallback -- origin=synthesized ref=src/sv_ccmds.c:1217 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether the status command resolves connected clients' IP addresses to hostnames. When on, each client's address shown by status is looked up via reverse DNS and displayed as a hostname (falling back to the raw IP if the lookup fails); when off, the raw IP address is shown.
>
> 0 = show raw IP addresses (no DNS lookup).
> 1 = resolve each address to a hostname for display.
>
> Default: 0.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| 1=resolve, 0=raw (polarity) | src/sv_ccmds.c:1217 | `(int)sv_use_dns.value ? SV_Resolve(s) : s` | MATCH |
| same in rcon/redirected status output | src/sv_ccmds.c:1254 | `... ? SV_Resolve(s) : s` | MATCH |
| resolve = reverse DNS to hostname, fallback to raw on failure | src/sv_ccmds.c:1131-1145 | `if ((hp=gethostbyaddr((const char*)&ip,sizeof(ip),AF_INET))!=NULL) addr=hp->h_name; return addr;` | MATCH |
| affects only the status command | src/sv_ccmds.c (grep) | reads only at :1217 and :1254 | MATCH |
| Default 0 | src/sv_main.c:101 | `cvar_t sv_use_dns = {"sv_use_dns", "0"};` | MATCH |
| Set by server config / rcon (not blocklisted) | src/sv_main.c:1754-1764 | blocklist lists rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line -- sv_use_dns absent | MATCH |
| no KTX override | ktx/src (grep) | `(none in ktx)` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

All 10 clauses MATCH. Polarity sv ccmds.c 1217 and 1254; SV Resolve 1131 gethostbyaddr reverse DNS with raw IP fallback; default 0 sv main.c 101.

**V-pass notes:** Version 1.11-53-g18d0362 confirmed. Four use sites, status scoped. Callee SV Resolve traced to gethostbyaddr. Default vs registered default. TRACED CLEAN.

## flags_for_review

- [fyi/other/vpass] Gate is truthiness on int cast value, any nonzero enables not strictly 1; standard idiom not a defect.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_use_dns",
  "type": "cvar",
  "description": "Controls whether the status command resolves connected clients' IP addresses to hostnames. When on, each client's address shown by status is looked up via reverse DNS and displayed as a hostname (falling back to the raw IP if the lookup fails); when off, the raw IP address is shown.\n\n0 = show raw IP addresses (no DNS lookup).\n1 = resolve each address to a hostname for display.\n\nDefault: 0.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1217. Existing trailing comment (sv_main.c:101 '1 - use DNS lookup in status command, 0 - don't use') is a serviceable one-liner but not in D20 shape, so synthesized per D5 amendment. READ use-site: sv_ccmds.c:1217 (and the redirected/rcon-output variant at sv_ccmds.c:1254) in SV_Status_f: `(int)sv_use_dns.value ? SV_Resolve(s) : s` -- the ternary selects SV_Resolve(s) when value != 0, else the raw base-address string s = NET_BaseAdrToString(...). Polarity (1=resolve / 0=raw): the truthy branch calls SV_Resolve. Side-effect/fallback: SV_Resolve (sv_ccmds.c:1131-1145) does `ip=inet_addr(addr); if ((hp=gethostbyaddr(...))!=NULL) addr=hp->h_name; return addr;` -- returns the resolved hostname on success, otherwise returns the unchanged input address (the 'falls back to raw IP' clause). Scope: only the status command output path reads this cvar (grep of src/ shows reads only at sv_ccmds.c:1217 and :1254). Default: registered literal `{\"sv_use_dns\", \"0\"}` at sv_main.c:101 (WI-2). Set-by: not on the normal-rcon blocklist (sv_main.c:1754-1764), so server config / rcon. F-MV1: grep ktx/src for sv_use_dns / use_dns -> none; no KTX override.",
  "description_proposed": null
}
```
