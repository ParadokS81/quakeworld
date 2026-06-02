# describe-fill-synthesis ledger -- mvdsv `unalias`

- **project:** mvdsv
- **knob:** `unalias` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:unalias: synthesized -- erases one named alias (case-insensitive), prints 'Unknown alias' on miss; console/rcon -- origin=synthesized ref=src/cmd.c:531 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Removes a single alias that was previously defined with the alias command. The alias name is matched case-insensitively. If no alias by that name exists, a message is printed and nothing is removed.
>
> unalias <alias> = erase the alias named <alias>.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| removes a single named alias | src/cmd.c:524,531 | `s = Cmd_Argv(1);` ... `if (!Cmd_DeleteAlias(s)) ...` | MATCH |
| takes exactly one argument (the alias name) | src/cmd.c:518-522 | `if (Cmd_Argc() != 2) { Con_Printf("unalias <alias>: erase an existing alias\n"); return; }` | MATCH |
| unknown alias => prints message, removes nothing | src/cmd.c:531-532 | `if (!Cmd_DeleteAlias(s)) Con_Printf("Unknown alias \"%s\"\n", s);` | MATCH |
| alias name matched case-insensitively | src/common.c:1707-1716 | `Com_HashKey`: `v += c &~ 32; // make it case insensitive` (alias hash/lookup keying) | MATCH |
| erases ONE alias only (vs unaliasall = all) | src/cmd.c:531 vs 536-554 | `Cmd_DeleteAlias(s)` (single) vs `Cmd_UnAliasAll_f` loops freeing every cmd_alias | MATCH |
| set by server console / rcon (not client) | src/cmd.c:1074 ; src/sv_user.c:3299 (ucmds[]) | `Cmd_AddCommand("unalias", Cmd_UnAlias_f)` ; grep "unalias" in ucmds[] => empty | MATCH |
| not on normal-rcon blocklist | src/sv_main.c:1754-1764 | blocklist tokens -- unalias absent | MATCH |
| no KTX override | ktx/src (grep) | grep "unalias" => empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Removes a SINGLE alias (not glob/all) | cmd.c:518; cmd.c:531; cmd.c:505 | `if (Cmd_Argc() != 2) {... return;}` (exactly one arg) -> `if (!Cmd_DeleteAlias(s))`; Cmd_DeleteAlias deletes one match then `return true;`. The all-variant is the separate `unaliasall`/`Cmd_UnAliasAll_f` (cmd.c:536, registered cmd.c:1073). | MATCH |
| 2 | Alias was previously defined with the `alias` command | cmd.c:393 / cmd.c:1070; cmd.c:446-451 | `Cmd_Alias_f` (registered `Cmd_AddCommand("alias",Cmd_Alias_f)`) builds the node and links into `cmd_alias`; `Cmd_DeleteAlias` walks that same `cmd_alias` list. | MATCH |
| 3 | Alias name matched case-INsensitively | cmd.c:476; cmd.c:494 | `if (!strcasecmp(a->name, name))` (both hash-table loop and linear-list loop in Cmd_DeleteAlias). | MATCH |
| 4 | If no alias by that name exists, a message is printed | cmd.c:531-532 | `if (!Cmd_DeleteAlias(s)) Con_Printf ("Unknown alias \"%s\"\n", s);` | MATCH |
| 5 | ...and nothing is removed (OFF-state) | cmd.c:488-489 | In Cmd_DeleteAlias, first (hash) loop ends with `a==NULL` on not-found; `if (!a) return false; // not found` returns BEFORE the linear-list unlink loop. Neither structure mutated. | MATCH |
| 6 | Set by: server console / rcon | cmd.c:706 + cmd.c:1074; cmd.c:933-942; sv_main.c:1754-1765 | `Cmd_AddCommand("unalias", Cmd_UnAlias_f)` -- plain registration, no access flag (Cmd_AddCommand sig is `(cmd_name, function)` only; MVDSV has no CF_ flags on server cmds). Server console runs it via Cmd_ExecuteString name lookup. Rcon: master rcon unconditional; normal/admin rcon blocklist ("normal rcon can't use these commands") = rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line -- `unalias` is NOT present, so admin rcon may run it. | MATCH |

**V-pass notes:** Independent cold V-pass over mvdsv @ 1.11-53-g18d0362 (confirmed via git describe). All six material clauses enforce-traced to located lines; every clause MATCHes.

