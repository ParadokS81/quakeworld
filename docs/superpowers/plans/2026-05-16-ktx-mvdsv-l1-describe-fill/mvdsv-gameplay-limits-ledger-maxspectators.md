# describe-fill-synthesis ledger -- mvdsv `maxspectators`

- **project:** mvdsv
- **knob:** `maxspectators` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:maxspectators: synthesized -- engine-enforced spectator-slot limit at the connect gate; default 8; combined player+spec capped to 32 -- origin=synthesized ref=src/sv_main.c:1209 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets how many spectators (people watching without playing) are allowed to connect to the server at once. This count is separate from the player slots set by maxclients. The combined total of players and spectators is automatically capped at the engine maximum of 32; if the configured values would exceed that, the server lowers them to fit. A value of 0 blocks regular spectators, but VIPs can still connect using reserved VIP slots (see maxvip_spectators).
>
> Default: 8.
> Set by: server config.
> See also: maxvip_spectators.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| spectators-only limit, separate from players | src/sv_main.c:1209 | `if (spass && spectators < (int)maxspectators.value) return true;` | MATCH |
| enforced at connection (refuse when over) | src/sv_main.c:1333 | `if ((spectator && !SpectatorCanConnect(...)) ...) { ... return; }` | MATCH |
| 0 = no spectators admitted | src/sv_main.c:1209 | `spectators < (int)maxspectators.value` (0 -> always false) | MATCH |
| Default 8 | src/sv_main.c:164 | `maxspectators = {"maxspectators","8",CVAR_SERVERINFO}` | MATCH |
| combined cap at engine max 32, auto-lowered | src/sv_main.c:953-954 | `if ((int)maxspectators.value + maxclients.value > MAX_CLIENTS) Cvar_SetValue(&maxspectators, MAX_CLIENTS - (int)maxclients.value);` | MATCH |
| MAX_CLIENTS = 32 | qwprot/src/protocol.h:469 | `#define MAX_CLIENTS 32` | MATCH |
| published in serverinfo (CVAR_SERVERINFO) | src/sv_main.c:164 | `,CVAR_SERVERINFO}` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | "Sets how many spectators ... allowed to connect ... at once" | src/sv_main.c:1209 | `if (spass && spectators < (int)maxspectators.value) return true;` | MATCH |
| 2 | "separate from the player slots set by maxclients" | src/sv_main.c:1216-1224 vs 1198-1214 | `PlayerCanConnect`: `if (clients < (int)maxclients.value)` -- distinct cvar, distinct gate from `SpectatorCanConnect` | MATCH |
| 3 | "combined total of players and spectators is automatically capped at the engine maximum of 32" | src/qwprot/src/protocol.h:469 + src/sv_main.c:953-954 | `#define MAX_CLIENTS 32`; `if ((int)maxspectators.value + maxclients.value > MAX_CLIENTS) Cvar_SetValue (&maxspectators, MAX_CLIENTS - (int)maxclients.value)` | MATCH |
| 4 | "if the configured values would exceed that, the server lowers them to fit" | src/sv_main.c:947-948, 953-954 (+ dup pr2_cmds.c:2172-2175) | self-cap `maxspectators > MAX_CLIENTS -> MAX_CLIENTS`, then combined-cap lowers ONLY maxspectators to `MAX_CLIENTS - maxclients`; maxclients is preserved, not "them" | MATCH (loose -- only maxspectators is lowered) |
| 5 | "automatically" (runs without admin action) | src/sv_main.c:1200,1218,1329; pr2_cmds.c:2170 | `FixMaxClientsCvars();` invoked on every connect path + bot-add | MATCH |
| 6 | "A value of 0 means no one can connect as a spectator" | src/sv_main.c:1209, 1351; counting at 1173-1178 | `spectators < (int)maxspectators.value` -> `spectators < 0` always false (count never negative); BUT `spectators` counts NON-VIP only (1177-1178), VIP specs gated by maxvip_spectators (1204,1347) | MATCH for regular spectators; NARROWER than "no one" (VIP path bypasses) |
| 7 | "Default: 8." | src/sv_main.c:164 + 3495 | `cvar_t maxspectators = {"maxspectators","8",CVAR_SERVERINFO};` then `Cvar_Register (&maxspectators);` | MATCH |
| 8 | "Set by: server config." (settable) | src/sv_main.c:164 | `CVAR_SERVERINFO` only, no `CVAR_ROM` -> settable serverinfo cvar | MATCH |
| 9 | "See also: maxvip_spectators." | src/sv_main.c:956-957, 1204, 1347 | maxvip_spectators is the sibling VIP-spectator cap in the same FixMaxClientsCvars / connect logic | MATCH |

**V-pass notes:** Version confirmed 1.11-53-g18d0362. All 9 clauses enforce-traced to located lines; ZERO contradictions, so NOT a C-FIX. Classified C-NEAR-MISS on one clause that is narrower in code than implied:

