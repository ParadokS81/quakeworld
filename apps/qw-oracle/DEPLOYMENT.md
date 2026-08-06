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

**Post-2026-07-28 fence note:** host SSH (`ssh root@100.114.81.91`) has been dead since the
2026-07-28 dev-fencing rebuild. The procedure below is what actually shipped 0.7.0 on
2026-08-04 (oracle-reentry-plumbing arc, Phase 4) via `dev-deploy-proxy` from the dev-cockpit --
no SSH anywhere in the flow. The "First-time deploy" / "Prerequisites" sections above describe
the original 2026-05 provisioning and are left as history; they predate the fence.

```bash
# from the dev-cockpit -- DOCKER_HOST=tcp://dev-deploy-proxy:2375 and DOCKER_CONFIG
# are pre-exported by dotfiles/bashrc.extra, routing every docker verb through the proxy
cd /home/dev/projects/quakeworld   # monorepo root -- Dockerfile COPY paths are root-relative

# 1. build with the final tag baked in. The proxy allows `build` but fences the
#    separate `tag` and `push` verbs (allowlist-by-omission, confirmed in the proxy's
#    own reject log), so there's no push step yet -- publish is pending an ops
#    allowlist: ~/letterbox/to-ops/2026-08-04-deploy-proxy-image-push-allowlist.md
docker build -f apps/qw-oracle/Dockerfile \
             -t ghcr.io/paradoks81/qw-oracle-mcp:<new-version> \
             .

# 2. pin the version in prod's .env (single-line sed -- never cat the file,
#    it holds POSTGRES_PASSWORD and VOYAGE_API_KEY)
sed -i "s/^MCP_VERSION=.*/MCP_VERSION=<new-version>/" /mnt/user/appdata/qw-oracle/.env

# 3. recreate the mcp container from the local image cache -- NO pull step
cd /mnt/user/appdata/qw-oracle
docker compose -f docker-compose.prod.yml up -d mcp
```

**Do not run `docker compose pull mcp`** until the push allowlist lands. GHCR still only has
whatever tag was last actually pushed (pre-fence); a pull today either fails (tag doesn't exist
upstream) or silently rolls the container back to a stale published image. The `MCP_VERSION`
pin in `.env` is what makes `up -d mcp` resolve the freshly-built local image instead of
touching the registry at all -- it is the guard, not a formality.

Postgres state survives image redeploys (volume mount); only the MCP container is replaced.

**Dockerfile maintenance note (F17):** the workspace-shape `COPY package.json` list near the
top of `apps/qw-oracle/Dockerfile` is hand-maintained, one line per `apps/*/package.json`
workspace member. A new workspace app (e.g. `apps/docs-web`, added 2026-06-11) whose COPY line
was never added breaks `bun install --frozen-lockfile` for every subsequent oracle image build,
silently, until someone builds and hits it -- fixed 2026-08-04 (`49ad0b0d`) but re-check the
list whenever a new `apps/*` workspace member is scaffolded.

## Update triggers per codebase

Updates fire on **operator discretion** -- no automation, no cron, no webhooks. The cadence is low enough that operator-poll is sufficient.

| Codebase | Pattern | When to update |
|---|---|---|
| ezquake | Tagged + active head | New stable tag upstream, OR head re-walk for in-development tracking |
| KTX | Tagged + active head | New stable tag upstream, OR head re-walk |
| MVDSV | Tagged + active head | New stable tag upstream |
| FTE | Rolling head only (no real tags) | Operator-cadenced head re-walk on whatever schedule feels right |
| QWCL | Frozen archive (1999 GPL release) | Loaded once at v2.33; never updates |
| QTV | Frozen vendored snapshot (Go `QW-Group/qtv`) | Loaded once at 1.16-dev; re-vendor to update (no `.git`) |
| QWFWD | Frozen vendored snapshot (C qqshka) | Loaded once at 1.40-dev; re-vendor to update (no `.git`) |

Authoritative trigger model + per-codebase scope rationale: `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md`.

## Routine corpus refresh

Use when corpus content has changed but MCP server code has not. Examples:
new Layer 3 concept note, re-extracted ezQuake tag, derive-step bug fix, new
chat session ingest, embedder model bump. The image redeploy section above is
for code changes; this section is for data changes.

**One-time setup:** `mkdir -p /mnt/user/appdata/qw-oracle/dumps` -- already done. Post-fence,
`/mnt/user/appdata/qw-oracle/` is mounted rw directly into the dev-cockpit at this path, so this
is a plain local `mkdir`, no ssh.

**Procedure:**

Twin (`qw-oracle-postgres-dev`) and prod (`qw-oracle-postgres`) are both dev-owned containers
reachable through the same `dev-deploy-proxy` `DOCKER_HOST` from the dev-cockpit -- the whole
flow is `docker exec` / `docker cp`, no scp, no ssh.

