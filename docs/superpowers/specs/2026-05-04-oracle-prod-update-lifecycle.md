# QW Oracle -- Prod Update Lifecycle (Design Spec)

**Date:** 2026-05-04
**Status:** Locked. Pass 2 of the KTX Onboarding arc closed end-to-end via arc-brainstormer.
**Scope:** the canonical procedure for getting new Layer 1 rows from a dev extraction into the prod Postgres at `oracle.slipgate.me/mcp`. Generalises beyond KTX -- this is what every future Layer 1 update arc cites (every ezquake tag bump, FTE head re-walk, MVDSV release, plus first-time onboarding of new codebases).

**Sibling spec:** `2026-05-04-ktx-onboarding-design.md` (the KTX-specific onboarding arc; this spec is its prod-deploy companion).

**Drain origin:** Pass 2 of the multi-pass arc-brainstormer for KTX onboarding. Pass 2 was framed as "prod-MCP update lifecycle" but expanded mid-pass to "canonical Layer 1 update procedure end-to-end" once the operator surfaced the broader pipeline picture (pull -> extract -> embed -> dump -> restore -> consumer-snapshot regen).

---

## The pipeline

```
upstream change (operator-noticed)
  -> git pull <repo>@<tag>
  -> apps/qw-oracle/scripts/load-knowledge/extract-tag.ts
       (drives Python+libclang handlers; emits per-codebase AST JSON;
        also runs load-* CLIs and embed-entities inline per Phase 5 wiring)
  -> derive-entity-description (folded into extract-tag for routine refresh)
  -> embed-entities (hash-skip on description_embedding_sha256;
                     only changed descriptions pay Voyage tokens)
  -> [pg_dump from dev container -> scp -> psql -1 restore on Unraid]
  -> [optional] build-snapshot (slipgate JSON consumer; out-of-band,
                                operator-discretion, NOT coupled to oracle deploy)
```

Each arrow is a discrete CLI call with a documented entry point. Pipeline state is queryable from Postgres (`query_log`, `embedding_api_log`, `schema_migrations`, `oracle_meta`). No implicit terminal interaction in any stage. This shape is **future-script-friendly** -- a future admin-panel wrapper composes the existing CLIs without needing a procedure redesign.

## Unraid scope

Unraid hosts **two containers only**:
- `qw-oracle-postgres` (pgvector/pgvector:pg16; persistent volume at `/mnt/user/appdata/qw-oracle/postgres-data/`).
- `qw-oracle-mcp` (Streamable HTTP transport behind nginx + Cloudflare Tunnel).

