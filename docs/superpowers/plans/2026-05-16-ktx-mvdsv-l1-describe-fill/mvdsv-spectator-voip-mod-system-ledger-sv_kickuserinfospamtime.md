# describe-fill-synthesis ledger -- mvdsv `sv_kickuserinfospamtime`

- **project:** mvdsv
- **knob:** `sv_kickuserinfospamtime` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_kickuserinfospamtime: synthesized -- seconds window for userinfo-spam kick; 0 (or with count 0) disables -- origin=synthesized ref=src/sv_user.c:2311 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the time window, in seconds, used by the server's userinfo-spam kick. A player who changes their userinfo (name, skin, color, etc.) more than sv_kickuserinfospamcount times within this many seconds is dropped from the server.
>
> Value in seconds; the kick fires only while both this and sv_kickuserinfospamcount are greater than 0. Set either to 0 to disable userinfo-spam kicking entirely.
>
> Default: 3.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| value is seconds window for the userinfo-spam check | src/sv_user.c:2310-2311 | `if (!sv_client->lastuserinfotime \|\| curtime - sv_client->lastuserinfotime > sv_kickuserinfospamtime.value)` | MATCH |
| both this and ...count must be > 0 for the check to run (0 disables) | src/sv_user.c:2308 | `if (sv_kickuserinfospamtime.value > 0 && (int)sv_kickuserinfospamcount.value > 0)` | MATCH |
| companion count triggers the kick within this window | src/sv_user.c:2316,2323 | `else if (++(sv_client->lastuserinfocount) > (int)sv_kickuserinfospamcount.value)` ... `"%s was kicked for userinfo spam\n"` | MATCH |
| registered default 3 | src/sv_user.c:39 | `cvar_t sv_kickuserinfospamtime = {"sv_kickuserinfospamtime", "3"};` | MATCH |
| set by server config (no serverinfo flag / blocklist) | src/sv_user.c:4910 | `Cvar_Register (&sv_kickuserinfospamtime);` | MATCH |
| no KTX override | ktx/src (grep) | grep sv_kickuserinfospam -> 0 matches | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Sets a time window, in seconds, used by the userinfo-spam kick | src/sv_user.c:2311 (unit via src/sv_sys_unix.c:798 + flood sibling sv_user.c:1856/1850) | `curtime - sv_client->lastuserinfotime > sv_kickuserinfospamtime.value` ; `curtime = newtime;` (newtime=Sys_DoubleTime, seconds) | MATCH |
| 2 | Triggered by a player changing userinfo (name/skin/color/etc.) | src/sv_user.c:2301 + binding src/sv_user.c:3319 | `static void Cmd_SetInfo_f (void)` ; `{"setinfo", Cmd_SetInfo_f, false},` | MATCH |
| 3 | More than sv_kickuserinfospamcount changes within the window -> dropped | src/sv_user.c:2316-2330 | `else if (++(sv_client->lastuserinfocount) > (int)sv_kickuserinfospamcount.value)` ... `sv_client->drop = true;` | MATCH |
| 4 | Kick fires only while BOTH cvars > 0 | src/sv_user.c:2308 | `if (sv_kickuserinfospamtime.value > 0 && (int)sv_kickuserinfospamcount.value > 0)` | MATCH |
| 5 | Set either to 0 to disable entirely | src/sv_user.c:2308 (logical complement of the AND-guard) | `if (sv_kickuserinfospamtime.value > 0 && (int)sv_kickuserinfospamcount.value > 0)` | MATCH |
| 6 | Default: 3 | src/sv_user.c:39 (registered at src/sv_user.c:4910) | `cvar_t sv_kickuserinfospamtime = {"sv_kickuserinfospamtime", "3"};` ; `Cvar_Register (&sv_kickuserinfospamtime);` | MATCH |
| 7 | Set by: server config (plain writable server cvar) | src/sv_user.c:39 + 4910 (no CVAR_SERVERINFO/CVAR_ROM flag anywhere) | struct init has no flags field set; grep for flags/ROM/SERVERINFO on this cvar returns nothing | MATCH |

**V-pass notes:** Classification: TRACED-CLEAN. Every material clause (unit/polarity/threshold/default/scope/OFF-state) maps to a located, verified enforcing line in src/sv_user.c, with adjacent context confirmed.

