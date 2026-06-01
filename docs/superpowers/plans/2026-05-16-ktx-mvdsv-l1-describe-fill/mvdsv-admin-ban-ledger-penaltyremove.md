# describe-fill-synthesis ledger -- mvdsv `penaltyremove`

- **project:** mvdsv
- **knob:** `penaltyremove` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `admin-ban` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:penaltyremove: synthesized -- removes one SAVED (disconnected-player IP) penalty filter by penaltylist index via SV_RemoveIPFilter (sv_main.c:2873); does NOT un-penalise live players; admin-only -- origin=synthesized ref=src/sv_ccmds.c:1055 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Removes one entry from the Saved Penalty List -- the stored mute or cuff penalties belonging to disconnected players that would otherwise be re-applied when they reconnect.
>
> penaltyremove <num> = remove the saved penalty whose index is <num> (the index shown by penaltylist).
>
> This only clears a SAVED (disconnected-player) penalty; it does not lift a mute or cuff on a player who is currently connected -- use mute/cuff with 0 minutes for that. Prints "Removed." on success, or a not-found message if no saved entry has that index.
>
> Set by: server console / rcon.
> See also: penaltylist, mute, cuff.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| takes exactly one index arg | src/sv_ccmds.c:1060-1064 | `if (Cmd_Argc() != 2) { Con_Printf ("penaltyremove [num]\n"); return; }` | MATCH |
| index parsed as integer | src/sv_ccmds.c:1066 | `num = Q_atoi(Cmd_Argv(1));` | MATCH |
| removes matching saved entry, prints 'Removed.' | src/sv_ccmds.c:1068-1075 | `if (i == num) { SV_RemoveIPFilter (i); Con_Printf ("Removed.\n"); return; }` | MATCH |
| not-found message | src/sv_ccmds.c:1077 | `Con_Printf ("Didn't find penalty filter %i.\n", num);` | MATCH |
| acts on the SAVED penfilters[] list (not live clients) | src/sv_main.c:2873-2879 | `void SV_RemoveIPFilter (int i){ for(; i+1<numpenfilters; i++) penfilters[i]=penfilters[i+1]; numpenfilters--; }` | MATCH |
| saved list = disconnected players only | src/sv_main.c:380-381 | `SV_SavePenaltyFilter (drop, ft_mute/ft_cuff, ...);` (populated on drop) | MATCH |
| index matches penaltylist Saved index | src/sv_ccmds.c:1114 | `Con_Printf ("%i: %s for ...", i, s, ...)` (same i loop variable) | MATCH |
| admin-only (console/rcon) | src/sv_ccmds.c:1850 | `Cmd_AddCommand ("penaltyremove", SV_RemovePenalty_f);` and absent from ucmds[] | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Command `penaltyremove`, takes `<num>` arg (exactly 2 argc) | sv_ccmds.c:1850 (reg); 1061-1067 (handler) | `Cmd_AddCommand ("penaltyremove", SV_RemovePenalty_f);` / `if (Cmd_Argc() != 2){ Con_Printf ("penaltyremove [num]\n"); return;}` / `num = Q_atoi(Cmd_Argv(1));` | MATCH |
| 2 | Removes ONE entry from the "Saved Penalty List" | sv_ccmds.c:1069-1077; callee SV_RemoveIPFilter sv_main.c:2873-2879 | `for (i=0; i<numpenfilters; i++){ if (i==num){ SV_RemoveIPFilter(i); Con_Printf("Removed.\n"); return; }}` -> callee shifts `penfilters[i]=penfilters[i+1]` and `numpenfilters--` (removes exactly one) | MATCH |
| 2b | List literally named "Saved Penalty List" | sv_ccmds.c:1105 | `Con_Printf ("Saved Penalty List:\n");` (penaltylist prints this header for the penfilters[] array penaltyremove indexes) | MATCH |
| 3 | List stores mute OR cuff penalties of DISCONNECTED players | sv_main.c:380-381 (in SV_DropClient); type enum server.h:783-786 | `SV_SavePenaltyFilter (drop, ft_mute, drop->lockedtill); SV_SavePenaltyFilter (drop, ft_cuff, drop->cuff_time);` inside `SV_DropClient` (called "when the player is totally leaving the server") | MATCH |
| 4 | Saved penalties re-applied when players reconnect | sv_user.c:310-311; callee SV_RestorePenaltyFilter sv_main.c:2942-2958 | `sv_client->lockedtill = SV_RestorePenaltyFilter(sv_client, ft_mute); sv_client->cuff_time = SV_RestorePenaltyFilter(sv_client, ft_cuff);` (restores time by IP+type match on connect path) | MATCH |
| 5 | `<num>` = index shown by penaltylist | sv_ccmds.c:1114 (list) vs 1071 (remove) | list prints `"%i: %s for %i.%i.%i.%i ...", i, ...`; remove matches `if (i == num)` over the SAME `penfilters[]` loop index -> same index space | MATCH |
| 6 | Clears SAVED only; does NOT lift mute/cuff on a currently-connected player | sv_ccmds.c:1055-1079 (whole handler) | handler touches ONLY `penfilters[]` via SV_RemoveIPFilter; never reads/writes `cl->lockedtill` or `cl->cuff_time` (the live-client penalty fields) | MATCH |
| 7 | Use mute/cuff with 0 minutes to lift an active penalty | sv_ccmds.c:902 (cuff usage), 986 (mute usage); cancel paths 954-960 / 1041-1047 | cuff usage `"(default = 0.5, 0 = cancel cuff)."`; mute usage `"(default = 0.5, 0 = cancel mute)."`; `if (mins){...} else {... "un-cuffed/un-muted" ...}` | MATCH |
| 8 | Prints "Removed." on success | sv_ccmds.c:1074 | `Con_Printf ("Removed.\n");` | MATCH |
| 9 | Prints not-found message if no saved entry has that index | sv_ccmds.c:1078 | `Con_Printf ("Didn't find penalty filter %i.\n", num);` (falls through after loop) | MATCH (see note re wording) |
| 10 | Set by: server console / rcon | sv_ccmds.c:1850; cmd.c:706 | registered via flat `Cmd_AddCommand` (no CF_ access flag in MVDSV) in the server-admin registration block (mute/cuff/penaltylist neighbours) -> server-side console/rcon command | MATCH |
| 11 | See also: penaltylist, mute, cuff | sv_ccmds.c:1846-1850 | `Cmd_AddCommand ("mute", ...); Cmd_AddCommand ("cuff", ...); Cmd_AddCommand ("penaltylist", SV_ListPenalty_f); Cmd_AddCommand ("penaltyremove", ...)` — all real, all in same block | MATCH |

