# describe-fill-synthesis ledger -- mvdsv `timelimit`

- **project:** mvdsv
- **knob:** `timelimit` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:timelimit: synthesized -- F-MV1 compat cvar: engine has NO match-clock read (only demo metadata + NQ cvar()-serve), game mod (KTX, minutes) runs the timer and overwrites it -- origin=synthesized ref=src/sv_demo_misc.c:276 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the time limit for the match.
>
> mvdsv itself does not run the match clock -- it only stores this value, publishes it, and writes it into demo metadata. The actual countdown and match-end on time are run by the game mod (for example KTX), which also decides the unit and may adjust the value to fit the game mode.
>
> 0 = no time limit set at the engine level (the game mod decides what that means).
>
> Default: 0.
> Set by: server config.
> See also: ktx-match-flow (L3).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| engine writes value into demo metadata | src/sv_demo_misc.c:274-276 | `"date %s\nmap %s\nteamplay %d\ndeathmatch %d\ntimelimit %d\n", ..., (int)timelimit.value);` | MATCH |
| engine only SERVES value to mod's cvar() (NQ workaround), no clock | src/pr_cmds.c:1159-1166 | `if (pr_nqprogs && !pr_globals[35]/* deathmatch */ && (!strcmp(str, "timelimit") ...)) { // workaround for NQ progs bug ... G_FLOAT(OFS_RETURN) = 0.0; return; }` | MATCH |
| no engine countdown/match-end on time exists | mvdsv/src (grep) | (only the two reads above; zero clock/match-end sites) | MATCH |
| mod runs the clock, value in minutes | ktx/src/hoonymode.c:116-118 | `if (timelimit) { ... return (timelimit * 60); }` | MATCH (mod, not engine) |
| mod reads + bounds + overwrites value | ktx/src/world.c:1556,1703-1707 | `int tl = timelimit = cvar("timelimit");` / `if (((timelimit == 0) && (fraglimit == 0)) || (timelimit > k_tt) || (timelimit < 0)) { ... cvar_fset("timelimit", timelimit = k_tt);` | MATCH |
| default 0, serverinfo | src/sv_main.c:161 | `cvar_t timelimit = {"timelimit","0",CVAR_SERVERINFO};` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Registered default = 0 | src/sv_main.c:161 | `cvar_t timelimit = {"timelimit","0",CVAR_SERVERINFO};` | MATCH |
| 2 | "stores this value" | src/cvar.c:152-155 | `tmp = Q_strdup(value); ... var->string = tmp; var->value = Q_atof(var->string);` | MATCH |
| 3 | "publishes it" (mirrors to serverinfo + broadcasts to clients) | src/cvar.h:62 + src/cvar.c:157-160 -> src/sv_ccmds.c:1383-1386 | `#define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo` ; `if (var->flags & CVAR_SERVERINFO) SV_ServerinfoChanged(var->name, var->string);` ; `Info_SetValueForKey(svs.info,key,...); SV_SendServerInfoChange(key,string);` | MATCH |
| 4 | "writes it into demo metadata" | src/sv_demo_misc.c:274-276 (text built in SV_PrintTeams) -> written by src/sv_demo.c:875-878 and src/sv_demo_misc.c:204-207 | `"...timelimit %d\n", ..., (int)timelimit.value);` ; `text = SV_PrintTeams(); fwrite(text,strlen(text),1,f);` | MATCH (precision note: it is the demo's companion `.txt` sidecar, gated by `sv_demotxt` default "1"; NOT the binary MVD stream) |
| 5 | "mvdsv itself does not run the match clock / countdown / match-end on time" (negative) | EXHAUSTIVE grep of src/ -- no enforcing read | Only reads of `timelimit`: registration (sv_main.c:161/3491), demo-txt (sv_demo_misc.c:276), and PF_cvar NQ-progs workaround (pr_cmds.c:1159-1166). No timer/intermission/match-end branch gated on timelimit. Sibling `fraglimit` identically un-enforced by engine. | MATCH (correctly-stated absence) |
| 6 | "actual countdown/match-end run by the game mod (e.g. KTX), which decides the unit and may adjust the value" | not in mvdsv scope; engine performs zero arithmetic/unit interpretation on the value (grep) | engine never multiplies/divides/compares timelimit against a clock | MATCH-by-absence in engine; cross-mod assertion (KTX behavior) UNTRACEABLE in mvdsv -- framed as mod-side, not asserted as mvdsv behavior |
| 7 | "0 = no time limit set at the engine level" (OFF-state) | src/cvar.c:131-132 + same engine-non-enforcement as #5 | `if ((var->flags & CVAR_SERVERINFO) && !strcmp(value,"0")) value = "";` (at 0 the serverinfo key is published empty) ; engine enforces nothing at any value | MATCH |
| 8 | "Set by: server config" (read/write, settable) | src/sv_main.c:161 (CVAR_SERVERINFO, no CVAR_ROM) | flag is `CVAR_SERVERINFO` only; Cvar_Set is not blocked by CVAR_ROM | MATCH |

**V-pass notes:** Oracle version confirmed: 1.11-53-g18d0362. Wide-grep (case-insensitive) found the COMPLETE use-site set for `timelimit`: server.h:737 (extern), sv_main.c:161 (registration, default "0", CVAR_SERVERINFO), sv_main.c:3491 (Cvar_Register), sv_demo_misc.c:274-276 (demo-txt write), pr_cmds.c:1159-1166 (NQ-progs PF_cvar workaround). That is all of them.

Classification rationale: every material clause maps to a located, verified enforcing line, or is a correctly-stated NEGATIVE (the engine genuinely does not run the clock). The core thesis -- "mvdsv stores + publishes + writes-to-demo, but does NOT run the match clock" -- is exhaustively confirmed: the only three readers are serverinfo-mirror, the demo-txt sidecar, and an NQ-progs compat quirk; there is no engine timer/intermission/match-end gated on timelimit, and the sibling cvar `fraglimit` is identically un-enforced by the engine (strong corroboration that match-end enforcement lives entirely in the game mod). Default (0), scope (server-config-settable, not ROM), and OFF-state all check out.

One precision note (clause 4, kept at fyi not a downgrade): "writes it into demo metadata" has a real, default-active enforcing line but is slightly loose -- the value goes into the demo's companion `.txt` file (built by SV_PrintTeams, gated by `sv_demotxt`, registered default "1" so on by default; `sv_demotxt 2` writes an empty file, `0` writes none), NOT into the binary MVD stream. This is still-true, traceable, minor vagueness -- acceptable under the TRACED-CLEAN definition. It does NOT meet C-NEAR-MISS (which requires NO enforcing line or real code materially narrower than implied with no default coverage); here the enforcing line exists and is default-on.

The cross-mod clause (KTX runs the countdown / decides unit / adjusts value) is correctly framed as game-mod behavior rather than asserted as mvdsv behavior, and is consistent with the engine performing zero unit interpretation. Not a mvdsv-source-verifiable claim; flagged below as cross-mod for the orchestrator.

## flags_for_review

- [review/cross-mod-override/synthesis] F-MV1 cross-mod override (strongest form): timelimit has NO engine-side match-clock enforcement in mvdsv whatsoever -- the only reads are demo metadata (sv_demo_misc.c:276) and the PF_cvar NQ-bug workaround (pr_cmds.c:1159, which merely returns the value to a QC cvar() query). The actual countdown, match-end-on-time, unit (KTX treats it as minutes: hoonymode.c:118 timelimit*60) and bounds enforcement all live in the mod (KTX world.c:1703-1717, match.c), which also overwrites the cvar. The L1 prose states the engine-stores / mod-enforces split and routes unit + match-flow specifics to a KTX L3 note.
- [fyi/off-scope-entity/vpass] PF_cvar NQ-progs workaround (src/pr_cmds.c:1159-1166): under pr_nqprogs with deathmatch (pr_globals[35]) false, cvar("timelimit") and cvar("samelevel") return 0.0 to the progs regardless of the actual cvar value. A mod-facing read quirk specific to NQ progs in SP/coop -- not relevant to QW competitive (KTX) usage and not covered by the user-doc, but it IS a fourth use-site where the value the mod sees can differ from the stored value. FYI only; does not affect any clause.
- [review/cross-mod-override/vpass] Clause 6 ('countdown/match-end run by the game mod e.g. KTX, decides the unit, may adjust the value') is a cross-mod assertion. It is NOT verifiable in mvdsv source (the engine does zero arithmetic/unit interpretation on timelimit -- consistent with the claim, but the KTX-side behavior lives in the KTX tree). The wording correctly attributes it to the mod rather than to mvdsv, so it is not a flavour-C defect; flagging so the orchestrator can confirm against KTX if cross-engine accuracy is desired.
- [fyi/other/vpass] Precision on clause 4: 'demo metadata' = a companion `.txt` sidecar (demo name with extension swapped to txt), produced by SV_PrintTeams and gated by sv_demotxt (default '1', so on by default; value 2 = empty placeholder file, 0 = no file). Not embedded in the binary MVD/QTV stream (the only mvdhidden_demoinfo embedding path at sv_demo_misc.c:830-866 embeds an arbitrary operator-supplied file, never timelimit). If tightening is desired, '...and records it in the demo's companion text file (when sv_demotxt is on)' would be exact. Left as-is = acceptable minor vagueness.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "timelimit",
  "type": "cvar",
  "description": "Sets the time limit for the match.\n\nmvdsv itself does not run the match clock -- it only stores this value, publishes it, and writes it into demo metadata. The actual countdown and match-end on time are run by the game mod (for example KTX), which also decides the unit and may adjust the value to fit the game mode.\n\n0 = no time limit set at the engine level (the game mod decides what that means).\n\nDefault: 0.\nSet by: server config.\nSee also: ktx-match-flow (L3).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_demo_misc.c:276. F-MV1 compatibility cvar with the strongest form: mvdsv has NO `.value` enforcement of the match clock at all. Tree-wide grep of mvdsv/src for timelimit reads finds only: (1) sv_demo_misc.c:274-276 `\"...timelimit %d\\n\", ..., (int)timelimit.value)` -- writes the value into demo metadata; (2) pr_cmds.c:1159-1166 inside PF_cvar (the QC `cvar()` builtin): `if (pr_nqprogs && !pr_globals[35] && (!strcmp(str,\"timelimit\")||!strcmp(str,\"samelevel\"))) { G_FLOAT(OFS_RETURN) = 0.0; return; }` with comment 'workaround for NQ progs bug: timelimit and samelevel are checked in SP/coop' -- this is the engine SERVING the value to the mod's cvar() query (returning 0 for NQ progs in non-deathmatch), NOT enforcing a clock. No engine countdown/match-end site exists. The LIVE match clock is the mod's: KTX reads `cvar(\"timelimit\")` (world.c:1556), treats it as MINUTES (hoonymode.c:116-118 `if (timelimit) return (timelimit * 60);`), runs the timer + status (match.c:1335-1337 `self->cnt = bound(0, timelimit, 9999); localcmd(\"serverinfo status \\\"%d min left\\\"...\")`), enforces bounds and OVERWRITES it (world.c:1703-1717 `if (((timelimit == 0) && (fraglimit == 0)) || (timelimit > k_tt) ... cvar_fset(\"timelimit\", timelimit = k_tt)`). Because the unit (minutes) and the meaning of 0 are enforced in the MOD not the engine, per B1 the prose does NOT assert 'minutes' as engine behavior -- it states the engine stores it and the mod runs/interprets the clock, and routes specifics to L3. Registered default '0' at sv_main.c:161 `cvar_t timelimit = {\"timelimit\",\"0\",CVAR_SERVERINFO}` (WI-2). CVAR_SERVERINFO = mirrored to serverinfo (cvar.h:62) -- context, omitted from prose per D20. Set-by: server config (Cvar_Register sv_main.c:3491). Cross-mod-override flagged.",
  "description_proposed": null
}
```
