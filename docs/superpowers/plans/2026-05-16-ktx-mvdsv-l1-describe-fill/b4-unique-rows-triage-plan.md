# B4 unique-rows triage plan (Pass 1 output)

Source: `b4-unique-rows-triage-pass1-prompt.md` (Pass 1 classifier).
Oracle: `1.47-2-g67253dc`. Member count: 69 rows. Batches: 6.

## Prior routing (context only -- NOT in this plan's scope)

| Cluster | Rows | Ledger |
|---|---|---|
| fav_go family | 14 | b4-ledger-fav_go-calibration.md |
| dead-CF_SPC_ADMIN | 6 | b4-ledger-dead-spc-admin-cluster.md |
| midair_minheight | 2 | b4-ledger-midair-minheight.md |
| k_on_end_f_modified / k_on_end_f_ruleset / k_on_end_f_version / dmm1 / dmm3 | 5 | deferred (small clusters, no ledger yet) |
| **Total routed** | **27** | |

## Batches

### Batch B1 -- C-FIX flag/name inversion (8 rows)

- Rows (8): `ktx:command:auto_pow`, `ktx:command:autotrackktx`, `ktx:command:dinfo`, `ktx:command:dlist`, `ktx:command:fill:frogbot:std`, `ktx:cvar:k_ctf_hook`, `ktx:cvar:k_vp_map`, `ktx:info_key:*ml:userinfo`
- Shared-root hypothesis: Every row synthesized a semantic or access clause by reading a symbol NAME (a CF_ flag name, a behavior-constant name, or a command/key name literal) rather than tracing the dispatch code that actually interprets that symbol at runtime. Sub-group A (`auto_pow`, `autotrackktx`, `k_ctf_hook`): the enforcing site is the DoCommand dispatch at commands.c; CF_MATCHLESS at commands.c:1078 is ADDITIVE matchless-mode permission ("also valid without a match"), NOT a match-block -- a command with CF_MATCHLESS but without CF_MATCHLESS_ONLY is still dispatchable during a live match, and no match_in_progress guard exists on the feature path. Sub-group B (`dinfo`, `dlist`): the enforcing definition is g_syscalls.h:57, where STUFFCMD_IGNOREINDEMO = "do not put in mvd demo" (recording exclusion from the MVD stream), not "ignore during demo playback" (playback-time suppression); the two directions are opposite. Sub-group C (`fill:frogbot:std`, `k_vp_map`, `*ml:userinfo`): per-row name-pattern or symbol-interpretation error; no single shared code site confirmed at Pass 1.
- Hypothesis confidence: MEDIUM
- Pass 2 notes: Sub-group A: V-pass DoCommand dispatch + CF_MATCHLESS interpretation for one row, template remaining two. Sub-group B: V-pass g_syscalls.h:57 for one row, template dlist. Sub-group C: requires per-row verification -- no shared code site established at classification time. For `*ml:userinfo`: the `*` prefix in QW userinfo conventionally means server-set key; verify whether the V-pass seed flags a mutability/ownership clause error. Batch heterogeneity (3 sub-groups) is the reason for MEDIUM vs STRONG.

### Batch B2 -- WI-2 access-class / permission-clause errors (7 rows)

- Rows (7): `ktx:command:forcebreak`, `ktx:command:dmm4`, `ktx:command:qizmo`, `ktx:command:admin`, `ktx:cvar:k_vp_admin`, `ktx:cvar:k_vp_antilag`, `ktx:cvar:lock_practice`
- Primary classes: `forcebreak` = C-FIX; `dmm4` = WI2-FIX; `qizmo` = WI2-FIX; `admin` = C-NEAR-MISS; `k_vp_admin` = C-NEAR-MISS; `k_vp_antilag` = C-NEAR-MISS; `lock_practice` = C-NEAR-MISS
- Shared-root hypothesis: Each row has an access-class or permission clause that misstates who can issue the command or what runtime condition gates it. For command rows with CF_SPC_ADMIN at registration: Init_cmds at commands.c:1427-1458 promotes CF_SPC_ADMIN -> CF_SPECTATOR at commands.c:1448 at mod startup, so the registered cmds[] flags are a shorthand -- the runtime cf_flags include the promoted bit; effective access is any in-game player + admin spectator, not the narrower claim in the description. For `forcebreak` C-FIX: the vote-count minimum-players floor (max(2,...) in vote.c) was either misstated or the enforcing line contradicts the described behavior. For `lock_practice` C-NEAR-MISS: the described trigger (match-reset) is wrong vs the actual trigger (G_ShutDown hook).
- Hypothesis confidence: MEDIUM
- Pass 2 notes: `forcebreak`: verify whether the C-FIX is on the access-class clause or the vote-count floor clause -- the V-pass seed carries the specific wrong clause and file:line. `dmm4` + `qizmo` WI2-FIX: access-class only; core behavior fine; handle with a single Init_cmds + registration site check. `lock_practice`: the specific falsifiable claim is "trigger is G_ShutDown hook, not match-reset" -- locate the G_ShutDown registration in KTX source. Mixed primary classes (C-FIX + WI2-FIX + C-NEAR-MISS) are intentional; all are access-class-defect shape, structurally adjacent.

