# describe-fill-synthesis ledger -- mvdsv `exec`

- **project:** mvdsv
- **knob:** `exec` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:exec: synthesized -- admin-only console/rcon command that executes a script file (resolved within the gamedir/pack search paths), inserting its commands at the front of the command buffer -- origin=synthesized ref=src/cmd.c:353 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Runs the commands contained in a script file as if they had been typed at the console. The file is located within the server's configured file folders (gamedir and loaded packs), not by arbitrary disk path. Its commands are inserted at the front of the command queue, so they run before any commands already waiting.
>
> exec <filename> = read <filename> and execute every command line in it.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| runs the file's commands | src/cmd.c:353 | `Cbuf_InsertText (f);` | MATCH |
| inserted at front of queue (runs before pending) | src/cmd.c:353 | `Cbuf_InsertText` (prepend variant, not Cbuf_AddText) | MATCH |
| file located via FS search paths (gamedir/packs), not raw OS path | src/cmd.c:344 -> src/fs.c:924 | `f = (char *)FS_LoadHunkFile (Cmd_Argv(1), NULL);` -> `FS_FLocateFile(path, FSLFRT_LENGTH, &loc);` | MATCH |
| missing file -> couldn't exec | src/cmd.c:345-348 | `if (!f) { Con_Printf ("couldn't exec %s\n",Cmd_Argv(1)); return; }` | MATCH |
| requires one arg (filename) | src/cmd.c:336-339 | `if (Cmd_Argc () != 2) { Con_Printf ("exec <filename> : execute a script file\n"); return; }` | MATCH |
| admin-only (not in ucmds[]) | src/sv_user.c:3408-3424 | client stringcmd loop over `ucmds`, else `"Bad user command"` | MATCH |
| no KTX override | ktx/src (grep) | no `Cmd_AddCommand("exec"...)` in KTX | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| C1 | "Runs the commands contained in a script file as if they had been typed at the console" | src/cmd.c:353 (handler) + cmd.c:55,154+ | `Cbuf_InsertText (f);` (feeds raw file text into cbuf_main); `Cbuf_InsertText -> Cbuf_InsertTextEx(&cbuf_main, text)`; `Cbuf_ExecuteEx` parses each line as a console command | MATCH |
| C2a | File located within server's configured file folders (gamedir + loaded packs) | src/fs.c:924 + fs.c:232-250 | `FS_FLocateFile(path, FSLFRT_LENGTH, &loc);` then `for (search = fs_searchpaths ; search ; search = search->next) { if (search->funcs->FindFile(...)) ...}` (header: "Look for it in the filesystem or pack files"; "Filename are relative to the quake directory") | MATCH |
| C2b | "not by arbitrary disk path" | src/fs.c:142-147 | `if (*pattern == '/' || strstr(pattern,"../") || strstr(pattern,"..\\") || strstr(pattern,":")) Con_Printf("Error: absolute path...") else return pattern;` (NULL on absolute/traversal -> load fails) | MATCH |
| C3 | "commands are inserted at the front of the command queue, so they run before any commands already waiting" | src/cmd.c:116-128 | `Cbuf_InsertTextEx`: header "Adds command text immediately after the current command"; `memcpy(text_buf + (text_start - len - 1), text, len); text_buf[text_start-1]='\n'; text_start -= len + 1;` (writes BEFORE text_start, moves front backward) | MATCH |
| C4 | usage: `exec <filename>` = read file and execute every command line | src/cmd.c:336-344 | `if (Cmd_Argc() != 2) { Con_Printf("exec <filename> : execute a script file\n"); return; } ... f = FS_LoadHunkFile(Cmd_Argv(1), NULL);` | MATCH |
| C5a | "Set by: server console / rcon" -- console/cfg path | src/cmd.c:240 + cmd.c:916-942 | `Cmd_ExecuteString (line);` (from Cbuf_ExecuteEx) -> walks global cmd_hash_array -> `cmd->function()` reaches Cmd_Exec_f | MATCH |
| C5b | rcon path | src/sv_main.c:1828 | `Cmd_ExecuteString(str);` inside SVC rcon handler ("Rcon from %s") | MATCH |
| C5c | NOT player-accessible (implicit scope correctness of "console/rcon" only) | src/sv_user.c:3299-3385, 3408-3424 | `ucmds[]` table does NOT contain "exec"; `SV_ExecuteUserCommand` iterates only ucmds[] + SV_ExecutePRCommand, never Cmd_ExecuteString/global table; falls to `Con_Printf("Bad user command: %s")` | MATCH |
| C5d | no CF_ flag / single registration | src/cmd.h:83-91 + cmd.c:706-740, 1068 | cmd_function_t has only {name, function} -- no flags field; no Cmd_AddCommandEx exists anywhere; single `Cmd_AddCommand("exec",Cmd_Exec_f);` | MATCH |

**V-pass notes:** VERDICT: TRACED-CLEAN. Oracle confirmed at 1.11-53-g18d0362. All 5 description clauses enforcement-traced to located, verified lines (incl. adjacent comments); no clause inferred from name/string only.

