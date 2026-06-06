You are executing Phase B (chunk-size sweep) of the Layer 2 corpus reconstruction arc (2026-06-06-layer2-corpus-reconstruction). Use the `arc-executor` skill.

ARC IDENTIFICATION -- confirm before touching anything. This arc fences Discord chat into topic-coherent THREADS and rewires search_solved_issues. Phase B is a calibration probe: it picks the largest fence chunk size that still fences cleanly, so Phase C runs the fewest agents. It changes NO schema and NO MCP tool -- its only output is a number (the production cap). You are in the WRONG arc if you find yourself touching engine-entity extraction, KTX/MVDSV/QTV/QWFWD, or community profiles. If so, STOP.

Working directory: /home/paradoks/projects/quakeworld  (qw-oracle is at apps/qw-oracle/.)

REQUIRED READING (all, before executing):
1. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/README.md
2. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/decisions.md  (D9 = the Workflow recipe)
3. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/review-findings.md  (Phase B owns R7)
4. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/phase-B-chunk-size-sweep.md  -- YOUR SPEC.
5. Live source you reuse:
   - apps/qw-oracle/scripts/calibration/02-prep-chunks.ts  (lullChunks -- it is module-private; extract or copy it; do NOT import CHUNK_CAP, pass 750/1500/3000 as locals)
   - apps/qw-oracle/scripts/calibration/wf-a-fence-queries.js  (the fence Workflow recipe -- Sonnet, conc-5, paced, recovery+retry, honest counts, args-as-JSON-string)
   - apps/qw-oracle/scripts/calibration/03-embed-and-retrieve.ts  (the arm-D index-hallucination tally) + wf-b-judge.js (the 1-5 coherence rubric)
   - docs/superpowers/parking/2026-06-05-layer2-calibration-test-results.md  (the cap-750 baselines: 0% hallucination, 4.38/5 coherence)

NOTE the data source: scratch/slice.sqlite holds ONLY Feb-Mar 2021. For a busier worst-case #quakeworld window, re-slice from Postgres (the 01-build-slice.ts pattern) OR use the densest stretch inside the existing 2021 slice. Do not assume 2018 is in scratch.

EXECUTION RULES: follow decisions.md D9 for the Workflow fan-out (Sonnet, conc-5, paced, honest counts; normalize args as a JSON string; R7). This phase is independent of Phase A and runs in parallel.

STEP-BY-STEP:
1. Read all required files.
2. Critically review the phase MD against decisions.md + review-findings.md.
3. Execute Tasks 1-3 per their execution modes (prep + measure = subagent; fence + coherence = Workflow). Commit the sweep scripts + the verdict.
4. Run the phase-boundary verification: a production cap is chosen, justified by per-cap 0% hallucination + coherence ~4+ (fall back to 750 if all larger caps regress).
5. Halt with a structured status report (DONE / ...) + the chosen cap for Phase C.

Do NOT auto-proceed. The operator reviews at the boundary; the cap feeds Phase C.
