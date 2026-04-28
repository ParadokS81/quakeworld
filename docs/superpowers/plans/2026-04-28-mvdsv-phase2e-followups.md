# MVDSV Phase 2e Follow-ups

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drain the residual findings from the third-party validation pass on the MVDSV Phase 2e Layer 1 ship (2026-04-27). Layer 1's contract is "extractor output equals source truth, byte-reproducible." Anything that softens that contract or hides genuine source data gets fixed.

**Source:** Validation report run on 2026-04-28 against the shipped HEAD `f8fdc53`. All findings here are from that report.

**Tech Stack:** Python 3.12 + libclang 18 (extractors), TypeScript + Bun (loader / quality grid), SQLite (schema v15 → v16).

**Reference:**
- Validation report: in-conversation (this session), 2026-04-28
- Predecessor plan: `docs/superpowers/plans/2026-04-27-mvdsv-layer1-extraction.md`
- Spec for the original ship: `docs/superpowers/specs/2026-04-27-mvdsv-extraction-design.md`

**Sequencing rationale:** Phase A (equality probes) lands first because every later phase changes counts; the new probes must be tight before we touch anything else. Phase B (info_key) and Phase C (protocol_message kinds) are the two correctness fixes that change DB shape; they ship together with one schema migration. Phase D normalizes representation gaps. Phase E is small cleanups.

---

## Phase A: Tighten quality-grid floors to equality probes

The current F1.*.count probes assert `n >= floor` with 1.7%-15% cushion. A 1-2 row regression on cvar (181/182) or qc_builtin (91/92) silently passes. Layer 1 has no legitimate noise — every count change is either a deliberate source-truth update or a bug. The probe should fail loudly on either.

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`

### Task 1: Convert all F1.*.count regression probes to equality assertions

- [ ] **Step 1: Audit existing count probes**

```bash
grep -nE "name: 'F1\..*count" apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
```

Expected: F1.mvdsv.{cvars_source_backed,commands,cmdline_params,protocol_messages,info_keys,log_templates,qc_builtins}_count plus F1.fte.* and F1.ezquake.* equivalents. Confirm by listing.

- [ ] **Step 2: Replace each `lo` floor with an `expected` constant**

For every count probe:
- Rename `lo` → `expected`
- Change `status: n >= lo ? 'PASS' : 'FAIL'` → `status: n === expected ? 'PASS' : 'FAIL'`
- Change description from `count >= ${lo}` → `count == ${expected}`
- Update summary text: `${n} ${type} (expected ${expected})` on miss

Set each `expected` to today's actual count from the live DB:

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
for t in cvar command cmdline_param protocol_message info_key log_template qc_builtin; do
  echo -n "$t: "
  sqlite3 "$DB" "SELECT COUNT(*) FROM entities WHERE project='mvdsv' AND type='$t' AND source_state='source_backed'"
done
```

Expected at HEAD `f8fdc53`: cvar=183, command=108, cmdline_param=11, protocol_message=105, info_key=44, log_template=691, qc_builtin=93.

For FTE and ezquake, same query with the appropriate project filter. Record the baselines.

- [ ] **Step 3: Update the doc-comment header**

The comment block above the MVDSV probes currently says "Source-of-truth counts at the time these probes were minted: ..." — update to reflect that those counts are now load-bearing equality assertions, not informational baselines, and that the probe file is the canonical source-of-truth and must be edited when entity counts change.

