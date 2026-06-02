# describe-fill-synthesis ledger -- mvdsv `sv_onRecordFinish`

- **project:** mvdsv
- **knob:** `sv_onRecordFinish` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_onRecordFinish: synthesized -- runs a named .qws server script per finished demo (kept only), passing demo path+filename + trailing params; empty=nothing -- origin=synthesized ref=sv_demo_misc.c:228 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Names a server-side script to run automatically each time an MVD demo finishes recording. When set, as each recorded demo file is closed the server runs the named script (a .qws script file on the server host) and passes it the demo's path and filename. Demos that are being deleted rather than kept do not trigger it.
>
> "" (empty) = run nothing when a recording finishes.
> any value = name of the script to run; a space-separated suffix is passed through as extra arguments after the demo path and filename.
>
> Default: "".
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered default empty | sv_demo.c:49 | cvar_t sv_onrecordfinish = {"sv_onRecordFinish", ""} | MATCH |
| runs on recording finish, non-empty | sv_demo_misc.c:211 | if (sv_onrecordfinish.string[0] && !destroyfiles) | MATCH |
| runs script with demo path + filename | sv_demo_misc.c:228 | Cmd_TokenizeString(va("script %s \"%s\" \"%s\" %s", sv_onrecordfinish.string, dest_path, path, p?p+1:"")) | MATCH |
| fired per closed file demo (not streams) | sv_demo.c:306-307 | if (dt != DEST_STREAM && dest_name[0]) Run_sv_demotxt_and_sv_onrecordfinish(...) | MATCH |
| deleted demos do not trigger it | sv_demo_misc.c:211 | && !destroyfiles // dont gzip deleted demos | MATCH |
| space-suffix passed as extra args | sv_demo_misc.c:217-218,228 | if ((p = strchr(...string, ' '))) *p = 0; // strip parameters; ... p+1 | MATCH |
| value is a server-side .qws script | sv_main.c:2864,2866 | Sys_Printf("Running %s.qws"); Sys_Script(path,...) | MATCH |
| empty -> nothing runs | sv_demo_misc.c:211 | sv_onrecordfinish.string[0] false when empty | MATCH |
| run from console context | sv_demo_misc.c:227 | sv_redirected = RD_NONE; // onrecord script is called always from the console | MATCH |
| KTX no override | ktx/src (grep) | no sv_onRecordFinish ref; no 'script' override | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Names a server-side script run automatically each time an MVD demo finishes recording | src/sv_demo_misc.c:211 (guard) + src/sv_demo.c:307 (call from DestCloseAllFlush, reached via SV_MVDStop) | `if (sv_onrecordfinish.string[0] && !destroyfiles)` ... call: `Run_sv_demotxt_and_sv_onrecordfinish (dest_name, dest_path, destroyfiles);` | MATCH |
| 2 | As each recorded demo file is closed, the server runs the named script | src/sv_demo.c:303,307 (inside per-dest `while (d)` loop in DestCloseAllFlush) | `DestClose(d, destroyfiles);` ... `if (dt != DEST_STREAM && dest_name[0]) Run_sv_demotxt_and_sv_onrecordfinish (...)` | MATCH |
| 3 | The script is a .qws script file on the server host | src/sv_sys_unix.c:521 / src/sv_sys_win.c:681 (Sys_Script, the run callee) | unix: `strlcat(exec_path, ".qws", sizeof(exec_path));` ; win: `snprintf(cmdline,...,"%s\\sh.exe %s.qws %s", curdir, path, args);` | MATCH (enforced in callee, not name-inferred) |
| 4 | Passes it the demo's path and filename | src/sv_demo_misc.c:220-228 (path=dest_name ext-stripped; dest_path=dir) -> SV_Script_f src/sv_main.c:2853-2866 | `strlcpy(path, dest_name, sizeof(path));` `COM_StripExtension(...)` `Cmd_TokenizeString(va("script %s \"%s\" \"%s\" %s", sv_onrecordfinish.string, dest_path, path, ...));` then `Sys_Script(path_argv1, va("%d %s", sv_redirected, p));` | MATCH (minor: filename is extension-stripped; a leading sv_redirected int precedes them -- see flags) |
| 5 | Demos being deleted rather than kept do not trigger it | src/sv_demo_misc.c:211 (guard + comment) ; src/sv_demo.c:949 vs 986 (destroyfiles source) | `if (sv_onrecordfinish.string[0] && !destroyfiles) // dont gzip deleted demos` ; cancel/error: `DestCloseAllFlush(true, mvdonly);` vs normal stop: `DestCloseAllFlush(false, mvdonly);` | MATCH |
| 6 | "" (empty) = run nothing when a recording finishes | src/sv_demo_misc.c:211 | `if (sv_onrecordfinish.string[0] ...)` -- empty string's first char is NUL -> guard false -> block skipped | MATCH |
| 7 | any value = script name; space-separated suffix passed as extra args after path+filename | src/sv_demo_misc.c:217-218,228,230-231 | `if ((p = strchr(sv_onrecordfinish.string, ' ')) != NULL) *p = 0; // strip parameters` ... `va(... %s", ..., p != NULL ? p+1 : "")` ... `if (p) *p = ' '; // restore params` | MATCH |
| 8 | Default: "" | src/sv_demo.c:49 (definition) + src/sv_demo.c:1853 (Cvar_Register) | `cvar_t sv_onrecordfinish = {"sv_onRecordFinish", ""};` ; `Cvar_Register (&sv_onrecordfinish);` | MATCH (WI-2: verified against registered default, not a shipped cfg) |
| 9 | Set by: server config / rcon | src/sv_demo.c:49 (2-field struct, no CVAR_ROM/USERINFO/access flag) + :1853 Cvar_Register | `{"sv_onRecordFinish", ""}` -- plain cvar, no ROM/serverinfo/access flag -> settable like any sv_ cvar | MATCH |

