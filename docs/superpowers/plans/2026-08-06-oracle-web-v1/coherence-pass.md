# oracle-web-v1 -- cross-doc coherence pass

**Date:** 2026-08-06. **Scope:** structural coherence across README, decisions.md,
review-findings.md, and phase docs 1-6 -- the blindspot per-doc checkers cannot
see (docs individually consistent but mutually contradictory). **Chains walked:**
(1) the Outputs->Inputs mirror chain end to end (1->2, 2->3, 3->4, 3+4->5,
all->6), with special attention to the two post-drafting Phase 1 amendments
(cm.threads/cm.solved; gc.stats label pin) and the Phase 3 coordinate-precision
edit; (2) shared-resource composition (`App.tsx`, `styles/app.css`,
`Floor2MachineRoom.tsx`, the dev-flag namespace, the verification-ritual ID
namespace); (3) load-bearing-constant sweep (0.073 / 5.5s / 400u / seed 41 /
~150 dots / 900px / 1.55 / viewBox strings / queue+ambient orders / crown order /
fragment slugs / pinned gc.stats labels / baseline numbers); (4) TBD-token
ledger (grep census of all `TBD-PHASE-[0-9]` occurrences); (5) dispatch-
annotation sanity (session-tier/contract-owner census).

**What held (verified clean, no finding):** Phase 1 Outputs == Phase 2 Inputs
(contract, URL, fallback path, refresh mechanics); Phase 3's journey-handoff
contract == Phase 4's consumed values (`PULSE_ADV_PER_MS` 0.073,
`PULSE_TRAIL_UNITS` 10, `PULSE_STROKE` #4aa8ff, `PULSE_STROKE_WIDTH` 2.4,
`ROOT_LANDING_QUEUE` cm/ef/gc/cs, `LAND_FLARE_MS` 650, `PathSampler`); the
coordinate-precision edit (trunk at `(clientWidth/2, 0)`, traveler spawn at
`(cx, 44)`, mockup 942/1002/929) reads identically in Phase 3's contract,
Phase 3's Outputs, and Phase 4's Inputs; the gc.stats label-pin amendment is
mirrored exactly (Phase 1 probe 4 `["maps","mechanics","entity defs"]` ==
Phase 4's lookup table); app.css block ownership partitions cleanly (Phase 2:
mockup 5-17 subset + 166-168 + reduced-motion scroll line; Phase 3: 20-60 minus
39-41, 122-165, 186, 188-191 incl. the `.rk .rkd i.on.bl` pre-add; Phase 4:
62-120 minus 119-120/169-185; Phase 5: 39-41 + 169-185 -- no re-ships, and the
39-41/166-192 line refs were re-verified against the mockup file); the
Floor2MachineRoom hand-over chain (P2 placeholder -> P3 interface-only ->
P4 body -> P5 untouched -> P6 controlled-props, sequenced) composes;
`App.tsx` responsibilities compose in order (P2 one `createResource(loadManifest)`
+ sections; P3 reduced/why reads + stemExits signal; P5 portrait signal +
remount ternary, matchMedia count == 2 consistent with P3's read; P6 FRAGMENTS
map + lifted signals + footer, T1/T2/T3 sequenced per F7); the dev-flag
namespace is coherent (`?data=force-fallback` P2, `?dev=why` P3/P6,
`/?dev=why#discord` composition); every constant in the sweep agrees at every
occurrence (incl. registry order ef,cm,cs,gc consistent between Phase 1's emit
and Phase 3's mesh-determinism-critical iteration; crown ch/cs/cm positions
internally consistent in Phase 5; fragment table = 18 entries as claimed;
F6's rack cycle DISCORD->ENGINE FACTS->GAME CONTENT->CONCEPT NOTES ==
ROOT_LANDING_QUEUE); Phase 5's R-op citations (P3 V1/V2/V3/V6/V7/V11, P4
F1/F3/F6/F7) and Phase 6's S7 citations (P3 V12, P4 F8) all resolve; exactly
three session-tier tasks exist (P1 T1 contract owner, P3 T5, P4 T3) and no
task's tier contradicts its description; the F1 "THE MACHINE ROOM" casing in
Phase 4's F-checklist is correct rendered output (mockup `.mrhead` is
`text-transform: uppercase` with the span reset -- checked, not a copy
conflict); Phase 6's B4 carries the F7(a) arc-run-time caveat; the TBD-zero
grep pattern is satisfiable as tightened by F7(d).

