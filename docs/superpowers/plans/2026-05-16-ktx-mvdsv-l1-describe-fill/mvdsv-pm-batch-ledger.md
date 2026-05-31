# MVDSV Phase-4 volume batch 1 -- `pm_*` movement (6 cvars, persisted) -- 2026-05-30

> The first MVDSV volume subsystem batch after the 12-knob calibration GO.
> Loop (proven in calibration, now with persistence): D6 synthesis (Opus MAX,
> blind, minimal briefs -- skill supplies D20) -> F-D6a grep-verify -> V-pass
> (independent, Opus MAX, cold context, +canary) -> HARD GATE 2 -> seeded
> re-synth (none needed) -> PERSIST (durable + idempotent). This file is the B5
> durable record. Unlike the calibration, this batch PERSISTS (it is the volume
> run). Reusable MVDSV write path stood up here: `synthesize-mvdsv.ts`.

- **anchor_version:** `1.11-53-g18d0362` (MVDSV dev-head; `git describe` gated
  in every synthesis + V-pass sub-agent; HEAD `18d036218004f31cf701bb5060448012652de6d1`).
- **source oracle:** `research/repos/mvdsv` `src/` at `18d0362`.
- **dial:** every synthesis + V-pass sub-agent at model `opus`, MAX reasoning
  (D7 spec-lock; session `/effort max`). Honest caveat: the Agent tool exposes
  no per-sub-agent reasoning dial; the load-bearing safeguard is the
  independent cold-context V-pass, which bore out (the canary caught a
  false-negative -- see Stage 1b).
- **D20 carried by the skill** (now encoded in `describe-fill-synthesis`, not
  hand-injected). Briefs were minimal (the 9 non-inferential elements).
- **provenance policy (operator clarification 2026-05-30, Phase 4 volume):**
  `description_provenance` holds retained shipped-doc / multi-source DATA only.
  A row synthesized purely from engine source (no shipped-config candidate)
  carries `description_provenance = NULL`; its grounding is `source_ref`
  (`cvar_versions`) + `description_anchor_version` + the enforce-trace cites in
  `description_reasoning`. Mirrors `synthesize-ktx.ts`; preserves cross-engine
  serializer consistency. -> SHOULD be folded into `decisions.md` D11 as a
  dated clarification by the orchestrator (the executor did not edit decisions).
- **scope:** the 6 `pm_*` cvars, all `cvar`, all cold-synth (NULL origin
  pre-run), all `suspect_pool_member=FALSE` (verified vs
  `phase-0-artifacts/c3-suspect-pool.md`: the genuine MVDSV C3 pool is the 9
  `sv_www_*`/`sv_web_*`/`sys_sleep`/`localcommand` rows; none in this batch).
  `sv_antilag` is OUT (the D10 cross-fork DUAL, handled separately). Tasks 1-3
  (mechanical siblings) skipped: `pm_*` are cold-synth, no shipped-config
  candidates.

---

## Stage 1 -- synthesis records (6 knobs, blind fan-out, persisted)

Verdict tally: **synthesized 6 / affirmed 0 / hedged 0 / dead_stamped 0.**
(Matches the calibration's 0-affirm finding: under D5-amendment + D20, MVDSV's
comment-less movement cvars all cold-synth.) All `confidence=high`,
`description_origin=synthesized`, `description_provenance=NULL`, anchor set.

### 1. pm_airstep -- synthesized -- ref src/pmove.c:539
- DESCRIPTION: airborne step-up toggle; ON lets airborne players step onto
  ~18-unit ledges (PM_StepSlideMove vs PM_SlideMove) at a small horizontal-speed
  cost that grows with step height; OFF blocks airborne players at the edge
  (on-ground players always step). Default off. Set by serverinfo or the
  `airstep 0|1` user command (non-spectator, pre-game only, broadcast); turning
  it on force-sets pm_pground.
- key cites: gate `pmove.c:539`; STEPSIZE=18 `pmove.c:41`; speed cost
  `pmove.c:290-292` (stale "16%" comment :288 NOT inherited); flag read
  `sv_user.c:3797`; command gates `sv_user.c:2548/2556`; GameStarted
  `sv_main.c:218-226`; broadcast `sv_user.c:2568`; OnChange->pm_pground
  `sv_phys.c:74-78`; default `sv_phys.c:64`.

