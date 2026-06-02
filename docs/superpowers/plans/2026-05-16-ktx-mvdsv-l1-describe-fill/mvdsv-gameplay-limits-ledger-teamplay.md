# describe-fill-synthesis ledger -- mvdsv `teamplay`

- **project:** mvdsv
- **knob:** `teamplay` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:teamplay: synthesized -- F-MV1 compat cvar: engine stores it + uses 0/nonzero for chat routing & demo labeling, game mod (KTX) enforces team rules and overwrites it; engine-legible meaning is binary -- origin=synthesized ref=src/sv_user.c:1905 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets whether the game is a team game and which team-play ruleset is active.
>
> 0 = no teams (free-for-all): team voice is delivered to everyone and the match is recorded as FFA.
> nonzero = a team game: team voice is routed only to teammates, and the match is recorded as teamplay.
>
> Note: mvdsv uses this value to route team voice and to label demos; team text chat and the actual team rules (such as team-damage behavior) are handled by the game mod (e.g. KTX), which may also change this value to match the game mode it is running.
>
> Default: 0.
> Set by: server config.
> See also: ktx-teamplay-modes (L3).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| 0 = non-team game (engine gate, text chat) | src/sv_user.c:1905 | `else if (!teamplay.value) continue; // non team game` | MATCH |
| nonzero = team voice to teammates; 0 = to all | src/sv_user.c:2888 | `if (vt == VT_TEAM && !teamplay.ival) vt = VT_ALL;` | MATCH |
| value handed to mod (NQ progs global only) | src/sv_init.c:581-585 | `if (pr_nqprogs) { ... pr_globals[37] = teamplay.value; }` | MATCH |
| 0 = FFA / nonzero = teamplay demo labeling | src/sv_demo_misc.c:287,302 | `else if (!(int)teamplay.value) // ffa ... else { // teamplay` | MATCH |
| engine has NO team-damage enforcement (mod does) | ktx/src/combat.c:567,758,759 | `// in teamplay 4 we do no armor or health damage to teammates` / `// teamplay == 1 don't damage self and mates` / `// teamplay == 3 don't damage mates` | MATCH (enforcement is in mod, not engine) |
| mod reads + overwrites the value | ktx/src/world.c:1555,1612,1627 | `int tp = teamplay = cvar("teamplay");` / `trap_cvar_set_float("teamplay", (teamplay = 2));` / `trap_cvar_set_float("teamplay", (teamplay = 0));` | MATCH |
| default 0, serverinfo | src/sv_main.c:162 | `cvar_t teamplay = {"teamplay","0",CVAR_SERVERINFO};` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Sets whether the game is a team game and which team-play ruleset is active" | src/sv_main.c:162 (registration); ruleset-selection is mod-side only | `cvar_t teamplay = {"teamplay","0",CVAR_SERVERINFO};` | MATCH (framing) -- engine only branches FFA-vs-nonzero; "which ruleset" is interpreted by the mod, which the note attributes correctly |
| 2 | "0 = no teams (free-for-all)" | src/sv_demo_misc.c:287; src/sv_demo.c:1796 | `else if (!(int)teamplay.value) // ffa` / `// FFA ... snprintf(name,...,"ffa_%s(%d)"...)` | MATCH |
| 3 | "0: the server treats team chat as a normal game" | TEXT: src/sv_user.c:1905-1906 (engine fallback); VOICE: src/sv_user.c:2888-2889 | `else if (!teamplay.value) continue; // non team game` (text) vs `if (vt == VT_TEAM && !teamplay.ival) vt = VT_ALL;` (voice) | MISMATCH (partial) -- VOICE in FFA IS promoted to all (= "normal"), but engine-fallback TEXT say_team in FFA `continue`s every other recipient, reaching only the sayer (NOT broadcast). Text path is also mod-intercepted (clause 8) so this engine fallback is rarely live |
| 4 | "0: records the match as FFA" | src/sv_demo_misc.c:287-290; src/sv_demo.c:1796 | `snprintf(lastscores,...,"ffa:");` / `"ffa_%s(%d)"` | MATCH |
| 5 | "nonzero = a team game" | src/sv_demo.c:1769; src/sv_demo_misc.c:301-302 | `if ((int)teamplay.value >= 1 && i > 2)` / `else { // teamplay` | MATCH |
| 6 | "nonzero: team chat and team voice routed only to teammates" | VOICE: src/sv_user.c:2913; TEXT: src/sv_user.c:1907 | `if (strcmp(cl->team, host_client->team) || cl->spectator) continue;` (voice) / `else if (strcmp(sv_client->team, client->team)) continue;` (text) | MATCH -- voice filter is genuine engine; text filter is engine-fallback (mod usually owns it). Specs have a separate spec-team channel (1885-1909, 2906-2910), a detail the note simplifies |
| 7 | "nonzero: the match is recorded as teamplay" | src/sv_demo_misc.c:301-303; src/sv_demo.c:1769-1772 | `else { // teamplay snprintf(lastscores,...,"tp:");` / `"%don%d_"` | MATCH (edge: a 2-player teamplay match still records as "duel"/`duel_` via numcl==2 / i==2 branch, not "tp") |
| 8 | "mvdsv only stores this value and uses it to route team chat/voice and label demos" | route: sv_user.c:1905 + :2888; label: sv_demo.c:1769 + sv_demo_misc.c:274,287,301; also mirror sv_main.c:162 + nq-copy sv_init.c:585 | `pr_globals[37] = teamplay.value;` (NQ-only); `CVAR_SERVERINFO` mirror | MATCH (slightly incomplete + overstated) -- accurate that engine only stores + routes + labels with NO rules; but TEXT chat routing is mod-intercepted (PR_ClientSay->ChatMessage), so "uses it to route team chat" overstates the engine's role for text (voice is the real non-interceptable engine use). Omits the serverinfo mirror and the NQ-progs global copy |
| 9 | "actual team rules (e.g. team-damage) decided and enforced by the game mod" | whole-tree grep: zero hits | `grep -rni "friendlyfire|team_damage|teamdamage|friendly_fire" src/*.c` -> (none) | MATCH -- no friendly-fire/team-damage logic anywhere in engine; entirely mod-side |
| 10 | "a mod like KTX may change this value" | src/pr_cmds.c:1193 (QC); src/pr2_cmds.c:2654 (PR2) -> src/cvar.c:122 | `Cvar_Set (var, val);` / `Cvar_SetByName(VMA(1), VMA(2));` (-> Cvar_Set) | MATCH -- both VMs write the live C cvar via Cvar_Set (store + serverinfo mirror, no extra behavior) |
| 11 | "Default: 0" | src/sv_main.c:162 | `cvar_t teamplay = {"teamplay","0",CVAR_SERVERINFO};` | MATCH -- registered default "0"; bare init, no OnChange |
| 12 | "Set by: server config" | src/sv_main.c:162 (no CVAR_ROM); src/sv_ccmds.c:1442-1445 (serverinfo set path) | flags = `CVAR_SERVERINFO` only (not CVAR_ROM) | MATCH -- normal settable serverinfo cvar (server.cfg / console / mod); not read-only |

