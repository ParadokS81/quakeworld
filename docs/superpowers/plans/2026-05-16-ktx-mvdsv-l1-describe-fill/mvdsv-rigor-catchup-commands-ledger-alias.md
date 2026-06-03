# describe-fill-synthesis ledger -- mvdsv `alias`

- **project:** mvdsv
- **knob:** `alias` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:alias: synthesized -- defines/lists a server-console named shortcut that runs a (;-separated) command string when typed; admin/console-only, not pushed to clients -- origin=synthesized ref=src/cmd.c:462 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Defines a named shortcut on the server console that runs one or more commands when its name is typed. The named commands are run as if typed directly; multiple commands are separated with semicolons.
>
> alias = with no arguments, list all currently defined aliases and what they run.
> alias <name> <command-string> = create or replace the alias <name> so that typing <name> runs <command-string>.
>
> Aliases are local to the server console (they are not sent to connecting clients) and are commonly defined in server config files.
>
> Set by: server config / console / rcon (admin only).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| handler / admin-console-only (Cmd_AddCommand, not ucmds[]) | src/cmd.c:1070 ; src/sv_user.c:3299,3399 | `Cmd_AddCommand ("alias",Cmd_Alias_f);` ; not in ucmds[]; 'Bad user command' no fall-through | MATCH |
| not on rcon blocklist | src/sv_main.c:1754-1764 | alias absent from blocklist tokens | MATCH |
| no-arg lists aliases | src/cmd.c:403-408 | `if (c == 1) { Con_Printf("Current alias commands:\n"); for (...) Con_Printf("%s : %s\n\n", a->name, a->value); return; }` | MATCH |
| value = args 2..N joined by spaces | src/cmd.c:454-462 | `for (i=2; i<c; i++){ if (i>2) strlcat(cmd," ",...); strlcat(cmd, Cmd_Argv(i),...);} a->value = Q_strdup(cmd);` | MATCH |
| typing the name runs the stored string | src/cmd.c:949-956 | `if (!strcasecmp(Cmd_Argv(0), a->name)) { Cbuf_InsertText("\n"); Cbuf_InsertText(a->value); return; }` | MATCH |
| command-string is ;-separated (cbuf parses) | src/cmd.c:389 ; src/cmd.c:954 | header `executes a command string (possibly ; seperated)` ; value fed to Cbuf_InsertText (standard cbuf splits ';') | MATCH |
| server-local (own cmd_alias list, not pushed to clients) | src/cmd.c:443-451 | `a->next = cmd_alias; cmd_alias = a; ... strlcpy(a->name, s, MAX_ALIAS_NAME);` | MATCH |
| name length cap | src/cmd.c:412-416 ; src/cmd.h:160 | `if (strlen(s) >= MAX_ALIAS_NAME) { Con_Printf("Alias name is too long\n"); return; }` ; `#define MAX_ALIAS_NAME 32` | MATCH |
| F-MV1 no KTX override | ktx/src (grep) | grep alias -> empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Named shortcut that runs one or more commands when its name is typed | src/cmd.c:411,451,462 (store) + src/cmd.c:949-955 (expand on type) | `s = Cmd_Argv(1);` ... `strlcpy (a->name, s, MAX_ALIAS_NAME);` ... `a->value = Q_strdup (cmd);` / `for (a=cmd_alias_hash[key] ; a ; a=a->hash_next){ if (!strcasecmp(Cmd_Argv(0), a->name)){ Cbuf_InsertText ("\n"); Cbuf_InsertText (a->value);` | MATCH |
| 2 | The named commands are run as if typed directly | src/cmd.c:953-954 + src/cmd.c:116-117,144 (Cbuf_InsertTextEx re-enqueues into command buffer, then re-parsed by Cbuf_ExecuteEx/Cmd_ExecuteString) | `Cbuf_InsertText ("\n"); Cbuf_InsertText (a->value);` ; header Cmd_ExecuteString "as if it was typed at the console" (cmd.h:153) | MATCH |
| 3 | Multiple commands separated with semicolons | src/cmd.c:178-200 (`;` is a line break in the buffer) + src/cmd.c:235-240 (execute each split line) | `if (!(quotes & 1) && text[i] == ';') { switch (semicolon){ case 0: case 3: semicolon = 1; break; case 1: semicolon = 2; break;` ... `if (semicolon > 1) Sys_Printf("ATTENTION: ... server don't run command after ';'!...") else Cmd_ExecuteString (line);` -- NORMAL `cmd1 ; cmd2` runs both (state 0->1 on first `;`, then 1->3 on `\n`); only a SECOND consecutive `;` with no intervening `\n` (state->2) is blocked | MATCH (narrow edge-case: consecutive `;;`-style injection is suppressed; common single-separator path works) |
| 4 | alias with no arguments lists all defined aliases and what they run | src/cmd.c:403-408 | `c = Cmd_Argc(); if (c == 1){ Con_Printf ("Current alias commands:\n"); for (a = cmd_alias ; a ; a=a->next) Con_Printf ("%s : %s\n\n", a->name, a->value); return; }` | MATCH |
| 5 | alias <name> <cmd> creates or replaces the alias | src/cmd.c:411-441 (name + reuse-if-exists) + src/cmd.c:455-462 (join rest into value) | `for (a = cmd_alias_hash[key] ; a ; a=a->hash_next){ if (!strcasecmp(a->name, s)){ Q_free (a->value); break; } }` ... `for (i=2 ; i<c ; i++){ if (i > 2) strlcat (cmd, " ", ...); strlcat (cmd, Cmd_Argv(i), ...);} a->value = Q_strdup (cmd);` | MATCH |
| 6 | Aliases are local to the server console; not sent to connecting clients | src/cmd.c (cmd_alias list consumed only in cmd.c; no networking site) + src/sv_user.c:3399-3424 (client cmds match only ucmds[]; alias absent; fall to PR cmd or "Bad user command", never Cmd_ExecuteString) | `for (u=ucmds ; u->name ; u++){ if (!strcmp (Cmd_Argv(0), u->name)) ...}` ... `if (SV_ExecutePRCommand()) goto out;` ... `else Con_Printf("Bad user command: %s\n", Cmd_Argv(0));` -- ucmds[] (sv_user.c:3299-3384) has no "alias" entry | MATCH |
| 7 | Commonly defined in server config files | src/cmd.c:353 (exec routes file text through same buffer -> Cmd_ExecuteString) | `Cbuf_InsertText (f);` (Cmd_Exec_f) -- configs CAN set aliases via the same path; "commonly" is a usage convention, traceable as possible | MATCH (usage claim) |
| 8 | Set by: server config / console / rcon (admin only) | src/cmd.c:706 (Cmd_AddCommand carries NO access flag) + src/sv_main.c:1701-1828 (rcon reaches Cmd_ExecuteString only after Rcon_Validate; alias not in blocklist 1754-1764) + clause 6 (clients excluded) | `void Cmd_AddCommand (const char *cmd_name, xcommand_t function)` (no flag arg) ; `else if (Rcon_Validate (remote_command, rcon_password.string)){ admin_cmd = true; ...}` ... `Cmd_ExecuteString(str);` | MATCH |

