# describe-fill-synthesis ledger -- mvdsv `localcommand`

- **project:** mvdsv
- **knob:** `localcommand` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:localcommand: synthesized -- runs its args as a host OS shell command (system()) and echoes the output; off unless -enablelocalcommand at launch; server console + master rcon only (blocklisted on regular rcon) -- origin=synthesized ref=src/sv_ccmds.c:771 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Runs its argument string as a command on the server's host operating system (a shell command), then prints whatever that command wrote to standard output/error back to the console. A debug/maintenance escape hatch, off by default.
>
> localcommand <command> [args...] = run "<command> args..." as an OS shell command on the machine hosting the server and echo its output.
>
> This command only exists if the server was started with the -enablelocalcommand command-line option; otherwise it is not registered. It is also restricted to the local server console and the master rcon password -- it cannot be run over the ordinary rcon password.
>
> Set by: server console + master rcon only (and only when -enablelocalcommand was given at launch).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| runs the argument string as a host OS shell command | src/sv_ccmds.c:769,771 | `strlcat(str, va("> %s 2>&1\n", temp_file), ...)` ; `if (system(str) == -1)` | MATCH |
| echoes the command's stdout/stderr back to console | src/sv_ccmds.c:777-789 | `fopen(temp_file,"rt")` ... `Con_Printf("%s", buf)` ... `Sys_remove(temp_file)` | MATCH |
| no-arg usage | src/sv_ccmds.c:757-760 | `if ((c = Cmd_Argc()) < 2) { Con_Printf("localcommand [command]\n"); return; }` | MATCH |
| off by default: registered only with -enablelocalcommand | src/sv_ccmds.c:1855-1856 ; src/server.h:1107,1115 | `if (SV_CommandLineEnableLocalCommand()) Cmd_AddCommand("localcommand", ...)` ; `#define SV_CommandLineEnableLocalCommand() (COM_CheckParm("-enablelocalcommand"))` | MATCH |
| available on all platforms (not Unix-gated) | src/sv_ccmds.c:1852-1856 | `#ifndef _WIN32 ... chmod ... #endif` closes at 1854; the `localcommand` registration at 1855-1856 is OUTSIDE that guard | MATCH |
| not client-issuable | src/sv_user.c:3299-3395 ; src/sv_user.c:3399,3424 | name absent from `ucmds[]`; `SV_ExecuteUserCommand` "Bad user command" no fall-through | MATCH |
| blocked on regular rcon (master rcon + console only) | src/sv_main.c:1760,1767,1774 ; src/sv_main.c:1701,1708 | `!strcasecmp(tstr,"localcommand")` -> `bad_cmd = true` -> `do_cmd = !bad_cmd`; master-rcon validate (1701) never sets bad_cmd | MATCH |
| no KTX override | ktx/src (grep) | no `localcommand` registration in KTX | MATCH (absent) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | "Runs its argument string as a command on the server's host OS (a shell command)" | sv_ccmds.c:771 | `if (system(str) == -1)` | MATCH -- `system()` invokes the host shell (/bin/sh -c on POSIX, cmd.exe /c on Win); `str` is built from the args. |
| 2 | Args joined into the command string | sv_ccmds.c:763-768 | `for (i = 1; i < c; i++){ strlcat(str, Cmd_Argv(i),...); strlcat(str, " ",...);}` | MATCH -- args 1..n concatenated space-separated. |
| 3 | "prints whatever that command wrote to standard output/error back to the console" | sv_ccmds.c:769, 777-789 | `strlcat(str, va("> %s 2>&1\n", temp_file),...)` then `fopen(temp_file,"rt")` ... `Con_Printf("%s", buf)` | MATCH -- `> file 2>&1` redirects both stdout AND stderr to temp file; file is read back and Con_Printf'd; "(empty)" if unopenable; temp file removed after. |
| 4 | "off by default" / not registered unless launched with -enablelocalcommand | sv_ccmds.c:1856-1857 + server.h:1107/1115 | `if (SV_CommandLineEnableLocalCommand()) Cmd_AddCommand("localcommand", SV_LocalCommand_f);` ; macro = `COM_CheckParm("-enablelocalcommand")` | MATCH -- registration is conditional on the bare presence flag; absent => command not added => unavailable. |
| 5 | "only exists if the server was started with -enablelocalcommand; otherwise it is not registered" | same as #4 | (same) | MATCH -- Cmd_AddCommand is the sole registration site (grep confirms single SV_LocalCommand_f registration); no fallback path. |
| 6 | "restricted to ... the master rcon password -- it cannot be run over the ordinary rcon password" | sv_main.c:1701-1774, blocklist 1747-1770 | master branch: `if (Rcon_Validate(remote_command, master_rcon_password)){ ... do_cmd = true; }`; admin branch (`rcon_password.string`) runs blocklist incl. `!strcasecmp(tstr, "localcommand")` => `bad_cmd=true`; then `do_cmd = !bad_cmd` | MATCH -- ordinary `rcon_password` path blocks localcommand; `master_rcon_password` path does not run the blocklist (do_cmd set true directly). Two-tier confirmed (master = char[] set only in server.cfg per sv_ccmds.c:1804-1806; ordinary = rcon_password cvar). |
| 7 | "restricted to the local server console" + "Set by: server console + master rcon only" | sv_ccmds.c:1857 (console registration) + sv_main.c gating (#6) | (registration makes it a console command; rcon path gated as #6) | MATCH -- once registered it is a normal console command; remote access only via master rcon. |
| 8 | Usage "localcommand <command> [args...]" / argc<2 prints usage | sv_ccmds.c:757-761 | `if ((c = Cmd_Argc()) < 2){ Con_Printf("localcommand [command]\n"); return; }` | MATCH -- requires >=1 argument; bare invocation prints usage and returns. |
| 9 | (implicit scope) no platform restriction claimed | sv_ccmds.c:745-752 | `SV_LocalCommand_f` sits OUTSIDE the `#ifndef _WIN32` block (707-745, which wraps only SV_ChmodFile_f) | MATCH -- handler compiles on all platforms; description's platform-agnostic wording is correct. |

**V-pass notes:** COLD V-pass. Oracle confirmed: git describe == "1.11-53-g18d0362". Trace-discipline reference read and applied per-clause.

Every material clause (polarity, default/OFF-state, scope, rcon access-class, side-effect/output) maps to a located enforcing line in live source, verified against the line's actual code AND adjacent comments. Wide-grep returned exactly 8 hits across 4 files; all traced.

Key cross-file enforcement (the clause that most needed callee/cross-file tracing): the access-class claim ("master rcon only, not ordinary rcon") is enforced NOT at the registration site but in sv_main.c SVC_RemoteCommand. The master_rcon_password branch (1701-1707) sets do_cmd=true directly; the ordinary rcon_password ("admin_cmd") branch (1708+) runs the token blocklist (1747-1770) that lists "localcommand" => bad_cmd=true => do_cmd=false. This is the WI-2 access-class discipline satisfied against the actual dispatch check, not the command name. Two distinct password concepts verified at their declarations (master = char[128] in sv_main.c:46, settable only in server.cfg per sv_ccmds.c:1804-1806; ordinary = rcon_password cvar sv_main.c:71).

"Off by default" is a registration-gate statement, not a registered-cvar-default claim, so WI-2 default-value rule does not apply (localcommand is a command, not a cvar). The gate macro resolves to COM_CheckParm of a bare presence flag; both the SERVERONLY (string literal) and non-SERVERONLY (cmdline_param_server_enablelocalcommand) branches name the same "-enablelocalcommand" flag.

Output/side-effect clause fully traced: `> file 2>&1` redirect captures BOTH stdout and stderr (description's "standard output/error" is precise), read back and printed, temp file removed.

No clause is name/enum/string/comment-only inference. No contradictions. TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] SV_LocalCommand_f is bracketed by 'bliP: REMOVE ME REMOVE ME' comments (sv_ccmds.c:751, 793) and runs attacker-influenceable input through system(). The -enablelocalcommand registration gate + the SVC_RemoteCommand rcon blocklist (which also covers rm/rmdir/ls/chmod/log*/sys_command_line/etc.) are the security mitigations that exist precisely because this is a remote-code-execution surface. Not a description defect -- the proposed text correctly frames it as a debug/maintenance escape hatch -- but the L1 consumer may want this security context surfaced alongside the entry.
- [fyi/hidden-family/vpass] The same SVC_RemoteCommand blocklist (sv_main.c:1747-1770) gates a cluster of sibling commands under the ordinary-rcon-vs-master-rcon distinction: rm, rmdir, ls, chmod, sv_admininfo, if, localcommand, sv_crypt_rcon, sv_timestamplen, any token starting with 'log' (strncasecmp prefix match), and sys_command_line. If those siblings are also being described, the identical 'master rcon only, not ordinary rcon' clause applies and should be traced to this same site (the 'log' prefix match is the one easy-to-miss case -- it is a prefix, not exact).

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "localcommand",
  "type": "command",
  "description": "Runs its argument string as a command on the server's host operating system (a shell command), then prints whatever that command wrote to standard output/error back to the console. A debug/maintenance escape hatch, off by default.\n\nlocalcommand <command> [args...] = run \"<command> args...\" as an OS shell command on the machine hosting the server and echo its output.\n\nThis command only exists if the server was started with the -enablelocalcommand command-line option; otherwise it is not registered. It is also restricted to the local server console and the master rcon password -- it cannot be run over the ordinary rcon password.\n\nSet by: server console + master rcon only (and only when -enablelocalcommand was given at launch).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:771. Handler SV_LocalCommand_f (sv_ccmds.c:752-792). Enforcing behavior: sv_ccmds.c:757 requires Argc()>=2 else prints usage 'localcommand [command]'; sv_ccmds.c:763-768 concatenates Cmd_Argv(1..) into a single string; sv_ccmds.c:769 appends `> __output_temp_file__ 2>&1` to redirect stdout+stderr; sv_ccmds.c:771 `if (system(str) == -1)` -- THIS is the enforcing line: the assembled string is executed by the host OS shell via system(); sv_ccmds.c:777-789 reopens the temp file and Con_Printf's its contents back (then removes it). So 'runs an arbitrary OS shell command and echoes its output' is enforced, not inferred. Registration gate: sv_ccmds.c:1855-1856 `if (SV_CommandLineEnableLocalCommand()) Cmd_AddCommand(\"localcommand\", ...)`; the macro is COM_CheckParm(\"-enablelocalcommand\") (server.h:1107 SERVERONLY / 1115 otherwise) -- so the command is NOT registered unless -enablelocalcommand is on the command line ('off by default'). The registration is NOT inside the preceding `#ifndef _WIN32` block (that block closes at sv_ccmds.c:1854 after chmod), so localcommand is available on all platforms when the flag is set; system() is portable. Access class: NOT in ucmds[] (sv_user.c:3299-3395) -> not client-issuable. localcommand IS on the normal-rcon blocklist: sv_main.c:1760 `!strcasecmp(tstr, \"localcommand\")` sits in the block that sets bad_cmd=true (sv_main.c:1767); do_cmd = !bad_cmd (sv_main.c:1774) so it is rejected on the rcon_password tier (validated sv_main.c:1708) but the master_rcon_password tier (validated sv_main.c:1701, never sets bad_cmd) and the local console reach it -- hence 'server console + master rcon only'. F-MV1: no KTX override (grep ktx/src for localcommand = none).",
  "description_proposed": null
}
```
