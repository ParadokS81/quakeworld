# Phase 3 fan-out cost: the parameterized-family lane (amendment intent)

**Status:** OPERATOR-DIRECTED 2026-05-17. A fresh terminal drafts this as
a dated `decisions.md` D6 amendment + a Phase-3-MD recon note, gets it
ratified (operator/orchestrator), THEN the volume loop resumes
family-aware. Until ratified, the Phase-3 volume loop is GATED -- do not
resume the naive 1-knob-per-Opus fan-out.

This doc is the design-intent capture (written while the problem is
fresh, at the wrap of the terminal that surfaced it). It is NOT the
amendment itself -- it is the precise spec the amendment-drafting
terminal turns into the formal dated block with proper review.

## The problem (evidence, not inference)

Volume batches 1+2 (20 KTX commands, all `Nfav_go` / `XonY` mode
presets) each cost a separate Opus-4.7-MAX sub-agent ~55-70k tokens
(`total_tokens` 59640..72067 across the 24 dispatches incl. re-runs).
These knobs are **one behavior parameterized by one literal**:
`1fav_go`..`20fav_go` are the identical `xfav_go` handler differing only
by the slot integer; `XonY`/`XonYonZ` are the identical `UserMode`
dispatcher differing only by the preset selector. Re-deriving the same
read-site judgment + re-loading the skill + re-grepping `commands.c` 20
times for one finding is pure waste.

