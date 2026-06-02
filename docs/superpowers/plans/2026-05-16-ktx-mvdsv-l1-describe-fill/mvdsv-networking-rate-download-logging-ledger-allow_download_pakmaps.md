# describe-fill-synthesis ledger -- mvdsv `allow_download_pakmaps`

- **project:** mvdsv
- **knob:** `allow_download_pakmaps` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:allow_download_pakmaps: synthesized -- additive maps gate at sv_user.c:1556, 0 denies downloading copy-protected-pak maps even when allow_download_maps=1, skipped for techlogin, copy-protect tested via VFS_COPYPROTECTED (fs.c:792), default 1 -- origin=synthesized ref=src/sv_user.c:1556 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Adds an extra restriction on map downloads: when off, the server refuses to send a map file that it opened from a copy-protected pak, even if ordinary map downloading is otherwise allowed.
>
> 1 = allow such maps to be downloaded along with other maps.
> 0 = block downloading any map that came from a copy-protected pak (the request is denied even when general map downloading is enabled).
>
> Default: 1.
> Set by: server config / rcon.
> See also: this extra check is skipped for techlogin clients; it does not affect maps the server has as loose files.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| extra check, separate from the per-type chain, after file open | src/sv_user.c:1556 | `if (sv_client->download && !strncmp(name, "maps/", 5) && VFS_COPYPROTECTED(sv_client->download) && !(int)allow_download_pakmaps.value) {` | MATCH |
| 0 triggers deny (polarity) | src/sv_user.c:1558 | `goto deny_download;` (inside the `!(int)...value` branch) | MATCH |
| applies only to maps/ requests | src/sv_user.c:1556 | `!strncmp(name, "maps/", 5)` | MATCH |
| only when the source pak is copy-protected | src/fs.c:792 | `return vf->copyprotected;` (VFS_COPYPROTECTED) | MATCH |
| skipped for techlogin clients | src/sv_user.c:1554 | `if (!sv_client->special) {` | MATCH |
| general maps gate is a different cvar | src/sv_user.c:1474 | `allow_dl = allow_download_maps.value; // maps` | MATCH |
| default 1 (registered) | src/sv_main.c:111 | `cvar_t allow_download_pakmaps = {"allow_download_pakmaps", "1"};` | MATCH |
| no KTX override | ktx/src (grep) | `grep -rn allow_download src/` -> empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | "Adds an extra restriction on map downloads" (a check on top of the normal map gate) | sv_user.c:1553-1556 (runs only after the general gate at :1480) | `// if not techlogin, perform extra check to block .pak maps` ... `if (sv_client->download && !strncmp(name, "maps/", 5) && VFS_COPYPROTECTED(...) && !(int)allow_download_pakmaps.value)` | MATCH |
| 2 | "even if ordinary map downloading is otherwise allowed" (extra gate after general + per-category map perm) | sv_user.c:1459, 1473-1474, 1480 | `else if (!(int)allow_download.value) allow_dl = false;` / `allow_dl = allow_download_maps.value;` / `if (!allow_dl) goto deny_download;` (all precede :1556) | MATCH |
| 3 | "1 = allow such maps to be downloaded" (polarity: non-zero permits) | sv_user.c:1556 | `&& !(int)allow_download_pakmaps.value` -- value!=0 makes the deny-condition false | MATCH |
| 4 | "0 = block downloading any map that came from a copy-protected pak" (polarity: zero denies) | sv_user.c:1556-1559 | `... && !(int)allow_download_pakmaps.value) { SV_ClientDownloadComplete(sv_client); goto deny_download; }` | MATCH |
| 5 | "copy-protected pak" (the gated source IS a pak) | fs.c:789-792; fs.c:332,371 (copyprotect=true for pak paths); vfs.h:68 | `return vf->copyprotected;` / `FS_AddPathHandle(pakfile, funcs, pak, true, ...)` / `qbool copyprotected; // File found was in a pak` | MATCH |
| 6 | OFF-state phrasing "the request is denied even when general map downloading is enabled" | sv_user.c:1557-1558 | `SV_ClientDownloadComplete(sv_client); goto deny_download;` (reached only after general/map gates passed) | MATCH |
| 7 | "Default: 1" | sv_main.c:111 + sv_main.c:3540 | `cvar_t allow_download_pakmaps = {"allow_download_pakmaps", "1"};` + plain `Cvar_Register (&allow_download_pakmaps);` (2-field init => flags 0, no CVAR_ROM) | MATCH |
| 8 | "Set by: server config / rcon" | sv_main.c:111, 3540 | plain settable cvar, no CVAR_* flags => normal config/rcon settability | MATCH |
| 9 | "this extra check is skipped for techlogin clients" | sv_user.c:1554; sv_user.c:2221 (Cmd_TechLogin_f) | `if (!sv_client->special) {` wraps the :1556 check; `sv_client->special = true;` set only by techlogin | MATCH |
| 10 | "it does not affect maps the server has as loose files" (loose-file maps unaffected) | fs.c:444 (gamedir copyprotect=false); fs.c:789-792 | `FS_AddPathHandle (va("%s/", dir), &osfilefuncs, ..., false, false, loadstuff);` => loose dir copyprotected=false => VFS_COPYPROTECTED false => :1556 bypassed | MATCH (for loose-ONLY maps) |
| 11 | "map files that it only has inside a copy-protected pak" (the word "only" -- scope qualifier) | sv_user.c:1556 (VFS_COPYPROTECTED of the OPENED handle) + fs.c:418 + fs.c:232-246 | gate keys on which searchpath RESOLVED the open, not on exclusive availability; paks are head-inserted AHEAD of the loose gamedir (`adds the directory to the head ... then loads and adds pak0.pak`), and FS_FLocateFile returns the FIRST match | MISMATCH (narrower/different than implied) |

