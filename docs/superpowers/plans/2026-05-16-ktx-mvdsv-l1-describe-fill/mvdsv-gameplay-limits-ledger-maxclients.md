# describe-fill-synthesis ledger -- mvdsv `maxclients`

- **project:** mvdsv
- **knob:** `maxclients` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:maxclients: synthesized -- engine-enforced player-slot cap; connect gate sv_main.c:1220, clamped to 32 (sv_main.c:944), shares 32-slot budget with spectators -- origin=synthesized ref=src/sv_main.c:1220 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Maximum number of player slots on the server -- once this many players are connected, further player connections are refused. Capped at 32, the engine's hard slot ceiling, and any higher value is reduced to 32. Player slots and spectator slots share the same 32-slot total, so raising this lowers how many spectator slots remain available.
>
> Default: 24.
> Set by: server config / rcon (published in server info).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| connection refused once player count reaches the limit | src/sv_main.c:1220 | `if (clients < (int)maxclients.value) return true;` (PlayerCanConnect) | MATCH |
| capped at 32, higher reduced to 32 | src/sv_main.c:944-945 | `if ((int)maxclients.value > MAX_CLIENTS) Cvar_SetValue (&maxclients, MAX_CLIENTS);` | MATCH |
| MAX_CLIENTS = 32 | src/qwprot/src/protocol.h:469 | `#define MAX_CLIENTS 32` | MATCH |
| player + spectator slots share the 32 total; maxclients wins | src/sv_main.c:953-954 | `if ((int)maxspectators.value + maxclients.value > MAX_CLIENTS) Cvar_SetValue (&maxspectators, MAX_CLIENTS - (int)maxclients.value);` | MATCH |
| default 24, serverinfo | src/sv_main.c:163 | `cvar_t maxclients = {"maxclients","24",CVAR_SERVERINFO};` | MATCH |
| clamp is live at connect time | src/sv_main.c:1218 | `FixMaxClientsCvars(); // not a bad idea` (called in PlayerCanConnect) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | "Maximum number of player slots; once this many players are connected, further player connections are refused" | src/sv_main.c:1216-1224 (PlayerCanConnect) + src/sv_main.c:1334 (SVC_DirectConnect refusal) | `if (clients < (int)maxclients.value) return true; ... return false;` // caller: `(!spectator && !PlayerCanConnect(clients))` -> "full connect" | MATCH |
| 2a | "Capped at 32, the engine's hard slot ceiling" | src/qwprot/src/protocol.h:469 (+ svs.clients loops `i < MAX_CLIENTS` everywhere) | `#define MAX_CLIENTS 32` | MATCH |
| 2b | "any higher value is reduced to 32" | src/sv_main.c:944-945 (FixMaxClientsCvars); same in src/pr2_cmds.c:2170-2171 | `if ((int)maxclients.value > MAX_CLIENTS) Cvar_SetValue (&maxclients, MAX_CLIENTS);` | MATCH |
| 3 | "Player slots and spectator slots share the same 32-slot total, so raising this lowers how many spectator slots remain available" | src/sv_main.c:953-954 (FixMaxClientsCvars); same in src/pr2_cmds.c:2174-2175 | `if ((int)maxspectators.value + maxclients.value > MAX_CLIENTS) Cvar_SetValue (&maxspectators, MAX_CLIENTS - (int)maxclients.value);` | MATCH (simplification: a 3rd pool maxvip_spectators sv_main.c:956-957 also shares the 32 total; player<->spec direction asserted is correct) |
| 4 | "Default: 24" | src/sv_main.c:163 (registration) | `cvar_t maxclients = {"maxclients","24",CVAR_SERVERINFO};` | MATCH (registered default, WI-2 satisfied) |
| 5a | "Set by: server config / rcon" (settable, not read-only) | src/sv_main.c:163 (flags) + src/cvar.c:134 (ROM guard not triggered) | flags = `CVAR_SERVERINFO` only (no CVAR_ROM); `if (var->flags & CVAR_ROM) return;` does not apply | MATCH |
| 5b | "published in server info" | src/cvar.h:62 + src/cvar.c:157-159 | `#define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo`; `if (var->flags & CVAR_SERVERINFO) SV_ServerinfoChanged (var->name, var->string);` | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. enforce-trace-discipline.md read and applied per-clause.

All 5 material clauses (7 sub-assertions) enforcement-traced to located lines incl. adjacent comments/flags. Classification: TRACED-CLEAN.

