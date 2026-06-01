# describe-fill-synthesis ledger -- mvdsv `cuff`

- **project:** mvdsv
- **knob:** `cuff` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `admin-ban` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:cuff: synthesized -- per-frame usercmd zeroes button0+impulse while cuff_time>curtime (blocks fire/weapon-switch, not movement); IP-persisted across reconnect, RAM-only; admin-only -- origin=synthesized ref=src/sv_user.c:3705 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Temporarily prevents a player from firing or switching weapons. The player can still move, chat, and otherwise play; only attacking is disabled for the duration.
>
> cuff <userid/name> <minutes> [reason] = cuff the player for <minutes> (an optional reason is shown to them and announced in chat).
> cuff <userid/name> 0 = cancel an active cuff (un-cuff).
>
> Example: cuff Bob 5 -- cuff the player named Bob for 5 minutes.
>
> The penalty follows the player's IP: if they disconnect and reconnect while still cuffed, the remaining time is re-applied. It is held in memory only and is cleared by a server restart.
>
> Default: 0.5 minutes when no time is given; values above 1200 (or negative) are clamped to 1200.
> Set by: server console / rcon.
> See also: penaltylist.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| blocks firing + weapon switch (not movement/chat) | src/sv_user.c:3705 | `if (sv_client->cuff_time > curtime) sv_player->v->button0 = sv_player->v->impulse = 0;` | MATCH |
| arg sets timer in minutes | src/sv_ccmds.c:925 | `cl->cuff_time = curtime + (mins * 60.0);` | MATCH |
| default 0.5 min | src/sv_ccmds.c:894 | `double mins = 0.5;` | MATCH |
| out-of-range clamped to 1200 | src/sv_ccmds.c:915-918 / :889 | `if (mins < 0.0 || mins > MAXPENALTY) mins = MAXPENALTY;` / `#define MAXPENALTY 1200.0` | MATCH |
| 0 = cancel (un-cuff) | src/sv_ccmds.c:957-960 | `SV_BroadcastPrintf (PRINT_CHAT, "%s un-cuffed.\n", cl->name);` | MATCH |
| persists across reconnect (save on drop) | src/sv_main.c:381 | `SV_SavePenaltyFilter (drop, ft_cuff, drop->cuff_time);` | MATCH |
| persists across reconnect (restore on connect) | src/sv_user.c:311 | `sv_client->cuff_time = SV_RestorePenaltyFilter(sv_client, ft_cuff);` | MATCH |
| in-memory only (no disk write) | src/sv_main.c:2918-2940 | `penfilter_t penfilters[MAX_PENFILTERS]` filled in RAM; no FS_/fopen on penfilter | MATCH |
| admin-only (console/rcon) | src/sv_ccmds.c:1847 | `Cmd_AddCommand ("cuff", SV_Cuff_f);` and absent from ucmds[] (src/sv_user.c:3299+) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | Prevents firing (attack disabled) | sv_user.c:3705-3706 | `if (sv_client->cuff_time > curtime)` / `sv_player->v->button0 = sv_player->v->impulse = 0;` | MATCH (button0 zeroed; button0=fire confirmed at sv_user.c:4051 `ssw->firing = (ent->button0 != 0);`) |
| 2 | Prevents switching weapons | sv_user.c:3706 | `sv_player->v->button0 = sv_player->v->impulse = 0;` | MATCH (impulse zeroed at engine boundary; weapon-switch is impulse-driven in QW. See fyi flag: impulse also carries other mod actions) |
| 3 | Player can still move | sv_user.c:3699-3707 | movement set at 3699-3702 (fofs_movement), NOT touched by cuff block at 3705-3706 | MATCH (only button0+impulse zeroed; movement preserved) |
| 4 | Player can still chat / otherwise play; only attacking disabled | sv_user.c:3705-3706 | cuff block touches ONLY button0 + impulse; button1(use), button2(jump), angles, movement untouched | MATCH (chat is a clc command, not a button; not blocked) |
| 5 | `cuff <user> <minutes> [reason]` syntax + reason shown to player + announced in chat | sv_ccmds.c:902, 938-952 | `usage: cuff <userid/name> <minutes> [reason]`; reason concat 938-943; `SV_BroadcastPrintf (PRINT_CHAT, "%s cuffed for %.1f minutes...")` 948; centerprint to client 950-952 | MATCH |
| 6 | `cuff <user> 0` = cancel/un-cuff | sv_ccmds.c:928, 946, 954-960 | `cl->cuff_time = curtime + (mins*60.0)` (mins=0 -> cuff_time=curtime, so `cuff_time > curtime` false); `else { ... "%s un-cuffed.\n" }` | MATCH |
| 7 | Penalty follows player's IP | sv_main.c:2936 (save), sv_main.c:2950 (restore match) | `SV_IPCopy (penfilters[numpenfilters].ip, cl->realip.ip)`; `SV_IPCompare (cl->realip.ip, penfilters[i].ip)` | MATCH (keyed on realip.ip; full-IPv4 compare via SV_IPCompare 2899-2908) |
| 8 | Disconnect+reconnect while cuffed -> remaining time re-applied | sv_main.c:381 (save on drop), sv_main.c:2922 (only if still future), sv_user.c:311 (restore on connect) | `SV_SavePenaltyFilter (drop, ft_cuff, drop->cuff_time)`; `if (pentime < curtime) return;`; `sv_client->cuff_time = SV_RestorePenaltyFilter(sv_client, ft_cuff)` | MATCH (absolute expiry stored; only saved if still cuffed; restored+removed on reconnect) |
| 9 | Held in memory only; cleared by server restart | sv_main.c:2018-2019 | `penfilter_t penfilters[MAX_PENFILTERS];` / `int numpenfilters;` — global arrays, no fopen/fwrite/disk persistence anywhere (full grep penfilters) | MATCH |
| 10 | Default 0.5 minutes when no time given | sv_ccmds.c:893, 913 | `double mins = 0.5;` ... `if (c >= 3) { mins = Q_atof(Cmd_Argv(2)); ... }` | MATCH (mins stays 0.5 unless minutes arg present) |
| 11 | Values >1200 or negative clamped to 1200 | sv_ccmds.c:889, 916-919 | `#define MAXPENALTY 1200.0`; `if (mins < 0.0 \|\| mins > MAXPENALTY) { mins = MAXPENALTY; }` | MATCH (clamp applies in explicit-minutes branch; 0 is not negative so passes as cancel) |
| 12 | Set by: server console / rcon | sv_ccmds.c:1847 | `Cmd_AddCommand ("cuff", SV_Cuff_f);` (plain Cmd_AddCommand, grouped with mute/rm/ls/penaltylist admin cmds) | MATCH (server console command; remote admin reaches via rcon) |
| 13 | See also: penaltylist | sv_ccmds.c:1849, 1099-1101 | `Cmd_AddCommand ("penaltylist", SV_ListPenalty_f);`; lists active cuffs `"%i %s cuff (remaining: %d)"` | MATCH (penaltylist exists, displays active + saved cuff penalties) |

