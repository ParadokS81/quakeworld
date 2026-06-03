# describe-fill-synthesis ledger -- mvdsv `sv_loadentfiles`

- **project:** mvdsv
- **knob:** `sv_loadentfiles` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_loadentfiles: synthesized -- ON loads an external maps/<map>.ent file (dir-prefix via sv_loadentfiles_dir) and spawns from it, OFF/not-found uses BSP entities -- origin=synthesized ref=src/sv_init.c:605 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether the server loads an external entity (.ent) file for a map instead of using the entity data built into the map's BSP. When on, on map load the server looks for a matching .ent file under maps/ and, if found, spawns the map's entities from it; if none is found it falls back to the BSP's own entities. When off, the server always uses the BSP's built-in entities. External .ent files let a server change a map's items, spawns, or other entities without editing the .bsp.
>
> 0 = always use the entities built into the .bsp.
> 1 = use an external .ent file when one is present, otherwise the .bsp.
>
> Default: 1.
> Set by: server config / rcon.
> See also: sv_loadentfiles_dir.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| ON => attempt to load external .ent file on map load | src/sv_init.c:605-624 | `if ((int)sv_loadentfiles.value) { ... snprintf(ent_path,...,"maps/%s.ent", entityfile); entitystring = (char *) FS_LoadHunkFile(ent_path, NULL); }` | MATCH |
| dir-prefixed path tried first when sv_loadentfiles_dir set | src/sv_init.c:613-617 | `if (sv_loadentfiles_dir.string[0]) { snprintf(ent_path,...,"maps/%s/%s.ent", sv_loadentfiles_dir.string, entityfile); ... }` | MATCH |
| OFF or not-found => fall back to BSP built-in entities | src/sv_init.c:631-632 | `if (!entitystring) { entitystring = CM_EntityString(); }` | MATCH |
| loaded ent string is what spawns entities | src/sv_init.c:635 | `PR_LoadEnts(entitystring);` | MATCH |
| Default 1, settable | src/sv_main.c:148 | `cvar_t sv_loadentfiles = {"sv_loadentfiles", "1"};` | MATCH |
| KTX does not override this cvar (reads only the sibling _dir) | ktx/src/maps.c:155 | `char *entityDir = cvar_string("sv_loadentfiles_dir");` (0 hits for `sv_loadentfiles` non-_dir) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Controls whether server loads external .ent file instead of BSP entities | sv_init.c:605 + 631-632 | `if ((int)sv_loadentfiles.value)` ... `if (!entitystring) { entitystring = CM_EntityString(); }` | MATCH |
| 2a | When on, on map load looks for matching .ent under maps/ | sv_init.c:613-624 | `snprintf(ent_path, sizeof(ent_path), "maps/%s/%s.ent", sv_loadentfiles_dir.string, entityfile)` then `snprintf(ent_path, sizeof(ent_path), "maps/%s.ent", entityfile)` | MATCH |
| 2b | If found, spawns map entities from it | sv_init.c:616/623 + 635 | `entitystring = (char *) FS_LoadHunkFile(ent_path, NULL);` ... `PR_LoadEnts(entitystring);` | MATCH |
| 2c | If none found, falls back to BSP entities | sv_init.c:631-632 | `if (!entitystring) { entitystring = CM_EntityString(); }` | MATCH |
| 3 | When off (0), always uses BSP built-in entities | sv_init.c:605 + 631-632; cmodel.c:601-609 | block guarded by `if ((int)sv_loadentfiles.value)` is skipped when 0 -> entitystring NULL -> `CM_EntityString()` returns `map_entitystring`, set in `CM_LoadEntities` from BSP entity lump buffer | MATCH |
| 4 | 0 = always use BSP entities | sv_init.c:605 | `if ((int)sv_loadentfiles.value)` gates the entire .ent-loading block | MATCH |
| 5 | 1 = external .ent when present, otherwise BSP | sv_init.c:605,620-624,631 | full block: try dir, try maps/, fall back to CM_EntityString | MATCH |
| 6 | Default: 1 | sv_main.c:148 | `cvar_t  sv_loadentfiles = {"sv_loadentfiles", "1"}; //loads .ent files by default if there` (string field, cvar_s field order name,string,flags,...) | MATCH |
| 7 | Set by: server config / rcon | sv_main.c:148 + 3562; cvar.h:60-75 | struct `{"sv_loadentfiles","1"}` -> flags=0 (CVAR_NONE, no CVAR_ROM, no OnChange); `Cvar_Register(&sv_loadentfiles)` -> normal settable cvar | MATCH (generic-true for a normal settable, non-ROM cvar) |
| 8 | See also: sv_loadentfiles_dir | sv_init.c:613-616; sv_main.c:149 | `if (sv_loadentfiles_dir.string[0]) { snprintf(..., "maps/%s/%s.ent", sv_loadentfiles_dir.string, entityfile); }` | MATCH |

**V-pass notes:** Oracle version confirmed: git describe == 1.11-53-g18d0362. Wide-grep found exactly one enforcing read-site for sv_loadentfiles: sv_init.c:605 in SV_SpawnServer (the "External Entity support pinched from ZQuake" block, lines 602-636). Single registration at sv_main.c:3562; declaration sv_main.c:148; extern at sv_init.c:254. No OnChange handler, no second consumer, no cross-module override.

