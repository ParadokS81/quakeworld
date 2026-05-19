# KTX D7 V-pass -- Stage-1 ledger -- BATCH 05 (bucket 4)

B3 read-only per-clause enforcement re-trace. Authority: `decisions.md` D7
Amendment 2026-05-19 (B1-B5). Method:
`~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`.
NOT a re-synth; NO description / DB / source mutated (C4).

- Batch: 5 of 9 (F-V1 strided partition; bucket = `(md5(canonical_id) bit32 signed) %% 9` normalized == 4)
- Population: 571 V-pass rows (574 - 10 FIX-queue - 3 canary controls); this batch = 55 rows
- Oracle: `/tmp/ktx-src-67253dc9` @ `67253dc9ab4f643f1e6523a923a41caab9ea587f` (`git describe`: `1.47-2-g67253dc`) -- Step-1 HARD GATE verified
- Waves: 11 (5 batch rows + 1 blind rotated canary each); canary controls excluded from N and the flavour-C tally
- Canary pool (F-V2 ground truth): `autotrack`=C-FIX / `k_teamoverlay`=C-NEAR-MISS / `k_yawnmode`=TRACED-CLEAN

The `RESULT |` lines are the machine spine (grep `^RESULT |` for the Stage-1
index / flagged set / rate). The `###` blocks are the durable per-clause
detail. Canary rows are NOT recorded here (controls only). HARD GATE 1
(canary verdict match) + HARD GATE 2 (orchestrator independent re-grep of
>=1 flagged + >=1 TRACED-CLEAN load-bearing clause) gate every wave; a
failed gate rejects + re-dispatches the whole wave before any row is recorded.

---

## Wave 1 -- canary=autotrack (expect C-FIX) -- HG1 PASS (returned C-FIX), HG2 PASS -- 5 batch rows recorded

RESULT | ktx:command:12fav_go | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | All clauses (slot set by fav12_add, empty/disconnected -> notice+no-op, already-observing -> report+no-op, per-spectator, CF_SPECTATOR spectator-only) trace to enforcing lines incl. the authoritative include/progs.h favx[] comment.
### ktx:command:12fav_go
- "switches camera to player saved in favourite slot 12" -> src/commands.c:5821-5856 `void xfav_go(float fav_num){ ... pl_num = self->favx[(int)fav_num - 1]; ... }` (entry src/commands.c:877 `{ "12fav_go", DEF(xfav_go), 12, CF_SPECTATOR, CD_12FAV_GO }`) -> MATCH
- "the slot set by fav12_add" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (favx_add; entry src/commands.c:857) + include/progs.h:1009 `int favx[MAX_CLIENTS]; // here stored players number for appropriate favX_add/Xfav_go commands` -> MATCH
- "If slot 12 empty -> notice + no-op" -> src/commands.c:5833-5838 `if ((pl_num < 1) || (pl_num > MAX_CLIENTS)){ G_sprint(...,"slot %d is not defined"); return; }` -> MATCH
- "player no longer connected -> notice; already observing -> report + no-op" -> src/commands.c:5842-5854 `if (p->ct != ctPlayer){ ...can't find player...; return; } if (PROG_TO_EDICT(self->s.v.goalentity) == p){ ...already observing...; return; }` -> MATCH
- "Slots per-spectator; Spectator-only (CF_SPECTATOR)" -> src/commands.c:5831 (per-self array) + src/commands.c:877 flags CF_SPECTATOR only + dispatcher src/commands.c:1106-1109 `if (!(cmds[icmd].cf_flags & CF_PLAYER)){ return DO_WRONG_CLASS; }` + include/g_local.h:648 `#define CF_SPECTATOR ( 1<<1 )` -> MATCH
WI-2: n/a -- access class CF_SPECTATOR-only correctly stated + dispatcher-traced; no default-value claim.

RESULT | ktx:command:2fav_go | C-FIX | flavourC=1 | wi2=0 | clauses=6 | Slot-population clause names "fav_add" as a populator; fav_add writes self->fav[] (commands.c:5614), but 2fav_go reads self->favx[] (commands.c:5831) -- include/progs.h:1009-1010 confirms these are distinct arrays for distinct command families. fav_add cannot populate a slot 2fav_go reads. Flatly wrong clause. [orchestrator HG2 re-grep independently confirmed 5614/5732/5831 + table 847/867/886 + include/progs.h:1009-1010]
### ktx:command:2fav_go
- "switches view to player in favorite slot 2" -> src/commands.c:5821-5856 `xfav_go(){ pl_num = self->favx[(int)fav_num - 1]; }` (entry src/commands.c:867 `{ "2fav_go", DEF(xfav_go), 2, CF_SPECTATOR, CD_2FAV_GO }`) -> MATCH
- "per-client slots populated by fav2_add / fav_add" -> fav2_add: src/commands.c:847 `{ "fav2_add", DEF(favx_add), 2, ... }` -> src/commands.c:5732 `self->favx[...] = diff;` (MATCH for fav2_add half); fav_add: src/commands.c:886 `{ "fav_add", fav_add, 0, ... }` -> src/commands.c:5614 `self->fav[...] = diff;` writes self->fav[] NOT self->favx[]; include/progs.h:1009-1010 `int favx[]; //...favX_add/Xfav_go` / `int fav[]; //...fav_add/next_fav` -> MISMATCH(fav_add populates the SEPARATE fav[] array read only by fav_next; 2fav_go reads favx[], so fav_add does NOT populate slot 2 for 2fav_go)
- "Usable only while spectating" -> src/commands.c:867 flags CF_SPECTATOR only + dispatcher src/commands.c:1106-1109 player rejected -> MATCH
- "slot 2 empty -> 'slot 2 is not defined' + no-op" -> src/commands.c:5833-5838 -> MATCH
- "player gone -> 'can't find player' + no-op" -> src/commands.c:5842-5847 -> MATCH
- "already tracking -> 'already observing' + no-op; leading number = slot index; siblings 1fav_go..20fav_go = slots 1-20" -> src/commands.c:5849-5854 + table src/commands.c:866-885 -> MATCH
WI-2: n/a -- no default-value claim; access-class (spectator-only) correct.

RESULT | ktx:command:5fav_go | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Verbatim message strings match xfav_go exactly; "populated by the corresponding fav add commands" correctly scopes to the favN_add family (favx[] <-> favX_add per include/progs.h:1009), NOT the mis-scoped fav_add of 2fav_go -- sibling-handler verdict split is the intended invisible-class catch.
### ktx:command:5fav_go
- "switch to tracking player in favourite slot 5" -> src/commands.c:5821-5856 `xfav_go(){ pl_num = self->favx[(int)fav_num-1]; }` (entry src/commands.c:871 `{ "5fav_go", DEF(xfav_go), 5, CF_SPECTATOR, CD_5FAV_GO }`) -> MATCH
- "slot 5 empty -> 'fav go: slot 5 is not defined'" -> src/commands.c:5835 `G_sprint(self,2,"fav go: \220slot %d\221 is not defined\n",(int)fav_num);` -> MATCH
- "player gone -> 'fav go: slot 5 can't find player'" -> src/commands.c:5844 `G_sprint(self,2,"fav go: \220slot %d\221 can't find player\n",(int)fav_num);` -> MATCH
- "already tracking -> 'fav go: already observing...'" -> src/commands.c:5851 `G_sprint(self,2,"fav go: already observing...\n");` -> MATCH
- "Favourite slots populated by the corresponding fav add commands" -> src/commands.c:5732 `self->favx[...] = diff;` (favx_add; slot-5 entry src/commands.c:850 `{ "fav5_add", DEF(favx_add), 5, ... }`) + include/progs.h:1009 -> MATCH (correctly scoped to favN_add, no mis-attribution)
WI-2: n/a.

RESULT | ktx:command:admin | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=9 | 8/9 clauses trace exactly; "or while an admin election is pending" is narrower in code -- guard is is_elected(self, etAdmin) (self->v.elect_type == etAdmin), i.e. only when the ISSUING client is themself the admin-election candidate, not any pending admin election. Correct-direction, real code more conditional than implied. [orchestrator HG2 re-grep independently confirmed vote.c:460-462 + admin.c:316]
### ktx:command:admin
- "Manages issuing client's admin status" -> src/admin.c:313-394 `void ReqAdmin(void)` on self (entry src/commands.c:750 `{ "admin", ReqAdmin, 0, CF_BOTH | CF_MATCHLESS | CF_PARAMS, CD_ADMIN }`) -> MATCH
- "no arg: already admin -> relinquish" -> src/admin.c:323-336 `if (is_adm(self)){ ... self->k_admin = 0; on_unadmin(self); return; }` -> MATCH
- "code entry in progress -> cancel" -> src/admin.c:339-345 `if (self->k_adminc){ ...code canceled...; self->k_adminc = 0; return; }` -> MATCH
- "otherwise begin admin-code entry (numbers/impulses)" -> src/admin.c:389-393 `self->k_adminc = 6; self->k_added = 0; G_sprint(...,"Use %s or %s to enter code","numbers","impulses");` -> MATCH
- "or grant immediately for a VIP flagged admin" -> src/admin.c:354-359 `if (VIP_IsFlags(self, VIP_ADMIN)){ BecomeAdmin(self, AF_REAL_ADMIN); return; }` -> MATCH
- "one arg: treat as k_admincode, grant if match" -> src/admin.c:362-379 `if (trap_CmdArgc()==2){ char *pass = cvar_string("k_admincode"); ... if (... streq(arg_2,pass)){ BecomeAdmin(...); } else { ...Access denied... } }` -> MATCH
- "brief anti-brute-force delay between attempts" -> src/admin.c:366-372 `int till = Q_rint(self->k_adm_lasttime + 5 - time); if (self->k_adm_lasttime && (till>0)){ ...Wait %d second...; return; }` + src/admin.c:383 `self->k_adm_lasttime = time;` + comment src/admin.c:369 `// probably must help against brute force` -> MATCH
- "refuses if no admins configured (k_admins)" -> src/admin.c:347-352 `if (!cvar("k_admins")){ ...NO admins...; return; }` -> MATCH
- "or while an admin election is pending" -> src/admin.c:316-321 `if (is_elected(self, etAdmin)){ ...Abort election first...; return; }` + src/vote.c:460-462 `qbool is_elected(gedict_t *p, electType_t et){ return (p->v.elect_type == et); }` -> MISMATCH(guard fires only when the ISSUING client is themself the admin-election subject; a third party's pending admin election does not block self's /admin -- real code narrower / more conditional than "while an admin election is pending")
WI-2: n/a -- CF_BOTH matches the generic "issuing client" framing; no registered-default claim.

RESULT | ktx:command:blitz4v4 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=15 | Every preset value (8 players, hoonymode 1, hoonyrounds 4, timelimit 5, fraglimit 0, teamplay 2, deathmatch 1, k_pow 1, k_membercount 3, k_lockmin/max 1/2, k_overtime 1, k_exttime 5, k_mode 2) maps verbatim to _4on4hm_um_init[]; "shared common reset runs first" -> common_um_init applied before the mode initstring. [orchestrator HG2 re-grep independently confirmed 4161/4796/4799]
### ktx:command:blitz4v4
- "Blitz 4v4 preset; 4v4 team match as short hoonymode rounds" -> src/commands.c:4546 `{ "blitz4v4", "Blitz (4v4)", _4on4hm_um_init, UM_1ON1HM, 0 }` + src/commands.c:4335 `// 'blitz' now` (entry src/commands.c:818) -> MATCH
- "8 players (maxclients/k_maxclients 8)" -> src/commands.c:4338-4339 `"maxclients 8\n" // 4on4 = 8 players` + `"k_maxclients 8\n"` -> MATCH
- "hoonymode (k_hoonymode 1)" -> src/commands.c:4345 `"k_hoonymode 1\n"` -> MATCH
- "4 rounds (k_hoonyrounds 4, two sets of spawns)" -> src/commands.c:4341 `"k_hoonyrounds 4\n" // 4 rounds (2 sets of spawns)` -> MATCH
- "5-min round timelimit, fraglimit 0 (time-based)" -> src/commands.c:4340 `"timelimit 5\n" // 5 minute rounds` + src/commands.c:4342 `"fraglimit 0\n" // no fraglimit, time-based` -> MATCH
- "teamplay 2 (hurt teammates + self)" -> src/commands.c:4343 `"teamplay 2\n" // hurt teammates and yourself` -> MATCH
- "deathmatch 1 (weapons don't stay)" -> src/commands.c:4344 `"deathmatch 1\n" // weapons wont stay on pickup` -> MATCH
- "enables powerups" -> src/commands.c:4346 `"k_pow 1\n" // use powerups` -> MATCH
- "3 players min per team" -> src/commands.c:4347 `"k_membercount 3\n"` -> MATCH
- "1-2 teams" -> src/commands.c:4348-4349 `"k_lockmin 1\n"` + `"k_lockmax 2\n"` -> MATCH
- "time-based overtime (5 min)" -> src/commands.c:4350-4351 `"k_overtime 1\n" // time based` + `"k_exttime 5\n" // overtime 5mins` -> MATCH
- "internal game mode k_mode 2" -> src/commands.c:4352 `"k_mode 2\n"` -> MATCH
- "shared common reset runs first" -> src/commands.c:4796 `trap_readcmd(common_um_init, buf, sizeof(buf));` BEFORE src/commands.c:4799 `trap_readcmd(um_list[(int)umode].initstring, buf, sizeof(buf));` + src/commands.c:4161 `const char common_um_init[] = ...` -> MATCH
WI-2: n/a -- preset values are runtime cvar_set effects (not registered defaults); access-class not asserted.

## Wave 2 -- canary=k_teamoverlay (expect C-NEAR-MISS) -- HG1 PASS (returned C-NEAR-MISS), HG2 PASS -- 5 batch rows recorded

RESULT | ktx:command:break | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | Every behavior (countdown stop, vote, withdraw, matchless next-map polarity, spec auto-xonx un-ready, race status, intermission/over no-op) maps to an enforcing PlayerBreak line; "Player command" lead-in loose (CF_BOTH) but spec path described -- still-true vagueness, not a wrong scope clause. [HG2 re-grep confirmed match.c:3079 matchless polarity ternary]
### ktx:command:break
- "vote for stopping play / player command" -> src/commands.c:709 `{ "break", PlayerBreak, 0, CF_BOTH | CF_MATCHLESS, CD_BREAK }` -> MATCH (CF_BOTH players+specs; lead-in loose but spec path described)
- "pre-match countdown -> stops the countdown" -> src/match.c:3043-3055 `if (match_in_progress == 1 && can_stop_hoonymode) { ... StopTimer(1); ... "stops the countdown" }` -> MATCH
- "running match -> casts vote to stop the match" -> src/match.c:3076-3080 `self->v.brk = 1; G_bprint(... "votes for stopping the match" ...)` -> MATCH
- "in matchless mode it instead votes for the next map" -> src/match.c:3079 `redtext(k_matchLess ? "votes for next map" : "votes for stopping the match")` -> MATCH
- "issuing it again withdraws that vote" -> src/match.c:3066-3074 `if (self->v.brk) { self->v.brk = 0; ... "withdraws" ... }` -> MATCH
- "broadcast announces vote + how many still required" -> src/match.c:3070-3071,3078-3080 `((votes = get_votes_req(OV_BREAK, true)) ? va(" (%d)", votes) : "")` -> MATCH
- "not-yet-ready spectator in auto-xonx mode retracts ready state" -> src/match.c:2982-3003 `if ((self->ct == ctSpec) && !isRACE()) { if (!cvar("k_auto_xonx") || k_matchLess) {...return;} if (!self->ready) return; self->ready = 0; ... "lost desire" }` -> MATCH (operative effect correct & traced; "not-yet-ready" wording awkward but accurate)
- "in race (non-match) mode it instead signals a race status change" -> src/match.c:2975-2979 `if (isRACE() && !race_match_mode()) { r_changestatus(2); return; }` -> MATCH
- "no effect during intermission or after match over" -> src/match.c:3006 `if (!self->ready || intermission_running || match_over) { return; }` -> MATCH
WI-2: n/a (CF_BOTH, no CF_*_ADMIN; no registered-default claim)

