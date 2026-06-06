# describe-fill-synthesis ledger -- qwfwd `banremove`

- **Project:** qwfwd
- **Knob:** `banremove` (command)
- **Handler / registration:** handler `SV_Cmd_Banremove_f` (`src/ban.c:455-486`); registered `Cmd_AddCommand("banremove", SV_Cmd_Banremove_f)` at `src/ban.c:516` inside `Ban_Init` (`src/ban.c:506`).
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth). The file header block (`src/ban.c:5-34`) documents the OLD `removeip` family, NOT `banremove`; the two differ (see Rationale).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=command).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qwfwd:banremove: synthesized -- cold-synth; removes a single ban from the proxy filter list BY ITS LIST ID (the number shown by banlist), refuses to remove a "safe" entry, re-saves the list; no-arg form prints usage then dumps the ban list -- origin=synthesized ref=src/ban.c:455 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Removes a single ban from the proxy's connection filter list, identified by the ID number shown next to it in the `banlist` output. Once removed, that address is no longer blocked. A "safe" entry cannot be removed this way. The updated filter list is written to disk so the change survives a restart. Run with no ID, it prints its usage and then shows the current ban list.
>
> banremove <id> = remove the ban whose list ID is <id>.
> <id> = the number shown in the left column of `banlist` (the entry's position in the list). An out-of-range ID is rejected.
>
> Set by: proxy server console (the operator at the running proxy). The proxy has no rcon command of its own, so this cannot be issued remotely.

## Read use-sites (WI-1 wide read -- whole src/ tree)

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `src/ban.c:516` | binds the name `banremove` to handler `SV_Cmd_Banremove_f` |
| Handler | `src/ban.c:455-486` | parses an ID, validates range + type, removes the entry, re-persists |
| No-arg branch | `src/ban.c:460-465` | `< 2` args -> prints usage `banremove [banid]` then calls `SV_BanList_f()` (shows the list) and returns |
| ID parse + range guard | `src/ban.c:467-473` | `atoi(arg)`; `id < 0 || id >= numipfilters` -> "Wrong ban id" and returns |
| Safe guard | `src/ban.c:475-479` | if the entry at `id` is `ipft_safe` -> "Can't remove such ban with id" and returns |
| Removal | `src/ban.c:481-485` -> `SV_RemoveBansIPFilter` `src/ban.c:391-397` | shifts the array down over index `id`, decrements `numipfilters` |
| Persist | `src/ban.c:485` -> `SV_WriteIP_f` `src/ban.c:263-307` | re-writes the on-disk filter file |
| ID origin (what `id` indexes) | `Do_BanList` `src/ban.c:309-355` (called by `SV_BanList_f` `src/ban.c:357-375`) | the left column printed by `banlist` is the loop index `i` over `ipfilters[]` -- the same index `banremove` consumes |
| Shared store | `ipfilters[]`/`numipfilters` `src/ban.c:56-57` | same array as `addip`/`removeip`/`listip`/`banip`/`banlist` |
| Command dispatch | `Cmd_ExecuteString` `src/cmd.c:869-913` fed by stdin `src/sys.c:268` | flat table, no access-class check; local console only |

## D5 rubric check (Step 3)

Cold-synth: no comment/candidate for `banremove` (header documents `removeip`, a different command). Handler fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT -- removes a ban by ID, unblocks the address; (2) not a name restatement -- the load-bearing fact is that it takes a LIST ID (not an IP, unlike `removeip`), refuses safe entries, and has a no-arg list-dump form, none of which the name conveys; (3) the `<id>` meaning is spelled out (the banlist column number, out-of-range rejected); (4) mechanism only; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

Sites span the whole `src/` tree at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Removes a single ban identified by an ID number | `src/ban.c:467` + `src/ban.c:484` | `id = atoi(Cmd_Argv(1));` then `SV_RemoveBansIPFilter (id);` | MATCH |
| The ID is the number shown by `banlist` (entry's list position) | `Do_BanList` `src/ban.c:315-321` | `for (i=0 ; i<numipfilters ; i++) { ... Sys_Printf("%3i\|%3i.%3i.%3i.%3i", i, ...);` -- the printed left column is the array index `i`, the same value `banremove` passes to `SV_RemoveBansIPFilter` | MATCH |
| Once removed, the address is no longer blocked | `SV_RemoveBansIPFilter` `src/ban.c:391-397` removes the entry; `SV_IsBanned` `src/ban.c:73-83` only iterates remaining `ipfilters[]` | `for (; i+1<numipfilters; i++) ipfilters[i]=ipfilters[i+1]; numipfilters--;` -> the entry is gone from the list `SV_IsBanned` scans | MATCH |
| A "safe" entry cannot be removed this way | `src/ban.c:475-479` | `if (ipfilters[id].type == ipft_safe) { Sys_Printf("Can't remove such ban with id: %d\n", id); return; }` | MATCH |
| Out-of-range ID rejected | `src/ban.c:469-473` | `if (id < 0 \|\| id >= numipfilters) { Sys_Printf("Wrong ban id: %d\n", id); return; }` | MATCH |
| The list is written to disk (survives restart) | `src/ban.c:485` -> `SV_WriteIP_f` `src/ban.c:263-307`; reload `src/ban.c:520` | `Cbuf_AddText("writeip\n");`; `Ban_Init` execs `qwfwd_listip.cfg` at startup | MATCH |
| No-ID form prints usage then shows the ban list | `src/ban.c:460-465` | `if (Cmd_Argc () < 2) { Sys_Printf("usage: %s [banid]\n", Cmd_Argv(0)); SV_BanList_f(); return; }` | MATCH |
| Set by: proxy console only; no remote/rcon path | dispatch `src/cmd.c:869-913` fed by stdin `src/sys.c:263-332`; rcon absent `src/cmd.c:1008-1023` (commented out), `src/svc.c:464-465` | `Cmd_ExecuteString` no access check; `Sys_ReadSTDIN` gated `if (!isatty(STDIN)...) return;`; `Cmd_RconCommand` commented out; svc.c "we do not have own rcon command" | MATCH |

## D20 split note

Routed to reasoning / this ledger, kept OUT of `description`: every file:line, the C identifiers (`SV_Cmd_Banremove_f`, `SV_RemoveBansIPFilter`, `SV_BanList_f`, `Do_BanList`, `ipfilters`, `ipft_safe`, `numipfilters`, `atoi`, `Cmd_Argc`), the array-shift mechanism, and `writeip`. The user doc says "the ID number shown next to it in the banlist output", "written to disk so the change survives a restart", and "shows the current ban list" in admin-observable terms. The banlist<->banremove ID linkage is stated inline because it is action-changing -- the operator must run `banlist` first to learn the ID -- meeting the D20 bar; the internal index mechanism stays in reasoning. No cross-engine `See also:` warranted.

## Rationale

Cold-synth from a fully-legible handler. `banremove` removes ONE entry from the shared `ipfilters[]` array (`src/ban.c:56`) addressed by a numeric LIST ID, not by IP -- this is the key difference from the older `removeip` (`SV_RemoveIP_f` `src/ban.c:203-227`), which takes an IP string and searches for a mask/compare match. `banremove` instead does `id = atoi(arg)` (`src/ban.c:467`) and indexes directly: it rejects `id < 0 || id >= numipfilters` (`src/ban.c:469`), refuses if `ipfilters[id].type == ipft_safe` (`src/ban.c:475`), then calls `SV_RemoveBansIPFilter(id)` (`src/ban.c:484`), which shifts the array down over that slot and decrements the count (`src/ban.c:391-397`). After removal it buffers `writeip` (`src/ban.c:485`) so the on-disk `qwfwd_listip.cfg` is rewritten and the change persists across the restart-time `exec` (`src/ban.c:520`). The ID the operator passes is exactly the index printed by `banlist`: `Do_BanList` (`src/ban.c:309-355`, invoked by `SV_BanList_f`) prints `Sys_Printf("%3i|...", i, ...)` where `i` is the loop index over `ipfilters[]` (`src/ban.c:315-321`) -- I traced the ID provenance to that print, confirming the description's "the number shown in banlist" claim rather than inferring it. Removal unblocks because `SV_IsBanned` (`src/ban.c:66-87`) only scans the surviving `ipfilters[]` entries at connect time (`peer.c:48,255,326`). The no-arg path (`src/ban.c:460-465`) is a usability convenience: it prints `usage: banremove [banid]` and then calls `SV_BanList_f()` so the operator sees the IDs to choose from. Access is identical to `banip`: the interpreter `Cmd_ExecuteString` (`src/cmd.c:869`) has no access-class system and is fed only by the TTY-gated `Sys_ReadSTDIN` (`src/sys.c:268`); `Cmd_RconCommand` is commented out (`src/cmd.c:1008-1023`) and the proxy forwards `rcon` rather than executing it (`svc.c:464-465`) -- so `Set by: proxy server console`, traced to dispatch + input source. No C2 conflict. `description_provenance` stays `null` (cold-synth). SR-5: no concept-note breadcrumb. Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/assignment/call incl. the callee-follow into `SV_RemoveBansIPFilter` and the ID-provenance trace into `Do_BanList`.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "banremove",
  "type": "command",
  "description": "Removes a single ban from the proxy's connection filter list, identified by the ID number shown next to it in the `banlist` output. Once removed, that address is no longer blocked. A \"safe\" entry cannot be removed this way. The updated filter list is written to disk so the change survives a restart. Run with no ID, it prints its usage and then shows the current ban list.\n\nbanremove <id> = remove the ban whose list ID is <id>.\n<id> = the number shown in the left column of `banlist` (the entry's position in the list). An out-of-range ID is rejected.\n\nSet by: proxy server console (the operator at the running proxy). The proxy has no rcon command of its own, so this cannot be issued remotely.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no comment/candidate for banremove (ban.c:5-34 header documents removeip, a DIFFERENT command) -> synthesize. Handler SV_Cmd_Banremove_f src/ban.c:455-486. Clauses->cites: removes one ban BY NUMERIC LIST ID (not by IP, unlike removeip SV_RemoveIP_f ban.c:203-227 which matches an IP string) -> id=atoi(Cmd_Argv(1)) ban.c:467 then SV_RemoveBansIPFilter(id) ban.c:484 (array-shift + numipfilters-- ban.c:391-397); ID == banlist column -> Do_BanList ban.c:315-321 prints Sys_Printf('%3i|...', i, ...) where i is the index over ipfilters[], same value banremove indexes (traced ID provenance to the print, not inferred); unblocks after removal -> SV_IsBanned ban.c:66-87 scans only surviving ipfilters[] at connect peer.c:48,255,326; refuses 'safe' -> ban.c:475-479 if ipfilters[id].type==ipft_safe return; out-of-range rejected -> ban.c:469-473 id<0||id>=numipfilters; persists to disk -> Cbuf_AddText('writeip') ban.c:485 -> SV_WriteIP_f ban.c:263-307 (LISTIP_NAME qwfwd_listip.cfg), reloaded by Ban_Init exec ban.c:520; no-arg form prints usage then dumps list -> ban.c:460-465 if Cmd_Argc()<2 { usage; SV_BanList_f(); return; }. Shared store ipfilters[] ban.c:56 (same array as addip/removeip/listip/banip/banlist). Set-by proxy console only: Cmd_ExecuteString cmd.c:869-913 no access flags, fed by TTY-gated Sys_ReadSTDIN sys.c:268; Cmd_RconCommand cmd.c:1008-1023 commented out; svc.c:464-465 forwards rcon, no own command. No C2 conflict. provenance=null (cold-synth). No SR-5 breadcrumb. Self-classify: TRACED-CLEAN, every clause maps to an enforcing branch/assignment/call incl. callee-follow into SV_RemoveBansIPFilter and ID-provenance trace into Do_BanList.",
  "description_proposed": null
}
```