Findings below, numbered CH-n, most severe first. No BREAK-class finding was
found; five DRIFTs and four NOTEs.

---

## CH-1 (DRIFT) -- Phase 3 still describes the pre-amendment Phase 1, contradicting the amended Phase 1 and Phase 4

The cm.threads/cm.solved amendment (surfaced BY Phase 3's drafting, F5) was
applied to Phase 1's contract and Outputs, and Phase 4 cites it as landed --
but Phase 3's own mirror text was never updated and still describes the
pre-amendment world, at three sites:

- `phase-3-floor1-brain.md:233-235` (Inputs): field list
  "`id/name/lit/num/sub/stationSubs/share/bars/stats/notes/teaser`" omits
  `threads`/`solved`, and: "One Phase 1 output claim is contradicted at
  drafting time -- see Open question 2 (MCP-card thread count has no raw
  field)."
- `phase-3-floor1-brain.md:897-907` (Open question 2): quotes Phase 1's
  outputs as claiming these numbers are "already derivable from cm/cs
  fields" -- **that phrase no longer exists in Phase 1**
  (`phase-1-manifest-pipeline.md:543-546` now reads "The MCP-card numbers
  Phase 3 needs ride as raw fields per the 2026-08-06 amendment: thread
  count = `cm.threads`, solved count = `cm.solved`"). OQ2's default
  ("route a finding to Phase 1 for a dated contract amendment") is an
  instruction to file F5 -- which is already filed AND resolved.
- `phase-3-floor1-brain.md:636-641` (Task 8 step 1): "Until that amendment
  lands this task is GATED on it for the one line (file the finding first,
  per Open question 2's default)." The amendment has landed
  (`phase-1-manifest-pipeline.md:226-266`); Phase 4's interpolation table
  (`phase-4-floor2-machine-room.md:78-79`) already consumes it as fact.

Self-healing at run time (the T8 gate check passes immediately; an
implementer filing "the finding" would find F5 already resolved), but a cold
reviewer walking Phase 1 -> Phase 3 -> Phase 4 will read Phase 3 asserting a
contradiction that Phase 1 no longer contains, and Phases 3 and 4 disagreeing
about whether the amendment exists.

**Fix (phase-3-floor1-brain.md only):** (a) add `threads`/`solved` to the
Inputs field list and replace the "contradicted at drafting time" sentence
with a dated note that the 2026-08-06 amendment (F5) added `cm.threads`/
`cm.solved`; (b) recast Open question 2 as RESOLVED (keep the history, mark
the amendment as landed; the only live residue is the operator's overrule
option to drop the embedded counts); (c) in Task 8 step 1, replace the
gated-until-amendment clause with "renders threads from `cm.threads` /
solved from `cm.solved` per the Phase 1 amendment 2026-08-06".

## CH-2 (DRIFT) -- `TBD-PHASE-5-scroll-quirk-retest` has no producer: it exists only in Phase 6

Ledger rule: each token has exactly one resolving owner (the phase that
drains it); consumers only reference. Grep census: the token occurs exactly
twice, both in `phase-6-ship-pass.md` (line 193, Inputs: "From Phase 5 ...
`TBD-PHASE-5-scroll-quirk-retest` -- the real-deploy scroll-quirk retest
outcome"; line 450, the Task 5 enumeration). **Phase 5 never carries the
token** -- it handles the retest substantively (Task 5 Q-rule, M11, Outputs
"The scroll quirk is adjudicated") but under no token name. Phase 6's own
Inputs preamble says these tokens are "resolved at the plan coherence pass"
-- resolution: two of the three resolve (portrait-layout, portrait-rebuild
exist in Phase 5); this one is a Phase 6 invention.

**Fix (phase-6-ship-pass.md only):** replace the line-193 bullet's token with
a plain reference ("Phase 5 Task 5 / M11 quirk adjudication, recorded in
`review-findings.md`") and remove it from the Task 5 census (10 -> 9 named
tokens; the census note "re-census at run time" already absorbs the count
change). Alternative (rejected as heavier): add the token to Phase 5, which
would touch a doc that needs no other change.

## CH-3 (DRIFT) -- Phase 6's TBD-drain file list excludes phase-1, but phase-1 hosts a live token

`phase-6-ship-pass.md:265-266` (Files touched) sanctions the drain over
"`phase-2-*.md` through `phase-6-*.md`" -- but `TBD-PHASE-2-type-mirroring`
occurs in `phase-1-manifest-pipeline.md:536` ("mechanism is Phase 2's call --
`TBD-PHASE-2-type-mirroring`"), and the B7 gate
(`phase-6-ship-pass.md:479`) greps the ENTIRE plan dir. As written, a
compliant Task 5 leaves phase-1's occurrence and B7 fails; draining it
violates the Files-touched list. (Task 5's own prose at line 445-446 says
"every remaining `TBD-PHASE-*` token in docs/superpowers/plans/..." -- the
whole dir -- so the doc is also internally split.) The related census claim
"10 distinct tokens across phases 2-6" (line 243) is name-accurate but
occurrence-inaccurate.

**Fix (phase-6-ship-pass.md only):** Files touched -> "`phase-1-*.md`
through `phase-6-*.md`", and adjust the census line to "occurrences span
phases 1-6 (phase-1 carries one reference to the Phase-2 token)".

## CH-4 (DRIFT) -- Phase 5 promises Phase 6 re-runs the regression harness; Phase 6's boundary probes don't include it

`phase-5-mobile-projection.md:617-618` (Outputs): "**Regression harness:**
A1-A6 here + the R-auto union are the arc's full automated probe set to
date; **the ship pass re-runs them as its baseline**." Phase 6's boundary set
B1-B8 (`phase-6-ship-pass.md:526-571`) contains no such re-run: B3 re-runs
only Phase 3's A5 -- and in its pre-Phase-5 form (`fetch(|location.search`,
line 540-541), dropping the `matchMedia` conjunct Phase 5's A5 extension
added and enforces ("never a second matchMedia read in a component (A5
enforces)", phase-5:615-616). Phase 5's portrait-specific probes (A2 portrait
artifacts, A3 snap-guard dedup, A4 dual-projection determinism, A6 deployed
portrait bundle) have no Phase 6 heir at all, so a Phase 6 regression (e.g.
the state-lift refactor of T1 touching `Floor1Brain`) could silently break
portrait between Phase 5's boundary and ship.

**Fix (phase-6-ship-pass.md only):** add the promised baseline -- one line in
Task 6 step 3 and a probe (e.g. "B0 -- regression baseline: re-run Phase 5's
A1-A6 and its R-auto union verbatim; all green") -- and extend B3's grep
pattern to `fetch(|location.search|matchMedia` (Phase 5's A5 shape).
Alternative: soften Phase 5's Outputs claim -- worse, since Phase 6 T1/T3
genuinely touch Phase 3/4/5 surfaces.

## CH-5 (DRIFT) -- Phase 6's arc-end deviations register omits Phase 5's D-h / D-i

`phase-6-ship-pass.md:638-640`: "The deviations register for the
spec-vs-shipped walk: Phase 3 D-a through D-e, Phase 4 D-f/D-g, plus this
phase's additive set" -- Phase 5's two sanctioned deviations
(`phase-5-mobile-projection.md:535-541`: D-h ambient-cadence restart on
projection flip; D-i one-pill CTA row at rest in portrait) are missing. The
cold reviewer walking the live page against the comp's portrait rendering
would flag both as unsanctioned differences.

**Fix (phase-6-ship-pass.md only):** register line becomes "... Phase 4
D-f/D-g, Phase 5 D-h/D-i, plus this phase's additive set".

## CH-6 (NOTE) -- Phase 5's "D-i-support" is a dangling label colliding with the defined D-i

`phase-5-mobile-projection.md:411-412` (Task 4 step 1, the dropped legacy
`addListener` fallback): "record as sanctioned deviation D-i-support if the
checker wants it pinned." D-i is already taken (line 539, the CTA-pill
deviation), "D-i-support" appears nowhere else, and the conditional phrasing
is a drafting-time checker aside. If the addListener drop deserves a pinned
deviation it should be D-j in the deviations list; otherwise drop the clause.
Informational -- no probe or ritual item references it.

**Fix (phase-5-mobile-projection.md, one line):** either delete the
parenthetical's last clause or rename to "D-j" and add it to the
deviations-by-design list.

## CH-7 (NOTE) -- probe-ID namespace reuse: Phase 3 A1-A5 vs Phase 5 A1-A6

Phase 3 and Phase 5 both number their automated probes A1-An. Every
cross-doc citation found is phase-qualified ("Phase 3's automated probes
A1-A5", phase-5:588; "A1-A6 here", phase-5:617), so no reference is actually
ambiguous today -- but any future unqualified "A4" would be. Phase 4 avoided
the collision (bare "probes 1-6"); Phase 6 used B-prefix. No action required
for the run; if edited anyway (CH-4), Phase 6's new baseline line should keep
the "Phase 5's A1-A6" qualification. Verdict: informational, no fix demanded.

## CH-8 (NOTE) -- Phase 2's skeleton diagram embeds TBD tokens as file-tree comments; if copied into code they break two later probes

`phase-2-scaffold-hello-production.md:173-175`: the binding file-map diagram
annotates files with `# Phase-2 placeholder; Phase 3 replaces content
(TBD-PHASE-3-brain-port)` etc. If a Phase 2 implementer reproduces those
annotations as code comments (the diagram is presented as the thing to
build), Phase 5's input probe `grep -rin "portrait" src/` -> zero hits
(phase-5:189, trips on `TBD-PHASE-5-portrait-layout` if it leaked) and
Phase 6's `grep -rn "TBD" apps/oracle-web/src/` -> empty (phase-6:480) both
fail. Phase 6 already rules "no marker ever belonged in code" -- the intent
is clear, the leak vector is not closed at the source.

**Fix (phase-2-scaffold-hello-production.md, one line):** under the diagram,
add: "Diagram annotations (`TBD-...`) are plan-doc markers -- never copy them
into source comments."

## CH-9 (NOTE) -- Phase 2's floor-2 provenance line has no comp counterpart and silently dies at Phase 4

`phase-2-scaffold-hello-production.md:523-525`: the skeleton's
Floor2MachineRoom placeholder renders "a small provenance line from
`manifest.generated_at` (the mockup's cornernote pattern
'brain-manifest.json · <date>')". Checked against the mockup: floor 2 has no
such element -- the only 'brain-manifest · date' rendering is inside the
un-ported `.mockupnote` meta block (mockup line 232) and the snapshot card
copy. Phase 4's full-parity port replaces the placeholder body wholesale and
never mentions the line, so it correctly disappears -- but Phase 2's framing
("everything rendered here must be mockup-truthful ... because pieces of it
survive into the port") oversells it, and an implementer might preserve it
into Phase 4, where it would be an unsanctioned P1 deviation the F-checklist
doesn't name. Composition is clean as written; purely informational.

**Fix (optional, phase-2-scaffold-hello-production.md):** tag the provenance
line "(Phase-2-only debug chrome; Phase 4's port removes it -- it is not in
the comp)".

---

## Verdict: READY FOR COLD REVIEW

No BREAK-class finding: no pair of docs is mutually impossible, every
consumed output exists at its cited producer with matching names/paths/values,
all shared files compose in the declared order, all constants agree at every
occurrence, and the dispatch annotations match the declared shape (one
contract owner + two session-tier tasks). The five DRIFTs are doc-edit-sized
(CH-1 in phase-3; CH-2/3/4/5 in phase-6 plus one line each in phase-5/2 for
the NOTEs) and all self-heal or fail loud at run time -- but CH-1 through
CH-5 should be applied BEFORE dispatching the cold adversarial review, or the
reviewer will spend its budget rediscovering them (CH-1 in particular reads
as a live Phase 1/Phase 3 contradiction to anyone walking the chain cold).
