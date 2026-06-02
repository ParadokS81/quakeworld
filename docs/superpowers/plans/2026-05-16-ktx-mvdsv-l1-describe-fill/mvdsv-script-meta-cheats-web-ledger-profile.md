# describe-fill-synthesis ledger -- mvdsv `profile`

- **project:** mvdsv
- **knob:** `profile` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:profile: synthesized -- top-10 legacy-QC function CPU profiler (map must be active); no-op when a QVM/native mod such as KTX is loaded; admin-only -- origin=synthesized ref=src/pr2_exec.c:77 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Prints a performance report for a server running legacy Quake-C game code, listing the ten game functions that have used the most CPU since the last report (and resetting those counters). It only produces output while a map is active. On servers whose game mod runs as a compiled module or bytecode (the common case, including KTX), this command does nothing. Takes no arguments.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| active handler is PR2_Profile_f (PR2 build) | src/pr2_exec.c:70 + src/pr2.h:32 | `Cmd_AddCommand("profile", PR2_Profile_f)`; `#define PR_Init PR2_Init` | MATCH |
| no-op when a mod VM is loaded | src/pr2_exec.c:77-84 | `void PR2_Profile_f(void){ if(!sv_vm){ PR_Profile_f(); return; } }` (only body) | MATCH |
| sv_vm set => a PR2/native/QVM mod is loaded | src/pr2_exec.c:427 | `sv_vm = VM_Create(VM_GAME, sv_progsname.string, PR2_GameSystemCalls, sv_progtype.value);` | MATCH |
| only while map active | src/pr_exec.c:227-228 | `if (sv.state != ss_active) return;` | MATCH |
| top-10 functions | src/pr_exec.c:246-247 | `if (num < 10) Con_Printf("%7i %s\n", best->profile, PR1_GetString(best->s_name)); num++;` | MATCH |
| ranks by CPU/profile counter | src/pr_exec.c:235-243 | `for(...) f=&pr_functions[i]; if (f->profile > max){ max=f->profile; best=f; }` | MATCH |
| resets the counters | src/pr_exec.c:249 | `best->profile = 0;` | MATCH |
| takes no arguments | src/pr2_exec.c:77-84 / src/pr_exec.c:220-253 | no Cmd_Argc/Cmd_Argv in either | MATCH |
| KTX-loaded => no-op | ktx/src/g_main.c:404-409 | KTX runs as a QVM mod so sv_vm is set; PR2_Profile_f returns without calling PR_Profile_f | MATCH |
| Set-by admin-only console/rcon | src/pr2_exec.c:70 + src/sv_user.c:3299-3368 | not in ucmds[] | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| C1 | Prints a performance report (produces output) | src/pr_exec.c:247 | `Con_Printf ("%7i %s\n", best->profile, PR1_GetString(best->s_name));` | MATCH |
| C2 | For "legacy Quake-C game code" (interpreted PR1 progs) | src/pr2_exec.c:32-33 (`// 0 = pr1 (qwprogs.dat etc) ...`); src/pr2_exec.c:79-83 (delegates to PR_Profile_f only when `!sv_vm`) | `if(!sv_vm){ PR_Profile_f(); return; }` | MATCH |
| C3 | Lists the ten functions that used the most CPU (top-10 by per-function statement count) | src/pr_exec.c:235-249 (loop finds max `f->profile`); :246 (`if (num < 10)`); counter at src/pr_exec.c:400 (`pr_xfunction->profile++;` per executed statement) | `if (num < 10) Con_Printf(...)` ; `pr_xfunction->profile++;` | MATCH |
| C4 | Resets those counters | src/pr_exec.c:249 | `best->profile = 0;` (zeros every function it walks, incl. beyond top 10) | MATCH |
| C5 | Only produces output while a map is active | src/pr_exec.c:227-228; gate value src/server.h:47 (`ss_active // actively running`) | `if (sv.state != ss_active) return;` | MATCH |
| C6 | On native-module/bytecode mods (incl. KTX) does nothing | src/pr2_exec.c:77-84 (empty body when `sv_vm` set); sv_vm set for VMI_NATIVE/BYTECODE/COMPILED via src/pr2_exec.c:427-431; KTX is `add_library(... SHARED ...)` (ktx/CMakeLists.txt:142) loaded as VMI_NATIVE | `if(!sv_vm){...; return;}` then `}` (no else) | MATCH |
| C7 | Takes no arguments | src/pr2_exec.c:77-84 + src/pr_exec.c:220-253 (no `Cmd_Argc`/`Cmd_Argv` read in either handler) | `void PR2_Profile_f(void)` / `void PR_Profile_f (void)` | MATCH |
| C8 | Set by: server console / rcon | Registered as bare command src/pr2_exec.c:70 (`Cmd_AddCommand("profile", PR2_Profile_f)`); rcon path runs same dispatcher src/sv_main.c:1799-1801 (`if (do_cmd) ... Cmd_ExecuteString(str);`) | `Cmd_AddCommand ("profile", PR2_Profile_f);` ; `Cmd_ExecuteString(str);` | MATCH |
| (dispatch) | Which "profile" handler is live | Two registrations: src/pr_edict.c:1273 (PR1) and src/pr2_exec.c:70 (PR2). `PR_Init` resolves to `PR2_Init` via src/pr2.h:32 because src/CMakeLists.txt:170 defines `USE_PR2`. PR1_Init's registration is dead in the shipped build; Cmd_AddCommand is first-wins anyway (src/cmd.c:723-731). | `#define PR_Init PR2_Init` ; `target_compile_definitions(... USE_PR2)` | MATCH |

