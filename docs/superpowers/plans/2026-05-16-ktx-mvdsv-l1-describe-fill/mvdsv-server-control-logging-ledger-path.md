# describe-fill-synthesis ledger -- mvdsv `path`

- **project:** mvdsv
- **knob:** `path` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:path: synthesized -- prints the ordered file search path (gamedirs + .pak files, base-path separator, shared-pak refcount); admin-only console/rcon, no-arg -- origin=synthesized ref=src/fs.c:104 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Prints the server's current file search path to the console: the ordered list of game directories and .pak files the server searches when it loads a file (such as a map, model, or config). A separator line marks where the base id1/qw paths begin.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| prints the ordered list of search-path entries | src/fs.c:104-110 | `for (search = fs_searchpaths; search; search = search->next) { ... search->funcs->PrintPath(search->handle); }` | MATCH |
| separator marks where base (read-only) paths begin | src/fs.c:106-107 | `if (search == fs_base_searchpaths) Con_Printf ("----------\n");` | MATCH |
| game directory entries print the directory | src/vfs_os.c:167-170 | `static void FSOS_PrintPath(void *handle){ Con_Printf("%s\n", handle); }` | MATCH |
| .pak entries print the pak filename, with reference count when shared | src/vfs_pak.c:183-190 | `if (pak->references != 1) Con_Printf("%s (%i)\n", pak->filename, pak->references-1); else Con_Printf("%s\n", pak->filename);` | MATCH |
| admin-only (console/rcon) | src/fs.c:506 + src/sv_user.c:3299-3360 | `Cmd_AddCommand ("path", FS_Path_f);` and 'path' absent from `ucmds[]` | MATCH |
| no argument | src/fs.c:98 | `static void FS_Path_f (void)` reads no Cmd_Argv | MATCH |
| no KTX override | ktx/src (grep) | no 'path' server-command registration in cmd_t cmds[] | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|---|---|---|---|
| 1 | `path` is a console command that prints output to the console | fs.c:506 / fs.c:98-102 | `Cmd_AddCommand ("path", FS_Path_f);` ... `static void FS_Path_f (void){ ... Con_Printf ("Current search path:\n");` | MATCH |
| 2 | Prints the ordered list of game directories and .pak files | fs.c:104-109; vfs_os.c:167-170; vfs_pak.c:183-191 | `for (search = fs_searchpaths; search ; search = search->next){ ... search->funcs->PrintPath(search->handle); }` -> dir printer `FSOS_PrintPath` (`Con_Printf("%s\n", handle)`) and pak printer `FSPAK_PrintPath` | MATCH |
| 3 | This is the search path the server searches when it loads a file (map/model/config) | fs.c:190, 232, 308 | `for (search = fs_searchpaths ; search ; search = search->next)` inside the FS_FLocateFile family (general file locator) | MATCH (action-level) |
| 4a | A separator line marks where the base paths begin | fs.c:106-107; fs.c:65; fs.c:552 | `if (search == fs_base_searchpaths) Con_Printf ("----------\n");` ; `static searchpath_t *fs_base_searchpaths = NULL; // without gamedirs` ; `fs_base_searchpaths = fs_searchpaths;` (after id1+qw added) | MATCH |
| 4b | base paths are "(read-only)" | none | grep for read.only/readonly across fs.c, vfs_os.c, vfs_pak.c, vfs.h returns nothing relevant; no readonly flag or write-guard distinguishes base vs gamedir searchpaths | UNTRACEABLE (flavour-C inference) |
| 5 | shared .pak files show how many SEARCH ENTRIES reference them | vfs_pak.c:187-188; vfs_pak.c:52-54; vfs_pak.c:161, 357; vfs_pak.c:331 | `if (pak->references != 1) Con_Printf("%s (%i)\n", pak->filename, pak->references-1);` ; field comment: `int references; // ...we need to keep the parent open until all subfiles are closed.` ; increments: `:161 vfsp->parentpak->references++` (per OPEN subfile), `:357 pack->references++` (one per pak load). Each pack_t is Q_calloc'd fresh per load (:331) and held by exactly one searchpath. => printed `references-1` = count of currently-OPEN file handles into the pak, NOT a count of search entries; "shared" is the wrong condition. | MISMATCH (contradiction) |
| 6 | Set by: server console / rcon | fs.c:506; cmd.c:706 | `Cmd_AddCommand ("path", FS_Path_f);` registers in the generic console command table (no CF_ access flag); on a dedicated server this surface is the server console (stdin) + rcon (rcon executes server console commands) | MATCH |

**V-pass notes:** Oracle confirmed 1.11-53-g18d0362. Two flavour-C defects found; the row is C-FIX because clause 5 flatly CONTRADICTS its enforcing line.

