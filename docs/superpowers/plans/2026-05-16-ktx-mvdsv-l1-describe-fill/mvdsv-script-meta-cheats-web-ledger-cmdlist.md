# describe-fill-synthesis ledger -- mvdsv `cmdlist`

- **project:** mvdsv
- **knob:** `cmdlist` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:cmdlist: synthesized -- lists all command names sorted; optional glob pattern; console/rcon -- origin=synthesized ref=src/cmd.c:806 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Prints the names of every console command the server knows, sorted alphabetically. An optional name pattern filters the list (supports * and ? wildcards, case-insensitive); without one, every command is shown.
>
> cmdlist = list all commands.
> cmdlist <pattern> = list only commands whose name matches the wildcard pattern (e.g. cmdlist sv_*).
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| lists command names, sorted alphabetically | src/cmd.c:797,765 | `qsort(sorted_cmds, num_cmds, sizeof(cmd_function_t *), Cmd_CommandCompare)` ; comparator `return strcmp((*p1)->name, (*p2)->name)` | MATCH |
| prints the NAME only (no value column) | src/cmd.c:806 | `Con_Printf("%s\n", cmd->name)` | MATCH |
| optional pattern arg filters the list | src/cmd.c:777,802 | `pattern = (Cmd_Argc() > 1) ? Cmd_Argv(1) : NULL` ; `if (pattern && !Q_glob_match(pattern, cmd->name)) continue` | MATCH |
| pattern supports * and ?, case-insensitive | src/common.c:1681-1692 | `case '?'` / `case '*': return Q_glob_match_after_star` / `default: if (tolower(c) != tolower(*text++))` | MATCH |
| set by server console / rcon (not client) | src/cmd.c:1072 ; src/sv_user.c:3299 (ucmds[]) | `Cmd_AddCommand("cmdlist", Cmd_CmdList_f)` ; grep "cmdlist" in ucmds[] => empty | MATCH |
| not on normal-rcon blocklist | src/sv_main.c:1754-1764 | blocklist tokens -- cmdlist absent | MATCH |
| no KTX override | ktx/src (grep) | grep "cmdlist" => empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Prints the names of every console command the server knows (commands only, not cvars/aliases) | cmd.c:779,794 (iter) + cmd.c:568 (decl) + cmd.c:806 (print) | `for (cmd = cmd_functions; cmd; cmd = cmd->next)` ; `static cmd_function_t *cmd_functions; // possible commands to execute` ; `Con_Printf ("%s\n", cmd->name);` | MATCH |
| 2 | Sorted alphabetically | cmd.c:797 + cmd.c:763-765 | `qsort(sorted_cmds, num_cmds, sizeof(cmd_function_t *), Cmd_CommandCompare);` ; `return strcmp ((*((cmd_function_t **) p1))->name, (*((cmd_function_t **) p2))->name);` | MATCH (strcmp = ASCII-lexicographic; coincides with alphabetical for the lowercase ASCII command set -- still-true minor simplification) |
| 3 | Optional name pattern filters the list | cmd.c:777 + cmd.c:802 | `pattern = (Cmd_Argc() > 1) ? Cmd_Argv(1) : NULL;` ; `if (pattern && !Q_glob_match(pattern, cmd->name)) { continue; }` | MATCH |
| 4 | Supports `*` and `?` wildcards | common.c:1681-1690 | `case '?': if (*text++ == '\0') return false;` ... `case '*': return Q_glob_match_after_star (pattern, text);` (+ doc comment 1666-1668: "`*' matches any sequence of characters, `?' matches any character") | MATCH |
| 5 | Case-insensitive matching | common.c:1692 (default), 1686 (escape), 1651 (after-star) | `default: if (tolower (c) != tolower (*text++)) return false;` ; `if (tolower (*pattern++) != tolower (*text++))` ; `if (tolower(*t) == c1 && Q_glob_match (p - 1, t))` | MATCH |
| 6 | Without a pattern, every command is shown | cmd.c:777 + cmd.c:802 | `pattern = ... : NULL;` -> when NULL, `if (pattern && ...)` short-circuits false, no `continue`, all printed | MATCH |
| 7 | `cmdlist <pattern>` lists only commands whose name matches the wildcard pattern | cmd.c:802-807 | `if (pattern && !Q_glob_match(pattern, cmd->name)) { continue; } Con_Printf ("%s\n", cmd->name); pattern_matched++;` | MATCH |
| 8 | Set by: server console / rcon | cmd.c:706 (no-flag reg) + cmd.c:1072 (reg) + cmd.c:240 (console buf->dispatch) + cmd.c:916/933-941 (dispatch, no access check) + sv_main.c:1828 (rcon->dispatch) + sv_main.c:1747-1770 (normal-rcon blocklist, cmdlist ABSENT) | `Cmd_AddCommand ("cmdlist", Cmd_CmdList_f);` (no CF flag arg) ; `Cmd_ExecuteString (line);` (Cbuf) ; `Cmd_ExecuteString(str);` (rcon) ; blocklist = rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line -- no cmdlist | MATCH |

