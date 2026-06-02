# describe-fill-synthesis ledger -- mvdsv `cvarlist`

- **project:** mvdsv
- **knob:** `cvarlist` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:cvarlist: synthesized -- lists all cvars sorted with values + serverinfo 's' flag; optional glob pattern; console/rcon -- origin=synthesized ref=src/cvar.c:386 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Prints every cvar the server knows, sorted alphabetically, each with its current value. An optional name pattern filters the list (supports * and ? wildcards, case-insensitive); without one, the full list is shown. A leading 's' next to a cvar marks it as mirrored into the server info (visible to connecting clients). cvardump is an exact alias of this command.
>
> cvarlist = list all cvars.
> cvarlist <pattern> = list only cvars whose name matches the wildcard pattern (e.g. cvarlist sv_*).
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| lists all cvars, sorted alphabetically | src/cvar.c:377,345 | `qsort(sorted_cvars, num_cvars, sizeof(cvar_t *), Cvar_CvarCompare)` ; comparator `return strcmp((*p1)->name, (*p2)->name)` | MATCH |
| each printed with its current value | src/cvar.c:386 | `Con_Printf("%c %s %s\n", ..., var->name, var->string)` | MATCH |
| 's' prefix = mirrored to server info | src/cvar.c:386 + src/cvar.h:62 | `var->flags & CVAR_SERVERINFO ? 's' : ' '` ; `#define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo` | MATCH |
| optional pattern arg filters the list | src/cvar.c:357,382 | `pattern = (Cmd_Argc() > 1) ? Cmd_Argv(1) : NULL` ; `if (pattern && !Q_glob_match(pattern, var->name)) continue` | MATCH |
| pattern supports * and ?, case-insensitive | src/common.c:1681-1692 | `case '?'` / `case '*': return Q_glob_match_after_star` / `default: if (tolower(c) != tolower(*text++))` | MATCH |
| set by server console / rcon (not client) | src/cvar.c:564 ; src/sv_user.c:3299 (ucmds[]) | `Cmd_AddCommand("cvarlist", Cvar_CvarList_f)` ; grep "cvarlist"/"cvardump" in ucmds[] => empty | MATCH |
| not on normal-rcon blocklist | src/sv_main.c:1754-1764 | blocklist tokens rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/... -- cvarlist absent | MATCH |
| no KTX override | ktx/src (grep) | grep "cvarlist"/"cvardump" => empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | Prints every cvar the server knows | cvar.c:359 (head set at :263 Cvar_Register / :409 Cvar_Create) | `for (var = cvar_vars; var; var = var->next) { num_cvars++; }` -- iterates the global registry head onto which all cvar registration prepends | MATCH |
| 2 | Sorted alphabetically | cvar.c:377 + :343-346 | `qsort(sorted_cvars, num_cvars, sizeof(cvar_t *), Cvar_CvarCompare);` ; `return strcmp ((*((cvar_t **) p1))->name, (*((cvar_t **) p2))->name);` | MATCH |
| 3 | Each with its current value | cvar.c:386 (value source cvar.c:154) | `Con_Printf("%c %s %s\n", ... , var->name, var->string);` ; Cvar_Set assigns `var->string = tmp;` (current value) | MATCH |
| 4 | Optional name pattern filters the list | cvar.c:357 + :382-384 | `pattern = (Cmd_Argc() > 1) ? Cmd_Argv(1) : NULL;` ; `if (pattern && !Q_glob_match(pattern, var->name)) { continue; }` | MATCH |
| 5 | Supports * and ? wildcards | common.c:1681-1690 (doc comment :1666-1668) | `case '?': if (*text++ == '\0') return false; break;` ... `case '*': return Q_glob_match_after_star (pattern, text);` ; comment: "`*' matches any sequence of characters, `?' matches any character" | MATCH |
| 6 | Case-insensitive matching | common.c:1692 (also :1686, :1651) | `default: if (tolower (c) != tolower (*text++)) return false;` | MATCH |
| 7 | Without a pattern, full list shown | cvar.c:357 + :382 | argc<=1 sets `pattern = NULL`; the `if (pattern && ...)` filter is short-circuited, no row skipped; tail prints `%d/%d variables` (no "matching") | MATCH |
| 8 | Leading 's' marks mirrored into serverinfo | cvar.c:386 + cvar.h:62 | `var->flags & CVAR_SERVERINFO ? 's' : ' '` emitted as the FIRST `%c` before name; `#define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo` | MATCH |
| 9 | Serverinfo visible to connecting clients | cvar.c:157-159 -> sv_ccmds.c:1383-1385 | `if (var->flags & CVAR_SERVERINFO) { SV_ServerinfoChanged (var->name, var->string); }` ; SV_ServerinfoChanged: `Info_SetValueForKey(svs.info,...); SV_SendServerInfoChange(key,string);` (pushed to clients) | MATCH |
| 10 | Usage forms (cvarlist / cvarlist <pattern>) | cvar.c:357 | `pattern = (Cmd_Argc() > 1) ? Cmd_Argv(1) : NULL;` (argc gate selects the two documented forms) | MATCH |
| 11 | Set by: server console / rcon | cvar.c:564 ; cmd.c:933-942 ; sv_main.c:1828 ; sv_user.c:3408 | `Cmd_AddCommand ("cvarlist", Cvar_CvarList_f);` (no access-flag variant) -> registered in shared `cmd_hash_array`; rcon path reaches `Cmd_ExecuteString(str)` after Rcon_Validate; client `ucmds[]` table does NOT contain cvarlist (no fall-through to cmd table) | MATCH |

