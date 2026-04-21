# Phase 2f Batch 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the architectural gaps in the Phase 2f catalog -- fresh-DB CHECK widening (Gap 5), loader-site canonical-key stability (Gap 11), version-tolerance audit for struct-shape extractors (Gap 2), and per-field / per-call-site blame attribution so change_events no longer carry null PRs for struct-field additions or cvar default-value mods (Gaps 3+4). This is the last batch before the full ezQuake historical backfill can run with meaningful blame.

**Architecture:** Four phases. Phase 1 ships two small mechanical fixes (schema CHECK, loader-site canonical_id). Phase 2 audits the three struct-shape extractors (cvars / hud_elements / rulesets) against 3.6.0 and 3.2.3 trees and applies Batch-1-style tolerance patches to any that break. Phase 3 introduces schema v6 with one new table `source_overrides(entity_id, version, field_name, source_file, source_line)` -- a per-field blame-override index. Struct-shape extractors emit rows into this table pointing at the header/struct line where each field was declared; the cvars extractor additionally emits rows for `Cvar_SetDefaultAndValue` / `Cvar_ResetVar` / related call-sites pointing at the call site rather than the cvar_t declaration. `diff-versions.ts` consults `source_overrides` first when emitting modification change_events, falling back to the entity's primary `source_line` if no override exists. Phase 4 validates by re-running A1/A2/A3 and measuring the PR-attribution-rate improvement.

**Tech Stack:** TypeScript (Bun / Node 20), better-sqlite3 11, Python 3 + libclang 18 (for struct-field walks in extractors), git worktrees for per-tag extraction.

**Testing philosophy (per `apps/qw-oracle/CLAUDE.md`):** Compile-and-typecheck first, then runtime validation via SQL queries. No new test infrastructure. Every meaningful change is followed by a re-run against the existing knowledge.db and explicit row-count comparison.

**Per CLAUDE.md (project root):** Main tree, branch `main`, commit directly. No worktree, no feature branch, no PR ceremony.

---

## File Structure

**New files:**
- `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v6-source-overrides.md` -- schema v6 design spec
- `apps/qw-oracle/scripts/load-knowledge/load-source-overrides.ts` -- loader for the source_overrides table

**Modified files (substantial):**
- `apps/qw-oracle/scripts/load-knowledge/schema.ts` -- v6 migration + widen SCHEMA_V1_SQL entities CHECK
- `apps/qw-oracle/scripts/load-knowledge/types.ts` -- `SourceOverrideRow` type
- `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts` -- `upsertSourceOverride` helper
- `apps/qw-oracle/scripts/load-knowledge/load-version.ts` -- adapters emit source_override rows alongside version rows
- `apps/qw-oracle/scripts/load-knowledge/load-rulesets.ts` -- emit per-field blame anchors
- `apps/qw-oracle/scripts/load-knowledge/load-hud-elements.ts` -- emit per-field blame anchors
- `apps/qw-oracle/scripts/load-knowledge/load-cvars.ts` -- emit per-call-site blame anchors for default_value
- `apps/qw-oracle/scripts/load-knowledge/diff-versions.ts` -- consult source_overrides during blame resolution
- `packages/qw-config/scripts/extract-ezquake-rulesets-clang.py` -- emit per-field header lines
- `packages/qw-config/scripts/extract-ezquake-hud-elements-clang.py` -- emit per-field header lines
- `packages/qw-config/scripts/extract-ezquake-cvars-clang.py` -- scan for `Cvar_SetDefaultAndValue` / `Cvar_ResetVar` call sites and emit per-call-site anchors
- `packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py` -- switch canonical_id to ordinal-based
- Any of the 3 struct-shape extractors that fail the Phase 2 audit (list determined at runtime)

**Modified files (docs):**
- `apps/qw-oracle/scripts/load-knowledge/e2e-verify.md` -- Batch 3 section
- `apps/qw-oracle/CLAUDE.md` -- schema version bump
- `HANDOVER.md` -- mark gaps 2/3/4/11/5 resolved; audit findings
- MEMORY.md index + `project_qw_oracle_vision.md` -- Batch 3 shipped line

---

## Task 1: Gap 5 -- Fresh-DB entities CHECK widening

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/schema.ts` (around line 33)

**Context:** The pre-existing latent bug flagged by the Task 2 reviewer in Batch 2. `SCHEMA_V1_SQL` creates the entities table with the narrow v1 CHECK `('cvar','command','macro','cmdline_param')`. On a fresh DB, `applySchema` stamps v5 directly and skips the migration chain, leaving the entities CHECK narrow. Inserting any non-v1 entity type fails. Fix is to widen `SCHEMA_V1_SQL`'s entities CHECK to the current widest set. Migration DBs still rebuild entities via the v1->v2 / v2->v3 / v4->v5 migrations, so the wider CHECK in v1 is harmless for them.

- [ ] **Step 1: Read the current CHECK in `SCHEMA_V1_SQL`**

Read `apps/qw-oracle/scripts/load-knowledge/schema.ts` lines 30-45 to confirm the current narrow CHECK is on line 33:

```typescript
  type                  TEXT NOT NULL CHECK (type IN ('cvar','command','macro','cmdline_param')),
```

- [ ] **Step 2: Widen the CHECK**

Replace the line with the full v5 entity-type list:

```typescript
  type                  TEXT NOT NULL CHECK (type IN (
                          'cvar','command','macro','cmdline_param',
                          'keyname','hud_element','ruleset','token_primitive',
                          'asset_category','flag_bit'
                        )),
```

- [ ] **Step 3: Verify fresh-DB path**

Write a throwaway test script at `/tmp/test-fresh-db-v6.ts`:

```typescript
import Database from 'better-sqlite3';
import { unlinkSync, existsSync } from 'fs';
import { applySchema } from '/home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/load-knowledge/schema.js';

const p = '/tmp/fresh-test.db';
if (existsSync(p)) unlinkSync(p);
const db = new Database(p);
applySchema(db);

// Insert a flag_bit entity -- would fail v1 narrow CHECK
db.prepare(`
  INSERT INTO entities (project, type, name, canonical_id,
    first_seen_version, last_seen_version, source_state,
    created_at, updated_at)
  VALUES ('ezquake', 'flag_bit', 'test_flag', 'ezquake:flag_bit:test_flag',
    'head', 'head', 'source_backed',
    datetime('now'), datetime('now'))
`).run();

const row = db.prepare(`SELECT COUNT(*) AS n FROM entities WHERE type='flag_bit'`).get();
console.log('fresh DB flag_bit insert:', row);
db.close();
unlinkSync(p);
```

Run:

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && bunx tsx /tmp/test-fresh-db-v6.ts
```

Expected output: `fresh DB flag_bit insert: { n: 1 }`. If it throws a CHECK constraint error, the widening didn't land.

