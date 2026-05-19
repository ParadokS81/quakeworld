# KTX D7 V-pass -- batch 01 ledger (BATCH_ID 1, bucket 0)

B3 read-only verification-shaped pass (decisions.md D7 Amendment 2026-05-19,
B1-B5). NOT a re-synth: rows are CLASSIFIED only; no description edited, no DB
write. Authority for the method: enforce-trace-discipline.md.

- Oracle: /tmp/ktx-src-67253dc9 @ 67253dc9 == `1.47-2-g67253dc` (HARD GATE 1, verified byte-identical to synthesis source).
- Population: batch 1 = 63 rows, F-V1 strided partition `((('x'||substr(md5(canonical_id),1,8))::bit(32)::bigint) % 9 + 9) % 9 = 0`. 10 FIX knobs + 3 canary controls excluded from the population per the verified Step-2 SQL.
- Execution: read-only Opus general-purpose sub-agents, ~5 batch rows + 1 blind injected canary per wave. Sub-agent not told which row is the canary.
- F-V2 HARD GATE 1 (canary verdict): a wave whose injected canary verdict != ground truth is REJECTED and re-dispatched; nothing recorded from it. Canary rows are controls -- excluded from N and the flavour-C tally.
- F-V2 HARD GATE 2 (orchestrator re-grep): for every accepted wave the orchestrator independently re-grepped >=1 flagged row's wrong-clause enforcing line AND >=1 TRACED-CLEAN row's load-bearing clause against the oracle. A gate, not a sample.
- Canary ground truth (re-confirmed by orchestrator re-grep this run): autotrack -> C-FIX (commands.c:893 CF_SPECTATOR|CF_MATCHLESS, no CF_MATCHLESS_ONLY; DoCommand 1078/1083 additive-vs-only; no match_in_progress guard). k_teamoverlay -> C-NEAR-MISS ("not in duel" no enforcing line on the team-info stream; only !isDuel() is the match.c settings-summary string). k_yawnmode -> TRACED-CLEAN (every quantitative clause maps to an enforcing line).

## Wave 01 -- canary autotrack expect C-FIX, returned C-FIX (GATE 1 PASS); GATE 2 PASS (re-grep: 20fav_go wrong-clause -- no `20fav_add` cmd name exists, fav_add->self->fav[] 5614 vs xfav_go->self->favx[] 5831 different arrays; clean 4fav_go->fav4_add favx_add(4) commands.c:849/869 confirmed). Canary row autotrack stripped (control).

RESULT | ktx:command:20fav_go | C-FIX | flavourC=1 | wi2=0 | clauses=5 | Track/message clauses trace clean to xfav_go/favx[19], BUT populator clause "assigned ... via 20fav_add/fav_add" is WRONG: no command named 20fav_add exists (correct fav20_add), and fav_add populates the DIFFERENT self->fav[] array (read by fav_next, NOT by 20fav_go/xfav_go which reads self->favx[]).
### ktx:command:20fav_go
- "Spectator command" -> commands.c:885 `{ "20fav_go", DEF(xfav_go), 20, CF_SPECTATOR, CD_20FAV_GO }` + DoCommand commands.c:1091 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) return DO_WRONG_CLASS;` -> MATCH
- "switches your tracked point-of-view to the player stored in personal favourites slot 20" -> commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` + 5856 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p));` -> MATCH (slot 20 -> favx[19] -> track)
- "(assigned beforehand via 20fav_add/fav_add)" -> commands.c:865 `{ "fav20_add", DEF(favx_add), 20, ... }` (ACTUAL slot-20 populator) + 886 `{ "fav_add", fav_add, 0, ... }` -> 5614 `self->fav[(int)fav_num - 1] = diff;` (fav_add writes self->fav[], DIFFERENT array) vs 5831 `pl_num = self->favx[(int)fav_num - 1];` (20fav_go reads self->favx[]) -> MISMATCH(no command literally named "20fav_add" exists; slot-20 populator is `fav20_add` [favN_add form, not Nfav_add]; AND `fav_add` writes self->fav[] [5614], consumed by fav_next [5793], NOT self->favx[] which xfav_go/20fav_go reads at 5831 -- both named populators wrong: one a non-existent name, the other the wrong array)
- "If slot 20 is empty or its stored player is no longer connected, it prints a \"slot 20 is not defined\" / \"can't find player\" notice and does nothing" -> commands.c:5835 `G_sprint(self, 2, "fav go: \220slot %d\221 is not defined\n", (int)fav_num);` (gated 5833 range check) + 5844 `G_sprint(self, 2, "fav go: \220slot %d\221 can't find player\n", (int)fav_num);` (gated 5842 `if (p->ct != ctPlayer)`) -> MATCH (both substrings + early return => no track)
- "if you are already tracking that player it reports \"already observing\". One such command exists per favourites slot (1fav_go..20fav_go)." -> commands.c:5849 `if (PROG_TO_EDICT(self->s.v.goalentity) == p)` -> 5851 `G_sprint(self, 2, "fav go: already observing...\n");` + range commands.c:866-885 -> MATCH
WI-2: n/a -- populator error is a SEMANTIC clause contradicted by the registration table + handler array, counted flavour-C (C-FIX), not WI-2. CF_SPECTATOR-only verified at DoCommand:1091; no default/admin/player claim.

RESULT | ktx:command:3on3 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=12 | Every preset value maps exactly to _3on3_um_init; all four rejection paths located in UserMode; "player / spectating admins / server / param tag" access claim verified against CF_PLAYER|CF_SPC_ADMIN|CF_PARAMS dispatch (additive, correctly described).
### ktx:command:3on3
- "Switches the server to the 3on3 (3v3) game mode: applies a preset" -> commands.c:4539 `{ "3on3", "\225 on \225", _3on3_um_init, UM_3ON3, 3 }` + 4799 `trap_readcmd(um_list[(int)umode].initstring, buf, sizeof(buf));` -> MATCH
- "sets maxclients and k_maxclients to 6" -> commands.c:4305 `"maxclients 6\n"` + 4306 `"k_maxclients 6\n"` -> MATCH
- "timelimit to 15 minutes" -> commands.c:4307 `"timelimit 15\n"				// 15 minute rounds` -> MATCH
- "teamplay 2 (teammates and self take damage)" -> commands.c:4308 `"teamplay 2\n"				// hurt teammates and yourself` -> MATCH
- "deathmatch 1 (weapons do not stay on pickup)" -> commands.c:4309 `"deathmatch 1\n"				// weapons wont stay on pickup` -> MATCH
- "powerups enabled (k_pow 1)" -> commands.c:4310 `"k_pow 1\n"					// use powerups` -> MATCH
- "minimum 2 players per team (k_membercount 2)" -> commands.c:4311 `"k_membercount 2\n"` -> MATCH
- "1-2 teams allowed (k_lockmin 1, k_lockmax 2)" -> commands.c:4312 `"k_lockmin 1\n"` + 4313 `"k_lockmax 2\n"` -> MATCH
- "time-based overtime of 5 minutes (k_overtime 1, k_exttime 5)" -> commands.c:4314 `"k_overtime 1\n"				// time based` + 4315 `"k_exttime 5\n"					// overtime 5mins` -> MATCH
- "Usable by a player, by spectating admins, and by the server" -> commands.c:811 `{ "3on3", DEF(UserMode), 3, CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS, CD_3ON3 }` + DoCommand 1106 player path / 1096 `if ((cmds[icmd].cf_flags & CF_SPC_ADMIN) && !is_adm(self))` (spec must be admin) + UserMode 4714 sv_invoked path + Init_cmds 1448 CF_SPC_ADMIN promotes CF_SPECTATOR -> MATCH
- "players can append a match tag as a parameter" -> commands.c:811 `... | CF_PARAMS ...` + UserMode 4670 `trap_CmdArgs(matchtag, sizeof(matchtag));` -> MATCH
- "rejected on hoonymode-only maps, while k_auto_xonx is set, when not permitted by k_free_mode access control, or when the mode is not enabled by k_allowed_free_modes" -> commands.c:4645 hoony-only return + 4652 `if (cvar("k_auto_xonx"))` return + 4723 `else if (!check_perm(self, k_free_mode))` return + 4730 `if (!(um_list[(int)umode].um_flags & k_allowed_free_modes))` return -> MATCH (all four rejection paths located)
WI-2: access-class "a player, by spectating admins, and by the server" checked vs commands.c:811 CF_PLAYER|CF_SPC_ADMIN|CF_PARAMS + dispatch -- CORRECT (CF_SPC_ADMIN additive "spectator also, only if admin"; prose says "spectating admins"). No default claim.

RESULT | ktx:command:4fav_go | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Slot-4 track cmd; "fav4_add" populator named EXACTLY right (fav4_add->favx_add(4)->favx[3], same array xfav_go reads); 1fav_go..20fav_go range confirmed; "does nothing when already tracking" behaviourally true.
### ktx:command:4fav_go
- "Spectator command" -> commands.c:869 `{ "4fav_go", DEF(xfav_go), 4, CF_SPECTATOR, CD_4FAV_GO }` + DoCommand commands.c:1091 -> MATCH
- "switches your point of view to track the player stored in favorites slot 4" -> commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` + 5856 track -> MATCH (slot 4 -> favx[3])
- "the slot set by fav4_add" -> commands.c:849 `{ "fav4_add", DEF(favx_add), 4, ... }` + 5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH (fav4_add -> favx_add(4) -> favx[3], identical to array 4fav_go reads; populator named exactly correctly)
- "If slot 4 is empty it prints \"fav go: slot 4 is not defined\"" -> commands.c:5835 (gated 5833 range) -> MATCH
- "if the stored player is no longer in the game it prints \"can't find player\"" -> commands.c:5844 (gated 5842 `if (p->ct != ctPlayer)`) -> MATCH
- "if you are already tracking that player it does nothing. There are parallel commands 1fav_go through 20fav_go for slots 1-20." -> commands.c:5849 -> 5851 `return;` + range 866-885 -> MATCH (no track issued -- behaviourally accurate per PROC-1; 1fav_go..20fav_go all registered)
WI-2: n/a -- CF_SPECTATOR only verified at DoCommand:1091; no default/access-class metadata claim.

RESULT | ktx:command:9fav_go | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Spectator slot-9 track cmd; all message strings and slot semantics map to xfav_go reading self->favx[8]; "fav add commands" populator phrasing loosely-but-traceably correct (favN_add).
### ktx:command:9fav_go
- "Spectator command" -> commands.c:874 `{ "9fav_go", DEF(xfav_go), 9, CF_SPECTATOR, CD_9FAV_GO }` + DoCommand 1091 -> MATCH
- "switch to tracking (spectating) the player saved in favourite slot 9" -> commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` + 5856 track -> MATCH (slot 9 -> favx[8])
- "If slot 9 is empty it reports \"fav go: slot 9 is not defined\"" -> commands.c:5835 (gated 5833) -> MATCH
- "if the saved player is no longer in the game it reports \"fav go: slot 9 can't find player\"" -> commands.c:5844 (gated 5842) -> MATCH
- "if you are already tracking that player it reports \"fav go: already observing...\"" -> commands.c:5851 (gated 5849) -> MATCH
- "Favourite slots are populated by the corresponding fav add commands" -> commands.c:854 `{ "fav9_add", DEF(favx_add), 9, ... }` -> 5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH (fav9_add -> favx_add(9) -> favx[8], same array xfav_go reads; "corresponding fav add commands" vague but traceably correct, not a wrong name)
WI-2: n/a -- CF_SPECTATOR only verified at DoCommand:1091; no default/access-class claim.

RESULT | ktx:command:blitz2v2 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=12 | Every numeric/preset clause maps exactly to _2on2hm_um_init; common-reset-first ordering verified at UserMode (common_um_init read before initstring).
### ktx:command:blitz2v2
- "Applies the Blitz 2v2 game-mode preset ... 2-versus-2 ... short hoonymode-style rounds" -> commands.c:4545 `{ "blitz2v2", "Blitz (2v2)", _2on2hm_um_init, UM_1ON1HM, 0 }` + 4799 `trap_readcmd(um_list[(int)umode].initstring, ...);` -> MATCH
- "Sets it to 4 players (maxclients/k_maxclients 4)" -> commands.c:4254 `"maxclients 4\n"` + 4255 `"k_maxclients 4\n"` -> MATCH
- "enables hoonymode (k_hoonymode 1)" -> commands.c:4259 `"k_hoonymode 1\n"` -> MATCH
- "with 4 rounds (k_hoonyrounds 4, two sets of spawns)" -> commands.c:4257 `"k_hoonyrounds 4\n"				// 4 rounds (2 sets of spawns)` -> MATCH (value + adjacent comment)
- "uses a 3-minute round timelimit" -> commands.c:4256 `"timelimit 3\n"				// 3 minute rounds` -> MATCH
- "with fraglimit 0 (time-based rounds)" -> commands.c:4258 `"fraglimit 0\n"				// hoonymode - no fraglimit, time-based` -> MATCH
- "teamplay 2 (teammates and self can be damaged)" -> commands.c:4260 `"teamplay 2\n"				// hurt teammates and yourself` -> MATCH
- "deathmatch 3 (base mode -- weapons stay)" -> commands.c:4261 `"deathmatch 3\n"				// weapons stay` -> MATCH
- "enables powerups" -> commands.c:4264 `"k_pow 1\n"					// use powerups` -> MATCH
- "requires 1 player minimum per team" -> commands.c:4265 `"k_membercount 1\n"` -> MATCH
- "and 1-2 teams" -> commands.c:4266 `"k_lockmin 1\n"` + 4267 `"k_lockmax 2\n"` -> MATCH
- "sets the internal game mode to k_mode 2. The shared common reset runs first." -> commands.c:4268 `"k_mode 2\n"` + ordering 4796 `trap_readcmd(common_um_init, ...)` THEN 4799 mode initstring -> MATCH (common_um_init strictly before mode initstring)
WI-2: n/a -- no default claim; no access-class assertion in prose.

## Wave 03 -- canary k_yawnmode expect TRACED-CLEAN, returned TRACED-CLEAN (GATE 1 PASS); GATE 2 PASS (re-grep: fragsdown wrong-clause -- FragsDown returns at "No fraglimit in hoonymode" 3055 BEFORE AdjustFragLimit(-1) 3075 so the ?2:10 -2 branch unreachable; fav_add/fav_all_del commands.c:886/888 CF_SPECTATOR|CF_MATCHLESS not _ONLY confirms WI-2 misread; clean fpslist "No players present" commands.c:5509). Canary row k_yawnmode stripped (control).

