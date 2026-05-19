# KTX D7 V-pass -- batch 08 ledger (BATCH_ID 8, bucket 7)

B3 read-only verification-shaped pass (decisions.md D7 Amendment 2026-05-19,
B1-B5). NOT a re-synth: rows are CLASSIFIED only; no description edited, no DB
write. Authority for the method: enforce-trace-discipline.md.

- Oracle: /tmp/ktx-src-67253dc9 @ 67253dc9 == `1.47-2-g67253dc` (HARD GATE 1, verified byte-identical to synthesis source).
- Population: batch 8 = 61 rows, F-V1 strided partition `((('x'||substr(md5(canonical_id),1,8))::bit(32)::bigint) % 9 + 9) % 9 = 7`. 10 FIX knobs + 3 canary controls excluded from the population per the verified Step-2 SQL.
- Execution: read-only Opus general-purpose sub-agents, MAX reasoning, ~5 batch rows + 1 blind injected canary per wave. Sub-agent not told which row is the canary. Anti-rationalization sharpening applied from wave 1 (calibration proved the hardened prompt is necessary but not sufficient).
- F-V2 HARD GATE 1 (canary verdict): a wave whose injected canary verdict != ground truth is REJECTED and re-dispatched; nothing recorded from it. Canary rows are controls -- excluded from N and the flavour-C tally.
- F-V2 HARD GATE 2 (orchestrator re-grep): for every accepted wave the orchestrator independently re-grepped >=1 flagged row's wrong-clause enforcing line AND >=1 TRACED-CLEAN row's load-bearing clause against the oracle. A gate, not a sample.
- Canary ground truth (per probe + batch-01 GATE 2 re-confirm): autotrack -> C-FIX (commands.c:893 CF_SPECTATOR|CF_MATCHLESS, no CF_MATCHLESS_ONLY; DoCommand 1078/1083 additive-vs-only; no match_in_progress guard in the autotrack path -- "allowed only outside a live match" is WRONG). k_teamoverlay -> C-NEAR-MISS ("not in duel" has no enforcing line on the team-info stream; the only !isDuel() is match.c:1639, the settings-summary display string). k_yawnmode -> TRACED-CLEAN (every quantitative clause -- axe 50/20 dmm3, shotgun 21/14, projectile 1800/1000, backpack-drop, teleport-cap prereq -- maps to an enforcing line; the over-flag control).

<!-- ROUND A: waves 02,03,04 accepted (15 rows). Wave 01 REJECTED (GATE 2: 10on10 + 1on1 false-positive WI2-FIX -- subagent cited DoCommand:1091 but missed Init_cmds:1448-1451 CF_SPC_ADMIN|=CF_SPECTATOR promotion; the "admin spectator" access claims are CORRECT) -> re-dispatched as 01b with the Init_cmds promotion folded into the prompt. -->

## Wave 01b (Round A wave 01 re-dispatch, Init_cmds-sharpened) -- canary autotrack expect C-FIX, returned C-FIX (GATE 1 PASS -- the sharpening fixed the wave-01 false-positive); GATE 2 PASS (re-grep: flagged 3fav_go/18fav_go wrong-clause confirmed -- fav_add writes self->fav[] commands.c:5613/5614 vs favx_add writes self->favx[] :5732, xfav_go reads self->favx[] :5831 [different arrays]; clean 10on10 maxclients-20 commands.c:4389 + Init_cmds promotion commands.c:1448-1451 + 1on1 maxclients-2 :4218/k_mode-1 :4229). Canary row autotrack stripped (control).

RESULT | ktx:command:10on10 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=14 | All preset cvars match _10on10_um_init verbatim; access-class correct under Init_cmds CF_SPC_ADMIN->CF_SPECTATOR promotion + is_adm gate; auto-XonX default-case fallback confirmed in CheckAutoXonX. Only minor traceable vagueness (banner suppressed in matchless), acceptable.
### ktx:command:10on10
- "Switches the server to the built-in 10-on-10 ruleset preset" -> src/commands.c:813 `{ "10on10", DEF(UserMode), 5, ... }` + src/commands.c:4625 `void UserMode(float umode)` -> MATCH (arg 5 -> um_list index 4 = "10on10", UserMode applies the preset)
- "maxclients/k_maxclients 20 (20-player slot cap)" -> src/commands.c:4389-4390 `"maxclients 20\n" "k_maxclients 20\n"` -> MATCH
- "timelimit 20 (20-minute rounds)" -> src/commands.c:4391 `"timelimit 20\n" // 20 minute rounds` -> MATCH
- "teamplay 2 (self and teammate damage enabled)" -> src/commands.c:4392 `"teamplay 2\n" // hurt yourself and teammates` -> MATCH
- "deathmatch 1 (weapons do not stay on pickup)" -> src/commands.c:4393 `"deathmatch 1\n" // wpons dowont stay on pickup` -> MATCH
- "powerups enabled (k_pow 1)" -> src/commands.c:4394 `"k_pow 1\n" // user powerups` -> MATCH
- "minimum 5 players per team (k_membercount 5)" -> src/commands.c:4395 `"k_membercount 5\n" // minimum number of players in each team` -> MATCH
- "1-2 teams allowed (k_lockmin 1 / k_lockmax 2)" -> src/commands.c:4396-4397 `"k_lockmin 1\n" "k_lockmax 2\n"` -> MATCH
- "time-based overtime of 5 minutes (k_overtime 1 / k_exttime 5)" -> src/commands.c:4398-4399 `"k_overtime 1\n" // time based` `"k_exttime 5\n" // overtime 5mins` -> MATCH
- "Accepts an optional match-tag argument" -> src/commands.c:813 `CF_PARAMS` + src/commands.c:4667 `trap_CmdArgs(matchtag, sizeof(matchtag))` -> MATCH (matchtag read, applied via UserMode_SetMatchTag when !sv_invoked)
- "Usable by a player" -> src/commands.c:1104-1110 `if (!(cmds[icmd].cf_flags & CF_PLAYER)) return DO_WRONG_CLASS;` (no CF_PLR_ADMIN on row) -> MATCH (CF_PLAYER present, any player passes)
- "an admin spectator" -> src/commands.c:1448-1451 `if (cmds[i].cf_flags & CF_SPC_ADMIN) { cmds[i].cf_flags |= CF_SPECTATOR; }` then src/commands.c:1095-1100 `if (!(...CF_SPECTATOR)) return DO_WRONG_CLASS; if ((...CF_SPC_ADMIN) && !is_adm(self)) return DO_ACCESS_DENIED;` -> MATCH (Init_cmds promotion makes spectator path reachable; CF_SPC_ADMIN then requires admin)
- "or the server" -> src/commands.c:4636-4640 `if (umode < 0) { sv_invoked = true; ... }` (UserMode(-1) bypasses DoCommand) -> MATCH
- "the server also selects this preset automatically as the high-player-count fallback for auto-XonX" -> src/world.c:1244-1246 `default: um_idx = um_idx_byname("10on10"); break;` + src/world.c:1248-1252 `UserMode(-(um_idx + 1));` -> MATCH (count >= 10 default case selects 10on10, server-invoked)
WI-2: n/a -- access-class verified correct under the Init_cmds CF_SPC_ADMIN->CF_SPECTATOR promotion; not a defect.

RESULT | ktx:command:13fav_go | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=8 | Core behavior (slot-13 favx lookup, track, three error strings, CF_SPECTATOR, family range) all trace clean; the single populator clause "populated by the fav-add commands" is loose family-name inference -- the real populator is narrower (favN_add / favx_add only; the plain fav_add writes the separate fav[] list, not favx[]).
### ktx:command:13fav_go
- "Spectator-only command ... CF_SPECTATOR" -> src/commands.c:878 `{ "13fav_go", DEF(xfav_go), 13, CF_SPECTATOR, ... }` + src/commands.c:1090-1093 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) return DO_WRONG_CLASS;` -> MATCH (CF_SPECTATOR only, no CF_SPC_ADMIN, no CF_PLAYER)
- "Switches the spectator's point of view to the player stored in personal favourite slot 13" -> src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` (fav_num=13 from table arg) -> MATCH
- "the slot-indexed favourites list populated by the fav-add commands" -> src/commands.c:846-865 `{ "favN_add", DEF(favx_add), N, ... }` + src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` -> UNTRACEABLE(no enforcing line ties slot 13 to a generic "fav-add commands"; only fav13_add->favx_add(13) writes favx[12]; the plain fav_add at 5613 writes self->fav[], a different array -- clause is family-name inference, real code narrower)
- "by issuing a track on that player's user id" -> src/commands.c:5856 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p));` -> MATCH
- "If slot 13 is empty it prints \"fav go: slot 13 is not defined\"" -> src/commands.c:5833-5835 `if ((pl_num < 1) || (pl_num > MAX_CLIENTS)) { G_sprint(self, 2, "fav go: \220slot %d\221 is not defined\n", (int)fav_num);` -> MATCH
- "if the stored player is no longer connected it prints \"fav go: slot 13 can't find player\"" -> src/commands.c:5842-5844 `if (p->ct != ctPlayer) { G_sprint(self, 2, "fav go: \220slot %d\221 can't find player\n", (int)fav_num);` -> MATCH
- "if already spectating that player it prints \"fav go: already observing...\"" -> src/commands.c:5849-5851 `if (PROG_TO_EDICT(self->s.v.goalentity) == p) { G_sprint(self, 2, "fav go: already observing...\n");` -> MATCH
- "One of the 1fav_go..20fav_go family, identical behaviour per slot index 1-20" -> src/commands.c:866-885 `{ "1fav_go" .. "20fav_go", DEF(xfav_go), 1..20, CF_SPECTATOR, ... }` -> MATCH (20 rows, same xfav_go, args 1-20)
WI-2: n/a

RESULT | ktx:command:18fav_go | C-FIX | flavourC=1 | wi2=0 | clauses=8 | Core slot-18 behavior + error strings + CF_SPECTATOR + no-args all trace clean, but the "managed by fav_add / fav_del / fav_show" clause is WRONG: fav_add/fav_del operate on the separate fav[] auto-list, NOT the favx[] slot list 18fav_go reads. Secondary minor: family range stated "5fav_go..20fav_go", actual is 1fav_go..20fav_go.
### ktx:command:18fav_go
- "Spectator command (CF_SPECTATOR)" -> src/commands.c:883 `{ "18fav_go", DEF(xfav_go), 18, CF_SPECTATOR, ... }` + src/commands.c:1090-1093 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) return DO_WRONG_CLASS;` -> MATCH
- "switches your spectated point of view to the player stored in favourites slot 18" -> src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` (fav_num=18) -> MATCH
- "Slots are the 1-20 slot-based favourites list managed by fav_add / fav_del / fav_show" -> src/commands.c:5613 `self->fav[(int)fav_num - 1] = diff;` (fav_add) / src/commands.c:5630-5639 `if (s->fav[fav_num] && ...) s->fav[fav_num] = 0;` (fav_del_do) -> MISMATCH(fav_add and fav_del operate on the self->fav[] AUTO list, not the self->favx[] SLOT list; the slot list is populated by favN_add->favx_add (5732) and there is no favN_del user command; only fav_show at 5865-5884 reads favx[] -- attributing slot-list management to fav_add/fav_del is wrong vs the enforcing code)
- "this is the fixed-slot-18 form of the Nfav_go family (5fav_go..20fav_go)" -> src/commands.c:866-885 `{ "1fav_go" .. "20fav_go", ... }` -> MISMATCH(family is 1fav_go..20fav_go, table rows 866-885; "5fav_go..20fav_go" understates the range -- minor, slot-18 form itself correct)
- "On success it issues an internal 'track <userid>' to follow that player" -> src/commands.c:5856 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p));` -> MATCH
- "If slot 18 is empty, the saved player is no longer connected, or you are already observing them, it does nothing except print a 'fav go: slot 18 ...' status message" -> src/commands.c:5835 `"fav go: \220slot %d\221 is not defined\n"` / :5844 `"fav go: \220slot %d\221 can't find player\n"` / :5851 `"fav go: already observing...\n"` (each followed by return) -> MATCH (three branches each print + return; first two render "fav go: slot 18 ...")
- "Takes no arguments (the slot number is fixed by the command name)" -> src/commands.c:883 (no CF_PARAMS) + src/commands.c:5821-5856 `void xfav_go(float fav_num)` (no trap_CmdArgv read; fav_num is the table-fixed 18) -> MATCH
- "managed by ... fav_show" [fav_show sub-clause] -> src/commands.c:5865-5884 `if ((diff = self->favx[fav_num])) { ... G_sprint(self, 2, " \220slot %2d\221 \x8D %s\n", fav_num + 1, p->netname);` -> MATCH (fav_show does display the favx[] slot list -- this part of the clause is correct, isolated)
WI-2: n/a

RESULT | ktx:command:1on1 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=12 | Every preset cvar matches _1on1_um_init verbatim; broadcast string, config-exec chain, k_free_mode/k_allowed_free_modes access control, player-only matchtag write, and access-class (player or spectator-admin under Init_cmds promotion + is_adm) all trace clean. Minor traceable vagueness (banner suppressed in matchless) acceptable.
### ktx:command:1on1
- "Switches the server to the 1on1 (duel) match mode" -> src/commands.c:809 `{ "1on1", DEF(UserMode), 1, ... }` + src/commands.c:4537 `{ "1on1", "\223 on \223", _1on1_um_init, UM_1ON1, 1 }` -> MATCH (arg 1 -> um_list index 0 = "1on1")
- "Broadcasts \"1 on 1 settings enabled\"" -> src/commands.c:4789-4791 `G_bprint(2, "%s %s %s\n", redtext(va("%s", um_list[(int)umode].displayname)), redtext("settings enabled by"), self->netname);` -> MATCH (renders "1 on 1 settings enabled [by <name>]"; banner gated by !k_matchLess at :4780 -- minor traceable omission)
- "maxclients/k_maxclients 2" -> src/commands.c:4218-4219 `"maxclients 2\n" "k_maxclients 2\n"` -> MATCH
- "timelimit 10" -> src/commands.c:4220 `"timelimit 10\n" // 10 minute rounds` -> MATCH
- "teamplay 0" -> src/commands.c:4221 `"teamplay 0\n" // hurt yourself, no teammates here` -> MATCH
- "deathmatch 3 (weapons stay)" -> src/commands.c:4222 `"deathmatch 3\n" // weapons stay` -> MATCH
- "k_overtime 1 with k_exttime 3" -> src/commands.c:4223-4224 `"k_overtime 1\n" // overtime type = time based` `"k_exttime 3\n" // overtime 3mins` -> MATCH
- "k_pow 0, k_mode 1" -> src/commands.c:4225 `"k_pow 0\n"` + src/commands.c:4228 `"k_mode 1\n"` -> MATCH
- "execs the duel config chain: configs/usermodes/default.cfg, configs/usermodes/1on1/default.cfg, and any map-specific configs/usermodes/<map>.cfg overrides" -> src/commands.c:4801 `cfg_name = "configs/usermodes/default.cfg";` :4808 `cfg_name = va("configs/usermodes/%s/default.cfg", um);` :4822 `cfg_name = va("configs/usermodes/%s.cfg", mapname);` -> MATCH (um="1on1"; omits the 4th configs/usermodes/<um>/<mapname>.cfg at :4829 but states overrides generically -- minor incompleteness, not wrong)
- "Invokable by a player or spectator-admin" -> src/commands.c:1448-1451 `if (cmds[i].cf_flags & CF_SPC_ADMIN) { cmds[i].cf_flags |= CF_SPECTATOR; }` then src/commands.c:1104-1110 (CF_PLAYER, no CF_PLR_ADMIN) + src/commands.c:1095-1100 (CF_SPECTATOR post-promotion passes class gate, CF_SPC_ADMIN requires is_adm) -> MATCH (player passes; spectator must be admin)
- "subject to k_free_mode access control and k_allowed_free_modes" -> src/commands.c:4632 `int k_free_mode = (k_matchLess ? 5 : cvar("k_free_mode"));` :4717 `else if (!check_perm(self, k_free_mode)) return;` :4724 `if (!(um_list[(int)umode].um_flags & k_allowed_free_modes)) { ... return; }` -> MATCH
- "accepts an optional matchtag argument that is written to serverinfo when invoked by a player" -> src/commands.c:809 `CF_PARAMS` + src/commands.c:4839-4842 `if (!sv_invoked) { UserMode_SetMatchTag(matchtag); }` + src/commands.c:4604 `localcmd("serverinfo matchtag \"%s\"\n", clean_string(matchtag));` -> MATCH (matchtag->serverinfo only on the !sv_invoked / player path)
WI-2: n/a -- access-class verified correct under the Init_cmds CF_SPC_ADMIN->CF_SPECTATOR promotion; not a defect.

RESULT | ktx:command:3fav_go | C-FIX | flavourC=1 | wi2=0 | clauses=7 | Slot-3 favx lookup, three error strings, CF_SPECTATOR, family all trace clean; but the populator clause names "fav_add" as a slot-3 populator -- WRONG: fav_add writes the separate self->fav[] auto-list (5613), never favx[]; only fav3_add (favx_add) populates slot 3.
### ktx:command:3fav_go
- "Spectator command ... (CF_SPECTATOR)" -> src/commands.c:868 `{ "3fav_go", DEF(xfav_go), 3, CF_SPECTATOR, ... }` + src/commands.c:1090-1093 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) return DO_WRONG_CLASS;` -> MATCH
- "switches your point of view to whichever player is stored in favourites slot 3" -> src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` (fav_num=3) + src/commands.c:5856 `stuffcmd_flags(self, ... "track %d\n", GetUserID(p));` -> MATCH
- "The slot is populated beforehand by the fav3_add / fav_add commands" -> src/commands.c:848 `{ "fav3_add", DEF(favx_add), 3, CF_SPECTATOR, ... }` + src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (fav3_add OK) vs src/commands.c:5613 `self->fav[(int)fav_num - 1] = diff;` (fav_add) -> MISMATCH(fav3_add->favx_add(3) correctly writes favx[2]; but fav_add writes self->fav[] -- the AUTO list consumed by fav_next -- NOT self->favx[]/slot 3, so naming fav_add as a slot-3 populator is wrong vs the enforcing assignment)
- "If slot 3 holds no player it prints \"slot 3 is not defined\"" -> src/commands.c:5833-5835 `G_sprint(self, 2, "fav go: \220slot %d\221 is not defined\n", (int)fav_num);` -> MATCH (substring "slot 3 is not defined" present; %d=3)
- "if the stored player is no longer an active player it prints \"can't find player\"" -> src/commands.c:5842-5844 `if (p->ct != ctPlayer) { G_sprint(self, 2, "fav go: \220slot %d\221 can't find player\n", (int)fav_num);` -> MATCH
- "if you are already observing that player it does nothing" -> src/commands.c:5849-5852 `if (PROG_TO_EDICT(self->s.v.goalentity) == p) { G_sprint(self, 2, "fav go: already observing...\n"); return; }` -> MATCH (prints then returns -- no track issued)
- "One of the per-slot family 1fav_go..20fav_go, identical behavior with the slot number fixed to 3" -> src/commands.c:866-885 `{ "1fav_go" .. "20fav_go", DEF(xfav_go), 1..20, CF_SPECTATOR, ... }` -> MATCH
WI-2: n/a
## Wave 02 -- canary k_teamoverlay expect C-NEAR-MISS, returned C-NEAR-MISS (GATE 1 PASS); GATE 2 PASS (re-grep: canary basis match.c:1639 only !isDuel() on the settings-summary string + client.c:4697 send-path gate has no isDuel; clean fairpacks ++k_frp>2 wrap commands.c:3191 + airstep match_in_progress||isRACE commands.c:8575). All 5 batch rows TRACED-CLEAN. Canary row k_teamoverlay stripped (control).

