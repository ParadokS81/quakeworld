# describe-fill-synthesis ledger -- mvdsv `rmdir`

- **project:** mvdsv
- **knob:** `rmdir` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:rmdir: synthesized -- removes one empty dir relative to CWD, rejects path-escapes; admin + master-rcon only (blocklisted on normal rcon) -- origin=synthesized ref=src/sv_ccmds.c:624 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Deletes an empty directory on the server's filesystem (relative to the server's working directory). The directory must already be empty; non-empty directories are not removed.
>
> rmdir <directory> = remove the named empty directory.
>
> Paths that try to escape the working directory are refused: a name beginning with "../", containing "/../", beginning with "/", or (on Windows) carrying a drive letter is rejected.
>
> Set by: server console + master rcon only.
> See also: ls, rm.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| takes exactly one directory arg | src/sv_ccmds.c:603-607 | `if (Cmd_Argc() != 2) { Con_Printf("rmdir <directory>\n"); return; }` | MATCH |
| removes the directory | src/sv_ccmds.c:624 | `if (!Sys_rmdir(dirname))` | MATCH |
| empty-directory only | src/sv_sys_unix.c:101-104 | `int Sys_rmdir(const char *path){ return rmdir(path); }` (libc rmdir removes only empty dirs) | MATCH |
| rejects path-escape forms | src/sv_ccmds.c:612-621 | `if ( !strncmp(dirname,"../",3) || strstr(dirname,"/../") || *dirname=='/' ... ) { Con_Printf("Unable to remove\n"); return; }` | MATCH |
| backslashes normalized first | src/sv_ccmds.c:610 | `SV_ReplaceChar(dirname, '\\', '/');` | MATCH |
| no gamedir sandbox / relative to CWD | src/sv_ccmds.c:609-624 | dirname from Cmd_Argv(1) passed to Sys_rmdir with no prefix | MATCH |
| no client 'cmd' path (admin-only) | src/sv_user.c (ucmds[]) | grep `{"rmdir"` -> no match in ucmds[] | MATCH |
| normal rcon blocked | src/sv_main.c:1755 | `!strcasecmp(tstr, "rmdir") ||` -> bad_cmd=true | MATCH |
| master-rcon tier unfiltered | src/sv_main.c:1701-1707 | `if (Rcon_Validate(remote_command, master_rcon_password)) { ... do_cmd = true; }` | MATCH |
| no KTX override | ktx/src | grep `"rmdir"` -> 0 matches | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Deletes a directory on the server's filesystem; relative paths resolve against the server working directory | sv_ccmds.c:624 -> sv_sys_unix.c:103 / sv_sys_win.c:154 | `if (!Sys_rmdir(dirname))` ; `return rmdir(path);` / `return _rmdir(path);` | MATCH (handler passes the raw arg to libc rmdir/_rmdir, which resolve a relative path against process CWD; the absolute-path guard at :612 `*dirname == '/'` confines it to the working dir) |
| 2 | Directory must already be empty; non-empty directories are not removed | sv_ccmds.c:597 (comment) + sv_ccmds.c:624 -> libc rmdir/_rmdir callee | `Removes an empty directory` ; `if (!Sys_rmdir(dirname))` | MATCH (no in-code emptiness branch; the empty-only contract is the documented behavior of the rmdir(2)/_rmdir syscall the call chain terminates in; handler comment corroborates intent; failure path prints "Unable to remove directory %s" at :627) |
| 3 | Syntax `rmdir <directory>` = remove the named empty directory (exactly one arg) | sv_ccmds.c:603-606 | `if (Cmd_Argc() != 2) { Con_Printf("rmdir <directory>\n"); return; }` | MATCH (usage string verbatim; argc must be exactly 2) |
| 4a | Name beginning with "../" is rejected | sv_ccmds.c:612 | `!strncmp(dirname, "../", 3)` | MATCH |
| 4b | Name containing "/../" is rejected | sv_ccmds.c:612 | `strstr(dirname, "/../")` | MATCH |
| 4c | Name beginning with "/" is rejected | sv_ccmds.c:612 | `*dirname == '/'` | MATCH |
| 4d | (Windows only) name carrying a drive letter is rejected | sv_ccmds.c:613-617 | `#ifdef _WIN32 ... dirname[1] == ':' && ((*dirname>='a'&&<='z')||(>='A'&&<='Z')) #endif` | MATCH (on rejection prints "Unable to remove" at :620 and returns; description correctly omits the extra bare-".." and trailing-"/.." guards that exist only in the ls handler at :545-547, NOT in rmdir) |
| 5 | Set by: server console + master rcon ONLY (normal/admin rcon cannot run it) | sv_ccmds.c:1842 (registration, no access flag) + cmd.h:85-91 (cmd_function_t has no flags field) + sv_main.c:1701 (master_rcon -> do_cmd) + sv_main.c:1754-1768 (`!strcasecmp(tstr, "rmdir")` -> bad_cmd under admin_cmd path -> do_cmd=false) | `Cmd_AddCommand ("rmdir", SV_RemoveDirectory_f);` ; `if (Rcon_Validate(remote_command, master_rcon_password)) ... do_cmd = true;` ; `!strcasecmp(tstr, "rmdir") ... bad_cmd = true;` | MATCH (MVDSV cmd system has no per-command CF_ flag, so console runs it locally; master-rcon password tier bypasses the blacklist; normal rcon (rcon_password) is explicitly blocked at :1755; no client-usercmd path exists -- SV_RemoveDirectory_f referenced only at def/reg/header) |
| 6 | See also: ls, rm | sv_ccmds.c:522 (sibling block) + sv_ccmds.c:1842-1844 (co-registered) | `//bliP: ls, rm, rmdir, chmod ->` ; `Cmd_AddCommand("rmdir"...); Cmd_AddCommand("rm"...); Cmd_AddCommand("ls"...);` | MATCH (ls=SV_ListFiles_f, rm=SV_RemoveFile_f are the immediate sibling filesystem commands sharing the same path-guard idiom) |

