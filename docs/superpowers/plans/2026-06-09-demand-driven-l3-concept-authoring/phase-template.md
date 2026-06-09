# Phase MD template -- mandatory shape

Every phase MD for this arc follows this shape. The template enforces structure, not length -- a phase that genuinely belongs together can be long. A drafter terminal fills this in for its phase, dispatches a sub-agent to verify against live source, applies findings, and halts for operator review.

Sections, in order:

---

## Goal

One paragraph. What this phase delivers and why. **End with the runnable-state-at-boundary statement:** the concrete, observable state that is true when this phase is done (e.g., "the per-domain runner scores weapon-scripts NAILED + zero-confab, and `domain-concept-curate` produces a structurally-valid note for one dry-run domain").

## Inputs from previous phase

What must exist before this phase starts (mirrors the prior phase's Outputs). For Phase 0, this is the prerequisites (`prerequisites.md`).

## Files touched

- **Created:** new files this phase adds.
- **Modified:** existing files this phase edits (with the why).
- **Deleted:** files this phase removes.

For note-authoring phases, "Created" lists the `curated/concept-notes/<slug>.md` files; "Modified" includes the loader run + any methodology-doc updates.

## Tasks

Numbered. Each task carries:

- **Goal** -- one line.
- **Files** -- what it touches.
- **Steps** -- the concrete actions.
- **Verification** -- the YES/NO probe(s) that confirm this task landed (not interpretive prose).
- **Execution mode** -- exactly one of:
  - `subagent (Sonnet MAX | Sonnet medium | Opus MAX | Opus medium | Haiku)` + one-line rationale, or
  - `inline` + one-line rationale (typically: "textual edits, full content shipped inline, no logic").

  Default per D14: note-drafting = `subagent (Sonnet MAX)`; Phase-0 code synthesis (runner/skill) = `subagent (Sonnet MAX | Opus medium)`; architectural/cross-cutting = `subagent (Opus MAX)`; the guardrail prompt-rule edit = `inline`.

## Verification at phase boundary

YES/NO probes that confirm the whole phase landed correctly. For this arc the recurring probes are:

- **Loads clean:** `bun run load-concepts` reports the new note(s) loaded, 0 errors, warnings accounted for.
- **Gate passes:** the per-domain runner moves the domain's representative threads dig/PARTIAL -> platter/NAILED.
- **Zero confab:** the confab-check finds no claimed entity absent from L1.
- **Cites ground truth:** spot-check that every cited cvar/command/line exists (sample N).
- **Structure contract:** the note carries typed `related_entities`, per-method support annotation, audience-tagged sections, asset refs (per the cross-arc contract).

Operator prose review is the second, non-automatable gate (D4) -- name it explicitly in the phase boundary, even though the operator runs it.

## Outputs to next phase

What this phase hands forward (mirrors the next phase's Inputs).

## Open questions / deferred items

Each with a default-chosen + who-can-resolve. If a sub-agent finding contradicts `decisions.md`, decisions win -- record the rejected finding here with a one-line rationale.

## Recovery

Per anticipatable failure mode only (not speculative). For this arc:

- **Gate fails (still PARTIAL):** the note is missing a fact the threads demand -- diff the grounding the runner assembled against the note; the gap is usually an un-anchored entity. Re-author, do not lower the bar.
- **Confab detected:** the named entity is not in L1 -- either it is mis-named (fix against source) or genuinely absent (remove the claim). Never ship the confab.
- **Load error:** check Bun (not npm), `tx.json` for any new JSONB write, and that the slug is present in frontmatter (the loader skips slug-less files).

---

## Sub-agent verification brief (drafter dispatches this after drafting)

> Read the phase MD at `<path>` against the live source. Do NOT modify files; report findings only.
>
> Check:
> 1. **File paths exist** -- every path named under "Files touched" and in task Steps resolves (or is a to-be-created path explicitly marked Created).
> 2. **Entity/column claims** -- any cited cvar/command/table/column exists in L1 / the schema (sample + report misses).
> 3. **Decisions alignment** -- the phase respects `decisions.md` (esp. D9 fork-not-extend, D10 80/20 gate, D11 Workflow-not-SDK, D13 Bun/JSONB, D14 model/effort). Flag any drift.
> 4. **Contract alignment** -- note-authoring tasks honor `contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md` (name-by-domain, audience sections, per-method support, 3-part refs for cross-links per F5).
> 5. **Execution-mode sanity** -- each task's mode + model/effort fits its shape; flag any >70%-inline phase that is actually code/synthesis work.
> 6. **Verification regime** -- each task has a real YES/NO probe; the phase boundary does not depend on a later phase existing.
>
> Return: a findings list (severity + location + suggested fix). If a finding contradicts `decisions.md`, say so -- the drafter will reject it with a rationale, decisions win.
