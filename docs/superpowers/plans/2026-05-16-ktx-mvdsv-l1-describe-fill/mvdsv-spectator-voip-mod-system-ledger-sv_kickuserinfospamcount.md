# describe-fill-synthesis ledger -- mvdsv `sv_kickuserinfospamcount`

- **project:** mvdsv
- **knob:** `sv_kickuserinfospamcount` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_kickuserinfospamcount: synthesized -- max userinfo changes in the time window before userinfo-spam kick; 0 disables -- origin=synthesized ref=src/sv_user.c:2316 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets how many setinfo commands (attempts to change name, skin, color, etc. -- counted whether or not the value actually changes) a player may issue within the sv_kickuserinfospamtime window before being dropped from the server for userinfo spam.
>
> Maximum number of setinfo commands allowed inside the window; exceeding it kicks the player. The kick fires only while both this and sv_kickuserinfospamtime are greater than 0. Set either to 0 to disable userinfo-spam kicking entirely.
>
> Default: 300.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| max userinfo changes in the window before kick | src/sv_user.c:2316 | `else if (++(sv_client->lastuserinfocount) > (int)sv_kickuserinfospamcount.value)` | MATCH |
| both this and ...time must be > 0 for the check to run (0 disables) | src/sv_user.c:2308 | `if (sv_kickuserinfospamtime.value > 0 && (int)sv_kickuserinfospamcount.value > 0)` | MATCH |
| exceeding the count drops the player for userinfo spam | src/sv_user.c:2322-2328 | `SV_BroadcastPrintf (PRINT_HIGH, "%s was kicked for userinfo spam\n", ...)` ... `sv_client->drop = true;` | MATCH |
| window length is companion sv_kickuserinfospamtime | src/sv_user.c:2311 | `curtime - sv_client->lastuserinfotime > sv_kickuserinfospamtime.value` | MATCH |
| registered default 300 | src/sv_user.c:40 | `cvar_t sv_kickuserinfospamcount = {"sv_kickuserinfospamcount", "300"};` | MATCH |
| set by server config (no serverinfo flag / blocklist) | src/sv_user.c:4911 | `Cvar_Register (&sv_kickuserinfospamcount);` | MATCH |
| no KTX override | ktx/src (grep) | grep sv_kickuserinfospam -> 0 matches | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | "how many userinfo changes ... a player may make ... before being dropped from the server" (scope: setinfo by client; effect: dropped) | sv_user.c:3319 (handler reg); sv_user.c:2308-2331 (counter+kick); sv_send.c:1109-1112 (drop consumed) | `{"setinfo", Cmd_SetInfo_f, false}` / spam block in `Cmd_SetInfo_f` / `if (c->drop) { SV_DropClient(c); ...}` | MATCH (scope=client setinfo cmd; drop genuinely disconnects) -- BUT see clause 3 re "changes" |
| 2 | "(name, skin, color, etc.)" examples of userinfo fields | sv_user.c:2281-2299 (`shortinfotbl[]`) | `"name","team","skin","topcolor","bottomcolor",...` | MATCH (illustrative; counter is key-agnostic, any setinfo counts) |
| 3 | "Maximum number of changes allowed inside the window; exceeding it kicks the player." (threshold polarity) | sv_user.c:2316 | `else if (++(sv_client->lastuserinfocount) > (int)sv_kickuserinfospamcount.value)` | MISMATCH on "changes" -- counter counts setinfo INVOCATIONS, not value changes. Pre-increment + strict `>` so N allowed / (N+1)th kicks: polarity & threshold CORRECT. But the no-change early-return (sv_user.c:2383 `// key hasn't changed`) and bare-`setinfo` listing (case 1, sv_user.c:2336) both run AFTER this increment, so identical/empty setinfo also ticks the counter. Real trigger surface is broader than "changes". |
| 4 | "kick fires only while both this and sv_kickuserinfospamtime are greater than 0" (gate) | sv_user.c:2308 | `if (sv_kickuserinfospamtime.value > 0 && (int)sv_kickuserinfospamcount.value > 0)` | MATCH (exact AND of both > 0) |
| 5 | "Set either to 0 to disable userinfo-spam kicking entirely." (OFF-state) | sv_user.c:2308 | same AND gate -> either factor 0 skips whole block | MATCH (either 0 disables; technically any <=0 disables, 0 is canonical) |
| 6 | "Default: 300." | sv_user.c:40 (decl); sv_user.c:4911 (`Cvar_Register`) | `cvar_t sv_kickuserinfospamcount = {"sv_kickuserinfospamcount", "300"};` | MATCH (registered default = 300) |
| 7 | "Set by: server config." (access-class) | sv_user.c:40 | plain `cvar_t` 2-field form, no CF_/access flags; standard server cvar | MATCH (ordinary server cvar, set in cfg/console) |

**V-pass notes:** VERSION CONFIRMED: git describe == "1.11-53-g18d0362". All use-sites of sv_kickuserinfospamcount live in sv_user.c (decl :40, enforcing block :2308-2331, Cvar_Register :4911) -- no cross-file enforcing line, no callee mediation of the gating logic (the kick logic is inline in the caller).