Handler chain: `unalias` -> Cmd_UnAlias_f (cmd.c:514) -> Cmd_DeleteAlias (cmd.c:466). Followed the callee Cmd_DeleteAlias for the case-insensitivity, the not-found message, and the "nothing removed" OFF-state -- the gating logic for clauses 3/4/5 lives in the callee, not the caller, so the caller alone would not have been a valid enforcing read (per dropquad callee-follow lesson).

Clause 6 (access scope) is the one that required the most tracing and is the most likely flavour-C trap (an access-class clause inferred from a flag name). MVDSV does not use a CF_-flag access system on server commands; access is the server-console-always plus the rcon blocklist in SVC_RemoteCommand. I read the full blocklist (sv_main.c:1754-1765) and confirmed `unalias` is absent, so the "rcon" half of clause 6 is enforced-true (admin rcon is permitted; master rcon is unconditional). The blocklist loop checks token i>=2 with a single non-empty token before break (rcon packet = `rcon <pw> <cmd>`, command at token 2), so it is the actual command being gated -- correct read site. Server-console half enforced by the plain name lookup in Cmd_ExecuteString (cmd.c:933-942).

No client-side, QC, or config-file consumer of `unalias` exists in the tree (grep over src/*.c/*.h plus *.qc/*.txt/*.cfg/*.md returned only the cmd.c sites).

Non-defect FYIs (do not change classification): (a) the restated-form `unalias <alias> = erase the alias named <alias>` paraphrases the engine's own usage string `unalias <alias>: erase an existing alias` (cmd.c:520) -- consistent. (b) The description omits the MAX_ALIAS_NAME guard (cmd.c:525-528, prints "Alias name is too long" and returns) -- an edge-case omission, not a wrong clause; no asserted behavior is affected. Captured below as fyi.

## flags_for_review

- [fyi/other/vpass] Description does not mention the MAX_ALIAS_NAME length guard in Cmd_UnAlias_f (cmd.c:525-528): if the supplied name's strlen >= MAX_ALIAS_NAME, it prints 'Alias name is too long' and returns before attempting deletion. This is an unstated edge case, not a contradiction -- no asserted clause is wrong. Optional to add for completeness; does not affect the TRACED-CLEAN verdict.
- [fyi/other/vpass] Access-scope verification note (not a defect): MVDSV server commands carry no CF_-style access flag (unlike KTX). The only access gate beyond server-console is the normal/admin-rcon blocklist in SVC_RemoteCommand (sv_main.c:1754-1765). unalias is absent from that list, so admin rcon can run it. Any future MVDSV access-class clause must be traced to this blocklist, not to a flag name -- there is no flag to infer from.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "unalias",
  "type": "command",
  "description": "Removes a single alias that was previously defined with the alias command. The alias name is matched case-insensitively. If no alias by that name exists, a message is printed and nothing is removed.\n\nunalias <alias> = erase the alias named <alias>.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cmd.c:531. Handler Cmd_UnAlias_f (registered cmd.c:1074). Arg shape: cmd.c:518-522 `if (Cmd_Argc() != 2) { Con_Printf(\"unalias <alias>: erase an existing alias\\n\"); return; }` enforces exactly one alias-name argument. Name length guard cmd.c:525-529 `if (strlen(s) >= MAX_ALIAS_NAME) { Con_Printf(\"Alias name is too long\\n\"); return; }`. Core action cmd.c:531-532 `if (!Cmd_DeleteAlias(s)) Con_Printf(\"Unknown alias \\\"%s\\\"\\n\", s);` => deletes the named alias; on miss prints 'Unknown alias'. Case-insensitive match: Cmd_DeleteAlias unlinks the alias from cmd_alias / cmd_alias_hash; matched via strcasecmp in the alias list (alias names hash through Com_HashKey common.c:1714 which masks `c &~ 32` for case-insensitivity, and the delete-loop comparisons are case-insensitive). Erases ONE alias only (contrast unaliasall cmd.c:536 which clears the whole list). Access-class: registered via Cmd_AddCommand only (cmd.c:1074); grep of ucmds[] (sv_user.c:3299) for \"unalias\" returned empty => NOT client-issuable; NOT on the normal-rcon blocklist (sv_main.c:1754-1764) => server console / rcon. F-MV1: grep ktx/src for an unalias override returned empty => no KTX override. No Default line (action command, no no-arg default; usage line is the contract).",
  "description_proposed": null
}
```
