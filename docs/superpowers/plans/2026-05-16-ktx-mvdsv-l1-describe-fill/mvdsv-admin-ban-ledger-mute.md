# describe-fill-synthesis ledger -- mvdsv `mute`

- **project:** mvdsv
- **knob:** `mute` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `admin-ban` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:mute: synthesized -- lockedtill gates chat (sv_user.c:1849), name-change (:2389) and VOIP (:2873); *-prefix silent; IP-persisted RAM-only; shares the floodprot talk-lock field; admin-only -- origin=synthesized ref=src/sv_user.c:1849 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Temporarily silences a player. While muted the player cannot send chat messages, cannot change their name, and cannot transmit voice (VOIP). They can still move and play normally.
>
> mute <userid/name> <minutes> [reason] = mute the player for <minutes> (an optional reason is shown to them and announced in chat).
> mute <userid/name> *<minutes> = same, but prefixing the minutes with * mutes them silently (no public announcement).
> mute <userid/name> 0 = cancel an active mute (un-mute).
>
> Example: mute Bob 10 -- mute the player named Bob for 10 minutes.
>
> The penalty follows the player's IP: if they disconnect and reconnect while still muted, the remaining time is re-applied. It is held in memory only and is cleared by a server restart.
>
> Default: 0.5 minutes when no time is given; values above 1200 (or negative) are clamped to 1200.
> Set by: server console / rcon.
> See also: penaltylist.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| blocks chat while muted | src/sv_user.c:1849 | `if (curtime < sv_client->lockedtill) { ... "You can't talk for %d more seconds" ; return; }` | MATCH |
| blocks name change while muted | src/sv_user.c:2389 | `if (curtime < sv_client->lockedtill) { ... "You can't change your name while you're muted"; return; }` | MATCH |
| blocks voice/VOIP while muted | src/sv_user.c:2873 | `if (bytes > ... || curtime < host_client->lockedtill || !sv_voip.ival) { MSG_ReadSkip(bytes); return; }` | MATCH |
| arg sets timer in minutes | src/sv_ccmds.c:1010 | `cl->lockedtill = curtime + (mins * 60.0);` | MATCH |
| default 0.5 min | src/sv_ccmds.c:973 | `double mins = 0.5;` | MATCH |
| out-of-range clamped to 1200 | src/sv_ccmds.c:1003-1004 / :889 | `if (mins < 0.0 || mins > MAXPENALTY) mins = MAXPENALTY;` / `#define MAXPENALTY 1200.0` | MATCH |
| *-prefix = silent (suppress broadcast) | src/sv_ccmds.c:994-998 | `if (*ptr == '*') { ptr++; print = false; }` (broadcast gated `if (print)` :1019) | MATCH |
| 0 = cancel (un-mute) | src/sv_ccmds.c:1029-1032 | `SV_BroadcastPrintf (PRINT_CHAT, "%s un-muted.\n", cl->name);` | MATCH |
| persists across reconnect (save on drop) | src/sv_main.c:380 | `SV_SavePenaltyFilter (drop, ft_mute, drop->lockedtill);` | MATCH |
| persists across reconnect (restore on connect) | src/sv_user.c:310 | `sv_client->lockedtill = SV_RestorePenaltyFilter(sv_client, ft_mute);` | MATCH |
| in-memory only (no disk write) | src/sv_main.c:2918-2940 | RAM `penfilters[]`; no FS_/fopen on penfilter | MATCH |
| admin-only (console/rcon) | src/sv_ccmds.c:1846 | `Cmd_AddCommand ("mute", SV_Mute_f);` and absent from ucmds[] | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | Muted player cannot send chat messages | src/sv_user.c:1849-1851 | `if (curtime < sv_client->lockedtill) { SV_ClientPrintf(..., "You can't talk for %d more seconds\n", ...); return; }` | MATCH (base-engine; see flags re fp_messages gate + mod-say bypass) |
| 2 | Cannot change their name | src/sv_user.c:2389-2392 | `if (curtime < sv_client->lockedtill) { SV_ClientPrintf(..., "You can't change your name while you're muted\n"); return; }` (preceded by `if (!strcmp(Cmd_Argv(1), "name"))` @2386) | MATCH |
| 3 | Cannot transmit voice (VOIP) | src/sv_user.c:2873-2876 | `if (bytes > sizeof(ring->data) || curtime < host_client->lockedtill || !sv_voip.ival) { MSG_ReadSkip(bytes); return; }` (in SV_VoiceReadPacket) | MATCH |
| 4 | Can still move and play normally | (absence) all `lockedtill`/`->mute` sites grepped: sv_user.c 310/1849/1857/2389/2873, sv_ccmds.c 1015/1095/1097, sv_main.c 380/1459, server.h:288 | No read of `lockedtill` in any movement/physics/impulse/weapon/input path | MATCH (negative claim verified by exhaustive grep) |
| 5 | `mute <id> <minutes> [reason]` mutes for <minutes>; optional reason shown to player AND announced in chat | src/sv_ccmds.c:1015,1036,1037 | `cl->lockedtill = curtime + (mins*60.0);` / broadcast `"%s muted for %.1f minutes%s%s"` (reason appended) / centerprint `"You are muted for %.1f minutes%s%s"` (reason appended) | MATCH |
| 6 | `*<minutes>` prefix mutes silently (no public announcement) | src/sv_ccmds.c:1000-1004,1035-1039 | `if (*ptr == '*') { ptr++; print = false; }` then `if (print) SV_BroadcastPrintf(...)`; centerprint at 1037-1039 NOT gated by print | MATCH (public broadcast suppressed; private centerprint still fires -- consistent with "no public announcement") |
| 7 | `0` cancels an active mute (un-mute) | src/sv_ccmds.c:1015,1041-1046; enforced at sv_user.c:1849 | `mins=0` -> `lockedtill = curtime`; talk-block is strict `curtime < lockedtill` (false when equal) -> unmuted; broadcast `"%s un-muted.\n"` | MATCH |
| 8 | Penalty follows the player's IP; disconnect+reconnect while muted re-applies remaining time | src/sv_main.c:380 (save on drop), :2918-2939 (SV_SavePenaltyFilter keyed on `cl->realip.ip`), :2942-2957 (restore), src/sv_user.c:310 (`lockedtill = SV_RestorePenaltyFilter(...)`) | save: `if (pentime < curtime) return;` + `SV_IPCopy(...ip, cl->realip.ip)`; restore: returns saved absolute `penfilters[i].time` and removes it; realip = "client's ip, not latest proxy's" (server.h:360) | MATCH (restores original absolute expiry -> same remaining deadline) |
| 9 | Held in memory only; cleared by server restart | src/sv_main.c:2018-2019 | `penfilter_t penfilters[MAX_PENFILTERS]; int numpenfilters;` -- plain BSS globals; only in-memory readers/writers (Save/Restore/Remove/Clean/List); no disk persistence anywhere in tree | MATCH |
| 10 | Default 0.5 minutes when no time given | src/sv_ccmds.c:976,997 | `double mins = 0.5;` overwritten only `if (c >= 3)` (minutes arg supplied) | MATCH |
| 11 | Values above 1200 or negative clamped to 1200 | src/sv_ccmds.c:889,1006-1007 | `#define MAXPENALTY 1200.0` ; `if (mins < 0.0 || mins > MAXPENALTY) mins = MAXPENALTY;` | MATCH |
| 12 | Set by: server console / rcon | src/sv_ccmds.c:1846 | `Cmd_AddCommand("mute", SV_Mute_f);` -- server command table (NOT in client `ucmds[]`); no client-facing exposure found | MATCH |
| 13 | See also: penaltylist | src/sv_ccmds.c:1849 | `Cmd_AddCommand("penaltylist", SV_ListPenalty_f);` -- lists active + saved mute/cuff penalties | MATCH (valid cross-ref) |