Handler is src/cmd.c:331 Cmd_Exec_f, registered once at cmd.c:1068 via plain Cmd_AddCommand (no Ex-variant, no CF_ flags -- MVDSV cmd_function_t carries no flags field at all).

C1: file text fed verbatim into cbuf_main (same buffer console input uses) via Cbuf_InsertText, then parsed line-by-line by Cbuf_ExecuteEx -- "as if typed at console" is exact.

C2: traced full chain FS_LoadHunkFile -> FS_LoadFile -> FS_FLocateFile (iterates fs_searchpaths + each searchpath's FindFile, covering OS dirs AND pack files) -> FS_GetCleanPath, which hard-rejects absolute paths ('/'), '..' traversal, and ':' (drive letters). "configured file folders (gamedir and loaded packs), not by arbitrary disk path" is precisely enforced, not inferred.

C3: Cbuf_InsertTextEx writes the block BEFORE text_start and decrements text_start (cmd.c:124-128) -> inserted text becomes the new front, executed ahead of still-pending buffer text. Source header comment phrases it "immediately after the current command"; reconcilable with the description's "before any commands already waiting" because the exec line itself is the current (already-consumed) command. Standard Quake exec semantics; description accurate. Logged as FYI only.

C4: usage string and Cmd_Argc()!=2 guard are verbatim in the handler.

C5: WI-2 access-class discipline applied -- did NOT infer from name. Verified the two reaching dispatch paths are console/cfg (Cbuf_Execute->Cmd_ExecuteString) and rcon (sv_main.c:1828). Critically verified the client stringcmd path (SV_ExecuteUserCommand) uses a SEPARATE ucmds[] table that does NOT contain "exec" and never falls through to the global command table -> connected players cannot run exec. "Set by: server console / rcon" is correct AND its omission of player access is correct.

PROC-1: no residual judgment calls; every clause reduces to a checkable fact confirmed at its enforcing line.

## flags_for_review

- [fyi/other/vpass] C3 wording 'before any commands already waiting' vs the source header comment on Cbuf_InsertTextEx (cmd.c:112) 'Adds command text immediately after the current command'. Both are correct and reconcilable: the executing 'exec' line is consumed before its file contents are inserted, so the inserted block lands ahead of all still-pending buffer text. No defect -- recording only because the two phrasings could superficially look contradictory to a future reader.
- [fyi/other/vpass] MVDSV server commands have NO per-command access-flag mechanism: cmd_function_t (src/cmd.h:90-91) is only {name, function}; there is no CF_* flag and no Cmd_AddCommandEx anywhere in the tree. Access class for any global server command is therefore determined entirely by which dispatch paths reach Cmd_ExecuteString (console/cfg + rcon) vs the separate client ucmds[] table. Relevant context for verifying access-class clauses on OTHER MVDSV command rows -- they cannot be inferred from a flag because no flag exists; the ucmds[] membership check is the determinant of player-accessibility.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "exec",
  "type": "command",
  "description": "Runs the commands contained in a script file as if they had been typed at the console. The file is located within the server's configured file folders (gamedir and loaded packs), not by arbitrary disk path. Its commands are inserted at the front of the command queue, so they run before any commands already waiting.\n\nexec <filename> = read <filename> and execute every command line in it.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cmd.c:353. Handler Cmd_Exec_f registered at src/cmd.c:1068 (Cmd_AddCommand) -> body src/cmd.c:331-355. WHAT (runs the file's commands): file contents inserted into the command buffer at src/cmd.c:353 (Cbuf_InsertText(f)) -- the authoritative read use-site for the behavior. 'Inserts at the FRONT of the queue (runs before pending)': Cbuf_InsertText (not Cbuf_AddText) is the prepend variant; src/cmd.c:353 vs the AddText API -- INSERT places the script ahead of already-buffered commands. File resolution 'within the server's file folders, not arbitrary OS path': src/cmd.c:344 FS_LoadHunkFile(Cmd_Argv(1), NULL) -> src/fs.c:975-978 -> FS_LoadFile (src/fs.c:915) -> FS_FLocateFile(path,...) at src/fs.c:924, which searches the VFS searchpaths + pack files (gamedir-relative), returning NULL (-> 'couldn't exec' src/cmd.c:347) if not found. Requires exactly one arg: src/cmd.c:336-339 (Cmd_Argc()!=2 -> 'exec <filename> : execute a script file'). Admin-only access class: 'exec' is not in ucmds[] (grep src/sv_user.c:3299-3400 returned only download/upload), and SV_ExecuteUserCommand (src/sv_user.c:3408-3424) does not fall through from client stringcmds to console commands, so Cmd_AddCommand-only = console/rcon-only. F-MV1: ktx/src has no 'exec' command override (grep found no KTX cmd registration for 'exec'). Default omitted (no-arg prints usage). Engine internals (Hunk mark/free, Cbuf API name) kept out of description per D20.",
  "description_proposed": null
}
```
