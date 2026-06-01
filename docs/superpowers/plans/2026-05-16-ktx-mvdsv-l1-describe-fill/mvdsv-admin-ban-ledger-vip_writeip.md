# describe-fill-synthesis ledger -- mvdsv `vip_writeip`

- **project:** mvdsv
- **knob:** `vip_writeip` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `admin-ban` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:vip_writeip: synthesized -- admin cmd saves the VIP spectator list to <gamedir>/vip_ip.cfg as replayable vip_addip lines (prints "Writing <path>."); no KTX override -- origin=synthesized ref=src/sv_main.c:2160 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Saves the server's current VIP spectator list to a file so it can be restored later. The file is written to vip_ip.cfg in the active game directory, with one vip_addip line per entry.
>
> vip_writeip = write the current VIP list to <gamedir>/vip_ip.cfg. Prints the full path it is writing ("Writing <path>."), or "Couldn't open <path>" if the file cannot be created. Takes no arguments.
>
> The file is not loaded automatically at startup -- exec vip_ip.cfg from your server config to restore the list.
>
> Default: none.
> Set by: server console / rcon.
> See also: vip_addip, vip_listip, vip_removeip.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| admin-only (console/rcon) | src/sv_main.c:3624 | `Cmd_AddCommand ("vip_writeip", SV_WriteIPVIP_f);` (absent from ucmds[]) | MATCH |
| path = <gamedir>/vip_ip.cfg | src/sv_main.c:2167 | `snprintf (name, MAX_OSPATH, "%s/vip_ip.cfg", fs_gamedir);` | MATCH |
| prints "Writing <path>." | src/sv_main.c:2169 | `Con_Printf ("Writing %s.\n", name);` | MATCH |
| open-fail msg | src/sv_main.c:2171-2175 | `f = fopen (name, "wb"); if (!f) { Con_Printf ("Couldn't open %s\n", name); return; }` | MATCH |
| writes vip_addip lines | src/sv_main.c:2181 | `fprintf (f, "vip_addip %i.%i.%i.%i %d\n", b[0], b[1], b[2], b[3], ipvip[i].level);` | MATCH |
| flushes fs hash after write | src/sv_main.c:2187 | `FS_FlushFSHash();` | MATCH |
| persists same store read at connect | src/sv_main.c:2730 | `if ( (in & ipvip[i].mask) == ipvip[i].compare) return ipvip[i].level;` | MATCH |
| no KTX override | ktx/src (grep) | empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | Saves the current VIP *spectator* list | sv_main.c:2099; sv_main.c:103; sv_main.c:2729-2731 | `Con_Printf ("VIP spectator IP list is full\n");` / `cvar_t vip_password = {"vip_password", ""};	// password for entering as a VIP sepctator` / `if ( (in & ipvip[i].mask) == ipvip[i].compare) return ipvip[i].level;` (SV_VIPbyIP) | MATCH |
| 2 | File written to vip_ip.cfg in active game directory (<gamedir>/vip_ip.cfg) | sv_main.c:2167 + fs.c:61 | `snprintf (name, MAX_OSPATH, "%s/vip_ip.cfg", fs_gamedir);` / `char fs_gamedir[MAX_OSPATH];		// c:/quake/qw` | MATCH |
| 3 | One vip_addip line per entry | sv_main.c:2178-2182 | `for (i=0 ; i<numipvips ; i++){ ... fprintf (f, "vip_addip %i.%i.%i.%i %d\n", b[0],b[1],b[2],b[3], ipvip[i].level); }` | MATCH |
| 4 | exec'ing the file (or restart with it loaded) re-creates the list | sv_main.c:2076-2107 (SV_AddIPVIP_f) | `if (!StringToFilter (Cmd_Argv(1), &f))...; l = Q_atoi(Cmd_Argv(2)); ... ipvip[i] = f; ipvip[i].level = l;` -- exact inverse of the written `vip_addip <ip> <level>` format | MATCH |
| 5 | Prints "Writing <path>." | sv_main.c:2169 | `Con_Printf ("Writing %s.\n", name);` (name already holds the full path) | MATCH |
| 6 | "Couldn't open <path>" if the file cannot be created | sv_main.c:2171-2176 | `f = fopen (name, "wb"); if (!f){ Con_Printf ("Couldn't open %s\n", name); return; }` | MATCH |
| 7 | Takes no arguments | sv_main.c:2160-2188 (SV_WriteIPVIP_f body) | handler never reads Cmd_Argv/Cmd_Argc; unconditionally builds path and writes | MATCH |
| 8 | Set by: server console / rcon | sv_main.c:3624; sv_user.c (absent); sv_main.c:1687,1701-1708,1828 | `Cmd_AddCommand ("vip_writeip", SV_WriteIPVIP_f);` registered in console cmd table; NOT present in sv_user.c client `ucmd_t` table (network path); SVC_RemoteCommand validates rcon password then `Cmd_ExecuteString(str);` -- same console dispatch | MATCH |
| 9 | See also: vip_addip, vip_listip, vip_removeip | sv_main.c:3621-3623 | `Cmd_AddCommand ("vip_addip", SV_AddIPVIP_f); Cmd_AddCommand ("vip_removeip", SV_RemoveIPVIP_f); Cmd_AddCommand ("vip_listip", SV_ListIPVIP_f);` | MATCH |
| 10 | "Default: none (takes no arguments)" -- metadata | n/a (Cmd_AddCommand, not a cvar) | registered via `Cmd_AddCommand`, no RegisterCvar -> no registered default; field correctly states no-args rather than asserting a cvar default | MATCH (WI-2 clean) |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362.

