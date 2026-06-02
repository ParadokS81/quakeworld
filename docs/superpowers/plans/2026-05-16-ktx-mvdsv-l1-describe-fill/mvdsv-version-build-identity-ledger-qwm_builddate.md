# describe-fill-synthesis ledger -- mvdsv `qwm_builddate`

- **project:** mvdsv
- **knob:** `qwm_builddate` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `version-build-identity` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qwm_builddate: synthesized -- mod-information placeholder holding the running mod's build date; empty default, writable, no MVDSV engine reader (KTX populates+displays it, F-MV1); identity cvar, not dead -- origin=synthesized ref=src/sv_main.c:3427 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Holds the build date of the game mod currently running on the server (for example the KTX mod). It is an empty placeholder that the mod fills in when it starts; on a bare server with no mod loaded it stays empty. The value is purely informational identity text -- changing it does not alter how the server plays.
>
> Default: empty.
> Set by: the running mod sets it at startup; an admin can also set it in the server config, though normally the mod owns it.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| empty by default | src/sv_main.c:3427 | `static cvar_t qwm_builddate = { "qwm_builddate", "" };` (cvar_t = {name, string, flags,...} per src/cvar.h:66-75 -> string "" = empty default) | MATCH |
| writable placeholder, not read-only | src/sv_main.c:3427, :3604 | declaration flags omitted (=0/CVAR_NONE); `Cvar_Register(&qwm_builddate)` with no flag set; sibling qws_* carry CVAR_ROM at :3414-3420, qwm_* do not | MATCH |
| not in serverinfo (no claim made) | src/cvar.h:62 | `#define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo` -- flag absent from declaration | MATCH (negative) |
| mod-information placeholder, mod fills it at startup | src/sv_main.c:3421 ; src/g_main.c:506 (KTX) | `// qwm = QuakeWorld Mod information placeholders` ; KTX `cvar_set("qwm_builddate", MOD_BUILD_DATE)` under `// set mod information cvars` | MATCH |
| holds an identity datum (no engine behavior; not dead) | grep src/ (no read) ; src/commands.c:1704 (KTX) | zero MVDSV `.string`/`.value`/Cvar_String/Cvar_Value read of qwm_builddate; KTX reads it to display as `redtext("Date")` | MATCH (expected no-consumer) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| C1 | Holds the build date of the game mod currently running (e.g. KTX) | sv_main.c:3421-3427 (engine comment + reg); KTX g_main.c:506 (canonical setter) | `// qwm = QuakeWorld Mod information placeholders` ... `static cvar_t qwm_builddate = { "qwm_builddate", "" };` / KTX: `cvar_set("qwm_builddate", MOD_BUILD_DATE);` under `// set mod information cvars` | MATCH |
| C2 | Empty placeholder that the mod fills in when it starts | reg: sv_main.c:3427 (default ""); setter path PF_cvar_set pr_cmds.c:1193 / G_CVAR_SET pr2_cmds.c:2653-2655 -> Cvar_Set; KTX G_Init g_main.c:500-507 | `qwm_builddate = { "qwm_builddate", "" }` (empty) + writable; QC builtins route to `Cvar_Set`; KTX sets it in startup `G_Init` | MATCH |
| C3 (OFF-state) | On a bare server with no mod loaded it stays empty | Cvar_Register cvar.c:266-269 | `value = variable->string; variable->string = Q_strdup(""); Cvar_SetROM (variable, value);` -- registered value is the "" default; no engine writer, so absent a mod it remains "" | MATCH |
| C4 (side-effect) | Purely informational identity text; changing it does not alter how the server plays | whole-repo grep: ZERO engine read-sites of qwm_builddate; OnChange=NULL (struct cvar.h:66-75, 2-elem init); no CVAR_SERVERINFO flag | Only sites in mvdsv are reg (3427) + Cvar_Register (3604); no branch reads it; only reader is KTX display commands.c:1704 (`redtext("Date") ... cvar_string("qwm_builddate")`) | MATCH |
| C5 (default) | Default: empty | sv_main.c:3427 + Cvar_Register cvar.c:266-269 | `{ "qwm_builddate", "" }` -- registered default is empty string (no shipped-cfg override; WI-2 satisfied) | MATCH |
| C6 (set-by: mod at startup) | The running mod sets it at startup | KTX g_main.c:500-507; Cvar_Set guard cvar.c:134 | `cvar_set("qwm_builddate", MOD_BUILD_DATE);`; write succeeds because `if (var->flags & CVAR_ROM) return;` does NOT fire (qwm_builddate flags=0) | MATCH |
| C6b (set-by: admin can set in config) | An admin can also set it in the server config | reg flags=0 (no CVAR_ROM) sv_main.c:3427; Cvar_Command cvar.c:279-306 -> Cvar_Set cvar.c:134 | No CVAR_ROM flag, so console `set qwm_builddate <x>` is not rejected by the ROM guard -- writable by admin; description correctly hedges "though normally the mod owns it" | MATCH |

**V-pass notes:** Every material clause enforce-traces to a located line. No flavour-C defect.

Crux clause was C2/C6 ("the mod fills it in"). The MVDSV oracle does not itself set qwm_builddate -- it registers an empty, WRITABLE (no CVAR_ROM) placeholder under the explicit comment `// qwm = QuakeWorld Mod information placeholders` (sv_main.c:3421). The setter mechanism is verified on the MVDSV side: both QC builtin paths (PF_cvar_set pr_cmds.c:1178-1193 for .dat progs; G_CVAR_SET pr2_cmds.c:2653-2655 for native/QVM mods like KTX) route to Cvar_Set, whose only block is `if (var->flags & CVAR_ROM) return;` (cvar.c:134) -- which does not fire because qwm_builddate has flags=0. So a mod CAN write it. The KTX cross-reference (g_main.c:506 sets it; commands.c:1704 displays it) is corroborating evidence, not the oracle, but it confirms the canonical consumer behaves exactly as the MVDSV structure implies.

