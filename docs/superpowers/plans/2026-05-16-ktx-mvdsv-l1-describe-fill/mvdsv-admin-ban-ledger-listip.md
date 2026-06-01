# describe-fill-synthesis ledger -- mvdsv `listip`

- **project:** mvdsv
- **knob:** `listip` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `admin-ban` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:listip: synthesized -- prints the addip filter list (address, ban/safe, seconds left); read-only, admin-only -- origin=synthesized ref=src/sv_main.c:2292 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Prints the server's connection filter list (the entries managed by addip). For each entry it shows the address, whether it is a ban or a safe (protected) entry, and -- for time-limited entries -- the seconds remaining before the entry expires.
>
> listip = print the filter list. Takes no arguments.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| admin-only (no client path) | src/sv_main.c:3619 + src/sv_user.c:3299 | `Cmd_AddCommand ("listip", SV_ListIP_f);` ; not in `ucmds[]` | yes |
| prints each filter address | src/sv_main.c:2294-2295 | `*(unsigned *)b = ipfilters[i].compare; Con_Printf ("%3i.%3i.%3i.%3i | ", ...)` | yes |
| shows ban vs safe type | src/sv_main.c:2296-2300 | `switch(...type){ case ipft_ban: " ban"; case ipft_safe: "safe"; default "unkn"; }` | yes |
| shows seconds remaining for timed entries | src/sv_main.c:2301-2302 | `if (ipfilters[i].time) Con_Printf (" | %i s", (int)(ipfilters[i].time-long_time));` | yes |
| header line | src/sv_main.c:2291 | `Con_Printf ("Filter list:\n");` | yes |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | `listip` command maps to a list-the-filter function | sv_main.c:3619 | `Cmd_AddCommand ("listip", SV_ListIP_f);` | MATCH |
| 2 | "Prints the server's connection filter list" (iterates and prints filter entries) | sv_main.c:2291-2304 | `Con_Printf ("Filter list:\n"); for (i=0 ; i<numipfilters ; i++) { ... Con_Printf ("%3i.%3i.%3i.%3i \| ", ...); }` | MATCH |
| 3 | "entries managed by addip" -- the printed list is `ipfilters[]`, whose insertion primitive is `addip` (`SV_AddIP_f`); even the mod `ban`/`banip` admin commands funnel through it | sv_main.c:2248 (addip insert) / 2592 (ban -> addip) | `ipfilters[i] = f;` // and `Cbuf_AddText(va("addip %s ban %s%.0lf\n", ...))` | MATCH (see FYI flag) |
| 4 | "shows the address" | sv_main.c:2294-2295 | `*(unsigned *)b = ipfilters[i].compare; Con_Printf ("%3i.%3i.%3i.%3i \| ", b[0], b[1], b[2], b[3]);` | MATCH |
| 5 | "whether it is a ban or a safe (protected) entry" -- displays the type | sv_main.c:2296-2300 | `switch((int)ipfilters[i].type){ case ipft_ban: Con_Printf(" ban"); case ipft_safe: Con_Printf("safe"); default: Con_Printf("unkn"); }` | MATCH |
| 6 | "safe = protected" semantics: safe entries are never banned and block adding a ban for that IP | sv_main.c:2390 (filter) / 2470-2471 (protect) | `if ( ipfilters[i].type == ipft_ban && (in & mask)==compare ) return filterban.value;` // `if (...type == ipft_safe) return false; // can't add filter f because present "safe" filter` | MATCH |
| 7 | "for time-limited entries -- the seconds remaining before the entry expires" | sv_main.c:2301-2302 | `if (ipfilters[i].time) Con_Printf (" \| %i s", (int)(ipfilters[i].time-long_time));` | MATCH |
| 8 | `time` field is an expiry timestamp (so `time - now` = seconds remaining) | server.h:778 | `double time; // for ban expiration` | MATCH |
| 9 | "Takes no arguments" -- function reads no Cmd_Argv/Cmd_Argc | sv_main.c:2285-2305 | `SV_ListIP_f (void)` body contains no `Cmd_Argv`/`Cmd_Argc` reference | MATCH |
| 10 | "Set by: server console / rcon" -- registered as a plain server command (no client/stuffcmd path), reachable via rcon | sv_main.c:3619 (reg) / 1819-1828 (rcon dispatch) | `Cmd_AddCommand("listip", ...)` // `SV_BeginRedirect(RD_PACKET); ... Cmd_ExecuteString(str);` | MATCH |
| 11 | Output reaches the rcon issuer (justifies "Prints" over rcon) | sv_main.c:1819 | `SV_BeginRedirect(RD_PACKET);` wraps the `Cmd_ExecuteString` so `Con_Printf` is captured to the rcon reply | MATCH |