Wide-grep result: the ONLY use-sites of sv_kickuserinfospamtime are declaration (sv_user.c:39), the enforcing reads (sv_user.c:2308 guard + 2311 window comparison), and registration (sv_user.c:4910). Companion sv_kickuserinfospamcount adds one read at sv_user.c:2316 (the count comparison). No use in any other file. No second enforcing path, no cross-mod override.

Enforcement chain (Cmd_SetInfo_f, the `setinfo` handler):
- Guard sv_user.c:2308: both cvars must be > 0 (confirms clauses 4 + 5).
- Reset branch sv_user.c:2310-2315: if first change OR gap `curtime - lastuserinfotime > sv_kickuserinfospamtime.value`, reset count=0 and re-stamp time -> anchors the window at burst-start.
- Kick branch sv_user.c:2316-2330: `++count > (int)count_cvar` -> SV_BroadcastPrintf "kicked for userinfo spam", SV_LogPlayer, sv_client->drop=true (confirms clause 3, strict greater-than = "more than").

Unit confirmation (clause 1): curtime = Sys_DoubleTime() in seconds (sv_sys_unix.c:798 / sv_sys_win.c:796; declared `double curtime; // not bounded or scaled` qwsvdef.h:101). Cross-validated against the flood-protection sibling in the same file: `curtime - whensaid[tmp] < fp_persecond` (sv_user.c:1856) and user message "you can't talk for %d more seconds" `(int)(lockedtill - curtime)` (sv_user.c:1850) -- curtime arithmetic is in seconds. The time cvar is compared as a raw float `.value`, so fractional-second windows are honored; "in seconds" is exact.

Default confirmation (WI-2, clause 6): registered default is the struct initializer "3" at sv_user.c:39, passed by reference to Cvar_Register at sv_user.c:4910. This is the registered default, not a shipped-cfg drift value.

Scope confirmation (clause 7): plain cvar_t with no flags; no CVAR_SERVERINFO / CVAR_ROM set anywhere -> ordinary writable server-side cvar settable from server config/rcon. "Set by: server config" is accurate.

## flags_for_review

- [fyi/other/vpass] Window-anchoring nuance (FYI, not a defect): lastuserinfotime (server.h:319) is re-stamped ONLY in the reset branch (sv_user.c:2314), not on each in-window change. So the window is a FIXED window from the first change of a burst, not a per-message sliding window. The description's plain-English 'more than N changes within this many seconds' remains accurate; this is just precision context for any downstream wiki page.
- [fyi/other/vpass] Type-handling asymmetry between the paired cvars (FYI, not a defect, does not affect any clause): sv_kickuserinfospamtime is read as a raw float .value (sv_user.c:2308, 2311) while sv_kickuserinfospamcount is read through an (int) cast (sv_user.c:2308, 2316). Consequence: a fractional time like 2.5 is honored, but a fractional count is truncated. Both registered defaults are integers (time 3, count 300) so default behavior is unaffected.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_kickuserinfospamtime",
  "type": "cvar",
  "description": "Sets the time window, in seconds, used by the server's userinfo-spam kick. A player who changes their userinfo (name, skin, color, etc.) more than sv_kickuserinfospamcount times within this many seconds is dropped from the server.\n\nValue in seconds; the kick fires only while both this and sv_kickuserinfospamcount are greater than 0. Set either to 0 to disable userinfo-spam kicking entirely.\n\nDefault: 3.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:2311. Enforcing sites in Cmd_SetInfo_f: src/sv_user.c:2308 `if (sv_kickuserinfospamtime.value > 0 && (int)sv_kickuserinfospamcount.value > 0)` -- both must be positive for the whole check to run, so a value <= 0 here disables it. src/sv_user.c:2311 uses this cvar as the seconds window: `curtime - sv_client->lastuserinfotime > sv_kickuserinfospamtime.value` resets the per-client counter when the window has elapsed (:2313-2314). The companion threshold is enforced at src/sv_user.c:2316 `else if (++(sv_client->lastuserinfocount) > (int)sv_kickuserinfospamcount.value)`, which drops the player ('was kicked for userinfo spam', :2323). Naming the companion cvar inline is action-relevant per D20 (an admin tuning flood protection must set the window and the count together). Registered default '3' verified at src/sv_user.c:39 `cvar_t sv_kickuserinfospamtime = {\"sv_kickuserinfospamtime\", \"3\"}`. Set-by: Cvar_Register at src/sv_user.c:4910, no CVAR_SERVERINFO, no blocklist -> server config / rcon. No KTX override (grep of ktx/src returned zero matches).",
  "description_proposed": null
}
```
