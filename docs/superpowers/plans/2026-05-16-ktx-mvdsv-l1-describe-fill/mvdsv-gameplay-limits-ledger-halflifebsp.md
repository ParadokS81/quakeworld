# describe-fill-synthesis ledger -- mvdsv `halflifebsp`

- **project:** mvdsv
- **knob:** `halflifebsp` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:halflifebsp: synthesized -- read-only CVAR_ROM status mirror of map BSP format (engine-set cmodel.c:1324), NOT a settable protocol toggle; misclassification flagged -- origin=synthesized ref=src/cmodel.c:1324 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Read-only status flag reporting whether the currently loaded map is a Half-Life-format BSP. 1 = the current map is a Half-Life BSP; 0 = it is a standard Quake BSP (or no map loaded). The engine sets this automatically each time a map loads; it cannot be changed by an admin.
>
> Default: 0.
> Set by: engine (read-only).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| read-only (CVAR_ROM), admin cannot set | src/sv_main.c:188 | `cvar_t sv_halflifebsp = {"halflifebsp", "0", CVAR_ROM};` | MATCH |
| engine sets it on map load | src/cmodel.c:1324 | `Cvar_SetROM(&sv_halflifebsp, map_halflife ? "1" : "0");` | MATCH |
| 1 = Half-Life BSP, 0 = Quake BSP | src/cmodel.c:1321,1324 | `map_halflife = (header->version == HL_BSPVERSION);` ... `map_halflife ? "1" : "0"` | MATCH |
| default 0 (also when no map loaded) | src/sv_main.c:188 | initializer `"0"` | MATCH |
| no other consumer of .value | src (grep) | only extern (cmodel.c:1280) + the Cvar_SetROM; no `.value` read | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|
| Read-only status flag (cannot be changed by admin) | src/cvar.c:134-135 (enforcement) + src/sv_main.c:188 (flag) | `cvar_t sv_halflifebsp = {"halflifebsp", "0", CVAR_ROM};` ... `if (var->flags & CVAR_ROM) return;` | MATCH |
| Reports whether current map is a Half-Life-format BSP | src/cmodel.c:1321,1324 | `map_halflife = (header->version == HL_BSPVERSION);` ... `Cvar_SetROM(&sv_halflifebsp, map_halflife ? "1" : "0");` | MATCH |
| 1 = current map is a Half-Life BSP | src/cmodel.c:1321,1324 + src/bspfile.h:57 | `#define HL_BSPVERSION 30` ; `map_halflife ? "1" : "0"` (HL version -> "1") | MATCH |
| 0 = standard Quake BSP | src/cmodel.c:1302-1308,1321,1324 + src/bspfile.h:56 | `#define Q1_BSPVERSION 29` ; non-HL version -> map_halflife false -> "0" | MATCH |
| 0 = no map loaded (OFF/initial state) | src/sv_main.c:188 (default) + src/cmodel.c:1324 (sole writer runs only on map load) | `{"halflifebsp", "0", CVAR_ROM}`; only write is inside CM_OpenMap | MATCH |
| Engine sets it automatically each time a map loads | src/cmodel.c:1324 via src/cmodel.c:1419 (CM_OpenMap) <- src/sv_init.c:499 (SV_SpawnServer) | `vf = CM_OpenMap(name, &header);` inside `CM_LoadMap`, called from `SV_SpawnServer` | MATCH |
| Engine CAN set it despite read-only (mechanism) | src/cvar.c:168-178 (Cvar_SetROM) | `var->flags &= ~CVAR_ROM; Cvar_Set (var, value); var->flags = saved_flags;` | MATCH |
| Default: 0 | src/sv_main.c:188 | `cvar_t sv_halflifebsp = {"halflifebsp", "0", CVAR_ROM};` | MATCH |
| Set by: engine (read-only) | src/sv_main.c:188 + src/cmodel.c:1324 | CVAR_ROM flag + only writer is engine via Cvar_SetROM | MATCH |

**V-pass notes:** All nine material clauses enforcement-traced to live source at mvdsv 1.11-53-g18d0362 (version confirmed). The cvar registers under public name "halflifebsp" via C identifier sv_halflifebsp (sv_main.c:188, registered sv_main.c:3570).

