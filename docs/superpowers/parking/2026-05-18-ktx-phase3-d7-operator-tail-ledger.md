# KTX Phase-3 -- D7 tier-2 operator-tail walk LEDGER (2026-05-18)

The spec-locked human correctness gate (decisions amendment A1 / D18). The
operator + this session walk the 43-row review docket one at a time; each
row gets a recorded disposition. This ledger is the durable output: it
feeds the Phase-3 boundary AND the Phase-4 (MVDSV) executor prompt
(carry-forwards). NOT a hand-edit channel -- a row that needs fixing is
captured here and routed to targeted re-synthesis via the D6 pipeline
(C4: never a hand UPDATE), or a skill-fix + re-fan if systemic.

## Source oracle (proven exact)

- KTX clone restored read-only at `/tmp/ktx-src-67253dc9` (ephemeral,
  re-clonable: `git clone https://github.com/QW-Group/ktx.git` then
  `git checkout 67253dc9ab4f643f1e6523a923a41caab9ea587f`).
- `git rev-parse HEAD` == `67253dc9ab4f643f1e6523a923a41caab9ea587f`;
  `git describe --tags` == `1.47-2-g67253dc` == the anchor stamped on
  every synthesized row -> byte-identical to the synthesis source.

## Docket = 43 rows -- AUTHORITATIVE SOURCE (re-anchored 2026-05-18, this session)

The docket is NOT reconstructable from psql verdict/marker queries -- a
reconstruction attempt this session mis-set the curated group (missed
allow_toggle_practice, wrongly pulled _k_coachteam1 / k_noframechecks).
The SINGLE SOURCE OF TRUTH is the operator's review-views page:
`/mnt/c/Users/Administrator/Downloads/ktx-review-views.html`
(Windows `C:\Users\Administrator\Downloads\ktx-review-views.html`).
The "Review docket only" toggle selects exactly the 43 rows carrying
`data-docket="1"`. Verdict-true breakdown FROM THE PAGE (this
SUPERSEDES the prior session's "20 curated + 10 marker + 9 affirm"
estimate, which does not match the page): **4 hedged + 11 affirmed
(1-in-4 spot-sample) + 28 synthesized = 43.**

Walk order: rows 1-12 KEEP the prior session's numbers (knob-keyed,
already dispositioned -- a subset of the authoritative 43, all
verified present). Rows 13-43 = the remaining 31 in HTML catalog
document order (what the operator sees with "Review docket only"
ticked). Row numbers are labels; dispositions + FIX queue + CF refs
are knob-keyed, so the renumber is loss-free.

### The authoritative 43 (HTML doc order | verdict | knob | ledger row | status)

|HTML|verdict|knob|row|status|
|--|--|--|--|--|
| 1|synth|downspecs|13|[D] CLEAR|
| 2|synth|k_ann|6|[D] CLEAR|
| 3|affirm|next_best|14|[D] CLEAR-fact; judg->Q|
| 4|synth|toggletracklist|15|[D] CLEAR|
| 5|hedged|dmm5|4|[D] FIX|
| 6|affirm|gamemodes|16|[D] CLEAR-fact; judg->Q|
| 7|synth|k_free_mode|12|[D] FIX|
| 8|synth|k_privategame_force_reconnect|17|[D] CLEAR|
| 9|affirm|race_toggle|18|[D] CLEAR-fact; judg->Q (lean SYNTH)|
|10|affirm|addbot:frogbot:std|19|[D] CLEAR-fact; judg->Q (lean AFFIRM)|
|11|affirm|breakondeath:frogbot:std|20|[D] CLEAR-fact; judg->Q (lean AFFIRM)|
|12|synth|clearmarkerflag:frogbot:editor|21|[D] CLEAR|
|13|affirm|removemarker:frogbot:editor|22|[D] CLEAR-fact; judg->Q (lean AFFIRM)|
|14|synth|allow_toggle_practice|5|[D] FIX|
|15|hedged|ban|1|[D] ACCEPT+P4 (CF-1)|
|16|hedged|banip|2|[D] ACCEPT+P4 (CF-1)|
|17|hedged|banrem|3|[D] ACCEPT+P4 (CF-1)|
|18|affirm|k_allowvoteadmin|23|[D] CLEAR-fact; judg->Q (lean AFFIRM)|
|19|synth|k_cmd_fp_dontkick|8|[D] CLEAR|
|20|affirm|k_exclusive|24|[D] CLEAR-fact; judg->Q (lean AFFIRM)|
|21|synth|k_highspeed|25|[D] FIX (precision, NOT under-scope class)|
|22|synth|toggleklist|26|[D] CLEAR|
|23|synth|votemap|27|[D] FIX (under-scope sub-A; meaning INVERSION -- highest severity)|
|24|affirm|k_motd_time|28|[D] CLEAR-fact; judg->Q (lean strong AFFIRM)|
|25|synth|k_noframechecks|29|[D] CLEAR (D10 canary PASS)|
|26|affirm|k_sayteam_to_spec|30|[D] CLEAR-fact; judg->Q (lean strong AFFIRM)|
|27|affirm|k_timetop|31|[D] CLEAR-fact; judg->Q (lean SYNTHESIZE -- elaborated-affirm/provenance)|
|28|synth|timedown|32|[D] CLEAR|
|29|synth|timeup|33|[D] CLEAR|
|30|synth|k_ctf_hookstyle|9|[D] CLEAR|
|31|synth|k_pow_pickup|34|[D] FIX (precision NEW flavour C -- cvar=0 "timer stacks" FALSE; source hard-caps 30s)|
|32|synth|k_spw|35|[D] CLEAR (fact)|
|33|synth|spawn_show|36|PENDING|
|34|synth|spawn666time|37|PENDING|
|35|synth|k_classic_shotgun|7|[D] CLEAR|
|36|synth|k_disallow_weapons|11|[D] FIX|
|37|synth|k_instagib|38|PENDING|
|38|synth|k_overtime|39|PENDING|
|39|synth|k_demoname_date|10|[D] CLEAR|
|40|synth|_k_coachteam1|40|PENDING|
|41|synth|_k_last_cycle_map|41|PENDING|
|42|synth|timing_players_action|42|PENDING|
|43|synth|k_use_matchless_dir|43|PENDING|

