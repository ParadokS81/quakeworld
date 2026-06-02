# describe-fill-synthesis ledger -- mvdsv `nslookup`

- **project:** mvdsv
- **knob:** `nslookup` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:nslookup: synthesized -- reverse-DNS console command (IP->hostname via gethostbyaddr); admin-only, not in ucmds[]; no KTX override -- origin=synthesized ref=src/sv_ccmds.c:1163 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Performs a reverse DNS lookup on an IP address from the server console, printing the hostname that address resolves to.
>
> nslookup <IP address> = print the resolved hostname and the address, e.g. `nslookup 192.246.40.37`. If the address cannot be resolved, prints "Couldn't resolve <IP>".
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| reverse DNS lookup (IP -> hostname) | src/sv_ccmds.c:1163 + 1142-1143 | `name = SV_Resolve(ip);` / `hp = gethostbyaddr((const char *)&ip, sizeof(ip), AF_INET); ... addr = hp->h_name;` | MATCH |
| arg form `nslookup <IP address>` | src/sv_ccmds.c:1156-1162 | `if (Cmd_Argc() != 2) { Con_Printf("Usage: nslookup <IP address>\n"); return; } ip = Cmd_Argv(1);` | MATCH |
| success print (Name + Address) | src/sv_ccmds.c:1164-1165 | `if (ip != name) Con_Printf("Name:    %s\nAddress:  %s\n", name, ip);` | MATCH |
| failure print "Couldn't resolve" | src/sv_ccmds.c:1166-1167 | `else Con_Printf("Couldn't resolve %s\n", ip);` | MATCH |
| access-class admin-only (console/rcon) | src/sv_ccmds.c:1831 + src/sv_user.c:3408-3424 | `Cmd_AddCommand("nslookup", SV_Nslookup_f);` ; not in ucmds[]; `else Con_Printf("Bad user command: %s\n", ...)` no fall-through | MATCH |
| no KTX override | ktx/src (grep) | grep 'nslookup' ktx/src -> 0 hits | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| C1 | Performs a REVERSE DNS lookup on an IP address | src/sv_ccmds.c:1141-1142 (callee SV_Resolve) | `ip = inet_addr(addr);` / `if ((hp = gethostbyaddr((const char *)&ip, sizeof(ip), AF_INET)) != NULL)` | MATCH -- `inet_addr` parses the dotted-decimal IP into a numeric address; `gethostbyaddr` is unambiguously the REVERSE resolver (address -> hostname). Adjacent comment line 1128 "resolve IP via DNS lookup" is consistent. Direction-of-resolution clause traced into the callee, not inferred from the `nslookup` name. |
| C2 | from the server console / rcon (scope) | src/sv_ccmds.c:1831 + dispatch src/sv_main.c:1828 | `Cmd_AddCommand ("nslookup", SV_Nslookup_f);` / `Cmd_ExecuteString(str);` | MATCH -- registered in the server-console command table via plain `Cmd_AddCommand`; rcon path `SV_Rcon_f` validates password then routes the same string through `Cmd_ExecuteString` into that table. No `ucmds[]` (client) registration exists (`nslookup` appears only in sv_ccmds.c), so connected players cannot invoke it. |
| C3 | prints the hostname that address resolves to | src/sv_ccmds.c:1143, 1165 | `addr = hp->h_name;` / `Con_Printf ("Name:    %s\nAddress:  %s\n", name, ip);` | MATCH -- on success SV_Resolve returns `hp->h_name` (resolved hostname), printed back in handler. |
| C4 | usage `nslookup <IP>` -> prints resolved hostname AND the address | src/sv_ccmds.c:1156-1165 | `if (Cmd_Argc() != 2) { Con_Printf ("Usage: nslookup <IP address>\n"); return; }` / `if (ip != name) Con_Printf ("Name:    %s\nAddress:  %s\n", name, ip)` | MATCH (minor presentation imprecision) -- exactly one arg required; success path prints both name and address. The description omits the literal `Name:`/`Address:` field labels and the printed order (Name then Address), which is acceptable user-doc compression, not a contradiction. |
| C5 | if the address cannot be resolved, prints "Couldn't resolve <IP>" | src/sv_ccmds.c:1142-1144 (failure return) + 1166-1167 | `return addr;` (unchanged on gethostbyaddr==NULL) / `else Con_Printf ("Couldn't resolve %s\n", ip);` | MATCH (verbatim string) -- on failure SV_Resolve returns the input pointer unchanged, so `ip == name` selects the else branch. |
| C6 | Set by: server console / rcon (metadata access-class) | src/sv_ccmds.c:1831 | `Cmd_AddCommand ("nslookup", SV_Nslookup_f);` | MATCH -- plain (non-flagged) `Cmd_AddCommand`; no `CF_` access-class flag system in this API, no client-command-table entry. Console/rcon is the correct and only access surface. |