### Batch B3 -- C-FIX wrong mechanism / scope (13 rows)

- Rows (13): `ktx:command:-scores`, `ktx:command:commands`, `ktx:command:effi`, `ktx:command:fragsdown`, `ktx:command:shownick`, `ktx:command:summary:frogbot:editor`, `ktx:command:togglequad:frogbot:std`, `ktx:cvar:_k_coachteam1`, `ktx:cvar:_k_coachteam2`, `ktx:cvar:k_ctf_rune_bounce`, `ktx:cvar:k_fbskill_wiggleframes`, `ktx:cvar:k_freshteams_weapon_time`, `ktx:cvar:k_hoonymode`
- Shared-root hypothesis: Each row asserts a mechanism (storage path, behavior effect, scope restriction, or side-effect attribution) that is wrong vs the code's actual enforcing line on the FEATURE'S OWN handler path. Common sub-shapes: (a) described effect is enforced on an adjacent feature's code path, not the feature's own handler (k_teamoverlay correct-by-accident pattern); (b) a cvar's described write-effect doesn't match what the actual write site in the code produces; (c) a command's attributed mechanism belongs to a sibling function that handles a different invocation context. The unifying defect is that synthesis stopped at a plausible-seeming line without verifying the clause on the feature's own dispatch path. Pass 2 uses each row's V-pass seed enforcing-line citation as the anchor; callee-follow discipline applies for any helper-mediated clause.
- Hypothesis confidence: MEDIUM
- Pass 2 notes: `_k_coachteam1` / `_k_coachteam2` are a paired cvar family and likely share a structural defect; handle together within the batch as a sub-template. `commands` C-FIX: suspected scope or completeness error ("lists all commands" -- verify the specific wrong clause in the seed). Batch is heterogeneous by mechanism sub-shape; no single shared code site -- Pass 2 uses per-row seeds directly with no cluster-shared root V-pass step. MEDIUM confidence because the "wrong mechanism" shape covers several distinct implementation errors.

### Batch B4 -- C-FIX specific-value / threshold contradiction (19 rows)

- Rows (19): `ktx:command:berzerk`, `ktx:command:ctfbasedspawn`, `ktx:command:handicap`, `ktx:command:instagib_coilgun_kickback`, `ktx:command:report`, `ktx:command:rnd`, `ktx:command:rpickup`, `ktx:command:teleportcap`, `ktx:cvar:_k_worldspawns`, `ktx:cvar:k_btime`, `ktx:cvar:k_cmd_fp_per`, `ktx:cvar:k_ctf_based_spawn`, `ktx:cvar:k_ctf_hookstyle`, `ktx:cvar:k_entityfile`, `ktx:cvar:k_fbskill_aim_pitch_multiplier`, `ktx:cvar:k_matchless`, `ktx:cvar:k_matchless_max_idle_time`, `ktx:cvar:k_race_match`, `ktx:cvar:k_socd`
- Shared-root hypothesis: Each row carries at least one specific-value claim (a threshold number, a registered default, a numeric limit, a string literal, or an enum value) where the V-pass located the enforcing line in source but found the ACTUAL value or polarity in code differs from what the description states. There is no shared code site; each row's contradiction is at its own enforcing file:line already cited in the V-pass seed. The batch grouping is purely by defect-shape (specific-value mismatch), not by shared implementation. Pass 2 uses each row's V-pass seed enforcing-line citation directly as the anchor; there is no cluster-shared root V-pass step (the root is already known per row). Falsifiable per-row claim: the cited enforcing line in the seed contains a different value/polarity than the description asserts.
- Hypothesis confidence: HYPOTHESIS-WEAK
- Pass 2 notes: HYPOTHESIS-WEAK because there is no single shared code site to V-pass -- each row's wrong value lives at its own file:line. The lean v2 template amortizes the fixed overhead (per the midair_minheight calibration); the HYPOTHESIS-WEAK flag means Pass 2 proceeds row-by-row from seeds rather than doing a cluster-root V-pass first. Batch size 19 is at the top of the amortization sweet spot (target 5-20); if Pass 2 finds >=3 rows sharing the same enforcement site, surface for possible sub-batch regrouping but do not halt. `k_matchless` and `k_matchless_max_idle_time` may share a related code site (matchless-mode family); handle as a candidate sub-template if the seeds confirm.

