# describe-fill-synthesis ledger -- mvdsv `frag_log_type`

- **project:** mvdsv
- **knob:** `frag_log_type` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:frag_log_type: synthesized -- format selector for frag-log lines (0=compact names, 1=old-style verbose with teams+date+newmap marker); does NOT toggle logging on/off -- origin=synthesized ref=src/pr_cmds.c:2326 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Selects the line format used when the server writes frag (kill) events to the frag log file. Frag logging must first be enabled separately (the frag log file has to be open) -- this setting only changes how each logged line looks, it does not turn frag logging on or off.
>
> 0 = compact format: each kill is written as just the killer and victim names.
> 1 = old-style verbose format: each kill also records both players' team names and a full date/timestamp, and a marker line is written to the frag log each time the map changes.
>
> Default: 0.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| format toggle (verbose vs compact), non-zero=verbose | src/pr_cmds.c:2326-2333 | `if ((int)frag_log_type.value) ... s = va("\\frag\\%s\\%s\\%s\\%s\\...") else s = va("\\%s\\%s\\\n",...)` | MATCH |
| same toggle, mirror path (PR2/qvm progs) | src/pr2_cmds.c:1540-1547 | `if ((int)frag_log_type.value) // need for old-style frag log file` | MATCH |
| logging happens regardless of this cvar (write is unconditional) | src/pr_cmds.c:2336 ; src/pr2_cmds.c:1551 | `SV_Write_Log(FRAG_LOG, 1, s);` | MATCH |
| on/off gated by logfile being open, not by this cvar | src/sv_main.c:4142 | `if (!(logs[sv_log].sv_logfile && *msg)) return;` | MATCH |
| non-zero also writes a newmap marker line on map change | src/sv_ccmds.c:437,454 | `if ((int)frag_log_type.value) { ... s = va("\\newmap\\%s\\..."); ... SV_Write_Log(FRAG_LOG, 0, s); }` | MATCH |
| default 0 | src/sv_main.c:90 | `cvar_t frag_log_type = {"frag_log_type", "0"}` | MATCH |
| no KTX override | ktx/src (grep) | (no match for frag_log_type) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Selects the line format used when the server writes frag (kill) events to the frag log | pr_cmds.c:2326-2333; pr2_cmds.c:1540-1547 | `if ((int)frag_log_type.value) ... s = va("\\frag\\...") else s = va("\\%s\\%s\\\n", ...)` | MATCH |
| 2 | Frag logging must first be enabled separately (frag log file has to be open); this setting only changes format, not on/off | sv_main.c:4142 (gate); sv_ccmds.c:223 (separate `fraglogfile`->SV_FragLogfile_f); all 6 cvar sites read .value only | `if (!(logs[sv_log].sv_logfile && *msg)) return;` -- gate is the FILE* handle, never the cvar. Cvar is never tested for open/close. | MATCH |
| 3 | 0 = compact: each kill written as just killer and victim names | pr_cmds.c:2333; pr2_cmds.c:1547 | `s = va("\\%s\\%s\\\n", svs.clients[e1-1].name, svs.clients[e2-1].name);` | MATCH |
| 4 | 1 = verbose: also records both players' team names and a full date/timestamp | pr_cmds.c:2327-2331; pr2_cmds.c:1541-1545 | `va("\\frag\\%s\\%s\\%s\\%s\\%d-%d-%d %d:%d:%d\\\n", name1,name2, team1,team2, year,mon,mday, hour,min,sec)` | MATCH |
| 5 | 1 = a marker line written to the frag log each time the map changes | sv_ccmds.c:437-454 (inside SV_Map, now==true) | `if ((int)frag_log_type.value){ ... s = va("\\newmap\\%s\\...date...") ... SV_Write_Log(FRAG_LOG, 0, s);}` | MATCH |
| 6 | Default: 0 | sv_main.c:90 | `cvar_t frag_log_type = {"frag_log_type", "0"};` (registered default "0"; no OnChange, flags=0) | MATCH |
| 7 | Set by: server config / rcon | sv_main.c:90 + cvar.h:66 struct order | 2-field init => flags=0, OnChange=NULL: plain server cvar, no CVAR_ROM/lock, standard Cvar_Set path (console/config/rcon all allowed) | MATCH |
| -- | Implicit: domain is binary (0 vs nonzero), no type>=2 | pr_cmds.c:2326; pr2_cmds.c:1540; sv_ccmds.c:437 | all three sites are identical truthy-tests `if ((int)frag_log_type.value)`; no `==2`, `>`, or switch anywhere | MATCH |

**V-pass notes:** Every material clause -- format-selection, the OFF-state/"only-changes-format" prerequisite, both per-value line shapes, the verbose-only map-change marker, the default, and the access class -- maps to a located, verified enforcing line (incl. the SV_Write_Log file-handle gate at sv_main.c:4142 that proves the cvar does NOT control on/off; logging is toggled by the separate `fraglogfile` command, logs[] table sv_ccmds.c:223). All three runtime read-sites are byte-identical truthy-tests `if ((int)frag_log_type.value)`, so the value semantics are genuinely binary (zero=compact, nonzero=verbose+newmap-marker); there is no type>=2 path. Registered default is "0" with flags=0 and no OnChange, so the "Default 0" and "set by config/rcon" metadata are both correct.

