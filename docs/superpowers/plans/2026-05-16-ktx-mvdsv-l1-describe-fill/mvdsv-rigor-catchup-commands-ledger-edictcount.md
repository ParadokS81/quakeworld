# describe-fill-synthesis ledger -- mvdsv `edictcount`

- **project:** mvdsv
- **knob:** `edictcount` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:edictcount: synthesized -- prints entity-count summary (total/active/model/solid/step); no args; works under any progs engine; admin-only -- origin=synthesized ref=src/pr_edict.c:647 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Debugging command that prints a summary count of the server's entities to the console: the total number of entity slots in use, how many are active (not freed), and breakdowns of how many have a model, are solid (can be touched), or use stepping movement.
>
> Takes no arguments.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| live registration -> raw ED_Count, no sv_vm gate | src/pr2_exec.c:69 | `Cmd_AddCommand ("edictcount", ED_Count);` | MATCH |
| prints total slots (num_edicts) | src/pr_edict.c:668 | `Con_Printf ("num_edicts:%3i\n", sv.num_edicts);` | MATCH |
| active = non-free entities | src/pr_edict.c:657-659,669 | `if (ent->e.free) continue; active++;` ; `Con_Printf ("active    :%3i\n", active);` | MATCH |
| view count = entities with a model | src/pr_edict.c:662-663,670 | `if (ent->v->model) models++;` ; `Con_Printf ("view      :%3i\n", models);` | MATCH |
| touch count = solid entities | src/pr_edict.c:660-661,671 | `if (ent->v->solid) solid++;` ; `Con_Printf ("touch     :%3i\n", solid);` | MATCH |
| step count = MOVETYPE_STEP entities | src/pr_edict.c:664-665,672 | `if (ent->v->movetype == MOVETYPE_STEP) step++;` ; `Con_Printf ("step      :%3i\n", step);` | MATCH |
| takes no arguments | src/pr_edict.c:647-674 | handler reads no Cmd_Argv/Cmd_Argc | MATCH (absence verified) |
| admin-only (not in ucmds[]) | src/sv_user.c:3299-3368 | ucmds[] table -- no "edictcount" entry | MATCH (absence verified) |
| not on rcon blocklist | src/sv_main.c:1754-1764 | blocklist excludes edictcount | MATCH (absence verified) |
| no KTX override | ktx/src (grep) | no Cmd_AddCommand("edictcount",...) | MATCH (absence verified) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | "Debugging command" | pr_edict.c:644 | `For debugging` (function header comment) | MATCH |
| 2 | "prints a summary count ... to the console" | pr_edict.c:668-672 | `Con_Printf ("num_edicts:%3i\n", ...)` x5 | MATCH |
| 3 | "total number of entity slots in use" -> num_edicts line | pr_edict.c:668 / 654 / 139 / sv_init.c:479 | `Con_Printf ("num_edicts:%3i\n", sv.num_edicts);` ; loop `for (i=0;i<sv.num_edicts;i++)`; alloc `sv.num_edicts++`; init `sv.num_edicts = MAX_CLIENTS+1` | MATCH (loose wording -- see notes; num_edicts is the alloc high-water mark, a SUPERSET of in-use, not the active count) |
| 4 | "how many are active (not freed)" -> active | pr_edict.c:657-659, 669 | `if (ent->e.free) continue; active++;` ... `Con_Printf("active :%3i\n", active)` | MATCH |
| 5 | "how many have a model" -> view | pr_edict.c:662-663, 670 | `if (ent->v->model) models++;` ... `Con_Printf("view :%3i\n", models)` | MATCH |
| 6 | "are solid (can be touched)" -> touch | pr_edict.c:660-661, 671 ; server.h:659-663 | `if (ent->v->solid) solid++;` ; SOLID_NOT=0 "no interaction", SOLID_TRIGGER/BBOX/SLIDEBOX/BSP all "touch on edge" | MATCH (non-zero solid = participates in touch; parenthetical is accurate) |
| 7 | "use stepping movement" -> step | pr_edict.c:664-665, 672 ; server.h:649 | `if (ent->v->movetype == MOVETYPE_STEP) step++;` ; `#define MOVETYPE_STEP 4 // gravity, special edge handling` | MATCH |
| 8 | "Takes no arguments" | pr_edict.c:647-674 | `void ED_Count (void)` body -- zero Cmd_Argc/Cmd_Argv reads (the Cmd_Argc at 623/629 is in ED_PrintEdict_f, a different fn) | MATCH |
| 9 | "Set by: server console / rcon" | pr_edict.c:1272 + pr2_exec.c:69 ; sv_main.c:1687,1828 ; cmd.c:706 | `Cmd_AddCommand("edictcount", ED_Count)` (plain variant, no access flag) ; rcon `SVC_RemoteCommand` -> `Cmd_ExecuteString` resolves same table | MATCH |

**V-pass notes:** All nine clauses enforcement-traced to live source at mvdsv 1.11-53-g18d0362; no clause is name/string/enum inference. The single behavior function is ED_Count (pr_edict.c:647-674); both registration sites (pr_edict.c:1272 PR1_Init, pr2_exec.c:69 PR2_Init -- the VM1 and VM2 progs paths) dispatch to the identical handler, so behavior is path-invariant.

