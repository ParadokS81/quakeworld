# describe-fill-synthesis ledger -- mvdsv `chmod`

- **project:** mvdsv
- **knob:** `chmod` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified WI2-FIX
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:chmod: synthesized -- POSIX chmod on a traversal-guarded relative path, 3-digit octal mode, non-Windows only; admin-only console/rcon; no KTX override -- origin=synthesized ref=src/sv_ccmds.c:740 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Changes the Unix file-permission bits of a file on the server (non-Windows servers only; the command is not registered on Windows).
>
> chmod <mode> <file> = set <file> to octal permission <mode>, e.g. `chmod 644 ktx/configs/match.cfg`. <mode> must be exactly three octal digits (0-7 each). The path is relative to the server's working directory; paths that are absolute (start with /) or contain `..` traversal are refused with "Unable to chmod".
>
> Set by: server console, or master rcon (master_rcon_password). The regular rcon password cannot run chmod.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| changes Unix file permission bits | src/sv_ccmds.c:740 | `if (chmod(filename, mode))` | MATCH |
| non-Windows only (not registered on Windows) | src/sv_ccmds.c:707 + 1852-1854 | `#ifndef _WIN32 void SV_ChmodFile_f(void)` ; `#ifndef _WIN32 Cmd_AddCommand("chmod", SV_ChmodFile_f); #endif` | MATCH |
| arg form `chmod <mode> <file>` | src/sv_ccmds.c:713-720 | `if (Cmd_Argc() != 3) { Con_Printf("chmod <mode> <file>\n"); return; } _mode = Cmd_Argv(1); filename = Cmd_Argv(2);` | MATCH |
| mode = exactly 3 octal digits (0-7) | src/sv_ccmds.c:723 + 729-738 | `strlen(_mode) != 3` (reject) ; `m = *_mode - '0'; if (m > 7) {...return;} mode = (mode << 3) + m;` | MATCH |
| refuse absolute / `..` traversal paths | src/sv_ccmds.c:722-728 | `if (!strncmp(filename, "../", 3) || strstr(filename, "/../") || *filename == '/' || ..."/.."...) { Con_Printf("Unable to chmod\n"); return; }` | MATCH |
| path is raw relative (no gamedir prefix) | src/sv_ccmds.c:740 | `chmod(filename, mode)` -- filename passed verbatim, no FS_* sandbox wrap | MATCH |
| access-class admin-only (console/rcon) | src/sv_ccmds.c:1853 + src/sv_user.c:3408-3424 | `Cmd_AddCommand("chmod", SV_ChmodFile_f);` ; not in ucmds[]; no fall-through | MATCH |
| no KTX override | ktx/src (grep) | grep 'chmod' ktx/src -> 0 hits | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: WI2-FIX**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| A | Non-Windows only; not registered on Windows | sv_ccmds.c:707,745 (handler guard) + sv_ccmds.c:1852-1854 (registration guard) | `#ifndef _WIN32 ... void SV_ChmodFile_f ... #endif` and `#ifndef _WIN32 / Cmd_AddCommand ("chmod", SV_ChmodFile_f); / #endif` | MATCH |
| B | Changes Unix file-permission bits of a file on the server | sv_ccmds.c:740 | `if (chmod(filename, mode))` (libc chmod on server-side path) | MATCH |
| C | Syntax `chmod <mode> <file>`; needs exactly 2 args | sv_ccmds.c:713-717 | `if (Cmd_Argc() != 3) { Con_Printf("chmod <mode> <file>\n"); return; }` | MATCH |
| D | `<mode>` sets octal permission, e.g. 644 | sv_ccmds.c:729-738 | `for (mode=0; *_mode; _mode++){ m=*_mode-'0'; ... mode=(mode<<3)+m; }` (base-8 accumulate) | MATCH |
| E | `<mode>` must be exactly three octal digits (0-7 each) | sv_ccmds.c:723 (`strlen(_mode)!=3`) + sv_ccmds.c:731-735 (`m=*_mode-'0'; if(m>7) reject`) | `strlen(_mode) != 3` AND `m = *_mode - '0'; if (m > 7){ ...return; }` -- m is unsigned so any char outside '0'..'7' (incl. '8','9',letters,'/',space) underflows/overflows >7 and is rejected | MATCH (verified by replicating the loop: only three chars each in 0-7 accepted) |
| F | Path is relative to the server's working directory | sv_ccmds.c:740 | `chmod(filename, mode)` -- raw Cmd_Argv(2) passed with NO fs_gamedir/com_gamedir prefix (contrast rm/ls also raw); resolves against process cwd | MATCH |
| G | Example `chmod 644 ktx/configs/match.cfg` is a valid invocation | sv_ccmds.c:722-724 (filter) | replicated filter: `ktx/configs/match.cfg` -> ALLOWED; `644` -> octal accept | MATCH |
| H | Absolute paths (start with /) are refused | sv_ccmds.c:723 | `*filename == '/'` -> `Con_Printf("Unable to chmod\n"); return;` | MATCH |
| I | Paths containing `..` traversal are refused | sv_ccmds.c:722-724 | `!strncmp(filename,"../",3) \|\| strstr(filename,"/../") \|\| ...!strncmp(filename+m-3,"/..",4)` -- rejects `../`-prefix, `/../`-mid, `/..`-suffix | MATCH (slash-anchored `..` components refused; see FYI flag re: bare `..` token) |
| J | Refusal message is "Unable to chmod" | sv_ccmds.c:726,734 | `Con_Printf("Unable to chmod\n");` (both the path/length gate and the bad-digit gate) | MATCH |
| K | Set by: server console / rcon | sv_ccmds.c:1853 (reg, plain Cmd_AddCommand, no CF_ flag) + sv_main.c:1747-1768 rcon command blacklist | `Cmd_AddCommand("chmod", SV_ChmodFile_f)`; BUT sv_main.c:1757 `!strcasecmp(tstr,"chmod")` sets `bad_cmd=true` -> `do_cmd=!bad_cmd` (1774) -> normal `rcon_password` rcon is REFUSED chmod. Reachable only via local console + master_rcon_password (1701-1707, unfiltered). | MISMATCH (imprecise: "rcon" overstates -- normal rcon blacklisted; only console + master-rcon) |