**V-pass notes:** VERDICT: TRACED-CLEAN. Oracle confirmed at 1.11-53-g18d0362. Single handler Cvar_CvarList_f (cvar.c:348-392), single unconditional registration (cvar.c:564, NOT behind any #ifdef -- the #endif at :560 closes a CVAR_DEBUG block ABOVE Cvar_Init). All 11 material clauses map to located, verified enforcing lines including adjacent comments.

Every clause is fact-checkable, not judgment (PROC-1 clean). Notable trace points:

- WILDCARDS (clauses 5/6): the description's "* and ? wildcards, case-insensitive" is enforced in Q_glob_match (common.c:1673-1698), reached from cvar.c:382. tolower() on both sides confirms case-insensitivity. The function's own header comment (common.c:1666-1668) independently documents the * and ? semantics. Q_glob_match does NOT support [] character sets (common.c:1662 "sets ([]) are not supported") -- the description does not claim sets, so no defect; only flagging as FYI in case a future edit adds a sets claim.

- SCOPE (clause 11): verified via WI-2 access-class discipline. cvarlist uses plain Cmd_AddCommand with no CF_-style access flag (the mvdsv server Cmd_AddCommand signature is name+function only). Dispatch (cmd.c:933) walks cmd_hash_array; both console (cmd.c:240 Cbuf) and rcon (sv_main.c:1828 after Rcon_Validate at :1701/:1708) funnel through Cmd_ExecuteString into that same table. Connected game clients route through SV_ExecuteUserCommand (sv_user.c:3399) which dispatches ONLY ucmds[] + QC progs commands and does NOT fall through to cmd_hash_array; cvarlist is absent from ucmds[]. So "server console / rcon" is exact and correctly excludes clients.

- SERVERINFO PROPAGATION (clause 9): the "visible to connecting clients" claim traces two hops -- the 's' flag is CVAR_SERVERINFO (cvar.h:62 comment "mirrored to serverinfo"), and Cvar_Set (cvar.c:157-159) calls SV_ServerinfoChanged which writes svs.info and calls SV_SendServerInfoChange (sv_ccmds.c:1383-1385), the propagation to clients. Confirmed, not inferred from the flag name.

No clause came from name/enum/string/comment inference without an enforcing read-site. No flavour-C defect.

## flags_for_review

- [review/contradiction/synthesis] cvardump (registered cvar.c:565, NOT in my 4-knob set but a chunk-5 sibling) shares the SAME handler Cvar_CvarList_f as cvarlist with ZERO behavioral difference: identical output format (cvar.c:386), identical pattern handling (cvar.c:357,382). The handler never branches on Cmd_Argv(0)/which name invoked it. The chunk-5 (C) note states cvardump+cvarlist 'differ only by argument/output mode' -- that hypothesis does NOT hold at version 1.11-53-g18d0362: cvardump is a pure alias of cvarlist, not a distinct mode. grep for cvardump outside cvar.c returned empty (no cvardump-specific path anywhere). Whoever fills cvardump should document it identically to cvarlist (or as 'alias of cvarlist').
- [fyi/suspected-bug/vpass] STALE SOURCE COMMENT (rot, not a description defect): cvar.c:340 carries 'TODO: allow cvar name mask as a parameter, e.g. cvarlist cl_*' directly above the handler -- but the pattern/wildcard feature IS fully implemented in the same function (cvar.c:357 reads Cmd_Argv(1), cvar.c:382 calls Q_glob_match). The TODO is stale and CONTRADICTS the live code. The proposed description correctly documents the IMPLEMENTED behavior (wildcard filtering exists), so the description is right and the comment is wrong. Per source-comments-are-hypotheses: flagging because a future verifier or extractor that trusts the comment over the code would wrongly conclude the feature is absent. Candidate upstream comment-removal PR.
- [fyi/hidden-family/vpass] cvardump is registered to the SAME handler Cvar_CvarList_f (cvar.c:565) -- it is an exact behavioral alias of cvarlist (identical output, identical pattern support). Out of scope for the cvarlist knob, but if cvardump is a separate L1 entity its description should be the same and ideally cross-reference cvarlist. FYI for whoever owns the cvardump row.
- [fyi/other/vpass] Q_glob_match (common.c:1662) does NOT support [] character-set syntax (only * and ?). The proposed description does not claim sets, so no defect today. Flagging so any future edit that adds a '[abc] character class' claim is caught -- the code would not support it.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "cvarlist",
  "type": "command",
  "description": "Prints every cvar the server knows, sorted alphabetically, each with its current value. An optional name pattern filters the list (supports * and ? wildcards, case-insensitive); without one, the full list is shown. A leading 's' next to a cvar marks it as mirrored into the server info (visible to connecting clients). cvardump is an exact alias of this command.\n\ncvarlist = list all cvars.\ncvarlist <pattern> = list only cvars whose name matches the wildcard pattern (e.g. cvarlist sv_*).\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cvar.c:386. Handler Cvar_CvarList_f (registered cvar.c:564). WHAT/sorted: cvar.c:377 qsort(sorted_cvars,...,Cvar_CvarCompare) where comparator cvar.c:345 strcmp(name,name) => alphabetical by name. Print line cvar.c:386 `Con_Printf(\"%c %s %s\\n\", var->flags & CVAR_SERVERINFO ? 's' : ' ', var->name, var->string)` enforces: 's'/space prefix on CVAR_SERVERINFO, then name, then current string value. CVAR_SERVERINFO meaning verified cvar.h:62 `#define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo`. Optional pattern: cvar.c:357 `pattern = (Cmd_Argc()>1) ? Cmd_Argv(1) : NULL`; cvar.c:382 `if (pattern && !Q_glob_match(pattern, var->name)) continue` enforces the filter. Glob semantics verified Q_glob_match common.c:1673-1697: '?'=any single char (1682), '*'=wildcard suffix via Q_glob_match_after_star (1690), default branch tolower-compares (1692) => case-insensitive. Access-class: registered via Cmd_AddCommand only (cvar.c:564); grep of sv_user.c ucmds[] (table at sv_user.c:3299) for \"cvarlist\"/\"cvardump\" returned empty => NOT client-issuable; NOT on the normal-rcon blocklist (sv_main.c:1754-1764) => server console / rcon. F-MV1: grep ktx/src for a cvarlist override returned empty => no KTX override, pure MVDSV behavior. No Default line: takes a no-arg default (list all) and an optional arg, documented via the two usage forms per D20. [MAIN-HG2 edit: noted cvardump is an exact alias (shared handler).]",
  "description_proposed": null
}
```
