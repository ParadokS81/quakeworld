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

- Rows dispositioned: 5 / 43. Group 1 (hedged) COMPLETE; group 2
  (curated) IN PROGRESS (1/20).
  - 1-3 ban/banip/banrem: ACCEPT AS-IS + P4 carry (CF-1).
  - 4 dmm5: FIX; CF-2; WI-1 opened.
  - 5 allow_toggle_practice: FIX (add lock_practice guard).
- FIX queue: 2 (dmm5, allow_toggle_practice).
- **Systemic-vs-one-off ratio: 2 / 2 substantive rows -> FIX** (ban
  family excluded -- trivial redirect, nothing to explore). Both caught
  ONLY by WI-1 wide-read; common root = D6 under-explores guards/call
  sites beyond the cited line. NOT concluding systemic yet. Decision
  threshold: if it holds to ~4-5 of the next several -> pivot from
  per-row re-synth to skill-prompt sharpening + targeted re-fan of the
  under-explored class (operator decides at threshold). Tracked silently
  per row; surfaced at the threshold or the group-2 boundary, not
  narrated every row (momentum).
- Next: row 6 `k_ann` (curated, synthesized).