**V-pass notes:** CLASSIFICATION: C-NEAR-MISS. Oracle confirmed at 1.11-53-g18d0362. Core behavior (polarity, default, OFF-state, techlogin-skip, loose-vs-pak, "extra gate on top of general map perm") is all enforcement-traced and correct. Single near-miss clause: clause 11's word "ONLY" ("map files that it only has inside a copy-protected pak").

The enforcing line sv_user.c:1556 gates on `VFS_COPYPROTECTED(sv_client->download)` -- a property of the searchpath that RESOLVED the just-opened handle (FS_OpenVFS at :1545), NOT a property of whether the map is exclusively in a pak. fs.c:418 documents that FS_AddGameDirectory "adds the directory to the head of the path, then loads and adds pak0.pak pak1.pak..." -- each subsequent searchpath is head-inserted (fs.c:401), so the final head->tail order is pakN..pak1,pak0,loose-gamedir, i.e. PAKS ARE SEARCHED FIRST. FS_FLocateFile (fs.c:232-246) returns the FIRST searchpath that contains the file and stamps loc->search to it. Consequence: a map present in BOTH a pak AND as a loose .bsp resolves to the PAK copy (copyprotected=true) and IS gated when the cvar is 0 -- which contradicts the "only has inside a pak" implication (a reader would expect a dual-available map to be servable as the loose copy). The description is correct for the dominant case (map exists pak-ONLY), and clause 10's inverse ("loose files unaffected") is correct for maps that exist loose-ONLY; the divergence is exactly the same-map-in-both case.

This is a name/intuition-derived scope qualifier whose real enforcement is narrower/different (keys on resolution order, not availability) -- textbook flavour-C near-miss per the discipline ("the real code is narrower / more conditional than implied"). Not C-FIX: no clause is flatly wrong in the common case, and the gate's deny-direction/default/skip are all exact.

SUGGESTED FIX (if re-synthed): replace "map files that it only has inside a copy-protected pak" with "map files that the server resolves from a copy-protected pak (its loose-file copies in the gamedir, if any, are not the ones served -- pak searchpaths are searched first)", or more simply drop "only" and say "served from a copy-protected pak." The :1473 source comment ("maps, note usage of allow_download_pakmaps a bit below") and the :1553 comment ("perform extra check to block .pak maps") both frame it as "from a pak," not "only in a pak."

Minor wording-only nit (FYI, not part of the classification): "block downloading ANY map that came from a copy-protected pak" is accurate, but the gate ALSO requires the path prefix to be exactly `maps/` (:1556 `!strncmp(name, "maps/", 5)`) -- a .bsp requested under any other path would have taken the allow_download_other branch upstream, so this is not a practical gap, just noting the prefix condition is part of the enforcing line.

## flags_for_review

- [review/contradiction/vpass] Clause 11 'only has inside a copy-protected pak': the enforcing check (sv_user.c:1556 VFS_COPYPROTECTED of the opened handle) keys on which searchpath RESOLVED the open, not on exclusive availability. Per fs.c:418 + fs.c:232-246, paks are searched ahead of the loose gamedir, so a map present in BOTH a pak and as a loose file resolves to the pak copy and IS still gated -- the word 'only' mispredicts that dual-availability case. Description is correct for the pak-only and loose-only cases; near-miss on same-map-in-both.
- [fyi/other/vpass] FYI completeness: the deny condition also requires the request path to begin with exactly 'maps/' (sv_user.c:1556 strncmp name,'maps/',5). Not a defect in the description (a .bsp under any other prefix is handled by the allow_download_other branch upstream), just noting the full enforcing predicate for the per-clause record.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "allow_download_pakmaps",
  "type": "cvar",
  "description": "Adds an extra restriction on map downloads: when off, the server refuses to send a map file that it opened from a copy-protected pak, even if ordinary map downloading is otherwise allowed.\n\n1 = allow such maps to be downloaded along with other maps.\n0 = block downloading any map that came from a copy-protected pak (the request is denied even when general map downloading is enabled).\n\nDefault: 1.\nSet by: server config / rcon.\nSee also: this extra check is skipped for techlogin clients; it does not affect maps the server has as loose files.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1556. Read use-site sv_user.c:1556 `if (sv_client->download && !strncmp(name, \"maps/\", 5) && VFS_COPYPROTECTED(sv_client->download) && !(int)allow_download_pakmaps.value) { ... goto deny_download; }`. This is NOT in the main per-type else-if chain -- it is a SEPARATE second gate applied AFTER the file is opened (sv_client->download set at sv_user.c:1545). The general maps gate is allow_download_maps (sv_user.c:1474, out of this set); pakmaps is additive: with allow_download_maps=1 a copy-protected-pak map still passes the first chain, then this check denies it when the cvar is 0. Polarity: `!(int)allow_download_pakmaps.value` -> 0 triggers the deny, nonzero leaves the map downloadable; default 1 from registered cvar_t literal sv_main.c:111 `{\"allow_download_pakmaps\", \"1\"}` (WI-2); registered sv_main.c:3540 (locator only). Scope clauses verified: gate only runs when `!sv_client->special` (sv_user.c:1554, techlogin skipped); only when the opened file's pak is copy-protected -- VFS_COPYPROTECTED returns vf->copyprotected (fs.c:792), so a loose-file map (not copy-protected) is unaffected. Set-by: plain cvar, no command handler -> server config / rcon. F-MV1: no KTX override (ktx/src allow_download grep empty).",
  "description_proposed": null
}
```
