# KTX D7 V-pass -- Stage-1 ledger, BATCH 09 (bucket 8)

D7 Amendment 2026-05-19 (B1-B5), verification-shaped read-only pass.
Oracle: `/tmp/ktx-src-67253dc9` == `1.47-2-g67253dc` (HARD GATE passed).
Partition: F-V1 strided `md5(canonical_id) % 9` == bucket 8. Population
571 (574 - 10 FIX - 3 canary controls, with the 3 canaries injected back
as F-V2 controls). **This batch N = 63** (41 command, 22 cvar). Canary
controls are NOT counted in N and are stripped from recorded output.

Method = `enforce-trace-discipline.md` (per-clause enforce-trace, r42
anti-shortcut, WI-1/WI-2/PROC-1). Execution = parallel read-only Opus-MAX
subagents in 13 waves (12x5 + 1x3 batch rows, each + 1 rotated canary).
HARD GATE 1 (canary verdict) + HARD GATE 2 (orchestrator re-grep) per
wave; rejected waves re-dispatched, not recorded.

The `RESULT |` lines are the machine spine (Stage-1 merge greps
`^RESULT |`). The `###` blocks are durable human detail. C4: read-only,
no DB write, no description edit, no re-synth.

---

<!-- Accepted-wave RESULT blocks appended below, in wave order. -->

## Round A -- waves 01-05 (25 batch rows; canaries stripped)

<!-- wave 01 (canary autotrack=C-FIX matched; HG2 re-grep held) -->
RESULT | ktx:command:16fav_go | C-FIX | flavourC=1 | wi2=0 | clauses=7 | "fav_add for the next free slot ... 16fav_go then tracks that player" is WRONG: fav_add writes self->fav[] (used by fav_next), xfav_go reads disjoint self->favx[]; also message strings mis-quoted (missing "fav go:" prefix)
### ktx:command:16fav_go
- "Spectator-only command" -> commands.c:881 `{ "16fav_go", DEF(xfav_go), 16, CF_SPECTATOR, ... }` + commands.c:1091 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) return DO_WRONG_CLASS;` -> MATCH
- "switches your point of view to the player stored in favorites slot 16" -> commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` + 5856 `stuffcmd_flags(self, ..., "track %d\n", GetUserID(p));` -> MATCH
- "Favorites slots are filled by tracking a player and running fav16_add" -> commands.c:861 `{ "fav16_add", DEF(favx_add), 16, ... }` + 5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH
- "(or fav_add for the next free slot); 16fav_go then issues a track to that saved player" -> commands.c:5614 `self->fav[(int)fav_num - 1] = diff;` vs 5831 `pl_num = self->favx[(int)fav_num - 1];`; progs.h:1009-1010 fav[] vs favx[] disjoint -> MISMATCH (fav_add populates the disjoint fav[] list used by fav_next, NOT favx[]; a fav_add'd player is unreachable by 16fav_go)
- "Prints \"slot 16 is not defined\" if the slot is empty" -> commands.c:5835 `G_sprint(self, 2, "fav go: \220slot %d\221 is not defined\n", (int)fav_num);` -> MISMATCH (trigger correct; quote drops the "fav go:" prefix + bracket formatting)
- "\"slot 16 can't find player\" if the saved player is no longer connected" -> commands.c:5844 `G_sprint(self, 2, "fav go: \220slot %d\221 can't find player\n", ...);` -> MISMATCH (condition correct; "fav go:" prefix omitted)
- "\"already observing...\" if you are already tracking that player" -> commands.c:5851 `G_sprint(self, 2, "fav go: already observing...\n");` -> MISMATCH (condition correct; actual text "fav go: already observing...", prefix dropped). "Takes no arguments (slot fixed at 16)" -> MATCH
WI-2: n/a (CF_SPECTATOR class claim verified true)

RESULT | ktx:command:2on2on2 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=13 | Every preset value exact vs _2on2on2_um_init[]; preset-then-layered-.cfg-exec, broadcast announce, sv k_free_mode==5 gate, client check_perm+k_allowed_free_modes gate, k_auto_xonx / hoony-only client blocks all traced with correct polarity and sv-vs-client scope
### ktx:command:2on2on2
- "Switches the server to KTX's built-in 2on2on2 three-team game mode" -> commands.c:819 `{ "2on2on2", DEF(UserMode), 11, ... }` + 4625 `void UserMode(float umode)` -> MATCH
- "applies the mode's preset" -> commands.c:4799 `trap_readcmd(um_list[(int)umode].initstring, buf, ...)` with um_list 2on2on2 -> _2on2on2_um_init -> MATCH
- "then execs any layered configs/usermodes/2on2on2/*.cfg overrides" -> commands.c:4809 `va("configs/usermodes/%s/default.cfg", um)` + 4830 `va("configs/usermodes/%s/%s.cfg", um, mapname)` -> MATCH
- "a chat line announcing the mode is printed" -> commands.c:4791 `G_bprint(2, "%s %s %s\n", redtext(displayname), redtext("settings enabled by"), self->netname);` -> MATCH
- "maxclients 6, k_maxclients 6" -> commands.c:4289-4290 `"maxclients 6\n" "k_maxclients 6\n"` -> MATCH
- "k_lockmin 1 and k_lockmax 3" -> commands.c:4298-4299 `"k_lockmin 1\n" "k_lockmax 3\n"` -> MATCH
- "timelimit 10" -> commands.c:4291 `"timelimit 10\n"` -> MATCH
- "k_overtime 1 with k_exttime 3" -> commands.c:4294-4295 `"k_overtime 1\n"` / `"k_exttime 3\n"` -> MATCH
- "teamplay 2" -> commands.c:4292 `"teamplay 2\n"` -> MATCH
- "deathmatch 3, k_pow 1, k_membercount 1, coop 0, k_mode 2" -> commands.c:4293,4296,4297,4288,4300 all exact -> MATCH
- "Server-side invocation requires k_free_mode 5" -> commands.c:4716 `if (k_free_mode != 5)` (sv_invoked branch) -> MATCH
- "client invocation is gated by the k_free_mode access level and the k_allowed_free_modes mask" -> commands.c:4723 `else if (!check_perm(self, k_free_mode)) return;` + 4730 `if (!(um_list[(int)umode].um_flags & k_allowed_free_modes))` -> MATCH
- "blocked when k_auto_xonx is set or on hoonymode-only maps" -> commands.c:4645-4650 hoony block + 4652-4657 `if (cvar("k_auto_xonx"))` block (client else-branch) -> MATCH
WI-2: n/a (preset values literal, verified exact; sv-vs-client is the verified sv_invoked split)

RESULT | ktx:command:6fav_go | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Spectator class, favx[5] read+track, all three error strings WITH correct "fav go:" prefix, and "corresponding fav add commands" (fav6_add->favx[5]) all map to verified enforcing lines
### ktx:command:6fav_go
- "Spectator command" -> commands.c:871 `{ "6fav_go", DEF(xfav_go), 6, CF_SPECTATOR, ... }` + 1091 class gate -> MATCH
- "switch to tracking the player saved in favourite slot 6" -> commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` (fav_num=6 -> favx[5]) + 5856 track -> MATCH
- "If slot 6 is empty it reports \"fav go: slot 6 is not defined\"" -> commands.c:5833-5835 `if ((pl_num < 1) || (pl_num > MAX_CLIENTS)) { G_sprint(self, 2, "fav go: \220slot %d\221 is not defined\n", (int)fav_num); }` -> MATCH
- "if the saved player is no longer in the game it reports \"fav go: slot 6 can't find player\"" -> commands.c:5842-5844 -> MATCH
- "if you are already tracking that player it reports \"fav go: already observing...\"" -> commands.c:5849-5851 -> MATCH
- "Favourite slots are populated by the corresponding fav add commands" -> commands.c:851 `{ "fav6_add", DEF(favx_add), 6, ... }` + 5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH ("corresponding" correctly restricts to favX_add, unlike row 16fav_go's over-broad "fav_add")
WI-2: n/a (CF_SPECTATOR class verified)

RESULT | ktx:command:deathheight:frogbot:editor | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Editor-mode gating, botcmd invocation, Z<=floor=>fall/lava death, no-arg print, clear, numeric set, max() clamp to sentinel, .bot persistence all map to verified enforcing lines
### ktx:command:deathheight:frogbot:editor
- "Frogbot route-editor command (available when bot editor mode is on)" -> bot_commands.c:2356 `{ "deathheight", FrogbotSetDeathHeight, ... }` in editor_commands[] + ~2387 `FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands` -> MATCH
- "invoked as 'botcmd deathheight'" -> commands.c:1047 `{ "botcmd", FrogbotsCommand, 0, CF_BOTH | CF_MATCHLESS | CF_PARAMS, ... }` -> MATCH
- "Sets a per-map Z floor: bot/bot-dropped item at or below this height is a fall/lava death" -> bot_bothazd.c:238 `if (dropper->s.v.origin[2] <= MapDeathHeight()) return FALL_DEATH;` (also 268,286,319) -> MATCH
- "With no argument it prints the current value" -> bot_commands.c:2072 `G_sprint(self, PRINT_HIGH, "Death height: %d\n", MapDeathHeight());` -> MATCH
- "or 'Death height: not set' when at the default sentinel" -> bot_commands.c:2066-2068 `if (MapDeathHeight() <= FB_MAPDEATHHEIGHT_DEFAULT) ... "Death height: not set\n"` -> MATCH
- "'deathheight clear' resets it to the unset sentinel" -> bot_commands.c:2082-2084 `if (streq(buffer, "clear")) SetMapDeathHeight(FB_MAPDEATHHEIGHT_DEFAULT);` -> MATCH
- "a numeric argument sets the floor ... clamped to at least the sentinel" -> bot_commands.c:2086-2088 + marker_load.c:34 `mapDeathHeight = max(height, FB_MAPDEATHHEIGHT_DEFAULT);` -> MATCH
- "persists into the saved .bot routing file" -> bot_commands.c:1012-1014 `std_fprintf(file, "SetMapDeathHeight %d\n", ...)` + marker_load.c:555-563 readback -> MATCH
WI-2: n/a (sub-command of botcmd; botcmd is CF_BOTH, not contradicted)

RESULT | ktx:command:dropquad | WI2-FIX | flavourC=0 | wi2=1 | clauses=7 | Core behaviour (flip, broadcast format, match-refusal, keeps remaining quad time, k_pow_q requirement, lost-when-off) all TRACED-CLEAN; "Admin toggle" access-class is WRONG -- flags CF_PLAYER|CF_SPC_ADMIN with no CF_PLR_ADMIN, so a non-admin player can run it
### ktx:command:dropquad
- "Admin toggle (on/off) for the dq rule" -> commands.c:741 `{ "dropquad", ToggleDropQuad, 0, CF_PLAYER | CF_SPC_ADMIN, ... }` + DoCommand 1106-1116 player branch (no CF_PLR_ADMIN -> no admin check) -> MISMATCH (a non-admin PLAYER runs it with no admin check; CF_SPC_ADMIN dormant because CF_SPECTATOR unset)
- "controls whether a player carrying Quad drops it when killed (keeps remaining time)" -> items.c:1974 `if ((k_killquad || (cvar("dq") && Get_Powerups() && cvar("k_pow_q"))) && !k_berzerk)` + 1985 `DropPowerup(self->super_damage_finished - g_globalvars.time, IT_QUAD);` -> MATCH
- "Each invocation flips the rule" -> g_utils.c:2211 `i = !cvar(cvarName);` + 2218 set -> MATCH
- "broadcasts \"<player> enables/disables DropQuad\" to everyone" -> g_utils.c:2215 `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg);` + 1834 `return (f ? "enables" : "disables");` -> MATCH
- "Refused while a match is in progress" -> commands.c:3147-3150 `if (match_in_progress) { return; }` -> MATCH
- "The drop also requires the mode's powerups to be enabled (k_pow_q)" -> items.c:1974 `... cvar("k_pow_q") ...` -> MATCH
- "when disabled, the Quad is simply lost on death" -> items.c:1974 (dq false -> no IT_QUAD DropPowerup) -> MATCH
WI-2: FIX -- access-class wrong. CF_PLAYER|CF_SPC_ADMIN; player branch has no CF_PLR_ADMIN check -> a regular non-admin player CAN run dropquad. "Admin toggle" overstates the requirement.

<!-- wave 02 RE-DISPATCHED (orig canary k_teamoverlay returned TRACED-CLEAN -> wave rejected; sharpened re-dispatch canary=C-NEAR-MISS matched; HG2 re-grep held) -->
RESULT | ktx:command:fav5_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Spectator-only, tracking-required, unconditional slot-5 overwrite, 5fav_go POV-snap all enforced
### ktx:command:fav5_add
- "Spectator command" -> commands.c:850 `{ "fav5_add", DEF(favx_add), 5, CF_SPECTATOR, ...}` + 1091 spec gate / 1106 player rejected -> MATCH
- "Stores the player you are currently tracking into indexed favourite slot 5" -> commands.c:5715 `goal = PROG_TO_EDICT(self->s.v.goalentity)` + 5732 `self->favx[(int)fav_num - 1] = diff;` (progs.h:1009 favx is favX_add store) -> MATCH
- "Does nothing unless you are tracking a real player" -> commands.c:5723 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS))` -> return -> MATCH
- "the tracked player's identity is written to slot 5 (overwriting any previous occupant)" -> commands.c:5732 unconditional assignment -> MATCH
- "5fav_go later snaps your POV to whoever occupies that slot" -> commands.c:870 `{ "5fav_go", DEF(xfav_go), 5, ...}` + 5831 read + 5856 track -> MATCH
WI-2: n/a (no default claim; CF_SPECTATOR verified)

