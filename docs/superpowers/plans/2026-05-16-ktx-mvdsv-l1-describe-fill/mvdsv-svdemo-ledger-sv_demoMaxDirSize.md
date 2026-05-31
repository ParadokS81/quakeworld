# describe-fill-synthesis ledger -- mvdsv `sv_demoMaxDirSize`

- **project:** mvdsv
- **knob:** `sv_demoMaxDirSize` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (HARD GATE verified: `git -C .../research/repos/mvdsv describe --tags` == `1.11-53-g18d0362`)
- **registered name string:** `"sv_demoMaxDirSize"` (matches L1 entity name exactly; the C `cvar_t` variable is also `sv_demoMaxDirSize` -- no letter-case divergence; verified `src/sv_demo.c:36`)
- **registered default:** `"102400"` (matches extractor-recorded default; L1 lookup default_value `102400`)
- **mechanical_candidate:** none -- cold-synth (no trailing comment, no shipped-config candidate). L1 `help_desc` is `null`.
- **suspect_pool_member:** FALSE (verified vs Phase-0 C3 pool; not runtime-dead)
- **verdict:** `synthesized` -- fully source-legible; every clause enforce-traced TRACED-CLEAN; high confidence

## Halt verdict

```
mvdsv:sv_demoMaxDirSize: synthesized -- cold-synth, read-site caps the demo dir at value*1024 bytes (value in KB), refuses or prunes recordings at the cap per sv_demoClearOld, 0 disables; every clause enforce-traced TRACED-CLEAN; not suspect-pool -- origin=synthesized ref=src/sv_demo_misc.c:154 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets a size limit on the server's demo directory. Before each new
> recording starts, the server checks the total size of the demo folder; if
> it is over the limit, the server either refuses to record or deletes the
> oldest demos to make room, depending on sv_demoClearOld.
>
> The value is in kilobytes (KB) -- e.g. 102400 = 100 MB.
> 0 = no limit (the directory size is never checked).
>
> Default: 102400.
> Set by: server config.

## Per-clause enforce-trace table

| Clause asserted in `description` | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|
| Limits the total size of the demo directory (the folder named by `sv_demoDir`) | `src/sv_demo_misc.c:153-154` | `dir = Sys_listdir(va("%s/%s", fs_gamedir, sv_demoDir.string), ".*", SORT_NO);` then `if ((float)dir.size > sv_demoMaxDirSize.value * 1024)` | MATCH -- `dir.size` is the summed size of the demo dir from `Sys_listdir`; it is compared against the cap |
| Value is in kilobytes (KB); 102400 = 100 MB | `src/sv_demo_misc.c:154` | `if ((float)dir.size > sv_demoMaxDirSize.value * 1024)` | MATCH -- `dir.size` is bytes; the cvar is multiplied by 1024 to reach bytes, so the cvar unit is KB. Cross-check: default 102400 KB x 1024 = 104857600 B = exactly 100 MB. The MB display at `:418`/`:415` divides bytes by `1024*1024`, corroborating |
| Checked before each recording starts | `src/sv_demo.c:1715`, `src/sv_demo.c:1761` | `if (!SV_DirSizeCheck()) return;` (in `SV_MVD_Record_f` / `record`) and `if (!SV_DirSizeCheck()) // clear old demos` `return;` (in `SV_MVDEasyRecord_f` / `easyrecord`) | MATCH -- both recording entry points call `SV_DirSizeCheck` and abort recording if it returns false |
| Over the limit + `sv_demoClearOld <= 0` -> recording refused | `src/sv_demo_misc.c:156-160` | `if ((int)sv_demoClearOld.value <= 0) { Con_Printf("Insufficient directory space, increase sv_demoMaxDirSize\n"); return false; }` | MATCH -- returns false (which the callers turn into an aborted recording) and prints the over-space message |
| Over the limit + `sv_demoClearOld > 0` -> oldest demos deleted to make room | `src/sv_demo_misc.c:161-176` | `n = (int) sv_demoClearOld.value; ... qsort((void *)list, dir.numfiles, sizeof(file_t), Sys_compare_by_date); for (; list->name[0] && n > 0; list++) { ... Sys_remove(va("%s/%s/%s", fs_gamedir, sv_demoDir.string, list->name)); n--; }` | MATCH -- files are sorted by date and the oldest `n` are removed ("oldest" = `Sys_compare_by_date` + the function header comment "Deletes sv_demoClearOld files from demo dir if out of space") |
| 0 = no limit (directory size never checked) | `src/sv_demo_misc.c:151` (and the display gate `:416`) | `if ((int)sv_demoMaxDirSize.value)` | MATCH -- when the value is 0 the gate is false, so the entire size-check / over-limit block is skipped; no cap is enforced |
| Default: 102400 | `src/sv_demo.c:36` | `cvar_t  sv_demoMaxDirSize   = {"sv_demoMaxDirSize", "102400"};` | MATCH -- registered literal default `"102400"` (WI-2: registered default, not a shipped-cfg value) |
| Set by: server config | `src/sv_demo.c:36` + `src/sv_demo.c:1847` | decl `cvar_t sv_demoMaxDirSize = {"sv_demoMaxDirSize", "102400"};` (flag field absent -- no `CVAR_SERVERINFO`, no `CVAR_ROM`, no `OnChange` callback) + `Cvar_Register (&sv_demoMaxDirSize);` | MATCH -- plain server cvar registered with no flags and no command/vote/serverinfo/OnChange dispatch path; settable only via server config / console. Contrast sibling `sv_demoCacheSize` (line 35, `CVAR_ROM`) and `sv_demoDir` (line 38, `OnChange`) -- this one carries neither |

