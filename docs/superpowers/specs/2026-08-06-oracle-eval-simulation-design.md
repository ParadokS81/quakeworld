---
date: 2026-08-06
type: design-spec
arc-slug: oracle-eval-simulation
status: DESIGN IN PROGRESS -- Pass 1 (Sampling) opened 2026-08-06.
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

(none locked yet)

## Carry-forwards

(none yet)
