# Ledger -- qwfwd `cvarlist` (command)

Handler `Cvar_CvarList_f`, src/cvar.c:416-428; registered src/cvar.c:524.
SR-7: arrived carrying a `source_inline` stub ("List all cvars TODO: ...").
Stub IGNORED; synthesized fresh from the handler body. End-state origin = `synthesized`.

## Enforce-trace (per clause)

- "lists every cvar registered on the proxy" -- src/cvar.c:421 iterates the
  `cvar_vars` linked list head to tail (`for (var=cvar_vars,...; var; var=var->next)`),
  printing one line per node (src/cvar.c:422-425). TRACED.
- "a `*` marks cvars saved to config (archived)" -- src/cvar.c:423
  `var->flags & CVAR_ARCHIVE ? '*' : ' '`. CVAR_ARCHIVE = (1<<0), src/cvar.h:58
  (comment names it the archive bit). TRACED.
- "an `s` marks cvars mirrored to the server info string" -- src/cvar.c:424
  `var->flags & CVAR_SERVERINFO ? 's' : ' '`. CVAR_SERVERINFO = (1<<1),
  src/cvar.h:59 comment "// mirrored to serverinfo". TRACED.
- "prints a total count at the end" -- src/cvar.c:427
  `Sys_Printf("------------\n%d variables\n", i)`, where `i` is the loop counter
  incremented per node (src/cvar.c:421). TRACED.
- "takes no arguments" -- handler reads NO argv; the only mask hint is the
  `TODO: allow cvar name mask as a parameter` (src/cvar.c:414), i.e. the mask is
  NOT implemented. Asserting a mask arg would be a flavour-C string/comment
  inference -> FORBIDDEN. Described as no-arg. TRACED-CLEAN.
- "Set by: server console / config" -- per the verified access model: QWFWD has
  no access-class tiers and no own rcon; commands are invoked from the proxy
  console / qwfwd.cfg. No per-command access gate exists in the dispatch path
  (cmd.c command-execute carries no CF_-style flag check). TRACED.

No "Default:" line (D20: command, no meaningful no-arg default to state).

```json
{
  "project": "qwfwd",
  "knob": "cvarlist",
  "type": "command",
  "description": "Lists every cvar currently registered on the proxy, one per line. Each line is prefixed by two status columns: a '*' if the cvar is saved to the config file (archived), and an 's' if the cvar is mirrored into the server info string. The list ends with a count of how many cvars exist. Takes no arguments.\n\nSet by: server console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Synthesized fresh from handler Cvar_CvarList_f (src/cvar.c:416-428); SR-7 source_inline stub ('List all cvars TODO: allow cvar name mask...') ignored, not affirmed. Enforce-trace: list iterates cvar_vars head-to-tail (src/cvar.c:421); per line two flag columns then name (src/cvar.c:422-425); '*' = CVAR_ARCHIVE bit 1<<0 (src/cvar.c:423, flag def src/cvar.h:58); 's' = CVAR_SERVERINFO bit 1<<1 (src/cvar.c:424, flag def + comment 'mirrored to serverinfo' src/cvar.h:59); trailing '%d variables' count from loop counter i (src/cvar.c:427). No-arg: handler reads no argv; the cvar-name-mask is an UNIMPLEMENTED TODO (src/cvar.c:414), so a mask parameter is deliberately NOT described (would be a comment-string flavour-C inference). Set-by per verified QWFWD access model (no access tiers, no own rcon; console/config dispatch; no per-command access gate in cmd.c dispatch). D20: no Default line for a no-arg command.",
  "description_proposed": null
}
```
