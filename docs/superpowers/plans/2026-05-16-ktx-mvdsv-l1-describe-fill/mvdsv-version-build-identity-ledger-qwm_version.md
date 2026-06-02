# describe-fill-synthesis ledger -- mvdsv `qwm_version`

- **project:** mvdsv
- **knob:** `qwm_version` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `version-build-identity` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qwm_version: synthesized -- mod-version placeholder, default empty, writable; no MVDSV engine reader (exposed-by-design, not dead); filled by KTX, read in KTX mod-info+MOTD (F-MV1) -- origin=synthesized ref=src/sv_main.c:3424 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Advertises the version string of the game mod the server is currently running. The MVDSV engine itself does not act on this value; it is an identity placeholder that the running mod fills in (for example KTX sets it to its own version at startup) so the mod's status and MOTD displays can show which mod version is loaded. Empty when no mod has set it.
>
> Default: empty.
> Set by: the running game mod (e.g. KTX); also writable via server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default empty | src/sv_main.c:3424 | `static cvar_t qwm_version = { "qwm_version", "" };` | MATCH (2nd field = default string "") |
| writable (no CVAR_ROM) / not serverinfo | src/sv_main.c:3424 + src/cvar.h:66-75 | decl has no flags arg => flags=0; struct order name,string,flags | MATCH |
| registered at startup | src/sv_main.c:3601 | `Cvar_Register(&qwm_version);` | MATCH |
| no MVDSV engine reader (identity-only) | src/ (whole tree) | grep qwm_version => only decl 3424 + reg 3601 | MATCH (no read-site) |
| filled by running mod (KTX) | ktx/src/g_main.c:503 | `cvar_set("qwm_version", MOD_VERSION);` | MATCH (cross-mod) |
| read back by KTX mod-info display + MOTD | ktx/src/commands.c:1697 ; ktx/src/motd.c:74-75 | `... redtext("Version"), dig3s("%s", cvar_string("qwm_version")));` ; `... cvar_string("qwm_version")` | MATCH (cross-mod) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| C1 | "Advertises the version string of the game mod the server is currently running" | mvdsv sv_main.c:3421-3424 + ktx g_main.c:503 | `// qwm = QuakeWorld Mod information placeholders` / `static cvar_t qwm_version = { "qwm_version", "" };` / (ktx) `cvar_set("qwm_version", MOD_VERSION);` | MATCH |
| C2 | "The MVDSV engine itself does not act on this value" (scoped to qwm_version) | mvdsv whole tree: only sv_main.c:3424 (reg) + 3601 (register call); zero reads | `Cvar_Register(&qwm_version);` (no Cvar_String/Find/Value("qwm_version") anywhere) | MATCH — narrowly scoped to qwm_version; correctly true. NB sibling qwm_name IS read by engine (sv_init.c:424, sv_broadcast.c:622) — see flag |
| C3 | "identity placeholder that the running mod fills in" | mvdsv sv_main.c:3421 (comment) + 3424 (empty default) | `// qwm = QuakeWorld Mod information placeholders` | MATCH |
| C4 | "(for example KTX sets it to its own version at startup)" | ktx g_main.c:475 (G_InitGame) -> 503; g_local.h:79 | `void G_InitGame(...)` ... `cvar_set("qwm_version", MOD_VERSION);` ; `#define MOD_VERSION ("1.48-dev")` | MATCH — G_InitGame is mod game-init = "at startup"; MOD_VERSION is KTX's own version |
| C5 | "so the mod's status and MOTD displays can show which mod version is loaded" | ktx motd.c:74-75; ktx commands.c:1655 (ShowVersion) -> 1697 | `va("Running %s %s", redtext(cvar_string("qwm_name")), redtext(cvar_string("qwm_version")))` ; `G_sprint(self, 2, "%s.: %28s\n", redtext("Version"), dig3s("%s", cvar_string("qwm_version")));` | MATCH — both displays read it. "status" is generic noun for ShowVersion info-dump; still-true approximation, traceable |
| C6 | "Empty when no mod has set it" (OFF-state) | mvdsv sv_main.c:3424 (registered default) | `static cvar_t qwm_version = { "qwm_version", "" };` | MATCH |
| C7 | "Default: empty" (metadata) | mvdsv sv_main.c:3424; no mvdsv .cfg override | `{ "qwm_version", "" }` | MATCH — registered default per WI-2 |
| C8 | "Set by: the running game mod (e.g. KTX); also writable via server config" | mvdsv sv_main.c:3424 (flags omitted = CVAR_NONE); cvar.h:61-63 | `{ "qwm_version", "" }` (no CVAR_ROM, cf. qws_version line 3416 which IS CVAR_ROM); `#define CVAR_ROM (1<<1) // read only` | MATCH — no ROM flag => freely settable by config/set and by mod cvar_set |