**V-pass notes:** Oracle confirmed: 1.11-53-g18d0362. All 8 material clauses + the dispatch-resolution question trace to located, verified enforcing lines (with adjacent comments). Classification: TRACED-CLEAN.

Key trace work (this command has a non-trivial dispatch and a callee-mediated set of clauses, exactly the flavour-C / r42 trap):

1) TWO `Cmd_AddCommand("profile", ...)` exist (pr_edict.c:1273 PR1, pr2_exec.c:70 PR2). The shipped binary defines USE_PR2 unconditionally (CMakeLists.txt:170, no option-guard), so `PR_Init` -> `PR2_Init` (pr2.h:32) and the LIVE handler is `PR2_Profile_f`. The PR1 registration is dead code in the production build. (Cmd_AddCommand is first-wins per cmd.c:723-731, but the macro split already makes only one Init run.) A verifier that stopped at PR_Profile_f (pr_exec.c) would have cited a real-but-non-live function.

2) The top-10 / reset / ss_active-gate logic the description attributes to the command all lives in `PR_Profile_f` (pr_exec.c), which `PR2_Profile_f` invokes ONLY when `!sv_vm` (pr2_exec.c:79-83). Following the callee was required (caller PR2_Profile_f gates on sv_vm, callee carries the ss_active gate + the print/reset loop). This is the dropquad-style callee-follow: the enforcing lines for C3/C4/C5 are in the callee, and they were located.

3) OFF-state (C6) verified end-to-end: `sv_vm` is set for native(.so/.dll)/bytecode/compiled mods (pr2_exec.c:427) and NULL for interpreted PR1 progs (sv_progtype 0; else-branch PR1_LoadProgs at pr2_exec.c:435). PR2_Profile_f has NO else after the `!sv_vm` block, so under a VM mod it returns having printed nothing. KTX is independently confirmed as a SHARED native module (ktx/CMakeLists.txt:142), so "including KTX" is correct.

The description's user-facing framing ("legacy Quake-C game code", "compiled module or bytecode (the common case, including KTX)") accurately maps to the VMI_NONE-vs-rest split and is not name/string inference -- it matches the code structure and the sv_progtype source comment. Minor still-true imprecision acceptable under TRACED-CLEAN: the reset actually zeros EVERY function's counter (the do/while walks all of them), not only the ten printed -- the description's "resetting those counters" reads as the top-10 but the effect is a full reset; this does not change observable behavior for the user and is within still-true vagueness.

## flags_for_review

