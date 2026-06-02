# describe-fill-synthesis ledger -- mvdsv `-t`

- **project:** mvdsv
- **knob:** `-t` (cmdline_param)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `cmdline-params` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:-t: synthesized -- Unix-only value flag; chroots the server process to the given directory at startup (then chdir /), off when absent; no KTX override -- origin=synthesized ref=src/sv_sys_unix.c:744 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Linux/Unix dedicated server only. Early in startup -- before the server initializes its filesystem, reads server.cfg, or loads a map -- confines the process to a given directory using the operating system's chroot, so it can no longer see files outside that directory. Takes one value: the path to confine to.
>
> mvdsv -t /home/qw/jail   = confine the server process to /home/qw/jail
>
> Default: off (the process is not confined).
> Set by: launch command line at server startup. Requires root to take effect; if the chroot fails it logs a warning and the server keeps running unconfined. Commonly combined with -u to drop to an unprivileged user afterwards.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| recognized as a launch flag | src/sv_sys_unix.c:740 | `j = COM_CheckParm ("-t");` | MATCH |
| takes one trailing value (a directory path) | src/sv_sys_unix.c:741-742 | `if (j && j + 1 < com_argc) { chroot_dir = com_argv[j + 1]; }` | MATCH |
| effect = chroot to that directory | src/sv_sys_unix.c:743 | `if (chroot(chroot_dir) < 0)` | MATCH |
| on success also chdir into new root | src/sv_sys_unix.c:745-746 | `else if (chdir("/") < 0) Sys_Printf("chdir(\"/\") to %s failed ...")` | MATCH |
| OFF-state default = no chroot when absent | src/sv_sys_unix.c:741 | chroot only inside `if (j && j + 1 < com_argc)` | MATCH |
| runs before -u setuid | src/sv_sys_unix.c:751-752 | `// setuid - we can't setuid before chroot ...` | MATCH |
| Unix dedicated build only | src/sv_sys_unix.c:629,774 | `static void SV_System_Init(void)` ... called at startup (sv_sys_win.c lacks -t) | MATCH |
| no KTX override | ktx/src grep | no CheckParm in ktx/src | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|------------------|---------|
| 1 | "Linux/Unix dedicated server only" (scope) | src/sv_sys_unix.c:740 (present); src/sv_sys_win.c (absent) | `j = COM_CheckParm ("-t");` -- exists only in unix sys file; grep for `"-t"`/`chroot` in sv_sys_win.c returns nothing | MATCH |
| 2 | "**After the server has started up**, confines its process..." (TIMING / ORDERING) | src/sv_sys_unix.c:773-775 (main) + chroot at 744 | `COM_InitArgv(...);` / `SV_System_Init();` // chroot runs here / `Host_Init(argc, argv, DEFAULT_MEM_SIZE);` -- chroot is in SV_System_Init, called at 774, BEFORE Host_Init at 775 | **MISMATCH** |
| 3 | "confines its process to a given directory using the operating system's chroot" (mechanism) | src/sv_sys_unix.c:744,747 | `if (chroot(chroot_dir) < 0) ... else if (chdir("/") < 0) ...` | MATCH |
| 4 | "so the process can no longer see files outside that directory" | src/sv_sys_unix.c:744,747 | `chroot(chroot_dir)` then `chdir("/")` on success -- standard chroot confinement semantics | MATCH |
| 5 | "Takes one value: the path to confine to" | src/sv_sys_unix.c:741,743 | `if (j && j + 1 < com_argc)` / `chroot_dir = com_argv[j + 1];` -- exactly one following arg, the path | MATCH |
| 6 | "Default: off (the process is not confined)" (OFF-state) | src/sv_sys_unix.c:740-741 | `j = COM_CheckParm ("-t"); if (j && j + 1 < com_argc)` -- COM_CheckParm returns 0 when absent (common.c:816-827), so block is skipped, chroot never called | MATCH |
| 7 | "Set by: launch command line at server startup" | src/sv_sys_unix.c:740; src/common.c:816 | `COM_CheckParm("-t")` scans `com_argv` -- pure command-line param, no cvar/config path | MATCH |
| 8 | "Requires root privileges to take effect" | src/sv_sys_unix.c:744 (+ comment 751-752) | `if (chroot(chroot_dir) < 0)` -- bare chroot(2) call; OS requires CAP_SYS_CHROOT/root. NOT enforced by an mvdsv privilege-check line (failure only warns); statement is correct OS semantics, corroborated by setuid-ordering comment | MATCH (OS semantics, not engine-enforced -- see flag) |
| 9 | "commonly combined with -u to drop to an unprivileged user afterwards" (ordering/side-effect) | src/sv_sys_unix.c:751-758 (setuid block) + comment 751-752 | `// setuid - we can't setuid before chroot and can't resolve uid/gid from user/group names after chroot` then `if (ind) { if (setuid(user_id) < 0) ... }` -- setuid runs strictly AFTER the chroot block | MATCH |

**V-pass notes:** CLASSIFICATION: C-FIX. One clause directly contradicts its enforcing line.

THE DEFECT (clause 2, timing/ordering): The description says "After the server has started up, confines its process to a given directory." The code does the OPPOSITE. In main() (src/sv_sys_unix.c:766-807) the call order is:
  773: COM_InitArgv(argc, argv);        // parse args
  774: SV_System_Init();                // <- chroot() happens HERE (line 744)
  775: Host_Init(argc, argv, ...);      // <- THIS is "server startup"
  778: SV_Frame(0.1);                   // first frame / first heartbeat

