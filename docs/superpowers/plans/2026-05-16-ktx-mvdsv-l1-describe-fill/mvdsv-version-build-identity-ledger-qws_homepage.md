# describe-fill-synthesis ledger -- mvdsv `qws_homepage`

- **project:** mvdsv
- **knob:** `qws_homepage` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `version-build-identity` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qws_homepage: synthesized -- CVAR_ROM identity string holding the server-software homepage URL; read-only, no engine consumer (exposed-by-design, not dead) -- origin=synthesized ref=src/sv_main.c:3420 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Reports the project homepage URL of the server software.
>
> Default: https://github.com/QW-Group/mvdsv
> Set by: fixed at build time; read-only (cannot be changed at runtime or in config).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| holds the project homepage URL | src/sv_main.c:3420 | `static cvar_t qws_homepage = { "qws_homepage", SERVER_HOME_URL, CVAR_ROM };` | MATCH |
| default URL value | src/version.h:70 | `#define SERVER_HOME_URL "https://github.com/QW-Group/mvdsv"` | MATCH |
| read-only / cannot be changed | src/cvar.c:134 | `if (var->flags & CVAR_ROM)` then `return;` | MATCH |
| no engine behavior consumer (identity-only) | src/ (grep) | only decl 3420 + register 3598; no .string/.value/Cvar_String read | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Reports the project homepage URL of the server software" (semantic: the value is the mvdsv project repo URL) | src/version.h:70 + src/sv_main.c:3413,3420 | `#define SERVER_HOME_URL     "https://github.com/QW-Group/mvdsv"` ; `// qws = QuakeWorld Server information` ; `static cvar_t qws_homepage = { "qws_homepage", SERVER_HOME_URL, CVAR_ROM };` | MATCH |
| 2 | "Default: https://github.com/QW-Group/mvdsv" | src/version.h:70 | `#define SERVER_HOME_URL     "https://github.com/QW-Group/mvdsv"` | MATCH (registered default = this literal; confirmed via registration mechanism below, not just the struct initializer) |
| 3 | "Set by: fixed at build time" (default is a compile-time constant, not git/runtime/config substituted) | src/sv_main.c:3592-3598 (vs sibling) + src/cvar.c:267-269 | qws_buildnum gets `qws_buildnum.string = GIT_COMMIT;` at 3593 BEFORE its register; qws_homepage has NO such patch -- registered straight from `SERVER_HOME_URL`. At register: `value = variable->string; ... Cvar_SetROM (variable, value);` -- sets the build-time literal, no latched/config override path | MATCH |
| 4a | "read-only ... cannot be changed at runtime" (CVAR_ROM enforces rejection of any value-set) | src/cvar.c:134-135 | `if (var->flags & CVAR_ROM)` / `return;` | MATCH (this is the line that ENFORCES the read-only assertion; the CVAR_ROM `// read only` comment at cvar.h:63 is a hypothesis, confirmed by this rejection branch in Cvar_Set) |
| 4b | "cannot be changed ... in config" (config-exec console paths route through the ROM-rejecting Cvar_Set) | src/cvar.c:306 (Cvar_Command) + src/cvar.c:497 (Cvar_Set_f) | `Cvar_Set (v, string);` (bare-name path) ; `Cvar_Set (var, Cmd_Argv(2));` (`set` command path) -- both funnel to cvar.c:134 ROM check | MATCH (config files exec these same console commands; no user-reachable write path bypasses the ROM check) |

**V-pass notes:** All four clauses enforcement-traced to located, verified lines including adjacent comments and the registration mechanism; verdict TRACED-CLEAN.

Tag confirmed 1.11-53-g18d0362. Wide-grep of qws_homepage yields exactly two use-sites (sv_main.c:3420 declaration, sv_main.c:3598 registration); both read.

Read-only clause (the only one at risk of flavour-C inference from the CVAR_ROM flag NAME/comment): I did NOT stop at the `#define CVAR_ROM (1<<1) // read only` comment (cvar.h:63). I traced to the line that ENFORCES rejection -- Cvar_Set at cvar.c:134-135 silently returns on any CVAR_ROM set. Then verified BOTH user-facing write paths reach that line: Cvar_Command (cvar.c:306, the bare `qws_homepage <val>` console/config form) and Cvar_Set_f (cvar.c:497, the `set qws_homepage <val>` form). Cvar_SetByName (cvar.c:197) and Cvar_Toggle_f (cvar.c:332) also funnel through Cvar_Set. No write path bypasses the ROM check.

The one internal bypass, Cvar_SetROM (cvar.c:168-179: clears CVAR_ROM, Cvar_Set, restores), is C-code-only and is NEVER invoked on qws_homepage (grep for qws_homepage returns only the two sites; no Cvar_SetROM call site targets it). The ONLY Cvar_SetROM call that touches this cvar is inside Cvar_Register (cvar.c:269), which is how the build-time default is initially installed -- it sets the value once at registration then restores CVAR_ROM, leaving it read-only thereafter. This same trace also confirms clauses 2/3: the registered default is the SERVER_HOME_URL literal (no config/latch override before registration), satisfying WI-2 (registered default, not a shipped-cfg value).

"Fixed at build time" verified by contrast with the sibling qws_buildnum, which IS runtime-patched (qws_buildnum.string = GIT_COMMIT at sv_main.c:3593) before its own register -- qws_homepage has no analogous patch, so it stays the compile-time #define.

No OnChange handler on this cvar (the struct initializer has only name/default/flags; Cvar_Set's OnChange branch at cvar.c:137 is moot because the ROM return at line 134 precedes it anyway).

## flags_for_review

- [fyi/other/vpass] CVAR_ROM is not absolutely immutable: Cvar_SetROM (src/cvar.c:168-179) temporarily clears the flag, calls Cvar_Set, then restores it -- the engine's own escape hatch for setting ROM cvars. For qws_homepage this is only ever exercised once, inside Cvar_Register (cvar.c:269), to install the build-time default; no other call site targets this cvar. The description's user-facing 'cannot be changed at runtime or in config' is correct for every user-reachable path, but a literal 'truly immutable' reading would be too strong. FYI only -- the proposed text does not over-claim.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_paused=C-FIX, serverdemo=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qws_homepage",
  "type": "cvar",
  "description": "Reports the project homepage URL of the server software.\n\nDefault: https://github.com/QW-Group/mvdsv\nSet by: fixed at build time; read-only (cannot be changed at runtime or in config).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3420. Declared CVAR_ROM at src/sv_main.c:3420 with default macro SERVER_HOME_URL; registered src/sv_main.c:3598. SERVER_HOME_URL is defined at src/version.h:70 as `\"https://github.com/QW-Group/mvdsv\"` -- the fixed project URL compiled in. Read-only enforced at src/cvar.c:134-135 (Cvar_Set returns early on CVAR_ROM), so an admin cannot change it. No MVDSV engine read of qws_homepage.string/.value exists beyond registration (exhaustive grep src/: only decl 3420 + register 3598) -- exposed-by-design identity string, NOT runtime-dead, so not dead_stamped. F-MV1: not overridden by KTX; KTX READS it for display in its `serverinfo` command (ktx/src/commands.c:1691), a non-action-changing cross-codebase display kept out of the user doc per D20. Not CVAR_SERVERINFO, so not advertised in serverinfo.",
  "description_proposed": null
}
```
