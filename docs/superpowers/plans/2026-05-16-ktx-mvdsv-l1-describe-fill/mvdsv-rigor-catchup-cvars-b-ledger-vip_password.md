# describe-fill-synthesis ledger -- mvdsv `vip_password`

- **project:** mvdsv
- **knob:** `vip_password` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:vip_password: synthesized -- space-separated list of spectator VIP passwords; a matching client gets a reserved spectator slot (up to maxvip_spectators) beyond the public limit; empty/"none" disables -- origin=synthesized ref=src/sv_main.c:2747 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets one or more passwords that grant VIP status to spectators. A client whose connect password matches one of these is treated as a VIP and may take a reserved spectator slot -- they can connect as a spectator even when the public spectator slots are full, up to the reserved-VIP limit (maxvip_spectators). Multiple passwords can be listed, separated by spaces.
>
> Empty, or the literal value none, disables VIP-by-password entirely (no client gains VIP this way).
>
> Default: empty (VIP-by-password disabled).
> Set by: server config / rcon.
> See also: password, spectator_password, rcon_password, maxvip_spectators.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| empty or "none" disables VIP-by-password (OFF-state) | src/sv_main.c:2747 | `if (!vip_password.string[0] || !strcasecmp(vip_password.string, "none")) return 0;` | MATCH |
| space-separated list; client pass compared against each token | src/sv_main.c:2759-2762 | `Cmd_TokenizeString(vip_password.string); for (...) if (!strcmp(Cmd_Argv(i), pass) && strcasecmp(Cmd_Argv(i),"none"))` | MATCH |
| a match yields a nonzero VIP level | src/sv_main.c:2763 | `return (use_value ? vip_value[i] : i+1);` | MATCH |
| checked against client's connect password at join | src/sv_main.c:1042-1044,1078 | `vip = SV_VIPbyPass( s )` / `SV_VIPbyPass( Info_ValueForKey( userinfo, "password") )` | MATCH |
| VIP grants a reserved spectator slot beyond public limit | src/sv_main.c:1202-1206 | `if (vip) { if (spass && (spectators < maxspectators.value || vips < maxvip_spectators.value)) return true; }` | MATCH |
| non-VIP gets no reserved slot (contrast) | src/sv_main.c:1209 | `if (spass && spectators < (int)maxspectators.value) return true;` | MATCH |
| Default empty | src/sv_main.c:103 | `cvar_t vip_password = {"vip_password", ""};` | MATCH |
| value compared only, never displayed (sensitivity) | src/sv_main.c:2762 ; 1435-1437 | compare: `!strcmp(Cmd_Argv(i), pass)`; info exposes only `Info_SetStar(&newcl->_userinfo_ctx_, "*VIP", s)` where s is the integer level | MATCH |
| Set by server config / rcon (not blocklisted) | src/sv_main.c:1754-1764 | vip_password absent from blocklist | MATCH |
| no KTX override | ktx/src (grep) | `(none in ktx)` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet (verbatim) | Verdict |
|---|--------|---------------------|--------------------|---------|
| 1 | "Sets one or more passwords that grant VIP status to spectators" / "matches one of these is treated as a VIP" | sv_main.c:2759-2763 (parser) + sv_main.c:1042,1078 (vip flag set) | `Cmd_TokenizeString(vip_password.string); for (i=0;i<Cmd_Argc();i++) if (!strcmp(Cmd_Argv(i), pass) && strcasecmp(Cmd_Argv(i),"none")) return (use_value ? vip_value[i] : i+1);` ... `if ( !( vip = SV_VIPbyPass( s ) ) )` | MATCH |
| 2 | "Multiple passwords can be listed, separated by spaces" | sv_main.c:2759 | `Cmd_TokenizeString(vip_password.string);` (whitespace-tokenized; each token a candidate password) | MATCH |
| 3 | "A client whose connect password matches ... may take a reserved spectator slot -- can connect as a spectator even when the public spectator slots are full" | sv_main.c:1202-1206 (SpectatorCanConnect) | `if (vip) { if (spass && (spectators < (int)maxspectators.value \|\| vips < (int)maxvip_spectators.value)) return true; }` | MATCH |
| 4 | "up to the reserved-VIP limit (maxvip_spectators)" | sv_main.c:1204 + 1347 (spectator-2 promo) + 165 (cvar) | `vips < (int)maxvip_spectators.value` ... `if (spectator == 2 && !vip && vips < (int)maxvip_spectators.value)` ... `cvar_t maxvip_spectators = {"maxvip_spectators","0"...};` | MATCH |
| 5 | OFF-state: "Empty ... disables VIP-by-password entirely (no client gains VIP this way)" | sv_main.c:2747 | `if (!vip_password.string[0] \|\| !strcasecmp(vip_password.string, "none")) return 0;` | MATCH |
| 6 | OFF-state: "the literal value none ... disables" | sv_main.c:2747 (+ per-token guard 2762) | `!strcasecmp(vip_password.string, "none")` ... `&& strcasecmp(Cmd_Argv(i), "none")` | MATCH (minor: comparison is case-INSENSITIVE via strcasecmp, so "NONE"/"None" also disable; unstated nuance, not a contradiction) |
| 7 | "Default: empty (VIP-by-password disabled)" | sv_main.c:103 + 3473 (register) | `cvar_t vip_password = {"vip_password", ""};` ... `Cvar_Register (&vip_password);` | MATCH (WI-2: registered default is "") |
| 8 | "Set by: server config / rcon" | sv_main.c:103,3473 (plain cvar, no CVAR_ROM/lock flags) | `cvar_t vip_password = {"vip_password", ""};` (no flags) | MATCH |
| 9 | See also: password / spectator_password / rcon_password / maxvip_spectators (all real mvdsv cvars) | sv_main.c:72 / 102 / 71 / 165 | `password = {"password",""}` ; `spectator_password = {"spectator_password",""}` ; `rcon_password = {"rcon_password",""}` ; `maxvip_spectators = {"maxvip_spectators","0"}` | MATCH |

