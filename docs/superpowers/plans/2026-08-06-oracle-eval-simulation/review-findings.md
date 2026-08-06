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
result to a committed manifest, and never re-resolves.

**Root cause CLOSED 2026-08-06 (same sweep, follow-up probe) -- it was the
monthly harvest, and it will happen again.** Per-year `id` blocks for
`#helpdesk` are contiguous and were allocated in year order by the June
backfill: 2020 occupies 6705..7419, 2022 8875..9889, 2021 11236..12581, 2023
13802..15021, 2024 16047..17071, 2025 18001..18929. The gap band 7420..7792
sits immediately after the 2020 block and is now **entirely empty** -- zero
rows in any channel. Meanwhile 2026's `#helpdesk` threads live at
**86063..87037** (522 rows), a completely different high range. So the old
current-year block was deleted and re-inserted with fresh identity IDs by the
August re-fence. Arithmetic checks out: the vacated band holds 373 IDs, of
which 270 were FAQ-candidates present in the frozen frame (the other 103 were
`informational`, which the June clustering excluded by construction).

Two consequences, both now certain rather than suspected. (1) F3 is not a
hypothetical -- the harvest has ALREADY eaten a chunk of this arc's sampling
frame once, and the next one is scheduled for 2026-09-06. (2) F2's "zero 2026
threads" is not a defect to fix but a structural property: a frozen June frame
plus a current-year re-fence can never retain current-year threads. Recovering
2026 coverage would require re-clustering, which spec D4 explicitly rejects.
The eval therefore measures the oracle against 2020-2025 questions, and the
findings doc must say so plainly rather than let the reader assume currency.

**F2 (spec carry-forward, now quantified) -- the solved pool contains zero 2026
threads; the era spread is 2020-2025.** Surfaced: same probe. Evidence: era
histogram over the 3,164-thread live pool by `date_range_start` year -- 2020:365,
2021:710, 2022:523, 2023:615, 2024:511, 2025:440, 2026:0. Disposition: this is
the spec's era/staleness carry-forward made concrete -- the eval grades answers
against fixes that are 1 to 6 years old, and the `divergent` flag (D6) is
therefore load-bearing, not a corner case. `era` becomes a first-class record
field (E2) and a per-era cut in the findings doc. Route: Phase 1 (schema field),
Phase 8 (reporting).

**F3 (MAJOR -- operator prerequisite) -- the monthly harvest regenerates thread
IDs and would invalidate an in-flight run.** Surfaced: planning sweep, from
`.claude/calendar-checks.txt`. Evidence: the L2 corpus harvest is due
**2026-09-06** and its runbook re-fences the CURRENT YEAR's four batches;
re-fencing reassigns `chat_threads.id`, which is the mechanism behind F1.
Disposition: E4 (corpus freeze) plus a README operator prerequisite -- hold the
harvest or push the calendar date until Phase 7's last answering pass.

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
Disposition: Phase 5 ships the generator alongside the Runs tab (E13) and
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

---

## Findings from Phase 1 drafting (2026-08-06)

**F17 (MAJOR -- settles REVIEW-BRIEF R4) -- channel-scoped vector retrieval
silently starves, and would have read out as a fake dilution result.**
Surfaced: Phase 1 drafting, by live probe against the dev twin. Evidence:
pgvector 0.8.2 runs with `hnsw.ef_search = 40` and `hnsw.iterative_scan = off`,
and the HNSW index on `chat_threads.topic_embedding` is unfiltered -- so a
channel-scoped vector query walks the global neighbour list and then discards
everything outside the scope. Measured: with `#dev-corner` query vectors, a
`#helpdesk`-scoped `LIMIT 12` returned **1 row**; across 8 `#quakeworld`
vectors, 0-5 rows. Even with realistic `#helpdesk` query vectors it starved on
**4 of 40** (min 5, mean 11.60 of a requested 12). `SET LOCAL
hnsw.iterative_scan = strict_order` restores 12/12 on all 40 vectors, costs
~2.7 ms scoped, and is *faster* than the default unscoped (0.60 vs 1.07 ms);
verified end-to-end through postgres-js (1 row without, 12 with). Cell C's
unscoped results are byte-identical under `off` and `strict_order`, so the fix
cannot perturb the full-corpus arm.
Disposition: **fixed inside Phase 1** (its Task 2), not deferred. Left
unfixed, roughly a tenth of cell B's questions would have been answered from a
starved candidate set and the arc would have reported "helpdesk scoping hurts
quality" when the real cause was index mechanics -- a wrong headline that would
have looked entirely plausible. This is exactly the class of defect the
plan-review brief's R4 was pointed at, found before any code existed.