- [ ] **Step 4: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/qw-oracle/scripts/load-knowledge/schema.ts
git commit -m "fix(qw-oracle): widen SCHEMA_V1_SQL entities CHECK to current type set"
```

---

## Task 2: Gap 11 -- Loader-site ordinal canonical_id

**Files:**
- Modify: `packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py`

**Context:** `asset_loader_sites.canonical_id` is currently `ezquake:loader_site:<function>_<basename>_<source_line>`. The line-number embedding makes any upstream edit ripple through every downstream loader-site key, producing spurious (created, deleted) pairs in `relation_changes`. Batch 2 A1 saw 6+6 pairs; A2 saw 11+11. Fix: replace `<source_line>` with a per-function ordinal counter -- the nth call to `<function>` inside `<enclosing_function>` within `<basename>`.

- [ ] **Step 1: Read the current canonical_id construction**

Read `packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py` and locate the formula. Grep for `canonical_id` or the string concatenation that produces `loader_site:`:

```bash
grep -n "canonical_id\|loader_site:" /home/paradoks/projects/quakeworld/packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py
```

- [ ] **Step 2: Design the ordinal scheme**

The natural grouping is (enclosing_function, source_file). Within that group, order the calls by source_line ascending and assign ordinals 1..N. The canonical_id becomes:

```
ezquake:loader_site:<function_name>_<source_file_basename>_<enclosing_function>_<ordinal>
```

Including `enclosing_function` is important because the same `function_name` (e.g. `FS_OpenFile`) can appear in multiple enclosing functions within the same file. The ordinal only needs to be unique within `(function_name, enclosing_function, source_file)`. Sorting by source_line ascending gives a deterministic ordering that survives line-shifts so long as the relative call order doesn't change -- which is the invariant we need for stable diffs.

- [ ] **Step 3: Modify the extractor to compute ordinals**

Update the extractor's main loop so that after collecting all call-site records, it post-processes them to assign ordinals. Pseudocode:

```python
# After collecting raw call-site dicts into `sites` list:
from collections import defaultdict

sites.sort(key=lambda s: (s["enclosing_function"] or "", s["source_file"], s["source_line"]))
ordinal_counters: dict[tuple[str, str, str], int] = defaultdict(int)

for site in sites:
    group_key = (site["function_name"], site["enclosing_function"] or "", site["source_file"])
    ordinal_counters[group_key] += 1
    ordinal = ordinal_counters[group_key]
    basename = site["source_file"].rsplit("/", 1)[-1].rsplit(".", 1)[0]
    enc = site["enclosing_function"] or "global"
    site["canonical_id"] = f"ezquake:loader_site:{site['function_name']}_{basename}_{enc}_{ordinal}"
```

Read the existing extractor to find the exact spot this logic belongs -- it should replace wherever the current line-based canonical_id is computed.

- [ ] **Step 4: Re-run the extractor at head**

```bash
cd /home/paradoks/projects/quakeworld && python3 packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py
```

Expected: same total count (110). Inspect a few sample canonical_ids:

```bash
python3 -c "
import json
d = json.load(open('/home/paradoks/projects/quakeworld/packages/qw-config/src/data/ezquake-asset-loader-sites-ast.json'))
sites = d.get('loader_sites', d)  # payload key varies; inspect
if isinstance(sites, dict):
    keys = list(sites.keys())[:5]
    for k in keys: print(k)
else:
    for s in sites[:5]: print(s.get('canonical_id'))
"
```

Expected: each canonical_id ends with `_<ordinal>` (1, 2, 3, ...), not a line number.

- [ ] **Step 5: Re-run build-asset-bundle + re-load-assets at head**

The asset bundle consumes the loader_sites JSON. Rebuild the bundle and re-load:

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
HEAD_SHA=$(git -C ../../research/repos/ezquake-source rev-parse HEAD)
bunx tsx scripts/load-knowledge/build-asset-bundle.ts --project ezquake --version head
npm run load-knowledge -- load-assets --project ezquake --version head \
  --json ../../packages/qw-config/src/data/ezquake-asset-bundle.json \
  --commit $HEAD_SHA --ordinal 2
```

