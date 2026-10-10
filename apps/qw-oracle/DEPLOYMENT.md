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

- `postgres-data/` - Postgres state. The compose bind-mounts it via `/mnt/cache/appdata/qw-oracle/postgres-data` (same bytes; Postgres must not run over the shfs layer -- comment in the compose). Inside the nightly borgmatic appdata backup, which is ops-plane: the record is the ops-owned unraid repo (`docs/server/backup.md`), not this file.
- `snapshots/` - served read-only by nginx at `https://oracle.slipgate.me/snapshots/`. Holds `brain-manifest.json`, oracle-web's brain manifest (`bun scripts/build-brain-manifest.ts --publish` writes it here).
- `dumps/` - rollback and shipped dumps from the corpus-refresh procedure below (`prod-pre-refresh-<date>.dump`, `twin-canon-<date>.dump`, `twin-l2-<date>.dump`; the 2026-05 `qw_oracle-*.sql` files predate the custom-format switch).
- `docker-compose.prod.yml`, `nginx/default.conf` (from `deploy/nginx.conf`; directory mount over conf.d), `.env` - the deployed copies of `apps/qw-oracle/deploy/`.

The whole tree is mounted read-write into the dev-cockpit at the same path (since the 2026-07-28 fence), so every step below is a plain local file operation plus `docker` verbs through `dev-deploy-proxy` (`DOCKER_HOST`, exported by `dotfiles/bashrc.extra`). There is no SSH to the host and no network route from the cockpit to the prod Postgres; both prod containers are dev-owned and reachable through `docker exec` / `docker cp`.

## Prerequisites

- A shell with the cockpit's docker environment: `docker ps` lists `qw-oracle-mcp`, `qw-oracle-nginx`, `qw-oracle-postgres` (if it says "cannot connect to the docker API at unix:///var/run/docker.sock", source `dotfiles/bashrc.extra`).
- `/mnt/user/appdata/qw-oracle/` writable; a denied write there is an ownership relic -- letter to ops, never chown.
- The MCP image is **built locally**, not pulled: `DOCKER_CONFIG=$HOME/.secrets/docker` holds a read-only GHCR credential (never `docker login`), and the proxy fences the `tag` and `push` verbs, so GHCR still carries the last pre-fence tag (root HANDOVER: "GHCR `latest` tag stale"; the push-allowlist letter of 2026-08-04 is still open).
- Secrets go into the deployed `.env` with `secret-drop env /mnt/user/appdata/qw-oracle/.env <KEY>`; never typed inline, never `cat`-ed.

## First-time deploy

Not re-run since the 2026-07-28 fence (the stack was provisioned 2026-05 over SSH from the WSL workstation); the steps are the routine ones below plus the one-time file copies, written here in cockpit form.

1. Lay out the appdata tree and copy the deploy files:

   ```bash
   mkdir -p /mnt/user/appdata/qw-oracle/{snapshots,nginx,dumps}   # postgres-data is created by docker on first up (host path under /mnt/cache)
   cp apps/qw-oracle/deploy/docker-compose.prod.yml /mnt/user/appdata/qw-oracle/
   cp apps/qw-oracle/deploy/nginx.conf /mnt/user/appdata/qw-oracle/nginx/default.conf   # the compose mounts the DIRECTORY over conf.d
   ```

2. Author `.env` from `deploy/.env.prod.example` (keys: `POSTGRES_PASSWORD`, `VOYAGE_API_KEY`, the `EMBEDDING_*` trio, `EMBEDDING_VERIFY_TTL_HOURS`, `PUBLIC_BASE_URL`, `MCP_VERSION`). Secrets via `secret-drop env`; the rest by plain editing; `chmod 600`. The `match_quality` cut-offs need no entry: calibrated defaults ship in the image (`serve/mcp/src/grade.ts`); the optional `*_MATCH_STRONG` / `*_MATCH_WEAK` overrides are described in `eval/README.md`.

3. Postgres first, then the rest:

   ```bash
   cd /mnt/user/appdata/qw-oracle
   docker compose -f docker-compose.prod.yml up -d postgres        # pulls pgvector/pgvector:pg16
   docker compose -f docker-compose.prod.yml ps                    # wait for Up (healthy)
   # build + pin the mcp image as in "Routine redeploy" below, then:
   docker compose -f docker-compose.prod.yml up -d
   ```

4. Migrate: `docker exec qw-oracle-mcp bun db/migrate.ts` -- expect `[migrate] applying 001_init.sql` ... through the newest file in `db/migrations/`, then `[migrate] up-to-date (N migration(s) total, N newly applied)`.

5. Load the corpus by the twin -> prod dump/restore in "Routine corpus refresh" below (the loaders never run against prod).

