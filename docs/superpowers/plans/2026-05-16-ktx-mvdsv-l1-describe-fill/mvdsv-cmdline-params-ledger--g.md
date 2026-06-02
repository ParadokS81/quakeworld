# describe-fill-synthesis ledger -- mvdsv `-g`

- **project:** mvdsv
- **knob:** `-g` (cmdline_param)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `cmdline-params` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:-g: synthesized -- value flag (one group arg, name or gid), Unix builds only; setgid() the server process to that group at startup, warns + continues on failure -- origin=synthesized ref=src/sv_sys_unix.c:686 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Linux/Unix server builds only. Switches the running server process to a different system group at startup, so it runs under that group's permissions instead of the one it was launched with. The group may be given as a group name or a numeric group ID. If the named group does not exist, or the switch fails, the server logs a warning and keeps running under its original group.
>
> -g <group> = run under system group <group> (name or numeric gid).
>
> Default: none (keeps the launching group).
> Set by: launch flag (takes one group argument; Unix builds only).
>
> Example: mvdsv -g quakesrv

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| Unix build only | src/sv_sys_unix.c:626-628 | `// Daemon, chroot, setgid and setuid code (-d, -t, -g, -u)` in SV_System_Init (unix file) | MATCH |
| recognized + requires following arg | src/sv_sys_unix.c:668-669 | `j = COM_CheckParm ("-g"); if (j && j + 1 < com_argc)` | MATCH |
| takes ONE trailing value (group) | src/sv_sys_unix.c:672 | `group_name = com_argv[j + 1];` | MATCH |
| accepts numeric gid | src/sv_sys_unix.c:673-674 | `if (only_digits(group_name)) group_id = Q_atoi(group_name);` | MATCH |
| accepts group name (resolved via getgrnam) | src/sv_sys_unix.c:677-683 | `if (!(gr = getgrnam(group_name))) { ...WARNING... } else group_id = gr->gr_gid;` | MATCH |
| changes process group (the effect) | src/sv_sys_unix.c:686 | `if (setgid(group_id) < 0)` | MATCH |
| unknown group -> warn, continue under original group | src/sv_sys_unix.c:679-680 | `Sys_Printf("WARNING: group \"%s\" unknown\n", group_name); ind = false;` (no exit) | MATCH |
| setgid failure -> warn, continue | src/sv_sys_unix.c:687-688 | `Sys_Printf("WARNING: Can't setgid to group \"%s\": %s\n", ...)` (no exit) | MATCH |
| default/absent = no group change | src/sv_sys_unix.c:669 | block gated on `if (j && ...)`; skipped when absent | MATCH |
| F-MV1 no KTX override | ktx/src | grep COM_CheckParm = 0 hits | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Linux/Unix server builds only | CMakeLists.txt:84-103 | `if(UNIX) list(APPEND SRC_COMMON ".../sv_sys_unix.c") ... else() ... sv_sys_win.c` | MATCH |
| 1b | (scope corroboration) Windows build has no -g/setgid/group code | sv_sys_win.c (grep) | grep for setgid/group/getgrnam/"-g" => exit 1 (no hits) | MATCH |
| 2 | Switches process to a different system group at startup | sv_sys_unix.c:686 + :774 | `if (setgid(group_id) < 0)` ; `SV_System_Init(); // daemonize and so...` called in main() before Host_Init | MATCH |
| 3 | Runs under that group's permissions instead of the launching one | sv_sys_unix.c:686 | `setgid(group_id)` changes process gid; absent a successful setgid the inherited (launching) gid persists; no other unconditional default-gid assignment | MATCH |
| 4 | Group given as a name OR numeric gid | sv_sys_unix.c:673-683 | `if (only_digits(group_name)) group_id = Q_atoi(group_name); else { if(!(gr=getgrnam(group_name))) ... else group_id = gr->gr_gid; }` | MATCH |
| 4b | only_digits => all-digit detection | sv_sys_unix.c:613-624 | returns 0 on empty or any non-`isdigit` char, else 1 | MATCH |
| 5 | Named group does not exist => logs warning, keeps running | sv_sys_unix.c:677-680 | `if (!(gr = getgrnam(group_name))) { Sys_Printf("WARNING: group \"%s\" unknown\n", group_name); ind = false; }` (setgid then skipped; main continues) | MATCH |
| 6 | The switch fails => logs warning, keeps running | sv_sys_unix.c:686-688 | `if (setgid(group_id) < 0) Sys_Printf("WARNING: Can't setgid to group \"%s\": %s\n", ...)` ; Sys_Printf does not exit | MATCH |
| 6b | "keeps running" (no exit on failure) | sv_sys_unix.c Sys_Printf body | Sys_Printf only writes stdout/console, returns; SV_System_Init returns; main() proceeds to Host_Init | MATCH |
| 7 | Usage line: -g <group> = run under system group (name or numeric gid) | sv_sys_unix.c:668-688 | restatement of clauses 4-6 | MATCH |
| 8 | Default: none (keeps the launching group) | common.c:816-826 + sv_sys_unix.c:668-669 | `COM_CheckParm` returns 0 when parm absent; `j = COM_CheckParm("-g"); if (j && j+1 < com_argc)` => block skipped when absent, no setgid, inherited gid retained. Not a registered cvar. | MATCH |
| 9 | Set by launch flag; takes one group argument | sv_sys_unix.c:669,672 | `if (j && j + 1 < com_argc)` requires a following token; `group_name = com_argv[j + 1]` | MATCH |
| 10 | Example: mvdsv -g quakesrv | sv_sys_unix.c:677 | name-path invocation routed through getgrnam; plausible, consistent | MATCH |

