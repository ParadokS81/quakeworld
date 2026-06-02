# describe-fill-synthesis ledger -- mvdsv `sv_kicktop`

- **project:** mvdsv
- **knob:** `sv_kicktop` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_kicktop: synthesized -- on/off enable for topcolor-spam auto-kick (rate hardcoded >5 in 8s) -- origin=synthesized ref=src/sv_user.c:2415 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Enables automatic kicking of a player who rapidly spams shirt-color (topcolor) changes. When on, a player who changes topcolor too many times in quick succession is dropped from the server; when off, no such check is applied.
>
> 0 = off, no topcolor-spam kicking.
> 1 (or any nonzero value) = on, kick rapid topcolor spammers.
>
> Default: 1.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| nonzero enables / 0 disables the topcolor-spam check | src/sv_user.c:2415 | `if ((int)sv_kicktop.value && !strcmp(Cmd_Argv(1), "topcolor"))` | MATCH |
| kick on rapid topcolor changes (threshold hardcoded, not cvar) | src/sv_user.c:2417,2422,2429 | `if (!sv_client->lasttoptime \|\| curtime - sv_client->lasttoptime > 8)` ... `else if (sv_client->lasttopcount++ > 5)` ... `"%s was kicked for topcolor spam\n"` | MATCH |
| threshold literals 8/5 not configurable | src/sv_user.c (grep lasttoptime/lasttopcount) | only sv_user.c:2417-2422 read these fields; no cvar feeds 8 or 5 | MATCH |
| registered default 1 | src/sv_main.c:124 | `cvar_t sv_kicktop = {"sv_kicktop", "1"};` | MATCH |
| set by server config (no serverinfo flag / blocklist) | src/sv_main.c:3555 | `Cvar_Register (&sv_kicktop);` | MATCH |
| no KTX override | ktx/src (grep) | grep sv_kicktop -> 0 matches | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Enables auto-kicking of player who spams topcolor (shirt-color) changes | sv_user.c:2415 | `if ((int)sv_kicktop.value && !strcmp(Cmd_Argv(1), "topcolor"))` | MATCH -- gate requires both cvar on AND the changed userinfo key == "topcolor" (the QW shirt-color key); inside Cmd_SetInfo_f |
| 2 | "rapidly" / "quick succession" framing | sv_user.c:2417 | `if (!sv_client->lasttoptime \|\| curtime - sv_client->lasttoptime > 8)` | MATCH -- 8-second sliding window (curtime = wall-clock seconds, double); changes >8s apart reset the counter, so only rapid bursts accumulate. server.h:310 comment "time of last topcolor change" confirms field |
| 3 | "too many times ... is dropped" (threshold) | sv_user.c:2422 | `else if (sv_client->lasttopcount++ > 5)` | MATCH -- description makes no specific-number claim; actual threshold is post-increment >5 within window (kick on ~7th change). No false threshold asserted |
| 4 | When ON -> dropped from server | sv_user.c:2424-2434 | `if (!sv_client->drop) { ... sv_client->state = cs_free; SV_BroadcastPrintf(...,"%s was kicked for topcolor spam\n",...); ... sv_client->drop = true; }` | MATCH -- sets cs_free / drop=true, broadcasts "kicked for topcolor spam", logs via SV_LogPlayer |
| 5 | When OFF -> no such check applied | sv_user.c:2415 | `if ((int)sv_kicktop.value && ...)` | MATCH -- entire block short-circuits when cvar is 0; no fall-through side effect |
| 6 | "0 = off / 1 (or any nonzero) = on" (polarity) | sv_user.c:2415 | `(int)sv_kicktop.value` | MATCH -- truthiness test on int cast; 0 disables, any nonzero-int value enables. "(int)" cast means sub-1 fractionals truncate to off, consistent with "any nonzero value = on" for integers |
| 7 | Default: 1 | sv_main.c:124 | `cvar_t sv_kicktop = {"sv_kicktop", "1"};` | MATCH (WI-2) -- registered default string is "1", verified at the cvar_t initializer + Cvar_Register(&sv_kicktop) sv_main.c:3555; not a shipped-cfg value |
| 8 | Set by: server config | sv_main.c:124, :3555 | `{"sv_kicktop", "1"}` (2-field init: flags=0, no OnChange) + `Cvar_Register (&sv_kicktop);` | MATCH -- plain server-side cvar, no CVAR_USERINFO/CVAR_SERVERINFO flag, no OnChange callback; set by admin/server config |

