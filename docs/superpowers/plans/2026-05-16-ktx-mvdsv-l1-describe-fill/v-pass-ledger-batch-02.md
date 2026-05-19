# KTX D7 V-pass -- Stage-1 ledger -- BATCH 02 (bucket 1, 82 rows)

B3 read-only per-clause enforcement re-trace. `decisions.md` D7 Amendment
2026-05-19 (B1-B5). Oracle `/tmp/ktx-src-67253dc9` == `1.47-2-g67253dc`
(commit `67253dc9ab4f643f1e6523a923a41caab9ea587f`), HARD-GATE verified.
F-V1 strided partition: `md5(canonical_id) % 9 == 1`, 82 rows (the largest
bucket; 9 buckets 63/82/65/59/55/51/72/61/63, sum 571, no gaps).

READ-ONLY. No DB write, no description edit (C4). Canary rows are F-V2
controls -- injected per wave, gated, then EXCLUDED from this ledger and
from the N / flavour-C tally. Each `RESULT |` line is the machine spine;
each `###` block is the durable per-clause detail.

---

## Wave 01 -- 5 batch rows (canary ktx:command:autotrack EXCLUDED -- F-V2 control, fired-then-confirmed C-FIX)

RESULT | ktx:command:3on3on3 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=14 | Every preset value, exec-path, styled announce, and player/spc-admin access-class maps to an enforcing line in _3on3on3_um_init + UserMode() + the cmds[] CF dispatch.
RESULT | ktx:command:4on4 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=11 | Every preset value matches _4on4_um_init; common_um_init verified executed before the per-mode initstring at UserMode():4796 vs :4799.
RESULT | ktx:command:cam | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | ShowCamHelp() is a single G_sprint of the exact three help lines; no state mutation; CF_SPECTATOR-gated.
RESULT | ktx:command:discharge | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | ToggleDischarge() match-guards then cvar_toggle_msg flips k_dis (!cvar) + bprints; W_FireLightning enforces underwater self-radius-damage gated on k_dis.
RESULT | ktx:command:dropitem | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | cheat-gate + match-guard + no-arg usage + full dropitems[] name table + spawn-at-self origin + dropitem flag consumed by dumpent() all verified.

### ktx:command:3on3on3
- "Switches server into built-in 3-team 3-per-team preset" -> src/commands.c:820 `{ "3on3on3", DEF(UserMode), 12, CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS, CD_3ON3ON3 }` + :4548 `{ "3on3on3", "\225 on \225 on \225", _3on3on3_um_init, UM_3ON3ON3, 0 }` -> MATCH (arg 12 -> umode idx 11 -> um_list[11] = 3on3on3)
- "coop 0" -> src/commands.c:4320 `"coop 0\n"` -> MATCH
- "maxclients and k_maxclients 9" -> src/commands.c:4321-4322 `"maxclients 9\n" "k_maxclients 9\n"` -> MATCH
- "timelimit 15 (15-minute rounds)" -> src/commands.c:4323 `"timelimit 15\n"				// 15 minute rounds` -> MATCH
- "teamplay 2 (teammate and self damage on)" -> src/commands.c:4324 `"teamplay 2\n"					// hurt teammates and yourself` -> MATCH
- "deathmatch 1 (weapons do not remain after pickup)" -> src/commands.c:4325 `"deathmatch 1\n"				// weapons wont stay on pickup` -> MATCH
- "k_pow 1 (powerups enabled)" -> src/commands.c:4326 `"k_pow 1\n"						// use powerups` -> MATCH
- "k_membercount 2 (minimum 2 players per team)" -> src/commands.c:4327 `"k_membercount 2\n"				// minimum number of players in each team` -> MATCH
- "k_lockmin 1 and k_lockmax 3 (1 to 3 teams)" -> src/commands.c:4328-4329 `"k_lockmin 1\n" "k_lockmax 3\n"` -> MATCH
- "k_overtime 1 with k_exttime 5 (5-minute time-based overtime)" -> src/commands.c:4330-4331 `"k_overtime 1\n"				// time based` `"k_exttime 5\n"					// overtime 5mins` -> MATCH
- "k_mode 2" -> src/commands.c:4332 `"k_mode 2\n"` -> MATCH
- "execs any matching configs/usermodes/3on3on3/ override .cfg files" -> src/commands.c:4809 `cfg_name = va("configs/usermodes/%s/default.cfg", um);` + :4830 `cfg_name = va("configs/usermodes/%s/%s.cfg", um, mapname);` (um="3on3on3"), guarded by can_exec at :4817/:4831 -> MATCH
- "announces a styled '3 on 3 on 3 settings enabled' message to players" -> src/commands.c:4791 `G_bprint(2, "%s %s %s\n", redtext(va("%s", um_list[(int)umode].displayname)), redtext("settings enabled by"), self->netname);` with displayname="\225 on \225 on \225" (:4548; \225 = styled '3') -> MATCH (player path appends "by <netname>"; quoted styled core is accurate)
- "Restricted to players and spectator-admins; optional matchtag param" -> src/commands.c:1106 `if (!(cmds[icmd].cf_flags & CF_PLAYER))` (player ok, no CF_PLR_ADMIN) + :1096 `if ((cmds[icmd].cf_flags & CF_SPC_ADMIN) && !is_adm(self))` (spec needs admin) + :4670 `trap_CmdArgs(matchtag, sizeof(matchtag));` -> :4844 `UserMode_SetMatchTag(matchtag);` (CF_PARAMS) -> MATCH
WI-2: n/a (no default-value clause; access-class verified against CF flag AND DoCommand handler dispatch -> correct)

### ktx:command:4on4
- "4on4 preset / standard 4v4 team match" -> src/commands.c:812 `{ "4on4", DEF(UserMode), 4, CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS, CD_4ON4 }` + :4540 `{ "4on4", "\226 on \226", _4on4_um_init, UM_4ON4, 4 }` -> MATCH (arg 4 -> umode idx 3 -> um_list[3] = 4on4)
- "Caps the server at 8 players (maxclients/k_maxclients 8)" -> src/commands.c:4357-4358 `"maxclients 8\n" "k_maxclients 8\n"` -> MATCH
- "teamplay 2 (teammates and self can be damaged)" -> src/commands.c:4360 `"teamplay 2\n"					// hurt teammates and yourself` -> MATCH
- "deathmatch 1 (base mode -- weapons do not stay on pickup)" -> src/commands.c:4361 `"deathmatch 1\n"				// weapons wont stay on pickup` -> MATCH
- "enables powerups" -> src/commands.c:4362 `"k_pow 1\n"						// use powerups` -> MATCH
- "requires 3 players minimum per team" -> src/commands.c:4363 `"k_membercount 3\n"				// minimum number of players in each team` -> MATCH
- "1-2 teams" -> src/commands.c:4364-4365 `"k_lockmin 1\n" "k_lockmax 2\n"` -> MATCH
- "20-minute timelimit" -> src/commands.c:4359 `"timelimit 20\n"				// 20 minute rounds` -> MATCH
- "time-based overtime (5 min)" -> src/commands.c:4366-4367 `"k_overtime 1\n"				// time based` `"k_exttime 5\n"					// overtime 5mins` -> MATCH
- "internal game mode k_mode 2" -> src/commands.c:4368 `"k_mode 2\n"` -> MATCH
- "Before this preset runs, common_um_init restores the standard ruleset cvars to defaults" -> src/commands.c:4796 `trap_readcmd(common_um_init, buf, sizeof(buf));` executed BEFORE :4799 `trap_readcmd(um_list[(int)umode].initstring, buf, sizeof(buf));` (per-mode preset); common_um_init body :4161-4214 = standard ruleset defaults -> MATCH
WI-2: n/a (no metadata clause asserted; no access-class claim in description)

### ktx:command:cam
- "Prints camera-control help to the invoking spectator" -> src/spectate.c:68-73 `void ShowCamHelp(void) { G_sprint(self, 2, ...); }` + src/commands.c:840 `{ "cam", ShowCamHelp, 0, CF_SPECTATOR | CF_MATCHLESS, CD_CAM }` (CF_SPECTATOR, dispatch :1106) -> MATCH
- "jump between spawn points (impulse 1)" -> src/spectate.c:70/73 `"use %s %s to jump between spawn points\n", ... redtext("impulse"), dig3(1)` -> MATCH
- "[attack] changes the spectator camera mode" -> src/spectate.c:71 `"use [attack] to change cam mode\n"` -> MATCH
- "[jump] changes the tracked target" -> src/spectate.c:72 `"use [jump] to change target\n"` -> MATCH
- "Produces console text only; changes no game state" -> src/spectate.c:68-74 body is a single G_sprint, no assignment/cvar_set/spawn -> MATCH
WI-2: n/a

### ktx:command:discharge
- "Toggles whether underwater weapon discharges are enabled" -> src/weapons.c:1203-1208 `if (!cvar("k_dis")) { return; } T_RadiusDamage(self, self, 35 * cells, world, dtLG_DIS);` (k_dis off -> no discharge damage; on -> self radius damage) + dup :1220-1225 -> MATCH
- "the chain-reaction self-damage when a discharge weapon is fired in water" -> src/weapons.c:1157 `W_FireLightning(void)` + :1173-1174 `// explode if under water` `if ((self->s.v.waterlevel > 1) && (match_in_progress == 2))` -> :1208 `T_RadiusDamage(self, self, 35 * cells, world, dtLG_DIS)` (self-inflicted radius damage from LG fired underwater) -> MATCH
- "by flipping the k_dis cvar" -> src/g_utils.c:2211 `i = !cvar(cvarName);` + :2218 `trap_cvar_set_float(cvarName, (float) i);` via src/commands.c:2863 `cvar_toggle_msg(self, "k_dis", redtext("discharges"));` -> MATCH
- "and broadcasting the change" -> src/g_utils.c:2215 `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg);` -> MATCH
- "The toggle is rejected while a match is in progress" -> src/commands.c:2858-2861 `if (match_in_progress) { return; }` (inside ToggleDischarge before cvar_toggle_msg) -> MATCH
WI-2: n/a (no default-value clause asserted; cmds[]:723 CF_PLAYER|CF_SPC_ADMIN -- description makes no access-class claim)

### ktx:command:dropitem
- "Cheat-only debug/map-testing command" -> src/commands.c:9215-9221 `if (strnull(ezinfokey(world, "*cheats"))) { G_sprint(...); return; }` -> MATCH
- "spawns a named entity at the calling player's position" -> src/commands.c:9235 `dropitem_spawn_item(self, di)` -> :9147 `VectorCopy(spot->s.v.origin, p->s.v.origin);` (spot==self) -> MATCH
- "Requires the *cheats serverinfo to be set" -> src/commands.c:9215 `if (strnull(ezinfokey(world, "*cheats")))` -> MATCH
- "refused while a match is in progress" -> src/commands.c:9210-9213 `if (match_in_progress) { return; }` -> MATCH
- "with no argument it prints the list of valid names" -> src/commands.c:9224-9229 `if (trap_CmdArgc() < 2) { dropitem_usage(); return; }` + dropitem_usage :9175-9203 -> MATCH
- "names cover health (h15/h25/h100), armor (ga/ya/ra)" -> src/commands.c:9086-9091 `{ "h15", "item_health", H_ROTTEN } ... { "ra", "item_armorInv", 0 }` -> MATCH
- "every weapon (ssg/ng/sng/gl/rl/lg), ammo packs (sh20/sh40/sp25/sp50/ro5/ro10/ce6/ce12)" -> src/commands.c:9092-9105 -> MATCH
- "powerups (p=pentagram,s=enviro suit,r=ring,q=quad), CTF flags (fl_r/fl_b), spawnpoints (sp_r/sp_b/sp_dm/sp_cp/sp_sp)" -> src/commands.c:9106-9116 `{ "p", "item_artifact_invulnerability" } { "s", "item_artifact_envirosuit" } { "r", "item_artifact_invisibility" } { "q", "item_artifact_super_damage" } { "fl_r", "item_flag_team1", 0, 1 } { "fl_b", ... } { "sp_r" ... } ... { "sp_sp", "info_player_start", 0, 1, dropitem_spawn_spawnpoint }` -> MATCH
- "Each successfully placed entity is flagged so it can later be exported with the dumpent command" -> src/commands.c:9144 `p->dropitem = true;` + dumpent :9330/:9358 `if (!p->dropitem) { continue; }` + cmds[]:1039 `{ "dumpent", dumpent, 0, CF_BOTH | CF_PARAMS, CD_DUMPENT }` -> MATCH
WI-2: n/a (no default-value clause; cmds[]:1037 CF_BOTH|CF_PARAMS -- description claims only cheat-gating, no specific access-class)

## Wave 03 -- 5 batch rows (canary ktx:cvar:k_yawnmode EXCLUDED -- F-V2 over-flag control, confirmed TRACED-CLEAN)

RESULT | ktx:command:infospec | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=9 | All behavior traced & correct; quoted toggle string "ON"/"OFF" is string-inference, source emits redtext-colored lowercase "on"/"off" (OnOff g_utils.c:1854), prefix verbatim-correct.
### ktx:command:infospec
- "Toggles whether item-pickup notifications ('took' info) are available to spectators during a game" -> commands.c:7243-7244 `k_spec_info ^= MI_ON; cvar_fset("k_spec_info", k_spec_info);` -> MATCH (XOR = toggle; gates mi_print broadcast)
- "and the moreinfo command are made available" -> commands.c:7155 `if (!mi_on()) { G_sprint(self, 2, "Spec info is turned off by server\n"); return; }` -> MATCH
- "Flips the MI_ON bit of the k_spec_info cvar" -> commands.c:7243 `k_spec_info ^= MI_ON;` + g_consts.h:282 `#define MI_ON (1<<0)` -> MATCH
- "when set, spectator item-pickup info is broadcast" -> commands.c:7109 `if (!mi_on()) { return; // spec info is turned off }` (mi_print gate) + items.c:320 `mi_print(other, IT_SUPERHEALTH, va("%s got Megahealth", getname(other)));` -> MATCH
- "X got Megahealth (example)" -> items.c:320 `va("%s got Megahealth", getname(other))` -> MATCH (verbatim)
- "and moreinfo works; when cleared, both are suppressed" -> commands.c:7155 (moreinfo gate) + commands.c:7109 (mi_print gate), both on mi_on() -> MATCH
- "Player/spectator-admin command" -> commands.c:931 `{ "infospec", infospec, 0, CF_PLAYER | CF_SPC_ADMIN, CD_INFOSPEC }`; dispatch commands.c:1106 (player: needs CF_PLAYER -> allowed) + commands.c:1096 `if ((cmds[icmd].cf_flags & CF_SPC_ADMIN) && !is_adm(self)) return DO_ACCESS_DENIED;` -> MATCH
- "ignored while a match is in progress" -> commands.c:7238-7241 `if (match_in_progress) { return; }` -> MATCH
- "Broadcasts 'Extra info for spectators ON' / 'OFF' on toggle" -> commands.c:7246 `G_bprint(2, "Extra info for spectators %s\n", redtext(OnOff(mi_on())));` ; OnOff g_utils.c:1854 `return (f ? "on" : "off");` ; redtext g_utils.c:610-616 only sets high bit (no case change) -> MISMATCH(prefix "Extra info for spectators " is verbatim-exact, but the toggle token is source-literal lowercase "on"/"off" rendered in red, NOT uppercase "ON"/"OFF" as quoted; casing of a quoted display string is string-inference, not byte-matched to code)
WI-2: n/a (access-class CF_PLAYER|CF_SPC_ADMIN verified at dispatch; no default-value clause)

RESULT | ktx:command:kill | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=12 | Every guard/limit/death-type/access clause located in ClientKill (client.c:943) and command table; all match incl. verbatim strings.
### ktx:command:kill
- "kills the calling player by applying lethal self-damage (death recorded as a suicide)" -> client.c:1008-1009 `self->deathtype = dtSUICIDE; T_Damage(self, self, self, 999999);` -> MATCH
- "Blocked while the server is paused" -> client.c:945-947 `if (cvar("sv_paused")) { return; // kill not allowed during pause }` -> MATCH
- "or in standby" -> client.c:950-953 `if (k_standby) { return; }` -> MATCH
- "if the player is already dead" -> client.c:960-962 `if (ISDEAD(self) || !self->s.v.takedamage) { return; // already dead }` -> MATCH
- "or not a player" -> client.c:965-967 `if (self->ct != ctPlayer) { return; // not a player }` -> MATCH
- "in RA mode ('Can't suicide in RA mode')" -> client.c:970-974 `if (isRA()) { G_sprint(self, PRINT_HIGH, "Can't suicide in RA mode\n"); return; }` -> MATCH (verbatim)
- "at restricted times in CA/wipeout" -> client.c:977-984 `if (isCA() && match_in_progress) { if ((ra_match_fight != 2) || ca_round_pause) { G_sprint(self, PRINT_HIGH, "Can't suicide at this time\n"); return; }` -> MATCH
- "and after a wipeout-round suicide the player cannot respawn that round" -> client.c:985-989 `else if ((ra_match_fight == 2) && !ca_round_pause) { self->can_respawn = false; // No respawning after suicide in wipeout mode self->seconds_to_respawn = 999; }` -> MATCH
- "and during the first 10 seconds of a CTF match" -> client.c:992-996 `if (isCTF() && (match_in_progress == 2) && ((g_globalvars.time - match_start_time) < 10)) { G_sprint(self, PRINT_HIGH, "Can't suicide during first 10 seconds of CTF match\n"); return; }` -> MATCH
- "Rate-limited to one suicide per second" -> client.c:999-1006 `if (g_globalvars.time < self->suicide_time) { G_sprint(self, PRINT_HIGH, "Only one suicide in 1 second\n"); return; } self->suicide_time = g_globalvars.time + 1;` -> MATCH
- "Player command" -> commands.c:947 `{ "kill", ClientKill, 0, CF_PLAYER | CF_MATCHLESS, CD_KILL }` + dispatch commands.c:1106 -> MATCH
- "usable outside a match" -> commands.c:947 CF_MATCHLESS flag set; dispatch commands.c:1078 `if (k_matchLess && !(cmds[icmd].cf_flags & CF_MATCHLESS)) return DO_CMD_DISALLOWED_MATCHLESS;` (flag present => allowed in matchless) -> MATCH
WI-2: n/a (no default-value clause; access-class CF_PLAYER verified at dispatch)

