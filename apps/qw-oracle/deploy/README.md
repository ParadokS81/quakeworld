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

## Operator commands

| Action | Command |
|---|---|
| Live MCP logs | `ssh root@100.114.81.91 'docker logs -f qw-oracle-mcp'` |
| Postgres logs | `ssh root@100.114.81.91 'docker logs -f qw-oracle-postgres'` |
| Stack status | `ssh root@100.114.81.91 'docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml ps'` |
| Restart MCP only | `ssh root@100.114.81.91 'docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml restart mcp'` |
| Tail query_log | `ssh root@100.114.81.91 'docker exec qw-oracle-postgres psql -U qworacle -d qw_oracle -c "SELECT * FROM query_log ORDER BY id DESC LIMIT 10;"'` |
| Run eval against prod | `bun run eval` from operator WSL with `DATABASE_URL=postgresql://qworacle:<prod-password>@100.114.81.91:5432/qw_oracle` |

## Troubleshooting

- **`docker compose ps` shows mcp restarting** - check `docker logs qw-oracle-mcp`. Most likely: D8 startup check failed (Voyage build/query divergence) or `DATABASE_URL` cannot reach `postgres` (network name typo).
- **MCP starts but `/health` returns 502 from Cloudflare** - nginx is up but `mcp` is unreachable on `qworacle-net`. Run `docker network inspect qworacle-net` and confirm both containers are attached.
- **Voyage call fails at runtime** - check `embedding_api_log` for the per-call error: `psql -U qworacle -d qw_oracle -c "SELECT called_at, source, error FROM embedding_api_log ORDER BY id DESC LIMIT 5"`. Most common: `VOYAGE_API_KEY` is missing or rate-limited.
- **Eval against prod fails recall@3** - the calibrated thresholds did not transfer cleanly. Re-run `bun run calibrate` against the prod connection string and re-write the values to Unraid `.env`. Task 11 of Phase 8 covers this.
