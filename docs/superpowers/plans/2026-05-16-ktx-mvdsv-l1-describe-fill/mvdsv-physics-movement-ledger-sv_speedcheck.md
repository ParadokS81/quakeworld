# describe-fill-synthesis ledger -- mvdsv `sv_speedcheck`

- **project:** mvdsv
- **knob:** `sv_speedcheck` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_speedcheck: synthesized -- anti speed-cheat; clamps client-reported frame time to real elapsed (AM101); any non-zero=on, 0=off; bots exempt; no KTX override -- origin=synthesized ref=src/sv_user.c:3633 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Server-side anti speed-cheat. When enabled, the server checks each client's reported frame time against the real elapsed time and trims any excess, so a client cannot move faster by claiming more time passed than actually did. Bots are exempt from the check.
>
> 0 = off.
> Any non-zero value = on.
>
> Default: 1.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| enabled-gate; any non-zero=on, 0=off | src/sv_user.c:3633 | `if (!inside && (int)sv_speedcheck.value` | MATCH |
| bots exempt | src/sv_user.c:3635 | `&& !sv_client->isBot` | MATCH |
| measures real elapsed time | src/sv_user.c:3640 | `tmp_time = Q_rint((realtime - sv_client->last_check) * 1000);` | MATCH |
| detects client claiming more time than elapsed | src/sv_user.c:3643 | `if (ucmd->msec > tmp_time)` | MATCH |
| trims the excess reported time | src/sv_user.c:3648 | `ucmd->msec = tmp_time;` | MATCH |
| leftover-ms accounting capped at 500 (internal) | src/sv_user.c:3666 | `if (sv_client->msecs > 500) sv_client->msecs = 500;` | MATCH |
| default 1 | src/sv_main.c:133 | `cvar_t sv_speedcheck = {"sv_speedcheck", "1"};` | MATCH |
| no KTX override | ktx/src (grep) | no hits for sv_speedcheck | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | "Server-side anti speed-cheat" (purpose/scope) | sv_user.c:3629, 3633-3670 | `//bliP: 24/9 anti speed ->` + the speedcheck block in `SV_RunCmd` (server-only, SERVERONLY build) | MATCH |
| 2 | "checks reported frame time vs real elapsed time and trims excess" (mechanism) | sv_user.c:3640, 3643, 3648 | `tmp_time = Q_rint((realtime - sv_client->last_check) * 1000);` / `if (ucmd->msec > tmp_time)` / `ucmd->msec = tmp_time;` | MATCH |
| 3 | "client cannot move faster by claiming more time than actually did" (effect) | sv_user.c:3643-3661 | `if (ucmd->msec > tmp_time)` ... `ucmd->msec = tmp_time; sv_client->msecs = 0;` (reported movement msec capped to true elapsed + accumulated leftover) | MATCH |
| 4 | "Bots are exempt from the check" (side-effect/scope) | sv_user.c:3634-3636 + CMakeLists.txt:170 | `#ifdef USE_PR2` / `&& !sv_client->isBot` ; `target_compile_definitions(${PROJECT_NAME} PRIVATE USE_PR2)` (unconditional in standard build) | MATCH |
| 5 | "0 = off" (OFF-state) | sv_user.c:3633 | `if (!inside && (int)sv_speedcheck.value ...)` -> value 0 fails gate, block skipped | MATCH |
| 6 | "Any non-zero value = on" (polarity/threshold) | sv_user.c:3633 (+ cvar.h:72 `float value`) | `(int)sv_speedcheck.value` -- integer-truncating gate | MATCH (minor imprecision: fractional values in (-1,1) e.g. 0.5 truncate to 0 = OFF; all non-zero INTEGERS, incl. negatives, are ON. Routine (int)-cast pattern; text is true at every integer value) |
| 7 | "Default: 1" (metadata) | sv_main.c:133 | `cvar_t sv_speedcheck = {"sv_speedcheck", "1"};` (registered default string "1") | MATCH |
| 8 | "Set by: server config" (access) | sv_main.c:133, 3552 (+ cvar.h:62-63) | `{"sv_speedcheck", "1"}` flags field = 0 (no CVAR_ROM read-only, no CVAR_SERVERINFO); `Cvar_Register(&sv_speedcheck);` -- plain server-side cvar | MATCH |