[D]=dispositioned. 35 done / 8 PENDING.
NEXT = ledger row 36 = HTML#33 `spawn_show` (synthesized).
  (HTML#32 k_spw now [D] CLEAR -- next PENDING in HTML
  order is #33.)

## Per-row dispositions

| # | knob | type | on docket | disposition | note |
|---|------|------|-----------|-------------|------|
| 1 | ban | command | hedged | ACCEPT AS-IS + P4 carry | KTX = pure redirect stub (commands.c:975 `redirect`, CF_REDIRECT; redirect() c.c:1255 stuffs `cmd ban <params>`). Exhaustive grep: no KTX-side ban impl. Hedge factually correct. CD_BAN="timed ban by uid/nick". |
| 2 | banip | command | hedged | ACCEPT AS-IS + P4 carry | Same redirect mechanism (commands.c:976, index-twin). CD_BANIP="timed ban by ip". |
| 3 | banrem | command | hedged | ACCEPT AS-IS + P4 carry | Same redirect mechanism (commands.c:977, index-twin). CD_BANREM="remove ban / banlist". |
| 4 | dmm5 | command | hedged | **FIX** (re-synthesis) | Description FALSELY claims "same behavior as mode 3" + "distinguishing rule not source-legible". Wide grep DISPROVES: dmm5 takes the `deathmatch>3` path (weapons.c:122 axe dmg 75 not 20; weapons.c:1185 discharge-kill) = dmm4-like; AND has a mode-5-EXCLUSIVE match loadout at client.c:2308 (`deathmatch==5 && match_in_progress==2` -> 80 nails/30 shells/10 rockets/30 cells) = the single authoritative distinguishing site the hedge said does not exist; bot AI differs (bot_client.c:249 goal_client6). Shares only weapons-stay/half-ammo-respawn with 2/3 (items.c). dmm5 is its OWN sub-mode, ~dmm4-family, NOT a dmm3 clone. |
| 5 | allow_toggle_practice | cvar | curated | **FIX** (re-synthesis) | Curated concern (shipped doc over-promises elected-admin/judge tiers) was handled CORRECTLY -- access-tier enumeration (0 / 1,2 / 3,4 / 5 / default) is source-exact, D10 call right. BUT wide read (WI-1) found a SEPARATE gap: the guard list omits the `lock_practice` gate (commands.c:4919: `lock_practice==2 \|\| (!=0 && !=1)` -> "command is locked", return). Add the lock_practice guard + cross-ref. Operator corroboration: practice = prewar-only (match_in_progress return), toggling reloads the map (SetPractice), server-side feature gate -- consistent with source; feeds the L3 practice-feature note. |
| 6 | k_ann | cvar | curated | CLEAR | High-quality synthesis. Wide read (WI-1): ALL k_ann reads = exactly the 2 cited sites (spectate.c:180/239) + bare register; ternary verbatim; message text exact. Synthesis correctly rejected the imprecise shipped doc, documented true behaviour (never fully suppressed -- always reaches spectators; k_ann only gates player visibility during a live match), surfaced the precision gap as a C2 note. Source-accurate. No action. |
| 7 | k_classic_shotgun | cvar | curated | CLEAR | High-quality synthesis. Wide read (WI-1): all reads = world.c:948 + two parallel blocks (weapons.c:549/717/724 + the :740/782/793 HITBOXCHECK variant) -- reasoning explicitly accounted for the variant. Verified: classic_shotgun passed as TraceAttack `send_effects`; AddMultiDamage + hit-stats run REGARDLESS, only SpawnBlood/puff gated; `!classic_shotgun -> Multi_Finish()` combined effect. Description (visual-only, damage/accuracy identical) source-exact; correctly disambiguated the C2 "sg/ssg hits != accuracy" misread. No action. |
| 8 | k_cmd_fp_dontkick | cvar | curated | CLEAR | High-quality synthesis. Wide read (WI-1): all reads accounted (globals.c:83 decl, world.c:999/1437, commands.c:1204/2071). Verified commands.c:1188-1228: warn+lockout run BEFORE `if(!k_cmd_fp_dontkick)` (always); kick path gated by it; clamp 0/1; scoped to cmd-flood not say-flood. Correctly defused the inverse-polarity trap + surfaced the config-default divergence (ktx-repo ships 0=kick, nquake-distfiles ships 1=no-kick) as retained-both C2 -- NOT a defect. Operator-nugget: nquake vs stock KTX differ here (-> L3/wiki + admin awareness). No action. |
| 9 | k_ctf_hookstyle | cvar | curated | CLEAR | Excellent synthesis. Wide read (WI-1): all behavioural reads = grapple.c (cited) + vote.c setters confirm 1/2/3/4 all votable. Verified each value: 1 grapple.c:62/216/402 (halved refire, ~250ms cancel [source's OWN comment], accel/decel pull); 2 :221/402 (~80ms cancel, fixed pull); 3 :443/212/464 (THROW_SPEED, no cancel); 4 :447/226 (CR_THROW_SPEED, immediate cancel). Curated concern handled correctly via D10: shipped cfg documents only 1/2/3, source has real votable value 4 -> L1 now MORE complete than shipped doc (the arc value-add). Operator-nugget: hookstyle 4 votable but cfg-undocumented (-> CTF/hook L3). No action. |
| 10 | k_demoname_date | cvar | curated | CLEAR | High-quality synthesis. Wide read (WI-1): only 2 sites (world.c:938 register+comment, match.c:2337 read) -- both accounted, no under-grep. Verified match.c:2337-2341: free strftime format -> QVMstrftime -> strlcat to demoname; empty -> skipped. Correctly debunked the doubly-wrong shipped-cfg comment ("YYYY-MM-DD" -- but it is arbitrary strftime AND the shipped %Y%m%d-%H%M yields YYYYMMDD-HHMM); D10 source-truth, conflict surfaced as C2. L1 now more accurate than shipped doc. No action. |
| 11 | k_disallow_weapons | cvar | curated | **FIX** (re-synthesis) | Curated polarity concern handled CORRECTLY (verified: cvar `disallow`, var `disallowed_weapons`, `items & ~mask` strips; bit table sg=1..axe=4096 matches g_consts.h via g_utils.c:2159-2194). BUT WI-1 wide-read: UNDER-SCOPED (same root cause as dmm5/allow_toggle_practice). Description says "dmm4 only, inventory strip". Source: client.c:2358 inventory strip = dmm4&match (ok); match.c:875 weapon MAP-ENTITY removal = `deathmatch>=4` = dmm4 AND dmm5 (src comment "deathmatches (4 or 5) unless ToT"); fb_globals.c:203 `fb_lg_disabled()` bot-LG effect NOT mode-gated. Missing dmm5 scope + map-pickup-removal + bot effect. CROSS-LINK: corroborates row-4 dmm5=dmm4-family. Re-synth: keep polarity+bits, broaden to dmm4&dmm5, add map-entity removal (+ToT exception) + non-gated bot-LG effect. |
| 12 | k_free_mode | cvar | curated | **FIX** (re-synthesis) | Curated C2 concern handled CORRECTLY -- check_perm ladder (0 none / 1 real-adm / 2 adm / 3-4 judges-NOT-implemented-deny / 5 all, commands.c:1513-1551) source-exact; matchless forces 5 (commands.c:4634) exact; shipped-cfg-vs-source divergence a real C2, D10 source-truth call right. BUT WI-1 wide-read: UNDER-SCOPED (same root cause as dmm5/allow_toggle_practice/k_disallow_weapons -- 4th of the class). Reasoning cited only the player path (4634 read + 4723 check_perm); MISSED commands.c:4714-4722: SERVER-invoked switch (`UserMode(-x)`, sv_invoked) uses k_free_mode as a BINARY gate -- only ==5 permits, else discarded ("sv ... discarded due to k_free_mode"), check_perm NOT consulted. Live sv callers: world.c:1145 map-switch auto-reapply of last XonX, world.c:558/1253, race.c:260, bot_commands.c:2150/2436 -- so k_free_mode<5 set to lock player mode-switching ALSO silently disables the server's own map-switch XonX auto-reapply (real, surprising admin consequence). Dev comment commands.c:4712 ("I didn't understand how k_free_mode affect this command") flagged the murk the synthesis should have surfaced. |
| 13 | downspecs | command | HTML#1 synth | CLEAR | High-quality. `downspecs` literal only at commands.c:983 registration (shared handler `DEF(downplayers)`, cmd_t arg 2); behaviour fully in the cited shared path. Verified ChangeClientsCount commands.c:8017-8055: match_in_progress -> return (:8022), k_allowcountchange perm gate (:8027), type=bound(1,t,2) + type==2 -> sv_max=maxspectators/k_max=k_maxspectators (:8032-8037), cl_count=bound(1, cvar(sv_max)-1, max(1,cvar(k_max))) (:8046), unchanged -> silent return (:8048), cvar_fset + G_bprint broadcast (:8053-54). Reg cohort 980-983 confirms upplayers/1, downplayers/1, upspecs(DEF upplayers)/2, downspecs(DEF downplayers)/2 -- shared-handler cohort correctly flagged (anti-collapse: described the type==2 maxspectators path specifically, NOT family-collapsed). Shipped CD_DOWNSPECS "decrease maxspectators" correctly graded D5-fail. Description source-exact. NOT the multi-read-site under-scope class (single literal site + fully-cited shared handler). No action. |
| 14 | next_best | command | HTML#3 affirm | CLEAR-fact; affirm-judg -> queue (PROC-1) | Affirmed verbatim CD_NEXT_BEST "set pov to next best player" (commands.c:516, origin source_inline). Handler next_best() commands.c:6311-6340 verified source-exact: b1=get_ed_best1()/b2=get_ed_best2(); !b1 -> "next_best: can't do this now" return (:6319); top-2 TOGGLE -- to=b1, if goal==b1 ->b2 elif goal==b2 ->b1 (:6326-6334); stuffcmd `track <id>` (:6338). Reg :896 CF_SPECTATOR|CF_MATCHLESS. WI-1: uncited :161 fwd-decl (no behaviour) + the :6135-6144 "ktpro compatible autotrack" comment block correctly OUT OF SCOPE -- that block heads a SEPARATE event-driven autotrack subsystem (rl-taken / observed-dies / powerup), NOT this one-shot command's own behaviour; reasoning rightly scoped to the handler. Shipped text source-accurate, all D5 clauses pass, the top-2-toggle is acknowledged mechanism nuance; terse verbatim (NOT the elaborated-affirm anti-pattern). FACT source-accurate; affirm-vs-synth judgment -> Affirmed-sample judgment queue (PROC-1), NOT a silent CLEAR. |
| 15 | toggletracklist | command | HTML#4 synth | CLEAR (fact) | Synth description source-exact. Handler commands.c:5457-5476: k_allowtracklist=!cvar (:5459); match_in_progress -> return BEFORE cvar_fset (:5461, "no effect during match" exact); cvar_fset (:5466); G_bprint on/off (:5468-5474). Companion gate tracklist commands.c:5433: blocks only when !k_allowtracklist && match_in_progress && self->ct==ctPlayer -> "tracklist is disabled" (matches the description's "players ... during a match" scoping exactly). WI-1 grep exhaustive: uncited hits = :145/146 fwd-decls + :5188/5192 (the `klist` command's "also toggle tracklist" x-ref string, NOT this handler) + world.c:862 cvar reg default 1 -- all correctly out of scope, no behavioural under-scope. Shared macro CD_TRACKLIST on both :842 tracklist + :843 toggletracklist = shared-STRING cohort (NOT a C2 -- one macro on two commands, not two docs disagreeing on one knob); D10 synthesize-from-handler is the policy-mandated resolution, consistent with the accepted downspecs/cohort pattern + slice-2 STATUS. PROC-1: pure checkable fact, no residual judgment. No action. |
| 16 | gamemodes | command | HTML#6 affirm | CLEAR-fact; affirm-judg -> queue (PROC-1) | FACT source-accurate: handler ListGameModes commands.c:9513-9552 verified -- static known[] (25 entries: race/1on1/.../wipeout/yawnmode/totmode), iterates cmds[], G_sprint each registered command name that is in known[] (= the game-mode-selection commands actually registered on this server). WI-1: only 3 sites (:289 fwd-decl, :1062 reg, :9513 handler), all cited, no under-scope. Affirmed verbatim CD_GAMEMODES "list available game modes" (:684). Affirm-vs-synth read in the Affirmed-sample judgment queue. NOT a silent CLEAR. |
| 17 | k_privategame_force_reconnect | cvar | HTML#8 synth | CLEAR (fact) | Synth source-exact. private_game_toggle() vote.c:1550-1598: read :1553; player block gated `enable && match_in_progress<2` (:1559); per non-logged-in player -- always unready (:1576-1580); `if(force_reconnect && !is_logged_in)` (:1582) -> allow_specs (k_privategame_allow_specs) ? do_force_spec + "You must login to play." (:1587-88) : disconnect + "Please reconnect & login" (:1592-93); force_reconnect=0 -> unready-only, left connected (src comment :1586 "kicked at map change anyway"). Every description clause verified. WI-1 exhaustive: ONLY 3 sites (world.c:1091 reg+comment, vote.c:1553 read, vote.c:1582 use) -- single-read-site, NOT the multi-site class. Reg comment "kick unauthed players" correctly classified a less-precise SUBSET (omits the allow_specs branch) -> D10 synth-from-source, NOT a C2. Description does not conflate with the separate :1564 !allow_specs existing-spectator kick. PROC-1: checkable fact, no residual judgment. No action. |
| 18 | race_toggle | command | HTML#9 affirm | CLEAR-fact; affirm-judg -> queue (PROC-1, lean SYNTH) | FACT source-accurate: reg commands.c:1007 DEF(r_changestatus) arg 3; r_changestatus case 3 race.c:3050-3059 -- `if (self->racer && race.status)` -> G_bprint "%s has quit the race" + race_end(self,true,false) (:3053-54), THEN set_player_race_ready(self, !self->race_ready) (:3057). WI-1: race.c:4269 race_toggle_incr_cvar = false-positive substring (unrelated headstart/resolution helper, NOT this command); commands.c:7970 r_changestatus(3) = internal caller (same path, not new behaviour). Affirmed verbatim CD_RTOGGLE "toggle ready status for race" (:633). Affirm-vs-synth: OMITS a behaviorally-material mid-run side-effect (running it mid-race publicly QUITS your run -- "X has quit the race" -- before toggling); weaker affirm than next_best/gamemodes, my lean = SYNTHESIZE. In the queue. NOT a silent CLEAR. |
| 20 | breakondeath:frogbot:std | command | HTML#11 affirm | CLEAR-fact; affirm-judg -> queue (PROC-1, lean AFFIRM) | FACT source-accurate. WI-1 EXHAUSTIVE on the cvar FB_CVAR_BREAK_ON_DEATH (=k_fb_break_on_death): reg world.c:1065 default 1; toggle handler FrogbotsSetBreakOnDeath bot_commands.c:2219-2230 (bots_enabled gate; cvar_fset !cvar :2227; G_sprint "changed to on/off" :2228); behavioural read player.c:1145 `if(!self->isBot && tot_mode_enabled() && cvar(...))` -> PlayerBreak; match.c:1789 = non-behavioural settings-display read (correctly out of scope, NOT under-scope). Affirmed verbatim. Affirm-vs-synth: genuine terse /botcmd user-help line; omits the tot_mode/human gate but that is implied by the frogbot-practice context this command lives in. lean = AFFIRM (mild). Queue (frogbot-help-string cluster). NOT a silent CLEAR. |
| 19 | addbot:frogbot:std | command | HTML#10 affirm | CLEAR-fact; affirm-judg -> queue (PROC-1, lean strong AFFIRM) | FACT source-accurate: std_commands table bot_commands.c:2318 `{ "addbot", FrogbotsAddbot_f, "Adds a bot. Skill & team optional" }`; handler FrogbotsAddbot_f :362-392 -- !bots_enabled -> "Bots are disabled" return (:368); optional numeric argv[2]=skill (:375-380), argv[3]=team; FrogbotsAddbot(skill,team,true) (:392) spawns one bot, clamps skill, auto-balances teams. WI-1: :1908 + :2790 are OTHER internal FrogbotsAddbot callers (different contexts, not this std command). Affirmed verbatim. Affirm-vs-synth: the string is a GENUINE user-facing help line (PrintAvailableCommands prints it to players in /botcmd), terse-by-design for a command list, accurate WHAT, no hidden material side-effect; my lean = strong AFFIRM (contrast race_toggle). In the queue. NOT a silent CLEAR. |
| 35 | k_spw | cvar | HTML#32 synth | CLEAR (fact) | WI-1 EXHAUSTIVE: many sites, all accounted. Authoritative enum respawn_model_name() g_utils.c:2663 verified case-exact vs description: -1 "pre-qtest nonrandom respawns" / 0 "Normal QW respawns" / 1 "KT SpawnSafety" / 2 "Kombat Teams respawns" / 3 "KTX respawns" / 4 "KTX2 respawns" (description's "non-random"/"spawn-safety" = orthographic normalization only, not a divergence). Behavioural branches verified: -1 = static sequential ez_find cycling w/ wrap (client.c:1063-1073, non-random); 0 = plain valid-spot find, no protections (k_spw falsy at :1122, skipped at :1113); k_spw 2/3/4 = nearby-player spot-discard + `self->k_1spawn=time+2.6` window (client.c:1109-1140, source comments "treat this spot as not valid" + "protect ... from be spawnfragged") = the description's "anti-telefrag"; same-spawn-avoidance verified BOTH paths -- k_spw 1/2/3 last-spot discard (client.c:1122 `k_spw && k_spw!=4 && self->k_lastspawn==spot`, source "protection from spawn twice on the same spot") AND k_spw 4 double-reselect (client.c:1301 SelectSpawnPoint recheck, source "low chance to get same spawn point") = the description's "same-spawn-avoidance logic". UNCITED sites all corroborate / non-behavioural, NOT under-scope class: toggle cmd commands.c:2678 `bound(-1,cvar("k_spw"),4)` + `++k_spw>4 -> -1` wrap CORROBORATES the exact -1..4 range (description makes no setting/command claim); register world.c:856 `RegisterCvar("k_spw")` default ""/0 = enum "Normal QW" (consistent); status prints match.c:1599 / commands.c:1937 non-behavioural; match.c:1596/2082 commented-out inert; config strings race.c:300 / commands.c:4196/4449/4477/4501/4528 / cvar_fset :8886 are per-mode applications, not behaviour-defining. NO out-of-scope hedge (predictor n/a -- reasoning traced enum + branches). C2/D10: the mechanical-candidate's two shipped-cfg provenance variants CONFLICT (one lists 0-4 incl "4=ktx2 respawns", the other only 0-3); source enum authoritative AND recovers value -1 BOTH candidates omit -> value-ADD (L1 more complete than either shipped doc), C2 surfaced in the reasoning not silently absorbed -- consistent with operator-accepted D10/dual-doc precedent (k_demoname_date / k_noframechecks canary PASS / k_ctf_hookstyle votable-4). WI-2 CLEAN BY ABSENCE: no "(default)" claim -- and critically the synthesis correctly did NOT mislabel any of the 7 shipped config-string values (1 and 4) as the registered default (the exact WI-2 trap r25 k_highspeed fell into; here avoided); cvar, no command-class claim. PROC-1: pure checkable fact (6-value enum source-exact + behavioural summary source-verified incl. both same-spawn paths + D10 reduces to a deterministic source read), no residual judgment. No action. |
| 34 | k_pow_pickup | cvar | HTML#31 synth | **FIX** (re-synthesis) -- precision, NEW flavour C (untraced-downstream-consequence) | WI-1 EXHAUSTIVE: 4 sites. CITED+verified: register world.c:818 `RegisterCvarEx("k_pow_pickup","0")`, gate items.c:2046 `if(cvar("k_pow_pickup"))`, corroborating comment items.c:2044 "if \"fair\" powerups pickup is activated, don't allow ... same kind (ie 2 quads)". UNCITED (traced, correctly out of scope -- NOT under-scope class): commands.c:2853 TogglePuPickup (prewar-only toggle cmd `if(match_in_progress) return`, redtext "new powerups pickup (no multi pickup)" -- CORROBORATES polarity; description makes no setting/command claim); commands.c:4162 common_um_init `"k_pow_pickup 0\n"` (mode-init config string -- CORROBORATES the 0 default, not a behaviour site). NO out-of-scope hedge in reasoning (predictor does not fire). Primary cvar=1 gate behaviour IS correctly scoped + source-exact: 4 streq guards items.c:2048-2069 (envirosuit/radsuit_finished=suit, invulnerability/invincible_finished=pentagram, invisibility/invisible_finished=ring, super_damage/super_damage_finished=quad; each `*_finished > time -> return` = "cannot re-pick same kind until expiry") -- description EXACT. WI-2 CLEAN: "0 (default)" is the TRUE registered default (RegisterCvarEx(...,"0") world.c:818, double-corroborated by common_um_init) -- good contrast to r25 k_highspeed's wrong "Default 320"; cvar, no command-class claim. **THE DEFECT (PROC-1, checkable fact)**: the cvar=0 parenthetical "(allowing the timer to stack)" is FACTUALLY FALSE. Grant code items.c:2134-2212 (UNTRACED by the synthesis): normal map powerup -> flat `*_finished = g_globalvars.time + 30` (p_cnt stays NULL, reset to a fresh 30s, NOT additive -- 25s-left + new quad = 30s not 55s); dropped powerup -> `p_cnt[0]=max(time,old_pu_time)+seconds_left` THEN `p_cnt[0]=min(g_globalvars.time+30,p_cnt[0])` with the literal source comment "// do not allow more than 30 seconds of quad anyway." Source EXPLICITLY caps at 30s and EXPLICITLY prevents stacking; "stack" directly CONTRADICTS the anti-stacking cap and is behaviourally material (reader believes 2 quads ~= 60s; source guarantees <=30s). NEW FIX flavour C: primary behaviour correctly traced+source-exact (NOT sub-class A under-scope), defect NOT default-metadata/command-class (NOT sub-class B) -- it is an INFERRED cvar=0 downstream-consequence clause the synthesis never traced to the grant code, which contradicts it. Re-synth (C4, operator-gated, NOT auto-applied): KEEP polarity (1=fair/block same-kind re-pickup until expiry; 0=default re-pickup allowed) + the 4-kinds gate + "0 (default)"; FIX the 0-case parenthetical -> re-pickup REFRESHES the timer (map powerup: reset to a fresh 30s, NOT additive; dropped powerup: remaining time added but HARD-CAPPED at 30s total) -- it does NOT accumulate beyond one powerup's 30s duration. Optional: cross-ref the prewar-only toggle TogglePuPickup. |
| 33 | timeup | command | HTML#29 synth | CLEAR (fact) | WI-1 EXHAUSTIVE: `timeup`/`TimeUp` 3 sites (fwd-decl :236, reg commands.c:734 `DEF(TimeUp),5.0f`, handler :2977); `overtimeup`:799 + help-string :1577 = false-positive substrings (correctly out of scope); cohort sibling `timeup1`:732 (1.0f, distinct entity). NOT under-scope. Handler TimeUp(t=5) :2977-3015 every clause source-exact: mid-match guard; ramp `(t==5)&&timelimit==0->1`/`==1->3`/`==3->5`; else `timelimit+=t` (+5); `bound(0,timelimit,cvar("k_timetop"))` (consistent w/ r31); `tl==timelimit`->"still N" caller-only; `cvar_fset("timelimit")`+`G_bprint` announce. KEY WI-1 WIN -- VERIFIED an asymmetry, did not assume: TimeUp has NO hoony branch AND NO both-<=0 refusal (TimeDown r32 had BOTH); the synthesis correctly DIFFERENTIATED (timeup desc omits hoony/refusal because the source genuinely lacks them) = precision, NOT under-scope. ANTI-COLLAPSE correct (ramp keyed to t=5, not family-collapsed w/ timeup1 t=1). WI-2 clean: no false "Default"/command-class claim (CF_PLAYER\|CF_SPC_ADMIN, silent on privilege). CD_TIMEUP "+5 mins match time" simplification -> D10 synth-from-handler, ONE input not verdict, surfaced not auto-resolved, accepted timedown/downspecs precedent. PROC-1: checkable fact, no residual judgment. No action. |
| 32 | timedown | command | HTML#28 synth | CLEAR (fact) | WI-1 EXHAUSTIVE: `timedown`/`TimeDown` 3 sites (fwd-decl :235, reg commands.c:733 `DEF(TimeDown),5.0f,CF_PLAYER\|CF_SPC_ADMIN`, handler :2930) + help-string :1577 (plumbing); cohort sibling `timedown1` :731 (1.0f, distinct entity evaluated separately). NOT under-scope. Handler TimeDown(t) :2930-2975 with this entity's t=5 every clause source-exact: mid-match guard (`if(match_in_progress) return`); hoony `(t==5)&&isHoonyModeAny()->t=2` then flat -2 (ramp skipped since t!=5); ramp `(t==5)&&timelimit==5->3` / `==3->1`; else `timelimit-=t` (-5); `bound(0,timelimit,cvar("k_timetop"))` (consistent w/ r31); both-<=0 -> "need some timelimit or fraglimit" + revert to tl; `cvar_set("timelimit")` + `G_bprint` "Match length set to N minute(s)". ANTI-COLLAPSE correct (the accepted downspecs/toggletracklist shared-handler pattern): all ramp/hoony keyed to the 5-step, NOT family-collapsed with timedown1(t=1). Minor unstated sub-case (`tl==timelimit` -> "timelimit still N" caller-only no-change feedback) immaterial -- all primary behaviour + guards + refusal stated. WI-2 clean: no false "Default"/command-class claim (CF_PLAYER\|CF_SPC_ADMIN, description correctly silent on privilege). CD_TIMEDOWN "-5 mins match time" simplification -> D10 synth-from-handler, ONE input not a verdict, surfaced not auto-resolved, consistent with accepted slice-2/downspecs precedent (NOT a source-to-source C2). PROC-1: checkable fact, no residual judgment (synth, mechanical_candidate 'none', cohort + CD-simplification handled per accepted pattern). No action. |
| 31 | k_timetop | cvar | HTML#27 affirm | CLEAR-fact; affirm-judg -> queue (PROC-1, lean **SYNTHESIZE** -- elaborated-affirm/provenance-correctness) | FACT source-accurate. WI-1 EXHAUSTIVE: `k_timetop` 6 sites ALL accounted -- 3 vote clamps `bound(0,timelimit/t,cvar("k_timetop"))` commands.c:2957/3003/3026 (time/timeup/timeset), register world.c:934, FixRules clamp `bound(0,cvar("k_timetop"),600)` world.c:1554, `if(k_tt<=0) cvar_fset("k_timetop",k_tt=30)` world.c:1696. NOT under-scope. Every clause source-exact (player time-vote ceiling / 0-600 clamp / <=0->30 reset). Affirm-vs-synth: **the reasoning openly states the worker EXTENDED the candidate** ("maximum time in minutes allocateable by a player for a game") with source-derived numerics (the 0-600 clamp + reset-to-30) yet recorded affirmed / origin source_inline / NO anchor. Those numerics (600, 30) are source-VERSION-specific synthesized facts, not the dev's words; under an unanchored affirm they are UNPROTECTED against source drift (staleness machinery keys on description_anchor_version, null on affirmed). lean = SYNTHESIZE: an extended-affirm carrying synthesized version-specific numerics should be origin=synthesized + anchor 1.47-2-g67253dc so 600/30 are re-reviewed on drift. DISTINCT judgment sub-type = "extended-with-synthesized-numerics affirm" (provenance-correctness + staleness consequence) -- qualitatively different from the terse-verbatim affirms (frogbot strings, k_motd_time, k_sayteam_to_spec). Operator options: (a) keep affirmed-with-extension (numerics unprotected), (b) reclassify SYNTHESIZE+anchor [lean], (c) trim to verbatim candidate (true affirm). NOT a silent CLEAR. |
| 30 | k_sayteam_to_spec | cvar | HTML#26 affirm | CLEAR-fact; affirm-judg -> queue (PROC-1, lean strong AFFIRM) | FACT source-accurate. WI-1 EXHAUSTIVE: `k_sayteam_to_spec` 4 sites (register world.c:864, read world.c:1443 + switch :1447 + call :1578 -- all FixSayTeamToSpecs); companion `sv_sayteam_to_spec` 4 sites (current-read :1444, write :1468, consumer g_cmd.c:297/528 = the actual say_team->spec gate). NOT under-scope. FixSayTeamToSpecs world.c:1441-1469 switch verified 1:1 vs the enum: case 0->0 (never), case 1->`match_in_progress?1:0` (only during game), case 2->`match_in_progress?0:1` (only during prewar), default(3)->1 (always); `bound(0,..,3)` clamps cleanly. Affirm-vs-synth: among the cleanest of the walk -- fully-spelled 4-value enum mapping EXACTLY to the source switch (every value incl. the match_in_progress conditionals verified, not merely WHAT-accurate), DOUBLE-config corroborated (ktx-example + nquake ktx.cfg:125 identical text, both ship 1). Only omission = the k_->sv_ engine-cvar bridge (implementation mechanism, not admin-relevant). lean = strong AFFIRM (shipped-cfg-comment cluster w/ k_allowvoteadmin/k_exclusive/k_motd_time, cleaner -- exact enum-to-switch). WI-2 clean: no "Default" claim (correct -- 1 is the shipped value not the registered default which is ""/0 via RegisterCvar); cvar, no command-class claim. NOT a silent CLEAR. |
| 29 | k_noframechecks | cvar | HTML#25 synth | CLEAR (fact) -- **D10 canary PASS** | WI-1 EXHAUSTIVE: `k_noframechecks` 2 sites (register world.c:946, polarity world.c:1862); `framechecks` 4 sites ALL accounted (decl globals.c:26, assign world.c:1862, status commands.c:2032 `Enabled(framechecks)`, enforcement client.c:3824). NOT under-scope. **D10 polarity verified deterministic**: `framechecks = bound(0, !cvar("k_noframechecks"), 1)` -- cvar 0 -> !0=1 -> framechecks 1 = checks ON (default); cvar 1 -> !1=0 -> framechecks 0 = OFF. ZERO interpretive latitude. client.c:3824 `if(... && framechecks && !self->isBot)` gates two checks: uptime (`r>103 && !match_in_progress` warn -> `uptimebugpolicy>3` stuffcmd disconnect) + FPS (`fps>current_maxfps+2` warn -> `fIllegalFPSWarnings>3` stuffcmd disconnect); `!isBot` = bots exempt. Every description clause source-accurate. **C2 framing-conflict**: ktx-example ktx.cfg:4 "disable check (0=no,1=yes)" vs nquake ktx.cfg:5 "check (0=yes,1=no)" -- decoded, BOTH encode the SAME mapping (0=on,1=off); the conflict is INVERTED PROSE, not value->behavior; synthesized "(0=checks on,1=checks off)" matches source AND both configs' actual mappings. C2 surfaced not auto-absorbed. WI-2 clean: "the default; cvar 0" correct (RegisterCvar->RegisterCvarEx(var,"")=""/0, both configs ship 0 -- good inverse of r25's "Default 320" error); cvar, no command-class claim. PROC-1: D10 call reduces to checkable arithmetic (no judgment latitude -- any reviewer computing the !cvar inversion gets the same answer, consistent with both configs), no residual judgment. **Canary verdict: D10 PASS.** No action. |
| 28 | k_motd_time | cvar | HTML#24 affirm | CLEAR-fact; affirm-judg -> queue (PROC-1, lean strong AFFIRM) | FACT source-accurate. WI-1 EXHAUSTIVE: 2 sites -- register world.c:841 (+comment "motd time in seconds"), single read motd.c:139 in MakeMOTD. NOT under-scope. `int i = bound(0,cvar("k_motd_time"),30); motd->attack_finished = g_globalvars.time + (i ? i : (k_matchLess?3:7))` -- k_motd_time = MOTD display seconds, clamped 0..30, 0 -> fallback (3 matchless / 7 else). Affirmed text "time motd is displayed in seconds" = WHAT+unit exact. Affirm-vs-synth: TRIPLE agreement (shipped-doc candidate nquake port_template.cfg:8 + independent code comment world.c:841 + runtime behaviour all say seconds) = cleanest affirm class (contrast r21 clearmarkerflag copy-paste artifact). Omits clamp(<=30) + 0->default fallback = mechanism depth not a misleading WHAT, no hidden side-effect (cf k_exclusive cap-vs-roster, AFFIRM). WI-2 clean: no "Default" claim (true registered default ""/0 via RegisterCvarEx(var,""); good contrast to r25 k_highspeed's wrong "Default 320"); cvar, no command-class claim. lean = strong AFFIRM (terse-doc/shipped-cfg cluster w/ k_allowvoteadmin, k_exclusive). Operator-nugget L3/admin: k_motd_time=0 does NOT disable MOTD (falls back 3/7s), max clamped 30s. NOT a silent CLEAR. |
| 27 | votemap | command | HTML#23 synth | **FIX** (re-synthesis) -- under-scope sub-A (callee-truncation); meaning INVERSION, highest severity of the walk | WI-1: command path votemap (commands.c:701 CF_BOTH\|CF_MATCHLESS\|CF_PARAMS) -> VoteMap (maps.c:503) -> VoteMapSpecific (maps.c:486) -> DoSelectMap (maps.c:392). Synthesis EXPLICITLY scoped OUT DoSelectMap ("any vote/threshold semantics, if present, live inside DoSelectMap which is out of this knob's authoritative read-site") and asserted the OPPOSITE: "direct map change ... performed immediately". Traced DoSelectMap maps.c:392-470 -- it is a VOTE CAST + TALLY, not a direct switch: 7/15s time gate ("Wait N seconds"); k_matchLess+k_no_vote_map block; non-matchless `else if(match_in_progress) return`; `if((self->ct==ctSpec) && !is_adm(self)) return` (non-admin specs CANNOT vote map); k_lockmap respected; registers caller's vote `self->v.map=k_lastvotedmap=iMap`; broadcasts "X suggests/agrees/would rather play on map"; `vote_check_map()` tallies, switch only if threshold passes. EVERY distinctive description clause FALSE: "direct ... immediately" (it's a vote), "usable by players and spectators" (non-admin specs blocked), "no match restriction" (match + matchless + time gates). CD_VOTEMAP label "alternative map vote system" + the `// Perform vote` comment maps.c:497 + the names VoteMap/votemap ALL said vote; synthesis overrode all by declaring the callee out of scope. Root cause = WI-1/sub-A under-scope (callee-truncation flavour: declared a callee out-of-scope, asserted a claim the callee contradicts). 5th under-scope FIX (rows 4/5/11/12 + 27). Re-synth: votemap CASTS a map vote (not a direct change) -- arg = mapname; argc<2 -> "Usage: votemap <mapname>"; GetMapNum==0 -> "Map '%s' not available on this server"; else registers a vote via DoSelectMap (time gate 7s/15s-matchless; blocked mid-match non-matchless / k_no_vote_map / k_lockmap-unless-adm; non-admin spectators cannot vote; vote_check_map tallies and only switches level when the vote passes). State the gates + that the actual level change is vote-thresholded, NOT immediate. |
| 26 | toggleklist | command | HTML#22 synth | CLEAR (fact) | WI-1 EXHAUSTIVE: `toggleklist` 3 sites (fwd-decl :147, reg commands.c:834, handler :5175); `k_allowklist` 5 sites ALL accounted -- register world.c:861 RegisterCvarEx("k_allowklist","1") (explicit default 1), consumer klist() :5077 (`!cvar("k_allowklist") && match_in_progress && self->ct==ctPlayer` -> "klist is disabled" return), handler :5177/:5184/:5186. Consumer cited+verified -> NOT under-scope class. Handler toggleklist() :5175-5194 every clause source-exact: k_allowklist=!cvar (:5177) toggle; `if(match_in_progress) return` (:5179) BEFORE cvar_fset -> command ignored mid-match (the pre-guard local is harmless dead computation on the match path); cvar_fset("k_allowklist",..) (:5184); G_bprint on/off + "remember to also toggle tracklist" (:5186-5193) = broadcast-to-all. Description's "controls whether klist usable by players during a match" matches the :5077 consumer exactly. CD_TRACKLIST label-reuse at :834 (= "trackers list", :464) correctly REJECTED as shipped_value-only -- consistent with the operator-accepted row-15 toggletracklist precedent (same shared-string macro; D10 synth-from-handler; label-reuse NOT a source-to-source C2). WI-2 check clean: no "Default" claim (true registered default "1" would have been correct anyway); no command-class mis-scope (toggleklist reg = CF_BOTH|CF_MATCHLESS; "players" refers to the consumer's ctPlayer guard, not a privilege claim). PROC-1: checkable fact, no residual judgment (synth, mechanical_candidate 'none', shared-string handling policy-mandated per accepted precedent). No action. |
| 25 | k_highspeed | cvar | HTML#21 synth | **FIX** (re-synthesis) -- precision, NOT the under-scope class | WI-1 EXHAUSTIVE: `k_highspeed` 2 sites only -- bare register world.c:870, single read commands.c:3230 inside ToggleSpeed (the "speed" command commands.c:757). Core toggle synthesis is CORRECT + D10 call right: ToggleSpeed commands.c:3215 toggles k_maxspeed between hardcoded 320 (:3226) and bound(0,cvar("k_highspeed"),9999) (:3230), then cvar_fset("sv_maxspeed",k_maxspeed) (:3234) + per-player p->maxspeed loop -- the synthesis correctly rejected the imprecise shipped-cfg "switch between this setting and sv_maxspeed" (sv_maxspeed is the OUTPUT target). BUT two FACTUAL defects in the synthesized text (WI-1-caught, machine-gate-invisible): (a) **"Default 320" is WRONG** -- RegisterCvar("k_highspeed") = RegisterCvarEx(var,"") (world.c:752-754), registered default is empty -> 0; 320 is ONLY the ktx example-config shipped value (ktx.cfg:17, single config sampled, NOT cross-checked vs nquake-distfiles which rows 8/24 prove diverges) -- the exact shipped-cfg-vs-registered-default conflation D10/dual-doc exists to prevent. (b) **"the admin 'speed' command" is WRONG** -- commands.c:757 flag = CF_PLAYER (adjacent prewar/lockmap are CF_BOTH_ADMIN); ToggleSpeed has NO admin check, only `if(match_in_progress) return`; any player toggles server maxspeed in prewar. Minor: omits the match_in_progress no-op (prewar-only). Re-synth: KEEP the toggle behaviour + units + 0-9999 clamp + D10 sv_maxspeed-is-output call; FIX "Default 320" -> registered default empty/0 (320 = ktx-example-cfg shipped value, C2 distribution-drift caveat per the k_cmd_fp_dontkick/k_exclusive precedent); FIX "admin" -> CF_PLAYER prewar player command; ADD the match_in_progress precondition. DISTINCT root cause from the 4-row under-scope cluster (single-site, default-metadata + command-class precision) -- the under-scope re-fan strategy would NOT catch this. |
| 24 | k_exclusive | cvar | HTML#20 affirm | CLEAR-fact; affirm-judg -> queue (PROC-1, lean AFFIRM) | FACT source-accurate. WI-1 EXHAUSTIVE: 3 sites -- behavioural client.c:1455 (`if((CountPlayers()>=k_attendees) && cvar("k_exclusive"))` -> "Sorry, server is full / Please reconnect as spectator" return false, in the match-in-progress connect-permission path); register world.c:940 (+comment); toggle commands.c:8620 (cvar_toggle_msg "exclusive mode"). NOT under-scope -- single behavioural site. Companion `k_attendees = CountPlayers()` snapshots at match-start (match.c:2022/2632/2724/2889, admin.c:594/678) -> confirms "locked on game start". Enum 0=no/1=yes truthiness-exact. Affirm-vs-synth: shipped-cfg comment WHAT-accurate for the admin effect (player cap locks at game-start count); cap-vs-roster subtlety (leaver frees a slot up to the cap) is mechanism depth not a misleading WHAT, no hidden side-effect (contrast race_toggle). lean = AFFIRM (shipped-cfg-comment cluster w/ k_allowvoteadmin). C2 default-drift (ktx-repo ktx.cfg ships 1, nquake-distfiles ships 0) correctly classified per-distribution drift NOT semantic conflict -- consistent with operator-accepted k_cmd_fp_dontkick (row 8) precedent. Operator-nugget (L3/admin): nquake vs stock KTX differ on k_exclusive default. NOT a silent CLEAR. |
| 23 | k_allowvoteadmin | cvar | HTML#18 affirm | CLEAR-fact; affirm-judg -> queue (PROC-1, lean strong AFFIRM) | FACT source-accurate. WI-1 EXHAUSTIVE: 3 sites -- behavioural admin.c:497 (`if(!cvar("k_allowvoteadmin"))` -> "Admin election is not allowed on this server" return, inside VoteAdmin admin.c:450 = the 'elect' command commands.c:800 CD_ELECT, after the k_admins gate :489); bare register world.c:878 (reasoning omitted, immaterial -- no behaviour/comment); status-print commands.c:2030 (correctly classified non-behavioural). NOT under-scope class -- single behavioural site, fully cited. Enum 0=no/1=yes is cvar-truthiness-exact. Affirmed shipped-cfg comment (identical ktx-repo example + nquake-distfiles). Affirm-vs-synth: precise, enum code-matching, WHAT-accurate; omits only cross-cvar nuance (k_allowvoteadmin=0 blocks the elect route but password-admin stays governed by k_admins) = L3 admin-config concept-note material, not a defect in a terse single-cvar doc. lean = strong AFFIRM (config comment exactly describing its own binary gate; cleaner than the frogbot-help cluster). Operator-nugget for L3 admin/voting note: disabling vote-admin != disabling all admin (k_admins still governs the password path). NOT a silent CLEAR. |
| 22 | removemarker:frogbot:editor | command | HTML#13 affirm | CLEAR-fact; affirm-judg -> queue (PROC-1, lean AFFIRM) | FACT source-accurate. WI-1 EXHAUSTIVE: `removemarker` literal ONLY bot_commands.c:2335; `FrogbotRemoveMarker` = def :1199 + table :2335, NO other callers -- single-site, NOT under-scope class. Handler :1199-1223 verified: nearest=LocateMarker(self origin); !nearest -> "No marker found nearby" return; !streq(classname,"marker") -> "Cannot remove non-manual markers" return; saved_marker==nearest -> DeselectMarker + saved_marker=NULL; RemoveMarker(nearest) (route_fields.c:121). Affirmed string "Removes a routing marker from the map" = WHAT-accurate. Affirm-vs-synth: genuine user-facing editor help line (PrintAvailableCommands prints commands[i].description), terse-by-design; omits nearest-targeting + manual-only refusal, but both are editor-command mechanism implied by context (universal LocateMarker(nearest) idiom across editor_commands[] siblings) and the manual-only guard is a no-op-with-message refusal NOT a material hidden side-effect (contrast race_toggle). lean = AFFIRM (terse-genuine-help-line cluster: addbot/breakondeath/gamemodes/next_best). Corroboration: r21/r22 adjacent editor_commands[] siblings -- clearmarkerflag string was copy-paste artifact (correctly synthesized), removemarker string factually correct (correctly affirmed); pipeline discriminated correctly within the same code neighborhood. NOT a silent CLEAR. |
| 21 | clearmarkerflag:frogbot:editor | command | HTML#12 synth | CLEAR (fact) | Synth source-exact, D10 call correct. WI-1 EXHAUSTIVE: `clearmarkerflag` literal ONLY bot_commands.c:2342; `FrogbotClearMarkerFlag` = def :1540 + table :2342, NO other callers -- single-site, NOT the multi-read-site under-scope class. Handler :1540-1568 verified every clause: editor-mode gate (FrogbotsCommand :2386 FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) -> editor_commands[]); `nearest=LocateMarker(self origin)` (marker_util.c:162 -> LocateNextMarker, the universal `nearest` idiom 11+ sites); nearest==NULL -> "No marker nearby" return; argc<3 -> prints FROGBOT_MARKER_FLAG_OPTIONS return; flags=DecodeMarkerFlagString (marker_load.c:87, returns 0 iff no recognized char u/6/f/b/t/e/n); `if(flags)` -> `nearest->fb.T &= ~flags` + "Marker flags cleared, now: %s" EncodeMarkerFlags(post-clear); else -> "invalid" no-op. C2 note VERIFIED: shipped string "Clears flag on a path between two markers" byte-identical at :2342 (clearmarkerflag) and :2344 (clearpathflag) = confirmed peer-copy artifact; handler operates on a SINGLE marker's fb.T not a path -> shipped string factually wrong, D10 source-truth synth-from-handler is the right call, conflict surfaced as C2 not silently absorbed. PROC-1: reduces to checkable fact (synth text == verified behaviour; shipped string unambiguously a copy-paste error), no residual judgment. No action. |

Legend: CLEAR = verified fine, no action. ACCEPT AS-IS + P4 carry =
correct for KTX, gap closes at Phase 4. FIX = captured finding, routed
(re-synthesis / skill-fix+re-fan).

## FIX queue (routed to targeted re-synthesis -- C4, never hand-UPDATE)

> THREE sub-classes now (7 total). **Sub-class A (under-scope, 5):**
> rows 4/5/11/12 (multi-read-site cvars D6 explored only the primary
> apply-site) + **row 27 votemap** (callee-truncation: synthesizer
> declared callee DoSelectMap out-of-scope and asserted the OPPOSITE
> of what it does -- a meaning INVERSION, the single most severe
> defect of the walk). One shared root cause (synthesis concluded
> about behaviour without tracing where the behaviour lives); the
> operator's group-2 re-fan decision targets THIS set. **Sub-class B
> (precision -- default-metadata/command-class, 1):** row 25
> k_highspeed -- single-site, core behaviour synthesized correctly,
> but the default-metadata ("Default 320" = a shipped-cfg value
> mislabelled as the registered default) and command-class ("admin"
> for a CF_PLAYER command) are wrong. **Sub-class C (precision --
> untraced-downstream-consequence, 1, NEW session #4):** row 34
> k_pow_pickup -- single-site, primary cvar=1 gate behaviour
> synthesized CORRECTLY + source-exact AND default-metadata WI-2-clean
> (true registered default), but the cvar=0 parenthetical "(allowing
> the timer to stack)" is FALSE -- an INFERRED OFF-state downstream
> clause never traced to the grant code (items.c:2134-2212), which
> flat-resets / 30s-hard-caps and explicitly forbids stacking. Neither
> an under-scope re-fan (B and C primary behaviour are correctly
> scoped) NOR the B checklist (C's defect is not default/command-class)
> catches C -- it needs a per-row re-synth whose checklist adds
> "trace every inferred OFF-state / side-effect / downstream clause to
> the code that implements it; do not infer a consequence from the
> gate alone." Operator decides all paths at walk end (C4).

- **dmm5** (row 4): re-synthesize with the FULL grep. Corrected description
  must: drop "same as mode 3" + drop the "distinction not source-legible"
  hedge; state real behaviour -- shares weapons-stay + halved ammo-respawn
  with dm 2/3/5 (items.c:835/1347/2604), shares the `deathmatch>3` weapon
  rules with dmm4 (weapons.c:122 axe 75; weapons.c:1185 discharge-kill),
  PLUS the mode-5-exclusive in-match starting ammo loadout
  (client.c:2308: nails 80 / shells 30 / rockets 10 / cells 30 when
  match_in_progress==2), distinct bot goal (bot_client.c:249). Verdict
  -> synthesized, the hedge is removed (it was source-legible all along).
- **allow_toggle_practice** (row 5): re-synthesize KEEPING the correct
  access-tier enumeration; ADD the missing `lock_practice` guard
  (commands.c:4919 -- command rejected with "command is locked" when
  lock_practice==2 or any value not 0/1) to the "ignored when" clause;
  cross-ref the `lock_practice` cvar. Operator context (prewar-only;
  toggling reloads the map; pure server-side feature gate) for the L3
  practice-feature note.
- **k_disallow_weapons** (row 11): re-synthesize KEEPING the correct
  disallow-polarity + bit table (sg=1/ssg=2/ng=4/sng=8/gl=16/rl=32/
  lg=64/axe=4096, vs g_consts.h). BROADEN scope: inventory strip is
  dmm4&match (client.c:2358) BUT map weapon-entity removal is
  `deathmatch>=4` = dmm4 AND dmm5 (match.c:875, "deathmatches (4 or 5)
  unless ToT mode + item pickup bonus"); ADD the non-mode-gated bot
  effect `fb_lg_disabled()` (fb_globals.c:203, bots change LG behaviour
  when the LG bit is set, any mode). Cross-link: confirms dmm5 is
  dmm4-family (consistent with row-4).
- **k_free_mode** (row 12): re-synthesize KEEPING the verified-exact
  check_perm access ladder (0 none / 1 real-admin / 2 admin / 3-4
  judges-not-implemented-deny / 5 all, commands.c:1513-1551), the
  matchless-forces-5 rule (commands.c:4634), and the C2 shipped-cfg-vs-
  source divergence note (D10 source-truth -- shipped labels "1=admins,
  2=elected admins, 3=judges, 4=elected judges" contradict the running
  check_perm which is real-adm / adm / judges-NOT-implemented). ADD the
  SERVER-invoked path (commands.c:4714-4722): the access ladder applies
  ONLY to player-invoked switches; when UserMode is server-invoked
  (`UserMode(-x)`, sv_invoked -- live callers: map-switch XonX auto-
  reapply world.c:1145, world.c:558/1253, race.c:260, bot_commands.c:
  2150/2436) k_free_mode is a BINARY gate -- only ==5 permits the
  switch, any other value discards it (check_perm not consulted).
  Operator-relevant consequence to state: k_free_mode<5 set to restrict
  players ALSO silently disables the server's own map-switch XonX
  auto-reapply. Cross-link: 4th of the multi-read-site under-scope class
  (dmm5 / allow_toggle_practice / k_disallow_weapons / k_free_mode).
- **votemap** (row 27): 5th under-scope, callee-truncation flavour --
  the synthesizer declared the callee DoSelectMap "out of this knob's
  authoritative read-site" and asserted "direct map change ...
  performed immediately", the OPPOSITE of DoSelectMap's actual
  behaviour (a vote cast + vote_check_map tally). Highest severity:
  a meaning inversion on a core pug command. Re-synthesize: votemap
  CASTS a map vote. arg = mapname; argc<2 -> "Usage: votemap
  <mapname>"; GetMapNum==0 -> "Map '%s' not available on this server";
  else DoSelectMap registers the caller's vote (self->v.map =
  k_lastvotedmap; broadcasts "suggests/agrees/would rather play on")
  and vote_check_map() switches the level ONLY if the vote threshold
  passes. State the gates: 7s (15s matchless) time gate; non-matchless
  blocked while match_in_progress; matchless needs match_in_progress==2
  and is blocked by k_no_vote_map; non-admin spectators cannot vote;
  k_lockmap blocks non-admins. Do NOT assert "direct"/"immediate" or
  "no match restriction" or "usable by spectators". Cross-link: same
  WI-1 root cause as rows 4/5/11/12; the catching discipline is
  "trace every cited path to the function that performs the behaviour;
  an explicit out-of-scope hedge in the reasoning is a defect
  predictor, not a license to stop."

### Sub-class B -- precision (1, distinct root cause)

- **k_highspeed** (row 25): single-site, the core toggle behaviour was
  synthesized CORRECTLY (do NOT regress: keep "toggles sv_maxspeed +
  every player's maxspeed between hardcoded 320 and bound(0,
  k_highspeed,9999); only via the speed command; D10 rejection of the
  shipped-cfg 'switch between this setting and sv_maxspeed' since
  sv_maxspeed is the OUTPUT target"). Re-synthesize to FIX two factual
  errors: (a) "Default 320" -> the REGISTERED default is empty/0
  (RegisterCvar("k_highspeed") = RegisterCvarEx(var,""), world.c:870 +
  752-754); 320 is the ktx example-config ktx.cfg:17 shipped value
  only (one config sampled, not cross-checked) -- state the registered
  default and, if a shipped value is given, label it as the
  ktx-example-cfg value with the per-distribution-drift C2 caveat
  (same handling as accepted rows 8 k_cmd_fp_dontkick / 24
  k_exclusive). (b) "the admin 'speed' command" -> `speed` is
  CF_PLAYER (commands.c:757; adjacent prewar/lockmap are
  CF_BOTH_ADMIN) and ToggleSpeed has no admin check -- it is a
  prewar player command, not admin-gated. ADD the precondition: the
  speed command no-ops during a live match (`if(match_in_progress)
  return`, commands.c:3218). This is NOT the under-scope root cause --
  a multi-read-site re-fan will not catch a default-metadata /
  command-class mislabel; needs a per-row re-synth whose checklist
  explicitly separates registered-default from shipped-cfg-value and
  reads the command's CF_ flag.

### Sub-class C -- precision / untraced-downstream-consequence (1, NEW session #4)

- **k_pow_pickup** (row 34): single-site, primary behaviour synthesized
  CORRECTLY -- do NOT regress: keep the polarity (1 = "fair" pickup,
  a player already holding an active powerup of a kind cannot re-pick
  the same kind until it expires; 0 = default, re-pickup allowed),
  the four-kinds gate (items.c:2048-2069 streq guards:
  envirosuit/radsuit_finished = suit, invulnerability/invincible_finished
  = pentagram, invisibility/invisible_finished = ring,
  super_damage/super_damage_finished = quad), and "0 (default)" (the
  TRUE registered default, RegisterCvarEx("k_pow_pickup","0")
  world.c:818, double-corroborated by common_um_init commands.c:4162 --
  WI-2 clean, NOT a shipped-cfg mislabel). Re-synthesize to FIX ONE
  factual error: the cvar=0 parenthetical "(allowing the timer to
  stack)" is FALSE. Grant code items.c:2134-2212 (the synthesis cited
  the gate items.c:2046 but never traced the grant): a normal
  map-spawned powerup does a flat `*_finished = g_globalvars.time + 30`
  (p_cnt stays NULL -> reset to a fresh 30s, NOT additive); a
  player-dropped powerup does `p_cnt[0] = max(time,old_pu_time) +
  seconds_left` THEN `p_cnt[0] = min(g_globalvars.time + 30, p_cnt[0])`
  with the literal source comment `// do not allow more than 30 seconds
  of quad anyway.` Corrected cvar=0 text: re-pickup REFRESHES the timer
  -- a fresh map powerup resets it to the full 30s (not additive); a
  dropped powerup adds its remaining time but is HARD-CAPPED at 30s
  total. It does NOT accumulate beyond a single powerup's 30s duration.
  Optional enrichment: cross-ref the prewar-only toggle command
  TogglePuPickup (commands.c:2853, `if(match_in_progress) return`).
  This is NOT the under-scope root cause (the primary cvar=1 behaviour
  was correctly scoped + traced) and NOT the B default/command-class
  class (the default-metadata is correct here). Distinct checklist
  item it needs: "trace every INFERRED OFF-state / side-effect /
  downstream clause to the code that implements it; never infer a
  consequence from the gate alone." Watch whether it recurs -- if a
  2nd untraced-downstream-consequence FIX appears, C is a confirmed
  systemic class with its own re-synth checklist (cf the WI-1 / WI-2
  promotion bar).

## Affirmed-sample judgment queue (operator adjudicates at walk end -- PROC-1)

Fact-verified by this session; the affirm-vs-should-synthesize call is
the operator's (slice-4 STATUS tracked finding: elaborated-affirm vs
should-synthesize is a spec-locked operator-tail judgment, not the
worker's). Format: knob -- FACT verdict -- affirm-vs-synth read + nuance.

- **next_best** (row 14, HTML#3): FACT = source-accurate. Handler
  commands.c:6311-6340 is a top-2 TOGGLE (to=b1; if goal==b1->b2; elif
  goal==b2->b1; stuffcmd `track <id>`); !b1 -> "can't do this now".
  The :6135-6144 "ktpro compatible autotrack" comment heads a SEPARATE
  event-driven subsystem, correctly out of scope. Affirm-vs-synth: the
  shipped "set pov to next best player" is terse + WHAT-accurate but
  imprecise on mechanism (TOGGLE between the top two, not a linear
  "next" through a ranking). My lean = defensible affirm (terse
  verbatim, not the elaborated-affirm anti-pattern); YOUR call whether
  the toggle nuance warrants synthesis. NOT a silent CLEAR.
- **gamemodes** (row 16, HTML#6): FACT = source-accurate. ListGameModes
  commands.c:9513-9552 = a static 25-entry known[] game-mode list
  intersected with the registered cmds[] table, G_sprint per match.
  Affirm-vs-synth: shipped "list available game modes" is terse +
  WHAT-accurate; nuance = "available" specifically means the game-mode
  commands REGISTERED/active on this server (hardcoded known[] ∩
  cmds[]), not a static catalog. My lean = defensible affirm (terse
  verbatim, accurate WHAT, the registered-subset subtlety is minor and
  arguably implied by "available"); YOUR call. NOT a silent CLEAR.
- **race_toggle** (row 18, HTML#9): FACT = source-accurate.
  r_changestatus case 3 (race.c:3050-3059): if mid-run (self->racer
  && race.status) -> G_bprint "X has quit the race" + race_end
  (:3053-54), THEN set_player_race_ready(self, !self->race_ready)
  (:3057). Affirm-vs-synth: shipped "toggle ready status for race" is
  WHAT-accurate for the idle case but OMITS a behaviorally-material
  side-effect -- run mid-race it publicly aborts your race run first.
  Stronger synthesize case than next_best/gamemodes (material
  side-effect + public broadcast, not mechanism nuance); my lean =
  SYNTHESIZE the mid-run-quit into the description. YOUR call. NOT a
  silent CLEAR.
- **addbot:frogbot:std** (row 19, HTML#10): FACT = source-accurate
  (FrogbotsAddbot_f bot_commands.c:362-392; bots_enabled gate, optional
  numeric skill argv[2] + team argv[3], FrogbotsAddbot spawns + clamps
  + auto-balances). Affirm-vs-synth: "Adds a bot. Skill & team
  optional" is a GENUINE user-facing /botcmd help line shown to
  players, terse-by-design, accurate WHAT, no hidden material
  side-effect. My lean = strong AFFIRM (this is the real user-doc
  surface; contrast race_toggle). YOUR call. NOT a silent CLEAR.
- **breakondeath:frogbot:std** (row 20, HTML#11): FACT = source-accurate
  (toggle FrogbotsSetBreakOnDeath bot_commands.c:2219-2230; behavioural
  read player.c:1145 !isBot && tot_mode_enabled() && cvar -> PlayerBreak;
  match.c:1789 display-only). Affirm-vs-synth: genuine terse /botcmd
  user-help string; omits the tot_mode/human gate, implied by the
  frogbot-practice context. lean = AFFIRM (mild). [frogbot-help-string
  sub-batch: addbot/breakondeath/... -- adjudicate together.] YOUR call.
- **k_timetop** (row 31, HTML#27) -- **DISTINCT sub-type: elaborated-
  affirm / provenance-correctness (NOT terse-verbatim).** FACT =
  source-accurate (6 sites: vote clamps commands.c:2957/3003/3026
  `bound(0,timelimit,cvar("k_timetop"))`; FixRules world.c:1554
  `bound(0,cvar("k_timetop"),600)`; world.c:1696 `if(k_tt<=0)
  cvar_fset("k_timetop",k_tt=30)`). The reasoning ITSELF states the
  worker extended the candidate ("maximum time in minutes
  allocateable by a player for a game") with the 0-600 clamp +
  reset-to-30 -- source-VERSION-specific numerics -- but recorded
  affirmed / source_inline / NO anchor. Consequence: 600 & 30 are
  synthesized facts left UNPROTECTED against source drift (staleness
  machinery keys on description_anchor_version, null for affirmed).
  This is qualitatively different from the terse-verbatim affirm
  cluster: it is a provenance-CLASS question with a staleness
  consequence, not a "is the terse WHAT good enough" nuance. lean =
  SYNTHESIZE (origin synthesized + anchor 1.47-2-g67253dc so the
  extracted numerics are re-reviewed on drift). Operator options:
  (a) keep affirmed-with-extension (numerics unprotected); (b)
  reclassify SYNTHESIZE + anchor [my lean]; (c) trim back to the
  verbatim candidate (the candidate alone clears D5 -> a true
  affirm). Generalises: any affirmed row whose text was extended
  with source-specific numerics has this same provenance gap --
  worth an operator policy call at the batch, not just per-row.
  YOUR call. NOT a silent CLEAR.
- **k_sayteam_to_spec** (row 30, HTML#26): FACT = source-accurate.
  FixSayTeamToSpecs world.c:1441-1469 switch maps 1:1 to the enum:
  0->0 never, 1->match_in_progress?1:0 (only during game),
  2->match_in_progress?0:1 (only during prewar), default(3)->1
  always. k_ -> engine sv_sayteam_to_spec (g_cmd.c:528 = actual
  say_team->spec gate). Affirm-vs-synth: one of the cleanest affirms
  of the walk -- fully-spelled 4-value enum EXACTLY matching the
  source switch (every value verified incl. match_in_progress
  conditionals), DOUBLE-config corroborated (ktx-example + nquake
  identical). Only omission is the k_->sv_ bridge (implementation
  mechanism, not admin-relevant). lean = strong AFFIRM. YOUR call.
  NOT a silent CLEAR.
- **k_motd_time** (row 28, HTML#24): FACT = source-accurate.
  MakeMOTD motd.c:139 `bound(0,cvar("k_motd_time"),30)` ->
  motd->attack_finished = now + (i ? i : (k_matchLess?3:7));
  k_motd_time = MOTD display seconds (clamp 0..30, 0->default 3/7).
  Affirm-vs-synth: "time motd is displayed in seconds" is TRIPLE-
  corroborated (shipped-doc candidate + independent code comment +
  behaviour all agree -- the cleanest affirm class). Omits clamp +
  0->default fallback = mechanism depth, not a misleading WHAT, no
  hidden side-effect. lean = strong AFFIRM (terse-doc cluster w/
  k_allowvoteadmin, k_exclusive). Operator-nugget for L3/admin:
  k_motd_time=0 does NOT disable the MOTD (falls back 3s matchless /
  7s), max clamped 30s. YOUR call. NOT a silent CLEAR.
- **k_exclusive** (row 24, HTML#20): FACT = source-accurate. Gate
  client.c:1455 `if((CountPlayers()>=k_attendees) && cvar("k_exclusive"))`
  -> refuse player connect, "reconnect as spectator"; k_attendees =
  CountPlayers() snapshot at match-start. Affirm-vs-synth: shipped-cfg
  comment "number of players gets locked on game start (0=no,1=yes)" is
  enum-exact + WHAT-accurate for the admin effect (player cap locks at
  game-start count). Only looseness = cap-vs-roster (a leaver frees a
  slot up to the cap, it is not the exact player SET that locks) --
  mechanism depth, not a misleading WHAT, no hidden side-effect. lean =
  AFFIRM (shipped-cfg-comment cluster, with k_allowvoteadmin). C2
  default-drift handled per the operator-accepted k_cmd_fp_dontkick
  precedent (per-distribution default, not a semantic conflict). YOUR
  call. NOT a silent CLEAR.
- **k_allowvoteadmin** (row 23, HTML#18): FACT = source-accurate.
  VoteAdmin admin.c:450 (the 'elect' command, commands.c:800 CD_ELECT);
  admin.c:497 `if(!cvar("k_allowvoteadmin"))` -> "Admin election is not
  allowed on this server" early-return, after the k_admins gate :489.
  Enum 0=no/1=yes cvar-truthiness-exact. Affirm-vs-synth: affirmed
  shipped-cfg comment "allow admin election (0 = no, 1 = yes)"
  (identical in ktx-repo example + nquake-distfiles) is precise, enum
  code-matching, WHAT-accurate. Only omission = cross-cvar nuance
  (=0 blocks the elect route, password-admin still governed by
  k_admins) -- L3 admin-config concept-note material, not a terse-doc
  defect. lean = strong AFFIRM (cleanest class: a config comment that
  exactly describes its own binary gate; distinct from the
  frogbot-help-string sub-batch). YOUR call. NOT a silent CLEAR.
- **removemarker:frogbot:editor** (row 22, HTML#13): FACT =
  source-accurate (FrogbotRemoveMarker bot_commands.c:1199-1223;
  LocateMarker nearest -> no-marker / non-"marker"-classname guards ->
  deselect-if-saved -> RemoveMarker route_fields.c:121). Affirm-vs-synth:
  genuine user-facing editor help line (printed by PrintAvailableCommands
  in the editor command list), terse-by-design, WHAT-accurate. Omits (a)
  nearest-targeting and (b) manual-only refusal ("Cannot remove
  non-manual markers"); (a) is the universal editor_commands[] mechanism
  (every sibling uses LocateMarker(nearest) -- implied by "editor"), (b)
  is a no-op-with-message guard, NOT a material hidden side-effect like
  race_toggle's public race-abort. lean = AFFIRM (editor/frogbot-help-
  string cluster -- adjudicate with addbot/breakondeath/gamemodes/
  next_best). Note: r22 removemarker is the affirmed sibling of r21
  clearmarkerflag (synthesized -- its shipped string was a copy-paste
  artifact); the pipeline correctly split the two within one
  editor_commands[] neighbourhood -- a pro-affirm signal here. YOUR call.

## Carry-forwards to Phase 4 (MVDSV) -- the orchestrator MUST fold these into the Phase-4 executor prompt

- **CF-1 (ban/banip/banrem):** KTX rows `ban`/`banip`/`banrem` are
  correctly-hedged redirect stubs whose real semantics are mvdsv-side.
  Phase 4 MUST (a) produce real source-grounded descriptions for the
  mvdsv `ban`/`banip`/`banrem` handlers, and (b) update these three KTX
  hedged rows to cross-reference the mvdsv description (resolution path
  decided at Phase 4: cross-ref vs the C1-outreach note already in their
  reasoning). Operator decision 2026-05-18: defer, do not force-resolve
  on the KTX side now.
- **CF-2 (dmm5 / deathmatch sub-modes -> game-mode L3 concept-notes arc,
  2026-05-09-ktx-game-mode-l3-concept-notes, D18):** dmm5 confirmed a
  DISTINCT deathmatch sub-mode (dmm4-family weapon rules + its own
  client.c:2308 match loadout), NOT a dmm3 clone. The dmm1-5 family are
  command-driven distinct rulesets and are NOT in the standalone
  `gameplay_mechanics kind=game_mode` catalog (1on1/ca/ctf/... -- the set
  the By-Mode view renders). Coverage point for the downstream game-mode
  L3/wiki arc: the classic deathmatch sub-modes (dmm1-5) each warrant
  their own concept note, anchored on the re-synthesized L1 dmm* command
  descriptions this arc produces. Operator (2026-05-18) explicitly wants
  the extracted per-mode rules to feed those wiki entries.

## Methodology watch-items (sharpen the rest of the walk)

- **WI-1 "not-source-legible hedge from a partial grep":** dmm5's hedge
  asserted the mode-5-vs-3 distinction was not source-legible; a WIDE
  grep found it plainly at client.c:2308 + the weapons.c `>3` branches.
  F-D6a verifies cited lines are real, NOT that ALL relevant lines were
  cited -- so an under-grep passes the machine gate. `ban`'s hedge was
  the opposite (exhaustive grep genuinely empty -> correct). RULE for
  every remaining hedged/curated row whose reasoning says "not
  source-legible / grouped with X / not at a single site": independently
  run the WIDE grep before accepting. **5 data points now** (dmm5 row
  4, allow_toggle_practice row 5, k_disallow_weapons row 11,
  k_free_mode row 12, **votemap row 27**) -- systemic CONFIRMED, now
  with a NEW flavour: row 27 is *callee-truncation* -- the reasoning
  EXPLICITLY said the callee (DoSelectMap) was "out of this knob's
  authoritative read-site" and then asserted the OPPOSITE of what the
  callee does (claimed "direct/immediate" for a vote-cast). This
  upgrades the rule from a heuristic to a HARD predictor: **when a
  synth/curated reasoning explicitly hedges that something is
  out-of-scope / not-source-legible / lives-in-a-callee-we-did-not-
  trace, that hedge is a defect SIGNAL -- trace it before accepting,
  expect an inversion.** 4/4 multi-read-site + 1/1 callee-truncation =
  5/5 where the WIDE trace was applied. Resolution is the
  group-2-boundary operator decision (targeted re-fan of the
  under-scope class, both flavours). Keep applying the WIDE grep AND
  the full callee-trace every remaining row -- load-bearing, and the
  out-of-scope-hedge predictor is now proven.
- **WI-2 "default-metadata / command-class precision" (NEW, session #3,
  row 25 k_highspeed):** a SINGLE-site synth can have its core
  behaviour + D10 call fully correct yet still carry a factual error in
  the *metadata* clauses -- specifically (a) stating a shipped-cfg
  value as the cvar's "Default" when the registered default
  (RegisterCvar/RegisterCvarEx) is empty/0, and (b) labelling a command
  "admin" without reading its CF_ registration flag (k_highspeed's
  `speed` is CF_PLAYER, no admin check). This is a DISTINCT class from
  WI-1 (not under-grep of behaviour -- the behaviour grep was
  complete). RULE for every remaining synth row from here: when the
  description asserts "Default X", verify X against the REGISTERED
  default (grep RegisterCvar/RegisterCvarEx for the cvar; "" -> 0,
  not the shipped-cfg number) and treat any shipped-cfg value as a
  C2 distribution-drift datum (rows 8/24 precedent), NOT the default;
  when it asserts a command is "admin"/"player"-gated, read the
  command-table CF_ flag + the handler's admin check. 1 data point
  (row 25) -- watch whether it recurs; if it hits 3x it joins WI-1 as
  a second confirmed systemic class with its own re-fan checklist.
- **PROC-1 (operator-ratified 2026-05-18) -- the CLEAR bar: fact vs
  judgment.** A row is on the docket by CATEGORY, not because the
  synthesizer was unsure: only the 4 hedged = genuine model doubt;
  worker-contested = policy-mandated human witness of a doc-vs-source
  divergence the model DID confidently resolve (D10); affirmed =
  1-in-4 random QA sample (no per-row flag). Same-model verification is
  non-circular ONLY where it reduces to NEW CHECKABLE EVIDENCE -- the
  WI-1 exhaustive grep gathers sites the synthesizer demonstrably did
  not (proven 4x: rows 4/5/11/12 synthesized confidently, caught here).
  RULE: auto-CLEAR only when the verdict is a checkable fact (grep
  exhaustive + cited lines confirmed + description matches verified
  behaviour). The moment the residual is a JUDGMENT (affirm-vs-should-
  synthesize, community framing, "is the terse text misleading", is-the-
  D10-call-the-one-the-operator-would-make) -> surface to operator,
  never absorb into a CLEAR even if the underlying facts check out.
  Affirmed-sample rows: verify the FACT layer (kept text source-
  accurate? CLEAR-fact / FIX-fact); the affirm-vs-synthesize JUDGMENT
  goes to the operator as an end-of-walk batch (-> Affirmed-sample
  judgment queue). No affirmed row gets a silent CLEAR.

## Walk status

### Session #4 running tally (resume from row 34)

- r34 k_pow_pickup (HTML#31, synth): **FIX** -- precision, NEW
  flavour C (untraced-downstream-consequence). WI-1 exhaustive (4
  sites; 2 uncited both corroborate, NOT under-scope; no out-of-scope
  hedge). Primary cvar=1 gate behaviour source-exact + correctly
  scoped; "0 (default)" WI-2-clean (true registered default --
  contrast r25). DEFECT: cvar=0 "(allowing the timer to stack)" is
  FALSE -- grant code items.c:2134-2212 flat-resets (map) /
  30s-hard-caps (dropped); literal source comment "do not allow more
  than 30 seconds of quad anyway". FIX queue now **7** (A=5, B=1,
  C=1). NEW FIX flavour C opened (per-row re-synth, distinct
  checklist: trace every inferred OFF-state/downstream clause).
- r35 k_spw (HTML#32, synth): **CLEAR (fact)**. WI-1 exhaustive
  (many sites; all uncited corroborate or non-behavioural -- toggle
  cmd `bound(-1,...,4)`+wrap confirms range, NOT under-scope; no
  out-of-scope hedge). 6-value enum (-1..4) source-EXACT vs
  respawn_model_name() g_utils.c:2663; behavioural summary
  (anti-spawnfrag + same-spawn-avoidance) source-verified on BOTH
  same-spawn paths (client.c:1122 modes 1/2/3 + client.c:1301 mode
  4). C2/D10: two shipped-cfg candidates conflict (0-4 vs 0-3),
  source authoritative + recovers value -1 both omit = value-ADD,
  accepted D10 precedent. WI-2 CLEAN BY ABSENCE -- no default claim,
  and the synthesis correctly did NOT mislabel any of 7 shipped
  config-string values as the default (the r25 trap, here avoided).
  No residual judgment. 0 new FIX.
- Session #4 totals so far: 2 rows, 1 CLEAR + 1 FIX, 0 judgment-queue
  adds. Cumulative: **35 / 43 done, 8 PENDING**. FIX queue **7** --
  A under-scope 5 (rows 4/5/11/12 + 27), B precision-default/cmd 1
  (row 25), C precision-untraced-downstream 1 (row 34). Affirmed-
  sample judgment queue unchanged at **11**.

### Session #3 running tally (resume from row 21)

- r21 clearmarkerflag:frogbot:editor (HTML#12, synth): **CLEAR (fact)**.
  Single-site, not the under-scope class; every clause source-exact; C2
  peer-copy-string artifact verified, D10 call right. 0 new FIX.
- r22 removemarker:frogbot:editor (HTML#13, affirm): **CLEAR-fact**;
  affirm-judg queued lean AFFIRM. Single-site; handler source-exact;
  terse genuine editor help line, omitted nuance is editor mechanism /
  no-op guard not material side-effect. Pipeline correctly split r21
  (synth, copy-paste string) vs r22 (affirm, correct string).
- r23 k_allowvoteadmin (HTML#18, affirm): **CLEAR-fact**; affirm-judg
  queued lean strong AFFIRM. 3 sites, single behavioural (admin.c:497
  elect gate); shipped-cfg comment enum-exact; cross-cvar k_admins
  nuance is L3 material not a terse-doc defect.
- r24 k_exclusive (HTML#20, affirm): **CLEAR-fact**; affirm-judg
  queued lean AFFIRM. 3 sites single behavioural client.c:1455;
  shipped-cfg comment enum-exact; C2 default-drift per the accepted
  k_cmd_fp_dontkick precedent.
- r25 k_highspeed (HTML#21, synth): **FIX** -- core toggle synthesis
  correct + D10 right, but "Default 320" (a shipped-cfg value
  mislabelled as the registered default; true default empty/0 via
  RegisterCvarEx(var,"")) and "the admin 'speed' command" (it is
  CF_PLAYER, no admin check) are factual errors. **NEW FIX sub-class B
  (precision) -- distinct root cause from the 4-row under-scope
  cluster; the under-scope re-fan would not catch it.**
- r26 toggleklist (HTML#22, synth): **CLEAR (fact)**. toggleklist 3 +
  k_allowklist 5 sites all accounted (consumer klist():5077 verified);
  every clause source-exact; CD_TRACKLIST label-reuse handled per the
  accepted row-15 toggletracklist precedent; WI-2 clean.
- r27 votemap (HTML#23, synth): **FIX -- highest severity of the
  walk (meaning INVERSION).** Synthesis declared callee DoSelectMap
  out-of-scope and asserted "direct map change ... immediately"; the
  callee is a VOTE cast + vote_check_map tally. 5th under-scope FIX
  (sub-class A, callee-truncation flavour). Proves the
  out-of-scope-hedge defect predictor.
- r28 k_motd_time (HTML#24, affirm): **CLEAR-fact**; affirm-judg
  queued lean strong AFFIRM. 2 sites single read motd.c:139; triple
  agreement (shipped-doc + code comment + behaviour); WI-2 clean (no
  default claim -- good contrast to r25).
- r29 k_noframechecks (HTML#25, synth): **CLEAR (fact) -- D10 canary
  PASS.** Polarity `bound(0,!cvar,1)` deterministic (0=on/1=off);
  enforcement client.c:3824 (uptime + FPS warn->disconnect, bots
  exempt) source-exact; the two configs' C2 is inverted-prose only
  (both encode 0=on,1=off); WI-2 clean, no judgment residual.
- r30 k_sayteam_to_spec (HTML#26, affirm): **CLEAR-fact**; affirm-judg
  queued lean strong AFFIRM. 4+4 sites accounted; switch maps 1:1 to
  the 4-value enum; double-config corroborated; one of the cleanest
  affirms of the walk; WI-2 clean.
- r31 k_timetop (HTML#27, affirm): **CLEAR-fact**; affirm-judg queued
  lean **SYNTHESIZE**. DISTINCT sub-type: elaborated-affirm /
  provenance-correctness -- worker extended the candidate with
  source-version-specific numerics (0-600 clamp, reset-to-30) but
  kept affirmed/no-anchor, leaving the numerics unprotected vs source
  drift. Generalises to any extended-affirm; flagged for an operator
  policy call at the batch.
- r32 timedown (HTML#28, synth): **CLEAR (fact)**. timedown 3 +
  cohort sibling timedown1 identified; TimeDown(t=5) every clause
  source-exact (mid-match/hoony/ramp/clamp/refuse/announce);
  anti-collapse correct (5-step, not collapsed w/ timedown1); WI-2
  clean; CD-simplification handled per accepted precedent.
- r33 timeup (HTML#29, synth): **CLEAR (fact)**. timeup 3 + cohort
  timeup1 identified; TimeUp(t=5) every clause source-exact (ramp
  0->1->3->5/+5/clamp/mid-match). KEY: verified TimeUp has NO
  hoony/refusal (TimeDown had both) -- synthesis correctly
  differentiated, precision not under-scope. Anti-collapse + WI-2
  clean.
- Session #3 totals so far: 13 rows, 5 CLEAR + 6 CLEAR-fact + 2 FIX, 6
  judgment-queue adds. Cumulative: **33 / 43 done, 10 PENDING**. FIX
  queue **6** -- sub-class A under-scope = 5 (rows 4/5/11/12 + 27
  votemap), sub-class B precision = 1 (row 25 k_highspeed).
  Affirmed-sample judgment queue **11** (this session added
  removemarker, k_allowvoteadmin, k_exclusive, k_motd_time,
  k_sayteam_to_spec, k_timetop). D10 canary (r29): PASS. NEW
  judgment sub-type opened (r31): elaborated-affirm/provenance.

### Session #2 wrap (rows 13-20)

- Rows dispositioned: 20 / 43 this session (13-20). Synth CLEAR (fact,
  no under-scope): r13 downspecs, r15 toggletracklist, r17
  k_privategame_force_reconnect. Affirmed CLEAR-fact + judgment queued
  (PROC-1): r14 next_best (lean affirm), r16 gamemodes (lean affirm),
  r18 race_toggle (lean SYNTH -- material mid-run quit), r19
  addbot:frogbot:std (lean affirm), r20 breakondeath:frogbot:std (lean
  affirm). 0 new FIX this session (FIX queue still 4 from rows
  4/5/11/12). Docket re-anchored this session to the
  authoritative HTML (the prior "4+20+10+9" group model is SUPERSEDED
  by the HTML-true 4 hedged + 11 affirmed + 28 synthesized). 31 PENDING,
  walked in HTML doc order as rows 13-43 -- see the authoritative table
  in "## Docket = 43 rows". The 12 done are a verified subset of the 43.
  - 1-3 ban/banip/banrem: ACCEPT AS-IS + P4 carry (CF-1).
  - 4 dmm5: FIX; CF-2; WI-1 opened.
  - 5 allow_toggle_practice: FIX (add lock_practice guard).
  - 6-10 k_ann / k_classic_shotgun / k_cmd_fp_dontkick / k_ctf_hookstyle
    / k_demoname_date: CLEAR.
  - 11 k_disallow_weapons: FIX (under-scoped; broaden dmm4->dmm4&dmm5
    + map-entity removal + bot effect).
  - 12 k_free_mode: FIX (under-scoped; reasoning modelled only the
    player check_perm path, missed the sv_invoked binary gate
    commands.c:4714-4722 + its world.c:1145 map-switch consequence).
- FIX queue: 4 (dmm5, allow_toggle_practice, k_disallow_weapons,
  k_free_mode).
- **Systemic read (CONFIRMED): 4 FIX / 9 substantive. All 4 FIX share
  ONE root cause** -- multi-read-site cvars where D6 explored only the
  primary apply-site (dmm5, allow_toggle_practice, k_disallow_weapons,
  k_free_mode). The 5 CLEAR were few-site OR D6 wide-read them. NOT
  random variance -> a PREDICTABLE class, now 4/4 consecutive on the
  multi-site rows that have come up. Resolution (operator decides at the
  group-2 boundary): targeted re-fan of the multi-read-site rows only
  (not blanket, not pure per-row). WI-1 wide-grep is the catching
  discipline -- keep applying it every remaining row.

## !!! SESSION WRAP 2026-05-18 (orchestrator session #3) -- RESUME IN A FRESH TERMINAL !!!

Walked **rows 21-33 (13 rows)**. Clean orchestrator-discipline wrap
(approaching context smell-zone; this gate is judgment-critical and the
arc-orchestrator pushback rule forbids pushing fidelity-critical
verification past the smell zone -- the votemap meaning-inversion is
exactly the class of defect a degraded window misses). NOT
smell-zone-forced panic; the ledger is a lossless resume contract,
committed + pushed after every row. **33 / 43 done, 10 PENDING.**

**Session #3 outcomes:**
- 5 CLEAR (r21 clearmarkerflag, r26 toggleklist, r29 k_noframechecks
  [D10 canary PASS], r32 timedown, r33 timeup).
- 6 CLEAR-fact + affirm-judg queued (r22 removemarker, r23
  k_allowvoteadmin, r24 k_exclusive, r28 k_motd_time, r30
  k_sayteam_to_spec [all lean AFFIRM], r31 k_timetop [lean
  **SYNTHESIZE**]).
- **2 new FIX** (queue now 6): r25 k_highspeed = **sub-class B
  (precision, NEW)** -- "Default 320" mislabels a shipped-cfg value as
  the registered default + "admin speed command" is wrong (CF_PLAYER);
  r27 votemap = **sub-class A under-scope, callee-truncation flavour,
  HIGHEST SEVERITY of the entire walk (meaning INVERSION** -- "direct
  immediate map change" for what is actually a vote cast + tally).
- **WI-2 opened** (default-metadata / command-class precision -- a
  distinct class from WI-1; 1 data point r25, watch for recurrence).
- **WI-1 upgraded**: 5th data point (r27); the "explicit out-of-scope /
  not-source-legible / callee-not-traced hedge in the reasoning" is now
  a PROVEN HARD defect predictor (not a heuristic) -- trace every such
  hedge, expect an inversion.
- **NEW judgment sub-type opened** (r31 k_timetop): elaborated-affirm /
  provenance-correctness -- worker extended an affirm with
  source-version-specific numerics but kept affirmed/no-anchor, leaving
  them unprotected vs source drift. Generalises to ANY extended-affirm
  -> needs an operator POLICY call at the batch (not just per-row).
- D10 canary (r29 k_noframechecks): **PASS** (polarity deterministic,
  both configs encode the same mapping, C2 is inverted-prose only).

**Two operator-decision batches now larger (still walk-end, do NOT
auto-apply -- C4):**
1. **FIX queue = 6**, TWO sub-classes: A (under-scope, 5: rows
   4/5/11/12 + 27 votemap) -- targeted re-fan candidate; B (precision,
   1: row 25 k_highspeed) -- needs a per-row re-synth with an explicit
   "registered-default vs shipped-cfg-value" + "command CF_ flag"
   checklist (an under-scope re-fan will NOT catch B). votemap is the
   most severe (meaning inversion on a core pug command).
2. **Affirmed-sample judgment queue = 11**, now TWO sub-types: the
   terse-verbatim cluster (mostly lean AFFIRM) and the NEW
   elaborated-affirm/provenance sub-type (r31 k_timetop, lean
   SYNTHESIZE) which wants an operator policy call generalising to all
   extended-affirms.

**Resume instructions (fresh terminal):** identical method to session
#2 below (read this ledger top-to-bottom; restore the source oracle;
WI-1 + WI-2 + PROC-1 every row; trace every out-of-scope hedge -- PROVEN
predictor; commit+push every row). **RESUME AT ROW 34** -- live `NEXT =`
in the "## Docket = 43 rows" footer (currently HTML#31 `k_pow_pickup`,
synth). 10 PENDING: rows 34-43 (k_pow_pickup, k_spw, spawn_show,
spawn666time, k_instagib, k_overtime, _k_coachteam1, _k_last_cycle_map,
timing_players_action, k_use_matchless_dir). Phase 3 does NOT ship until
the walk completes + FIX queue resolved + operator scan verdict.

## !!! SESSION WRAP 2026-05-18 (orchestrator session #2) -- RESUME IN A FRESH TERMINAL !!!

This session resolved the docket-integrity blocker (RE-ANCHORED the
docket to the authoritative `ktx-review-views.html` "Review docket
only" = 43 `data-docket="1"`; psql/group reconstruction is DISPROVEN
-- do not retry it), ratified **PROC-1** (the fact-vs-judgment CLEAR
bar), and walked **rows 13-20** (8 rows). Operator-chosen clean wrap
(not smell-zone-forced) so the judgment-dense remainder gets a fresh
window. State captured + committed + pushed after every row; the
ledger is a lossless resume contract. **20 / 43 done, 23 PENDING
(rows 21-43).**

**Resume instructions (fresh terminal):**
1. Read THIS ledger top-to-bottom. The complete durable record:
   source oracle, the **AUTHORITATIVE 43 docket table** (in "## Docket
   = 43 rows" -- HTML-sourced, per-row `[D]`/`PENDING` + live `NEXT =`
   footer), per-row dispositions, FIX queue, **Affirmed-sample
   judgment queue**, carry-forwards CF-1/CF-2, WI-1 + **PROC-1**, the
   systemic read. Docket source of truth = the operator's
   `/mnt/c/Users/Administrator/Downloads/ktx-review-views.html`
   "Review docket only" toggle; the ledger table is the distilled copy.
   Do NOT reconstruct the docket from psql -- that is disproven.
2. Restore the source oracle (likely gone from /tmp):
   `git clone https://github.com/QW-Group/ktx.git /tmp/ktx-src-67253dc9
   && git -C /tmp/ktx-src-67253dc9 checkout 67253dc9ab4f643f1e6523a923a41caab9ea587f`
   then verify `git -C /tmp/ktx-src-67253dc9 describe --tags` ==
   `1.47-2-g67253dc`. DB: `docker exec qw-oracle-postgres-dev psql -U
   qworacle -d qw_oracle` (the `psql` binary is NOT on PATH; use the
   container). Pull `description`, `description_origin`,
   `description_reasoning`, `description_provenance::text` per knob.
3. Per-row method -- **WI-1 + PROC-1, both load-bearing:**
   - **WI-1:** WIDE-grep every read of the knob in the source oracle,
     NOT just cited sites (the 4 FIXes were all caught this way). For
     a cvar that toggles/sets another cvar, ALSO grep that cvar's
     name/macro -- behaviour lives at its read sites (row 20 method).
   - **PROC-1:** auto-CLEAR only when the verdict is a CHECKABLE FACT
     (grep exhaustive + cited lines confirmed + description matches
     verified behaviour). The moment the residual is a JUDGMENT
     (affirm-vs-should-synthesize, community framing, "is the terse
     text misleading") -> surface, never absorb into a CLEAR.
   - **Affirmed-verdict rows:** verify the FACT layer (CLEAR-fact /
     FIX-fact); the affirm-vs-synthesize JUDGMENT goes to the
     **Affirmed-sample judgment queue** with a lean -- NO silent CLEAR.
4. Cadence (operator-agreed): auto-proceed CLEAR (fact) with a
   one-line ledger notice; surface FIX + judgment/community rows; the
   operator stands by. Commit the ledger after EVERY row; push at
   checkpoints.
5. **RESUME AT ROW 21** -- see the live `NEXT =` pointer in the
   "## Docket = 43 rows" table footer (currently HTML#12
   `clearmarkerflag:frogbot:editor`, synth). Walk the PENDING rows in
   HTML doc order top-to-bottom.
6. **Two operator-decision batches due at walk end (do NOT auto-apply):**
   (a) **FIX queue systemic re-fan** -- CONFIRMED 4/4 multi-read-site
   class (rows 4/5/11/12): targeted re-fan of the multi-site FIX rows
   vs per-row re-synth. C4: re-synthesis routes through the D6
   pipeline, NEVER a hand UPDATE; operator gates the path.
   (b) **Affirmed-sample judgment queue** -- 5 rows so far (next_best,
   gamemodes, addbot, breakondeath = lean AFFIRM; race_toggle = lean
   SYNTHESIZE, material mid-run public race-abort). Operator
   adjudicates keep-vs-synthesize as a batch.
7. NOT a Phase-3-boundary action and NOT the holistic gate -- this is
   the in-flight D7 tier-2 tail only. Phase 3 does not ship until the
   walk completes + the FIX queue is resolved + the operator reports
   the scan verdict.

- Next: live `NEXT =` pointer in the "## Docket = 43 rows" footer
  (single source of resume truth). Currently row 34 = HTML#31
  `k_pow_pickup` (synthesized).
