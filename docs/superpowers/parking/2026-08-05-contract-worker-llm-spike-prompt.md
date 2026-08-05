# Side-project spike: outside "contract worker" LLM + cheap-fencer verdict

**You are a side-project session in the quakeworld monorepo.** Your mission has two
tracks: (1) establish the reusable **contract-worker capability** -- driving cheap
non-Anthropic models from this environment for high-token simple tasks; (2) deliver
the **cheap-fencer spike verdict** that gates Arc A Phase 2 (see context). You run as
NORMAL Claude on the Max login; the cheap model is the workforce you set up and
evaluate, not the horse you ride. Report back per the return contract at the bottom.

Date anchor: authored 2026-08-05. Verify anything time-sensitive (endpoints, model
names, pricing) against official provider docs at execution time -- do not trust this
file's examples blindly; they are from training-era knowledge and marked VERIFY.

## Why this exists (context, read first)

- **Arc A (L2 corpus currency)** -- `docs/superpowers/parking/2026-08-04-oracle-web-direction.md`
  -- needs ~15 backfill batches + 2026 re-runs + 1 probe year fenced: **~1,400 chunks
  x ~30K tokens = ~40M tokens** of chatlog analysis. Operator verdict: precious Max
  quota should not pay for this; a DeepSeek-class model at pennies-per-million should.
- **Fencing is the ideal outsource shape**: each fence call is ONE-SHOT, no tools --
  prompt in, strict JSON out (`{abstained, threads[{topic_label, member_indices,
  resolution_status}]}`). The prompt + schema live in
  `apps/qw-oracle/scripts/load-chat/wf-backfill-fence.js` (keep the base prompt
  BYTE-IDENTICAL -- it is calibration-anchored). Quality gates are model-agnostic and
  already built: `fence-stats.ts` (index-hallucination, coverage), the loader's
  idempotency probes, and golden batches to diff against.
- The capability outlives Arc A: buckets-E enrichment (8.6K threads x bucket labels),
  future L2 mining, contribute-back triage -- same bulk-classification shape.
- Operator reference (was 429-walled on 2026-08-05, retry):
  https://www.morphllm.com/use-different-llm-claude-code

## Operator prerequisite (blocks both tracks)

A provider account + API key. **Recommendation: DeepSeek direct** -- one key serves
both tracks (native Anthropic-compatible endpoint for Track 1 + cheap OpenAI-format
API for Track 2), pricing historically among the lowest. Alternates with native
Anthropic-compatible endpoints: Moonshot/Kimi, Z.ai/GLM. OpenRouter = OpenAI-format
only (fine for Track 2, needs a translation proxy for Track 1) -- only worth it if
multi-model A/B is wanted.

Key handling (HARD RULES):
- Key lives in `~/.secrets/llm-contract-worker.env` (chmod 600), shape:
  `DEEPSEEK_API_KEY=...` (or provider equivalent). NEVER in the repo, NEVER committed,
  never echoed into transcripts.
- Prefer a prepaid/capped account so the blast radius of any mistake is the top-up.

## Track 1 -- contract-worker Claude Code terminal

Goal: a wrapper that launches Claude Code against the cheap provider's
**Anthropic-compatible endpoint**, without ever touching the normal Max setup.

Mechanism (verify current var names via `claude --help` / official Claude Code docs /
the claude-code-guide agent):
- `ANTHROPIC_BASE_URL=<provider anthropic-compatible endpoint>`
  (VERIFY; training-era example: DeepSeek `https://api.deepseek.com/anthropic`)
- `ANTHROPIC_AUTH_TOKEN=<provider key>`
- Model mapping so Claude Code's internal sonnet/haiku requests resolve to provider
  models (VERIFY current names -- training-era vars: `ANTHROPIC_MODEL`,
  `ANTHROPIC_SMALL_FAST_MODEL`, newer `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL`).
- Optionally `CLAUDE_CONFIG_DIR=~/.claude-contract` to fully isolate config/state.

SAFETY RAILS (non-negotiable):
- Env vars are set PER-INVOCATION inside a wrapper script (suggest
  `~/bin/claude-contract`), sourcing the secrets file at call time. NEVER export them
  in `.bashrc`/`.profile`/dotfiles -- a global `ANTHROPIC_BASE_URL` hijacks every
  normal `claude` session and breaks the Max login.