RESULT | ktx:command:ksound1 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | TeamSay(1) in commands.c:3377 fully enforces every clause incl. KF_KTSOUNDS bit, same-team check, recipient k_sdir, team/CTF-only.
### ktx:command:ksound1
- "Sends team audio cue 1 (plays ktsound1.wav)" -> commands.c:770 `{ "ksound1", DEF(TeamSay), 1, CF_PLAYER, CD_KSOUND1 }` + commands.c:3380 `char *sndname = va("ktsound%d.wav", (int)fsndname);` (fsndname=1 -> "ktsound1.wav") + commands.c:3391 `stuffcmd(p, "play %s%s\n", ..., sndname);` -> MATCH
- "to your same-team players" -> commands.c:3387 `if (streq(getteam(self), getteam(p)))` -> MATCH
- "server stuffs a 'play' of ktsound1.wav into the console of every other client on your team" -> commands.c:3382 `for (p = world; (p = find_plr(p));)` + commands.c:3384 `if ((p != self) ...` + commands.c:3391 `stuffcmd(p, "play %s%s\n", ...)` -> MATCH
- "who has KT sounds enabled (the KF_KTSOUNDS bit in their kf userinfo key)" -> commands.c:3385 `(iKey(p, "kf") & KF_KTSOUNDS)` + g_consts.h:245 `#define KF_KTSOUNDS (1)` -> MATCH
- "and a non-empty name" -> commands.c:3384 `!strnull(p->netname)` -> MATCH
- "each recipient's file path honours their own k_sdir sound-directory setting" -> commands.c:3389-3391 `char *t1 = ezinfokey(p, "k_sdir"); stuffcmd(p, "play %s%s\n", (strnull(t1) ? "" : va("%s/", t1)), sndname);` (recipient p's k_sdir) -> MATCH
- "Only active in team or CTF games" -> commands.c:3384 `(isTeam() || isCTF())` -> MATCH
WI-2: n/a (no default-value; CF_PLAYER access-class consistent w/ description's "your team players")

RESULT | ktx:command:lastscores | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | lastscores() commands.c:6981 enforces matchup/mode header, grouping, extended-args member list (lsTeam/lsCTF/lsCA only), count + empty string verbatim.
### ktx:command:lastscores
- "Prints the recorded results of recently completed games to the requesting client" -> commands.c:6981-7049 loop over `__k_ls_*` cvars; all output via `G_sprint(self, ...)` (self=requester) -> MATCH
- "shows the matchup (the two team names, or the two duelers) and the game-mode label" -> commands.c:7020-7021 `G_sprint(self, 2, "\220%s %s %s\221 %s\n", e1, redtext("vs"), e2, redtext(lastscores2str(cur)));` (e1/e2=__k_ls_e1/e2; lastscores2str=mode label, def commands.c:6755) -> MATCH
- "followed by the per-map score line" -> commands.c:7041 `G_sprint(self, 2, "  %s\n", sc);` (sc=__k_ls_s_%d) -> MATCH
- "consecutive entries with the same matchup and mode are grouped under one header" -> commands.c:7016-7022 header only emitted `if (cur != last || (strneq(le1, e1) || strneq(le2, e2)))` -> MATCH
- "Passing any argument switches to an extended view" -> commands.c:6996 `qbool extended = (trap_CmdArgc() > 1);` -> MATCH
- "additionally lists each team's members (in team, CTF and CA modes)" -> commands.c:7028 `if (extended && ((cur == lsTeam) || (cur == lsCTF) || (cur == lsCA)))` + commands.c:7032/7037 `G_sprint(self, 2, " %4.4s:%s\n", e1, t1)` / `e2, t2` -> MATCH (exactly lsTeam/lsCTF/lsCA, excludes lsWO/others as description scopes)
- "so the squad that played each map is visible" -> commands.c:7024-7027 comment + members re-shown on squad change commands.c:7030 `if (strneq(lt1, t1))` / 7035 `if (strneq(lt2, t2))` -> MATCH
- "Ends with a count of entries found" -> commands.c:7051-7055 `if (cnt) { G_sprint(self, 2, "\n" "Lastscores: %d entr%s found\n", cnt, cnt ? "y" : "ies"); }` -> MATCH
- "or reports 'Lastscores data empty' when there is no stored history" -> commands.c:7057-7059 `else { G_sprint(self, 2, "Lastscores data empty\n"); }` -> MATCH (verbatim)
WI-2: n/a (CF_BOTH|CF_MATCHLESS|CF_PARAMS, no class/default clause in description)

RESULT | ktx:command:latejoin | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=12 | latejoin() commands.c:5335 enforces every guard; isCA() (clan_arena.c:295) covers BOTH CA & Wipeout (k_clan_arena 1 or 2) so "CA or Wipeout" is correct; 30s electguard verified.
### ktx:command:latejoin
- "Lets a teamless player request to join a team mid-match" -> commands.c:5335 latejoin() + guarded by `!self->ca_ready` (teamless) + `match_in_progress` -> MATCH
- "Only works while a game is in progress" -> commands.c:5342-5344 `if (!match_in_progress) { return; }` -> MATCH
- "and only in Clan Arena or Wipeout (otherwise reports requests only allowed in CA or Wipeout)" -> commands.c:5346-5349 `if (!isCA()) { G_sprint(self, 2, "Late-join requests are only allowed during CA or Wipeout.\n"); return; }` ; isCA() clan_arena.c:295 `return (isTeam() && cvar("k_clan_arena"));` is true for k_clan_arena==1 (CA) AND ==2 (Wipeout, clan_arena.c:127 `qbool isWipeout = (cvar("k_clan_arena") == 2);`) -> MATCH (single isCA() guard correctly admits both modes)
- "the player must not already be on a team" -> commands.c:5351-5354 `if (self->ca_ready) { G_sprint(self, 2, "You're already on a team.\n"); return; }` -> MATCH
- "Usage: latejoin <team>" -> commands.c:5376-5377 `if (trap_CmdArgc() < 2) { G_sprint(self, 2, "Usage: latejoin <team>\n"); ... }` -> MATCH
- "where <team> must be one of the two active team names" -> commands.c:5385-5388 `if (!streq(arg_2, cvar_string("_k_team1")) && !streq(arg_2, cvar_string("_k_team2"))) { G_sprint(self, 2, "Invalid team. Must be %s or %s \n", ...); return; }` -> MATCH
- "rejected if an election is already running" -> commands.c:5364-5367 `if (get_votes(OV_ELECT)) { G_sprint(self, 2, "An election is already in progress\n"); return; }` -> MATCH
- "if the player is still within the election cooldown" -> commands.c:5370-5373 `if ((till = Q_rint(self->v.elect_block_till - g_globalvars.time)) > 0) { G_sprint(self, 2, "Wait %d second%s!\n", ...); return; }` -> MATCH
- "if the chosen team already has more players than the other" -> commands.c:5391-5404 count loop then `if (team_players > other_team_players) { G_sprint(self, 2, "Team %s already has more players\n", arg_2); return; }` -> MATCH
- "otherwise it starts a 30-second election" -> commands.c:5411-5412 `self->v.elect = 1; self->v.elect_type = etLateJoin;` + commands.c:5419-5423 `electguard = spawn(); ... electguard->s.v.nextthink = g_globalvars.time + 30; // 30 second timeout` -> MATCH
- "that members of the chosen team approve by typing yes" -> commands.c:5416 `G_bprint(2, "Team \x90%s\x91 members: type %s to approve\n", arg_2, redtext("yes"));` (etLateJoin vote tally vote.c:202 get_latejoin_votes) -> MATCH
- "issuing latejoin again while one's own request is pending aborts it" -> commands.c:5357-5361 `if (is_elected(self, etLateJoin)) { G_bprint(2, "%s %s!\n", self->netname, redtext("aborts late join request")); AbortElect(); return; }` -> MATCH
WI-2: n/a (handler is enforcing truth; command-table CF_SPC_ADMIN at commands.c:838 not contradicted by description)


## Wave 02 -- batch rows (canary ktx:cvar:k_teamoverlay EXCLUDED -- F-V2 control: C-NEAR-MISS, sharpened-redispatch PASS)

RESULT | ktx:command:effi | C-FIX | flavourC=1 | wi2=0 | clauses=7 | Rocket-Arena branch traced; "In Race shows that mode's own stats listing" is WRONG -- effi handler PlayerStats (commands.c:3558) has no isRACE() branch, race_match_stats() is reached only from MatchEndStats (auto end-of-match), not the effi command.
### ktx:command:effi
- "command run by a player, prints to that player" -> src/commands.c:705 `{ "effi", PlayerStats, 0, CF_BOTH | CF_MATCHLESS, CD_EFFI }` + src/commands.c:3558 `void PlayerStats(void)` (uses `self`, `G_sprint(self,...)`) -> MATCH (CF_BOTH = player or spec; output via G_sprint(self))
- "each player's name, frags, rank (frags minus deaths)" -> src/commands.c:3623 `G_sprint(self, 2, "%.10s ", p2->netname)`; 3633 `va("%d",(!isCTF()?(int)p2->s.v.frags:...))`; 3640 `va("%d",(!isCTF()?(int)(p2->s.v.frags - p2->deaths):...))` -> MATCH (name; frags; rank = frags-deaths, CTF subtracts captures -- general formula, still-true simplification)
- "friendly kills (in team modes)" -> src/commands.c:3641-3644 `if (isTeam()) { // friendkills  stats = va("%d", (int)p2->friendly); G_sprint(self,2,"%2s ",stats); }` ; header src/commands.c:3590 `isTeam() ? redtext("friendkills ")` -> MATCH (friendkills printed only under isTeam())
- "and efficiency" -> src/commands.c:3672-3674 `stats = va("%3.1f", p2->efficiency); G_sprint(self, 2, "\217 %5s%%\n", stats); // effi` -> MATCH
- "grouped by team" -> src/commands.c:3604-3613 `tmp = getteam(p); for (p2 = world; ...) { if (p2->k_flag || strneq(tmp, getteam(p2))) continue; ... }` (nested per-team loop, k_flag marks served) -> MATCH
- "Only available while a game is actually in progress (otherwise it replies 'no game - no statistics')" -> src/commands.c:3570-3573 `if (match_in_progress != 2) { G_sprint(self, 2, "no game - no statistics\n"); return; }` -> MATCH (exact string + guard; match_in_progress==2 = match begun)
- "In Race / Rocket Arena it instead shows that mode's own stats listing" -> src/commands.c:3563-3567 `if (isRA()) { ra_PlayerStats(); return; }` ; isRA() = isDuel() && cvar("k_rocketarena") (src/arena.c:130-133); ra_PlayerStats prints Name/Frags/Wins/Loses/Effi (src/arena.c:706-768) -> MISMATCH(Rocket-Arena half is enforced and correct. Race half is WRONG: PlayerStats has NO isRACE() branch. In Race mode (k_race), isRA() is false, so effi falls through to the `match_in_progress != 2` guard then the standard per-player frags/rank/effi table at 3570+. The race-specific listing race_match_stats/race_match_stats_print (src/race.c:5265,5423) is called only from MatchEndStats (src/stats.c:1678,1694) -- the automatic end-of-match flow -- is not a command, and is unreachable from the effi command path. The clause asserts a Race behavior the enforcing handler contradicts.)
WI-2: n/a (effi is CF_BOTH | CF_MATCHLESS, no admin/default clause in description; access is both-classes which matches the flag and the dispatch at src/commands.c:1091/1106)

RESULT | ktx:command:fallbunny | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Toggle of k_fallbunny + broadcast + match/race/yawn guards + broken-ankle polarity all map to enforcing lines (admin.c:888-910, g_utils.c:2202-2218 / 2723-2726, client.c:4496-4500/2704).
### ktx:command:fallbunny
- "Toggles the fallbunny setting (server cvar k_fallbunny) on or off" -> src/admin.c:909 `cvar_toggle_msg(self, "k_fallbunny", redtext("fallbunny"));` + src/g_utils.c:2210 `i = !cvar(cvarName);` + 2218 `trap_cvar_set_float(cvarName, (float) i);` ; registered src/world.c:846 `RegisterCvar("k_fallbunny");` (bare = server cvar, default 0) -> MATCH
- "and broadcasts the new state to everyone" -> src/g_utils.c:2212-2215 `if (!strnull(msg)) { G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg); }` (G_bprint level 2 = MSG_ALL broadcast) -> MATCH
- "When off ... gets a 'broken ankle' (movement penalty applied on landing)" -> src/client.c:4496-4499 (in CheckLand, jump_flag<jumpf_flag landing branch) `if (self->s.v.waterlevel < 2) { if (!get_fallbunny()) { self->brokenankle = 1; } }` ; get_fallbunny() returns cvar("k_fallbunny") when not yawn/race (src/g_utils.c:2726) -> off(0) -> !0 true -> sets brokenankle -> MATCH
- "movement penalty applied on landing" (brokenankle effect) -> src/client.c:2704 `if (!self->brokenankle) { ... jump ... }` + src/client.c:3948 `if (self->s.v.button2 || self->brokenankle) PlayerJump();` (when brokenankle set the normal jump branch is skipped = movement penalty on landing) -> MATCH
- "high fall after bunny-hopping" -> src/client.c:4488 `else if (self->jump_flag < jumpf_flag)` (hard/high fall speed threshold) -> MATCH ("after bunny-hopping" is a still-true characterization -- code gates on fall speed not prior bunnyhop, acceptable traceable vagueness)
- "when on, that broken-ankle penalty is suppressed so hard landings carry no movement consequence" -> src/client.c:4497-4499 `if (!get_fallbunny()) { self->brokenankle = 1; }` -> when k_fallbunny on(1) get_fallbunny()=1 so the brokenankle assignment is skipped -> MATCH (polarity correct)
- "ignored while a match is in progress / blocked (with a message) when race mode or yawnmode is active" -> src/admin.c:890-893 `if (match_in_progress) { return; }` (silent ignore) ; src/admin.c:895-907 `if (isRACE()) { G_sprint(self,2,"Command blocked because race mode is active\n"); return; } if (k_yawnmode) { G_sprint(self,2,"Command blocked because yawnmode is active\n"); return; }` -> MATCH (match = silent return; race & yawn each have an explicit G_sprint message; order match->race->yawn)
WI-2: n/a (no default/access-class clause; flag CF_PLAYER | CF_SPC_ADMIN not asserted in description)

RESULT | ktx:command:fav13_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | favx_add(13): CF_SPECTATOR enforced spectator-only at dispatch, tracking-required guard, unconditional favx[12]=diff overwrite, 13fav_go cross-ref via xfav_go(13) all enforced (commands.c:858,878,1133,5713-5732,5821-5855).
### ktx:command:fav13_add
- "Spectator command" -> src/commands.c:858 `{ "fav13_add", DEF(favx_add), 13, CF_SPECTATOR, CD_FAV13_ADD }` + dispatch src/commands.c:1088-1093 `if (spc) { if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) return DO_WRONG_CLASS; }` and player branch 1104-1108 `if (!(cmds[icmd].cf_flags & CF_PLAYER)) return DO_WRONG_CLASS` -> MATCH (CF_SPECTATOR only, no CF_PLAYER = spectator-only by the dispatch's boolean logic)
- "Stores the player you are currently tracking into indexed favourite slot 13" -> src/commands.c:1133-1135 `if (cmds[icmd].arg) ((void (*)(float))(cmds[icmd].f))(cmds[icmd].arg)` (arg=13 -> favx_add(13)) ; src/commands.c:5715 `goal = PROG_TO_EDICT(self->s.v.goalentity); diff = goal - world` ; 5732 `self->favx[(int)fav_num - 1] = diff` (fav_num=13 -> favx[12], labeled "slot 13" at 5729) -> MATCH
- "Does nothing unless you are tracking a real player" -> src/commands.c:5722-5727 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)) { G_sprint(self,2,"fav add: you are %s player!\n", redtext("not tracking")); return; }` -> MATCH (prints "not tracking" and returns before the slot write; "does nothing" = effect-level still-true)
- "if you are, the tracked player's identity is written to slot 13 (overwriting any previous occupant)" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (unconditional assignment after the guard -> overwrites prior favx[12]) -> MATCH
- "13fav_go later snaps your POV to whoever occupies that slot" -> src/commands.c:878 `{ "13fav_go", DEF(xfav_go), 13, CF_SPECTATOR, ... }` ; src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1]` ; 5855 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p))` (track = POV snap) -> MATCH
WI-2: n/a (spectator-class is the only access clause, matches CF_SPECTATOR via dispatch; no default clause)

RESULT | ktx:command:fav2_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | favx_add(2): CF_SPECTATOR spectator-only, tracking-required guard, unconditional favx[1]=diff overwrite, 2fav_go cross-ref via xfav_go(2) all enforced (commands.c:847,867,1133,5713-5732,5821-5855).
### ktx:command:fav2_add
- "Spectator command" -> src/commands.c:847 `{ "fav2_add", DEF(favx_add), 2, CF_SPECTATOR, CD_FAV2_ADD }` + dispatch src/commands.c:1088-1093 / 1104-1108 (CF_SPECTATOR only, no CF_PLAYER -> DO_WRONG_CLASS for a player) -> MATCH
- "Stores the player you are currently tracking into indexed favourite slot 2" -> src/commands.c:1133-1135 `((void (*)(float))(cmds[icmd].f))(cmds[icmd].arg)` (arg=2 -> favx_add(2)) ; src/commands.c:5715 `goal = PROG_TO_EDICT(self->s.v.goalentity); diff = goal - world` ; 5732 `self->favx[(int)fav_num - 1] = diff` (fav_num=2 -> favx[1], labeled "slot 2") -> MATCH
- "Does nothing unless you are tracking a real player" -> src/commands.c:5722-5727 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)) { G_sprint(self,2,"fav add: you are %s player!\n", redtext("not tracking")); return; }` -> MATCH (message + return before slot write = effect-level still-true)
- "if you are, the tracked player's identity is written to slot 2 (overwriting any previous occupant)" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (unconditional after the guard -> overwrites favx[1]) -> MATCH
- "2fav_go later snaps your POV to whoever occupies that slot" -> src/commands.c:867 `{ "2fav_go", DEF(xfav_go), 2, CF_SPECTATOR, ... }` ; src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1]` (favx[1]) ; 5855 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p))` -> MATCH
WI-2: n/a (spectator-class matches CF_SPECTATOR via dispatch; no default clause)

RESULT | ktx:command:info | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=5 | argc dispatch + ktpro-alias all traced on KTX's path; "if the value is empty, removes the key" has NO enforcing line in the source oracle -- KTX calls SetUserInfo UNCONDITIONALLY for argc==3 (thin pass-through to engine trap, outside src/); no KTX branch tests value-empty. Setting traced; empty->remove is engine-side, hinted only by an adjacent comment.
### ktx:command:info
- "Userinfo helper (KTPRO-compatibility alias of kinfo)" -> src/commands.c:940 `{ "kinfo", cmdinfo, 0, CF_BOTH | CF_MATCHLESS | CF_PARAMS, CD_KINFO }` and 942-943 `// { saved for ktpro compatibility` immediately above `{ "info", cmdinfo, 0, CF_BOTH | CF_MATCHLESS | CF_PARAMS | CF_NOALIAS, CD_NODESC }` ; corroborated src/g_userinfo.c:29 `// ktpro like 'cmd info' compatibility` -> MATCH (both names dispatch the same handler cmdinfo; the ktpro-compat characterization is backed by two explicit source comments; `info` = the CF_NOALIAS/CD_NODESC ktpro name, `kinfo` = the documented name)
- "With no arguments (or more than three) it stuffs 'cmd setinfo' back to the client so all settable keys are listed" -> src/g_userinfo.c:99-104 `if ((argc == 1) || (argc > 3)) { stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd setinfo\n"); return; }` (argc==1 = command name only = no key args; argc>3 = more than three) -> MATCH (the stuff is exactly verified; "so all settable keys are listed" is the documented effect of `cmd setinfo` on the client, a reasonable gloss, not itself a KTX-side assertion)
- "With one key argument it prints that userinfo key's current value (key = \"value\")" -> src/g_userinfo.c:106-111 `if (argc == 2) { G_sprint(self, 2, "key %s = \"%s\"\n", arg_1, ezinfokey(self, arg_1)); return; }` (argc==2 = command + 1 arg) -> MATCH (printed literal: key <name> = "<value>")
- "With a key and a value it sets ... that userinfo key for the issuing client" -> src/g_userinfo.c:113-118 `if (argc == 3) { SetUserInfo(self, arg_1, arg_2, 0); return; }` ; src/g_utils.c:2747-2749 `void SetUserInfo(...) { trap_SetUserInfo(NUM_FOR_EDICT(p), varname, value, flags); }` (self == issuing client; argc==3 = command + 2 args) -> MATCH
- "or, if the value is empty, removes that userinfo key" -> src/g_userinfo.c:115-118 `SetUserInfo(self, arg_1, arg_2, 0)` is called UNCONDITIONALLY for argc==3 -- there is NO KTX branch testing arg_2-empty. SetUserInfo (src/g_utils.c:2749) is a one-line pass-through to `trap_SetUserInfo`, which is a syscall trap (src/g_syscalls.c:459 `return syscall(...)`) into the engine, OUTSIDE the source oracle /tmp/ktx-src-67253dc9/src/. The empty->remove decision executes engine-side (MVDSV), not on KTX's code path. The only KTX trace is the adjacent comment src/g_userinfo.c:117 `// set/remove particular key` -> UNTRACEABLE (no enforcing line in the source oracle that tests value-empty and removes; the sub-clause is essentially correct via the engine but flavour-C: hinted only by an adjacent comment, while the real KTX code is an unconditional delegate -- SHARPENED RULE: "true on a callee we cannot trace / no enforcing line on the feature path" -> C-NEAR-MISS, not absorbed into CLEAN)
WI-2: n/a (CF_BOTH -- both classes, matches the dispatch; no admin or default clause asserted)


## Wave 04 -- batch rows (canary ktx:command:autotrack EXCLUDED -- F-V2 control: C-FIX confirmed)

RESULT | ktx:command:mkick | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | every clause maps to an enforcing line in m_kick() / table entry; admin-gate, multi-id loop, reason broadcast, not-found message all verified.
### ktx:command:mkick
- "Admin-only / Non-admins refused with 'You are not an admin'" -> src/admin.c:181-186 `if (!is_adm(self)) { G_sprint(self, 2, "You are not an admin\n"); return; }` (corroborated by table src/commands.c:795 `CF_BOTH_ADMIN`) -> MATCH
- "kicks one or more clients identified by numeric user IDs in a single call" -> src/admin.c:197-218 `for (k = 0, i = 1; i < argc; i++) { ... if (!only_digits(arg_x)) break; if (!(p = SpecPlayer_by_id(atoi(arg_x))) ...) ...; if (!DoKick(p, self)) continue; k++; }` -> MATCH
- "syntax 'mkick <id1 [id2 [id3 ...]] [reason]>'" -> src/admin.c:190-194 `if ((argc < 2) || !only_digits(arg_x)) { G_sprint(self, 2, "mkick <id1 [id2 [id3 ...]] [reason]>\n"); return; }` (verbatim usage string) -> MATCH
- "trailing non-numeric argument broadcast to everyone as the kick reason" -> src/admin.c:201-204 `if (!only_digits(arg_x)) break;` then src/admin.c:225-228 `if (!strnull(str = params_str(i, -1))) { G_bprint(2, "\x90%s\x91\n", str); }` (G_bprint = server-wide) -> MATCH
- "Unknown IDs reported ('mkick: client <id> not found') and skipped" -> src/admin.c:206-210 `if (!(p = SpecPlayer_by_id(...)) && !(p = not_connected_by_id(...))) { G_sprint(self, 2, "mkick: client %s not found\n", arg_x); continue; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:moreinfo | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | spectator-class, mi-userinfo cycle/wrap, per-level item gating, and k_spec_info-disabled message all verified at enforcing lines.
### ktx:command:moreinfo
- "Spectator command" -> src/commands.c:932 `{ "moreinfo", moreinfo, 0, CF_SPECTATOR | CF_MATCHLESS, CD_MOREINFO }` + dispatch src/commands.c:1091 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) return DO_WRONG_CLASS;` (no CF_PLAYER) -> MATCH
- "cycles the 'mi' userinfo, 0..N wrapping" -> src/commands.c:7162-7174 `level = iKey(self, "mi") + 1; if (level > (mi_levels_cnt - 1)) level = 0; ... SetUserInfo(self, "mi", va("%d", level), 0);` -> MATCH
- "each level controls how much live item/powerup pickup info: from off, through powerups/armors/mega/RL, up to all weapons" -> src/commands.c:7089-7098 `mi_levels[]` ({0,...}=off; {MI_POW|MI_ARM|IT_SUPERHEALTH|IT_ROCKET_LAUNCHER}; ...; {MI_POW|MI_ARM|IT_SUPERHEALTH|MI_WPN}=all weapons) gated in src/commands.c:7135 `if (!(it & mi_levels[level].items)) continue;` -> MATCH
- "fed to the spectator during play" -> src/commands.c:7102-7148 mi_print() iterates `find_spc`, reads each spec's `mi` level, sprints pickup msg -> MATCH
- "if server has spec info disabled (k_spec_info) prints 'Spec info is turned off by server' and does nothing" -> src/commands.c:7067-7070 `mi_on(){ return ((int)cvar("k_spec_info") & MI_ON); }` + src/commands.c:7155-7160 `if (!mi_on()) { G_sprint(self, 2, "Spec info is turned off by server\n"); return; }` (verbatim string; minor traceable vagueness: gated on the MI_ON bit of k_spec_info, still true) -> MATCH
WI-2: n/a

