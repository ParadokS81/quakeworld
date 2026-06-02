# describe-fill-synthesis ledger -- mvdsv `qws_buildnum`

- **project:** mvdsv
- **knob:** `qws_buildnum` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `version-build-identity` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qws_buildnum: synthesized -- read-only build-number identity string (git commit when build supplies one, else "unknown"; empty GIT_COMMIT in this tree -> "unknown"), no engine reader, KTX reads for version display -- origin=synthesized ref=src/sv_main.c:3593 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Read-only identity string holding the server engine's build number -- the git commit the engine was built from. A server admin cannot change it.
>
> Value = the git commit identifier supplied by the build; "unknown" when the build did not supply one.
>
> Default: unknown (the fallback when no commit is baked in at build time).
> Set by: engine, at build time -- read-only, cannot be changed by config or rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| declared default "unknown" | src/sv_main.c:3417 | `qws_buildnum = { "qws_buildnum", "unknown", CVAR_ROM }` | MATCH |
| overwritten with git commit when build supplies one | src/sv_main.c:3592-3594 | `if (GIT_COMMIT[0]) { qws_buildnum.string = GIT_COMMIT; }` | MATCH |
| "unknown" is the fallback when GIT_COMMIT unset at build | src/version.h:72 + src/sv_main.c:3592 | `#define GIT_COMMIT ""` -> guard `GIT_COMMIT[0]` false -> value stays "unknown" | MATCH |
| registration seeds the pre-set string value | src/cvar.c:264-268 | `value = variable->string; ... Cvar_SetROM (variable, value);` | MATCH |
| read-only, admin cannot change | src/cvar.c:134-135 | `if (var->flags & CVAR_ROM)` / `return;` | MATCH |
| no engine behavioral reader (only the conditional write) | (tree-wide grep) | no `qws_buildnum.value`/`.string` read in mvdsv/src besides the 3593 write | MATCH |
| not in serverinfo | src/sv_main.c:3417 | flag is CVAR_ROM, no CVAR_SERVERINFO | MATCH |
| KTX reads (not writes) for version display | ktx/src/commands.c:1678-1680 | `cvar_string("qws_buildnum")` -> "Build" row | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | clause | enforcing file:line | snippet | verdict |
|---|--------|--------------------|---------|---------|
| C1 | Read-only identity string holding build number | src/cvar.c:134-135 (block) + src/sv_main.c:3417 (reg) + src/cvar.h:63 (flag def) | `if (var->flags & CVAR_ROM)\n\t\treturn;` ; `static cvar_t qws_buildnum = { "qws_buildnum", "unknown", CVAR_ROM };` ; `#define CVAR_ROM (1<<1) // read only` | MATCH |
| C2 | Value = git commit the engine was built from | src/sv_main.c:3593 + src/build.c:43 | `qws_buildnum.string = GIT_COMMIT;` ; `... " (build " GIT_COMMIT "-" QW_PLATFORM_SHORT ")"` | MATCH (value source is the GIT_COMMIT build macro; build.c usage confirms it labels the commit identifier) |
| C3 | A server admin cannot change it | src/cvar.c:134-135 reached via 306 (console) / rcon dispatch | `if (var->flags & CVAR_ROM)\n\t\treturn;` (Cvar_Set early-return); console path `Cvar_Set (v, string);` at 306 | MATCH (every Cvar_Set path, incl. console + rcon, is blocked) |
| C4 | git commit identifier supplied by the build | src/sv_main.c:3592-3593 | `if (GIT_COMMIT[0]) {\n\t\tqws_buildnum.string = GIT_COMMIT;` | MATCH (override copies the build-time macro into the cvar before registration) |
| C5 | "unknown" when the build did not supply one | src/sv_main.c:3592 (guard) + 3417 (default) | `if (GIT_COMMIT[0]) {` ... default field `"unknown"` -- guard false when GIT_COMMIT empty, override skipped, default retained | MATCH (exact enforcing logic: override is gated on non-empty GIT_COMMIT) |
| C6 | Default: unknown (WI-2 registered default) | src/sv_main.c:3417 | `static cvar_t qws_buildnum = { "qws_buildnum", "unknown", CVAR_ROM };` | MATCH (2nd initializer field = registered default) |
| C7 | Set by engine at build time; not changeable by config or rcon | src/sv_main.c:3592-3595 + src/cvar.c:266-269 (Cvar_Register bakes .string) + cvar.c:134-135 | reg block sets `.string` then `Cvar_Register`; Register: `value = variable->string; ... Cvar_SetROM (variable, value);` ; ROM block at 134-135 | MATCH (value baked once at registration from build macro; no external Cvar_SetROM re-write for this cvar; config/rcon blocked by CVAR_ROM) |

**V-pass notes:** VERDICT: TRACED-CLEAN. All 7 material clauses (read-only / value-source / admin-cannot-change / build-supplied / OFF-state default / registered-default / set-by-engine) map to located, verified enforcing lines incl. adjacent context.

WIDE READ (WI-1): only 3 use-sites of qws_buildnum tree-wide -- registration (sv_main.c:3417), value-override (3593), Cvar_Register call (3595). No OnChange handler (3-field initializer, no callback). No external Cvar_SetROM caller for this cvar (the Cvar_SetROM external-caller sweep returned only OTHER cvars: sv_paused, serverdemo, pm_pground, sv_local_addr, version, etc.). So the value is set exactly once, at registration, from the GIT_COMMIT build macro.