RESULT | ktx:command:4on4on4 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=11 | All preset values (maxclients/k_maxclients 12, teamplay 2, deathmatch 1, k_pow 1, k_membercount 3, k_lockmin 1/k_lockmax 3, timelimit 20, k_overtime 1/k_exttime 5, k_mode 2) match _4on4on4_um_init verbatim; common-reset-first ordering enforced in UserMode.
### ktx:command:4on4on4
- "three-team match with three squads of four" -> src/commands.c:4549 `{ "4on4on4", "\226 on \226 on \226", _4on4on4_um_init, UM_4ON4ON4, 0 }` -> MATCH (displayname + k_lockmax 3 = up to 3 teams)
- "Caps the server at 12 players (maxclients/k_maxclients 12)" -> src/commands.c:4373-4374 `"maxclients 12\n" "k_maxclients 12\n"` -> MATCH
- "sets teamplay 2 (teammates and self can be damaged)" -> src/commands.c:4376 `"teamplay 2\n" // hurt teammates and yourself` -> MATCH
- "deathmatch 1 (base mode -- weapons do not stay on pickup)" -> src/commands.c:4377 `"deathmatch 1\n" // weapons wont stay on pickup` -> MATCH
- "enables powerups" -> src/commands.c:4378 `"k_pow 1\n" // use powerups` -> MATCH
- "requires 3 players minimum per team" -> src/commands.c:4379 `"k_membercount 3\n" // minimum number of players in each team` -> MATCH
- "allows 1-3 teams (k_lockmax 3)" -> src/commands.c:4380-4381 `"k_lockmin 1\n" "k_lockmax 3\n"` -> MATCH
- "runs a 20-minute timelimit" -> src/commands.c:4375 `"timelimit 20\n" // 20 minute rounds` -> MATCH
- "with time-based 5-minute overtime" -> src/commands.c:4382-4383 `"k_overtime 1\n" // time based` / `"k_exttime 5\n" // overtime 5mins` -> MATCH
- "sets the internal game mode to k_mode 2" -> src/commands.c:4384 `"k_mode 2\n"` -> MATCH
- "The shared common reset runs first" -> src/commands.c:4796,4799 `trap_readcmd(common_um_init, buf, ...)` then `trap_readcmd(um_list[(int)umode].initstring, buf, ...)` -> MATCH (common first, mode-specific second)
WI-2: n/a (description makes no default-value or admin/player/spectator access-class claim)

RESULT | ktx:command:airstep | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=3 | Toggle/flip polarity via cvar_toggle_msg (i=!cvar), broadcast via G_bprint->trap_BPrint, and match/race ignore (match_in_progress || isRACE()) all map to enforcing lines.
### ktx:command:airstep
- "flipping the pm_airstep cvar (off->on or on->off)" -> src/commands.c:8580 `cvar_toggle_msg(self, "pm_airstep", redtext("pm_airstep"));` + src/g_utils.c:2211 `i = !cvar(cvarName);` -> MATCH (boolean negation = off<->on)
- "broadcasting the new state to all players" -> src/g_utils.c:2215 `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg);` (G_bprint -> trap_BPrint, broadcast) -> MATCH
- "Ignored while a match is in progress or in race mode" -> src/commands.c:8575-8578 `if (match_in_progress || isRACE()) { return; }` (isRACE() == cvar("k_race"), race.c:217-220) -> MATCH
WI-2: n/a (no default-value or access-class claim in description)

RESULT | ktx:command:disable:frogbot:std | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | std_commands "disable"->FrogbotsDisable: clears k_fb_enabled (FB_CVAR_ENABLED), GotoNextMap, UserMode(-_k_last_xonx) restore, whole body gated on !match_in_progress; "player/spectator game mode" wording is loose but the restore-to-prior-mode assertion traces and is true.
### ktx:command:disable:frogbot:std
- "standard bot command set; invoked as 'botcmd disable'" -> src/commands.c:1047 `{ "botcmd", FrogbotsCommand, ... }` + src/bot_commands.c:2315,2323 `static frogbot_cmd_t std_commands[] = ... { "disable", FrogbotsDisable, "Disable frogbots" }` (dispatch picks std_commands when not editor mode, line 2386) -> MATCH
- "clears the bot-enabled cvar (k_fb_enabled = 0)" -> src/bot_commands.c:2148 `cvar_fset(FB_CVAR_ENABLED, 0);` + include/fb_globals.h:398 `#define FB_CVAR_ENABLED "k_fb_enabled"` -> MATCH
- "advances to the next map" -> src/bot_commands.c:2149 `GotoNextMap();` -> MATCH
- "restores the player/spectator game mode that was active before bots were enabled" -> src/bot_commands.c:2150 `UserMode(-cvar("_k_last_xonx"));` (set at src/commands.c:4847 `cvar_fset("_k_last_xonx", umode + 1);` end of every UserMode) -> MATCH (restores prior XonX/user mode; "player/spectator" phrasing loose but traceable and true)
- "It has no effect while a match is in progress" -> src/bot_commands.c:2146 `if (!match_in_progress) { ... }` (entire body gated) -> MATCH
WI-2: n/a (no default-value or access-class claim in description)

RESULT | ktx:command:dumpent | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Cheat-gate (strnull(*cheats)->refuse), match-refuse, dump.ent open, per-dropitem-entity block (classname+origin always, angle/angles+spawnflags conditional), "Dumped N entities", and dropitem-only filter (p->dropitem set at commands.c:9144) all enforced.
### ktx:command:dumpent
- "Cheat-only command ... Requires the *cheats serverinfo to be set" -> src/commands.c:9341-9347 `if (strnull(ezinfokey(world, "*cheats"))) { G_sprint(..."Cheats are disabled..."); return; }` -> MATCH (empty/unset *cheats refuses)
- "refused while a match is in progress" -> src/commands.c:9336-9339 `if (match_in_progress) { return; }` -> MATCH
- "writes a file named dump.ent" -> src/commands.c:9349 `trap_FS_OpenFile("dump.ent", &file_handle, FS_WRITE_BIN)` -> MATCH
- "one entity block (classname, origin, and angle/angles and spawnflags when set)" -> src/commands.c:9369-9385 classname (always 9369), origin (always 9370-9371), `if (angles[0]||angles[2]) "angles" else if (angles[1]) "angle"` (9373-9381), `if (p->s.v.spawnflags) "spawnflags"` (9383-9385) -> MATCH (conditional angle/angles + spawnflags-when-set exactly as described)
- "for every entity that was placed during this session with the dropitem command" -> src/commands.c:9358-9361 `if (!p->dropitem) continue;` + src/commands.c:9144 `p->dropitem = true;` (set by dropitem cmd, table line 1037) -> MATCH
- "then reports \"Dumped N entities\"" -> src/commands.c:9395 `G_sprint(self, 2, "Dumped %d entities\n", cnt);` -> MATCH
- "export half of the dropitem/dumpent map-editing pair" -> src/commands.c:1037 `{ "dropitem", dropitem, ... }` + 1039 `{ "dumpent", dumpent, ... }` (paired commands) -> MATCH (descriptive pairing)
- "entities that were not spawned via dropitem are not included" -> src/commands.c:9358-9361 `if (!p->dropitem) continue;` -> MATCH
WI-2: n/a (cheat-only + match-refuse correctly stated and traced; no default-value or admin/player/spectator class claim)

RESULT | ktx:command:fairpacks | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | k_frp cycle 0->1->2->0 (++k_frp>2 -> 0), G_bprint broadcast, state messages, match-ignore, yawnmode-forced-2-no-cycle (get_fair_pack returns 2, cvar_fset skipped), AND the actual death-drop weapon selection (k_frp==1 best-weapon chain / k_frp==2 lastwepfired in DropBackpack) all enforced.
### ktx:command:fairpacks
- "Cycles the fairpacks setting (server cvar k_frp) through three states" -> src/commands.c:3177 `int k_frp = bound(0, cvar("k_frp"), 2);` + 3194 `cvar_fset("k_frp", k_frp);` -> MATCH
- "broadcasts the new state to everyone" -> src/commands.c:3199,3203,3207 `G_bprint(2, "%s ...\n", redtext("Fairpacks"))` (broadcast) -> MATCH
- "0 = disabled (normal backpack)" -> src/commands.c:3197-3200 `if (!k_frp) { G_bprint(2, "%s disabled\n", ...); }` (default DropBackpack behavior, no override branches taken) -> MATCH
- "1 = the player's best weapon is placed in the backpack dropped on death" -> src/items.c:2709-2741 `// drop best weapon in case of fairpacks 1` `if (f1 == 1) { ... item->s.v.items = IT_ROCKET_LAUNCHER ... }` (best-weapon priority chain in DropBackpack, f1=get_fair_pack()) -> MATCH
- "2 = the last weapon the player fired is placed in that backpack" -> src/items.c:2743-2750 `// drop lastfired ... fairpacks 2` `if (f1 == 2) { if ((int)self->lastwepfired & IT_DROPPABLE_WEAPONS) item->s.v.items = self->lastwepfired; }` -> MATCH
- "Each invocation advances 0 -> 1 -> 2 -> 0" -> src/commands.c:3191-3192 `if (++k_frp > 2) k_frp = 0;` -> MATCH
- "ignored while a match is in progress" -> src/commands.c:3179-3182 `if (match_in_progress) { return; }` -> MATCH
- "under yawnmode the setting is forced to 2 and cannot be cycled" -> src/commands.c:3184-3187 `if (k_yawnmode) { k_frp = get_fair_pack(); }` (else-branch with ++k_frp/cvar_fset skipped => not cycled) + src/g_utils.c:2720 `return bound(0, k_yawnmode ? 2 : cvar("k_frp"), 2);` (forced 2) -> MATCH
WI-2: n/a (no default-value or admin/player/spectator access-class claim in description)

## Wave 03 -- canary k_yawnmode expect TRACED-CLEAN, returned TRACED-CLEAN (GATE 1 PASS -- over-flag control held, no batch row over-flagged); GATE 2 PASS (re-grep: clean giveme default-30s commands.c:8970/8973 + fp is_adm gate g_cmd.c:199/201; canary k_yawnmode axe 50/20 dmm3 weapons.c:128). All 5 batch rows TRACED-CLEAN. Canary row k_yawnmode stripped (control).

RESULT | ktx:command:fav11_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | All clauses traced: CF_SPECTATOR-only dispatch, ctPlayer tracking guard, unconditional slot-11 write, overwrite semantics, and 11fav_go POV-snap via track all map to enforcing lines + the favx[] field comment.
### ktx:command:fav11_add
- "Spectator command" -> src/commands.c:856 `{ "fav11_add", DEF(favx_add), 11, CF_SPECTATOR, CD_FAV11_ADD }` + src/commands.c:1088-1106 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) return DO_WRONG_CLASS;` ... player branch `if (!(cmds[icmd].cf_flags & CF_PLAYER)) return DO_WRONG_CLASS;` -> MATCH (flags = CF_SPECTATOR only)
- "Stores the player you are currently tracking into indexed favourite slot 11" -> src/commands.c:5722-5731 `void favx_add(float fav_num){ gedict_t *goal = PROG_TO_EDICT(self->s.v.goalentity); int diff = (int)(goal - world); ... self->favx[(int)fav_num - 1] = diff; }` with src/progs.h:1009 `int favx[MAX_CLIENTS]; // here stored players number for appropriate favX_add/Xfav_go commands` -> MATCH (table arg 11; fav_num-1 = index 10 = slot 11; goalentity is tracked target)
- "Does nothing unless you are tracking a real player" -> src/commands.c:5727 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)){ G_sprint(self, 2, "fav add: you are %s player!\n", redtext("not tracking")); return; }` -> MATCH (non-player goal => early return before any write)
- "written to slot 11 (overwriting any previous occupant)" -> src/commands.c:5731 `self->favx[(int)fav_num - 1] = diff;` -> MATCH (unconditional assignment to favx[10]; no prior-occupant check)
- "11fav_go later snaps your POV to whoever occupies that slot" -> src/commands.c:5830-5854 `pl_num = self->favx[(int)fav_num - 1]; ... stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p));` (registered src/commands.c:876 `{ "11fav_go", DEF(xfav_go), 11, CF_SPECTATOR, ... }`) -> MATCH (reads favx[10], issues track = POV snap)
WI-2: n/a (CF_SPECTATOR-only => spectator-class, no admin gate; verified at the dispatch class gate)

RESULT | ktx:command:fav12_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Identical shared favx_add path as fav11; only the slot index differs (table arg 12 -> favx[11]); all clauses map to enforcing lines.
### ktx:command:fav12_add
- "Spectator command" -> src/commands.c:857 `{ "fav12_add", DEF(favx_add), 12, CF_SPECTATOR, CD_FAV12_ADD }` + src/commands.c:1088-1106 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) return DO_WRONG_CLASS;` / player branch `if (!(cmds[icmd].cf_flags & CF_PLAYER)) return DO_WRONG_CLASS;` -> MATCH (CF_SPECTATOR only)
- "Stores the player you are currently tracking into indexed favourite slot 12" -> src/commands.c:5722-5731 `void favx_add(float fav_num){ ... self->favx[(int)fav_num - 1] = diff; }` + src/progs.h:1009 `int favx[MAX_CLIENTS]` -> MATCH (arg 12 -> index 11 = slot 12)
- "Does nothing unless you are tracking a real player" -> src/commands.c:5727 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)){ ... return; }` -> MATCH
- "written to slot 12 (overwriting any previous occupant)" -> src/commands.c:5731 `self->favx[(int)fav_num - 1] = diff;` -> MATCH (unconditional write to favx[11])
- "12fav_go later snaps your POV to whoever occupies that slot" -> src/commands.c:877 `{ "12fav_go", DEF(xfav_go), 12, CF_SPECTATOR, ... }` + src/commands.c:5830-5854 `pl_num = self->favx[(int)fav_num - 1]; ... stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p));` -> MATCH (reads favx[11], track-snaps POV)
WI-2: n/a (CF_SPECTATOR-only spectator class, no admin gate)

RESULT | ktx:command:fav15_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Same shared favx_add/xfav_go path; table arg 15 -> favx[14]; slot 15 within MAX_CLIENTS=32 range; all clauses enforced.
### ktx:command:fav15_add
- "Spectator command" -> src/commands.c:860 `{ "fav15_add", DEF(favx_add), 15, CF_SPECTATOR, CD_FAV15_ADD }` + src/commands.c:1088-1106 class gate -> MATCH (CF_SPECTATOR only)
- "Stores the player you are currently tracking into indexed favourite slot 15" -> src/commands.c:5722-5731 `void favx_add(float fav_num){ ... if ((fav_num < 1) || (fav_num > MAX_CLIENTS)){ return; } ... self->favx[(int)fav_num - 1] = diff; }` (MAX_CLIENTS=32, q_shared.h:121) + src/progs.h:1009 favx comment -> MATCH (arg 15 valid, index 14 = slot 15)
- "Does nothing unless you are tracking a real player" -> src/commands.c:5727 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)){ ... return; }` -> MATCH
- "written to slot 15 (overwriting any previous occupant)" -> src/commands.c:5731 `self->favx[(int)fav_num - 1] = diff;` -> MATCH (unconditional write to favx[14])
- "15fav_go later snaps your POV to whoever occupies that slot" -> src/commands.c:880 `{ "15fav_go", DEF(xfav_go), 15, CF_SPECTATOR, ... }` + src/commands.c:5836-5854 `pl_num = self->favx[(int)fav_num - 1]; ... stuffcmd_flags(self, ..., "track %d\n", GetUserID(p));` -> MATCH (reads favx[14], track-snaps POV)
WI-2: n/a (CF_SPECTATOR-only spectator class, no admin gate)

RESULT | ktx:command:fp | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | All behavioral clauses (cycle-with-wraparound, k_fp update, FixSayFloodProtect re-apply, preset count/per/for struct, broadcast) and the admin-rights requirement map to enforcing lines; admin requirement enforced by an explicit in-body is_adm gate.
### ktx:command:fp
- "Admin command ... Requires admin rights" -> src/g_cmd.c:198-203 `if (!is_adm(self)){ G_sprint(self, 2, "You are not an admin\n"); return; }` (inside fp_toggle, table handler src/commands.c:963 `{ "fp", DEF(fp_toggle), 1, CF_BOTH_ADMIN, CD_FP }`) -> MATCH (explicit is_adm gate enforces admin-only; is_adm = is_real_adm || k_admin&AF_ADMIN per src/admin.c:16)
- "Advances the chat flood-protection level applied to players to the next preset" -> src/g_cmd.c:195-204 `char *k_fp_name = (type == 1 ? "k_fp" : "k_fp_spec"); int k_fp = bound(1, cvar(k_fp_name), say_fp_levels_cnt); ... if (++k_fp > say_fp_levels_cnt)` (table arg = 1 => type==1 => "k_fp" = players) -> MATCH
- "cycling back to the first level after the last" -> src/g_cmd.c:206-209 `if (++k_fp > say_fp_levels_cnt){ k_fp = 1; }` -> MATCH (wraps to 1 past last)
- "updating the k_fp setting and re-applying flood protection" -> src/g_cmd.c:211-213 `cvar_fset(k_fp_name, k_fp); FixSayFloodProtect();` -> MATCH
- "Each preset defines how many messages are allowed, over what time window, and for how long a flooder is muted" -> src/g_cmd.c:142-155 `typedef struct say_fp_level_s { int fp_count; int fp_per; int fp_for; char *name; } say_fp_level_t; say_fp_level_t say_fp_levels[] = { { 9, 1, 1, "Low" }, { 4, 1, 5, "Medium" }, { 5, 3, 7, "High" } };` -> MATCH (fp_count=messages, fp_per=window, fp_for=mute duration)
- "the new level's name and limits are broadcast to everyone" -> src/g_cmd.c:215-218 `G_bprint(2, "%s level %s \x90%s %s %s\x91 %6s\n", ..., dig3(say_fp_levels[k_fp - 1].fp_count), ...);` with src/g_utils.c:777-787 `void G_bprint(...){ ... trap_BPrint(level, text, 0); }` -> MATCH (G_bprint => broadcast; prints name + count/per/for)
WI-2: n/a (access-class "admin" enforced by the explicit is_adm gate in fp_toggle; default of k_fp is "1" via RegisterCvarEx("k_fp","1") world.c:1007 but the description makes no default-value claim)

