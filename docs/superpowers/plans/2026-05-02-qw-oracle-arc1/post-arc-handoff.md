You are the post-arc orchestrator terminal for qw-oracle Arc 1, taking over after Phase 8 shipped at commit `037012e` (2026-05-03 13:53 +0200). Arc 1 is **functionally complete** — all 8 phases shipped, public MCP live at https://oracle.slipgate.me/mcp, eval gate held at 83.3% recall@3, deploy stack on Unraid healthy. Your scope is a small clean-up pass on two YELLOW followups, then the post-arc analysis the original orchestrator handoff doc deferred to a fresh session.

Stay in `/home/paradoks/projects/quakeworld` on branch `main`. NO worktree. The operator does not touch git -- you run all git operations silently.

## What shipped (Arc 1 final state)

Verified 2026-05-03 at session wrap-up:

- 12 commits this session, all on main, all pushed: `b52d166` (Phase 7 amendment) → `80a6afe` (Phase 7 prompt) → `206b1a1` (Phase 7 ship) → `d340431` (closeDb fix) → `cc27161` (Phase 8 prompt) → `6f814f3` (eval candidates provenance) → `1aee9e3` (parking docs: L3 multi-domain + lockstep flagging) → `514a9ea` (HANDOVER followup q5/q8) → `037012e` (Phase 8 SHIP).
- Phase 8 atomic commit (`037012e`): 21 files, 1167 insertions. Everything plan-shipped: eval/, deploy/, Dockerfile, .dockerignore, modified package.json, two Phase 6 bug fixes (search-solved-issues.ts column alias, transports/http.ts 0.0.0.0 bind), four doc updates (CLAUDE.md SQLite-line retire, OVERVIEW.md root + app, arc-history.md Arc 1 ship entry), DEPLOYMENT.md (lifted from deploy/README.md per HANDOVER followup that was folded in), .gitignore exception for .env.prod.example.
- Public MCP live: `https://oracle.slipgate.me/mcp` returns 400 without session ID (correct reject); `https://oracle.slipgate.me/health` returns 200 `ok`.
- Prod row counts: entities=8937, concepts=9, chunks=115 (all embedded), messages=728863, sessions=86423, redirect_targets=6, query_log=7+ (will grow with traffic).
- Three containers up on Unraid: `qw-oracle-postgres` (healthy), `qw-oracle-mcp` (healthy), `qw-oracle-nginx`.
- GHCR image: `ghcr.io/paradoks81/qw-oracle-mcp:0.4.0` + `:latest` (sha256:56aa4411c2cb).
- All 7 migrations applied to prod Postgres.
- Embedding-space verified (cosine 0.8852, above 0.85 threshold).
- Cumulative Voyage usage: ~132,000 tokens / 200M lifetime grant (~0.066%).
- Smoke probes through Claude.ai at 11:28 (screen wobble) + 11:51 (weapon priority chain) + orchestrator direct curl probe at 11:59 all returned correct, non-confabulated answers with proper L1 grounding.

## First three actions

### 1. Drain the threshold-restart followup (5 minutes)

The most consequential YELLOW from sign-off. Phase 8 Task 11 wrote calibrated thresholds to `/mnt/user/appdata/qw-oracle/.env` on Unraid but didn't restart the MCP container. Effect: the .env file shows calibrated values (STRONG=0.02 / WEAK=0.005) but the running container kept the Phase 6 placeholders (STRONG=0.05 / WEAK=0.02). Smoke probes during sign-off all bucketed as `match_quality: none` even when top_score (0.0164) was above the calibrated WEAK threshold — the running process never saw the calibrated values.

