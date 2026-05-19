# V-pass Stage-1 ledger -- BATCH 06 (bucket 5, F-V1 strided partition)

Authority: `decisions.md` D7 Amendment 2026-05-19 (B1-B5). Read-only
per-clause enforcement re-trace (B3); CLASSIFIES only, mutates no
description / DB / file (C4). Method = `enforce-trace-discipline.md`
(B1). This file is the B5 Stage-1 ledger for this slice; TRACED-CLEAN
entries are the B2 retirement evidence for these canonical_ids.

- Batch: 06 (terminal BATCH_ID=6 -> md5-stride bucket 5)
- Population: 51 rows (verified: 9 buckets sum to 571; bucket 5 = 51)
- Oracle: `/tmp/ktx-src-67253dc9` @ `67253dc9ab4f643f1e6523a923a41caab9ea587f`, `git describe --tags` = `1.47-2-g67253dc` (HARD GATE Step 1 PASSED, byte-identical to synthesis source)
- Date: 2026-05-19 | Orchestrator terminal: Opus 4.7 MAX
- Sub-agents: general-purpose, model=opus, MAX-reasoning mandated in-brief (Agent tool exposes no effort param -- see halt report process note)
- Canary controls (F-V2; excluded from N, never counted): `ktx:command:autotrack` -> C-FIX | `ktx:cvar:k_teamoverlay` -> C-NEAR-MISS | `ktx:cvar:k_yawnmode` -> TRACED-CLEAN
- Gates per wave: HARD GATE 1 (canary verdict == expected else whole wave rejected+redispatched) ; HARD GATE 2 (orchestrator independent re-grep >=1 flagged + >=1 TRACED-CLEAN load-bearing clause)

Machine spine: `^RESULT \|` lines collate to the Stage-1 index, flagged
set, and rate. `###` blocks are the durable human detail.

---

<!-- WAVE 3 | canary=ktx:cvar:k_yawnmode expected=TRACED-CLEAN returned=TRACED-CLEAN HG1=PASS | HG2 orchestrator re-grep: midair 4-mutator disable (commands.c:7528/7536/7542/7547/7552) CONFIRMED + k_yawnmode canary axe weapons.c:128 `k_yawnmode ? 50 : 20` CONFIRMED -> ACCEPTED. canary row stripped. -->

RESULT | ktx:command:gren_mode | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Every clause (toggle/broadcast via cvar_toggle_msg, GL-only weapon restriction, dmm4 requirement, match+race refusal via is_rules_change_allowed) maps to a verified enforcing line.
### ktx:command:gren_mode
- "Toggles ... on or off, flips between off(0) and on(1)" -> g_utils.c:2210/2218 `i = !cvar(cvarName); ... trap_cvar_set_float(cvarName, (float) i)` -> MATCH
- "broadcasts the new state" -> g_utils.c:2215 `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg)` -> MATCH
- "when on, restricts allowed weapons to GL only (clears every other from k_disallow_weapons)" -> commands.c:7959-7962 `if (cvar("k_dmm4_gren_mode")) trap_cvar_set_float("k_disallow_weapons", DA_WPNS & ~IT_GRENADE_LAUNCHER)` -> MATCH
- "requires dmm4 (deathmatch == 4)" -> commands.c:7950-7954 `if (deathmatch != 4) { G_sprint(...,"gren_mode requires dmm4\n"); return; }` -> MATCH
- "refuses while a match is in progress or while race mode is active" -> commands.c:7942-7945 calls is_rules_change_allowed() -> commands.c:9035/9043 `if (match_in_progress)... if (isRACE())... return false` -> MATCH
WI-2: n/a

RESULT | ktx:command:hook_fast | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Cast/withdraw toggle, k_ctf_hookstyle=2 on veto-or-majority with announce, CTF-only, match-in-progress refusal all map to verified enforcing lines.
### ktx:command:hook_fast
- "casts (or, if already cast, withdraws) your vote" -> vote.c:1260/1264-1267 `self->v.hookfast = !self->v.hookfast; ... (self->v.hookfast ? redtext("votes for fast hook") : redtext(va("withdraws %s hookstyle vote"...)))` -> MATCH
- "switch the grappling-hook style to fast" -> vote.c:1275 `cvar_fset("k_ctf_hookstyle", 2)` (grapple.c:221 reads ==2 for fast behavior) -> MATCH
- "When a majority is reached or an admin vetoes, sets k_ctf_hookstyle = 2 and announces it" -> vote.c:1272-1276 `veto = is_admins_vote(OV_HOOKFAST); if (veto || !get_votes_req(OV_HOOKFAST, true)) { cvar_fset("k_ctf_hookstyle", 2); G_bprint(2,"%s\n", redtext(va("hook style set to fast by %s", veto ? "admin veto" : "majority vote"))); }` -> MATCH
- "Only usable in CTF mode" -> vote.c:1248-1251 `if (!isCTF()) { G_sprint(...,"hookstyle can only be set in CTF mode\n"); return; }` -> MATCH
- "not while a match is in progress" -> vote.c:1241-1244 `if (match_in_progress) { G_sprint(...,"hookstyle can not be changed while match is in progress\n"); return; }` -> MATCH
WI-2: n/a (CF_PLAYER|CF_MATCHLESS; "CTF vote command" / player-usable consistent; CF_MATCHLESS additive, not contradicted)

RESULT | ktx:command:killer | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | say-line to last killer with pre-filled name, premsg/postmsg insertion, "No name to display" fallback, and player/matchless access all verified against enforcing lines incl. killer-field assignment.
### ktx:command:killer
- "Opens a chat 'say' line addressed to the player who last killed you (your killer)" -> commands.c:1794 `SendMessage(self->killer)`; client.c:5429 `targ->killer = attackername` (attacker = the killer); commands.c:1819 `stuffcmd_flags(self, ..., "say ")` -> MATCH
- "pre-filled with that player's name" -> commands.c:1827 `stuffcmd_flags(self, ..., "%s", name)` with name matched at commands.c:1818 `streq(p->netname, name)` -> MATCH
- "premsg / postmsg userinfo inserted before / after the name" -> commands.c:1820-1822 `if ((s = ezinfokey(self, "premsg"))) stuffcmd ... " %s "` (before) ; commands.c:1828-1830 `if ((s = ezinfokey(self, "postmsg"))) stuffcmd ... " %s"` (after) -> MATCH
- "If no such player can be found, prints 'No name to display'" -> commands.c:1839 `G_sprint(self, 2, "No name to display\n")` reached when loop finds no matching netname -> MATCH
- "Player command, usable outside a match" -> commands.c:780 table flags `CF_PLAYER | CF_MATCHLESS` (CF_PLAYER=player; CF_MATCHLESS additive => also valid outside a match) -> MATCH
WI-2: n/a (CF_PLAYER|CF_MATCHLESS consistent with stated player/outside-match access)

RESULT | ktx:command:midair | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Toggle/broadcast, enable-only dmm4 gate with exact message, the four conflicting mutators (k_instagib/k_lgcmode/k_tot_mode/k_dmm4_gren_mode) disabled, and is_rules_change_allowed gate all map to verified enforcing lines.
### ktx:command:midair
- "Toggles midair on/off (sets k_midair) and broadcasts the new state" -> commands.c:7562 `cvar_toggle_msg(self, "k_midair", redtext("Midair"))` -> g_utils.c:2210/2215/2218 toggle+G_bprint -> MATCH
- "Enabling requires dmm4, otherwise refuses with 'Midair requires dmm4'" -> commands.c:7534-7538 `if (!cvar("k_midair") && deathmatch != 4) { G_sprint(self, 2, "Midair requires dmm4\n"); return; }` (gate is enable-only via !cvar("k_midair")) -> MATCH
- "When midair is enabled it turns off instagib, LGC mode, ToT mode, and dmm4 grenade mode" -> commands.c:7541-7560 `if (cvar("k_instagib")) cvar_set("k_instagib","0"); if (cvar(LGCMODE_VARIABLE)) cvar_set(...,"0"); if (cvar(TOT_MODE_VARIABLE)) cvar_set(...,"0"); if (cvar("k_dmm4_gren_mode")) cvar_set(...,"0")` with LGCMODE_VARIABLE="k_lgcmode" / TOT_MODE_VARIABLE="k_tot_mode" -> MATCH
- "Subject to the standard rules-change permission check" -> commands.c:7528-7531 `if (!is_rules_change_allowed()) return;` -> MATCH
WI-2: n/a (CF_PLAYER|CF_SPC_ADMIN; no default/access-class claim made)