RESULT | ktx:command:fav_add | WI2-FIX | flavourC=0 | wi2=1 | clauses=5 | Core behaviour (tracking-target check, first-free-slot insert, all three error messages) fully traced and correct; "not during a match" is a WI-2 access-class misread of CF_MATCHLESS (additive matchless permission, not a match block).
### ktx:command:fav_add
- "usable only by spectators" -> commands.c:1091 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR))` + 1106 `if (!(cmds[icmd].cf_flags & CF_PLAYER))` (table 886 `CF_SPECTATOR | CF_MATCHLESS`; no CF_PLAYER) -> MATCH (spectator-only correct)
- "not during a match" -> commands.c:1078 `if (k_matchLess && !(cmds[icmd].cf_flags & CF_MATCHLESS)) return DO_CMD_DISALLOWED_MATCHLESS;` (k_matchLess from server cvar k_matchless world.c:1095, NOT live match state) -> MISMATCH(CF_MATCHLESS additive "ALSO valid in matchLess mode"; on a normal match server k_matchLess==0 so gate never fires, no CF_MATCHLESS_ONLY, no match_in_progress guard in DoCommand 1069-1141 or fav_add -- a spectator CAN run fav_add during a live match) -- WI-2 access-class
- "adds the tracked POV target to the favourites list in the first free slot" -> commands.c:5611 `self->fav[(int)fav_num - 1] = diff;` (free slot 5596 `else if (free_num < 0 && !self->fav[fav_num]) { free_num = fav_num; }`, goal 5579) -> MATCH
- "error if the spectator is not tracking a player" -> commands.c:5585 `G_sprint(self, 2, "fav_add: you are %s player!\n", redtext("not tracking"));` (guarded 5583) -> MATCH
- "error if that player is already on the list, or if all slots are full" -> commands.c:5592 already + 5607 `"fav_add: oops, all slots busy? Can't add.\n"` -> MATCH
WI-2: "not during a match" WRONG -- CF_MATCHLESS additive permission interpreted at commands.c:1078, not a match-time restriction; spectator-only half correct. wi2=1, flavourC=0.

RESULT | ktx:command:droppack | WI2-FIX | flavourC=0 | wi2=1 | clauses=5 | Toggle/broadcast/match-refusal/dp-semantics all traced and correct; "Admin toggle" is a WI-2 access-class imprecision -- any player may toggle without admin (CF_PLAYER, no CF_PLR_ADMIN); admin required only for spectators (CF_SPC_ADMIN).
### ktx:command:droppack
- "Admin toggle (on/off) for the dp rule" -> commands.c:743 `{ "droppack", ToggleDropPack, 0, CF_PLAYER | CF_SPC_ADMIN, CD_DROPPACK }` (player path 1106-1115 checks CF_PLAYER then CF_PLR_ADMIN; CF_PLR_ADMIN NOT set; spec path 1096 `if ((cmds[icmd].cf_flags & CF_SPC_ADMIN) && !is_adm(self))`) -> MISMATCH("Admin" overstated: a connected player toggles dp WITHOUT admin; admin required only for spectators) -- WI-2 access-class
- "each invocation flips the rule between enabled and disabled" -> g_utils.c:2210 `i = !cvar(cvarName);` ... 2217 `trap_cvar_set_float(cvarName, (float) i);` (ToggleDropPack -> commands.c:3172 `cvar_toggle_msg(self, "dp", redtext("DropPacks"));`) -> MATCH
- "broadcasts \"<player> enables/disables DropPacks\" to everyone" -> g_utils.c:2213 `G_bprint(2, ...)` (Enables 1834) -> MATCH
- "Refused while a match is in progress (set during warmup)" -> commands.c:3167 `if (match_in_progress) { return; }` -> MATCH
- "when enabled, backpack-on-death active only during an in-progress match; when disabled no backpack dropped" -> items.c:2681 `if ((match_in_progress != 2) || !cvar("dp")) { return; }` -> MATCH
WI-2: "Admin toggle" imprecise -- CF_PLAYER|CF_SPC_ADMIN; any in-game player toggles without admin, admin required only for spectators. wi2=1, flavourC=0.

RESULT | ktx:command:fav_all_del | WI2-FIX | flavourC=0 | wi2=1 | clauses=3 | Clear-all-slots loop and the cleared-vs-already-empty message fully traced and correct; "not during a match" is the same WI-2 CF_MATCHLESS additive-permission misread as in fav_add.
### ktx:command:fav_all_del
- "usable only by spectators" -> commands.c:1091 + 1106 (table 888 `CF_SPECTATOR | CF_MATCHLESS`) -> MATCH (spectator-only correct)
- "not during a match" -> commands.c:1078 `if (k_matchLess && !(cmds[icmd].cf_flags & CF_MATCHLESS)) ...` (no CF_MATCHLESS_ONLY; no match_in_progress guard in DoCommand or fav_all_del 5696-5710) -> MISMATCH(CF_MATCHLESS additive "also valid in matchLess mode"; on a normal match server k_matchLess==0 so dispatchable by a spectator during a live match) -- WI-2 access-class
- "clears the entire favourites list / reports whether it was actually cleared or was already empty" -> commands.c:5703 `if (self->fav[fav_num]) { self->fav[fav_num] = 0; deleted = true; }` + 5709 `G_sprint(self, 2, "Favourites list %sdeleted\n", (deleted ? "" : redtext("already ")));` (loop 5701) -> MATCH
WI-2: "not during a match" WRONG for the same reason as fav_add (CF_MATCHLESS additive, no match block); spectator-only half correct. wi2=1, flavourC=0.

RESULT | ktx:command:fragsdown | C-FIX | flavourC=1 | wi2=0 | clauses=6 | Five clauses (-10, clamp, fl=1->0, 0->0, both-zero rejection, broadcast) verified at enforcing lines; "(or by 2 in any hoonymode)" is WRONG -- FragsDown returns early on isHoonyModeAny() and never reaches the -2 path, contradicting the same description's "no effect in hoonymode".
### ktx:command:fragsdown
- "Lowers the server fraglimit by 10" -> commands.c:3074 `AdjustFragLimit(-1);` -> 3042 `fraglimit += delta * (isHoonyModeAny() ? 2 : 10);` -> MATCH (delta -1, non-hoony factor 10 -> -10)
- "(or by 2 in any hoonymode)" -> commands.c:3053 `else if (isHoonyModeAny()) { G_sprint(self, PRINT_HIGH, "No fraglimit in hoonymode\n"); return; }` -> MISMATCH(FragsDown returns at 3056 before AdjustFragLimit; the `isHoonyModeAny() ? 2 : 10` -2 branch at 3042 is unreachable from fragsdown -- in any hoonymode fragsdown is a no-op; this clause also self-contradicts the row's later "no effect in hoonymode")
- "clamped to the allowed range" -> commands.c:3043 `fraglimit = bound(isHoonyModeAny() ? 0 : 1, fraglimit, isHoonyModeDuel() ? 20 : 100);` -> MATCH
- "fraglimit of 1 drops directly to 0; 0 stays at 0" -> commands.c:3063 `if (fraglimit == 1) { ... fraglimit = 0; }` + 3068 `else if (fraglimit == 0) { ... fraglimit = 0; }` -> MATCH
- "if lowering would leave both fraglimit and timelimit at zero the change is rejected" -> commands.c:3078 `if ((timelimit <= 0) && (fraglimit <= 0)) { ... fraglimit = fl; }` -> MATCH
- "no effect during a match; new fraglimit announced to everyone" -> commands.c:3049 `if (match_in_progress) { return; }` + 3089 `G_bprint(2, ...)` -> MATCH
WI-2: n/a -- fragsdown CF_PLAYER | CF_SPC_ADMIN (736); no access-class/default claim in prose.

RESULT | ktx:command:fpslist | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Per-player cur/max/min/avg derivation, issuer-only output, and the "No players present" empty case all map to verified enforcing lines (min/max FPS-vs-frametime inversion correctly handled).
### ktx:command:fpslist
- "Prints a per-player framerate table to the issuer" -> commands.c:5495 `G_sprint(self, 2, "%13s: %3d \217 %3d \217 %3d \217%5.1f\n", getname(p), ...)` (loop 5483 `for (... p = find_plr(p) ...)`; target self) -> MATCH
- "current, maximum, minimum FPS derived from reported frame times" -> commands.c:5495 `cur = p->fCurrentFrameTime ? (1.0f / p->fCurrentFrameTime) : 0;` / 5496 `max = p->fLowestFrameTime ? (1.0f / p->fLowestFrameTime) : 0;` / 5497 `min = p->fHighestFrameTime ? (1.0f / p->fHighestFrameTime) : 0;` -> MATCH (inversion correctly applied)
- "average frames per second" -> commands.c:5499 `avg = p->fFrameCount ? (p->fAverageFrameTime / p->fFrameCount) : 0;` + 5500 `avg = avg ? (1.0f / avg) : 0;` -> MATCH
- "Reports \"No players present\" when no players are connected" -> commands.c:5509 `if (!i) { G_sprint(self, 2, "No players present\n"); }` -> MATCH
WI-2: n/a -- fpslist CF_BOTH | CF_MATCHLESS (844); no access-class/default claim.

## Wave 04 -- canary autotrack expect C-FIX, returned C-FIX (GATE 1 PASS); GATE 2 PASS (re-grep: canary autotrack wrong-clause commands.c:893/1078/1083 confirmed; clean instagib cycle commands.c:7725/7783/7737 + lockmap maps.c:436/world.c:112 empty-server no-revert confirmed -- all-clean wave double-checked on the 2 highest-surface rows). Canary row autotrack stripped (control).

RESULT | ktx:command:ksound2 | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Every clause maps to TeamSay(2) at commands.c:3377-3395; same-team, KF_KTSOUNDS gate, k_sdir path, team/CTF-only all enforced; no access-class claim made.
### ktx:command:ksound2
- "Sends team audio cue 2 (plays ktsound2.wav)" -> commands.c:3380 `char *sndname = va("ktsound%d.wav", (int)fsndname);` (arg=2 from 771) -> MATCH
- "stuffs a 'play' ... into the console of every other client" -> commands.c:3391 `stuffcmd(p, "play %s%s\n", (strnull(t1) ? "" : va("%s/", t1)), sndname);` -> MATCH
- "every other client" (excludes self) -> commands.c:3384 `if ((p != self) && (isTeam() || isCTF()) && !strnull(p->netname)` -> MATCH
- "on your team" -> commands.c:3387 `if (streq(getteam(self), getteam(p)))` -> MATCH
- "who has KT sounds enabled (the KF_KTSOUNDS bit in their kf userinfo key)" -> commands.c:3385 `&& (iKey(p, "kf") & KF_KTSOUNDS))` (g_consts.h:245 `#define KF_KTSOUNDS (1)`) -> MATCH
- "each recipient's file path honours their own k_sdir sound-directory setting" -> commands.c:3389-3391 `char *t1 = ezinfokey(p, "k_sdir"); stuffcmd(p, "play %s%s\n", (strnull(t1) ? "" : va("%s/", t1)), sndname);` -> MATCH
- "Only active in team or CTF games" -> commands.c:3384 `(isTeam() || isCTF())` -> MATCH
WI-2: n/a -- no default; cmd bare CF_PLAYER (771), prose makes no access-class claim.

RESULT | ktx:command:multi | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Every syntax form (= replace / + add / - remove / ? print / ?? <n> print-by-numeric) and the '*mu' bitmask storage + id-or-name resolution map to enforcing lines in multi_do() g_cmd.c:845-1039.
### ktx:command:multi
- "Edits or prints this client's 'multi' recipient set ... stored as the '*mu' userinfo bitmask" -> g_cmd.c:888 `SetUserInfo(self, "*mu", va("%d", m), SETUSERINFO_STAR);` + 985 same; bit math 949 `bit = 1 << (int)(p - g_edicts - 1);` -> MATCH
- "the custom group of players targeted by multi-message mode" -> g_cmd.c:980-983 `if (from_mmode) ... SetUserInfo(self, "*mm", va("%d", MMODE_MULTI), ...)` -> MATCH
- "'multi = name1 name2 ...' replaces the set" -> g_cmd.c:925 `m = 0;` then MMOP_S loop ORs only named players -> MATCH
- "'multi + ...' adds them" -> g_cmd.c:929-932 `case MMOP_P: ... m = iKey(self, "*mu");` then `m |= bit;` -> MATCH
- "'multi - ...' removes them" -> g_cmd.c:930-958 `case MMOP_M: m = iKey(self, "*mu"); ... m &= ~bit;` -> MATCH
- "'multi ?' prints the current set, and 'multi ?? <n>' prints the set encoded by the numeric value n" -> g_cmd.c:998 `m = (mmop == MMOP_Q ? iKey(self, "*mu") : atoi(arg_2));` then print loop 999-1031 -> MATCH
- "Players are given by client id or name" -> g_cmd.c:943 `if (!(p = SpecPlayer_by_IDorName(arg_x)) || (p == self))` -> MATCH
WI-2: n/a -- no default; cmd CF_BOTH | CF_MATCHLESS | CF_PARAMS (939); description correctly scopes to "this client".

RESULT | ktx:command:killquad | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Toggle+broadcast via cvar_toggle_msg, match_in_progress early-return, and the "Player/spectator-admin" class all verified -- class correct only because Init_cmds promotes CF_SPC_ADMIN to also set CF_SPECTATOR.
### ktx:command:killquad
- "Toggles KillQuad mode by flipping the k_killquad cvar on or off" -> commands.c:3130 `cvar_toggle_msg(self, "k_killquad", redtext("KillQuad"));` (g_utils.c:2210/2218) + 3131 `k_killquad = cvar("k_killquad");` -> MATCH
- "and broadcasting the new state" -> g_utils.c:2214 `G_bprint(2, ...)` -> MATCH
- "Player/spectator-admin command" -> commands.c:738 `{ "killquad", killquad, 0, CF_PLAYER | CF_SPC_ADMIN, ... }`; Init_cmds 1448 `if (cmds[i].cf_flags & CF_SPC_ADMIN) cmds[i].cf_flags |= CF_SPECTATOR;`; player path 1104-1110 (any player) + spec path 1096 (spec needs admin) -> MATCH
- "ignored while a match is in progress" -> commands.c:3125-3128 `if (match_in_progress) { return; }` -> MATCH
WI-2: access-class correct -- "Player/spectator-admin" = any player OR admin-spectator (CF_PLR_ADMIN absent; CF_SPC_ADMIN present; CF_SPECTATOR added by Init_cmds:1448). No default claim.

RESULT | ktx:command:instagib | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=10 | 4-state cycle, dmm4/k_midair gate + refusal string, config execs, mode disables, k_cg_kb force-on, rules-change gate, broadcast, and Player/spectator-admin class all map to enforcing lines in ToggleInstagib() commands.c:7723-7837.
### ktx:command:instagib
- "Cycles ... 0 -> 1 -> 2 -> 3 -> 0" -> commands.c:7725 `int k_instagib = bound(0, cvar("k_instagib"), 3);` + 7782-7785 `if (++k_instagib > 3) { k_instagib = 0; }` + 7787 `cvar_fset("k_instagib", k_instagib);` -> MATCH
- "0 disabled, 1 slow, 2 fast, 3 extreme" -> commands.c:7789/7793/7805/7817 disabled/slow/fast/extreme strings -> MATCH
- "each labelled '... coilgun mode' instead when k_instagib_custom_models is set" -> commands.c:7795/7807/7819 `if (cvar("k_instagib_custom_models")) ... "(slow/fast/extreme coilgun mode)"` -> MATCH (states 1/2/3; state 0 no suffix -- consistent)
- "Requires dmm4 (or k_midair) or refused 'Instagib requires dmm4'" -> commands.c:7735-7739 `if (!cvar("k_midair") && deathmatch != 4) { G_sprint(self, 2, "Instagib requires dmm4\n"); return; }` -> MATCH
- "On each enable execs configs/usermodes/instagib/default.cfg then a map-specific instagib cfg if present" -> commands.c:7742-7752 default.cfg can_exec readcmd + map-specific -> MATCH (runs every invocation; "On each enable" still true)
- "disables midair" -> commands.c:7757-7759 `if (cvar("k_midair")) { cvar_set("k_midair", "0"); }` -> MATCH
- "LGC and ToT modes" -> commands.c:7762 `if (cvar(LGCMODE_VARIABLE)) cvar_set(LGCMODE_VARIABLE, "0");` + 7767 `if (cvar(TOT_MODE_VARIABLE)) cvar_set(TOT_MODE_VARIABLE, "0");` -> MATCH
- "and dmm4 grenade mode" -> commands.c:7772 `if (cvar("k_dmm4_gren_mode")) cvar_set("k_dmm4_gren_mode", "0");` -> MATCH
- "forces coilgun kickback (k_cg_kb) on" -> commands.c:7831-7834 `if (k_instagib) { cvar_set("k_cg_kb", "1"); }` -> MATCH (on enable only -- description scopes "On each enable")
- "Player/spectator-admin command; only applies when a rules change is allowed. Broadcasts the resulting mode." -> commands.c:955 `CF_PLAYER | CF_SPC_ADMIN` ; 7730-7733 `if (!is_rules_change_allowed()) { return; }` ; broadcast 7789+ -> MATCH
WI-2: access-class correct (CF_PLAYER|CF_SPC_ADMIN, Init_cmds:1448 adds CF_SPECTATOR). Default `RegisterCvarEx("k_instagib", "0")` world.c:975 = 0 consistent; no separate "Default X" claim.

RESULT | ktx:command:lockmap | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Toggle, admin-only gate, the two map-effect clauses (block non-admin map vote / suppress empty-server default revert), and the broadcast-vs-private message split all map to enforcing lines (ToggleMapLock admin.c:849, DoSelectMap maps.c:434, CheckDefMap world.c:112).
### ktx:command:lockmap
- "Locks or unlocks the current map (toggle)" -> admin.c:858-876 `tmp = cvar("k_lockmap"); if (tmp) { cvar_fset("k_lockmap", 0); ... return; } cvar_fset("k_lockmap", 1);` -> MATCH
- "While the map is locked, non-admin players cannot change it through map voting (told the map is locked)" -> maps.c:434-439 (DoSelectMap, called by SelectMap 483 / VoteMap 498) `if (cvar("k_lockmap") && !is_adm(self)) { G_sprint(self, 2, "MAP IS LOCKED!\n" ...); return; }` -> MATCH
- "the server will not automatically revert to the default map when it empties" -> world.c:112-118 `if (((player_count == 0) || (player_count == bot_count)) && !cvar("k_lockmap")) { ... changelevel(s1); }` (k_lockmap set => empty-server revert skipped) -> MATCH
- "Issuing when no match in progress broadcasts '<name> locks/unlocks map'" -> admin.c:866 `G_bprint(2, "%s unlocks map\n", self->netname);` / 880 `G_bprint(2, "%s locks map\n", ...)` (guarded `if (!match_in_progress)` 864/878) -> MATCH
- "during a match privately confirms 'Map is locked' / 'Map unlocked' to the admin" -> admin.c:870 `G_sprint(self, 2, "Map unlocked\n");` / 884 `G_sprint(self, 2, "Map is locked\n");` (else of !match_in_progress) -> MATCH
- "Admin only" -> admin.c:853-856 `if (!is_adm(self)) { return; }` + commands.c:756 `CF_BOTH_ADMIN` -> MATCH
WI-2: access-class correct -- CF_BOTH_ADMIN + explicit is_adm guard = admin-only both classes. Default `RegisterCvar("k_lockmap")` world.c:845 bare = 0/unlocked; no "Default X" claim in prose.

