# describe-fill-synthesis ledger -- mvdsv `sv_sayteam_to_spec`

- **project:** mvdsv
- **knob:** `sv_sayteam_to_spec` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_sayteam_to_spec: synthesized -- gates whether players' say_team reaches spectators on/tracking that team; default 1; engine path is mod-fallback, KTX re-enforces identical gate (g_cmd.c:528) and auto-toggles it -- origin=synthesized ref=src/sv_user.c:1896 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether a player's team chat (say_team) is also delivered to spectators. When enabled, a spectator who is watching that team -- either following one of its players or assigned to that team -- can read the team's say_team messages (delivery additionally requires the message to carry the `$\` location marker that genuine client team messages include; a bare say_team without it is treated as private and withheld from spectators). When disabled, players' team chat never reaches any spectator.
>
> 0 = spectators never receive players' say_team.
> 1 = spectators on, or tracking, the speaking player's team receive it.
>
> Default: 1.
> Set by: server config / rcon (the KTX match mod also adjusts it automatically).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 1 | src/sv_user.c:33 | `cvar_t sv_sayteam_to_spec = {"sv_sayteam_to_spec", "1"};` | MATCH |
| value 0 -> spectator always skipped (OFF-state) | src/sv_user.c:1896 | `if( !sv_sayteam_to_spec.value // player can't say_team to spec in this case` | MATCH |
| value 1 -> spec must be real say_team + on speaker's team (tracked) | src/sv_user.c:1897-1899 | `|| !fake ... || (client->spec_track > 0 && strcmp(sv_client->team, svs.clients[client->spec_track - 1].team))` | MATCH |
| engine loop is a fallback; mod short-circuits | src/sv_user.c:1836 | `if (j) return; // say was handled by mod.` | MATCH |
| live KTX path re-enforces same gate/polarity | ktx/src/g_cmd.c:528 | `if (!sv_sayteam_to_spec // player can't say_team to spec in this case` | MATCH |
| KTX reads the cvar | ktx/src/g_cmd.c:297 | `int sv_sayteam_to_spec = cvar("sv_sayteam_to_spec");` | MATCH |
| KTX writes it programmatically | ktx/src/world.c:1468 | `cvar_fset("sv_sayteam_to_spec", desired_value);` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Controls whether a player's team chat (say_team) is also delivered to spectators" | src/sv_user.c:1896 (inside `team` + `client->spectator` branch, 1882/1894) | `if( !sv_sayteam_to_spec.value // player can't say_team to spec in this case` | MATCH |
| 2 | A spectator "watching that team -- either following one of its players or assigned to that team -- can read the team's say_team messages" (ON-state positive claim) | src/sv_user.c:1897-1899 | `\|\| !fake // self say_team does't contain $\\ ...` / `\|\| (client->spec_track <= 0 && strcmp(sv_client->team, client->team))` / `\|\| (client->spec_track > 0 && strcmp(sv_client->team, svs.clients[client->spec_track - 1].team))` | MISMATCH (narrower) -- team-scope (assigned-team / tracking) is correct, but the OR-condition ALSO contains `!fake`: delivery to a spectator additionally requires the message to contain `$\` (char 13). The text presents readability as unconditional for a same-team spectator; the code gates it on `$\`. |
| 3 | "When disabled, players' team chat never reaches any spectator" / "0 = spectators never receive" | src/sv_user.c:1896 | `if( !sv_sayteam_to_spec.value` -> first OR-term true -> `continue` (1901) for every spectator recipient in the player-speaking branch | MATCH |
| 4 | "1 = spectators on, or tracking, the speaking player's team receive it" | src/sv_user.c:1898-1899 (`client->team` = spec's own team; `svs.clients[spec_track-1].team` = tracked player's team) | conditions C/D above; `spec_track` 1-based entnum set at 2160 `sv_client->spec_track = i + 1` | MATCH on team-scope; same `!fake` omission as clause 2 |
| 5 | "Default: 1" | src/sv_user.c:33 + cvar.c:267-269 | `cvar_t sv_sayteam_to_spec = {"sv_sayteam_to_spec", "1"};` ; `value = variable->string;` ... `Cvar_SetROM (variable, value);` seeds runtime value from struct default "1" | MATCH |
| 6 | "Set by: server config / rcon" (settable) | src/sv_user.c:33 (no CVAR flags) + ktx/src/world.c:1468 (runtime write) | struct is `{name,"1"}` only -- no `CVAR_ROM`; `cvar_fset("sv_sayteam_to_spec", desired_value);` proves runtime-mutable | MATCH |
| 7 | "the KTX match mod also adjusts it automatically" (cross-mod side-effect) | ktx/src/world.c:1441-1469 `FixSayTeamToSpecs` | `int desired_value = ...` switch on `k_sayteam_to_spec` w/ `match_in_progress`; `if (current_value != desired_value) cvar_fset("sv_sayteam_to_spec", desired_value);` | MATCH (slightly under-specified: adjustment is driven by KTX's `k_sayteam_to_spec` + match state, not unconditional) |

**V-pass notes:** CLASSIFICATION: C-NEAR-MISS (flavour-C-positive). The cvar's polarity, the 0/1 threshold, the default (1), the OFF-state ("never reaches any spectator"), and the team-scope ("on, or tracking, the speaking player's team") are all enforcement-traced and correct against src/sv_user.c:1896-1901. Nothing is inverted (not C-FIX) and the default/settability metadata is correct (not WI2-FIX).

THE NEAR-MISS (omitted co-equal gate): the enforcing site is a four-term OR whose body is `continue` (skip delivery to that spectator), at lines 1896-1900:
  !sv_sayteam_to_spec.value          (A) cvar off
  || !fake                            (B) message does NOT contain `$\` (char 13)
  || (spec_track<=0 && different team)(C)
  || (spec_track>0 && tracked-player different team)(D)
Delivery to a spectator requires ALL FOUR false. The description accounts for A, C, D but omits B. The `!fake` term is INSIDE the `else if (client->spectator)` block (1894), so it is a spectator-specific gate, not the general player-to-player team gate. `fake` is set at 1875: `fake = (strchr(text,13) ? true : false); // check if string contain "$\"`. The adjacent comment at 1897 is authoritative: "self say_team does't contain $\ so this is treat as private message." Consequence the text misses: even with sv_sayteam_to_spec 1 and a same-team spectator, a say_team message WITHOUT `$\` (char 13) is NEVER delivered to spectators. So the ON-state positive claim ("can read"/"receive it") is unconditional in prose but `$\`-gated in code -- "the real code is narrower / more conditional than implied," the textbook C-NEAR-MISS. In practice QW clients wrap genuine team messages with the location/teamplay `$\` marker, so the omission is often invisible, but it is a real, co-equal enforcement condition and was invisible at output-inspection.

REMEDY for re-synth: add the `$\`/fake gate to the ON-state, e.g. "...can read the team's say_team messages (delivery to spectators additionally requires the message to be a genuine client team message carrying the `$\` location marker; a bare say_team without it is treated as private and withheld from spectators)."

WIDE-READ COMPLETENESS: exhaustive grep of /src found exactly 3 sites -- registration (33), the single enforcing branch (1896), Cvar_Register (4905). No alias/macro/extern read elsewhere. The KTX writer (world.c) is the only cross-mod mutator.

## flags_for_review

- [fyi/cross-mod-override/synthesis] sv_sayteam_to_spec is read at the engine say-distribution loop (sv_user.c:1896) but that loop is only reached when PR_ClientSay returns 0 (sv_user.c:1836 short-circuits when the mod handles the say). Under the standard KTX match mod the engine path is therefore dead for normal play -- the LIVE gate is KTX g_cmd.c:528, which re-implements the identical logic and polarity and also reads/writes the cvar (g_cmd.c:297, world.c:1468). Documented behavior is identical across both paths, so no description change is needed; flagging the dual-path liveness for the human reviewer.
- [review/cross-mod-override/vpass] MVDSV's SV_Say calls PR_ClientSay at sv_user.c:1832 and returns early at 1836-1837 (`if (j) return; // say was handled by mod`). KTX is a QC mod that DOES handle say_team itself (ktx/src/g_cmd.c:508+ mirrors the engine spectator-delivery loop and reads sv_sayteam_to_spec at g_cmd.c:297/528). So on a KTX server the engine enforcing site at sv_user.c:1896 is the FALLBACK path -- the live delivery decision is made in KTX QC, which carries the SAME four-term gate including `!fake` (g_cmd.c:529). The cvar's documented MVDSV-engine behavior (line 1896) is still correct, but operators should know the runtime authority on a KTX match server is the KTX QC handler, not the engine loop. Both honor the cvar identically.
- [fyi/other/vpass] The description's `$\`/fake omission is the flavour-C class the discipline targets: the enforcing site is a 4-term OR and only 3 terms were captured. Flagging so the re-synth seed includes the located miss (sv_user.c:1897, `|| !fake`) per B4 seeded-re-synth contract.
- [fyi/cross-mod-override/vpass] Side-effect clause '(the KTX match mod also adjusts it automatically)' is correct but under-specified: KTX's FixSayTeamToSpecs (world.c:1441) drives sv_sayteam_to_spec from KTX's own k_sayteam_to_spec cvar (values 0-3) and match_in_progress (e.g. k_sayteam_to_spec=1 -> on only during a live match). 'Automatically' is fair shorthand; if tightened, note it is match-state-driven, not unconditional.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_sayteam_to_spec",
  "type": "cvar",
  "description": "Controls whether a player's team chat (say_team) is also delivered to spectators. When enabled, a spectator who is watching that team -- either following one of its players or assigned to that team -- can read the team's say_team messages (delivery additionally requires the message to carry the `$\\` location marker that genuine client team messages include; a bare say_team without it is treated as private and withheld from spectators). When disabled, players' team chat never reaches any spectator.\n\n0 = spectators never receive players' say_team.\n1 = spectators on, or tracking, the speaking player's team receive it.\n\nDefault: 1.\nSet by: server config / rcon (the KTX match mod also adjusts it automatically).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1896. Registration cvar_t literal default 1 at src/sv_user.c:33 (WI-2). Enforcing read-site src/sv_user.c:1896 inside SV_Say (team branch), recipient-is-spectator case: the spectator is `continue`-skipped if `!sv_sayteam_to_spec.value || !fake || (spec_track<=0 && team mismatch) || (spec_track>0 && tracked-player team mismatch)` (:1896-1901). Polarity: value 0 -> first disjunct true -> always skip -> players' say_team never reaches specs; value 1 -> spec receives only if it is a real say_team (fake/$\\ -> private) AND on the speaker's team (tracked or by team string). SAY SHORT-CIRCUIT (chunk lesson): this engine loop runs only when the mod declines the say -- src/sv_user.c:1836 `if (j) return; // say was handled by mod.` after `j = PR_ClientSay(team, p)` (:1834). F-MV1: KTX IS the live consumer and re-implements the identical gate with identical polarity at src/ktx/src/g_cmd.c:528-536 (`if (!sv_sayteam_to_spec || !fake || ...track... ) continue;`), reading `cvar(\"sv_sayteam_to_spec\")` at g_cmd.c:297; KTX also writes it programmatically (g_cmd.c/world.c:1468 cvar_fset). So the documented behavior holds in BOTH the engine fallback (sv_user.c:1896) and the live KTX path (g_cmd.c:528). \"KTX also adjusts it automatically\" is inline-justified (action-relevant: an admin's config value can be overridden by the mod). No CF flags on Cvar_Register (:4905) -> server config/rcon.",
  "description_proposed": null
}
```
