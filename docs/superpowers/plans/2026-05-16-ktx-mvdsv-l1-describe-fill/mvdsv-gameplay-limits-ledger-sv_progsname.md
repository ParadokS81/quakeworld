# describe-fill-synthesis ledger -- mvdsv `sv_progsname`

- **project:** mvdsv
- **knob:** `sv_progsname` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_progsname: synthesized -- base filename of the server game module; .dat/.qvm/native-lib extension appended at load (pr_edict.c:1163, pr2_exec.c:427->vm.c), default qwprogs, falls back to qwprogs.dat/spprogs.dat on failure -- origin=synthesized ref=src/pr_edict.c:1163 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the base filename of the game-code module the server loads (the part before the file extension). For example the default 'qwprogs' loads the standard QuakeWorld game code; a mod is selected by pointing this at the mod's module name. The file extension the server tries is determined by the sv_progtype setting, and it falls back to the standard game code if the named module cannot be loaded.
>
> Default: qwprogs.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| value is the module basename, .dat appended (QC path) | src/pr_edict.c:1163-1164 | `snprintf(name, sizeof(name), "%s.dat", sv_progsname.string);` + `FS_LoadHunkFile(name, ...)` | MATCH |
| basename used for VM module (qvm/native) | src/pr2_exec.c:427 | `VM_Create(VM_GAME, sv_progsname.string, ...)` | MATCH |
| VM_Create name becomes module basename | src/vm.c:689,1204,1264 | `vm->name = name;` -> `"%s.qvm"` / `"%s/%s." DLEXT` | MATCH |
| falls back to standard game code on load failure | src/pr_edict.c:1166-1169 | `if (!progs) progs = FS_LoadHunkFile("qwprogs.dat", ...)` then `"spprogs.dat"` | MATCH |
| savegame path forces spprogs (engine override) | src/sv_init.c:320 | `Cvar_Set(&sv_progsname, "spprogs"); // force progsname` | MATCH (routed to reasoning) |
| default qwprogs | src/pr_edict.c:81 | `cvar_t sv_progsname = {"sv_progsname", "qwprogs"}` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| C1 | Sets the base filename (stem before extension) of the game-code module loaded | pr_edict.c:1163; vm.c:689; vm.c:1204 | `snprintf(name, sizeof(name), "%s.dat", sv_progsname.string);` / `snprintf(filename,...,"%s.qvm", vm->name)` / `snprintf(name,...,"%s/%s." DLEXT, gpath, vm->name)` (vm->name = sv_progsname.string via VM_Create) | MATCH |
| C2 | Default 'qwprogs' loads the standard QuakeWorld game code | pr_edict.c:81; pr_edict.c:1196 | `cvar_t sv_progsname = {"sv_progsname", "qwprogs"};` ; CRC-mismatch error `"You must have the qwprogs.dat from QuakeWorld installed"` | MATCH |
| C3 | A mod is selected by pointing this at the mod's module name | pr2_exec.c:427 | `sv_vm = VM_Create(VM_GAME, sv_progsname.string, PR2_GameSystemCalls, sv_progtype.value );` (cvar value is the sole stem source) | MATCH |
| C4 | The server appends the appropriate extension **for the module type it finds** | vm.c:1277-1290; vm.c:689; pr_edict.c:1163 | `if ( interpret == VMI_NATIVE ) { ... VM_LoadNative(...) ... } ... VM_LoadQVM(...)` -- extension order is gated on `sv_progtype.value` (the `interpret` arg), NOT auto-detected from the module. Comment pr2_exec.c:32: `0 = pr1 (qwprogs.dat etc), 1 = native (.so/.dll), 2 = q3vm (.qvm)...` | MISMATCH (near-miss: mechanism misdescribed -- it is a `sv_progtype`-gated probe order, not type-detection; load outcome still appends .qvm/.dll/.dat and uses first that loads) |
| C5 | Falls back to the standard game code if the named module cannot be loaded | pr_edict.c:1166-1169 | `if (!progs) progs = FS_LoadHunkFile ("qwprogs.dat", &filesize); if (!progs) progs = FS_LoadHunkFile ("spprogs.dat", &filesize);` | MATCH (falls back to qwprogs.dat then spprogs.dat after `%s.dat`/`%s.qvm`/native fail) |
| M1 | Default: qwprogs | pr_edict.c:81 (registered via pr2_exec.c:49 / pr_edict.c:1265) | `cvar_t sv_progsname = {"sv_progsname", "qwprogs"};` -> `Cvar_Register(&sv_progsname);` | MATCH (registered default, not a cfg value) |
| M2 | Set by: server config | pr_edict.c:81 | struct `{"sv_progsname", "qwprogs"}` -- no flags field, no CVAR_ROM; normal settable cvar (also force-set to "spprogs" on savegame load, sv_init.c:320) | MATCH |

**V-pass notes:** Oracle version confirmed: git describe == 1.11-53-g18d0362.

