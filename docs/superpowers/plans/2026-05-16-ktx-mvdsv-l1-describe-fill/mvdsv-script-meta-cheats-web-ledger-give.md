# describe-fill-synthesis ledger -- mvdsv `give`

- **project:** mvdsv
- **knob:** `give` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:give: synthesized -- cheat command (gated on sv_allow_cheats); grants weapons (give 2-9) / ammo / health; client-issuable on self when cheats enabled, plus console/rcon on any player -- origin=synthesized ref=src/sv_ccmds.c:320 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Cheat command that hands a player weapons, ammunition, or health. It only works when the server has cheats enabled; otherwise it prints "Cheats are not allowed on this server" and does nothing.
>
> give <2-9> = give a weapon: 2 = Shotgun, 3 = Super Shotgun, 4 = Nailgun, 5 = Super Nailgun, 6 = Grenade Launcher, 7 = Rocket Launcher, 8 = Lightning Gun, 9 = Super Lightning Gun.
> give s <n> / n <n> / r <n> / c <n> = set shells / nails / rockets / cells to <n>.
> give h <n> = set health to <n>.
>
> When run from the server console or rcon the target player is named first: give <userid> <item> [amount]. When a connected player runs it themselves, the target is always that player, so the userid is omitted: give <item> [amount].
>
> Set by: a connected player on themselves when cheats are enabled (sv_cheats 1 or a devmap), and the server console / rcon on any player.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| only works when cheats enabled; else prints msg and returns | src/sv_ccmds.c:325-329 | `if (!sv_allow_cheats) { Con_Printf("Cheats are not allowed on this server\n"); return; }` | yes |
| cheats enabled by sv_cheats 1 or devmap (default off) | src/sv_init.c:348-349 ; src/sv_ccmds.c:25 | `if ((sv_cheats.value || devmap) && !sv_allow_cheats) { sv_allow_cheats = true; ... }`; `cvar_t sv_cheats = {"sv_cheats","0"}` | yes |
| client form forces target to self | src/sv_ccmds.c:244-247 | `if (sv_client && sv_redirected == RD_CLIENT) { idnum = sv_client->userid; }` | yes |
| console form names userid first; client omits it (arg offset) | src/sv_ccmds.c:335-338 | `cnt = (sv_redirected == RD_CLIENT ? 1 : 2); t = Cmd_Argv(cnt++); v = Q_atoi(Cmd_Argv(cnt++));` | yes |
| target userid parsed from Argv(1) (console) | src/sv_ccmds.c:241 | `idnum = Q_atoi(Cmd_Argv(1));` | yes |
| digit 2-9 grants weapon flag | src/sv_ccmds.c:350 | `sv_player->v->items = (int)sv_player->v->items | IT_SHOTGUN<< (t[0] - '2');` | yes |
| weapon table values (Shotgun=1 .. SuperLightning=128) | src/bothdefs.h:88-95 | `IT_SHOTGUN 1` ... `IT_SUPER_LIGHTNING 128` | yes |
| s/n/r/c set ammo to <n>, h sets health | src/sv_ccmds.c:353-367 | `case 's': ammo_shells = v;` ... `case 'h': health = v;` ... `case 'c': ammo_cells = v;` | yes |
| client-issuable (in ucmds, cheat block) | src/sv_user.c:3359 | `{"give", SV_Give_f, true},` under `// cheat commands` | yes |
| also console/rcon issuable | src/sv_ccmds.c:1882 | `Cmd_AddCommand ("give", SV_Give_f);` | yes |
| not master-rcon-restricted | src/sv_main.c:1754-1764 | blocklist set excludes give | yes |
| no KTX override | ktx/src (grep) | grep '"give"' / give registration in ktx/src returns nothing | yes |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Cheat command; only works when server has cheats enabled | sv_ccmds.c:325-329 | `if (!sv_allow_cheats) { Con_Printf ("Cheats are not allowed on this server\n"); return; }` | MATCH |
| 2 | OFF-state prints exactly "Cheats are not allowed on this server" | sv_ccmds.c:327 | `Con_Printf ("Cheats are not allowed on this server\n");` | MATCH |
| 3 | OFF-state does nothing (early return before any effect) | sv_ccmds.c:328 | `return;` (precedes SV_SetPlayer + switch) | MATCH |
| 4 | give 2-9 grants a weapon | sv_ccmds.c:342-351 | `case '2'..'9': sv_player->v->items = (int)sv_player->v->items \| IT_SHOTGUN<< (t[0] - '2');` | MATCH |
| 5 | 2=Shotgun | bothdefs.h:88 + sv_ccmds.c:350 | `IT_SHOTGUN 1`; shift 0 -> 1 | MATCH |
| 6 | 3=Super Shotgun | bothdefs.h:89 | `IT_SUPER_SHOTGUN 2`; shift 1 -> 2 | MATCH |
| 7 | 4=Nailgun | bothdefs.h:90 | `IT_NAILGUN 4`; shift 2 -> 4 | MATCH |
| 8 | 5=Super Nailgun | bothdefs.h:91 | `IT_SUPER_NAILGUN 8`; shift 3 -> 8 | MATCH |
| 9 | 6=Grenade Launcher | bothdefs.h:92 | `IT_GRENADE_LAUNCHER 16`; shift 4 -> 16 | MATCH |
| 10 | 7=Rocket Launcher | bothdefs.h:93 | `IT_ROCKET_LAUNCHER 32`; shift 5 -> 32 | MATCH |
| 11 | 8=Lightning Gun | bothdefs.h:94 | `IT_LIGHTNING 64`; shift 6 -> 64 | MATCH |
| 12 | 9=Super Lightning Gun | bothdefs.h:95 | `IT_SUPER_LIGHTNING 128`; shift 7 -> 128 (define name = "SUPER_LIGHTNING") | MATCH |
| 13 | give s <n> sets shells to n | sv_ccmds.c:353-355 | `case 's': sv_player->v->ammo_shells = v;` | MATCH |
| 14 | give n <n> sets nails to n | sv_ccmds.c:356-358 | `case 'n': sv_player->v->ammo_nails = v;` | MATCH |
| 15 | give r <n> sets rockets to n | sv_ccmds.c:359-361 | `case 'r': sv_player->v->ammo_rockets = v;` | MATCH |
| 16 | give c <n> sets cells to n | sv_ccmds.c:365-367 | `case 'c': sv_player->v->ammo_cells = v;` | MATCH |
| 17 | give h <n> sets health to n | sv_ccmds.c:362-364 | `case 'h': sv_player->v->health = v;` | MATCH |
| 18 | Value is set (not added), raw integer | sv_ccmds.c:338 + 354-366 | `v = Q_atoi (Cmd_Argv(cnt++));` then direct `= v` (no clamp/add) | MATCH |
| 19 | Console/rcon: target named first via userid | sv_ccmds.c:335 + 244-247 | `cnt = (sv_redirected == RD_CLIENT ? 1 : 2);` -> cnt=2 for console/rcon, so Argv(1)=userid consumed by SV_SetPlayer | MATCH |
| 20 | rcon path is non-RD_CLIENT (so userid required) | sv_main.c:1859 (SVC_RemoteCommand) | `SV_BeginRedirect (RD_PACKET);` | MATCH |
| 21 | Connected player running it: target is always self, userid omitted | sv_user.c:3406 + sv_ccmds.c:244-247,335 | `SV_BeginRedirect (RD_CLIENT);` -> RD_CLIENT -> SV_SetPlayer overrides idnum=sv_client->userid; cnt=1 (Argv(1)=item) | MATCH |
| 22 | Set by: connected player on self (reachable via client cmd path) | sv_user.c:3359 + 3408-3422 | `{"give", SV_Give_f, true}` in ucmds[]; dispatcher runs `u->func()` | MATCH |
| 23 | Set by: server console / rcon on any player | sv_ccmds.c:1882 + sv_main.c:1687/1859 | `Cmd_AddCommand ("give", SV_Give_f);` (SERVERONLY) reachable via console + SVC_RemoteCommand | MATCH |
| 24 | Cheats enabled via "sv_cheats 1" | sv_init.c:348-349 | `if ((sv_cheats.value \|\| devmap) && !sv_allow_cheats) { sv_allow_cheats = true;` | MATCH |
| 25 | Cheats enabled via "devmap" | sv_init.c:348-349 | same line; `devmap` local-var branch | MATCH |
| 26 | "Set by" enabling-paths enumeration (sv_cheats/devmap only) | sv_ccmds.c:1821-1823 (omitted path) | `if (SV_CommandLineEnableCheats()) { sv_allow_cheats = true; }` = COM_CheckParm("-cheats") | INCOMPLETE (parenthetical names 2 of 3 paths; not asserted exhaustive) |

