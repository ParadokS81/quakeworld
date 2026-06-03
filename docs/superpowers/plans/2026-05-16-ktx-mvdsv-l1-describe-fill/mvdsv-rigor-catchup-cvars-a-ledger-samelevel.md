# describe-fill-synthesis ledger -- mvdsv `samelevel`

- **project:** mvdsv
- **knob:** `samelevel` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- medium confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:samelevel: synthesized -- engine-stored map restart-vs-rotate toggle exported to the game mod; non-zero=stay on same level / 0=rotate, enforced in KTX (engine has no map-decision read-site) -- origin=synthesized ref=src/pr_cmds.c:1160 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether the server reloads the current map or advances to the next one when a match ends. The MVDSV engine only stores this value; the game mod (e.g. KTX) reads it (via the cvar() interface) to decide: when set, the same level is replayed; when cleared, the server rotates to the next map.
>
> 0 = rotate to the next map when the match ends.
> non-zero = stay on (reload) the current map.
>
> Default: 1.
> Set by: server config / rcon.
> See also: skill, coop.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| engine only stores + exports to progs | src/pr_cmds.c:1160,1168 | `(!strcmp(str,"timelimit") || !strcmp(str,"samelevel"))` ... `G_FLOAT(OFS_RETURN) = Cvar_Value (str);` | MATCH |
| consumer is the mod, not engine | src/sv_main.c:170 | `cvar_t samelevel = {"samelevel","1"}; // ... it used by mods` | MATCH |
| non-zero = stay on same level (mod-enforced) | ktx/src/client.c:562-564 | `if (trap_cvar("samelevel")) // if samelevel is set, stay on same level` | MATCH |
| 0 = change levels (mod-enforced) | ktx/src/commands.c:4168 | `"samelevel 1\n" // change levels off` | MATCH |
| default 1 | src/sv_main.c:170 | `{"samelevel","1"}` | MATCH |
| settable via config/rcon (not blocklisted) | src/sv_main.c:1754-1764 | blocklist lacks samelevel | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|------------------|---------|
| C1 | "Controls whether the server reloads the current map or advances to the next one when a match ends." | (none in MVDSV) | -- no engine site reads samelevel to choose a map. SV_SpawnServer/PF_changelevel never reference it. | UNTRACEABLE (behavior is mod-side, not in MVDSV scope) |
| C2a | "The MVDSV engine only stores this value" | sv_main.c:170 / sv_main.c:3493 | `cvar_t samelevel = {"samelevel","1"}; // dont delete this variable - it used by mods` ; `Cvar_Register (&samelevel);` | MATCH (declared + registered; zero engine-side `.value` consumers confirmed by grep) |
| C2b | "...and exports it to the game mod (e.g. KTX); the mod reads it" | pr_cmds.c:1168 (PF_cvar -> cvar.c:79) | `G_FLOAT(OFS_RETURN) = Cvar_Value (str);` | NEAR-MISS: mechanism real (mod reads via the `cvar()` VM builtin), but "exports" implies serverinfo push -- samelevel has NO CVAR_SERVERINFO flag (line 170 carries no flags); grep confirms it is never serverinfo-flagged |
| C3 | "when set, the same level is replayed" / "non-zero = stay on (reload) the current map" | (none in MVDSV) | -- polarity lives in the mod/QC; engine never branches on samelevel | UNTRACEABLE (mod-side; correct-by-attribution, no enforcing read-site in scope) |
| C4 | "0 = rotate to the next map when the match ends." | (none in MVDSV) | -- same: no engine branch on samelevel==0 | UNTRACEABLE (mod-side; no enforcing read-site in scope) |
| C5 | "Default: 1." | sv_main.c:170 | `cvar_t samelevel = {"samelevel","1"}` | MATCH (registered literal "1"; WI-2 satisfied -- not a shipped-cfg value) |
| C6 | "Set by: server config / rcon." | sv_main.c:3493 (+ generic Cvar) | `Cvar_Register (&samelevel);` -- plain registration, no CVAR_ROM/CVAR_RULE flag, so writable via normal cvar set / rcon | MATCH (no write-protect flag; standard server cvar) |
| C7 | "See also: skill, coop." | sv_main.c:171-172 | `cvar_t skill = {"skill","1"}...; cvar_t coop = {"coop","0"}...` both carry identical `// dont delete this variable - it used by mods` | MATCH (sibling mod-facing cvars declared adjacently with same provenance) |

