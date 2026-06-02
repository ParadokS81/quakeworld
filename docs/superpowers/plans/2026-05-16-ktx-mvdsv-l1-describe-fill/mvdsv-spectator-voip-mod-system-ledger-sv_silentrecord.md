# describe-fill-synthesis ledger -- mvdsv `sv_silentrecord`

- **project:** mvdsv
- **knob:** `sv_silentrecord` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_silentrecord: synthesized -- suppresses the routine recording start/cancel/complete chat broadcasts (errors still announce); default 0; KTX race mode auto-toggles it -- origin=synthesized ref=src/sv_demo.c:855 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Suppresses the routine chat broadcasts the server prints when a server-side MVD recording starts, is cancelled, or finishes normally. Error notices (recording error, QTV disconnect, max demo size exceeded) are still broadcast regardless of this setting.
>
> 0 = announce recording start / cancel / completion in chat.
> 1 = stay silent for those routine events.
>
> Default: 0.
> Set by: server config / rcon (the KTX race mode toggles it automatically).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 0 | src/sv_demo.c:54 | `cvar_t sv_silentrecord = {"sv_silentrecord", "0"};` | MATCH |
| value 1 suppresses record-start chat broadcast | src/sv_demo.c:855 | `if ( !sv_silentrecord.value ) SV_BroadcastPrintf (PRINT_CHAT, "Server starts recording (%s):...` | MATCH |
| value 1 suppresses cancel broadcast (only in non-error else branch) | src/sv_demo.c:960 | `if ( !sv_silentrecord.value ) SV_BroadcastPrintf (PRINT_CHAT, "Server recording canceled, demo removed\n");` | MATCH |
| value 1 suppresses completed broadcast (only when !reason) | src/sv_demo.c:995 | `if ( !sv_silentrecord.value ) SV_BroadcastPrintf (PRINT_CHAT, "Server recording completed\n");` | MATCH |
| error/QTV notices NOT suppressed | src/sv_demo.c:964 | `if (reason == 4) SV_BroadcastPrintf (PRINT_CHAT, "Error in MVD/QTV recording, recording stopped\n");` | MATCH |
| max-size notice NOT suppressed | src/sv_demo.c:1004 | `else SV_BroadcastPrintf (PRINT_CHAT, "Server recording stopped\nMax demo size exceeded\n");` | MATCH |
| KTX race mode sets the value | ktx/src/race.c:5244 | `cvar_fset("sv_silentrecord", cvar(RACE_MATCH_CVAR) ? 0 : 1);` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Suppresses chat broadcast on recording START | sv_demo.c:855-857 | `if ( !sv_silentrecord.value )` then `SV_BroadcastPrintf (PRINT_CHAT, "Server starts recording (%s):\n%s\n", ...)` | MATCH |
| 2 | Suppresses chat broadcast on recording CANCEL | sv_demo.c:960-961 | `if ( !sv_silentrecord.value )` then `SV_BroadcastPrintf (PRINT_CHAT, "Server recording canceled, demo removed\n");` (reason==2 path, via SV_MVD_Cancel_f→SV_MVDStop(2) sv_demo.c:1030) | MATCH |
| 3 | Suppresses chat broadcast on recording FINISH normally | sv_demo.c:995-996 | `if ( !sv_silentrecord.value )` then `SV_BroadcastPrintf (PRINT_CHAT, "Server recording completed\n");` (reason==0 path, via SV_MVDStop_f→SV_MVDStop(0) sv_demo.c:1018) | MATCH |
| 4 | "chat broadcasts" framing (these are chat-level, broadcast to all) | bothdefs.h:143 + sv_send.c:345 | `#define PRINT_CHAT 3 // chat messages`; `void SV_BroadcastPrintf (int level, char *fmt, ...)` | MATCH |
| 5 | Error notice "recording error" STILL broadcast regardless | sv_demo.c:954-955 | `if (reason == 4)` ... `SV_BroadcastPrintf (PRINT_CHAT, "Error in MVD/QTV recording, recording stopped\n");` — NO silentrecord guard | MATCH |
| 6 | Error notice "QTV disconnect" STILL broadcast regardless | sv_demo.c:956-957 | `else if (reason == 3)` ... `SV_BroadcastPrintf (PRINT_CHAT, "QTV disconnected\n");` — NO silentrecord guard | MATCH |
| 7 | Error notice "max demo size exceeded" STILL broadcast regardless | sv_demo.c:998-999 | `else` (numclosed && reason!=0) `SV_BroadcastPrintf (PRINT_CHAT, "Server recording stopped\nMax demo size exceeded\n");` — NO silentrecord guard | MATCH |
| 8 | Polarity: 0 = announce | sv_demo.c:855/960/995 | `if ( !sv_silentrecord.value )` — broadcast fires when value is falsy (0) | MATCH |
| 9 | Polarity: 1 = stay silent | sv_demo.c:855/960/995 | same `!value` guard — broadcast suppressed when value truthy (1) | MATCH |
| 10 | Default: 0 | sv_demo.c:54 (registered sv_demo.c:1858) | `cvar_t sv_silentrecord = {"sv_silentrecord",   "0"};` ; `Cvar_Register (&sv_silentrecord);` | MATCH |
| 11 | Set by server config / rcon (plain settable cvar) | sv_demo.c:54 | declaration carries only name+default, no CVAR_ROM/SERVERINFO flags → ordinary writable server cvar | MATCH |
| 12 | KTX race mode toggles it automatically | ktx race.c:294, 317, 5244 | `"sv_silentrecord 1\n"` (race_settings), `"sv_silentrecord 0\n"` (norace_settings), `cvar_fset("sv_silentrecord", cvar(RACE_MATCH_CVAR) ? 0 : 1);` | MATCH |

