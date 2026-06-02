# describe-fill-synthesis ledger -- mvdsv `qwm_homepage`

- **project:** mvdsv
- **knob:** `qwm_homepage` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `version-build-identity` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qwm_homepage: synthesized -- mod-information placeholder holding the running mod's homepage URL; empty default, writable, no MVDSV engine reader (KTX populates+displays it, F-MV1); identity cvar, not dead -- origin=synthesized ref=src/sv_main.c:3428 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Holds the homepage or website URL of the game mod currently running on the server (for example the KTX mod). It is an empty placeholder that the mod fills in when it starts; on a bare server with no mod loaded it stays empty. The value is purely informational identity text -- changing it does not alter how the server plays.
>
> Default: empty.
> Set by: the running mod sets it at startup; an admin can also set it in the server config, though normally the mod owns it.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| empty by default | src/sv_main.c:3428 | `static cvar_t qwm_homepage = { "qwm_homepage", "" };` (cvar_t = {name, string, flags,...} per src/cvar.h:66-75 -> string "" = empty default) | MATCH |
| writable placeholder, not read-only | src/sv_main.c:3428, :3605 | declaration flags omitted (=0/CVAR_NONE); `Cvar_Register(&qwm_homepage)` with no flag set; sibling qws_* carry CVAR_ROM at :3414-3420, qwm_* do not | MATCH |
| not in serverinfo (no claim made) | src/cvar.h:62 | `#define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo` -- flag absent from declaration | MATCH (negative) |
| mod-information placeholder, mod fills it at startup | src/sv_main.c:3421 ; src/g_main.c:507 (KTX) | `// qwm = QuakeWorld Mod information placeholders` ; KTX `cvar_set("qwm_homepage", MOD_URL)` under `// set mod information cvars` | MATCH |
| holds an identity datum (no engine behavior; not dead) | grep src/ (no read) ; src/commands.c:1705 (KTX) | zero MVDSV `.string`/`.value`/Cvar_String/Cvar_Value read of qwm_homepage; KTX reads it to display as `redtext("Webpage")` | MATCH (expected no-consumer) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | "Holds the homepage or website URL of the game mod" (identity/purpose framing) | sv_main.c:3421 (mvdsv comment) + ktx g_main.c:507 + ktx include/g_local.h:82 | `// qwm = QuakeWorld Mod information placeholders` ; `cvar_set("qwm_homepage", MOD_URL);` ; `#define MOD_URL ("https://github.com/QW-Group/ktx")` | MATCH |
| 2 | "(for example the KTX mod)" | ktx g_main.c:506-507 | `// set mod information cvars` ... `cvar_set("qwm_homepage", MOD_URL);` (KTX is the mod that sets it) | MATCH |
| 3 | "empty placeholder that the mod fills in when it starts" | mvdsv sv_main.c:3428 (registered empty) + ktx g_main.c:507 inside G_InitGame | `static cvar_t qwm_homepage = { "qwm_homepage", "" };` ; KTX writes it at progs init via `cvar_set(...)` | MATCH (mvdsv registers empty; fill is external/KTX, correctly attributed to "the mod", not to mvdsv) |
| 4 | "on a bare server with no mod loaded it stays empty" (OFF-state) | mvdsv sv_main.c:3428 + sv_main.c:3605 (plain register, no writer in mvdsv) | `{ "qwm_homepage", "" }` ; `Cvar_Register(&qwm_homepage);` — no mvdsv code ever assigns it; only a mod that calls cvar_set populates it | MATCH |
| 5 | "purely informational identity text -- changing it does not alter how the server plays" (no side-effect) | mvdsv (whole-tree grep: ZERO reads of qwm_homepage); cvar.h:62 (no CVAR_SERVERINFO flag) | declaration has flags=0 (no CVAR_SERVERINFO mirror); `Cvar_String/Cvar_Value/cvar("qwm_homepage")` returns 0 hits across src | MATCH (true for qwm_homepage specifically; see flag re: sibling qwm_name) |
| 6 | "Default: empty." | mvdsv sv_main.c:3428 (registered default, not shipped-cfg) | `static cvar_t qwm_homepage = { "qwm_homepage", "" };` — string field = "" | MATCH (WI-2 satisfied: registered default, empty) |
| 7 | "Set by: the running mod sets it at startup" | ktx g_main.c:507 (G_InitGame) | `cvar_set("qwm_homepage", MOD_URL);` | MATCH (no mvdsv enforcing site; confirmed in mod source, matches mvdsv "placeholders" intent) |
| 8 | "an admin can also set it in the server config" (mutable / admin-settable) | mvdsv cvar.c:134 + cvar.c:279-306 | `if (var->flags & CVAR_ROM) return;` — qwm_homepage lacks CVAR_ROM, so settable; `Cvar_Command` -> `Cvar_Set (v, string)` writes from console/config | MATCH |
| 9 | "though normally the mod owns it" (qualifier) | mvdsv sv_main.c:3421 comment + ktx g_main.c:507 | comment "Mod information placeholders" + KTX actively sets it; nothing in mvdsv writes it | MATCH (judgment-flavoured but grounded: design intent is mod-owned) |