**V-pass notes:** VERSION CONFIRMED: git describe --tags == 1.11-53-g18d0362.

Classification: TRACED-CLEAN. All 8 clauses map to located, verified enforcing lines (registration in src/cmd.c, runtime expansion in Cmd_ExecuteString, semicolon handling in Cbuf_ExecuteEx, access topology across sv_main.c/sv_user.c). No clause is name/string/enum inference without a read-site; no clause contradicts its enforcing line.

Implementation summary (for reviewer):
- Registration: src/cmd.c:1070 Cmd_AddCommand("alias", Cmd_Alias_f). mvdsv's Cmd_AddCommand (src/cmd.c:706) takes NO access-control flag -- there is NO CF_ flag system here (unlike KTX). Access is therefore purely a function of dispatch path, which is exactly how the description frames clause 8 (console/rcon, clients excluded).
- Storage: Cmd_Alias_f (src/cmd.c:393) -- c==1 lists; otherwise Argv(1)=name (case-insensitive reuse via strcasecmp at :436), Argv(2..) space-joined into value (:455-462). MAX_ALIAS_NAME=32 cap at :412 (omitted from description -- acceptable for a user-doc).
- Runtime: Cmd_ExecuteString (src/cmd.c:916) dispatch order = real command -> cvar -> alias (:949) -> PR_ConsoleCmd -> "Unknown command". Alias match re-enqueues value into the command buffer (:953-954), which is re-parsed -> "as if typed directly" is exact.
- Semicolon nuance (clause 3): only ENFORCED detail worth a caveat. The buffer line-splitter treats `;` outside quotes as a line break (:178). A single separator (cmd1 ; cmd2) runs BOTH commands (semicolon state 0->1 on the `;`, then 1->3 on `\n`; neither >1 so both execute). The "security hole" suppression at :235-237 fires only when a SECOND `;` arrives with no intervening `\n` (state 1->2), i.e. the ktpro `fkick "N;quit"` arg-injection class. So "multiple commands separated with semicolons" is true for normal usage; the description does not over-claim. Kept TRACED-CLEAN rather than NEAR-MISS because the common-path behavior the sentence describes is correct and the suppressed case is an adversarial edge, not the documented behavior.
- Client exclusion (clause 6): sv_user.c:3299-3384 ucmds[] table has no "alias"; SV_ExecuteUserCommand (:3399) routes unmatched client cmds to the QC ClientCommand then "Bad user command" -- never to Cmd_ExecuteString. The cmd_alias linked list is consumed only inside src/cmd.c (no serialization to clients). NOTE: the common.c a->name/a->value hits (lines 1246-1550) are the info_t userinfo struct, a DIFFERENT type -- not the command-alias table; ruled out as a use-site.
- rcon (clause 8): sv_main.c:1701-1828. Both master-rcon and normal-rcon paths reach Cmd_ExecuteString after Rcon_Validate (password). "alias" is NOT in the normal-rcon blocklist (:1754-1764), so admin rcon can run it. rcon == password-gated == "admin only" is accurate.

