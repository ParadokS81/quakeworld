# Layer 2 calibration probe (THROWAWAY)

A decision probe, **not** production code. It answers ONE question: does LLM
topic-fencing (arm D) beat cheap mechanical segmentation (arm C) or dumb 15-min
sessions (arm B) on retrieval quality for a real QuakeWorld Discord slice
(Feb-Mar 2021, `#helpdesk` + `#quakeworld`)? The verdict scopes brainstorm Pass 3.

Verification is **build + run + inspect output shape**, not TDD. Outputs are
tagged with model + prompt version. Everything under `scratch/` is gitignored.

## Architecture (hybrid)

Deterministic Bun scripts (slice / Voyage embed / cosine / FTS / aggregate) +
two `Workflow` runs for the LLM fan-out. **No Anthropic API key** (Max
subscription) -- LLM jobs are Claude workflow-agents, not SDK calls.
`VOYAGE_API_KEY` drives embeddings.

## Rate-limit discipline (learned the hard way)

A 251-agent **Opus** burst trips the shared account-wide throttle ("Server is
temporarily limiting requests") and starves OTHER terminals. The workflow scripts
therefore use **Sonnet** (fencing/judging are reading tasks, not deliberation
tasks -- Sonnet at default effort matched/beat Opus and is the realistic
production model), **low concurrency** (`CONC`), **paced waves**, an 8s
recovery+retry pass, and an **honest success/fail count** in the return value.

## Run order

```
bun scripts/calibration/01-build-slice.ts        # live Postgres -> scratch/slice.sqlite (verify 6131/10115)
bun scripts/calibration/02-prep-chunks.ts        # lull-chunks + session sample -> scratch/{chunks,sessions}/ + wf-a-input.json
# Workflow tool: wf-a-fence-queries.js  args=scratch/wf-a-input.json  -> write result to scratch/wf-a.json
bun scripts/calibration/03-embed-and-retrieve.ts # embed B/C/D + queries, retrieve -> scratch/pairs/ + wf-b-input.json
# Workflow tool: wf-b-judge.js          args=scratch/wf-b-input.json  -> write result to scratch/wf-b.json
bun scripts/calibration/04-report.ts             # -> docs/superpowers/parking/2026-06-05-layer2-calibration-test-results.md
```

Workflows take `args` as a JSON string (the harness stringifies); the scripts
normalize with `typeof args === 'string' ? JSON.parse(args) : args`.

## Locked params

Window 2021-02-01..2021-04-01 (exclusive); channels `#helpdesk` + `#quakeworld`;
prune to `category IN ('chat','link')`; embed voyage-4-large (doc) / voyage-4-lite
(query); arm-D chunk cap 750 msgs cut at 3h lulls; top-k=3; judge pairs
D-vs-C / D-vs-B / C-vs-B / D-vs-A with position-swap.