- [ ] **Step 4: Verification**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project mvdsv --family regression
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project fte --family regression
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project ezquake --family regression
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project qwcl --family regression
```

All count probes PASS. Then synthesize a regression: temporarily drop one MVDSV cvar and re-run — F1.mvdsv.cvars_source_backed_count must FAIL. Restore. (Don't commit the synthetic.)

---

## Phase B: info_key cross-scope split (schema v16)

`*z_ext` registers in MVDSV with two genuinely distinct semantic surfaces (serverinfo/write/SV_InitLocal vs userinfo/read+remove/SVC_DirectConnect). The current `(project, type, name)` UNIQUE in `entities` collapses them to one — the userinfo registration is silently lost. The natural identity of an info_key is `(name, scope)`, not just `name`.

This is the only known cross-scope dup at HEAD, but the architecture must support it for any future MVDSV/KTX revision that adds another. We also lose call-site evidence today.

**Approach:** Make scope part of the canonical name. Entity name = `<bare_name>:<scope>` for info_keys. Pros: no `entities` schema change, no impact on cvar/command/macro/etc. Cons: `lookup_entity('*z_ext')` needs a fallback to match by bare name.

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_info_keys.py`
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-info-keys.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-version.ts` (the array→dict dedup branch)
- Modify: `apps/qw-oracle/serve/mcp/src/tools/lookup_entity.ts` (or wherever info_key lookup lives)
- Modify: `apps/qw-oracle/scripts/load-knowledge/schema.ts` (no DDL change — just the v16 marker bump)
- Modify: `apps/qw-oracle/SCHEMA.md`

### Task 2: Emit info_keys with scope-suffixed canonical names

- [ ] **Step 1: Update `_handler_info_keys.py` finalize**

Change the emitted `name` field from `<bare_name>` to `<bare_name>:<scope>` (e.g., `*z_ext:serverinfo`, `*z_ext:userinfo`). Keep a separate field `bare_name` for downstream consumers and MCP fallback. The natural-key dedup inside the handler is now per-(name, scope), not just name — so both `*z_ext` registrations survive.

- [ ] **Step 2: Verify the JSON output**

```bash
python3 apps/qw-oracle/scripts/extractors/mvdsv/extract.py --workers 12
jq '.info_keys | length, ([.[] | .name] | unique | length)' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-info-keys-ast.json
```

Expected: 45 entries, 45 unique names (was 45/44).

```bash
jq '[.info_keys[] | select(.bare_name == "*z_ext")] | length' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-info-keys-ast.json
```

Expected: 2.

### Task 3: Update load-info-keys.ts for the new shape

- [ ] **Step 1:** Read `bare_name` (new) and `scope` from the AST block. The `entities.name` row gets the suffixed form; `info_key_versions.scope` already carries the scope unsuffixed. No schema DDL change — we just stop colliding on the natural key.

- [ ] **Step 2:** In `load-version.ts` array→dict normalization (lines 308-323), add a `console.warn` when a name is dropped. Belt-and-braces: even with the suffix fix above, future cross-X dups in any entity type should not disappear silently.

- [ ] **Step 3: Re-run load and verify**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project mvdsv --version head --ordinal 999999
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "SELECT name, scope FROM entities e JOIN info_key_versions ikv ON e.id = ikv.entity_id WHERE e.project='mvdsv' AND e.name LIKE '*z_ext%';"
```

Expected: 2 rows: `*z_ext:serverinfo|serverinfo` and `*z_ext:userinfo|userinfo`. Total info_key count goes 44 → 45.

- [ ] **Step 4: Bump F1.mvdsv.info_keys_count expected value (Phase A) from 44 → 45.**

### Task 4: MCP `lookup_entity` falls back to bare-name match for info_keys

- [ ] **Step 1:** Find the lookup_entity tool implementation.

```bash
grep -rln "lookup_entity\|lookupEntity" apps/qw-oracle/serve/
```

- [ ] **Step 2:** When the lookup query is `*z_ext` and `type=info_key`, return all rows whose `name` starts with `*z_ext:`. Surface scope in the response so the consumer disambiguates. Document the rule in the tool description.

- [ ] **Step 3: Verify**

```bash
cd apps/qw-oracle/serve/mcp && bun run scripts/verify-rewrite.ts 2>&1 | tail -20
```

If there's an info_key smoke test, ensure it covers cross-scope. Add one if missing.

### Task 5: Schema bump

- [ ] **Step 1:** No DDL change — info_key_versions already has `scope`. Bump SCHEMA_VERSION 15 → 16 in `schema.ts` purely as a marker that the canonical-name convention changed. Add a `migrateV15ToV16` no-op (or a one-time backfill that rewrites existing info_key entity names if any DBs are migrating from a v15 with the old shape).

- [ ] **Step 2:** Update `apps/qw-oracle/SCHEMA.md` v16 section: document the `<name>:<scope>` convention for info_keys.

---

## Phase C: protocol_message kind classification

Two heterogeneous-bag findings:

1. `kind=protocol_version` conflates `PROTOCOL_VERSION` (the wire protocol version, value 28) with `PROTOCOL_VERSION_FTE` / `_FTE2` / `_MVD1` (4-byte packed conditional-compilation gate identifiers). Different concepts.
2. `kind=pext_mvd` mixes bit flags (`(1<<N)`), plain integers (`128`), aliases (`MVD_PEXT1_INCLUDEINMVD = MVD_PEXT1_HIDDEN_MESSAGES`), and no-value markers (`MVD_PEXT1_DEBUG`).

Same shape likely affects `pext_fte`. Verify and apply consistently.

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_protocol.py`
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-protocol-messages.ts` (CHECK might widen)
- Modify: `apps/qw-oracle/scripts/load-knowledge/schema.ts` (CHECK on `kind`)
- Modify: `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` (F2.mvdsv.protocol_message_kinds_distribution)
- Modify: `apps/qw-oracle/SCHEMA.md`

