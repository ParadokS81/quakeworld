# C3 dead-stamp template + C1 residue / outreach routing recipe

The skill ENCODES these rules; it does not BUILD the suspect pool (that is
Phase 0's product, consumed by Phase 3/4) and does not run the C1 outreach.
Where this file and `decisions.md` C1 / C3 (+ C3 amendment) differ,
`decisions.md` governs; where that and the spec differ, the spec governs;
a dated amendment governs the pre-amendment text it mirrors.

## C3 -- the dead-stamp (presence is not liveness)

A symbol the source registers is NOT thereby alive. Phase 0's C3 diff
(clean the runtime `cvarlist`/`cmdlist` dump of a self-built same-commit
`mvdsv +gamedir ktx` server vs the same-version L1 extract) yields a
SUSPECT POOL, never a verdict. Classification (genuine-dead vs build /
`#ifdef`-excluded) needs the libclang call-graph and is OUT of scope (the
parked reachability arc; finding F-C3b still stands).

When the skill is invoked with `suspect_pool_member = TRUE` (Step 2): the
knob does NOT get a confident "tunes X" description. It gets the truthful
dead-stamp and routes to the C1 outreach track. Verdict `dead_stamped`.

### Dead-stamp template (use this wording)

> registered in <PROJECT> source at version <ANCHOR_VERSION>; not
> reachable in a running build at this commit; appears non-functional,
> candidate upstream code bug.

Substitute `<PROJECT>` (KTX or MVDSV -- from the `project` input, the only
place the project string is used) and `<ANCHOR_VERSION>` (the build/extract
commit the phase supplied). Do NOT soften it into a behavior claim. Do NOT
add a guessed "it would tune X if it were reachable". The stamp states the
verifiable facts: registered-at-version, not-running-reachable, candidate
upstream bug.

Record on the row: `description` = the stamp; `description_origin` =
`synthesized`; `source_ref` = the registration site `source_file:
source_line` (the place it IS in source); `description_anchor_version` =
the anchor; `description_verdict` = `dead_stamped`; route to C1.

This is a TRUTHFUL stamp, not residue: the behavior is unknown because the
symbol is unreachable, which is itself the finding. It still goes to the
C1 outreach track so the operator/community can confirm or upstream-fix it.

## C1 -- residue / community-outreach routing recipe

C1 is non-negotiable: completeness is mandatory, "undocumented" never
means "unimportant", and genuinely not-source-legible residue still gets a
row and is TRACKED, never dropped. No knob is importance-cut.

Route to the C1 outreach track when the verdict is:

- `dead_stamped` -- C3 suspect-pool member (above).
- `hedged` -- partially source-legible: the description states the legible
  part and marks the unknown; the unknown part needs community/operator
  confirmation.
- `residue_routed` -- not source-legible at all even at Opus-MAX: a
  placeholder description marks it not-yet-source-legible.

### What the C1 route is, mechanically

The skill does NOT own the residue ledger or send any outreach. It:

1. Sets `description_verdict` to one of the three above.
2. Writes the honest `description` (stamp / hedge / placeholder) and the
   `description_reasoning` explaining exactly why it could not be
   confidently synthesized (which use-sites were absent, what is unknown).
3. Emits a complete traceable row -- `source_ref` (registration or
   legible-part site) + anchor present, so the row is never a hole.
4. Hands the record to the dispatching phase, which appends it to the
   phase-owned C1 residue ledger / outreach track. The phase owns the
   ledger; the skill owns producing the honest, tracked record.

### The line that is NOT residue (D8)

A bot-skill / judgment-tier knob (e.g. `k_fbskill_*`) is NOT residue. Its
AI use-sites ARE source-legible -> it gets a mechanism-only synthesized
description and counts as COMPLETE L1 (verdict `synthesized`). The
recommended-value / tuning advice is L3 -> routed OUT to an L3 candidate
(phase-owned), and its absence does NOT count as an L1 gap. Do not put
bot/judgment knobs on the C1 residue track merely because they lack a
prose source -- "documented nowhere" means no prose source, NOT source-
illegible. Genuine residue is only the tail whose BEHAVIOR is not source-
legible even at Opus-MAX (the Step 4 confabulation guard).
