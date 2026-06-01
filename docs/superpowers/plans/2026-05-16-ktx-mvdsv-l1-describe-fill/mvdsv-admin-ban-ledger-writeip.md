# describe-fill-synthesis ledger -- mvdsv `writeip`

- **project:** mvdsv
- **knob:** `writeip` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `admin-ban` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:writeip: synthesized -- saves the addip filter list to <gamedir>/listip.cfg as addip lines (safe first, then bans) for persistence; admin-only -- origin=synthesized ref=src/sv_main.c:2319 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Saves the server's current connection filter list (the entries managed by addip) to a file so the bans can be restored later. The file is written into the active game directory as listip.cfg, with one addip line per entry; safe (protected) entries are written first, then bans.
>
> writeip = write the filter list to <gamedir>/listip.cfg. Takes no arguments.
>
> The list is not loaded automatically at startup -- to restore the bans, exec listip.cfg from your server config.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| admin-only (no client path) | src/sv_main.c:3620 + src/sv_user.c:3299 | `Cmd_AddCommand ("writeip", SV_WriteIP_f);` ; not in `ucmds[]` | yes |
| writes to <gamedir>/listip.cfg | src/sv_main.c:2319 | `snprintf (name, MAX_OSPATH, "%s/listip.cfg", fs_gamedir);` | yes |
| fs_gamedir = active game dir | src/fs.c:61 | `char fs_gamedir[MAX_OSPATH]; // c:/quake/qw` | yes |
| safe entries written first | src/sv_main.c:2331-2337 | `if(ipfilters[i].type != ipft_safe) continue; ... fprintf(f, "addip %i.%i.%i.%i safe %.0f\n", ...)` | yes |
| then bans, one addip line each | src/sv_main.c:2340-2351 | `if(ipfilters[i].type == ipft_safe) continue; ... fprintf(f, "addip %i.%i.%i.%i %s %.0f\n", ...)` | yes |
| restore by re-running the addip lines | src/sv_main.c:2337,2351 | emitted lines are `addip ...` commands (re-exec re-adds) | yes |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Saves the current connection filter list (entries managed by addip) | src/sv_main.c:2331-2352 (write loops over `ipfilters[]`); SV_AddIP_f src/sv_main.c:2196-2248; ban->addip src/sv_main.c:2592 | `for (i=0;i<numipfilters;i++) ... fprintf(f,"addip ...")`; ban does `Cbuf_AddText(va("addip %s ban %s%.0lf\n",...))` | MATCH |
| 2 | to a file so bans survive a restart | src/sv_main.c:2323 fopen; comment src/sv_main.c:1988 | `f = fopen(name,"wb")`; comment: "Dumps \"addip <ip>\" commands to listip.cfg so it can be execed at a later date. The filter lists are not saved and restored by default" | MATCH (persistence is the on-disk file; description does NOT claim auto-reload, matching code -- no site auto-execs listip.cfg) |
| 3 | written into the active game directory as listip.cfg | src/sv_main.c:2319 | `snprintf(name, MAX_OSPATH, "%s/listip.cfg", fs_gamedir)` | MATCH (fs_gamedir is the active gamedir, set in src/fs.c:432/491) |
| 4 | containing one addip line per entry | src/sv_main.c:2337, src/sv_main.c:2351 | `fprintf(f, "addip %i.%i.%i.%i safe %.0f\n", ...)` and `fprintf(f, "addip %i.%i.%i.%i %s %.0f\n", ...)` per loop iteration | MATCH |
| 5 | safe (protected) entries written first, then bans | src/sv_main.c:2330-2338 (safe loop, `if(type != ipft_safe) continue`) then src/sv_main.c:2340-2352 (`if(type == ipft_safe) continue; // ignore safe, we already save it`); protection semantics SV_CanAddBan src/sv_main.c:2470 | safe loop precedes ban loop textually; comment "write safe filters first"; `ipft_safe` returns false from SV_CanAddBan ("can't add filter f because present \"safe\" filter") and is never matched by SV_FilterPacket (2390 gates on ipft_ban only) | MATCH |
| 6 | Re-running that file (for example via exec) restores the list | SV_AddIP_f src/sv_main.c:2211-2231 | `s=Cmd_Argv(2); if(!s[0]||!strcmp(s,"ban")) ipft=ipft_ban; else if(!strcmp(s,"safe")) ipft=ipft_safe;` -- parses exactly the `addip <ip> [safe|ban] [time]` lines writeip emits; round-trip closed | MATCH (hedged "for example via exec"; correct -- no auto-restore exists) |
| 7 | writeip = write the filter list to <gamedir>/listip.cfg | src/sv_main.c:2319 | `snprintf(name, MAX_OSPATH, "%s/listip.cfg", fs_gamedir)` | MATCH |
| 8 | Takes no arguments | src/sv_main.c:2312-2358 (whole SV_WriteIP_f body) | function reads zero Cmd_Argv calls | MATCH |
| 9 | Set by: server console / rcon | registration src/sv_main.c:3620; rcon dispatch src/sv_main.c:1828; rcon blacklist src/sv_main.c:1754-1765 | `Cmd_AddCommand("writeip", SV_WriteIP_f)` (plain, no special flag); rcon path ends `Cmd_ExecuteString(str)`; "writeip" absent from the "normal rcon can't use these commands" blacklist -> reachable via both master-rcon and normal-rcon, and via local server console | MATCH |

