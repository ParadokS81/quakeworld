# describe-fill-synthesis ledger -- mvdsv `registered`

- **project:** mvdsv
- **knob:** `registered` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `hedged` -- medium confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:registered: hedged -- read-only CVAR_ROM constant fixed at 1 (legacy shareware/registered flag); ZERO engine read-site, only the game mod reads it; legacy meaning inferred from doc-comment -- origin=synthesized ref=src/sv_main.c:186 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> A read-only flag, fixed at 1, indicating a fully-registered (non-shareware) game -- a legacy holdover from the original Quake's shareware/registered split. On this server engine the value is constant and the engine itself does not change behavior based on it; game mods running on the server can read it (for example, to gate features that require the full game data).
>
> Value: 1 (read-only; cannot be changed).
> Set by: engine (read-only).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| read-only | src/sv_main.c:186 ; src/cvar.h:63 | `registered = {"registered", "1", CVAR_ROM}` ; `#define CVAR_ROM (1<<1) // read only` | MATCH |
| fixed at 1 (default/value) | src/sv_main.c:186 | `{"registered", "1", CVAR_ROM}` | MATCH |
| engine does not branch on it (no enforcing read) | (whole-tree grep) | no `registered.value`/`.string`/`.integer` or gated branch anywhere in mvdsv src | UNTRACEABLE (absence) |
| not published in serverinfo | src/sv_main.c:186 | no CVAR_SERVERINFO flag in the literal | MATCH |
| legacy shareware/registered meaning | src/cvar.h:51 | `cvar_set ("registered", "1");` (historical doc-comment only) | UNTRACEABLE (inferred from comment context -- hedged) |
| game mod can read it (KTX) | ktx client.c:824 ; ktx triggers.c:902 | `if ( !trap_cvar( "registered" ) )` ; `if (/*trap_cvar( "registered" )*/true)` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | "A read-only flag" | sv_main.c:186 (flag) + cvar.c:134-135 (enforce) + cvar.h:63 (def) | `cvar_t registered = {"registered", "1", CVAR_ROM};` / `if (var->flags & CVAR_ROM) return;` / `#define CVAR_ROM (1<<1) // read only` | MATCH |
| 2 | "fixed at 1" (default value) | sv_main.c:186 (default) + cvar.c:269 (set at register) | `{"registered", "1", CVAR_ROM}` ; `Cvar_SetROM (variable, value);` with `value = variable->string` ("1") | MATCH |
| 3 | "indicating a fully-registered (non-shareware) game" (semantic) | sv_main.c:186 (name+val) ; vfs_os.c:214 (vestigial, COMMENTED OUT) | `{"registered","1",...}` ; `/* ... // if not a registered version, don't ever go beyond base ... */` | MATCH (convention + dead artifact; no LIVE engine branch, and description explicitly disclaims engine behavior) |
| 4 | "a legacy holdover from the original Quake's shareware/registered split" (etymology) | vfs_os.c:212-218 (commented-out shareware file-gate) | `/* if (!static_registered) {	// if not a registered version, don't ever go beyond base ... } */` | MATCH (provenance claim, accurate; vestigial in-tree artifact; not a runtime-behavior assertion) |
| 5 | "the engine itself does not change behavior based on it" (NEGATIVE claim) | whole-tree grep (no read-site) | Zero `registered.value`/`registered.string` reads; zero `cvar("registered")` lookups in entire repo. Only uses: decl sv_main.c:186, register sv_main.c:3568, doc cvar.h:38/51 | MATCH (verified by exhaustive absence) |
| 6 | "game mods running on the server can read it ... to gate features that require the full game data" | sv_main.c:185 (adjacent maintainer comment) | `// We need this cvar, because some mods didn't allow us to go at some placeses of, for example, start map.` | MATCH (directly states mods gate map access on it; correctly hedged "can read it") |
| 7 | "Value: 1 (read-only; cannot be changed)" | cvar.c:134-135 | `if (var->flags & CVAR_ROM) return;` (silent no-op on any Cvar_Set) | MATCH |
| 8 | "Set by: engine (read-only)" | sv_main.c:186 + cvar.c:269 | declared default "1", written only via Cvar_SetROM at registration; never user-settable; no Cvar_SetROM(&registered,...) elsewhere | MATCH |

**V-pass notes:** VERSION CONFIRMED: 1.11-53-g18d0362. Classification: TRACED-CLEAN.

Every material clause traces to a verified line, and the load-bearing negative clause ("engine does not change behavior based on it") is verified by EXHAUSTIVE absence: a whole-tree grep finds zero reads of registered.value / registered.string and zero cvar("registered") string lookups. The only token uses of `registered` are the declaration (sv_main.c:186), the registration call (sv_main.c:3568), and documentation in cvar.h:38/51. The other case-insensitive grep hits are unrelated: vfs_os.c uses a DIFFERENT symbol `static_registered` inside a /* */ comment block; sv_broadcast.c/.h and sv_ccmds.c hits are prose comments.

Read-only mechanics fully traced: CVAR_ROM = (1<<1) "read only" (cvar.h:63); Cvar_Set returns immediately on CVAR_ROM (cvar.c:134-135), so user/console writes are silent no-ops; the value "1" is installed at registration via Cvar_SetROM (cvar.c:269, which temporarily clears the ROM bit). No Cvar_SetROM(&registered, ...) call exists anywhere, so the value genuinely stays "1" for the process lifetime -- "fixed at 1 / cannot be changed" is exact.