### 2. pm_bunnyspeedcap -- synthesized -- ref src/pmove.c:421
- DESCRIPTION: caps air-strafe (bunnyhop) speed GAIN; airborne ground-plane
  speed capped at `bunnyspeedcap * maxspeed` (a MULTIPLIER, not an absolute
  cap -- name-trap avoided); a player already faster (rocket jump) keeps that
  speed, strafing just cannot add; on-ground unaffected; 0/unset = no cap.
  Default unset.
- key cites: cap formula `pmove.c:421` (multiplier); gain-only + preserve
  `pmove.c:420,423-424`; >0 gate `pmove.c:392,418`; air-only (PM_AirAccelerate
  in !onground branch) `pmove.c:531-534`; flag read `sv_user.c:3794` (float, not
  bool); default `sv_phys.c:61`.

### 3. pm_ktjump -- synthesized -- ref src/pmove.c:736
- DESCRIPTION: keeps jump height consistent when jumping while moving DOWNWARD;
  without it leftover downward motion shortens the jump, with it the jump is
  topped back up toward a NORMAL full jump (never higher); 0=off, 1=full,
  fractional=partial lerp, >1 same as 1; flat-ground jump unchanged. Default 1.
- key cites: reachability `velocity[2] += 270` (`pmove.c:729`) precedes gate
  `if (velocity[2] < 270)` (`pmove.c:735`) -> only pre-jump v<0 (descending)
  reaches it; >0 gate `pmove.c:731`; >1 clamp `pmove.c:733-734`; lerp-to-270
  `pmove.c:736` (meag comment :732 `= max(velocity[2],270)` = floor not boost);
  flag read `sv_user.c:3795`; default `sv_phys.c:60`.

### 4. pm_pground -- synthesized -- ref src/sv_user.c:3798
- DESCRIPTION: read-only engine flag (CVAR_ROM) mirroring pm_airstep; ON
  switches to NetQuake-style collision-based ground detection (skips the QW
  per-frame downward ground re-trace) and bypasses the QW ground-snap,
  jump-bug, and landing velocity clips. Default off. Not admin-settable
  directly; enable pm_airstep to turn it on. See also: pm_airstep.
- key cites: NQ onground `pmove.c:544-547`/`627`; bypassed clips
  `pmove.c:667-674/715-722/951-959`; sole writer OnChange_pm_airstep
  `sv_phys.c:74-78`; CVAR_ROM no-op `cvar.c:134`; flag read `sv_user.c:3798`;
  default + ROM flag `sv_phys.c:65`; pmove.h:87 NQ comment.

### 5. pm_rampjump -- synthesized -- ref src/sv_user.c:3799
- DESCRIPTION: slope-aware jump mode; ON trims the jump whenever motion runs
  into a slope (so a ramp does not launch you higher/faster than a normal jump);
  on BSPX-slope maps it also raises the ground speed cap (180 up to 240, scaling
  to a max at 45 degrees) with a paired height-trim; OFF clips the jump only
  while falling, no speed boost. Boolean (any non-zero = on). Default off; reset
  per map load, auto-set by maps that carry slope data. Set by config (serverinfo)
  + per-map.
- key cites: jumpfix polarity `pmove.c:718` (`movevars.rampjump || velocity[2]<0`);
  MAX_JUMPFIX_DOTPRODUCT=-0.1 `pmove.c:50`; speed boost `pmove.c:602,607,619`
  (consts 180/240 `pmove.c:554-555`); 45-deg cap `pmove.c:614-617`; height-trim
  `pmove.c:725-727`; PHYSICSNORMAL_SET `cmodel.c:943`; per-map reset/set
  `cmodel.c:960/934`; flag read `sv_user.c:3799`; default `sv_phys.c:66`.

### 6. pm_slidefix -- synthesized -- ref src/pmove.c:513
- DESCRIPTION: on-ground vertical-velocity handling; OFF (0) zeroes vertical
  speed each ground step (classic QW; skips/floats down ramps), ON (1) keeps
  downward speed (clamps upward to 0) and applies gravity so the player hugs a
  descending ramp (NQ-style). Default off.
