# Oracle re-entry plumbing -- mini-arc plan

**Date:** 2026-08-03. **Weight class:** mini-arc (one repo, 4 phases, days-scale; single-file plan per repo convention).
**Spec basis:** conversation-committed re-entry report 2026-08-03 (session probes, all re-runnable) + `docs/superpowers/parking/2026-05-30-mcp-realignment-ktx-data-handoff.md` (partially stale -- see F2) + HANDOVER MCP-realignment entry (F9 amendment 2026-06-15) + memory `oracle-consumer-status` (tester-invite checklist).
**Arc-end review:** live smoke + operator walkthrough of the public endpoint. No cold reviewer (mini-arc).

## Status

- **Stage:** EXECUTING -- Phase 1 (audit) + Phase 2 (extraction recert) dispatched in parallel
- **Last action:** operator GO 2026-08-03; ops maintenance-session ordering confirmed NOT blocking (order-independent; see prerequisites)
- **Next action:** Phase 1 task 2 (embed pass) once the audit's before-state lands; then Phase 3
- **Lane:** main checkout (sole worktree at `2c2c4ea7`, clean; no other arc executing per HANDOVER active-arcs review 2026-08-03)

## Operator-side prerequisites

- [ ] None hard-blocking. The maintenance-window bundle (ops letter `~/letterbox/to-ops/2026-08-03-maintenance-window-bundle.md`) can land before/during/after this arc; if the cockpit image rebuild lands mid-arc, re-run Phase 2's env preflight afterward (apt layer changes; the pip clang layer survives in `$HOME` mise python).
- [ ] Phase 4 image push: GHCR PUSH credential from the cockpit is UNVERIFIED (pull is provisioned; push unknown). Task 4.1 probes it; if refused, a second ops letter requests push capability or an ops-side build+push. The data refresh (4.2) proceeds regardless.
- [ ] Voyage spend visibility: Phase 1 re-embeds roughly 9-10k short descriptions in one pass (batches of 64, voyage-4-large, every call logged to `embedding_api_log`). Small spend; abort criterion in 1.2.

## Decisions

- **D1 Wholesale-dump prod refresh.** Prod receives a full twin `pg_dump`/`pg_restore`; never incremental SQL edits. Why: the twin is canonical (2026-07-20 reseed) and prod has no consumers; wholesale is the cheapest correct move. Implication: any data defect found later is fixed dev-side and re-shipped the same way.
- **D2 Single MCP touch.** All server-code changes (tool-fit + SDK) land in Phase 3; Phase 4 rebuilds the prod image once. No tool changes after Phase 3 without re-running its boundary gate.
- **D3 Re-embed precedes dump.** Embeddings are computed dev-side in Phase 1 and ride the dump; prod makes no Voyage build-model calls.
- **D4 SDK upgrade scope.** Bump `@modelcontextprotocol/sdk` `^1.0.0` -> current 1.x; keep Streamable HTTP transport + session behavior backward-compatible. NO stateless-core redesign, NO MCP Apps, NO auth changes in this arc -- those are website/surfaces-arc questions (spec 2026-07-28 carries a >=12-month deprecation window; old-protocol clients verified still connecting 2026-08-03). Overrule: operator.
- **D5 Content freeze.** No new or edited knowledge content (L1 descriptions, L3 notes, seeds) inside this arc; plumbing only. Content-shaped findings go to the Findings ledger -> HANDOVER, not into scope.
- **D6 Rollback insurance.** Phase 4 dumps prod into `/mnt/user/appdata/qw-oracle/dumps/` BEFORE restoring; retained until the Phase 4 gate passes with operator witness.
- **D7 Findings routing.** HANDOVER-vs-reality contradictions surfaced here feed the separate (overdue) HANDOVER sweep; this arc fixes only what blocks its own phases.
- **D8 Runner is bun.** `bun run load-knowledge -- ...`, `bun run embed:entities`, `bun test`. VALIDATION-RUNBOOK's `npm --prefix` literals are WSL-era; where they conflict, the bun form wins (oracle CLAUDE.md D2 bun-pin).

## Sequencing