**V-pass notes:** TRACED-CLEAN. Every material clause maps to a located, verified enforcing line.

Handler: SV_RemoveDirectory_f (sv_ccmds.c:599-628). Registered at sv_ccmds.c:1842 via Cmd_AddCommand (no access-flag arg -- MVDSV's cmd_function_t at cmd.h:85-91 has NO flags field, unlike KTX's CF_ system).

Highest-risk clause (access scope, clause 5) verified precisely: the "master rcon only" distinction is genuinely enforced. SVC_RemoteCommand (sv_main.c:1687+) gates network access in two tiers -- master_rcon_password (:1701) sets do_cmd=true unconditionally; normal rcon_password (:1708) sets admin_cmd then runs a command blacklist loop (:1747-1770) where rmdir (:1755) sets bad_cmd=true, forcing do_cmd=!bad_cmd=false. So normal rcon CANNOT run rmdir; only master rcon and the local server console can. The description's "server console + master rcon only" is exactly right and is the kind of access claim the discipline warns is usually inferred from a name -- here it is not inferred, it is enforced at a traceable site.

Path-escape clause (4a-4d) verified line-for-line against sv_ccmds.c:612-618. The description shows good precision: it lists ONLY the four guards the rmdir handler actually has (../ prefix, /../ substring, / prefix, Windows drive letter) and correctly does NOT copy the two EXTRA guards (bare ".." and trailing "/..") that exist only in the adjacent ls handler (SV_ListFiles_f, :545-547). A less careful synth would have over-copied from the visually similar ls block.

Empty-only clause (2): MVDSV has no in-code emptiness check; the guarantee is the standard contract of the libc rmdir(2)/_rmdir callee that Sys_rmdir (sv_sys_unix.c:101-104 / sv_sys_win.c:152-155) passes through to. Followed the call chain into the callee per discipline; the terminal callee is libc, and the handler's own comment (:597 "Removes an empty directory") corroborates. Description does not over-claim a code-level check -- it states the directory "must already be empty", which is the syscall's precondition. Classified MATCH (callee-traced), not UNTRACEABLE.

Cross-check: SV_RemoveDirectory_f appears at exactly three sites (def sv_ccmds.c:599, reg :1842, decl server.h:838) -- no client-side / usercmd dispatch, confirming players cannot invoke it.

## flags_for_review

