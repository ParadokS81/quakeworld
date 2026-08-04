# Oracle re-entry plumbing -- mini-arc plan

**Date:** 2026-08-03. **Weight class:** mini-arc (one repo, 4 phases, days-scale; single-file plan per repo convention).
**Spec basis:** conversation-committed re-entry report 2026-08-03 (session probes, all re-runnable) + `docs/superpowers/parking/2026-05-30-mcp-realignment-ktx-data-handoff.md` (partially stale -- see F2) + HANDOVER MCP-realignment entry (F9 amendment 2026-06-15) + memory `oracle-consumer-status` (tester-invite checklist).
**Arc-end review:** live smoke + operator walkthrough of the public endpoint. No cold reviewer (mini-arc).

## Status

- **Stage:** EXECUTING -- Phase 4 GO 2026-08-04 (gate passed: A2 RATIFIED by operator GO; F13 stays optional-rotation-later; F15 task-0 disposition accepted); tasks 0 + 1 dispatched in parallel
- **Last action:** Phase 3 closed at the gate; Phase 4 scouts out -- task 0 (loader reconciliation of dump-riders on the twin) + task 1 (deploy-path probe: proxy build + GHCR push capability)
- **Next action:** task 0 PASS -> task 2 (rollback dump + twin->prod restore, parity vs at-dump snapshot); task 1 verdict -> task 3 path (direct build+push vs ops letter); then task 4 public verification with operator witness + task 5 DEPLOYMENT.md truth-up
- **Lane:** main checkout (sole worktree at `2c2c4ea7`, clean; no other arc executing per HANDOVER active-arcs review 2026-08-03)

## Operator-side prerequisites