**V-pass notes:** VERSION CONFIRMED: git describe == 1.11-53-g18d0362.

VERDICT: C-NEAR-MISS. The cvar's core meaning is correctly captured -- polarity (0=FFA / nonzero=team), default 0, demo labeling, team-VOICE routing, mod-enforces-the-rules, and mod-can-change-the-value all enforce-trace cleanly to located lines (incl. the whole-tree confirmation that the engine carries ZERO team-damage/friendly-fire logic, which makes clause 9 a strong MATCH). Two flavour-C imprecisions keep it from TRACED-CLEAN, both of the "real code is narrower/more conditional than implied" kind, not a flat misstatement of what teamplay is:

1. Clause 3 ("0: server treats team chat as a normal game") is PARTIALLY MISMATCHED. For VOICE the engine literally promotes team-voice to all in FFA (sv_user.c:2888 `vt == VT_TEAM && !teamplay.ival -> vt = VT_ALL`), which is "normal-game" behavior. But for TEXT, the engine's own say_team in FFA `continue`s every other recipient (sv_user.c:1905-1906, comment "non team game") so it reaches only the sayer -- that is NOT "treated as a normal game / broadcast to all". The clause reads as if FFA makes team-chat behave like normal chat for both channels; it only holds for voice.

2. The "mvdsv ... uses it to route team chat/voice" framing (clauses 3, 6, 8) OVERSTATES the engine's role for TEXT chat. SV_Say hands the message to the mod first via PR_ClientSay (sv_user.c:1832); a QC mod's ChatMessage export (mod_ChatMessage, resolved at sv_init.c:469) or a PR2 mod's GAME_CLIENT_SAY (pr2_exec.c:322) can return nonzero and the engine RETURNS at sv_user.c:1837 -- the engine's native teamplay-based text routing (1877-1909) never runs. KTX exports ChatMessage and owns say/say_team (team colors, loc macros), so the engine text-routing path is a FALLBACK, not the live path. VOICE (SV_VoiceReadPacket) is NOT mod-intercepted and is the genuine non-interceptable engine use of teamplay for routing.

Both VMs that a mod can run under (QC PF_cvar_set -> Cvar_Set; PR2 Cvar_SetByName -> Cvar_Set) write the same C cvar through Cvar_Set, which only stores + mirrors to serverinfo (cvar.c:122-161) -- no OnChange, no hidden behavior -- so clauses 8/10 ("only stores", "mod may change") are mechanically correct. Minor omissions (serverinfo mirror via CVAR_SERVERINFO; engine->NQ-progs copy pr_globals[37] at sv_init.c:585, NQ-only and irrelevant to KTX which is QW progs) are not errors, just incompleteness.

Suggested tightening for a re-synth: split the FFA team-chat claim by channel (voice -> promoted to all; text -> engine fallback sends say_team to sayer only, but text is normally handled by the mod), and attribute text-chat routing to the mod with voice as the engine's own use.

## flags_for_review

