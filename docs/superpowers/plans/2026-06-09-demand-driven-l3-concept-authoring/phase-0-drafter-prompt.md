You are drafting the **Phase 0** MD for arc **`2026-06-09-demand-driven-l3-concept-authoring`** -- the L3 player-help concept-notes arc. You are DRAFTING the phase plan (a detailed, executable task MD), not executing it.

**Sibling-arc guard:** the neighbor arc is `2026-06-09-docs-quake-world` (the per-codebase L1 reference website). If your reads pull you toward VitePress, `build-snapshot.ts`, per-codebase reference rendering, friendly-type-words, or D-numbers about `category_inferred`, you are in the WRONG arc -- stop and re-orient. This arc authors concept notes and the machinery to gate them; it builds no website.

**Working directory:** `/home/paradoks/projects/quakeworld/`

## What Phase 0 delivers

Phase 0 is the **machinery** every later phase depends on -- three deliverables, shipped as ONE atomic phase (D15), with the runner-build and skill-build delegated to separate sub-agent tasks:

- **(A) The anti-confab guardrail** -- an orientation-prompt rule, "never name a cvar/command absent from the grounding," inserted where the answering LLM is oriented. It helps every oracle answer even before notes land (D5).
- **(B) The per-domain acceptance runner** -- the generalized hypothesis-test harness that gates each note (D10, D12).
- **(C) The forked `domain-concept-curate` skill** -- the authoring methodology (D9).

**Verification (no regime collision):** Phase 0 is verified against the **3 EXISTING notes** -- the runner must score **weapon-scripts NAILED + zero-confab** on its domain's threads, and the skill must produce a structurally-valid note for one dry-run domain. It requires NO Phase-1 note to exist (D15).

## Required reads (in order)

1. `docs/superpowers/plans/2026-06-09-demand-driven-l3-concept-authoring/decisions.md` -- esp. **D9** (fork-not-extend), **D10** (80/20 gate), **D11** (Workflow-not-SDK), **D12** (harness location), **D13** (Bun/JSONB/FTS), **D14** (model/effort), **D15** (Phase-0 atomic + verification).
2. `…/review-findings.md` -- esp. **F1** (harness is in scratch, not `/tmp`), **F2** (the answer step + SDK ban), **F5** (4-part refs not edges), **F6** (embeddings optional).
3. `…/phase-template.md` -- the shape your phase MD must follow + the sub-agent verification brief to dispatch.
4. `contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md` -- the note-structure contract the skill (C) must encode.
5. `docs/superpowers/parking/2026-06-09-demand-driven-l3-concept-authoring.md` -- the hypothesis-test result + harness description (note: its "/tmp" framing is superseded by F1).
6. **The harness scratch dir:** `apps/qw-oracle/scripts/calibration/scratch/faq-hypothesis-test/` (`faq-retrieve.ts`, `faq-verify*.ts`, `faq-domains.ts`, `outputs/`) + the cluster JSON `apps/qw-oracle/scripts/calibration/scratch/faq-clusters.json`. This is what (B) generalizes.
7. **The loader:** `apps/qw-oracle/scripts/load-concepts/` (`index.ts`, `parse.ts`, `upsert.ts`, `CLAUDE.md`) -- the authoring/load contract the skill (C) and the gate loop must honor.
8. **The fork template:** the `game-mode-curate` skill (structural model for C) + its `_methodology/game-modes/` doc. Also read `guide-rewrite` for the phases (C) LIFTS: P3 (L1-verify), P5b (ruleset-restriction scan), P6 (cross-engine + userinfo-hub), P7.5 (operator-consult). Do NOT model C on guide-rewrite's spine (F7 / D9).
9. **The fixture:** `apps/qw-oracle/curated/concept-notes/weapon-scripts.md` -- the note the runner (B) must score NAILED; also the shape the skill (C) targets.

## How to draft

Draft `phase-0-machinery.md` against `phase-template.md`, with (at least) these tasks. Annotate each task's execution mode per D14/D15.

- **Task A -- anti-confab guardrail.** `inline` (a prompt-rule edit, full text shipped in the MD). Locate the orientation-prompt insertion point against the LIVE source: primary = the MCP server's instructions (so every consumer inherits it); secondary = the harness answer-subagent prompt (so the gate tests WITH the rule) and the `domain-concept-curate` skill (so authored notes inherit it). Have the MD name the exact file(s) + the rule text. Verify the wording does not break existing MCP instructions.
- **Task B -- per-domain acceptance runner.** `subagent (Sonnet MAX)`. Start from the scratch scripts (D12), not a rewrite. **Lift as-is:** the grounding-bundle assembler, the four-tool retrieval (+ self-exclusion + cvar-token lookups), the confabulation check (claimed-entity tokens vs L1). **Build new:** (1) domain -> threadIds resolution from `faq-clusters.json` (de-hardcode the rank->domain map + the 11-thread list); (2) the programmatic fresh-Claude answer step via **Workflow subagents** -- NOT `@anthropic-ai/sdk` (F2/D11); (3) scoring -- a judge-subagent OR an operator-review handoff, 80/20 (NO full auto-scorer for v1, D10); (4) per-domain output dirs replacing `/tmp/faq-test/`. The MD's task Steps must spell out the Workflow-subagent dispatch shape and the gate criteria (PARTIAL/dig -> NAILED/platter + zero confab).
- **Task C -- fork `domain-concept-curate`.** `subagent (Sonnet MAX | Opus medium)`. Model on `game-mode-curate`'s shape (synthesize-from-facts, optional-upstream-source triage, HALT/PROCEED rubric, per-claim source-line citation, externalized `_methodology/` doc). Lift guide-rewrite's P3/P5b/P6/P7.5 as named steps. Encode: the note architecture + discipline rules (D6 + the contract: name-by-domain, audience sections, per-method support, default-to-dominant), the anti-confab rule (A), the **3-part-ref rule** (F5: cross-link edges need 3-part `<project>:<kind>:<id>` refs; 4-part refs are dropped to external), and the harness gate (B) as the skill's acceptance step. The skill must HALT on classification/L1-gap uncertainty rather than guessing.

## Verification at the phase boundary

Name these as YES/NO probes in the MD (per D15):
- Runner (B) scores **weapon-scripts NAILED** + **zero confab** on its domain's threads -- run it, capture the output.
- Skill (C) produces a **structurally-valid note** for one dry-run domain (loads via `bun run load-concepts`, 0 errors; carries the structure contract).
- Guardrail (A) rule is present in the located file(s); MCP instructions still well-formed.
- (Recommended-for-realism, F6) the runner's retrieval reflects hybrid search -- note whether `VOYAGE_API_KEY` is set; FTS-only is acceptable for a first pass but flag it.

## After drafting

Dispatch a sub-agent with the verification brief at the bottom of `phase-template.md` (file paths exist, entity/column claims hold, decisions + contract alignment, execution-mode sanity, regime self-containment). Apply findings; where a finding contradicts `decisions.md`, decisions win -- record the rejection in the MD's "Open questions."

**Then halt.** Report: the phase MD path, the task list with execution modes, the verification regime, open questions, and a one-line status (DRAFTED / DRAFTED-WITH-CONCERNS). Do NOT execute Phase 0 -- execution is a separate fresh terminal.