Cost shape of the remaining 598:
- **~480 genuinely individual** (shipped_doc cvars, residue cvars,
  C2-conflict candidates): per-knob Opus-MAX is the spec's deliberate,
  correct price (D7: "low-reasoning first pass is false economy on the
  one thing that must be correct"). ~25-30M tokens. The arc signed up
  for this; leave it.
- **~80-120 parameterized-family members** (the waste): naive ~5-8M
  tokens to emit ~100 records that are template + one literal. Family
  lane collapses this 5-15x AND cuts dispatcher/terminal count (the
  reason the surfacing terminal hit 400k after only 2 batches).

EXACT family sizes are an estimate -- the amendment terminal MUST
quantify them from the manifest (grep contiguous same-handler
registration blocks) before sizing the remaining work.

## The lane (what the amendment must define)

NOT a model downgrade (D6/D7 Opus-MAX stays locked for the hard corpus).
NOT a scope cut (every member still gets its own row + verdict + D7
tier-1 re-check; C1 denominator M unchanged). It is de-duplicating
**identical judgment** -- exactly what D5's "cheap-classify routes
EFFORT, not scope" authorizes, applied at family granularity.

1. **Trigger (provable twins only).** A set of in-scope knobs that are
   mechanically one behavior parameterized by one axis: same handler
   function, same registration shape, contiguous registration block,
   differing only by a literal arg. Detectable from the manifest
   (`source_ref.source_file` + contiguous lines + same handler).
   Verified-this-session examples: `Nfav_go` (xfav_go, slot arg);
   strong-inference `Nfav_add` (favx_add); `XonY`/`XonYonZ` UserMode
   presets (UserMode, preset selector). The 38 `k_fbskill_*` are a
   RELATED family (D8 mechanism-only, each a DISTINCT weighting) -> a
   shared-context batch, NOT pure template substitution; the amendment
   should treat that as a sub-case (one bot-skill mechanism model
   established once, 38 mechanism-only records).
2. **One Opus-4.7-MAX family evaluation** establishes (a) the shared
   mechanism description template, read-site-grounded against the shared
   handler at the anchor, (b) the parameter axis (what each member's
   literal selects), (c) the explicit per-member parameter list.
3. **Per-member binding stays mandatory + verified** (the safety
   property -- this is what keeps C3/confabulation guarantees). Each
   member's record = template with its parameter substituted AND its
   source binding independently confirmed: the member's registration
   row exists at its manifest `source_ref` line, dispatches the SAME
   handler, with the expected literal. Cheap mechanical/Sonnet check,
   NOT re-derivation. **Divergence-catch:** a member whose binding does
   NOT fit the template (different handler, different arg pattern, a
   real shipped comment) is EJECTED from the lane and runs the full
   per-knob Opus-MAX path. This preserves the "never assert function
   you have not verified" core (the sb_qtvlist_url / F-C3c precedent).
4. **Everything else stays per-knob Opus-MAX.** The default is
   unchanged; the family lane is the explicit, narrow exception for
   provable twins. Heterogeneous cvars, shipped_doc candidates,
   C2 meaning-conflict candidates, residue/hedge: untouched.
5. **Rigor unchanged:** D7 tier-1 still independently re-checks every
   synthesized row; anchor stamp, `source_ref` via the existing
   `*_versions` mechanism, the flat provenance-array shape, C1 M
   denominator -- all unchanged. Every member still ends as its own
   owned row with its own verdict trail.

## Why this is an amendment, not a silent change

It alters D6 fan-out granularity ("one sub-agent per in-scope knob" ->
"one per knob OR one per provable identical-family with per-member
verified binding") and touches the wording of D7's "every synthesized
row" (still literally true -- every row still gets a record + tier-1
recheck; only the AUTHORING is family-shared). `decisions.md` D6, the
Phase-3 MD Task 2, and the executor prompt all currently say per-knob.
Per the never-silently-override discipline + the amendment-precedence
clause, it lands as a DATED block under `decisions.md` D6 (concise
mirror in the spec per the established pattern) + a Phase-3-MD recon
note, ratified by operator/orchestrator before the loop resumes.

## Fresh-terminal task -- TWO stages, two terminals, in order

This is a `decisions.md` D6 amendment. D6 is consumed by Phase 3 (KTX)
AND Phase 4 (MVDSV fans the SAME D6 skill -- see the D7 clarification
block "Cross-cutting: Phase 4 fans the SAME D6 skill"). A change to D6
fan-out granularity is therefore cross-phase decision memory ->
**orchestrator-owned**, NOT an executor default. The arc-executor skill
explicitly does not amend `decisions.md`; amendments route through
orchestrator + operator. So:

### Stage A -- arc-ORCHESTRATOR terminal (fresh): the amendment

1. Invoke `arc-orchestrator` (or the operator acting as manual
   orchestrator). Read this doc + `decisions.md` D5/D6/D7 + the
   Phase-3 MD Task 2 + the resume handoff
   (`2026-05-17-ktx-mvdsv-l1-describe-fill-phase3-executor-resume.md`).
2. Quantify the families from the manifest (real numbers, not the
   estimate above): grep contiguous same-handler registration blocks;
   produce the family inventory (family -> members -> shared handler ->
   parameter axis) and the residual genuinely-individual count.
3. Draft the dated D6 amendment (the lane, points 1-5 above) + the
   concise spec mirror (amendment-precedence pattern) + the Phase-3-MD
   recon note + the one-line executor-prompt augmentation. Surface to
   the operator for ratification (this is a decision, not an executor
   default). The orchestrator owns this cross-phase memory write; it
   also flags the same lane is available to Phase 4 (MVDSV).

### Stage B -- arc-EXECUTOR terminal (fresh, ONLY after ratification): build + resume

4. Invoke `arc-executor`. Build the family-lane dispatch (one Opus-MAX
   family evaluator emitting the family JSON array + the per-member
   binding verifier as a cheap pass -- the divergence-catch is a HARD
   gate, not a formality), prove it on ONE family end-to-end
   (cheap-probe discipline) against the existing idempotent `--persist`
   + `--status`/`--fingerprint` gates, then resume the volume loop
   family-aware. Heterogeneous knobs keep the proven per-knob loop.
5. Carry forward the batch-loop learnings already in the resume handoff
   (sharpened dispatch prompt; independently grep-verify any sub-agent
   line/conflict claim before persist; extraneous top-level source_ref
   is harmless-strip-on-assembly; json.load shape-check before persist).

## State at capture (unchanged by this doc)

26 / 624 evaluated, idempotent, committed (`34328a96`); `--status`
26/598; `--fingerprint` `87349f25a85a37b0c25e5529ea5600f5`. The 26 done
are correct and not wasted. Nothing to undo. The gate is purely
forward: do not run the naive loop on the families until the lane is
ratified.

## ORCHESTRATOR ADDENDUM 2026-05-17 -- the taxonomy is THREE-way, not two (operator-surfaced; load-bearing for the amendment)

The operator surfaced this inspecting the verdict-stamped 27 (live
evidence below). "Family" was conflating two structurally different
populations. The amendment MUST encode a three-way taxonomy; treating
a category-3 cohort as category-2 twins is a QUALITY REGRESSION
disguised as efficiency (38 templated descriptions where 38 distinct
knobs need individual source-grounding).

1. **Heterogeneous individual** -> per-knob Opus-4.7-MAX (the proven
   loop, unchanged). E.g. `allow_timing`, `k_admincode`,
   `k_noframechecks`, `autotrackktx`.
2. **Index-twin family** -> the family lane (ONE Opus-MAX family eval
   + N cheap per-member index substitutions + the hard
   binding-divergence catch). Members differ ONLY by a positional
   integer/slot, same handler, same semantic role. Live evidence:
   `1fav_go`..`20fav_go` (45 total) -- `3fav_go` and `14fav_go` are
   the identical command with a slot int. `XonY`/`XonYonZ`
   mode-presets are the same shape.
3. **Namespace cohort** (shared prefix, SEMANTICALLY DISTINCT members)
   -> NOT the twin lane. Live evidence: `k_fbskill_*` (38) --
   `aim_accuracy` / `reactiontime` / `missiledodge` /
   `use_rocketjumps` / `combatjump` / `visibility` / `aim_pitch_max`
   / `vol_oppvel_incr` / `wiggleframes` ... each binds to a DIFFERENT
   source variable and a different frogbot-AI computation. The shared
   `k_fbskill_` prefix is a red herring; these are individuals that
   share a namespace, not twins.

**The discriminator is the per-member source binding -- the hard
divergence-catch must be applied as a CLASSIFIER, not only a safety
net.** Index-twins: bindings isomorphic modulo the index (same
handler, index the only free variable). Namespace-cohort members:
bindings structurally distinct per member. A cohort fed to the twin
lane should see the catch reject ESSENTIALLY ALL members -- that mass
rejection IS the signal it is category 3; route it out of the twin
lane (do not "force the family").

**Category-3 handling -- a design option for the amendment + operator
to decide (NOT locked here; the only LOCK is: never twin-collapse a
cohort):** a "cohort-scaffolded individual" lane MAY be worthwhile --
ONE Opus-MAX pass establishes the shared scaffolding ("all
`k_fbskill_*` are frogbot skill-tuning cvars, read by the bot AI at
<sites>, scaled by bot skill, mechanism <X>"), then each of the 38
still gets an INDIVIDUAL source-grounded description (its specific
variable + effect) but cheaper because the shared mechanism is not
re-derived 38x. D5-faithful effort-routing WITHOUT semantic collapse;
distinct from both pure per-knob and index-twin substitution. The
amendment terminal sizes the real cohorts from the manifest (note
sub-namespaces: `k_fbskill_aim_*` ~12, `k_fbskill_vol_*` ~12 -- still
NOT index-twins, just finer prefixes) and the operator ratifies
whether category 3 gets the cohort-scaffold lane or stays pure
per-knob. Either way: NEVER twin-collapsed.

**Process-quality note (orchestrator-verified -- grounds the "rigor is
fine, only efficiency was wrong" claim):** the 4 fresh individuals
spot-checked 3/3 citations EXACT against live KTX source incl. the
D10-canary tiebreaker `world.c:1862`
(`framechecks = bound(0, !cvar("k_noframechecks"), 1)`); F-C3c held
(`autotrackktx` described from source, weak `CD_AUTOTRACKKTX` comment
correctly rejected, NOT dead-stamped); the D10 meaning-conflict was
detected, source-tiebroken, surfaced for the D7 operator tail (not
auto-resolved); F-D6a fabrication discipline held (no fabricated
citations in the sample). The expensive process is WORTH it on real
knobs -- the lane removes only the twin/cohort waste, never the rigor.
