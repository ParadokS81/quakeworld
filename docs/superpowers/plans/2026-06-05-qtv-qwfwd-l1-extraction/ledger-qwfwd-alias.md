# QWFWD describe-fill ledger -- `alias` (command)

Handler `Cmd_Alias_f` (`src/cmd.c:407-463`); registered `src/cmd.c:1073`.
Anchor `1.40-dev`. SR-7: prior `source_inline` stub ("Creates a new command
... possibly ; seperated") IGNORED; synthesized fresh from the handler.
End-state origin = `synthesized`.

## Enforce-trace (per clause)

| Clause | Enforcing line | Snippet | Verdict |
|---|---|---|---|
| No-arg form lists current aliases | cmd.c:416-421 | `if (c == 1){ ... for (a=cmd_alias; a; a=a->next) Sys_Printf("%s : %s\n\n", a->name, a->value); return; }` | MATCH |
| `alias <name> <command...>` creates/redefines | cmd.c:424,455-462 | `s = Cmd_Argv(1); ... for(i=2;i<c;i++){ strlcat(cmd, Cmd_Argv(i)...) } a->value = Sys_strdup(cmd);` | MATCH |
| Redefining an existing name replaces its command | cmd.c:434-441 | `for (a=cmd_alias_hash[key];a;a=a->hash_next){ if(!stricmp(a->name,s)){ Sys_free(a->value); break; } }` | MATCH |
| Multiple commands joined with spaces (so `;`-separated chains work) | cmd.c:455-460 | `for(i=2;i<c;i++){ if(i>2) strlcat(cmd," ",...); strlcat(cmd, Cmd_Argv(i),...); }` | MATCH |
| Name longer than 31 chars is rejected | cmd.c:425-429 + cmd.h:135 (`#define MAX_ALIAS_NAME 32`) | `if (strlen(s) >= MAX_ALIAS_NAME){ Sys_Printf("Alias name is too long\n"); return; }` | MATCH |
| A name matching a built-in command or cvar is shadowed (alias never reached) | cmd.c:886-910 (Cmd_ExecuteString dispatch order: functions -> cvars -> aliases) | functions loop (886) then `if (Cvar_Command()) return;` (898) then alias loop (902) | MATCH -- action-changing, kept inline |
| Invoking the alias runs its stored command string | cmd.c:906-907 | `Cbuf_InsertText ("\n"); Cbuf_InsertText (a->value);` | MATCH |
| Name match is case-insensitive | cmd.c:436 (`stricmp`) + Key() cmd.c (`v += c &~ 32`) | `if (!stricmp(a->name, s))` | MATCH (supports "redefines" being case-insensitive) |

`Set by:` -- registered with plain `Cmd_AddCommand` (cmd.c:1073); QWFWD has
no access-flag system (`Cmd_AddCommand(char*, xcommand_t)`, cmd.h:96 -- no
flags arg). Commands are read from the proxy's stdin console (peer.c:235
`Sys_ReadSTDIN` -> Cmd_ExecuteString) or from `qwfwd.cfg` exec'd at startup
(main.c:142 `Cbuf_InsertText("exec qwfwd.cfg\n")`). -> "server console / config".

`description_reasoning` keeps all file:line out of `description` (D20 hard split).
TRACED-CLEAN: every clause maps to a verified enforcing line incl. the
shadowing dispatch order. No name-only / comment-only clause asserted.

```json
{
  "project": "qwfwd",
  "knob": "alias",
  "type": "command",
  "description": "Defines a named shortcut that runs one or more proxy commands. With no arguments, lists all aliases currently defined.\n\nalias <name> <command> [; <command> ...] = create an alias called <name> that runs the given command string (multiple commands can be chained with ';'). Defining an alias whose name already exists replaces its command. Names are matched without regard to case and may be up to 31 characters long.\n\nA built-in command or variable of the same name takes priority, so an alias named after one will never run.\n\nSet by: server console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Synthesized fresh from Cmd_Alias_f (src/cmd.c:407-463) per SR-7; prior source_inline stub ignored. No-arg lists aliases (cmd.c:416-421). Create/redefine: name from Cmd_Argv(1) (cmd.c:424), command from args 2..c joined by spaces (cmd.c:455-460, strlcat with leading space when i>2 -> chained ';'-separated commands packed into one value), stored a->value=Sys_strdup(cmd) (cmd.c:462). Redefine reuses the existing entry and frees the old value (cmd.c:434-441), matched case-insensitively via stricmp (cmd.c:436) consistent with the case-insensitive Key() hash (v += c &~ 32). Name length cap: strlen(s) >= MAX_ALIAS_NAME rejects (cmd.c:425-429); MAX_ALIAS_NAME=32 (cmd.h:135) -> max 31 usable chars. Shadowing is action-changing so kept inline: Cmd_ExecuteString matches built-in functions (cmd.c:886-895) then cvars (cmd.c:898) BEFORE aliases (cmd.c:902-910); an alias colliding with a built-in/cvar is never reached. Invocation expands a->value into the command buffer (cmd.c:906-907 Cbuf_InsertText). Set-by: Cmd_AddCommand has no access flags (cmd.h:96 signature char*,xcommand_t); commands come from proxy stdin console (peer.c:235 Sys_ReadSTDIN) or qwfwd.cfg exec'd at startup (main.c:142). TRACED-CLEAN.",
  "description_proposed": null
}
```
