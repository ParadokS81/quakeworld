You are the wave-1 drafter for the operator's custom arc skill set, taking over after a design conversation closed at 2026-05-03 on commit 7493dcd. The previous session designed five skills plus one reference doc, and your scope is to draft wave 1: **arc-classifier**, **arc-brainstormer**, and **arc-planner**, plus the **`arc-phase-archetypes.md`** reference doc. Wave 2 (arc-orchestrator + arc-executor + arc-reviewer) is deferred until after Slipgate Managed Mode planning consumes wave 1.

Stay in `/home/paradoks/projects/quakeworld` on branch `main`. NO worktree. The operator does not touch git -- you run all git operations silently.

## Why this exists (one paragraph for context)

Operator just shipped qw-oracle Arc 1 (8 phases, 3 weeks). Mid-arc and post-arc, the limits of superpowers' brainstorming/writing-plans/executing-plans/subagent-driven-development became clear: they assume a plan fits in a session and a session fits in a context window. Arc-shaped work (multi-session, multi-phase, multi-terminal-execution) overflows both. The qw-oracle arc compensated informally with a six-artifact scaffold (decisions / review-findings / prerequisites / phase-template / handoff-prompt / README), per-phase MDs verified by sub-agents, fresh-terminal handoffs between sessions, and a post-arc fresh-terminal review. That worked but was operator-instinct-driven; the arc skill set codifies the discipline so it survives across operators and arcs.

## What shipped from the design conversation

Single commit captures the arc-1 cleanup that preceded the design work: `7493dcd qw-oracle: Arc 1 post-arc cleanup`. The findings doc that captures all design content from the conversation is uncommitted as of handoff time -- you'll commit it as part of your first-action verification.

## Required reads (in order; do not skip)

1. **`docs/superpowers/parking/2026-05-03-arc-skill-set-findings.md`** -- the design source. Read this first, end-to-end. It contains:
   - Source-material survey (superpowers skills + philosophy + memory + qw-oracle artifacts)
   - Gold worth borrowing from superpowers
   - Operator-memory principles already distilled (mapped to which skill consumes them)
   - Arc-specific shapes from qw-oracle Arc 1 (scaffolding, phase shape, verification regimes)
   - Slicing techniques (literature reference, decision tree, mixed-slicing pattern, LLM-collaboration specifics)
   - Context budget as first-class concern (soft ceiling at 350k, smell zone, subagent delegation)
   - Effort/model selection table (two-axis: Sonnet medium floor / Haiku for pure text / Opus MAX ceiling)
   - Tentative skill shapes with sizes
   - Six open questions answered during the design conversation (see "What was decided" below)

2. **qw-oracle Arc 1 exemplars** (concrete examples of the patterns the skills codify):
   - `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/README.md` -- arc index shape
   - `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md` -- decisions doc shape (D1-D18)
   - `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/review-findings.md` -- findings ledger shape
   - `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-template.md` -- phase MD shape
   - `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/handoff-prompt.md` -- fresh-terminal-handoff shape
   - `docs/superpowers/reviews/2026-05-03-qw-oracle-arc1-post-arc-analysis.md` -- post-arc review shape (relevant for wave 2 but read for completeness)

3. **superpowers source skills** (the gold-and-gaps reference):
   - `/home/paradoks/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/skills/brainstorming/SKILL.md`
   - `/home/paradoks/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/skills/writing-plans/SKILL.md`
   - `/home/paradoks/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/skills/subagent-driven-development/SKILL.md`
   - These are the skills the arc skills sit alongside (NOT replace). DO NOT modify them -- the plugin gets overwritten on update. Build sidecar local skills instead.

4. **Operator memory entries** mapped in the findings doc, particularly:
   - `feedback_scaffold_then_fanout_for_multi_phase_plans.md` (the canonical six-artifact scaffold rationale)
   - `feedback_orchestrator_terminal_pattern.md` (the role separation)
   - `feedback_fresh_context_for_execution.md` (when to hand off vs continue)
   - `feedback_no_subagents_for_mechanical_edits.md` (sharpened during design conversation -- see findings doc)
   - `feedback_one_question_at_a_time.md` and `feedback_be_decisive.md` (operator interaction shape)

## What was decided (locked during design conversation, all in findings doc)

You don't need to re-litigate any of this. If you find yourself disagreeing during drafting, surface to operator -- don't override silently.

**Skill shape:**
- Five skills total: arc-classifier, arc-brainstormer, arc-planner, arc-orchestrator, arc-executor, arc-reviewer (six -- last one not in wave 1).
- Plus `arc-phase-archetypes.md` reference doc, lives independently.
- Two skills (arc-orchestrator + arc-executor), not one with two modes -- authority split is structural.

