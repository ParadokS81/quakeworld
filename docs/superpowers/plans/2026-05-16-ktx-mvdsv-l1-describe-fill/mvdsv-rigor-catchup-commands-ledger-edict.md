# describe-fill-synthesis ledger -- mvdsv `edict`

- **project:** mvdsv
- **knob:** `edict` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:edict: synthesized -- debug dump of one entity's fields by slot number; usage/range-guarded; output only under interpreted QC; admin-only -- origin=synthesized ref=src/pr2_edict.c:67 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Debugging command that dumps every field of one server entity to the console. The argument is the entity's slot number; values run from 0 up to the current entity count.
>
> edict <num> = print all fields of entity <num>.
>
> With no argument (or a wrong number of arguments) it prints a usage line; an out-of-range slot prints "No such edict". Produces output only when the server is running interpreted QuakeC progs -- under a native or bytecode game module it does nothing.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| live handler is ED2_* wrapper (USE_PR2 build) | src/pr2.h:32 + build/CMakeFiles/mvdsv.dir/flags.make:5 | `#define PR_Init PR2_Init` ; `-DUSE_PR2` | MATCH |
| PR2_Init registers edict->ED2_PrintEdict_f | src/pr2_exec.c:67 | `Cmd_AddCommand ("edict", ED2_PrintEdict_f);` | MATCH |
| output only under interpreted QC (sv_vm NULL) | src/pr2_edict.c:71-72 | `if(!sv_vm) ED_PrintEdict_f();` | MATCH |
| sv_vm set for native/bytecode, NULL for interpreted | src/pr2_exec.c:427,429-436 | `sv_vm = VM_Create(...)` ; else `PR1_LoadProgs();` | MATCH |
| takes exactly one arg, else usage | src/pr_edict.c:623-626 | `if (Cmd_Argc () != 2) { Con_Printf ("...Usage:...edict [num]..."); return; }` | MATCH |
| out-of-range -> No such edict | src/pr_edict.c:630-633 | `if(i < 0 || i >= sv.num_edicts) { Con_Printf ("...No such edict: %i..."); return; }` | MATCH |
| prints all fields of the entity | src/pr_edict.c:636-637 | `Con_Printf ("...EDICT %i:..."); ED_PrintNum (i);` | MATCH |
| admin-only (not in ucmds[]) | src/sv_user.c:3299-3368 | ucmds[] table -- no "edict" entry | MATCH (absence verified) |
| not on rcon blocklist | src/sv_main.c:1754-1764 | blocklist excludes edict | MATCH (absence verified) |
| no KTX override | ktx/src (grep) | no Cmd_AddCommand("edict",...) | MATCH (absence verified) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Dumps every field of one server entity to console | src/pr_edict.c:510-538 (via ED2_PrintEdict_f -> ED_PrintEdict_f -> ED_PrintNum -> ED_Print) | `for (i=1 ; i<progs->numfielddefs ; i++) { ... // if the value is still all 0, skip the field ... if (j == type_size[type]) continue; ... Con_Printf ("%s\n", PR_ValueString(...)); }` | MATCH (minor: skips all-zero fields + `_x/_y/_z` subcomponents, so it dumps every NON-ZERO field, not literally every field; output via Con_Printf = console) |
| 2 | Arg is entity slot number; range 0 .. current entity count | src/pr_edict.c:629-630 | `i = Q_atoi (Cmd_Argv(1)); if(i < 0 || i >= sv.num_edicts)` (num_edicts = "increases towards MAX_EDICTS", server.h:96) | MATCH |
| 3 | `edict <num>` = print all fields of entity <num> | src/pr_edict.c:636-637 | `Con_Printf ("\n EDICT %i:\n",i); ED_PrintNum (i);` | MATCH (same non-zero-field caveat as clause 1) |
| 4 | No arg / wrong arg count -> usage line | src/pr_edict.c:623-626 | `if (Cmd_Argc () != 2) { Con_Printf ("\nUsage:\nedict [num]\n"); return; }` | MATCH |
| 5 | Out-of-range slot prints "No such edict" | src/pr_edict.c:632 | `Con_Printf ("\nNo such edict: %i\n", i);` | MATCH (live string is "No such edict: %i"; description prefix matches) |
| 6 | Output only under interpreted QuakeC progs; native/bytecode module -> does nothing | src/pr2_edict.c:71-72 (OFF-state); sv_vm set at src/pr2_exec.c:427, NULL-fallback at :435 | `if(!sv_vm) ED_PrintEdict_f();` -- sv_vm non-NULL iff VM_Create loaded a native dll/so (VMI_NATIVE) or qvm (VMI_BYTECODE/VMI_COMPILED); NULL => PR1 interpreted .dat fallback | MATCH (exactly correct -- the highest-risk clause traces cleanly) |
| 7 | Set by: server console / rcon | src/cmd.c:706 (plain Cmd_AddCommand, no CF_ flags); src/sv_main.c:1828 (rcon -> Cmd_ExecuteString); src/sv_main.c:1754-1765 (normal-rcon blocklist, edict ABSENT); src/sv_user.c:3299 (clients use separate ucmds[]) | `SVC_RemoteCommand(...){ ... Cmd_ExecuteString(str); }` ; edict not among {rm,rmdir,ls,chmod,sv_admininfo,if,localcommand,sv_crypt_rcon,sv_timestamplen,log*,sys_command_line} | MATCH (console + both master & normal rcon; NOT client-reachable) |