**V-pass notes:** Single registration + enforcement site: src/sv_sys_unix.c:667-689 (the `// setgid` block inside SV_System_Init). No other use-site of `-g` in the tree (only `"-g"` literal hit is sv_sys_unix.c:668). Not a registered cvar/command. SV_System_Init is called from main() at sv_sys_unix.c:774 before Host_Init -> "at startup" verified. Scope ("Unix builds only") verified two ways: the file is compiled only under CMakeLists `if(UNIX)`, and sv_sys_win.c has zero -g/setgid/group code.

All ten material clauses map to a located, verified enforcing line including adjacent context. The OFF-state ("keeps running under its original group") is correct by OS semantics + confirmed no-exit-on-warning (Sys_Printf returns; main proceeds).

Precision check that PASSED (not a defect): the numeric-gid path (only_digits => Q_atoi => setgid) has NO existence check (no getgrgid). A non-existent NUMERIC gid therefore yields only the generic "Can't setgid" failure, never the "unknown" warning. The description scopes the "unknown" warning specifically to a "named group" and routes the numeric case under "or the switch fails" -- this two-branch framing exactly matches the code, so there is no imprecision to downgrade for. Classification stands at TRACED-CLEAN.

## flags_for_review

- [fyi/hidden-family/synthesis] Sibling single-letter Unix process-control flags found in the same SV_System_Init block but NOT in this chunk's set: -u (setuid, parse sv_sys_unix.c:693, com_argv[j+1] value-read at :697, setuid at :740-ish) and -t (chroot, referenced in the block comment at :627-628). Both are value flags in the same bind-derived daemon/chroot/setuid stanza. Flagging for coverage in case they are not separately scheduled.
- [fyi/other/vpass] The -g numeric-gid path passes the value straight to setgid() with no validity/existence check (no getgrgid). This is faithfully reflected in the proposed description and is standard for the bind-derived code, so it is not a description defect -- noting it only as an FYI on engine behavior: an invalid numeric gid is silently routed to the generic 'Can't setgid' warning rather than an 'unknown group' warning.
- [fyi/other/vpass] Adjacent -u (setuid) block at sv_sys_unix.c:725-731 sets group_id from pw->pw_gid and calls setgid ONLY `if (!group_name)` -- i.e. it does not override a -g-supplied group. This is consistent with (and reinforces) the description scoping the group selection strictly to -g; no contradiction. FYI for cross-flag interaction only.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: -nohwtimer=C-FIX, -heapsize=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "-g",
  "type": "cmdline_param",
  "description": "Linux/Unix server builds only. Switches the running server process to a different system group at startup, so it runs under that group's permissions instead of the one it was launched with. The group may be given as a group name or a numeric group ID. If the named group does not exist, or the switch fails, the server logs a warning and keeps running under its original group.\n\n-g <group> = run under system group <group> (name or numeric gid).\n\nDefault: none (keeps the launching group).\nSet by: launch flag (takes one group argument; Unix builds only).\n\nExample: mvdsv -g quakesrv",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_sys_unix.c:686. Value flag, UNIX dedicated-server build ONLY (sv_sys_unix.c, SV_System_Init; block comment sv_sys_unix.c:626-628 `// Daemon, chroot, setgid and setuid code (-d, -t, -g, -u) was copied from bind`). Parse: src/sv_sys_unix.c:668 `j = COM_CheckParm (\"-g\");` then sv_sys_unix.c:669 `if (j && j + 1 < com_argc)` requires a following arg. Value-read: src/sv_sys_unix.c:672 `group_name = com_argv[j + 1];` reads ONE trailing value (TRAP-2 consumer confirmed). Name-or-gid: sv_sys_unix.c:673-674 `if (only_digits(group_name)) group_id = Q_atoi(group_name);` (numeric path) else sv_sys_unix.c:677 `if (!(gr = getgrnam(group_name)))` resolves a group name via getgrnam. Effect: sv_sys_unix.c:686 `if (setgid(group_id) < 0)` calls setgid() to change the process group. Failure handling: unknown group sets ind=false with WARNING (sv_sys_unix.c:679-680); setgid failure logs WARNING (sv_sys_unix.c:687-688) -- process continues either way (no exit), so it keeps its original group on failure. Default/absent: block skipped, no group change. F-MV1: KTX has zero COM_CheckParm references -- no override. NOTE: source_ref points at the setgid() enforcing line (sv_sys_unix.c:686), not the parse site, per the read-use-site rule.",
  "description_proposed": null
}
```
