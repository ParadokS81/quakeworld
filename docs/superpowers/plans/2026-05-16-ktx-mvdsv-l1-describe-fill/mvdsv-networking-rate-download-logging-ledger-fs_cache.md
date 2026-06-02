# describe-fill-synthesis ledger -- mvdsv `fs_cache`

- **project:** mvdsv
- **knob:** `fs_cache` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:fs_cache: synthesized -- toggles the in-memory filename index for file lookups (1=hashed/faster, 0=linear search-path scan); speed-only, not availability -- origin=synthesized ref=src/fs.c:220 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether the server uses an in-memory index of game files to speed up locating files in the game directories.
>
> 1 = build and use a fast filename index, so repeated file lookups skip scanning the search paths one by one. The index is rebuilt automatically whenever the set of game directories changes.
> 0 = no index; every file lookup scans the search paths directly.
>
> This only affects how quickly files are found, not which files are available. Leaving it on is faster on installations with large game directories.
>
> Default: 1.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| non-zero = use hash index for lookups | src/fs.c:220-224 | `if (fs_cache.value) { if (filesystemchanged) FS_RebuildFSHash(); pf = Hash_GetInsensitive(filesystemhash, filename);` | MATCH |
| zero = skip hash, linear search path scan | src/fs.c:232 | `for (search = fs_searchpaths ; search ; search = search->next)` (reached only when hash block skipped/passed) | MATCH |
| index rebuilt automatically when game dirs change | src/fs.c:165,405,484 -> 222 | `filesystemchanged = true;` (on searchpath change) ; `if (filesystemchanged) FS_RebuildFSHash();` | MATCH |
| affects speed, not file availability | src/fs.c:220-247 | hash path and linear path both resolve the same searchpaths; cache is an index over them | MATCH |
| default 1 | src/fs.c:72 | `cvar_t fs_cache = {"fs_cache", "1"}` | MATCH |
| no KTX override | ktx/src (grep) | (no match for fs_cache) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Controls whether server uses an in-memory index of game files to speed up locating files | src/fs.c:220-227 | `if (fs_cache.value) { if (filesystemchanged) FS_RebuildFSHash(); pf = Hash_GetInsensitive(filesystemhash, filename); if (!pf) goto fail; }` | MATCH |
| 2 | 1 = build/use a fast filename index, so repeated lookups skip scanning the search paths one by one | src/fs.c:224 read; vfs_os.c:209-210 + vfs_pak.c:232-236 (cached-pointer short-circuit) | `pf = Hash_GetInsensitive(filesystemhash, filename);` / `if (hashedresult && (void*)hashedresult != handle) return false;` / `if (pf < pak->files || pf > pak->files + pak->numfiles) return false;` | MATCH (see FYI: per-path loop still iterates but each FindFile is a pointer-range check, not a filesystem scan) |
| 3 | Index rebuilt automatically whenever the set of game directories changes | src/fs.c:222-223 (rebuild trigger) + 405 (FS_AddPathHandle: add searchpath) + 484/470->165 (FS_SetGamedir / FS_FlushFSHash) | `if (filesystemchanged) FS_RebuildFSHash();` / `filesystemchanged = true;` (x3 at gamedir-mutation sites) | MATCH |
| 4 | 0 = no index; every file lookup scans the search paths directly | src/fs.c:220 (block skipped, pf stays NULL) -> 232-250 loop; vfs_os.c:224 fopen / vfs_pak.c:239-247 linear strcmp | `f = fopen(netpath, "rb");` / `for (i=0;i<pak->numfiles;i++) if (!strcmp(pak->files[i].name, filename))` | MATCH |
| 5 | Only affects how quickly files are found, not which files are available | vfs_os.c:199 + vfs_pak.c:212-221 (hash built from same sources both paths resolve) | `Sys_EnumerateFiles(handle, "*", FSOS_RebuildFSHash, handle);` / `Hash_AddInsensitive(filesystemhash, pak->files[i].name, &pak->files[i]);` | MATCH |
| 6 | Default: 1 | src/fs.c:72 | `cvar_t fs_cache = {"fs_cache", "1"};` (flags field = CVAR_NONE; string "1" -> value 1 at register) | MATCH |
| 7 | Set by: server config / rcon | src/fs.c:72 (flags=0, no CVAR_ROM) + src/cvar.h:63 | `{"fs_cache", "1"}` — no CVAR_ROM, plain settable cvar | MATCH |
| - | Registration is live (not dead code) | src/sv_main.c:3969 -> fs.c:573 FS_Init -> fs.c:507 FS_InitModule | `FS_Init();` -> `FS_InitModule();` -> `Cvar_Register(&fs_cache);` | MATCH (read site fs.c:220 is in FS_FLocateFile, core file locator) |

