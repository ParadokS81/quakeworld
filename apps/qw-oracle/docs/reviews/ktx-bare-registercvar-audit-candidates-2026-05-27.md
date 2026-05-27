# KTX bare-RegisterCvar audit candidates (2026-05-27)

**Anchor**: v1.36-1633-g67253dc (HEAD as of 2026-05-27)

**Purpose**: apply-pass reference. Bare `RegisterCvar("name")` (without `Ex` suffix) sets the cvar's initial value to `""` (effective default `0` for numeric reads). When an L1 description claims a non-zero default for one of these cvars, that's an F2 default-value error.

**Usage**: during apply pass, when reviewing each batch's drafts, cross-check each cvar's `Default:` line in the v2 draft against this list. If the cvar appears here AND the draft claims non-zero default, the draft inherits the F2 error class — flag, verify against source, fix before applying.

**Cumulative F2 catches across the arc**: ~17+ cvars flagged across 5+ batches (k_exttime / k_freeze / k_lockmax / k_lockmin in Match flow; k_pow / k_highspeed / k_btime / k_short_gib in Gameplay rules; k_privategame_allow_specs / k_privategame_force_reconnect in Admin & permissions; k_freshteams_limit_packs / k_freshteams_limit_sweep_ammo in Mode-scoped knobs; k_race_pace_resolution / k_race_match_rounds in Race; and others).

**Candidate pool**: 176 bare `RegisterCvar` call sites (excluding function definition + log/diagnostic lines). Frogbot skill family (`bot_botimp.c:113-153`, 38 entries) uses `FB_CVAR_*` macros that expand to `k_fbskill_*` cvar names — those are handled by `setSkillAttributes` runtime writes per skill preset, so apply-pass-author treats them as "stored-empty, dynamically-set" rather than "stored-default-0."

**Provenance**: `grep -rn 'RegisterCvar\b' src/ --include='*.c' --include='*.h' | grep -v RegisterCvarEx` from `research/repos/ktx/`.

---

## Full candidate list

