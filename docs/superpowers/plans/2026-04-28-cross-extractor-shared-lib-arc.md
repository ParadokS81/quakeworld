# Cross-Extractor Shared-Lib Follow-up Arc

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drain the cross-cutting drain-in-arc findings from the cross-extractor pattern audit (2026-04-28) BEFORE the per-project deep validations (ezQuake / FTE / QWCL via the validate-extractor skill in Mode B) start. The audit found 17 drain-in-arc items spanning 5 sequenced phases plus 4 small drain-now patches that land first.

**Source:** `docs/superpowers/reviews/2026-04-28-cross-extractor-audit-report.md`. Spec: `docs/superpowers/specs/2026-04-28-cross-extractor-pattern-audit.md`.

**Tech stack:** Python 3.12 + libclang 18 (extractors), TypeScript + Bun (loader / quality grid), SQLite (schema v17 → potentially v18 if Phase 2 lands the qc_builtin canonical-name change).

**Sequencing rationale:** Phase 0 (drain-now patches) lands first — surface cleanup that doesn't change extraction output and isn't worth bundling into a phase. Phase 1 (`resolve_fn_ref` lift) is the highest-correctness win and changes only one corner case (unresolved decls surface as cursor.spelling instead of NULL); easy to verify with row-count diffs. Phase 2 lands the cvars-normalization convergence AND the qc_builtin canonical-name fix together — both touch the cvars/qc_builtin per-version contracts and benefit from one schema migration if the qc_builtin name change ships as canonical reshape. Phase 3 lifts the high-volume mechanical duplicates (`_read_extent`, `_strip_quotes`, etc.) and the asset-helper bundle — large LOC reduction with no policy change. Phase 4 is one verification grep + decision. Phase 5 is the documentation-and-schema-export pass that closes the alphabet-sync gaps without changing extraction output.

After this arc lands, three per-project deep validations (ezQuake / FTE / QWCL Mode B in the validate-extractor skill) can run in parallel with confidence that they won't surface the same cross-cutting issues four times.

---

## Phase 0: Small drain-now patches (no extraction change)

These four findings are too small to warrant a phase but should land before the arc opens. None change extraction output; all are pure surface cleanup.

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/extractor_lib/__init__.py`
- Delete: `apps/qw-oracle/scripts/extractors/extractor_lib/_base.py`
- Modify: `apps/qw-oracle/scripts/extractors/extractor_lib/README.md`
- Modify: `apps/qw-oracle/scripts/extractors/fte/_handler_asset_cvar_bindings.py`
- Modify: `apps/qw-oracle/scripts/extractors/fte/_handler_asset_loader_sites.py`
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_cmdline.py`

### Task 0.1: Delete dead `_base.py` (D.2.10)

- [ ] **Step 1: Confirm zero importers**

```bash
grep -rn "from extractor_lib._base\|from extractor_lib import.*Handler\|extractor_lib\._base" apps/qw-oracle/scripts/extractors/
```

Expected: zero matches (verified during audit).

- [ ] **Step 2: Delete the file and update references**

```bash
rm apps/qw-oracle/scripts/extractors/extractor_lib/_base.py
```

Edit `apps/qw-oracle/scripts/extractors/extractor_lib/__init__.py` to remove the `_base` mention from the docstring.

