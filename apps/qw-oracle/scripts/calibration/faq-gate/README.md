# FAQ acceptance gate runner

Per-domain gate that tests whether the QW Oracle can answer real community FAQ
threads from grounding alone. The runner is the Phase-0 acceptance gate; every
later concept-note arc depends on it passing.

## Architecture: three stages glued by the executor session

```
Stage 1 (Bun, deterministic)
  faq-gate-retrieve.ts --domain <key>
  -> outputs/<domain>/q-*.md          (question + grounding bundle)
  -> outputs/<domain>/truth-*.md      (community answer)
  -> outputs/<domain>/grounding.json  (machine-readable array for Stage 2)

Stage 2 (Workflow, LLM)
  faq-answer-workflow.js  [args = per-thread work-list]
  -> per-thread: oracle answer + claimedEntities (self-report) + verdict + justification
  executor writes: outputs/<domain>/answer-*.md  + answers-<domain>.json

Stage 3 (Bun, deterministic)
  faq-gate-confab.ts --domain <key>
  -> JSON to stdout: {domain, retrieval, threads, pass}
  -> exits 0 (gate pass) or 1 (any hard confab)

executor assembles: outputs/<domain>/gate-<domain>.json
```

## How the executor runs it

```sh
# Stage 1
cd apps/qw-oracle
bun scripts/calibration/faq-gate/faq-gate-retrieve.ts --domain weapon-scripts

# Stage 2 -- Workflow tool (executor session only; agent() path, no API key)
# args = a per-thread work-list. Two modes:
#   PATH   (default): [{threadId, groundingPath, truthPath}] -- agent Reads the files
#   INLINE (MD design): grounding.json contents [{threadId, question, grounding, truth}]
# [run faq-answer-workflow.js via the Workflow tool]

# Stage 3
bun scripts/calibration/faq-gate/faq-gate-confab.ts --domain weapon-scripts
```

## SDK ban (D11 / F2 hard constraint)

`faq-answer-workflow.js` is a Workflow script. It uses only the `agent()` /
`parallel()` / `log()` / `phase()` globals provided by the Workflow runtime.
The answer step routes through `agent()` ONLY -- no direct LLM-provider SDK, no
provider API key, no outbound provider HTTP call anywhere in this directory.
(This Max subscription has no API key; a direct-SDK path would fail.) The
Phase-0 boundary probe greps this dir for the provider import literals and must
come back empty -- so this doc deliberately avoids writing them.

## Retrieval mode flag

Stage 1 and Stage 3 both check `process.env.VOYAGE_API_KEY`. If set, they
record `retrieval: "hybrid"`; otherwise `retrieval: "fts-only"`. The dev env
has `VOYAGE_API_KEY` set, so the gate runs in hybrid mode.

## Override for known-good fixture testing

```sh
# Use --threads to bypass cluster sampling
bun scripts/calibration/faq-gate/faq-gate-retrieve.ts --domain weapon-scripts --threads 12393
```

## Gate pass criteria

`pass` is true when every representative thread is NAILED (from Stage 2 judge)
AND zero hard confab (from Stage 3). The executor assembles the final
`gate-<domain>.json` by merging Stage 2 verdicts and Stage 3 confab results.

## Output artifacts

`outputs/<domain>/` is gitignored. Do not commit run artifacts.
