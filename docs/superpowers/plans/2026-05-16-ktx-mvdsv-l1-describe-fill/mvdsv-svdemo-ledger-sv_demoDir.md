# describe-fill-synthesis ledger -- mvdsv `sv_demoDir`

- **project:** mvdsv
- **knob:** `sv_demoDir` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (HARD GATE verified: `git -C research/repos/mvdsv describe --tags` == `1.11-53-g18d0362`)
- **registered name string:** `"sv_demoDir"` (matches L1 entity name exactly, including letter-case; verified `src/sv_demo.c:38`)
- **registered default:** `"demos"` (matches extractor-recorded default)
- **mechanical_candidate:** none -- cold-synth (no trailing comment, no shipped-config candidate)
- **suspect_pool_member:** FALSE (not runtime-dead; verified vs Phase-0 C3 pool by the brief)
- **verdict:** `synthesized` -- fully source-legible; every clause enforce-traced TRACED-CLEAN; high confidence

## Halt verdict

```
mvdsv:sv_demoDir: synthesized -- cold-synth, read-sites compose fs_gamedir/<value>/<demoname> for every demo write/list/remove; empty value rejected by OnChange; every clause enforce-traced TRACED-CLEAN; not suspect-pool -- origin=synthesized ref=src/sv_demo.c:1723 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the subdirectory, under the server's current game directory, where
> recorded MVD demos are written and where the server looks for them when
> listing or deleting demos. The directory is created automatically when a
> recording starts if it does not already exist.
>
> Default: demos.
> Set by: server config. Setting it to an empty value is rejected (the
> change is ignored), so demos are always stored in a subdirectory.

## Per-clause enforce-trace table

| Clause asserted in `description` | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|
| Value is a subdirectory NAME under the game directory (not an absolute path) -- demos are WRITTEN there | `src/sv_demo.c:1723` | `snprintf (name, sizeof(name), "%s/%s/%s", fs_gamedir, sv_demoDir.string, newname);` | MATCH -- the recording target path is composed as `fs_gamedir` + `/` + value + `/` + demo filename; value is a path segment under the gamedir |
| Directory is created automatically when a recording starts | `src/sv_demo.c:1721` | `Sys_mkdir(va("%s/%s", fs_gamedir, sv_demoDir.string));` | MATCH -- immediately before the recording path is built, the engine `mkdir`s `fs_gamedir/<value>`; same pattern at `src/sv_demo.c:1807` for the QTV/forced-record path |
| Server LISTS demos from this directory | `src/sv_demo_misc.c:351` | `dir = Sys_listdir(va("%s/%s", fs_gamedir, sv_demoDir.string), sv_demoRegexp.string, SORT_BY_DATE);` | MATCH -- `cmd_demolist` enumerates `fs_gamedir/<value>`; also `src/sv_demo_misc.c:153, 455, 474, 583, 988, 1067` |
| Server DELETES / clears demos from this directory | `src/sv_demo_misc.c:173` | `Sys_remove(va("%s/%s/%s", fs_gamedir, sv_demoDir.string, list->name));` | MATCH -- `SV_DemoRemove`-family removal composes the same prefix to delete files in the directory |
| Empty value is rejected -- the change is cancelled (cannot be blanked) | `src/sv_demo.c:63-65` | `if (cvar == &sv_demoDir && !value[0]) {` / `*cancel = true;` / `return;` | MATCH -- the `OnChange` handler sets `*cancel = true` when the new value is the empty string AND the cvar is `sv_demoDir` specifically; the assignment is therefore vetoed and the prior value is kept. Scope guard `cvar == &sv_demoDir` confirms this rejection applies to `sv_demoDir` only, NOT to the sibling `sv_demoDirAlt` that shares the same handler (`src/sv_demo.c:39`) |
| Default: demos | `src/sv_demo.c:38` | `cvar_t  sv_demoDir          = {"sv_demoDir",        "demos", 0, sv_demoDir_OnChange};` | MATCH -- WI-2: the registered literal default (second `cvar_t` field) is `"demos"`; not a shipped-cfg value |
| Set by: server config | `src/sv_demo.c:38` + `src/sv_demo.c:1849` | decl flags field = `0` (CVAR_NONE -- no `CVAR_SERVERINFO`, no `CVAR_ROM`); registered `Cvar_Register (&sv_demoDir);` | MATCH -- plain server-side cvar set via server config / console / rcon; flags `0` per the `cvar_t` field order `{name,string,flags,OnChange}` (`src/cvar.h:66-75`) means it is neither mirrored to serverinfo nor read-only, and has no command/vote dispatch path |

## Use-site inventory (WI-1 wide read)

Whole-tree grep for `sv_demoDir` over `src/` (`.c`/`.h`). Excluding the
sibling `sv_demoDirAlt` (separate L1 entity, out of scope here):

Declarations / registration (NOT the citation per the brief):
- `src/server.h:990` -- `extern cvar_t sv_demoDir;`
- `src/sv_user.c:1427` -- `extern cvar_t sv_demoDir;`
- `src/sv_demo.c:32` -- forward decl of the `OnChange` handler
- `src/sv_demo.c:38` -- registration literal (default `"demos"`; flags `0`; OnChange)
- `src/sv_demo.c:1849` -- `Cvar_Register (&sv_demoDir);`

OnChange handler (enforces the empty-rejection + a `..` path-traversal guard):
- `src/sv_demo.c:61-76` -- `sv_demoDir_OnChange`: cancels on empty value (lines 63-65); strips a leading `..` (lines 68-70) and cancels on any embedded `/..` (lines 72-75). The traversal guard is a security/sanitization mechanism; it is NOT inlined into the user-doc (does not change the admin's setting action) -- recorded here in reasoning.

Read use-sites (`sv_demoDir.string`) -- the authoritative behavior:
- WRITE / record: `src/sv_demo.c:853` (`strlcpy(dst->path, sv_demoDir.string, ...)`), `src/sv_demo.c:1721` (mkdir), `src/sv_demo.c:1723` (record path -- THE primary `source_ref`), `src/sv_demo.c:1807` (mkdir, QTV/forced), `src/sv_demo.c:1826-1827` (`.mvd`/`.xml` naming)
- LIST: `src/sv_demo_misc.c:153, 350-351, 455, 474, 583, 988, 1067`
- REMOVE / clear: `src/sv_demo_misc.c:173`, and removal-path composition `src/sv_demo_misc.c:593, 622, 678, 735, 891, 903, 949, 1011, 1087`
- TXT sidecar / on-remove script: `src/sv_demo_misc.c:622, 637, 688, 725`, `src/central.c:621`
- Client demo DOWNLOAD remap: `src/sv_user.c:1486-1488` (`if (!strncmp(name, "demos/", 6) && sv_demoDir.string[0])` -> remaps a client `demos/...` download request into `sv_demoDir.string/...`)
- Central/upload path: `src/central.c:290, 295-297`

Every read composes the SAME shape: `fs_gamedir` + `/` + `sv_demoDir.string` + `/` + a per-demo filename. No name-only inference -- the "subdirectory under the gamedir, used for write + list + delete" behavior is read directly off the path-composition and `Sys_mkdir`/`Sys_listdir`/`Sys_remove` call sites. The `src/sv_user.c:1486` download remap and `src/central.c` upload paths are cross-consumer corroboration of the same directory semantics (a CLIENT acts on the same path), kept out of the lean user-doc per D20 (`See also: L3` would be the route if it were action-changing for the admin; it is not -- the admin sets the same directory regardless).

## Rubric grading (D5, all five clauses)

1. WHAT in admin-observable terms -- yes: "the subdirectory where recorded demos are stored / listed / deleted." Not WHY the code does it.
2. Not a name restatement -- the name is `sv_demoDir` ("demo dir"); the description spells out that it is a subdirectory UNDER the game directory, auto-created, and used for the full write/list/delete lifecycle -- not merely "the demo directory."
3. Units/enums spelled out -- this is a free-form path string, not an enum; the meaningful behavioral constraint (empty value rejected) is stated explicitly. No numeric unit applies.
4. Mechanism only, no opinion / recommended value -- yes: no "set this to X for tournament servers" advice.
5. Self-contained without source -- yes: an admin understands it is a folder name under the gamedir and that it cannot be blanked, without reading C.

## D20 QA self-check

1. Admin who never saw C code understands it? YES.
2. Zero file:line / function names / engine jargon in `description`? YES -- no `fs_gamedir`, no `Sys_mkdir`, no `OnChange`, no `*cancel`, no file:line. ("game directory" / "subdirectory" are plain-English admin terms.)
3. Values/units spelled out, Default + Set-by present? YES -- path string (no enum); Default `demos`; Set-by server config + the empty-value rejection constraint.
4. Cross-engine detail routed to `See also:` unless action-changing? Handled -- the client-side download remap (`src/sv_user.c:1486`) and central upload path are cross-consumer mechanism, NOT action-changing for the admin's choice of directory, so they are kept in reasoning rather than inlined; no `See also:` slug needed (no existing concept note depends on it).
5. Every clause enforce-traced (B1), cites in reasoning? YES (table above; cites carried in `description_reasoning`).

## Notes / conflicts

- No C2 conflict (no mechanical candidate, no trailing comment to differ from).
- `description_provenance` = `null`: cold-synth; per operator clarification 2026-05-30, provenance holds retained shipped-doc DATA only. This row's grounding is `source_ref` + anchor + the reasoning cites.
- Confidence `high`: the behavior is read off ~30 unambiguous path-composition read-sites that all share one shape; the empty-rejection clause is traced to the exact `OnChange` guard with its `cvar == &sv_demoDir` scope check; default + set-by verified at the registration literal and the `cvar_t` field layout. No hedged clause.
- The `..` path-traversal sanitization (`src/sv_demo.c:68-75`) is real source-enforced behavior but is omitted from the lean user-doc: it does not change the admin's setting action and is anti-traversal hardening, not a configurable effect. Captured in the use-site inventory for completeness.

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_demoDir",
  "type": "cvar",
  "description": "Sets the subdirectory, under the server's current game directory, where recorded MVD demos are written and where the server looks for them when listing or deleting demos. The directory is created automatically when a recording starts if it does not already exist.\n\nDefault: demos.\nSet by: server config. Setting it to an empty value is rejected (the change is ignored), so demos are always stored in a subdirectory.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth from the sv_demoDir.string read use-sites; primary source_ref src/sv_demo.c:1723 (snprintf name '%s/%s/%s' fs_gamedir, sv_demoDir.string, newname). Enforce-trace per clause: subdirectory-under-gamedir for WRITE -> src/sv_demo.c:1723 (record path composition) ; auto-create-on-record -> src/sv_demo.c:1721 and src/sv_demo.c:1807 (Sys_mkdir fs_gamedir/<value>) ; LIST -> src/sv_demo_misc.c:351 (Sys_listdir fs_gamedir/<value>) ; DELETE/clear -> src/sv_demo_misc.c:173 (Sys_remove fs_gamedir/<value>/name) ; empty-value-rejected -> src/sv_demo.c:63-65 OnChange (if (cvar == &sv_demoDir && !value[0]) { *cancel = true; return; } -- scope guard limits the rejection to sv_demoDir, not the shared-handler sibling sv_demoDirAlt at src/sv_demo.c:39) ; Default demos -> registered literal src/sv_demo.c:38 (WI-2 registered default, second cvar_t field, not shipped-cfg) ; Set-by server config -> src/sv_demo.c:38 flags field 0 = CVAR_NONE (cvar_t field order {name,string,flags,OnChange} per src/cvar.h:66-75; no CVAR_SERVERINFO, no CVAR_ROM, no command/vote dispatch) + Cvar_Register src/sv_demo.c:1849. All clauses MATCH (TRACED-CLEAN). Cross-consumer corroboration (kept OUT of user-doc, not action-changing): client download remap src/sv_user.c:1486-1488, central upload src/central.c:290-297. Omitted from lean user-doc: the leading-'..'-strip and embedded '/..' rejection traversal guard at src/sv_demo.c:68-75 (anti-traversal hardening, not a configurable effect). suspect_pool_member FALSE. No mechanical candidate / trailing comment -> no C2 conflict. Verdict synthesized, confidence high.",
  "description_proposed": null
}
```
