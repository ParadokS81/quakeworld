# Resume: enforce-L1-runtime-truth arc -- orchestrator session 4 -> session 5

**For:** arc-orchestrator, FRESH terminal. Session 4 drove + GATED Phase 4
(acceptance contract -- the arc's single most correctness-critical
boundary, "the gate that earns the word confidence"). Round-1 gate caught
two SUBSTANTIVE items at primary source (S1 + S2/F7), routed back, re-gated
the round-2 delta clean, flipped Phase 4 -> approved (commit `06cd544a`).
This handoff exists because the arc's discipline is fresh-terminal-per-gate
(sessions 1->2->3->4 each handed off) and session 4 spent its judgment
budget on the hardest gate + two finding rounds + 5 operator ratifications.
Phase 5 (the LAST draft) is still a strict-bar correctness gate (autonomous
delete-list -> nano/slime). You are COLD -- read before acting. Do NOT
execute phase code; do NOT draft phase MDs; you dispatch + independently
verify + own cross-phase memory.

## Where things are

Arc = `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`.
Slicing operator-LOCKED: 5 phases, fully SEQUENTIAL, draft-then-execute
(each drafter reads prior APPROVED MDs; EXECUTION is a DISTINCT
post-full-draft orchestration -- NOT yet started). README phase index is
authoritative.

Status:
- **Phases 1, 2, 3, 4: APPROVED.** P1 `e57a13b7`+D7 AMEND+F4/F5/F6;
  P2 `76fedcb0`; P3 `de6198d9`; **P4 `06cd544a`** (this session).
- **Phase 5 (application outputs): LAST TO DRAFT.** Not started. Deliver:
  D20 Track-A two outputs (always-on per-version L1 signal over the
  74-cmd/92-cvar pool + the narrow level-3-only feeder-tagged delete-list
  REGENERATING `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`,
  R4); D21 Track-B recovered commands first-class, element-linked,
  level-stamped, nothing withheld. `phase-5-drafter-prompt.md` is
  pre-generated (planning Step 4) -- AUGMENT it with the Phase-4
  cross-phase learnings below before dispatch.
- **Prerequisite 4: CLOSED.** Provenance corroborated THREE ways: the
  dump's embedded `<build>~<sha>` self-certification (F7), the
  orchestrator R6 re-run GREEN 74/92/129 (both pin legs `3f9e724f`), the
  session-3 byte-identical `cmp`. Not a deferred human bless.

**Phase-4 round-1 gate findings (now resolved, recorded in the MD + F7):**
- **S1** -- Task-3 stage-2 had an "or a faithful Python port" escape on
  the dump name-set extraction (R6 reinvent risk feeding the strict-bar
  level-3 verdict). Operator: route back + tighten. Resolved: stage-2
  shell-reuses the banked `front1-diff.sh` extraction (path-repointed);
  Task-2 `version-pin-proxy.sh` also exposes the cmdlist 7-564 set; NO
  Python reimplementation anywhere.
