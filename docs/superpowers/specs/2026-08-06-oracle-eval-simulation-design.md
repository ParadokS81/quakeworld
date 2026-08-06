---
date: 2026-08-06
type: design-spec
arc-slug: oracle-eval-simulation
status: DESIGN IN PROGRESS -- Pass 1 (Sampling) CLOSED 2026-08-06 (D1-D5); Pass 2 (Rubric & grading) open.
parent: docs/superpowers/parking/2026-08-06-oracle-eval-simulation.md
related:
  - docs/superpowers/parking/2026-06-09-helpdesk-faq-landscape.md (June topic map: 48 clusters over 6,623 #helpdesk threads, deterministic k-means, seed=42)
  - apps/qw-oracle/scripts/calibration/faq-gate/faq-clusters.json (machine-readable map: all 5,028 FAQ-candidate threadIds across the 48 clusters)
  - apps/qw-oracle/scripts/calibration/faq-gate/faq-domains-resolve.ts (48 clusters -> ~24 domains + tiers; encodes the June 9 taxonomy, pre-June-16 reshape)
  - docs/superpowers/parking/2026-06-09-demand-driven-l3-concept-authoring.md (24 domains / 89% of demand; 11-thread MCP hypothesis test = rubric prior art)
  - apps/qw-oracle/docs/phase-8-eval-candidates.md (2026-05-02 hand-built 12-question eval set with verified answer keys)
  - docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md (consumer of the showcase byproduct; why-comparison overlay ships dark until this arc feeds it)
  - docs/superpowers/parking/2026-08-05-contract-worker-spike-report.md (DeepSeek contract-worker rig this arc reuses)
---

# Oracle effectiveness eval -- design spec (DeepSeek helpdesk simulation + showcase captures)

Design conversation running 2026-08-06 in-session (arc-design, direct mode from
the parking doc). Locked decisions land here as D-entries; amendments are dated
blocks, never silent edits.

## Pass plan (locked 2026-08-06)

1. **Sampling design** -- question population (which channels/threads are
   eligible), old-map-vs-recluster, stratification axes, sample sizes,
   corpus-scoping condition matrix (with-oracle-all / with-oracle-helpdesk-only /
   without-oracle). (IN PROGRESS)
2. **Rubric & grading** -- resolved-thread grading against known fix,
   unresolved-thread judgment sample, pilot calibration gate before the bulk
   run, grade spot-check sampling after it.
3. **Harness & model roles** -- with/without symmetry, DeepSeek tool-calling
   loop against the MCP endpoint, dev-MCP-instance + Tailscale direct route
   (bulk must not transit Cloudflare), harness home (extend fence-external.ts
   vs sibling), Claude calibration sample.
4. **Outputs** -- internal report shape; showcase capture protocol (client,
   session hygiene, handoff into oracle-web's dark overlay).

## Verified corpus facts (2026-08-06, live prod query)

- `chat_threads`: 40,219 total; 100% have `topic_embedding`, 0 stale;
  39,138 (97%) carry `resolution_status`.
- Per channel (total / solved / unresolved): #quakeworld 22,073 / 5,316 / 2,729;
  #dev-corner 10,359 / 3,714 / 2,004; #helpdesk 6,772 / 3,694 / 1,447;
  #antilag 1,015 / 410 / 120.
- `search_solved_issues` today has NO channel filter (query/limit/max_messages
  only; both lexical + vector paths sweep the full table). Channel scoping =
  small WHERE addition; design intent is per-run server-side config, never an
  agent-visible tool param (identical tool surface across conditions).
- Prod == dev twin (exact parity 13/13, 2026-08-06); bulk eval runs target the
  dev twin over the local network / Tailscale.

## Decisions

### D1 -- Question population: #helpdesk solved threads (locked 2026-08-06)

Eval questions are drawn from **#helpdesk solved threads** (3,694, each with a
human-verified fix as answer key). This is the cleanest match to the product
claim ("solves actual player issues"): helpdesk is where players ask, and the
June topic map covers it directly, so stratification comes free.

- **#quakeworld**: excluded from the core population; carried forward as an
  optional secondary sample, decided after the pilot (its 5,316 solved threads
  are mixed with banter/discussion; inclusion needs a screening step and a
  fresh stratification story).
- **#dev-corner**: excluded (developer chatter, not the product claim).
- **#antilag**: excluded from the question population (small; the channel is
  the community's pursuit of a proper antilag system -- two rival approaches
  divide players -- so its threads are debate-shaped more than
  question-with-fix-shaped).

