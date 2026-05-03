# QW Oracle Arc 1 -- post-arc analysis (2026-05-03)

**Reviewer:** post-arc orchestrator (fresh terminal, did not execute Phases 4-8).
**Sources read:** spec `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`; arc index + decisions D1-D18 + Phase 7-8 executor prompts; arc-history Phase 6/7/8 entries; HANDOVER followups; live prod state on Unraid.

## Verdict

Arc 1 delivered all 14 spec promises with one minor gap (Layer 3 sibling-link backfill) and two intentional substitutions that warrant explicit follow-up arcs. Out-of-scope deferrals (snapshot manifest, Layer 2 enrichment) are correctly captured as Arc 2 / Arc 3 work per D5. The arc shipped clean.

## Spec section walkthrough

### Storage: Postgres 16 + pgvector + tsvector, single engine

Status: **DELIVERED**.
Evidence: migrations 001-007 land all three layers on Postgres; `pgvector/pgvector:pg16` image; SQLite era retired (CLAUDE.md "SQLite over Postgres" rule removed in Phase 8 Task 14; `data/knowledge.db` and `data/qw.db` no longer in runtime path per arc-history Phase 8 entry).

### Embedding model: Voyage 4 series, shared embedding space

Status: **DELIVERED** with documented amendment.
Evidence: Phase 5 ships `voyage-4-large` build / `voyage-4-lite` query, 1024-dim, with `embedding_metadata` table populated. D8 startup verifier amended at execution time to test the model-size axis only (input_type='document' on both calls); the amendment is documented in `decisions.md` D8 with strong commentary in `shared/embedding.ts` to prevent future revert. Cumulative Voyage usage: ~132k of 200M lifetime grant.

### Retrieval: hybrid lexical + semantic, RRF, calibrated thresholds

Status: **DELIVERED** with one runtime gap that is now resolved.
Evidence: Phase 6 ships RRF over tsvector + pgvector for `search_entities` and `search_concepts`; Phase 8 calibration produced `STRONG=0.02 / WEAK=0.005`. The spec promised "initial public users see calibrated `match_quality`, not placeholder values"; between Phase 8 deploy time (2026-05-03 ~11:30 UTC) and the post-arc fix (2026-05-03 ~12:25 UTC), the running prod container had Phase 6 placeholders because `docker compose restart` does not re-substitute `${VAR}` references in compose. Container recreated via `docker compose up -d mcp` at the start of this orchestrator session; calibrated thresholds are now live and verified by smoke probe (query `screen wobbling bob disable` scored 0.0164 -> bucket=`weak` post-fix vs `none` pre-fix). Real-world impact: a handful of smoke probes during sign-off saw `none` instead of `weak`. No external user traffic during the gap.

### New tool: search_concepts

Status: **DELIVERED**.
Evidence: Phase 6 ships `search_concepts` with the full response shape from the spec (slug, title, summary, match_score, match_quality, snippet, related_entities, related_concepts, suggested_fallback, meta). Snippet truncation is bounded post-process (~120-150 tokens centred on the matched span).

### Bidirectional graph