Key traces:
- Registration src/sv_main.c:163 -> default "24", flag CVAR_SERVERINFO only (no CVAR_ROM -> settable; published to serverinfo via SV_ServerinfoChanged at cvar.c:159).
- MAX_CLIENTS == 32 at qwprot/src/protocol.h:469 (NOT a header in src/ proper -- it lives in the vendored qwprot submodule; the bare `grep "define MAX_CLIENTS" src` missed it, found via recursive grep). svs.clients arrays iterate `i < MAX_CLIENTS` everywhere, so 32 is the genuine slot-array ceiling, not just a soft cap.
- "Reduced to 32" is exact: Cvar_SetValue(&maxclients, MAX_CLIENTS) at sv_main.c:945. Cap is duplicated in the QC-mod bot-add path pr2_cmds.c:2170-2171 (same semantics).
- Spectator side-effect (clause 3) is REAL and correctly directional, NOT name inference: sv_main.c:953-954 clamps maxspectators DOWN to (32 - maxclients) when the sum exceeds 32. Raising maxclients does shrink available spec slots. The enforcing line was located and matches.
- Runtime-liveness of the cap confirmed: FixMaxClientsCvars is called in all three connect entry points (sv_main.c:1200 SpectatorCanConnect, :1218 PlayerCanConnect, :1329 SVC_DirectConnect). Not dead code.

One acceptable simplification (does NOT downgrade): the description frames it as a two-way player/spectator split of 32, but there is a THIRD pool maxvip_spectators (sv_main.c:956-957, maxvip_spectators clamped to 32-maxclients-maxspectators). Omitting VIP specs makes the statement less complete but not wrong -- the player<->spectator sharing it asserts is true and the omitted pool only further reinforces the "shared 32 total" claim. Stays TRACED-CLEAN under the rule that still-true traceable vagueness is acceptable.

## flags_for_review

- [fyi/off-scope-entity/vpass] src/sv_init.c:319 force-sets maxclients=1 inside the `loading_savegame` branch (single-player savegame restore path: also forces deathmatch=0, coop=0, teamplay=0, sv_progsname=spprogs). This is a Quake single-player code path, not relevant to QW dedicated-server use; the description's DM-server framing (default 24, slots refused when full) is correct for the normal operating mode. Flagging only so it is on record that a non-DM path can override the configured value -- it does NOT contradict any clause.
- [fyi/other/vpass] The 32-slot cap is enforced in TWO independent places with duplicated logic: engine SVC_DirectConnect via FixMaxClientsCvars (src/sv_main.c:944-957) and the QuakeC-mod bot-add path PF2_Add_Bot (src/pr2_cmds.c:2170-2175). The pr2_cmds copy omits the maxvip_spectators clamp that sv_main.c:956-957 has -- harmless divergence (bots are not VIP specs) but a copy-paste drift point worth noting for any future maintainer touching the cap rule.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "maxclients",
  "type": "cvar",
  "description": "Maximum number of player slots on the server -- once this many players are connected, further player connections are refused. Capped at 32, the engine's hard slot ceiling, and any higher value is reduced to 32. Player slots and spectator slots share the same 32-slot total, so raising this lowers how many spectator slots remain available.\n\nDefault: 24.\nSet by: server config / rcon (published in server info).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:1220. Engine-enforced limit (NOT an F-MV1 mod cvar). The connection-accept gate is PlayerCanConnect at sv_main.c:1216-1224: `if (clients < (int)maxclients.value) return true;` -- a player is admitted only while the current player count is strictly below maxclients.value (units = player slots). Registered `cvar_t maxclients = {\"maxclients\",\"24\",CVAR_SERVERINFO}` at sv_main.c:163 -> default 24, propagated in serverinfo. Hard ceiling: FixMaxClientsCvars (sv_main.c:942) clamps `if ((int)maxclients.value > MAX_CLIENTS) Cvar_SetValue(&maxclients, MAX_CLIENTS)` at sv_main.c:944-945, and MAX_CLIENTS = 32 (qwprot/src/protocol.h:469). FixMaxClientsCvars is called from PlayerCanConnect (sv_main.c:1218) and SVC_DirectConnect path (sv_main.c:1200, :1329) so the clamp is live at connect time. Shared-budget clause (action-relevant per D20): sv_main.c:953-954 `if ((int)maxspectators.value + maxclients.value > MAX_CLIENTS) Cvar_SetValue(&maxspectators, MAX_CLIENTS - (int)maxclients.value)` -- maxclients is subtracted first, so spectator capacity is what shrinks; raising maxclients steals from spectators (kept inline because it changes the admin's action). Also forced to 1 on savegame load (sv_init.c:319) and read by pr2_cmds.c:2170-2177 (the PR2 progs maxclients API mirrors the same clamp + gate). Did not assert a 0-disables-all clause: while `clients < 0` is never true so 0 would block all player connects, no source comment states 0 as an intended sentinel and admins do not set it that way -- omitted rather than synthesized from inference.",
  "description_proposed": null
}
```