### Task 6: Split `protocol_version` into wire vs extension-id

- [ ] **Step 1:** In `_handler_protocol.py::_kind_for`, change the `PROTOCOL_VERSION` prefix match to:
  - exact match `PROTOCOL_VERSION` → `kind=protocol_version`
  - prefix match `PROTOCOL_VERSION_` → `kind=protocol_extension_id`

- [ ] **Step 2:** Verify extraction:

```bash
python3 apps/qw-oracle/scripts/extractors/mvdsv/extract.py --workers 12
jq '[.protocol_messages[] | select(.ast.kind == "protocol_version")] | map(.name)' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-protocol-messages-ast.json
jq '[.protocol_messages[] | select(.ast.kind == "protocol_extension_id")] | map(.name)' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-protocol-messages-ast.json
```

Expected: protocol_version=[`PROTOCOL_VERSION`]; protocol_extension_id=[`PROTOCOL_VERSION_FTE`, `PROTOCOL_VERSION_FTE2`, `PROTOCOL_VERSION_MVD1`].

### Task 7: Subdivide `pext_mvd` and `pext_fte` by value shape

- [ ] **Step 1: Audit pext_fte for the same bag problem**

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 -header "$DB" "SELECT e.name, pmv.value, pmv.value_kind FROM entities e JOIN protocol_message_versions pmv ON e.id = pmv.entity_id WHERE e.project='mvdsv' AND pmv.kind='pext_fte' ORDER BY e.name;"
```

Inspect the value distribution. If the same heterogeneity exists, apply the same split to pext_fte.

- [ ] **Step 2: Define the value-shape subkinds**

In `_handler_protocol.py`, after `_kind_for` returns `pext_mvd` or `pext_fte`, classify by `value_kind` and value-string shape:
  - bitshift expression `(1<<N)` → `<base>_bit`
  - plain int (decimal or hex) that's not a single-bit power → `<base>_const`
  - identifier-only RHS that resolves to another macro → `<base>_alias`
  - no value (no `#define X y`, just `#define X`) → `<base>_marker`

Where `<base>` is `pext_mvd` or `pext_fte`. Final kind values: `pext_mvd_bit`, `pext_mvd_const`, `pext_mvd_alias`, `pext_mvd_marker` and the `pext_fte_*` parallel set.

- [ ] **Step 3: Widen the schema CHECK on `kind`**

In `schema.ts`, the `protocol_message_versions.kind` CHECK currently allows `('svc','clc','nq','pext_fte','pext_mvd','protocol_version')`. New set:
`('svc','clc','nq','pext_fte_bit','pext_fte_const','pext_fte_alias','pext_fte_marker','pext_mvd_bit','pext_mvd_const','pext_mvd_alias','pext_mvd_marker','protocol_version','protocol_extension_id')`.

Add a `migrateV15ToV16` step that ALTERs the table (SQLite-style: rename → recreate with new CHECK → copy → drop) so the constraint widens cleanly. If the v16 marker is already used by Phase B, fold this DDL into the same migration function.

- [ ] **Step 4: Update the F2.mvdsv.protocol_message_kinds_distribution probe**

The probe currently asserts the 6-kind distribution `(clc=20, nq=9, pext_fte=12, pext_mvd=8, protocol_version=4, svc=52)`. Update to the new distribution after re-extraction. Run the probe to capture the new baseline.

- [ ] **Step 5: Verification**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project mvdsv --version head --ordinal 999999
sqlite3 "$DB" "SELECT pmv.kind, COUNT(*) FROM protocol_message_versions pmv WHERE pmv.entity_id IN (SELECT id FROM entities WHERE project='mvdsv') GROUP BY pmv.kind ORDER BY pmv.kind;"
```

Expected: `protocol_extension_id=3, protocol_version=1` (was `protocol_version=4`); `pext_mvd_bit=N, pext_mvd_const=M, pext_mvd_alias=K, pext_mvd_marker=L` (sum=8); same shape for pext_fte (sum=12).

- [ ] **Step 6: Update SCHEMA.md** with the new kind taxonomy and a one-paragraph explanation of why each axis exists.

---

## Phase D: Representation normalization

Three places where the DB stores the same semantic state in two different ways. Each is small but each makes downstream queries lie.

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_cvars.py`
- Modify: `apps/qw-oracle/scripts/extractors/extractor_lib/` (lift `_resolve_fn_ref` from handler-private to shared)
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_commands.py`
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_qc_builtins.py`
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_log_templates.py`
- Modify: `apps/qw-oracle/scripts/load-knowledge/schema.ts` (log_template adds all_call_sites_json)
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-log-templates.ts`

