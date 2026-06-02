# describe-fill-synthesis ledger -- mvdsv `maxvip_spectators`

- **project:** mvdsv
- **knob:** `maxvip_spectators` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:maxvip_spectators: synthesized -- engine-enforced reserved spectator pool for VIP-listed clients, additive to maxspectators; default 0 -- origin=synthesized ref=src/sv_main.c:1204 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Reserves a number of additional spectator slots for VIP spectators -- clients whose spectator password, password, or IP address is on the server's VIP list. VIPs can take a normal spectator slot, and when those are full they can still connect using this reserved pool. It also lets a client who connects in spectator-on-full mode be admitted as a VIP when a reserved slot is free. The combined total of players and all spectators is automatically capped at the engine maximum of 32.
>
> Default: 0 (no reserved VIP slots).
> Set by: server config.
> See also: maxspectators.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| VIP = on the server's VIP list (pass/IP) | src/sv_main.c:1041-1047 | `vip = SV_VIPbyPass(s)` ... `vip = SV_VIPbyIP(net_from)` | MATCH |
| reserved pool additional to normal spec slots | src/sv_main.c:1204 | `if (spass && (spectators < (int)maxspectators.value || vips < (int)maxvip_spectators.value)) return true;` | MATCH |
| spectator-on-full client promoted to VIP slot | src/sv_main.c:1347 | `if (spectator == 2 && !vip && vips < (int)maxvip_spectators.value) { vip = rip_vip = 1; }` | MATCH |
| 0 = no reserved VIP slots | src/sv_main.c:1204 | `vips < (int)maxvip_spectators.value` (0 -> always false) | MATCH |
| Default 0 | src/sv_main.c:165 | `maxvip_spectators = {"maxvip_spectators","0"/*,CVAR_SERVERINFO*/}` | MATCH |
| combined cap at engine max 32, auto-lowered | src/sv_main.c:956-957 | `if (...maxspectators.value + maxclients.value + maxvip_spectators.value > MAX_CLIENTS) Cvar_SetValue(&maxvip_spectators, ...)` | MATCH |
| not published in serverinfo (flag commented out) | src/sv_main.c:165 | `/*,CVAR_SERVERINFO*/` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet (verbatim) | Verdict |
|---|---|---|---|---|
| C1 | Reserves ADDITIONAL / RESERVED spectator slots usable only by VIPs | src/sv_main.c:1204 (VIP branch) + :1209 (non-VIP branch) | VIP: `if (spass && (spectators < (int)maxspectators.value \|\| vips < (int)maxvip_spectators.value)) return true;` ; non-VIP: `else { if (spass && spectators < (int)maxspectators.value) return true; }` | MATCH -- only the `vip` branch ORs in `vips < maxvip_spectators`; the non-VIP `else` branch checks `maxspectators` ONLY, so the pool is genuinely reserved for VIPs |
| C2 | VIP = client whose spectator-pass, password, OR IP is on the VIP list | src/sv_main.c:1042,1044,1046 (CheckPasswords) -> callees :2741 SV_VIPbyPass, :2722 SV_VIPbyIP | `if (!(vip = SV_VIPbyPass(s)))` [s = spectator-field value] `{ if (!(vip = SV_VIPbyPass(Info_ValueForKey(userinfo,"password")))) { vip = SV_VIPbyIP(net_from); } }` ; SV_VIPbyPass tokenizes `vip_password.string`; SV_VIPbyIP scans `ipvip[]` | MATCH -- all three sources, each matched against the VIP list (vip_password / ipvip), not against spectator_password |
| C3 | VIPs take a normal slot, and when those are full use the reserved pool | src/sv_main.c:1204 | `spass && (spectators < (int)maxspectators.value \|\| vips < (int)maxvip_spectators.value)` | MATCH -- OR semantics: a VIP is admitted while EITHER a normal spec slot OR a vip slot is free |
| C4 | Lets a spectator-on-full client be admitted as VIP when a reserved slot is free | src/sv_main.c:1347 (admission) + sv_user.c:267-277 (realip re-validation) | `if (spectator == 2 && !vip && vips < (int)maxvip_spectators.value) { vip = rip_vip = 1; // yet can be connected if realip is on vip list }` | MATCH (behavior) -- `spectator==2` client, only reached inside the server-full block (1333-1372), is admitted as provisional VIP if a reserved slot is free; later validated against real IP (sv_user.c:269) and dropped if not genuinely VIP. "spectator-on-full mode" is a coined gloss for the spectator==2 feature, not a code name -- still-true, see flag |
| C5 | Players + ALL spectators auto-capped at engine max 32 | src/sv_main.c:956-957 + qwprot/src/protocol.h:469 | `if ((int)maxspectators.value + maxclients.value + maxvip_spectators.value > MAX_CLIENTS) Cvar_SetValue(&maxvip_spectators, MAX_CLIENTS - (int)maxclients.value - (int)maxspectators.value);` ; `#define MAX_CLIENTS 32` | MATCH -- clamp sums all three limit cvars (maxclients + maxspectators + maxvip_spectators) and trims maxvip_spectators so the sum <= 32 |
| C6 | Default: 0 | src/sv_main.c:165 | `cvar_t maxvip_spectators = {"maxvip_spectators","0"/*,CVAR_SERVERINFO*/};` | MATCH -- registered default "0" |
| C7 | Set by: server config | src/sv_main.c:165 (flags) ; :3496 registration | `{"maxvip_spectators","0"/*,CVAR_SERVERINFO*/}` -- no CVAR_ROM/locked flag; CVAR_SERVERINFO is commented out | MATCH -- plain settable cvar, no runtime-set restriction |
| C8 | See also: maxspectators | src/sv_main.c:164 (def) ; paired at 947-957, 1204, 1209 | `cvar_t maxspectators = {"maxspectators","8",CVAR_SERVERINFO};` | MATCH -- direct sibling: maxspectators is the non-VIP spec limit, clamped and read alongside maxvip_spectators at every site |

