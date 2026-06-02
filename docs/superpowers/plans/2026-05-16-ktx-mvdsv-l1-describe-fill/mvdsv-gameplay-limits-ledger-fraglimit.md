# describe-fill-synthesis ledger -- mvdsv `fraglimit`

- **project:** mvdsv
- **knob:** `fraglimit` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:fraglimit: synthesized -- F-MV1 pure-storage serverinfo cvar; ZERO engine read, match-end enforced by mod (KTX combat.c:325); cross-mod flag raised -- origin=synthesized ref=src/sv_main.c:160 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the frag total at which the current match ends. The mvdsv engine only stores this value and publishes it in server info; the running game mod (e.g. KTX) is what actually ends the match when a player or team reaches the limit, and treats 0 as no frag limit.
>
> Default: 0.
> Set by: server config / rcon (published in server info).
> See also: ktx-match-flow.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered default 0, serverinfo (stored only) | src/sv_main.c:160 | `cvar_t fraglimit = {"fraglimit","0",CVAR_SERVERINFO};` | MATCH |
| NO engine `.value` read in mvdsv (storage-only) | src (exhaustive grep) | only hits: sv_main.c:160 (reg), sv_main.c:3490 (Cvar_Register), server.h:736 (extern) -- zero `.value`/`.integer` reads | MATCH |
| mod ends match when frags reach limit (engine does not) | ktx src/combat.c:325-327 | `if (fraglimit && (((targ->s.v.frags >= fraglimit) && (targ->ct == ctPlayer)) || ((attacker->s.v.frags >= fraglimit) ...)))` | MATCH |
| mod treats 0 as no limit | ktx src/combat.c:325 | `if (fraglimit` (0 short-circuits the whole check) | MATCH |
| mod loads it by name | ktx src/world.c:1557 | `int fl = fraglimit = cvar("fraglimit");` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Sets the frag total at which the current match ends" (semantic) | ktx/src/combat.c:325-330 | `if (fraglimit` ... `&& (((targ->s.v.frags >= fraglimit) && (targ->ct == ctPlayer)) || ((attacker->s.v.frags >= fraglimit) && (attacker->ct == ctPlayer)))) { EndMatch(0); }` | MATCH -- effect is real; correctly attributed to the mod, not the engine |
| 2 | "engine only stores this value and publishes it in server info" (scope) | mvdsv sv_main.c:160 + sv_main.c:157 (comment) + cvar.c:157-160 + cvar.h:62 | `cvar_t fraglimit = {"fraglimit","0",CVAR_SERVERINFO};` ; `// game rules mirrored in svs.info` ; `if (var->flags & CVAR_SERVERINFO) { SV_ServerinfoChanged (var->name, var->string); }` ; `#define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo` | MATCH -- tree-wide grep finds ZERO engine value-reads (no `fraglimit.value`, no `&fraglimit` except Cvar_Register, no `Cvar_FindVar("fraglimit")`, no serverinfo read-back). Engine store+publish only |
| 3 | "running game mod (e.g. KTX) actually ends the match when a player or team reaches the limit" (cross-mod enforcement) | ktx/src/combat.c:329 (player) + combat.c:332-338 (team) + world.c:1557 (mod reads cvar) | `EndMatch(0);` under player branch; `if (fraglimit && isTeam()) { if ((get_scores1() >= fraglimit) || (get_scores2() >= fraglimit) || (get_scores3() >= fraglimit)) { EndMatch(0); } }`; `int fl = fraglimit = cvar("fraglimit");` | MATCH -- both player AND team paths verified; EndMatch (match.c:278) is the real terminator |
| 4 | "treats 0 as no frag limit" (OFF-state) | ktx/src/combat.c:325 (mod short-circuit) + mvdsv cvar.c:131-132 (engine serverinfo transform) | `if (fraglimit` (leading guard -> false when 0, skips both EndMatch checks); `// force serverinfo "0" vars to be "". if ((var->flags & CVAR_SERVERINFO) && !strcmp(value, "0")) value = "";` | MATCH -- mod skips match-end when 0; engine independently empties the serverinfo key when 0. Clause scoped to match-behavior is correct |
| 5 | "Default: 0" (metadata, WI-2) | mvdsv sv_main.c:160 | `cvar_t fraglimit = {"fraglimit","0",CVAR_SERVERINFO};` | MATCH -- registered default is literal "0", not a cfg-drift value |
| 6 | "Set by: server config / rcon (published in server info)" (access/publication) | mvdsv sv_main.c:160 (flags = CVAR_SERVERINFO only; no CVAR_ROM, no OnChange callback) + cvar.c:157-160 (publish path) | `{"fraglimit","0",CVAR_SERVERINFO}` (no 4th OnChange field, no CVAR_ROM) | MATCH -- ordinary settable serverinfo cvar; no access gating; serverinfo push is the verified CVAR_SERVERINFO mechanism |

**V-pass notes:** Oracle confirmed: git describe == "1.11-53-g18d0362". enforce-trace-discipline.md applied per-clause.

VERDICT: TRACED-CLEAN. Every material clause (semantic / scope / cross-mod enforcement / OFF-state / default / access) maps to a located, verified enforcing line including adjacent comments. No flavour-C inference detected.