Full enforcement chain traced (standard build defines USE_PR2 at CMakeLists.txt:170, so PR_LoadProgs/PR_Init map to the PR2 variants per progs.h:250-285):
- Registration: sv_main.c:4049 PR_Init -> PR2_Init (pr2_exec.c:44) -> Cvar_Register(&sv_progsname) at pr2_exec.c:49. Struct/default at pr_edict.c:81.
- Load: sv_init.c:386 PR_LoadProgs -> PR2_LoadProgs (pr2_exec.c:425) -> VM_Create(VM_GAME, sv_progsname.string, ..., sv_progtype.value).
- VM_Create (vm.c:1238): if interpret==VMI_NATIVE (sv_progtype=1) tries VM_LoadNative `%s.DLEXT` (vm.c:1204); otherwise / on native-fail goes to VM_LoadQVM `%s.qvm` (vm.c:689); on QVM-fail returns NULL.
- Fallback: PR2_LoadProgs NULL-branch -> PR1_LoadProgs (pr_edict.c:1135) tries `%s.dat` (1163), then hardcoded qwprogs.dat (1167), then spprogs.dat (1169), else SV_Error.

Verdict rationale: C-NEAR-MISS (flavour-C-positive). Six of seven clauses MATCH at their enforcing lines (incl. the WI-2 registered default and the no-flags settability). The single defect is C4's mechanism wording "appends the appropriate extension for the module type it finds": there is NO content/type auto-detection -- the extension probe order is gated on the SEPARATE sv_progtype cvar (default 0 = PR1 .dat path; the vm.h enum VMI_NONE=0/VMI_NATIVE=1/VMI_BYTECODE=2/VMI_COMPILED=3 maps onto the pr2_exec.c:32 comment). The clause does NOT contradict the load OUTCOME (the server genuinely tries .qvm/.dll/.dat and uses the first that loads), so it is a near-miss, not a C-FIX. A precise rewrite would say the extension is determined by sv_progtype and tried in a fixed fallback order, rather than implying the server inspects the module to pick the extension.

Minor (non-defect) omissions, not flagged as mismatches: the final fallback chain also includes spprogs.dat (single-player progs) after qwprogs.dat, and with WITH_NQPROGS additionally progs.dat -- the description's "standard game code" fallback covers qwprogs.dat accurately but is not exhaustive.

## flags_for_review

- [review/cross-mod-override/vpass] sv_progsname behavior is co-determined by the sibling cvar sv_progtype (pr2_exec.c:33, default 0). sv_progtype selects which extension family is probed first (0=PR1 .dat path, 1=native .so/.dll, 2/3=.qvm), and sv_progsname only supplies the stem. Any user-doc for sv_progsname that describes extension/module-type behavior should cross-reference sv_progtype, and vice versa -- the two are a pair and neither is self-contained on the 'which module type loads' axis.
- [fyi/other/vpass] savegame load force-sets sv_progsname to 'spprogs' and sv_progtype to 0 (sv_init.c:320-323, under USE_PR2). This is an engine-internal override of the user's configured value for single-player savegame restores -- a runtime mutation of the cvar that the 'Set by: server config' framing does not surface. FYI only; not relevant to typical dedicated-server use.
- [fyi/suspected-bug/vpass] The native-DLL load path (VM_LoadNative, vm.c:1196, reached only when sv_progtype=1=VMI_NATIVE) is present and compiled but the demo-restriction guard that historically disabled DLL loading during demo playback is commented out (vm.c:1271-1275). Not a sv_progsname defect, but a latent behavior note: native module loading has no fs_restrict guard in this build. Flagging as a possible upstream concern, not for the description.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_progsname",
  "type": "cvar",
  "description": "Sets the base filename of the game-code module the server loads (the part before the file extension). For example the default 'qwprogs' loads the standard QuakeWorld game code; a mod is selected by pointing this at the mod's module name. The file extension the server tries is determined by the sv_progtype setting, and it falls back to the standard game code if the named module cannot be loaded.\n\nDefault: qwprogs.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pr_edict.c:1163. Progs/VM module-selection knob. Registered at src/pr_edict.c:81 (`cvar_t sv_progsname = {\"sv_progsname\", \"qwprogs\"}`), plain cvar, default 'qwprogs'. The value is the module basename. Enforcing reads: (1) PR1/QC path src/pr_edict.c:1163 `snprintf(name, sizeof(name), \"%s.dat\", sv_progsname.string)` then `FS_LoadHunkFile(name, ...)` at :1164 -- loads `<sv_progsname>.dat`. (2) PR2/VM path src/pr2_exec.c:427 `sv_vm = VM_Create(VM_GAME, sv_progsname.string, ...)`; VM_Create stores the string as `vm->name` (src/vm.c:1264) which becomes the basename for `<name>.qvm` (src/vm.c:689) and the native shared lib `<name>.<DLEXT>` (src/vm.c:1204). So the 'appends the appropriate extension for the module type' clause is enforced across these three load paths. The 'falls back to standard game code' clause is enforced at src/pr_edict.c:1166-1169: if `<sv_progsname>.dat` fails, it tries `qwprogs.dat` then `spprogs.dat`. The savegame path forces it to 'spprogs' at src/sv_init.c:320 (`Cvar_Set(&sv_progsname, \"spprogs\")` under `if (loading_savegame)`) -- an engine edge-case override, routed to reasoning rather than the user doc (not action-changing for a normal server admin). Mechanism only, no recommended value. Default 'qwprogs' from registration literal.",
  "description_proposed": null
}
```