**V-pass notes:** VERDICT: TRACED-CLEAN. All 8 material clauses (semantics, scope, side-effects, threshold, default, access, cross-ref) map to located, verified enforcing lines including adjacent comments; callees followed (SV_VIPbyPass/SV_VIPbyIP for clause 2; sv_user.c realip re-validation for clause 4). No clause contradicts its enforcing line; no clause is name/string/enum inference without a read-site.

Trace highlights:
- Two enforcing read-sites: SpectatorCanConnect (sv_main.c:1198-1214) for normal VIP spectator admission, and the "SPECTATOR 2 FEATURE" block (sv_main.c:1347) for the spectator==2 fallback. Both gate on `vips < (int)maxvip_spectators.value`.
- The reserved-pool semantics (clause 1/C3) are real and verified by the asymmetry between the VIP branch (1204, ORs in the vip pool) and the non-VIP branch (1209, checks maxspectators only). A non-VIP spectator can NEVER consume a maxvip_spectators slot.
- Clause 2's three VIP sources are exactly the three SV_VIPby* calls in CheckPasswords. Note the matching list is `vip_password` (+ ipvip IP list), NOT `spectator_password` -- the description's "whose spectator password ... is on the server's VIP list" is accurate because it means the value the client submitted in the spectator field, matched against the VIP list via SV_VIPbyPass. Correct as written.
- Clause 5's "32" is MAX_CLIENTS (protocol.h:469) and the clamp (956-957) trims maxvip_spectators specifically (it is the lowest-priority of the three limits in the clamp order). Accurate.
- Metadata (WI-2): default "0" verified at the registration literal (165), NOT a shipped-cfg value. No CVAR_ROM/lock flag -> "Set by: server config" correct.

One soft spot, judged still-true (does not demote the row): clause 4's phrase "spectator-on-full mode" is a coined plain-English gloss for the `spectator==2` userinfo request (the source comment calls it the "SPECTATOR 2 FEATURE"). It is NOT the `sv_forcespec_onfull` cvar mechanism, which is a SEPARATE branch (1351-1361) handling non-spectator PLAYERS downgraded to spectator on a full server. The described behavior matches line 1347 exactly (spectator==2 client admitted as VIP from the reserved pool when full), so the clause is correct; the term just risks reader-confusion with the similarly-named sv_forcespec_onfull cvar. Flagged FYI below for optional disambiguation -- not a flavour-C defect (enforcing line exists and behavior matches).

