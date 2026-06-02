# describe-fill-synthesis ledger -- mvdsv `qwm_buildnum`

- **project:** mvdsv
- **knob:** `qwm_buildnum` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `version-build-identity` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qwm_buildnum: synthesized -- mod build-identifier placeholder, default empty, writable; no MVDSV engine reader (exposed-by-design, not dead); filled by KTX with git commit/"unknown", read in KTX mod-info (F-MV1); distinct from CVAR_ROM qws_buildnum -- origin=synthesized ref=src/sv_main.c:3425 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Advertises the build identifier of the game mod the server is currently running. The MVDSV engine itself does not act on this value; it is an identity placeholder that the running mod fills in (for example KTX sets it to its own build's source-control commit at startup) so the mod's status display can show which build is loaded. Empty when no mod has set it.
>
> Default: empty.
> Set by: the running game mod (e.g. KTX); also writable via server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default empty (NOT the qws "unknown"/GIT_COMMIT path) | src/sv_main.c:3425 | `static cvar_t qwm_buildnum = { "qwm_buildnum", "" };` | MATCH (2nd field = "") |
| GIT_COMMIT overwrite is qws_buildnum, NOT qwm_buildnum | src/sv_main.c:3592-3593 | `if (GIT_COMMIT[0]) { qws_buildnum.string = GIT_COMMIT; }` | MATCH (names qws_, not qwm_) |
| writable (no CVAR_ROM) / not serverinfo | src/sv_main.c:3425 + src/cvar.h:66-75 | decl has no flags arg => flags=0; struct order name,string,flags | MATCH |
| registered at startup | src/sv_main.c:3602 | `Cvar_Register(&qwm_buildnum);` | MATCH |
| no MVDSV engine reader (identity-only) | src/ (whole tree) | grep qwm_buildnum => only decl 3425 + reg 3602 | MATCH (no read-site) |
| filled by running mod (KTX) = git commit or "unknown" | ktx/src/g_main.c:504 | `cvar_set("qwm_buildnum", (GIT_COMMIT ? GIT_COMMIT : "unknown"));` | MATCH (cross-mod; commit specific is KTX's) |
| read back by KTX, gated non-empty, for Build line | ktx/src/commands.c:1698-1701 | `if (strlen(cvar_string("qwm_buildnum"))) { ... cvar_string("qwm_buildnum"), ... }` | MATCH (cross-mod) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| C1 | "Advertises the build identifier of the game mod the server is currently running" | mvdsv sv_main.c:3421 (framing) + ktx g_main.c:504 (writer) + ktx commands.c:1700 (surface) | `// qwm = QuakeWorld Mod information placeholders` / `cvar_set("qwm_buildnum", (GIT_COMMIT ? GIT_COMMIT : "unknown"));` / `G_sprint(self, 2, "%s...: %26s-%1.1s\n", redtext("Build"), cvar_string("qwm_buildnum"), ...)` | MATCH |
| C2 | "The MVDSV engine itself does not act on this value" | mvdsv sv_main.c (whole-tree grep) | only sites: `static cvar_t qwm_buildnum = { "qwm_buildnum", "" };` (3425) and `Cvar_Register(&qwm_buildnum);` (3602) -- zero read-sites of qwm_buildnum anywhere in src/ | MATCH (verified by absence) |
| C3 | "identity placeholder that the running mod fills in" | mvdsv sv_main.c:3421 + bridge ktx g_utils.c:1114 -> mvdsv pr2_cmds.c:2654 | `// ... information placeholders` / `trap_cvar_set(var, val);` / `case G_CVAR_SET: Cvar_SetByName(VMA(1), VMA(2));` | MATCH |
| C4 | "KTX sets it to its own build's source-control commit at startup" | ktx g_main.c:504 (inside G_InitGame @ g_main.c:475) + ktx g_local.h:83 | `cvar_set("qwm_buildnum", (GIT_COMMIT ? GIT_COMMIT : "unknown"));` ; `#define GIT_COMMIT ("")` (build-time placeholder, injected with real commit by git build) | MATCH (hedged "for example") |
| C5 | "so the mod's status display can show which build is loaded" | ktx commands.c:1698-1701 (inside ShowVersion @ commands.c:1655) | `if (strlen(cvar_string("qwm_buildnum")))` { `G_sprint(self, 2, "%s...: %26s-%1.1s\n", redtext("Build"), cvar_string("qwm_buildnum"), ...)` } | MATCH |
| C6 | "Empty when no mod has set it" (OFF-state) | mvdsv sv_main.c:3425 + whole-tree (no engine writer) | `static cvar_t qwm_buildnum = { "qwm_buildnum", "" };` -- default empty; no engine assignment (contrast qws_buildnum sv_main.c:3593 `qws_buildnum.string = GIT_COMMIT;`) | MATCH |
| C7 | "Default: empty" (WI-2 registered default) | mvdsv sv_main.c:3425 | `static cvar_t qwm_buildnum = { "qwm_buildnum", "" };` (3rd field flags omitted => 0; NOT CVAR_ROM, NOT CVAR_SERVERINFO) | MATCH |
| C8 | "Set by: the running game mod (e.g. KTX); also writable via server config" | mod path: ktx g_main.c:504 -> pr2_cmds.c:2654; config-writable: sv_main.c:3425 flags=0 (no CVAR_ROM); cvar.h:63 | `Cvar_SetByName(VMA(1), VMA(2))` (mod) ; registration has no `CVAR_ROM` flag so console/config `set` succeeds (cf. `#define CVAR_ROM (1<<1) // read only`) | MATCH |

**V-pass notes:** VERSION CONFIRMED: git describe == 1.11-53-g18d0362.

Verdict: TRACED-CLEAN. Every material clause maps to a located, verified enforcing line; the engine-inertness clause (C2) is verified by exhaustive whole-tree absence, not inference.

Trace summary:
- MVDSV has exactly TWO sites for qwm_buildnum: declaration sv_main.c:3425 `{ "qwm_buildnum", "" }` (flags=0) and register sv_main.c:3602. NO engine read-site exists -- confirmed by grepping the entire src/ tree and the whole repo. This is the basis for C2/C3/C6.
- The cvar is one of a block of "QuakeWorld Mod information placeholders" (sv_main.c:3421 comment), deliberately mirroring the engine's own read-only qws_* block (sv_main.c:3413 "QuakeWorld Server information"). The qws_* siblings carry CVAR_ROM and qws_buildnum is filled from GIT_COMMIT at sv_main.c:3592-3593; the qwm_* siblings carry NO flag and ship empty -- exactly the engine-facts-vs-mod-placeholder split the description describes. The pre-registration exists so a mod's cvar_set finds the cvar (PF_cvar_set prints "variable %s not found" otherwise, pr_cmds.c:1189).
- Cross-mod writer fully traced end-to-end: KTX G_InitGame (g_main.c:475) line 504 cvar_set("qwm_buildnum", GIT_COMMIT) -> ktx g_utils.c:1114 trap_cvar_set -> MVDSV G_CVAR_SET (pr2_cmds.c:2654) Cvar_SetByName. So "Set by: the running game mod (e.g. KTX)" and "at startup" are correct (G_InitGame is the mod init entrypoint). The "(for example KTX ...)" hedge is appropriate -- the engine does not require KTX; any mod can write it.
- Consumer fully traced: KTX ShowVersion (commands.c:1655) prints the value as a "Build: <commit>-<platform>" line guarded by strlen() (commands.c:1698-1701). "so the mod's status display can show which build is loaded" is accurate.
- WI-2 default: registered default is "" (no shipped-cfg drift involved). C7 clean. Access-class N/A (cvar, not command).

KTX-side detail (does NOT affect the MVDSV knob description): ktx GIT_COMMIT is `#define GIT_COMMIT ("")` -- a string-literal pointer that is always non-null, so the ternary `(GIT_COMMIT ? GIT_COMMIT : "unknown")` always selects GIT_COMMIT and the "unknown" arm is effectively dead in this checkout; a real git build injects the actual commit. Mentioned only for completeness; it is mod-internal and the MVDSV description ("its own build's source-control commit") is correct for a real build.

No clause is name/enum/string-inferred without an enforcing trace. No C-NEAR-MISS, no C-FIX, no WI2-FIX.

## flags_for_review

- [fyi/cross-mod-override/synthesis] Name-collision guard: qwm_buildnum (mod placeholder, default "", writable, sv_main.c:3425) must not be confused with qws_buildnum (engine, CVAR_ROM, default "unknown", overwritten with GIT_COMMIT at sv_main.c:3592-3593). The GIT_COMMIT runtime-value logic applies to qws_buildnum only -- verified the if-block names qws_buildnum.string. qwm_buildnum's git-commit-or-"unknown" value is supplied cross-mod by KTX (ktx/src/g_main.c:504). No MVDSV read-site; KTX reads it (commands.c:1698-1701). Cross-mod source_ref convention flagged for review.
- [fyi/other/vpass] qwm_buildnum is registered with flags=0 (sv_main.c:3425) -- it is NOT CVAR_SERVERINFO, so unlike a serverinfo key the value is not auto-mirrored into the serverinfo string broadcast to clients. The verb 'Advertises' in C1 could be read as 'broadcasts to clients'; the actual surfacing path is the mod reading its OWN cvar back for a player-facing print (KTX ShowVersion). The description is still essentially accurate (the value IS surfaced to players via the mod's display, which the body explains), so this is framing-precision only and does not rise to C-NEAR-MISS. fyi for the author in case tighter wording is wanted.
- [fyi/cross-mod-override/vpass] Cross-mod dependency: the entire user-facing behavior of qwm_buildnum is mediated by a separate codebase (KTX, oracle out-of-scope for this MVDSV row). The MVDSV side is a pure inert placeholder. The description correctly hedges with 'for example KTX' rather than asserting KTX is required. Noting the cross-mod nature per the V-pass flag contract; no defect.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_paused=C-FIX, serverdemo=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qwm_buildnum",
  "type": "cvar",
  "description": "Advertises the build identifier of the game mod the server is currently running. The MVDSV engine itself does not act on this value; it is an identity placeholder that the running mod fills in (for example KTX sets it to its own build's source-control commit at startup) so the mod's status display can show which build is loaded. Empty when no mod has set it.\n\nDefault: empty.\nSet by: the running game mod (e.g. KTX); also writable via server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3425. WI-1 tree-wide grep of mvdsv src/ for qwm_buildnum found ONLY the declaration (sv_main.c:3425) and registration (sv_main.c:3602) -- zero engine read; NO-ENGINE-CONSUMER => identity metadata, NOT dead-stamped. NOTE this is the MOD placeholder qwm_buildnum (default \"\"), distinct from the engine's qws_buildnum which is CVAR_ROM and gets GIT_COMMIT written at sv_main.c:3593 -- they are different cvars; the GIT_COMMIT-overwrite logic at 3592-3593 applies to qws_buildnum NOT qwm_buildnum (verified: the if-block names qws_buildnum.string). Clause 'writable placeholder, default empty': enforced by `static cvar_t qwm_buildnum = { \"qwm_buildnum\", \"\" }` at sv_main.c:3425 -- 2nd field default \"\", absent 3rd field flags=0 (writable; no CVAR_ROM; no CVAR_SERVERINFO) per cvar.h:66-75. WI-2 registered default literal \"\". Clause 'set by the running mod / value is the mod build commit': F-MV1 cross-mod -- KTX writes cvar_set(\"qwm_buildnum\", GIT_COMMIT ? GIT_COMMIT : \"unknown\") at ktx/src/g_main.c:504; the git-commit-or-\"unknown\" specific is KTX-supplied (cross-mod, action-neutral), so the MVDSV description says only 'build identifier' and the commit specific is noted here, not inlined. KTX reads it back, gated on non-empty, for its mod-info Build line at ktx/src/commands.c:1698-1701. MVDSV-side enforcing evidence is the declaration; fill/read cross-mod in KTX.",
  "description_proposed": null
}
```
