# Prerequisites -- operator-side Task 0

Everything below must hold before Phase 0 fires. Most are already satisfied (the sources are vendored, the DB exists) -- those are listed as verify-checks. Two are genuine toolchain checks the operator confirms before the phase that needs them.

Run the verify-checks; if any fails, resolve it before kicking off the dependent phase.

---

## Already satisfied -- verify only

### P1. Postgres dev DB up, migrator at 019

The schema-change phase applies migration 020, so the Postgres dev container must be running and current.

```bash
cd apps/qw-oracle
bun db:up                      # start the pgvector/pg16 container (idempotent)
bun db/migrate.ts              # applies any pending migrations; should report 019 as latest
```

PASS: migrator runs clean, latest applied migration is `019_embedding_freshness_comments.sql`.

### P2. Vendored sources present

```bash
ls apps/slipgate-app/reference/qtv/go.mod          # Go 1.24 target
ls apps/slipgate-app/reference/qwfwd/CMakeLists.txt # C target
```

PASS: both exist. (Verified present during planning. Note: both are frozen snapshots with no `.git` -- this is expected and load-bearing, see decisions.md D1/D4.)

### P3. Describe-pass seeds + xrefs present (needed at Phase 3, verify now)

```bash
wc -l apps/slipgate-app/reference/qtv/resources/qtv.cfg                       # ~132 lines
wc -l apps/slipgate-app/reference/qwfwd/resources/example-configs/qwfwd.cfg   # ~34 lines
ls research/repos/fteqw/fteqtv/source.c research/repos/fteqw/specs/hosting.txt
```

PASS: all four present. (Verified during planning.) These are the entire external corpus for the describe pass -- the auxiliary-material sweep (2026-06-05) confirmed no QWiki/admin-guides exist.

### P4. See-also anchors present (MVDSV qtv_* ledgers)

The describe pass and the Phase-4 concept-note decision reference the already-shipped MVDSV `qtv_*` rows.

```bash
ls docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-svdemo-ledger-qtv_*.md
```

PASS: ledgers exist (commit `66cf40bc`).

---

## Genuine toolchain checks

### P5. libclang 18 + python3-clang available (needed at Phase 1)

The QWFWD extractor is a libclang C-port on the `extractor_lib` rails.

```bash
python3 -c "import clang.cindex; print(clang.cindex.__file__)"
ls /usr/lib/x86_64-linux-gnu/libclang-18.so.1 2>/dev/null || ldconfig -p | grep libclang-18
```

PASS: `clang.cindex` imports and `libclang-18.so.1` resolves. If not, see memory `reference_libclang_ezquake_extraction` for the WSL install (`apt-get install libclang-18-dev` + `pip install libclang`). The existing ezquake/fte/mvdsv extractors already run on this, so it is almost certainly present.

### P6. Go 1.24 toolchain available (needed at Phase 2)

The QTV extractor is a native `go/ast` program -- the pipeline's first non-C front-end.

```bash
go version       # expect go1.24.x or newer (qtv/go.mod requires go 1.24.0)
```

PASS: `go version` reports >= 1.24. If Go is absent, install it before Phase 2 (Phase 0 and Phase 1 do not need it).

---

## Not prerequisites (explicitly)

- No GitHub token needed (no release-notes flow for these projects; D3 sets `PROJECT_REPOS = null`).
- No Voyage / embedding key needed for this arc (L1 extraction + describe only; embeddings are a separate downstream pass).
- No new env vars or secrets.

---

*If a prerequisite turns out to be missing mid-phase, halt and surface it to the operator -- do not work around it.*
