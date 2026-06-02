# describe-fill-synthesis ledger -- mvdsv `-u`

- **project:** mvdsv
- **knob:** `-u` (cmdline_param)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `cmdline-params` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:-u: synthesized -- Unix-only value flag; resolves a user/uid and setuid()s the server process after chroot, off when absent; no KTX override -- origin=synthesized ref=src/sv_sys_unix.c:755 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Linux/Unix dedicated server only. Early in startup -- before the server initializes its network, reads server.cfg, or loads a map -- drops the server process to a different operating-system user, and keeps it dropped for the life of the process. Takes one value: the target user, given either as a username or as a numeric user id.
>
> mvdsv -u qwserver   = run the server process as OS user 'qwserver'
> mvdsv -u 1001       = run the server process as the user with uid 1001
>
> Default: off (the process keeps the user it was launched as).
> Set by: launch command line at server startup. Used to launch as root but run the server itself under an unprivileged account; commonly combined with -t (chroot) and -g (group).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| recognized as a launch flag | src/sv_sys_unix.c:693 | `j = COM_CheckParm ("-u");` | MATCH |
| takes one trailing value | src/sv_sys_unix.c:694-696 | `if (j && j + 1 < com_argc) { ... user_name = com_argv[j + 1]; }` | MATCH |
| all-digit value = numeric uid | src/sv_sys_unix.c:697-700 | `j = only_digits(user_name); if (j) { user_id = Q_atoi(user_name); pw = getpwuid(user_id); }` | MATCH |
| non-digit value = username lookup | src/sv_sys_unix.c:704 | `if (!(pw = getpwnam(user_name)))` | MATCH |
| effect = setuid (drop process user) | src/sv_sys_unix.c:753-755 | `if (ind) { if (setuid(user_id) < 0) Sys_Printf("WARNING: Can't setuid ..."); }` | MATCH |
| OFF-state default = no setuid when absent | src/sv_sys_unix.c:692 | `ind = false;` (set true only when -u supplies a value) | MATCH |
| applies after chroot | src/sv_sys_unix.c:751-752 | `// setuid - we can't setuid before chroot ...` | MATCH |
| Unix dedicated build only | src/sv_sys_unix.c:629,774 | `static void SV_System_Init(void)` ... `SV_System_Init();` (sv_sys_win.c lacks -u) | MATCH |
| no KTX override | ktx/src grep | no CheckParm in ktx/src | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Scope: Linux/Unix dedicated server only | src/sv_sys_unix.c:693 (only handler) + build/CMakeFiles/mvdsv.dir/link.txt:1 (links sv_sys_unix.c.o into Linux binary); src/sv_sys_win.c has NO `-u`/setuid | `j = COM_CheckParm ("-u");` | MATCH |
| 2 | Drops process privileges to run as a different OS user | src/sv_sys_unix.c:755 | `if (setuid(user_id) < 0)` | MATCH (mechanism correct) |
| 3 | Takes one value: a username OR a numeric uid | src/sv_sys_unix.c:697-698, 701-702, 706 | L697 `user_name = com_argv[j + 1];` L698 `j = only_digits(user_name);` L701-702 `user_id = Q_atoi(user_name); pw = getpwuid(user_id);` L706 `if (!(pw = getpwnam(user_name)))` | MATCH (numeric path getpwuid; name path getpwnam; numeric also falls back to name if uid unknown) |
| 4 | TIMING: "After the server has started up, drops its process privileges" | src/sv_sys_unix.c:774-775 (main ordering): setuid in SV_System_Init runs BEFORE Host_Init (the actual startup: NET_Init/SV_Init/exec server.cfg/SV_Map) | `SV_System_Init(); // daemonize and so...` then `Host_Init(argc, argv, DEFAULT_MEM_SIZE);` | MISMATCH (drop happens in a pre-init phase BEFORE startup, not after) |
| 5 | Default: off; process keeps the user it was launched as | src/sv_sys_unix.c:692-694, 753 | L692 `ind = false;` L694 `if (j && j + 1 < com_argc)` L753 `if (ind)` gates the setuid | MATCH (absent `-u` => ind stays false => no setuid) |
| 6 | Set by: launch command line at server startup | src/sv_sys_unix.c:693 | `j = COM_CheckParm ("-u");` | MATCH (cmdline parm; "at startup" loosely true, mechanically pre-startup) |
| 7 | RATIONALE: "paired with starting as root so it can bind a privileged port, then drop down to an unprivileged account" | src/net.c:1264/1301/1181 (NET_Init -> NET_InitServer -> UDP_OpenSocket -> bind) is called INSIDE Host_Init (sv_main.c:3970), i.e. AFTER the setuid at sv_sys_unix.c:755 | `if (bind (newsocket, ...) == -1)` (net.c:1181) reached via NET_Init at sv_main.c:3970, which is in Host_Init at main.c:775 — after setuid at main.c:774 | MISMATCH (the bind runs AFTER the drop; `-u` cannot enable root-bind-then-drop) |