```
src/bot_botimp.c:113:	RegisterCvar(FB_CVAR_DODGEFACTOR);
src/bot_botimp.c:114:	RegisterCvar(FB_CVAR_LOOKANYWHERE);
src/bot_botimp.c:115:	RegisterCvar(FB_CVAR_LOOKAHEADTIME);
src/bot_botimp.c:116:	RegisterCvar(FB_CVAR_PREDICTIONERROR);
src/bot_botimp.c:117:	RegisterCvar(FB_CVAR_VISIBILITY);
src/bot_botimp.c:118:	RegisterCvar(FB_CVAR_LGPREF);
src/bot_botimp.c:119:	RegisterCvar(FB_CVAR_ACCURACY);
src/bot_botimp.c:120:	RegisterCvar(FB_CVAR_YAW_MIN_ERROR);
src/bot_botimp.c:121:	RegisterCvar(FB_CVAR_YAW_MAX_ERROR);
src/bot_botimp.c:122:	RegisterCvar(FB_CVAR_YAW_MULTIPLIER);
src/bot_botimp.c:123:	RegisterCvar(FB_CVAR_YAW_SCALE);
src/bot_botimp.c:124:	RegisterCvar(FB_CVAR_PITCH_MIN_ERROR);
src/bot_botimp.c:125:	RegisterCvar(FB_CVAR_PITCH_MAX_ERROR);
src/bot_botimp.c:126:	RegisterCvar(FB_CVAR_PITCH_MULTIPLIER);
src/bot_botimp.c:127:	RegisterCvar(FB_CVAR_PITCH_SCALE);
src/bot_botimp.c:128:	RegisterCvar(FB_CVAR_ATTACK_RESPAWNS);
src/bot_botimp.c:129:	RegisterCvar(FB_CVAR_REACTION_TIME);
src/bot_botimp.c:130:	RegisterCvar(FB_CVAR_REACTION_MOVETIME);
src/bot_botimp.c:132:	RegisterCvar(FB_CVAR_MIN_VOLATILITY);
src/bot_botimp.c:133:	RegisterCvar(FB_CVAR_MAX_VOLATILITY);
src/bot_botimp.c:134:	RegisterCvar(FB_CVAR_INITIAL_VOLATILITY);
src/bot_botimp.c:135:	RegisterCvar(FB_CVAR_REDUCE_VOLATILITY);
src/bot_botimp.c:136:	RegisterCvar(FB_CVAR_OWNSPEED_VOLATILITY_THRESHOLD);
src/bot_botimp.c:137:	RegisterCvar(FB_CVAR_OWNSPEED_VOLATILITY_INCREASE);
src/bot_botimp.c:138:	RegisterCvar(FB_CVAR_ENEMYSPEED_VOLATILITY_THRESHOLD);
src/bot_botimp.c:139:	RegisterCvar(FB_CVAR_ENEMYSPEED_VOLATILITY_INCREASE);
src/bot_botimp.c:140:	RegisterCvar(FB_CVAR_ENEMYDIRECTION_VOLATILITY_INCREASE);
src/bot_botimp.c:142:	RegisterCvar(FB_CVAR_MOVEMENT_SKILL);
src/bot_botimp.c:143:	RegisterCvar(FB_CVAR_USE_ROCKETJUMPS);
src/bot_botimp.c:144:	RegisterCvar(FB_CVAR_MOVEMENT_DMM4WIGGLE);
src/bot_botimp.c:145:	RegisterCvar(FB_CVAR_MOVEMENT_WIGGLEFRAMES);
src/bot_botimp.c:146:	RegisterCvar(FB_CVAR_MOVEMENT_DMM4WIGGLETOGGLE);
src/bot_botimp.c:147:	RegisterCvar(FB_CVAR_COMBATJUMP_CHANCE);
src/bot_botimp.c:148:	RegisterCvar(FB_CVAR_MISSILEDODGE_TIME);
src/bot_botimp.c:150:	RegisterCvar(FB_CVAR_DISTANCEERROR);
src/bot_botimp.c:151:	RegisterCvar(FB_CVAR_PAIN_VOLATILITY_INCREASE);
src/bot_botimp.c:152:	RegisterCvar(FB_CVAR_SELF_MIDAIR_VOLATILITY_INCREASE);
src/bot_botimp.c:153:	RegisterCvar(FB_CVAR_OPPONENT_MIDAIR_VOLATILITY_INCREASE);
src/world.c:778:	RegisterCvar("_k_last_xonx"); // internal usage, save last XonX command
src/world.c:779:	RegisterCvar("_k_lastmap");	  // internal usage, name of last map
src/world.c:780:	RegisterCvar("_k_last_cycle_map");  // internal usage, name of last map in map cycle,
src/world.c:782:	RegisterCvar("_k_worldspawns"); // internal usage, count of maps server spawned
src/world.c:783:	RegisterCvar("_k_pow_last");  // internal usage, k_pow from last map
src/world.c:785:	RegisterCvar("_k_nospecs");  // internal usage, will reject spectators connection
src/world.c:787:	RegisterCvar("k_noitems");
src/world.c:790:	RegisterCvar("k_random_maplist"); // select random map from k_ml_XXX variables.
src/world.c:792:	RegisterCvar("k_mode");
src/world.c:793:	RegisterCvar("k_defmode");
src/world.c:794:	RegisterCvar("k_auto_xonx"); // switch XonX mode dependant on players + specs count
src/world.c:795:	RegisterCvar("k_matchless");
src/world.c:796:	RegisterCvar("k_matchless_countdown");
src/world.c:797:	RegisterCvar("k_matchless_max_idle_time"); // maximum time user can be idle in matchless mode
src/world.c:798:	RegisterCvar("k_use_matchless_dir"); // use configs/usermodes/matchless instead of configs/usermodes/ffa in matchless mode
src/world.c:799:	RegisterCvar("k_disallow_kfjump");
src/world.c:800:	RegisterCvar("k_disallow_krjump");
src/world.c:801:	RegisterCvar("k_lock_hdp");
src/world.c:802:	RegisterCvar("k_disallow_weapons");
src/world.c:803:	RegisterCvar("k_force_mapcycle"); // will use mapcycle even when /deathmatch 0
src/world.c:811:	RegisterCvar("k_pow");
src/world.c:816:	RegisterCvar("k_pow_min_players");
src/world.c:817:	RegisterCvar("k_pow_check_time");
src/world.c:820:	RegisterCvar("allow_spec_wizard");
src/world.c:821:	RegisterCvar("k_no_wizard_animation"); // disallow wizard animation
src/world.c:823:	RegisterCvar("k_vp_break");   // votes percentage for stopping the match voting
src/world.c:824:	RegisterCvar("k_vp_admin");   // votes percentage for admin election
src/world.c:825:	RegisterCvar("k_vp_captain"); // votes percentage for captain election
src/world.c:826:	RegisterCvar("k_vp_coach");   // votes percentage for coachs election
src/world.c:828:	RegisterCvar("k_vp_map");     // votes percentage for map change voting
src/world.c:829:	RegisterCvar("k_vp_pickup");  // votes percentage for pickup voting
src/world.c:830:	RegisterCvar("k_vp_rpickup"); // votes percentage for rpickup voting
src/world.c:831:	RegisterCvar("k_vp_nospecs"); // votes percentage for nospecs voting
src/world.c:832:	RegisterCvar("k_vp_teamoverlay"); // votes percentage for teamoverlay voting
src/world.c:833:	RegisterCvar("k_vp_coop");    // votes percentage for coop voting
src/world.c:834:	RegisterCvar("k_vp_hookstyle"); // votes percentage for hookstyle voting
src/world.c:835:	RegisterCvar("k_vp_antilag"); // votes percentage for antilag voting
src/world.c:836:	RegisterCvar("k_no_vote_map"); // dis allow map voting in matcless mode, also disallow /next_map
src/world.c:837:	RegisterCvar("k_vp_privategame"); // temporarily force logins on the server
src/world.c:839:	RegisterCvar("k_end_tele_spawn"); // don't remove end tele spawn
src/world.c:841:	RegisterCvar("k_motd_time"); 	  // motd time in seconds
src/world.c:843:	RegisterCvar("k_admincode");
src/world.c:845:	RegisterCvar("k_lockmap");
src/world.c:846:	RegisterCvar("k_fallbunny");
src/world.c:847:	RegisterCvar("timing_players_time");
src/world.c:848:	RegisterCvar("timing_players_action");
src/world.c:849:	RegisterCvar("allow_timing");
src/world.c:851:	RegisterCvar("lock_practice");
src/world.c:852:	RegisterCvar("k_defmap");
src/world.c:853:	RegisterCvar("k_admins");
src/world.c:854:	RegisterCvar("k_overtime");
src/world.c:855:	RegisterCvar("k_exttime");
src/world.c:856:	RegisterCvar("k_spw");
src/world.c:857:	RegisterCvar("k_spawnicide");
src/world.c:858:	RegisterCvar("k_lockmin");
src/world.c:859:	RegisterCvar("k_lockmax");
src/world.c:860:	RegisterCvar("k_spectalk");
src/world.c:864:	RegisterCvar("k_sayteam_to_spec");
src/world.c:865:	RegisterCvar("k_dis");
src/world.c:866:	RegisterCvar("dq");
src/world.c:867:	RegisterCvar("dr");
src/world.c:868:	RegisterCvar("dp");
src/world.c:869:	RegisterCvar("k_frp");
src/world.c:870:	RegisterCvar("k_highspeed");
src/world.c:871:	RegisterCvar("k_freeze");
src/world.c:872:	RegisterCvar("k_free_mode");
src/world.c:873:	RegisterCvar("k_allowed_free_modes");
src/world.c:876:	RegisterCvar("allow_toggle_practice");
src/world.c:877:	RegisterCvar("k_remove_end_hurt");
src/world.c:878:	RegisterCvar("k_allowvoteadmin");
src/world.c:880:	RegisterCvar("k_minrate");
src/world.c:881:	RegisterCvar("k_sready");
src/world.c:886:	RegisterCvar("k_entityfile");
src/world.c:930:	RegisterCvar("k_bzk");
src/world.c:931:	RegisterCvar("k_btime");
src/world.c:933:	RegisterCvar("k_idletime");
src/world.c:934:	RegisterCvar("k_timetop");
src/world.c:935:	RegisterCvar("k_membercount");
src/world.c:937:	RegisterCvar("demo_skip_ktffa_record");
src/world.c:938:	RegisterCvar("k_demoname_date"); // add date to demo name, value is argument for strftime() function
src/world.c:940:	RegisterCvar("k_exclusive"); // stores whether players can join when a game is already in progress
src/world.c:941:	RegisterCvar("k_lockmode");
src/world.c:942:	RegisterCvar("k_short_gib");
src/world.c:943:	RegisterCvar("k_ann");
src/world.c:944:	RegisterCvar("srv_practice_mode");
src/world.c:945:	RegisterCvar("add_q_aerowalk");
src/world.c:946:	RegisterCvar("k_noframechecks");
src/world.c:947:	RegisterCvar("dmm4_invinc_time");
src/world.c:950:	RegisterCvar("k_no_fps_physics");
src/world.c:952:	RegisterCvar("k_ctf_custom_models");
src/world.c:953:	RegisterCvar("k_ctf_hook");
src/world.c:954:	RegisterCvar("k_ctf_hookstyle"); // loop through hookstyle settings
src/world.c:955:	RegisterCvar("k_ctf_runes");
src/world.c:961:	RegisterCvar("k_ctf_ga");
src/world.c:962:	RegisterCvar("k_ctf_based_spawn"); // spawn players on the base (red/blue)
src/world.c:963:	RegisterCvar("k_ctf_hurt_items");
src/world.c:965:	RegisterCvar("k_spec_info");
src/world.c:966:	RegisterCvar("k_midair");
src/world.c:979:	RegisterCvar("k_rocketarena"); // rocket arena
src/world.c:980:	RegisterCvar("k_dmgfrags");
src/world.c:981:	RegisterCvar("k_tp_tele_death");
src/world.c:988:	RegisterCvar("k_allowcountchange");
src/world.c:989:	RegisterCvar("k_maxclients");
src/world.c:990:	RegisterCvar("k_maxspectators");
src/world.c:992:	RegisterCvar("k_ip_list");
src/world.c:995:	RegisterCvar("k_cmd_fp_count");
src/world.c:996:	RegisterCvar("k_cmd_fp_per");
src/world.c:997:	RegisterCvar("k_cmd_fp_for");
src/world.c:998:	RegisterCvar("k_cmd_fp_kick");
src/world.c:999:	RegisterCvar("k_cmd_fp_dontkick");
src/world.c:1000:	RegisterCvar("k_cmd_fp_disabled");
src/world.c:1004:	RegisterCvar("k_extralog");
src/world.c:1005:	RegisterCvar("k_demo_mintime");
src/world.c:1006:	RegisterCvar("k_dmm4_gren_mode");
src/world.c:1011:	RegisterCvar("k_yawnmode");
src/world.c:1012:	RegisterCvar("k_teleport_cap");
src/world.c:1015:	RegisterCvar("k_teamoverlay"); // q3 like team overlay
src/world.c:1023:	RegisterCvar("_k_captteam1"); // internal mod usage
src/world.c:1024:	RegisterCvar("_k_captcolor1"); // internal mod usage
src/world.c:1025:	RegisterCvar("_k_captteam2"); // internal mod usage
src/world.c:1026:	RegisterCvar("_k_captcolor2"); // internal mod usage
src/world.c:1027:	RegisterCvar("_k_coachteam1"); // internal mod usage
src/world.c:1028:	RegisterCvar("_k_coachteam2"); // internal mod usage
src/world.c:1029:	RegisterCvar("_k_team1"); // internal mod usage
src/world.c:1030:	RegisterCvar("_k_team2"); // internal mod usage
src/world.c:1031:	RegisterCvar("_k_team3"); // internal mod usage
src/world.c:1032:	RegisterCvar("_k_host"); // internal mod usage
src/world.c:1036:	RegisterCvar("__k_ls");  // current lastscore, really internal mod usage
src/world.c:1040:		RegisterCvar(va("__k_ls_m_%d", i));  // mode, really internal mod usage
src/world.c:1041:		RegisterCvar(va("__k_ls_e1_%d", i)); // entry team/nick, really internal mod usage
src/world.c:1042:		RegisterCvar(va("__k_ls_e2_%d", i)); // entry team/nick, really internal mod usage
src/world.c:1043:		RegisterCvar(va("__k_ls_t1_%d", i)); // nicks, really internal mod usage
src/world.c:1044:		RegisterCvar(va("__k_ls_t2_%d", i)); // nicks, really internal mod usage
src/world.c:1045:		RegisterCvar(va("__k_ls_s_%d", i));  // scores, really internal mod usage
src/world.c:1081:	RegisterCvar("k_no_scoreboard_ghosts");
src/world.c:1083:	RegisterCvar("k_lgcmode");
src/world.c:1084:	RegisterCvar("k_tot_mode");
```

