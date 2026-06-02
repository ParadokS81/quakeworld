# describe-fill-synthesis ledger -- mvdsv `script`

- **project:** mvdsv
- **knob:** `script` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:script: synthesized -- runs server-side <name>.qws via fork/sh.exe with args, '..' blocked, console/rcon, drives demo hooks; no KTX override -- origin=synthesized ref=src/sv_main.c:2866 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Runs an external server-side script on the machine hosting the server -- a file named <name>.qws in the active game directory (e.g. qw/, or a loaded mod dir like ktx/); on Linux it is run directly, on Windows through sh.exe. Anything after the name is passed to the script as arguments (with $key / @key serverinfo/localinfo macros expanded first). Most '..' paths are rejected, but note one gap: a single leading '../' is accepted and reaches one directory above the game directory.
>
> This is the same mechanism the automatic demo hooks use (sv_onrecordfinish / sv_ondemoremove run a .qws when a recording finishes or a demo is deleted); running 'script' by hand invokes such a script directly.
>
> script <name> [args...] = run <name>.qws with the given arguments.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| runs an external <name>.qws script | src/sv_main.c:2866 + src/sv_sys_unix.c:519-521 | `Sys_Script(path, ...)`; `strlcat(exec_path, path); strlcat(exec_path, ".qws")` | MATCH |
| unix: fork+execv ./<name>.qws; win: sh.exe <name>.qws | src/sv_sys_unix.c:509-521 / src/sv_sys_win.c:681 | fork()+execv; `"%s\\sh.exe %s.qws %s"` | MATCH |
| args after name forwarded to script | src/sv_main.c:2855-2866 | `p = Cmd_Args(); ... Sys_Script(path, va("%d %s", sv_redirected, p))` | MATCH |
| '..' paths rejected | src/sv_main.c:2843-2850 | strips leading '../'/'..\\', then `if (strstr(path, "..")) { Con_Printf("Invalid path.\n"); return; }` | MATCH |
| same mechanism as demo hooks | src/sv_demo_misc.c:227-233,636-638,687-689 | `Cmd_TokenizeString(va("script %s ...", sv_onrecordfinish.string/sv_ondemoremove.string, ...)); SV_Script_f();` | MATCH |
| console/rcon only (not in ucmds) | src/sv_user.c (grep) | no ucmds[] entry for "script" | MATCH |
| not on normal-rcon blocklist | src/sv_main.c:1754-1764 | blocklist members do not include 'script' | MATCH |
| no KTX override | ktx/src grep | no cmd_t entry for "script" | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| C1 | Runs an external server-side script on the host machine | sv_sys_unix.c:509,548 / sv_sys_win.c:684 | `switch(fork()) { ... }` ... `if (execv(exec_path, exec_args) == -1)` ; `return CreateProcess (NULL, cmdline, ...)` | MATCH |
| C2 | Script must be a file named `<name>.qws` | sv_sys_unix.c:521 / sv_sys_win.c:681 / sv_main.c:2864 | `strlcat(exec_path, ".qws", sizeof(exec_path));` ; `snprintf(cmdline, ..., "%s\\sh.exe %s.qws %s", ...)` ; `Sys_Printf("Running %s.qws\n", path);` | MATCH |
| C3 | Located in the server's working directory | sv_sys_unix.c:519,546 / sv_sys_win.c:682 / fs.c:491,534 | `strlcpy(exec_path, "./", ...)` + `if (chdir(fs_gamedir) == -1)` ; `strlcat(curdir, va("\\%s", fs_gamedir+2), MAX_OSPATH);` ; `snprintf(fs_gamedir, ..., "%s/%s", fs_basedir, dir)` | MISMATCH (imprecise) -- the dir is `fs_gamedir` = `<basedir>/<active-gamedir>` (e.g. `qw/`, `ktx/`), NOT the bare process CWD. With default basedir=`.` the script is `./<gamedir>/<name>.qws`, not `./<name>.qws`. |
| C4 | On Linux executed directly | sv_sys_unix.c:548 | `if (execv(exec_path, exec_args) == -1)` | MATCH (execv, no shell) |
| C5 | On Windows run through sh.exe | sv_sys_win.c:681,684 | `snprintf(cmdline, ..., "%s\\sh.exe %s.qws %s", curdir, path, args);` ... `return CreateProcess (NULL, cmdline, ...)` | MATCH |
| C6 | Anything after the name is forwarded to the script as arguments | sv_main.c:2855-2866 + DecodeArgs sv_main.c:2789-2816 | `p = Cmd_Args(); while (*p>32) p++; ... p = DecodeArgs(p); ... Sys_Script(path, va("%d %s", sv_redirected, p));` | MISMATCH (imprecise) -- args pass through `DecodeArgs` which expands `$key`/`@key` localinfo/serverinfo macros, and a leading `sv_redirected` integer (0=console, 2=rcon) is PREPENDED as the script's first arg. Not a verbatim forward. |
| C7 | Paths containing `..` are rejected, so scripts cannot be run from outside the server directory | sv_main.c:2843-2853 | `if (!strncmp(path,"../",3) \|\| !strncmp(path,"..\\",3)) path += 3;` ... `if (strstr(path, "..")) { Con_Printf("Invalid path.\n"); return; }` ... `path = Cmd_Argv(1);` | **MISMATCH (contradiction)** -- a single leading `../`/`..\\` is skipped for the check (line 2844), then line 2853 RE-FETCHES the original `Cmd_Argv(1)` (with `../` intact) and passes it to `Sys_Script`. `script ../foo` runs `<gamedir>/../foo.qws` -- one level OUTSIDE the gamedir. Only `..` in non-leading position is actually rejected. The safety conclusion is overstated. |
| C8 | Same mechanism the demo hooks use | sv_demo_misc.c:228,233,637-638,688-689 | `Cmd_TokenizeString(va("script %s ...", sv_onrecordfinish.string, ...)); ... SV_Script_f();` ; `Cmd_TokenizeString(va("script %s ...", sv_ondemoremove.string, ...)); SV_Script_f();` | MATCH |
| C9 | sv_onrecordfinish / sv_ondemoremove run a .qws on record-finish / demo-delete | sv_demo_misc.c:211,228 (record-finish) / 627-637,679-688 (after successful Sys_remove) | `if (sv_onrecordfinish.string[0] && !destroyfiles)` ... `if (!Sys_remove(path)) { ... if (*sv_ondemoremove.string) { ... script ... } }` | MATCH |
| C10 | Running `script` by hand invokes one of those scripts directly | sv_main.c:2829 (shared SV_Script_f) | `void SV_Script_f (void)` -- same handler reached by manual command and by the demo hooks | MATCH (slightly loose framing -- "one of those scripts" only if `<name>` matches the cvar value; the shared code-path claim is correct) |
| C11 | Usage: `script <name> [args...]` | sv_main.c:2836 | `Con_Printf("usage: script <path> [<args>]\n");` | MATCH |
| C12 | Set by: server console / rcon | sv_demo.c:1954 (Cmd_AddCommand) / sv_main.c:1819-1828 (rcon path) / sv_user.c:3299,3408-3424 (ucmds[] -- no "script") | `Cmd_AddCommand ("script", SV_Script_f);` ; `SV_BeginRedirect(RD_PACKET); ... Cmd_ExecuteString(str);` ; ucmds[] table contains no "script", unmatched player cmd -> `Con_Printf("Bad user command: ...")` | MATCH (console RD_NONE + rcon RD_PACKET; no client/player access) |