```bash
cd /home/dev/projects/quakeworld/apps/qw-oracle

# 0. (if upstream change) extract a new tag -- unchanged from the pre-fence procedure.
#    Skip if refreshing existing data without an upstream pull.
bun scripts/load-knowledge/index.ts extract-tag --project <project> --version <tag>
# example: bun scripts/load-knowledge/index.ts extract-tag --project ezquake --version 3.6.9
# head walk: bun scripts/load-knowledge/index.ts extract-tag --project ezquake --version head

# 1. (if relevant) re-derive descriptions after a derive-step change
npm run load-knowledge --silent --no-workspaces -- re-derive

# 2. re-embed any rows whose description text changed (hash-skip handles no-ops)
npm run embed:entities

# 2b. (if Layer 3 concept notes changed) load the notes into dev and embed their
#     chunks. REQUIRED whenever a .md under curated/concept-notes/ was added or
#     edited -- the loader is the only thing that copies file content into the DB.
#     Idempotent + hash-skips unchanged notes, safe to run on every refresh.
bun scripts/load-concepts/index.ts

# 3. record the at-dump TWIN snapshot -- this is the parity contract step 7 checks
#    prod against. Count entities by project, chat_threads, concepts, gameplay_entity_defs.
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -Atc "<count queries>"

# 4. rollback dump of PROD FIRST (insurance, before anything touches prod)
docker exec qw-oracle-postgres pg_dump -U qworacle -d qw_oracle -Fc \
  -f /tmp/prod-pre-refresh.dump
docker cp qw-oracle-postgres:/tmp/prod-pre-refresh.dump \
  /mnt/user/appdata/qw-oracle/dumps/prod-pre-refresh-$(date +%F).dump

# 5. dump the twin (custom format -Fc -- required by pg_restore --clean --if-exists
#    in step 7) and ship it onto the prod container via the host
docker exec qw-oracle-postgres-dev pg_dump -U qworacle -d qw_oracle -Fc \
  -f /tmp/twin-canon.dump
docker cp qw-oracle-postgres-dev:/tmp/twin-canon.dump /tmp/twin-canon.dump
docker cp /tmp/twin-canon.dump qw-oracle-postgres:/tmp/twin-canon.dump

# 6. stop mcp BEFORE restoring. pg_restore --clean drops and recreates tables;
#    an open connection from mcp holds locks that hang or partially fail the restore.
docker stop qw-oracle-mcp

# 7. restore. --clean --if-exists drops existing objects first (IF EXISTS so a
#    partial prior state doesn't error); --no-owner strips the twin's role
#    ownership so it applies cleanly as qworacle on prod.
docker exec qw-oracle-postgres pg_restore --clean --if-exists --no-owner \
  -U qworacle -d qw_oracle /tmp/twin-canon.dump

# 8. parity check -- prod counts must equal the step-3 twin snapshot exactly
docker exec qw-oracle-postgres psql -U qworacle -d qw_oracle -Atc "<same count queries as step 3>"

# 9. redeploy mcp (stopped in step 6, same image -- this is not a code change)
cd /mnt/user/appdata/qw-oracle
docker compose -f docker-compose.prod.yml up -d mcp
```

Worked example: the **2026-08-06 refresh** (Phase C corpus completion) -- shipped the finished
L2 backfill to prod: `chat_threads` 8,621 -> **40,219**, `thread_messages` 128,971 -> **703,431**,
`messages` 728,863 -> **741,128**. Everything else (entities across all 7 projects, concepts,
gameplay_entity_defs, migrations) was already identical twin-vs-prod, so this was a pure L2
change despite being a wholesale restore. Parity came back **exact on 13/13 metrics**; prod
post-restore showed 0 null embeddings / 0 stale / 0 duplicate thread_keys; mcp healthy on the
same image (embedding-space cosine 0.8896). Artifacts:
`dumps/prod-pre-refresh-2026-08-06.dump` (161MB rollback) + `dumps/twin-canon-2026-08-06.dump`
(349MB shipped snapshot). **Check the twin-vs-prod diff BEFORE dumping** -- a wholesale restore
ships whatever else is on the twin, including another lane's in-flight work.

Earlier worked example: the 2026-08-04 refresh (oracle-reentry-plumbing arc, Phase 4 task 2) --
`/mnt/user/appdata/qw-oracle/dumps/prod-pre-refresh-2026-08-04.dump` (rollback insurance) and
`twin-canon-2026-08-04.dump` (the shipped snapshot); parity came back 15/15 exact (entities by
project, chat_threads, concepts, gameplay_entity_defs, migrations).

The step-4 rollback dump doubles as fresh Tier-2 insurance (see "Rollback" below) --
`prod-pre-refresh-<date>.dump` is worth keeping until the refresh is confirmed good.

No MCP image rebuild is needed -- mcp is stopped only to release DB locks for the restore, then
brought back up on the same image. Prod is unreachable (mcp down, then briefly restoring) for
the duration of steps 6-9; acceptable while the install has no real users beyond the operator.

For surgical refreshes (single project, single entity type), pass per-table flags to pg_dump
(`--table=entities --table=cvar_versions --data-only`) and restore without `--clean`. Default
to the wholesale dump above when in doubt.

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
