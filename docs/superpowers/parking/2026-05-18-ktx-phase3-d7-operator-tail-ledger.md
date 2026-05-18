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

## Docket = 43 rows

Groups: 4 hedged + 20 curated (per-lane operator-tail consolidation) +
10 reasoning-marker + 9 affirmed-sample. Walk order: hedged ->
curated -> marker -> affirm-sample.

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
  run the WIDE grep before accepting. 1 data point (dmm5); if it recurs
  -> systemic (skill-fix + re-fan of the pattern), if isolated -> one-off
  re-synth. Tracking.

## Walk status

- Rows dispositioned: 11 / 43. Group 1 (hedged) COMPLETE; group 2
  (curated) IN PROGRESS (7/20).
  - 1-3 ban/banip/banrem: ACCEPT AS-IS + P4 carry (CF-1).
  - 4 dmm5: FIX; CF-2; WI-1 opened.
  - 5 allow_toggle_practice: FIX (add lock_practice guard).
  - 6-10 k_ann / k_classic_shotgun / k_cmd_fp_dontkick / k_ctf_hookstyle
    / k_demoname_date: CLEAR.
  - 11 k_disallow_weapons: FIX (under-scoped; broaden dmm4->dmm4&dmm5
    + map-entity removal + bot effect).
- FIX queue: 3 (dmm5, allow_toggle_practice, k_disallow_weapons).
- **Systemic read (SHARPENED): 3 FIX / 8 substantive. All 3 FIX share
  ONE root cause** -- multi-read-site cvars where D6 explored only the
  primary apply-site (dmm5, allow_toggle_practice, k_disallow_weapons).
  The 5 CLEAR were few-site OR D6 wide-read them. NOT random variance ->
  a PREDICTABLE class. Candidate resolution (operator decides at the
  group-2 boundary): targeted re-fan of the multi-read-site rows only
  (not blanket, not pure per-row). WI-1 wide-grep is the catching
  discipline -- keep applying it every remaining row.

## !!! SESSION WRAP -- ORCHESTRATOR SMELL ZONE (>430k). RESUME IN A FRESH TERMINAL. !!!

State fully captured + committed; the walk is resumable with zero loss.

**Resume instructions (fresh terminal):**
1. Read THIS ledger top-to-bottom (it is the complete durable record:
   source oracle, the 43-row groups, per-row dispositions, FIX queue,
   carry-forwards CF-1/CF-2, WI-1, the sharpened systemic read).
2. Restore the source oracle (it is /tmp, ephemeral -- likely gone):
   `git clone https://github.com/QW-Group/ktx.git /tmp/ktx-src-67253dc9
   && git -C /tmp/ktx-src-67253dc9 checkout 67253dc9ab4f643f1e6523a923a41caab9ea587f`
   then verify `git -C /tmp/ktx-src-67253dc9 describe --tags` ==
   `1.47-2-g67253dc` (== the anchor; proves byte-identical source).
3. Per-row method (UNCHANGED -- WI-1 is load-bearing): for each row,
   pull `description` + `description_reasoning` + `description_provenance`
   from psql; **WIDE-grep every read of the knob in /tmp/ktx-src-67253dc9**
   (not just cited sites -- the 3 FIXes were all caught this way); verify
   each claim; verdict CLEAR (log, no operator input) or FIX (surface to
   operator + record actionable re-synth spec in the FIX queue).
4. Cadence (operator-agreed): auto-proceed through CLEAR with one-line
   ledger notice; surface FIX rows + judgment/community rows to the
   operator; operator stands by.
5. **RESUME AT ROW 12 `k_free_mode`** (curated). Remaining: rows 12-24
   curated (13), then group 3 marker (rows 25-34, 10), then group 4
   affirm-sample (rows 35-43, 9).
6. At the group-2 boundary: put the systemic decision to the operator
   (targeted re-fan of multi-site rows vs per-row re-synth of the FIX
   queue). Do NOT auto-apply any FIX -- C4: re-synthesis routes through
   the D6 pipeline, never a hand UPDATE; the operator gates the path.
7. NOT a Phase-3-boundary action and NOT the holistic gate -- this is
   the in-flight D7 tier-2 tail only. Phase 3 does not ship until the
   walk completes + the FIX queue is resolved + the operator reports
   the scan verdict.

- Next (fresh terminal): row 12 `k_free_mode`.
