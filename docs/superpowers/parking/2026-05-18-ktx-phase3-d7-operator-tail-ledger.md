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
| 6|affirm|gamemodes|16|PENDING|
| 7|synth|k_free_mode|12|[D] FIX|
| 8|synth|k_privategame_force_reconnect|17|PENDING|
| 9|affirm|race_toggle|18|PENDING|
|10|affirm|addbot:frogbot:std|19|PENDING|
|11|affirm|breakondeath:frogbot:std|20|PENDING|
|12|synth|clearmarkerflag:frogbot:editor|21|PENDING|
|13|affirm|removemarker:frogbot:editor|22|PENDING|
|14|synth|allow_toggle_practice|5|[D] FIX|
|15|hedged|ban|1|[D] ACCEPT+P4 (CF-1)|
|16|hedged|banip|2|[D] ACCEPT+P4 (CF-1)|
|17|hedged|banrem|3|[D] ACCEPT+P4 (CF-1)|
|18|affirm|k_allowvoteadmin|23|PENDING|
|19|synth|k_cmd_fp_dontkick|8|[D] CLEAR|
|20|affirm|k_exclusive|24|PENDING|
|21|synth|k_highspeed|25|PENDING|
|22|synth|toggleklist|26|PENDING|
|23|synth|votemap|27|PENDING|
|24|affirm|k_motd_time|28|PENDING|
|25|synth|k_noframechecks|29|PENDING (D10 canary)|
|26|affirm|k_sayteam_to_spec|30|PENDING|
|27|affirm|k_timetop|31|PENDING|
|28|synth|timedown|32|PENDING|
|29|synth|timeup|33|PENDING|
|30|synth|k_ctf_hookstyle|9|[D] CLEAR|
|31|synth|k_pow_pickup|34|PENDING|
|32|synth|k_spw|35|PENDING|
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

[D]=dispositioned. 15 done / 28 PENDING.
NEXT = ledger row 16 = HTML#6 `gamemodes` (affirmed -- spot-sample).

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

Legend: CLEAR = verified fine, no action. ACCEPT AS-IS + P4 carry =
correct for KTX, gap closes at Phase 4. FIX = captured finding, routed
(re-synthesis / skill-fix+re-fan).

## FIX queue (routed to targeted re-synthesis -- C4, never hand-UPDATE)

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
  run the WIDE grep before accepting. 4 data points now (dmm5 row 4,
  allow_toggle_practice row 5, k_disallow_weapons row 11, k_free_mode
  row 12) -- it RECURRED 3x, no longer a 1-off: systemic CONFIRMED.
  Resolution is the group-2-boundary operator decision (targeted re-fan
  of the multi-read-site class). Keep applying the WIDE grep every
  remaining row -- it is the catching discipline and is still load-bearing.
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

- Rows dispositioned: 14 / 43 (r13 downspecs CLEAR shared-handler;
  r14 next_best CLEAR-fact, affirm-judgment queued per PROC-1).
  Docket re-anchored this session to the
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

## Resume contract (standing -- re-assert SESSION WRAP here if this session hits the smell zone)

Prior session wrapped at the orchestrator smell zone (>430k); the
current session resumed fresh in a new terminal. State is captured +
committed after every row; the walk is resumable with zero loss at any
point.

**Resume instructions (fresh terminal):**
1. Read THIS ledger top-to-bottom (it is the complete durable record:
   source oracle, the AUTHORITATIVE 43 docket table -- HTML-sourced,
   per-row dispositions, FIX queue, carry-forwards CF-1/CF-2, WI-1, the
   systemic read). The docket source of truth is the operator's
   `ktx-review-views.html` "Review docket only" toggle (43 rows
   `data-docket="1"`); do NOT reconstruct it from psql -- that failed
   this session. The ledger's "## Docket = 43 rows" table is the
   distilled authoritative copy.
2. Restore the source oracle (it is /tmp, ephemeral -- likely gone):
   `git clone https://github.com/QW-Group/ktx.git /tmp/ktx-src-67253dc9
   && git -C /tmp/ktx-src-67253dc9 checkout 67253dc9ab4f643f1e6523a923a41caab9ea587f`
   then verify `git -C /tmp/ktx-src-67253dc9 describe --tags` ==
   `1.47-2-g67253dc` (== the anchor; proves byte-identical source).
3. Per-row method (UNCHANGED -- WI-1 is load-bearing): for each row,
   pull `description` + `description_reasoning` + `description_provenance`
   from psql; **WIDE-grep every read of the knob in /tmp/ktx-src-67253dc9**
   (not just cited sites -- the 4 FIXes were all caught this way); verify
   each claim; verdict CLEAR (log, no operator input) or FIX (surface to
   operator + record actionable re-synth spec in the FIX queue).
4. Cadence (operator-agreed): auto-proceed through CLEAR with one-line
   ledger notice; surface FIX rows + judgment/community rows to the
   operator; operator stands by.
5. **RESUME AT ROW 13 = HTML#1 `downspecs`** (synthesized). Remaining
   31 = rows 13-43 in HTML doc order; walk the authoritative-table
   PENDING rows top-to-bottom. (Affirmed rows in the set are the
   1-in-4 spot-sample -- the D7 check there is "is the affirmed text
   source-accurate / should it have been synthesized?", same WIDE-grep.)
6. Systemic decision (CONFIRMED 4/4 multi-read-site under-scope class):
   put to the operator at a natural checkpoint (no longer tied to the
   defunct "row 24 curated boundary") -- targeted re-fan of the
   multi-read-site FIX rows vs per-row re-synth. Do NOT auto-apply any
   FIX -- C4: re-synthesis routes through the D6 pipeline, never a hand
   UPDATE; the operator gates the path.
7. NOT a Phase-3-boundary action and NOT the holistic gate -- this is
   the in-flight D7 tier-2 tail only. Phase 3 does not ship until the
   walk completes + the FIX queue is resolved + the operator reports
   the scan verdict.

- Next: ledger row 15 = HTML#4 `toggletracklist` (synthesized).