## Wave 05 -- canary k_teamoverlay expect C-NEAR-MISS, returned C-NEAR-MISS (GATE 1 PASS); GATE 2 PASS (re-grep: race_set_finish flagged-clause commands.c:1014 CF_PLAYER|CF_SPC_ADMIN no CF_SPECTATOR, DoCommand DO_WRONG_CLASS 1093 before CF_SPC_ADMIN 1096; clean race_show_record_details CF_BOTH commands.c:1011 + "record not found" race.c:3150). Canary row k_teamoverlay stripped (control).

RESULT | ktx:command:powerups_pickup | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Toggle/announce via cvar_toggle_msg, no-multi-pickup policy enforced in items.c, match-in-progress guard all map to enforcing lines; no access-class/default claim made.
### ktx:command:powerups_pickup
- "Toggles the powerup pickup policy (server cvar k_pow_pickup) on or off" -> commands.c:2853 `cvar_toggle_msg(self, "k_pow_pickup", redtext("new powerups pickup (no multi pickup)"));` + g_utils.c:2211/2218 -> MATCH
- "announces the new state as \"new powerups pickup (no multi pickup)\"" -> g_utils.c:2215 `G_bprint(2, ...)` (msg = redtext("new powerups pickup (no multi pickup)")) -> MATCH
- "When enabled, the no-multi-pickup policy is in force" -> items.c:2046 `if (cvar("k_pow_pickup"))` (blocks pickup when same-kind powerup held, 2048-2070; comment 2044) -> MATCH
- "The command has no effect while a match is in progress" -> commands.c:2848 `if (match_in_progress)` -> 2850 `return;` -> MATCH
WI-2: n/a -- world.c:818 `RegisterCvarEx("k_pow_pickup", "0")` = 0; no default claim; CF_PLAYER|CF_SPC_ADMIN|CF_PARAMS, no access-class claim.

RESULT | ktx:command:race | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | k_race toggle, bots-disabled/rules-allowed/FFA-drop preconditions, race-in-progress guard, and apply/revert ruleset all map to enforcing lines.
### ktx:command:race
- "Toggles race game mode on or off by flipping the k_race cvar" -> race.c:269 `cvar_toggle_msg(self, "k_race", redtext("race"));` + 218 `return (cvar("k_race"));` (isRACE) -> MATCH
- "and then applying (or reverting) the hard-coded race ruleset" -> race.c:271 `apply_race_settings();` (349 race_settings readcmd when isRACE; 337 norace_settings when !isRACE) -> MATCH
- "Turning on switches into race config (deathmatch 4, practice/silent-record, single-spawn, no items, etc.)" -> race.c:293-314 `race_settings[] = "sv_silentrecord 1\n" "deathmatch 4\n" "srv_practice_mode 1\n" "lock_practice 1\n" ... "k_spw 1\n" "k_noitems 1\n" ...` -> MATCH
- "turning it off restores the non-race settings" -> race.c:316-321 `norace_settings[]` applied 337 + 341 `execute_rules_reset();` -> MATCH
- "Switching in requires bots disabled first" -> race.c:244 `if (!isRACE() && bots_enabled())` -> 246-248 `"Disable bots first ..."; return;` -> MATCH
- "and a rules change currently allowed, and (when not already FFA) drops into FFA" -> race.c:251 `if (!isRACE() && !is_rules_change_allowed())` -> 253 return; 256-262 `if (!isRACE()) { if (!isFFA()) { UserMode(-6); } }` -> MATCH
- "ignored while a race is in progress with players present" -> race.c:264 `if (CountPlayers() && race_is_started())` -> 266 return; -> MATCH
WI-2: n/a -- world.c:912 `RegisterCvarEx("k_race", "0")` = off; no default claim; CF_PLAYER|CF_SPC_ADMIN no CF_SPECTATOR (specs DO_WRONG_CLASS 1091); no access-class claim.

RESULT | ktx:command:race_ready | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Adds caller to line-up (race_ready=1), spectator and non-race-mode no-effect guards, and match-in-progress refusal with exact string all map to enforcing lines.
### ktx:command:race_ready
- "Marks the calling player as ready to race, adding them to the race line-up" -> race.c:3035 `set_player_race_ready(self, 1);` (2933 `G_bprint(2, "%s %s the line-up\n", e->netname, redtext("joined"));` / 2934 `e->race_ready = 1;`) -> MATCH (arg=1 dispatched DoCommand 1135)
- "Has no effect for spectators" -> race.c:3020 `if (self->ct == ctSpec)` -> 3022 return; (also CF_PLAYER-only, 1091 no CF_SPECTATOR) -> MATCH
- "or outside race mode" -> race.c:3015 `if (!race_command_checks())` -> 3017 return; (2953 `if (!isRACE())`) -> MATCH
- "in race match mode refused once a match round is already running ('Cannot join match in progress')" -> race.c:3028 `if (match_enabled && race.status)` -> 3030 `G_sprint(self, PRINT_HIGH, "Cannot join match in progress\n");` -> MATCH (verbatim)
WI-2: n/a -- command, no default claim; CF_PLAYER, spectator no-effect double-gated; no access-grant claim to contradict.

RESULT | ktx:command:race_show_record_details | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | CF_BOTH (players+specs), numeric slot arg, the 9 printed fields in order, and "record not found" guard all map to enforcing lines; access-class claim correct.
### ktx:command:race_show_record_details
- "Race-mode query command (players and spectators)" -> commands.c:1011 `{ "race_show_record_details", display_record_details, 0, CF_BOTH | CF_PARAMS, ... }` (CF_BOTH = CF_PLAYER|CF_SPECTATOR) + race.c:3143 `if (!race_command_checks())` -> 3145 return; -> MATCH
- "taking one numeric argument: the record slot to inspect" -> race.c:3141 `int record = read_record_param(1);` (2972 `return bound(0, atoi(arg_1) - 1, NUM_BESTSCORES - 1);`) -> MATCH
- "Prints the full detail ... finishing time (seconds), racer name, demo name, distance, max speed, average speed, date, weapon mode, falsestart mode" -> race.c:3160-3170 `"time: %s\n" ... "racer: %s\n" ... "demo: %s\n" ... "distance: %s\n" ... "max speed: %s\n" ... "avg speed: %s\n" ... "date: %s\n" ... "weapon: %s\n" ... "falsestart: %s\n"` -> MATCH (all 9 fields, stated order; time /1000 -> seconds)
- "Prints \"record not found\" if the requested slot holds no valid record" -> race.c:3150 `G_sprint(self, 2, "record not found\n");` (3148 `if (!is_valid_record(...))`) -> MATCH
- "(players and spectators)" -> commands.c:1011 `CF_BOTH | CF_PARAMS` interpreted DoCommand 1091 spec-path (CF_SPECTATOR present via CF_BOTH, no CF_SPC_ADMIN) + 1106 player-path (CF_PLAYER present, no CF_PLR_ADMIN) -> MATCH
WI-2: pass -- "players and spectators" verified vs CF_BOTH + dispatch (no admin flags). No default claim.

RESULT | ktx:command:race_set_finish | WI2-FIX | flavourC=0 | wi2=1 | clauses=6 | Core behaviour (places nodeEnd at caller origin, race-running guard, max-nodes guard, broadcast, custom-route flag) all trace correctly; but the "(player / spectator-admin)" access-class claim is WRONG -- flags lack CF_SPECTATOR so every spectator (admin or not) is rejected DO_WRONG_CLASS before the CF_SPC_ADMIN check; command is player-only in practice.
### ktx:command:race_set_finish
- "Race-mode route editing command (player / spectator-admin)" -> commands.c:1014 `{ "race_set_finish", DEF(r_Xset), 3, CF_PLAYER | CF_SPC_ADMIN, ... }` + race.c:2793 `if (!race_command_checks())` -> 2795 return; (race-mode part MATCH). Access: dispatch 1088 `if (spc)` -> 1091 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR))` -> 1093 `return DO_WRONG_CLASS;` executes for ANY spectator before 1096 `if ((cmds[icmd].cf_flags & CF_SPC_ADMIN) && !is_adm(self))`; no CF_SPECTATOR bit -> spectator-admin path unreachable (also isValidCmdForClass 1308) -> MISMATCH(spectator-admin cannot use this command; player-only -- CF_SPC_ADMIN dead without CF_SPECTATOR) [WI-2 access-class; race-mode sub-clause itself MATCHes]
- "Places the race finish (end) node at the caller's current position on the custom race route" -> race.c:2813 `node.type = (raceRouteNodeType_t) t;` (t=3 = nodeEnd) + 2815 `VectorCopy(self->s.v.origin, node.org);` + 2817 `e = spawn_race_node(&node);` -> MATCH
- "Has no effect if the race is already running" -> race.c:2798 `if (race_is_started())` -> 2800 return; (2966 `if (race.status)`) -> MATCH
- "or if the route already holds the maximum number of nodes" -> race.c:2803 `if (checkpoints_count() >= MAX_ROUTE_NODES)` -> 2805 `"Can't add more checkpoints!\n"; return;` (MAX_ROUTE_NODES progs.h:28 = 20) -> MATCH
- "On success broadcasts the finish-node coordinates" -> race.c:2834 `G_bprint(2, "%s set\n", redtext(name_for_nodeType(node.type)));` + 2835 `G_bprint(2, "Coordinates: %6.1f %6.1f %6.1f\n", ...)` -> MATCH
- "and flags the route as a custom (non-preset) route" -> race.c:2839 `race_route_now_custom();` (2781 `race.active_route = 0;` + 2784 `cvar_fset(RACE_ROUTE_NUMBER_CVAR, -1);`) -> MATCH
WI-2: FAIL (access-class) -- "spectator-admin" claimed but flags CF_PLAYER|CF_SPC_ADMIN omit CF_SPECTATOR; DoCommand returns DO_WRONG_CLASS (1091-1093) for every spectator before the CF_SPC_ADMIN gate; effectively player-only. wi2=1, flavourC=0. No default claim.

<!-- ROUND 1 ACCEPTED: waves 01,03,04,05 = 20 batch rows. Wave 02 REJECTED (canary k_teamoverlay false-negatived TRACED-CLEAN, expected C-NEAR-MISS) -- re-dispatched as 02b under a sharpened anti-rationalization prompt. Tally after Round 1: TRACED-CLEAN 14 | C-NEAR-MISS 0 | C-FIX 2 (20fav_go, fragsdown) | WI2-FIX 4 (fav_add, droppack, fav_all_del, race_set_finish) | flavourC-positive 2/20. -->

## Wave 02b (Round 1 wave 02 re-dispatch, sharpened prompt) -- canary k_teamoverlay expect C-NEAR-MISS, returned C-NEAR-MISS (GATE 1 PASS -- the sharpening fixed the wave-02 false-negative); GATE 2 PASS (re-grep: dmm1/dmm3 flagged enforcing line commands.c:2889 `if (dmm != 4) // if leaving dmm4` -> 2891/2892 force-off confirmed as a generic not-4 gate, not a mode==1/3 test; clean dmgfrags combat.c:945 /100 + commands.c:8119 LGC string). Canary row k_teamoverlay stripped (control). NOTE: dmm1/dmm3 C-NEAR-MISS is a strict-but-defensible SHARPENED application -- the clause is true for mode 1/3 but the enforcing predicate is `dmm != 4` (comment "if leaving dmm4"), so a reader could infer a mode-specific force that does not exist; surfaced for B4/operator adjudication.

RESULT | ktx:command:dmm1 | C-NEAR-MISS | flavourC=1 | wi2=1 | clauses=6 | k_freshteams/k_nosweep "only in dmm1" + mode-1 weapon/item semantics traced and correct; "Switching to mode 1 forces k_midair and k_instagib off" enforced only by the generic `dmm != 4` branch (no line tests mode==1) -- near-miss per SHARPENED; plus WI-2 access-class imprecision (a regular player may run it).
### ktx:command:dmm1
- "switches the server to deathmatch mode 1 (sets the `deathmatch` cvar to 1 and announces the change)" -> commands.c:2885 `deathmatch = bound(1, (int)dmm, 5);` :2887 `cvar_set("deathmatch", va("%d", (int)deathmatch));` :2899 `G_bprint(2, "Deathmatch %s\n", dig3(deathmatch));` -> MATCH (dmm1 arg=1 at commands.c:725)
- "Mode 1 is standard deathmatch: picked-up weapons are removed and respawn on a timer" -> items.c:835 `if ((deathmatch == 2) || (deathmatch == 3) || (deathmatch == 5) || coop) { leave = 1; } else { leave = 0; }` + :1055 `self->model = "";` + :1061 `self->s.v.nextthink = g_globalvars.time + weapon_time;` -> MATCH (mode 1 -> leave=0 -> weapon removed + timer respawn)
- "items respawn normally" -> items.c:812 `int weapon_time = k_freshteams ? cvar("k_freshteams_weapon_time") : 30;` + :1342 `self->s.v.nextthink = g_globalvars.time + 30;` -> MATCH (k_freshteams off in dmm1 -> standard 30s)
- "it is the only mode in which the `k_freshteams` and `k_nosweep` options take effect" -> world.c:1770 `if (cvar("k_freshteams") && deathmatch != 1)` :1772 `cvar_fset("k_freshteams", 0); // freshteams only in dmm1` and :1775/:1777 `cvar_fset("k_nosweep", 0); // nosweep only in dmm1` -> MATCH (both forced 0 unless deathmatch==1; comments confirm)
- "Switching to mode 1 forces `k_midair` ... off" -> commands.c:2889 `if (dmm != 4)` :2891 `cvar_set("k_midair", "0"); // force midair off` -> UNTRACEABLE(no line tests mode==1; forced off by the generic `dmm != 4` branch -- true for dmm1 only as a side-effect of the not-mode-4 gate)
- "Switching to mode 1 forces ... `k_instagib` off" -> commands.c:2889 `if (dmm != 4)` :2892 `cvar_set("k_instagib", "0"); // force instagib off` -> UNTRACEABLE(same generic `dmm != 4` branch, no mode==1 test)
WI-2: dmm1 table entry `CF_PLAYER | CF_SPC_ADMIN` (commands.c:725); dispatch 1106-1116 requires only CF_PLAYER for a player (no CF_PLR_ADMIN) -> a non-admin player CAN run dmm1; "Admin/console command" is overbroad (admin required only for a spectator caller). wi2=1.

RESULT | ktx:command:downspecs | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | All clauses map to enforcing lines in ChangeClientsCount: -1 decrement, lower-bound-1 clamp, match-in-progress refusal, k_allowcountchange permission-level gate (correctly described), broadcast only on actual change. Upper bound max(1,k_maxspectators) -- "1..k_maxspectators" framing accurate (max() degenerate guard, traceable minor vagueness).
### ktx:command:downspecs
- "lowers the spectator slot count: decrements maxspectators by 1 each run" -> commands.c:983 `{ "downspecs", DEF(downplayers), 2, ... }` + :8064 `ChangeClientsCount(type, -1);` + :8035 `sv_max = "maxspectators";` + :8046 `cl_count = bound(1, cvar(sv_max) + value, max(1, cvar(k_max)));` -> MATCH
- "clamped to 1..k_maxspectators" -> commands.c:8046 `bound(1, cvar(sv_max) + value, max(1, cvar(k_max)))` (k_max="k_maxspectators" type 2) -> MATCH (lower 1; upper max(1,k_maxspectators), the max(1,..) degenerate -- accurate characterization)
- "Refused while a match is in progress" -> commands.c:8022 `if (match_in_progress) { return; }` -> MATCH
- "gated by the k_allowcountchange permission level" -> commands.c:8027 `if (!check_perm(self, cvar("k_allowcountchange"))) { return; }` + :1513-1547 check_perm levels -> MATCH (read as a permission LEVEL, exactly as described)
- "when it changes the count it broadcasts the new maxspectators value to everyone" -> commands.c:8048 `if (cvar(sv_max) == cl_count) { return; }` then :8054 `G_bprint(2, "%s set %s to %d\n", ...)` -> MATCH (no-change guard then server-wide G_bprint)
- "(Spectator-slot counterpart of downplayers.)" -> commands.c:981 vs :983 (same DEF(downplayers), arg 1 vs 2) + :8032-8037 -> MATCH
WI-2: n/a -- operative access is runtime check_perm(k_allowcountchange), described accurately; no default claim.

