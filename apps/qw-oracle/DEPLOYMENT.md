# qw-oracle - production deploy runbook

## Topology

```
client (Claude Desktop / Claude Code)
  -> https://oracle.slipgate.me/mcp     [Cloudflare Tunnel, TLS, per-IP rate limit 60/min]
       -> Unraid host (Tailscale: 100.114.81.91, LAN: 192.168.1.205)
            -> nginx (192.168.1.205:8080)
                 -> mcp container (qworacle-net)
                      -> postgres container (qworacle-net)
```

Persistent data and configs live at `/mnt/user/appdata/qw-oracle/`:

- `postgres-data/` - Postgres state. Covered by the weekly Unraid -> Synology backup.
- `snapshots/` - empty in Arc 1; Arc 2 will write `manifest.json` and per-snapshot files here.
- `docker-compose.prod.yml`, `nginx.conf`, `.env` - operator-authored copies of `apps/qw-oracle/deploy/`.

## Prerequisites

- Tailscale up; `ssh root@100.114.81.91 'echo ok'` returns `ok`.
- `gh auth status` shows logged in; `docker login ghcr.io` succeeded recently.
- The image at `ghcr.io/paradoks81/qw-oracle-mcp:<tag>` exists (Task 8 of Phase 8 builds + pushes it).

## First-time deploy

1. Copy compose + nginx config to Unraid:

   ```bash
   ssh root@100.114.81.91 'mkdir -p /mnt/user/appdata/qw-oracle/{postgres-data,snapshots}'
   scp apps/qw-oracle/deploy/docker-compose.prod.yml \
       apps/qw-oracle/deploy/nginx.conf \
       root@100.114.81.91:/mnt/user/appdata/qw-oracle/
   ```

2. Author the `.env` on Unraid by copy-pasting `.env.prod.example` and filling in real values:

   ```bash
   ssh root@100.114.81.91
   cd /mnt/user/appdata/qw-oracle
   nano .env                                  # paste from apps/qw-oracle/deploy/.env.prod.example, fill in real secrets
   chmod 600 .env
   ```

   Set `POSTGRES_PASSWORD` to a long random string; set `VOYAGE_API_KEY` to a real key. Leave `MATCH_QUALITY_STRONG_THRESHOLD` and `MATCH_QUALITY_WEAK_THRESHOLD` at the placeholders for now; Task 11 calibrates them against prod and the operator updates them in this file.

3. Bring Postgres up alone first:

   ```bash
   docker compose -f docker-compose.prod.yml pull postgres
   docker compose -f docker-compose.prod.yml up -d postgres
   docker compose -f docker-compose.prod.yml ps
   ```

   Wait until `postgres` is healthy (`State: Up (healthy)`).

4. Pull the MCP image; bring up the rest of the stack:

   ```bash
   docker compose -f docker-compose.prod.yml pull mcp
   docker compose -f docker-compose.prod.yml up -d
   docker compose -f docker-compose.prod.yml ps
   ```

   Wait until `mcp` and `nginx` are running.

5. Migrate the prod DB. From inside the running MCP container:

   ```bash
   docker exec qw-oracle-mcp bun db/migrate.ts
   ```

   Expected: `[migrate] applying 001_init.sql`, then 002, ..., up through the highest migration shipped (`007_query_log.sql` after Phase 7). Final line: `[migrate] up-to-date (N migration(s) total, N newly applied)`.

6. Load the corpus. See Phase 8 Task 10 for the two paths (pg_dump from dev OR re-run loaders against prod). Default: pg_dump | pg_restore from the operator's WSL.

7. Calibrate match-quality thresholds against prod. See Phase 8 Task 11.

8. Run the eval gate against prod. MUST pass before the CF Tunnel route opens public DNS (Task 12).

## Routine redeploy (post-Phase-8)

