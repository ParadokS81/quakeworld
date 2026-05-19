# KTX D7 V-pass -- batch 04 ledger (BATCH_ID 4, bucket 3)

B3 read-only verification-shaped pass (decisions.md D7 Amendment 2026-05-19,
B1-B5). NOT a re-synth: rows are CLASSIFIED only; no description edited, no DB
write. Authority for the method: enforce-trace-discipline.md.

- Oracle: /tmp/ktx-src-67253dc9 @ 67253dc9 == `1.47-2-g67253dc` (HARD GATE 1, verified byte-identical to synthesis source; `git describe --tags` re-run this session).
- Population: batch 4 = 59 rows, F-V1 strided partition `((('x'||substr(md5(canonical_id),1,8))::bit(32)::bigint) % 9 + 9) % 9 = 3`. 10 FIX knobs + 3 canary controls excluded from the population per the verified Step-2 SQL. TOTAL_POP re-counted live = 571 (matches the F-V1-validated population).
- Execution: read-only Opus general-purpose sub-agents at max reasoning, ~5 batch rows + 1 blind injected canary per wave (6 rows). Sub-agent is NOT told which row is the canary, and the brief does NOT name canary ids or their answer-key verdicts (a named canary would pass GATE 1 by recognition, not by tracing -- defeats the control); the flavour-C pattern + the CF_MATCHLESS additive rule are taught generically as method.
- F-V2 HARD GATE 1 (canary verdict): a wave whose injected canary verdict != ground truth is REJECTED and re-dispatched; nothing recorded from it. Canary rows are controls -- excluded from N and the flavour-C tally.
- F-V2 HARD GATE 2 (orchestrator re-grep): for every accepted wave the orchestrator independently re-grepped >=1 flagged row's wrong-clause enforcing line AND >=1 TRACED-CLEAN row's load-bearing clause against the oracle. A gate, not a sample.
- Canary ground truth (re-confirmed by orchestrator re-grep this run): autotrack -> C-FIX (commands.c:893 `CF_SPECTATOR | CF_MATCHLESS`, NO CF_MATCHLESS_ONLY; DoCommand commands.c:1075 `k_matchLess && !(flags & CF_MATCHLESS)` vs 1079 `!k_matchLess && (flags & CF_MATCHLESS_ONLY)` -- CF_MATCHLESS is additive "also valid in matchless", NOT "only outside a match"; no match_in_progress guard in the AutoTrack path; same DEF(AutoTrack)+flags shared by autotrackktx 894 / auto_pow 895). k_teamoverlay -> C-NEAR-MISS ("not in duel/race" has NO enforcing line on the ti team-info stream: SendTeamInfo client.c:4619 gates only client.c:4720 `if (!k_teamoverlay)` + per-client request; the only !isDuel()&&!isRACE() teamoverlay site is match.c:1639, a settings-summary print string, not the stream). k_yawnmode -> TRACED-CLEAN (weapons.c:128 `damage = k_yawnmode ? 50 : 20` axe dmm3; weapons.c:550 non_random_bullets shotgun; bot_items.c:604+ armor; combat.c:902 spike; g_utils.c:2720/2726 backpack/fall -- every quantitative clause maps to an enforcing line; the over-flag control).

## Wave 01 -- canary autotrack expect C-FIX, returned C-FIX (GATE 1 PASS); GATE 2 PASS (re-grep: no batch flags this wave -- all 5 TRACED-CLEAN; clean re-grep arena commands.c:8886 `cvar_fset("k_spw", 1)` + 8852 `if (!isDuel())` "Set on mode first" gate, antilag vote.c:1394 `trap_cvar_set_float("sv_antilag", (float)(cvar("sv_antilag") ? 0 : 2))` 0<->2 flip -- both load-bearing clauses confirmed). Canary row autotrack stripped (control).

