# Prerequisites -- Task 0 (operator-side, before kicking off any phase)

Most of this arc's infrastructure already exists from qw-oracle Arc 1 (Postgres, Voyage, the L2 corpus, the MCP server). This list is short. The one genuinely new, load-bearing item is **the probe's local-only output** that Phase A promotes -- verify it survived before kicking off A.

Run through this once. Items already true from prior work get checked off and skipped.

---

## Already-true from Arc 1 (verify, do not rebuild)

- [ ] **Postgres dev container up.** `docker ps` shows the `pgvector/pgvector:pg16` container; `psql "$DATABASE_URL" -c '\dt'` lists the L1/L2/L3 tables. The migrator works: `bun db/migrate.ts` (from `apps/qw-oracle/`) is a no-op when up to date.
- [ ] **L2 corpus loaded.** `messages` / `sessions` / `session_search` / `message_labels` populated (Arc 1 Phase 3). Sanity: `SELECT count(*) FROM messages;` returns ~700k+. Phase A's `thread_messages` FKs into `messages(id)`, so the corpus must be present.
- [ ] **`apps/qw-oracle/.env` has `VOYAGE_API_KEY` + the embedding model pins:**
  ```
  EMBEDDING_MODEL_BUILD=voyage-4-large
  EMBEDDING_MODEL_QUERY=voyage-4-lite
  EMBEDDING_DIMENSION=1024
  ```
  (Phase A reuses the probe's cache for build embeddings, but the query path -- the rewired `search_solved_issues` -- calls Voyage live at query time.)
- [ ] **MCP server runs locally.** `bun` starts the server; the current `search_solved_issues` answers a query. Phase A's gate (D11) tests the rewired tool the same way.

---

## New for this arc (required before Phase A)

- [ ] **Probe output present (LOCAL-ONLY -- gitignored).** Phase A promotes the already-fenced Feb-Mar 2021 slice. Verify these exist under `apps/qw-oracle/scripts/calibration/scratch/`:
  ```bash
  cd apps/qw-oracle/scripts/calibration
  ls -la scratch/wf-a.json scratch/embed-cache.sqlite
  ls scratch/chunks/ | wc -l        # expect ~221 chunk files
  bun -e 'const d=JSON.parse(require("fs").readFileSync("scratch/wf-a.json","utf8")); console.log("fenced chunks:",d.fenced.length, "| threads:", d.fenced.reduce((a,f)=>a+(f.abstained?0:f.threads.length),0))'
  # expect: fenced chunks: 221 | threads: 1008
  ```
  **If `scratch/` is gone or incomplete** (it is gitignored, so a clean checkout or a manual clean will have wiped it): Phase A's recovery is to regenerate it -- re-run `bun scripts/calibration/01-build-slice.ts` + `02-prep-chunks.ts`, then the Workflow `wf-a-fence-queries.js` against `scratch/wf-a-input.json`. That is ~221 + 30 Sonnet agents (one clean probe run). The embeddings then re-cache on first loader run (small Voyage cost). Phase A's MD documents this recovery path; do not assume the cache is free if scratch was cleared.

- [ ] **Gate query set ready (for Phase A's go/no-go, D11).** Mostly already exists -- confirm the operator is comfortable judging with:
  - `apps/qw-oracle/eval/calibration-queries.json` (existing L1 calibration set -- some apply to chat).
  - the 12 Phase-8 anchors baked into `scripts/calibration/phase8.ts`.
  - the 30 reverse-generated 2021 queries in `scratch/wf-a.json` (`.queries`).
  No new authoring is strictly required; the operator may add a handful of fresh `#helpdesk`-style questions if they want a sharper human anchor.

---

## Not needed (deliberately)

- **No new infra / accounts / secrets.** This arc adds no external service. Voyage + Postgres are inherited.
- **No operator-side LLM cost setup.** All fan-out runs on the Max subscription via the Workflow tool (D9) -- no API key, no billing config. Cost is quota-paced; the operator runs 1-2 backfill batches per session at their own pace.
- **No production deploy prerequisite.** This arc ships locally; the public MCP at `oracle.slipgate.me` picks up the rewired tool on the next normal deploy (out of arc scope).

---

## Sign-off

When the "Already-true from Arc 1" boxes are verified and the probe output is confirmed present (or its regeneration is understood), Phase A can start. Phases C / buckets-E / D do not start until Phase A's gate is green (decisions.md D2).