### Batch B5 -- C-NEAR-MISS engine-boundary untraceables (5 rows)

- Rows (5): `ktx:command:info`, `ktx:command:kinfo`, `ktx:command:qlag`, `ktx:cvar:k_allow_vwep`, `ktx:cvar:k_spm_color_rgba`
- Shared-root hypothesis: Each clause asserts an effect or behavior that is enforced by the QuakeWorld engine binary (engine traps, engine-level protocol mechanisms, or external-system behavior such as client rendering or anti-lag) rather than by KTX (qwprogs.so) itself. KTX sets the cvar or calls an engine trap; the clause's enforcement lives entirely in the engine binary, not in the mod code. The V-pass correctly found no KTX-side enforcing line for these clauses because none exists on the KTX side. The falsifiable claim for Pass 2: locate the KTX-side code that invokes the engine boundary for each row (the G_ClientCommand call, the engine cvar-read site, or the engine trap registration), verify the clause can be scoped as "enforced by engine on this cvar/command," and either confirm with an engine-boundary citation or drop/hedge the clause as unverifiable against the KTX corpus.
- Hypothesis confidence: STRONG
- Pass 2 notes: `k_allow_vwep` (view weapon models): enforced by engine renderer reading the cvar; locate the engine-side cvar read site if in the source corpus. `k_spm_color_rgba` (server-player-model color encoding): RGBA parsing likely in client-side engine code; verify where the color-format clause is enforced. `qlag` (anti-lag compensation): the compensation logic lives in engine physics, not KTX; KTX may only toggle the feature on/off. `info` / `kinfo`: engine-protocol info responses; the specific field values in the response may be engine-formatted. STRONG confidence: all 5 rows share the same structural gap (KTX invokes engine; enforcement is in engine binary, not qwprogs.so).

### Batch B6 -- C-NEAR-MISS scope/path untraceables (17 rows)

- Rows (17): `ktx:command:fragsup`, `ktx:command:health:frogbot:std`, `ktx:command:infospec`, `ktx:command:laststats`, `ktx:command:lgcmode`, `ktx:command:pickspawn`, `ktx:command:prewar`, `ktx:command:qenemy`, `ktx:command:race_countdown_up`, `ktx:command:removeitem`, `ktx:command:socd`, `ktx:command:uinfo`, `ktx:cvar:k_clan_arena`, `ktx:cvar:k_extralog`, `ktx:cvar:k_fbskill_aim_lgpref`, `ktx:cvar:k_pow_p`, `ktx:cvar:k_spw`
- Shared-root hypothesis: Each clause asserts a scope restriction, access gate, or conditional behavior (mode requirement, timing condition, player-state condition) where the V-pass found the enforcing code NOT on the feature's own handler path -- either it is enforced on an adjacent feature's code path (k_teamoverlay correct-by-accident pattern: a `!isDuel()` check on a display-string path, not the feature handler) or no enforcing line exists in the KTX corpus for that specific conditionality. The clause may be directionally correct (the restriction is real in the game) but is flavour-C-positive because it was not traced to the feature's own handler. The falsifiable claim for Pass 2: for each row, trace from the command's dispatch or cvar's read site through the feature handler to find (or confirm the absence of) the asserted scope/conditional enforcing line. If the enforcing line is absent on the feature path, the clause must be dropped or reframed with a traceable adjacent-feature citation.
- Hypothesis confidence: MEDIUM
- Pass 2 notes: `prewar` and `race_countdown_up` likely share a match-phase gate structure; handle as a candidate sub-template. `lgcmode` (low gravity mode) and `socd` may share an access-class near-miss shape. `health:frogbot:std` and `removeitem` are frogbot-domain commands; verify whether the KTX frogbot handler carries the asserted scope condition. Batch is large (17 rows); if Pass 2 finds 3+ rows sharing the same absent-path pattern, surface for sub-batch regrouping within the lean v2 template. MEDIUM confidence: the shape is consistent (scope clause not on feature path) but the specific absent-path reason varies per row.

## Unclassified residue

None. All 69 rows classified and assigned to batches. Row sum verification: 8 + 7 + 13 + 19 + 5 + 17 = 69.
