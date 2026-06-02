# describe-fill-synthesis ledger -- mvdsv `sv_phs`

- **project:** mvdsv
- **knob:** `sv_phs` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_phs: synthesized -- engine-enforced sound PHS culling; non-zero (default 1) sends sounds only to potentially-hearable clients (MULTICAST_PHS), 0 broadcasts every sound to all (MULTICAST_ALL), traced at sv_send.c:629 + 670-673 -- origin=synthesized ref=src/sv_send.c:629 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether the server limits which players receive each sound based on where the sound happens in the map. When on, a sound is sent only to players who could potentially hear it from its location, which reduces network traffic. When off, every sound is sent to all connected players regardless of distance.
>
> 1 = send sounds only to players potentially within hearing range (default).
> 0 = send all sounds to all players.
>
> Default: 1.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| non-zero enables PHS culling (use_phs=true) | src/sv_send.c:629,637 | `if ((channel & 8) || !(int)sv_phs.value) {...} else use_phs = true;` | MATCH |
| 0 disables culling (use_phs=false) | src/sv_send.c:629,633 | `!(int)sv_phs.value` -> `use_phs = false;` | MATCH |
| culled = send only to potentially-hearable clients | src/sv_send.c:671 | `SV_MulticastEx (origin, ... MULTICAST_PHS ...)` | MATCH |
| not culled = send to all clients | src/sv_send.c:673 | `SV_MulticastEx (origin, ... MULTICAST_ALL ...)` | MATCH |
| MULTICAST_PHS = potentially hearable from origin | src/sv_send.c:401,475 | `MULTICAST_PHS send to clients potentially hearable from org` / `if (to == MULTICAST_PHS_R || to == MULTICAST_PHS)` | MATCH |
| MULTICAST_ALL = broadcast to all | src/sv_send.c:399 | `MULTICAST_ALL same as broadcast` | MATCH |
| default 1 | src/sv_main.c:137 | `cvar_t sv_phs = {"sv_phs", "1"}` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "limits which players receive each sound based on where the sound happens in the map" (ON gate exists, keyed on sound location) | sv_send.c:629 (gate) + sv_send.c:427 (origin-leaf PHS) | `if ((channel & 8) \|\| !(int)sv_phs.value)` / `mask = CM_LeafPHS (CM_PointInLeaf(origin));` | MATCH |
| 2 | "When on, a sound is sent only to players who could potentially hear it from its location" | sv_send.c:670-671, callee sv_send.c:426-427,475-493; comment 401 | `if (use_phs) SV_MulticastEx (origin, ... MULTICAST_PHS ...)`; mask=CM_LeafPHS; per-client `if ( !(mask[leafnum>>3] & (1<<(leafnum&7))) ) continue;`; `MULTICAST_PHS send to clients potentially hearable from org` | MATCH (minor: ON set also includes any client within 1024 units via VectorLength(delta)<=1024 goto inrange, line 479 -- an EXPANSION of strict PHS, players who genuinely can hear a near sound; does not contradict "could potentially hear it") |
| 3 | "reduces network traffic" (fewer recipients than broadcast) | sv_send.c:488-491 | `if ( !(mask[leafnum>>3] & (1<<(leafnum&7))) ) { continue; }` (suppresses delivery to out-of-PHS clients) | MATCH |
| 4 | "When off, every sound is sent to all connected players regardless of distance" | sv_send.c:629,672-673 -> callee 420-421,455-456 | `else SV_MulticastEx (origin, ... MULTICAST_ALL ...)`; `case MULTICAST_ALL: mask = NULL;`; `if (!mask) goto inrange; // multicast to all` | MATCH (recipients = cs_spawned clients, line 450; "connected" is standard user-doc framing, same constraint on ON path) |
| 5 | "1 = send sounds only to players potentially within hearing range (default)" | sv_main.c:137 (default) + clause-2 sites | `cvar_t sv_phs = {"sv_phs", "1"};` | MATCH |
| 6 | "0 = send all sounds to all players" | clause-4 sites | (MULTICAST_ALL, mask=NULL path) | MATCH |
| 7 | "Default: 1" (WI-2) | sv_main.c:137 + sv_main.c:3559 | `cvar_t sv_phs = {"sv_phs", "1"};` / `Cvar_Register (&sv_phs);` (plain register, no OnChange, no override) | MATCH |
| 8 | "Set by: server config" | sv_main.c:137,3559 | plain `cvar_t` + `Cvar_Register`, no CVAR_* flags, no OnChange | MATCH |

