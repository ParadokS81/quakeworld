# describe-fill-synthesis ledger -- mvdsv `sv_pr2references`

- **project:** mvdsv
- **knob:** `sv_pr2references` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_pr2references: synthesized -- mod-declared entity-string ABI selector (indirection table for 64-bit vs direct/legacy); engine zeroes it every progs load (pr2_exec.c:577) then reads the mod's GAME_INIT-set value at pr2_exec.c:602, so admin config does not persist -- origin=synthesized ref=src/pr2_exec.c:602 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Selects how the game module and the server exchange text fields (such as entity strings) at the internal level: either through an indirection table (required only by 64-bit native game modules, i.e. compiled .so/.dll mods; QVM mods such as KTX do not need it) or as direct values (legacy mode). The game module itself sets this when it loads to declare which form it uses; the server resets the value every time the game code is loaded, so setting it manually in a server config has no lasting effect.
>
> 1 = use the indirection-table form (required by 64-bit native mods).
> 0 = use the direct/legacy form.
>
> Default: 0.
> Set by: the game mod at load time (a value set manually by an admin is reset on each game-code load).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| cvar value (with API>=15) sets engine references flag | src/pr2_exec.c:602 | `sv_vm->pr2_references = gamedata.APIversion >= 15 && (int)sv_pr2references.value;` | MATCH |
| ON -> entity strings via indirection table (read) | src/pr2_exec.c:149,167 | `if (sv_vm->pr2_references) { ... PR2_EntityStringLocation(...) ... }` | MATCH |
| ON -> entity strings via indirection table (write) | src/pr2_cmds.c:107,124 | `if (sv_vm->pr2_references) { ... PR2_EntityStringLocation(...) ... }` | MATCH |
| OFF -> direct pointer/offset | src/pr2_exec.c:156-158, src/pr2_cmds.c:115-117 | `else { return (char *) (num); }` / `else if (target) { *target = (string_t)s; }` | MATCH |
| required for 64-bit native progs | src/pr2_exec.c:604-605 | `if (sv_vm->type == VMI_NATIVE && (!sv_vm->pr2_references || gamedata.APIversion < 15)) SV_Error(...)` | MATCH |
| reset to 0 on every game-code load (admin set wiped) | src/pr2_exec.c:577 | `Cvar_SetValue(&sv_pr2references, 0.0f)` | MATCH |
| PR2_InitProg runs on every server spawn | src/sv_init.c:390 | `PR_InitProg();` (= PR2_InitProg) | MATCH |
| mod sets it during GAME_INIT (the only code between reset and read) | src/pr2_exec.c:587 | `VM_Call(sv_vm, 2, GAME_INIT, ...)` | MATCH |
| KTX (mod) sets it to 1 in GAME_INIT | ktx src/g_main.c:138 | `cvar_fset("sv_pr2references", 1);` | MATCH (cross-mod) |
| default 0 | src/pr2_exec.c:36 | `cvar_t sv_pr2references = {"sv_pr2references", "0"}` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Selects how mod/server exchange text fields (entity strings) at internal level: indirection table vs direct values (legacy) | src/pr2_exec.c:36 (decl comment); :117-124 (PR2_EntityStringLocation); :147-170 (PR2_GetEntityString); src/pr2_cmds.c:95-139 (PR2_SetEntityString_model) | `// 0 = standard, 1 = pr2 mods set string_t fields as byte offsets to location of actual strings` ; `if (offset > 0 && offset < pr_edict_size * sv.max_edicts - max_size) return ((intptr_t)sv.game_edicts + offset);` ; refs-on: `char** location = PR2_EntityStringLocation(num,...); return *location;` vs refs-off: `return (char *)(num);` | MATCH |
| 2 | "indirection table (required for 64-bit game modules)" | src/pr2_exec.c:603-606 (`#ifdef idx64`); :155 / src/pr2_cmds.c:114 (`#ifndef idx64` direct path); src/q_platform.h:79-82 (idx64=1 on WIN64) | `if (sv_vm->type == VMI_NATIVE && (!sv_vm->pr2_references || gamedata.APIversion < 15)) SV_Error("...Native prog must support sv_pr2references for 64bit mode...")` | MISMATCH (narrower: the SV_Error gate is `VMI_NATIVE`-ONLY; the direct-path compile-out is inside `case VMI_NATIVE` only; 64-bit QVM/.qvm mods at lines 163-170 / 120-135 have NO idx64 guard and run fine with the value at 0. Requirement is 64-bit NATIVE modules, not all 64-bit modules.) |
| 3 | Game module sets this when it loads to declare which form it uses | src/pr2_exec.c:577 then :587 then :602; src/pr2_cmds.c:2653-2655 (G_CVAR_SET trap) | `Cvar_SetValue(&sv_pr2references, 0.0f);` ... `VM_Call(sv_vm, 2, GAME_INIT, ...)` ... `sv_vm->pr2_references = gamedata.APIversion >= 15 && (int)sv_pr2references.value;` ; trap: `case G_CVAR_SET: Cvar_SetByName(VMA(1), VMA(2));` | MATCH (cvar wiped to 0 immediately before GAME_INIT; the only way it is nonzero when read at :602 is the mod setting it during GAME_INIT via the writable G_CVAR_SET trap) |
| 4 | Server resets value every time game code is loaded; manual config set has no lasting effect | src/pr2_exec.c:571,577 (top of PR2_InitProg) | `void PR2_InitProg(void) { ... Cvar_SetValue(&sv_pr2references, 0.0f);` | MATCH |
| 5a | 1 = indirection-table form (64-bit-safe) | src/pr2_exec.c:602 + consumers :149,:167, pr2_cmds.c:107,:124 | `sv_vm->pr2_references = ... && (int)sv_pr2references.value;` then `if (sv_vm->pr2_references) { ... PR2_EntityStringLocation ... }` | MATCH (any nonzero int enables it; "1" is canonical) |
| 5b | 0 = direct/legacy form | src/pr2_exec.c:155-158 (`#ifndef idx64 else return (char*)(num);`), pr2_cmds.c:114-117 | `else { return (char *) (num); }` ; `else if (target) { *target = (string_t)s; }` | MATCH |
| 6 | Default: 0 | src/pr2_exec.c:36 (registered default via :50 Cvar_Register); also runtime-forced at :577 | `cvar_t sv_pr2references = {"sv_pr2references", "0"};` | MATCH (registered default string "0"; flags field 0 => not CVAR_ROM) |
| 7 | Set by: game mod at load time; admin manual value reset on each game-code load | src/pr2_exec.c:577,602 + pr2_cmds.c:2653 (re-asserts clauses 3+4) | (see rows 3-4) | MATCH |

