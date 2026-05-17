# enforce-L1-runtime-truth -- arc plan

**Spec:** `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`
(source of truth -- D1-D22 + the D11 amendment + siblings + revised pass
table; full rationale).
**Arc capture / brainstorm minutes:** `docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`
(Passes 1-5).
**Planner handoff:** `docs/superpowers/parking/2026-05-17-libclang-callgraph-reachability-arc-planner-handoff.md`.
**HUD-cvar audit (D11 strike evidence):** `docs/superpowers/parking/2026-05-17-hud-cvar-coverage-audit-findings.md`.

**North Star:** enforce L1 to tell the runtime truth in both directions --
stop SHOWING non-working commands/cvars (Track A: ghost elimination) and stop
HIDING working commands (Track B: hidden-command recovery). One coherent arc,
two mechanisms, phased and SEPARATELY GATED, zero mechanism blending.

**Status:** Planning. Scaffold built 2026-05-17 (decisions / review-findings
/ prerequisites / phase-template / handoff-prompt / README).
**Slicing LOCKED 2026-05-17 (operator-gated): 5 phases, fully SEQUENTIAL**
(Track A -> Track B -> schema+loader -> acceptance -> application; each phase
draft -> review -> ship before the next). Per-phase MDs are drafted in fresh
terminals, sub-agent-verified, operator-reviewed at each boundary.

---

## Read in this order

1. **`prerequisites.md`** -- operator-side Task 0. Items 1-3 already
   satisfied in this environment (confirm at execution start); **item 4
   (durable pinned runtime dump) is a real operator action and gates the
   acceptance phase** -- read it first.
2. **`decisions.md`** -- D1-D22 (locked design, mirrors the spec) + the D11
   amendment + X1-X10 (cross-cutting execution invariants) + non-goals.
   Every phase respects these. LOCKED by the brainstorm; do NOT re-open a D.
   If a decision is wrong, amend here (dated block) before drafting.
3. **`review-findings.md`** -- corrections (F) the spec prose got wrong,
   implementation residuals (R) the brainstorm deferred, risks (W). Phase
   ownership table at the bottom.
4. **`phase-template.md`** -- mandatory shape for every phase MD, the
   Execution-mode annotation rule, and the verification sub-agent brief.
5. **`handoff-prompt.md`** -- the generic shape per-phase drafting prompts
   follow. Per-phase pre-substituted `phase-<N>-drafter-prompt.md` files are
   generated at planning Step 4 (after the slicing gate).
6. **Per-phase MDs** -- drafted in order; see the index below.

---

## Phase index -- LOCKED 2026-05-17 (operator-gated)

Status flow: `not started` -> `drafted (awaiting review)` -> `approved` ->
`in execution` -> `shipped`. The drafter terminal does NOT auto-proceed;
operator reviews at every phase boundary.

| Phase | Status | MD | Deliverable | Runnable state at end | Verif. regime | Ctx budget |
|---|---|---|---|---|---|---|
| 1 | approved (2026-05-17; OQ-1 ratified -> D7 AMENDMENT) | phase-1-track-a-callgraph-passenger.md | **Track A -- call-graph reachability passenger.** Tier-1 shared module beside `extractor_lib/_visitor.py`/`clang_config.py`; D3-D7 (D7 amended 2026-05-17); read-only observer, single seam, fail-safe-off (D6); commented-register = minimal standalone textual scanner, architecturally separate (D7.1, feeder b) | `reachable(entity)->{yes/no,which variants}` queryable; the 3-gate known-answer probes GREEN on the mechanism's own output; existing entity JSON byte-identical (X3 zero-diff) | Automated (mechanism self-validation + zero-diff) | ~250-450k (call-graph BFS/union/address-taken closure; subagent-heavy; design task Opus MAX) |
| 2 | not started | (pending draft) | **Track B -- `ezquake/_handler_hud.py` (commands-only).** New project-private handler; D8/D9/D10/D11-amended; bare `<name>` + `+hud_`/`-hud_`; R1 AST-confirm 0 non-literal first args; R7 zero-cvar guard; D16 element-key emission | Handler emits the bare/`+`/`-` commands; 3 HUD anchors + zero-`type=cvar` probe GREEN on handler JSON; existing entity JSON byte-identical (X3) | Automated (mechanism self-validation + zero-diff) | ~200-350k |
| 3 | not started | (pending draft) | **Unified L1 fidelity schema + loader.** D12 two separate provenance fields; D14 three-slot spine; D15 Track-A feeder-tagged per-variant evidence (R2 field-shape); D16 Track-B element-link storage (R3); D13 three-level coverage representation (slot 3 representation only) | Migration applied + SCHEMA.md updated; real Phase-1/2 output round-trips with correct provenance shape; F1 quality-grid GREEN | Automated (schema-port: migration applies, SCHEMA.md diff, F1, round-trip) | ~200-400k (schema-port + loader-port; design task Opus MAX) |
| 4 | not started | (pending draft) | **Acceptance contract.** D17 one shared 3-stage shape per-track; D18 hard/all-or-nothing/loud one-time-per-fork validation gate = composition of Phase-1/2 probes (R5); D19 dump-as-overriding-answer-key + version-pin sanity-proxy hard sub-gate (R6); stage-3 route-by-level; D22 per-fork-per-track precondition + off-by-default toggle | Harness passes LOUD/green at HEAD `3f9e724f`; broken-pin -> zero level-3 proven; toggle-off == today's pipeline | Automated within operator-set bounds (harness pass/fail at the pinned commit) | ~250-400k |
| 5 | not started | (pending draft) | **Application outputs.** D20 Track-A two outputs: always-on per-version L1 signal over the 74-cmd/92-cvar pool + narrow level-3-only feeder-tagged delete-list REGENERATING `ezquake-runtime-dead-entities.md` (R4; build-excluded never in it); D21 Track-B recovered commands first-class, element-linked, level-stamped, nothing withheld | Delete-list regenerates byte-shape vs the in-repo artifact; L1 signal populated over the full banked pool; recovered commands present at level-2/3; F1 GREEN | Automated (byte-shape regen + populated signal) + operator review of the PR-ready artifact | ~200-350k |