RESULT | ktx:command:dmm3 | C-NEAR-MISS | flavourC=1 | wi2=1 | clauses=5 | Mode-3 weapon-stay and halved 15s ammo respawn traced exactly; "Switching to mode 3 forces k_midair and k_instagib off" enforced only by the generic `dmm != 4` branch (no line tests mode==3) -- near-miss per SHARPENED; plus WI-2 access-class imprecision.
### ktx:command:dmm3
- "switches the server to deathmatch mode 3 (sets `deathmatch` to 3 and announces)" -> commands.c:2885/2887/2899 (dmm3 arg=3 at commands.c:727) -> MATCH
- "In mode 3 picked-up weapons stay on the ground" -> items.c:835 `if ((deathmatch == 2) || (deathmatch == 3) || ...) { leave = 1; }` + :1047 `if (leave) { ItemTaken(self, other); return; }` -> MATCH (deathmatch==3 -> leave=1 -> weapon not removed)
- "ammo respawn time is halved (15 seconds instead of 30)" -> items.c:1342 `self->s.v.nextthink = g_globalvars.time + 30;` then :1347 `if ((deathmatch == 3) || (deathmatch == 5))` :1349 `... + 15;` (comment :1345 "halve the time ammo respawns") -> MATCH (30 overwritten with 15 for dmm3)
- "Switching to mode 3 forces `k_midair` ... off" -> commands.c:2889 `if (dmm != 4)` :2891 -> UNTRACEABLE(generic `dmm != 4`, no mode==3 test)
- "Switching to mode 3 forces ... `k_instagib` off" -> commands.c:2889 `if (dmm != 4)` :2892 -> UNTRACEABLE(same)
WI-2: dmm3 table entry `CF_PLAYER | CF_SPC_ADMIN` (commands.c:727); dispatch 1106-1116 -> a non-admin player CAN run dmm3; "Admin/console command" overbroad. wi2=1.

RESULT | ktx:command:demomark | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Every clause maps to an enforcing line in DemoMark: match_in_progress>1 gate (exact negation of <=1), match-relative timestamp, caller name, 5s debounce, fixed cap 10 (demo_markers_count=10), "Demo markers full!", MM:SS success print. //demomark stuffcmd is the MVD marker wire signal.
### ktx:command:demomark
- "Places a named, timestamped marker into the server-side MVD demo recording" -> commands.c:303 `stuffcmd(self, "//demomark\n");` + :320-323 record time/name/index -> MATCH
- "only recorded while a match is actually in progress (match_in_progress > 1)" -> commands.c:305 `if (match_in_progress <= 1) { return; }` -> MATCH (exact negation)
- "timestamped relative to match start" -> commands.c:318 `int total = (int)(g_globalvars.time - match_start_time);` -> MATCH
- "labelled with the caller's name" -> commands.c:321 `strlcpy(demo_markers[demo_marker_index].markername, getname(self), ...);` -> MATCH
- "debounced so a second marker within 5 seconds of the previous is ignored" -> commands.c:311 `if ((demo_marker_index > 0) && ((g_globalvars.time - demo_markers[demo_marker_index - 1].time) < 5)) { return; }` -> MATCH
- "capped at a fixed maximum number of markers" -> commands.c:292 `demo_marker_t demo_markers[10];` :293 `int demo_markers_count = 10;` + :316 `if (demo_marker_index < demo_markers_count)` -> MATCH (fixed 10)
- "the caller is told 'Demo markers full!' once the cap is reached" -> commands.c:327 `else { G_sprint(self, 2, "Demo markers full!\n"); }` -> MATCH
- "shown the marker's MM:SS match time on success" -> commands.c:325 `G_sprint(self, 2, "Added demo marker: \220%d:%02d\221\n", (total / 60), (total % 60));` -> MATCH
WI-2: n/a -- CF_BOTH (commands.c:1043); no access-class/default claim.

RESULT | ktx:command:dmgfrags | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Toggle, rules-change rejection, LGC-mode refusal traced in dmgfrags(); the 100-damage-per-frag accumulator, telefrag/teledeath exclusion, kill-frags-suppressed-while-active map to enforcing lines in combat.c/client.c. "roughly"/"per 100" matches the integer /100 carry accumulator.
### ktx:command:dmgfrags
- "Toggles damage-based scoring (the k_dmgfrags cvar)" -> commands.c:8124 `cvar_toggle_msg(self, "k_dmgfrags", redtext("damage frags"));` + g_utils.c:2211 `i = !cvar(cvarName);` -> MATCH
- "players awarded score from damage dealt ... roughly one 'frag' per 100 points" -> combat.c:944 `attacker->ps.dmg_frags += dmg_dealt;` :945 `dmg_frags = attacker->ps.dmg_frags / 100; // 1 frag = 100 damage` :946-947 add+carry (guarded :936 `if ((match_in_progress == 2) && ((int)cvar("k_dmgfrags") || lgc_enabled()))`) -> MATCH
- "telefrag/teledeath damage is excluded" -> combat.c:772 `if (cvar("k_dmgfrags"))` :774 `if (TELEDEATH(targ))` :777 `dmg_dealt = 0;` -> MATCH
- "ordinary kill-frags not added while active" -> client.c:5414 `if (!cvar("k_dmgfrags") && !cvar("k_midair") && !lgc_enabled())` :5417 `attacker->s.v.frags += 1;` -> MATCH
- "rejected when a rules change is not currently allowed" -> commands.c:8112 `if (!is_rules_change_allowed()) { return; }` -> MATCH
- "refused in LGC mode ('Dmgfrags is not allowed in LGC mode')" -> commands.c:8117 `if (k_lgc)` :8119 `G_sprint(self, 2, "Dmgfrags is not allowed in LGC mode\n");` :8121 `return;` -> MATCH (verbatim)
WI-2: n/a -- CF_PLAYER|CF_SPC_ADMIN (985) but description asserts no access class; RegisterCvar default 0 not claimed.

## Wave 06 -- canary k_yawnmode expect TRACED-CLEAN, returned TRACED-CLEAN (GATE 1 PASS -- clean control held, no over-flag); GATE 2 PASS (re-grep: rpickup flagged -- RandomPickup commands.c match_in_progress branch returns SILENTLY with no G_sprint, unlike the captains/coaches/<4 branches which each print; clean control = the k_yawnmode canary correctly returned TRACED-CLEAN). Canary row k_yawnmode stripped (control).

RESULT | ktx:command:tossflag | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=3 | TossFlag->PlayerDropFlag(self,true)->DropFlag(tossed): origin set to player origin, forward*300+up*200 velocity, early return if not carrying flag -- all three clauses enforced.
### ktx:command:tossflag
- "the flag is dropped at the player's position" -> ctf.c:526 `setorigin(flag, PASSVEC3(p->s.v.origin)); flag->s.v.origin[2] -= 24;` -> MATCH
- "given a forward-and-upward toss velocity so it travels ahead of the player" -> ctf.c:536 `flag->s.v.velocity[0] = g_globalvars.v_forward[0] * 300 + g_globalvars.v_up[0] * 200;` (tossed branch) -> MATCH
- "Does nothing if the caller is not carrying a flag" -> ctf.c:497 `if (!(player->ctf_flag & CTF_FLAG)) { return; }` (PlayerDropFlag) -> MATCH
WI-2: n/a -- CF_PLAYER|CF_MATCHLESS (commands.c:915); no access-class/default claim.

RESULT | ktx:command:slowready | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | slowready->PlayerReady(false) vs ready->PlayerReady(true); sole code difference is the `if(startIdlebot) IdlebotCheck()` block; CF_BOTH|CF_MATCHLESS = players+specs+matchless; running/practice/over guards present.
### ktx:command:slowready
- "exactly like the ready command, except it does not trigger the idle-bot check" -> match.c:2962 `PlayerReady(false);` (PlayerSlowReady) vs match.c:2967 `PlayerReady(true);` (ready) -> MATCH (identical path; bool named startIdlebot)
- "the idle-bot check that ready performs when not all players are ready yet" -> match.c:2922 `if (nready != k_attendees) { ... if (startIdlebot) { IdlebotCheck(); } return; }` -> MATCH (IdlebotCheck only when nready!=k_attendees AND startIdlebot)
- "Usable by players and spectators" -> commands.c:708 `CF_BOTH | CF_MATCHLESS` + g_local.h:649 `CF_BOTH = CF_PLAYER|CF_SPECTATOR` + dispatch 1088/1106 (no CF_SPC_ADMIN) -> MATCH
- "and outside an active match" -> g_local.h:653 `CF_MATCHLESS (1<<4)` + dispatch 1078 -> MATCH
- "Has no effect during a running match, in practice mode, or once a match is over" -> match.c:2789 `if (intermission_running || (match_in_progress == 2) || match_over) { return; }` + :2794 `if (k_practice && !isRACE()) { ...; return; }` -> MATCH
WI-2: n/a -- CF_BOTH|CF_MATCHLESS verified vs dispatch; no default claim.

RESULT | ktx:command:scores | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=9 | PrintScores: every state string, SD/overtime, frags-left, mm:ss timer, 2-team & 3-team blocks, isCA->CA_PrintScores, all via G_sprint(self,...), no arg read -- each clause pinned.
### ktx:command:scores
- "Intermission ... when not in active play" -> commands.c:3402 `if (intermission_running) { G_sprint(self, 2, "Intermission\n"); return; }` -> MATCH
- "no game - no scores" -> commands.c:3408 `if (!match_in_progress) { G_sprint(self, 2, "no game - no scores\n"); return; }` -> MATCH
- "Countdown" -> commands.c:3415 `if (match_in_progress == 1) { G_sprint(self, 2, "Countdown\n"); return; }` -> MATCH
- "prints sudden-death/overtime status if active" -> commands.c:3421 `if (k_sudden_death) { G_sprint(self, 2, "%s %s\n", SD_type_str(), redtext("overtime in progress")); }` -> MATCH
- "otherwise frags remaining until the fraglimit" -> commands.c:3429 `if (fraglimit && (p = get_ed_scores1())) { int diff = fraglimit - p->s.v.frags; ... }` -> MATCH
- "then the time remaining (mm:ss)" -> commands.c:3452 `G_sprint(self, 2, "\220%s:%s\221 remaining\n", dig3s("%02d", minutes), dig3s("%02d", seconds));` -> MATCH
- "the team or player scores (2- and 3-team usermodes)" -> commands.c:3471 2-team path (non um2on2on2..4on4on4) + 3-team branch :3486+ -> MATCH
- "(clan-arena mode prints the CA-specific scoreboard)" -> commands.c:3462 `if (isCA()) { CA_PrintScores(); }` -> MATCH
- "Takes no arguments; affects only the caller's console" -> commands.c:703 `CF_BOTH | CF_MATCHLESS` (no CF_PARAMS) + every emit `G_sprint(self, 2, ...)` -> MATCH
WI-2: n/a -- no default/access-class claim (recipient statement verified via G_sprint(self,...)).

RESULT | ktx:command:rpickup | C-FIX | flavourC=1 | wi2=0 | clauses=5 | "rejected (with a message) if a match is in progress" is WRONG: RandomPickup's `if (match_in_progress) { return; }` at commands.c:5518 is SILENT (no G_sprint), unlike the captains/coaches/<4-players rejections which DO print -- the "with a message" qualifier is contradicted for the match-in-progress branch.
### ktx:command:rpickup
- "Toggles the calling player's vote for a random-team pickup" -> commands.c:5545 `self->v.rpickup = !self->v.rpickup;` -> MATCH
- "when enough players vote, teams are shuffled randomly" -> vote.c:792 `if (veto || !get_votes_req(OV_RPICKUP, true)) { ... pl_idx = bound(0, (int)(frnd * pl_cnt), pl_cnt - 1); ... p->k_teamnumber = tn; }` (called commands.c:5556) -> MATCH
- "The vote is rejected (with a message) if a match is in progress" -> commands.c:5518 `if (match_in_progress) { return; }` -> MISMATCH(this branch returns SILENTLY, no G_sprint/G_bprint; "(with a message)" is asserted for all three conditions but the match-in-progress rejection produces no message -- only captains/coaches/<4 print)
- "captain or coach picking is active" -> commands.c:5524 `if (k_captains) { G_sprint(self, 2, "No random pickup when captain stuffing\n"); return; }` + :5531 `if (k_coaches) { G_sprint(self, 2, "No random pickup when coach stuffing\n"); return; }` -> MATCH (these DO reject with a message)
- "or fewer than 4 players are present" -> commands.c:5538 `if (CountPlayers() < 4) { G_sprint(self, 2, "You need at least 4 players to do this.\n"); return; }` -> MATCH
- "Casting and withdrawing the vote is broadcast ... along with the number of additional votes still required" -> commands.c:5547 `G_bprint(2, "%s %s!%s\n", self->netname, (self->v.rpickup ? redtext("votes for rpickup") : redtext(...)), ((votes = get_votes_req(OV_RPICKUP, true)) ? va(" (%d)", votes) : ""));` -> MATCH
WI-2: n/a -- CF_PLAYER|CF_SPC_ADMIN (807); defect is a flavour-C clause mismatch, not metadata.

RESULT | ktx:command:skill:frogbot:std | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | FrogbotsSetSkill: bots_enabled gate, bound(0,20), argc<=2 reports current, sets FB_CVAR_SKILL read at bot-add time -> "applied to bots added afterward" -- every clause pinned.
### ktx:command:skill:frogbot:std
- "Sets the frogbot skill level applied to bots added afterward" -> bot_commands.c:486 `cvar_fset(FB_CVAR_SKILL, new_skill);` + :270/275 FrogbotsAddbot bound + :2790 `FrogbotsAddbot(FrogbotSkillLevel(), "", false);` + :115 `return (int)cvar(FB_CVAR_SKILL);` -> MATCH (each later-added bot reads it at add time; no loop mutates existing bots)
- "Takes one integer argument clamped to 0-20" -> bot_commands.c:481 `new_skill = bound(MIN_FROGBOT_SKILL, atoi(argument), MAX_FROGBOT_SKILL);` + fb_globals.h:379-380 `MIN=0 MAX=20` -> MATCH
- "With no argument it reports the current bot skill" -> bot_commands.c:467 `if (trap_CmdArgc() <= 2) { ... "bot skill is currently \"%d\"\n", FrogbotSkillLevel() }` -> MATCH
- "Requires bots to be enabled on the server" -> bot_commands.c:461 `if (!bots_enabled()) { G_sprint(self, 2, "Bots are disabled by the server.\n"); return; }` -> MATCH
WI-2: n/a -- no default claim (FB_CVAR_SKILL default "10" world.c:1059 not asserted); no access-class claim.

## Wave 07 -- canary autotrack expect C-FIX, returned C-FIX (GATE 1 PASS); GATE 2 PASS (re-grep: upspecs flagged commands.c:982 CF_PLAYER|CF_SPC_ADMIN no CF_SPECTATOR -- same dead-CF_SPC_ADMIN structure as race_set_finish [Round 1 GATE 2 confirmed DoCommand DO_WRONG_CLASS 1093 before CF_SPC_ADMIN 1096]; clean voteprivate commands.c:1060 CF_PLAYER only). Canary row autotrack stripped (control).

RESULT | ktx:command:voteprivate | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Every clause (voteable gate, match-in-progress report-only, login req, 2-non-bot-player req, threshold toggle gating sv_login via allow_specs, admin instant veto, remaining-count broadcast, CF_PLAYER player-only) maps to a verified enforcing line.
### ktx:command:voteprivate
- "Casts (or withdraws) the calling player's vote to toggle private-game mode" -> vote.c:1535 `self->v.privategame = !self->v.privategame;` -> MATCH
- "broadcasting the vote and the remaining count needed" -> vote.c:1545 `((votes = get_votes_req(OV_PRIVATE, true)) ? va(" (%d)", votes) : ""));` (G_bprint 1537) -> MATCH
- "Available only when the server marks private game as voteable" -> vote.c:1502 `if (!private_game_voteable())` -> MATCH (1612 returns cvar("k_privategame_voteable"))
- "refused while a match is in progress (reports current state instead)" -> vote.c:1509 `if (match_in_progress)` :1511 prints state, returns -> MATCH
- "a non-admin must be logged in to vote it on" -> vote.c:1516 `if (!enabled && !is_logged_in(self))` -> MATCH
- "needs at least two non-bot players present" -> vote.c:1527 `if (!enabled && CountPlayers() - CountBots() < 2)` (under `if (!is_adm(self))` 1524) -> MATCH
- "When threshold met enables/disables (gating connections via sv_login per k_privategame_allow_specs)" -> vote.c:1554 `int private_login = allow_spectators ? 1 : 2;` :1556-1557 `cvar_fset("k_privategame", ...); cvar_fset("sv_login", enable ? private_login : 0)` (threshold `!get_votes_req(OV_PRIVATE, true)` 1469) -> MATCH
- "An admin's single vote can switch it directly" -> vote.c:1469 `if (veto || !get_votes_req(OV_PRIVATE, true))` (veto = is_admins_vote 1467) -> MATCH
- "Player-only command, no arguments" -> commands.c:1060 `{ "voteprivate", private_game_vote, 0, CF_PLAYER, CD_PRIVATEGAME }` -> MATCH (CF_PLAYER only; no CF_PARAMS)
WI-2: n/a -- "Player-only" verified vs CF_PLAYER + dispatch; no default claim.