CLAUSE 5 (C-FIX, the decisive defect). Description: "shared .pak files also show how many search entries reference them." The enforcing print (vfs_pak.c:187-188) emits `references-1` when `references != 1`. But `references` is a FILE-HANDLE reference count, not a search-entry count -- the struct comment is explicit (vfs_pak.c:52-54): "seeing as all vfiles from a pak file use the parent's vfsfile, we need to keep the parent open until all subfiles are closed." The only two increment sites tree-wide (grep-confirmed) are vfs_pak.c:161 (`+1` each time a subfile/VFS handle is OPENED from the pak) and vfs_pak.c:357 (`+1` once at pak load = the single searchpath entry). Each pack_t is Q_calloc'd fresh per load (vfs_pak.c:331) and added to exactly one searchpath via FS_AddPathHandle->FS_AddDataFiles, so a pak is never "shared" across multiple search entries. Therefore the printed `(N)` = number of currently-OPEN file handles into that pak (= references - the 1 searchpath ref), NOT "how many search entries reference them." Both the meaning ("search entries" vs "open file handles") and the trigger condition ("shared" vs "has open handles") are wrong. This is invisible at output-inspection -- the sentence reads plausibly -- exactly the flavour-C failure mode.

CLAUSE 4b (flavour-C near-miss, subsumed by the C-FIX). "(read-only)" qualifying the base paths has NO enforcing site: grep for read.only/readonly/read_only across fs.c, vfs_os.c, vfs_pak.c, vfs.h is empty. The base/gamedir boundary (fs_base_searchpaths, comment "without gamedirs") is real and the separator placement is correct, but nothing in the code marks base paths read-only or installs a write-guard keyed to that boundary. The qualifier is an inference (likely from the mental model that id1/qw are the immutable base, or a conflation with per-pak copyprotect -- but copyprotect is per-pak and unrelated to the base/gamedir split). Drop or hedge it on re-synth.

CLAUSES 1, 2, 3, 4a, 6 all TRACED-CLEAN. The core behavior (prints the ordered fs_searchpaths chain via per-type PrintPath dispatch, with the `----------` marker at the fs_base_searchpaths node) is accurate, and the general-file-load framing matches the FS_FLocateFile consumers of fs_searchpaths. Access framing (console/rcon) matches a generic Cmd_AddCommand registration on a dedicated server.

Re-synth seed for B4: the known-wrong clause is the .pak "(N)" semantics -- it is the count of currently-open file handles into the pak, anchored at vfs_pak.c:187-188 + struct comment vfs_pak.c:52-54. Also address the unenforced "(read-only)" qualifier on the base paths.

## flags_for_review

- [blocker/contradiction/vpass] The .pak '(N)' value printed by `path` (vfs_pak.c:188, `references-1`) is the count of currently-OPEN VFS file handles into that pak (file-handle refcount per struct comment vfs_pak.c:52-54), NOT a count of search entries referencing the pak. At a quiescent prompt with no files open, all paks satisfy references==1 and print with no `(N)` suffix; the suffix only appears while a subfile is held open. A correct re-synth should describe this as open-handle count (or simply omit it, since for an interactive `path` invocation it is usually absent).
- [review/other/vpass] '(read-only)' qualifying the base paths has no enforcing code: no readonly flag or write-guard keyed to the base/gamedir searchpath boundary exists in fs.c/vfs_os.c/vfs_pak.c/vfs.h. Unenforced descriptive inference.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "path",
  "type": "command",
  "description": "Prints the server's current file search path to the console: the ordered list of game directories and .pak files the server searches when it loads a file (such as a map, model, or config). A separator line marks where the base id1/qw paths begin.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/fs.c:104. Handler FS_Path_f (src/fs.c:98). It walks the fs_searchpaths linked list and for each node calls search->funcs->PrintPath(search->handle) at src/fs.c:104-110, printing a '----------' separator when reaching fs_base_searchpaths (src/fs.c:106-107) -- the boundary between the gamedir/overlay paths and the base read-only paths. Each entry's text comes from the path type's PrintPath vtable callee (trace into callee per B1): OS directory paths print the directory string via FSOS_PrintPath (src/vfs_os.c:167-170); .pak files print the pak filename via FSPAK_PrintPath (src/vfs_pak.c:183-190), and when pak->references != 1 also print the reference count (references-1). 'searches when it loads a file' is the meaning of a search path (the list FS_* uses to resolve reads) -- the command itself only PRINTS that list, it does not change resolution, so the description stays at the observable 'prints the search order' level. No-arg: FS_Path_f(void) reads no Cmd_Argv. Admin-only: registered Cmd_AddCommand (\"path\", FS_Path_f) in FS_InitModule (src/fs.c:506), absent from ucmds[] (src/sv_user.c:3299-3360). F-MV1: grep of ktx/src finds no override of a 'path' server console command (KTX 'path' hits are a bot waypoint subcommand and a Hipnotic spawn field, unrelated).",
  "description_proposed": null
}
```
