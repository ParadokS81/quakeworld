# describe-fill-synthesis ledger -- mvdsv `sv_progtype`

- **project:** mvdsv
- **knob:** `sv_progtype` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_progtype: synthesized -- engine-enforced VM/progs selector; 0=.dat,1=native,2=qvm-interp,3=qvm-JIT traced to VM_Create; no KTX override -- origin=synthesized ref=src/pr2_exec.c:427 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Selects how the server loads and runs the game logic (the progs / mod code).
>
> 0 = load the classic progs.dat (interpreted QuakeC).
> 1 = load a native game module (a compiled .so / .dll), falling back to a .qvm if the native module is missing.
> 2 = load a .qvm game module and run it through the bytecode interpreter.
> 3 = load a .qvm game module and run it just-in-time compiled to native code (falls back to the interpreter on platforms without the compiler).
>
> Default: 0.
> Set by: server config, or the -progtype command-line parameter.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| value selects the VM/progs type at load | src/pr2_exec.c:427 | `sv_vm = VM_Create(VM_GAME, sv_progsname.string, PR2_GameSystemCalls, sv_progtype.value )` | MATCH |
| enum 0/1/2/3 = NONE/NATIVE/BYTECODE/COMPILED | src/vm.h:20-25 | `VMI_NONE, VMI_NATIVE, VMI_BYTECODE, VMI_COMPILED` | MATCH |
| 1 = native dll/.so, falls back to qvm | src/vm.c:1277-1290 | `if ( interpret == VMI_NATIVE ) { ... if ( VM_LoadNative( vm ) ) {...return vm;} Con_Printf("Failed to load dll, looking for qvm.\n"); interpret = VMI_COMPILED; }` | MATCH |
| 3 = JIT compile qvm to native | src/vm.c:1318-1322 | `if ( interpret >= VMI_COMPILED ) { if ( VM_Compile( vm, header ) ) { vm->compiled = true; } }` | MATCH |
| 2 = interpreted qvm (non-compiled path) | src/vm.c:1325-1331 | `if ( !vm->compiled ) { if ( !VM_PrepareInterpreter2( vm, header ) ) {...} }` | MATCH |
| JIT-unavailable downgrades to interpreter | src/vm.c:1312-1316 | `#ifdef NO_VM_COMPILED if(interpret >= VMI_COMPILED) {...interpret = VMI_BYTECODE;}` | MATCH |
| 0 = classic .dat (PR1 fallback when no qvm) | src/pr2_exec.c:425-437 | `sv_vm = VM_Create(...); if ( sv_vm ) {;} else { PR1_LoadProgs (); }` | MATCH |
| default 0 | src/pr2_exec.c:33 | `cvar_t sv_progtype = { "sv_progtype","0" };` | MATCH |
| set via -progtype cmdline | src/pr2_exec.c:56,64 | `p = SV_CommandLineProgTypeArgument(); ... Cvar_SetValue(&sv_progtype,usedll);` | MATCH |
| no KTX override | ktx/src (grep) | (zero hits for sv_progtype) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Selects how server loads/runs game logic (progs/mod code) -- general scope | src/pr2_exec.c:427 | `sv_vm = VM_Create(VM_GAME, sv_progsname.string, PR2_GameSystemCalls, sv_progtype.value );` | MATCH -- value flows into VM_Create as the `interpret` selector; dispatch in vm.c:1238-1343 |
| 2 | 0 = classic progs.dat (interpreted QuakeC) | src/pr2_exec.c:32 (author decl) + vm.c:1293 + pr2_exec.c:435 + pr_edict.c:1138-1164,1177 | decl: `// 0 = pr1 (qwprogs.dat etc) ...`; VM_Create(0) skips native (1277 false) -> VM_LoadQVM("<progsname>.qvm") (1293); no `<progsname>.qvm` in std install -> returns NULL -> PR2_LoadProgs falls back `PR1_LoadProgs ()` (435) which loads `%s.dat`=qwprogs.dat (1163-1164). VMI_NONE also routes string ops to PR1_* (pr2_exec.c:96-97). | MATCH (effective + author-declared; see FYI flag on the literal qvm-first nuance) |
| 3 | 1 = native module (.so/.dll), fall back to .qvm if native missing | src/vm.c:1277-1290 | `if ( interpret == VMI_NATIVE ) { ... if ( VM_LoadNative( vm ) ) { ... return vm; } Con_Printf( "Failed to load dll, looking for qvm.\n" ); interpret = VMI_COMPILED; }` then VM_LoadQVM at 1293. VM_LoadNative opens `%s.` DLEXT (.so/.dll) at vm.c:1204-1205. | MATCH |
| 4 | 2 = .qvm via bytecode interpreter | src/vm.c:1293,1318(false),1325-1326,1332 | not NATIVE -> VM_LoadQVM (1293); `if ( interpret >= VMI_COMPILED )` false for 2 (1318) so no compile; `if ( !vm->compiled )` -> `VM_PrepareInterpreter2` (1326); `vm->type = interpret` (1332). | MATCH |
| 5 | 3 = .qvm JIT-compiled to native; falls back to interpreter on platforms without the compiler | src/vm.c:1312-1323 | `#ifdef NO_VM_COMPILED if(interpret >= VMI_COMPILED){ Con_Printf("Architecture doesn't have a bytecode compiler, using interpreter\n"); interpret = VMI_BYTECODE; } #else if ( interpret >= VMI_COMPILED ) { if ( VM_Compile( vm, header ) ) { vm->compiled = true; } } #endif` | MATCH |
| 6 | Default: 0 | src/pr2_exec.c:33 | `cvar_t sv_progtype = { "sv_progtype","0" };` (registered Cvar_Register at :48, no override) | MATCH |
| 7 | Set by: server config | src/pr2_exec.c:33 (plain rw cvar) + sv_init.c:386 | plain `{ "sv_progtype","0" }` (no CVAR_ROM); value read at map-load via `sv_progtype.value` after `PR_LoadProgs ()` (sv_init.c:386) which runs post `exec server.cfg` (sv_init.c:309). | MATCH |
| 8 | Set by: -progtype command-line parameter | src/server.h:1109 + pr2_exec.c:56-64 | `#define SV_CommandLineProgTypeArgument() (COM_CheckParm("-progtype"))` (SERVERONLY live branch); read in PR2_Init: `p = SV_CommandLineProgTypeArgument(); ... usedll = Q_atoi(COM_Argv(p+1)); if (usedll > VMI_COMPILED || usedll < VMI_NONE) usedll = VMI_NONE; Cvar_SetValue(&sv_progtype,usedll);` | MATCH |