6. Verify from outside: `curl -s https://oracle.slipgate.me/health` and one tool call through a client. The eval gate (`bun run eval`) runs against the twin, whose content prod mirrors after a refresh; prod is not reachable from the cockpit as a `DATABASE_URL`.

## Routine redeploy (code change)

The flow that shipped 0.7.0 on 2026-08-04 (oracle-reentry-plumbing arc, Phase 4) and 0.8.0 on 2026-10-02 (the image prod runs today: `docker ps --filter name=qw-oracle-mcp --format '{{.Image}}'`) -- from the dev-cockpit, no SSH anywhere in it.

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
bun scripts/load-knowledge/index.ts re-derive

# 2. re-embed any rows whose description text changed (hash-skip handles no-ops)
bun run embed:entities

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

Worked example: the **2026-10-02 refresh** (the 2026-10-01/02 harvest; first surgical one) --
`chat_threads` 40,219 -> **40,943**, `thread_messages` 703,431 -> **709,629**, `messages`
741,128 -> **747,392**. The pre-dump diff (all 59 tables: row count plus a whole-table content
hash, and a schema-only `pg_dump` diff) found the schema and every non-chat table identical, but
three prod-written runtime tables diverged: `query_log` (prod 370 vs twin 215 -- 171 rows of real
MCP use since 08-06), `embedding_api_log` (both sides grew) and
`oracle_meta.embedding_space_verified_at` (the MCP stamps it at startup). A wholesale restore
replaces those with the twin's copies; the 08-06 one silently dropped 10 prod-only query-log rows
(checked against its rollback dump). So this refresh shipped **only the nine chat tables**
(operator call) and left prod's logs alone:

```bash
docker exec qw-oracle-postgres-dev pg_dump -U qworacle -d qw_oracle -Fc \
  -t public.messages -t public.message_labels -t public.sessions -t public.session_search \
  -t public.session_references -t public.chat_threads -t public.thread_messages \
  -t public.import_log -t public.processing_log -f /tmp/twin-l2.dump
# (ship it to prod as in step 5, stop mcp as in step 6)
docker exec qw-oracle-postgres pg_restore --clean --if-exists --no-owner --single-transaction \
  -U qworacle -d qw_oracle /tmp/twin-l2.dump
```

Safe as a subset because the nine tables' foreign keys stay inside the set and no view or trigger
touches them; `--single-transaction` means a failed restore leaves prod as it was. Parity came
back **exact on 12/12** (count + content hash for each of the nine, plus solved / null-embedding /
stale thread counts). MCP down 75 s (restore 47 s); healthy on the same 0.7.0 image
(embedding-space cosine 0.8890); the public `search_solved_issues` returned the 2026-09-24
crosshair-centering thread at rank 1. Artifacts: `dumps/prod-pre-refresh-2026-10-02.dump`
(349MB, full prod rollback) + `dumps/twin-l2-2026-10-02.dump` (307MB, the nine tables shipped).

Earlier worked example: the **2026-08-06 refresh** (Phase C corpus completion) -- shipped the finished
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
the duration of steps 6-9 -- 75 s for the 2026-10-02 surgical restore. The public MCP has real
users beyond the operator (`query_log` since 2026-08: Claude.ai, Claude Code and Codex clients plus
at least one outside consumer), so step 6 waits for the operator's explicit go.

**Choosing wholesale or surgical -- decide from the diff, not by default.** A wholesale restore
replaces prod's own runtime logs (`query_log`, `embedding_api_log`, `oracle_meta`) with the twin's
copies, erasing prod's record of real usage since the last refresh; a surgical one leaves them.
So: when the diff is confined to a set of tables (a harvest is the chat tables), go surgical --
dump just those tables with `-t` and restore with `--clean --if-exists --single-transaction`, the
2026-10-02 example above being the proven recipe; first check that the chosen tables' foreign
keys stay inside the set. Go wholesale only when the change is too broad to list (a schema
change across many tables), and then export prod's `query_log` and `embedding_api_log` first and
re-insert the rows the twin lacks after the restore.

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

**Tier 2 (insurance) -- previous dump in `dumps/`.**
Every corpus refresh leaves `prod-pre-refresh-<date>.dump` (prod as it was) and the shipped twin dump beside it in `/mnt/user/appdata/qw-oracle/dumps/` (custom format, `pg_dump -Fc`). To re-restore one:

```bash
ls -t /mnt/user/appdata/qw-oracle/dumps/*.dump | head -5
docker cp /mnt/user/appdata/qw-oracle/dumps/<file>.dump qw-oracle-postgres:/tmp/rollback.dump
docker stop qw-oracle-mcp                                  # release the locks, as in refresh step 6
docker exec qw-oracle-postgres pg_restore --clean --if-exists --no-owner --single-transaction \
  -U qworacle -d qw_oracle /tmp/rollback.dump
cd /mnt/user/appdata/qw-oracle && docker compose -f docker-compose.prod.yml up -d mcp
```