**V-pass notes:** CLASSIFICATION: C-NEAR-MISS. Six of seven clauses trace exactly to their enforcing lines; the mechanism, polarity, default, reset side-effect, and mod-sets-at-load handshake are all correct and well-traced.

The one defect (clause 2): "indirection table (required for 64-bit game modules)" OVER-GENERALIZES the enforcing condition. The SV_Error that makes references mandatory on 64-bit (pr2_exec.c:603-606) is gated on `sv_vm->type == VMI_NATIVE` ONLY. The compile-out of the direct/legacy path (`#ifndef idx64` at pr2_exec.c:155 and pr2_cmds.c:114) also lives strictly inside `case VMI_NATIVE`. A 64-bit QVM module (VMI_BYTECODE / VMI_COMPILED -- the .qvm form, which is how KTX ships) hits the unguarded paths at pr2_exec.c:163-170 and pr2_cmds.c:120-135 and runs correctly with the value at 0. So the requirement is "64-bit NATIVE (.so/.dll) modules," strictly narrower than "64-bit game modules." An admin running a 64-bit QVM mod could be misled into thinking the indirection table is mandatory when it is not. Per the V-pass enum this is C-NEAR-MISS ("the real code is narrower / more conditional than implied"), not a flat contradiction (the indirection table IS 64-bit-safe and IS required for the native case, so the clause is not wrong, just imprecise). Suggested fix: "required for 64-bit native (.so/.dll) game modules" or "required for 64-bit native game modules; 64-bit QVM mods may use either form."

The mod-sets-at-load mechanism (clause 3) deserves a note on how it was verified, since the line that reads the cvar (:602) is `(int)sv_pr2references.value`, not an obvious mod-write: the cvar is force-reset to 0 at :577 immediately before GAME_INIT (:587) and read at :602 after. The cvar carries no CVAR_ROM flag (struct flags field defaults to 0) and the G_CVAR_SET trap (pr2_cmds.c:2653 -> Cvar_SetByName -> Cvar_Set, no ROM filtering) is writable, so the mod setting it inside GAME_INIT is the only coherent source of a nonzero value at :602. The reset-before-init pattern is precisely the engine/mod handshake the description describes. Confirmed MATCH.

Wide-read complete: only 6 textual references to `sv_pr2references` exist in the tree, all in pr2_exec.c (decl :36, register :50, extern :573, reset :577, read :602, error :605). The derived field `sv_vm->pr2_references` has all consumers traced (pr2_cmds.c:107,124; pr2_exec.c:149,167,487,602,604). No off-file enforcement, no other reader, no help/info display path.

## flags_for_review

