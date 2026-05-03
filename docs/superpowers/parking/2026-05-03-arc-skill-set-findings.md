# Arc skill set -- findings doc (2026-05-03)

Pre-design reading material for the conversation about a custom arc-shaped skill set. NOT a skill draft. Names where superpowers collides with arc-shaped work, what's worth borrowing, what's already in operator memory as distilled principles, and what the arc skills have to add that doesn't exist anywhere yet.

Sources reviewed:
- superpowers 5.0.7: brainstorming (164 lines), writing-plans (152), executing-plans (70), subagent-driven-development (277), verification-before-completion (139)
- philosophy docs (philosophy-of-software-design + grug-brain) -- already auto-loaded into CLAUDE.md
- Operator memory: scaffold-then-fanout, orchestrator-terminal-pattern, fresh-context-for-execution, no-subagents-for-mechanical-edits, narrow-arc-before-broad, every-finding-gets-a-track (and 25+ other feedback entries scanned for relevance)
- qw-oracle Arc 1 artifacts: spec, README, decisions.md, phase-template.md, handoff-prompt.md, review-findings.md (sample), arc-history Phase 6/7/8 entries, post-arc analysis

## Where superpowers structurally collides with arc work

Specific to each skill, in the order the lifecycle hits them:

### brainstorming

Single-session assumption is baked into the flow at line 88: "Once you believe you understand what you're building, present the design." There's no shape for multi-pass brainstorming where the surface is too big to cover in one session. The skill DOES handle decomposition ("if the project describes multiple independent subsystems, decompose first") but only at the *top level* -- it can route a 5-subsystem feature into 5 separate spec-plan-impl tracks. It cannot handle a single complex feature whose understanding requires 4-6 passes (Slipgate Managed Mode shape).

The terminal state is hardcoded at line 66: "The terminal state is invoking writing-plans. Do NOT invoke any other skill." That's correct for session-shaped features and structurally wrong for arc-shaped features that need an arc-classifier between brainstorm and plan.

### writing-plans

Singular file assumption at line 18: "Save plans to: docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md". This is the source of the qw-oracle monolith failure (3596 lines, 18 review findings hidden by length). The "Scope Check" section at line 22-23 detects multi-subsystem specs but tells you to "suggest breaking into separate plans" -- it has no mechanism for a SINGLE feature to be split across multiple phase MDs.

TDD-mandatory shape baked in (lines 38-44, 73-104). Every task template assumes "write failing test -> run to fail -> minimal impl -> run to pass -> commit." That's the right pattern for feature work with clear test boundaries. It's the wrong pattern for schema ports, doc updates, infrastructure setup, refactors with no behavior change. qw-oracle Arc 1 wrote integration tests at phase boundaries, not red-green per task. Forcing TDD-shape on non-TDD work produces ceremonial fake tests.

No notion of cross-cutting decisions. The plan is one document; commitments live inline; an executor reading task 7 has no way to find the decision made in task 2 that constrains task 7.

### executing-plans + subagent-driven-development

Both assume single-session execution (executing-plans line 14 explicitly: "Use when you have a written implementation plan to execute in a separate session" but the "separate session" means separate from brainstorm, not phase-by-phase). Neither has phase boundaries with operator review gates. Neither has cross-phase memory capture.

subagent-driven-development is structurally good for a single-phase implementation: implementer + spec-reviewer + code-quality-reviewer in a tight loop. That model EXTENDS naturally to per-phase execution within an arc. The collision is the surrounding assumption that all tasks live in one plan and execution doesn't cross sessions.