RESULT | ktx:command:giveme | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=11 | Every clause (cheat-gate via *cheats, q/p/r/s powerup grants + item bits, 30s default on omit/0, rune/runes/norunes serverflag ops, no-arg usage) maps to an enforcing line; CF_PLAYER dispatch verified.
### ktx:command:giveme
- "Cheat command that grants the issuing player a powerup or runes" -> src/commands.c:8944-9028 `void giveme(void){ ... self->s.v.items = (int)self->s.v.items | IT_QUAD; ... }` (all grants target `self`) -> MATCH
- "Requires cheats enabled (the *cheats serverinfo key); otherwise it is refused" -> src/commands.c:8951-8957 `if (strnull(ezinfokey(world, "*cheats"))){ G_sprint(self, 2, "Cheats are disabled on this server, ... %s\n", self->netname); return; }` -> MATCH
- "Usage: 'giveme <q|p|r|s> [seconds]'" -> src/commands.c:8936-8942 `void giveme_usage(void){ G_sprint(self, 2, "giveme <q|p|r|s> [seconds]\n" "giveme rune [1|2|3|4]\n" "giveme runes\n" "giveme norunes\n"); }` -> MATCH
- "grants Quad (q)" -> src/commands.c:8974-8979 `if (streq(arg_2, "q")){ self->super_time = 1; self->super_damage_finished = g_globalvars.time + seconds; self->s.v.items = (int)self->s.v.items | IT_QUAD; got = "quad"; }` -> MATCH
- "Pentagram/invulnerability (p)" -> src/commands.c:8980-8986 `else if (streq(arg_2, "p")){ self->invincible_time = 1; ... self->s.v.items = (int)self->s.v.items | IT_INVULNERABILITY; got = "pent"; }` -> MATCH
- "Ring/invisibility (r)" -> src/commands.c:8987-8993 `else if (streq(arg_2, "r")){ self->invisible_time = 1; ... self->s.v.items = (int)self->s.v.items | IT_INVISIBILITY; got = "ring"; }` -> MATCH
- "or Biosuit (s)" -> src/commands.c:8994-9000 `else if (streq(arg_2, "s")){ self->rad_time = 1; self->radsuit_finished = g_globalvars.time + seconds; self->s.v.items = (int)self->s.v.items | IT_SUIT; got = "suit"; }` -> MATCH
- "for the given duration (default 30 seconds if omitted or 0)" -> src/commands.c:8969-8973 `seconds = max(0, atof(arg_3)); if (!seconds){ seconds = 30; }` -> MATCH
- "'giveme rune [1|2|3|4]' grants the numbered runeflag" -> src/commands.c:9001-9007 `else if (streq(arg_2, "rune")){ int rune = bound(0, seconds - 1, 3); g_globalvars.serverflags = (int)g_globalvars.serverflags | (1 << rune); return; }` -> MATCH
- "'giveme runes' grants all four" -> src/commands.c:9008-9013 `else if (streq(arg_2, "runes")){ g_globalvars.serverflags = (int)g_globalvars.serverflags | 15; return; }` -> MATCH (15 = bits 0-3)
- "'giveme norunes' clears all four. With no argument it prints usage" -> src/commands.c:9014-9019 `else if (streq(arg_2, "norunes")){ g_globalvars.serverflags = (int)g_globalvars.serverflags & ~15; return; }` + src/commands.c:8959-8964 `if (trap_CmdArgc() == 1){ giveme_usage(); return; }` -> MATCH
WI-2: n/a (registered CF_PLAYER at commands.c:1036; player-class verified at DoCommand player branch; no default/access-class metadata claim beyond the enforced cheat gate)
## Wave 04 -- canary autotrack expect C-FIX, returned C-FIX (GATE 1 PASS); GATE 2 PASS (re-grep: canary autotrack defect commands.c:893 CF_SPECTATOR|CF_MATCHLESS not _ONLY + DoCommand 1078/1083; clean itempickupbonus ammo caps items.c:637/642/647/652 + ksound3 TeamSay arg commands.c:3380). All 5 batch rows TRACED-CLEAN. Canary row autotrack stripped (control).

RESULT | ktx:command:iplist | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Every clause (perm-gated full list players-then-spectators, format, fallback own-IP, private output, CF_BOTH access) maps to an enforcing line in iplist/iplist_one + DoCommand.
### ktx:command:iplist
- "Prints client IP addresses" -> commands.c:8069 `G_sprint(s, 2, "%15.15s %s %-18.18s\n", cl_ip(p), is_adm(p) ? "A" : " ", p->netname);` -> MATCH (cl_ip g_utils.c:2776)
- "If the caller passes the k_ip_list permission check" -> commands.c:8078 `if (!check_perm(self, cvar("k_ip_list")))` -> MATCH (check_perm 1513 generic perm gate keyed by k_ip_list value)
- "lists every connected player and then every spectator" -> commands.c:8085 `for (i = 0, p = world; (p = find_plr(p));)` then 8096 `for (i = 0, p = world; (p = find_spc(p));)` -> MATCH (players loop precedes spectators loop)
- "as \"<IP> <A-if-admin> <name>\"" -> commands.c:8069 `"%15.15s %s %-18.18s\n", cl_ip(p), is_adm(p) ? "A" : " ", p->netname` -> MATCH
- "under \"IPs list players:\" / \"IPs list spectators:\" headers" -> commands.c:8089 `G_sprint(self, 2, "\x9xIPs list\x9x %s\n", redtext("players:"));` + 8100 `... redtext("spectators:")` -> MATCH
- "otherwise the caller is shown only their own IP (\"Your IP is: <ip>\")" -> commands.c:8080 `G_sprint(self, 2, "%s %s\n", redtext("Your IP is:"), cl_ip(self)); return;` -> MATCH (fail-perm path returns own IP only)
- "Output is sent privately to the caller" -> commands.c:8080/8089/8092 `G_sprint(self, 2, ...)` -> MATCH (all output is G_sprint to self)
- "Available to both players and spectators (CF_BOTH)" -> commands.c:984 `{ "iplist", iplist, 0, CF_BOTH, CD_IPLIST }` -> MATCH (CF_BOTH=CF_PLAYER|CF_SPECTATOR g_local.h:649; DoCommand 1091/1106 both class checks pass)
WI-2: n/a (no default-value or access-class assertion beyond CF_BOTH, verified exact at table row 984 + dispatcher)

RESULT | ktx:command:itempickupbonus:frogbot:std | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | std-set subcommand; toggle/refusal-guards/default-off + every numeric threshold (300vs250, +100, not-blocked-at-250, ammo 255 vs 100/200/100/100) and the ToT-scope each map to an exact enforcing line.
### ktx:command:itempickupbonus:frogbot:std
- "Frogbot subcommand (\"fb itempickupbonus\")" -> bot_commands.c:2329 `{ "itempickupbonus", FrogbotsSetItemPickupBonus, "Toggle item pickup bonus" }` (entry in std_commands[] 2315-2330) -> MATCH
- "toggles the bot item-pickup bonus by flipping the corresponding frogbot cvar (default off)" -> bot_commands.c:2290 `cvar_fset(FB_CVAR_ITEM_PICKUP_BONUS, !cvar(FB_CVAR_ITEM_PICKUP_BONUS));` + world.c:1067 `RegisterCvarEx(FB_CVAR_ITEM_PICKUP_BONUS, "0");` -> MATCH (negate-toggle; registered default "0" = off)
- "Only available when bots are enabled and ToT mode is active, otherwise it is refused" -> bot_commands.c:2278 `if (!bots_enabled()) { G_sprint(self, 2, "Bots are disabled by the server.\n"); return; }` + 2284 `if (!tot_mode_enabled()) { ... "only available in ToT mode." ; return; }` -> MATCH
- "in ToT mode are made more generous" -> bot_commands.c:135 `return tot_mode_enabled() && (qbool)cvar(FB_CVAR_ITEM_PICKUP_BONUS);` -> MATCH (FrogbotItemPickupBonus() requires ToT mode AND cvar)
- "health pickups may stack to 300 (vs 250)" -> items.c:199 `if (FrogbotItemPickupBonus() && e->s.v.health > 300) { e->s.v.health = 300; } else if (e->s.v.health > 250) { e->s.v.health = 250; }` -> MATCH
- "Megahealth grants +100 and is not blocked at 250" -> items.c:308 `if (other->s.v.health >= 250 && !FrogbotItemPickupBonus()) { return; }` + items.c:313 `if (!T_Heal(other, FrogbotItemPickupBonus() ? 100 : self->healamount, 1))` -> MATCH
- "shell/nail/rocket/cell ammo caps rise to 255 (vs 100/200/100/100)" -> items.c:637 `other->s.v.ammo_shells = FrogbotItemPickupBonus() ? 255 : 100;` (nails 642 `? 255 : 200`, rockets 647 `? 255 : 100`, cells 652 `? 255 : 100`) -> MATCH
- "Prints \"item pickup bonus changed to on/off\"" -> bot_commands.c:2291 `G_sprint(self, 2, "item pickup bonus changed to %s\n", (int)cvar(FB_CVAR_ITEM_PICKUP_BONUS) ? redtext("on") : redtext("off"));` -> MATCH
WI-2: n/a (default-off verified exact against RegisterCvarEx(...,"0"); no access-class assertion)