**arc-classifier specifics (locked):**
- Loaded by default alongside superpowers:brainstorming (watcher mode).
- Three trigger surfaces: watcher / direct / sidequest.
- Watcher mode intercepts when conversation reveals arc-shape mid-brainstorm; produces handoff prompt to arc-brainstormer in fresh terminal.
- Direct mode: operator says "this is an arc"; skips brainstorm.
- Sidequest mode: operator says "park this as a future arc" mid-execution. Quick capture (3-5 min); not deep exploration.
- All three produce a parking doc at `docs/superpowers/parking/YYYY-MM-DD-<slug>.md` and optionally append HANDOVER entry.
- Sized at ~100-150 lines.

**arc-brainstormer specifics (locked):**
- Multi-pass discipline. Names passes upfront. Captures carry-forwards between passes.
- Exit criterion: "remaining unknowns are implementation-shaped not shape-shaped."
- Consumes handoff from arc-classifier watcher mode OR direct invocation when operator knows it's an arc.
- Lives sidecar to superpowers:brainstorming -- doesn't override it. Operator invokes arc-brainstormer in fresh terminal when ready for multi-pass work.
- Produces design-doc output that arc-planner can consume (same shape as the qw-oracle spec at `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`).
- Sized at ~150-200 lines (estimate; you may adjust).

**arc-planner specifics (locked):**
- Five-step internal flow: build scaffold (six artifacts) -> slicing analysis -> per-task execution-mode annotation -> draft per-phase MDs in fresh terminals with sub-agent verification -> operator review at every phase boundary.
- Slicing analysis names canonical techniques (walking skeleton / tracer bullet / Hello Production / strangler fig / vertical slice architecture). Decision tree from findings doc.
- Per-task execution-mode column: each task in a phase MD declares "subagent (model X effort Y) | inline" with rationale. Subagent default for non-trivial tasks; direct only for purely textual edits.
- Verification regime per phase plus context-budget per phase: arc-planner pushes back on slicings where any phase's verification depends on a later phase, OR where phase context budget exceeds ~350k.
- Two pushback rules: verification regime collision; pure-horizontal default for arcs with end-user-visible deliverables.
- References `arc-phase-archetypes.md` for verification-approach-per-phase-shape table.
- Sized at ~400-600 lines (largest of wave 1).

**arc-phase-archetypes.md reference doc (locked):**
- Table of phase archetypes (schema port / loader port / retrieval / refactor / doc / deploy / infrastructure) with verification approach + floor (automated where target is internal-and-fakeable; operator-run where target is production integration or doc state).
- Lives independent of any single skill.
- Sized at ~80-150 lines.

**Cross-cutting principles (apply to every skill body):**
- ASCII only. No emoji. ASCII hyphen-minus, not em-dash.
- Comments explain WHY not WHAT.
- Skill descriptions trigger on WHEN to use, not WHAT they do.
- Be decisive (give recommendations, not polls).
- One question at a time during operator interaction.
- Trust operator pace estimates.
- Plain English first; technical chain second.
- Effort/model selection: Sonnet medium floor for reasoning work; Haiku for pure text; Opus MAX ceiling. MAX-effort axis preserved separately.
- Context budget: 350k is smell zone; 500k is failure zone; subagent delegation is the lever to stay below.

## Skill location and conventions

Skills lived in two places in this harness:

- **Plugin skills** at `/home/paradoks/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/skills/<name>/SKILL.md` -- these get OVERWRITTEN on plugin update. Do NOT put arc skills here.
- **User-global skills** at `/home/paradoks/.claude/skills/<name>/SKILL.md` -- persistent. THIS is where arc skills live.

Verify the user-global directory exists and check whether the operator has pre-created an arc subdirectory. Skill structure follows superpowers' shape:

```
~/.claude/skills/arc-classifier/SKILL.md
~/.claude/skills/arc-brainstormer/SKILL.md
~/.claude/skills/arc-planner/SKILL.md
```

Reference docs live alongside the most-related skill:

```
~/.claude/skills/arc-planner/references/arc-phase-archetypes.md
```

OR in a shared location if multiple skills reference them:

```
~/.claude/skills/arc-shared/arc-phase-archetypes.md
```

Decide based on convention you find in the existing user-global skills directory.

**SKILL.md frontmatter convention** (matches superpowers):

```markdown
---
name: arc-classifier
description: <one-line trigger description -- when to use, not what it does>
---

# <skill body>
```