RESULT | ktx:command:17fav_go | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | every clause maps to a located enforcing line in xfav_go + command table + DoCommand dispatch; messages quoted verbatim incl. \220 \221 chars; CD_17FAV_GO is CD_NODESC so no name/string flavour-C source.
### ktx:command:17fav_go
- "Spectator-only command / Rejected for non-spectators" -> src/commands.c:882 `{ "17fav_go", DEF(xfav_go), 17, CF_SPECTATOR, CD_17FAV_GO }` + src/commands.c:1091 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) { return DO_WRONG_CLASS; }` (player path src/commands.c:1106) -> MATCH
- "Switches your spectator point of view to track the player stored in favourite slot 17" -> src/commands.c:5856 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p));` (slot index src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];`, arg 17 src/commands.c:882) -> MATCH
- "the slot assigned beforehand with fav17_add" -> src/commands.c:862 `{ "fav17_add", DEF(favx_add), 17, CF_SPECTATOR, CD_FAV17_ADD }` + src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH
- "If slot 17 is empty it prints \"fav go: slot 17 is not defined\" and does nothing" -> src/commands.c:5833-5835 `if ((pl_num < 1) || (pl_num > MAX_CLIENTS)) { G_sprint(self, 2, "fav go: \220slot %d\221 is not defined\n", (int)fav_num);` (src/commands.c:5837 `return;`) -> MATCH
- "if that slot's player has left it prints \"can't find player\"" -> src/commands.c:5842-5844 `if (p->ct != ctPlayer) { G_sprint(self, 2, "fav go: \220slot %d\221 can't find player\n", (int)fav_num);` -> MATCH
- "if you are already tracking that player it prints \"already observing...\"" -> src/commands.c:5849-5851 `if (PROG_TO_EDICT(self->s.v.goalentity) == p) { G_sprint(self, 2, "fav go: already observing...\n");` -> MATCH
- "Takes no arguments" -> src/commands.c:882 (slot is table `arg`=17, no CF_PARAMS; src/commands.c:5821 `void xfav_go(float fav_num)` arg from src/commands.c:1135 `((void (*)(float))(cmds[icmd].f))(cmds[icmd].arg);`) -> MATCH
WI-2: n/a

RESULT | ktx:command:7fav_go | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | identical handler family to 17fav_go (arg 7); all message strings + slot-fill path verified at enforcing lines; CD_7FAV_GO is CD_NODESC so trace-derived not name/string-derived.
### ktx:command:7fav_go
- "Spectator command" -> src/commands.c:872 `{ "7fav_go", DEF(xfav_go), 7, CF_SPECTATOR, CD_7FAV_GO }` + src/commands.c:1091 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) { return DO_WRONG_CLASS; }` -> MATCH
- "switch to tracking (spectating) the player saved in favourite slot 7" -> src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` + src/commands.c:5856 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p));` (arg 7 src/commands.c:872) -> MATCH
- "If slot 7 is empty it reports \"fav go: slot 7 is not defined\"" -> src/commands.c:5835 `G_sprint(self, 2, "fav go: \220slot %d\221 is not defined\n", (int)fav_num);` -> MATCH
- "if the saved player is no longer in the game it reports \"fav go: slot 7 can't find player\"" -> src/commands.c:5844 `G_sprint(self, 2, "fav go: \220slot %d\221 can't find player\n", (int)fav_num);` -> MATCH
- "if you are already tracking that player it reports \"fav go: already observing...\"" -> src/commands.c:5851 `G_sprint(self, 2, "fav go: already observing...\n");` -> MATCH
- "Favourite slots are populated by the corresponding fav add commands" -> src/commands.c:852 `{ "fav7_add", DEF(favx_add), 7, CF_SPECTATOR, CD_FAV7_ADD }` + src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH
WI-2: n/a

RESULT | ktx:command:about | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | every cvar named is read at a located G_sprint line, output target is self, whole function body side-effect-free; only deviation is description omitting mod date/homepage (under-spec, not wrong).
### ktx:command:about
- "Prints a server-information panel to the issuing client" -> src/commands.c:1658 `G_sprint(self, 2, "\n\235\236\237 %s ...` (all output via `G_sprint(self, 2, ...)` to issuing client `self`) -> MATCH
- "QuakeWorld server name/version/build/date/homepage (from the qws_* cvars)" -> src/commands.c:1666 `cvar_string("qws_fullname")` + 1675 `cvar_string("qws_version")` + 1680 `cvar_string("qws_buildnum")` + 1686 `cvar_string("qws_builddate")` + 1691 `cvar_string("qws_homepage")` -> MATCH (Name falls back to `cvar_string("version")` src/commands.c:1670 when qws_fullname empty -- still server name)
- "the running mod's name/version/build (from the qwm_* cvars)" -> src/commands.c:1696 `cvar_string("qwm_fullname")` + 1697 `cvar_string("qwm_version")` + 1700 `cvar_string("qwm_buildnum")` -> MATCH (code also prints qwm_builddate 1704 / qwm_homepage 1705 -- description under-lists, states nothing false)
- "Read-only; changes no game state." -> src/commands.c:1655-1709 body only `G_sprint`/`cvar_string`/`dig3s`/`redtext`/`strlen`; no assignment, no cvar_set, no state mutation -> MATCH
WI-2: n/a

RESULT | ktx:command:antilag | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | vote toggle, veto, 0<->2 flip, broadcast, 2-player gate, in-match read-only each map to a located enforcing line in antilag()/vote_check_antilag(); access frame consistent with CF_PLAYER|CF_SPC_ADMIN.
### ktx:command:antilag
- "Casts or withdraws the issuing player's vote to toggle the server's antilag mode" -> src/vote.c:1436 `self->v.antilag = !self->v.antilag;` + src/vote.c:1442-1444 `(self->v.antilag ? redtext(va("votes for antilag %s", ...)) : redtext(va("withdraws %s antilag vote", g_his(self))))` -> MATCH
- "when enough players vote (or an admin votes, acting as a veto), sv_antilag is flipped between 0 (off) and 2 (on)" -> src/vote.c:1387 `veto = is_admins_vote(OV_ANTILAG);` + 1389 `if (veto || !get_votes_req(OV_ANTILAG, true))` + 1394 `trap_cvar_set_float("sv_antilag", (float)(cvar("sv_antilag") ? 0 : 2));` -> MATCH
- "the new state is announced" -> src/vote.c:1398-1408 `G_bprint(2, "%s\n", redtext(va("Antilag mode %s by admin veto"...)))` / "by majority vote" -> MATCH
- "An admin gets the toggle alone." -> src/vote.c:1387 `veto = is_admins_vote(OV_ANTILAG);` + 1389 + bypasses 2-player gate src/vote.c:1425 `if (!is_adm(self))` -> MATCH
- "With fewer than 2 players a non-admin cannot start it." -> src/vote.c:1425-1433 `if (!is_adm(self)) { if (CountPlayers() < 2) { G_sprint(self, 2, "You need at least 2 players to do this.\n"); return; } }` -> MATCH
- "While a match is in progress it only reports the current antilag mode." -> src/vote.c:1417-1421 `if (match_in_progress) { G_sprint(self, 2, "%s mode %s\n", redtext("Antilag"), OnOff(2 == cvar("sv_antilag"))); return; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:arena | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | toggle+broadcast inside cvar_toggle_msg; duel/rules-change gates, two ra cfg execs, k_spw 1 force each map to a located enforcing line; on-only scoping matched by `if (isRA())` guard.
### ktx:command:arena
- "Toggles Rocket Arena mode on or off by flipping the k_rocketarena cvar" -> src/commands.c:8860 `cvar_toggle_msg(self, "k_rocketarena", redtext("Rocket Arena"));` -> src/g_utils.c:2211 `i = !cvar(cvarName);` + 2218 `trap_cvar_set_float(cvarName, (float) i);` -> MATCH
- "and broadcasting the new state" -> src/g_utils.c:2215 `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg);` (G_bprint broadcast, msg "Rocket Arena") -> MATCH
- "Requires the server to be in duel mode first (Rocket Arena is a duel modifier)" -> src/commands.c:8849-8857 `if (!isRA()) { if (!isDuel()) { G_sprint(self, 2, "Set %s mode first\n", redtext("\223 on \223")); return; } }` + src/arena.c:132 `return (isDuel() && cvar("k_rocketarena"));` -> MATCH
- "and the rules-change to be allowed" -> src/commands.c:8844-8847 `if (!is_rules_change_allowed()) { return; }` -> MATCH
- "When turning it on it also execs the configs/usermodes/1on1/ra/default.cfg and per-map ra config if present" -> src/commands.c:8869-8881 `cfg_name = va("configs/usermodes/%s/ra/default.cfg", um);` (um="1on1") + `if (can_exec(cfg_name)) trap_readcmd(...)` then per-map `ra/%s.cfg` (guarded src/commands.c:8862 `if (isRA())`) -> MATCH
- "and forces safe spawn mode (k_spw 1)" -> src/commands.c:8886 `cvar_fset("k_spw", 1);` (comment 8885 `// avoid spawn bug with safe spawn mode`) -> MATCH
WI-2: n/a

## Wave 02 -- canary k_teamoverlay expect C-NEAR-MISS, returned C-NEAR-MISS (GATE 1 PASS); GATE 2 PASS (re-grep: flagged ctfbasedspawn client.c:1899 `else if (isCTF() && (cvar("k_ctf_based_spawn") == 2))` -> `SelectSpawnPoint(g_random() <= 0.5 ? "info_player_deathmatch" : ... team _deathmatch)` w/ comment "avoid the fish in a barrel problem" -> "strictly within the home base" WRONG, C-FIX confirmed; flagged autotrackktx commands.c:894 `CF_SPECTATOR | CF_MATCHLESS` no CF_MATCHLESS_ONLY -- identical to autotrack canary, same additive-dispatch misread, C-FIX confirmed; clean dm commands.c:2866-2869 `void ShowDMM(void){ G_sprint(self, 2, "Deathmatch %s\n", dig3(deathmatch)); }` whole body one G_sprint). Canary row k_teamoverlay stripped (control).

RESULT | ktx:command:autotrackktx | C-FIX | flavourC=1 | wi2=0 | clauses=6 | spectator-only + best-player + death-delay + persistence + toggle-off map to enforcing lines, but "not while a match is locked" contradicted by dispatch (CF_MATCHLESS additive, no CF_MATCHLESS_ONLY, no match guard in handler or DoCommand) -- wrong clause => C-FIX.
### ktx:command:autotrackktx
- "Spectator-only toggle" -> src/commands.c:894 `{ "autotrackktx", DEF(AutoTrack), atBest, CF_SPECTATOR | CF_MATCHLESS, CD_AUTOTRACKKTX }` + src/commands.c:1088-1094 spec path `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) ...` / player path `if (!(cmds[icmd].cf_flags & CF_PLAYER)) return DO_WRONG_CLASS;` -> MATCH
- "enables KTX's best-player autotracking ... follows the player KTX rates as best to watch" -> src/commands.c:6013-6015 `case atBest: p = get_ed_best1(); break; // ktx's autotrack` (get_ed_best1 -> CalculateBestPlayers src/g_utils.c:2127-2132) -> MATCH
- "rerouted each frame, with a brief delay before switching off a player who just died" -> src/commands.c:6059 `if ((goal->ct == ctPlayer) && ISDEAD(goal) && ((g_globalvars.time - goal->dead_time) < 2)) ... return;` (DoAutoTrack per spectate frame src/spectate.c:386) -> MATCH (2s post-death hold)
- "Issuing it again while this mode is active turns autotracking off" -> src/commands.c:6086-6089 `if ((autoTrackType == self->autotrack) || (autoTrackType == atNone)) { self->autotrack = atNone; // turn off }` -> MATCH
- "Distinct from autotrack (KTeams-Pro) and auto_pow (powerup carriers); persists across map changes" -> src/commands.c:893-895 (autotrack=atKTPRO / auto_pow=atPow / autotrackktx=atBest) + src/commands.c:6097 `SetUserInfo(self, "*at", va("%d", self->autotrack), SETUSERINFO_STAR);` + 6121-6133 AutoTrackRestore (src/spectate.c:225 level change) -> MATCH
- "and not while a match is locked" -> src/commands.c:1069-1143 DoCommand (no match_in_progress / match-lock guard for CF_SPECTATOR|CF_MATCHLESS) + src/commands.c:6081-6119 AutoTrack (no match guard); CF_MATCHLESS additive, CF_MATCHLESS_ONLY absent -> MISMATCH(no enforcing line gates autotrackktx on match-locked / match-in-progress; only is_rules_change_allowed match-lock at src/commands.c:9033-9040 is never called by AutoTrack; classic CF_MATCHLESS flag-name misread -- command IS dispatchable during a live match)
WI-2: n/a

RESULT | ktx:command:cm | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=10 | every refusal/broadcast/index-resolution clause maps to a verified enforcing line in DoSelectMap; only soft spot (k_no_vote_map is matchless-non-bloodfest-only) is still-true traceable vagueness.
### ktx:command:cm
- "Casts/changes a map vote by map list index; one numeric argument = position in server map list" -> src/maps.c:477-484 `SelectMap` (trap_CmdArgv(1) -> DoSelectMap(atoi(arg_1))) + src/maps.c:355-368 `GetMapName(int imp){ if(imp>0){ i=imp-1; if((i>=0)&&(i<maps_cnt)) return mapslist[i]; } }` -> MATCH
- "resolves index to a map name and registers the caller's vote" -> src/maps.c:429 `if (strnull(m = GetMapName(iMap)))` + src/maps.c:472 `self->v.map = k_lastvotedmap = iMap;` -> MATCH
- "broadcasting that the caller suggests / agrees on / would rather play that map" -> src/maps.c:458-470 `if (!get_votes(OV_MAP)) ... "suggests map" ... else if (isVoted) ... "agrees" ... "on" ... "map" ... else ... "would rather play on"` -> MATCH
- "then re-tallying votes" -> src/maps.c:474 `vote_check_map();` -> MATCH
- "Re-voting the same index reports the existing vote is still good" -> src/maps.c:442-447 `if (self->v.map == iMap) { G_sprint(self, 2, "--- your vote is still good ---\n"); return; }` -> MATCH
- "Refused if invoked too soon after map load (7s, or 15s in matchless mode)" -> src/maps.c:399-404 `if ((till = Q_rint((k_matchLess ? 15 : 7) - g_globalvars.time)) > 0) { ... "Wait %d second..."; return; }` -> MATCH
- "while a match is running (or, in matchless non-bloodfest mode, outside countdown)" -> src/maps.c:406-422 `if (k_matchLess && !k_bloodfest) { ... if (match_in_progress != 2) return; } else if (match_in_progress) { return; }` -> MATCH (match_in_progress==2 is countdown)
- "by non-admin spectators" -> src/maps.c:424-427 `if ((self->ct == ctSpec) && !is_adm(self)) { return; } // only admined specs can select map` -> MATCH
- "when map voting is disabled (k_no_vote_map)" -> src/maps.c:408-413 `if (cvar("k_no_vote_map")) { ... "Voting map is not allowed"; return; }` -> MATCH (still-true minor scope vagueness: lives in k_matchLess && !k_bloodfest branch, not a global gate -- but a real enforcing line)
- "when the map is locked (k_lockmap) for non-admins" -> src/maps.c:434-440 `if (cvar("k_lockmap") && !is_adm(self)) { ... "MAP IS LOCKED!..."; return; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:ctfbasedspawn | C-FIX | flavourC=1 | wi2=0 | clauses=6 | toggle / value-1 / CTF-gate / match-gate / force-enable verified, but value-2 "spawn strictly within the home base" wrong vs the only value-2 enforcing line (50% neutral mid-map by design) -- wrong clause => C-FIX.
### ktx:command:ctfbasedspawn
- "Toggles CTF base-spawning on or off" -> src/ctf.c:870 `cvar_toggle_msg(self, "k_ctf_based_spawn", redtext("spawn on base"));` + src/g_utils.c:2211-2218 `i = !cvar(cvarName); ... trap_cvar_set_float(cvarName, (float) i);` -> MATCH (pure 0<->1 toggle)
- "When enabled, players spawn at their own team's base instead of normal deathmatch spawns" -> src/client.c:1891-1895 `if (isCTF() && ((match_start_time == g_globalvars.time) || (cvar("k_ctf_based_spawn") == 1))) { spot = SelectSpawnPoint(streq(getteam(self),"red") ? "info_player_team1" : "info_player_team2"); }` -> MATCH (value 1 = own team base)
- "the read use-sites distinguish value 1 (team/base) from value 2 (spawn strictly within the home base)" -> src/client.c:1899-1904 `else if (isCTF() && (cvar("k_ctf_based_spawn") == 2)) { spot = SelectSpawnPoint(g_random() <= 0.5 ? "info_player_deathmatch" : streq(getteam(self),"red") ? "info_player_team1_deathmatch" : "info_player_team2_deathmatch"); }` (sole value-2 read-site; adjacent comment src/client.c:1896-1898 "Pick between neutral spawn points in the mid of the map and spawn points within home base ... to avoid the fish in a barrel problem") -> MISMATCH(value 2 is NOT "strictly within the home base": 50/50 g_random pick between a NEUTRAL mid-map info_player_deathmatch and a home-base _deathmatch spawn, explicitly to avoid always-base instagibbing; "strictly" contradicts the enforcing line)
- "CTF mode only -- in non-CTF the command refuses with a message" -> src/ctf.c:856-861 `if (!isCTF()) { G_sprint(self, 2, "Can't do this in non CTF mode\n"); return; }` -> MATCH
- "rejected while a match is in progress unless the server is matchless" -> src/ctf.c:851-854 `if (match_in_progress && !k_matchLess) { return; }` -> MATCH
- "on maps with one or fewer normal deathmatch spawn points base-spawn is force-enabled regardless of this setting" -> src/ctf.c:863-868 `if (cvar("k_ctf_based_spawn") && (find_cnt(FOFCLSN, "info_player_deathmatch") <= 1)) { ... "Spawn on base enforced due to map limitation"; return; }` + src/world.c:622-625 `if (!cvar("k_ctf_based_spawn") && (find_cnt(FOFCLSN, "info_player_deathmatch") <= 1)) { cvar_fset("k_ctf_based_spawn", 1); }` -> MATCH
WI-2: n/a

RESULT | ktx:command:dm | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | ShowDMM provably display-only (whole body cited) and the 1-5 range + dmm1..dmm5 mutation path verified at enforcing lines.
### ktx:command:dm
- "Prints the server's current deathmatch mode (the 'deathmatch' cvar value)" -> src/commands.c:2866-2869 `void ShowDMM(void){ G_sprint(self, 2, "Deathmatch %s\n", dig3(deathmatch)); }` (deathmatch is the cvar-backed global) -> MATCH
- "...1-5" -> src/commands.c:2885 `deathmatch = bound(1, (int)dmm, 5);` + src/commands.c:724-729 dmm1..dmm5 rows -> MATCH (mode constrained 1-5 by mutation path)
- "to the player who runs it" -> src/commands.c:2868 `G_sprint(self, 2, ...)` (self = caller, level-2 print) -> MATCH
- "It is display-only and does not change the mode" -> src/commands.c:2866-2869 (entire ShowDMM body single G_sprint; no cvar_set/assignment) -> MATCH
- "the mode is changed by the separate dmm1..dmm5 commands" -> src/commands.c:724-729 `{ "dmm1", DEF(ChangeDM), 1, ... } ... { "dmm5", DEF(ChangeDM), 5, ... }` + src/commands.c:2885-2887 `deathmatch = bound(1,(int)dmm,5); cvar_set("deathmatch", ...)` -> MATCH
WI-2: n/a

RESULT | ktx:command:easyskillmode:frogbot:std | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | subcommand wiring, cvar identity, toggle, curve-select branch, both announce strings/mapping fns, bots-disabled guard map to verified enforcing lines; "default on" verified vs src/world.c RegisterCvarEx("1").
### ktx:command:easyskillmode:frogbot:std
- "Frogbot subcommand (frogbot easyskillmode) ... cvar k_fb_easy_skill_mode, default on" -> src/bot_commands.c:2330 `{ "easyskillmode", FrogbotsSetEasySkillMode, "Toggle easy skill mode" }` + include/fb_globals.h:412 `#define FB_CVAR_EASY_SKILL_MODE "k_fb_easy_skill_mode"` + src/world.c:1068 `RegisterCvarEx(FB_CVAR_EASY_SKILL_MODE, "1");` -> MATCH (registered default "1" => on)
- "toggles ... between on and off and prints the new state" -> src/bot_commands.c:2301-2303 `cvar_fset(FB_CVAR_EASY_SKILL_MODE, !cvar(FB_CVAR_EASY_SKILL_MODE)); G_sprint(self, 2, "easy skill mode changed to %s\n", (int)cvar(FB_CVAR_EASY_SKILL_MODE) ? redtext("on") : redtext("off"));` -> MATCH
- "selects which skill-attribute curve the frogbots use when their skill is (re)applied" -> src/bot_botimp.c:258-277 `SetAttributesBasedOnSkill(int skill){ ... if (FrogbotEasySkillMode()) ... else ... }` (FrogbotEasySkillMode = cvar(FB_CVAR_EASY_SKILL_MODE) src/bot_commands.c:138-141) -> MATCH
- "when on: easy skill-attribute mapping + announces 'Using easy bot skill mode'" -> src/bot_botimp.c:268-271 `if (FrogbotEasySkillMode()) { G_bprint(2, "%s\n", redtext("Using easy bot skill mode")); setSkillAttributesEasySkillMode(skill, aimskill); }` -> MATCH
- "when off: default (harder) mapping + announces 'Using default bot skill mode'" -> src/bot_botimp.c:273-276 `else { G_bprint(2, "%s\n", redtext("Using default bot skill mode")); setSkillAttributes(skill, aimskill); }` -> MATCH ("harder" still-true interpretation of the easy-vs-default split; announce string + distinct mapping fn exact, branch located)
- "Refused if bots are disabled by the server" -> src/bot_commands.c:2297-2300 `if (!bots_enabled()) { G_sprint(self, 2, "Bots are disabled by the server.\n"); return; }` -> MATCH
WI-2: n/a

## Wave 03 -- canary k_yawnmode expect TRACED-CLEAN, returned TRACED-CLEAN (GATE 1 PASS -- over-flag control held, 0 batch over-flags); GATE 2 PASS (re-grep: no batch flags this wave -- all 5 fav*_add TRACED-CLEAN; clean re-grep fav7_add commands.c:852 `{ "fav7_add", DEF(favx_add), 7, CF_SPECTATOR, CD_FAV7_ADD }` -> 5732 `self->favx[(int)fav_num - 1] = diff;` -- favx_add(7) writes favx[6], NOT the discredited generic-fav_add->favx[] claim; the calibration fav-family populate-naming trap is explicitly cleared for these favN_add populators). Canary row k_yawnmode stripped (control).

RESULT | ktx:command:fav20_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | all 5 clauses map to favx_add/xfav_go enforcing lines; handler is favx_add(20) not fav_add, behavior matches favx_add exactly.
### ktx:command:fav20_add
- "Spectator command" -> src/commands.c:865 `{ "fav20_add", DEF(favx_add), 20, CF_SPECTATOR, CD_FAV20_ADD },` (enforced src/commands.c:1091 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) return DO_WRONG_CLASS;`) -> MATCH
- "Stores the player you are currently tracking into indexed favourite slot 20" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (fav_num=20 via DoCommand src/commands.c:1135 `((void (*)(float))(cmds[icmd].f))(cmds[icmd].arg);`; diff = goalentity index src/commands.c:5715-5716) -> MATCH
- "Does nothing unless you are tracking a real player" -> src/commands.c:5723 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)) { G_sprint(self, 2, "fav add: you are %s player!\n", redtext("not tracking")); return; }` -> MATCH
- "the tracked player's identity is written to slot 20 (overwriting any previous occupant)" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (unconditional array write, no prior-occupant check) -> MATCH
- "20fav_go later snaps your POV to whoever occupies that slot" -> src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` then src/commands.c:5856 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p));` (20fav_go = DEF(xfav_go) arg 20 src/commands.c:885) -> MATCH
WI-2: n/a

RESULT | ktx:command:fav6_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | identical structure to fav20_add; favx_add(6)/xfav_go(6) enforce every clause; CF_SPECTATOR only, no admin requirement.
### ktx:command:fav6_add
- "Spectator command" -> src/commands.c:851 `{ "fav6_add", DEF(favx_add), 6, CF_SPECTATOR, CD_FAV6_ADD },` (enforced src/commands.c:1091; no CF_SPC_ADMIN so no admin gate) -> MATCH
- "Stores the player you are currently tracking into indexed favourite slot 6" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (fav_num=6 via DoCommand src/commands.c:1135; diff = goalentity index src/commands.c:5715-5716) -> MATCH
- "Does nothing unless you are tracking a real player" -> src/commands.c:5723 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)) { ... return; }` -> MATCH
- "the tracked player's identity is written to slot 6 (overwriting any previous occupant)" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (unconditional overwrite) -> MATCH
- "6fav_go later snaps your POV to whoever occupies that slot" -> src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` + src/commands.c:5856 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p));` (6fav_go = DEF(xfav_go) arg 6 src/commands.c:871) -> MATCH
WI-2: n/a

RESULT | ktx:command:fav7_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | peer of fav6_add/fav20_add; favx_add(7)/xfav_go(7) enforce every clause exactly.
### ktx:command:fav7_add
- "Spectator command" -> src/commands.c:852 `{ "fav7_add", DEF(favx_add), 7, CF_SPECTATOR, CD_FAV7_ADD },` (enforced src/commands.c:1091) -> MATCH
- "Stores the player you are currently tracking into indexed favourite slot 7" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (fav_num=7 via src/commands.c:1135) -> MATCH
- "Does nothing unless you are tracking a real player" -> src/commands.c:5723 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)) { ... return; }` -> MATCH
- "the tracked player's identity is written to slot 7 (overwriting any previous occupant)" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (unconditional overwrite) -> MATCH
- "7fav_go later snaps your POV to whoever occupies that slot" -> src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` + src/commands.c:5856 `stuffcmd_flags(...,"track %d\n", GetUserID(p));` (7fav_go = DEF(xfav_go) arg 7 src/commands.c:873) -> MATCH
WI-2: n/a

RESULT | ktx:command:fav8_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | peer of fav6/fav7/fav20; favx_add(8)/xfav_go(8) enforce every clause exactly.
### ktx:command:fav8_add
- "Spectator command" -> src/commands.c:853 `{ "fav8_add", DEF(favx_add), 8, CF_SPECTATOR, CD_FAV8_ADD },` (enforced src/commands.c:1091) -> MATCH
- "Stores the player you are currently tracking into indexed favourite slot 8" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (fav_num=8 via src/commands.c:1135) -> MATCH
- "Does nothing unless you are tracking a real player" -> src/commands.c:5723 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)) { ... return; }` -> MATCH
- "the tracked player's identity is written to slot 8 (overwriting any previous occupant)" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (unconditional overwrite) -> MATCH
- "8fav_go later snaps your POV to whoever occupies that slot" -> src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` + src/commands.c:5856 `stuffcmd_flags(...,"track %d\n", GetUserID(p));` (8fav_go = DEF(xfav_go) arg 8 src/commands.c:874) -> MATCH
WI-2: n/a

RESULT | ktx:command:fav9_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | peer of fav6/fav7/fav8/fav20; favx_add(9)/xfav_go(9) enforce every clause exactly.
### ktx:command:fav9_add
- "Spectator command" -> src/commands.c:854 `{ "fav9_add", DEF(favx_add), 9, CF_SPECTATOR, CD_FAV9_ADD },` (enforced src/commands.c:1091) -> MATCH
- "Stores the player you are currently tracking into indexed favourite slot 9" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (fav_num=9 via src/commands.c:1135) -> MATCH
- "Does nothing unless you are tracking a real player" -> src/commands.c:5723 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)) { ... return; }` -> MATCH
- "the tracked player's identity is written to slot 9 (overwriting any previous occupant)" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (unconditional overwrite) -> MATCH
- "9fav_go later snaps your POV to whoever occupies that slot" -> src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` + src/commands.c:5856 `stuffcmd_flags(...,"track %d\n", GetUserID(p));` (9fav_go = DEF(xfav_go) arg 9 src/commands.c:875) -> MATCH
WI-2: n/a

## Wave 04 -- canary autotrack expect C-FIX, returned C-FIX (GATE 1 PASS); GATE 2 PASS (re-grep: flagged health:frogbot:std sole apply-site client.c:2236 `self->s.v.health = self->isBot ? FrogbotHealth() : 250;` gated by `(deathmatch == 4 || k_bloodfest) && (match_in_progress == 2)` + `tot_mode_enabled()` -- "when bots are added" scope-inflated vs TOT-only apply-site, C-NEAR-MISS confirmed; clean hoonymode commands.c:4234-4248 preset string block + freshtime commands.c:7689-7702 cascade). Canary row autotrack stripped (control).

RESULT | ktx:command:freshtime | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | every clause maps to its enforcing line; registered default verified =20 via RegisterCvarEx.
### ktx:command:freshtime
- "Cycles the FreshTeams weapon respawn time (the k_freshteams_weapon_time server cvar)" -> src/items.c:809-812 `int k_freshteams = cvar("k_freshteams"); ... int weapon_time = k_freshteams ? cvar("k_freshteams_weapon_time") : 30;` + src/items.c:1061 `self->s.v.nextthink = g_globalvars.time + weapon_time;` -> MATCH
- "through 20, 15, and 10 seconds. Each invocation steps to the next value" -> src/commands.c:7689-7702 if/elseif/else cascade on k_freshtime -> MATCH
- "from 20 it sets 15" -> src/commands.c:7689-7692 `if (k_freshtime == 20) { cvar_set("k_freshteams_weapon_time", "15"); ... }` -> MATCH
- "from 15 it sets 10" -> src/commands.c:7694-7697 `else if (k_freshtime == 15) { cvar_set("k_freshteams_weapon_time", "10"); ... }` -> MATCH
- "from any other value it resets to 20 (the default); the chosen value is broadcast" -> src/commands.c:7699-7702 `else { cvar_set("k_freshteams_weapon_time", "20"); G_bprint(2, "%s 20 second weapons (default)\n", ...); }` + default src/world.c:895 `RegisterCvarEx("k_freshteams_weapon_time", "20");` -> MATCH
- "FreshTeams must already be enabled (the /fresh command)" -> src/commands.c:7682-7687 `if (!k_freshteams) { G_sprint(self, 2, "FreshTime requires FreshTeams (/fresh)\n"); return; }` -> MATCH
- "it also refuses to run while a match is in progress or while race mode is active" -> src/commands.c:7676-7679 `if (!is_rules_change_allowed()) { return; }` -> src/commands.c:9033-9051 `is_rules_change_allowed() { if (match_in_progress) {...return false;} if (isRACE()) {...return false;} return true; }` -> MATCH
WI-2: n/a (only metadata claim, default 20, correct vs RegisterCvarEx)

RESULT | ktx:command:health:frogbot:std | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=4 | clamp/usage/refusal clauses trace clean, but the headline "spawn health ... when they are added" is enforced only by a TOT-mode/dmm4-bloodfest-gated apply-site, far narrower than the unconditional framing -> C-NEAR-MISS.
### ktx:command:health:frogbot:std
- "Frogbot (standard botcmd) subcommand" -> src/bot_commands.c:2315-2330 `static frogbot_cmd_t std_commands[] = { ... { "health", FrogbotsSetHealth, "Set initial health for the bot" }, ... }` -> MATCH
- "sets the initial spawn health given to bots when they are added" -> src/client.c:2236 `self->s.v.health = self->isBot ? FrogbotHealth() : 250;` (the ONLY apply-site tree-wide; FrogbotHealth() = cvar(FB_CVAR_HEALTH) src/bot_commands.c:118-120) -> MISMATCH(scope materially narrower than implied: this apply-site is gated by src/client.c:2183 `if ((deathmatch == 4 || k_bloodfest) && (match_in_progress == 2))` then src/client.c:2227 `else if (tot_mode_enabled())` -- applied ONLY in TOT mode during a dmm4/bloodfest match countdown, NOT generally "when bots are added"; no general bot-add health apply-site exists)
- "Takes one integer argument clamped to the range 1-300" -> src/bot_commands.c:2174-2175 `trap_CmdArgv(2, argument, sizeof(argument)); new_health = bound(1, atoi(argument), 300);` -> MATCH
- "Called with no value it prints the usage, the allowed range, and the current setting instead of changing it" -> src/bot_commands.c:2162-2167 `if (trap_CmdArgc() <= 2) { G_sprint(...,"Usage: /botcmd  health <health>\n"); G_sprint(...,"<health> must be in range %d and %d\n", 1, 300); G_sprint(...,"health is currently \"%d\"\n", FrogbotHealth()); }` -> MATCH
- "Refused when bots are disabled on the server" -> src/bot_commands.c:2156-2160 `if (!bots_enabled()) { G_sprint(self, 2, "Bots are disabled by the server.\n"); return; }` -> MATCH
WI-2: n/a (no default-value claim; registered default is in fact 100 via src/world.c:1063 `RegisterCvarEx(FB_CVAR_HEALTH, "100")`, but description states no default/class -- no WI-2 defect)

RESULT | ktx:command:hook_classic | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | vote toggle, majority/veto trigger, exact value 3, announce, CTF-only, match guard each map to a verified enforcing line.
### ktx:command:hook_classic
- "CTF vote command: casts (or, if already cast, withdraws) your vote" -> src/vote.c:1303 `self->v.hookclassic = !self->v.hookclassic;` -> MATCH
- "to switch the grappling-hook style to classic" -> src/vote.c:1318-1319 sets k_ctf_hookstyle 3 then "hook style set to classic" -> MATCH
- "When a majority is reached or an admin vetoes" -> src/vote.c:1314-1316 `veto = is_admins_vote(OV_HOOKCLASSIC); if (veto || !get_votes_req(OV_HOOKCLASSIC, true))` -> MATCH
- "the server sets the hook style to classic (k_ctf_hookstyle = 3)" -> src/vote.c:1318 `cvar_fset("k_ctf_hookstyle", 3);` (corroborated grapple.c:212/443/464 branching on ==3) -> MATCH
- "and announces it" -> src/vote.c:1319 `G_bprint(2, "%s\n", redtext(va("hook style set to classic by %s", veto ? "admin veto" : "majority vote")));` -> MATCH
- "Only usable in CTF mode" -> src/vote.c:1292-1297 `if (!isCTF()) { G_sprint(self, 2, "hook style can only be set in CTF mode\n"); return; }` -> MATCH
- "and not while a match is in progress" -> src/vote.c:1285-1290 `if (match_in_progress) { G_sprint(self, 2, "hook style can not be changed while match is in progress\n"); return; }` (real in-function guard, independent of CF_MATCHLESS flag commands.c:919) -> MATCH
WI-2: n/a

RESULT | ktx:command:hoonymode | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=12 | all 9 cvar settings + common-reset-first ordering + auto-select + other-mode block + 1v1-rounds framing each trace to a verified enforcing line.
### ktx:command:hoonymode
- "Applies the HoonyMode game-mode preset" -> src/commands.c:816 `{ "hoonymode", DEF(UserMode), 8, CF_PLAYER|CF_SPC_ADMIN|CF_PARAMS, CD_1ON1HM }` + src/commands.c:4544 `{ "hoonymode", "HoonyMode", _1on1hm_um_init, UM_1ON1HM, 0 }` -> MATCH
- "a 1-versus-1 duel variant played as a series of spawn-toggled rounds rather than a single timed game" -> src/commands.c:4234-4237 (`maxclients 2`, `fraglimit 1 // every 1 frag we toggle spawns`, `timelimit 0`) + src/hoonymode.c:92-94 `isHoonyModeAny() { return cvar("k_hoonymode"); }` + hoonymode.c:104 k_hoonyrounds + hoonymode.c:109 HM_initialise_rounds -> MATCH
- "Sets it to 2 players (maxclients/k_maxclients 2)" -> src/commands.c:4234-4235 `"maxclients 2\n" "k_maxclients 2\n"` -> MATCH
- "enables hoonymode (k_hoonymode 1)" -> src/commands.c:4238 `"k_hoonymode 1\n"` -> MATCH
- "with 12 rounds (k_hoonyrounds 12)" -> src/commands.c:4239 `"k_hoonyrounds 12\n"` -> MATCH
- "uses fraglimit 1 so spawns toggle after every frag" -> src/commands.c:4236 `"fraglimit 1\n" // hoonymode - every 1 frag we toggle spawns` -> MATCH
- "sets timelimit 0 (round-based, not timed)" -> src/commands.c:4237 `"timelimit 0\n"` -> MATCH
- "teamplay 0 and deathmatch 3 (base mode -- weapons stay)" -> src/commands.c:4240-4241 `"teamplay 0\n" "deathmatch 3\n" // weapons stay` -> MATCH
- "disables powerups (k_pow 0)" -> src/commands.c:4244 `"k_pow 0\n"` -> MATCH
- "sets the internal game mode to k_mode 1" -> src/commands.c:4248 `"k_mode 1\n"` -> MATCH
- "The shared common reset runs first" -> src/commands.c:4796-4800 `trap_readcmd(common_um_init, buf, sizeof(buf)); ... trap_readcmd(um_list[(int)umode].initstring, buf, sizeof(buf));` (common before initstring) -> MATCH
- "This preset is also auto-selected and other UserMode commands are blocked when the map is hoonymode-only" -> src/world.c:556-560 `if (world->hoony_timelimit || !strnull(world->hoony_defaultwinner)) { UserMode(-8); HM_initialise_rounds(); }` + src/commands.c:4645-4650 `if (world->hoony_timelimit || !strnull(world->hoony_defaultwinner)) { G_sprint(self, 2, "This map is designed for hoonymode only\n"); return; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:kick | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | every clause (admin gate, arg-kick, reason broadcast, session start/y/n/exit, non-admin message) traces to a verified line; player+spectator+admin-only access verified via Init_cmds flag expansion + DoCommand admin enforcement, not name-inferred.
### ktx:command:kick
- "Admin-only client kick" -> src/admin.c:123-128 `if (!is_adm(self)) { G_sprint(self, 2, "You are not an admin\n"); return; }` -> MATCH
- "With an id/name argument, kicks that connected or named client immediately" -> src/admin.c:137-157 `if (argc >= 2) { ... if (!(p = SpecPlayer_by_IDorName(arg_2)) && !(p = not_connected_by_IDorName(arg_2))) {...} if (DoKick(p, self) ...) }` + src/admin.c:82-116 DoKick -> `stuffcmd(victim,"disconnect\n"); localcmd("addip %s ban +30\n",...)` -> MATCH
- "and, if a trailing reason is given, broadcasts it" -> src/admin.c:151-154 `if (DoKick(p, self) && !strnull(str = params_str(2, -1))) { G_bprint(2, "\x90%s\x91\n", str); }` -> MATCH
- "With no argument, starts an interactive kick session that walks through clients" -> src/admin.c:159-170 "Kicking process started", `self->k_kicking = g_globalvars.time; self->k_playertokick = world; NextClient();` -> MATCH
- "'y' kicks the highlighted client" -> src/commands.c:796 `{ "y", YesKick, 0, CF_BOTH_ADMIN, CD_Y }` + src/admin.c:264-284 YesKick `if (DoKick(self->k_playertokick, self) ...) ... NextClient();` -> MATCH
- "'n' advances to the next" -> src/commands.c:797 `{ "n", DontKick, 0, CF_BOTH_ADMIN, CD_N }` + src/admin.c:286-294 DontKick `if (!self->k_kicking) return; NextClient();` -> MATCH
- "'kick' again leaves the session" -> src/admin.c:130-135 `if (self->k_kicking) { ExitKick(self); return; }` + src/admin.c:44-58 ExitKick `kicker->k_kicking = 0; ... "Kicking process terminated"` -> MATCH
- "Non-admins are told \"You are not an admin\"" -> src/admin.c:124-127 `G_sprint(self, 2, "You are not an admin\n");` -> MATCH
- "Available to players and spectators (admin only)" -> src/commands.c:794 `{ "kick", AdminKick, 0, CF_BOTH_ADMIN..., CD_KICK }` + src/commands.c:1443-1451 Init_cmds `if (cf_flags & CF_PLR_ADMIN) cf_flags |= CF_PLAYER; if (cf_flags & CF_SPC_ADMIN) cf_flags |= CF_SPECTATOR;` -> DoCommand class checks pass for player AND spectator, then admin required (commands.c:1111/1096) -> MATCH
WI-2: access class "players and spectators (admin only)" CORRECT -- CF_BOTH_ADMIN expands to CF_PLAYER|CF_SPECTATOR at Init_cmds + gates on is_adm; no default-value claim.

<!-- ROUND 1 ACCEPTED: waves 01,02,03,04 = 20 batch rows, 0 rejected/redispatched. Tally after Round 1: TRACED-CLEAN 17 | C-NEAR-MISS 1 (health:frogbot:std) | C-FIX 2 (autotrackktx, ctfbasedspawn) | WI2-FIX 0 | flavourC-positive 3/20. -->
## Wave 06 -- canary k_yawnmode expect TRACED-CLEAN, returned TRACED-CLEAN (GATE 1 PASS -- over-flag control held); GATE 2 PASS (re-grep: flagged prewar admin.c case-0 `if (!match_in_progress) { G_bprint(...); PlayersStopFire(); } else { G_sprint(self,...); }` confirms "any current firing is stopped" + "announced to all players" are both !match_in_progress-gated, C-NEAR-MISS correct; clean swapall commands.c:925 `{ "swapall", SwapAll, 0, CF_PLAYER | CF_SPC_ADMIN, CD_SWAPALL }` + 6649 "No swapall when captain stuffing" / 6656 "No swapall when coach stuffing" / 6661 `self->v.swapall = !self->v.swapall;`). Canary row k_yawnmode stripped (control).

RESULT | ktx:command:prewar | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=6 | core cycle/state semantics correct, but two clauses ("any current firing is stopped" for state 0; "announced to all players") are unconditional in the description while the enforcing code gates both on !match_in_progress -- code narrower/more conditional than implied.
### ktx:command:prewar
- "cycles the pre-match firing rule (server cvar k_prewar) through three states 0 -> 1 -> 2 -> 0 on each invocation" -> src/admin.c:795,802-805,846 `int k_prewar = bound(0, cvar("k_prewar"), 2);` / `if (++k_prewar > 2) { k_prewar = 0; }` / `cvar_fset("k_prewar", k_prewar);` -> MATCH
- "0 = players may not fire before the match (and any current firing is stopped)" -> src/admin.c:834-838 `if (!match_in_progress) { G_bprint(2, "Players may %s fire before match\n", redtext("not")); PlayersStopFire(); }` -> MISMATCH(PlayersStopFire() for state 0 is gated on !match_in_progress; description states "(and any current firing is stopped)" unconditionally for state 0 while the state-2 parenthetical correctly scopes "out of a match" -- state-0 stop is equally match-gated but the clause omits that scope, narrower in code than implied)
- "1 = players may fire before the match" -> src/admin.c:809-818 `case 1: ... G_bprint(2, "Players may fire before match\n"); ... break;` (no PlayersStopFire) -> MATCH
- "2 = players may fire and jump even while readied (current firing is stopped when the state is entered out of a match)" -> src/admin.c:820-830 `case 2: if (!match_in_progress) { G_bprint(2, "Players may fire and jump when %s\n", redtext("ready")); PlayersStopFire(); } else { G_sprint(self, ...); }` -> MATCH (PlayersStopFire scoped to !match_in_progress, exactly as the parenthetical states)
- "Each change is announced to all players" -> src/admin.c:812,816,823,828,836,841 `G_bprint(2, ...)` only when !match_in_progress; `G_sprint(self, 2, ...)` when match_in_progress -> MISMATCH(broadcast to all players happens ONLY out of a match; during a live match every state change is a private G_sprint to the caller only, so "announced to all players" is broader than the code)
- "Only an admin may run it; non-admins are ignored" -> src/admin.c:797-800 `if (!is_adm(self)) { return; }` + table flag CF_BOTH_ADMIN src/commands.c:755 + admin gate src/commands.c:1111 -> MATCH (silent return = "ignored")
RATIONALE: core cycle/state semantics correct, but two clauses unconditional in the description while the enforcing code gates both behaviors on !match_in_progress.
WI-2: n/a

RESULT | ktx:command:quadmultiplier:frogbot:std | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | every clause incl the clamp range, the ToT/dmm4 gate polarity, and the registered default (4) maps to a located enforcing line and matches.
### ktx:command:quadmultiplier:frogbot:std
- "Frogbots subcommand (used as /botcmd quadmultiplier <multiplier>)" -> src/bot_commands.c:2255,2328 `G_sprint(self, 2, "Usage: /botcmd quadmultiplier <multiplier>\n");` / `{ "quadmultiplier", FrogbotsSetQuadMultiplier, "Set quad damage multiplier" }` -> MATCH
- "sets the quad-damage multiplier applied to bots, clamped to the integer range 1-10, by writing the k_fb_quad_multiplier cvar (default 4)" -> src/bot_commands.c:2266,2270 `new_multiplier = bound(1, atoi(argument), 10);` / `cvar_fset(FB_CVAR_QUAD_MULTIPLIER, new_multiplier);` (FB_CVAR_QUAD_MULTIPLIER == "k_fb_quad_multiplier" include/fb_globals.h:410; default src/world.c:1066 `RegisterCvarEx(FB_CVAR_QUAD_MULTIPLIER, "4");`) -> MATCH
- "The value only takes effect while ToT mode is enabled and the map is deathmatch 4; in that case quad damage is multiplied by this value instead of the hard-coded x8" -> src/combat.c:545 `damage *= (deathmatch != 4 ? 4 : tot_mode_enabled() ? FrogbotQuadMultiplier() : 8);` -> MATCH (FrogbotQuadMultiplier consulted only in deathmatch==4 && tot_mode_enabled() branch; comment src/combat.c:543 "in dmm4 quad is octa actually, unless tot_mode_enabled()")
- "Outside ToT mode the quad multiplier is fixed (x4 normally, x8 in dmm4) and this setting has no effect" -> src/combat.c:545 `(deathmatch != 4 ? 4 : tot_mode_enabled() ? FrogbotQuadMultiplier() : 8)` -> MATCH (deathmatch!=4 => 4; deathmatch==4 && !tot => 8)
- "With no argument it prints usage and the current value" -> src/bot_commands.c:2253-2257 `if (trap_CmdArgc() <= 2) { G_sprint(... "Usage: ..."); G_sprint(... "multiplier is currently \"%d\"", FrogbotQuadMultiplier()); }` -> MATCH
- "No-op if bots are disabled on the server" -> src/bot_commands.c:2247-2251 `if (!bots_enabled()) { G_sprint(self, 2, "Bots are disabled by the server.\n"); return; }` -> MATCH
WI-2: default = "4" confirmed at src/world.c:1066 `RegisterCvarEx(FB_CVAR_QUAD_MULTIPLIER, "4");` -- matches description.

RESULT | ktx:command:spawnicide | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | enum values, prewar/match activation windows, wrap, in-match no-op, and the kill-on-linger purpose all map to located enforcing lines; "announces" is caller-scoped but the clause makes no broadcast claim.
### ktx:command:spawnicide
- "Cycles the spawnicide mode (k_spawnicide), which kills a player who lingers on a spawn point so respawns are not blocked" -> src/commands.c:2736,2743-2749 `int spawnicide = cvar("k_spawnicide"); ... spawnicide++; ... cvar_set("k_spawnicide", va("%d", spawnicide));` + kill site src/items.c:3073-3076 `if (ISLIVE(p)) { p->deathtype = dtTELE4; T_Damage(p, p, p, 50000); }` (SpawnicideTouch on spawn points, skips bots and <1s-since-spawn/teleport) -> MATCH
- "and announces the new mode" -> src/commands.c:2764,2768,2771 `G_sprint(self, 2, "Spawnicide %s\n", redtext("off"|"prewar"|"match"))` -> MATCH (caller-scoped; clause asserts no broadcast)
- "The mode advances through: 0 = off, 1 = prewar (active only before the match starts), 2 = match (active during the match)" -> include/g_local.h:1277-1279 `#define SPAWNICIDE_DISABLED 0` / `_PREWAR 1` / `_MATCH 2`; PREWAR enable src/world.c:699-702; MATCH enable src/match.c:1251-1257; torn down src/match.c:482-484 -> MATCH
- "Advancing past match wraps back to off" -> src/commands.c:2744-2747 `if (spawnicide > SPAWNICIDE_MATCH) { spawnicide = SPAWNICIDE_DISABLED; }` -> MATCH
- "Has no effect while a match is in progress" -> src/commands.c:2738-2741 `if (match_in_progress) { return; }` -> MATCH
WI-2: n/a (RegisterCvar("k_spawnicide") src/world.c:857 => default 0; no default/access claim)