RESULT | ktx:command:callalias | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Every threshold (15s connect window, 0<t<=30s delay), single-pending-alias rule, usage form, deferred stuffcmd-back-to-issuer map exactly to callalias() enforcing lines. [HG2 re-grep confirmed commands.c:8353 ca_limit=15/ca_limit2=30 + 8374 (tm<=0)||(tm>ca_limit2)]
### ktx:command:callalias
- "schedules issuer's own client alias to run after a delay" -> src/commands.c:8398-8399 `strlcpy(self->callalias, arg_x, CALLALIAS_SIZE); self->callalias_time = g_globalvars.time + tm;` -> MATCH
- "usage: cmd callalias <aliasname> <time>" -> src/commands.c:8359 `G_sprint(self, 2, "usage: cmd callalias <aliasname time>\n")` -> MATCH
- "only usable within first 15 seconds after connecting" -> src/commands.c:8353,8364-8366 `const int ca_limit = 15 ... if (self->connect_time + ca_limit < g_globalvars.time) {...return;}` -> MATCH (exact 15)
- "delay must be > 0 and at most 30 seconds" -> src/commands.c:8353,8374 `... ca_limit2 = 30 ... if ((tm <= 0) || (tm > ca_limit2)) {...return;}` -> MATCH (exact >0 and <=30)
- "only one pending alias at a time (second call rejected)" -> src/commands.c:8381-8385 `if (self->callalias_time) { ... "you can't install more than 1 alias before previous will execute" ... return; }` -> MATCH
- "when timer elapses alias is sent back to & executed on issuer's client" -> src/commands.c:8404-8410 `if (!self->callalias_time || (self->callalias_time > g_globalvars.time)) return; stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "%s\n", self->callalias); self->callalias_time = 0;` -> MATCH
WI-2: n/a (CF_BOTH|CF_MATCHLESS|CF_PARAMS, no CF_*_ADMIN; no registered-default claim)

RESULT | ktx:command:captain | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=13 | Toggle structure + all 8 stated refusal conditions map to enforcing VoteCaptain lines; is_elected(self,etCaptain) confirms "caller's own election"; unmentioned guards are omissions, not wrong/over-broad clauses. [HG2 re-grep confirmed captain.c:357 +60 timeout]
### ktx:command:captain
- "toggles caller's captain status" -> src/captain.c:224-240 (is_elected->abort / capt_num->exit / else->request) -> MATCH
- "no election active & not yet captain -> requests + starts election" -> src/captain.c:335-358 `self->v.elect = 1; self->v.elect_type = etCaptain; ... electguard ...` -> MATCH
- "other players approve by typing 'yes'" -> src/captain.c:342-348 `for(...) if ((p != self) && (p->ct == ctPlayer)) G_sprint(p,2,"Type %s in console to approve\n",redtext("yes"))` -> MATCH
- "60-second timeout" -> src/captain.c:357 `electguard->s.v.nextthink = g_globalvars.time + 60;` -> MATCH (exact 60)
- "invoking again while caller's own election pending aborts it" -> src/captain.c:224-230 `if (is_elected(self, etCaptain)) { ... "aborts election" ... AbortElect(); }` (is_elected = self->v.elect_type==etCaptain, src/vote.c:462) -> MATCH
- "invoking while already a captain steps down" -> src/captain.c:233-239 `if (capt_num(self)) { ... "is no longer a captain" ... ExitCaptain(); }` -> MATCH
- "refused during a match or intermission" -> src/captain.c:242 `if (match_in_progress || intermission_running) { return; }` -> MATCH
- "non-team / non-CTF modes" -> src/captain.c:247 `if (!isTeam() && !isCTF())` -> MATCH
- "fewer than 3 players present" -> src/captain.c:254 `if (CountPlayers() < 3)` -> MATCH (exact <3)
- "when 2 captains already exist" -> src/captain.c:261 `if (k_captains == 2)` -> MATCH
- "while any other election is in progress" -> src/captain.c:269 `if (get_votes( OV_ELECT))` (reached after self-elected check returned) -> MATCH
- "before caller has set a team name" -> src/captain.c:284 `if (strnull(getteam(self)))` -> MATCH
- "(in CTF) unless caller is on team red or blue" -> src/captain.c:292-298 `if (isCTF()) { if (!streq(getteam(self),"blue") && !streq(getteam(self),"red")) {...} }` -> MATCH
WI-2: n/a (CF_PLAYER, no CF_*_ADMIN; no registered-default claim)

RESULT | ktx:command:clearmarkerflag:frogbot:editor | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Editor-mode-only scope structurally enforced (editor_commands[] only, selected under FB_OPTION_EDITOR_MODE); clear-nearest-marker, usage, no-arg options, remaining-flags report, no-marker/invalid-flag no-ops map to FrogbotClearMarkerFlag(). Synthesis correctly describes the CODE, not the misleading copy-paste help string at bot_commands.c:2342.
### ktx:command:clearmarkerflag:frogbot:editor
- "frogbot waypoint-editor command (only in editor mode)" -> src/bot_commands.c:2342 `{ "clearmarkerflag", FrogbotClearMarkerFlag, ... }` (in editor_commands[] only; absent from std_commands[]) + src/bot_commands.c:2385-2386 `frogbot_cmd_t *commands = FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands;` -> MATCH (structural scope)
- "clears given routing flag(s) from the marker nearest the player" -> src/bot_commands.c:1543,1564 `gedict_t *nearest = LocateMarker(self->s.v.origin); ... nearest->fb.T &= ~flags;` -> MATCH (the line-2342 help string "path between two markers" is a source copy-paste error; synthesis traced the code not the string)
- "usage: clearmarkerflag <flags>" -> src/bot_commands.c:1553,1560 `if (trap_CmdArgc() < 3) {...} trap_CmdArgv(2, param, sizeof(param));` -> MATCH
- "no flag argument -> prints valid marker-flag options" -> src/bot_commands.c:1553-1557 `if (trap_CmdArgc() < 3) { G_sprint(self, PRINT_HIGH, "Provide marker flags: " FROGBOT_MARKER_FLAG_OPTIONS "\n"); return; }` -> MATCH
- "reports marker's remaining flags after clearing" -> src/bot_commands.c:1565-1566 `G_sprint(self, PRINT_HIGH, "Marker flags cleared, now: %s\n", EncodeMarkerFlags(nearest->fb.T));` -> MATCH
- "does nothing if no marker nearby" -> src/bot_commands.c:1546-1551 `if (nearest == NULL) { G_sprint(self, PRINT_HIGH, "No marker nearby\n"); return; }` -> MATCH
- "or if supplied flag string is invalid" -> src/bot_commands.c:1561-1572 `flags = DecodeMarkerFlagString(param); if (flags) {...} else { G_sprint(... "Marker flags invalid, options are %s" ...); }` -> MATCH
WI-2: n/a (frogbot sub-command, not in cmds[] CF_ table; no registered-default claim)

RESULT | ktx:command:coach | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=13 | Structurally parallel to captain; "(spectators only)" traced to CF_SPECTATOR (commands.c:804) + DoCommand dispatch (commands.c:1088-1094) -- a properly-traced scope clause, not a name inference. Toggle + 8 refusal conditions map to VoteCoach enforcing lines; correctly omits captain's CTF red/blue check. [HG2 re-grep confirmed coach.c:199 +60 timeout]
### ktx:command:coach
- "toggles caller's coach status (spectators only)" -> src/commands.c:804 `{ "coach", VoteCoach, 0, CF_SPECTATOR, CD_COACH }` + src/commands.c:1088-1094 `if (spc) { if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) { return DO_WRONG_CLASS; } }` -> MATCH (scope traced to flag + dispatch)
- "no election active & not yet coach -> requests + starts election" -> src/coach.c:177-199 `self->v.elect = 1; self->v.elect_type = etCoach; ... electguard ...` -> MATCH
- "players approve by typing 'yes'" -> src/coach.c:184-189 `for(...) if ((p != self) && (p->ct == ctPlayer)) G_sprint(p,2,"Type %s in console to approve\n",redtext("yes"))` -> MATCH
- "60-second timeout" -> src/coach.c:199 `electguard->s.v.nextthink = g_globalvars.time + 60;` -> MATCH (exact 60)
- "invoking again while caller's own election pending aborts it" -> src/coach.c:91-97 `if (is_elected(self, etCoach)) { ... "aborts election" ... AbortElect(); }` (is_elected = self->v.elect_type==etCoach, src/vote.c:462) -> MATCH
- "invoking while already a coach steps down" -> src/coach.c:100-106 `if (coach_num(self)) { ... "is no longer a coach" ... ExitCoach(); }` -> MATCH
- "refused during a match or intermission" -> src/coach.c:109 `if (match_in_progress || intermission_running) { return; }` -> MATCH
- "non-team / non-CTF modes" -> src/coach.c:114 `if (!isTeam() && !isCTF())` -> MATCH
- "fewer than 3 players present" -> src/coach.c:121 `if (CountPlayers() < 3)` -> MATCH (exact <3)
- "when 2 coaches already exist" -> src/coach.c:128 `if (k_coaches == 2)` -> MATCH
- "while any other election is in progress" -> src/coach.c:136 `if (get_votes( OV_ELECT))` (reached after self-elected check returned) -> MATCH
- "before caller has set a team name" -> src/coach.c:151 `if (strnull(getteam(self)))` -> MATCH
- "when a coach with the same team name already exists" -> src/coach.c:159-173 `for (p=world; (p=find_spc(p)) && !coach_num(p);) {;} if (p) { if (streq(getteam(self),getteam(p))) {...} }` -> MATCH
WI-2: n/a (CF_SPECTATOR, no CF_*_ADMIN; "(spectators only)" verified via dispatch; no registered-default claim)

## Wave 3 -- canary=k_yawnmode (expect TRACED-CLEAN, over-flag control) -- HG1 PASS (returned TRACED-CLEAN; subagent discriminating not blanket-flagging), HG2 PASS -- 5 batch rows recorded

NOTE (methodology / B4 prioritization): dropring's WI-2 is a *prominent-lead* access-class error -- "Admin toggle" is the FIRST descriptor word, so a downstream consumer reading the lead is materially misled. Enum-correct as WI2-FIX (core behaviour fully traced & correct; only the access-class metadatum wrong; per enforce-trace-discipline.md WI2-FIX is reported separately, not counted flavour-C). Flagged here as high downstream-visibility for the B4 re-synth queue. Classification stands per the mechanical enum.

