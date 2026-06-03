# describe-fill-synthesis ledger -- mvdsv `rm`

- **project:** mvdsv
- **knob:** `rm` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:rm: synthesized -- deletes server file(s) by exact name, '*token' substring, or '*' all; dirs skipped; path-escape refused; server console + master rcon only -- origin=synthesized ref=src/sv_ccmds.c:693 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Deletes one or more files from a directory on the server, relative to the directory the server was launched from (its working directory). A second argument names what to delete: an exact filename, '*<text>' to delete every file whose name contains <text>, or '*' on its own to delete all files in the directory. Directory paths beginning with '../' or containing '/../', an absolute path, a '/' inside the filename, or a Windows drive letter are refused. It removes files only, not subdirectories.
>
> rm <directory> <filename>   = delete one named file.
> rm <directory> *<token>     = delete every file whose name contains <token>.
> rm <directory> *            = delete all files in <directory>.
>
> Example: rm demos *2024  ->  deletes every file under the demos directory whose name contains "2024".
>
> Set by: server console + master rcon only.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| two required args; usage form | src/sv_ccmds.c:642-649 | `if (Cmd_Argc() < 3){ Con_Printf("rm <directory> {<filename> | *<token> | *} ...\n"); return; } dirname=Cmd_Argv(1); filename=Cmd_Argv(2);` | MATCH |
| '*<token>' deletes all files whose name contains token | src/sv_ccmds.c:667-690 | `if (*filename=='*'){ filename++; ... if (!list->isdir && strstr(list->name, filename)) ... Sys_remove(...) }` | MATCH |
| bare '*' deletes all files (empty token matches all) | src/sv_ccmds.c:673,680 | `filename++;` (then `strstr(name,"")` true for all) ... `!list->isdir` | MATCH |
| single named file branch | src/sv_ccmds.c:692-697 | `else { if (!Sys_remove(va("%s/%s",dirname,filename))) Con_Printf("File %s successfully removed\n",...) }` | MATCH |
| files only, not directories | src/sv_ccmds.c:680,694 | `!list->isdir` guard; single branch uses `Sys_remove` (not Sys_rmdir) | MATCH |
| path-escape ('..', leading '/', '/' in filename, drive) refused | src/sv_ccmds.c:653-663 | `!strncmp(dirname,"../",3) || strstr(dirname,"/../") || *dirname=='/' || strchr(filename,'/') || ...` -> `Con_Printf("Unable to remove\n")` | MATCH |
| relative to server working dir | src/sv_ccmds.c:694 | `Sys_remove(va("%s/%s", dirname, filename))` (leading '/' rejected) | MATCH |
| admin-only (not in client ucmds[]) | src/sv_user.c:3299-3375 | `static ucmd_t ucmds[] = {...}` -- no `rm` entry | MATCH |
| normal rcon BLOCKED; only console + master rcon | src/sv_main.c:1759,1771; src/sv_main.c:1701 | `!strcasecmp(tstr,"rm")` -> `bad_cmd = true`; `do_cmd = !bad_cmd`; master tier unfiltered `do_cmd=true` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | "Deletes one or more files from a directory on the server" | sv_ccmds.c:679, 693 | `if (!Sys_remove(va("%s/%s", dirname, list->name)))` / `if (!Sys_remove(va("%s/%s", dirname, filename)))` | MATCH |
| 2 | "relative to the directory the server was launched from (its working directory)" | fs.c:534 (`fs_basedir`="."), sv_ccmds.c:679/693 (no prefix) | `strlcpy (fs_basedir, ".", sizeof(fs_basedir));` ; path built as bare `dirname/filename`, no fs_gamedir/fs_basedir prepend | MISMATCH (partial) -- path resolves against process CWD (fs_basedir=".") not fs_gamedir; fs_gamedir is a SUBDIR (`./<gamedir>`, fs.c:491). "working directory" is right; "/game directory" conflates two different dirs |
| 3 | "A second argument names what to delete" (argv2) | sv_ccmds.c:640, 647 | `if (Cmd_Argc() < 3)` ; `filename = Cmd_Argv(2);` | MATCH |
| 4 | "an exact filename" -> delete one named file | sv_ccmds.c:691-694 | `else // 1 file` ... `if (!Sys_remove(va("%s/%s", dirname, filename)))` | MATCH |
| 5 | "'*<text>' to delete every file whose name contains <text>" | sv_ccmds.c:665,671,677 | `if (*filename == '*')` ; `filename++;` ; `if (!list->isdir && strstr(list->name, filename))` | MATCH (strstr = substring-contains) |
| 6 | "'*' on its own to delete all files in the directory" | sv_ccmds.c:671,677 | `filename++;` (token becomes "") ; `strstr(list->name, "")` matches every name | MATCH |
| 7 | escape refusal: "containing '..'" | sv_ccmds.c:651-653 | `!strncmp(dirname, "../", 3) \|\| strstr(dirname, "/../") ... \|\| !strncmp(filename + i - 3, "/..", 4)` | MISMATCH -- code refuses only dirname-prefix `../`, mid-path `/../`, and filename-suffix `/..`. A bare `..` dirname (`rm .. x` -> `unlink("../x")`) or `/..`-suffixed dirname (`rm a/.. x` -> `a/../x`) PASSES and escapes one level. "containing '..'" is contradicted by concrete accepted input |
| 8 | escape refusal: "a leading slash" | sv_ccmds.c:652 | `*dirname == '/'` | MATCH |
| 9 | escape refusal: "a slash inside the filename" | sv_ccmds.c:652 (+ 649 backslash-norm) | `strchr(filename, '/')` ; preceded by `SV_ReplaceChar(filename, '\\', '/')` | MATCH |
| 10 | escape refusal: "a Windows drive letter" | sv_ccmds.c:654-658 | `#ifdef _WIN32 ... ( dirname[1] == ':' && ((*dirname >= 'a' ...)))` | MATCH (Windows-only, dirname-only -- acceptable simplification) |
| 11 | "It removes files only, not subdirectories" | sv_ccmds.c:677 (token) + sv_sys_unix.c:92 / sv_sys_win.c:143 (single) | `if (!list->isdir && ...)` ; single-file relies on `unlink(path)`/`remove(path)` failing on a dir (returns nonzero -> "Unable to remove file") | MATCH |
| 12 | usage line `rm <directory> <filename>` = one file | sv_ccmds.c:642, 691-694 | usage string + single-file branch | MATCH |
| 13 | usage line `rm <directory> *<token>` = contains token | sv_ccmds.c:665-689 | token branch `strstr(list->name, filename)` | MATCH |
| 14 | usage line `rm <directory> *` = all files | sv_ccmds.c:665-689 | token branch, empty token | MATCH |
| 15 | example `rm demos *2024` -> files containing "2024" | sv_ccmds.c:671,677 | `filename++` (->"2024"), `strstr(list->name,"2024")` | MATCH (substring, not prefix/suffix) |
| 16 | "Set by: server console" (registration / access) | sv_ccmds.c:1843 ; absent from ucmds[] sv_user.c:3299-3384 | `Cmd_AddCommand ("rm", SV_RemoveFile_f);` -- plain console cmd, NOT in client ucmds table | MATCH |
| 17 | "+ master rcon only" (normal rcon blocked) | sv_main.c:1701-1707 (master OK) ; 1754 + 1767 + 1774 (normal blocked) | master path: `Rcon_Validate(...,master_rcon_password)` -> `do_cmd=true`; normal path: `if (!strcasecmp(tstr, "rm") ...) bad_cmd = true;` then `do_cmd = !bad_cmd;` | MATCH (master_rcon_password set via server.cfg, sv_ccmds.c:1804-1806; macro-expansion bypass hardened via Cmd_ExpandString at 1725) |