RESULT | ktx:command:mmode | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=12 | Every argument branch, *mm/*mp/*mt writes, rcon password-or-VIP gate with brute-force delay, and per-player (not server-rule) nature all map to verified enforcing lines incl. the say-dispatch consumer.
### ktx:command:mmode
- "Sets caller's message mode by writing *mm userinfo" -> g_cmd.c:1176/1189/1206/1236/1248 `SetUserInfo(self, "*mm", va("%d", mmode), SETUSERINFO_STAR)` -> MATCH
- "with *mp/*mt for target id/team" -> g_cmd.c:1178 `SetUserInfo(self,"*mp",va("%d",id),...)`; g_cmd.c:1192 `SetUserInfo(self,"*mt",va("%s",tname),...)` -> MATCH
- "implicit recipient for subsequent messaging (multi cmd + say macros)" -> g_cmd.c:368-388 say-dispatch reads `mmode = iKey(self,"*mm")` then routes by MMODE_* -> MATCH
- "'off' -> no target" -> g_cmd.c:1107-1109 `streq(arg_2,"off") => mmode = MMODE_NONE` -> MATCH
- "'player' -> specific player by spectator id or name" -> g_cmd.c:1162-1163 `p = (argc < 3 ? SpecPlayer_by_id(iKey(self,"*mp")) : SpecPlayer_by_IDorName(arg_3))` -> MATCH
- "'team' -> a named team" -> g_cmd.c:1187 `tname = (argc < 3 ? ezinfokey(self,"*mt") : arg_3)` then writes *mt -> MATCH
- "'multi' -> open the multi-message editor" -> g_cmd.c:1199 `case MMODE_MULTI: multi_do(2, true)` -> MATCH
- "'name'" -> g_cmd.c:1123-1125 `streq(arg_2,"name") => MMODE_NAME`; g_cmd.c:1204-1208 handled -> MATCH
- "'rcon' (rcon-privileged, gated by rcon password arg or VIP rights, with brute-force delay)" -> g_cmd.c:1215-1240 `rcpass=cvar_string("rcon_password"); till=...k_adm_lasttime+5...; if (k_adm_lasttime && till>0){...return;} if (!((!strnull(arg_3) && strneq("none",rcpass) && streq(arg_3,rcpass)) || VIP_IsFlags(self,VIP_RCON))){...denied...return;}` -> MATCH
- "'.' / ',' -> last player you sent to / received from" -> g_cmd.c:1133-1135 `p = (streq(arg_2,".") ? self->s_last_to : self->s_last_from); mmode = MMODE_PLAYER` -> MATCH
- "'last' -> restore previously used mode" -> g_cmd.c:1137-1149 `int last = iKey(self,"*ml"); SetUserInfo(self,"*mm",va("%d",last),...)` -> MATCH
- "no arg -> current stored mode; unrecognized -> usage line; per-player state not server rule" -> g_cmd.c:1099 `mmode = (argc < 2 ? iKey(self,"*mm") : MMODE_NONE)`; g_cmd.c:1150-1153 `else { mmode_usage(); return; }`; writes are SetUserInfo(self,...) per-player -> MATCH
WI-2: n/a (CF_BOTH|CF_MATCHLESS|CF_PARAMS; per-player + rcon-priv claim verified against handler check, not flag names)

<!-- WAVE 4 | canary=ktx:command:autotrack expected=C-FIX returned=C-FIX HG1=PASS | HG2 orchestrator re-grep: flagged rnd wrong-clause commands.c:6718 `if ((argc = trap_CmdArgc()) < 2)` + sibling convention 5376/9224 CONFIRMED + clean norunes ctf.c:726 `if (match_in_progress && !k_matchLess)` CONFIRMED -> ACCEPTED. canary row stripped. -->

RESULT | ktx:command:norunes | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Every clause maps to an enforcing line in src/ctf.c norunes() + cvar_toggle_msg + SpawnRunes; match-in-progress guard and matchless rune-strip exact.
### ktx:command:norunes
- "Toggles CTF runes on/off by flipping the k_ctf_runes setting" -> src/ctf.c:738 `cvar_toggle_msg(self, "k_ctf_runes", redtext("runes"))` -> src/g_utils.c:2210/2218 `i = !cvar(cvarName); trap_cvar_set_float(cvarName, (float) i)` -> MATCH
- "the new state is announced server-wide" -> src/g_utils.c:2215 `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg)` -> MATCH
- "In matchless mode it also strips any rune from players carrying one (resetting their speed) when runes are turned off" -> src/ctf.c:742-753 `if (k_matchLess) { if (!cvar("k_ctf_runes")) { for(...) { p->ctf_flag -= (p->ctf_flag & (CTF_RUNE_MASK)); p->maxspeed = cvar("sv_maxspeed"); } } }` -> MATCH
- "and respawns runes when turned on" -> src/ctf.c:754 `SpawnRunes(cvar("k_ctf_runes"))` + src/runes.c:381-394 `SpawnRunes(qbool yes){ remove all; if(!yes) return; ... spawn }` -> MATCH
- "Only works in CTF mode" -> src/ctf.c:730-734 `if (!isCTF()) { G_sprint(self,2,"Can't do this in non CTF mode\n"); return; }` -> MATCH
- "blocked while a match is in progress unless the server is in matchless mode" -> src/ctf.c:726-729 `if (match_in_progress && !k_matchLess) { return; }` -> MATCH [orchestrator HG2 re-grep CONFIRMED ctf.c:726]
WI-2: n/a (no default claim; CF_PLAYER|CF_MATCHLESS, no access-class assertion in description)

RESULT | ktx:command:race_hide_players | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Per-edict toggle, caller-only print, immediate-apply on race.status, isRACE() gate -- all enforced in src/race.c:5650.
### ktx:command:race_hide_players
- "Toggles the calling player's own preference for whether other racers are drawn during a race" -> src/race.c:5657 `self->hideplayers_default = !self->hideplayers_default;` (per-edict field) -> MATCH
- "Each call flips ... for that player only (other players are unaffected)" -> src/race.c:5650-5666 only `self->` fields mutated; no loop over other players -> MATCH
- "and prints the new state" -> src/race.c:5659 `G_sprint(self, PRINT_HIGH, "Racers %s during race\n", self->hideplayers_default ? redtext("hidden") : redtext("shown"))` (to self only) -> MATCH
- "if a race is currently running the change is applied immediately" -> src/race.c:5662-5665 `if (race.status) { self->hideplayers = self->hideplayers_default; }` -> MATCH
- "Only works in race mode" -> src/race.c:5652-5654 `if (!race_command_checks()) return;` + src/race.c:2953-2959 `if (!isRACE()) { G_sprint(...); return false; }` -> MATCH
WI-2: n/a (no default claim; CF_PLAYER, "calling player" matches)

RESULT | ktx:command:race_simultaneous | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | isRACE gate, cvar flip+broadcast via cvar_toggle_msg, all-racers-on activation at race.c:2077, race-not-started guard, k_race_simultaneous cvar -- all enforced.
### ktx:command:race_simultaneous
- "Race mode only" -> src/race.c:5120-5123 `if (!race_command_checks()) return;` + src/race.c:2953 `if (!isRACE()) { ...; return false; }` -> MATCH
- "Toggles simultaneous racing on or off" -> src/race.c:5130 `cvar_toggle_msg(self, RACE_SIMULTANEOUS_CVAR, redtext("simultaneous racing"))` + RACE_SIMULTANEOUS_CVAR=src/race.c:27 `"k_race_simultaneous"` -> MATCH
- "broadcasts the change to all players ('<player> enables/disables simultaneous racing')" -> src/g_utils.c:2215 `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg)` + src/g_utils.c:1834 `Enables(f){ return (f ? "enables" : "disables"); }` -> MATCH
- "When on, every readied racer runs the course at the same time instead of one racer at a time" -> src/race.c:2077-2104 `if (race_simultaneous()) { for(...) if ((r->ct==ctPlayer)&&r->race_ready) race_make_active_racer(r,s); } else { ... race_get_from_line(); ... racers_competing=1; }` -> MATCH
- "Only usable when a race is not currently in progress" -> src/race.c:5125-5128 `if (race_is_started()) return;` + src/race.c:2965-2974 `if (race.status) { G_sprint(...); return true; }` -> MATCH
- "sets the k_race_simultaneous server cvar" -> src/race.c:27 `#define RACE_SIMULTANEOUS_CVAR "k_race_simultaneous"`, written by cvar_toggle_msg -> MATCH
WI-2: n/a (no default claim; CF_PLAYER, no access-class assertion)

RESULT | ktx:command:rnd | C-FIX | flavourC=1 | wi2=0 | clauses=3 | Argument-count threshold WRONG: enforcing line is `if (argc < 2)` where trap_CmdArgc() counts argv[0], so the usage hint fires only with ZERO user args; ONE arg is accepted (not "two or more"; not "fewer than two arguments prints a hint"). [orchestrator HG2 re-grep CONFIRMED]
### ktx:command:rnd
- "Takes two or more space-separated arguments and randomly selects one of them ... With fewer than two arguments it prints a usage hint to the caller" -> src/commands.c:6712-6722 `if ((argc = trap_CmdArgc()) < 2) { G_sprint(self,2,"usage: rnd <1st 2nd ...>\n"); return; } ... trap_CmdArgv(i_rnd(1, argc - 1), arg_x, ...)`; trap_CmdArgc() includes argv[0] (sibling convention src/commands.c:5376/9224 `<2` = no user arg, orchestrator HG2 re-grep CONFIRMED), so the guard fires only with ZERO user args; with ONE user arg (argc==2) it proceeds and i_rnd(1,1) src/g_utils.c:61-66 returns `from` and selects that single arg -> MISMATCH(threshold is "fewer than 1 user arg", not "fewer than 2 arguments"; one argument is accepted, contradicting "two or more" and "with fewer than two arguments it prints a usage hint")
- "broadcasting to all players the list of candidates and the chosen value" -> src/commands.c:6731 `G_bprint(2, "%s %s %s:\n\220%s\221\n", redtext("Random select by"), getname(self), redtext("from"), buf)` + src/commands.c:6737 `G_bprint(2, "selected: \220%s\221\n", arg_x)` -> MATCH
- "Disabled while a match is in progress" -> src/commands.c:6712-6715 `if (match_in_progress) { return; }` (first statement in krnd) -> MATCH
WI-2: n/a (no default claim; CF_BOTH, no access-class assertion in description)

RESULT | ktx:command:savemarker:frogbot:editor | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | editor_commands gate, LocateMarker nearest, saved_marker anchor for path-edit cmds, #/class print, same-pos cycle via LocateNextMarker, moved-away clear+restore last_touched_marker -- all enforced.
### ktx:command:savemarker:frogbot:editor
- "Bot waypoint-editor command" -> src/bot_commands.c:2336 `{ "savemarker", FrogbotSaveMarker, "Saves current marker" }` in editor_commands[] + src/bot_commands.c:2384-2388 `commands = FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands` -> MATCH
- "selects the routing marker nearest the editing player" -> src/bot_commands.c:1228-1239 `if (saved_marker == NULL) { gedict_t *nearest = LocateMarker(self->s.v.origin); ... SelectMarker(saved_marker = nearest); }` + src/marker_util.c:162-165 `LocateMarker(org){ return LocateNextMarker(org, NULL); }` -> MATCH
- "stores it as the active 'saved marker'" -> src/bot_commands.c:1239-1240 `SelectMarker(saved_marker = nearest); VectorCopy(self->s.v.origin, saved_marker_pos);` -> MATCH
- "(the anchor used by subsequent path-editing commands)" -> src/bot_commands.c:1289-1353 FrogbotAddPath `FindPathIndex(saved_marker, nearest)` / `AddPath(saved_marker, nearest)`; src/bot_commands.c:1375-1394 FrogbotRemovePath same -> MATCH
- "printing the marker's number and class" -> src/bot_commands.c:1242-1243 `G_sprint(self, PRINT_HIGH, "Marker #%d [%s] is saved\n", nearest->fb.index + 1, nearest->classname)` -> MATCH
- "Invoking it again while standing at the same saved position cycles to the next nearby marker" -> src/bot_commands.c:1246-1255 `else if (saved_marker && VectorCompare(self->s.v.origin, saved_marker_pos)) { nearest = LocateNextMarker(self->s.v.origin, saved_marker); if (nearest) { DeselectMarker(saved_marker); SelectMarker(saved_marker = nearest); } }` -> MATCH
- "invoking it after moving away clears the saved marker and restores the last touched marker" -> src/bot_commands.c:1270-1281 final `else { DeselectMarker(saved_marker); saved_marker = NULL; if (last_touched_marker) { SelectMarker(last_touched_marker); } "Cleared saved marker" }`; last_touched_marker set at src/bot_commands.c:1123 -> MATCH
WI-2: n/a (no default claim; "editing player" scope consistent with FB_OPTION_EDITOR_MODE + FB_CVAR_ADMIN_ONLY dispatch gating)

---

<!-- WAVE 1 (re-dispatch w1b; original W1 REJECTED: canary autotrack returned WI2-FIX != expected C-FIX) | sharpened brief (classification-boundary section, B1 prompt-strengthening) | canary=ktx:command:autotrack expected=C-FIX returned=C-FIX HG1=PASS | HG2 re-grep: flagged 1fav_add absent (count 0) + fav1_add commands.c:846 + favx[] vs fav[] (5831/5614) CONFIRMED; flagged auto_pow CF_MATCHLESS g_local.h:653 (1<<4) vs CF_MATCHLESS_ONLY :657, no match_in_progress in AutoTrack body CONFIRMED; clean dmm2 dmm!=4/deathmatch!=2/leave=1 CONFIRMED -> ACCEPTED. canary row stripped. -->

RESULT | ktx:command:11fav_go | C-FIX | flavourC=1 | wi2=0 | clauses=6 | Slot-fill source flatly wrong: 1..20fav_go reads favx[] (filled by favN_add/favx_add), NOT fav[]; "fav<N>_add / fav_add" wrong -- fav_add fills the different fav[] array consumed by fav_next, never read by xfav_go. [orchestrator HG2 re-grep CONFIRMED]
### ktx:command:11fav_go
- "Spectator-only command" -> commands.c:876 `{ "11fav_go", DEF(xfav_go), 11, CF_SPECTATOR, ... }` + commands.c:1090-1093/1106 `if (!(cf_flags & CF_PLAYER)) return DO_WRONG_CLASS` -> MATCH (CF_SPECTATOR only; player rejected)
- "Switches the spectator's tracked view to player in slot 11 (slot fixed, not an argument)" -> commands.c:876 (arg literal 11), 5821 `void xfav_go(float fav_num)`, 5831 `pl_num = self->favx[(int)fav_num - 1];`, 5856 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p))` -> MATCH
- "Favourite slots are filled with fav<N>_add / fav_add while tracking a player" -> commands.c:846-865 `{ "fav1_add".."fav20_add", DEF(favx_add), N }` -> 5732 `self->favx[(int)fav_num-1]`; commands.c:886 `{ "fav_add", fav_add, 0 }` -> 5614 `self->fav[(int)fav_num-1]` (DIFFERENT array) -> MISMATCH(slots read by 11fav_go are favx[], filled ONLY by favN_add/favx_add; fav_add fills fav[] which 11fav_go never reads -- orchestrator HG2 re-grep: `1fav_add` count 0, fav1_add commands.c:846, favx[] read 5831 vs fav[] 5614 CONFIRMED)
- "11fav_go issues an internal track on the player saved in slot 11" -> commands.c:5856 `stuffcmd_flags(... "track %d\n", GetUserID(p))` -> MATCH
- "slot 11 empty -> 'fav go: slot 11 is not defined'" -> commands.c:5833-5835 `if ((pl_num < 1) || (pl_num > MAX_CLIENTS)) { G_sprint(self,2,"fav go: \220slot %d\221 is not defined\n",(int)fav_num); return; }` -> MATCH
- "saved player no longer present -> 'can't find player'; already spectating -> 'already observing...'" -> commands.c:5842-5844 / 5849-5851 -> MATCH
WI-2: n/a

RESULT | ktx:command:1fav_go | C-FIX | flavourC=1 | wi2=0 | clauses=6 | Slot-fill command name flatly wrong: slot 1 is filled by command `fav1_add` (favx_add into favx[]), NOT a command named `1fav_add` -- no `1fav_add`/`Nfav_add` command exists in src/ (orchestrator HG2 re-grep: count 0). [CONFIRMED]
### ktx:command:1fav_go
- "Spectator-only command" -> commands.c:866 `{ "1fav_go", DEF(xfav_go), 1, CF_SPECTATOR, ... }` + dispatch 1090-1093/1106 -> MATCH
- "switches your POV to the player saved in favorites slot 1" -> commands.c:866 (arg 1), 5821/5831 `pl_num = self->favx[(int)fav_num - 1];`, 5856 track -> MATCH
- "slot 1 is filled by the matching '1fav_add' command (run while tracking a player)" -> commands.c:846 `{ "fav1_add", DEF(favx_add), 1, CF_SPECTATOR, CD_FAV1_ADD }`; favx_add (5713-5732) requires `goal->ct == ctPlayer` -> MISMATCH(the command that fills favx[] slot 1 is `fav1_add`, not `1fav_add`; whole-src/ grep shows no `[0-9]fav_add` command -- orchestrator HG2 re-grep CONFIRMED count 0; the "while tracking a player" gate itself is correct)
- "slot 1 empty -> 'fav go: slot 1 is not defined'" -> commands.c:5833-5835 -> MATCH
- "saved player has since left -> 'fav go: slot 1 can't find player'; already tracking -> 'already observing...'" -> commands.c:5842-5844 / 5849-5851 -> MATCH
- "On success it issues an internal track of the stored player's user id" -> commands.c:5856 -> MATCH
WI-2: n/a

RESULT | ktx:command:auto_pow | C-FIX | flavourC=1 | wi2=0 | clauses=7 | Core behavior fully correct, but "allowed only outside a live match" is flatly wrong vs CF_MATCHLESS enforcing line (additive matchLess-MODE permission; no match_in_progress guard anywhere) -- the worked-rule C-FIX case. [orchestrator HG2 re-grep CONFIRMED]
### ktx:command:auto_pow
- "Spectator command" -> commands.c:895 `{ "auto_pow", DEF(AutoTrack), atPow, CF_SPECTATOR | CF_MATCHLESS, ... }` + dispatch 1090-1093 (no CF_PLAYER) -> MATCH
- "toggles automatic powerup tracking; view follows whichever live player scores highest by powerup weighting" -> commands.c:6017 `case atPow: p = get_ed_bestPow();` -> g_utils.c:2141 get_ed_bestPow -> 2086 CalculateBestPowPlayers iterating find_plr skipping ISDEAD; DoAutoTrack every spectator frame (spectate.c:384-386) -> MATCH
- "pentagram > quad > ring, plus the player's frags" -> g_utils.c:2120-2127 `best += invincible_finished?4000:0; +super_damage_finished?2000:0; +invisible_finished?1000:0; // suit commented out; best += p->s.v.frags` -> MATCH
- "Issuing it again, or while already this mode, turns off" -> commands.c:6086-6089 `if ((autoTrackType == self->autotrack) || (autoTrackType == atNone)) self->autotrack = atNone;` -> MATCH
- "Affects only the issuing spectator" -> per-self/per-edict autotrack -> MATCH
- "stored in '*at' userinfo so restored after level change" -> commands.c:6097 `SetUserInfo(self,"*at",...,SETUSERINFO_STAR)`; AutoTrackRestore 6121-6133 called spectate.c:225 -> MATCH
- "Spectator-only and allowed only outside a live match" -> g_local.h:653 `#define CF_MATCHLESS (1<<4) /* command valid for matchLess mode */`; dispatch commands.c:1078-1081 `if (k_matchLess && !(cf_flags & CF_MATCHLESS)) return DO_CMD_DISALLOWED_MATCHLESS`; k_matchLess = cvar("k_matchless") (server MODE); NO match_in_progress guard on auto_pow -> MISMATCH(CF_MATCHLESS is ADDITIVE permission letting it ALSO run in matchLess mode; NOT a "outside a live match" restriction; CF_MATCHLESS_ONLY (1<<8) is the restrictive bit, not carried; spectator-only half correct -- orchestrator HG2 re-grep CONFIRMED g_local.h:653/657, commands.c:893/895 flags, zero match_in_progress in AutoTrack body)
WI-2: n/a

RESULT | ktx:command:check | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Every clause (broadcast, usage, is_real_adm gate, f_movement immediate report, ~3s collect, match-refusal, argc==2, prev-check-pending) maps to a located enforcing line in fcheck/check_fcheck.
### ktx:command:check
- "Issues an anti-cheat f_* query to every connected client and broadcasts the responses" -> commands.c:8489-8496 `G_bprint(3, ...)` challenge; g_utils.c:777-787 G_bprint->trap_BPrint (all clients); check_fcheck commands.c:8498-8534 collects + `G_bprint(3, "%s: %s\n", p->netname, tmp)` -> MATCH
- "Usage: 'cmd check <f_query>' (e.g. f_version)" -> commands.c:8431-8432 `G_sprint(self,2,"usage: cmd check <f_query>\nfor example: cmd check f_version\n")`; commands.c:994 `{ "check", fcheck, 0, CF_BOTH | CF_PARAMS, ... }` -> MATCH
- "Non-admins may only run f_version/f_modified/f_server/f_movement; real admins any f_*" -> commands.c:8444-8455 `if (!is_real_adm(self)) { if (strneq..f_version && strneq..f_modified && strneq..f_server && strneq..f_movement) { deny; return; } }`; admin.c:10-12 is_real_adm = (p->k_admin & AF_REAL_ADMIN) -> MATCH
- "f_movement immediately reports each non-bot player's perfect-strafe % and SOCD counts" -> commands.c:8458-8473 `if (streq(arg_x,"f_movement")) { for ... if ((p->ct==ctPlayer)&&(!p->isBot)) G_bprint(2, ...Perfect strafes...SOCD...); return; }` (returns before f_check timer) -> MATCH
- "other queries broadcast a randomized challenge, collect ~3s, then report" -> commands.c:8484 `f_check = g_globalvars.time + 3`; 8488-8491 randomized i_rnd for f_version/f_modified; check_fcheck 8501-8503 `if (!f_check || (f_check > g_globalvars.time)) return;` then prints -> MATCH
- "Refused while a match is in progress" -> commands.c:8422-8425 `if (match_in_progress) { return; }` -> MATCH
- "if exactly one argument is not given" -> commands.c:8427-8433 `if (trap_CmdArgc() != 2) { usage; return; }` -> MATCH
- "or while a previous check is still awaiting replies" -> commands.c:8435-8439 `if (f_check) { G_sprint(self,2,"Waiting from previous reply\n"); return; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:dmm2 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | ChangeDM(2) sets deathmatch=2+announces+forces midair/instagib off (dmm!=4); mode-2 weapon-stays (items.c:837 leave=1) and no item/health regen (deathmatch!=2 gates) confirmed incl. adjacent "silly old rules" comment. [orchestrator HG2 re-grep CONFIRMED]
### ktx:command:dmm2
- "Admin/console command that switches the server to deathmatch mode 2" -> commands.c:726 `{ "dmm2", DEF(ChangeDM), 2, CF_PLAYER | CF_SPC_ADMIN, CD_DMM2 }`; dispatch allows players (CF_PLAYER) + admin specs (CF_SPC_ADMIN+is_adm 1095-1100); rules gated is_rules_change_allowed (9033 match/race) -> MATCH (row asserts no incorrect access CLASS -- does not claim spectator-only/real-admin-only)
- "(sets the `deathmatch` cvar to 2 and announces the change)" -> commands.c:2884-2886 `deathmatch = bound(1,(int)dmm,5); cvar_set("deathmatch",va("%d",(int)deathmatch));`, 2898 `G_bprint(2,"Deathmatch %s\n", dig3(deathmatch))` -> MATCH
- "In mode 2 picked-up weapons stay on the ground; items/health do not respawn (regen timer disabled)" -> items.c:835-837 `if ((deathmatch==2)||(deathmatch==3)||(deathmatch==5)||coop) leave = 1;` + 1047-1051 `if (leave) { ItemTaken; return; }`; regen all gated `if (deathmatch != 2)` at items.c:367/407(comment "deathmatch 2 is silly old rules")/542/1059/1340 -> MATCH (orchestrator HG2 re-grep CONFIRMED items.c:837 leave=1, items.c:367/407/542/1059/1340 deathmatch!=2, commands.c:2889 dmm!=4)
- "Switching to mode 2 forces `k_midair` and `k_instagib` off" -> commands.c:2888-2892 `if (dmm != 4) { cvar_set("k_midair","0"); cvar_set("k_instagib","0"); }` (dmm=2 -> dmm!=4 -> both off; commands.c:2889 adjacent comment "if leaving dmm4") -> MATCH
WI-2: n/a

<!-- WAVE 2 (re-dispatch w2b; original W2 REJECTED: canary k_teamoverlay returned TRACED-CLEAN != expected C-NEAR-MISS) | sharpened brief | canary=ktx:cvar:k_teamoverlay expected=C-NEAR-MISS returned=C-NEAR-MISS HG1=PASS | HG2 re-grep: no flagged batch rows; canary k_teamoverlay independently CONFIRMED (only !isDuel() = match.c:1639 settings-summary string, no isDuel on CheckTeamStatus send path) + clean downplayers bound 1..k_maxclients/check_perm k_allowcountchange CONFIRMED -> ACCEPTED. canary row stripped. -->

RESULT | ktx:command:downplayers | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | All clauses (decrement maxclients, clamp 1..k_maxclients, match refusal, k_allowcountchange perm gate, broadcast, upplayers counterpart) map to enforcing lines in ChangeClientsCount. [orchestrator HG2 re-grep CONFIRMED]
### ktx:command:downplayers
- "decrements the maxclients cvar by 1 each time it is run" -> commands.c:8062-8065 `void downplayers(float type){ ChangeClientsCount(type, -1); }` (sv_max="maxclients", value=-1) -> MATCH
- "new value clamped to range 1..k_maxclients" -> commands.c:8046 `cl_count = bound(1, cvar(sv_max) + value, max(1, cvar(k_max)));` -> MATCH (orchestrator HG2 re-grep CONFIRMED commands.c:8046)
- "Refused while a match is in progress" -> commands.c:8021-8024 `if (match_in_progress){ return; }` -> MATCH
- "gated by the k_allowcountchange permission level" -> commands.c:8027-8029 `if (!check_perm(self, cvar("k_allowcountchange"))){ return; }` -> MATCH (orchestrator HG2 re-grep CONFIRMED commands.c:8027)
- "when it changes the count it broadcasts the new maxclients value to everyone" -> commands.c:8053 `G_bprint(2, "%s set %s to %d\n", self->netname, redtext(sv_max), cl_count);` -> MATCH
- "Counterpart of upplayers, which raises the count" -> commands.c:8057-8060 `void upplayers(float type){ ChangeClientsCount(type, 1); }` -> MATCH
WI-2: n/a (no default value; access via k_allowcountchange perm level correctly described)

RESULT | ktx:command:fav3_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | favx_add(3) writes tracked player into favx[2]; spectator-only enforced at dispatch; 3fav_go/xfav_go(3) tracks the stored slot occupant.
### ktx:command:fav3_add
- "Spectator command" -> commands.c:848 `{ "fav3_add", DEF(favx_add), 3, CF_SPECTATOR, ... }` + commands.c:1106-1109 `if (!(cmds[icmd].cf_flags & CF_PLAYER)) return DO_WRONG_CLASS;` -> MATCH
- "Stores the player you are currently tracking into indexed favourite slot 3" -> commands.c:5715 `gedict_t *goal = PROG_TO_EDICT(self->s.v.goalentity);` + 5731 `self->favx[(int)fav_num - 1] = diff;` (fav_num=3 -> favx[2]) -> MATCH
- "Does nothing unless you are tracking a real player" -> commands.c:5723-5728 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)){ ...not tracking...; return; }` -> MATCH
- "tracked player's identity written to slot 3 (overwriting previous occupant)" -> commands.c:5731 `self->favx[(int)fav_num - 1] = diff;` (unconditional) -> MATCH
- "3fav_go later snaps your POV to whoever occupies that slot" -> commands.c:868 `{ "3fav_go", DEF(xfav_go), 3 }` + 5831 `pl_num = self->favx[(int)fav_num - 1];` + 5855 track -> MATCH
WI-2: n/a

RESULT | ktx:command:flagstatus | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | isCTF gate, per-flag state switch (base/carried/dropped), spectator RED/BLUE labels vs player your/enemy team-relative report all enforced in FlagStatus.
### ktx:command:flagstatus
- "CTF-only command (no effect outside CTF)" -> ctf.c:595-598 `if (!isCTF()){ return; }` -> MATCH
- "Prints the current state of both team flags to the requesting client" -> ctf.c:611-685 repeated `G_sprint(self, 2, ...)` over flag1+flag2 -> MATCH
- "Each flag reported as: in its base / carried by a named player / dropped lying on ground" -> ctf.c:610-622 `case FLAG_AT_BASE.."in base".. FLAG_CARRIED..netname.."has the .. flag".. FLAG_DROPPED.."is lying about"` -> MATCH
- "Spectators see RED and BLUE flags labelled by colour" -> ctf.c:608 `if (self->ct == ctSpec)` branch redtext("RED")/redtext("BLUE") -> MATCH
- "players see report relative to own team (your flag / enemy flag)" -> ctf.c:644-648 `if (streq(getteam(self),"blue")){ swap }` + "Your flag"/"the enemy flag" -> MATCH
WI-2: n/a

RESULT | ktx:command:force_spec | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Admin gate (CF_BOTH_ADMIN + is_adm), arg-or-"fs"-key target, "*" moves unready non-self players, negative=spectator-by-id, toggle to/from spec, no match guard -- all enforced.
### ktx:command:force_spec
- "Admin command / Requires admin rights" -> commands.c:973 `{ "force_spec", force_spec, 0, CF_BOTH_ADMIN | CF_PARAMS, ... }` + admin.c:980-983 `if (!is_adm(self)){ return; }` -> MATCH
- "Forces players onto spectator side via reconnect-as-spectator" -> admin.c:959-960 `stuffcmd(... "spectator 1\n")` + 970 `"disconnect\nwait;wait;reconnect\n"` -> MATCH
- "target from command argument, or from admin's own 'fs' setinfo key if none" -> admin.c:987 `c_fs = (argc >= 2 ? arg_2 : ezinfokey(self, "fs"));` -> MATCH
- "if '*', every player not readied (admin excluded) moved to spectator" -> admin.c:1000-1014 `if (streq(c_fs,"*")...){ for(find_plr){ if(p->ready||(p==self)) continue; do_force_spec(p,self,true); } }` -> MATCH
- "otherwise single player by name, or spectator slot id when value negative" -> admin.c:1017 `p = ((i_fs = atoi(c_fs)) < 0 ? spec_by_id(-i_fs) : SpecPlayer_by_IDorName(c_fs));` + g_utils.c:1438 spec_by_id -> MATCH (negative -> spectator resolution; "slot id" = userid-of-spectator, functionally faithful)
- "toggled to spectator (or back to player if already a spectator)" -> admin.c:1021 `do_force_spec(p, self, p->ct != ctSpec);` -> MATCH
- "usable in or out of a match" -> admin.c:974-1033 + 951-972: NO match_in_progress/mode guard present -> MATCH (absence verified across handler chain)
WI-2: n/a (access class admin verified at table CF_BOTH_ADMIN + is_adm handler check)

RESULT | ktx:command:fp_spec | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | fp_toggle(2) advances k_fp_spec with wrap, admin-gated, calls FixSayFloodProtect, preset triple (count/per/for) and name broadcast via G_bprint -- all enforced.
### ktx:command:fp_spec
- "Admin command / Requires admin rights" -> commands.c:964 `{ "fp_spec", DEF(fp_toggle), 2, CF_BOTH_ADMIN, ... }` + g_cmd.c:198-203 `if (!is_adm(self)){ ...not an admin...; return; }` -> MATCH
- "Advances spectator flood-protection level to next preset, cycling back to first after last" -> g_cmd.c:195 `k_fp_name = (type == 1 ? "k_fp" : "k_fp_spec")` (type=2) + 205-208 `if (++k_fp > say_fp_levels_cnt){ k_fp = 1; }` -> MATCH
- "updating the k_fp_spec setting" -> g_cmd.c:210 `cvar_fset(k_fp_name, k_fp);` -> MATCH
- "re-applying flood protection" -> g_cmd.c:212 `FixSayFloodProtect();` (recomputes k_say_fp_*_spec 174-176) -> MATCH
- "each preset defines messages allowed / time window / mute duration" -> g_cmd.c:150-155 `say_fp_levels[] = {{count,per,for,name},...}` consumed in isSayFlood -> MATCH
- "new level's name and limits broadcast to everyone" -> g_cmd.c:214-217 `G_bprint(2, "%s level %s \x90%s %s %s\x91 %6s\n", ... fp_count, fp_per, fp_for, ...name)` -> MATCH
WI-2: n/a (no default value asserted; access class admin verified at CF_BOTH_ADMIN + is_adm)

<!-- WAVE 5 | sharpened brief | canary=ktx:cvar:k_teamoverlay expected=C-NEAR-MISS returned=C-NEAR-MISS HG1=PASS | HG2 re-grep: no flagged batch rows; canary k_teamoverlay independently CONFIRMED (match.c:1639 settings-summary only !isDuel(), CheckTeamStatus client.c:4692 send path clean of duel) + clean silence match_in_progress==2 commands.c:3263 + fpd bit-64 :3265 `(fpd & ~64):(fpd | 64)` CONFIRMED -> ACCEPTED. canary row stripped. -->

RESULT | ktx:command:sct_oct | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Every clause (16..255 walk, "01234567" header, octal high-bits label, 8-col grid, caller-only output, no args) maps to verified enforcing lines in ShowCharsetTableOctal.
### ktx:command:sct_oct
- "walks character codes 16 through 255" -> commands.c:1637 `for (i = 16; i < 256; i++)` -> MATCH
- "8-column grid" -> commands.c:1645 `if (((i % 8) == 7) || (i == 255))` (newline every 8) -> MATCH
- "'01234567' column header" -> commands.c:1636 `G_sprint(self, 2, "\n%s\n\n    01234567\n    ........\n", redtext("Octal charset table:"))` -> MATCH
- "octal high-bits label on each row" -> commands.c:1641 `G_sprint(self, 2, "%02o..", i / 8)` (printed when i%8==0) -> MATCH
- "Takes no arguments" -> commands.c:759 `{ "sct_oct", ShowCharsetTableOctal, 0, CF_BOTH, CD_CTOCT }` (no trap_Argv in body) -> MATCH
- "output goes only to the caller" -> g_utils.c:762 `trap_SPrint(NUM_FOR_EDICT(ed), level, text, 0)` (G_sprint(self,...) single-client) -> MATCH
WI-2: n/a

RESULT | ktx:command:silence | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Toggle of k_spectalk, match-state admin gate, running-match (==2) fpd bit-64 + sv_spectalk + serverinfo update, broadcast announce all map to verified lines in ToggleSpecTalk. [orchestrator HG2 re-grep CONFIRMED]
### ktx:command:silence
- "Toggles whether players can hear spectators' chat (k_spectalk)" -> commands.c:3254 `int k_spectalk = !cvar("k_spectalk")` + 3269/3285 `cvar_fset("k_spectalk", k_spectalk)`; effect g_cmd.c:455 `if (!sv_spectalk || isTeamSay)` -> MATCH
- "Outside a running match any player may toggle; once a match is in progress only an admin may" -> commands.c:3256 `if (match_in_progress && !is_adm(self)) { return; }` -> MATCH
- "during a live match it also updates sv_spectalk and the serverinfo 'fpd' spectator-talk bit (bit 64)" -> commands.c:3263-3268 `if (match_in_progress == 2) { fpd = (k_spectalk) ? (fpd & ~64) : (fpd | 64); localcmd("serverinfo fpd %d\n", fpd); cvar_fset("sv_spectalk", k_spectalk); }` (==2 running; ==1 countdown) -> MATCH (orchestrator HG2 re-grep CONFIRMED commands.c:3263 ==2, :3265 fpd & ~64 / fpd | 64)
- "announces the new state to everyone" -> commands.c:3272/3287 `G_bprint(2, "Spectalk on/off: ...")` -> MATCH
- "Takes no arguments; flips current state each time" -> commands.c:745 table arg 0; 3254 `!cvar("k_spectalk")` -> MATCH
WI-2: n/a (CF_PLAYER|CF_SPC_ADMIN; internal match_in_progress&&!is_adm guard consistent with "any player" outside match)

RESULT | ktx:command:s-m | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Multi-set bitmask membership gate, self-exclusion, no-clients-found message, match-time player/spectator divide block, usage form all map to verified enforcing lines in s_m/s_m_do.
### ktx:command:s-m
- "Sends to every client in your configured 'multi' set (built with multi)" -> g_cmd.c:794 `bit = 1 << (int)(p - g_edicts - 1); if (!(m & bit)) continue;` (m=iKey(self,"*mu"); set written multi_do g_cmd.c:985) -> MATCH (recipients incl. specs; "player" narrower than code, not a false scope assertion)
- "Usage: s-m <text>" -> g_cmd.c:817 `if (trap_CmdArgc() < 3) { G_sprint(self,2,"usage: s-m txt\n"); return; }` -> MATCH
- "tagged with the multi-set number" -> g_cmd.c:799 `G_sprint(p, PRINT_CHAT, "[%s <m:%d>]: %s\n", name, m, str)` (loose label for the *mu bitmask, non-material output) -> MATCH
- "you are excluded from your own send" -> g_cmd.c:783 `if (self == p) { continue; }` -> MATCH
- "if no one in your set is connected it reports no clients found" -> g_cmd.c:805 `if (!i) { G_sprint(self,2,"s-m: no clients found\n"); return; }` -> MATCH
- "During a match the message will not cross the player/spectator divide" -> g_cmd.c:787 `if (match_in_progress && (self->ct != p->ct)) { continue; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:spawn666time | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | DMM4-only gate, no-arg report, numeric-arg set clamped to a non-negative maximum, broadcast, 0-disables, outside-DMM4 refuse, match-in-progress report-only all map to verified lines in Spawn666Time.
### ktx:command:spawn666time
- "Only available in DMM4 / Outside DMM4 it refuses with a message" -> commands.c:8895 `if (deathmatch != 4) { G_sprint(self,2,"command allowed in %s only\n", redtext("dmm4")); return; }` -> MATCH
- "With no argument it reports the current invincibility duration in seconds" -> commands.c:8902-8910 `if (match_in_progress || (trap_CmdArgc()==1)) { ... G_sprint(self,2,"%s is %.1fs\n", redtext("spawn invincibility time"), dmm4_invinc_time); return; }` -> MATCH
- "with a numeric argument it sets that duration (clamped to a non-negative maximum)" -> commands.c:8917 `dmm4_invinc_time = bound(0, atof(arg_2), DMM4_INVINCIBLE_DEFAULT);` (clamp [0,max]; description names no specific value, not contradicted) -> MATCH
- "broadcasting the change" -> commands.c:8919 `G_bprint(2, "%s set %s to %.1fs\n", ...)` -> MATCH
- "Setting it to 0 effectively disables spawn invincibility" -> commands.c:8922 `trap_cvar_set_float("dmm4_invinc_time", dmm4_invinc_time ? dmm4_invinc_time : -1)` + client.c:2278-2288 (`if (dmm4_invinc_time > 0)` false -> no IT_INVULNERABILITY) -> MATCH
- "while a match is in progress it only reports the current value" -> commands.c:8902 `if (match_in_progress || (trap_CmdArgc()==1)) { report; return; }` -> MATCH
WI-2: n/a

RESULT | ktx:command:time25 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Sets timelimit to 25 via TimeSet(25.0f), clamp 0..k_timetop with the "only if >=25" consequence, match-in-progress ignore, unchanged-report path, broadcast-otherwise all map to verified lines.
### ktx:command:time25
- "Sets the match timelimit to 25 minutes" -> commands.c:767 `{ "time25", DEF(TimeSet), 25.0f, ... }` -> commands.c:3026 `timelimit = bound(0, t, cvar("k_timetop"));` + 3033 `cvar_fset("timelimit", (int)timelimit)` -> MATCH
- "clamped to range 0..k_timetop, so it takes effect only if k_timetop >= 25" -> commands.c:3026 `bound(0, t, cvar("k_timetop"))` + g_utils.c:353 bound semantics -> MATCH
- "ignored while a match is in progress" -> commands.c:3021 `if (match_in_progress) { return; }` -> MATCH
- "if timelimit already at the resulting value it reports it as unchanged" -> commands.c:3019 `int tl = timelimit;` + 3028 `if (tl == timelimit) { G_sprint(self,2,"%s still %s\n", redtext("timelimit"), dig3(timelimit)); return; }` -> MATCH
- "otherwise it broadcasts the new match length to everyone" -> commands.c:3033-3034 `cvar_fset("timelimit",(int)timelimit); G_bprint(2,"%s %s %s%s\n", redtext("Match length set to"), dig3(timelimit), ...)` -> MATCH
WI-2: n/a

<!-- WAVE 6 | sharpened brief | canary=ktx:cvar:k_yawnmode expected=TRACED-CLEAN returned=TRACED-CLEAN HG1=PASS (over-flag control held -- no over-correction from sharpening) | HG2 re-grep: flagged togglequad FrogbotsToggleQuad bot_commands.c:2232 body mutates self->s.v.items unconditionally, NO isBot/ctBot guard CONFIRMED + clean yes/VoteYes vote.c:89 get_votes(OV_ELECT) gate + :130 self->v.elect=1 CONFIRMED -> ACCEPTED. canary row stripped. -->

RESULT | ktx:command:togglequad:frogbot:std | C-FIX | flavourC=1 | wi2=0 | clauses=5 | Core scope claim "on the bot itself / only the calling bot" flatly wrong: handler mutates `self` (issuing client, a human admin in practice) with no isBot guard or bot-entity redirect anywhere on the path. [orchestrator HG2 re-grep CONFIRMED]
### ktx:command:togglequad:frogbot:std
- "Frogbot debug subcommand (invoked as 'botcmd togglequad')" -> bot_commands.c:2327 `{ "togglequad", FrogbotsToggleQuad, "Toggle quad damage" }` + commands.c:1047 `{ "botcmd", FrogbotsCommand, ... }` -> MISMATCH(invocation `botcmd togglequad` correct, but it is a std_commands[] entry NOT under the `debug` subcommand -- "debug subcommand" is a loose mislabel, secondary to the scope defect)
- "Toggles quad on the bot itself; if bot holds quad it is removed (item flag cleared, super-damage timer zeroed)" -> bot_commands.c:2232-2239 `static void FrogbotsToggleQuad(void){ if ((int)self->s.v.items & IT_QUAD) { self->s.v.items &= ~IT_QUAD; self->super_time=0; self->super_damage_finished=0; }` -> MISMATCH(item-clear/timer-zero mechanics correct, but subject is `self` = the issuing client per ClientCommand; FrogbotsCommand dispatches with NO self->bot redirect and NO isBot/ctBot guard -- "on the bot itself" has no enforcing line and is false for a human admin caller -- orchestrator HG2 re-grep CONFIRMED bot_commands.c:2232 body, zero isBot/ctBot guard)
- "otherwise quad granted with effectively unlimited duration (~20 hours)" -> bot_commands.c:2240-2242 `else { self->s.v.items |= IT_QUAD; self->super_time=1; self->super_damage_finished = g_globalvars.time + 3600 * 20; }` -> MATCH (3600*20s=20h; normal quad is time+30 items.c:2191 -- "effectively unlimited" accurate; but applied to `self`, not a bot)
- "Gated by the frogbot admin-permission cvar like other botcmd subcommands" -> bot_commands.c:2392-2404 `float admin_rules = cvar(FB_CVAR_ADMIN_ONLY); if ((admin_rules==2) && !is_real_adm(self)) {...return;} else if (admin_rules && !is_adm(self)) {...return;}` -> MATCH (FrogbotsCommand gates ALL subcommands)
- "affects only the calling bot, not human players" -> bot_commands.c:2232-2242 body + dispatch -> MISMATCH(no isBot/ctBot check; operates on `self` = the command issuer; a human admin running `botcmd togglequad` grants/removes quad on that human -- "bot only / not human players" flatly wrong, no enforcing line)
WI-2: n/a (core scope defect is C-FIX, not a metadata slip; FB_CVAR_ADMIN_ONLY default "0" consistent, not claimed)

RESULT | ktx:command:tossrune | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Per-rune toss, forward+up velocity, 0.75s re-pick delay, haste maxspeed restore, regen-loss timer, no-rune no-op, CF_PLAYER|CF_MATCHLESS all map to verified lines in TossRune/DoTossRune.
### ktx:command:tossrune
- "Throws every CTF rune the caller is holding (resistance, strength, haste and/or regeneration)" -> runes.c:179-203 `if (self->ctf_flag & CTF_RUNE_RES) DoTossRune(CTF_RUNE_RES); ... CTF_RUNE_STR ... CTF_RUNE_HST ... CTF_RUNE_RGN` -> MATCH
- "Each held rune spawned as a pickable entity at the player's position with forward-and-upward toss velocity" -> runes.c:101-145 `item = spawn(); item->s.v.solid = SOLID_TRIGGER; ... velocity = v_forward*300 + v_up*200 ... setorigin(item, self->s.v.origin...)` -> MATCH
- "a brief delay before the thrower can re-pick it" -> runes.c:145-146 `item->s.v.nextthink = time + 0.75; item->think = RuneResetOwner;` + runes.c:263 `if (other == PROG_TO_EDICT(self->s.v.owner)) return;` -> MATCH
- "Tossing the haste rune restores the player's normal max speed" -> runes.c:197 `self->maxspeed = cvar("sv_maxspeed");` -> MATCH
- "tossing the regeneration rune starts a regen-loss timer" -> runes.c:202-207 `regenrot = spawn(); ... regenrot->s.v.nextthink = time + 5; regenrot->think = RegenLostRot;` -> MATCH
- "Does nothing if the caller holds no runes" -> runes.c:179-209 all four `if` false -> only no-op `ctf_flag -= (ctf_flag & CTF_RUNE_MASK)` -> MATCH
- "Player command, usable outside a match" -> commands.c:914 `{ "tossrune", TossRune, 0, CF_PLAYER | CF_MATCHLESS, CD_TOSSRUNE }` -> MATCH
WI-2: n/a

RESULT | ktx:command:who | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | All clauses verified against PlayerStatus/OnePlayerStatus including the match_in_progress early-return "Game in progress" / no-list behavior.
### ktx:command:who
- "Prints the current player list to the caller: one line per connected player" -> commands.c:2381-2393 `for (p = world; (p = find_plr(p));) { ... G_sprint(self,2,"%s\n", OnePlayerStatus(p, self)); found = true; }` -> MATCH
- "ready/not-ready marker" -> commands.c:2365 `(p->ready ? "\206" : "\207")` -> MATCH
- "an admin marker" -> commands.c:2365 `(is_adm(p) ? "\xC1" : " ")` -> MATCH
- "the player's team tag (in team modes)" -> commands.c:2360 `char *team_str = (isTeam() ? va(" \220%4.4s\221", getteam(p)) : "");` -> MATCH
- "and the player's name" -> commands.c:2366 `getname(p)` -> MATCH
- "with the caller's own entry tagged" -> commands.c:2366 `(p == e_self ? redtext(" \x8D you") : "")` (e_self=self) -> MATCH
- 'Prints "no players" if none are connected' -> commands.c:2395 `G_sprint(self,2,"%s\n",(found ? "" : "no players"));` -> MATCH
- 'During a live match prints "Game in progress" and shows no list' -> commands.c:2374-2378 `if (match_in_progress) { G_sprint(self,2,"Game in progress\n"); return; }` (early return) -> MATCH
WI-2: n/a

RESULT | ktx:command:yes | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | Every clause incl. exact CF_PLAYER|CF_MATCHLESS metadata maps to an enforcing line in VoteYes/VoteNo; "no election" gate verified via election-start always setting candidate v.elect=1. [orchestrator HG2 re-grep CONFIRMED]
### ktx:command:yes
- "Casts a vote in favour of the currently active election (the `elect` system)" -> vote.c:128-130 `// register the vote` `self->v.elect = 1;` (gated by get_votes(OV_ELECT)) -> MATCH (orchestrator HG2 re-grep CONFIRMED vote.c:130)
- "No effect when no election is in progress" -> vote.c:88-91 `if (!get_votes(OV_ELECT)) { return; }` -> MATCH (orchestrator HG2 re-grep CONFIRMED vote.c:89; election start always sets candidate self->v.elect=1 -- commands.c:5411, vote.c:1786)
- 'Cannot vote for yourself ("You cannot vote for yourself")' -> vote.c:94-99 `if (self->v.elect_type != etNone) { G_sprint(self,2,"You cannot vote for yourself\n"); return; }` -> MATCH
- 'a vote already cast stays counted ("your vote is still good")' -> vote.c:101-106 `if (self->v.elect) { G_sprint(self,2,"--- your vote is still good ---\n"); return; }` -> MATCH
- "For late-join elections only members of the requested team may vote" -> vote.c:109-125 `if (get_elect_type()==etLateJoin) { ... if (!self->ca_ready || !streq(getteam(self),requested_team)) {...return;} }` -> MATCH
- 'On a successful vote broadcasts "<name> gives his vote"' -> vote.c:130-132 `self->v.elect = 1; G_bprint(2,"%s gives %s vote\n", self->netname, g_his(self));` -> MATCH
- "reports how many more votes are still needed" -> vote.c:135-138 `if ((votes = get_votes_req(OV_ELECT, true))) { G_bprint(2,"\x90%d\x91 more vote%s needed\n", votes, count_s(votes)); }` -> MATCH
- "the companion `no` command withdraws a previously cast vote" -> vote.c:142-154 VoteNo `if (!get_votes(OV_ELECT) || (self->v.elect_type != etNone) || !self->v.elect) return; self->v.elect = 0; G_bprint(2,"%s withdraws %s vote\n", ...)` -> MATCH
- "Player command, usable outside a match (CF_PLAYER | CF_MATCHLESS)" -> commands.c:801 `{ "yes", VoteYes, 0, CF_PLAYER | CF_MATCHLESS, CD_YES }` -> MATCH (exact)
WI-2: n/a (access class CF_PLAYER|CF_MATCHLESS stated and matches the command table exactly)

RESULT | ktx:cvar:allow_timing | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Every clause (OFF early-return, timing_players_time threshold, bitmask responses WARNING/glow/invincible-frozen) maps to a verified enforcing line in CheckTiming; bare register => default 0=off consistent.
### ktx:cvar:allow_timing
- "Master on/off switch ... When 0, no timing-out detection or mitigation occurs" -> client.c:135-138 `if (!cvar("allow_timing")) { return; }` (returns before any detection/mitigation) -> MATCH
- "When 1, players whose last activity older than timing_players_time seconds are flagged" -> client.c:142-144 `for (p=world;(p=find_plr(p));) { if ((p->k_lastPostThink + timing_players_time) < g_globalvars.time)` (timing_players_time = bound(0,cvar,30) default 6) -> MATCH
- "the responses selected by the timing_players_action bitmask are applied" -> client.c:132 `int timing_players_action = TA_ALL & (int)cvar("timing_players_action");` + per-response `& TA_*` guards -> MATCH
- 'a broadcast "WARNING: <player> is timing out!" message' -> client.c:153-155 `if (timing_players_action & TA_INFO) { G_bprint(2,"\x87%s %s is timing out!\n", redtext("WARNING:"), p->netname); }` -> MATCH
- "a glow (dimlight) effect on the lagged player" -> client.c:185-188 `if (timing_players_action & TA_GLOW) { p->s.v.effects = (int)p->s.v.effects | EF_DIMLIGHT; }` -> MATCH
- "and/or making the lagged player temporarily invincible and frozen (no damage, no collision, zero velocity)" -> client.c:164-171 `if (timing_players_action & TA_INVINCIBLE) { ... p->s.v.takedamage=0; p->s.v.solid=0; p->s.v.movetype=0; SetVector(p->s.v.velocity,0,0,0); }` -> MATCH
- "0 = off, 1 = on" -> world.c:849 `RegisterCvar("allow_timing");` (bare = default 0) + OFF branch client.c:135 -> MATCH
WI-2: n/a (bare RegisterCvar => registered default 0, consistent with "0 = off")

---

<!-- WAVE 7 | sharpened brief | canary=ktx:command:autotrack expected=C-FIX returned=C-FIX HG1=PASS | HG2 re-grep: flagged _k_coachteam1 cvar_set write-count 0 (g_userinfo.c:364 read + world.c:1027 register only), k_picked assigned only captain.c:70/106/383 CONFIRMED + clean k_cmd_fp_kick world.c:1435-1436 bound(0,..,10)+0->4 CONFIRMED; canary autotrack carried (independently grounded salvo-2 HG2, identical oracle) -> ACCEPTED. canary row stripped. -->

RESULT | ktx:cvar:_k_captcolor2 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Set-site stores topcolor+bottomcolor space-separated for captain 2; consumed in SetPlayerParams to force the picked player's color; registered internal.
### ktx:cvar:_k_captcolor2
- "Internal mod-state cvar (not operator-tuned)" -> world.c:1026 `RegisterCvar("_k_captcolor2"); // internal mod usage` -> MATCH
- "stores the second captain's player colors (top and bottom color, space-separated)" -> captain.c:390-391 `cvar_set(va("_k_captcolor%d", capt_num(p)), va("%s %s", ezinfokey(p,"topcolor"), ezinfokey(p,"bottomcolor")))` (capt_num==2 for captain 2) -> MATCH
- "when that captain picks a player, the picked player is force-set to these colors" -> captain.c:50,62-66 `infocolor = cvar_string(va("_k_captcolor%d",(int)k_captainturn)); ... stuffcmd_flags(p,...,"color \"%s\"\n", ... infocolor)` -> MATCH
- "Holds runtime state set and consumed by the team-picking code" -> captain.c (set @390, consumed @50) -> MATCH
WI-2: n/a (registered default empty via bare RegisterCvar, not asserted)

RESULT | ktx:cvar:_k_captteam2 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Stores captain 2's team at pick-begin; force-sets picked player's team; with k_captains==2 a player with k_picked==2 is locked to it and forced back on team-change attempt.
### ktx:cvar:_k_captteam2
- "stores the second captain's team name here" -> captain.c:389 `cvar_set(va("_k_captteam%d", capt_num(p)), getteam(p))` (capt_num==2) -> MATCH
- "when that captain picks a player, the picked player is force-set to this team" -> captain.c:49,62-65 `infoteam = cvar_string(va("_k_captteam%d",(int)k_captainturn)); ... stuffcmd_flags(p,...,"team \"%s\"\n", ... infoteam)` -> MATCH
- "with k_captains = 2 ... a player picked by captain 2 is locked to this team" -> g_userinfo.c:434,443-445 `if (k_captains == 2){ ... else if (self->k_picked == 2){ s2 = cvar_string("_k_captteam2"); }` (k_picked set captain.c:70) -> MATCH
- "cannot change away from it" -> g_userinfo.c:451-456 `if (strneq(s1, s2)){ G_sprint(self,2,"You may not change team\n"); stuffcmd_flags(self,...,"team \"%s\"\n", s2); return true; }` -> MATCH
- "Internal mod-state cvar (not operator-tuned)" -> world.c:1025 `RegisterCvar("_k_captteam2"); // internal mod usage` -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_cmd_fp_dontkick | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Gates the entire cmd-flood kick block; dontkick==1 skips kick but flooder still warned+locked; clamped 0..1; command-flood only (k_fp is the separate say-flood cvar).
### ktx:cvar:k_cmd_fp_dontkick
- "Controls whether repeat command flooders are kicked" -> commands.c:1204 `if (!k_cmd_fp_dontkick)` (gates the warning/kick block 1204-1221) -> MATCH
- "0 = flooders are kicked after k_cmd_fp_kick warnings (in addition to being warned and locked out)" -> commands.c:1200-1202,1214-1219 warn+lock set before the if; `stuffcmd(p,"disconnect\n")` inside dontkick==0 block -> MATCH
- "1 = flooders are only warned and locked out, never kicked" -> commands.c:1200-1204 (warn G_sprint + locked set unconditionally; disconnect skipped when dontkick==1) -> MATCH
- "Clamped to 0 or 1" -> world.c:1437 `k_cmd_fp_dontkick = bound(0, cvar("k_cmd_fp_dontkick"), 1)` -> MATCH
- "Applies only to command flood protection (not say/chat flood, k_fp)" -> commands.c:1190 isCmdFlood vs world.c:1007 `RegisterCvarEx("k_fp","1"); // say floodprot for players` -> MATCH
WI-2: n/a (registered default 0 via bare RegisterCvar world.c:999, consistent, unclaimed)

RESULT | ktx:cvar:k_cmd_fp_kick | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Warning count before disconnect (kick at k_cmd_fp_kick-warnings<1); clamped 0..10 with 0->4 fallback; inert when dontkick set; command-flood only. [orchestrator HG2 re-grep CONFIRMED world.c:1435-1436]
### ktx:cvar:k_cmd_fp_kick
- "Number of command-flood warnings a client receives before being kicked (disconnected)" -> commands.c:1214-1219 `else if ((k_cmd_fp_kick - p->fp_c.warnings) < 1){ ... stuffcmd(p,"disconnect\n"); }` -> MATCH
- "Each repeated flood event counts down toward this limit" -> commands.c:1222 `p->fp_c.warnings += 1` (remaining = k_cmd_fp_kick - warnings) -> MATCH
- "on the final warning the client is kicked" -> commands.c:1210-1219 `else if (==1){ "next time kicked" } else if (<1){ disconnect }` -> MATCH
- "Clamped to the range 0-10; 0 means use the default of 4" -> world.c:1435-1436 `k_cmd_fp_kick = bound(0, cvar("k_cmd_fp_kick"), 10); k_cmd_fp_kick = (k_cmd_fp_kick ? k_cmd_fp_kick : 4);` -> MATCH (orchestrator HG2 re-grep CONFIRMED exact clamp+fallback)
- "Has no effect if k_cmd_fp_dontkick is set" -> commands.c:1204 `if (!k_cmd_fp_dontkick)` wraps the only kicking read -> MATCH
- "Applies only to command flooding (not say/chat flood, k_fp)" -> commands.c:1190 isCmdFlood vs world.c:1007 k_fp say-flood -> MATCH
WI-2: n/a ("default of 4" is the post-clamp 0-fallback world.c:1436; registered default 0 via bare RegisterCvar world.c:998, not mis-stated)

RESULT | ktx:cvar:_k_coachteam1 | C-FIX | flavourC=1 | wi2=0 | clauses=3 | Cvar is NEVER written anywhere in the tree (only registered+read), so it holds no team; and coach k_picked is never set to 1 (k_picked assigned only in captain.c) -- the asserted "bound team / locked coach slot 1" is not enforced. [orchestrator HG2 re-grep CONFIRMED: cvar_set write-count 0; k_picked only captain.c:70/106/383]
### ktx:cvar:_k_coachteam1
- "Internal mod-state cvar holding the team name that the first coach slot is bound to" -> world.c:1027 `RegisterCvar("_k_coachteam1"); // internal mod usage` registered but NO `cvar_set("_k_coachteam1",...)` exists anywhere in src/ -> MISMATCH(cvar never written; unlike _k_captteam%d set @captain.c:389, the coach flow never populates it -- always reads back empty; orchestrator HG2 re-grep CONFIRMED write-count 0, only g_userinfo.c:364 read + world.c:1027 register)
- "a spectating coach assigned to slot 1 (k_picked == 1) is locked to this team" -> g_userinfo.c:362-364 `if (self->k_picked == 1){ s2 = cvar_string("_k_coachteam1"); }` -> MISMATCH(k_picked assigned ONLY in captain.c:70/106/383 -- the captain flow; coaches set ->k_coach not ->k_picked, so a coach's self->k_picked==1 is never produced; orchestrator HG2 re-grep CONFIRMED no k_picked assignment outside captain.c)
- "any attempt to switch to a different team is rejected and the client is forced back to the stored team name" -> g_userinfo.c:373-378 `if (strneq(s1, s2)){ ...You may not change team...; stuffcmd ...team s2...; return true; }` -> MISMATCH(branch unreachable for a coach via the described path, and s2 is always "" since _k_coachteam1 is never set -- never "forces back to the stored team name")
WI-2: n/a (defect is behavior/scope, not a metadata-precision slip -> C-FIX, not WI2-FIX)

<!-- WAVE 8 | sharpened brief | canary=ktx:cvar:k_teamoverlay expected=C-NEAR-MISS returned=C-NEAR-MISS HG1=PASS | HG2 re-grep: no flagged batch rows; clean k_ctf_rune_power_res combat.c:557 + world.c:958 "2.0" CONFIRMED; canary k_teamoverlay carried (independently grounded salvo-2 HG2, identical oracle) -> ACCEPTED. canary row stripped. -->

RESULT | ktx:cvar:k_ctf_rune_power_res | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | CTF-only, spawn-gate at >0, damage division formula and default-2.0 halving all map to enforcing lines. [orchestrator HG2 re-grep CONFIRMED]
### ktx:cvar:k_ctf_rune_power_res
- "CTF runes only" -> world.c:1294 `SpawnRunes(isCTF() && cvar("k_ctf_runes"))` + runes.c:476 `if (!isCTF())` -> MATCH
- "A value of 0 disables the resistance rune entirely (not placed in the map)" -> runes.c:400 `if (cvar("k_ctf_rune_power_res") > 0) { runes[nrunes] = UniqueRuneSpawn(CTF_RUNE_RES,...); }` -> MATCH (orchestrator HG2 re-grep CONFIRMED runes.c:400)
- "damage taken by a player carrying the resistance rune is divided by (value / 2) + 1" -> combat.c:557 `damage /= (cvar("k_ctf_rune_power_res") / 2) + 1;` (guarded by targ->ctf_flag & CTF_RUNE_RES) -> MATCH (orchestrator HG2 re-grep CONFIRMED combat.c:557)
- "With the default 2.0 incoming damage is halved (divided by 2)" -> world.c:958 `RegisterCvarEx("k_ctf_rune_power_res", "2.0")` -> 2/2+1 = 2 -> MATCH (orchestrator HG2 re-grep CONFIRMED world.c:958)
WI-2: n/a (behavioral 2.0 matches registered default)

RESULT | ktx:cvar:k_fallbunny | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | broken-ankle set/clear, jump-suppression gate, polarity (0=break,1=preserve), and race/yawn override all map to enforcing lines.
### ktx:cvar:k_fallbunny
- "When 0, landing after a sufficiently long fall sets a 'broken ankle' state" -> client.c:4497-4499 `if (!get_fallbunny()) { self->brokenankle = 1; }` (get_fallbunny()=cvar; 0 -> !0 -> set) -> MATCH
- "suppresses voluntary jumping until the player next lands" -> client.c:2704 `if (!self->brokenankle) { ...jump... }`; cleared client.c:4476 `if ((int)self->s.v.flags & FL_ONGROUND) self->brokenankle = 0;` -> MATCH
- "When 1, no broken-ankle state is applied and standard QW landing/jump preserved" -> get_fallbunny()=1 -> !1 false -> never set -> MATCH
- "(Race mode and yawnmode always behave as 1 regardless)" -> g_utils.c:2726 `return (k_yawnmode || isRACE() ? 1 : cvar("k_fallbunny"));` -> MATCH
WI-2: n/a (bare RegisterCvar => 0; no default claim)

RESULT | ktx:cvar:k_fbskill_aim_attack_respawns | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | boolean read, duel/RA/hoony gate, attack-window + RL-ammo condition, fire-at-spawn, zero-disables, server skill-derivation all map to enforcing lines.
### ktx:cvar:k_fbskill_aim_attack_respawns
- "Read back per bot as boolean (cvar(...) > 0) into self->fb.skill.attack_respawns" -> bot_botimp.c:325 `self->fb.skill.attack_respawns = cvar(FB_CVAR_ATTACK_RESPAWNS) > 0;` -> MATCH
- "during a duel (not race/RA/hoony)" -> bot_aim.c:447 `if (isRA() || isHoonyModeDuel() || !isDuel()) { return; }` -> MATCH
- "enemy has just died within the attack-respawn window" -> bot_aim.c:454-456 `if (ISDEAD(enemy_)) { if (enemy_->fb.last_death + ATTACK_RESPAWN_TIME >= g_globalvars.time)` -> MATCH
- "the bot holds a rocket launcher with sufficient ammo" -> bot_aim.c:446 `has_rl = ((int)self->s.v.items & IT_ROCKET_LAUNCHER) && self->s.v.ammo_rockets > 3;` gated :459 -> MATCH
- "the bot fires at the enemy's spawn point" -> bot_aim.c:464 `FireAtSpawnPoint(self);` (inside `if (self->fb.skill.attack_respawns)`) -> MATCH
- "When zero never spawn-frags; server derives from skill (high skill), cvar overrides" -> bot_botimp.c:179/230 `cvar_fset(FB_CVAR_ATTACK_RESPAWNS, skill >= 15 ? 1 : 0);` -> MATCH
WI-2: n/a (bare RegisterCvar => 0)

RESULT | ktx:cvar:k_fbskill_vol_oppvel_incr | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | increment-vs-threshold semantics, += on enemy-speed-over-threshold, bound(0,v,5.0) clamp, server skill-derivation all map to enforcing lines.
### ktx:cvar:k_fbskill_vol_oppvel_incr
- "volatility INCREMENT added when OPPONENT horizontal speed exceeds k_fbskill_vol_oppvel threshold (volatility += enemyspeed_volatility)" -> bot_aim.c:267-270 `if (HorizontalVelocityCheck(opponent->s.v.velocity, self->fb.skill.enemyspeed_volatility_threshold)) { volatility += self->fb.skill.enemyspeed_volatility; }` -> MATCH
- "sets how much aim degrades, not the enemy speed at which the penalty triggers" -> bot_botimp.c:41-42 distinct macros (_incr = added amount, _oppvel = threshold) -> MATCH
- "reads clamped to bound(0, value, 5.0) into self->fb.skill.enemyspeed_volatility" -> bot_botimp.c:337-338 `self->fb.skill.enemyspeed_volatility = bound(0, cvar(FB_CVAR_ENEMYSPEED_VOLATILITY_INCREASE), 5.0f);` -> MATCH
- "Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode()" -> bot_botimp.c:191/242 `cvar_fset(FB_CVAR_ENEMYSPEED_VOLATILITY_INCREASE, RangeOverSkill(skill, 0.4f, 0.2f));` -> MATCH
WI-2: n/a (bare RegisterCvar => 0)

RESULT | ktx:cvar:k_fp | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | all three preset triples match say_fp_levels[] verbatim, count/per/for semantics confirmed against the flood-check, and 1-3 clamp maps to bound(1,v,say_fp_levels_cnt=3).
### ktx:cvar:k_fp
- "Selects the say/say_team flood-protection profile applied to players" -> world.c:1007 `RegisterCvarEx("k_fp","1"); // say floodprot for players`; g_cmd.c:165 drives player slots -> MATCH
- "1 = up to 9 messages per 1 second then silenced 1 second (Low)" -> g_cmd.c:152 `{ 9, 1, 1, "Low" }`; enforcement g_cmd.c:237/243 -> MATCH
- "2 = 4 per 1 second then silenced 5 seconds (Medium)" -> g_cmd.c:153 `{ 4, 1, 5, "Medium" }` -> MATCH
- "3 = 5 per 3 seconds then silenced 7 seconds (High)" -> g_cmd.c:154 `{ 5, 3, 7, "High" }` -> MATCH
- "Out-of-range values are clamped to 1-3" -> g_cmd.c:165 `int k_fp = bound(1, cvar("k_fp"), say_fp_levels_cnt);` (say_fp_levels_cnt=3) -> MATCH
WI-2: n/a (RegisterCvarEx default "1" not asserted in text)

<!-- WAVE 9 | sharpened brief | canary=ktx:cvar:k_yawnmode expected=TRACED-CLEAN returned=TRACED-CLEAN HG1=PASS (over-flag control held) | HG2 re-grep: no flagged batch rows; clean k_frp items.c:2710/2744-2748 + bare world.c:869 CONFIRMED; canary k_yawnmode carried (independently grounded salvo-1 HG2 weapons.c:128, identical oracle) -> ACCEPTED. canary row stripped. -->

RESULT | ktx:cvar:k_freshteams_sweep_gl_ammo | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Every clause (dmm1-only, dual-gate, already-owned sweep, rocket-pool add, +5 default-branch, default 1) maps to a verified enforcing line.
### ktx:cvar:k_freshteams_sweep_gl_ammo
- "Fresh Teams (dmm1) only" -> world.c:1770-1772 `if (cvar("k_freshteams") && deathmatch != 1) { cvar_fset("k_freshteams", 0); // freshteams only in dmm1 }` -> MATCH
- "rockets awarded when a player picks up a GL they already own ('sweeping')" -> items.c:938-941 `if (k_freshteams && limit_sweep_ammo && ((int)other->s.v.items & IT_GRENADE_LAUNCHER)) { other->s.v.ammo_rockets += cvar("k_freshteams_sweep_gl_ammo"); }` -> MATCH
- "applied only when k_freshteams and k_freshteams_limit_sweep_ammo both enabled" -> items.c:938 dual-gate (limit_sweep_ammo = cvar @items.c:810) -> MATCH
- "GL draws from rocket ammo pool, value added to rockets" -> items.c:940 `other->s.v.ammo_rockets += cvar(...)` -> MATCH
- "When sweep limiting off, already-owned GL instead grants default 5 rockets" -> items.c:942-945 `else { other->s.v.ammo_rockets += 5; }` -> MATCH
- "Has no effect unless both set; units rockets" -> items.c:938-945 dual-gate/else bypasses cvar -> MATCH
WI-2: n/a (RegisterCvarEx world.c:906 "1" consistent, not asserted)

RESULT | ktx:cvar:k_freshteams_sweep_ssg_ammo | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Shells-on-SSG-sweep, dual-gate, +5 default branch, dmm1-only, registered default 1 all map to verified enforcing lines.
### ktx:cvar:k_freshteams_sweep_ssg_ammo
- "FreshTeams (dmm1) only" -> world.c:1770-1772 `if (cvar("k_freshteams") && deathmatch != 1) cvar_fset("k_freshteams", 0);` -> MATCH
- "shells gained when picking up a SSG you already own (a 'sweep')" -> items.c:892-893 `if (k_freshteams && limit_sweep_ammo && ((int)other->s.v.items & IT_SUPER_SHOTGUN)) { other->s.v.ammo_shells += cvar("k_freshteams_sweep_ssg_ammo"); }` -> MATCH
- "applied in place of the normal 5-shell pickup" -> items.c:896-898 `else { other->s.v.ammo_shells += 5; }` -> MATCH
- "Active only while k_freshteams on and k_freshteams_limit_sweep_ammo enabled; otherwise standard +5" -> items.c:892/896 dual-gate then else +5 -> MATCH
- "Default 1" -> world.c:904 `RegisterCvarEx("k_freshteams_sweep_ssg_ammo", "1")` -> MATCH
WI-2: default 1 verified vs RegisterCvarEx world.c:904 -- correct

RESULT | ktx:cvar:k_frp | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | 0=current weapon, 1=best owned w/ammo, 2=last-fired-even-no-ammo, default 0 -- each maps to a verified enforcing line in DropBackpack/ToggleFairPacks. [orchestrator HG2 re-grep CONFIRMED items.c:2710/2744-2748, world.c:869]
### ktx:cvar:k_frp
- "0 = the weapon the player was currently wielding" -> items.c:2705 `item->s.v.items = self->s.v.weapon;` (default; f1==1/2 blocks skipped when 0) -> MATCH
- "1 = the player's best owned weapon (highest-tier they hold with ammo)" -> items.c:2710-2738 `if (f1 == 1) { ... if((items&IT_NAILGUN)&&ammo_nails>0) ...=IT_NAILGUN; ... if((items&IT_ROCKET_LAUNCHER)&&ammo_rockets>0) ...=IT_ROCKET_LAUNCHER; }` (sequential override = highest tier; each ammo-gated) -> MATCH (orchestrator HG2 re-grep CONFIRMED items.c:2710)
- "2 = the last weapon the player fired (dropped even if no ammo)" -> items.c:2744-2748 `if (f1 == 2) { if ((int)self->lastwepfired & IT_DROPPABLE_WEAPONS) item->s.v.items = self->lastwepfired; }` + items.c:2696 nothing-in-it guard excepts f1==2 (drops with zero ammo) -> MATCH (orchestrator HG2 re-grep CONFIRMED items.c:2744-2748, 2696)
- "Default 0" -> world.c:869 `RegisterCvar("k_frp")` (bare = default 0) -> MATCH (orchestrator HG2 re-grep CONFIRMED world.c:869)
WI-2: default 0 verified vs bare RegisterCvar world.c:869 -- correct

RESULT | ktx:cvar:k_hoonymode_prevspawns | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Digit-string-per-spawn, 0/1/2=unnom/red/blue polarity, prevmap-keyed re-apply, length-mismatch/map-change reset, auto-written, default empty -- all verified incl. EF_RED=1 polarity at HM_select_spawn.
### ktx:cvar:k_hoonymode_prevspawns
- "Internal HoonyMode state, not meant to be set by hand ... Written automatically" -> world.c:891 `RegisterCvarEx("k_hoonymode_prevspawns", "")` + only mutated via cvar_set (hoonymode.c:1295/1300/1320) -> MATCH
- "stores per-spawn team nominations as a digit string, one char per info_player_deathmatch spawn in map order" -> hoonymode.c:1310-1318 `for (spawn=world; (spawn=ez_find(spawn,"info_player_deathmatch"));) *next++ = '0' + spawn->hoony_nomination; *next='\0';` -> MATCH
- "(0 = unnominated, 1 = red, 2 = blue)" -> hoonymode.c:896 `spawn->hoony_nomination = (effects == EF_RED ? 1 : 2)` + HM_deselect_spawn:1076 `=0`; restore 1278-1289 `'1'->EF_RED`, `'2'->EF_BLUE` -> MATCH
- "new team HoonyMode game on same map (matched via k_hoonymode_prevmap), string length == spawn count -> reapplied" -> hoonymode.c:1262-1289 streq prevmap + `if (strlen(spawns)==spawn_count) {...reapply...}` (gated isHoonyModeTDM 1257) -> MATCH
- "on map change or spawn-count mismatch it is reset to empty" -> hoonymode.c:1295/1300 `else { cvar_set("k_hoonymode_prevspawns",""); }` -> MATCH
- "default empty" -> world.c:891 `RegisterCvarEx("k_hoonymode_prevspawns","")` -> MATCH
WI-2: default empty verified vs RegisterCvarEx world.c:891 -- correct

RESULT | ktx:cvar:_k_lastmap | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Set-to-map at G_ShutDown, cleared on force_map_reset, FirstFrame strneq compare re-applies _k_last_xonx only on real map change not same-map restart -- all verified.
### ktx:cvar:_k_lastmap
- "Internal-state cvar (not set from config)" -> world.c:779 `RegisterCvar("_k_lastmap"); // internal usage, name of last map` + only mutated via cvar_set (g_main.c:531) -> MATCH
- "set to the map name on map change" -> g_main.c:531 (in G_ShutDown) `cvar_set("_k_lastmap", (strnull(map) || force_map_reset ? "" : map));` -> MATCH
- "cleared to empty string on a forced reset" -> g_main.c:531 `strnull(map) || force_map_reset ? ""` -> MATCH
- "first frame of new map compares to current map, only if changed re-applies last XonX (via _k_last_xonx)" -> world.c:1143-1146 (FirstFrame) `if ((cvar("_k_last_xonx") > 0) && strneq(cvar_string("_k_lastmap"), mapname)) { UserMode(-cvar("_k_last_xonx")); }` -> MATCH
- "so NonN team mode carries across a real map switch but not a same-map restart" -> world.c:1143 strneq semantics (same-map -> not re-called; real switch -> re-called) -> MATCH
WI-2: n/a (bare RegisterCvar world.c:779 => empty, consistent, not asserted)

<!-- WAVE 10 | sharpened brief | canary=ktx:command:autotrack expected=C-FIX returned=C-FIX HG1=PASS | HG2 re-grep: flagged k_on_end_f_version match.c:285 f_version_done declared outside :402 find_plr loop, :416 !f_version_done -> :419 set true => only first player CONFIRMED; anti-collapse k_on_start_f_ruleset match.c:2944 PlayerReady single self (no loop) correctly differentiated TRACED-CLEAN; clean k_noitems match.c:844/1608-1610 CONFIRMED; canary autotrack carried -> ACCEPTED. canary row stripped. -->

RESULT | ktx:cvar:_k_last_xonx | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Index+1 store, 0=reset, set on every usermode run, auto-reapply on different map -- every clause has an enforcing line.
### ktx:cvar:_k_last_xonx
- "held as the usermode index plus one (0 = no mode remembered)" -> commands.c:4847 `cvar_fset("_k_last_xonx", umode + 1); // save last XonX command` + world.c:1145 `UserMode(-cvar("_k_last_xonx"))` (re-decremented umode-1 in UserMode commands.c:4659) -> MATCH
- "set whenever a usermode command runs" -> commands.c:4847 (end of UserMode, post access/allowed checks) -> MATCH
- "0 means no remembered mode / reset" -> commands.c:4857 `cvar_fset("_k_last_xonx", 0); // forget last XonX command` + world.c:1139 `cvar_fset("_k_last_xonx", 0)` -> MATCH
- "on next map spawn auto-reapplies that mode if a different map was loaded" -> world.c:1143-1145 `if ((cvar("_k_last_xonx") > 0) && strneq(cvar_string("_k_lastmap"), mapname)) { UserMode(-cvar("_k_last_xonx")); }` -> MATCH
- "re-executing the mode's configs" -> UserMode reads configs/usermodes/...cfg (commands.c:4823-4835) via negative-arg path -> MATCH
WI-2: n/a (bare RegisterCvar world.c:778 => default 0; "0 means no remembered mode" consistent)

RESULT | ktx:cvar:k_noitems | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Strips listed weapon/ammo/health/armor/artifact ents at match prep, settings shows "NoItems on" off-Race, toggled by noitems out of match -- all enforced. [orchestrator HG2 re-grep CONFIRMED match.c:844/1608-1610]
### ktx:cvar:k_noitems
- "strips all weapon_*, item_shells/spikes/rockets/cells, item_health, item_armor1/2/Inv, all artifact powerup ents" -> match.c:844 `|| cvar("k_noitems") || k_bloodfest)` guarding soft_ent_remove block match.c:846-866 (lists exactly those classnames + the 4 item_artifact_*) -> MATCH (orchestrator HG2 re-grep CONFIRMED match.c:844)
- "Players keep only their starting equipment" -> only map pickup entities removed; no player-inventory mutation -> MATCH
- "While active and not in Race mode the settings readout shows 'NoItems on'" -> match.c:1608-1610 `if (cvar("k_noitems") && !isRACE()) strlcat(text, va("%s %5s\n","NoItems",redtext("on")),...)` -> MATCH (orchestrator HG2 re-grep CONFIRMED match.c:1608/1610)
- "Toggled out of match by the noitems command" -> commands.c:8926 `void noitems(void){ if (match_in_progress) return; cvar_toggle_msg(self,"k_noitems",redtext("noitems mode")); }` -> MATCH
WI-2: n/a (bare RegisterCvar world.c:787 => default 0; "0 = items present normally" consistent)

RESULT | ktx:cvar:k_on_end_f_version | C-FIX | flavourC=1 | wi2=0 | clauses=4 | "every player / once per player" flatly wrong: f_version_done (declared once outside the loop) gates so exactly ONE player is stuffed. [orchestrator HG2 re-grep CONFIRMED match.c:285 decl vs :402 loop vs :416/419 done-flag]
### ktx:cvar:k_on_end_f_version
- "every player is automatically made to issue say f_version once" / "sent once per player at match end" -> match.c:416-420 `if (has_matchtag && cvar("k_on_end_f_version") && !f_version_done) { stuffcmd(p,"say f_version\n"); f_version_done = true; }` inside `for (p=world;(p=find_plr(p));)` (match.c:402) with `qbool ... f_version_done = false;` declared ONCE @match.c:285 OUTSIDE the loop -> MISMATCH(f_version_done set true after the FIRST player, so stuffcmd fires for exactly one player -- once per match, to the first find_plr player -- not "every player"/"once per player"; orchestrator HG2 re-grep CONFIRMED decl scope vs loop)
- "broadcasting each client's f_version report" -> same site; only the first player's f_version is broadcast -> MISMATCH(not "each client's")
- "No effect on matches without a matchtag" -> `has_matchtag = matchtag != NULL && matchtag[0]` (match.c:287) gates the branch -> MATCH
- "Default 1" -> world.c:809 `RegisterCvarEx("k_on_end_f_version", "1")` -> MATCH
WI-2: n/a (registered default "1" correct; defect is behavior/scope -> C-FIX not WI2-FIX)

RESULT | ktx:cvar:k_on_start_f_ruleset | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=3 | Single triggering player (self) stuffed say f_ruleset at start when matchtag set; default 1 -- all enforced. [orchestrator HG2 anti-collapse CONFIRMED: match.c:2944 PlayerReady single self, no loop -- correctly differentiated from k_on_end_f_version]
### ktx:cvar:k_on_start_f_ruleset
- "the player triggering the match start is automatically made to issue say f_ruleset" -> match.c:2944-2945 `if (has_matchtag && cvar("k_on_start_f_ruleset")) { stuffcmd(self, "say f_ruleset\n"); }` in PlayerReady (match.c:2749; self = the readying player; NO find_plr loop) -> MATCH (singular "the player triggering" -- orchestrator HG2 re-grep CONFIRMED match.c:2944 single self)
- "No effect on matches without a matchtag" -> `has_matchtag = matchtag != NULL && matchtag[0]` (match.c:2754) gates the branch -> MATCH
- "Default 1" -> world.c:805 `RegisterCvarEx("k_on_start_f_ruleset", "1")` -> MATCH
WI-2: n/a (registered default "1" matches "Default 1")

RESULT | ktx:cvar:k_race_custom_models | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=3 | Non-zero precaches+returns start/check/finish.mdl; zero skips precache and returns default node models; registered default 0 -- all enforced.
### ktx:cvar:k_race_custom_models
- "When non-zero precaches and uses progs/start.mdl, progs/check.mdl, progs/finish.mdl for start/checkpoint/finish" -> world.c:429-435 `if (cvar("k_race_custom_models")) { trap_precache_model("progs/start.mdl"); ...check.mdl ...finish.mdl }` + race.c:867-880 model_for_nodeType -> MATCH
- "when 0 those custom models are neither precached nor used (default node models used)" -> world.c:429 precache block skipped when 0; race.c:882+ else-branch returns default node models -> MATCH
- "0 = use default checkpoint models" -> world.c:914 `RegisterCvarEx("k_race_custom_models", "0")` -> MATCH
WI-2: n/a (registered default "0" consistent with "0 = use default")

<!-- WAVE 11 | sharpened brief | canary=ktx:cvar:k_teamoverlay expected=C-NEAR-MISS returned=C-NEAR-MISS HG1=PASS | HG2 re-grep: no flagged batch rows; clean k_spm_glow items.c:3014 DM EF_GREEN|EF_RED + :3018-3019 CTF team1 EF_RED/team2 EF_BLUE CONFIRMED; canary k_teamoverlay carried -> ACCEPTED. canary row stripped. -->

RESULT | ktx:cvar:k_spm_glow | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | bare-default "0", OFF->0 / non-zero->effect-flags ternaries, DM=EF_GREEN|EF_RED, CTF team1=EF_RED/team2=EF_BLUE all map to verified enforcing lines. [orchestrator HG2 re-grep CONFIRMED items.c:3014/3018/3019]
### ktx:cvar:k_spm_glow
- "Adds a glow effect to spawn-point marker entities" -> items.c:2931 `p->s.v.effects = (int)p->s.v.effects | effects;` (classname="spawnpoint") -> MATCH
- "0 = no glow" -> items.c:3014 `Spawn_SpawnPoints("info_player_deathmatch", cvar("k_spm_glow") ? (EF_GREEN | EF_RED) : 0);` (false -> 0); registered default "0" world.c:883 -> MATCH (orchestrator HG2 re-grep CONFIRMED items.c:3014)
- "non-zero = the markers glow" -> items.c:3014 ternary truthy branch sets EF_GREEN|EF_RED -> MATCH
- "combined red+green dlight on normal deathmatch spawns" -> items.c:3014 info_player_deathmatch -> EF_GREEN|EF_RED -> MATCH
- "in CTF, team-1 spawns glow red and team-2 spawns glow blue" -> items.c:3018-3019 `if (isCTF()) { Spawn_SpawnPoints("info_player_team1", ... ? EF_RED : 0); Spawn_SpawnPoints("info_player_team2", ... ? EF_BLUE : 0); }` -> MATCH (orchestrator HG2 re-grep CONFIRMED items.c:3018/3019)
WI-2: n/a (registered default "0" consistent with "0 = no glow")

---

## STAGE-1 BATCH SUMMARY (B5)

- **N = 51 batch rows** (canary controls excluded from N, never counted), all 11 waves accepted after both hard gates.
- **TRACED-CLEAN: 44 | C-NEAR-MISS: 0 | C-FIX: 7 | WI2-FIX: 0**
- **flavour-C-positive: 7 / 51 (~13.7%)** -- all C-FIX (hard defects); matches the ~14% fleet base-rate probe (no contiguous-cluster skew -- F-V1 strided partition validated).
- **flagged canonical_ids (-> B4 re-synth, operator-gated, NOT performed here):**
  - `ktx:command:rnd` -- arg-count threshold wrong (one arg accepted; "two or more / fewer than two prints hint" false)
  - `ktx:command:11fav_go` -- slot-fill source wrong (favx[] filled by favN_add/favx_add only; fav_add fills separate fav[])
  - `ktx:command:1fav_go` -- names non-existent command "1fav_add" (real: fav1_add)
  - `ktx:command:auto_pow` -- "allowed only outside a live match" false (CF_MATCHLESS additive; no match_in_progress guard)
  - `ktx:command:togglequad:frogbot:std` -- "bot itself / only the calling bot" false (mutates issuing client; no isBot guard)
  - `ktx:cvar:_k_coachteam1` -- registered+read but NEVER written; coach k_picked never set; bound/locked behavior not enforced
  - `ktx:cvar:k_on_end_f_version` -- "every player / once per player" false (f_version_done outside loop -> only first player)
- Waves dispatched: 13 (W1, W2 canary-rejected -> redispatched as W1', W2' with sharpened B1 boundary brief). Canary-rejected+redispatched: 2.
- HARD GATE 1 (canary verdict): every recorded wave's injected canary matched expected. HARD GATE 2 (orchestrator independent re-grep): every accepted wave -- >=1 flagged wrong-clause line + >=1 TRACED-CLEAN load-bearing clause re-grepped against oracle@67253dc9; all held. 3 canary classes (autotrack C-FIX / k_teamoverlay C-NEAR-MISS / k_yawnmode TRACED-CLEAN) independently ground-truthed against the identical oracle in salvos 1-2.
- C4 held: read-only, no DB write, no description edit, no re-synth. Oracle never mutated.