Wide-read (WI-1): fraglimit has exactly 3 engine use-sites in mvdsv/src -- the extern (server.h:736), the cvar_t struct registration (sv_main.c:160), and Cvar_Register (sv_main.c:3490). Exhaustive secondary greps for `fraglimit.value/.string/.integer`, `&fraglimit`, `Cvar*"fraglimit"`, `Cvar_FindVar/Cvar_Value/Info_ValueForKey` on fraglimit ALL return empty except the registration. This zero-read result is the structural proof of the description's central scope claim: the engine never enforces fraglimit; it only stores it and (via CVAR_SERVERINFO) mirrors it to svs.info. The description is unusually well-disciplined -- it explicitly draws the engine-scope / mod-scope boundary that the code actually exhibits, rather than asserting the engine ends the match.

Cross-mod substantiation (the "e.g. KTX" clause): traced into the KTX repo at research/repos/ktx. KTX reads the cvar (world.c:1557 `cvar("fraglimit")`), enforces match-end in combat.c on a kill event -- combat.c:329 `EndMatch(0)` for a player reaching the limit, combat.c:338 `EndMatch(0)` for a team-score sum reaching it -- and the leading `if (fraglimit && ...)` guard (combat.c:325, 332) is the literal "treats 0 as no frag limit" short-circuit. This is not name/string inference; the EndMatch branch is concrete.

WI-2 (default): RegisterCvar/cvar_t literal default is "0" (sv_main.c:160), matching "Default: 0". Not a shipped-cfg value.

PROC-1: residual is pure fact, no embedded judgment. Affirm-vs-synthesize not in scope for a cold V-pass.

## flags_for_review

- [review/cross-mod-override/synthesis] F-MV1 cross-mod override (strongest case): `fraglimit` has NO engine `.value` read at all in mvdsv -- exhaustive grep finds only registration + extern. The mvdsv engine never ends a match on frags; KTX does, at combat.c:325-336 (per-player and team-sum), loading the value via world.c:1557. The L1 description necessarily attributes both the match-end and the 0=no-limit meaning to the mod. source_ref is the registration site because no read use-site exists in mvdsv.
- [fyi/other/vpass] Dual enforcement of the 0-as-no-limit semantic. The description attributes 'treats 0 as no frag limit' to the mod (correct for match-ending: KTX combat.c:325 short-circuits on fraglimit==0). Independently, the mvdsv engine ALSO encodes 0-as-absent at the serverinfo layer: cvar.c:131-132 forces any CVAR_SERVERINFO cvar set to "0" to be published as the empty string "". So at the serverinfo wire level, `fraglimit 0` appears as an absent/empty key. The clause as written is true and correctly scoped to match-behavior; this is NOT a defect. Noted only so a downstream editor is aware the engine has its own 0->empty serverinfo transform if they ever want to mention the serverinfo representation.
- [fyi/cross-mod-override/vpass] The proposed description's only behavioral content (match-ending) is enforced entirely in the game mod, with ZERO engine read-sites in mvdsv. Verified the cross-mod claim against research/repos/ktx (combat.c EndMatch branches, world.c cvar read). KTX additionally re-bounds/clamps fraglimit at runtime in several places (commands.c:3040-3065 AdjustFragLimit clamps to 1..100 or hoonymode 0..20; world.c:1703-1722 forces fraglimit=0 in hoonymode and warns if both timelimit and fraglimit are 0). These are KTX policy layers beyond the mvdsv knob's scope and do not affect any mvdsv clause -- recorded only as cross-mod context, not a finding against this row.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "fraglimit",
  "type": "cvar",
  "description": "Sets the frag total at which the current match ends. The mvdsv engine only stores this value and publishes it in server info; the running game mod (e.g. KTX) is what actually ends the match when a player or team reaches the limit, and treats 0 as no frag limit.\n\nDefault: 0.\nSet by: server config / rcon (published in server info).\nSee also: ktx-match-flow.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:160. F-MV1: fraglimit has NO `.value`/`.integer` read anywhere in the mvdsv engine -- exhaustive grep of src returns ONLY the registration `cvar_t fraglimit = {\"fraglimit\",\"0\",CVAR_SERVERINFO}` (sv_main.c:160), the Cvar_Register (sv_main.c:3490), and the extern decl (server.h:736). mvdsv purely stores it in serverinfo; it never enforces a frag end. The match-end behavior is enforced entirely by the mod: KTX loads `fraglimit = cvar(\"fraglimit\")` (ktx world.c:1557) and enforces the end at ktx combat.c:325-327 `if (fraglimit && (((targ->s.v.frags >= fraglimit) ...) || (attacker->s.v.frags >= fraglimit) ...))` and team-sum variant combat.c:332-336; KTX also treats 0 as no-limit via the `if (fraglimit ...)` guard (0 short-circuits). Default \"0\" is the REGISTERED default (WI-2: the cvar_t literal at sv_main.c:160), not a shipped-cfg value. CVAR_SERVERINFO so it propagates to clients/proxies. Per F-MV1 I state the STANDARD admin meaning and attribute the enforcement + the 0=no-limit reading to the mod (the only mvdsv-legible facts are: serverinfo storage + default 0 + no engine reader). source_ref points at the registration because it is the only mvdsv site that exhibits the cvar at all (no read use-site exists).",
  "description_proposed": null
}
```
