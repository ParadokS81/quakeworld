# describe-fill-synthesis ledger -- mvdsv `sv_maxlogsize`

- **project:** mvdsv
- **knob:** `sv_maxlogsize` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_maxlogsize: synthesized -- byte threshold that rotates the server log to a new file; 0 disables; enforced post-write in SV_Write_Log -- origin=synthesized ref=src/sv_main.c:4177 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the maximum size a server log file may reach before it is closed and a new log file is started, in bytes.
>
> 0 = no size limit (the log file grows without being rotated).
> any positive value = once the current log file grows past that many bytes, the server closes it and continues logging to a fresh file.
>
> Default: 0.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 0 | src/sv_main.c:128 | `cvar_t sv_maxlogsize = {"sv_maxlogsize", "0"};` | MATCH |
| 0 = no size limit / no rotation | src/sv_main.c:4177 | `if ((int)sv_maxlogsize.value &&` (short-circuits when 0) | MATCH |
| rotates when file exceeds value | src/sv_main.c:4177-4181 | `(FS_FileLength(...) > (int)sv_maxlogsize.value)) { SV_Logfile(sv_log, true); }` | MATCH |
| threshold unit is bytes | src/fs.c:809-818 | `FS_FileLength` returns ftell at SEEK_END (byte size) | MATCH |
| rotation = close + start a fresh log file | src/sv_ccmds.c:84-118 | `SV_Logfile(int sv_log, qbool newlog)` newlog=true closes current, opens next numbered `.log` | MATCH |
| no KTX override | ktx/src (grep) | (no hits for sv_maxlogsize) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | clause | enforcing file:line | verbatim snippet | verdict |
|---|--------|--------------------|------------------|---------|
| 1 | "maximum size a server log file may reach before it is closed and a new log file is started, in bytes" | sv_main.c:4177-4178 (threshold) -> sv_ccmds.c:96-97,125 (close+reopen); units: fs.c:809-818 | `if ((int)sv_maxlogsize.value && (FS_FileLength(logs[sv_log].sv_logfile) > (int)sv_maxlogsize.value))` ... `SV_Logfile(sv_log, true)`; FS_FileLength: `fseek(f,0,SEEK_END); end=ftell(f); ... return end;` | MATCH (FS_FileLength returns byte size; on exceed, SV_Logfile(newlog=true) fcloses then fopens. Minor: check is post-write so file rotates once it grows STRICTLY PAST the limit, not exactly "reaches" it -- still-true vagueness, and clause 3 states "grows past" precisely) |
| 2 | "0 = no size limit (the log file grows without being rotated)" | sv_main.c:4177 (short-circuit) | `if ((int)sv_maxlogsize.value && (FS_FileLength(...) > ...))` | MATCH (value 0 -> `(int)0 &&` is false -> rotation block skipped -> never rotates) |
| 3 | "any positive value = once the current log file grows past that many bytes, the server closes it and continues logging to a fresh file" | sv_main.c:4178 (`>`); sv_ccmds.c:96-97 (close), :100 (newlog=true skips early-exit), :112-125 (open new numbered file) | `FS_FileLength(...) > (int)sv_maxlogsize.value` ; `fclose(logs[sv_log].sv_logfile); logs[sv_log].sv_logfile = NULL;` ; `if (!newlog){...return;}` (not taken) ; `logs[sv_log].sv_logfile = fopen(name, "a")` | MATCH (`>` = strictly past; newlog=true closes old AND opens a fresh file. Fresh file uses a new index `<name><port>_<NNNN>.log`, scanning i=0..999 for first free slot -- numbering not mentioned but "a fresh file" is accurate) |
| 4 | "Default: 0" | sv_main.c:128 (init), :3549 (register) | `cvar_t sv_maxlogsize = {"sv_maxlogsize", "0"};` ; `Cvar_Register (&sv_maxlogsize);` | MATCH (registered default string "0"; cvar_t field order name,string,flags,OnChange so flags=0, OnChange=NULL) |
| 5 | "Set by: server config / rcon" | sv_main.c:128 (no flags / no OnChange); cvar.h:66-75 (struct layout) | `{"sv_maxlogsize", "0"}` ; struct `char *name; char *string; int flags; void (*OnChange)...` | MATCH (2-field init leaves flags=0 -> no CVAR_ROM/read-only restriction, no serverinfo gating, no OnChange -> freely settable at runtime via config/rcon) |

**V-pass notes:** All five material clauses enforce-traced to live code at mvdsv 1.11-53-g18d0362; classification TRACED-CLEAN.