**V-pass notes:** VERDICT: TRACED-CLEAN. All 8 clauses map to located, verified enforcing lines. Oracle confirmed at 1.11-53-g18d0362.

Enum backbone (vm.h:20-25): VMI_NONE=0, VMI_NATIVE=1, VMI_BYTECODE=2, VMI_COMPILED=3 -- the cvar value IS this enum, passed verbatim into VM_Create as `interpret` (pr2_exec.c:427). I did NOT trust the declaration comment at pr2_exec.c:32; I independently enforcement-traced each of 0/1/2/3 through VM_Create (vm.c:1238-1343) and the PR2_LoadProgs fallback chain (pr2_exec.c:425-437). The comment and the traced behavior agree.

Value-1 fallback precision: the description says "falling back to a .qvm". The actual fallback path sets interpret=VMI_COMPILED (vm.c:1289), so a failed-native load tries to JIT the qvm, not plain-interpret it. The clause as written ("falls back to a .qvm") is true at the granularity claimed and does not over-specify the interpreter mode, so no defect.

Value-3 fallback: confirmed with the literal console string at vm.c:1314 ("Architecture doesn't have a bytecode compiler, using interpreter"), gated by NO_VM_COMPILED. Matches "falls back to the interpreter on platforms without the compiler" precisely.

Cmdline name: only the SERVERONLY branch (server.h:1109, literal "-progtype") is live; the non-SERVERONLY macro `cmdline_param_server_progtype` (server.h:1117) has NO definition anywhere in the tree (verified by repo-wide grep) -- that branch is dead for the dedicated-server build. Flag name "-progtype" is correct either way.

Settability: cvar is plain read-write (no CVAR_ROM), so server-config and -progtype are both valid set channels. Note sv_init.c:322 force-resets it to 0 ONLY in the savegame-load path (`if (loading_savegame)`) -- not a general behavior, correctly omitted from a user-doc.

## flags_for_review