**V-pass notes:** VERDICT: TRACED-CLEAN. Oracle confirmed at 1.11-53-g18d0362. All 12 material clauses map to located, verified enforcing lines (with adjacent comments checked).

The cvar has exactly three read-sites, all in sv_demo.c, all the same guard form `if ( !sv_silentrecord.value )`, each wrapping one SV_BroadcastPrintf(PRINT_CHAT,...). I mapped the full SV_MVDStop reason enum to confirm the description's start/cancel/finish vs error-notice split is exact, not name-inferred:
- reason 0 (stop cmd, SV_MVDStop_f) -> "completed" at :995 = GATED (the description's "finishes normally").
- reason 2 (SV_MVD_Cancel_f) -> "canceled, demo removed" at :960 = GATED (the description's "cancelled").
- start path SV_InitRecordFile -> "Server starts recording" at :855 = GATED (the description's "start").
- reason 3 (QTV gone) -> "QTV disconnected" at :957 = UNCONDITIONAL.
- reason 4 (serious error, called from demo.error paths :477/:805) -> "Error in MVD/QTV recording" at :955 = UNCONDITIONAL.
- numclosed && reason!=0 -> "Max demo size exceeded" at :999 = UNCONDITIONAL.
The three error notices the description names map 1:1 to the three unconditional sites (:955 reason-4 "recording error", :957 reason-3 "QTV disconnect", :999 "max demo size exceeded"). No flavour-C inference: the start/cancel/finish-suppressed vs error-broadcast distinction is enforced by code structure, not surmised from the knob name.

Polarity (`!value`), default ("0" registered, NOT a shipped-cfg value), and the plain-settable-cvar claim (no CVAR_ROM/SERVERINFO in the struct literal) all verified at source. WI-2 default check: registered default is genuinely "0" at the literal; the KTX race.c "sv_silentrecord 1" is a mod-applied runtime override (race_settings cfg block), correctly characterized in the description as automatic toggling, NOT as the registered default. Cross-mod KTX claim verified in race.c at three sites (enter-race -> 1, leave-race -> 0, race match-mode toggle flips it).

One minor, non-defect observation (kept out of the table since the description does not assert otherwise): the suppression is broadcast-only; the recording itself and the serverdemo serverinfo (Cvar_SetROM(&serverdemo,...) at :858/:964/:1002) are unaffected by sv_silentrecord. The description scopes itself to "chat broadcasts" and does not over-claim, so this is just FYI context, not a missing clause.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_silentrecord",
  "type": "cvar",
  "description": "Suppresses the routine chat broadcasts the server prints when a server-side MVD recording starts, is cancelled, or finishes normally. Error notices (recording error, QTV disconnect, max demo size exceeded) are still broadcast regardless of this setting.\n\n0 = announce recording start / cancel / completion in chat.\n1 = stay silent for those routine events.\n\nDefault: 0.\nSet by: server config / rcon (the KTX race mode toggles it automatically).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_demo.c:855. Registration cvar_t literal default 0 at src/sv_demo.c:54 (WI-2). Three enforcing read-sites, each guarding an SV_BroadcastPrintf(PRINT_CHAT,...): src/sv_demo.c:855 `if ( !sv_silentrecord.value )` -> \"Server starts recording (memory|disk):\" on start; src/sv_demo.c:960 -> \"Server recording canceled, demo removed\" but ONLY in the else branch (reason!=4 error, reason!=3 QTV-disconnect, which broadcast unconditionally at :964/:966); src/sv_demo.c:995 -> \"Server recording completed\" only when `!reason` (a normal stop), whereas the reason!=0 path broadcasts \"Server recording stopped / Max demo size exceeded\" unconditionally (:1004). So value 1 suppresses the three routine messages; error/QTV/max-size notices are never suppressed. No CF flags on Cvar_Register (:1858) -> server config/rcon. F-MV1: KTX race mode is a live consumer -- ktx/src/race.c:5244 `cvar_fset(\"sv_silentrecord\", cvar(RACE_MATCH_CVAR) ? 0 : 1);` plus cfg blocks race.c:294 (\"sv_silentrecord 1\") / :317 (\"sv_silentrecord 0\"); KTX does not change the engine semantics, only the value. \"KTX race mode toggles it\" is inline-justified (action-relevant: the admin's value can be overwritten by the mod).",
  "description_proposed": null
}
```
