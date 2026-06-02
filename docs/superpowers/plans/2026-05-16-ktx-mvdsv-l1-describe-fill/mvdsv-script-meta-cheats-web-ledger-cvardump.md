# describe-fill-synthesis ledger -- mvdsv `cvardump`

- **project:** mvdsv
- **knob:** `cvardump` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:cvardump: synthesized -- lists cvars (sorted, optional * glob, 's'=serverinfo); identical alias of cvarlist; console/rcon, no client path, no KTX override -- origin=synthesized ref=src/cvar.c:386 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Lists every cvar (alphabetically) with its current value; an 's' in the left margin marks a cvar that is published in the server info. An optional name pattern (with * and ? wildcards, case-insensitive) limits the list to matching cvars, and a count of matches is printed at the end. This command is an exact alias of cvarlist (same handler, identical output).
>
> cvardump = list all cvars.
> cvardump cl_* = list only cvars whose name matches cl_*.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| 's' margin marks serverinfo cvar | src/cvar.c:386 | `Con_Printf("%c %s %s\n", var->flags & CVAR_SERVERINFO ? 's' : ' ', var->name, var->string);` | MATCH |
| sorted alphabetically by name | src/cvar.c:377,343-345 | `qsort(... Cvar_CvarCompare ...)` / `return strcmp((*p1)->name,(*p2)->name)` | MATCH |
| optional name pattern arg | src/cvar.c:357 | `pattern = (Cmd_Argc() > 1) ? Cmd_Argv(1) : NULL;` | MATCH |
| pattern uses * glob filter | src/cvar.c:382 | `if (pattern && !Q_glob_match(pattern, var->name)) continue;` | MATCH |
| Q_glob_match is a real glob matcher | src/common.c:1673 | `qbool Q_glob_match (const char *pattern, const char *text)` | MATCH |
| match-count footer | src/cvar.c:390 | `Con_Printf("------------\n%d/%d %svariables\n", pattern_matched, num_cvars, (pattern) ? "matching " : "");` | MATCH |
| cvardump == cvarlist (shared handler, no name branch) | src/cvar.c:564-565,348 | both Cmd_AddCommand -> Cvar_CvarList_f; handler never reads Cmd_Argv(0) | MATCH |
| not client-issuable (ucmds absent) | src/sv_user.c | grep `"cvardump"` empty | MATCH |
| not on normal-rcon blocklist | src/sv_main.c:1750-1767 | 'cvardump' absent | MATCH |
| no KTX override | ktx/src | grep "cvardump"/"cvarlist" empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1a | Lists every cvar | src/cvar.c:359-361, 374-376 | `for (var = cvar_vars; var; var = var->next) { num_cvars++; }` ... `sorted_cvars[i++] = var;` (full cvar_vars list collected) | MATCH |
| 1b | alphabetically | src/cvar.c:343-345, 377 | `return strcmp ((*((cvar_t **) p1))->name, (*((cvar_t **) p2))->name);` + `qsort(sorted_cvars, num_cvars, sizeof(cvar_t *), Cvar_CvarCompare);` | MATCH (ASCII-ordinal on name == alphabetical for lowercase cvar names) |
| 1c | with its current value | src/cvar.c:386 | `Con_Printf("%c %s %s\n", ... var->name, var->string);` (var->string = current value) | MATCH |
| 2 | 's' in left margin marks cvar published in server info | src/cvar.c:386 + cvar.h:62 | `var->flags & CVAR_SERVERINFO ? 's' : ' '` (leading char in `"%c ..."`); `#define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo` | MATCH |
| 3a | optional name pattern argument | src/cvar.c:357 | `pattern = (Cmd_Argc() > 1) ? Cmd_Argv(1) : NULL;` | MATCH |
| 3b | with * wildcards, limits list to matching | src/cvar.c:382 + common.c:1666,1689-1690 | `if (pattern && !Q_glob_match(pattern, var->name)) continue;` ; glob doc `"\`*' matches any sequence of characters"` + `case '*': return Q_glob_match_after_star(...)` | MATCH (also supports `?`; matching is case-insensitive via tolower -- not stated, not contradicted) |
| 4 | count of matches printed at the end | src/cvar.c:387, 390 | `pattern_matched++;` ... `Con_Printf("------------\n%d/%d %svariables\n", pattern_matched, num_cvars, (pattern) ? "matching " : "");` | MATCH |
| 5a | example: cvardump = all cvars | src/cvar.c:357,382 | pattern NULL when Argc<=1 -> line 382 guard false -> every cvar printed | MATCH |
| 5b | example: cvardump cl_* = matching | src/cvar.c:382 + common.c glob | `Q_glob_match("cl_*", var->name)` keeps names beginning `cl_` | MATCH |
| 6 | Set by: server console / rcon | cvar.c:565 (registration) ; sv_main.c:1828 (rcon dispatch) ; sv_user.c:3399-3424 + ucmds[] 3299-3396 (client path) | `Cmd_AddCommand("cvardump", Cvar_CvarList_f);` (plain reg, not ucmds[]); rcon: `Cmd_ExecuteString(str);` after Rcon_Validate routes through cmd_functions table; client `cmd` path iterates `ucmds[]` only (NO cvar* entry) and never calls Cmd_ExecuteString -> clients cannot reach it | MATCH |