- [fyi/other/vpass] Value-0 literal path nuance: VM_Create does NOT special-case VMI_NONE (0). With progtype 0 it skips the native block and calls VM_LoadQVM("<sv_progsname>.qvm") FIRST (vm.c:1293); only when that returns NULL (no matching .qvm) does PR2_LoadProgs fall back to PR1_LoadProgs -> progs.dat (pr2_exec.c:435). So if a file named <progsname>.qvm existed, progtype 0 would load it AS a qvm, contradicting the literal 'load the classic progs.dat' phrasing. In a standard install (default progsname 'qwprogs', no qwprogs.qvm shipped) the effective result is progs.dat, and the source's own declaration comment (pr2_exec.c:32) calls 0 'pr1 (qwprogs.dat etc)'. Judged FYI, not a row defect: user-doc granularity is correct and matches the authoritative comment; the qvm-first edge is an implementation detail unreachable under default naming.
- [fyi/suspected-bug/vpass] Dead cmdline macro: src/server.h:1117 references `cmdline_param_server_progtype` in the #else (non-SERVERONLY) branch, but that identifier is DEFINED nowhere in the source tree (repo-wide grep returns only the one use-site). The non-SERVERONLY branch of these SV_CommandLine* macros (lines 1114-1120) would not compile if that path were active; the live dedicated-server build uses the SERVERONLY branch with literal strings (lines 1106-1112). Not specific to sv_progtype -- the whole #else block shares this pattern -- but worth surfacing as a possible latent issue / incomplete enum-migration (the adjacent comment at server.h:1105 says 'mvdsv not changed over to enums yet').

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_progtype",
  "type": "cvar",
  "description": "Selects how the server loads and runs the game logic (the progs / mod code).\n\n0 = load the classic progs.dat (interpreted QuakeC).\n1 = load a native game module (a compiled .so / .dll), falling back to a .qvm if the native module is missing.\n2 = load a .qvm game module and run it through the bytecode interpreter.\n3 = load a .qvm game module and run it just-in-time compiled to native code (falls back to the interpreter on platforms without the compiler).\n\nDefault: 0.\nSet by: server config, or the -progtype command-line parameter.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pr2_exec.c:427. Enforcing read-site: pr2_exec.c:427 `sv_vm = VM_Create(VM_GAME, sv_progsname.string, PR2_GameSystemCalls, sv_progtype.value)` -- the .value is passed as the vmInterpret_t `interpret` arg. Enum values traced to vm.h:20-25 (VMI_NONE=0, VMI_NATIVE=1, VMI_BYTECODE=2, VMI_COMPILED=3). Per-value behavior enforced inside VM_Create (vm.c:1238): VMI_NATIVE branch (vm.c:1277-1290) calls VM_LoadNative and on failure sets interpret=VMI_COMPILED ('Failed to load dll, looking for qvm.'); VMI_COMPILED branch (vm.c:1318-1322) calls VM_Compile setting vm->compiled; non-compiled path (vm.c:1325-1331) calls VM_PrepareInterpreter2 (the bytecode interpreter); NO_VM_COMPILED downgrades >=VMI_COMPILED to VMI_BYTECODE (vm.c:1312-1316, the JIT-fallback clause). VMI_NONE(0): VM_Create skips the native branch, calls VM_LoadQVM (vm.c:1293) which returns NULL when no .qvm exists -> PR2_LoadProgs (pr2_exec.c:425-437) falls back to PR1_LoadProgs (the classic .dat path); corroborated by the declaration comment pr2_exec.c:32 '0 = pr1 (qwprogs.dat etc), 1 = native (.so/.dll), 2 = q3vm (.qvm), 3 = q3vm (.qvm) with JIT' and by sv_init.c:322 `Cvar_SetValue(&sv_progtype, 0); // force .dat` (savegame load forces .dat). Registered default '0' at pr2_exec.c:33 `cvar_t sv_progtype = { \"sv_progtype\",\"0\" }` (WI-2). Set-by: server config (Cvar_Register pr2_exec.c:48) plus the -progtype command-line parameter (pr2_exec.c:56 SV_CommandLineProgTypeArgument -> Cvar_SetValue pr2_exec.c:64, clamped to VMI_NONE..VMI_COMPILED at pr2_exec.c:62-63). No KTX override (grep of ktx/src for sv_progtype: zero hits). All cross-stack detail kept out of the user prose per D20.",
  "description_proposed": null
}
```