The arc is complete and useful at the end of Phase 5 (both directions of the
North Star met for ezQuake). FTE/QWCL/MVDSV are gated follow-ons (D2/D22), a
separate future arc.

---

## Slicing analysis -- LOCKED 2026-05-17 (operator-gated)

**Technique:** mechanism-tracer-first, then horizontal foundation, then
vertical application -- the qw-oracle-blessed "horizontal-then-vertical"
mixed pattern, with mechanism-VALIDATION-first because the arc exists
precisely to prevent shipping an unvalidated static signal (D13/D18: "an
unvalidated static passenger is the structurally-broken-grep failure mode
this arc exists to prevent"). The arc's biggest unknown is not deploy, not a
vendor API, not greenfield architecture -- it is *is the static mechanism
trustworthy*. That is a tracer-bullet axis. Phases 1 and 2 each fire a thin,
complete mechanism with its OWN known-answer validation through that axis.
Phase 3 is the horizontal foundation (schema/loader -- acceptable as a
one-shot precondition because vertical application comes immediately after).
Phases 4-5 are the vertical, consumer-facing slices (the autonomous
delete-list PR; the LLM-facing recovered entities).

**Why no verification-regime collision (the load-bearing invariant -- X2 /
W4):** every phase verifies on its OWN output. The two mechanism phases run
their own known-answer probes against the mechanism's own output (Track A:
the 3-gate on the `reachable()` query + feeder; Track B: the 3 anchors +
zero-cvar probe on the handler JSON) -- NOT against an L1 column the schema
phase has not built, NOT against the combined harness the acceptance phase
wires later. The known-answer harness is split exactly where the brainstorm
split it (D10/D13/D18 "design here, wiring in the acceptance pass"): probe
LOGIC ships with each mechanism phase (self-contained validation); the
COMBINED hard one-time-per-fork gate is WIRED in Phase 4 as composition of
already-validated probes, not new logic. No phase's verification needs a
later phase to exist.

**Not the pure-horizontal anti-pattern:** the arc has end-user-visible
deliverables (the autonomous delete-list PR; the recovered LLM-facing
entities). A pure data->domain->transport->UI horizontal slicing would be the
LLM-convergent anti-pattern. This slicing is not that -- the mechanisms ARE
the tracer bullets (each a thin complete validated slice), foundation is one
shot, application is vertical.

**Not a pass-through:** Phase 4 (acceptance) is not a setup-for-Phase-5
pass-through -- it ships the one-time-per-fork validation gate that is itself
independently verifiable (harness passes LOUD/green at the pinned commit;
broken-pin -> zero level-3; toggle-off parity). That gate is "the thing that
earns the word confidence" (D13/D18) -- a real deliverable.