**V-pass notes:** Every material clause maps to a located, verified enforcing line including callees (SV_RemoveIPFilter, SV_SavePenaltyFilter, SV_RestorePenaltyFilter) and adjacent comments (the SV_DropClient banner confirming "player is totally leaving", the bliP cuff/mute markers). Verdict: TRACED-CLEAN.

Mechanism confirmed end-to-end: penfilters[] (global, MAX_PENFILTERS=512, server.h:840) holds {ip[4], time, type=ft_mute|ft_cuff} per server.h:788-793. Save happens in SV_DropClient (sv_main.c:380-381), gated at sv_main.c:2922 so only future-dated penalties are kept (pentime < curtime -> return). Restore happens on the connect path (sv_user.c:310-311) and consumes (removes) the matched entry. penaltyremove indexes into the same array penaltylist prints under "Saved Penalty List:".

Two minor, NON-defect imprecisions (do not change classification; flagged FYI for the operator):

(a) Clause 6 says "use mute/cuff with 0 minutes" to lift an active penalty -- accurate for the connected-player path. Worth noting the saved (penfilters[]) entry is matched by IP, while mute/cuff are matched by userid/name; the description's framing is correct and does not assert anything false here. No fix needed.

(b) Clause 9 paraphrases the not-found output as "a not-found message". The literal string is `"Didn't find penalty filter %i.\n"`. The description does not quote it, so there is no contradiction; this is acceptable user-doc paraphrase. (Contrast clause 8 which quotes "Removed." verbatim and matches exactly.)

One behavioral subtlety the description does NOT claim but is worth recording: because SV_RemoveIPFilter compacts the array (shifts entries down), removing an entry RE-INDEXES all higher entries. The description correctly tells the user to use the index "shown by penaltylist" without implying stable indices across removals, so it is not wrong -- but an operator removing several entries in one sitting should re-run penaltylist between removals. Not a description defect; noted for completeness.