**F18 (minor, route to HANDOVER) -- a pre-existing type-and-runtime bug in
`eval/eval.ts` constrains this arc's tsconfig change.** Evidence:
`apps/qw-oracle/eval/eval.ts:75` reads `h.session_id` off a `ThreadHit`, a
field that does not exist (stale from the SessionHit -> ThreadHit migration);
it pushes `undefined` at runtime and is invisible only because `eval/**` sits
outside the tsconfig `include` (F13). Disposition: this arc adds
`eval/sim/**/*` to `include`, **not** `eval/**/*` -- widening further would turn
`bun run typecheck` red on a defect this arc does not own. The bug itself
routes to HANDOVER as a small followup.

**F19 (contract reading, ratified) -- E2 and E9 disagreed on record
granularity.** Evidence: E2 specifies one record per (question x condition);
E9 specifies one JSONL line per (question x condition x stage). Disposition:
resolved in favour of log-structured JSONL -- one line per stage event, each
carrying a `stage` field, with last-line-wins reconstruction; resume keys on
`(record_id, stage)`. E2's "one record" is the reconstructed logical record,
not the line count. Ledger amended so every later phase shares one reading.

**F20 (minor) -- `bun run test-call` is broken from its own package dir.**
Evidence: the script sets cwd to `serve/mcp/`, the spawned child inherits it,
and the MCP SDK's stdio transport forwards only a six-variable env allowlist
(`HOME, LOGNAME, PATH, SHELL, TERM, USER`), so the child dies on `DATABASE_URL
is not set`. It works only when invoked from `apps/qw-oracle/`. Disposition:
Phase 1's stdio probe sets `cwd` and `env` explicitly rather than copying the
broken pattern; the existing script is left alone (route to HANDOVER).

## Findings from Phase 3 drafting (2026-08-06)

Numbered F27-F31. The drafter emitted these as F23-F27 in parallel with Phase
2's identically-numbered set; renumbered here and in the phase doc (verified:
7/2/1/1/4 references moved, no collision with F1-F26).

**F27 (MAJOR -- upgrades F12 from "cheap insurance" to load-bearing) -- every
tie group in the rank derivation straddles a domain boundary, and one straddles
the NOISE boundary.** Evidence: rank is derived by sorting clusters by `size`
descending and taking `index + 1`, with no tie-break. All five tie groups
straddle: size 157 (rank 4 server-admin / ranks 5-6 hud), 119 (rank 15
server-admin / rank 16 audio), **89 (rank 31 NOISE / rank 32 linux)**, 79 (rank
35 display / rank 36 visual-world), 51 (rank 44 textures / rank 45
performance). The 89-tie is the dangerous one: a re-order there moves a cluster
across the NOISE boundary, which changes the eligible **pool size**, the
denominator of every per-domain rate, and the headline -- silently, with no
error anywhere. Disposition: the frozen manifest pins the full 48-entry
rank -> domain assignment as DATA (`frame.rank_pin`), plus SHA-256 digests of
both `faq-clusters.json` and `faq-domains-resolve.ts`, so the mapping is never
re-derived after the freeze.