RESULT | ktx:command:dropring | WI2-FIX | flavourC=0 | wi2=1 | clauses=6 | Core toggle/broadcast/match-guard/drop-mechanics fully traced & correct; lead "Admin toggle" is a WRONG access-class -- dropring is CF_PLAYER (any player, no CF_PLR_ADMIN check); CF_SPC_ADMIN is DEAD (CF_SPECTATOR unset -> specs get DO_WRONG_CLASS before the admin check). [orchestrator HG2 re-grep independently confirmed commands.c:742 flags + dispatch 1088-1117 + g_local.h:647-651]
### ktx:command:dropring
- "toggle on/off, flips each invocation" -> src/commands.c:3162 `cvar_toggle_msg(self, "dr", redtext("DropRing"));` -> src/g_utils.c:2211 `i = !cvar(cvarName);` ... src/g_utils.c:2218 `trap_cvar_set_float(cvarName, (float) i);` -> MATCH
- "broadcasts '<player> enables/disables DropRing' to everyone" -> src/g_utils.c:2215 `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg);` (G_bprint = broadcast; msg = redtext("DropRing")) -> MATCH
- "refused while a match is in progress" -> src/commands.c:3157-3159 `if (match_in_progress) { ... return; }` -> MATCH
- "drop requires powerups enabled (k_pow_r) [and dr and Get_Powerups]" -> src/items.c:1989 `if (cvar("dr") && Get_Powerups() && cvar("k_pow_r"))` -> MATCH
- "dropped Ring keeps its remaining powerup time, pickable by another player" -> src/items.c:1993 `DropPowerup(self->invisible_finished - g_globalvars.time, IT_INVISIBILITY);` + src/items.c:1887 `self->cnt = g_globalvars.time + timeleft;` + src/items.c:1900 `SP_item_artifact_invisibility();` -> MATCH
- "Admin toggle (access class = admin)" -> src/commands.c:742 `{ "dropring", ToggleDropRing, 0, CF_PLAYER | CF_SPC_ADMIN, CD_DROPRING }` vs dispatch src/commands.c:1106-1117 (player path: CF_PLAYER set, CF_PLR_ADMIN NOT set -> NO admin check) + src/commands.c:1091 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) return DO_WRONG_CLASS;` (spec rejected before CF_SPC_ADMIN check) + include/g_local.h:647-651 -> MISMATCH(NOT admin-gated: any in-game player may run it; the CF_SPC_ADMIN bit is dead because CF_SPECTATOR is unset)
WI-2: Access-class WRONG. dropring is a player command runnable by ANY player (CF_PLAYER, no CF_PLR_ADMIN); NOT admin-restricted; NOT usable by spectators (CF_SPECTATOR unset -> DO_WRONG_CLASS at src/commands.c:1091 before any admin check, so CF_SPC_ADMIN never takes effect). Correct class: "player command, any player, not admin-gated; not usable by spectators."

RESULT | ktx:command:fav16_add | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Spectator command; tracking-required guard, write-to-slot-16 with overwrite, 16fav_go-reads-slot all map to verified enforcing lines.
### ktx:command:fav16_add
- "Spectator command" -> src/commands.c:861 `{ "fav16_add", DEF(favx_add), 16, CF_SPECTATOR, CD_FAV16_ADD }` + dispatch src/commands.c:1091 (CF_SPECTATOR set, no CF_SPC_ADMIN) + player path src/commands.c:1106 players rejected -> MATCH
- "Does nothing unless you are tracking a real player" -> src/commands.c:5723-5725 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)) { G_sprint(self, 2, "fav add: you are %s player!\n", redtext("not tracking")); ... }` (goal = tracked target) -> MATCH
- "tracked player written to slot 16, overwriting any previous occupant" -> src/commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (fav_num=16 -> favx[15], plain assignment) + include/progs.h:1009 `int favx[MAX_CLIENTS]; // ...favX_add/Xfav_go commands` -> MATCH
- "16fav_go later snaps your POV to whoever occupies that slot" -> src/commands.c:881 `{ "16fav_go", DEF(xfav_go), 16, CF_SPECTATOR, ... }` -> src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` ... src/commands.c:5856 `stuffcmd_flags(self, ..., "track %d\n", GetUserID(p));` -> MATCH
WI-2: n/a (access class "any spectator" matches CF_SPECTATOR with no CF_SPC_ADMIN).

RESULT | ktx:command:fav_show | C-FIX | flavourC=1 | wi2=0 | clauses=5 | Output-format + spectator-only clauses clean, but "not during a match" is WRONG vs the dispatch: fav_show is CF_SPECTATOR|CF_MATCHLESS with NO match_in_progress guard in DoCommand, the handler, or ClientCommand -- CF_MATCHLESS is ADDITIVE not a no-match restriction. Identical to the canonical autotrack C-FIX pattern. [orchestrator HG2 re-grep independently confirmed commands.c:890 flags + no match guard in 5859-5917 + g_local.h:653/657]
### ktx:command:fav_show
- "Spectator command (usable only by spectators)" -> src/commands.c:890 `{ "fav_show", fav_show, 0, CF_SPECTATOR | CF_MATCHLESS, CD_FAV_SHOW }` + dispatch src/commands.c:1091 (CF_SPECTATOR set) + player path src/commands.c:1106 players rejected (no CF_SPC_ADMIN -> any spectator) -> MATCH
- "and not during a match" -> src/commands.c:1069-1143 DoCommand: only match-related gate is src/commands.c:1078 `if (k_matchLess && !(cmds[icmd].cf_flags & CF_MATCHLESS)) return DO_CMD_DISALLOWED_MATCHLESS;`; NO match_in_progress check for a CF_SPECTATOR cmd, none in fav_show body src/commands.c:5859-5917, none in ClientCommand -> MISMATCH(CF_MATCHLESS is additive "also valid in matchless mode"; fav_show is dispatchable by a spectator DURING a live match -- the no-match clause has NO enforcing line; canonical autotrack C-FIX pattern)
- "Prints the spectator's personal favourites to that spectator" -> src/commands.c:5878 `G_sprint(self, 2, " \220slot %2d\221 \x8D %s\n", fav_num + 1, p->netname);` (G_sprint -> self only) -> MATCH
- "first slot-based favourites ('slot N -> name'), then plain favourites list (names)" -> src/commands.c:5867 `if ((diff = self->favx[fav_num]))` loop -> 5878 slot line; then src/commands.c:5895 `if ((diff = self->fav[fav_num]))` loop -> src/commands.c:5909 `" %s\n", p->netname` -> MATCH
- "Prints 'Favourites list empty or nothing to show' when both empty" -> src/commands.c:5914-5916 `if (!showed) G_sprint(self, 2, "Favourites list %s or nothing to show\n", redtext("empty"));` -> MATCH
WI-2: n/a -- "spectator-only" access class correct; the no-match SCOPE error is a wrong behavioural assertion (C-FIX), not a default/access-class metadatum.

RESULT | ktx:command:ffa | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=12 | Every preset value maps verbatim to ffa_um_init (commands.c:4419-4436) incl. matching comments; common_um_init-runs-first ordering + the conditioned matchless-dir redirect both trace; "berserk disabled" correctly rests on the VALUE k_bzk 0 (not the sarcastic stale comment). [orchestrator HG2 re-grep independently confirmed commands.c:4692 matchless-dir condition]
### ktx:command:ffa
- "applies the FFA preset / shared common reset runs first" -> src/commands.c:4796 `trap_readcmd(common_um_init, buf, sizeof(buf));` THEN src/commands.c:4799 `trap_readcmd(um_list[(int)umode].initstring, buf, sizeof(buf));` -> MATCH
- "teamplay 0 (no teammates, self-damage applies)" -> src/commands.c:4424 `"teamplay 0\n" // hurt yourself, no teammates` -> MATCH
- "deathmatch 3 (weapons stay on pickup)" -> src/commands.c:4425 `"deathmatch 3\n" // weapons stay` -> MATCH
- "caps server at 26 (maxclients/k_maxclients 26)" -> src/commands.c:4421-4422 `"maxclients 26\n"` + `"k_maxclients 26\n"` -> MATCH
- "20-minute timelimit" -> src/commands.c:4423 `"timelimit 20\n"` -> MATCH
- "time-based 5-minute overtime" -> src/commands.c:4432-4433 `"k_overtime 1\n" // time based` + `"k_exttime 5\n" // overtime 5mins` -> MATCH
- "powerups with quad and ring dropping on death (dq 1, dr 1)" -> src/commands.c:4428 `"k_pow 1\n"` + src/commands.c:4426 `"dq 1\n" // drop quad` + src/commands.c:4427 `"dr 1\n" // drop ring` -> MATCH
- "disables team-size/lock constraints (k_membercount/k_lockmin/k_lockmax 0)" -> src/commands.c:4429-4431 `"k_membercount 0\n"` `"k_lockmin 0\n"` `"k_lockmax 0\n"` -> MATCH
- "disables berserk mode" -> src/commands.c:4435 `"k_bzk 0\n"` (VALUE 0 = disabled; trailing sarcastic comment is stale) -> MATCH
- "sets internal game mode to k_mode 3" -> src/commands.c:4434 `"k_mode 3\n"` -> MATCH
- "non-team deathmatch with no fixed roster size" -> src/commands.c:4424 teamplay 0 + src/commands.c:4429-4431 lock constraints 0 -> MATCH
- "in matchless mode with k_use_matchless_dir set, loads matchless config dir instead of ffa" -> src/commands.c:4692-4694 `if (streq(um, "ffa") && k_matchLess && cvar("k_use_matchless_dir")) { um = "matchless"; }` -> MATCH (correctly conditioned on k_matchLess AND k_use_matchless_dir)
WI-2: n/a (description asserts no access class).

RESULT | ktx:command:fragsup | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=7 | +10/clamp-100/match+hoony-noop/already-max/announce all trace clean, but "by 2 in any hoonymode" and "20 in duel hoonymode" are AdjustFragLimit internals UNREACHABLE via fragsup -- FragsUp short-circuits on isHoonyModeAny() at commands.c:3101 BEFORE calling AdjustFragLimit at 3109, so the hoony value-branches never fire for THIS command (real code fully-excluded for this path, more conditional than implied). [orchestrator HG2 re-grep independently confirmed FragsUp 3097/3101/3105/3109 + AdjustFragLimit 3042/3044]
### ktx:command:fragsup
- "Raises the server fraglimit by 10" -> src/commands.c:3109 `AdjustFragLimit(1);` -> src/commands.c:3042 `fraglimit += delta * (isHoonyModeAny() ? 2 : 10);` (delta=1, non-hoony -> +10) -> MATCH
- "(or by 2 in any hoonymode)" -> src/commands.c:3042 real line, BUT reached from fragsup only via src/commands.c:3105 `else` guarded by src/commands.c:3101 `else if (isHoonyModeAny())` { src/commands.c:3103 "No fraglimit in hoonymode" } -- AdjustFragLimit NEVER called from fragsup when hoony -> MISMATCH(unreachable via this command; +2 branch describes behaviour fragsup cannot exhibit; flavour-C near-miss)
- "clamped to the allowed maximum (100...)" -> src/commands.c:3044 `fraglimit = bound(isHoonyModeAny() ? 0 : 1, fraglimit, isHoonyModeDuel() ? 20 : 100);` (non-hoony -> max 100) -> MATCH
- "...or 20 in duel hoonymode" -> src/commands.c:3044 real line, same unreachability as +2 (hoony excluded at 3101 before AdjustFragLimit) -> MISMATCH(unreachable via fragsup; flavour-C near-miss)
- "no effect during a match or in hoonymode (no fraglimit)" -> src/commands.c:3097 `if (match_in_progress) { return }` + src/commands.c:3101-3103 `else if (isHoonyModeAny()) { G_sprint(... "No fraglimit in hoonymode") }` -> MATCH (this clause itself proves the two hoony-value clauses unreachable)
- "if already at the maximum it reports the fraglimit unchanged" -> src/commands.c:3111-3113 `if (fl == fraglimit) { G_sprint(self, 2, "%s still %s\n", redtext("fraglimit"), dig3(fraglimit)); return }` -> MATCH
- "otherwise the new fraglimit is announced to everyone" -> src/commands.c:3118-3119 `cvar_set("fraglimit", ...); G_bprint(2, "%s %s\n", redtext("Fraglimit set to"), dig3(fraglimit));` (G_bprint = broadcast) -> MATCH
WI-2: n/a (no default/access-class claim asserted).

## Wave 4 -- canary=autotrack (expect C-FIX) -- HG1 PASS (returned C-FIX, re-confirmed at dispatcher+handler), HG2 PASS -- 5 batch rows recorded

RESULT | ktx:command:hdptoggle | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Admin gate (CF_BOTH_ADMIN + is_adm dispatch), k_lock_hdp flip, broadcast polarity (Allows), /handicap refusal while locked, and match-block all map to located enforcing lines.
### ktx:command:hdptoggle
- "Admin command" -> src/commands.c:835 `{ "hdptoggle", hdptoggle, 0, CF_BOTH_ADMIN, CD_HDPTOGGLE }` + src/commands.c:1096-1116 `if ((cmds[icmd].cf_flags & CF_SPC_ADMIN) && !is_adm(self)) ... if ((cmds[icmd].cf_flags & CF_PLR_ADMIN) && !is_adm(self))` -> MATCH
- "flips the k_lock_hdp lock" -> src/commands.c:5203 `trap_cvar_set_float("k_lock_hdp", !cvar("k_lock_hdp"));` -> MATCH
- "broadcasts whether handicap is now allowed/disallowed for everyone" -> src/commands.c:5204-5205 `G_bprint(2, "%s %s %s\n", self->netname, redtext(Allows(!cvar("k_lock_hdp"))), redtext("handicap"));` + src/g_utils.c:1844 `return (f ? "allows" : "disallows");` -> MATCH
- "while locked, players' /handicap commands are refused" -> src/g_utils.c:1674-1679 `if (cvar("k_lock_hdp")) { G_sprint(self, 2, "%s changes are not allowed\n", redtext("handicap")); return false; }` (SetHandicap, from handicap() src/commands.c:5230) -> MATCH
- "no effect while a match is in progress" -> src/commands.c:5198-5201 `if (match_in_progress) { return; }` -> MATCH
WI-2: n/a -- k_lock_hdp bare RegisterCvar (src/world.c:801, default 0); access class CF_BOTH_ADMIN matches "Admin command".