**V-pass notes:** Oracle confirmed at 1.11-53-g18d0362. Row verdict = C-FIX, driven by C7.

DECISIVE (C7 contradiction): The description states "Paths containing '..' are rejected, so scripts cannot be run from outside the server directory." The enforcing code (sv_main.c:2843-2853) does NOT provide that guarantee for a single leading '../'. Line 2844 advances the pointer past a leading "../"/"..\\" purely to skip it for the strstr check; line 2853 then re-fetches the ORIGINAL Cmd_Argv(1) (still containing "../") and passes it to Sys_Script. Net effect: `script ../foo` is accepted and runs `<gamedir>/../foo.qws` -- exactly one directory level OUTSIDE the gamedir, on both Linux (execv "./../foo.qws" after chdir(fs_gamedir)) and Windows (sh.exe ../foo.qws with workdir=gamedir). Multi-`..` and non-leading `..` ARE rejected. The bliP "//need subdirs here" comment shows the carve-out was intentional, but the doc's safety conclusion is overstated/contradicted. Re-synth should drop or correct the "cannot be run from outside the server directory" conclusion (the truthful statement is: a leading '../' permits escaping one level above the gamedir; other '..' uses are rejected).

SECONDARY near-miss clauses to fix in the same re-synth (do not narrow scope to C7 only):
- C3: "the server's working directory" is imprecise. The script lives in fs_gamedir = <basedir>/<active-gamedir> (e.g. qw/, or the loaded mod dir like ktx/), not the bare process CWD. fs_basedir defaults to "." (fs.c:534). So with defaults it is ./<gamedir>/<name>.qws.
- C6: "anything passed after the name is forwarded to the script as arguments" omits two transforms: (1) args pass through DecodeArgs (sv_main.c:2768-2827) which expands $key/@key serverinfo/localinfo macros and re-quotes; (2) a leading integer (sv_redirected: 0=console/RD_NONE, 2=rcon/RD_PACKET) is prepended as the script's FIRST argument, so user args start at the script's second positional arg. This is meaningful -- it lets the script know whether to route output back over rcon.

