# describe-fill-synthesis ledger -- mvdsv `city`

- **project:** mvdsv
- **knob:** `city` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:city: synthesized -- CVAR_SERVERINFO location label published to serverinfo (cvar.c:157), no engine read site, no gameplay effect -- origin=synthesized ref=src/cvar.c:157 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the city/location label this server advertises in its server-info string, so server browsers and clients can show where the server is hosted. Purely informational -- it has no effect on gameplay or connections. When set, the value is published in the server's info; leaving it empty advertises no city.
>
> Default: empty (no city advertised).
> Set by: server config / rcon.
> See also: countrycode, coords.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default empty / CVAR_SERVERINFO | src/sv_main.c:179 | `cvar_t city = {"city", "", CVAR_SERVERINFO}; // example: "Stockholm"` | yes |
| registered | src/sv_main.c:3500 | `Cvar_Register (&city);` | yes |
| value published in serverinfo when set | src/cvar.c:157-159 | `if (var->flags & CVAR_SERVERINFO) { SV_ServerinfoChanged (var->name, var->string); }` | yes |
| empty/OFF-state not advertised | src/cvar.c:131-132 | `if ((var->flags & CVAR_SERVERINFO) && !strcmp(value, "0")) value = "";` | yes |
| no gameplay/server effect (no read site) | (whole src/) | broad grep for `city` returns only registration + Cvar_Register; zero `.value`/`.string` reads | yes |
| settable (no ROM/blocklist) | src/sv_main.c:179 | flags = CVAR_SERVERINFO only; no CVAR_ROM, no OnChange | yes |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | `city` is a configurable serverinfo cvar (identity/registration) | sv_main.c:179 + sv_main.c:3500 | `cvar_t city = {"city", "", CVAR_SERVERINFO}; // example: "Stockholm"` ; `Cvar_Register (&city);` | MATCH |
| 2 | Sets city/location label published into the server-info string | cvar.h:62 ; cvar.c:157-159 ; sv_ccmds.c:1381-1384 | `#define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo` ; `if (var->flags & CVAR_SERVERINFO) { SV_ServerinfoChanged (var->name, var->string); }` ; `Info_SetValueForKey (svs.info, key, string, MAX_SERVERINFO_STRING);` | MATCH |
| 3 | Browsers/clients can show where server is hosted (consumer) | sv_ccmds.c:1385 + SV_SendServerInfoChange def | `SV_SendServerInfoChange (key, string);` -> `MSG_WriteByte(&sv.reliable_datagram, svc_serverinfo); MSG_WriteString(...key); MSG_WriteString(...value);` (clients); browsers read same `svs.info` via status | MATCH |
| 4 | No effect on gameplay or connections (purely informational) | exhaustive grep of src | Only use-sites are declaration (sv_main.c:179) and registration (sv_main.c:3500); no read of `city`, no OnChange handler, no gameplay/connection consumer; value flows only into `svs.info` | MATCH (verified absence) |
| 5 | When set, value is published in server's info | cvar.c:130-160 (Cvar_Set) ; cvar.c:266-269 (Cvar_Register->Cvar_SetROM->Cvar_Set) | Any set of a CVAR_SERVERINFO cvar mirrors via SV_ServerinfoChanged; registration also routes through Cvar_SetROM->Cvar_Set so default/config value is mirrored | MATCH |
| 6 | Leaving it empty advertises no city (OFF-state) | common.c Info_SetValueForStarKey | `Info_RemoveKey (s, key); if (!value || !strlen(value)) return;` -> empty value removes/omits the `city` key entirely | MATCH |
| 7 | Default: empty (no city advertised) | sv_main.c:179 | registered default literal `""` (WI-2: registered default, not a shipped-cfg value) | MATCH |
| 8 | Set by: server config / rcon | sv_ccmds.c:1396-1450 (SV_Serverinfo_f) + cvar set path | `serverinfo <key> <value>` console/rcon handler calls `Cvar_Set(var, value)` for CVAR_SERVERINFO keys; also settable as a plain cvar from server config | MATCH |
| 9 | See also: countrycode, coords | sv_main.c:178 ; sv_main.c:180 | `countrycode = {"countrycode", "", CVAR_SERVERINFO}; // example: "se"` ; `coords = {"coords", "", CVAR_SERVERINFO}; // example: "59.3327,18.0656"` -- sibling location serverinfo knobs | MATCH |