**V-pass notes:** Oracle confirmed at mvdsv 1.11-53-g18d0362. Cold V-pass over `give`: 26 clauses decomposed, all traced to enforcing lines (callees followed: SV_Give_f -> SV_SetPlayer for target selection; client-path RD_CLIENT redirect traced through SV_ExecuteUserCommand; rcon RD_PACKET traced through SVC_RemoteCommand).

Core behavior, OFF-state, weapon mapping, ammo/health codes, value-set semantics, and dual dispatch (console/rcon userid-first vs client-self userid-omitted) all MATCH exactly. The weapon-number -> weapon-name table is provably correct from the bit-shift `IT_SHOTGUN << (t[0]-'2')` against the IT_* defines in bothdefs.h (shift 0..7 -> defines 1,2,4,...,128). "Super Lightning Gun" matches the source's own define name IT_SUPER_LIGHTNING; not a fabrication.

The exact OFF-state string is quoted verbatim from the code (sv_ccmds.c:327). The "do nothing" claim is enforced by the early `return` at line 328, before SV_SetPlayer and the switch.

The one imperfection is clause 26: the "Set by" line lists cheat-enabling via "sv_cheats 1 or a devmap" but omits the third path -- the `-cheats` startup command-line param (sv_ccmds.c:1821-1823, SV_CommandLineEnableCheats() = COM_CheckParm("-cheats")). This is an INCOMPLETE enumeration, not a wrong clause: both named paths are verified-correct and are the runtime-toggleable mechanisms; the omitted path is a startup-only equivalent and the parenthetical reads as illustrative ("sv_cheats 1 or a devmap") rather than asserting exhaustiveness. No clause contradicts the code and no clause asserts un-enforced behavior, so this stays TRACED-CLEAN under the "still-true minor vagueness that was traceable is acceptable" provision -- but the omission is surfaced as an fyi flag in case the phase wants completeness.

