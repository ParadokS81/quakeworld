# Phase-0 EXECUTOR prompt -- demand-driven L3 concept authoring

> **File-as-prompt.** Open a fresh `claude` in `/home/paradoks/projects/quakeworld/` and `@`-reference this file (or paste it). It is the literal cold-start instruction for the Phase-0 executor terminal. The orchestrator (separate terminal) wrote it and will verify your output at the phase boundary against live runs -- not against your "PASS" claims.

You are the **EXECUTOR** shipping **Phase 0** of arc **`2026-06-09-demand-driven-l3-concept-authoring`** (L3 player-help concept-note machinery). You are EXECUTING the phase, not drafting it -- the phase MD is drafted, gated, and operator-approved. **Invoke the `arc-executor` skill** and run Phase 0 under it.

**Sibling-arc guard:** the neighbor is `2026-06-09-docs-quake-world` (the L1 reference website, VitePress). If your reads pull you toward VitePress, `build-snapshot.ts`, per-codebase reference rendering, or `category_inferred`, you are in the WRONG arc -- stop. Phase 0 builds authoring + gating machinery for L3 concept notes; it builds no website.

**Working directory:** `/home/paradoks/projects/quakeworld/` (qw-oracle work runs from `apps/qw-oracle/` so `.env` loads).

---

## Required reads (in order, before touching anything)

1. `docs/superpowers/plans/2026-06-09-demand-driven-l3-concept-authoring/phase-0-machinery.md` -- **your phase MD.** Read the top AMENDMENT block first; it overrides paths in the body (see Augmentation 1).
2. `docs/superpowers/plans/2026-06-09-demand-driven-l3-concept-authoring/decisions.md` -- D1-D16 + the 2026-06-10 amendment log. Decisions are law; do not silently override in code.
3. `docs/superpowers/plans/2026-06-09-demand-driven-l3-concept-authoring/review-findings.md` -- F1-F7. F2 (SDK trap) and F5 (4-part refs) are load-bearing for this phase.
4. `contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md` -- the note-structure contract Task C's skill must encode.
5. The lift sources (read, do not edit -- they are the POC reference): `apps/qw-oracle/scripts/calibration/scratch/faq-hypothesis-test/{faq-retrieve.ts,faq-verify.ts,faq-domains.ts}`, and the POC snapshot `outputs/q-12393.md` + `outputs/truth-12393.md` + `outputs/answer-12393.md`.
6. For Task C only: `~/.claude/skills/game-mode-curate/SKILL.md` (the spine to fork) and `~/.claude/skills/guide-rewrite/SKILL.md` (the four phases to LIFT: P3, P5b, P6, P7.5).

---

## ORCHESTRATOR AUGMENTATIONS -- apply these OVER the MD body where they conflict

The phase MD is correct in intent; these six points sharpen execution and pre-empt the traps the orchestrator verified against live source on 2026-06-10.

