# Ledger -- qwfwd `serverinfo` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction | **Phase:** 3 describe-fill
**Project:** qwfwd | **Anchor:** 1.40-dev
**Handler:** `SV_Serverinfo_f` (src/main.c:39-90) | **Registered:** src/main.c:137
**Verdict:** synthesized | **Class:** TRACED-CLEAN

SR-7: arrived carrying a `source_inline` stub ("Examine or change the serverinfo
string" -- the function-header comment at src/main.c:36). Stub IGNORED; synthesized
fresh from the handler body. End-state origin = `synthesized` (NOT affirmed).

## Enforce-trace (per-clause)

| Clause | Enforcing file:line | Snippet | Result |
|---|---|---|---|
| No arg: prints ALL serverinfo key/value pairs | src/main.c:45-50 | `if (Cmd_Argc() == 1) { Sys_Printf("Server info settings:\n"); Info_Print(ps.info); ...}` | MATCH -- Info_Print (src/info.c) walks the whole `\key\value\` string |
| No arg: also prints used/total byte size | src/main.c:49 | `Sys_Printf("[%d/%d]\n", strlen(ps.info), sizeof(ps.info));` | MATCH -- bytes used vs buffer capacity |
| One arg: prints the value of that single key | src/main.c:53-62 | `if (Cmd_Argc() == 2) { s = Info_ValueForKey(...); if (*s) Sys_Printf("Serverinfo %s: \"%s\"\n",...) else Sys_Printf("No such key %s\n",...) }` | MATCH -- single-key lookup, "No such key" when empty |
| Two args: sets `<key>` to `<value>` | src/main.c:65-89 | `key = Cmd_Argv(1); value = Cmd_Argv(2); ... Info_SetValueForKey(ps.info, key, value, ...)` | MATCH -- 3-token form writes the pair |
| Setting a `*`-prefixed key is rejected | src/main.c:74-78 | `if (key[0] == '*') { Sys_Printf("Star variables cannot be changed.\n"); return; }` | MATCH -- star keys are read-only |
| If the key is also a server-info cvar, the cvar is updated (and mirrored back) | src/main.c:81-85 ; src/cvar.c:184-189 | `var = Cvar_Find(key); if (var && (var->flags & CVAR_SERVERINFO)) Cvar_Set(var->name, value);` -> Cvar_Set2 mirrors into ps.info via `Info_SetValueForStarKey` | MATCH -- cvar path keeps cvar+info in sync |
| CVAR_SERVERINFO is the "mirrored to serverinfo" flag | src/cvar.h:59 | `#define CVAR_SERVERINFO (1<<1) // mirrored to serverinfo` | MATCH |
| Wrong arg count (>3) prints usage | src/main.c:65-69 | `if (Cmd_Argc() != 3) { Sys_Printf("Usage: serverinfo [ <key> [ <value> ] ]\n"); return; }` | MATCH (guards the >3 case; 1 and 2 already returned above) |
| Set by: server console / config (no access tiers) | src/main.c:137 ; src/cmd.c:693 | `Cmd_AddCommand("serverinfo", SV_Serverinfo_f);` ; `void Cmd_AddCommand (char *cmd_name, xcommand_t function)` | MATCH -- name+function only; no access-class flag |

## Notes
- The command BOTH examines (0 or 1 arg) AND changes (2 args) the proxy's server
  info string -- the description states both modes, per SR-7's instruction to trace
  whether it examines and sets.
- D20 hard split: no file:line / `CVAR_SERVERINFO` / `ps.info` jargon in the
  `description`; the cvar-mirroring mechanism (src/main.c:81-85 + src/cvar.c:184-189)
  is stated as the user-observable "if the key is also a setting the proxy publishes,
  that setting is updated too" and the trace lives here / in reasoning.
- The `\key\value\` info-string format and `Info_Print` 20-col padding (src/info.c)
  are presentation internals -> omitted from the user doc per D20.
- "Default:" omitted per D20 command rule.
- No suspect-pool membership (suspect_pool_member=FALSE); no mechanical candidate
  beyond the SR-7 stub (rejected). Cold synthesis from the handler body.

```json
{
  "project": "qwfwd",
  "knob": "serverinfo",
  "type": "command",
  "description": "Examines or changes the proxy's server info -- the set of key/value details (such as hostname, country, and coordinates) the proxy advertises about itself.\n\nserverinfo = print every key/value pair, plus how much of the info buffer is used.\nserverinfo <key> = print the value of one key (or report that no such key is set).\nserverinfo <key> <value> = set that key to that value. Keys beginning with '*' are read-only and cannot be changed. If the key is also one of the proxy's published settings, that setting is updated as well so the two stay in sync.\n\nSet by: server console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "SR-7: row arrived with a source_inline stub ('Examine or change the serverinfo string', the function-header comment src/main.c:36); stub IGNORED, synthesized fresh from handler SV_Serverinfo_f (src/main.c:39-90); end-state origin=synthesized (not affirmed). suspect_pool_member=FALSE. Three argc branches enforce-traced: argc==1 (src/main.c:45-50) prints all pairs via Info_Print(ps.info) plus '[used/total]' bytes (strlen vs sizeof, src/main.c:49); argc==2 (src/main.c:53-62) prints one key via Info_ValueForKey, 'No such key' when empty; argc==3 (src/main.c:65-89) sets the pair. Set path: '*'-prefixed keys rejected ('Star variables cannot be changed', src/main.c:74-78); Cvar_Find(key) and if (var->flags & CVAR_SERVERINFO) Cvar_Set(var->name,value) (src/main.c:81-85), else Info_SetValueForKey directly (src/main.c:88). The cvar branch keeps cvar+info synced because Cvar_Set2 (src/cvar.c:184-189) mirrors a CVAR_SERVERINFO cvar back into ps.info via Info_SetValueForStarKey; CVAR_SERVERINFO=(1<<1) '// mirrored to serverinfo' (src/cvar.h:59) -- hence 'if the key is also one of the proxy's published settings, that setting is updated too'. The published keys are the CVAR_SERVERINFO cvars registered in src/main.c:127-133 (hostname, maxclients, hostport, countrycode, city, coords, plus readonly *version) -- the 'hostname, country, coordinates' examples. argc>3 falls to the usage line (src/main.c:65-69). D20: file:line / CVAR_SERVERINFO / ps.info / the \\key\\value\\ format and Info_Print padding kept out of description (jargon/presentation), stated as user-observable effects. Set-by per verified QWFWD access model: registration src/main.c:137 via Cmd_AddCommand(char*, xcommand_t) (src/cmd.c:693), name+function only, no access-class flag; QWFWD has no access tiers and no own rcon -- console/config dispatch. D20: no Default line for a command.",
  "description_proposed": null
}
```