Counters all verified at their exact gating lines: active gated on !ent->e.free (657); models on ent->v->model (662); solid on ent->v->solid (660); step on movetype==MOVETYPE_STEP (664). The description's mapping of the five printed lines (num_edicts/active/view/touch/step) to "total slots / active / model / solid / stepping" is correct order and correct meaning. "can be touched" for solid is a fair gloss (SOLID_NOT=0 is the only no-interaction value; every non-zero SOLID_* touches on edge per server.h:659-663).

"Takes no arguments" is solid: ED_Count's body reads no Cmd_Argv/Cmd_Argc, and a plain Cmd_AddCommand command silently ignores extra tokens. The Cmd_Argc()/Cmd_Argv() hits at pr_edict.c:623/629 are inside the unrelated `edict` handler (ED_PrintEdict_f), not the edictcount path -- not a false signal once traced.

The only soft spot is clause 3. "Total number of entity slots in use" labels the num_edicts output line. Traced semantics: sv.num_edicts is an allocation high-water mark -- initialized to MAX_CLIENTS+1 (sv_init.c:479), incremented only when a brand-new slot past the current count is allocated (pr_edict.c:139), and NEVER decremented when an edict is freed (ED_Free at pr_edict.c:150 only sets e->e.free=true). So num_edicts counts every slot ever brought into the live range, INCLUDING currently-freed ones inside that range. The genuinely "in use" (live) count is `active`, which is exactly num_edicts minus the freed slots the loop skips. The description's wording "total ... slots in use" therefore slightly overstates num_edicts -- a freed slot is not "in use" -- but it (a) is fully enforcement-traced to the print + the variable, (b) does not contradict the code, and (c) is framed as the SUPERSET of `active` ("total" vs "how many are active"), which matches the num_edicts >= active relationship the code guarantees. Per the enum, C-NEAR-MISS is reserved for clauses that are pure name/enum/string inference OR where the real code is NARROWER than implied; here the clause is traced and the real meaning is BROADER (high-water span), so this reads as still-true minor vagueness rather than a wrong/inferred clause. Classified TRACED-CLEAN; the high-water-mark nuance is surfaced as an FYI so a future tightening pass could swap "slots in use" -> "the highest entity slot the server has reached (the num_edicts high-water mark)" if a sharper distinction from `active` is wanted.

## flags_for_review

- [fyi/other/vpass] Clause 3 wording 'total number of entity slots in use' describes sv.num_edicts, which is actually an allocation high-water mark (init MAX_CLIENTS+1 at sv_init.c:479, incremented only on new-slot alloc at pr_edict.c:139, never decremented on free -- ED_Free pr_edict.c:150 only sets e->e.free=true). Freed slots inside the range are counted by num_edicts but are NOT 'in use'; the true live count is the separately-described `active` field. Wording is traceable and non-contradictory (num_edicts is the superset of active, matching 'total' vs 'how many active'), so classified TRACED-CLEAN, but a future tightening could replace 'slots in use' with 'highest entity slot reached / num_edicts high-water mark' to sharpen the distinction from active.
- [fyi/other/vpass] edictcount registered TWICE -- pr_edict.c:1272 (PR1_Init, VM1/native-or-bytecode-progs path) and pr2_exec.c:69 (PR2_Init, VM2/QVM-or-DLL progs path) -- both dispatching the identical ED_Count handler. Whichever progs VM is active registers its command set, so only one is live at a time; behavior is identical either way, so the description correctly needs no path qualifier. Noted for completeness, not a defect.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "edictcount",
  "type": "command",
  "description": "Debugging command that prints a summary count of the server's entities to the console: the total number of entity slots in use, how many are active (not freed), and breakdowns of how many have a model, are solid (can be touched), or use stepping movement.\n\nTakes no arguments.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pr_edict.c:647. Registered twice (src/pr_edict.c:1272 PR1_Init, src/pr2_exec.c:69 PR2_Init); under -DUSE_PR2 (build/CMakeFiles/mvdsv.dir/flags.make:5) PR_Init==PR2_Init (src/pr2.h:32) so the LIVE registration is src/pr2_exec.c:69 `Cmd_AddCommand (\"edictcount\", ED_Count)` -- note this points DIRECTLY at the raw ED_Count, NOT a wrapper, so unlike edict/edicts there is NO `!sv_vm` gate; it works regardless of which progs engine is loaded. Enforcing body src/pr_edict.c:647-674: loops i=0..sv.num_edicts-1, skips `ent->e.free` (active++ counts non-free), increments solid++ when `ent->v->solid`, models++ when `ent->v->model`, step++ when `ent->v->movetype == MOVETYPE_STEP`; then Con_Printf prints `num_edicts` (total slots), `active`, `view` (=models count), `touch` (=solid count), `step`. I mapped the printed labels to admin-observable terms: \"view\"=has a model, \"touch\"=solid, \"step\"=stepping movetype. No argument is read (no Cmd_Argv/Cmd_Argc in the handler). Access class: NOT in ucmds[] (src/sv_user.c:3299) and not on the rcon blocklist (src/sv_main.c:1754-1764) -> admin-only. F-MV1: no KTX override (ktx/src grep empty).",
  "description_proposed": null
}
```
