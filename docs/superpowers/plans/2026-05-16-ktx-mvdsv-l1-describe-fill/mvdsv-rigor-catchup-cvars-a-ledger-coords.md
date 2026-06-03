# describe-fill-synthesis ledger -- mvdsv `coords`

- **project:** mvdsv
- **knob:** `coords` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:coords: synthesized -- CVAR_SERVERINFO lat,long location label published to serverinfo (cvar.c:157); 'coords.' grep hits are sv_bigcoords false positives; no engine read -- origin=synthesized ref=src/cvar.c:157 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the geographic coordinates this server advertises in its server-info string, so server browsers and clients can place it on a map or show its location. Purely informational -- it has no effect on gameplay or connections. When set, the value is published in the server's info; leaving it empty advertises no coordinates. mvdsv passes the value through verbatim and never parses or validates it; the latitude,longitude shape (for example, 59.3327,18.0656) is only a convention interpreted by server browsers.
>
> Default: empty (no coordinates advertised).
> Set by: server config / rcon.
> See also: city, countrycode.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default empty / CVAR_SERVERINFO | src/sv_main.c:180 | `cvar_t coords = {"coords", "", CVAR_SERVERINFO}; // example: "59.3327,18.0656"` | yes |
| registered | src/sv_main.c:3501 | `Cvar_Register (&coords);` | yes |
| value published in serverinfo when set | src/cvar.c:157-159 | `if (var->flags & CVAR_SERVERINFO) { SV_ServerinfoChanged (var->name, var->string); }` | yes |
| empty/OFF-state not advertised | src/cvar.c:131-132 | `if ((var->flags & CVAR_SERVERINFO) && !strcmp(value, "0")) value = "";` | yes |
| no gameplay/server effect (grep hits are sv_bigcoords) | src/sv_ents.c:51, src/sv_init.c:327 | both are `sv_bigcoords.value`, not `coords` -- false positives | yes |
| format is documentary example, not enforced | src/sv_main.c:180 | `// example: "59.3327,18.0656"` (no parse/validate of the string in engine) | yes |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | "Sets the geographic coordinates this server advertises in its server-info string" (serverinfo-mirroring) | src/sv_main.c:180 + src/cvar.h:62 + src/cvar.c:157-160 | `cvar_t coords = {"coords","",CVAR_SERVERINFO};` ; `#define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo` ; `if (var->flags & CVAR_SERVERINFO) { SV_ServerinfoChanged(var->name, var->string); }` | MATCH |
| 2 | "so server browsers and clients can place it on a map or show its location" (downstream consumer/purpose) | (no in-repo site -- consumer is external master/browser) | n/a -- MVDSV only writes the key; no consumer code in this tree | UNTRACEABLE (out-of-codebase purpose; not an MVDSV behavior assertion) |
| 3 | "Purely informational -- it has no effect on gameplay or connections" (negative behavioral claim) | src/sv_main.c:180,3501 ONLY (exhaustive wide-grep of tree) | only decl `{"coords",...}` + `Cvar_Register(&coords);` exist; zero read-sites of the coords value anywhere | MATCH (negative claim verified by wide-read: no branch/read consumes coords) |
| 4 | "When set, the value is published in the server's info" | src/sv_ccmds.c:1379-1387 -> src/common.c:1083 | `SV_ServerinfoChanged`: `Info_SetValueForKey(svs.info,key,string,...)`; `Info_SetValueForStarKey`: `snprintf(_new,"\\%s\\%s",key,value)` then appended | MATCH |
| 5 | "leaving it empty advertises no coordinates" (OFF-state) | src/common.c:1079-1081 + src/cvar.c:131-132 | `Info_RemoveKey(s,key); if (!value || !strlen(value)) return;` ; `if ((var->flags & CVAR_SERVERINFO) && !strcmp(value,"0")) value="";` | MATCH (empty/"0" -> key removed, never re-added) |
| 6 | "The expected format is a latitude,longitude pair (for example, 59.3327,18.0656)" | src/sv_main.c:180 (COMMENT only) | `// example: "59.3327,18.0656"` -- no parser/validator/read-site anywhere | UNTRACEABLE / flavour-C: derived solely from config comment; MVDSV accepts any string verbatim and never enforces lat,long shape |
| 7 | "Default: empty (no coordinates advertised)" | src/sv_main.c:180 + src/cvar.c:267-269 | registered default `""`; `Cvar_Register` sets through `Cvar_SetROM` | MATCH (WI-2: registered default, not a shipped-cfg value) |
| 8 | "Set by: server config / rcon" | src/sv_main.c:180 (flags = CVAR_SERVERINFO, no CVAR_ROM) + src/cvar.c:122-161 | plain settable cvar; `Cvar_Set` proceeds (no `CVAR_ROM` early-return) | MATCH (settable via normal cvar/serverinfo path; not ROM-locked) |
| 9 | "See also: city, countrycode" | src/sv_main.c:178-179 | `countrycode = {"countrycode","",CVAR_SERVERINFO};` ; `city = {"city","",CVAR_SERVERINFO};` | MATCH (adjacent parallel geo serverinfo trio, also zero read-sites) |

**V-pass notes:** Oracle confirmed: mvdsv @ 1.11-53-g18d0362.

