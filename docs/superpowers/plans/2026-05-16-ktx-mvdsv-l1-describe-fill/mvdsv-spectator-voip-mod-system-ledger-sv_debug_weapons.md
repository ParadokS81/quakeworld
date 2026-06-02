# describe-fill-synthesis ledger -- mvdsv `sv_debug_weapons`

- **project:** mvdsv
- **knob:** `sv_debug_weapons` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_debug_weapons: synthesized -- diagnostic toggle, writes weapon-script/weapon-switch (incl. server-side) events into the MVD demo (>=1=on) -- origin=synthesized ref=src/sv_user.c:4362 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Diagnostic toggle for weapon-switching debugging. When on, the server writes weapon-script details -- the player's weapon-preference list and weapon-selection events, including server-side weapon-switch decisions -- into the recorded MVD demo, so weapon handling can be inspected afterwards in a compatible tool.
>
> 0 = off (no weapon debug data recorded).
> 1 = on (record weapon-script and weapon-switch events).
>
> Default: 0.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| read site 1 writes weapon-script | src/sv_user.c:4362 | `if (sv_debug_weapons.value >= 1) {` (in SV_DebugWriteWeaponScript) | yes |
| weapon-script fields written | src/sv_user.c:4372-4379 | `MVD_SZ_Write(&items...&shells...&nails...&rockets...&cells...&choice...weaponlist...)` | yes |
| read site 2 writes server-side switch instruction | src/sv_user.c:4401 | `if (sv_debug_weapons.value >= 1) {` (in SV_DebugServerSideWeaponInstruction) | yes |
| read site 3 encodes weapon-preference (w_rank) | src/sv_user.c:4438,4445 | `if (sv_debug_weapons.value >= 1) {` ... `Info_Get(&cl->_userinfo_ctx_, "w_rank")` | yes |
| data goes into MVD demo (hidden block) | src/sv_user.c:4366,4369 | `header.type_id = (server_side ? mvdhidden_usercmd_weapons_ss : mvdhidden_usercmd_weapons);` ... `MVDWrite_HiddenBlockBegin(...)` | yes |
| init toggles the pext bit (mechanism) | src/sv_init.c:455-459 | `if (sv_debug_weapons.value) { svs.mvdprotocolextension1 |= MVD_PEXT1_DEBUG_WEAPON; } else { ... &= ~MVD_PEXT1_DEBUG_WEAPON; }` | yes |
| threshold >=1 (0=off) | src/sv_user.c:4362 | `sv_debug_weapons.value >= 1` | yes |
| default 0 | src/sv_user.c:75 | `cvar_t sv_debug_weapons = { "sv_debug_weapons", "0" };` | yes |
| settable plain cvar (no cmd) | src/sv_user.c:4924 | `Cvar_Register(&sv_debug_weapons);` | yes |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | "Diagnostic toggle for weapon-switching debugging" | src/qwprot/src/protocol.h:68 + src/sv_user.c:4359-4458 | `# define MVD_PEXT1_DEBUG_WEAPON (1 << 3) // Send weapon-choice explanation to server for logging` | MATCH |
| 2 | "When on, the server writes ... into the recorded MVD demo" (gate + destination) | src/sv_user.c:4362,4401,4438 gate; src/sv_demo.c:485-488 -> 467-470 destination | `if (sv_debug_weapons.value >= 1) {` ... `MVDWrite_HiddenBlockBegin(...)` -> `return MVDWrite_Begin(dem_multiple, 0, length);` -> `if (!sv.mvdrecording) return false;` | MATCH |
| 3 | "the player's weapon-preference list" | src/sv_user.c:4422 (instruction writer) + 4379/4455 weaponlist string | `memcpy(weaponlist, cl->weaponswitch_priority, min(10, sizeof(cl->weaponswitch_priority)));` | MATCH |
| 4 | "weapon-selection events" (client-side weapon script) | src/sv_user.c:4384-4396 writer, triggered at 4652-4653 | `else if (type == clc_mvd_debug_type_weapon) { SV_DebugClientSideWeaponScript(cl); }` ; writer reads items/ammo/choice/weaponlist and writes `mvdhidden_usercmd_weapons` | MATCH |
| 5 | "including server-side weapon-switch decisions" | src/sv_user.c:4436-4456 writer, called at 3991,4037,4078 | `SV_DebugServerSideWeaponScript(sv_client, best_impulse);` (inside switch-to-best-weapon logic) -> writes `mvdhidden_usercmd_weapons_ss` with server_side=true, choice=best_impulse | MATCH |
| 6 | "0 = off / 1 = on" (polarity + threshold) | src/sv_user.c:4362,4401,4438 (writers); src/sv_init.c:455 (pext toggle) | writers: `sv_debug_weapons.value >= 1`; sv_init: `if (sv_debug_weapons.value)` | MATCH (FYI: writers use `>= 1`, sv_init uses bare truthy; both agree on the documented 0/1 states) |
| 7 | "Default: 0" | src/sv_user.c:75 | `cvar_t sv_debug_weapons = { "sv_debug_weapons", "0" };` | MATCH |
| 8 | "Set by: server config" (standard cvar, no ROM/archive) | src/sv_user.c:4924 + struct at :75 | `Cvar_Register(&sv_debug_weapons);` (plain register; struct sets no CVAR_ flags) | MATCH |
| 9 | "can be inspected afterwards in a compatible tool" | (no enforcing site in mvdsv; cross-tool claim) | hidden block is written with dem_multiple type_id for downstream MVD parsers | MATCH-by-design (data is the producer half; consumer is external -- not contradicted, not over-claimed) |

