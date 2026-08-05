# Contract-worker LLM spike — report

**Session date:** 2026-08-05 · **Brief:** [2026-08-05-contract-worker-llm-spike-prompt.md](2026-08-05-contract-worker-llm-spike-prompt.md)
**Executed same day** — key provisioned by David over a host tty ~11:06, verdict run completed ~12:00.

## 1. Verdict: **PASS** — Arc A Phase 2 runs on `fence-external.ts`

Both hard gates passed at-or-above the golden batch's own level, the spot-read found
zero incoherent candidate threads, and the two real findings (below) are engineered
around in committed code, not open risks. Total spike cost: ~$0.25–0.30 (operator
dashboard confirms the final digit).

### Evidence table

| metric | Sonnet golden baseline | candidate (v4-flash + pro escalation) | gate | result |
|---|---|---|---|---|
| index-hallucination | 0% (all 9 loaded batches) | **0%** (5,400 indices, 0 OOB) | **must be 0%** | **PASS** |
| coverage | 99.05–99.96% band | **100%** (better than golden's own 99.96%) | ~99% band | **PASS** |
| threads / abstains | 373 / 0 | 363 / 0 | — | comparable granularity |
| pairwise boundary agreement | (self-diff sanity: 100%) | 79.9% vs the single golden realization | spot-read | see below |
| exact-thread match | — | 68.3% of candidate threads set-identical to a golden thread | — | — |
| resolution-label agreement | (golden 185/85/102/1) | 80.9% on Jaccard≥0.5-matched pairs; candidate 201/81/70/11 — mildly solved-leaning, confusion roughly symmetric | spot-read | acceptable |
| spot-read of 10 worst chunks | — | golden finer/better 4, candidate better 2, ties 4; **zero incoherent candidate threads** | who partitioned better? | acceptable |

Context for the 79.9%: the golden is one realization of a fencer with documented
run-to-run variance (Sonnet itself dropped a 44-msg sub-conversation on one run of
helpdesk-041 and got it right on the next; no Sonnet-vs-Sonnet agreement baseline
was ever measured). Much of the disagreement is prompt-INTERPRETATION, not error:
the candidate splits pure noise into throwaway threads exactly as the prompt
endorses (golden lumps it), and splits banter sub-topics finer in places, coarser
in others. The scoring machinery itself was validated before the run: golden
self-diff scored 100/100/100 with the confusion diagonal matching the ledger.

### The two real findings (both engineered around, both committed)

1. **flash's reasoning diverges on the 1500-msg cap-forced chunk** — 4/4 attempts
   failed across every config (JSON mode: empty content at `finish=stop`; no JSON
   mode: pure reasoning to the 32K ceiling; `reasoning_effort: low`: same
   ceiling-death — the effort knob does not bound it). `deepseek-v4-pro` converged
   (schema-valid on 1 of first 3 attempts, retries handle the rest).
   **Fix shipped:** `forced: true` chunks route to pro FIRST (`forcedRouted` in
   meta), and any chunk the primary model fails twice escalates to pro
   automatically. `--no-fallback` / `--fallback-model` override.
2. **flash under-splits long multi-topic sagas** — the one substantive quality gap
   (helpdesk-2026-017: golden partitioned a 122-msg voice-recording saga into 6
   retrieval-sized sub-threads; flash produced one 103-msg mega-thread). Coarser
   threads remain topically coherent and fully covered — retrieval still finds the
   content, at somewhat lower thread precision. Accepted tradeoff at this price
   point; revisit only if Phase D retrieval calibration shows thread-size hurting
   match quality.

Also observed: ~1 in 30 responses fails strict schema validation on a first attempt
(enum near-misses like `"unsolved"`, invalid JSON) — the runGently retry pass
cleared all but the forced chunk within the run. 11 threads carry no
resolution_status (golden had 1); the field is schema-optional.

## 2. What was built (all committed / in place)

| artifact | where | state |
|---|---|---|
| `fence-external.ts` (fence + diff subcommands) | `apps/qw-oracle/scripts/load-chat/` | committed; `tsc --noEmit` clean; key-missing halt verified |
| `claude-contract` wrapper | `~/bin/claude-contract` (on PATH at next login) | executable; syntax-checked; key-missing halt verified; NOT in repo (host-local by design) |
| `~/.claude-contract/` isolated config dir | home dir | created, empty until first run |
| chunk prep for golden batch | `scripts/calibration/scratch/backfill/helpdesk-2026/` (gitignored) | 61 chunks + manifest, max 215.8KB < 256KB cap |
| golden-as-candidate + self-diff artifacts | same scratch dir (gitignored) | validation artifacts, reproducible |

**Corpus-unchanged verification:** `backfill-batch.ts count "#helpdesk" 2026` returns
5,400 msgs / 61 chunks / 1 forced — byte-exact match to the June ledger entry, so the
deterministic 12h/1500 chunking reproduces the golden batch's chunk boundaries
exactly. The June fence-output files did NOT survive the cockpit migration (scratch
was workstation-local), but the golden fencing is fully recoverable from the dev twin
(373 `fence-sonnet-v2` threads; 5,398 junction rows mapped to chunk idx with **0
unmapped**). The diff subcommand reconstructs it read-only on every run — no cached
files needed.

**Design note (prompt byte-identity):** the base fence prompt + the withResolution
passenger in `fence-external.ts` are byte-identical copies of the
`wf-backfill-fence.js` strings (calibration-anchored). The external model has no Read
tool, so the chunk JSON is inlined *after* the untouched base prompt with a short
transport note. Strict schema validation (additionalProperties/enum/required parity
with `FENCE_SCHEMA`) treats violations as retryable failures; the runGently discipline
(CONC=10 waves, 500ms pause, one 8s-recovery retry pass, honest fail counts) is ported
verbatim.

## 3. Provider / model / costs (verified against live docs 2026-08-05)

- **Anthropic-compatible endpoint (Track 1):** `https://api.deepseek.com/anthropic` —
  https://api-docs.deepseek.com/guides/anthropic_api
- **OpenAI-format endpoint (Track 2):** `https://api.deepseek.com/chat/completions` —
  https://api-docs.deepseek.com/api/create-chat-completion (confirmed:
  `response_format: {type:"json_object"}`, `max_tokens`, usage carries
  `prompt_cache_hit_tokens`/`prompt_cache_miss_tokens`)