Verify the gap is still real (the running container hasn't been restarted by anything else):

```bash
ssh root@100.114.81.91 'docker exec qw-oracle-mcp env | grep MATCH_QUALITY'
# Expected (still broken): STRONG=0.05 / WEAK=0.02
ssh root@100.114.81.91 'cat /mnt/user/appdata/qw-oracle/.env | grep MATCH_QUALITY'
# Expected: STRONG=0.02 / WEAK=0.005
```

If the gap is still there:

```bash
ssh root@100.114.81.91 'cd /mnt/user/appdata/qw-oracle && docker compose restart mcp'
ssh root@100.114.81.91 'docker exec qw-oracle-mcp env | grep MATCH_QUALITY'
# Should now show: STRONG=0.02 / WEAK=0.005
```

Verify by running a smoke probe (curl-based, via Tailscale SSH from your local terminal so you have shell control). The query "screen wobbling bob disable" from Claude Desktop's earlier probe scored 0.0164 → which under calibrated thresholds (0.005 ≤ 0.0164 < 0.02) should now bucket as `weak` instead of `none`. The user-experience improvement: the LLM will receive `weak` and follow up with `get_concept_note` instead of giving up.

Surface the verification to the operator before declaring it done. They asked for a final smoke confirmation; this restart is meaningful enough to warrant one.

If the eval gate's recall@3 number changes after the restart (because more queries now correctly bucket weak), update the arc-history entry with the post-restart number. Probably stays at 83.3% because q5/q8 fail for L3 corpus-coverage reasons not threshold reasons, but verify.

### 2. Investigate the 5-phantom-Voyage-calls anomaly

Lower priority but worth understanding. On 2026-05-03 between 11:53:28-30 UTC, 5 Voyage embed calls landed in `embedding_api_log` (rows 249-253, all `mcp-query`, `voyage-4-lite`, 10-17 input_tokens each) but no corresponding `query_log` rows landed. Operator did not knowingly trigger 5 calls in that window. Wrapper IS working correctly under controlled probes (orchestrator's direct curl probe at 11:59 produced both rows correctly).

Hypothesis: Claude.ai web client may do background "warm" / speculative tool calls when a custom connector is configured, and those bypassed `query_log` somehow. But that's hypothesis, not verified.

Investigation steps:

1. Read the `dispatchAndLog` source at `apps/qw-oracle/serve/mcp/src/query-log.ts` and confirm whether there's any code path through the wrapper that could emit a Voyage call but skip the INSERT. (Unlikely since the INSERT is in `finally`, which fires regardless of try/throw outcome.)
2. Add verbose logging to the dispatcher: log "wrapper entered for tool=X" at start, "wrapper finally reached for tool=X latency=Yms" at end. Restart the prod MCP container with the new logging.
3. Watch `docker logs qw-oracle-mcp --follow` and the live `embedding_api_log` table. Wait for the next time `embedding_api_log` gets new rows. Correlate with what the wrapper logs say.
4. If the wrapper logs show "entered" but not "reached finally" → there's a code path that makes a Voyage call before reaching dispatchAndLog. Investigate by tracing the call sites of `embedTexts` in tool files.
5. If the wrapper logs show no "entered" at all when the phantom calls happen → the Voyage call is coming from outside the wrapper entirely. Could be the D8 startup verifier (but that runs once on boot, source='verify' not 'mcp-query'); could be something else.

Surface findings to operator. If it's a real bug, propose a fix; if it's expected behavior (e.g. SDK does pre-warm calls), document and move on.

Either way, this followup gets removed from HANDOVER once resolved.

### 3. Run the post-arc analysis

This is the work the original Phase 7-8 orchestrator handoff explicitly deferred to a fresh session: an outside-perspective comparison against the original Arc 1 spec, by a terminal that didn't anchor on what we executed.

The reasoning from the original handoff: "post-arc work needs an outside-perspective comparison against the original Arc 1 spec without anchoring on what we executed. Same logic that makes a code reviewer who didn't write the code catch more issues."

YOU are the fresh terminal. Take this seriously — don't just rubber-stamp what shipped. Actively look for gaps between what the spec promised and what the arc delivered.

**Reads required:**

1. Original spec: `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`
2. The four executor prompts (the actual runbooks executors followed):
   - `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-4-executor-prompt.md`
   - `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-5-executor-prompt.md`
   - `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-6-executor-prompt.md`
   - `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-7-executor-prompt.md`
   - `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-8-executor-prompt.md`
3. Arc index: `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/README.md`
4. Decisions: `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md` (D1-D18)
5. Arc history entry: `apps/qw-oracle/docs/arc-history.md` top entries (Phase 7 + Phase 8)

**Pass shape:**

For each section of the original spec, ask: "did the arc deliver what this section promised?" Possible verdicts:

- **DELIVERED** — spec promise met. Note the commit / file that delivered it.
- **DELIVERED-DIFFERENT** — equivalent value delivered via a different mechanism. Document the substitution.
- **DEFERRED** — explicitly deferred to a future arc per D5 or a documented amendment. Verify the deferral is captured somewhere durable.
- **MISSING** — spec promised it, no equivalent shipped, no documented deferral. **This is what the analysis is for.**

For each MISSING, write a one-paragraph "what" + "why this matters" + "where it should land" that the operator can use to decide whether to address now, schedule, or accept as scope reduction.

Also look for **shipped-but-not-promised** — places the arc delivered MORE than the spec required. These are the "we improved on the design as we went" findings. Worth surfacing because they sometimes encode insights worth promoting to spec-amendment territory for future arcs.

Output: a `docs/superpowers/reviews/2026-05-XX-qw-oracle-arc1-post-arc-analysis.md` document. Shape:

```markdown
# QW Oracle Arc 1 — post-arc analysis (YYYY-MM-DD)

## Verdict
One sentence: "Arc 1 delivered X% of spec promises with Y deferrals and Z missing."

## Spec section walkthrough
For each section (Architecture / Layer 1 port / Layer 2 / ... / Eval / Deploy):
  Status: DELIVERED | DELIVERED-DIFFERENT | DEFERRED | MISSING
  Evidence: commit hash, file path, or other verifiable signal
  Notes: any caveats

## Shipped beyond spec
Bullet list of "we delivered MORE than the spec required":
  - what
  - why it was added
  - whether it should be promoted to a spec amendment for future arcs

## Open YELLOWs from sign-off
Status of the followups in HANDOVER.md as of analysis time:
  - threshold-restart: addressed | still open
  - 5-phantom-Voyage-calls: investigated | still open
  - q5/q8 L3 authoring leads: queued | started | shipped

## Recommendations for Arc 2 / Arc 3 prep
Anything that surfaced during analysis that should inform the next arc's planning.
```

The analysis is operator-facing reading material. Don't pad it; don't perform analysis-as-cargo-cult. If the arc genuinely delivered everything cleanly, the analysis can be short. The value is in catching the things we don't realize we missed.

After the analysis ships, remove `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/post-arc-handoff.md` (this file). It's a one-shot.

## Read for context (when relevant scenarios arise)

- `docs/superpowers/parking/2026-05-03-layer3-multidomain-bucket-framework.md` -- L3 expansion + bucket framework + lockstep flagging architecture, captured during Phase 8 sign-off conversation. Three connected parking docs (this + L2 thread reconstruction + showcase-site contributor pipeline) form the Arc 3 architecture.
- `docs/superpowers/parking/2026-05-03-layer2-thread-reconstruction.md` -- Stage 4 bucket-tagging extension added 2026-05-03.
- `docs/superpowers/parking/2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md` -- Lockstep flagging architecture section added 2026-05-03.
- `apps/qw-oracle/docs/phase-8-eval-candidates.md` -- 90-day helpdesk scan provenance for the eval set; commit 6f814f3.
- `apps/qw-oracle/docs/OBSERVABILITY.md` -- Phase 7 deliverable, operator's daily-driver SQL against query_log + embedding_api_log.
- `apps/qw-oracle/DEPLOYMENT.md` -- Phase 8 deliverable, deploy mechanics top-level home.
- `HANDOVER.md` -- two new small-followup entries from Phase 8 sign-off (threshold-restart, 5-phantom-Voyage-calls).

## Operator preferences (apply ALWAYS)

- Verify before asserting. Every claim independently checked against live source / DB / tests / git. Do NOT take the prior orchestrator's "verified" claims on faith.
- Plain English first, technical chain second. Decision content first; mechanism only where it carries decision weight.
- Be decisive. Recommendations not polls. If two options are close, pick one and explain why.
- One question at a time during operator interaction. Translate option menus into plain consequences.
- ASCII discipline. No em/en dashes (use `--`), no emoji, no marketing voice.
- Comments explain WHY not WHAT.
- Trust operator pace estimates -- don't pad conservatively.
- The operator does not touch git. All git operations silent.
- Operator's Max subscription is 20x; compute is not the bottleneck. Surface costs only when meaningfully large.
- Voyage 200M-token grant is **lifetime per account, not monthly recurring**. Currently at ~132k tokens (~0.066%). Surface only if cumulative crosses ~5M tokens.
- The operator likes long deep architectural conversations when they're worth it (the L3 multi-domain framework conversation on 2026-05-03 ran ~3 hours of meta and produced three parking-doc updates). Don't truncate substantive thinking; do truncate filler.

## POSTGRES_PASSWORD (operational)

The Phase 8 executor generated the Unraid prod Postgres password and stored it at `/tmp/prod_pg_password.txt` (chmod 600) on the executor's WSL session. The executor terminal will have closed by the time you start; if the operator hasn't moved the password to durable storage (Bitwarden / 1Password / similar), check whether the file still exists and surface to the operator immediately. Worst case it can be retrieved from the Unraid `.env`:

```bash
ssh root@100.114.81.91 'grep POSTGRES_PASSWORD /mnt/user/appdata/qw-oracle/.env'
```

(Treat as sensitive; don't echo to logs the operator wouldn't expect.)

## Voyage local-fallback (future-arc consideration)

Operator surfaced this on 2026-05-03 as a "back of the pocket" idea. The Voyage 500ms latency is mostly network (~50-150ms RTT + TLS + JSON), not compute. Local CPU INT8 quantized BAAI/bge-large-en-v1.5 (335M params, 1024-dim — same output dimension as voyage-4-lite, retrieval quality within ~2-3% on MTEB benchmarks) would match or beat Voyage's experienced latency on short queries. With even a modest GPU on Unraid (e.g. RTX 3060), inference drops to 5-20ms. Real costs of going local: ~330MB on disk INT8, ~500MB RAM resident, ONNX Runtime dep, and one corpus re-embed (few hours of CPU work).

Two arc shapes possible:
1. **Fallback only** -- bring up local sidecar container for Voyage outage scenarios. Keep Voyage as primary.
2. **Primary local, Voyage as build oracle** -- ship MCP as fully-self-contained image, no API key dependency at runtime. Voyage used only for corpus rebuild.

Not in scope for this orchestrator. Captured here so the next planning-shaped session has the context.

## When in doubt

Ask the operator. One question at a time. Concise. They prefer plain-English consequences over option menus. They value being told when the analysis is genuinely short ("the arc shipped cleanly, here are the 3 specific things to track") over a padded performative review.

This is the close-out terminal. The arc is done. Ship the cleanup, ship the analysis, then this orchestrator role retires.