**V-pass notes:** CLASSIFICATION: C-FIX. The mechanism (drop privileges to a target user given as name or uid; Linux/Unix-only; default off) is correct and fully enforcement-traced. But the description's central TIMING/SIDE-EFFECT framing is reversed vs the code's actual call ordering, and this is a contradiction (not vagueness), so the row is C-FIX, not C-NEAR-MISS.

THE DEFECT (clauses 4 + 7, same root cause — inverted ordering):
- The setuid lives in SV_System_Init() (src/sv_sys_unix.c:629-759, single setuid at line 755). main() (src/sv_sys_unix.c:766) calls SV_System_Init() at line 774, THEN Host_Init() at line 775.
- Host_Init() (src/sv_main.c:3951) is the actual server startup: it runs NET_Init() at line 3970 (binds the UDP listen socket via NET_InitServer -> UDP_OpenSocket -> bind, net.c:1181), SV_Init() at 3977, `exec server.cfg` at 4001, and SV_Map() at 4009.
- Therefore privileges are dropped BEFORE the server starts up, not after. The proposed text "After the server has started up, drops its process privileges" inverts this. The function's own comment (line 626-627, "Init unix related stuff... copied from bind") and main()'s comment ("// daemonize and so...") confirm this is a pre-init environment-setup phase.
- Clause 7 is the same inversion stated as rationale: "start as root so it can bind a privileged port, then drop." Because the bind() runs INSIDE Host_Init (after the setuid), the `-u` drop precedes the bind — so `-u` does NOT enable a bind-privileged-port-as-root-then-drop pattern; the socket bind already runs as the dropped (unprivileged) user. (Side note: QW's default server port is 27500, non-privileged, so even the premise rarely applies; but the mechanical ordering claim is wrong regardless of port number.) This is a clause that was inferred from the general Unix idiom for setuid/privileged ports, not traced to MVDSV's actual init sequence — the exact flavour-C failure mode, here landing as an outright contradiction.

WHAT IS CORRECT (do not re-litigate on re-synth):
- Scope, the setuid mechanism, the name-or-uid value parsing, and default-off are all traced and MATCH.
- Minor enrichment available for a re-synth: the numeric path is not pure-uid — if `-u 1001` resolves to an unknown uid, line 704-710 prints a warning but STILL attempts setuid(1001) (ind stays true). The example `mvdsv -u 1001` is fine as written for a user-doc.

RE-SYNTH GUIDANCE (seed): replace the "after startup / bind privileged port then drop" framing. Accurate framing: `-u` drops privileges during the server's early Unix init (SV_System_Init), which runs BEFORE the network socket is bound and before server.cfg/map load. It is companion to `-g` (setgid), `-t` (chroot), `-d` (daemonize) in the same pre-init block. The drop is permanent for the process lifetime (single setuid, no restore).

## flags_for_review

- [review/contradiction/vpass] The proposed description's privileged-port rationale is doubly off for MVDSV: not only does the setuid (sv_sys_unix.c:755) run before the bind (net.c:1181 via Host_Init at sv_main.c:3970), but QuakeWorld's default server port is 27500 (non-privileged), so the 'bind a privileged port as root' premise rarely applies in practice. The -g/-t/-u/-d block was copied verbatim from bind (DNS server) sources per the comment at sv_sys_unix.c:627-628, where the root-then-drop idiom is genuine; it was transplanted into MVDSV whose ordering and default port make it inapplicable.
- [fyi/other/vpass] Ordering nuance worth preserving: -u's setuid is deferred to line 753-758 (AFTER the chroot at line 740-749), per the comment at lines 751-752 ('we can't setuid before chroot and can't resolve uid/gid from user/group names after chroot'). Name/uid resolution (getpwnam/getpwuid) happens earlier at lines 691-737, before chroot. This is correct and clean; flagging only so a re-synth does not accidentally claim the drop happens at the very start of SV_System_Init — it is the last step of that function, but still entirely before Host_Init.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: -nohwtimer=C-FIX, -heapsize=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "-u",
  "type": "cmdline_param",
  "description": "Linux/Unix dedicated server only. Early in startup -- before the server initializes its network, reads server.cfg, or loads a map -- drops the server process to a different operating-system user, and keeps it dropped for the life of the process. Takes one value: the target user, given either as a username or as a numeric user id.\n\nmvdsv -u qwserver   = run the server process as OS user 'qwserver'\nmvdsv -u 1001       = run the server process as the user with uid 1001\n\nDefault: off (the process keeps the user it was launched as).\nSet by: launch command line at server startup. Used to launch as root but run the server itself under an unprivileged account; commonly combined with -t (chroot) and -g (group).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_sys_unix.c:755. VALUE-flag confirmed at the consumer. Parse/recognize: sv_sys_unix.c:693 `j = COM_CheckParm (\"-u\");`. Consumer reads one trailing value: sv_sys_unix.c:694-696 `if (j && j + 1 < com_argc) { ind = true; user_name = com_argv[j + 1]; ...}` -- com_argv[j+1] read = takes one trailing value. Value semantics (username OR numeric uid): sv_sys_unix.c:697-700 `j = only_digits(user_name); if (j) { user_id = Q_atoi(user_name); pw = getpwuid(user_id); }` and the else-path at sv_sys_unix.c:704 `if (!(pw = getpwnam(user_name)))` -- so an all-digit value is treated as a uid (getpwuid), otherwise as a username (getpwnam). only_digits is defined sv_sys_unix.c:614. Effect (privilege drop): sv_sys_unix.c:753-755 `if (ind) { if (setuid(user_id) < 0) Sys_Printf(\"WARNING: Can't setuid to user ...\"); }` -- the actual setuid() is the enforcing line; cited as source_ref. OFF-state / default: `ind` is initialized false at sv_sys_unix.c:692 `ind = false;` immediately before the -u check and only set true when -u supplies a value, so absent flag = no setuid (process keeps its launched user). Ordering side-effect verified: the enclosing comment sv_sys_unix.c:751-752 `// setuid - we can't setuid before chroot and // can't resolve uid/gid from user/group names after chroot` confirms the setuid runs AFTER chroot but resolution runs before -- consistent with the two-phase split (resolve at :693, apply at :755). Scope/build: lives in SV_System_Init (static, sv_sys_unix.c:629), called once at startup sv_sys_unix.c:774 `SV_System_Init();`; file is the Unix dedicated-server build. Confirmed Windows-server-only build (sv_sys_win.c) has NO -u (grep returns only -d). Function header comment sv_sys_unix.c:626-628 states the -d/-t/-g/-u code was copied from bind (DNS server) sources. KTX: no CheckParm in ktx/src -- no override.",
  "description_proposed": null
}
```
