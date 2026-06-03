# describe-fill-synthesis ledger -- mvdsv `coop`

- **project:** mvdsv
- **knob:** `coop` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:coop: synthesized -- non-zero forces deathmatch off (sv_init.c:339) + team-say to all (sv_user.c:1903) + exported to progs (sv_init.c:584); KTX enforces coop gameplay -- origin=synthesized ref=src/sv_init.c:339 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Marks the server as running cooperative play. When set to a non-zero value, the server turns deathmatch off at map load and lets players' team messages reach everyone in the game (not just their own team). The actual cooperative gameplay rules (monster frags, no countdown, etc.) are enforced by the running mod, which reads this value.
>
> 0 = off (normal deathmatch/teamplay rules apply).
> non-zero = cooperative play (deathmatch forced off; team-say goes to all players).
>
> Default: 0.
> Set by: server config / rcon (the mod may also toggle it, e.g. by vote).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 0, settable (no flags) | src/sv_main.c:172 | `cvar_t coop = {"coop", "0"};` | yes |
| non-zero forces deathmatch off at map load | src/sv_init.c:339-340 | `if ((int)coop.value) Cvar_Set (&deathmatch, "0");` | yes |
| team-say reaches everyone when coop set | src/sv_user.c:1903-1904 | `else if (coop.value) ; // allow team messages to everyone in coop from players.` | yes |
| value exported to (NQ) mod progs | src/sv_init.c:584 | `pr_globals[36] = coop.value;` | yes |
| mod is the gameplay/scoring consumer (F-MV1) | ktx/src/combat.c:295 | `// in coop, killing a monster gives you a frag` / `if (coop)` | yes |
| mod may toggle by vote (F-MV1) | ktx/src/vote.c:1134 | `cvar_fset("coop", coop = !cvar("coop"));` | yes |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | "Marks the server as running cooperative play" (semantic label / mod-facing) | sv_main.c:172 ; sv_init.c:584 | `cvar_t coop = {"coop", "0"}; // dont delete this variable - it used by mods` ; `pr_globals[36] = coop.value;` | MATCH |
| 2 | "When set to a non-zero value, the server turns deathmatch off at map load" | sv_init.c:339-340 (inside `SV_SpawnServer`, def at :246) | `if ((int)coop.value)` / `Cvar_Set (&deathmatch, "0");` | MATCH |
| 3 | "lets players' team messages reach everyone in the game (not just their own team)" | sv_user.c:1903-1904 | `else if (coop.value)` / `; // allow team messages to everyone in coop from players.` | MATCH |
| 4 | "cooperative gameplay rules (monster frags, no countdown, etc.) enforced by the running mod, which reads this value" | (negative) grep monster/countdown+coop in engine = empty ; export at sv_init.c:584 + comment sv_main.c:172 | no engine site gates monster-frag/countdown on coop; `pr_globals[36] = coop.value;` exports to progs; `// it used by mods` | MATCH |
| 5 | "0 = off (normal deathmatch/teamplay rules apply)" (OFF-state) | sv_init.c:339 (branch skipped) ; sv_user.c:1903→1905-1908 (falls through to teamplay/team-compare) | `if ((int)coop.value)` (not taken) ; `else if (!teamplay.value) continue;` / `else if (strcmp(...team...)) continue;` | MATCH |
| 6 | "non-zero = cooperative play (deathmatch forced off; team-say goes to all players)" (restates 2+3) | sv_init.c:339-340 ; sv_user.c:1903-1904 | as rows 2,3 | MATCH |
| 7 | "Default: 0" | sv_main.c:172 (registered at sv_main.c:3488, no flags) | `{"coop", "0"}` ; `Cvar_Register (&coop);` | MATCH |
| 8 | "Set by: server config / rcon (the mod may also toggle it, e.g. by vote)" | sv_main.c:172/3488 (plain cvar, settable) ; (negative) no engine vote/Cmd_AddCommand writes coop — only sv_init.c:317 savegame reset | `{"coop", "0"}` no CVAR_ROM ; engine write-sites = only `Cvar_SetValue(&coop, 0)` under `if (loading_savegame)` | MATCH |

**V-pass notes:** VERDICT: TRACED-CLEAN. All 8 material clauses map to located, verified enforcing lines (with adjacent comments). Oracle confirmed mvdsv @ 1.11-53-g18d0362.

WIDE-READ: 13 word-boundary use-sites of `coop`, all traced. Two are non-sites (false-positive context): sv_main.c:1720-1721 uses the literal string "coop rm" only as an rcon-exploit EXAMPLE (`$coop . *` -> `rm . *`), not a coop cvar read; cvar.c:110 says "non-coop" descriptively in a comment about `deathmatch` serverinfo defaulting, not a coop enforcement site. pr_cmds.c:1163 is a comment ("checked in SP/coop") with no coop read.