**V-pass notes:** VERSION CONFIRMED: git describe --tags == 1.11-53-g18d0362.

Full enforcement chain traced end to end (registration in sv_demo.c -> guard in sv_demo_misc.c -> dispatch SV_Script_f in sv_main.c -> run callee Sys_Script in sv_sys_unix.c / sv_sys_win.c). Single call site of the runner (sv_demo.c:307); single registration; no cross-mod override (mvdsv server cvar, not exposed to mods or KTX). Every material clause (trigger, .qws, args, deleted-demo skip, OFF-state, default, settability) maps to a located enforcing line whose code AND adjacent comments match the assertion.

Two precision nuances, both BELOW user-doc altitude and NOT contradictions (hence TRACED-CLEAN, not C-NEAR-MISS):
(a) The "filename" passed is extension-STRIPPED -- COM_StripExtension removes the .mvd (sv_demo_misc.c:222/224), so the script gets the basename without extension, not the literal on-disk filename. The description's plain-English "filename" is true at the action level.
(b) SV_Script_f prepends a leading positional arg BEFORE path+filename: `Sys_Script(path, va("%d %s", sv_redirected, p))` (sv_main.c:2866) -- the redirect-context integer (forced to RD_NONE at sv_demo_misc.c:227 for the onRecordFinish path, so the script sees "0" as its first arg). The description omits this leading int. It is an internal calling-convention detail, not a wrong claim about path/filename.

Arg-order sanity check (not inverted): va() passes dest_path (directory) as positional 1 then path (ext-stripped name) as positional 2; description's "path and filename" maps directory->path, name->filename correctly.

Settability (clause 9) verified structurally: 2-field cvar_t with no CVAR_ROM / CVAR_SERVERINFO / access flag, registered via plain Cvar_Register -- behaves as a normal server cvar settable from config/rcon. This is the engine's general cvar model rather than a knob-specific enforcing branch, so it is a model-consistency MATCH rather than a dedicated-line trace.

## flags_for_review

- [fyi/other/vpass] SV_Script_f passes a leading redirect-context integer to the script before the path/filename args (sv_main.c:2866 `Sys_Script(path, va("%d %s", sv_redirected, p))`). For the onRecordFinish path sv_redirected is forced to RD_NONE just before (sv_demo_misc.c:227), so a script written for sv_onRecordFinish actually sees: arg1=0 (redirect enum), arg2=demo directory, arg3=demo basename-no-ext, arg4+=user suffix. The proposed description omits the leading integer. Below user-doc altitude, not a defect -- FYI for anyone documenting the exact script ABI.
- [fyi/other/vpass] The 'filename' handed to the script is extension-stripped (COM_StripExtension at sv_demo_misc.c:222/224 removes .mvd), so it is the basename without extension, not the literal on-disk file name. Plain-English 'filename' reads fine; flagged only so a future precision pass does not 'correct' the description toward 'full filename' (which would be wrong).

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_onRecordFinish",
  "type": "cvar",
  "description": "Names a server-side script to run automatically each time an MVD demo finishes recording. When set, as each recorded demo file is closed the server runs the named script (a .qws script file on the server host) and passes it the demo's path and filename. Demos that are being deleted rather than kept do not trigger it.\n\n\"\" (empty) = run nothing when a recording finishes.\nany value = name of the script to run; a space-separated suffix is passed through as extra arguments after the demo path and filename.\n\nDefault: \"\".\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_demo_misc.c:228. Registration cvar_t sv_onrecordfinish = {\"sv_onRecordFinish\", \"\"} at sv_demo.c:49 (default empty), registered sv_demo.c:1853. ENFORCING read: sv_demo_misc.c:211 `if (sv_onrecordfinish.string[0] && !destroyfiles)` then sv_demo_misc.c:228 Cmd_TokenizeString(va(\"script %s \\\"%s\\\" \\\"%s\\\" %s\", sv_onrecordfinish.string, dest_path, path, p != NULL ? p+1 : \"\")) followed by :233 SV_Script_f(). This lives in Run_sv_demotxt_and_sv_onrecordfinish (sv_demo_misc.c:185), whose caller sv_demo.c:307 invokes it per closed demo destination -- guarded sv_demo.c:306 `if (dt != DEST_STREAM && dest_name[0])` (file demos only, not live streams), inside the dest-close loop that runs when recording stops. Hence 'each time a demo finishes recording', per file. ARGS: dest_path (the demo's path) and path (the demo's filename with extension stripped, :220-225 strlcpy+COM_StripExtension). PARAM PASS-THROUGH + the !destroyfiles guard: :217-218 `if ((p = strchr(sv_onrecordfinish.string, ' ')) != NULL) *p = 0; // strip parameters` splits the script name from a trailing param suffix, which is re-appended as `p+1` at :228; :230-231 restores the space. 'destroyfiles' = demo being deleted -> :211 guard skips the hook (comment :211 'dont gzip deleted demos'). 'script' = SV_Script_f -> Sys_Script runs <name>.qws on host (sv_main.c:2864,2866). Redirect forced to console :227. OFF-state: empty -> string[0] false -> no script. Set-by: not on rcon blocklist (sv_main.c:1748-1762). F-MV1: KTX no reference to this cvar, no 'script' command override (grep ktx/src). All clauses TRACED-CLEAN.",
  "description_proposed": null
}
```
