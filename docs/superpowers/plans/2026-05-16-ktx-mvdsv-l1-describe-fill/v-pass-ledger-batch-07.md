# V-pass Stage-1 ledger -- BATCH 07 (D7 B5, 2026-05-19)

Strided bucket 6 of the F-V1 9-way `md5(canonical_id)` partition. Oracle
`/tmp/ktx-src-67253dc9` == `1.47-2-g67253dc` (HARD GATE Step-1 passed,
byte-identical to synthesis source). 72 batch rows (the 3 canary controls
autotrack/k_teamoverlay/k_yawnmode are NOT counted here -- controls only).
Read-only: no DB write, no description edit, no re-synth (C4).

Execution: 15 waves x (5 batch + 1 hidden rotating canary), read-only
Opus-MAX sub-agents. HARD GATE 1 (canary verdict == ground truth) + HARD
GATE 2 (orchestrator independent re-grep of >=1 flagged + >=1 clean per
wave). 3 waves rejected and re-dispatched: wave 3 (HARD GATE 2 -- the
sub-agent declared STUFFCMD_IGNOREINDEMO UNTRACEABLE having grepped only
src/, missing the `#define` at include/g_syscalls.h:57) -> 3r; wave 5 and
wave 11 (HARD GATE 1 -- k_teamoverlay canary returned TRACED-CLEAN vs
ground-truth C-NEAR-MISS, the correct-by-accident r42 shortcut) -> 5r /
11r with sharpened prompts + rotated blind autotrack canary. All
re-dispatches passed both gates.

Tally: 72 rows -- TRACED-CLEAN 62, C-NEAR-MISS 2, C-FIX 8, WI2-FIX 0.
flavour-C-positive 10/72 = 13.9% (consistent with the ~14% fleet base
rate). flagged: ktx:command:berzerk, ktx:command:commands,
ktx:command:dlist, ktx:command:fill:frogbot:std, ktx:command:forcebreak,
ktx:command:-scores, ktx:command:summary:frogbot:editor,
ktx:command:race_countdown_up, ktx:command:removeitem,
ktx:cvar:k_matchless_max_idle_time.

---

RESULT | ktx:command:14fav_go | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Spectator-only fav-slot recall; every clause (CF_SPECTATOR, fav14_add->favx_add(14), all 3 messages, numbered family, favx/fav independence) maps to an enforcing line.
### ktx:command:14fav_go
- "Spectator-only command" -> src/commands.c:879 `{ "14fav_go", DEF(xfav_go), 14, CF_SPECTATOR, CD_14FAV_GO },` + DoCommand src/commands.c:1091 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) { return DO_WRONG_CLASS;` and 1106 player path returns DO_WRONG_CLASS (no CF_PLAYER) -> MATCH
- "Switches your spectator POV to track the player ... slot 14" -> src/commands.c:5856 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p));` with p=world+self->favx[13] -> MATCH
- "the slot set by fav14_add while tracking that player" -> src/commands.c:859 `{ "fav14_add", DEF(favx_add), 14, CF_SPECTATOR, CD_FAV14_ADD },` + 5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH
- "If slot 14 is empty it prints \"fav go: slot 14 is not defined\"" -> src/commands.c:5835 `G_sprint(self, 2, "fav go: \220slot %d\221 is not defined\n", (int)fav_num);` (guarded by pl_num<1 at 5833) -> MATCH
- "if the saved player is no longer connected it prints \"fav go: slot 14 can't find player\"" -> src/commands.c:5844 `G_sprint(self, 2, "fav go: \220slot %d\221 can't find player\n", (int)fav_num);` (guarded by p->ct != ctPlayer at 5842) -> MATCH
- "if you are already tracking that player it prints \"fav go: already observing...\"" -> src/commands.c:5851 `G_sprint(self, 2, "fav go: already observing...\n");` (guarded by goalentity==p at 5849) -> MATCH
- "One of a numbered family 1fav_go..20fav_go, each recalling its own slot" -> src/commands.c:866-885 `{ "1fav_go", DEF(xfav_go), 1, ... } ... { "20fav_go", DEF(xfav_go), 20, ... }` -> MATCH
WI-2: n/a

RESULT | ktx:command:19fav_go | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Spectator-only slot recall; slot-fill via fav19_add, slots 1-20 table extent, favx-vs-fav independence, all messages enforced.
### ktx:command:19fav_go
- "Switches the spectator's point of view to track the player saved in favourite slot 19" -> src/commands.c:884 `{ "19fav_go", DEF(xfav_go), 19, CF_SPECTATOR, CD_19FAV_GO },` + 5831 `pl_num = self->favx[(int)fav_num - 1];` + 5856 `stuffcmd_flags(... "track %d\n", GetUserID(p));` -> MATCH
- "Spectator command (spectator point of view)" -> src/commands.c:1091 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) { return DO_WRONG_CLASS;` -> MATCH
- "Slots are filled beforehand with the slot-based 'fav add' command while observing a player" -> src/commands.c:5730 `G_sprint(self, 2, "fav add: %s added to \220slot %d\221\n", goal->netname, (int)fav_num);` + 5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH
- "one player per numbered slot, slots 1-20" -> src/commands.c:846-865 `{ "fav1_add", DEF(favx_add), 1, ... } ... { "fav20_add", DEF(favx_add), 20, ... }` -> MATCH
- "If slot 19 is empty it prints \"slot 19 is not defined\"" -> src/commands.c:5835 `G_sprint(self, 2, "fav go: \220slot %d\221 is not defined\n", (int)fav_num);` -> MATCH
- "if that player has left it prints \"can't find player\", and it does nothing if the spectator is already tracking that player" -> src/commands.c:5844 `... "fav go: \220slot %d\221 can't find player\n" ...` and 5849-5854 `if (PROG_TO_EDICT(self->s.v.goalentity) == p) { G_sprint(self, 2, "fav go: already observing...\n"); return; }` -> MATCH
- "This slot-based favourites set is independent of the 'fav_add'/'fav_next' rotation list" -> include/progs.h:1009-1010 `int favx[MAX_CLIENTS]; // ... favX_add/Xfav_go commands` and `int fav[MAX_CLIENTS]; // ... fav_add/next_fav commands` (xfav_go reads favx[] at commands.c:5831, fav_next reads fav[] at 5793) -> MATCH
WI-2: n/a

RESULT | ktx:command:2on2 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=12 | Every preset cvar value + comment matches _2on2_um_init verbatim; config-exec chain, k_free_mode/k_allowed_free_modes gating, CF flags, matchtag all traced; only still-true loose gloss on "exactly 2 teams".
### ktx:command:2on2
- "4 max players (maxclients/k_maxclients 4)" -> src/commands.c:4273-4274 `"maxclients 4\n" // 2on2 = 4 players` `"k_maxclients 4\n" // 2on2 = 4 players` -> MATCH
- "a 10-minute round timelimit" -> src/commands.c:4275 `"timelimit 10\n" // 10 minute rounds` -> MATCH
- "time-based 3-minute overtime (k_overtime 1, k_exttime 3)" -> src/commands.c:4278-4279 `"k_overtime 1\n" // time based` `"k_exttime 3\n" // overtime 3mins` -> MATCH
- "teamplay 2 (teammates and self take damage)" -> src/commands.c:4276 `"teamplay 2\n" // hurt teammates and yourself` -> MATCH
- "deathmatch 3 (weapons stay on pickup)" -> src/commands.c:4277 `"deathmatch 3\n" // weapons stay` -> MATCH
- "powerups enabled (k_pow 1)" -> src/commands.c:4280 `"k_pow 1\n" // use powerups` -> MATCH
- "exactly 2 teams (k_lockmin 1, k_lockmax 2, k_membercount 1)" -> src/commands.c:4281-4283 `"k_membercount 1\n" ... "k_lockmin 1\n" ... "k_lockmax 2\n"` -> MATCH (values+comments exact; "exactly 2" still-true loose gloss, traceable)
- "execs any configs/usermodes/2on2/ override configs" -> src/commands.c:4809 `cfg_name = va("configs/usermodes/%s/default.cfg", um);` guarded by can_exec at 4817 -> MATCH
- "and the per-map usermode configs" -> src/commands.c:4823 `cfg_name = va("configs/usermodes/%s.cfg", mapname);` and 4830 `cfg_name = va("configs/usermodes/%s/%s.cfg", um, mapname);` -> MATCH
- "Restricted to players and spectator-admins (CF_PLAYER | CF_SPC_ADMIN)" -> src/commands.c:810 `{ "2on2", DEF(UserMode), 2, CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS, CD_2ON2 },` + DoCommand 1106/1096 -> MATCH
- "subject to k_free_mode access control and k_allowed_free_modes gating" -> src/commands.c:4634 `int k_free_mode = (k_matchLess ? 5 : cvar("k_free_mode"));` + 4723 `else if (!check_perm(self, k_free_mode)) { return; }` + 4730 `if (!(um_list[(int)umode].um_flags & k_allowed_free_modes))` -> MATCH
- "accepts an optional matchtag argument" -> src/commands.c:4670 `trap_CmdArgs(matchtag, sizeof(matchtag));` + 4844 `UserMode_SetMatchTag(matchtag);` (CF_PARAMS at 810) -> MATCH
WI-2: n/a

RESULT | ktx:command:8fav_go | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Spectator command, slot-8 recall via xfav_go(8), all three messages enforced verbatim, slots filled by fav8_add->favx_add.
### ktx:command:8fav_go
- "Spectator command: switch to tracking (spectating) the player saved in favourite slot 8" -> src/commands.c:873 `{ "8fav_go", DEF(xfav_go), 8, CF_SPECTATOR, CD_8FAV_GO },` + 5831 `pl_num = self->favx[(int)fav_num - 1];` + 5856 `stuffcmd_flags(... "track %d\n", GetUserID(p));`; spectator-only via DoCommand 1091/1106 -> MATCH
- "If slot 8 is empty it reports \"fav go: slot 8 is not defined\"" -> src/commands.c:5835 `G_sprint(self, 2, "fav go: \220slot %d\221 is not defined\n", (int)fav_num);` -> MATCH
- "if the saved player is no longer in the game it reports \"fav go: slot 8 can't find player\"" -> src/commands.c:5842-5844 `if (p->ct != ctPlayer) { G_sprint(self, 2, "fav go: \220slot %d\221 can't find player\n", (int)fav_num);` -> MATCH
- "if you are already tracking that player it reports \"fav go: already observing...\"" -> src/commands.c:5849-5851 `if (PROG_TO_EDICT(self->s.v.goalentity) == p) { G_sprint(self, 2, "fav go: already observing...\n");` -> MATCH
- "Favourite slots are populated by the corresponding fav add commands" -> src/commands.c:853 `{ "fav8_add", DEF(favx_add), 8, CF_SPECTATOR, CD_FAV8_ADD },` + 5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH
WI-2: n/a

RESULT | ktx:command:berzerk | C-FIX | flavourC=1 | wi2=0 | clauses=4 | "Prints the new state to the issuer" is wrong -- cvar_toggle_msg uses G_bprint server-wide broadcast, not issuer-only. Flip-k_bzk, match-in-progress-ignored, CF_PLAYER|CF_SPC_ADMIN access all trace correctly.
### ktx:command:berzerk
- "Toggles Berzerk mode on the server by flipping the k_bzk cvar" -> src/commands.c:3249 `cvar_toggle_msg(self, "k_bzk", redtext("Berzerk mode"));` + src/g_utils.c:2211 `i = !cvar(cvarName);` + 2218 `trap_cvar_set_float(cvarName, (float) i);` -> MATCH
- "prints the new 'Berzerk mode on/off' state to the issuer" -> src/g_utils.c:2215 `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg);` -> MISMATCH(G_bprint is a server-wide broadcast to ALL players, not "to the issuer"; announced text is "<netname> enables/disables Berzerk mode", not an issuer-private readout)
- "ignored while a match is in progress (it only takes effect in the pre-match / matchless state)" -> src/commands.c:3244-3247 `if (match_in_progress) { return; }` -> MATCH
- "It is a player command but, during a match, restricted to spectator-admins" -> src/commands.c:956 `{ "berzerk", ToggleBerzerk, 0, CF_PLAYER | CF_SPC_ADMIN, CD_BERZERK },` + DoCommand 1106 (player via CF_PLAYER) and 1096 `if ((cmds[icmd].cf_flags & CF_SPC_ADMIN) && !is_adm(self))` -> MATCH (access classes right; "during a match" qualifier imprecise but named classes correct)
WI-2: n/a

RESULT | ktx:command:carena | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=17 | Every preset clause maps to a verbatim line in carena_um_init; common-reset-first ordering enforced at the UserMode readcmd sequence.
### ktx:command:carena
- "Applies the Clan Arena game-mode preset" -> src/commands.c:4799 `trap_readcmd(um_list[(int)umode].initstring, buf, sizeof(buf));` (carena at commands.c:824 -> UserMode -> carena_um_init) -> MATCH
- "internal name 'ca'" -> src/commands.c:4552 `{ "ca", "Clan Arena", carena_um_init, UM_4ON4, 0 },` -> MATCH
- "Enables clan arena (k_clan_arena 1)" -> src/commands.c:4488 `"k_clan_arena 1\n" // enable clan arena` -> MATCH
- "9 rounds per series (k_clan_arena_rounds 9)" -> src/commands.c:4489 `"k_clan_arena_rounds 9\n"` -> MATCH
- "no respawns within a round (k_clan_arena_max_respawns 0)" -> src/commands.c:4490 `"k_clan_arena_max_respawns 0\n"` -> MATCH
- "sets teamplay 4 and deathmatch 5 (base mode)" -> src/commands.c:4492-4493 `"teamplay 4\n" ... "deathmatch 5\n"` -> MATCH
- "no timelimit (timelimit 0, k_overtime 0)" -> src/commands.c:4494 `"timelimit 0\n"` + :4498 `"k_overtime 0\n"` -> MATCH
- "caps the server at 8 players (maxclients/k_maxclients 8)" -> src/commands.c:4495-4496 `"maxclients 8\n" ... "k_maxclients 8\n"` -> MATCH
- "disables powerups (k_pow 0)" -> src/commands.c:4497 `"k_pow 0\n"` -> MATCH
- "and pack drops (dp 0)" -> src/commands.c:4491 `"dp 0\n" // don't drop packs` -> MATCH
- "strips items off the map (k_noitems 1)" -> src/commands.c:4505 `"k_noitems 1\n"` -> MATCH
- "uses safety spawns (k_spw 1)" -> src/commands.c:4501 `"k_spw 1\n" // KT Safety spawns` -> MATCH
- "scores 1 frag per 100 damage dealt (k_dmgfrags 1)" -> src/commands.c:4502 `"k_dmgfrags 1\n"` -> MATCH
- "enables the team overlay" -> src/commands.c:4503 `"k_teamoverlay 1\n"` -> MATCH
- "allows up to 2 teams" -> src/commands.c:4507 `"k_lockmax 2\n"` -> MATCH
- "sets the internal game mode to k_mode 2" -> src/commands.c:4508 `"k_mode 2\n"` -> MATCH
- "The shared common reset runs first" -> src/commands.c:4796 `trap_readcmd(common_um_init, buf, sizeof(buf));` (before initstring at :4799) -> MATCH
WI-2: n/a

RESULT | ktx:command:clearpathflag:frogbot:editor | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Editor-mode gating enforced by FrogbotsCommand table selection; all do-nothing branches and prints map to FrogbotClearPathFlag.
### ktx:command:clearpathflag:frogbot:editor
- "Frogbot waypoint-editor command (available only in editor mode)" -> src/bot_commands.c:2386 `FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands;` (clearpathflag in editor_commands[] :2344) -> MATCH
- "Clears the given routing flag(s) from the path that runs from the saved marker to the marker nearest the player" -> src/bot_commands.c:1681 `saved_marker->fb.paths[source_to_target_path].flags &= ~flags;` -> MATCH
- "with no flag argument it prints the valid path-flag options" -> src/bot_commands.c:1670 `G_sprint(self, PRINT_HIGH, "Provide path flags: " FROGBOT_PATH_FLAG_OPTIONS "\n");` (guard argc<3 :1668) -> MATCH
- "reports the path's remaining flags after clearing" -> src/bot_commands.c:1682 `G_sprint(self, PRINT_HIGH, "Path flags cleared, now: %s\n", EncodeMarkerPathFlags(...));` -> MATCH
- "Does nothing if there is no marker nearby" -> src/bot_commands.c:1663 `G_sprint(self, PRINT_HIGH, "No marker nearby\n");` (return :1665, guard nearest==NULL :1661) -> MATCH
- "no path links the saved marker to the nearest marker" -> src/bot_commands.c:1693 `G_sprint(self, PRINT_HIGH, "No path linked to add flag\n");` -> MATCH
- "the supplied flag string is invalid" -> src/bot_commands.c:1687 `G_sprint(self, PRINT_HIGH, "Path flags invalid, options are %s\n", FROGBOT_PATH_FLAG_OPTIONS);` -> MATCH
- "Usage: clearpathflag <flags>" -> src/bot_commands.c:2344 `{ "clearpathflag", FrogbotClearPathFlag, "Clears flag on a path between two markers" },` -> MATCH
WI-2: n/a

RESULT | ktx:command:cmdslist_dl | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=11 | Every batch/skip/re-invoke/print clause enforced in cmdslist_dl; not-aliasable + hidden-from-listing enforced by CF_NOALIAS and CD_NODESC, server-to-client via stuffcmd.
### ktx:command:cmdslist_dl
- "Internal client-bootstrap command (server-to-client)" -> src/commands.c:1401 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "alias %s cmd %03d%s\n", name, (int)i, params);` -> MATCH
- "callable only via /cmd cmdslist_dl, not aliasable" -> src/commands.c:700 `CF_BOTH | CF_MATCHLESS | CF_PARAMS | CF_NOALIAS | CF_CONNECTION_FLOOD` (CF_NOALIAS at :1393) -> MATCH
- "hidden from the commands listing" -> src/commands.c:670 `#define CD_CMDSLIST_DL (CD_NODESC) // skip` (Do_ShowCmds skips :1473) -> MATCH
- "stuffs the client a batch of 'alias <name> cmd NNN' definitions -- one alias per registered KTX command" -> src/commands.c:1401 `stuffcmd_flags(... "alias %s cmd %03d%s\n", name, (int)i, params);` (loop :1382) -> MATCH
- "so the engine's commands become usable as plain client aliases" -> src/commands.c:1401 -> MATCH
- "then re-invokes itself to fetch the next batch until the whole list is sent" -> src/commands.c:1407 `stuffcmd_flags(... "cmd cmdslist_dl %d\n", i);` (guard i<cmds_cnt :1404) -> MATCH
- "finally printing 'Commands loaded'" -> src/commands.c:1414 `G_sprint(self, 2, "Commands loaded\n");` -> MATCH
- "Skips commands not valid for the caller's class" -> src/commands.c:1391 `if (!isValidCmdForClass(i, spc)` -> MATCH
- "commands with no handler" -> src/commands.c:1392 `|| (cmds[i].f == dummy)` -> MATCH
- "and CF_NOALIAS commands" -> src/commands.c:1393 `|| (cmds[i].cf_flags & CF_NOALIAS))` -> MATCH
- "Reports 'cmdslist alredy stuffed' ... and 'cmdslist without arguments' ..." -> src/commands.c:1363 `G_sprint(self, 2, "cmdslist alredy stuffed\n");` + :1371 `G_sprint(self, 2, "cmdslist without arguments\n");` -> MATCH
WI-2: n/a

