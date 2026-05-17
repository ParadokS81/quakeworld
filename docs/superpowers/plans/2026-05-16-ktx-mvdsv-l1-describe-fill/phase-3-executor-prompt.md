# EXECUTE Phase 3 -- KTX source-synthesis (2026-05-16 KTX/MVDSV L1 describe-fill)

You are the **arc-executor** for **Phase 3** of the
**2026-05-16 KTX / MVDSV Layer-1 describe-fill** arc. APPROVED +
PLAN-COMPLETE. You EXECUTE it -- run the Phase-1 D6 guardrailed
synthesis skill as a sub-agent fan-out over every in-scope KTX entity,
pass every synthesized row through the D7 two-tier gate, and resolve D10
meaning-conflicts inline at the D7 operator tail. You are NOT drafting;
the phase MD is the contract.

Invoke the `arc-executor` skill first. Working dir:
`/home/paradoks/projects/quakeworld`.

## Scope check -- right arc/phase only if these hold

Tell-tale: KTX **source-synthesis** (D5-D8, D10) -- the D6 skill
(`describe-fill-synthesis`) fans out at **Opus 4.7 MAX** over the
post-Phase-2 in-scope KTX set (every `shipped_doc` candidate AND every
still-NULL/`source_inline` KTX cvar -- the ~151/157 residue incl. the 38
bot `k_fbskill_*`), each row affirmed-or-synthesized through the **D7
two-tier gate** (tier-1 = independent Opus 4.7 MAX automated re-check;
tier-2 = the operator-run audit-page tail), C3 suspects get the D6
truthful dead-stamp + C1 route, `sv_antilag` described DUAL per D10.
STOP if your goal looks like a sibling arc (embedding pipeline,
game-mode L3 prose, libclang reachability, `dusty-*` fork extraction,
name-fold mini-arc, doc-landscape re-author) or like KTX *mechanical
shipped-config extract* (that was Phase 2, SHIPPED) or *MVDSV* fill
(that is Phase 4). A sibling-arc misdirection means STOP.

## Required reading (all, before executing)

1. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-3-ktx-source-synthesis.md`
   -- THE contract. Goal, Recon facts, Tasks, Files-touched,
   phase-boundary, C4 recovery. Read cold + critically.
2. `.../decisions.md` -- D5 (+ the D5 amendment: a shipped comment never
   auto-counts as done -- every `shipped_doc` row is re-evaluated), D6,
   D7 (+ its 2026-05-17 clarification: "cheap = effort-routing, not a
   cheaper model"), D8, D10, C1-C5, P1-P5. Read every DATED block in
   full.
3. `.../review-findings.md` -- your Phase 3 rows: **F-C2a (Grave --
   meaning-conflicts resolved INLINE at the D7 tail; value-differences
   route to L3, NOT L1-flagged -- D10)**, **F-C3c (Substantive -- do
   NOT dead-stamp KTX commands; they carry NO Phase-0 C3 signal,
   describe from source behaviour like any non-suspect knob)**,
   **F-D11c (Substantive, NEW -- the live `structured_choices` is the
   flat `[{value,label}]` Phase-1-locked type, NOT `{enum?,bitmask?}`;
   the D6 packet + the D7 D11/D15 serializer consume FLAT)**, **F-D9b
   (Substantive, NEW -- you OWN provenance integrity once you stamp a
   verdict; the Phase-2 loader will not re-touch terminal rows)**,
   **F-D10c (Boundary -- describe `sv_antilag` dual; do NOT extract the
   `dusty-*` fork)**, **F-C3b (Boundary -- detect/stamp/route C3
   suspects; do NOT classify reachability)**.
4. `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- SOURCE OF TRUTH. Read the `## Amendment precedence` clause near
   the top FIRST: a dated 2026-05-17 amendment GOVERNS the original C/D
   text; "spec wins" is never "original wins over amended". The D5 / D7
   amendments are mirrored in-spec.