| Phase | Ships | Depends on | Archetype / verification floor |
|---|---|---|---|
| 1 | Twin certified canonical (audit + fresh embeddings) | -- | migration/backfill -- automated |
| 2 | Extraction pipeline certified on cockpit | -- (parallel-ok with 1) | loader reproducibility -- automated |
| 3 | MCP tool-fit residuals + current SDK, local smoke green | 1 | cross-cutting synthesis -- automated |
| 4 | Prod = canonical, publicly verified | 1 + 3 (2 recommended done) | deploy -- operator-run floor |

---

## Phase 1 -- canonical-state audit + re-embed

**Goal:** certify the twin as the canonical state prod will inherit: enumerate what is stale or contradicted, run the embed pass, prove idempotency. Ends with semantic search on the twin running on fresh vectors and a recorded baseline-counts table for Phase 4 parity.

**Inputs:** twin as verified 2026-08-03 -- 11,081 entities / 7 projects, 8,621 threads all embedded, migrations through 021 applied.

**Files touched:** none in repo (DB-side work; findings land in this file's ledger).

**Tasks:**

1. **Audit** -- `agent (workhorse, medium)`, read-only. Enumerate-the-class discipline (derive each set, do not verify a handed list):
   (a) re-embed candidate set BY THE JOB'S OWN CRITERION (`sha256(description) <> description_embedding_sha256 OR description_embedding IS NULL`), per project and type -- the 9,370 stale-flag figure (F1) is a different predicate, re-derive;
   (b) `schema_migrations` rows vs `apps/qw-oracle/db/migrations/*.sql` filenames -- zero unapplied;
   (c) baseline counts snapshot: entities by project, chat_threads, thread_messages, concepts, gameplay_entity_defs by source, maps -- recorded in Findings for the Phase 4 parity probe;
   (d) HANDOVER-vs-DB contradiction list (seed: F2);
   (e) resolution_status + embedding coverage on chat_threads (re-confirm 2026-08-03 numbers).
   Probe shape (verified working 2026-08-03): `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -Atc "<sql>"`.
2. **Embed pass** -- `agent (workhorse, low)`, WRITE-GRANT: twin DB + Voyage API only. Preflight: `apps/qw-oracle/.env` has `VOYAGE_API_KEY` and a `DATABASE_URL` pointing at `qw-oracle-postgres-dev` (placed 2026-07-20; confirm host, do not print secrets). Run from `apps/qw-oracle/`: `bun run embed:entities`. The job is hash-idempotent, batches 64, logs to `embedding_api_log`, and on a rejected batch leaves prior vectors + `description_embedding_stale=TRUE`. Abort if 3 consecutive batches fail.

**Phase-boundary verification (all YES/NO, runnable as written):**
- candidate-set SQL from 1(a) returns 0 rows
- `SELECT count(*) FROM entities WHERE description_embedding_stale` returns 0
- `embedding_api_log` row count strictly increased during the pass
- a second `bun run embed:entities` reports embedded: 0 (idempotency)

**Outputs to next phases:** certified twin; baseline counts table (Phase 4 parity); orientation-vs-data notes (Phase 3 task 1 input).

**Open questions:** none.

**Recovery:** Voyage outage -> re-run later, job is idempotent. Twin trashed -> reseed is host-plane post-fence (`RESEED.md` via ops letter) -- avoided by keeping every task except 1.2 read-only.

---

## Phase 2 -- extraction re-certification (QWCL byte-identical)

**Goal:** prove the Layer-1 extraction pipeline works on the cockpit after the fence-rebuild breakage. Ends with a full QWCL extract reproducing committed outputs byte-identically with clean parse diagnostics -- the same certification that passed 2026-07-20 pre-breakage.

**Inputs:** pip `clang==18.*` restored 2026-08-03 into mise python; system libclang-18 + SDL2/GL/X11 headers verified present 2026-08-03; `research/repos/qwcl-original` checkout present.

**Files touched:** none committed. Extraction re-load writes the twin idempotently; regenerated artifacts must leave `git status` clean.

**Tasks:**

1. **Env preflight + QWCL reproduce** -- `agent (workhorse, medium)`, write-grant: working-tree artifact regeneration + idempotent twin re-load only; NO commits. Follow `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` Section 1 (Reproducibility) as the procedure of record, with these cockpit-era parameters:
   - preflight: `python3 -c "from clang.cindex import Index; Index.create()"` exits 0; `ls /usr/include/SDL2/SDL.h /usr/include/GL/gl.h /usr/include/X11/Xlib.h` all present
   - run (D8 bun form): `cd apps/qw-oracle && bun run load-knowledge -- extract-tag --project qwcl --version 2.33 --ordinal 233 --force`
   - diagnostics BEFORE diffing: missing headers manifest as silently dropped entries, not failures (memory `cockpit-oracle-dev-state`) -- check parse diagnostics first
   - `git status --porcelain apps/qw-oracle/` empty afterward; qwcl entity count still 380 (zero row-count delta)

**Phase-boundary verification:** the four probes above, each YES/NO.

**Outputs:** pipeline certified on this box; unblocks any future upstream-tag re-walk.

**Open questions:** none.

**Recovery:** if the maintenance-window cockpit rebuild landed since phase start, re-run the preflight (apt layer changed). If diagnostics show a vanished header class, cross-check ops-letter item 1 status and write a follow-up letter naming the missing package.

---

## Phase 3 -- MCP tool-fit residuals + SDK upgrade

**Goal:** make the server code match the data it serves and the current SDK line, with the contract docs re-truthed. Ends with `bun test` green in `serve/mcp` and a local server against the twin passing manual tool smoke including `describe_mode` override rows.

**Inputs:** Phase 1 certified twin. Verified 2026-08-03: `search-mechanics.ts` ALREADY carries the KTX kinds, the `mode` filter, and returns `ruleset_gate_json` + `props_json` (the 2026-05-30 parking doc and the HANDOVER entry are stale on this -- F2b). The remaining-gap list below is a hypothesis; task 1 re-derives it.

**Files touched:** `serve/mcp/src/tools/describe-mode.ts`, `serve/mcp/src/orientation.ts`, `serve/mcp/package.json` (+ lockfile), `serve/mcp/scripts/verify-rewrite.ts`, `apps/qw-oracle/API_CONTRACTS.md`, `apps/qw-oracle/VISION.md`, plus whatever task 1 adds.

**Tasks:**

1. **Re-derive the tool-fit gap** -- `agent (workhorse, medium)`, read-only. Walk `orientation.ts` promise-by-promise against the tool schemas AND twin data (enumerate the full promise list; no spot-checks). Known suspects: `match_event` advertised for `lookup_entity`/`search_entities` but absent from those tool files per 2026-08-03 grep (F4 -- confirm, then classify per the parking doc's "may be the intentional user-facing five" note); `describe_mode` missing the catalog override rows (F9 -- expected real gap); anything in the 2026-05-30 parking doc already shipped gets recorded as shipped (HANDOVER-sweep feed). Output: confirmed scope for tasks 2-3.
2. **`describe_mode` override surfacing (F9)** -- `agent (workhorse, high)`. Join the `gameplay_entity_defs` KTX override rows + the non-`mode_default` `gameplay_mechanics` override rows by mode token into the envelope (joinability proven per HANDOVER F9 note). Orientation blob updated IN THE SAME COMMIT (parking-doc rule). Probe: local `tools/call describe_mode {mode:"ca"}` returns an overrides section with >= 1 row; `ktx-serving.test.ts` updated + green.
3. **Residual tool-fit from task 1** (incl. `match_event` enum if confirmed as a gap) -- `agent (workhorse, high)`. Same same-commit orientation rule.
4. **SDK upgrade** -- `agent (workhorse, xhigh)`. `@modelcontextprotocol/sdk` `^1.0.0` -> current 1.x. World-facing claims (breaking changes, transport behavior) must cite the SDK changelog/migration docs (context7 or the SDK repo), not conviction. Keep transport + session behavior compatible (D4). Probe: server starts; `initialize` with `protocolVersion: "2025-03-26"` still succeeds via the 2026-08-03 curl literal; `bun test` green.
5. **Smoke-script env fix** -- `agent (workhorse, low)`. `verify-rewrite.ts` spawns the server without propagating `DATABASE_URL` (HANDOVER small-followup, ~15 min). Probe: script runs green against the twin.
6. **Contract truth-up** -- `agent (session-tier, high)` [contract owner]. `API_CONTRACTS.md`: tool catalog (live server says 13 tools), Open-drift list, match_quality story for the widened gameplay surface. `VISION.md`: current-reality section (7 engine projects, tool count). This document is what Phase 4's public verification cites.

**Phase-boundary verification:**
- `bun test` green in `serve/mcp` (DATABASE_URL pointed at a twin-hosted `qw_oracle_test`; `qworacle` is superuser on the twin, create freely)
- local manual smoke: `initialize` OK; tools/list count == API_CONTRACTS catalog; `describe_mode ca` includes override rows; `search_mechanics {kind:"mode_default", mode:"ca"}` returns gated rows
- grep-level check: every kind/type/tool the orientation blob names exists in a tool schema (no over-promise)

**Open questions:** (1) SDK pin -- default: latest 1.x at execution date, agent cites the changelog; operator can overrule. (2) `match_event` enum -- if task 1 finds the omission ambiguous-by-design, HALT that task and ask in chat (cheap gate) rather than guessing.

**Recovery:** if the SDK bump turns gnarly (transport breaking changes), land tool-fit WITHOUT the bump as its own commit, record the SDK as a follow-up finding, and proceed -- D2 still holds (one image rebuild, containing whatever landed).

---

## Phase 4 -- prod refresh + public verification

**Goal:** prod inherits the canonical twin and the Phase 3 image, verified end-to-end on the public endpoint. Ends with every F3 gap probe flipped to PASS on `oracle.slipgate.me` -- the tester-invite bar ("does it work, could someone access it").

**Inputs:** Phase 1 baseline counts; Phase 3 code; prod stack verified 2026-08-03 (`/mnt/user/appdata/qw-oracle/docker-compose.prod.yml`; image `ghcr.io/paradoks81/qw-oracle-mcp:${MCP_VERSION:-latest}`; `dumps/` exists; all four containers dev-plane, full verb set via dev-deploy-proxy).

**Files touched:** repo -- `apps/qw-oracle/DEPLOYMENT.md` (post-fence literal corrections, task 5). Host -- prod DB contents, prod MCP image/container, `dumps/`.

**Tasks:**

1. **Deploy-path probe** -- `agent (workhorse, low)`. (a) Is `docker build` permitted through dev-deploy-proxy? Attempt a trivial 2-line-Dockerfile build in the scratchpad. (b) Does `$DOCKER_CONFIG` hold a GHCR credential with push scope? Inspect registry NAMES only -- never print secret values; if (a) passed, probe push with a throwaway tag. (c) On refusal at either step: ops letter requesting push capability or an ops-side build+push of the Phase 3 image. The data path (task 2) does not wait on this.
2. **Prod data refresh** -- `agent (workhorse, high)`, WRITE-GRANT: prod oracle DB only. Sequence:
   (a) verify prod DB user/db names first: `docker exec qw-oracle-postgres psql -U qworacle -l` (if the role differs, read the compose `environment:`/env_file KEY NAMES, never values);
   (b) rollback dump (D6): `docker exec qw-oracle-postgres pg_dump -U qworacle -d qw_oracle -Fc -f /tmp/prod-pre-refresh.dump` then `docker cp qw-oracle-postgres:/tmp/prod-pre-refresh.dump /mnt/user/appdata/qw-oracle/dumps/prod-pre-refresh-$(date +%F).dump`;
   (c) ship: `docker exec qw-oracle-postgres-dev pg_dump -U qworacle -d qw_oracle -Fc -f /tmp/twin-canon.dump`, `docker cp` twin->host->prod container, then `docker exec qw-oracle-postgres pg_restore --clean --if-exists --no-owner -U qworacle -d qw_oracle /tmp/twin-canon.dump`;
   (d) parity probes: entities-by-project + chat_threads + concepts + gameplay_entity_defs counts on prod == Phase 1 baseline, exactly.
3. **Image rebuild + redeploy** -- `agent (workhorse, high)`, deploy-grant, gated on task 1's outcome. Build from monorepo root per DEPLOYMENT.md's routine-redeploy block (tag with short SHA + `latest`), push, then `cd /mnt/user/appdata/qw-oracle && docker compose -f docker-compose.prod.yml pull mcp && docker compose -f docker-compose.prod.yml up -d mcp`.
4. **Public end-to-end verification** -- `agent (workhorse, low-medium)`, read-only; operator runs or witnesses (deploy floor). Acceptance probes = the 2026-08-03 session curls, verbatim, now expected to PASS:
   - `initialize` -> HTTP 200, serverInfo version bumped past 0.6.0
   - orientation blob lists 7 engine projects incl. qtv + qwfwd
   - `lookup_entity {name:"sv_antilag", project:"mvdsv"}` -> description non-null
   - `lookup_entity` any qtv entity resolves
   - `search_gameplay_entities {query:"shambler"}` -> both id1 AND ktx rows
   - `search_solved_issues` -> thread-shaped results (not `session:` ids)
   - `describe_mode {mode:"ca"}` -> includes the new overrides section
   - `search_mechanics {kind:"mode_default", mode:"ca"}` -> gated rows
   - response headers still show Cloudflare fronting (`cf-ray` present)
   - observability: `query_log` on prod gained rows from these probes (OBSERVABILITY.md cheatsheet query via `docker exec qw-oracle-postgres psql ...`)
5. **DEPLOYMENT.md post-fence corrections** -- `agent (workhorse, low)`. Routine-redeploy + corpus-refresh sections: WSL/`ssh root@` literals -> cockpit/proxy forms actually used in tasks 2-3. Scope-limited to those two sections.

**Phase-boundary verification:** all task-4 probes YES with operator witness; rollback dump deleted only after operator PASS.

**Open questions:** image push path (task 1); if ops turnaround stalls, operator may choose to ship data-only (tasks 2+4 subset) and image later -- surfaced, not defaulted.

**Recovery:** `pg_restore` the rollback dump; `docker compose up -d mcp` with the prior image (GHCR + local cache both retain it).

---

## Findings ledger

Seeded 2026-08-03 from the re-entry session (evidence = session probes, all re-runnable):

- **F1 -- embedding staleness on twin.** 9,370 entities flagged `description_embedding_stale` (ezquake 3616 / fte 3279 / ktx 1203 / mvdsv 892 / qwcl 380). Flag predicate != the embed job's candidate predicate (hash-mismatch-or-null); Phase 1 task 1(a) re-derives the true candidate set. Supersedes HANDOVER's "618 KTX rows need re-embed".
- **F2 -- HANDOVER stale entries** (feed the sweep; not fixed here): (a) L2 entry claims probe-slice-only / ready-for-arc-planner -- twin holds 8,621 threads spanning 2016-04 -> 2026-05, all embedded, resolution labels populated (3,897 solved / 2,523 informational / 1,565 unresolved / 636 null); (b) MCP-realignment entry lists `search_mechanics` kind/mode work as open -- shipped (code verified: kinds enum + mode filter + gate/props in rows); (c) the 618-row re-embed claim (see F1).
- **F3 -- prod data lag** (drives Phase 4): `sv_antilag@mvdsv` description NULL on prod vs 690-char synthesized on twin; qtv/qwfwd absent from prod orientation; `search_gameplay_entities shambler` returns only the ktx row (id1 catalog absent); `search_solved_issues` returns session-shaped results (pre-thread image/data).
- **F4 -- `match_event` advertised but unwired?** Live orientation blob says `entities.type='match_event'` is reachable via `lookup_entity`/`search_entities` with a type filter; 2026-08-03 grep finds no `match_event` in either tool file. Phase 3 task 1 confirms and classifies (real gap vs intentional five-type filter).

## Deferred / out of scope

- FAQ-substrate enrichment (`buckets_question` all-null -- known unshipped Phase E of the L2 arc)
- MCP stateless-core adoption, MCP Apps, auth changes -- website/surfaces arc (D4)
- Tailscale direct MCP route for batch fan-outs (HANDOVER small-followup stands)
- HANDOVER retrospective sweep (separate overdue ritual; F2 is its input)
- docs.quake.world front page, oracle.quake.world showcase, wiki game-modes pilot (federation roadmap arcs)
- dusty-* fork extraction; QTV/QWFWD concept notes; all curation conveyor work (D5)