RESULT | ktx:command:ksound3 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | TeamSay(3) -> ktsound3.wav; same-team players-only loop with KF_KTSOUNDS + non-empty name, per-recipient k_sdir prefix, team/CTF-only -- every clause maps to an enforcing line in TeamSay.
### ktx:command:ksound3
- "Sends team audio cue 3 (plays ktsound3.wav)" -> commands.c:3380 `char *sndname = va("ktsound%d.wav", (int)fsndname);` -> MATCH (table 772 `{ "ksound3", DEF(TeamSay), 3, CF_PLAYER, CD_KSOUND3 }` -> fsndname=3)
- "to your same-team players" -> commands.c:3387 `if (streq(getteam(self), getteam(p)))` -> MATCH
- "server stuffs a 'play' of ktsound3.wav into the console of every other client on your team" -> commands.c:3391 `stuffcmd(p, "play %s%s\n", (strnull(t1) ? "" : va("%s/", t1)), sndname);` (loop 3382 `find_plr(p)` players-only, guard 3384 `p != self`) -> MATCH
- "who has KT sounds enabled (the KF_KTSOUNDS bit in their kf userinfo key)" -> commands.c:3385 `(iKey(p, "kf") & KF_KTSOUNDS)` -> MATCH (KF_KTSOUNDS=(1) g_consts.h:245)
- "and a non-empty name" -> commands.c:3384 `!strnull(p->netname)` -> MATCH
- "each recipient's file path honours their own k_sdir sound-directory setting" -> commands.c:3389 `char *t1 = ezinfokey(p, "k_sdir");` + 3391 `(strnull(t1) ? "" : va("%s/", t1))` -> MATCH (per-recipient p's own k_sdir prepended)
- "Only active in team or CTF games" -> commands.c:3384 `(isTeam() || isCTF())` -> MATCH (isTeam g_utils.c:1583 k_mode==gtTeam; isCTF 1599 k_ctf)
WI-2: n/a

RESULT | ktx:command:ksound4 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | TeamSay(4) -> ktsound4.wav; identical enforcement to ksound3 (same TeamSay body, arg 4); every clause maps to an enforcing line.
### ktx:command:ksound4
- "Sends team audio cue 4 (plays ktsound4.wav)" -> commands.c:3380 `char *sndname = va("ktsound%d.wav", (int)fsndname);` -> MATCH (table 773 `{ "ksound4", DEF(TeamSay), 4, CF_PLAYER, CD_KSOUND4 }` -> fsndname=4)
- "to your same-team players" -> commands.c:3387 `if (streq(getteam(self), getteam(p)))` -> MATCH
- "server stuffs a 'play' of ktsound4.wav into the console of every other client on your team" -> commands.c:3391 `stuffcmd(p, "play %s%s\n", (strnull(t1) ? "" : va("%s/", t1)), sndname);` (loop 3382 `find_plr(p)` players-only, guard 3384 `p != self`) -> MATCH
- "who has KT sounds enabled (the KF_KTSOUNDS bit in their kf userinfo key)" -> commands.c:3385 `(iKey(p, "kf") & KF_KTSOUNDS)` -> MATCH
- "and a non-empty name" -> commands.c:3384 `!strnull(p->netname)` -> MATCH
- "each recipient's file path honours their own k_sdir sound-directory setting" -> commands.c:3389 `char *t1 = ezinfokey(p, "k_sdir");` + 3391 `(strnull(t1) ? "" : va("%s/", t1))` -> MATCH
- "Only active in team or CTF games" -> commands.c:3384 `(isTeam() || isCTF())` -> MATCH (isTeam g_utils.c:1583; isCTF 1599)
WI-2: n/a

RESULT | ktx:command:kuinfo | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | cmduinfo: argc==2 lists non-empty keys, argc==3 single key, '*'-keys suppressed via isSysKey, argc==1/>3 prints usage -- every clause maps to an enforcing line; two still-true traceable nuances surfaced.
### ktx:command:kuinfo
- "Prints another client's userinfo to the requesting client" -> g_userinfo.c:165 `G_sprint(self, 2, "%s's personal keys:\n", p->netname);` (target p via SpecPlayer_by_IDorName 158/191 -> g_utils.c:1485 player_by_IDorName) -> MATCH (output G_sprint to self)
- "Usage: kuinfo <id/name> [key]" -> g_userinfo.c:141 `G_sprint(self, 2, "usage: kuinfo <id/name> [key]\n");` -> MATCH (printed when isSupport_Params(self); alternate no-alias path 145 prints "cmd uinfo ..." same args -- traceable, kuinfo is the documented alias)
- "Given only an id or name it lists all of that client's non-empty userinfo keys and their values" -> g_userinfo.c:176 `if (!strnull(v)) { G_sprint(self, 2, "key %s = \"%s\"\n", cinfos[i].key, v); }` (argc==2 branch 151-183) -> MATCH
- "given an additional key it prints just that single key's value" -> g_userinfo.c:213 `G_sprint(self, 2, "%s's %s = \"%s\"\n", p->netname, arg_2, v);` (argc==3 branch 185-217) -> MATCH
- "Keys whose name begins with '*' (system keys) are never shown" -> g_userinfo.c:169 `if (isSysKey(cinfos[i].key)) { continue; }` + 198 `if (isSysKey(arg_2)) { v = NULL; }` -> MATCH (isSysKey 33 `*(key) == '*'`; argc==3 sets v=NULL then prints "is hidden" 209 -- value never shown)
- "With a missing or too-many argument count it prints a usage line instead" -> g_userinfo.c:136 `if ((argc == 1) || (argc > 3)) { ... usage ... return; }` -> MATCH
WI-2: n/a (no default-value claim; no admin/player/spectator access-class assertion in description -- table row 941 CF_BOTH|CF_MATCHLESS|CF_PARAMS but description makes no class claim)

<!-- ROUND C note: Wave 05 REJECTED (GATE 1: canary k_teamoverlay false-negatived TRACED-CLEAN, expected C-NEAR-MISS -- "not in duel" rationalized as enforced-by-mode-exclusivity) -> re-dispatched 05b with an anti-rationalization-scope block. Wave 05b REJECTED (GATE 1 PASS, but GATE 2: laststats over-accepted TRACED-CLEAN -- subagent dropped the parenthetical "(same tables shown automatically when a game ends)" equivalence clause; orchestrator re-grep showed the auto path = MatchEndStats() [stats.c:1678 / match.c:370] is a DIFFERENT fn from the /laststats "overhauled" MatchEndStatsTables() [commands.c:3554, sole caller], no enforcing equivalence -> the dropped clause is flavour-C) -> re-dispatched 05c with a clause-completeness block. -->

## Wave 05c (Round C wave 05 second re-dispatch, scope + clause-completeness sharpened) -- canary k_teamoverlay expect C-NEAR-MISS, returned C-NEAR-MISS (GATE 1 PASS -- the scope sharpening held); GATE 2 PASS (re-grep: flagged laststats wrong-clause confirmed -- auto path MatchEndStats() stats.c:1678/match.c:370 vs /laststats MatchEndStatsTables() commands.c:3554 [statsTables.c "overhauled", sole caller], no enforcing equivalence; clean nospecs ALLOWED_NOSPECS_VIPS exception loop vote.c + pos_show Pos_Disallowed-absent commands.c:6406/6449/6514). Canary row k_teamoverlay stripped (control).

RESULT | ktx:command:laststats | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=7 | Behavior/refusal/empty/mode-branches all trace; the parenthetical "(the same tables shown automatically when a game ends)" is parallel-function inference -- command calls the separately-authored "overhauled" MatchEndStatsTables(), NOT the automatic-path MatchEndStats(); no enforcing line establishes equivalence.
### ktx:command:laststats
- "Re-displays the full end-of-game statistics tables ... to the requesting client" -> src/commands.c:3554 `MatchEndStatsTables();` (output via G_sprint(self,...) in statsTables.c) -> MATCH
- "(the same tables shown automatically when a game ends)" -> src/stats.c:1678 `void MatchEndStats(void)` (automatic path, called src/match.c:370) vs src/statsTables.c:52 `void MatchEndStatsTables(void)` (command path, sole caller src/commands.c:3554; file header statsTables.c:2 "the overhauled Endgame Statistics") -> MISMATCH(equivalence is parallel-name inference: two different, separately-authored functions; no enforcing line equates the two outputs)
- "per-player kill, item, weapon-efficiency, weapon-damage, weapons-taken/dropped, weapon-kill, damage and item/weapon-time tables" -> src/statsTables.c:85-95 `playersKillStats(); playersItemStats(); playersWeaponEffiStats(); playersWeaponDmgStats(); playersWeaponTakenStats(); playersWeaponDroppedStats(); playersWeaponKillStats(); playersEnemyWeaponKillStats(); playersDamageStats(); playersItemTimeStats(); playersWeaponTimeStats();` -> MATCH
- "plus CTF and team-summary tables in those modes" -> src/statsTables.c:97-106 `if (isCTF()) { playersCTFStats(); } if (isTeam() || isCTF()) { collectTpStats(); summaryTPStats(); }` -> MATCH
- "and a top-frags/deaths table outside duel" -> src/statsTables.c:108 `if (!isDuel()) // top stats only in non duel modes` then `topStats();` -> MATCH
- "in midair, instagib or LGC modes it shows that mode's specific stat tables instead" -> src/statsTables.c:68-82 `if (cvar("k_midair")) { playerMidairStats(); ... } else if (cvar("k_instagib")) { playerInstagibStats(); ... } else if (lgc_enabled()) { playerLGCStats(); }` -> MATCH
- "refused while a game is in progress (\"Game in progress\")" -> src/commands.c:3547 `if (match_in_progress) { G_sprint(self, 2, "Game in progress\n"); return; }` -> MATCH
- "reports \"Laststats data empty\" when no completed-match data is stored" -> src/statsTables.c:61 `if (!lastStatsData) { G_sprint(self, 2, "Laststats data empty\n"); return; }` (lastStatsData set true only at end of MatchEndStats, src/stats.c:1730) -> MATCH
WI-2: n/a (command-table flags src/commands.c:898 `CF_BOTH | CF_MATCHLESS`; refusal independently enforced by function-body match_in_progress guard; no default/access-class claim)

RESULT | ktx:command:maps | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Every clause maps to ShowMaps (src/maps.c:519-550): in-memory mapslist print, caller-only, vote instructions, substring filter, shown/total count, read-only.
### ktx:command:maps
- "Prints the list of custom maps available on the server (the in-memory mapslist)" -> src/maps.c:530-544 `for (cnt = i = 0; i < maps_cnt; i++) { ... G_sprint(self, 2, ((cnt & 1) ? "%s\n" : "%-17s "), mapslist[i]); }` (mapslist[] declared src/maps.c:51) -> MATCH
- "to the caller" -> src/maps.c:542 `G_sprint(self, 2, ...)` (sends to self) -> MATCH
- "along with instructions to vote for a map by typing its name or using 'votemap <map>'" -> src/maps.c:526-528 `G_sprint(self, 2, "Vote for maps by typing the mapname,\nfor example \"%s\" or use \"%s\".\n", redtext("dm6"), redtext("votemap dm6"))` -> MATCH
- "An optional argument filters the list to map names containing that substring" -> src/maps.c:524 `trap_CmdArgv(1, arg_1, ...)` + src/maps.c:532 `if (arg_1[0] && !strstr(mapslist[i], arg_1)) { continue; }` -> MATCH (substring via strstr)
- "The output ends with a '(shown/total maps)' count" -> src/maps.c:548 `G_sprint(self, 2, "%s---End of list (%d/%d maps)\n", ..., cnt, maps_cnt)` (cnt=shown, maps_cnt=total) -> MATCH
- "Read-only; it lists and explains voting, it does not change the map" -> src/maps.c:519-550 (function body is only G_sprint calls; no map-change call) -> MATCH
WI-2: n/a (registered src/commands.c:749 `CF_BOTH | CF_MATCHLESS | CF_PARAMS`; no default/access-class claim)

RESULT | ktx:command:n | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | DontKick declines (no DoKick) + advances (NextClient) + kick-mode guard; counterpart YesKick calls DoKick; admin access-class correct under CF_BOTH_ADMIN + Init_cmds promotion.
### ktx:command:n
- "Admin response in the interactive kick walkthrough" -> src/commands.c:797 `{ "n", DontKick, 0, CF_BOTH_ADMIN, CD_N }` (CF_BOTH_ADMIN = CF_PLR_ADMIN|CF_SPC_ADMIN g_local.h:652; DoCommand admin-gate 1096/1111) + src/admin.c:288 `if (!self->k_kicking) { return; }` -> MATCH
- "declines kicking the client currently being prompted ('Kick player/spectator <name>?')" -> prompt src/admin.c:259-261 `G_sprint(self, 2, "Kick %s %s?\n", redtext(... ? "player" : "spectator"), getname(...))`; src/admin.c:286-294 DontKick body has NO DoKick call (contrast YesKick src/admin.c:278 `DoKick(...)`) -> MATCH
- "and advances the prompt to the next client without kicking" -> src/admin.c:293 `NextClient();` (NextClient src/admin.c:242 `self->k_playertokick = find_plrspc(...)` + reprints prompt 259-261); no DoKick -> MATCH
- "Does nothing if the admin is not currently in kick mode" -> src/admin.c:288 `if (!self->k_kicking) { return; }` -> MATCH
- "Counterpart to 'y' (confirm the kick)" -> src/commands.c:796 `{ "y", YesKick, ... }`; src/admin.c:278 `if (DoKick(self->k_playertokick, self) && ...)` then 283 `NextClient();` -> MATCH (y kicks then advances; n only advances)
WI-2: n/a -- CF_BOTH_ADMIN at src/commands.c:797; Init_cmds (1443-1451) promotes CF_PLR_ADMIN->+CF_PLAYER & CF_SPC_ADMIN->+CF_SPECTATOR; "Admin response" CORRECT, not a defect.

RESULT | ktx:command:nospecs | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | nospecs vote-toggle/admin-set/announce/spec-disconnect-with-3-exceptions/2-player-gate/match-in-progress-state-only all map to located enforcing lines in vote.c.
### ktx:command:nospecs
- "Casts (or withdraws) the caller's vote for No-spectators mode" -> src/vote.c:1022 `self->v.nospecs = !self->v.nospecs;` + src/vote.c:1028-1030 prints "votes for nospecs"/"withdraws ... nospecs vote" -> MATCH
- "an admin can set it directly" -> src/vote.c:947 `veto = is_admins_vote(OV_NOSPECS);` + src/vote.c:949 `if (veto || !get_votes_req(OV_NOSPECS, true))` (admin veto triggers toggle immediately) -> MATCH
- "When the vote passes or is set by admin, the No-spectators mode is toggled server-wide and announced" -> src/vote.c:954 `cvar_fset("_k_nospecs", !cvar("_k_nospecs"));` + src/vote.c:956-969 `G_bprint(2, ... "No spectators mode %s by admin veto"/"by majority vote" ...)` -> MATCH
- "while it is on every spectator is disconnected except allowed VIPs, real admins, and coaches" -> src/vote.c:972 `if (cvar("_k_nospecs"))` loop 976-994 `if (VIP(spec) & ALLOWED_NOSPECS_VIPS) continue;` (g_local.h:755 = VIP_NOTKICKABLE|VIP_ADMIN|VIP_RCON) / `if (is_real_adm(spec)) continue;` / `if (is_coach(spec)) continue;` else `stuffcmd(spec, "disconnect\n");` -> MATCH
- "Non-admins need at least 2 players present to start the vote" -> src/vote.c:1011 `if (!is_adm(self))` then 1014 `if ((CountPlayers() < 2) && !cvar("_k_nospecs")) { G_sprint(self, 2, "You need at least 2 players to do this.\n"); return; }` -> MATCH
- "While a match is in progress the command only prints the current No-spectators on/off state" -> src/vote.c:1003 `if (match_in_progress) { G_sprint(self, 2, "%s mode %s\n", redtext("No spectators"), OnOff(cvar("_k_nospecs"))); return; }` -> MATCH
WI-2: n/a -- src/commands.c:1032 `CF_PLAYER | CF_SPC_ADMIN`; Init_cmds promotes +CF_SPECTATOR so spectator-admin may set, players may vote; consistent, no default claim.

RESULT | ktx:command:pos_show | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Pos_Show prints 1-of-5 slots (MAX_POSITIONS=5) + own state, no-arg=slot1, arg clamped via bound(0,n-1,4), and uniquely lacks the Pos_Disallowed guard that gates pos_save/pos_move.
### ktx:command:pos_show
- "Prints, to the calling player's console, the contents of one of 5 saved position slots" -> src/commands.c:6427 `pos = &(self->pos[idx = Pos_Get_idx()]);` + G_sprint(self,...) (include/progs.h:1019 `pos_t pos[MAX_POSITIONS]`, :301 `#define MAX_POSITIONS (5)`) -> MATCH (CF_BOTH src/commands.c:903, caller may be spec too; "player" = traceable minor vagueness, sends to self regardless)
- "its stored velocity, origin, and view angle" -> src/commands.c:6430-6432 `G_sprint(self, 2, "velocity: ...", PASSVEC3(pos->velocity)); ... PASSVEC3(pos->origin)); ... PASSVEC3(pos->v_angle));` -> MATCH
- "followed by the player's own current velocity, origin, and view angle, so the two can be compared" -> src/commands.c:6434-6437 `G_sprint(self, 2, "    Self:\n"); ... PASSVEC3(self->s.v.velocity)); ... PASSVEC3(self->s.v.origin)); ... PASSVEC3(self->s.v.v_angle));` -> MATCH
- "With no argument it shows slot 1" -> src/commands.c:6412-6419 `if (trap_CmdArgc() == 2) { ... } return 0;` + 6429 `G_sprint(self, 2, "Position: %d\n", idx + 1)` (idx 0 -> "Position: 1") -> MATCH
- "an optional numeric argument (clamped to 1-5) selects the slot" -> src/commands.c:6416 `return bound(0, atoi(arg_2) - 1, MAX_POSITIONS - 1);` (0..4 -> displayed 1..5) -> MATCH
- "Unlike pos_save and pos_move it is not blocked during a match, intermission, pause, or race" -> src/commands.c:6422-6438 Pos_Show has NO Pos_Disallowed() call; 6449 `if (Pos_Disallowed()) return;` in Pos_Save and 6514 in Pos_Move; macro 6406 `Pos_Disallowed() (match_in_progress || intermission_running || cvar("sv_paused") || (isRACE() && race.status))` -> MATCH
WI-2: n/a (registered src/commands.c:903 `CF_BOTH | CF_PARAMS`; no default/access-class claim)
## Wave 06 -- canary k_yawnmode expect TRACED-CLEAN, returned TRACED-CLEAN (GATE 1 PASS -- over-flag control held); GATE 2 PASS (re-grep: clean race_set_weapon_mode flags commands.c:1019 CF_PLAYER|CF_SPC_ADMIN + Init_cmds:1448 + race.weapon++ wrap race.c:3248/3252 + roundsup bound(2,...,20) hoonymode.c:1125; canary k_yawnmode axe 50/20 weapons.c:128). All 5 batch rows TRACED-CLEAN. Canary row k_yawnmode stripped (control).

RESULT | ktx:command:qpoint | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Bit 128 XOR on serverinfo fpd, localcmd serverinfo rebroadcast, Enabled()-string broadcast to all (G_bprint lvl2), match_in_progress early-return all traced; "QiZmo pointing" is the code's own redtext label so the QiZmo-proxy framing is source-grounded.
### ktx:command:qpoint
- "flipping bit 128 (value 128) of the server's fpd serverinfo key" -> src/commands.c:3726 `fpd ^= 128;` with src/commands.c:3721 `int fpd = iKey(world, "fpd");` (iKey->trap_infokey on world = serverinfo) -> MATCH
- "and re-broadcasting it" -> src/commands.c:3728 `localcmd("serverinfo fpd %d\n", fpd);` -> MATCH
- "When the bit is set, clients are restricted from using the QiZmo proxy's pointing/point feature" -> src/commands.c:3730 `G_bprint(2, "%s %s\n", redtext("QiZmo pointing"), Enabled(fpd & 128));` + #define CD_QPOINT "point function" (FPD set-bit = restriction active; code's own label "QiZmo pointing") -> MATCH
- "the new enabled/disabled state is announced to all players" -> src/commands.c:3730 `G_bprint(2, ...)` -> src/g_utils.c:786 `trap_BPrint(level, text, 0)` (level 2 broadcast) + src/g_utils.c:1837 `Enabled(float f){return (f ? "enabled" : "disabled");}` -> MATCH
- "Has no effect while a match is in progress" -> src/commands.c:3723 `if (match_in_progress) { return; }` (early-return before the XOR) -> MATCH
- (access: command-table CF_PLAYER|CF_SPC_ADMIN, Init_cmds adds CF_SPECTATOR) -> src/commands.c:786 + src/commands.c:1448 `cmds[i].cf_flags |= CF_SPECTATOR;` -> MATCH (description makes no access-class claim, noted for completeness)
WI-2: n/a -- no default or access-class assertion in the description.

RESULT | ktx:command:ra_pos | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Every message string, the private G_sprint(self) delivery, the isRA/isWinner/isLoser early-return, and the queue-position branch logic traced exactly; "out of line" maps to the pos<0 branch verbatim.
### ktx:command:ra_pos
- "Rocket Arena only" -> src/arena.c:775 `if (!isRA() || ...) return;` with src/arena.c:130 `isRA(){return (isDuel() && cvar("k_rocketarena"));}` -> MATCH
- "Privately prints ... to your own console" -> src/arena.c:782 `G_sprint(self, PRINT_HIGH, ...)` -> src/g_utils.c:753 `trap_SPrint(NUM_FOR_EDICT(ed), ...)` (self only) -> MATCH
- "'You are next'" -> src/arena.c:790 `if (!pos) { G_sprint(self, PRINT_HIGH, "You are next\n"); ... }` (pos==0) -> MATCH
- "'There is 1 person ahead of you'" -> src/arena.c:797 `if (pos == 1) { G_sprint(self, PRINT_HIGH, "There is 1 person ahead of you\n"); ...}` -> MATCH
- "'There are N people ahead of you'" -> src/arena.c:803 `if (pos > 1) { G_sprint(self, PRINT_HIGH, "There are %d people ahead of you\n", pos); ...}` -> MATCH
- "'You are out of line' if you are not queued ... no effect for the current arena winner/loser or outside Rocket Arena" -> src/arena.c:780 `if ((pos = ra_pos_que(self)) < 0) { G_sprint(self, PRINT_HIGH, "You are out of line\n" ...); }` (ra_pos_que returns -1 when not in ra_que) + src/arena.c:775 `if (!isRA() || isWinner(self) || isLoser(self)) return;` -> MATCH
WI-2: n/a -- command-table flag CF_PLAYER (player-only, no admin); description makes no access-class or default claim.

RESULT | ktx:command:race_set_weapon_mode | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Cycle++/wrap, all three mode names from race_weapon_mode(), race_is_started guard, broadcast, read_topscores reload, race_route_now_custom flagging, and the player/spectator-admin access (CF_PLAYER|CF_SPC_ADMIN + Init_cmds CF_SPECTATOR promotion) all traced -- the "(player / spectator-admin)" parenthetical is CORRECT post-promotion, not a WI-2 defect.
### ktx:command:race_set_weapon_mode
- "Race-mode setup command (player / spectator-admin)" -> src/commands.c:1019 `{ "race_set_weapon_mode", r_mode, 0, CF_PLAYER | CF_SPC_ADMIN, ... }` + src/commands.c:1448 `if (cf_flags & CF_SPC_ADMIN) cmds[i].cf_flags |= CF_SPECTATOR;` + DoCommand src/commands.c:1096 `if ((cf_flags & CF_SPC_ADMIN) && !is_adm(self)) ... DO_ACCESS_DENIED` -> MATCH (player passes plain; spectator passes CF_SPECTATOR gate then requires admin)
- "Each invocation cycles the race weapon mode one step forward and wraps around" -> src/race.c:3248 `race.weapon++;` + src/race.c:3250 `if ((race.weapon < raceWeaponNo) || (race.weapon >= raceWeaponMAX)) race.weapon = raceWeaponNo;` -> MATCH
- "'disallowed' (no weapons) ... 'allowed' ... 'allowed after 2s'" -> src/race.c:766 `race_weapon_mode`: case raceWeaponNo->"disallowed", raceWeaponAllowed->"allowed", raceWeapon2s->"allowed after 2s" -> MATCH
- "Has no effect while a race is running" -> src/race.c:3243 `if (race_is_started()) { return; }` -> src/race.c:2966 `if (race.status) { ... return true; }` -> MATCH
- "On change it broadcasts the new weapon mode" -> src/race.c:3255 `G_bprint(2, "%s set race weapon mode to %s\n", self->netname, redtext(race_weapon_mode(race.weapon)));` -> MATCH
- "reloads the stored top scores (tracked per weapon mode)" -> src/race.c:3258 `read_topscores();` (src/race.c:3560 reads race_filename("top")) -> MATCH
- "flags the route as a custom (non-preset) route" -> src/race.c:3260 `race_route_now_custom();` -> src/race.c:2781 `race.active_route = 0; // mark this is a custom route now` -> MATCH
WI-2: n/a -- access-class claim "(player / spectator-admin)" CORRECT after the Init_cmds CF_SPC_ADMIN->CF_SPECTATOR promotion (commands.c:1448); not a defect.

RESULT | ktx:command:roundsup | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | +2 step and max-20 clamp confirmed at HM_rounds_adjust bound(2,...,20) with change*2; isHoonyModeAny gate + !match_in_progress guard + HoonyMode-only message all traced; broadcast on change confirmed.
### ktx:command:roundsup
- "Increases the HoonyMode round limit (cvar k_hoonyrounds) by 2 rounds" -> src/hoonymode.c:1234 `HM_rounds_adjust(1);` -> src/hoonymode.c:1125 `int new_rounds = bound(2, HM_rounds() + change * 2, 20);` (change=1 -> +2) + src/hoonymode.c:1127 `cvar_fset("k_hoonyrounds", new_rounds);` -> MATCH
- "clamped to a maximum of 20" -> src/hoonymode.c:1125 `bound(2, HM_rounds() + change * 2, 20)` (upper bound 20) -> MATCH
- "and broadcasts the new round limit" -> src/hoonymode.c:1135 `G_bprint(2, "%s %s\n", redtext("Roundlimit set to"), dig3(new_rounds));` (on change; 1131 G_sprint "still" when unchanged) -> MATCH
- "Only works in a HoonyMode game and only when no match is in progress; in any other mode it tells the caller the command is HoonyMode-only" -> src/hoonymode.c:1229 `if (!isHoonyModeAny()) { G_sprint(self, PRINT_HIGH, "Command only available in hoonymode\n"); } else if (!match_in_progress) { HM_rounds_adjust(1); }` -> MATCH
WI-2: n/a -- command-table flag CF_PLAYER (player-only, no admin); no access-class or default claim.

RESULT | ktx:command:setpathflag:frogbot:editor | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | Bitwise-OR onto saved_marker->nearest path, the exact w/6/r/j/v/a decode map, OR-preserve + new-flagset print, all four error branches, the LocateMarker(self origin)=nearest-to-editing-player, and the editor-mode-only dispatch all traced to enforcing lines.
### ktx:command:setpathflag:frogbot:editor
- "Frogbot waypoint-editor subcommand ... Used while editing a map's bot navigation" -> src/bot_commands.c:2386 `commands = FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands;` + src/bot_commands.c:2343 `{ "setpathflag", FrogbotSetPathFlag, ... }` in `editor_commands[]` only -> MATCH
- "Adds (bitwise-ORs) one or more traversal flags onto the path running from the previously saved marker to the routing marker nearest the editing player" -> src/bot_commands.c:1635 `saved_marker->fb.paths[source_to_target_path].flags |= flags;` with src/bot_commands.c:1614 `gedict_t *nearest = LocateMarker(self->s.v.origin); int source_to_target_path = FindPathIndex(saved_marker, nearest);` -> MATCH
- "decoded as: w = waterjump, 6 = dm6 door, r = rocket jump, j = jump ledge, v = vertical platform, a = curl-jump angle hint (any other letter is ignored)" -> src/marker_load.c:174 `DecodeMarkerPathFlagString`: 'w'->WATERJUMP_, '6'->DM6_DOOR, 'r'->ROCKET_JUMP, 'j'->JUMP_LEDGE, 'v'->VERTICAL_PLATFORM, 'a'->BOTPATH_CURLJUMP_HINT, no default case -> MATCH
- "The single argument" -> src/bot_commands.c:1631 `trap_CmdArgv(2, param, sizeof(param));` -> MATCH
- "Existing path flags are preserved" -> src/bot_commands.c:1635 `flags |= flags` (OR, not assignment) -> MATCH
- "on success it prints the path's new combined flag set" -> src/bot_commands.c:1636 `G_sprint(self, PRINT_HIGH, "Path flags set, now: %s\n", EncodeMarkerPathFlags(saved_marker->fb.paths[source_to_target_path].flags));` -> MATCH
- "Errors if no marker is nearby" -> src/bot_commands.c:1618 `if (nearest == NULL) { G_sprint(self, PRINT_HIGH, "No marker nearby\n"); return; }` -> MATCH
- "if no path links the saved marker to it ... if no flag argument is given" -> src/bot_commands.c:1625 `if (trap_CmdArgc() < 3) { ... "Provide path flags: " ... return; }` + src/bot_commands.c:1650 `else { G_sprint(self, PRINT_HIGH, "No path linked to add flag\n"); }` -> MATCH
- "or if the argument decodes to no valid flags" -> src/bot_commands.c:1640 `else { G_sprint(self, PRINT_HIGH, "Path flags invalid, options are %s\n", FROGBOT_PATH_FLAG_OPTIONS); }` -> MATCH
WI-2: n/a -- frogbot subcommand (not in cmds[] table); access governed by FB_CVAR_ADMIN_ONLY at FrogbotsCommand, no default/access-class claim in description.

## Wave 07 -- canary autotrack expect C-FIX, returned C-FIX (GATE 1 PASS); GATE 2 PASS (re-grep: flagged shownick wrong-clauses confirmed -- teammate filter gated on !match_in_progress commands.c:3868-3871 [prewar-vs-in-match, NOT CTF-eligibility]; version-0 -> G_centerprint commands.c:4144/g_utils.c:815 [centerprint, not console]; clean victim SendMessage(self->victim) commands.c:1799 + client.c:5428 attacker->victim=victimname). Canary row autotrack stripped (control).

RESULT | ktx:command:shownick | C-FIX | flavourC=1 | wi2=0 | clauses=9 | Cone/LOS/ray-cast/version-1 //sn/report-fields all trace clean; TWO wrong clauses: "outside CTF only teammates eligible" has no enforcing line (real distinction is prewar=any vs in-match=same-team, identical in Team AND CTF), and "argument 0 -> console text" is WRONG (version 0 uses G_centerprint -> trap_CenterPrint, an on-screen centerprint, not console text).
### ktx:command:shownick
- "Reports info about the player the issuer is currently aiming at" -> src/commands.c:3809-4147 (ShowNick selects best aimed player `bp`, reports its stats) -> MATCH
- "It ray-casts along the caller's view direction" -> src/commands.c:3830-3833 `ang[0]=self->s.v.v_angle[0]; ang[1]=self->s.v.v_angle[1]; ang[2]=0; trap_makevectors(ang);` -> MATCH
- "picks the best on-screen player within roughly a 60-degree cone" -> src/commands.c:3897 `if (miss > (dist * 1.7)) { continue; // over 60 degrees off }` -> MATCH (explicit comment)
- "and in line of sight" -> src/commands.c:3927-3978 (multiple `traceline(...); if (g_globalvars.trace_fraction == 1) goto ok;` else `continue; // not visible`) -> MATCH
- "outside CTF only teammates are eligible (in prewar any player is eligible)" -> src/commands.c:3868-3873 `if (!match_in_progress) { ; // allow shownick in prewar anyway } else if (strneq(s1, s2)) { continue; // ignore non teammaters }` -> MISMATCH(teammate filter gated solely on !match_in_progress [prewar=any; in-match=same `team`], applied IDENTICALLY in Team and CTF; the only isCTF use is the early gate 3823 `else if (!isTeam() && !isCTF()) return;`. There is NO "outside CTF vs inside CTF" eligibility distinction in code -- the real distinction is prewar-vs-in-match)
- "it reports nick, map position, health, armor, ammo (shells/nails/rockets/cells) and active powerups (Pent/Quad/Suit)" -> src/commands.c:4026-4090 (kn nick, origin xyz, health, armorvalue, ammo_shells/nails/rockets/cells, pups Pent/Quad/Suit) -> MATCH
- "With no argument (or argument 0) the report is printed as console text to the caller" -> src/commands.c:4144 `G_centerprint(self, "%s", buf);` (g_utils.c:815 `G_centerprint` -> `trap_CenterPrint`) -> MISMATCH(version 0 falls through to G_centerprint, an on-screen CENTERPRINT, NOT console text; console text would be G_sprint/trap_SPrint g_utils.c:753)
- "with argument 1 it is sent as a machine-readable \"//sn\" message for the client HUD to render" -> src/commands.c:4021 `stuffcmd(self, "//sn %d %d %d %d %d %d %d %d \"%s\" %d %d %d %d\n", version, i, ...)` under `case 1:` (version=bound(0,version,1) at 3993) -> MATCH
- "Does nothing if no eligible player is being aimed at" -> src/commands.c:3986 `if ((best < 0) || !bp) { return; }` -> MATCH
WI-2: n/a (no default-value or access-class claim; the prewar/CTF discussion is behavioral scope, classified above as MISMATCH, not a WI-2 metadata defect)

RESULT | ktx:command:timedown | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Every clause maps to an enforcing line: -=5 default, 5->3->1 ramp, hoonymode -=2, bound(0,timelimit,k_timetop) clamp, both-zero refusal restores old value, G_bprint announce-to-all, explicit match_in_progress guard.
### ktx:command:timedown
- "Decreases the match time limit (the timelimit cvar, in minutes)" -> src/commands.c:2971 `cvar_set("timelimit", va("%d", (int)timelimit));` -> MATCH
- "It normally subtracts 5 minutes" -> src/commands.c:2953 `else { timelimit -= t; }` with table arg `5.0f` (commands.c:733) -> MATCH
- "as a special low-value ramp it instead steps 5 -> 3 -> 1 when the current limit is 5 or 3" -> src/commands.c:2945-2950 `if ((t == 5) && (timelimit == 5)) { timelimit = 3; } else if ((t == 5) && (timelimit == 3)) { timelimit = 1; }` -> MATCH
- "and in any hoonymode it subtracts 2 instead of 5" -> src/commands.c:2940 `if ((t == 5) && isHoonyModeAny()) { t = 2; }` -> MATCH
- "The result is clamped to the range 0 to the k_timetop cvar" -> src/commands.c:2956 `timelimit = bound(0, timelimit, cvar("k_timetop"));` -> MATCH
- "If lowering it would leave both timelimit and fraglimit at 0 the change is refused" -> src/commands.c:2958-2962 `if ((timelimit <= 0) && (fraglimit <= 0)) { G_sprint(self, 2, "You need some timelimit or fraglimit at least\n"); timelimit = tl; }` -> MATCH (restores saved tl)
- "and announces the new length to all players" -> src/commands.c:2972 `G_bprint(2, "%s %s %s%s\n", redtext("Match length set to"), dig3(timelimit), ...)` -> MATCH
- "The command is ignored while a match is in progress" -> src/commands.c:2934 `if (match_in_progress) { return; }` -> MATCH
WI-2: n/a (command, not a cvar; table flags CF_PLAYER|CF_SPC_ADMIN, post-Init_cmds also CF_SPECTATOR, but no metadata clause asserts this)

RESULT | ktx:command:trx_play | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | All four behavioral clauses map to enforcing lines: stop-record+stop-playback first, mv_can_playback gate, spawn player.mdl pb_ent on success, exact "can't playback now" string + return on failure.
### ktx:command:trx_play
- "Plays back a previously recorded 'trick' movement capture" -> src/commands.c:8245-8250 `self->pb_ent = spawn(); self->pb_ent->classname = "pb_ent"; setmodel(self->pb_ent, "progs/player.mdl"); ... self->is_playback = true;` -> MATCH
- "It first stops any in-progress trick recording or playback" -> src/commands.c:8231-8232 `mv_stop_record(); // stop record first` `mv_stop_playback(); // stop playback first` -> MATCH
- "then, if playback is currently allowed, spawns a player-model entity that replays the recorded movement" -> src/commands.c:8235-8250 `if (!mv_can_playback()) { ...; return; } ... self->pb_ent = spawn(); ... setmodel(self->pb_ent, "progs/player.mdl"); self->is_playback = true;` -> MATCH
- "if playback is not currently possible it prints 'can't playback now' and does nothing" -> src/commands.c:8237-8240 `if (!mv_can_playback()) { G_sprint(self, 2, "can't playback now\n"); return; }` -> MATCH
WI-2: n/a (no default-value or access-class claim in description; table flag CF_PLAYER only)

RESULT | ktx:command:victim | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | self->victim set at client.c:5428 (post-logfrag) to fragged player's netname; say-stuff with premsg prefix/postmsg suffix; no-match prints diagnostic (no say sent) = still-true minor vagueness; CF_PLAYER correct; "usable outside a match" is correct permissive reading of CF_MATCHLESS; no args.
### ktx:command:victim
- "Sends a quick chat message addressed to the player the caller most recently fragged (the caller's last victim's name)" -> src/commands.c:1799 `SendMessage(self->victim);` + src/client.c:5428 `attacker->victim = victimname;` (immediately after logfrag(attacker,targ); victimname = targ->netname, sole writer) -> MATCH
- "The engine stuffs a say command containing that name" -> src/commands.c:1819-1825 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "say "); ... stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "%s", name);` -> MATCH
- "optionally wrapped with the caller's \"premsg\" and \"postmsg\" userinfo strings as prefix/suffix" -> src/commands.c:1820-1830 `if ((s = ezinfokey(self, "premsg"))) { stuffcmd_flags(..., " %s ", s); }` (before name) `if ((s = ezinfokey(self, "postmsg"))) { stuffcmd_flags(..., " %s", s); }` (after name) -> MATCH
- "Does nothing if no matching connected client is found" -> src/commands.c:1837 `G_sprint(self, 2, "No name to display\n");` (no `streq(p->netname, name)` -> no say sent) -> MATCH (minor still-true vagueness: prints a diagnostic, sends no say message; traceable)
- "Player-only command" -> src/commands.c:781 `{ "victim", SendVictimMsg, 0, CF_PLAYER | CF_MATCHLESS, CD_VICTIM }` + DoCommand:1090 spec branch `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) return DO_WRONG_CLASS;` -> MATCH (CF_PLAYER, no CF_PLR_ADMIN; Init_cmds promotes nothing -> player-only)
- "usable outside a match" -> src/commands.c:1078 `if (k_matchLess && !(cmds[icmd].cf_flags & CF_MATCHLESS)) return DO_CMD_DISALLOWED_MATCHLESS;` -> MATCH (CF_MATCHLESS grants usability when server is matchLess; permissive "usable outside a match" consistent with additive CF_MATCHLESS; SendVictimMsg has no match_in_progress guard so no over-restriction)
- "no arguments" -> src/commands.c:1797-1800 `SendVictimMsg(void) { SendMessage(self->victim); }` (no trap_CmdArgv read) + table flags lack CF_PARAMS -> MATCH
WI-2: n/a -- access-class "Player-only command" verified MATCH vs CF_PLAYER + DoCommand spec gate + Init_cmds (no ADMIN bit); no default claim (command, not cvar)

RESULT | ktx:command:wreg | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=11 | Every clause maps to an enforcing line in cmd_wreg: argc=1 list-all, argc=2 show-slot, argc=3 register, +/- attack force/release, empty-order unregister, 20-slot cap, 10-char order cap, one-byte/range/non-digit rejections each with wreg_usage().
### ktx:command:wreg
- "Manages the caller's per-character weapon-registration slots (the server-side weapon-priority script feature)" -> src/commands.c:7298-7355 (operates on `self->wreg[c]` wreg_t array; consumed by cmd_wreg_do:7457 to drive impulse priority) -> MATCH
- "With no argument it lists all registered slots" -> src/commands.c:7301-7323 `if (argc == 1) { ... for (i = 0; i < MAX_WREGS; i++) { w = &(self->wreg[i]); if (!w->init) continue; found = true; wreg_showslot(w, i); } if (!found) G_sprint(self, 2, "none\n"); return; }` -> MATCH
- "With a single character argument it shows that slot's current registration" -> src/commands.c:7355-7360 `if (argc == 2) { wreg_showslot(w, c); return; }` -> MATCH
- "With a character plus a weapon order -- a string of weapon-impulse digits, optionally prefixed with + or - to force or release the attack button" -> src/commands.c:7409-7418 `if (tmp[0] == '+') { tmp++; attack = 1; } else if (tmp[0] == '-') { tmp++; attack = -1; }` + cmd_wreg_do:7478-7494 `if (w->attack > 0) { self->wreg_attack = 1; ... "+attack" } else if (w->attack < 0) { self->wreg_attack = 0; ... "-attack" }` -> MATCH
- "it registers that priority sequence under the given one-byte character" -> src/commands.c:7445-7456 `w->init = true; w->attack = attack; for (i--; ...) w->impulse[i] = imp[i]; G_sprint(self, 2, "slot \"%c\" - registered\n", (char) c);` -> MATCH
- "an empty order unregisters the slot" -> src/commands.c:7372-7384 `if (strnull(arg_2)) { if (w->init) { memset(w, 0, sizeof(wreg_t)); w->init = false; G_sprint(self, 2, "slot \"%c\" - unregistered\n", (char) c); } ... }` -> MATCH
- "Up to 20 slots" -> src/commands.c:7388-7399 `for (cnt = i = 0; i < MAX_WREGS; i++) { if (!(self->wreg[i].init)) continue; if (++cnt >= 20) { G_sprint(self, 2, "too many wregs, discard registration\n"); return; } }` -> MATCH
- "weapon order max 10 characters" -> src/commands.c:7401-7406 `if (strlen(arg_2) > 10) { wreg_usage(); G_sprint(self, 2, "too long weapon order\n"); return; }` -> MATCH
- "rejects multi-byte ... characters ... with a usage message" -> src/commands.c:7335-7340 `if (strlen(arg_1) > 1) { wreg_usage(); G_sprint(self, 2, "char can be only one byte\n"); return; }` -> MATCH
- "rejects ... out-of-range characters ... with a usage message" -> src/commands.c:7345-7351 `if (c == 0 || c > 175 || c > MAX_WREGS - 2) { wreg_usage(); G_sprint(self, 2, "\"%c\" - illegal char!\n", (char) c); return; }` -> MATCH
- "and non-digit orders with a usage message" -> src/commands.c:7426-7431 `if (!strnull(tmp) && !only_digits(tmp)) { wreg_usage(); G_sprint(self, 2, "illegal character in weapon order\n"); return; }` -> MATCH
WI-2: n/a (command, not a cvar; table flags CF_BOTH|CF_MATCHLESS|CF_PARAMS, no ADMIN bit, consistent with generic "caller's" framing)
<!-- ROUND C note: Wave 08 REJECTED (GATE 1: canary k_teamoverlay false-negatived TRACED-CLEAN, expected C-NEAR-MISS -- same correct-by-accident scope rationalization as wave 05) -> re-dispatched as 08b with the anti-rationalization-scope block. -->

## Wave 08b (Round C wave 08 re-dispatch, scope-sharpened) -- canary k_teamoverlay expect C-NEAR-MISS, returned C-NEAR-MISS (GATE 1 PASS -- the scope sharpening held); GATE 2 PASS (re-grep: flagged k_ctf_based_spawn wrong-clause confirmed -- world.c:622 `if (!cvar("k_ctf_based_spawn") && ...)` force-to-1 guarded by !cvar so value 2 is NOT forced [sole writer world.c:625]; clean k_allowklist commands.c:5077 triple-AND + dmm4_invinc_time client.c:2183/g_consts.h:317-318). Canary row k_teamoverlay stripped (control).

RESULT | ktx:cvar:dmm4_invinc_time | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | All clauses trace to PutClientInServer enforcement (client.c:2183-2289); DMM4_INVINCIBLE_DEFAULT=2.0, MAX=30.0 confirmed in include/g_consts.h; bound() semantics verified for negative-disable and 30s clamp.
### ktx:cvar:dmm4_invinc_time
- "spawn invincibility ... respawning in deathmatch 4 (DMM4) or bloodfest" -> src/client.c:2183 `if ((deathmatch == 4 || k_bloodfest) && (match_in_progress == 2))` -> MATCH
- "applied at PutClientInServer time" -> src/client.c:1793 `void PutClientInServer(void)` (enforcement block 2183-2289 inside this fn) -> MATCH
- "A value of 0 selects the built-in default of 2 seconds" -> src/client.c:2279-2281 `dmm4_invinc_time = (dmm4_invinc_time ? bound(0, dmm4_invinc_time, DMM4_INVINCIBLE_MAX) : DMM4_INVINCIBLE_DEFAULT);` + include/g_consts.h:317 `#define DMM4_INVINCIBLE_DEFAULT (2.0)` -> MATCH
- "a negative value disables spawn invincibility entirely" -> src/client.c:2283 `if (dmm4_invinc_time > 0)` (negative truthy -> bound(0,neg,30)=0 -> 0>0 false -> no IT_INVULNERABILITY) -> MATCH
- "it is also forced off when k_midair is set" -> src/client.c:2187-2189 `if (cvar("k_midair")) { dmm4_invinc_time = -1; // means off` -> MATCH
- "a positive value is clamped to a maximum of 30 seconds" -> src/client.c:2281 `bound(0, dmm4_invinc_time, DMM4_INVINCIBLE_MAX)` + include/g_consts.h:318 `#define DMM4_INVINCIBLE_MAX (30.0)` -> MATCH
WI-2: n/a -- world.c:947 `RegisterCvar("dmm4_invinc_time")` => registered default 0; description makes no "default X" cvar claim (it describes the runtime 0->2s behavior, correct), so no metadata defect.

