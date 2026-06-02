# describe-fill-synthesis ledger -- mvdsv `sv_csqc_progname`

- **project:** mvdsv
- **knob:** `sv_csqc_progname` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_csqc_progname: synthesized -- selects the client-side QuakeC .dat the server loads from gamedir and publishes (name/size/checksum) to serverinfo for capable clients; default csprogs.dat; no KTX override -- origin=synthesized ref=src/sv_init.c:215 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets which client-side QuakeC program file the server loads from its game directory and offers to connecting clients. The server publishes this file's name, size, and checksum in its server info so that supporting clients download and run it. If the named file is not found, no client-side program is offered.
>
> Default: csprogs.dat.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default csprogs.dat | src/sv_main.c:209 | `cvar_t sv_csqc_progname = { "sv_csqc_progname", "csprogs.dat" };` | MATCH |
| names the file loaded from game dir | src/sv_init.c:215 | `byte *file = FS_LoadTempFile(sv_csqc_progname.string, &size);` | MATCH |
| on load: publishes name/size/checksum to serverinfo | src/sv_init.c:219-224 | `sv.csqcchecksum = Com_BlockChecksum(...); Info_SetValueForStarKey(svs.info, "*csprogs"/"*csprogssize"/"*csprogsname", ...);` | MATCH |
| file not found -> nothing offered | src/sv_init.c:226-232 | `else { sv.csqcchecksum = 0; Info_SetValueForStarKey(... "", ...); }` | MATCH |
| guarded by FTE CSQC build | src/sv_init.c:209 | `#ifdef FTE_PEXT_CSQC` | MATCH |
| only CSQC-capable clients run it | src/sv_user.c:323 | `if (sv.csqcchecksum && !(sv_client->fteprotocolextensions & FTE_PEXT_CSQC))` | MATCH (consequence in prose) |
| no KTX override | ktx/src (grep) | grep sv_csqc_progname/csqc -> 0 hits | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Sets which client-side QuakeC program file the server loads from its game directory" | src/sv_init.c:215 → src/fs.c:982 → src/fs.c:915,924 | `byte *file = FS_LoadTempFile(sv_csqc_progname.string, &size);` → `return FS_LoadFile (path, Hunk_TempAlloc, len);` → `FS_FLocateFile(path, FSLFRT_LENGTH, &loc);` (searches gamedir searchpaths + packs) | MATCH |
| 2 | "and offers to connecting clients" | src/sv_init.c:221-224 (publish) + src/sv_user.c:322-330 (per-connect CSQC advert when client lacks ext) | `Info_SetValueForStarKey(svs.info, "*csprogsname", sv_csqc_progname.string, ...)`; `if (sv.csqcchecksum && !(sv_client->fteprotocolextensions & FTE_PEXT_CSQC)) { SV_ClientPrintf(... "This server is using CSQC ...")}` | MATCH |
| 3 | "publishes this file's name, size, and checksum in its server info" | src/sv_init.c:219-224 | `sv.csqcchecksum = Com_BlockChecksum(file, size);` `Info_SetValueForStarKey(svs.info, "*csprogs", text /*checksum*/...)` `..."*csprogssize", text /*size*/...` `..."*csprogsname", sv_csqc_progname.string...` (all three keys set) | MATCH |
| 4 | "so that supporting clients download and run it" | src/sv_user.c:323 (only FTE_PEXT_CSQC clients consume) + src/sv_user.c:1462-1463 (download auto-allow) | `if (sv.csqcchecksum && !(... & FTE_PEXT_CSQC))` advert => only ext-capable clients use it; `else if (!strncmp(name, "csprogs.dat", 11)) allow_dl = true;` (running is client-side; server only checksums/publishes) | MATCH (download auto-allow hardcodes literal "csprogs.dat", not the cvar — see flag) |
| 5 | "If the named file is not found, no client-side program is offered" | src/sv_init.c:216,226-231 | `if (file) {...} else { sv.csqcchecksum = 0; Info_SetValueForStarKey(svs.info,"*csprogs","",...); ...size "";...name ""; }` (all three keys cleared, checksum zeroed => advert at sv_user.c:323 gated off) | MATCH |
| 6 | "Default: csprogs.dat" | src/sv_main.c:209 | `cvar_t sv_csqc_progname = { "sv_csqc_progname", "csprogs.dat" };` (registered default) | MATCH |
| 7 | "Set by: server config" | src/sv_main.c:209 (no CVAR_ flags = CVAR_NONE), registered src/sv_main.c:3610 | `cvar_t sv_csqc_progname = { "sv_csqc_progname", "csprogs.dat" };` (no CVAR_ROM/CVAR_SERVERINFO/CVAR_USERINFO) `Cvar_Register (&sv_csqc_progname);` => plain server cvar, settable from config/console | MATCH |

**V-pass notes:** All 7 material clauses enforce-trace to located lines (incl. adjacent comments and callee follow-through). Classification: TRACED-CLEAN.

ENFORCING SITE: src/sv_init.c:210-233 SV_LoadCSQC(), called from SV_SpawnServer (sv_init.c:380) at every map load. Registration sv_main.c:209 (decl/default) + sv_main.c:3610 (Cvar_Register). Whole feature is #ifdef FTE_PEXT_CSQC (protocol.h:48, defined inside the PROTOCOL_VERSION_FTE block which is standard in mvdsv builds; the cvar registration, decl, load, and download-allow are all under the same guard, so they stand or fall together — consistent).