PROC-1: no residual judgment calls; every clause reduces to a checkable fact at its enforcing line.

## flags_for_review

- [fyi/runtime-dead-suspect/vpass] src/sv_ccmds.c:817 references Cmd_AliasString("kick") and Cmd_FindAlias("kick"), but NEITHER symbol is defined anywhere in src/. The reference sits inside #ifndef SERVERONLY (sv_ccmds.c:812-819, comment: 'some mods use a kick alias for their own needs'). MVDSV (dedicated server) builds with SERVERONLY defined, so this block is compiled out -- which is why the symbols have no server-build definition. Off-scope for the alias description (does not change any clause), but flagged so it is not mistaken for a missing-definition bug in the server tree. Consistent with the 'extraction proves presence not liveness' caveat: a referenced symbol in a compiled-out branch is dead in this build.
- [fyi/suspected-bug/vpass] Semicolon-suppression state machine (src/cmd.c:161,178-200,235) is a documented 'EXPERIMENTAL / security bugfix in ktpro' anti-injection guard, not a clean separator design. It blocks only the SECOND consecutive `;` within one buffered line-run; a single `cmd1 ; cmd2` separator works normally. Behavior is correct for the threat it targets, but the coupling between the per-call 'semicolon' state reset (line 161) and aliases that re-insert text into the SAME Cbuf_ExecuteEx loop iteration means alias-expanded semicolon sequences inherit the carried state. No defect observed for normal alias usage; flagged as fyi because the interaction is subtle and any future change to the separator policy (the :1743-1745 comment explicitly warns about re-enabling semicolons) would affect what multi-command aliases do.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "alias",
  "type": "command",
  "description": "Defines a named shortcut on the server console that runs one or more commands when its name is typed. The named commands are run as if typed directly; multiple commands are separated with semicolons.\n\nalias = with no arguments, list all currently defined aliases and what they run.\nalias <name> <command-string> = create or replace the alias <name> so that typing <name> runs <command-string>.\n\nAliases are local to the server console (they are not sent to connecting clients) and are commonly defined in server config files.\n\nSet by: server config / console / rcon (admin only).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cmd.c:462. Handler Cmd_Alias_f registered Cmd_AddCommand-only at cmd.c:1070 (not in ucmds[] sv_user.c:3299; SV_ExecuteUserCommand sv_user.c:3399 no fall-through -> a client 'cmd alias' is rejected; admin/console-only). Not on the normal-rcon blocklist (sv_main.c:1754-1764) -> plain console/rcon; also usable in server config files since exec routes through the same command buffer. No-arg path lists aliases ('Current alias commands:' name:value) cmd.c:403-408. Define/replace: name capped at MAX_ALIAS_NAME (cmd.h:160 = 32, so <=31 chars; 'Alias name is too long' cmd.c:412-416 -- a rarely-hit edge, omitted from user doc); existing alias reused/freed cmd.c:434-441; value = args 2..N joined by single spaces cmd.c:454-462. Execution: when a typed command matches an alias name, its stored value is inserted into the command buffer and run (Cbuf_InsertText) cmd.c:949-956. Semicolon-separated chaining: the value is a command STRING parsed by the command buffer (header comment cmd.c:389 'executes a command string (possibly ; seperated)') -- traced to Cbuf_InsertText at cmd.c:954 which feeds the standard cbuf tokenizer that already splits on ';'. Server-local (defined in the server's own cmd_alias list, never pushed to clients) cmd.c:443-451. F-MV1: no KTX override (grep ktx/src empty). No registered default for a command. Worked example: 'alias bigmap \"map dm6; say next map: dm6\"' makes typing bigmap load dm6 then print a message.",
  "description_proposed": null
}
```
