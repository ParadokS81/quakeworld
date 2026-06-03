# describe-fill-synthesis ledger -- mvdsv `countrycode`

- **project:** mvdsv
- **knob:** `countrycode` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:countrycode: synthesized -- CVAR_SERVERINFO country-code label published to serverinfo (cvar.c:157), no engine read site, no gameplay effect -- origin=synthesized ref=src/cvar.c:157 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the country code this server advertises in its server-info string, so server browsers and clients can show or filter by which country the server is in. Purely informational -- it has no effect on gameplay or connections. When set, the value is published in the server's info; leaving it empty advertises no country. The expected value is a short country code (for example, se).
>
> Default: empty (no country advertised).
> Set by: server config / rcon.
> See also: city, coords.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default empty / CVAR_SERVERINFO | src/sv_main.c:178 | `cvar_t countrycode = {"countrycode", "", CVAR_SERVERINFO}; // example: "se"` | yes |
| registered | src/sv_main.c:3499 | `Cvar_Register (&countrycode);` | yes |
| value published in serverinfo when set | src/cvar.c:157-159 | `if (var->flags & CVAR_SERVERINFO) { SV_ServerinfoChanged (var->name, var->string); }` | yes |
| empty/OFF-state not advertised | src/cvar.c:131-132 | `if ((var->flags & CVAR_SERVERINFO) && !strcmp(value, "0")) value = "";` | yes |
| no gameplay/server effect (no read site) | (whole src/) | broad grep for `countrycode` returns only registration + Cvar_Register; zero `.value`/`.string` reads | yes |
| value is documentary example, not validated | src/sv_main.c:178 | `// example: "se"` (no country-code validation in engine) | yes |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|---|---|---|---|
| 1 | Server cvar named `countrycode` exists | src/sv_main.c:178 + :3499 | `cvar_t countrycode = {"countrycode", "", CVAR_SERVERINFO};` ... `Cvar_Register (&countrycode);` | MATCH |
| 2 | Value published in serverinfo string (mirrored) | src/cvar.h:62 + src/cvar.c:157-159 | `#define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo`; `if (var->flags & CVAR_SERVERINFO) { SV_ServerinfoChanged (var->name, var->string); }` | MATCH |
| 3 | Actually written into svs.info + broadcast to clients (browsers/clients can show/filter) | src/sv_ccmds.c:1383-1386 | `if (strcmp(string, Info_ValueForKey (svs.info, key))) { Info_SetValueForKey (svs.info, key, string, MAX_SERVERINFO_STRING); SV_SendServerInfoChange (key, string); }` | MATCH |
| 4 | Purely informational -- no gameplay/connection effect | EXHAUSTIVE GREP src/ -- only 2 sites (decl sv_main.c:178 + register sv_main.c:3499); zero `cvar("countrycode")`, zero `&countrycode` value-read, zero `Info_ValueForKey(...,"countrycode")` | (no enforcing read-site consumes the value) | MATCH (negative confirmed by absence) |
| 5 | When set, value is published in server info | src/cvar.c:159 -> src/sv_ccmds.c:1381-1386 | `string = Cvar_ServerInfoValue(key, string);` then SetValue+Send as in #3 | MATCH |
| 6 | OFF-state: empty advertises no country | src/common.c:1079-1081 | `Info_RemoveKey (s, key); if (!value || !strlen(value)) return;` -- empty value removes key, never re-added | MATCH |
| 7 | Expected value: short country code (e.g. se) | src/sv_main.c:178 (comment) | `// example: "se"` | MATCH (illustrative; desc hedges "for example") |
| 8 | Default: empty | src/sv_main.c:178 (registered default) | `{"countrycode", "", CVAR_SERVERINFO}` -- registered default `""`; no shipped-cfg override found | MATCH |
| 9 | Set by: server config / rcon | src/sv_main.c:178/:3499 -- server-side registration, flags = CVAR_SERVERINFO only (no CVAR_ROM) | standard writable server cvar | MATCH |
| 10 | See also: city, coords | src/sv_main.c:179-180 | `cvar_t city = {"city", "", CVAR_SERVERINFO};` `cvar_t coords = {"coords", "", CVAR_SERVERINFO};` -- sibling serverinfo cvars in same block | MATCH |

