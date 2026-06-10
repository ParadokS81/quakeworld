# Antilag in QuakeWorld -- source trace + community context (seed for a dedicated concept note)

**Status:** Research seed / parking doc. NOT a concept note yet. Captured 2026-06-10 during the `network-connection` L3 note authoring (demand-driven-l3 arc), when the operator surfaced the antilag two-flavor debate. `network-connection.md` forward-references a dedicated antilag note; this preserves the verified trace + operator SME so the eventual author does not re-derive it.

**Evidence tiers are labeled deliberately.** VERIFIED = read in source this session (file:line). COMMUNITY = operator/community knowledge, plausible but NOT source-verified. OPINION = operator's stated design position, explicitly OUT OF SCOPE for the factual note (D7 normativity boundary) -- recorded as debate context only.

## Classification (decide when authoring)

Antilag is server-side config + a live competitive debate. It straddles the (player-facing, shipped) `network` domain and a future server-admin arc. The player view is already covered in `network-connection.md` ("Antilag -- the server's job"). A dedicated note would be the deeper hit-scan-vs-projectile + cross-engine + debate piece. It is NOT a taxonomy domain in the demand-driven-l3 arc (D1) -- treat as operator-commissioned or fold into the server-admin arc.

## VERIFIED (mvdsv, read this session)

- **Rewind mechanism** (`mvdsv/src/sv_user.c:4513-4577`): on a shooter's packet, the server rewinds other players to `target_time` and interpolates/extrapolates their stored positions (`antilag_positions[]` ring, `MAX_ANTILAG_POSITIONS 128`, `server.h`). `target_time = frame->sv_time` (server clock when the frame the shooter saw was sent) `+` a forward-prediction offset derived from `frame->ping_time` (`min(... 1/max_physfps if ping<20ms else 20ms, sv.time)`). The comment at `sv_user.c:4528` names the 13 ms relationship.
- **`sv_antilag` levels** (`sv_main.c` / `sv_phys.c:53-55`; descriptions in L1): `0`/empty = off; `1` = hit-scan lag-comp (rewind targets for instant-hit weapons); `2` = extended, also routes mod (QuakeC) traceline checks through lag-compensated positions. Published in serverinfo.
- **`sv_antilag_no_pred`**: drops the prediction offset -- `target_time = frame->sv_time` exactly (`sv_user.c:4525-4526`). "Negative" cvar (hidden from serverinfo).
- **`sv_antilag_projectiles`**: extends rewind to rockets/grenades/nails via `MOVE_LAGGED`, **only when `sv_antilag == 2`** (`sv_phys.c:751`, `pr2_cmds.c:509`). This is mainline's projectile-antilag path -- the *rewind* approach.
- **Antilag rewind is byte-identical between `mvdsv` and `dusty-mvdsv`.** Verified by diff: `sv_user.c` antilag block (4495-4577), `sv_antilag*` cvar defs, `sv_world.c`, `sv_phys.c` all identical. The fork's `sv_user.c`/`server.h` diffs contain NO antilag lines.
- **The fork's actual delta = `MVD_PEXT1_SIMPLEPROJECTILE`** (CSQC simple-projectile system) + weapon-prediction extensions + `fofs_client_time` / `antilag_trailtime` projectile-trail encoding (`dusty-mvdsv` `sv_ents.c`, `server.h`). Version string `1.20-dev-antilag-r402` is misleading -- the work is projectile/CSQC rendering, requiring client cooperation (CSQC runs client-side -> needs the matched `unezquake` client).

## COMMUNITY (operator SME, ParadokS 2026-06-10 -- NOT source-verified)

- The fight is over **projectiles**, not hit-scan. Mainline "normal" antilag in practice = hit-scan only (LG/SG/SSG); Dusty's fork tried to introduce projectile compensation.
- **Dusty's projectile approach (as explained to the operator):** it drops the user's *projectile* ping toward 0 -- your rocket spawns from a point *ahead* of you to compensate, and the more you lag, the further ahead it spawns. >>> NEEDS SOURCE VERIFICATION in `dusty-mvdsv` (the `MVD_PEXT1_SIMPLEPROJECTILE` path) + `unezquake`. <<<
- Dusty's antilag features need **both** the server fork (`dusty-mvdsv`) AND the client fork (`unezquake`) in tandem; the client-side part is "mostly cosmetic" without the matched server.
- The community is **divided**: many servers run two variants on **separate port ranges** so players can choose; some players refuse Dusty's settings, others find it more enjoyable. Unreconciled as of 2026-06.

## OPINION (operator design position -- DEBATE CONTEXT ONLY, do NOT encode as note guidance)

ParadokS advocates antilag should **compensate, not eliminate**: gradual percentage-wise compensation rather than zeroing projectile ping (e.g. ping 100 -> ~50 ms rockets, ping 42 -> ~20 ms), with a ceiling above which no further help is given. This is one informed player's preference, explicitly "not here to settle the antilag debate." Per D7, the note stays factual and acknowledges the divide without taking a side; this opinion belongs to the wiki/debate layer, not the L3 note's recommendation surface.

## TO VERIFY before authoring

1. Dusty's projectile mechanism -- does it spawn projectiles ahead proportional to lag / zero projectile ping? Trace `MVD_PEXT1_SIMPLEPROJECTILE` in `dusty-mvdsv/src/` (sv_ents.c, sv_user.c) + the `unezquake` client side.
2. **FTE's** antilag -- genuinely separate engine implementation (`fte:cvar:sv_antilag`, scale `0/1/2/3`: 1=mod-controlled default, 2=forced, 3=recalc trace start). The real "second hit-scan implementation" in the ecosystem.
3. Git history of mvdsv `sv_antilag` -- origin, whether a rival implementation ever coexisted (informs the "two flavors" framing).
4. Practical usage of mainline `sv_antilag 2` + `sv_antilag_projectiles` vs Dusty's approach -- which servers run which.

## Anchors

- `apps/qw-oracle/curated/concept-notes/network-connection.md` -- player-facing antilag section + forward reference here.
- Ping/timing basis (antilag uses `frame->ping_time`): scoreboard ping = server `SV_CalcPing` averaged+quantized to ~13 ms (77 pps cadence); `show net` = client `cls.latency`, continuous float. Full ping trace in the 2026-06-10 network-note session.
- `cl_delay_packet` "pinging up" (0.5x per-direction hold, `ezquake net.c:178`) -- adjacent network mechanic, covered in `network-connection.md`.