- [fyi/suspected-bug/vpass] rmdir path-escape guard (sv_ccmds.c:612-618) is a SUBSET of the ls guard (SV_ListFiles_f, sv_ccmds.c:545-547): ls additionally rejects a bare ".." (`!strncmp(dirname, "..", 3)`) and a trailing "/.." (`!strncmp(dirname + i - 3, "/..", 4)`), which rmdir does NOT. Note the ls trailing-check itself looks buggy upstream -- it compares 4 bytes (`/..\0`) starting at `dirname + i - 3` (only 3 bytes + NUL remain), and uses strncmp against "/.." which is 3 chars; the 4th compared byte is the source NUL vs literal NUL, so it happens to work for an exact-suffix match but is fragile. Not in scope for rmdir's description (rmdir lacks this line entirely); flagging only as an upstream observation. For rmdir, the practical consequence is that a name like "foo/.." (no leading ../, no /../ in the middle, not starting with /) would PASS rmdir's guard and be handed to rmdir(2) -- but rmdir(2) on a ".." component fails with EINVAL/ENOTEMPTY, so no escape actually occurs. The description's escape-refusal list is accurate for what rmdir's code checks.
- [fyi/other/vpass] SVC_RemoteCommand command blacklist for normal rcon (sv_main.c:1747-1770) only inspects the FIRST non-empty token (the loop body unconditionally `break`s at :1769 after the first non-empty token). The leading-empty-token skip (:1751-1752) plus the Cmd_ExpandString (:1725) defeat the documented `coop rmdir`/`$coop . *` style expansion exploit. This is correct/defensive, not a bug -- noting only because the single-token-then-break structure is subtle and the comment block (:1740-1745) explicitly warns it would still be semicolon-vulnerable if semicolons were re-enabled. No impact on the rmdir description's accuracy.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "rmdir",
  "type": "command",
  "description": "Deletes an empty directory on the server's filesystem (relative to the server's working directory). The directory must already be empty; non-empty directories are not removed.\n\nrmdir <directory> = remove the named empty directory.\n\nPaths that try to escape the working directory are refused: a name beginning with \"../\", containing \"/../\", beginning with \"/\", or (on Windows) carrying a drive letter is rejected.\n\nSet by: server console + master rcon only.\nSee also: ls, rm.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:624. Handler SV_RemoveDirectory_f registered src/sv_ccmds.c:1842; body src/sv_ccmds.c:599-628. Clauses enforce-traced: (arg form / exactly one arg) Cmd_Argc()!=2 prints usage 'rmdir <directory>' and returns, src/sv_ccmds.c:603-607 -- one directory arg. (removes the directory) Sys_rmdir(dirname) call src/sv_ccmds.c:624; Sys_rmdir is libc rmdir(path) on unix (src/sv_sys_unix.c:101-104) and the Win32 equivalent (src/sv_sys_win.c:152), which removes ONLY empty directories -- hence the 'must be empty' clause. (path-escape rejects) src/sv_ccmds.c:612-618: rejects strncmp(dirname,\"../\",3)==0, strstr(dirname,\"/../\"), *dirname=='/', and on _WIN32 a drive-letter prefix; on match prints 'Unable to remove' and returns. Backslashes are normalized to '/' first via SV_ReplaceChar(dirname,'\\\\','/') at src/sv_ccmds.c:610. (relative to working dir, no gamedir sandbox) dirname is passed straight to Sys_rmdir with no path prefix prepended (src/sv_ccmds.c:609-624) -- so it is resolved against the process CWD, not sandboxed to the gamedir; description says 'server's working directory' and does not claim a gamedir sandbox. ACCESS-CLASS: not present in ucmds[] (grep of sv_user.c for {\"rmdir\" empty) so no client 'cmd' path; Cmd_AddCommand-only = admin/console. BLOCKLIST: 'rmdir' is in the normal-rcon blocklist token list at src/sv_main.c:1755 (strcasecmp(tstr,\"rmdir\")) -> bad_cmd=true -> do_cmd=false (src/sv_main.c:1767-1774); only the local console and the master_rcon_password tier (validated unfiltered at src/sv_main.c:1701-1707) reach it -> Set-by 'server console + master rcon only'. F-MV1: grep of ktx/src for \"rmdir\" returned no matches -- no KTX override. Default omitted (no meaningful no-arg default; no-arg path just prints usage).",
  "description_proposed": null
}
```