**V-pass notes:** Version confirmed 1.11-53-g18d0362. Handler SV_ChmodFile_f at sv_ccmds.c:708-744, registered sv_ccmds.c:1853, both #ifndef _WIN32. Single registration tree-wide; absent from client ucmds[] (sv_user.c) and from any PR2/QVM mod export -- so no client/stuffcmd path. Body of the description is fully TRACED-CLEAN: Windows scope (A), syntax (B,C), octal-mode semantics + the "exactly three octal digits, 0-7 each" precision (D,E -- replicated the validation loop: unsigned-int underflow means any non-0..7 char including '8','9',letters,'/',space,':' is rejected, so the claim is exactly right), cwd-relative path with no gamedir prefix (F), the worked example (G), absolute-path refusal (H), `..`-traversal refusal (I), and the "Unable to chmod" message (J) all map to located, verified enforcing lines incl. adjacent code.

The single defect is the access-class metadata line K = WI2-FIX. "Set by: server console / rcon" is the corpus-standard label for plain Cmd_AddCommand server commands, and it is correct for chmod's sibling commands (rm/ls/writeip/etc.) -- but chmod is one of the handful of commands explicitly listed in the NORMAL-rcon blacklist at sv_main.c:1754-1765. Trace: a packet authenticated with rcon_password (not master_rcon_password) takes the branch at sv_main.c:1708, tokenizes the expanded command, and at line 1757 `!strcasecmp(tstr,"chmod")` sets bad_cmd=true; line 1774 `do_cmd = !bad_cmd` then suppresses execution. So normal rcon CANNOT run chmod. It is reachable only from (1) the local server console and (2) master rcon (master_rcon_password, validated at 1701-1707 with no command filter). The generic label overstates rcon reachability -- the most common rcon (rcon_password) is denied. This is the WI-2 case "access-class clause where the real dispatch code is narrower than implied"; the sibling ledger for writeip (row 9) demonstrates the convention requires verifying blacklist-ABSENCE before applying this label, and chmod fails that test. Recommend tightening to note master-rcon-only (e.g. "Set by: server console, or master rcon (master_rcon_password); normal rcon (rcon_password) is blacklisted from running chmod").

Classified WI2-FIX rather than C-FIX because the clause is not binary-false (console + master-rcon genuinely do reach it) but is an imprecise access-class metadata claim; per the enum, a metadata/access-class line that is wrong/narrower-than-implied is WI2-FIX, reported separately and not counted as flavour-C.

## flags_for_review