RESULT | ktx:cvar:k_allowklist | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | All clauses trace to the klist() gate (commands.c:5077) -- three-way && (!cvar && match_in_progress && ct==ctPlayer) is the own-path enforcing line; exact 'klist is disabled' string confirmed; list contents confirmed in klist body.
### ktx:cvar:k_allowklist
- "klist ... prints ... players with id, admin/VIP flags, handicap and team; spectators with who they are tracking; and ghosts" -> src/commands.c:5083-5133 `find_plr` loop (id/ad/vip/hdp/team/name 5088-5096), `find_spc` loop w/ `TrackWhom(p)` (5104-5118), `find(...,"ghost")` loop (5126-5133) -> MATCH
- "may be used by a player while a match is in progress" -> src/commands.c:5077 `if (!cvar("k_allowklist") && match_in_progress && self->ct == ctPlayer)` -> MATCH
- "0 = klist is refused for players during a match (responds 'klist is disabled')" -> src/commands.c:5079 `G_sprint(self, 2, "klist is disabled\n"); return;` -> MATCH
- "1 = klist is allowed" -> src/commands.c:5077 (cvar=1 -> `!cvar(...)`=false -> gate not taken -> klist proceeds) -> MATCH
- "restriction applies only to clients of type player during a match; spectators and use outside a match are unaffected" -> src/commands.c:5077 conjunction `!cvar && match_in_progress && self->ct == ctPlayer` -> MATCH
WI-2: n/a -- world.c:861 `RegisterCvarEx("k_allowklist", "1")` => default 1; description states 0/1 semantics without an explicit "default" assertion, consistent.