RESULT | ktx:command:suggestcolor | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | all nine clauses (election-start, usage, 0-16 clamp, 3-player floor, single-election, per-caller cooldown, spec+match block, no-self-target, re-run abort) map to located enforcing lines and match exactly.
### ktx:command:suggestcolor
- "Starts an election proposing that one or more named players adopt a specified shirt/pants color" -> src/vote.c:1786-1793 `self->v.elect = 1; self->v.elect_type = etSuggestColor; electguard = spawn(); ... electguard->s.v.nextthink = g_globalvars.time + 60;` + apply src/vote.c:1805-1807 `G_bprint(2, "Setting color %d %d on %s\n", ...); stuffcmd_flags(p, ..., "color %d %d\n", ...)` -> MATCH
- "Usage: suggestcolor <top color> <bottom color> <name or user id>..." -> src/vote.c:1715-1718 `if (argc < 4) { G_sprint(self, 2, "suggestcolor <top color> <bottom color> <name / user id>...\n"); return; }` -> MATCH
- "the top and bottom color numbers are clamped to 0-16" -> src/vote.c:1724,1727 `suggestcolor.top = bound(0, atoi(temp), 16);` / `suggestcolor.bottom = bound(0, atoi(temp), 16);` -> MATCH
- "Requires at least 3 players" -> src/vote.c:1697-1701 `if (CountPlayers() < 3) { G_sprint(self, 2, "Not enough players\n"); return; }` -> MATCH
- "and no other election already running" -> src/vote.c:1703-1707 `if (get_votes(OV_ELECT)) { G_sprint(self, 2, "An election is already in progress\n"); return; }` -> MATCH
- "and is subject to the caller's election cooldown" -> src/vote.c:1709-1713 `if ((till = Q_rint(self->v.elect_block_till - g_globalvars.time)) > 0) { G_sprint(self, 2, "Wait %d second%s!\n", ...); return; }` -> MATCH
- "Spectators cannot use it while a match is in progress" -> src/vote.c:1685-1688 `if (self->ct == ctSpec && match_in_progress) { return; }` -> MATCH (table flag src/commands.c:805 CF_PLAYER|CF_PARAMS additionally; no over-claim)
- "and a player cannot target themselves" -> src/vote.c:1741-1745 `else if (p == self) { G_bprint(2, "You can't suggest a color for yourself\n"); return; }` -> MATCH
- "If the initiator runs the command again while their own color election is active, the election is aborted" -> src/vote.c:1690-1695 `if (is_elected(self, etSuggestColor)) { G_bprint(2, "%s %s!\n", self->netname, redtext("aborts election")); AbortElect(); return; }` -> MATCH
WI-2: n/a (no default claim; CF_PLAYER table flag + in-handler spec/match guard consistent)