- key cites: onground gate `pmove.c:512`; ON `min(velocity[2],0)`+gravity
  `pmove.c:514-517`; OFF `velocity[2]=0` `pmove.c:519-520`; flag read
  `sv_user.c:3796`; default `sv_phys.c:62`; pmove.h:85 NQ comment.

---

## Stage 1b -- V-pass classification ledger

Independent, read-only, cold-context per-clause enforce-trace (model `opus`,
MAX); each V-pass sub-agent got ONLY knob + description (NOT the synth reasoning
-- B3 independence) and re-derived from `src/` at `18d0362`. Oracle gate held in
every sub-agent.

**First round (2 waves of 3 + 1 canary in wave 2): canary FAILED -> waves
rejected per HARD GATE 1.** Wave 2's `pm_ktjump`-inverted-polarity canary
("jumps while moving UPWARD / launches higher than normal") was returned
TRACED-CLEAN -- a flavour-C false-negative (the sub-agent rationalized the wrong
polarity instead of solving the `+=270`-then-`<270` arithmetic). This is exactly
the class the canary exists to catch. Both waves rejected (wave 1 had no canary
-> discrimination untested). The whole round re-run with a sharpened reachability
instruction (solve the branch arithmetic; state the reachable pre-state set;
never trust trigger-direction prose) + a canary in EACH wave.

**Re-round (sharpened, canary per wave): both canaries CAUGHT, all 6 real
TRACED-CLEAN.**

| knob | classification | flavourC | wi2 | wave |
|---|---|---|---|---|
| pm_airstep | TRACED-CLEAN | 0 | 0 | A |
| pm_bunnyspeedcap | TRACED-CLEAN | 0 | 0 | A |
| pm_ktjump (real) | TRACED-CLEAN | 0 | 0 | A |
| pm_pground | TRACED-CLEAN | 0 | 0 | B |
| pm_rampjump | TRACED-CLEAN | 0 | 0 | B |
| pm_slidefix (real) | TRACED-CLEAN | 0 | 0 | B |
| CANARY pm_slidefix-inverted | C-FIX | 1 | 1 | A (control) |
| CANARY pm_ktjump-inverted | C-FIX | 1 | 0 | B (control) |

Consistency cross-check: the REAL `pm_ktjump` ("downward") traced TRACED-CLEAN
(wave A) while the INVERTED `pm_ktjump` ("upward") traced C-FIX (wave B) -- same
knob, opposite text, opposite verdict from independent sub-agents. Same for
`pm_slidefix`. The V-pass correctly distinguishes right from wrong descriptions.

### HARD GATE 2 -- orchestrator independent re-grep (not trusting sub-agents)

F-D6a grep-verify of all load-bearing enforcing lines, plus a direct read of the
two highest-risk polarity sites the canaries tested:
- **sv_user.c:3794-3799** -- the 6 `movevars.* = pm_*` reads byte-exact;
  confirmed bunnyspeedcap + ktjump kept as float (`.value`), the other 4 as
  `((int)..!=0)` booleans.
- **sv_phys.c:60-66 + 72-78** -- registrations/defaults byte-exact (ktjump "1",
  the other 5 empty; pm_pground CVAR_ROM); OnChange_pm_airstep -> Cvar_SetROM
  pm_pground confirmed.
- **pmove.c:512-520** (slidefix) read directly: ON `min(v,0)`+gravity, OFF
  `v=0` -- real description's 0/1 mapping correct; inverted canary rightly C-FIX.
- **pmove.c:729-736** (ktjump) read directly: `+= 270` precedes `< 270` gate;
  `// meag: = max(velocity[2],270)` confirms a floor -> real "downward/restore"
  correct; "upward/higher" canary rightly C-FIX.
- pmove.c enforcing read-sites for all 6 (gates/constants) grep-confirmed:
  bunnyspeedcap 421/418/422-424; airstep 539; pground 544/627/667/951; rampjump
  718/602/619/725-727 + consts 50/554-555.

**F-D6a holds: zero fabrication across all spot-checks.**

## Stage 2 -- change report (B4 seeded re-synth)

**Zero REAL rows flagged -> zero real re-synths.** The only C-FIXes were the two
planted canary controls (never persisted). All four loop stages
(synthesize -> V-pass catch [on the canary] -> sharpen+re-dispatch -> re-clean)
were exercised; the catch came from the independent V-pass (the canary fired),
validating the safeguard end to end on the real volume batch.

