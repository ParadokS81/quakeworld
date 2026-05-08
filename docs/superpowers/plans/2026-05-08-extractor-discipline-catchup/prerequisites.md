# Prerequisites -- Task 0 (operator-driven, before kicking off any phase)

This arc rides on top of the qw-oracle Arc 1 + KTX onboarding infrastructure. Most prerequisites are already satisfied; this list captures the inheritance check + the few arc-specific items the agentic loop cannot auto-resolve.

These take ~10-15 minutes total. Run through once before kicking off Phase 1.

---

## Inherited from qw-oracle Arc 1 + KTX onboarding (verify still satisfied)

These should all be in place from prior arcs; spot-check before Phase 1 fires.

- [ ] **Postgres dev container running.** From WSL: `docker ps --format '{{.Names}} {{.Status}}' | grep qw-oracle-postgres-dev` should report `Up ... (healthy)`.
- [ ] **Migrations 001-012 applied to dev DB.** `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "SELECT filename FROM schema_migrations ORDER BY applied_at"` should list 001 through 012. No new migrations land in this arc.
- [ ] **`bun --version` >= 1.3** in WSL. Bun is the canonical script runner; all TS probes are TypeScript-via-Bun.
- [ ] **`apps/qw-oracle/.env` populated** with `DATABASE_URL` (dev DB connection string) at minimum. New gates use `DATABASE_URL` directly per D2; no new env vars needed.

If any inherited item is missing, fix before starting Phase 1. If a major component is broken (container won't start, migrator complains), surface to operator -- the catch-up arc cannot proceed without the dev DB.

---

## Arc-specific prerequisites (required before Phase 1)

- [ ] **All 5 project dev DBs loaded.** Each gate's catch-up audit (per D6) runs against ezquake / FTE / QWCL / MVDSV / KTX. Verify each project has rows in dev DB:

  ```sql
  SELECT project, COUNT(*) AS row_count FROM entities GROUP BY project ORDER BY project;
  ```

  All 5 projects should return non-zero counts. If a project is missing, run its `extract-tag` + load before starting Phase 1.

- [ ] **Each project's source repo at `research/repos/<project>/`.**

  ```bash
  ls research/repos/ezquake/ research/repos/fte/ research/repos/qwcl/ research/repos/mvdsv/ research/repos/ktx/
  ```

  All 5 directories should exist. Phase 2's reproducibility probe re-runs `extract.py` per project; missing source repo blocks the audit.

- [ ] **`apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh` is current** (commit `66382a50` applied -- Issue #5 volatile-column-strip pattern is the lift source for Phase 1's universal probe). Verify with `head -5 apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh` and check for the post-Issue-#5 volatile-column strip list including `description_embedding`, `description_embedding_sha256`, `description_embedding_stale`.

---

## Tooling already in place (verification, no action needed)

These were set up during qw-oracle Arc 1 + KTX onboarding; no re-install needed.

- [ ] **libclang + python3-clang installed** (for reproducibility probe to re-run `extract.py`). `python3 -c "import clang.cindex; print(clang.cindex.Config().get_cindex_library())"` should print a path without error.
- [ ] **pytest available** (for parallel-vs-serial test pattern in Phase 3). `python3 -m pytest --version` should print a version. The KTX onboarding test files at `apps/qw-oracle/scripts/extractors/ktx/tests/` exercise pytest; the lift in Phase 3 uses the same harness.
- [ ] **postgres-js + bun-types** are in `apps/qw-oracle/package.json` (Arc 1 Phase 1).
- [ ] **VALIDATION-RUNBOOK.md and EXTRACTOR-PLAYBOOK.md** exist at `apps/qw-oracle/scripts/extractors/`. Phase 5 lands the sibling VALIDATION-GATES.md; Phase 6 amends EXTRACTOR-PLAYBOOK.md with audit cadence section.
- [ ] **`~/.claude/skills/onboard-extractor/SKILL.md`** exists (user-global skill). Phase 5 + Phase 6 amend this file inline per D10.

---

## Decision deferrals (operator clarifies on demand, not now)

These are things the phase drafter may ask about. Pre-decide if you want to short-circuit them; otherwise the phase MD will surface them as open questions.

- [ ] **Idempotency probe optional flags.** Default: ship `--all` and `--no-extract` per Pass 1.2.1. Skip if operator wants minimal flag surface (only `--project <p>` + `--json` + `--help`).
- [ ] **Reproducibility probe optional `--workers <N>` flag.** Default: ship per Pass 1.2.4 (surfaces latent parallelism-naive aggregations alongside parallel-vs-serial pytest tests). Skip if operator wants pytest-only coverage of that failure class.
- [ ] **Migration-probes optional `--migration NNN` flag.** Default: ship per Pass 1.2.2 (lets operator run a single migration's probe in isolation; useful when authoring a new migration). Skip if operator wants run-all-or-nothing.
- [ ] **Per-handler test scope for parallel-vs-serial pattern.** Default: Phase 3's catch-up audit identifies handlers with parallel-aggregation risk (handlers walking `MACRO_DEFINITION`, doing per-TU enum walks, aggregating stats from worker emissions) and adds tests for those. NOT blanket coverage. Skip if operator wants exhaustive per-handler coverage.

---

## What this list deliberately does NOT include

- Anything the agentic loop can do (running migrations, running probes, modifying source).
- Anything that gets created by the phases themselves (probe files, registry files, VALIDATION-GATES.md, audit cadence section, cert doc).
- Cleanup / rollback steps. Each phase lands a commit; if a phase needs to be rolled back, `git revert` is the path.
- New env vars. The arc reuses Arc 1's `DATABASE_URL`; no new secrets.

---

## Sign-off

When all "Inherited from qw-oracle Arc 1 + KTX onboarding" boxes are checked AND all "Arc-specific prerequisites" boxes are checked, Phase 1 drafting can start.

If a prerequisite blocks a phase that's already started, the phase pauses at the relevant task and waits.