CLEAN clauses: C1, C2, C4, C5, C8, C9, C10 (loose-but-correct), C11, C12 all map to located, verified enforcing lines including the cross-file demo-hook trace (sv_demo_misc.c -> SV_Script_f -> Sys_Script) and the access-class trace (registered as a plain Cmd_AddCommand server command, reachable via console + rcon's Cmd_ExecuteString, absent from the ucmds[] player-command table so no direct client access). MVDSV has no CF_ flag system, so access-class was traced through the dispatch paths per WI-2, not inferred from a flag.

## flags_for_review

- [review/suspected-bug/vpass] Path-traversal carve-out in SV_Script_f (sv_main.c:2843-2853): a single leading '../' or '..\\' bypasses the '..' rejection because the check runs on a locally-advanced pointer (path += 3) while line 2853 re-fetches the original Cmd_Argv(1) and passes the un-stripped path (with '../') to Sys_Script. `script ../foo` executes <gamedir>/../foo.qws -- one dir level above the gamedir. Reachable via rcon (RD_PACKET path, sv_main.c:1819-1828). Whether this is exploitable depends on whether an attacker can place a .qws there and on rcon password exposure, but it is a real deviation from the apparent intent of the '..' guard. Likely a long-standing bliP-era quirk (the '//bliP: 24/9 need subdirs here' comment), not new at this tag. Surfacing as a suspected-bug / safety-claim contradiction; not in scope to fix here (read-only V-pass).

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "script",
  "type": "command",
  "description": "Runs an external server-side script on the machine hosting the server -- a file named <name>.qws in the active game directory (e.g. qw/, or a loaded mod dir like ktx/); on Linux it is run directly, on Windows through sh.exe. Anything after the name is passed to the script as arguments (with $key / @key serverinfo/localinfo macros expanded first). Most '..' paths are rejected, but note one gap: a single leading '../' is accepted and reaches one directory above the game directory.\n\nThis is the same mechanism the automatic demo hooks use (sv_onrecordfinish / sv_ondemoremove run a .qws when a recording finishes or a demo is deleted); running 'script' by hand invokes such a script directly.\n\nscript <name> [args...] = run <name>.qws with the given arguments.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:2866. Handler SV_Script_f (src/sv_main.c:2829). Usage requires >=1 arg: src/sv_main.c:2834-2838 'usage: script <path> [<args>]'. Path-traversal guard: src/sv_main.c:2843-2850 strips a leading '../' or '..\\\\' then rejects any path still containing '..' ('Invalid path.'). Enforcing exec: src/sv_main.c:2866 `Sys_Script(path, va(\"%d %s\", sv_redirected, p));` -- the first forwarded arg is the redirect type. Sys_Script impl unix: src/sv_sys_unix.c:499-521 builds `./<path>.qws` (the '.qws' suffix is appended at sv_sys_unix.c:521) and fork()+execv()s it; win: src/sv_sys_win.c:667-685 runs `<curdir>\\sh.exe <path>.qws <args>` via CreateProcess. The '.qws' suffix is also visible in the console print src/sv_main.c:2864 'Running %s.qws'. Access class: NOT in ucmds[] (grep '\"script\"' src/sv_user.c returned no entry) -> not client-stuffable; reachable only from local console / rcon. Normal-rcon blocklist (src/sv_main.c:1754-1764): 'script' is NOT a member, so the regular rcon_password tier reaches it -> Set-by = 'server console / rcon' (not master-only). Internal callers (demo automation) at src/sv_demo_misc.c:227-233 (onrecordfinish), :636-638 and :687-689 (ondemoremove) set sv_redirected=RD_NONE then call SV_Script_f -- documents the hook relationship. F-MV1: grep ktx/src for '\"script\"' command-table entry returned none -- KTX does not override the command. [MAIN-HG2 edit: corrected the '..' safety claim -- a single leading '../' bypasses the strstr('..') guard (sv_main.c:2843-2853: path+=3 for the check, then Cmd_Argv(1) re-fetched at :2853), reaching one dir above fs_gamedir; also placed scripts in the active gamedir and noted $/@ macro expansion of args.]",
  "description_proposed": null
}
```
