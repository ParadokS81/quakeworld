# describe-fill-synthesis ledger -- mvdsv `qws_builddate`

- **project:** mvdsv
- **knob:** `qws_builddate` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `version-build-identity` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qws_builddate: synthesized -- CVAR_ROM identity string holding the binary's compile date/time; read-only, no engine consumer (exposed-by-design, not dead) -- origin=synthesized ref=src/sv_main.c:3419 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Reports the date and time the server binary was compiled.
>
> Default: set from the build timestamp.
> Set by: fixed at build time; read-only (cannot be changed at runtime or in config).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| holds the build date/time | src/sv_main.c:3419 | `static cvar_t qws_builddate = { "qws_builddate", BUILD_DATE, CVAR_ROM };` | MATCH |
| value is compile date + time | src/version.h:71 | `#define BUILD_DATE __DATE__ ", " __TIME__` | MATCH |
| read-only / cannot be changed | src/cvar.c:134 | `if (var->flags & CVAR_ROM)` then `return;` | MATCH |
| no engine behavior consumer (identity-only) | src/ (grep) | only decl 3419 + register 3597; no .string/.value/Cvar_String read | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Reports the date and time the server binary was compiled" (semantic/core) | version.h:71 (value macro) + sv_main.c:3419 (registration value) | `#define BUILD_DATE __DATE__ ", " __TIME__` ; `static cvar_t qws_builddate = { "qws_builddate", BUILD_DATE, CVAR_ROM };` | MATCH -- value is the C preprocessor compile-time date+time (`__DATE__`/`__TIME__`), i.e. when the binary was compiled. |
| 2 | Default: "set from the build timestamp" (default) | sv_main.c:3419 (registered default) + cvar.c:269 (installed at register) | `{ "qws_builddate", BUILD_DATE, CVAR_ROM }` ; `Cvar_SetROM (variable, value);` | MATCH -- registered default is the `BUILD_DATE` macro (compile timestamp), installed once at registration via Cvar_SetROM. Verified against RegisterCvar default per WI-2, not a shipped-cfg value. |
| 3 | "fixed at build time; read-only (cannot be changed at runtime or in config)" (scope/write-restriction) | cvar.c:134-135 (ROM guard) ; reached via cvar.c:306 (console), cvar.c:497 (`set`), cmd.c:945 (config-exec dispatch) | `if (var->flags & CVAR_ROM) return;` ; (CVAR_ROM = (1<<1) // read only, cvar.h:63) | MATCH -- every user-facing setter (bare cvar form via Cvar_Command->Cvar_Set; `set` via Cvar_Set_f->Cvar_Set; config lines via Cmd_ExecuteString->Cvar_Command) funnels into Cvar_Set and is blocked by the ROM guard. No `Cvar_SetROM` call site targets qws_builddate, so the only ROM-bypass (cvar.c:168) never writes it post-registration. |

**V-pass notes:** Version confirmed 1.11-53-g18d0362. All 3 material clauses enforcement-traced to live source; every clause MATCH.

CORE/DEFAULT: qws_builddate is registered at sv_main.c:3419 with value BUILD_DATE and flag CVAR_ROM. BUILD_DATE (version.h:71) expands to `__DATE__ ", " __TIME__` -- the standard C preprocessor compile-time date and time of the translation unit. "Reports the date and time the server binary was compiled" and "set from the build timestamp" both reduce to this single verified fact. The registered default is the macro value, not a shipped-cfg datum (WI-2 satisfied).

READ-ONLY SCOPE (the clause that needed the deepest trace, per the autotrack flag-name canary): CVAR_ROM is NOT inferred from the flag name -- it is traced to its enforcement at cvar.c:134-135 (`if (var->flags & CVAR_ROM) return;` inside Cvar_Set). I confirmed all user-facing write paths funnel into Cvar_Set: (a) bare console/config form via Cvar_Command (cvar.c:306), (b) `set` command via Cvar_Set_f (cvar.c:497), (c) config files execute as command strings through Cmd_ExecuteString which falls through to Cvar_Command at cmd.c:945. So "runtime" and "config" both resolve to the same guard -- the clause is fully grounded, not a name-inference.

ROM-BYPASS RULED OUT: Cvar_SetROM (cvar.c:168) deliberately clears CVAR_ROM, calls Cvar_Set, restores -- a C-code-only internal helper. I enumerated ALL Cvar_SetROM call sites (net.c, sv_demo.c, sv_phys.c, sv_init.c, cmodel.c, sv_user.c, sv_main.c x2, and the cvar.c:269 register path): NONE target qws_builddate. The cvar.c:269 use is registration-time init (installs BUILD_DATE), restoring the flag immediately after -- not a runtime/config write. Hence the value is fixed for the process lifetime; no contradiction.

PHRASING (still-true vagueness, acceptable for TRACED-CLEAN): "Default: set from the build timestamp" and "Set by: fixed at build time" state the same fact twice (mildly redundant), but both are correct and traceable. Not a defect -- PROC-1 fact check passes, no judgment absorbed into the verdict.

## flags_for_review

- [fyi/off-scope-entity/vpass] Sibling cvar qwm_builddate (sv_main.c:3427) is the QW-mod build-date placeholder, registered with an empty default and NO flags (NOT CVAR_ROM) -- so unlike qws_builddate it is writable. The whole qwm_* family (qwm_name/fullname/version/buildnum/platform/builddate/homepage, sv_main.c:3422-3428) is an empty, unflagged placeholder set, presumably populated by a mod (KTX) at runtime. Off-scope for qws_builddate but relevant if the fleet later describes the qwm_* family -- do not copy the qws_ read-only framing onto them.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_paused=C-FIX, serverdemo=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qws_builddate",
  "type": "cvar",
  "description": "Reports the date and time the server binary was compiled.\n\nDefault: set from the build timestamp.\nSet by: fixed at build time; read-only (cannot be changed at runtime or in config).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3419. Declared CVAR_ROM at src/sv_main.c:3419 with default macro BUILD_DATE; registered src/sv_main.c:3597. BUILD_DATE is defined at src/version.h:71 as `__DATE__ \", \" __TIME__` -- the C preprocessor build date and time stamped in at compile. Read-only enforced at src/cvar.c:134-135 (Cvar_Set returns early on CVAR_ROM), so an admin cannot change it. No MVDSV engine read of qws_builddate.string/.value exists beyond registration (exhaustive grep src/: only decl 3419 + register 3597) -- exposed-by-design identity string, NOT runtime-dead, so not dead_stamped. F-MV1: not overridden by KTX; KTX READS it for display in its `serverinfo` command (ktx/src/commands.c:1686), a non-action-changing cross-codebase display kept out of the user doc per D20. Not CVAR_SERVERINFO, so not advertised in serverinfo.",
  "description_proposed": null
}
```
