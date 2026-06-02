# describe-fill-synthesis ledger -- mvdsv `qwm_name`

- **project:** mvdsv
- **knob:** `qwm_name` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `version-build-identity` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qwm_name: synthesized -- writable mod-identity placeholder (empty until the mod sets it); engine substring-matches "KTX" to gate the server-side-weapon ext (sv_init.c:424) and post-start broadcast visibility (sv_broadcast.c:622); KTX populates it (F-MV1) -- origin=synthesized ref=src/sv_init.c:424 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Holds the short name of the game mod the server is running. It is empty until the running mod fills it in (for example, KTX sets it to its mod name).
>
> The server checks this name for "KTX" to enable two KTX-specific behaviors: it lets server broadcast messages reach players even after a match has started (when k_spectalk is on), and it turns on the server-side weapon extension (when sv_pext_mvdsv_serversideweapon is on).
>
> Default: empty.
> Set by: normally set by the mod; also settable in server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| writable, default empty, mod-populated | src/sv_main.c:3422 | `static cvar_t qwm_name = { "qwm_name", "" };` (no CVAR_ROM) | MATCH |
| engine substring-matches against "KTX" | src/sv_init.c:424 | `strstr(Cvar_String("qwm_name"), "KTX")` (comment: "Cheap 'ktx' detection") | MATCH |
| enables server-side weapon ext (with sv_pext_mvdsv_serversideweapon) | src/sv_init.c:424-425 | `if (sv_pext_mvdsv_serversideweapon.value && strstr(...,"KTX")) { svs.mvdprotocolextension1 |= MVD_PEXT1_SERVERSIDEWEAPON;` | MATCH |
| lets broadcasts reach players post-start (with k_spectalk) | src/sv_broadcast.c:622 | `spectalk = strstr(Cvar_String("qwm_name"), "KTX") && Cvar_Value("k_spectalk");` | MATCH |
| "post-start" scope of that broadcast gate | src/sv_broadcast.c:626 | `if (client->state != cs_spawned || (started && !client->spectator && !spectalk)) continue;` | MATCH |
| KTX is the live populator (F-MV1) | ktx/src/g_main.c:501 | `cvar_set("qwm_name", MOD_NAME);` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Holds the short name of the game mod the server is running | src/sv_main.c:3421-3422 | `// qwm = QuakeWorld Mod information placeholders` then `static cvar_t qwm_name = { "qwm_name", "" };` | MATCH |
| 2 | Empty until the running mod fills it in | src/sv_main.c:3422 + tree-wide grep | `{ "qwm_name", "" }`; grep over /src finds ZERO C-side writers (only Cvar_Register + Cvar_String reads) -> mvdsv never sets it itself, an external mod/config must | MATCH |
| 3 | Server checks this name for "KTX" (substring match) | src/sv_broadcast.c:622 ; src/sv_init.c:424 | `strstr(Cvar_String("qwm_name"), "KTX")` (substring, not equality -- description says "checks ... for KTX", accurate) | MATCH |
| 4 | Lets server-broadcast messages reach players even after a match has started, when k_spectalk is on | src/sv_broadcast.c:622, 624-632 (in SVC_Broadcast family) | `spectalk = strstr(Cvar_String("qwm_name"),"KTX") && Cvar_Value("k_spectalk");` then skip `if (client->state != cs_spawned || (started && !client->spectator && !spectalk))`. started=GameStarted() (sv_main.c:226 = non-stream dest OR status!="Standby" = live match). Non-spectator post-start receives only when spectalk true. k_spectalk has exactly ONE use-site, this line. | MATCH |
| 5 | Turns on the server-side weapon extension, when sv_pext_mvdsv_serversideweapon is on | src/sv_init.c:424-427 (in SV_SpawnServer) | `// Cheap 'ktx' detection` then `if (sv_pext_mvdsv_serversideweapon.value && strstr(Cvar_String("qwm_name"),"KTX")) { svs.mvdprotocolextension1 |= MVD_PEXT1_SERVERSIDEWEAPON;`. MVD_PEXT1_SERVERSIDEWEAPON guards MAX_WEAPONSWITCH_OPTIONS (server.h:186-188) = server-side weapon-switch protocol ext. | MATCH |
| 6 | Default: empty | src/sv_main.c:3422 | `{ "qwm_name", "" }` -- registered default is the empty string | MATCH |
| 7 | Set by: normally set by the mod; also settable in server config | src/sv_main.c:3422 (flags field = 0) vs sibling 3414 | cvar_t layout (cvar.h:66-75) is name,string,flags,...; `{ "qwm_name", "" }` leaves flags=0 = NOT read-only. Contrast `qws_name = { ..., CVAR_ROM }` (3414): the qws_* server-identity cvars are read-only, the qwm_* mod-info placeholders are writable. "Normally set by mod" grounded in the "...placeholders" comment (3421). | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. Applied enforce-trace-discipline.md per-clause.