**V-pass notes:** Oracle confirmed: mvdsv @ 1.11-53-g18d0362.

CLASSIFICATION: TRACED-CLEAN. No clause contradicts mvdsv source; no fabricated mvdsv enforcing mechanism; default and OFF-state verified at the registration line.

Mechanism (mvdsv-side): qwm_homepage is one of a deliberate group of empty MUTABLE placeholders. sv_main.c:3421 comment "qwm = QuakeWorld Mod information placeholders". Registered at sv_main.c:3428 as `{ "qwm_homepage", "" }` -> flags=0 (CVAR_NONE), i.e. NOT CVAR_ROM and NOT CVAR_SERVERINFO. Registration at sv_main.c:3605 is a plain Cvar_Register with no special handling. This deliberately contrasts with the sibling qws_homepage (sv_main.c:3420) which is CVAR_ROM with a hardcoded SERVER_HOME_URL -- the qws_* group is the engine's own read-only identity, the qwm_* group is mutable placeholders the mod populates.

Zero-read confirmation (the load-bearing fact for clause 5): a whole-tree grep of qwm_homepage in mvdsv/src returns exactly TWO hits -- the declaration and the registration. No Cvar_String/Cvar_Value/cvar() read anywhere, and it carries no CVAR_SERVERINFO flag, so it is never mirrored to serverinfo (Cvar_Set cvar.c:157-160 gates the SV_ServerinfoChanged call on CVAR_SERVERINFO). Therefore within mvdsv the value genuinely has no behavioral effect. "Purely informational" is TRACED-CLEAN for this specific cvar.

Admin-settable path (clause 8): Cvar_Command (cvar.c:279) handles console/config "qwm_homepage <url>" -> Cvar_Set (cvar.c:306). Cvar_Set returns early ONLY for CVAR_ROM (cvar.c:134); qwm_homepage is not ROM, so the write proceeds. Confirmed settable.

Cross-mod fill (clauses 3 and 7): mvdsv never writes qwm_homepage. The "mod fills it in" behavior is enforced in KTX (1.47-2-g67253dc): g_main.c:507 `cvar_set("qwm_homepage", MOD_URL);` inside G_InitGame under the comment "set mod information cvars"; MOD_URL = "https://github.com/QW-Group/ktx" (include/g_local.h:82). KTX also reads it back for a "Webpage" display command (commands.c:1705). The description correctly attributes the fill to the external mod and never claims mvdsv does it -- so this is NOT a WI2 metadata defect and NOT flavour-C; it is a true, source-confirmed cross-mod fact consistent with the mvdsv comment's stated intent. The mvdsv-only-oracle constraint is respected because the clause is framed as external-actor behavior, not an mvdsv mechanism.

PROC-1 note: clauses 1, 2, 7, 9 reduce to cross-mod facts + a design-intent comment rather than an mvdsv enforcing line. They are all true and verified, so the row is CLEAN, but the operator should be aware the row's behavioral substance rests partly on KTX source (the only mod in-tree that populates the qwm_* group) and on the mvdsv source comment, not on mvdsv enforcement -- appropriate, since mvdsv by design only declares the empty slot.

## flags_for_review