RESULT | ktx:command:klist | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | All four section schemas, per-section counts, sprint-to-requester, and the 3-way during-match player gate map to located lines; "in which case" phrasing imprecise but the disabled message fires exactly in the blocked case (still-true vagueness). [orchestrator HG2 re-grep independently confirmed commands.c:5077-5081]
### ktx:command:klist
- "Prints a detailed client list to the requesting client" -> src/commands.c:5087-5171 all output via `G_sprint(self, 2, ...)` (sprint to self = requester, not broadcast) -> MATCH
- "players (id, admin marker, vip, handicap, team, name)" -> src/commands.c:5088-5096 `redtext("id"),"ad","vip","hdp","team","name" ... GetUserID(p), (adm marker), VIP(p), (hdc==100?"off":..), getteam(p), getname(p)` -> MATCH
- "spectators (id, admin marker, vip, coach marker, name, who they track)" -> src/commands.c:5108-5118 `... redtext("co") ... track = TrackWhom(p) ...` -> MATCH
- "ghosts (frags, team, name)" -> src/commands.c:5126-5133 `find(p, FOFCLSN, "ghost") ... (int)p->s.v.frags, getteam(p), getname(p)` -> MATCH
- "unconnected/connecting clients (id, vip, connection state, name)" -> src/commands.c:5143-5164 `*state "zombie"/"preconnected"/"connected" -> "connecting" ... iKey(p,"*userid"), VIP(p), ..., p->netname` -> MATCH
- "each section ends with a count of how many were found" -> src/commands.c:5099-5102,5121-5124,5136-5139,5169-5172 `if (i) G_sprint(self, 2, "%s %2d found %s\n", ...)` -> MATCH
- "while a match in progress an ordinary player cannot use it unless k_allowklist set" -> src/commands.c:5077-5081 `if (!cvar("k_allowklist") && match_in_progress && self->ct == ctPlayer) { G_sprint(self, 2, "klist is disabled\n"); return; }` -> MATCH (blocked only when !k_allowklist AND match AND player)
- "in which case it reports 'klist is disabled'" -> src/commands.c:5079 `G_sprint(self, 2, "klist is disabled\n");` -> MATCH (fires in exactly the can't-use scenario; imprecise antecedent but correct, still-true vagueness)
WI-2: n/a -- k_allowklist = RegisterCvarEx("k_allowklist","1") (src/world.c:861, default 1); table CF_BOTH|CF_MATCHLESS consistent.

RESULT | ktx:command:lgcmode | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=5 | Toggle/broadcast, dmm4-gate, rules-change-gate, k_lgcmode var all MATCH; but disable-midair/instagib/dmgfrags + handicap-reset are enforced UNCONDITIONALLY (commands.c:7858-7875, no !k_lgc guard -- the only !k_lgc guard is the dmm4 gate at 7850), so they also run on turn-OFF; description scopes them to "turning it on", a conditionality the code does not carry (misleads about the OFF transition). [orchestrator HG2 re-grep independently confirmed ToggleLGC body 7842-7879]
### ktx:command:lgcmode
- "Toggles LGC game mode on/off and broadcasts the change" -> src/commands.c:7879 `cvar_toggle_msg(self, LGCMODE_VARIABLE, redtext("LGC mode"));` + src/g_utils.c:2211-2218 `i = !cvar(cvarName); ... G_bprint(...); trap_cvar_set_float(cvarName, (float) i);` (table entry src/commands.c:957 `{ "lgcmode", ToggleLGC, 0, CF_PLAYER | CF_SPC_ADMIN, CD_LGC }`; 7877 cvar_set is a redundant pre-set) -> MATCH
- "Enabling requires dmm4 first (else 'LGC mode requires dmm4')" -> src/commands.c:7850-7854 `if (!k_lgc && (deathmatch != 4)) { G_sprint(self, 2, "LGC mode requires dmm4\n"); return; }` (!k_lgc = currently off = enabling) -> MATCH
- "only allowed when a rules change is permitted" -> src/commands.c:7844-7846 `if (!is_rules_change_allowed()) { return; }` -> MATCH
- "turning it on also disables midair/instagib/dmgfrags and resets caller handicap to off" -> src/commands.c:7858-7875 `if (cvar("k_midair")) cvar_set("k_midair","0"); if (cvar("k_instagib")) cvar_set("k_instagib","0"); if (cvar("k_dmgfrags")) cvar_set("k_dmgfrags","0"); SetHandicap(self, 100);` -> MISMATCH(these lines are UNCONDITIONAL -- not guarded by !k_lgc/turning-on; they also run when turning LGC OFF and on a no-op re-toggle; the "turning it on" conditional framing has no enforcing basis and misleads about the OFF transition -- flavour-C near-miss)
- "mode state held in k_lgcmode server variable" -> include/g_local.h:1228 `#define LGCMODE_VARIABLE "k_lgcmode"` + src/world.c:1083 `RegisterCvar("k_lgcmode");` -> MATCH
WI-2: n/a -- k_lgcmode bare RegisterCvar (default 0); no access-class claim.

RESULT | ktx:command:noga | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Green-armor-on-spawn effect, k_ctf_ga flip, server-wide announce, CTF-only guard, and match-block-unless-matchless polarity all map to located enforcing lines. [orchestrator HG2 re-grep independently confirmed ctf.c:790-799]
### ktx:command:noga
- "Toggles whether players receive green armor on spawn in CTF" -> src/ctf.c:802 `cvar_toggle_msg(self, "k_ctf_ga", redtext("green armor"));` + src/client.c:2342-2354 `if (isCTF()) { ... if (cvar("k_ctf_ga") && deathmatch < 4 && match_in_progress == 2) { self->s.v.armorvalue = 50; self->s.v.armortype = 0.3; self->s.v.items |= IT_ARMOR1; } }` -> MATCH
- "by flipping the k_ctf_ga setting" -> src/ctf.c:802 + src/g_utils.c:2211-2218 (cvar_toggle_msg flips via i = !cvar) -> MATCH
- "the new state is announced server-wide" -> src/g_utils.c:2215 `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg);` -> MATCH
- "Only works in CTF mode" -> src/ctf.c:795-799 `if (!isCTF()) { G_sprint(self, 2, "Can't do this in non CTF mode\n"); return; }` -> MATCH
- "blocked while a match in progress unless matchless" -> src/ctf.c:790-792 `if (match_in_progress && !k_matchLess) { return; }` -> MATCH
WI-2: n/a -- k_ctf_ga bare RegisterCvar (src/world.c:961, default 0); description asserts no access class (table CF_BOTH_ADMIN|CF_MATCHLESS; admin requirement omitted -- omission of a true fact is not a flavour-C/WI-2 defect).

RESULT | ktx:command:noitems | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=3 | Flip of k_noitems, server-wide announce, and the during-match silent-ignore all map to located enforcing lines.
### ktx:command:noitems
- "Toggles noitems mode on/off by flipping k_noitems" -> src/commands.c:8933 `cvar_toggle_msg(self, "k_noitems", redtext("noitems mode"));` + src/g_utils.c:2211-2218 `i = !cvar("k_noitems"); ... trap_cvar_set_float("k_noitems", (float) i);` -> MATCH
- "the new state is announced server-wide" -> src/g_utils.c:2215 `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg);` -> MATCH
- "Cannot be changed while a match in progress (ignored during a match)" -> src/commands.c:8928-8931 `if (match_in_progress) { return; }` (before the toggle, silent return) -> MATCH
WI-2: n/a -- k_noitems bare RegisterCvar (src/world.c:787, default 0; shipped-cfg `k_noitems 1` at src/commands.c:4481/4505 is C2 distribution-drift, not the registered default); no access-class claim.

## Wave 5 -- canary=k_teamoverlay (expect C-NEAR-MISS) -- HG1 PASS (returned C-NEAR-MISS), HG2 PASS -- 5 batch rows recorded

RESULT | ktx:command:overtime | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Cycle sequence, k_exttime=0->1, match-in-progress no-op, all-player announce each map to enforcing lines; SD_GOLDEN_FRAG==4 confirms the 5-state ring. [orchestrator HG2 re-grep independently confirmed commands.c:1727/1735-1765 + g_consts.h:305]
### ktx:command:overtime
- "Cycles overtime mode each run" -> src/commands.c:1732 `f1 = bound(0, cvar("k_overtime"), 4);` + if/else-if ladder 1735-1766 advancing k_overtime -> MATCH
- "no-op while a match is in progress" -> src/commands.c:1727-1729 `if (match_in_progress) { return; }` -> MATCH
- "off -> time-based; if k_exttime was 0 it is set to 1" -> src/commands.c:1735-1745 `if (!f1){ cvar_fset("k_overtime",1); ... cvar_fset("k_exttime",(f2=1)); ... "time based" }` -> MATCH
- "-> sudden death" -> src/commands.c:1747-1750 `else if (f1==1){ cvar_fset("k_overtime",2); ... "sudden death" }` -> MATCH
- "-> tie-break" -> src/commands.c:1752-1755 `else if (f1==2){ cvar_fset("k_overtime",3); ... "tie-break" }` -> MATCH
- "-> golden frag" -> src/commands.c:1757-1760 `else if (f1==3){ cvar_fset("k_overtime",SD_GOLDEN_FRAG); ... "golden frag" }` (include/g_consts.h:305 `#define SD_GOLDEN_FRAG (4)`) -> MATCH
- "-> off" -> src/commands.c:1762-1765 `else if (f1==SD_GOLDEN_FRAG){ cvar_fset("k_overtime",0); ... "off" }` -> MATCH
- "announced to all players" -> src/commands.c:1744-1745 `G_bprint(2, ...)` (server broadcast) -> MATCH
WI-2: n/a -- table CF_PLAYER|CF_SPC_ADMIN; no contradicting default/access-class claim.

RESULT | ktx:command:overtimeup | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | +1-minute increment, wrap to 1 at >=11 or <=0, all-player announce, match-in-progress no-op all map to enforcing lines. [orchestrator HG2 re-grep independently confirmed commands.c:1779/1781-1783]
### ktx:command:overtimeup
- "Increases k_exttime (minutes) by one minute each run" -> src/commands.c:1779 `k_exttime++;` ... src/commands.c:1786 `cvar_fset("k_exttime", k_exttime);` (k_exttime is minutes: src/match.c:594-598 `self->cnt=k_exttime; G_bprint(2,"...minute%s overtime follows\n",dig3(k_exttime),...)`) -> MATCH
- "wrapping back to 1 when it would reach 11 or drop to 0 or below" -> src/commands.c:1781-1783 `if ((k_exttime >= 11) || (k_exttime <= 0)) { k_exttime = 1; }` (post-increment) -> MATCH
- "new length announced to all players" -> src/commands.c:1788 `G_bprint(2, "%s %d %s%s\n", redtext("Overtime length set to"), k_exttime, ...)` -> MATCH
- "No effect while a match is in progress" -> src/commands.c:1774 `if (match_in_progress) { return; }` (before increment/set) -> MATCH
WI-2: n/a -- table CF_PLAYER|CF_SPC_ADMIN; no contradicting claim.

RESULT | ktx:command:pickspawn | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=10 | Nearest-spawn nomination, per-player(duel)/per-team, unpick, refuse-taken, cap=maxclients/2, not-during-game/intermission all MATCH; but "only in HoonyMode / team HoonyMode" is OVER-ASSERTED -- HM_pick_spawn has NO isHoonyModeAny()/k_hoonymode rejection (verified absent across the whole handler 905-1065), so a plain non-hoony team red/blue player is NOT rejected; only the duel half is gated (via !isHoonyModeDuel -> team-name-or-error). Scope clause has no enforcing read-site for the team path. [orchestrator HG2 re-grep independently confirmed hoonymode.c:912-927 + absence of any-hoony gate]
### ktx:command:pickspawn
- "only in HoonyMode (duel or team HoonyMode)" -> src/hoonymode.c:912-927 `if (!isHoonyModeDuel()){ char *team=getteam(self); if(streq(team,"red")) teamflag=1; else if(streq(team,"blue")) teamflag=2; else { G_sprint(...,"Command only available in hoonymode duel mode."); return; } }` (isHoonyModeDuel src/hoonymode.c:87; NO isHoonyModeAny()/cvar("k_hoonymode") anywhere in HM_pick_spawn 905-1065) -> MISMATCH(scope over-asserted: a non-hoony TEAM game red/blue player is NOT rejected -- no any-hoonymode guard; only the duel half is effectively gated -- flavour-C near-miss, scope clause without enforcing read-site for team path)
- "used before the game starts / not available during a game or intermission" -> src/hoonymode.c:931-935 `if (match_in_progress || intermission_running) { G_sprint(...,"Command not available during game."); return; }` -> MATCH
- "nominates the spawn point nearest the player's current position" -> src/hoonymode.c:938-952 `for(spawn=...ez_find(...,"info_player_deathmatch")){ ... distance=VectorLength(difference); if((closest==world)||(distance<closest_distance)){ closest=spawn; } }` -> MATCH
- "In duel each player picks their own spawns" -> src/hoonymode.c:954-961 `if (isHoonyModeDuel()){ if (spawn->hoony_nomination == self_num){ old_nomination = spawn; } }` + per-self pick -> MATCH
- "in team HoonyMode it picks for the player's team (red/blue)" -> src/hoonymode.c:909-922,963-973 `teamflag` 1=red/2=blue; `if (spawn->hoony_nomination==1) ++red_spawns; else if (==2) ++blue_spawns;` -> MATCH
- "Running it on a spawn already picked by player/team unpicks it" -> src/hoonymode.c:983-1002 `if ((closest==old_nomination) || (isHoonyModeTDM() && (closest->hoony_nomination==teamflag))){ HM_deselect_spawn(closest); }` -> MATCH
- "refuses spawns already picked by someone else" -> src/hoonymode.c:1003-1018 `else if (closest->hoony_nomination){ ... "has already been picked by ..." }` -> MATCH
- "refuses once a team reached cap (maxclients/2)" -> src/hoonymode.c:1021-1027 `if ((teamflag==1 ? red_spawns : blue_spawns) >= (cvar("maxclients")/2)){ G_sprint(...,"Team already has %d spawns allocated"); return; }` -> MATCH
- "(team flag from getteam red/blue)" -> src/hoonymode.c:914-922 `char *team=getteam(self); if(streq(team,"red")) teamflag=1; else if(streq(team,"blue")) teamflag=2;` -> MATCH
- "(success path nominates / deselects prior self nomination)" -> src/hoonymode.c:1029-1062 `if (old_nomination!=0) HM_deselect_spawn(old_nomination); ... HM_select_spawn(closest,self,...); HM_store_spawns();` -> MATCH
WI-2: n/a -- table CF_PLAYER (src/commands.c:1055); flavour-C defect is the scope clause, not a metadata claim.

RESULT | ktx:command:race_break | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Clear race-ready, end-run-when-running, "quit the race" broadcast, spectator no-op, isRACE precondition all map to enforcing lines (r_changestatus case 2 + helpers).
### ktx:command:race_break
- "In race mode" -> src/race.c:3015-3018 + src/race.c:2951-2959 `qbool race_command_checks(void){ if (!isRACE()){ G_sprint(...,"Command only available in race mode..."); return false; } return true; }` -> MATCH
- "marks calling player not ready (clears race-ready)" -> src/race.c:3046 `set_player_race_ready(self, 0);` -> src/race.c:2941-2948 `if(!e->race_ready) return; ... e->race_ready = 0;` -> MATCH
- "if actively running, run is ended" -> src/race.c:3040-3044 `if (self->racer && race.status){ ... race_end(self, true, false); }` -> MATCH
- "broadcasts '<name> has quit the race'" -> src/race.c:3042 `G_bprint(PRINT_HIGH, "%s has quit the race\n", self->netname);` -> MATCH
- "no effect for spectators" -> src/race.c:3020-3023 `if (self->ct == ctSpec){ return; }` -> MATCH
- "or when race-mode preconditions not met" -> src/race.c:3015-3018 `if (!race_command_checks()){ return; }` -> MATCH
WI-2: n/a -- table CF_PLAYER (src/commands.c:1005); no contradicting claim.

RESULT | ktx:command:race_chasecam | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Toggle race_chasecam, auto-track active racer (race.c:2394/2469), no-effect-if-racer, isRACE precondition all map to enforcing lines; "spectator" = race-mode non-racer (gate is !self->racer) is conceptual wording, not a formal access-class assertion.
### ktx:command:race_chasecam
- "Toggles caller's race chasecam follow on/off" -> src/race.c:3002-3004 `case 3: set_player_race_follow(self, !self->race_chasecam); return;` -> src/race.c:2894-2921 (flips e->race_chasecam) -> MATCH
- "auto-track the active racer with the chasecam" -> src/race.c:2394-2467 `if (!self->racer && self->race_chasecam){ racer = race_find_chasecam_for_plr(self,racer); ... self->s.v.movetype = MOVETYPE_LOCK; }` + src/race.c:2469-2474 `if (!self->racer && !self->race_chasecam){ restore }` -> MATCH
- "no effect if the caller is a racer" -> src/race.c:2987-2990 `if (self->racer){ return; }` -> MATCH
- "or when race-mode preconditions not met" -> src/race.c:2982-2985 `if (!race_command_checks()){ return; }` (false unless isRACE src/race.c:2953) -> MATCH
WI-2: n/a -- table CF_PLAYER (src/commands.c:1022); "spectator" = race-mode non-racer (gate !self->racer), conceptual not a formal command-class metadatum.

## Wave 6 -- canary=k_yawnmode (expect TRACED-CLEAN, over-flag control) -- HG1 PASS (returned TRACED-CLEAN), HG2 PASS (all-clean wave aggressively probed for over-pass; none found) -- 5 batch rows recorded

RESULT | ktx:command:race_set_checkpoint | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Access class, checkpoint-node add (arg=2 -> nodeCheckPoint), race-running guard, max-nodes guard+message, id/coords broadcast, custom-route flag all map to enforcing lines. [orchestrator HG2 over-pass probe confirmed commands.c:1015 + progs.h:28/1287 + race.c:2805]
### ktx:command:race_set_checkpoint
- "player / spectator-admin access" -> src/commands.c:1015 `{ "race_set_checkpoint", DEF(r_Xset), 2, CF_PLAYER | CF_SPC_ADMIN, CD_R_CSET }` + dispatch src/commands.c:1096/1106 -> MATCH
- "Race-mode route editing command" -> src/race.c:2793 `if (!race_command_checks())` (src/race.c:2953 `if (!isRACE())`) -> MATCH
- "Adds an intermediate checkpoint node" -> src/race.c:2813 `node.type = (raceRouteNodeType_t) t;` (t=2) + include/progs.h:1287 `nodeCheckPoint, // this node is intermediate` -> MATCH
- "no effect if the race is already running" -> src/race.c:2798 `if (race_is_started())` (src/race.c:2966 `if (race.status)`) -> MATCH
- "no effect if route holds max nodes (prints 'Can't add more checkpoints!')" -> src/race.c:2803 `if (checkpoints_count() >= MAX_ROUTE_NODES)` + src/race.c:2805 `G_sprint(self, 2, "Can't add more checkpoints!\n");` + include/progs.h:28 `#define MAX_ROUTE_NODES 20` -> MATCH
- "broadcasts checkpoint id and world coordinates; flags route custom" -> src/race.c:2821-2822 `G_bprint(2, "%s \220%d\221 set\n", ..., e->race_id); G_bprint(2, "Coordinates: %6.1f %6.1f %6.1f\n", ...)` + src/race.c:2839 `race_route_now_custom();` (src/race.c:2781-2784 sets active_route 0 + cvar -1) -> MATCH
WI-2: n/a (no default-value claim; CF_PLAYER|CF_SPC_ADMIN verified vs dispatch).

RESULT | ktx:command:race_set_timeout | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Access, one numeric arg in seconds, 0/empty->default 60, clamp 1..3600, race-running guard, broadcast all map to enforcing lines. [orchestrator HG2 over-pass probe confirmed race.c:151/152 + 3100-3109]
### ktx:command:race_set_timeout
- "player / spectator-admin access" -> src/commands.c:1017 `{ "race_set_timeout", r_timeout, 0, CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS, CD_RTIMEOUT }` + dispatch src/commands.c:1096/1106 -> MATCH
- "Race-mode setup command" -> src/race.c:3088 `if (!race_command_checks())` -> MATCH
- "one numeric argument: time limit in seconds" -> src/race.c:3098-3100 `trap_CmdArgv(1, arg_1, ...); race.timeout_setting = atoi(arg_1);` (seconds: src/race.c:2631 `race.timeout = g_globalvars.time + max(1, race.timeout_setting);`) -> MATCH
- "0 or empty resets to default 60s" -> src/race.c:3102-3104 `if (!race.timeout_setting) { race.timeout_setting = RACE_DEFAULT_TIMEOUT; }` + src/race.c:151 `#define RACE_DEFAULT_TIMEOUT 60` -> MATCH
- "any other value clamped to 1..3600" -> src/race.c:3107 `race.timeout_setting = bound(1, race.timeout_setting, RACE_MAX_TIMEOUT);` + src/race.c:152 `#define RACE_MAX_TIMEOUT 3600` -> MATCH
- "no effect while a race is running" -> src/race.c:3093 `if (race_is_started())` -> MATCH
- "on change broadcasts the new time limit" -> src/race.c:3109 `G_bprint(2, "%s set race time limit to %ss\n", self->netname, dig3(race.timeout_setting));` -> MATCH
WI-2: n/a (no cvar default-value claim; access class verified vs dispatch).

RESULT | ktx:command:save:frogbot:editor | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Editor-only subcommand, compact+renumber markers, write positions+paths, timestamped name, bots/maps/ dir, map-or-k_entityfile name, dir-not-writable error all map to enforcing lines.
### ktx:command:save:frogbot:editor
- "Bot waypoint-editor command (editor mode only)" -> src/bot_commands.c:2345 `{ "save", FrogbotSaveBotFile, ... }` in editor_commands[] + src/bot_commands.c:2386 `FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands` -> MATCH
- "compacts and renumbers all current markers" -> src/bot_commands.c:1704-1713 `for (i...){ if (markers[i]){ markers[i]->fb.index = j; new_markers[j++] = markers[i]; } } memcpy(markers, new_markers, ...);` -> MATCH
- "writes full routing (marker positions and paths)" -> src/bot_commands.c:936 `std_fprintf(file, "CreateMarker %d %d %d\n", PASSINTVEC3(markers[i]->s.v.origin));` + src/bot_commands.c:981 `std_fprintf(file, "SetMarkerPath %d %d %d\n", ...)` -> MATCH
- "timestamped .bot file under bots/maps/" -> src/bot_commands.c:916 `QVMstrftime(date, ..., "%Y%m%d-%H%M%S", 0)` + src/bot_commands.c:921 `snprintf(fileName, ..., "bots/maps/%s[%s].bot", ..., date)` -> MATCH
- "named after current map or k_entityfile override" -> src/bot_commands.c:911 `char *entityFile = cvar_string("k_entityfile");` + src/bot_commands.c:922 `strnull(entityFile) ? mapname : entityFile` -> MATCH
- "reports error if bots/maps/ not writable" -> src/bot_commands.c:924-929 `if (file == -1) { G_sprint(self, PRINT_HIGH, "Failed to open botfile.  Check bots/maps/ directory is writable\n"); ... return; }` -> MATCH
- "(success path renumber-then-write)" -> src/bot_commands.c:1704-1713 then file writes -> MATCH
WI-2: n/a (no default claim; actual gate is conditional FB_CVAR_ADMIN_ONLY at bot_commands.c:2392, correctly not asserted as a fixed class).

RESULT | ktx:command:+scores | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Press/hold +/- via Sc_Stats(arg 2/1), shows to caller, time+team-scores content, ~0.8s refresh, CTF flag status, suppressed in countdown (match_in_progress==1) and race, spectator-tracking-no-one msg all map to enforcing lines. [orchestrator HG2 over-pass probe confirmed commands.c:891/892 polarity + client.c:3723-3724 suppression]
### ktx:command:+scores
- "press-and-hold bind; -scores hides on release" -> src/commands.c:891 `{ "+scores", DEF(Sc_Stats), 2, CF_BOTH | CF_MATCHLESS, ... }` + src/commands.c:892 `{ "-scores", DEF(Sc_Stats), 1, ... }` + src/commands.c:4998-5000 `on--; self->sc_stats = (int)on;` (+scores 2->1=on; -scores 1->0=off) -> MATCH
- "shows centerprint overlay to the calling client" -> src/client.c:3726 `Print_Scores();` + src/client.c:3350/3377 `G_centerprint(self, ...)` -> MATCH
- "current match time and team scores" -> src/client.c:3476 `strlcat(buf, va("%s:%02d:%02d", redtext("tl"), minutes, seconds), ...)` + src/client.c:3511 `va("  \364:%d  \345:%d  \x90%d\x91", ts, es, ts - es)` -> MATCH
- "refreshed periodically" -> src/client.c:3723 `(self->sc_stats_time <= g_globalvars.time)` + src/client.c:3573 `self->sc_stats_time = g_globalvars.time + SC_STATS_UPDATE;` + include/g_local.h:530 `#define SC_STATS_UPDATE (0.8f)` -> MATCH
- "CTF mode also shows flag status" -> src/client.c:3399 `if (isCTF())` + client.c:3407-3441 flag-status switch -> MATCH
- "suppressed during pre-game/countdown" -> src/client.c:3724 `&& (match_in_progress != 1)` (match.c:2473 countdown sets match_in_progress=1) -> MATCH
- "and in race mode" -> src/client.c:3724 `&& !isRACE()` -> MATCH
- "spectator tracking no one shows 'Tracking no one (+scores)'" -> src/client.c:3375-3377 `if ((e == world) || (e->ct != ctPlayer)) ... G_centerprint(self, "%s%s", buf, redtext("Tracking no one (+scores)"));` -> MATCH
WI-2: n/a (no default claim; CF_BOTH|CF_MATCHLESS, no asserted access class).

RESULT | ktx:command:spawn_show | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Cycles k_spm_show, tells new state, 0=off/1=prewar/2=match with runtime hide/show verified at StartMatch, wrap past match->off, match-in-progress no-op all map to enforcing lines. [orchestrator HG2 over-pass probe confirmed commands.c:2702-2716 + match.c:1246-1248]
### ktx:command:spawn_show
- "Cycles visible spawn points on/off (k_spm_show)" -> src/commands.c:2702 `int spawn_show = cvar("k_spm_show");` + src/commands.c:2709 `spawn_show++;` + src/commands.c:2716 `cvar_set("k_spm_show", va("%d", spawn_show));` -> MATCH
- "tells you the new state" -> src/commands.c:2721/2725/2729 `G_sprint(self, 2, "Visible spawns %s\n", redtext("off"/"prewar"/"match"));` -> MATCH
- "0 = off (spawns hidden)" -> src/commands.c:2719-2722 `case SPAWNICIDE_DISABLED: HideSpawnPoints();` + include/g_local.h:1258 `#define SPAWN_SHOW_DISABLED 0` -> MATCH
- "1 = prewar (shown only before match starts)" -> src/commands.c:2723-2726 `case SPAWNICIDE_PREWAR: ShowSpawnPoints();` + enforced off at match start src/match.c:1246-1248 `if (SpawnShowStatus() != SPAWN_SHOW_MATCH) { HideSpawnPoints(); }` (StartMatch) -> MATCH (runtime-enforced, not enum-name-inferred)
- "2 = match (shown during the match)" -> src/commands.c:2727-2730 `case SPAWNICIDE_MATCH: ShowSpawnPoints();` (persists past match start because match.c:1246 hides only when status != SPAWN_SHOW_MATCH) -> MATCH
- "advancing past match wraps back to off" -> src/commands.c:2711-2713 `if (spawn_show > SPAWN_SHOW_MATCH) { spawn_show = SPAWN_SHOW_DISABLED; }` -> MATCH
- "no effect while a match is in progress" -> src/commands.c:2704-2706 `if (match_in_progress) { return; }` -> MATCH
WI-2: n/a (RegisterCvarEx("k_spm_show","1") src/world.c:882 = default 1; description makes no default claim; no access-class claim).

## Wave 7 -- canary=autotrack (expect C-FIX) -- HG1 PASS (returned C-FIX, 3rd consistent re-derivation), HG2 PASS -- 5 batch rows recorded

RESULT | ktx:command:time10 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Arg 10.0f, 0..k_timetop clamp, real match-in-progress handler guard, unchanged-report, broadcast all map to TimeSet() enforcing lines. [orchestrator HG2 over-pass probe confirmed commands.c:764 + 3021/3026/3028/3036]
### ktx:command:time10
- "Sets the match timelimit to 10 minutes" -> src/commands.c:764 `{ "time10", DEF(TimeSet), 10.0f, CF_PLAYER | CF_SPC_ADMIN, CD_TIME10 }` + src/commands.c:3026 `timelimit = bound(0, t, cvar("k_timetop"));` (t=10.0f) -> MATCH
- "clamped 0..k_timetop, takes effect only if k_timetop >= 10" -> src/commands.c:3026 `bound(0, t, cvar("k_timetop"))` -> MATCH (result 10 only when k_timetop>=10)
- "ignored while a match is in progress" -> src/commands.c:3021 `if (match_in_progress) { return; }` -> MATCH (real handler guard, not CF inference)
- "if already at the resulting value reports unchanged" -> src/commands.c:3028-3030 `if (tl == timelimit) { G_sprint(self, 2, "%s still %s\n", redtext("timelimit"), dig3(timelimit)); return; }` -> MATCH
- "otherwise broadcasts new match length to everyone" -> src/commands.c:3035-3036 `cvar_fset("timelimit", (int)timelimit); G_bprint(2, "%s %s %s%s\n", redtext("Match length set to"), ...)` -> MATCH
WI-2: n/a (no default claim; CF_PLAYER|CF_SPC_ADMIN not asserted in text).

RESULT | ktx:command:time5 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Identical TimeSet() handler, arg 5.0f confirmed in cmds[]; all clauses trace; sibling-of-time10 correctly classified identically (both genuinely clean).
### ktx:command:time5
- "Sets the match timelimit to 5 minutes" -> src/commands.c:763 `{ "time5", DEF(TimeSet), 5.0f, CF_PLAYER | CF_SPC_ADMIN, CD_TIME5 }` + src/commands.c:3026 `timelimit = bound(0, t, cvar("k_timetop"));` (t=5.0f) -> MATCH
- "clamped 0..k_timetop, takes effect only if k_timetop >= 5" -> src/commands.c:3026 `bound(0, t, cvar("k_timetop"))` -> MATCH
- "ignored while a match is in progress" -> src/commands.c:3021 `if (match_in_progress) { return; }` -> MATCH
- "if already at the resulting value reports unchanged" -> src/commands.c:3028-3030 -> MATCH
- "otherwise broadcasts new match length to everyone" -> src/commands.c:3035-3036 -> MATCH
WI-2: n/a.

RESULT | ktx:command:toggletracklist | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Toggle + broadcast + on/off scope all trace to enforcing read-site (commands.c:5433); match no-op is the handler's own guard (5461), correctly NOT a CF_MATCHLESS inference (avoids the autotrack-class error). [orchestrator HG2 over-pass probe confirmed commands.c:5433 polarity]
### ktx:command:toggletracklist
- "Toggles k_allowtracklist on/off" -> src/commands.c:5459 `int k_allowtracklist = !cvar("k_allowtracklist");` + src/commands.c:5466 `cvar_fset("k_allowtracklist", k_allowtracklist);` -> MATCH
- "(broadcasts the new state)" -> src/commands.c:5470/5474 `G_bprint(2, "tracklist: %s ...\n", redtext("on"/"off"));` -> MATCH
- "on -> players allowed tracklist during match; off -> restricted for players during match" -> src/commands.c:5433 `if (!cvar("k_allowtracklist") && match_in_progress && self->ct == ctPlayer) { G_sprint(self, 2, "tracklist is disabled\n"); return; }` -> MATCH (off+match+player => denied; polarity+scope exact)
- "no effect while a match is in progress" -> src/commands.c:5461 `if (match_in_progress) { return; }` -> MATCH (real handler guard)
WI-2: n/a (RegisterCvarEx("k_allowtracklist","1") src/world.c:862; no default claim; CF_BOTH not asserted).

RESULT | ktx:command:uinfo | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=7 | "lists every non-system userinfo key" is BROADER than code: the argc==2 path iterates ONLY the fixed cinfos[] whitelist (~5 active: *mm/mi/ev/wpsx/kf), not the client's full userinfo. All other clauses (incl. correctly-traced no-match-restriction + the argc==3 any-key path) MATCH. [orchestrator HG2 re-grep independently confirmed g_userinfo.c:41-84/167 whitelist vs :204 ezinfokey]
### ktx:command:uinfo
- "Queries another client's public userinfo keys" -> src/g_userinfo.c:124 `void cmduinfo(void)` (cmds[] src/commands.c:944 `{ "uinfo", cmduinfo, 0, CF_BOTH | CF_MATCHLESS | CF_PARAMS | CF_NOALIAS, CD_NODESC }`) -> MATCH
- "one arg: lists every non-system userinfo key the client set to non-empty" -> src/g_userinfo.c:151 `if (argc == 2)` + src/g_userinfo.c:167 `for (i = 0; i < cinfos_cnt; i++)` + src/g_userinfo.c:176 `if (!strnull(v))` -> MISMATCH(loop iterates only the fixed cinfos[] table src/g_userinfo.c:41-84 -- active *mm/mi/ev/wpsx/kf, ~5 keys -- NOT every userinfo key the client set; real code NARROWER than "every non-system userinfo key" -- flavour-C near-miss, scope over-claim)
- "two args: shows just that key's value" -> src/g_userinfo.c:185 `if (argc == 3)` + src/g_userinfo.c:204 `v = ezinfokey(p, arg_2);` (reads ANY key) + src/g_userinfo.c:213 `G_sprint(self, 2, "%s's %s = \"%s\"\n", ...)` -> MATCH
- "no args or >2 prints usage" -> src/g_userinfo.c:136 `if ((argc == 1) || (argc > 3)) { ... "usage:..."; return; }` -> MATCH
- "System/internal keys never shown" -> src/g_userinfo.c:169 `if (isSysKey(cinfos[i].key)) { continue; }` + src/g_userinfo.c:198 `if (isSysKey(arg_2)) { v = NULL; }` (isSysKey = key starts with '*') -> MATCH
- "Aliased command identical to kuinfo" -> src/commands.c:941 `{ "kuinfo", cmduinfo, 0, ... }` vs src/commands.c:944 uinfo (same handler; uinfo has CF_NOALIAS, kuinfo not -- behaviourally identical) -> MATCH
- "usable by players and spectators, no match restriction" -> src/commands.c:1088-1117 CF_BOTH (both classes, no CF_*_ADMIN) + src/commands.c:1078-1086 CF_MATCHLESS additive + no match_in_progress guard in cmduinfo -> MATCH (traced to dispatch + handler-absence, not flag-name inference)
WI-2: n/a (no default claim; CF_BOTH verified correct vs dispatch).

RESULT | ktx:command:votecoop | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | Vote toggle, broadcast+count, majority/veto, coop+inverse-deathmatch flip, 3-way map-reload branch, deathmatch&&match refusal, player-only, usable-outside-match, no-args all map to enforcing lines; CF_MATCHLESS used correctly (no "only outside match" overclaim). [orchestrator HG2 over-pass probe confirmed vote.c:1129/1134/1136/1148/1154/1160/1169]
### ktx:command:votecoop
- "Casts (or withdraws) the caller's vote to toggle coop" -> src/vote.c:1177 `self->v.coop = !self->v.coop;` -> MATCH
- "broadcasting the vote and remaining count needed" -> src/vote.c:1179-1186 `G_bprint(2, "%s %s!%s\n", self->netname, (... "votes for coop"/"withdraws ... coop vote"), ((votes = get_votes_req(OV_COOP, true)) ? va(" (%d)", votes) : ""))` -> MATCH
- "majority reached or admin veto" -> src/vote.c:1127 `veto = is_admins_vote(OV_COOP);` + src/vote.c:1129 `if (veto || !get_votes_req(OV_COOP, true))` -> MATCH
- "flips coop cvar and inverse deathmatch cvar" -> src/vote.c:1134 `cvar_fset("coop", coop = !cvar("coop"));` + src/vote.c:1136 `cvar_fset("deathmatch", deathmatch = !coop);` -> MATCH
- "reload: matchless usermode cfg for current map if present" -> src/vote.c:1148 `if (coop && can_exec(va("configs/usermodes/matchless/%s.cfg", mapname))) { ... changelevel(mapname); }` -> MATCH
- "the bloodfest/default map under bloodfest" -> src/vote.c:1154 `else if (cvar("k_bloodfest")) { changelevel(coop ? mapname : cvar_string("k_defmap")); }` -> MATCH
- "otherwise start map when enabling coop / current map when disabling" -> src/vote.c:1160 `else { changelevel(coop ? "start" : mapname); }` -> MATCH
- "refused while deathmatch non-zero and match in progress" -> src/vote.c:1169 `if (deathmatch && match_in_progress) { G_sprint(self, 2, "Match in progress and deathmatch is non zero, you can't vote for coop\n"); return; }` -> MATCH
- "player-only, usable outside a match, no arguments" -> src/commands.c:1041 `{ "votecoop", votecoop, 0, CF_PLAYER | CF_MATCHLESS, CD_VOTECOOP }` + dispatch (CF_PLAYER present, CF_SPECTATOR absent => spec DO_WRONG_CLASS; CF_MATCHLESS additive); votecoop() reads no argv, no CF_PARAMS -> MATCH (CF_MATCHLESS correctly NOT overclaimed as "only outside a match")
WI-2: n/a (no default claim; CF_PLAYER verified correct vs dispatch).

## Wave 8 -- canary=k_teamoverlay (expect C-NEAR-MISS) -- HG1 PASS (returned C-NEAR-MISS), HG2 PASS (2 C-FIX mechanisms fully re-derived) -- 5 batch rows recorded

RESULT | ktx:command:-wp_stats | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | OFF-polarity (arg 1 vs +wp_stats arg 2, on-- handler), per-caller scope, centerprint hit/accuracy content, pair-with-+wp_stats all map to enforcing lines. [orchestrator HG2 confirmed commands.c:829/830 polarity pair]
### ktx:command:-wp_stats
- "off half of +wp_stats/-wp_stats pair (same handler)" -> src/commands.c:829-830 `{ "+wp_stats", DEF(Wp_Stats), 2, ... } / { "-wp_stats", DEF(Wp_Stats), 1, ... }` -> MATCH
- "turns OFF the overlay for the caller" -> src/commands.c:4988-4993 `void Wp_Stats(float on){ on--; self->wp_stats=(int)on; ... }` (-wp_stats arg 1 -> on-- -> 0=off; +wp_stats arg 2 -> 1=on) -> MATCH
- "per-player (caller only)" -> include/progs.h:982 `int wp_stats;` (per-edict; handler sets self->wp_stats only) -> MATCH
- "overlay = centerprint of per-weapon hit/accuracy" -> src/client.c:3160-3208 `Print_Wp_Stats(){ ... 100.0*e->ps.wpn[wpLG].hits/max(1,e->ps.wpn[wpLG].attacks) ... G_centerprint(self,...) }` -> MATCH
- "off clears the centerprint" -> src/client.c:4315-4328 `if (!self->wp_stats && self->wp_stats_time && ...) { ... G_centerprint(self,"%s",""); }` -> MATCH
WI-2: n/a (command; CF_BOTH|CF_MATCHLESS not asserted in text).

RESULT | ktx:command:yawnmode | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | Toggle+announce+immediate-apply, rules-change gate, CF_PLAYER|CF_SPC_ADMIN access, and every named rule (axe 50/20 dmm3, non-random pellets+higher SSG count, GA armour 0.4/0.3, pack-drop independent, fallbunny) map to enforcing lines. [orchestrator HG2 confirmed commands.c:8645/8652 + g_utils.c:2726 fallbunny]
### ktx:command:yawnmode
- "toggles yawn mode on/off and announces new state" -> src/commands.c:8650 `cvar_toggle_msg(self, "k_yawnmode", redtext("yawnmode"));` -> src/g_utils.c:2211-2218 `i = !cvar(cvarName); ... G_bprint(2,...); trap_cvar_set_float(...)` -> MATCH
- "applies it immediately" -> src/commands.c:8652 `FixYawnMode(); // apply changes ASAP` + src/commands.c:8636 `void FixYawnMode(void){ k_yawnmode=cvar("k_yawnmode"); ... }` -> MATCH
- "gated by rules-change permission (no effect if not allowed)" -> src/commands.c:8645-8647 `if (!is_rules_change_allowed()) { return; }` (false if match_in_progress/isRACE per src/commands.c:9033-9050) -> MATCH
- "player or spectator-admin (CF_PLAYER|CF_SPC_ADMIN)" -> src/commands.c:997 `{ "yawnmode", ToggleYawnMode, 0, CF_PLAYER | CF_SPC_ADMIN, CD_YAWNMODE }` -> MATCH
- "axe damage 50 vs 20 in dmm3" -> src/weapons.c:126-128 `else if (deathmatch == 3){ damage = k_yawnmode ? 50 : 20; }` -> MATCH
- "shotgun/SSG non-randomised pellets" -> src/weapons.c:550 `qbool non_random_bullets = (k_yawnmode || ...)` + src/weapons.c:576-578 deterministic-spread branch -> MATCH
- "higher pellet count" -> src/weapons.c:858 `int bullets = (k_yawnmode ? 21 : 14);` (SSG 21 vs 14; "e.g." representative) -> MATCH
- "armour protection values altered" -> src/items.c:471-474 `... type = (k_yawnmode ? 0.4 : 0.3); // Yawnmode: changed armor protection` (GA) -> MATCH
- "backpacks drop independently of death type; fall-bunny enabled" -> src/items.c:2686 `if (!k_yawnmode) // ...pack dropped ... independantly from death type { if (dtSUICIDE==self->deathtype) return; }` + src/g_utils.c:2726 `return (k_yawnmode || isRACE() ? 1 : cvar("k_fallbunny"));` -> MATCH
WI-2: n/a (CF_PLAYER|CF_SPC_ADMIN access claim verified MATCH at commands.c:997).

RESULT | ktx:cvar:k_btime | C-FIX | flavourC=1 | wi2=0 | clauses=5 | Quad/Octa-for-remainder correct, but "(and invulnerability) for the remainder" is WRONG: at the BERZERK trigger invincible_finished = time+2 (a 2-second grant) and its wear-off (client.c:4119-4123) is NOT !k_berzerk-guarded (unlike super_damage at client.c:4135/4160) and is never berzerk-refreshed -- invuln is brief, not for the remainder. [orchestrator HG2 re-grep independently confirmed match.c:708/710 + client.c:4135/4160 vs 4119-4123]
### ktx:cvar:k_btime
- "berzerk activation time in seconds of remaining game time" -> src/match.c:629 `// ... cnt = minutes, cnt2 = seconds left.` + src/match.c:692-696 `f1=k_berzerktime; f2=floor(f1/60); ... if ((self->cnt2==f1)&&(self->cnt==f2))` -> MATCH
- "effective only when k_bzk on; k_bzk off no effect" -> src/match.c:1267-1274 `if (cvar("k_bzk")){ k_berzerktime=cvar("k_btime"); } else { k_berzerktime=0; }` + src/match.c:690 `if (k_berzerktime != 0)` -> MATCH
- "at match start the berzerk timer set to this many seconds" -> src/match.c:1260-1269 `match_in_progress=2; ... k_berzerktime=cvar("k_btime");` -> MATCH
- "when exactly this many sec left, announces BERZERK!!!! and gives Quad/Octa for the remainder" -> src/match.c:698-708 `G_bprint(2,"BERZERK!!!!\n"); k_berzerk=1; ... p->s.v.items|=(IT_QUAD|IT_INVULNERABILITY); p->super_damage_finished=g_globalvars.time+3600;` + src/client.c:4135,4160 `if ((self->super_damage_finished < ...) && !k_berzerk)` (quad wear-off suppressed while k_berzerk -> sustained) -> MATCH (Quad/Octa portion only)
- "(and invulnerability) for the remainder" -> src/match.c:710 `p->invincible_finished = g_globalvars.time + 2;` + src/client.c:4119-4123 `if (self->invincible_finished < g_globalvars.time){ self->s.v.items -= IT_INVULNERABILITY; ... invincible_finished = 0; }` (NO `&& !k_berzerk` guard, unlike super_damage; no berzerk refresh of invincible_finished) -> MISMATCH(invulnerability is a brief 2-second grant at the trigger, NOT sustained for the remainder; quad is guarded/sustained, invuln is not -- clause flatly wrong vs its enforcing line)
WI-2: n/a (RegisterCvar("k_btime") src/world.c:931 = default 0/empty; no default-value claim asserted).

RESULT | ktx:cvar:k_cmd_fp_for | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Lockout duration, 0-30 clamp, 0->5 fallback, command-flood-only scope (distinct from k_fp say-flood) all map to enforcing lines.
### ktx:cvar:k_cmd_fp_for
- "lockout: on cmd-flood trip, commands blocked this many sec" -> src/commands.c:1198-1202 `if (cmd_time && (g_globalvars.time-cmd_time < k_cmd_fp_per)){ ... p->fp_c.locked = g_globalvars.time + k_cmd_fp_for; }` + src/commands.c:1190-1196 `if (g_globalvars.time < p->fp_c.locked){ ... return true; }` -> MATCH
- "clamped to 0-30" -> src/world.c:1433 `k_cmd_fp_for = bound(0, cvar("k_cmd_fp_for"), 30);` -> MATCH
- "0 means default 5 seconds" -> src/world.c:1434 `k_cmd_fp_for = (k_cmd_fp_for ? k_cmd_fp_for : 5);` -> MATCH
- "applies only to command flooding (not say/chat k_fp)" -> read only in src/commands.c:1202 isCmdFlood + src/world.c:1427-1434; say-flood is disjoint src/g_cmd.c:159-171 using k_fp -> MATCH
WI-2: n/a (RegisterCvar("k_cmd_fp_for") src/world.c:997 = default 0; "0 means default 5" = registered 0 + runtime fallback 5, accurate).

RESULT | ktx:cvar:k_cmd_fp_per | C-FIX | flavourC=1 | wi2=0 | clauses=5 | Trip condition WRONG: not "two protected commands within the window" -- it is k_cmd_fp_count (default 10) commands within k_cmd_fp_per via a circular timestamp buffer (cmd_time[MAX_FP_CMDS=10], last_cmd cursor); the threshold/trigger clause is flatly wrong vs its enforcing line. [orchestrator HG2 re-grep independently confirmed progs.h:260-266 + commands.c:1187-1198/1232-1239 + report string 2066]
### ktx:cvar:k_cmd_fp_per
- "time window in seconds, clamped 0-30; 0 falls back to default 4" -> src/world.c:1431-1432 `k_cmd_fp_per = bound(0, cvar("k_cmd_fp_per"), 30); k_cmd_fp_per = (k_cmd_fp_per ? k_cmd_fp_per : 4);` -> MATCH
- "if a player issues TWO protected commands within this many seconds, the SECOND is treated as flooding" -> src/commands.c:1187-1188 `idx=bound(0,p->fp_c.last_cmd,MAX_FP_CMDS-1); cmd_time=p->fp_c.cmd_time[idx];` + src/commands.c:1198 `if (cmd_time && (g_globalvars.time-cmd_time < k_cmd_fp_per))` + src/commands.c:1232-1239 `p->fp_c.cmd_time[idx]=g_globalvars.time; if (++idx >= k_cmd_fp_count) idx=0; p->fp_c.last_cmd=idx;` + include/progs.h:260-266 `#define MAX_FP_CMDS (10) ... float cmd_time[MAX_FP_CMDS]; int last_cmd;` -> MISMATCH(circular buffer; flood fires when the k_cmd_fp_count-th-previous command -- default 10 -- is < k_cmd_fp_per old, i.e. k_cmd_fp_count commands within the window; NOT two. Threshold AND trigger both flatly wrong; report string commands.c:2066 itself says "%d commands allowed per %d sec." with k_cmd_fp_count)
- "locked out for k_cmd_fp_for seconds" -> src/commands.c:1202 `p->fp_c.locked = g_globalvars.time + k_cmd_fp_for;` -> MATCH
- "accrues a warning, eventually kicked unless k_cmd_fp_dontkick set" -> src/commands.c:1204-1227 `if (!k_cmd_fp_dontkick){ ... if ((k_cmd_fp_kick-p->fp_c.warnings)<1){ ... stuffcmd(p,"disconnect\n"); } } p->fp_c.warnings += 1;` -> MATCH
- "reported as 'N commands allowed per <this> sec.'" -> src/commands.c:2066-2069 `G_sprint(self,2,"%s: %d commands allowed per %d sec.,...", redtext("Command floodprot"), k_cmd_fp_count, (int)k_cmd_fp_per, ...)` -> MATCH
WI-2: n/a (RegisterCvar("k_cmd_fp_per") src/world.c:996 = default 0; "0 falls back to 4" = registered 0 + runtime fallback 4, accurate).

## Wave 9 -- canary=k_yawnmode (expect TRACED-CLEAN, over-flag control) -- HG1 PASS (returned TRACED-CLEAN, discriminating), HG2 PASS (k_ctf_rune_bounce call-chain fully re-derived) -- 5 batch rows recorded

RESULT | ktx:cvar:k_ctf_rune_bounce | C-FIX | flavourC=1 | wi2=0 | clauses=5 | Bit-1 (auto-respawn) + default 3 + bit-math correct, but bit-2 "drops on death" is WRONG: the only & 2 site (runes.c:107 DoTossRune) is reachable ONLY from the voluntary `tossrune` command; on-death drops (DropRune->DoDropRune(...,false)) force MOVETYPE_TOSS at runes.c:52 without reading the cvar -- death-drop is cvar-independent, so "drops on death" mislabels the bit. [orchestrator HG2 re-grep independently confirmed runes.c:47/52/107 + call chains DoTossRune<-TossRune<-commands.c:914 / DropRune->DoDropRune(...,false)]
### ktx:cvar:k_ctf_rune_bounce
- "registered default 3" -> src/world.c:956 `RegisterCvarEx("k_ctf_rune_bounce", "3");` -> MATCH
- "Bit 1 (& 1) governs auto-respawn runes; set=bounce, unset=toss" -> src/runes.c:44-47 `if (on_respawn){ ... movetype = (int) cvar("k_ctf_rune_bounce") & 1 ? MOVETYPE_BOUNCE : MOVETYPE_TOSS; }` (DoDropRune on_respawn branch; reached via src/runes.c:242 `DoDropRune(rune, true)` = RuneRespawn timed world respawn) -> MATCH
- "Bit 2 (& 2) governs runes a player manually tosses/drops ON DEATH; set=bounce, unset=toss" -> src/runes.c:107 `item->s.v.movetype = (int) cvar("k_ctf_rune_bounce") & 2 ? MOVETYPE_BOUNCE : MOVETYPE_TOSS;` (in DoTossRune src/runes.c:96, reachable ONLY from TossRune src/runes.c:179 <- `tossrune` command src/commands.c:914) -> MISMATCH(the & 2 path is the VOLUNTARY `tossrune` command, NOT a death drop; on-death drops DropRune src/runes.c:149 -> DoDropRune(...,false) -> src/runes.c:52 `movetype = MOVETYPE_TOSS` with the cvar never read -- death-drop bounce is cvar-independent; "drops on death" mislabels what bit-2 controls)
- "0=neither, 1=only auto-respawned, 2=only player-tossed, 3=both (bits combine)" -> src/runes.c:47 & src/runes.c:107 independent `& 1`/`& 2` tests -> MATCH (bit arithmetic correct; the per-bit human label inherits the bit-2 mislabel)
- "MOVETYPE_BOUNCE vs TOSS (bounce w/ randomized motion vs settle)" -> src/runes.c:60-65 `item->s.v.velocity[*] = i_rnd(-100,100)/400; item->s.v.movetype = movetype;` (respawn path randomized velocity) -> MATCH
WI-2: n/a (registered default "3" matches; no access-class claim).

RESULT | ktx:cvar:k_disallow_kfjump | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Server-side toggle, 0=allowed / any-nonzero=disabled (print "kfjump is disabled" + return before jump), RL-switch/180-turn/fire mechanics all map to enforcing lines. [orchestrator HG2 over-pass probe confirmed commands.c:5010-5025]
### ktx:cvar:k_disallow_kfjump
- "server-side toggle for the kfjump command" -> src/world.c:799 `RegisterCvar("k_disallow_kfjump");` + src/commands.c:5010 `if (cvar("k_disallow_kfjump"))` (read in kfjump()) -> MATCH
- "scripted forward RJ assist: switch RL, turn 180, fire" -> src/commands.c:5022-5025 `self->s.v.impulse = 7; // select switch to rl` ... `self->s.v.v_angle[1] += 180; // turn 180` ... `W_WeaponFrame(); // switch to rl and fire` (impulse 7 = IT_ROCKET_LAUNCHER) -> MATCH
- "0 = kfjump allowed" -> src/commands.c:5010 falsy at 0 -> proceeds; registered default src/world.c:799 RegisterCvar = 0 -> MATCH
- "1 (any non-zero) = kfjump disabled" -> src/commands.c:5010 C-truthiness (any non-zero) -> src/commands.c:5014 `return;` -> MATCH
- "invoking prints 'kfjump is disabled' and performs no jump" -> src/commands.c:5012 `G_sprint(self, 2, "%s is disabled\n", redtext("kfjump"));` then src/commands.c:5014 `return;` (before any impulse/W_WeaponFrame) -> MATCH
WI-2: n/a (registered default 0 = allowed, consistent; no access-class claim).

RESULT | ktx:cvar:k_fbskill_aim_lookanywhere | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Probability roll g_random()<look_anywhere in PredictionShotLogic gated on live match (match_in_progress==2), bound(0,v,1) into the field, skill-derived default overridable by setting the cvar -- all map to enforcing lines.
### ktx:cvar:k_fbskill_aim_lookanywhere
- "Frogbot AI cvar for look-anywhere probability" -> src/bot_botimp.c:16 `#define FB_CVAR_LOOKANYWHERE "k_fbskill_aim_lookanywhere"` + src/bot_botimp.c:114 `RegisterCvar(FB_CVAR_LOOKANYWHERE);` -> MATCH
- "while match in progress, each prediction-shot rolls g_random() against this value" -> src/bot_botpath.c:213 `if ((match_in_progress == 2) && (g_random() < self->fb.skill.look_anywhere))` (match.c:1262 match_in_progress=2 at match start) -> MATCH
- "on success bot looks toward a sight marker from enemy's predicted path" -> src/bot_botpath.c:215-239 `from_marker = g_edicts[self->s.v.enemy].fb.touch_marker; ... look_marker = SightFromMarkerFunction(...)/SightMarker(...)` -> MATCH
- "read back per bot clamped to bound(0, value, 1) into self->fb.skill.look_anywhere" -> src/bot_botimp.c:307 `self->fb.skill.look_anywhere = bound(0, cvar( FB_CVAR_LOOKANYWHERE), 1);` -> MATCH
- "higher values -> more often anticipates" -> src/bot_botpath.c:213 `g_random() < look_anywhere` (uniform roll, monotonic) -> MATCH
- "server normally derives from skill; setting cvar overrides" -> src/bot_botimp.c:160 `cvar_fset(FB_CVAR_LOOKANYWHERE, RangeOverSkill(skill, 0.0f, 1.0f));` (per-skill in setSkillAttributes) then re-read at src/bot_botimp.c:307 -> MATCH
WI-2: n/a (RegisterCvar = default 0; no numeric-default claim; no access-class claim).

RESULT | ktx:cvar:k_freshteams_pack_rockets | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | dmm1-only scope, the bound(0, ammo_rockets, cvar) clamp, both-cvars gate all map to enforcing lines; "shared by RL/GL" aside is a true general-Quake fact. [orchestrator HG2 over-pass probe confirmed items.c:2672/2838 + world.c:1772]
### ktx:cvar:k_freshteams_pack_rockets
- "Fresh Teams (dmm1) only" -> src/world.c:1770-1772 `if (cvar("k_freshteams") && deathmatch != 1) cvar_fset("k_freshteams", 0); // freshteams only in dmm1` -> MATCH
- "max pack rockets when k_freshteams set AND k_freshteams_limit_packs enabled" -> src/items.c:2672 `qbool fresh_packs = (cvar("k_freshteams") && cvar("k_freshteams_limit_packs"));` + src/items.c:2834-2838 `if (fresh_packs) { ... item->s.v.ammo_rockets = bound(0, item->s.v.ammo_rockets, cvar("k_freshteams_pack_rockets")); }` -> MATCH
- "pack rockets clamped 0..value; excess not transferred" -> src/items.c:2821 `item->s.v.ammo_rockets = self->s.v.ammo_rockets;` then src/items.c:2838 `bound(0, ..., cvar("k_freshteams_pack_rockets"))` -> MATCH
- "no effect unless both k_freshteams and k_freshteams_limit_packs set" -> src/items.c:2672 + src/items.c:2834 `if (fresh_packs)` guards -> MATCH
WI-2: n/a (RegisterCvarEx("k_freshteams_pack_rockets","5") src/world.c:900; no numeric-default claim; "shared by RL/GL" is a true general-Quake ammo fact).

RESULT | ktx:cvar:_k_host | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Internal cvar: match-start hostname copy, in-match XML <hostname> emit, non-empty-guarded match-end restore -- all map to enforcing lines with confirming adjacent comments; "logged then reverted" rationale grounded in the save->mutate->restore sequence. [orchestrator HG2 over-pass probe confirmed match.c:1192/302-304]
### ktx:cvar:_k_host
- "Internal-state cvar (not set from config)" -> src/world.c:1032 `RegisterCvar("_k_host"); // internal mod usage` (only write is the programmatic match-start copy) -> MATCH
- "at match start copies hostname cvar into _k_host" -> src/match.c:1192 `cvar_set("_k_host", cvar_string("hostname")); // save host name at match start` (SM_PrepareHostname, match-start sequence) -> MATCH
- "while match in progress saved value emitted into XML extra-log as <hostname>" -> src/logs.c:127-135 `"\t\t<hostname>%s</hostname>\n" ... cleantext(cvar_string("_k_host"))` (StartLogs, called at match start) -> MATCH
- "at match end, if _k_host non-empty, hostname restored from it" -> src/match.c:302-304 `if (!strnull(tmp = cvar_string("_k_host"))) { trap_cvar_set("hostname", tmp); // restore host name at match end }` (EndMatch) -> MATCH
- "used so a temporary in-match hostname change is logged then reverted" -> src/match.c:1192 (save) -> src/match.c:1198/1204/1209 `cvar_set("hostname", va("%s (%.4s vs. %.4s)\207", ...))` (temporary in-match mutation) -> src/match.c:304 (restore) -> MATCH (fact-grounded rationale, not name inference)
WI-2: n/a (RegisterCvar = default empty; no value claim; not a command).

## Wave 10 -- canary=autotrack (expect C-FIX) -- HG1 PASS (returned C-FIX, 4th re-derivation + #if 0 dead-code detail), HG2 PASS (k_midair_minheight double-defect fully re-derived) -- 5 batch rows recorded

RESULT | ktx:cvar:k_ip_list | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Every permission tier maps to its enforcing case in check_perm (0=noone/1=real-adm/2=adm/3-4=judges-denied/5=everyone), iplist gate + own-IP fallback all trace; shipped-cfg value correctly not claimed as default. [orchestrator HG2 over-pass probe confirmed commands.c:1517-1550 + 8078-8082]
### ktx:cvar:k_ip_list
- "permission level required to use iplist (lists players' IPs)" -> src/commands.c:8078 `if (!check_perm(self, cvar("k_ip_list")))` + src/commands.c:8085-8105 player/spec loop `iplist_one(...)` + src/commands.c:8069 `G_sprint(s, 2, "%15.15s %s %-18.18s\n", cl_ip(p), ...)` -> MATCH
- "0 = no one may use it" -> src/commands.c:1517-1519 `case 0: ... return false;` -> MATCH
- "1 = real (password-auth) admin only" -> src/commands.c:1521-1527 `case 1: if (!is_real_adm(p)) { ... return false; } break;` + src/admin.c:10-13 `is_real_adm = (p->k_admin & AF_REAL_ADMIN)` -> MATCH
- "2 = admin only" -> src/commands.c:1529-1535 `case 2: if (!is_adm(p)) { ... return false; } break;` -> MATCH
- "3 and 4 ('judges') not implemented, behave as denied" -> src/commands.c:1537-1540 `case 3: case 4: G_sprint(p, 2, "%s is not implemented in this mode\n", redtext("judges")); return false;` -> MATCH
- "5 = everyone" -> src/commands.c:1542-1543 `case 5: break;` (-> return true at 1550, no access check) -> MATCH
- "lacking the level, iplist prints that player's own IP" -> src/commands.c:8080-8082 `G_sprint(self, 2, "%s %s\n", redtext("Your IP is:"), cl_ip(self)); return;` -> MATCH
WI-2: n/a (RegisterCvar("k_ip_list") src/world.c:992 = default 0; description asserts no default and does NOT claim the shipped `k_ip_list 1` commands.c:4202 as default).

RESULT | ktx:cvar:k_midair_minheight | C-FIX | flavourC=1 | wi2=1 | clauses=6 | Numeric tiers (1=128/2=256/3=512/4=1024/0=64) + below-height-nullifies + k_midair-gate all MATCH, but tier->medal labels "(bronze)/(silver)/(gold)" are WRONG: medal rank derives from a SEPARATE variable `midheight` via strict > 256/512/1024 in MidairDamageBonus, independent of the cvar; 128 is not a medal boundary; no enforcing line maps tier 1/2/3 to bronze/silver/gold. WI-2: registered default is "1" (combat -> 128), so "0 or UNSET = 64" is wrong for the unset case (unset = 128). [orchestrator HG2 re-grep independently confirmed combat.c:662-682 tiers + 374-399 midheight-based medals + world.c:967 default "1"]
### ktx:cvar:k_midair_minheight
- "min airborne height (Quake units, at killing-rocket moment) a target must exceed" -> src/combat.c:576-580 `traceline(...); playerheight = targ->s.v.absmin[2] - g_globalvars.trace_endpos[2] + ...;` (computed in T_Damage path) -> MATCH
- "0 = 64 units" -> src/combat.c:680-682 `else { midair_minheight = 64; }` (value not 1-4 -> 64) -> MATCH (for value 0)
- "1=128, 2=256, 3=512, 4=1024" -> src/combat.c:664-678 `if (k_midair_minheight==1) midair_minheight=128; else if (==2) 256; else if (==3) 512; else if (==4) 1024;` -> MATCH
- "(bronze)/(silver)/(gold) medal labels attached to tiers 1/2/3" -> src/combat.c:374-399 `if (midheight > 1024) rank="platinum"; else if (midheight > 512) rank="gold"; else if (midheight > 256) rank="silver"; else rank="bronze";` -> MISMATCH(medal rank computed from `midheight` (actual frag height) via strict > at 256/512/1024 in MidairDamageBonus, INDEPENDENT of the k_midair_minheight cvar; no enforcing line maps cvar tier 1/2/3 to bronze/silver/gold; 128 is not a medal boundary -- the implied tier->medal correspondence does not exist; flatly wrong clause)
- "below the selected height, rocket damage nullified so no frag" -> src/combat.c:690-693 `if ((playerheight < midair_minheight) && rl_dmg) { take = 0; // no dmg done if target is not high enough }` -> MATCH
- "no effect unless k_midair on" -> src/combat.c:527-529 `if ((int)cvar("k_midair")) { midair = true; }` + src/combat.c:658 `if (midair)` (entire minheight block gated) -> MATCH
WI-2: WRONG default. src/world.c:967 `RegisterCvarEx("k_midair_minheight", "1")` -- registered default is "1" (=> 128 units), NOT 0. "0 or unset = 64" conflates value-0 (correct -> 64) with UNSET (registered default 1 -> 128). The unset/default behaviour is mis-stated. wi2=1 (carried alongside the C-FIX per the enum).

RESULT | ktx:cvar:k_no_wizard_animation | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=3 | Polarity (0=frame advances each think / non-zero=frame held/static) verified against the sole enforcing read in wizard_think. [orchestrator HG2 over-pass probe confirmed spectate.c:78]
### ktx:cvar:k_no_wizard_animation
- "the floating wizard model for spectator camera points" -> src/spectate.c:199-201 `self->wizard->classname = "spectator_wizard"; self->wizard->think = (func_t) wizard_think;` + src/spectate.c:432-446 `setmodel(wizard, "progs/wizard.mdl");` -> MATCH
- "0 = animation frame advances each think tick (animated)" -> src/spectate.c:78-81 `if (!cvar("k_no_wizard_animation")) // animate if allowed { (self->s.v.frame)++; }` + src/spectate.c:88 `nextthink = g_globalvars.time + 0.1;` (cvar 0 -> !0 true -> frame++ each 0.1s) -> MATCH
- "non-zero = frame held, model static" -> src/spectate.c:78-81 (cvar non-zero -> !nonzero false -> frame++ skipped -> held) -> MATCH
WI-2: n/a (RegisterCvar("k_no_wizard_animation") src/world.c:821 = default 0; no default claim).

RESULT | ktx:cvar:k_on_start_f_modified | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Enforcing site requires has_matchtag && cvar; stuffcmd(self,"say f_modified") at match start; registered default "1" EXACTLY matches the asserted "Default 1" (WI-2 clean -- contrast k_midair_minheight). [orchestrator HG2 re-grep independently confirmed world.c:804]
### ktx:cvar:k_on_start_f_modified
- "when set (non-zero) and the match has a matchtag assigned" -> src/match.c:2939 `if (has_matchtag && cvar("k_on_start_f_modified"))` + src/match.c:2753-2754 `char *matchtag = ezinfokey(world, "matchtag"); qbool has_matchtag = matchtag != NULL && matchtag[0];` -> MATCH
- "the player triggering match start is made to issue 'say f_modified'" -> src/match.c:2941 `stuffcmd(self, "say f_modified\n");` (in PlayerReady, self = readying player) -> MATCH
- "broadcasting the f_modified report to chat as the match begins" -> src/match.c:2941 + src/match.c:2954-2957 `G_bprint(2, "Timer started\n"); ... StartTimer();` (immediately before match timer) -> MATCH
- "0 = no automatic f_modified at match start" -> src/match.c:2939 (cvar 0 -> falsy -> skipped) -> MATCH
- "non-zero = sent at match start" -> src/match.c:2939-2942 -> MATCH
- "no effect on matches without a matchtag" -> src/match.c:2939 `if (has_matchtag && cvar(...))` (has_matchtag first conjunct) -> MATCH
- "Default 1" -> src/world.c:804 `RegisterCvarEx("k_on_start_f_modified", "1");` -> MATCH
WI-2: registered default "1" EXACTLY matches the asserted "Default 1" -- no WI-2 defect (validates the subagent's WI-2 precision: flags k_midair's wrong default, clears this correct one).

RESULT | ktx:cvar:k_privategame_force_reconnect | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Polarity, both sub-branches with exact messages, unset=unready-only, cleared-at-map-change all map to private_game_toggle enforcing lines; minor phrasing looseness still-true and traced.
### ktx:cvar:k_privategame_force_reconnect
- "when private-game enabled mid-setup, controls whether unauthed players ejected immediately vs left in place" -> src/vote.c:1559 `if (enable && match_in_progress < 2)` + src/vote.c:1553 `qbool force_reconnect = cvar("k_privategame_force_reconnect");` -> MATCH
- "when set (1), each non-logged-in player acted on" -> src/vote.c:1574-1582 `for (p = world; (p = find_plr(p));) { ... if (force_reconnect && !is_logged_in(p)) {` -> MATCH
- "if unauthed specs allowed -> force-spectated with 'You must login to play.'" -> src/vote.c:1584-1588 `if (allow_spectators) { G_sprint(p, PRINT_HIGH, "You must login to play.\n"); do_force_spec(p, NULL, true); }` -> MATCH
- "otherwise disconnect with 'Please reconnect & login'" -> src/vote.c:1590-1594 `else { G_sprint(p, PRINT_HIGH, "Please reconnect & login\n"); stuffcmd(p, "disconnect\n"); }` -> MATCH
- "when unset (0), only unreadied and left connected" -> src/vote.c:1576-1580 `if (!p->isBot && p->ready && !is_logged_in(p)) { p->ready = 0; G_bprint(...,"%s is no longer ready\n", ...); }` (unconditional; eject block gated on force_reconnect) -> MATCH
- "(cleared at next map change anyway)" -> src/vote.c:1586 `// If this is disabled then they'll essentially get kicked when map changes anyway` -> MATCH
- "0 = do not force-reconnect, 1 = force-reconnect" -> src/vote.c:1582 `if (force_reconnect && !is_logged_in(p))` -> MATCH
WI-2: n/a (RegisterCvarEx("k_privategame_force_reconnect","1") src/world.c:1091 = default 1; description asserts no default value, so no WI-2 defect).

## Wave 11 (final) -- canary=k_teamoverlay (expect C-NEAR-MISS) -- HG1 PASS (returned C-NEAR-MISS, 4th consistent), HG2 PASS (*ml:userinfo C-FIX dataflow fully re-derived) -- 5 batch rows recorded

RESULT | ktx:cvar:k_race_autorecord | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Counted-run (cd_cnt) AND k_race_autorecord gate, !race_match_mode() condition, StartDemoRecord, race_recording=true all map to enforcing lines. [orchestrator HG2 over-pass probe confirmed race.c:718-725]
### ktx:cvar:k_race_autorecord
- "non-zero -> auto-record race runs; 0 -> no auto-record" -> src/race.c:718 `if (race.cd_cnt && cvar("k_race_autorecord"))` -> MATCH
- "begins recording a demo on start of a counted race run" -> src/race.c:722 `StartDemoRecord(); // start demo recording` (race_record() via raceCD branch src/race.c:2516-2518) -> MATCH
- "counted race run (cd_cnt)" -> include/progs.h:1347 `int cd_cnt; // 4 3 2 1 GO!` set src/race.c:2060 `race.cd_cnt = cvar("k_race_countdown");` -> MATCH
- "when not in race match mode" -> src/race.c:720 `if (!race_match_mode())` (src/race.c:5226-5228 `return cvar(RACE_MATCH_CVAR)` = k_race_match) -> MATCH
- "marks the run as being recorded" -> src/race.c:725 `race.race_recording = true;` -> MATCH
WI-2: n/a (RegisterCvarEx("k_race_autorecord","1") src/world.c:915; no "Default X" claim asserted).

RESULT | ktx:cvar:k_race_route_number | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Route-index store, map-match-reload-vs-next, out-of-range->0, -1=custom, rewrite-on-load, LogRaceAttempt web-post all map to enforcing lines.
### ktx:cvar:k_race_route_number
- "stores the race route index (0-based)" -> src/race.c:3357 `if ((next_route < 0) || (next_route >= race.cnt)) next_route = 0;` (bounded; default "0" src/world.c:926) -> MATCH
- "server-side (re)load: k_race_route_mapname matches map -> reload this index" -> src/race.c:3348-3350 `if ((self->ct != ctPlayer) && streq(cvar_string(RACE_ROUTE_MAPNAME_CVAR), mapname)) { next_route = cvar(RACE_ROUTE_NUMBER_CVAR); }` -> MATCH
- "otherwise next route selected" -> src/race.c:3353-3355 `else { next_route++; }` -> MATCH
- "out-of-range -> route 0" -> src/race.c:3357-3360 `if ((next_route < 0) || (next_route >= race.cnt)) { next_route = 0; }` -> MATCH
- "set to -1 to mark a custom (non-stored) route" -> src/race.c:2784 `cvar_fset(RACE_ROUTE_NUMBER_CVAR, -1);` (race_route_now_custom, src/race.c:2781 comment) -> MATCH
- "rewritten to the loaded route index whenever a route is loaded; reported in LogRaceAttempt web-post" -> src/race.c:3391 `cvar_fset(RACE_ROUTE_NUMBER_CVAR, next_route);` + src/race.c:4983-4989 `int route_number = cvar(RACE_ROUTE_NUMBER_CVAR); ... sv_web_post ... LogRaceAttempt ... routeNumber %d` -> MATCH
WI-2: n/a (RegisterCvarEx("k_race_route_number","0") src/world.c:926; no "Default X" claim).

RESULT | ktx:cvar:k_spm_color_rgba | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=7 | Tokenize, RGB color-mod, max(0.0) clamp, optional alpha, >=3-gate (fewer untinted) all MATCH; the parenthetical "1.0 = unmodified" has NO KTX enforcing site -- it is the engine's colormod-ext-field identity convention, forwarded opaquely via trap_SetExtFieldPtr (flavour-C: a true-by-external-convention clause with no enforcing read-site in the oracle). [orchestrator HG2 re-grep independently confirmed items.c:2935-2951 + g_syscalls_extra.c:61-73 opaque forward]
### ktx:cvar:k_spm_color_rgba
- "tint applied to spawn-point marker entities" -> src/items.c:2927-2928 `p->netname = "Spawn Point"; p->classname = "spawnpoint";` + src/items.c:2947 `ExtFieldSetColorMod(p, r, g, b)` -> MATCH
- "space-separated string of floats" -> src/items.c:2935 `trap_CmdTokenize(color_tint);` -> MATCH
- "first three are red, green, blue color-mod components" -> src/items.c:2941-2947 argv 0/1/2 -> r/g/b -> ExtFieldSetColorMod; src/g_syscalls_extra.c:65/73 sets ext-field "colormod" -> MATCH
- "each clamped to a minimum of 0.0" -> src/items.c:2942-2946 `r = max(0.0f, atof(argument));` (g/b likewise) -> MATCH
- "1.0 = unmodified" -> src/g_syscalls_extra.c:61-73 ExtFieldSetColorMod forwards rgb opaquely `trap_SetExtFieldPtr(ed, field_ref_colormod, (void*)&rgb, ...)` -> UNTRACEABLE(no KTX branch/comparison makes "1.0 = identity"; engine colormod-field convention, not enforced in this tree; correct-by-convention + consistent with registered default "1.0 1.0 1.0 1.0" but no enforcing read-site = flavour-C near-miss; minor parenthetical, not a wrong clause -> C-NEAR-MISS not C-FIX)
- "optional fourth is the alpha (transparency)" -> src/items.c:2949-2951 `if (nargs == 4) { ... ExtFieldSetAlpha(p, atof(argument)); }` (alpha bound 0..1 src/g_syscalls_extra.c:17) -> MATCH
- "at least three components required; fewer -> markers untinted" -> src/items.c:2937 `if (nargs >= 3) {` gates the entire colormod+alpha block -> MATCH
WI-2: n/a (RegisterCvarEx("k_spm_color_rgba","1.0 1.0 1.0 1.0") src/world.c:885; no "Default X" claim).

RESULT | ktx:info_key:*ml:userinfo | C-FIX | flavourC=1 | wi2=0 | clauses=3 | Enum table (0-5) correct, but the CORE semantic is WRONG vs the sole enforcing line: *ml is set to the NEW mmode (atoi(to)) at g_cmd.c:1063, NOT the previous/prior one -- the prior value (from/omm) is read only for a mm==omm early-out and never stored; "mmode last" re-selects the just-set mode. "previous/last/prior" is a name (*ml = "mode last") + command-string ("mmode last") inference contradicted by the enforcing assignment. [orchestrator HG2 re-grep independently confirmed g_cmd.c:1048-1063 + g_userinfo.c:287/295 dispatch from=OLD/to=NEW + sole set/read sites]
### ktx:info_key:*ml:userinfo
- "Server-set star userinfo key" -> src/g_cmd.c:1063 `SetUserInfo(p, "*ml", va("%d", mm), SETUSERINFO_STAR);` (sole set-site tree-wide; src/g_userinfo.c:45 is a commented-out table entry) -> MATCH
- "holding the client's PREVIOUS ('last') mmode value; the server records the PRIOR mode here" -> src/g_cmd.c:1048-1063 `info_sys_mm_update(p, from, to){ int mm = atoi(to); int omm = atoi(from); if (mm==omm) ...; SetUserInfo(p,"*ml",va("%d",mm),...); }` dispatched src/g_userinfo.c:287/295 `old = ezinfokey(self,arg_1); (cinfos[i].f)(self, old, arg_2);` (from=OLD *mm, to=NEW *mm) -> MISMATCH(*ml := mm = atoi(to) = the NEW/just-set mmode, NOT the previous; the prior value from/omm is read only for the mm==omm early-out at g_cmd.c:1053 and is NEVER stored -- "mmode last" g_cmd.c:1139-1147 reads *ml and re-selects the just-set mode; the "previous/prior/last" semantic is a name+command-string inference flatly contradicted by the sole enforcing set-site)
- "Value is the MMODE enum 0=none..5=name" -> include/g_consts.h:291-296 `MMODE_NONE(0) MMODE_PLAYER(1) MMODE_TEAM(2) MMODE_MULTI(3) MMODE_RCON(4) MMODE_NAME(5)` + read/restore src/g_cmd.c:1139-1148 `int last = iKey(self,"*ml"); SetUserInfo(self,"*mm",va("%d",last),...); G_sprint(...,"last mmode(%s)\n",mmode_str(last));` -> MATCH (enum mapping correct)
WI-2: n/a (info_key; no default/access-class claim).

RESULT | ktx:info_key:*mm:userinfo | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | Server-set, read-to-dispatch, every MMODE enum value maps to its dispatch case in g_cmd.c:368-404 with verified *mp/*mt/*mu routing targets and the *mu bitmask; rewrite-on-change traced. [orchestrator HG2 over-pass probe confirmed g_cmd.c:368-394 dispatch switch]
### ktx:info_key:*mm:userinfo
- "Server-set star userinfo key" -> src/g_cmd.c:887/982/1147/1178 `SetUserInfo(self, "*mm", va("%d", ...), SETUSERINFO_STAR);` -> MATCH
- "holds current mmode; selects where a typed message/tracking action is routed" -> src/g_cmd.c:368-369 `mmode = iKey(self, "*mm"); switch (mmode)` -> MATCH
- "0 = none" -> include/g_consts.h:291 `#define MMODE_NONE (0)` (no dispatch case -> no special routing) -> MATCH
- "1 = player (route to single player in *mp)" -> src/g_cmd.c:371-374 `case MMODE_PLAYER: if ((goal = SpecPlayer_by_id(iKey(self, "*mp")))) { s_common(self, goal, str); }` -> MATCH
- "2 = team (route to team named in *mt)" -> src/g_cmd.c:382-383 `case MMODE_TEAM: s_t_do(str, ezinfokey(self, "*mt"));` -> MATCH
- "3 = multi (route to player-set bitmask in *mu)" -> src/g_cmd.c:386-387 `case MMODE_MULTI: s_m_do(str, iKey(self, "*mu"));` + src/g_cmd.c:793-797 `bit = 1 << (...); if (!(m & bit)) continue;` -> MATCH
- "4 = rcon" -> src/g_cmd.c:394 `case MMODE_RCON:` (g_consts.h:295 = 4) -> MATCH
- "5 = name" -> src/g_cmd.c:390-391 `case MMODE_NAME: stuffcmd_flags(self, ..., "name \"%s\"\n", str);` (g_consts.h:296 = 5) -> MATCH
- "server reads *mm to dispatch and rewrites it when the mode changes" -> read src/g_cmd.c:368; rewrite src/g_cmd.c:1178 (guarded 1176 `if ((set = (mmode != iKey(self,"*mm") || ...)))`) -> MATCH
WI-2: n/a (info_key; no default/access-class claim).

---

## BATCH 05 -- STAGE-1 LEDGER COMPLETE (11/11 waves; 55 batch rows; 11 canary controls excluded)

Tally (canary controls excluded from N and all counts):

- N = 55 rows classified
- TRACED-CLEAN: 41
- C-NEAR-MISS: 6  (admin, fragsup, lgcmode, pickspawn, uinfo, k_spm_color_rgba)
- C-FIX: 7  (2fav_go, fav_show, k_btime, k_cmd_fp_per, k_ctf_rune_bounce, k_midair_minheight, *ml:userinfo)
- WI2-FIX (classification): 1  (dropring)
- flavour-C-positive (C-NEAR-MISS + C-FIX): 13 / 55 (~23.6%)
- rows carrying a WI-2 note (wi2=1): 2  (dropring [WI2-FIX]; k_midair_minheight [C-FIX + wi2])

Flagged canonical_ids (13 flavour-C-positive + the WI2-FIX row; all route to the B4 operator-gated re-synth queue, NOT touched here per C4):
- C-FIX: ktx:command:2fav_go, ktx:command:fav_show, ktx:cvar:k_btime, ktx:cvar:k_cmd_fp_per, ktx:cvar:k_ctf_rune_bounce, ktx:cvar:k_midair_minheight (+wi2), ktx:info_key:*ml:userinfo
- C-NEAR-MISS: ktx:command:admin, ktx:command:fragsup, ktx:command:lgcmode, ktx:command:pickspawn, ktx:command:uinfo, ktx:cvar:k_spm_color_rgba
- WI2-FIX: ktx:command:dropring (high downstream-visibility -- "Admin" is the lead descriptor word)

Gate record:
- Waves: 11. Canary verdict (HARD GATE 1): 11/11 matched expected on first dispatch; canary-rejected+redispatched: 0.
- Canary rotation: autotrack (W1/4/7/10 -> all C-FIX, independently re-derived incl. #if 0 dead-code), k_teamoverlay (W2/5/8/11 -> all C-NEAR-MISS, sole !isDuel = match.c:1639), k_yawnmode (W3/6/9 -> all TRACED-CLEAN, over-flag control held; not blanket-flagged).
- HARD GATE 2 (orchestrator independent re-grep): every wave -- >=1 flagged wrong-clause + >=1 TRACED-CLEAN load-bearing re-greped; all-clean waves (W2, W6) aggressively over-pass-probed; all held, 0 wave rejections.
- Oracle: /tmp/ktx-src-67253dc9 @ 67253dc9ab4f643f1e6523a923a41caab9ea587f (1.47-2-g67253dc) -- Step-1 HARD GATE, stable all 11 waves.
- C4 honored: read-only; no description / DB / source mutated; no re-synth (B4 is the separate operator-gated step that consumes this ledger).

Methodology note for the orchestrator / future batches: subagents initially cited `src/progs.h` / `src/g_local.h`; the canonical path is `include/`. The Wave-1 learning was folded into every subsequent wave brief (KTX layout: .c in src/, .h in include/) and citations were path-accurate W2-W11. Recommend the canonical V-pass handover template add this one line to Step 3.
