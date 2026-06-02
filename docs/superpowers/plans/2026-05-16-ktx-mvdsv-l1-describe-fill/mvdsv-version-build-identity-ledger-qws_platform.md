# describe-fill-synthesis ledger -- mvdsv `qws_platform`

- **project:** mvdsv
- **knob:** `qws_platform` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `version-build-identity` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qws_platform: synthesized -- CVAR_ROM identity string holding the single-letter build-platform code; read-only, no engine consumer (exposed-by-design, not dead) -- origin=synthesized ref=src/sv_main.c:3418 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Reports the operating-system platform the server binary was built for, as a single-letter code.
>
> w = Windows, l = Linux, m = macOS, f = FreeBSD, o = OpenBSD, n = NetBSD, d = DragonFly, s = SunOS, u = unknown/other.
>
> Default: set from the build platform.
> Set by: fixed at build time; read-only (cannot be changed at runtime or in config).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| holds platform code, set from build platform | src/sv_main.c:3418 | `static cvar_t qws_platform = { "qws_platform", QW_PLATFORM_SHORT, CVAR_ROM };` | MATCH |
| value is a single-letter OS code (w/l/m/f/o/n/d/s/u) | src/version.h:26-61 | `#define QW_PLATFORM_SHORT "w"` ... `"l"` ... `"u"` (per-OS #if/#elif) | MATCH |
| read-only / cannot be changed | src/cvar.c:134 | `if (var->flags & CVAR_ROM)` then `return;` | MATCH |
| no engine behavior consumer (identity-only) | src/ (grep) | only decl 3418 + register 3596; no .string/.value/Cvar_String read | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Reports OS platform the binary was BUILT for (not detected at runtime) | src/version.h:26,30,34,38,42,46,50,54,58 | `#if defined(_WIN32)` ... `#elif defined(__linux__)` ... `#else` | MATCH — value selected from compiler-provided TARGET macros at compile time, i.e. the build platform |
| 2 | Value is a single-letter code | src/version.h:28 etc.; src/sv_main.c:3418 | `#define QW_PLATFORM_SHORT "w"`; `static cvar_t qws_platform = { "qws_platform", QW_PLATFORM_SHORT, CVAR_ROM };` | MATCH — cvar initialized with the SHORT macro (one-letter), never the long QW_PLATFORM name |
| 3a | w = Windows | src/version.h:26-28 | `#if defined(_WIN32)` / `QW_PLATFORM_SHORT "w"` | MATCH |
| 3b | l = Linux | src/version.h:46-48 | `#elif defined(__linux__)` / `"l"` | MATCH |
| 3c | m = macOS | src/version.h:54-56 | `#elif defined(__APPLE__)` / `QW_PLATFORM "MacOS"` / `"m"` | MATCH — short code "m"; long string is "MacOS" but cvar exposes only the short code |
| 3d | f = FreeBSD | src/version.h:30-32 | `#elif defined(__FreeBSD__)` / `"f"` | MATCH |
| 3e | o = OpenBSD | src/version.h:34-36 | `#elif defined(__OpenBSD__)` / `"o"` | MATCH |
| 3f | n = NetBSD | src/version.h:38-40 | `#elif defined(__NetBSD__)` / `"n"` | MATCH |
| 3g | d = DragonFly | src/version.h:42-44 | `#elif defined(__DragonFly__)` / `"d"` | MATCH |
| 3h | s = SunOS | src/version.h:50-52 | `#elif defined(__sun__)` / `"s"` | MATCH |
| 3i | u = unknown/other | src/version.h:58-60 | `#else` / `QW_PLATFORM "Unknown"` / `"u"` | MATCH — the catch-all fallback |
| 4 | Default: set from the build platform | src/sv_main.c:3418; src/cvar.c:266-269 | `{ "qws_platform", QW_PLATFORM_SHORT, CVAR_ROM }`; `value = variable->string; ... Cvar_SetROM (variable, value);` | MATCH — registered initial string is QW_PLATFORM_SHORT; for a ROM cvar this IS the only/default value. No shipped-cfg or RegisterCvarEx override; WI-2 satisfied |
| 5a | Read-only: cannot be changed at runtime | src/cvar.c:134-135 | `if (var->flags & CVAR_ROM)` / `\t\treturn;` | MATCH — CVAR_ROM set at registration (sv_main.c:3418); Cvar_Set short-circuits before any assignment |
| 5b | Cannot be changed in config / via console set | src/cvar.c:306, :497, :279-280 | `Cvar_Set (v, string);` (Cvar_Command "changing from the console"); `Cvar_Set (var, Cmd_Argv(2));` (Cvar_Set_f, DP_CON_SET) | MATCH — both console-set entry points route through Cvar_Set's ROM guard; no seta/archive bypass exists |
| 5c | Fixed at build time (value never reassigned) | wide grep over src/ | no `Cvar_SetROM(&qws_platform` and no `qws_platform.string =` anywhere | MATCH — unlike qws_buildnum (sv_main.c:3593 `qws_buildnum.string = GIT_COMMIT`), qws_platform is never mutated post-init |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. Trace discipline applied per enforce-trace-discipline.md.

Verdict: TRACED-CLEAN. All 13 material clauses map to located, verified enforcing lines (incl. adjacent #if/#elif context and the CVAR_ROM guard's surrounding comment "// read only" at cvar.h:63).

Wide-read (WI-1): qws_platform has exactly 3 source touch-points — registration struct (sv_main.c:3418), Cvar_Register call (sv_main.c:3596), and the QW_PLATFORM_SHORT macro definitions (version.h). No reads, no OnChange, no direct field writes. The value is the compile-time literal QW_PLATFORM_SHORT, selected by compiler-provided target-OS predefined macros (_WIN32 / __linux__ / __APPLE__ / __FreeBSD__ / __OpenBSD__ / __NetBSD__ / __DragonFly__ / __sun__), with an "Unknown"->"u" #else fallback. The same macro is also consumed at build.c:43 for a build-string, which is read-only use and does not affect the cvar.

Read-only enforcement traced through the callee, not just the registration flag: Cvar_Set (cvar.c:122) returns at line 134-135 whenever CVAR_ROM is set, BEFORE any string/value assignment. Both console mutation entry points — Cvar_Command (the documented "changing from the console" handler, cvar.c:279, dispatched from cmd.c:945) at cvar.c:306, and the explicit `set` command Cvar_Set_f (DP_CON_SET) at cvar.c:497 — funnel through Cvar_Set, so runtime/config attempts are silently no-ops. There is no `seta`/archive-set variant that bypasses this.

"Fixed at build time" is the strongest-supported clause: a tree-wide grep shows Cvar_SetROM (the internal escape hatch that temporarily clears CVAR_ROM) is called on serverdemo, sv_demoCacheSize, sv_local_addr, sv_paused, sv_bspversion, sv_halflifebsp, sys_command_line, version, pm_pground — but NEVER on qws_platform. And unlike sibling qws_buildnum (which gets `qws_buildnum.string = GIT_COMMIT` at sv_main.c:3593 when GIT_COMMIT is non-empty), qws_platform has no direct field write. So its value is genuinely immutable from registration onward.

Two presentational (PROC-1 judgment, NOT defect) notes, surfaced not absorbed:
1. The "Default:" line is technically redundant for a ROM cvar — the registered initial value IS the only value it can ever hold, so "default" and "fixed value" coincide. Accurate, just slightly belt-and-suspenders against the "fixed at build time" line. Not a correctness issue.
2. The code's LONG platform name for Apple is "MacOS" (version.h:55), not the modern "macOS". The proposed description writes "m = macOS", which is fine because the cvar only ever exposes the short code "m"; the long name is not what qws_platform reports. No mismatch on the actual cvar value.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_paused=C-FIX, serverdemo=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qws_platform",
  "type": "cvar",
  "description": "Reports the operating-system platform the server binary was built for, as a single-letter code.\n\nw = Windows, l = Linux, m = macOS, f = FreeBSD, o = OpenBSD, n = NetBSD, d = DragonFly, s = SunOS, u = unknown/other.\n\nDefault: set from the build platform.\nSet by: fixed at build time; read-only (cannot be changed at runtime or in config).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3418. Declared CVAR_ROM at src/sv_main.c:3418 with default macro QW_PLATFORM_SHORT; registered src/sv_main.c:3596. The macro resolves to a single-letter OS code at compile time -- src/version.h:26-61: _WIN32->\"w\", __linux__->\"l\", __APPLE__->\"m\", __FreeBSD__->\"f\", __OpenBSD__->\"o\", __NetBSD__->\"n\", __DragonFly__->\"d\", __sun__->\"s\", else \"u\". Read-only enforced at src/cvar.c:134-135 (`if (var->flags & CVAR_ROM) return;` -- Cvar_Set silently rejects writes), so an admin cannot change it. No MVDSV engine read of qws_platform.string/.value exists beyond registration (exhaustive grep src/: only decl line 3418 + register line 3596) -- it is an exposed-by-design identity string, NOT runtime-dead, so not dead_stamped. F-MV1: not overridden by KTX; KTX READS it for display in its `serverinfo` command (ktx/src/commands.c:1681) but that cross-codebase display is non-action-changing (cvar is ROM) so kept out of the user doc per D20. Not CVAR_SERVERINFO, so not advertised in serverinfo.",
  "description_proposed": null
}
```