- [review/cross-mod-override/synthesis] F-MV1 cross-mod override: teamplay is a compatibility cvar the mvdsv engine mostly just stores. The competitive team ruleset (team-damage modes 1/2/3/4) is enforced by the game mod -- KTX keys team damage on it (combat.c:567/758/759) and actively OVERWRITES the cvar via trap_cvar_set_float (world.c:1612/1627/1652/1680) to match the game mode. The L1 prose documents only the engine-enforced binary FFA-vs-team meaning + routes the per-mode enum to L3; the full team-damage semantics belong in a KTX L3 concept note.
- [review/runtime-dead-suspect/vpass] Engine-native text say_team routing (sv_user.c:1877-1909) is dead/fallback under any mod that exports ChatMessage (QC) or handles GAME_CLIENT_SAY (PR2): SV_Say returns at sv_user.c:1837 when PR_ClientSay returns nonzero, before the engine routing runs. KTX exports ChatMessage, so the engine's teamplay-based text routing is not the live path -- voice routing (SV_VoiceReadPacket, sv_user.c:2888) is the genuine non-interceptable engine use of teamplay.
- [fyi/cross-mod-override/vpass] teamplay is read into NQ-progs globals at src/sv_init.c:585 (`pr_globals[37] = teamplay.value;`) but ONLY under `if (pr_nqprogs)`. This is an engine->mod data copy that exists for NetQuake progs only; KTX runs as QW/PR2 progs and reads teamplay via the cvar() builtin instead (PF_cvar -> Cvar_Value, pr_cmds.c:1168 / pr2_cmds.c:2652). Not a defect, but the description's 'only stores this value' glosses this NQ-only engine-to-mod export.
- [fyi/other/vpass] Demo teamplay-vs-duel labeling is player-count gated, not purely teamplay-gated: with exactly 2 players a teamplay match is recorded/named as 'duel'/'duel_' (sv_demo.c:1785-1791 i==2 branch; sv_demo_misc.c:277 numcl==2 branch) regardless of teamplay value, and the 'NonN_' teamplay demo name requires `teamplay.value >= 1 && i > 2` (sv_demo.c:1769). The description's flat 'nonzero -> recorded as teamplay' omits this 2-player edge.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "teamplay",
  "type": "cvar",
  "description": "Sets whether the game is a team game and which team-play ruleset is active.\n\n0 = no teams (free-for-all): team voice is delivered to everyone and the match is recorded as FFA.\nnonzero = a team game: team voice is routed only to teammates, and the match is recorded as teamplay.\n\nNote: mvdsv uses this value to route team voice and to label demos; team text chat and the actual team rules (such as team-damage behavior) are handled by the game mod (e.g. KTX), which may also change this value to match the game mode it is running.\n\nDefault: 0.\nSet by: server config.\nSee also: ktx-teamplay-modes (L3).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1905. F-MV1 compatibility cvar: mvdsv STORES teamplay and the LIVE team ruleset is governed by the mod. Engine-legible reads only: (1) sv_user.c:1905 `else if (!teamplay.value) continue; // non team game` -- gates say_team TEXT relay (a player's team message is not relayed when teamplay is 0); (2) sv_user.c:2888 `if (vt == VT_TEAM && !teamplay.ival) vt = VT_ALL;` -- when not teamplay, a VT_TEAM VOICE message is broadcast to all instead of the team; (3) sv_init.c:585 `pr_globals[37] = teamplay.value;` copies the value into the QC global -- but ONLY inside `if (pr_nqprogs)` (sv_init.c:581), i.e. handed to the (NQ) game mod, not enforced by the engine; (4) sv_demo_misc.c:275/287/302 writes `teamplay %d` into demo metadata and chooses FFA-vs-teamplay demo naming (`else if (!(int)teamplay.value) // ffa` :287, `else { // teamplay` :302). So engine enforcement is limited to BINARY 0 vs nonzero (FFA vs team) for chat routing + demo labeling -- the specific team-DAMAGE meaning of values 1/2/3/4 has NO engine enforcing site, so per B1 it is NOT asserted in the prose and is routed to L3. The real team rules live in the mod: KTX reads `cvar(\"teamplay\")` (world.c:1555) and keys actual team-damage on it (combat.c:567 'teamplay 4 we do no armor or health damage to teammates', combat.c:758 'teamplay == 1 don't damage self and mates', combat.c:759 'teamplay == 3 don't damage mates, do damage to self'), AND OVERWRITES it via trap_cvar_set_float (world.c:1612 sets 2 in coop, world.c:1627 resets unknown values to 0, world.c:1652/1680 forces 0 in matchless non-coop/CTF). Registered default '0' at sv_main.c:162 `cvar_t teamplay = {\"teamplay\",\"0\",CVAR_SERVERINFO}` (WI-2). CVAR_SERVERINFO = mirrored to serverinfo (cvar.h:62) -- context only, not action-changing for the admin, so omitted from prose per D20. Set-by: server config (Cvar_Register sv_main.c:3492). Cross-mod-override flagged.",
  "description_proposed": null
}
```