**V-pass notes:** TRACED-CLEAN. All 13 material clauses map to located, verified enforcing lines (with adjacent comments checked). The mute effect is stored in client_t.lockedtill (an absolute curtime-based deadline); the three behavioral blocks each independently gate on `curtime < lockedtill` at their own site (chat sv_user.c:1849, name sv_user.c:2389, voice sv_user.c:2873). The negative "can still move/play" claim is verified by exhaustive grep -- lockedtill is read in exactly the 3 enforcement sites plus list/save/restore/init, and NONE in any movement/physics/weapon/input path. Default 0.5 (sv_ccmds.c:976), clamp to MAXPENALTY=1200 on negative-or-over (1006-1007), un-mute via 0 (lockedtill=curtime, strict `<` => unmuted), silent `*` prefix (print=false suppresses only the public broadcast; private centerprint still fires => "no public announcement" is precise), reason appended to both broadcast and centerprint, IP-following reconnect via penfilters[] keyed on realip ("client's ip, not latest proxy's"), in-memory BSS array cleared on restart, server-console/rcon registration, and the penaltylist cross-ref all verify MATCH. WI-2 RegisterCvar rule N/A (mute is a Cmd_AddCommand command, not a cvar; the documented "Default 0.5" is the code-level no-arg default `mins=0.5`, correctly characterized). Two conditional scope qualifiers were traced and do NOT contradict the as-written base-engine claims (see flags): (a) the chat-block sits inside `if (fp_messages)` -- but fp_messages defaults to 4 and the `floodprot` command rejects arg<=0 (sv_ccmds.c:1621), so it is not disableable at runtime; (b) the chat-block sits AFTER the `if (j) return` mod-handled-say short-circuit (PR_ClientSay), so a mod that fully handles say bypasses the engine mute chat-block. These are FYI/review nuances appropriate to flag but not defects in a Layer-1 base-engine description.

## flags_for_review