5. `phase-template.md` -- mandatory phase shape + the verification
   sub-agent brief.
6. Live recon (verify, do not trust the MD's numbers blind): the
   post-Phase-2 DB state; the D6 skill `describe-fill-synthesis` under
   `~/.claude/skills/`; the D7 gate `apps/qw-oracle/scripts/describe-fill/review-gate.ts`;
   the 157-residue + 11-config-drift list in
   `apps/qw-oracle/scripts/describe-fill/output/describe-fill/ktx-mechanical-report.txt`.

## Orchestrator augmentations (carry these -- verified by the orchestrator)

- **Pre-dispatch holistic gate CLEAN; Phases 0 + 1 + 2 SHIPPED +
  boundary-verified by the orchestrator against live source** (not
  relayed). Phase 2 commit `953fa0cd`. The orchestrator independently
  re-ran the full Phase-2 boundary (the arc's 8th catch-or-confirm):
  count 260, idempotent `837f3875...`, 3 C5 probes [PASS], D9 seam 0,
  F-D9a CRLF 0, and the non-negotiable F-D4a `shipped_doc`
  re-derive-safe proof (owned fingerprint `5253de8f...` byte-identical
  before AND after a real `re-derive --project ktx --type cvar`, 260
  entities). Do NOT rebuild Phase 1/2; do NOT re-run the holistic gate
  (CLEAN, captured, once-per-arc).
- **Your input set is the Phase-2 hand-off, verified live.** 102 KTX
  cvars carry a staged `shipped_doc` candidate; `103/260` mechanically
  covered (incl. Phase-1 `k_short_gib`, `synthesized`); **157 residue
  enumerated** in `ktx-mechanical-report.txt` (incl. 38 bot
  `k_fbskill_*` + the 11 config-drift non-resolvers `sv_maxrate`,
  `k_dm2mod`, `k_666`, `k_autoreset`, `k_master`, `sv_www_address`,
  `sv_www_authkey`, `k_motd5`). Recon the POST-Phase-0 KTX-cvar M live
  (it re-baselined to **260**; the gate-SHAPE, not a frozen number --
  C1). Residue is tracked, NEVER importance-cut; the M denominator is
  never lowered.
- **F-D11c (NEW, orchestrator-ratified 2026-05-17 -- load-bearing).**
  The live Phase-1-locked provenance type
  (`review-gate.ts:83-89`) is `structured_choices?: Array<{ value:
  string; label: string }>` -- a **flat array** (a bitmask bit-number
  is carried as the `value` string). The phase-3 MD or any prose that
  says `{enum?,bitmask?}` is the stale drafter sub-shape, superseded by
  the Phase-1 spine + the D11 Amendment. Your D6 input packet and the
  D7 D11/D15 serializer MUST consume the FLAT shape -- a serializer
  written against `{enum?,bitmask?}` silently mis-renders every
  enum/bitmask KTX cvar. The project `tsc` gate is non-vacuous (F-C5c);
  a mismatch fails the build.
- **F-D9b (NEW, orchestrator-ratified 2026-05-17).** The Phase-2 loader
  whole-record-SKIPS terminal owned rows (`synthesized` OR
  `shipped_doc`+verdict). The moment you stamp a verdict on a
  `shipped_doc` row it becomes terminal-owned -- a later Phase-2 loader
  re-run will NOT re-touch it. **You own provenance integrity from the
  verdict-write onward**; do not assume the Phase-2 loader reconciles
  terminal rows. `k_short_gib` is the lone pre-existing terminal owned
  row (`synthesized|2`); treat it idempotently (D19/C4) -- it is
  counted once, never regressed.
- **F-C3c (carried from Phase 0 -- arc-invalidating if breached).** The
  ktx/command C3 leg is measurement-invalid: `mvdsv cmdlist` is
  structurally blind to KTX `cmd_t cmds[]` mod-path commands, so
  357/358 "absent" is the trivial structural default, ZERO liveness
  signal. **Do NOT D6-dead-stamp KTX commands** -- describe them from
  source behaviour like any non-suspect knob. The genuine C3 suspect
  pool is ktx/cvar 0 + mvdsv (not yours). Asserting DEATH for a
  KTX command the oracle cannot observe is the exact shipped lie C3
  forbids.
- **F-D4a guard re-confirm at YOUR boundary (non-negotiable).** Phase 3
  writes `synthesized` owned rows at volume + stamps verdicts. At your
  phase boundary prove (verbatim psql): fingerprint every owned row
  (`description_origin IN ('synthesized','shipped_doc')`,
  project='ktx', type='cvar') BEFORE; run a real `re-derive --project
  ktx --type cvar`; fingerprint AFTER -- byte-identical, and
  `k_short_gib` still its byte-identical `synthesized` record. The
  orchestrator re-runs this itself; a "PASS" without the verbatim
  fingerprint pair is not acceptable.
- **anchor_version convention (ratified arc-wide).** A `synthesized`
  row's `description_anchor_version` = `git describe` of the loaded KTX
  dev-head = **`1.47-2-g67253dc`** (Phase-1 `k_short_gib`'s value;
  commit `67253dc9`). Stamp Phase 3 KTX rows identically. Recon it
  live; do not hardcode blind.
- **D6 + D7 are Opus 4.7 MAX -- SPEC-LOCKED (D7), NOT a planner dial,
  NOT lowerable.** Task 2 (the D6 synthesis fan-out) and Task 3 (the
  D7 tier-1 independent evidence re-check) each dispatch sub-agents at
  Opus 4.7 max reasoning. D7's "cheap" = effort-routing, never a
  cheaper model (the dated D7 clarification). The executor honours the
  per-task dials baked into the phase MD; it does not choose them.
- **The D7 tier-2 tail is operator-run.** Every hedged + every
  C1-residue-routed + every D10 meaning-conflict (`k_noframechecks`
  polarity inversion is the verified canary) + a sampled affirm bulk
  goes to the operator-run audit-page tail. Estimated ~150-260 KTX rows
  of per-row judgment. This is the slow human gate; pace it, do not
  rush it, do not auto-affirm by origin.
- **Context budget.** Phase 3 is subagent-heavy (Task 1 assembler
  Sonnet medium; Task 2 D6 fan-out Opus-4.7-MAX; Task 3 D7 tier-1
  independent Opus-4.7-MAX). If you enter the ~350k smell zone, wrap
  cleanly and write a standard fresh-terminal resume handoff at
  `docs/superpowers/parking/2026-05-17-ktx-mvdsv-l1-describe-fill-phase3-executor-resume.md`.
  Do NOT push the highest-judgment work (D6 synthesis / D7 re-check)
  past the smell zone -- judgment fidelity degrades exactly there.

## Critical rules (locked; do not relitigate)

- **Verification discipline -- highest priority.** Re-derive every
  load-bearing number/path/shape via psql/grep/ls. A prior session's
  "verified"/"approved" is a hypothesis.
- **F-C2a (Grave) + D10.** Meaning-conflicts (polarity-label
  inversions like `k_noframechecks`) are RESOLVED inline at the D7
  tier-2 tail with KTX source as tiebreaker -- the D6 skill proposes,
  the operator resolves. Value-differences (e.g. `k_short_gib` 1/0,
  `sv_maxrate` 500000/50000) are NOT L1 conflicts -- they route to L3,
  never flagged as L1. The retained per-(cvar,source-file) provenance
  Phase 2 wrote is your evidence; never merge it.
- **D6 confabulation guard (hard).** Not source-legible -> hedge, or
  route to the C1 residue track; NEVER guess, even at Opus max. Every
  in-scope entity ends as an affirmed-or-synthesized owned description
  OR an enumerated C1-outreach-track residue row -- never a
  NULL-everything row, never importance-cut (C1).
- **D7 seam.** Every SYNTHESIZED row passes the D7 tier-1 independent
  automated evidence re-check before it commits. Affirmed-bulk rows
  spot-check to the tier-2 tail; hedged/residue/meaning-conflict rows
  go to the tier-2 tail in full.
- **`sv_antilag` is described DUAL (D10); the `dusty-*` fork is NOT
  extracted (F-D10c -- a separate future arc).** C3 suspects are
  detected/stamped/routed, NOT reachability-classified (F-C3b -- the
  parked libclang arc).
- The dated amendment GOVERNS its original C/D text. Never silently
  override a lock; never silently comply against one -- surface a dated
  amendment to the operator (the F-C5b / F-C3c / F-D9a / F-D11c
  handling pattern).
- ASCII only in committed docs/code. Bun runtime; append-only
  migrations + `SCHEMA.md` same task (P1). Main-tree git,
  commit-on-main, push at checkpoints, no worktree/PR ceremony (you run
  git silently; the operator does not touch git). Commit ONLY this
  arc's files (the pre-existing parallel-arc drift is not ours).

## Halt-and-report contract

Execute each task per its declared Execution mode (subagent at the
named model+effort -- Task 2/3 Opus 4.7 MAX, NOT lowered; do not
silently inline a subagent task). Run the phase-boundary verification
YOURSELF with verbatim probe outputs (coverage vs the POST-Phase-0 M
with the C1-outreach residue enumerated; the D7 tier-1 ran on every
synthesized row; the F-D4a owned-row re-derive-safe fingerprint pair +
`k_short_gib` byte-identical; idempotent re-run byte-identical; C5
probes still GREEN). A "PASS" without the probe output is not
acceptable. Halt with one status: **DONE** / **DONE_WITH_CONCERNS** /
**NEEDS_CONTEXT** / **BLOCKED**. Report: artifacts (paths), the
coverage table vs M, the enumerated C1-outreach residue, the D7 tier-2
operator-tail hand-off (what the operator must judge + the
`k_noframechecks`-class meaning-conflicts proposed), the F-D4a proof
verbatim, any new findings (surface for orchestrator ledger curation --
do not self-number unless trivial), open questions, and a one-line
recommendation. Do NOT proceed to Phase 4. Do NOT re-run the holistic
gate.

## Augmentation 2026-05-17 -- the parameterized-family lane (Stage B; orchestrator, Phase 3 mid-loop)

Task 2's per-knob fan-out is now SPLIT by the dated D6 family-lane
amendment in `decisions.md` (read it in full + the Phase-3-MD RECON
NOTE before Task 2). Heterogeneous knobs (508 of the 598 remaining):
the proven per-knob Opus-4.7-MAX loop + the sharpened dispatch prompt +
the grep-verify-claims discipline -- unchanged, resume as the resume
handoff describes. Family twins (90 of the 598 remaining, across 7
source-grep-verified families: xfav_go/favx_add/UserMode/TimeSet/
ksound/ChangeDM/k_fbskill_*): the family lane -- ONE Opus-4.7-MAX
family eval (dial NOT lowered) + per-member parameter substitution +
cheap independent per-member binding verify keyed off the manifest
`canonical_id`. Build the lane mechanism beside the per-knob loop,
PROVE it on one real family with a *planted false-twin the
divergence-catch must eject* (the divergence-catch is a HARD blocking
gate -- the load-bearing risk, not tokens), then resume the split
volume loop. The 22 done family members are carried, not redone
(`--status`/`--fingerprint` are the idempotent cursor). F-D6a applies
in full and is concentrated by the lane, not relaxed. This Stage B
starts ONLY after the operator has ratified the amendment (the
decisions.md Ratification line reads "Ratified", not "DRAFTED ...
PENDING").
