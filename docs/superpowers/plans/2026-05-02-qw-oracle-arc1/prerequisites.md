# Prerequisites — Task 0 (operator-driven, before kicking off any phase)

These are one-shot manual steps that the agentic loop cannot do. They take ~30-60 minutes total.

Run through this list once. If anything is already done from prior work, check it off and move on. Do NOT skip the local-dev section — phases 1-7 all run locally before anything ships.

---

## Local-dev environment (required before Phase 1)

- [ ] **Docker Desktop running on Windows.** WSL integration enabled. Test: from WSL, `docker ps` returns successfully.
- [ ] **WSL2 Ubuntu shell accessible.** All work happens here.
- [ ] **Voyage API key.** Sign up at https://www.voyageai.com/ (or via console.anthropic.com if Anthropic now distributes Voyage). Free tier covers Arc 1 build (~500K tokens for entity descriptions + concept chunks).
- [ ] **`apps/qw-oracle/.env` populated** with at minimum:
  ```
  DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle
  VOYAGE_API_KEY=<paste-real-key>
  EMBEDDING_MODEL_BUILD=voyage-4-large
  EMBEDDING_MODEL_QUERY=voyage-4-lite
  EMBEDDING_DIMENSION=1024
  ```
  `.env.example` ships in Phase 1 with all expected vars; copy it then fill in real values.
- [ ] **`.env` is in `.gitignore`.** Verify before any commit.
- [ ] **Source corpus location confirmed.** Check `/home/paradoks/projects/quake/quad/exports/` exists and contains `helpdesk.json`, `quakeworld.json`, etc. If the path has moved, note the new path here so Phase 3 picks it up:

  ```
  Discord exports actual path: /home/paradoks/projects/quake/quad/exports/
  IRC logs actual path: /home/paradoks/projects/quake/quad/exports/mirc-logs/
  ```

  (Update if different; Phase 3 reads this section.)

- [ ] **Snapshot the SQLite entity counts** (used as Phase 2 regression gate per F17):

  ```bash
  cd apps/qw-oracle
  sqlite3 data/knowledge.db "SELECT project, count(*) FROM entities GROUP BY project"
  ```

  Paste the output here:
  ```
  ezquake|<count>
  fte|<count>
  qwcl|<count>
  mvdsv|<count>
  ```

  Phase 2 verification asserts the Postgres counts match these (within 0% — the port should be exact, not "within 5%").

---

## Production / deploy prerequisites (required before Phase 8)

These can wait until Phase 8 starts. They're listed here so the operator knows what's coming.

- [ ] **Unraid SSH access verified.** From WSL: `ssh unraid 'echo ok'` returns `ok`. Tailscale up.
- [ ] **`/mnt/user/appdata/qw-oracle/` directory created on Unraid.** Confirm it's covered by the weekly Unraid → Synology backup. Subdirs: `postgres-data/`, `snapshots/`.
- [ ] **GHCR auth working.**
  - `gh auth status` shows logged in as `ParadokS81` (or the relevant account).
  - `docker login ghcr.io` succeeds.
  - Test push: `docker pull hello-world && docker tag hello-world ghcr.io/paradoks81/test:latest && docker push ghcr.io/paradoks81/test:latest && docker rmi ghcr.io/paradoks81/test:latest`.
- [ ] **Cloudflare Tunnel reachable.** Existing Unraid tunnel is up and healthy. Operator can add a route in the Cloudflare dashboard.
- [ ] **DNS authority for `slipgate.me`.** Operator can add a CNAME for `oracle.slipgate.me`.
- [ ] **Eval set authored** (Phase 8 prerequisite, per D10):
  - `apps/qw-oracle/eval/eval-queries.json` — 10-15 queries with `expected_top_3` and `tools`.
  - `apps/qw-oracle/eval/calibration-queries.json` — 5-8 disjoint queries (different from eval set).
  - Source: browse `#helpdesk` Discord history. Pick queries that span: concept-anchored (vague how-to), exact-name lookups, vague natural-language symptom descriptions, out-of-corpus refusals.
  - Phase 8 ships scaffolds; operator extends.

---

## Decision deferrals (operator clarifies on demand, not now)

These are things the phase drafter may ask about. Pre-decide if you want to short-circuit them; otherwise the phase MD will surface them as open questions.

- [ ] **GHCR image namespace.** Default: `ghcr.io/paradoks81/qw-oracle-mcp:latest`. Alternative: any registry the operator already uses.
- [ ] **Public hostname.** Default: `oracle.slipgate.me`. Alternative: any subdomain under controlled DNS.
- [ ] **Postgres password for prod.** Generate a long random string when authoring the Unraid `.env`. Don't reuse the dev `dev` password.
- [ ] **MCP rate limit.** Default: 60 req/min per IP at Cloudflare. Adjust if expected consumer count is wrong.

---

## What this list deliberately does NOT include

- Anything the agentic loop can do (running `docker compose up`, running migrations, running loaders, running tests, building images locally).
- Anything that gets created by the phases themselves (compose files, Dockerfile, nginx.conf, migration SQL).
- Cleanup / rollback steps. Each phase lands a commit; if a phase needs to be rolled back, `git revert` is the path. No bespoke rollback infrastructure.

---

## Sign-off

When all "Local-dev environment" boxes are checked, the operator can hand the fresh terminal `handoff-prompt.md` and Phase 1 drafting can start.

When all "Production / deploy prerequisites" boxes are checked, Phase 8 can proceed.

If a prerequisite blocks a phase that's already started, the phase pauses at the relevant task and waits.