Contrast that makes the description's framing precise: the sibling qws_* family (qws_builddate etc., sv_main.c:3414-3420) are all CVAR_ROM with real defaults (BUILD_DATE) -- those are the SERVER's own identity, read-only. The qwm_* family is the MOD's identity, empty + writable. The description correctly attributes qwm_builddate to the mod, not the server.

Side-effect clause (C4) is solid: whole-repo grep returns only the registration and the Cvar_Register call -- zero engine branches read qwm_builddate (only qwm_name is engine-read, at sv_init.c:424 and sv_broadcast.c:622 for KTX detection). OnChange is NULL (2-element struct initializer; cvar_t layout cvar.h:66-75). No CVAR_SERVERINFO flag, so it is a plain reportable cvar with no gameplay coupling. "Purely informational identity text" is accurate.

WI-2 (default + access): registered default verified as "" directly at the RegisterCvar-equivalent site (static cvar_t init), not inferred from any cfg. No access-class claim beyond "admin can set," which is grounded in the absence of CVAR_ROM, correctly hedged.

Minor stylistic note (NOT a defect, no reclassification): the description's "(for example the KTX mod)" is engine-accurate -- MVDSV hardcodes `strstr(Cvar_String("qwm_name"), "KTX")` in two places, so KTX is genuinely the canonical/expected populator of the qwm_* family. The example is well-chosen rather than speculative.

## flags_for_review

- [fyi/cross-mod-override/synthesis] qwm_builddate has zero MVDSV engine read use-sites. This is the EXPECTED exposed-by-design identity-placeholder case per chunk rules (not dead-stamped). The live consumer is the mod: KTX writes it (src/g_main.c:506) and reads it back to display to players as 'Date' (src/commands.c:1704). The cross-codebase KTX consumer is recorded in reasoning but kept out of the user-doc prose because it does not change how an MVDSV admin sets the cvar.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_paused=C-FIX, serverdemo=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qwm_builddate",
  "type": "cvar",
  "description": "Holds the build date of the game mod currently running on the server (for example the KTX mod). It is an empty placeholder that the mod fills in when it starts; on a bare server with no mod loaded it stays empty. The value is purely informational identity text -- changing it does not alter how the server plays.\n\nDefault: empty.\nSet by: the running mod sets it at startup; an admin can also set it in the server config, though normally the mod owns it.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3427. qwm_* family declared at src/sv_main.c:3421 with comment '// qwm = QuakeWorld Mod information placeholders'. qwm_builddate declared src/sv_main.c:3427 as `static cvar_t qwm_builddate = { \"qwm_builddate\", \"\" };` -- cvar_t field order is {char *name; char *string; int flags; ...} (src/cvar.h:66-75), so the literal sets default-string \"\" (empty) and flags 0 (CVAR_NONE). Registered as a plain writable cvar at src/sv_main.c:3604 (Cvar_Register(&qwm_builddate)) with no flag mutation -- contrast the sibling qws_* identity cvars at src/sv_main.c:3414-3420 which carry CVAR_ROM (src/cvar.h:63 '// read only'); qwm_builddate has no CVAR_ROM, so it is writable (placeholder, not read-only). It carries NO CVAR_SERVERINFO (src/cvar.h:62 '(1<<0) // mirrored to serverinfo'), so it is NOT advertised in serverinfo -- not claimed. ENFORCE-TRACE: 'empty by default' -> declaration string literal \"\" at src/sv_main.c:3427 (verified against cvar_t layout src/cvar.h:66-75). 'placeholder / writable / not read-only' -> absence of CVAR_ROM in the declaration+registration vs qws_* siblings (src/sv_main.c:3414-3420 carry it, src/sv_main.c:3427/3604 do not). 'mod populates it at startup' / 'mod information' -> family comment src/sv_main.c:3421; LIVE confirmation cross-mod (F-MV1): KTX writes it at src/g_main.c:506 `cvar_set(\"qwm_builddate\", MOD_BUILD_DATE)` under comment '// set mod information cvars' and reads it back to display to players as 'Date' at src/commands.c:1704 in a 'QUAKEWORLD MOD INFORMATION' block. NO-ENGINE-CONSUMER (expected, NOT runtime-dead): exhaustive grep of src/ shows zero MVDSV read of qwm_builddate (`.value`/`.string`/Cvar_String/Cvar_Value) -- only qwm_name is engine-read (src/sv_init.c:424, src/sv_broadcast.c:622); qwm_builddate is exposed-by-design identity text readable through the registered-cvar interface by the mod/console, so it is described as 'holds an identity datum', NOT 'controls/tunes X', and is not dead-stamped per chunk rule. source_ref points at the declaration site (src/sv_main.c:3427) because there is no engine read use-site -- this is the registration-site ref pattern for an exposed-by-design identity placeholder; the declaration line is what enforces the entire described behavior (empty default, writable placeholder, mod-information role). The KTX display consumer is a cross-codebase consequence that does NOT change how an MVDSV admin sets the cvar (the mod owns it), so per D20 it is kept out of the user-doc prose and recorded here / flagged.",
  "description_proposed": null
}
```