## flags_for_review

- [fyi/other/synthesis] Counterintuitive name: 'penaltyremove' sounds like it should lift a penalty on a player, but it only edits the SAVED (disconnected-player) penalty-filter list -- it cannot un-mute or un-cuff a currently-connected player (that requires `mute/cuff <player> 0`). Disambiguated in the description; flagging so the naive reading is caught at review.
- [fyi/other/vpass] SV_RemoveIPFilter (sv_main.c:2873) compacts penfilters[] by shifting entries down and decrementing numpenfilters, so every penaltyremove re-indexes all higher-numbered saved entries. The proposed description is not wrong (it says to use the index shown by penaltylist), but operators removing multiple entries must re-run penaltylist between removals. Pure FYI; no description change implied.
- [fyi/other/vpass] Saved penalties in penfilters[] are keyed by client real IP (SV_IPCompare on realip.ip), while the active mute/cuff and the mute/cuff commands operate by userid/name. This IP-vs-userid duality is internally consistent and the description does not misstate it, but it is the reason a saved penalty re-applies to anyone reconnecting from the same IP rather than to a specific account. Recorded as a mechanism nuance, not a defect.
- [fyi/other/vpass] MVDSV registers penaltyremove/penaltylist/mute/cuff via flat Cmd_AddCommand (cmd.c:706) with NO per-command access-class flag (no CF_ system like KTX). The 'Set by: server console / rcon' claim is therefore inferred from the registration site being the server-admin command block plus the standard QW dedicated-server console/rcon dispatch model, not from an explicit access flag. Verified-consistent for this command family; flagged so the access-class basis is on record rather than assumed.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, qtv_status=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "penaltyremove",
  "type": "command",
  "description": "Removes one entry from the Saved Penalty List -- the stored mute or cuff penalties belonging to disconnected players that would otherwise be re-applied when they reconnect.\n\npenaltyremove <num> = remove the saved penalty whose index is <num> (the index shown by penaltylist).\n\nThis only clears a SAVED (disconnected-player) penalty; it does not lift a mute or cuff on a player who is currently connected -- use mute/cuff with 0 minutes for that. Prints \"Removed.\" on success, or a not-found message if no saved entry has that index.\n\nSet by: server console / rcon.\nSee also: penaltylist, mute, cuff.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1055. Handler SV_RemovePenalty_f (src/sv_ccmds.c:1055, registered src/sv_ccmds.c:1850). Arg check: requires exactly one arg, else prints usage 'penaltyremove [num]' (src/sv_ccmds.c:1060-1064). num = Q_atoi(Cmd_Argv(1)) at src/sv_ccmds.c:1066; loops i over numpenfilters and on i==num calls SV_RemoveIPFilter(i) then prints 'Removed.' and returns (src/sv_ccmds.c:1068-1075); if no match prints \"Didn't find penalty filter %i.\" (src/sv_ccmds.c:1077). Target list: SV_RemoveIPFilter (src/sv_main.c:2873-2879) compacts the penfilters[] array (the SAVED list, src/sv_main.c:2918-2940) by shifting entries down and decrementing numpenfilters -- so it operates on the SAVED (disconnected-player, IP-keyed) penalty filters, NOT on cl->lockedtill / cl->cuff_time of connected clients. Counterintuitive-name disambiguation: 'penaltyremove' does NOT un-penalise a live player; the saved list is only populated on disconnect (src/sv_main.c:380-381), so removing index N just prevents that disconnected IP's penalty from being restored on reconnect -- a connected player is un-muted/un-cuffed by re-issuing mute/cuff with 0 minutes. The <num> index is exactly the index printed by penaltylist's Saved section (src/sv_ccmds.c:1114, same i). NOTE: SV_RemoveIPFilter does not bounds-check i<numpenfilters internally, but the caller only ever passes a value it matched against the live numpenfilters loop, so an out-of-range num falls through to the not-found message -- no defect. Access class: Cmd_AddCommand only, NOT in ucmds[] -> server console / rcon, admin-only. F-MV1: no ktx/src override.",
  "description_proposed": null
}
```