vip_writeip registers at sv_main.c:3624 -> handler SV_WriteIPVIP_f at sv_main.c:2160-2188 (single enforcing site; no callee chain needed -- the handler is self-contained). Every material clause traced to a located enforcing line incl. adjacent comments. No clause rests on name/enum/string inference alone.

Key verifications:
- "VIP spectator" semantic is enforced, not name-inferred: the data the command serializes (ipvip[]) is consumed by SV_VIPbyIP (sv_main.c:2729-2731) which feeds VIP-spectator admission (CheckPasswords/SpectatorCanConnect), and the sibling full-list guard literally says "VIP spectator IP list is full" (2099). vip_password comment (103) confirms VIP = spectator class.
- Path: snprintf uses "%s/vip_ip.cfg" with fs_gamedir (fs.c:61, the active gamedir), exactly as described.
- Round-trip: write format `vip_addip %i.%i.%i.%i %d` (2181) is the precise inverse of SV_AddIPVIP_f's argv parsing (argv1 IP via StringToFilter, argv2 level via Q_atoi) -> exec re-creates the list. Verified, not assumed.
- Both Con_Printf strings match the quoted text verbatim ("Writing %s.\n" and "Couldn't open %s\n").
- WI-2 access class verified against the DISPATCH MECHANISM, not the command name: vip_writeip is in the server console command table (Cmd_AddCommand) and is ABSENT from the client ucmd_t network table in sv_user.c, so a connected client cannot invoke it over the wire; rcon reaches it via SVC_RemoteCommand -> Cmd_ExecuteString (1687/1828). "server console / rcon" is therefore the exact, complete invocation set.
- WI-2 default: command, not cvar; no RegisterCvar exists, so there is no registered default to mis-state. The "Default: none (takes no arguments)" field is accurate.

No flavour-C clause (nothing asserted from name/string/enum without an enforcing read), no contradiction, no metadata defect. Classification: TRACED-CLEAN.

## flags_for_review

- [review/suspected-bug/synthesis] vip_writeip serializes each entry using only ipvip[i].compare (the masked address) and level -- it does NOT write ipvip[i].mask. A VIP entry added as a masked range (e.g. vip_addip 1.2.3.0/24) is therefore re-saved as a single /32 host line, so reloading vip_ip.cfg silently narrows masked ranges to one host. Same root shape as vip_listip's display. This is a real round-trip fidelity bug for masked VIP entries, kept out of the user-doc description; worth a human/upstream look.
- [fyi/off-scope-entity/vpass] vip_writeip only serializes whatever is currently in ipvip[]; it has no capacity behavior of its own, but the VIP list is capped at MAX_IPFILTERS=1024 (sv_main.c:2009) and SV_AddIPVIP_f prints 'VIP spectator IP list is full' (sv_main.c:2099) when exceeded. Not a defect for this knob -- only noted as adjacent context since the description does not (and need not) mention the cap.
- [fyi/other/vpass] After writing, SV_WriteIPVIP_f calls FS_FlushFSHash() (sv_main.c:2187, comment '// force cache rebuild.') so the freshly-written file is visible to the FS cache. This is an internal side-effect with no user-visible behavior and is correctly omitted from the user-doc description; flagged only for completeness.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, qtv_status=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "vip_writeip",
  "type": "command",
  "description": "Saves the server's current VIP spectator list to a file so it can be restored later. The file is written to vip_ip.cfg in the active game directory, with one vip_addip line per entry.\n\nvip_writeip = write the current VIP list to <gamedir>/vip_ip.cfg. Prints the full path it is writing (\"Writing <path>.\"), or \"Couldn't open <path>\" if the file cannot be created. Takes no arguments.\n\nThe file is not loaded automatically at startup -- exec vip_ip.cfg from your server config to restore the list.\n\nDefault: none.\nSet by: server console / rcon.\nSee also: vip_addip, vip_listip, vip_removeip.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:2160. Registered admin-only: Cmd_AddCommand(\"vip_writeip\", SV_WriteIPVIP_f) at src/sv_main.c:3624; NOT in ucmds[]/QC (grep empty) => server console/rcon. Handler SV_WriteIPVIP_f at src/sv_main.c:2160: builds the path as `%s/vip_ip.cfg` with fs_gamedir (2167 -- the file name vip_ip.cfg is hard-coded; located in the active gamedir), prints \"Writing %s.\" with the full path (2169), opens it \"wb\" and on failure prints \"Couldn't open %s\" and returns (2171-2176), then for each ipvip[] entry copies compare bytes (2180) and writes a line `vip_addip %i.%i.%i.%i %d` with the address bytes and level (2181) -- i.e. the saved file is a re-playable list of vip_addip commands. After writing it calls FS_FlushFSHash() to force a filesystem cache rebuild (2187) so the new file is visible to subsequent exec/open. Persists the same in-memory ipvip[] store that vip_addip/vip_removeip edit and SV_VIPbyIP reads at connection (src/sv_main.c:2730). Note: like vip_listip, the written line uses only compare bytes (no mask), so a masked-range entry is re-saved as a bare /32 address. F-MV1: grep of ktx/src empty -- no KTX override.",
  "description_proposed": null
}
```