- **Current models (V4 generation — training-era `deepseek-chat`/`reasoner` names are
  gone):** `deepseek-v4-flash` (candidate; sonnet-tier mapping, concurrency limit
  2,500) and `deepseek-v4-pro` (opus-tier mapping, concurrency 500).
- **Pricing** (https://api-docs.deepseek.com/quick_start/pricing, per 1M tokens):
  flash $0.14 in (cache-miss) / $0.0028 (cache-hit) / $0.28 out; pro $0.435 / $0.87.
  **Peak-hour 2× surcharge announced** (09:00–12:00 + 14:00–18:00 Beijing = 03:00–06:00
  + 08:00–12:00 CEST; effective date TBD) — schedule bulk runs outside those windows.
- **Measured spike (actuals, 2026-08-05):** batch envelope: 263,572 prompt +
  405,488 completion tokens — **93% of completion was reasoning** (378,963), the
  dominant cost driver; the thread-JSON itself is tiny. Wall 15.9 min at CONC=10.
  Plus ~5 diagnostic probes on the forced chunk (mostly cache-hit input). All-in
  spike ≈ **$0.25–0.30** — under the brief's bar. Dashboard cross-check at 80K
  tokens read $0.01, i.e. billed == advertised.
- **Full-backfill projection from measured rates** (36.6K in + 71.4K out per 1,000
  msgs on #helpdesk-shaped traffic): remaining corpus ≈ 574K msgs → ~21M in + ~41M
  out → **≈ $15 flash off-peak** (~$29 if run entirely in the announced peak
  window), **plus up to ~$13 of pro escalations** if all ~135 remaining forced
  chunks route to pro (~$0.10 each incl. retries) → **≈ $25–30 all-in ceiling**.
  Reasoning-heavy output is why this exceeds the brief's naive $6.5 input-driven
  estimate; still trivial vs any Max-quota accounting.
- Operator reference https://www.morphllm.com/use-different-llm-claude-code remains
  429-walled (retried direct + via Jina 2026-08-05); superseded by the official
  DeepSeek doc + local binary verification above — nothing left to extract from it.

## 4. Track 1 — contract-worker terminal (built, smoke test pending key)

`~/bin/claude-contract` execs `claude` with per-invocation env (nothing exported to
the calling shell, nothing in dotfiles): `ANTHROPIC_BASE_URL` →
`https://api.deepseek.com/anthropic`, `ANTHROPIC_AUTH_TOKEN` → the DeepSeek key
(sourced from `~/.secrets/llm-contract-worker.env` at call time), model-tier mapping
opus/fable→`deepseek-v4-pro`, sonnet/haiku/subagents→`deepseek-v4-flash`, and
`CLAUDE_CONFIG_DIR=$HOME/.claude-contract` for full state isolation, plus
`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`, `DISABLE_TELEMETRY=1`,
`DISABLE_AUTOUPDATER=1`.

Every var name was verified against the **installed binary** (`claude` 2.1.222,
`strings` scan 2026-08-05): `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` /
`ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` / `ANTHROPIC_SMALL_FAST_MODEL` /
`ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU,FABLE}_MODEL` / `CLAUDE_CODE_SUBAGENT_MODEL` /
`CLAUDE_CONFIG_DIR` all present — and cross-checked against official docs
(code.claude.com/docs/en/env-vars + /authentication, via a claude-code-guide agent,
2026-08-05):

- **Auth precedence:** cloud vars → `ANTHROPIC_AUTH_TOKEN` (Bearer; the documented
  gateway/proxy path) → `ANTHROPIC_API_KEY` (X-Api-Key) → `apiKeyHelper` → OAuth.
  The wrapper's `AUTH_TOKEN` outranks everything below it, so there is no approval
  prompt and the Max OAuth is never consulted. Env-var auth is strictly
  process-scoped — other sessions on the OAuth login are unaffected by design.
  Fallback stands: if the first smoke test 401s, swap the var *name* to
  `ANTHROPIC_API_KEY` per DeepSeek's own doc — **still carrying the DeepSeek key**
  (set only one; both together sends both auth headers). The `ANTHROPIC_*` prefix
  is Claude Code plumbing vocabulary, not an Anthropic account: with
  `ANTHROPIC_BASE_URL` pointed at DeepSeek, both vars deliver the DeepSeek key to
  DeepSeek and differ only in which HTTP header it rides in (Bearer vs X-Api-Key).
  No Anthropic API key exists or is billed anywhere in this setup.
- **`CLAUDE_CONFIG_DIR` scope, empirically probed on 2.1.222:** `.claude.json` app
  state, `sessions/`, `projects/` transcripts, `backups/` all land in the isolated
  dir, and the probe session reported "Not logged in" — proof the Max credentials
  are not read. Docs scope the var to credentials only, so ASSUME global
  `~/.claude/CLAUDE.md`, `settings.json`, hooks, and skills are still shared: the
  contract worker inherits the operator's global instructions/hooks. Acceptable for
  the intended workload; revisit with `--settings` if a fully bare profile is ever
  needed.

**Smoke test: ALL THREE PASS (2026-08-05):**
1. `claude-contract -p` answered `deepseek-v4-flash` in 2.9s (isolated config dir
   showed its own fresh trust state — the repo allowlist prompts once on first
   interactive use, expected).
2. DeepSeek dashboard showed the tokens + dollars billed there (operator-verified
   screenshot: $0.01 / 79,988 tokens at that point).
3. Normal `claude -p` immediately after: "Claude Fable 5 … on your Claude Max
   subscription (OAuth) — no API key configured." Max login untouched.

**Usage doctrine:** simple, verifiable, high-volume tasks (bulk classification,
mechanical transforms with machine-checkable outputs). Frontier judgment — design,
review, anything unverified — stays on real Claude. The quality gates stay
model-agnostic and downstream (fence-stats, idempotency probes, golden diffs).

## 5. Track 2 — spike protocol (EXECUTED 2026-08-05; commands remain the Arc A reference shapes)

From `apps/qw-oracle/`:

```bash
# 1. Re-fence the golden batch with the candidate model (writes to gitignored scratch)
bun scripts/load-chat/fence-external.ts fence "#helpdesk" 2026
#    -> scripts/calibration/scratch/backfill/helpdesk-2026/fence-external-deepseek-v4-flash.json
#    (options: --model deepseek-v4-pro | --conc N | --no-resolution)

# 2. Hard gates: index-hallucination MUST be 0%, coverage in the ~99% band
bun scripts/load-chat/fence-stats.ts "#helpdesk" 2026 \
  scripts/calibration/scratch/backfill/helpdesk-2026/fence-external-deepseek-v4-flash.json

# 3. Golden diff: boundary agreement + resolution-label agreement + spot-read feed
bun scripts/load-chat/fence-external.ts diff "#helpdesk" 2026 \
  scripts/calibration/scratch/backfill/helpdesk-2026/fence-external-deepseek-v4-flash.json
#    -> full report incl. 10 lowest-agreement chunks side-by-side: fence-external-diff.json
```

Then: spot-read the 10 lowest-agreement chunks (who partitioned better?), record
tokens+dollars from the provider dashboard, fill §1's table, declare
**PASS / FAIL / MARGINAL**. If cost trends past a few dollars, stop — something is
wrong (expected: cents).

Boundaries honored: dev twin touched by SELECTs only (`fence` never opens the DB at
all; `diff` is read-only), no prod, no changes to `wf-backfill-fence.js` or the
loader, all artifacts gitignored.

## 6. What Arc A should fold in (if PASS)

Per batch, replacing the Workflow fence step — everything else (prep, stats, load,
idempotency re-run) unchanged:

```bash
bun scripts/load-chat/backfill-batch.ts prep "<channel>" <year>
bun scripts/load-chat/fence-external.ts fence "<channel>" <year>          # was: Workflow wf-backfill-fence.js
bun scripts/load-chat/fence-stats.ts "<channel>" <year> <fenceOutput>     # gate: 0% halluc, ~99% coverage
bun scripts/load-chat/backfill-batch.ts load "<channel>" <year> <fenceOutput>
```

- The fence-output envelope (`{fenced:[...]}`) is loader-compatible as-is; `meta`
  (usage, wall-clock, model, forcedRouted, escalated) rides along ignored by the
  loader. **#helpdesk-2026 does NOT need re-loading** — the golden stays; the spike
  output is evidence, not data.
- Forced-chunk routing + failure escalation to `deepseek-v4-pro` are ON by default
  (spike findings); `--no-fallback` / `--fallback-model M` to override.
- CONC=10 is the parity default; flash allows 2,500 concurrent, so Arc A can step
  CONC up aggressively (50–100) on clean runs — the constraint was always the
  Anthropic shared throttle, which no longer applies. At CONC=10 the remaining
  corpus is ~12h of wall-clock; at CONC=50 it's an evening.
- Schedule bulk runs OFF the announced 2× peak window (03:00–06:00 + 08:00–12:00
  CEST) once it takes effect.
- No Max quota is consumed; the "1–2 batches per session" pacing rule dissolves.
  Expect ≈ $25–30 all-in for the full remaining corpus (measured-rate projection,
  §3).
- Keep per-batch verification exactly as the ledger does it (stats gate → load →
  idempotent re-run → retrieval probe). The stats gate is what caught everything
  in this spike; it stays load-bearing.

## 7. Session log / provenance

- Golden batch: #helpdesk-2026 — 373 threads / 5,398 junction rows / 61 chunks,
  ledger + DB cross-verified this session (dev twin, read-only).
- Diff metrics: pairwise Rand index on message pairs common to both partitions;
  exact-thread match (Jaccard=1); resolution agreement on Jaccard≥0.5-matched pairs;
  self-diff scored 100/100/100 (see §1).
- `fence-external.ts` typechecked via project `tsc --noEmit` (clean).
- Claude Code env vars verified from the installed 2.1.222 binary, not from memory.
- DeepSeek endpoint/model/pricing facts fetched live 2026-08-05 (links in §3).
- Verdict-run artifacts (all gitignored under the batch scratch dir):
  `fence-external-deepseek-v4-flash.json` (61/61, meta carries usage + splice note),
  `fence-external-diff.json` (full metrics + 10 side-by-side spot-reads),
  `probe-019-*.json` (the forced-chunk failure/rescue raw responses).
- Chunk-019 escalation history: flash in-run 2× invalid → probe empty-at-stop
  (JSON mode) → probe ceiling-death (no JSON mode) → probe ceiling-death
  (`reasoning_effort: low`) → pro attempt 1 valid-but-off-enum (`"unsolved"`) →
  schema-gated re-run: attempts 1–2 ceiling-death, attempt 3 VALID (25 threads).
  The strict validator caught the off-enum label — hand-editing model output was
  rejected on principle; retry-until-valid mirrors the Workflow harness semantics.
