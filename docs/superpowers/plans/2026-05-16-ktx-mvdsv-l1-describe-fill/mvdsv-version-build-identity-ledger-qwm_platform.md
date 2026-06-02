# describe-fill-synthesis ledger -- mvdsv `qwm_platform`

- **project:** mvdsv
- **knob:** `qwm_platform` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `version-build-identity` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qwm_platform: synthesized -- mod platform-string placeholder, default empty, writable; no MVDSV engine reader (exposed-by-design, not dead); filled by KTX (QW_PLATFORM_SHORT), read in KTX mod-info Build line (F-MV1) -- origin=synthesized ref=src/sv_main.c:3426 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Advertises the platform string of the game mod the server is currently running (the operating system the mod was built for). The MVDSV engine itself does not act on this value; it is an identity placeholder that the running mod fills in (for example KTX sets it at startup) and is shown alongside the build identifier in the mod's status display. Empty when no mod has set it.
>
> Default: empty.
> Set by: the running game mod (e.g. KTX); also writable via server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default empty | src/sv_main.c:3426 | `static cvar_t qwm_platform = { "qwm_platform", "" };` | MATCH (2nd field = "") |
| writable (no CVAR_ROM) / not serverinfo | src/sv_main.c:3426 + src/cvar.h:66-75 | decl has no flags arg => flags=0; struct order name,string,flags | MATCH |
| registered at startup | src/sv_main.c:3603 | `Cvar_Register(&qwm_platform);` | MATCH |
| no MVDSV engine reader (identity-only) | src/ (whole tree) | grep qwm_platform => only decl 3426 + reg 3603 | MATCH (no read-site) |
| filled by running mod (KTX) = platform-short | ktx/src/g_main.c:505 | `cvar_set("qwm_platform", QW_PLATFORM_SHORT);` | MATCH (cross-mod) |
| read back by KTX, appended to Build line, "u" fallback | ktx/src/commands.c:1701 | `strlen(cvar_string("qwm_platform")) ? cvar_string("qwm_platform") : "u"` | MATCH (cross-mod) |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1a | "Advertises the platform string of the game mod currently running" | src/sv_main.c:3421, :3426 | `// qwm = QuakeWorld Mod information placeholders` ... `static cvar_t qwm_platform = { "qwm_platform", "" };` | MATCH (placeholder cvar, mod-info family) |
| 1b | "(the operating system the mod was built for)" | src/version.h:26-61 (MVDSV) AND ktx/include/g_local.h:42-74 (filler) | `#if defined(_WIN32)` -> `QW_PLATFORM_SHORT "w"` / `#elif defined(__linux__)` -> `"l"` / `#elif defined(__APPLE__)` -> `"m"` | MISMATCH -- value is selected purely on OS preprocessor macros; there is NO architecture (x86/x64/arm) dimension in either MVDSV or KTX definition. "architecture" overstates. |
| 2 | "The MVDSV engine itself does not act on this value" | tree-wide grep of src/ | only sites are `cvar_t qwm_platform = {...}` (decl, sv_main.c:3426) and `Cvar_Register(&qwm_platform)` (sv_main.c:3603); zero reads | MATCH -- no engine read-site exists (contrast: qwm_name IS read at sv_broadcast.c:622 + sv_init.c:424; qwm_platform is not) |
| 3a | "it is an identity placeholder that the running mod fills in" | src/sv_main.c:3421; src/cvar.c:122-135 | `// qwm = QuakeWorld Mod information placeholders`; `Cvar_Set`: only `if (var->flags & CVAR_ROM) return;` -- qwm_platform has no flags, so writable by the mod | MATCH |
| 3b | "(for example KTX sets it at startup)" | OUT OF SCOPE -- ktx/src/g_main.c:505 | `cvar_set("qwm_platform", QW_PLATFORM_SHORT);` (inside mod init, after race_init) | MATCH-as-example, but enforcing site is in KTX, not the MVDSV oracle tree (hedged "for example") |
| 4 | "shown alongside the build identifier in the mod's status display" | OUT OF SCOPE -- ktx/src/commands.c:1698-1701 | `if (strlen(cvar_string("qwm_buildnum")))` ... `G_sprint(self, 2, "%s...: %26s-%1.1s\n", redtext("Build"), cvar_string("qwm_buildnum"), strlen(cvar_string("qwm_platform")) ? cvar_string("qwm_platform") : "u");` | MATCH-as-fact (Build line renders `<buildnum>-<platform>`), but enforcing site is in KTX, not the MVDSV oracle tree |
| 5 | "Empty when no mod has set it" (OFF-state) | src/sv_main.c:3426 | `static cvar_t qwm_platform = { "qwm_platform", "" };` | MATCH (registered default is empty; nothing in MVDSV writes it) |
| 6 | "Default: empty" (metadata) | src/sv_main.c:3426 | `{ "qwm_platform", "" }` -- empty string, no CVAR_ROM/CVAR_SERVERINFO flag | MATCH (registered default empty per WI-2) |
| 7a | "Set by: the running game mod (e.g. KTX)" | OUT OF SCOPE -- ktx/src/g_main.c:505 | `cvar_set("qwm_platform", QW_PLATFORM_SHORT);` | MATCH-as-example (enforcing write lives in KTX) |
| 7b | "also writable via server config" | src/cvar.c:134; src/sv_main.c:3426 | `if (var->flags & CVAR_ROM) return;` -- qwm_platform registered with NO flags, so Cvar_Set proceeds | MATCH (plain settable cvar; not ROM-locked, unlike the parallel qws_platform which IS CVAR_ROM at sv_main.c:3418) |