**V-pass notes:** Classification: C-NEAR-MISS (flavour-C-positive). Rationale: the load-bearing behavioral clauses (C1, C3, C4 -- the map-rotation polarity and the "when a match ends" trigger) have NO enforcing read-site anywhere in the MVDSV oracle. Exhaustive grep of the entire src tree finds samelevel at exactly four lines: declaration (sv_main.c:170), registration (sv_main.c:3493), and a two-line NQ-progs workaround (pr_cmds.c:1159-1166). There is zero engine-side consumer of samelevel.value/.string, and the map-load paths (SV_SpawnServer in sv_init.c, PF_changelevel/PF2_changelevel) never inspect it -- the mod chooses the map name and passes it to the changelevel builtin (Cbuf_AddText("map ...")). The polarity semantics are correct as standard Quake/QC mod behavior, and the description is admirably honest in fencing them behind "the mod reads it to decide," but within the MVDSV scope they are untraceable-by-construction. This is the canonical k_teamoverlay shape (correct-by-accident/attribution, no enforcing read-site on the feature) -> C-NEAR-MISS, not C-FIX.

Why NOT C-FIX: nothing in the description CONTRADICTS MVDSV code. The description explicitly states the engine only stores the value and the mod enforces behavior, which matches the source exactly -- so there is no MISMATCH against any engine line.

Why NOT WI2-FIX: the only hard metadata clause is "Default: 1," which is verified MATCH against the registered literal `{"samelevel","1"}` (WI-2 satisfied -- registered default, not a shipped-cfg value). "Set by: server config / rcon" is also correct (no write-protect flag).

Secondary imprecision (C2b): "exports it to the game mod" implies a serverinfo export, but samelevel carries NO CVAR_SERVERINFO flag (line 170 has no flags field) and is never serverinfo-flagged anywhere. The actual read path is the QC `cvar()` VM builtin (PF_cvar -> Cvar_Value, cvar.c:79). The mechanism the clause describes (mod reads the value) is real and present; only the word "exports/serverinfo" is loose. This alone would be a minor wording nit; combined with the untraced polarity clauses it reinforces the C-NEAR-MISS bucket.

NQ-progs site (pr_cmds.c:1159-1166): the comment "workaround for NQ progs bug: timelimit and samelevel are checked in SP/coop" describes a compatibility shim -- when running NQ progs without deathmatch, the QC `cvar("samelevel")` read returns 0.0 instead of the real cvar value. This is NOT the map-rotation logic and does not enforce any polarity in the description; it is unrelated to the documented behavior and the description correctly does not mention it.

Verifier note: the description's polarity (0 = rotate to next map; non-zero = reload same level) matches the conventional id-Quake samelevel semantics and is what KTX/progs implement, so the user-facing content is substantively correct -- the defect is purely a trace-discipline / scope one (asserting feature behavior whose enforcement is out-of-oracle and not citing the in-scope storage mechanism precisely).

## flags_for_review