RESULT | ktx:command:weapon:frogbot:std | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | std_commands "weapon" -> FrogbotsSetWeapon: all-bots cvar FB_CVAR_WEAPON, 1-8 / "random"/0, bound(1,8) clamp, no-arg usage+current, bots-disabled refusal all map to verified enforcing lines.
### ktx:command:weapon:frogbot:std
- "Frogbot sub-command (under botcmd/frogbot, standard non-editor command set)" -> bot_commands.c:2325 `{ "weapon", FrogbotsSetWeapon, ... }` (std_commands[]; selected when !FB_OPTION_EDITOR_MODE :2386; top-level botcmd commands.c:1047) -> MATCH
- "sets which weapon all bots should use" -> bot_commands.c:2212 `cvar_fset(FB_CVAR_WEAPON, new_weapon);` (FrogbotWeapon() :125 read for all bots bot_botweap.c:958) -> MATCH
- "argument is a weapon number 1-8, or \"random\"/0 to let bots choose" -> bot_commands.c:2206 `new_weapon = strcmp(argument, "0")==0 || strcmp(argument,"random")==0 ? 0 : bound(1, atoi(argument), 8);` -> MATCH
- "out-of-range numbers clamped into 1-8" -> bot_commands.c:2208 `: bound(1, atoi(argument), 8);` -> MATCH
- "no argument -> prints usage and currently selected weapon" -> bot_commands.c:2193 `if (trap_CmdArgc() <= 2)` :2195-2197 -> MATCH
- "Refuses with a message if bots are disabled" -> bot_commands.c:2187 `if (!bots_enabled()) { G_sprint(self, 2, "Bots are disabled by the server.\n"); return; }` -> MATCH
WI-2: n/a -- no default/access-class claim (FB_CVAR_WEAPON default "2" world.c:1064 not asserted).

RESULT | ktx:command:upspecs | WI2-FIX | flavourC=0 | wi2=1 | clauses=8 | All core-behaviour clauses (+1 maxspectators, k_maxspectators cap, match refusal, k_allowcountchange perm, "maxspectators reached", broadcast, no-op-if-equal) TRACED-CLEAN; access-class clause "spectator-admin" WRONG -- flags CF_PLAYER|CF_SPC_ADMIN with NO CF_SPECTATOR so DoCommand rejects every spectator (incl. admin) before the CF_SPC_ADMIN check; CF_SPC_ADMIN dead for this command.
### ktx:command:upspecs
- "Raises maxspectators by one" -> commands.c:8045 `cl_count = bound(1, cvar(sv_max) + value, max(1, cvar(k_max)));` (upspecs arg=2 -> upplayers(2) -> ChangeClientsCount(2,1) :8059; type==2 sv_max="maxspectators" :8035; value=1) -> MATCH
- "up to the configured cap k_maxspectators" -> commands.c:8036 `k_max = "k_maxspectators";` (upper bound max(1,cvar(k_max))) -> MATCH
- "Refused while a match is in progress" -> commands.c:8021 `if (match_in_progress) { return; }` -> MATCH
- "when the caller lacks the k_allowcountchange permission" -> commands.c:8027 `if (!check_perm(self, cvar("k_allowcountchange"))) { return; }` -> MATCH
- "or when maxspectators already reached k_maxspectators ('maxspectators reached')" -> commands.c:8038 `if ((cvar(sv_max) >= cvar(k_max)) && (value > 0)) { G_sprint(self, 2, "%s reached\n", redtext(sv_max)); return; }` -> MATCH
- "broadcasts that the caller set maxspectators to the new value" -> commands.c:8051 `G_bprint(2, "%s set %s to %d\n", self->netname, redtext(sv_max), cl_count);` -> MATCH
- "No effect if the new value would equal the current one" -> commands.c:8047 `if (cvar(sv_max) == cl_count) { return; }` -> MATCH
- "Player/spectator-admin command, no arguments" -> commands.c:982 `{ "upspecs", DEF(upplayers), 2, CF_PLAYER | CF_SPC_ADMIN, CD_UPSPECS }` -> MISMATCH(no CF_SPECTATOR bit; DoCommand spec branch 1091 `if (!(cf_flags & CF_SPECTATOR)) return DO_WRONG_CLASS;` rejects ALL spectators (incl. admin) before the CF_SPC_ADMIN check 1096 -> CF_SPC_ADMIN dead; isValidCmdForClass 1308 likewise denies specs. "no arguments" MATCH (no CF_PARAMS). "Player" half defensible (CF_PLAYER, no CF_PLR_ADMIN). Net: spectator-admin can never use this command -- WI-2 access-class)
WI-2: FINDING -- "spectator-admin" incorrect; correct class is player-only (admin-gated at runtime via k_allowcountchange, not via CF_*_ADMIN). flavourC=0, wi2=1.

RESULT | ktx:command:whonot | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | PlayerStatusN: ready-skip filter, per-not-ready-player line, ready/admin/team-tag/name fields via OnePlayerStatus, "All players ready" equality short-circuit, "Game in progress" early-return-no-list all map to verified enforcing lines.
### ktx:command:whonot
- "Prints only the players who are NOT marked ready" -> commands.c:2453 `if (p->ready) { continue; }` -> MATCH
- "one line per not-ready player" -> commands.c:2459 `G_sprint(self, 2, "%s\n", OnePlayerStatus(p, self));` -> MATCH
- "showing a ready marker" -> commands.c:2366 `(p->ready ? "\206" : "\207")` -> MATCH
- "admin marker" -> commands.c:2366 `(is_adm(p) ? "\xC1" : " ")` -> MATCH
- "team tag (in team modes)" -> commands.c:2362 `char *team_str = (isTeam() ? va(" \220%4.4s\221", getteam(p)) : "");` -> MATCH
- "and name" -> commands.c:2367 `getname(p), ...` -> MATCH
- "Prints \"All players ready\" if everyone is ready" -> commands.c:2435 `if (CountRPlayers() == CountPlayers()) { G_sprint(self, 2, "All players ready\n"); return; }` -> MATCH
- "\"Game in progress\" (no list) while a match is running" -> commands.c:2429 `if (match_in_progress) { G_sprint(self, 2, "Game in progress\n"); return; }` -> MATCH
WI-2: n/a -- CF_BOTH (commands.c:714) not asserted in prose; no default claim.

RESULT | ktx:command:tpmsg | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=3 | TeamplayMessage: argc==2 + TeamplayMessageByName name match sends the predefined message from messages[]; fall-through (no arg / unrecognized) prints the full Usage list of every cmdname+description -- all map to verified enforcing lines.
### ktx:command:tpmsg
- "Sends a predefined teamplay status message" -> teamplay.c:1678 `messages[i].function(client);` (fixed messages[] table teamplay.c:1645-1668) -> MATCH
- "Called with one argument naming a message, it sends that teamplay message" -> teamplay.c:1692 `if (trap_CmdArgc() == 2) { ... trap_CmdArgv(1, argument, ...); if (TeamplayMessageByName(self, argument)) { return; } }` (match `streq(messages[i].cmdname, message)` 1676) -> MATCH
- "no argument or unrecognized name -> prints usage list of every message name and description" -> teamplay.c:1713 loop over messages[] printing cmdname+description (reached when argc!=2 OR TeamplayMessageByName false) -> MATCH
WI-2: n/a -- CF_PLAYER|CF_PARAMS|CF_MATCHLESS (commands.c:1052) not asserted in prose; no default claim.

## Wave 08 -- canary k_teamoverlay expect C-NEAR-MISS, returned C-NEAR-MISS (GATE 1 PASS -- sharpened prompt held); GATE 2 PASS (re-grep: k_allow_vwep flagged world.c:355 `// vw_available = checkextension("ZQ_VWEP");` commented out + :356 `vw_available = 1;` only assignment -> no runtime ZQ_VWEP test; clean k_bloodfest world.c:971 `RegisterCvarEx("k_bloodfest","0")` default 0). Canary row k_teamoverlay stripped (control). NOTE: k_bloodfest RESULT line had a `flavourC=1=0` transcription typo from the subagent; normalized to flavourC=0 per its TRACED-CLEAN classification + "on a real data path" rationale.

RESULT | ktx:cvar:k_allowed_free_modes | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Every bit value, the load-once capture, the usermode-discard gate, and the matchless FFA force-enable each map to a verified enforcing line.
### ktx:cvar:k_allowed_free_modes
- "Bitmask of which server game modes players are permitted to switch into" -> commands.c:4730 `if (!(um_list[(int)umode].um_flags & k_allowed_free_modes))` -> MATCH
- "evaluated once at map load" -> world.c:1106 `k_allowed_free_modes = cvar("k_allowed_free_modes"); // must be setup before UserMode(...) call` (in FirstFrame, framecount==1; runtime gate reads the captured global) -> MATCH
- "a usermode request whose bit is not set is discarded" -> commands.c:4735 `G_bprint(2, "UserMode: sv %s discarded due to k_allowed_free_modes\n", um)` then return -> MATCH
- "Bits: 1..2048 per mode" -> include/g_local.h:693-704 `#define UM_1ON1 (1<<0)` .. `#define UM_XONX (1<<11)` (um_list commands.c:4537-4550 maps each name) -> MATCH (every bit exact)
- "Add bits to allow (4095 enables all)" -> commands.c:4730 bitwise AND -> MATCH (additive; 4095 = sum of bits 1..2048)
- "FFA force-enabled when server is matchless" -> world.c:1109 `k_allowed_free_modes |= UM_FFA;` (guarded `if (k_matchLess)` :1107) -> MATCH
WI-2: n/a -- RegisterCvar("k_allowed_free_modes") world.c:873 default 0; no "Default X" claim.

RESULT | ktx:command:zonesummary:frogbot:editor | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Editor-mode availability, the k_fb_admin_only gate, the per-zone marker listing, the print-to-caller, and read-only-ness each map to a verified enforcing line.
### ktx:command:zonesummary:frogbot:editor
- "available only when the frogbot editor mode is enabled" -> bot_commands.c:2484 `frogbot_cmd_t *commands = FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands;` (zonesummary only in editor_commands[] :2350) -> MATCH
- "subject to the frogbot admin-only setting" -> bot_commands.c:2491 `float admin_rules = cvar(FB_CVAR_ADMIN_ONLY);` then `if ((admin_rules == 2) && !is_real_adm(self)) {... return;} else if (admin_rules && !is_adm(self)) {... return;}` (FB_CVAR_ADMIN_ONLY = "k_fb_admin_only") -> MATCH (traced, not name-inferred)
- "Prints a 'Zone summary:' report listing per zone every route marker (index and classname)" -> bot_commands.c:1953 `G_sprint(self, PRINT_HIGH, "Zone summary:\n");` + loop :1958 `if (markers[j] && (markers[j]->fb.Z_ == i))` :1974 `G_sprint(self, PRINT_HIGH, "    %3d: %s\n", markers[j]->fb.index + 1, markers[j]->classname)` -> MATCH
- "Prints ... to the calling player" -> bot_commands.c:1953 `G_sprint(self, ...)` (self = invoker) -> MATCH
- "Read-only diagnostic; does not modify any waypoint data" -> bot_commands.c:1948-1977 body is only G_sprint + loop counters; no assignment to markers[]/fb.* -> MATCH
WI-2: n/a -- "admin-only" traced to the actual k_fb_admin_only check, correctly framed as a setting the command is subject to.

RESULT | ktx:cvar:k_allow_vwep | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=6 | The "(and the ZQ_VWEP extension available)" precache precondition has no enforcing line: vw_available is hardcoded `=1` and the checkextension("ZQ_VWEP") probe is commented out, so the precache gate reduces to k_allow_vwep alone.
### ktx:cvar:k_allow_vwep
- "Server-side master enable for visible weapons; the related k_vwep toggle only takes effect while this is on" -> world.c:378 `vw_enabled = vw_available && cvar("k_allow_vwep") && cvar("k_vwep");` (same expr match.c:1633 / commands.c:8598) -> MATCH (AND chain)
- "other players' currently-held weapon shown as a model" -> weapons.c:1813 `if (vw_enabled) { self->vw_index = 1; }` (per-weapon vw_index 2,3.. ; player.c:1182 vw_index 9) -> MATCH
- "0 = off, 1 = on (default 0)" -> world.c:874 `RegisterCvarEx("k_allow_vwep", "0");` -> MATCH (registered default exactly "0")
- "when off the in-game vwep toggle command is a no-op" -> commands.c:8592 `if (!vw_available || !cvar("k_allow_vwep")) { return; }` (ToggleVwep early-return) -> MATCH
- "With it on (and the ZQ_VWEP extension available), the server precaches the visible-weapon models" -> world.c:358 `if (cvar("k_allow_vwep") && vw_available)` :360 `trap_precache_vwep_model("progs/vwplayer.mdl");` -> UNTRACEABLE(precache IS gated on k_allow_vwep && vw_available -- that part matches -- but the "ZQ_VWEP extension available" qualifier has NO enforcing line: world.c:355 `// vw_available = checkextension("ZQ_VWEP");` commented out, :356 `vw_available = 1;` the ONLY assignment in the whole tree, so no runtime ZQ_VWEP availability test exists; the qualifier is name/comment inference, code less conditional than prose implies)
- "instead of every player appearing to carry the same weapon" -> weapons.c:1813 `if (vw_enabled) { self->vw_index = 1; }` (without vw_enabled vw_index not set per-weapon) -> MATCH
WI-2: n/a -- default-0 claim correct vs RegisterCvarEx("k_allow_vwep","0"); no access-class claim.

RESULT | ktx:cvar:k_bloodfest | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | Mode enable, default 0, per-frame wave spawner, escalating waves, client logic, monster-AI/weapon changes, matchless interaction, and off-state each map to a verified enforcing line on a real data path. [RESULT-line typo flavourC=1=0 normalized to flavourC=0.]
### ktx:cvar:k_bloodfest
- "Enables Bloodfest game mode. 0 = off, 1 = on (default 0)" -> world.c:971 `RegisterCvarEx("k_bloodfest", "0");` (global world.c:1562 `k_bloodfest = cvar("k_bloodfest");` + commands.c:3142) -> MATCH (registered default exactly "0")
- "the per-frame bloodfest monster spawner becomes active" -> sp_monsters.c:773 `if (k_bloodfest) { bloodfest_think(); return; }` (in check_monsters_respawn; bloodfest_think :629 -> bloodfest_spawn_monsters) -> MATCH
- "monsters spawned in escalating waves" -> sp_monsters.c:237 `g_bloodfest.monsters_to_spawn = (int)(factor * k_bloodfest_monsters_spawn_initial);` (bloodfest_wave_calculate :202 grows factor) -> MATCH
- "bloodfest client logic becomes active" -> client.c:1694 `if (k_bloodfest) { self->ready = 0; }` (bloodfest_client_think sp_monsters.c:535) -> MATCH
- "monster AI changes" -> sp_ai.c:103 `if (k_bloodfest) { return RANGE_MID; }` (+ sp_ai.c:371/:698 k_bloodfest branches) -> MATCH
- "monster-vs-player weapon behavior change" -> combat.c:343 `if (k_bloodfest) { bloodfest_killed_hook(targ, attacker); }` (+ weapons.c:979/1294 shambler) -> MATCH
- "bloodfest interacts with matchless mode" -> match.c:3018 `if (k_matchLess && !k_bloodfest)` (+ match.c:2430, client.c:1330, world.c:1876 real runtime paths) -> MATCH
- "With it off none of the Bloodfest behavior runs" -> sp_monsters.c:773 `if (k_bloodfest) { ...; return; }` (when 0 bloodfest_think never called) -> MATCH
WI-2: n/a -- default-0 correct vs RegisterCvarEx("k_bloodfest","0"); no access-class claim.

