# QWFWD describe-fill ledger -- `if` (command)

Handler `Cmd_If_f` (`src/cmd.c:927-1006`); registered `src/cmd.c:1079`.
Anchor `1.40-dev`. Cold synth (no source_inline stub on this knob).
Operators traced from the handler's comparison chain, not inferred.

## Enforce-trace (per clause)

| Clause | Enforcing line | Snippet | Verdict |
|---|---|---|---|
| Form `if <expr1> <op> <expr2> <command> [else <command>]`; needs >=5 args | cmd.c:934-939 | `c = Cmd_Argc(); if (c < 5){ Sys_Printf("usage: if <expr1> <op> <expr2> <command> [else <command>]\n"); return; }` | MATCH |
| Operator is the 2nd argument | cmd.c:941 | `op = Cmd_Argv(2);` | MATCH |
| `==` and `=` test equality; `!=` and `<>` test inequality | cmd.c:942-952 | `if (!strcmp(op,"==")||!strcmp(op,"=")||!strcmp(op,"!=")||!strcmp(op,"<>")){ ...; if (op[0] != '=') result = !result; }` | MATCH |
| Equality: numeric compare if both sides numeric, else string compare | cmd.c:945-948 | `if (is_numeric(Argv1) && is_numeric(Argv3)) result = atof(Argv1)==atof(Argv3); else result = !strcmp(Argv1,Argv3);` | MATCH |
| `>` `<` `>=` `<=` are numeric comparisons | cmd.c:953-960 | `else if(!strcmp(op,">")) result = atof(Argv1) > atof(Argv3); ...` (atof on both sides for all four) | MATCH |
| `isin` true when expr1 occurs inside expr2; `!isin` is its negation | cmd.c:961-964 | `else if(!strcmp(op,"isin")) result = strstr(Argv3,Argv1)!=NULL; else if(!strcmp(op,"!isin")) result = strstr(Argv3,Argv1)==NULL;` | MATCH (note: substring of expr2, args read as strstr(haystack=Argv3, needle=Argv1)) |
| Unknown operator prints the valid-operator list and does nothing | cmd.c:965-970 | `else { Sys_Printf("unknown operator: %s\n",op); Sys_Printf("valid operators are ==, =, !=, <>, >, <, >=, <=, isin, !isin\n"); return; }` | MATCH |
| On true: runs the command after expr2; a leading `then` is skipped | cmd.c:973-985 | `if(result){ for(i=4;i<c;i++){ if((i==4)&&!stricmp(Argv(i),"then")) continue; if(!stricmp(Argv(i),"else")) break; strlcat(buf,...); } }` | MATCH |
| `else <command>` runs when false; if no `else`, false does nothing | cmd.c:986-1003 | false branch scans for "else" (cmd.c:988-992); `if (i==c) return;` (cmd.c:994-995) then appends args after else (cmd.c:997-1002) | MATCH |
| The chosen command is then executed | cmd.c:1005 | `Cbuf_InsertText (buf);` | MATCH |

`Set by:` -- plain `Cmd_AddCommand` (cmd.c:1079), no access flags; proxy
stdin console or `qwfwd.cfg`. -> "server console / config".

TRACED-CLEAN. Every operator and both branches traced to the handler. The
equality polarity flip (`if (op[0] != '=') result = !result;`, cmd.c:950-951)
correctly makes `!=`/`<>` the negation while `==`/`=` stay positive. `isin`
direction verified: `strstr(Cmd_Argv(3), Cmd_Argv(1))` -> expr1 is the needle
searched within expr2. No name/string-only clause asserted.

```json
{
  "project": "qwfwd",
  "knob": "if",
  "type": "command",
  "description": "Runs a command only when a comparison is true, with an optional command to run when it is false.\n\nif <expr1> <op> <expr2> <command> [else <command>] = compare <expr1> and <expr2> using <op>; if the test holds, run <command>, otherwise run the command after 'else' (if given). An optional 'then' may appear before the command.\n\n<op> values:\n==, =  = equal\n!=, <> = not equal\n>, <, >=, <= = numeric greater/less (and or-equal)\nisin   = true when <expr1> appears anywhere inside <expr2>\n!isin  = true when <expr1> does not appear inside <expr2>\n\nFor equality, if both sides look like numbers they are compared as numbers, otherwise as text; the ordering operators always compare as numbers. An unrecognised operator prints the list of valid ones and does nothing.\n\nSet by: server console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Synthesized from Cmd_If_f (src/cmd.c:927-1006). Needs >=5 args or prints the usage line (cmd.c:934-939). Operator is Cmd_Argv(2) (cmd.c:941). Equality family ==,=,!=,<> (cmd.c:942-943): numeric compare via atof when both is_numeric (cmd.c:945-946, is_numeric at cmd.c:916-921), else strcmp string compare (cmd.c:948); polarity flip 'if (op[0] != \"=\") result = !result' (cmd.c:950-951) makes !=/<> the negation and ==/= positive -- traced, not inferred from the operator glyphs. Ordering ops >,<,>=,<= each atof both sides (cmd.c:953-960). isin = strstr(Cmd_Argv(3),Cmd_Argv(1))!=NULL i.e. expr1 (needle) inside expr2 (haystack) (cmd.c:961-962); !isin is the ==NULL negation (cmd.c:963-964) -- direction verified from the strstr arg order. Unknown operator prints 'valid operators are ==, =, !=, <>, >, <, >=, <=, isin, !isin' and returns (cmd.c:965-970). True branch builds the command from args 4..c, skipping a leading 'then' (cmd.c:977-978) and stopping at 'else' (cmd.c:979-980). False branch scans to 'else'; absent else (i==c) returns doing nothing (cmd.c:994-995), else appends the post-else args (cmd.c:997-1002). Selected command executed via Cbuf_InsertText(buf) (cmd.c:1005). Set-by: Cmd_AddCommand has no access flags (cmd.h:96); commands come from proxy stdin console (peer.c:235) or qwfwd.cfg (main.c:142). TRACED-CLEAN.",
  "description_proposed": null
}
```
