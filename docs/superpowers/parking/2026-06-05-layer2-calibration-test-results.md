# Layer 2 calibration test -- results

**Probe:** does LLM topic-fencing (arm D) beat cheap mechanical segmentation (arm C) or dumb 15-min sessions (arm B) on retrieval quality for a real QuakeWorld Discord slice (Feb-Mar 2021, #helpdesk + #quakeworld)?

**Tagged:** model=sonnet, prompt=v1, eval=pairwise-judge-position-swap. Throwaway decision probe; numbers scope brainstorm Pass 3.

## Per-pair win rates

Win = survives position-swap. Ties excluded from the rate denominator (reported separately). Read "D 70% / C 20% (tie 1)" as: of swap-surviving verdicts, D won 70%.

### D vs C

| group | D wins | C wins | ties | D rate |
|---|---|---|---|---|
| overall | 21 | 8 | 7 | 72% |
| helpdesk | 10 | 2 | 2 | 83% |
| quakeworld | 7 | 3 | 0 | 70% |
| anchor | 4 | 3 | 5 | 57% |

### D vs B

| group | D wins | B wins | ties | D rate |
|---|---|---|---|---|
| overall | 20 | 9 | 7 | 69% |
| helpdesk | 9 | 3 | 2 | 75% |
| quakeworld | 6 | 3 | 1 | 67% |
| anchor | 5 | 3 | 4 | 63% |

### C vs B

| group | C wins | B wins | ties | C rate |
|---|---|---|---|---|
| overall | 14 | 8 | 14 | 64% |
| helpdesk | 8 | 3 | 3 | 73% |
| quakeworld | 3 | 4 | 3 | 43% |
| anchor | 3 | 1 | 8 | 75% |

### D vs A

| group | D wins | A wins | ties | D rate |
|---|---|---|---|---|
| overall | 36 | 0 | 0 | 100% |
| helpdesk | 14 | 0 | 0 | 100% |
| quakeworld | 10 | 0 | 0 | 100% |
| anchor | 12 | 0 | 0 | 100% |

## Disentanglement

### Coherence (1-5; 5 = one clean topic)

| group | arm-D threads (mean) | arm-C segments (mean) |
|---|---|---|
| overall | 4.38 (n=8) | 3.50 (n=8) |
| helpdesk | 4.50 | 3.50 |
| quakeworld | 4.25 | 3.50 |

### Arm-D index-hallucination (member_indices outside [1..N])

| channel | hallucination |
|---|---|
| #helpdesk | mean 0.0% / max 0.0% |
| #quakeworld | mean 0.0% / max 0.0% |

## Cost

- Arms indexed: A=FTS, B=1418 sessions, C=1902 segments, D=1008 fenced threads.
- Queries: 36 (24 reverse-gen + 12 Phase-8 anchors).
- Voyage embedding: 883943 tokens, 36 API calls, 1153 cache hits.
- Workflow agents: WF-A fence+qgen (see run log), WF-B judge 36 + coherence 16. Model sonnet. (No dollar figure -- Max subscription quota.)

## Decision-rule verdict (mechanical read -- operator confirms)

- **D separates from C** (D-vs-C 72% D): LLM fencing earns its cost. How-deep: read off hallucination above (low at cap 750 -> sweep size UP next).
- **D separates from B** (D-vs-B 69% D): tighter-than-session units help.

> Tiebreaker (verbatim): a close call defaults to the cheaper arm. Margin = +-10pp of 50%.


## Caveats (honest framing)

- **Arm A (lexical FTS) returned [NO HIT] on 32/36 queries.** B/C/D always return a cosine top-k hit; A returns nothing without token overlap. So "D-vs-A 100%" mostly means "embedding returns something, lexical returns nothing" -- it shows embeddings are load-bearing for symptom-phrased help queries, NOT that D's threads are flawless. The load-bearing comparisons are D-vs-C and D-vs-B.
- **Arm B held the source session** for the 24 reverse-gen queries (the answer conversation is literally one of B's units -- a self-recall advantage). D still beat B on reverse-gen (helpdesk 75% D, quakeworld 67% D), which strengthens the result rather than inflating it.
- **Small n (36 queries).** Directional, not a production-grade eval. The 12 Phase-8 anchors are 2026-sourced and partly un-answerable from a 2021 slice, so that subset is noisier (and is where C closes the gap: D-vs-C anchor 57% D).
- **Per-channel:** D wins on BOTH channels (D-vs-C helpdesk 83% D / quakeworld 70% D) -- no "cheap arm is fine on one channel" asymmetry. Fence everywhere, not selectively.