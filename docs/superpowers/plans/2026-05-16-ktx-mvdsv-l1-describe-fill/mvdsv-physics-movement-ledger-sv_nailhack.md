# describe-fill-synthesis ledger -- mvdsv `sv_nailhack`

- **project:** mvdsv
- **knob:** `sv_nailhack` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_nailhack: synthesized -- non-zero disables QW compact nail-packet encoding (nails sent as ordinary entities); auto-skipped under sv_bigcoords; default 1 = compact OFF -- origin=synthesized ref=src/sv_ents.c:44 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether nails and super-nails are sent to clients using QuakeWorld's compact nail-projectile packet format instead of as ordinary entities. When on, the compact nail format is disabled and nails are transmitted as regular entities; when off, nails in flight are batched into the dedicated low-bandwidth nail packet. The compact format is also automatically skipped while the server runs extended coordinates (sv_bigcoords), so this setting has no effect in that case.
>
> 0 = use the compact nail packet (lower bandwidth for nailgun fire).
> 1 = disable it; send nails as normal entities.
>
> Default: 1.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| non-zero disables compact format (nails sent as ordinary entities) | src/sv_ents.c:44-45 | `if ((int)sv_nailhack.value)\n\t\treturn false;` | MATCH |
| off (0) routes nails into the compact nail packet | src/sv_ents.c:56-58 | `nails[numnails] = ent; numnails++; return true;` (reached only when value==0) | MATCH |
| compact format auto-skipped under sv_bigcoords | src/sv_ents.c:50-51 | `if (msg_coordsize != 2)\n\t\treturn false; // Do not allow nailhack in case of sv_bigcoords.` | MATCH |
| compact packet = svc_nails/svc_nails2 | src/sv_ents.c:71-76; qwprot/src/protocol.h:220,231 | `MSG_WriteByte (msg, svc_nails2)` / `svc_nails 43` / `svc_nails2 54` | MATCH |
| Default 1 | src/sv_ents.c:37 | `cvar_t sv_nailhack = {"sv_nailhack", "1"};` | MATCH |
| no KTX override | ktx/src (grep) | (zero hits for 'nailhack') | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | Controls whether nails/super-nails use the compact nail-projectile packet vs ordinary entities | src/sv_ents.c:42-48 + src/sv_send.c:699-702 | `static qbool SV_AddNailUpdate (edict_t *ent)` ... `if (ent->v->modelindex != sv_nailmodel && ent->v->modelindex != sv_supernailmodel) return false;` ; `if (!strcmp(...,"progs/spike.mdl")) sv_nailmodel = i;` / `"progs/s_spike.mdl") sv_supernailmodel = i;` | MATCH (gate keyed exactly on nail + super-nail model indices) |
| 2 | Polarity: ON (1) => compact format disabled; nails sent as regular entities | src/sv_ents.c:44-45 + caller src/sv_ents.c:972-973 | `if ((int)sv_nailhack.value) return false;` ; caller: `if (SV_AddNailUpdate (ent)) continue; // added to the special update list` (false => falls through to packet_entities path lines 975-1040) | MATCH (truthy value => false return => entity packed as normal entity) |
| 3 | Polarity: OFF (0) => nails batched into dedicated low-bandwidth nail packet | src/sv_ents.c:53-58 + src/sv_ents.c:1049 + src/sv_ents.c:61-76 | `nails[numnails] = ent; numnails++; return true;` ; `SV_EmitNailUpdate (msg, recorder);` ; emit writes `svc_nails`/`svc_nails2` + 48-bit xyzpy per nail | MATCH (value 0 falls past line 44, nail added to nails[] array, emitted in compact packet) |
| 4 | Side-effect: compact format auto-skipped under sv_bigcoords (extended coords), no effect there | src/sv_ents.c:50-51 + src/sv_init.c:327-336 + src/sv_main.c:195 | `if (msg_coordsize != 2) return false; // Do not allow nailhack in case of sv_bigcoords.` ; `if (sv_bigcoords.value) { msg_coordsize = 4; ... } else { msg_coordsize = 2; ... }` ; `cvar_t sv_bigcoords = {"sv_bigcoords", "", CVAR_SERVERINFO};` | MATCH (bigcoords set => msg_coordsize=4 => unconditional false; adjacent comment names sv_bigcoords explicitly) |
| 5 | "0 = use the compact nail packet (lower bandwidth for nailgun fire)" | src/sv_ents.c:44-58 + src/sv_ents.c:61-108 | (value 0 path proceeds to nail batching; compact 6-byte-per-nail encoding vs full entity delta) | MATCH |
| 6 | "1 = disable it; send nails as normal entities" | src/sv_ents.c:44-45 + src/sv_ents.c:972-1040 | `if ((int)sv_nailhack.value) return false;` then caller packs into pack->entities | MATCH |
| 7 | Default: 1 | src/sv_ents.c:37 | `cvar_t sv_nailhack = {"sv_nailhack", "1"};` | MATCH (registered default literal "1") |
| 8 | Set by: server config | src/sv_ents.c:37 + src/sv_main.c:3476 | `cvar_t sv_nailhack = {"sv_nailhack", "1"};` (no CVAR_ flags) ; `Cvar_Register (&sv_nailhack);` | MATCH (plain server cvar, no ROM/SERVERINFO/USERINFO restriction) |

