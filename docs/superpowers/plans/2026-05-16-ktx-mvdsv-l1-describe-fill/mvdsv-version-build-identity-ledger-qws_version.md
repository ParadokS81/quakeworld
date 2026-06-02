# describe-fill-synthesis ledger -- mvdsv `qws_version`

- **project:** mvdsv
- **knob:** `qws_version` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `version-build-identity` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qws_version: synthesized -- read-only engine version identity string "1.20-dev", no engine reader (exposed-by-design), KTX reads for MOTD/version display -- origin=synthesized ref=src/sv_main.c:3416 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Read-only identity string holding the server engine's version ("1.20-dev"). It identifies which engine build version the server is running; a server admin cannot change it.
>
> Default: the engine version baked in at compile time (1.20-dev at this build).
> Set by: engine, at compile time -- read-only, cannot be changed by config or rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| holds engine version "1.20-dev" | src/sv_main.c:3416 + src/version.h:65 | `qws_version = { "qws_version", SERVER_VERSION, CVAR_ROM }` ; `#define SERVER_VERSION "1.20-dev"` | MATCH |
| read-only, admin cannot change | src/cvar.c:134-135 | `if (var->flags & CVAR_ROM)` / `return;` | MATCH |
| no engine behavioral reader (identity only) | (tree-wide grep) | no `qws_version.value`/`.string`/`Cvar_String("qws_version")` in mvdsv/src | MATCH |
| not in serverinfo | src/sv_main.c:3416 | flag is CVAR_ROM, no CVAR_SERVERINFO | MATCH |
| KTX reads (not writes) for MOTD + version display | ktx/src/motd.c:77-81 ; ktx/src/commands.c:1673-1675 | `cvar_string("qws_version")` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Read-only identity string holding the server engine's version | src/sv_main.c:3416 + src/cvar.c:134-135 + src/cvar.h:63 | `static cvar_t qws_version = { "qws_version", SERVER_VERSION, CVAR_ROM };` / `if (var->flags & CVAR_ROM) return;` / `#define CVAR_ROM (1<<1) // read only` | MATCH |
| 2 | Value is "1.20-dev" | src/version.h:65 | `#define SERVER_VERSION      "1.20-dev"` | MATCH |
| 3 | It identifies which engine build version the server is running | (no enforcing read-site) -- actual advertise channel is separate: src/sv_main.c:3684 | `Info_SetValueForStarKey (svs.info, "*version", SERVER_NAME " " SERVER_VERSION, MAX_SERVERINFO_STRING);` -- built from the SERVER_VERSION macro directly, NOT from the qws_version cvar; qws_version has ZERO read-sites and lacks CVAR_SERVERINFO so it is never pushed to clients/browser | MISMATCH (clause asserts an advertisement behavior with no enforcing read-site on this cvar; the reported VALUE is correct only because it shares the SERVER_VERSION macro) |
| 4 | A server admin cannot change it | src/cvar.c:134-135 (ROM block) reached via src/cvar.c:306 (console/rcon Cvar_Command), :497 (`set` cmd), :197 (Cvar_SetByName) | `if (var->flags & CVAR_ROM) return;` -- all write paths route through Cvar_Set | MATCH |
| 5 | Default = engine version baked in at compile time (1.20-dev) | src/sv_main.c:3416 + src/version.h:65 | registered default is the `SERVER_VERSION` macro = compile-time `"1.20-dev"` (genuine cvar_t initializer default, WI-2 satisfied; not a shipped-cfg value) | MATCH |
| 6 | Set by engine at compile time; read-only; cannot be changed by config or rcon | src/sv_main.c:3591 (register) + src/cvar.c:134-135; NO Cvar_SetROM on qws_version anywhere in tree (exhaustive grep) | `Cvar_Register(&qws_version);` -- value assigned once at init from compile-time macro, never re-set | MATCH (minor: string is baked at compile time, assigned to the cvar at registration/init -- standard compile-time-constant framing, substantively correct) |

**V-pass notes:** C-NEAR-MISS (flavour-C-positive). Oracle version confirmed 1.11-53-g18d0362.

The row is well-written, cites real lines, and the core behavior is fully traced and correct: qws_version is a CVAR_ROM string cvar (sv_main.c:3416), default = compile-time SERVER_VERSION macro "1.20-dev" (version.h:65), and the read-only block at cvar.c:134-135 silently no-ops every write path (console/rcon Cvar_Command:306, the `set` command:497, Cvar_SetByName:197). An exhaustive tree-wide grep confirms qws_version is NEVER re-set at runtime (no Cvar_SetROM call on it -- only sv_bspversion and the legacy `version` cvar use that bypass). So clauses 1, 2, 4, 5, 6 are all MATCH.