Expected: loads without error, re-populates asset_loader_sites with the new canonical_ids. Old rows stay under old canonical_ids (they're keyed differently now).

- [ ] **Step 6: Clean out stale loader-site rows from prior extraction**

Because the canonical_ids changed format, the old rows at head (110 entries) and at tags 3.6.5/3.6.6/3.6.8/3.6.9 (110 each) are orphaned. Delete them by filtering on the old-format canonical_id pattern:

```bash
sqlite3 /home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db "
BEGIN;
DELETE FROM asset_loader_sites WHERE canonical_id GLOB 'ezquake:loader_site:*_[0-9][0-9]*' AND canonical_id NOT LIKE '%_\\_%' ESCAPE '\\';
COMMIT;
SELECT COUNT(*) FROM asset_loader_sites;
"
```

The GLOB pattern matches old-format keys ending with a numeric line suffix. If this feels brittle (it does), prefer a simpler approach: delete all rows, then re-load head + the four historical tags. See Step 7.

- [ ] **Step 7: Nuke + re-load the asset_loader_sites table (safer)**

Simpler than the GLOB surgery: delete all rows in `asset_loader_sites`, then re-extract + re-build-bundle + re-load-assets for head and each historical tag that had loader sites loaded.

```bash
sqlite3 /home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db "DELETE FROM asset_loader_sites;"
```

Then re-load head as in Step 5. For historical tags, the load-assets pipeline needs per-tag asset bundles which are not yet built -- skip the historical re-load in Task 2 and defer to Task 13 validation. At this stage we only care that head's loader-site rows use the new canonical_id.

- [ ] **Step 8: Verify loader-site count matches pre-change**

```bash
sqlite3 /home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db \
  "SELECT COUNT(*) FROM asset_loader_sites WHERE version='head';"
```

Expected: 110.

- [ ] **Step 9: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py packages/qw-config/src/data/ezquake-asset-loader-sites-ast.json packages/qw-config/src/data/ezquake-asset-bundle.json
git commit -m "fix(qw-config): ordinal-based loader-site canonical_id, drops line-number"
```

---

## Task 3: Gap 2 -- Version-tolerance audit (cvars, hud_elements, rulesets)

**Files:** None modified. This task is a discovery pass that produces a catalog of struct-shape failures. Task 4 applies the patches.

**Context:** Only 3 of the 12 extractors depend on struct shapes: cvars, hud_elements, rulesets. They need to tolerate field additions/removals across historical tags. Batch 1 already patched rulesets with a `len > len` loosening (commit `8bf832b`). Apply the same discipline to the other two and to any additional struct-shape corner the cvars extractor might hit on older tags.

- [ ] **Step 1: Create worktrees for 3.6.0 and 3.2.3**

```bash
cd /home/paradoks/projects/quakeworld
for tag in v3.6.0 v3.2.3; do
  version="${tag#v}"
  worktree="/tmp/ezq-$version"
  if [ ! -d "$worktree" ]; then
    git -C research/repos/ezquake-source worktree add "$worktree" "$tag"
  fi
done
ls -d /tmp/ezq-3.6.0 /tmp/ezq-3.2.3
```

Expected: both paths exist.

- [ ] **Step 2: Run cvars extractor against each tag**

```bash
for v in 3.6.0 3.2.3; do
  echo "--- cvars @ $v ---"
  python3 /home/paradoks/projects/quakeworld/packages/qw-config/scripts/extract-ezquake-cvars-clang.py \
    --repo-root /tmp/ezq-$v \
    --output /tmp/ezquake-cvars-$v.json 2>&1 | tail -15
done
```

Capture any tracebacks, "struct field not found" errors, or warnings. Note the output total count. If the extractor crashes, record the exact error.

- [ ] **Step 3: Run hud_elements extractor against each tag**

```bash
for v in 3.6.0 3.2.3; do
  echo "--- hud_elements @ $v ---"
  python3 /home/paradoks/projects/quakeworld/packages/qw-config/scripts/extract-ezquake-hud-elements-clang.py \
    --repo-root /tmp/ezq-$v \
    --output /tmp/ezquake-hud-elements-$v.json 2>&1 | tail -15
done
```

Capture failures. If the HUD register function signature changed between versions, expect parse failures.

- [ ] **Step 4: Run rulesets extractor against each tag**

```bash
for v in 3.6.0 3.2.3; do
  echo "--- rulesets @ $v ---"
  python3 /home/paradoks/projects/quakeworld/packages/qw-config/scripts/extract-ezquake-rulesets-clang.py \
    --repo-root /tmp/ezq-$v \
    --output /tmp/ezquake-rulesets-$v.json 2>&1 | tail -15
done
```

Batch 1's `len > len` tolerance should already handle 3.6.0. 3.2.3 is older and more likely to have a structurally different rulesetDef.

- [ ] **Step 5: Also run the remaining 9 extractors for regression detection**

The non-struct-shape extractors (commands, macros, cmdline, keynames, token_primitives, flag_bits, the three asset extractors) should still work. Sanity check:

```bash
for v in 3.6.0 3.2.3; do
  echo "=== $v non-struct extractors ==="
  for script in extract-ezquake-commands-clang.py extract-ezquake-macros-clang.py extract-ezquake-cmdline-clang.py extract-ezquake-keynames-clang.py extract-ezquake-token-primitives-clang.py extract-ezquake-flag-bits-clang.py; do
    name=$(basename $script .py)
    output="/tmp/ezquake-$(echo $name | sed 's/extract-ezquake-//; s/-clang//')-$v.json"
    python3 /home/paradoks/projects/quakeworld/packages/qw-config/scripts/$script \
      --repo-root /tmp/ezq-$v --output "$output" 2>&1 | tail -3 | head -1
  done
done
```

Note anything that crashes (`ERROR:` lines, tracebacks).

- [ ] **Step 6: Write the audit findings to a scratch note**

```bash
cat > /tmp/batch3-audit-findings.md <<'EOF'
# Batch 3 Phase 2 audit -- 2026-04-21

## 3.6.0

### cvars
<observed>

### hud_elements
<observed>

### rulesets
<observed>

### non-struct extractors
<observed>

## 3.2.3

### cvars
<observed>

### hud_elements
<observed>

### rulesets
<observed>

### non-struct extractors
<observed>

## Patches needed (for Task 4)

- <list of extractors that need Batch-1-style tolerance patches>
EOF
```

Fill in observed counts and errors.

- [ ] **Step 7: No commit.**

This task produces a scratch note, not code. No commit yet. Task 4 commits the patches.

---

## Task 4: Gap 2 -- Apply version-tolerance patches

**Files:** Modify any of `packages/qw-config/scripts/extract-ezquake-cvars-clang.py`, `extract-ezquake-hud-elements-clang.py`, `extract-ezquake-rulesets-clang.py`, and any non-struct extractor that surfaced a failure in Task 3.

**Context:** The audit in Task 3 produced a concrete list of failures. This task applies the minimum patches to make each extractor run cleanly on 3.6.0 and 3.2.3, following the Batch 1 precedent: prefer "at-most" / "at-least" / try-except guards over strict equality checks; accept truncated struct shapes and pad missing fields with None.

- [ ] **Step 1: Re-read the audit findings**

```bash
cat /tmp/batch3-audit-findings.md
```

- [ ] **Step 2: For each failing extractor, locate the assertion / hard check**

Open the file, find where it errors or panics. The Batch 1 ruleset fix is at `/home/paradoks/projects/quakeworld/packages/qw-config/scripts/extract-ezquake-rulesets-clang.py:141-159` -- reference it as the template.

Common patch patterns:

- Strict count check:
  ```python
  if len(raw_values) != len(FIELDS):
      raise RuntimeError(...)
  ```
  becomes
  ```python
  if len(raw_values) > len(FIELDS):
      raise RuntimeError(...)  # extra fields: still a bug
  # pad missing fields with None for older-tag tolerance
  raw_values += [None] * (len(FIELDS) - len(raw_values))
  ```

- Struct-field lookup raises AttributeError:
  ```python
  field_line = struct_decl.fields[name].extent.start.line
  ```
  becomes
  ```python
  field = struct_decl.fields.get(name)
  field_line = field.extent.start.line if field else None
  ```

Apply the pattern that fits each failure.

- [ ] **Step 3: Re-run each patched extractor against 3.6.0 and 3.2.3**

Use the same commands from Task 3 Steps 2-5. Each should now complete without error. Compare totals to head's totals; older tags will naturally have fewer entries, but the extractor shouldn't crash.

- [ ] **Step 4: Regression check at head**

The patches might accidentally regress head's output. Re-run each patched extractor against head:

```bash
cd /home/paradoks/projects/quakeworld
for script in <list of patched scripts>; do
  python3 packages/qw-config/scripts/$script
done
```

Compare stdout totals to the pre-patch values (held in the existing `packages/qw-config/src/data/ezquake-*-ast.json` files). They must match.

- [ ] **Step 5: Commit each patch separately with a descriptive message**

Group patches by extractor. Example:

```bash
git add packages/qw-config/scripts/extract-ezquake-hud-elements-clang.py packages/qw-config/src/data/ezquake-hud-elements-ast.json
git commit -m "fix(qw-config): hud-elements extractor tolerates <observed struct difference>"
```

One commit per patched extractor. Message should name the specific issue surfaced in the audit.

- [ ] **Step 6: Update the audit note**

Mark each finding as resolved in `/tmp/batch3-audit-findings.md`. This file is not committed but is referenced in Task 13's HANDOVER update.

---

## Task 5: Schema v6 design spec

**Files:**
- Create: `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v6-source-overrides.md`

**Context:** Schema v6 adds one new table: `source_overrides`. It's a per-field blame-override index. Extractors emit one row per (entity, version, field_name) whose authoritative source location differs from the entity's primary source_line. The diff pipeline consults this table when emitting modification events and prefers the override. Also fixes Gap 4 (cvar default-value mods via call-sites) by using the same table: the cvars extractor emits an override row for `default_value` whenever a `Cvar_SetDefaultAndValue` / `Cvar_ResetVar` call site exists, pointing at the call site rather than the cvar_t declaration.

- [ ] **Step 1: Write the spec file**

Create the file with this content:

```markdown
---
title: Knowledge Schema v6 -- source_overrides blame index
date: 2026-04-21
status: approved
supersedes: none
superseded_by: none
---

# Knowledge Schema v6

## Motivation

Phase 2f stress tests A2 revealed that 20/25 ruleset modifications and 8/8 hud_element modifications carry null PR after enrichment. The cause: blame anchors at the entity's primary `source_line` (the struct-instance line), not at the line where the field was declared in the struct header. The instance line belongs to a commit that has nothing to do with the field change. Git blame returns the instance-declaration commit; PR lookup misses.

The same pattern affects cvar default-value mods. Many cvar defaults change via `Cvar_SetDefaultAndValue` or `Cvar_ResetVar` call sites elsewhere in the codebase, but blame anchors at the cvar_t declaration line.

Gap 3 (struct-field blame) and Gap 4 (cvar default-value via call sites) are the same architectural shape: the right source line depends on WHICH FIELD changed, not just which entity.

## Design

One new table keyed on (entity_id, version, field_name) that records per-field source locations. Extractors populate it during the normal extract pipeline. The diff pipeline's blame-resolution step consults the table first and falls back to the entity's primary source_line if no override exists.

\`\`\`sql
CREATE TABLE source_overrides (
  entity_id     INTEGER NOT NULL REFERENCES entities(id),
  version       TEXT NOT NULL,
  field_name    TEXT NOT NULL,
  source_file   TEXT NOT NULL,
  source_line   INTEGER NOT NULL,
  source_column INTEGER,
  override_kind TEXT NOT NULL CHECK (override_kind IN (
                  'struct_field_decl',
                  'call_site',
                  'header_declaration'
                )),
  extracted_at  TEXT NOT NULL,
  PRIMARY KEY (entity_id, version, field_name)
);
CREATE INDEX idx_source_overrides_entity ON source_overrides(entity_id, version);
\`\`\`

**override_kind** is informational (diagnostic use only): tells a reader what kind of source site this is. Diff-pipeline logic doesn't branch on it.

**Primary key (entity_id, version, field_name)** means one override per field per version. Re-running an extractor replaces the row. Missing rows mean "fall back to entity's primary source_line".

## Population by type

**Rulesets:** The rulesets extractor currently emits `source_file`, `source_line`, `locked_cvars_json`. After v6 it also emits a map of `field_name` -> `(source_file, source_line)` for each struct field (maxfps, restrict_triggers, ..., restrict_setex). Source location is where the field is DECLARED in `rulesetDef_t` (currently `rulesets.c:30-43` but varies by tag). Emit override_kind='struct_field_decl'.

**HUD elements:** The `hud_t` struct is declared in `hud.h:67-118`. Extractor emits per-field overrides for each field of hud_t, pointing at the header line. Emit override_kind='header_declaration'.

**Cvars:** Scan for call sites of default-mutating APIs: `Cvar_SetDefaultAndValue(cvar*, ...)`, `Cvar_ResetVar(cvar*)`, and any `Cvar_Set("cvarname", ...)` call that's wrapped by a default-setting idiom. For each call site, resolve the first argument to a cvar entity and emit an override on field `default_value` pointing at the call-site line. Emit override_kind='call_site'. At ezQuake head there are 2 `Cvar_SetDefaultAndValue` call sites (r_texture_cvars.c:202 and cl_view.c:1210) and 4 `Cvar_ResetVar` call sites (2 internal in cvar.c, 1 in config_manager.c:557, 1 in settings_page.c:353). Total initial coverage: ~4 externally-visible call sites per tag. Historical tags may have more via removed APIs.

## Diff-pipeline integration

`diff-versions.ts`'s `resolveBlame` function today takes a `row: Row` (the version row for entity+version) and extracts `source_file` + `source_line` from it. With v6, it should first consult `source_overrides` for (entity_id, to_version, field_name) and prefer the override. Fall back to the entity-level source_file/source_line if no row matches.

For creation events (no field_name), keep entity-level blame (no override lookup).
For deletion events (no field_name), keep entity-level blame at from_version.

## Migration

Standard `CREATE TABLE IF NOT EXISTS` pattern. `SCHEMA_VERSION` bumps 5 -> 6. No entities-table rebuild needed (no CHECK changes).

## Verification

- `SELECT COUNT(*) FROM source_overrides WHERE version='head'` -> roughly 6 (ruleset) * 13 (fields) + 83 (hud_element) * ~10 (fields in hud_t) + 4..8 (cvar call sites) = ~900 rows at head.
- Post-fix A2 (3.6.5 -> 3.6.6): the 20+8 null-PR modifications from Batch 2 should now carry non-null pr_number after enrichment runs against the overridden commit_sha.

## Non-goals

- FTE / MVDSV / KTX struct-field blame (Phase 2d/2e).
- Per-call-site blame for commands (addressed naturally because commands only have one registration site each).
- Backfilling source_overrides for tags already loaded -- a one-shot reload across 5 historical tags is faster than writing a migration script.
```

Note the inner ```sql fence is escaped in the plan as `\`\`\`sql` -- unescape to plain ```sql when you write the file.

- [ ] **Step 2: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v6-source-overrides.md
git commit -m "docs(qw-oracle): schema v6 spec -- source_overrides blame index"
```

---

## Task 6: Schema v6 code migration

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/schema.ts`

**Context:** Add the `source_overrides` table and bump `SCHEMA_VERSION` to 6. No entities CHECK changes so no rebuild -- just `CREATE TABLE IF NOT EXISTS`.

- [ ] **Step 1: Bump SCHEMA_VERSION**

At line 8:

```typescript
export const SCHEMA_VERSION = 6;
```

- [ ] **Step 2: Add SCHEMA_V6_ADDITIONS_SQL**

Insert after the existing `SCHEMA_V5_ADDITIONS_SQL` block:

```typescript
const SCHEMA_V6_ADDITIONS_SQL = `
CREATE TABLE IF NOT EXISTS source_overrides (
  entity_id     INTEGER NOT NULL REFERENCES entities(id),
  version       TEXT NOT NULL,
  field_name    TEXT NOT NULL,
  source_file   TEXT NOT NULL,
  source_line   INTEGER NOT NULL,
  source_column INTEGER,
  override_kind TEXT NOT NULL CHECK (override_kind IN (
                  'struct_field_decl',
                  'call_site',
                  'header_declaration'
                )),
  extracted_at  TEXT NOT NULL,
  PRIMARY KEY (entity_id, version, field_name)
);
CREATE INDEX IF NOT EXISTS idx_source_overrides_entity ON source_overrides(entity_id, version);
`;
```

- [ ] **Step 3: Add migrateV5ToV6**

Insert after `migrateV4ToV5`:

```typescript
function migrateV5ToV6(db: Database.Database): void {
  const txn = db.transaction(() => {
    db.exec(SCHEMA_V6_ADDITIONS_SQL);
    db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('6');
  });
  txn();
}
```

No foreign_keys toggle needed -- no entities rebuild.

- [ ] **Step 4: Wire migration into applySchema**

After the v4->v5 block in `applySchema`, add:

```typescript
    if (existingVersion === 5 && SCHEMA_VERSION >= 6) {
      migrateV5ToV6(db);
      existingVersion = 6;
    }
```

And at the end-of-applySchema idempotent exec block, add:

```typescript
  db.exec(SCHEMA_V6_ADDITIONS_SQL);
```

- [ ] **Step 5: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Migrate existing DB**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
cp data/knowledge.db data/knowledge.db.bak-pre-v6
cat > /tmp/migrate-v6.ts <<'EOF'
import Database from 'better-sqlite3';
import { applySchema } from '/home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/load-knowledge/schema.js';
const db = new Database('/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db');
applySchema(db);
const v = db.prepare(`SELECT value FROM schema_meta WHERE key='schema_version'`).get();
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='source_overrides'`).all();
console.log('schema_version:', v);
console.log('source_overrides:', tables);
db.close();
EOF
bunx tsx /tmp/migrate-v6.ts
```

Expected: `schema_version: { value: '6' }`, `source_overrides: [ { name: 'source_overrides' } ]`.

- [ ] **Step 7: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/qw-oracle/scripts/load-knowledge/schema.ts
git commit -m "feat(qw-oracle): schema v6 -- source_overrides blame index"
```

