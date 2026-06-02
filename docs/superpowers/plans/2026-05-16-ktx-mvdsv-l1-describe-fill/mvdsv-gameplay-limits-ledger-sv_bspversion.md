# describe-fill-synthesis ledger -- mvdsv `sv_bspversion`

- **project:** mvdsv
- **knob:** `sv_bspversion` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_bspversion: synthesized -- read-only CVAR_ROM status mirror of the loaded map's BSP format (1=Q1/HL, 2=BSP2), engine-set at map load via Cvar_SetROM, not admin-settable; no KTX override -- origin=synthesized ref=src/cmodel.c:1306 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Reports the BSP map-format version of the map the server currently has loaded. This is a read-only status value that the engine sets automatically when it loads a map; an admin cannot change it.
>
> 1 = standard Quake 1 / Half-Life BSP format.
> 2 = extended (BSP2) format.
>
> Default: 1 (until a map is loaded).
> Set by: engine (read-only).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| read-only, engine-set (not settable) | src/sv_main.c:189 | `cvar_t sv_bspversion = {"sv_bspversion", "1", CVAR_ROM};` | MATCH |
| set to 1 for Q1/HL BSP at map load | src/cmodel.c:1303-1306 | `case Q1_BSPVERSION: case HL_BSPVERSION: Cvar_SetROM(&sv_bspversion, "1");` | MATCH |
| set to 2 for BSP2 at map load | src/cmodel.c:1309-1312 | `case Q1_BSPVERSION2: case Q1_BSPVERSION29a: Cvar_SetROM(&sv_bspversion, "2");` | MATCH |
| unknown version rejected | src/cmodel.c:1315-1317 | `default: ... Host_Error ("CM_OpenMap: %s has wrong version number...")` | MATCH |
| value read to gate extended edict limits | src/sv_init.c:519 | `if (... sv_extlimits.value == 2 && sv_bspversion.value < 2) { sv.max_edicts = min(...); }` | MATCH (routed to See also) |
| no KTX override | ktx/src (grep) | grep sv_bspversion -> 0 hits | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Reports the BSP map-format version of the currently loaded map | cmodel.c:1302-1314 (inside CM_OpenMap, on the CM_LoadMap path cmodel.c:1419) | `switch (header->version) { case Q1_BSPVERSION: case HL_BSPVERSION: ... Cvar_SetROM(&sv_bspversion, "1"); ... case Q1_BSPVERSION2: case Q1_BSPVERSION29a: ... Cvar_SetROM(&sv_bspversion, "2");` -- value derived from the just-read BSP header of the map being opened | MATCH |
| 2 | Read-only status; engine sets automatically on map load; admin cannot change it | reg: sv_main.c:189 `cvar_t sv_bspversion = {"sv_bspversion","1",CVAR_ROM};` + cvar.h:63 `#define CVAR_ROM (1<<1) // read only` + cvar.c:134-135 `if (var->flags & CVAR_ROM) return;` (blocks user `set`) + engine write via Cvar_SetROM cmodel.c:1306/1312, which clears ROM internally cvar.c:175-178 `var->flags &= ~CVAR_ROM; Cvar_Set(var,value); var->flags = saved_flags;` | User `set` no-ops (CVAR_ROM early-return); engine writes only via Cvar_SetROM during CM_OpenMap. | MATCH |
| 3 | 1 = standard Quake 1 / Half-Life BSP format | cmodel.c:1303-1306 + bspfile.h:56-57 | `case Q1_BSPVERSION: case HL_BSPVERSION:` both fall through to `Cvar_SetROM(&sv_bspversion, "1");`. `Q1_BSPVERSION=29`, `HL_BSPVERSION=30` -- both map to "1" | MATCH |
| 4 | 2 = extended (BSP2) format | cmodel.c:1309-1312 + bspfile.h:58-59 | `case Q1_BSPVERSION2: case Q1_BSPVERSION29a:` both -> `Cvar_SetROM(&sv_bspversion, "2");`. `Q1_BSPVERSION2` = 'BSP2' magic, `Q1_BSPVERSION29a` = '2PSB' magic; both umbrella'd as "extended (BSP2)" | MATCH (BSP2 is the literal magic; "2" also covers the 2PSB sibling variant -- still-true umbrella, traceable) |
| 5 | Default: 1 (until a map is loaded) | sv_main.c:189 (registration struct) | `cvar_t sv_bspversion = {"sv_bspversion","1",CVAR_ROM};` -- WI-2: verified against the REGISTERED default, not a shipped cfg. No reset-to-other-value site exists, so "1" persists until first CM_OpenMap | MATCH |
| 6 | Set by: engine (read-only) | same as clauses 1-2 | Only two write-sites tree-wide, both `Cvar_SetROM(&sv_bspversion, ...)` in CM_OpenMap (cmodel.c:1306, 1312). No OnChange, no clamp, no user-writable path | MATCH |

**V-pass notes:** TRACED-CLEAN. All six clauses map to located, verified enforcing lines with matching adjacent code. Oracle confirmed: git describe == 1.11-53-g18d0362.

Exhaustive write-site sweep (grep `sv_bspversion` whole src tree): exactly TWO writes, both `Cvar_SetROM` inside CM_OpenMap -- cmodel.c:1306 ("1") and cmodel.c:1312 ("2"). No reset-on-invalidate, no OnChange handler, no clamp. The only runtime values the engine can produce are "1" and "2"; the registered default "1" (sv_main.c:189) holds until the first map load, so the description's "Default: 1 (until a map is loaded)" is exact.