**V-pass notes:** All 9 decomposed clauses enforce-trace to located lines with matching code/comments. Verdict: TRACED-CLEAN.

Handler: `cvardump` is registered at cvar.c:565 to `Cvar_CvarList_f` (cvar.c:348-392), the SAME handler shared with `cvarlist` (cvar.c:564). Behavior is identical for both names; the description is complete and correct for cvardump and does not need to mention the alias.

Clause-by-clause:
- "every cvar / alphabetically / current value": full cvar_vars traversal (359-361,374-376), qsort by strcmp on ->name (343-345,377), prints var->string (386). strcmp is byte/ASCII-ordinal and case-sensitive (uppercase < lowercase), but cvar names are lowercase by convention so this equals alphabetical -- the parenthetical is accurate within the real name domain.
- "'s' marks serverinfo cvar": line 386 emits leading 's' iff CVAR_SERVERINFO set; cvar.h:62 comment "mirrored to serverinfo" confirms semantics. Exact MATCH.
- "optional name pattern with * wildcards limits + count at end": pattern is optional Argv(1) (357), Q_glob_match gate skips non-matches (382), Q_glob_match (common.c:1673) documents and implements `*` = any sequence, `?` = any char, exact otherwise, case-insensitive via tolower. pattern_matched counter (387) printed in footer (390) with "matching " qualifier only when a pattern is present. All MATCH.
- Examples 5a/5b: both follow directly from the pattern guard. MATCH.

Access class (clause 6, WI-2): verified at the dispatch sites, not inferred from the name. `cvardump` is a plain Cmd_AddCommand registration -> lives in the cmd_functions table. The rcon path (sv_main.c:1701-1828) validates rcon_password/master_rcon_password then calls Cmd_ExecuteString -> reaches cmd_functions -> reaches cvardump. The connected-client `cmd`/stringcmd path (SV_ExecuteUserCommand, sv_user.c:3399) iterates ONLY the separate ucmds[] table (3299-3396, which has no cvar* entry) and falls through to QC mod commands or "Bad user command" -- it NEVER calls Cmd_ExecuteString, so an ordinary client cannot invoke cvardump. Therefore "server console / rcon" is exactly right and "client" is correctly excluded.

Minor stylistic-only note (NOT a defect, no clause affected): the field label "Set by:" reads oddly for a read-only listing command (it lists, it does not set state), but that is the workflow's standard access-class field, not a behavioral assertion -- no action needed. The case-insensitivity of the wildcard match and the `?` wildcard are unstated but not contradicted; the description's `*` claim and example are accurate.

