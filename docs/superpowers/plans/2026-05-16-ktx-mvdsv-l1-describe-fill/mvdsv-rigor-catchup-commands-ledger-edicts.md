# describe-fill-synthesis ledger -- mvdsv `edicts`

- **project:** mvdsv
- **knob:** `edicts` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:edicts: synthesized -- debug dump of all entities' fields (count + per-entity field dump); no args; output only under interpreted QC; admin-only -- origin=synthesized ref=src/pr2_edict.c:82 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Debugging command that dumps every field of every server entity to the console, prefixed by a total entity count. It is the all-entities version of the edict command and takes no arguments.
>
> Produces output only when the server is running interpreted QuakeC progs -- under a native or bytecode game module it does nothing.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| live handler is ED2_* wrapper (USE_PR2 build) | src/pr2.h:32 + build/CMakeFiles/mvdsv.dir/flags.make:5 | `#define PR_Init PR2_Init` ; `-DUSE_PR2` | MATCH |
| PR2_Init registers edicts->ED2_PrintEdicts | src/pr2_exec.c:68 | `Cmd_AddCommand ("edicts", ED2_PrintEdicts);` | MATCH |
| output only under interpreted QC (sv_vm NULL) | src/pr2_edict.c:86-87 | `if(!sv_vm) ED_PrintEdicts();` | MATCH |
| prints total entity count first | src/pr_edict.c:604 | `Con_Printf ("%i entities\n", sv.num_edicts);` | MATCH |
| dumps every entity's fields | src/pr_edict.c:605-609 | `for (i=0 ; i<sv.num_edicts ; i++) { Con_Printf ("\nEDICT %i:\n",i); ED_PrintNum (i); }` | MATCH |
| takes no arguments | src/pr_edict.c:600-610 | handler reads no Cmd_Argv/Cmd_Argc | MATCH (absence verified) |
| admin-only (not in ucmds[]) | src/sv_user.c:3299-3368 | ucmds[] table -- no "edicts" entry | MATCH (absence verified) |
| not on rcon blocklist | src/sv_main.c:1754-1764 | blocklist excludes edicts | MATCH (absence verified) |
| no KTX override | ktx/src (grep) | no Cmd_AddCommand("edicts",...) | MATCH (absence verified) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|------------------|---------|
| 1 | Dumps every field of every server entity to the console | src/pr_edict.c:600-609 (ED_PrintEdicts) -> src/pr_edict.c:588-591 (ED_PrintNum -> ED_Print) -> src/pr_edict.c:510-538 (ED_Print field loop) | `for (i=0 ; i<sv.num_edicts ; i++){ Con_Printf("\nEDICT %i:\n",i); ED_PrintNum(i); }` ; ED_Print: `for (i=1 ; i<progs->numfielddefs ; i++){...Con_Printf("%s",name);...Con_Printf("%s\n", PR_ValueString(...));}` | MATCH (precision: ED_Print skips all-zero-valued fields [pr_edict.c:522-529] and `_x/_y/_z` vector sub-components [pr_edict.c:514]; free edicts print "FREE" [pr_edict.c:504-508]. Iteration IS over the complete entity set and complete field-def set, so "every field of every entity" is accurate at user-doc altitude.) |
| 2 | Prefixed by a total entity count | src/pr_edict.c:604 | `Con_Printf ("%i entities\n", sv.num_edicts);` (emitted once, before the per-entity loop) | MATCH |
| 3 | All-entities version of the `edict` command | edict registration src/pr2_exec.c:67 -> ED2_PrintEdict_f src/pr2_edict.c:67-73 -> ED_PrintEdict_f src/pr_edict.c:619-637 | `Con_Printf ("\nUsage:\nedict [num]\n");` (the `edict` command prints ONE edict selected by a [num] arg; `edicts` prints all) | MATCH |
| 4 | Takes no arguments | src/pr_edict.c:600-610 (ED_PrintEdicts) and src/pr2_edict.c:82-88 (ED2_PrintEdicts) | (neither handler calls Cmd_Argc/Cmd_Argv; contrast ED_PrintEdict_f which does at pr_edict.c:623,629) | MATCH |
| 5 | Output only when running interpreted QuakeC progs | gate: src/pr2_edict.c:86; sv_vm-NULL path: src/pr2_exec.c:425-437 (PR2_LoadProgs) + src/vm.c:1293-1295 + src/vm.c:692-696 (VM_LoadQVM fails for VMI_NONE/no-qvm) | gate `if(!sv_vm) ED_PrintEdicts();` ; fallback `sv_vm = VM_Create(...,sv_progtype.value); if(sv_vm){;} else { PR1_LoadProgs(); }` ; `if(!header){ Con_Printf("Failed.\n"); VM_Free(vm); return NULL; }` | MATCH (sv_progtype default "0"=VMI_NONE [pr2_exec.c:33]; VM_Create returns NULL -> sv_vm stays NULL -> PR1 interpreted progs loaded -> gate true -> ED_PrintEdicts runs) |
| 6 | Under a native or bytecode game module it does nothing (OFF-state) | src/pr2_edict.c:86 (else branch = no-op) | `if(!sv_vm) ED_PrintEdicts();` -- when VM_Create succeeded (sv_progtype VMI_NATIVE=1 dll / VMI_BYTECODE=2 qvm / VMI_COMPILED=3), sv_vm != NULL, the `if` is false, no body executes | MATCH |
| 7 | Set by: server console / rcon | registration src/pr2_exec.c:68 (and dead src/pr_edict.c:1271) via plain Cmd_AddCommand; client-cmd absence verified in src/sv_user.c ucmd table (no edict entry); rcon dispatch src/sv_main.c:1701-1708 + src/sv_main.c:1828 | `Cmd_AddCommand ("edicts", ED2_PrintEdicts);` ; rcon: `Cmd_ExecuteString(str);` after `Rcon_Validate(...)` | MATCH (console command, not in client ucmd table; rcon executes arbitrary console commands via Cmd_ExecuteString) |