**V-pass notes:** Oracle confirmed 1.11-53-g18d0362. Exhaustive use-site grep: sv_phs has exactly 4 references tree-wide -- registration (sv_main.c:137 default "1"), Cvar_Register (sv_main.c:3559), extern decl (sv_send.c:47), and ONE enforcing read (sv_send.c:629). The read gates SV_StartSound's use_phs flag, which selects MULTICAST_PHS (callee CM_LeafPHS, leaf/BSP-derived Potentially Hearable Set + 1024-unit near-distance override) vs MULTICAST_ALL (mask=NULL, broadcast to all spawned clients). Every material clause (polarity, threshold, default, OFF-state, scope, traffic-reduction side-effect) enforce-traces to a located line incl. the engine's own comment ("potentially hearable from org", line 401) which the description paraphrases accurately.

Classification TRACED-CLEAN. The one imprecision -- ON state framed as strict PHS ("only ... could potentially hear it") -- is the discipline's permitted "still-true minor vagueness": the actual code ALSO delivers to any client within 1024 units (sv_send.c:479) regardless of PHS membership. That is an EXPANSION of the recipient set toward players who genuinely could hear a nearby sound; it does not send to anyone who cannot plausibly hear it and does not invert/contradict the clause. No threshold/polarity/default/OFF-state error anywhere. WI-2 satisfied: default verified at registered "1", not a cfg value; no OnChange, no cross-mod (KTX) override of sv_phs.

## flags_for_review

- [fyi/other/vpass] ON-state delivery is PHS-set OR within-1024-units (sv_send.c:479 `if (VectorLength(delta) <= 1024) goto inrange;`), not strict PHS. The description's 'sent only to players who could potentially hear it' omits this near-distance shortcut. Not a defect (it expands toward genuinely-hearable nearby players, no contradiction), but if a future polish wants full precision it could read 'players whose area is potentially hearable OR who are close to the source'.
- [fyi/other/vpass] Orthogonal to sv_phs, but in scope of the same gate (sv_send.c:629): channel bit 8 (`channel & 8`, 'sounds that break the phs are reliable') forces a sound to bypass PHS and broadcast reliably even when sv_phs=1. This is a per-sound flag set by game/QC code, NOT controlled by sv_phs, so omitting it from the cvar's user-doc is correct scoping. Flagged only so a reviewer knows sv_phs is not the sole determinant of whether a given sound is PHS-filtered.
- [fyi/other/vpass] Recipient loop (sv_send.c:446-451) iterates only cs_spawned clients on BOTH the PHS and ALL paths; the description's 'all connected players' is the conventional user-doc gloss and matches sibling cvar descriptions, but strictly the set is spawned (in-game) clients, not connecting-but-unspawned ones.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_phs",
  "type": "cvar",
  "description": "Controls whether the server limits which players receive each sound based on where the sound happens in the map. When on, a sound is sent only to players who could potentially hear it from its location, which reduces network traffic. When off, every sound is sent to all connected players regardless of distance.\n\n1 = send sounds only to players potentially within hearing range (default).\n0 = send all sounds to all players.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_send.c:629. Engine-enforced sound culling knob. Registered at src/sv_main.c:137 (`cvar_t sv_phs = {\"sv_phs\", \"1\"}`), default 1. Enforcing read at src/sv_send.c:629 inside SV_StartSound: `if ((channel & 8) || !(int)sv_phs.value) { ... use_phs = false; ... } else use_phs = true;`. Polarity: when `sv_phs.value` is non-zero (default 1) and the channel does not carry the no-PHS bit (channel & 8), `use_phs = true`; when 0, `use_phs = false`. The downstream effect is enforced at src/sv_send.c:670-673: `if (use_phs) SV_MulticastEx(origin, ... MULTICAST_PHS ...) else SV_MulticastEx(origin, ... MULTICAST_ALL ...)`. The MULTICAST mode meanings are documented and enforced at the multicast dispatcher: src/sv_send.c:399-401 comments ('MULTICAST_ALL same as broadcast', 'MULTICAST_PHS send to clients potentially hearable from org'), with the PHS filtering branch at src/sv_send.c:475 (`if (to == MULTICAST_PHS_R || to == MULTICAST_PHS)`). So 1 = PHS-culled (only potentially-hearable clients), 0 = broadcast to all. 'reduces network traffic' is the admin-observable consequence of culling, not an opinion/recommended value. Default 1 from registration literal.",
  "description_proposed": null
}
```
