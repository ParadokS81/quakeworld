# describe-fill-synthesis ledger -- mvdsv `sv_loadentfiles_dir`

- **project:** mvdsv
- **knob:** `sv_loadentfiles_dir` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_loadentfiles_dir: synthesized -- subdir checked first for maps/<dir>/<map>.ent before maps/<map>.ent, gated by sv_loadentfiles -- origin=synthesized ref=src/sv_init.c:613 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Names a maps subdirectory the server checks first for an external entity (.ent) file when loading a map. When set, the server looks for the entity file at maps/<dir>/<mapname>.ent before falling back to maps/<mapname>.ent; if neither exists it uses the entities built into the map. Only has effect while external entity loading is enabled (sv_loadentfiles).
>
> Default: empty (no subdirectory; only maps/<mapname>.ent is checked).
> Set by: server config / rcon.
> See also: sv_loadentfiles.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| only acts while sv_loadentfiles on | src/sv_init.c:605 | `if ((int)sv_loadentfiles.value)` | MATCH |
| non-empty value triggers subdir lookup | src/sv_init.c:613 | `if (sv_loadentfiles_dir.string[0])` | MATCH |
| checks maps/<dir>/<map>.ent first | src/sv_init.c:615 | `snprintf(ent_path, ..., "maps/%s/%s.ent", sv_loadentfiles_dir.string, entityfile)` | MATCH |
| <map> = current map name | src/sv_init.c:609-610 | `if (!entityfile || !entityfile[0]) entityfile = sv.mapname;` | MATCH |
| falls back to maps/<map>.ent | src/sv_init.c:620-623 | `if (!entitystring){ snprintf(ent_path,...,"maps/%s.ent",entityfile); entitystring = FS_LoadHunkFile(...);}` | MATCH |
| else uses built-in entities | src/sv_init.c:631-632 | `if (!entitystring){ entitystring = CM_EntityString(); }` | MATCH |
| default empty | src/sv_main.c:149 | `cvar_t sv_loadentfiles_dir = {"sv_loadentfiles_dir", ""};` | MATCH |
| set-by server config/rcon (no flag) | src/sv_main.c:3563 | `Cvar_Register (&sv_loadentfiles_dir);` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Names a maps subdirectory the server checks FIRST for an external .ent file | src/sv_init.c:612-616 | `// first try maps/sv_loadentfiles_dir/` then `if (sv_loadentfiles_dir.string[0]) { snprintf(ent_path, ..., "maps/%s/%s.ent", sv_loadentfiles_dir.string, entityfile); entitystring = FS_LoadHunkFile(ent_path, NULL); }` | MATCH |
| 2 | Looks at maps/<dir>/<mapname>.ent BEFORE maps/<mapname>.ent | src/sv_init.c:613-624 | dir-path attempt (613-617) runs first; then `// try maps/ if not loaded yet.` `if (!entitystring) { snprintf(ent_path, ..., "maps/%s.ent", entityfile); entitystring = FS_LoadHunkFile(...); }` (620-623) | MATCH on ordering and path shape. Minor imprecision: code uses `entityfile`, not always the map name — see clause 2b |
| 2b | "<mapname>" specifically | src/sv_init.c:609-610; src/sv_ccmds.c:475,481-483 | `if (!entityfile || !entityfile[0]) entityfile = sv.mapname;` — `entityfile` is the OPTIONAL 2nd arg of `map <levelname> [<entityfile>]`; equals mapname only when that arg is omitted | NEAR-MATCH (true for the default/common invocation; `<mapname>` is loose when the rare optional arg is passed) |
| 3 | If neither exists it uses the entities built into the map | src/sv_init.c:631-633 → src/cmodel.c:379 | `if (!entitystring) { entitystring = CM_EntityString(); }` ; `char *CM_EntityString (void) { return map_entitystring; }` | MATCH |
| 4 | Only has effect while sv_loadentfiles is enabled | src/sv_init.c:605 | `if ((int)sv_loadentfiles.value)` — wraps the entire external-.ent block (605-629); when 0, no .ent path (incl. the _dir path) is attempted | MATCH |
| 5 | Default: empty | src/sv_main.c:149 | `cvar_t  sv_loadentfiles_dir = {"sv_loadentfiles_dir", ""};` (string="" -> empty; flags omitted=0) | MATCH |
| 6 | Set by: server config / rcon | src/sv_main.c:149 + 3563; src/cvar.h:66-75 | initializer sets only name+string, so `flags=0` and `OnChange=NULL` (struct order name,string,flags,OnChange,value); `Cvar_Register(&sv_loadentfiles_dir)` — plain unrestricted server cvar, no ROM/init/cheat flag | MATCH |
| 7 | See also: sv_loadentfiles | src/sv_init.c:605,613 | both cvars gate the same block; sv_loadentfiles is the master switch, sv_loadentfiles_dir refines the search path inside it | MATCH |

