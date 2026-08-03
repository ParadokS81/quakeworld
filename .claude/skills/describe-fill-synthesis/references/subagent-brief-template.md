# Per-knob sub-agent brief template

Read by whoever dispatches the Phase 3 (KTX) / Phase 4 (MVDSV) fan-out --
NOT by the per-knob run itself. One sub-agent per in-scope knob; each runs
the `describe-fill-synthesis` skill on exactly one knob.

The skill is the unit. The dispatcher does NOT delegate the rubric
judgment or re-explain the guardrails -- those are hard-coded in the
skill. The dispatcher delegates the per-knob APPLICATION and supplies the
knob-specific, non-inferential context the skill needs.

## The brief MUST include (>=6 non-inferential elements)

Every element below is a concrete fact the dispatcher KNOWS and the sub-
agent must NOT have to infer:

1. **project** -- `ktx`, `mvdsv`, `qtv`, or `qwfwd`, stated explicitly. (Used only to
   scope source reads + the `source_ref`; never selects a rule path.)
2. **knob** -- the exact entity name as it exists in Layer 1, verbatim
   (no normalization, no guessing the canonical form).
3. **anchor_version** -- the exact KTX/MVDSV dev-head version/commit
   string the synthesis is authored against, verbatim. Stamped on every
   `synthesized` row; absence is a pre-flight ABORT.
4. **mechanical_candidate** -- the Phase 2/4 harvested candidate text +
   its retained provenance for this knob if one exists, pasted verbatim;
   or an explicit "none" (absence is normal, NOT a skip -- every entity
   is evaluated, D5 amendment).
5. **suspect_pool_member** -- explicit TRUE/FALSE from Phase 0's C3 diff
   for THIS knob (the dispatcher holds the pool; the sub-agent must not
   re-derive it). TRUE -> the skill emits the C3 dead-stamp.
6. **source root path** -- the absolute path to the `project` source tree
   to grep for read use-sites (so the sub-agent does not guess where the
   code is).
7. **model dial reminder** -- "run at Opus 4.7 MAX; the dial is locked in
   the skill, not yours to lower; 'fast affirm' is the in-invocation
   early exit, not a cheaper model" (D7).
8. **output contract** -- "return exactly the skill's structured per-knob
   record + the one-line halt contract; do NOT write files, do NOT
   commit, do NOT touch the DB; the phase persists and the D7 gate
   re-checks".
9. **out-of-scope marker** -- "evaluate and describe ONLY this one knob;
   do not improvise on adjacent knobs; if it does not resolve to a live
   KTX/MVDSV/QTV/QWFWD cvar/command/cmdline_param/info_key, abort and report".

Elements 1-9 are all non-inferential (the dispatcher supplies each as a
known fact). The skill itself supplies the judgment.

## Dispatch shape

- One sub-agent per knob, run at Opus 4.7 MAX (the skill locks this; the
  dispatcher must not downgrade it to save cost -- spec-rejected false
  economy, D7).
- The sub-agent loads the skill's four `references/` files itself (the
  skill's pre-flight enforces their presence). The brief does not paste
  the rubric -- it points at the skill, which points at the rubric.
- Collect each sub-agent's structured record. The dispatching phase
  persists records (binding `description_provenance` JSONB as JS values,
  P2) and feeds every `synthesized` row to the D7 two-tier gate (a
  separate task / separate invocation) before commit.
- The dispatcher synthesizes ACROSS knobs (coverage accounting against
  the probe-0 N/M denominator, C1 residue-ledger assembly, L3-candidate
  collection). The skill synthesizes WITHIN one knob.

## What the brief must NOT do

- Must NOT re-explain the D5 rubric, the evidence rule, the confabulation
  guard, the C3 dead-stamp, or the D8 sibling -- those are hard-coded in
  the skill; restating risks drift from the locked text.
- Must NOT instruct the sub-agent to commit, write files, or write the
  DB.
- Must NOT permit name-only synthesis or a "has a comment so it's done"
  shortcut -- the skill forbids both; the brief never overrides the
  skill.
- Must NOT lower the Opus-4.7-MAX dial or introduce a cheaper pre-
  classify tier (D7 clarification: the classify is inside the skill, at
  Opus-MAX).
