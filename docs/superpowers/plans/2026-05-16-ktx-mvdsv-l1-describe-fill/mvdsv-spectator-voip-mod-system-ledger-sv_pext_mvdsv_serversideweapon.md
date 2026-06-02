# describe-fill-synthesis ledger -- mvdsv `sv_pext_mvdsv_serversideweapon`

- **project:** mvdsv
- **knob:** `sv_pext_mvdsv_serversideweapon` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_pext_mvdsv_serversideweapon: synthesized -- offers the server-side weapon-selection pext to clients, but ONLY when KTX is the running mod (qwm_name substring); 0=never, default 1 -- origin=synthesized ref=sv_init.c:424 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether the server offers the server-side weapon-selection protocol extension to connecting clients. It only takes effect when the running mod is KTX; on any other mod the extension is never offered regardless of this setting. When offered and a client opts in, the server handles that client's weapon switching (auto-switching to the best weapon, weapon hiding) on its side.
>
> 0 = never offer the extension.
> 1 = offer it, but only while KTX is the running mod.
>
> Default: 1.
> Set by: server config / rcon.
> See also: ktx-serverside-weapons.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered default 1 | sv_main.c:199 | cvar_t sv_pext_mvdsv_serversideweapon = { "sv_pext_mvdsv_serversideweapon", "1" } | MATCH |
| gated on value AND KTX detection | sv_init.c:424 | if (sv_pext_mvdsv_serversideweapon.value && strstr(Cvar_String("qwm_name"), "KTX")) | MATCH |
| sets the pext bit when both true | sv_init.c:425 | svs.mvdprotocolextension1 |= MVD_PEXT1_SERVERSIDEWEAPON | MATCH |
| clears bit otherwise (0 or non-KTX) | sv_init.c:431 | svs.mvdprotocolextension1 &= ~MVD_PEXT1_SERVERSIDEWEAPON | MATCH |
| spawn-time gate governs over startup default-on | sv_main.c:3675 vs sv_init.c:424 | :3675 unconditional |=, re-derived per spawn at :424 | MATCH |
| bit offered/negotiated per client | sv_user.c:3168 | sv_client->mvdprotocolextensions1 = proto_value & svs.mvdprotocolextension1 | MATCH |
| effect = server-side weapon logic when client opted in | sv_user.c:4053 | if ((sv_client->mvdprotocolextensions1 & MVD_PEXT1_SERVERSIDEWEAPON) && sv_client->weaponswitch_enabled) | MATCH |
| client opt-in is client-driven | sv_user.c:4877 | cl->weaponswitch_enabled = (flags & clc_mvd_weapon_switching) | MATCH |
| set-by config/rcon (not blocklisted) | sv_main.c:1748-1762 | not present in blocklist | MATCH |
| KTX no awareness of cvar | ktx/src (grep) | no sv_pext_mvdsv_serversideweapon / weaponswitch references | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Controls whether server OFFERS the server-side weapon-selection protocol extension to connecting clients | sv_init.c:425 + sv_main.c:906,913 + sv_user.c:3168 | `svs.mvdprotocolextension1 \|= MVD_PEXT1_SERVERSIDEWEAPON;` (init.c:425); SVC_GetChallenge advertises `svs.mvdprotocolextension1` to client (main.c:906-916); per-client `mvdprotocolextensions1 = proto_value & svs.mvdprotocolextension1` (user.c:3168) | MATCH |
| 2 | Only takes effect when running mod is KTX; on any other mod the extension is NEVER offered regardless of setting | sv_init.c:424,431 (+ comment sv_main.c:198 "Only enabled on KTX mod") | `if (sv_pext_mvdsv_serversideweapon.value && strstr(Cvar_String("qwm_name"), "KTX")) { ...\|= ; } else { ...&= ~ ; }` — non-KTX (or empty qwm_name) clears the bit | MATCH |
| 3 | When offered and client opts in, server handles that client's weapon switching (auto-switch to best weapon, weapon hiding) on its side | sv_user.c:4053, 4065, 4077-4084, 4091-4096, 4866-4882 | `if ((sv_client->mvdprotocolextensions1 & MVD_PEXT1_SERVERSIDEWEAPON) && sv_client->weaponswitch_enabled)`; computes best/hide via `SV_ServerSideWeaponRank`; `ent->impulse = best_impulse` (auto-switch); `ent->impulse = hide_impulse` (hide); hide_axe/hide_sg/hide_on_death parsed at 4866-4883 | MATCH |
| 4 | 0 = never offer the extension | sv_init.c:424,431 | `value &&` short-circuits when 0 -> else-branch `svs.mvdprotocolextension1 &= ~MVD_PEXT1_SERVERSIDEWEAPON` | MATCH |
| 5 | 1 = offer it, but only while KTX is the running mod | sv_init.c:424-425 | nonzero `value` AND KTX -> `\|= MVD_PEXT1_SERVERSIDEWEAPON` (any nonzero enables; 1 is the canonical/default on-value; KTX qualifier present in same condition) | MATCH |
| 6 | Default: 1 | sv_main.c:199 | `cvar_t sv_pext_mvdsv_serversideweapon = { "sv_pext_mvdsv_serversideweapon", "1" };` registered default = "1" | MATCH |
| 7 | Set by: server config / rcon | sv_main.c:199 (init) + sv_main.c:3580 (Cvar_Register) | 2-field initializer -> flags=0 (no CVAR_ROM/LATCH/SERVERINFO); plain registered server cvar -> settable via server.cfg + rcon | MATCH |
| -- | Opt-in mechanism (supports clauses 1,3) | sv_user.c:3136,3168 (Cmd_PEXT_f) + 4664-4666,4877 | `proto_value = Q_atoi(Cmd_Argv(idx++))` then `& svs.mvdprotocolextension1`; clc_mvd_weapon -> `cl->weaponswitch_enabled = (flags & clc_mvd_weapon_switching)` | MATCH |

