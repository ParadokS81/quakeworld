# Layer 2 corpus reconstruction -- arc-orchestrator handoff

**For:** the execution wave -- either an `arc-orchestrator` overseer terminal, or the operator driving per-phase `arc-executor` terminals directly. The arc plan is COMPLETE (scaffold + 4 spine phase MDs drafted + sub-agent-verified + findings applied).
**Created:** 2026-06-06 at arc-planner close.

## Where things are

The arc is planned and scaffolded at `docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/`:

- **Scaffold (6 artifacts):** `decisions.md` (13 locked decisions), `review-findings.md` (12 pre-registered risks), `prerequisites.md`, `phase-template.md`, `handoff-prompt.md`, `README.md` (phase index, gate marked).
- **4 spine phase MDs, drafted + verified:** `phase-A-increment-1.md`, `phase-B-chunk-size-sweep.md`, `phase-C-batched-backfill.md`, `phase-buckets-E-enrichment.md`. Each was checked by an isolated sub-agent against live source; findings applied (cache-key full-text hashing, 1-based chunk indices, full orientation citation set, explicit idempotent DELETE predicate, the density query for the two unprobed channels, `lullChunks` extraction).
- **4 per-phase executor prompts (file-as-prompt):** `phase-<ID>-executor-prompt.md`. Open a fresh terminal, type `@<path>`, the `arc-executor` skill takes it from there.
- **Deferred tier (named stubs, NOT detail-planned):** Phase D (threshold recalibration), author-trust note, clustering-for-analysis -- each detail-planned only when its trigger opens (decisions.md D13).

**The shape:** A is a tracer bullet that IS the go/no-go gate; B is a parallel calibration probe; C is the gated horizontal backfill; buckets-E is the gated enrichment. Pipeline: A + B (parallel) -> [A gate] -> C -> buckets-E -> D.

## Reads required (in order)

1. `docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/README.md` -- phase index + slicing rationale + non-goals.
2. `.../decisions.md` -- the 13 locked decisions; every phase respects them.
3. `.../review-findings.md` -- 12 pre-registered risks + the phase-ownership table.
4. The phase MD for whichever phase is firing + its executor prompt.
5. `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` -- the locked architecture (do NOT reopen).
6. `apps/qw-oracle/scripts/calibration/` (`wf-a-fence-queries.js` = the recipe; `README.md`) + `docs/superpowers/parking/2026-06-05-layer2-calibration-test-results.md` (the proven baselines).
7. Operator memory: `feedback_operator_not_technical_review_gate`, `reference_workflow_rate_limit_and_args`, `reference_max_subscription_no_api_key`, `feedback_model_effort_range`.
8. `~/.claude/skills/arc-planner/references/arc-phase-archetypes.md` (verification-approach per phase shape).

## Critical rules

- **A is the gate (D2).** C / buckets-E / D do NOT run unless A's operator-run go/no-go is green. If A underwhelms, the arc STOPS at A; the schema/loader/tool stay (no harm), the negative result is captured. Do not plan or kick off C as if it always runs.
- **Architecture is locked (D1/D13).** No cross-session merge at retrieval time, no embedded summary, no query-time lazy-resolve loop, no author-authority retrieval ranking. A phase wandering into these is reopening settled work -- STOP.
- **Idempotency is a HARD requirement (D5).** Deterministic `thread_key`, DELETE-scope-then-INSERT with the predicate matching the key. Ship the idempotency probe (R5).
- **LLM fan-out = Workflow, Sonnet, conc-5, paced, recovery+retry, honest counts, args-as-JSON-string (D9).** Opus or auto-concurrency trips the shared throttle and starves other terminals. Trial a small wave first.
- **The operator is the intent-gate, not the technical gate.** The phase-boundary TECHNICAL verification (does the migration match D4? is the loader idempotent? did the kill-switch comparison run?) is the overseer's job; the operator judges the A gate (threads vs sessions) and reviews open questions. (`feedback_operator_not_technical_review_gate`.)
- **House rules (D12):** ASCII; Bun; append-only migrations + SCHEMA.md; JSONB as JS values; tag generated output with model + prompt version.
- **Sibling-arc collision (R9):** the qtv-qwfwd arc is shipping concurrently and already moved past migration 020 -- the executor takes the next FREE migration number, never hard-codes 021.

## First three actions

1. **Verify prerequisites** (`prerequisites.md`): Postgres up with the Arc 1 L2 corpus; and critically, the probe output present and intact (`scripts/calibration/scratch/wf-a.json` = 221 chunks / 1008 threads, `scratch/chunks/`, `scratch/embed-cache.sqlite` -- it is gitignored/local-only). If `scratch/` was cleared, Phase A's Recovery regenerates it.
2. **Kick off Phase A and Phase B in parallel** (they are independent -- B needs no `chat_threads`). Fresh terminal each: `@.../phase-A-executor-prompt.md` and `@.../phase-B-executor-prompt.md`. A ships the tracer + the gate; B picks the production cap.
3. **Set up cross-phase memory capture.** Three outcomes must flow forward into decisions.md amendments / Phase C's prompt: (a) the A gate decision (green -> C runs; stop -> arc ends); (b) B's chosen fence cap (sizes C's batches); (c) C's batch-1 `resolution_status` kill-switch outcome (kept-riding vs dropped-to-separate-pass). Record each as a dated note where the next phase reads it.

## When in doubt

The architecture is done; this is execution. Implementation-shaped questions (the exact DELETE predicate, the cache-key reconstruction, the fence-prompt `resolution_status` extension) are answered in `decisions.md` + the phase MDs -- if a genuinely new one arises, land it as a dated `decisions.md` amendment, do not improvise silently. Architectural questions are LOCKED in the spec -- treat them as settled. Route true forks to the operator with plain-English consequences. The community profile tools + the author->profile crosswalk are NOT this arc (the qwiki community-reference arc owns them).

## Note on execution weight

This is a small, locked arc (4 spine phases, proven recipe). A dedicated `arc-orchestrator` overseer terminal is worth it for the technical phase-boundary gates (per the operator-not-technical-gate memory), but the operator can also drive the four executor prompts directly and review at boundaries -- the per-phase prompts are self-contained for either path. Phase C is multi-session by design (1-2 batches/session, quota-paced).