The ONE soft spot is editorial, not behavioral, and does not downgrade the row: the source disagrees with itself on the "old/new style" naming. The declaration-block comment (sv_main.c:91-93) labels value 0 as "old style (qwsv - v0.165)" and value 1 as "new style (v0.168 - v0.172)", whereas the per-read-site inline comments (pr_cmds.c:2326, pr2_cmds.c:1540) attach `// need for old-style frag log file` to the value==1 / verbose branch. The proposed description's phrase "old-style verbose format" for value 1 therefore matches the inline read-site comments but contradicts the declaration block. Neither comment is an enforcing line (comments are hypotheses), and the label is not a behavioral assertion -- the actual emitted format for each value is exactly as described -- so this is not a flavour-C defect (not C-FIX: no behavioral clause is wrong; not C-NEAR-MISS: the only material clauses are all enforce-traced and the editorial label is itself comment-sourced, just from a self-contradicting source). Graded TRACED-CLEAN; the conflicting-comment labeling is raised as a review flag for the synth/editor to decide whether to keep, drop, or footnote the "old-style" wording, since carrying a version-era label that the cvar's own header comment contradicts could mislead a reader. Recommend dropping the "old-style/new-style" era labels entirely and describing the two values purely by what they emit (compact vs verbose), which is unambiguous and fully source-true.

## flags_for_review

- [fyi/contradiction/vpass] frag_log_type carries two mutually contradictory in-source 'style' labels. Declaration block sv_main.c:91-93 says '0 - old style', '1 - new style'; but the inline read-site comments pr_cmds.c:2326 and pr2_cmds.c:1540 both read '// need for old-style frag log file' on the value==1 (verbose) branch. The proposed description's 'old-style verbose format' label for value 1 follows the inline comments and contradicts the declaration block. Comments are hypotheses, not enforcing lines; the behavior described is correct regardless. Suggest the editor drop the era/style labels and describe each value purely by emitted format to avoid relaying a self-contradicting label.
- [fyi/other/vpass] Format selection is implemented identically at three independent read-sites: pr_cmds.c:2326-2333 (PF_logfrag, QC/progs path), pr2_cmds.c:1540-1547 (PF2_logfrag, QVM/bot path), and the verbose/newmap branch in sv_ccmds.c:437-454 (SV_Map). All three are byte-identical truthy-tests with no shared helper -- copy-paste triplication. Not a defect for this description, but any future change to the frag-line format must touch all three or the QC and QVM mod paths will silently diverge. FYI for maintainers, not a description issue.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "frag_log_type",
  "type": "cvar",
  "description": "Selects the line format used when the server writes frag (kill) events to the frag log file. Frag logging must first be enabled separately (the frag log file has to be open) -- this setting only changes how each logged line looks, it does not turn frag logging on or off.\n\n0 = compact format: each kill is written as just the killer and victim names.\n1 = old-style verbose format: each kill also records both players' team names and a full date/timestamp, and a marker line is written to the frag log each time the map changes.\n\nDefault: 0.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pr_cmds.c:2326. frag_log_type is a FORMAT selector, not an on/off switch -- the actual write happens unconditionally via SV_Write_Log(FRAG_LOG, ...) in both progs paths (src/pr_cmds.c:2336 PF_logfrag, src/pr2_cmds.c:1551 PF2_logfrag), and SV_Write_Log itself early-returns unless the frag logfile is open (src/sv_main.c:4142 `if (!(logs[sv_log].sv_logfile && *msg)) return;`), so logging on/off is governed by the logfile being open, NOT by this cvar. Polarity/format clause: enforcing site src/pr_cmds.c:2326-2333 `if ((int)frag_log_type.value)` -> verbose `\\frag\\name\\name\\team\\team\\Y-M-D h:m:s\\` (with team names + date), else compact `\\name\\name\\`; mirror at src/pr2_cmds.c:1540-1547. Trailing comment `// need for old-style frag log file` at both sites confirms non-zero = old-style. Map-change marker clause: src/sv_ccmds.c:437 `if ((int)frag_log_type.value)` -> writes a `\\newmap\\<level>\\...` line via SV_Write_Log(FRAG_LOG,0,...) at src/sv_ccmds.c:454, only when non-zero. Default `\"0\"` from registration literal src/sv_main.c:90 `cvar_t frag_log_type = {\"frag_log_type\", \"0\"}`. Set-by: plain cvar_t (no CVAR_ROM etc.), registered src/sv_main.c:3458 -> server config / rcon. F-MV1: grep of ktx/src for frag_log_type = NONE (frag logging is engine-side; KTX only emits frags via the logfrag progs builtin), so this documents live MVDSV behavior.",
  "description_proposed": null
}
```