## Use-site inventory (WI-1 wide read)

Whole-tree grep over `src/` for `demoMaxDirSize` / `demo_max_dir_size` / `maxdirsize` / `max_dir_size` (case-insensitive), plus a follow-up grep for any aliased / macro reference (`demomaxdir` / `MaxDirSize` minus the literal) returned empty -- every use-site uses the literal `sv_demoMaxDirSize`:

- `src/server.h:988` -- `extern cvar_t sv_demoMaxDirSize;` (declaration, not a read)
- `src/sv_demo.c:36` -- registration literal (default `"102400"`; locator aid, NOT the citation per the brief)
- `src/sv_demo.c:1847` -- `Cvar_Register (&sv_demoMaxDirSize);` (registration, not a read)
- `src/sv_demo_misc.c:151` -- `if ((int)sv_demoMaxDirSize.value)` -- OFF-state gate in `SV_DirSizeCheck`
- `src/sv_demo_misc.c:154` -- `if ((float)dir.size > sv_demoMaxDirSize.value * 1024)` -- THE authoritative threshold read-site; the `source_ref`
- `src/sv_demo_misc.c:158` -- `Con_Printf("Insufficient directory space, increase sv_demoMaxDirSize\n")` -- the refusal message (string mentions the cvar; the enforcement is the surrounding branch)
- `src/sv_demo_misc.c:416` -- `if ((int)sv_demoMaxDirSize.value)` -- OFF-state gate in `SV_DemoList` (the display path)
- `src/sv_demo_misc.c:418` -- `free_space = (sv_demoMaxDirSize.value * 1024 - dir.size) / (1024 * 1024);` -- computes "space available" MB for the `demolist` display; corroborates the KB unit (value*1024 = byte budget)

Two functional clusters: (1) `SV_DirSizeCheck` (`:145`) -- the enforcement path, called from the two recording commands in `sv_demo.c`; (2) `SV_DemoList` (`:415-422`) -- a read-only display of remaining space. The enforcement clauses all trace to cluster (1). No name-only inference: the cap semantics, the KB unit, the refuse-vs-prune branch, and the OFF-state all come from the gated branches, not the knob name.

## Rubric grading (D5, all five clauses)