CALLEE FOLLOW (clause 1, the "loads from game directory" assertion): the caller line sv_init.c:215 only names the file; the gamedir-search semantics live two callees down — FS_LoadTempFile (fs.c:980-983) -> FS_LoadFile (fs.c:915) -> FS_FLocateFile at fs.c:924, which resolves against fs searchpaths/packs (gamedir-rooted). Traced to the enforcing layer, not stopped at the caller. MATCH.

KEY->LABEL MAPPING verified exactly: *csprogs = checksum (Com_BlockChecksum), *csprogssize = size, *csprogsname = filename. The proposed "name, size, and checksum" enumerates all three published fields with no omission and no fabrication. Note for downstream: the checksum is a QW block-checksum (Com_BlockChecksum), and the serverinfo key carrying it is literally "*csprogs" (not "*csprogschecksum") — the description's generic word "checksum" is accurate and does not over-claim a specific algorithm or key name.

OFF-STATE (clause 5) is genuinely enforced, not inferred: the else branch zeroes sv.csqcchecksum AND blanks all three keys; downstream the per-connect advert (sv_user.c:323) is gated on sv.csqcchecksum, so a not-found file => nothing offered. Solid.

"RUN" attribution (clause 4): the server never executes the .dat — it only checksums/publishes (sv_init.c:219) and, for ent updates, calls the client-side-send hook GAME_EDICT_CSQCSEND (pr2_exec.c:508). The .dat runs on the client. Proposed text correctly attributes "run it" to the client, not the server.

No second registration, no cross-mod override of this cvar found (single decl, single Cvar_Register, two read-sites: sv_init.c:215 and sv_init.c:224). The string is never copied into a global other than the temp publish.

## flags_for_review

- [fyi/suspected-bug/vpass] Download auto-allow at src/sv_user.c:1462-1463 hardcodes the literal "csprogs.dat" (strncmp len 11) and does NOT read sv_csqc_progname.string. If an admin sets sv_csqc_progname to a custom filename, the publication path (sv_init.c:224) still advertises the custom name/size/checksum correctly, but the unconditional download exemption at line 1462 will not match that custom name — the download then falls through to the generic rules and ends at allow_download_other.value (sv_user.c:1478). Net: with a non-default sv_csqc_progname, clients may be told to fetch a file the server won't auto-serve unless allow_download_other is on. This is a latent engine inconsistency, NOT a contradiction of the proposed description (which is written generically and is fully correct for the default value and for the publication semantics regardless of value). Flagged so the describe-fill author can decide whether to add a one-line caveat about custom filenames + download permissions.
- [fyi/other/vpass] Entire CSQC feature (cvar decl/register, SV_LoadCSQC, the download exemption, the per-connect advert) is compiled only when FTE_PEXT_CSQC is defined (protocol.h:48, inside the PROTOCOL_VERSION_FTE block). Standard mvdsv builds define PROTOCOL_VERSION_FTE, so the cvar is present in the shipped server. If a future/minimal build dropped PROTOCOL_VERSION_FTE, the cvar would not exist at all — worth noting only because the oracle should not assume unconditional presence. No action needed for the description as written.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_csqc_progname",
  "type": "cvar",
  "description": "Sets which client-side QuakeC program file the server loads from its game directory and offers to connecting clients. The server publishes this file's name, size, and checksum in its server info so that supporting clients download and run it. If the named file is not found, no client-side program is offered.\n\nDefault: csprogs.dat.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_init.c:215. Registration src/sv_main.c:209 cvar_t sv_csqc_progname = { \"sv_csqc_progname\", \"csprogs.dat\" } -> default 'csprogs.dat'. Enforcing read-site src/sv_init.c:215 (inside SV_LoadCSQC, sv_init.c:210, guarded `#ifdef FTE_PEXT_CSQC` sv_init.c:209) `byte *file = FS_LoadTempFile(sv_csqc_progname.string, &size);` -- the .string is the filename loaded from the game dir, so 'sets which client-side QuakeC program file the server loads' (not a name restatement: the cvar name says 'csqc progname', the doc states what selecting it does). On success (sv_init.c:216-225) the engine computes the checksum (sv_init.c:219) and publishes *csprogs (checksum), *csprogssize (size), and *csprogsname (the filename) into the server info via Info_SetValueForStarKey (sv_init.c:221-224); on failure (sv_init.c:226-232) those keys are cleared and sv.csqcchecksum = 0 -> hence 'if the named file is not found, no client-side program is offered.' SV_LoadCSQC is invoked at server spawn (src/sv_init.c:380). The client-download/run consequence is enforced at src/sv_user.c:323 `if (sv.csqcchecksum && !(sv_client->fteprotocolextensions & FTE_PEXT_CSQC))` -- the server only proceeds with CSQC when a checksum exists and the client advertised CSQC support; I stated this as the user-observable 'supporting clients download and run it' and kept the FTE-extension mechanics out of the prose. F-MV1: grep of ktx/src for sv_csqc_progname / csqc returns zero hits -> no KTX override.",
  "description_proposed": null
}
```