- [fyi/cross-mod-override/synthesis] On the standard 'mvdsv +gamedir ktx' deployment the 'profile' command is a no-op: KTX runs as a QVM/native mod so sv_vm is non-NULL, and PR2_Profile_f (src/pr2_exec.c:77-84) only does work in the !sv_vm (legacy interpreted QC progs) branch. The functional profiler PR_Profile_f (src/pr_exec.c:220) is reachable only on pure PR1/QC servers, which are now rare. Worth a human note that this command's documented effect applies only to legacy-progs servers, not to the dominant KTX setup.
- [fyi/runtime-dead-suspect/vpass] src/pr_edict.c:1273 `Cmd_AddCommand("profile", PR_Profile_f)` (the PR1 registration) is dead in the shipped binary: CMakeLists.txt:170 defines USE_PR2 unconditionally, so PR_Init resolves to PR2_Init (pr2.h:32) and only PR2_Profile_f is ever registered. PR_Profile_f remains reachable only as the callee PR2_Profile_f delegates to when !sv_vm. Not a defect in the description; flagged because a future PR1-only build (USE_PR2 undefined) would register PR_Profile_f directly and the OFF-state clause would no longer apply.
- [fyi/off-scope-entity/vpass] A sibling command `vmprofile` (VM_VmProfile_f, src/vm.c:1518; registered at pr2_exec.c via vminfo neighborhood / vm.c) is the live profiler for VM mods (native/.qvm), printing per-symbol profileCount and resetting it (vm.c:1554-1555). So on a VM mod (incl. KTX) `profile` does nothing while `vmprofile` is the working equivalent. The description correctly scopes itself to `profile` only and does not claim otherwise; flagged purely as adjacent context a downstream wiki page may want to cross-link.
- [fyi/other/vpass] Reset scope nuance: PR_Profile_f's do/while (pr_exec.c:231-252) zeros `best->profile = 0` for EVERY function on each pass, not only the ten it prints (the `if (num < 10)` gates only the Con_Printf, not the reset). The description's phrase 'the ten game functions ... (and resetting those counters)' could be read as resetting only the printed ten; the actual effect is a full counter reset. Behaviorally invisible to the user and within TRACED-CLEAN still-true vagueness, but noted for precision if the row is ever re-synthesized.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "profile",
  "type": "command",
  "description": "Prints a performance report for a server running legacy Quake-C game code, listing the ten game functions that have used the most CPU since the last report (and resetting those counters). It only produces output while a map is active. On servers whose game mod runs as a compiled module or bytecode (the common case, including KTX), this command does nothing. Takes no arguments.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pr2_exec.c:77. Active registration is Cmd_AddCommand(\"profile\", PR2_Profile_f) at src/pr2_exec.c:70 -- PR_Init resolves to PR2_Init via #define PR_Init PR2_Init (src/pr2.h:32), which shadows the PR1 form (src/progs.h:256) in the standard USE_PR2 build; the alternate PR1 registration Cmd_AddCommand(\"profile\", PR_Profile_f) at src/pr_edict.c:1273 (PR1_Init) is NOT the linked one. Enforcing dispatch PR2_Profile_f at src/pr2_exec.c:77-84: `if(!sv_vm){ PR_Profile_f(); return; }` and nothing else -- so when a PR2/QVM/native mod is loaded (sv_vm != NULL, set at src/pr2_exec.c:427 via VM_Create) the function returns having done NOTHING (the no-op-under-mod clause). The actual work is in PR_Profile_f (src/pr_exec.c:220-253), reached only for legacy interpreted QC progs: guards `if (sv.state != ss_active) return;` (src/pr_exec.c:227-228 -> 'only while a map is active'); then repeatedly finds the function with the highest f->profile counter (src/pr_exec.c:235-243), printing the top entries while num<10 (src/pr_exec.c:246-247 -> 'ten functions'), and zeroes each best->profile after reporting (src/pr_exec.c:249 -> 'resetting counters'). 'most CPU' = the per-function profile execution counter. No args read. KTX runs as a QVM/native mod (sv_vm set), so under a standard 'mvdsv +gamedir ktx' server this command is a no-op (flagged; it is the engine's PR1-only profiler). Access-class: Cmd_AddCommand-only, ABSENT from ucmds[] (src/sv_user.c:3299-3368) -> admin-only console/rcon; not on the master-rcon blocklist (src/sv_main.c:1754-1764). The no-op-under-mod fact is same-engine source-enforced (not cross-mod inference) so it is stated in description; the KTX-specific consequence is also flagged for review.",
  "description_proposed": null
}
```