1. WHAT in admin-observable terms -- yes: it caps the demo folder size; over the cap the server refuses to record or prunes the oldest demos. Not WHY.
2. Not a name restatement -- yes: the name says "max dir size"; the description spells out the observable consequence (size checked before each recording, the refuse-vs-prune behavior, the KB unit), not just "the maximum directory size."
3. Units/enums spelled out -- yes: the value is KB (with the 102400 = 100 MB worked example), and 0 = no limit is stated explicitly.
4. Mechanism only, no opinion / recommended value -- yes: no "set this to N on busy servers" advice. The pairing knob `sv_demoClearOld` is named only because the over-limit behavior literally branches on it (it changes the admin's action); no recommended value for either knob is given.
5. Self-contained without source -- yes: an admin understands the cap, the unit, the OFF-state, and the two over-limit outcomes without reading C.

## D20 QA self-check

1. Admin who never saw C code understands it? YES.
2. Zero file:line / function names / engine jargon in `description`? YES -- no `SV_DirSizeCheck`, no `dir.size`, no `Sys_listdir`, no file:line. (`sv_demoClearOld` and `sv_demoDir`-implied "demo directory" are user-facing cvar concepts, not code jargon; `sv_demoClearOld` is named because it is the branch condition the admin observes.)
3. Values/units spelled out, Default + Set-by present? YES (KB unit + 100 MB example + 0=no-limit; Default 102400; Set by server config).
4. Cross-engine detail routed to `See also:` unless action-changing? N/A -- this is a server-only disk-management cvar with no cross-codebase (client / proxy) consumer. The `sv_demoClearOld` coupling is same-codebase AND action-changing (it flips refuse vs prune at the cap), so a single compact inline clause is D20-justified; no `See also:` slug needed (no concept note exists).
5. Every clause enforce-traced (B1), cites in reasoning? YES (table above; cites stored in `description_reasoning`).

## Notes / conflicts

- No C2 conflict (no mechanical candidate, no trailing comment to differ from; source is the sole input).
- `description_provenance` = `null`: cold-synth; per operator clarification 2026-05-30, `description_provenance` holds retained shipped-doc DATA only. This row's grounding is `source_ref` + anchor + the reasoning cites.
- `source_ref` = `src/sv_demo_misc.c:154` -- the authoritative read use-site that exhibits the cap (the threshold comparison), NOT the registration site (per the evidence rule: cite the read use-site, not the registration unless that is where the behavior is read).
- Confidence `high`: the threshold, the KB unit (cross-checked by the MB display and the 100 MB default), the OFF-state gate, both over-limit branches, and both recording call-sites are all directly traced; the default + set-by are verified at the registration literal. No hedged clause; nothing left to name-inference.

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_demoMaxDirSize",
  "type": "cvar",
  "description": "Sets a size limit on the server's demo directory. Before each new recording starts, the server checks the total size of the demo folder; if it is over the limit, the server either refuses to record or deletes the oldest demos to make room, depending on sv_demoClearOld.\n\nThe value is in kilobytes (KB) -- e.g. 102400 = 100 MB.\n0 = no limit (the directory size is never checked).\n\nDefault: 102400.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (L1 help_desc null, no trailing comment) from the read use-sites in SV_DirSizeCheck (src/sv_demo_misc.c:145+). Enforce-trace per clause: directory-size cap -> src/sv_demo_misc.c:153-154 (Sys_listdir on sv_demoDir gives dir.size; compared against sv_demoMaxDirSize.value*1024); KB unit -> src/sv_demo_misc.c:154 (dir.size is bytes, cvar*1024 -> byte budget, so cvar=KB; cross-check 102400 KB x1024 = 104857600 B = 100 MB; corroborated by MB display src/sv_demo_misc.c:418/415 dividing bytes by 1024*1024); checked before each recording -> src/sv_demo.c:1715 (record) + src/sv_demo.c:1761 (easyrecord), both 'if (!SV_DirSizeCheck()) return;'; over-limit + sv_demoClearOld<=0 -> refuse -> src/sv_demo_misc.c:156-160 (Con_Printf 'Insufficient directory space' then return false); over-limit + sv_demoClearOld>0 -> prune oldest -> src/sv_demo_misc.c:161-176 (qsort by Sys_compare_by_date, Sys_remove oldest n; header comment 'Deletes sv_demoClearOld files from demo dir if out of space'); OFF-state 0 = no limit -> src/sv_demo_misc.c:151 (and :416) 'if ((int)sv_demoMaxDirSize.value)' gate skips the whole check when 0; Default 102400 -> registered literal src/sv_demo.c:36 (WI-2 registered default, not shipped-cfg); Set-by server config -> src/sv_demo.c:36 flag field absent (no CVAR_SERVERINFO/CVAR_ROM/OnChange, unlike CVAR_ROM sibling sv_demoCacheSize line 35 and OnChange sibling sv_demoDir line 38) + Cvar_Register src/sv_demo.c:1847. All clauses MATCH (TRACED-CLEAN). source_ref=src/sv_demo_misc.c:154 (authoritative threshold read-site, not the registration). suspect_pool_member FALSE. sv_demoClearOld named in user-doc because the over-limit branch literally gates on it (action-changing refuse-vs-prune); no recommended values (L3). No mechanical candidate/trailing comment -> no C2 conflict. Verdict synthesized, confidence high.",
  "description_proposed": null
}
```