- **S2 / F7** -- the detection README + the drafter Recon claimed "the
  dump carries NO embedded version banner; the pin rests ENTIRELY on the
  proxy." Orchestrator primary-source check REFUTED it: dump line 3347
  `ezQuake 3.7.0-dev 8084~3f9e724fa` -- the `version`-command OUTPUT in
  the post-macrolist tail self-certifies the commit (`~3f9e724fa` = exact
  prefix of the pin + `oracle_meta`). Operator-ratified: wire the
  embedded-SHA as the version-pin proxy's PRIMARY hard leg (exact prefix
  vs `oracle_meta`, fail-closed), keep `front1-diff.sh:33-36` as a
  SECONDARY corroborator, `front1-diff.sh` byte-immutable. **review-findings
  F7 added** (ownership ACC; Phase 5 must regenerate the dead-entities
  artifact byte-shape consistent with this -- the dump-confirmed level-3
  rows are the Phase-4 loader's stamp, NOT a Phase-5 re-derivation).
- **OQ-1** provenance CLOSED via F7 triple corroboration · **OQ-2**
  cross-phase additive touch of the 6 Phase-3 files RATIFIED (Phase-3 OQ-1
  precedent) · **OQ-3** build-excluded STAYS level-2 RATIFIED (conservative
  D3/D19; NO decisions.md amendment) · OQ-4 front1-diff.sh immutable
  (S2 reinforces). All operator-ratified, recorded Phase-3-style in the MD.

Commits since the s3->s4 handoff: `06cd544a` (P4 APPROVED). The parallel
**ktx-mvdsv-l1-describe-fill** arc interleaves the log -- a SEPARATE arc;
stay single-arc scoped, do not touch it. Branch `main`, solo-dev silent
commits, no PR ceremony. **Pending operator-approval (proposed by session
4, not yet written):** a `reference` memory
`runtime-dump-self-certifies-commit` (a runtime console dump's
`version`-command output usually carries an embedded `<build>~<sha>`; a
"no version banner" provenance claim is a hypothesis until the dump TAIL
is checked, not just the command list; the embedded-SHA-vs-oracle_meta
prefix match is an EXACT version-pin sub-gate -- de-risks the gated
FTE/QWCL/MVDSV follow-ons). If the operator approved it, write it; else
drop it.

## Reads required (cold, in this order)

1. The scaffold per README "read in this order": `prerequisites.md`
   (item-4 CLOSED), `decisions.md` (D1-D22 + D7/D11 amendments + X1-X10 +
   non-goals IN FULL -- Phase 5 governed by **D20, D21, R4** + D7.1/D15
   feeder-tag + D13 level-routing + D1/D12 no-blend + X1-X10),
   `review-findings.md` (F1-F7, R1-R7, W1-W4 + phase-ownership; **Phase 5
   owns role "APP": R4**; also F2 74/92/129, W2; consumes F7),
   `phase-template.md`, `README.md` (LOCKED index; Phases 1-4 approved).
2. The **APPROVED Phase 1+2+3+4 MDs**. Phase 5 inputs, esp. **Phase 4
   "Outputs to next phase"**: Phase 4 SHIPS `route_by_level` (the pure
   stage-3 predicate) + the stamped `dump_confirmation` (level-3 only at
   the pinned-dump commit) + the feeder tag. **Phase 5 CONSUMES these; it
   does NOT rebuild routing** (the X2/R5 composition discipline carries to
   Phase 5 -- if the Phase-5 draft re-derives the level instead of reading
   the Phase-4 stamp, that is the R5/X2-shaped violation; surface it).
3. **The shipped artifact `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`**
   -- THE single most load-bearing Phase-5 recon (R4). Phase 5 REGENERATES
   it BYTE-SHAPE: read the LIVE in-repo file; the draft must match its
   exact sections / feeder-tagging / the existing
   sb_qtvlist_url/gl_outline_scale_world/cmdline-ghost layout. Do NOT
   trust a drafter "matches the shape" claim -- diff the regenerated shape
   vs the live file yourself (the core duty; the Phase-3 grep-scare + the
   Phase-4 F7 are the worked examples). NOTE its header says "97 cvars /
   74 commands" -- the 97 is the STALE pre-mini-arc figure (Phase-1 Recon
   F2 note); the artifact is the R4 SHAPE reference ONLY, not a pool-count
   source (74/92/129 is F2-authoritative, orchestrator-re-derived GREEN).
4. `phase-5-drafter-prompt.md` (pre-generated). AUGMENT before dispatch
   with the Phase-4 learnings: F7 exists; `route_by_level` is shipped and
   CONSUMED-not-rebuilt; build-excluded NEVER in the delete-list at ANY
   level (D20 + OQ-3 ratified); the level-3 filter trusts the Phase-4
   loader stamp (`dump_confirmation='dump-confirmed'`), not a Phase-5
   dump re-derivation (S1/S2 mean the dump cross-check already happened in
   Phase 4); D21 recovered commands first-class, level-2 PRESENT not
   withheld.
5. The spec `docs/superpowers/specs/2026-05-16-libclang-callgraph-
   reachability-design.md` (D20-D21 WHY; decisions.md is the distilled
   contract -- do NOT re-open a D).