RESULT | ktx:command:swapall | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | vote-toggle, CTF-only, match block, captain/coach block, broadcast-with-count, and the threshold-then-swap mechanism all map to located enforcing lines with verified polarity.
### ktx:command:swapall
- "Casts (or withdraws) the calling player's vote to swap every player to the opposing team" -> src/commands.c:6661 `self->v.swapall = !self->v.swapall;` + swap src/vote.c:1650-1660 `for (p = world; (p = find_plr(p));) { if (streq(getteam(p), "blue")) stuffcmd_flags(p, ..., "team \"red\"\ncolor 4\n"); else if (streq(getteam(p), "red")) stuffcmd_flags(p, ..., "team \"blue\"\ncolor 13\n"); }` -> MATCH
- "CTF-only" -> src/commands.c:6642-6645 `if (!isCTF()) { return; }` -> MATCH
- "and unavailable while a match is in progress" -> src/commands.c:6637-6640 `if (match_in_progress) { return; }` (also src/vote.c:1625 `if (match_in_progress || k_captains || k_coaches) { return; }`) -> MATCH
- "and refused while captain or coach team-picking is active" -> src/commands.c:6647-6652 `if (k_captains) { G_sprint(self, 2, "No swapall when captain stuffing\n"); return; }` + 6654-6659 `if (k_coaches) { G_sprint(self, 2, "No swapall when coach stuffing\n"); return; }` -> MATCH
- "Each call toggles the player's swapall vote and broadcasts the vote (with the running count)" -> src/commands.c:6661-6670 `self->v.swapall = !self->v.swapall; G_bprint(2, "%s %s!%s\n", self->netname, (self->v.swapall ? redtext(va("votes for swapall")) : redtext(va("withdraws %s swapall vote", g_his(self)))), ((votes = get_votes_req(OV_SWAPALL, true)) ? va(" (%d)", votes) : ""));` -> MATCH
- "once enough players have voted, all players are swapped between the two teams" -> src/vote.c:1637-1660 `if (veto || !get_votes_req(OV_SWAPALL, true)) { ... for(...) swap blue<->red }` (get_votes_req diff=true => 0 when satisfied; OV_SWAPALL floor max(3,vt_req) src/vote.c:379-381) -> MATCH (polarity verified)
WI-2: n/a (no default or access-class claim)

## Wave 07 -- canary autotrack expect C-FIX, returned C-FIX (GATE 1 PASS); GATE 2 PASS (re-grep: no batch flags this wave -- all 5 TRACED-CLEAN; clean re-grep time20 commands.c:766 `{ "time20", DEF(TimeSet), 20.0f, CF_PLAYER | CF_SPC_ADMIN, CD_TIME20 }` + TimeSet body commands.c:3017 [bound(0,t,k_timetop)/match_in_progress/broadcast], plus subagent exhaustive trace of whovote 11-category + wipeout 16-cvar preset). Canary row autotrack stripped (control).

RESULT | ktx:command:time | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | every clause maps to a located enforcing line; format string and single-target SPrint exactly match; "server local time" grounded in offset=0 argument.
### ktx:command:time
- "Prints the current server date and time privately to the player who issued it" -> src/commands.c:7905-7907 `if (QVMstrftime(date, sizeof(date), "%a %b %d, %H:%M:%S %Y", 0)) { G_sprint(self, 2, "%s\n", date); }` -> src/g_utils.c:762 `trap_SPrint(NUM_FOR_EDICT(ed), level, text, 0);` (single-client print to self) -> MATCH
- "formatted as weekday, month, day, then HH:MM:SS and year" -> src/commands.c:7905 format `"%a %b %d, %H:%M:%S %Y"` -> MATCH
- "(server local time)" -> src/commands.c:7905 `QVMstrftime(..., 0)` last arg offset=0 (src/g_syscalls.c:437); offset 0 = unshifted server clock (same convention src/commands.c:6968) -> MATCH (still-true minor vagueness; exact local/UTC is host-engine syscall, offset=0 is the traceable enforcing fact)
- "It takes no arguments and changes no game state" -> src/commands.c:7901-7909 (body reads no params, no state mutation; only QVMstrftime + G_sprint) -> MATCH
WI-2: n/a

RESULT | ktx:command:time20 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | all five clauses (set-to-20, clamp 0..k_timetop, ignored in match, unchanged-report, broadcast) map to verified enforcing lines in TimeSet.
### ktx:command:time20
- "Sets the match timelimit to 20 minutes" -> src/commands.c:766 `{ "time20", DEF(TimeSet), 20.0f, ... }` + src/commands.c:3026 `timelimit = bound(0, t, cvar("k_timetop"));` (t=20.0f) -> MATCH
- "The requested value is clamped to the range 0..k_timetop, so it takes effect only if k_timetop is at least 20" -> src/commands.c:3026 `timelimit = bound(0, t, cvar("k_timetop"));` (k_timetop < 20 => result = k_timetop) -> MATCH
- "The command is ignored while a match is in progress" -> src/commands.c:3021-3024 `if (match_in_progress) { return; }` -> MATCH
- "if the timelimit is already at the resulting value it reports it as unchanged" -> src/commands.c:3019,3028-3033 `int tl = timelimit; ... if (tl == timelimit) { G_sprint(self, 2, "%s still %s\n", redtext("timelimit"), dig3(timelimit)); return; }` -> MATCH
- "otherwise it broadcasts the new match length to everyone" -> src/commands.c:3035-3037 `cvar_fset("timelimit", (int)timelimit); G_bprint(2, "%s %s %s%s\n", redtext("Match length set to"), ...)` -> MATCH
WI-2: n/a