The single defect is clause 3: "It identifies which engine build version the server is running." qws_version has ZERO read-sites in the entire source tree -- registration is the only thing that touches it. It is NOT CVAR_SERVERINFO, so it is never mirrored into serverinfo, never sent in heartbeat, never broadcast to clients or server browsers. The thing that actually advertises the version to clients is a SEPARATE serverinfo key, `*version` (sv_main.c:3684: `Info_SetValueForStarKey(svs.info, "*version", SERVER_NAME " " SERVER_VERSION, ...)`), which is built directly from the SERVER_VERSION macro and does not read qws_version. There is also a third independent carrier, the legacy `version` cvar (sv_main.c:63, set at :3915). qws_version is purely a console/rcon-queryable identity string (Cvar_Command prints it on a bare-name query, cvar.c:294). "Advertises" is role/name inference: the cvar looks like it would be the advertised version and its reported value happens to equal the advertised value (shared SERVER_VERSION macro), but the advertisement mechanism the word implies has no enforcing read-site on this cvar. Correct-by-accident on value, untraced on mechanism -> exactly the flavour-C near-miss class.

Suggested fix for the row: reframe clause 3 to describe what qws_version actually is -- a read-only server-info identity string queryable via console/rcon (e.g. typing `qws_version` in the server console or via rcon prints the engine version). Drop or soften "advertises ... the server is running" so it does not imply this cvar is the channel by which the server announces its version to connecting clients (that is the separate `*version` serverinfo key). Does not rise to C-FIX (no clause contradicts the code) and is not WI2-FIX (default and access-class are both correct).

## flags_for_review

- [fyi/other/synthesis] qws_version's value is the SERVER_VERSION macro "1.20-dev" (src/version.h:65), which differs from the git-describe tag of this checkout (1.11-53-g18d0362, the synthesis anchor). This is expected -- SERVER_VERSION is the hand-maintained human version string and qws_buildnum carries the git build number -- but flagged so a reviewer is aware the advertised qws_version (1.20-dev) is NOT the same string as the anchor commit tag.
- [fyi/runtime-dead-suspect/vpass] qws_version has ZERO read-sites in the entire mvdsv source tree -- it is registered (sv_main.c:3591) and never read by any C code, never copied to serverinfo, never sent to clients. The whole qws_* server-info family is largely write-only this way (only the qwm_* MOD family is consumed -- qwm_name read at sv_init.c:424 and sv_broadcast.c:622). qws_version appears to exist as a console/rcon-inspectable diagnostic identity string only. Not a bug, but worth noting that 'the cvar that holds the server version' is functionally inert as a data source -- consumers read the SERVER_VERSION macro or the *version serverinfo key directly, not this cvar.
- [fyi/other/vpass] Three parallel carriers of the same server-version value, all sourced from the SERVER_VERSION macro: (1) qws_version cvar (sv_main.c:3416, no consumers), (2) *version serverinfo star-key (sv_main.c:3684, the actual client/browser-facing advertisement), (3) the legacy `version` cvar (sv_main.c:63, set via Cvar_SetROM at sv_main.c:3915). If a downstream consumer of this Oracle row needs 'what version does the server advertise to clients', the correct entity is the *version serverinfo key, not qws_version.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_paused=C-FIX, serverdemo=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qws_version",
  "type": "cvar",
  "description": "Read-only identity string holding the server engine's version (\"1.20-dev\"). It identifies which engine build version the server is running; a server admin cannot change it.\n\nDefault: the engine version baked in at compile time (1.20-dev at this build).\nSet by: engine, at compile time -- read-only, cannot be changed by config or rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3416. Declared CVAR_ROM at src/sv_main.c:3416 `static cvar_t qws_version = { \"qws_version\", SERVER_VERSION, CVAR_ROM };`; positional initializer seeds string=SERVER_VERSION, flags=CVAR_ROM (struct order src/cvar.h:67-69). SERVER_VERSION is the compile-time macro \"1.20-dev\" (src/version.h:65). Read-only enforced at src/cvar.c:134-135. Registered at src/sv_main.c:3591. The displayed value (1.20-dev) is the source-defined version macro; the git-describe tag of this checkout is 1.11-53-g18d0362 (the SERVER_VERSION macro is the human version string, distinct from the git build number which qws_buildnum carries). Tree-wide grep of mvdsv/src found NO engine read of qws_version -- exposed-by-design identity cvar, NOT dead. No CVAR_SERVERINFO, so not in serverinfo. Cross-codebase (D20 -> reasoning): KTX READS (no override) qws_version in both MOTD (ktx/src/motd.c:77-81) and its version display command (ktx/src/commands.c:1673-1675, \"Version\" row). Verdict synthesized not affirmed: only dev group-header comment exists.",
  "description_proposed": null
}
```