Trace chain (registration in sv_main.c, ENFORCEMENT split across two files):
- Registration: sv_main.c:128 `{"sv_maxlogsize", "0"}` + :3549 Cvar_Register. Bare 2-field cvar_t init -> default "0", flags=0, OnChange=NULL (verified field order at cvar.h:66-75). No alternate write path; the only 3 use-sites tree-wide are init/register/enforce.
- Enforcement (threshold + polarity + OFF-state): sv_main.c:4177-4178 inside SV_Write_Log, evaluated AFTER each successful fprintf+fflush. `(int)value && (FS_FileLength(file) > (int)value)`. The leading `(int)value &&` is the OFF-state guard (0 -> no rotation). The `>` is strictly-greater (rotates once size grows PAST the limit).
- Units: FS_FileLength (fs.c:809-818) returns ftell-at-SEEK_END = file size in BYTES. "in bytes" confirmed.
- Rotation side-effect (followed the callee, per discipline): SV_Logfile(sv_log, /*newlog=*/true) in sv_ccmds.c:84-143. With newlog=true: fcloses current file + NULLs it (96-97), does NOT take the !newlog early-exit (100-105), scans i=0..999 for first free `<file_name><port>_<NNNN>.log` (112-118), uses the new index (NOT the !newlog last-index branch at 120-121), fopen(name,"a") (125). So "closes it and continues logging to a fresh file" is exact; the fresh file is a new numbered file per server port.

Only softness: clause-1 phrase "may reach ... before it is closed" -- mechanism is a post-write check so the file actually grows STRICTLY PAST the limit before rotating; clause 3 states "grows past that many bytes" precisely, so the description is self-consistent and the clause-1 vagueness is still-true and was fully traceable. Acceptable under TRACED-CLEAN (no hedge needed). No flavour-C clause: every semantic/polarity/threshold/default/scope/OFF-state/side-effect assertion has a located enforcing line, not name/comment inference.

## flags_for_review

- [fyi/other/vpass] The 'fresh file' is a NEW NUMBERED file per server UDP port: SV_Logfile (sv_ccmds.c:112-118) scans i=0..999 for the first non-existent `<sv_logdir>/<file_name><port>_<NNNN>.log` and fopens it in append mode. The description's 'a new log file is started' / 'a fresh file' is accurate but does not convey (a) the per-port numbered-rotation scheme nor (b) the hard cap of 1000 rotated files per (log-type, port) -- once 1000 indices exist the loop exhausts at i=999 and the file is reused/appended (i is left at 999). This is a v2-shape user-doc so omitting the filename algorithm is correct, not a defect; flagged only so a reviewer is aware rotation is index-capped, not unbounded slot creation.
- [fyi/other/vpass] Threshold uses a check-after-write design (sv_main.c:4166-4182): the size test runs only after a successful fprintf+fflush, so a log file can momentarily exceed sv_maxlogsize by up to one log line before it is rotated. Not a contradiction with the description (clause 3 already says 'grows past that many bytes'), but worth noting the limit is a soft/post-write ceiling, not a hard pre-write cap.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_maxlogsize",
  "type": "cvar",
  "description": "Sets the maximum size a server log file may reach before it is closed and a new log file is started, in bytes.\n\n0 = no size limit (the log file grows without being rotated).\nany positive value = once the current log file grows past that many bytes, the server closes it and continues logging to a fresh file.\n\nDefault: 0.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:4177. Registered src/sv_main.c:128 cvar_t sv_maxlogsize = {\"sv_maxlogsize\", \"0\"} -> default 0. Enforced after each successful log write: src/sv_main.c:4176-4181 flushes the logfile then `if ((int)sv_maxlogsize.value && (FS_FileLength(logs[sv_log].sv_logfile) > (int)sv_maxlogsize.value)) { SV_Logfile(sv_log, true); }`. OFF-state: the leading `(int)sv_maxlogsize.value &&` (src/sv_main.c:4177) short-circuits when 0 -> no rotation. Threshold unit is bytes: FS_FileLength returns ftell()-at-SEEK_END (src/fs.c:809-818), i.e. byte size; rotation fires when length strictly exceeds the value. Rotation action: SV_Logfile(sv_log, true) with newlog=true opens a new numbered log file (src/sv_ccmds.c:84-118 -- closes current, then loops to the next non-existent `%s/%s%d_%04d.log`). Set-by: plain cvar (no special flag), config/rcon. No KTX override (grep of ktx/src for sv_maxlogsize empty).",
  "description_proposed": null
}
```
