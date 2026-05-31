# MVDSV L1 describe-fill ledger -- `sv_demoExtraNames`

- **Project:** mvdsv
- **Knob:** `sv_demoExtraNames` (cvar)
- **Anchor version:** `1.11-53-g18d0362` (`git describe --tags` verified before tracing)
- **Mechanical candidate:** none (cold-synth; no trailing comment, no shipped-config candidate)
- **Suspect-pool member:** FALSE (verified vs Phase-0 C3 pool; not runtime-dead)
- **Skill verdict:** `synthesized` (confidence `high`)
- **V-pass self-classification:** TRACED-CLEAN (every material clause maps to a located, verified enforcing line incl. branch + callee)

## Registration / locator facts (NOT the citation)

- C variable + registered name STRING are identical case: `cvar_t sv_demoExtraNames = {"sv_demoExtraNames", "0"};` at `src/sv_demo.c:44`. No letter-case divergence.
- No `CVAR_` flags on the declaration -> plain server-side cvar (not serverinfo, not ROM). Settable from server config / console.
- Registered default literal: `"0"` (matches extractor-recorded default `0`).
- `Cvar_Register(&sv_demoExtraNames)` at `src/sv_demo.c:1856` -- registration locator only, not the behavior citation.
- `extern cvar_t sv_demoExtraNames;` at `src/server.h:995`.

## Read use-sites (Step 1 -- the synthesis input)

Tree-wide grep (`-i`) for `demoExtraNames`/`extranames`/`extra_names`/`extraNames` over `src/**/*.c|*.h` returns exactly FOUR hits: the declaration (`sv_demo.c:44`), the extern (`server.h:995`), the registration (`sv_demo.c:1856`), and **one** value READ at **`src/sv_demo.c:1773`**. There is exactly one read use-site; no other branch or file consumes `.value`/`.string`/`.integer`.

The read sits inside `SV_MVDEasyRecord_f` (the `easyrecord` / `sv_demoeasyrecord` command handler, `src/sv_demo.c:1743`), specifically inside the no-explicit-name `else` block (`1766`) and within the teamplay sub-branch gated by `if ((int)teamplay.value >= 1 && i > 2)` (`1769`). It selects between two `strlcat` filename-suffix forms.

**Observable admin-facing behavior of the single read-site:** when `easyrecord` auto-builds a demo filename for a teamplay game, `sv_demoExtraNames > 0` makes the filename include each team's full player-name roster; otherwise the filename carries only the two team tags + map name.

## Per-clause enforce-trace table (B1 -- MANDATORY)

| # | Clause asserted in `description` | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|---|
| 1 | Affects the demo filename auto-built by the `easyrecord` command | `src/sv_demo.c:1743` + `1773`-`1781` | `void SV_MVDEasyRecord_f (void)` ... `if ((int)sv_demoExtraNames.value > 0)` (inside this handler) | MATCH |
| 2 | Only when recording WITHOUT an explicit demo name | `src/sv_demo.c:1764`-`1766` | `if (c == 2) strlcpy (name, Cmd_Argv(1), ...); else {` -- the read lives in the `else` (no-arg) path; the `c == 2` explicit-name path never reaches 1773 | MATCH |
| 3 | Only for a teamplay game (team play on, >2 active players) | `src/sv_demo.c:1769` | `if ((int)teamplay.value >= 1 && i > 2)` -- the read is inside this `if`; `i = Dem_CountPlayers()` (`1768`) | MATCH |
| 4 | Has NO effect on duel or FFA recordings | `src/sv_demo.c:1783`-`1797` | duel branch (`i == 2`, `duel_%s_vs_%s_%s`) and FFA branch (`ffa_%s(%d)`) are in the sibling `else`; neither references `sv_demoExtraNames` | MATCH (negative scope: read-site is absent from these branches) |
| 5 | Value `> 0` = ON (extra names); polarity / threshold | `src/sv_demo.c:1773` | `if ((int)sv_demoExtraNames.value > 0)` -- int-cast, strict `> 0`; any positive value enables, `0` (and negatives) disables | MATCH |
| 6 | ON appends each team's full player-name list, in `[team]_players_vs_[team]_players_map` shape | `src/sv_demo.c:1775`-`1778` + callee `src/sv_demo_misc.c:1175`-`1203` | `strlcat (name, va("[%s]_%s_vs_[%s]_%s_%s", Dem_Team(1), Dem_PlayerNameTeam(Dem_Team(1)), Dem_Team(2), Dem_PlayerNameTeam(Dem_Team(2)), sv.mapname), ...)`; `Dem_PlayerNameTeam` loops all non-spectator clients on team `t`, `strlcat`-joining each `client->name` with `_` | MATCH (callee followed per B1: the per-player roster is enforced in the callee, not the caller) |
| 7 | OFF (`0`) = compact `team_vs_team_map` (team tags + map only, no player names) | `src/sv_demo.c:1780`-`1781` | `else strlcat (name, va("%s_vs_%s_%s", Dem_Team(1), Dem_Team(2), sv.mapname), ...)` -- only `Dem_Team` (team tag string) + `sv.mapname`; no player-name call | MATCH |
| 8 | Default: 0 | `src/sv_demo.c:44` | `cvar_t sv_demoExtraNames = {"sv_demoExtraNames", "0"};` -- registered default `"0"` (WI-2: verified at the cvar_t literal, not a shipped cfg) | MATCH |
| 9 | Set by: server config | `src/sv_demo.c:44` | declaration carries no `CVAR_SERVERINFO`/`CVAR_ROM`/any flag -> ordinary server-side cvar set from config/console | MATCH |

