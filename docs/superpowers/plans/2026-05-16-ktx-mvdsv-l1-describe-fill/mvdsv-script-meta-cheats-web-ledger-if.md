# describe-fill-synthesis ledger -- mvdsv `if`

- **project:** mvdsv
- **knob:** `if` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:if: synthesized -- conditional: compares two values, runs cmd if true / else cmd if false; 10 operators incl isin; blocklisted so server console + master rcon only -- origin=synthesized ref=src/cmd.c:1055 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Compares two values and runs a command only when the comparison is true, with an optional command to run when it is false. Both sides are compared as numbers when both look numeric, otherwise as text.
>
> if <a> <op> <b> <command> [else <command>] = if 'a op b' holds, run the first command; otherwise run the command after 'else' (if given). An optional 'then' keyword may follow the comparison before the command.
>
> <op> can be:
> == or = = equal; != or <> = not equal
> > < >= <= = numeric greater / less / greater-or-equal / less-or-equal
> isin = true when <a> appears as text inside <b>; !isin = true when it does not
>
> Set by: server console + master rcon only.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| syntax: if <a> <op> <b> <command> [else <command>] | src/cmd.c:984-988 | `if (c < 5) { Con_Printf("usage: if <expr1> <op> <expr2> <command> [else <command>]\n"); return; }` | MATCH |
| ==/= equal, !=/<> not-equal | src/cmd.c:992-1002 | `if (!strcmp(op,"==")...!strcmp(op,"<>"))` ... `if (op[0] != '=') result = !result;` | MATCH |
| ==/= numeric when both numeric, else text | src/cmd.c:995-998 + 966-971 | `if (is_numeric(Argv(1)) && is_numeric(Argv(3))) result = Q_atof()==Q_atof(); else result = !strcmp(...)` ; is_numeric checks leading digit/sign/decimal | MATCH |
| > < >= <= numeric comparison | src/cmd.c:1003-1010 | `else if(!strcmp(op,">")) result = Q_atof(Argv(1)) > Q_atof(Argv(3))` (and <, >=, <=) | MATCH |
| isin = a-substring-of-b ; !isin = negation | src/cmd.c:1011-1014 | `else if(!strcmp(op,"isin")) result = strstr(Argv(3), Argv(1)) != NULL` ; `!isin ... == NULL` | MATCH |
| 'then' keyword optional, 'else' splits branches | src/cmd.c:1027,1029,1040 | `if ((i==4) && !strcasecmp(Argv(i),"then")) continue;` ; `if (!strcasecmp(Argv(i),"else")) break;` | MATCH |
| true => run first command, false => run else command (or nothing) | src/cmd.c:1023,1036,1044-1051,1055 | `if (result) {...}` / `else {... scan to else; if(i==c) return; collect post-else}` ; `Cbuf_InsertText(buf)` | MATCH |
| chosen command is executed | src/cmd.c:1055 + 55 | `Cbuf_InsertText(buf)` ; `void Cbuf_InsertText(const char *text){ Cbuf_InsertTextEx(&cbuf_main, text); }` | MATCH |
| set by server console + master rcon only (blocklisted) | src/cmd.c:1075 ; src/sv_user.c:3299 ; src/sv_main.c:1755,1766 | `Cmd_AddCommand("if", Cmd_If_f)` ; grep "if" in ucmds[] => empty ; `!strcasecmp(tstr, "if")` -> `bad_cmd = true` | MATCH |
| no KTX override | ktx/src (grep) | grep "if" Cmd_AddCommand => empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Runs a command only when comparison true | src/cmd.c:1023-1035 | `if (result) { for (i=4; i<c; i++) {... strlcat(buf, Cmd_Argv(i)...)} }` then `Cbuf_InsertText(buf)` (1055) | MATCH |
| 2 | Optional command when false (after else) | src/cmd.c:1036-1053 | else-branch scans for "else"; `if (i == c) return;` then builds buf from token after else | MATCH |
| 3 | Both sides compared as numbers when both look numeric, else as text (equality ops) | src/cmd.c:995-998 | `if (is_numeric(Cmd_Argv(1)) && is_numeric(Cmd_Argv(3))) result = Q_atof(...)==Q_atof(...); else result = !strcmp(Cmd_Argv(1),Cmd_Argv(3));` | MATCH |
| 3b | "look numeric" = leading-char check (generous) | src/cmd.c:966-971 | `is_numeric`: tests `*c` digit, or sign/dot + next digit — first char(s) only | MATCH (phrase "look numeric" is accurate, not "valid number") |
| 4 | Signature: if a op b command [else command]; needs >=5 args | src/cmd.c:984-989 | `c = Cmd_Argc(); if (c < 5) { Con_Printf("usage: if <expr1> <op> <expr2> <command> [else <command>]"); return; }` | MATCH |
| 5 | Optional 'then' keyword may follow comparison before command | src/cmd.c:1027-1028 | `if ((i == 4) && !strcasecmp(Cmd_Argv(i), "then")) continue;` | MATCH (skipped only at first command token, true-branch) |
| 6 | == or = = equal | src/cmd.c:992,1000 | `!strcmp(op,"==") \|\| !strcmp(op,"=")` ... `if (op[0] != '=') result = !result;` (no invert for `=`/`==`) | MATCH |
| 7 | != or <> = not equal | src/cmd.c:992-993,1000-1001 | `\|\| !strcmp(op,"!=") \|\| !strcmp(op,"<>")` ... `if (op[0] != '=') result = !result;` (invert) | MATCH |
| 8 | > < >= <= = numeric gt/lt/ge/le | src/cmd.c:1003-1010 | `else if (!strcmp(op,">")) result = Q_atof(Cmd_Argv(1)) > Q_atof(Cmd_Argv(3));` (and `<`,`>=`,`<=` likewise, always atof) | MATCH |
| 9 | isin = true when a appears as text inside b | src/cmd.c:1011-1012 | `else if (!strcmp(op,"isin")) result = strstr(Cmd_Argv(3), Cmd_Argv(1)) != NULL;` | MATCH (strstr(b,a)) |
| 10 | !isin = true when a does NOT appear in b | src/cmd.c:1013-1014 | `else if (!strcmp(op,"!isin")) result = strstr(Cmd_Argv(3), Cmd_Argv(1)) == NULL;` | MATCH |
| 11 | Set by: server console | src/cmd.c:916,933-941 + src/sv_main.c:3166-3169 | console input -> Cbuf -> `Cmd_ExecuteString` dispatches `cmd_hash_array` (table `if` added to at cmd.c:1075); no access gate | MATCH |
| 12 | Set by: master rcon | src/sv_main.c:1701-1707,1799,1828 | `if (Rcon_Validate(..., master_rcon_password)) { ... do_cmd = true; }` -> `Cmd_ExecuteString(str)` with NO blocklist | MATCH |
| 13 | NOT normal/admin rcon (scope = "only" excludes it) | src/sv_main.c:1759,1767,1774 | `!strcasecmp(tstr, "if")` -> `bad_cmd = true;` in normal-rcon blocklist -> `do_cmd = !bad_cmd` (false) | MATCH (exclusion correct) |
| 14 | NOT connected client (scope = "only") | src/sv_user.c:3299-3385,3408-3424 | `if` absent from `ucmds[]`; `SV_ExecuteUserCommand` falls to `SV_ExecutePRCommand`/"Bad user command", no fall-through to `Cmd_ExecuteString` | MATCH (exclusion correct) |
| 15 | No per-command CF_ access flag (access is execution-path only) | src/cmd.c:706,1075; src/cmd.h:95 | `void Cmd_AddCommand (const char *cmd_name, xcommand_t function)` — no flag arg; `Cmd_AddCommand("if", Cmd_If_f)` | MATCH (supports scope-by-path model) |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. Read-only V-pass, no writes/DB/git.