**V-pass notes:** All six clauses map to located, verified enforcing lines including the callee. The critical, defect-prone clause -- "reverse DNS" -- was NOT inferred from the `nslookup` name (which would suggest general/forward lookup); it was enforce-traced into SV_Resolve (sv_ccmds.c:1131-1145) where `inet_addr` parses a dotted IP and `gethostbyaddr(..., AF_INET)` performs reverse resolution. This is exactly the name-inference trap the discipline warns about, and the proposed description got it right. No macro redefinition of `inet_addr`/`gethostbyaddr`/`SV_Resolve` exists in the tree (grep exit 1). Success/failure discrimination is a pointer-identity comparison (`if (ip != name)`) which is sound given SV_Resolve returns the input pointer unchanged on failure. Two minor still-true vaguenesses (output omits the literal `Name:`/`Address:` labels; example IP is real-but-arbitrary) are traceable and do not rise to a near-miss. Classification: TRACED-CLEAN.

## flags_for_review

- [fyi/off-scope-entity/vpass] SV_Resolve (sv_ccmds.c:1131) is also used at sv_ccmds.c:1217 and :1254 inside SV_Status_f, gated on the cvar sv_use_dns, to print client connection hostnames in the status listing. Off-scope for the nslookup knob, but it independently corroborates that SV_Resolve is a genuine reverse-DNS helper (addr->name) -- it strengthens C1 rather than contradicting it. No bug. FYI only.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "nslookup",
  "type": "command",
  "description": "Performs a reverse DNS lookup on an IP address from the server console, printing the hostname that address resolves to.\n\nnslookup <IP address> = print the resolved hostname and the address, e.g. `nslookup 192.246.40.37`. If the address cannot be resolved, prints \"Couldn't resolve <IP>\".\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1163. Handler SV_Nslookup_f (src/sv_ccmds.c:1152) requires exactly 2 args else prints usage 'Usage: nslookup <IP address>' (sv_ccmds.c:1156-1160). Behavior clause (reverse DNS): name = SV_Resolve(ip) at sv_ccmds.c:1163; SV_Resolve (sv_ccmds.c:1131-1144) does `ip = inet_addr(addr); hp = gethostbyaddr(...AF_INET); if hp != NULL addr = hp->h_name` -- i.e. address->hostname reverse lookup. Output clause: `if (ip != name) Con_Printf(\"Name: %s\\nAddress: %s\\n\", name, ip) else Con_Printf(\"Couldn't resolve %s\\n\", ip)` (sv_ccmds.c:1164-1167) -- the failure path fires when SV_Resolve returned the input pointer unchanged (no PTR record). ACCESS-CLASS: registered via Cmd_AddCommand only (sv_ccmds.c:1831); NOT present in ucmds[] (sv_user.c:3299-3384, grep confirmed no 'nslookup' entry). Client stringcmds dispatch only through ucmds[]+QC progs and SV_ExecuteUserCommand prints 'Bad user command' on no match with no fall-through to console commands (sv_user.c:3408-3424) -> admin-only, issued at server console / rcon. F-MV1: grep of ktx/src for nslookup returned zero hits -> no KTX override. Worked example uses a real-looking IP per v2 show-usage shape.",
  "description_proposed": null
}
```