RESULT | ktx:cvar:k_cmd_fp_disabled | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Master-switch semantics, the 0=active warn/lock/optional-kick set, the 1=fully-disabled early return, the [0,1] clamp, and the separate-from-k_fp claim each map to a verified enforcing line.
### ktx:cvar:k_cmd_fp_disabled
- "Master switch for command flood protection" -> commands.c:1177 `if (k_cmd_fp_disabled || ((p->connect_time + 5) > g_globalvars.time)) { return false; }` (isCmdFlood, the command-flood gate :1128) -> MATCH
- "0 = command flood protection active (warned, locked out, optionally kicked)" -> commands.c:1198 rate check then `G_sprint(p,2,"You are a command flooder man!\n"); p->fp_c.locked = ...; if (!k_cmd_fp_dontkick){ ... stuffcmd(p,"disconnect\n"); }` -> MATCH (warn + lock + optional kick)
- "1 = entirely disabled (no tracking, no warnings, no kicks)" -> commands.c:1177 early `return false;` precedes all checks -> MATCH
- "Clamped to 0 or 1" -> world.c:1438 `k_cmd_fp_disabled = bound(0, cvar("k_cmd_fp_disabled"), 1);` -> MATCH
- "affects only command flooding; say/chat flood (k_fp) is separate" -> world.c:1007 `RegisterCvarEx("k_fp", "1"); // say floodprot for players` + g_cmd.c:165 separate say path -> MATCH
WI-2: n/a -- RegisterCvar("k_cmd_fp_disabled") world.c:1000 default 0; no "Default X" claim.

## Wave 09 -- canary k_yawnmode expect TRACED-CLEAN, returned TRACED-CLEAN (GATE 1 PASS -- clean control held); GATE 2 PASS (re-grep: k_entityfile C-FIX independently re-confirmed -- g_utils.c:1722 `cvar_set("k_entityfile", name)` stores the FULL unmodified `<map>#<ent>` string; the `#`-split 1723-1724 `strlcpy(mapName, name, entityFileSep-name+1)` produces a SEPARATE mapName for trap_changelevel only; clean k_ctf_rune_power_rgn world.c:959 default "2.0" + client.c:3990 tick formula). Canary row k_yawnmode stripped (control).