The two soft clauses (shareware semantic #3, legacy etymology #4) are provenance statements, not runtime-behavior assertions. They are historically accurate for the Quake `registered` cvar and even have a vestigial in-tree artifact: the COMMENTED-OUT block at vfs_os.c:212-218 is the original shareware file-access gate ("if not a registered version, don't ever go beyond base"). The description does NOT overstate engine behavior -- it explicitly says the engine does not act on the value -- so these clauses do not trip flavour-C. This is why the row is TRACED-CLEAN rather than C-NEAR-MISS: an etymology/provenance clause with a dead code artifact, paired with an explicit disclaimer of live behavior, is not a behavioral over-claim.

The mod-read clause (#6) is the sharpest available "why the value is pinned to 1": the adjacent maintainer comment at sv_main.c:185 states mods gate access to map areas (e.g. start map) on this cvar. The description's final clause captures exactly this. The proximate (mod-gating) rationale and the historical (shareware) framing are complementary, not contradictory -- shareware data presence is the original meaning; mod map-gating is the present-day reason mvdsv force-pins it to 1.

Metadata (WI-2): registered default is the REGISTERED default "1" from the cvar_t initializer (sv_main.c:186), not a shipped-cfg value -- verified at the declaration. No access-class claim to check (read-only, not a command).

Minor (non-blocking) framing note: the description leads with the shareware etymology and relegates the mod-gating rationale (which is the actual stated in-tree reason at sv_main.c:185) to the parenthetical. Both are correct; an alternative emphasis would foreground the maintainer comment's mod-gating reason. This is a presentation preference, not a correctness defect -- does not change the TRACED-CLEAN verdict.

## flags_for_review

- [review/runtime-dead-suspect/synthesis] registered (CVAR_ROM, hardcoded "1") has NO read use-site anywhere in the mvdsv src tree -- no .value/.string read, no branch, and it is not CVAR_SERVERINFO so it is not even pushed to clients. Engine-side it is effectively inert (runtime-dead in the sense that nothing in the engine consumes it). It is NOT in the C3 suspect pool, so it was not dead-stamped; treated as hedged. The only consumer found is the game mod via QC: KTX trap_cvar("registered") at ktx client.c:824 (and a stubbed-to-true site at ktx triggers.c:902). Worth a human look: is this cvar retained purely as a QC/compatibility constant, and should L1 say 'consumed only by the game mod' more definitively?
- [fyi/runtime-dead-suspect/vpass] vfs_os.c:212-218 contains a COMMENTED-OUT shareware file-access gate referencing `static_registered` (`if (!static_registered) { // if not a registered version, don't ever go beyond base ... }`). This is the vestigial original-Quake shareware mechanism, now dead. It corroborates the description's etymology clause but is not live code -- noting it so it is not mistaken for an active enforcing read of the `registered` cvar (it references a different symbol `static_registered`, and is inside a /* */ block).
- [fyi/off-scope-entity/vpass] The `registered` cvar has NO engine read-site in mvdsv -- its sole live consumer is off-tree server-game QC code (KTX / game progs), per the maintainer comment at sv_main.c:185 (mods gate map access on it). The 'mods can read it to gate features' clause is therefore enforced cross-mod (off-tree), consistent with this chunk's identity/consumer-model pattern; flagged for the same cross-mod-L3 treatment as the qwm_*/qws_* identity bank.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "registered",
  "type": "cvar",
  "description": "A read-only flag, fixed at 1, indicating a fully-registered (non-shareware) game -- a legacy holdover from the original Quake's shareware/registered split. On this server engine the value is constant and the engine itself does not change behavior based on it; game mods running on the server can read it (for example, to gate features that require the full game data).\n\nValue: 1 (read-only; cannot be changed).\nSet by: engine (read-only).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "hedged",
  "description_confidence": "medium",
  "description_reasoning": "primary source_ref src/sv_main.c:186. HEDGED: live entity but no engine-side enforcing read use-site exists, and it is NOT in the C3 suspect pool (suspect_pool_member=FALSE), so this is the Step-4 'every read-use-site grep empty AND not suspect' path -- state only what IS source-legible, do not fabricate engine behavior. What IS legible: src/sv_main.c:186 `registered = {\"registered\", \"1\", CVAR_ROM}` -> default \"1\" and CVAR_ROM = read-only (cvar.h:63 `#define CVAR_ROM (1<<1) // read only`); registered at src/sv_main.c:3568 `Cvar_Register(&registered)`. EXHAUSTIVE whole-tree grep for any read (`registered.value`/`.string`/`.integer`, or any branch) returns NOTHING in mvdsv src -- the only other hits are unrelated (`static_registered` in vfs_os.c, the historical doc comment in cvar.h:38/51, and a server-count comment in sv_broadcast.h). It is NOT flagged CVAR_SERVERINFO, so it is not even published to clients via serverinfo by the engine. The legacy meaning (shareware vs registered Quake) is asserted from the historical cvar.h:51 doc-comment context, NOT a behavior trace -- hence hedged + medium confidence. Cross-mod: the only consumer found is the game mod via QC -- KTX reads `trap_cvar(\"registered\")` (ktx client.c:824 `if (!trap_cvar(\"registered\"))`, ktx triggers.c:902 has it stubbed to `true`). So on the engine side this cvar is effectively inert/runtime-dead; the live consumer (if any) is the mod. Route to C1.",
  "description_proposed": null
}
```