**V-pass notes:** Oracle confirmed 1.11-53-g18d0362. Every material clause maps to a located, verified enforcing line (incl. adjacent comments). Verdict: TRACED-CLEAN.

Runtime-live handler resolution (load-bearing -- the description correctly describes the ACTIVE build): `edict` is registered TWICE in source -- PR1_Init (pr_edict.c:1270 -> ED_PrintEdict_f) and PR2_Init (pr2_exec.c:67 -> ED2_PrintEdict_f). These are mutually exclusive via the `#define PR_Init` macro switch keyed on USE_PR2 (progs.h:256 vs pr2.h:32). CMakeLists.txt:170 unconditionally defines USE_PR2 (`target_compile_definitions(... PRIVATE USE_PR2)`), so the canonical build resolves PR_Init -> PR2_Init, registering ED2_PrintEdict_f as the live handler. ED2 is a thin OFF-state gate (`if(!sv_vm) ED_PrintEdict_f()`) that delegates to the PR1 implementation only when no VM module is loaded. The pr_edict.c:1270 registration is dead under the standard build; Cmd_AddCommand (cmd.c:723-731) refuses duplicates anyway, so even if both Inits ran there is no double-registration. The description's behavior (delegates to PR1 field-dump, no-op under VM) is the ED2 path -- correct for the shipped binary.

Clause-6 deep trace (the clause most prone to name/string inference -- traced fully per WI-1): sv_vm (declared pr2_cmds.c:40, =NULL) is assigned by VM_Create (pr2_exec.c:427) using sv_progtype.value. VM_Create returns non-NULL when it loads a native dll/so (VMI_NATIVE, vm.c VM_LoadNative path) or a QVM bytecode image (VMI_BYTECODE/VMI_COMPILED, VM_LoadQVM); returns NULL on QVM load failure (vm.c "return NULL"), after which PR2_LoadProgs (pr2_exec.c:435) falls back to PR1_LoadProgs (interpreted qwprogs.dat). So sv_vm==NULL <=> interpreted PR1 progs, sv_vm!=NULL <=> native or bytecode module. The description's "interpreted QuakeC progs" vs "native or bytecode game module" mapping is exact.

Only imprecision: clauses 1 & 3 say "every field" / "all fields", but ED_Print (pr_edict.c:519-529) skips fields whose value is all-zero and skips `_x/_y/_z` vector subcomponents (pr_edict.c:514). So it dumps every non-default (non-zero) field. This is still-true minor vagueness that was fully traceable, and matches the universal Quake-engine `edict` debug-dump convention; it does not rise to C-NEAR-MISS. Verdict stays TRACED-CLEAN.

Metadata (WI-2): access-class verified against actual dispatch, not name. `edict` carries no CF_ flag (legacy cmd_function_t has no flags field; cmd.h:85-91). Reachable from server console (Cbuf -> Cmd_ExecuteString) and rcon (SVC_RemoteCommand -> Cmd_ExecuteString, sv_main.c:1828) under BOTH master_rcon_password and normal rcon_password (edict is absent from the normal-rcon blocklist at sv_main.c:1754-1765). NOT reachable by connected clients -- they dispatch through the separate ucmds[] table (sv_user.c:3299 / SV_ExecuteUserCommand sv_user.c:3399). "Set by: server console / rcon" is accurate. No "Default" claim present (command, not cvar) -- WI-2 default-rule N/A.