The 2026-05 `qw_oracle-<timestamp>.sql` files there are plain SQL from the pre-fence era; those restore with `docker exec -i qw-oracle-postgres psql -1 -U qworacle -d qw_oracle < <file>.sql` instead. Pruning old dumps is manual.

**Tier 2.5 (overnight) -- borgmatic appdata backup.**
Ops-plane. `/mnt/user/appdata` (plus per-DB dumps) goes to the Synology Borg repo nightly at 03:00 and on to an offsite mirror; the record is the ops-owned unraid repo (`docs/server/backup.md`, readable from the cockpit with `git --git-dir=/home/dev/repos/unraid.git show HEAD:docs/server/backup.md`). A restore of `postgres-data/` from it is a letter to ops; the stack then comes back from the cockpit with `docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml up -d`. Loses up to a day of prod-written rows (`query_log`, `embedding_api_log`).

**Tier 3 (true DR) -- GitHub-rebuild path.**
The whole prod stack is reproducible from (a) the qw-oracle git repo + (b) the upstream codebases that are themselves on GitHub. If Unraid AND dev are gone simultaneously: clone qw-oracle, re-extract every codebase tag-by-tag, rebuild dev DB from scratch, dump, restore. Slow but always available. Voyage cost is negligible (~134k of the 200M lifetime grant per arc-history).

## Operator commands

| Action | Command |
|---|---|
| Live MCP logs | `docker logs -f qw-oracle-mcp` |
| Postgres logs | `docker logs -f qw-oracle-postgres` |
| Stack status | `docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml ps` |
| Running image version | `docker ps --filter name=qw-oracle-mcp --format '{{.Image}}'` (`inspect` is blocked box-wide) |
| Restart MCP (no config change) | `docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml restart mcp` |
| Apply `.env` changes | `cd /mnt/user/appdata/qw-oracle && docker compose -f docker-compose.prod.yml up -d mcp` (NOT `restart` -- see note below) |
| Tail query_log | `docker exec qw-oracle-postgres psql -U qworacle -d qw_oracle -c "SELECT queried_at, tool, left(query_text,60), match_quality FROM query_log ORDER BY id DESC LIMIT 10;"` |
| Public health | `curl -s https://oracle.slipgate.me/health` |
| Eval / calibrate | `bun run eval` / `bun run calibrate` from `apps/qw-oracle/` against the twin (prod has no route from the cockpit; after a refresh the twin's content is prod's) |

## Environment-variable changes

`docker-compose.prod.yml` substitutes `${VAR}` references from `.env` at container-create time, not at start time. That means:

- `docker compose restart mcp` keeps whatever values were baked in when the container was last created. Editing `.env` then running `restart` is a silent no-op.
- `docker compose up -d mcp` re-evaluates the compose config. If `.env` changed, this detects the diff and recreates the container with the new values.

Use `restart` only for "kick the running process without changing config" (e.g. clearing a wedged D8-cache state). Use `up -d` whenever you've edited `.env`, including after `bun run calibrate` rewrites the threshold values.

## Troubleshooting

- **`docker compose ps` shows mcp restarting** - check `docker logs qw-oracle-mcp`. Most likely: D8 startup check failed (Voyage build/query divergence) or `DATABASE_URL` cannot reach `postgres` (network name typo).
- **MCP starts but `/health` returns 502 from Cloudflare** - nginx is up but `mcp` is unreachable on `qworacle-net`. Run `docker network inspect qworacle-net` and confirm both containers are attached.
- **Voyage call fails at runtime** - check `embedding_api_log` for the per-call error: `psql -U qworacle -d qw_oracle -c "SELECT called_at, source, error FROM embedding_api_log ORDER BY id DESC LIMIT 5"`. Most common: `VOYAGE_API_KEY` is missing or rate-limited.
- **The eval gate fails recall@3** - run it against the twin (the only reachable DB). If the cut-offs are wrong, recalibrate (`bun run calibrate`, `eval/README.md`), then either rebuild the image with the new `DEFAULT_CUTOFFS` or set the `*_MATCH_STRONG` / `*_MATCH_WEAK` overrides in the deployed `.env` and `docker compose -f docker-compose.prod.yml up -d mcp` (NOT `restart` -- see "Environment-variable changes" above).

- **Calibrated thresholds in `.env` but `match_quality` looks wrong** - same root cause as above: the running container kept the old baked values. Recreate via `up -d mcp` and confirm with `docker exec qw-oracle-mcp env | grep _MATCH_`.
