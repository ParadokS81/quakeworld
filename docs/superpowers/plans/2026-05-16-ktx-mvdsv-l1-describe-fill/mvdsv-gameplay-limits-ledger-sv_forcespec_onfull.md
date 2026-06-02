# describe-fill-synthesis ledger -- mvdsv `sv_forcespec_onfull`

- **project:** mvdsv
- **knob:** `sv_forcespec_onfull` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_forcespec_onfull: synthesized -- full-server auto-spectate policy (0 refuse / 1 opt-out / 2 opt-in), traced to the directconnect full-slot branch -- origin=synthesized ref=src/sv_main.c:1353 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls what happens when a player tries to connect to a server that has no free player slots but still has free spectator slots. Instead of simply refusing the connection, the server can redirect the player in as a spectator.
>
> 0 (or any other value) = do not redirect; refuse the connection when the server is full.
> 1 = redirect the player in as a spectator unless their client has opted out of being auto-spectated.
> 2 = redirect the player in as a spectator only if their client has opted in to being auto-spectated.
>
> Note: this only applies when player slots are full but spectator slots remain; it never displaces an existing player.
>
> Default: 2.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| applies only: connecting non-spec, player slots full, spec slots free | src/sv_main.c:1351 | `else if ( !spectator && spectators < (int)maxspectators.value && (...) )` | MATCH |
| reached only on full-server path | src/sv_main.c:1335 | `... !newcl)` enclosing full-connect block | MATCH |
| 2 = redirect only if client opted IN | src/sv_main.c:1353 | `(int)sv_forcespec_onfull.value == 2 && (... & SVF_SPEC_ONFULL)` | MATCH |
| 1 = redirect unless client opted OUT | src/sv_main.c:1357 | `(int)sv_forcespec_onfull.value == 1 && !(... & SVF_NO_SPEC_ONFULL)` | MATCH |
| SVF bit polarity (opt-in vs opt-out) | src/server.h:717-719 | `SVF_SPEC_ONFULL (1<<0)` / `SVF_NO_SPEC_ONFULL (1<<1)` w/ comments | MATCH |
| on match -> joins as spectator | src/sv_main.c:1363-1365 | `'... connecting as spectator'` + `*spectator=1` + `spectator=true` | MATCH |
| 0/other -> refuse (server is full) | src/sv_main.c:1369-1370 | `'server is full'` + `return` | MATCH |
| default = 2 | src/sv_main.c:142 | `cvar_t sv_forcespec_onfull = {"sv_forcespec_onfull", "2"}` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| A1 | "player tries to connect" (not a spectator) | sv_main.c:1334, 1351 | `(!spectator && !PlayerCanConnect(clients))` ... `else if ( !spectator && ...` | MATCH |
| A2 | "no free player slots" | sv_main.c:1334 -> 1220 | `!PlayerCanConnect(clients)`; callee: `if (clients < (int)maxclients.value) return true;` (so guard fires when clients>=maxclients = no free player slot) | MATCH |
| A3 | "still has free spectator slots" | sv_main.c:1351 | `&& spectators < (int)maxspectators.value` | MATCH |
| B | "Instead of refusing, redirect player in as a spectator" | sv_main.c:1363-1366 | `Netchan_OutOfBandPrint(... "server is full: connecting as spectator")` / `Info_SetValueForStarKey(userinfo, "*spectator", "1", ...)` / `spectator = true;` (falls through to build conn, no return) | MATCH |
| C | "0 (or any other value) = refuse when full" | sv_main.c:1353,1357,1367-1370 | branch matches only `== 2` or `== 1`; `else { Netchan_OutOfBandPrint(... "server is full\n\n"); return; }` -- exact equality, so 0/3/4/... all refuse | MATCH |
| D | "1 = redirect unless client opted out" | sv_main.c:1357-1358 (+ server.h:718 comment) | `( (int)sv_forcespec_onfull.value == 1 && !(Q_atoi(Info_ValueForKey(userinfo,"svf")) & SVF_NO_SPEC_ONFULL) )`; comment: "do not join server as spectator if server full and sv_forcespec_onfull == 1" | MATCH |
| E | "2 = redirect only if client opted in" | sv_main.c:1353-1354 (+ server.h:715-717 comment) | `( (int)sv_forcespec_onfull.value == 2 && (Q_atoi(Info_ValueForKey(userinfo,"svf")) & SVF_SPEC_ONFULL) )`; comment: "force player enter server as spectator if all players's slots are busy and ... sv_forcespec_onfull == 2" | MATCH |
| F1 | "only applies when player slots full" | sv_main.c:1333-1336 | entire redirect block nested inside `if ((spectator && !SpectatorCanConnect...) || (!spectator && !PlayerCanConnect(clients)) || !newcl)` | MATCH |
| F2 | "but spectator slots remain" | sv_main.c:1351 | `&& spectators < (int)maxspectators.value` | MATCH |
| F3 | "never displaces an existing player" | sv_main.c:1340-1377 | `!newcl` already returned earlier (1340-1343 "server is full"); redirect path only mutates connecting userinfo/local `spectator` then `memset(newcl,0,...)` on a free slot -- no existing client_t kicked/removed in the only enforcing path | MATCH |
| G | "Default: 2" | sv_main.c:142 (+ register 3439) | `cvar_t sv_forcespec_onfull = {"sv_forcespec_onfull", "2"};` registered via `Cvar_Register(&sv_forcespec_onfull)` -- WI-2 satisfied, registered default not cfg-drift | MATCH |
| H | "Set by: server config" | sv_main.c:142 | plain `cvar_t` (no CVAR_ROM/CVAR_SERVERINFO flags) -- settable via console/config, no access-class contradiction | MATCH |