RESULT | ktx:command:exclusive | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Admin-toggle, 0/1 flip, broadcast, k_attendees join-refusal, match-in-progress ignore all enforced
### ktx:command:exclusive
- "Admin toggle for exclusive mode" -> commands.c:1000 `{ "exclusive", ToggleExclusive, 0, CF_BOTH_ADMIN, ...}` + g_local.h:652 `CF_BOTH_ADMIN (CF_PLR_ADMIN|CF_SPC_ADMIN)` + commands.c:1096/1111 `is_adm(self)` checks -> MATCH
- "Flips the k_exclusive server cvar between 0 and 1" -> commands.c:8621 `cvar_toggle_msg(self, "k_exclusive", ...)` + g_utils.c:2211 `i = !cvar(cvarName);` + 2218 set -> MATCH
- "broadcasts the new state to all players" -> g_utils.c:2215 `G_bprint(...)` + 777 `trap_BPrint` -> MATCH
- "once active players reaches k_attendees join is refused ('Sorry, server is full') and may only connect as spectator" -> client.c:1455 `if ((CountPlayers() >= k_attendees) && cvar("k_exclusive"))` -> 1457 "Sorry, server is full\nPlease reconnect as spectator\n" + return false -> MATCH
- "when off, players can keep joining normally" -> client.c:1455 (k_exclusive==0 -> falls through to entered-the-game) -> MATCH
- "ignored while a match is in progress" -> commands.c:8615 `if (match_in_progress) { return; }` -> MATCH
WI-2: n/a ("Admin" verified CF_BOTH_ADMIN + is_adm checks)

RESULT | ktx:command:elect | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=10 | All 10 behaviour/refusal clauses map to enforcing lines in VoteAdmin (admin.c:450-537)
### ktx:command:elect
- "Starts an admin-election vote requesting server-admin rights" -> commands.c:800 `{ "elect", VoteAdmin, 0, CF_BOTH | CF_MATCHLESS, ...}` + admin.c:516 "requested admin" + 530 `elect_type = etAdmin;` -> MATCH
- "every other connected player is told to type 'yes'" -> admin.c:518-522 `for (p=world;(p=find_client(p));) if ((p != self) && (p->ct == ctPlayer)) G_sprint(p, 2, "Type %s in console to approve\n", redtext("yes"));` -> MATCH
- "the requester becomes an admin if enough approve" -> admin.c:529-536 elect entity + ElectThink; vote.c is_elected/threshold -> MATCH
- "Running it again while your own election is pending aborts it" -> admin.c:472-477 `if (is_elected(self, etAdmin)) { ... AbortElect(); return; }` -> MATCH
- "Refused if you are already an admin" -> admin.c:465-469 `if (is_adm(self)) ...` -> MATCH
- "if another election is already in progress" -> admin.c:482-486 `if (get_votes(OV_ELECT)) ...` -> MATCH
- "if the server has no admin slots (k_admins)" -> admin.c:489-493 `if (!cvar("k_admins")) ...` -> MATCH
- "if voting for admin is disabled (k_allowvoteadmin = 0)" -> admin.c:497-501 `if (!cvar("k_allowvoteadmin")) ...` -> MATCH
- "while an election cooldown timer is still active" -> admin.c:504-508 `if ((till = Q_rint(self->v.elect_block_till - g_globalvars.time)) > 0) ...` -> MATCH
- "or for a spectator while a match is in progress" -> admin.c:511 `if ((self->ct == ctSpec) && match_in_progress) { return; }` -> MATCH
WI-2: n/a (CF_BOTH|CF_MATCHLESS; spectator+match restriction enforced at admin.c:511)

RESULT | ktx:command:fav10_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Same mechanism as fav5_add, slot 10 (<= MAX_CLIENTS=32); all clauses enforced
### ktx:command:fav10_add
- "Spectator command" -> commands.c:855 `{ "fav10_add", DEF(favx_add), 10, CF_SPECTATOR, ...}` + 1091/1106 -> MATCH
- "Stores the tracked player into indexed favourite slot 10" -> commands.c:5718 bound check (10<=32) + 5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH
- "Does nothing unless tracking a real player" -> commands.c:5723 guard + return -> MATCH
- "written to slot 10 (overwriting any previous occupant)" -> commands.c:5732 unconditional -> MATCH
- "10fav_go later snaps your POV to whoever occupies that slot" -> commands.c:875 + 5831 + 5856 -> MATCH
WI-2: n/a (no default; CF_SPECTATOR verified)

RESULT | ktx:command:fav4_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Same mechanism as fav5_add, slot 4; all clauses enforced
### ktx:command:fav4_add
- "Spectator command" -> commands.c:849 `{ "fav4_add", DEF(favx_add), 4, CF_SPECTATOR, ...}` + 1091/1106 -> MATCH
- "Stores the tracked player into indexed favourite slot 4" -> commands.c:1135 arg=4 + 5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH
- "Does nothing unless tracking a real player" -> commands.c:5723 guard + return -> MATCH
- "written to slot 4 (overwriting any previous occupant)" -> commands.c:5732 unconditional -> MATCH
- "4fav_go later snaps your POV to whoever occupies that slot" -> commands.c:869 + 5831 + 5856 -> MATCH
WI-2: n/a (no default; CF_SPECTATOR verified)

<!-- wave 03 (canary k_yawnmode=TRACED-CLEAN matched; HG2 re-grep held) -->
RESULT | ktx:command:hook_crhook | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | toggle vote / majority-or-veto / hookstyle=4 / announce / CTF-only / not-during-match all map to enforcing lines in hookcrhook()
### ktx:command:hook_crhook
- "casts (or, if already cast, withdraws) your vote" -> vote.c:1346 `self->v.hookcrhook = !self->v.hookcrhook;` -> MATCH
- "to switch the grappling-hook style to crhook" -> vote.c:1362 `cvar_fset("k_ctf_hookstyle", 4)` + grapple.c:226 `if (cvar("k_ctf_hookstyle") == 4)` -> MATCH
- "When a majority is reached or an admin vetoes" -> vote.c:1358 `veto = is_admins_vote(OV_HOOKCRHOOK); if (veto || !get_votes_req(OV_HOOKCRHOOK, true))` -> MATCH
- "the server sets the hook style to crhook (k_ctf_hookstyle = 4)" -> vote.c:1362 -> MATCH
- "and announces it" -> vote.c:1363 `G_bprint(2, "%s\n", redtext(va("hook style set to crhook by %s", veto ? "admin veto" : "majority vote")))` -> MATCH
- "Only usable in CTF mode" -> vote.c:1338 `if (!isCTF()){ ... "hook style can only be set in CTF mode"; return; }` -> MATCH
- "and not while a match is in progress" -> vote.c:1331 `if (match_in_progress){ ... return; }` (in-function guard) -> MATCH
WI-2: n/a (no admin/player/spectator or default claim)

RESULT | ktx:command:fav_del | WI2-FIX | flavourC=0 | wi2=1 | clauses=5 | Core POV-favourite removal fully traced; "not during a match" is inverted-polarity CF_MATCHLESS misread -- command IS dispatchable during a live match
### ktx:command:fav_del
- "Spectator command (usable only by spectators)" -> commands.c:887 `{ "fav_del", fav_del, 0, CF_SPECTATOR | CF_MATCHLESS, ...}` + 1091 class gate -> MATCH
- "and not during a match" -> commands.c:1078 `if (k_matchLess && !(cmds[icmd].cf_flags & CF_MATCHLESS)) return DO_CMD_DISALLOWED_MATCHLESS;` (CF_MATCHLESS additive; no CF_MATCHLESS_ONLY; no match_in_progress in fav_del body 5676-5694) -> MISMATCH (command runs during a live match for any spectator -- inverted flag-name inference)
- "Removes the player the spectator is currently tracking" -> commands.c:5677 `gedict_t *goal = PROG_TO_EDICT(self->s.v.goalentity)` -> MATCH
- "from that spectator's personal favourites list" -> commands.c:5638 `s->fav[fav_num] = 0;` -> MATCH
- "Reports an error if not tracking / not on the list" -> commands.c:5683 not-tracking msg + 5693 "is not in favourites" -> MATCH
WI-2: FIX -- "not during a match" wrong vs CF_MATCHLESS dispatch (commands.c:1078); additive flag, not match-gated. Spectator-only class portion correct.

RESULT | ktx:command:freshpacks | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Toggle target, backpack-ammo limiting effect, broadcast, FreshTeams prerequisite, and match/race refusal all map to enforcing lines
### ktx:command:freshpacks
- "Toggles the FreshPacks rule (k_freshteams_limit_packs) on or off" -> commands.c:7647 `cvar_toggle_msg(self, "k_freshteams_limit_packs", ...)` -> MATCH
- "limits the ammo carried in dropped backpacks while playing FreshTeams" -> items.c:2672 `qbool fresh_packs = (cvar("k_freshteams") && cvar("k_freshteams_limit_packs"))` + items.c:2836 `bound(0, ammo_shells, cvar("k_freshteams_pack_shells"))` (+nails/rockets/cells) -> MATCH
- "It flips the cvar between off (0) and on (1)" -> g_utils.c:2210 `i = !cvar(cvarName);` + set -> MATCH
- "and broadcasts the new state" -> g_utils.c:2214 `G_bprint(...)` -> MATCH
- "FreshTeams must already be enabled (/fresh)" -> commands.c:7641 `if (!k_freshteams){ ... "FreshPacks requires FreshTeams (/fresh)"; return; }` -> MATCH
- "refuses while a match is in progress or race mode active" -> commands.c:7636 `if (!is_rules_change_allowed()) return;` -> 9035 `if (match_in_progress)...` + 9041 `if (isRACE())...` -> MATCH
WI-2: n/a (no class/default claim asserted)

RESULT | ktx:command:fav_next | WI2-FIX | flavourC=0 | wi2=1 | clauses=7 | POV next-favourite traversal (advance / wrap-to-first / empty / already-observing) fully traced; "not during a match" is the same inverted CF_MATCHLESS misread
### ktx:command:fav_next
- "Spectator command (usable only by spectators)" -> commands.c:889 `{ "fav_next", fav_next, 0, CF_SPECTATOR | CF_MATCHLESS, ...}` + 1091 -> MATCH
- "and not during a match" -> commands.c:1078 (CF_MATCHLESS additive, no _ONLY; no match gate in fav_next body 5735-5816) -> MISMATCH (dispatchable during a live match; inverted flag-name inference)
- "Switches POV to the next player on the personal favourites list" -> commands.c:5815 `stuffcmd_flags(self, ..., "track %d\n", GetUserID(p))` where p = world + self->fav[fav_num-1] -> MATCH
- "if currently tracking a favourite, advances to the following entry" -> commands.c:5765 advance logic + 5777 `fav_num = desired_fav + 1;` -> MATCH
- "otherwise jumps to the first favourite" -> commands.c:5781 `else { fav_num = first_fav + 1; }` -> MATCH
- "Reports an error if the favourites list is empty" -> commands.c:5749 `if (fav_num >= MAX_CLIENTS){ ... "favourites list is empty"; return; }` -> MATCH
- "does nothing if already observing that player" -> commands.c:5811 `if (PROG_TO_EDICT(self->s.v.goalentity) == p){ ... "already observing..."; return; }` -> MATCH
WI-2: FIX -- "not during a match" wrong vs CF_MATCHLESS dispatch (commands.c:1078); additive flag. Spectator-only class portion correct.