**F28 (methodology -- spec amendment, operator-visible) -- D4's floor as
written is INERT at N=500.** Evidence: D4 specifies "a per-domain floor (~8-10
threads minimum for **tier-1** domains)". Computed against live counts, every
tier-1 domain's proportional quota already exceeds 12, so `floor 8 on tier-1
only` and `no floor at all` produce **byte-identical** allocations. The three
domains that actually ride near the bottom -- fonts (8), teamplay-comms (8),
spectating (8) -- are tier-2/tier-3, precisely the ones the floor was meant to
protect from riding on two data points. Disposition: extend the floor to all 24
non-NOISE domains. Costs 7 threads (1.4% of N) taken from the largest domains,
preserves D4's stated intent exactly, and makes the floor do the job it was
written for. Recorded as a dated amendment to spec D4; operator-overrulable at
intent review.

**F29 (minor) -- `thread_key` stability across a re-fence is plausible but
unproven.** Evidence: `thread_key` is `channel:version:chunk_id:thread_index`,
and `thread_index` comes from an LLM segmentation pass -- so it is not a pure
content hash, and whether it survives a re-fence is exactly the property F1
would have tested, except the 234 eaten rows are gone and the case is now
unfalsifiable. Disposition: do not rely on it alone. Every manifest row carries
`thread_id` + `thread_key` + `content_sha256`, and the re-assertion probe checks
all three.

**F30 (minor) -- ~1.8% of pool threads have no extractable key and ~2.8% leak
the fix into the question.** Evidence: running the opener/answer split over all
3,164 pool threads: fallback path 0 (0.00%), **empty `rest` 57 (1.80%)** --
single-author monologues where the asker posts their own resolution, so there
is no community answer to extract AND the question itself contains the fix --
and **89 (2.81%)** whose opening matches resolution phrasing. Disposition: the
extractor reads full `content`; rows scoring `key_quality: "none"` or flagged
`question_leaks_fix` are rejected and substituted from the same domain's frozen
order; the substitutions are recorded and the narrowed population is stated in
both the manifest and the findings doc rather than quietly absorbed.

**F31 (minor) -- the obvious content-digest SQL is wrong.** Evidence:
`encode(sha256(content::bytea),'hex')` throws `invalid input syntax for type
bytea` on real rows; the correct form is `convert_to(content,'UTF8')`, verified
to agree with TypeScript's `createHash('sha256').update(content,'utf8')` on
500/500 rows. Disposition: the working form is pinned in the phase doc. Logged
because it is exactly the class of literal that looks right, passes review, and
fails only at execution.

## Findings from Phase 2 drafting (2026-08-06)

**F23 (MAJOR) -- the forced-termination backstop leaks raw tool-call markup as
the answer unless it carries a nudge message.** Surfaced: Phase 2 drafting, by
live DeepSeek probe; reproduced 2/2. F16 left the `tool_choice: 'none'`
budget-exhausted backstop unexercised, so this phase exercised it. With a nudge
message it works cleanly (`finish_reason=stop`, 1,723 chars of prose, zero tool
calls). **Without** the nudge it also returns `finish_reason=stop` with an
empty `tool_calls` array -- every structural check a harness would make PASSES
-- but `content` is the model's internal invoke template, naming tools that
were never offered (`search_knowledge_base`, and a `bash` call running curl).
Disposition: the nudge message is load-bearing and is specified in Phase 2's
loop, AND a `LEAK_SENTINEL` (`/DSML|invoke name=/`) fails the pass regardless of
structure. Why this matters beyond tidiness: undetected, this writes garbage
into `answer`, the blind grader scores it a `miss`, and the arc reports an
ORACLE failure that was actually a harness artifact -- concentrated, by
construction, on the hardest questions, which are exactly the ones that exhaust
the loop budget. Third distinct measurement-corrupting defect found before any
code exists (see F17, and E7's `limit` amendment).

**F24 (minor) -- the MCP dispatch switch is closure-scoped, so the harness must
hand-build a name -> handler map.** Evidence: the `CallToolRequestSchema`
handler's `switch` lives inside `createServer()` and is not exported, so E6's
in-process execution cannot reuse it. Disposition: Phase 2 builds the map and
its probe asserts the map's key set equals `TOOL_NAMES` **in both directions**,
so a tool added to the server without the harness noticing fails the gate
rather than silently going unexercised.

**F25 (minor, RESOLVED -- no Phase 1 amendment needed) -- the phase-8 fixture
questions are not corpus threads.** Evidence: the 12 questions in
`eval/eval-queries.json` are retrieval queries, so `thread_id`, `thread_key`,
`domain`, `era`, and `truth` have no true values, yet Phase 1's record schema
requires them. Disposition: Phase 2 declares explicit self-identifying fixture
conventions (`p8-NN`, `phase8-fixture-NN`, `domain: 'phase8-fixture'`,
`era: 0`) rather than plausible fakes -- a fixture must never be mistakable for
a real sampled record. Checked against the landed Phase 1 doc: its validator
rejects a **non-integer** `era`, not an out-of-range one, so `era: 0` is legal
and the escalation the drafter flagged does not fire. Residual: Phase 1's
inline comment describes `era` as "2020-2025", which the coherence pass should
widen to name the 0 sentinel.

**F26 (predicted hazard, not yet observed) -- the tool-surface pin may be
computed over two different byte strings.** Evidence: Phase 1 takes the pin as
`sha256(JSON.stringify(inputSchema))` off the WIRE; Phase 2 hashes the
IMPORTED schema object. JSON-RPC transport plus the SDK's Zod parse can
legitimately re-order object keys, so a mismatch would have two possible causes
-- a real schema change, or key ordering -- and the naive reading blames the
wrong one. Disposition: Phase 2's probe prints both JSON strings on failure and
the doc names `jq -S` as the diagnostic. If ordering turns out to be the cause,
the fix is a canonical (sorted-key) pin via a dated Phase 1 amendment, NOT a
quietly relaxed assertion. Related detail: Phase 1 never named the pin file's
key, so the probe locates the single `/^[0-9a-f]{64}$/` value rather than
guessing a field name.

**F22 (minor; fixed for eval mode here, production disposition OPEN) -- the
lexical path's `catch { return [] }` protects against nothing and hides
everything.** Surfaced: Phase 1 revision 2026-08-06, by probing the catch's own
stated rationale. `lexicalCandidates` wraps its entire query in a bare catch
justified by the comment "tsquery can reject malformed queries" -- but
`websearch_to_tsquery` is forgiving by construction and threw on **none** of
seven malformed inputs (`foo & | bar`, unclosed quote, `!!!`, `:*`, `a <-> b`,
empty string, lone backslash); the full `content_tsv @@ ...` query ran clean on
the unclosed-quote case too. The catch is a `to_tsquery`-era carry-over
guarding against no known input class. With this arc's scope and exclusion
fragments living inside it, a bad `::bigint[]` cast, a malformed channel list,
or a connection fault all degrade to `[]` -- indistinguishable from "no
matches", and enough to make the obvious probe assertions ("all results are
`#helpdesk`", "the excluded id never appears") vacuously true.
Disposition: Phase 1 fixes it for eval mode only -- always log, and re-throw
**when a retrieval context is set**. That is deliberately narrower than
"re-throw on non-tsquery errors": narrowing by SQLSTATE would mean guessing
codes for errors that could not be triggered, and an unconditional re-throw
would change live MCP behaviour for a stack the concurrent oracle-web arc is
deploying right now. The ctx-gated form gets the full benefit exactly where the
measurement happens, stays symmetric across cells B and C, and leaves
production byte-identical. Whether the live server should also re-throw is a
separate call, unresolved -- route to HANDOVER if it survives the arc.

**F21 (minor, route to Phase 2) -- `TOOL_LIST` is not exported.** Evidence:
`serve/mcp/src/index.ts` declares `TOOL_LIST` as a module-local `const`. E6
requires the harness to IMPORT the tool schemas rather than hand-write them, so
this needs a one-word `export`. Importing `index.ts` is otherwise
side-effect-free -- `main()` is guarded by `import.meta.main`. Disposition:
Phase 2 adds the export as part of wiring the imported tool surface.