## flags_for_review

- [review/contradiction/synthesis] cvardump and cvarlist are registered to the SAME handler Cvar_CvarList_f (src/cvar.c:564-565) and the handler does NOT branch on Cmd_Argv(0)/the command name -- they are byte-for-byte identical aliases. The chunk-5 brief (note C) said cvardump+cvarlist 'differ only by argument/output mode'; source shows zero behavioral difference. cvarlist is in chunk-5's KNOBS for this chunk but was not in my 4-knob set; flagging so its synth describes it as the identical twin, not a distinct mode.
- [fyi/other/synthesis] Stale source comment: the Cvar_CvarList_f banner at src/cvar.c:340 reads 'TODO: allow cvar name mask as a parameter, e.g. cvarlist cl_*', but the pattern/glob arg IS already implemented (src/cvar.c:357 reads Cmd_Argv(1); cvar.c:382 filters via Q_glob_match). I documented the implemented behavior, not the obsolete TODO. FYI for anyone trusting the banner comment.
- [fyi/hidden-family/vpass] cvardump (cvar.c:565) and cvarlist (cvar.c:564) are registered to the identical handler Cvar_CvarList_f -- they are exact aliases with no behavioral difference. If a separate cvarlist row exists in the fleet, the two descriptions should match. FYI only; not a defect in this row.
- [fyi/other/vpass] The handler's doc comment at cvar.c:340 still reads 'TODO: allow cvar name mask as a parameter, e.g. cvarlist cl_*' but the mask feature IS implemented below it (pattern via Q_glob_match, lines 357/382). Stale TODO in source -- code is correct, comment lags. Does not affect the description.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "cvardump",
  "type": "command",
  "description": "Lists every cvar (alphabetically) with its current value; an 's' in the left margin marks a cvar that is published in the server info. An optional name pattern (with * and ? wildcards, case-insensitive) limits the list to matching cvars, and a count of matches is printed at the end. This command is an exact alias of cvarlist (same handler, identical output).\n\ncvardump = list all cvars.\ncvardump cl_* = list only cvars whose name matches cl_*.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cvar.c:386. cvardump is registered at cvar.c:565 to Cvar_CvarList_f (src/cvar.c:348-392) -- the SAME handler as 'cvarlist' (registered cvar.c:564). The handler does NOT branch on Cmd_Argv(0)/the command name, so cvardump and cvarlist are byte-for-byte identical aliases (see flag). Behavior: collects all cvar_vars, qsort by name via Cvar_CvarCompare strcmp (cvar.c:343-345, 377) = alphabetical. Optional pattern from Cmd_Argv(1) (cvar.c:357); per-cvar filter Q_glob_match(pattern, var->name) (cvar.c:382), and Q_glob_match (src/common.c:1673) is a real '*'-glob matcher -> wildcard support. Output line: Con_Printf with leading 's' iff var->flags & CVAR_SERVERINFO else space, then name and string value (cvar.c:386). Footer prints matched/total and 'matching ' when a pattern was given (cvar.c:390). Set-by: Cmd_AddCommand only (cvar.c:565), absent from ucmds[] (grep src/sv_user.c for 'cvardump' empty) so not client-issuable; absent from normal-rcon blocklist (src/sv_main.c:1750-1767) so regular rcon reaches it. F-MV1: KTX registers no 'cvardump'/'cvarlist' command (grep ktx/src empty) -- engine command is live. The TODO comment at cvar.c:340 ('allow cvar name mask') is stale -- the pattern arg IS implemented at cvar.c:357/382; documented per the implemented code, not the comment. [MAIN-HG2 edit: aligned wildcard support (* and ?, case-insensitive) and noted exact-alias of cvarlist (shared Cvar_CvarList_f).]",
  "description_proposed": null
}
```