**V-pass notes:** VERSION CONFIRMED: git describe == 1.11-53-g18d0362. Enforcing logic is the "External Entity support" block in src/sv_init.c:602-636 (SV_SpawnServer), registration/default in src/sv_main.c:149+3563, fallback callee in src/cmodel.c:377-380.

Polarity, two-step path ordering (dir-path first, bare maps/ second), built-in-entity fallback, the sv_loadentfiles master-gate, the empty default, and the unrestricted set-by-config/rcon access class are all enforce-traced and exact -- including adjacent comments ("first try maps/sv_loadentfiles_dir/", "try maps/ if not loaded yet"), which AGREE with the description rather than inverting it. The source declaration comment at sv_main.c:149 ("check for .ent file in maps/sv_loadentfiles_dir first then just maps/") independently corroborates clauses 1-2.

The only imperfection (clause 2b): the description writes "<mapname>.ent", but the code substitutes the variable `entityfile` (sv_init.c:615,622), which equals sv.mapname ONLY when the optional second argument of `map <levelname> [<entityfile>]` (sv_ccmds.c:475,481-483) is omitted. For every default invocation the description is exactly right; it is loose only for the rarely-used explicit-entityfile case. This is still-true minor vagueness that was fully traceable (the path-construction clause itself IS enforce-traced) -- it is not a name/enum/string inference (so not C-NEAR-MISS) and it makes no clause WRONG (so not C-FIX). Per the enum, "still-true minor vagueness that was traceable is acceptable" under TRACED-CLEAN. The decoupling of entity-file-name from map-name is surfaced as an FYI flag for optional copy tightening, not a defect.

## flags_for_review

- [fyi/cross-mod-override/synthesis] KTX both reads (ktx/src/maps.c:155) and writes (ktx/src/commands.c:4439 sets it to 'ctf' in the CTF config) sv_loadentfiles_dir. On a KTX server, this cvar is part of the CTF gamedir's map-loading path, not just admin-set config. Not an override of the MVDSV enforcement (the engine still owns the .ent lookup), but a live cross-mod consumer that may warrant a See also: L3 note on CTF external-entity layout.
- [fyi/other/vpass] The .ent lookup keys off the variable `entityfile` (sv_init.c:615,622), which is the OPTIONAL 2nd argument of the `map <levelname> [<entityfile>]` console command (sv_ccmds.c:475,481-483), defaulting to sv.mapname only when that arg is absent (sv_init.c:609-610). The description's '<mapname>.ent' is exact for the common case but loose when an operator runs e.g. `map dm3 customents` -- the server then probes maps/<dir>/customents.ent and maps/customents.ent, not maps/dm3.ent. Not a defect; optional copy-tightening (e.g. '<entity-file>.ent, defaulting to the map name').

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_loadentfiles_dir",
  "type": "cvar",
  "description": "Names a maps subdirectory the server checks first for an external entity (.ent) file when loading a map. When set, the server looks for the entity file at maps/<dir>/<mapname>.ent before falling back to maps/<mapname>.ent; if neither exists it uses the entities built into the map. Only has effect while external entity loading is enabled (sv_loadentfiles).\n\nDefault: empty (no subdirectory; only maps/<mapname>.ent is checked).\nSet by: server config / rcon.\nSee also: sv_loadentfiles.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_init.c:613. Read use-site SV_SpawnServer (src/sv_init.c:605-635): the whole .ent block is gated on `if ((int)sv_loadentfiles.value)` (sv_init.c:605). Within it, sv_init.c:613 `if (sv_loadentfiles_dir.string[0])` enforces the non-empty check (empty string => block skipped => no subdir lookup). sv_init.c:615 `snprintf(ent_path, ..., \"maps/%s/%s.ent\", sv_loadentfiles_dir.string, entityfile)` enforces the path shape maps/<dir>/<map>.ent and 'checked first'. sv_init.c:620-623 enforces the fallback to `maps/%s.ent` only `if (!entitystring)` (subdir attempt failed/absent). sv_init.c:631-632 `if (!entitystring) entitystring = CM_EntityString()` enforces the final fallback to built-in entities. `entityfile` defaults to sv.mapname at sv_init.c:609-610, hence <mapname>. Default empty: registration cvar_t literal `{\"sv_loadentfiles_dir\", \"\"}` at sv_main.c:149 (WI-2). Set-by: plain Cvar_Register at sv_main.c:3563 (no ROM/serverinfo flag) => server config / rcon. F-MV1: KTX reads this cvar (ktx/src/maps.c:155 cvar_string(\"sv_loadentfiles_dir\")) and SETS it to `ctf` in its CTF config (ktx/src/commands.c:4439 \"sv_loadentfiles_dir ctf\"); that is a KTX consumer/setter, not an override of the MVDSV engine enforcement documented here -- flagged for review.",
  "description_proposed": null
}
```