---

## Task 7: TypeScript types + upsert helper

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/types.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts`

**Context:** Add the SourceOverrideRow type and upsert helper. Used by all three struct-shape adapters in subsequent tasks.

- [ ] **Step 1: Add type to types.ts**

Append at the end of the file (after the Batch 2 additions):

```typescript
// --- Phase 2f Batch 3: source_overrides ---------------------------

export type SourceOverrideKind =
  | 'struct_field_decl'
  | 'call_site'
  | 'header_declaration';

export interface SourceOverrideRow {
  entity_id: number;
  version: string;
  field_name: string;
  source_file: string;
  source_line: number;
  source_column: number | null;
  override_kind: SourceOverrideKind;
  extracted_at: string;
}
```

- [ ] **Step 2: Add import and upsert helper to natural-keys.ts**

Add `SourceOverrideRow` to the imports block (alphabetical):

```typescript
  SourceOverrideRow,
```

Append the helper at end of file:

```typescript
export function upsertSourceOverride(db: Database.Database, row: SourceOverrideRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO source_overrides (
      entity_id, version, field_name, source_file, source_line,
      source_column, override_kind, extracted_at
    ) VALUES (
      @entity_id, @version, @field_name, @source_file, @source_line,
      @source_column, @override_kind, @extracted_at
    )
  `).run(row);
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/qw-oracle/scripts/load-knowledge/types.ts apps/qw-oracle/scripts/load-knowledge/natural-keys.ts
git commit -m "feat(qw-oracle): SourceOverrideRow type + upsertSourceOverride helper"
```

---

## Task 8: Ruleset extractor -- emit per-field source locations

**Files:**
- Modify: `packages/qw-config/scripts/extract-ezquake-rulesets-clang.py`

**Context:** The ruleset struct `rulesetDef_t` is defined in `rulesets.c:30` (same file as instances). For each field (maxfps, restrict_triggers, ..., restrict_setex), the extractor needs to record the header-line (declaration) and emit it in the output JSON. The loader adapter (Task 11) reads these and writes to source_overrides.

- [ ] **Step 1: Read the current extractor**

Understand the current output shape. The extractor writes to `packages/qw-config/src/data/ezquake-rulesets-ast.json`. Each ruleset entry has an `ast` sub-object with `source_file`, `source_line`, and the parsed fields.

- [ ] **Step 2: Parse the rulesetDef_t struct declaration**

Add a helper that scans rulesets.c for the `typedef struct rulesetDef_s` block. Parse each field line and record `(field_name, source_line)`:

```python
_FIELD_DECL_RE = re.compile(r"^\s*(?:float|int|double)\s+(\w+)\s*;", re.MULTILINE)

def extract_struct_field_lines(source_text: str) -> dict[str, int]:
    """Returns {field_name: source_line_1-indexed}."""
    # Find the rulesetDef_s typedef block
    m = re.search(r"typedef\s+struct\s+rulesetDef_s\s*\{", source_text)
    if m is None:
        return {}
    start = m.end()
    # Find matching closing brace
    depth = 1
    i = start
    while i < len(source_text) and depth > 0:
        if source_text[i] == "{":
            depth += 1
        elif source_text[i] == "}":
            depth -= 1
        i += 1
    block = source_text[start:i]
    block_start_line = source_text[:start].count("\n") + 1
    fields: dict[str, int] = {}
    for fm in _FIELD_DECL_RE.finditer(block):
        name = fm.group(1)
        line = block_start_line + block[:fm.start()].count("\n")
        fields[name] = line
    return fields
```

- [ ] **Step 3: Emit field_source_lines in the output**

In the main extraction, call `extract_struct_field_lines(rulesets_c_text)` once, and attach the resulting map to each ruleset's output entry:

```python
field_lines = extract_struct_field_lines(rulesets_c_source)
# ... for each ruleset:
entry["ast"]["field_source_lines"] = {
    field: {"source_file": "rulesets.c", "source_line": line}
    for field, line in field_lines.items()
}
```

- [ ] **Step 4: Re-run the extractor at head**

```bash
cd /home/paradoks/projects/quakeworld
python3 packages/qw-config/scripts/extract-ezquake-rulesets-clang.py
python3 -c "
import json
d = json.load(open('packages/qw-config/src/data/ezquake-rulesets-ast.json'))
rulesets = d['rulesets']
sample = rulesets.get('default', {})
print('field_source_lines keys:', list((sample.get('ast') or {}).get('field_source_lines', {}).keys())[:5])
print('sample entry (maxfps):', (sample.get('ast') or {}).get('field_source_lines', {}).get('maxfps'))
"
```

Expected: `field_source_lines` contains keys like `maxfps`, `restrict_triggers`, etc. Each maps to `{source_file: "rulesets.c", source_line: <int>}`.

- [ ] **Step 5: Commit**

```bash
git add packages/qw-config/scripts/extract-ezquake-rulesets-clang.py packages/qw-config/src/data/ezquake-rulesets-ast.json
git commit -m "feat(qw-config): rulesets extractor emits per-field source locations"
```

---

## Task 9: HUD element extractor -- emit per-field source locations

**Files:**
- Modify: `packages/qw-config/scripts/extract-ezquake-hud-elements-clang.py`

**Context:** The `hud_t` struct is defined at `hud.h:67-118`. For each struct field (and each HUD register field passed to `HUD_Register(...)`), emit a source_line from hud.h pointing at the field declaration.

- [ ] **Step 1: Read the current extractor**

The current extractor produces entries with `source_file` + `source_line` pointing at the HUD_Register call site (in various .c files). This task adds per-field locations pointing at hud.h.

- [ ] **Step 2: Parse hud_t struct declaration**

Add a helper similar to Task 8's but targeting hud.h:

```python
def extract_hud_field_lines(hud_h_source: str) -> dict[str, int]:
    m = re.search(r"typedef\s+struct\s+hud_s\s*\{", hud_h_source)
    if m is None:
        return {}
    # Walk to matching brace, collect field declarations
    start = m.end()
    depth = 1
    i = start
    while i < len(hud_h_source) and depth > 0:
        if hud_h_source[i] == "{":
            depth += 1
        elif hud_h_source[i] == "}":
            depth -= 1
        i += 1
    block = hud_h_source[start:i]
    block_start_line = hud_h_source[:start].count("\n") + 1
    field_re = re.compile(r"^\s*(?:const\s+)?(?:\w+\s*\*?)\s+(\w+)\s*(?:\[[^\]]+\])?\s*;", re.MULTILINE)
    fields: dict[str, int] = {}
    for fm in field_re.finditer(block):
        name = fm.group(1)
        line = block_start_line + block[:fm.start()].count("\n")
        fields[name] = line
    return fields
```

- [ ] **Step 3: Attach field_source_lines to each HUD element entry**

Same pattern as Task 8: load hud.h, call the helper once, attach the resulting map to every HUD element output entry.

- [ ] **Step 4: Re-run at head and verify**

```bash
python3 /home/paradoks/projects/quakeworld/packages/qw-config/scripts/extract-ezquake-hud-elements-clang.py
python3 -c "
import json
d = json.load(open('/home/paradoks/projects/quakeworld/packages/qw-config/src/data/ezquake-hud-elements-ast.json'))
sample = next(iter(d['hud_elements'].values()), {})
fsl = (sample.get('ast') or {}).get('field_source_lines', {})
print('field keys:', list(fsl.keys())[:5])
print('sample flags_raw:', fsl.get('flags'))
"
```

Expected: `field_source_lines` populated with `flags`, `min_state`, `draw_order`, etc.

- [ ] **Step 5: Commit**

```bash
git add packages/qw-config/scripts/extract-ezquake-hud-elements-clang.py packages/qw-config/src/data/ezquake-hud-elements-ast.json
git commit -m "feat(qw-config): hud-elements extractor emits per-field source locations"
```

---

## Task 10: Cvars extractor -- emit Cvar_SetDefaultAndValue + Cvar_ResetVar call-site anchors

**Files:**
- Modify: `packages/qw-config/scripts/extract-ezquake-cvars-clang.py`

**Context:** For each call to `Cvar_SetDefaultAndValue(&cvar, ...)` or `Cvar_ResetVar(&cvar)` outside of cvar.c itself (internal uses in cvar.c are plumbing, not interesting), emit an override for field_name `default_value` pointing at the call site. At head this is ~4 externally-visible call sites.

- [ ] **Step 1: Locate the extractor's output shape**

The current cvars extractor output `ezquake-variables-ast.json` has per-cvar entries with `ast.source_file`, `ast.source_line`. Add a top-level key `default_overrides` mapping cvar canonical-name-lowered -> list of {source_file, source_line}.

```python
# At the top of the output dict, alongside "vars":
output["default_overrides"] = {
    "gl_max_size": [
        {"source_file": "r_texture_cvars.c", "source_line": 202},
    ],
    "v_gamma": [
        {"source_file": "cl_view.c", "source_line": 1210},
    ],
    # etc.
}
```

List (not single value) because a cvar could conceivably be reset from multiple sites.

- [ ] **Step 2: Scan for Cvar_SetDefaultAndValue + Cvar_ResetVar call sites**

Walk all .c files in the ezQuake src tree (EXCLUDING cvar.c and config_manager.c -- both have internal uses that aren't what we want to blame). Use a regex matching `Cvar_SetDefaultAndValue\s*\(\s*&?(\w+)` and `Cvar_ResetVar\s*\(\s*&?(\w+)`. For each match, record `(cvar_ident_lowercased, source_file_basename, source_line)`.

```python
_CVAR_DEFAULT_CALL_RE = re.compile(
    r"Cvar_(SetDefaultAndValue|ResetVar)\s*\(\s*&?(\w+)",
)

def scan_default_call_sites(ezq_src_dir: Path) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    SKIP_FILES = {"cvar.c", "config_manager.c"}
    for c_file in ezq_src_dir.glob("*.c"):
        if c_file.name in SKIP_FILES:
            continue
        try:
            text = c_file.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for m in _CVAR_DEFAULT_CALL_RE.finditer(text):
            cvar_ident = m.group(2).lower()
            line = text[:m.start()].count("\n") + 1
            out.setdefault(cvar_ident, []).append({
                "source_file": c_file.name,
                "source_line": line,
            })
    return out
```

Attach the result under `output["default_overrides"]`.

- [ ] **Step 3: Re-run at head and verify**

```bash
python3 /home/paradoks/projects/quakeworld/packages/qw-config/scripts/extract-ezquake-cvars-clang.py
python3 -c "
import json
d = json.load(open('/home/paradoks/projects/quakeworld/packages/qw-config/src/data/ezquake-variables-ast.json'))
do = d.get('default_overrides', {})
print('default_overrides entries:', len(do))
print('sample:', dict(list(do.items())[:3]))
"
```

Expected: at least 2 entries (gl_max_size, v_gamma). May include more if `Cvar_ResetVar` surfaces.

- [ ] **Step 4: Commit**

```bash
git add packages/qw-config/scripts/extract-ezquake-cvars-clang.py packages/qw-config/src/data/ezquake-variables-ast.json
git commit -m "feat(qw-config): cvars extractor emits default-value call-site anchors"
```

---

## Task 11: Loader adapters -- write source_overrides rows

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-rulesets.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-hud-elements.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-cvars.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-version.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/types.ts`

**Context:** Each of the three adapters (rulesets, hud_elements, cvars) now needs to write source_overrides rows in addition to the version row. The cleanest design: extend the `TypeAdapter` interface with an optional `buildOverrides(entityId, version, entry, now) -> SourceOverrideRow[]` method. `load-version.ts` calls it if present and upserts each returned row.

- [ ] **Step 1: Extend the types entry shapes**

In `types.ts`, extend `RulesetAstBlock`, `HudElementAstBlock`, and `ExtractorOutput` (cvars) to include the new fields:

```typescript
// Ruleset:
export interface RulesetAstBlock {
  // ... existing fields ...
  field_source_lines?: Record<string, { source_file: string; source_line: number }>;
}

// HUD element:
export interface HudElementAstBlock {
  // ... existing fields ...
  field_source_lines?: Record<string, { source_file: string; source_line: number }>;
}

// Cvars extractor top-level:
export interface ExtractorOutput {
  groups: GroupDef[];
  vars: Record<string, VariableEntry>;
  default_overrides?: Record<string, Array<{ source_file: string; source_line: number }>>;
  _stats?: Record<string, unknown>;
}
```

- [ ] **Step 2: Extend the TypeAdapter interface in load-version.ts**

Add an optional method:

```typescript
interface TypeAdapter {
  payloadField: string;
  versionsTable: string;
  isSourceBacked: (entry: any) => boolean;
  buildRow: (entityId: number, version: string, entry: any, now: string) => any;
  upsertRow: (db: Database.Database, row: any) => void;
  buildOverrides?: (
    entityId: number,
    version: string,
    entry: any,
    now: string,
    payload: any,
    nameLowered: string,
  ) => SourceOverrideRow[];
}
```

Import `SourceOverrideRow` and `upsertSourceOverride` at the top of load-version.ts.

In the main entity loop, after `adapter.upsertRow(...)`, add:

```typescript
if (adapter.buildOverrides) {
  const overrides = adapter.buildOverrides(
    upsertResult.id, options.version, entry, now, payload, name,
  );
  for (const ov of overrides) {
    upsertSourceOverride(options.db, ov);
  }
}
```

- [ ] **Step 3: Implement buildOverrides for rulesets**

In `load-rulesets.ts`, add:

```typescript
export function buildRulesetOverrides(
  entityId: number,
  version: string,
  entry: RulesetEntry,
  now: string,
): SourceOverrideRow[] {
  const ast = entry.ast;
  if (!ast || !ast.field_source_lines) return [];
  const out: SourceOverrideRow[] = [];
  for (const [field_name, loc] of Object.entries(ast.field_source_lines)) {
    out.push({
      entity_id: entityId,
      version,
      field_name,
      source_file: loc.source_file,
      source_line: loc.source_line,
      source_column: null,
      override_kind: 'struct_field_decl',
      extracted_at: now,
    });
  }
  return out;
}
```

Wire it into the ruleset entry in the ADAPTERS record in load-version.ts: `buildOverrides: buildRulesetOverrides`.

- [ ] **Step 4: Implement buildOverrides for hud_elements**

Same shape in `load-hud-elements.ts`, `override_kind: 'header_declaration'`.

- [ ] **Step 5: Implement buildOverrides for cvars**

Cvars is slightly different -- the overrides come from a top-level `default_overrides` map in the payload, not from per-entry `ast.field_source_lines`. The signature includes `payload: any` to give access to this:

```typescript
export function buildCvarOverrides(
  entityId: number,
  version: string,
  entry: VariableEntry,
  now: string,
  payload: ExtractorOutput,
  nameLowered: string,
): SourceOverrideRow[] {
  const sites = payload.default_overrides?.[nameLowered];
  if (!sites || sites.length === 0) return [];
  // Emit one override per cvar; if multiple call sites, pick the first
  // (deterministic and sufficient for blame -- git blame handles multi-commit
  // histories via log).
  const first = sites[0];
  return [{
    entity_id: entityId,
    version,
    field_name: 'default_value',
    source_file: first.source_file,
    source_line: first.source_line,
    source_column: null,
    override_kind: 'call_site',
    extracted_at: now,
  }];
}
```

Wire into the cvar adapter: `buildOverrides: buildCvarOverrides`.

- [ ] **Step 6: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Re-load head for all three affected types**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
HEAD_SHA=$(git -C ../../research/repos/ezquake-source rev-parse HEAD)
for T in ruleset:ezquake-rulesets-ast.json hud_element:ezquake-hud-elements-ast.json cvar:ezquake-variables-ast.json; do
  TYPE=${T%:*}; JSON=${T#*:}
  npm run load-knowledge -- load-version \
    --project ezquake --version head --type $TYPE \
    --json ../../packages/qw-config/src/data/$JSON \
    --commit $HEAD_SHA --ordinal 2
done
```

- [ ] **Step 8: Verify source_overrides populated**

```bash
sqlite3 /home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db "
SELECT override_kind, COUNT(*) FROM source_overrides
WHERE version='head' GROUP BY override_kind;
"
```

Expected rough counts:
- `struct_field_decl`: 6 rulesets * ~13 fields = ~78
- `header_declaration`: 83 hud_elements * ~10 fields = ~830
- `call_site`: ~2-6 cvars

Spot-check specific rows:

```bash
sqlite3 /home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db "
SELECT e.name, so.field_name, so.source_file, so.source_line, so.override_kind
FROM source_overrides so JOIN entities e ON e.id = so.entity_id
WHERE so.version='head'
  AND (e.canonical_id='ezquake:ruleset:default' AND so.field_name='maxfps')
   OR (e.canonical_id='ezquake:cvar:v_gamma' AND so.field_name='default_value');
"
```

Expected two rows with sensible source_file + source_line pointing into rulesets.c and cl_view.c respectively.

- [ ] **Step 9: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/qw-oracle/scripts/load-knowledge/
git commit -m "feat(qw-oracle): adapters emit source_overrides for ruleset / hud_element / cvar"
```

---

## Task 12: Diff pipeline -- consult source_overrides during blame

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/diff-versions.ts`

**Context:** `resolveBlame` is called with a row + source_prefix + hasSource. For modification events it should prefer the source_overrides entry for (entity_id, to_version, field_name) if one exists. Creation/deletion events have no field_name, so they keep entity-level blame.

- [ ] **Step 1: Read the current resolveBlame**

Lines 396-421 in the current diff-versions.ts. Signature:

```typescript
function resolveBlame(
  ezquakeRepoPath: string,
  blameRef: string,
  row: Row,
  cache: Map<string, BlameOut>,
  sourcePrefix: string,
  hasSource: boolean,
): BlameOut
```

- [ ] **Step 2: Extend resolveBlame to accept an override lookup**

Change the signature to accept optional override metadata. Easier path: add a new function `resolveBlameForField` that wraps `resolveBlame` and checks source_overrides first:

```typescript
function resolveBlameForField(
  db: Database.Database,
  ezquakeRepoPath: string,
  blameRef: string,
  row: Row,
  cache: Map<string, BlameOut>,
  sourcePrefix: string,
  hasSource: boolean,
  entityId: number,
  version: string,
  fieldName: string,
): BlameOut {
  // Consult source_overrides first.
  const override = db.prepare(`
    SELECT source_file, source_line
    FROM source_overrides
    WHERE entity_id = ? AND version = ? AND field_name = ?
  `).get(entityId, version, fieldName) as { source_file: string; source_line: number } | undefined;

  if (override) {
    const key = `${blameRef}|${override.source_file}:${override.source_line}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const repoPath = `${sourcePrefix}${override.source_file}`;
    const result = blameLine(ezquakeRepoPath, blameRef, repoPath, override.source_line);
    const out = result ?? { commit_sha: 'UNKNOWN', commit_message_excerpt: null };
    cache.set(key, out);
    return out;
  }

  // Fallback to entity-level blame.
  return resolveBlame(ezquakeRepoPath, blameRef, row, cache, sourcePrefix, hasSource);
}
```

- [ ] **Step 3: Call resolveBlameForField from the modification branch**

In `diffVersions`, find the modification branch (around line 342):

```typescript
if (fromRow && toRow) {
  for (const field of config.diffableFields) {
    const oldRaw = fromRow[field];
    const newRaw = toRow[field];
    if (!valuesDiffer(oldRaw, newRaw)) continue;
    const blame = resolveBlame(
      options.ezquakeRepoPath, toCommitSha, toRow, blameCache, toSrcPrefix, config.hasSource,
    );
    // ...
  }
}
```

Replace the `resolveBlame` call with `resolveBlameForField`:

```typescript
const blame = resolveBlameForField(
  options.db, options.ezquakeRepoPath, toCommitSha, toRow, blameCache,
  toSrcPrefix, config.hasSource, entityId, options.toVersion, field,
);
```

Creation + deletion branches stay on entity-level `resolveBlame`.

- [ ] **Step 4: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/qw-oracle/scripts/load-knowledge/diff-versions.ts
git commit -m "feat(qw-oracle): diff blame consults source_overrides for modifications"
```