**Sequencing (LOCKED -- operator decision 2026-05-17): fully SEQUENTIAL.**
Phases 1 and 2 are independent (D1 zero mechanism blend; different files -- a
Tier-1 shared module vs a Tier-3 ezQuake handler) and COULD parallelize, but
both tracks are correctness-judgment-heavy (a wrong call-graph false-accuses
a live entity; a wrong HUD model emits a phantom command). Per
`feedback_arc_sequencing_operator_bandwidth` (not-a-hard-dependency !=
run-in-parallel; default sequential when both need heavy operator
correctness-judgment) the operator chose sequential: 1 -> 2 -> 3 -> 4 -> 5,
each phase draft -> review -> ship before the next. One fresh terminal at a
time; no orchestrator-third-terminal needed for parallelism. Hard ordering
constraints inside the sequence: Phase 3 needs Phase 1+2 output; Phase 4
needs Phase 3 + prerequisites item 4 (durable dump); Phase 5 needs Phase 4.

**Execution-mode posture:** near-zero inline -- this is a pure code-synthesis
arc (a call-graph module, a new handler, a schema migration + loader adapter,
the harness, the delete-list generator, probes). Subagent-default throughout
(X5). The Phase 1 call-graph mechanism design and the Phase 3 two-field /
three-slot schema design are Opus-MAX-shaped (X6); mechanical synthesis
against the locked spec is Sonnet-medium-shaped; the post-draft verification
sub-agent is Sonnet-medium Explore-shape. The phase-template's >70%-inline
guard + the verification sub-agent brief defend the qw-oracle Arc 1
inline-execution defect. Per-task annotation lands in each phase MD at draft
time (planner Step 3 rough-cut recorded here; refined per phase).

**Draft order:** sequential -- one fresh terminal per phase, in order
1 -> 5. The drafter terminal does NOT auto-proceed; operator reviews at every
boundary and opens the next phase's fresh terminal on approval. The
arc-orchestrator (wave 2) drives this sequence; until it ships the operator
drives it manually via the per-phase `phase-<N>-drafter-prompt.md` files.

**Context-budget posture:** all phases land under ~450k with subagent-heavy
execution (X5/X6); none reaches the 500k failure zone; none needs a split.
Phase 1 (the call-graph BFS / per-variant union / address-taken closure) is
the heaviest single mechanism -- subagent-default mandatory, design task Opus
MAX. Flagged for the orchestrator to watch at execution; default NOT to split
(one coherent mechanism).

**Honest uncertainty:** Phase 1's budget upper bound (450k) is the least
certain -- the address-taken-closure traversal cost over the 4-variant TU set
has no analogous prior arc. Default to subagent-heavy to hold the lower
bound; re-project at the end of Phase 1.

---

## What this arc deliberately does NOT cover

Per `decisions.md` non-goals + `review-findings.md` boundary risks:

- **The `hud_<name>_<subvar>` settings-cvar half** -- already first-class
  L1 `type='cvar'` entities via `ezquake/_handler_cvars.py` (D11 amended).
  The new `_handler_hud.py` MUST NOT touch cvars (collision -- R7).
- **The ezQuake help-JSON documentation-gap arc** -- NEW future arc
  (`docs/superpowers/parking/2026-05-17-ezquake-helpjson-doc-gap-arc.md`),
  sequenced AFTER this arc (this arc produces the entity set it consumes).
- **Pre-existing 1429 `hud_*` cvars carrying the D16 element key** -- cheap
  future sibling wire, not this arc.
- **`Cmd_AddLegacyCommand` persistence; trailing-comment harvester
  precision** -- metadata-fidelity siblings, future L1-extractor arc.
- **FTE / QWCL / MVDSV ship** -- per-fork gated follow-ons (D2/D22), off by
  default, separate future arc.
- **Detection-side runtime-dump automation** -- parked future work.
- **L1 entity-name case fidelity** -- separate mini-arc, already SHIPPED
  (`8093e42f`); this arc consumes its clean pools.
- **Re-running detection / re-deriving the candidate pools** -- DONE and
  banked (X7); 74 cmd / 92 cvar / ~129 reverse.

If a phase drifts into one of these, that is scope creep -- flag it as a
deviation, do not silently proceed.

---

## Operator quick-reference

- **Kick off a phase draft:** open a fresh terminal, type
  `@docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/phase-<N>-drafter-prompt.md`
  (those per-phase files are generated at Step 4 after the slicing gate; the
  generic shape is in `handoff-prompt.md`).
- **Review a drafted phase:** read the phase MD top to bottom, run the
  YES/NO verification at its bottom, eyeball file lists + Execution-mode
  annotations, sign off (status -> `approved`) or return for revision.
- **A sub-agent finding conflicts with a decision:** the decision wins;
  reject the finding with a one-line rationale in the phase's "Open
  questions". If the decision itself is wrong, amend `decisions.md` (dated
  block) before re-drafting.
- **A new risk emerges during drafting:** append to `review-findings.md`
  with the next sequential F/R/W suffix and a phase tag.