**V-pass notes:** All 9 material clauses enforce-traced. See per_clause_table.

## flags_for_review

- [fyi/other/vpass] The non-safe write loop (src/sv_main.c:2340-2352) emits a literal " ban" type token (case ipft_ban: s=" ban") with a LEADING SPACE, producing output like `addip 1.2.3.4  ban 0` (double space between IP and 'ban'). SV_AddIP_f tokenizes on whitespace so this round-trips fine (Cmd_Argv collapses runs), but if any external tooling string-matches the emitted lines the stray space is a latent gotcha. Not a description defect -- the proposed text makes no claim about exact spacing. FYI only.
- [fyi/other/vpass] writeip writes the SHARED ipfilters[] array, which is mutated by addip, removeip, AND the ban/banip console commands (ban funnels through addip at src/sv_main.c:2592). The description's phrase 'the entries managed by addip' is accurate (addip is the canonical primitive and ban routes through it) but slightly under-credits ban/removeip as co-managers of the same list. Not misleading enough to flag as a near-miss; noting for completeness.
- [fyi/runtime-dead-suspect/vpass] The ipfiltertype_t enum (src/server.h:768-771) defines only ipft_ban and ipft_safe, yet the write loop's switch (src/sv_main.c:2345-2349) and the list-print switch (src/sv_main.c:2296, 2413) carry a `default: s="unkn"` / "unkn" branch for a third type that the enum cannot currently produce. Dead default branch -- harmless, but a hint that a third filter type may have existed or been planned. No impact on writeip's documented behavior.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, qtv_status=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "writeip",
  "type": "command",
  "description": "Saves the server's current connection filter list (the entries managed by addip) to a file so the bans can be restored later. The file is written into the active game directory as listip.cfg, with one addip line per entry; safe (protected) entries are written first, then bans.\n\nwriteip = write the filter list to <gamedir>/listip.cfg. Takes no arguments.\n\nThe list is not loaded automatically at startup -- to restore the bans, exec listip.cfg from your server config.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:2319. Admin-only: registered via Cmd_AddCommand only (sv_main.c:3620); NOT in client ucmds[] (sv_user.c:3299) -> server console / rcon. Filename clause: SV_WriteIP_f builds name = \"%s/listip.cfg\" % fs_gamedir (2319); fs_gamedir is the active game directory path (fs.c:61 `char fs_gamedir[MAX_OSPATH]; // c:/quake/qw`) -> destination is <gamedir>/listip.cfg. It opens the file for binary write (2323); on failure prints \"Couldn't open %s\" and returns (2324-2328). Content clause: it writes safe filters FIRST (loop 2331-2338 skips non-safe via continue, emits `addip %i.%i.%i.%i safe %.0f`), then a second loop (2340-2352) skips safe and emits `addip %i.%i.%i.%i %s %.0f` with the ban/safe/unkn token -> one addip line per entry, safe before bans. Persistence/restore clause: lines are addip commands, so executing the file re-adds every entry; \"survive a restart\" follows from it being an on-disk addip script (the engine does not auto-load it here -- restore is by re-running the file, which is what the addip-line format is for). After close it calls FS_FlushFSHash() to rebuild the file cache (2357). No argument read. F-MV1: KTX grep shows no override of writeip; live behavior is the MVDSV engine's.",
  "description_proposed": null
}
```
