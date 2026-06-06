# Layer 2 cap-sweep -- results

**Tagged:** model=sonnet, prompt=v1. Phase B continuation (gap LOCKED 12h; sweep the cap UP from the 750 floor). Throwaway calibration probe.

**Worst-case sample:** the single largest 12h bite in the corpus -- #quakeworld 2017, 22673 msgs spanning 2149.4h. Every test chunk is a cap-FORCED marathon-slice (hardest case; isolates the forced-cut residual the 12h gap introduces).

**Harness ceiling:** a Workflow fence agent's Read tool caps at 256KB/~25k tokens, so a single-file chunk tops out near ~2,700 msgs (a 3000-msg file is ~280KB and truncates). Swept caps: 750 / 1500 / 2500 -- the validly single-file-readable range. Caps above ~2,700 would need multi-file chunk delivery in BOTH the probe and Phase C.


## Per-cap fencing quality (12h gap, forced marathon-slices)

Coverage = distinct valid indices / N; <100% means the fencer dropped messages (or its input was truncated). Hallucination = member_indices outside [1..N].

| cap | chunks | threads | hallucination (mean/max) | coverage (mean/min) | dup-assign (rate) | coherence (mean, n) | hard-gate |
|---|---|---|---|---|---|---|---|
| 750 | 3 | 145 | 0.00% / 0.00% | 100.0% / 100.0% | 0 (0.00%) | 3.60 (n=5) | PASS |
| 1500 | 4 | 318 | 0.00% / 0.00% | 98.9% / 96.0% | 26 (0.44%) | 3.40 (n=5) | PASS |
| 2500 | 5 | 456 | 0.00% / 0.00% | 98.3% / 96.4% | 232 (1.85%) | 3.60 (n=5) | PASS |

## Coherence -- read relative, not absolute

Probe baseline (cap 750, 2021 slice, mostly-NATURAL chunks): coherence 4.38. This sweep deliberately samples the BIGGEST threads on cap-FORCED marathon-slices (the worst case), so absolute coherence sits lower at every cap. The same-harness cap-750 control (3.60) is the anchor; the decision metric is non-regression as the cap grows:

- 750 = 3.60 | 1500 = 3.40 | 2500 = 3.60 -- flat within noise. Bigger caps do NOT reduce coherence.

- The low scorers (2-3) at every cap are genuine rambling / off-topic #quakeworld banter (music production, OS tangents, fighting-game chat), not a chunk-size artifact; the 4-5 scorers (4on4 onboarding, duel-map debate, CRT advice, dm4 teleporter) appear at every cap including 2500.


## Verdict

- **Hard correctness gate (0% index-hallucination + no truncation): PASS at every cap up to 2500.** No member_index ever fell outside [1..N]; coverage stayed >=96%; the 256KB Read-cap guard held (every chunk fully ingested).

- **Coherence: non-regressing** through 2500 (relative to the 750 control).

- **Largest cap passing hallucination + coherence: 2500** (the operator's stated rule).

- **Partition cleanliness is the one cap-monotonic degradation:** dup-assignment rate 750=0.00%, 1500=0.44%, 2500=1.85%. The fence prompt asks for a strict partition (each message in exactly one thread); 2500 starts breaking it, 1500 stays essentially intact.

- **Recommended production cap: 1500.** At 12h gap the cap barely moves the agent count (see below), so the choice is quality-driven, not cost-driven: 1500 clears the hard gates AND keeps the partition essentially intact (<1% dup), halving forced cuts vs 750 while keeping the fencer crisp. 2500 also clears hallucination + coherence but its ~2.5% extra agent reduction is not worth 4x the dup rate. 750 remains the conservative floor.


## Phase C agent count (12h gap, live corpus, per channel-year batching)

| cap | backfill agents | forced cuts | note |
|---|---|---|---|
| 750 (floor) | 4058 | 401 | proven floor |
| 1500 (recommended) | 3796 | 139 |  |
| 2500 (max-passing) | 3717 | 60 | passes hard gates |

For contrast, the original 3h-gap / cap-750 plan was 18,365 agents (D9 amendment). The 12h gap is the dominant lever; the cap is nearly a non-dial -- from cap 750 to 2500 the agent count moves only 4058 -> 3717 (~8%). The cap's real job at 12h is trimming forced cuts on the ~34 bites >= 3000.


## Output to Phase C

- **gap = 12h, cap = 1500 (recommended)** -> **3796** backfill fence agents (vs D9's stale ~650-750 estimate). Pending operator confirm at the phase boundary (D11).

- Alternatives: cap 750 (floor) -> 4058 agents; cap 2500 (max-passing) -> 3717 agents.

- Every production chunk stays <= the cap => single-file Read-safe (<256KB). No multi-file fence delivery needed.

- Caps above ~2,700 were NOT tested: the 256KB fence-agent Read cap truncates them, and the <10% agent-count payoff does not justify multi-file chunk delivery in Phase C. If the pure model-ceiling is ever wanted, deliver a >2700-msg chunk across multiple files.