ENFORCEMENT TRACE (the r42 bar):
- Read-only: NOT inferred from CVAR_ROM name -- traced to Cvar_Set src/cvar.c:134-135 `if (var->flags & CVAR_ROM) return;`, the universal write-gate. Console set (Cvar_Command, cvar.c:306) and rcon both funnel through Cvar_Set, so both hit this block. No ROM bypass exists for this cvar (Cvar_SetROM, the only legitimate bypass, is never called on it post-registration).
- OFF-state ("unknown" when no commit): traced to the guard `if (GIT_COMMIT[0])` (sv_main.c:3592). When GIT_COMMIT is empty the guard is false, the override at 3593 is skipped, and the registered default "unknown" (sv_main.c:3417 second field) survives Cvar_Register (which copies variable->string via Cvar_SetROM, cvar.c:267-269). Exact match to the described logic.
- Registered default (WI-2): "unknown" is literally the 2nd field of the static initializer (sv_main.c:3417). Not a shipped-cfg value. MATCH.
- Set-by/build-time framing: VersionStringFull (build.c:43) independently uses GIT_COMMIT inside the `(build <commit>-<platform>)` string, corroborating that GIT_COMMIT is the git commit identifier and that it is a build-baked macro.

MINOR (not raised to NEAR-MISS): "build number" in C1 is loose -- the value is a commit hash/identifier, not a monotonic build counter -- but the very next sentence self-corrects ("the git commit the engine was built from"), making the meaning unambiguous and correct. Traceable + still-true => stays CLEAN per the enum's "still-true minor vagueness" allowance. The "identity string" + read-only framing is consistent with the qws_* group comment at sv_main.c:3413 ("qws = QuakeWorld Server information").

## flags_for_review

- [fyi/other/synthesis] qws_buildnum resolves to the literal "unknown" in this source checkout because GIT_COMMIT is `""` in the tracked src/version.h:72 and no build file (CMakeLists.txt, build/Makefile) injects a -DGIT_COMMIT compile definition. The recon brief stated the cvar 'is OVERWRITTEN with GIT_COMMIT at registration' -- that is accurate for a release/CI build, but in a plain source build the guard at sv_main.c:3592 (`if (GIT_COMMIT[0])`) is false, so the runtime value is "unknown", not a commit hash. The description documents both states. Flagged so a reviewer knows the live value depends on how the binary was built.
- [fyi/runtime-dead-suspect/vpass] In THIS exact checkout (1.11-53-g18d0362) GIT_COMMIT is hard-coded to "" in src/version.h:72, and NO build-system path overrides it: CMakeLists.txt has find_package(Git) for submodules only and never injects a -DGIT_COMMIT or target_compile_definition for it; the three .github/workflows/*.yml do not patch version.h (no sed/echo on GIT_COMMIT, no rev-parse->header step); there is no top-level Makefile. Consequence: a vanilla build of this tree leaves the guard `if (GIT_COMMIT[0])` (sv_main.c:3592) FALSE, the override never fires, and the registered runtime value of qws_buildnum stays "unknown". This does NOT contradict the description (which correctly covers both the supplied and not-supplied cases, and the 'Default: unknown' line is exactly the effective value here), so it is not a defect -- but the practical/runtime value of qws_buildnum in a from-this-source build is 'unknown' unless an out-of-tree build pipeline defines GIT_COMMIT. Flagging because a reader might reasonably expect a populated commit string by default; the populated case depends on a build-system mechanism not present in this repo snapshot.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_paused=C-FIX, serverdemo=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qws_buildnum",
  "type": "cvar",
  "description": "Read-only identity string holding the server engine's build number -- the git commit the engine was built from. A server admin cannot change it.\n\nValue = the git commit identifier supplied by the build; \"unknown\" when the build did not supply one.\n\nDefault: unknown (the fallback when no commit is baked in at build time).\nSet by: engine, at build time -- read-only, cannot be changed by config or rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3593. Declared CVAR_ROM with literal default \"unknown\" at src/sv_main.c:3417 `static cvar_t qws_buildnum = { \"qws_buildnum\", \"unknown\", CVAR_ROM };`. At registration the default is conditionally overwritten with the build's git commit: src/sv_main.c:3592-3594 `if (GIT_COMMIT[0]) { qws_buildnum.string = GIT_COMMIT; }` then Cvar_Register at 3595. Cvar_Register (src/cvar.c:264-268) reads variable->string as the seed value and Cvar_SetROM's it, so the pre-set value (GIT_COMMIT or the \"unknown\" fallback) becomes the registered value; the guard `GIT_COMMIT[0]` means the override only fires when GIT_COMMIT is a non-empty string. In THIS source tree GIT_COMMIT is empty (`#define GIT_COMMIT \"\"`, src/version.h:72 -- version.h is a tracked, non-generated file and neither CMakeLists.txt nor build/Makefile passes a -D GIT_COMMIT compile definition), so the guard is false and the registered value is the literal \"unknown\"; a release/CI build that patches version.h or supplies -DGIT_COMMIT gets the actual commit string. Read-only enforced at src/cvar.c:134-135. Tree-wide grep of mvdsv/src found NO engine READ of qws_buildnum.value/.string -- the only write is the conditional override above; exposed-by-design identity cvar, NOT dead. No CVAR_SERVERINFO, so not in serverinfo. Cross-codebase (D20 -> reasoning): KTX READS (no override) qws_buildnum in its version display command at ktx/src/commands.c:1678-1680 (the \"Build\" row). Verdict synthesized not affirmed: source carries no user-doc comment, only the literal default \"unknown\".",
  "description_proposed": null
}
```