ENFORCING SITES verified:
- Deathmatch-off (clause 2/6): sv_init.c:339-340 `if ((int)coop.value) Cvar_Set(&deathmatch,"0")` confirmed INSIDE `SV_SpawnServer` (def sv_init.c:246) -> fires at map load exactly as described. Followed enclosing-function context to validate "at map load".
- Team-say-to-all (clause 3/6): sv_user.c:1903-1904. Verified scope: this branch is reached only on the `team` say path, for a NON-spectator sender (`else` of `sv_client->spectator`), non-spectator recipient (`else` of `client->spectator`). So "players' team messages" is correctly scoped to players (spectators handled in their own branch above). The coop branch is an empty-statement that SKIPS the team-mismatch `continue`, letting the message through to all -> matches "reach everyone".
- Default (clause 7, WI-2): registered default `"0"` verified at the REGISTRATION `cvar_t coop = {"coop","0"}` (sv_main.c:172) + `Cvar_Register(&coop)` (sv_main.c:3488), no flags. Not inferred from any cfg.

MINOR IMPRECISION (sub-threshold, NOT a defect): the two enforcement sites use different truthiness on the value -- `(int)coop.value` at sv_init.c:339 vs raw float `coop.value` at sv_user.c:1903. They agree for every integer value; only a fractional value 0<x<1 would diverge (off at :339, on at :1903). The description's "non-zero value" framing is exact for the normal integer case. Below C-NEAR-MISS bar: every material clause still maps to a verified enforcing line, and the float/int divergence is a fractional-value corner case with no practical bearing.

The "mod may toggle by vote" hedge (clause 8) is accurate: NO engine vote mechanism writes coop. The only engine write-site is sv_init.c:317 `Cvar_SetValue(&coop, 0)`, gated by `if (loading_savegame)` (sv_init.c:314) -- an SP-savegame-load reset, not a vote and not a general behavior; does not contradict "set by server config/rcon". The description correctly attributes vote-toggling to the mod, not the engine.

## flags_for_review

- [fyi/other/vpass] Two coop enforcement sites use inconsistent truthiness: sv_init.c:339 casts `(int)coop.value` (so 0<coop<1 reads as OFF for the deathmatch-force), while sv_user.c:1903 tests raw float `coop.value` (so the same fractional value reads as ON for team-say-to-all). Harmless in practice (coop is always set to integer values), but the two sites would disagree at fractional values. Noted as FYI, not a description defect.
- [fyi/other/vpass] Engine write-site sv_init.c:317 `Cvar_SetValue(&coop, 0)` force-resets coop to 0 during savegame load (gated by `if (loading_savegame)`). The description omits this internal reset. It is an edge-case (SP savegame restore) and does not contradict any clause, but is the one engine write-path the description does not mention.
- [fyi/off-scope-entity/vpass] The string `coop` appears at sv_main.c:1720-1721 purely as an rcon-injection EXAMPLE (`coop rm` / `$coop . *` expanding to `rm . *`) -- a false-positive grep hit, NOT a coop cvar use-site. Flagged so a future re-trace does not mistake it for an enforcement line.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "coop",
  "type": "cvar",
  "description": "Marks the server as running cooperative play. When set to a non-zero value, the server turns deathmatch off at map load and lets players' team messages reach everyone in the game (not just their own team). The actual cooperative gameplay rules (monster frags, no countdown, etc.) are enforced by the running mod, which reads this value.\n\n0 = off (normal deathmatch/teamplay rules apply).\nnon-zero = cooperative play (deathmatch forced off; team-say goes to all players).\n\nDefault: 0.\nSet by: server config / rcon (the mod may also toggle it, e.g. by vote).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_init.c:339. Registered `cvar_t coop = {\"coop\", \"0\"}` at sv_main.c:172 (default 0; no flags, settable; trailing comment 'dont delete this variable - it used by mods' is a maintenance note, NOT the meaning -- ignored per chunk rule). Engine-enforced behaviors, each traced: (1) forces deathmatch off -- sv_init.c:339-340 `if ((int)coop.value) Cvar_Set (&deathmatch, \"0\");` (non-zero is the threshold; cast to int). (2) team-say reaches everyone -- sv_user.c:1903-1904 in the say_team recipient loop: `else if (coop.value) ; // allow team messages to everyone in coop from players.` -- when coop is set this branch falls through without `continue`, so the message is delivered to every client instead of being skipped on the team-mismatch (sv_user.c:1907) or non-teamplay (sv_user.c:1905) branches. (3) exported to NQ progs -- sv_init.c:584 `pr_globals[36] = coop.value;` (only when pr_nqprogs), i.e. the engine hands the value to the mod/progs. F-MV1: KTX is the gameplay consumer -- grep ktx/src shows coop read at world.c:1100/1568, combat.c:295 ('in coop, killing a monster gives you a frag'), match.c:1303 (spectalk in coop), sp_ai.c:1027 (coop AI), and toggled by vote at vote.c:1134 -- so mode/scoring enforcement is attributed to the mod; the engine stores the value + applies only the two engine-side effects above. Also referenced at sv_save.c:102 as a save-state gate (`coop.value != 0`). 'Default 0' = registered default at sv_main.c:172.",
  "description_proposed": null
}
```