Callee note (B1 callee-follow, dropquad lesson): clause 6's per-player roster is NOT visible in the caller `strlcat`; it is enforced in `Dem_PlayerNameTeam` (`src/sv_demo_misc.c:1175`-`1203`), which iterates `svs.clients`, skips spectators, and `_`-joins every matching `client->name`. `Dem_Team(n)` (`src/sv_demo_misc.c:1129`-`1156`) returns the n-th distinct team's tag string (used by BOTH the ON and OFF forms), so the OFF form is team-tags-only by construction. Verified, not inferred from the helper names.

WI-1 (wide read): grep covered registration + extern + every read; exactly one read exists (`1773`); no "grouped elsewhere / untraced callee" residual -- the one mediating callee (clause 6) was followed.

## D5 rubric grading (Step 3)

Cold-synth: no trailing comment on `src/sv_demo.c:44` and `mechanical_candidate = none`, so there is nothing to affirm. Per the D5 amendment every entity is still evaluated; with no candidate text the path is straight to Step 5 synthesis. The behavior is fully source-legible at the single read-site + its branch + the followed callee (Step 4 confabulation guard NOT triggered; no name-only inference). Result: `synthesized`, confidence `high`.

D8: not a bot/judgment knob. C2: no candidate -> no candidate-vs-source conflict. C3: suspect_pool_member FALSE -> no dead-stamp.

## D20 QA self-check (Step 5/6)

1. Admin-understandable without C code? Yes -- "player names in the auto demo filename for team games."
2. Zero file:line / function names / engine jargon in `description`? Yes (no `Dem_PlayerNameTeam`, no `.value`, no `strlcat`; all cites live in `description_reasoning`).
3. Values / units spelled out, Default + Set-by present? Yes (`0` vs `1+` meanings; Default 0; Set by server config).
4. Cross-engine detail routed to `See also:`? N/A -- behavior is entirely server-side filename construction; no client/proxy consequence to route.
5. Every clause still enforce-traced (B1), cites recorded in reasoning? Yes (table above; reasoning carries the compact cite list).

## Final human-readable description (verbatim, as emitted)

> Adds player names to the demo filename that the `easyrecord` command builds automatically when recording a teamplay game without an explicit demo name. It only changes how much detail goes into that auto-generated name.
>
> 0 = compact name: team tags and map only (e.g. `4on4_red_vs_blue_dm2`).
> 1 (or higher) = also list each team's players in the name (e.g. `4on4_[red]_alice_bob_vs_[blue]_carol_dave_dm2`).
>
> Has no effect on duel or FFA recordings, or when a demo name is given explicitly.
>
> Default: 0.
> Set by: server config.

(Filenames shown are illustrative of the two suffix shapes the code builds, not literal fixed strings.)

## D6Record (the ONE machine-parsed json block)

```json
{
  "project": "mvdsv",
  "knob": "sv_demoExtraNames",
  "type": "cvar",
  "description": "Adds player names to the demo filename that the `easyrecord` command builds automatically when recording a teamplay game without an explicit demo name. It only changes how much detail goes into that auto-generated name.\n\n0 = compact name: team tags and map only (e.g. `4on4_red_vs_blue_dm2`).\n1 (or higher) = also list each team's players in the name (e.g. `4on4_[red]_alice_bob_vs_[blue]_carol_dave_dm2`).\n\nHas no effect on duel or FFA recordings, or when a demo name is given explicitly.\n\nDefault: 0.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (no trailing comment, no mechanical_candidate); D5-amendment evaluated, straight to Step 5. Single read use-site sv_demo.c:1773 `if ((int)sv_demoExtraNames.value > 0)` inside SV_MVDEasyRecord_f (easyrecord handler, sv_demo.c:1743). Enforce-trace: filename-effect+handler -> sv_demo.c:1743,1773-1781; no-explicit-name scope -> sv_demo.c:1764-1766 (else path); teamplay scope -> sv_demo.c:1769 `(int)teamplay.value >= 1 && i > 2`; no-effect-on-duel/FFA -> sv_demo.c:1783-1797 (read-site absent); polarity/threshold (>0 on, 0 off) -> sv_demo.c:1773; ON appends per-team player roster -> sv_demo.c:1775-1778 + callee Dem_PlayerNameTeam sv_demo_misc.c:1175-1203 (loops svs.clients, skips spectators, '_'-joins client->name); OFF compact team-tags+map -> sv_demo.c:1780-1781 (Dem_Team + sv.mapname only); Dem_Team tag string -> sv_demo_misc.c:1129-1156; Default 0 (WI-2 registered literal) -> sv_demo.c:44; Set-by server config (no CVAR_ flags) -> sv_demo.c:44. Callee-follow applied (clause: per-player roster enforced in callee not caller). suspect_pool_member FALSE -> no C3 dead-stamp; not a D8 bot knob; no C2 conflict (no candidate). V-pass self-class TRACED-CLEAN.",
  "description_proposed": null
}
```

## source_ref (file:line)

- Behavior citation (Step 5 evidence requirement -- the authoritative read use-site): `src/sv_demo.c:1773`
- Supporting enforce-trace cites (in reasoning, not the source_ref): `src/sv_demo.c:1743`, `:1764-1766`, `:1769`, `:1775-1781`, `:1783-1797`, `:44`; callees `src/sv_demo_misc.c:1175-1203`, `:1129-1156`.
