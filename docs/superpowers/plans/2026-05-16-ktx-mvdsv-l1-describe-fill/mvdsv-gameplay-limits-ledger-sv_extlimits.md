# describe-fill-synthesis ledger -- mvdsv `sv_extlimits`

- **project:** mvdsv
- **knob:** `sv_extlimits` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_extlimits: synthesized -- 3-way entity-limit gate (0 always-safe / 1 always-extended / 2 BSP2-only), traced to the max_edicts clamp -- origin=synthesized ref=src/sv_init.c:519 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether the server allows the extended entity limit (a higher cap on the number of entities a map and mod can use) instead of the conservative safe limit.
>
> 0 = always use the safe limit; never allow the extended entity count.
> 1 = always allow the extended entity limit, on any map.
> 2 = allow the extended entity limit only on maps in the newer (BSP2) format; standard maps use the safe limit.
>
> Note: clients that do not support the extended entity limit may see some entities or projectiles go invisible on a server running above the safe limit.
>
> Default: 2.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| 0 = always clamp to safe limit | src/sv_init.c:519-521 | `if (sv_extlimits.value == 0 ... ) { sv.max_edicts = min(sv.max_edicts, MAX_EDICTS_SAFE); }` | MATCH |
| 2 = clamp only on non-BSP2 map | src/sv_init.c:519 | `(sv_extlimits.value == 2 && sv_bspversion.value < 2)` | MATCH |
| 1 (and other) = no clamp here, extended allowed | src/sv_init.c:519 | condition matches neither 0 nor the 2-branch -> skipped | MATCH |
| safe limit = 512, extended cap = 2048 | src/bothdefs.h:52-53 | `MAX_EDICTS 2048` / `MAX_EDICTS_SAFE 512` | MATCH |
| higher value provided by VM/progs loader pre-clamp | src/pr2_exec.c:614 | `sv.max_edicts = MAX_EDICTS;` | MATCH |
| bspversion 1=standard, 2=BSP2, engine-set ROM | src/cmodel.c:1306,1312 | `Cvar_SetROM(&sv_bspversion, "1")` / `"2"` | MATCH |
| client-invisibility warning above 512 | src/sv_user.c:355 | `if (sv.max_edicts > 512 && !(... FTE_PEXT_ENTITYDBL))` | MATCH |
| default = 2 | src/sv_main.c:202 | `cvar_t sv_extlimits = { "sv_extlimits", "2" }` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Purpose/polarity: controls whether server allows the EXTENDED entity limit (higher cap) vs the conservative SAFE limit | sv_init.c:519-521 (+ bothdefs.h:52-53) | `if (sv_extlimits.value == 0 || (sv_extlimits.value == 2 && sv_bspversion.value < 2)) { sv.max_edicts = min(sv.max_edicts, MAX_EDICTS_SAFE); }` ; `#define MAX_EDICTS 2048` / `#define MAX_EDICTS_SAFE 512 // lower limit, to make sure no client limits exceeded` | MATCH (clamp pulls max_edicts down to 512 = safe; not clamping leaves the progs-set extended cap of up to 2048) |
| 2 | "higher cap on the number of entities a map AND mod can use" | pr_edict.c:1255 (PR1) + pr2_exec.c:614-619 (PR2 mod) | `sv.max_edicts = MAX_EDICTS;` (PR1); PR2: `sv.max_edicts = MAX_EDICTS; if (gamedata.APIversion >= 14) sv.max_edicts = min(sv.max_edicts, gamedata.maxentities); else sv.max_edicts = min(sv.max_edicts, 512);` | MATCH (progs/mod loader raises the cap to 2048 or a mod-requested count; sv_extlimits then decides whether to clamp back) |
| 3 | 0 = always use the safe limit; never allow extended | sv_init.c:519 | `sv_extlimits.value == 0` (first disjunct -> clamp to MAX_EDICTS_SAFE unconditionally) | MATCH |
| 4 | 1 = always allow extended, on any map | sv_init.c:519 | value==1 satisfies neither disjunct -> no clamp; `sv.max_edicts` left at progs-set cap regardless of `sv_bspversion` | MATCH (sv_extlimits never clamps at value 1; effective ceiling is whatever the progs loader set, which the description's "map and mod can use" framing already covers) |
| 5 | 2 = allow extended only on BSP2-format maps; standard maps use safe limit | sv_init.c:519 + cmodel.c:1302-1313 + bspfile.h:56-59 | `(sv_extlimits.value == 2 && sv_bspversion.value < 2)` -> clamp; CM_OpenMap sets `Cvar_SetROM(&sv_bspversion,"1")` for `Q1_BSPVERSION`(29)/`HL_BSPVERSION`(30) and `"2"` for `Q1_BSPVERSION2`("BSP2")/`Q1_BSPVERSION29a`("2PSB") | MATCH (bspversion<2 == standard Q1/HL -> clamp to safe; bspversion>=2 == BSP2 family -> extended allowed) |
| 6 | Side-effect: clients lacking extended-limit support may see entities/projectiles go invisible when server is above safe limit | sv_user.c:355-364 | `if (sv.max_edicts > 512 && !(sv_client->fteprotocolextensions & FTE_PEXT_ENTITYDBL)) { SV_ClientPrintf(... "some enemies/projectiles\n  may be invisible to you." ...); }` | MATCH (gate `> 512` == above safe limit; warning text matches the described side-effect; "lacks FTE_PEXT_ENTITYDBL" == "does not support the extended entity limit") |
| 7 | Default: 2 | sv_main.c:202 (registered), 3578 (Cvar_Register) | `cvar_t sv_extlimits = { "sv_extlimits", "2" };` ; `Cvar_Register (&sv_extlimits);` | MATCH (registered default literal "2") |
| 8 | Set by: server config | sv_main.c:202, 3578 | `cvar_t sv_extlimits = { "sv_extlimits", "2" };` -- no flags field (no CVAR_ROM / CVAR_SERVERINFO); plain `Cvar_Register` | MATCH (ordinary settable server-side cvar, no settability restriction) |

**V-pass notes:** Oracle version confirmed 1.11-53-g18d0362. Wide-grep of /src found exactly 3 sv_extlimits use-sites: registration (sv_main.c:202), Cvar_Register (sv_main.c:3578), and the single enforcing branch (sv_init.c:519). Exhaustive -- no serverinfo-advertise read, no other consumer.

The whole behavior reduces to ONE enforcing line (sv_init.c:519-521): a downward clamp `sv.max_edicts = min(sv.max_edicts, MAX_EDICTS_SAFE)` that fires only when value==0 OR (value==2 && standard-format map). The polarity is the subtle part and the description gets it right: the cvar does NOT raise a cap; the progs/mod loader (PR1 pr_edict.c:1255 -> 2048, or PR2 pr2_exec.c:614-619 -> 2048 or mod-requested) raises it first, then sv_extlimits decides whether to pull it back to the 512 safe floor. Value 1 = never clamp; value 0 = always clamp; value 2 = clamp only on non-BSP2 maps.

Every material clause maps to a located, verified enforcing line including adjacent comments (MAX_EDICTS_SAFE's "make sure no client limits exceeded" comment, and the verbatim invisibility warning at sv_user.c:355-364). Thresholds (0/1/2), BSP2 scope (sv_bspversion>=2 set from BSP2/2PSB magics in cmodel.c), default (registered "2"), settability (no ROM flag), and the invisible-projectiles side-effect (gated on >512 == above safe) all MATCH.

One traceable nuance, NOT a defect: at value 1 the effective ceiling is still whatever the progs loader set -- for an old-API (<14) PR2 mod that is 512 (pr2_exec.c:619), so "always allow extended on any map" yields no extra entities there. But that ceiling comes from the mod path, not from sv_extlimits (which genuinely declines to clamp). The description's "a map and mod can use" framing already accounts for the mod dimension and never claims value 1 forces 2048 regardless of mod, so the real code is not narrower than the text implies -- does not meet the C-NEAR-MISS bar. No clause is name/enum/string-inferred. Classification: TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] The invisible-entities side-effect path (sv_user.c:354-365), the BSP2-version detection that drives sv_bspversion (cmodel.c:1280,1305-1313), and the PR1 cap-raise (pr_edict.c) are all compiled under build-conditionals (#ifdef FTE_PEXT_ENTITYDBL, #ifndef CLIENTONLY). For the standard MVDSV server build these are active, but the description's side-effect clause silently depends on FTE_PEXT_ENTITYDBL being compiled in. Not a description defect (the cvar registration itself is unconditional and the standard build enables these), just noting the side-effect text is build-gated rather than always-present.
- [fyi/other/vpass] sv_extlimits=1 does not guarantee the extended (2048) cap: for an old-API PR2 mod (gamedata.APIversion < 14) the mod loader clamps sv.max_edicts to 512 at pr2_exec.c:619 BEFORE the sv_extlimits branch runs, so value 1 yields no extra entities on such a mod. The cap ceiling is mod-determined, not solely sv_extlimits-determined. The description's framing ('a map and mod can use') is consistent with this and not wrong, but a reader could over-read 'always allow the extended entity limit' as 'always 2048'. FYI for any future tightening, not a fix.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_extlimits",
  "type": "cvar",
  "description": "Controls whether the server allows the extended entity limit (a higher cap on the number of entities a map and mod can use) instead of the conservative safe limit.\n\n0 = always use the safe limit; never allow the extended entity count.\n1 = always allow the extended entity limit, on any map.\n2 = allow the extended entity limit only on maps in the newer (BSP2) format; standard maps use the safe limit.\n\nNote: clients that do not support the extended entity limit may see some entities or projectiles go invisible on a server running above the safe limit.\n\nDefault: 2.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_init.c:519. Single enforcing read-site src/sv_init.c:519-521: `if (sv_extlimits.value == 0 || (sv_extlimits.value == 2 && sv_bspversion.value < 2)) { sv.max_edicts = min(sv.max_edicts, MAX_EDICTS_SAFE); }`. POLARITY/THRESHOLD: value 0 -> always clamp; value 2 -> clamp only when sv_bspversion.value<2; value 1 (and any non-0/non-2) -> condition false, no clamp here, so the mod-provided higher limit stands. SAFE vs EXTENDED magnitudes: MAX_EDICTS_SAFE=512, MAX_EDICTS=2048 (src/bothdefs.h:52-53, comment 'lower limit, to make sure no client limits exceeded'). The higher value is set by the progs/VM loader before this clamp: PR2 path src/pr2_exec.c:614 `sv.max_edicts = MAX_EDICTS;` then min(gamedata.maxentities) for APIv>=14 else 512; default-path baseline src/sv_init.c:361 `sv.max_edicts = MAX_EDICTS_SAFE;`. BSP2 mapping: sv_bspversion is CVAR_ROM set by the engine at map load -- '1' for Q1_BSPVERSION/HL_BSPVERSION (src/cmodel.c:1306), '2' for Q1_BSPVERSION2/29a i.e. BSP2 (src/cmodel.c:1312); decl src/sv_main.c:189. So 'bspversion<2' == standard (non-BSP2) map. CLIENT-INVISIBILITY consequence traced to src/sv_user.c:355 `if (sv.max_edicts > 512 && !(sv_client->fteprotocolextensions & FTE_PEXT_ENTITYDBL))` -> warns the client that enemies/projectiles may be invisible; admin-observable, action-relevant, kept as a plain note (FTE_PEXT detail kept out of description). DEFAULT '2' verified at registration src/sv_main.c:202 `cvar_t sv_extlimits = { \"sv_extlimits\", \"2\" }`. Set-by: plain cvar (no CVAR_ROM/handler) -> server config.",
  "description_proposed": null
}
```