Handler: Cmd_If_f at src/cmd.c:977-1056. Registration: src/cmd.c:1075 (the sole registration; no PR2/QVM/mod override anywhere in the tree). Every material clause maps to a located, verified enforcing line with matching adjacent code.

Operator semantics (cmd.c:992-1020): all eight operators + both alternate spellings (`==`/`=`, `!=`/`<>`) traced to their result-assignment lines, including the `op[0] != '='` polarity-invert that distinguishes equal from not-equal. isin/!isin direction verified: `strstr(b, a)` => "a inside b", matching the description's a-in-b framing. Numeric vs text: equality ops fall back to strcmp only when NOT both is_numeric; the four ordering ops always Q_atof (float). The description's "when both look numeric" is a precise rendering of the leading-char-only is_numeric gate (cmd.c:966-971) — it deliberately says "look numeric," not "are valid numbers," which is the honest characterization.

then/else parsing: `then` skip is enforced only at the first command token on the true branch (cmd.c:1027-1028); else-handling on both branches verified (true: break at else; false: jump to after-else or return if absent). Description's general phrasing holds.

Scope clause "server console + master rcon only" is the load-bearing WI-2 metadata claim and it is exactly right. Three independent access paths traced to their dispatch sites: (1) console -> Cmd_ExecuteString against the full cmd table, ungated; (2) master-rcon -> Cmd_ExecuteString with no blocklist; (3) normal/admin-rcon -> blocked by the explicit `if` entry in the sv_main.c:1747-1770 blocklist; plus (4) connected clients have no path because `if` is not in ucmds[] and SV_ExecuteUserCommand never falls through to Cmd_ExecuteString. The "only" is therefore verified positively (the two allowed paths) AND by exclusion (the two denied paths). Cmd_AddCommand carries no CF_-style access flag (single-arg signature), confirming access is purely execution-path-determined, not flag-determined.

