# QWCL Validation Follow-ups (2026-04-28)

**Source:** `docs/superpowers/reviews/2026-04-28-qwcl-validation.md`
**Scope:** drain the 2 actionable findings (F-QWCL-01 drain-now, F-QWCL-03 drain-in-arc) from QWCL Mode B validation. The 4 HANDOVER items and 1 logged-only item do NOT roll into this plan.
**Sequencing:** can land in a single small commit. No schema changes, no data migrations, no extractor changes.

---

## Phase 1 -- Drain F-QWCL-01: doc count refresh

**Findings drained:** F-QWCL-01.

**Files touched:**

1. `apps/qw-oracle/scripts/extractors/qwcl/OUT_OF_SCOPE.md`
   - Line 3: change "364 total entities (186 cvar / 120 command / 58 cmdline_param)" -> "380 total entities (187 cvar / 121 command / 72 cmdline_param)".
   - Line 7: change "Extraction total: 364 entities" -> "Extraction total: 380 entities".
   - Update "Last reviewed:" stamp from "2026-04-26" to "2026-04-28".

2. `apps/qw-oracle/CLAUDE.md`
   - Section "QWCL 2.33 SHIPPED 2026-04-25" -- update "186 cvar / 120 command / 58 cmdline_param entities" to "187 cvar / 121 command / 72 cmdline_param entities" (one-line edit).

3. `HANDOVER.md` (root) -- if it carries the same stale numbers, refresh in the same pass.

**Acceptance:** running the qwcl quality grid still 100% PASS/CLEAN. DB unchanged. Doc text matches `sqlite3 ... SELECT COUNT(*) FROM <type>_versions ... WHERE project='qwcl'` output.

**Verification:**

```bash
DB=apps/qw-oracle/data/knowledge.db
for type in cvar command cmdline_param; do
  sqlite3 "$DB" "SELECT '$type=' || COUNT(*) FROM ${type}_versions cv \
                 JOIN entities e ON e.id=cv.entity_id \
                 WHERE e.project='qwcl' AND cv.version='2.33';"
done
# Expected: cvar=187 command=121 cmdline_param=72
```

---

## Phase 2 -- Drain F-QWCL-03: add qwcl-keyed F1 equality probes

**Findings drained:** F-QWCL-03.

**File touched:** `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`.

**Probes to add** (mirroring the post-v17 mvdsv pattern at lines that register `F1.mvdsv.cvars_source_backed_count` etc. -- equality assertions, not floors):

1. `F1.qwcl.cvars_count` -- `SELECT COUNT(*) FROM cvar_versions cv JOIN entities e ON e.id=cv.entity_id WHERE e.project='qwcl' AND cv.version='2.33'` expected `= 187`.
2. `F1.qwcl.commands_count` -- `... command_versions ...` expected `= 121`.
3. `F1.qwcl.cmdline_count` -- `... cmdline_param_versions ...` expected `= 72`.
4. `F1.qwcl.all_source_backed` -- `SELECT COUNT(*) FROM entities WHERE project='qwcl' AND source_state != 'source_backed'` expected `= 0`. (QWCL has no help-JSON, so every loaded entity is source_backed; this catches any future doc-only emission slip.)

Place the probes alongside the existing `F1.mvdsv.*_count` block so they share the same shape and reading cadence in the quality-grid output.

**Acceptance:** `npm run load-knowledge -- quality-grid --project qwcl --family regression` runs 9 PASS probes (was 5, now 5+4) and 0 FAIL. Re-running on the unchanged DB produces identical output (probes are queries; no re-load needed).

**Verification:**

```bash
cd apps/qw-oracle
npm --no-workspaces run load-knowledge -- quality-grid --project qwcl --family regression \
  | grep -E "F1.qwcl|PASS|FAIL"
```

Should show four `[PASS] F1.qwcl.*_count` lines.

**Drift simulation** (optional smoke check before commit):

```bash
# Temporarily delete one cvar row, re-run grid, expect F1.qwcl.cvars_count to FAIL
sqlite3 data/knowledge.db "DELETE FROM cvar_versions WHERE entity_id = (SELECT id FROM entities WHERE project='qwcl' AND name='cl_warncmd');"
npm --no-workspaces run load-knowledge -- quality-grid --project qwcl --family regression
# Expect: [FAIL] F1.qwcl.cvars_count -- expected 187, got 186
# Then restore by re-running extract-tag, or roll back the delete with a transaction.
```

This test is informational; commit only the probe definitions, not the simulation.

---

## Sequencing

Phase 1 and Phase 2 are independent and can land in either order or as a single commit. Recommended single commit:

```
chore(qw-oracle): drain qwcl validation follow-ups (F-QWCL-01, F-QWCL-03)
```

with body referencing the validation report at `docs/superpowers/reviews/2026-04-28-qwcl-validation.md`.

---

## Out of scope for this plan

The four HANDOVER items (F-QWCL-02 validation-fixtures, F-QWCL-04 set_library_file, F-QWCL-05 collect_handlers shape, F-QWCL-06 registration_file rename) are deferred per the validation report's disposition. The cross-project observation (F-QWCL-07 -- FTE NULL flags_raw on ezhud cvars) is logged for the FTE Mode B pass and does NOT roll into this plan.

---

## Post-drain handover

After both phases land, append to `HANDOVER.md`:

> **2026-04-28 QWCL Mode B validation drain shipped.** F-QWCL-01 doc count refresh + F-QWCL-03 qwcl-keyed F1 probes added. Validation report at `docs/superpowers/reviews/2026-04-28-qwcl-validation.md`. Four HANDOVER items remain (F-QWCL-02/04/05/06).