**V-pass notes:** Oracle confirmed: mvdsv @ 1.11-53-g18d0362.

countrycode has exactly TWO use-sites tree-wide (src/sv_main.c:178 declaration, src/sv_main.c:3499 registration). The cvar value is never read by name anywhere -- no cvar("countrycode"), no &countrycode value access, no Info_ValueForKey back-read of the "countrycode" serverinfo key. Its ONLY behavior is the CVAR_SERVERINFO flag (cvar.h:62, bit 1<<0, comment "mirrored to serverinfo").

Enforcement chain traced fully into callees:
- Cvar_Set (cvar.c:157-160): if flag set -> SV_ServerinfoChanged(name, string).
- SV_ServerinfoChanged (sv_ccmds.c:1379-1387): runs value through Cvar_ServerInfoValue, then Info_SetValueForKey(svs.info,...) + SV_SendServerInfoChange (svc_serverinfo broadcast to clients).
- Info_SetValueForKey -> Info_SetValueForStarKey (common.c:1043-1110): line 1079-1081 `Info_RemoveKey(s,key); if (!value || !strlen(value)) return;` -- so an EMPTY value strips the key and re-adds nothing. This is the exact enforcing line for the OFF-state clause ("empty advertises no country"). MATCH, not name-inference.

Every material clause -- including the polarity ("published when set"), the OFF-state ("empty = no key"), the default ("" via registration), and the strong negative ("no gameplay/connection effect") -- maps to a located, verified enforcing line or to verified exhaustive absence of any value-consuming read. The "se" example and "see also city/coords" are illustrative and correctly hedged. Default verified against the REGISTERED literal `""` (WI-2), not a shipped cfg.

Classification: TRACED-CLEAN. No flavour-C clause (nothing asserted from name/enum/string/comment without an enforcing trace). No metadata defect.

## flags_for_review

- [fyi/other/vpass] Edge case (not a defect, not in description, FYI only): a literal value of "0" is coerced to "" before serverinfo publication at cvar.c:131 (`if ((var->flags & CVAR_SERVERINFO) && !strcmp(value, "0")) value = "";`) and again at sv_ccmds.c:1438. So countrycode "0" would also advertise nothing. Irrelevant for a country code; the description makes no claim about "0" and does not need amending.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "countrycode",
  "type": "cvar",
  "description": "Sets the country code this server advertises in its server-info string, so server browsers and clients can show or filter by which country the server is in. Purely informational -- it has no effect on gameplay or connections. When set, the value is published in the server's info; leaving it empty advertises no country. The expected value is a short country code (for example, se).\n\nDefault: empty (no country advertised).\nSet by: server config / rcon.\nSee also: city, coords.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cvar.c:157. Registered `cvar_t countrycode = {\"countrycode\", \"\", CVAR_SERVERINFO}` at sv_main.c:178 (default empty; CVAR_SERVERINFO; comment gives example \"se\"), registered via Cvar_Register at sv_main.c:3499. No `.value`/`.string` read use-site exists anywhere in src/ -- broad grep for `countrycode` returns only the registration + Cvar_Register; the engine never acts on this cvar's value. Publish-to-serverinfo behavior enforced by the CVAR_SERVERINFO flag at cvar.c:157-159 (`SV_ServerinfoChanged(var->name, var->string)` on set). Empty/OFF-state: cvar.c:131-132 forces a CVAR_SERVERINFO \"0\" to \"\", and empty is not advertised. Settable: no CVAR_ROM, no OnChange, not on any rcon blocklist. The short-country-code clause is presented as the documented expected value from the source example comment (the engine publishes the string verbatim; it does not validate against any country-code list), so it is framed as the expected value, not an enforced constraint. See-also (city/coords) are the sibling location serverinfo cvars in the same block.",
  "description_proposed": null
}
```