RESULT | ktx:cvar:k_allowtracklist | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Structurally identical to k_allowklist; all clauses trace to tracklist() gate (commands.c:5433) three-way && on its own path; exact 'tracklist is disabled' string and spectator-tracking list contents confirmed.
### ktx:cvar:k_allowtracklist
- "tracklist ... prints the list of spectators and, for each, the player they are currently tracking" -> src/commands.c:5439-5448 `for (...; (p = find_spc(p)); ...)` printing `getname(p)` + `TrackWhom(p)` (or " not tracking") -> MATCH
- "may be used by a player while a match is in progress" -> src/commands.c:5433 `if (!cvar("k_allowtracklist") && match_in_progress && self->ct == ctPlayer)` -> MATCH
- "0 = tracklist is refused for players during a match (responds 'tracklist is disabled')" -> src/commands.c:5435 `G_sprint(self, 2, "tracklist is disabled\n"); return;` -> MATCH
- "1 = tracklist is allowed" -> src/commands.c:5433 (cvar=1 -> `!cvar(...)`=false -> gate not taken) -> MATCH
- "restriction applies only to clients of type player during a match; spectators and use outside a match are unaffected" -> src/commands.c:5433 conjunction `!cvar && match_in_progress && self->ct == ctPlayer` -> MATCH
WI-2: n/a -- world.c:862 `RegisterCvarEx("k_allowtracklist", "1")` => default 1; no explicit default claim in description.

RESULT | ktx:cvar:k_clan_arena_max_respawns | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | in_limbo gate (clan_arena.c:616, after round_deaths++) drives respawn at 1527-1542; round_deaths reset per round (1659); 0=>eliminated-on-first-death verified; staged-timer feed at calc_respawn_time:128/144 confirmed.
### ktx:cvar:k_clan_arena_max_respawns
- "Number of times a player may respawn per Clan Arena / Wipeout round before staying dead (spectating ghost) for the remainder of that round" -> src/clan_arena.c:602-616 `self->s.v.solid = SOLID_NOT; self->s.v.movetype = MOVETYPE_NOCLIP; ... self->in_play = false; self->round_deaths++; self->in_limbo = (self->ca_ready) && (self->round_deaths <= max_deaths) && self->can_respawn;` -> MATCH
- "goes to limbo (will respawn) only while their death count this round is at or below this value" -> src/clan_arena.c:615-616 `self->round_deaths++; self->in_limbo = (...) && (self->round_deaths <= max_deaths) && ...;` ("at or below" == `<=`; post-increment so value N permits N respawns) -> MATCH
- "0 = no respawns (eliminated on first death of the round)" -> src/clan_arena.c:615-616 (max=0: round_deaths++ ->1 then `1 <= 0` false -> in_limbo=false -> no respawn) -> MATCH
- "Also feeds the staged respawn-timer calculation" -> src/clan_arena.c:128 `int max_deaths = cvar("k_clan_arena_max_respawns");` + clan_arena.c:144 `if (isWipeout && (p->round_deaths+offset <= max_deaths))` inside calc_respawn_time() -> MATCH
WI-2: n/a -- world.c:985 `RegisterCvarEx("k_clan_arena_max_respawns", "0")` => default 0; description makes no explicit default claim.

RESULT | ktx:cvar:k_ctf_based_spawn | C-FIX | flavourC=1 | wi2=0 | clauses=5 | Modes 0/1/2 + default 0 all trace clean (client.c:1891-1912, world.c:962 bare RegisterCvar); auto-force clause is WRONG vs its enforcing line -- world.c:622 force-to-1 is guarded by !cvar(...), so value 2 on a <=1-info_player_deathmatch map is NOT forced to 1 (stays 2; value-2 spawn path client.c:1899 is live), contradicting "automatically forced to 1".
### ktx:cvar:k_ctf_based_spawn
- "Controls CTF spawn-point selection" -> src/client.c:1891-1912 (all branches gated `isCTF()`) -> MATCH
- "0 (default): spawn on team base only at match start, then generic deathmatch spawns" -> src/client.c:1891 `if (isCTF() && ((match_start_time == g_globalvars.time) || (cvar("k_ctf_based_spawn") == 1)))` (val 0: only match-start subcond true -> team1/2 base; later -> else 1911 `SelectSpawnPoint("info_player_deathmatch")`) + src/world.c:962 `RegisterCvar("k_ctf_based_spawn")` (bare => default 0) -> MATCH
- "1: always spawn on own team's base spawns (info_player_team1/team2)" -> src/client.c:1891-1894 `... cvar(...)==1 ... SelectSpawnPoint(streq(getteam(self),"red") ? "info_player_team1" : "info_player_team2")` -> MATCH
- "2: random mix of neutral mid-map spawns and home-base spawns (avoid spawn-kill at overrun flag)" -> src/client.c:1899-1903 `else if (isCTF() && (cvar("k_ctf_based_spawn") == 2)) spot = SelectSpawnPoint(g_random() <= 0.5 ? "info_player_deathmatch" : ... "info_player_team1_deathmatch" : "info_player_team2_deathmatch");` (rationale comment 1896-1898) -> MATCH
- "If the map has at most one info_player_deathmatch entity, the value is automatically forced to 1" -> src/world.c:622-625 `if (!cvar("k_ctf_based_spawn") && (find_cnt(FOFCLSN, "info_player_deathmatch") <= 1)) { ... cvar_fset("k_ctf_based_spawn", 1); }` -> MISMATCH(force guarded by `!cvar(...)`: only when value currently 0/falsy; if value==2 the guard is false, value NOT forced to 1 and stays 2 -- ctf.c:863 only blocks the toggle, never rewrites 2->1; no value clamp anywhere; value-2 spawn path client.c:1899 remains live. "automatically forced to 1" is wrong for the supported value-2 + sparse-map case.)
WI-2: n/a -- "0 (default)" correct (world.c:962 bare RegisterCvar => registered default 0); the defect is the behavioral auto-force clause (flavour-C).

## Wave 09 -- canary k_yawnmode expect TRACED-CLEAN, returned TRACED-CLEAN (GATE 1 PASS -- over-flag control held); GATE 2 PASS (re-grep: clean k_ctf_ga 50-armor gate client.c:2349 + k_dis 35*cells weapons.c:1208/1225 / k_dis==2 out-of-water-0 combat.c:1196; canary k_yawnmode axe weapons.c:128). All 5 batch rows TRACED-CLEAN. Canary row k_yawnmode stripped (control).

RESULT | ktx:cvar:k_ctf_ga | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Every clause maps to an enforcing line: armor grant at client.c:2349, dmm4/instagib exclusion via deathmatch<4 + world.c:1765 instagib-only-in-dmm4, match gate match_in_progress==2, ga command + "green armor" message at ctf.c:802.
### ktx:cvar:k_ctf_ga
- "When enabled (non-zero), every player spawns with 50 points of green armor in CTF mode" -> src/client.c:2349-2353 `if (cvar("k_ctf_ga") && deathmatch < 4 && match_in_progress == 2) { self->s.v.armorvalue = 50; self->s.v.armortype = 0.3; self->s.v.items = (int)self->s.v.items | IT_ARMOR1; }` (gated on isCTF() block client.c:2342) -> MATCH
- "only while a match is in progress" -> src/client.c:2349 `&& match_in_progress == 2` -> MATCH
- "not in instagib/dmm4" -> src/client.c:2349 `&& deathmatch < 4` excludes dmm4; src/world.c:1765-1767 `if (cvar("k_instagib") && deathmatch != 4) { cvar_fset("k_instagib", 0); }` -> MATCH (instagib requires dmm4, which deathmatch<4 excludes; enforced by explicit guard)
- "in CTF mode" -> src/client.c:2342 `if (isCTF())` enclosing block -> MATCH
- "When disabled, players spawn without this starting armor" -> src/client.c:2349 armor-grant block skipped when `cvar("k_ctf_ga")` is 0 (no else branch adds armor) -> MATCH
- "Toggleable in-game via the CTF \"ga\" command (announced as \"green armor\")" -> src/ctf.c:802 `cvar_toggle_msg(self, "k_ctf_ga", redtext("green armor"));` (in ga() after isCTF() check ctf.c:795) -> MATCH
WI-2: n/a -- `RegisterCvar("k_ctf_ga")` (world.c:961) default 0; description asserts no default value.

RESULT | ktx:cvar:k_ctf_runes | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Master switch + CTF-mode gate at world.c:1294/SpawnRunes runes.c:381, 4 named runes confirmed in SpawnRunes, matchless carry-removal+speed-reset at ctf.c:744-752, mid-game/mode re-eval at FixCTFItems world.c:1292.
### ktx:cvar:k_ctf_runes
- "CTF mode only. Master on/off switch for the four CTF power runes (resistance, strength, haste, regeneration)" -> src/runes.c:399-419 `if (cvar("k_ctf_rune_power_res")>0) UniqueRuneSpawn(CTF_RUNE_RES...)` ... STR, HST, RGN -> MATCH (exactly four: RES/STR/HST/RGN)
- "When nonzero and the server is in CTF mode, the runes are spawned in the map" -> src/world.c:1294 `SpawnRunes(isCTF() && cvar("k_ctf_runes"));` -> MATCH
- "when 0, no runes are spawned" -> src/runes.c:391-394 `if (!yes) { return; }` (after removing all existing "rune" ents 385-388) -> MATCH
- "in matchless mode any rune a player is already carrying is removed" -> src/ctf.c:744-751 `if (k_matchLess) { if (!cvar("k_ctf_runes")) { ... p->ctf_flag -= (p->ctf_flag & (CTF_RUNE_MASK)); ... } }` -> MATCH
- "and that player's speed is reset" -> src/ctf.c:750 `p->maxspeed = cvar("sv_maxspeed"); // Reset speed, in case was carrying haste` -> MATCH
- "Changing the value mid-game (or switching into CTF mode) re-evaluates and respawns or clears the runes accordingly" -> src/world.c:1292-1294 `if ((old_k_mode != k_mode) || (k_ctf_runes != cvar("k_ctf_runes")) || (framecount == 2)) { SpawnRunes(isCTF() && cvar("k_ctf_runes")); }` in FixCTFItems -> MATCH
WI-2: n/a -- `RegisterCvar("k_ctf_runes")` (world.c:955) default 0; description asserts no default value.

RESULT | ktx:cvar:k_dis | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | All three states traced: 0 zeroes cells then returns before T_RadiusDamage (weapons.c:1203/1220), 1 deals 35*cells radius damage, 2 zeroes damage for out-of-water victims (combat.c:1196); discharge trigger is LG-in-water at weapons.c:1173.
### ktx:cvar:k_dis
- "Controls lightning-gun discharge (firing the LG while standing in water)" -> src/weapons.c:1173 `if ((self->s.v.waterlevel > 1) && (match_in_progress == 2))` (LG discharge path in W_FireLightning) -> MATCH
- "0 = discharge disabled: the player loses their cells but no area damage is dealt" -> src/weapons.c:1218-1224 `cells = self->s.v.ammo_cells; self->s.v.ammo_cells = 0; W_SetCurrentAmmo(); AmmoUsed(self); if (!cvar("k_dis")) { return; } T_RadiusDamage(...)` -> MATCH (cells zeroed before the `!cvar("k_dis")` early-return that skips T_RadiusDamage)
- "1 = discharge enabled: dealing radius damage scaled by the cells spent" -> src/weapons.c:1225 `T_RadiusDamage(self, self, 35 * cells, world, dtLG_DIS);` -> MATCH (damage = 35 * cells)
- "2 = discharge still fires but only players who are themselves in liquid take the discharge damage (a victim out of water takes none)" -> src/combat.c:1195-1198 `// no out of water discharge damage if k_dis 2` `else if ((cvar("k_dis") == 2) && (dtLG_DIS == dtype) && !head->s.v.waterlevel) { points = 0; }` -> MATCH
WI-2: n/a -- `RegisterCvar("k_dis")` (world.c:865) default 0; description asserts no default value.

RESULT | ktx:cvar:k_fbskill_aim_pitch_min | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Cvar->FB_CVAR_PITCH_MIN_ERROR (bot_botimp.c:27); used as bound() lower arg in pitch_diff at bot_aim.c:348; read into aim_params[PITCH].minimum with bound(0,v,10) at bot_botimp.c:320; skill-derivation writes it at bot_botimp.c:174/225.
### ktx:cvar:k_fbskill_aim_pitch_min
- "Frogbot AI tuning cvar setting the lower clamp on the bot's vertical (pitch) aim-error magnitude" -> src/bot_aim.c:348 `pitch_diff = bound(pitch->minimum, fabs(raw_pitch_diff) * pitch->scale, pitch->maximum);` (pitch=&self->fb.skill.aim_params[PITCH] bot_aim.c:324) -> MATCH
- "the pitch error is computed as bound(pitch.minimum, fabs(raw_pitch_diff) * pitch.scale, pitch.maximum)" -> src/bot_aim.c:348 (verbatim structural match) -> MATCH
- "the floor below which the randomized vertical aim deviation cannot fall" -> src/bot_aim.c:348 then bot_aim.c:351 `pitch_rnd = dist_random(-pitch_diff, pitch_diff, ...)`: on target raw_pitch_diff~0 so pitch_diff floors at pitch->minimum -> MATCH
- "Read back per bot clamped to bound(0, value, 10) into self->fb.skill.aim_params[PITCH].minimum" -> src/bot_botimp.c:320 `self->fb.skill.aim_params[PITCH].minimum = bound(0, cvar(FB_CVAR_PITCH_MIN_ERROR), 10);` (FB_CVAR_PITCH_MIN_ERROR = "k_fbskill_aim_pitch_min", bot_botimp.c:27) -> MATCH
- "The server normally derives the value from the bot's aim-skill level; setting the cvar overrides that" -> src/bot_botimp.c:174 `cvar_fset(FB_CVAR_PITCH_MIN_ERROR, RangeOverSkill(aimskill, 1.5, 1));` (also :225); SetAttribs reads the cvar (bot_botimp.c:320) so a manually-set value is consumed -> MATCH (residual judgment: skill-set path overwrites a manual override on its next run, surfaced per PROC-1; the asserted "normally skill-derived, cvar is the read source" is code-accurate)
WI-2: n/a -- `RegisterCvar(FB_CVAR_PITCH_MIN_ERROR)` (bot_botimp.c:124) default 0; description asserts no default value (effective default is skill-derived at runtime).

RESULT | ktx:cvar:k_fbskill_distanceerror | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Cvar->FB_CVAR_DISTANCEERROR (bot_botimp.c:19); read into movement_estimate_error bound(0,v,0.25) at bot_botimp.c:310; consumed by EstimateTimeBasedOnSkill bot_aim.c:91-95 as dist_random(t*(1-d),t*(1+d),2); feeds PredictEnemyLocationInFuture.
### ktx:cvar:k_fbskill_distanceerror
- "Frogbot AI tuning cvar. Sets the fractional random error the bot applies when estimating an enemy's movement time for aim prediction" -> src/bot_aim.c:91-95 `static float EstimateTimeBasedOnSkill(gedict_t *self, float original_time) { float dist = self->fb.skill.movement_estimate_error; return dist_random(original_time * (1 - dist), original_time * (1 + dist), 2); }` -> MATCH
- "the bot replaces the real time-to-target with a random value in the range [original_time * (1 - this_value), original_time * (1 + this_value)]" -> src/bot_aim.c:94 `return dist_random(original_time * (1 - dist), original_time * (1 + dist), 2);` -> MATCH (exact range expression)
- "a higher value makes the bot mis-time its lead on a moving enemy and 0 gives an exact estimate" -> src/bot_aim.c:94 with dist=0 yields dist_random(original_time, original_time, 2) == original_time -> MATCH
- "Read into self->fb.skill.movement_estimate_error clamped with bound(0, value, 0.25)" -> src/bot_botimp.c:310 `self->fb.skill.movement_estimate_error = bound(0, cvar(FB_CVAR_DISTANCEERROR), 0.25);` (FB_CVAR_DISTANCEERROR = "k_fbskill_distanceerror", bot_botimp.c:19) -> MATCH
- "Consumed by EstimateTimeBasedOnSkill() in bot_aim.c, which feeds enemy-location prediction" -> src/bot_aim.c:101-102 `float fallheight = enemy->s.v.origin[2] - 56 + enemy->s.v.velocity[2] * EstimateTimeBasedOnSkill(self, rel_time);` inside PredictEnemyLocationInFuture -> MATCH
WI-2: n/a -- `RegisterCvar(FB_CVAR_DISTANCEERROR)` (bot_botimp.c:150) default 0; description asserts no default value (skill-derived at runtime).
## Wave 10 -- canary autotrack expect C-FIX, returned C-FIX (GATE 1 PASS); GATE 2 PASS (re-grep: canary autotrack defect commands.c:893 + DoCommand; clean k_freshteams_pack_shells bound items.c:2836 + k_hoonymode_prevmap cvar_set hoonymode.c:1319 + k_freshteams_sweep_sng_ammo RegisterCvarEx "6" world.c:905). All 5 batch rows TRACED-CLEAN. Canary row autotrack stripped (control).

