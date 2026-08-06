# oracle-eval-simulation -- findings ledger

Numbered findings surfaced during planning, review, and execution. Each finding
gets a track (fix now / route to phase N / route to HANDOVER / spec amendment);
none are silently dropped. Format: **F<n> -- <title>** / surfaced-when /
evidence / disposition.

F1-F15 were surfaced by the 2026-08-06 planning verification sweep -- three
read-only explorer agents plus a first-hand read-only query against the dev
twin -- before any phase doc was drafted and before any code existed.

---

## Findings that move the spec's own numbers

**F1 (MAJOR -- spec amendment) -- the frozen June frame has already decayed;
the live sampling pool is 3,164, not 3,324.** Surfaced: planning sweep
2026-08-06, verified first-hand against the dev twin (not taken from the
subagent). Evidence: `faq-clusters.json` holds 5,028 thread IDs (48 clusters,
seed 42); excluding the 7 NOISE ranks leaves 4,456 non-noise IDs; intersecting
those against live `chat_threads` returns **4,222 present -- 234 missing
(5.3%)** -- of which **3,164 are `solved`**. The spec's D5 figure of "3,324
solved non-noise" is June arithmetic (`size - unresolved` summed over the
clusters), never a live count, and D4's "~2% coverage cost" understates the
decay by half. The missing IDs form a **contiguous band, 7420..7792**, inside a
present range of 6706..18928 -- the signature of one re-fenced batch whose
threads were regenerated with new identity IDs, not of scattered deletions.
Disposition: dated amendment to spec D4/D5 recording the live pool; N~=500 is
unaffected in substance (sampling fraction moves 15.0% -> 15.8%, CI unchanged
at ~+/-4%). Phase 3 resolves the frame against live rows **once**, freezes the
result to a committed manifest, and never re-resolves. Root cause of the
234 is a Phase 3 investigation item, not a blocker.

**F2 (spec carry-forward, now quantified) -- the solved pool contains zero 2026
threads; the era spread is 2020-2025.** Surfaced: same probe. Evidence: era
histogram over the 3,164-thread live pool by `date_range_start` year -- 2020:365,
2021:710, 2022:523, 2023:615, 2024:511, 2025:440, 2026:0. Disposition: this is
the spec's era/staleness carry-forward made concrete -- the eval grades answers
against fixes that are 1 to 6 years old, and the `divergent` flag (D6) is
therefore load-bearing, not a corner case. `era` becomes a first-class record
field (E2) and a per-era cut in the findings doc. Route: Phase 2 (field),
Phase 7 (reporting).

**F3 (MAJOR -- operator prerequisite) -- the monthly harvest regenerates thread
IDs and would invalidate an in-flight run.** Surfaced: planning sweep, from
`.claude/calendar-checks.txt`. Evidence: the L2 corpus harvest is due
**2026-09-06** and its runbook re-fences the CURRENT YEAR's four batches;
re-fencing reassigns `chat_threads.id`, which is the mechanism behind F1.
Disposition: E4 (corpus freeze) plus a README operator prerequisite -- hold the
harvest or push the calendar date until Phase 6's last answering pass.

## Findings that shape the build

**F4 -- the ancestor harness does not run on this box.** Evidence:
`scripts/calibration/faq-gate/faq-gate-retrieve.ts` imports its five tool
functions through hardcoded `/home/paradoks/projects/quakeworld/...` paths;
`/home/paradoks` does not exist on the cockpit. Six other files carry the same
WSL-era absolute paths. Disposition: the June harness is prior art to read, not
code to extend (E12). Its stale paths are a pre-existing defect outside this
arc's scope -- route to HANDOVER as a small followup.

**F5 -- there is no tool-calling prior art anywhere in the repo.** Evidence: a
repo-wide sweep for `tools:` / `tool_choice` / `tool_calls` / `function_call`
returns only the MCP server advertising its own tool list and an eval record
field naming expected tools. `fence-external.ts` is a one-shot
`response_format: json_object` call with no `tools` array and no multi-turn
loop. Disposition: the DeepSeek function-calling loop is net-new build and is
the arc's dominant technical risk -- which is why Phase 2 is a walking skeleton
that proves it before anything is sampled or spent.

**F6 (MAJOR -- parking-doc expectation overturned) -- this arc does not need,
and does not discharge, the Tailscale direct route.** Evidence: there is **no
dev MCP container** -- the dev twin is a Postgres instance only, on `devnet`;
`qw-oracle-mcp` runs against PROD Postgres and is reachable off-Cloudflare at
`http://192.168.1.205:8080` (health probe 200), but that is the prod corpus.
Meanwhile the MCP server takes `MCP_TRANSPORT=stdio` by default and
`serve/mcp/scripts/test-call.ts` already spawns it as a subprocess client. So a
dev MCP is one `bun` invocation with the twin's `DATABASE_URL`, and the
DeepSeek cells do not need MCP transport at all (E6). Disposition: the parking
doc's claim that this arc "finally gives the parked MCP Tailscale direct-route
followup its reason to get done -- fold it in" is **withdrawn**. The HANDOVER
item returns unchanged and un-discharged. Recorded here so the next sweep does
not read the arc's completion as having closed it.

**F7 -- oracle env config is process-lifetime, so per-question exclusion needs
a process boundary.** Evidence: every server env var is read into a
module-level `const` at import time, not per request; there is no
`AsyncLocalStorage`, no header inspection beyond `mcp-session-id`. Channel
scope is per-run (fine as env), but leave-one-out varies per question.
Disposition: E5's explicit retrieval-context parameter serves the in-process
harness directly; the Claude cells get one spawned server process per question
(E11). No per-request plumbing is added to the server.