```bash
# from operator's WSL
cd /home/paradoks/projects/quakeworld
docker build -f apps/qw-oracle/Dockerfile \
             -t ghcr.io/paradoks81/qw-oracle-mcp:<new-tag> \
             -t ghcr.io/paradoks81/qw-oracle-mcp:latest \
             .
docker push ghcr.io/paradoks81/qw-oracle-mcp:<new-tag>
docker push ghcr.io/paradoks81/qw-oracle-mcp:latest

# on Unraid
ssh root@100.114.81.91
cd /mnt/user/appdata/qw-oracle
docker compose -f docker-compose.prod.yml pull mcp
docker compose -f docker-compose.prod.yml up -d mcp
```

Postgres state survives image redeploys (volume mount); only the MCP container is replaced.

## Update triggers per codebase

Updates fire on **operator discretion** -- no automation, no cron, no webhooks. The cadence is low enough that operator-poll is sufficient.

| Codebase | Pattern | When to update |
|---|---|---|
| ezquake | Tagged + active head | New stable tag upstream, OR head re-walk for in-development tracking |
| KTX | Tagged + active head | New stable tag upstream, OR head re-walk |
| MVDSV | Tagged + active head | New stable tag upstream |
| FTE | Rolling head only (no real tags) | Operator-cadenced head re-walk on whatever schedule feels right |
| QWCL | Frozen archive (1999 GPL release) | Loaded once at v2.33; never updates |

Authoritative trigger model + per-codebase scope rationale: `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md`.

## Routine corpus refresh

Use when corpus content has changed but MCP server code has not. Examples:
new Layer 3 concept note, re-extracted ezQuake tag, derive-step bug fix, new
chat session ingest, embedder model bump. The image redeploy section above is
for code changes; this section is for data changes.

**One-time setup** (skip if already done):

```bash
ssh root@100.114.81.91 'mkdir -p /mnt/user/appdata/qw-oracle/dumps'
```

**Procedure:**

```bash
# from operator's WSL -- rebuild the corpus locally first
cd /home/paradoks/projects/quakeworld/apps/qw-oracle

# 0. (if upstream change) extract a new tag. Pulls source, walks libclang,
#    loads into dev Postgres, runs embed-entities inline (hash-skip).
#    Skip this step if you're refreshing existing data without an upstream
#    pull (e.g., derive-step bug fix only).
bun scripts/load-knowledge/index.ts extract-tag --project <project> --version <tag>
# example: bun scripts/load-knowledge/index.ts extract-tag --project ezquake --version 3.6.9
# head walk: bun scripts/load-knowledge/index.ts extract-tag --project ezquake --version head

# 1. (if relevant) re-derive descriptions after a derive-step change
npm run load-knowledge --silent --no-workspaces -- re-derive

# 2. re-embed any rows whose description text changed (hash-skip handles no-ops)
npm run embed:entities

# 2b. (if Layer 3 concept notes changed) load the notes into dev and embed their
#     chunks. This is the Layer 3 analogue of steps 0-2 and is REQUIRED whenever a
#     .md under curated/concept-notes/ was added or edited -- the loader is the only
#     thing that copies file content into the DB. Skipping it means the edited/new
#     note never reaches the dump, and so never reaches prod. Idempotent + hash-skips
#     unchanged notes' embeddings, so it is safe to run on every refresh.
bun scripts/load-concepts/index.ts

# 3. dump from the dev container. Default is a full dump for safety;
#    per-table dumps are an optimisation worth it for big infrequent refreshes.
docker exec qw-oracle-postgres-dev pg_dump -U qworacle -d qw_oracle \
  --no-owner --no-acl --clean --if-exists \
  > /tmp/qw_oracle.sql

# 4. ship to Unraid
scp /tmp/qw_oracle.sql root@100.114.81.91:/tmp/qw_oracle.sql

# 5. archive previous dump on Unraid; prune to last 5 (Tier 2 rollback insurance)
ssh root@100.114.81.91 'cd /mnt/user/appdata/qw-oracle/dumps && \
  cp /tmp/qw_oracle.sql ./qw_oracle-$(date -u +%Y%m%d-%H%M%S).sql && \
  ls -t qw_oracle-*.sql | tail -n +6 | xargs -r rm'

# 6. restore on prod. Single-transaction (-1) so a mid-restore failure
#    auto-rolls instead of leaving prod half-applied. With --clean --if-exists
#    in the dump, DROP statements use IF EXISTS and won't fail.
ssh root@100.114.81.91 \
  'docker exec -i qw-oracle-postgres psql -1 -U qworacle -d qw_oracle < /tmp/qw_oracle.sql'

# 7. sanity check from WSL via the Tailscale connection string. Counts Layer 1
#    entities AND Layer 3 concepts so a missed step-2b shows up here.
DATABASE_URL=postgresql://qworacle:<prod-password>@100.114.81.91:5432/qw_oracle \
  bun -e 'import postgres from "postgres"; const sql = postgres(process.env.DATABASE_URL); const e = await sql`SELECT count(*) FROM entities WHERE description IS NOT NULL`; const c = await sql`SELECT count(*) FROM concepts`; console.log({ entities: e[0].count, concepts: c[0].count }); await sql.end()'
```

