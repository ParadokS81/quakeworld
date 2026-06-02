# describe-fill-synthesis ledger -- mvdsv `-basedir`

- **project:** mvdsv
- **knob:** `-basedir` (cmdline_param)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `cmdline-params` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:-basedir: synthesized -- value flag (one path arg); sets game-file root, default cwd "."; both builds; no KTX override -- origin=synthesized ref=src/fs.c:527 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the root directory the server loads its game files from. The server looks for the id1, qw, and any mod directories underneath this path. The given path may use either forward or back slashes, and a trailing slash is ignored.
>
> -basedir <path> = use <path> as the base directory.
>
> Default: the directory the server was started from (".").
> Set by: launch flag (takes one path argument).
>
> Example: mvdsv -basedir /home/quake

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| recognized + requires following arg | src/fs.c:523 | `if ((i = COM_CheckParm ("-basedir")) && i < COM_Argc() - 1)` | MATCH |
| takes ONE trailing value (path) | src/fs.c:527 | `strlcpy (fs_basedir, COM_Argv(i + 1), sizeof(fs_basedir));` | MATCH |
| default = "." (cwd) when absent | src/fs.c:534 | `strlcpy (fs_basedir, ".", sizeof(fs_basedir));` (else branch; #if 0 cwd path disabled) | MATCH |
| base for id1/qw/mod loads | src/fs.c:548-549 | `FS_AddGameDirectory(va("%s/%s", fs_basedir, "id1"), ...)` / `(... "qw" ...)` | MATCH |
| slashes interchangeable (backslash->slash) | src/fs.c:539 | `for (s = fs_basedir; (s = strchr(s, '\\')); s++) *s = '/';` | MATCH |
| trailing slash ignored | src/fs.c:543-545 | `i = (int)strlen(fs_basedir) - 1; if (i >= 0 && fs_basedir[i] == '/') fs_basedir[i] = 0;` | MATCH |
| both builds (no SERVERONLY/#if 0 guard) | src/fs.c:516-563 | FS_InitEx not inside SERVERONLY/#if 0 | MATCH |
| F-MV1 no KTX override | ktx/src | grep COM_CheckParm = 0 hits | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | Sets the root directory the server loads its game files from | src/fs.c:527, 548-549 | `strlcpy (fs_basedir, COM_Argv(i + 1), sizeof(fs_basedir));` ... `FS_AddGameDirectory(va("%s/%s", fs_basedir, "id1"), FS_LOAD_FILE_ALL);` / `..., "qw"), ...` | MATCH |
| 2 | Server looks for id1, qw, and any mod dirs underneath this path | src/fs.c:548 (id1), 549 (qw), 493 (mod via FS_SetGamedir) | `FS_AddGameDirectory(va("%s/%s", fs_basedir, "id1"), ...)` / `..., "qw"), ...` / FS_SetGamedir: `FS_AddGameDirectory(va("%s/%s", fs_basedir, dir), FS_LOAD_FILE_ALL);` | MATCH |
| 3 | Path may use forward or back slashes | src/fs.c:538-540 | `// replace backslahes with slashes.` / `for (s = fs_basedir; (s = strchr(s, '\\')); s++)` / `*s = '/';` | MATCH |
| 4 | A trailing slash is ignored | src/fs.c:542-545 | `// remove terminating slash if any.` / `i = (int)strlen(fs_basedir) - 1;` / `if (i >= 0 && fs_basedir[i] == '/')` / `fs_basedir[i] = 0;` | MATCH (minor: strips a single trailing `/`; runs after `\`->`/` conversion so a trailing `\` is also dropped) |
| 5 | `-basedir <path>` takes one path argument | src/fs.c:523, 527 + common.c:816-827 | `if ((i = COM_CheckParm ("-basedir")) && i < COM_Argc() - 1)` ... `strlcpy (fs_basedir, COM_Argv(i + 1), ...)` | MATCH |
| 6 | Default: directory server started from (".") | src/fs.c:529-535 | `else { ... strlcpy (fs_basedir, ".", sizeof(fs_basedir)); ... }` | MATCH (".": cwd = launch dir; `#if 0` Sys_getcwd alt confirms intent; no quakeparms pre-seed exists) |
| 7 | Set by: launch flag (one path argument) | src/fs.c:523 + common.c:816 | `COM_CheckParm ("-basedir")` (cmdline parm, not a cvar) | MATCH |

**V-pass notes:** Oracle confirmed at 1.11-53-g18d0362. Entire enforcement surface for -basedir lives in src/fs.c::FS_InitEx (lines 516-563); only two files mention basedir (fs.c + vfs.h, the latter comments only). Every clause traces to a located enforcing line with matching adjacent comments — classified TRACED-CLEAN.

Per-clause trace:
- C1/C2 (root dir + id1/qw/mod underneath): fs_basedir is the prefix for ALL game-dir loads. id1 (fs.c:548) and qw (fs.c:549) are hardcoded as `fs_basedir/<name>`. Mod dirs arrive via `-game`/`+gamedir` (fs.c:555-557) -> FS_SetGamedir -> FS_AddGameDirectory(`%s/%s`, fs_basedir, dir) at fs.c:493. So "underneath this path" is enforced for all three. The header doc-comment fs.c:27-28 independently confirms "base directory is the path to the directory holding ... all game directories."
- C3 (forward or back slashes): fs.c:539-540 converts every `\` to `/`, so both forms work. Enforced.
- C4 (trailing slash ignored): fs.c:543-545 removes a single trailing `/`. Because backslash conversion (539-540) precedes it, a trailing `\` is normalized to `/` and then stripped too. The user-facing claim holds; only-single-slash and ordering are still-true minor vagueness, traceable -> acceptable under TRACED-CLEAN.
- C5/C7 (one path argument / launch flag): COM_CheckParm (common.c:816) is a pure argv scan returning the flag index; the guard `i < COM_Argc() - 1` (fs.c:523) plus COM_Argv(i+1) (fs.c:527) consume exactly one following token. It is a command-line parm, not a cvar.
- C6 (default "."): the else-branch at fs.c:534 assigns literal `"."`. WI-2's RegisterCvar rule does not apply (this is a cmdline param, no cvar registration); the cited fallback line IS the effective default. Verified no alternate seeding: fs_basedir is touched only at fs.c:527/534/604(=0 in shutdown); FS_Init->FS_InitEx is called once from sv_main.c:3969 with no quakeparms pre-seed. The gloss "directory the server was started from" correctly describes `.` (cwd); the disabled `#if 0 Sys_getcwd` alternative (fs.c:531-535) confirms cwd was the intended semantic.

No contradictions, no untraceable assertions, no flavour-C inference. Description is enforcement-accurate.

## flags_for_review

- [fyi/other/vpass] src/fs.c:29 doc-comment claims fs_basedir is seeded from `quakeparms_t->basedir` passed by sys_* files to host_init. In MVDSV this is stale upstream-Quake documentation: fs_basedir is never seeded from any quakeparms struct. The only assignments are -basedir (fs.c:527) and the literal `.` fallback (fs.c:534) inside FS_InitEx, plus the =0 reset in FS_ShutDown (fs.c:604). Does not affect the description (which is correct), but the source comment describes a code path that does not exist in this codebase — a comment-rot datum.
- [fyi/other/vpass] FS_SetGamedir (fs.c:455-461) rejects any gamedir token containing '..', '/', '\\', or ':' with 'Gamedir should be a single filename, not a path'. This means the mod-directory portion of clause 2 is constrained to a single path segment under fs_basedir — relevant context if a downstream concept note ever describes how mods compose with -basedir, but not a defect in this -basedir description.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: -nohwtimer=C-FIX, -heapsize=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "-basedir",
  "type": "cmdline_param",
  "description": "Sets the root directory the server loads its game files from. The server looks for the id1, qw, and any mod directories underneath this path. The given path may use either forward or back slashes, and a trailing slash is ignored.\n\n-basedir <path> = use <path> as the base directory.\n\nDefault: the directory the server was started from (\".\").\nSet by: launch flag (takes one path argument).\n\nExample: mvdsv -basedir /home/quake",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/fs.c:527. Value flag, both builds (fs.c compiles into Unix + Windows; no SERVERONLY/#if 0 guard around the parse site). Parse + value-read: src/fs.c:523 `if ((i = COM_CheckParm (\"-basedir\")) && i < COM_Argc() - 1)` recognizes the flag AND requires a following arg; src/fs.c:527 `strlcpy (fs_basedir, COM_Argv(i + 1), sizeof(fs_basedir));` reads one trailing value into fs_basedir => takes a value (TRAP-2 consumer confirmed). OFF/default state: src/fs.c:534 `strlcpy (fs_basedir, \".\", sizeof(fs_basedir));` in the else branch sets default \".\" (the #if 0 cwd path is disabled). Effect: fs_basedir is the prefix for every game dir load -- src/fs.c:548 `FS_AddGameDirectory(va(\"%s/%s\", fs_basedir, \"id1\"), ...)`, fs.c:549 (qw), fs.c:491-493 FS_SetGamedir, and the file-open paths fs.c:645/664. Slash normalization: fs.c:539 `for (s = fs_basedir; (s = strchr(s, '\\\\')); s++) *s = '/';` (backslash->slash); trailing-slash strip: fs.c:543-545. F-MV1: KTX has zero COM_CheckParm references (server-side .so mod) -- no override.",
  "description_proposed": null
}
```