Channels play a second, separate role as *retrieval scope* (what the oracle
searches); that is the condition matrix, not this decision. Operator's stated
core interest: whether including the large #quakeworld corpus in retrieval
dilutes or improves answer quality -- the condition matrix must answer this
directly. Dilution mechanism is L2-specific: both retrieval paths pull a fixed
top-N from the whole table, so a 22k-thread channel can crowd helpdesk hits out
of the candidate slots; L1/L3 tools are unaffected by channel scope.

### D2 -- Condition matrix: three cells, paired design (locked 2026-08-06)

Every sampled question runs through all three conditions (paired design --
head-to-head comparisons on identical questions):

- **A -- baseline**: DeepSeek, no MCP tools.
- **B -- oracle, helpdesk-scoped**: full tool surface; `search_solved_issues`
  scoped server-side to #helpdesk.
- **C -- oracle, full corpus**: identical tool surface; retrieval spans all
  four channels.

A vs B/C = the product headline; B vs C = the dilution question (operator's
core interest) cleanly isolated. Scoping is per-run server-side config, never
an agent-visible parameter (D-intent recorded in Verified facts). Finer cells
(e.g. minus-#dev-corner) deliberately rejected for now: if B vs C shows a real
gap, localizing the source channel is a cheap follow-up on the same harness.

### D3 -- JSON-first run records + explorer artifact (locked 2026-08-06; front-runs Pass 4)

The harness emits one JSON record per (question x condition): thread_id, domain,
condition, question text, tool calls made, final answer, ground-truth fix,
grade (verdict + grader + spot-check flag). Exact field wiring is arc-plan's.
The operator's browsing surface is a single-file HTML artifact ("Eval
Explorer"): Demand-map tab (June topic map, browsable to cluster level --
SHIPPED 2026-08-06, artifact 998c2f4e..., source committed at
`apps/qw-oracle/eval/sim-explorer.html`, final home arc-plan's call) and a
Runs tab that stays dark until fed run records. Rationale: grading needs
structured records anyway, so the viewer costs only a projection; the map view
doubles as the operator's reference for future test/note targeting.

### D4 -- Stratification: frozen June frame, proportional with floor (locked 2026-08-06)

Sampling frame = the June map's `faq-clusters.json` thread IDs, frozen
(intersected with solved status; no re-cluster -- preserves comparability with
the June analysis and domain-taxonomy work for a ~2% coverage cost; helpdesk
grew only ~150 threads since). Allocation across the ~24 domains is
**proportional to demand with a per-domain floor** (~8-10 threads minimum for
tier-1 domains): the aggregate stays interpretable as "share of real player
traffic handled" while no important domain rides on two data points. NOISE
cluster threads excluded from sampling. Even-per-domain allocation rejected:
it serves gap-hunting but destroys the headline number's meaning; gap
resolution is recovered via the floor + per-domain reporting.

### D5 -- Sample size: N ~= 500 (locked 2026-08-06)

~500 sampled threads (from the 3,324 solved non-noise pool), proportional with
the D4 floor: ~1,500 answering passes across the three cells; headline CI
~ +/-4%; 40-65 questions in each large tier-1 domain. Sizing constraint is NOT
DeepSeek cost (single-digit dollars at this scale) but the human/Claude-side
spot-check and browsing burden, which scales linearly with N. Targeted
follow-up runs on the same harness are the answer to "interesting domain,
want more data" -- not a bigger N up front.

**Pass 1 (Sampling) CLOSED 2026-08-06.** D1-D5 locked; carry-forwards below.

## Carry-forwards

- **#quakeworld as secondary question population** -- optional, decided after
  the pilot (D1). Track: later pass / post-pilot amendment.
- **Era/staleness of known fixes** -- old threads' human-verified fix may be
  outdated at today's dev-head (the oracle may give the *currently correct*
  answer and "miss" the 2019 fix). Not a sampling axis; record thread era in
  run records and handle staleness in the rubric. Track: Pass 2.

(none yet)