**V-pass notes:** VERSION CONFIRMED: git describe == 1.11-53-g18d0362. Trace discipline (enforce-trace-discipline.md) applied per-clause; callees followed into sv_init.c, sv_main.c (challenge handshake + InitLocal), and sv_user.c (Cmd_PEXT_f, the per-client weapon logic, and the clc parser).

Cvar has exactly 4 use-sites: declaration (sv_main.c:199, default "1"), registration (sv_main.c:3580), extern (sv_init.c:421), and the SINGLE enforcing read-site (sv_init.c:424). The enforcing gate is `if (cvar.value && strstr(Cvar_String("qwm_name"), "KTX"))` -- this one line confirms BOTH the polarity (truthiness of value) AND the KTX scope. The source comment at sv_main.c:198 ("Only enabled on KTX mod (see sv_init)") and the inline comment "Cheap 'ktx' detection" (sv_init.c:423) corroborate the scope clause.

OFFER+OPT-IN semantics fully traced: the cvar sets a SERVER capability bit in svs.mvdprotocolextension1 (a bitfield advertised to clients during SVC_GetChallenge, sv_main.c:906-916). The per-client enable is `proto_value & svs.mvdprotocolextension1` (sv_user.c:3168) -- the AND of client-requested AND server-offered, which is precisely "offer, client opts in." A second opt-in layer (weaponswitch_enabled, set from the clc_mvd_weapon flags at sv_user.c:4877) further gates the actual behavior. The description's "offer / opts in" framing is exactly right and NOT an overclaim of unconditional enable.

SIDE-EFFECT clause traced to actual EFFECT lines, not just gate: SV_ServerSideWeaponLogic_PrePostThink (sv_user.c:4046+) is gated on the per-client SSW bit AND weaponswitch_enabled (4053), computes best/hide weapons (SV_ServerSideWeaponRank, 4065), and writes ent->impulse = best_impulse (auto-switch, 4084) or ent->impulse = hide_impulse (hiding, 4096). hide_axe / hide_sg / hide_on_death are parsed at 4866-4883. "Server handles ... on its side" = SV_* server code. All MATCH.

WI-2 metadata: registered default = "1" (verified at the RegisterCvar declaration, not a shipped .cfg). "Set by server config / rcon" verified against the flags field (none set -> plain settable server cvar). Both clean.

NUANCE (flagged below, NOT a defect): SV_InitLocal (sv_main.c:3675) unconditionally ORs MVD_PEXT1_SERVERSIDEWEAPON into svs.mvdprotocolextension1 at server BOOT. This does NOT contradict the KTX-scope clause: SV_SpawnServer (sv_init.c:419-435) re-evaluates the bit on EVERY map load (running after boot and on each map/changelevel) and CLEARS it when not KTX or cvar=0. Clients connect only after a map is spawned, so the client-facing offer is always the SV_SpawnServer-gated value; the boot-time OR is a transient overwritten before any client sees it. Build-flag note: the whole feature (cvar + gate + behavior) is wrapped in #ifdef MVD_PEXT1_SERVERSIDEWEAPON; the description correctly does not mention the compile flag (out of scope for a runtime-cvar user-doc), and the cvar's existence as a registered cvar implies the flag is defined in this build.

## flags_for_review