**V-pass notes:** VERSION CONFIRMED: mvdsv describe == 1.11-53-g18d0362.

VERDICT: TRACED-CLEAN. Every material clause maps to a located, verified enforcing line. The command `listip` -> SV_ListIP_f (sv_main.c:2285-2305), distinct from the VIP variant `vip_listip` -> SV_ListIPVIP_f (registered separately at 3623; not in scope here). Verified against the real SV_ListIP_f at 2285, NOT the misleadingly-named earlier block at 2139/2142 which is actually SV_ListIPVIP_f's doc-comment.

Clause-by-clause: address print (2294-2295), ban/safe type print (2296-2300), and seconds-remaining-for-timed-entries (2301-2302) all match the function body exactly. "safe (protected)" gloss is independently corroborated by two OTHER sites: SV_FilterPacket (2390) only matches ipft_ban for banning, and SV_CanAddBan (2470-2471, with comment) makes a present safe filter block a ban on the same IP -- so "safe" genuinely means protected/exempt, not just a display label. The `time` field's expiry semantics confirmed at struct decl server.h:778 (`// for ban expiration`).

Access-class "server console / rcon": mvdsv registers these via plain Cmd_AddCommand with NO CF_-style flag (unlike KTX), so the access model is structural -- it is a server/console command, not client-issuable; the rcon path (SV_BeginRedirect(RD_PACKET) then Cmd_ExecuteString at 1819/1828, gated by rcon auth) reaches it, and Con_Printf output is redirected back to the rcon client. No stuffcmd/client-command path reaches SV_ListIP_f. "Set by: server console / rcon" is therefore correct.

"Takes no arguments": the body references neither Cmd_Argv nor Cmd_Argc -- it ignores any args rather than rejecting them, but "takes no arguments" accurately describes that none are consumed.

The `default: "unkn"` display branch (2299) is unreachable in practice: ipfiltertype_t (server.h:768-771) has only ipft_ban/ipft_safe, and every writer sets one of those two. The description's "whether it is a ban or a safe" correctly omits unkn because it cannot occur -- this is not an omission defect.

## flags_for_review

- [fyi/other/vpass] The description says entries are 'managed by addip'. Strictly, the ipfilters[] list shown by listip is also written by removeip (removal, SV_RemoveIP_f) and populated by the in-game admin 'ban'/'banip' mod commands (SV_Cmd_Ban_f line 2592, SV_Cmd_Banip_f), which add filters by issuing 'addip' via Cbuf_AddText, plus auto-expiry pruning (SV_CleanBansIPList, 2484-2501). The 'managed by addip' framing is defensible because addip (SV_AddIP_f, the ipfilters[i]=f insert at 2248) is the single insertion primitive all add-paths funnel through. FYI only -- not a defect; flagging so the operator knows listip surfaces entries created by the admin 'ban' command too, not only direct addip invocations.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, qtv_status=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "listip",
  "type": "command",
  "description": "Prints the server's connection filter list (the entries managed by addip). For each entry it shows the address, whether it is a ban or a safe (protected) entry, and -- for time-limited entries -- the seconds remaining before the entry expires.\n\nlistip = print the filter list. Takes no arguments.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:2292. Admin-only: registered via Cmd_AddCommand only (sv_main.c:3619); NOT in client ucmds[] (sv_user.c:3299) -> server console / rcon. Effect: SV_ListIP_f (2285-2305) prints header \"Filter list:\" (2291) then iterates ipfilters[0..numipfilters) (2292) printing each compare as a dotted address (2294-2295), then a type token via switch on ipfilters[i].type -> \" ban\" / \"safe\" / \"unkn\" (2296-2300). Time-remaining clause: only when ipfilters[i].time is nonzero it prints \" | %i s\" of (time - now) i.e. seconds left (2301-2302, long_time=time(NULL) at 2287). Permanent entries (time==0) print no seconds field. Read-only: no list mutation, no argument read. F-MV1: KTX grep shows no override of listip; live behavior is the MVDSV engine's.",
  "description_proposed": null
}
```