- [fyi/cross-mod-override/synthesis] qwm_homepage has zero MVDSV engine read use-sites. This is the EXPECTED exposed-by-design identity-placeholder case per chunk rules (not dead-stamped). The live consumer is the mod: KTX writes it (src/g_main.c:507) and reads it back to display to players as 'Webpage' (src/commands.c:1705). The cross-codebase KTX consumer is recorded in reasoning but kept out of the user-doc prose because it does not change how an MVDSV admin sets the cvar.
- [review/off-scope-entity/vpass] Sibling cvar qwm_name (sv_main.c:3422, same 'placeholders' group as qwm_homepage) is NOT purely informational in mvdsv: it IS read and gates real behavior -- sv_init.c:424 `strstr(Cvar_String("qwm_name"), "KTX")` gates sv_pext_mvdsv_serversideweapon, and sv_broadcast.c:622 `strstr(Cvar_String("qwm_name"), "KTX")` gates spectalk. The qwm_homepage description's 'purely informational' claim is correct for qwm_homepage specifically (zero reads), but a reader who generalizes 'all qwm_* placeholders are purely informational' would be WRONG for qwm_name. Worth a one-line scope guard in any future qwm-group docs; does NOT make the qwm_homepage row wrong.
- [fyi/cross-mod-override/vpass] The only in-tree writer of qwm_homepage is KTX (g_main.c:507, MOD_URL). mvdsv registers it empty and never writes it. Any mod that does not call cvar_set('qwm_homepage', ...) leaves it '' -- the description's bare-server OFF-state claim depends on the mod, not the engine. This is correctly stated but is inherently a cross-codebase fact; mvdsv source alone cannot prove the positive 'mod fills it in' clause, only the empty-default and zero-read facts.
- [fyi/other/vpass] qwm_homepage lacks CVAR_SERVERINFO, so its value is never advertised to clients/serverinfo within mvdsv. If downstream consumers (e.g. server browsers, qw-oracle other layers) ever assume mod homepage is queryable via serverinfo, that assumption would be false for this cvar -- it is purely a server-side console/log/mod-internal value (KTX reads it for an in-game 'Webpage' G_sprint at commands.c:1705).

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_paused=C-FIX, serverdemo=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qwm_homepage",
  "type": "cvar",
  "description": "Holds the homepage or website URL of the game mod currently running on the server (for example the KTX mod). It is an empty placeholder that the mod fills in when it starts; on a bare server with no mod loaded it stays empty. The value is purely informational identity text -- changing it does not alter how the server plays.\n\nDefault: empty.\nSet by: the running mod sets it at startup; an admin can also set it in the server config, though normally the mod owns it.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3428. qwm_* family declared at src/sv_main.c:3421 with comment '// qwm = QuakeWorld Mod information placeholders'. qwm_homepage declared src/sv_main.c:3428 as `static cvar_t qwm_homepage = { \"qwm_homepage\", \"\" };` -- cvar_t field order is {char *name; char *string; int flags; ...} (src/cvar.h:66-75), so the literal sets default-string \"\" (empty) and flags 0 (CVAR_NONE). Registered as a plain writable cvar at src/sv_main.c:3605 (Cvar_Register(&qwm_homepage)) with no flag mutation -- contrast the sibling qws_* identity cvars at src/sv_main.c:3414-3420 which carry CVAR_ROM (src/cvar.h:63 '// read only'); qwm_homepage has no CVAR_ROM, so it is writable (placeholder, not read-only). It carries NO CVAR_SERVERINFO (src/cvar.h:62 '(1<<0) // mirrored to serverinfo'), so it is NOT advertised in serverinfo -- not claimed. ENFORCE-TRACE: 'empty by default' -> declaration string literal \"\" at src/sv_main.c:3428 (verified against cvar_t layout src/cvar.h:66-75). 'placeholder / writable / not read-only' -> absence of CVAR_ROM in the declaration+registration vs qws_* siblings (src/sv_main.c:3414-3420 carry it, src/sv_main.c:3428/3605 do not). 'mod populates it at startup' / 'mod information' -> family comment src/sv_main.c:3421; LIVE confirmation cross-mod (F-MV1): KTX writes it at src/g_main.c:507 `cvar_set(\"qwm_homepage\", MOD_URL)` under comment '// set mod information cvars' and reads it back to display to players as 'Webpage' at src/commands.c:1705 in a 'QUAKEWORLD MOD INFORMATION' block. NO-ENGINE-CONSUMER (expected, NOT runtime-dead): exhaustive grep of src/ shows zero MVDSV read of qwm_homepage (`.value`/`.string`/Cvar_String/Cvar_Value) -- only qwm_name is engine-read (src/sv_init.c:424, src/sv_broadcast.c:622); qwm_homepage is exposed-by-design identity text readable through the registered-cvar interface by the mod/console, so it is described as 'holds an identity datum', NOT 'controls/tunes X', and is not dead-stamped per chunk rule. source_ref points at the declaration site (src/sv_main.c:3428) because there is no engine read use-site -- this is the registration-site ref pattern for an exposed-by-design identity placeholder; the declaration line is what enforces the entire described behavior (empty default, writable placeholder, mod-information role). The KTX display consumer is a cross-codebase consequence that does NOT change how an MVDSV admin sets the cvar (the mod owns it), so per D20 it is kept out of the user-doc prose and recorded here / flagged.",
  "description_proposed": null
}
```