**V-pass notes:** VERSION CONFIRMED: git describe == 1.11-53-g18d0362.

Classification: TRACED-CLEAN. Every material clause (identity, semantic, consumer, side-effect-negative, when-set, OFF-state, default, set-by, see-also) maps to a located + verified enforcing line including adjacent comments. No flavour-C inference detected.

Mechanism chain (fully traced, not stopped at caller): `city` carries CVAR_SERVERINFO (cvar.h:62 "mirrored to serverinfo"). On any set, Cvar_Set (cvar.c:157-159) calls SV_ServerinfoChanged, which calls Cvar_ServerInfoValue (no-op for `city`, only special-cases literal "0"/deathmatch) then Info_SetValueForKey -> Info_SetValueForStarKey (common.c), writing the key into svs.info, and SV_SendServerInfoChange pushes svc_serverinfo to connected clients. Registration (sv_main.c:3500) routes through Cvar_Register -> Cvar_SetROM -> Cvar_Set (cvar.c:266-269), so the default/config value is mirrored at startup too.

OFF-state (the most flavour-C-prone clause) independently verified to the deepest callee: Info_SetValueForStarKey does `Info_RemoveKey` then `if (!value || !strlen(value)) return;` -- an empty `city` produces NO `city` key in serverinfo. Matches "advertises no city" exactly.

"Purely informational / no gameplay or connection effect" (negative claim) is backed by EXHAUSTIVE absence: a wide case-insensitive tree grep (filtering the dominant "velocity" noise) plus targeted greps for programmatic writes (`Cvar_Set ... city`, `&city`, `SV_ServerinfoChanged("city"...)`) and for GeoIP/auto-population found ZERO consumers beyond declaration + registration. No OnChange handler. This is the right evidence shape for a "no effect" assertion.

WI-2 satisfied: default `""` is the REGISTERED default (sv_main.c:179), not a shipped-cfg datum. No access-class claim made (serverinfo cvar; settable via config or rcon `serverinfo` command, both verified).

See-also entities verified as real sibling location knobs: countrycode (sv_main.c:178) and coords (sv_main.c:180), both CVAR_SERVERINFO.

Relevant files: /home/paradoks/projects/quakeworld/research/repos/mvdsv/src/sv_main.c (179, 3500), src/cvar.h (62), src/cvar.c (107-115, 122-161, 240-270), src/sv_ccmds.c (1379-1451, SV_SendServerInfoChange), src/common.c (Info_SetValueForKey / Info_SetValueForStarKey).

## flags_for_review

- [fyi/other/vpass] Setting city to the literal string "0" is coerced to empty (key omitted): Cvar_ServerInfoValue (cvar.c:111) and Cvar_Set (cvar.c:131) both force CVAR_SERVERINFO value "0" to "" (deathmatch excepted). Peripheral edge the description does not mention and is not required to. Not a defect; informational only.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "city",
  "type": "cvar",
  "description": "Sets the city/location label this server advertises in its server-info string, so server browsers and clients can show where the server is hosted. Purely informational -- it has no effect on gameplay or connections. When set, the value is published in the server's info; leaving it empty advertises no city.\n\nDefault: empty (no city advertised).\nSet by: server config / rcon.\nSee also: countrycode, coords.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cvar.c:157. Registered `cvar_t city = {\"city\", \"\", CVAR_SERVERINFO}` at sv_main.c:179 (default empty; CVAR_SERVERINFO flag), registered via Cvar_Register at sv_main.c:3500. No `.value`/`.string` read use-site exists anywhere in src/ -- the engine never acts on this cvar's value (broad grep returns only the registration + Cvar_Register). Publish-to-serverinfo behavior is enforced by the CVAR_SERVERINFO flag at cvar.c:157-159: `if (var->flags & CVAR_SERVERINFO) SV_ServerinfoChanged(var->name, var->string)` -- when the cvar is set, its value goes into the serverinfo string for clients/browsers. OFF/empty-state: cvar.c:131-132 forces any CVAR_SERVERINFO value of \"0\" to \"\" (empty), and an empty serverinfo value is not advertised. Settable: no CVAR_ROM, no OnChange, not on any rcon blocklist. 'Informational, no gameplay effect' clause traced to the absence of any read site (the value is consumed only by remote clients/browsers reading serverinfo, not by this engine). Source comment gives the example value \"Stockholm\". See-also (countrycode/coords) are the sibling location serverinfo cvars in the same block.",
  "description_proposed": null
}
```