### Task 8: Normalize `flags_raw` for absent vs literal-zero flags

Source `cvar_t {"x", "0"}` (no flags arg) currently stores `flags_raw=""`. Source `cvar_t {"x", "0", 0}` (explicit zero) stores `flags_raw="0"`. Same semantic state, different representation.

- [ ] **Step 1: Pick one canonical form**

Recommendation: emit empty string for both. The literal `0` carries no information beyond "no flags," and consumers querying `WHERE flags_raw = ''` should see all unflagged cvars without an OR clause.

- [ ] **Step 2: Apply in the cvars handler**

In `_handler_cvars.py` finalize/emit, normalize `flags_raw` to empty string when the literal is `0`, `CVAR_NONE`, or absent. Document the rule in the handler docstring.

- [ ] **Step 3: Cross-engine audit**

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
for proj in mvdsv ezquake fte qwcl; do
  echo "=== $proj ==="
  sqlite3 "$DB" "SELECT flags_raw, COUNT(*) FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='$proj' AND (flags_raw='0' OR flags_raw='CVAR_NONE') GROUP BY flags_raw"
done
```

If FTE/QWCL/ezquake have the same divergence, lift the normalization into the shared cvar finalize logic in `extractor_lib/` rather than per-engine handlers.

- [ ] **Step 4: Re-run extract-tag for each affected project, bump F1 count probes if any rows shifted between source_backed and other states (none expected — this is a representation change, not a coverage change).**

### Task 9: Unify `_resolve_fn_ref` into extractor_lib

`_handler_commands.py:117-122` returns `None` for unknown decl kinds. `_handler_qc_builtins.py:167-171` returns `n.spelling` for unknown. Same helper name, different policy. The qc_builtins variant preserves more data; commands variant silently drops references.

- [ ] **Step 1: Move the function to `extractor_lib/_resolve.py` (create if absent)** with the qc_builtins-style policy: return `n.spelling` for unknown decls, document why (silently dropping a reference is data loss).

- [ ] **Step 2: Replace the local copies in commands and qc_builtins with `from extractor_lib._resolve import resolve_fn_ref`.**

- [ ] **Step 3: Re-run extraction and confirm no new function-name resolution gaps surface in the JSON outputs (diff vs HEAD).**

### Task 10: log_template aggregates all call sites (schema parity with info_key)

info_key emits `all_call_sites: [{source_file, source_line, operation}]`. log_template emits only the first call site's `containing_function` and one `(source_file, source_line)` pair. Both are templates registered at multiple sites — same data shape, different storage.

- [ ] **Step 1: Add `all_call_sites_json` TEXT column to `log_template_versions`**

In `schema.ts`, add the column to the v16 migration and to the CREATE TABLE block. NULL allowed for v15 rows (forward-compat); new rows always populate.

- [ ] **Step 2: Aggregate in `_handler_log_templates.py` finalize**

The handler currently first-wins on `(channel, format)`. Change finalize to accumulate every observation into an `all_call_sites` list (`[{source_file, source_line, containing_function}]`). Keep `containing_function` at the top level too for display compatibility (carry the first site's value).

- [ ] **Step 3: Update `load-log-templates.ts` to JSON.stringify and store `all_call_sites_json`.**

- [ ] **Step 4: Verification**

```bash
sqlite3 "$DB" "SELECT format_string, json_array_length(all_call_sites_json) FROM log_template_versions ORDER BY 2 DESC LIMIT 10"
```

Expected: high-fanout templates like `Please upgrade to one of the following:` show >1 call site.

---

## Phase E: Small cleanups

Latent gaps not biting today, plus one doc fix. Each is a tight surgical edit; doing them in this arc keeps the residual list at zero rather than carrying noise into the KTX phase.

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_qc_builtins.py`
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_cvars.py`
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_log_templates.py`

### Task 11: Hex-aware integer literal resolver

- [ ] **Step 1:** In `_handler_qc_builtins.py::_resolve_integer_literal`, change `int(text)` to `int(text, 0)` so `0x1F`, `0o17`, `0b11111` parse transparently. Add a unit-style assertion in the docstring.

- [ ] **Step 2: Verify nothing changed at HEAD** (no entries today use hex). Re-run extract.py and confirm bytewise identical JSON. If any entry changes, that's a latent gap actually triggering — investigate.

### Task 12: Preserve escape sequences in cvar default values

`_handler_cvars._strip_quotes` drops outer quotes from a `"\""` literal but leaves the escape sequence as raw `\"`. Defaults containing escapes lose meaning.