RESULT | ktx:command:commands | C-FIX | flavourC=1 | wi2=0 | clauses=7 | "admin commands the caller cannot use are omitted" is WRONG: Do_ShowCmds partitions by command admin-ness only, with NO caller-rights check; the admin section is listed to every caller.
### ktx:command:commands
- "Prints to the caller the list of KTX server commands they may use" -> src/commands.c:1503 `G_sprint(self, 2, "%s%s %s\n", redtext(name), dots, cmds[i].description);` -> MATCH
- "split into a common-commands section and an admin-commands section" -> src/commands.c:1509 `Do_ShowCmds(false);` + :1510 `Do_ShowCmds(true);` -> MATCH
- "each labelled for the caller's role (player or spectator)" -> src/commands.c:1499 `(self->ct == ctSpec ? redtext("spectator") : redtext("player")));` -> MATCH
- "Each line shows the command name and its one-line description" -> src/commands.c:1503 -> MATCH
- "commands with no description ... are omitted" -> src/commands.c:1473 `if (strnull(cmds[i].description) || (cmds[i].description == CD_NODESC)) { continue;` -> MATCH
- "commands not valid for the caller's class ... omitted" -> src/commands.c:1478 `if (!isValidCmdForClass(i, self->ct == ctSpec)) { continue;` -> MATCH
- "and admin commands the caller cannot use are omitted" -> src/commands.c:1483 `if (adm_req != isCmdRequireAdmin(i, self->ct == ctSpec)) { continue; }` -> MISMATCH(this only partitions commands into the common vs admin SECTION by the command's own admin-ness; isCmdRequireAdmin tests the command's CF_ flags, NOT the caller -- there is NO is_adm(self) caller-rights check anywhere in Do_ShowCmds, so a non-admin caller is still shown the full admin-commands section)
WI-2: n/a (note: the description's substring-filter clause maps to commands.c:1488 `if (arg_1[0] && !strstr(name, arg_1)) continue;` and is correct -- sub-agent did not enumerate it but it does not change the C-FIX verdict on the admin-omit clause)

RESULT | ktx:command:ctf | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=16 | Every ctf_um_init line plus the two dispatcher guards (ready-team handling, bots-refusal) trace to verbatim enforcing lines; common-reset-first ordering enforced.
### ktx:command:ctf
- "Applies the CTF (capture-the-flag) game-mode preset" -> src/commands.c:4799 `trap_readcmd(um_list[(int)umode].initstring, buf, sizeof(buf));` (ctf at commands.c:815 -> ctf_um_init :4438) -> MATCH
- "Loads the ctf entity-file directory (sv_loadentfiles_dir ctf)" -> src/commands.c:4439 `"sv_loadentfiles_dir ctf\n"` -> MATCH
- "enables airstep (pm_airstep 1)" -> src/commands.c:4440 `"pm_airstep 1\n"` -> MATCH
- "sets teamplay 4 and deathmatch 3 (base mode -- weapons stay)" -> src/commands.c:4445-4446 `"teamplay 4\n" ... "deathmatch 3\n"` -> MATCH
- "caps the server at 16 players (maxclients/k_maxclients 16)" -> src/commands.c:4442-4443 `"maxclients 16\n" ... "k_maxclients 16\n"` -> MATCH
- "runs a 10-minute timelimit with time-based 5-minute overtime" -> src/commands.c:4444 `"timelimit 10\n"` + :4453 `"k_overtime 1\n"` + :4454 `"k_exttime 5\n"` -> MATCH
- "sets discharge mode 2 (no out-of-water discharges)" -> src/commands.c:4447 `"k_dis 2\n" // no out of water discharges in ctf` -> MATCH
- "and spawn type 1" -> src/commands.c:4449 `"k_spw 1\n"` -> MATCH
- "allows 1-2 teams" -> src/commands.c:4451-4452 `"k_lockmin 1\n" ... "k_lockmax 2\n"` -> MATCH
- "sets the internal game mode to k_mode 4" -> src/commands.c:4455 `"k_mode 4\n"` -> MATCH
- "team-based spawns on" -> src/commands.c:4456 `"k_ctf_based_spawn 1\n" // team based spawn` -> MATCH
- "grappling hook off" -> src/commands.c:4457 `"k_ctf_hook 0\n" // hook off` -> MATCH
- "runes off" -> src/commands.c:4458 `"k_ctf_runes 0\n" // runes off` -> MATCH
- "green armor on" -> src/commands.c:4459 `"k_ctf_ga 1\n" // green armor on` -> MATCH
- "The shared common reset runs first" -> src/commands.c:4796 `trap_readcmd(common_um_init, buf, sizeof(buf));` -> MATCH
- "the dispatcher also enforces team-name handling for ready players (and refuses if bots are enabled and the caller is not the server)" -> src/commands.c:4764 `if (p->ready && (!streq(getteam(p), "blue") && !streq(getteam(p), "red")))` + :4697 `if (streq(um, "ctf") && bots_enabled() && !sv_invoked)` -> :4701 `G_sprint(self, PRINT_HIGH, "Disable bots first with %s\n", redtext("/botcmd disable"));` -> MATCH
WI-2: n/a

RESULT | ktx:command:debug:frogbot:std | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Every clause (no-arg thinking dump, match-in-progress rejection of sub-args, goals/door/markers/entity sub-commands, povdmm4 door+YA report, caller-only output) maps to enforcing lines in FrogbotsDebug.
### ktx:command:debug:frogbot:std
- "Frogbot debugging dispatcher; standard bot command set; invoked as 'botcmd debug'" -> src/bot_commands.c:2322 `{ "debug", FrogbotsDebug, "Debugging commands" }` (std_commands[], dispatched 2383/2463) -> MATCH
- "With no sub-argument it dumps the bots' current 'thinking' state to the invoker" -> src/bot_commands.c:496 `if (trap_CmdArgc() == 2) { Bot_Print_Thinking(); }` -> MATCH
- "With a sub-argument (rejected while a match is in progress)" -> src/bot_commands.c:506 `if (match_in_progress) { return; }` -> MATCH
- "'goals' prints the bots' current goal list" -> src/bot_commands.c:511 `if (streq(sub_command, "goals")) { PrintCurrentGoals(); }` -> MATCH
- "'door' on povdmm4 reports the low/high spawn door open/closed state and whether the low/high YA is blocked or available" -> src/bot_commands.c:517 `if (streq(mapname, "povdmm4"))` ... 521 ... 527 -> MATCH
- "'markers' lists every routing marker with its index and classname" -> src/bot_commands.c:546 `G_sprint(self, 2, "%d / %d: %s\n", i, markers[i]->fb.index + 1, markers[i]->classname);` -> MATCH
- "'entity <n>' prints that entity number's classname and origin" -> src/bot_commands.c:560 `G_sprint(self, 2, "%d: %s [%f %f %f]\n", ... PASSVEC3(g_edicts[ent].s.v.origin));` -> MATCH
- "Output is informational text sent to the caller only; it does not change game state" -> src/bot_commands.c:494-620 (all branches G_sprint to self; no state mutation) -> MATCH
WI-2: n/a

RESULT | ktx:command:dlist | C-FIX | flavourC=1 | wi2=0 | clauses=4 | "suppressed when issued from within demo playback" misreads STUFFCMD_IGNOREINDEMO, whose define-comment is "do not put in mvd demo" (excluded from demo RECORDING, not playback-time suppression).
### ktx:command:dlist
- "Lists the demos available on the server" -> src/commands.c:7986 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd demolist %s\n", params_str(1, -1));` -> MATCH
- "it forwards a 'demolist' command (with any arguments passed through) to the underlying MVDSV server" -> src/commands.c:7986 + src/g_utils.c:2610 `char* params_str(int from, int to)` + g_utils.c:898 `trap_stuffcmd(NUM_FOR_EDICT(ed), text, flags);` -> MATCH
- "which returns the demo listing" -> src/commands.c:7986 (server-side reply to forwarded `cmd demolist`) -> MATCH
- "The command is suppressed when issued from within demo playback" -> include/g_syscalls.h:57 `#define STUFFCMD_IGNOREINDEMO ( 1<<0) // do not put in mvd demo` (cf. :58 `#define STUFFCMD_DEMOONLY (1<<1) // put in mvd demo only`) -> MISMATCH(the flag's defined semantic is "exclude this stuffcmd from the recorded MVD demo stream", NOT "block the command when the issuer is in demo playback"; no enforcing site suppresses dlist during playback -- the clause inverts a demo-recording-exclusion flag into a playback-time guard)
WI-2: n/a

RESULT | ktx:command:fav14_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Spectator-class, not-tracking no-op, slot-14 write/overwrite, and 14fav_go POV-snap all map to enforcing lines in favx_add/xfav_go and the CF_SPECTATOR dispatch.
### ktx:command:fav14_add
- "Spectator command." -> src/commands.c:859 `{ "fav14_add", DEF(favx_add), 14, CF_SPECTATOR, ... }` enforced at src/commands.c:1091 / 1106 (class check) -> MATCH
- "Stores the player you are currently tracking into indexed favourite slot 14" -> src/commands.c:1135 dispatch arg=14 -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (progs.h:1009 favx[]) -> MATCH
- "Does nothing unless you are tracking a real player" -> src/commands.c:5723 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)) { ... return; }` -> MATCH
- "the tracked player's identity is written to slot 14 (overwriting any previous occupant)" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (unconditional assignment) -> MATCH
- "14fav_go later snaps your POV to whoever occupies that slot" -> src/commands.c:879 `{ "14fav_go", DEF(xfav_go), 14, ... }` -> 5831 `pl_num = self->favx[(int)fav_num - 1];` + 5856 `stuffcmd_flags(... "track %d\n", GetUserID(p));` -> MATCH
WI-2: n/a

RESULT | ktx:command:fav17_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Identical handler path with arg=17 -> favx[16]; spectator-class, not-tracking no-op, slot-17 overwrite, 17fav_go POV-snap all enforced.
### ktx:command:fav17_add
- "Spectator command." -> src/commands.c:862 `{ "fav17_add", DEF(favx_add), 17, CF_SPECTATOR, ... }` enforced at src/commands.c:1091/1106 -> MATCH
- "Stores the player you are currently tracking into indexed favourite slot 17" -> src/commands.c:1135 dispatch arg=17 -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH
- "Does nothing unless you are tracking a real player" -> src/commands.c:5723 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)) { ... return; }` -> MATCH
- "the tracked player's identity is written to slot 17 (overwriting any previous occupant)" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH
- "17fav_go later snaps your POV to whoever occupies that slot" -> src/commands.c:882 `{ "17fav_go", DEF(xfav_go), 17, ... }` -> 5831 / 5856 -> MATCH
WI-2: n/a

