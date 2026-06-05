You are drafting **Phase 0 -- schema + plumbing** of the QTV + QWFWD Layer 1 extraction arc.

**Arc identity (read first -- halt if it does not match):** this arc is `2026-06-05-qtv-qwfwd-l1-extraction`. Scaffold at `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/`. You are adding two QuakeWorld streaming/forwarding tools (Go QTV `qtv`, C QWFWD `qwfwd`) to the qw-oracle Layer 1 pipeline. If your material talks about KTX/MVDSV describe-fill codes (F-D4a, B1-B5, V-pass, D6/D7 batch gates), the KTX Layer-B shape catalog, or `mvdsv-*-ledger-*.md` as the thing you edit, you are in the WRONG arc -- STOP and tell the operator.

This is a structured **planning** task. Output is one markdown file. You do NOT execute anything -- no migrations, no SQL run, no `tsc` run that mutates, no loads. The phase MD becomes input to a separate execution session.

**Working directory:** `/home/paradoks/projects/quakeworld`

**Required reading (all of these before drafting):**

1. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/README.md`
2. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/decisions.md` -- especially D2 (migration 020 + the 10 CHECK clauses), D3 (Project union + 12 Record sites), D4 (frozen-snapshot version label + --commit fallback), D7 (ASCII), D11 (verification), D12 (Postgres not sqlite).
3. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/review-findings.md` -- F1 and F4 are yours.
4. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-template.md` -- the mandatory shape. Follow section order exactly; annotate each task's execution mode.
5. `docs/superpowers/specs/2026-06-05-qtv-qwfwd-l1-extraction-design.md` -- the approved design (schema-change section).

**Phase-0-specific reads (live recon -- verify against the tree, do not plan from the scaffold summaries):**

- `apps/qw-oracle/db/migrations/002_layer1_schema.sql` -- the 10 project-CHECK clauses (decisions.md D2 lists table + line).
- An existing ALTER-style migration as a style/header example (look at the most recent few in `apps/qw-oracle/db/migrations/`, e.g. 017 / 018 / 019).
- `apps/qw-oracle/db/migrate.ts` -- how migrations apply (sha256 guard; lexical order; per-migration transaction).
- `apps/qw-oracle/scripts/load-knowledge/types.ts` -- the `Project` union (line 8).
- All 12 `Record<Project, ...>` sites: `extract-tag.ts` (8: lines ~36/48/57/73/88/102/235/282), `build-snapshot.ts` (~685), `diff-versions.ts` (~51), `enrich-prs.ts` (~14), `load-release-notes.ts` (~28). Read each to choose the correct qtv/qwfwd value (null where the flow does not apply; a real value where the `Record` type is non-nullable).
- `apps/qw-oracle/scripts/load-knowledge/index.ts` + `load-version.ts` -- the `load-version --json` signature AND whether the first `load-version` call CREATES the `versions` row (look at the `--ordinal` handling around index.ts:151-170 and how `loadVersion` upserts the versions row). This决定s whether Phase 0 pre-inserts `versions` rows or defers them to Phase 1/2.
- `apps/qw-oracle/SCHEMA.md` -- where the project list is documented (update it in this phase).

**Phase 0 scope (what this phase delivers):**

1. **Migration `020_qtv_qwfwd_projects.sql`** that widens the allow-list to add `'qwfwd'` and `'qtv'` across all 10 CHECK clauses. Postgres `ALTER TABLE ... DROP CONSTRAINT <name>; ALTER TABLE ... ADD CONSTRAINT <name> CHECK (project IN (...))`. **Re-query the live catalog for the real constraint names** -- do not assume `<table>_<col>_check` blindly; include the introspection query in the task steps:
   ```sql
   SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid)
   FROM pg_constraint WHERE contype='c' AND pg_get_constraintdef(oid) ILIKE '%project%';
   ```
   Ship the full migration SQL inline in the task. New file only; never edit 002.
2. **Widen the `Project` union** in `types.ts:8` to add `'qtv' | 'qwfwd'`.
3. **Fill all 12 `Record<Project, ...>` sites** so `bunx tsc --noEmit` is green. For each site, name the file:line and the exact qtv/qwfwd value chosen, with a one-line reason (e.g. `PROJECT_EXTRACTOR -> null` because extract-tag is bypassed per D1).
4. **`versions` rows:** determine from `load-version.ts` recon whether they are created by the first `load-version` call (Phase 1/2) or must be pre-inserted here. If load-version creates them, Phase 0 does NOT insert them -- say so in "Outputs to next phase" (Phase 1/2 creates them on first load) and make Phase 0's verification probe the CHECK via a **rolled-back dummy `entities` insert**, not a versions row. If they must be pre-inserted, add that task with the D4 version label + --commit fallback + snapshot-date provenance.
5. **Update `SCHEMA.md`** to document qtv/qwfwd as projects 6-7 and reference migration 020.

**Verification (phase boundary) -- Postgres, YES/NO probes:**
- Migration applies clean (`bun db/migrate.ts` reports 020 applied).
- Constraint introspection (the query above) shows `'qwfwd'` and `'qtv'` in all 10 clauses.
- `bunx tsc --noEmit` exits 0 (proves all 12 Record sites filled -- D3/F4).
- A dummy `INSERT INTO entities (... project='qtv' ...)` succeeds and `project='bogus'` is rejected, then rolled back. (Phrase as a transaction the operator runs and aborts.)

**Drafting rules:** ASCII only, ASCII hyphen-minus (D7). New migration file, never edit 002 (D2). Postgres, not sqlite, in every probe (D12). Every task gets an execution-mode annotation; for Phase 0 the migration + Record edits are subagent (code synthesis, Sonnet medium); SCHEMA.md doc edit is inline.

**Step by step:**
1. Read all required + Phase-0-specific files. Note F1, F4.
2. Run live recon (the constraint introspection mentally/structurally from 002; read all 12 Record sites; read load-version.ts for the versions-row question).
3. Draft `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-0-schema-plumbing.md` following `phase-template.md` exactly.
4. Dispatch the verification sub-agent (brief at the bottom of `phase-template.md`), `subagent_type=Explore`, with absolute paths substituted for this phase's MD + decisions.md + review-findings.md.
5. Apply the sub-agent's findings. If a finding contradicts `decisions.md`, decisions win -- note the rejection in "Open questions" with a one-line rationale.
6. Halt. Reply with: the drafted MD path; sub-agent finding counts (CRITICAL/SUBSTANTIVE/ADVISORY); open questions needing operator attention (especially the versions-row resolution); and a recommendation -- "ready for review" or "needs another pass."

Do NOT proceed to Phase 1. Do NOT execute anything. Drafting is paper-only.
