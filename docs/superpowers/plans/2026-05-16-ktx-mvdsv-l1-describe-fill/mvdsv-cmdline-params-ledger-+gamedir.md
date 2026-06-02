# describe-fill-synthesis ledger -- mvdsv `+gamedir`

- **project:** mvdsv
- **knob:** `+gamedir` (cmdline_param)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `cmdline-params` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:+gamedir: synthesized -- value flag aliasing -game; loads named gamedir via FS_SetGamedir(force) + publishes *gamedir serverinfo; single-filename only; KTX is the canonical use -- origin=synthesized ref=src/fs.c:559 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Starts the server in a specific game (mod) directory instead of the default. The named directory is loaded on top of the base id1/qw content, and the server reports it in its server info so connecting clients download and use the same mod. This is the standard way to launch a mod such as KTX. The value must be a single directory name, not a path: a value containing '/', '\', ':', or '..' is rejected and the default game directory is kept. '-game <dir>' is an equivalent, older spelling of the same option (if both are given, -game wins).
>
> +gamedir <dir> = load the game directory named <dir> (for example: ktx).
>
> Default: none (server runs the base qw game directory).
> Set by: command line at server launch only.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| parsed; +gamedir is fallback to -game (precedence) | src/fs.c:555-556 | `if (!(i = COM_CheckParm ("-game"))) i = COM_CheckParm ("+gamedir");` | MATCH |
| takes one trailing value (value flag) | src/fs.c:557 | `if (i && i < COM_Argc() - 1)` then `COM_Argv(i + 1)` | MATCH |
| loads the named game dir (force) | src/fs.c:559 | `FS_SetGamedir (COM_Argv(i + 1), true);` | MATCH |
| reported in server info for clients to sync | src/fs.c:561 | `Info_SetValueForStarKey (svs.info, "*gamedir", COM_Argv(i + 1), MAX_SERVERINFO_STRING);` | MATCH |
| value must be single filename, not a path | src/fs.c:457-460 | `if (strstr(dir, "..") || strstr(dir, "/") || strstr(dir, "\\") || strstr(dir, ":")) { Con_Printf ("Gamedir should be a single filename, not a path\n"); return; }` | MATCH |
| default is base qw (id1+qw added first) | src/fs.c:548-549 | `FS_AddGameDirectory(va("%s/%s", fs_basedir, "id1"), ...); FS_AddGameDirectory(va("%s/%s", fs_basedir, "qw"), ...);` | MATCH |
| no KTX override (mod cannot parse cmdline) | ktx/src (grep) | grep `COM_CheckParm`/`+gamedir`/`-game` in ktx/src = empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | "Starts the server in a specific game (mod) directory instead of the default" | src/fs.c:555-559 | `if (!(i = COM_CheckParm ("-game"))) i = COM_CheckParm ("+gamedir"); if (i && i < COM_Argc()-1) { FS_SetGamedir (COM_Argv(i+1), true); ...}` | MATCH |
| 2 | "named directory is loaded on top of the base id1/qw content" | src/fs.c:548-552 (base added) + fs.c:444 -> FS_AddPathHandle fs.c:~408 (`search->next = fs_searchpaths; fs_searchpaths = search;`) | id1+qw added first, base_searchpaths frozen; mod gamedir prepended to HEAD, base still present underneath. Comment fs.c:418 "adds the directory to the head of the path" | MATCH |
| 3 | "server reports it in its server info" (sets *gamedir serverinfo) | src/fs.c:561 | `Info_SetValueForStarKey (svs.info, "*gamedir", COM_Argv(i + 1), MAX_SERVERINFO_STRING);` | MATCH |
| 4 | "so connecting clients download and use the same mod" (gamedir sent in svc_serverdata) | src/sv_user.c:318-320, 435 | `gamedir = Info_ValueForKey (svs.info, "*gamedir"); if (!gamedir[0]) gamedir = "qw";` ... `MSG_WriteString(&sv_client->netchan.message, gamedir);` | MATCH (standard QW protocol gamedir field; client sets gamedir + downloads missing content) |
| 5 | "standard way to launch a mod such as KTX" | src/sv_init.c:423-424 (corroboration) | `// Cheap 'ktx' detection ... strstr(Cvar_String("qwm_name"), "KTX")` | MATCH (domain framing, not a falsifiable code clause; KTX-runs-as-gamedir corroborated, not contradicted) |
| 6 | "value must be a single directory name, not a path: a value containing '/', '\\', ':', or '..' is rejected" | src/fs.c:457-460 | `if (strstr(dir, "..") \|\| strstr(dir, "/") \|\| strstr(dir, "\\") \|\| strstr(dir, ":")) { Con_Printf ("Gamedir should be a single filename, not a path\n"); return; }` | MATCH (all four sentinels '..','/','\\',':' present; verbatim error message) |
| 7 | "and the default game directory is kept" (on rejection) | src/fs.c:460 (early return before FS mutation) | `return;` -- returns before FS_FlushFSHash / searchpath teardown / FS_AddGameDirectory; loaded FS gamedir stays qw | MATCH (loaded FS dir kept; see flag re: *gamedir serverinfo set anyway) |
| 8 | "'-game <dir>' is an equivalent, older spelling of the same option" | src/fs.c:555-556 | `if (!(i = COM_CheckParm ("-game"))) i = COM_CheckParm ("+gamedir");` -- both feed identical FS_SetGamedir+serverinfo path at 559-561 | MATCH |
| 9 | "if both are given, -game wins" | src/fs.c:555-556 + common.c:816 COM_CheckParm | `-game` checked first; if present (returns non-zero index), short-circuits and `+gamedir` is NEVER checked. COM_CheckParm returns first matching index or 0 | MATCH |
| 10 | "+gamedir <dir> = load the game directory named <dir>" / requires a following value | src/fs.c:557 | `if (i && i < COM_Argc() - 1)` -- requires arg at i+1 to exist; bare `+gamedir` with no value is skipped | MATCH |
| 11 | "Default: none (server runs the base qw game directory)" | src/fs.c:549, 557 | `FS_AddGameDirectory(va("%s/%s", fs_basedir, "qw"), FS_LOAD_FILE_ALL);` then override block skipped when i==0 -> stays qw. (Registered as cmdline param, no RegisterCvar default applies) | MATCH |
| 12 | "Set by: command line at server launch only" | src/fs.c:555-556 (sole read-sites, inside FS_InitEx startup) | Tree-wide grep: `"+gamedir"` and `"-game"` each appear at EXACTLY ONE read-site (fs.c:555-556), both in FS_InitEx (launch). Runtime `gamedir`/`sv_gamedir` cmds are separate entities | MATCH |