## flags_for_review

- [fyi/other/synthesis] The edict family (edict/edicts/edictcount) is registered TWICE -- once in PR1_Init (src/pr_edict.c:1270-1272, raw ED_* handlers) and once in PR2_Init (src/pr2_exec.c:67-69, ED2_* wrappers for edict/edicts, raw ED_Count for edictcount). The PR1_Init copies are dead in the shipping build because PR_Init resolves to PR2_Init under -DUSE_PR2 (verified in build/CMakeFiles/mvdsv.dir/flags.make:5). Not a bug -- it is the PR1/PR2 progs-engine fork -- but flagging because a reader greping the registration site alone (the locator) would land on the dead PR1 copy and mis-document the handler.
- [fyi/runtime-dead-suspect/vpass] src/pr_edict.c:1270 `Cmd_AddCommand ("edict", ED_PrintEdict_f)` (inside PR1_Init) is dead under the canonical build: CMakeLists.txt:170 unconditionally defines USE_PR2, so the `#define PR_Init` macro (progs.h:256 vs pr2.h:32) resolves PR_Init->PR2_Init, and PR1_Init is never the dispatched initializer. The live registration is pr2_exec.c:67 (ED2_PrintEdict_f). Not a description defect -- the proposed text correctly describes the ED2 delegating path -- but the PR1 direct registration would only be reachable in a hypothetical non-USE_PR2 build, which the standard build never produces. Flagging so a future reader doesn't mistake pr_edict.c:1270 for the live handler.
- [fyi/other/vpass] Companion sibling commands `edicts` (dump all entities) and `edictcount` are registered alongside `edict` at pr2_exec.c:68-69 and share the identical sv_vm OFF-state gate (pr2_edict.c:82-88 for edicts). If this knob's row ships, those two share the same architecture (PR1 fallback + no-op under VM module) and likely need the same OFF-state clause for consistency.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "edict",
  "type": "command",
  "description": "Debugging command that dumps every field of one server entity to the console. The argument is the entity's slot number; values run from 0 up to the current entity count.\n\nedict <num> = print all fields of entity <num>.\n\nWith no argument (or a wrong number of arguments) it prints a usage line; an out-of-range slot prints \"No such edict\". Produces output only when the server is running interpreted QuakeC progs -- under a native or bytecode game module it does nothing.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pr2_edict.c:67. TRAP-2 + live-path resolution: `edict` is registered twice -- src/pr_edict.c:1270 (PR1_Init -> raw ED_PrintEdict_f) and src/pr2_exec.c:67 (PR2_Init -> wrapper ED2_PrintEdict_f). PR_Init is a macro: src/progs.h:256 maps PR_Init=PR1_Init only `#ifndef USE_PR2` (src/progs.h:250); src/pr2.h:32 maps PR_Init=PR2_Init unconditionally. server.h includes progs.h (l.23) then pr2.h (l.26). Build flags (build/CMakeFiles/mvdsv.dir/flags.make:5) carry -DUSE_PR2, so the #ifndef is false, PR1_Init is NOT mapped, and PR_Init==PR2_Init. sv_main.c:4049 calls PR_Init() -> PR2_Init() -> registers the ED2_* wrapper. Therefore the LIVE handler is ED2_PrintEdict_f (src/pr2_edict.c:67-73), gated `if(!sv_vm) ED_PrintEdict_f();`. sv_vm is set by VM_Create (src/pr2_exec.c:427) when a native/bytecode progs loads, and stays NULL for interpreted .dat QC (PR1_LoadProgs fallback, src/pr2_exec.c:429-436) -- so the `!sv_vm` gate = output only under interpreted QC; under native/bytecode the wrapper is a no-op (admin-observable: nothing prints). The real work is the callee ED_PrintEdict_f (src/pr_edict.c:619-638): `if (Cmd_Argc()!=2)` -> \"Usage: edict [num]\"; `if(i<0||i>=sv.num_edicts)` -> \"No such edict\"; else ED_PrintNum(i) (src/pr_edict.c:588) dumps the entity's fields. Access class: NOT in ucmds[] (src/sv_user.c:3299 table) and not on the rcon blocklist (src/sv_main.c:1754-1764) -> admin-only. F-MV1: no KTX override (ktx/src grep empty). Range note: max valid slot is sv.num_edicts-1 (a runtime count, not a fixed cap), so the description says \"up to the current entity count\" rather than naming a number.",
  "description_proposed": null
}
```