- [review/cross-mod-override/synthesis] samelevel's restart-vs-rotate behavior is enforced ONLY in the consuming mod (KTX client.c:562 / commands.c:8567), not in MVDSV engine source. The engine cite (pr_cmds.c:1160) proves storage + progs-export but not the value->map-action mapping. The map semantic rests on cross-mod evidence (KTX); flagged so the V-pass reviewer knows the primary engine citation does not by itself enforce the behavioral clause.
- [review/off-scope-entity/vpass] samelevel's behavioral semantics (map reload vs rotate) are entirely mod-side (KTX/progs). MVDSV only declares, registers, and serves the value via the cvar() VM builtin; it has zero engine-side consumers and the map-load paths never read it. Any 'samelevel does X' description is intrinsically untraceable within the MVDSV oracle -- the polarity can only be confirmed against KTX/progs source, which is out of this oracle's scope. This is a structural property of all three 'used by mods' cvars (samelevel, skill, coop at sv_main.c:170-172).
- [fyi/other/vpass] The proposed description says MVDSV 'exports' samelevel to the mod, implying serverinfo. samelevel has NO CVAR_SERVERINFO flag (sv_main.c:170 carries no flags) and is never serverinfo-flagged anywhere in src. The mod's real read path is the QC cvar() builtin (PF_cvar at pr_cmds.c:1168 -> Cvar_Value at cvar.c:79), not serverinfo. If future synthesis re-uses 'exports/serverinfo' phrasing for non-CVAR_SERVERINFO mod-facing cvars, it will be systematically imprecise.
- [fyi/other/vpass] pr_cmds.c:1159-1166 is an NQ-progs compatibility workaround: when pr_nqprogs is set and deathmatch (pr_globals[35]) is 0, the QC read cvar("samelevel") (and cvar("timelimit")) returns 0.0 instead of the actual cvar value, per comment 'NQ progs bug: timelimit and samelevel are checked in SP/coop'. This is a known intentional shim, not a bug, and is unrelated to map-rotation. Flagging only so a future reader does not mistake this site for the polarity-enforcing line.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "samelevel",
  "type": "cvar",
  "description": "Controls whether the server reloads the current map or advances to the next one when a match ends. The MVDSV engine only stores this value; the game mod (e.g. KTX) reads it (via the cvar() interface) to decide: when set, the same level is replayed; when cleared, the server rotates to the next map.\n\n0 = rotate to the next map when the match ends.\nnon-zero = stay on (reload) the current map.\n\nDefault: 1.\nSet by: server config / rcon.\nSee also: skill, coop.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "medium",
  "description_reasoning": "primary source_ref src/pr_cmds.c:1160. The MVDSV ENGINE has no read-site that makes a map restart/rotate decision from samelevel: the only engine touch is the NQ-progs export workaround at src/pr_cmds.c:1159-1166 (PF_cvar) `if (pr_nqprogs && !pr_globals[35]/*deathmatch*/ && (!strcmp(str,\"timelimit\") || !strcmp(str,\"samelevel\"))) { G_FLOAT(OFS_RETURN)=0.0; return; } ... G_FLOAT(OFS_RETURN)=Cvar_Value(str);` -- i.e. the engine returns the cvar value to the game progs via Cvar_Value, and the registration comment src/sv_main.c:170 `cvar_t samelevel = {\"samelevel\",\"1\"}; // dont delete this variable - it used by mods` confirms the consumer is the mod, not the engine. F-MV1 (mod is the real consumer): in ktx/src the behavior IS enforced -- ktx/src/client.c:562-564 `if (trap_cvar(\"samelevel\")) // if samelevel is set, stay on same level` and ktx/src/commands.c:8567 `if (trap_cvar(\"samelevel\"))`; ktx/src/commands.c:4168 ships `\"samelevel 1\\n\" // change levels off`. So the restart-vs-rotate semantic (non-zero=stay, 0=rotate) is enforced in KTX, and is attributed to the mod in the description per D20's same-codebase rule; the inline mod attribution is action-changing (the admin sets samelevel on the server precisely to control KTX's map behavior). Default \"1\" verified at the registered literal src/sv_main.c:170 (registered sv_main.c:3493). Set-by: not on the rcon blocklist (sv_main.c:1754-1764) -> 'server config / rcon'. Confidence medium: the value-to-behavior mapping is enforced only in the mod (KTX), not the engine source that is the primary citation; the engine-stored meaning and export are fully source-legible.",
  "description_proposed": null
}
```