6. The s3->s4 handoff `docs/superpowers/parking/2026-05-17-enforce-l1-
   runtime-truth-orchestrator-resume-s3-to-s4.md` (the arc's critical
   rules; still in force) -- and THIS doc.
7. Memory: `feedback_verify_dispatched_terminal_claims` (THE core duty --
   Phase 3's grep-scare + Phase 4's F7 are the worked examples: a
   sub-agent / drafter / upstream-README "verified" line is a hypothesis;
   the orchestrator's primary-source re-verification is the trust anchor),
   `feedback_parking_verified_state_is_hypothesis`,
   `reference_rigor_bar_follows_consumer` (level-3 = autonomous published
   verdict = the STRICT bar; the delete-list ships to nano/slime unseen),
   `feedback_verification_layer_catches_lift_residuals`,
   `feedback_model_effort_range`, `feedback_no_subagents_for_mechanical_edits`,
   `feedback_orchestrator_terminal_pattern`, and (if written)
   `runtime-dump-self-certifies-commit`.
8. `references/arc-phase-archetypes.md` -- Phase 5 = application/output
   archetype: automated byte-shape regen probe + **operator review of the
   PR-ready artifact** is the floor (the autonomous delete-list is a
   real published artifact -- the operator eyeballs the regenerated
   `ezquake-runtime-dead-entities.md` before it is trusted). Purely
   automated is INSUFFICIENT for the published-artifact half.

## Critical rules (carry into Phase 5 orchestration)

- **Verify dispatched-terminal claims yourself.** The Phase-4 F7 is the
  freshest worked example: an upstream README "verified" claim ("no
  version banner") propagated into the drafter Recon AND its sub-agent
  unchecked; only the orchestrator's primary-source Read of the dump tail
  caught it. For Phase 5 re-verify against LIVE source: the
  `ezquake-runtime-dead-entities.md` byte-shape (read the live file,
  diff the regen plan against it); the 74/92/129 pool; that the draft
  CONSUMES `route_by_level` + the Phase-4 `dump_confirmation` stamp
  (does NOT re-run the dump cross-check -- that is Phase 4's, done);
  that build-excluded is absent from the delete-list at every level.
- **R4 = regenerate the in-repo artifact BYTE-SHAPE.** Same sections,
  same feeder tagging per entry (D7.1/D15: callgraph feeder ->
  per-variant; commented-register feeder -> textual cite), same
  sb_qtvlist_url / gl_outline_scale_world / cmdline-ghost layout. Read
  the live file; do not invent a shape.
- **The autonomous delete-list is ONLY the level-3 dump-confirmed
  "unreachable everywhere compiled" core + the commented-register
  subclass.** build-excluded (incl. D5 conservative residue) lives ONLY
  in the always-on L1 signal, NEVER in the delete-list (D20; OQ-3
  ratified: build-excluded is permanently level-2, cannot reach the
  autonomous list at any level). A single false entry ships a wrong
  "delete this" PR to nano/slime (the strict-bar consumer).
- **D21: recovered commands first-class, NOTHING withheld.** level-2
  recovered commands are PRESENT (assistant/MCP-usable), just not in the
  autonomous delete-list; "dump-confirmed only" is correctly scoped to
  the level-3 autonomous tier, not to entity existence.
- **Phase 5 COMPOSES, does not rebuild.** `route_by_level` + the level
  stamp are Phase 4's shipped predicate/data; Phase 5 reads them. A
  Phase-5 re-derivation of the level (re-running the dump cross-check,
  re-deciding genuine-dead) is the X2/R5-shaped collision -- surface it,
  do not let it pass.
- **Brainstorm closed.** A refuted premise -> DATED `decisions.md`
  amendment + operator ratification, NEVER a silent phase-MD override
  (D7/D11 + the Phase-4 F7 path are the worked examples). OQ-shaped
  in-scope choices get an operator-ratified resolution block (one
  question at a time, plain-English consequences) -- surface, do not
  silently default.
- **Execution mode:** near-zero inline (X5); the delete-list generator +
  the first-class emission are code synthesis -> subagent; model+effort
  per `feedback_model_effort_range` (the byte-shape generator is
  Sonnet-medium-shaped against the locked artifact; no Opus-MAX
  architecture task is expected in Phase 5 -- if the draft grades one
  Opus MAX, sanity-check why). Post-draft verification sub-agent =
  Sonnet-medium Explore.
- **Cwd hygiene:** ABSOLUTE paths in Bash. If grep returns an anomalous
  empty/exit-1 on a file you know is non-empty, escalate to Read
  (primary source) -- the Phase-3 worked lesson; do not explain it away.
- **Commit cadence:** at the orchestrator APPROVED-flip, scoped `git add`
  of ONLY the arc files (the repo carries heavy unrelated drift -- never
  `git add -A`), message `docs(arc-plan): enforce-L1 Phase 5 APPROVED
  ...`, end with the `Co-Authored-By: Claude Opus 4.7` trailer. Phase 5
  is the LAST draft -- on its approval all 5 drafts are approved and the
  DISTINCT EXECUTION orchestration begins (a different mode; judge a
  fresh-terminal handoff for that -- it is NOT more drafting, it is
  arc-executor territory, and is the heaviest budget phase).

## First three actions

1. Read the scaffold + the APPROVED Phase 1-4 MDs + the shipped
   `ezquake-runtime-dead-entities.md` + the named memory COLD. Confirm:
   Phases 1-4 approved (README), prereq-4 CLOSED (F7), the
   draft-then-execute model, F7 in review-findings, the Phase-4 OQ-1/2/3
   ratifications recorded. Do NOT re-open design; do NOT re-derive pools
   (74/92/129 banked + orchestrator-re-derived GREEN, X7).
2. Augment `phase-5-drafter-prompt.md` with the Phase-4 cross-phase
   learnings (read #4 above), have the operator open the Phase-5 drafter
   terminal. If the Phase-5 drafter already halted: take its halt report
   (STATUS / MD path / sub-agent CRITICAL/SUBSTANTIVE/ADVISORY /
   decisions.md deviation / open questions).
3. Independently re-verify its "Recon facts" vs LIVE source: the
   `ezquake-runtime-dead-entities.md` byte-shape (diff the regen plan vs
   the live file YOURSELF); 74/92/129; `route_by_level` + the Phase-4
   level stamp CONSUMED not rebuilt; build-excluded absent from the
   delete-list; D21 nothing-withheld. Walk vs decisions.md (D20/D21/R4 +
   D7.1/D15/D13/D1/D12) + review-findings (R4/F2/F7/W2). Gate at the
   boundary; surface OQ-shaped choices for operator ratification (one at
   a time, plain English); capture cross-phase memory; flip Phase 5 ->
   approved ONLY on operator approval, commit at the cadence, then write
   the POST-DRAFT handoff: all 5 drafts approved -> the DISTINCT
   EXECUTION orchestration (arc-executor per phase; a different mode --
   judge a fresh terminal for it).

## When in doubt

North Star: L1 tells the runtime truth both directions, provenance a
reader can trust. Conservative always (D3/D8); never false-accuse; the
dump is the overriding answer key (D19, now with the F7 exact embedded-SHA
sub-gate); level-3 ships autonomously, level-2 is assistant-only and
NEVER withheld (D21); the two tracks never blend (D1/D12). The spec is
source-of-truth; parking/"verified"/prior-session/sub-agent/upstream-README
lines are hypotheses until re-verified vs live source (the Phase-4 F7 is
the freshest proof). Route genuine design problems to the operator as a
dated `decisions.md` amendment, never a silent override. The ezQuake
help-JSON doc-gap arc (`docs/superpowers/parking/2026-05-17-ezquake-
helpjson-doc-gap-arc.md`) is a SEPARATE sequenced follow-on -- not this
arc. The FTE/QWCL/MVDSV ship is a per-fork gated follow-on (D2/D22) --
not this arc; the F7 embedded-SHA lesson de-risks it but does not pull
it in.
