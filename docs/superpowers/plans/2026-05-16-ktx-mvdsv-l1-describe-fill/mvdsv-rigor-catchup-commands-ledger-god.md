# describe-fill-synthesis ledger -- mvdsv `god`

- **project:** mvdsv
- **knob:** `god` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:god: synthesized -- dual-registered (ucmds[] overrideable + console); client-issuable when sv_cheats on, toggles FL_GODMODE at sv_ccmds.c:284, KTX no override -- origin=synthesized ref=src/sv_ccmds.c:284 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Toggles god mode (invulnerability) for the issuing player. Only works when the server is running with cheats enabled; otherwise it reports that cheats are not allowed. Each use flips the state and prints 'godmode ON' or 'godmode OFF'.
>
> Default: no arguments (toggles the caller).
> Set by: server console / rcon, or by a player at their own console when cheats are enabled. Cheats are enabled via sv_cheats, a devmap, or the -cheats command-line flag.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| client-issuable (in ucmds[], overrideable) | src/sv_user.c:3358 | `{"god", SV_God_f, true},` (under `// cheat commands`) | MATCH |
| client path: QC progs first, then SV_God_f | src/sv_user.c:3406-3422 | `if (!u->overrideable){u->func(); goto out;} break; ... if (SV_ExecutePRCommand()) goto out; if (u->name) u->func();` | MATCH |
| also registered as console command | src/sv_ccmds.c:1881 | `Cmd_AddCommand ("god", SV_God_f);` | MATCH |
| requires cheats enabled, else refuses | src/sv_ccmds.c:274 | `if (!sv_allow_cheats){Con_Printf("Cheats are not allowed on this server\n"); return;}` | MATCH |
| toggles invulnerability (FL_GODMODE) | src/sv_ccmds.c:284 | `sv_player->v->flags = (int)sv_player->v->flags ^ FL_GODMODE;` | MATCH |
| prints ON/OFF on resulting state | src/sv_ccmds.c:285-287 | `if (!((int)sv_player->v->flags & FL_GODMODE)) SV_ClientPrintf(..."godmode OFF\n"); else ..."godmode ON\n";` | MATCH |
| cheats gate driven by sv_cheats / devmap | src/sv_init.c:348-349 | `if ((sv_cheats.value || devmap) && !sv_allow_cheats){ sv_allow_cheats = true; }` | MATCH |
| not on normal-rcon blocklist | src/sv_main.c:1754-1764 | blocklist token list; god absent | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1a | "Toggles god mode ... for the issuing player" | src/sv_ccmds.c:283 (toggle) + src/sv_ccmds.c:244-247 (self-target HACK) + src/sv_user.c:3406 (RD_CLIENT wrap) | `sv_player->v->flags = (int)sv_player->v->flags ^ FL_GODMODE;` / `if (sv_client && sv_redirected == RD_CLIENT) { idnum = sv_client->userid; }` | MATCH |
| 1b | "(invulnerability)" parenthetical gloss | NO in-tree enforcing line. FL_GODMODE consumed in engine ONLY at sv_ccmds.c:283-287 (toggle + ON/OFF readback). Engine comment src/sv_ccmds.c:269 "Sets client to godmode". Invuln effect enforced by QC progs/KTX damage handler, outside this codebase. | server.h:677 `#define FL_GODMODE 64`; no `T_Damage`/`takedamage` engine check on FL_GODMODE | MATCH (engine's own term "godmode"; "invulnerability" is the universal Quake FL_GODMODE meaning, enforced QC-side -- see flag) |
| 2 | "Only works when cheats enabled; else reports cheats not allowed" | src/sv_ccmds.c:274-278 | `if (!sv_allow_cheats) { Con_Printf ("Cheats are not allowed on this server\n"); return; }` | MATCH |
| 3 | "Each use flips the state and prints 'godmode ON' or 'godmode OFF'" | src/sv_ccmds.c:283-287 | `flags = (int)flags ^ FL_GODMODE;` then `if (!(flags & FL_GODMODE)) ...PRINT_HIGH, "godmode OFF\n"; else ..."godmode ON\n";` | MATCH (XOR = flip; both strings verbatim) |
| 4 | "Default: no arguments (toggles the caller)" | src/sv_ccmds.c:244-247 (SV_SetPlayer self-target) | `// HACK: for cheat commands which comes from client rather than from server console` / `idnum = sv_client->userid;` | MATCH for player/rcon path; console path takes userid arg (see flag) |
| 5 | "Set by: server console / rcon, or by a player at their own console" | src/sv_ccmds.c:1881 (console, #ifdef SERVERONLY) + src/sv_user.c:3358 (client/ucmd table) | `Cmd_AddCommand ("god", SV_God_f);` / `{"god", SV_God_f, true},` | MATCH (SERVERONLY confirmed defined: CMakeLists.txt:169) |
| 6 | "Cheats are enabled via sv_cheats (or a devmap)" | src/sv_init.c:348-349 | `if ((sv_cheats.value \|\| devmap) && !sv_allow_cheats) { sv_allow_cheats = true;` | MATCH but INCOMPLETE -- omits `-cheats` cmdline (sv_ccmds.c:1821-1823); see flag |

**V-pass notes:** Oracle confirmed: git describe == "1.11-53-g18d0362". Enforcing function SV_God_f lives in src/sv_ccmds.c:272-288 (a DIFFERENT file from the client-path registration in sv_user.c). Both registration paths are live: console/rcon via Cmd_AddCommand at sv_ccmds.c:1881 (inside #ifdef SERVERONLY, and SERVERONLY IS defined for this build per CMakeLists.txt:169), and the client ucmd_t table {"god", SV_God_f, true} at sv_user.c:3358.

Every material ENGINE-BEHAVIOR clause traces to a verified enforcing line with matching adjacent comments:
- Cheat gate (clause 2): sv_ccmds.c:274-278, exact "Cheats are not allowed on this server" string.
- Toggle + ON/OFF print (clauses 1a, 3): sv_ccmds.c:283-287; XOR is a genuine flip, both "godmode ON\n"/"godmode OFF\n" strings verbatim.
- Self-target for the player/rcon path (clause 4 "toggles the caller"): SV_SetPlayer sv_ccmds.c:235-262; the documented HACK at lines 244-247 forces idnum = sv_client->userid whenever sv_client && sv_redirected == RD_CLIENT, and the dispatcher wraps client commands in SV_BeginRedirect(RD_CLIENT) at sv_user.c:3406. So a player-issued (or rcon-redirected) "god" always self-targets regardless of arguments -- clause 4 is enforcement-backed for that path.
- Cheat-enable mechanisms (clause 6): sv_init.c:348-349 gates on (sv_cheats.value || devmap). sv_cheats registered as cvar_t sv_cheats = {"sv_cheats", "0"} at sv_ccmds.c:25 (default 0). devmap is the devmap console command (SV_Map_f with the devmap flag, sv_ccmds.c:458).

Two clauses sit at the edge of trace discipline and are classified MATCH only after explicit analysis (both raised as review flags, not silently absorbed -- PROC-1):

1. "(invulnerability)" (clause 1b): FL_GODMODE (= 64, server.h:677) is consumed inside the MVDSV engine ONLY at the toggle/readback sites in SV_God_f. There is NO engine-side damage/invulnerability check on FL_GODMODE anywhere (grep of sv_phys.c, world.c, pr_cmds.c shows FL_GODMODE in zero damage paths; takedamage at progdefs.h:121 is a QC-controlled field; IT_INVULNERABILITY at sv_ents.c:437 is the unrelated Pentagram powerup item-flag, not FL_GODMODE). The invulnerability EFFECT is enforced by the server-side QC progs (KTX / standard QW progs) which read FL_GODMODE in their T_Damage handler -- that code is outside this oracle's tree. I classified this MATCH (not C-NEAR-MISS) because: (a) "god mode" is the engine's OWN term -- comment at sv_ccmds.c:269 literally reads "Sets client to godmode"; (b) "(invulnerability)" is a parenthetical gloss defining that well-known term, not an over-specific claim about a particular engine branch; (c) it is universally true for FL_GODMODE across all Quake QC and is contradicted by nothing. The core behavior the description asserts (toggle the godmode flag) is fully enforcement-traced; only the downstream meaning is QC-side. Flagged so a reviewer can decide whether to hedge the parenthetical given the enforcing site is out-of-tree.

2. "Default: no arguments (toggles the caller)" (clause 4): strictly accurate for the player/rcon-redirected path (the HACK guarantees self-target). For the RAW server console (no RD_CLIENT redirect), SV_SetPlayer instead does idnum = Q_atoi(Cmd_Argv(1)), so the operator targets a player BY USERID, and a bare "god" with no arg resolves to userid 0. The console has no player body, so "the caller" framing applies to the player path the description is centered on; the console-targets-by-userid capability is a secondary feature the text neither surfaces nor contradicts (it does list "server console / rcon" as an issuer). Not a contradiction; flagged as FYI.

No clause CONTRADICTS its enforcing line (no C-FIX). No metadata clause is WRONG (no WI2-FIX): the sv_cheats default-0 and the named enable mechanisms are correct -- the only metadata gap is an OMISSION (the -cheats cmdline enabler), which is incomplete-but-true, below the WI2-FIX bar.

## flags_for_review

- [fyi/off-scope-entity/vpass] Clause 1b '(invulnerability)': FL_GODMODE (=64, src/server.h:677) is consumed inside the MVDSV engine ONLY at the toggle + ON/OFF readback in SV_God_f (src/sv_ccmds.c:283-287). There is NO engine-side T_Damage/takedamage/invulnerability check gated on FL_GODMODE anywhere (verified: zero hits in sv_phys.c, world.c, pr_cmds.c damage paths). The invulnerability EFFECT is enforced by the server-side QC progs (KTX/standard QW progs) which read FL_GODMODE -- code OUTSIDE this oracle's tree. The parenthetical is true (universal Quake semantic) and matches the engine's own comment 'Sets client to godmode' (src/sv_ccmds.c:269), so classified MATCH, but the enforcing read-site for the invulnerability effect is genuinely out-of-tree. Reviewer may wish to confirm the parenthetical is acceptable given the effect is QC-mediated, not engine-enforced.
- [review/other/vpass] Clause 6 omits a third cheat-enable mechanism. Description says cheats are enabled 'via sv_cheats (or a devmap)'. Source shows THREE enablers: (1) sv_cheats cvar + (2) devmap -> both at src/sv_init.c:348-349; AND (3) the '-cheats' command-line parameter, which sets sv_allow_cheats = true and forces sv_cheats=1 at startup (src/sv_ccmds.c:1821-1825, macro SV_CommandLineEnableCheats() = COM_CheckParm("-cheats") at src/server.h:1106). Everything the description states is true; the '-cheats' launch flag is simply not mentioned. Incomplete-but-correct -- below the WI2-FIX bar (no wrong clause) but worth completing if the metadata aims to enumerate enable paths.
- [fyi/other/vpass] Clause 4 nuance: 'no arguments (toggles the caller)' is exact for the player/rcon path (SV_SetPlayer HACK at src/sv_ccmds.c:244-247 forces idnum=self when sv_redirected==RD_CLIENT). For the raw server console (no RD_CLIENT redirect, SERVERONLY path registered at src/sv_ccmds.c:1881), SV_SetPlayer does idnum = Q_atoi(Cmd_Argv(1)) -- i.e. the console operator can target ANY player by userid ('god <userid>'), and a bare 'god' resolves to userid 0. The description's player-centric framing is accurate and lists 'server console / rcon' as an issuer, so this is not a contradiction; noting the console userid-targeting capability as FYI in case the metadata should mention it.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "god",
  "type": "command",
  "description": "Toggles god mode (invulnerability) for the issuing player. Only works when the server is running with cheats enabled; otherwise it reports that cheats are not allowed. Each use flips the state and prints 'godmode ON' or 'godmode OFF'.\n\nDefault: no arguments (toggles the caller).\nSet by: server console / rcon, or by a player at their own console when cheats are enabled. Cheats are enabled via sv_cheats, a devmap, or the -cheats command-line flag.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:284. DUAL registration: Cmd_AddCommand(\"god\", SV_God_f) at sv_ccmds.c:1881 AND ucmds[] entry {\"god\", SV_God_f, true} at sv_user.c:3358 (the 'cheat commands' block). The third ucmds field is 'overrideable' (sv_user.c:3408 reads u->overrideable): in SV_ExecuteUserCommand a client stringcmd matching an overrideable entry breaks the loop and FIRST offers the command to QC progs via SV_ExecutePRCommand (sv_user.c:3419), running u->func() (SV_God_f) only if QC declines (sv_user.c:3421-3422). KTX has no 'god' override (F-MV1 grep clean in ktx/src), so on a live KTX server a client 'god' falls through to SV_God_f -- hence client-issuable, NOT admin-only. ENFORCING gate: SV_God_f (sv_ccmds.c:272-287) returns early with 'Cheats are not allowed on this server' if !sv_allow_cheats (sv_ccmds.c:274); SV_SetPlayer() resolves the target (sv_ccmds.c:278); it XORs FL_GODMODE on the player flags (sv_ccmds.c:284) and prints 'godmode OFF'/'godmode ON' based on the resulting bit (sv_ccmds.c:285-287) -- this is the toggle + invulnerability assertion. sv_allow_cheats is driven by sv_cheats: sv_init.c:348-349 sets it true when (sv_cheats.value || devmap), false otherwise (sv_init.c:352-353); also set true by the 'cheats' path at sv_ccmds.c:1823. Not on the normal-rcon blocklist (sv_main.c:1754-1764), so the console/rcon side = server console / rcon. WI-2 access-class verified against the ucmds[] table + dispatch code, not the name.",
  "description_proposed": null
}
```
