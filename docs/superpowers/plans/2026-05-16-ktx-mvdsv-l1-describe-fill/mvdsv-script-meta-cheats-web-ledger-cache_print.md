# describe-fill-synthesis ledger -- mvdsv `cache_print`

- **project:** mvdsv
- **knob:** `cache_print` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:cache_print: synthesized -- admin-only console diagnostic; lists data-cache entries (size+name); cache empty in practice on a dedicated server -- origin=synthesized ref=src/zone.c:551 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Console diagnostic that lists every entry currently held in the server's data-cache memory, one line per entry showing its size in kilobytes and its name. It only reports state; it allocates and frees nothing. Takes no arguments. On a dedicated server the data cache is normally empty, so this typically prints nothing.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| lists each cache entry, one line per entry | src/zone.c:555 | `for (cd = cache_head.next; cd != &cache_head; cd = cd->next)` | yes |
| shows size in kB + name | src/zone.c:556 | `Con_Printf("%5.1f kB : %s\n", (cd->size / (float)(1024)), cd->name);` | yes |
| reports only, mutates nothing | src/zone.c:551-558 | handler body is a single Con_Printf loop, no assignment/free/alloc | yes |
| takes no arguments | src/zone.c:551 | `void Cache_Print(void)` -- no Cmd_Argc/Argv read | yes |
| admin-only (console/rcon), no client path | src/zone.c:593 ; src/sv_user.c:3338-3384 | registered only `Cmd_AddCommand("cache_print", Cache_Print);`; absent from ucmds[] | yes |
| not master-rcon-restricted | src/sv_main.c:1754-1764 | blocklist set does not include cache_print | yes |
| cache empty in practice on server | src/zone.c:333,653 ; CMakeLists.txt:169 | `#ifdef SERVERONLY` wraps cache; Cache_Alloc has no callers outside zone.c; build defines SERVERONLY | yes |
| no KTX override | ktx/src (grep) | grep 'cache_print' in ktx/src returns nothing | yes |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Console diagnostic / command (not a cvar) | src/zone.c:593 ; src/cmd.c:937-938 | `Cmd_AddCommand("cache_print", Cache_Print);` registers as plain command; dispatcher runs `if (cmd->function) cmd->function ();`; output via `Con_Printf` (sv_send.c:146) | MATCH |
| 2 | Lists every entry currently held in server's data-cache memory | src/zone.c:555 | `for (cd = cache_head.next; cd != &cache_head; cd = cd->next) {` — walks the cache_head linked list | MATCH |
| 3 | One line per entry showing size in kilobytes and its name | src/zone.c:556 ; struct src/zone.c:343-345 | `Con_Printf("%5.1f kB : %s\n", (cd->size / (float)(1024)), cd->name);` ; struct has `int size; ... char name[16];` | MATCH |
| 4 | Only reports state; allocates and frees nothing | src/zone.c:551-558 (whole body) | body is a pure read loop; contains no Cache_Alloc / Cache_Free / Cache_TryAlloc call | MATCH |
| 5 | Takes no arguments (args ignored) | src/zone.c:551 ; src/cmd.c:938 | handler signature `void Cache_Print(void)` never reads `Cmd_Argv`/`Cmd_Argc`; dispatcher invokes `cmd->function ()` passing nothing -> extra args silently ignored | MATCH |
| 6 | On dedicated server the data cache is normally empty, so typically prints nothing | tree-wide grep: zero external callers of Cache_Alloc/Cache_Check ; src/zone.c:555 | Only refs to Cache_Alloc/Cache_Check/Cache_TryAlloc are zone.c-internal defs + one internal LRU cross-call (zone.c:364) + zone.h prototypes. No server code ever allocates into the cache, so `cache_head.next == &cache_head` always holds and the loop prints nothing. Hedge ("normally"/"typically") is correctly calibrated. | MATCH |
| 7 | Set by: server console / rcon | src/cmd.c:240 (console/cbuf) ; src/sv_main.c:1701-1828 (rcon) | Console buffer: `Cmd_ExecuteString (line);`. Rcon: `SVC_RemoteCommand` validates master/admin rcon_password then (inside password-gated `do_cmd` block) calls `Cmd_ExecuteString(str)` at sv_main.c:1828. `cache_print` is NOT in the normal-rcon blocklist (sv_main.c:1754-1764). Both reach the same dispatcher. Rcon correctly requires a password. | MATCH |

**V-pass notes:** Version confirmed: git describe == 1.11-53-g18d0362.

cache_print registers in src/zone.c:593 to handler Cache_Print (src/zone.c:551-558). Single registration, single handler -- no split enforcing site. Traced the full dispatch chain into the callee per enforce-trace discipline (caller Cmd_ExecuteString invokes cmd->function() at cmd.c:938; the asserted behavior lives wholly in the Cache_Print body, not the caller).