RESULT | ktx:cvar:k_fbskill_missiledodge | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Every clause maps to an enforcing line: bound(0,v,1.5) read into missile_dodge_time, on-ground + tracked-missile gate, elapsed-since-spawntime >= value threshold with correct polarity, consumed in bot_botthink.c BotOnGroundMovement.
### ktx:cvar:k_fbskill_missiledodge
- "Read into self->fb.skill.missile_dodge_time clamped with bound(0, value, 1.5) (seconds)" -> src/bot_botimp.c:356 `self->fb.skill.missile_dodge_time = bound(0, cvar(FB_CVAR_MISSILEDODGE_TIME), 1.5f);` (FB_CVAR_MISSILEDODGE_TIME = "k_fbskill_missiledodge" bot_botimp.c:54) -> MATCH
- "while on the ground with a tracked incoming missile" -> src/bot_botthink.c:153 `if ((int)self->s.v.flags & FL_ONGROUND)` + src/bot_botthink.c:158 `if (self->fb.missile_dodge && ...)` -> MATCH
- "the bot only begins its dodge once the elapsed time since that missile was spawned is at least this value" -> src/bot_botthink.c:159-160 `((g_globalvars.time - self->fb.missile_dodge->fb.missile_spawntime) >= self->fb.skill.missile_dodge_time)` -> MATCH
- "a larger value means the bot reacts later (slower) ... a smaller value means it dodges sooner" -> src/bot_botthink.c:159-160 (same `>=` threshold) -> MATCH (polarity correct)
- "Consumed by the on-ground dodge logic in bot_botthink.c" -> src/bot_botthink.c:149 `static void BotOnGroundMovement(gedict_t *self, vec3_t dir_move)` containing the :158-178 dodge block -> MATCH
- "(seconds)" -> src/bot_botthink.c:159 compared to `g_globalvars.time` delta + include/progs.h:536 `float missile_dodge_time; // minimum time in seconds before bot dodges missile` -> MATCH
WI-2: n/a (bare `RegisterCvar(FB_CVAR_MISSILEDODGE_TIME)` bot_botimp.c:148 => default 0; description makes no default claim)

RESULT | ktx:cvar:k_freshteams_pack_shells | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | dmm1 scope force-enforced (k_freshteams zeroed when deathmatch!=1), shell ceiling clamped 0..cvar in DropBackpack only when k_freshteams && k_freshteams_limit_packs, player ammo copied then bounded down.
### ktx:cvar:k_freshteams_pack_shells
- "Fresh Teams (dmm1) only" -> src/world.c:1770-1772 `if (cvar("k_freshteams") && deathmatch != 1) { cvar_fset("k_freshteams", 0); // freshteams only in dmm1 }` -> MATCH (k_freshteams force-zeroed outside dmm1; clamp at :2834 gates on fresh_packs requiring k_freshteams)
- "the maximum number of shells a dropped backpack may carry" -> src/items.c:2836 `item->s.v.ammo_shells = bound(0, item->s.v.ammo_shells, cvar("k_freshteams_pack_shells"));` inside DropBackpack() (items.c:2667) -> MATCH
- "when backpack ammo limiting is active (k_freshteams set and k_freshteams_limit_packs enabled)" -> src/items.c:2672 `qbool fresh_packs = (cvar("k_freshteams") && cvar("k_freshteams_limit_packs"));` gating src/items.c:2834 `if (fresh_packs)` -> MATCH
- "The dropped pack's shell count is clamped to the range 0..this value" -> src/items.c:2836 `bound(0, item->s.v.ammo_shells, cvar("k_freshteams_pack_shells"))` -> MATCH
- "any shells the dead player carried beyond this ceiling are not transferred to the pack" -> src/items.c:2819 `item->s.v.ammo_shells = self->s.v.ammo_shells;` then clamped at :2836 -> MATCH
- "Units are shells (ammo count). Has no effect unless k_freshteams and k_freshteams_limit_packs are both set" -> src/items.c:2834 `if (fresh_packs)` (bound skipped when either unset) -> MATCH
WI-2: n/a (world.c:898 `RegisterCvarEx("k_freshteams_pack_shells", "20")` = 20; description makes no default claim)