Handles "tasks mostly independent" cleanly (lines 24-26) but arc phases are heavily coupled (Phase N+1 consumes Phase N's outputs). Within a phase tasks can be independent; across phases they're sequential by design.

### verification-before-completion

No collision. This skill is universal -- it works at any scale, any methodology, any session shape. Worth preserving as-is and referencing from the arc skills, not replacing.

## The gold in superpowers (worth borrowing)

These patterns survived contact with reality on Arc 1 and should land in the arc skill set, possibly verbatim:

1. **One-question-at-a-time discipline during brainstorm.** Line 78-81 of brainstorming. Operator memory `feedback_one_question_at_a_time.md` confirms this. Universal good.

2. **Two-or-three approaches with tradeoffs before settling.** Line 82-85 of brainstorming. Forces alternative-thinking. Aligns with operator memory `feedback_be_decisive.md` (give recommendations not polls).

3. **Spec self-review pattern.** Lines 116-124 of brainstorming. Placeholder scan + internal consistency + scope check + ambiguity check. Universal good; arc skills should run this on the spec AND on the arc scaffold.

4. **No-placeholders rule.** Lines 106-115 of writing-plans. "TBD / TODO / fill in details / similar to Task N / handle edge cases" are plan failures. Already practiced in qw-oracle Arc 1 phase MDs; should be a load-bearing rule in arc-planner.

5. **Bite-sized step granularity (2-5 minutes).** Lines 38-44 of writing-plans. Per-step is right for execution. Per-phase plans should still ship at this granularity even though phases are bigger.

6. **Two-stage review pattern (spec compliance then code quality).** Subagent-driven-development lines 50-80. Strong discipline. Arc-orchestrator's per-phase review should run this shape.

7. **Implementer status handling (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED).** Subagent-driven-development lines 102-118. Clean escalation taxonomy. Worth preserving.

8. **Model selection guidance (cheap for mechanical, capable for architecture).** Subagent-driven-development lines 88-100. Useful cost-vs-capability framing.

9. **Verification gate function and red-flags table.** verification-before-completion entire skill. Universal; arc skills reference it.

10. **Critical-review-before-execute.** executing-plans lines 17-21. Before executing, the executor critically reviews the plan. arc-executor should run this at phase boundary too.

## Principles already in operator memory (already distilled, just need to land in the skills)

These are already feedback memories. The arc skills make them load-bearing instead of ambient.

| Memory | Becomes part of |
|---|---|
| scaffold-then-fan-out | arc-planner core flow |
| orchestrator-terminal-pattern | arc-orchestrator core role |
| fresh-context-for-execution | arc-orchestrator handoff discipline |
| no-subagents-for-mechanical-edits | arc-executor decision rule (subagent vs direct) |
| narrow-arc-before-broad | arc-classifier scope discipline |
| every-finding-gets-a-track | arc-orchestrator + arc-reviewer findings handling |
| planning-first | arc-planner gate (no execution before plan approved) |
| be-decisive | every arc skill's communication shape |
| one-question-at-a-time | arc-classifier + arc-planner during operator interaction |
| option-menus-need-context | arc-classifier + arc-planner output discipline |
| no-inference / inference-not-evidence | arc-orchestrator verification posture |
| verify-primary-sources-before-synthesis | arc-orchestrator + arc-reviewer doc-writing rule |
| trust-operator-pace-estimates | arc-orchestrator pacing |

These are not new principles. They're already in the operator's memory as feedback. The arc skill set's job is to make them structurally inescapable, not re-derive them.

Philosophy docs add (already auto-loaded via CLAUDE.md):
- Strategic over tactical (10-20% time on design quality)
- Deep modules with simple interfaces
- Define errors out of existence (Slipgate Managed Mode forced-one-dir is exactly this)
- Pull complexity downward
- Comments explain WHY
- Consistency creates leverage
- Integration tests > unit tests (grug)
- Complexity is the apex predator -- say no (grug)
- Factor slowly, prefer working prototypes (grug)
- Chesterton's fence -- understand before removing (grug)

## Context budget as a first-class arc concern

This wasn't visible to the qw-oracle Arc 1 design but operator observed it during execution: several phases ran their executor terminals into the 400-500k token range, which is past the soft-ceiling where model judgment starts degrading meaningfully. Three points to make this concrete and load-bearing for the arc skills:

### The soft ceiling is a best-before date, not a hard cliff

Models perform best in the 0-200k window. Past 200k, judgment degrades progressively -- not catastrophically, but measurably -- and the degradation accelerates after 350k. Inside 300-350k is uncomfortable but workable; 400-500k is where verification fidelity, which is exactly what arc work depends on at phase boundaries, gets unreliable. The arc skills should:

1. **Plan for staying under 350k where reasonable.** Treat 200k as ideal, 200-350k as acceptable, 350-500k as a smell that something needs to be split or delegated, 500k+ as a failure mode the skill should actively prevent.
2. **Surface context usage at session boundaries.** arc-orchestrator should track approximate context budget across an execution session and recommend hand-off-to-fresh-terminal when the executor is hitting the smell zone, even if the phase isn't done yet.
3. **Not over-correct toward tiny phases.** The fix is not "split into 20 phases of 50k each" -- that loses verification-regime coherence. The fix is "delegate more aggressively to subagents whose context is independent of the executor's main thread."

### The qw-oracle inline-execution defect

Several Arc 1 phases ran ~80-90% inline (executor terminal does the work directly, plus minor sub-agent dispatches for verification). That's the inverse of what subagent-driven-development is built for, and it cost context budget unnecessarily. The reason it happened: the no-subagents-for-mechanical-edits memory was applied too broadly. That memory was correct for docs-system-redesign (full-file content shipped inline; tasks were Edit/Write of pre-determined text). It is wrong for SQL migrations, schema-as-generator runs, loader port code, MCP tool ports -- those tasks benefit from subagent isolation: the subagent reads the relevant code, ports it, tests it, returns a focused result. Executor's main context stays clean for verification and integration.

### The sharpened subagent-vs-inline rule

Replace the broad memory with this:

- **Direct execution when:** the plan ships full content inline AND the change is purely textual (markdown, doc edits, config files with no logic). The task is "Edit/Write the content the plan already contains." Subagents add overhead with no benefit.
- **Subagent execution (default) when:** the task involves code synthesis, multi-file integration, exploratory implementation, schema/migration writing, test authoring, anything where the worker benefits from isolated context to do focused work. The executor's main context stays clean for orchestration and verification.

qw-oracle Arc 1 was 80% the second case, 20% the first. Should have been ~80% subagent-dispatched, was ~10% subagent-dispatched. That's the recovery this revision targets.

### Effort/model selection per dispatched subagent

Two-axis framing -- model size AND effort level -- because Sonnet MAX is genuinely different from Opus medium and not interchangeable. Operator subscription is MAX x20, so compute is not a billing concern; the constraints are quality fit, speed, and the "wrong tool for the job" effect of overshooting model capability.

Operator-set range: floor at Sonnet medium for anything requiring reasoning; Haiku acceptable only for genuinely mechanical text execution; ceiling at Opus MAX. Going below Sonnet medium for code-touching work is rarely a better tool. Opus MAX as default-everywhere is wasted ceiling.

| Task shape | Recommended model + effort |
|---|---|
| Architecture / design / cross-cutting review / post-arc analysis | Opus MAX |
| Multi-file integration, judgment-dense, plan drafting | Sonnet MAX or Opus medium (Sonnet MAX usually preferred for speed; pick Opus medium when knowledge breadth matters more than reasoning depth) |
| Mechanical implementation requiring reasoning (clear spec, 1-2 files, code synthesis) | Sonnet medium |
| Plan verification (read code, compare, report against decisions/findings) | Sonnet medium, Explore-shape sub-agent |
| Pure text shuffling (deletions, renames, doc edits with full content shipped inline) | Haiku, or skip subagent entirely and direct-edit |

The "MAX effort" axis matters even when model size is fixed. Sonnet MAX outperforms Sonnet medium substantially on reasoning-depth tasks; it often outperforms Opus medium on tightly-scoped reasoning where the bottleneck is care rather than knowledge breadth. The match-scheduler pattern (orchestrator recommends model+effort per phase) is the right discipline; the dynamic version delegates that decision to the executor controller per dispatch.

The honest test for picking model size: would a Stack Overflow answer suffice for this task? If yes, Haiku. If the task requires synthesizing from 4+ files or making a non-obvious judgment, Sonnet medium minimum. If the task is architectural or post-arc analytical, Opus MAX.

### Phase splitting should consider context budget, not just verification regime

The slicing-by-verification-regime rule is correct for what each phase IS. Context budget adds an orthogonal constraint for how each phase EXECUTES. A phase whose verification regime is coherent might still be too big to execute in one terminal at acceptable context budget. Three responses to that:

1. **Split the phase if its sub-deliverables can ship as separate commits.** This is the existing phase-template.md rule; nothing changes.
2. **Delegate more aggressively to subagents.** Most cases land here. Same phase boundary, same verification regime, but ~70% of the work happens in subagents whose context isn't shared with the executor.
3. **Hand off mid-phase to a fresh executor terminal.** Last-resort; risks losing in-flight context. Use only when (1) and (2) aren't sufficient.

arc-planner's slicing analysis should ask BOTH questions: "is each phase's verification regime self-contained?" AND "is each phase's expected execution context budget under 350k?" If either fails, push back on the slicing.

## Arc-specific shapes that qw-oracle Arc 1 demonstrated

These are NOT in superpowers and NOT individually in operator memory -- they are emergent from the arc execution and need to be captured as arc-skill content:

### Arc scaffolding (six artifacts before any phase MD)

1. **`decisions.md`** -- locked cross-cutting choices (D1-D18 in qw-oracle). Each decision: title, what's chosen, why, implications. Phases must respect; deviations require explicit amendment.
2. **`review-findings.md`** -- evidence ledger of issues found in any prior plan attempt (legacy monolith review). Tagged by which decision resolves each. Phase ownership table at the bottom maps findings to phases.
3. **`prerequisites.md`** -- operator-side Task 0 (env, secrets, infra, third-party access) before any phase fires.
4. **`phase-template.md`** -- mandatory shape every phase MD follows (Goal / Inputs / Files touched / Tasks / Verification / Outputs / Open questions / Recovery + sub-agent verification brief).
5. **`handoff-prompt.md`** -- literal first-message text for fresh phase-drafting terminals. Self-contained briefing.
6. **`README.md`** -- phase index with status column.

This is the "rails" the operator's memory entry talks about. Building these BEFORE any phase MD prevents per-phase drift in different directions.

### Phase shape (what every phase MD must contain)

From phase-template.md:
- Goal (one paragraph; ends with runnable-state-at-boundary statement)
- Inputs from previous phase
- Files touched (Created / Modified / Deleted -- every deletion explained)
- Tasks (numbered, each with Goal/Files/Steps/Verification)
- Verification at phase boundary (YES/NO probes, not interpretive prose)
- Outputs to next phase (mirror of next phase's Inputs)
- Open questions / deferred items (with default-chosen + who-can-resolve)
- Recovery (per-failure-mode, anticipatable failures only)

Length is NOT capped. Phase 2 (31 tables + 17 adapters) and Phase 6 (MCP rewrite) ran ~1000+ lines and that was correct. Splitting forces shared-context duplication. The rule is "split if the phase has two natural sub-deliverables that ship as separate commits; don't split otherwise."

### Verification regimes

The single most-important arc-planning insight from the recent conversation:

> Each phase must have a complete verification regime. If the regime requires the next phase to exist, slice vertically. If the regime is self-contained, slice however the work is naturally shaped.

This is domain-agnostic. It produces vertical slicing for behavior-deliverable work and horizontal slicing for contract-completable work without forcing either. arc-planner's slicing analysis is the operationalization of this rule.

The anti-pattern to name: phases whose verification depends on later phases existing. That's the failure mode that makes "phase 1-3 ship, phase 4 reveals a phase-1 design flaw" possible.

### Slicing techniques (literature reference)

A focused 2026-05-03 research pass found that the slicing question is well-explored in software-engineering canon, with a small but convergent recent literature on LLM-collaboration specifics. arc-planner should reference these named techniques rather than invent its own framework.

#### The named techniques

- **Walking skeleton (Cockburn)** -- a tiny implementation that performs a small end-to-end function, linking together the main architectural components but not necessarily using the final architecture. Prescribes building the thinnest possible "spine" so subsequent fleshing-out can happen in parallel. Apply when a project is greenfield and the architecture itself is one of the unknowns.

- **Tracer bullet (Hunt & Thomas, *The Pragmatic Programmer*)** -- a lean but complete end-to-end slice, written in production code rather than throwaway prototype, fired through the highest-risk part of the system to expose where the real shots will land. Apply when requirements are vague, technologies unfamiliar, or risk concentrated in one axis you want to probe first.

- **Vertical slice architecture (Bogard)** -- organize code (and therefore phases) around features rather than technical layers; "minimize coupling between slices, maximize coupling in a slice." Apply when delivering value per slice matters more than enforcing layer purity.

- **Strangler fig (Fowler)** -- incrementally route functionality from a legacy system into a new one along identified seams, leaving both running until the legacy is gone. Apply only when wrapping or replacing existing software, not for greenfield arcs.

- **Hello, Production (Hodgson, 2019)** -- a modern operational refinement of walking skeleton: deploy a no-op endpoint to real production on day one, before any feature work, to surface deploy/release/observability friction up front. Apply whenever the deploy path is itself a risk.

Walking skeleton and tracer bullet are near-synonyms in practice; arc-planner can treat them as one decision (architecture-first vs risk-first emphasis). Hexagonal/ports-and-adapters and London-vs-Chicago TDD describe code structure, not phase slicing -- not relevant for arc-planner.

#### Decision tree: which technique when

- New system, architecture unknown -> walking skeleton.
- Highest unknown is "will the deploy/release path actually work" -> Hello, Production.
- Highest unknown is a single technical risk (vendor API, perf budget, novel integration) -> tracer bullet aimed at that risk.
- Replacing or wrapping legacy -> strangler fig.
- Per-feature delivery cadence matters more than layer purity -> vertical slice architecture.
- Infrastructure with no end-user surface yet (schema port, embedding pipeline) -> horizontal phases are fine *as a foundation*, but only if the end-to-end vertical comes next.

#### Mixed slicing within an arc

Mixed slicing -- horizontal foundation phases followed by vertical end-to-end deliverables -- is implicit in the canon rather than explicitly named. Cockburn's skeleton "links the main architectural components" before fleshing out, which presumes some scaffolding exists. Hodgson's Hello, Production explicitly puts an infrastructure-only deploy first, then features after. Pragmatic-Programmer-style tracer code typically follows a brief scaffolding step.

What is *not* established as a pattern is alternating horizontal/vertical mid-arc. The literature treats horizontal foundation as a one-shot precondition: lay it once, then go vertical and stay vertical. The operator-derived hypothesis ("horizontal first if at all, then vertical, alternation is a smell") is consistent with how every named source orders its examples, even though none names the pattern explicitly. qw-oracle Arc 1 was an unwitting instance: Phases 1-5 were horizontal infrastructure, Phases 6-8 were vertical end-to-end deliverables.

#### LLM-assisted implementation specifics

There is a small but real 2024-2026 literature explicitly arguing for vertical slicing in AI-assisted work:

- **Matt Pocock, "Tracer Bullets: Keeping AI Slop Under Control"** ([aihero.dev](https://www.aihero.dev/tracer-bullets)) -- LLM agents have a "tendency toward comprehensive solutions" -- they build entire layers in isolation without testing the critical path -- and "context window constraints make the discipline non-negotiable."

- **CodeSignal's "Atomic Task Design" lesson for Claude Code** ([codesignal.com](https://codesignal.com/learn/courses/task-decomposition-execution-with-claude-code/lessons/atomic-task-design)) -- "Favor vertical slices over horizontal layers... no working feature until T004" is the failure mode it warns against.

- **Addy Osmani's AI coding workflow** ([addyosmani.com/blog/ai-coding-workflow](https://addyosmani.com/blog/ai-coding-workflow/)) -- frames the same point as "iterative chunks": "implement one function, fix one bug, add one feature at a time" because monolithic outputs cause the model to "produce inconsistent, duplicated code."

Convergent claim: LLMs default to horizontal because layer-at-a-time is the most pattern-completion-friendly framing of a task; pushing toward vertical surfaces integration problems while the context window still contains the design intent. This corroborates the operator-derived "horizontal first then vertical" hypothesis from a different angle -- horizontal is the LLM default, and overriding it requires explicit slicing discipline in arc-planner.

### Sub-agent verification of plans (NOT execution)

D16 in decisions.md: sub-agents verify plan drafts against live source files. Sub-agents do NOT write SQL, code, or migration content. The drafter writes; sub-agents verify; operator approves.

This is the inverse of subagent-driven-development's pattern (where subagents implement and the controller reviews). For ARC PLANNING, the controller drafts and sub-agents verify. The asymmetry exists because plan-drafting is a single-author judgment task; plan-verification is a structured comparison task that sub-agents are good at.

Per-phase sub-agent verification brief is in phase-template.md lines 113-151. It's reusable across arcs with light adaptation.

### Fresh-terminal handoff between sessions

Three handoff points in the qw-oracle Arc 1 experience:
- Brainstorm session -> arc-planning session (CLAUDE didn't ship a doc, it was implicit; should be explicit in the arc skills)
- Phase-drafting session -> next-phase-drafting session (handoff-prompt.md served this)
- Final-phase-shipped -> post-arc-review session (post-arc-handoff.md served this)

The handoff-prompt shape is consistent across all three:
- "Where things are" (state-of-the-world: branch, last commit, what shipped)
- "Reads required" (numbered list with brief rationale per file)
- "Critical rules" (operator preferences + arc-specific decisions to respect)
- "First three actions" (concrete next steps the receiver can act on)
- "When in doubt" (escalation guidance)

This shape is regular enough to template. arc-orchestrator owns the handoff template and the discipline of writing one at every session boundary.

### Mid-arc decision amendments

D8 amendment in qw-oracle Arc 1 -- the Phase 5 executor found that Voyage's input_type asymmetry made the D8 verifier fail at 0.6846. The amendment was captured inline in decisions.md with date and reasoning. The fix landed in code with strong "do not revert" commentary.

Pattern: when execution-time learning contradicts a prior decision, amend the decision, document the amendment, ensure the fix is durable enough to survive future iteration. arc-orchestrator owns this.

### Post-arc review by fresh terminal

The post-arc analysis pattern -- spec-vs-shipped walkthrough by a fresh terminal that didn't anchor on what executed. Verdict shape: DELIVERED / DELIVERED-DIFFERENT / DEFERRED / MISSING. Plus shipped-beyond-spec. Plus YELLOW status. Plus Arc N+1 prep recommendations.

This is arc-reviewer's deliverable. The fresh-terminal requirement is structural -- a terminal that executed Phase N has an anchored read on Phase N's deliverable.

## Gaps the arc skill set must close

What's NOT in superpowers, NOT in operator memory, and NOT obvious from the arc artifacts -- but is necessary:

1. **Arc classification.** No existing skill or memory entry helps decide "is this arc-shaped or session-shaped?" The decision is currently operator instinct. arc-classifier needs to formalize this with criteria (multi-session expected, multi-phase expected, multi-terminal-execution expected, spec-required, will need executor handoffs).

2. **Vertical-vs-horizontal slicing analysis.** The verification-regime rule is the right abstraction but it's not written down anywhere. arc-planner needs to walk through it explicitly and surface the slicing recommendation for operator review.

3. **Context-budget analysis paired with slicing.** New as of this revision. arc-planner needs to estimate per-phase execution context budget (how much will an executor's main thread consume to ship this phase) and either split, delegate-to-subagents, or accept-with-handoff-mid-phase. The smell zone starts at 350k; the failure zone starts at 500k.

4. **Subagent-vs-inline decision per task.** Each task in a phase MD should specify whether it executes inline or via subagent dispatch (and at what model/effort). qw-oracle Arc 1 didn't do this; arc-planner should. This is the structural fix for the inline-execution defect.

5. **Brainstorm-arc shape.** Multi-pass brainstorming (Slipgate Managed Mode shape) needs its own discipline -- name the passes upfront, capture carry-forwards between passes, exit criterion is "remaining unknowns are implementation-shaped not shape-shaped." Could live in arc-classifier or a separate arc-brainstormer.

6. **Phase-boundary review ritual.** When operator approves a phase, what gets verified, what gets recorded, what triggers the next phase. Implicit in qw-oracle Arc 1; should be explicit in arc-orchestrator.

7. **Cross-phase memory.** The orchestrator carries context between phases (D8 amendment is the canonical example). arc-orchestrator needs an explicit mechanism: amendments to decisions.md, mid-arc additions to review-findings.md, executor-prompt augmentation per phase based on prior-phase learnings.

8. **Methodology synthesis.** The qw-oracle arc demonstrated a hybrid -- spec-anchored, phase-atomic, integration-tested at boundaries, sub-agent-verified plans, fresh-terminal-executed. This isn't pure SDD, TDD, or BMAD. It needs a name and an explicit principle list so the arc skills reference it consistently.

## Tentative skill shapes

Sketches only -- this is what the design conversation should refine. Sizes revised upward from the first draft to reflect the context-budget and subagent-delegation content that was missing.

**arc-classifier (~100-150 lines).** Triggered after a brainstorm session reaches "I have enough understanding to plan this." Walks through classification criteria. Outputs: "session-shaped, route to superpowers writing-plans" OR "arc-shaped, route to arc-planner" OR "needs more brainstorm passes, here's what to focus on next." The "needs more passes" output is the multi-pass-brainstorm signal.

**arc-planner (~400-600 lines, longer than most skills).** Triggered when arc-classifier routes here. Internal phases:
1. Build the scaffold (six artifacts: decisions, review-findings, prerequisites, phase-template, handoff-prompt, README).
2. Slicing analysis: verification-regime per phase + context-budget per phase. Surface slicing recommendation for operator review.
3. Per-task execution-mode annotation: each task in a phase MD declares "subagent (model X) | inline" with rationale. Defaults to subagent for non-trivial tasks.
4. Draft per-phase MDs in fresh terminals with sub-agent verification.
5. Operator review at every phase boundary.

The slicing analysis AND the per-task execution-mode annotation are the most prescriptive sections. References phase-template.md and handoff-prompt.md from the qw-oracle arc as exemplars but tightens both -- adds execution-mode column to the task table, adds context-budget estimation step.

**arc-orchestrator (~300-500 lines).** Triggered at the start of arc execution. Roles:
- Drive executor terminals (per-phase, with operator handoff).
- Per-task subagent dispatch with effort/model selection per task shape.
- Verify outputs at phase boundaries (don't trust prior session's "verified" claims; re-verify against live source).
- Capture cross-phase memory: decisions.md amendments, mid-arc additions to review-findings.md, executor-prompt augmentation per phase based on prior-phase learnings.
- Track approximate context budget across the executor session; recommend hand-off-to-fresh-terminal when budget enters smell zone (~350k).
- Write handoff docs at session boundaries using the consistent shape (Where things are / Reads required / Critical rules / First three actions / When in doubt).

Owns the fresh-terminal handoff discipline AND the context-budget discipline AND the subagent-dispatch discipline. This is the largest skill because it has the most operational responsibilities.

**arc-reviewer (~200-250 lines).** Triggered at post-arc moment, AS A FRESH TERMINAL. Reads spec + decisions + arc-history + executor prompts cold. Walks each spec section: DELIVERED / DELIVERED-DIFFERENT / DEFERRED / MISSING. Surfaces shipped-beyond-spec. Reports YELLOW status. Outputs the arc-N+1 prep recommendations.

Plus references to existing skills:
- superpowers:brainstorming for the initial brainstorm (or first pass of an arc-brainstorm)
- superpowers:verification-before-completion for in-phase verification
- superpowers:subagent-driven-development for the per-task dispatch pattern (the arc skills wrap this for arc-shaped work but don't replace its task-level mechanics)
- superpowers:test-driven-development for in-phase work where TDD fits

The arc skills are not replacements for the universal-shape skills. They're the layer above that handles the multi-session multi-phase coordination AND the context-budget discipline AND the per-task subagent-vs-inline decision.

## Open questions for the design conversation

1. **Where does arc-brainstorming live?** Inside arc-classifier (multi-pass routing decision)? Or as its own arc-brainstormer skill? The Slipgate Managed Mode shape suggests it might be its own skill; the simpler view says "first brainstorm session via superpowers, then arc-classifier decides if more passes are needed." I lean toward the second framing -- avoids two brainstorm skills.

2. **How prescriptive should arc-planner be about TDD vs integration tests vs neither?** qw-oracle Arc 1 mostly wrote integration tests at phase boundaries; some phases (Phase 4 chunker) had real unit tests; some phases (Phase 8 deploy) had no automated tests, only operator-run smoke probes. The skill probably says "match the test style to the phase shape" rather than mandating one. But that's looser than superpowers' baked-in TDD.

3. **Should arc-orchestrator merge or stay separate from arc-executor?** In qw-oracle, the orchestrator role and the executor role were separate sessions. But for smaller arcs (4-5 phases) the same terminal could plausibly do both. Probably arc-orchestrator is the umbrella role and "executor terminals" are subordinate concept; one skill, two terminal roles within it.

4. **How are mid-arc decision amendments captured?** Inline in decisions.md (qw-oracle pattern, low ceremony) or as separate amendment files (more durable but more bookkeeping)? Probably inline with explicit amendment markers and dates.

5. **What's the relationship between arc-planner's six-artifact scaffold and a cleaner repo structure?** Should arc plans live in `docs/superpowers/plans/` (current convention, suggesting arc-plans are a kind of plan) or somewhere new like `docs/arcs/`? Probably stay where they are; the arc plans ARE plans, just multi-file ones.

6. **Skill priority ordering.** REVISED: the context-budget and subagent-dispatch insights elevate arc-orchestrator -- it's no longer "wait for more data," it's "this is where the qw-oracle execution defect lives, and Slipgate Managed Mode will hit the same defect at larger scale if we don't address it." Recommended order:
   - arc-classifier + arc-planner first (urgent, blocks Slipgate planning).
   - arc-orchestrator paired with arc-planner (the per-task execution-mode annotation in arc-planner has no value unless arc-orchestrator knows how to consume it; build them as a pair).
   - arc-reviewer after the next arc executes (lower urgency; the post-arc role we just exercised was good enough informally and doesn't have an execution defect to correct).

7. **What about the existing handoff-prompt.md / phase-template.md / decisions.md from qw-oracle?** They're concrete exemplars. The arc-planner skill should reference them but not LOCK to their exact shape -- they're qw-oracle-shaped, not generic. The skill defines a generic shape with the qw-oracle artifacts as a worked example. Slipgate Managed Mode's scaffold will look different in detail (different decisions, different findings, different phase shape) but should follow the same structural pattern.

## Next step

Operator-driven design conversation that uses this doc as input. Possible discussion shape:

1. Pushback on the principle list -- which ones are wrong, which are missing.
2. Shape decisions on the four skills -- per the "Tentative skill shapes" sketches.
3. Resolve the open questions above.
4. Decide priority + sequencing.
5. Then start drafting arc-classifier + arc-planner as the urgent pair.

This doc is reading material, not a plan. The plan comes after the design conversation.