The chroot lives in SV_System_Init() and runs STRICTLY BEFORE Host_Init(). Host_Init (src/sv_main.c:3951) is unambiguously server startup: it prints "============= Starting ... =============" (3962), runs Cvar_Init/COM_Init (3966-3967), FS_Init (3969, filesystem), NET_Init (3970, network), SV_Init (3977), exec server.cfg (4001), and SV_Map (4009, loads the map), printing "QuakeWorld Initialized" (3996). All of that happens AFTER the chroot. So the confinement is applied EARLY -- before filesystem init, before server.cfg is exec'd, before the map loads -- not "after the server has started up." This is polarity-inverted (before vs after), not merely narrower/more-conditional, so it is C-FIX not C-NEAR-MISS. This is exactly the flavour-C failure mode: the "after startup" framing reads plausibly but was never traced to the call order; the actual order inverts it.

SUGGESTED CORRECTION for the offending clause: "Early during launch, before the server initializes its filesystem, runs server.cfg, or loads a map, confines the process to a given directory using the operating system's chroot..." (i.e. replace "After the server has started up" with an "early / before server init" framing).

EVERYTHING ELSE IS CLEAN (8 of 9 clauses MATCH): scope (unix-only -- verified absent from sv_sys_win.c), mechanism (chroot + chdir("/")), one-value-is-the-path, OFF-state default (guard skips block when -t absent), command-line-only, and the -u/setuid ordering (the source comment at 751-752 and the setuid block at 753-758 confirm setuid runs AFTER chroot -- matching "drop to unprivileged user afterwards"). The man page (docs/man/man6/mvdsv.6:59-63) independently corroborates "-t DIRECTORY = chroot to DIRECTORY" paired with "-u USER = setuid to USER" and the [unix specific parameters] grouping. Note: this row's only fix is the single ordering sentence; per enforce-trace seeded-re-synth guidance the re-synth should still re-trace all clauses, but no second untraced clause was found here.

## flags_for_review

- [fyi/other/vpass] Clause 8 ('requires root privileges to take effect') is a correct statement of chroot(2) OS semantics but is NOT enforced by any privilege-check line inside mvdsv. The code (sv_sys_unix.c:744) calls bare chroot() and on failure only prints a warning ('chroot %s failed: %s') then continues running un-confined -- it does not abort. So a non-root invocation with -t silently produces an UNCONFINED server (warning to stdout only). The description's 'requires root to take effect' is true, but readers may assume failure is fatal; it is not. FYI-level precision note, not a defect in the traced clause.
- [fyi/other/vpass] The chroot/setuid/setgid/daemon block carries a source comment (sv_sys_unix.c:627-628) 'Daemon, chroot, setgid and setuid code (-d, -t, -g, -u) was copied from bind (DNS server) sources.' This is provenance/attribution context for the whole -d/-t/-g/-u family, useful if these four cmdline params are documented together. Not a behavior claim.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: -nohwtimer=C-FIX, -heapsize=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "-t",
  "type": "cmdline_param",
  "description": "Linux/Unix dedicated server only. Early in startup -- before the server initializes its filesystem, reads server.cfg, or loads a map -- confines the process to a given directory using the operating system's chroot, so it can no longer see files outside that directory. Takes one value: the path to confine to.\n\nmvdsv -t /home/qw/jail   = confine the server process to /home/qw/jail\n\nDefault: off (the process is not confined).\nSet by: launch command line at server startup. Requires root to take effect; if the chroot fails it logs a warning and the server keeps running unconfined. Commonly combined with -u to drop to an unprivileged user afterwards.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_sys_unix.c:744. VALUE-flag confirmed at the consumer. Parse/recognize: sv_sys_unix.c:740 `j = COM_CheckParm (\"-t\");`. Consumer reads one trailing value: sv_sys_unix.c:741-742 `if (j && j + 1 < com_argc) { chroot_dir = com_argv[j + 1]; ...}` -- com_argv[j+1] read = takes one trailing value (a directory path). Effect (chroot): sv_sys_unix.c:743-747 `if (chroot(chroot_dir) < 0) Sys_Printf(\"chroot %s failed: %s\\n\", ...); else if (chdir(\"/\") < 0) Sys_Printf(\"chdir(\\\"/\\\") to %s failed ...\");` -- the chroot() call is the enforcing line (cited source_ref); on success it also chdir(\"/\") into the new root. OFF-state / default: the chroot only runs inside the `if (j && j + 1 < com_argc)` block, so absent flag = no chroot (process unconfined). 'Requires root' is a property of the chroot(2) syscall (non-root chroot fails EPERM and hits the `Sys_Printf(\"chroot ... failed\")` branch) -- stated as an operator consequence, not asserting an in-code privilege check. Ordering note: the function header comment sv_sys_unix.c:626-628 and the setuid comment at sv_sys_unix.c:751-752 (`can't setuid before chroot`) confirm chroot runs before the -u setuid -- the basis for the 'combine with -u' note. Scope/build: SV_System_Init (static, sv_sys_unix.c:629), called once at startup sv_sys_unix.c:774; Unix dedicated-server build. Windows server build (sv_sys_win.c) has NO -t (grep returns only -d). KTX: no CheckParm in ktx/src -- no override.",
  "description_proposed": null
}
```