Edit `apps/qw-oracle/scripts/extractors/extractor_lib/README.md` to remove any sentences claiming `KeynamesEzquakeHandler` uses the `Handler` Protocol (it doesn't — it has its own `process_file` shape; documented in its own docstring).

- [ ] **Step 3: Verify imports still resolve**

```bash
python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); from extractor_lib._visitor import Visitor, walk_tu_dispatch; from extractor_lib._resolve import resolve_fn_ref; from extractor_lib.clang_config import PARSE_OPTS; print('imports ok')"
```

Expected: `imports ok`.

### Task 0.2: Rename two FTE asset handler classes (D.5.1, D.5.2)

- [ ] **Step 1: Rename `AssetCvarBindingsHandler` → `AssetCvarBindingsFteHandler`**

```bash
# In apps/qw-oracle/scripts/extractors/fte/_handler_asset_cvar_bindings.py:
sed -i 's/^class AssetCvarBindingsHandler/class AssetCvarBindingsFteHandler/' apps/qw-oracle/scripts/extractors/fte/_handler_asset_cvar_bindings.py
```

- [ ] **Step 2: Rename `AssetLoaderSitesHandler` → `AssetLoaderSitesFteHandler`**

```bash
sed -i 's/^class AssetLoaderSitesHandler/class AssetLoaderSitesFteHandler/' apps/qw-oracle/scripts/extractors/fte/_handler_asset_loader_sites.py
```

- [ ] **Step 3: Update `extract.py` imports + `collect_handlers` body**

Edit `apps/qw-oracle/scripts/extractors/fte/extract.py`:
- Line 82: `from _handler_asset_loader_sites import AssetLoaderSitesHandler` → `AssetLoaderSitesFteHandler`
- Line 83: `from _handler_asset_cvar_bindings import AssetCvarBindingsHandler` → `AssetCvarBindingsFteHandler`
- Lines 91-92 (in `collect_handlers`): update class instantiations.

- [ ] **Step 4: Re-run extraction smoke**

```bash
python3 apps/qw-oracle/scripts/extractors/fte/extract.py --workers 4 --limit-files 50
```

Expected: clean run, no import errors, JSON outputs unchanged in shape (a full re-extract isn't part of this task).

### Task 0.3: Rename mvdsv cmdline `containing_function` → `enclosing_function` (D.1.7)

- [ ] **Step 1: Confirm field name divergence**

```bash
grep -hn "containing_function\|enclosing_function" apps/qw-oracle/scripts/extractors/mvdsv/_handler_cmdline.py
```

Expected: only `containing_function` in mvdsv (line 143).

- [ ] **Step 2: Rename in handler emission**

Edit `apps/qw-oracle/scripts/extractors/mvdsv/_handler_cmdline.py:143` — change `"containing_function"` to `"enclosing_function"`.

- [ ] **Step 3: Verify loader-side compatibility**

```bash
grep -hn "containing_function\|enclosing_function" apps/qw-oracle/scripts/load-knowledge/load-cmdline-params.ts
```

If the loader reads `enclosing_function`, this is a no-op rename + the loader was already silently ignoring `containing_function`. If the loader reads `containing_function`, this rename will break it — verify and update both sides atomically.

- [ ] **Step 4: Re-run mvdsv extraction + load**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project mvdsv --version head
```

Expected: clean run, count assertions all PASS.

### Task 0.4: Quality grid + commit Phase 0

- [ ] **Step 1: Quality grid**

```bash
for proj in mvdsv ezquake fte qwcl; do
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project $proj --family both
done
```

Expected: all F1 PASS / F2 CLEAN-or-pre-existing.

- [ ] **Step 2: Commit Phase 0**

```bash
git add apps/qw-oracle/scripts/extractors/{extractor_lib/,fte/,mvdsv/}
git commit -m "chore(qw-oracle): drain cross-extractor audit Phase 0 small patches"
```

---

## Phase 1: `resolve_fn_ref` lift adoption (D.2.1 / D.1.3)

Adopt the lifted permissive `resolve_fn_ref` (already in `extractor_lib/_resolve.py`, used by mvdsv) across the six private strict-policy copies in ezquake / fte / qwcl. This is the only audit finding that could surface previously-unloaded entities (rows whose handler decl libclang couldn't bind, currently dropped silently with `None`).

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/ezquake/_handler_commands.py`
- Modify: `apps/qw-oracle/scripts/extractors/ezquake/_handler_macros.py`
- Modify: `apps/qw-oracle/scripts/extractors/ezquake/_handler_hud_elements.py`
- Modify: `apps/qw-oracle/scripts/extractors/fte/_handler_commands.py`
- Modify: `apps/qw-oracle/scripts/extractors/fte/_handler_macros.py`
- Modify: `apps/qw-oracle/scripts/extractors/qwcl/_handler_commands.py`

### Task 1.1: Pre-flight count baseline

- [ ] **Step 1: Capture per-project pre-lift counts**

```bash
DB=apps/qw-oracle/data/knowledge.db
for proj in ezquake fte qwcl mvdsv; do
  echo "=== $proj ==="
  sqlite3 "$DB" "SELECT type, COUNT(*) FROM entities WHERE project='$proj' GROUP BY type ORDER BY type;"
done > /tmp/pre-lift-counts.txt
cat /tmp/pre-lift-counts.txt
```

Save the file for diff after Phase 1 lands.

### Task 1.2: Replace each private copy with the lifted import

For each of the 6 files, replace the `def _resolve_fn_ref(...)` private function with `from extractor_lib._resolve import resolve_fn_ref` at the top of the file, then replace each call site `_resolve_fn_ref(arg)` with `resolve_fn_ref(arg)`.

- [ ] **Step 1: ezquake commands** (`apps/qw-oracle/scripts/extractors/ezquake/_handler_commands.py:144-153`)
- [ ] **Step 2: ezquake macros** (`apps/qw-oracle/scripts/extractors/ezquake/_handler_macros.py:36`)
- [ ] **Step 3: ezquake hud_elements** (`apps/qw-oracle/scripts/extractors/ezquake/_handler_hud_elements.py:93`)
- [ ] **Step 4: fte commands** (`apps/qw-oracle/scripts/extractors/fte/_handler_commands.py:70-83`)
- [ ] **Step 5: fte macros** (`apps/qw-oracle/scripts/extractors/fte/_handler_macros.py:87`)
- [ ] **Step 6: qwcl commands** (`apps/qw-oracle/scripts/extractors/qwcl/_handler_commands.py:70-79`)

For each:
1. Add `from extractor_lib._resolve import resolve_fn_ref` near the top of the file (next to other extractor_lib imports if any).
2. Delete the private `_resolve_fn_ref` function.
3. Replace every `_resolve_fn_ref(` call site with `resolve_fn_ref(`.

### Task 1.3: Re-extract every project

- [ ] **Step 1: Re-extract all four projects via extract-tag**

```bash
for proj in ezquake fte qwcl mvdsv; do
  echo "=== $proj ==="
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project $proj --version head
done
```

- [ ] **Step 2: Capture post-lift counts**

```bash
for proj in ezquake fte qwcl mvdsv; do
  echo "=== $proj ==="
  sqlite3 "$DB" "SELECT type, COUNT(*) FROM entities WHERE project='$proj' GROUP BY type ORDER BY type;"
done > /tmp/post-lift-counts.txt
diff /tmp/pre-lift-counts.txt /tmp/post-lift-counts.txt
```

Acceptance: any new rows are previously-unresolved decls now surfacing as cursor.spelling. Audit each new entry against the source — if the spelling matches the registered handler name in source, the new row is correct (the strict policy was silently dropping it). If spellings don't match, that's a regression — investigate.

- [ ] **Step 3: Quality grid**

```bash
for proj in mvdsv ezquake fte qwcl; do
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project $proj --family both
done
```

If F1.*.count probes fail (because they're equality assertions), update the `expected` values in `quality-grid.ts` to the new counts and re-run.

### Task 1.4: Commit Phase 1

- [ ] **Step 1: Commit**

```bash
git add apps/qw-oracle/scripts/extractors/{ezquake,fte,qwcl}/_handler_*.py
git add apps/qw-oracle/scripts/load-knowledge/quality-grid.ts  # if expected counts updated
git commit -m "refactor(qw-oracle): adopt lifted resolve_fn_ref across ezquake/fte/qwcl handlers"
```

---

## Phase 2: cvars normalization convergence + qc_builtin canonical-name fix

Bundles five findings that touch the cvars per-version contract plus the latent qc_builtin cross-scope collision. Schema migration territory if the qc_builtin name change ships as canonical reshape (mirrors the v16 info_key Phase B migration).

### Task 2.1: Lift `_unescape_c_string`, `_normalize_flags_raw`, `_FLAG_NAME_RE` to extractor_lib (D.2.6 / D.2.7)

- [ ] **Step 1: Create a shared module**

Create `apps/qw-oracle/scripts/extractors/extractor_lib/_cvar_shared.py` with the canonical implementations of `_unescape_c_string`, `_normalize_flags_raw`, `_parse_flag_names`, and the `_FLAG_NAME_RE = re.compile(r"\bCVAR_[A-Z0-9_]+\b")` constant. Use the mvdsv versions (more recently updated — they carry the post-v17 docstrings); confirm body-equivalence with ezquake before lifting.

- [ ] **Step 2: Update ezquake + mvdsv to import from the shared module**

Edit `ezquake/_handler_cvars.py` and `mvdsv/_handler_cvars.py`:
- Remove the private function definitions.
- Add `from extractor_lib._cvar_shared import unescape_c_string, normalize_flags_raw, parse_flag_names, FLAG_NAME_RE` (rename leading underscores to public if exporting; keep underscore-prefixed if shared-private convention).

- [ ] **Step 3: Re-extract + diff**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project ezquake --version head
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project mvdsv --version head
git diff apps/qw-oracle/scripts/extractors/{ezquake,mvdsv}/output/
```

Expected: zero diff in JSON outputs. Lift is byte-equivalent.

### Task 2.2: Adopt `_normalize_flags_raw` + `_unescape_c_string` in fte + qwcl (D.1.1 / D.1.2)

- [ ] **Step 1: FTE `_handler_cvars.py:496-498`**

Replace `"flags_raw": " | ".join(flags_list) if flags_list else None,` with `"flags_raw": normalize_flags_raw(" | ".join(flags_list) if flags_list else None),`.

- [ ] **Step 2: QWCL `_handler_cvars.py:101,123`**

- Line 101: `default = _strip_quotes(default_raw)` → `default = unescape_c_string(_strip_quotes(default_raw))`.
- Line 123: `flags_raw: Optional[str] = ", ".join(flags_raw_parts) if flags_raw_parts else None` → `flags_raw: Optional[str] = normalize_flags_raw(", ".join(flags_raw_parts) if flags_raw_parts else None)`.

- [ ] **Step 3: Verify the post-v17 sentinel-form contract**

```bash
DB=apps/qw-oracle/data/knowledge.db
for proj in mvdsv ezquake fte qwcl; do
  echo "=== $proj ==="
  sqlite3 "$DB" "SELECT flags_raw, COUNT(*) FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='$proj' AND (flags_raw IN ('0', 'CVAR_NONE')) GROUP BY flags_raw;"
done
```

Expected: zero rows in all projects (post-fix).

```bash
for proj in mvdsv ezquake fte qwcl; do
  echo "=== $proj NULLS ==="
  sqlite3 "$DB" "SELECT COUNT(*) FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='$proj' AND flags_raw IS NULL;"
done
```

Expected: zero or only pre-fix rows (depending on whether re-extract happened); the contract is empty-string for absent/zero/CVAR_NONE.

### Task 2.3: Fix ezquake trailing-comment `;`-or-`,` anchor (D.1.4)

- [ ] **Step 1: Locate the bug**

`apps/qw-oracle/scripts/extractors/ezquake/_handler_cvars.py:763-765`.

- [ ] **Step 2: Replace with `};` literal anchor**

Mirror MVDSV's `_handler_cvars.py:171-180` shape:
```python
close_idx = l.rfind("};")
if close_idx < 0:
    close_idx = l.rfind(";")  # defensive fallback for non-struct close
tail = l[close_idx + (2 if "};" in l else 1):] if close_idx >= 0 else l
```

Add a docstring referencing the audit finding D.1.4 and the prior MVDSV commit `8747ad9`.

- [ ] **Step 3: Re-extract ezquake + diff**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project ezquake --version head
sqlite3 "$DB" "SELECT name, source_file, source_line, trailing_comment FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='ezquake' AND trailing_comment LIKE '%,%';"
```

Expected: previously-truncated trailing comments containing commas now surface in full.

### Task 2.4: qc_builtin canonical-name `<bare>:<table_name>` (D.1.10)

This is a schema migration — bumps schema to v18 (mirrors v16 info_key Phase B).

- [ ] **Step 1: Update mvdsv `_handler_qc_builtins.py`**

Edit `apps/qw-oracle/scripts/extractors/mvdsv/_handler_qc_builtins.py:387-406` (the row-emission point). Change the emitted `name` field from `qc_name` to `f"{qc_name}:{table_name}"`. Preserve the bare name in a separate field (`bare_name`, parallels info_key's pattern at line 271).

- [ ] **Step 2: Add schema migration for v17 → v18**

Edit `apps/qw-oracle/scripts/load-knowledge/schema.ts`:
- Bump `SCHEMA_VERSION` from 17 to 18.
- Add `QC_BUILTIN_NAME_V18_MIGRATION_SQL` that backfills existing entity names from `<bare>` to `<bare>:<table_name>` using the `qc_builtin_versions.table_name` join. Mirror the v16 info_key Phase B migration shape.

- [ ] **Step 3: Add `validQcBuiltin` carve-out in load-version.ts**

The lifted info_key carve-out at `load-version.ts:448` accepts `:<scope>` suffix for info_key only. Add a parallel `validQcBuiltin` for qc_builtin:

```ts
const validQcBuiltin = options.type === 'qc_builtin' && /^[a-z0-9_.+\-]+:(std_builtins|ext_builtins|ext_syscalls)$/.test(name);
```

Insert into the `if (!validTokenPrimitive && !validIdentifier && !validInfoKey && !validLogTemplate) {` chain at line 455.

- [ ] **Step 4: Verify the recovery**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project mvdsv --version head
sqlite3 "$DB" "SELECT COUNT(*) FROM entities WHERE project='mvdsv' AND type='qc_builtin';"
```

Expected: count goes from 93 → 97 (4 previously-collided cross-scope variants now visible). Verify the 4 specific names by audit (the HANDOVER residual lists them implicitly via the 4-name claim).

### Task 2.5: Quality grid + commit Phase 2

- [ ] **Step 1: Update F1 expected counts**

The qc_builtin recovery changes the F1.mvdsv.qc_builtins_count probe's expected value from 93 to 97. Edit `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` accordingly.

- [ ] **Step 2: Run grid**

```bash
for proj in mvdsv ezquake fte qwcl; do
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project $proj --family both
done
```

- [ ] **Step 3: Commit Phase 2**

```bash
git add apps/qw-oracle/scripts/extractors/extractor_lib/_cvar_shared.py
git add apps/qw-oracle/scripts/extractors/{ezquake,fte,qwcl,mvdsv}/_handler_*.py
git add apps/qw-oracle/scripts/load-knowledge/{schema.ts,load-version.ts,quality-grid.ts}
git commit -m "refactor(qw-oracle): cvars normalization convergence + schema v18 qc_builtin canonical-name fix"
```

---

## Phase 3: String-shape helper lifts (no policy change)

Mechanical duplication removal. Largest LOC reduction in the arc; lowest correctness risk.

**Files (lift targets):**
- Create: `apps/qw-oracle/scripts/extractors/extractor_lib/_source.py` (or extend `_resolve.py`).
- Create: `apps/qw-oracle/scripts/extractors/extractor_lib/_asset.py`.
- Modify: ~13 `_handler_*.py` files across all four projects.

### Task 3.1: Lift `_read_extent` (D.2.2)

- [ ] **Step 1: Create the shared helper**

Add `read_extent(source_bytes: bytes, extent) -> str` to `extractor_lib/_source.py` (or `_resolve.py`):
```python
def read_extent(source_bytes: bytes, extent) -> str:
    if not extent or not extent.start or not extent.end:
        return ""
    start = extent.start.offset
    end = extent.end.offset
    if start < 0 or end <= start or end > len(source_bytes):
        return ""
    return source_bytes[start:end].decode("utf-8", errors="replace")
```

- [ ] **Step 2: Replace 13 private copies**

Sweep all `_handler_*.py` files for `def _read_extent` and replace with `from extractor_lib._source import read_extent`.

```bash
grep -lrn "^def _read_extent" apps/qw-oracle/scripts/extractors/{ezquake,fte,qwcl,mvdsv}/_handler_*.py
```

Edit each. Replace call sites `_read_extent(...)` with `read_extent(...)`.

### Task 3.2: Lift `_strip_quotes` (D.2.4)

Same pattern as 3.1; sweep 8 copies.

```bash
grep -lrn "^def _strip_quotes" apps/qw-oracle/scripts/extractors/{ezquake,fte,qwcl,mvdsv}/_handler_*.py
```

Add `strip_quotes(s: str) -> str` to `extractor_lib/_source.py`.

### Task 3.3: Lift `_literal_string` with L-prefix support (D.2.5)

- [ ] **Step 1: Determine canonical version**

Use the L-prefix-tolerant variant (admits `L"..."`) since it's a superset of the L-rejecting variant. Verified safe — codebases without wide strings simply don't fire the L-prefix branch.

- [ ] **Step 2: Lift to `extractor_lib/_source.py`**

Add `literal_string(cursor_or_token, source_bytes) -> Optional[str]` (preserve the existing function signature; check what each handler passes — there are TWO signature variants in the wild).

- [ ] **Step 3: Sweep + diff before/after**

```bash
grep -lrn "^def _literal_string" apps/qw-oracle/scripts/extractors/{ezquake,fte,qwcl,mvdsv}/_handler_*.py
```

Replace each. Re-extract all four projects, diff JSON outputs. Expected: zero diff (L-prefix path is unreachable in the current corpus; verify).

### Task 3.4: Lift `_strip_array_and_qualifiers` (D.2.9)

3 copies (ezquake cvars + commands, mvdsv commands). Lift to `extractor_lib/_source.py`. Same mechanical sweep.

### Task 3.5: Lift the 17 asset-handler helpers to `extractor_lib/_asset.py` (D.2.3)

This is the single largest LOC reduction in the arc.

- [ ] **Step 1: Identify the 17 helpers**

Per Subagent 1's report:
```
_classify_load_trigger, _is_dev_only, _category_from_extension, _category_from_enclosing,
_conversion_slots, _extension_from_template, _resolve_semantic, _classify_parameterized_call,
_extract_expression_snippet, _unary_op_token, _binary_op_token, _drill_to_decl_ref,
_lookup_buffer_write_in_compound, _lookup_deref_assignment_in_compound, _classify_first_arg,
_resolve_cvar_ref, _resolve_cvar_string_ref
```

- [ ] **Step 2: Create `extractor_lib/_asset.py` with all 17 functions**

Use the mvdsv-no, scratch — these helpers exist only in ezquake + fte (mvdsv has no asset handlers). Use the ezquake versions as canonical (longer commit history); confirm body-equivalence with fte before lifting.

- [ ] **Step 3: Replace imports in both projects**

Edit `ezquake/_handler_asset_loader_sites.py` and `ezquake/_handler_asset_cvar_bindings.py`; same for fte. Remove the private function definitions; add `from extractor_lib._asset import (...)`.

- [ ] **Step 4: Project-specific data tables stay private**

Keep `LOADER_FUNCTIONS`, `FUNCTION_TO_CATEGORY`, `EXT_TO_CATEGORY`, `GENERIC_FS_PRIMITIVES`, `GENERIC_LITERAL_CATEGORY` as project-private module-level constants. They're project-specific data, not shared logic.

- [ ] **Step 5: Re-extract + diff**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project ezquake --version head
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project fte --version head
git diff apps/qw-oracle/scripts/extractors/{ezquake,fte}/output/
```

Expected: zero diff.

### Task 3.6: Quality grid + commit Phase 3

- [ ] **Step 1: Grid**

```bash
for proj in mvdsv ezquake fte qwcl; do
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project $proj --family both
done
```

- [ ] **Step 2: Commit**

```bash
git add apps/qw-oracle/scripts/extractors/extractor_lib/{_source.py,_asset.py}
git add apps/qw-oracle/scripts/extractors/{ezquake,fte,qwcl,mvdsv}/_handler_*.py
git commit -m "refactor(qw-oracle): lift string-shape + asset helpers to extractor_lib"
```

---

## Phase 4: FTE cmdline param-prefix verification (D.1.6)

Smallest phase. One verification grep + one decision.

### Task 4.1: Grep FTE source for `+`-prefixed COM_CheckParm calls

- [ ] **Step 1: Run the grep**

```bash
grep -rn 'COM_CheckParm("\+' research/repos/fteqw/engine/ 2>/dev/null | head -20
```

If hits exist (`+set`, `+exec`, `+map`, etc.):
- [ ] **Step 2a: Widen the filter**

Edit `apps/qw-oracle/scripts/extractors/fte/_handler_cmdline.py:105` — replace `name.startswith("-")` with `name.startswith(("-", "+"))` OR hoist a class-level `PARAM_PREFIXES = ("-", "+")` matching MVDSV's shape.

- [ ] **Step 3a: Re-extract FTE + diff entity counts**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project fte --version head
```

If new cmdline_param entities surface, audit them against the source (typical: `+set`, `+exec`, `+map`).

If no hits exist:
- [ ] **Step 2b: Document as intentional**

Add a docstring comment to `_handler_cmdline.py:105` referencing audit finding D.1.6 and the verification result. Move the divergence from drain-in-arc to documented-by-design.

### Task 4.2: Commit Phase 4

```bash
git add apps/qw-oracle/scripts/extractors/fte/_handler_cmdline.py
git commit -m "$(case-dependent message)"
```

Either `feat(qw-oracle): widen FTE cmdline param-prefix to ('-', '+')` or `docs(qw-oracle): document FTE cmdline single-prefix policy`.

---

## Phase 5: Schema/loader alphabet sync + log_template escape doc

Closes the alphabet-drift risk between schema.ts CHECK constraints and load-version.ts `valid*` regex carve-outs (D.4.1 + D.4.2). Documents the log_template raw-escape preservation contract (D.1.11).

### Task 5.1: Export scope and channel alphabets from schema.ts (D.4.1 / D.4.2)

- [ ] **Step 1: Add named exports**

Edit `apps/qw-oracle/scripts/load-knowledge/schema.ts`:
```ts
export const INFO_KEY_SCOPES = ['userinfo', 'serverinfo', 'localinfo'] as const;
export const LOG_TEMPLATE_CHANNELS = ['broadcast', 'client', 'console', 'system'] as const;
```

Place near `SCHEMA_VERSION` (line 8) for discoverability. The CHECK constraint strings inside the SQL DDL strings remain hardcoded (DDL doesn't admit interpolation), but the exports become the single source of truth for the JS-side validation.

- [ ] **Step 2: Update load-version.ts to consume the exports**

Edit `apps/qw-oracle/scripts/load-knowledge/load-version.ts:448`:
```ts
const SCOPE_RE = new RegExp(`^\\*?[a-z0-9_.+\\-]+:(${INFO_KEY_SCOPES.join('|')})$`);
const validInfoKey = options.type === 'info_key' && SCOPE_RE.test(name);
```

Same pattern for `validLogTemplate` at line 454 using `LOG_TEMPLATE_CHANNELS`.

Add `import { INFO_KEY_SCOPES, LOG_TEMPLATE_CHANNELS } from './schema.js';` at the top.

- [ ] **Step 3: Add a hand-written sync test (optional but recommended)**

Add a small test (in `apps/qw-oracle/scripts/load-knowledge/`) that asserts the exports match the literal strings in the SQL DDL. Catches drift at PR review time.

### Task 5.2: Document log_template raw-escape preservation contract (D.1.11)

- [ ] **Step 1: Decide normalize vs document**

Read the existing log_template consumers (load-log-templates.ts, MCP server, any concept-note tooling). If consumers depend on raw-escape preservation (likely — they need to render `%s` and `\n` literally for format-string analysis), keep raw-escape contract.

If consumers depend on interpreted escapes (unlikely for log_template), normalize at extraction time.

- [ ] **Step 2: Document the asymmetry**

Edit `apps/qw-oracle/SCHEMA.md` (or wherever the per-table contracts live) with an explicit section on log_template format strings:
> Format strings in `log_template_versions.format_string` are stored in raw source-code form. Consumers handle escape interpretation. This contrasts with `cvar_versions.default_value`, which has C escapes interpreted at extraction time. Rationale: log_template format strings carry semantically-meaningful `%`/`\n` that consumers need to interpret per-call-site; cvar default values are run-time string values whose escapes must already be resolved before they reach consumers.

- [ ] **Step 3: Add a docstring cross-reference**

In `apps/qw-oracle/scripts/extractors/mvdsv/_handler_log_templates.py:42-44`, add a sentence: "See SCHEMA.md § log_template for the raw-form preservation rationale and the contrast with cvar `default_value` post-v17 escape interpretation."

### Task 5.3: Commit Phase 5

- [ ] **Step 1: Quality grid**

```bash
for proj in mvdsv ezquake fte qwcl; do
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project $proj --family both
done
```

- [ ] **Step 2: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/{schema.ts,load-version.ts}
git add apps/qw-oracle/{SCHEMA.md,scripts/extractors/mvdsv/_handler_log_templates.py}
git commit -m "refactor(qw-oracle): export scope/channel alphabets + document log_template escape contract"
```

---

## Acceptance for the arc

- [ ] All 17 drain-in-arc findings from the audit have been addressed (commits exist for each).
- [ ] All four drain-now patches landed in Phase 0.
- [ ] HANDOVER amendments capture the 10 deferred findings (see HANDOVER.md updates).
- [ ] `validate-extractor` skill in Mode B can run cleanly per-project (ezquake / fte / qwcl) without re-discovering any of the cross-cutting issues drained here.
- [ ] Schema is at v18 (post Phase 2 qc_builtin migration); knowledge.db reflects v18 markers.
- [ ] All quality-grid F1 probes PASS at equality (with updated `expected` values where Phase 1 / Phase 2 changed counts).
- [ ] `extractor_lib/` contains: `__init__.py`, `_visitor.py`, `_resolve.py`, `_source.py`, `_asset.py`, `_cvar_shared.py`, `clang_config.py` (7 files; was 5 pre-arc; `_base.py` deleted, three new shared modules added).

## What comes after

Per-project deep validations, run in parallel as three subagents in one session OR sequentially across three sessions:

1. ezQuake Mode B (validate-extractor skill).
2. FTE Mode B.
3. QWCL Mode B.

After all three complete, Layer 1 has been validated end-to-end across the libclang-based extractor surface. KTX (tree-sitter) is the next missing piece (separate methodology, separate runbook).