- [ ] None hard-blocking. The maintenance-window bundle (ops letter `~/letterbox/to-ops/2026-08-03-maintenance-window-bundle.md`) can land before/during/after this arc; if the cockpit image rebuild lands mid-arc, re-run Phase 2's env preflight afterward (apt layer changes; the pip clang layer survives in `$HOME` mise python).
- [ ] Phase 4 image push: GHCR PUSH credential from the cockpit is UNVERIFIED (pull is provisioned; push unknown). Task 4.1 probes it; if refused, a second ops letter requests push capability or an ops-side build+push. The data refresh (4.2) proceeds regardless.
- [ ] Voyage spend visibility: Phase 1 re-embeds the job-predicate candidate set -- audited 2026-08-03 at **382 descriptions** (mvdsv 2 + qwcl 380; the draft's 9-10k estimate tracked the vestigial stale FLAG -- see Phase 1 Amendment A1). Batches of 64, voyage-4-large, logged to `embedding_api_log`. Trivial spend; abort criterion in 1.2.

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

**Phase-boundary verification (all YES/NO, runnable as written; amended by A1):**
- candidate-set SQL from 1(a) (the job's own hash predicate) returns 0 rows
- `embedding_api_log` row count strictly increased during the pass
- a second `bun run embed:entities` reports embedded: 0 (idempotency)
- the F1 flag partition is recorded in the Findings ledger (the flag itself is NOT a gate -- A1)

**Amendment A1 (2026-08-03, post-audit adjudication -- do not revert to flag-based gating).** The drafted probe `description_embedding_stale = 0` was unsatisfiable AND wrong as a gate. Migration `019_embedding_freshness_comments.sql` already documents the flag as vestigial: "IGNORED by the embedder... No code reads it as a decision; serve/ never reads it. Observability/legacy; safe drop candidate." Code grep 2026-08-03 confirms zero read-sites (write-sites only: describe-fill / recast-apply / derive scripts set TRUE on touch; the embed job sets TRUE on a failed batch, FALSE on success). The authoritative freshness signal is `description_embedding_sha256`; the gate now uses exactly that. NO flag backfill is performed: no reader benefits, the flag re-inflates on the next content touch by design, and the column COMMENT rides the pg_dump so prod's catalog self-documents the semantics. Column drop deferred (see Deferred list).

**Boundary result (2026-08-03): PASSED.** (a) candidate-set = 0 (orchestrator-run SQL). (b) `embedding_api_log` +6 rows, `source=loader`, 22:55:13-19 UTC, 11,306 input tokens, zero errors -- bracketing caveat: no pre-run snapshot exists because the run fired out of Task 1.2's planned sequence (F7); isolated instead by date+source query. (c) orchestrator-run `bun run embed:entities` -> `embedded=0 failed=0` (plus two agent-run no-ops). (d) vectors = 8,915 = 8,533 + 382 exactly; `embedding_metadata` singleton consistent (`rows_embedded=8915`, `embedded_at=22:55:19`). Voyage spend: 6 calls / 11,306 input tokens.

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
   - preflight (F8-amended; the bare `Index.create()` probe fails by design -- the pipeline routes libclang resolution through `extractor_lib/clang_config.py`): `PYTHONPATH=apps/qw-oracle/scripts/extractors python3 -c "import extractor_lib.clang_config; from clang.cindex import Index; Index.create(); print('cindex OK')"` exits 0 (validated 2026-08-03); `ls /usr/include/SDL2/SDL.h /usr/include/GL/gl.h /usr/include/X11/Xlib.h` all present
   - run (D8 bun form): `cd apps/qw-oracle && bun run load-knowledge -- extract-tag --project qwcl --version 2.33 --ordinal 233 --force`
   - diagnostics BEFORE diffing: missing headers manifest as silently dropped entries, not failures (memory `cockpit-oracle-dev-state`) -- check parse diagnostics first
   - `git status --porcelain apps/qw-oracle/` empty afterward; qwcl entity count still 380 (zero row-count delta)

**Phase-boundary verification:** the four probes above, each YES/NO.

**Boundary result (2026-08-03): PASSED.** Orchestrator re-ran: full-repo `git status --porcelain` empty (artifacts byte-identical); qwcl entities 380; entities total 11,081; `cvar_versions` 54,560 + `command_versions` 13,376 = EXACTLY the Phase-1 pre-run baseline, proving the `--force` reload inserted zero version rows (the qwcl `head`+`2.33` dual partition pre-existed; PK upsert touched in place). Agent run evidence (verbatim in its report): 93 files / 21.3s parse+visit / 236+140+132 raw rows -> entitiesLoaded 187/121/72 = 380; third-invocation idempotency identical, embed side-pass `stale=0 embedded=0`. Diagnostics verdict: zero NEW clang errors -- the 966 raw libclang diagnostics are the stable, pre-existing signature of QWCL's Windows-forced single-pass stub-SDK parse strategy (documented in `clang_config.py`), incl. the permanent header gaps `dpmi.h` / `dinput.h` / `asm/io.h` (F9); the byte-identical diff is the definitive no-new-silent-drops proof. **Pipeline certified on the cockpit.**

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
2. **`describe_mode` override surfacing (the HANDOVER realignment entry's F9 scope -- NOT this ledger's F9, which is the asm/io.h header note)** -- `agent (workhorse, high)`. Join the `gameplay_entity_defs` KTX override rows + the non-`mode_default` `gameplay_mechanics` override rows by mode token into the envelope (joinability proven per HANDOVER F9 note). Orientation blob updated IN THE SAME COMMIT (parking-doc rule). Probe: local `tools/call describe_mode {mode:"ca"}` returns an overrides section with >= 1 row; `ktx-serving.test.ts` updated + green.
3. **Residual tool-fit from task 1** (incl. `match_event` enum if confirmed as a gap) -- `agent (workhorse, high)`. Same same-commit orientation rule.
4. **SDK upgrade** -- `agent (workhorse, xhigh)`. `@modelcontextprotocol/sdk` `^1.0.0` -> current 1.x. World-facing claims (breaking changes, transport behavior) must cite the SDK changelog/migration docs (context7 or the SDK repo), not conviction. Keep transport + session behavior compatible (D4). Probe: server starts; `initialize` with `protocolVersion: "2025-03-26"` still succeeds via the 2026-08-03 curl literal; `bun test` green.
5. **Smoke-script env fix** -- `agent (workhorse, low)`. `verify-rewrite.ts` spawns the server without propagating `DATABASE_URL` (HANDOVER small-followup, ~15 min). Probe: script runs green against the twin.
6. **Contract truth-up** -- `agent (session-tier, high)` [contract owner]. `API_CONTRACTS.md`: tool catalog (live server says 13 tools), Open-drift list, match_quality story for the widened gameplay surface. `VISION.md`: current-reality section (7 engine projects, tool count). This document is what Phase 4's public verification cites.

**Phase-boundary verification:**
- `bun test` green in `serve/mcp` (DATABASE_URL pointed at a twin-hosted `qw_oracle_test`; `qworacle` is superuser on the twin, create freely)
- local manual smoke: `initialize` OK; tools/list count == API_CONTRACTS catalog; `describe_mode ca` includes override rows; `search_mechanics {kind:"mode_default", mode:"ca"}` returns gated rows
- grep-level check: every kind/type/tool the orientation blob names exists in a tool schema (no over-promise)

**Boundary result (2026-08-04): PASSED.** Orchestrator-run battery: suite 22/22 (twin-test DSN); `bunx tsc --noEmit` clean; verify-rewrite ALL PASS (keyed, post-F14 guard -- covers initialize, 13-tool list, per-tool dispatch incl. info_key cross-scope and case-fold contract); direct `describeMode()` probe against the twin -- ca quality=strong applied=73/entity_ov=0/mech_ov=2, bloodfest 0/13/2, yawnmode 0/6/4, race 0/0/3, matching wave D's D13 derivations exactly; `grep -rn "four engine projects"` empty; mode-filter behavior covered by the suite's ktx-serving cases. HTTP-transport compat (2025-03-26 + 2025-11-25 negotiation at 0.7.0) verified in wave C's live probe. Phase commits: `794b3b8e`+`becbd0f9` (B), `46632983` (F12), `18cf26c5` (C), `a133d267` (F14 guard), `43a152a6` (D). Held at the operator gate: A2 ratification, F13 + F15 dispositions.

**Open questions:** (1) SDK pin -- default: latest 1.x at execution date, agent cites the changelog; operator can overrule. (2) `match_event` enum -- if task 1 finds the omission ambiguous-by-design, HALT that task and ask in chat (cheap gate) rather than guessing.

**Recovery:** if the SDK bump turns gnarly (transport breaking changes), land tool-fit WITHOUT the bump as its own commit, record the SDK as a follow-up finding, and proceed -- D2 still holds (one image rebuild, containing whatever landed).

---

## Phase 4 -- prod refresh + public verification

**Goal:** prod inherits the canonical twin and the Phase 3 image, verified end-to-end on the public endpoint. Ends with every F3 gap probe flipped to PASS on `oracle.slipgate.me` -- the tester-invite bar ("does it work, could someone access it").

**Inputs:** Phase 1 baseline counts; Phase 3 code; prod stack verified 2026-08-03 (`/mnt/user/appdata/qw-oracle/docker-compose.prod.yml`; image `ghcr.io/paradoks81/qw-oracle-mcp:${MCP_VERSION:-latest}`; `dumps/` exists; all four containers dev-plane, full verb set via dev-deploy-proxy).

**Files touched:** repo -- `apps/qw-oracle/DEPLOYMENT.md` (post-fence literal corrections, task 5). Host -- prod DB contents, prod MCP image/container, `dumps/`.

**Tasks:**

0. **Pre-dump reconciliation (F15)** -- `agent (workhorse, low)`, WRITE-GRANT: twin via the repo's own loaders ONLY. Re-run `load-concepts` (and the community loader's has_note reconciliation, if one owns it) idempotently against the twin; verify the orphan `dryrun-fps-display` concepts row is pruned and `has_note` counts equal files on disk (players 570, clans 350). If a loader has no pruning path, STOP and surface to the operator before any dump -- no hand-SQL (repair-by-rerun discipline).
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

- **F1 -- embedding staleness on twin. RESOLVED by Phase 1 audit 2026-08-03.** True candidate set (the job's hash predicate): **382 rows** -- mvdsv 2 + qwcl 380, all never-embedded (NULL sha); zero changed-since-last-embed rows; **zero ktx**. The 9,370 flagged-stale rows partition exactly: 382 true candidates + 7,099 already-correctly-embedded (vestigial flag, migration-019-documented) + 1,889 NULL/empty-description (structurally outside the job). Vector arithmetic confirms: 8,533 embedded = 8,915 described - 382. Supersedes BOTH the HANDOVER "618 KTX rows" claim AND this finding's own draft framing (9,370 was the flag count, never the need). See Amendment A1.
- **F5 -- orientation blob under-promises (Phase 3 task 1 + task 6 input; audit 2026-08-03).** (a) Entity-type list: blob's `lookup_entity`/`search_entities` parenthetical names 6 types; twin has 16. Ten unnamed -- 8 appear nowhere in the blob (asset_category, cvar_alias, flag_bit, hud_element, keyname, protocol_message, qc_builtin, token_primitive), 2 only in passing (info_key, log_template). 2,604/11,081 entities (23.5%) carry an unnamed type; log_template alone is 1,887 rows. (b) KTX gameplay kinds prose names 8 of 11 kinds present (missing constant/env_hazard/powerup_behavior, 15 rows -- minor). (c) `search_gameplay_entities` prose names only 'monster'; data has item/projectile/weapon too (36/76 rows, both sources). Data-vs-blob-text finding; whether tool SCHEMAS accept the unnamed values is Phase 3 task 1's call. Engine-project list and gameplay_sources: exact match, no action.
- **F6 -- `.env` DATABASE_URL was dead config on the cockpit (fixed 2026-08-03).** The file placed 2026-07-20 carried the WSL-era `localhost:5432` form; nothing listens on the cockpit's localhost:5432 (probe: connection refused), so every bare `bun run` against the oracle DB has failed at connect since the migration. Both phase agents hit it independently (p1 blocked on it -- correctly; p2 root-caused it and proceeded via the documented override, then shared the fix laterally). Fixed in place: host -> `qw-oracle-postgres-dev`, password sourced from `~/.secrets/dev-databases.env`, secret never printed, file gitignored (no commit). Memory `cockpit-oracle-dev-state` gets the correction at wrap-up.
- **F7 -- Task 1.2's embed executed as a Phase 2 side-effect (provenance resolved; benign by design).** `extract-tag.ts:801` runs `embedEntitiesPass()` as pipeline step 6, so p2's QWCL re-extract (with corrected DATABASE_URL) auto-embedded the 382 pending rows at 22:55:13-19 UTC -- the multi-use loader pattern working as built. Three later manual runs (two by p1, one by the orchestrator) all verified no-ops (`embedded=0`). Lesson: concurrent phases sharing the twin can overlap on pipeline-owned steps; harmless here because every step is idempotent, but boundary evidence must bracket accordingly (see the (b) caveat in the Phase 1 boundary result).
- **F8 -- Phase 2 preflight literal tested the wrong thing (amended in place).** Bare `python3 -c "from clang.cindex import Index; Index.create()"` fails by design (`OSError: libclang.so: cannot open shared object file`): the pipeline always imports `extractor_lib/clang_config.py` first, which calls `Config.set_library_file("libclang-18.so.1")`. Amended literal validated green 2026-08-03 (see Phase 2 task 1). Propagate to the onboard-extractor / validate-extractor skills next time they're touched -- skill edit, not this arc.
- **F10 -- pip clang bindings wiped a SECOND time by the 2026-08-04 cockpit image recreate.** Mechanism proven: the new image's provisioning reinstalls the mise python (install dir mtime 2026-08-04 10:12, site-packages reset to pip-only), so the $HOME location does NOT protect the pip layer across recreates -- the 2026-08-03 assumption was wrong. Apt layer (libclang-18 + headers) is baked and survived, per ops verification + preflight. Reinstalled 2026-08-04, F8 literal green, extraction env re-certified at preflight level. Interim rule after ANY cockpit recreate: `pip3 install 'clang==18.*'` then the F8 preflight. Durable fix owed to ops in the bundle-reply letter: bake the pip install into image provisioning next to the apt layer. Memory `cockpit-oracle-dev-state` corrected.
- **F9 -- `asm/io.h` is a third permanently-missing QWCL header (4 SVGAlib/Linux-console files), joining the documented `dpmi.h`/`dinput.h` pair.** Kernel-internal, never exported to userspace on modern systems; pre-existing (the DB baseline already carried entities from the affected files -- unrelated to the fence rebuild). No action; recorded so future auditors don't chase it. Companion runbook note: `extract.py`'s "Diagnostics: N" counter tracks Python exceptions only, never libclang's `tu.diagnostics` -- the byte-identical diff, not that counter, is the real no-silent-drops evidence. Runbook-improvement candidate, routed to the HANDOVER-sweep feed.
- **Phase 1 baseline counts (2026-08-03, audit-verified; Phase 4 parity contract):** entities 11,081 (ezquake 4,192 / fte 3,279 / ktx 1,892 / mvdsv 1,236 / qtv 52 / qwcl 380 / qwfwd 50); cvar_versions 54,560; command_versions 13,376; chat_threads 8,621; thread_messages 128,971; sessions 86,423; messages 728,863; concepts 46; concept_chunks 416; gameplay_mechanics 514; gameplay_entity_defs id1=52 + ktx=24; maps 254. Post-embed pass, add: entities with description_embedding NOT NULL = 8,915 (was 8,533 pre-pass). Migrations: 21 applied, `001` -> `021`, zero gaps vs `db/migrations/` (programmatic diff).
- **F2 -- HANDOVER stale entries** (feed the sweep; not fixed here): (a) L2 entry claims probe-slice-only / ready-for-arc-planner -- twin holds 8,621 threads spanning 2016-04 -> 2026-05, all embedded, resolution labels populated (3,897 solved / 2,523 informational / 1,565 unresolved / 636 null); (b) MCP-realignment entry lists `search_mechanics` kind/mode work as open -- shipped (code verified: kinds enum + mode filter + gate/props in rows); (c) the 618-row re-embed claim (see F1).
- **F3 -- prod data lag** (drives Phase 4): `sv_antilag@mvdsv` description NULL on prod vs 690-char synthesized on twin; qtv/qwfwd absent from prod orientation; `search_gameplay_entities shambler` returns only the ktx row (id1 catalog absent); `search_solved_issues` returns session-shaped results (pre-thread image/data).
- **F4 -- `match_event` advertised but unwired? CLOSED 2026-08-04 (non-issue).** Phase 3 recon: shipped in commit `a4e47bf3` -- `ENTITY_TYPE_ENUM` + `EntityType` both carry it; the 2026-08-03 grep missed it because the enum lives in `index.ts`/`types.ts`, not the tool files. Bare-name lookup deliberately restricts to the 5 `USER_FACING_TYPES`, matching the blob's "with type='match_event'" phrasing exactly.
- **F11 -- tool-description Discovery gaps (Phase 3 wave B scope; recon 2026-08-04).** (a) `lookup_entity`/`search_entities` description text in `index.ts` still says "four engine projects (ezquake, ktx, fte, mvdsv)" and the `project` param lists only those 4 -- qwcl/qtv/qwfwd invisible at tool-selection time despite unrestricted SQL and orientation.ts naming all 7. (b) Commit `f965dd20` deleted lookup_entity's "info_key cross-scope rule" description sentence while keeping the dormant `isInfoKeyBareLookup` expansion code -- a doc regression, not a design choice. (c) Orientation prose undercounts: 8 of 11 KTX `search_mechanics` kinds named; `search_gameplay_entities` prose names only 'monster' of 4 kinds.
- **F12 -- `match_event` absent from entity-record.ts `VERSION_TABLE` (pre-existing; surfaced by wave B). RESOLVED 2026-08-04, commit `46632983`.** Wired mirroring the cvar_alias pattern; new `lookup-entity.test.ts` (first test coverage for the VERSION_TABLE wiring at all) fixtures a real-shaped death event + pins F4's explicit-only contract; direct twin invocation returns the full deathtype snapshot (8 XSD attributes + emission call site) where `emptyVersion()` used to be. Suite 22/22.
- **F13 -- contained secret print (process incident, self-disclosed by the wave-B agent).** Its `.env` inspection filtered `PASSWORD`/`PW`-prefixed lines but not the connection-string's inline password, so `ORACLE_DEV_PW` appeared once in that agent's own tool output (transcript-only; never entered files, commits, code, or reports; containment verified by the agent and accepted). Exposure surface: the dev twin's credential -- devnet-only, guards reseedable cattle; transcripts live on this box under borg. Disposition: operator's call. Orchestrator recommendation on record: no emergency; optional rotation at a convenient window (ALTER ROLE on the twin + `~/.secrets/dev-databases.env` + `.env`; coordinate with ops if the secrets file is ops-provisioned).
- **F14 -- the "lightning" smoke failure was an env artifact, not a retrieval regression (RESOLVED 2026-08-04; guard added).** verify-rewrite runs without `VOYAGE_API_KEY` silently degrade `search_entities` to lexical-only (the server-side fallback is deliberate Voyage-outage resilience), dropping match_quality below 'strong'. Evidence: 3 keyless runs FAIL identically, 2 keyed runs ALL PASS. Wave C's "pre-existing content issue" read and its 1.29.0 isolation both ran keyless -- conclusion corrected (the isolation still validly proved not-SDK-caused). Fix: env preflight in verify-rewrite.ts (FATAL exit 2 on missing DATABASE_URL / VOYAGE_API_KEY), verified on both paths. Companion wave-C catch, also fixed: serve/mcp package.json's version field had drifted to 0.5.0 vs version.ts's 0.6.0 -- lockstep restored at 0.7.0.
- **F15 -- wave-D residue (dispositions at the gate).** (a) Orphan `concepts` row `dryrun-fps-display` (empty summary, no backing file -- why 46 rows sit behind 45 files) and (b) `community.players.has_note` 571 vs 570 files on disk: both would ride the Phase 4 dump into prod. Disposition: new Phase 4 task 0 reconciles via idempotent loader re-runs, never hand-SQL (repair-by-rerun discipline); a loader without a pruning path HALTS to the operator. (c) Stale "no MCP resolver today" citations in two `_methodology/game-modes` docs + the stale tree-sitter line at `docs/layer1-extraction-roadmap.md:101` -> HANDOVER-sweep feed (F2 family). (d) `docs/arc-history.md:252` "12 tools" is correct AS HISTORY -- the sweep must NOT "fix" it. (e) Arc commit-log attribution is now inconsistent (wave-D commits trailer-less, see F16) -- accepted, no history rewrite.
- **F16 -- upstream-pr-reminder hook was dead config on the cockpit (fixed 2026-08-04).** `MONOREPO_PREFIX` still pointed at the WSL path (`/home/paradoks/...`), so the internal-monorepo pass-through never matched and every internal commit was judged by upstream-PR rules -- wave D's commit was BLOCKED for carrying the internal `Co-Authored-By:` trailer and reasonably committed trailer-less. Third member of the F6 dead-config family (stale-path-after-migration). One-line fix to `/home/dev/projects/quakeworld`; the ledger commit recording this finding carries the internal trailer as the restored pass-through's live positive test.
- **Amendment A2 (2026-08-04, orchestrator adjudication -- operator may overrule at the Phase 3 gate).** `ENTITY_TYPE_ENUM`/`EntityType` widen by 5 types: `info_key`, `log_template`, `protocol_message`, `qc_builtin`, `cvar_alias`. Evidence: VISION.md's own current-reality section documents all 5 as real entity types; the `types.ts:21-23` deliberate-exclusion comment covers ONLY the 5 internal-classifier types (`keyname`/`hud_element`/`token_primitive`/`flag_bit`/`asset_category` -- these STAY excluded); the WHERE clause is already type-agnostic so this is schema-admits-what-the-DB-serves, no new tools, no SQL change.

## Deferred / out of scope

- FAQ-substrate enrichment (`buckets_question` all-null -- known unshipped Phase E of the L2 arc)
- MCP stateless-core adoption, MCP Apps, auth changes -- website/surfaces arc (D4)
- Tailscale direct MCP route for batch fan-outs (HANDOVER small-followup stands)
- HANDOVER retrospective sweep (separate overdue ritual; F2 is its input)
- docs.quake.world front page, oracle.quake.world showcase, wiki game-modes pilot (federation roadmap arcs)
- dusty-* fork extraction; QTV/QWFWD concept notes; all curation conveyor work (D5)
- `entities.description_embedding_stale` column drop (migration-019-documented drop candidate) -- touches ~6 write-sites (describe-fill / recast / derive scripts) + idempotency probes; small standalone cleanup, not this arc (A1)
- ezquake/fte description-coverage gap (1,039 + 1,127 rows with NULL/empty description) -- content work, D5-excluded; already partially tracked by existing describe-fill/help-JSON arcs