**1. Runner location = TRACKED `faq-gate/`, NOT scratch (overrides the MD body's "Files touched").**
The MD body still writes the four NEW runner scripts under `scripts/calibration/scratch/faq-hypothesis-test/`. That is superseded by the top amendment block + decisions.md (D12 amendment, 2026-06-10). The truth:
- The four NEW scripts -- `faq-domains-resolve.ts`, `faq-gate-retrieve.ts`, `faq-answer-workflow.js`, `faq-gate-confab.ts` -- plus a **tracked copy** of `faq-clusters.json` and a short `README.md` land in **`apps/qw-oracle/scripts/calibration/faq-gate/`** (TRACKED -- this dir does not exist yet; you create it).
- Run artifacts go in `apps/qw-oracle/scripts/calibration/faq-gate/outputs/` and stay **gitignored** -- add the ignore rule (e.g. an entry in `apps/qw-oracle/.gitignore` for `scripts/calibration/faq-gate/outputs/`).
- The POC scripts in `scratch/faq-hypothesis-test/` stay UNTRACKED and UNCHANGED -- they are your read-only lift source, not the deliverable. Do not edit or delete them (Chesterton's fence).
- Net: wherever the MD body says `scratch/faq-hypothesis-test/<new-script>`, read `faq-gate/<new-script>`.

**2. The Stage-2 answer step is the single highest-risk build -- Workflow `agent()` ONLY (F2/D11).**
No `@anthropic-ai/sdk`, no `ANTHROPIC_API_KEY`, no `fetch` to api.anthropic.com -- there is no API key on this Max subscription; the SDK path would fail. The answer step routes through the `Workflow` tool's `agent()`. The runner is **glued, not monolithic**: Bun does the DB retrieve (Stage 1) and the confab check (Stage 3); the **Workflow tool** does the LLM answer + judge (Stage 2); the executor SESSION orchestrates the three. Do not try to make one Bun script do the LLM step (Bun can't dispatch Workflow) or one Workflow script do the DB step (Workflow scripts have no DB/filesystem access).
Workflow discipline (memory `reference_workflow_rate_limit_and_args`, learned the hard way): **Sonnet, not Opus**; **low concurrency** (in-script sequential waves of ~3-5); **pace ~2s between waves**; **trial a small batch first** to confirm it clears the shared burst throttle; **return honest success/fail counts** (never a silent `.catch(() => null)`). Defensively parse args at the top of every Workflow script: `const items = typeof args === 'string' ? JSON.parse(args) : (args ?? [])`.

**3. The `domain -> rank` derivation gotcha (orchestrator verified live).**
`faq-answer-...`'s resolver must replicate `faq-domains.ts`'s rank derivation: rank = index in the cluster list **sorted by `size` descending**, plus 1 (`faq-domains.ts:3` comment confirms `rank = index+1`). The cluster's own `id` field is NOT the rank. `R[12] === 'weapon-scripts'`. Get this wrong and the resolver binds the wrong threads.

**4. Verify the gate against the POC snapshot, not just a green checkmark.**
The fixture is weapon-scripts thread **12393** -- it NAILED in the POC with a single retrieval, and the POC snapshot is on disk (`outputs/q-12393.md` etc.). After Stage 1, diff your assembled grounding against the POC's `q-12393.md`; if the retrieval lift drifted (self-exclusion, the four-tool block, the assembler), the grounding will differ. A PARTIAL on this known-good fixture means the **runner machinery** is wrong, not the note -- do not "fix" it by lowering the bar.

**5. Phase-boundary report must carry ARTIFACTS, not assertions.**
The orchestrator re-runs every probe at the boundary (memory `feedback_verify_dispatched_terminal_claims`). Your halt report must paste the ACTUAL outputs: the full `gate-weapon-scripts.json`, the `grep -rn "anthropic-ai/sdk\|api.anthropic.com" scripts/calibration/faq-gate/` result (must be empty), the `grep -n "Grounding discipline" serve/mcp/src/orientation.ts` line, the `bun run load-concepts` output for the dry-run note, and a `bunx tsc --noEmit` (or serve/mcp typecheck) result for the orientation.ts edit. "Verification PASS" without the artifacts will be treated as unverified.

**6. Shared working tree -- scope every `git add` (do NOT `git add -A`).**
A sibling terminal is active in this same tree with unrelated uncommitted changes (slipgate asset bundles, other parking docs). Stage ONLY this phase's files: `apps/qw-oracle/serve/mcp/src/orientation.ts`, the new `apps/qw-oracle/scripts/calibration/faq-gate/` tree (scripts + tracked faq-clusters.json + README), and the `.gitignore` rule. Verify with `git diff --cached --stat` before every commit. The `domain-concept-curate` skill lives at `~/.claude/skills/` (outside the repo -- not a repo commit). The dry-run note is a throwaway -- keep or remove at operator discretion, do not commit it as a real deliverable.

---

## Execution order + modes (from the MD; D14/D15)

Author **A first** (it owns the canonical anti-confab rule text), then **B and C in parallel** (each embeds A's text verbatim).

- **Task A -- anti-confab guardrail.** Insert the `Grounding discipline:` paragraph into `ORIENTATION_INSTRUCTIONS` in `serve/mcp/src/orientation.ts`, immediately after the existing `Citation discipline:` line (verified present at line 26). `inline` -- one textual edit, full rule text is in the MD. Verify: grep finds the line + typecheck passes.
- **Task B -- per-domain gate runner.** The glued three-stage runner in the tracked `faq-gate/` dir (Augmentation 1). `subagent (Sonnet MAX)` -- multi-file code synthesis; the Workflow wiring (Augmentation 2) is the judgment-dense, highest-risk part.
- **Task C -- fork `domain-concept-curate` skill.** Model on `game-mode-curate`'s spine; GRAFT guide-rewrite P3/P5b/P6/P7.5 as named steps; encode D6 architecture + the contract + the anti-confab rule (A) + the F5 3-part-ref rule; wire Task B as the acceptance step. `subagent (Sonnet MAX | Opus medium)`. Its dry-run note (note-drafting) = Sonnet MAX.

---

## Phase-boundary verification (run all; report artifacts per Augmentation 5)

D15 -- verified against the **3 existing notes**, no Phase-1 note required:
- **Gate passes on the fixture:** `bun scripts/calibration/faq-gate/faq-gate-retrieve.ts --domain weapon-scripts --threads 12393` -> Stage-2 Workflow answer -> Stage 3 reports weapon-scripts **NAILED** for 12393; `gate-weapon-scripts.json` has `pass: true`.
- **Zero hard confab on the fixture.**
- **No SDK path:** `grep -rn "anthropic-ai/sdk\|api.anthropic.com" scripts/calibration/faq-gate/` returns nothing.
- **Guardrail in place:** `grep -n "Grounding discipline" serve/mcp/src/orientation.ts` returns the line; serve/mcp typechecks.
- **Skill produces a valid note:** the `domain-concept-curate` dry-run note loads via `bun run load-concepts` (0 errors) and carries the structure contract (typed 3-part `related_entities`, audience-tagged sections, per-method support annotation, `best_practices_reviewed`).
- **Retrieval-realism flag (F6):** record in `gate-weapon-scripts.json` whether `VOYAGE_API_KEY` was set (hybrid) or absent (FTS-only). FTS-only is acceptable for this boundary -- flag it so Phases 1-3 know the gate's strength.
- **Operator prose review** is the second gate for real notes (D4) -- not required for Phase 0's throwaway dry-run, but name it in your report.

---

## Halt-and-report contract

Stop at the phase boundary. Do NOT proceed to draft or execute Phase 1. Report:
- One-line status: **DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED**.
- The artifacts from Augmentation 5 (pasted, not summarized).
- Any decision you made at a runtime fork (scoring path = judge-subagent vs operator-eyeball; `_methodology/domains/` created or referenced; args shape on first live run) with one-line rationale.
- Any new hazard for `review-findings.md` (next F-number) + which phase it affects.
- Your context-budget estimate (the orchestrator tracks for a fresh-terminal handoff near ~350k).

If you hit a decision that decisions.md + the contract do not resolve, HALT and surface it in plain English -- do not guess. If a Workflow run dies on a credential error, the SDK trap leaked in (grep + remove); if it dies on rate-limit, drop concurrency and pace (Augmentation 2).