- [review/cross-mod-override/synthesis] sv_pr2references is registered as a plain admin-settable cvar (src/pr2_exec.c:36, default 0) but is NOT admin-controllable in practice: the engine unconditionally resets it to 0 at the top of PR2_InitProg (src/pr2_exec.c:577) on every progs load, and the effective value is set by the game MOD during GAME_INIT. KTX writes it cross-mod at ktx src/g_main.c:138 (`cvar_fset("sv_pr2references", 1)` under idx64/PR_ALWAYS_REFS). This is a cross-mod WRITE (mod sets engine cvar to declare a capability) -- the inverse of the usual KTX-reads-engine pattern. Worth a human look so the L3 note frames it as a mod/build capability flag, not a server-admin tuning knob; an admin who sets it in config will see it silently revert.
- [fyi/runtime-dead-suspect/vpass] pr2_exec.c:602 gates on `gamedata.APIversion >= 15`, and the error at :604 references `gamedata.APIversion < 15` -- but this build's GAME_API_VERSION_MIN and GAME_API_VERSION are BOTH 16 (g_public.h:33, pr2_exec.c:520), and PR2_InitProg:593-600 SV_Errors out any mod whose APIversion != 16 BEFORE reaching :602. So the `>= 15` / `< 15` thresholds are effectively dead on this build (always true / always false for any mod that survives the load check). Benign upstream legacy slack from an older API-version era; not a description defect (the description never mentions API 15). FYI only.
- [fyi/other/vpass] PR2_SetEntityString (pr2_exec.c:182-188) is a stub: for the sv_vm case it does nothing (only handles the !sv_vm PR1 fallback). The functional entity-string setter under PR2 is PR2_SetEntityString_model in pr2_cmds.c:95 (the one that actually branches on pr2_references). Not in scope for this knob's clauses, but noting the same-named function split in case a sibling cvar/field trace lands on the wrong one.
- [review/cross-mod-override/vpass] The clause-2 narrowing (native-only requirement) is the cross-mod-relevant fact: KTX (the dominant mvdsv mod) ships as a .qvm (QVM/bytecode), so on a 64-bit server KTX does NOT require sv_pr2references=1 -- the indirection table is mandatory only for the rarer native .so/.dll mods. Worth surfacing because the practical reader of this cvar's doc is a server admin who is almost always running a QVM mod, for whom the 'required for 64-bit' framing is misleading.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_pr2references",
  "type": "cvar",
  "description": "Selects how the game module and the server exchange text fields (such as entity strings) at the internal level: either through an indirection table (required only by 64-bit native game modules, i.e. compiled .so/.dll mods; QVM mods such as KTX do not need it) or as direct values (legacy mode). The game module itself sets this when it loads to declare which form it uses; the server resets the value every time the game code is loaded, so setting it manually in a server config has no lasting effect.\n\n1 = use the indirection-table form (required by 64-bit native mods).\n0 = use the direct/legacy form.\n\nDefault: 0.\nSet by: the game mod at load time (a value set manually by an admin is reset on each game-code load).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pr2_exec.c:602. Progs/VM ABI-selection knob, effectively mod-declared rather than admin-set. Registered at src/pr2_exec.c:36 (`cvar_t sv_pr2references = {\"sv_pr2references\", \"0\"}`), plain cvar, default 0. Enforcing read at src/pr2_exec.c:602: `sv_vm->pr2_references = gamedata.APIversion >= 15 && (int)sv_pr2references.value;` -- the cvar value (AND mod API version >= 15) sets the engine's `pr2_references` flag. That flag selects the string-field representation: ON -> entity string fields go through an indirection table (`PR2_EntityStringLocation`) at src/pr2_exec.c:149,167 (string read) and src/pr2_cmds.c:107,124 (string write); OFF -> the field holds the pointer/offset directly (src/pr2_exec.c:156-158, src/pr2_cmds.c:115-117,131-132). The '64-bit required' clause is enforced at src/pr2_exec.c:604-605: `if (sv_vm->type == VMI_NATIVE && (!sv_vm->pr2_references || gamedata.APIversion < 15)) SV_Error(\"... Native prog must support sv_pr2references for 64bit mode ...\")` (under #ifdef idx64). The 'reset every game-code load / admin set has no lasting effect' clause is enforced at src/pr2_exec.c:577: `Cvar_SetValue(&sv_pr2references, 0.0f)` at the very top of PR2_InitProg (called on every server spawn via src/sv_init.c:390 PR_InitProg); the only thing that runs between this reset and the :602 read is the GAME_INIT VM call at src/pr2_exec.c:587, so the effective value is whatever the MOD sets during GAME_INIT. Cross-mod confirmation: KTX sets it from inside GAME_INIT at ktx src/g_main.c:138 (`cvar_fset(\"sv_pr2references\", 1)` under `#if defined(idx64) || defined(PR_ALWAYS_REFS)`, comment 'We set references'). Mechanism-only per D8; no recommended value. Default 0 from registration literal.",
  "description_proposed": null
}
```