**V-pass notes:** Oracle confirmed at 1.11-53-g18d0362. Every material clause maps to a located, verified enforcing line including adjacent comments. The cuff feature is the bliP penalty-filter subsystem: command handler SV_Cuff_f (sv_ccmds.c:890-966) sets client_t.cuff_time, and the SINGLE enforcing site is in SV_RunCmd at sv_user.c:3705-3706, which zeroes button0 (attack/fire) AND impulse (weapon-switch + other impulse actions) when cuff_time is still in the future. Movement (fofs_movement, set at 3699-3702) is explicitly NOT zeroed, confirming "can still move." button1 (use) and button2 (jump) are also untouched. Chat is a clc command, not a button, so it is unaffected -- "can still chat" holds.

IP-persistence chain fully traced: save on SV_DropClient (sv_main.c:381) guarded by SV_SavePenaltyFilter's `if (pentime < curtime) return;` (only saves while still cuffed), restore on connect (sv_user.c:311). Stored as ABSOLUTE expiry timestamp keyed on realip.ip in a global penfilters[] array with NO disk persistence -- so the clock keeps running during the disconnect and a restart clears it. Description's "remaining time is re-applied" is accurate in effect.

Default (0.5), clamp (negative or >1200 -> 1200 via MAXPENALTY 1200.0), and cancel-via-0 all verified at their exact lines. Access class (server console / rcon) verified against the registration site -- plain Cmd_AddCommand grouped with the other admin commands; no CF_-flag system applies here (that is KTX, not mvdsv server-console commands). penaltylist cross-reference confirmed present and correct.