- Do not modify `~/.claude/` auth state. Do not run `/login`/`/logout` in the wrapper
  session.
- Smoke test = three checks: (a) wrapper session answers a trivial prompt and names
  its actual model; (b) provider dashboard shows the tokens billed there; (c) a fresh
  NORMAL `claude` afterwards still runs on the Max login untouched.

Deliverable: the wrapper script + a short usage note (what it is for: simple,
verifiable, high-volume tasks; frontier judgment stays on real Claude).

## Track 2 -- fence adapter + golden-batch spike (the Arc A gate)

Goal: `apps/qw-oracle/scripts/load-chat/fence-external.ts` (Bun) -- a plain API
batch fencer, no Claude Code involved:

1. Reads the same per-chunk files the Workflow fencer reads (chunk prep via
   `backfill-batch.ts` -- read its `--help`/source for the prep subcommand).
2. Builds the fence prompt BYTE-IDENTICAL to `wf-backfill-fence.js` (base prompt +
   the withResolution passenger appended), inlining the chunk content.
3. Calls the provider's chat-completions API with the JSON schema enforced
   (structured output / json mode; validate every response against `FENCE_SCHEMA`
   semantics and treat validation failure as a retryable failure).
4. Concurrency + paced waves + a retry pass with HONEST success/fail counts --
   port the runGently discipline from `wf-backfill-fence.js`; concurrency is yours
   to set (start ~10, step up on clean runs).
5. Writes fence-output JSON in the exact shape the existing loader consumes
   (mirror the wf path's output files; diff shapes against a cached golden output
   if present in `scratch/backfill/`).

**Spike protocol (fixed -- this is the gate Arc A cites):**
- Golden batch: **#helpdesk 2026** (61 chunks, already Claude-fenced + loaded).
  Re-fence it with the candidate model via `fence-external.ts`.
- Score: (a) `fence-stats.ts` on the candidate output -- **index-hallucination must
  be 0%**, coverage in the ~99% band the ledger baselines show; (b) diff vs the
  golden fencing -- thread-boundary agreement + resolution-label agreement, with a
  qualitative spot-read of ~10 disagreements (who partitioned better?); (c) record
  tokens + dollars from the provider dashboard.
- Cost of the whole spike should be well under a dollar (~2M tokens); if it is
  trending past a few dollars, stop and report -- something is wrong.
- **Verdict: PASS -> Arc A Phase 2 runs on `fence-external.ts`. FAIL -> the proven
  Sonnet Workflow path stays, no harm done.** Marginal -> report the evidence,
  operator decides.

BOUNDARIES:
- Dev twin DB is READ-ONLY for you (golden thread data, baselines). **No loads, no
  DB writes** -- loading candidate output is Arc A's job, after the verdict.
- No prod anything. No changes to `wf-backfill-fence.js` or the loader.
- Fence outputs + diff artifacts go under `apps/qw-oracle/scripts/calibration/scratch/`
  or the load-chat `scratch/` pattern (gitignored), NOT committed.
- Commit only: `fence-external.ts` (+ test if warranted), the wrapper script's repo-
  side docs if any, and your report.

## Return contract

Write `docs/superpowers/parking/2026-08-05-contract-worker-spike-report.md` with:
1. **Verdict** (PASS / FAIL / MARGINAL) + the evidence table (hallucination %,
   coverage %, boundary agreement, label agreement, spot-read notes).
2. **Costs**: tokens + dollars for the spike; projected cost for the full ~1,400-chunk
   backfill at the measured rate.
3. **Provider/model actually used** (+ endpoints verified, with doc links).
4. **Track 1 status**: wrapper path, smoke-test results, any caveats.
5. **What Arc A should fold in** (exact command shapes for Phase 2 if PASS).
Then: update the HANDOVER sidequest line for this spike (one line, status + report
pointer), commit everything per repo git conventions (one-liner message, push).

If the operator has not yet created the provider key when you start: do Track 1/2
build work that needs no key (wrapper skeleton, adapter code, chunk-prep dry run),
then HALT at the first key-needing step and say exactly what to create where.