All 7 material clauses map to located, verified enforcing lines (with adjacent comments read). Both KTX-gated behaviors are AND-chains (`strstr(qwm_name,"KTX") && <other-cvar>`); the description correctly frames the qwm_name="KTX" check as the umbrella and the second cvar (k_spectalk / sv_pext_mvdsv_serversideweapon) as the additional condition -- polarity and gating both verified. The qwm_name cvar is registered empty with flags=0 (no CVAR_ROM), and the entire tree contains NO C-side writer of qwm_name -- only Cvar_Register and two Cvar_String reads. This is the strongest possible corroboration of "empty until the mod fills it in" and "settable in server config": mvdsv genuinely never writes it. The CVAR_ROM contrast against the sibling qws_name (which IS read-only) confirms the qwm_* placeholders are intentionally writable.

WI-2 metadata: default empty verified at registration (sv_main.c:3422), not from any shipped cfg. No access-class claim to check (it's a cvar, not a CF_-flagged command).

The "for example, KTX sets it to its mod name" parenthetical references KTX (out-of-scope codebase) but is explicitly hedged as an example AND is internally corroborated by mvdsv's own two hardcoded "KTX" substring checks -- not a flavour-C inference-as-fact and not contradicted. Verdict TRACED-CLEAN.

## flags_for_review

- [fyi/off-scope-entity/vpass] qwm_name is read-only via Cvar_String in mvdsv (zero writers in tree); the only writer is an external mod's progs.dat or server config. Description cites KTX as the example writer. KTX is out-of-scope for this oracle (mvdsv @ 1.11-53-g18d0362), so the specific 'KTX sets it' fact was NOT verified against KTX source -- it is corroborated only circumstantially by mvdsv's two hardcoded strstr(...,"KTX") checks (sv_broadcast.c:622, sv_init.c:424). The clause is hedged as an example, so not a defect, but the writer attribution is unverifiable within this oracle.
- [fyi/other/vpass] Behavior B (serversideweapon) gate uses sv_pext_mvdsv_serversideweapon, which is registered with default "1" (ON by default) at sv_main.c:199. The description's parenthetical 'when sv_pext_mvdsv_serversideweapon is on' is correct but a reader may not realize that cvar defaults ON -- so in a stock KTX server this extension is effectively enabled whenever qwm_name contains KTX. No contradiction (description makes no off-by-default claim); flagged only as a precision nuance the L1 reader might miss.
- [fyi/other/vpass] Both KTX-gated behaviors are re-evaluated at runtime each time they execute -- serversideweapon detection runs inside SV_SpawnServer (every map spawn, sv_init.c:246/424), spectalk is re-read on every broadcast (sv_broadcast.c:622). So the effect tracks the CURRENT value of qwm_name, not a value latched at startup. Description makes no timing claim, so consistent; noted for completeness.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_paused=C-FIX, serverdemo=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qwm_name",
  "type": "cvar",
  "description": "Holds the short name of the game mod the server is running. It is empty until the running mod fills it in (for example, KTX sets it to its mod name).\n\nThe server checks this name for \"KTX\" to enable two KTX-specific behaviors: it lets server broadcast messages reach players even after a match has started (when k_spectalk is on), and it turns on the server-side weapon extension (when sv_pext_mvdsv_serversideweapon is on).\n\nDefault: empty.\nSet by: normally set by the mod; also settable in server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_init.c:424. Declared as a plain writable cvar (no CVAR_ROM) with default \"\" at src/sv_main.c:3422; registered src/sv_main.c:3599. Two engine read use-sites, both substring-matching the cvar against \"KTX\" (`strstr(Cvar_String(\"qwm_name\"), \"KTX\")`): (1) src/sv_init.c:424 -- `if (sv_pext_mvdsv_serversideweapon.value && strstr(Cvar_String(\"qwm_name\"), \"KTX\"))` sets MVD_PEXT1_SERVERSIDEWEAPON (and ...SERVERSIDEWEAPON2 if compiled) in svs.mvdprotocolextension1, gated additionally on sv_pext_mvdsv_serversideweapon (adjacent comment \"Cheap 'ktx' detection\"); (2) src/sv_broadcast.c:622 -- `spectalk = strstr(Cvar_String(\"qwm_name\"), \"KTX\") && Cvar_Value(\"k_spectalk\")`, and the spectalk flag at line 626 is what lets a broadcast reach non-spectator clients after `started` (GameStarted, line 610), per the adjacent comment at 620-621. Both behaviors require the KTX substring AND the companion cvar -- traced as conjunctions, not the name alone. Default empty verified at decl (WI-2: bare \"\" initializer, no CVAR flags). F-MV1: KTX is the live populator -- ktx/src/g_main.c:501 `cvar_set(\"qwm_name\", MOD_NAME)`; this documents the LIVE detection path, not a dead fallback. No CVAR_SERVERINFO, so not advertised in serverinfo. The other consequence of qwm_name (KTX reads it back for motd/serverinfo display, ktx motd.c:74) is non-action-changing cross-codebase context, kept out of the user doc per D20.",
  "description_proposed": null
}
```