**F8 -- `fanout` is hardcoded and must stay identical across B and C.**
Evidence: `search-solved-issues.ts` sets `fanout = limit * 4` (12 candidates
per path at the default `limit: 3`), applied per path before RRF fusion
(k=60). Disposition: do NOT make fanout configurable for the dilution
experiment -- the candidate-slot budget is precisely what channel scope is
being tested against. Exclusion goes in the SQL so the excluded thread does not
consume one of the 12 slots. Route: Phase 1, with an explicit probe.

**F9 -- "read-only" needs a telemetry carve-out.** Evidence: every tool call
writes a `query_log` row and an `embedding_api_log` row;
`maybeVerifyEmbeddingSpace()` writes `oracle_meta` and can `process.exit(1)` on
a failed cosine check. A ~1,500-pass run therefore writes thousands of
telemetry rows to the twin. Disposition: E3 carve-out; Phase 1 records pre-run
counts. Also a live hazard: the embedding-space verifier runs before transport
bind, so a Voyage outage can kill a spawned server at startup -- Phase 6's
per-question spawn loop must fail loudly rather than silently score a zero-tool
answer.

**F10 -- verdict vocabularies disagree across the repo.** Evidence: the
explorer's draft schema block uses lowercase `match | partial | miss`; the
existing faq-gate judge uses `NAILED | PARTIAL | WRONG`; the calibration probe
uses a pairwise win/loss judge. Disposition: spec D6 wins -- `match | partial |
miss` plus a `divergent` flag. Phase 1 pins the enum in the record schema; no
phase may reuse the faq-gate vocabulary.

**F11 -- the explorer's data is hand-embedded with no generator, and its
header numbers are already stale.** Evidence: `sim-explorer.html` carries two
inline `const` literals (`DATA`, `CONTRIB`) with no script that produces them;
`DATA` is a denormalized projection that **drops `threadIds`**, so a run record
cannot currently be traced back to its cluster; the header tiles hardcode
`5,028` / `3,610 solved` / `1,418 unresolved`, which F1 now contradicts.
Disposition: Phase 4 ships the generator alongside the Runs tab (E13) and
re-derives every header number from the frozen manifest.

**F12 -- domain rank derivation has an unguarded tie-break.**
Evidence: `loadSortedClusters()` sorts clusters by `size` descending and treats
`index + 1` as rank; size 157 occurs three times. `Array.prototype.sort` is
stable in modern engines so today's order is reproducible, but the rank -> domain
map (`R`) is keyed on that derived rank and nothing asserts it.
Disposition: Phase 3 pins the derived rank -> domain assignment into the frozen
sample manifest so the mapping is data, not a re-derivation. Cheap insurance.

**F13 -- `scripts/calibration/**` is outside the tsconfig include, so the
frozen-frame resolver is untypechecked.** Evidence: `apps/qw-oracle/tsconfig.json`
includes `scripts/load-chat/**/*` but not `scripts/calibration/**`.
Disposition: the new `eval/sim/` tree is added to `include` so the harness IS
typechecked by `bun run typecheck`. Widening the include to cover
`calibration/` is out of scope -- route to HANDOVER.

**F14 -- the faq-gate directory carries a provider-SDK ban the harness would
violate.** Evidence: its README documents a hard constraint -- Workflow
`agent()` only, no provider SDK, no API key, no outbound provider HTTP call
anywhere in that directory, enforced by a boundary probe that greps for the
import literals. Disposition: E12 -- the harness lives in `eval/sim/`, imports
the domain resolver, and writes nothing into `faq-gate/`.

**F16 (de-risks Phase 2) -- DeepSeek function calling verified live, and it
issues PARALLEL tool calls by default.** Surfaced: planning sweep 2026-08-06,
by live probe against `api.deepseek.com/chat/completions` with
`model=deepseek-v4-flash` (the house rig's `DEFAULT_MODEL`). The parking doc
asserted "DeepSeek supports function calling" without a citation; it is now
verified rather than assumed. Evidence, two probes:
- Probe 1: one `tools` array + `tool_choice: 'auto'` returned
  `finish_reason=tool_calls` with **2 tool calls in a single turn**, each with
  well-formed JSON arguments against the supplied schema. Feeding thin,
  unhelpful tool results back produced `finish_reason=tool_calls` AGAIN -- the
  agent kept searching rather than answering.
- Probe 2: same loop with a realistic grounding payload terminated **naturally
  at round 2** (`finish_reason=stop`) with an answer that used the grounding
  verbatim. Round 1 issued **3** parallel tool calls. Wall time ~6.5s for two
  turns; prompt caching active (512 cached tokens); reasoning tokens present
  even in tool-calling mode.
Disposition, all routed to Phase 2: (a) the loop MUST carry a round budget --
thin grounding provably makes the agent keep searching, so an unbounded loop
can spin on exactly the hard questions the eval most cares about; (b) the
harness must handle an ARRAY of tool calls per turn and the record's
`tool_calls` field must preserve round structure, not flatten to one call per
turn; (c) a `tool_choice: 'none'` forcing turn is the planned budget-exhausted
backstop -- **this path was NOT exercised** by either probe (both terminated
before the cap), so Phase 2 must prove it rather than assume it; (d) cost
accounting must read `prompt_cache_hit_tokens` and `reasoning_tokens`, both
present and both material (E10).

**F15 -- the house rig's resume loses everything on a crash.** Evidence:
`fence-external.ts` accumulates in memory and does a single `Bun.write` at the
end; `--resume` re-reads a *complete* prior output and fingerprint-matches it.
A mid-run crash yields nothing. Disposition: E9 -- incremental JSONL with
skip-completed resume, proven in Phase 2 by a deliberate mid-run kill. The
existing rig is not changed.