**V-pass notes:** Row classified C-FIX on clause 7 (the "containing '..'" escape claim). The description asserts "Paths that try to escape the server directory (containing '..' ...) are refused" -- a universal claim contradicted by concrete accepted inputs against the enforcing lines sv_ccmds.c:651-653. The rm handler ONLY refuses: dirname starting with `../` (`!strncmp(dirname,"../",3)`), dirname containing `/../` (`strstr(dirname,"/../")`), and filename ending `/..` (the last is dead -- `strchr(filename,'/')` at 652 already rejects any slash in filename). It does NOT refuse a bare `..` dirname: `rm .. demo.txt` passes every check and runs `Sys_remove("../demo.txt")`, escaping one level up; likewise `rm a/.. x` -> `a/../x`. Verified by hand-walking each condition for dirname=="..". This is a real source weakness, not just doc imprecision: the sibling `ls` handler (sv_ccmds.c:545-547) carries the extra dirname guards `!strncmp(dirname,"..",3)` AND the dirname `/..`-suffix check that `rm` lacks, and `rmdir` (612) also lacks the suffix guard. So rm/rmdir validation is strictly weaker than ls. The token branch `rm .. *` would enumerate and delete files in the parent dir.

Second issue, clause 2 (graded as part of the same fix): "relative to the directory the server was launched from (its working directory)" -- the path is built as bare `dirname/filename` with NO prefix (sv_ccmds.c:679/693) and resolves against the process CWD. fs_basedir defaults to "." (fs.c:534) and fs_gamedir = fs_basedir/<gamedir> = "./<gamedir>" (fs.c:491), a SUBDIRECTORY of CWD. There is no `chdir(fs_gamedir)` on the normal startup path (the only chdir-to-gamedir is sv_sys_unix.c:546, inside a fork/exec restart path). So "working directory" is accurate but "game directory" is not -- `rm demos x` targets `<cwd>/demos/x`, not `<gamedir>/demos/x`. To reach demos under the gamedir an admin must type `rm qw/demos x`. Recommend dropping "/game" and saying "relative to the server's working directory (the directory the binary was launched from)".