**V-pass notes:** VERDICT: TRACED-CLEAN. All 7 material clauses map to located, verified enforcing lines (incl. adjacent comments). Confirmed oracle == 1.11-53-g18d0362.

DISPATCH RESOLUTION (load-bearing, non-obvious): `edicts` has TWO Cmd_AddCommand registrations -- pr_edict.c:1271 (PR1_Init -> ED_PrintEdicts) and pr2_exec.c:68 (PR2_Init -> ED2_PrintEdicts). These are NOT both live. progs.h:250-256 and pr2.h:32 implement a compile-time switch: `#define PR_Init PR1_Init` (when !USE_PR2) vs `#define PR_Init PR2_Init` (when USE_PR2). The canonical build defines USE_PR2 (CMakeLists.txt:170, all MSVC configs), and sv_main.c:4049 calls the single `PR_Init()`, which resolves to PR2_Init. So the LIVE handler is ED2_PrintEdicts (pr2_edict.c:82); PR1_Init / the direct ED_PrintEdicts registration at pr_edict.c:1271 is dead under the shipped build. Cmd_AddCommand also rejects duplicate names (cmd.c:728 "already defined" -> return), so even if both Inits ran, only the first would bind -- but the macro makes only one compile in anyway. A naive reader citing pr_edict.c:1271 as the handler would be citing a dead line; the enforcing handler is the PR2 wrapper.

OFF-STATE TRACE (the flavour-C-risk clauses 5/6, fully chained): ED2_PrintEdicts gates on `if(!sv_vm)`. sv_vm (pr2_cmds.c:40, init NULL) is set by PR2_LoadProgs = VM_Create(...,sv_progtype.value); on NULL return it falls back to PR1_LoadProgs (interpreted QuakeC), leaving sv_vm NULL. Default sv_progtype="0"=VMI_NONE; with VMI_NONE, VM_Create skips the native block and calls VM_LoadQVM, which returns NULL when no <progsname>.qvm exists (vm.c:692-696) -> VM_Create NULL -> sv_vm NULL -> interpreted progs -> gate true -> ED_PrintEdicts runs. When sv_progtype is 1/2/3 and a dll/qvm loads, sv_vm != NULL -> gate false -> no-op. The description's "interpreted QuakeC -> output; native/bytecode -> nothing" is exactly the enforced semantics.