**V-pass notes:** VERDICT: TRACED-CLEAN. Oracle confirmed 1.11-53-g18d0362. Every material clause maps to a located, verified enforcing line.

Trace summary: sv_debug_weapons registered at sv_user.c:75 (default "0"), Cvar_Register'd at sv_user.c:4924 under #ifdef MVD_PEXT1_DEBUG with no CVAR_ flags -> ordinary server cvar settable from config/console ("Set by: server config" holds). Three writer functions in sv_user.c each gate on `sv_debug_weapons.value >= 1`:
 - SV_DebugClientSideWeaponScript (4384), triggered by clc_mvd_debug_type_weapon (4653) -> client's weapon-script state (items/ammo/choice + weaponlist) [clause 4].
 - SV_DebugServerSideWeaponInstruction (4399), triggered when client installs server-side weapon-switch config (4885) -> writes cl->weaponswitch_priority, the player's preference list [clause 3].
 - SV_DebugServerSideWeaponScript (4436), called at 3991/4037/4078 inside the server-side best-weapon switch decision path -> writes best_impulse with server_side=true [clause 5].
All three funnel through SV_DebugWriteWeaponScript (4360) -> MVDWrite_HiddenBlockBegin -> MVDWrite_Begin(dem_multiple,...) which returns false unless sv.mvdrecording. So the "writes ... into the recorded MVD demo" destination claim is enforced, not inferred from the knob name [clause 2]. Separately, sv_init.c:455 advertises the MVD_PEXT1_DEBUG_WEAPON protocol-extension bit when the cvar is truthy (the data is solicited from clients only when this bit is set), reinforcing the diagnostic-feature framing [clause 1].

No flavour-C defects: the semantic content (preference list / selection events / server-side switch decisions) is grounded in the writer bodies and their call sites, not in the cvar name or a string. Polarity, threshold, default, and access-class all verified at enforcing lines.

Two minor non-defect observations folded into flags_for_review below (threshold-shape nuance and the cross-tool consumer half). Neither contradicts the description nor rises to C-NEAR-MISS: the description documents only 0/1, which both gate forms honor, and it correctly attributes inspection to "a compatible tool" (external) rather than claiming mvdsv reads the data back.

