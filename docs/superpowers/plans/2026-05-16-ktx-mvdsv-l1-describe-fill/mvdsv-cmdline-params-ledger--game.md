# describe-fill-synthesis ledger -- mvdsv `-game`

- **project:** mvdsv
- **knob:** `-game` (cmdline_param)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `cmdline-params` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:-game: synthesized -- value flag (one dir arg); sets startup gamedir on top of id1/qw, +gamedir alias with -game priority; both builds; no KTX override -- origin=synthesized ref=src/fs.c:559 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Selects the game directory (mod) the server starts in, loaded on top of the default id1 and qw directories. Equivalent to setting the gamedir at startup; +gamedir does the same thing, and -game takes priority if both are given.
>
> -game <dir> = start in game directory <dir>.
>
> Default: none (server starts in qw).
> Set by: launch flag (takes one directory-name argument).
>
> Example: mvdsv -game ktx

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| recognized, -game checked first | src/fs.c:555 | `if (!(i = COM_CheckParm ("-game")))` | MATCH |
| +gamedir alias, only if -game absent => -game priority | src/fs.c:556 | `i = COM_CheckParm ("+gamedir");` | MATCH |
| requires following arg | src/fs.c:557 | `if (i && i < COM_Argc() - 1)` | MATCH |
| takes ONE trailing value (dir name) | src/fs.c:559 | `FS_SetGamedir (COM_Argv(i + 1), true);` | MATCH |
| loaded on top of default id1/qw | src/fs.c:548-549 | id1/qw FS_AddGameDirectory precede the -game block | MATCH |
| also published to serverinfo *gamedir | src/fs.c:561 | `Info_SetValueForStarKey (svs.info, "*gamedir", COM_Argv(i + 1), MAX_SERVERINFO_STRING);` | MATCH |
| both builds (no SERVERONLY/#if 0 guard) | src/fs.c:516-563 | FS_InitEx not inside SERVERONLY/#if 0 | MATCH |
| F-MV1 no KTX override | ktx/src | grep COM_CheckParm = 0 hits | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| C1 | Selects the game directory (mod) the server starts in | src/fs.c:555,559 | `if (!(i = COM_CheckParm ("-game"))) ... FS_SetGamedir (COM_Argv(i + 1), true);` | MATCH |
| C2 | Loaded on top of the default id1 and qw directories | src/fs.c:548-549,552,559 | `FS_AddGameDirectory(.../"id1"...); FS_AddGameDirectory(.../"qw"...); fs_base_searchpaths = fs_searchpaths; ... FS_SetGamedir(...)` — FS_SetGamedir (fs.c:473) frees searchpaths only down to fs_base_searchpaths (id1+qw retained) then FS_AddGameDirectory adds new dir to head of path | MATCH |
| C3 | Equivalent to setting the gamedir at startup | src/fs.c:559 → fs.c:455 FS_SetGamedir | `FS_SetGamedir (COM_Argv(i + 1), true);` — same routine the runtime `gamedir` command uses (sv_ccmds.c:1657 wrapper) | MATCH |
| C4 | +gamedir does the same thing | src/fs.c:555-561 | `if (!(i = COM_CheckParm ("-game"))) i = COM_CheckParm ("+gamedir"); if (i && ...) FS_SetGamedir(COM_Argv(i+1), true); Info_SetValueForStarKey(svs.info,"*gamedir",...)` — both flags funnel into identical `i`-consuming path | MATCH |
| C5 | -game takes priority if both are given | src/fs.c:555-556 + common.c:816 COM_CheckParm | `if (!(i = COM_CheckParm ("-game"))) i = COM_CheckParm ("+gamedir");` — when -game present, COM_CheckParm returns non-zero, `!(...)` false, +gamedir never evaluated; -game's arg wins | MATCH |
| C6 | Default: none (server starts in qw) | src/fs.c:549,557-562; corroborated sv_demo.c:1217-1219 | No flag → lines 557-562 skipped → FS_SetGamedir not called → fs_gamedir stays at last default `qw` (fs.c:549) and `*gamedir` serverinfo stays empty (`gamedir = Info_ValueForKey(svs.info,"*gamedir"); if (!gamedir[0]) gamedir = "qw";`) | MATCH |
| C7 | Set by launch flag, takes one directory-name argument | src/fs.c:557,559 | `if (i && i < COM_Argc() - 1) { FS_SetGamedir (COM_Argv(i + 1), true);` — guard requires one following arg; exactly COM_Argv(i+1) consumed | MATCH |

**V-pass notes:** All 7 clauses enforcement-traced to live source and MATCH. Single enforcing site for -game is src/fs.c:555 (FS_InitEx), reached via FS_Init <- Host_Init (sv_main.c:3969). mvdsv is dedicated-server-only, so there is no divergent client-side -game path; only one string literal of "-game" exists in code (fs.c:555) plus one doc-comment (fs.c:35). 

Priority clause (C5) verified rigorously against COM_CheckParm (common.c:816): it returns the first matching argv index or 0; the `!(i = ...)` short-circuit guarantees +gamedir is only consulted when -game is absent, so -game wins when both are present. This is the highest-risk clause (an inferred polarity/priority claim) and it is correct.

Base-layer claim (C2) verified through the FS_SetGamedir teardown: it frees searchpaths only down to fs_base_searchpaths, which is snapshotted AFTER id1+qw are added (fs.c:552), so id1 and qw survive and the chosen dir is pushed to the head of the path (FS_AddGameDirectory via FS_AddPathHandle). The file's own header comment (fs.c:33-35) independently states the game directory is "the first tree on the search path" and "can be overridden with the -game command line parameter" — comment agrees with code (no inversion).

OFF-state (C6) double-confirmed: with no flag, fs_gamedir remains the last default-added "qw" and the *gamedir serverinfo key is left empty; the demo subsystem (sv_demo.c:1218-1219) explicitly substitutes literal "qw" for an empty *gamedir, matching "server starts in qw".

No flavour-C inference detected: every semantic/polarity/scope/default/OFF-state clause maps to a located enforcing line plus corroborating adjacent comment.

## flags_for_review

- [fyi/other/synthesis] -game also publishes the chosen gamedir into serverinfo at fs.c:561 via Info_SetValueForStarKey(svs.info, "*gamedir", ...). The adjacent comment `// FIXME: move in FS_SetGamedir() instead!!!` indicates the maintainers consider this a misplaced side-effect. Not a documented behavior change for the admin (the gamedir is set either way), but noting the FIXME and the dual *gamedir publish in case it matters for a serverinfo/runtime-gamedir-switch audit.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: -nohwtimer=C-FIX, -heapsize=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "-game",
  "type": "cmdline_param",
  "description": "Selects the game directory (mod) the server starts in, loaded on top of the default id1 and qw directories. Equivalent to setting the gamedir at startup; +gamedir does the same thing, and -game takes priority if both are given.\n\n-game <dir> = start in game directory <dir>.\n\nDefault: none (server starts in qw).\nSet by: launch flag (takes one directory-name argument).\n\nExample: mvdsv -game ktx",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/fs.c:559. Value flag, both builds (fs.c, no SERVERONLY/#if 0 guard around FS_InitEx). Parse + alias precedence: src/fs.c:555 `if (!(i = COM_CheckParm (\"-game\")))` then fs.c:556 `i = COM_CheckParm (\"+gamedir\");` -- -game is checked first; +gamedir is only consulted when -game is absent, so -game takes priority => +gamedir is an equivalent alias with -game winning ties. fs.c:557 `if (i && i < COM_Argc() - 1)` requires a following arg. Value-read: src/fs.c:559 `FS_SetGamedir (COM_Argv(i + 1), true);` reads ONE trailing value as the gamedir name (TRAP-2 consumer confirmed); fs.c:561 also publishes it to serverinfo `*gamedir`. Loads on top of defaults: the default id1+qw dirs are added at fs.c:548-549 BEFORE this block, and FS_SetGamedir (fs.c:480-496) appends the named dir. Absent => no extra gamedir set (server stays on qw). F-MV1: KTX has zero COM_CheckParm references (.so mod) -- no override; KTX is itself a typical -game/+gamedir target, not an interceptor.",
  "description_proposed": null
}
```
