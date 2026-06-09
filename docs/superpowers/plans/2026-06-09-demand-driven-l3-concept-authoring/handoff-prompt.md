# Generic phase-drafter handoff prompt (shape reference)

This is the SHAPE every `phase-<N>-drafter-prompt.md` follows. The operator does NOT use this file directly -- the pre-substituted `phase-<N>-drafter-prompt.md` files are what a fresh terminal consumes via `@<path>`. Kept here so the shared rules live in one place and the per-phase prompts can stay focused.

Each per-phase prompt is **file-as-prompt**: the literal content a cold terminal reads as its first instruction. No wrapper, no "open a terminal" preamble, no BEGIN/END markers.

---

## Sections every per-phase prompt carries

**1. Arc identification (strong -- mandatory).**
> You are drafting the **Phase &lt;N&gt;** MD for arc **`2026-06-09-demand-driven-l3-concept-authoring`** (L3 player-help concept notes). You are DRAFTING the phase plan, not executing it.
> Sibling-arc guard: the neighbor is `2026-06-09-docs-quake-world` (the L1 reference site). If your reads pull you toward VitePress, build-snapshot, per-codebase reference rendering, or D-numbers about category-inference, you are in the WRONG arc -- stop.

**2. Working directory.** `/home/paradoks/projects/quakeworld/`.

**3. Required reads (numbered, in order).** Always: `decisions.md`, `review-findings.md`, `phase-template.md`, the cross-arc contract. Plus phase-specific source (the harness scratch dir, the loader, the skill templates, the fixture notes, the demand map slice).

**4. What this phase delivers + the decisions that constrain it.** The deliverable in one paragraph + the specific D-numbers the drafter must honor.

**5. Drafting steps.** Draft the phase MD against `phase-template.md`. Fill every template section. Annotate each task's execution-mode (D14/D15).

**6. Sub-agent verification dispatch.** After drafting, dispatch a sub-agent with the verification brief at the bottom of `phase-template.md`. Apply findings; where a finding contradicts `decisions.md`, decisions win -- record the rejection in "Open questions."

**7. Halt-and-handback.** Stop after the verified draft. Report: phase MD path, the task list with execution modes, the verification regime, any open questions, and a one-line status (DRAFTED / DRAFTED-WITH-CONCERNS). Do NOT proceed to execute the phase.

---

## Standing drafting rules (apply to every phase)

- **ASCII discipline:** hyphens, not em/en-dashes, in all authored output.
- **Decisions are law:** if the work seems to need a deviation, surface a "Deviation" block at the top of the phase MD and stop -- do not silently override.
- **Verification is YES/NO:** every task + the phase boundary needs a concrete probe, not "verify it works."
- **No regime collision:** a phase's verification must not depend on a later phase existing. (Phase 0 verifies against the 3 EXISTING notes; each note-phase self-verifies via the gate.)
- **Cite ground truth:** any cvar/command/line/table named in the phase MD must exist in live source -- the sub-agent verifier checks a sample.