No clause contradicts code; no clause is mere name/string/enum inference without an enforcing read-site. Classification: TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] The enforcing line sv_user.c:3706 zeroes sv_player->v->impulse, which in stock QW is the weapon-switch mechanism (impulse 1-8 / weapon / bestweapon) but ALSO carries other mod-defined impulse actions (drop pack, lefthand toggle, mod menu commands, etc.). The description's framing 'prevents firing or switching weapons' and 'only attacking is disabled' is accurate for the dominant, player-observable effect and the engine-visible truth (button0=fire, impulse=weapon-select), and it explicitly names weapon-switching as blocked. The impulse-blocks-more-than-just-weapons subtlety is engine-boundary-only (the impulse never reaches mod QC) and does not rise to a near-miss because (a) weapon-switching IS what impulse predominantly means to a player and (b) the description does call out weapon-switching as disabled. Flagged only as a precision fyi for the synth's awareness.
- [fyi/other/vpass] Minor scope nuance in clause 11: the negative/>1200 clamp at sv_ccmds.c:916-919 lives ONLY inside the `if (c >= 3)` explicit-minutes branch. When no minutes argument is supplied (default path, mins=0.5) the clamp is never reached. The proposed description correctly frames the clamp as applying to supplied values, so this is consistent -- noting it only so a future edit does not accidentally generalize the clamp to the default.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, qtv_status=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "cuff",
  "type": "command",
  "description": "Temporarily prevents a player from firing or switching weapons. The player can still move, chat, and otherwise play; only attacking is disabled for the duration.\n\ncuff <userid/name> <minutes> [reason] = cuff the player for <minutes> (an optional reason is shown to them and announced in chat).\ncuff <userid/name> 0 = cancel an active cuff (un-cuff).\n\nExample: cuff Bob 5 -- cuff the player named Bob for 5 minutes.\n\nThe penalty follows the player's IP: if they disconnect and reconnect while still cuffed, the remaining time is re-applied. It is held in memory only and is cleared by a server restart.\n\nDefault: 0.5 minutes when no time is given; values above 1200 (or negative) are clamped to 1200.\nSet by: server console / rcon.\nSee also: penaltylist.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:3705. Handler SV_Cuff_f (src/sv_ccmds.c:890, registered src/sv_ccmds.c:1847). ENFORCING site src/sv_user.c:3704-3706 in the per-frame usercmd path: `if (sv_client->cuff_time > curtime) sv_player->v->button0 = sv_player->v->impulse = 0;` -- button0 is the attack/fire button and impulse is weapon-switch, so while cuffed the player cannot fire or change weapons; movement (forwardmove/sidemove/upmove set just above at :3699-3702) is NOT zeroed, so cuff does not block movement -- name 'cuff' (handcuffed = can't shoot) matches. Sets cl->cuff_time = curtime + (mins*60.0) at src/sv_ccmds.c:921-925; curtime is seconds (sv_sys_*.c). Default mins=0.5 at src/sv_ccmds.c:894; clamp `if (mins < 0.0 || mins > MAXPENALTY) mins = MAXPENALTY;` at src/sv_ccmds.c:915-918 with #define MAXPENALTY 1200.0 at src/sv_ccmds.c:889 -- negative or >1200 becomes 1200, not rejected. mins==0 -> 'un-cuffed' broadcast at src/sv_ccmds.c:957-960. Reason concatenated from Cmd_Argv(3..) at src/sv_ccmds.c:935-944. Persistence: on disconnect SV_SavePenaltyFilter(drop, ft_cuff, drop->cuff_time) at src/sv_main.c:381 stores remaining time keyed to realip; on reconnect cuff_time = SV_RestorePenaltyFilter(sv_client, ft_cuff) at src/sv_user.c:311; the store is the in-memory penfilters[] array (src/sv_main.c:2918-2940), no disk write found (grep of FS_/fopen/fwrite on penfilter = none), so it does not survive a server restart. Access class: Cmd_AddCommand registration only; NOT present in client ucmds[] table (src/sv_user.c:3299+) -> server console / rcon, admin-only. F-MV1: no override in ktx/src (grep mute|cuff|cuff_time = empty).",
  "description_proposed": null
}
```