**V-pass notes:** VERSION CONFIRMED: git describe --tags == "1.11-53-g18d0362".

Wide-grep (WI-1): exactly 3 use-sites of sv_kicktop in src/ -- registration (sv_main.c:124 init, sv_main.c:3555 Cvar_Register), extern decl (sv_user.c:101), and the SINGLE enforcing read at sv_user.c:2415, inside Cmd_SetInfo_f (the handler for the client "setinfo" command, registered sv_user.c:3319 {"setinfo", Cmd_SetInfo_f, false}). No callee-follow needed -- the entire gating + threshold + kick logic lives inline in the caller at sv_user.c:2415-2438. Counter fields lasttoptime/lasttopcount used only here (and declared server.h:310-311 with confirming comments).

Every material clause (polarity both directions, default, scope, OFF-state, the topcolor-key specificity, the rapid/window framing) maps to a located enforcing line and matches its code + adjacent comments. No flavour-C inference: the description does NOT assert any specific threshold number or window length (it stays at action-level "too many times in quick succession"), so it cannot contradict the real "8-second / >5" mechanism. The "any nonzero value = on" clause is correct for integer values given the (int) truncating cast.

Result: TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] L1 user-doc omits the concrete mechanism (8-second sliding window at sv_user.c:2417, kick once lasttopcount post-increment exceeds 5 at sv_user.c:2422, i.e. roughly the 7th topcolor change inside an 8s burst). This is an acceptable action-level abstraction for an L1 description and is NOT a defect -- flagged only so a downstream consumer who wants the exact threshold knows where it lives.
- [fyi/other/vpass] The kick path at sv_user.c:2424-2435 momentarily flips sv_client->state to cs_free, calls SV_BroadcastPrintf, then restores saved_state, before finally setting drop=true. This save/restore-around-broadcast dance is unusual but intentional (broadcast filtering by state); behavior matches the description's 'dropped from the server'. No action needed -- noting the non-obvious control flow in case future tracing of this handler revisits it.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_kicktop",
  "type": "cvar",
  "description": "Enables automatic kicking of a player who rapidly spams shirt-color (topcolor) changes. When on, a player who changes topcolor too many times in quick succession is dropped from the server; when off, no such check is applied.\n\n0 = off, no topcolor-spam kicking.\n1 (or any nonzero value) = on, kick rapid topcolor spammers.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:2415. Enforcing gate at src/sv_user.c:2415 `if ((int)sv_kicktop.value && !strcmp(Cmd_Argv(1), \"topcolor\"))` -- the cvar is a boolean on/off enable for the topcolor-spam check inside Cmd_SetInfo_f; nonzero enables, 0 skips the whole block. The kick action and its rate threshold are hardcoded, NOT in this cvar: src/sv_user.c:2417 resets the counter when `!sv_client->lasttoptime || curtime - sv_client->lasttoptime > 8` (fixed 8-second window) and src/sv_user.c:2422 `else if (sv_client->lasttopcount++ > 5)` triggers the kick (fixed >5 changes), broadcasting 'was kicked for topcolor spam' (:2429) and setting sv_client->drop. Because 8 and 5 are literals (confirmed by grepping lasttoptime/lasttopcount -- only these sites), the description states on/off only and does not claim a configurable threshold. Registered default '1' verified at src/sv_main.c:124 `cvar_t sv_kicktop = {\"sv_kicktop\", \"1\"}`. Set-by: Cvar_Register at src/sv_main.c:3555, no CVAR_SERVERINFO, no blocklist -> server config / rcon. No KTX override (grep of ktx/src returned zero matches).",
  "description_proposed": null
}
```