**V-pass notes:** TRACED-CLEAN. Oracle confirmed 1.11-53-g18d0362. All three fs_cache use-sites grepped (fs.c:72 registration, fs.c:220 read, fs.c:507 register-call); enforcement all lives in fs.c with callees followed into vfs_os.c and vfs_pak.c.

Every material clause maps to a verified enforcing line:
- The ON/OFF gate is fs.c:220 `if (fs_cache.value)`. ON: hash lookup + early goto-fail on miss. OFF: block skipped, pf=NULL, falls through to per-path linear loop. Verified the FindFile callees (vfs_os FSOS_FLocate, vfs_pak FSPAK_FLocate) to confirm the cached-pointer path and the NULL/linear path resolve to the SAME underlying files (hash built from Sys_EnumerateFiles + all pak entries), so clause 5 ("not which files are available") is strictly true, not inferred.
- "Rebuilt when game directories change" traced to all three filesystemchanged=true sites: FS_AddPathHandle (add searchpath), FS_SetGamedir, FS_FlushFSHash. The rebuild itself fires at fs.c:222-223.
- Default 1 verified against the cvar_t initializer field order (cvar.h:66-75: name, string, flags); flags omitted = CVAR_NONE, so no CVAR_ROM -> plainly settable via config/rcon, confirming "Set by".
- No conditional-compilation guards around either the read site or the registration. Registration is reached live: sv_main.c:3969 FS_Init -> FS_InitModule -> Cvar_Register.

No clause is name/enum/string/comment inference; no MISMATCH; no UNTRACEABLE.

## flags_for_review

- [fyi/other/synthesis] With fs_cache on, a hash miss in FS_FLocateFile does `goto fail` (src/fs.c:225-226) instead of falling through to the linear search. Safe under the rebuild-on-change invariant (filesystemchanged set at src/fs.c:165,405,484), but means any future code path that mutates the on-disk fileset without flagging filesystemchanged would cause an existing file to be reported missing. Not a current bug; noted as a fragility.
- [fyi/other/vpass] Clause 2 says cache-ON makes lookups 'skip scanning the search paths one by one'. Strictly, the per-path loop at fs.c:232-250 STILL iterates with the cache on -- but each FindFile call is now a cheap pointer-range validation (vfs_os.c:209 handle-compare, vfs_pak.c:234 array-bounds check) rather than an fopen/strcmp filesystem scan. The user-facing meaning (the expensive per-path scanning is skipped) is correct; this is still-true minor vagueness acceptable under TRACED-CLEAN, surfaced only so the phrasing is on record.
- [fyi/suspected-bug/vpass] Adjacent dev comment at fs.c:255 on the fail path: 'depth = 0x7fffffff; // NOTE: weird, we return it on fail in some cases, may cause mistakes by user.' This is a pre-existing self-flagged quirk in FS_FLocateFile's return value on the FSLFRT_DEPTH return type -- unrelated to fs_cache polarity/default (it's on the shared fail label reached by both cache-on miss and cache-off miss), but noted as an in-source suspected-bug marker encountered while tracing the OFF-state path.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "fs_cache",
  "type": "cvar",
  "description": "Controls whether the server uses an in-memory index of game files to speed up locating files in the game directories.\n\n1 = build and use a fast filename index, so repeated file lookups skip scanning the search paths one by one. The index is rebuilt automatically whenever the set of game directories changes.\n0 = no index; every file lookup scans the search paths directly.\n\nThis only affects how quickly files are found, not which files are available. Leaving it on is faster on installations with large game directories.\n\nDefault: 1.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/fs.c:220. Sole read use-site is src/fs.c:220 inside FS_FLocateFile (the file-locator): `if (fs_cache.value) { if (filesystemchanged) FS_RebuildFSHash(); pf = Hash_GetInsensitive(filesystemhash, filename); if (!pf) goto fail; }`. Non-zero -> consult the prebuilt hash (rebuilding it first if the FS changed); zero -> skip the hash block entirely and fall to the linear `for (search = fs_searchpaths; ...)` loop at src/fs.c:232. So the clause 'index vs linear scan' is enforced here, and 'affects speed not availability' is correct under normal operation because `filesystemchanged` is set true on every searchpath change (src/fs.c:165, 405, 484) and consumed at src/fs.c:222, keeping the hash in sync. Default `\"1\"` from registration literal src/fs.c:72 `cvar_t fs_cache = {\"fs_cache\", \"1\"}`. Set-by: plain cvar_t, registered src/fs.c:507 -> server config / rcon. F-MV1: grep of ktx/src for fs_cache = NONE (engine filesystem layer), so this documents live MVDSV behavior. NOTE (fyi, not in user doc): when fs_cache is on and the hash misses, the code `goto fail` WITHOUT falling through to the linear search (src/fs.c:225-226) -- benign given the rebuild-on-change invariant, but it means a desynced hash could miss an existing file; internal detail, kept out of the user doc.",
  "description_proposed": null
}
```