**V-pass notes:** Version confirmed 1.11-53-g18d0362. Every material clause (purpose, no-engine-side-effect, placeholder, cross-mod example, dual consumer, OFF-state, default, set-by/writable) maps to a located, verified line incl. registration default and adjacent comment. mvdsv side: only two qwm_version hits, both registration (sv_main.c:3424 decl, :3601 register) -- ZERO read-sites, which is exactly what C2/C3 assert. The cvar carries no flags (CVAR_NONE), so unlike its CVAR_ROM sibling qws_version it is writable -- C8 correct. KTX side fully corroborates C4 (G_InitGame->cvar_set qwm_version=MOD_VERSION "1.48-dev") and C5 (motd.c MOTD line + commands.c ShowVersion "Version" line both read it). The one soft edge is the generic noun "status" in C5: KTX's reader is ShowVersion (a version/info dump), not a literal `status` command, but it does print a mod-information block and reads the value -- a still-true vagueness that traces to a real read-site, which clears the TRACED-CLEAN bar rather than dropping to near-miss. No clause is name/enum/string-only inference: each has an enforcing or registration line. Description correctly scopes the no-side-effect claim to "this value" (qwm_version) rather than the qwm_* family, which is what keeps C2 a MATCH (see flag for the family-level subtlety).

## flags_for_review

- [fyi/cross-mod-override/synthesis] qwm_version has no MVDSV read-site (only decl sv_main.c:3424 + reg sv_main.c:3601); fill+read are cross-mod in KTX (g_main.c:503, commands.c:1697, motd.c:74-75). Separately note: KTX's localcmd("serverinfo \"%s\" \"%s\"", MOD_SERVERINFO_MOD_KEY, MOD_VERSION) at ktx/src/g_main.c:498 publishes the mod version into the actual serverinfo string under a different key -- it does NOT route through qwm_version, so qwm_version is correctly described as not-in-serverinfo. Flagging the cross-mod source_ref convention and the serverinfo-key adjacency for a human look.
- [fyi/cross-mod-override/vpass] C2's no-engine-side-effect claim is true for qwm_version specifically (zero reads in pinned mvdsv), but the qwm_* FAMILY is NOT uniformly engine-inert: pinned mvdsv reads the sibling cvar qwm_name at sv_init.c:424 (`strstr(Cvar_String("qwm_name"),"KTX")` gating sv_pext_mvdsv_serversideweapon) and sv_broadcast.c:622 (gating k_spectalk). The description's narrow wording 'does not act on this value' is correct and saves it from C-FIX, but a reader could over-generalize the 'identity placeholder' framing to the whole family. Worth a one-line guard if a family-level description is ever synthesized for qwm_name.
- [fyi/hidden-family/vpass] qwm_version is one of a 7-member parallel family (qwm_name/fullname/version/buildnum/platform/builddate/homepage, sv_main.c:3422-3428) mirroring the engine-side qws_* family (3414-3420). The qws_* members are CVAR_ROM and pre-filled with engine build constants (SERVER_VERSION, GIT_COMMIT); the qwm_* members are writable empty placeholders filled by the mod. If the other six qwm_* knobs are in the describe-fill queue they share this exact shape (default empty, writable, mod-filled via ktx g_main.c:501-507, displayed by ktx motd.c + ShowVersion) and can reuse this trace.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_paused=C-FIX, serverdemo=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qwm_version",
  "type": "cvar",
  "description": "Advertises the version string of the game mod the server is currently running. The MVDSV engine itself does not act on this value; it is an identity placeholder that the running mod fills in (for example KTX sets it to its own version at startup) so the mod's status and MOTD displays can show which mod version is loaded. Empty when no mod has set it.\n\nDefault: empty.\nSet by: the running game mod (e.g. KTX); also writable via server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3424. WI-1 tree-wide grep of mvdsv src/ for qwm_version found ONLY the declaration (sv_main.c:3424) and registration (sv_main.c:3601) -- zero .string/.value/Cvar_String/Cvar_Value read in the engine, so MVDSV has no behavioral consumer; per the NO-ENGINE-CONSUMER rule this is exposed-by-design identity metadata, NOT dead-stamped. Clause 'writable placeholder, default empty': enforced by `static cvar_t qwm_version = { \"qwm_version\", \"\" }` at sv_main.c:3424 -- cvar_t order name,string,flags (cvar.h:66-75) makes the 2nd field the default \"\" and the absent 3rd field flags=0 (writable; no CVAR_ROM; no CVAR_SERVERINFO). WI-2 registered default is the literal \"\". Clause 'set by the running mod': F-MV1 cross-mod -- KTX writes cvar_set(\"qwm_version\", MOD_VERSION) at ktx/src/g_main.c:503 and reads it back for the mod-info display at ktx/src/commands.c:1697 and the MOTD at ktx/src/motd.c:74-75. MVDSV-side enforcing evidence is the declaration; fill/read is cross-mod in KTX. Not advertised in serverinfo (no CVAR_SERVERINFO; KTX separately publishes its version via a 'serverinfo' localcmd at g_main.c:498, which is a distinct serverinfo key, not this cvar -- not claimed in description).",
  "description_proposed": null
}
```