CLASSIFICATION: C-NEAR-MISS. The mechanism is correct on every load-bearing axis -- the AND gate (both cvars > 0), the OFF-state (either = 0 disables), the threshold polarity (pre-increment + strict `>` => `count` invocations allowed, the (count+1)th rapid one kicks), the companion-cvar window (sv_kickuserinfospamtime gates the reset-vs-increment branch at :2310-2316), the registered default 300, and the drop actually disconnecting the client (sv_send.c:1109 -> SV_DropClient). I traced the drop flag end-to-end and confirmed setinfo's handler registration.

THE NEAR-MISS (clause 3, and by inheritance clause 1): the description repeatedly frames the counted quantity as "userinfo changes" / "number of changes". The enforcing code counts setinfo COMMAND INVOCATIONS, not actual value changes. Proof from control flow: the spam block (:2308-2331) executes at the very TOP of Cmd_SetInfo_f, before Cmd_Argc() is even inspected. The "key hasn't changed" early-return is at :2383 -- AFTER the counter has already pre-incremented at :2316. The bare-`setinfo` self-listing path (case 1, :2336-2351) also returns AFTER the increment. Consequence: a client spamming `setinfo name Bob` with the same value, or repeatedly typing bare `setinfo` to list its own info, ticks the counter and can be kicked even though nothing "changed". The real trigger surface is BROADER than "changes" implies -- this is the trace-discipline "real code is [different] than implied" near-miss pattern (here broader, not narrower).

Materiality: at the user/action level a non-spamming player never hits this, so the framing is essentially right and not a contradiction (no clause is flatly WRONG -> not C-FIX). But "changes" is a measurable imprecision against the enforcing line, not still-true vagueness, so it clears the C-NEAR-MISS bar rather than TRACED-CLEAN. Suggested fix if re-synthesized: replace "userinfo changes" / "number of changes" with "setinfo commands" (or "userinfo updates a client sends"), noting the count is per command issued regardless of whether the value actually changes.

Fencepost (non-defect, FYI): the first setinfo in a fresh window takes the reset branch (:2313 count=0) and is not itself counted; subsequent rapid ones increment. So strictly the window allows the value-many counted invocations after the opening one. This does not contradict "maximum number allowed inside the window" at the action level and needs no edit.

## flags_for_review

- [review/contradiction/vpass] The userinfo-spam counter (sv_kickuserinfospamcount) increments on EVERY setinfo command invocation, not on actual userinfo value changes: the spam block at sv_user.c:2308-2331 runs before the 'key hasn't changed' early-return (sv_user.c:2383) and before the bare-setinfo self-listing path (case 1, sv_user.c:2336). So repeated identical `setinfo name X` or repeated bare `setinfo` listings count toward the kick. This is the basis of the C-NEAR-MISS: the description says 'changes' but the code counts invocations.
- [fyi/off-scope-entity/vpass] Sibling cvar sv_kicktop/topcolor-spam (sv_user.c:2415-2438) uses a structurally similar but NON-equivalent counter: it POST-increments (`sv_client->lasttopcount++ > 5`) whereas the userinfo path PRE-increments (`++(...) > count`). Post-increment + strict `>` with hardcoded threshold 5 means topcolor spam allows 7 rapid changes before kick (count 0..6 pass, count value 6 -> compares 6>5 true on the 7th), an off-by-one vs the userinfo path's clean N-allowed semantics. Not in scope for this knob, but if sv_kicktop/sv_kickuserinfospamcount are ever described as a 'spam-kick family' with shared semantics, the polarity differs -- worth a separate trace.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_kickuserinfospamcount",
  "type": "cvar",
  "description": "Sets how many setinfo commands (attempts to change name, skin, color, etc. -- counted whether or not the value actually changes) a player may issue within the sv_kickuserinfospamtime window before being dropped from the server for userinfo spam.\n\nMaximum number of setinfo commands allowed inside the window; exceeding it kicks the player. The kick fires only while both this and sv_kickuserinfospamtime are greater than 0. Set either to 0 to disable userinfo-spam kicking entirely.\n\nDefault: 300.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:2316. Enforcing sites in Cmd_SetInfo_f: src/sv_user.c:2308 `if (sv_kickuserinfospamtime.value > 0 && (int)sv_kickuserinfospamcount.value > 0)` gates the whole check on both cvars being positive (0 disables). The count threshold is enforced at src/sv_user.c:2316 `else if (++(sv_client->lastuserinfocount) > (int)sv_kickuserinfospamcount.value)` -- the per-client userinfo-change counter is incremented and, if it exceeds this cvar within the window, the player is dropped ('was kicked for userinfo spam', :2323; SV_LogPlayer 'userinfo spam' :2327; sv_client->drop set :2328). The window length is the companion sv_kickuserinfospamtime, read at :2311; naming it inline is action-relevant per D20. Registered default '300' verified at src/sv_user.c:40 `cvar_t sv_kickuserinfospamcount = {\"sv_kickuserinfospamcount\", \"300\"}`. Set-by: Cvar_Register at src/sv_user.c:4911, no CVAR_SERVERINFO, no blocklist -> server config / rcon. No KTX override (grep of ktx/src returned zero matches).",
  "description_proposed": null
}
```