RESULT | ktx:command:motd | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | re-display to player/spec, ~10s duration, explicit non-matchless+match_in_progress branch, and 'Already showing motd' dedupe all verified.
### ktx:command:motd
- "Re-displays the server's MOTD to the calling client (player or spectator)" -> src/commands.c:6698-6702 `motd = spawn(); motd->classname = "motd"; motd->s.v.owner = EDICT_TO_PROG(self); motd->think = (func_t)(self->ct == ctSpec ? SMOTDThink : PMOTDThink);` + table src/commands.c:929 `CF_BOTH` -> MATCH
- "for about 10 seconds" -> src/commands.c:6704 `motd->attack_finished = g_globalvars.time + 10;` -> MATCH
- "Outside matchless mode it does nothing while a match is in progress" -> src/commands.c:6680-6686 `if (!k_matchLess) // show motd in matchLess mode even match in progress { if (match_in_progress) { return; } }` (explicit branch on this exact condition, on the feature's own path) -> MATCH
- "if a MOTD is already showing for this client it prints 'Already showing motd' instead of starting another" -> src/commands.c:6688-6696 `for (motd = world; (motd = find(motd, FOFCLSN, "motd"));) { if (owner == motd->s.v.owner) { G_sprint(self, 2, "Already showing motd\n"); return; } }` (owner = self) -> MATCH
WI-2: n/a

RESULT | ktx:command:nosweep | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | k_nosweep flip, server-wide announce, dmm1 gate, and rules-change-allowed gate all verified at enforcing lines.
### ktx:command:nosweep
- "Toggles NoSweep on or off by flipping the k_nosweep setting" -> src/commands.c:7720 `cvar_toggle_msg(self, "k_nosweep", redtext("NoSweep"));` -> src/g_utils.c:2211-2218 `i = !cvar(cvarName); ... trap_cvar_set_float(cvarName, (float) i);` -> MATCH
- "the new state is announced server-wide" -> src/g_utils.c:2213-2216 `if (!strnull(msg)) { G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg); }` (G_bprint = broadcast) -> MATCH
- "Requires deathmatch mode 1 (dmm1) to enable" -> src/commands.c:7712-7718 `// Can't enable nosweep unless dmm1 is set first\n if (deathmatch != 1) { G_sprint(self, 2, "nosweep requires dmm1\n"); return; }` -> MATCH
- "only accepted when a rules change is currently allowed" -> src/commands.c:7707-7710 `if (!is_rules_change_allowed()) { return; }` -> src/commands.c:9033-9050 `is_rules_change_allowed(){ if (match_in_progress){ ... return false; } if (isRACE()){ ... return false; } return true; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:noweapon | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | dmm4 gate, no-arg list print, exact weapon name/number toggle into k_disallow_weapons, server-wide announce, and match-in-progress show-only-list branch all verified.
### ktx:command:noweapon
- "Manages which weapons are disallowed for the match in deathmatch mode 4 (dmm4)" -> src/commands.c:5243 `int k_disallow_weapons = (int)cvar("k_disallow_weapons") & DA_WPNS;` + src/commands.c:5255-5260 `if (deathmatch != 4) { G_sprint(self, 2, "command allowed in %s only\n", redtext("dmm4")); return; }` -> MATCH
- "With no argument it prints the current list of disallowed weapons" -> src/commands.c:5262-5267 `if (trap_CmdArgc() == 1) { show_disallowed_weapons(k_disallow_weapons); return; }` + src/commands.c:5233-5238 `show_disallowed_weapons(){ ... G_sprint(self, 2, "weapons disallowed:%s\n", ...); }` -> MATCH
- "With one argument (weapon name axe,sg,ssg,ng,sng,gl,rl,lg or its number 1-8) it toggles that weapon between allowed and disallowed in the k_disallow_weapons set" -> src/commands.c:5277-5308 exact pairs (`"axe"`/`"1"`->IT_AXE ... `"lg"`/`"8"`->IT_LIGHTNING), `k_disallow_weapons ^= bit = IT_*` (XOR toggle) + src/commands.c:5314 `trap_cvar_set_float("k_disallow_weapons", k_disallow_weapons);` -> MATCH
- "announces the change server-wide" -> src/commands.c:5310-5313 `if (bit) { G_bprint(2, "%s %s %s\n", self->netname, redtext(Allows(!(k_disallow_weapons & bit))), redtext(nwp)); ... }` (G_bprint = broadcast) -> MATCH
- "Only works in dmm4" -> src/commands.c:5255-5260 `if (deathmatch != 4) { ... return; }` (non-match path) -> MATCH
- "while a match is in progress it only shows the disallowed list (and does nothing in other modes)" -> src/commands.c:5245-5253 `if (match_in_progress) { if (deathmatch == 4) // match started, show info and return { show_disallowed_weapons(k_disallow_weapons); } return; }` (dmm4 -> list; non-dmm4 -> inner if false, plain return = nothing) -> MATCH
WI-2: n/a

## Wave 05 -- batch rows (canary ktx:cvar:k_teamoverlay EXCLUDED -- F-V2 control: C-NEAR-MISS confirmed)

# KTX D7 V-pass -- wave w05 read-only classification

Source oracle: /tmp/ktx-src-67253dc9 @ 67253dc9ab4f643f1e6523a923a41caab9ea587f (1.47-2-g67253dc). Read-only.

RESULT | ktx:command:pause | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Every clause -- toggle, 3s unpause, 3s pause, <=3s refusal, pausable/admin/requests permit, pending-report, matchless-vs-running -- maps to an enforcing branch on TogglePause's own path.
### ktx:command:pause
- "Toggles the game's pause state" -> commands.c:8740 `if ((int)cvar("sv_paused") & 1)` -> MATCH (branches UNPAUSE vs PAUSE on current pause state)
- "if currently paused it requests an unpause that takes effect after a 3-second countdown" -> commands.c:8755 `when_to_unpause = pauseduration + 3000; // schedule unpause in 3000 ms` (+ bprint "will resume in 3 seconds") -> MATCH
- "if it is not paused it requests a pause, also applied after a 3-second countdown" -> commands.c:8800 `when_to_pause = g_globalvars.time + 3` (WillPause 8817-8839 centerprints countdown then trap_setpause(1)) -> MATCH
- "A pause is refused when 3 or fewer seconds remain in the match" -> commands.c:8784 `if (!minutes && seconds <= 3)` -> MATCH (exact <=3)
- "unless pausing is permitted (the pausable cvar set, the caller is an admin, or the player still has pause requests remaining)" -> commands.c:8793 `if (!cvar("pausable") && !is_adm(self) && !PlayerCanPause(self))`; PlayerCanPause client.c:5802 `if (p->k_pauseRequests > 0)` -> MATCH (three OR'd permits; "still has requests" = k_pauseRequests>0, minor still-true vagueness re extra matchtag gate)
- "Repeated calls while a pause/unpause is already pending report the pending state instead of stacking" -> commands.c:8745-8753 `if (when_to_unpause) { ... "Unpause is pending" ; return; }` + commands.c:8763-8768 `if (when_to_pause) { "Pause already in progress." ; return; }` -> MATCH
- "Outside matchless mode it acts only during an actual running game" -> commands.c:8731-8737 `if (!k_matchLess) { if (match_in_progress != 2) { return; // apply TogglePause only during actual game } }` -> MATCH (explicit branch on the feature's own path testing exactly this)
WI-2: n/a

RESULT | ktx:command:pos_origin | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Teleport, "*" skip, exactly-3-args usage, 1/sec rate-limit, Pos_Disallowed gate -- all enforced on Pos_Set's own path (arg=1 origin case).
### ktx:command:pos_origin
- "Teleports the player to the origin given as three coordinate arguments (x y z)" -> commands.c:6571 `if (trap_CmdArgc() != 4)` + commands.c:6589-6594 case 1: Pos_Save_origin -> Pos_Parse_Set(&pos.origin) -> Pos_Set_origin (-> setorigin commands.c:6497) -> MATCH
- "an argument of \"*\" leaves that coordinate unchanged" -> commands.c:6551-6554 `if (strneq(arg, "*")) { (*x)[i] = atof(arg); }` (pos pre-seeded from self origin by Pos_Save_origin) -> MATCH
- "Requires exactly three arguments (otherwise a usage message is printed)" -> commands.c:6571-6577 `if (trap_CmdArgc() != 4) { G_sprint(... "Usage: pos_{origin|angles} x1 x2 x3\nuse '*' for no changes\n"); return; }` -> MATCH (argc 4 = cmd + 3)
- "rate-limited to one position change per second" -> commands.c:6579-6584 `if (self->pos_move_time && ((self->pos_move_time + 1) > g_globalvars.time)) { G_sprint(... "Only one move per second allowed\n"); return; }` -> MATCH
- "Subject to the server's position-command restrictions (Pos_Disallowed)" -> commands.c:6566-6569 `if (Pos_Disallowed()) { return; }`; macro commands.c:6406 `#define Pos_Disallowed() (match_in_progress || intermission_running || cvar( "sv_paused" ) || (isRACE() && race.status))` -> MATCH (names the exact macro; gate on the feature's own path)
WI-2: n/a

RESULT | ktx:command:powerups | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | No-arg toggle-all, q/p/r/s per-powerup, q/p/r/s->IT_QUAD/INVUL/INVIS/SUIT mapping confirmed at spawn-gating code, global k_pow OR-fold, match/instagib/midair early-return all on TogglePowerups' own path.
### ktx:command:powerups
- "Controls which powerups spawn on the map" -> commands.c:2803-2807 toggles k_pow/k_pow_q/p/r/s; gating at items.c:111-114 / items.c:2036-2039 -> MATCH
- "Called with no argument it toggles all powerups on or off together (Quad, Pentagram, Ring of Shadows, and Biosuit)" -> commands.c:2801-2810 `if (trap_CmdArgc() <= 1) { cvar_toggle_msg(self, "k_pow", ...); cvar_fset("k_pow_q", cvar("k_pow")); ...p ...r ...s; return; }` -> MATCH
- "Called with one or more of the letter arguments q, p, r, s (up to 4) it toggles each powerup individually" -> commands.c:2813 `for (i = 1; i < min(1 + 4, trap_CmdArgc()); i++)` then streq "q"/"p"/"r"/"s" cvar_toggle_msg -> MATCH (cap 4 via min(1+4,argc))
- "q = Quad Damage, p = Pentagram of Protection, r = Ring of Shadows, s = Biosuit" -> items.c:111-114 `((int)self->s.v.items & IT_INVISIBILITY) && !cvar("k_pow_r")` / `IT_INVULNERABILITY && !k_pow_p` / `IT_SUIT && !k_pow_s` / `IT_QUAD && !k_pow_q` (and items.c:2036-2039 identical) -> MATCH (mapping enforced at powerup spawn-gating, not just redtext display)
- "the global powerups-on state is then set on if at least one type is enabled and off if all are disabled" -> commands.c:2839-2843 `if (changed) { cvar_fset("k_pow", (cvar("k_pow_q") || cvar("k_pow_p") || cvar("k_pow_r") || cvar("k_pow_s"))); }` -> MATCH (exact OR-fold)
- "The command has no effect while a match is in progress" -> commands.c:2782-2785 `if (match_in_progress) { return; }` -> MATCH (explicit branch on feature path)
- "powerups are reported disabled (no change) when the Instagib or Midair mode is active" -> commands.c:2787-2792 `if (cvar("k_instagib")) { G_bprint(... "%s are disabled with Instagib" ...); return; }` + commands.c:2794-2799 `if (cvar("k_midair")) { ... "disabled with Midair"; return; }` -> MATCH (explicit branches on feature path; "no change" = early return before any cvar_fset)
WI-2: n/a

RESULT | ktx:command:practice | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Toggle, broadcast strings, leave-practice map reload, match/lock/forcestart-idlebot refusals, full allow_toggle_practice switch (0/1-2/3-4/5/default) -- every clause enforced on TogglePractice/SetPractice own path.
### ktx:command:practice
- "Toggles the server between practice mode and normal mode" -> commands.c:4974 `SetPractice(!k_practice, "")`; SetPractice commands.c:4893 `k_practice = srv_practice_mode;` -> MATCH
- "Switching modes broadcasts \"Server in practice mode\" or \"Server in normal mode\"" -> commands.c:4898 `G_bprint(2, "%s\n", redtext("Server in practice mode"));` / commands.c:4902 `G_bprint(2, "%s\n", redtext("Server in normal mode"));` -> MATCH
- "leaving practice mode reloads the current map" -> commands.c:4900-4907 else(!k_practice) branch `if (map) { changelevel((strnull(map) ? mapname : map)); }`; called with "" (4974) -> strnull true -> changelevel(mapname) -> MATCH
- "The command is refused while a match is in progress" -> commands.c:4916-4919 `if (match_in_progress) { return; }` -> MATCH (explicit branch on feature path)
- "while a forcestart or idlebot is active" -> commands.c:4929-4932 `if (k_force || find(world, FOFCLSN, "idlebot")) { return; // cmon, no practice if forcestart or idlebot active }`; k_force = globals.c:32 `float k_force; // used in forcing matchstart`, set 1 admin.c:691 -> MATCH (explicit branch on feature path)
- "when the server is locked in its current mode (cvar lock_practice = 2, or any value other than 0/1)" -> commands.c:4921-4927 `if ((lock_practice == 2) /* server locked in current practice mode */ || ((lock_practice != 0) && (lock_practice != 1))) { G_sprint(self, 3, "console: command is locked\n"); return; }` -> MATCH (exact)
- "Who may run it is gated by cvar allow_toggle_practice: 0 = no one; 1 or 2 = admins only; 3 or 4 = admins only (judges path not implemented, falls back to admin); 5 = all players; any other value = command skipped as misconfigured" -> commands.c:4940 switch: case 0 -> "no one" return (4942-4944); case 1/2 -> `if (!is_adm(self)) { "you must be an admin"; return; }` (4946-4953); case 3/4 -> `if (!is_adm(self)) { "judges is not implemented in this mode"; "you must be an admin"; return; }` (4955-4963); case 5 -> break (4965-4966); default -> "server is misconfigured, command skipped" return (4968-4970) -> MATCH (every sub-clause maps; access-class verified vs handler's actual is_adm check, not flag name)
WI-2: n/a (access gating is via allow_toggle_practice cvar in-handler, fully traced; CF_SPC_ADMIN table flag consistent -- spectator caller also needs admin)

RESULT | ktx:command:qlag | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=5 | Bit-8 XOR toggle / re-broadcast / announce / match-in-progress all enforced, but "clients are restricted from QiZmo lag-related settings" has NO KTX enforcing line -- KTX only sets+announces the fpd bit; the restriction is enforced by the external QiZmo proxy. fpd&8 is read in KTX only in display/status strings.
### ktx:command:qlag
- "Toggles the FPD \"lag settings\" restriction on or off by flipping bit 8 (value 8) of the server's fpd serverinfo key" -> commands.c:3688 `int fpd = iKey(world, "fpd");` + commands.c:3695 `fpd ^= 8;` -> MATCH ("(value 8)" disambiguates to numeric 8; matches `^= 8`)
- "and re-broadcasting it" -> commands.c:3697 `localcmd("serverinfo fpd %d\n", fpd);` -> MATCH (rewrites the fpd serverinfo key = re-broadcast)
- "When the bit is set, clients are restricted from using the QiZmo proxy's lag-related settings" -> commands.c:3699-3700 announce string `redtext("QiZmo lag settings")`; commands.c:2019 `G_sprint(... redtext("QiZmo lag"), OnOff(i & 8))` (settings-summary); match.c:2125-2140 `if (i & 8) strlcat(buf, " lag", ...)` then `G_bprint(2, "QiZmo:%s disabled\n", ...)` (status print, comment "print qizmo ( FPD ) settings") -> UNTRACEABLE (no KTX code path restricts client lag-settings on `fpd & 8`; the only KTX reads of fpd&8 are announce/summary/status STRINGS; the actual restriction is enforced by the external QiZmo proxy / client, outside KTX source -- clause is true but came from the announce/redtext string + FPD domain knowledge, no enforcing read-site on the feature path)
- "the result is announced to all players as \"QiZmo lag settings in effect\" or \"not in effect\"" -> commands.c:3699-3700 `G_bprint(2, "%s %s\n", redtext("QiZmo lag settings"), ((fpd & 8) ? "in effect" : "not in effect"));` -> MATCH (G_bprint level 2 = all players)
- "Has no effect while a match is in progress" -> commands.c:3690-3693 `if (match_in_progress) { return; }` -> MATCH (explicit branch on feature path)
WI-2: n/a


## Wave 06 -- batch rows (canary ktx:cvar:k_yawnmode EXCLUDED -- F-V2 control: TRACED-CLEAN over-flag control held)

RESULT | ktx:command:ra_break | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Queue-toggle, 5-min-break-via-idletime+MAXIDLETIME, RA-active + not-winner + not-loser guard, CF_PLAYER all enforced on the handler's own path.
### ktx:command:ra_break
- "toggles the calling player's position in the arena waiting queue (in queue -> takes out; not in -> puts back in)" -> arena.c:818-831 `if (ra_isin_que(self)) // take OUT of line {...ra_out_que(self);} else // put INTO line {...ra_in_que(self);}` -> MATCH (ra_isin_que arena.c:88-106 scans ra_que[]; ra_out_que/ra_in_que arena.c:30-85 add/remove)
- "grants up to a 5-minute break (idle timeout extended) when taken out of queue" -> arena.c:824 `self->idletime = g_globalvars.time + MAXIDLETIME;` -> MATCH (MAXIDLETIME = 300 = 5 min, g_consts.h:300 `#define MAXIDLETIME (300) //5 minutes`; message arena.c:820 "You can have up to a 5 minute break")
- "running it again puts them back into the queue" -> arena.c:827-831 `else // put INTO line { self->idletime = 0; ra_in_que(self); }` -> MATCH (toggle inversion verified by ra_isin_que branch)
- "ignored unless Rocket Arena mode is active" -> arena.c:813 `if (!isRA() || ...) { return; }` -> MATCH (isRA() arena.c:130-133 `return (isDuel() && cvar("k_rocketarena"));` -- branch on the handler's own path)
- "caller is neither the current round's winner ... nor a loser awaiting their turn" -> arena.c:813 `if (!isRA() || isWinner(self) || isLoser(self)) { return; }` -> MATCH (isWinner arena.c:135-138 `p->ra_pt == raWinner`; isLoser arena.c:140-143 `p->ra_pt == raLoser`; explicit branch on handler path)
- "Rocket Arena command (player-class)" -> commands.c:969 `{ "ra_break", ra_break, 0, CF_PLAYER, CD_RA_BREAK }` -> MATCH (CF_PLAYER 1<<0 g_local.h:647; DoCommand commands.c:1106 player path requires CF_PLAYER; no admin flag so no admin gate)
- "command name ra_break dispatched by KTX mod table" -> commands.c:969 table entry + DoCommand commands.c:1069-1142 -> MATCH
WI-2: n/a (no default-value clause; access-class CF_PLAYER verified vs table flag + dispatch boolean)
---
RESULT | ktx:command:race_break_all | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Unready-all + broadcast + race-mode gate + admin all enforced on r_all_break's own path; "preconditions not met" is traceable still-true vagueness over the single isRACE() check race_command_checks() enforces (brief L119-120), not a name/string/structural inference.
### ktx:command:race_break_all
- "forces every racer to stop -- clears the ready state of all racers" -> race.c:3206 `race_unready_all();` -> MATCH (race_unready_all race.c:541-549 loops find_plr and sets `p->race_ready = 0;` for every player)
- "broadcasts \"<name> has forced the race to stop\" to everyone" -> race.c:3207 `G_bprint(2, "%s has %s the race to stop\n", self->netname, redtext("forced"));` -> MATCH (G_bprint = broadcast; redtext("forced") yields the literal "forced")
- "Has no effect when the race-mode command preconditions are not met" -> race.c:3201-3204 `if (!race_command_checks()) { return; }` -> MATCH-as-narrowed: race_command_checks() race.c:2951-2962 tests ONLY `if (!isRACE())`. The single enforced precondition is the race-mode check; "preconditions" (plural/general) is broader than the one condition on the path but remains true and was traceable -- acceptable vagueness, not a defect
- "Requires admin privileges" -> commands.c:1006 `{ "race_break_all", r_all_break, 0, CF_BOTH_ADMIN, CD_RBREAKALL }` -> MATCH (CF_BOTH_ADMIN = CF_PLR_ADMIN|CF_SPC_ADMIN g_local.h:652; DoCommand commands.c:1096 spec path `(CF_SPC_ADMIN) && !is_adm -> denied` and 1111 player path `(CF_PLR_ADMIN) && !is_adm -> denied`; admin enforced for both classes)
- "Admin command for race mode" -> race.c:3201 race_command_checks (isRACE gate) + commands.c:1006 CF_BOTH_ADMIN -> MATCH
WI-2: n/a (admin access-class verified vs CF_BOTH_ADMIN table flag AND dispatch is_adm() checks both paths; no default-value clause)
NOTE: "preconditions not met" classified TRACED-CLEAN -- the clause has a located enforcing line on the handler's own path (race.c:3201 race_command_checks, which tests isRACE()). Plural "preconditions" is generous wording but the single condition that exists is fully traced and the clause is true; this is traceable still-true minor vagueness (brief L119-120), NOT a name/enum/string/comment/structural-side-effect inference (the C-NEAR-MISS bar, brief L122-124).
---
RESULT | ktx:command:race_route_switch | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Cycle+wrap, hide-spawns+cleanmap, no-routes msg, load-fail msg, server-side configured-route branch (ct!=ctPlayer && mapname match), isRACE gate, refused while race in progress -- every clause on r_route's own path.
### ktx:command:race_route_switch
- "Cycles to the next predefined route, wrapping back to the first after the last" -> race.c:3354 `next_route++;` then race.c:3357-3360 `if ((next_route < 0) || (next_route >= race.cnt)) { next_route = 0; }` -> MATCH (increment + modulo-style wrap to 0 at race.cnt)
- "Hides spawn points and resets the map first" -> race.c:3337-3338 `HideSpawnPoints(); race_cleanmap();` -> MATCH (called before route logic)
- "prints 'No routes defined for this map' if the map has none" -> race.c:3340-3345 `if (race.cnt < 1) { G_sprint(self, 2, "No routes defined for this map\n"); return; }` -> MATCH (exact string)
- "an error if the route fails to load" -> race.c:3362-3377 `if (!race_load_route(next_route)) { ... G_bprint(2, "Failed to load route %d by %s\n"/"Server failed to load route %d\n" ...); return; }` -> MATCH (error broadcast on load failure)
- "When run from a server-side context whose configured route-map name matches the current map, it loads that configured route number instead of advancing" -> race.c:3348-3351 `if ((self->ct != ctPlayer) && streq(cvar_string(RACE_ROUTE_MAPNAME_CVAR), mapname)) { next_route = cvar(RACE_ROUTE_NUMBER_CVAR); } else { next_route++; }` -> MATCH (ct!=ctPlayer = server-side; RACE_ROUTE_MAPNAME_CVAR string == mapname; loads RACE_ROUTE_NUMBER_CVAR instead of ++ -- explicit branch on r_route's path)
- "Only works in race mode" -> race.c:3327-3330 `if (!race_command_checks()) { return; }` -> MATCH (race_command_checks race.c:2953 `if (!isRACE())` returns false -- branch on this handler's path)
- "refused while a race run is in progress" -> race.c:3332-3335 `if (race_is_started()) { return; }` -> MATCH (race_is_started race.c:2964-2978 `if (race.status)` true -> "Can't use that command while race is in progress" + return; explicit branch)
- "command race_route_switch (player + spectator-admin)" -> commands.c:1020 `{ "race_route_switch", r_route, 0, CF_PLAYER | CF_SPC_ADMIN, CD_R_ROUTE }` -> MATCH (CF_PLAYER player path commands.c:1106; CF_SPC_ADMIN promotes to CF_SPECTATOR commands.c:1448-1451 and requires is_adm for specs commands.c:1096)
WI-2: n/a (no default-value clause; access-class consistent with table flag + dispatch)
---
RESULT | ktx:command:race_scoring | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Cycle k_race_scoring_system + announce, exact 3-system order Win Only/Scaled/Formula1 from scoring_systems[], wrap via %NUM, isRACE gate, refused while race-started OR match_in_progress -- all on race_scoring_system_toggle's own path.
### ktx:command:race_scoring
- "Cycles the race match scoring system to the next one (the k_race_scoring_system cvar)" -> race.c:5178-5179 `current = (current + 1) % NUM_SCORING_SYSTEMS; cvar_fset(RACE_SCORINGSYSTEM_CVAR, current);` -> MATCH (RACE_SCORINGSYSTEM_CVAR = "k_race_scoring_system" race.c:28; current seeded from cvar at race.c:5166)
- "announces the newly active system" -> race.c:5180-5181 `G_bprint(PRINT_HIGH, "%s enabled the \20%s\21 scoring system\n", self->netname, scoring_systems[current].name);` -> MATCH (broadcast of scoring_systems[current].name after increment)
- "systems in order: 'Win Only', 'Scaled', 'Formula1'" -> race.c:5148-5160 `static race_score_system_t scoring_systems[] = { { "Win Only", ... }, { "Scaled", ... }, { "Formula1", ... } };` -> MATCH (exact names, exact array order indices 0/1/2)
- "'Win Only' = 1 point for the winner only" -> race.c:5151-5152 `{ "Win Only", { 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 }, 0, 0, 0, 1 }` -> MATCH (positions[0]=1 i.e. 1st place 1pt, complete=0 beating=0 -- winner-only)
- "'Scaled' = points for completing plus per-opponent-beaten plus a winner bonus" -> race.c:5155-5156 `{ "Scaled", { 1, 0, ... }, 1, 1, 0, 3 }` + race.c:5201-5206 `points = system->complete; ... points += (participants - position) * system->beating;` -> MATCH (complete=1, beating=1, positions[0]=1 winner bonus; struct fields named complete/beating, race.c:5141-5142)
- "'Formula1' = Formula-1 style points allocated by finishing position" -> race.c:5158-5159 `{ "Formula1", { 25, 18, 15, 12, 10, 8, 6, 4, 2, 1 }, 0, 0, 0, 25 }` + race.c:5203 `points += system->positions[position - 1];` -> MATCH (25/18/15... F1 ladder by position)
- "wraps from the last back to the first" -> race.c:5178 `current = (current + 1) % NUM_SCORING_SYSTEMS;` -> MATCH (modulo NUM_SCORING_SYSTEMS race.c:5162 = array length 3)
- "Only works in race mode and is refused while a race run is in progress or a match is in progress" -> race.c:5168-5176 `if (!race_command_checks()) { return; } if (race_is_started() || match_in_progress) { return; }` -> MATCH (race_command_checks isRACE gate race.c:2953; race_is_started race.c:2966 `race.status`; `match_in_progress` global -- all three explicitly tested on this handler's path)
WI-2: n/a (no default-value clause asserted in description; cvar identity verified)
---
RESULT | ktx:command:race_show_lineup | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Numbered list of race_ready players, racer-flag marker for actively-racing, "(Empty)" when none, race-mode gate, CF_BOTH = players + spectators -- all on race_display_line's own path.
### ktx:command:race_show_lineup
- "Prints to the caller a numbered list of every player currently marked race-ready" -> race.c:1899-1912 `for (p = world; (p = find_plr(p));) { if (p->race_ready) { i++; ... G_sprint(self, 2, "%2d ... %s\n", i, p->netname); } }` -> MATCH (iterates players, filters p->race_ready, numbered via incrementing i, printed to self=caller)
- "players who are actively racing at that moment are flagged with a distinct marker" -> race.c:1904-1911 `if (p->racer) { G_sprint(self, 2, "%2d \215 %s\n", i, p->netname); } else { G_sprint(self, 2, "%2d   %s\n", i, p->netname); }` -> MATCH (p->racer true -> char \215 marker glyph; false -> blank spaces -- distinct marker for active racers)
- "Prints \"(Empty)\" when no player is ready" -> race.c:1915-1918 `if (!i) { G_sprint(self, 2, "    (Empty)    \n"); }` -> MATCH (i never incremented => no race_ready player => "(Empty)")
- "Race-mode query command" -> race.c:1892-1895 `if (!race_command_checks()) { return; }` -> MATCH (race_command_checks isRACE gate race.c:2953 -- branch on this handler's path; query = read-only G_sprint, no state mutation in body)
- "players and spectators" -> commands.c:1009 `{ "race_show_lineup", race_display_line, 0, CF_BOTH, CD_RLINEUP }` -> MATCH (CF_BOTH = CF_PLAYER|CF_SPECTATOR g_local.h:649; DoCommand spec path commands.c:1091 requires CF_SPECTATOR, player path commands.c:1106 requires CF_PLAYER -- both satisfied, no admin flag)
WI-2: n/a (access-class CF_BOTH verified vs table flag + dispatch boolean on both class paths; no default clause)
---

## Wave 07 -- batch rows (canary ktx:command:autotrack EXCLUDED -- F-V2 control: C-FIX confirmed)

RESULT | ktx:command:ready | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | Every clause (ready set, countdown, race-ready, auto-xonx desire/balance, and all 5 reject cases) maps verbatim to PlayerReady in match.c.
### ktx:command:ready
- "Marks the calling player as ready to start the match" -> src/match.c:2864 `self->ready = 1;` -> MATCH
- "once enough players are ready the match countdown begins" -> src/match.c:2909 `if (nready != k_attendees) { ... return; }` then :2922 `if (nready < 2) return;` then :2957 `StartTimer();` (G_bprint "Timer started" :2954) -> MATCH (minor vagueness "enough" vs all-ready-and-ge-2; traceable, still-true)
- "In race mode (non-match) it instead readies you for the race" -> src/match.c:2756-2761 `if (isRACE() && !race_match_mode()) { r_changestatus(1); // race_ready; return; }` -> MATCH
- "For an auto-xonx spectator it broadcasts your 'desire to play'" -> src/match.c:2763-2785 `if (self->ct == ctSpec && !isRACE()) { if (!cvar("k_auto_xonx") || k_matchLess) {...return;} ... self->ready = 1; for (...) G_sprint(p, 2, "%s %s to play\n", self->netname, redtext("desire")); }` -> MATCH
- "and triggers team balancing rather than setting ready" -> src/match.c:2787 `CheckAutoXonX(g_globalvars.time < 10 ? true : false);` (then return, before the player-ready path) -> MATCH
- "rejected/no-ops when already ready ('Type break to unready yourself')" -> src/match.c:2804-2808 `if (self->ready) { G_sprint(self, 2, "Type break to unready yourself\n"); return; }` -> MATCH (verbatim string)
- "in practice mode" -> src/match.c:2797-2802 `if (k_practice && !isRACE()) { G_sprint(self, 2, "%s\n", redtext("Server in practice mode")); return; }` -> MATCH
- "during intermission/after the match" -> src/match.c:2792-2795 `if (intermission_running || (match_in_progress == 2) || match_over) { return; }` -> MATCH
- "in a private game when not logged in" -> src/match.c:2811-2816 `if (is_private_game() && !is_logged_in(self)) { G_sprint(self, 2, "You must login first\n"); return; }` -> MATCH
- "in CTF/HoonyTDM unless you are on the red or blue team" -> src/match.c:2818-2826 `if (isCTF() || isHoonyModeTDM()) { if (!streq(getteam(self), "red") && !streq(getteam(self), "blue")) { G_sprint(self, 2, "You must be on team red or blue\n"); return; } }` -> MATCH
WI-2: n/a

RESULT | ktx:command:rjfields:frogbot:editor | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Path-resolution, no-arg print, 3-arg set (atof/atof/atoi), and all 3 error cases map verbatim to FrogbotSetRocketJumpFields.
### ktx:command:rjfields:frogbot:editor
- "Bot path-editor command operating on the path from the saved marker to the marker nearest the editing player" -> src/bot_commands.c:2008-2009 `gedict_t *nearest = LocateMarker(self->s.v.origin); int source_to_target_path = FindPathIndex(saved_marker, nearest);` -> MATCH
- "rocket-jump-flagged path" -> src/bot_commands.c:2026-2031 `if (!(saved_marker->fb.paths[source_to_target_path].flags & ROCKET_JUMP)) { G_sprint(self, PRINT_HIGH, "Path is not flagged as a RJ\n"); return; }` -> MATCH (operation proceeds only on RJ-flagged path)
- "With no arguments it prints that path's current rocket-jump pitch, yaw, and delay" -> src/bot_commands.c:2033-2041 `if (trap_CmdArgc() == 2) { fb_path_t *path = ...; G_sprint(self, PRINT_HIGH, "Current fields: pitch %3.1f, yaw %3.1f, delay %d\n", path->rj_pitch, path->rj_yaw, path->rj_delay); return; }` -> MATCH (argc==2 = cmd+subcmd, no extra args)
- "Given three arguments <pitch> <yaw> <delay> it sets those fields (pitch and yaw as floats, delay as an integer)" -> src/bot_commands.c:2043-2055 `if (trap_CmdArgc() < 5) {...return;}` ; `rj_pitch = atof(param)` :2051, `rj_yaw = atof(param)` :2053, `rj_delay = atoi(param)` :2055 -> MATCH (atof=float x2, atoi=int)
- "Errors if there is no nearby marker" -> src/bot_commands.c:2012-2017 `if (nearest == NULL) { G_sprint(self, PRINT_HIGH, "No marker nearby\n"); return; }` -> MATCH
- "no linked path" -> src/bot_commands.c:2019-2024 `if (source_to_target_path < 0) { G_sprint(self, PRINT_HIGH, "No linked path found\n"); return; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:roundsdown | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | -2/round, min-2 clamp, broadcast, hoonymode-only guard and no-match-in-progress guard all map to HM_roundsdown / HM_rounds_adjust.
### ktx:command:roundsdown
- "Decreases the HoonyMode round limit (cvar k_hoonyrounds) by 2 rounds" -> src/hoonymode.c:1247 `HM_rounds_adjust(-1);` ; :1125 `int new_rounds = bound(2, HM_rounds() + change * 2, 20);` (change=-1 -> -2) ; :1127 `cvar_fset("k_hoonyrounds", new_rounds);` -> MATCH
- "clamped to a minimum of 2" -> src/hoonymode.c:1125 `bound(2, HM_rounds() + change * 2, 20)` (lower bound 2) -> MATCH
- "and broadcasts the new round limit" -> src/hoonymode.c:1135 `G_bprint(2, "%s %s\n", redtext("Roundlimit set to"), dig3(new_rounds));` (broadcast on change; unchanged path is G_sprint-to-caller "still") -> MATCH
- "Only works in a HoonyMode game" -> src/hoonymode.c:1241-1243 `if (!isHoonyModeAny()) { G_sprint(self, PRINT_HIGH, "Command only available in hoonymode\n"); }` (adjust only in the else branch) -> MATCH
- "and only when no match is in progress" -> src/hoonymode.c:1245-1247 `else if (!match_in_progress) { HM_rounds_adjust(-1); }` -> MATCH (real branch on the feature's own path testing match state)
- "in any other mode it tells the caller the command is HoonyMode-only" -> src/hoonymode.c:1243 `G_sprint(self, PRINT_HIGH, "Command only available in hoonymode\n");` -> MATCH (semantically identical to "HoonyMode-only")
WI-2: n/a

RESULT | ktx:command:sh_speed | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | KF_SPEED=64 flip via stuffed cmd-info-kf, on/off report, and the exact prewar mode-exclusion list overwriting HUD stat fields from velocity all verified.
### ktx:command:sh_speed
- "Toggles the per-player prewar speed display for the issuing client / Takes no arguments" -> src/commands.c:6622-6625 `void Sh_Speed(void) { stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd info kf %d\n", (iKey(self, "kf") ^ KF_SPEED)); }` (operates on self, reads no argv) -> MATCH
- "It flips the KF_SPEED bit (value 64)" -> src/commands.c:6624 `(iKey(self, "kf") ^ KF_SPEED)` (XOR = flip) ; src/g_consts.h:251 `#define KF_SPEED (  64) // show speed in prewar` -> MATCH (value 64 verified at #define)
- "in the client's 'kf' user-info flags via a stuffed 'cmd info kf' update" -> src/commands.c:6624 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd info kf %d\n", ...)` -> MATCH
- "and reports 'showing speed in prewar: on/off'" -> src/g_utils.c:2559 `ev_print(p, new_ev, old_ev, KF_SPEED, "showing speed in prewar: ");` ; src/g_utils.c:2528-2536 `void ev_print(...) { if ((on = (new_ev & bit)) != (old_ev & bit)) G_sprint(p, 2, "%s%s\n", msg, OnOff(on)); }` -> MATCH
- "While the bit is set and the server is in prewar (not during a match, match-over, captain-pick, matchless or hoony modes)" -> src/client.c:4580 `if (!match_in_progress && !match_over && !k_captains && !k_matchLess && !isHoonyModeAny())` then :4582 `if (iKey(self, "kf") & KF_SPEED)` -> MATCH (exclusion list verbatim, real branch on the per-frame feature path)
- "the player's HUD stat fields (armor, frags, ammo counts) are overwritten each frame with an encoding of current movement velocity" -> src/client.c:4584-4591 `self->s.v.armorvalue = ...; self->s.v.frags = (int)(velocity)/1000; self->s.v.ammo_shells/nails/rockets/cells = 100 + ...velocity_vert_abs...` (velocity from :4576-4578) -> MATCH
- "so the standard HUD numbers read out running speed during warmup" -> consequence of overwriting armorvalue/frags/ammo_* (the displayed stats) at src/client.c:4586-4591 -> MATCH
- "Has no effect once a match is in progress" -> src/client.c:4580 `!match_in_progress` term gates the whole overwrite block -> MATCH (real branch on feature path)
WI-2: n/a

RESULT | ktx:command:spawn | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | Cycle+broadcast, all six respawn-model names (-1..4) verbatim, past-4-wraps-to--1, and match-in-progress no-op all map to ToggleRespawns / respawn_model_name.
### ktx:command:spawn
- "Cycles the server's respawn model and broadcasts the new model's name" -> src/commands.c:2685-2692 `if (++k_spw > 4) k_spw = -1; cvar_fset("k_spw", k_spw); G_bprint(2, "%s\n", respawn_model_name(k_spw));` (G_bprint = broadcast) -> MATCH
- "-1 = pre-qtest nonrandom respawns" -> src/g_utils.c:2667-2668 `case -1: return "pre-qtest nonrandom respawns";` -> MATCH
- "0 = Normal QW respawns" -> src/g_utils.c:2670-2671 `case 0: return "Normal QW respawns";` -> MATCH
- "1 = KT SpawnSafety" -> src/g_utils.c:2673-2674 `case 1: return "KT SpawnSafety";` -> MATCH
- "2 = Kombat Teams respawns" -> src/g_utils.c:2676-2677 `case 2: return "Kombat Teams respawns";` -> MATCH
- "3 = KTX respawns" -> src/g_utils.c:2679-2680 `case 3: return "KTX respawns";` -> MATCH
- "4 = KTX2 respawns" -> src/g_utils.c:2682-2683 `case 4: return "KTX2 respawns";` -> MATCH
- "Advancing past 4 wraps back to -1" -> src/commands.c:2685-2688 `if (++k_spw > 4) { k_spw = -1; }` -> MATCH
- "Has no effect while a match is in progress" -> src/commands.c:2680-2683 `if (match_in_progress) { return; }` (before any mutation; real branch on the feature's own path) -> MATCH
WI-2: n/a

## Wave 08 -- batch rows (canary ktx:cvar:k_teamoverlay EXCLUDED -- F-V2 control: C-NEAR-MISS confirmed)

# KTX D7 V-pass -- w08 read-only classification

Source oracle: /tmp/ktx-src-67253dc9 @ 67253dc9ab4f643f1e6523a923a41caab9ea587f == 1.47-2-g67253dc (verified this task).
Rows: 6 (5 command, 1 cvar). All traced independently, identical rigor.

RESULT | ktx:command:stats | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | match-finished guard, per-team frags/rank/friendkills/effi, CTF net-of-captures, isRA() delegation all enforced; "Race Arena" is the Rocket Arena (k_rocketarena) -- still-true minor name vagueness, behavior+delegate traced.
### ktx:command:stats
- "Prints end-of-match player statistics to the requesting player" -> commands.c:3573,3591 `G_sprint(self, 2, "no game - no statistics\n");` / `G_sprint(self, 2, "%s:\n"..., redtext("Player statistics")...)` -> MATCH (output target is self = requesting player; PRINT_HIGH=2)
- "Only works after a match has finished (match_in_progress == 2); otherwise it replies \"no game - no statistics\"" -> commands.c:3571-3575 `if (match_in_progress != 2) { G_sprint(self, 2, "no game - no statistics\n"); return; }` -> MATCH (exact: != 2 guard + exact reply string)
- "For each player, grouped by team, it lists name, frags, rank (frags minus deaths)" -> commands.c:3600-3641 `for (p ...) { ... for (p2 ...) { if (... strneq(tmp, getteam(p2))) continue; ... G_sprint(self,2,"%.10s ",p2->netname); ... "%d", (int)p2->s.v.frags ... "%d", (int)(p2->s.v.frags - p2->deaths) ... }` -> MATCH (same-team grouping via strneq(getteam); name; frags; rank = frags - deaths)
- "in team modes -- friendly kills" -> commands.c:3643-3647 `if (isTeam()) { stats = va("%d", (int)p2->friendly); G_sprint(self, 2, "%2s ", stats); }` -> MATCH (friendkills column gated on isTeam())
- "plus an efficiency column" -> commands.c:3663-3674 `if (p2->s.v.frags < 1) p2->efficiency = 0; else p2->efficiency = p2->s.v.frags / (p2->s.v.frags + p2->deaths) * 100; ... G_sprint(self, 2, "\217 %5s%%\n", stats);` -> MATCH (efficiency column always printed)
- "In CTF the frag-based columns are computed net of capture points" -> commands.c:3631-3640,3651-3658 `(!isCTF() ? (int)p2->s.v.frags : (int)(p2->s.v.frags - p2->ps.ctf_points))` and rank / effi likewise subtract ctf_points -> MATCH (frags, rank and efficiency all net of ctf_points in CTF)
- "In Race Arena modes it instead delegates to the Race Arena stats output" -> commands.c:3564-3569 `if (isRA()) { ra_PlayerStats(); return; }` ; isRA def arena.c:130-133 `return (isDuel() && cvar("k_rocketarena"));` -> MATCH on behavior (delegates to ra_PlayerStats and returns); name "Race Arena" is actually Rocket Arena (k_rocketarena) -- minor still-true name vagueness, the delegate function/branch are exactly traced
WI-2: n/a (no default-value clause; access class CF_BOTH|CF_MATCHLESS consistent with "requesting player" + works without match -- not asserted as a metadata class in the text)

RESULT | ktx:command:status2 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | every settings line (spw model / server mode 5-way / lockmode off-team-all / CTF hook-runes-ga / outside-match teaminfo / always spectalk / overtime 5-way) maps to an enforcing G_sprint branch in ModStatus2.
### ktx:command:status2
- "Prints the second page of current server settings to the requesting player: the respawn model name" -> commands.c:1937 `G_sprint(self, 2, "%s\n", redtext(respawn_model_name(cvar("k_spw"))));` -> MATCH (self = requesting player; respawn model from k_spw)
- "the server game mode (duel / FFA / CTF / team / unknown)" -> commands.c:1939-1976 `if (isDuel()) ... "duel" ... else if (isFFA()) ... "FFA" ... else if (isCTF()) ... "CTF" ... else if (isTeam()) ... "team" ... else ... "unknown"` -> MATCH (exactly these 5 strings)
- "in CTF or team modes -- the server-locking mode (off / team / all)" -> commands.c:1955-1958 (CTF) & 1970-1973 (team) `(!cvar("k_lockmode") ? "off" : (cvar("k_lockmode") == 2 ? "all" : (cvar("k_lockmode") == 1 ? "team" : "unknown")))` -> MATCH (off/team/all named; printed only in CTF and team branches; "unknown" fallback unnamed but the three asserted are exact)
- "In CTF it additionally shows hook, runes and grappling-allowed states" -> commands.c:1959-1960 `G_sprint(self, 2, "%s: hook %s, runes %s, ga %s\n", redtext("CTF settings"), OnOff(cvar("k_ctf_hook")), OnOff(cvar("k_ctf_runes")), OnOff(cvar("k_ctf_ga")));` -> MATCH (ga = grapple-allowed, k_ctf_ga; only inside isCTF() branch)
- "Outside a match it shows team-count info (current / min / max teams)" -> commands.c:1978-1983 `if (!match_in_progress) { G_sprint(self, 2, "...(%s: %d %s: %d %s: %d)\n", redtext("Teaminfo"), redtext("cur"), (int)CountRTeams(), redtext("min"), (int)cvar("k_lockmin"), redtext("max"), (int)cvar("k_lockmax")); }` -> MATCH (gated on !match_in_progress; cur/min/max)
- "It always shows spectalk on/off" -> commands.c:1985 `G_sprint(self, 2, "%s: %s\n", redtext("Spectalk"), OnOff(cvar("k_spectalk")));` -> MATCH (unconditional, after all mode branches)
- "the configured overtime setting (off / N-minute / sudden death / tie-break / golden frag)" -> commands.c:1988-2015 `switch ((int)cvar("k_overtime")) { case 0: ot="off"; case 1: ot=va("%d minute%s", i, count_s(i)); case 2: ot="sudden death"; case 3: ot=va("%d tie-break", tiecount()); case SD_GOLDEN_FRAG: ot=va("golden frag"); } ... G_sprint(self, 2, "%s: %s\n", redtext("Overtime"), ot);` -> MATCH (5 named states map 1:1; i = k_exttime drives the N in "N-minute")
- "to the requesting player" (access/target) -> commands.c table 711 `{ "status2", ModStatus2, 0, CF_BOTH | CF_MATCHLESS, CD_STATUS2 }` + all output via G_sprint(self,...) -> MATCH (every print to self)
WI-2: n/a (no Default-X clause; CF_BOTH|CF_MATCHLESS consistent with "requesting player, works outside match", not asserted as a class)

RESULT | ktx:command:teleteam | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | flips k_tp_tele_death 0<->1, on=affects-frags / off=not, G_bprint broadcast, explicit `if (match_in_progress) return;` on this command's own path.
### ktx:command:teleteam
- "Toggles whether telefragging a teammate counts toward frags ... It flips the k_tp_tele_death cvar between 0 and 1" -> commands.c:7997,8004,8013 `int k_tp_tele_death = bound(0, cvar("k_tp_tele_death"), 1);` / `if ((k_tp_tele_death = (k_tp_tele_death ? 0 : 1)))` / `cvar_fset("k_tp_tele_death", k_tp_tele_death);` -> MATCH (read bounded 0..1, flipped via ?0:1, written back)
- "when turned on, team telefrags affect the frag score" -> commands.c:8004-8007 `if ((k_tp_tele_death = (k_tp_tele_death ? 0 : 1))) { G_bprint(2, "%s turn teamtelefrag %s\n", self->netname, redtext("affects frags")); }` -> MATCH (truthy branch = "affects frags")
- "when turned off ... do not affect frags" -> commands.c:8008-8011 `else { G_bprint(2, "%s turn teamtelefrag does %s\n", self->netname, redtext("not affect frags")); }` -> MATCH (false branch = "not affect frags")
- "The change is broadcast to all players. The command is ignored while a match is in progress." -> commands.c:7999-8002 `if (match_in_progress) { return; }` ; broadcast via commands.c:8006/8010 `G_bprint(2, ...)` -> MATCH (G_bprint = broadcast print; explicit match_in_progress guard BEFORE the flip, on teleteam's own path)
WI-2: n/a (no default-value clause; access CF_PLAYER|CF_SPC_ADMIN not asserted in text)

RESULT | ktx:command:timeup1 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | table passes t=1.0f -> else-branch `timelimit += t` (+1), `bound(0, timelimit, cvar("k_timetop"))`, G_bprint announce, `if (match_in_progress) return;` on TimeUp's own path.
### ktx:command:timeup1
- "Increases the match time limit (the timelimit cvar) by 1 minute" -> commands.c:732 table `{ "timeup1", DEF(TimeUp), 1.0f, ... }` (t arg = 1.0f) -> commands.c:2986-3001 special cases require t==5; with t==1 falls to `else { timelimit += t; }` -> commands.c:3012 `cvar_fset("timelimit", (int)timelimit);` -> MATCH (timeup1 passes 1.0f; +1 then written to timelimit cvar)
- "announces the new length to all players" -> commands.c:3012-3014 `cvar_fset("timelimit", (int)timelimit); G_bprint(2, "%s %s %s%s\n", redtext("Match length set to"), dig3(timelimit), redtext("minute"), redtext(count_s(timelimit)));` -> MATCH (G_bprint = broadcast announce of new length)
- "The result is clamped to the range 0 to the k_timetop cvar" -> commands.c:3003 `timelimit = bound(0, timelimit, cvar("k_timetop"));` -> MATCH (exact lower 0, exact upper cvar("k_timetop"))
- "The command is ignored while a match is in progress" -> commands.c:2981-2984 `if (match_in_progress) { return; }` -> MATCH (explicit guard at top of TimeUp, before any timelimit change, on the command's own path)
WI-2: n/a (no default-value clause; access CF_PLAYER|CF_SPC_ADMIN not asserted in text)

RESULT | ktx:command:tkfjump | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | table passes j_type=1 -> cjt='f' -> cv_jt="k_disallow_kfjump"; flips via !cvar(cv_jt), G_bprint Enables(...) broadcast, `if (match_in_progress) return;` on t_jump's own path. "(kill-fjump)" is incidental name-gloss, token traced to jt="kfjump".
### ktx:command:tkfjump
- "Toggles whether the server allows kfjump (the kill-fjump trick action)" -> commands.c:831 table `{ "tkfjump", DEF(t_jump), 1, ... }` -> commands.c:5057,5064-5065 `cjt = j_type == 1 ? 'f' : 'r'; jt = va("k%cjump", cjt); cv_jt = va("k_disallow_k%cjump", cjt);` (j_type==1 => cjt='f' => jt="kfjump", cv_jt="k_disallow_kfjump") -> MATCH (toggles kfjump-disallow); "(the kill-fjump trick action)" is a name-derived parenthetical descriptor of what kfjump is -- not a behavioral clause; the kfjump token itself is traced at jt="kfjump" (commands.c:5064). Treated as still-true minor vagueness, not a material defect clause.
- "It flips the k_disallow_kfjump cvar" -> commands.c:5067 `trap_cvar_set_float(cv_jt, !cvar(cv_jt));` (cv_jt = "k_disallow_kfjump") -> MATCH (boolean flip via !cvar)
- "and broadcasts whether kfjump is now enabled or disabled for all players" -> commands.c:5068 `G_bprint(2, "%s %s %s\n", self->netname, redtext(Enables(!cvar(cv_jt))), redtext(jt));` -> MATCH (G_bprint = broadcast; Enables(!cvar(cv_jt)) = now-enabled/disabled state; jt="kfjump")
- "The command is ignored while a match is in progress" -> commands.c:5059-5062 `if (match_in_progress) { return; }` -> MATCH (explicit guard at top of t_jump, before the flip, on the command's own path)
WI-2: n/a (no default-value clause; access CF_BOTH_ADMIN not asserted in text)


## Wave 09 -- batch rows (canary ktx:cvar:k_yawnmode EXCLUDED -- F-V2 control: TRACED-CLEAN over-flag control held)

# KTX D7 V-pass -- batch w09 classifications

Source oracle: /tmp/ktx-src-67253dc9 @ 67253dc9 (git describe 1.47-2-g67253dc). All file:line cites grep/Read-verified in this task.

RESULT | ktx:command:+wp_stats | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Centerprint overlay, per-weapon hit/accuracy figures, spec-tracked target, "Tracking no one" string, paired -wp_stats: all enforced.
### ktx:command:+wp_stats
- "Turns on the on-screen weapon-stats overlay for the caller" -> src/commands.c:4988-4993 `void Wp_Stats(float on){ on--; self->wp_stats=(int)on; self->wp_stats_time=g_globalvars.time;}` ; table arg=2 src/commands.c:829 `{ "+wp_stats", DEF(Wp_Stats), 2, CF_BOTH|CF_MATCHLESS, ...}` (on--=1 -> wp_stats on) -> MATCH
- "a centerprint showing per-weapon ... figures" -> src/client.c:3208 `G_centerprint(self, "%s%s", buf, redtext("Tracking no one (+wp_stats)"));` (Print_Wp_Stats builds buf and centerprints) -> MATCH
- "axe direct hits" -> src/client.c:3175-3176 `#else /* just count of direct hits */ float axe = wps & S_AXE ? e->ps.wpn[wpAXE].hits : 0;` -> MATCH
- "shotgun/super-shotgun/nailgun/super-nailgun/lightning accuracy percentages" -> src/client.c:3178-3191 `float sg = ... 100.0 * e->ps.wpn[wpSG].hits / max(1, e->ps.wpn[wpSG].attacks) : 0;` (ssg/ng/sng identical form; lg 100.0*hits/attacks) -> MATCH
- "grenade and rocket direct-hit counts" -> src/client.c:3185-3187 `#else /* just count of direct hits */ float gl = wps & S_GL ? e->ps.wpn[wpGL].hits : 0; float rl = wps & S_RL ? max(0.001, e->ps.wpn[wpRL].hits) : 0;` -> MATCH
- "When spectating it shows the tracked player's stats" -> src/client.c:3170-3171 `gedict_t *g = self->ct == ctSpec ? PROG_TO_EDICT(self->s.v.goalentity) : NULL; gedict_t *e = self->ct == ctPlayer ? self : (g ? g : world);` (spec -> goalentity = tracked) -> MATCH
- "displays \"Tracking no one (+wp_stats)\" if no one is being tracked" -> src/client.c:3205-3208 `if ((e == world) || (e->ct != ctPlayer)){ G_centerprint(self,"%s%s",buf,redtext("Tracking no one (+wp_stats)"));}` -> MATCH
- "Paired with -wp_stats, which turns the overlay off" -> src/commands.c:830 `{ "-wp_stats", DEF(Wp_Stats), 1, CF_BOTH|CF_MATCHLESS, ...}` (arg=1 -> on--=0 -> wp_stats off, same Wp_Stats handler) -> MATCH
WI-2: n/a

RESULT | ktx:command:totmode | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Toggle+broadcast, dmm4-on-enable gate, midair/instagib forced off, ammo re-applied, rules-change gate: all enforced.
### ktx:command:totmode
- "Toggles 'Tribe of Tjernobyl' mode on or off" -> src/commands.c:7913,7936-7937 `qbool k_tot = cvar(TOT_MODE_VARIABLE) != 0; ... cvar_set(TOT_MODE_VARIABLE, k_tot?"1":"0"); cvar_toggle_msg(self, TOT_MODE_VARIABLE, ...)` ; cvar_toggle_msg sets i=!cvar (src/g_utils.c:2211,2218) -> net toggle -> MATCH
- "(and broadcasts the new state)" -> src/g_utils.c:2215 `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg);` -> MATCH
- "Enabling it requires deathmatch mode 4 (dmm4); the attempt is refused otherwise" -> src/commands.c:7920-7925 `if (!k_tot && (deathmatch != 4)){ G_sprint(self,2,"ToT mode requires dmm4\n"); return; }` (!k_tot = currently off = enabling) -> MATCH
- "Turning it on also forces midair mode and instagib off" -> src/commands.c:7927-7934 `if (cvar("k_midair")){ cvar_set("k_midair","0"); } if (cvar("k_instagib")){ cvar_set("k_instagib","0"); }` (runs after dmm4 gate; unconditional re both dirs, superset of on-case, still-true) -> MATCH
- "the player's current ammo is re-applied" -> src/commands.c:7939 `W_SetCurrentAmmo();` ; src/weapons.c:1737-1741 `void W_SetCurrentAmmo(void){ ... self->s.v.currentammo ...}` -> MATCH
- "Only takes effect when a rules change is currently allowed" -> src/commands.c:7915-7918 `if (!is_rules_change_allowed()){ return; }` ; src/commands.c:9033-9051 gates on match_in_progress / isRACE() -> MATCH
WI-2: n/a

RESULT | ktx:command:upplayers | WI2-FIX | flavourC=0 | wi2=1 | clauses=7 | Core raise-maxclients behavior correct; access-class clause "spectator-admin" is WRONG -- CF_SPC_ADMIN is inert without CF_SPECTATOR, dispatch rejects all specs.
### ktx:command:upplayers
- "Raises the server's maxclients (player-slot count) by one, up to k_maxclients" -> src/commands.c:8046,8053,8057-8059 `cl_count = bound(1, cvar(sv_max)+value, max(1,cvar(k_max))); cvar_fset(sv_max,cl_count);` with upplayers->ChangeClientsCount(type,1), type=1 -> sv_max="maxclients" k_max="k_maxclients" -> MATCH
- "Refused while a match is in progress" -> src/commands.c:8022-8025 `if (match_in_progress){ return; }` -> MATCH
- "when the caller lacks the k_allowcountchange permission" -> src/commands.c:8027-8030 `if (!check_perm(self, cvar("k_allowcountchange"))){ return; }` -> MATCH
- "when maxclients has already reached k_maxclients (prints \"maxclients reached\")" -> src/commands.c:8039-8044 `if ((cvar(sv_max) >= cvar(k_max)) && (value > 0)){ G_sprint(self,2,"%s reached\n",redtext(sv_max)); return; }` (sv_max="maxclients") -> MATCH
- "broadcasts that the caller set maxclients to the new value" -> src/commands.c:8054 `G_bprint(2, "%s set %s to %d\n", self->netname, redtext(sv_max), cl_count);` -> MATCH
- "No effect if the new value would equal the current one" -> src/commands.c:8048-8051 `if (cvar(sv_max) == cl_count){ return; }` -> MATCH
- "Player/spectator-admin command, no arguments" -> table src/commands.c:980 `{ "upplayers", DEF(upplayers), 1, CF_PLAYER | CF_SPC_ADMIN, ...}` -> dispatch src/commands.c:1088-1101 `if (spc){ if (!(cmds[icmd].cf_flags & CF_SPECTATOR)){ return DO_WRONG_CLASS; } if ((cmds[icmd].cf_flags & CF_SPC_ADMIN) && !is_adm(self)){...} }` ; CF defs g_local.h:647-651 CF_PLAYER=1<<0 CF_SPECTATOR=1<<1 CF_SPC_ADMIN=1<<3 -> flags lack CF_SPECTATOR so spec hits DO_WRONG_CLASS at :1093 BEFORE the CF_SPC_ADMIN check at :1096 (dead flag). No admin-spec bypass in DoCommand (src/commands.c:1069-1143). -> MISMATCH(spectator-admins cannot run it; command is player-only at dispatch; "no arguments" half is correct -- float arg is the table dispatch constant, not a user arg)
WI-2: access-class wrong. Asserted player + spectator-admin; dispatch boolean logic = player-only (CF_SPC_ADMIN inert without CF_SPECTATOR). Core behavior unaffected -> WI2-FIX, not flavour-C (real traced inversion, not a name/string inference).

RESULT | ktx:command:xonx | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=11 | Every preset value traced to the executed _XonX_um_init string + common reset runs first; trap_readcmd executes the string (G_readcmd syscall), not a config comment.
### ktx:command:xonx
- "Applies the XonX game-mode preset" -> src/commands.c:822 `{ "XonX", DEF(UserMode), 14, ...}` -> UserMode arg 14; um_list[13] src/commands.c:4550 `{ "XonX", "X on X", _XonX_um_init, UM_XONX, 0 }`; struct g_local.h:709-713 field3=initstring -> initstring=_XonX_um_init -> MATCH
- "an open-size team match with a high player cap" -> general framing, grounded in maxclients/k_maxclients 32 + team settings below -> MATCH (still-true vagueness, traceable)
- "Allows up to 32 players (maxclients/k_maxclients 32)" -> src/commands.c:4405-4406 `"maxclients 32\n" "k_maxclients 32\n"` -> MATCH
- "sets teamplay 2 (teammates and self can be damaged)" -> src/commands.c:4408 `"teamplay 2\n" // hurt teammates and yourself` -> MATCH
- "deathmatch 1 (base mode -- weapons do not stay on pickup)" -> src/commands.c:4409 `"deathmatch 1\n" // weapons wont stay on pickup` -> MATCH
- "enables powerups" -> src/commands.c:4410 `"k_pow 1\n" // use powerups` -> MATCH
- "requires 1 player minimum per team" -> src/commands.c:4411 `"k_membercount 1\n" // minimum number of players in each team` -> MATCH
- "and 1-2 teams" -> src/commands.c:4412-4413 `"k_lockmin 1\n" // minimum number of teams` `"k_lockmax 2\n" // maximum number of teams` -> MATCH
- "runs a 20-minute timelimit" -> src/commands.c:4407 `"timelimit 20\n" // 20 minute rounds` -> MATCH
- "with time-based 5-minute overtime" -> src/commands.c:4414-4415 `"k_overtime 1\n" // time based` `"k_exttime 5\n" // overtime 5mins` -> MATCH
- "sets the internal game mode to k_mode 2" -> src/commands.c:4416 `"k_mode 2\n"` -> MATCH
- "The shared common reset runs first" -> src/commands.c:4796-4800 `trap_readcmd(common_um_init, buf, ...); G_cprint(...); trap_readcmd(um_list[(int)umode].initstring, buf, ...);` (common_um_init at :4161 executed BEFORE mode initstring) ; trap_readcmd executes via syscall(G_readcmd,...) src/g_syscalls.c:176-178 -> MATCH
WI-2: n/a (registered values irrelevant -- preset is an executed command string, not a cvar default)

RESULT | ktx:cvar:allow_spec_wizard | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Single read-site GetSpecWizard enforces every clause incl. the match/intermission/race exclusion on the feature's own path; 0/1/2 cases exact.
### ktx:cvar:allow_spec_wizard
- "Controls whether spectators may become a flying \"wizard\" free-roaming camera" -> src/spectate.c:44-46 GetSpecWizard reads cvar; wizard entity spec-only src/spectate.c:198-201 `self->wizard=spawn(); self->wizard->classname="spectator_wizard"; self->wizard->think=(func_t)wizard_think;` -> MATCH
- "Value is clamped to 0-2" -> src/spectate.c:46 `int k_asw = bound(0, cvar("allow_spec_wizard"), 2);` -> MATCH
- "Wizards are always disabled while a match is in progress, during intermission, and in race mode" -> src/spectate.c:48-51 `if (match_in_progress || intermission_running || isRACE()){ return 0; }` (branch on feature's own path GetSpecWizard, tests exactly these 3, returns 0 regardless of k_asw) -> MATCH
- "0 = spectator wizards never allowed" -> src/spectate.c:55-56 `case 0: return 0; // wizards not allowed` -> MATCH
- "1 = allowed only when there are no players on the server" -> src/spectate.c:58-59 `case 1: return (CountPlayers() ? 0 : 1); // allowed without players` -> MATCH
- "2 = allowed in prematch even when players are present" -> src/spectate.c:61-62 `case 2: return 2; // allowed with players in prematch` (match_in_progress already excluded at :48 -> case2 = prematch) -> MATCH
WI-2: n/a (description states no default; registered default 0 via bare RegisterCvar("allow_spec_wizard") src/world.c:820 -- consistent, not asserted)


## Wave 10 -- batch rows (canary ktx:command:autotrack EXCLUDED -- F-V2 control: C-FIX confirmed)

RESULT | ktx:cvar:_k_captcolor1 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | internal mod-state cvar; first captain's top/bottom color stored at BeginPicking and force-applied to picked player at SetPlayerParams; all clauses trace to enforcing lines
### ktx:cvar:_k_captcolor1
- "Internal mod-state cvar (not operator-tuned)" -> src/world.c:1024 `RegisterCvar("_k_captcolor1"); // internal mod usage` -> MATCH (adjacent comment states internal mod usage)
- "During captain-based team picking, the server stores the first captain's player colors" -> src/captain.c:385 `if (capt_num(p))` :390 `cvar_set(va("_k_captcolor%d", capt_num(p)), ...)` in BeginPicking(); capt_num returns 1 for first captain (src/captain.c:35-43) -> MATCH
- "(top and bottom color, space-separated)" -> src/captain.c:390 `va("%s %s", ezinfokey(p, "topcolor"), ezinfokey(p, "bottomcolor"))` -> MATCH
- "when that captain picks a player, the picked player is force-set to these colors" -> src/captain.c:50 `infocolor = cvar_string(va("_k_captcolor%d", (int)k_captainturn));` + :64 `stuffcmd_flags(p, STUFFCMD_IGNOREINDEMO, "break\n" "team \"%s\"\n" "color \"%s\"\n", infoteam, infocolor);` in SetPlayerParams (pick handler) -> MATCH
- "Holds runtime state set and consumed by the team-picking code" -> set src/captain.c:390, consumed src/captain.c:50 -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_admincode | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | /admin passcode; string path strneq+streq, numeric path integer ==; empty/"none" disables both paths; k_admins gate + 5s cooldown all traced
### ktx:cvar:k_admincode
- "Server admin passcode used by the /admin command to grant a player real admin privileges" -> src/commands.c:750 `{ "admin", ReqAdmin, ... }`; ReqAdmin src/admin.c:378 `BecomeAdmin(self, AF_REAL_ADMIN);` on match -> MATCH
- "typing /admin <code> (matched as a string)" -> src/admin.c:362 `if (trap_CmdArgc() == 2)` :365 `char *pass = cvar_string("k_admincode");` :376 `streq(arg_2, pass)` -> MATCH
- "numeric impulse/number-key path (matched as an integer)" -> src/admin.c:420 `int iPass = cvar("k_admincode");` :431 `if (iPass && (self->k_added == iPass))` (in AdminImpBot) -> MATCH
- "an exact match grants admin" -> src/admin.c:376 `streq(arg_2, pass)` / :431 `self->k_added == iPass` -> BecomeAdmin -> MATCH
- "Set to an empty value or to 'none' to disable passcode-based admin access" -> src/admin.c:376 `if (!strnull(pass) && strneq(pass, "none") && streq(arg_2, pass))` (empty/"none" -> guard fails, string path never grants) + :431 `if (iPass && ...)` (cvar() of empty/"none" -> 0 -> numeric path disabled); registered default src/world.c:843 `RegisterCvar("k_admincode")` = empty (disabled by default) -> MATCH
- "(it is also gated by k_admins)" -> src/admin.c:347 `if (!cvar("k_admins")) { ... "NO admins" ...; return; }` -- returns before passcode parse, on ReqAdmin's own path -> MATCH
- "Failed attempts are throttled by a 5-second cooldown" -> src/admin.c:366 `int till = Q_rint(self->k_adm_lasttime + 5 - g_globalvars.time);` :368 `if (self->k_adm_lasttime && (till > 0)) { ... "Wait %d second" ...; return; }` :383 `self->k_adm_lasttime = g_globalvars.time;` on failure (identical numeric path :421-440); comment :369 `// probably must help against brute force` -> MATCH (literal +5)
WI-2: n/a

RESULT | ktx:cvar:k_auto_xonx | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | count brackets exact (0-3/4-5/6-7/8-9/10+), players+ready specs, match_in_progress & k_matchLess skip on own path, manual-block string verbatim
### ktx:cvar:k_auto_xonx
- "automatically switches the active user mode to match the live count of players plus ready spectators" -> src/world.c:1208 `for (count = 0, p = world; (p = find_client(p));) { if ((p->ct == ctPlayer) || ((p->ct == ctSpec) && p->ready)) { count++;` -> MATCH
- "0-3 -> 1on1, 4-5 -> 2on2, 6-7 -> 3on3, 8-9 -> 4on4, 10 or more -> 10on10" -> src/world.c:1221-1248 `case 0..3: um_idx_byname("1on1"); case 4,5: "2on2"; case 6,7: "3on3"; case 8,9: "4on4"; default: "10on10"` -> MATCH
- "0 = off, 1 = on" -> src/world.c:1199 `if (!cvar("k_auto_xonx") || ...) { return; }`; registered default src/world.c:794 `RegisterCvar("k_auto_xonx")` = 0 (off) -> MATCH
- "auto-switch is only evaluated while no match is in progress and not in matchless mode" -> src/world.c:1199 `if (!cvar("k_auto_xonx") || match_in_progress || k_matchLess ...) { return; }` -- explicit branch testing match_in_progress AND k_matchLess on the auto-switch's own path -> MATCH
- "when on it also blocks manual user-mode change commands (server reports 'Command blocked due to k_auto_xonx')" -> src/commands.c:4652 `if (cvar("k_auto_xonx")) { G_sprint(self, 2, "Command blocked due to k_auto_xonx\n"); return; }` (UserMode, non-sv path) -> MATCH (verbatim string)
WI-2: n/a

RESULT | ktx:cvar:k_cmd_fp_count | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | ring-buffer size for command-flood window; bound(0,..,MAX_FP_CMDS) MAX_FP_CMDS=10; 0->10 default; distinct from say-flood k_fp
### ktx:cvar:k_cmd_fp_count
- "number of console commands a client may issue within the k_cmd_fp_per time window before being treated as a command flooder" -> src/commands.c:1234 `if (++idx >= k_cmd_fp_count) { idx = 0; }` (ring-buffer size) + :1198 `if (cmd_time && (g_globalvars.time - cmd_time < k_cmd_fp_per))` where cmd_time is the timestamp k_cmd_fp_count commands ago (:1188 `cmd_time = p->fp_c.cmd_time[idx];`) -> flooder -> MATCH
- "Clamped to the range 0-10" -> src/world.c:1429 `k_cmd_fp_count = bound(0, cvar("k_cmd_fp_count"), MAX_FP_CMDS);` + include/progs.h:260 `#define MAX_FP_CMDS (10)` -> MATCH (MAX_FP_CMDS verified == 10)
- "0 means use the default of 10" -> src/world.c:1430 `k_cmd_fp_count = (k_cmd_fp_count ? k_cmd_fp_count : min(10, MAX_FP_CMDS));` (0 -> min(10,10)=10); registered default src/world.c:995 `RegisterCvar("k_cmd_fp_count")` = 0 -> effective 10 -> MATCH
- "Distinct from say/chat flood protection (k_fp)" -> src/world.c:1007 `RegisterCvarEx("k_fp", "1"); // say floodprot for players` (separate cvar; command path uses fp_c state vs say path fp_s, src/g_cmd.c:227) -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_ctf_custom_models | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | flag/hook model selection; flag.mdl/bit.mdl vs w_g_key.mdl/w_s_key.mdl; precached server-side; effective only when CTF allowed/active (ANDed on own path)
### ktx:cvar:k_ctf_custom_models
- "Selects which models CTF flags and the grappling hook use" -> src/ctf.c:57 (flag item) + src/grapple.c:153 / :493 (grapple projectile) branch on `k_ctf_custom_models` -> MATCH
- "1: use the dedicated CTF models (e.g. progs/flag.mdl for flags...)" -> src/ctf.c:57 `if (k_ctf_custom_models) { setmodel(self, "progs/flag.mdl"); }` -> MATCH
- "...progs/bit.mdl for the hook" -> src/grapple.c:153 `if (k_ctf_custom_models) { setmodel(newmis, "progs/bit.mdl"); }` -> MATCH (one of the hook-related custom models; description hedges with "e.g.")
- "which are precached server-side" -> src/world.c:399 `if (k_ctf_custom_models) { trap_precache_model("progs/v_star.mdl"); trap_precache_model("progs/bit.mdl"); trap_precache_model("progs/star.mdl"); trap_precache_model("progs/flag.mdl"); }` -> MATCH
- "0: use the original Quake models instead (progs/w_g_key.mdl / progs/w_s_key.mdl for the two flags)" -> src/ctf.c:102 `if (!k_ctf_custom_models) { setmodel(self, "progs/w_g_key.mdl"); }` (SP_item_flag_team1) + src/ctf.c:117 `if (!k_ctf_custom_models) { setmodel(self, "progs/w_s_key.mdl"); }` (SP_item_flag_team2) -> MATCH
- "Only takes effect when CTF is actually allowed/active" -> src/world.c:1113 `k_ctf_custom_models = cvar("k_ctf_custom_models") && (k_allowed_free_modes & UM_CTF);` (comment :1112 `// do not precache models if CTF is not really allowed`) + src/world.c:1162 `k_ctf_custom_models = k_ctf_custom_models && (isCTF() || isRACE()); // precache only if CTF is really on` -> MATCH (effective global ANDed with CTF-allowed/active on its own resolution path)
WI-2: n/a

## Wave 11 -- batch rows (canary ktx:cvar:k_teamoverlay EXCLUDED -- F-V2 control: C-NEAR-MISS confirmed)

RESULT | ktx:cvar:k_defmode | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | usermode-name default mode; first-spawn + execute_rules_reset apply it; matchless->ffa; unknown name (um_idx_byname=-1) skipped, no force -- all enforced
### ktx:cvar:k_defmode
- "sets the server's default game mode, named as a usermode string" -> /tmp/ktx-src-67253dc9/src/world.c:1122 `if ((um_idx = um_idx_byname(cvar_string("k_defmode"))) >= 0)` + commands.c:4560-4576 `um_idx_byname` matches `um_list[i].name` -> MATCH
- "on the server's first map spawn this mode's configuration is applied" -> /tmp/ktx-src-67253dc9/src/world.c:1118 `if (cvar("_k_worldspawns") == 1)` { ... :1124 `cvar_fset("_k_last_xonx", um_idx + 1); // force exec configs for default user mode` } -> MATCH
- "on a full reset it is re-applied" -> /tmp/ktx-src-67253dc9/src/commands.c:4851 `void execute_rules_reset(void)` -> :4878 `if ((um_idx = um_idx_byname(k_matchLess ? "ffa" : cvar_string("k_defmode"))) >= 0)` -> :4880 `UserMode(-(um_idx + 1));` (called from client.c:3093 / race.c:341 reset paths) -> MATCH
- "in matchless servers ffa is used instead" -> /tmp/ktx-src-67253dc9/src/commands.c:4878 `k_matchLess ? "ffa" : cvar_string("k_defmode")` + world.c:1130 `if (k_matchLess)` { :1132 `um_idx_byname("ffa")` } -> MATCH
- "the value must match a known usermode name" -> /tmp/ktx-src-67253dc9/src/commands.c:4567-4574 `for (i = 0; i < um_cnt; i++) { if (streq(name, um_list[i].name)) return i; } return -1;` -> MATCH
- "an unrecognized name is ignored and no default mode is forced" -> /tmp/ktx-src-67253dc9/src/world.c:1122 / commands.c:4878 guarded by `... >= 0` so um_idx==-1 skips the cvar_fset/UserMode -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_demoname_date | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | strftime fmt string appended to end of built demoname; empty -> strnull short-circuit, nothing appended -- all enforced
### ktx:cvar:k_demoname_date
- "appends a timestamp to the end of the automatically generated demo filename" -> /tmp/ktx-src-67253dc9/src/match.c:2337-2341 `fmt = cvar_string("k_demoname_date"); if (!strnull(fmt) && QVMstrftime(date, sizeof(date), fmt, 0)) { strlcat(demoname, date, sizeof(demoname)); }` -- last strlcat before `return demoname` -> MATCH
- "the value is a strftime() format string" -> /tmp/ktx-src-67253dc9/src/match.c:2339 `QVMstrftime(date, sizeof(date), fmt, 0)`; g_syscalls.c:437 `intptr_t QVMstrftime(...)` -> `syscall(G_QVMstrftime,...)`; world.c:938 `RegisterCvar("k_demoname_date"); // add date to demo name, value is argument for strftime() function` -> MATCH
- "whatever fields the format contains determine how the timestamp looks" -> /tmp/ktx-src-67253dc9/src/match.c:2339 fmt passed verbatim to QVMstrftime; sibling sites (logs.c:109 `"%Y-%m-%d %H:%M:%S %Z"`, bot_commands.c:916 `"%Y%m%d-%H%M%S"`) confirm strftime field semantics -> MATCH
- "if the value is empty, no timestamp is appended" -> /tmp/ktx-src-67253dc9/src/match.c:2339 `if (!strnull(fmt) && QVMstrftime(...))` -- empty fmt -> strnull true -> short-circuits, strlcat(demoname,date) skipped -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_exttime | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | overtime length in minutes, only k_overtime==1 path uses it (cnt*60), bound(1,_,999), scoreboard case 1 = dig3(k_exttime), modes 2/3/SD_GOLDEN_FRAG unaffected -- all enforced
### ktx:cvar:k_exttime
- "Length of the overtime period, in minutes" -> /tmp/ktx-src-67253dc9/src/match.c:594 `self->cnt = k_exttime;` -> :596 `match_end_time += self->cnt * 60;` (min->sec) ; :598 `G_bprint(2, "\220%s\221 minute%s overtime follows\n", dig3(k_exttime), count_s(k_exttime));` -> MATCH
- "used when k_overtime is 1 (timed overtime)" -> /tmp/ktx-src-67253dc9/src/match.c:591 `if (k_overtime == 1)` -- the only block that consumes k_exttime to extend play -> MATCH
- "on a tie at the end of regulation, play is extended by this many minutes" -> /tmp/ktx-src-67253dc9/src/match.c (CheckOvertime end-of-regulation): :567-573 `if (((k_mb_overtime == 3) && abs(sc) > 1) || (k_mb_overtime != 3 && k_mb_overtime != SD_GOLDEN_FRAG && abs(sc) > 0)) { k_mb_overtime = 0; }` (non-tie -> no OT) then :591-596 `if (k_overtime == 1) { self->cnt = k_exttime; ... match_end_time += self->cnt * 60; }` -> MATCH
- "the value is clamped to 1-999" -> /tmp/ktx-src-67253dc9/src/match.c:523 `k_exttime = bound(1, cvar("k_exttime"), 999); // at least some reasonable values` -- the value actually used by CheckOvertime -> MATCH
- "shown as the overtime figure on the scoreboard" -> /tmp/ktx-src-67253dc9/src/match.c:1697-1699 `case 1: ot = dig3(cvar("k_exttime")); break;` -> :1721 `strlcat(text, va("%s %4s\n", "Overtime", ot), sizeof(text));` -> MATCH
- "Has no effect under other k_overtime modes (sudden death, tie-break, golden frag)" -> /tmp/ktx-src-67253dc9/src/match.c:602 `else if (k_overtime == 2) { k_sudden_death = SD_NORMAL; match_end_time = 0; }` , :607 `else if (k_overtime == SD_GOLDEN_FRAG)` , :611 else (k_overtime==3 tie-break) -- none reference k_exttime; scoreboard cases 2/3/SD_GOLDEN_FRAG show "sd"/"tb"/"gold" not k_exttime (g_consts.h:303-305 SD_NORMAL=1/SD_TIEBREAK=2/SD_GOLDEN_FRAG=4) -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_aim_pitch_max | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | upper bound() arg of pitch_diff; exact formula at bot_aim.c:350; read bound(0,_,10) into aim_params[PITCH].maximum; skill-derived cvar_fset overridden by customise cfg -- all enforced verbatim
### ktx:cvar:k_fbskill_aim_pitch_max
- "Frogbot AI tuning cvar setting the upper clamp on the bot's vertical (pitch) aim-error magnitude" -> /tmp/ktx-src-67253dc9/src/bot_aim.c:350 `pitch_diff = bound(pitch->minimum, fabs(raw_pitch_diff) * pitch->scale, pitch->maximum);` (pitch = &self->fb.skill.aim_params[PITCH], bot_aim.c:324) -> MATCH
- "pitch error computed as bound(pitch.minimum, fabs(raw_pitch_diff) * pitch.scale, pitch.maximum)" -> /tmp/ktx-src-67253dc9/src/bot_aim.c:350 `pitch_diff = bound(pitch->minimum, fabs(raw_pitch_diff) * pitch->scale, pitch->maximum);` ; raw_pitch_diff at :326-327 `anglefix(anglemod(desired_angle[PITCH]) - anglemod(s.v.angles[PITCH]))` -> MATCH (exact)
- "caps how large the randomized vertical aim deviation can become no matter how far off-target" -> /tmp/ktx-src-67253dc9/src/bot_aim.c:350 upper bound() arg = pitch->maximum caps pitch_diff regardless of raw_pitch_diff; :353 `dist_random(-pitch_diff, pitch_diff, ...)` then bounded -> MATCH
- "Read back per bot clamped to bound(0, value, 10) into self->fb.skill.aim_params[PITCH].maximum" -> /tmp/ktx-src-67253dc9/src/bot_botimp.c:321 `self->fb.skill.aim_params[PITCH].maximum = bound(0, cvar(FB_CVAR_PITCH_MAX_ERROR), 10);` (FB_CVAR_PITCH_MAX_ERROR = "k_fbskill_aim_pitch_max", bot_botimp.c:28) -> MATCH
- "server normally derives the value from the bot's aim-skill level; setting the cvar overrides that" -> /tmp/ktx-src-67253dc9/src/bot_botimp.c:175 `cvar_fset(FB_CVAR_PITCH_MAX_ERROR, RangeOverSkill(aimskill, 4.5, 3));` (setSkillAttributes) ; SetAttributesBasedOnSkill:280-294 exec bots/configs/skill_*.cfg can re-`set` the cvar; SetAttribs:321 reads the FINAL cvar -> override holds -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_aim_pitch_multiplier | C-FIX | flavourC=1 | wi2=0 | clauses=5 | core fine, but "distribution-shaping exponent" is WRONG: dist_random spreadFactor is a LINEAR std-dev multiplier (3+(sum-3)*spreadFactor), no exponentiation
### ktx:cvar:k_fbskill_aim_pitch_multiplier
- "Frogbot AI tuning cvar shaping the vertical (pitch) aim-error random distribution" -> /tmp/ktx-src-67253dc9/src/bot_aim.c:353-354 `pitch_rnd = dist_random(-pitch_diff, pitch_diff, pitch->multiplier * self->fb.skill.current_volatility);` -> MATCH
- "After the pitch error magnitude is clamped, the randomized offset is drawn by dist_random(-pitch_diff, pitch_diff, pitch.multiplier * current_volatility)" -> /tmp/ktx-src-67253dc9/src/bot_aim.c:350 `pitch_diff = bound(pitch->minimum, fabs(raw_pitch_diff) * pitch->scale, pitch->maximum);` then :353-354 `dist_random(-pitch_diff, pitch_diff, pitch->multiplier * self->fb.skill.current_volatility)` -> MATCH (exact)
- "this value (scaled by the bot's current volatility) is the distribution-shaping exponent that biases the pitch randomization toward the extremes or the center of the allowed error band" -> /tmp/ktx-src-67253dc9/src/g_utils.c:89-91 `if (spreadFactor != 1) { sum = bound(0.0f, 3 + (sum - 3) * spreadFactor, 6.0f); }` -> MISMATCH(spreadFactor = pitch.multiplier*volatility is applied as a LINEAR multiplier on the deviation from the mean `(sum-3)*spreadFactor`, a std-deviation scale -- NOT an exponent; no pow/exp/** anywhere in dist_random g_utils.c:76-98 or g_random:51-54. The "biases toward extremes vs center" half is correct (>1 widens, <1 narrows) but the term "exponent" is a wrong characterization of a linear scaling operation)
- "Read back per bot clamped to bound(0, value, 10) into self->fb.skill.aim_params[PITCH].multiplier" -> /tmp/ktx-src-67253dc9/src/bot_botimp.c:322 `self->fb.skill.aim_params[PITCH].multiplier = bound(0, cvar(FB_CVAR_PITCH_MULTIPLIER), 10);` (FB_CVAR_PITCH_MULTIPLIER = "k_fbskill_aim_pitch_multiplier", bot_botimp.c:29) -> MATCH
- "server normally derives the value from the bot's aim-skill level; setting the cvar overrides that" -> /tmp/ktx-src-67253dc9/src/bot_botimp.c:176 `cvar_fset(FB_CVAR_PITCH_MULTIPLIER, RangeOverSkill(aimskill, 4, 2));` ; SetAttributesBasedOnSkill:280-294 customise cfg can re-`set` cvar; SetAttribs:322 reads FINAL cvar -> MATCH
WI-2: n/a


## Wave 12 -- batch rows (canary ktx:cvar:k_yawnmode EXCLUDED -- F-V2 control: TRACED-CLEAN over-flag control held)

RESULT | ktx:cvar:k_fbskill_aim_yaw_multiplier | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Yaw randomization spread-factor; dist_random call, clamp, skill-derive override all map to enforcing lines.
### ktx:cvar:k_fbskill_aim_yaw_multiplier
- "Frogbot AI tuning cvar (registered)" -> bot_botimp.c:122 `RegisterCvar(FB_CVAR_YAW_MULTIPLIER);` (macro = "k_fbskill_aim_yaw_multiplier" bot_botimp.c:25) -> MATCH
- "After the yaw error magnitude is clamped" -> bot_aim.c:351 `yaw_diff = bound(yaw->minimum, fabs(raw_yaw_diff) * yaw->scale, yaw->maximum);` -> MATCH (clamp precedes the draw on the same path)
- "the randomized offset is drawn by dist_random(-yaw_diff, yaw_diff, yaw.multiplier * current_volatility)" -> bot_aim.c:355 `yaw_rnd = dist_random(-yaw_diff, yaw_diff,` / :356 `yaw->multiplier * self->fb.skill.current_volatility);` -> MATCH (verbatim arg shape)
- "distribution-shaping exponent that biases ... toward the extremes or the center (scaled by volatility)" -> g_utils.c:91 `sum = bound(0.0f, 3 + (sum - 3) * spreadFactor, 6.0f);` -> MATCH (spreadFactor>1 widens toward tails, <1 toward mean; "exponent" is loose wording but the bias direction and the volatility scaling are exactly the code's behavior -- still-true minor vagueness, traceable)
- "Read back per bot clamped to bound(0, value, 10) into self->fb.skill.aim_params[YAW].multiplier" -> bot_botimp.c:317 `self->fb.skill.aim_params[YAW].multiplier = bound(0, cvar(FB_CVAR_YAW_MULTIPLIER), 10);` -> MATCH (exact bound + field)
- "server normally derives from aim-skill level; setting the cvar overrides that" -> bot_botimp.c:171 `cvar_fset(FB_CVAR_YAW_MULTIPLIER, RangeOverSkill(aimskill, 4, 2.5));` (also :222 easy mode `RangeOverSkill(aimskill, 5, 2.5)`) -> MATCH (uses aimskill; bare RegisterCvar => registered default 0, so a manual set overrides the skill-derived value)
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_reactiontime | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Earliest-fire delay; set on look-target change + on world-enter, gated by FUTURE(min_fire_time), 0..1.5 clamp -- all enforced.
### ktx:cvar:k_fbskill_reactiontime
- "delay in seconds before the bot may open fire on a newly-acquired enemy" -> bot_aim.c:243 `self->fb.min_fire_time = g_globalvars.time + self->fb.skill.awareness_delay;` (inside `if (opponent != self->fb.prev_look_object)` bot_aim.c:239) -> MATCH
- "(and after spawning) ... when the bot enters the world, its earliest-fire time is set to current time plus this value" -> bot_client.c:136 `self->fb.min_fire_time = g_globalvars.time + self->fb.skill.awareness_delay;` (in BotClientEntersEvent, bot_client.c:130) -> MATCH
- "it cannot shoot until that time elapses" -> bot_botweap.c:571 `if (FUTURE(min_fire_time))` / :573 `self->fb.firing = false;` / :575 `return;` -> MATCH
- "Higher = longer delay (slower reaction); lower (toward 0) = near-instant" -> bot_aim.c:243 / bot_client.c:136 (min_fire_time = time + delay; larger delay pushes the gate later) -> MATCH (monotonic from the same enforcing assignments)
- "Clamped to 0..1.5 seconds per bot" -> bot_botimp.c:341 `self->fb.skill.awareness_delay = bound(0, cvar(FB_CVAR_REACTION_TIME), 1.5f);` -> MATCH (exact bound)
- "Normally set automatically from the configured bot skill, not by hand" -> bot_botimp.c:180 `cvar_fset(FB_CVAR_REACTION_TIME, RangeOverSkill(skill, 0.75f, 0.3f));` (also :231 easy `RangeOverSkill(skill, 1.5f, 0.3f)`) -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_visibility | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Min forward dot-product for infront visibility; DotProduct>=value, clamp 0.5..0.7071067, Visible_360 bypass -- all enforced incl. adjacent comment.
### ktx:cvar:k_fbskill_visibility
- "minimum forward dot-product used by the bot's in-front visibility test ... DotProduct(view-forward, direction-to-target) is at least this value" -> bot_world.c:99 `return DotProduct (g_globalvars.v_forward, temp) >= min_dot_product;` -> MATCH (>= comparison; temp = normalized origin-to-target bot_world.c:96-97)
- "after a clear traceline to a damageable target" -> bot_world.c:74 `if (visible_object->s.v.takedamage)` + bot_world.c:87 `if (g_globalvars.trace_fraction == 1)` -> MATCH (takedamage gate + clear traceline gate precede the dot test)
- "larger values narrow the awareness cone and smaller values widen it" -> bot_world.c:99 (higher threshold on `>=` admits a narrower forward cone) + bot_botimp.c:313 comment `// fov 90 (0.707) => fov 120 (0.5)` -> MATCH (direction consistent with code + adjacent comment)
- "Read into self->fb.skill.visibility clamped with bound(0.5, value, 0.7071067)" -> bot_botimp.c:313 `self->fb.skill.visibility = bound(0.5, cvar( FB_CVAR_VISIBILITY), 0.7071067f);` -> MATCH (exact bound + field)
- "0.7071067 ~= cos(45) = 90deg fov cone, 0.5 ~= 120deg fov cone" -> bot_botimp.c:313 inline comment `// fov 90 (0.707) => fov 120 (0.5)` (also :167/:218 `// equivalent of 90 => 120 fov`) -> MATCH (matches adjacent source comment; cos(45deg)~=0.7071, half-angle of a 90deg cone -- mathematically consistent)
- "Consumed only by Visible_infront(); the unconditional Visible_360() path bypasses it" -> bot_world.c:113 `VisibilityTest(self, visible_object, self->fb.skill.visibility)` vs bot_world.c:108 `VisibilityTest(self, visible_object, 0.0f)` + bot_world.c:89-92 `if (min_dot_product == 0) { return true; }` -> MATCH (grep shows skill.visibility read only at :313 set and :113; Visible_360 passes 0.0 and short-circuits true before the dot test)
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_vol_ownvel_incr | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Ownspeed volatility increment; added when own horiz speed exceeds the separate threshold cvar, 0..5 clamp, skill-managed -- all enforced.
### ktx:cvar:k_fbskill_vol_ownvel_incr
- "volatility INCREMENT added to the running aim-volatility scalar" -> bot_aim.c:262 `volatility += self->fb.skill.ownspeed_volatility;` (comment bot_aim.c:258 `// Ownspeed penalty`) -> MATCH
- "when the bot's OWN horizontal speed exceeds the separate k_fbskill_vol_ownvel speed threshold" -> bot_aim.c:259 `if (HorizontalVelocityCheck(self->s.v.velocity,` / :260 `self->fb.skill.ownspeed_volatility_threshold))` ; HorizontalVelocityCheck bot_aim.c:228-230 `velocity[0]*velocity[0] + velocity[1]*velocity[1] > threshold*threshold`; threshold field set from FB_CVAR_OWNSPEED_VOLATILITY_THRESHOLD = "k_fbskill_vol_ownvel" (bot_botimp.c:39, set :332-333) -> MATCH (own velocity, horizontal, distinct threshold cvar)
- "It sets how much aim degrades while the bot is moving fast, not the speed at which the penalty triggers" -> bot_botimp.c:334 (this cvar = the += amount) vs bot_botimp.c:332-333 (the trigger speed is the separate THRESHOLD cvar) -> MATCH (increment vs threshold are distinct fields/cvars)
- "reads it clamped to bound(0, value, 5.0) into self->fb.skill.ownspeed_volatility" -> bot_botimp.c:334 `self->fb.skill.ownspeed_volatility = bound(0, cvar(FB_CVAR_OWNSPEED_VOLATILITY_INCREASE), 5.0f);` -> MATCH (exact bound + field)
- "Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode()" -> bot_botimp.c:189 `cvar_fset(FB_CVAR_OWNSPEED_VOLATILITY_INCREASE, RangeOverSkill(skill, 0.2f, 0.1f));` (setSkillAttributes, fn :156) + bot_botimp.c:240 same call (setSkillAttributesEasySkillMode, fn :207) -> MATCH (both named functions verified)
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_wiggleframes | C-FIX | flavourC=1 | wi2=0 | clauses=6 | Counter/reversal/half-limit-flip/0..45 clamp all clean, but the scope clause "applies only in deathmatch 4 / duel" is WRONG: the wiggle enforcing branch is `deathmatch == 4` with no duel scope, and the only isDuel() branch on the path DISABLES wiggle.
### ktx:cvar:k_fbskill_wiggleframes
- "amplitude, in movement-think ticks, of the bot's ... side-to-side 'wiggle run'" -> bot_movement.c:249/:254 (wiggle_run_limit bounds the wiggle_run_dir counter swing) -> MATCH (the limit is the per-side counter amplitude)
- "In deathmatch 4 the bot's wiggle counter increments each tick and reverses direction once it passes plus/minus this value" -> bot_movement.c:242 `else if (deathmatch == 4)` ; :249 `else if ((self->fb.wiggle_run_dir > self->fb.skill.wiggle_run_limit) ... )` -> :252 `self->fb.wiggle_increasing = false;` ; :254 `... < -self->fb.skill.wiggle_run_limit ...` -> :257 `self->fb.wiggle_increasing = 1;` ; :259-266 `else if (self->fb.wiggle_increasing) ++...; else --self->fb.wiggle_run_dir;` -> MATCH (increments/reverses at +/- limit, gated on deathmatch == 4)
- "It also gates the damage-induced wiggle-direction flip, which only triggers once the counter exceeds half this value" -> bot_botenemy.c:34 `if ((deathmatch >= 4) && (g_random() < targ->fb.skill.wiggle_toggle)` / :35 `&& (abs(targ->fb.wiggle_run_dir) > (self->fb.skill.wiggle_run_limit / 2)))` -> :37 flips wiggle_run_dir sign -> MATCH (abs(counter) > limit/2 gate is exact)
- "Integer ticks, clamped to 0..45 per bot" -> bot_botimp.c:353 `self->fb.skill.wiggle_run_limit = bound(0, (int)cvar(FB_CVAR_MOVEMENT_WIGGLEFRAMES), 45.0f);` -> MATCH (the (int) cast = integer ticks; bound 0..45)
- "Applies only in deathmatch 4 / duel" -> bot_movement.c:242 `else if (deathmatch == 4)` (movement wiggle path) ; bot_movement.c:141 `if ((deathmatch >= 4) && isDuel() && !self->fb.skill.wiggle_run_dmm4) return;` (the ONLY isDuel() branch on the wiggle path) ; bot_botenemy.c:34 `if ((deathmatch >= 4) ...)` (damage-flip path) -> MISMATCH(the enforcing scope for the wiggle behavior is `deathmatch == 4` (movement) / `deathmatch >= 4` (damage-flip), NOT "deathmatch 4 / duel"; the only isDuel() branch on the feature path -- bot_movement.c:141 -- DISABLES wiggle in dmm>=4 duel by default (wiggle_run_dmm4 = skill>10?1:0). No feature-path branch makes the wiggle apply *in duel*; "applies ... in duel" contradicts the only duel branch present. Accurate scope: deathmatch == 4 (and dmm4 duel is in fact off by default))
- "Normally set automatically from the configured bot skill, not by hand" -> bot_botimp.c:202 `cvar_fset(FB_CVAR_MOVEMENT_WIGGLEFRAMES, RangeOverSkill(skill, 30, 20));` (also :254 easy mode) -> MATCH
WI-2: n/a


## Wave 13 -- batch rows (canary ktx:command:autotrack EXCLUDED -- F-V2 control: C-FIX confirmed)

RESULT | ktx:cvar:k_force_mapcycle | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | All clauses map to client.c:580 GotoNextMap enforcing branch; default verified vs bare RegisterCvar (=0/off); samelevel short-circuits the feature's own branch.
### ktx:cvar:k_force_mapcycle
- "Forces use of the map cycle on level change even when deathmatch is 0" -> client.c:580 `if (deathmatch || cvar("k_force_mapcycle")) SelectMapInCycle(newmap, sizeof(newmap));` -> MATCH
- "Normally the next map is selected from the map cycle only when deathmatch is non-zero" -> client.c:580 (same line; absent the cvar the condition reduces to `deathmatch`) -> MATCH
- "0 = off, 1 = on" -> world.c:803 `RegisterCvar("k_force_mapcycle");` (bare register = default 0/off) read as boolean at client.c:580 -> MATCH
- "Has no effect when samelevel is set, which always keeps the current map" -> client.c:562-575 `if (trap_cvar("samelevel")) { ... newmap = entityfile|mapname ... } else { ... k_force_mapcycle check ... }` -- samelevel takes the if-branch; the else (k_force_mapcycle) is unreachable -> MATCH
WI-2: n/a
---
RESULT | ktx:cvar:k_freshteams_weapon_time | C-FIX | flavourC=1 | wi2=0 | clauses=6 | "clamped 0-60" is WRONG vs the respawn (feature) path (items.c:812->1061 applies the raw cvar, no clamp); the only bound(0,..,60) is in unrelated admin cycle command ToggleFreshTime.
### ktx:cvar:k_freshteams_weapon_time
- "FreshTeams (dmm1) only" -> world.c:1770-1772 `if (cvar("k_freshteams") && deathmatch != 1) cvar_fset("k_freshteams", 0); // freshteams only in dmm1` (effect gated on k_freshteams at items.c:812) -> MATCH
- "respawn delay, in seconds, before a picked-up weapon reappears on the map" -> items.c:812 `int weapon_time = k_freshteams ? cvar("k_freshteams_weapon_time") : 30;` + items.c:1061 `self->s.v.nextthink = g_globalvars.time + weapon_time;` -> MATCH
- "When k_freshteams is on this value replaces the normal 30-second weapon respawn; when off, weapons respawn in the standard 30 seconds regardless of this cvar" -> items.c:812 `int weapon_time = k_freshteams ? cvar("k_freshteams_weapon_time") : 30;` (exact ternary) -> MATCH
- "(clamped 0-60)" -> MISMATCH: respawn path items.c:812->items.c:1061 applies `cvar("k_freshteams_weapon_time")` with NO clamp; ammo path items.c:1355 `g_globalvars.time + cvar("k_freshteams_weapon_time")` also unclamped. Only bound is commands.c:7674 `int k_freshtime = bound(0, cvar("k_freshteams_weapon_time"), 60);` inside ToggleFreshTime (a separate admin command that cycles the value 20->15->10->20 via cvar_set; commands.c:7691/7696/7700) -- it reads a bounded local for branch logic only, never clamps the stored cvar or the respawn application. A directly-set value >60 takes effect unclamped. No enforcing clamp on the feature path.
- "If k_freshteams_fast_ammo is also enabled, ammo entities use this same delay instead of their default respawn time" -> items.c:1189 `qbool freshteams_fast_ammo = (cvar("k_freshteams") && cvar("k_freshteams_fast_ammo"));` + items.c:1353-1355 `if (freshteams_fast_ammo) self->s.v.nextthink = g_globalvars.time + cvar("k_freshteams_weapon_time");` -> MATCH
- "Default 20" -> world.c:895 `RegisterCvarEx("k_freshteams_weapon_time", "20");` (registered default) -> MATCH
WI-2: n/a (Default-20 clause is correct vs RegisterCvarEx; not a WI-2 defect)
---
RESULT | ktx:cvar:k_lockmode | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Every value (0/1/2) maps to its enforcing connect-permission branch in client.c:1330-1401; status labels off/team/all verified at commands.c:1955-1958.
### ktx:cvar:k_lockmode
- "Controls whether players may join while a match is in progress" -> client.c:1330-1352 connect-permission fn returns true/false gated on match_in_progress + k_lockmode -> MATCH
- "0 = server not locked (players may join freely; no ghost tracking)" -> client.c:1330-1341 (no-match/matchLess path `return true`) + with k_lockmode==0 neither ==2 nor ==1 branch fires (fallthrough = allowed) + client.c:2902-2904 `if (!cvar("k_lockmode")) return; // no ghost if lockmode is disabled` -> MATCH
- "1 = team-locked: only players belonging to an already-existing team may rejoin (tracked via ghosts); new players are kept out" -> client.c:1352 `else if ((cvar("k_lockmode") == 1) || isCA())` + 1380-1401 team branch: `for (...; (p = find_plrghst(p, &from));) if (p != self && streq(getteam(p), t)) break;` then `if (!p) { ... return false; }` -> MATCH
- "2 = fully locked: no players may join during the match -- they are told to reconnect as spectators" -> client.c:1343-1351 `else if (cvar("k_lockmode") == 2) { G_sprint(... "Please reconnect as spectator\n"); return false; }` -> MATCH
- "The in-game status display labels these off / team / all" -> commands.c:1955-1958 `(!cvar("k_lockmode") ? "off" : (cvar("k_lockmode") == 2 ? "all" : (cvar("k_lockmode") == 1 ? "team" : "unknown")))` -> MATCH
WI-2: n/a (no default-value or admin-class clause asserted; world.c:941 `RegisterCvar("k_lockmode")` => default 0 = "off", consistent with the 0 clause)
---
RESULT | ktx:cvar:k_midair | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | Every numeric/polarity clause maps to an exact enforcing line in combat.c (9999 instakill / all-else take=0 / self-rl take=0 / minheight branch) + client.c:2592 (2s) + client.c:5414 (frag suppress); default 0 vs bare RegisterCvar.
### ktx:cvar:k_midair
- "Enables midair mode" -> combat.c:527-530 `if ((int)cvar("k_midair")) { midair = true; }` (drives the midair damage block) -> MATCH
- "the only damage that counts is direct rocket or telefrag/stomp damage" -> combat.c:593-594 `rl_dmg = (targ->ct == ctPlayer && dtRL == targ->deathtype); stomp_dmg = (targ->ct == ctPlayer && dtSTOMP == targ->deathtype);` + combat.c:604-607 do_dmg includes dtTELE1/2/3 + combat.c:700-703 `if (!rl_dmg && !do_dmg) { take = 0; }` -> MATCH
- "which is forced to an instant kill (9999)" -> combat.c:685-688 `if (rl_dmg || stomp_dmg) { take = 9999; }` -> MATCH
- "all other damage sources are nullified" -> combat.c:700-703 `if (!rl_dmg && !do_dmg) { take = 0; // unknown damage for midair, so do not damage }` -> MATCH
- "self rocket damage is removed" -> combat.c:705-708 `if (rl_dmg && (targ == attacker)) { take = 0; // no self rl damage }` -> MATCH
- "a frag only registers if the target was airborne above the height floor set by k_midair_minheight" -> combat.c:660-683 midair_minheight derived from `(int)cvar("k_midair_minheight")` + combat.c:690-693 `if ((playerheight < midair_minheight) && rl_dmg) { take = 0; // no dmg done if target is not high enough }` (+45-unit floor combat.c:695-698) -- below-floor zeroes damage on the feature path so no kill/frag -> MATCH
- "Also forces a 2-second respawn delay" -> client.c:2592 `respawn_time = (cvar("k_midair") || cvar("k_instagib")) ? 2 : 5;` -> MATCH
- "suppresses the normal frag-on-kill increment" -> client.c:5414 `if (!cvar("k_dmgfrags") && !cvar("k_midair") && !lgc_enabled()) { attacker->s.v.frags += 1; }` (k_midair on => normal +1 skipped) -> MATCH
- "0 = off, 1 = on" -> world.c:966 `RegisterCvar("k_midair");` (bare = default 0/off) read as boolean `(int)cvar("k_midair")` combat.c:527 -> MATCH
WI-2: n/a
---
RESULT | ktx:cvar:k_monster_spawn_time | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | disable (<=0), value+value*rand*0.5 formula, and 0..999999 clamp each map to an exact enforcing line (sp_monsters.c:785 / combat.c:289 / combat.c:285); skill>=3 branch on the respawn loop's own path.
### ktx:cvar:k_monster_spawn_time
- "Base respawn delay, in seconds, before a killed monster reappears" -> combat.c:285 `float resp_time = bound(0, cvar("k_monster_spawn_time"), 999999);` + combat.c:288-289 sets monster_desired_spawn_time from it in the FL_MONSTER death path -> MATCH
- "single-player/coop style monster modes, skill 3+" -> sp_monsters.c:780-783 `if (skill < 3) { return; // skill 3 or more required }` in the monster-respawn loop (FL_MONSTER iterated, sp_monsters.c:790-795); coop frag at combat.c:295 -- branch on the feature's own path -> MATCH
- "A value of 0 or below disables monster respawning entirely" -> sp_monsters.c:785-787 `if (cvar("k_monster_spawn_time") <= 0) { return; }` (respawn loop bails) + combat.c:288-289 ternary `resp_time ? ... : 0` (no respawn scheduled when 0) -> MATCH
- "When positive, the actual delay is the value plus a random extra of up to half the value (value + value*rand*0.5)" -> combat.c:288-289 `self->monster_desired_spawn_time = (resp_time ? g_globalvars.time + resp_time + resp_time * g_random() * 0.5 : 0);` (g_random() in 0..1 => extra is resp_time*[0..1]*0.5) -> MATCH
- "Clamped to 0..999999" -> combat.c:285 `float resp_time = bound(0, cvar("k_monster_spawn_time"), 999999);` -> MATCH
WI-2: n/a (no default clause asserted; world.c:1020 `RegisterCvarEx("k_monster_spawn_time", "20")` => default 20, not contradicted)

## Wave 14 -- batch rows (canary ktx:cvar:k_teamoverlay EXCLUDED -- F-V2 control: C-NEAR-MISS confirmed)

RESULT | ktx:cvar:k_no_vote_map | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Both map-vote and break/next_map refusals enforced on-path under explicit `if (k_matchLess && !k_bloodfest)` guard; message string verbatim.
### ktx:cvar:k_no_vote_map
- "When set (non-zero), disables map voting" -> maps.c:408-413 `if (cvar("k_no_vote_map")) { G_sprint(self, 2, "Voting map is %s allowed\n", redtext("not")); return; }` (in DoSelectMap) -> MATCH
- "and the next-map/break commands" -> match.c:3021-3026 `if (cvar("k_no_vote_map")) { G_sprint(self, 2, "Voting next map is %s allowed\n", redtext("not")); return; }` (in PlayerBreak) -> MATCH
- "while the server is in matchless (pickup-style) mode and not running Bloodfest" -> maps.c:406 / match.c:3018 `if (k_matchLess && !k_bloodfest)` (explicit branch wrapping both refusals on feature path) -> MATCH
- "refused with \"Voting map is not allowed\"" -> maps.c:410 `G_sprint(self, 2, "Voting map is %s allowed\n", redtext("not"))` -> MATCH (renders "Voting map is not allowed")
- "0 = map voting and next_map allowed; non-zero = blocked" -> maps.c:408 / match.c:3021 `if (cvar("k_no_vote_map"))` (truthy check; bare RegisterCvar => default 0) -> MATCH
- "Has no effect outside matchless mode" -> maps.c:406 / match.c:3018 `if (k_matchLess && !k_bloodfest)` (the refusal is unreachable outside this guard) -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_on_start_f_version | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | match-start trigger in PlayerReady stuffcmds "say f_version" gated on has_matchtag && cvar; RegisterCvarEx default "1" confirmed.
### ktx:cvar:k_on_start_f_version
- "When set (non-zero) and the match has a matchtag assigned" -> match.c:2949 `if (has_matchtag && cvar("k_on_start_f_version"))` (explicit branch testing both) -> MATCH
- "the player triggering the match start is automatically made to issue \"say f_version\"" -> match.c:2951 `stuffcmd(self, "say f_version\n");` (self = readying player in PlayerReady, immediately before "Timer started"/StartTimer) -> MATCH
- "broadcasting the f_version (client version) report to chat as the match begins" -> match.c:2951-2954 `stuffcmd(self, "say f_version\n"); ... G_bprint(2, "Timer started\n"); StartTimer();` (say = chat, at match-start) -> MATCH
- "0 = no automatic f_version at match start; non-zero = sent at match start" -> match.c:2949 `cvar("k_on_start_f_version")` truthy gate -> MATCH
- "No effect on matches without a matchtag" -> match.c:2949 `has_matchtag &&` (explicit conjunct on feature path) -> MATCH
- "Default 1" -> world.c:806 `RegisterCvarEx("k_on_start_f_version", "1");` -> MATCH
WI-2: n/a (default verified vs Register* call = 1, asserted "Default 1" correct)

RESULT | ktx:cvar:k_pow_s | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Suit hide/no-pickup, enable-show, and off/on/partial state report all enforced at located IT_SUIT/k_pow_s branches; k_pow gating explicit.
### ktx:cvar:k_pow_s
- "Per-type switch for the Environmental Protection Suit (biosuit) powerup" -> world.c:815 `RegisterCvarEx("k_pow_s", "1"); // suit`; items.c:113 `((int)self->s.v.items & IT_SUIT) && !cvar("k_pow_s")`; world.c:1409 `show_powerups("item_artifact_envirosuit")` -> MATCH
- "0 = suit entities are hidden and cannot be picked up" -> items.c:108-118 `if (... ((int)self->s.v.items & IT_SUIT) && !cvar("k_pow_s") ...) { self->model = ""; self->s.v.solid = SOLID_NOT; }` (hidden) AND items.c:2036-2042 same `!cvar("k_pow_s")` condition -> `return;` (pickup aborted) -> MATCH
- "1 = suit enabled" -> world.c:1407-1410 `if (k_pow && k_pow_s) { show_powerups("item_artifact_envirosuit"); }` -> MATCH
- "Only takes effect while powerups are globally enabled (see k_pow)" -> world.c:1407 `if (k_pow && k_pow_s)` (explicit k_pow conjunct); items.c:111/2036 hide/no-pickup also guarded by `!Get_Powerups()` where Get_Powerups()@g_utils.c:1780 derives from cvar("k_pow") -> MATCH
- "the per-type switches together determine whether the powerup state reports as 'off', 'on', or a partial subset" -> g_utils.c:1741-1775: `if (!cvar("k_pow") || (!q && !p && !r && !s)) ... "off"`; `if (q && p && r && s) ... "on"`; else partial, `if (cvar("k_pow_s")) strlcat(str, "s", ...)` -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_race_match | C-FIX | flavourC=1 | wi2=0 | clauses=8 | Core race-match behaviors traced clean, but the sv_silentrecord polarity clause is inverted: race.c:5244 forces sv_silentrecord to 0 (OFF) when match mode set, not "on".
### ktx:cvar:k_race_match
- "Master switch (0/1) for race match mode" -> world.c:923 `RegisterCvarEx("k_race_match", "0");`; race.c:5226-5229 `qbool race_match_mode(void) { return cvar(RACE_MATCH_CVAR); }` (RACE_MATCH_CVAR = "k_race_match", race.c:29) -> MATCH
- "When 0, race runs in single best-run mode (each racer chases their own best time, individual demo recording via StartDemoRecord)" -> race.c:716-726 `void race_record(void) { if (race.cd_cnt && cvar("k_race_autorecord")) { if (!race_match_mode()) { StartDemoRecord(); } ... } }` (StartDemoRecord only on non-match path) -> MATCH
- "When 1, ... racers start simultaneously" -> race.c:5021-5024 `static qbool race_simultaneous(void) { return (race_match_mode() || cvar(RACE_SIMULTANEOUS_CVAR)); }` -> MATCH
- "and are line-up enforced (idlers at the start are ended/kicked)" -> race.c:1071-1079 `if (race_match_mode()) { G_bprint(... "too slow" ...); if (race_end(racer, false, false)) { return; } }` in kill_race_idler() (idler at start ended in match mode) -> MATCH (minor: "kicked out of line-up" branch @1091 is the non-match else; "ended" precise, "ended/kicked" still-true vague, traceable)
- "a round counter is shown on the scoreboard" -> race.c:2562-2575 `if (race_match_mode()) { strlcat(cp_buf, "round: ", ...); ... snprintf(tmp, ..., "%d/%d\n", race.round_number + 1, race.rounds); strlcat(cp_buf, tmp, ...); }` (cp_buf = centerprint/scoreboard buffer) -> MATCH
- "points are awarded per round via the configured scoring system" -> race.c:5184-5210 `int race_award_points(...) { ... if (!race_match_mode()) { return 0; } ... }` using scoring_systems[current] -> MATCH
- "demo recording is governed by sv_silentrecord (forced on while match mode is set)" -> race.c:5244 `cvar_fset("sv_silentrecord", cvar(RACE_MATCH_CVAR) ? 0 : 1);` -> MISMATCH (POLARITY INVERTED: match-mode truthy => sv_silentrecord set to 0/OFF, not "on"; only runtime setter; race default template sets sv_silentrecord 1 then this toggle clears it to 0 in match mode. "forced on while match mode is set" contradicts `? 0 : 1`)
- "instead of per-run recording" -> race.c:720-722 (StartDemoRecord gated `if (!race_match_mode())`, so per-run StartDemoRecord suppressed in match mode) -> MATCH
WI-2: n/a (registered default "0" consistent with "0/1" master-switch wording)

RESULT | ktx:cvar:k_race_scoring_system | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | All three scoring tables verified verbatim against scoring_systems[]; 0-2 clamp, cycle command, and award-zero-outside-match all enforced on-path.
### ktx:cvar:k_race_scoring_system
- "Selects which point-scoring table is used to award frags per round in race match mode" -> race.c:5184-5210 `race_award_points()` indexes `scoring_systems[current]` where current from RACE_SCORINGSYSTEM_CVAR -> MATCH
- "Read as an integer clamped to 0-2" -> race.c:5186 `int current = bound(0, (int)cvar(RACE_SCORINGSYSTEM_CVAR), NUM_SCORING_SYSTEMS - 1);` with NUM_SCORING_SYSTEMS=3 (race.c:5162, 3 array entries) => clamp 0..2 -> MATCH
- "0 = 'Win Only' (1 frag to the round winner only)" -> race.c:5151-5152 `{ "Win Only", { 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 }, 0, 0, 0, 1 }` (positions[0]=1, complete=0, beating=0) -> MATCH
- "1 = 'Scaled' (1 frag for completing the run, +1 per opponent beaten, plus a winner bonus)" -> race.c:5155-5156 `{ "Scaled", { 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 }, 1, 1, 0, 3 }` (complete=1 completing, beating=1 per opponent, positions[0]=1 winner bonus) -> MATCH
- "2 = 'Formula1' (position-based points 25/18/15/12/10/8/6/4/2/1)" -> race.c:5158-5159 `{ "Formula1", { 25, 18, 15, 12, 10, 8, 6, 4, 2, 1 }, 0, 0, 0, 25 }` -> MATCH (exact array)
- "Cycled by the scoring-system toggle command" -> race.c:5164-5181 `void race_scoring_system_toggle(void) { ... current = (current + 1) % NUM_SCORING_SYSTEMS; cvar_fset(RACE_SCORINGSYSTEM_CVAR, current); ... }`; commands.c:1029 `{ "race_scoring", race_scoring_system_toggle, 0, CF_PLAYER, CD_RSCORINGMODE }` -> MATCH
- "Has no effect outside race match mode" -> race.c:5190-5193 `if (!race_match_mode()) { return 0; }` in race_award_points() -> MATCH
- "(point awards return zero unless k_race_match is enabled)" -> race.c:5190-5193 (same: returns 0 when !race_match_mode) -> MATCH
WI-2: n/a (registered default world.c:925 = "0", no default asserted in text)


## Wave 15 -- batch rows (canary ktx:cvar:k_yawnmode EXCLUDED -- F-V2 control: TRACED-CLEAN over-flag control held)

RESULT | ktx:cvar:k_race_times_per_port | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | race_filename embeds/omits get_server_port() by cvar; default 0; all clauses on the race file-naming path.
### ktx:cvar:k_race_times_per_port
- "Default 0 (registered)" -> src/world.c:916 `RegisterCvarEx("k_race_times_per_port", "0");` -> MATCH
- "In race mode" (scope) -> src/race.c:201 `if (cvar("k_race_times_per_port"))` inside `race_filename()` (only the race record-file path; race system gated by k_race, race.c:217-220) -> MATCH (clause is on the feature's own file-naming path; filename literal is "race/race[...]")
- "When 0 the filename omits the port -> multiple instances sharing a gamedir share the same record file" -> src/race.c:209-211 `snprintf(filename,...,"race/race[%s_r%02d]-w%1ds%1d.%s", mapname, race.active_route, race.weapon, race.falsestart, extension);` (else branch, no port token) -> MATCH (shared-file consequence is the direct, enforced result of the port being absent from the name)
- "When non-zero the listen port is embedded -> each port its own independent set" -> src/race.c:203-205 `snprintf(filename,...,"race/race[%s_r%02d]-w%1ds%1d_%d.%s", mapname, race.active_route, race.weapon, race.falsestart, get_server_port(), extension);` -> MATCH (distinct filename per port)
- "server's listen port" -> src/race.c:186-194 `get_server_port()` parses port from `cvar_string("sv_local_addr")` (`strchr(ip, ':')`, default 27500) -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_remove_end_hurt | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | 'end'-map-gated trigger removal; bare RegisterCvar=default 0; 1=both, 2=hurt-only all branch-enforced.
### ktx:cvar:k_remove_end_hurt
- "Default 0 / 0 = no modifications" -> src/world.c:877 `RegisterCvar("k_remove_end_hurt");` (bare RegisterCvar => registered default 0; when 0 both gating conditions are false -> normal InitTrigger path src/client.c:780-784, src/triggers.c:985-989) -> MATCH
- "On the 'end' map only" (scope) -> src/triggers.c:978 `if (streq("end", mapname) && cvar("k_remove_end_hurt"))` AND src/client.c:775 `else if (streq("end", mapname) && cvar("k_remove_end_hurt")` -> MATCH (explicit `streq("end", mapname)` branch on the feature's own removal path, both sites)
- "removes built-in level triggers" -> src/triggers.c:980 `soft_ent_remove(self);` (SP_trigger_hurt) and src/client.c:778 `soft_ent_remove(self);` (SP_trigger_changelevel) -> MATCH
- "1 = remove both the hurt trigger and the changelevel trigger" -> hurt: src/triggers.c:978 truthy for 1 -> removed; changelevel: src/client.c:775-776 `cvar("k_remove_end_hurt") && (cvar("k_remove_end_hurt") != 2)` true for 1 -> removed -> MATCH
- "2 = remove only the hurt trigger (changelevel kept)" -> hurt: src/triggers.c:978 truthy for 2 -> removed; changelevel: src/client.c:776 `&& (cvar("k_remove_end_hurt") != 2)` false for 2 -> NOT removed, falls to else InitTrigger (client.c:780-784) keeping changelevel -> MATCH
- "hurt and changelevel triggers behave normally at 0" -> both conditions false at 0 -> InitTrigger normal touch handlers (triggers.c:985-986 hurt_touch; client.c:782-783 changelevel_touch) -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_socd | C-FIX | flavourC=1 | wi2=0 | clauses=6 | 0/1/2/3 enforcement-level semantics all correct, but "Detection evaluated only for non-bot players" is WRONG -- detection/counting runs for bots; only warn/kick actions + stats display are non-bot-gated.
### ktx:cvar:k_socd
- "SOCD / movement-assistance ('iDrive' or keyboard strafe-assistance) detection" -> src/client.c:3748-3805 SOCD detection block in PlayerPreThink; message src/client.c:3788 "Please disable iDrive or keyboard strafe assistance features." -> MATCH
- "0 = allow (no action taken)" -> g_consts.h:346 `#define SOCD_ALLOW 0`; no detection-block branch acts at SOCD_ALLOW (warn requires `k_socd == SOCD_WARN` client.c:3785, kick requires `k_socd == SOCD_KICK` client.c:3792, stats reporting requires `>= SOCD_STATS` stats.c:767) -> MATCH
- "1 = collect statistics only, reported in the post-game stats" -> g_consts.h:347 `#define SOCD_STATS 1`; src/stats.c:767 `if (!p->isBot && cvar("k_socd") >= SOCD_STATS)` gates the "Movement / SOCD detections" line in post-game stats output -> MATCH
- "2 = warn (a public message naming the offending player is printed when detection triggers)" -> g_consts.h:348 `#define SOCD_WARN 2`; src/client.c:3785-3789 `if ((!match_in_progress) && (!self->isBot) && k_socd == SOCD_WARN && (self->ct == ctPlayer) && (self->socdDetectionCount >= 3)) { G_bprint(PRINT_HIGH, "[%s] Warning! %s: Movement assistance detected...", SOCD_DETECTION_VERSION, self->netname); }` -> MATCH (public bprint naming self->netname)
- "3 = kick (the offending player is force-disconnected when detection triggers)" -> g_consts.h:349 `#define SOCD_KICK 3`; src/client.c:3792-3798 `if ((!self->isBot) && k_socd == SOCD_KICK && (self->ct == ctPlayer) && (self->socdDetectionCount >= 3)) { G_bprint(...,"Kicked!..."); stuffcmd(self, "disconnect\n"); }` -> MATCH (forced disconnect)
- "Detection is evaluated only for non-bot players" -> src/client.c:3712-3805: PlayerPreThink has NO early isBot return (src/g_main.c:313-316 dispatches PlayerPreThink for self regardless of isBot; BotPreThink at client.c:3744 runs before and does not return); the strafe-change counting and `self->socdDetectionCount += 1` (client.c:3783) and `self->socdValidationCount += 1` (client.c:3801) execute for bots too. The ONLY isBot guards are on the warn action (client.c:3785), kick action (client.c:3792) and stats display (stats.c:767) -> MISMATCH(detection/counting is NOT non-bot-scoped; no branch on the detection path tests isBot -- only the downstream actions/reporting are non-bot-gated, so the scope assertion contradicts the enforcing code)
WI-2: n/a (description asserts no default value; registered default is `RegisterCvarEx("k_socd", "1")` world.c:1017 = 1=STATS, consistent with the 0/1/2/3 list, no class clause)

RESULT | ktx:cvar:k_spm_show | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | SPAWN_SHOW_DISABLED/PREWAR/MATCH enums; every show/hide site branches on SpawnShowStatus()=k_spm_show; 0/1/2 semantics exact.
### ktx:cvar:k_spm_show
- "Controls when spawn-point marker entities are visible to players" -> src/commands.c:2697 `return (int)cvar("k_spm_show");` (SpawnShowStatus); markers via src/items.c:3012-3021 `ShowSpawnPoints()` -> `Spawn_SpawnPoints("info_player_deathmatch",...)` / src/items.c:3023-3036 `HideSpawnPoints()` -> `ent_remove` of "spawnpoint" ents -> MATCH
- "0 = disabled (markers never shown)" -> g_local.h:1258 `#define SPAWN_SHOW_DISABLED 0`; every ShowSpawnPoints() site gates on it: src/world.c:704 `if (SpawnShowStatus() > SPAWN_SHOW_DISABLED)`, src/race.c:532 same, src/hoonymode.c:858 same; match-start src/match.c:1246 `if (SpawnShowStatus() != SPAWN_SHOW_MATCH) HideSpawnPoints();` (0 != 2 -> hidden). No unconditional show path -> MATCH (at 0 every show is gated out)
- "1 = shown during prewar only (hidden once the match starts)" -> g_local.h:1259 `#define SPAWN_SHOW_PREWAR 1`; prewar src/world.c:704-706 `if (SpawnShowStatus() > SPAWN_SHOW_DISABLED) ShowSpawnPoints();` (1>0 true -> shown); match-start src/match.c:1246-1248 `if (SpawnShowStatus() != SPAWN_SHOW_MATCH) HideSpawnPoints();` (1 != 2 true -> hidden) -> MATCH
- "2 = shown during prewar and kept visible during the match" -> g_local.h:1260 `#define SPAWN_SHOW_MATCH 2`; prewar src/world.c:704 (2>0 true -> shown); match-start src/match.c:1246 `!= SPAWN_SHOW_MATCH` (2 != 2 false -> HideSpawnPoints NOT called -> stays visible) -> MATCH
WI-2: n/a (registered default `RegisterCvarEx("k_spm_show", "1")` world.c:882; description asserts no default, no class clause)

RESULT | ktx:cvar:k_teleport_cap | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | yawn-gated tele velocity scale (1 - cap/100), max(300) floor, 0-100 bound; "in yawn mode / no effect off" enforced by if(k_yawnmode) enclosing the arithmetic.
### ktx:cvar:k_teleport_cap
- "In yawn mode ... when passing through a teleporter" (scope) -> src/triggers.c:582 `if (k_yawnmode)` directly encloses the k_teleport_cap arithmetic at src/triggers.c:588 (teleport touch path, TFLAGS_VELOCITY_ADJUST) -> MATCH (branch on the feature's own path tests k_yawnmode, not a structural side-effect)
- "the percentage of a player's speed that is lost" / "Range 0-100" -> src/commands.c:8639 `k_teleport_cap = bound(0, cvar("k_teleport_cap"), 100);` and src/commands.c:8675 `k_teleport_cap = bound(0, k_teleport_cap, 100);` -> MATCH (clamped 0..100)
- "Exit speed is the entry speed scaled by (1 - k_teleport_cap/100)" -> src/triggers.c:588 `vel = vlen(player->s.v.velocity) * (1.0 - k_teleport_cap / 100.0);` (velocity[2] zeroed at 587 first; horizontal entry speed) -> MATCH
- "0 = full speed preserved" -> src/triggers.c:588 with k_teleport_cap=0 -> factor (1.0 - 0/100)=1.0 -> vel = vlen*1.0 (full, before floor) -> MATCH
- "100 = velocity reduced toward the floor" -> src/triggers.c:588 with 100 -> factor 0 -> vel=0, then src/triggers.c:591 `vel = max(300, vel);` -> 300 floor -> MATCH
- "with a minimum preserved speed of 300" -> src/triggers.c:591 `vel = max(300, vel); // Only preserve speed above 300` -> MATCH
- "Has no effect when yawn mode is off" -> src/triggers.c:582 `if (k_yawnmode) {...} else { VectorScale(g_globalvars.v_forward, 300, player->s.v.velocity); }` (src/triggers.c:595-599 else branch fixed 300, ignores k_teleport_cap); also src/commands.c:8659 `if (!k_yawnmode) { G_sprint(self,2,"%s required to be on\n", redtext("Yawn mode")); return; }` blocks setTeleportCap when off -> MATCH (branch on feature path)
WI-2: n/a (`RegisterCvar("k_teleport_cap")` world.c:1012 bare => default 0; description asserts no default, no class clause)


## Wave 16 -- batch rows (canary ktx:command:autotrack EXCLUDED -- F-V2 control: C-FIX confirmed)

RESULT | ktx:cvar:k_vp_admin | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=5 | Clamp + admin-election semantics trace clean, but the explicit "required vote count is ceil(percent/100*(players-bots))" omits the unconditional max(2,...) floor (vote.c:369) so the real threshold is more conditional than stated; "/admin vote" is also imprecise (the etAdmin election is /elect->VoteAdmin, not /admin->ReqAdmin).
### ktx:cvar:k_vp_admin
- "percentage of eligible voters required to pass an admin election" -> vote.c:270-274 `case OV_ELECT: if ((el_type = get_elect_type()) == etAdmin) { percent = cvar("k_vp_admin"); break; }` -> MATCH (k_vp_admin gates the etAdmin election threshold)
- "(the /admin vote)" -> commands.c:750 `{ "admin", ReqAdmin, ... }` is the admin password/code path (admin.c:313-394, never sets elect_type); the etAdmin election is created only by VoteAdmin (admin.c:530 `self->v.elect_type = etAdmin;`) bound to commands.c:800 `{ "elect", VoteAdmin, ... }` -> MISMATCH(imprecise: the admin election is the /elect vote, not /admin; minor command-name slip, core semantic still correct)
- "Expressed as a whole-number percentage; effective value floored at 51 and capped at 100, values below 51 behave as 51" -> vote.c:330 `percent = bound(0.51, bound(51, percent, 100) / 100, 1);` with g_utils.c:351-354 `float bound(float a, float b, float c){ return ((a >= c) ? a : (b < a) ? a : (b > c) ? c : b); }` (inner bound(51,percent,100) clamps to [51,100]) -> MATCH
- "required vote count is ceil(percent/100 * (players minus bots))" -> vote.c:343 `vt_req = ceil(percent * (CountPlayers() - CountBots()));` (percent already /100 at line 330) with match.c:72-99 CountPlayers()=all players incl bots / CountBots()=bots only; BUT vote.c:367-369 `else if (fofs == OV_ELECT) { vt_req = max(2, vt_req); }` applies an unconditional floor of 2, and vote.c:430 non-diff path returns `max(0, vt_req - CountBots())` -> MISMATCH(core ceil/(players-bots) term is exact, but the stated formula omits the max(2,...) floor; real required count is max(2, ceil(...)) -- the code is more conditional than implied)
- "when enough players vote for admin, the election passes" -> vote.c:159 `if ((votes = get_votes_req(OV_ELECT, true)))` gating election finalize (vote.c:148-167 do_elect path) -> MATCH
WI-2: n/a (no default-value or admin/player/spec access-class metadata claim; registered default via world.c:824 bare RegisterCvar = 0, not asserted in description)

RESULT | ktx:cvar:k_vp_antilag | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=4 | Clamp + antilag-toggle semantics trace clean, but the explicit "required vote count is ceil(percent/100*(players-bots))" omits the unconditional max(2,...) floor (vote.c:413); real threshold is more conditional than stated.
### ktx:cvar:k_vp_antilag
- "percentage of eligible voters required to pass an antilag vote" -> vote.c:321-322 `case OV_ANTILAG: percent = cvar("k_vp_antilag");` -> MATCH
- "(the /antilag command, which toggles the server's lag-compensation mode)" -> commands.c:722 `{ "antilag", antilag, ... }` ; vote.c:1413 `void antilag(void)` casts vote then 1447 `vote_check_antilag();` -> vote.c:1394 `trap_cvar_set_float("sv_antilag", (float)(cvar("sv_antilag") ? 0 : 2));` (toggles sv_antilag 0<->2 = lag-comp off/on) -> MATCH
- "Expressed as a whole-number percentage; effective value floored at 51 and capped at 100, values below 51 behave as 51" -> vote.c:330 `percent = bound(0.51, bound(51, percent, 100) / 100, 1);` + g_utils.c:351-354 bound() = clamp; inner bound(51,percent,100) -> [51,100] -> MATCH
- "required vote count is ceil(percent/100 * (players minus bots))" -> vote.c:343 `vt_req = ceil(percent * (CountPlayers() - CountBots()));` (CountPlayers/CountBots match.c:72-99); BUT vote.c:411-413 `else if (fofs == OV_ANTILAG) { vt_req = max(2, vt_req); }` unconditional floor of 2; vote.c:430 non-diff path `return max(0, vt_req - CountBots());` -> MISMATCH(ceil/(players-bots) core exact, but stated formula omits the max(2,...) floor; real required count is max(2, ceil(...)) -- more conditional than implied)
WI-2: n/a (no default-value or access-class metadata claim; registered default world.c:835 bare RegisterCvar = 0, not asserted)

RESULT | ktx:cvar:k_vp_pickup | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=3 | /pickup->VotePickup->OV_PICKUP->cvar("k_vp_pickup"); clamp to [51,100] exact at vote.c:330; no formula clause asserted so no floor-omission defect.
### ktx:cvar:k_vp_pickup
- "Minimum share of eligible voters (as a percentage) required to pass a pickup vote (the /pickup team-shuffle vote)" -> commands.c:754 `{ "pickup", VotePickup, 0, CF_PLAYER, CD_PICKUP }` ; commands.c:2537-2559 `void VotePickup(void){ ... self->v.pickup = !self->v.pickup; ... vote_check_pickup(); }` ; vote.c:248-249 `case OV_PICKUP: percent = cvar("k_vp_pickup");` -> MATCH
- "Values are clamped to 51-100" -> vote.c:330 `percent = bound(0.51, bound(51, percent, 100) / 100, 1);` + g_utils.c:351-354 `float bound(float a, float b, float c){ return ((a >= c) ? a : (b < a) ? a : (b > c) ? c : b); }` (inner bound(51,percent,100) -> [51,100]) -> MATCH
- "below 51 is treated as 51 and above 100 as 100" -> same vote.c:330 / g_utils.c:351-354: percent<51 -> 51, percent>100 -> 100 -> MATCH
WI-2: n/a (no default/access-class metadata claim; registered default world.c:829 bare RegisterCvar = 0, not asserted)

RESULT | ktx:cvar:k_vp_privategame | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | private-game vote -> OV_PRIVATE -> cvar("k_vp_privategame"); private_game_toggle forces sv_login; clamp to [51,100] exact; no formula clause asserted.
### ktx:cvar:k_vp_privategame
- "Minimum share of eligible voters (as a percentage) required to pass a /privategame vote" -> commands.c:1060 `{ "voteprivate", private_game_vote, 0, CF_PLAYER, CD_PRIVATEGAME }` ; vote.c:1497-1547 `void private_game_vote(void){ ... self->v.privategame = !self->v.privategame; ... vote_check_privategame(); }` ; vote.c:325-326 `case OV_PRIVATE: percent = cvar("k_vp_privategame");` -> MATCH (command literal is "voteprivate"; CD_PRIVATEGAME description-id and the vote function tie it to the privategame vote)
- "which toggles private-game mode (logins forced on the server)" -> vote.c:1453-1476 vote_check_privategame -> 1476 `private_game_toggle(enable);` -> vote.c:1550-1557 `void private_game_toggle(qbool enable){ ... cvar_fset("k_privategame", enable ? 1 : 0); cvar_fset("sv_login", enable ? private_login : 0); }` (private_login = 1 or 2; forces sv_login on) -> MATCH
- "Values are clamped to 51-100; below 51 is treated as 51" -> vote.c:330 `percent = bound(0.51, bound(51, percent, 100) / 100, 1);` + g_utils.c:351-354 bound() clamp; inner bound(51,percent,100) floors at 51 -> MATCH
- "and above 100 as 100" -> same vote.c:330 / g_utils.c:351-354: percent>100 -> 100 -> MATCH
WI-2: n/a (no default/access-class metadata claim; registered default world.c:837 bare RegisterCvar = 0, not asserted)

RESULT | ktx:cvar:k_vp_rpickup | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | /rpickup->RandomPickup->OV_RPICKUP and SwapAll->OV_SWAPALL both read cvar("k_vp_rpickup") (vote.c:252-254); clamp to [51,100] exact; no formula clause asserted.
### ktx:cvar:k_vp_rpickup
- "Minimum share of eligible voters (as a percentage) required to pass a random-pickup vote (the /rpickup random team-shuffle vote)" -> commands.c:807 `{ "rpickup", RandomPickup, 0, CF_PLAYER | CF_SPC_ADMIN, CD_RPICKUP }` ; commands.c:5514-5557 RandomPickup -> `get_votes_req(OV_RPICKUP, true)` + `vote_check_rpickup(...)` ; vote.c:252-254 `case OV_RPICKUP: case OV_SWAPALL: percent = cvar("k_vp_rpickup");` -> MATCH
- "also reused for the swapall vote" -> commands.c:925 `{ "swapall", SwapAll, ... }` ; commands.c:6633-6673 SwapAll -> `get_votes_req(OV_SWAPALL, true)` + `vote_check_swapall();` ; vote.c:253 `case OV_SWAPALL:` falls into the same `percent = cvar("k_vp_rpickup");` (comment vote.c:253 `// don't need a dedicated 'swapall' percentage`) -> MATCH
- "Values are clamped to 51-100; below 51 is treated as 51" -> vote.c:330 `percent = bound(0.51, bound(51, percent, 100) / 100, 1);` + g_utils.c:351-354 bound() clamp; inner bound(51,percent,100) floors at 51 -> MATCH
- "and above 100 as 100" -> same vote.c:330 / g_utils.c:351-354: percent>100 -> 100 -> MATCH
WI-2: n/a (no default/access-class metadata claim; registered default world.c:830 bare RegisterCvar = 0, not asserted)

## Wave 17 -- batch rows (canary ktx:cvar:k_teamoverlay EXCLUDED -- F-V2 control: C-NEAR-MISS confirmed)

# KTX D7 V-pass -- wave w17 (3 rows) -- read-only classifications

RESULT | ktx:cvar:k_vp_teamoverlay | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | percentage source, /teamoverlay-toggle target, and the 51-100 clamp (below 51 -> 51, above 100 -> 100) all verified at their enforcing lines.
### ktx:cvar:k_vp_teamoverlay
- "Minimum share of eligible voters (percentage) required to pass a /teamoverlay vote" -> src/vote.c:307-309 `case OV_TEAMOVERLAY: percent = cvar("k_vp_teamoverlay"); break;` then src/vote.c:343 `vt_req = ceil(percent * (CountPlayers() - CountBots()));` -> MATCH (percent of non-bot players)
- "which toggles the server's team-overlay mode" -> src/vote.c:1057 `cvar_fset("k_teamoverlay", !cvar("k_teamoverlay"));` (in vote_check_teamoverlay, reached when OV_TEAMOVERLAY vote passes) -> MATCH
- "Values are clamped to 51-100" -> src/vote.c:330 `percent = bound(0.51, bound(51, percent, 100) / 100, 1);`; bound(a,b,c) at src/g_utils.c:351-354 `return ((a >= c) ? a : (b < a) ? a : (b > c) ? c : b);` = clamp b into [a,c] -> inner `bound(51, percent, 100)` clamps to [51,100] -> MATCH
- "below 51 is treated as 51" -> src/vote.c:330 inner bound lower arg = 51 (bound semantics: b < 51 -> 51) -> MATCH
- "above 100 as 100" -> src/vote.c:330 inner bound upper arg = 100 (bound semantics: b > 100 -> 100) -> MATCH
WI-2: n/a (no default-value clause stated; registered bare at src/world.c:832 `RegisterCvar("k_vp_teamoverlay");` so registered default 0 -- not asserted by the description, no conflict)

RESULT | ktx:cvar:lock_practice | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=6 | 0/1/2 toggle-refusal semantics + "no built-in default" are clean, but the "0 = auto-off WHEN THE MATCH IS RESET" trigger is wrong vs its only enforcing line: auto-clear fires from G_ShutDown (GAME_SHUTDOWN = before level change), not on a match reset; no match-reset path consults lock_practice.
### ktx:cvar:lock_practice
- "0 = practice mode is automatically turned off when the match is reset" -> the ONLY lock_practice-gated auto-clear is src/g_main.c:521-523 `if (!cvar("lock_practice") && k_practice) { SetPractice(0, NULL); // return server to normal mode }`, inside G_ShutDown, which is the GAME_SHUTDOWN handler: src/g_main.c:395-400 `case GAME_SHUTDOWN: // called before level change/spawn ... G_ShutDown();`. Trigger is a LEVEL CHANGE, not a match reset; a KTX match reset does not call G_ShutDown and no match-reset path reads lock_practice. (client.c:3100 `else if (!cvar("lock_practice") && k_practice) changelevel(mapname);` is a map reload in ClientDisconnect, not a practice clear.) Polarity (0 -> clears, non-0 -> persists) is correct; the stated trigger condition has no enforcing branch -> MISMATCH(real enforcing event is level-change/shutdown, narrower & different from "when the match is reset"; SHARPENED RULE -- only matching condition is on an unrelated path)
- "1 = the practice-toggle command is allowed" -> src/commands.c:4913-4927 TogglePractice: `int lock_practice = cvar("lock_practice"); ... if ((lock_practice == 2) || ((lock_practice != 0) && (lock_practice != 1))) { ... "command is locked\n"; return; }` -- with ==1 neither refuse condition holds, so toggle proceeds (past further access gates) -> MATCH
- "(practice mode persists across resets)" -> contrapositive of src/g_main.c:521 `if (!cvar("lock_practice") ...)`: when lock_practice==1 the auto-clear is skipped so practice is not cleared at level-change/shutdown -> MATCH (traceable; same enforcing line as clause 1, polarity correct)
- "2 = the server is locked in its current practice mode and the practice-toggle command is refused" -> src/commands.c:4921-4927 `if ((lock_practice == 2) /* server locked in current practice mode */ ... ) { G_sprint(self, 3, "console: command is locked\n"); return; }` -> MATCH
- "Any value other than 0, 1 or 2 is treated as locked (toggle refused)" -> src/commands.c:4922 `|| ((lock_practice != 0) && (lock_practice != 1))) /* unknown lock type, ignore command */` -- same refuse-and-return branch -> MATCH
- "Registered with no built-in default" -> src/world.c:851 `RegisterCvar("lock_practice");` -- bare RegisterCvar, no default arg (registered default 0/empty, no explicit built-in default) -> MATCH
WI-2: n/a (clause 6 "no built-in default" verified at src/world.c:851 and is correct; no access-class metadata clause)

---

## Stage-1 summary -- BATCH 02 (B5 retirement evidence)

N = 82 batch rows (canaries excluded). Oracle 1.47-2-g67253dc, HARD-GATE verified.

| classification | count |
|---|---|
| TRACED-CLEAN | 69 |
| C-NEAR-MISS  | 6 |
| C-FIX        | 6 |
| WI2-FIX      | 1 |
| **flavour-C-positive** | **12 / 82 (14.6%)** |

Consistent with the calibrated ~14% fleet base-rate (random-probe 2/14);
the strided F-V1 partition yields a fleet-representative per-batch rate
(not the contiguous-clustering ~42% calibration artifact).

### Flagged set -> B4 seeded re-synth queue (operator-gated; NOT run here -- C4)

C-FIX (>=1 clause wrong vs enforcing line):
- ktx:command:effi -- 'Race shows its own stats listing' false; PlayerStats has only isRA(), no isRACE()
- ktx:cvar:k_fbskill_aim_pitch_multiplier -- 'distribution-shaping exponent' false; spreadFactor is a LINEAR std-dev multiplier (g_utils.c:91)
- ktx:cvar:k_fbskill_wiggleframes -- 'applies in duel' false; only isDuel() branch (bot_movement.c:141) DISABLES wiggle by default
- ktx:cvar:k_freshteams_weapon_time -- 'clamped 0-60' false on feature path; only bound is in unrelated ToggleFreshTime (commands.c:7674)
- ktx:cvar:k_race_match -- sv_silentrecord polarity inverted; race.c:5244 forces it OFF in match mode, not 'on'
- ktx:cvar:k_socd -- 'detection only for non-bot' false; counting (client.c:3783) runs for bots, only warn/kick/stats non-bot-gated

C-NEAR-MISS (>=1 clause name/string/structural-side-effect inference, no enforcing line on feature path):
- ktx:command:info -- 'empty value removes key' has no enforcing line in src/ (engine trap, out of oracle)
- ktx:command:infospec -- quoted 'ON'/'OFF' string-inference; source emits lowercase 'on'/'off' (OnOff g_utils.c:1854)
- ktx:command:qlag -- 'clients restricted from QiZmo lag settings' has no KTX enforcing site (external QiZmo proxy)
- ktx:cvar:k_vp_admin -- formula omits unconditional max(2,..) floor (vote.c:369); '/admin vote' imprecise (etAdmin is /elect->VoteAdmin)
- ktx:cvar:k_vp_antilag -- formula omits unconditional max(2,..) floor (vote.c:413)
- ktx:cvar:lock_practice -- '0=auto-off when match is reset' wrong; auto-clear fires from G_ShutDown level-change (g_main.c:521)

WI2-FIX (metadata clause wrong; core behavior fine; NOT flavour-C):
- ktx:command:upplayers -- 'spectator-admin' wrong; CF_SPC_ADMIN inert without CF_SPECTATOR, dispatch rejects all specs (commands.c:1091-1096)

TRACED-CLEAN (69) = B2 retirement evidence for those rows. The 13 flagged
rows route to B4 (seeded re-synth from D6 Step 1, operator-gated batch),
then re-V-pass. No L1 row mutated; no DB write; read-only (C4).
