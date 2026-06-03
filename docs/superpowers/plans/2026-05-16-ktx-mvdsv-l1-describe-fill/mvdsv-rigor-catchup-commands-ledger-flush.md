# describe-fill-synthesis ledger -- mvdsv `flush`

- **project:** mvdsv
- **knob:** `flush` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `hedged` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:flush: hedged -- admin cache-flush; legible free-loop at zone.c:537 but cache unpopulated on SERVERONLY build (no-op), texture branch compiled out -- origin=synthesized ref=src/zone.c:535 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Frees all data held in the engine's memory cache, forcing it to be reloaded on next use. On a dedicated server this cache is not populated by anything, so the command has no observable effect; it is a leftover of the shared Quake memory allocator.
>
> Default: no arguments.
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered as admin command (not client-issuable) | src/zone.c:592 | `Cmd_AddCommand("flush", Cache_Flush);` | MATCH (absent from ucmds[] sv_user.c:3315-3380) |
| not on normal-rcon blocklist -> console/rcon | src/sv_main.c:1754-1764 | blocklist token list; flush absent | MATCH |
| frees every cache entry until list empty | src/zone.c:537-539 | `while (cache_head.next != &cache_head) { Cache_Free(cache_head.next->user); }` | MATCH |
| texture-clear side effect is client-only (compiled out) | src/zone.c:540-542 + CMakeLists.txt:169 | `#ifndef SERVERONLY\n Mod_ClearSimpleTextures();\n#endif` ; `... PRIVATE SERVERONLY` | MATCH (branch excluded in dedicated build) |
| cache has no producers on the server (no-op) | src/fs.c:488 | `// well, mvdsv does not use cache anyway.` + `// Cache_Flush ();` commented; Cache_Alloc has no consumers outside zone.c | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| C1 | "Frees all data held in the engine's memory cache, forcing it to be reloaded on next use" | src/zone.c:535-539 (handler) + src/zone.c:532 (comment) | `void Cache_Flush(void) { while (cache_head.next != &cache_head) { Cache_Free(cache_head.next->user); } ...}` ; comment: `Throw everything out, so new data will be demand cached` | MATCH |
| C2 | "On a dedicated server this cache is not populated by anything, so the command has no observable effect" | producer src/zone.c:653 `Cache_Alloc` has ZERO external callers (grep tree-wide); `cache_user_t` confined to zone.c/zone.h only; SERVERONLY always set src/CMakeLists.txt:169. Corroborated by maintainer comments src/fs.c:487 and src/fs.c:594 | `target_compile_definitions(${PROJECT_NAME} PRIVATE SERVERONLY)` ; fs.c: `// well, mvdsv does not use cache anyway.` `//\tCache_Flush ();` | MATCH |
| C3 | "it is a leftover of the shared Quake memory allocator" | src/zone.c:1-2 (id copyright), src/zone.c:20, src/zone.c:540-542 (client-shared branch) | `Copyright (C) 1996-1997 Id Software, Inc.` ; `// zone.c - memory management` ; `#ifndef SERVERONLY\n\tMod_ClearSimpleTextures();\n#endif` (the client populates+uses this same cache; server inherits allocator+command, not the data) | MATCH (provenance framing, defensible) |
| C4 | "Default: no arguments" | src/zone.c:592 | `Cmd_AddCommand("flush", Cache_Flush);` -- it is a command (not a cvar); handler `Cache_Flush(void)` takes/ignores all args. No RegisterCvar default applies. | MATCH |
| C5 | "Set by: server console / rcon" | registration src/zone.c:592 (plain Cmd_AddCommand, NOT in client ucmds[] sv_user.c:3299); rcon dispatch src/sv_main.c:1828 after Rcon_Validate src/sv_main.c:1701/1708; not in rcon blacklist sv_main.c:1754-1764 | `Cmd_ExecuteString(str);` (validated-rcon path) ; flush absent from blacklist tokens | MATCH |
| (reachability) | Command actually registered at runtime (not dead) | src/sv_main.c:3948 -> src/zone.c:705 -> src/zone.c:586 (`#ifndef WITH_DP_MEM`, never defined) -> src/zone.c:592 | `Memory_Init(...) -> Cache_Init() -> Cache_Init_Commands() -> Cmd_AddCommand("flush", Cache_Flush)` | MATCH |

**V-pass notes:** VERDICT: TRACED-CLEAN. All five material clauses + runtime reachability map to located, verified enforcing lines incl. adjacent comments.

Oracle confirmed: git describe == 1.11-53-g18d0362.