RESULT | ktx:command:toggleready | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=3 | all three clauses (already-ready->break, else->ready immediately, race-mode->race toggle) map to verified enforcing lines; "immediately" accurate for the per-player ready-state assignment.
### ktx:command:toggleready
- "if the player is already ready it cancels ready (breaks)" -> src/commands.c:7974-7977 `if (self->ready) { PlayerBreak(); }` -> src/match.c:3029-3033 `if (!match_in_progress) { self->ready = 0; G_bprint(2, "%s %s\n", self->netname, redtext("is not ready")); return; }` -> MATCH
- "otherwise it readies the player up immediately" -> src/commands.c:7978-7981 `else { PlayerFastReady(); }` -> src/match.c:2965-2967 `void PlayerFastReady(void) { PlayerReady(true); }` -> src/match.c:2864 `self->ready = 1;` (true/false arg only gates IdlebotCheck match.c:2912-2915, not a delay) -> MATCH
- "In race mode it instead toggles the player's race ready/break state" -> src/commands.c:7968-7972 `if (isRACE()) { r_changestatus(3); return; }` -> src/race.c:3050-3057 `case 3: ... set_player_race_ready(self, !self->race_ready);` (literal toggle) -> MATCH
WI-2: n/a

RESULT | ktx:command:whovote | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | 11-category list exhaustively verified against 11 print blocks; count/required/voter-names pattern verified; "No election going on" literal at 2356; the captain-hidden-in-match example exactly enforced at 2115 + adjacent comment.
### ktx:command:whovote
- "Prints the status of all currently active votes and elections to the caller" -> src/commands.c:2082-2358 (every print `G_sprint(self, 2, ...)`, e.g. 2093, 2121, 2356; private to caller) -> MATCH
- "For each open vote category -- map vote, captain/admin/other election, pickup, rpickup, break, antilag, no-spectators, teamoverlay, private/public game, swapall, and hook-style (smooth/fast/classic)" -> src/commands.c:2089 `vote_get_maps()`; 2117 `get_votes(OV_ELECT)`; 2138 OV_PICKUP; 2157 OV_RPICKUP; 2176 OV_BREAK; 2196 OV_ANTILAG; 2215 OV_NOSPECS; 2234 OV_TEAMOVERLAY; 2254 OV_PRIVATE; 2276 OV_SWAPALL; 2295/2314/2333 OV_HOOKSMOOTH/FAST/CLASSIC -- 11 categories all present -> MATCH
- "it shows the current count, the votes required, and the names of the players who voted for it" -> src/commands.c:2121-2132 `G_sprint(self, 2, "\220%d/%d\221 vote%s for %s election:\n", votes, get_votes_req(OV_ELECT, false), ...)` then `for (p=world; (p=find_client(p));) if (p->v.elect) G_sprint(self, 2, "%s%s\n", ..., p->netname);` -> MATCH
- "Prints \"No election going on\" when nothing is being voted on" -> src/commands.c:2350-2357 `if (voted) { ... "--------------" } else { G_sprint(self, 2, "%s\n", redtext("No election going on")); }` -> MATCH
- "Which categories are shown depends on match state (e.g. captain election is hidden during a running match)" -> src/commands.c:2115 `if (!((get_elect_type() == etCaptain) && match_in_progress)) // doesn't show captain election in game` (+ broader gates 2088/2136/2155...) -> MATCH
WI-2: n/a

RESULT | ktx:command:wipeout | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=16 | all 16 clauses map verbatim to wipeout_um_init lines 4462-4484; enforcing chain (table arg 15 -> UserMode -> um_list "wipeout".initstring -> trap_readcmd) verified, common_um_init confirmed applied first at 4796.
### ktx:command:wipeout
- "Applies the Wipeout game-mode preset: a Clan-Arena variant with a fixed number of respawns per round" -> src/commands.c:4463,4465 `"k_clan_arena 2\n" // enable wipeout` ... `"k_clan_arena_max_respawns 4\n"` (applied via 4799 `trap_readcmd(um_list[(int)umode].initstring, ...)`) -> MATCH
- "Enables wipeout (k_clan_arena 2)" -> src/commands.c:4463 `"k_clan_arena 2\n" // enable wipeout` -> MATCH
- "9 rounds per series (k_clan_arena_rounds 9)" -> src/commands.c:4464 `"k_clan_arena_rounds 9\n"` -> MATCH
- "4 respawns per round (k_clan_arena_max_respawns 4)" -> src/commands.c:4465 `"k_clan_arena_max_respawns 4\n"` -> MATCH
- "sets teamplay 4 and deathmatch 5 (base mode)" -> src/commands.c:4468-4469 `"teamplay 4\n" "deathmatch 5\n"` -> MATCH
- "no timelimit (timelimit 0, k_overtime 0)" -> src/commands.c:4470,4474 `"timelimit 0\n" // no time limit` ... `"k_overtime 0\n"` -> MATCH
- "caps the server at 8 players (maxclients/k_maxclients 8)" -> src/commands.c:4471-4472 `"maxclients 8\n" "k_maxclients 8\n"` -> MATCH
- "disables powerups (k_pow 0)" -> src/commands.c:4473 `"k_pow 0\n"` -> MATCH
- "and pack drops (dp 0)" -> src/commands.c:4467 `"dp 0\n" // don't drop packs` -> MATCH
- "strips items off the map (k_noitems 1)" -> src/commands.c:4481 `"k_noitems 1\n" // no items on the map` -> MATCH
- "uses safety spawns (k_spw 1)" -> src/commands.c:4477 `"k_spw 1\n" // KT Safety spawns (important for CA)` -> MATCH
- "scores 1 frag per 100 damage dealt (k_dmgfrags 1)" -> src/commands.c:4478 `"k_dmgfrags 1\n" // 1 "frag" for every 100 damage dealt` -> MATCH
- "enables the team overlay" -> src/commands.c:4479 `"k_teamoverlay 1\n" // enable teamoverlay by default` -> MATCH
- "allows 1-2 teams" -> src/commands.c:4482-4483 `"k_lockmin 1\n" ... "k_lockmax 2\n"` -> MATCH
- "sets the internal game mode to k_mode 2" -> src/commands.c:4484 `"k_mode 2\n"` -> MATCH
- "The shared common reset runs first" -> src/commands.c:4796-4799 `trap_readcmd(common_um_init, ...); ... trap_readcmd(um_list[(int)umode].initstring, ...);` -> MATCH
WI-2: n/a

<!-- ROUND 2: waves 06,07 ACCEPTED = 10 batch rows. Waves 05,08 REJECTED -- canary k_teamoverlay false-negatived TRACED-CLEAN (expected C-NEAR-MISS); both subagents' own analysis named the match.c:1639 display-string-only !isDuel() yet graded "still-true vagueness" -> the invisible flavour-C class. Re-dispatched as 05b,08b under a SHARPENED blind prompt (unenforced-scope-clause = C-NEAR-MISS, NOT still-true-vagueness). Tally after Round 2 (cumulative accepted): TRACED-CLEAN 26 | C-NEAR-MISS 2 (health:frogbot:std, prewar) | C-FIX 2 (autotrackktx, ctfbasedspawn) | WI2-FIX 0 | flavourC-positive 4/30. -->
## Wave 09 -- canary k_yawnmode expect TRACED-CLEAN, returned TRACED-CLEAN (GATE 1 PASS -- over-flag control held); GATE 2 PASS (re-grep: flagged k_hoonymode hoonymode.c:96-99 `qbool isHoonyModeAny(void){ return cvar("k_hoonymode"); }` -- NO mode predicate; used bare at combat.c:320 / match.c:324,1687; world.c:888 only registers default 0, NO mode-based cvar_fset force-reset anywhere -> "inert outside duel/team" WRONG, C-FIX confirmed; clean k_instagib_custom_models world.c:325 precache-gated-on-cvar-only). Canary row k_yawnmode stripped (control).

RESULT | ktx:cvar:k_extralog_xsd_uri | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | single read-site logs.c:123 emits the value verbatim as the xsi:noNamespaceSchemaLocation attr of <ktxlog>, every emission path gated on k_extralog.
### ktx:cvar:k_extralog_xsd_uri
- "Sets the XML Schema location string written into the detailed match log's root element" -> src/logs.c:121-123 `log_printf("<ktxlog ... xsi:noNamespaceSchemaLocation=\"%s\">\n", cvar_string("k_extralog_xsd_uri"));` -> MATCH
- "emitted verbatim as the xsi:noNamespaceSchemaLocation attribute of the <ktxlog> element" -> src/logs.c:122 `xsi:noNamespaceSchemaLocation=\"%s\">` with `cvar_string("k_extralog_xsd_uri")` arg -> MATCH
- "when the extra log (k_extralog) is active" -> src/logs.c:79 `if (!cvar("k_extralog")) { return; }` + src/logs.c:42 same in log_open -> MATCH
- "has no effect unless extra logging is enabled" -> src/logs.c:79 `if (!cvar("k_extralog"))` (registered default src/world.c:1003 RegisterCvarEx(...,"http://mirror.quakeworld.eu/ktx/ktxlog_0.1.xsd")) -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_aim_yaw_max | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | registration, server aimskill derivation, per-bot clamped read, and the exact bound() consumption formula all verified.
### ktx:cvar:k_fbskill_aim_yaw_max
- "upper clamp on the bot's horizontal (yaw) aim-error magnitude" -> src/bot_botimp.c:316 `self->fb.skill.aim_params[YAW].maximum = bound(0, cvar(FB_CVAR_YAW_MAX_ERROR), 10);` (FB_CVAR_YAW_MAX_ERROR == "k_fbskill_aim_yaw_max" src/bot_botimp.c:24) -> MATCH
- "yaw error is computed as bound(yaw.minimum, fabs(raw_yaw_diff) * yaw.scale, yaw.maximum)" -> src/bot_aim.c:351 `yaw_diff = bound(yaw->minimum, fabs(raw_yaw_diff) * yaw->scale, yaw->maximum);` -> MATCH (still-true minor vagueness re per-frame timing, formula/cap exact)
- "Read back per bot clamped to bound(0, value, 10) into self->fb.skill.aim_params[YAW].maximum" -> src/bot_botimp.c:316 `bound(0, cvar(FB_CVAR_YAW_MAX_ERROR), 10)` -> MATCH
- "server normally derives the value from the bot's aim-skill level; setting the cvar overrides that" -> src/bot_botimp.c:170 `cvar_fset(FB_CVAR_YAW_MAX_ERROR, RangeOverSkill(aimskill, 4.5, 3));` + src/bot_botimp.c:221 `RangeOverSkill(aimskill, 6, 3)` -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_vol_reduce | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | both *= sites (bot_aim.c:256 and inside clamp 299-301) in the continuing-target else branch giving the claimed twice-per-frame; clamped read + server derivation verified.
### ktx:cvar:k_fbskill_vol_reduce
- "aim error is scaled by a running per-target 'volatility' scalar" -> src/bot_aim.c:354-356 `yaw_rnd = dist_random(-yaw_diff, yaw_diff, yaw->multiplier * self->fb.skill.current_volatility);` + reset src/bot_aim.c:239-242 `if (opponent != self->fb.prev_look_object) { ... volatility = self->fb.skill.initial_volatility; }` -> MATCH
- "multiplicative per-frame decay factor (volatility *= reduce_volatility) in the continuing-target path" -> src/bot_aim.c:256 `volatility *= self->fb.skill.reduce_volatility;` (else == same opponent) -> MATCH
- "applied twice per frame there: once before the per-factor increments and again inside the final min/max clamp" -> src/bot_aim.c:256 (before increments 259-297) + src/bot_aim.c:299-301 `volatility = bound(self->fb.skill.min_volatility, volatility * self->fb.skill.reduce_volatility, self->fb.skill.max_volatility);` -> MATCH
- "Values below 1.0 shrink volatility back toward the floor each frame" -> src/bot_aim.c:299-301 `bound(min_volatility, volatility * reduce_volatility, ...)` -> MATCH
- "bot reads it clamped to bound(0, value, 1.0) into self->fb.skill.reduce_volatility" -> src/bot_botimp.c:331 `self->fb.skill.reduce_volatility = bound(0, cvar(FB_CVAR_REDUCE_VOLATILITY), 1.0f);` -> MATCH
- "Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode()" -> src/bot_botimp.c:187 `cvar_fset(FB_CVAR_REDUCE_VOLATILITY, RangeOverSkill(skill, 0.98f, 0.96f));` + src/bot_botimp.c:238 same -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_hoonymode | C-FIX | flavourC=1 | wi2=0 | clauses=6 | the scope clause "only active in duel or team modes and is inert otherwise" is contradicted by the dominant gate isHoonyModeAny() (no mode predicate) firing in FFA/CTF at combat.c:320 / match.c:324 / match.c:1687, with no mode-based force-reset of k_hoonymode anywhere.
### ktx:cvar:k_hoonymode
- "Enables HoonyMode, a round-based duel/team match format" -> src/hoonymode.c:1 `// HoonyMode implementation` + round machinery EndRound/round_number src/hoonymode.c:47-61 -> MATCH
- "best-of-N point rounds with rigged/nominated spawns" -> src/hoonymode.c:868 `if (spawn->hoony_nomination && isHoonyModeDuel())` + header src/hoonymode.c:9 "Got spawn rigging to work"; rounds via k_hoonyrounds src/hoonymode.c:104 -> MATCH
- "ported from CPMA" -> src/hoonymode.c:1 `... for idea from cpma` -> MATCH
- "0 = off; non-zero = on" -> src/hoonymode.c:92-95 `qbool isHoonyModeAny(void) { return cvar("k_hoonymode"); }` -> MATCH
- "When on it changes match flow to round-by-round play in duel (1on1) and team games" -> src/hoonymode.c:87-100 isHoonyModeDuel = `isDuel() && cvar("k_hoonymode")`, isHoonyModeTDM = `isTeam() && cvar("k_hoonymode")` -> MATCH
- "it is only active in duel or team modes and is inert otherwise" -> src/hoonymode.c:96-99 `qbool isHoonyModeAny(void){ return cvar("k_hoonymode"); }` + src/combat.c:320 `if (!isHoonyModeAny())` + src/match.c:324 `if (isHoonyModeAny())` + src/match.c:1687 `if (!isHoonyModeAny() && fraglimit)` ; src/world.c:888 `RegisterCvarEx("k_hoonymode","0")` only, no mode-based cvar_fset reset anywhere -> MISMATCH(isHoonyModeAny() has NO mode predicate (bare cvar); gameType_t includes gtFFA/gtCTF distinct from gtDuel/gtTeam; with k_hoonymode=1 in FFA/CTF the isHoonyModeAny() paths suppress normal sudden-death+fraglimit (combat.c:320) and switch match-end messaging (match.c:324) -- the feature is NOT inert outside duel/team, and there is no mode-based force-reset to make it so)
WI-2: n/a (registered default src/world.c:888 RegisterCvarEx("k_hoonymode","0") == 0)