Status: **DELIVERED-DIFFERENT** (mechanism complete; data partially populated).
Evidence: Phase 4 ships `concept_entities` (82 edges populated from existing notes' `related_entities:` frontmatter) and `concept_concepts` (0 edges -- no current concept note declares `related_concepts:`). The wiring works; the operator authoring convention is introduced but not yet applied. `lookup_entity` returns `related_concepts` inline as designed -- it just returns `[]` until notes start declaring siblings. Backfill is operator authoring work; flagging for Arc 2/3 prep below.

### Honest-failure machinery

Status: **DELIVERED-DIFFERENT** for `search_solved_issues`.
Evidence: orientation instructions ship at MCP `initialize` (`serve/mcp/src/orientation.ts`); `match_quality` is on every search response; `redirect_to_human` ships with 6 placeholder targets that the operator can swap for real Discord IDs. Deviation: `search_solved_issues` buckets `match_quality` by hit count (`results.length >= 2 ? 'strong' : 'weak'`) rather than by fused score. This was discovered during Phase 8 calibration and explicitly scoped as a Phase 6 follow-up, not Arc 1. The eval set worked around it (out-of-corpus queries deliberately avoid QW-domain words to prevent false-strong bucketing via L2 lexical hits). Recommend bundling the score-based `search_solved_issues` bucket fix into Arc 2.

### Snapshot distribution: manifest + content-hashed delta fetch

Status: **DEFERRED** to Arc 2 per D5.
Evidence: `decisions.md` D5 lists this as out of scope; arc index README "What this arc deliberately does NOT cover" captures it. Verified: no `manifest.json` writer, no slipgate-app update loop, no `contracts/` snapshot manifest spec in this arc. nginx serves `/var/oracle/snapshots/` as a static dir but no manifest pipeline.

### Observability

Status: **DELIVERED-DIFFERENT** (tables and operator queries shipped; automated rollups deferred).
Evidence: `query_log` (Phase 7 + dispatcher wrapper) and `embedding_api_log` (Phase 5) tables ship as designed. `OBSERVABILITY.md` is the operator's daily-driver SQL cheatsheet. Spec named "latency p95 per tool" + "error rate alerting" + "Cloudflare cache-hit rate" + "90-day retention policy"; none of these landed as automated mechanisms. They exist as ad-hoc operator SQL only. Spec said "v1's observability lives in Postgres tables the operator can SQL against, with optional log shipping to a future stack as the project graduates" -- so the SQL-only delivery is consistent with the spec's stated minimum, not a gap.

### Schema additions

Status: **DELIVERED**.
Evidence: migration 005 (concepts + concept_chunks + concept_entities + concept_concepts + redirect_targets), 006 (embedding_api_log), 007 (query_log). ALTER TABLE on `entities` adds the four embedding columns; ALTER on `messages` adds `content_tsv`. `embedding_metadata` singleton populated by Phase 5.

### Deploy topology

Status: **DELIVERED**.
Evidence: dev Docker Compose with `pgvector/pgvector:pg16`; prod three-container stack on Unraid (`qw-oracle-postgres` + `qw-oracle-mcp` + `qw-oracle-nginx` on `qworacle-net` bridge) at `/mnt/user/appdata/qw-oracle/`; Cloudflare Tunnel route at `oracle.slipgate.me`; CF rate limit 60/min per IP; weekly Unraid -> Synology backup covers postgres-data + snapshots + configs.

### Authoring + embedding loop

Status: **DELIVERED**.
Evidence: Phase 4 + 5 ship hash-skip pattern across L1 + L3 (`description_embedding_sha256`, `text_sha256`); batch=64 default for L1; Voyage-down failure mode marks `embedding_stale` without overwriting last-good vectors; transactional rewrite per slug for L3 atomic updates; L2 has no embeddings in v1 per D9.

### Evaluation

Status: **DELIVERED** at the lower end of the spec range.
Evidence: 12-query eval set + 5-query disjoint calibration set per D10. Spec said "15-20 questions"; D10 widened the lower bound to "10-15 / 5-8" to reflect operator effort cost vs signal. Recall@3 = 83.3% (10/12 PASS) with q5 + q8 left as "vague-NL queries the corpus should cover but doesn't" -- captured in `docs/superpowers/parking/2026-05-03-layer3-multidomain-bucket-framework.md` as L3 authoring leads. The eval set works as intended both as deploy gate and as authoring-queue surface.

### Arc sequencing

Status: **DELIVERED**. All Arc 1 line items in the spec's 482-498 block shipped. End state matches "Single-engine deliverable. End of Arc 1 the project runs Postgres only" verbatim.

## Shipped beyond spec

Things the arc delivered that weren't in the spec, captured because some warrant promotion to spec amendments for future arcs:

- **Markdown-aware chunker (Phase 4).** Spec named heading-split as a default with chunking strategy as Open question 1; Phase 4 shipped a real chunker (heading-split, sentence-fallback, char-window-fallback) with 8 tests. More elaborate than the spec's default.

- **Help-JSON classification + upstream PR digest (Phase 2 sidequest).** Surfaced 156 help-JSON drift entries in ezquake source (48 renamed / 93 retired / 15 never-implemented). Tracked as upstream PR `QW-Group/ezquake-source#1117` (open as of 2026-05-01). Not in spec; emerged from the L1 port's `entities.description` derivation work.

- **JSONB serialization fix across 8 loader sites (Phase 2).** Cross-app contract drift sidequest -- pre-stringified JS arrays/objects creating JSONB string scalars. Fixed inline; F1 regression gate (`F1.jsonb_columns_not_strings`) prevents recurrence.

- **D8 input_type asymmetry insight (Phase 5).** Found at execution time that the build/query input_type asymmetry intentionally drives same-text cosine below 0.85, so the verifier had to be split between the model-size axis (tested at startup) and the input_type axis (tested at Phase 8 eval time). The amendment is now embedded in `shared/embedding.ts` with clear "do not revert" commentary. Worth promoting: this is a Voyage-specific insight that any future Anthropic/Voyage stack design should bake in from spec time, not discover at execution.

- **Phase 7 dispatcher wrapper (`dispatchAndLog`).** Spec's observability section was loose ("can land toward the end of Arc 1"); Phase 7 shipped a full instrumented dispatcher with `consumer_hint` capture from MCP handshake. Cleaner observability primitive than the spec implied.

- **Two Phase 6 bugs caught in flight at Phase 8.** `search-solved-issues.ts:55` `participants` -> `participants_json` column alias; `transports/http.ts` 127.0.0.1 -> 0.0.0.0 bind. Both shipped under the same `0.4.0` image tag.

- **Three Dockerfile workspace-shape adaptations (Phase 8).** `--frozen-lockfile` requires every `apps/*/package.json` present; `--filter=qw-oracle` avoids quad's `@discordjs/opus` native binding under Alpine Bun; `serve/mcp/` is NOT a workspace member and needs its own `bun install --production` step. None anticipated by the plan; all are now baked into the Dockerfile and worth documenting in `DEPLOYMENT.md` for any future cross-app monorepo Docker arc.

## Open YELLOWs from sign-off

- **threshold-restart followup -- ADDRESSED.** Container recreated via `docker compose -f docker-compose.prod.yml up -d mcp` at 2026-05-03 12:25 UTC. Calibrated thresholds verified live (`STRONG=0.02 / WEAK=0.005`). Smoke probe `screen wobbling bob disable` returns `match_quality: weak` post-fix. Doc gap: HANDOVER's followup body said `docker compose restart`; the correct command is `up -d`. Fix bundled into Task 4 of this orchestrator session.

- **5-phantom-Voyage-calls -- INVESTIGATED, root cause known, NOT a bug.** The 9 phantom rows in `embedding_api_log` (rows 245-253, brief cited 5 of these) at 11:53 UTC are from build-time `eval.ts` / `calibrate.ts` runs that bypass `dispatchAndLog` by design (eval.ts:14-17 comment is explicit). Both `searchEntities` and `searchConcepts` hardcode `source='mcp-query'` in their `embedding_api_log` INSERTs regardless of caller; only `dispatchAndLog` writes `query_log`. The original "Claude.ai background warm calls" hypothesis was wrong. Minor observability gap: `source='mcp-query'` is overloaded to mean both "live consumer call" and "build-time test"; recommended follow-up below.

- **q5/q8 L3 authoring leads -- QUEUED.** Both captured in `docs/superpowers/parking/2026-05-03-layer3-multidomain-bucket-framework.md` under the L3 multi-domain framework. Authoring is Arc 3 work alongside the unshelving of L2 enrichment.

## Recommendations for Arc 2 / Arc 3 prep

Listed in increasing scope -- the first two are small enough to drop into Arc 2 prep without their own arcs.

1. **Widen `embedding_api_log.source` enum** to add `'eval'` and `'calibrate'` values so cost attribution distinguishes consumer-time from build-time. Three-line schema migration; one-line update each in `eval.ts` and `calibrate.ts` to pass through their own source labels. Removes the observability-gap finding from Action 2 above.

2. **`search_solved_issues` score-based bucketing.** Scoped as Phase 6 follow-up at Phase 8 sign-off. The current hit-count rule fires false-strong on out-of-corpus queries that mention "ezquake" + a common Discord word. Bundle into Arc 2 alongside the snapshot work (lighter scope but related observability cleanliness).

3. **`DEPLOYMENT.md` env-var-change procedure.** Add an explicit note that `docker-compose.prod.yml` uses `${VAR}` substitution at create-time; updating values in `.env` requires `up -d mcp`, not `restart`. Bundled into Task 4 of this session.

4. **`related_concepts:` authoring sweep.** Phase 4 wired the bidirectional graph; 0 sibling-link rows currently exist because no note declares `related_concepts:`. A targeted authoring pass over the 9 existing notes (2-4 hours of operator time?) would unlock the lookup_entity -> sibling-concept iteration path the spec described. Could roll into the L3 multi-domain framework parking doc's authoring backlog.

5. **redirect_targets real-data swap.** Phase 6 seeded `redirect_targets` with `REPLACE_GUILD_ID` etc. placeholders; `redirect_to_human` returns those placeholders verbatim today. Operator should populate real Discord channel/handle URLs before this tool actually helps anyone. ~30 minute task.

6. **Eval set extension to 15-20 queries.** Currently 12 (within D10 range but at the lower bound). Spec target was 15-20. Tighter signal on the deploy gate as L3 authoring grows.

7. **Observability rollups (latency p95 / error rate).** Spec named these; Arc 1 shipped only the SQL. A simple daily-roll-up SQL view + a `/metrics` HTTP endpoint (a couple of hours) would close the spec promise without a Grafana stack. Scope-appropriate for late-Arc-2 or a sidequest.

The arc shipped clean. Items 1-3 are small; 4-7 are operator-driven authoring or follow-up arcs that don't gate any current work.