## flags_for_review

- [fyi/other/vpass] Threshold-shape nuance (not a defect): the three writers gate on `sv_debug_weapons.value >= 1` (sv_user.c:4362/4401/4438) while the protocol-extension toggle in sv_init.c:455 uses bare truthy `if (sv_debug_weapons.value)`. For the documented states 0 and 1 these are identical, so the description's 0=off/1=on framing is correct. The only divergent inputs would be fractional 0<v<1 (pext bit set by sv_init but writers stay off) -- an unreachable/undocumented edge for a debug toggle, not worth surfacing in user-facing text.
- [fyi/other/vpass] Consumer-half is external (not a defect): the 'inspected afterwards in a compatible tool' clause has no enforcing read-site inside mvdsv -- by design, mvdsv is only the producer. It writes mvdhidden_usercmd_weapons / _ss / weapon_instruction hidden blocks (sv_user.c:4366,4405) into the MVD stream for downstream parsers (e.g. ezquake demo playback / MVD tooling). The description correctly frames this as an external tool rather than claiming mvdsv reads it back, so it is MATCH-by-design, not WI2.
- [fyi/off-scope-entity/vpass] Sibling cvar sv_debug_antilag (sv_user.c, registered :4926) follows the exact same producer pattern (sv_init.c:443 truthy pext toggle + SV_Debug* writers gating on .value) for antilag diagnostics. If a sv_debug_antilag row exists in the fleet it should classify the same way; not in scope for this knob but flagged for cross-row consistency.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_debug_weapons",
  "type": "cvar",
  "description": "Diagnostic toggle for weapon-switching debugging. When on, the server writes weapon-script details -- the player's weapon-preference list and weapon-selection events, including server-side weapon-switch decisions -- into the recorded MVD demo, so weapon handling can be inspected afterwards in a compatible tool.\n\n0 = off (no weapon debug data recorded).\n1 = on (record weapon-script and weapon-switch events).\n\nDefault: 0.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:4362. Read use-sites (all `if (sv_debug_weapons.value >= 1)`): sv_user.c:4362 in SV_DebugWriteWeaponScript writes an mvdhidden_usercmd_weapons / _ss block (header.type_id, sv_user.c:4366) carrying items/shells/nails/rockets/cells/choice and the weaponlist string (sv_user.c:4372-4379) -- the player's weapon-script state; sv_user.c:4401 in SV_DebugServerSideWeaponInstruction writes an mvdhidden_usercmd_weapon_instruction block (sv_user.c:4405) carrying the server-side weapon-switch flags/mode/priority list -- the server-side weapon-switch decision; sv_user.c:4438 in SV_DebugServerSideWeaponScript encodes the w_rank weapon-preference string (sv_user.c:4445 `Info_Get(... \"w_rank\")`). All three write into the MVD via MVDWrite_HiddenBlockBegin -- hence \"weapon-preference list and weapon-selection events incl. server-side switch decisions, into the recorded MVD demo.\" Fourth read site sv_init.c:455 `if (sv_debug_weapons.value) { svs.mvdprotocolextension1 |= MVD_PEXT1_DEBUG_WEAPON; } else { ... &= ~... }` -- init advertises/clears the MVD_PEXT1_DEBUG_WEAPON pext bit (mechanism, kept out of user doc per D20). All sites guarded by `#ifdef MVD_PEXT1_DEBUG_WEAPON` / `MVD_PEXT1_DEBUG`. Threshold: write-sites `>= 1`, init `.value` truthy; both treat 0 as off, >=1 as on -> 0/1 toggle. Default: registered literal `cvar_t sv_debug_weapons = { \"sv_debug_weapons\", \"0\" }` (sv_user.c:75), registered sv_user.c:4924 -> default 0. Set by: plain server cvar, no command handler -> server config / rcon. No KTX override (F-MV1: grep of ktx/src finds no sv_debug_weapons).",
  "description_proposed": null
}
```
