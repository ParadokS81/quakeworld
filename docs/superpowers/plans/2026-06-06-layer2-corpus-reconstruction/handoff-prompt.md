# Handoff prompt template -- per-phase executor bootstrap

This file carries the SHAPE every per-phase executor prompt follows. The operator (or an arc-orchestrator terminal) does NOT paste this file directly -- it is the template from which the pre-substituted `phase-<ID>-executor-prompt.md` files are generated. Those per-phase files are file-as-prompt: open a fresh `claude` terminal and type `@docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/phase-<ID>-executor-prompt.md` as the first message. No copy-paste wrapper, no BEGIN/END markers.

Execution uses the `arc-executor` skill (wave 2). Each phase MD is already drafted and operator-approved before its executor prompt fires; the executor reads the MD cold, critically reviews it against `decisions.md` + `review-findings.md`, executes per the task execution-modes, runs phase-boundary verification, and halts with a structured status report.

---

## The template (substitute `<ID>` and the per-phase specifics)

```
You are executing Phase <ID> of the Layer 2 corpus reconstruction arc
(2026-06-06-layer2-corpus-reconstruction).

ARC IDENTIFICATION -- confirm you are in the right arc before touching anything.
This arc rebuilds qw-oracle Layer 2 retrieval: it fences Discord chat into
topic-coherent THREADS, embeds raw member messages, stores chat_threads +
thread_messages, and rewires search_solved_issues to hybrid thread retrieval.
Tell-tale signs you are in the WRONG arc (STOP and re-check if you see these):
  - You are extracting engine entities (cvars / commands / macros), touching
    KTX / MVDSV / QTV / QWFWD, running describe-fill, or editing L1 *_versions
    tables. That is a different arc.
  - The work mentions player/clan profiles, lookup_by_nick, or community.* tables.
    That is the qwiki community-reference arc (Pass 4 severed it from this one).
  - You are asked to merge threads at retrieval time, embed a summary, or build
    a query-time mention-resolve loop. Those are LOCKED-OUT (decisions.md D1/D13).

Working directory: /home/paradoks/projects/quakeworld
(qw-oracle lives at apps/qw-oracle/; run bun scripts from there.)

REQUIRED READING (read all before executing):
1. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/README.md
2. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/decisions.md
3. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/review-findings.md
4. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/phase-<ID>-<name>.md
   -- the phase you are executing. This is your spec.
5. The live source files the phase's "Files touched" lists. Grep them BEFORE
   writing against them -- plan snippets are hypotheses until verified.
6. For the proven recipe (Phase B / C / buckets-E): apps/qw-oracle/scripts/calibration/
   wf-a-fence-queries.js (the Workflow fan-out recipe) + README.md.

EXECUTION RULES (from decisions.md):
- ASCII only; no emoji; ASCII hyphen-minus (D12).
- Bun runtime; `bun db/migrate.ts` for migrations; append-only -- never edit an
  applied migration; update SCHEMA.md alongside (D4/D12).
- Embed raw member messages "author: content\n...", NOT a summary (D3); reuse
  the probe's embed cache where applicable (D10).
- Idempotency is a HARD requirement on any backfill: deterministic thread_key,
  delete-scope-then-insert (D5); ship an idempotency probe.
- LLM fan-out routes through the Workflow tool: Sonnet, conc-5, paced waves,
  recovery+retry, honest counts; normalize args as a JSON string (D9 / R7).
- JSONB columns get JS values, not pre-stringified JSON (D12).
- Respect each task's declared execution mode (inline / subagent <model> / workflow).
- For gated phases (C / buckets-E / D): confirm the precondition (Phase A gate
  green) before starting. If it is not green, STOP.

STEP-BY-STEP:
1. Read all required files. Note which review-findings risks this phase owns.
2. Critically review the phase MD against decisions.md + review-findings.md.
   If a task contradicts a decision, STOP and surface it -- do not execute the
   contradiction.
3. Execute each task per its execution mode. Commit after each meaningful change
   (one-line message: what changed and why).
4. Run the phase-boundary verification. For Phase A, that includes the
   operator-run go/no-go gate -- prepare the comparison, then hand it to the
   operator; do not self-certify the gate.
5. Halt with a structured status report: DONE / DONE_WITH_CONCERNS /
   NEEDS_CONTEXT / BLOCKED, the verification results (YES/NO per probe), open
   questions, and -- for gated phases -- whether the gate/precondition holds.

Do NOT auto-proceed to the next phase. The operator reviews at the boundary.
```

---

## Per-phase executor prompts

The pre-substituted files live alongside this template:

- `phase-A-executor-prompt.md`
- `phase-B-executor-prompt.md`
- `phase-C-executor-prompt.md`
- `phase-buckets-E-executor-prompt.md`

Deferred stubs (D / author-trust / clustering) get executor prompts only once their trigger opens and they are detail-planned.

---

## Recovery: a phase comes back wrong

If a phase executes but the result is wrong after verification:
1. Do NOT re-prompt the same terminal -- its context is polluted.
2. Open a fresh terminal, re-attach the phase executor prompt, and prepend a one-paragraph hint naming what went wrong: "The prior execution of Phase <ID> did <X>; it should have done <Y>. Re-read the phase MD and the named decision, then redo from <task N>."

This is the fresh-context-for-execution pattern (`feedback_fresh_context_for_execution`).
