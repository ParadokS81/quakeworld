You are the coordinator/verifier terminal for qw-oracle Arc 1, taking over from a prior orchestrator that shipped Phases 4-6 cleanly and hit ~340k context after Phase 6 sign-off. Your job is to coordinate Phase 7 (observability) and Phase 8 (eval + calibration + Docker prod + Unraid deploy) through to arc completion, then halt before the post-arc analysis (which will get its own fresh session per operator preference).

Stay in `/home/paradoks/projects/quakeworld` on branch `main`. NO worktree. The operator does not touch git -- you run all git operations silently. No PR menus, no merge prompts, no branch questions.

## Where Arc 1 is right now (verified at handoff time)

Shipped commits since the prior handoff (chronological):

- `be6e9b9` -- docs(qw-oracle): Phase 4 amendment (JSONB pre-stringify regression fix + EXPLAIN flake fix in step 10 + JSONB regression probe step 9b)
- `2644772` -- docs(qw-oracle): Phase 4 executor prompt
- `dd9a181` -- feat(qw-oracle): Arc 1 Phase 4 -- Layer 3 storage + bidirectional graph + chunker
- `eeab23d` -- docs(qw-oracle): post-Phase-4 doc-drift cleanup (npm-rule replaced with bun install; tech-stack updated; arc-history Phase 3 + 4 entries)
- `c79dfc4` (operator-side) -- park L2 thread-reconstruction architecture
- `70beea9` (operator-side) -- L2 thread-reconstruction Stage 0 iterative glossary bootstrap
- `db97696` -- docs(qw-oracle): Phase 5 executor prompt
- `ffe681b` -- feat(qw-oracle): Arc 1 Phase 5 -- Voyage embedding pipeline + D8/F14 verifier
- `f814b31` (operator-side) -- L2 thread-reconstruction refinements
- `6b5b135` -- docs(qw-oracle): Phase 6 executor prompt
- `08312cc` -- feat(qw-oracle): Arc 1 Phase 6 -- MCP on Postgres + hybrid retrieval + 2 new tools + HTTP transport

Live state in `qw_oracle` Postgres (verified at handoff):