**V-pass notes:** Oracle confirmed at mvdsv 1.11-53-g18d0362. enforce-trace-discipline.md loaded and applied per-clause. All 9 material clauses trace to a located enforcing line whose code (and adjacent comments) matches the assertion; no clause contradicts the code; no clause is name/string/enum-only inference.

Trace chain followed end-to-end (did not stop at any caller):
- Parser/matcher: SV_VIPbyPass (sv_main.c:2741-2766) -- tokenizes vip_password.string, returns nonzero on any token match (with the embedded "none" guard at 2762).
- vip flag wiring: CheckPasswords (sv_main.c:1027-1106) sets vip from SV_VIPbyPass on the spectator field (1042), falling back to the password key (1044), and on the player path the password key (1078). Confirms "connect password matches" is accurate as an umbrella across both connect contexts.
- Reserved-slot enforcement (the load-bearing behavioral claim): SpectatorCanConnect (sv_main.c:1198-1214). For vip, returns true when spass && (spectators < maxspectators OR vips < maxvip_spectators) -- i.e. VIP can take a spectator slot even when public spec slots are full, bounded by maxvip_spectators. This is the exact behavior the description asserts. Reached from SVC_DirectConnect:1333.
- vips counter semantics: CountPlayersSpecsVips (sv_main.c:1157-1194) counts connected spectator clients with cl->vip set into vips; confirms "vips < maxvip_spectators" is the count of already-connected VIP specs against the reserved limit.
- maxvip_spectators clamps: FixMaxClientsCvars (sv_main.c:942-959) caps the reserved-VIP total within MAX_CLIENTS. Consistent, not contradicting.

WI-2 metadata: registered default = "" (sv_main.c:103, register 3473) -- "Default: empty" PASS. No CVAR_* lock/ROM flags -> settable via config/rcon, "Set by" PASS. All four See-also targets verified as real mvdsv cvars in the same registration block; maxvip_spectators additionally confirmed present in the oracle DB (id mvdsv:cvar:maxvip_spectators, default "0", line 165).

Single minor imprecision (clause 6): the "none" sentinel is compared case-INSENSITIVELY (strcasecmp at both 2747 and 2762), so "NONE"/"None" etc. also disable VIP-by-password; the description's lowercase example and the broader "disables entirely" claim remain correct, so this is still-true minor vagueness that is fully traceable -> acceptable under TRACED-CLEAN, not a NEAR-MISS. (Notably this also matches the repo convention of case-insensitivity outside actual passwords.)

## flags_for_review