Every material clause maps to a located, verified enforcing line incl. adjacent comments (the struct comments "// including this header" on size and "// for LRU flushing" do not invert any clause). No clause derives from name/enum/string/comment inference alone.

Clause 6 (the only behavioral/state claim that could harbor a flavour-C defect) was the one I scrutinized hardest: it is verified by a TREE-WIDE grep proving there is no external producer for the cache -- Cache_Alloc/Cache_Check/Cache_TryAlloc have zero consumers outside zone.c's own internal machinery and the zone.h prototypes. The whole server-side CACHE MEMORY block (src/zone.c:333 #ifdef SERVERONLY ... 689 #endif) is inherited Quake-client infrastructure that the server never feeds. So the "normally empty -> typically prints nothing" framing is mechanically and empirically true for any real mvdsv server, and the hedge words keep it honest (it is not claimed as an absolute).

Clause 7 access-class verified against the actual dispatch code, not the command name: rcon path is password-gated (Rcon_Validate, master or admin) and cache_print is absent from the normal-rcon blocklist, so admin-rcon CAN run it. Console path reaches the same Cmd_ExecuteString via Cbuf. WI-2 metadata: this is a command (no RegisterCvar default applies); registered via plain Cmd_AddCommand with no CF_ access flags in mvdsv's command model, consistent with "server console / rcon".

Classification: TRACED-CLEAN. No C-FIX, no near-miss, no missing read-site.

## flags_for_review

- [fyi/runtime-dead-suspect/synthesis] cache_print, cache_report, and the broader data-cache subsystem (Cache_Alloc / Cache_Check / cache_user_t) have ZERO consumers anywhere in mvdsv/src outside zone.c/zone.h. The section is compiled in (SERVERONLY) and registered, and the commands DO execute and produce output, but the cache list is never populated on a dedicated server -- this is a client-era memory subsystem carried into the server build largely vestigially. Not a C3 dead-stamp (the commands are reachable and run), but worth a human note that their output is effectively constant (empty list / full-free report) on a normal mvdsv server.
- [fyi/runtime-dead-suspect/vpass] The entire server-side data-cache subsystem (src/zone.c:333-689, guarded by #ifdef SERVERONLY) has no producer: Cache_Alloc / Cache_Check / Cache_TryAlloc are never called by any server code -- only zone.c-internal LRU machinery (Cache_Move at zone.c:364) and zone.h prototypes reference them. cache_print, cache_report, and flush all operate on a cache that is structurally always empty on mvdsv. They are dead-ish inherited Quake-client infrastructure. The proposed description handles this correctly via the 'normally empty / typically prints nothing' hedge, but the runtime-dead nature is worth recording for the sibling commands (cache_report / flush) when they are described.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "cache_print",
  "type": "command",
  "description": "Console diagnostic that lists every entry currently held in the server's data-cache memory, one line per entry showing its size in kilobytes and its name. It only reports state; it allocates and frees nothing. Takes no arguments. On a dedicated server the data cache is normally empty, so this typically prints nothing.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/zone.c:551. Handler Cache_Print (src/zone.c:551-558) walks the cache_head linked list (`for (cd = cache_head.next; cd != &cache_head; cd = cd->next)`) and prints `\"%5.1f kB : %s\\n\"` of cd->size/1024 and cd->name -- size-in-kB + name, one line per entry, output via Con_Printf (read-only, no mutation). No-arg: handler ignores Cmd_Argc/Argv entirely. Access-class: registered ONLY via Cmd_AddCommand (\"cache_print\", Cache_Print) in Cache_Init_Commands (src/zone.c:593); grep of src/sv_user.c ucmds[] returns no cache_print entry, so no client dispatch path (SV_ExecuteUserCommand only dispatches ucmds[]) => admin-only (server console / rcon). Not in the regular-rcon blocklist (src/sv_main.c:1754-1764, exact strcasecmp set rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line) => bare 'server console / rcon' is correct, not master-rcon-only. Empty-in-practice claim: the whole CACHE MEMORY section is under `#ifdef SERVERONLY` (src/zone.c:333) and the build defines SERVERONLY (CMakeLists.txt:169); the allocator Cache_Alloc (src/zone.c:653) and the cache_user_t type have ZERO callers/consumers anywhere in src/ outside zone.c/zone.h (tree grep), so cache_head is never populated on the server => list empty in practice. F-MV1: grep of ktx/src for 'cache_print' returns no registration => no KTX override. Default omitted: no-arg diagnostic. No worked example: no-arg command.",
  "description_proposed": null
}
```