**V-pass notes:** VERSION CONFIRMED: git describe == 1.11-53-g18d0362.

WIDE-READ (WI-1): qwm_platform has exactly TWO sites in the MVDSV tree -- the declaration `static cvar_t qwm_platform = { "qwm_platform", "" };` (sv_main.c:3426) and `Cvar_Register(&qwm_platform);` (sv_main.c:3603). NO read-site, no branch, no OnChange. So this is a pure placeholder slot; the engine never consumes it. (For contrast I traced the sibling qwm_name, which IS read twice -- sv_broadcast.c:622 and sv_init.c:424, both `strstr(Cvar_String("qwm_name"), "KTX")` to detect KTX. qwm_platform has no such consumer.)

CLASSIFICATION = C-NEAR-MISS, driven by ONE clause: "operating system / architecture" (clause 1b). The platform value -- whether sourced from MVDSV's own QW_PLATFORM_SHORT (version.h:26-61) or the value KTX writes from ITS QW_PLATFORM_SHORT (g_local.h:42-74) -- is selected purely on OS preprocessor macros (_WIN32 -> "w", __linux__ -> "l", __APPLE__ -> "m", the BSDs, SunOS, else "u"). There is no architecture component anywhere. "architecture" is a name/concept over-extension narrowed by the code: a textbook flavour-C near-miss (real value narrower than implied). Minor because "operating system" alone is correct and the value genuinely is a platform string -- but it is an inaccuracy against the enforcing definition, so the row cannot be TRACED-CLEAN. Recommended fix: drop "/ architecture" (use just "operating system the mod was built for", or "the single-letter OS code, e.g. w/l/m").

The two KTX behavioral clauses (3b "KTX sets it at startup", 4 "shown alongside the build identifier") are factually CORRECT -- I verified them in the KTX tree (g_main.c:505 writes it at mod init; commands.c:1700-1701 renders the Build line as `<qwm_buildnum>-<qwm_platform>`, defaulting platform to "u" when empty). They are NOT defects: both are explicitly hedged as examples ("for example KTX...", "e.g. KTX"), which is the legitimate way to characterize a placeholder cvar whose only known real-world filler is a mod. But their enforcing code lives OUTSIDE the declared MVDSV oracle scope -- so within the oracle's own tree they are WI2-unenforceable. Flagged below as cross-mod, not counted against the classification because they are hedged-as-illustration rather than asserted-as-MVDSV-behavior.

All core MVDSV-scoped clauses trace clean: default empty (sv_main.c:3426, WI-2 satisfied), OFF-state empty (same line, no MVDSV writer), writable-via-config (cvar.c:134 -- no CVAR_ROM, contrast the ROM-locked qws_platform at sv_main.c:3418), engine-does-not-act (zero read-sites), identity-placeholder (sv_main.c:3421 comment "QuakeWorld Mod information placeholders").