**V-pass notes:** Wide-grep returned exactly 5 use-sites (server.h:716/718 comments, sv_main.c:142 registration, sv_main.c:1353/1357 enforcement, sv_main.c:3439 Cvar_Register) -- no hidden read-site. Every material clause maps to a located, verified enforcing line. Enforcement lives in SVC_DirectConnect's "at server limits, refuse connection" block (sv_main.c:1351-1361); the `else if` is the redirect path. Callees PlayerCanConnect (1216) and SpectatorCanConnect (1198) followed and confirm the slot-availability semantics. server.h comments (715-719) independently corroborate the value==2 opt-in / value==1 opt-out polarity, matching the SVF_SPEC_ONFULL / SVF_NO_SPEC_ONFULL bit reads. Default "2" verified at the registered cvar struct (WI-2 clean). Polarity, thresholds (exact ==1/==2 equality, so 0-and-other refuse), scope (player-only + specs-remain), OFF-state (else->return server full), and the no-displacement side-effect all verified. The "opted in/out of being auto-spectated" phrasing is an accurate interpretive label for the svf userinfo bits, grounded in the bit names and adjacent comments -- not name/string inference. No flavour-C clause present. Classification: TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] The redirect path requires the CONNECTING client to advertise the right svf userinfo bit (SVF_SPEC_ONFULL for value==2, or absence of SVF_NO_SPEC_ONFULL for value==1). Under the DEFAULT value 2, a client whose userinfo carries no 'svf' key (svf bit unset -> SVF_SPEC_ONFULL not present) is NOT redirected and gets refused -- i.e. the default-2 behavior is effectively opt-in and silently refuses clients that do not set the flag. This is correct per code and the description states it accurately ('only if their client has opted in'), but the operator-facing implication (default config refuses non-opted-in clients rather than spectating them) is a non-obvious consequence worth noting downstream.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_forcespec_onfull",
  "type": "cvar",
  "description": "Controls what happens when a player tries to connect to a server that has no free player slots but still has free spectator slots. Instead of simply refusing the connection, the server can redirect the player in as a spectator.\n\n0 (or any other value) = do not redirect; refuse the connection when the server is full.\n1 = redirect the player in as a spectator unless their client has opted out of being auto-spectated.\n2 = redirect the player in as a spectator only if their client has opted in to being auto-spectated.\n\nNote: this only applies when player slots are full but spectator slots remain; it never displaces an existing player.\n\nDefault: 2.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:1353. Two enforcing read-sites inside the 'server is full' block of SVC_DirectConnect: src/sv_main.c:1353 `( (int)sv_forcespec_onfull.value == 2 && (Q_atoi(Info_ValueForKey(userinfo, \"svf\")) & SVF_SPEC_ONFULL) )` and src/sv_main.c:1357 `( (int)sv_forcespec_onfull.value == 1 && !(Q_atoi(Info_ValueForKey(userinfo, \"svf\")) & SVF_NO_SPEC_ONFULL) )`. SCOPE: the whole block is gated by src/sv_main.c:1351 `else if ( !spectator && spectators < (int)maxspectators.value && ( <value==2 branch> || <value==1 branch> ) )` -- so it fires only for a connecting non-spectator (`!spectator`) when free spectator slots remain (`spectators < maxspectators.value`); reached only after the full-server refusal path (the enclosing `if` at sv_main.c:1335 `!newcl` / no free slot). On match -> src/sv_main.c:1363-1365 prints 'server is full: connecting as spectator', sets `*spectator=1`, `spectator=true`. On no-match -> src/sv_main.c:1369-1370 'server is full' + return (refusal). POLARITY of the two branches (the load-bearing inversion): value 2 requires the SVF_SPEC_ONFULL bit SET (opt-IN); value 1 requires the SVF_NO_SPEC_ONFULL bit NOT set (opt-OUT). Confirmed by server.h:715-719: SVF_SPEC_ONFULL=(1<<0) 'force player enter server as spectator ... and ... sv_forcespec_onfull == 2'; SVF_NO_SPEC_ONFULL=(1<<1) 'do not join server as spectator if server full and sv_forcespec_onfull == 1'. Value 0 / others: neither equality holds -> fall through to refusal. NEVER-DISPLACES: the redirect only occurs because player slots are already full and spectator slots are free; no code in this path bumps an existing player. The 'svf' userinfo bitmask is client-set (opt-in/opt-out by the connecting client); per D20 the bit names are jargon kept in reasoning, surfaced as 'opted in/out' in the user doc. DEFAULT '2' at registration src/sv_main.c:142 `cvar_t sv_forcespec_onfull = {\"sv_forcespec_onfull\", \"2\"}`. Set-by: plain cvar -> server config.",
  "description_proposed": null
}
```