**V-pass notes:** VERSION CONFIRMED: git describe == "1.11-53-g18d0362".

Single registration (sv_ents.c:37, default "1", no CVAR flags) + single Cvar_Register (sv_main.c:3476). The ONLY read-site is sv_ents.c:44 inside SV_AddNailUpdate, the gating helper for the special nail-projectile network protocol (the "// because there can be a lot of nails, there is a special network protocol for them" block at sv_ents.c:28-29). Every clause traces to a located enforcing line and the adjacent comments confirm rather than invert the meaning.

Polarity (the highest-risk clause) is correctly stated and NON-obvious from the knob name: "nailhack" ON (=1, the default) DISABLES the compact nail packet. Verified via the full call chain, not just the read-site:
- sv_ents.c:44 `if ((int)sv_nailhack.value) return false;` -- truthy value => early false.
- Caller sv_ents.c:972 `if (SV_AddNailUpdate (ent)) continue;` -- a true return diverts the entity to the special nail list (skips normal packing); a false return falls through to the regular packet_entities emission (sv_ents.c:975-1040). So false-return (the ON/=1 case) => normal entity. numnails stays 0 => SV_EmitNailUpdate (sv_ents.c:1049) early-returns at sv_ents.c:68. This exactly matches "ON => disabled => regular entities" and "OFF => batched nail packet".

Model-gate precision: the compact path applies ONLY to progs/spike.mdl (sv_nailmodel) and progs/s_spike.mdl (sv_supernailmodel) per sv_send.c:699-702 -- so the description's "nails and super-nails" wording is exact, not loose.

bigcoords side-effect: sv_bigcoords default "" (value 0) => msg_coordsize=2 (sv_init.c:334), so the bigcoords skip does NOT fire by default. When sv_bigcoords is set, msg_coordsize=4 (sv_init.c:329) => sv_ents.c:50 returns false unconditionally and the compact format is suppressed regardless of sv_nailhack. The description's framing ("no effect in that case") is correct. Note the gate is technically on msg_coordsize (set at map init from sv_bigcoords), not a direct sv_bigcoords read -- but msg_coordsize's ONLY mutation points (sv_init.c:329/334) are driven solely by sv_bigcoords.value, and the source comment at sv_ents.c:51 itself names sv_bigcoords, so the description's attribution is faithful to the code's own framing.

No contradicting comment, no second read-site, no cross-mod override (this is a pure mvdsv server-side network cvar; not a KTX-readable value). PROC-1: the row reduces entirely to checkable facts; no embedded judgment call. All clauses MATCH.

## flags_for_review

- [fyi/other/synthesis] sv_nailhack default is 1, which DISABLES the compact nail-packet encoding -- the cvar name reads as 'enable a hack' but its default value turns the feature off (non-zero = compact format off). Polarity is correct per the enforcing line src/sv_ents.c:44 (return false when non-zero); flagging only because the name/default relationship is counter-intuitive and a downstream reader might assume default 1 means the packing is on.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_nailhack",
  "type": "cvar",
  "description": "Controls whether nails and super-nails are sent to clients using QuakeWorld's compact nail-projectile packet format instead of as ordinary entities. When on, the compact nail format is disabled and nails are transmitted as regular entities; when off, nails in flight are batched into the dedicated low-bandwidth nail packet. The compact format is also automatically skipped while the server runs extended coordinates (sv_bigcoords), so this setting has no effect in that case.\n\n0 = use the compact nail packet (lower bandwidth for nailgun fire).\n1 = disable it; send nails as normal entities.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ents.c:44. Enforcing read-site src/sv_ents.c:44 `if ((int)sv_nailhack.value) return false;` inside SV_AddNailUpdate (src/sv_ents.c:42-59): when non-zero the function returns false before appending the entity to nails[], so the entity is NOT collected for the compact nail message and falls through to ordinary entity delta encoding. When zero, execution continues and (subject to the model + msg_coordsize guards) the nail is added to nails[] for SV_EmitNailUpdate. Polarity (non-zero DISABLES the compact format) confirmed at the return-false branch -- note this inverts the intuitive reading of the cvar name 'nailhack', and default `1` (registration literal src/sv_ents.c:37 `{\"sv_nailhack\", \"1\"}`) means the compact path is OFF by default. The compact format is the dedicated nail packet svc_nails (protocol.h:220, 48-bit xyzpy packing) / svc_nails2 (protocol.h:231, 52-bit). bigcoords interaction: src/sv_ents.c:50-51 `if (msg_coordsize != 2) return false; // Do not allow nailhack in case of sv_bigcoords.` -- the model gate is src/sv_ents.c:47 (sv_nailmodel/sv_supernailmodel). Default verified against registration literal, not a shipped cfg (WI-2). F-MV1: grep of ktx/src for 'nailhack' returns zero hits -- no KTX override; the engine cvar governs entity encoding (not a movement mechanism despite the chunk name). source_ref is the enforcing read-site, not the registration site src/sv_ents.c:37.",
  "description_proposed": null
}
```