All other 15 clauses TRACED-CLEAN, including the substring (not prefix/suffix) semantics of the token match, the files-only behavior (explicit isdir guard in token branch + unlink/remove failing on dirs in single branch), and the access class (plain Cmd_AddCommand = server console, absent from client ucmds[]; master rcon allowed, normal rcon explicitly blocked with macro-expansion hardening). No mod/PR2-layer override of rm exists (single registration at sv_ccmds.c:1843).

## flags_for_review

- [review/suspected-bug/vpass] MVDSV `rm` (and `rmdir`) path validation is strictly weaker than the sibling `ls` command. SV_RemoveFile_f (sv_ccmds.c:651-659) lacks two dirname guards that SV_ListFiles_f has (sv_ccmds.c:545-547): the bare `!strncmp(dirname,"..",3)` check and the dirname `/..`-suffix check `!strncmp(dirname+i-3,"/..",4)`. Consequence: `rm .. <file>` resolves to Sys_remove("../<file>") and `rm a/.. <file>` to `a/../<file>`, both escaping the intended directory one level up; `rm .. *` enumerates+deletes files in the parent directory. Restricted to server-console + master-rcon (normal rcon is blocked at sv_main.c:1754), so not a remote-unauth issue, but it is a real path-traversal gap relative to the validation's evident intent, and the rm filename `/..`-suffix check at sv_ccmds.c:653 is dead code (the strchr-for-slash at :652 fires first on any filename containing '/').

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "rm",
  "type": "command",
  "description": "Deletes one or more files from a directory on the server, relative to the directory the server was launched from (its working directory). A second argument names what to delete: an exact filename, '*<text>' to delete every file whose name contains <text>, or '*' on its own to delete all files in the directory. Directory paths beginning with '../' or containing '/../', an absolute path, a '/' inside the filename, or a Windows drive letter are refused. It removes files only, not subdirectories.\n\nrm <directory> <filename>   = delete one named file.\nrm <directory> *<token>     = delete every file whose name contains <token>.\nrm <directory> *            = delete all files in <directory>.\n\nExample: rm demos *2024  ->  deletes every file under the demos directory whose name contains \"2024\".\n\nSet by: server console + master rcon only.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:693. Handler SV_RemoveFile_f (src/sv_ccmds.c:634), registered src/sv_ccmds.c:1843. Clause traces: (1) usage / two required args -- `if (Cmd_Argc()<3){ Con_Printf(\"rm <directory> {<filename> | *<token> | *} - removes a file | with token | all\\n\"); return; }` sv_ccmds.c:642-646; `dirname=Cmd_Argv(1); filename=Cmd_Argv(2)` sv_ccmds.c:648-649. (2) wildcard '*<token>' = substring match over directory listing -- `if (*filename=='*'){ filename++; dir=Sys_listdir(...); for(...) if(!list->isdir && strstr(list->name, filename)) Sys_remove(...); }` sv_ccmds.c:667-690 (bare '*' makes filename++ empty so strstr matches every name = all files; isdir excluded -> files only). (3) single-file branch -- `else { if(!Sys_remove(va(\"%s/%s\",dirname,filename))) Con_Printf(\"File %s successfully removed\\n\",...) }` sv_ccmds.c:692-697. (4) files-only / dirs skipped -- `!list->isdir` guard sv_ccmds.c:680; the single-file branch calls Sys_remove (file delete), not Sys_rmdir. (5) path-escape refused incl. slash-in-filename -- sv_ccmds.c:653-663: `!strncmp(dirname,\"../\",3) || strstr(dirname,\"/../\") || *dirname=='/' || strchr(filename,'/') || (... filename ends with \"/..\") (+ Windows drive test)` -> `Con_Printf(\"Unable to remove\\n\"); return;`. (6) relative to server working dir -- Sys_remove(va(\"%s/%s\",dirname,filename)) sv_ccmds.c:694 with leading-'/' rejected, no absolute root. Access class: Cmd_AddCommand-only, NOT in client ucmds[] (sv_user.c:3299-3375) -> admin-only. BLOCKLIST: 'rm' IS on the normal-rcon blocklist -- sv_main.c:1759 `!strcasecmp(tstr,\"rm\")` sets bad_cmd=true on the rcon_password.string tier (sv_main.c:1708), `do_cmd=!bad_cmd` (sv_main.c:1771) blocks it; only LOCAL CONSOLE and master_rcon_password tier (sv_main.c:1701, unfiltered) reach it. The blocklist also has the worked exploit comment 'coop rm / $coop . * -> rm . *' at sv_main.c:1716-1721 motivating the Cmd_ExpandString check -> 'server console + master rcon only'. F-MV1: no KTX 'rm' override in ktx/src. Default omitted (no-arg prints usage). Token is plain substring (strstr), not a glob -- '*<token>' documented as 'contains <token>', no shell-glob semantics asserted; QW has no CIDR/mask form (not applicable, no address arg).",
  "description_proposed": null
}
```