No flavour-C clause found: no semantic/polarity/threshold/scope/OFF-state assertion rests on name/enum/string/comment inference. Every assertion has an enforcing read-site.

## flags_for_review

- [fyi/other/vpass] is_numeric (src/cmd.c:966-971) only inspects the leading character(s): a string like '5x' or '3.2.1' passes as numeric and Q_atof parses its numeric prefix. The description's 'when both look numeric' captures this honestly, so it is NOT a defect for this row -- noting it only so a future author writing sibling cvars/commands that reuse is_numeric does not over-claim strict numeric validation.
- [fyi/suspected-bug/vpass] Source comment at src/sv_main.c:1743-1745 warns the normal-rcon blocklist 'would still be vulnerable to semicolons if they were still allowed' -- the security of the `if` block (and the whole blocklist) depends on multi-command separators staying disabled. Not a bug in 1.11-53-g18d0362 (the loop breaks after the first non-empty token and semicolons are not re-enabled), but it is a documented fragility tied to the `if` access guard, worth knowing if anyone revisits command separators.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "if",
  "type": "command",
  "description": "Compares two values and runs a command only when the comparison is true, with an optional command to run when it is false. Both sides are compared as numbers when both look numeric, otherwise as text.\n\nif <a> <op> <b> <command> [else <command>] = if 'a op b' holds, run the first command; otherwise run the command after 'else' (if given). An optional 'then' keyword may follow the comparison before the command.\n\n<op> can be:\n== or = = equal; != or <> = not equal\n> < >= <= = numeric greater / less / greater-or-equal / less-or-equal\nisin = true when <a> appears as text inside <b>; !isin = true when it does not\n\nSet by: server console + master rcon only.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cmd.c:1055. Handler Cmd_If_f (registered cmd.c:1075). Arg shape: cmd.c:984-988 `c = Cmd_Argc(); if (c < 5) { Con_Printf(\"usage: if <expr1> <op> <expr2> <command> [else <command>]\\n\"); return; }` enforces the <a> <op> <b> <command> [else <command>] form (>=5 tokens). Operator parse cmd.c:991 `op = Cmd_Argv(2)`. ==/=/!=/<> family cmd.c:992-1002: cmd.c:995-998 `if (is_numeric(Argv(1)) && is_numeric(Argv(3))) result = Q_atof(Argv(1)) == Q_atof(Argv(3)); else result = !strcmp(Argv(1), Argv(3));` => numeric compare iff BOTH numeric, else string compare; cmd.c:1000-1001 `if (op[0] != '=') result = !result;` flips for != and <>. is_numeric verified cmd.c:966-971 (leading digit, signed, or decimal). Relational ops cmd.c:1003-1010 are always Q_atof numeric (>,<,>=,<=). isin cmd.c:1011 `result = strstr(Argv(3), Argv(1)) != NULL` => true when Argv(1) is a substring of Argv(3) (a-in-b); !isin cmd.c:1013 negates. Unknown op cmd.c:1015-1019 prints the valid-operator list and returns. Side-effect / branch selection: cmd.c:1022-1053 build buf from the tokens after the operator -- when result true (cmd.c:1023) it skips a leading 'then' (cmd.c:1027) and stops at 'else' (cmd.c:1029); when false (cmd.c:1036) it scans forward to 'else' (cmd.c:1040) and if none found returns (cmd.c:1044-1045) else collects the post-else tokens (cmd.c:1047-1051). Execution: cmd.c:1055 `Cbuf_InsertText(buf)` -- verified cmd.c:55 `Cbuf_InsertText` -> Cbuf_InsertTextEx(&cbuf_main, text) => inserts the chosen command text into the command buffer to be executed. Access-class: registered via Cmd_AddCommand only (cmd.c:1075); grep of ucmds[] (sv_user.c:3299) for \"if\" returned empty => NOT client-issuable; AND \"if\" IS on the normal-rcon blocklist sv_main.c:1755 `!strcasecmp(tstr, \"if\")` -> bad_cmd=true (sv_main.c:1766), so per chunk-5 rule (B)/HG2 the regular rcon_password tier cannot reach it => Set-by = 'server console + master rcon only', NOT bare console/rcon. F-MV1: grep ktx/src for an 'if' Cmd_AddCommand override returned empty => no KTX override. No Default line (control-flow command, no meaningful no-arg default; usage line is the contract).",
  "description_proposed": null
}
```
