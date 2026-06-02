# describe-fill-synthesis ledger -- mvdsv `watervis`

- **project:** mvdsv
- **knob:** `watervis` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:watervis: synthesized -- CVAR_SERVERINFO flag the engine only mirrors into serverinfo (never reads), 0=>key removed, default 0; translucent-water rendering is a client consequence routed to See also: L3; all engine-side clauses TRACED-CLEAN -- origin=synthesized ref=src/cvar.c:157 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Advertises to connecting clients that translucent (see-through) water is permitted on this server. The server only publishes the setting in its server info; the actual translucent-water rendering happens on each client. Whether a player sees translucent water also depends on their own client and the map.
>
> 0 = not advertised (the key is removed from server info).
> 1 = advertised as allowed.
>
> Default: 0.
> Set by: server config.
> See also: water-visibility.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered default 0 | src/sv_main.c:167 | cvar_t watervis = {"watervis","0",CVAR_SERVERINFO}; | yes |
| no engine OnChange handler | src/sv_main.c:167 | positional {name,value,flags} init -> OnChange ptr NULL | yes |
| engine never reads the value | src/ (whole tree) | grep watervis -> only sv_main.c:167 (decl) + sv_main.c:3503 (Cvar_Register); zero .value/.string reads | yes |
| published into serverinfo on set | src/cvar.c:157-159 | if (var->flags & CVAR_SERVERINFO) SV_ServerinfoChanged(var->name, var->string); | yes |
| CVAR_SERVERINFO = mirrored to serverinfo | src/cvar.h:62 | #define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo | yes |
| 0 => key removed (stored empty) | src/cvar.c:131-132 | if ((var->flags & CVAR_SERVERINFO) && !strcmp(value,"0")) value = ""; | yes |
| serverinfo write site | src/sv_ccmds.c:1379 | void SV_ServerinfoChanged (char *key, char *string) | yes |
| translucent-water rendering is client-side | (not in mvdsv tree) | no engine read; effect realized by the client reading serverinfo -> See also L3 | hedged (routed) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | "Advertises to connecting clients that translucent water is permitted" (mirror to serverinfo + sent at connect) | sv_main.c:167 (flag) -> cvar.c:157-159 -> sv_ccmds.c:1384 -> sv_user.c:484 | `cvar_t watervis = {"watervis","0",CVAR_SERVERINFO};` / `if (var->flags & CVAR_SERVERINFO) { SV_ServerinfoChanged (var->name, var->string); }` / `Info_SetValueForKey (svs.info, key, string, MAX_SERVERINFO_STRING);` / `MSG_WriteString (&sv_client->netchan.message, va("fullserverinfo \"%s\"\n", svs.info) );` | MATCH |
| 2 | "Server only publishes the setting in its server info; actual rendering happens on each client" (no server-side render/enforce) | sv_main.c:167, sv_main.c:3503 (ONLY two sites; zero value reads tree-wide) | wide grep `watervis` => only the registration struct + `Cvar_Register (&watervis);` -- no `cvar("watervis")`, no value branch anywhere | MATCH (by verified absence of any reader) |
| 3 | "Whether a player sees translucent water also depends on their own client and the map" | (external/client-side; no MVDSV site -- asserts no server behavior) | n/a -- correctly scoped to non-server factors; MVDSV has no reader to contradict | UNTRACEABLE-by-design (external scope; not a defect -- asserts nothing about MVDSV) |
| 4 | "0 = not advertised (the key is removed from server info)" (OFF-state, load-bearing) | cvar.c:131-132 + sv_ccmds.c:1381 -> common.c:1079-1081 | `if ((var->flags & CVAR_SERVERINFO) && !strcmp(value, "0")) value = "";` / `string = Cvar_ServerInfoValue(key, string);` / `Info_RemoveKey (s, key); if (!value || !strlen(value)) return;` | MATCH |
| 5 | "1 = advertised as allowed" (any non-"0" value mirrored literally) | cvar.c:131 (only "0" forced empty) -> sv_ccmds.c:1384 | `&& !strcmp(value, "0")` (forcing applies ONLY to "0"); non-"0" passes through to `Info_SetValueForKey` | MATCH |
| 6 | "Default: 0" | sv_main.c:167 | `cvar_t watervis = {"watervis","0",CVAR_SERVERINFO};` -- registered default is the literal "0" (WI-2: registration, not a cfg value) | MATCH |
| 7 | "Set by: server config" (plain settable) | sv_main.c:167 (no CVAR_ROM, no OnChange) | flag is `CVAR_SERVERINFO` only; no ROM guard, no OnChange handler => freely settable via config/console (Cvar_Set runs the full mirror) | MATCH |
| 8 | "See also: water-visibility" | n/a (cross-reference pointer) | out of code-trace scope -- not a behavioral assertion | n/a |

**V-pass notes:** TRACED-CLEAN. Oracle confirmed mvdsv @ 1.11-53-g18d0362. watervis has exactly TWO use-sites in the whole tree (sv_main.c:167 registration, sv_main.c:3503 Cvar_Register) -- NO value-reader anywhere. This is a pure no-reader serverinfo-advertisement cvar (the entire mechanism is the CVAR_SERVERINFO flag = "mirrored to serverinfo", cvar.h:62). The description's framing is exactly right for this class: it advertises a setting, MVDSV never renders water, the client does.

