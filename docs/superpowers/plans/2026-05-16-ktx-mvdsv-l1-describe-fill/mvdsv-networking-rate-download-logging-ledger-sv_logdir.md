# describe-fill-synthesis ledger -- mvdsv `sv_logdir`

- **project:** mvdsv
- **knob:** `sv_logdir` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_logdir: synthesized -- directory for all server log files, auto-created, ".." rejected; enforced at log-path build -- origin=synthesized ref=src/sv_ccmds.c:114 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the directory in which the server writes its log files (console, rcon, frag, player and other logs). The directory is created automatically if it does not already exist.
>
> Default: . (the server's working directory).
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default "." | src/sv_main.c:131 | `cvar_t sv_logdir = {"sv_logdir", ".", 0, OnChange_logdir_var};` | MATCH |
| used as the directory prefix of the log file path | src/sv_ccmds.c:114 | `snprintf(name, ..., "%s/%s%d_%04d.log", sv_logdir.string, ...)` | MATCH |
| governs all log types (single open path) | src/sv_ccmds.c:150-214 | SV_Logfile_f / SV_RconLogfile_f / SV_FragLogfile_f / SV_PlayerLogfile_f / ... all call SV_Logfile | MATCH |
| directory created if missing | src/sv_main.c:3881-3882 | `if (value[0]) Sys_mkdir (value);` | MATCH |
| rejects paths containing ".." | src/sv_main.c:3875-3878 | `if (strstr(value, "..")) { *cancel = true; return; }` | MATCH |
| no KTX override | ktx/src (grep) | (no hits for sv_logdir) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Sets the directory in which the server writes its log files" | src/sv_ccmds.c:114 (and :121) | `snprintf (name, sizeof(name), "%s/%s%d_%04d.log", sv_logdir.string, logs[sv_log].file_name, sv_port, i);` | MATCH — cvar string is the directory prefix for every constructed log path |
| 2 | "(console, rcon, frag, player and other logs)" | src/sv_ccmds.c:217-226 | `log_t logs[MAX_LOG] = { {NULL,"logfile","qconsole_",...,"console",...}, {..."logerrors","qerror_",...}, {..."logrcon","rcon_",...,"rcon",...}, {..."logtelnet","qtelnet_",...}, {..."fraglogfile","frag_",...,"frags",...}, {..."logplayers","player_",...,"players",...}, {..."modfraglogfile","modfrag_",...} }` | MATCH — 7 log types; console/rcon/frags/players all present, errors/telnet/modfrags = "other logs"; all route through SV_Logfile to the sv_logdir-prefixed path |
| 3 | "directory is created automatically if it does not already exist" | src/sv_main.c:3881-3882 (callee src/sv_sys_unix.c:79 / src/sv_sys_win.c:133) | `if (value[0]) Sys_mkdir (value);` ; `if (mkdir (path, 0777) != -1) return; if (qerrno != EEXIST) Sys_Error(...)` ; `_mkdir(path);` | MATCH — OnChange fires Sys_mkdir on non-empty set; unix treats EEXIST as success (idempotent), win _mkdir same |
| 4 | "Default: . (the server's working directory)" | src/sv_main.c:131 | `cvar_t  sv_logdir = {"sv_logdir", ".", 0, OnChange_logdir_var};` | MATCH — registered default string is "." |
| 5 | "Set by: server config / rcon" | src/sv_main.c:131 (flag field) ; src/cvar.h:61 | flag field `0` ; `#define CVAR_NONE (0)` | MATCH — CVAR_NONE, no CVAR_ROM; settable via normal console/config/rcon dispatch; no Cvar_SetROM/lock at any of the 5 use-sites |
| reg | Registration site | src/sv_main.c:3551 | `Cvar_Register (&sv_logdir);` | MATCH — registered (gated nowhere; plain server cvar) |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362.

WI-1 wide read: exactly 5 use-sites of sv_logdir tree-wide (sv_ccmds.c:30 extern decl, sv_ccmds.c:114 + :121 consumer snprintf, sv_main.c:131 registration/default, sv_main.c:3551 Cvar_Register). All 5 read; no untraced callee. The OnChange handler (sv_main.c:3873-3883) is the side-effect enforcer for the "created automatically" clause; followed into Sys_mkdir on BOTH platforms (callee-follow per discipline).

All five material clauses map to a located, verified enforcing line incl. adjacent code. Default verified against the REGISTERED cvar_t initializer (WI-2), not a shipped cfg. Settability verified against the flag field (0 = CVAR_NONE, cvar.h:61) plus absence of any Cvar_SetROM/lock across all use-sites (WI-2 access-class discipline) — not inferred from the knob name.

Clause 2 "and other logs" is a deliberate generalization, not an inference defect: the logs[] table proves 7 distinct log categories all flow through the same SV_Logfile path that uses sv_logdir.string as prefix, so the catch-all is fully backed (it under-claims rather than over-claims). PROC-1: no judgment residue — every residual reduced to a checkable fact at its enforcing line.

Result: TRACED-CLEAN. No clause is name/enum/string/comment-only inference; no clause contradicts its enforcing line; metadata (default + settability) correct.

## flags_for_review

- [fyi/other/synthesis] OnChange_logdir_var (src/sv_main.c:3875-3878) sets *cancel=true when the new value contains the substring ".." anywhere -- a path-traversal guard. I left this out of the user-facing description as an admin-observable edge (the cvar simply refuses to change to such a value) rather than a security-internals clause; noting it so a reviewer can decide whether the rejection behavior warrants an explicit user-facing line.
- [fyi/other/vpass] Undocumented behavioral constraint on sv_logdir (not a description defect): OnChange_logdir_var (src/sv_main.c:3875-3879) silently REJECTS any value containing the substring ".." via `if (strstr(value, "..")) { *cancel = true; return; }` — a path-traversal guard that also blocks the literal ".." parent-dir token. The proposed description does not mention this. It is not WRONG (the text makes no claim that arbitrary values are accepted), so it does not change the TRACED-CLEAN verdict, but a maximally-complete user-doc could note that values containing ".." are silently ignored (the set is cancelled and the old value retained).
- [fyi/other/vpass] Minor scope nuance on the "created automatically" clause: Sys_mkdir is non-recursive (single mkdir/_mkdir, not mkdir -p). A multi-level path like "logs/2026/06" whose intermediate components don't exist would fail to create the leaf (unix: Sys_Error on a non-EEXIST errno such as ENOENT; win: _mkdir silently fails). The description's single-level "directory is created automatically" is accurate for the normal one-component case and does not over-claim recursion, so no defect — flagged only as a precision boundary.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_logdir",
  "type": "cvar",
  "description": "Sets the directory in which the server writes its log files (console, rcon, frag, player and other logs). The directory is created automatically if it does not already exist.\n\nDefault: . (the server's working directory).\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:114. Registered src/sv_main.c:131 cvar_t sv_logdir = {\"sv_logdir\", \".\", 0, OnChange_logdir_var} -> default \".\". Enforced as the directory prefix when a log file path is built: src/sv_ccmds.c:114 `snprintf(name, sizeof(name), \"%s/%s%d_%04d.log\", sv_logdir.string, logs[sv_log].file_name, sv_port, i);` (and the last-log variant at src/sv_ccmds.c:121). SV_Logfile is the single open path for every log type (CONSOLE_LOG / RCON_LOG / FRAG_LOG / PLAYER_LOG / ERROR_LOG / TELNET_LOG / MOD_FRAG_LOG via the SV_*Logfile_f handlers, src/sv_ccmds.c:150-214), so the dir governs all of them. Auto-create + traversal guard: OnChange_logdir_var (src/sv_main.c:3873-3883) sets *cancel when the value contains \"..\" (rejecting the change) and otherwise calls Sys_mkdir(value) to create the directory. Default \".\" = current working directory of the server process. Set-by: plain cvar (flags arg 0), config/rcon. No KTX override (grep of ktx/src for sv_logdir empty).",
  "description_proposed": null
}
```