RESULT | ktx:command:freshguns | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Toggle target, sweep-ammo limiting effect, broadcast, FreshTeams prerequisite, and match/race refusal all map to enforcing lines
### ktx:command:freshguns
- "Toggles the FreshGuns rule (k_freshteams_limit_sweep_ammo) on or off" -> commands.c:7668 `cvar_toggle_msg(self, "k_freshteams_limit_sweep_ammo", ...)` -> MATCH
- "limits the ammo granted when sweeping a weapon while playing FreshTeams" -> items.c:810 `int limit_sweep_ammo = cvar("k_freshteams_limit_sweep_ammo")` + items.c:892 SSG branch (+NG/SNG/RL/GL/LG 854-959) -> MATCH
- "It flips the cvar between off (0) and on (1)" -> g_utils.c:2210 -> MATCH
- "and broadcasts the new state" -> g_utils.c:2214 -> MATCH
- "FreshTeams must already be enabled (/fresh)" -> commands.c:7661 `if (!k_freshteams){ ... "FreshGuns requires FreshTeams (/fresh)"; return; }` -> MATCH
- "refuses while a match is in progress or race mode active" -> commands.c:7656 `if (!is_rules_change_allowed()) return;` -> 9035/9041 -> MATCH
WI-2: n/a (no class/default claim asserted)

<!-- wave 04 (canary autotrack=C-FIX matched; HG2 re-grep held) -->
RESULT | ktx:command:kinfo | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=8 | Core dispatch/format/argc all verified; "empty value removes the key" has no enforcing line in KTX (trap_SetUserInfo is the engine boundary; only a code comment corroborates it)
### ktx:command:kinfo
- "Inspects or sets the calling client's own userinfo keys" -> g_userinfo.c:109,118 `G_sprint(self,2,"key %s = \"%s\"\n",...)` / `SetUserInfo(self,arg_1,arg_2,0)` (all target self) -> MATCH
- "mod-side userinfo keys" -> g_userinfo.c:102 `stuffcmd_flags(self,...,"cmd setinfo\n")` -> MATCH
- "no arguments (or more than two) -> list all setinfo keys" -> g_userinfo.c:99-104 `if ((argc == 1) || (argc > 3)) { ... return; }` -> MATCH
- "one argument -> prints value as key <k> = \"<v>\"" -> g_userinfo.c:106-110 `if (argc == 2) G_sprint(...,"key %s = \"%s\"\n",...)` -> MATCH
- "two arguments -> sets that userinfo key" -> g_userinfo.c:114-118 `if (argc == 3) SetUserInfo(self,arg_1,arg_2,0)` -> MATCH
- "an empty value removes the key" -> g_utils.c:2749 `trap_SetUserInfo(...)` (g_syscalls.c:459 pure syscall trampoline) -> UNTRACEABLE (empty-removes is engine/mvdsv behaviour; KTX has no enforcing line, only the comment g_userinfo.c:117)
- "Available to players and spectators" -> commands.c:940 `CF_BOTH | CF_MATCHLESS | CF_PARAMS` + 1091/1106 (no admin gate) -> MATCH
- "usable outside a match" -> commands.c:1078 (kinfo has CF_MATCHLESS) + no match guard -> MATCH
WI-2: n/a ("players and spectators" verified vs CF_BOTH + dispatch)

RESULT | ktx:command:hook_smooth | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Every clause maps to an enforcing line incl. exact cvar k_ctf_hookstyle=1, both veto/majority triggers, in-function CTF + match_in_progress guards
### ktx:command:hook_smooth
- "casts (or, if already cast, withdraws) your vote" -> vote.c:1215 `self->v.hooksmooth = !self->v.hooksmooth` + 1223-1226 bprint -> MATCH
- "to switch the grappling-hook style to smooth" -> vote.c:1231 `cvar_fset("k_ctf_hookstyle", 1)` -> MATCH
- "majority reached or admin veto -> k_ctf_hookstyle = 1" -> vote.c:1229-1233 `if (veto || !get_votes_req(OV_HOOKSMOOTH,true)) { cvar_fset("k_ctf_hookstyle",1); ...}` ; veto = is_admins_vote -> MATCH
- "and announces it" -> vote.c:1232 `G_bprint(2,"%s\n",redtext(va("hook style set to smooth by %s",veto?"admin veto":"majority vote")))` -> MATCH
- "Only usable in CTF mode" -> vote.c:1206-1209 `if (!isCTF()) { ... return; }` -> MATCH
- "not while a match is in progress" -> vote.c:1198-1202 `if (match_in_progress) { ... return; }` -> MATCH
WI-2: n/a (no default/access-class claim)

RESULT | ktx:command:instagib_coilgun_kickback | C-FIX | flavourC=1 | wi2=0 | clauses=8 | Toggle/kickback-projectile/instagib-gate/match-guard/access-class verified; broadcast wording WRONG -- actual text is "<name> enables/disables Coilgun kickback", not "Coilgun kickback ON/OFF"
### ktx:command:instagib_coilgun_kickback
- "Toggles self-knockback on the Instagib coilgun by flipping k_cg_kb" -> commands.c:7898 `cvar_toggle_msg(self,"k_cg_kb",...)` + g_utils.c:2210,2217 -> MATCH
- "When on, each shot spawns an invisible kickback projectile that pushes the shooter" -> weapons.c:438-470 `if (cvar("k_cg_kb")) { ... newmis->classname="kickback"; setmodel(newmis,""); newmis->touch=T_InstaKickback; }` + 940 `T_RadiusDamage(...,120,...,dtRL)` -> MATCH
- "enabling coilgun-jumping" -> weapons.c:940 self-blast (RL-style) -> MATCH
- "when off, the coilgun imparts no recoil" -> weapons.c:438 `if (cvar("k_cg_kb"))` wraps the entire kickback spawn -> MATCH
- "Requires Instagib (k_instagib non-zero) or refused with \"cg_kb requires Instagib\"" -> commands.c:7891-7895 `if (!cvar("k_instagib")) { ... "cg_kb requires Instagib\n"; return; }` -> MATCH
- "Player/spectator-admin command" -> commands.c:959 `CF_PLAYER | CF_SPC_ADMIN` + 1447 `if (cf_flags & CF_SPC_ADMIN) cf_flags |= CF_SPECTATOR` + 1091/1096/1106 -> MATCH
- "ignored while a match is in progress" -> commands.c:7886-7889 `if (match_in_progress) { return; }` -> MATCH
- "Broadcasts \"Coilgun kickback ON\" / \"OFF\" on toggle" -> g_utils.c:2215 `G_bprint(2,"%s %s %s\n",p->netname,Enables(i),msg)` + 1834 `return (f ? "enables" : "disables")` (msg=redtext("Coilgun kickback")) -> MISMATCH (actual broadcast is "<netname> enables|disables Coilgun kickback"; the quoted "ON"/"OFF" string is never produced)
WI-2: n/a (access-class verified MATCH vs runtime CF flags after Init_cmds + DoCommand; no default claim)

RESULT | ktx:command:mapslist_dl | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | Every clause maps to an enforcing line incl. exact strings, STUFF_MAPS idempotency, nomaps>0 skip, command-list trigger
### ktx:command:mapslist_dl
- "Client-to-server protocol helper that transfers the server's map list to the requesting client" -> maps.c:244 `mapslist_dl(void)` stuffs to self + commands.c:699 `CF_NOALIAS | CF_CONNECTION_FLOOD` -> MATCH
- "as 'votemap' shortcut aliases (batches via ktx_am8 / ktx_am4 / single 'alias' stuffs)" -> maps.c:278-289 + 340-348 StuffMaps defines ktx_am4/ktx_am8 as `cmd votemap %N` -> MATCH
- "or as 'cmd cm <n>' aliases for non-param clients" -> maps.c:303-313 else-branch -> MATCH
- "takes a numeric start offset" -> maps.c:272-274 `from = bound(0,atoi(arg_2),maps_cnt)` -> MATCH
- "re-requests itself ('cmd mapslist_dl <i>') until done ('Maps loaded')" -> maps.c:316-322 `if (i < maps_cnt) { stuffcmd "cmd mapslist_dl %d\n"; return; }` then 324 "Maps loaded\n" -> MATCH
- "then triggers the command-list transfer" -> maps.c:329-332 `if (!(self->k_stuff & STUFF_COMMANDS)) StuffModCommands(self)` -> commands.c:1424 `cmd cmdslist_dl 0` -> MATCH
- "idempotent per client ('mapslist already stuffed' once STUFF_MAPS set)" -> maps.c:257-262 `if (self->k_stuff & STUFF_MAPS) { ... "mapslist already stuffed\n"; return; }` -> MATCH
- "skipped when client's 'nomaps' userinfo > 0" -> maps.c:251-255 `skip_maps = atoi(infokey(self,"nomaps",...)) > 0; if (skip_maps) goto skip_map_stuffing;` -> MATCH
- "Not operator-facing; part of connection/handshake flow" -> commands.c:699 `CF_NOALIAS | CF_CONNECTION_FLOOD` + maps.c:349 connect-time `cmd mapslist_dl 0` -> MATCH
WI-2: n/a (no access/default claim)

RESULT | ktx:command:nohook | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Every clause maps to an enforcing line incl. exact cvar k_ctf_hook, AddHook live-player loop, and the precise match_in_progress && !k_matchLess block-with-matchless-exception
### ktx:command:nohook
- "Toggles the grappling hook for CTF by flipping k_ctf_hook" -> ctf.c:771 `cvar_toggle_msg(self,"k_ctf_hook",redtext("hook"))` + g_utils.c:2210,2217 -> MATCH
- "the new state is announced server-wide" -> g_utils.c:2215 `G_bprint(...)` (no verbatim ON/OFF string quoted -> no wording mismatch) -> MATCH
- "In matchless mode the hook is added or removed live for current players" -> ctf.c:774-784 `if (k_matchLess) { if (cvar("k_ctf_hook")) AddHook(true); else AddHook(false); }` + 184-211 AddHook loop -> MATCH
- "Only works in CTF mode" -> ctf.c:764-768 `if (!isCTF()) { ... "Can't do this in non CTF mode"; return; }` -> MATCH
- "blocked while a match is in progress unless server is in matchless mode" -> ctf.c:760-763 `if (match_in_progress && !k_matchLess) { return; }` -> MATCH
WI-2: n/a (no default/access-class claim)