PRECISION NOTE (clause 1, not a defect): "every field of every server entity" is accurate in iteration scope (i=0..num_edicts; i=1..numfielddefs) but ED_Print applies two display filters -- all-zero-valued fields are skipped (pr_edict.c:522-529) and `_x/_y/_z` vector component pseudo-fields are skipped (pr_edict.c:514), and free slots print just "FREE". This is the standard id-Quake debug-dump idiom and does not contradict the description; at user-doc altitude "every field" reads fine. Flagged FYI only -- could optionally be softened to "every set field" but I do not consider it a near-miss since the loops genuinely cover the whole entity/field space and the filtering is presentational.

PROC-1: no judgment residue. Affirm-vs-synthesize not in scope for a V-pass; every residual reduced to a checkable fact at its enforcing line.

## flags_for_review

- [fyi/cross-mod-override/vpass] `edicts` is registered twice (pr_edict.c:1271 ED_PrintEdicts vs pr2_exec.c:68 ED2_PrintEdicts) but the two are mutually exclusive via a compile-time macro switch (#define PR_Init PR1_Init|PR2_Init in progs.h:256 / pr2.h:32). The shipped build defines USE_PR2 (CMakeLists.txt:170), so the LIVE handler is ED2_PrintEdicts; the pr_edict.c:1271 registration line is dead under the canonical build. Any downstream consumer or future re-synth that cites pr_edict.c:1271 as 'the handler' would be citing a dead line. Recording so the registration-site provenance for this knob points at pr2_exec.c:68 / pr2_edict.c:82, not pr_edict.c:1271.
- [fyi/other/vpass] ED_Print (pr_edict.c:510-538) does not literally print EVERY field: it skips fields whose value is all-zero (522-529) and `_x/_y/_z` vector sub-components (514); free edicts print 'FREE'. Description says 'every field of every server entity'. Iteration scope is genuinely complete (all entities, all field defs) so this is presentational filtering, not a scope error -- classified MATCH, flagged FYI in case a stricter wording ('every set field') is preferred.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "edicts",
  "type": "command",
  "description": "Debugging command that dumps every field of every server entity to the console, prefixed by a total entity count. It is the all-entities version of the edict command and takes no arguments.\n\nProduces output only when the server is running interpreted QuakeC progs -- under a native or bytecode game module it does nothing.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pr2_edict.c:82. Same TRAP-2 live-path resolution as `edict`: registered at src/pr_edict.c:1271 (PR1_Init, raw ED_PrintEdicts) and src/pr2_exec.c:68 (PR2_Init, wrapper ED2_PrintEdicts). Under -DUSE_PR2 (build/CMakeFiles/mvdsv.dir/flags.make:5) PR_Init==PR2_Init (src/pr2.h:32), so the LIVE handler is ED2_PrintEdicts (src/pr2_edict.c:82-88), gated `if(!sv_vm) ED_PrintEdicts();`. sv_vm NULL = interpreted QC (src/pr2_exec.c:427,429-436); set = native/bytecode -> wrapper is a no-op (admin-observable: nothing prints). Callee ED_PrintEdicts (src/pr_edict.c:600-610): `Con_Printf (\"%i entities\\n\", sv.num_edicts)` then `for (i=0; i<sv.num_edicts; i++) { Con_Printf(\"\\nEDICT %i:\\n\",i); ED_PrintNum (i); }` -- prints the count then a full field dump (ED_PrintNum, src/pr_edict.c:588) for every entity. No argument read. Access class: NOT in ucmds[] (src/sv_user.c:3299) and not on the rcon blocklist (src/sv_main.c:1754-1764) -> admin-only. F-MV1: no KTX override (ktx/src grep empty). Note: ED_PrintEdicts iterates ALL slots including freed ones (no `free` skip, unlike ED_Count) -- so it dumps every slot up to num_edicts; description says \"every server entity\" which matches the per-slot dump.",
  "description_proposed": null
}
```