## Persistence + idempotency + probes

- **Persisted:** 6/6 via `synthesize-mvdsv.ts --persist` (fill-not-create;
  UPSERT on canonical_id; `tx.json` provenance binding [NULL here]; transaction).
- **Idempotency (C4/P3):** in-scope MVDSV fingerprint
  `a4bce7864ce8954d8c3894c30d51d422` IDENTICAL across two runs; run 2 skipped all
  6 as terminal-owned (the F-D9b clobber-guard) -> byte-identical, and the
  F-D4a owned-row protection holds.
- **Probes @ mvdsv volume:** `jsonb_columns_not_strings` (extended to mvdsv this
  batch) PASS; `synthesized_requires_anchor` PASS; `provenance_entry_exists`
  PASS. `origin_vocabulary` FAIL -- but 0 contribution from this batch (MVDSV
  arc-scoped offenders = 0); the 633 offenders are ALL `ktx:recast_v2`, the D21
  format-unify origin tag never added to the probe's allowed vocabulary.
  PRE-EXISTING (since 2026-05-21), KTX-side, out of this batch's scope. NOTE:
  `synthesized_requires_source_ref` (named in the executor prompt as one of
  "four" describe_fill probes) was a placeholder in `synthesize-ktx.ts` and was
  never registered -- only 3 describe_fill probes exist live.

## Post-V-pass correction (2026-05-31, operator review)

**pm_airstep Set-by corrected.** The synthesized Set-by described the MVDSV ENGINE
airstep command (set-or-query, `airstep 0|1`). Operator review caught that the
real player-facing command is a TOGGLE. Verified: the engine airstep command is
registered `overrideable=true` (sv_user.c:3346) and KTX OVERRIDES it
(ktx commands.c:999 -> commands.c:8580 `cvar_toggle_msg`; doc CD_AIRSTEP
"toggle airstep"). On real KTX servers `/airstep` toggles + prints state; the
engine set-or-query path is unused. Corrected to the KTX toggle via the new
`synthesize-mvdsv.ts --operator-override pm_airstep` path (D11 review-tail
override; the other 5 rows stayed clobber-guard-protected). New in-scope
fingerprint `2fc714487d69a7a27bcc6e280a5b08ea`. The cvar PHYSICS is unaffected
(MVDSV pmove, not overridden). reasoning carries the correction note.

## FINDING F-MV1 -- overrideable MVDSV engine commands are replaced by the mod (KTX)

Single-codebase synthesis of an in-game command's UX documents the MVDSV engine
FALLBACK, which is unused when a mod overrides the command. `airstep` is the live
case (engine set-or-query vs KTX toggle). The V-pass cannot catch it -- its oracle
is MVDSV-only (the cross-codebase analog of F-C3c, where mvdsv `cmdlist` was blind
to KTX commands). **Implication for batch 2 + the 108-command MVDSV bucket:** for
any in-game command, or any cvar whose "Set by:" cites a command, cross-check the
KTX override table (`ktx/src/commands.c`) BEFORE synthesizing its UX -- or keep
the MVDSV row's command-UX minimal and let the KTX command row own it. The cvar
PHYSICS half is unaffected (engine-owned). Promote to review-findings.md as the
arc-wide method correction.

## Next-batch recommendation

Loop fully validated on the real volume batch (persisted, idempotent,
V-pass-clean, canary-caught, zero fabrication). The reusable MVDSV write path
(`synthesize-mvdsv.ts`) + the mvdsv jsonb-probe extension are in place. Batch 2
candidate: `qtv_*` (a coherent cold-synth-ish cluster) OR a first `sv_*` admin
slice (which would need the Task 1-3 mechanical siblings for its shipped-config
candidates -- a heavier batch). `sv_antilag` remains the separate D10 DUAL.
Two cross-cutting items for the orchestrator before/independent of batch 2:
(1) fold the provenance-NULL clarification into decisions.md D11; (2) resolve
the pre-existing `origin_vocabulary` RED (decide: add `recast_v2` to the vocab,
or treat it as a D21 mis-stamp vs D2 -- a D2-vocabulary decision, operator's).