Polarity verified at the enforcing line, not inferred from the knob name: cmodel.c:1321 sets the internal flag `map_halflife = (header->version == HL_BSPVERSION)` and cmodel.c:1324 mirrors it to the cvar as "1"/"0". HL_BSPVERSION=30, Q1_BSPVERSION=29 (bspfile.h:56-57). The switch at cmodel.c:1302-1308 accepts both Q1 (29) and HL (30) headers; only header->version==30 yields "1". Direction matches the description exactly (1=HL, 0=Quake).

Read-only claim verified through the call chain, not the flag name: CVAR_ROM is enforced at cvar.c:134-135 where any Cvar_Set on a ROM cvar returns immediately (no-op) -- so an admin `set`/serverinfo write cannot change it. The engine's own update uses Cvar_SetROM (cvar.c:168-178), which saves flags, clears CVAR_ROM, calls Cvar_Set, then restores flags -- this is how the engine writes a read-only cvar. So "set by engine, cannot be changed by admin" is precisely correct.

"Each time a map loads" verified up the call chain: cmodel.c:1324 -> CM_OpenMap (cmodel.c:1277/1419) -> CM_LoadMap -> SV_SpawnServer (sv_init.c:246, call at :499/:509). SV_SpawnServer is the server map-spawn path, so the cvar is refreshed on every map change. Note: CM_LoadMap has an early-return cache (cmodel.c:1410-1417) when reloading the identical already-loaded map name -- in that path CM_OpenMap is skipped and the cvar is not re-set, but the value is already correct from the prior load, so this does not contradict the description.

The "0 when no map loaded" sub-clause is the only mildly subtle one and it holds: the registered default is "0" (sv_main.c:188) and the sole write-site (cmodel.c:1324) executes only during a map load, so before any map is spawned the cvar carries its "0" default. Traceable to default + single-writer, not name inference.

Cross-check that map_halflife genuinely means "HL-format BSP" (not an unrelated/inverted flag): it is read at cmodel.c:155/186/256/660 to switch collision-hull / clipnode interpretation for HL BSPs (declaration cmodel.c:77). The cvar therefore faithfully exposes the engine's real BSP-format determination.

No flavour-C defect, no contradiction, no untraced clause. Classification: TRACED-CLEAN.

## flags_for_review

- [review/other/synthesis] Chunk-rule misclassification: the brief lists `halflifebsp` under PROTOCOL/CONTENT (settable toggles), but source shows the cvar (sv_halflifebsp) is CVAR_ROM at sv_main.c:188 -- a read-only status MIRROR engine-written via Cvar_SetROM at cmodel.c:1324, same family as sv_paused / serverdemo. It is NOT admin-settable. Documented as a read-only mirror (Set by: engine), not a toggle. Worth confirming the chunk's other PROTOCOL/CONTENT knobs (sv_bspversion is the obvious sibling -- also CVAR_ROM, set at cmodel.c:1306/1312) are likewise mirrors.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "halflifebsp",
  "type": "cvar",
  "description": "Read-only status flag reporting whether the currently loaded map is a Half-Life-format BSP. 1 = the current map is a Half-Life BSP; 0 = it is a standard Quake BSP (or no map loaded). The engine sets this automatically each time a map loads; it cannot be changed by an admin.\n\nDefault: 0.\nSet by: engine (read-only).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cmodel.c:1324. Despite the chunk's PROTOCOL/CONTENT placement, source shows `halflifebsp` (cvar variable sv_halflifebsp) is CVAR_ROM -- a read-only status MIRROR, not a settable toggle (same family as sv_paused/serverdemo). Registered `cvar_t sv_halflifebsp = {\"halflifebsp\", \"0\", CVAR_ROM}` at sv_main.c:188. The engine writes it during map open: cmodel.c:1321 `map_halflife = (header->version == HL_BSPVERSION)` then cmodel.c:1324 `Cvar_SetROM(&sv_halflifebsp, map_halflife ? \"1\" : \"0\")` -- so 1 iff the loaded BSP's version header is HL_BSPVERSION, else 0. CVAR_ROM means Cvar_Set from console/config is rejected, so an admin cannot set it (the only writer is Cvar_SetROM here). No other read use-site consumes sv_halflifebsp.value in mvdsv (grep: only the extern at cmodel.c:1280 + the set). Default \"0\" is the registered initializer (also the value when no map is loaded, before the first CM_OpenMap). polarity (1=HL,0=Q1) verified at the set-site ternary; OFF/default state verified at the registration literal.",
  "description_proposed": null
}
```
