# describe-fill-synthesis ledger -- mvdsv `version`

- **project:** mvdsv
- **knob:** `version` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:version: synthesized -- read-only CVAR_ROM identity string, engine-set from SERVER_NAME+SERVER_VERSION macros ("MVDSV 1.20-dev"), no engine read-site -- origin=synthesized ref=src/sv_main.c:3915 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Read-only string holding the server's identity: the engine name followed by its version (for this build, "MVDSV 1.20-dev"). The engine fills it in at startup from the compiled-in build identifiers; it cannot be changed from a config or at the console.
>
> Default: empty until the engine sets it at startup.
> Set by: engine (read-only).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| read-only, cannot be set from config/console | src/sv_main.c:65 | `cvar_t version = {"version", "", CVAR_ROM};` | yes (CVAR_ROM) |
| server-only cvar | src/sv_main.c:64,66 | `#ifdef SERVERONLY` ... `#endif` wrapping the registration | yes |
| engine fills it at startup | src/sv_main.c:3915 | `Cvar_SetROM(&version, SERVER_NAME " " SERVER_VERSION);` | yes (only writer) |
| value = name + version ("MVDSV 1.20-dev") | src/version.h:65,68 | `#define SERVER_VERSION "1.20-dev"` / `#define SERVER_NAME "MVDSV"` | yes |
| no engine consumer of the cvar value | (grep result) | only `&version` uses are register sv_main.c:3912 + SetROM :3915; no `version.string`/`.value` read in engine | yes (exhaustive grep) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | Read-only string | src/cvar.h:63 + src/cvar.c:134-135 (flag set at src/sv_main.c:63) | `#define CVAR_ROM (1<<1) // read only` ; `if (var->flags & CVAR_ROM)\n\t\treturn;` ; `cvar_t version = {"version", "", CVAR_ROM};` | MATCH |
| 2 | Holds engine name followed by its version | src/sv_main.c:3915 | `Cvar_SetROM(&version, SERVER_NAME " " SERVER_VERSION);` | MATCH |
| 3 | For this build, value is "MVDSV 1.20-dev" | src/version.h:65,68 | `#define SERVER_VERSION "1.20-dev"` ; `#define SERVER_NAME "MVDSV"` -> concatenation = "MVDSV 1.20-dev" | MATCH |
| 4 | Engine fills it at startup from compiled-in build identifiers | src/sv_main.c:3915 reached via src/sv_main.c:3951 Host_Init -> :3967 COM_Init | `Cvar_SetROM(&version, SERVER_NAME " " SERVER_VERSION);` (both are compile-time #define macros from version.h; set once during one-time Host_Init startup, before SV_Init and main loop; NO git/runtime data enters the cvar value) | MATCH |
| 5 | Cannot be changed from a config or at the console | src/cvar.c:134-135 (the single Cvar_Set write funnel) | `if (var->flags & CVAR_ROM)\n\t\treturn;` | MATCH |
| 6 | Default: empty until engine sets it at startup | src/sv_main.c:63 then :3915 | registered as `{"version", "", CVAR_ROM}` (empty default), then overwritten by `Cvar_SetROM(&version, ...)` during COM_Init | MATCH |
| 7 | Set by: engine (read-only) | src/sv_main.c:3915 via src/cvar.c:168-178 Cvar_SetROM | `Cvar_SetROM` temporarily clears CVAR_ROM, calls Cvar_Set, restores flag -- the sanctioned engine-only ROM write; the lone writer of `version` | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362.

VERDICT: TRACED-CLEAN. Every material clause maps to a located, verified enforcing line (incl. adjacent comments). No flavour-C inference detected.

Wide-read result: the `version` cvar global is touched at EXACTLY three sites, all in src/sv_main.c -- declaration :63 (`cvar_t version = {"version", "", CVAR_ROM};`), registration :3912 (`Cvar_Register(&version)`), and value-set :3915 (`Cvar_SetROM(&version, SERVER_NAME " " SERVER_VERSION)`). No OnChange handler, no second writer, no per-map/restart re-set. The two other `version` token hits (cmodel.c:1321 `header->version`, sv_save.c:188 `&version` fscanf) are unrelated local var / struct field, not the cvar.

Read-only enforcement is real and lives in a DIFFERENT file from registration: src/cvar.c:134-135 inside Cvar_Set is the single funnel for all config/console writes (`set`, exec, autoexec), and it hard-returns on CVAR_ROM. The only bypass is Cvar_SetROM (cvar.c:168-178), which temporarily clears the flag -- invoked exactly once for this cvar, by the engine, at COM_Init. So "cannot be changed from a config or at the console" + "Set by: engine" are both enforced, not inferred.

Build-gate check: the cvar lives inside `#ifdef SERVERONLY` (sv_main.c:60-64). MVDSV always builds SERVERONLY (CMakeLists.txt:169 `target_compile_definitions(${PROJECT_NAME} PRIVATE SERVERONLY)`), so the "for this build" framing is accurate -- the cvar always exists in the shipped MVDSV binary.

Value precision -- the one place a synth could have drifted, and did NOT: the cvar value is the PLAIN macro concatenation `SERVER_NAME " " SERVER_VERSION` = "MVDSV 1.20-dev". It does NOT carry the git-build suffix. The richer `VersionStringFull()` (build.c:35-48) appends `(build <GIT_COMMIT>-<platform>)` and is used for the startup banner (sv_main.c:3962), the QC infokey (pr2_cmds.c:1598), and worldspawn netname (sv_init.c:573) -- but NOT for the cvar. The description correctly states the bare "MVDSV 1.20-dev" without fabricating a build suffix. Clean.

Default-timing precision: registered default is literally `""` (empty), and the description's "empty until the engine sets it at startup" exactly captures the register-then-SetROM sequence. WI-2 compliant (verified against the registered default, not a shipped-cfg value).

## flags_for_review

- [fyi/hidden-family/synthesis] `version` is a read-only identity-string cvar with ZERO engine read-sites (only registration + Cvar_SetROM). Same shape as the chunk-7 qws_*/qwm_* identity bank (findings #37-40): the string is duplicated into the server's actual advertise channel via the build macros directly (the *version serverinfo starkey, sv_main.c built from the macro per chunk-7), NOT read back from this cvar. The cvar exists for client/console introspection only. No fabrication risk here, but worth a human note that this is another no-consumer identity carrier.
- [fyi/off-scope-entity/vpass] src/pr2_cmds.c:1597-1598 exposes a QC-accessible info key via `infokey(world, "version")` that returns `VersionStringFull()` -- a DIFFERENT value source than the `version` cvar (it includes the git-build suffix). This is NOT a use-site of the `version` cvar and does not contradict any clause in the description, but it means there are two distinct 'version' surfaces in MVDSV: the read-only cvar (plain 'MVDSV 1.20-dev') and the QC/serverinfo-style 'version' info key (full build string). Noted so a downstream reader does not conflate them.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "version",
  "type": "cvar",
  "description": "Read-only string holding the server's identity: the engine name followed by its version (for this build, \"MVDSV 1.20-dev\"). The engine fills it in at startup from the compiled-in build identifiers; it cannot be changed from a config or at the console.\n\nDefault: empty until the engine sets it at startup.\nSet by: engine (read-only).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3915. Registered CVAR_ROM at sv_main.c:65 inside #ifdef SERVERONLY: `cvar_t version = {\"version\", \"\", CVAR_ROM};` -- read-only flag + empty registered default. Value is engine-assigned at COM_Init via `Cvar_SetROM(&version, SERVER_NAME \" \" SERVER_VERSION);` (sv_main.c:3915), so the runtime string is the concatenation of the two macros, NOT the empty registered default. Macros resolve in version.h: SERVER_NAME=\"MVDSV\" (version.h:68), SERVER_VERSION=\"1.20-dev\" (version.h:65) -> \"MVDSV 1.20-dev\". 'Read-only / set by engine' clause: CVAR_ROM flag at the registration + Cvar_SetROM as the only writer; no settable path. 'No engine consumer' clause: exhaustive tree grep -- the only `&version` references are the registration (sv_main.c:3912) and the SetROM write (sv_main.c:3915) (the sv_save.c:188 `&version` is an unrelated local int holding the save-file format version, not this cvar); grep for `version.string`/`version.value` returns only GPL license-header matches, no read of the cvar. So it is a read-only identity string with no engine read-site -- I deliberately do NOT claim it is the channel by which the server advertises itself (chunk-7 lesson: the *version serverinfo starkey is built directly from the build macros, not from this cvar), only that it holds that identity string and is engine-set. Enum/threshold/polarity clauses: none (plain string). Per D20, file:line and macro names kept out of `description`.",
  "description_proposed": null
}
```