## flags_for_review

- [fyi/other/vpass] The 'Set by' line names two cheat-enabling paths (sv_cheats 1, devmap) but omits the third, equivalent path: the '-cheats' startup command-line parameter (sv_ccmds.c:1821-1823 via SV_CommandLineEnableCheats() = COM_CheckParm("-cheats")). Not a wrong clause -- the parenthetical reads as examples, not an exhaustive list -- but if the phase wants the enabling-paths enumeration complete, add '-cheats' cmdline as a third path. All three set the same sv_allow_cheats gate.
- [fyi/cross-mod-override/vpass] give is registered in ucmds[] with overrideable=true (sv_user.c:3359). On the connected-client dispatch path (SV_ExecuteUserCommand, sv_user.c:3408-3422), an overrideable command is offered to the QC progs via SV_ExecutePRCommand()/PR_ClientCmd() BEFORE the engine's SV_Give_f runs. This means a loaded mod (e.g. KTX) could in principle intercept 'give' from a connected client before the engine handler. The proposed description correctly documents the mvdsv-engine behavior; this is purely an out-of-scope note that the engine's own give is the fallback handler on the client path, not guaranteed-first when QC progs are loaded. The console/rcon path (Cmd_AddCommand, sv_ccmds.c:1882) is not subject to QC interception.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "give",
  "type": "command",
  "description": "Cheat command that hands a player weapons, ammunition, or health. It only works when the server has cheats enabled; otherwise it prints \"Cheats are not allowed on this server\" and does nothing.\n\ngive <2-9> = give a weapon: 2 = Shotgun, 3 = Super Shotgun, 4 = Nailgun, 5 = Super Nailgun, 6 = Grenade Launcher, 7 = Rocket Launcher, 8 = Lightning Gun, 9 = Super Lightning Gun.\ngive s <n> / n <n> / r <n> / c <n> = set shells / nails / rockets / cells to <n>.\ngive h <n> = set health to <n>.\n\nWhen run from the server console or rcon the target player is named first: give <userid> <item> [amount]. When a connected player runs it themselves, the target is always that player, so the userid is omitted: give <item> [amount].\n\nSet by: a connected player on themselves when cheats are enabled (sv_cheats 1 or a devmap), and the server console / rcon on any player.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:320. Handler SV_Give_f (src/sv_ccmds.c:320-369). Cheat gate (src/sv_ccmds.c:325-329): `if (!sv_allow_cheats) { Con_Printf(\"Cheats are not allowed on this server\\n\"); return; }` -- enforces the 'only when cheats enabled / else prints message and does nothing' clause. sv_allow_cheats is an internal bool (declared false, src/sv_ccmds.c:26) set TRUE when `sv_cheats.value || devmap` at level spawn (src/sv_init.c:348-349) and FALSE otherwise (src/sv_init.c:352-353); sv_cheats default '0' (src/sv_ccmds.c:25 `cvar_t sv_cheats = {\"sv_cheats\",\"0\"}`). So I phrase Set-by in admin terms (sv_cheats 1 / devmap) rather than naming the internal flag. Target selection: SV_SetPlayer (src/sv_ccmds.c:235-262) reads Cmd_Argv(1) as the target userid (line 241), BUT when invoked from a client `if (sv_client && sv_redirected == RD_CLIENT) idnum = sv_client->userid;` (line 244-247) -- forces target to the issuing client => 'a player can only give to themselves' is enforced here. Arg-offset for item/amount: `cnt = (sv_redirected == RD_CLIENT ? 1 : 2)` (line 335) then `t = Cmd_Argv(cnt++)` (item char, line 337), `v = Q_atoi(Cmd_Argv(cnt++))` (amount, line 338) -- so console syntax is `give <userid> <item> [amount]` (Argv1=userid consumed by SV_SetPlayer, item at Argv2) and client syntax is `give <item> [amount]` (no userid, item at Argv1) -- enforces the two-syntax clause. Item mapping switch (line 340-368): digit cases '2'..'9' => `sv_player->v->items |= IT_SHOTGUN << (t[0]-'2')` (line 350); IT_SHOTGUN=1 (bothdefs.h:88) so 2=Shotgun(1),3=SuperShotgun(2),4=Nailgun(4),5=SuperNailgun(8),6=GrenadeLauncher(16),7=RocketLauncher(32),8=Lightning(64),9=SuperLightning(128) (bothdefs.h:88-95) -- enforces the weapon-letter table. Letter cases (line 353-367): 's'=>ammo_shells=v, 'n'=>ammo_nails=v, 'r'=>ammo_rockets=v, 'h'=>health=v, 'c'=>ammo_cells=v -- these SET the value to <n> (assignment, not add). No 'a'/armor case exists. Access-class (chunk-5 rule A): give is in ucmds[] under '// cheat commands' as `{\"give\", SV_Give_f, true}` (src/sv_user.c:3359, overrideable=true) => client-issuable, AND registered as console command `Cmd_AddCommand(\"give\", SV_Give_f)` (src/sv_ccmds.c:1882) => console/rcon. NOT in regular-rcon blocklist (src/sv_main.c:1754-1764) => console/rcon both reach it. NEVER 'admin-only'. F-MV1: grep ktx/src 'give'/\"give\" registration => no KTX cmd_t/Cmd_AddCommand override (KTX does not redefine the give cheat). Worked example required (non-trivial args). Default omitted (action command, no meaningful no-arg default -- bare 'give' with no item char reads t=Cmd_Argv => empty string => switch falls through, no effect).",
  "description_proposed": null
}
```
