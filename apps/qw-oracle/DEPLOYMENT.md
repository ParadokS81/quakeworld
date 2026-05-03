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

## Routine corpus refresh

Use when corpus content has changed but MCP server code has not. Examples:
new Layer 3 concept note, re-extracted ezQuake tag, derive-step bug fix, new
chat session ingest, embedder model bump. The image redeploy section above is
for code changes; this section is for data changes.

```bash
# from operator's WSL -- rebuild the corpus locally first
cd /home/paradoks/projects/quakeworld/apps/qw-oracle

# 1. (if relevant) re-derive descriptions after a derive-step change
npm run load-knowledge --silent --no-workspaces -- re-derive

# 2. re-embed any rows whose description text changed (hash-skip handles no-ops)
npm run embed:entities

# 3. dump from the dev container. Default is a full dump for safety;
#    per-table dumps are an optimisation worth it for big infrequent refreshes.
docker exec qw-oracle-postgres-dev pg_dump -U qworacle -d qw_oracle \
  --no-owner --no-acl --clean --if-exists \
  > /tmp/qw_oracle.sql

# 4. ship to Unraid and restore over the Tailscale link
scp /tmp/qw_oracle.sql root@100.114.81.91:/tmp/qw_oracle.sql
ssh root@100.114.81.91 \
  'docker exec -i qw-oracle-postgres psql -U qworacle -d qw_oracle < /tmp/qw_oracle.sql'

# 5. sanity check from WSL via the Tailscale connection string
DATABASE_URL=postgresql://qworacle:<prod-password>@100.114.81.91:5432/qw_oracle \
  bun -e 'import postgres from "postgres"; const sql = postgres(process.env.DATABASE_URL); const r = await sql`SELECT count(*) FROM entities WHERE description IS NOT NULL`; console.log(r); await sql.end()'
```

No MCP image rebuild is needed -- the server reads live Postgres on each
query. Open MCP queries during the restore window may briefly see stale rows;
acceptable while the install has no real users beyond the operator.

For surgical refreshes (single project, single entity type), pass per-table
flags to pg_dump (`--table=entities --table=cvar_versions --data-only`) and
restore without `--clean`. Default to the wholesale dump above when in doubt.

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
