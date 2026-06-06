# QWFWD describe-fill ledger -- `unalias` (command)

Handler `Cmd_UnAlias_f` (`src/cmd.c:513-532`); registered `src/cmd.c:1078`.
Anchor `1.40-dev`. Cold synth (no source_inline stub on this knob).

## Enforce-trace (per clause)

| Clause | Enforcing line | Snippet | Verdict |
|---|---|---|---|
| Takes exactly one argument: the alias name | cmd.c:517-521 | `if (Cmd_Argc() != 2){ Sys_Printf("unalias <alias>: erase an existing alias\n"); return; }` | MATCH |
| Removes that single named alias | cmd.c:523,530 | `s = Cmd_Argv(1); ... if (!Cmd_DeleteAlias(s)) ...` ; Cmd_DeleteAlias unlinks+frees (cmd.c:465-511) | MATCH |
| Unknown name reports an error, removes nothing | cmd.c:530-531 | `if (!Cmd_DeleteAlias(s)) Sys_Printf("Unknown alias \"%s\"\n", s);` | MATCH |
| Name match is case-insensitive | cmd.c:475,493 (`stricmp` in Cmd_DeleteAlias) | `if (!stricmp(a->name, name))` | MATCH |
| Name longer than 31 chars rejected before lookup | cmd.c:524-528 + cmd.h:135 | `if (strlen(s) >= MAX_ALIAS_NAME){ ... return; }` | MATCH (omitted from user prose -- edge case, not action-changing) |

`Set by:` -- plain `Cmd_AddCommand` (cmd.c:1078), no access flags; proxy
stdin console or `qwfwd.cfg`. -> "server console / config".

TRACED-CLEAN. Removal semantics traced into the callee Cmd_DeleteAlias
(cmd.c:465-511): unlinks from both the hash bucket and the linear list, frees
value+node, returns false when not found (cmd.c:487-488) which drives the
"Unknown alias" message. No name-only clause asserted.

```json
{
  "project": "qwfwd",
  "knob": "unalias",
  "type": "command",
  "description": "Removes a single alias by name.\n\nunalias <name> = delete the alias called <name>. If no alias by that name exists, prints an error and removes nothing. The name is matched without regard to case.\n\nSet by: server console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Synthesized from Cmd_UnAlias_f (src/cmd.c:513-532). Requires exactly one arg or prints usage (cmd.c:517-521, Cmd_Argc()!=2). Deletes the named alias via Cmd_DeleteAlias(s) (cmd.c:530); the callee (cmd.c:465-511) unlinks the entry from both the hash bucket and the linear cmd_alias list and frees value+node, returning false when the name is absent (cmd.c:487-488). On false, prints 'Unknown alias \"%s\"' (cmd.c:530-531) -> the no-op-on-unknown clause. Case-insensitive match: stricmp in Cmd_DeleteAlias (cmd.c:475,493). A name >= MAX_ALIAS_NAME (32, cmd.h:135) chars is rejected before lookup (cmd.c:524-528); omitted from user prose as a non-action-changing edge case, recorded here. Set-by: Cmd_AddCommand has no access flags (cmd.h:96); commands come from proxy stdin console (peer.c:235) or qwfwd.cfg (main.c:142). TRACED-CLEAN.",
  "description_proposed": null
}
```