- Layer 1: 8937 entities, 5756 with `description_embedding` (1024-dim Voyage vectors)
- Layer 2: 728863 messages / 86423 sessions / 35157 NULL-session label rows / 15489 reply edges
- Layer 3: 9 concepts / 115 chunks (all with `embedding` populated)
- Migrations 001-006 applied to both `qw_oracle` and `qw_oracle_test`
- `oracle_meta(key='embedding_space_verified_at', value='2026-05-02T22:59:53.041Z')` -- D8 startup gate cache
- `embedding_api_log`: ~93 loader / ~4 verify / ~8 mcp-query rows (~131,714 tokens lifetime to date; ~0.066% of Voyage's 200M lifetime free grant)
- `redirect_targets`: 6 placeholder rows (operator fills real Discord/expert URLs before Phase 8 deploy)

MCP server status:

- Stdio transport: works. Logs `embedding-space verify cached (age <N>m, ttl 24h)` then `connected via stdio`.
- HTTP transport: works. `/health` returns 200; bind on `127.0.0.1:3000` (or 3001 in smoke); Phase 8 puts nginx + CF Tunnel in front.
- All 12 tools registered: 10 ported existing + `search_concepts` + `redirect_to_human`.

Drafted but not executed: Phase 7 + Phase 8 per `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/README.md`. Phase 7 is your immediate next target.

## Amendments shipped during the prior orchestrator session (load-bearing context)

Four amendments shipped during Phases 4-6 that subsequent phases inherited automatically. Future executors must not undo these:

1. **Phase 4 JSONB pre-stringify regression** (commit `be6e9b9`). Plan-shipped `upsert.ts` had `${JSON.stringify(c.frontmatter)}::jsonb` -- the same bug pattern Phase 2 fixed. Replaced with `${tx.json(c.frontmatter as never)}` matching the load-knowledge / load-chat convention. Verification block gained step 9b (`jsonb_typeof(frontmatter) = 'string'` regression gate mirroring Phase 2's F1 probe). Step 10 EXPLAIN test was also amended to force `enable_seqscan = OFF` so it verifies wiring rather than betting on row-count thresholds.

2. **Post-Phase-4 doc drift** (commit `eeab23d`). The `apps/qw-oracle/CLAUDE.md` always-on rule "npm `--no-workspaces` required" replaced with "`bun install` for adding/installing deps." Reason: `apps/qw-oracle/package.json` carries `"@qw/version-resolution": "workspace:*"`, which npm rejects with `EUNSUPPORTEDPROTOCOL` regardless of the `--no-workspaces` flag. Bun handles the protocol natively. Memory note `reference_qw_oracle_toolchain.md` updated in the same pass. Tech-stack section refreshed to include load-chat + load-concepts + the gray-matter dep.

3. **Phase 5 D8 input_type confound** (mid-execution amendment by Phase 5 executor, dated 2026-05-03). The verifier originally used `input_type='document'` for the build call and `input_type='query'` for the query call to mirror production retrieval. This confounded two Voyage axes -- the model-size axis (D8's actual claim) and the input_type asymmetry axis (Voyage's intentional task-bias for retrieval quality). Empirical probe on `"weapon scripts"` returned 0.6846 cross-axis vs 0.8850 model-size-only. `decisions.md` D8 stamped with the amendment; `phase-5-embeddings.md` carries an executor-found-amendment block; `shared/embedding.ts:verifyEmbeddingSpace` now holds `input_type='document'` on both calls + a defensive comment warning future readers not to revert. **Production code in `embed-entities.ts` ('document') and `search-entities.ts` / `search-concepts.ts` ('query') keep the asymmetry unchanged** -- that is the intended retrieval design.

4. **Phase 6 path bug fix** (caught by Phase 6 executor, included in `08312cc`). Plan-inlined `search-entities.ts` and `search-concepts.ts` shipped `'../../../shared/embedding.ts'` (3 levels) -- but tool files are 4 levels deep from `apps/qw-oracle/`, not 3. Executor corrected to `'../../../../shared/...'`. The plan's `redirect-to-human.test.ts` (also at `tools/`) had the correct 4-level path -- inconsistency was in those two inlined tool bodies only.

## First three actions

1. **Pre-flight verify the inherited state.** Run these probes; halt if any drift:
   ```bash
   docker ps --format "{{.Names}}\t{{.Status}}" | grep qw-oracle-postgres-dev
   git log --oneline -3   # top should be 08312cc or newer
   git status --porcelain # must be empty
   docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "
     SELECT 'L1 entities' AS p, COUNT(*)::text AS v FROM entities
     UNION ALL SELECT 'L1 with embedding', COUNT(*)::text FROM entities WHERE description_embedding IS NOT NULL
     UNION ALL SELECT 'L2 messages', COUNT(*)::text FROM messages
     UNION ALL SELECT 'L3 concepts', COUNT(*)::text FROM concepts
     UNION ALL SELECT 'L3 chunks with embedding', COUNT(*)::text FROM concept_chunks WHERE embedding IS NOT NULL
     UNION ALL SELECT 'redirect_targets', COUNT(*)::text FROM redirect_targets
     UNION ALL SELECT 'migrations', COUNT(*)::text FROM schema_migrations;"
   ```
   Expected: 8937 / 5756 / 728863 / 9 / 115 / 6 / 6.

2. **Read in this order:**
   - `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/README.md` (arc index)
   - `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md` (D1-D18 locked; especially the Phase 5 2026-05-03 D8 amendment about input_type='document')
   - `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-7-observability.md` (the contract for the next executor)
   - `apps/qw-oracle/CLAUDE.md` (style + always-on rules; the bun install rule + the JSONB rule are load-bearing)
   - `HANDOVER.md` (active backlog; especially the L2 thread-reconstruction parking entry the operator added during the prior session)
   - `apps/qw-oracle/docs/arc-history.md` (ship log; entries for Phase 3, 4 added during the prior session; Phase 5 + 6 are NOT YET in arc-history -- prior orchestrator decided to add them at arc end together with 7 + 8)

3. **Audit Phase 7 plan for code-vs-comment self-contradictions BEFORE kicking off the executor.** Hard-won lesson from this arc:
   - Phase 4 plan shipped a JSONB pre-stringify regression that the drafter's sub-agent missed; orchestrator audit caught it.
   - Phase 5 plan shipped a D8 verifier that confounded two axes; the executor caught it mid-flight, not the orchestrator.
   - Phase 6 plan shipped path bugs in two tool files; the executor caught those too.
   The pattern: drafter sub-agents miss subtle bugs that the orchestrator audit can catch with a focused pass. Re-read each plan-shipped code block against its own comments and surrounding text. Look for: stale variable references, comment-vs-code drift, missing constant declarations, mismatched task numbering, JSONB pre-stringify, EXPLAIN-on-tiny-tables, file path drift, references to deleted Phase 3 mjs scripts. If you spot anything, fix in a small amendment commit BEFORE the executor runs.

After those three: write a fresh Phase 7 executor prompt (shape similar to Phase 4/5/6 prompts already in the plans dir -- pre-flight checks, plan reads, critical rules, halt protocol). The operator pastes it into a fresh terminal.

## Read for context (when relevant scenarios arise)

- `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-4-executor-prompt.md`, `phase-5-executor-prompt.md`, `phase-6-executor-prompt.md` -- shape templates for the new Phase 7 + Phase 8 prompts you will write.
- `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-5-embeddings.md` "Executor-found amendment" section -- precedent for documenting mid-execution amendments traceably.
- `apps/qw-oracle/scripts/load-chat/CLAUDE.md`, `scripts/load-concepts/CLAUDE.md` -- subsystem-doc shape if Phase 7's observability layer ships a new subsystem CLAUDE.md.
- `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md` -- the architecture spec the arc is implementing; useful when a phase MD references "spec lines NNN" claims.

## Operator preferences (apply ALWAYS)

- Verify before asserting. Every executor claim gets independently checked against live source / DB / tests / git. Do NOT take "X is verified" or "tests pass" on faith.
- Plain English first, technical chain second. Decision content first; mechanism only where it carries decision weight.
- Be decisive. Recommendations not polls. If two options are close, pick one and explain why.
- One question at a time during operator interaction. Translate option menus into plain consequences or decide.
- ASCII discipline. No em/en dashes (use `--`), no emoji, no marketing voice.
- Comments explain WHY not WHAT.
- Trust operator pace estimates -- don't pad conservatively.
- No subagents for SQL writing (D16); subagents OK for parallel verification probes only.
- Cross-app contract changes need slipgate-side typecheck verification. Phases 7-8 are qw-oracle-internal so unlikely to trigger; if anything touches `packages/qw-knowledge/` or `apps/slipgate-app/`, run a slipgate typecheck before sign-off.
- The operator does not touch git. All git operations silent.
- The operator's Max subscription is 20x. They can chew through compute for quality verification without budget concerns; surface costs only when meaningfully large or surprising.
- Voyage 200M-token grant is **lifetime per account, not monthly recurring** -- corrected mid-session after I assumed monthly twice without verifying. Arc has consumed ~131,714 tokens to date (~0.066%). Phase 8 calibration + eval will add more per-query embeddings; surface only if cumulative crosses ~5M tokens.

## Verification discipline (load-bearing pattern)

When an executor halts with a summary:

1. Read their summary.
2. Independently verify each load-bearing claim against live source / DB / tests / git.
3. Look for the gap between "what the executor checked" and "what could have silently gone wrong."
4. Re-read each plan-shipped code block against its own comments and surrounding text.
5. Flag YELLOW items honestly even if they don't block sign-off. Flag RED items as blockers.
6. If a real bug surfaces, fix the root cause first; don't paper over with downstream fixes.

## Coordinating multiple terminals

Pattern from the prior arc:

- Orchestrator (you) holds arc coherence + verification + decisions
- Executors do focused work in fresh contexts; halt at phase boundary with structured summary
- Orchestrator independently verifies executor halt summary before sign-off
- Orchestrator commits + pushes after sign-off

Per project rules: superpowers' worktree-per-plan default is overridden -- execute in the main tree.

## Phase 7 + Phase 8 specifics worth flagging

- **Phase 7** is small (dispatcher-level wrapper for `query_log` + `OBSERVABILITY.md` cheatsheet). Fastest phase since Phase 1. Should run cleanly.
- **Phase 8** is the heaviest phase in the arc: eval set authoring + calibration sweep (D10/D11), Dockerfile prod + compose.prod.yml, nginx config, Cloudflare Tunnel choreography, DNS at oracle.slipgate.me, Unraid deploy. Per HANDOVER, the operator wants a `DEPLOYMENT.md` authored alongside Phase 8 execution to formalize the deploy mechanics. The eval/calibration query sets are operator-authored (D10 keeps them disjoint -- calibration set must NOT overlap eval set or the deploy gate becomes trivially passable post-calibration).
- **Calibration thresholds.** Phase 6 ships placeholder thresholds (`STRONG_THRESHOLD = 0.05`, `WEAK_THRESHOLD = 0.02`) for `match_quality` bucketing. Phase 6's smoke showed match_quality='none' for the canonical "screen wobble" query because RRF scores in a single-list-only result top out at ~0.016. Phase 8 calibration is what makes the bucket meaningful. Plan's Open Question 2 already names this; do not pre-tune in Phase 7.
- **arc-history.md needs Phase 5 + 6 + 7 + 8 entries at arc end.** Prior orchestrator added entries for Phase 3 + 4. Phase 5 + 6 are not yet in arc-history -- intentional, prior orchestrator's reasoning was to land them as a single "Phases 5-8 retrospective" block alongside the post-arc analysis. You can either follow that pattern (entries land at end) or add them per phase as you go (matches the "append-only chronicle" comment at top of arc-history.md). Operator preference signal: the post-Phase-4 cleanup did the per-phase pattern.
- **Stale MCP background processes (PIDs 75998, 80729) from the prior handoff are dead.** The system reaped them. No cleanup gate needed for Phase 6's db.ts rewrite (which already shipped) or for Phase 7.

## Halt-for-operator-input triggers

- Open questions unresolvable from spec/decisions/phase MDs alone
- Decisions that change arc scope (adding a phase, deferring a finding, accepting a yellow)
- Executor halt summaries -- after your independent verification, surface findings + recommendation to operator
- Phase boundary decisions (which phase to kick off next; whether to break for context after Phase 7)
- Anything Voyage-billing-related at scale (highly unlikely with the 200M lifetime grant in play; mention only if cumulative crosses 5M tokens)

## When in doubt

Ask the operator. One question at a time. Concise. They prefer plain-English consequences over option menus. They've shown a "fix it all in this arc, don't leave loose ends" pattern -- err toward folding cheap improvements into the current arc rather than deferring them.

## Post-arc analysis is its own session

After Phase 8 ships and the public MCP is live at oracle.slipgate.me/mcp, hand off the post-arc analysis to a fresh session rather than running it from this orchestrator context. Reason: post-arc work needs an outside-perspective comparison against the original Arc 1 spec without anchoring on what we executed. Same logic that makes a code reviewer who didn't write the code catch more issues. Suggest the operator open a new terminal, point it at `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md` and at the four `phase-*-executor-prompt.md` files, and ask for a "did this arc deliver what it set out to" pass.

## Recently opened in this session (handoff context)

- The operator added an `L2 thread reconstruction` parking file at `docs/superpowers/parking/2026-05-03-layer2-thread-reconstruction.md` -- a future Arc 3 candidate. Listed under HANDOVER.md "Future arcs (waiting on trigger)." Does NOT impact Phase 7 + 8.
- The post-Phase-4 cleanup updated `apps/qw-oracle/CLAUDE.md` always-on rules (`bun install` rule) and the global memory note `reference_qw_oracle_toolchain.md`. Both are up-to-date with current Arc 1 reality.

That's the handoff. Pre-flight, audit Phase 7, write the executor prompt, hand it to the operator. Same ratchet that caught the JSONB regression at Phase 4 and the input_type confound at Phase 5.