RESULT | ktx:cvar:k_freshteams_sweep_lg_ammo | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | dmm1 scope force-enforced, sweep gate (k_freshteams && limit_sweep_ammo && already-own-LG) adds cvar to ammo_cells, else-branch grants the literal 15 cells; "default 15 cells" correctly refers to the non-limited else grant, not the cvar's registered default (3) -- no false default claim.
### ktx:cvar:k_freshteams_sweep_lg_ammo
- "Fresh Teams (dmm1) only" -> src/world.c:1770-1772 `if (cvar("k_freshteams") && deathmatch != 1) { cvar_fset("k_freshteams", 0); }` + gate src/items.c:957 requires k_freshteams -> MATCH
- "the number of cells awarded when a player picks up a lightning gun they already own ('sweeping' it)" -> src/items.c:957 `if (k_freshteams && limit_sweep_ammo && ((int)other->s.v.items & IT_LIGHTNING))` + src/items.c:959 `other->s.v.ammo_cells += cvar("k_freshteams_sweep_lg_ammo");` -> MATCH
- "applied only when k_freshteams and k_freshteams_limit_sweep_ammo are both enabled" -> src/items.c:957 `k_freshteams && limit_sweep_ammo` (limit_sweep_ammo = cvar("k_freshteams_limit_sweep_ammo") items.c:810) -> MATCH
- "The lightning gun draws from the cell ammo pool, so this value is added to the player's cells" -> src/items.c:959 `other->s.v.ammo_cells += cvar("k_freshteams_sweep_lg_ammo");` -> MATCH
- "When sweep limiting is off, picking up an already-owned lightning gun instead grants the default 15 cells" -> src/items.c:961-963 `else { other->s.v.ammo_cells += 15; }` -> MATCH (else-branch literal 15; "default" = non-limited pickup amount, not cvar registered default)
- "Units are cells (ammo count). Has no effect unless k_freshteams and k_freshteams_limit_sweep_ammo are both set" -> src/items.c:957 gate -> MATCH
WI-2: n/a (world.c:908 `RegisterCvarEx("k_freshteams_sweep_lg_ammo", "3")` = 3; description's "15" correctly describes the non-limited else grant, NOT the cvar default -- no metadata defect)

RESULT | ktx:cvar:k_freshteams_sweep_sng_ammo | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | dmm1 scope force-enforced, sweep gate adds cvar to ammo_nails in place of the +30 else-branch when k_freshteams && limit_sweep_ammo && already-own-SNG; "Default 6" matches the registered default exactly.
### ktx:cvar:k_freshteams_sweep_sng_ammo
- "FreshTeams (dmm1) only" -> src/world.c:1770-1772 `if (cvar("k_freshteams") && deathmatch != 1) { cvar_fset("k_freshteams", 0); }` + gate src/items.c:873 requires k_freshteams -> MATCH
- "the number of nails a player gains when picking up a super nailgun they already own (a \"sweep\")" -> src/items.c:873 `if (k_freshteams && limit_sweep_ammo && ((int)other->s.v.items & IT_SUPER_NAILGUN))` + src/items.c:875 `other->s.v.ammo_nails += cvar("k_freshteams_sweep_sng_ammo");` -> MATCH
- "applied in place of the normal 30-nail pickup" -> src/items.c:877-879 `else { other->s.v.ammo_nails += 30; }` -> MATCH
- "Active only while k_freshteams is on and k_freshteams_limit_sweep_ammo is enabled; otherwise the standard +30 nails is given" -> src/items.c:873 gate / src/items.c:879 else `+= 30` -> MATCH
- "Default 6" -> src/world.c:905 `RegisterCvarEx("k_freshteams_sweep_sng_ammo", "6");` -> MATCH (registered default is exactly 6)
WI-2: Default-value claim "Default 6" verified correct against registered default src/world.c:905 = "6" (WI-2 pass, wi2=0)

RESULT | ktx:cvar:k_hoonymode_prevmap | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Identifier (entityfile-else-mapname), team-HoonyMode-gated restore on match, prevspawns companion, mismatch->clear, and "written automatically / default empty" all map to enforcing lines; "by the engine" is loose (cvar_set runs in the KTX game-mod) but the still-true intent traces cleanly.
### ktx:cvar:k_hoonymode_prevmap
- "Internal HoonyMode state, not meant to be set by hand" -> src/hoonymode.c:1319 `cvar_set("k_hoonymode_prevmap", ...)` is the only writer (no command/handler sets it) -> MATCH (write exclusively internal; PROC-1: "not meant by hand" intent backed by sole-internal-writer fact)
- "stores the identifier of the last map (the .ent entityfile name, or the map name if none) for which team-game spawn nominations were saved" -> src/hoonymode.c:1319 `cvar_set("k_hoonymode_prevmap", strnull(entityFile) ? mapname : entityFile);` (entityFile = cvar_string("k_entityfile") hoonymode.c:1306; written by HM_store_spawns) -> MATCH
- "On the next team HoonyMode game, if the current map identifier matches this stored value the previously saved spawn assignments ... are restored" -> src/hoonymode.c:1262-1263 `if (streq(cvar_string("k_hoonymode_prevmap"), strnull(entityFile) ? mapname : entityFile))` -> restore loop 1277-1291; gated 1257 `if (!isHoonyModeTDM()) return;` (isHoonyModeTDM = isTeam() && cvar("k_hoonymode") hoonymode.c:97-100) -> MATCH (own-path team-game guard)
- "(see k_hoonymode_prevspawns)" -> src/hoonymode.c:1265 `char *spawns = cvar_string("k_hoonymode_prevspawns");` -> MATCH (companion cvar)
- "if it differs, the saved spawns are cleared" -> src/hoonymode.c:1298-1301 `else { cvar_set("k_hoonymode_prevspawns", ""); }` -> MATCH
- "Written automatically by the engine; default empty" -> src/hoonymode.c:1319-1320 `cvar_set` (automatic) + src/world.c:890 `RegisterCvarEx("k_hoonymode_prevmap", "");` -> MATCH (auto-written; default empty). Minor vagueness: "engine" loosely names the KTX game-mod (qwprogs) that runs cvar_set -- still-true, traceable
WI-2: Default-value claim "default empty" verified correct against registered default src/world.c:890 `RegisterCvarEx("k_hoonymode_prevmap", "")` = empty string (WI-2 pass, wi2=0)

## Wave 11 -- canary k_teamoverlay expect C-NEAR-MISS, returned C-NEAR-MISS (GATE 1 PASS -- proactive scope-hardening held, no false-negative); GATE 2 PASS (re-grep: flagged k_pow_p wrong-clause confirmed -- DropPowerups items.c:1972 has only IT_QUAD/IT_INVISIBILITY branches, no k_pow_p/IT_INVULNERABILITY on the player death-drop path; only k_pow_p-gated pent drop is sp_monsters.c:667 [monster, opposite polarity]; clean k_lockmax match.c:1821 + canary k_teamoverlay match.c:1639). Canary row k_teamoverlay stripped (control).

RESULT | ktx:cvar:_k_pow_last | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Map-end store of resolved Get_Powerups() and framecount==1 restore both traced; internal/int/default-0 all confirmed; faithful behavioral summary.
### ktx:cvar:_k_pow_last
- "At map end the server stores the resolved powerups-enabled state ... here" -> src/g_main.c:532 `cvar_fset("_k_pow_last", Get_Powerups());` (G_ShutDown, GAME_SHUTDOWN before level change g_main.c:395-400) -> MATCH
- "the on/off result of the k_pow setting after the minimum-players check" -> src/g_utils.c:1809-1824 `k_pow_new = WeirdCountPlayers() < k_pow_min_players ? 0 : k_pow_new; ... return (k_pow = k_pow_new);` -> MATCH
- "on the first frame of the next map this stored value seeds the active powerups state" -> src/g_utils.c:1806-1808 `if (framecount == 1) { k_pow = cvar("_k_pow_last"); // restore k_pow from last level }` -> MATCH
- "so powerup spawning continues consistently across the map change" -> src/world.c:1374,1389-1396 `... || (framecount == 1)) {...} if (k_pow && k_pow_p) show_powerups(...) else hide_powerups(...)` (FixPowerups via StartFrame world.c:1858) -> MATCH
- "Integer (0 = powerups were off, non-zero = on); internal, not for manual setting" -> src/world.c:783 `RegisterCvar("_k_pow_last");  // internal usage, k_pow from last map` (default 0/empty, int via cvar_fset of int Get_Powerups) -> MATCH
WI-2: n/a -- no default claimed in prose; registered default 0/empty consistent with "0 = off".

RESULT | ktx:cvar:k_idletime | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Spawn-at-half-ready, max(3,k_idletime) 3s floor, per-second countdown, force-start, <=0 disable all traced to enforcing lines.
### ktx:cvar:k_idletime
- "Idle-bot timeout in seconds. When greater than 0 ..." -> src/match.c:2678 `if ((cvar("k_idletime") <= 0) || bots) { ... ent_remove(p); return; }` (idlebot only created when k_idletime > 0) -> MATCH
- "once at least half the players are ready KTX spawns an internal 'idle bot'" -> src/match.c:2690-2722 `if (((0.5f * i) > CountRPlayers()) || (i < 2)) {...return;} ... p = spawn(); p->classname = "idlebot";` (i=CountPlayers match.c:2688; CountRPlayers=ready 101-115) -> MATCH
- "that counts down from this many seconds (with a 3-second floor)" -> src/match.c:2738 `p->attack_finished = max(3, cvar("k_idletime"));` -> MATCH
- "if the players still have not all readied when the countdown reaches zero, the bot force-starts the match" -> src/match.c:2617,2643-2646 `self->attack_finished -= 1; ... if (self->attack_finished < 1) { IdlebotForceStart();` -> match.c:2569-2603 -> MATCH
- "Set to 0 to disable the idle bot entirely" -> src/match.c:2611 `if (cvar("k_idletime") <= 0) { ent_remove(self); return; }` + match.c:2678 -> MATCH
WI-2: n/a -- no default claimed; registered default 0/empty (RegisterCvar world.c:933) consistent with "0 disables".

RESULT | ktx:cvar:k_lockmax | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | exceed->block, "Get rid of N teams!" message, ready-team count, CA/Race force-2-ignore-cvar all map to isCanStart enforcing lines.
### ktx:cvar:k_lockmax
- "Maximum number of teams allowed for a match to start" -> src/match.c:1821 `int k_lockmax = (isCA() || isRACE()) ? 2 : cvar("k_lockmax");` (used in match-start gate isCanStart) -> MATCH
- "If the count of teams that have players ready exceeds this value, the match is blocked from starting" -> src/match.c:1901-1916 `if (i > k_lockmax) { sub = i - k_lockmax; ... return false; }` (i=CountRTeams match.c:1823) -> MATCH
- "players are told to \"Get rid of N teams!\"" -> src/match.c:1904 `txt = va("Get rid of %d team%s!\n", sub, count_s(sub));` -> MATCH
- "Counted in teams ... In Clan Arena and Race modes this cvar is ignored and the maximum is forced to 2" -> src/match.c:1821 `(isCA() || isRACE()) ? 2 : cvar("k_lockmax")` -> MATCH
WI-2: n/a -- no default claimed; registered default 0/empty (RegisterCvar world.c:859), config-driven per mode.

RESULT | ktx:cvar:k_nosweep | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | duplicate-weapon early-return (no item/no ammo), DMM1-only force-0 in FixRules, "NoSweep on" readout, polarity, default all traced.
### ktx:cvar:k_nosweep
- "a player who already carries a given weapon cannot pick up another instance ... touching a duplicate weapon does nothing" -> src/items.c:846 (and 865/884/903/930/949) `if ((leave || k_nosweep) && ((int)other->s.v.items & IT_NAILGUN)) { return; }` (weapon_touch, return before grant) -> MATCH
- "the player neither re-takes it nor gains its sweep ammo" -> src/items.c:846-861 `return;` precedes `other->s.v.ammo_nails += 30;` / item grant -> MATCH
- "0 = weapons can be re-swept normally; non-zero = duplicate-weapon pickup blocked" -> src/items.c:811,846 `int k_nosweep = cvar("k_nosweep"); ... if ((leave || k_nosweep) && (...items)) return;` -> MATCH
- "Only effective in DMM1 (deathmatch 1); the server forces it back to 0 in any other deathmatch mode" -> src/world.c:1775-1777 `if (cvar("k_nosweep") && deathmatch != 1) { cvar_fset("k_nosweep", 0); // nosweep only in dmm1 }` (FixRules world.c:1549, per-frame) -> MATCH
- "While active the match settings readout shows \"NoSweep on\"" -> src/match.c:1753-1755 `if (cvar("k_nosweep")) { strlcat(text, va("%s %5s\n", "NoSweep", redtext("on")), sizeof(text)); }` -> MATCH
WI-2: n/a -- no default claimed; registered default 0 (RegisterCvarEx("k_nosweep","0") world.c:909) consistent.

RESULT | ktx:cvar:k_pow_p | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=5 | hide/no-pickup/enabled/global-gate/subset-report all traced clean; but "held pentagrams not dropped on death" has NO k_pow_p enforcing line on the player path -- player DropPowerups() has no IT_INVULNERABILITY branch at all, so the clause is incidental-true, not k_pow_p-gated.
### ktx:cvar:k_pow_p
- "0 = pentagram entities are hidden and cannot be picked up" -> src/world.c:1389-1396 `if (k_pow && k_pow_p) show_powerups("item_artifact_invulnerability"); else hide_powerups(...)` + src/items.c:2037-2043 `if (... || (((int)self->s.v.items & IT_INVULNERABILITY) && !cvar("k_pow_p")) ...) { return; }` (powerup_touch blocked) -> MATCH
- "(and held pentagrams are not dropped on death)" -> src/items.c:1972-1996 `void DropPowerups(void)` (player death-drop, player.c:1150) has NO IT_INVULNERABILITY branch (only IT_QUAD via dq/k_killquad 1980/1985, IT_INVISIBILITY via dr 1993); the only k_pow_p-gated DropPowerup(IT_INVULNERABILITY) is src/sp_monsters.c:665-667 `if (/*cvar("dp") &&*/cvar("k_pow_p")) DropPowerup(30, IT_INVULNERABILITY);` -- MONSTER random-drop, opposite polarity (k_pow_p ON -> monster CAN drop) -> UNTRACEABLE(no k_pow_p-gated suppression of a player pentagram drop exists; players unconditionally never drop pentagrams regardless of k_pow_p -- clause attributed to k_pow_p but not enforced by it)
- "1 = pentagram enabled" -> src/world.c:1389 `if (k_pow && k_pow_p) show_powerups("item_artifact_invulnerability");` -> MATCH
- "Only takes effect while powerups are globally enabled (see k_pow)" -> src/world.c:1389 `if (k_pow && k_pow_p)` + src/g_utils.c:1741-1747 returns "off" when !k_pow regardless of k_pow_p -> MATCH
- "the per-type switches together determine whether the powerup state reports as 'off', 'on', or a partial subset" -> src/g_utils.c:1740-1777 `Get_PowerupsStr` `if (!cvar("k_pow") || (!q&&!p&&!r&&!s)) "off"; if (q&&p&&r&&s) "on"; else strlcat("p"...)` -> MATCH
WI-2: n/a -- description states 0/1 states only, no explicit "Default" prose; registered default 1 (RegisterCvarEx("k_pow_p","1") world.c:813) consistent anyway.
## Wave 12 -- canary k_yawnmode expect TRACED-CLEAN, returned TRACED-CLEAN (GATE 1 PASS -- over-flag control held); GATE 2 PASS (re-grep: flagged k_spw wrong-clause confirmed -- anti-telefrag push-away keyed to k_spw==1 client.c:1167, same-spawn-avoidance escalates 2/3/4 client.c:1113, "higher modes add anti-telefrag" conflates; clean k_rocketarena isRA arena.c:132 + k_race_countdown open-interval race.c:283). 6 batch rows. Canary row k_yawnmode stripped (control).

RESULT | ktx:cvar:k_privategame | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Every clause maps to an enforcing line: ready-up gate (match.c:2811), sole writer private_game_toggle (vote.c:1550-1597), sv_login polarity matches in-code comment, mid-setup unready/kick/force-spec all gated as described, default 0 registered.
### ktx:cvar:k_privategame
- "Current private-game state ... 0 = public game (off), non-zero = private game (on)" -> src/world.c:1087 `RegisterCvarEx("k_privategame", "0"); // whether it is currently on or off` -> MATCH (default 0; is_private_game() vote.c:1602 `return cvar("k_privategame") != 0`)
- "only logged-in players may ready up (unauthenticated players attempting to ready are told to log in first)" -> src/match.c:2811 `if (is_private_game() && !is_logged_in(self))` then match.c:2813 `G_sprint(self, 2, "You must login first\n"); return;` (PlayerReady) -> MATCH
- "it is toggled by private_game_toggle()" -> src/vote.c:1556 `cvar_fset("k_privategame", enable ? 1 : 0);` (sole writer) -> MATCH
- "which also sets sv_login (1 = players must be logged in, 2 = everyone including spectators must be logged in, 0 = open)" -> src/vote.c:1554 `int private_login = allow_spectators ? 1 : 2; // sv_login 1 => players only, sv_login 2 => everyone` + vote.c:1557 `cvar_fset("sv_login", enable ? private_login : 0);` -> MATCH (adjacent comment confirms 1=players,2=everyone; disable=0=open)
- "when enabling mid-setup" -> src/vote.c:1559 `if (enable && match_in_progress < 2)` -> MATCH
- "unreadies ... unauthenticated players" -> src/vote.c:1576 `if (!p->isBot && p->ready && !is_logged_in(p))` + vote.c:1578 `p->ready = 0;` -> MATCH
- "optionally kicks or force-spectates unauthenticated players" -> src/vote.c:1588 `do_force_spec(p, NULL, true);` and src/vote.c:1593 `stuffcmd(p, "disconnect\n");` (both gated by force_reconnect/allow_specs cvars) -> MATCH ("optionally" = cvar-gated)
WI-2: n/a (RegisterCvarEx default "0" matches "0 = public game"; no access-class clause)

RESULT | ktx:cvar:k_privategame_default | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=3 | Reset-routine condition (commands.c:4863-4865) enforces all three clauses exactly; private_game_voteable()=k_privategame_voteable; default 0 registered = public on reset.
### ktx:cvar:k_privategame_default
- "The private-game state the server returns to on a rules/map reset" -> src/world.c:1088 `RegisterCvarEx("k_privategame_default", "0"); // what to set it to when resetting map` -> MATCH
- "During the rules-reset routine, if the current private-game state differs from this value and private-game voting is enabled (k_privategame_voteable), the server toggles private game to match this value" -> src/commands.c:4863 `if ((is_private_game() != private_game_by_default()) && private_game_voteable())` + commands.c:4865 `private_game_toggle(private_game_by_default());` (execute_rules_reset commands.c:4851; private_game_by_default()=cvar("k_privategame_default") vote.c:1617; private_game_voteable()=cvar("k_privategame_voteable") vote.c:1612) -> MATCH
- "0 = default to public game on reset, non-zero = default to private game on reset" -> src/world.c:1088 `RegisterCvarEx("k_privategame_default", "0");` (toggle target = private_game_by_default() value, non-zero -> private) -> MATCH
WI-2: n/a (RegisterCvarEx default "0" matches "0 = default to public"; no access-class clause)

RESULT | ktx:cvar:k_race_countdown | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Init from cvar at run-arm (race.c:2060 in race_start), change-command accepts strictly 0<rcd<6 (race.c:283) else keeps previous (race.c:289 no fset), seconds unit confirmed by adjacent G_bprint, default 2 registered.
### ktx:cvar:k_race_countdown
- "Length, in seconds, of the countdown before a race run starts" -> src/race.c:2060 `race.cd_cnt = cvar("k_race_countdown");` (race.c:2057 `race.status = raceCD;`) -> MATCH
- "When a run is armed the race countdown timer is initialised from this value" -> src/race.c:2060 `race.cd_cnt = cvar("k_race_countdown");` (inside race_start() race.c:2041) -> MATCH
- "the in-race countdown-change command, which only accepts new values strictly between 0 and 6 seconds (values outside that range are rejected and the previous setting is kept)" -> src/race.c:283 `if ((rcd < 6) && (rcd > 0))` then race.c:285 `cvar_fset("k_race_countdown", (int)rcd);` else src/race.c:289 `G_sprint(self, 2, "%s still %s\n", redtext("race countdown"), dig3(rcd - t));` (no fset on reject; RaceCountdownChange guarded race.c:278 `if (match_in_progress || !isRACE() || race_is_started())`) -> MATCH (open interval (0,6); reject path keeps prior)
- "Unit: seconds" -> src/race.c:286 `G_bprint(2, "%s %s %s\n", redtext("Race countdown length set to"), dig3(rcd), redtext("seconds"));` -> MATCH
WI-2: n/a (RegisterCvarEx default "2" world.c:913; description makes no explicit default claim; no access-class clause)

RESULT | ktx:cvar:k_race_simultaneous | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=3 | race_simultaneous()=race_match_mode()||cvar (race.c:5024); true-branch makes every race_ready queued player active (race.c:2077-2088), false-branch pulls one from line (race.c:2090-2106); default 0 registered.
### ktx:cvar:k_race_simultaneous
- "In race mode, controls whether queued players race one at a time or all together" -> src/race.c:5024 `return (race_match_mode() || cvar(RACE_SIMULTANEOUS_CVAR));` (race_simultaneous(); consumed race.c:2077 in race_start()) -> MATCH
- "When 0, players take turns: each ready racer runs the course alone, others wait in the queue" -> src/race.c:2094 `r = race_get_from_line();` + race.c:2097 `race_make_active_racer(r, s);` + race.c:2099 `n = race_set_next_in_line();` (else-branch when !race_simultaneous()) -> MATCH
- "When 1 (or whenever race-match mode is active), every ready player in the queue is made an active racer and they all race the course simultaneously" -> src/race.c:2081 `for (r = world; (r = find_plr(r));)` + race.c:2083 `if ((r->ct == ctPlayer) && r->race_ready)` + race.c:2085 `race_make_active_racer(r, s);` (true-branch of race_simultaneous() = race_match_mode()||cvar) -> MATCH ("or whenever race-match mode is active" = race_match_mode() disjunct race.c:5024)
WI-2: n/a (RegisterCvarEx default "0" world.c:922 matches "When 0 ... take turns"; no access-class clause)

RESULT | ktx:cvar:k_rocketarena | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | isRA()=isDuel()&&cvar (arena.c:132, comment "modificator of duel"); winner-stays queue cycling (arena.c:298/315, 549-578), line-leader/roles managed (arena.c:177-188,219-222,603-611); all RA mechanics gated `if(!isRA())return`.
### ktx:cvar:k_rocketarena
- "When enabled (non-zero) and the server is running a duel, turns the duel into Rocket Arena" -> src/arena.c:132 `return (isDuel() && cvar("k_rocketarena"));` (isRA(), arena.c:130, comment arena.c:129 `// ra is just modificator of duel`) -> MATCH (requires isDuel() AND non-zero cvar)
- "instead of a single 1v1, a winner-stays queue is used -- the round winner remains in the arena" -> src/arena.c:315 `ra_in_que(loser); // move to que loser` + arena.c:316 `setfullwep(winner);` (converse arena.c:298 `ra_in_que(winner)`) -> MATCH
- "the next challenger from the spectator/queue line comes in to fight" -> src/arena.c:572 `if (!loser && (loser = ra_que_first()))` + arena.c:576 `SetLoser(loser);` + arena.c:577 `k_respawn(loser, true);` -> MATCH
- "with winner/loser/line-leader roles managed automatically ... Has no effect outside duel mode" -> src/arena.c:544 `if (!isRA() || match_over)` (guard returns when !isRA(); roles arena.c:177 raWinner / 182 raLoser / 611 "is next in line"; ~54 isRA() gates) -> MATCH (no effect outside duel because isRA() false unless isDuel())
WI-2: n/a (RegisterCvar bare = default 0 world.c:979; "When enabled (non-zero)" -- no explicit default claim; no access-class clause)

RESULT | ktx:cvar:k_spw | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=8 | All 6 enum names match respawn_model_name() exactly (g_utils.c:2663-2688) and value range -1..4 enforced; but "Higher KTX modes add anti-telefrag" is imprecise -- the push-away/spawn-safety anti-telefrag is keyed to mode 1 (KT SpawnSafety) and the baseline nearby-player exclusion applies to all modes>=0; same-spawn-avoidance does escalate with mode (2/3/4). One clause narrower/differently-keyed than "higher modes" implies.
### ktx:cvar:k_spw
- "-1 = pre-qtest non-random respawns" -> src/g_utils.c:2667 `case -1:` / g_utils.c:2668 `return "pre-qtest nonrandom respawns";` (behavior client.c:1063 `if (k_spw == -1)`) -> MATCH
- "0 = normal QuakeWorld respawns" -> src/g_utils.c:2671 `return "Normal QW respawns";` -> MATCH
- "1 = Kombat Teams spawn-safety" -> src/g_utils.c:2674 `return "KT SpawnSafety";` (behavior client.c:1167 `if (!match_in_progress || k_spw == 1 ...)` -> nearby players pushed away, client.c:1210 `setorigin(thing, PASSVEC3(v2));`) -> MATCH
- "2 = Kombat Teams respawns" -> src/g_utils.c:2677 `return "Kombat Teams respawns";` -> MATCH
- "3 = KTX respawns" -> src/g_utils.c:2680 `return "KTX respawns";` -> MATCH
- "4 = KTX2 respawns" -> src/g_utils.c:2683 `return "KTX2 respawns";` -> MATCH
- "[valid set / cycling]" -> src/commands.c:2678 `int k_spw = bound(-1, cvar("k_spw"), 4);` + commands.c:2685 `if (++k_spw > 4)` + commands.c:2687 `k_spw = -1;` (range -1..4 enforced by spawn-cycle command) -> MATCH
- "Higher KTX modes add anti-telefrag and same-spawn-avoidance logic" -> src/client.c:1113 `if (!(((k_spw == 2) || (k_spw == 3) || (k_spw == 4)) && (match_in_progress == 2) && (thing->k_1spawn < g_globalvars.time)))` + src/client.c:1300 `// k_spw 4 feature, recheck spawn poit second time` + src/client.c:1167 `if (!match_in_progress || k_spw == 1 || (k_spw == 2 && !k_checkx))` -> MISMATCH(same-spawn-avoidance genuinely escalates with mode 2/3/4 and again at 4; but "anti-telefrag" is not a "higher mode" property -- the explicit push-away safety is gated on k_spw==1 (lowest non-trivial mode, "KT SpawnSafety"), and the baseline "spots without players nearby" exclusion applies to every mode>=0 client.c:1076-1141. No enforcing line keys anti-telefrag to higher mode number -- name/concept inference, not a higher-mode-gated branch)
WI-2: n/a (RegisterCvar bare = default 0 world.c:856 -> "Normal QW respawns"; description makes no explicit default claim; no access-class clause)

<!-- ROUND ACCEPT SUMMARY: 12 waves accepted (01b,02,03,04,05c,06,07,08b,09,10,11,12) = 61 batch rows, each canary-gated + orchestrator re-grepped. Re-dispatches: 01->01b (GATE 2: Init_cmds CF_SPC_ADMIN->CF_SPECTATOR missed); 05->05b (GATE 1: k_teamoverlay false-negative TRACED-CLEAN) ->05c (GATE 2: laststats parenthetical dropped/over-accepted); 08->08b (GATE 1: k_teamoverlay false-negative TRACED-CLEAN). Canary ground truth held across all accepted waves: autotrack->C-FIX x4 (01b,04,07,10), k_teamoverlay->C-NEAR-MISS x4 (02,05c,08b,11), k_yawnmode->TRACED-CLEAN x4 (03,06,09,12). -->

## FINAL TALLY -- batch 08 (BATCH_ID 8, bucket 7): 61 batch rows, ALL waves canary-gated + orchestrator re-grepped

- Waves: 12 accepted (01b,02,03,04,05c,06,07,08b,09,10,11,12). Re-dispatches: 4 runs across 3 row-sets -- wave 01->01b, wave 05->05b->05c (two re-dispatches), wave 08->08b.
- HARD GATE 1 (canary): every accepted wave's injected canary matched ground truth. Rejections on GATE 1: wave 05 + wave 08 (both k_teamoverlay false-negatived TRACED-CLEAN, expected C-NEAR-MISS -- the "correct-by-accident scope" invisible-class miss; reproduced the batch-01 wave-02 failure mode). Canary ground truth held perfectly across all 12 accepted waves: autotrack->C-FIX x4, k_teamoverlay->C-NEAR-MISS x4, k_yawnmode->TRACED-CLEAN x4.
- HARD GATE 2 (orchestrator re-grep): every accepted wave independently re-grepped (>=1 flagged wrong-clause line + >=1 clean load-bearing clause; all-clean waves double-checked on 2-3 load-bearing clauses + the canary basis). Rejections on GATE 2: wave 01 (10on10/1on1 false-positive WI2-FIX -- subagent cited DoCommand:1091 but missed the Init_cmds:1448-1451 CF_SPC_ADMIN|=CF_SPECTATOR startup promotion; the admin-spectator access claims are CORRECT) and wave 05b (laststats over-accepted TRACED-CLEAN -- dropped the parenthetical "same tables shown automatically when a game ends" equivalence clause; the auto path MatchEndStats() differs from the /laststats "overhauled" MatchEndStatsTables(), no enforcing equivalence). All re-greps held on the accepted runs.

Classification (61 rows, canaries excluded):
- TRACED-CLEAN: 53
- C-NEAR-MISS: 4  -- 13fav_go, laststats, k_pow_p, k_spw
- C-FIX: 4  -- 18fav_go, 3fav_go, shownick, k_ctf_based_spawn
- WI2-FIX: 0
- flavour-C-positive (C-NEAR-MISS + C-FIX): 8 / 61 = ~13.1% (consistent with the calibration random-fleet probe ~14% and batch-01 ~14.3%)
- wi2-positive: 0 (the only "Default X" claims -- k_freshteams_sweep_sng_ammo "Default 6" and k_hoonymode_prevmap "default empty" -- both VERIFIED correct against the registered default)

Flagged set for B4 re-synth (operator-gated, NOT started here -- C4):
- C-FIX (wrong clause vs enforcing line): 18fav_go, 3fav_go, shownick, k_ctf_based_spawn
- C-NEAR-MISS (clause untraceable on the feature's own path): 13fav_go, laststats, k_pow_p, k_spw

Operator-attention notes (systemic patterns + PROC-1 residuals surfaced, not absorbed):
- **Init_cmds CF promotion is a two-way trap (methodology, fleet-wide).** The cmds[] table flags are PRE-promotion; Init_cmds (commands.c:1443-1456) adds CF_SPC_ADMIN->CF_SPECTATOR, CF_PLR_ADMIN->CF_PLAYER, CF_MATCHLESS_ONLY->CF_MATCHLESS at startup. Wave 01 false-FLAGGED 10on10/1on1 by missing it; batch-01 verified the same for 3on3. Any access-class judgment on a CF_*_ADMIN command MUST apply the promotion first. Recommend folding this into the standing V-pass / re-synth prompt for all remaining batches.
- **fav_add vs favx[] systemic (fav_go family).** 3fav_go (C-FIX) + 18fav_go (C-FIX) + 13fav_go (C-NEAR-MISS) all hinge on the same root defect: descriptions name `fav_add` (writes self->fav[], the auto-list read by fav_next) as a slot-list populator, but the Nfav_go family reads self->favx[] populated only by favN_add/favx_add. Same family defect batch-01 found (20fav_go). A B4 cohort fix; consistent split by exact wording (specific wrong name/array = C-FIX; loose "fav-add commands" = C-NEAR-MISS).
- **k_teamoverlay "not in duel" is a reproducible canary-class weak spot.** Two of two k_teamoverlay-canary waves in the un-hardened Round B (05, 08) false-negatived it TRACED-CLEAN (matches batch-01 wave 02). The anti-rationalization-scope block fixed it (05c, 08b, 11 all correctly C-NEAR-MISS). The "correct-by-accident scope" pattern (mode-exclusivity inference with no own-path guard) needs the explicit prompt block in every batch.
- **k_ctf_based_spawn (C-FIX) -- guarded auto-force.** The "auto-forced to 1 on sparse maps" clause is true only from default 0; world.c:622 `!cvar(...)` guard means a pre-set value 2 is never rewritten and its spawn path stays live. B4 should re-scope the clause to "forced from the default".
- **k_spw / laststats / k_pow_p PROC-1 residuals.** k_spw: anti-telefrag is keyed to mode 1, not "higher modes"; same-spawn-avoidance does escalate -- B4 should split the conflated clause. laststats: the "(same tables shown automatically)" parenthetical equates two different functions (MatchEndStats vs the overhauled MatchEndStatsTables); B4 should hedge or drop the equivalence. k_pow_p: "held pentagrams not dropped on death" is incidentally true (players never drop pents at all) but not k_pow_p-enforced; B4 should drop the parenthetical or re-anchor it to the pickup gate.

C4 holds: nothing applied, no L1 row mutated, no re-synth run. This ledger is the Stage-1 input for the operator-gated B4 step.