RESULT | ktx:cvar:k_instagib_custom_models | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | precache (world.c:325,370-373) gated only on the cvar; actual asset use (weapons.c:817,1825) gated cvar && k_instagib; messaging (commands.c:7796-7820) reflects the cvar.
### ktx:cvar:k_instagib_custom_models
- "When 1, KTX precaches and uses the custom instagib coilgun assets (progs/v_coil.mdl, progs/w_coil.mdl, weapons/coilgun.wav)" -> src/world.c:327-328 `trap_precache_model("progs/v_coil.mdl"); trap_precache_sound("weapons/coilgun.wav");` + src/world.c:372 `trap_precache_vwep_model("progs/w_coil.mdl");` + src/weapons.c:1825 `self->weaponmodel = "progs/v_coil.mdl";` + src/weapons.c:817 `sound(self, CHAN_WEAPON, "weapons/coilgun.wav", ...)` gated `if (cvar("k_instagib_custom_models") && cvar("k_instagib"))` -> MATCH
- "the models are precached at map load even if instagib is not yet active" -> src/world.c:325 `if (cvar("k_instagib_custom_models")) // precache ... even if instagib not yet activated` -> MATCH
- "the instagib mode messages report 'coilgun mode'" -> src/commands.c:7796-7798 `if (cvar("k_instagib_custom_models")) { G_bprint(2, "%s enabled (slow coilgun mode)\n", redtext("Instagib")); }` (fast/extreme 7807-7820) -> MATCH
- "When 0, instagib reuses default weapon models" -> src/weapons.c:1823-1825 `if (cvar("k_instagib_custom_models") && cvar("k_instagib")) { self->weaponmodel = "progs/v_coil.mdl"; }` (by negation) -> MATCH
- "0 = no, 1 = yes" -> src/world.c:976 `RegisterCvarEx("k_instagib_custom_models", "0");` -> MATCH
WI-2: n/a

## Wave 10 -- canary autotrack expect C-FIX, returned C-FIX (GATE 1 PASS); GATE 2 PASS (re-grep: no batch flags this wave -- all 5 TRACED-CLEAN; clean re-grep k_lockmap maps.c:434 `if (cvar("k_lockmap") && !is_adm(self))` MAP-IS-LOCKED gate + world.c:112 `... && !cvar("k_lockmap")` def-map-reload suppression + world.c:845 RegisterCvar default 0). Canary row autotrack stripped (control).

RESULT | ktx:cvar:k_keepspectalkindemos | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | all four clauses map to the single enforcing ternary g_cmd.c:489 + adjacent comment + registered default.
### ktx:cvar:k_keepspectalkindemos
- "Controls whether spectator chat is written into recorded MVD demos" -> src/g_cmd.c:485 `if (spec_talk) // this should go to demo only` guarding the flags block 487-491 -> MATCH
- "When 0, spectator talk is flagged QTV-only (BPRINT_QTVONLY) ... excluded from the saved MVD demo" -> src/g_cmd.c:489 `flags |= (cvar("k_keepspectalkindemos") ? 0 : BPRINT_QTVONLY);` + comment 487 -> MATCH
- "When 1, spectator talk is also recorded into the demo" -> src/g_cmd.c:489 (non-zero -> 0 -> QTVONLY not set; G_bprint_flags 491 not QTV-restricted) -> MATCH
- "0 = off, 1 = enabled" -> src/world.c:863 `RegisterCvarEx("k_keepspectalkindemos", "0");` -> MATCH
WI-2: n/a (RegisterCvarEx default "0" matches stated 0=off)

RESULT | ktx:cvar:k_lockmap | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | lock message + non-admin gate, default-map-reload suppression with correct empty/bots-only trigger, polarity/default, and admin toggle command all map to enforcing lines.
### ktx:cvar:k_lockmap
- "When set to 1, the current map is locked: non-admin players are blocked from changing it through the map vote (\"MAP IS LOCKED!\" message)" -> src/maps.c:434 `if (cvar("k_lockmap") && !is_adm(self))` then 436 `G_sprint(self, 2, "MAP IS LOCKED!\n" "You are NOT allowed to change!\n"); return;` -> MATCH
- "and the automatic reload-to-default-map that normally fires when the server empties or holds only bots is suppressed" -> src/world.c:112 `if (((player_count == 0) || (player_count == bot_count)) && !cvar("k_lockmap"))` (k_lockmap set -> changelevel to k_defmap skipped) -> MATCH
- "0 = map not locked, 1 = map locked" -> src/world.c:845 `RegisterCvar("k_lockmap");` -> MATCH (default 0)
- "The lockmap admin command toggles this value" -> src/commands.c:756 `{ "lockmap", ToggleMapLock, 0, CF_BOTH_ADMIN, CD_LOCKMAP }` + src/admin.c:858-876 `tmp = cvar("k_lockmap"); if (tmp) { cvar_fset("k_lockmap", 0); ... } cvar_fset("k_lockmap", 1);` -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_maxspectators | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | role as upper bound on maxspectators via up/down controls, no-match gating, the bound() clamp, and the "reached" message all map to enforcing lines in ChangeClientsCount.
### ktx:cvar:k_maxspectators
- "The upper limit for the engine's spectator slot count (maxspectators) when adjusted in-game via the spectator-count up/down controls" -> src/commands.c:8035 `sv_max = "maxspectators"; k_max = "k_maxspectators";` (ChangeClientsCount type==2) via src/commands.c:8059/8064 ChangeClientsCount(type, +-1) -> MATCH
- "While no match is in progress, the spectator-count command raises or lowers maxspectators but never above k_maxspectators" -> src/commands.c:8022 `if (match_in_progress) { return; }` + 8046 `cl_count = bound(1, cvar(sv_max) + value, max(1, cvar(k_max)));` -> MATCH
- "once maxspectators reaches k_maxspectators the operator is told the limit is reached" -> src/commands.c:8039 `if ((cvar(sv_max) >= cvar(k_max)) && (value > 0))` then 8041 `G_sprint(self, 2, "%s reached\n", redtext(sv_max));` -> MATCH
- "Counted in spectator slots" -> src/commands.c:8035 `sv_max = "maxspectators";` -> MATCH
WI-2: n/a (RegisterCvar world.c:990 default 0; shipped-cfg "k_maxspectators 4" commands.c:4201 correctly NOT presented as registered default)

RESULT | ktx:cvar:k_nightmare_pu_droprate | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | range/purpose, per-kill roll, exceed=>no-drop comparison, higher=>more-frequent direction, and the k_nightmare_pu gate all map to enforcing lines in sp_monsters.c.
### ktx:cvar:k_nightmare_pu_droprate
- "Probability (0.0 to 1.0) that a monster killed under Nightmare powerup mode (k_nightmare_pu on, skill 3+) drops a powerup" -> src/sp_monsters.c:745 `if (cvar("k_nightmare_pu")) { MonsterDropPowerups(); }` + src/sp_monsters.c:645 `if (skill < 3) { return; }` -> MATCH
- "On each kill a random roll in [0,1) is taken" -> src/sp_monsters.c:655 `if (g_random() > cvar("k_nightmare_pu_droprate"))` -> MATCH
- "if it exceeds this value no powerup is dropped" -> src/sp_monsters.c:655-658 `if (g_random() > cvar("k_nightmare_pu_droprate")) { return; }` -> MATCH
- "so higher values mean more frequent drops" -> src/sp_monsters.c:655 (larger droprate -> smaller P(roll>droprate) -> more drops) -> MATCH
- "Has no effect unless k_nightmare_pu is on" -> src/sp_monsters.c:745 `if (cvar("k_nightmare_pu"))` gating the only caller -> MATCH
WI-2: n/a (RegisterCvarEx world.c:974 "0.15"; description states range, no specific default asserted)

RESULT | ktx:cvar:k_no_fps_physics | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | all four clauses map to v_for_jump (client.c:3582 early-return-1 and the 3589+ frametime ladder) and its sole caller client.c:3737 scaling velocity[2]; polarity consistent with default 0.
### ktx:cvar:k_no_fps_physics
- "When on, disables the framerate-dependent jump-height adjustment" -> src/client.c:3582 `if (cvar("k_no_fps_physics")) { return 1; }` (v_for_jump) -> MATCH
- "Normally the upward velocity of a jump is scaled by a multiplier that varies with the client's frame time" -> src/client.c:3737 `self->s.v.velocity[2] *= v_for_jump(self->fCurrentFrameTime * 1000);` + ladder src/client.c:3589 `if (frametime_ms > 44) return 1.05;` (3593 1.041, ...) -> MATCH
- "with this set the multiplier is forced to 1, giving the same jump height regardless of framerate" -> src/client.c:3582-3585 `if (cvar("k_no_fps_physics")) { return 1; }` -> MATCH
- "0 = off (framerate-dependent jump scaling active), 1 = on (jump scaling neutralized)" -> src/world.c:950 `RegisterCvar("k_no_fps_physics");` (default 0) -> MATCH
WI-2: n/a

## Wave 11 -- canary k_teamoverlay expect C-NEAR-MISS, returned C-NEAR-MISS (GATE 1 PASS -- the sharpened blind prompt fixed the wave-05/08 false-negative class; subagent cited the SHARPENING signal explicitly); GATE 2 PASS (re-grep: flagged k_on_end_f_modified match.c:285 `qbool f_modified_done = false` + 406 `if (... && !f_modified_done)` + 409 `f_modified_done = true;` -- one-shot, EXACTLY ONE player issues say f_modified, "every player/once per player" WRONG, C-FIX confirmed; clean k_spawnicide enum + enable/disable sites). Canary row k_teamoverlay stripped (control).

RESULT | ktx:cvar:k_on_end_f_modified | C-FIX | flavourC=1 | wi2=0 | clauses=6 | the description's central "every player / once per player" claim is contradicted -- the function-local f_modified_done flag fires the stuffcmd for exactly one player, not all; matchtag gate and default correct.
### ktx:cvar:k_on_end_f_modified
- "every player is automatically made to issue \"say f_modified\" once when the match ends, broadcasting each client's f_modified report" -> src/match.c:406-409 `if (has_matchtag && cvar("k_on_end_f_modified") && !f_modified_done) { stuffcmd(p, "say f_modified\n"); f_modified_done = true; }` (loop `for (p = world; (p = find_plr(p));)` over all players) -> MISMATCH(function-local `f_modified_done` (match.c:285, init false once) set true after the FIRST player and never reset -> EXACTLY ONE player issues say f_modified, not every player)
- "non-zero = sent once per player at match end" -> src/match.c:406 `if (has_matchtag && cvar("k_on_end_f_modified") && !f_modified_done)` -> MISMATCH(the !f_modified_done guard makes it "sent once TOTAL", not "once per player")
- "0 = no automatic f_modified at match end" -> src/match.c:406 `cvar("k_on_end_f_modified")` (truthy; 0 -> branch skipped) -> MATCH
- "the match has a matchtag assigned" gate -> src/match.c:287 `qbool has_matchtag = matchtag != NULL && matchtag[0];` -> MATCH
- "No effect on matches without a matchtag" -> src/match.c:406 `if (has_matchtag && ...)` -> MATCH
- "Default 1" -> src/world.c:807 `RegisterCvarEx("k_on_end_f_modified", "1");` -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_privategame_allow_specs | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | every clause maps to an enforcing line in private_game_toggle (vote.c:1550-1598); unstated force_reconnect gating is still-true minor vagueness at clauses that each have a real enforcing line.
### ktx:cvar:k_privategame_allow_specs
- "When set (1) the server uses sv_login 1 while private" -> src/vote.c:1554,1557 `int private_login = allow_spectators ? 1 : 2; ... cvar_fset("sv_login", enable ? private_login : 0);` -> MATCH
- "(logged-in players required, spectators not forced to authenticate)" -> src/vote.c:1554 `// sv_login 1 => players only, sv_login 2 => everyone` -> MATCH
- "non-logged-in players are merely force-spectated rather than disconnected" -> src/vote.c:1584-1588 `if (allow_spectators) { G_sprint(p, PRINT_HIGH, "You must login to play.\n"); do_force_spec(p, NULL, true); }` -> MATCH
- "When unset (0) the server uses sv_login 2 while private" -> src/vote.c:1554 `int private_login = allow_spectators ? 1 : 2;` (0 -> 2) -> MATCH
- "existing unauthenticated spectators are sent a disconnect" -> src/vote.c:1564-1570 `if (!allow_spectators) { for (p = world; (p = find_spc(p));) { G_sprint(p, PRINT_HIGH, "Please reconnect & login\n"); stuffcmd(p, "disconnect\n"); } }` -> MATCH
- "non-logged-in players are disconnected with a 'Please reconnect & login' message" -> src/vote.c:1592-1593 `G_sprint(p, PRINT_HIGH, "Please reconnect & login\n"); stuffcmd(p, "disconnect\n");` -> MATCH
- "0 = unauthed spectators not allowed, 1 = unauthed spectators allowed" -> src/world.c:1090 `RegisterCvarEx("k_privategame_allow_specs", "1"); // set the server to allow unauthed spectators` -> MATCH
- "Default 1" -> src/world.c:1090 `RegisterCvarEx("k_privategame_allow_specs", "1");` -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_race_pace_headstart | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | all clauses map to the enforcing line race.c:4768 and the verified bound() clamp g_utils.c:351.
### ktx:cvar:k_race_pace_headstart
- "Head-start given to the pacemaker ghost, in seconds" -> src/race.c:4768 `race_time += bound(RACE_PACEMAKER_HEADSTART_MIN, cvar(RACE_PACEMAKER_HEADSTART_CVAR), RACE_PACEMAKER_HEADSTART_MAX);` (race_time seconds: race.c:4756 `race_time = g_globalvars.time - race.start_time;`) -> MATCH
- "The value is added to the ghost's effective race time" -> src/race.c:4768 `race_time += bound(...)` -> MATCH
- "clamped to the range 0.00-1.00 seconds" -> src/race.c:33-34 `#define RACE_PACEMAKER_HEADSTART_MIN 0.00f` / `_MAX 1.00f` -> MATCH
- "(values outside are pulled to the nearest bound)" -> src/g_utils.c:353 `return ((a >= c) ? a : (b < a) ? a : (b > c) ? c : b);` -> MATCH
- "0 means no head-start" -> src/race.c:4768 `bound(0.00f, cvar(...), 1.00f)` (bound(0,0,1)=0) -> MATCH
WI-2: n/a (registered 0.5 world.c:917; description asserts no default)