## flags_for_review

- [fyi/cross-mod-override/synthesis] qwm_platform has no MVDSV read-site (only decl sv_main.c:3426 + reg sv_main.c:3603); fill+read are cross-mod in KTX (g_main.c:505 sets QW_PLATFORM_SHORT; commands.c:1701 reads it back as the platform suffix on the mod Build line, defaulting to "u" when empty). source_ref is the MVDSV declaration (the only MVDSV-side line exhibiting the writable-empty-placeholder behavior). Cross-mod source_ref convention flagged for a human look.
- [fyi/cross-mod-override/vpass] Clauses 3b ('KTX sets it at startup') and 4 ('shown alongside the build identifier in the mod's status display') describe behavior whose enforcing code lives in the KTX codebase (ktx/src/g_main.c:505 writes qwm_platform=QW_PLATFORM_SHORT at mod init; ktx/src/commands.c:1700-1701 renders the 'Build' status line as <qwm_buildnum>-<qwm_platform>), NOT in the MVDSV oracle tree (mvdsv @ 1.11-53-g18d0362). I verified both in the KTX source and they are accurate, and the description hedges them as examples -- so this is not a defect. But the oracle is declared MVDSV-only, and these clauses are unenforceable from within that scope; their truth depends on a separately-versioned mod. Worth confirming the oracle intends to carry cross-mod illustrative claims in MVDSV-scoped placeholder-cvar descriptions.
- [fyi/other/vpass] The qwm_* family (sv_main.c:3422-3428) is a 7-cvar bank of empty-default, non-ROM placeholders (qwm_name/fullname/version/buildnum/platform/builddate/homepage) mirroring the CVAR_ROM qws_* server-info family (sv_main.c:3414-3420). Only qwm_name has an MVDSV read-site (KTX-detection at sv_broadcast.c:622 and sv_init.c:424). The other six -- including qwm_platform -- are write-only-by-mod, read-only-by-mod placeholders with no MVDSV consumer. If sibling qwm_* knobs are being described in this batch, expect the same shape: writable placeholder, default empty, no MVDSV read-site, filled+displayed by KTX. qwm_platform is the only one whose backing value (QW_PLATFORM_SHORT) is OS-derived, which is where the 'architecture' over-claim crept in.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_paused=C-FIX, serverdemo=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qwm_platform",
  "type": "cvar",
  "description": "Advertises the platform string of the game mod the server is currently running (the operating system the mod was built for). The MVDSV engine itself does not act on this value; it is an identity placeholder that the running mod fills in (for example KTX sets it at startup) and is shown alongside the build identifier in the mod's status display. Empty when no mod has set it.\n\nDefault: empty.\nSet by: the running game mod (e.g. KTX); also writable via server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3426. WI-1 tree-wide grep of mvdsv src/ for qwm_platform found ONLY the declaration (sv_main.c:3426) and registration (sv_main.c:3603) -- zero engine read; NO-ENGINE-CONSUMER => identity metadata, NOT dead-stamped. Clause 'writable placeholder, default empty': enforced by `static cvar_t qwm_platform = { \"qwm_platform\", \"\" }` at sv_main.c:3426 -- 2nd field default \"\", absent 3rd field flags=0 (writable; no CVAR_ROM; no CVAR_SERVERINFO) per cvar.h:66-75. WI-2 registered default literal \"\". Clause 'platform string / set by the running mod': F-MV1 cross-mod -- KTX writes cvar_set(\"qwm_platform\", QW_PLATFORM_SHORT) at ktx/src/g_main.c:505 (the mod's build platform-short identifier; KTX-supplied) and reads it back at ktx/src/commands.c:1701 where it is appended to the Build line, falling back to \"u\" when empty. MVDSV-side enforcing evidence is the declaration; the meaning 'platform the mod was built for' is the mod-supplied QW_PLATFORM_SHORT value (cross-mod, action-neutral), so stated plainly in the description with the KTX specifics recorded here, not inlined.",
  "description_proposed": null
}
```