## flags_for_review

- [fyi/other/vpass] Clause 4 names the spectator==2 path 'spectator-on-full mode'. This is a coined gloss for the source's 'SPECTATOR 2 FEATURE' (sv_main.c:1346-1350), correctly enforcement-traced to sv_main.c:1347. However the name is one letter from the SEPARATE cvar sv_forcespec_onfull (sv_main.c:142, enforced at sv_main.c:1351-1361), which handles non-spectator PLAYERS being downgraded to spectator on a full server via the SVF_SPEC_ONFULL / SVF_NO_SPEC_ONFULL userinfo flags -- an unrelated mechanism that does NOT touch maxvip_spectators. The description's behavior is accurate, but the operator may want to disambiguate the wording (e.g. 'a client who requested spectator slot "2"') to avoid conflation with sv_forcespec_onfull. No code contradiction; not flavour-C.
- [fyi/other/vpass] Provisional-VIP nuance (does not affect description correctness): the admission at sv_main.c:1347 sets vip=rip_vip=1 only PROVISIONALLY. sv_user.c:267-277 later re-checks SV_VIPbyIP(realip) and DROPS the client ('server is full') if the real IP is not genuinely on the VIP list (comment sv_user.c:265-266: 'rip_vip means that client can be connected if he has VIP for he's real ip / drop him if he hasn't'). The description says only 'be admitted as a VIP when a reserved slot is free', which is true at the admission step; the realip gate is a downstream anti-spoof implementation detail, not a contradiction. Mentioning only for completeness.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "maxvip_spectators",
  "type": "cvar",
  "description": "Reserves a number of additional spectator slots for VIP spectators -- clients whose spectator password, password, or IP address is on the server's VIP list. VIPs can take a normal spectator slot, and when those are full they can still connect using this reserved pool. It also lets a client who connects in spectator-on-full mode be admitted as a VIP when a reserved slot is free. The combined total of players and all spectators is automatically capped at the engine maximum of 32.\n\nDefault: 0 (no reserved VIP slots).\nSet by: server config.\nSee also: maxspectators.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:1204. Engine-enforced reserved-spectator pool for VIPs (engine-side, not mod-governed). Registration: src/sv_main.c:165 `maxvip_spectators = {\"maxvip_spectators\",\"0\"/*,CVAR_SERVERINFO*/}` -> default 0; CVAR_SERVERINFO is commented out so it is NOT published in serverinfo (omitted from prose; not action-changing). 'VIP' defined at CheckPasswords src/sv_main.c:1041-1047: vip = SV_VIPbyPass(spectator-pass) || SV_VIPbyPass(password) || SV_VIPbyIP(net_from). Enforcing read #1 (the extra pool): src/sv_main.c:1204 inside SpectatorCanConnect `if (vip) { if (spass && (spectators < (int)maxspectators.value || vips < (int)maxvip_spectators.value)) return true; }` -- a VIP is admitted while normal spectator slots remain OR while VIP slots remain, so maxvip_spectators is ADDITIONAL capacity on top of maxspectators. Enforcing read #2 (the 'spectator 2' on-full promotion): src/sv_main.c:1347 `if (spectator == 2 && !vip && vips < (int)maxvip_spectators.value) { vip = rip_vip = 1; }` -- a client who connected with `spectator 2` can be promoted into a VIP slot when the server is otherwise full (spectator==2 set in CheckPasswords from the userinfo 'spectator' value, src/sv_main.c:1067-1070). OFF-state: 0 -> `vips < 0` always false -> no reserved VIP capacity and no spectator-2 promotion. Auto-clamp / MAX_CLIENTS: FixMaxClientsCvars src/sv_main.c:950-951 caps to MAX_CLIENTS and :956-957 lowers it so maxclients+maxspectators+maxvip_spectators <= MAX_CLIENTS (=32, qwprot/src/protocol.h:469).",
  "description_proposed": null
}
```
