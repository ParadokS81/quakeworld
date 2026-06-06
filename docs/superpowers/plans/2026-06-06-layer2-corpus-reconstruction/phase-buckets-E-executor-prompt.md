You are executing Phase buckets-E (FAQ-substrate enrichment) of the Layer 2 corpus reconstruction arc (2026-06-06-layer2-corpus-reconstruction). Use the `arc-executor` skill.

PRECONDITION -- STOP if not met: Phase C backfill is complete (the corpus is fenced). This is a post-backfill labeling pass; it does not touch fencing.

ARC IDENTIFICATION -- confirm before touching anything. This arc fences Discord chat into THREADS. Phase buckets-E labels each thread with buckets_question / buckets_answer (a 9-bucket taxonomy) so the tagged corpus becomes the FAQ-discovery substrate (the L3 authoring-priority signal). It is a separate, re-runnable Workflow pass decoupled from fencing (D8). You are in the WRONG arc if you find yourself touching engine-entity extraction, KTX/MVDSV/QTV/QWFWD, or community profiles. If so, STOP.

Working directory: /home/paradoks/projects/quakeworld  (qw-oracle is at apps/qw-oracle/.)

REQUIRED READING (all, before executing):
1. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/README.md
2. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/decisions.md  (D8 decoupled+re-runnable, D9 Workflow recipe, D12 JSONB-as-JS-value)
3. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/review-findings.md  (Phase buckets-E owns R7, R8)
4. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/phase-buckets-E-enrichment.md  -- YOUR SPEC.
5. Live source: apps/qw-oracle/scripts/calibration/wf-a-fence-queries.js (the Workflow recipe + the per-thread-file pattern) + an existing JSONB writer using tx.json() under scripts/load-knowledge/ (the JSONB-as-JS-value pattern, D12) + docs/superpowers/parking/2026-05-03-layer3-multidomain-bucket-framework.md (the 9-bucket taxonomy).

EXECUTION RULES: follow decisions.md. Highlights: the columns already exist nullable from Phase A's migration -- NO migration here; labeling = Workflow Sonnet/conc-5/paced/honest-counts + args-as-JSON-string (D9/R7); JSONB columns get JS arrays, NOT pre-stringified JSON -- verify jsonb_typeof = 'array' not 'string' (D12); idempotent UPDATE (re-run overwrites); DISTINCT on junction joins (R8). The 9 buckets: engine-config / engine-content / visual-customization / system / hardware / peripherals / network / server-side / community.

STEP-BY-STEP:
1. Read all required files. Confirm the precondition (C complete).
2. Critically review the phase MD against decisions.md + review-findings.md.
3. Execute Task 1 (labeling Workflow), Task 2 (idempotent JSONB UPDATE), Task 3 (FAQ-discovery query -- the payoff). Commit the scripts.
4. Run the phase-boundary verification (threads tagged as JSONB arrays; re-runnable; FAQ-discovery list produced).
5. Halt with a structured status report + the FAQ-discovery authoring-priority list (the bridge to L3).

Do NOT auto-proceed. The operator reviews the FAQ list at the boundary.