**V-pass notes:** Oracle confirmed: git describe == "1.11-53-g18d0362". All 12 material clauses enforce-traced to located source lines (and adjacent comments) -- no clause rests on name/enum/string inference. Sole read-sites for BOTH "+gamedir" and "-game" are fs.c:555-556 (verified by tree-wide grep, each exactly one hit), inside FS_InitEx (startup). COM_CheckParm (common.c:816) returns the FIRST matching argv index or 0, which makes the "-game wins" short-circuit (line 555 sets i from -game, only falling through to +gamedir when -game returns 0) correct. Rejection set at fs.c:457 contains all four sentinels the description names ('..','/','\\',':'), with the verbatim "single filename, not a path" message. Head-of-path stacking confirmed via FS_AddPathHandle prepend (search->next = fs_searchpaths; fs_searchpaths = search), so the mod loads "on top of" id1/qw which remain underneath. Client propagation traced through svc_serverdata (sv_user.c:435) -- the standard QW gamedir field, defaulting to "qw" when *gamedir is empty (sv_user.c:319). Classification TRACED-CLEAN: every material clause maps to a verified enforcing line; the one non-code clause (#5 "standard way to launch KTX") is accurate domain framing corroborated (not contradicted) by sv_init.c:423-424 KTX-via-gamedir detection. See flags for one latent serverinfo edge-case that does NOT contradict the description as written.

## flags_for_review

- [fyi/suspected-bug/vpass] Latent serverinfo inconsistency on rejected path values at startup. At fs.c:557-562 the order is FS_SetGamedir(COM_Argv(i+1), true) THEN Info_SetValueForStarKey(svs.info, "*gamedir", COM_Argv(i+1), ...) UNCONDITIONALLY. If +gamedir/-game is given a rejected value (e.g. 'foo/bar' containing '/'), FS_SetGamedir returns early at fs.c:460 WITHOUT changing the filesystem (loaded gamedir correctly stays qw -- so the description's 'default game directory is kept' clause is TRUE), but line 561 still writes the rejected string 'foo/bar' into the *gamedir serverinfo key. Result: the loaded FS gamedir (qw) and the reported *gamedir serverinfo ('foo/bar') would diverge, and that bad string is what gets sent to clients via svc_serverdata. The adjacent comment '// FIXME: move in FS_SetGamedir() instead!!!' (fs.c:560) flags this exact ordering issue. This does NOT contradict any clause in the proposed description (which only claims the loaded/default dir is kept, and does not assert serverinfo behavior in the rejected case), so it does not change the TRACED-CLEAN verdict -- recording as an off-scope source observation in case the operator wants the description to mention it or wants it noted as an upstream nit.
- [fyi/off-scope-entity/vpass] Off-scope entity boundary note (not a defect): mvdsv also exposes runtime gamedir-changing commands 'gamedir' (SV_Gamedir_f, sv_ccmds.c:1660) and 'sv_gamedir' (sv_ccmds.c:~1555, sets the 'fake' *gamedir only). The proposed description's 'Set by: command line at server launch only' is correct FOR THE +gamedir cmdline param specifically -- those runtime commands are SEPARATE oracle entities and are not in scope for this knob. Flagging only so the reader does not mistake 'launch only' as a claim that gamedir can never change at runtime via OTHER entities.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: -nohwtimer=C-FIX, -heapsize=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "+gamedir",
  "type": "cmdline_param",
  "description": "Starts the server in a specific game (mod) directory instead of the default. The named directory is loaded on top of the base id1/qw content, and the server reports it in its server info so connecting clients download and use the same mod. This is the standard way to launch a mod such as KTX. The value must be a single directory name, not a path: a value containing '/', '\\', ':', or '..' is rejected and the default game directory is kept. '-game <dir>' is an equivalent, older spelling of the same option (if both are given, -game wins).\n\n+gamedir <dir> = load the game directory named <dir> (for example: ktx).\n\nDefault: none (server runs the base qw game directory).\nSet by: command line at server launch only.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/fs.c:559. Parse + value-consume at fs.c:555-557: `-game` is checked first, `+gamedir` is the fallback (`if (!(i = COM_CheckParm(\"-game\"))) i = COM_CheckParm(\"+gamedir\");`), guarded `if (i && i < COM_Argc() - 1)` -> takes ONE trailing value (value flag, not bare boolean). Enforcing read-site fs.c:559 `FS_SetGamedir(COM_Argv(i + 1), true)` -- the `true` is the force flag. fs.c:561 `Info_SetValueForStarKey(svs.info, \"*gamedir\", COM_Argv(i+1), ...)` enforces the 'reports it in server info' clause (the `*` star-key is the serverinfo mechanism clients read to sync the gamedir; user-observable consequence stated, mechanism kept out of description per D20). Single-filename restriction enforced in callee FS_SetGamedir fs.c:457 `if (strstr(dir,\"..\")||strstr(dir,\"/\")||strstr(dir,\"\\\\\")||strstr(dir,\":\")) { Con_Printf(\"Gamedir should be a single filename, not a path\\n\"); return; }` -- followed the call chain into the callee per B1. -game/+gamedir equivalence + precedence traced to the two-line COM_CheckParm fallback at fs.c:555-556. fs.c is shared (both Unix sv_sys_unix.c and Windows builds) -- not platform-gated. F-MV1: KTX is a server-side QVM mod with no access to engine cmdline parsing (grep of ktx/src for COM_CheckParm/the flag literals is empty) -> no override; live engine behavior documented. Default 'base qw' from fs.c:548-549 which always AddGameDirectory id1+qw before any -game/+gamedir override.",
  "description_proposed": null
}
```
