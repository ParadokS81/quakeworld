# describe-fill-synthesis ledger -- mvdsv `qws_name`

- **project:** mvdsv
- **knob:** `qws_name` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `version-build-identity` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qws_name: synthesized -- read-only engine short-name identity string "MVDSV", no engine reader (exposed-by-design), KTX reads for MOTD -- origin=synthesized ref=src/sv_main.c:3414 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Read-only identity string holding the server engine's short name ("MVDSV"). It identifies which engine the server is running; a server admin cannot change it.
>
> Default: MVDSV (fixed at compile time).
> Set by: engine, at compile time -- read-only, cannot be changed by config or rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| holds short engine name "MVDSV" | src/sv_main.c:3414 + src/version.h:68 | `qws_name = { "qws_name", SERVER_NAME, CVAR_ROM }` ; `#define SERVER_NAME "MVDSV"` | MATCH |
| read-only, admin cannot change | src/cvar.c:134-135 | `if (var->flags & CVAR_ROM)` / `return;` | MATCH |
| no engine behavioral reader (identity only) | (tree-wide grep) | no `qws_name.value`/`.string`/`Cvar_String("qws_name")` in mvdsv/src | MATCH |
| not in serverinfo | src/sv_main.c:3414 | flag is CVAR_ROM, no CVAR_SERVERINFO | MATCH |
| KTX reads (not writes) for MOTD | ktx/src/motd.c:77-81 | `cvar_string("qws_name")` in MOTD build | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | Read-only string cvar | src/sv_main.c:3414 ; src/cvar.h:63 ; src/cvar.c:134-135 | `static cvar_t qws_name = { "qws_name", SERVER_NAME, CVAR_ROM };` / `#define CVAR_ROM (1<<1) // read only` / `if (var->flags & CVAR_ROM) return;` | MATCH |
| 2 | Holds engine short name "MVDSV" | src/version.h:68 ; src/sv_main.c:3414 | `#define SERVER_NAME "MVDSV"` (used as qws_name's default value) | MATCH |
| 3 | "Advertises which engine the server is running" (purpose/visibility) | src/sv_main.c:3413 (comment) ; src/cvar.c:564-565 (cvarlist/cvardump) ; src/cvar.c:294 (print branch) ; cvar.h:62 (NOT CVAR_SERVERINFO) | `// qws = QuakeWorld Server information` ; `Cmd_AddCommand("cvarlist", Cvar_CvarList_f);` ; `Con_Printf ("\"%s\" is \"%s\"\n", v->name, v->string);` | MATCH (minor imprecision: queryable server-info cvar holding the engine name, but NOT CVAR_SERVERINFO so it is not auto-mirrored/broadcast to connecting clients -- "advertises" slightly overstates the push-visibility) |
| 4 | Default MVDSV, fixed at compile time | src/version.h:68 ; src/sv_main.c:3414,3592-3595 | `#define SERVER_NAME "MVDSV"` ; qws_name's `.string` is never reassigned at runtime (contrast qws_buildnum: `if (GIT_COMMIT[0]) { qws_buildnum.string = GIT_COMMIT; }`) | MATCH |
| 5 | Set by engine at compile time | src/sv_main.c:3414 ; src/sv_main.c:3589 | initializer literal `SERVER_NAME` ; `Cvar_Register(&qws_name);` (no value override) | MATCH |
| 6 | Cannot be changed by config or rcon (admin cannot change) | src/cvar.c:306 (Cvar_Command->Cvar_Set) ; src/cvar.c:497 (Cvar_Set_f->Cvar_Set) ; src/cvar.c:134-135 (ROM block) ; only bypass Cvar_SetROM cvar.c:168 unused for qws_name | console: `Cvar_Set (v, string);` ; `set`: `Cvar_Set (var, Cmd_Argv(2));` ; both hit `if (var->flags & CVAR_ROM) return;` | MATCH |

**V-pass notes:** Version confirmed 1.11-53-g18d0362. qws_name has exactly TWO use-sites in the whole tree: declaration (sv_main.c:3414) and Cvar_Register (sv_main.c:3589). ZERO runtime read-sites inside MVDSV itself (it is a passive server-info cvar). The qwm_name reads in sv_init.c:424 and sv_broadcast.c:622 are the MOD family (qwm_*, populated by KTX at runtime), a DIFFERENT cvar -- not qws_name; the sv_mod_frags.c "qwm_static" hits are an unrelated local var (substring false positive).

Read-only enforcement is genuine and fully traced, not just declared: CVAR_ROM (1<<1) gates Cvar_Set at cvar.c:134-135 with an early `return`. BOTH external write paths funnel through Cvar_Set -- the console/direct path (Cvar_Command cvar.c:306) and the DP_CON_SET `set`/`seta` path (Cvar_Set_f cvar.c:497), which is the mechanism a server.cfg or an rcon-issued `set qws_name X` would use. The only function that can write a ROM cvar is Cvar_SetROM (cvar.c:168, temporarily clears the flag), and qws_name is never passed to it. So clauses 1/4/5/6 are structurally enforced. The print branch (Cvar_Command c==1, cvar.c:294) confirms ROM cvars remain READABLE -- consistent with "read-only."

Value is exactly "MVDSV" (SERVER_NAME, version.h:68). "Fixed at compile time" is precisely accurate for qws_name specifically: unlike its sibling qws_buildnum (reassigned from GIT_COMMIT at register time, sv_main.c:3592-3593), qws_name.string is never mutated.

Classification TRACED-CLEAN. Every material clause maps to a located, verified enforcing line incl. adjacent comments. The single soft spot is clause 3's "advertises": the cvar family comment is `// qws = QuakeWorld Server information` and the value IS the engine name and IS exposed (cvarlist/cvardump/print/rcon), so the claim is true at the purpose level and traceable -- but the cvar carries ONLY CVAR_ROM, NOT CVAR_SERVERINFO (cvar.h:62), so it is not auto-mirrored into serverinfo nor pushed to connecting clients the way `*version` is. That is still-true minor vagueness that was traceable, not a flavour-C clause inferred from the name with no enforcing site -- hence CLEAN rather than NEAR-MISS. Flagged below in case the operator wants clause 3 tightened from "advertises" to "queryable server-information variable."

## flags_for_review

- [fyi/cross-mod-override/synthesis] qws_name is read by KTX (the mod), not the MVDSV engine: ktx/src/motd.c:77-81 reads cvar_string("qws_name") to display the server engine name in the message-of-the-day. KTX does NOT write/override it. This is a benign cross-codebase identity-read consumer, recorded in reasoning per D20 (not action-changing for an admin since the cvar is read-only). Flagged for human visibility that the canonical consumer of these qws_ identity cvars is the mod's display path, not the engine.
- [fyi/other/vpass] Clause 3 ('It identifies which engine the server is running') is true at the purpose level and traceable to the family comment `// qws = QuakeWorld Server information` (sv_main.c:3413) plus the value being SERVER_NAME, and the cvar IS exposed via cvarlist/cvardump/print/rcon. But qws_name carries ONLY CVAR_ROM, NOT CVAR_SERVERINFO -- it is NOT auto-mirrored into serverinfo (cvar.c:157-160 only fires for CVAR_SERVERINFO) and is NOT broadcast to connecting clients the way the `*version` serverinfo key is. The same commit (1b79904) that ADDED these qws_* cvars REMOVED a serverinfo key (`Info_SetValueForStarKey(svs.info, "mvdsvver", ...)`), so the engine-identity advertisement deliberately moved from serverinfo to these queryable ROM cvars. 'Advertises' slightly overstates push-visibility; 'queryable server-information variable holding the engine name' would be tighter. Not a contradiction -- FYI only.
- [fyi/off-scope-entity/vpass] Possibly-off-scope but worth noting for sibling rows: qws_name and its siblings (qws_fullname/qws_version/qws_buildnum/qws_platform/qws_builddate/qws_homepage) have ZERO runtime read-sites inside MVDSV -- they are write-once-at-register, passive metadata cvars whose only consumers are generic cvar machinery (cvarlist/print/rcon query). qws_buildnum is the lone exception with a runtime reassignment (GIT_COMMIT, sv_main.c:3592-3593). If sibling qws_* rows assert any active behavior beyond 'readable metadata,' that would be a flavour-C risk. No action needed for qws_name.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_paused=C-FIX, serverdemo=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qws_name",
  "type": "cvar",
  "description": "Read-only identity string holding the server engine's short name (\"MVDSV\"). It identifies which engine the server is running; a server admin cannot change it.\n\nDefault: MVDSV (fixed at compile time).\nSet by: engine, at compile time -- read-only, cannot be changed by config or rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3414. Declared CVAR_ROM at src/sv_main.c:3414 `static cvar_t qws_name = { \"qws_name\", SERVER_NAME, CVAR_ROM };`; cvar_t struct field order (src/cvar.h:67-69 name/string/flags) confirms the positional initializer seeds string=SERVER_NAME, flags=CVAR_ROM. SERVER_NAME is the compile-time macro \"MVDSV\" (src/version.h:68). Read-only enforced at src/cvar.c:134-135 `if (var->flags & CVAR_ROM) return;` -- any Cvar_Set on it is a silent no-op, so an admin cannot change it. Registered at src/sv_main.c:3589. Tree-wide grep of mvdsv/src found NO engine read of qws_name.value/.string (only declaration+registration); this is an exposed-by-design identity cvar, not a behavior knob -- NOT dead. No CVAR_SERVERINFO flag, so not advertised in serverinfo. Cross-codebase (D20 -> reasoning, not action-changing): KTX READS (does not write) qws_name to render the MOTD server line (ktx/src/motd.c:77-81); benign display consumer, no override. Verdict synthesized not affirmed: source carries only the dev group-header comment `// qws = QuakeWorld Server information`, which is not a D20-shape user doc.",
  "description_proposed": null
}
```