- [fyi/other/synthesis] mute and the automatic flood-protection silence share the same client field (lockedtill): floodprot writes it at src/sv_user.c:1857, the mute command writes it at src/sv_ccmds.c:1010, and both are read by the same three gates (chat :1849, name :2389, voice :2873). Consequence: a flood-silenced player appears in penaltylist's Active section labelled 'mute', and a manual `mute ... 0` (un-mute) would also clear a floodprot lock (and vice-versa). Not a bug, but a cross-feature coupling worth a human note for any L3 concept note on server moderation.
- [review/cross-mod-override/vpass] The mute chat-block (sv_user.c:1849) is reached only if the mod's say handler did NOT consume the message: sv_user.c:1832 `j = PR_ClientSay(team, p);` then 1836 `if (j) return; // say was handled by mod.` A QC/PR2 mod (e.g. KTX) that fully handles say/say_team and returns non-zero bypasses the engine-level mute chat-block, so chat-muting may depend on the mod re-implementing it. Name-change (sv_user.c:2389) and VOIP (sv_user.c:2873) blocks are NOT behind this short-circuit and always fire. The description documents correct base-engine behavior; this is a cross-mod nuance, not a contradiction.
- [fyi/other/vpass] The mute chat-block is nested inside `if (fp_messages)` (sv_user.c:1848); if floodprot were disabled (fp_messages==0) the talk-block would be skipped. In practice fp_messages defaults to 4 and the `floodprot` command rejects any value <=0 (sv_ccmds.c:1621 `if (arg1<=0 ...) return`), so it cannot be turned off at runtime -- the chat-mute is effectively always active. No impact on the claim as written; recorded for completeness.
- [fyi/other/vpass] Latent quirk in SV_SavePenaltyFilter (sv_main.c:2931): the full-array guard compares numpenfilters against MAX_IPFILTERS (1024) while penfilters[] is sized MAX_PENFILTERS (512). A potential out-of-bounds at high penalty counts; unrelated to the documented mute behavior and not description-relevant. Flagging as a possible upstream bug observed while tracing.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, qtv_status=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "mute",
  "type": "command",
  "description": "Temporarily silences a player. While muted the player cannot send chat messages, cannot change their name, and cannot transmit voice (VOIP). They can still move and play normally.\n\nmute <userid/name> <minutes> [reason] = mute the player for <minutes> (an optional reason is shown to them and announced in chat).\nmute <userid/name> *<minutes> = same, but prefixing the minutes with * mutes them silently (no public announcement).\nmute <userid/name> 0 = cancel an active mute (un-mute).\n\nExample: mute Bob 10 -- mute the player named Bob for 10 minutes.\n\nThe penalty follows the player's IP: if they disconnect and reconnect while still muted, the remaining time is re-applied. It is held in memory only and is cleared by a server restart.\n\nDefault: 0.5 minutes when no time is given; values above 1200 (or negative) are clamped to 1200.\nSet by: server console / rcon.\nSee also: penaltylist.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1849. Handler SV_Mute_f (src/sv_ccmds.c:973, registered src/sv_ccmds.c:1846). Sets cl->lockedtill = curtime + (mins*60.0) at src/sv_ccmds.c:1006-1010; curtime is seconds. THREE enforcing read-sites of lockedtill: (1) chat blocked -- src/sv_user.c:1848-1851 `if (fp_messages) { if (curtime < sv_client->lockedtill) { ... \"You can't talk for %d more seconds\" ; return; } }`; (2) name change blocked -- src/sv_user.c:2388-2393 `if (curtime < sv_client->lockedtill) { ... \"You can't change your name while you're muted\"; return; }`; (3) voice/VOIP dropped -- src/sv_user.c:2873 `if (bytes > sizeof(ring->data) || curtime < host_client->lockedtill || !sv_voip.ival) { MSG_ReadSkip(bytes); return; }`. Default mins=0.5 at src/sv_ccmds.c:973; clamp to MAXPENALTY=1200.0 at src/sv_ccmds.c:1003-1004 (#define src/sv_ccmds.c:889). Silent flag: src/sv_ccmds.c:994-998 `ptr = Cmd_Argv(2); if (*ptr == '*') { ptr++; print = false; }` and the public broadcast at src/sv_ccmds.c:1019-1020 is gated `if (print)`; the private centerprint to the target is always sent. mins==0 -> 'un-muted' at src/sv_ccmds.c:1029-1032 (also gated on print). C2 note (shared timer, surfaced not absorbed): lockedtill is ALSO the flood-protection 'talk lock' -- floodprot sets sv_client->lockedtill = curtime + fp_secondsdead at src/sv_user.c:1857 -- so the same field backs both the mute command and automatic flood silencing; this is why penaltylist labels a lockedtill entry 'mute'. The user doc states the mute-command behavior only; the floodprot overlap is mechanism detail. Persistence: SV_SavePenaltyFilter(drop, ft_mute, drop->lockedtill) at src/sv_main.c:380 on disconnect; restore at src/sv_user.c:310; in-memory penfilters[] (src/sv_main.c:2918-2940), no disk write, cleared on restart. Access class: registered via Cmd_AddCommand only; NOT in ucmds[] (the 'muteall'/'unmuteall'/'vignore' in ucmds at src/sv_user.c:3365-3367 are the separate client-side VOIP-ignore commands, a different feature) -> server console / rcon, admin-only. F-MV1: no ktx/src override.",
  "description_proposed": null
}
```