All clauses TRACED-CLEAN:
- Polarity/scope (clause 1): value gates whether the external .ent path is attempted at all; on miss or when 0, entitystring stays NULL and CM_EntityString() supplies the BSP lump. Verified.
- ON behavior (2a-2c): two-stage lookup (maps/<dir>/<map>.ent then maps/<map>.ent), FS_LoadHunkFile, PR_LoadEnts on whatever string results, with NULL-fallback to BSP. Verified at the exact lines.
- OFF behavior (3): traced the callee chain into cmodel.c -- CM_EntityString returns map_entitystring, populated in CM_LoadEntities (cmodel.c:601-609) directly from the BSP entity lump buffer. The "BSP built-in entities" claim is enforced, not name-inferred.
- Default 1 (clause 6, WI-2): verified against the REGISTERED default -- the cvar_s struct field order (name, string, flags, OnChange, value) confirms "1" is the string/default field, corroborated by the adjacent source comment "loads .ent files by default if there". Not a shipped-cfg value.
- Set-by (clause 7, WI-2): flags field is 0 (CVAR_NONE) -- no CVAR_ROM, so settable from server.cfg / console / rcon the standard way. Generic-true metadata for a normal settable cvar; no access-class overreach.
- See-also (clause 8): sv_loadentfiles_dir is a real partner cvar consumed in the same block to prepend a subdirectory; cross-reference accurate.

One precision nuance (NOT a defect): description says "looks for a matching .ent file under maps/". Code actually probes maps/<sv_loadentfiles_dir>/<map>.ent FIRST (when sv_loadentfiles_dir is set), then maps/<map>.ent. The subdirectory detail is correctly delegated to "See also: sv_loadentfiles_dir", so keeping the base description at maps/ is deliberate accurate scoping, not an omission. The .ent basename defaults to the map name (sv_init.c:609-610: `if (!entityfile || !entityfile[0]) entityfile = sv.mapname;`), consistent with "a matching .ent file" being matched by map name.

No flavour-C inference detected: every semantic/polarity/threshold/default/scope/OFF-state clause maps to a located enforcing line plus its adjacent comments; no inversions; no untraceable side-effect claims.

## flags_for_review

- [fyi/cross-mod-override/synthesis] Sibling sv_loadentfiles_dir (registered sv_main.c:149, not in this chunk's set) is read cross-mod by KTX: ktx/src/maps.c:155 `cvar_string("sv_loadentfiles_dir")`, and KTX ships presets for it in commands.c (sv_loadentfiles_dir "" at :4163, sv_loadentfiles_dir ctf at :4439). KTX does NOT touch sv_loadentfiles itself. Noting the cross-mod consumer of the sibling for whoever documents sv_loadentfiles_dir; F-MV1 for sv_loadentfiles is negative.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_loadentfiles",
  "type": "cvar",
  "description": "Controls whether the server loads an external entity (.ent) file for a map instead of using the entity data built into the map's BSP. When on, on map load the server looks for a matching .ent file under maps/ and, if found, spawns the map's entities from it; if none is found it falls back to the BSP's own entities. When off, the server always uses the BSP's built-in entities. External .ent files let a server change a map's items, spawns, or other entities without editing the .bsp.\n\n0 = always use the entities built into the .bsp.\n1 = use an external .ent file when one is present, otherwise the .bsp.\n\nDefault: 1.\nSet by: server config / rcon.\nSee also: sv_loadentfiles_dir.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_init.c:605. Registration cvar_t literal {\"sv_loadentfiles\", \"1\"} at sv_main.c:148 -> Default 1 (WI-2). ENFORCING site SV_SpawnServer sv_init.c:605 `if ((int)sv_loadentfiles.value)`: when on, builds ent_path and FS_LoadHunkFile a .ent file (sv_init.c:607-624); the search order is maps/<sv_loadentfiles_dir>/<map>.ent first IF sv_loadentfiles_dir.string[0] is set (:613-617), else/then maps/<map>.ent (:620-624) -> the description states 'looks for a matching .ent file under maps/' and points the dir-prefix detail at See-also sv_loadentfiles_dir. OFF / not-found fallback: `if (!entitystring) entitystring = CM_EntityString();` at sv_init.c:631-632 -> always uses the BSP entity lump when the cvar is off or no .ent file loaded -> polarity and OFF-state confirmed. The loaded entitystring is handed to PR_LoadEnts(entitystring) at :635 -> it is what spawns the map entities, confirming 'spawns the map's entities from it'. Pre-existing comment 'loads .ent files by default if there' (sv_main.c:148) is a truncated dev-aside -> ignored per chunk rule, synthesized from the enforcing site. KTX reads the sibling sv_loadentfiles_dir (cvar_string at ktx/src/maps.c:155, preset in commands.c) but does NOT override sv_loadentfiles itself -> F-MV1 negative; flagged separately as a hidden cross-mod consumer of the sibling, not of this knob.",
  "description_proposed": null
}
```
