# QWFWD describe-fill ledger -- `unaliasall` (command)

Handler `Cmd_UnAliasAll_f` (`src/cmd.c:535-549`); registered `src/cmd.c:1077`.
Anchor `1.40-dev`. Cold synth (no source_inline stub on this knob).

## Enforce-trace (per clause)

| Clause | Enforcing line | Snippet | Verdict |
|---|---|---|---|
| Removes every alias | cmd.c:539-545 | `for (a=cmd_alias; a; a=next){ next=a->next; Sys_free(a->value); Sys_free(a); } cmd_alias = NULL;` | MATCH |
| Takes no arguments (ignores any) | cmd.c:535-549 (no Cmd_Argc / Cmd_Argv use anywhere in the body) | whole body iterates the list unconditionally | MATCH |
| Leaves no aliases defined afterward | cmd.c:545,548 | `cmd_alias = NULL; ... memset(cmd_alias_hash, 0, sizeof(cmd_alias_hash));` | MATCH |

`Set by:` -- plain `Cmd_AddCommand` (cmd.c:1077), no access flags; proxy
stdin console or `qwfwd.cfg`. -> "server console / config".

TRACED-CLEAN. The body reads no arguments at all (no Cmd_Argc/Cmd_Argv),
so "takes no arguments" is enforced by absence; both the linear list
(cmd.c:545) and the hash table (cmd.c:548) are cleared, so nothing survives.

```json
{
  "project": "qwfwd",
  "knob": "unaliasall",
  "type": "command",
  "description": "Removes every alias at once, leaving none defined. Takes no arguments.\n\nSet by: server console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Synthesized from Cmd_UnAliasAll_f (src/cmd.c:535-549). Walks the entire cmd_alias list freeing each value and node (cmd.c:539-544), sets cmd_alias=NULL (cmd.c:545), then memset-clears the cmd_alias_hash table (cmd.c:548) -> no alias survives. The handler body references no Cmd_Argc/Cmd_Argv, so it takes (and ignores) no arguments -- enforced by absence. Set-by: Cmd_AddCommand has no access flags (cmd.h:96); commands come from proxy stdin console (peer.c:235) or qwfwd.cfg (main.c:142). TRACED-CLEAN.",
  "description_proposed": null
}
```