<!-- wave 05 RE-DISPATCHED (orig canary k_teamoverlay returned TRACED-CLEAN -> wave rejected; sharpened re-dispatch canary=C-NEAR-MISS matched; HG2 re-grep held) -->
RESULT | ktx:command:qenemy | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=4 | Restriction-polarity clause is FPD-model-inferred, corroborated by KTX status sites (OnOff(i&32)) but has NO enforcing read-site on ToggleQEnemy's own path; the only feature-path observable (Allowed(fpd&32)=>"allowed" when set) reads opposite
### ktx:command:qenemy
- "Toggles ... by flipping bit 32 of the server's fpd serverinfo key and re-broadcasting it" -> commands.c:3712 `fpd ^= 32;` + 3714 `localcmd("serverinfo fpd %d\n", fpd);` (serverinfo change propagates) -> MATCH
- "When the bit is set, clients are restricted from using the QiZmo proxy's enemy-nearby reporting" -> commands.c:3716 `G_bprint(2, "%s %s\n", redtext("QiZmo enemy reporting"), Allowed(fpd & 32));` + g_utils.c:1849 `return (f ? "allowed" : "disallowed");` -> UNTRACEABLE on feature path (restriction enforced by EXTERNAL QiZmo proxy, no KTX read-site; corroborated correct by status sites commands.c:2021 `OnOff(i & 32)` + match.c:2130-2133, but ToggleQEnemy's own announce uses Allowed(fpd&32) => "allowed" when SET, opposite to "restricted")
- "the new on/off state is announced to all players" -> commands.c:3716 `G_bprint(2, ...)` broadcast -> MATCH (wording "allowed"/"disallowed" vs literal "on/off" is minor still-true vagueness)
- "Has no effect while a match is in progress" -> commands.c:3707-3710 `if (match_in_progress) { return; }` -> MATCH
WI-2: n/a (CF_PLAYER|CF_SPC_ADMIN; no default/access-class claim)

RESULT | ktx:command:race_chasecam_view | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Cycle+wrap, 4 named modes in stated order, racer-exclusion, and race-mode precondition all map to enforcing lines
### ktx:command:race_chasecam_view
- "Cycles the spectator's race chasecam through view modes, one step per invocation" -> race.c:2295 `self->race_chasecam_view++;` -> MATCH
- "wrapping back to the start" -> race.c:2296-2299 `if (self->race_chasecam_view == NUM_CHASECAMS) { self->race_chasecam_view = 0; }` (include/progs.h:1334 NUM_CHASECAMS 4) -> MATCH
- "four modes: 1st person, 3rd person, hawk eye, backpack ride" -> race.c:2301-2321 switch cases 0-3 G_sprint per mode -> MATCH
- "the new mode is printed each time" -> race.c:2304-2316 `G_sprint(self, 2, "Chasecam is in %s view mode\n", ...)` -> MATCH
- "Has no effect if the caller is a racer or race-mode preconditions not met" -> race.c:2290 `if (self->racer) return;` + 2285 `if (!race_command_checks()) return;` (race_command_checks: `if (!isRACE()) return false`) -> MATCH
WI-2: n/a (CF_PLAYER; no default/scope-class asserted)

RESULT | ktx:command:pos_move | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Restore of origin/angles/velocity from slot, one-move-per-second limit, and named Pos_Disallowed gate all map to enforcing lines
### ktx:command:pos_move
- "Restores the player's saved position -- origin, view angles, and velocity" -> commands.c:6530 `Pos_Set_origin(pos)` (setorigin 6497) + 6535 `Pos_Set_angles(pos)` (6501-6505) + 6536 `Pos_Set_velocity(pos)` (6506) -> MATCH
- "from the previously stored position slot" -> commands.c:6528 `pos = &(self->pos[idx = Pos_Get_idx()]);` -> MATCH
- "Rate-limited to one move per second" -> commands.c:6519-6524 `if (self->pos_move_time && ((self->pos_move_time + 1) > g_globalvars.time)) { ... "Only one move per second allowed"; return; }` -> MATCH
- "subject to the server's position-command restrictions (Pos_Disallowed)" -> commands.c:6406 `#define Pos_Disallowed() (match_in_progress || intermission_running || cvar("sv_paused") || (isRACE() && race.status))` + 6514 `if (Pos_Disallowed()) return;` -> MATCH
WI-2: n/a (CF_BOTH|CF_PARAMS; no scope-class/default asserted)

RESULT | ktx:command:options | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=17 | ShowOpts is a single G_sprint listing exactly the enumerated match-control commands; zero state mutation in the function body
### ktx:command:options
- "Prints a reference list of available match-control commands, each with a one-line description" -> commands.c:1553-1583 `ShowOpts(void)` single `G_sprint(self, 2, ...)` -> MATCH
- "match-time +/-1 and +/-5 minutes" -> commands.c:1555-1558 timedown1/timeup1/timedown/timeup -> MATCH
- "fraglimit +/-10" -> commands.c:1559-1560 fragsdown/fragsup -> MATCH
- "change deathmatch/teamplay mode" -> commands.c:1561-1562 dm/tp -> MATCH
- "drop quad/ring/pack on death" -> commands.c:1563-1565 dropquad/dropring/droppacks -> MATCH
- "locking mode" -> commands.c:1566 lock -> MATCH
- "spawntype" -> commands.c:1567 spawn -> MATCH
- "toggle sv_maxspeed" -> commands.c:1568 speed -> MATCH
- "powerups" -> commands.c:1569 powerups -> MATCH
- "fair packs" -> commands.c:1570 fairpacks -> MATCH
- "underwater discharge" -> commands.c:1571 discharge -> MATCH
- "spectator talk" -> commands.c:1572 silence -> MATCH
- "midair" -> commands.c:1573 midair -> MATCH
- "grenade" -> commands.c:1574 gren_mode -> MATCH
- "instagib" -> commands.c:1575 instagib -> MATCH
- "berzerk" -> commands.c:1576 berzerk -> MATCH
- "only displays the list and does not change any server state" -> commands.c:1553-1583 body is a single G_sprint, no mutation -> MATCH
WI-2: n/a (CF_PLAYER; no default/scope-class asserted)

RESULT | ktx:command:race_chasecam_freelook | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Toggle, enabled/disabled print, free-vs-fixed-angle semantic, and race-mode precondition all map to enforcing lines
### ktx:command:race_chasecam_freelook
- "Toggles the spectator's race chasecam freelook on or off" -> race.c:2266 `self->race_chasecam_freelook = !self->race_chasecam_freelook;` -> MATCH
- "prints the new state ('Chasecam freelook enabled/disabled')" -> race.c:2268-2277 switch case0 "disabled" / case1 "enabled" -> MATCH
- "With freelook enabled the spectator can look around freely while in chasecam" -> race.c:2434-2437 `if (!self->race_chasecam_freelook) { self->s.v.fixangle = true; }` (enabled -> not forced = free) -> MATCH
- "Has no effect when race-mode preconditions not met" -> race.c:2261-2264 `if (!race_command_checks()) return;` (isRACE gate) -> MATCH
WI-2: n/a (CF_PLAYER; no default/scope-class asserted)

## Round B -- waves 06-10 (25 batch rows; canaries stripped)

<!-- wave 06 (canary k_yawnmode=TRACED-CLEAN matched; HG2 2 load-bearing clean held) -->
RESULT | ktx:command:race_route_clear | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | All five side-effects plus both scope guards map to enforcing lines in r_clear_route; node-removal loop spans start/checkpoint/end
### ktx:command:race_route_clear
- "removes all route entities (start, checkpoints, finish)" -> race.c:3217 `race_remove_ent();` -> race.c:710 `for (i = 1; i < nodeMAX; i++) ent_remove_by_classname(classname_for_nodeType(i));` -> MATCH
- "restores every player's full weapon set" -> race.c:3215 `for (p = world; (p = find_plr(p));) { setwepall(p); ... }` + race.c:426 all 8 weapons + 255 ammo -> MATCH
- "unmutes all players" -> race.c:3216 `p->muted = 0;` -> MATCH
- "clears the pacemaker" -> race.c:3220 `race_clear_pacemaker();` -> race.c:4960 memset+remove indicator -> MATCH
- "broadcasts that the route was cleared" -> race.c:3219 `G_bprint(2, "%s cleared the current route\n", self->netname);` -> MATCH
- "Only works in race mode" -> race.c:3214 `if (!race_command_checks()) return;` -> race.c:2953 `if (!isRACE())...return false;` -> MATCH
- "refused while a race run is in progress" -> race.c:3219 `if (race_is_started()) return;` -> race.c:2966 `if (race.status)...` -> MATCH
WI-2: n/a

RESULT | ktx:command:race_countdown_down | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | -1 arg, strict (0,6) range, no-write/report-current else branch, and triple ignore-guard all verified at RaceCountdownChange
### ktx:command:race_countdown_down
- "Decreases the race start countdown length by 1 second (k_race_countdown)" -> commands.c:697 `{ "race_countdown_down", DEF(RaceCountdownChange), -1, ... }` + race.c:276 `float rcd = cvar("k_race_countdown") + t;` + race.c:285 `cvar_fset("k_race_countdown", (int)rcd);` -> MATCH
- "accepted only while strictly >0 and <6" -> race.c:283 `if ((rcd < 6) && (rcd > 0))` -> MATCH
- "otherwise unchanged and current length reported" -> race.c:289 `G_sprint(self, 2, "%s still %s\n", redtext("race countdown"), dig3(rcd - t));` (no cvar write) -> MATCH
- "ignored unless race mode active, no match in progress, race not started" -> race.c:278 `if (match_in_progress || !isRACE() || race_is_started()) return;` -> MATCH
WI-2: n/a

RESULT | ktx:command:race_set_start | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Position+facing storage chains through to racer spawn angle (fixangle); max-node and race-running guards verified; CF_PLAYER|CF_SPC_ADMIN matches "player / spectator-admin" and is dispatch-enforced
### ktx:command:race_set_start
- "Race-mode route editing command (player / spectator-admin)" -> commands.c:1013 `{ "race_set_start", DEF(r_Xset), 1, CF_PLAYER | CF_SPC_ADMIN, CD_R_SSET }` + dispatch 1106/1096 (CF_PLAYER + CF_SPC_ADMIN->is_adm; CF_SPC_ADMIN auto-adds CF_SPECTATOR at 1448-1450) -> MATCH
- "Places the race start gate at the caller's current position AND facing" -> race.c:2814 `VectorCopy(self->s.v.v_angle, node.ang); VectorCopy(self->s.v.origin, node.org);` -> MATCH
- "start node stores view angles so racers spawn aimed down the route" -> race.c:1730 `VectorCopy(node->ang, e->s.v.v_angle);` + race.c:2149 `VectorCopy(s->s.v.v_angle, r->s.v.angles); ... r->s.v.fixangle = true;` -> MATCH (full chain)
- "no effect if the race is already running" -> race.c:2797 `if (race_is_started()) return;` -> MATCH
- "or if the route already holds the maximum number of nodes" -> race.c:2802 `if (checkpoints_count() >= MAX_ROUTE_NODES) {...; return;}` -> MATCH
- "On success broadcasts the start-node coordinates and direction" -> race.c:2824 `G_bprint(2, "Coordinates: ...")` + `G_bprint(2, "Direction: ...")` -> MATCH
- "flags the route as a custom (non-preset) route" -> race.c:2838 `race_route_now_custom();` -> race.c:2781 active_route=0 + cvar_fset RACE_ROUTE_NUMBER_CVAR -1 -> MATCH
WI-2: access-class "player / spectator-admin" verified vs CF_PLAYER|CF_SPC_ADMIN + dispatch (commands.c:1096/1106)

RESULT | ktx:command:race_match | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | sv_silentrecord polarity (on->0, off->1) verified against post-toggle cvar read
### ktx:command:race_match
- "Toggles race match mode (k_race_match) and announces the new state" -> race.c:5243 `cvar_toggle_msg(self, RACE_MATCH_CVAR, redtext("match mode"));` -> g_utils.c:2210 `i = !cvar(cvarName);` + announce + set -> MATCH
- "Turning match mode on also sets sv_silentrecord 0; off sets 1" -> race.c:5244 `cvar_fset("sv_silentrecord", cvar(RACE_MATCH_CVAR) ? 0 : 1);` (cvar_toggle_msg already wrote the new value -> post-toggle: on->0, off->1) -> MATCH
- "Only works in race mode" -> race.c:5233 `if (!race_command_checks()) return;` (isRACE gate) -> MATCH
- "refused while a race run is in progress" -> race.c:5238 `if (race_is_started()) return;` -> MATCH
WI-2: n/a

RESULT | ktx:command:race_del_checkpoint | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Highest-id selection, both scope guards, and the no-checkpoints error all verified at r_cdel
### ktx:command:race_del_checkpoint
- "Removes the highest-numbered checkpoint from the current map's race route" -> race.c:2846 `classname = classname_for_nodeType(nodeCheckPoint);` + 2868 `for (...) id = max(id, e->race_id);` + 2874-2879 `if (id == e->race_id) { ent_remove(e); break; }` -> MATCH
- "Only works in race mode" -> race.c:2848 `if (!race_command_checks()) return;` -> MATCH
- "only while no race run is in progress" -> race.c:2853 `if (race_is_started()) return;` -> MATCH
- "prints an error if the route has no checkpoints" -> race.c:2857 `cnt = find_cnt(FOFCLSN, classname); if (!cnt) { G_sprint(self, 2, "Can't find any %s\n", ...); return; }` -> MATCH
WI-2: n/a

<!-- wave 07 (canary autotrack=C-FIX matched; HG2 flagged report+teleportcap + clean s-r held) -->
RESULT | ktx:command:setmarkerflag:frogbot:editor | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Letter->flag decode, OR-onto-existing, error cases, editor-only gating, and "no live gameplay change" all map to enforcing lines
### ktx:command:setmarkerflag:frogbot:editor
- "Frogbot waypoint-editor subcommand" -> bot_commands.c:2341 `{ "setmarkerflag", FrogbotSetMarkerFlag, ... }` in editor_commands[] reachable only via 2386 `FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands` -> MATCH
- "Adds (bitwise-ORs) behavior flags onto the routing marker nearest the editing player" -> bot_commands.c:1530 `nearest->fb.T |= flags;` (nearest = LocateMarker(self->s.v.origin), 1509) -> MATCH
- "letter codes u/6/f/b/t/e/n decode to UNREACHABLE/DM6_DOOR/FIRE_ON_MATCH_START/BLOCKED_ON_STATE_TOP/DOOR_TOUCHABLE/ESCAPE_ROUTE/NOTOUCH" -> marker_load.c:96-122 switch cases -> MATCH
- "any other letter is ignored" -> marker_load.c:94-123 switch has no default: -> MATCH
- "Existing flags are preserved" -> bot_commands.c:1530 `|=` (OR, not assign) -> MATCH
- "on success prints the marker's new combined flag set" -> bot_commands.c:1531 `G_sprint(... "Marker flags set, now: %s\n", EncodeMarkerFlags(nearest->fb.T))` -> MATCH
- "Errors if no marker nearby / no flag arg / decodes to no valid flags" -> bot_commands.c:1512-1517 / 1519-1524 / 1528-1537 -> MATCH
- "does not change live gameplay by itself" -> handler writes only nearest->fb.T (routing-flag field); editor-mode gated -> MATCH
WI-2: n/a

RESULT | ktx:command:report | C-FIX | flavourC=1 | wi2=0 | clauses=8 | "nothing is shown to the caller" is WRONG: find_plr returns self and the same-team filter does not exclude self, so the caller DOES receive; "living" also unenforced
### ktx:command:report
- "Sends a private teamplay status report to each living teammate" -> commands.c:2623 `for (p = world; (p = find_plr(p));)`; find_plr g_utils.c:1315 returns ANY ctPlayer with NO health/alive check -> MISMATCH ("living" unenforced -- a dead teammate awaiting respawn is still ctPlayer and receives)
- "armor type and value (or a:0 if none)" -> commands.c:2646-2653 `if (self->s.v.armorvalue) ... else G_sprint(p,3,"a:0")` -> MATCH
- "current health" -> commands.c:2655 `G_sprint(p, 3, "  h:%d  %s%d", (int)self->s.v.health, ...)` -> MATCH
- "active weapon and ammo count" -> commands.c:2576-2619 weapon/ammo select + 2655 `%s%d` -> MATCH
- "red-text marker for Ring (eyes), Pentagram (666), Quad" -> commands.c:2657-2670 `& 524288 ... "eyes"` / `& 1048576 ... "666"` / `& 4194304 ... "quad"` (g_consts.h IT_INVISIBILITY/IT_INVULNERABILITY/IT_QUAD) -> MATCH
- "Only teammates on the same team receive" -> commands.c:2625 `if (strneq(t1, t2 = getteam(p))) continue;` (t1 = getteam(self)) -> MATCH
- "nothing is shown to enemies" -> same filter 2625 drops different-team -> MATCH
- "or to the caller" -> commands.c:2623 find_plr iterates ALL ctPlayer incl. self; 2625 does NOT exclude self (self shares self's team) -> G_sprint(p=self,...) fires -> MISMATCH (the caller DOES receive the full report; no p==self skip on the path)
WI-2: n/a (recipient-scope error is core behaviour -> C-FIX, not WI-2)

RESULT | ktx:command:s-r | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | reply-to-last-from target, usage string, not-connected error, dual echo strings, match player/spec block, and chain-update all map to s_lr/s_common enforcing lines
### ktx:command:s-r
- "Sends a private chat message replying to the last player who privately messaged you" -> g_cmd.c:347-349 s-r -> s_lr(2); g_cmd.c:649 `p = (l == 1 ? self->s_last_to : self->s_last_from)` (l==2 -> s_last_from); set g_cmd.c:587 -> MATCH
- "Usage: s-r <text> (>=1 arg, else 'usage: s-r txt')" -> g_cmd.c:642-647 `if (argc < 3) { G_sprint(self,2,"usage: %s txt\n",(l==1?"s-l":"s-r")); return; }` -> MATCH
- "recipient is whoever most recently sent you a private message (server tracks per player)" -> per-edict self->s_last_from set in s_common g_cmd.c:587 -> MATCH (still-true minor narrowing on "via s-p")
- "s-l differs only in that it targets the last player you sent to" -> g_cmd.c:649 `l==1 ? self->s_last_to`; set g_cmd.c:586 -> MATCH
- "If that player no longer connected prints 's-r: client not found'" -> g_cmd.c:651-661 `else { G_sprint(self,2,"%s: client not found\n",(l==1?"s-l":"s-r")); }` -> MATCH
- "recipient sees '[<yourname>->]: text'" -> s_common g_cmd.c:597 `"[%s->]: %s\n", getname(from), msg` -> MATCH
- "you see '[-><recipientname>]: text'" -> s_common g_cmd.c:598 `"[->%s]: %s\n", getname(to), msg` -> MATCH
- "During a match a player and a spectator cannot exchange these" -> s_common g_cmd.c:581-584 `if (match_in_progress && (from->ct != to->ct)) return;` -> MATCH
- "Sending also updates last-to/last-from so replies keep chaining" -> s_common g_cmd.c:586-587 `from->s_last_to = to; to->s_last_from = from;` -> MATCH
WI-2: n/a

RESULT | ktx:command:teleportcap | C-FIX | flavourC=1 | wi2=0 | clauses=8 | "called with no argument it prints the current cap" is WRONG: the print branch needs match_in_progress||argc<1; argc is never <1, so no-arg + no-match falls through to atoi("")=0 and SETS cap to 0
### ktx:command:teleportcap
- "Sets the teleport-cap percentage used by yawn mode" -> commands.c:8674-8676 sets k_teleport_cap; consumed triggers.c:582-588 `if (k_yawnmode) ... vel = vlen(...)*(1.0 - k_teleport_cap/100.0)` -> MATCH
- "Yawn mode must be on; if off does nothing and reports yawn mode required" -> commands.c:8659-8664 `if (!k_yawnmode) { G_sprint(self,2,"%s required to be on\n", redtext("Yawn mode")); return; }` -> MATCH
- "Called with no argument (or while a match in progress) prints the current cap" -> commands.c:8666 `if (match_in_progress || trap_CmdArgc() < 1) { G_sprint(...,"%s is %d%%\n", redtext("Teleport cap"), k_teleport_cap); return; }` ; argv(0) is always the command token so a bare invocation has argc==1 and `1 < 1` is FALSE -> with NO arg and NO match the branch is NOT taken; falls to 8673-8675 atoi("")=0 -> bound(0,0,100)=0 -> SETS k_teleport_cap to 0 -> MISMATCH (no-arg/no-match path does NOT print; it zeroes the cap; trap_CmdArgc()<1 is effectively unreachable)
- "numeric argument sets the cap clamped 0-100" -> commands.c:8674-8675 `k_teleport_cap = atoi(arg); k_teleport_cap = bound(0, k_teleport_cap, 100);` -> MATCH
- "stores it in the k_teleport_cap cvar" -> commands.c:8676 `cvar_fset("k_teleport_cap", k_teleport_cap)` -> MATCH
- "re-applies yawn-mode settings immediately" -> commands.c:8678 `FixYawnMode();` -> MATCH
- "broadcasts the new value as a percentage" -> commands.c:8680 `G_bprint(2, "%s set %s to %d%%\n", self->netname, redtext("Teleport cap"), k_teleport_cap)` -> MATCH
- (access CF_PLAYER|CF_SPC_ADMIN|CF_PARAMS commands.c:998 -- description makes no access claim) -> n/a
WI-2: n/a (defect is a core semantic clause -> C-FIX)

RESULT | ktx:command:sct_hex | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | 16..255 walk, 16-column grid, literal column header, high-nibble row label, no-args, and caller-only output all map to ShowCharsetTableHexa enforcing lines
### ktx:command:sct_hex
- "Prints the QW character set to the issuing player's console" -> commands.c:1620 `G_sprint(self, 2, "%c", i)` (target self) -> MATCH
- "as a table laid out in hexadecimal" -> commands.c:1611-1612 header redtext("Hexadecimal charset table:") + hex col header; 1617 `%1X` -> MATCH
- "walks character codes 16 through 255" -> commands.c:1613 `for (i = 16; i < 256; i++)` -> MATCH
- "prints each as a 16-column grid" -> commands.c:1615-1624 `(i % 16) == 0` row start / `== 15` row end -> MATCH
- "with a '0123456789ABCDEF' column header" -> commands.c:1611 literal `"   0123456789ABCDEF\n"` -> MATCH
- "and a hexadecimal high-nibble label on each row" -> commands.c:1615-1618 `if ((i % 16) == 0) G_sprint(self, 2, "%1X..", i / 16)` -> MATCH
- "so the operator can read off the code of any drawable character" -> illustrative purpose, consistent with code+codepath -> MATCH
- "Takes no arguments; output goes only to the caller" -> no trap_CmdArgv/CmdArgc; every G_sprint targets self, no broadcast; commands.c:760 CF_BOTH (no CF_PARAMS) -> MATCH
WI-2: n/a

<!-- wave 08 RE-NOT-NEEDED; first-pass canary k_teamoverlay=C-NEAR-MISS matched under sharpened prompt; HG2 flagged-canary + clean tot/toggleklist held -->
RESULT | ktx:command:toggleklist | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Every clause maps to an enforcing line in toggleklist and the klist gate
### ktx:command:toggleklist
- "Toggles the k_allowklist cvar" -> commands.c:5177 `int k_allowklist = !cvar("k_allowklist");` + 5184 `cvar_fset("k_allowklist", k_allowklist);` -> MATCH
- "controls whether klist (full client list) is usable by players during a match" -> commands.c:5077 `if (!cvar("k_allowklist") && match_in_progress && self->ct == ctPlayer) { ... "klist is disabled"; return; }` -> MATCH
- "on enables klist during matches; off disables it" -> consistent with 5077 polarity -> MATCH
- "new on/off state broadcast to all players with a reminder to also toggle tracklist" -> commands.c:5188/5192 `G_bprint(2, "klist: %s - remember to also toggle tracklist\n", redtext("on"/"off"))` -> MATCH
- "ignored while a match is in progress" -> commands.c:5179-5182 `if (match_in_progress) return;` (silent) -> MATCH
WI-2: n/a (CF_BOTH|CF_MATCHLESS additive, consistent with internal match guard)

RESULT | ktx:command:trx_rec | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=10 | Full chain mv_cmd_record/mv_can_record/mv_record verified; all five recorded fields, fixed cap MAX_PLRFRMS=(77*15), every refusal condition map to enforcing lines
### ktx:command:trx_rec
- "records the calling player's own movement (position, view angles, animation frame, effects, colormap)" -> commands.c:8310-8315 origin/angles/frame/effects/colormap copies (all 5) -> MATCH
- "into an in-memory trick-demo buffer" -> g_main.c:82 `static plrfrm_t plrfrms[MAX_CLIENTS][MAX_PLRFRMS];` + commands.c:8307 -> MATCH
- "sampled each frame up to a fixed frame cap" -> per-frame mv_record; cap commands.c:8283 `(self->rec_count >= MAX_PLRFRMS)`; progs.h:284 `#define MAX_PLRFRMS (77*15)` -> MATCH
- "Any active recording or playback for that player is stopped first" -> commands.c:8323-8324 `mv_stop_record(); mv_stop_playback();` -> MATCH
- "Refused ('can't record now') while a match in progress / during intermission" -> commands.c:8273 `if (match_in_progress || intermission_running) return false;` -> 8328-8332 -> MATCH
- "while replaying a buffer" -> commands.c:8278 `if (mv_is_playback()) return false;` -> MATCH
- "once the per-player frame buffer is full" -> commands.c:8283 `(self->rec_count >= MAX_PLRFRMS)` -> MATCH
- "otherwise prints 'recording'" -> commands.c:8335 `G_sprint(self, 2, "recording\n");` -> MATCH
- "Player-issued command, no arguments" -> commands.c:989 `{ "trx_rec", mv_cmd_record, 0, CF_PLAYER, CD_TRX_REC }` -> MATCH
WI-2: n/a (CF_PLAYER "Player-issued" verified commands.c:989)

RESULT | ktx:command:tracklist | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Every clause maps to enforcing lines in tracklist and TrackWhom
### ktx:command:tracklist
- "Prints a list of all spectators present" -> commands.c:5439 `for (i = 0, p = world; (p = find_spc(p)); i++)` -> MATCH
- "for each, the player they are currently tracking (or 'not tracking')" -> commands.c:5446 `track = TrackWhom(p);` + 5448 `(strnull(track) ? nt : va(" \x8D %s", track))`; TrackWhom g_utils.c:1642-1650 -> MATCH
- "Prints 'No spectators present' if none" -> commands.c:5451-5454 `if (!i) G_sprint(self, 2, "No spectators present\n");` -> MATCH
- "For players, suppressed during a match unless k_allowtracklist enabled" -> commands.c:5433 `if (!cvar("k_allowtracklist") && match_in_progress && self->ct == ctPlayer) { ... "tracklist is disabled"; return; }` -> MATCH
WI-2: n/a (CF_BOTH|CF_MATCHLESS additive; restriction handled in-function)

RESULT | ktx:command:timedown1 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | TimeDown(t=1.0f) verified; -1min, k_timetop clamp, both-zero refusal+restore, and silent match-in-progress ignore all map to enforcing lines
### ktx:command:timedown1
- "Decreases the match time limit (timelimit) by 1 minute" -> commands.c:731 passes `1.0f`; TimeDown 2952-2955 `timelimit -= t;` + 2972 `cvar_set("timelimit", va("%d", (int)timelimit));` -> MATCH
- "announces the new length to all players" -> commands.c:2973-2974 `G_bprint(2, "%s %s %s%s\n", redtext("Match length set to"), dig3(timelimit), ...)` -> MATCH
- "result clamped to 0..k_timetop" -> commands.c:2957 `timelimit = bound(0, timelimit, cvar("k_timetop"));` -> MATCH
- "If lowering would leave both timelimit and fraglimit at 0 the change is refused" -> commands.c:2959-2963 `if ((timelimit <= 0) && (fraglimit <= 0)) { G_sprint(... "You need some timelimit or fraglimit at least"); timelimit = tl; }` -> MATCH
- "ignored while a match is in progress" -> commands.c:2934-2937 `if (match_in_progress) return;` (silent) -> MATCH
WI-2: n/a (CF_PLAYER|CF_SPC_ADMIN not asserted)

RESULT | ktx:command:tot | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=17 | Every preset value verified verbatim in tot_um_init; common-first ordering; semantic glosses (invinc -1 disable, quad x8, berserk/powerups/spawn/drops) all map to enforcing reads
### ktx:command:tot
- "Applies the Tribe of Tjernobyl (ToT) preset" -> commands.c:4553 `{ "tot", "Tribe of Tjernobyl", tot_um_init, UM_FFA, 0 }`; table 825 UserMode(17) -> um_list[16] -> MATCH
- "a fireball-mode free-for-all variant" -> UM_FFA + tot_um_init:4519 `k_fb_enabled 1` (read fb_globals.c:238) -> MATCH
- "deathmatch 4 (DMM4)" -> commands.c:4512 `deathmatch 4` -> MATCH
- "permanent invincibility-on-respawn disabled (dmm4_invinc_time -1)" -> commands.c:4513 `dmm4_invinc_time -1`; enforced client.c:2278-2289 (`-1 -> bound=0 -> >0 false -> no invuln`) -> MATCH
- "enables ToT mode (k_tot_mode 1)" -> commands.c:4529 + read commands.c:9560 `cvar(TOT_MODE_VARIABLE) != 0` -> MATCH
- "and the fireball system (k_fb_enabled 1)" -> commands.c:4519 + fb_globals.c:238 -> MATCH
- "8x quad fireball multiplier (k_fb_quad_multiplier 8)" -> commands.c:4520 + combat.c:545 `damage *= (deathmatch != 4 ? 4 : tot_mode_enabled() ? FrogbotQuadMultiplier() : 8);` -> MATCH (value/polarity/activation; "fireball" loose qualifier, traceable)
- "disallows certain weapons (k_disallow_weapons 80)" -> commands.c:4517 `k_disallow_weapons 80` -> MATCH
- "disables quad/ring drops (dq 0, dr 0)" -> commands.c:4514/4515; enforced items.c:1974 cvar("dq") / items.c:1989 cvar("dr") -> MATCH
- "and berserk (k_bzk 0)" -> commands.c:4516; enforced client.c:2394 / match.c:1267 -> MATCH
- "caps the server at 9 players (maxclients/k_maxclients 9)" -> commands.c:4530/4523 -> MATCH
- "no team-size or lock limits (k_membercount 0, k_lockmax 0, k_lockmin 0)" -> commands.c:4524/4521/4522; enforced match.c:1820-1822 -> MATCH
- "no overtime (k_overtime 0, k_exttime 0)" -> commands.c:4526/4518 -> MATCH
- "enables powerups (k_pow 1)" -> commands.c:4527; enforced g_utils.c:1741 -> MATCH
- "uses spawn type 1 (k_spw 1)" -> commands.c:4528; enforced match.c:1599 -> MATCH
- "internal game mode k_mode 3" -> commands.c:4525 -> MATCH
- "shared common reset runs first" -> commands.c:4796 common_um_init BEFORE 4799 tot_um_init -> MATCH
WI-2: n/a (CF_PLAYER|CF_SPC_ADMIN|CF_PARAMS not asserted)

<!-- wave 09 (canary k_yawnmode=TRACED-CLEAN matched; HG2 2 load-bearing clean held) -->
RESULT | ktx:cvar:demo_skip_ktffa_record | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Polarity, gate-on-demo_tmp_record, FFA-only scope, and non-zero semantics all enforced at match.c:2367 inside the demo_tmp_record block
### ktx:cvar:demo_skip_ktffa_record
- "When server-side MVD auto-recording is enabled (demo_tmp_record non-zero), controls whether FFA games are recorded" -> match.c:2355 `if (cvar("demo_tmp_record"))` (enclosing block) -> MATCH
- "1 (any non-zero) = FFA games are skipped and not auto-recorded" -> match.c:2367-2370 `else if (isFFA() && cvar("demo_skip_ktffa_record")) { record = false; }` -> MATCH
- "0 = FFA games are auto-recorded like other modes" -> match.c:2376 `else { record = true; }` ; default 0 via bare RegisterCvar world.c:937 -> MATCH
- "Has no effect for non-FFA game types" -> match.c:2367 `isFFA() &&` conjunct -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_allowcountchange | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Every permission tier (0/1/2/3-4/5) maps exactly to check_perm switch cases; the match-in-progress rejection is enforced before the perm check
### ktx:cvar:k_allowcountchange
- "Permission tier governing who may change player/spectator slot counts" -> commands.c:8027 `if (!check_perm(self, cvar("k_allowcountchange"))) return;` in ChangeClientsCount -> MATCH
- "value is a permission level, not a boolean" -> commands.c:1515 `switch (perm)` over raw cvar int -> MATCH
- "0 = no one may change" -> commands.c:1516-1518 `case 0: ... return false;` -> MATCH
- "1 = real admin only" -> commands.c:1520-1526 `case 1: if (!is_real_adm(p)) ... return false;` -> MATCH
- "2 = admin" -> commands.c:1528-1534 `case 2: if (!is_adm(p)) ... return false;` -> MATCH
- "3 and 4 = judges (not implemented, denied)" -> commands.c:1536-1539 `case 3: case 4: ... "judges" ... is not implemented ... return false;` -> MATCH
- "5 = anyone" -> commands.c:1541-1542 `case 5: break;` -> return true -> MATCH
- "rejected while a match is in progress" -> commands.c:8022-8025 `if (match_in_progress) { return; }` (precedes perm check) -> MATCH
WI-2: n/a

RESULT | ktx:cvar:add_q_aerowalk | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | cvar-on AND map==aerowalk guard, fixed origin, Quad spawn, and other-maps-no-effect scope all enforced at world.c:576
### ktx:cvar:add_q_aerowalk
- "When set to 1, KTX spawns an extra Quad Damage" -> world.c:576-585 `if (cvar("add_q_aerowalk") && streq("aerowalk", mapname)) { ... SP_item_artifact_super_damage(); }` -> MATCH
- "during map setup" -> world.c:564 `void Customize_Maps(void)` -> MATCH
- "at a fixed location" -> world.c:580 `setorigin(self, -912.6f, -898.9f, 248.0f);` -> MATCH
- "When 0, no extra Quad / no effect on maps other than aerowalk" -> world.c:576 `cvar(...) && streq("aerowalk", mapname)`; default 0 bare RegisterCvar world.c:945 -> MATCH
WI-2: n/a

RESULT | ktx:command:y | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | YesKick's kick/advance/no-target/outside-mode behaviour, AdminKick no-arg entry, NextClient prompt, and CF_BOTH_ADMIN admin-only enforcement all on the feature path
### ktx:command:y
- "After an admin runs kick with no arguments, KTX enters a kick-selection mode" -> admin.c:156-168 (AdminKick argc<2) `"Kicking process started" ... self->k_kicking = g_globalvars.time; NextClient();` -> MATCH
- "steps through connected players/spectators one at a time" -> admin.c:225-260 NextClient `self->k_playertokick = find_plrspc(...)` -> MATCH
- "prompting 'Kick player/spectator <name>?'" -> admin.c:258 `G_sprint(self, 2, "Kick %s %s?\n", redtext(...), getname(...))` -> MATCH
- "Typing y kicks the prompted client and advances" -> admin.c:264-281 YesKick `DoKick(self->k_playertokick, self)` then `NextClient();` -> MATCH
- "no valid target -> advance; outside an active kick mode -> nothing" -> admin.c:266-275 `if (!self->k_kicking) return;` + no-target advance -> MATCH
- "Admin-only (CF_BOTH_ADMIN)" -> commands.c:796 `{ "y", YesKick, 0, CF_BOTH_ADMIN, CD_Y }`; enforced 1096/1111 `(cf_flags & CF_*_ADMIN) && !is_adm -> DO_ACCESS_DENIED`; init 1443-1450 auto-adds CF_PLAYER/CF_SPECTATOR -> MATCH
WI-2: access-class "Admin-only (CF_BOTH_ADMIN)" verified vs flag def + dispatch (correct)

RESULT | ktx:cvar:_k_captteam1 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Internal-state nature, store-of-captain-1's-team, force-set-on-pick, and the k_captains==2 lock all enforced on the captain-picking path
### ktx:cvar:_k_captteam1
- "Internal mod-state cvar (not operator-tuned)" -> world.c:1023 `RegisterCvar("_k_captteam1"); // internal mod usage` (_ prefix, no shipped default) -> MATCH
- "server stores the first captain's team name here" -> captain.c:389 `cvar_set(va("_k_captteam%d", capt_num(p)), getteam(p));` (capt_num returns k_captain 1|2) -> MATCH
- "when that captain picks a player, the picked player is force-set to this team" -> captain.c:49 `infoteam = cvar_string(va("_k_captteam%d", (int)k_captainturn));` + 64-67 `stuffcmd_flags(p, ..., "team \"%s\"\n", infoteam)` (SetPlayerParams via CaptainPickPlayer) -> MATCH
- "(k_captains=2) a player picked by captain 1 is locked to this team" -> g_userinfo.c:434 `if (k_captains == 2)`, :441 `if (self->k_picked == 1) s2 = cvar_string("_k_captteam1");`, :452-456 force-back -> MATCH
- "Holds runtime state set and consumed by the team-picking code" -> set captain.c:389; consumed captain.c:49 + g_userinfo.c:441 -> MATCH
WI-2: n/a

<!-- wave 10 RE-DISPATCHED (orig canary autotrack mis-graded WI2-FIX -> wave rejected; sharpened+boundary re-dispatch canary=C-FIX matched; HG2 flagged k_ctf_hook + clean pitch_scale held) -->
RESULT | ktx:cvar:k_fbskill_vol_ownvel | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Speed-threshold semantics, vx^2+vy^2 vs threshold^2, own-velocity, incr cvar, bound(0,v,1000), and server-managed cvar_fset all map to enforcing lines
### ktx:cvar:k_fbskill_vol_ownvel
- "horizontal SPEED threshold; HorizontalVelocityCheck compares vx*vx+vy*vy against threshold*threshold" -> bot_aim.c:228-230 `float value = velocity[0]*velocity[0]+velocity[1]*velocity[1]; return (value > (threshold*threshold));` -> MATCH
- "for the bot's OWN velocity" -> bot_aim.c:259-260 `HorizontalVelocityCheck(self->s.v.velocity, self->fb.skill.ownspeed_volatility_threshold)` -> MATCH
- "when the bot moves faster than this, volatility increased by separate k_fbskill_vol_ownvel_incr" -> bot_aim.c:262 `volatility += self->fb.skill.ownspeed_volatility;` + bot_botimp.c:334 (incr cvar) -> MATCH
- "this cvar only sets the trigger speed, not the increment" -> bot_botimp.c:332-334 distinct cvars -> MATCH
- "clamped bound(0, value, 1000) into self->fb.skill.ownspeed_volatility_threshold" -> bot_botimp.c:332-333 `bound(0, cvar(FB_CVAR_OWNSPEED_VOLATILITY_THRESHOLD), 1000)` -> MATCH
- "Server-managed via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode()" -> bot_botimp.c:188 & 239 `cvar_fset(..., RangeOverSkill(skill, 360, 450))` -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_vol_min | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Per-target volatility scalar scales aim error; lower clamp in the continuing-target else-branch; bound(0,v,5.0); hard-set 1.0f in both skill functions
### ktx:cvar:k_fbskill_vol_min
- "bot's aim error is scaled by a running per-target 'volatility' scalar" -> bot_aim.c:353-356 `dist_random(-pitch_diff, pitch_diff, pitch->multiplier * self->fb.skill.current_volatility)` -> MATCH
- "sets the lower clamp applied to that scalar each frame in the continuing-target path" -> bot_aim.c:299-301 `volatility = bound(self->fb.skill.min_volatility, volatility * self->fb.skill.reduce_volatility, self->fb.skill.max_volatility);` (inside the else continuing-target branch only) -> MATCH (correctly scoped)
- "so volatility can never decay below this floor" -> bot_aim.c:299 (min_volatility = lower bound arg on continuing path) -> MATCH
- "read clamped to bound(0, value, 5.0) into self->fb.skill.min_volatility" -> bot_botimp.c:328 `bound(0, cvar(FB_CVAR_MIN_VOLATILITY), 5.0f)` -> MATCH
- "setSkillAttributes() hard-set 1.0f" -> bot_botimp.c:184 `cvar_fset(FB_CVAR_MIN_VOLATILITY, 1.0f);` -> MATCH
- "setSkillAttributesEasySkillMode() hard-set 1.0f" -> bot_botimp.c:235 `cvar_fset(FB_CVAR_MIN_VOLATILITY, 1.0f);` -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_ctf_hook | C-FIX | flavourC=1 | wi2=0 | clauses=5 | Inventory/quick-switch/disable behaviour all correct, but "Toggleable via the CTF 'hook' command" is positively wrong -- the toggle command is named nohook (commands.c:916); no command named hook exists anywhere in src/
### ktx:cvar:k_ctf_hook
- "When enabled (non-zero), every player in CTF mode is given the grappling hook (added on spawn)" -> client.c:2341-2345 (inside PutClientInServer) `if (isCTF()) { if (cvar("k_ctf_hook")) { self->s.v.items |= IT_HOOK; } }` -> MATCH
- "and may quick-switch to it by re-selecting the axe" -> weapons.c:2381 `if (isCTF() && (self->s.v.weapon == IT_AXE) && cvar("k_ctf_hook")) { fl = IT_HOOK; }` -> MATCH
- "When disabled, the hook is removed from all players" -> world.c:1297-1299 `AddHook(isCTF() && cvar("k_ctf_hook"));` -> ctf.c:184-211 AddHook(false) strips IT_HOOK from all players -> MATCH
- "Toggleable in-game via the CTF 'hook' command" -> commands.c:916 `{ "nohook", nohook, 0, CF_PLAYER | CF_MATCHLESS, CD_NOHOOK }`; exhaustive grep `{ "hook"` returns ZERO -> MISMATCH (command is named nohook, not hook; name-inferred from the cvar/concept)
- "(announced as 'hook')" -> ctf.c:772 `cvar_toggle_msg(self, "k_ctf_hook", redtext("hook"));` -> g_utils.c:2214 G_bprint (msg = "hook") -> MATCH
WI-2: n/a (wrong command-NAME / how-to-toggle behavioural claim -> C-FIX, not WI2-FIX)

RESULT | ktx:cvar:k_ctf_hurt_items | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | hurt_items() gated on the cvar; flag super_time forces FlagThink return-to-spawn; rune nextthink forces RuneRespawn; OFF-state is the no-op
### ktx:cvar:k_ctf_hurt_items
- "When enabled (non-zero), CTF flags and runes that fall into a damage trigger are returned instead of lost" -> triggers.c:939-953 `void hurt_items(void) { if (cvar("k_ctf_hurt_items")) { ... } }` called from hurt_touch 957-961 when `!other->s.v.takedamage` -> MATCH
- "a flag is sent back to its spawn position" -> triggers.c:943-944 `other->super_time = g_globalvars.time;` -> ctf.c:281-285 FlagThink `if (time > super_time) { RegenFlag(self); G_bprint(...returned...) }` + 292-294 setorigin oldorigin -> MATCH
- "a rune is forced to respawn" -> triggers.c:947-948 `else if (streq(other->classname,"rune")) { other->s.v.nextthink = g_globalvars.time; }` -> runes.c:236-242 RuneRespawn ent_remove + re-drop -> MATCH
- "When disabled, the flag/rune is not specially handled" -> triggers.c:941 guard => no-op when 0 -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_aim_pitch_scale | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Pitch-error formula bound(min,|raw|*scale,max) verbatim; multiplies desired-minus-current pitch; bound(0,v,5); RangeOverSkill default with cvar override
### ktx:cvar:k_fbskill_aim_pitch_scale
- "vertical (pitch) aim-error growth factor" -> bot_botimp.c:323 maps to self->fb.skill.aim_params[PITCH].scale -> MATCH
- "pitch error = bound(pitch.minimum, fabs(raw_pitch_diff) * pitch.scale, pitch.maximum)" -> bot_aim.c:350 `pitch_diff = bound(pitch->minimum, fabs(raw_pitch_diff) * pitch->scale, pitch->maximum);` -> MATCH (verbatim)
- "multiplies the raw angular difference between the bot's current and desired pitch before clamping" -> bot_aim.c:328-329 `raw_pitch_diff = anglefix(anglemod(self->fb.desired_angle[PITCH]) - anglemod(self->s.v.angles[PITCH]))` then *scale before bound at 350 -> MATCH
- "Read back per bot clamped bound(0, value, 5) into self->fb.skill.aim_params[PITCH].scale" -> bot_botimp.c:323 `bound(0, cvar(FB_CVAR_PITCH_SCALE), 5)` -> MATCH
- "server normally derives the value from aim-skill; setting the cvar overrides" -> bot_botimp.c:177 `cvar_fset(FB_CVAR_PITCH_SCALE, RangeOverSkill(aimskill, 5, 2));` & 228 -> MATCH
WI-2: n/a

## Round C -- waves 11-13 (13 batch rows; canaries stripped)

<!-- wave 11 RE-DISPATCHED x2 (R1 canary k_teamoverlay=TRACED-CLEAN -> HG1 reject; R2 canary OK but HG2 orchestrator re-grep caught k_matchless mis-graded TRACED-CLEAN -> HG2 reject; R3 canary=C-NEAR-MISS + k_matchless=C-FIX, HG2 held) -->
RESULT | ktx:cvar:k_lgcmode | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Every semantic/scope/side-effect/toggle clause has an enforcing line on the LGC feature path; default 0
### ktx:cvar:k_lgcmode
- "Enables LGC mode; 0 = off; 1 = on" -> commands.c:9432 `qbool lgc_enabled(void) { return cvar(LGCMODE_VARIABLE) != 0; }` (LGCMODE_VARIABLE="k_lgcmode", g_local.h:1228) -> MATCH
- "Enabling it requires deathmatch mode 4" -> commands.c:7850-7855 `if (!k_lgc && (deathmatch != 4)) { G_sprint(... "LGC mode requires dmm4\n"); return; }` -> MATCH
- "turns off incompatible modes (midair, instagib, dmgfrags)" -> commands.c:7858-7872 `cvar_set("k_midair","0")` / `cvar_set("k_instagib","0")` / `cvar_set("k_dmgfrags","0")` (ToggleLGC) -> MATCH
- "resets handicap to neutral" -> commands.c:7875 `SetHandicap(self, 100);` (100 = off) -> MATCH
- "while active the handicap command is refused" -> commands.c:5210-5217 `if (k_lgc) { G_sprint(... "Handicap is not allowed in LGC mode\n"); return; }` -> MATCH
- "while active the dmgfrags command is refused" -> commands.c:8116-8120 `if (k_lgc) { G_sprint(... "Dmgfrags is not allowed in LGC mode\n"); return; }` -> MATCH
- "match overtime is disabled" -> match.c:555-558 `if (lgc_enabled()) { k_mb_overtime = 0; }` -> MATCH
- "scoring switches to LGC statistics (LG hits bucketed by distance)" -> commands.c:9445-9457 `int bucket = bound(0,(int)(distance/LGCMODE_BUCKET_DISTANCE),LGCMODE_DISTANCE_BUCKETS-1); player->lgc_distance_hits[bucket]++;` + stats LGC-only path -> MATCH
WI-2: n/a (bare RegisterCvar world.c:1083 => default 0, consistent with "0 = off")

RESULT | ktx:cvar:k_nightmare_pu | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Drop-on-monster-death gated by cvar; skill>=3 and droprate enforced; drop set Quad/Pent/Ring; default 0
### ktx:cvar:k_nightmare_pu
- "0 = off, 1 = on" -> sp_monsters.c:745 `if (cvar("k_nightmare_pu")) MonsterDropPowerups();` -> MATCH
- "monsters killed ... drop a powerup" -> sp_monsters.c:738-748 `void monster_death_use(void) { if (!((int)self->s.v.flags & FL_MONSTER)) return; if (cvar("k_nightmare_pu")) MonsterDropPowerups(); }` -> MATCH
- "at skill 3+" -> sp_monsters.c:645-648 `if (skill < 3) { return; }` -> MATCH
- "chance governed by k_nightmare_pu_droprate" -> sp_monsters.c:655-658 `if (g_random() > cvar("k_nightmare_pu_droprate")) { return; }` -> MATCH
- "(Quad, Pentagram, or Ring)" -> sp_monsters.c:660-685 case0 IT_INVULNERABILITY (Pent) / case1 IT_INVISIBILITY (Ring) / default IT_QUAD -> MATCH
- "at their death location" -> MonsterDropPowerups runs in monster_death_use (self=dead monster); DropPowerup at monster origin -> MATCH
WI-2: n/a (RegisterCvarEx("k_nightmare_pu","0") world.c:973 => default 0, consistent)

RESULT | ktx:cvar:k_no_scoreboard_ghosts | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Non-empty-string gate suppresses ghost2scores + ghostClearScores; empty default keeps ghosts; QE-compat rationale matches in-source comment
### ktx:cvar:k_no_scoreboard_ghosts
- "When set to any non-empty string" -> g_utils.c:2243 `if (cvar_string("k_no_scoreboard_ghosts")[0]) { return; }` + 2277 same -> MATCH ([0] = non-empty test)
- "their slot is not preserved" -> g_utils.c:2277-2280 early return in ghost2scores skips 2329-2330 slot save -> MATCH
- "they are not restored onto the scoreboard if they reconnect" -> g_utils.c:2272-2280 ghost2scores (scoreboard-write SVC_UPDATEUSERINFO) gated off -> MATCH (reconnect stats-restore client.c:1515 is separate, not claimed)
- "Empty (the default) keeps the ghost-scoreboard behavior" -> world.c:1081 `RegisterCvar("k_no_scoreboard_ghosts")` (bare => empty) -> MATCH
- "Intended for QuakeWorld-Engine client compatibility" -> g_utils.c:2245 & 2279 `// Scoreboard ghosts disabled, probably for QE compatibility.` -> MATCH
- "(clear path) slot not preserved" -> g_utils.c:2243-2246 short-circuits ghostClearScores before 2263 slot clear -> MATCH
WI-2: n/a (default empty via bare RegisterCvar; description "Empty (the default)" -> CORRECT)

RESULT | ktx:cvar:k_hoonyrounds | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | =6-if-0, +/-2 step in 2-20, team end = rounds>=limit && lead, default 6 -- all enforced on the HoonyMode path
### ktx:cvar:k_hoonyrounds
- "round limit before a HoonyMode match can end" -> hoonymode.c:243-262 HM_current_point_type gates HM_PT_FINAL on `round_number >= HM_rounds()` -> MATCH
- "treated as 6 if set to 0" -> hoonymode.c:102-107 `int HM_rounds(void){ int rounds=cvar("k_hoonyrounds"); return (rounds?rounds:6); }` -> MATCH
- "team HoonyMode finishes once at least this many rounds played and there is a lead" -> hoonymode.c:259 `if ((round_number >= HM_rounds()) && fragdiff) return HM_PT_FINAL;` (non-duel branch; fragdiff = lead) -> MATCH
- "roundsup/roundsdown step by 2 within range 2-20" -> hoonymode.c:1125 `int new_rounds = bound(2, HM_rounds() + change * 2, 20);` + 1127 cvar_fset; commands.c:1056-1057 roundsup/roundsdown -> MATCH
- "Default 6" -> world.c:889 `RegisterCvarEx("k_hoonyrounds", "6");` -> MATCH
WI-2: Default "6" verified at world.c:889 RegisterCvarEx -> CORRECT

RESULT | ktx:cvar:k_matchless | C-FIX | flavourC=1 | wi2=0 | clauses=5 | "forces FFA / FFA server" is positively WRONG: enforcing block world.c:1637-1667 explicitly PRESERVES CTF (else if (isCTF()) k_mode=gtCTF + dedicated teamplay handling; comment "matchless mode MUST be FFA or CTF") -- canonical FORCES-X-vs-PRESERVES-ALTERNATIVE
### ktx:cvar:k_matchless
- "the server forces FFA user mode" -> world.c:1637-1647 `if (k_matchLess) { // matchless mode MUST be FFA or CTF \n if (!isFFA() && !isCTF()) { k_mode=gtFFA; } else if (isCTF()) { k_mode=gtCTF; } }` -> MISMATCH (FFA forced ONLY when !isFFA && !isCTF; the else-if PRESERVES CTF; not unconditional)
- "1 = matchless (continuous-play / FFA) server" -> world.c:1640-1665 CTF preserved with dedicated teamplay handling; first-class matchless-CTF across match.c:1131 / ctf.c:741 / world.c:1124 -> MISMATCH (matchless CTF supported; "FFA server" wording positively wrong for it -> C-FIX)
- "0 = regular match server (normal prewar/countdown/match lifecycle)" -> match.c:2425 `if (!k_matchLess)` normal path + match.c:1294 -> MATCH
- "no formal match start/stop lifecycle ... players in-game continuously" -> world.c:1876-1878 `if (k_matchLess && !match_in_progress && !k_bloodfest) StartTimer();` + client.c:1700 ready forced in matchless -> MATCH
- "Coop and singleplayer always treated as matchless regardless of this value" -> world.c:1100-1104 `if (!cvar("deathmatch") || cvar("coop")) { k_matchLess = 1; matchless_was_forced = true; }` -> MATCH
WI-2: n/a (bare RegisterCvar world.c:795 => default 0; no wrong default/access claim; defect is the behavioural "forces FFA / FFA server" mode-scope clause -> C-FIX, not WI2-FIX)

<!-- wave 12 (canary k_yawnmode=TRACED-CLEAN matched; HG2 3 load-bearing clean held) -->
RESULT | ktx:cvar:k_race_match_rounds | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Clamp 3-21 / scoreboard round:/match-end / k_race_match gate all enforced
### ktx:cvar:k_race_match_rounds
- "read at race setup and clamped to range 3-21" -> race.c:523 `race.rounds = bound(RACE_MIN_MATCH_ROUNDS, cvar(RACE_MATCH_ROUNDS_CVAR), RACE_MAX_MATCH_ROUNDS);` (MIN=3 @41, MAX=21 @42) -> MATCH
- "values below 3 become 3, above 21 become 21" -> race.c:41-42 `#define RACE_MIN_MATCH_ROUNDS 3` / `RACE_MAX_MATCH_ROUNDS 21` + bound() -> MATCH
- "scoreboard shows 'round: <current>/<this value>'" -> race.c:2564-2574 `strlcat(cp_buf,"round: ",...)` + `snprintf(tmp,...,"%d/%d\n", race.round_number+1, race.rounds)` -> MATCH
- "match ends when the configured number of rounds has been played" -> race.c:5559 `if (race.round_number >= race.rounds)` -> race_finish_capture + EndMatch -> MATCH
- "Has effect only when race match mode (k_race_match) is enabled" -> race.c:5451 `return (race_match_mode() && (race.status || match_in_progress));` + race.c:5228 `return cvar(RACE_MATCH_CVAR);` (="k_race_match") -> MATCH
WI-2: n/a (RegisterCvarEx default "9" not asserted in description)

RESULT | ktx:cvar:k_pow | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Master switch / per-type interaction / off-on-subset report / matchless auto-toggle all enforced
### ktx:cvar:k_pow
- "Master switch for all powerups (quad, pent, ring, suit)" -> g_utils.c:1785 `int k_pow_new = k_killquad ? 1 : cvar("k_pow");` + items.c:111/2036 four-type gate -> MATCH
- "0 = all powerups disabled (entities hidden, cannot be picked up)" -> items.c:111 `if (!Get_Powerups() ...) { self->model=""; self->s.v.solid=SOLID_NOT; }` + items.c:2036 `if (!Get_Powerups() ...) { return; }` -> MATCH
- "1 = powerups enabled" -> g_utils.c:1791 `return (k_pow = k_pow_new);` -> MATCH
- "reported off if k_pow 0 or all four per-type 0, on if all four 1, else subset" -> g_utils.c:1740-1775 Get_PowerupsStr off/on/subset logic -> MATCH
- "matchless DM can auto-toggle effective value by player count (k_pow_min_players/k_pow_check_time)" -> g_utils.c:1789-1814 `if (!k_pow_new || !k_matchLess || !k_pow_min_players || !deathmatch) return k_pow_new;` then `CountPlayers() < k_pow_min_players ? 0 : k_pow_new` (re-checked every k_pow_check_time) -> MATCH
WI-2: n/a (bare RegisterCvar => default 0)

RESULT | ktx:cvar:_k_nospecs | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Spec-reject / VIP+coach exception / coach-demote-kick / nospecs action / 10s-no-players auto-clear all enforced
### ktx:cvar:_k_nospecs
- "0 = specs connect normally; non-zero = incoming spectator connections refused" -> spectate.c:125-133 `if (cvar("_k_nospecs")) { ... return false; } return true;` (SpecCanConnect @145) -> MATCH
- "except whitelisted VIP spectators and coaches" -> spectate.c:128 `if (!(VIP(spec) & ALLOWED_NOSPECS_VIPS) && !is_coach(spec))` -> MATCH
- "a coach demoted while this is active is disconnected" -> coach.c:79-82 `if (cvar("_k_nospecs")) { stuffcmd(self, "disconnect\n"); }` -> MATCH
- "Toggled by the nospecs admin/vote action" -> commands.c:1032 `{ "nospecs", nospecs, 0, CF_PLAYER | CF_SPC_ADMIN, ... }` + vote.c:954 `cvar_fset("_k_nospecs", !cvar("_k_nospecs"));` -> MATCH
- "server clears it to 0 automatically when, after 10s with no match, no players present" -> vote.c:926-930 `if ((g_globalvars.time > 10) && !match_in_progress && !CountPlayers() && cvar("_k_nospecs")) { ...; cvar_set("_k_nospecs","0"); }` -> MATCH
WI-2: n/a (CF_PLAYER|CF_SPC_ADMIN not asserted in description)

RESULT | ktx:cvar:k_random_maplist | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=3 | Sequential-vs-random branch / per-entry min-max on 0-path / 5-retry-avoid-repeat all enforced
### ktx:cvar:k_random_maplist
- "Controls how the next map is chosen from the configured cycle (k_ml_0, k_ml_1, ...)" -> maps.c:643 `if (cvar("k_random_maplist"))` in SelectMapInCycle (both branches operate on k_ml_%d) -> MATCH
- "When 0, cycle advances sequentially in list order, honoring per-entry min/max player requirements" -> maps.c:657-678 sequential read of k_ml_maxp_%d/k_ml_minp_%d, selects where (maxp>=player_count)&&(player_count>=minp) -> MATCH
- "When non-zero, next map picked at random (retrying a few times to avoid repeating current map)" -> maps.c:606-622 SelectRandomMap `for (c = 0; c < 5; c++) ... if (streq(mapname, newmap)) continue;` -> MATCH
WI-2: n/a (bare RegisterCvar => default 0)

RESULT | ktx:cvar:k_short_gib | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=3 | persist-control / non-zero=2s / 0=random 10-20s all enforced at ThrowGib nextthink
### ktx:cvar:k_short_gib
- "Controls how long gib corpse pieces persist before removal" -> player.c:1062-1063 `newent->think = (func_t) SUB_Remove; newent->s.v.nextthink = g_globalvars.time + (k_short_gib ? 2 : (10 + g_random() * 10));` -> MATCH
- "non-zero -> each gib removed 2 seconds after thrown" -> player.c:1048 `int k_short_gib = cvar("k_short_gib"); // if set - remove faster` + 1063 truthy branch `+ 2` -> MATCH
- "set to 0 -> removed after random delay 10 to 20 seconds" -> player.c:1063 `: (10 + g_random() * 10)` (g_random in [0,1) -> [10,20)) -> MATCH
WI-2: n/a (bare RegisterCvar => default 0)

<!-- wave 13 (canary autotrack=C-FIX matched; HG2 flagged-canary + clean k_vwep/k_vp_break held) -->
RESULT | ktx:cvar:_k_team3 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Three-team-mode-only set, match-start capture, scoreboard labels, score attribution, hostname decoration, server-set string all verified
### ktx:cvar:_k_team3
- "Internal store of the third participating team's name" -> world.c:1031 `RegisterCvar("_k_team3"); // internal mod usage` -> MATCH (no default = empty)
- "in three-team usermodes (2on2on2, 3on3on3, 4on4on4) only" -> match.c:1165 `if ((current_umode >= um2on2on2) && (current_umode <= um4on4on4))` (gates the cvar_set block) -> MATCH
- "captured at match start" -> match.c:1344 `SM_PrepareShowscores();` (inside StartMatch @1226; set-site at 1183 within it) -> MATCH
- "server records it when a distinct third team is detected while preparing the scoreboard" -> match.c:1175-1183 `while ((p=find_plr(p))){ team3=getteam(p); if (strneq(team1,team3)&&strneq(team2,team3)) break; } ... cvar_set("_k_team3", team3);` -> MATCH
- "read for the three-team scoreboard labels" -> client.c:3522 `char *t3 = cvar_string("_k_team3");` (3-team scoreboard branch) -> MATCH
- "score attribution" -> g_utils.c:1896 `team3 = cvar_string("_k_team3");` + 1909-area `else if (streq(team3, team)) k_scores3 += ...` (also commands.c:6908, match.c:806) -> MATCH
- "hostname decoration ('<host> (team1 vs. team2 vs. team3)')" -> match.c:1204 `cvar_set("hostname", va("%s (%.4s vs. %.4s vs. %.4s)\207", cvar_string("hostname"), team1, team2, team3));` -> MATCH
WI-2: n/a (no-default implied-empty correct vs bare RegisterCvar)

RESULT | ktx:cvar:k_vwep | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Boolean enable, requires k_allow_vwep + vw_available, vwep-command toggle gated to before match, registered default 1 -- all verified
### ktx:cvar:k_vwep
- "Enables the visible-weapons (vwep) extension ... 1 enable, 0 disable" -> world.c:378 `vw_enabled = vw_available && cvar("k_allow_vwep") && cvar("k_vwep");` -> MATCH (boolean conjunct)
- "Takes effect only when the server also has k_allow_vwep enabled and the vwep extension is available" -> world.c:378 / match.c:1633 / commands.c:8598 all `vw_enabled = vw_available && cvar("k_allow_vwep") && cvar("k_vwep");` -> MATCH (all three required)
- "can be toggled in-game with the vwep command before a match starts" -> commands.c:1001 `{ "vwep", ToggleVwep, ... }` + commands.c:8587-8597 `if (match_in_progress) { return; } if (!vw_available || !cvar("k_allow_vwep")) { return; } cvar_toggle_msg(self, "k_vwep", redtext("vwep"));` -> MATCH (blocked once match_in_progress)
- "Registered with a default of 1" -> world.c:875 `RegisterCvarEx("k_vwep", "1");` -> MATCH
WI-2: Default "1" matches RegisterCvarEx("k_vwep","1") world.c:875 -> CORRECT

RESULT | ktx:cvar:k_vp_break | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Break-vote pct, floor-51/cap-100, ceil(pct*(players-bots)), CA current-series base, match-mode-only with matchless->k_vp_map -- all verified; description correctly tracks the enforcing bound(51,...) over the misleading "50%" comment
### ktx:cvar:k_vp_break
- "percentage of eligible voters required to pass a break vote (/break, which stops the current match)" -> vote.c:245 `percent = cvar(k_matchLess ? "k_vp_map" : "k_vp_break");` (OV_BREAK) + vote.c:629-648 `if (!get_votes_req(OV_BREAK,true)) { ... "Match stopped by majority vote"; EndMatch(0); }` + commands.c:709 `{ "break", PlayerBreak, ... }` -> MATCH
- "whole-number percentage; effective value floored at 51 and capped at 100, so below 51 behaves as 51" -> vote.c:328 `percent = bound(0.51, bound(51, percent, 100) / 100, 1);` -> MATCH (inner bound(51,percent,100) clamps before /100; description tracks the enforcing line, stricter than the imprecise "50%" code comment)
- "required vote count is ceil(percent/100 * (players minus bots))" -> vote.c:342 `vt_req = ceil(percent * (CountPlayers() - CountBots()));` (percent already /100 at 328) -> MATCH
- "in Clan Arena, only players in the current series count toward the base" -> vote.c:335-338 `else if (isCA() && (fofs == OV_BREAK)) { vt_req = ceil(percent * (CA_count_ready_players() - CountBots())); }` -> MATCH
- "applies only in match mode -- in matchless there is no /break and the next-map vote uses k_vp_map" -> vote.c:245-246 `percent = cvar(k_matchLess ? "k_vp_map" : "k_vp_break");` + commands.c:995 `{ "next_map", PlayerBreak, 0, CF_PLAYER | CF_MATCHLESS_ONLY, CD_NEXT_MAP }` -> MATCH
WI-2: n/a (no default-value or access-class claim)