- [fyi/off-scope-entity/vpass] vip_values (sv_main.c:104, registered 3474) is the companion cvar to vip_password: when set, SV_VIPbyPass (2750-2756, 2763) returns the per-token vip_value[i] (an access LEVEL via atoi) instead of the positional index i+1. The 'VIP status' a matched password grants can therefore be a tiered numeric level, not just a boolean -- the description's boolean 'is a VIP' framing is correct for slot admission (any nonzero return == VIP) but does not mention the level dimension. Not a defect in this knob's description (the level lives on vip_values); flagged so the vip_values row and any future VIP concept note capture the level semantics. Source comment at 2752 ('vip_password count may be not equal vip_values count, what we must do in this case?') marks an acknowledged unhandled mismatch edge-case.
- [fyi/other/vpass] Behavioral nuance on the OR at sv_main.c:1204: a VIP-by-password client is admitted if EITHER a normal spectator slot (spectators < maxspectators) OR a reserved VIP slot (vips < maxvip_spectators) is free. So a VIP does not exclusively consume a reserved slot -- it prefers/uses whichever check passes. The description's 'may take a reserved spectator slot ... even when the public spectator slots are full' captures the load-bearing benefit accurately and does not over-claim exclusivity, so no fix needed; noted only because a reader could infer VIPs always sit in reserved slots, which the code does not enforce.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "vip_password",
  "type": "cvar",
  "description": "Sets one or more passwords that grant VIP status to spectators. A client whose connect password matches one of these is treated as a VIP and may take a reserved spectator slot -- they can connect as a spectator even when the public spectator slots are full, up to the reserved-VIP limit (maxvip_spectators). Multiple passwords can be listed, separated by spaces.\n\nEmpty, or the literal value none, disables VIP-by-password entirely (no client gains VIP this way).\n\nDefault: empty (VIP-by-password disabled).\nSet by: server config / rcon.\nSee also: password, spectator_password, rcon_password, maxvip_spectators.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:2747. Trailing comment `// password for entering as a VIP sepctator` (sv_main.c:103) restates the name and is misspelled; synthesized. READ use-site (gate): SV_VIPbyPass, sv_main.c:2741-2766. OFF-state (sv_main.c:2747) `if (!vip_password.string[0] || !strcasecmp(vip_password.string, \"none\")) return 0;` -- empty OR case-insensitive \"none\" => returns 0 (no VIP). List semantics (sv_main.c:2759-2763): `Cmd_TokenizeString(vip_password.string); for (i=0;i<Cmd_Argc();i++) if (!strcmp(Cmd_Argv(i), pass) && strcasecmp(Cmd_Argv(i),\"none\")) return (use_value ? vip_value[i] : i+1);` -- the cvar is space-tokenized and the client's pass is compared against each token; a match returns a nonzero VIP level (token index+1, or the matching vip_values entry). Where the client's pass comes from: CheckPasswords (sv_main.c:1042/1044/1078) calls SV_VIPbyPass on the userinfo \"spectator\"/\"password\" value at connect. What VIP grants (the observable privilege): SpectatorCanConnect (sv_main.c:1202-1206) `if (vip) { if (spass && (spectators < maxspectators.value || vips < maxvip_spectators.value)) return true; }` vs the non-vip branch (:1209) which only admits when `spectators < maxspectators.value` -- so a VIP can take a reserved slot governed by maxvip_spectators even when the public maxspectators pool is full. Default: registered literal `{\"vip_password\", \"\"}` at sv_main.c:103 (WI-2) => empty. Set-by: not on the rcon blocklist (sv_main.c:1754-1764) -> server config / rcon. SENSITIVITY: traced all reads -- the value is only ever strcmp-compared (sv_main.c:2762) and re-tokenized; it is never printed; the status/*VIP info exposes only the integer level (sv_main.c:1435-1437 Info_SetStar \"*VIP\"), never the password, so the description does not imply the value is displayed. Siblings cross-linked per password-cluster rule: password (sv_main.c:72), spectator_password (:102), rcon_password (:71), and the companion limit maxvip_spectators (:165). F-MV1: grep ktx/src for vip_password/vip_values/SV_VIPbyPass -> none; no KTX override. (vip_values, sv_main.c:104, optionally remaps each token to a custom level -- mentioned as 'VIP level' only; its detail is out of scope for this knob.)",
  "description_proposed": null
}
```
