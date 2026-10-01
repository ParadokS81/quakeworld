# oracle-web-v1 -- cold review: chain re-walk

**Reviewer:** cold subagent, chain-re-walk shape (per `REVIEW-BRIEF.md` attack
surface #1). **Method:** read README -> decisions.md -> review-findings.md ->
phase-1 through phase-6 (Outputs->Inputs mirror chain, the two Phase 1
amendment blast radii, the README/ledger/phase-doc triangle) cold, with
`coherence-pass.md` deliberately UNREAD until the walk was complete. Findings
below were captured before opening `coherence-pass.md`; the "Diff against
CH-1..9" section documents what I found afterward, including re-verification
that all nine CH fixes actually landed in the docs I had just read.

---

## Diff against CH-1..CH-9

`coherence-pass.md` claims all five DRIFTs and four NOTEs were applied before
this review was dispatched. I re-checked each against the live doc text I had
already read on my cold pass (not re-trusting the coherence-pass's own
say-so):

| CH | Claimed fix | Verified in current docs? |
|---|---|---|
| CH-1 | Phase 3 recast to describe the landed cm.threads/cm.solved amendment | YES -- `phase-3-floor1-brain.md:233-236` (Inputs) lists `threads`/`solved` and cites the amendment as landed; Open question 2 (`:898-906`) reads "RESOLVED (2026-08-06 Phase 1 amendment)"; Task 8 step 1 (`:638-641`) reads "the raw field this task surfaced; Phase 1 contract amendment landed 2026-08-06 -- Open question 2, resolved" |
| CH-2 | Drop the invented `TBD-PHASE-5-scroll-quirk-retest` token; Phase 6 references the retest by prose, not a token | YES -- `phase-6-ship-pass.md:193-195` reads "Phase 5 owns and records it (its Task 5 / ritual item M11; no token exists for it)"; Task 5's census (`:449-453`) enumerates 9 tokens, none of them the quirk one |
| CH-3 | Phase 6 Files-touched list "phase-1-*.md through phase-6-*.md" | YES -- `phase-6-ship-pass.md:265-266` reads exactly that, with a parenthetical explaining phase-1 carries `TBD-PHASE-2-type-mirroring` |
| CH-4 | Add a B0 regression-baseline probe re-running Phase 5's harness; widen B3's grep to include `matchMedia` | YES -- `phase-6-ship-pass.md:530-535` (B0) and `:547-552` (B3, "the amended pattern including the `matchMedia` conjunct") |
| CH-5 | Deviations register add Phase 5 D-h/D-i | YES -- `phase-6-ship-pass.md:649-654` lists "Phase 4 D-f/D-g, Phase 5 D-h ... and D-i ..., plus this phase's additive set" |
| CH-6 | Drop or relabel the dangling "D-i-support" clause | YES -- `phase-5-mobile-projection.md:409-413` now reads "a sanctioned support-floor deviation, recorded in this step; it needs no ritual D-label since no ritual item can observe it" (clause deleted, not relabeled -- one of the two sanctioned options, correctly applied) |
| CH-7 | Informational, no fix demanded | N/A -- confirmed no fix needed/applied |
| CH-8 | Add a line under Phase 2's skeleton diagram warning TBD annotations are doc-only | YES -- `phase-2-scaffold-hello-production.md:154-157` (the sentence immediately before the diagram) |
| CH-9 | Tag Phase 2's floor-2 provenance line as removed-by-Phase-4/no-comp-counterpart | YES -- `phase-2-scaffold-hello-production.md:523-529` ("The provenance line is Phase-2-only scaffolding with NO mockup counterpart on this floor -- Phase 4's parity port removes it") |

All nine confirmed landed. The coherence pass's own claim holds. This
re-verification also confirms the two Phase 1 amendment blast radii
propagate cleanly end to end (Phase 1 -> Phase 3 T8 -> Phase 4's
interpolation table -> Phase 6 T4 step 3's `cm.solved` consumer
confirmation) -- CH-1 was the only place that chain had actually broken, and
it is fixed.

**What CH-1..9 did NOT check for** (and where my fresh walk found yield):
the coherence pass's own stated method verifies that consumed *values* match
their producers ("Phase 1 probe 4 `[...]` == Phase 4's lookup table"). It
does not verify that finding-number *citations* embedded in prose/comments
resolve to real ledger entries. That gap is exactly the orchestrator's
self-flagged error class #2 ("invented a finding number... a later drafter
chased it") -- and it recurs, uncaught, below.

---

## CR-CHAIN-1 (MINOR) -- phantom finding-number citation "F-E" in Phase 1, matching the orchestrator's own error class #2

`phase-1-manifest-pipeline.md:109`:
> `// gc's three labels are BYTE-PINNED contract literals, in this order:
> "maps", "mechanics", "entity defs" -- consumers may key by them (2026-08-06
> amendment, F-E)`

`phase-1-manifest-pipeline.md:249`:
> `**Sibling amendment, same date (surfaced by Phase 4 checker F-E):** the
> three gc.stats label strings are BYTE-PINNED emitter config...`

`review-findings.md` contains exactly seven entries: F1, F2, F3, F4, F5, F6,
F7. There is no "F-E". The actual finding that did this routing is
identifiable from its own text -- `review-findings.md:41-47` (F6): "...the
gc.stats label-pin routed to Phase 1 (see the label-pin amendment rider)."
So both citations should read `F6`, not `F-E`.

This is a live instance of the exact error class the brief calls out
(orchestrator error #2: "I invented a finding number... for an item that was
never in the ledger; a later drafter chased it"). `coherence-pass.md`'s
sweep verified the gc.stats VALUES match end to end (its own summary: "the
gc.stats label-pin amendment is mirrored exactly") but never checked that
the finding-number citation attached to that amendment resolves. Grep
confirms `F-E` is unique to these two lines -- it is not a recognized
compound like `F-checklist`/`F-items`/`F-entries` (Phase 4's ritual-ID
convention), which do appear elsewhere and are legitimate.

**Why it matters beyond cosmetics:** line 109 is inside the TS contract
block that Task 1 instructs the implementer to transcribe near-verbatim into
`build-brain-manifest.ts` ("the canonical machine-readable statement is the
exported `BrainManifest` interface... this section is the normative
prose"). A dead finding-number citation is one edit away from shipping as a
permanent, unresolvable comment in production source.

**Proposed fix:** in `phase-1-manifest-pipeline.md`, replace both `F-E`
occurrences (lines 109 and 249) with `F6`.

## CR-CHAIN-2 (NOTE) -- `review-findings.md`'s physical ordering is neither numeric nor chronological

The ledger lists entries in this order: F1, F2, F3, F5, F6, F7, F4. F4
(`review-findings.md:58-62`) states "Surfaced: Phase 1 checker 2026-08-06" --
the same round as F1-F3 (`:8-30`) -- yet it is physically positioned last,
after F7 ("Surfaced 2026-08-06" during the Phase 6 checker round, the
chronologically latest entry). A reader scanning top-to-bottom for either
numeric order (expecting ...F3, F4, F5...) or chronological order (expecting
F4 grouped with F1-F3) gets neither. Not a content contradiction --
`coherence-pass.md`'s scope was structural coherence across docs, not
intra-document ordering, so this is plausibly out of its stated scope rather
than a miss -- but it is exactly the class of thing a "consistency triangle"
walk should flag, since a checker citing "F4" without re-reading the whole
ledger could reasonably assume it comes before F5 chronologically when it
does not clearly say either way from position alone.

**Proposed fix:** move the F4 entry to its numeric position (between F3 and
F5) in `review-findings.md`, or add a one-line note at the top of the ledger
that entries are NOT filed in strict chronological/numeric order (pick one
convention and state it).

## CR-CHAIN-3 (MINOR) -- README's "Where we are right now" is stale relative to the arc's actual, reviewed-cold state

`README.md:12-19`:
> - **Stage:** planning -- scaffold committed; phase docs drafting in
>   progress
> - **Last action:** scaffold created (README + decisions P1-P11 + findings
>   preamble); slicing + lane ratified by operator 2026-08-06
> - **Next action:** draft phase docs (Phase 1 contract-owner first, then
>   waves), checker passes, coherence pass, cold adversarial plan review,
>   operator intent review

Per `REVIEW-BRIEF.md:1-11`, by the time this cold review is dispatched, all
six phase docs are drafted, per-doc checker passes ran (F1-F7, several
MAJOR, all resolved in draft), and the coherence pass ran and its five
DRIFT/four NOTE fixes landed (confirmed above). The README -- the
documented entry point for anyone opening this plan cold (this reviewer
included) -- still describes an earlier stage ("phase docs drafting in
progress") and lists as "Next action" several steps that have already
happened (checker passes, coherence pass) plus the one now in flight (cold
adversarial plan review), stated as if none of it has started. This is the
"living map" doc; per this repo's own verification-discipline convention
(state docs decay, HANDOVER is prune-not-append), a reader trusting README's
status line over the phase docs' actual content would materially
mis-estimate arc progress.

**Proposed fix:** update `README.md`'s "Where we are right now" block:
`Stage: planning -- all six phase docs drafted, checker-passed, and
coherence-passed; cold adversarial plan review in progress`; `Last action:
coherence pass applied (CH-1..CH-9)`; `Next action: cold adversarial plan
review, then operator intent review`.

---

## Verdict: GO-WITH-FIXES

No MAJOR/blocking finding on the Outputs->Inputs mirror chain itself: every
producer/consumer pair I re-derived independently (Phase 1 contract -> Phase
2 mirror -> Phase 3 render -> Phase 4 interpolation -> Phase 5 layout
extraction -> Phase 6 sweep) resolves cleanly, both Phase 1 amendment blast
radii (cm.threads/cm.solved; gc.stats label-pin) propagate correctly through
every downstream doc that consumes them, and the README-sequencing-table /
ledger-citation / phase-doc triangle holds except for the three items above.
The coherence pass's own claimed fixes (CH-1..CH-9) are independently
verified landed.

Three findings, all MINOR/NOTE, none blocking a phase from executing
correctly (none of the three would cause a probe to false-pass or a
capability to ship broken -- they are traceability/doc-hygiene defects):

- **CR-CHAIN-1 (MINOR):** phantom `F-E` citation, `phase-1-manifest-pipeline.md:109,249` -> fix to `F6`.
- **CR-CHAIN-2 (NOTE):** `review-findings.md` F4 out of position -> reorder or document the convention.
- **CR-CHAIN-3 (MINOR):** `README.md` status block stale -> update to reflect drafted+checked+coherence-passed state.

Recommend applying all three (cheap, no design judgment required) before
ship; none need to block dispatching the other two cold-review shapes
(gates, spec-coverage) in parallel.