Read-only chain fully traced: CVAR_ROM (cvar.h:63 "read only") + Cvar_Set early-return on CVAR_ROM (cvar.c:134-135) blocks any user `set`; the engine's own writes go through Cvar_SetROM (cvar.c:168-179) which temporarily strips the ROM flag, sets, then restores it -- the standard MVDSV engine-owned-value pattern. So "admin cannot change it / Set by: engine" is correct, not name-inferred.

Value mapping is precise, not enum-name-inferred: I confirmed the constants -- Q1_BSPVERSION=29, HL_BSPVERSION=30 both -> "1" (so "1 = Quake 1 / Half-Life" correctly bundles BOTH v29 and v30); Q1_BSPVERSION2 ('BSP2' magic) and Q1_BSPVERSION29a ('2PSB' magic) both -> "2". The description's "1 = standard Quake 1 / Half-Life" and "2 = extended (BSP2)" are accurate umbrellas over the four header cases. The `default:` case (cmodel.c:1315-1317) Host_Errors out, so an unrecognized version never assigns a third value -- consistent with the binary 1/2 framing.

The one read-consumer of the value (sv_init.c:519: `sv_extlimits.value==2 && sv_bspversion.value<2` -> clamp max_edicts to MAX_EDICTS_SAFE) is downstream behavior of a DIFFERENT cvar (sv_extlimits) and is correctly NOT claimed by this description -- no over-reach.

## flags_for_review

- [fyi/other/synthesis] sv_bspversion is registered with a literal default "1" but is CVAR_ROM and immediately overwritten at every map load via Cvar_SetROM (cmodel.c:1306/1312). The extractor default of `1` is therefore the pre-map-load placeholder, not an admin-meaningful default -- consistent with the read-only-status-mirror class (sv_paused/serverdemo). Flagging so the V-pass treats it as a status mirror, not a settable knob.
- [fyi/off-scope-entity/vpass] Sibling cvar sv_halflifebsp (registered name "halflifebsp", sv_main.c:188, also CVAR_ROM) is set in the SAME CM_OpenMap block (cmodel.c:1324: Cvar_SetROM(&sv_halflifebsp, map_halflife?"1":"0")) and is what actually distinguishes Half-Life (v30) maps from Q1 (v29) -- since sv_bspversion collapses both v29 and v30 to "1". Not a defect in this description (it correctly says "Quake 1 / Half-Life"), but if this knob's note ever needs to answer "is the current map specifically Half-Life format", the answer lives in the halflifebsp cvar, not sv_bspversion. Likely a separate row in the same chunk.
- [fyi/other/vpass] Consumer coupling worth noting for cross-referencing: sv_init.c:519 reads sv_bspversion.value (<2 branch) together with sv_extlimits.value==2 to decide whether to clamp sv.max_edicts to MAX_EDICTS_SAFE. This is the sole engine READ of sv_bspversion's value. It belongs in sv_extlimits' description, not here, but the sv_bspversion<2 condition means a BSP2 map (value 2) lifts the safe-edict clamp under sv_extlimits=2 -- a real cross-cvar interaction for whoever documents sv_extlimits.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_bspversion",
  "type": "cvar",
  "description": "Reports the BSP map-format version of the map the server currently has loaded. This is a read-only status value that the engine sets automatically when it loads a map; an admin cannot change it.\n\n1 = standard Quake 1 / Half-Life BSP format.\n2 = extended (BSP2) format.\n\nDefault: 1 (until a map is loaded).\nSet by: engine (read-only).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cmodel.c:1306. Registration src/sv_main.c:189 cvar_t sv_bspversion = {\"sv_bspversion\", \"1\", CVAR_ROM} -- CVAR_ROM = read-only, so this is NOT a settable toggle (same class as the sv_paused/serverdemo read-only mirrors in the brief); the registered \"1\" is only the pre-map-load initial value. The engine WRITES it at map load: src/cmodel.c:1302-1313 switches on the BSP header version and calls Cvar_SetROM(&sv_bspversion, \"1\") for Q1_BSPVERSION/HL_BSPVERSION (cmodel.c:1306) and Cvar_SetROM(&sv_bspversion, \"2\") for Q1_BSPVERSION2/Q1_BSPVERSION29a (cmodel.c:1312); an unknown version is rejected with Host_Error (cmodel.c:1315-1317). Hence the value mirrors the loaded map's format (1=Q1/HL, 2=BSP2). I used Cvar_SetROM at cmodel.c:1306 as the source_ref because that is the authoritative write that establishes the value the cvar reports. The read consumer is src/sv_init.c:519 `if (sv_extlimits.value == 0 || (sv_extlimits.value == 2 && sv_bspversion.value < 2))` which clamps sv.max_edicts to MAX_EDICTS_SAFE (sv_init.c:520) -- i.e. extended edict limits depend on having a BSP2 map; I deliberately routed this sv_extlimits interaction OUT of the L1 prose (it is cross-cvar context, See also: sv_extlimits's own doc) to keep the user doc to the read-only-status meaning. F-MV1: grep of ktx/src for sv_bspversion returns zero hits -> no KTX override.",
  "description_proposed": null
}
```
