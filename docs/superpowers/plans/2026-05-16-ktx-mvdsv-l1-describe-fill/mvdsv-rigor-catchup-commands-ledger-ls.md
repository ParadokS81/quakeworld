# describe-fill-synthesis ledger -- mvdsv `ls`

- **project:** mvdsv
- **knob:** `ls` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:ls: synthesized -- lists a server directory's files/sizes with optional substring filter; path-escape refused; server console + master rcon only -- origin=synthesized ref=src/sv_ccmds.c:561 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Lists the files and subdirectories inside a directory on the server, relative to the directory the server was launched from (its working directory) -- note this is not the gamedir, so list a gamedir's own contents with e.g. ls qw/demos. Files show their size (directories are listed without one); an optional match argument keeps only entries whose name contains that text. Paths that try to escape the server directory (those containing '..' or a leading slash, or a drive letter on Windows) are refused.
>
> ls <directory> [match] = list the contents of <directory>, optionally limited to names containing <match>.
>
> Example: ls demos .mvd  ->  lists everything under the demos directory whose name contains ".mvd".
>
> Set by: server console + master rcon only.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| usage `ls <directory> [match]`, arg1 = directory | src/sv_ccmds.c:535-541 | `if (Cmd_Argc() < 2){ Con_Printf ("ls <directory> <match>\n"); return; } dirname = Cmd_Argv(1);` | MATCH |
| optional match = substring filter (arg2) | src/sv_ccmds.c:569,573,581 | `key = (Cmd_Argc()==3)?Cmd_Argv(2):"";` ... `if (!strstr(list->name, key) ...) continue;` | MATCH |
| each entry shows size; dirs then files | src/sv_ccmds.c:583-588 | `Con_Printf("%s %.0fKB (%.2fMB)\n", ...)` / `Con_Printf("%s %dB\n", ...)` | MATCH |
| path-escape ('..', leading '/', drive) refused | src/sv_ccmds.c:545-555 | `!strncmp(dirname,"../",3) || strstr(dirname,"/../") || *dirname=='/' || ... !strncmp(dirname,"..",3)` -> `Con_Printf("Unable to list %s\n",dirname)` | MATCH |
| relative to server working/game dir (no absolute root) | src/sv_ccmds.c:561 | `dir = Sys_listdir(va("%s", dirname), ".*", SORT_BY_NAME);` (leading '/' already rejected) | MATCH |
| admin-only (not in client ucmds[]) | src/sv_user.c:3299-3375 | `static ucmd_t ucmds[] = {...}` -- no `ls` entry | MATCH |
| normal rcon BLOCKED; only console + master rcon | src/sv_main.c:1761,1771; src/sv_main.c:1701 | `!strcasecmp(tstr,"ls")` -> `bad_cmd = true`; `do_cmd = !bad_cmd`; master tier `do_cmd = true` unfiltered | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | clause | file:line | snippet | verdict |
|---|--------|-----------|---------|---------|
| 1 | Lists files AND subdirectories | sv_ccmds.c:571-576, 581-590 | dir loop `Con_Printf("- %s\n", list->name)` then file loop `Con_Printf("%s %dB\n", ...)` | MATCH |
| 2 | Relative to "server's working/game directory" | sv_ccmds.c:560 + fs.c:534/491 | `Sys_listdir(va("%s", dirname), ...)` passes dirname straight to opendir/FindFirstFile with NO fs_gamedir prefix; `fs_basedir`=".", `fs_gamedir`="./<gamedir>" | MISMATCH (imprecise) -- `ls` is relative to the process CWD, NOT fs_gamedir. The "game directory" (default `./qw`) is a SUBDIRECTORY of the cwd; `ls demos` lists `./demos`, not `./qw/demos`. Conflating "working" and "game" dir is misleading. |
| 3 | Each entry shows its size | sv_ccmds.c:575 vs 585-589 | dirs: `Con_Printf("- %s\n", list->name)` (NO size); files: `Con_Printf("%s %dB\n"/"%.0fKB (%.2fMB)", ...)` | PARTIAL/imprecise -- only FILE entries show size; directory entries show no size |
| 4 | Optional match keeps names containing the text | sv_ccmds.c:568, 573, 583 | `key=(Cmd_Argc()==3)?Cmd_Argv(2):""`; `if(!strstr(list->name, key)...)continue;` | MATCH (case-sensitive substring; empty key passes all) |
| 5 | Paths containing '..' refused | sv_ccmds.c:545-547 | `!strncmp(dirname,"../",3) \|\| strstr(dirname,"/../") \|\| ...!strncmp(dirname+i-3,"/..",4) \|\| !strncmp(dirname,"..",3)` | MATCH (component-based: `../` prefix, `/../`, `/..` suffix, bare `..`; "containing '..'" is a slightly-broad but safe-direction summary) |
| 6 | Leading slash refused | sv_ccmds.c:545 | `*dirname == '/'` | MATCH |
| 7 | Drive letter on Windows refused | sv_ccmds.c:548-552 | `#ifdef _WIN32 ... dirname[1]==':' && (a-z\|A-Z)` | MATCH |
| 8 | Syntax `ls <directory> [match]` | sv_ccmds.c:535-539, 568 | `if(Cmd_Argc()<2){...return;}`; match read only when `Argc()==3` | MATCH ([match] optional -- more accurate than engine's own usage string "ls <directory> <match>") |
| 9 | Set by: server console + master rcon only | sv_main.c:1701-1706 (master), 1747-1774 (rcon block), 3160-3169 (console), cmd.c:706 | master_rcon_password validate -> `do_cmd=true`; rcon_password -> loop sets `bad_cmd=true` for "ls" -> do_cmd=false; console `Sys_ConsoleInput`->`Cbuf_AddText` executes directly; Cmd_AddCommand has no access flag | MATCH |

**V-pass notes:** VERSION CONFIRMED: git describe == 1.11-53-g18d0362.

CLASSIFICATION: C-NEAR-MISS. The command is essentially correctly described, but two clauses are imprecise in ways a server admin would notice:

(1) DECISIVE -- "relative to the server's working/game directory" conflates two DISTINCT directories. Traced sv_ccmds.c:560: handler calls `Sys_listdir(va("%s", dirname), ".*", SORT_BY_NAME)` -- dirname is passed verbatim to opendir() (unix, sv_sys_unix.c:138) / FindFirstFile() (win32, sv_sys_win.c) with NO fs_gamedir prefix. So `ls` resolves paths relative to the process CURRENT WORKING DIRECTORY. Meanwhile fs_gamedir (fs.c:61, default "./<gamedir>" since fs_basedir defaults to "." at fs.c:534, fs_gamedir built at fs.c:491 as "<basedir>/<gamedir>") is a SUBDIRECTORY of the cwd. There is NO startup chdir into the gamedir -- the only two chdir() calls in the tree are sv_sys_unix.c:546 (inside the execv self-restart path) and sv_sys_unix.c:747 (chdir("/") only after chroot via -t). Consequence: `ls demos` lists ./demos (cwd), NOT ./qw/demos (the gamedir's demos). To list QW demos an admin must run `ls qw/demos`. The description's example `ls demos .mvd` therefore points at the wrong directory in the default layout. The "working directory" half of the clause is correct; the "game directory" half is wrong -- not an inverted polarity, hence NEAR-MISS not FIX, but it would actively mislead.

(2) "Each entry shows its size" -- only FILE entries print a size (sv_ccmds.c:585-589). Directory entries print `- %s` with no size (sv_ccmds.c:575) and Sys_listdir explicitly sets dir size=0 (sv_sys_unix.c:172). Minor.

WHAT IS CORRECT (fully traced):
- Lists both subdirs and files (two-loop handler). 
- match arg is a case-sensitive substring filter via strstr (empty string when omitted passes everything). 
- Path-escape guard rejects `..` path components (prefix/embedded/suffix/bare), leading slash, and (win32 only) drive-letter paths -- verified verbatim at sv_ccmds.c:545-553. "Containing '..'" is a slightly broad gloss of the component-based check but errs safe.
- Access scope is EXACTLY right and well-traced: master_rcon_password (server.cfg-only, sv_ccmds.c:1806) authorizes via do_cmd=true (sv_main.c:1701-1706); ordinary rcon_password is explicitly BLOCKED by the bad_cmd loop that lists "ls" among forbidden commands (sv_main.c:1754-1768, comment line 1741 "normal rcon can't use these commands"); local server console executes it directly through Cbuf (sv_main.c:3160-3171). Cmd_AddCommand (cmd.c:706) carries no per-command access flag, so the rcon wrapper + console are the only gates -- the description's "server console + master rcon only" is precise. "master rcon" matches the source's own term master_rcon_password.
- Syntax `ls <directory> [match]` with optional match is MORE accurate than the engine's own usage string `ls <directory> <match>` (sv_ccmds.c:537), which misleadingly brackets match as required.

WI-1 wide read: every use-site enumerated -- server.h:836 (proto), sv_ccmds.c:522-593 (handler+comment+usage), sv_ccmds.c:1844 (registration), sv_main.c:1738/1756 (rcon block). No alias, no alternate registration, no help-JSON override.

SUGGESTED FIX for re-synth: replace "relative to the server's working/game directory" with "relative to the directory the server process was launched from (its current working directory) -- note this is the install root, not the gamedir, so list a gamedir's contents with e.g. `ls qw/demos`". Adjust the example accordingly. Optionally clarify that directory entries are listed without a size and that the match filter is case-sensitive.

## flags_for_review

- [fyi/cross-mod-override/vpass] The rcon access gate uses the source's own term 'master rcon' (master_rcon_password, settable only in server.cfg per sv_ccmds.c:1806). The describe-fill access-class WI-2 rule normally keys on command-table CF_ flags, but mvdsv's ls/rm/rmdir/chmod use a hardcoded forbidden-command loop in SVC_RemoteCommand (sv_main.c:1754-1768) rather than CF_ flags -- access is enforced by string-matching the command name against a denylist for ordinary rcon, while master rcon and local console bypass it. This sibling 'admin file commands' cluster (rm, rmdir, chmod, ls) shares the identical guard and the identical sv_main.c denylist; any of their descriptions asserting access scope should trace to this same loop, not to a CF_ flag.
- [review/suspected-bug/vpass] Path-escape guard at sv_ccmds.c:546 has a benign off-by-one in the trailing-'/..' check: `!strncmp(dirname + i - 3, "/..", 4)` passes length 4 for a 3-char literal "/..", so it compares 4 bytes including the literal's NUL -- which correctly requires dirname to END exactly with "/.." (the 4th byte forces the terminator to match). Not a bug, but the `4` looks like a typo for `3` and is worth a comment; it happens to make the check stricter (exact-suffix) rather than looser. Same pattern is absent from the sibling rmdir guard (sv_ccmds.c:612), which omits the trailing-'/..' and bare-'..' checks entirely -- a possible inconsistency where `rmdir foo/..` is NOT rejected by the same family of guards. Flagging for the rm/rmdir/chmod cluster review, not for ls itself.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "ls",
  "type": "command",
  "description": "Lists the files and subdirectories inside a directory on the server, relative to the directory the server was launched from (its working directory) -- note this is not the gamedir, so list a gamedir's own contents with e.g. ls qw/demos. Files show their size (directories are listed without one); an optional match argument keeps only entries whose name contains that text. Paths that try to escape the server directory (those containing '..' or a leading slash, or a drive letter on Windows) are refused.\n\nls <directory> [match] = list the contents of <directory>, optionally limited to names containing <match>.\n\nExample: ls demos .mvd  ->  lists everything under the demos directory whose name contains \".mvd\".\n\nSet by: server console + master rcon only.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:561. Handler SV_ListFiles_f (src/sv_ccmds.c:527), registered src/sv_ccmds.c:1844. Clause traces: (1) usage `ls <directory> <match>` and arg1=directory -- `if (Cmd_Argc()<2){ Con_Printf(\"ls <directory> <match>\\n\"); return; }` sv_ccmds.c:535-539, `dirname = Cmd_Argv(1)` sv_ccmds.c:541. (2) optional substring match (arg2) -- `key = (Cmd_Argc()==3)?Cmd_Argv(2):\"\"` sv_ccmds.c:569; entries skipped unless name contains key -- `if (!strstr(list->name, key) ...) continue;` sv_ccmds.c:573,581. (3) sizes printed per file -- sv_ccmds.c:583-588 (`%.0fKB (%.2fMB)` / `%dB`); directories listed first (sv_ccmds.c:572-577) then files. (4) path-escape refused -- sv_ccmds.c:545-555: `!strncmp(dirname,\"../\",3) || strstr(dirname,\"/../\") || *dirname=='/' || ... !strncmp(dirname,\"..\",3)` (+ Windows `dirname[1]==':'` drive-letter test) -> `Con_Printf(\"Unable to list %s\\n\",dirname); return;`. (5) relative to server working dir -- listing is `Sys_listdir(va(\"%s\",dirname),\".*\",SORT_BY_NAME)` sv_ccmds.c:561 with no absolute-root prefix and leading-'/' rejected. Access class: Cmd_AddCommand-only, NOT in client ucmds[] (sv_user.c:3299-3375) -> admin-only. BLOCKLIST: 'ls' IS on the normal-rcon blocklist -- sv_main.c:1761 `!strcasecmp(tstr,\"ls\")` sets bad_cmd=true on the rcon_password.string tier (validated sv_main.c:1708), and `do_cmd = !bad_cmd` (sv_main.c:1771) blocks it; only the LOCAL CONSOLE and the master_rcon_password tier (validated sv_main.c:1701, sets do_cmd=true unfiltered, no token check) reach it -> 'server console + master rcon only'. F-MV1: no KTX 'ls' override in ktx/src. Default omitted (no-arg prints usage). 'match' is a plain substring (strstr), not a glob/regex -- documented as 'containing that text', no wildcard syntax asserted.",
  "description_proposed": null
}
```