- [fyi/other/synthesis] SV_ChmodFile_f passes the raw filename to chmod() relative to the server process CWD with only ../ /absolute guards -- there is no fs_gamedir prefix, so on a typical install the admin can chmod any file under the quake root (e.g. id1/, qw/), not just the active gamedir. This is consistent with the sibling bliP file commands (rm/ls/rmdir) but is broader than a gamedir-scoped operation; worth a human note that the 'sandbox' here is path-traversal prevention, not directory confinement.
- [review/cross-mod-override/vpass] Access-class imprecision (the WI2-FIX): proposed 'Set by: server console / rcon' overstates rcon reachability. chmod is in the normal-rcon command blacklist at sv_main.c:1757 (!strcasecmp(tstr,"chmod") -> bad_cmd=true -> do_cmd=false at 1774). It is reachable from the local console and from master rcon (master_rcon_password, unfiltered at 1701-1707), but a connection authenticated with the ordinary rcon_password is refused. Sibling blacklisted commands in the same arc (rm, rmdir, ls, localcommand, sv_admininfo, log*, sys_command_line, sv_crypt_rcon, sv_timestamplen) share this narrowing and likely carry the same imprecise 'server console / rcon' label -- worth a sweep.
- [fyi/suspected-bug/vpass] Latent traversal gap in the path filter (off-scope, FYI -- does not affect the description's correctness): the bare token `..` (two dots, no slash) and dotted-but-not-component forms like `..foo` / `foo..bar` / `a/..b` PASS the sv_ccmds.c:722-724 filter, because the checks are slash-anchored (`../` prefix, `/../` mid, `/..` suffix). A literal `chmod 000 ..` would chmod the server's parent-of-cwd directory. The description's phrasing 'contain .. traversal are refused' is accurate for the realistic directory-walking cases a reader would test, so this is not a description error -- but it is a real (minor) input-validation hole in mvdsv source. The identical filter is shared by SV_RemoveFile_f / SV_RemoveDirectory_f (sv_ccmds.c:545,612), so the gap is family-wide.
- [fyi/other/vpass] The `/..` suffix check uses `!strncmp(filename + m - 3, "/..", 4)` -- comparing 4 bytes against a 3-char literal "/.." whose 4th byte is the implicit NUL terminator. This is intentional/correct (it forces the match to be exactly the end of string, i.e. trailing `/..\0`), not an off-by-one bug; noted only because the `4` against a 3-char literal looks suspicious at a glance.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "chmod",
  "type": "command",
  "description": "Changes the Unix file-permission bits of a file on the server (non-Windows servers only; the command is not registered on Windows).\n\nchmod <mode> <file> = set <file> to octal permission <mode>, e.g. `chmod 644 ktx/configs/match.cfg`. <mode> must be exactly three octal digits (0-7 each). The path is relative to the server's working directory; paths that are absolute (start with /) or contain `..` traversal are refused with \"Unable to chmod\".\n\nSet by: server console, or master rcon (master_rcon_password). The regular rcon password cannot run chmod.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:740. Handler SV_ChmodFile_f (src/sv_ccmds.c:708) is compiled only `#ifndef _WIN32` (sv_ccmds.c:707) and registered only `#ifndef _WIN32` (sv_ccmds.c:1852-1854) -- hence the non-Windows-only clause. Arg form: requires exactly 3 args else prints 'chmod <mode> <file>' (sv_ccmds.c:713-717); _mode=Cmd_Argv(1), filename=Cmd_Argv(2) (sv_ccmds.c:719-720). Path restriction clause: rejects (prints 'Unable to chmod', returns) when filename starts with '../', or contains '/../', or starts with '/', or strlen(_mode)!=3, or ends with '/..' (sv_ccmds.c:722-728). So mode must be exactly 3 chars AND absolute/traversal paths are refused. Octal-mode clause: loop builds `mode = (mode<<3)+m` over each digit, rejecting any digit m>7 (sv_ccmds.c:729-738) -> base-8, each digit 0-7. Effect clause: `chmod(filename, mode)` (POSIX) called directly with the raw relative filename (sv_ccmds.c:740); success/failure printed (sv_ccmds.c:741-743). NOTE on path resolution: the call passes `filename` verbatim with no fs_gamedir prefix, so resolution is against the server process CWD (typical mvdsv CWD is the install/quake root), NOT an explicit gamedir sandbox -- I documented it as 'relative to the server's working directory' rather than asserting 'gamedir' which the code does not enforce. ACCESS-CLASS: registered via Cmd_AddCommand only (sv_ccmds.c:1853); NOT in ucmds[] (grep of sv_user.c confirmed) -> admin-only console/rcon (SV_ExecuteUserCommand no fall-through, sv_user.c:3408-3424). F-MV1: grep ktx/src for chmod -> 0 hits, no KTX override.",
  "description_proposed": null
}
```