RESULT | ktx:cvar:k_race_pace_jumps | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | every clause maps to an enforcing line in update_jump_markers (race.c:4897+) or the 'jumps' subcommand handler.
### ktx:cvar:k_race_pace_jumps
- "Toggles visible jump markers along the pacemaker ghost trail" -> src/race.c:4902 `qbool jumps_enabled = cvar(RACE_PACEMAKER_JUMPS_CVAR) && resolution;` -> MATCH
- "When set (1) and a trail resolution is active, marker entities ... are spawned" -> src/race.c:4902,4923 `jumps_enabled = cvar(...) && resolution; ... if ((jumps_enabled && guide.jump < guide.capture.jump_count) && (guide.capture.jumps[guide.jump].race_time <= race_time))` -> MATCH
- "(a star or lavaball model)" -> src/race.c:4934-4940 `if (k_ctf_custom_models) { setmodel(ent, "progs/star.mdl"); } else { setmodel(ent, "progs/lavaball.mdl"); }` -> MATCH
- "spawned at the ghost's recorded jump points as it progresses" -> src/race.c:4943 `setorigin(ent, PASSVEC3(guide.capture.jumps[guide.jump].origin));` (gated 4924) -> MATCH
- "when 0 (or when no trail is being drawn) no jump markers are created" -> src/race.c:4902 `jumps_enabled = cvar(...) && resolution;` (false if cvar 0 OR resolution 0) -> MATCH
- "Toggled by the pacemaker 'jumps' subcommand" -> src/race.c:4329-4336 `else if (streq(buffer, "jumps")) { qbool enabled = !cvar(RACE_PACEMAKER_JUMPS_CVAR); ... cvar_fset(RACE_PACEMAKER_JUMPS_CVAR, enabled ? 1 : 0); }` -> MATCH
WI-2: n/a (registered "0" world.c:918; description asserts no default)

RESULT | ktx:cvar:k_spawnicide | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | all state thresholds map to verified enum constants and their enable/disable sites; touch-kill, bot exclusion, ~1s grace all map to enforcing lines in SpawnicideTouch.
### ktx:cvar:k_spawnicide
- "Controls 'spawnicide' kill zones placed on spawn points and teleporter exits" -> src/items.c:3102,3109 `for (e = world; (e = ez_find(e, "info_player_deathmatch"));) ... SpawnicideCreate(e, org); ... for (e = world; (e = ez_find(e, "trigger_teleport"));) ... SpawnicideCreate(e, org);` -> MATCH
- "0 = disabled" -> include/g_local.h:1277 `#define SPAWNICIDE_DISABLED 0` -> MATCH
- "1 = active during prewar" -> src/world.c:699-701 `if (SpawnicideStatus() == SPAWNICIDE_PREWAR) { SpawnicideEnable(); }` + g_local.h:1278 `#define SPAWNICIDE_PREWAR 1` -> MATCH
- "2 = active during the match" -> src/match.c:1251-1253 `if (SpawnicideStatus() == SPAWNICIDE_MATCH) { SpawnicideEnable(); }` + g_local.h:1279 `#define SPAWNICIDE_MATCH 2` (disabled match end match.c:482-484) -> MATCH
- "any non-bot player ... is instantly killed" -> src/items.c:3049,3073-3076 `if (p->isBot) { continue; } ... if (ISLIVE(p)) { p->deathtype = dtTELE4; T_Damage(p, p, p, 50000); }` -> MATCH
- "who lingers on a spawn point or teleporter-exit spot (more than ~1 second after their own spawn/teleport)" -> src/items.c:3054-3071 `if (g_globalvars.time - p->spawn_time < 1) { continue; } if (g_globalvars.time - p->teleport_time < 1) { continue; }` -> MATCH
- "preventing spawn camping/blocking" -> src/items.c:3073-3076 (T_Damage 50000) -> MATCH
WI-2: n/a

## Wave 12 -- canary k_yawnmode expect TRACED-CLEAN, returned TRACED-CLEAN (GATE 1 PASS -- over-flag control held); GATE 2 PASS (re-grep: flagged k_vp_map commands.c:709 `{ "break", PlayerBreak, 0, CF_BOTH | CF_MATCHLESS, CD_BREAK }` -- break HAS CF_MATCHLESS (additive), no CF_MATCHLESS_ONLY -> dispatchable in matchless; "(where /break does not exist)" lifted from vote.c:246 comment, contradicted by enforcing command-table line, C-FIX confirmed; clean k_vp_coach vote.c:283 selector + vote.c:330 bound + commands.c:804 CF_SPECTATOR). Canary row k_yawnmode stripped (control).

RESULT | ktx:cvar:k_spec_info | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | every bit/polarity/scope clause maps to a verified enforcing line; macro values (MI_ON=1, MI_ADM_ONLY=2) confirmed and the admin-restrict + off-state branches in mi_print match exactly.
### ktx:cvar:k_spec_info
- "Bitmask controlling extra 'moreinfo' status (powerups, armor, weapons) sent to spectators" -> src/commands.c:7077-7098 `#define MI_POW (...)` ... `mi_levels_t mi_levels[] = {{ 0, ...},{ MI_POW | MI_ARM | IT_SUPERHEALTH | IT_ROCKET_LAUNCHER, ...} ...}` -> MATCH
- "Bit 0 (value 1) = on/off: when set, the extra info is sent to spectators" -> include/g_consts.h:282 `#define MI_ON (1<<0)` + src/commands.c:7109 `if (!mi_on()) { return; }` (mi_on = `cvar("k_spec_info") & MI_ON` commands.c:7069) -> MATCH
- "Bit 1 (value 2) = restrict delivery to admin-status spectators only" -> include/g_consts.h:283 `#define MI_ADM_ONLY (1<<1)` + src/commands.c:7118 `if (adm && !is_adm(p)) { continue; }` (adm = mi_adm_only() commands.c:7074/7107) -> MATCH
- "when clear, all spectators receive it" -> src/commands.c:7107-7121 `qbool adm = mi_adm_only(); ... if (adm && !is_adm(p)) continue;` (bit clear -> adm false) -> MATCH
- "With both bits clear (0) no extra info is sent" -> src/commands.c:7109-7112 `if (!mi_on()) { return; }` -> MATCH
WI-2: n/a (cvar registered bare world.c:965 -> default 0, consistent but not asserted)

RESULT | ktx:cvar:k_vp_coach | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | all clauses trace to enforcing lines (vote.c:283 selector, vote.c:330 bound, vote.c:343 ceil, commands.c:804 CF_SPECTATOR); stated ceil formula exact, an additional max(2,...) election floor is an unstated refinement that does not contradict.
### ktx:cvar:k_vp_coach
- "percentage of eligible voters required to pass a coach election" -> src/vote.c:281-284 `else if (el_type == etCoach) { percent = cvar("k_vp_coach"); break; }` -> MATCH
- "the /coach vote, used by spectators to be elected team coach" -> src/commands.c:804 `{ "coach", VoteCoach, 0, CF_SPECTATOR, CD_COACH }` + src/coach.c:177-178 `self->v.elect = 1; self->v.elect_type = etCoach;` -> MATCH
- "Expressed as a whole-number percentage" -> src/vote.c:330 `percent = bound(0.51, bound(51, percent, 100) / 100, 1);` -> MATCH
- "the effective value is floored at 51 and capped at 100, so values below 51 behave as 51" -> src/vote.c:330 `bound(51, percent, 100)` (bound clamps to [51,100] g_utils.c:351-354) -> MATCH
- "The required vote count is ceil(percent/100 * (players minus bots))" -> src/vote.c:343 `vt_req = ceil(percent * (CountPlayers() - CountBots()));` -> MATCH
WI-2: n/a (RegisterCvar world.c:826 default 0, not asserted)

RESULT | ktx:cvar:k_vp_map | C-FIX | flavourC=1 | wi2=0 | clauses=7 | core behavior (k_vp_map governs map-change + matchless next-map vote, bounds, ceil, most-voted tally, race-specific count) traced clean; the parenthetical "(where /break does not exist)" is comment-sourced and contradicted by its enforcing line -- break is CF_MATCHLESS (dispatchable in matchless).
### ktx:cvar:k_vp_map
- "The percentage of eligible voters required to pass a map-change vote" -> src/vote.c:257-258 `case OV_MAP: percent = cvar("k_vp_map");` -> MATCH
- "Expressed as a whole-number percentage" -> src/vote.c:330 `percent = bound(0.51, bound(51, percent, 100) / 100, 1);` -> MATCH
- "floored at 51 and capped at 100, so values below 51 behave as 51" -> src/vote.c:330 `bound(51, percent, 100)` -> MATCH
- "The required vote count is ceil(percent/100 * (players minus bots))" -> src/vote.c:343 `vt_req = ceil(percent * (CountPlayers() - CountBots()));` -> MATCH
- "tallied against the most-voted map" -> src/vote.c:259-263 `idx = vote_get_maps(); if ((idx >= 0) && ...) { votes = maps_voted[idx].map_votes; }` -> MATCH
- "in Race mode a mode-specific count is used" -> src/vote.c:332-334 `if (isRACE() && (fofs == OV_MAP)) { vt_req = race_count_votes_req(percent); }` -> MATCH
- "also governs the next-map vote in matchless mode (where /break does not exist)" -> src/vote.c:245 `percent = cvar(k_matchLess ? "k_vp_map" : "k_vp_break");` governs-clause MATCH; but parenthetical -> MISMATCH(src/commands.c:709 `{ "break", PlayerBreak, 0, CF_BOTH | CF_MATCHLESS, CD_BREAK }` + DoCommand src/commands.c:1078 -- break HAS CF_MATCHLESS (additive) and lacks CF_MATCHLESS_ONLY, so /break IS dispatchable in matchless; "(where /break does not exist)" lifted from the vote.c:246 code comment, contradicted by the enforcing command-table line)
WI-2: n/a (RegisterCvar world.c:828 default 0, not asserted)

RESULT | ktx:info_key:*is:userinfo | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | all five clauses trace to enforcing lines in cmdinfo_infoset (g_userinfo.c:222-239) and the connect-time caller (g_main.c:221-238); empty/else branches, "1" value, spectator s-prefix, ack, once-per-client guard all match.
### ktx:info_key:*is:userinfo
- "Server-set star userinfo flag marking that KTX has already sent the one-time infoset alias bootstrap to this client" -> src/g_userinfo.c:226 `SetUserInfo(p, "*is", "1", SETUSERINFO_STAR); // mark we are call infoset already` -> MATCH
- "On connect the server checks it" -> src/g_main.c:235-238 `if (self->k_accepted) { cmdinfo_infoset(self); }` -> src/g_userinfo.c:224 `if (strnull(ezinfokey(p, "*is")))` -> MATCH
- "if empty it sets *is to 1 and stuffs the infoset/ktx_infoset (or sinfoset for spectators) aliases plus an ack" -> src/g_userinfo.c:226-231 `SetUserInfo(p, "*is", "1", SETUSERINFO_STAR); stuffcmd_flags(p, ..., "%sinfoset\n", p->ct == ctSpec ? "s" : ""); stuffcmd_flags(p, ..., "ktx_%sinfoset\n", ...); stuffcmd_flags(p, ..., "wait;wait;wait;cmd ack infoset\n");` -> MATCH
- "if already 1 it skips re-sending" -> src/g_userinfo.c:233-238 `else { ... stuffcmd_flags(p, ..., "wait;wait;wait;cmd ack noinfoset\n"); }` -> MATCH
- "Prevents the infoset handshake from running more than once per client" -> src/g_userinfo.c:224-232 `if (strnull(ezinfokey(p, "*is"))) { SetUserInfo(p, "*is", "1", ...); ... }` -> MATCH
WI-2: n/a (info_key; "server-set" matches SetUserInfo)

<!-- ROUND 3: waves 09,10,11,12 ACCEPTED = 19 batch rows (sharpened prompt fixed the k_teamoverlay canary on W11). Waves 05b,08b REJECTED by HARD GATE 2 orchestrator re-grep (canary PASSED but a batch TRACED-CLEAN was contradicted by source): midair_minheight is C-FIX (combat.c:682 tier-0 else => midair_minheight=64, a real 64u floor, NOT "no minimum"); _k_coachteam2 is C-FIX (registered world.c:1028 + read g_userinfo.c:368 but ZERO write site in all src/ -- captain analog _k_captteam written captain.c:389, coach write never ported -> "holds the team name" fabricated). Re-dispatched as 05c,08c with an added write-site + threshold-contradiction sharpening (blind). Tally after Round 3 (cumulative accepted): TRACED-CLEAN 42 | C-NEAR-MISS 2 (health:frogbot:std, prewar) | C-FIX 5 (autotrackktx, ctfbasedspawn, k_hoonymode, k_on_end_f_modified, k_vp_map) | WI2-FIX 0 | flavourC-positive 7/49. -->
## Wave 05c (Round-2 wave 05 -> Round-3 05b -> Round-4 05c; 2 prior rejects) -- canary k_teamoverlay expect C-NEAR-MISS, returned C-NEAR-MISS (GATE 1 PASS -- augmented write-site/threshold sharpening held the canary); GATE 2 PASS (re-grep: flagged midair_minheight combat.c:680-683/690 `else { midair_minheight = 64; } ... if ((playerheight < midair_minheight) && rl_dmg) { take = 0; }` -- tier-0/"ground" enforces a real 64u floor, "no minimum" CONTRADICTED, C-FIX confirmed [matches the orchestrator combat.c:682 ground truth that rejected 05b]; clean pickup commands.c:2541 match guard + 2546 k_captains guard + 2553 `self->v.pickup = !self->v.pickup` toggle). Canary row k_teamoverlay stripped (control).

RESULT | ktx:command:mapcycle | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | every clause maps to a verified enforcing line in mapcycle() and the samelevel parenthetical confirmed in GotoNextMap().
### ktx:command:mapcycle
- "Prints the server's configured map-rotation list (the k_ml_0..k_ml_N cvar series)" -> src/commands.c:8541-8544 `for (i = 0; i < 999; i++) { snprintf(var, sizeof(var), "k_ml_%d", i); if (strnull(newmap = cvar_string(var))) { break; }` -> MATCH
- "to the caller, one map per line with a 1-based index" -> src/commands.c:8556 `G_sprint(self, 2, "%3.3d | %s%s\n", i + 1, newmap, ...)` -> MATCH
- "marking the entry that matches the current map" -> src/commands.c:8557 `streq(newmap, mapname) ? " \x8D current" : ""` -> MATCH
- "Prints 'Map cycle: empty' when no rotation is configured" -> src/commands.c:8560-8562 `if (!i) { G_sprint(self, 2, "\n%s: %s\n", redtext("Map cycle"), redtext("empty")); return; }` -> MATCH
- "additionally 'Map cycle: not active' when the samelevel cvar is set" -> src/commands.c:8567-8569 `if (trap_cvar("samelevel")) { G_sprint(self, 2, "\n%s: %s\n", redtext("Map cycle"), redtext("not active")); }` -> MATCH
- "(which pins the server to the current map regardless of the list)" -> src/client.c:562-575 `if (trap_cvar("samelevel")) { ... strlcpy(newmap, mapname, sizeof(newmap)); }` -> MATCH
- "Read-only; it lists the rotation, it does not advance or change it" -> src/commands.c:8536-8571 (body: only cvar_string reads + G_sprint, no cvar_set / changelevel) -> MATCH
WI-2: n/a