- [ ] **Step 1: Audit MVDSV/ezQuake/FTE/QWCL for escape-bearing defaults**

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "SELECT e.project, e.name, cv.default_value FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE cv.default_value LIKE '%\\\\%' OR cv.default_value LIKE '%\"%' LIMIT 30"
```

If results return zero, the gap is latent. If non-zero, the gap is biting — fix `_strip_quotes` to interpret escape sequences (`\"` → `"`, `\\` → `\`, `\n` → newline, etc.) and document the exact encoding rule.

- [ ] **Step 2: Pick the rule (interpret escapes vs preserve raw) and apply consistently.** Recommendation: interpret, because the runtime cvar default IS the post-interpretation string. Store the interpreted form.

### Task 13: Designated-initializer assertion for std_builtins

`_handler_qc_builtins._extract_std_builtins` assumes positional initializers. A future MVDSV revision using designated init `[5] = PF_foo` would silently desynchronize indices.

- [ ] **Step 1:** Add an explicit cursor-kind check at the top of the per-element loop: if the element is `INIT_LIST_EXPR` with named designators (clang exposes these as child cursors of kind `MEMBER_REF` / `INTEGER_LITERAL` siblings to the value), abort with a diagnostic naming the file+line.

- [ ] **Step 2:** Verify nothing trips at HEAD.

### Task 14: log_template doc/code contradiction fix

`_handler_log_templates.py` docstring at lines 28-35 says concatenated literals (`"foo\n" "bar\n"`) are captured noisily; lines 131-132 say they're skipped. Code captures them.

- [ ] **Step 1: Fix the docstring at lines 131-132 to match the code (captured, not skipped).** One-line edit; verify the code branch is the intended behavior before rewriting the doc the other way around.

---

## Out of scope (deferred with reason)

**ezquake F2 informational anomalies** (`F2.doc_only_crosstab` 194 entries, `F2.default_value_ping_pong` for `gl_lightmode`).

These are pre-existing findings about the ezquake corpus, unrelated to MVDSV Phase 2e. The MVDSV arc didn't touch ezquake source, ezquake handlers, or ezquake probes — these anomalies were present before the arc. Folding ezquake triage into this plan would muddy scope and delay landing the four MVDSV-specific fixes above.

**Action:** add a single line to `HANDOVER.md` noting "ezquake F2.doc_only_crosstab + F2.default_value_ping_pong (gl_lightmode) — pre-existing informational anomalies, triage when ezquake gets attention next." Surface the items so they don't disappear; do not block this arc on them.

---

## Verification (end-to-end after all phases)

```bash
# 1. Extraction reproduces bytewise
python3 apps/qw-oracle/scripts/extractors/mvdsv/extract.py --workers 12
git -C apps/qw-oracle/scripts/extractors/mvdsv/output diff --stat HEAD  # must be empty after the arc commits land

# 2. Load reproduces with the new counts
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project mvdsv --version head --ordinal 999999
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "SELECT type, COUNT(*) FROM entities WHERE project='mvdsv' GROUP BY type ORDER BY type"
# Expected after this arc: cvar=183, command=108, cmdline_param=11, protocol_message=105, info_key=45 (was 44), log_template=691, qc_builtin=93. Total 1236.

# 3. Runtime diff still clean
apps/qw-oracle/scripts/extractors/mvdsv/diff-runtime.sh --type cvar
apps/qw-oracle/scripts/extractors/mvdsv/diff-runtime.sh --type command

# 4. Quality grid all green for all four projects
for proj in mvdsv ezquake fte qwcl; do
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project $proj --family both
done
# All count probes assert equality, all PASS.

# 5. TypeScript clean
cd apps/qw-oracle && bunx tsc --noEmit

# 6. MCP smoke
cd apps/qw-oracle/serve/mcp && bun run scripts/verify-rewrite.ts
```

## Documentation updates

- [ ] `apps/qw-oracle/CLAUDE.md`: bump v15 → v16; note info_key `<name>:<scope>` convention; note new protocol_message kind taxonomy; bump info_key count 44 → 45.
- [ ] `apps/qw-oracle/SCHEMA.md`: v16 section covering Phase B + Phase C + Phase D's log_template column.
- [ ] `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`: add a pattern note for "natural-key includes scope when an identifier carries multiple semantic surfaces" (info_key lesson).
- [ ] `MEMORY.md` entry: amend `project_mvdsv_phase2e.md` with the v16 schema bump and the kind-taxonomy refinement; or add a new follow-up memory pointing to this plan.
- [ ] `HANDOVER.md`: remove the open Phase 2e residuals; add the ezquake F2 deferral note.