Everything that **produces** what Unraid serves lives in dev (operator's WSL):
- Repo pulls and libclang/tree-sitter extraction.
- `load-knowledge` import into the dev Postgres container (`qw-oracle-postgres-dev`).
- Voyage embedding (hash-skip handles deltas).
- `build-snapshot` regen for slipgate consumers.

Promotion to prod is two paths, kept separate:
- **Data change** -> `pg_dump --clean --if-exists` from dev container -> scp to Unraid -> `psql -1 < dump.sql` into the prod Postgres container. CHECK widenings + new entity types ride the dump. No `bun db/migrate.ts` needed on prod after the first-time install.
- **MCP code change** -> `docker build` + `docker push` to ghcr.io -> `docker compose pull mcp + up -d mcp` on Unraid. Postgres state untouched.

This division stays in place until the showcase-site arc reconsiders it (see "Future evolution" below). Until then, Unraid is **never** asked to run libclang / Bun / Voyage -- those are operator-side dev tooling.

---

## Sub-question 2.1 -- data-flow shape: LOCKED

**Decision:** B -- `pg_dump --clean --if-exists` from dev, `psql` restore on prod.

**Rationale:**
- Tested end-to-end during Arc 1 Phase 8 deploy and the post-Phase-6 placeholder-threshold smoke.
- Embeddings ride the dump as binary `vector(1024)` columns -- no double-spend on Voyage. Hash-skip in dev means re-embedding is idempotent; prod just gets the result.
- `pg_dump --clean --if-exists` rolls schema + CHECK constraints + data atomically. The `schema_migrations` table is part of the dump, so prod's schema and migration log match dev's after restore.
- Single artifact (~50MB) is checksummable, ships over Tailscale fast, and survives if a load goes wrong (you keep prior dumps).

**Alternatives evaluated and rejected:**
- **A. Re-run loaders against prod connection string.** Worse: thousands of inserts over Tailscale, prod sees partial state during the run, Voyage API key needs to live in the prod env, no atomic switchover.
- **C. Binary snapshot artifact (versioned tarball).** Overkill until non-operator consumers need versioned snapshots. The slipgate JSON snapshot mechanism is the closest existing analogue to C; further work belongs to the consumer-delta-update future arc, not the prod-MCP path.

**Surgical refresh option:** for big infrequent refreshes, `pg_dump --table=entities --table=cvar_versions --data-only` (per-table + data-only) skips schema regeneration. Default to wholesale dump.

---

## Sub-question 2.2 -- consumer-snapshot regen: LOCKED

**Decision:** decoupled. `build-snapshot` runs out-of-band, operator-discretion. NOT part of the oracle deploy procedure.

**Rationale:**
- Slipgate-app has zero real users (deep dev, brainstorming Quake Manager). The current `build-snapshot` writing to `apps/slipgate-app/src/lib/config/data/` is a dev-time convenience -- snapshots ship inside slipgate-app's git history.
- Coupling commits oracle pulls to slipgate releases mechanically. Slipgate's release cadence is its own thing; you do not necessarily ship a slipgate version every time you re-walk an ezquake tag.
- The MCP does not read JSON snapshots -- it reads Postgres directly. Prod MCP becomes correct as soon as the dump restores; slipgate-app correctness lags by however long until the operator regenerates and ships.

**Future evolution captured separately:** the production-shape consumer flow -- snapshot artifact hosted centrally with delta-update pull -- is a separate future arc, captured at end-of-Pass-2 in the showcase-site parking doc (extension section).

---

## Sub-question 2.3 -- per-codebase trigger model: LOCKED

**Decision:** operator-poll for all codebases. No automation today.

**Per-codebase release reality (verified 2026-05-04 against research repos):**

| Codebase | Tag scheme | Recent cadence | Latest tag | Pattern |
|---|---|---|---|---|
| ezquake | semver `3.6.9` (legacy `ezquake_22-3_stable` for old) | 2-6 months between stable | 3.6.9 (2026-03-01) | Tagged + active head |
| KTX | semver-ish `1.46` / `v1.43` | ~yearly stable | 1.46 (2025-09-14) | Tagged + active head |
| MVDSV | semver `0.36 -> v1.00 -> 1.11` (recent reset) | ~yearly stable | 1.11 (2025-02-27) | Tagged + active head |
| FTE | 1 tag total (`2025-09-27`, date-stamped) | Rolling commits only | head | Effectively head-only |
| QWCL | 0 tags, 2 commits ever (1999 GPL release + QC dump) | -- | -- | Frozen archive |

**Three trigger modes:**

1. **Tagged + active** (ezquake, KTX, MVDSV) -- new stable tag IS the trigger. Operator notices new tag upstream; runs the pipeline. Optional head re-walks for in-development tracking.
2. **Rolling head only** (FTE) -- no tags to watch. Operator-cadenced re-walk on whatever schedule (probably aligned with major QW community events; no fixed cadence).
3. **Frozen** (QWCL) -- loaded once at v2.33, no updates expected.

**KTX-specific scope (2.3a):** mirror ezquake. Head + stable tags back to a parse-clean floor. Strong starting guess: 1.40 (2020) or 1.41 (2022). Pre-2020 tags may have C-style issues. Floor selection deferred to KTX execution Phase 0 spike: walk back tag by tag, stop at first tag where libclang fails to parse without major handler changes.

**Generalised trigger model (2.3b):** operator-poll. The operator already watches Discord and GitHub through normal browsing. Adding a notify channel for ~1 stable release per codebase per year is overengineering. Cron-based upstream-drift detection is captured as a small followup (revisit if cadence increases or if non-operator contributors join the loader workflow).

---

## Sub-question 2.4 -- migration coordination: LOCKED

**Decision:** implicit. Migrations only need to be applied on dev. The dump-restore IS the migration mechanism on prod.

**Mechanics (verified against `db/migrate.ts` and existing migration files):**
- `schema_migrations` is a regular user table (filename PK + applied_at + sha256). pg_dump includes it by default.
- All CHECK constraints are inline in CREATE TABLE statements (e.g., `project TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl'))`).
- `pg_dump --clean --if-exists` emits DROP TABLE -> CREATE TABLE -> COPY -- all CHECK constraints + new tables + new columns regenerate at restore time with the dev schema shape.
- `bun db/migrate.ts` runs only on dev (and on the first-time prod install per DEPLOYMENT.md step 5). After that, migrations flow through dumps.

**Procedure for any migration-bearing update:**
1. Author migration file in `apps/qw-oracle/db/migrations/<NNN>_<name>.sql`.
2. Apply to dev: `bun db/migrate.ts`.
3. Run extract/load/embed against the new schema.
4. Dump dev, restore prod. Migration is now active on prod.

**Discipline that makes this safe:** schema migrations are append-only by design (enforced by SHA-check in migrate.ts). Pure-additive migrations (CHECK widenings, new tables, new columns with defaults) are the dominant pattern. Data-reshaping migrations (column renames, type changes) are rare and warrant case-by-case planning -- they may need explicit prod-side sequencing.

**KTX-specific:**
- `entities.project` CHECK already includes `'ktx'` per `002_layer1_schema.sql`. No widening needed there.
- One new migration for KTX: widen `log_template_versions.channel` CHECK to admit `'logfile'`. Pure additive.

---

## Sub-question 2.5 -- rollback shape: LOCKED. Three tiers + true DR.

**Tier 1 (primary) -- re-promote dev.**
The dev DB IS canonical truth. To rollback prod, fix the issue on dev (revert the bad commit; re-run extract/load if the extractor was wrong), then re-dump and re-restore. Zero new infrastructure. Works for: bad data, bad embeddings, leaked test data, schema bugs caught after the fact. Lead time: minutes if a re-dump is enough; hours if re-extraction needed. **The same procedure that ships a fix rolls back a bad deploy -- there is no separate rollback button.**

**Tier 2 (insurance) -- rolling N dumps on Unraid.**
Before each new restore, archive the previous dump and prune to the last 5. Suggested filename pattern: `qw_oracle-<UTC-timestamp>.sql` at `/mnt/user/appdata/qw-oracle/dumps/`. ~50MB each; cheap. Multiple rollback points cover the case where a bug is subtle and only discovered after a couple of intermediate deploys.

```bash
# one-time setup
ssh root@100.114.81.91 'mkdir -p /mnt/user/appdata/qw-oracle/dumps'

# before each new restore: archive and prune to last 5
ssh root@100.114.81.91 'cd /mnt/user/appdata/qw-oracle/dumps && \
  cp /tmp/qw_oracle.sql ./qw_oracle-$(date -u +%Y%m%d-%H%M%S).sql && \
  ls -t qw_oracle-*.sql | tail -n +6 | xargs -r rm'

# new restore (single transaction)
ssh root@100.114.81.91 'docker exec -i qw-oracle-postgres psql -1 -U qworacle -d qw_oracle < /tmp/qw_oracle.sql'
```

**Tier 2.5 (overnight) -- weekly Synology snapshot.**
Already in place. The Unraid backup stops the Docker stack and snapshots `/mnt/user/appdata/qw-oracle/` to Synology weekly. Loses up to a week. Restore via Unraid GUI: stop containers -> restore postgres-data dir -> start containers.

**Tier 3 (true DR) -- GitHub-rebuild path.**
The whole prod stack is reproducible from (a) the qw-oracle git repo + (b) the upstream codebases that are themselves on GitHub. If Unraid AND dev disappear simultaneously: clone qw-oracle, re-extract every codebase tag-by-tag, rebuild dev DB from scratch, dump, restore. Slow (hours of operator time) but always available. Voyage cost is negligible (~134k of the 200M lifetime grant per arc-history).

**Procedure improvement to land alongside Pass 2:** restore command switches to `psql -1 < dump.sql` (single transaction). With `--clean --if-exists` already in the dump, DROP statements use `IF EXISTS` and won't fail; a single transaction means a mid-restore failure auto-rolls instead of leaving prod half-applied. **Verify on dev first** -- some setup statements (CREATE EXTENSION) may not work inside a transaction depending on Postgres config. If verification fails, document the constraint and stay with the per-statement form.

---

## Sub-question 2.6 -- operator UX: LOCKED

**Decision:** runbook in DEPLOYMENT.md, executed by the operator OR by Claude as collaborator. No wrapper script today.

**Reframing what's actually happening:** the operator does not type 5+ commands across two hosts. The operator says "let's update KTX to 1.46" and Claude reads DEPLOYMENT.md, runs the commands, adapts to errors, reports back. **That IS already a wrapper -- a more flexible one than any Bash script would be.** It can skip irrelevant steps, branch on errors, decide whether `re-derive` is necessary.

**Why no Bash wrapper script (yet):**
- Cadence is operator-poll, ~5-10 events per year. Insufficient volume to justify wrapper-script maintenance.
- A static script encodes the *current* shape; the procedure keeps evolving (KTX onboarding alone shifts what `extract-tag` accepts).
- The future admin-panel arc will need its own API surface. Building a Bash wrapper now without admin-panel context risks designing for the wrong consumer.
- The Claude-collaborator loop handles routine and unusual cases without the script having to anticipate them.

**Future-script-friendly properties (today already satisfy):**
- Each pipeline stage has a clean CLI entry point: `extract-tag`, `re-derive`, `embed:entities`, `pg_dump`, `psql`, `build-snapshot`.
- Pipeline state queryable from Postgres: `query_log`, `embedding_api_log`, `schema_migrations`, `oracle_meta`.
- No implicit terminal interaction in any step.
- Procedure documented as a runbook in DEPLOYMENT.md.

The runbook is the authoritative procedure. Future admin panel arc replaces "Claude executes the runbook" with "human clicks button on web panel." The intermediate state (Bash wrapper script) is skippable.

---

## Hygiene work to land alongside Pass 2 (DEPLOYMENT.md edits)

1. **Expand "Routine corpus refresh" into the full end-to-end runbook.** Today it covers re-derive -> re-embed -> dump -> restore -> sanity check, but assumes data is already in dev. The full procedure starts with `extract-tag <project> <tag>` (or a new-codebase first-load equivalent for KTX). Add the `extract-tag` step at the top.
2. **Add Tier 2 dump archival** (one-time `mkdir dumps/`, then archive-and-rotate before each restore).
3. **Switch restore to single-transaction** (`psql -1 < dump.sql`). Caveat: verify against dev first.
4. **Add "What this procedure DOESN'T do" footer:** point to slipgate snapshot regen (`build-snapshot`) as a separate operator-discretion step, not part of oracle deploy.
5. **Add per-codebase trigger model summary** so the operator (or Claude) knows when to fire the procedure for each codebase.
6. **Add rollback section** documenting the three tiers + true DR path.

---

## Constraints and non-goals

**In scope:**
- Manual operator-driven update procedure for tagged + active + rolling-head + frozen codebases.
- Schema migration coordination via the dump-restore mechanism.
- Three-tier rollback model.
- DEPLOYMENT.md as the authoritative runbook.

**Explicitly out of scope (captured as separate future work):**
- Automated upstream-drift detection (cron / GitHub Actions / webhook). Small followup.
- Bash wrapper script for the procedure. Skipped in favour of "Claude-as-wrapper today, admin-panel-as-wrapper later."
- Web admin panel for pipeline control. Folded into the existing showcase-site arc.
- Consumer delta-update infrastructure (slipgate auto-pull from a central artifact host). New future-arc extension to the showcase-site parking doc.
- Dev DB automated backup. Small followup.
- Migrating extraction / loaders to Unraid. Reconsidered when admin-panel arc lands.
- Folding qw-oracle Postgres into the future quake.world Hetzner Postgres (per the Quake.World Platform Architecture diagram). Aspirational; not a near-term migration. The procedure here is destination-agnostic -- swap connection string + SSH host when Hetzner happens; nothing else needs to change.

---

## Future evolution pointers

| Future work | Where captured |
|---|---|
| Web admin panel for pipeline control + showcase | extension to `docs/superpowers/parking/2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md` |
| Consumer delta-update flow (snapshot host + slipgate auto-pull) | extension to same showcase-site parking doc |
| Cron-based upstream-drift detector | HANDOVER small followup |
| Dev DB backup hygiene (manual or automated) | HANDOVER small followup |
| Floor selection for KTX historical walk | KTX execution Phase 0 spike (`docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md`) |
| Hetzner migration (qw-oracle Postgres -> central QW platform Postgres) | Aspirational; revisited if/when QW platform consolidation begins |

---

## Pass 2 close summary

All six sub-questions locked:
- 2.1 data-flow shape -- pg_dump from dev (B); surgical per-table flags option for big infrequent refreshes.
- 2.2 consumer-snapshot regen -- decoupled from oracle deploy; current dev-time convenience; future delta-update arc captured.
- 2.3 per-codebase trigger model -- operator-poll for all; KTX mirrors ezquake (head + stable tags back to parse-clean floor).
- 2.4 migration coordination -- implicit via `pg_dump --clean --if-exists`; dev-side migration only; KTX needs one new CHECK widening (`log_template_versions.channel` += `'logfile'`).
- 2.5 rollback shape -- 3 tiers + GitHub-rebuild as true DR; rolling N=5 dumps on Unraid; `psql -1` for atomic restore.
- 2.6 operator UX -- runbook (Claude-executed); future admin-panel arc as separate work.

**Remaining KTX-onboarding-arc passes:**
- Pass 3 -- schema impact for first-class types (light; consolidates the CHECK widenings + verifies nothing else).
- Pass 4 -- gameplay-content scope + shape decision (5 enum taxonomies + 10 struct-array tables + 7 XSD match-event types).
- Pass 5 -- per-category gameplay-content design.