The `description` field is what the harness matches against to decide when to load the skill. Trigger language matters -- look at superpowers' descriptions for the pattern.

## Critical rules

- **Do NOT modify superpowers plugin skills.** Sidecar only. The plugin overwrites on update; any modification is wasted work.
- **The arc skills DO NOT replace superpowers' universal skills.** verification-before-completion stays universal. brainstorming stays as the front door for non-arc work. test-driven-development stays for in-phase work where TDD fits. The arc skills are the layer above for multi-session multi-phase coordination.
- **Sizes are estimates, not constraints.** If a skill genuinely needs to be longer to do its job, make it longer. Don't cut content to fit a number. The findings doc's size estimates assume the skills delegate appropriately to reference docs (arc-phase-archetypes.md takes content out of arc-planner; the qw-oracle exemplars take content out of arc-orchestrator).
- **Skill descriptions are load-bearing.** A skill that doesn't trigger reliably is dead weight. Test the description against the use cases:
  - arc-classifier should trigger when: operator starts brainstorm, operator says "is this arc-shaped," operator says "park this as a future arc."
  - arc-brainstormer should trigger when: operator says "let's brainstorm this arc," arc-classifier produces a watcher-mode handoff.
  - arc-planner should trigger when: arc-brainstormer produces a spec ready to plan, OR operator says "plan this arc."
- **Don't gold-plate the first draft.** Ship something the operator can use on Slipgate Managed Mode planning. Refinement happens after that arc consumes wave 1; lessons learned inform wave 2.
- **All git operations silent.** Operator does not touch git. Commit at meaningful checkpoints; push at session-wrap.

## First three actions

### 1. Verify skill directory layout (5 min)

Check whether `~/.claude/skills/` exists and what's already in it. Are there other user-global skills you should match conventions with? Is there a shared subdirectory (`arc-shared/` or similar) for cross-skill reference docs, or do reference docs live with their primary consumer?

```bash
ls -la /home/paradoks/.claude/skills/ 2>/dev/null
ls -la /home/paradoks/.claude/skills/*/SKILL.md 2>/dev/null
```

If the directory or convention is unclear, surface to operator -- don't guess.

### 2. Commit the findings doc + this handoff prompt (2 min)

The findings doc at `docs/superpowers/parking/2026-05-03-arc-skill-set-findings.md` is uncommitted as of handoff time. Commit it alongside this handoff prompt before drafting any skills. One commit, message something like: `docs(arc-workflow): wave 1 design + handoff prompt`. Push after commit.

### 3. Start drafting arc-classifier (~30-60 min)

Smallest of wave 1. Three trigger surfaces, locked behavior, ~100-150 lines. Read the findings doc's "arc-classifier specifics" section AND the existing superpowers:brainstorming SKILL.md for trigger-description patterns. Draft, save to `~/.claude/skills/arc-classifier/SKILL.md`, surface to operator for review before drafting arc-brainstormer.

## Operator preferences (apply ALWAYS)

- Verify before asserting. Every claim independently checked. Do NOT take prior session's "verified" claims on faith.
- Plain English first, technical chain second.
- Be decisive (give recommendations, not polls).
- One question at a time during operator interaction.
- Translate option menus into plain consequences.
- ASCII discipline (no em-dash, no emoji, no marketing voice).
- Trust operator pace estimates.
- Comments explain WHY not WHAT.
- Operator's Max subscription is 20x; compute is not the bottleneck. Surface costs only when meaningfully large.
- The operator likes long deep architectural conversations when they're worth it (the design conversation that preceded this handoff ran multi-hour and produced this handoff doc plus the findings doc). Don't truncate substantive thinking; do truncate filler.

## What's NOT in scope for this session

- Wave 2 skills (arc-orchestrator, arc-executor, arc-reviewer). Build wave 1 only. Wave 2 gets drafted after Slipgate Managed Mode planning consumes wave 1.
- Modification of superpowers plugin skills.
- Re-litigating any decisions in the findings doc. If you disagree, surface to operator before drafting; don't silently override.
- Slipgate Managed Mode planning itself (that's the consumer of wave 1; not in this session's scope).

## When in doubt

Ask the operator. One question at a time. Concise. They prefer plain-English consequences over option menus. They value being told when the work is genuinely small ("arc-classifier is short, here's the draft") over a padded performative process.

This is the wave-1 drafter terminal. Ship the three skills + the reference doc, then this role hands off. Wave 2 is a separate session, kicked off after Slipgate Managed Mode planning has had a chance to use wave 1 in anger.