No MCP image rebuild is needed -- the server reads live Postgres on each
query. Open MCP queries during the restore window may briefly see stale rows;
acceptable while the install has no real users beyond the operator.

For surgical refreshes (single project, single entity type), pass per-table
flags to pg_dump (`--table=entities --table=cvar_versions --data-only`) and
restore without `--clean`. Default to the wholesale dump above when in doubt.

**Note on `psql -1`:** verified working 2026-05-04 against dev container at
schema v18, including `CREATE EXTENSION IF NOT EXISTS vector` (extension
already present makes it a no-op inside the transaction) and pg_dump 16.13's
`\restrict` meta-command. If a future migration adds a statement that genuinely
cannot run inside a transaction, the next dev-side restore will surface the
error before it reaches prod -- drop `-1` for that procedure and document
the constraint here.

**What this procedure does NOT do:**
- It does NOT regenerate slipgate consumer JSON snapshots. Run
  `bun scripts/load-knowledge/build-snapshot.ts` separately when slipgate-app
  needs a refresh. Out-of-band, operator-discretion. The MCP reads Postgres
  directly and is correct as soon as the restore completes.
- It does NOT run schema migrations on prod. `bun db/migrate.ts` runs on dev
  only; new migrations flow to prod through the dump's `schema_migrations`
  table. See "Migration coordination" in
  `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md`.

## Rollback

Three tiers, layered. **The same procedure that ships a fix rolls back a bad deploy** -- there is no separate rollback button.

**Tier 1 (primary) -- re-promote dev.**
The dev DB IS canonical truth. Fix on dev (revert the bad commit; re-extract if the loader was wrong), then re-dump and re-restore. Zero new infrastructure. Lead time: minutes (re-dump only) to hours (full re-extraction). Works for: bad data, bad embeddings, leaked test data, schema bugs caught after the fact.

**Tier 2 (insurance) -- previous dump on Unraid.**
The Routine corpus refresh procedure archives the previous dump to `/mnt/user/appdata/qw-oracle/dumps/` (rolling N=5). To re-restore from a prior dump:

```bash
ssh root@100.114.81.91 'ls -t /mnt/user/appdata/qw-oracle/dumps/qw_oracle-*.sql | head -5'
# pick the right one, then:
ssh root@100.114.81.91 'docker exec -i qw-oracle-postgres psql -1 -U qworacle -d qw_oracle \
  < /mnt/user/appdata/qw-oracle/dumps/qw_oracle-<timestamp>.sql'
```

**Tier 2.5 (overnight) -- weekly Synology snapshot.**
Already in place. The Unraid backup stops the Docker stack and snapshots `/mnt/user/appdata/qw-oracle/` to Synology weekly. Loses up to a week of changes.