---

## Cross-reference at apply time

For each batch's drafts, the apply-pass-author should:

1. Note which of the batch's cvars appear above (most batches have 5-15 hits).
2. For each hit, compare the v2 draft's `Default:` line against the bare `RegisterCvar` reality (stored empty / effective `0`).
3. If the draft claims a non-zero default, that's an F2 candidate -- verify against runtime initialization paths (mode-activation bundles like `race_settings[]`, `usermode` cfg files, `apply_X_settings()` helpers) before accepting the draft's default value.

The pattern is: bare `RegisterCvar` stores empty/0 at registration time, but the cvar's effective default may be overridden at runtime by mode-activation bundles. The L1 description's `Default:` line should reflect the value the user observes at runtime in the relevant mode -- NOT the registration default if that's never the operational value.

Examples already caught:

- `k_freshteams_limit_packs` / `k_freshteams_limit_sweep_ammo`: registered bare (stored 0); existing said 0; source `RegisterCvarEx` overrides to 1 in init bundle -- F2 false-positive (existing was correct for registration, wrong for runtime).
- `k_race_simultaneous`: registered bare (stored 0); race mode activation sets to 1 via `race_settings[]`; existing description said 0; v2 surfaces the override.
- `k_race_pace_resolution`: registered bare; existing said 0; `world.c:919` actually sets to 2 -- different bug class (not bare-vs-Ex, just wrong-default).
