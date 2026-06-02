# describe-fill-synthesis ledger -- mvdsv `qwm_fullname`

- **project:** mvdsv
- **knob:** `qwm_fullname` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `version-build-identity` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qwm_fullname: synthesized -- mod-identity placeholder, default empty, writable; no MVDSV engine reader (exposed-by-design, not dead); filled+read by KTX (F-MV1) -- origin=synthesized ref=src/sv_main.c:3423 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Advertises the full descriptive name of the game mod the server is currently running. The MVDSV engine itself does not act on this value; it is an identity placeholder that the running mod fills in (for example KTX sets it to its own full name at startup) so that tools and the mod's own status displays can show which mod is loaded. Empty when no mod has set it.
>
> Default: empty.
> Set by: the running game mod (e.g. KTX); also writable via server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default empty | src/sv_main.c:3423 | `static cvar_t qwm_fullname = { "qwm_fullname", "" };` | MATCH (2nd field = default string "") |
| writable (no CVAR_ROM) / not serverinfo | src/sv_main.c:3423 + src/cvar.h:66-75 | decl has no 3rd (flags) arg => flags=0; struct order name,string,flags | MATCH |
| registered at startup | src/sv_main.c:3600 | `Cvar_Register(&qwm_fullname);` | MATCH |
| no MVDSV engine reader (identity-only) | src/ (whole tree) | grep qwm_fullname => only decl 3423 + reg 3600 | MATCH (no read-site) |
| filled by running mod (KTX) | ktx/src/g_main.c:502 | `cvar_set("qwm_fullname", MOD_FULLNAME);` | MATCH (cross-mod) |
| read back by KTX mod-info display | ktx/src/commands.c:1696 | `... redtext("Name"), cvar_string("qwm_fullname"));` | MATCH (cross-mod) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | file:line | snippet | Verdict |
|---|--------|-----------|---------|---------|
| 1 | "Advertises the full descriptive name of the game mod currently running" (purpose) | mvdsv sv_main.c:3421-3423 ; ktx g_main.c:502 ; ktx g_local.h:78 | `// qwm = QuakeWorld Mod information placeholders` / `static cvar_t qwm_fullname = { "qwm_fullname", "" };` / KTX: `cvar_set("qwm_fullname", MOD_FULLNAME);` where `#define MOD_FULLNAME ("KTX: Kombat Teams eXtreme")` | MATCH (purpose framing matches source "Mod information placeholders" comment; the value held IS a mod's full descriptive name) |
| 2 | "The MVDSV engine itself does not act on this value; identity placeholder" (engine inertness) | mvdsv full-tree grep: only sv_main.c:3423 (decl) + 3600 (register); ZERO read-sites | No `Cvar_String/Cvar_Value/Cvar_Find("qwm_fullname")` anywhere; siblings qwm_version/buildnum/platform/builddate/homepage also never read (only qwm_name is read for KTX-detection). Source comment: `// ... information placeholders` | MATCH (this IS the central claim; zero engine read-site confirms it; word "placeholders" is the author's own term) |
| 3 | "the running mod fills it in (e.g. KTX sets it to its own full name at startup)" (cross-mod, timing) | ktx g_main.c:501-502 inside `void G_InitGame(...)` | `// set mod information cvars` then `cvar_set("qwm_fullname", MOD_FULLNAME);` ; MOD_FULLNAME = "KTX: Kombat Teams eXtreme" | MATCH (G_InitGame = mod startup; correctly hedged "for example"; full descriptive name confirmed) |
| 4 | "the mod's own status displays can show which mod is loaded" (consumer) | ktx commands.c:1696 | `G_sprint(self, 2, "%s....: %28s\n", redtext("Name"), cvar_string("qwm_fullname"));` | MATCH (KTX reads it in a status/info print) |
| 5 | "tools ... can show which mod is loaded" (external-consumer capability) | mvdsv cvar.c:292-295 (Cvar_Command print path) | `if (c == 1){ Con_Printf ("\"%s\" is \"%s\"\n", v->name, v->string); return true; }` | MATCH (capability "can": rcon/console cvar-print exposes the value to external tooling; real read path, not serverinfo auto-broadcast) |
| 6 | "Empty when no mod has set it" (OFF-state) | mvdsv sv_main.c:3423 ; cvar.h:69 + header comment | default field 2 = `""`; engine never writes it; only a mod writes it (clause 3) | MATCH (registered default empty + no engine writer = empty until a mod sets it) |
| 7 | "Default: empty" (metadata WI-2) | mvdsv sv_main.c:3423 ; cvar.h:66-75 + comment lines 31-35 ("sufficient to initialize ... just the first two fields") | `{ "qwm_fullname", "" }`; struct field order name(68), string(69) -> 2nd field is default string `""` | MATCH (registered default is empty per RegisterCvar/cvar_t init, not a shipped-cfg value) |
| 8 | "Set by: running game mod; also writable via server config" (scope/writability WI-2) | mvdsv sv_main.c:3423 (no CVAR_ROM, contrast qws_* at 3414-3420 which carry CVAR_ROM) ; cvar.c:134 ROM gate | decl has only 2 fields (no flags); `if (var->flags & CVAR_ROM) {... return ...}` does NOT trip -> Cvar_Set succeeds | MATCH (no CVAR_ROM = writable; mod-set confirmed at g_main.c:502; config-writable since not read-only) |

**V-pass notes:** VERDICT: TRACED-CLEAN. Oracle confirmed 1.11-53-g18d0362.

Structural shape: qwm_fullname is one of seven `qwm_*` "QuakeWorld Mod information placeholders" cvars (sv_main.c:3421-3428). Wide-grep over the WHOLE tree (.c/.h/.cpp) finds qwm_fullname at exactly TWO sites, both decl/register in sv_main.c -- ZERO engine read-sites. Six of the seven qwm_* siblings (fullname/version/buildnum/platform/builddate/homepage) are likewise never read by the engine; only qwm_name is read (two KTX-detection strstr sites in sv_broadcast.c:622 + sv_init.c:424). This zero-read fact is normally the WI-2 "no enforcing read-site" trap -- but here it is NOT a defect, because the proposed description's CENTRAL claim is precisely "the engine does not act on this value; it is an identity placeholder." The text correctly reads the absence of a read-site as the behavior, and it matches the source author's own comment verbatim ("information placeholders"). Asserting an engine effect would have been the C-FIX; asserting inertness is correct.

Cross-mod (KTX) trace fully grounds the "for example KTX" clause: g_main.c:502 sets it inside G_InitGame (startup) to MOD_FULLNAME = "KTX: Kombat Teams eXtreme" (g_local.h:78), and KTX consumes it in a status display (commands.c:1696). The "tools can show" capability is grounded in the generic cvar-print path (Cvar_Command, cvar.c:294) reachable via rcon -- a real read path, correctly hedged with "can."

Metadata (WI-2): default = empty, verified against the registered cvar_t initializer `{ "qwm_fullname", "" }` (NOT a shipped-cfg value); field order confirmed via cvar.h:66-75 and the header's "first two fields" comment. Writable confirmed by absence of CVAR_ROM (contrast the qws_* server-info family at 3414-3420 which all carry CVAR_ROM and would reject writes at cvar.c:134).

No clause contradicts code; no clause is pure name/enum/string inference lacking a grounding line. Minor-but-true nuance (flagged fyi): qwm_fullname is NOT CVAR_SERVERINFO, so it is not auto-pushed to the serverinfo string / clients (cvar.c:157 gate). The description does not claim serverinfo broadcast (it says "tools can show," satisfied by rcon cvar-print + the mod's own display), so this is not a defect -- but a downstream reader should not assume serverinfo auto-propagation.

## flags_for_review

- [fyi/cross-mod-override/synthesis] qwm_fullname has no read use-site anywhere in mvdsv src/ (only decl sv_main.c:3423 + reg sv_main.c:3600). Its fill and read are entirely cross-mod: KTX writes it (ktx/src/g_main.c:502) and renders it in its mod-info display (ktx/src/commands.c:1696). source_ref points at the MVDSV declaration because that is the only MVDSV-side line that exhibits the writable-empty-placeholder behavior; the behavioral fill/read evidence is in KTX. Flagging so a human can confirm the MVDSV-declaration source_ref convention for a cvar whose only consumer is the mod.
- [fyi/other/vpass] qwm_fullname (and 5 of 7 qwm_* placeholder cvars) carry no CVAR_SERVERINFO flag, so they are NOT auto-broadcast to clients via the serverinfo string (cvar.c:157 gate fires only when the flag is set). KTX pushes its mod version to serverinfo via a SEPARATE explicit `serverinfo` localcmd (g_main.c:498), not via these cvars. External-tool visibility of qwm_fullname therefore relies on rcon cvar-print (Cvar_Command, cvar.c:294), not serverinfo. The proposed text's 'tools can show' is correctly grounded in this read path, but a reader should not infer serverinfo auto-propagation.
- [fyi/cross-mod-override/vpass] Cross-mod dependency: the 'KTX sets it' clause is verified against the KTX repo (ktx/src/g_main.c:502, ktx/include/g_local.h:78), OUTSIDE the mvdsv oracle. MVDSV itself only declares the empty placeholder. Any future mvdsv L1 description of a qwm_* cvar inherently documents a contract whose only known filler lives in mod repos; correctness of the KTX example depends on the KTX checkout, not the pinned mvdsv tag.
- [fyi/runtime-dead-suspect/vpass] Runtime-dead-suspect (within the mvdsv engine scope only): qwm_fullname has zero engine read-sites in mvdsv, so from the engine's perspective the value is write-only / inert. This is by design (it's a placeholder the engine exposes for mods + external tools), not a bug -- but flagging because a naive liveness pass would mark it dead. It is live via cross-process consumers (KTX status display, rcon).

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_paused=C-FIX, serverdemo=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qwm_fullname",
  "type": "cvar",
  "description": "Advertises the full descriptive name of the game mod the server is currently running. The MVDSV engine itself does not act on this value; it is an identity placeholder that the running mod fills in (for example KTX sets it to its own full name at startup) so that tools and the mod's own status displays can show which mod is loaded. Empty when no mod has set it.\n\nDefault: empty.\nSet by: the running game mod (e.g. KTX); also writable via server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3423. WI-1 tree-wide grep of mvdsv src/ for qwm_fullname found ONLY the declaration (sv_main.c:3423) and registration (sv_main.c:3600) -- zero .string/.value/Cvar_String/Cvar_Value read anywhere in the engine, so MVDSV has no behavioral consumer. Per the chunk's NO-ENGINE-CONSUMER rule this is exposed-by-design identity metadata, not runtime-dead, so NOT dead-stamped. Clause 'writable placeholder, default empty': enforced by the declaration `static cvar_t qwm_fullname = { \"qwm_fullname\", \"\" }` at sv_main.c:3423 -- cvar_t field order is name,string,flags,... (cvar.h:66-75), so the second field is the default string \"\" and the absent third field means flags=0 (no CVAR_ROM=writable, no CVAR_SERVERINFO=not in serverinfo). WI-2 registered default is the literal \"\" at sv_main.c:3423, confirmed. Clause 'set by the running mod': F-MV1 cross-mod -- KTX writes it via cvar_set(\"qwm_fullname\", MOD_FULLNAME) at ktx/src/g_main.c:502 and reads it back for its mod-info display at ktx/src/commands.c:1696. The MVDSV-side enforcing evidence for the writable-placeholder behavior is the declaration; the fill/read lives cross-mod in KTX, so source_ref is the MVDSV declaration site and the KTX cites are recorded here + flagged. No CVAR_SERVERINFO flag, so not advertised in serverinfo (not claimed).",
  "description_proposed": null
}
```
