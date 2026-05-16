# Prerequisites -- Task 0 (operator-side, before kicking off any phase)

One-shot checks the agentic loop cannot do for itself. Most are **already
satisfied in the current environment** (verified 2026-05-16) -- they are
listed as checkable items because a fresh clone or a reset DB would need them,
and because Phase 0/1 must not start against a half-built substrate.

Run through this list once. Check off what is already true and move on.

---

## Required before Phase 0 / Phase 1

- [ ] **`cmake` installed** (new 2026-05-17 -- Phase 0 now self-builds the C3
  oracle). KTX and MVDSV are BOTH C, BOTH built via CMake (KTX ->
  `qwprogs.so`, MVDSV -> `mvdsv`; no QuakeC/fteqcc -- that was a corrected
  planner error, OQ-3). Verified 2026-05-17: `gcc` / `make` / `git` / `bun`
  / `python3` are present; **`cmake` is MISSING**. One-shot operator step
  the agentic loop may lack rights for:

  ```bash
  sudo apt install -y cmake     # ninja-build optional, speeds the build
  cmake --version               # expect >= 3.10
  ```

  If `cmake` cannot be installed, Phase 0's documented fallback
  (fetch-forward-source + the retained 2026-04-27 production dump under the
  original date-proximate caveat) keeps the arc unblocked -- the self-built
  oracle is the target, not a hard gate.

- [ ] **Postgres dev container up and L1 KTX + MVDSV extracts loaded.**
  This arc fills description fields on cvar/command/cmdline/info_key rows that
  **already exist** from the libclang/tree-sitter registration walk. An empty
  DB has nothing to describe-fill. Verify:

  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
    "select project, count(*) from entities where project in ('ktx','mvdsv') group by project order by project;"
  ```

  Expected: two non-zero rows (`ktx|<n>`, `mvdsv|<n>`). **Current state
  2026-05-16: `ktx|1827`, `mvdsv|1236` -- satisfied.** If empty, run the L1
  loaders first (see `apps/qw-oracle/DEVELOPMENT.md`); the container is
  `apps/qw-oracle/db/docker-compose.dev.yml`.

- [ ] **`apps/qw-oracle/.env` populated.** Phase 1 only needs `DATABASE_URL`
  (`postgresql://qworacle:dev@localhost:5432/qw_oracle`). `.env` and
  `.env.example` both exist today; if a fresh clone, `cp .env.example .env`.
  `.env` must be gitignored (verify before any commit).

- [ ] **Research repos present** (D9 mechanical-extract + sibling-parser
  sources). Verify:

  ```bash
  ls research/repos/ktx/resources/example-configs/ktx/ktx.cfg \
     research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg \
     research/repos/nquake-distfiles/sv-configs/ktx/mvdsv.cfg \
     research/repos/mvdsv/docs/man/man6/mvdsv.6
  ```

  All four expected to exist. **Current state 2026-05-16: all present --
  satisfied.**

- [ ] **C3 runtime dump present** (Phase 0 consumes it for the dead-detection
  diff). It is in-repo at
  `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ciscon-1.20-dev-2026-04-27.log`
  (the operator-captured `qw-1.log`, 2026-04-27, KTX 1.47-dev + MVDSV
  1.20-dev, Apr 11 2026 build). **Current state 2026-05-16: present --
  satisfied.** Note: confirming the dump is contemporaneous with the loaded
  L1 extract is a **Phase 0 task** (F-C3a), not a manual operator step -- the
  operator only needs to know the dump exists at that path.

## Awareness items (no operator action; surfaced so a drafter does not stall)

- [ ] **The "2026-05-15 cvar-audit-review.html" visual template does NOT
  exist in the tree.** Verified 2026-05-16: neither the artifact nor its
  generator is anywhere under `/home/paradoks/projects`. This is **not a
  blocker** -- D11 + D15 fully specify the column family Phase 1 builds the
  emitter against (see `review-findings.md` F-D11a). If the operator happens
  to have the old artifact outside the repo (a screenshot, an Unraid path),
  pointing Phase 1 at it is a nice-to-have pixel reference only. If not,
  Phase 1 proceeds from the spec's enumerated columns. No action required
  before kickoff; answer if a Phase 1 drafter asks.

## Required before Phase 5 (can wait)

- [ ] **`VOYAGE_API_KEY` in `apps/qw-oracle/.env`.** Phase 5 re-embeds the new
  owned descriptions (the embedding input is a D13 serializer over the new
  text). The free tier covers the volume. Not needed before Phase 5.

## Decision deferrals (operator clarifies on demand, not now)

- [ ] **D16 static host for the upstream showcase** -- slipgate.me vs the
  matchscheduler site. Deferred to Phase 6 (the deferrable tail). Phase 6's
  drafter will surface it; pre-decide only if you want to short-circuit it.
- [ ] **D16 PR-path** (repo `server-cvars.md` / GitHub wiki tabs /
  dev-proposed landing) -- explicitly DEFERRED past Phase 6, owned by the
  operator + the KTX/MVDSV dev conversation. NOT a planner or phase decision;
  do not pre-decide.

## What this list deliberately does NOT include

- Anything the agentic loop can do (running migrations, running extractors /
  loaders, running probes, generating projections, running F1 quality-grid).
- Anything created by the phases themselves (the schema migration, the D6
  synthesis skill, the D9 sibling extractor, the audit serializer, the wiki
  feed).
- The wiki-side namespace + bot write path -- cross-arc (qwiki-v1-beta), not
  this arc (`review-findings.md` F-D14a).
- Cleanup / rollback. Each phase lands a commit on `main`; recovery is
  re-running the corrected pipeline (C4), not bespoke rollback infra.

## Sign-off

When the "Required before Phase 0 / Phase 1" boxes are checked (most are
already true today), the operator can kick off Phase 0. Phase 5's Voyage key
can be filled any time before Phase 5 starts.