Clause 6 (OFF-state): "A value of 0 means no one can connect as a spectator." The enforcing gate `spectators < (int)maxspectators.value` (sv_main.c:1209) does block all REGULAR spectators at value 0 (a count is never negative, so `<0` is always false; the sv_forcespec_onfull fallback at :1351 carries the same `spectators < maxspectators.value` term and is likewise blocked). BUT the connect logic splits spectators into two independent pools: CountPlayersSpecsVips (:1173-1178) increments `spectators` only for NON-VIP specs and `vips` separately; the VIP-spectator gate (:1204 / :1347) checks `maxvip_spectators`, a DIFFERENT cvar. So at maxspectators=0 a VIP holding the vip/spectator password can still connect as a spectator via maxvip_spectators. The "no one" wording is more absolute than the code, which is "no REGULAR spectator." This is the flavour-C pattern: real code more conditional than implied. The description does already say the count is "separate" and lists maxvip_spectators as See-also, which softens it, but the OFF-state sentence itself overclaims -> NEAR-MISS, not CLEAN.

Clause 4 (loose, not flagged as fix): "the server lowers them to fit" -- "them" reads as both values, but the combined-overflow branch (:953-954) lowers ONLY maxspectators (= MAX_CLIENTS - maxclients); maxclients is preserved. For THIS knob's doc that is arguably the right framing (maxspectators is the subject and is what gets lowered), so it stays MATCH/acceptable-vagueness rather than driving the classification.

Suggested minimal tightening for clause 6: "A value of 0 means no one can connect using a regular spectator slot (VIP spectators are governed separately by maxvip_spectators)." No other clause needs change. Capping/default/settability/MAX_CLIENTS=32 are all exact.

## flags_for_review

- [review/cross-mod-override/vpass] OFF-state VIP bypass: at maxspectators=0 the regular-spectator gate (sv_main.c:1209) blocks all non-VIP specs, but the connect path counts non-VIP specs (`spectators`) and VIP specs (`vips`) in SEPARATE pools (CountPlayersSpecsVips sv_main.c:1173-1178), and the VIP branch (sv_main.c:1204, 1347) gates on maxvip_spectators -- a different cvar. So a VIP-password holder can still connect as a spectator when maxspectators=0 if maxvip_spectators>0. The proposed clause 'A value of 0 means no one can connect as a spectator' is therefore narrower-in-code than stated; recommend qualifying to 'regular spectator slot'.
- [fyi/other/vpass] Capping logic is duplicated: the authoritative copy is FixMaxClientsCvars (sv_main.c:942-959, called on every connect/reconnect at :1200/:1218/:1329); a second near-identical copy lives in the bot-add path PF2_Add_Bot (pr2_cmds.c:2170-2175) but omits the maxvip_spectators third-stage cap. Both honor the maxspectators+maxclients<=32 combined cap, so the description's behavior holds on both paths. Not a doc defect; noted for completeness.
- [fyi/other/vpass] Self-cap ordering nuance (clause 4): FixMaxClientsCvars first clamps maxspectators alone to <=MAX_CLIENTS (sv_main.c:947-948), THEN clamps the combined sum (953-954). Only maxspectators is reduced in the combined-overflow branch; maxclients is never lowered by this function. The doc's 'lowers them to fit' is acceptable for a maxspectators-scoped description but is not literally symmetric across both cvars.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "maxspectators",
  "type": "cvar",
  "description": "Sets how many spectators (people watching without playing) are allowed to connect to the server at once. This count is separate from the player slots set by maxclients. The combined total of players and spectators is automatically capped at the engine maximum of 32; if the configured values would exceed that, the server lowers them to fit. A value of 0 blocks regular spectators, but VIPs can still connect using reserved VIP slots (see maxvip_spectators).\n\nDefault: 8.\nSet by: server config.\nSee also: maxvip_spectators.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:1209. Engine-enforced spectator limit (not a mod-governed compatibility cvar). Registration: src/sv_main.c:164 `maxspectators = {\"maxspectators\",\"8\",CVAR_SERVERINFO}` -> default 8 (WI-2: literal initializer), and CVAR_SERVERINFO means it is published in serverinfo. Enforcing read for a non-VIP spectator: src/sv_main.c:1209 `if (spass && spectators < (int)maxspectators.value) return true;` inside SpectatorCanConnect (called from the connection gate SVC_DirectConnect at src/sv_main.c:1333 `if ((spectator && !SpectatorCanConnect(...)) ... ) { ... \"server is full\" ... return; }`). 'spass' = the spectator-password check passed (src/sv_main.c:1027 CheckPasswords). So a spectator is admitted only while current spectator count < maxspectators; otherwise the connect is refused. OFF-state: value 0 -> `spectators < 0` is always false -> no spectator admitted. Auto-clamp / MAX_CLIENTS interaction: FixMaxClientsCvars (called at src/sv_main.c:1200,1218,1329) at src/sv_main.c:947-948 caps maxspectators to MAX_CLIENTS, and :953-954 lowers it so maxclients+maxspectators <= MAX_CLIENTS; MAX_CLIENTS=32 (qwprot/src/protocol.h:469). A duplicate clamp exists in pr2_cmds.c:2172-2175 for the PR2 game-VM path. Cross-mod note (FYI, not an override of THIS cvar): KTX has a SEPARATE cvar k_maxspectators (ktx world.c:990) plus up/down-specs admin commands that adjust the engine cvar (ktx commands.c:8035 `sv_max=\"maxspectators\"`); the engine cvar's own meaning and enforcement are entirely engine-side.",
  "description_proposed": null
}
```