Core behavior is TRACED-CLEAN. `coords` is a pure CVAR_SERVERINFO passthrough cvar with EXACTLY two use-sites in the whole tree -- declaration (sv_main.c:180) and registration (sv_main.c:3501) -- and ZERO read-sites. Every other "coords" grep hit belongs to the unrelated network-precision family (msg_coordsize / sv_bigcoords / FTE_PEXT_FLOATCOORDS) and does NOT touch this cvar. I traced the full serverinfo chain end-to-end: Cvar_Set (cvar.c:157-160) -> SV_ServerinfoChanged (sv_ccmds.c:1379-1387) -> Info_SetValueForKey -> Info_SetValueForStarKey (common.c:1043-1111). Clause 5 (empty -> no coordinates) is firmly enforced at common.c:1079-1081 (Info_RemoveKey then early-return on empty, key never re-added) plus the "0"->"" coercion at cvar.c:131-132. Clause 3 (informational / no gameplay effect) is the strongest possible negative claim because the exhaustive wide-read finds no consumer at all. Clauses 7/8/9 (default empty, settable, see-also trio) all verify.

Classification = C-NEAR-MISS, driven by ONE clause: "The expected format is a latitude,longitude pair." This is textbook flavour-C -- it derives entirely from the registration COMMENT `// example: "59.3327,18.0656"`, and MVDSV neither parses, validates, nor reads the value, so no enforcing read-site exists. The "latitude,longitude" label is itself an inference on top of the bare two-number example (the comment never says "latitude,longitude"). Per enforce-trace-discipline lines 43-46 and the C-NEAR-MISS enum (lines 102-104), a behavioral-shape clause resting only on a config comment with no enforcing line is a near-miss even when it happens to be true. It is NOT C-FIX (nothing contradicts the code; the cvar accepts any string, so the clause is un-falsified, just un-enforced) and NOT WI2-FIX (metadata is correct).

Fairness caveats on the borderline: (a) the clause is hedged ("expected format is", "for example"), not stated as MVDSV-enforced validation; (b) for a passthrough serverinfo cvar an enforcing read-site CANNOT exist in this repo by design -- the value's meaning lives entirely in downstream consumers (master server / server browser); (c) the example is copied faithfully from source. The honest remedy is a half-clause clarifying that MVDSV passes the value through verbatim and never validates it -- the lat,long shape is a convention interpreted only by browsers/master, not something the server checks. Clause 2 (browsers place it on a map) is the same out-of-codebase register and is not an MVDSV behavior assertion, so it is logged UNTRACEABLE but is not itself the defect driver.

## flags_for_review

- [fyi/runtime-dead-suspect/vpass] The 'coords' cvar has ZERO read-sites in the entire mvdsv tree (only decl sv_main.c:180 + register sv_main.c:3501). It is write-only to serverinfo; all consumption is external (master server / server browser). This is correct/by-design, not a bug -- flagged so the synth record reflects that 'no gameplay effect' is enforced by absence-of-consumer, not by a guard. The sibling see-also cvars city (sv_main.c:179) and countrycode (sv_main.c:178) are identically read-site-free, confirming a genuine parallel geo-serverinfo trio.
- [review/other/vpass] The 'latitude,longitude' format clause and the value 59.3327,18.0656 originate solely from the source comment at sv_main.c:180; mvdsv performs no validation or parsing. Any value (non-numeric, malformed, wrong order) is mirrored to serverinfo verbatim. The geographic interpretation is convention enforced only downstream. This is the C-NEAR-MISS driver; a re-synth should either drop the format-shape assertion or explicitly mark it as a documentation convention not validated by the server.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "coords",
  "type": "cvar",
  "description": "Sets the geographic coordinates this server advertises in its server-info string, so server browsers and clients can place it on a map or show its location. Purely informational -- it has no effect on gameplay or connections. When set, the value is published in the server's info; leaving it empty advertises no coordinates. mvdsv passes the value through verbatim and never parses or validates it; the latitude,longitude shape (for example, 59.3327,18.0656) is only a convention interpreted by server browsers.\n\nDefault: empty (no coordinates advertised).\nSet by: server config / rcon.\nSee also: city, countrycode.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cvar.c:157. Registered `cvar_t coords = {\"coords\", \"\", CVAR_SERVERINFO}` at sv_main.c:180 (default empty; CVAR_SERVERINFO; comment gives example \"59.3327,18.0656\"), registered via Cvar_Register at sv_main.c:3501. The two `coords.` grep hits (sv_ents.c:51, sv_init.c:327) are FALSE POSITIVES -- both are `sv_bigcoords.value`, a different cvar (substring match). A broad grep for the token `coords` shows zero `coords.value`/`.string` reads of THIS cvar -- the engine never acts on its value. Publish-to-serverinfo behavior enforced by the CVAR_SERVERINFO flag at cvar.c:157-159 (`SV_ServerinfoChanged(var->name, var->string)` on set). Empty/OFF-state: cvar.c:131-132 forces a CVAR_SERVERINFO \"0\" to \"\", and empty is not advertised. Settable: no CVAR_ROM, no OnChange, not on any rcon blocklist. The lat,long format clause is stated as the documented expected format from the source example comment (the engine does not parse or validate it -- it is published verbatim), so it is presented as the expected format, not an enforced constraint. See-also (city/countrycode) are the sibling location serverinfo cvars.",
  "description_proposed": null
}
```