- [review/cross-mod-override/synthesis] sv_pext_mvdsv_serversideweapon is a one-directional cross-mod coupling: the MVDSV engine cvar only activates when it detects KTX via a substring match on the qwm_name cvar (sv_init.c:424 strstr(Cvar_String("qwm_name"), "KTX")). KTX itself has zero awareness of this cvar (grep ktx/src empty). The detection is spoofable -- any mod whose qwm_name contains the substring 'KTX' would flip the gate. Worth a human look for the cross-mod L3 note and the spoofable-substring angle (mirrors prior finding on qwm_name KTX-gating).
- [fyi/other/synthesis] Apparent contradiction surfaced and resolved during tracing: sv_main.c:3675 unconditionally sets svs.mvdprotocolextension1 |= MVD_PEXT1_SERVERSIDEWEAPON in SV_InitLocal at startup, while sv_init.c:424 conditionally sets/clears the same bit per SV_SpawnServer (map load). The spawn-time path runs later and re-derives the bit (clearing it when KTX is absent), so the live value is governed by the gate, not the unconditional startup set. Not a bug -- noted so a reviewer who greps only sv_main.c:3675 does not conclude the bit is always on.
- [fyi/other/vpass] sv_main.c:3675 (SV_InitLocal, boot) unconditionally sets svs.mvdprotocolextension1 |= MVD_PEXT1_SERVERSIDEWEAPON, while sv_init.c:424-431 (SV_SpawnServer, per-map) conditionally sets-or-clears it based on cvar.value && qwm_name~='KTX'. SV_SpawnServer runs after boot and on every map load (before any client connects), so it governs the client-facing offer; the InitLocal OR is a transient default. Not a defect for this description (which correctly describes the effective per-map gated behavior), but a future reader grepping only the InitLocal site could mistakenly conclude the bit is always-on regardless of mod.
- [fyi/cross-mod-override/vpass] Scope detection is a substring match on the qwm_name cvar: strstr(Cvar_String("qwm_name"), "KTX"). qwm_name is a plain registered cvar (sv_main.c:3422, default "") that the mod sets; a non-KTX mod that set qwm_name to any string containing the substring 'KTX' (or an operator manually setting it) would satisfy the gate. The description's 'only when the running mod is KTX' is the intended/normal-case semantics and matches the code comment ('Cheap ktx detection'), so not a description defect -- noting the substring-trust mechanism as an off-scope robustness observation.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_pext_mvdsv_serversideweapon",
  "type": "cvar",
  "description": "Controls whether the server offers the server-side weapon-selection protocol extension to connecting clients. It only takes effect when the running mod is KTX; on any other mod the extension is never offered regardless of this setting. When offered and a client opts in, the server handles that client's weapon switching (auto-switching to the best weapon, weapon hiding) on its side.\n\n0 = never offer the extension.\n1 = offer it, but only while KTX is the running mod.\n\nDefault: 1.\nSet by: server config / rcon.\nSee also: ktx-serverside-weapons.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_init.c:424. Registration cvar_t sv_pext_mvdsv_serversideweapon = {\"sv_pext_mvdsv_serversideweapon\", \"1\"} at sv_main.c:199 (default 1), registered sv_main.c:3580. ENFORCING gate: sv_init.c:424 (in SV_SpawnServer, per map load) `if (sv_pext_mvdsv_serversideweapon.value && strstr(Cvar_String(\"qwm_name\"), \"KTX\"))` -> :425 svs.mvdprotocolextension1 |= MVD_PEXT1_SERVERSIDEWEAPON (+ :427 ...WEAPON2); ELSE :431/:433 clears those bits. This is the authoritative AND of (cvar non-zero) AND (KTX detected via qwm_name substring), and the comment :423 'Cheap ktx detection' confirms the coupling. POLARITY/SCOPE: value 0 -> bit cleared regardless of mod; value 1 -> bit set only if KTX. Note sv_main.c:3675 unconditionally sets the same bit in SV_InitLocal at startup, BUT sv_init.c:424 runs later on every SV_SpawnServer and re-derives it (clearing when KTX absent), so the spawn-time gate governs the live value -- sv_init.c:424 is the enforcing line for this cvar. svs.mvdprotocolextension1 is the server's advertised bitmask (sv_main.c:906-913 LittleLong'd and sent) and is per-client masked at negotiation sv_user.c:3168 `sv_client->mvdprotocolextensions1 = proto_value & svs.mvdprotocolextension1` (so 'offered to clients'). OBSERVABLE CONSEQUENCE read: sv_user.c:4053 `if ((sv_client->mvdprotocolextensions1 & MVD_PEXT1_SERVERSIDEWEAPON) && sv_client->weaponswitch_enabled)` runs SV_ServerSideWeaponLogic (auto-switch to best weapon / hide weapon, modes :4058-4063). 'client opts in': weaponswitch_enabled is client-driven, set sv_user.c:4877 `cl->weaponswitch_enabled = (flags & clc_mvd_weapon_switching)` -- hence framed as offer+opt-in, not server-forced. Default 1 per the cvar_t literal. Set-by: not on rcon blocklist (sv_main.c:1748-1762). F-MV1: KTX source has ZERO references to this cvar and no weaponswitch/MVD_PEXT1 awareness (grep ktx/src) -- the coupling is one-directional (MVDSV detects KTX by qwm_name). Cross-engine consequence (the full server-side-weapon feature spans the KTX mod + client) routed to See also per D20. All material clauses TRACED-CLEAN.",
  "description_proposed": null
}
```