The load-bearing OFF-state claim ("0 = key removed from server info") is fully enforcement-traced through the call chain, NOT inferred:
- cvar.c:131-132 forces a "0" value to "" before mirroring (watervis is NOT the deathmatch special-case exemption at cvar.c:111, so the forcing applies).
- Cvar_Set -> SV_ServerinfoChanged (sv_ccmds.c:1379) re-applies the same forcing via Cvar_ServerInfoValue (cvar.c:107-115), then calls Info_SetValueForKey.
- Info_SetValueForKey -> Info_SetValueForStarKey (common.c:1043) at lines 1079-1081: `Info_RemoveKey(s, key)` ALWAYS runs, then `if (!value || !strlen(value)) return;` -- so an empty value removes the key and returns WITHOUT re-adding it. The key is genuinely deleted, not stored as "0". Clause #4 confirmed at its enforcing line incl. adjacent comments.

"1 = advertised as allowed": the "0"->"" forcing keys on `!strcmp(value, "0")` only; any other value (incl. "1") survives and is mirrored literally (sv_ccmds.c:1384). Confirmed.

WI-2 metadata: default "0" is the REGISTERED default (sv_main.c:167), not a cfg drift value. Settability ("server config"): no CVAR_ROM, no OnChange handler -- freely settable. Both clean.

Connect-time advertisement verified end-to-end: live changes broadcast svc_serverinfo (sv_ccmds.c:1373-1375); connecting clients receive the full svs.info via the `fullserverinfo` stufftext at sv_user.c:484 (new-client connect path, "connect" log at :487).

No aliases/hidden family (grepped watervis/water_vis/r_watervis/wateralpha -- nothing else). No cross-mod override concern: this is an engine (MVDSV) serverinfo cvar; KTX/QC mods could read "watervis" from serverinfo but that is downstream of the advertisement, not a contradiction of it.

Clause #3 (client + map dependency) is external-scope: it asserts nothing about MVDSV behavior and correctly attributes the visible outcome to the client and map, so there is no MVDSV line that could contradict it -- not a flavour-C defect. Clause #8 (See also) is a cross-reference, not a behavioral claim.

## flags_for_review

- [review/cross-mod-override/synthesis] watervis has NO engine reader at all in mvdsv -- it is registered solely to be mirrored into serverinfo (CVAR_SERVERINFO), and unlike the F-MV1 match-flow cvars it is not read by KTX either (grep of ktx/src returned zero hits). Its entire effect is realized by the CLIENT (ezQuake et al.) reading the serverinfo key to enable translucent water. This is the pure 'advertise-only, no same-tree consumer' shape (sibling to the chunk-7 qws_version advertise-channel pattern). The cross-engine consumer + the L3 slug 'water-visibility' I referenced in See also should be confirmed/created by a human; I did not verify that an L3 note exists.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "watervis",
  "type": "cvar",
  "description": "Advertises to connecting clients that translucent (see-through) water is permitted on this server. The server only publishes the setting in its server info; the actual translucent-water rendering happens on each client. Whether a player sees translucent water also depends on their own client and the map.\n\n0 = not advertised (the key is removed from server info).\n1 = advertised as allowed.\n\nDefault: 0.\nSet by: server config.\nSee also: water-visibility.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:167. Registered src/sv_main.c:167 cvar_t watervis = {\"watervis\",\"0\",CVAR_SERVERINFO} -> positional {name,value,flags} init: registered default \"0\" (WI-2), CVAR_SERVERINFO flag, OnChange slot NULL (no engine-side handler). Cvar_Register src/sv_main.c:3503. EXHAUSTIVE grep: the engine NEVER reads watervis.value or .string anywhere in mvdsv (only registration + register call) -- there is no water rendering on a dedicated server, so the cvar's whole engine role is to be MIRRORED INTO SERVERINFO. Enforce-trace of the only behavior the engine performs: CVAR_SERVERINFO is defined src/cvar.h:62 '(1<<0) // mirrored to serverinfo'; on set, src/cvar.c:157-159 'if (var->flags & CVAR_SERVERINFO) SV_ServerinfoChanged(var->name, var->string)' publishes it (SV_ServerinfoChanged src/sv_ccmds.c:1379); src/cvar.c:131-132 'if ((flags & CVAR_SERVERINFO) && !strcmp(value,\"0\")) value = \"\"' enforces the 0=>removed-key polarity (a serverinfo cvar set to \"0\" is stored as empty, i.e. absent from the serverinfo string). The translucent-water RENDERING is a CLIENT consequence (the connecting client reads the serverinfo key), NOT source-legible in this tree and correctly NOT asserted here beyond 'clients render it' -- routed to See also: L3 per the D20 cross-engine rule, with a short action-changing clause inline (an admin sets watervis precisely to signal/allow the client effect, the maxfps precedent). Mechanism-only, no recommended value.",
  "description_proposed": null
}
```