---

## Task 13: Full revalidation + docs update

**Files:**
- Modify: `HANDOVER.md` (mark gaps 2/3/4/11/5 resolved; scorecard row)
- Modify: `apps/qw-oracle/CLAUDE.md` (schema version bump to v6)
- Modify: `apps/qw-oracle/scripts/load-knowledge/e2e-verify.md` (Batch 3 section)
- Modify: `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/MEMORY.md`
- Modify: `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_qw_oracle_vision.md`

**Context:** Re-run A1/A2/A3 on the fixed pipeline, measure PR-attribution improvement, update all docs, push.

- [ ] **Step 1: Re-extract rulesets + hud_elements + cvars at the 4 historical tags**

```bash
cd /home/paradoks/projects/quakeworld
for v in 3.6.5 3.6.6 3.6.8 3.6.9; do
  for script in extract-ezquake-rulesets-clang.py extract-ezquake-hud-elements-clang.py extract-ezquake-cvars-clang.py; do
    python3 packages/qw-config/scripts/$script \
      --repo-root /tmp/ezq-$v \
      --output /tmp/ezquake-${script#extract-ezquake-}-$v.json
    # Rename for predictability
  done
done
```

Rename the outputs to the expected format:

```bash
for v in 3.6.5 3.6.6 3.6.8 3.6.9; do
  mv /tmp/ezquake-rulesets-clang.py-$v.json /tmp/ezquake-rulesets-$v.json 2>/dev/null
  mv /tmp/ezquake-hud-elements-clang.py-$v.json /tmp/ezquake-hud-elements-$v.json 2>/dev/null
  mv /tmp/ezquake-cvars-clang.py-$v.json /tmp/ezquake-variables-$v.json 2>/dev/null
done
```