RESULT | ktx:cvar:k_entityfile | C-FIX | flavourC=1 | wi2=0 | clauses=7 | Set/clear clause WRONG: changelevel stores the FULL `<map>#<entfile>` string (incl. '#' and map prefix), not "the part after '#'"; consumers use the value verbatim as the filename stem with no '#'-split.
### ktx:cvar:k_entityfile
- "String cvar holding an alternate basename used when locating per-map auxiliary files" -> world.c:886 `RegisterCvar("k_entityfile");` -> MATCH (bare register => string, default empty)
- "uses this name instead of the current map name as the filename stem for the bot-marker file (maps/<name>.bot)" -> marker_load.c:377 `file = std_fropen("maps/%s.bot", entityFile);` -> MATCH
- "the race route file (race/routes/<name>.route)" -> race.c:3828 `race_fropen("race/routes/%s.route", entityfile);` -> MATCH
- "the location file (locs/<name>.loc)" -> teamplay.c:1549 `file = std_fropen("locs/%s.loc", entityFile);` -> MATCH
- "and as the same-level / next-map target" -> client.c:808 `set_nextmap(entityfile);` (+ client.c:569 GotoNextMap) -> MATCH
- "Empty string = those files are looked up under the actual map name" -> teamplay.c:1552 `if (file == -1)` :1554 `file = std_fropen("locs/%s.loc", mapname);` (same guard at marker_load.c:386, race.c:3833, client.c:812) -> MATCH
- "set automatically when a map is changed using \"<map>#<entityfile>\": the part after '#' becomes this value; otherwise cleared" -> g_utils.c:1722 `cvar_set("k_entityfile", name);` -> MISMATCH(name is the FULL "<map>#<entfile>" string passed to changelevel, NOT the part after '#'; the '#' (K_ENTITYFILE_SEPARATOR) at g_utils.c:1716 `strchr(name, ...)` is used only to strlcpy a SEPARATE mapName for trap_changelevel (1723-1724), while k_entityfile keeps the whole string; every consumer feeds that value verbatim into "%s" with no '#'-split. "otherwise cleared" half correct at g_utils.c:1729 `cvar_set("k_entityfile", "");")
WI-2: n/a

RESULT | ktx:cvar:k_yawnmode | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=10 | Every clause (enable/disable, axe dmg 50/20, SSG pellets 21/14, GA armor 0.4/0.3, spike vel 1800/1000, backpack rule, teleport-cap prereq, toggle command) maps to a located enforcing line.
### ktx:cvar:k_yawnmode
- "Toggles 'yawn mode' ... set to 1 to enable, 0 to disable" -> globals.c:56 `int k_yawnmode;` + commands.c:8638 `k_yawnmode = cvar("k_yawnmode");` -> MATCH
- "raises axe damage (50 instead of 20 in dmm3)" -> weapons.c:128 `damage = k_yawnmode ? 50 : 20; // Yawnmode: 50 axe dmg in dmm3` (inside `deathmatch == 3`) -> MATCH
- "increases shotgun pellet counts" -> weapons.c:858 `int bullets = (k_yawnmode ? 21 : 14);` -> MATCH
- "alters armor protection values" -> items.c:474 `type = (k_yawnmode ? 0.4 : 0.3); // Yawnmode: changed armor protection` -> MATCH
- "changes nail/projectile velocities" -> weapons.c:1479 `VectorScale(dir, (k_yawnmode ? 1800 : 1000), newmis->s.v.velocity);` -> MATCH
- "and the backpack-drop rules" -> items.c:2686 `if (!k_yawnmode) // Yawnmode: pack dropped in yawn mode independantly from death type` -> MATCH
- "is a prerequisite for the teleport-cap setting" -> commands.c:8659 `if (!k_yawnmode) { G_sprint(self, 2, "%s required to be on\n", redtext("Yawn mode")); return; }` -> MATCH
- "Toggled in-game with the yawnmode command" -> commands.c:997 `{ "yawnmode", ToggleYawnMode, ... }` + commands.c:8650 `cvar_toggle_msg(self, "k_yawnmode", redtext("yawnmode"));` -> MATCH
- "(implied) registered" -> world.c:1011 `RegisterCvar("k_yawnmode");` -> MATCH (bare, default 0)
- "(implied) effects active per-frame via global" -> commands.c:8638 `k_yawnmode = cvar("k_yawnmode");` -> MATCH
WI-2: n/a

RESULT | ktx:cvar:k_fbskill_aim_lgpref | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=9 | "the bot is not deep underwater" precondition omits the invulnerability OR-branch: bot_botweap.c:751 selects LG even when deep underwater if the bot holds Pentagram; prose presents not-underwater as an unconditional gate, real code more conditional.
### ktx:cvar:k_fbskill_aim_lgpref
- "probability (0..1) bot proactively switches to LG / clamped 0..1 per bot" -> bot_botimp.c:312 `self->fb.skill.lg_preference = bound(0, cvar( FB_CVAR_LGPREF), 1);` -> MATCH
- "picks LG when already firing LG" -> bot_botweap.c:749 `if ((firing_lg || (self->fb.skill.lg_preference >= g_random())) && !fb_lg_disabled())` -> MATCH
- "or when this value >= a fresh uniform random number" -> bot_botweap.c:749 `(self->fb.skill.lg_preference >= g_random())` + g_utils.c:53 uniform [0,1) -> MATCH (polarity >=)
- "provided LG is not disabled" -> bot_botweap.c:749 `&& !fb_lg_disabled()` + fb_globals.c:203 `(int)cvar("k_disallow_weapons") & IT_LIGHTNING` -> MATCH
- "the bot has it" -> bot_botweap.c:753 `if (has_lg)` -> MATCH
- "the enemy is in range" -> bot_botweap.c:755 `if (self->fb.enemy_dist <= 600)` -> MATCH (range 600)
- "and the bot is not deep underwater" -> bot_botweap.c:751 `if ((self->s.v.waterlevel <= 1) || ((int)self->s.v.items & IT_INVULNERABILITY))` -> MISMATCH(gate is "not deep underwater OR has invulnerability"; prose lists not-deep-underwater as an unconditional precondition, omits the IT_INVULNERABILITY OR-branch -- with Pentagram the bot DOES pick LG while deep underwater; real code broader/more conditional)
- "1=always prefer when usable; 0=never; intermediate=that fraction" -> bot_botweap.c:749 `(lg_preference >= g_random())` -> MATCH
- "Normally set automatically from bot skill" -> bot_botimp.c:166 `cvar_fset(FB_CVAR_LGPREF, RangeOverSkill(skill, 0.2f, 1.0f));` (+ :217) -> MATCH
WI-2: n/a -- RegisterCvar(FB_CVAR_LGPREF) bot_botimp.c:118 bare default 0; no default claim.

RESULT | ktx:cvar:k_extralog | C-NEAR-MISS | flavourC=1 | wi2=0 | clauses=4 | "covering match info, players and events" lists players as a top-level coverage area, but the ktxlog has only <match_info> and <events> sections; <player> appears only as a sub-field inside individual <event> records, not a covered players section.
### ktx:cvar:k_extralog
- "When 1 opens an extra log file / when 0 inert / 0=off,1=on" -> logs.c:42 `if (!cvar("k_extralog")) { return; }` (log_open; also log_printf :79) -> MATCH (falsey => no file)
- "(named by the extralogname cvar)" -> logs.c:119 `log_open("%s", cvar_string("extralogname"));` -> MATCH
- "writes a structured <ktxlog> XML document covering match info ... and events" -> logs.c:121 `<ktxlog xmlns:xsi=...>` + :127 `log_printf("\t<match_info>\n" ...)` + :136 `log_printf("\t<events>\n");` -> MATCH (root + match_info + events)
- "...players..." (as a covered top-level area peer to match info / events) -> logs.c:93-144 emit only <version>,<match_info>,<events> (no <players> section); the only <player> emission is per-event e.g. items.c:223 `"\t\t\t\t<player>%s</player>\n"` inside a <pick_mapitem> <event> -> UNTRACEABLE(no enforcing line emits a players section/roster; player data only as a child of individual <event> records; "players" as a covered area narrower than the prose's peer-of-match-info-and-events framing)
WI-2: n/a -- RegisterCvar("k_extralog") world.c:1004 bare default 0; "0=off,1=on" no specific default claim.

RESULT | ktx:cvar:k_ctf_rune_power_rgn | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Every clause maps to an enforcing line: spawn gate >0, +5 below 150 health, exact tick formula 1/((v/2)+1), default 2.0 => 0.5s; "scales strength" explicitly defined by the prose as the tick-rate, confirmed at client.c:3990.
### ktx:cvar:k_ctf_rune_power_rgn
- "CTF runes only" -> client.c:3976 `if (self->ctf_flag & CTF_RUNE_RGN)` (spawn runes.c:420 UniqueRuneSpawn(CTF_RUNE_RGN,...)) -> MATCH
- "0 disables the regeneration rune entirely (not placed)" -> runes.c:418 `if (cvar("k_ctf_rune_power_rgn") > 0) { UniqueRuneSpawn(CTF_RUNE_RGN, nrunes, runes); }` -> MATCH (<=0 => no spawn)
- "Above 0, higher values make the rune stronger / Scales the strength" -> client.c:3990 `self->regen_time += 1 / ((cvar("k_ctf_rune_power_rgn") / 2) + 1);` -> MATCH (prose defines strength = tick-rate; reduces to checkable fact, no judgment per PROC-1)
- "a carrier below 150 health gains +5 health per tick" -> client.c:3982 `if (self->s.v.health < 150) { self->s.v.health += 5;` (capped to 150 :3985-3988) -> MATCH
- "delay between ticks is 1 / ((value / 2) + 1) seconds" -> client.c:3990 (exact formula) -> MATCH
- "larger value means faster healing" -> client.c:3990 (larger value => larger denominator => smaller regen_time increment => shorter delay) -> MATCH
- "With default 2.0 the interval is 0.5 seconds" -> client.c:3990 with world.c:959 default => 1/((2.0/2)+1)=0.5 -> MATCH
- "default 2.0" -> world.c:959 `RegisterCvarEx("k_ctf_rune_power_rgn", "2.0");` -> MATCH
WI-2: registered default IS "2.0" (world.c:959) -- prose's "default 2.0" correct, no WI-2 defect.

RESULT | ktx:cvar:k_dmgfrags | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=8 | Every clause (damage-frag scoring 1/100, kill-frag suppression, teammate/self/tele/Pentagram exclusions, off-state, -df suffix) maps to a located enforcing line incl. adjacent comments.
### ktx:cvar:k_dmgfrags
- "When on (non-zero) and a match running, frags awarded by cumulative damage -- 1 frag per 100 points" -> combat.c:936 `if ((match_in_progress == 2) && ((int)cvar("k_dmgfrags") || lgc_enabled()))` + :944-947 accumulate `/100` carry -> MATCH
- "instead of by kills; while on, a normal kill grants no separate +1 frag" -> client.c:5414 `if (!cvar("k_dmgfrags") && !cvar("k_midair") && !lgc_enabled()) { attacker->s.v.frags += 1; }` (comment :5416) -> MATCH
- "Damage to teammates and self does not count" -> combat.c:938 `if ((attacker->ct==ctPlayer)&&(targ->ct==ctPlayer)&&(attacker != targ))` (self) + :940 `if (isDuel() || isFFA() || strneq(attackerteam, targteam))` (teammates) -> MATCH
- "tele-death damage does not count" -> combat.c:774-777 `if (TELEDEATH(targ)) { ... dmg_dealt = 0; }` -> MATCH
- "damage to a victim with Pentagram is not capped by victim's health" -> combat.c:779-783 `else if (targ->invincible_finished >= g_globalvars.time) { ... dmg_dealt += virtual_take; }` vs capped else :789 `bound(0, virtual_take, targ->s.v.health)` -> MATCH
- "0 = off (normal kill-based scoring)" -> combat.c:936 gate + client.c:5414 restore -> MATCH
- "active mode string gets a '-df' suffix" -> world.c:1527-1529 `if (cvar("k_dmgfrags")) { strlcat(mode, "-df", ...); }` -> MATCH
- "(implied) registered/cvar-gated" -> world.c:980 `RegisterCvar("k_dmgfrags");` (bare, default 0) -> MATCH
WI-2: n/a

## Wave 10 -- canary autotrack expect C-FIX, returned C-FIX (GATE 1 PASS); GATE 2 PASS (re-grep: canary autotrack defect commands.c:1078/1083 additive-vs-only re-confirmed; clean k_fbskill_use_rocketjumps bot_botimp.c:351 + bot_botjump.c:99 / k_fbskill_goallookaheadtime bot_botgoals.c:180 -- all-clean wave double-checked on 2 load-bearing rows). Canary row autotrack stripped (control).

RESULT | ktx:cvar:k_fbskill_use_rocketjumps | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Every clause maps to an enforcing line; the easy-mode-only derivation claim is correct (line 250 inside setSkillAttributesEasySkillMode, setSkillAttributes 156-205 does not set it).
### ktx:cvar:k_fbskill_use_rocketjumps
- "read into self->fb.skill.use_rocketjumps as (cvar > 0)" -> bot_botimp.c:351 `self->fb.skill.use_rocketjumps = cvar(FB_CVAR_USE_ROCKETJUMPS) > 0;` -> MATCH
- "when false the bot's rocket-jump capability is forced off (self->fb.canRocketJump = false)" -> bot_botjump.c:97-100 `else if (!self->fb.skill.use_rocketjumps) { self->fb.canRocketJump = false; }` -> MATCH
- "when true the bot may rocket-jump where its path/jump logic calls for it" -> bot_botjump.c:101-136 (else-if chain sets canRocketJump=true under has_rl/pent/health only when use_rocketjumps passed) -> MATCH
- "suppressing rocket-jump path moves" -> bot_botjump.c:334 `else if (self->fb.canRocketJump && ((int)self->s.v.flags & FL_ONGROUND))` -> MATCH
- "Consumed by the rocket-jump decision in bot_botjump.c" -> bot_botjump.c:82 `void BotCanRocketJump(gedict_t *self)` (reads use_rocketjumps :97) -> MATCH
- "only the easy-skill-mode derivation sets this from skill (skill>5?1:0); default skill mode does not assign it" -> bot_botimp.c:250 `cvar_fset(FB_CVAR_USE_ROCKETJUMPS, skill > 5 ? 1 : 0);` (inside setSkillAttributesEasySkillMode 207-257; setSkillAttributes 156-205 has no such line) -> MATCH
WI-2: n/a -- RegisterCvar(FB_CVAR_USE_ROCKETJUMPS) bot_botimp.c:143 bare default 0; no default/access-class claim.

RESULT | ktx:cvar:k_fbskill_dmm4wiggle | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | On/off enable verified at the ApplyPhysics early-return; the dmm4-duel scope and the separation from k_fbskill_dmm4wiggletoggle both map to enforcing lines.
### ktx:cvar:k_fbskill_dmm4wiggle
- "read into self->fb.skill.wiggle_run_dmm4 via bound(0,(int)cvar,1.0)" -> bot_botimp.c:352 `self->fb.skill.wiggle_run_dmm4 = bound(0, (int)cvar(FB_CVAR_MOVEMENT_DMM4WIGGLE), 1.0f);` -> MATCH
- "In dmm4 duel the wiggle physics step early-returns when this is false" -> bot_movement.c:141-144 `if ((deathmatch >= 4) && isDuel() && !self->fb.skill.wiggle_run_dmm4) { return; }` -> MATCH (deathmatch>=4 && isDuel(); dmm4-duel canonical, traceable minor vagueness)
- "non-zero enables, 0 disables" -> bot_movement.c:141 `!self->fb.skill.wiggle_run_dmm4` -> MATCH
- "Consumed by ApplyPhysics() in bot_movement.c" -> bot_movement.c:126 `static void ApplyPhysics(gedict_t *self)` (line 141 gate) -> MATCH
- "the separate k_fbskill_dmm4wiggletoggle controls the probability of flipping wiggle direction on damage" -> bot_botenemy.c:34-37 `if ((deathmatch >= 4) && (g_random() < targ->fb.skill.wiggle_toggle) && ...) { targ->fb.wiggle_run_dir = ... }` (wiggle_toggle from FB_CVAR_MOVEMENT_DMM4WIGGLETOGGLE bot_botimp.c:354, distinct cvar) -> MATCH
WI-2: n/a -- RegisterCvar(FB_CVAR_MOVEMENT_DMM4WIGGLE) bot_botimp.c:144 bare default 0; no default/access-class claim.

RESULT | ktx:cvar:k_fbskill_movement_dodgefactor | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | The cvar-specific clauses (the `value` multiplicand along v_right, 0=no displacement, 0..1 clamp, skill-set) all map to enforcing lines; description correctly keeps the cvar and the separate local dodge_factor distinct.
### ktx:cvar:k_fbskill_movement_dodgefactor
- "strength of the bot's random sideways strafe-dodge while moving" -> bot_botthink.c:144-145 `VectorMA(dir_move, g_random() * self->fb.skill.dodge_amount * dodge_factor, g_globalvars.v_right, dir_move);` (dodge_amount = this cvar) -> MATCH
- "lateral offset along right-vector is (uniform random) * value * dodge_factor" -> bot_botthink.c:143-145 (g_random uniform [0,1); value=dodge_amount=cvar; dodge_factor a separate directional local; along v_right) -> MATCH
- "Higher (toward 1) = larger strafe-dodging" -> bot_botthink.c:144 (linear multiplicand) -> MATCH
- "0 = no added sideways displacement" -> bot_botthink.c:144 (dodge_amount=0 zeroes the VectorMA scalar) -> MATCH
- "Clamped to 0..1 per bot" -> bot_botimp.c:306 `self->fb.skill.dodge_amount = bound(0, cvar( FB_CVAR_DODGEFACTOR), 1);` -> MATCH
- "Normally set automatically from bot skill" -> bot_botimp.c:159 `cvar_fset(FB_CVAR_DODGEFACTOR, RangeOverSkill(skill, 0.0f, 1.0f));` (+ :210) -> MATCH
WI-2: n/a -- RegisterCvar(FB_CVAR_DODGEFACTOR) bot_botimp.c:113 bare default 0; no default/access-class claim.

RESULT | ktx:cvar:k_fbskill_goallookaheadtime | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Horizon gate (strict <), the exact scoring weight (horizon-goal_time)/(goal_time+5), the bound(0,v,45) clamp, and both consumer files all map to enforcing lines.
### ktx:cvar:k_fbskill_goallookaheadtime
- "bot only considers it if estimated travel/respawn time is less than this horizon" -> bot_botgoals.c:180 `if (goal_time < self->fb.skill.lookahead_time)` -> MATCH (strict <)
- "goal score weighted by (horizon - goal_time) / (goal_time + 5)" -> bot_botgoals.c:182-183 `float goal_score = goal_desire * (self->fb.skill.lookahead_time - goal_time) / (goal_time + 5);` -> MATCH (exact)
- "goals reachable far inside the horizon score higher" -> bot_botgoals.c:182-183 (smaller goal_time => larger numerator + smaller denominator => higher) -> MATCH
- "Read into self->fb.skill.lookahead_time clamped bound(0,value,45)" -> bot_botimp.c:308 `self->fb.skill.lookahead_time = bound(0, cvar( FB_CVAR_LOOKAHEADTIME), 45);` -> MATCH
- "Consumed throughout goal evaluation in bot_botgoals.c" -> bot_botgoals.c:180-378 (lookahead_time at 180,182,226,...,378) -> MATCH
- "passed into path scoring in bot_botpath.c; longer horizon -> pursues goals further away in time" -> bot_botpath.c:418 `PathScoringLogic(self->fb.goal_respawn_time, self->fb.be_quiet, self->fb.skill.lookahead_time, ...)` -> MATCH
WI-2: n/a -- RegisterCvar(FB_CVAR_LOOKAHEADTIME) bot_botimp.c:115 bare default 0; no default/access-class claim.

RESULT | ktx:cvar:k_fbskill_vol_bot_midair_incr | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | The increment, the !FL_ONGROUND_PARTIALGROUND bot-self condition, the bound(0,v,2.0), and the both-mode skill derivation all map to enforcing lines; bot-self vs opponent scope enforced by the adjacent distinct branch.
### ktx:cvar:k_fbskill_vol_bot_midair_incr
- "volatility INCREMENT added while the BOT ITSELF is airborne (volatility += self_midair_volatility)" -> bot_aim.c:291 `volatility += self->fb.skill.self_midair_volatility;` -> MATCH
- "applied when the bot's entity flags do not include FL_ONGROUND_PARTIALGROUND" -> bot_aim.c:289-292 `if (!((int)self->s.v.flags & FL_ONGROUND_PARTIALGROUND)) { volatility += self->fb.skill.self_midair_volatility; }` (FL_ONGROUND_PARTIALGROUND = FL_ONGROUND|FL_PARTIALGROUND fb_globals.h:66) -> MATCH
- "models the bot aiming worse while in the air" -> bot_aim.c:288 `// Midair penalty - if we're in midair, not as accurate` (self vs opponent distinguished :289 vs :294 separate cvar) -> MATCH
- "reads it clamped bound(0,value,2.0) into self->fb.skill.self_midair_volatility" -> bot_botimp.c:344-345 `self->fb.skill.self_midair_volatility = bound(0, cvar(FB_CVAR_SELF_MIDAIR_VOLATILITY_INCREASE), 2.0f);` -> MATCH
- "Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode()" -> bot_botimp.c:194 `cvar_fset(FB_CVAR_SELF_MIDAIR_VOLATILITY_INCREASE, RangeOverSkill(skill, 1.0f, 0.0f));` (+ :245 easy-mode) -> MATCH
WI-2: n/a -- RegisterCvar(FB_CVAR_SELF_MIDAIR_VOLATILITY_INCREASE) bot_botimp.c:152 bare default 0; no default/access-class claim.

<!-- ROUND 2 ACCEPTED: waves 02b,06,07,08,09,10 = 30 batch rows. All 6 passed GATE 1 (sharpened prompt fixed the wave-02 false-negative; k_teamoverlay now correctly C-NEAR-MISS on both 02b and 08) + GATE 2. Cumulative after Rounds 1-2 (50 batch rows): TRACED-CLEAN 36 | C-NEAR-MISS 5 (dmm1, dmm3, k_allow_vwep, k_fbskill_aim_lgpref, k_extralog) | C-FIX 4 (20fav_go, fragsdown, rpickup, k_entityfile) | WI2-FIX 5 (fav_add, droppack, fav_all_del, race_set_finish, upspecs) | flavourC-positive 9/50 | wi2-positive 7 (the 5 WI2-FIX + dmm1/dmm3 carry wi2=1 alongside C-NEAR-MISS). Remaining: waves 11,12,13 = 13 rows. -->

## Wave 11 -- canary k_teamoverlay expect C-NEAR-MISS, returned C-NEAR-MISS (GATE 1 PASS); GATE 2 PASS (re-grep: canary basis match.c:1639 only !isDuel on the settings-summary string + client.c:4697 data-path gate has no isDuel -- consistent with waves 02b/05/08; clean k_freshteams_sweep_ng_ammo items.c:856 +cvar / :860 +30 fallback + k_maxclients commands.c:8046 bound). All 5 batch rows TRACED-CLEAN. Canary row k_teamoverlay stripped (control). NOTE: the subagent cited items.c:859 for the +30 NG-sweep fallback; actual line is :860 (1-line grep-window drift, snippet content correct, immaterial to the verdict).

RESULT | ktx:cvar:k_maxclients | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Every clause maps to ChangeClientsCount(); match-gate, bound-clamp, limit-reached message, and slot units all enforced.
### ktx:cvar:k_maxclients
- "upper limit for the engine's player slot count (maxclients) when adjusted in-game via the player-count up/down controls" -> commands.c:8055/8016 `upplayers(type){ ChangeClientsCount(type, 1); }` / `downplayers(type){ ChangeClientsCount(type, -1); }` + commands.c:8019 `sv_max="maxclients", k_max="k_maxclients"` (type==1) -> MATCH
- "While no match is in progress, the player-count command raises or lowers maxclients" -> commands.c:8021 `if (match_in_progress) { return; }` -> MATCH
- "but never above k_maxclients" -> commands.c:8045 `cl_count = bound(1, cvar(sv_max) + value, max(1, cvar(k_max)));` -> MATCH
- "once maxclients reaches k_maxclients the operator is told the limit is reached" -> commands.c:8038 `if ((cvar(sv_max) >= cvar(k_max)) && (value > 0)) { G_sprint(self, 2, "%s reached\n", redtext(sv_max)); return; }` -> MATCH
- "Counted in player slots" -> commands.c:8045 (integer slot count, written cvar_fset(sv_max, cl_count) :8050) -> MATCH
WI-2: n/a -- RegisterCvar("k_maxclients") world.c:989 bare default 0, no "Default" claim; k_allowcountchange perm not described.

RESULT | ktx:cvar:k_freshteams_sweep_rl_ammo | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | RL-sweep branch in weapon_touch enforces +value vs +5 split under k_freshteams && limit_sweep_ammo && already-own-RL; dmm1-only holds via world.c forced-off.
### ktx:cvar:k_freshteams_sweep_rl_ammo
- "FreshTeams (dmm1) only" -> world.c:1770 `if (cvar("k_freshteams") && deathmatch != 1)` / :1772 `cvar_fset("k_freshteams", 0); // freshteams only in dmm1` -> MATCH
- "the number of rockets a player gains when picking up a rocket launcher they already own (a 'sweep')" -> items.c:913 `other->s.v.ammo_rockets += cvar("k_freshteams_sweep_rl_ammo");` guarded by :911 `if (k_freshteams && limit_sweep_ammo && ((int)other->s.v.items & IT_ROCKET_LAUNCHER))` -> MATCH
- "applied in place of the normal 5-rocket pickup ... otherwise the standard +5" -> items.c:917 `other->s.v.ammo_rockets += 5;` (else) -> MATCH
- "Active only while k_freshteams and k_freshteams_limit_sweep_ammo are on" -> items.c:911 (k_freshteams items.c:809, limit_sweep_ammo items.c:810) -> MATCH
WI-2: n/a -- "Default 1" matches RegisterCvarEx("k_freshteams_sweep_rl_ammo","1") world.c:907; reported clean.

RESULT | ktx:cvar:k_freshteams_pack_nails | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | DropBackpack clamps pack ammo_nails via bound(0,value,cvar) under fresh_packs; excess-discard, 0..ceiling range, units and double-gate all enforced.
### ktx:cvar:k_freshteams_pack_nails
- "Fresh Teams (dmm1) only" -> world.c:1770/1772 -> MATCH
- "the maximum nails a dropped backpack may carry when backpack ammo limiting is active" -> items.c:2672 `qbool fresh_packs = (cvar("k_freshteams") && cvar("k_freshteams_limit_packs"));` gating :2835 `if (fresh_packs)` -> MATCH
- "dropped pack's nail count clamped to 0..this value" -> items.c:2837 `item->s.v.ammo_nails = bound(0, item->s.v.ammo_nails, cvar("k_freshteams_pack_nails"));` -> MATCH
- "nails beyond this ceiling are not transferred to the pack" -> items.c:2821 `item->s.v.ammo_nails = self->s.v.ammo_nails;` then :2837 clamp down -> MATCH
- "Units are nails" -> items.c:2837 -> MATCH
- "Has no effect unless k_freshteams and k_freshteams_limit_packs both set" -> items.c:2835 `if (fresh_packs)` -> MATCH
WI-2: n/a -- RegisterCvarEx("k_freshteams_pack_nails","30") world.c:899; no "Default" claim in prose.

RESULT | ktx:cvar:k_fbskill_vol_opp_midair_incr | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | Increment added when opponent !FL_ONGROUND, clamped bound(0,v,2.0) into opponent_midair_volatility, server-derived via cvar_fset in both setSkillAttributes paths -- all exact.
### ktx:cvar:k_fbskill_vol_opp_midair_incr
- "Frogbot AI aim-volatility tuning cvar" -> bot_aim.c:296 `volatility += self->fb.skill.opponent_midair_volatility;` -> MATCH
- "INCREMENT added while the bot's OPPONENT is airborne" -> bot_aim.c:296 (additive) -> MATCH
- "applied when the opponent flags do not include FL_ONGROUND_PARTIALGROUND" -> bot_aim.c:294 `if (!((int)opponent->s.v.flags & FL_ONGROUND_PARTIALGROUND))` -> MATCH
- "models the bot aiming worse at an airborne target" -> bot_aim.c:288 `// Midair penalty - if we're in midair, not as accurate` -> MATCH (traced, not name-inferred)
- "reads it clamped bound(0,value,2.0) into self->fb.skill.opponent_midair_volatility" -> bot_botimp.c:346 `self->fb.skill.opponent_midair_volatility = bound(0, cvar(FB_CVAR_OPPONENT_MIDAIR_VOLATILITY_INCREASE), 2.0f);` -> MATCH
- "Server-managed: cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode()" -> bot_botimp.c:195 + :246 `cvar_fset(FB_CVAR_OPPONENT_MIDAIR_VOLATILITY_INCREASE, RangeOverSkill(skill, 1.0f, 0.0f));` -> MATCH
WI-2: n/a -- RegisterCvar(FB_CVAR_OPPONENT_MIDAIR_VOLATILITY_INCREASE) bot_botimp.c:153 bare default 0; no default/access-class claim.

RESULT | ktx:cvar:k_freshteams_sweep_ng_ammo | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=7 | NG-sweep branch enforces += cvar under k_freshteams && limit_sweep_ammo && already-own-NG, else += 30; the "30" is the no-limit fallback (not a registered-default claim), dmm1-only holds.
### ktx:cvar:k_freshteams_sweep_ng_ammo
- "Fresh Teams (dmm1) only" -> world.c:1770/1772 -> MATCH
- "the number of nails awarded when a player picks up a nailgun they already own ('sweeping')" -> items.c:856 `other->s.v.ammo_nails += cvar("k_freshteams_sweep_ng_ammo");` guarded by :853 `if (k_freshteams && limit_sweep_ammo && ((int)other->s.v.items & IT_NAILGUN))` -> MATCH
- "applied only when k_freshteams and k_freshteams_limit_sweep_ammo are both enabled" -> items.c:853 -> MATCH
- "This value is added to the player's nails" -> items.c:856 (`+=`) -> MATCH
- "When sweep limiting is off, picking up an already-owned nailgun instead grants the default 30 nails" -> items.c:859 `other->s.v.ammo_nails += 30;` (else; actual line :860 per orchestrator re-grep -- 1-line drift, content exact) -> MATCH
- "Units are nails" -> items.c:856 -> MATCH
- "Has no effect unless k_freshteams and k_freshteams_limit_sweep_ammo are both set" -> items.c:853 else :859/:860 -> MATCH
WI-2: n/a -- the "30" is the no-limit fallback (items.c:860), NOT a default-value assertion; cvar's actual registered default is 6 (RegisterCvarEx world.c:903) but prose makes no claim about it; no WI-2 defect.

## Wave 12 -- canary k_yawnmode expect TRACED-CLEAN, returned TRACED-CLEAN (GATE 1 PASS -- the over-flag control held, no known-clean row over-flagged); GATE 2 PASS (re-grep: clean k_tot_mode combat.c:545 quad-multiplier-replaces-octa + k_use_matchless_dir commands.c:4694/4812 ffa-redirect + ==2 ctf.cfg + k_race race.c:219 isRACE body -- 3 load-bearing clean clauses re-confirmed). All 5 batch rows TRACED-CLEAN. Canary row k_yawnmode stripped (control).

RESULT | ktx:cvar:k_pause_without_matchtag | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Single enforcing line (client.c:5799) confirms polarity, default, matchtag-gate, and that the per-player pause budget always applies when pause is permitted.
### ktx:cvar:k_pause_without_matchtag
- "0 (default)" -> world.c:788 `RegisterCvarEx("k_pause_without_matchtag", "0");` -> MATCH
- "0 = a player can only pause when the server has a 'matchtag' info key set" -> client.c:5799 `if (cvar("k_pause_without_matchtag") || ((matchtag != NULL) && matchtag[0]))` (cvar 0 -> requires matchtag) -> MATCH
- "any non-zero value = players may pause even when no matchtag is set" -> client.c:5799 (non-zero left operand short-circuits true) -> MATCH
- "The per-player pause-request budget still applies regardless" -> client.c:5803 `if (p->k_pauseRequests > 0) { p->k_pauseRequests--; playerCanPause = true; }` (nested inside the gate, always evaluated when pause permitted) -> MATCH
WI-2: n/a -- default "0" verified world.c:788; no access-class claim.

RESULT | ktx:cvar:k_tot_mode | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | TOT_MODE_VARIABLE=="k_tot_mode" (g_local.h:1236); polarity, dmm4 requirement, quad-multiplier-replaces-octa, item/health-cap/bot-weapon variants, and midair/instagib mutual-exclusion all map to enforcing lines.
### ktx:cvar:k_tot_mode
- "0 = off; non-zero = on" -> commands.c:9560 `return cvar(TOT_MODE_VARIABLE) != 0;` (tot_mode_enabled(); TOT_MODE_VARIABLE = "k_tot_mode" g_local.h:1236) -> MATCH
- "Requires dmm4" -> commands.c:7920 `if (!k_tot && (deathmatch != 4)) { G_sprint(self, 2, "ToT mode requires dmm4\n"); return; }` -> MATCH
- "the quad-damage multiplier becomes a configurable bot quad multiplier instead of the dmm4 octa (8x)" -> combat.c:545 `damage *= (deathmatch != 4 ? 4 : tot_mode_enabled() ? FrogbotQuadMultiplier() : 8);` -> MATCH
- "item behaviors switch to ToT variants" -> items.c:2183 `if (deathmatch == 4 && !tot_mode_enabled())` (+ client.c:2227 ToT loadout) -> MATCH
- "health-cap behaviors switch to ToT variants" -> items.c:2446 `if ((lgc_enabled() || tot_mode_enabled()) && (other->s.v.health > 299)) { other->s.v.health = 300; }` -> MATCH
- "bot-weapon behaviors switch to ToT variants" -> bot_botweap.c:956 `if (tot_mode_enabled()) { if ((fb_weapon = FrogbotWeapon())) {...` -> MATCH
- "Mutually exclusive with midair and instagib" -> commands.c:7929 `if (cvar("k_midair")) { cvar_set("k_midair","0"); } if (cvar("k_instagib")) { cvar_set("k_instagib","0"); }` -> MATCH
WI-2: n/a -- RegisterCvar("k_tot_mode") world.c:1084 bare default 0; no default/access claim.

RESULT | ktx:cvar:k_use_matchless_dir | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | The 0/non-zero ffa->matchless redirect (commands.c:4692) and the ==2 ctf.cfg branch (commands.c:4812) both enforce exactly as described; the enum gloss matches the code.
### ktx:cvar:k_use_matchless_dir
- "When 0, the normal config path is used (configs/usermodes/ffa for ffa)" -> commands.c:4692 `if (streq(um, "ffa") && k_matchLess && cvar("k_use_matchless_dir"))` (cvar 0 -> false -> um stays "ffa", configs/usermodes/ffa/default.cfg :4809) -> MATCH
- "When non-zero, ffa redirected to configs/usermodes/matchless" -> commands.c:4694 `um = "matchless"; // use configs/usermodes/matchless instead of configs/usermodes/ffa in matchless mode` -> MATCH
- "value 2 additionally makes matchless load matchless/ctf.cfg instead of default.cfg" -> commands.c:4812 `if (streq(um, "matchless") && (cvar("k_use_matchless_dir") == 2))` :4814 `cfg_name = va("configs/usermodes/%s/ctf.cfg", um);` -> MATCH
- "0 = ffa dir, 1 = matchless dir, 2 = matchless dir + ctf.cfg" -> commands.c:4692 + 4812 (enum gloss consistent) -> MATCH
WI-2: n/a -- RegisterCvar("k_use_matchless_dir") world.c:798 bare default 0; no default/access claim.

RESULT | ktx:cvar:k_race | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=6 | isRACE()==cvar("k_race") (race.c:219); the race_settings[] block (deathmatch 4 / practice) applied via apply_race_settings(), and both ToggleRace refusal conditions map to enforcing lines.
### ktx:cvar:k_race
- "Non-zero means Race is active: isRACE() reports true" -> race.c:219 `return (cvar("k_race"));` -> MATCH
- "switches the server into the race game type" -> race.c:330 `if (!isRACE())` else loads race; gates race path throughout (match.c:1546) -> MATCH
- "applies the hardcoded race settings (practice mode, deathmatch 4, etc.)" -> race.c:294 `race_settings[] = "sv_silentrecord 1\n" "deathmatch 4\n" "srv_practice_mode 1\n" ...` (apply_race_settings race.c:323 when isRACE()) -> MATCH
- "toggled by the race-mode toggle command rather than set directly" -> race.c:268 `cvar_toggle_msg(self, "k_race", redtext("race"));` -> MATCH
- "refused while bots are enabled" -> race.c:244 `if (!isRACE() && bots_enabled()) { ...; return; }` -> MATCH
- "or while a race is already started with players present" -> race.c:264 `if (CountPlayers() && race_is_started()) { return; }` -> MATCH
WI-2: n/a -- RegisterCvarEx("k_race","0") world.c:912 default 0 consistent; no access-class claim.

RESULT | ktx:cvar:k_race_pace_enabled | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | "active = non-zero AND route captured" is the literal race_pacemaker_enabled() body (race.c:4482); spawn-at-start, headstart, and both auto-set sites (1 on select / 0 on `pacemaker off`) all map to enforcing lines.
### ktx:cvar:k_race_pace_enabled
- "pacemaker active when non-zero AND a ghost route has been captured" -> race.c:4482 `return cvar(RACE_PACEMAKER_ENABLED_CVAR) && guide.capture.position_count;` (RACE_PACEMAKER_ENABLED_CVAR = "k_race_pace_enabled" race.c:26) -> MATCH
- "with it enabled the ghost spawns at race start, advances along its recorded path" -> race.c:4671 `if (race_pacemaker_enabled()) { ... setorigin(ent, PASSVEC3(guide.capture.positions[0].origin)); }` (advance race_update_pacemaker :4735) -> MATCH
- "a head-start may be applied" -> race.c:4768 `race_time += bound(RACE_PACEMAKER_HEADSTART_MIN, cvar(RACE_PACEMAKER_HEADSTART_CVAR), RACE_PACEMAKER_HEADSTART_MAX);` (after `removal_required = !race_pacemaker_enabled()` :4741) -> MATCH
- "set automatically: enabled (1) when a pacemaker run is selected" -> race.c:4477 `cvar_fset(RACE_PACEMAKER_ENABLED_CVAR, 1);` -> MATCH
- "set to 0 when the pacemaker is turned off via the pacemaker command" -> race.c:4343 `cvar_fset(RACE_PACEMAKER_ENABLED_CVAR, 0);` (`off` branch) -> MATCH
WI-2: n/a -- RegisterCvarEx("k_race_pace_enabled","0") world.c:921 default 0; set automatically (no manual default claim); no access-class claim.

## Wave 13 -- canary autotrack expect C-FIX, returned C-FIX (GATE 1 PASS); GATE 2 PASS (re-grep: canary autotrack defect commands.c:893 CF_SPECTATOR|CF_MATCHLESS not _ONLY -- final re-confirm, consistent across waves 01/04/07/10; clean *mp g_cmd.c:1179 / *mt g_cmd.c:1192 SetUserInfo STAR + k_vp_coop vote.c:330 floor-51/cap-100). All 3 batch rows TRACED-CLEAN. Canary row autotrack stripped (control). NOTE: k_vp_coop carries a PROC-1 presentation residual the subagent correctly surfaced (not absorbed): votecoop is a toggle `cvar_fset("coop", coop = !cvar("coop"))` vote.c:1134, prose says "switches into coop" -- factual transition true, "switches" vs "toggles" is presentation-only; classified TRACED-CLEAN with the residual noted.

RESULT | ktx:info_key:*mt:userinfo | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | Every clause maps to an enforcing line: set by `mmode team` only-on-change at g_cmd.c:1192, routed via s_t_do team match at g_cmd.c:717-719 when *mm==MMODE_TEAM(2).
### ktx:info_key:*mt:userinfo
- "Server-set star userinfo key" -> g_cmd.c:1192 `SetUserInfo(self, "*mt", va("%s", tname), SETUSERINFO_STAR);` -> MATCH (SETUSERINFO_STAR = `(1<<0) // allow set star keys` g_syscalls.h:138; only writer of *mt)
- "holding the target team name (string)" -> g_cmd.c:1187 `tname = (argc < 3 ? ezinfokey(self, "*mt") : arg_3);` -> MATCH (string `%s`, not iKey)
- "used when the client's mmode (*mm) is team mode (2)" -> g_cmd.c:382 `case MMODE_TEAM:` (dispatched by `mmode = iKey(self, "*mm")` :368; MMODE_TEAM (2) g_consts.h:293) -> MATCH
- "When a message is sent in team mmode the server routes it to the team named here" -> g_cmd.c:383 `s_t_do(str, ezinfokey(self, "*mt"));` + :719 `|| (streq(tname, getteam(p))))` -> MATCH (delivers to clients whose team equals *mt)
- "Updated by the \"mmode team\" command when the chosen team changes" -> g_cmd.c:1189 `if ((set = (mmode != iKey(self, "*mm") || strneq(tname, ezinfokey(self, "*mt")))))` (write :1192 gated on set) -> MATCH
WI-2: n/a -- no default/access-class claim; *mt internal star key, no RegisterCvar.

RESULT | ktx:cvar:k_vp_coop | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=4 | Floor-51/cap-100 and ceil(fraction*(players-bots)) both map to vote.c:330 and vote.c:343; "switches into coop" is a toggle at vote.c:1134 -- factual transition true, residual is presentation-only (PROC-1 surfaced).
### ktx:cvar:k_vp_coop
- "The percentage of eligible voters required to pass a cooperative-mode vote" -> vote.c:312 `percent = cvar("k_vp_coop");` (case OV_COOP) -> MATCH
- "the /votecoop command, which switches the server into coop mode" -> vote.c:1134 `cvar_fset("coop", coop = !cvar("coop"));` -> MATCH (votecoop -> vote_check_coop toggles `coop`; toggle not one-way switch -- residual is presentation-only per PROC-1, not a factual miss)
- "the effective value is floored at 51 and capped at 100, so values below 51 behave as 51" -> vote.c:330 `percent = bound(0.51, bound(51, percent, 100) / 100, 1);` (inner bound(51,percent,100) per `float bound` g_utils.c:353) -> MATCH
- "The required vote count is ceil(percent/100 * (players minus bots))" -> vote.c:343 `vt_req = ceil(percent * (CountPlayers() - CountBots()));` (percent already the /100 fraction from :330) -> MATCH
WI-2: n/a -- no explicit "Default X" claim; RegisterCvar("k_vp_coop") world.c:833 bare default 0 (shipped ktx.cfg `set k_vp_coop 51` is a cfg value; "floored at 51" prose consistent at default 0).

RESULT | ktx:info_key:*mp:userinfo | TRACED-CLEAN | flavourC=0 | wi2=0 | clauses=5 | All clauses enforced: id stored at g_cmd.c:1179, resolved via SpecPlayer_by_id at g_cmd.c:372, single-recipient route via s_common at g_cmd.c:597 when *mm==MMODE_PLAYER(1).
### ktx:info_key:*mp:userinfo
- "Server-set star userinfo key" -> g_cmd.c:1179 `SetUserInfo(self, "*mp", va("%d", id), SETUSERINFO_STAR);` -> MATCH
- "holding the target player id" -> g_cmd.c:1179 (`id = GetUserID(p)` :1168; integer id) -> MATCH
- "used when the client's mmode (*mm) is player mode (1)" -> g_cmd.c:371 `case MMODE_PLAYER:` (MMODE_PLAYER (1) g_consts.h:292) -> MATCH
- "the server resolves the player by this id (SpecPlayer_by_id)" -> g_cmd.c:372 `if ((goal = SpecPlayer_by_id(iKey(self, "*mp"))))` (g_utils.c:1492) -> MATCH
- "routes the message to that single player" -> g_cmd.c:374 `s_common(self, goal, str);` + :597 `G_sprint_flags(to, PRINT_CHAT, SPRINT_IGNOREINDEMO, ...)` -> MATCH (single `to` edict, no broadcast loop)
- "Updated by the \"mmode player\" command when the chosen target changes" -> g_cmd.c:1176 `if ((set = (mmode != iKey(self, "*mm") || id != iKey(self, "*mp"))))` (write :1179 gated on set) -> MATCH
WI-2: n/a -- no default/access-class claim; *mp internal star key, no RegisterCvar.

<!-- ROUND 3 ACCEPTED: waves 11,12,13 = 13 batch rows, all TRACED-CLEAN. All 3 passed GATE 1 + GATE 2. -->

## FINAL TALLY -- batch 01 (BATCH_ID 1, bucket 0): 63 batch rows, ALL waves canary-gated + orchestrator re-grepped

- Waves: 13 (01-13) + 1 re-dispatch (02 -> 02b). Canary-rejected+redispatched: 1 (wave 02, k_teamoverlay false-negatived TRACED-CLEAN; 02b under a sharpened anti-rationalization prompt returned the correct C-NEAR-MISS).
- HARD GATE 1 (canary): every accepted wave's injected canary matched ground truth. Canary ground truth held perfectly across all executions: autotrack->C-FIX x5, k_teamoverlay->C-NEAR-MISS x4, k_yawnmode->TRACED-CLEAN x4.
- HARD GATE 2 (orchestrator re-grep): every accepted wave independently re-grepped (>=1 flagged wrong-clause line + >=1 clean load-bearing clause, or 2-3 clean clauses for all-clean waves); all held.

Classification (63 rows, canaries excluded):
- TRACED-CLEAN: 49
- C-NEAR-MISS: 5  -- dmm1, dmm3, k_allow_vwep, k_fbskill_aim_lgpref, k_extralog
- C-FIX: 4  -- 20fav_go, fragsdown, rpickup, k_entityfile
- WI2-FIX: 5  -- fav_add, droppack, fav_all_del, race_set_finish, upspecs
- flavour-C-positive (C-NEAR-MISS + C-FIX): 9 / 63 = ~14.3% (consistent with the calibration random-fleet probe ~14%)
- wi2-positive: 7 (the 5 WI2-FIX + dmm1/dmm3 which carry wi2=1 alongside their C-NEAR-MISS)

Flagged set for B4 re-synth (operator-gated, NOT started here -- C4):
- C-FIX (wrong clause vs enforcing line): 20fav_go, fragsdown, rpickup, k_entityfile
- C-NEAR-MISS (clause untraceable on the feature's own path): dmm1, dmm3, k_allow_vwep, k_fbskill_aim_lgpref, k_extralog
- WI2-FIX (metadata/access-class wrong, core fine): fav_add, droppack, fav_all_del, race_set_finish, upspecs

Operator-attention notes (PROC-1 judgment residuals surfaced, not absorbed):
- dmm1 / dmm3 C-NEAR-MISS is a strict-but-defensible SHARPENED application: the force-off clause is true for mode 1/3 but the enforcing predicate is the generic `if (dmm != 4)` (comment "if leaving dmm4"), not a mode==1/3 test. B4 re-synth should decide whether to re-scope the clause to "any mode except dmm4" or treat as acceptable; this may be a strict-edge near-miss rather than a substantive defect.
- race_set_finish / upspecs share the identical dead-CF_SPC_ADMIN structural defect (CF_PLAYER|CF_SPC_ADMIN with no CF_SPECTATOR -> spectator-admin path unreachable). Likely systemic across the cmds[] table -- worth a fleet sweep in a later pass.
- fav_add / fav_all_del share the CF_MATCHLESS-additive-misread-as-match-restriction WI-2 pattern; also systemic.
- k_vp_coop: minor PROC-1 presentation residual ("switches into" vs "toggles"); classified TRACED-CLEAN, residual recorded for B4 awareness only.