RESULT | ktx:command:midair_minheight | C-FIX | flavourC=1 | wi2=0 | clauses=5 | tier-0 "no minimum" contradicted by combat.c:682/690 which enforces a real 64-unit floor for the "ground" tier (THRESHOLD-CONTRADICTION).
### ktx:command:midair_minheight
- "Cycles the minimum fall/fragheight tier ... (0 -> 1 -> 2 -> 3 -> 4 -> 0) by setting the k_midair_minheight cvar" -> src/commands.c:7567,7582-7587 `int k_midair_minheight = bound(0, cvar("k_midair_minheight"), 4); ... if (++k_midair_minheight > 4) { k_midair_minheight = 0; } cvar_fset("k_midair_minheight", k_midair_minheight);` -> MATCH
- "broadcasts the chosen tier: ... 1 = bronze, 2 = silver, 3 = gold, 4 = platinum" -> src/commands.c:7589-7608 `if (k_midair_minheight == 1) ... redtext("bronze") ... ==2 silver ... ==3 gold ... ==4 platinum ... else ... redtext("ground")` -> MATCH
- "0 = ground (no minimum)" -> src/combat.c:680-683,690 `else { midair_minheight = 64; } ... if ((playerheight < midair_minheight) && rl_dmg) { take = 0; }` -> MISMATCH(tier 0/"ground" falls to the else branch which sets a 64-unit minimum height enforced at combat.c:690; "no minimum" is a stated absence the code actually bounds at 64 units -- THRESHOLD-CONTRADICTION)
- "Requires midair mode to be turned on first, otherwise it refuses with 'Midair must be turned on to set minimal frag height'" -> src/commands.c:7575-7580 `if (!cvar("k_midair")) { G_sprint(self, 2, "Midair must be turned on to set minimal frag height\n"); return; }` -> MATCH
- "Subject to the standard rules-change permission check" -> src/commands.c:7569-7572 `if (!is_rules_change_allowed()) { return; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:pathinfo:frogbot:editor | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | all six clauses map to verified lines in FrogbotPathList() and the editor_commands dispatch gate.
### ktx:command:pathinfo:frogbot:editor
- "Frogbot route-editor subcommand (run via the bot command with editor mode enabled)" -> src/bot_commands.c:2347,2386 `{ "pathinfo", FrogbotPathList, ... }` in editor_commands[] + `commands = FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands;` -> MATCH
- "prints the routing paths to and from a marker" -> src/bot_commands.c:1848,1864,1884 `strlcpy(message, "Paths away:\n", ...) ... strlcat(message, "Path to:\n", ...) ... G_sprint(self, PRINT_HIGH, "%s", message);` -> MATCH
- "By default it uses the marker the player is touching or nearest" -> src/bot_commands.c:1805,1826-1829 `gedict_t *marker = self->fb.touch_marker; ... if (marker == NULL) { marker = LocateMarker(self->s.v.origin); }` -> MATCH
- "an optional marker number selects a specific marker" -> src/bot_commands.c:1807-1815 `if (trap_CmdArgc() >= 3) { ... marker = markers[atoi(temp) - 1]; }` -> MATCH
- "\"Paths away\" lists each outgoing path's destination marker index, classname, path flags, and angle hint" -> src/bot_commands.c:1857-1861 `va("  %3d: %s [%s] ang %d\n", next->fb.index + 1, next->classname, strnull(path_flags) ? "(none)" : path_flags, marker->fb.paths[i].angle_hint)` -> MATCH
- "\"Path to\" lists the markers whose paths lead into this marker" -> src/bot_commands.c:1865-1881 `for (i ... NUMBER_MARKERS) ... if (markers[i]->fb.paths[j].next_marker == marker) { strlcat(message, va("  %3d: %s\n", markers[i]->fb.index + 1, markers[i]->classname), ...); }` -> MATCH
WI-2: n/a

RESULT | ktx:command:pickup | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | toggle write-site, broadcast, votes-req, and both reject guards all map to verified lines in VotePickup().
### ktx:command:pickup
- "Toggles the calling player's vote for a pickup game" -> src/commands.c:2553 `self->v.pickup = !self->v.pickup;` -> MATCH
- "broadcasts the player's stance (\"pickup!\" or \"no pickup\") to everyone" -> src/commands.c:2555-2556 `G_bprint(2, "%s %s %s%s\n", self->netname, redtext("says"), (self->v.pickup ? "pickup!" : "no pickup"), ...)` -> MATCH
- "including the current number of votes still required when applicable" -> src/commands.c:2557 `((votes = get_votes_req( OV_PICKUP, true)) ? va(" (%d)", votes) : "")` -> MATCH
- "Has no effect while a match is in progress" -> src/commands.c:2541-2544 `if (match_in_progress) { return; }` -> MATCH
- "rejected while captain team-picking is active" -> src/commands.c:2546-2551 `if (k_captains) { G_sprint(self, 2, "No pickup when captain stuffing\n"); return; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:pos_save | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | write-site (VectorCopy into self->pos[idx]), 5-slot bound, the four reject conditions, and the recall relationship all verified.
### ktx:command:pos_save
- "Saves the calling player's current position -- origin, view angles, and velocity -- into one of 5 numbered slots" -> src/commands.c:6440-6442,6456-6458 `Pos_Save_origin/angles/velocity = VectorCopy(self->s.v.*, (pos)->*)`; `pos_t pos[MAX_POSITIONS]` + `#define MAX_POSITIONS (5)` (include/progs.h:301,1019) -> MATCH
- "With no argument it uses slot 1" -> src/commands.c:6412-6419 `if (trap_CmdArgc() == 2) { ... } return 0;` (idx 0 -> "Position 1") -> MATCH
- "an optional numeric argument (clamped to 1-5) selects the slot" -> src/commands.c:6416 `return bound(0, atoi(arg_2) - 1, MAX_POSITIONS - 1);` -> MATCH
- "refused while a match is in progress, during intermission, while sv_paused is set, or during an active race round" -> src/commands.c:6406,6449-6452 `#define Pos_Disallowed() (match_in_progress || intermission_running || cvar("sv_paused") || (isRACE() && race.status))` ... `if (Pos_Disallowed()) { return; }` -> MATCH
- "otherwise it confirms with \"Position N was saved\"" -> src/commands.c:6460 `G_sprint(self, 2, "Position %d was saved\n", idx + 1);` -> MATCH
- "The saved slot is later recalled by pos_show / pos_move / pos_origin / pos_angles" -> src/commands.c:903-910 (registration) + src/commands.c:6427 `pos = &(self->pos[idx = Pos_Get_idx()]);` (shared self->pos[] array) -> MATCH
WI-2: n/a

## Wave 08c (Round-2 wave 08 -> Round-3 08b -> Round-4 08c; 2 prior rejects) -- canary k_teamoverlay expect C-NEAR-MISS, returned C-NEAR-MISS (GATE 1 PASS); GATE 2 PASS (re-grep: flagged _k_coachteam2 -- src/-wide grep shows ONLY world.c:1028 RegisterCvar + g_userinfo.c:368 read, ZERO write site [captain analog _k_captteam written captain.c:389; coach write never ported] -> "holds the team name" FABRICATED, C-FIX confirmed [matches the orchestrator write-site ground truth that rejected 08b]; clean k_count match.c:2443 `max(3,(int)cvar("k_count"))` / 2453 bloodfest `max(5,...)` / 2458 `!deathmatch -> 0`). Canary row k_teamoverlay stripped (control).

RESULT | ktx:cvar:_k_coachteam2 | C-FIX | flavourC=1 | wi2=0 | clauses=3 | core "holds the team name / forced back to stored team name" mechanism has zero write site in src/ -- the cvar is registered (empty default) and only read; the asserted stored-value behavior is fabricated (WRITE-SITE rule).
### ktx:cvar:_k_coachteam2
- "Internal mod-state cvar holding the team name that the second coach slot is bound to" -> src/world.c:1028 `RegisterCvar("_k_coachteam2"); // internal mod usage` -> MISMATCH(NO write site anywhere in src/: grep of cvar_set/cvar_fset for "coachteam" returns empty; the cvar is only RegisterCvar'd [bare register = empty string] and read once at g_userinfo.c:368. Nothing ever stores a team name into it -- the "holds the team name" mechanism is fabricated; WRITE-SITE rule: a read-only/no-write cvar described as "holding <semantic value>" is C-FIX. The captain analog _k_captteam IS written src/captain.c:389 `cvar_set(va("_k_captteam%d", capt_num(p)), getteam(p))` -- the coach write side was never ported)
- "a spectating coach assigned to slot 2 (k_picked == 2) is locked to this team: any attempt to switch to a different team is rejected and forced back to the stored team name" -> src/g_userinfo.c:366-378 `else if (self->k_picked == 2) { s2 = cvar_string("_k_coachteam2"); } ... if (strneq(s1, s2)) { ... stuffcmd_flags(self, ..., "team \"%s\"\n", s2); }` -> MISMATCH(read exists but s2 is always "" since _k_coachteam2 is never written -- "force back to stored team name" forces back to empty, not a stored team)
- "When two coaches are active" -> src/g_userinfo.c:357 `if (k_coaches == 2)` -> MATCH
WI-2: n/a

RESULT | ktx:cvar:demo_scoreslength | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=3 | formula and floor reproduce the enforcing line client.c:690 verbatim; registered default "10" consistent, not asserted.
### ktx:cvar:demo_scoreslength
- "Number of seconds the end-of-game intermission (score table) is held before the server changes to the next level" -> src/client.c:690 `intermission_exittime = g_globalvars.time + 1 + max(1, cvar("demo_scoreslength"));` -> MATCH
- "The actual enforced delay is 1 + max(1, demo_scoreslength) seconds" -> src/client.c:690 `g_globalvars.time + 1 + max(1, cvar("demo_scoreslength"))` -> MATCH
- "values below 1 are treated as 1" -> src/client.c:690 `max(1, cvar("demo_scoreslength"))` -> MATCH
WI-2: n/a (RegisterCvarEx world.c:850 "10"; not asserted)

RESULT | ktx:cvar:k_ann | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | connect (spectate.c:180) and disconnect (spectate.c:239) both use the same ternary; find_spc/find_client semantics and bare-register default 0 confirm every polarity/scope clause.
### ktx:cvar:k_ann
- "Controls whether spectator join/leave messages reach players during a live match. 0 = no, 1 = yes (default 0)" -> src/spectate.c:180 `(match_in_progress == 2 && !cvar("k_ann")) ? find_spc(p) : find_client(p)` + src/world.c:943 `RegisterCvar("k_ann");` -> MATCH (bare register => default 0)
- "the message is always sent to other spectators" -> src/g_utils.c:1343 `find_spc` (ct==ctSpec) subset of src/g_utils.c:1306 `find_client` (ctPlayer||ctSpec) -> MATCH (both ternary branches include spectators)
- "when k_ann is 1 it is additionally sent to the active players" -> src/spectate.c:180 (k_ann nonzero during match => find_client => includes ctPlayer) -> MATCH
- "when k_ann is 0 it is withheld from players" -> src/spectate.c:180 (match_in_progress==2 && !k_ann => find_spc => ctSpec only) + src/spectate.c:239 same ternary -> MATCH
- "Outside a live match the message goes to everyone regardless of this setting" -> src/spectate.c:180 `match_in_progress == 2 && ...` (!=2 => AND false => find_client) -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_cg_kb | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | spawn gate, invisibility, T_RadiusDamage(...,120,...,dtRL) knockback, and the k_instagib-only call path all map to located enforcing lines.
### ktx:cvar:k_cg_kb
- "When set (nonzero), the Instagib coilgun spawns an additional invisible kickback projectile alongside the instant hitscan bullet" -> src/weapons.c:438-463 `if (cvar("k_cg_kb")) { newmis = spawn(); ... newmis->classname = "kickback"; setmodel(newmis, ""); setsize(newmis, 0,0,0,0,0,0); }` (hitscan trace loop still runs weapons.c:465+) -> MATCH
- "on impact that projectile delivers rocket-launcher-style radius damage and knockback ... rocket-jump / push capability" -> src/weapons.c:940 `T_RadiusDamage(self, PROG_TO_EDICT(self->s.v.owner), 120, other, dtRL);` (touch=T_InstaKickback weapons.c:451) -> MATCH (dtRL = rocket death type; radius damage applies knockback incl. owner)
- "When 0, no kickback projectile is spawned (pure hitscan, no recoil push)" -> src/weapons.c:438 `if (cvar("k_cg_kb"))` (block skipped when 0) -> MATCH
- "Only effective while Instagib (k_instagib) is enabled" -> src/weapons.c:839-846 `if (cvar("k_instagib")) { FireInstaBullet(dir, dtSG); } else { FireBullets(...); }` (FireInstaBullet holds the k_cg_kb gate, called only under k_instagib) -> MATCH
WI-2: n/a (RegisterCvarEx world.c:977 "1"; not asserted)

RESULT | ktx:cvar:k_count | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | floor 3, bloodfest-min 5, and the !deathmatch zero-out each map to their enforcing line + adjacent comment; registered default "10".
### ktx:cvar:k_count
- "Duration, in seconds, of the pre-match countdown before a game starts" -> src/match.c:2443 `timer->cnt2 = max(3, (int)cvar("k_count"));` (timer->cnt2 = pre-match timer countdown counter) -> MATCH
- "The effective countdown is floored at 3 seconds" -> src/match.c:2443 `max(3, (int)cvar("k_count")); // at the least we want a 3 second countdown` -> MATCH
- "(raised to a minimum of 5 in bloodfest mode)" -> src/match.c:2450-2453 `if (k_bloodfest) { ... timer->cnt2 = max(5, (int)cvar("k_count")); }` -> MATCH
- "in coop and other non-deathmatch modes there is no countdown regardless of this value" -> src/match.c:2455-2458 `else if (!deathmatch) { // no countdown in coop or similar modes. timer->cnt2 = 0; }` -> MATCH
WI-2: n/a (RegisterCvarEx world.c:939 "10"; the universal +1 at match.c:2468 does not contradict the stated cvar-value floor)

<!-- ROUND 4: waves 05c,08c ACCEPTED = 10 batch rows. Both passed GATE 1 (k_teamoverlay canary C-NEAR-MISS -- augmented write-site/threshold sharpening) AND GATE 2 (the two invisible defects 05b/08b false-negatived are now caught and match the orchestrator ground truth: midair_minheight C-FIX combat.c:682 64u floor; _k_coachteam2 C-FIX zero write site). All 59 batch rows now classified + accepted. -->

<!-- ============ BATCH 04 FINAL TALLY ============
59 batch rows (canaries excluded). TRACED-CLEAN 50 | C-NEAR-MISS 2 | C-FIX 7 | WI2-FIX 0 | flavour-C-positive 9/59 (~15.3%).
C-NEAR-MISS (2): ktx:command:health:frogbot:std, ktx:command:prewar
C-FIX (7): ktx:command:autotrackktx, ktx:command:ctfbasedspawn, ktx:cvar:k_hoonymode, ktx:cvar:k_on_end_f_modified, ktx:cvar:k_vp_map, ktx:command:midair_minheight, ktx:cvar:_k_coachteam2
flagged for B4 re-synth (9): the 2 C-NEAR-MISS + 7 C-FIX above.
Waves: 12 logical slices, 16 dispatches. canary-rejected+redispatched: 4 (GATE 1 canary false-negative on k_teamoverlay: W5,W8; GATE 2 orchestrator-re-grep rejection of an invisible TRACED-CLEAN false-negative: W5b [midair_minheight], W8b [_k_coachteam2]). GATE 2 spot-verify: >=1 flagged + >=1 clean re-grepped per accepted wave, all held (the 2 GATE-2 rejections are where it did not hold -> wave rejected, a gate not a sample).
============================================== -->