**V-pass notes:** Single registration site (cmd.c:1072 -> Cmd_CmdList_f at cmd.c:768). Every clause enforce-traces to a located line; the high-risk clauses (case-insensitivity, wildcards) were verified by FOLLOWING the Q_glob_match callee in common.c, not inferred from the command name or a comment. case-insensitivity is enforced by tolower() on both sides in all three match arms (default/escape/after-star); `*` and `?` are enforced by explicit switch cases; sets `[]` are NOT supported (matches the description's silence on them). The pattern-present/absent branch (cmd.c:777,802) enforces both the "all shown without pattern" and "filtered with pattern" clauses.

Access clause verified against dispatch code per WI-2: MVDSV's Cmd_AddCommand takes NO access-flag argument (there is no per-command CF_ flag system on these console commands, unlike KTX), so dispatch is uniform via Cmd_ExecuteString -- reached from the command buffer (server console / dedicated stdin, cmd.c:240) AND from the rcon handler (sv_main.c:1828). cmdlist is NOT in the normal-rcon blocklist (sv_main.c:1754-1765), so both master-rcon and normal/admin-rcon can run it. "Server console / rcon" is the accurate user-facing access model.

One still-true minor simplification (not a defect): clause 2 "sorted alphabetically" is implemented as strcmp (case-sensitive ASCII byte order). For MVDSV's lowercase-ASCII command names this presents identically to alphabetical; traceable and not misleading, so TRACED-CLEAN rather than C-NEAR-MISS.

Sibling cvarlist (cvar.c:351+) shares the exact same Q_glob_match filter and footer shape but iterates cvar_vars -- confirms cmdlist's "commands only" scope (clause 1) is precise: it lists neither cvars nor aliases.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "cmdlist",
  "type": "command",
  "description": "Prints the names of every console command the server knows, sorted alphabetically. An optional name pattern filters the list (supports * and ? wildcards, case-insensitive); without one, every command is shown.\n\ncmdlist = list all commands.\ncmdlist <pattern> = list only commands whose name matches the wildcard pattern (e.g. cmdlist sv_*).\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cmd.c:806. Handler Cmd_CmdList_f (registered cmd.c:1072). WHAT/sorted: cmd.c:797 qsort(sorted_cmds,...,Cmd_CommandCompare) where comparator cmd.c:765 strcmp(name,name) => alphabetical by name. Print line cmd.c:806 `Con_Printf(\"%s\\n\", cmd->name)` enforces: command NAME only (no flag/value column, unlike cvarlist). Optional pattern: cmd.c:777 `pattern = (Cmd_Argc()>1) ? Cmd_Argv(1) : NULL`; cmd.c:802 `if (pattern && !Q_glob_match(pattern, cmd->name)) continue` enforces the filter. Glob semantics verified common.c:1673-1697 (same Q_glob_match: '?'/'*' wildcards, tolower case-insensitive). Access-class: registered via Cmd_AddCommand only (cmd.c:1072); grep of ucmds[] (sv_user.c:3299) for \"cmdlist\" returned empty => NOT client-issuable; NOT on the normal-rcon blocklist (sv_main.c:1754-1764) => server console / rcon. F-MV1: grep ktx/src for a cmdlist override returned empty => no KTX override. Per reference_c3_cmdlist_blind_ktx_commands this cmdlist enumerates the engine cmd_functions list only and cannot see KTX's cmd_t cmds[] -- but that is a coverage caveat for downstream liveness use, not a behavior of the command's own output, so it is NOT asserted in the user-facing description. No Default line per D20 (no-arg lists all; optional arg documented via usage forms).",
  "description_proposed": null
}
```
