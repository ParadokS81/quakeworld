# describe-fill-synthesis ledger -- mvdsv `cache_report`

- **project:** mvdsv
- **knob:** `cache_report` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:cache_report: synthesized -- admin-only console diagnostic; prints free/total data-cache MB (free = hunk arena free space) -- origin=synthesized ref=src/zone.c:566 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Console diagnostic that prints how much of the server's data-cache memory is free, as "free of total" in megabytes. The free figure is the server memory arena's current free space; nothing is allocated, freed, or changed. Takes no arguments.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| prints free-of-total data-cache size in MB | src/zone.c:568 | `Con_Printf("%4.1f of %4.1f megabyte data cache free\n",` | yes |
| free figure = arena free space (hunk_size - high - low) | src/zone.c:569 | `(float)(hunk_size - hunk_high_used - hunk_low_used) / (1024 * 1024),` | yes |
| total figure = hunk_size | src/zone.c:570 | `(float)hunk_size / (1024 * 1024));` | yes |
| reports only, mutates nothing | src/zone.c:566-571 | handler is one Con_Printf, no assignment/alloc/free | yes |
| takes no arguments | src/zone.c:566 | `void Cache_Report(void)` -- no Cmd_Argc/Argv | yes |
| admin-only (console/rcon), no client path | src/zone.c:594 ; src/sv_user.c:3338-3384 | registered only via Cmd_AddCommand; absent from ucmds[] | yes |
| not master-rcon-restricted | src/sv_main.c:1754-1764 | blocklist set excludes cache_report | yes |
| no KTX override | ktx/src (grep) | grep 'cache_report' in ktx/src returns nothing | yes |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| C1 | Console diagnostic (a command, not a cvar) | zone.c:594 (registration); zone.c:566 (handler) | `Cmd_AddCommand("cache_report", Cache_Report);` / `void Cache_Report(void)` | MATCH |
| C2 | Prints how much of the server's data-cache memory is free | zone.c:568 | `Con_Printf("%4.1f of %4.1f megabyte data cache free\n", ...)` | MATCH |
| C3 | Output format is "free of total" in megabytes | zone.c:568-570 | arg1=`(float)(hunk_size - hunk_high_used - hunk_low_used) / (1024 * 1024)` (free, printed first), arg2=`(float)hunk_size / (1024 * 1024)` (total, printed second), format `"%4.1f of %4.1f megabyte ..."` | MATCH |
| C4 | Free figure = server memory arena's current free space | zone.c:569 (free expr) + sv_main.c:3948 (arena alloc) + zone.c:181/260/350-352 (cache lives in hunk gap) | `(hunk_size - hunk_high_used - hunk_low_used)`; arena: `Memory_Init (Q_malloc(memsize), memsize);`; cache allocated in the gap between low/high hunk marks, evicted by `Cache_FreeLow/High` when hunk grows | MATCH |
| C5 | Nothing is allocated, freed, or changed (read-only, no side-effects) | zone.c:566-571 | entire handler body is one `Con_Printf` reading three globals; no assignment, no alloc/free call | MATCH |
| C6 | Takes no arguments | zone.c:566-571 | handler body references no `Cmd_Argv`/`Cmd_Argc`; any supplied args are silently ignored | MATCH |
| C7 | Set by: server console / rcon (access class) | zone.c:594 (console reg) + sv_main.c:1828 (rcon dispatch) + sv_main.c:1747-1770 (rcon blocklist) | `Cmd_AddCommand("cache_report", ...)` makes it a console command; rcon path runs `Cmd_ExecuteString(str)`; `cache_report` is NOT in the normal-rcon blocklist (rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line), so reachable from both server console and rcon (normal + master) | MATCH |

**V-pass notes:** Oracle confirmed: `git describe --tags` == 1.11-53-g18d0362. Build path confirmed: `WITH_DP_MEM` is never defined anywhere in the MVDSV tree (only `#ifndef WITH_DP_MEM` guards in zone.c), so the `Cache_Init_Commands()` registration of cache_report is compiled in for the standard server build.

Every material clause maps to a located, verified enforcing line. The handler `Cache_Report` (zone.c:566-571) is a pure diagnostic: a single `Con_Printf` of two floats (free, then total, both bytes/1048576 = MB) with the literal text "data cache free". No reads of Cmd_Argv/Cmd_Argc (so C6 holds and extra args are ignored), no writes (so C5 holds).

C4 is the one clause that required real tracing rather than face-value acceptance, and it passes cleanly. The reported "free" figure is `hunk_size - hunk_high_used - hunk_low_used`, i.e. the free space of the single server memory arena (`Memory_Init(Q_malloc(memsize), memsize)` at sv_main.c:3948), NOT a separate cache-pool accounting. The cache_system_t allocations live inside that arena, in the gap between the low and high hunk marks, and are evicted (Cache_FreeLow/Cache_FreeHigh) when the hunk grows -- so arena-free is exactly the room available to the cache. The description's potentially-confusable term "data-cache memory" is immediately and correctly disambiguated by its own next sentence ("The free figure is the server memory arena's current free space; nothing is allocated, freed, or changed"). The framing is accurate, not misleading -- this is a PROC-1 fact, not a lurking judgment.

C7 access class verified per WI-2: not inferred from the command name. Registered via plain `Cmd_AddCommand` (no CF_ flag in this MVDSV cmd model -- signature is `(name, function)` only), reachable from the server's own console; the rcon path (SVC_RemoteCommand) dispatches arbitrary registered commands via `Cmd_ExecuteString` with output redirected to the rcon client, and cache_report is absent from the normal-rcon blocklist, so it works under both normal `rcon_password` and `master_rcon_password`. "server console / rcon" is correct and complete.

## flags_for_review

- [fyi/other/synthesis] cache_report labels its output 'data cache free' but the number it reports is the HUNK memory arena's free space (hunk_size - hunk_high_used - hunk_low_used), not a separate cache pool. Combined with the empty-cache observation on cache_print, the 'data cache' framing is a client-era label; the figure is effectively the same arena measurement hunk_print's footer shows. FYI for whoever consumes these memory-diagnostic descriptions together.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "cache_report",
  "type": "command",
  "description": "Console diagnostic that prints how much of the server's data-cache memory is free, as \"free of total\" in megabytes. The free figure is the server memory arena's current free space; nothing is allocated, freed, or changed. Takes no arguments.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/zone.c:566. Handler Cache_Report (src/zone.c:566-571) prints `\"%4.1f of %4.1f megabyte data cache free\\n\"` with first arg = `(hunk_size - hunk_high_used - hunk_low_used) / (1024*1024)` (free) and second = `hunk_size / (1024*1024)` (total), via Con_Printf only -- read-only, no mutation, no Cmd_Argc/Argv read (no-arg). Note the 'free' value is derived from the HUNK arena usage (hunk_size minus high+low used), reported under the label 'data cache' -- I describe the observable output ('how much data-cache memory is free, in MB') and state the free figure is the memory arena's free space, without asserting the cache holds meaningful data (it does not on a server; see cache_print reasoning). Access-class: registered ONLY via Cmd_AddCommand(\"cache_report\", Cache_Report) (src/zone.c:594); not in src/sv_user.c ucmds[] => admin-only (console / rcon). Not in the regular-rcon blocklist (src/sv_main.c:1754-1764) => bare 'server console / rcon'. F-MV1: grep ktx/src 'cache_report' => no override. Default omitted (no-arg diagnostic). No worked example (no-arg).",
  "description_proposed": null
}
```