**V-pass notes:** All 8 clauses enforcement-traced to live source at 1.11-53-g18d0362. Single read/enforce site is sv_user.c:3633-3670 in SV_RunCmd (registration in a DIFFERENT file, sv_main.c:133 -- followed correctly). Mechanism is accurate: tmp_time = real wall-clock ms since last_check; if the client's reported ucmd->msec exceeds it (after crediting accumulated leftover sv_client->msecs, capped at 500), msec is trimmed down to the true elapsed time -- so a client cannot gain movement by claiming extra frame time. The `!inside` gate restricts the check to genuine top-level client commands (recursive split-frame SV_RunCmd calls pass inside=true; bot path passes inside=false but is excluded by !isBot). Bot exemption (`!sv_client->isBot`) is `#ifdef USE_PR2`, and USE_PR2 is unconditionally defined for the standard CMake build (CMakeLists.txt:170), so the exemption is compiled into the shipped binary -- clause holds. Default "1" and plain-server-cvar access (flags=0) verified at registration.

One minor imprecision, NOT promoted to C-NEAR-MISS: the gate is `(int)sv_speedcheck.value`, so fractional settings in the open interval (-1,1) other than 0 (e.g. 0.5) truncate to int 0 and are treated as OFF, and negative integers (-1, -2, ...) are ON. The proposed text "any non-zero value = on" is therefore true for every integer value (the practical case) but technically over-broad for sub-integer fractions. This is the standard (int)-cast tolerance and the clause HAS a real enforcing line (so it is not flavour-C name/enum/string inference) -- it is the "still-true minor vagueness that was traceable" the discipline explicitly permits under TRACED-CLEAN. No clause contradicts code; no clause asserts behavior without an enforcing read-site.

## flags_for_review

- [fyi/cross-mod-override/vpass] The bot exemption (`!sv_client->isBot`) is compiled only under `#ifdef USE_PR2` (sv_user.c:3634-3636). It is in the standard binary because CMakeLists.txt:170 defines USE_PR2 unconditionally for the default build. A hypothetical non-PR2 build (e.g. the legacy vcxproj path or a stripped server) would apply speedcheck to bots too. Not a defect for the canonical oracle build; flagging the conditional-compilation dependency so the 'bots exempt' clause is understood as build-conditional, not absolute.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_speedcheck",
  "type": "cvar",
  "description": "Server-side anti speed-cheat. When enabled, the server checks each client's reported frame time against the real elapsed time and trims any excess, so a client cannot move faster by claiming more time passed than actually did. Bots are exempt from the check.\n\n0 = off.\nAny non-zero value = on.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:3633. Registered src/sv_main.c:133 `cvar_t sv_speedcheck = {\"sv_speedcheck\", \"1\"};` (default \"1\") -- LOCATOR. ENFORCING read-site src/sv_user.c:3633 `if (!inside && (int)sv_speedcheck.value` (in SV_RunCmd), with the body src/sv_user.c:3639-3670 implementing the 'AM101 method': it compares the command's reported elapsed ms against wall-clock elapsed (`tmp_time = Q_rint((realtime - sv_client->last_check) * 1000)` :3640) and, when the client claims more than really elapsed (`if (ucmd->msec > tmp_time)` :3643), reduces `ucmd->msec` toward the real value using accumulated leftovers (`ucmd->msec = tmp_time;` :3648; `sv_client->msecs` accounting :3645-3659; cap `if (sv_client->msecs > 500) sv_client->msecs = 500;` :3666). Since per-command msec scales movement time, trimming inflated msec removes the speed advantage -- 'trims excess reported time so a client cannot move faster' is enforce-traced, not inferred. Enable polarity: the gate is a bare truthiness test `(int)sv_speedcheck.value`, so any non-zero = on, 0 = off (not a graded scale) -- verified at :3633. Bot exemption src/sv_user.c:3635 `&& !sv_client->isBot` (under USE_PR2) -- enforce-traced. The `!inside` part (runs only on the top-level command, not chopped sub-commands) is implementation-level and kept out of the user doc. The 500ms leftover cap is internal accounting, not an admin knob, so not surfaced. F-MV1: zero hits in ktx/src -- engine governs entirely.",
  "description_proposed": null
}
```