- [ ] **Step 2: Re-load each tag's affected types**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
for v in 3.6.5 3.6.6 3.6.8 3.6.9; do
  commit=$(git -C ../../research/repos/ezquake-source rev-parse "v$v")
  ordinal=$(sqlite3 data/knowledge.db "SELECT ordinal FROM versions WHERE project='ezquake' AND version='$v';")
  for T in ruleset:rulesets hud_element:hud-elements cvar:variables; do
    TYPE=${T%:*}; NAME=${T#*:}
    JSON="/tmp/ezquake-$NAME-$v.json"
    npm run load-knowledge -- load-version \
      --project ezquake --version "$v" --type $TYPE \
      --json "$JSON" --commit "$commit" --ordinal "$ordinal"
  done
done
```

Each invocation should report `entitiesUpserted: >= <expected>` without errors.

- [ ] **Step 3: Re-run diffs A1 and A2**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run load-knowledge -- diff --project ezquake --from 3.6.8 --to 3.6.9 | tee /tmp/diff-a1-batch3.json
npm run load-knowledge -- diff --project ezquake --from 3.6.5 --to 3.6.6 | tee /tmp/diff-a2-batch3.json
```

- [ ] **Step 4: Measure null-PR improvement for ruleset + hud_element modifications**

Before Batch 3: 20/25 ruleset mods null PR, 8/8 hud_element mods null PR on A2. After Batch 3 + enrichment, expect that null-PR rate to drop.

First inspect how commit_sha distributes post-diff (enrichment happens separately against GitHub -- for this test the commit_sha inspection is enough to know blame landed somewhere different):

```bash
sqlite3 /home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db "
SELECT 'ruleset A2 distinct commit_sha', COUNT(DISTINCT commit_sha)
FROM change_events ce JOIN entities e ON e.id = ce.entity_id
WHERE e.type='ruleset' AND ce.to_version='3.6.6' AND ce.change_kind='modified'
UNION ALL
SELECT 'hud_element A2 distinct commit_sha', COUNT(DISTINCT commit_sha)
FROM change_events ce JOIN entities e ON e.id = ce.entity_id
WHERE e.type='hud_element' AND ce.to_version='3.6.6' AND ce.change_kind='modified'
UNION ALL
SELECT 'cvar default_value A2 commit_sha where override exists',
  (SELECT COUNT(*) FROM change_events ce
   JOIN entities e ON e.id = ce.entity_id
   LEFT JOIN source_overrides so ON so.entity_id = e.id AND so.version='3.6.6' AND so.field_name='default_value'
   WHERE ce.field_name='default_value' AND e.type='cvar' AND ce.to_version='3.6.6'
     AND so.entity_id IS NOT NULL);
"
```

Expected: the distinct commit_sha counts should be larger than a single blame-instance-commit value (before Batch 3, many mods shared one bogus commit; after, each should have its own).

- [ ] **Step 5: Update HANDOVER.md**

Mark gaps 2, 3, 4, 5, 11 as resolved. Add a post-Batch3 scorecard row. Update the open-items hook text.

The specific edits: in the "Phase 2f stress-test gap catalog" section:
- Update the "Updated:" line at the top of the section to note Batch 3 completion
- Mark Tier 1 gaps 2, 3, 4 as RESOLVED with commit references
- Mark gap 11 as RESOLVED
- Note that the fresh-DB CHECK latent bug (Task 2 reviewer flag) is also fixed
- Add a scorecard row: "A1/A2/A3 (post-Batch3)" with the observed commit_sha distinct counts
- Replace "Remaining fix sequencing" with "Phase 2f historical backfill is unblocked" since Batch 3 was the last prerequisite

Use the same editing style as Batch 2's HANDOVER updates.

- [ ] **Step 6: Update apps/qw-oracle/CLAUDE.md**

Bump "schema v5" -> "schema v6" and "Phase 2f Batch 2" -> "Phase 2f Batch 3" status line.

- [ ] **Step 7: Update e2e-verify.md with a Batch 3 section**

Append a "E2E verification - Phase 2f Batch 3" section with:
- Schema v6 migration verification query
- source_overrides row-count-by-override_kind query
- Spot-check: ruleset field override, hud_element field override, cvar default_value call-site override
- A1/A2 blame-attribution improvement query

- [ ] **Step 8: Update memory files**

- MEMORY.md: update the open-handover hook line with "Batch 3 shipped 2026-04-21: all 11 gaps closed + fresh-DB CHECK fix. Phase 2f historical backfill is now unblocked."
- project_qw_oracle_vision.md: update the description frontmatter to mention Batch 3 and bump the schema version. Append a shipped-line to the "What shipped" timeline section.

- [ ] **Step 9: Commit docs**

```bash
cd /home/paradoks/projects/quakeworld
git add HANDOVER.md apps/qw-oracle/CLAUDE.md apps/qw-oracle/scripts/load-knowledge/e2e-verify.md
git commit -m "docs(qw-oracle): Batch 3 complete -- blame-quality fix, historical backfill unblocked"
```

- [ ] **Step 10: Commit the plan itself**

```bash
git add docs/superpowers/plans/2026-04-21-phase-2f-batch-3.md
git commit -m "docs(qw-oracle): commit Batch 3 plan alongside shipped work"
```

- [ ] **Step 11: Push to origin**

```bash
git push origin main
```

- [ ] **Step 12: Final sanity**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run typecheck
sqlite3 data/knowledge.db "SELECT value FROM schema_meta WHERE key='schema_version';"
```

Expected: typecheck PASS, schema_version = '6'.

---

## Self-Review

**Spec coverage check:**
- Gap 5 fresh-DB CHECK -- Task 1
- Gap 11 loader-site ordinal -- Task 2
- Gap 2 audit + patches -- Tasks 3+4
- Schema v6 spec + migration -- Tasks 5+6
- Types + upsert -- Task 7
- Ruleset field-declaration emission -- Task 8
- HUD element field-declaration emission -- Task 9
- Cvar call-site emission -- Task 10
- Loader adapter wiring -- Task 11
- Diff pipeline blame override -- Task 12
- Validation + docs -- Task 13

**Placeholder scan:** No "TBD", no "handle edge cases", no "similar to Task N". The audit-driven Task 4 list is intentionally variable since it depends on what Task 3 discovers -- that's not a placeholder, that's a runtime-determined patch list with a concrete template (Batch-1 precedent at the exact file:line).

**Type consistency:**
- `SourceOverrideRow` defined in Task 7, referenced in Tasks 11 and 12.
- `SourceOverrideKind` string literal type consistent across Tasks 5, 7, 11.
- `upsertSourceOverride` defined Task 7, called in Task 11 (inside load-version.ts main loop).
- `resolveBlameForField` defined Task 12 Step 2, called in Task 12 Step 3.
- `buildOverrides` optional method on TypeAdapter defined Task 11 Step 2, implemented in Task 11 Steps 3/4/5, called from load-version.ts main loop (Task 11 Step 2).
- `field_source_lines` key name is consistent between the ruleset extractor (Task 8), the hud_elements extractor (Task 9), the types file (Task 11 Step 1), and the loader adapters (Task 11 Steps 3/4).
- `default_overrides` top-level payload key is consistent between cvars extractor (Task 10), ExtractorOutput type (Task 11 Step 1), and buildCvarOverrides (Task 11 Step 5).

**Known plan risks:**
- **Task 3/4 scope is discovery-driven.** If 3.2.3 surfaces a large divergence (e.g., the hud_t struct predates the register-with-flags API), the Task 4 patch cost could balloon. Mitigation: if the audit surfaces a genuinely different architecture for any extractor at 3.2.3, stop and escalate -- don't force a patch that distorts the current-head behavior.
- **Historical backfill across pre-Batch-2 loaded tags requires a re-load of all ruleset + hud_element + cvar entries for those tags so source_overrides is populated for them.** Task 13 Step 1-2 handles the 4 historical tags already loaded. If more tags get loaded later (Phase 2f historical walk proper), that walk will populate source_overrides as a side effect of load-version.
- **Cvar call-site resolution is best-effort regex, not AST.** `&cvar_name` is the typical form but `&cvars[i]` or macro-expanded forms won't match. YAGNI for now -- the 4 visible call sites are the target.
- **Diff pipeline change (Task 12) queries source_overrides inside the diff txn via a prepared statement.** This is one extra query per modification event. On a full historical walk, this could be ~10k modifications -> 10k extra queries. If performance becomes an issue, preload source_overrides for the entire to-version into a Map once per diff run.