```bash
# stop containers
ssh root@100.114.81.91 'docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml down'
# restore /mnt/user/appdata/qw-oracle/postgres-data/ from Synology snapshot via Unraid GUI
# (Apps -> Synology backup -> restore folder -> postgres-data)
ssh root@100.114.81.91 'docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml up -d'
```

**Tier 3 (true DR) -- GitHub-rebuild path.**
The whole prod stack is reproducible from (a) the qw-oracle git repo + (b) the upstream codebases that are themselves on GitHub. If Unraid AND dev are gone simultaneously: clone qw-oracle, re-extract every codebase tag-by-tag, rebuild dev DB from scratch, dump, restore. Slow but always available. Voyage cost is negligible (~134k of the 200M lifetime grant per arc-history).

## Operator commands

| Action | Command |
|---|---|
| Live MCP logs | `ssh root@100.114.81.91 'docker logs -f qw-oracle-mcp'` |
| Postgres logs | `ssh root@100.114.81.91 'docker logs -f qw-oracle-postgres'` |
| Stack status | `ssh root@100.114.81.91 'docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml ps'` |
| Restart MCP (no config change) | `ssh root@100.114.81.91 'docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml restart mcp'` |
| Apply `.env` changes | `ssh root@100.114.81.91 'cd /mnt/user/appdata/qw-oracle && docker compose -f docker-compose.prod.yml up -d mcp'` (NOT `restart` -- see note below) |
| Tail query_log | `ssh root@100.114.81.91 'docker exec qw-oracle-postgres psql -U qworacle -d qw_oracle -c "SELECT * FROM query_log ORDER BY id DESC LIMIT 10;"'` |
| Run eval against prod | `bun run eval` from operator WSL with `DATABASE_URL=postgresql://qworacle:<prod-password>@100.114.81.91:5432/qw_oracle` |

## Environment-variable changes

`docker-compose.prod.yml` substitutes `${VAR}` references from `.env` at container-create time, not at start time. That means:

- `docker compose restart mcp` keeps whatever values were baked in when the container was last created. Editing `.env` then running `restart` is a silent no-op.
- `docker compose up -d mcp` re-evaluates the compose config. If `.env` changed, this detects the diff and recreates the container with the new values.

Use `restart` only for "kick the running process without changing config" (e.g. clearing a wedged D8-cache state). Use `up -d` whenever you've edited `.env`, including after `bun run calibrate` rewrites the threshold values.

## Troubleshooting

- **`docker compose ps` shows mcp restarting** - check `docker logs qw-oracle-mcp`. Most likely: D8 startup check failed (Voyage build/query divergence) or `DATABASE_URL` cannot reach `postgres` (network name typo).
- **MCP starts but `/health` returns 502 from Cloudflare** - nginx is up but `mcp` is unreachable on `qworacle-net`. Run `docker network inspect qworacle-net` and confirm both containers are attached.
- **Voyage call fails at runtime** - check `embedding_api_log` for the per-call error: `psql -U qworacle -d qw_oracle -c "SELECT called_at, source, error FROM embedding_api_log ORDER BY id DESC LIMIT 5"`. Most common: `VOYAGE_API_KEY` is missing or rate-limited.
- **Eval against prod fails recall@3** - the calibrated thresholds did not transfer cleanly. Re-run `bun run calibrate` against the prod connection string, write the values to Unraid `.env`, then `docker compose -f docker-compose.prod.yml up -d mcp` (NOT `restart` -- see "Environment-variable changes" above). Task 11 of Phase 8 covers this.

- **Calibrated thresholds in `.env` but `match_quality` looks wrong** - same root cause as above: the running container kept the old baked values. Recreate via `up -d mcp` and confirm with `docker exec qw-oracle-mcp env | grep MATCH_QUALITY`.