Trace highlights (the load-bearing finds):
- C1 (clears entire cache, demand-reload on next use): handler at zone.c:535-539 walks cache_head linked list calling Cache_Free on every node until empty. The function's own comment (zone.c:532) literally says "Throw everything out, so new data will be demand cached" -- the description's wording is a faithful paraphrase. The `Mod_ClearSimpleTextures()` extra step is `#ifndef SERVERONLY`, so on the dedicated build the handler does ONLY the free-loop.
- C2 (cache never populated on a dedicated server -> no observable effect): the ONLY function that adds to this cache is Cache_Alloc (zone.c:653). Tree-wide grep finds ZERO external callers; `cache_user_t` (the owner type) is confined to zone.c + zone.h; no `->data` assignment outside zone.c. So the producer side is unreachable on this build, the cache is provably always empty, and `flush` therefore frees nothing. This is corroborated -- not just inferred -- by MVDSV's own maintainer comments at fs.c:487 and fs.c:594: "// well, mvdsv does not use cache anyway." next to a deliberately commented-out `// Cache_Flush ();`. SERVERONLY is unconditionally defined (CMakeLists.txt:169), so "dedicated server" == the only build that exists.
- C3 (leftover of shared Quake memory allocator): zone.c header is id Software 1996-1997 copyright, "zone.c - memory management"; the cache subsystem is the verbatim id-Quake hunk/cache LRU allocator. The `#ifndef SERVERONLY` branch (zone.c:540-542) shows the client side genuinely uses this cache (textures via Mod_ClearSimpleTextures); the SERVERONLY build inherits the allocator and its `flush` command without ever populating the cache. The "leftover/shared allocator" framing is an accurate provenance characterization, not a name-inferred guess.
- C4 (no arguments / default): `flush` is a COMMAND, not a cvar -- WI2 RegisterCvar-default check is N/A; the handler signature `Cache_Flush(void)` ignores any args. "Default: no arguments" is the correct command-shaped metadata line.
- C5 (server console / rcon): plain Cmd_AddCommand registration, NOT present in the client `ucmds[]` table (sv_user.c:3299) -- so it is a console/rcon command, not a player command. Validated rcon routes through Cmd_ExecuteString (sv_main.c:1828) and `flush` is not in the rcon blacklist (sv_main.c:1754-1764), so it is reachable via rcon. Matches an unflagged Cmd_AddCommand command exactly.

Runtime reachability sub-gate PASSED: startup chain sv_main.c:3948 Memory_Init -> zone.c:705 Cache_Init -> zone.c:586 Cache_Init_Commands -> zone.c:592 Cmd_AddCommand. The registration is inside `#ifndef WITH_DP_MEM`, and WITH_DP_MEM is never defined anywhere in src/ or the build system, so the command IS registered. Not WI2-dead.

PROC-1 judgment surfaced (does NOT downgrade the row): the description's two-part structure states general cache-clearing semantics (C1) and then qualifies that the cache is empty on a server (C2). Read together this is accurate and well-formed; a reader taking C1 in isolation might think `flush` frees live engine data on a running server, but C2 immediately resolves that. This is a presentation nuance, not a flavour-C defect -- every clause traces to enforcing code and adjacent comments. No edit required.

## flags_for_review

- [fyi/runtime-dead-suspect/synthesis] 'flush' (Cache_Flush, zone.c:535) is registered on the dedicated mvdsv server but the cache it operates on has no producers: Cache_Alloc has zero call sites outside zone.c, and FS_SetGamedir's source comment says 'mvdsv does not use cache anyway' (fs.c:488) with the only would-be flush call commented out. The command is effectively a no-op on the server -- a registered-but-functionally-inert legacy of the shared Quake zone allocator. Not a code bug (it does what it says), but a candidate runtime-dead/vestigial command worth a human note.
- [fyi/runtime-dead-suspect/vpass] flush handler Cache_Flush (zone.c:535) is reachable at runtime, but the cache it operates on is provably never populated on the SERVERONLY build (Cache_Alloc at zone.c:653 has zero callers tree-wide; cache_user_t confined to zone.c/.h). Confirmed by MVDSV's own source comment 'well, mvdsv does not use cache anyway' at fs.c:487 and fs.c:594. The command is effectively a no-op on every shipped MVDSV build -- a runtime-dead-effect command (registered and callable, but with no observable effect). The proposed description already states this correctly; flagging only so the oracle is aware this is a vestigial/no-op command, consistent with the c3-cmdlist-blind class of 'present but inert' entities.
- [fyi/off-scope-entity/vpass] Companion commands cache_print (zone.c:593 -> Cache_Print) and cache_report (zone.c:594 -> Cache_Report) are registered in the same Cache_Init_Commands block and share the same empty-cache fate: cache_print iterates the always-empty cache_head list (prints nothing), cache_report reports hunk free/total only. If these are also in the describe-fill knob set, they warrant the same 'vestigial on dedicated server' framing as flush. Off-scope for this row (knob was flush) -- noted for batch consistency.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "flush",
  "type": "command",
  "description": "Frees all data held in the engine's memory cache, forcing it to be reloaded on next use. On a dedicated server this cache is not populated by anything, so the command has no observable effect; it is a leftover of the shared Quake memory allocator.\n\nDefault: no arguments.\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "hedged",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/zone.c:535. Registration: Cmd_AddCommand(\"flush\", Cache_Flush) at zone.c:592 (inside Cache_Init_Commands) -- Cmd_AddCommand only, NOT in ucmds[] (sv_user.c:3315-3380), so admin-only. Not on the normal-rcon blocklist (sv_main.c:1754-1764), so Set-by = server console / rcon. Handler Cache_Flush (zone.c:535-543): the while-loop walks cache_head and calls Cache_Free on every linked entry until the list is empty (zone.c:537-539) -- 'reclaim the space'. The Mod_ClearSimpleTextures() side-effect is under '#ifndef SERVERONLY' (zone.c:540-542); mvdsv is built SERVERONLY (CMakeLists.txt:169 target_compile_definitions(... PRIVATE SERVERONLY)), so that texture branch is compiled OUT of the dedicated server -- I do NOT assert it (flavour-C guard). The cache the loop empties has NO producers on the server: Cache_Alloc has no call sites outside zone.c itself (grep), and FS_SetGamedir's own source comment states 'well, mvdsv does not use cache anyway' with the Cache_Flush() call commented out (fs.c:488, also fs.c:595). So the legible behavior is 'free all cached data entries', but on the dedicated build that cache is unpopulated, making the command an effective no-op -- I state both honestly rather than claim a user-visible reload (hedged: the source-legible action is the free-loop; the absence of any observable result is itself the finding). F-MV1: KTX grep clean (no 'flush' in ktx/src cmds).",
  "description_proposed": null
}
```
