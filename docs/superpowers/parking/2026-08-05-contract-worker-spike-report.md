# Contract-worker LLM spike — report

**Session date:** 2026-08-05 · **Brief:** [2026-08-05-contract-worker-llm-spike-prompt.md](2026-08-05-contract-worker-llm-spike-prompt.md)

## 1. Verdict: **PENDING — HALTED AT OPERATOR KEY**

Everything keyless is built, typechecked, and verified. The one blocking step is the
operator prerequisite: no provider account/key exists yet
(`~/.secrets/llm-contract-worker.env` is missing). The spike fence run, the Track 1
smoke test, and the PASS/FAIL verdict are each one command away once the key lands.

**Operator TODO (the only blocking step):**

1. Create a DeepSeek platform account at https://platform.deepseek.com (prepaid
   top-up — smallest tier is fine; the whole spike costs cents, the full Arc A
   backfill single-digit dollars, see §3).
2. Create an API key, then on the cockpit:
   ```
   install -m 600 /dev/null ~/.secrets/llm-contract-worker.env
   echo 'DEEPSEEK_API_KEY=sk-...' > ~/.secrets/llm-contract-worker.env
   ```
3. Say "key is in place" in a fresh session pointed at this report — §6 is the
   resume script.

### Evidence table (to be filled at verdict time)

| metric | Sonnet golden baseline | candidate (deepseek-v4-flash) | gate |
|---|---|---|---|
| index-hallucination | 0% (all 9 loaded batches) | — | **must be 0%** |
| coverage | 99.05–99.96% band | — | ~99% band |
| pairwise boundary agreement vs golden | 100% (self-diff sanity) | — | qualitative, spot-read |
| resolution-label agreement (Jaccard≥0.5-matched) | 100% (self-diff sanity) | — | qualitative |
| spot-read of ~10 disagreements | n/a | — | who partitioned better? |

Scoring machinery is already validated end-to-end: exporting the golden DB partition
as a candidate and diffing it against itself scores 100/100/100 with the confusion
diagonal exactly matching the ledger's 185 solved / 85 unresolved / 102 informational.

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
- **Measured spike volume:** 61 chunks, 777KB chunk payload ≈ **~200K input tokens**
  (+~50K output). Spike cost at flash: **~$0.04–0.05** — far under the brief's
  under-a-dollar bar.
- **Full-backfill projection** at the brief's planning figure (~1,400 chunks ×
  ~30K tokens ≈ 40M input + ~3M output): flash ≈ **$6.5** off-peak (~$13 peak);
  pro ≈ $20. Note #helpdesk chunks measured only ~3.3K tokens avg — the 30K figure is
  dominated by dense #quakeworld years, so treat $6.5 as the ceiling-ish estimate and
  refine from the spike's measured per-token dashboard numbers.
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
  Fallback stands: if the first smoke test 401s, swap to `ANTHROPIC_API_KEY` per
  DeepSeek's own doc (set only one — both together sends both auth headers).
- **`CLAUDE_CONFIG_DIR` scope, empirically probed on 2.1.222:** `.claude.json` app
  state, `sessions/`, `projects/` transcripts, `backups/` all land in the isolated
  dir, and the probe session reported "Not logged in" — proof the Max credentials
  are not read. Docs scope the var to credentials only, so ASSUME global
  `~/.claude/CLAUDE.md`, `settings.json`, hooks, and skills are still shared: the
  contract worker inherits the operator's global instructions/hooks. Acceptable for
  the intended workload; revisit with `--settings` if a fully bare profile is ever
  needed.

**Smoke test (pending key, three checks per the brief):**
1. `claude-contract` → trivial prompt → ask it to name its actual model
   (expect a DeepSeek identity, not Claude).
2. DeepSeek dashboard shows the tokens billed there.
3. A fresh normal `claude` afterwards still runs on the Max login untouched.

**Usage doctrine:** simple, verifiable, high-volume tasks (bulk classification,
mechanical transforms with machine-checkable outputs). Frontier judgment — design,
review, anything unverified — stays on real Claude. The quality gates stay
model-agnostic and downstream (fence-stats, idempotency probes, golden diffs).

## 5. Track 2 — spike protocol (one command per step once keyed)

Chunks are already prepped. From `apps/qw-oracle/`:

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
  (usage, wall-clock, model) rides along ignored by the loader.
- CONC=10 is the parity default; DeepSeek flash allows 2,500 concurrent, so Arc A can
  step CONC up aggressively (50–100) on clean runs — the constraint was always the
  Anthropic shared throttle, which no longer applies.
- No Max quota is consumed; the "1–2 batches per session" pacing rule dissolves. The
  remaining ~2,700-chunk full corpus is a single-digit-dollar afternoon, not a
  multi-week quota campaign.
- Keep per-batch verification exactly as the ledger does it (stats gate → load →
  idempotent re-run → retrieval probe).

## 7. Session log / provenance

- Golden batch: #helpdesk-2026 — 373 threads / 5,398 junction rows / 61 chunks,
  ledger + DB cross-verified this session (dev twin, read-only).
- Diff metrics: pairwise Rand index on message pairs common to both partitions;
  exact-thread match (Jaccard=1); resolution agreement on Jaccard≥0.5-matched pairs;
  self-diff scored 100/100/100 (see §1).
- `fence-external.ts` typechecked via project `tsc --noEmit` (clean).
- Claude Code env vars verified from the installed 2.1.222 binary, not from memory.
- DeepSeek endpoint/model/pricing facts fetched live 2026-08-05 (links in §3).