RESULT | ktx:command:fav18_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Identical handler path with arg=18 -> favx[17]; spectator-class, not-tracking no-op, slot-18 overwrite, 18fav_go POV-snap all enforced.
### ktx:command:fav18_add
- "Spectator command." -> src/commands.c:863 `{ "fav18_add", DEF(favx_add), 18, CF_SPECTATOR, ... }` enforced at src/commands.c:1091/1106 -> MATCH
- "Stores the player you are currently tracking into indexed favourite slot 18" -> src/commands.c:1135 dispatch arg=18 -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH
- "Does nothing unless you are tracking a real player" -> src/commands.c:5723 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)) { ... return; }` -> MATCH
- "the tracked player's identity is written to slot 18 (overwriting any previous occupant)" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH
- "18fav_go later snaps your POV to whoever occupies that slot" -> src/commands.c:883 `{ "18fav_go", DEF(xfav_go), 18, ... }` -> 5831 / 5856 -> MATCH
WI-2: n/a

RESULT | ktx:command:fill:frogbot:std | C-FIX | flavourC=1 | wi2=0 | clauses=7 | Fill behavior (maxclients cap, 8/invocation, skill arg, k_fb_skill store) all correct, but the invocation name is "botcmd fill", not "frogbot fill" -- no "frogbot" command/alias exists in src; the name is function-family inference.
### ktx:command:fill:frogbot:std
- "Frogbot subcommand (\"frogbot fill\")" -> src/commands.c:1047 `{ "botcmd", FrogbotsCommand, 0, CF_BOTH | CF_MATCHLESS | CF_PARAMS, CD_BOTCOMMAND }` + bot_commands.c:2319 `{ "fill", FrogbotsFillServer, "Fills the server (max 8 bots at a time)" }` -> MISMATCH(registered parent command is `botcmd`; there is no `"frogbot"` command or alias anywhere in src -- grep for the literal returns 0; in-engine usage strings say `/botcmd`. "frogbot" is inferred from the Frogbots* function family, not an enforcing registration)
- "Adds frogbots to fill the empty client slots up to the server's maxclients" -> src/bot_commands.c:1889 `int max_clients = cvar("maxclients");` + 1906 `for (i = 0; i < min(max_clients - plr_count, 8); ++i)` -> MATCH
- "capped at 8 bots added per invocation" -> src/bot_commands.c:1906 `for (i = 0; i < min(max_clients - plr_count, 8); ++i)` -> MATCH
- "run it again to add more" -> src/bot_commands.c:1906 (per-invocation bounded loop) -> MATCH
- "An optional numeric third argument sets the skill level for the bots added" -> src/bot_commands.c:1894 `if (trap_CmdArgc() >= 3) { ... if (isdigit(temp[0])) skill_level = atoi(temp); }` -> MATCH
- "(and stores it as the current frogbot skill)" -> src/bot_commands.c:1911 `cvar_fset(FB_CVAR_SKILL, skill_level);` -> MATCH
- "without it the bots use the current frogbot skill level" -> src/bot_commands.c:1891 `int skill_level = FrogbotSkillLevel();` -> MATCH
WI-2: n/a

RESULT | ktx:command:forcebreak | C-FIX | flavourC=1 | wi2=0 | clauses=5 | End-match / cancel-countdown / clear-forcedstart branches all correct, but "Restricted to admins who are not playing" is wrong: a playing admin reaches EndMatch(0) on a live match, and CF_PLR_ADMIN dispatches player-admins.
### ktx:command:forcebreak
- "Admin command" -> src/admin.c:719 `if (!is_adm(self) || !match_in_progress) return;` + commands.c:752 `{ "forcebreak", AdminForceBreak, 0, CF_BOTH_ADMIN, CD_FORCEBREAK }` -> MATCH
- "While a match is in progress it terminates the game (running the normal match-end handling)" -> src/admin.c:739 `EndMatch(0);` -> MATCH
- "if a countdown/warmup timer is running it instead cancels that timer" -> src/admin.c:724 `if ((self->ct != ctPlayer) && (match_in_progress == 1)) { k_force = 0; StopTimer(1); return; }` -> MATCH
- "if a forced start is queued but the match has not begun it clears the forced-start standby state" -> src/admin.c:710 `if (is_adm(self) && (self->ct != ctPlayer) && !match_in_progress) { k_force = 0; localcmd("serverinfo status Standby\n"); return; }` -> MATCH
- "Restricted to admins who are not playing (spectator/admin side)" -> src/admin.c:710/724 (`self->ct != ctPlayer` guards ONLY the matchless-clear and countdown-cancel branches); src/admin.c:719 then falls through to :739 `EndMatch(0)` with NO ct!=ctPlayer guard, AND commands.c:1443 `if (cmds[i].cf_flags & CF_PLR_ADMIN) cmds[i].cf_flags |= CF_PLAYER;` (CF_BOTH_ADMIN = CF_PLR_ADMIN|CF_SPC_ADMIN) -> MISMATCH(a *playing* admin can forcebreak a live match and is dispatched via CF_PLR_ADMIN; the "not playing" restriction does not hold for the primary end-match path)
WI-2: n/a

RESULT | ktx:command:forcestart | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=11 | Every refusal condition, the announce, the "Forcestart" status, and the start-sequence spawn map to enforcing lines in AdminForceStart.
### ktx:command:forcestart
- "Admin command" -> src/admin.c:646 `if (match_in_progress || match_over || !is_adm(self)) return;` + commands.c:751 `{ "forcestart", AdminForceStart, 0, CF_BOTH_ADMIN, CD_FORCESTART }` -> MATCH
- "Forces a match to begin without waiting for all players to ready up" -> src/admin.c:691 `k_force = 1;` + 698 `mess->think = (func_t) ReadyThink;` -> MATCH
- "refused if a match is already running or over" -> src/admin.c:646 `if (match_in_progress || match_over || !is_adm(self)) return;` -> MATCH
- "while the server is in practice mode" -> src/admin.c:652 `if (k_practice) { G_sprint(self, 2, "%s\n", redtext("Server in practice mode")); return; }` -> MATCH
- "if the issuing admin is an unreadied player" -> src/admin.c:659 `if ((self->ct == ctPlayer) && !self->ready) { PlayerReady(true); if (!self->ready) { ... return; } }` -> MATCH
- "if a forced start is already pending" -> src/admin.c:671 `if (find(world, FOFCLSN, "mess")) { G_sprint(self, 2, "forcestart already in progress!\n"); return; }` -> MATCH
- "if the start preconditions are not met" -> src/admin.c:680 `if (!isCanStart(self, true)) { G_sprint(self, 2, "Can't issue!\n"); return; }` -> MATCH
- "or if no players are present" -> src/admin.c:687 `if (k_attendees) { ... } else { G_sprint(self, 2, "Can't issue! More players needed.\n"); }` -> MATCH
- "On success it announces the forced start" -> src/admin.c:689 `G_bprint(2, "%s forces matchstart!\n", self->netname);` -> MATCH
- "sets the server status to \"Forcestart\"" -> src/admin.c:693 `localcmd("serverinfo status Forcestart\n");` -> MATCH
- "begins the start sequence" -> src/admin.c:695-699 `mess = spawn(); mess->classname = "mess"; mess->think = (func_t) ReadyThink; ...` -> MATCH
WI-2: n/a

RESULT | ktx:command:freeze | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Toggle, broadcast, and the inert-while-frozen behavior for doors/plats/trains plus the "no effect during match" command guard all map to enforcing lines.
### ktx:command:freeze
- "Toggles the map-freeze state (the k_freeze setting)" -> src/commands.c:3804 `cvar_toggle_msg(self, "k_freeze", redtext("map freeze"));` + g_utils.c:2211/2218 -> MATCH
- "and broadcasts whether it was enabled or disabled" -> src/g_utils.c:2215 `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg);` -> MATCH
- "While enabled and no match is running, moving map entities -- doors ... stay inert" -> src/doors.c:231 `if ((match_in_progress == 1) || (!match_in_progress && cvar("k_freeze"))) { return; }` -> MATCH
- "platforms/lifts" -> src/plats.c:126 `if ((match_in_progress == 1) || (!match_in_progress && cvar("k_freeze"))) { return; }` -> MATCH
- "and trains" -> src/plats.c:364 `if ((match_in_progress == 2) || (!cvar("k_freeze") && !match_in_progress) || k_practice) { self->think = (func_t) train_next; }` -> MATCH
- "stay inert and do not activate" -> src/doors.c:233 `return;` / plats.c:128 `return;` -> MATCH
- "The command has no effect during a match" -> src/commands.c:3799 `if (match_in_progress) { return; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:fresh | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Toggle/broadcast/0-1 flip, the dmm1 gate, and the match-in-progress + race-mode refusals all map to enforcing lines.
### ktx:command:fresh
- "Toggles FreshTeams mode (the k_freshteams server cvar) on or off" -> src/commands.c:7628 `cvar_toggle_msg(self, "k_freshteams", ...);` + g_utils.c:2218 (k_freshteams RegisterCvarEx "0", world.c:894) -> MATCH
- "FreshTeams is the dmm1-based fresh-spawn ruleset" -> src/commands.c:7621 `if (deathmatch != 1) { G_sprint(self, 2, "FreshTeams requires dmm1\n"); return; }` + items.c:812 `int weapon_time = k_freshteams ? cvar("k_freshteams_weapon_time") : 30;` -> MATCH (still-true characterization, traceable to dmm1 gate + effect sites)
- "the command flips it between off (0) and on (1)" -> src/g_utils.c:2211 `i = !cvar(cvarName);` -> MATCH
- "and broadcasts the new state" -> src/g_utils.c:2215 `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg);` -> MATCH
- "It requires dmm1 (deathmatch == 1) to enable" -> src/commands.c:7621 `if (deathmatch != 1) { ... return; }` (deathmatch = cvar("deathmatch") world.c:1558) -> MATCH
- "and refuses to run while a match is in progress" -> src/commands.c:9035 `if (match_in_progress) { ... return false; }` (is_rules_change_allowed, gated at 7615) -> MATCH
- "or while race mode is active" -> src/commands.c:9042 `if (isRACE()) { ... return false; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:infolock | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | every clause maps to a verified enforcing line including the pre-toggle match_in_progress guard and the is_adm check.
### ktx:command:infolock
- "Admin command" -> src/commands.c:930 `{ "infolock", infolock, 0, CF_BOTH_ADMIN, CD_INFOLOCK }` + handler 7214 `if (!is_adm(self)) { ... return; }` -> MATCH
- "toggles who may receive spectator info (specinfo)" -> src/commands.c:7221 `k_spec_info ^= MI_ADM_ONLY;` + 7074 `return ((int)cvar("k_spec_info") & MI_ADM_ONLY);` -> MATCH
- "It flips the admins-only bit of k_spec_info" -> src/commands.c:7221 `k_spec_info ^= MI_ADM_ONLY;` + include/g_consts.h:283 `#define MI_ADM_ONLY ( 1<<1)` -> MATCH
- "when on, the server announces that only admins can receive specinfos; when off, that all spectators can" -> src/commands.c:7224 `if (mi_adm_only()) { G_bprint(2, "Only %s can receive specinfos\n", redtext("admins")); } else { G_bprint(2, "All %s can receive specinfos\n", redtext("spectators")); }` -> MATCH
- "has no effect while a match is in progress" -> src/commands.c:7209 `if (match_in_progress) { return; }` (returns BEFORE the toggle) -> MATCH
WI-2: n/a (CF_BOTH_ADMIN + is_adm(self) handler check both verified)

RESULT | ktx:command:ksound5 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | every clause maps to TeamSay (arg 5); team/CTF gate, KF_KTSOUNDS, non-empty name, per-recipient k_sdir all verified.
### ktx:command:ksound5
- "Sends team audio cue 5 (plays ktsound5.wav)" -> src/commands.c:774 `{ "ksound5", DEF(TeamSay), 5, CF_PLAYER, CD_KSOUND5 }` + 3380 `char *sndname = va("ktsound%d.wav", (int)fsndname);` -> MATCH
- "to your same-team players" -> src/commands.c:3387 `if (streq(getteam(self), getteam(p)))` -> MATCH
- "stuffs a 'play' of ktsound5.wav into the console of every other client on your team" -> src/commands.c:3382 loop + 3391 `stuffcmd(p, "play %s%s\n", ..., sndname);` + 3384 `(p != self)` -> MATCH
- "who has KT sounds enabled (the KF_KTSOUNDS bit in their kf userinfo key)" -> src/commands.c:3385 `(iKey(p, "kf") & KF_KTSOUNDS)` (g_consts.h:245 `#define KF_KTSOUNDS (1)`) -> MATCH
- "and a non-empty name" -> src/commands.c:3384 `!strnull(p->netname)` -> MATCH
- "each recipient's file path honours their own k_sdir sound-directory setting" -> src/commands.c:3389-3391 `char *t1 = ezinfokey(p, "k_sdir"); stuffcmd(p, "play %s%s\n", (strnull(t1) ? "" : va("%s/", t1)), sndname);` -> MATCH
- "Only active in team or CTF games" -> src/commands.c:3384 `(isTeam() || isCTF())` -> MATCH
WI-2: n/a

RESULT | ktx:command:ksound6 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | identical TeamSay handler, arg=6 -> ktsound6.wav; all clauses enforced.
### ktx:command:ksound6
- "Sends team audio cue 6 (plays ktsound6.wav)" -> src/commands.c:775 `{ "ksound6", DEF(TeamSay), 6, CF_PLAYER, CD_KSOUND6 }` + 3380 `char *sndname = va("ktsound%d.wav", (int)fsndname);` -> MATCH
- "to your same-team players" -> src/commands.c:3387 `if (streq(getteam(self), getteam(p)))` -> MATCH
- "stuffs a 'play' of ktsound6.wav into the console of every other client on your team" -> src/commands.c:3382 loop + 3391 + 3384 `(p != self)` -> MATCH
- "who has KT sounds enabled (the KF_KTSOUNDS bit in their kf userinfo key)" -> src/commands.c:3385 `(iKey(p, "kf") & KF_KTSOUNDS)` (g_consts.h:245) -> MATCH
- "and a non-empty name" -> src/commands.c:3384 `!strnull(p->netname)` -> MATCH
- "each recipient's file path honours their own k_sdir sound-directory setting" -> src/commands.c:3389-3391 -> MATCH
- "Only active in team or CTF games" -> src/commands.c:3384 `(isTeam() || isCTF())` -> MATCH
WI-2: n/a

RESULT | ktx:command:lastscoresktx | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Same fn-ptr & flags as `lastscores`; matchup/mode/per-map/grouping/extended/count/empty all traced.
### ktx:command:lastscoresktx
- "a behaviourally identical alias of the lastscores command" -> src/commands.c:900 `{ "lastscoresktx", lastscores, 0, CF_BOTH | CF_MATCHLESS | CF_PARAMS, CD_LASTSCORES }` vs :899 `{ "lastscores", lastscores, 0, CF_BOTH | CF_MATCHLESS | CF_PARAMS, CD_LASTSCORES }` (identical fn ptr + flags) -> MATCH
- "Prints the recorded results ... to the requesting client" -> src/commands.c:7020/7041 `G_sprint(self, 2, ...)` -> MATCH
- "shows the matchup (the two team names, or the two duelers) and the game-mode label" -> src/commands.c:7020-7021 `G_sprint(self, 2, "\220%s %s %s\221 %s\n", e1, redtext("vs"), e2, redtext(lastscores2str(cur)));` -> MATCH
- "followed by the per-map score line" -> src/commands.c:7041 `G_sprint(self, 2, "  %s\n", sc);` -> MATCH
- "consecutive entries with the same matchup and mode are grouped under one header" -> src/commands.c:7016-7022 `if (cur != last || (strneq(le1, e1) || strneq(le2, e2))) { ... }` -> MATCH
- "Passing any argument switches to an extended view" -> src/commands.c:6996 `qbool extended = (trap_CmdArgc() > 1);` -> MATCH
- "that additionally lists each team's members (in team, CTF and CA modes)" -> src/commands.c:7028 `if (extended && ((cur == lsTeam) || (cur == lsCTF) || (cur == lsCA)))` + 7032/7037 -> MATCH
- "Ends with a count of entries found, or reports \"Lastscores data empty\" ..." -> src/commands.c:7051-7060 `if (cnt) { ... "Lastscores: %d entr%s found\n" ... } else { ... "Lastscores data empty\n" ... }` -> MATCH
WI-2: n/a

RESULT | ktx:command:lockmode | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Cycle 0->1->2->0, broadcast, match-block in ChangeLock; 0/1/2 connect semantics enforced in client.c connect gate.
### ktx:command:lockmode
- "Cycles the server connection-lock state one step each invocation (0 -> 1 -> 2 -> 0) by setting the k_lockmode cvar" -> src/commands.c:3346 `int lock = bound(0, cvar("k_lockmode"), 2);` + 3353-3358 `lock++; if (lock > 2) { lock = 0; }` + 3374 `cvar_fset("k_lockmode", lock);` -> MATCH
- "0 = unlocked, anyone may connect" -> src/client.c:1343/1352 (no value-0 block branch) + client.c:2902-2904 `if (!cvar("k_lockmode")) { return; }` -> MATCH
- "1 = teamlock, only players already on an existing team may connect while a game is in progress" -> src/client.c:1352 `else if ((cvar("k_lockmode") == 1) || isCA())` then 1380-1401 ghost/teammate check -> MATCH
- "2 = fully locked, no players may connect while a game is in progress" -> src/client.c:1343-1351 `else if (cvar("k_lockmode") == 2) { ... "Match in progress, server locked" ... return false; }` -> MATCH
- "while a game is in progress" gating for 1 and 2 -> src/client.c:1330 `else if (!match_in_progress || k_matchLess || k_bloodfest) { ... return true; }` -> MATCH
- "The new state is broadcast to everyone" -> src/commands.c:3360/3364/3368 `G_bprint(2, ...)` -> MATCH
- "Has no effect while a match is in progress" -> src/commands.c:3348-3351 `if (match_in_progress) { return; }` -> MATCH
- access (no explicit access clause stated) -> src/commands.c:748 `{ "lockmode", ChangeLock, 0, CF_PLAYER | CF_SPC_ADMIN, CD_LOCKMODE }`; ChangeLock has no internal is_adm gate -> MATCH (description asserts no access class)
WI-2: n/a

RESULT | ktx:command:mctf | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | Every clause enforced in ctf.c:805-847; refuse-conditions, one-way clear, "Already done", broadcast, and matchless carrier-strip+speed-reset all traced.
### ktx:command:mctf
- "In CTF mode ... refuses outside CTF mode ('Can't do this in non CTF mode')" -> src/ctf.c:812 `if (!isCTF()) { G_sprint(self, 2, "Can't do this in non CTF mode\n");` -> MATCH
- "permanently disables both the grappling hook and runes for the current game by clearing the k_ctf_hook and k_ctf_runes cvars" -> src/ctf.c:825 `cvar_fset("k_ctf_hook", 0); cvar_fset("k_ctf_runes", 0);` -> MATCH
- "broadcasts '<name> turn off: hook & runes'" -> src/ctf.c:828 `G_sprint(self, 2, "%s turn off: %s\n", getname(self), redtext("hook & runes"));` -> MATCH
- "It is one-way (disable only, not a toggle)" -> src/ctf.c:825-826 (unconditional set-to-0, no read-back) -> MATCH
- "reports 'Already done' if both are already off" -> src/ctf.c:819 `if (!cvar("k_ctf_hook") && !cvar("k_ctf_runes")) { G_sprint(self, 2, "Already done\n");` -> MATCH
- "refuses while a match is in progress unless the server is in matchless mode" -> src/ctf.c:807 `if (match_in_progress && !k_matchLess) { return; }` -> MATCH
- "in matchless mode it also immediately strips runes from any carrier" -> src/ctf.c:839 `p->ctf_flag -= (p->ctf_flag & (CTF_RUNE_MASK));` (guarded by 831 `if (k_matchLess)` / 834 `if (!cvar("k_ctf_runes"))`) -> MATCH
- "(resetting their speed)" -> src/ctf.c:840 `p->maxspeed = cvar("sv_maxspeed"); // Reset speed` -> MATCH
- "and removes active hooks" -> src/ctf.c:845 `AddHook(false);` + 844 `SpawnRunes(0);` -> MATCH
WI-2: n/a

RESULT | ktx:command:no_lg | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | no_lg re-stuffs `cmd noweapon lg`; all constraints enforced in noweapon() (dmm4-only, not-in-match, server-wide G_bprint announce).
### ktx:command:no_lg
- "Shorthand for /noweapon lg: re-issues the noweapon command with the lg argument on the caller's behalf" -> src/commands.c:5327 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd noweapon lg\n");` -> MATCH
- "toggling the lightning gun between allowed and disallowed for the match" -> src/commands.c:5305 `else if (streq(nwp = "lg", arg_2) || streq("8", arg_2)) { k_disallow_weapons ^= bit = IT_LIGHTNING; }` -> MATCH
- "Subject to the same constraints as noweapon ... not while a match is in progress" -> src/commands.c:5245 `if (match_in_progress) { ... return; }` -> MATCH
- "(deathmatch mode 4 / dmm4 only ...)" -> src/commands.c:5255 `if (deathmatch != 4) { G_sprint(self, 2, "command allowed in %s only\n", redtext("dmm4")); return; }` -> MATCH
- "The change is server-wide and announced to all players" -> src/commands.c:5312 `G_bprint(2, "%s %s %s\n", self->netname, redtext(Allows(!(k_disallow_weapons & bit))), redtext(nwp));` + 5314 `trap_cvar_set_float("k_disallow_weapons", k_disallow_weapons);` -> MATCH
WI-2: n/a

RESULT | ktx:command:pos_angles | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Pos_Set(2) at commands.c:6559; pitch/yaw/roll v_angle write, "*"=keep-current, exactly-3-args usage, 1/sec rate-limit, Pos_Disallowed all traced.
### ktx:command:pos_angles
- "Sets the player's view angles to the three values given as arguments (pitch, yaw, roll)" -> src/commands.c:6596 `case 2: Pos_Save_angles(&pos); Pos_Parse_Set(&(pos.v_angle)); Pos_Set_angles(&pos);` -> MATCH
- "an argument of \"*\" leaves that component unchanged" -> src/commands.c:6551 `if (strneq(arg, "*")) { (*x)[i] = atof(arg); }` -> MATCH
- "Requires exactly three arguments (otherwise a usage message is printed)" -> src/commands.c:6571 `if (trap_CmdArgc() != 4) { G_sprint(self, 2, "Usage: pos_{origin|angles} x1 x2 x3\n..."); return; }` -> MATCH
- "is rate-limited to one position/angle change per second" -> src/commands.c:6579 `if (self->pos_move_time && ((self->pos_move_time + 1) > g_globalvars.time)) { ... return; }` -> MATCH
- "Subject to the server's position-command restrictions (Pos_Disallowed)" -> src/commands.c:6566 `if (Pos_Disallowed()) { return; }` (macro 6406 `(match_in_progress || intermission_running || cvar("sv_paused") || (isRACE() && race.status))`) -> MATCH
WI-2: n/a

RESULT | ktx:command:race_countdown_up | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=4 | Core behavior exact; but "clamped to the open range 1-5" is a near-miss -- RaceCountdownChange REJECTS out-of-range (no change, prints "still X"), it does not clamp/saturate.
### ktx:command:race_countdown_up
- "Increases the race start-countdown length by 1 second (the k_race_countdown cvar)" -> src/commands.c:696 `{ "race_countdown_up", DEF(RaceCountdownChange), 1, ...}` + race.c:276 `float rcd = cvar("k_race_countdown") + t;` + race.c:285 `cvar_fset("k_race_countdown", (int)rcd);` -> MATCH
- "Only takes effect in race mode when no match is in progress and the race has not yet started" -> src/race.c:278 `if (match_in_progress || !isRACE() || race_is_started()) { return; }` -> MATCH
- "the value is clamped to the open range 1-5 seconds" -> src/race.c:283 `if ((rcd < 6) && (rcd > 0)) { cvar_fset(...); ... return; } ... G_sprint(self, 2, "%s still %s\n", redtext("race countdown"), dig3(rcd - t));` -> MISMATCH(not a clamp: out-of-range input is REJECTED, cvar left unchanged, prints "race countdown still <old>"; accepted set is 1..5 so the range is right, but "clamped" mischaracterizes reject-vs-saturate)
- "the new countdown length is broadcast to everyone" -> src/race.c:286 `G_bprint(2, "%s %s %s\n", redtext("Race countdown length set to"), dig3(rcd), redtext("seconds"));` -> MATCH
WI-2: n/a (CF_PLAYER | CF_SPC_ADMIN; registered default k_race_countdown="2" world.c:913; description asserts no default/access class)

RESULT | ktx:command:race_pacemaker | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | no-arg load-or-disable, headstart/trail/jumps/off subcommands, race-mode-only, refused-while-active all traced to enforcing lines.
### ktx:command:race_pacemaker
- "With no argument it loads a recorded run as the pacemaker" -> src/race.c:4355 `race_fropen("%s", race_filename("pos"));` ... 4475 `G_bprint(PRINT_HIGH, "%s sets pacemaker ...")` -> MATCH
- "or disables the pacemaker if one is already loaded" -> src/race.c:4340 `else if (streq(buffer, "off") || ((guide.capture.position_count != 0) && (trap_CmdArgc() == 1))) { ... cvar_fset(RACE_PACEMAKER_ENABLED_CVAR, 0);` -> MATCH
- "'headstart' adjusts the pacemaker's head-start time" -> src/race.c:4304 `if (streq(buffer, "headstart")) { float new_headstart = race_toggle_incr_cvar(RACE_INCR_PARAMS(HEADSTART));` -> MATCH
- "'trail' adjusts (or turns off) the trail resolution" -> src/race.c:4313 `else if (streq(buffer, "trail")) { float new_resolution = race_toggle_incr_cvar(RACE_INCR_PARAMS(RESOLUTION)); ... }` -> MATCH
- "'jumps' toggles the pacemaker jump indicators" -> src/race.c:4329 `else if (streq(buffer, "jumps")) { qbool enabled = !cvar(RACE_PACEMAKER_JUMPS_CVAR); ... cvar_fset(RACE_PACEMAKER_JUMPS_CVAR, enabled ? 1 : 0);` -> MATCH
- "and 'off' disables the pacemaker" -> src/race.c:4340 `else if (streq(buffer, "off") ...) { ...; cvar_fset(RACE_PACEMAKER_ENABLED_CVAR, 0); ... }` -> MATCH
- "Only works in race mode" -> src/race.c:4291 `if (!race_command_checks()) { return; }` (race_command_checks 2953 `if (!isRACE()) { ... return false; }`) -> MATCH
- "and is refused while a race is active" -> src/race.c:4296 `if (race.status) { G_sprint(self, PRINT_HIGH, "Cannot change pacemaker settings while race is active.\n"); return; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:race_set_falsestart | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Every clause maps to an enforcing line in r_falsestart / race_falsestart_mode / read_topscores; access-class player/spectator-admin matches CF_PLAYER|CF_SPC_ADMIN dispatch.
### ktx:command:race_set_falsestart
- "Race-mode setup command (player / spectator-admin)" -> src/commands.c:1018 `{ "race_set_falsestart", r_falsestart, 0, CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS, CD_RFALSESTART }` + commands.c:1448-1450 + race.c:2953 `if (!isRACE()){ ... return false; }` -> MATCH
- "Each invocation cycles the race start mode one step forward and wraps around" -> src/race.c:3185-3190 `race.falsestart++; if ((race.falsestart < raceFalseStartNo) || (race.falsestart >= raceFalseStartMAX)){ race.falsestart = raceFalseStartNo; }` -> MATCH
- "'no falsestart' (racers are frozen at the start until the go signal)" -> src/race.c:753-754 `case raceFalseStartNo: return "no falsestart";` + include/progs.h:1278 -> MATCH
- "'falsestart enabled' (racers may move any time before the go signal)" -> src/race.c:756-757 `case raceFalseStartYes: return "falsestart enabled";` + include/progs.h:1279 -> MATCH
- "Has no effect while a race is running" -> src/race.c:3180-3183 `if (race_is_started()){ return; }` (race.c:2966 `if (race.status){ ... return true; }`) -> MATCH
- "On change it broadcasts the new start mode" -> src/race.c:3192-3193 `G_bprint(2, "%s set race start mode to %s\n", self->netname, redtext(race_falsestart_mode(race.falsestart)));` -> MATCH
- "reloads the stored top scores (which are tracked per start mode)" -> src/race.c:3195 `read_topscores();` + race.c:3602 `race.records[cnt].startmode = atoi(line);` + race.c:1484 -> MATCH
WI-2: n/a

RESULT | ktx:command:removeitem | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=5 | "the dropped item closest to you / only entities flagged as dropped items" is narrower than implied -- ent->dropitem is set ONLY by the `dropitem` spawn command, not by death/backpack drops.
### ktx:command:removeitem
- "Deletes the dropped item closest to you (only entities flagged as dropped items are eligible)" -> src/commands.c:9276 `if (!ent->dropitem){ continue; }` + include/progs.h:1189 `qbool dropitem; // true if placed with "dropitem" command.` + sole setter src/commands.c:9144 `p->dropitem = true;` (dropitem_spawn_item) -> MATCH for the literal scan, but the prose "the dropped item" implies general dropped pickups; the real scope is narrower -- only items placed by the `dropitem` command (no death-drop / backpack sets this flag anywhere in the tree)
- "Prints \"Removed <classname>\" on success" -> src/commands.c:9299-9302 `if (p){ G_sprint(self, 2, "Removed %s\n", p->classname); ent_remove(p); }` -> MATCH
- "or \"Nothing found around\" if no dropped item is nearby" -> src/commands.c:9304-9306 `else { G_sprint(self, 2, "Nothing found around\n"); }` -> MATCH (minor: no proximity cap; still essentially correct)
- "Requires server cheats to be enabled (otherwise it is refused with a message)" -> src/commands.c:9263-9269 `if (strnull(ezinfokey(world, "*cheats"))){ G_sprint(self, 2, "Cheats are disabled ...\n", self->netname); return; }` -> MATCH
- "does nothing while a match is in progress" -> src/commands.c:9258-9261 `if (match_in_progress){ return; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:-scores | C-FIX | flavourC=1 | wi2=0 | clauses=7 | "Repurposes the player's HUD stat fields" is wrong -- sc_stats only drives a G_centerprint scoreboard overlay + MOTD suppression; no health/armor/ammo/STAT_* field is touched.
### ktx:command:-scores
- "Release half of the +scores/-scores press-and-release bind pair" -> src/commands.c:891-892 `{ "+scores", DEF(Sc_Stats), 2, ... }` / `{ "-scores", DEF(Sc_Stats), 1, ... }` -> MATCH
- "sets the invoking client's on-screen stats overlay state to off (hidden)" -> src/client.c:3723 `if (self->sc_stats && self->sc_stats_time && (self->sc_stats_time <= g_globalvars.time) && (match_in_progress != 1) && !isRACE())` -> MATCH (sc_stats==0 stops Print_Scores)
- "the handler decrements its argument and writes the result to the client's sc_stats field" -> src/commands.c:4996-5001 `void Sc_Stats(float on){ on--; self->sc_stats = (int)on; ...}` -> MATCH
- "-scores passes 1, yielding sc_stats = 0" -> src/commands.c:1133-1135 + cmd table arg=1 -> MATCH
- "While sc_stats is non-zero (held via +scores) the server repurposes the player's HUD stat fields" -> src/client.c:3575 `G_centerprint(self, "%s", buf);` -> MISMATCH(no HUD stat-field repurposing exists; sc_stats only triggers Print_Scores which builds a text scoreboard via G_centerprint -- health/armor/ammo/STAT_* are never written; the only other sc_stats read is the MOTD guard)
- "and suppresses the MOTD" -> src/motd.c:46-52 `if (... || self->sc_stats || ...){ self->s.v.nextthink = g_globalvars.time + 1; return; }` -> MATCH
- "-scores ends that state so the normal HUD/MOTD returns" -> src/client.c:4320-4328 `if (!self->sc_stats && self->sc_stats_time && ...){ ... } ... G_centerprint(self, "%s", "");` -> MATCH for MOTD/centerprint-clear; MISMATCH for "normal HUD returns" (HUD stat fields were never altered)
- "Takes no arguments." -> src/commands.c:892 `{ "-scores", DEF(Sc_Stats), 1, CF_BOTH | CF_MATCHLESS, CD_MNS_SCORES }` -> MATCH
WI-2: n/a

RESULT | ktx:command:setzone:frogbot:editor | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | Every clause (argc>=4 set+clamp, nearest-marker, next-zone wrap, explicit-zone clamp, prints, not-found errors, editor-mode gate, same-zone navigation region) maps to an enforcing line.
### ktx:command:setzone:frogbot:editor
- "Frogbot waypoint-editor subcommand. Assigns a zone number to a routing marker" -> src/bot_commands.c:2340 `{ "setzone", FrogbotSetZone, "Sets a marker's zone #" }` + bot_commands.c:1501 `nearest->fb.Z_ = zone;` -> MATCH
- "With marker number and zone arguments (argc >= 4) it sets the given marker to the given zone, both clamped (zone 1..NUMBER_ZONES)" -> src/bot_commands.c:1446-1455 `if (trap_CmdArgc() >= 4){ ... marker_number = bound(1, atoi(param), NUMBER_MARKERS); ... zone = bound(1, atoi(param), NUMBER_ZONES); }` + progs.h:425 `#define NUMBER_ZONES 24` -> MATCH
- "With no marker argument it operates on the marker nearest the editing player" -> src/bot_commands.c:1443 `gedict_t *nearest = LocateMarker(self->s.v.origin);` -> MATCH
- "with no zone argument it advances that marker to the next zone (wrapping back to 1 past the maximum)" -> src/bot_commands.c:1482-1486 `zone = nearest->fb.Z_ + 1; if (zone > NUMBER_ZONES){ zone = 1; }` -> MATCH
- "or with one numeric argument it sets that explicit zone (clamped)" -> src/bot_commands.c:1488-1498 `if (trap_CmdArgc() == 3){ ... zone = bound(1, atoi(param), NUMBER_ZONES); }` -> MATCH
- "Prints the marker's resulting zone" -> src/bot_commands.c:1502-1503 `G_sprint(self, PRINT_HIGH, "Marker #%d now has zone %d\n", nearest->fb.index + 1, nearest->fb.Z_);` -> MATCH
- "or an error if the targeted/nearest marker is not found" -> src/bot_commands.c:1466-1471 / 1475-1480 `G_sprint(self, PRINT_HIGH, "No marker ... found ...");` -> MATCH
- "Used while editing a map's bot navigation" -> src/bot_commands.c:2385-2389 `... FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands;` -> MATCH
- "markers in the same zone are treated as a navigation region by the bots" -> src/route_lookup.c:66 `zone = &from_marker->fb.zones[to_marker->fb.Z_ - 1];` + route_lookup.c:119-121 -> MATCH
WI-2: n/a

RESULT | ktx:command:s-t | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=11 | Every clause (group selectors, self-skip, cross-side match block, both message formats, usage + no-clients strings) maps to an enforcing line in s_t / s_t_do.
### ktx:command:s-t
- "Sends a private chat message to a group of clients" -> src/g_cmd.c:705-726 `for (...){ ... G_sprint(p, PRINT_CHAT, "[%s <t:%s>]: %s\n", name, tname, str); i++; }` -> MATCH
- "Usage: s-t <group> <text> ... else prints \"usage: s-t team txt\"" -> src/g_cmd.c:744-748 `if (argc < 4){ G_sprint(self, 2, "usage: s-t team txt\n"); return; }` -> MATCH
- "\"player\" = all players" -> src/g_cmd.c:717 `(streq(tname, "player") && (p->ct == ctPlayer))` -> MATCH
- "\"spectator\" = all spectators" -> src/g_cmd.c:718 `(streq(tname, "spectator") && (p->ct == ctSpec))` -> MATCH
- "\"admin\" = all admins" -> src/g_cmd.c:719 `(streq(tname, "admin") && is_adm(p))` -> MATCH
- "otherwise the name of a team = every member of that team" -> src/g_cmd.c:719 `|| (streq(tname, getteam(p)))` -> MATCH
- "goes to each matching client except yourself" -> src/g_cmd.c:707-710 `if (self == p){ continue; }` -> MATCH
- "shown as \"[<yourname> <t:<group>>]: text\"" -> src/g_cmd.c:725 `G_sprint(p, PRINT_CHAT, "[%s <t:%s>]: %s\n", name, tname, str);` -> MATCH
- "echoed back to you as \"[<t:<group>>]: text\"" -> src/g_cmd.c:736 `G_sprint(self, PRINT_CHAT, "[<t:%s>]: %s\n", tname, str);` -> MATCH
- "During a match a player and a spectator cannot exchange these messages" -> src/g_cmd.c:712-715 `if (match_in_progress && (self->ct != p->ct)){ continue; }` -> MATCH
- "If no client matches the group it prints \"s-t: no clients found for team <group>\"" -> src/g_cmd.c:729-733 `if (!i){ G_sprint(self, 2, "s-t: no clients found for team %s\n", tname); return; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:summary:frogbot:editor | C-FIX | flavourC=1 | wi2=0 | clauses=5 | "aggregate counts per goal and per zone" is wrong: FrogbotSummary only prints a marker total; per-goal/per-zone breakdowns are separate sibling commands (goalsummary/zonesummary).
### ktx:command:summary:frogbot:editor
- "Frogbot waypoint-editor diagnostic ... Used while editing bot navigation" -> src/bot_commands.c:2386 `... FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands;` (entry :2348 `{ "summary", FrogbotSummary, ... }`) -> MATCH
- "Prints a summary ... to the requesting player" -> src/bot_commands.c:2102 `G_sprint(self, PRINT_HIGH, "Marker summary:\n");` (all output G_sprint(self,...)) -> MATCH
- "a list of all placed markers, flagging any marker that has no paths and/or no assigned zone" -> src/bot_commands.c:2120 `G_sprint(self, PRINT_HIGH, "  %3d: %s: no paths%s\n", ...)` + 2123-2126 -> MISMATCH(does NOT list all markers; emits a line only for markers with no paths and/or no zone, then a total -- "a list of all placed markers" overstates the output)
- "flagging any marker that has no paths and/or no assigned zone" (flag semantics only) -> src/bot_commands.c:2118 `if (path_count == 0)` / 2123 `else if (!markers[i]->fb.Z_)` -> MATCH
- "followed by aggregate counts of markers per goal and per zone" -> src/bot_commands.c:2141 `G_sprint(self, PRINT_HIGH, "  %d markers in total\n", marker_count);` -> MISMATCH(FrogbotSummary prints ONLY a single marker total; goal_count[]/zone_count[] filled at 2131/2136 but never printed here. Per-goal = separate FrogbotGoalSummary (bot_commands.c:1924, "goalsummary"); per-zone = separate FrogbotZoneSummary (1949, "zonesummary"). Three sibling commands conflated)
WI-2: n/a

RESULT | ktx:command:time15 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | TimeSet(15) clamps to bound(0,15,k_timetop), match-in-progress guard, still/broadcast both verified.
### ktx:command:time15
- "Sets the match timelimit to 15 minutes" -> src/commands.c:765 `{ "time15", DEF(TimeSet), 15.0f, CF_PLAYER | CF_SPC_ADMIN, CD_TIME15 }` calling commands.c:3026 `timelimit = bound(0, t, cvar("k_timetop"));` (t=15.0f) -> MATCH
- "clamped to the range 0..k_timetop, so it takes effect only if k_timetop is at least 15" -> src/commands.c:3026 `timelimit = bound(0, t, cvar("k_timetop"));` (world.c:934 RegisterCvar k_timetop) -> MATCH
- "ignored while a match is in progress" -> src/commands.c:3021-3024 `if (match_in_progress) { return; }` -> MATCH
- "if already at the resulting value reports it unchanged, otherwise broadcasts the new match length to everyone" -> src/commands.c:3028-3033 `if (tl == timelimit) { G_sprint(self, 2, "%s still %s\n", ...); return; }` then 3035-3037 `cvar_fset("timelimit", ...); G_bprint(2, ...)` -> MATCH
WI-2: n/a

RESULT | ktx:command:time30 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | identical TimeSet path with t=30.0f; all clauses enforced.
### ktx:command:time30
- "Sets the match timelimit to 30 minutes" -> src/commands.c:768 `{ "time30", DEF(TimeSet), 30.0f, CF_PLAYER | CF_SPC_ADMIN, CD_TIME30 }` calling commands.c:3026 (t=30.0f) -> MATCH
- "clamped to the range 0..k_timetop, so it takes effect only if k_timetop is at least 30" -> src/commands.c:3026 `timelimit = bound(0, t, cvar("k_timetop"));` -> MATCH
- "ignored while a match is in progress" -> src/commands.c:3021-3024 `if (match_in_progress) { return; }` -> MATCH
- "if already at the resulting value reports it unchanged, otherwise broadcasts the new match length to everyone" -> src/commands.c:3028-3037 -> MATCH
WI-2: n/a

RESULT | ktx:command:timeup | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | TimeUp(5) adds 5 with 0->1->3->5 low-value ramp, bound(0,..,k_timetop), match-in-progress guard all verified.
### ktx:command:timeup
- "Increases the match time limit (the timelimit cvar, in minutes) and announces the new length to all players" -> src/commands.c:734 `{ "timeup", DEF(TimeUp), 5.0f, ... }` -> commands.c:3012-3013 `cvar_fset("timelimit", (int)timelimit); G_bprint(2, "%s %s %s%s\n", redtext("Match length set to"), ...)` -> MATCH
- "It normally adds 5 minutes" -> src/commands.c:2998-3001 `else { timelimit += t; }` (t=5.0f) -> MATCH
- "as a special low-value ramp it instead steps 0 -> 1 -> 3 -> 5 when the current limit is 0, 1, or 3" -> src/commands.c:2986-2997 `if ((t == 5) && (timelimit == 0)) { timelimit = 1; } else if ((t == 5) && (timelimit == 1)) { timelimit = 3; } else if ((t == 5) && (timelimit == 3)) { timelimit = 5; }` -> MATCH
- "result is clamped to the range 0 to the k_timetop cvar; ignored while a match is in progress" -> src/commands.c:3003 `timelimit = bound(0, timelimit, cvar("k_timetop"));` + 2981-2984 `if (match_in_progress) { return; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:tkrjump | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | t_jump(2) flips k_disallow_krjump, broadcasts enables/disables krjump, match-in-progress guard verified.
### ktx:command:tkrjump
- "Toggles whether the server allows krjump (the kill-rjump trick action)" -> src/commands.c:832 `{ "tkrjump", DEF(t_jump), 2, CF_BOTH_ADMIN, CD_TKRJUMP }` -> commands.c:5057 (j_type=2 -> jt="krjump", cv_jt="k_disallow_krjump"); gated action commands.c:5035 `if (cvar("k_disallow_krjump")) { ... return; }` -> MATCH
- "It flips the k_disallow_krjump cvar" -> src/commands.c:5067 `trap_cvar_set_float(cv_jt, !cvar(cv_jt));` (world.c:800 RegisterCvar) -> MATCH
- "broadcasts whether krjump is now enabled or disabled for all players" -> src/commands.c:5068 `G_bprint(2, "%s %s %s\n", self->netname, redtext(Enables(!cvar(cv_jt))), redtext(jt));` -> MATCH
- "ignored while a match is in progress" -> src/commands.c:5059-5062 `if (match_in_progress) { return; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:tp | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Every clause maps to an enforcing line in ChangeTP; "team or CTF" correctly excludes coop.
### ktx:command:tp
- "Cycles the server's teamplay setting through the values 1 -> 2 -> 3 -> 4 -> back to 1 on each invocation" -> src/commands.c:2916 `teamplay = bound(1, teamplay, 4);` + 2918 `teamplay++;` + 2920-2923 `if (teamplay == 5) { teamplay = 1; }` -> MATCH
- "broadcasts the new value" -> src/commands.c:2927 `G_bprint(2, "Teamplay %s\n", dig3(teamplay));` -> MATCH
- "Has no effect while a match is in progress" -> src/commands.c:2904-2906 `if (match_in_progress) ... return;` -> MATCH
- "rejected unless the current mode is a team or CTF mode" -> src/commands.c:2909-2913 `if (!isTeam() && !isCTF()) { G_sprint(self, 3, "console: non team mode disallows ...\n"); return; }` (coop not in gate, so "team or CTF" is exact) -> MATCH
WI-2: n/a

RESULT | ktx:command:trx_stop | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Both stop helpers traced; buffer-kept, pb_ent removal, "playback finished" print, no-op-if-neither, CF_PLAYER, zero-arg all verified.
### ktx:command:trx_stop
- "Stops the calling player's in-memory trick-demo recording" -> src/commands.c:8343 `mv_stop_record();` (mv_stop_record :8268 sets self->is_recording=false; in-memory plrfrms[]) -> MATCH
- "and any in-progress trick-demo playback for that player" -> src/commands.c:8344 `mv_stop_playback();` -> MATCH
- "If a recording was running it is ended (the captured-frame buffer is kept)" -> src/commands.c:8266-8268 `G_sprint(self, 2, "recording finished (%d) frames\n", self->rec_count); self->is_recording = false;` (rec_count/plrfrms[] untouched) -> MATCH
- "if a playback was running its temporary playback entity is removed" -> src/commands.c:8145-8148 `if (self->pb_ent) { ent_remove(self->pb_ent); self->pb_ent = NULL; }` -> MATCH
- "and \"playback finished\" is printed" -> src/commands.c:8151 `G_sprint(self, 2, "playback finished\n");` -> MATCH
- "Has no effect if the player had neither active" -> src/commands.c:8261-8263 `if (!mv_is_recording()) { return; }` + 8140-8142 `if (!mv_is_playback()) { return; }` -> MATCH
- "Player-issued command" -> src/commands.c:991 `{ "trx_stop", mv_cmd_stop, 0, CF_PLAYER, CD_TRX_STOP }` -> MATCH
- "no arguments" -> src/commands.c:991 + 8341-8345 `void mv_cmd_stop(void) { mv_stop_record(); mv_stop_playback(); }` -> MATCH
WI-2: n/a

RESULT | ktx:cvar:demo_tmp_record | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | StartDemoRecord gate + per-gametype decision tree + serverdemo-cancel all traced; registered default "0" matches "0=off".
### ktx:cvar:demo_tmp_record
- "Master switch for KTX server-side automatic MVD demo recording at match start" -> src/match.c:2355 `if (cvar("demo_tmp_record"))` + match.c:2473-2477 `match_in_progress = 1; ... StartDemoRecord();` -> MATCH
- "0 = off (no auto-recording)" -> src/match.c:2355 + src/world.c:936 `RegisterCvarEx("demo_tmp_record", "0");` -> MATCH
- "Any non-zero value enables it" -> src/match.c:2355 `if (cvar("demo_tmp_record"))` -> MATCH
- "race is recorded" -> src/match.c:2359-2362 `if (isRACE()) { record = true; }` -> MATCH
- "non-deathmatch is skipped" -> src/match.c:2363-2366 `else if (!deathmatch) { record = false; }` -> MATCH
- "FFA is skipped if demo_skip_ktffa_record is set" -> src/match.c:2367-2370 `else if (isFFA() && cvar("demo_skip_ktffa_record")) { record = false; }` -> MATCH
- "a HoonyMode game already past its first point is skipped" -> src/match.c:2371-2374 `else if (isHoonyModeAny() && HM_current_point() > 0) { record = false; }` -> MATCH
- "otherwise the match is recorded" -> src/match.c:2375-2378 `else { record = true; }` -> MATCH
- "If a server demo is already running it is cancelled before the new one starts" -> src/match.c:2382-2385 `if (!strnull(cvar_string("serverdemo"))) { localcmd("sv_democancel\n"); }` then :2388 -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_bzk | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Arm-at-match-start, BERZERK!!!! announce + Quad/invuln grant, connect-during-berzerk Quad, off-never-triggers all traced; bare RegisterCvar => default 0 matches.
### ktx:cvar:k_bzk
- "Enables berzerk mode for matches. 0 = off, 1 = on (default 0)" -> src/world.c:930 `RegisterCvar("k_bzk");` + src/match.c:1267 `if (cvar("k_bzk"))` -> MATCH (bare RegisterCvar => default 0)
- "the berzerk timer is armed at match start (to k_btime seconds)" -> src/match.c:1262-1270 `match_in_progress = 2; ... if (cvar("k_bzk")) { k_berzerktime = cvar("k_btime"); }` -> MATCH
- "when the game reaches that many seconds of time remaining the server announces \"BERZERK!!!!\"" -> src/match.c:690-698 `if (k_berzerktime != 0) { ... if ((self->cnt2 == f1) && (self->cnt == f2)) { G_bprint(2, "BERZERK!!!!\n");` -> MATCH
- "gives every player Quad (and invulnerability) for the rest of the match" -> src/match.c:702-710 `for (p = world; (p = find_plr(p));) { ... p->s.v.items = (int)p->s.v.items | (IT_QUAD | IT_INVULNERABILITY); p->super_damage_finished = g_globalvars.time + 3600; p->invincible_time = 1;` -> MATCH
- "players who connect during berzerk also receive Quad" -> src/client.c:2394-2399 `if (cvar("k_bzk") && k_berzerk) { self->s.v.items = (int)self->s.v.items | IT_QUAD; self->super_damage_finished = g_globalvars.time + 3600; }` -> MATCH (adjacent comment is stale/inverted vs the code; description correctly tracks the enforcing code)
- "When off, berzerk never triggers" -> src/match.c:1271-1273 `else { k_berzerktime = 0; }` + match.c:690 `if (k_berzerktime != 0)` -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_clan_arena_rounds | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | bound(3,..,101), even->+1 odd-up, (rounds+1)/2 wins-required, first-team-to-reach win check all traced in clan_arena.c.
### ktx:cvar:k_clan_arena_rounds
- "Number of rounds in a Clan Arena / Wipeout series" -> src/clan_arena.c:286 `int k_clan_arena_rounds = bound(3, cvar("k_clan_arena_rounds"), 101);` (CA_wins_required) + clan_arena.c:127 `qbool isWipeout = (cvar("k_clan_arena") == 2);` -> MATCH
- "clamped to the range 3-101" -> src/clan_arena.c:286 `bound(3, cvar("k_clan_arena_rounds"), 101)` -> MATCH
- "if even, rounded up to the next odd number" -> src/clan_arena.c:288 `k_clan_arena_rounds += (k_clan_arena_rounds % 2) ? 0 : 1;` -> MATCH
- "best-of-that, won by the first team to take a majority ((rounds+1)/2 wins required)" -> src/clan_arena.c:290 `return ((k_clan_arena_rounds + 1) / 2);` + clan_arena.c:1626-1630 `if ((team1_score >= CA_wins_required()) || (team2_score >= CA_wins_required())) { ... }` -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_demotxt_format | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | xml/json valid set, xml fallback on unrecognized, default xml, always-also-writes-JSON, controls the additional non-json file -- all enforced.
### ktx:cvar:k_demotxt_format
- "Selects the file format of the per-game text stats file KTX writes next to a recorded .mvd demo" -> src/stats.c:573 `format = FindStatsFormat(cvar_string("k_demotxt_format"));` + stats.c:609 `written = CreateStatsFile(name, ip, i, format);` (guard stats.c:568) -> MATCH
- "Valid values: \"xml\" or \"json\"" -> src/stats.c:10-14 `static stats_format_t file_formats[] = { FILE_FORMAT_DEF(xml), FILE_FORMAT_DEF(json) };` -> MATCH
- "any unrecognized value falls back to \"xml\"" -> src/stats.c:454-468 `FindStatsFormat(...)` -> `// default to xml \n return &file_formats[0];` -> MATCH
- "Default \"xml\"" -> src/world.c:1050 `RegisterCvarEx("k_demotxt_format", "xml");` -> MATCH
- "KTX always also writes a JSON copy; this cvar controls the additional non-JSON file when a non-json value is set" -> src/stats.c:574 `json_format = FindStatsFormat("json");` + 579-604 `// Always write json ...` + 606-609 `if (!streq(format->name, "json")) { CreateStatsFile(name, ip, i, format); }` -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_disallow_krjump | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Server toggle, RL switch, pitch-80 (comment-confirmed max), fire, 0=allowed/non-zero=disabled, the exact disabled message, and no-jump-on-disable all map to enforcing lines in krjump().
### ktx:cvar:k_disallow_krjump
- "Server-side toggle for the krjump command" -> src/world.c:800 `RegisterCvar("k_disallow_krjump");` + commands.c:5035 `if (cvar("k_disallow_krjump"))` -> MATCH
- "the scripted vertical rocket-jump assist" -> src/commands.c:5030-5053 `void krjump(void)` -> MATCH
- "switch to RL" -> src/commands.c:5047 `self->s.v.impulse = 7; // select switch to rl` -> MATCH
- "pitch straight down to the maximum 80 degrees" -> src/commands.c:5049 `self->s.v.v_angle[0] = 80; // look down much as possible, qw block this at 80` -> MATCH
- "and fire" -> src/commands.c:5048 `self->s.v.button0 = 1;` + 5050 `W_WeaponFrame();` -> MATCH
- "0 = krjump allowed" -> src/world.c:800 bare RegisterCvar (default 0) + commands.c:5035 false at 0 -> MATCH
- "1 (any non-zero) = krjump disabled; invoking it prints \"krjump is disabled\"" -> src/commands.c:5035-5037 `if (cvar("k_disallow_krjump")) { G_sprint(self, 2, "%s is disabled\n", redtext("krjump"));` -> MATCH
- "and performs no jump" -> src/commands.c:5039 `return;` before impulse/fire -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_end_tele_spawn | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Map-"end" gate, fixed tele-spawn origin, 0=removed / 1=kept polarity, default 0, and no-effect-on-other-maps all trace to the world.c (mirrored bot_loadmap.c) enforcing branches.
### ktx:cvar:k_end_tele_spawn
- "On the map named \"end\" ... controls whether the spawn point next to the teleporter is kept" -> src/world.c:588 `if (!cvar("k_end_tele_spawn") && streq("end", mapname)` -> MATCH
- "the \"tele spawn\", at a fixed origin" -> src/world.c:594-595 `vec3_t TS_ORIGIN = { -392, 608, 40 };` + 599 `if (VectorCompare(p->s.v.origin, TS_ORIGIN))` -> MATCH
- "0 = the tele spawn point is removed, so players never spawn there" -> src/world.c:588 true at default 0 -> 597-602 `... ent_remove(p); break; ...` -> MATCH
- "1 = the tele spawn point is kept (not removed)" -> src/world.c:588 false when 1; corroborated by world.c:839 `RegisterCvar("k_end_tele_spawn"); // don't remove end tele spawn` + bot_loadmap.c:363 -> MATCH
- "Has no effect on any other map" -> src/world.c:588 + bot_loadmap.c:364 both require `&& streq("end", mapname)`; no other use-site -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_aim_yaw_min | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | bound(yaw.min, fabs(raw)*scale, yaw.max) formula, bound(0,v,1) read into aim_params[YAW].minimum, on-target floor wobble, skill-derived-then-cvar-overridable origin all match enforcing lines verbatim.
### ktx:cvar:k_fbskill_aim_yaw_min
- "lower clamp on the bot's horizontal (yaw) aim-error magnitude" -> src/bot_aim.c:351 `yaw_diff = bound(yaw->minimum, fabs(raw_yaw_diff) * yaw->scale, yaw->maximum);` -> MATCH
- "the yaw error is computed as bound(yaw.minimum, fabs(raw_yaw_diff) * yaw.scale, yaw.maximum)" -> src/bot_aim.c:351 (yaw = &self->fb.skill.aim_params[YAW], :325) -> MATCH
- "this value is the floor below which the randomized yaw deviation cannot fall" -> src/bot_aim.c:351 + 355 `yaw_rnd = dist_random(-yaw_diff, yaw_diff, yaw->multiplier * ...)` -> MATCH
- "the bot still wobbles horizontally by at least this many degrees even when already on target" -> src/bot_aim.c:329-330 + 351 (raw~0 on target -> clamps up to yaw->minimum) + 376 `self->fb.desired_angle[YAW] += yaw_rnd;` -> MATCH
- "Read back per bot clamped to bound(0, value, 1) into self->fb.skill.aim_params[YAW].minimum" -> src/bot_botimp.c:315 `self->fb.skill.aim_params[YAW].minimum = bound(0, cvar(FB_CVAR_YAW_MIN_ERROR), 1);` (FB_CVAR_YAW_MIN_ERROR = "k_fbskill_aim_yaw_min", :23) -> MATCH
- "server normally derives the value from the bot's aim-skill level; setting the cvar overrides that" -> src/bot_botimp.c:169 `cvar_fset(FB_CVAR_YAW_MIN_ERROR, RangeOverSkill(aimskill, 1.5, 1));` (+:220); :120 RegisterCvar default 0; :315 reads current cvar() -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_combatjump | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Per-decision g_random()<combat_jump_chance probability, all four gating conditions, the bound(0,v,1.0) read, g_random() proven [0,1), and the SetJumpFlag consumption site all map to enforcing lines.
### ktx:cvar:k_fbskill_combatjump
- "Frogbot AI tuning cvar" -> src/bot_botimp.c:53 `#define FB_CVAR_COMBATJUMP_CHANCE "k_fbskill_combatjump"` + :147 `RegisterCvar(FB_CVAR_COMBATJUMP_CHANCE);` -> MATCH
- "Sets the per-decision probability that the bot performs a combat jump while engaging an enemy" -> src/bot_botjump.c:458 `SetJumpFlag(self, (g_random() < self->fb.skill.combat_jump_chance), "CombatJump");` -> MATCH
- "when the bot is looking at an enemy" -> src/bot_botjump.c:405-406 + 452 `if (!lookingAtEnemy || lookObjectFiringLG) { return; }` -> MATCH
- "(and not surprised...)" -> src/bot_botjump.c:451-454 `// If surprised or player firing LG, don't jump` -> MATCH
- "no ledge expected" -> src/bot_botjump.c:445-449 `if (self->fb.path_state & (JUMP_LEDGE | BOTPATH_CURLJUMP_HINT)) { return; }` -> MATCH
- "enemy not firing LG" -> src/bot_botjump.c:407 `lookObjectFiringLG = PlayerFiringLG(self->fb.look_object);` + 395-398 -> MATCH
- "it jumps if random(0..1) is below this value" -> src/bot_botjump.c:458 `(g_random() < self->fb.skill.combat_jump_chance)` + g_utils.c:51-54 (g_random [0,1)) -> MATCH
- "Read into self->fb.skill.combat_jump_chance clamped with bound(0, value, 1.0) ... Consumed by bot_botjump.c (SetJumpFlag)" -> src/bot_botimp.c:355 `self->fb.skill.combat_jump_chance = bound(0, cvar(FB_CVAR_COMBATJUMP_CHANCE), 1.0f);` + bot_botjump.c:458 -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_dmm4wiggletoggle | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | dm4 gate, random<value, half-wiggle-limit guard, direction reversal, bound(0,v,1.0), consumer fn, and the separate k_fbskill_dmm4wiggle on/off cross-ref all map to enforcing lines.
### ktx:cvar:k_fbskill_dmm4wiggletoggle
- "per-hit probability that taking damage in deathmatch 4 flips the bot's current strafe-wiggle direction" -> src/bot_botenemy.c:33-37 `// in dmm4, there's a chance taking damage will reset move direction \n if ((deathmatch >= 4) && (g_random() < targ->fb.skill.wiggle_toggle) ...) { targ->fb.wiggle_run_dir = targ->fb.wiggle_run_dir < 0 ? 1 : -1; }` -> MATCH
- "deathmatch >= 4" -> src/bot_botenemy.c:34 `if ((deathmatch >= 4) && ...)` -> MATCH
- "if random(0..1) is below this value" -> src/bot_botenemy.c:34 `(g_random() < targ->fb.skill.wiggle_toggle)` + g_utils.c:53 (g_random [0,1)) -> MATCH
- "(and the bot has wiggled past half its wiggle-run limit)" -> src/bot_botenemy.c:35 `&& (abs(targ->fb.wiggle_run_dir) > (self->fb.skill.wiggle_run_limit / 2))` -> MATCH
- "its wiggle-run direction is reversed" -> src/bot_botenemy.c:37 `targ->fb.wiggle_run_dir = targ->fb.wiggle_run_dir < 0 ? 1 : -1;` -> MATCH
- "Read into self->fb.skill.wiggle_toggle clamped with bound(0, value, 1.0)" -> src/bot_botimp.c:354 `self->fb.skill.wiggle_toggle = bound(0, cvar(FB_CVAR_MOVEMENT_DMM4WIGGLETOGGLE), 1.0f);` (macro :51) -> MATCH
- "Consumed by BotDamageInflictedEvent() in bot_botenemy.c" -> src/bot_botenemy.c:27 `void BotDamageInflictedEvent(gedict_t *attacker, gedict_t *targ)` -> MATCH
- "the separate k_fbskill_dmm4wiggle is the on/off enable for wiggle movement itself" -> include/progs.h:540 `qbool wiggle_run_dmm4;` + bot_movement.c:141 + bot_botimp.c:50 -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_reactionmovetime | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Post-spawn move delay set at enter event to time+value, enforced by min_move_time gate clearing movement; bound(0,v,1.0); consumer fn; reactiontime cross-ref verified.
### ktx:cvar:k_fbskill_reactionmovetime
- "in seconds, the post-spawn delay before the bot starts moving" -> src/bot_client.c:137 `self->fb.min_move_time = g_globalvars.time + self->fb.skill.spawn_move_delay;` (progs.h:754 comment) -> MATCH
- "on a spawn/enter event the bot's earliest-allowed move time is set to current time plus this value" -> src/bot_client.c:137 (inside BotClientEntersEvent :130) -> MATCH
- "the bot stands still for this long after spawning before it begins navigating" -> src/bot_movement.c:546-548 `else if (self->fb.min_move_time > g_globalvars.time) { VectorClear(direction); }` -> MATCH
- "Read into self->fb.skill.spawn_move_delay clamped with bound(0, value, 1.0)" -> src/bot_botimp.c:342 `self->fb.skill.spawn_move_delay = bound(0, cvar(FB_CVAR_REACTION_MOVETIME), 1.0f);` (macro :33) -> MATCH
- "Consumed in BotClientEntersEvent() in bot_client.c (self->fb.min_move_time)" -> src/bot_client.c:130 + :137 -> MATCH
- "the separate k_fbskill_reactiontime governs the fire-onset/awareness delay" -> src/bot_botimp.c:341 `self->fb.skill.awareness_delay = bound(0, cvar(FB_CVAR_REACTION_TIME), 1.5f);` + bot_client.c:136 -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_vol_init | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Volatility scales aim error; reset to initial_volatility on look-target change with "as if not seen before" comment; bound(0,v,5.0); cvar_fset server-managed.
### ktx:cvar:k_fbskill_vol_init
- "The bot's aim error is scaled by a running per-target 'volatility' scalar" -> src/bot_aim.c:353-356 `pitch_rnd = dist_random(-pitch_diff, pitch_diff, pitch->multiplier * self->fb.skill.current_volatility); yaw_rnd = dist_random(-yaw_diff, yaw_diff, yaw->multiplier * self->fb.skill.current_volatility);` -> MATCH
- "sets the starting value that scalar is reset to whenever the bot's look-target changes (treated as if it had not seen the player before)" -> src/bot_aim.c:239-242 `if (opponent != self->fb.prev_look_object) { // Treat as if they hadn't seen player before \n volatility = self->fb.skill.initial_volatility;` -> MATCH
- "reads it clamped to bound(0, value, 5.0) into self->fb.skill.initial_volatility" -> src/bot_botimp.c:330 `self->fb.skill.initial_volatility = bound(0, cvar(FB_CVAR_INITIAL_VOLATILITY), 5.0f);` (macro :37) -> MATCH
- "Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode()" -> src/bot_botimp.c:186 `cvar_fset(FB_CVAR_INITIAL_VOLATILITY, RangeOverSkill(skill, 3.0f, 1.4f));` (+:237) -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_vol_max | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Upper clamp applied each frame in continuing-target path via bound(min,..,max); scalar scales aim error; bound(0,v,5.0); cvar_fset server-managed.
### ktx:cvar:k_fbskill_vol_max
- "The bot's aim error is scaled by a running per-target 'volatility' scalar" -> src/bot_aim.c:353-356 `... pitch->multiplier * self->fb.skill.current_volatility ... yaw->multiplier * self->fb.skill.current_volatility` -> MATCH
- "sets the upper clamp applied to that scalar each frame in the continuing-target path (volatility = bound(min_volatility, ..., max_volatility))" -> src/bot_aim.c:299-301 `volatility = bound(self->fb.skill.min_volatility, volatility * self->fb.skill.reduce_volatility, self->fb.skill.max_volatility);` (else continuing-target branch; :336 "Run every frame") -> MATCH
- "capping how large accumulated volatility (and hence aim error) can grow" -> src/bot_aim.c:299-301 (upper limit of bound) -> MATCH
- "reads it clamped to bound(0, value, 5.0) into self->fb.skill.max_volatility ... Server-managed via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode()" -> src/bot_botimp.c:329 `self->fb.skill.max_volatility = bound(0, cvar(FB_CVAR_MAX_VOLATILITY), 5.0f);` + :185 `cvar_fset(FB_CVAR_MAX_VOLATILITY, RangeOverSkill(skill, 4.0f, 2.5f));` (+:236) (macro :36) -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_vol_oppvel | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Horizontal speed threshold on opponent velocity (vx^2+vy^2 vs threshold^2); over-threshold adds the separate _incr; bound(0,v,1000); cvar_fset server-managed.
### ktx:cvar:k_fbskill_vol_oppvel
- "horizontal SPEED threshold ... HorizontalVelocityCheck compares vx*vx+vy*vy against threshold*threshold" -> src/bot_aim.c:228-230 `float value = velocity[0] * velocity[0] + velocity[1] * velocity[1]; return (value > (threshold * threshold));` -> MATCH
- "for the OPPONENT's velocity: when the bot's current target moves faster than this" -> src/bot_aim.c:267-268 `if (HorizontalVelocityCheck(opponent->s.v.velocity, self->fb.skill.enemyspeed_volatility_threshold))` (opponent=self->fb.look_object :236) -> MATCH
- "aim volatility is increased by the separate k_fbskill_vol_oppvel_incr amount" -> src/bot_aim.c:270 `volatility += self->fb.skill.enemyspeed_volatility;` + bot_botimp.c:337 (macro :42) -> MATCH
- "This cvar only sets the enemy-speed trigger, not the volatility increment" -> src/bot_aim.c:267-270 (threshold gates the `if`; the += adds the separate field) -> MATCH
- "reads it clamped to bound(0, value, 1000) into self->fb.skill.enemyspeed_volatility_threshold" -> src/bot_botimp.c:335-336 `self->fb.skill.enemyspeed_volatility_threshold = bound(0, cvar(FB_CVAR_ENEMYSPEED_VOLATILITY_THRESHOLD), 1000);` (macro :41) -> MATCH
- "Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode()" -> src/bot_botimp.c:190 `cvar_fset(FB_CVAR_ENEMYSPEED_VOLATILITY_THRESHOLD, RangeOverSkill(skill, 360, 450));` (+:241) -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fp_spec | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Every preset triple, the spectator-counterpart routing, and the 1-3 clamp map to enforcing lines in g_cmd.c.
### ktx:cvar:k_fp_spec
- "Selects the say/say_team flood-protection profile applied to spectators (counterpart of k_fp)" -> src/g_cmd.c:166 `int k_fp_spec = bound(1, cvar("k_fp_spec"), say_fp_levels_cnt); // spec` (:165 k_fp player) -> MATCH
- "picks one of three preset triples" -> src/g_cmd.c:150-156 `say_fp_level_t say_fp_levels[] = { { 9, 1, 1, "Low" }, { 4, 1, 5, "Medium" }, { 5, 3, 7, "High" } };` -> MATCH
- "1 = up to 9 messages per 1 second then silenced 1 second" -> src/g_cmd.c:151 `{ 9, 1, 1, "Low" }` -> MATCH
- "2 = 4 per 1 second then silenced 5 seconds" -> src/g_cmd.c:152 `{ 4, 1, 5, "Medium" }` -> MATCH
- "3 = 5 per 3 seconds then silenced 7 seconds" -> src/g_cmd.c:153 `{ 5, 3, 7, "High" }` -> MATCH
- "Out-of-range values are clamped to 1-3" -> src/g_cmd.c:166 `bound(1, cvar("k_fp_spec"), say_fp_levels_cnt)` (say_fp_levels_cnt=3 :157) -> MATCH
WI-2: n/a (registered default "3" world.c:1008; description asserts no default/access class)

RESULT | ktx:cvar:k_freeze | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Platform/door/train freeze, countdown-regardless, and practice bypass all map to enforcing gates.
### ktx:cvar:k_freeze
- "When 1, platforms, doors and trains do not activate while no match is in progress" -> src/plats.c:126 `if ((match_in_progress == 1) || (!match_in_progress && cvar("k_freeze"))) { return; }` (also doors.c:231, plats.c:162; train plats.c:364) -> MATCH
- "when 0 they operate normally during that time" -> src/plats.c:364 `if ((match_in_progress == 2) || (!cvar("k_freeze") && !match_in_progress) || k_practice)` -> MATCH
- "During the match countdown they are frozen regardless of this setting" -> src/plats.c:126 `(match_in_progress == 1) || ...` ; countdown match.c:2473 `match_in_progress = 1;` -> MATCH
- "practice mode bypasses freezing entirely" -> src/plats.c:123 `if (!k_practice)` wrapping the freeze check (+ train :364 `|| k_practice`) -> MATCH
- "0 = no, 1 = yes" -> src/commands.c:3804 `cvar_toggle_msg(self, "k_freeze", redtext("map freeze"));` -> MATCH
WI-2: n/a (bare RegisterCvar world.c:871 = default 0)

RESULT | ktx:cvar:k_freshteams_limit_packs | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Both-cvar AND gate, per-type bound() clamps, and the dmm1 scope (via k_freshteams) all enforced.
### ktx:cvar:k_freshteams_limit_packs
- "Fresh Teams (dmm1) only" -> src/commands.c:7621 `if (deathmatch != 1) { ... return; }` (k_freshteams dmm1-gated) -> MATCH
- "when enabled (1) and k_freshteams is active" -> src/items.c:2672 `qbool fresh_packs = (cvar("k_freshteams") && cvar("k_freshteams_limit_packs"));` -> MATCH
- "ammo capped per ammo type to the pack_shells/nails/rockets/cells ceilings" -> src/items.c:2836-2839 `item->s.v.ammo_shells = bound(0, item->s.v.ammo_shells, cvar("k_freshteams_pack_shells")); ...` -> MATCH
- "0 = dropped backpack keeps the full amount" -> src/items.c:2835 `if (fresh_packs) {...}` (skipped when false) -> MATCH
- "1 = each ammo type clamped to its configured per-type maximum" -> src/items.c:2836 `bound(0, item->s.v.ammo_shells, cvar("k_freshteams_pack_shells"))` -> MATCH
- "Has no effect unless k_freshteams is set" -> src/items.c:2672 `(cvar("k_freshteams") && cvar("k_freshteams_limit_packs"))` -> MATCH
WI-2: n/a (registered default "1" world.c:897)

RESULT | ktx:cvar:k_killquad | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Quad removal, auto-drop, KillQuadThink removal, powerup-rule bypass, and match-in-progress lock all enforced.
### ktx:cvar:k_killquad
- "Enables KillQuad mode (0 = off, 1 = on)" -> src/commands.c:3131 `k_killquad = cvar("k_killquad");` (world.c:1564) -> MATCH
- "normal Quad Damage pickup is removed from the map" -> src/match.c:951 `if (k_killquad && streq(p->classname, "item_artifact_super_damage")) { soft_ent_remove(p);` -> MATCH
- "a quad is automatically dropped into play" -> src/items.c:1976-1979 `if (k_killquad) { if (NeedDropQuad()) { DropPowerup(666, IT_QUAD); } }` -> MATCH
- "picking up a dropped quad removes it after a short time (KillQuadThink)" -> src/items.c:1894-1895 `self->s.v.nextthink = g_globalvars.time + 10; self->think = (func_t) KillQuadThink;` + KillQuadThink :1866 `ent_remove(self);` -> MATCH
- "quad handling bypasses the standard powerup-spawn rules" -> src/g_utils.c:1785 `int k_pow_new = k_killquad ? 1 : cvar("k_pow");` + items.c:1974 -> MATCH
- "Cannot be toggled while a match is in progress" -> src/commands.c:3125-3128 `if (match_in_progress) { return; }` -> MATCH
WI-2: n/a (registered default "0" world.c:969)

RESULT | ktx:cvar:k_lockmin | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Ready-team count vs threshold, the exact block message, team-counting, and CA/Race force-2 override all enforced.
### ktx:cvar:k_lockmin
- "Minimum number of teams required for a match to start; below this value the match is blocked" -> src/match.c:1884 `if (i < k_lockmin) { ... return false; }` (i = CountRTeams() match.c:1823) -> MATCH
- "players are told 'N more teams required!'" -> src/match.c:1886-1887 `sub = k_lockmin - i; txt = va("%d more team%s required!\n", sub, count_s(sub));` -> MATCH
- "the count of teams that have players ready" -> src/match.c:162 `if (p->k_flag || !p->ready || strnull(s = getteam(p))) { continue; }` (CountRTeams) -> MATCH
- "In Clan Arena and Race modes this cvar is ignored and the minimum is forced to 2" -> src/match.c:1820 `int k_lockmin = (isCA() || isRACE()) ? 2 : cvar("k_lockmin");` -> MATCH
WI-2: n/a (bare RegisterCvar world.c:858 = default 0)

RESULT | ktx:cvar:k_matchless_max_idle_time | C-FIX | flavourC=1 | wi2=0 | clauses=5 | Warning-timing threshold wrong: code switches from "30s before" to "half" at limit <=30, not "60 seconds or less" (world.c:1099 uses `> 30`).
### ktx:cvar:k_matchless_max_idle_time
- "Only effective in matchless mode" -> src/match.c:638 `if (k_matchLess && CountPlayers() && match_in_progress && k_matchLess_idle_time)` -> MATCH
- "maximum number of seconds a player may go without firing before being force-moved to spectator and made to reconnect" -> src/match.c:642 `idle_time = (int)(g_globalvars.time - p->attack_finished);` then 643 `if (idle_time > k_matchLess_idle_time)` -> 650 `stuffcmd_flags(p, STUFFCMD_IGNOREINDEMO, "spectator 1\n");` + 658 `"disconnect\nwait;wait;reconnect\n"` -> MATCH
- "A warning is sent beforehand -- 30 seconds before the limit, or at half the limit if the limit is 60 seconds or less" -> src/world.c:1098-1099 `k_matchLess_idle_warn = k_matchLess_idle_time - (k_matchLess_idle_time > 30 ? 30 : (k_matchLess_idle_time / 2));` -> MISMATCH(threshold is 30, not 60: for limit > 30 the warn is exactly 30s before; the "half the limit" branch applies only when limit <= 30, so a 45s limit warns 30s before -- not at half -- contradicting "60 seconds or less")
- "Set to 0 to disable the idle check" -> src/world.c:1097 `cvar("k_matchless_max_idle_time") ? cvar("k_matchless_max_idle_time") : 0;` + match.c:638 `&& k_matchLess_idle_time` -> MATCH
- "Counted in seconds" -> src/match.c:642 `idle_time = (int)(g_globalvars.time - p->attack_finished);` -> MATCH
WI-2: n/a (bare RegisterCvar world.c:797 -> default 0)

RESULT | ktx:cvar:k_membercount | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Every clause maps to an enforcing line (CheckMembers `f1 < memcnt`, team/CTF gate, exact bprint string, 0=no-minimum); default 0 matches.
### ktx:cvar:k_membercount
- "Minimum number of players each team must have before a match can start" -> src/match.c:222 `if (f1 < memcnt) { retVal = 0; }` gating match.c:1927 `if (!CheckMembers(k_membercount))` -> MATCH
- "In team/CTF games, if any team has fewer players than this value the match is blocked from starting" -> src/match.c:1858 `if (!isTeam() && !isCTF()) { return true; }` + 222 `if (f1 < memcnt)` -> MATCH
- "players see \"Server wants at least N players in each team\"" -> src/match.c:1939 `redtext("Server wants at least"), k_membercount, redtext("players in each team")` -> MATCH
- "Counted in players per team" -> src/match.c:221 + 211-217 loop counting `streq(s, getteam(p2))` -> MATCH
- "0 means no per-team minimum" -> src/match.c:222 `if (f1 < memcnt)` (memcnt=0 -> never true) -> MATCH
WI-2: n/a (bare RegisterCvar world.c:935 = default 0, consistent with "0 means no per-team minimum")

RESULT | ktx:cvar:k_noframechecks | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Polarity (`framechecks = !cvar`), default-0-enabled, FPS-cap warn, uptime bug, disconnect-after-warnings, bots-exempt all enforced.
### ktx:cvar:k_noframechecks
- "When enabled (the default; cvar 0), the server monitors each human player's effective frame rate and machine uptime" -> src/world.c:1862 `framechecks = bound(0, !cvar("k_noframechecks"), 1);` + client.c:3824 `if (self->fDisplayIllegalFPS < g_globalvars.time && framechecks && !self->isBot)` -> MATCH
- "it warns players whose FPS exceeds the server FPS cap" -> src/client.c:3859 `if (fps > current_maxfps + 2)` -> 3863 `G_bprint( PRINT_HIGH, ... "abnormally high frame rates ...")` -> MATCH
- "or whose long machine uptime is triggering a QW client timing bug" -> src/client.c:3832 `if ((r > 103) && !match_in_progress)` -> 3837 warning -> MATCH
- "and forcibly disconnects the offending client after repeated warnings" -> src/client.c:3870 `if (self->fIllegalFPSWarnings > 3)` -> 3877 `stuffcmd(self, "disconnect\n");` (+ uptime path 3845/3849) -> MATCH
- "Set to 1 to turn this off entirely (0 = checks on, 1 = checks off)" -> src/world.c:1862 `framechecks = bound(0, !cvar("k_noframechecks"), 1);` (cvar 1 -> framechecks 0 -> gate false) -> MATCH
- "Bots are exempt" -> src/client.c:3824 `... && framechecks && !self->isBot` -> MATCH
WI-2: n/a (bare RegisterCvar world.c:946 = default 0; "the default; cvar 0" correct)

RESULT | ktx:cvar:k_pow_min_players | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | matchless+deathmatch gate, `CountPlayers() < min ? 0`, re-check timer, bound 0-999, 0-disables, outside-matchless-noop all enforced.
### ktx:cvar:k_pow_min_players
- "In matchless deathmatch mode, the minimum number of connected players required for powerups to stay enabled" -> src/g_utils.c:1791 `if (!k_pow_new || !k_matchLess || !k_pow_min_players || !deathmatch) { return (k_pow = k_pow_new); }` -> MATCH
- "When fewer than this many players are present the server automatically turns powerups off" -> src/g_utils.c:1813 `k_pow_new = CountPlayers() < k_pow_min_players ? 0 : k_pow_new;` + 1820 announce -> MATCH
- "and turns them back on once the count is met again" -> src/g_utils.c:1813 (>= min keeps value) + 1818 announce-on-change -> MATCH
- "(re-evaluated every k_pow_check_time seconds)" -> src/g_utils.c:1798 `if (k_pow_check > g_globalvars.time) { return k_pow; }` + 1816 `k_pow_check = g_globalvars.time + k_pow_check_time;` -> MATCH
- "Bounded to 0-999" -> src/g_utils.c:1786 `int k_pow_min_players = bound(0, cvar("k_pow_min_players"), 999);` -> MATCH
- "0 disables this auto-toggle" -> src/g_utils.c:1791 `... || !k_pow_min_players ...` -> MATCH
- "Has no effect outside matchless mode" -> src/g_utils.c:1791 `... || !k_matchLess ...` (comment :1793) -> MATCH
- "minimum number of connected players" -> src/g_utils.c:1813 `CountPlayers() < k_pow_min_players` -> MATCH
WI-2: n/a (bare RegisterCvar world.c:816 = default 0, consistent with "0 disables")

RESULT | ktx:cvar:k_pow_q | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Hide/no-pickup, no-drop-on-death, global-k_pow dependency, and off/on/partial reporting all enforced; RegisterCvarEx default "1" matches "1 = quad enabled".
### ktx:cvar:k_pow_q
- "Per-type switch for the Quad Damage powerup" -> src/world.c:1398 `if (k_pow && k_pow_q) { show_powerups("item_artifact_super_damage"); } else { hide_powerups("item_artifact_super_damage"); }` -> MATCH
- "0 = quad entities are hidden and cannot be picked up" -> src/world.c:1404 `hide_powerups(...)` + items.c:114/116 (hidden) + items.c:2039-2041 (cannot pick up) -> MATCH
- "and quad is not dropped on death" -> src/items.c:1974 `if ((k_killquad || (cvar("dq") && Get_Powerups() && cvar("k_pow_q"))) && !k_berzerk)` -> MATCH
- "1 = quad enabled" -> src/world.c:812 `RegisterCvarEx("k_pow_q", "1"); // quad` + world.c:1398 -> MATCH
- "Only takes effect while powerups are globally enabled (see k_pow)" -> src/world.c:1398 `if (k_pow && k_pow_q)` + items.c:111 -> MATCH
- "the per-type switches together determine whether the powerup state reports as 'off', 'on', or a partial subset" -> src/g_utils.c:1741/1750/1757 -> MATCH
WI-2: n/a (RegisterCvarEx default "1" world.c:812 consistent with "1 = quad enabled")

RESULT | ktx:cvar:k_privategame_voteable | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Every clause maps to an enforcing line; login/2-player reqs are gated on the enable path but accurately describe the primary "vote for private game" path the sentence frames.
### ktx:cvar:k_privategame_voteable
- "Controls whether players can vote to toggle private-game mode" -> src/vote.c:1502 `if (!private_game_voteable())` (private_game_voteable() = cvar("k_privategame_voteable") :1612) -> MATCH
- "a player using the private-game vote is told 'Private game not enabled on this server' and the vote is refused" -> src/vote.c:1504 `G_sprint(self, 2, "%s not enabled on this server\n", redtext("Private game"));` then return -> MATCH
- "the rules-reset routine also will not auto-apply k_privategame_default unless this is set" -> src/commands.c:4863 `if ((is_private_game() != private_game_by_default()) && private_game_voteable())` -> MATCH
- "a player must be logged in to cast the vote" -> src/vote.c:1516 `if (!enabled && !is_logged_in(self))` -> MATCH (enforcing line exists; narrowed to enable case, which is the path the sentence describes)
- "at least 2 players are required unless an admin issues it" -> src/vote.c:1524 `if (!is_adm(self))` ... 1527 `if (!enabled && CountPlayers() - CountBots() < 2)` -> MATCH
- "0 = private-game voting disabled, non-zero = enabled" -> src/vote.c:1612 `return cvar("k_privategame_voteable");` (truthiness :1502); registered default "0" world.c:1089 -> MATCH
WI-2: n/a (registered default "0" world.c:1089)

RESULT | ktx:cvar:k_race_route_mapname | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Every clause maps to a verified enforcing line in race.c.
### ktx:cvar:k_race_route_mapname
- "Stores the map name that the saved race route number (k_race_route_number) applies to" -> src/race.c:3391-3392 `cvar_fset(RACE_ROUTE_NUMBER_CVAR, next_route); cvar_set(RACE_ROUTE_MAPNAME_CVAR, mapname);` (macro race.c:32) -> MATCH
- "On a server-side route (re)load, if this matches the current map the stored route number is reloaded; otherwise the race advances to the next route" -> src/race.c:3348 `if ((self->ct != ctPlayer) && streq(cvar_string(RACE_ROUTE_MAPNAME_CVAR), mapname))` 3350 `next_route = cvar(RACE_ROUTE_NUMBER_CVAR);` 3354 `next_route++;` -> MATCH
- "It is cleared to an empty string when a custom route is set" -> src/race.c:2785 `cvar_set(RACE_ROUTE_MAPNAME_CVAR, "");` (race_route_now_custom) -> MATCH
- "rewritten to the current map name whenever a route is loaded" -> src/race.c:3392 `cvar_set(RACE_ROUTE_MAPNAME_CVAR, mapname);` -> MATCH
- "also reported (with the route number) in the LogRaceAttempt server web-post" -> src/race.c:4982 `const char *map = cvar_string(RACE_ROUTE_MAPNAME_CVAR);` 4989 `"sv_web_post ServerApi/LogRaceAttempt ... map %s routeNumber %d ..."` -> MATCH
WI-2: n/a (registered default "" world.c:927)

RESULT | ktx:cvar:k_vp_nospecs | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Clamp and toggle both map to verified enforcing lines; no default claimed so no WI-2 exposure.
### ktx:cvar:k_vp_nospecs
- "Minimum share of eligible voters (as a percentage) required to pass a /nospecs vote" -> src/vote.c:304 `percent = cvar("k_vp_nospecs");` then 343 `vt_req = ceil(percent * (CountPlayers() - CountBots()));` -> MATCH
- "which toggles the server's no-spectators mode" -> src/vote.c:954 `cvar_fset("_k_nospecs", !cvar("_k_nospecs"));` + spectate.c:125 `if (cvar("_k_nospecs"))` -> MATCH
- "Values are clamped to 51-100" -> src/vote.c:330 `percent = bound(0.51, bound(51, percent, 100) / 100, 1);` + g_utils.c:353 -> MATCH
- "below 51 is treated as 51 and above 100 as 100" -> src/vote.c:330 inner `bound(51, percent, 100)` -> MATCH
WI-2: n/a (bare RegisterCvar world.c:831 = default 0; no default claim)

RESULT | ktx:cvar:k_vp_suggestcolor | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | All clauses traced incl. the registered default "51" verified at world.c:827.
### ktx:cvar:k_vp_suggestcolor
- "Minimum share of eligible voters (as a percentage) required to pass a team color-suggestion election" -> src/vote.c:288 `percent = cvar("k_vp_suggestcolor");` then 343 `vt_req = ceil(percent * (CountPlayers() - CountBots()));` + 369 `vt_req = max(2, vt_req);` -> MATCH
- "which applies a suggested team color" -> src/vote.c:701 `SuggestColorApply();` + 1807 `stuffcmd_flags(p, STUFFCMD_IGNOREINDEMO, "color %d %d\n", suggestcolor.top, suggestcolor.bottom);` -> MATCH
- "Values are clamped to 51-100; below 51 is treated as 51 and above 100 as 100" -> src/vote.c:330 `percent = bound(0.51, bound(51, percent, 100) / 100, 1);` + g_utils.c:353 -> MATCH
- "Registered with a default of 51" -> src/world.c:827 `RegisterCvarEx("k_vp_suggestcolor", "51"); // votes percentage for color suggestion election` -> MATCH
WI-2: n/a (registered default "51" matches asserted default; verified)

RESULT | ktx:cvar:maxfps | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Threshold (+2), 4-warning kick (>3), 50-1981 clamp, reset-to-77, and registered default 77 all map to verified enforcing lines.
### ktx:cvar:maxfps
- "Sets the maximum client frame rate the server allows" -> src/world.c:1580 `current_maxfps = cvar("maxfps");` + client.c:3859 `if (fps > current_maxfps + 2)` -> MATCH
- "Clients whose measured FPS exceeds this limit by more than 2 receive a public high-frame-rate warning" -> src/client.c:3859 `if (fps > current_maxfps + 2) // 2 fps fluctuation is allowed` 3863 `G_bprint( PRINT_HIGH, ... "abnormally high frame rates ...")` -> MATCH
- "and are disconnected after four such warnings" -> src/client.c:3868 `self->fIllegalFPSWarnings += 1;` 3870 `if (self->fIllegalFPSWarnings > 3)` 3877 `stuffcmd(self, "disconnect\n");` -> MATCH
- "The value is clamped to the range 50-1981" -> src/world.c:1581 `if (current_maxfps != bound(50, current_maxfps, 1981))` + g_utils.c:353 -> MATCH
- "if set outside that range it is reset to 77" -> src/world.c:1581-1585 `if (current_maxfps != bound(50, current_maxfps, 1981)) { current_maxfps = 77; cvar_fset("maxfps", current_maxfps); }` -> MATCH
- "Registered with a default of 77" -> src/world.c:772 `RegisterCvarEx("maxfps", "77");` -> MATCH
WI-2: n/a (registered default "77" matches asserted default; verified)

RESULT | ktx:cvar:timing_players_time | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Lag-threshold semantics, 0-30 clamp, 0->6 fallback, and allow_timing gate all map to enforcing lines in CheckTiming().
### ktx:cvar:timing_players_time
- "Time in seconds a player must go without a post-think (i.e. be lagging) before the server treats them as timing out" -> src/client.c:144 `if ((p->k_lastPostThink + timing_players_time) < g_globalvars.time)` -> MATCH
- "and applies the timing_players_action effects" -> src/client.c:153/164/185 `if (timing_players_action & TA_INFO)` / `& TA_INVINCIBLE` / `& TA_GLOW` -> MATCH
- "Clamped to the range 0-30" -> src/client.c:131 `float timing_players_time = bound(0, cvar("timing_players_time"), 30);` -> MATCH
- "a value of 0 falls back to the built-in default of 6 seconds" -> src/client.c:140 `timing_players_time = timing_players_time ? timing_players_time : 6; // 6 is default` -> MATCH
- "Requires allow_timing to be enabled" -> src/client.c:135 `if (!cvar("allow_timing")) { return; }` -> MATCH
WI-2: n/a (RegisterCvar world.c:847 = registered default 0; runtime 0->6 fallback correctly described, not a registered default)

RESULT | ktx:info_key:*at:userinfo | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Server star-key write (SetUserInfo SETUSERINFO_STAR), numeric autoTrackType_t enum value, write-on-change, and read-back restore path all enforced; commented g_userinfo.c:49 is a non-load-bearing red herring.
### ktx:info_key:*at:userinfo
- "Server-set star userinfo key" -> src/commands.c:6097 `SetUserInfo(self, "*at", va("%d", self->autotrack), SETUSERINFO_STAR); // so we can restore it on level change` -> MATCH
- "recording the client's current autotrack type (the numeric atKTPRO/atBest/atPow/... enum value)" -> src/commands.c:6097 (value = `va("%d", self->autotrack)`) + include/progs.h:312-316 `atNone = 0, atBest, atPow, atKTPRO } autoTrackType_t;` -> MATCH
- "The server writes it when the player's autotrack selection changes" -> src/commands.c:6081 `void AutoTrack(float autoTrackType)` enclosing the SetUserInfo at 6097 -> MATCH
- "so the chosen autotrack mode can be restored after a level change" -> src/commands.c:6123 `autoTrackType_t at = iKey(self, "*at");` (AutoTrackRestore, called from spectate.c:225 PutSpectatorInServer) + write-site comment 6097 -> MATCH
WI-2: n/a (info_key, no default/access-class metadata claimed)
