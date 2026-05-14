# QW Oracle Extractor Validation Runbook

The encyclopedic reference for validating Layer 1 extractor output. Companion to `EXTRACTOR-PLAYBOOK.md`: the playbook tells you how to BUILD an extractor; this runbook tells you how to PROVE the extractor's output is correct.

For gate authoring, see `scripts/load-knowledge/VALIDATION-GATES.md`.

**Scope:** libclang-based extractors (ezQuake, FTE, QWCL, MVDSV today; canonical KTX onboarding via the KTX onboarding arc; future ezQuake-family forks like unezQuake; future MVDSV-family forks like antilag-mvdsv). Tree-sitter is reserved for the dusty-ktx fork's `qcsrc/` (QuakeC), out of scope for canonical onboarding -- a parallel runbook will land when dusty-ktx ships.

**When to run:**
- Post-ship validation pass on a freshly landed Layer 1 arc (e.g., the MVDSV Phase 2e validation, 2026-04-28).
- Pre-ship validation as part of the ship process for a new engine port or fork.
- Cross-project audit: run the relevant subset across all four projects looking for shape divergences.
- Periodic sanity check after any change to `extractor_lib/` or `load-knowledge/`.

**Discipline:** every finding from a validation pass goes somewhere. Either fix in the same arc, capture in a follow-up plan with explicit phases, or surface in `HANDOVER.md` with a one-line reason for deferral. No prose deferrals, no silent drops. (Per `feedback_every_finding_gets_a_track`.)

---

## How this runbook plays with the validate-extractor skill

The `validate-extractor` skill is the orchestrator: it picks the mode (cross-project / per-project / post-ship), detects which projects exist, dispatches subagents in parallel where possible, and produces the final report. **The skill does not duplicate this runbook's content.** It reads the runbook, executes it, and reports. If a check is missing from this runbook, fix the runbook -- not the skill.

When invoked manually (no skill), follow this runbook end-to-end as a checklist.

---

## Section 0: Pre-flight

Confirm the baseline before any check runs. Skip checks whose preconditions don't hold; flag the precondition failure as a finding.

- [ ] **Working directory is the monorepo root or a worktree of it.** `pwd` ends in `quakeworld`.
- [ ] **Branch is `main` (or a worktree's branch tracking `main`)** unless the validation explicitly targets a feature branch.
- [ ] **Working tree is clean enough.** Uncommitted changes in `apps/qw-oracle/` outside `data/` mean you're validating a state nobody else can reproduce. Note this in the report.
- [ ] **The target snapshot/tag for the project being validated is checked out** in `research/repos/<project>/`. Confirm the SHA matches the `versions` table row for the loaded version.

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 -header "$DB" "SELECT project, version, commit_sha FROM versions WHERE project='<project>' AND version='<version>';"
git -C research/repos/<project> rev-parse HEAD
# Both should match.
```

- [ ] **Schema version of `knowledge.db` matches the codebase's expected version.** If the DB was loaded under v15 but the code is v17, the validation runs against a stale DB.

```bash
sqlite3 "$DB" "PRAGMA user_version;"  # should equal SCHEMA_VERSION in scripts/load-knowledge/schema.ts
```

### Doc_only budget gate

Two shapes, by walk kind:

**Tag-pair walks** (a new upstream tag landed; you walked it and want to compare against the previous tag): run `extraction-review` with the gate flag. Requires `release_notes` rows for the `to` version, which are present for tag walks because GitHub creates a release body when a tag is pushed.

```bash
npm --prefix apps/qw-oracle --no-workspaces --silent run load-knowledge -- review \
  --project <name> --from <prev> --to <next> \
  --fail-on help-json-classification
```

**Head walks** (refreshing `head` to a newer commit on upstream's default branch, no new tag): the `review` gate cannot run because `head` has no GitHub release body. Use `classify-help-json.py` directly instead — same seed comparison, no release_notes precondition:

```bash
python3 apps/qw-oracle/scripts/classify-help-json.py --project <name> --propose
```

Both shapes flag any `doc_only` entity not present in the project's `seeds/help_json_classifications.yaml`. The tag-pair `--fail-on help-json-classification` flag returns exit code 2 when the bucket has any findings, blocking the snapshot from being merged into slipgate's data dir until each finding is resolved. The head-walk script prints proposals to stdout for operator review; rerun with `--apply --confidence-threshold high` to persist high-confidence proposals to the seed.

This converts a recurring class of mystery doc_only entries -- formerly accumulated as backlog with no triage -- into either a classification artifact (cached) or an extractor improvement task (sidequest). New mysteries surface at extraction time, not weeks later.

---

## Section 1: Reproducibility

Layer 1's contract is "extractor output equals source truth, byte-reproducible." If extraction is non-deterministic, every other check is unreliable.

### 1.1 Re-run the extractor and confirm zero git diff

```bash
python3 apps/qw-oracle/scripts/extractors/<project>/extract.py --workers 12
git -C apps/qw-oracle/scripts/extractors/<project>/output diff --stat HEAD
```

**Acceptance:** empty diff. Wall time recorded for the report.

**Common causes of non-empty diff:**
- Multiprocessing merge order non-determinism (workers emit in different orders across runs). Fix: deterministic merge in driver; sort finalize output by stable keys.
- Path normalization drift (absolute vs relative paths in `source_file`). Fix: normalize at emission.
- libclang/clang version mismatch from a prior run. Fix: check `Config.set_library_file()` line.

### 1.2 Re-run the loader and confirm exact entity counts

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project <project> --version <version> --ordinal <n>
sqlite3 -header "$DB" "SELECT type, COUNT(*) FROM entities WHERE project='<project>' GROUP BY type ORDER BY type;"
```

**Acceptance:** counts match the F1.<project>.*_count probes' `expected` values exactly (post-v17, all F1.*.count probes are equality assertions, not floors).

### 1.3 Confirm the load is idempotent

Re-run the loader a second time without changes. Counts must be identical.

**Acceptance:** identical row counts, no error output, no new `[load-version] case-fold merge` warnings on the second pass.

---

## Section 2: Runtime cross-validation

For projects where a runtime dump (cvarlist, cmdlist, etc.) exists, diff the DB against the dump. The diff has three buckets:

- **Intersect:** runtime says it exists AND DB has it. Healthy core.
- **Runtime-only:** runtime exposes it AND DB doesn't. Either an extractor gap (must fix) OR a categorized exclusion (must document in `OUT_OF_SCOPE.md`).
- **DB-only:** DB has it AND runtime doesn't expose it. Either platform-specific (compiled out on this runtime), runtime-conditional (gated by a cmdline flag the operator didn't pass), head-delta (DB is newer than runtime), or over-detection (extractor wrongly captured it).

### 2.1 Run the diff harness

```bash
apps/qw-oracle/scripts/extractors/<project>/diff-runtime.sh --type cvar
apps/qw-oracle/scripts/extractors/<project>/diff-runtime.sh --type command
# (Add other types as the runtime supports them.)
```

**Acceptance:**
- Runtime-only is empty OR every entry is documented in `<project>/OUT_OF_SCOPE.md` with a bucket assignment.
- DB-only is empty OR every entry is documented in `OUT_OF_SCOPE.md` (platform-specific / runtime-conditional / head-delta / over-detection).
- The numbers in `OUT_OF_SCOPE.md`'s "Final diff state" block match the live diff output.

### 2.2 Verify allowlist / prefix filters

If the runtime dump includes registrations from a different layer (e.g., MVDSV's runtime includes KTX-progs cvars), the diff harness applies prefix and allowlist filters. Validate the filters in BOTH directions:

**Direction A: removed entries are real registrations.** Each entry on the allowlist must NOT be registered in the project's own source. Each entry NOT on the allowlist (but matching a prefix) must NOT be a project-source registration that's being incorrectly filtered out.

```bash
for name in $(cat apps/qw-oracle/scripts/extractors/<project>/validation-fixtures/<other-layer>-allowlist.txt); do
  echo "=== $name ==="
  grep -rn "\"$name\"" research/repos/<project>/src/ | head -3
done
```

**Acceptance:** every allowlist entry returns zero hits in the project source.

**Direction B: kept entries (post-prefix-filter) are project source registrations.** A counter-example means the prefix filter is over-aggressive.

### 2.3 Categorize residuals

For each remaining DB-only or runtime-only entry, assign a bucket:
- Bucket 1: out-of-scope by design (source roots not visited)
- Bucket 2: dynamic registration (Cvar_Create / Cvar_Get / runtime-resolved string)
- Bucket 3: runtime-synthesized names (sprintf-built)
- Bucket 4: platform/cmdline-gated (compiled out OR feature-flag-gated on the captured runtime)
- Bucket 5: head-delta (DB is newer than the runtime dump -- only valid if the runtime is older than the loaded version)

**Acceptance:** every residual has a bucket. No "unclassified" leftovers.

---

## Section 3: Field-accuracy audit (random sample)

Reproducibility and counts confirm structural integrity. Field accuracy confirms the captured FIELDS match source. Skip this section at risk of finding the bug the in-arc reviews missed (the MVDSV pass found `_trailing_comment` `};` literal anchor bug this way; commit `8747ad9`).

### 3.1 Pull a random sample

For each entity type with non-trivial fields, pull 20 random rows. Verify each field against the literal source.

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 -separator $'\t' "$DB" "
  SELECT e.name, cv.default_value, cv.flags_raw, cv.on_change, cv.source_file, cv.source_line, cv.trailing_comment
  FROM entities e JOIN cvar_versions cv ON e.id = cv.entity_id
  WHERE e.project='<project>' ORDER BY RANDOM() LIMIT 20;
"
```

For each row, open the source at `source_file:source_line` and compare every field. Look for:
- `default_value`: matches the second positional arg in the registration. Escapes interpreted (post-v17) -- `\"` should be `"`, not the literal escape.
- `flags_raw`: matches the third positional arg, normalized per the post-v17 rule (literal `0` / `CVAR_NONE` / absent -> empty string; everything else preserved as written).
- `on_change`: matches the fourth positional arg if present; empty otherwise.
- `trailing_comment`: matches the comment after `};` or `,` on the registration line. Empty for entries with no trailing comment.
- `source_file` and `source_line`: point to the actual registration line.

**Acceptance:** 20/20 match. Any mismatch is a finding (severity depends on whether the field is load-bearing for downstream consumers).

### 3.2 Cross-project field-shape audit

When validating multiple projects, check that the same field type is stored the same way across projects. Two checks run as a pair: a regression bar (3.2.1) catches the immediate failure shapes; a positive contract (3.2.2) gates on the canonical post-v17 form.

#### 3.2.1 Regression bar (negative shape check)

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
for proj in mvdsv ezquake fte qwcl; do
  echo "=== $proj ==="
  sqlite3 "$DB" "SELECT flags_raw, COUNT(*) FROM cvar_versions cv
                 JOIN entities e ON cv.entity_id=e.id
                 WHERE e.project='$proj'
                   AND e.source_state='source_backed'
                   AND (flags_raw IN ('0', 'CVAR_NONE') OR flags_raw IS NULL)
                 GROUP BY flags_raw;"
done
```

**Acceptance:** zero rows in all four projects. Catches the post-v17 sentinel-form contract violations PLUS the IS-NULL shape that escaped the original check (the failure mode that surfaced 1085 FTE source_backed rows in the 2026-04-28 Mode B FTE validation).

#### 3.2.2 Positive contract (positive shape check)

For `source_state = 'source_backed'` cvars in `project IN ('ezquake', 'fte', 'mvdsv')`: `flags_raw` MUST be non-NULL AND either `''` (empty, the post-v17 sentinel) OR match `^[A-Z0-9_]+( \| [A-Z0-9_]+)*$` (CVAR_* identifiers joined by ` | `).

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "SELECT
                 e.project,
                 cv.source_root,
                 COUNT(*) AS violation_count,
                 GROUP_CONCAT(DISTINCT cv.flags_raw) AS sample_shapes
               FROM cvar_versions cv
               JOIN entities e ON cv.entity_id=e.id
               WHERE e.project IN ('ezquake', 'fte', 'mvdsv')
                 AND e.source_state='source_backed'
                 AND NOT (
                   cv.flags_raw IS NOT NULL
                   AND (
                     cv.flags_raw = ''
                     OR cv.flags_raw GLOB '[A-Z0-9_]*'
                   )
                 )
               GROUP BY e.project, cv.source_root
               ORDER BY violation_count DESC;"
```

(GLOB is used as a regex-lite filter; the executing shell may also pipe to `grep -E '^[A-Z0-9_]+( \| [A-Z0-9_]+)*$'` for a stricter match. Per-project + per-source-root breakdown columns make findings actionable: "FTE has 1085 violations in plugin:ezhud" vs "ezQuake has 0 violations" tells the operator exactly where to look.)

**QWCL carve-out rationale.** QWCL's 1996-vintage `cvar_t` emits lowercase boolean field values (`"true"`, `"false"`, `"true | false"` post-Phase-6 W3 normalization). The 3.2.2 contract's domain is post-v17 CVAR_* bitmask normalization; QWCL's flag-field semantic isn't in that domain. Carve-out is cleaner than widening the regex (admits typos like `cvar_archive` lowercase) or renormalizing QWCL (invasive, breaks source-truth representation). "QWCL `flags_raw` shape positive contract" is captured as future-arc work in the candidate-positive-contracts list below.

**Acceptance:** zero rows. Any non-empty output is a finding -- either a handler is bypassing the lifted normalizer (the failure mode this contract is designed to catch) or a new flag-name shape needs to be admitted to the regex.

#### Candidate positive contracts (future-arc work)

The 3.2.2 contract gates only on `flags_raw`. Other fields with similar lift/contract gaps that may need positive contracts in future arcs:

- `default_value` C-escape interpretation across all four projects (post-v17 unescape contract; today gated only by hand-spot-check during Mode B).
- `info_key` canonical name shape (`<bare>:<scope>` post-v17 reshape; today gated by `validInfoKey` carve-out in load-version.ts).
- `qc_builtin` canonical name shape (`<bare>:<table>` post-v18 reshape).
- `handler_fn` shape across cvars + commands + macros (today carries no positive contract).
- Description fields (cvars, commands, macros, hud_elements; today carry no shape gate).
- QWCL `flags_raw` shape (lowercase boolean field values) -- distinct from the post-v17 CVAR_* contract.

---

## Section 4: Code review (handlers + adapters)

Static reading of the extraction and loading code. Look for things tests can't catch.

### 4.1 Read every Python handler end-to-end

For each handler in `apps/qw-oracle/scripts/extractors/<project>/_handler_*.py`:
- [ ] Trace the lifecycle: `start_file` -> variant loop -> `end_file` / `finalize`. Confirm per-file state is reset between files; per-variant state is handled correctly inside the file.
- [ ] Look for swallowed exceptions: `try ... except Exception: pass` or `except: continue` patterns. Each one needs a justification in a docstring.
- [ ] Check regex patterns for anchoring (`^...$`), escape correctness, and word boundaries.
- [ ] Check libclang cursor walks for stack-recursion safety (use iterative stacks, not raw recursion).
- [ ] Check INIT_LIST_EXPR walks for off-by-one indexing into struct fields.
- [ ] Check dedup logic: does the natural key (project, type, name) accidentally collapse legitimately distinct entries? (See: MVDSV `*z_ext` finding, fixed in v16 with the `<bare>:<scope>` convention.)
- [ ] Check fork-mode worker boundary: rows must be plain dict/list/str/int/None -- no clang cursors held across pool boundaries, no closures, no file handles.

### 4.2 Read every TS adapter end-to-end

For each adapter in `apps/qw-oracle/scripts/load-knowledge/load-*.ts`:
- [ ] INSERT column list matches the schema DDL exactly. Every column accounted for; named-param keys (`@field`) match the row interface field names.
- [ ] AST shape (interfaces) match what the Python handler emits. Sample-check by `jq 'first(.[]?)'` on the JSON output.
- [ ] `source_state` and `source_ref` populated correctly.
- [ ] CHECK constraint values from the schema are all reachable from the AST shape (e.g., if schema says `kind IN ('a','b','c')`, all three values must come out of the handler somewhere).
- [ ] `INSERT OR REPLACE` is the correct upsert mode for the natural key (vs `INSERT OR IGNORE`).

### 4.3 Read load-version.ts edits in the arc

If the arc touched `load-version.ts`:
- [ ] Confirm the array-to-dict normalization (post-MVDSV: lines around 308-323) doesn't break dict-shaped payloads from prior projects.
- [ ] Confirm any new `valid*` carve-outs (`validLogTemplate`, `validInfoKey`, etc.) are gated by `options.type ===` so they can't leak into other entity types.
- [ ] Confirm the array-to-dict dedup branch emits a warning on collisions (post-v16 fix). Silent drops on duplicates are a finding.

### 4.4 Cross-project sibling-handler shape audit

When validating cross-project, line up the same handler across all four projects (e.g., `_handler_cvars.py` in ezquake/fte/qwcl/mvdsv). After the 2026-04-28 architecture consolidation, every project follows the same `<project>/_handler_*.py` shape, so divergences are now apples-to-apples comparisons. See `EXTRACTOR-PLAYBOOK.md` Section  Three-tier handler architecture for the full model.

Look for:
- Helpers with the same name but different fallback policies (e.g., `_resolve_fn_ref` divergence between commands and qc_builtins, fixed in v17 by lifting to `extractor_lib/_resolve.py`).
- Defensive normalization present in one project but not others (e.g., `flags_raw` post-v17: ezquake's and mvdsv's `_handler_cvars.py` both normalize via `_normalize_flags_raw`; FTE and QWCL handlers should converge if they don't already).
- Diverging schemas of emitted rows for the same logical entity.
- Duplicated regex constants that should live in `extractor_lib/`.
- Class-level fork-override hooks (`REGISTRATION_APIS`, `DETECTION_APIS`, etc.) that exist on one project's handler but not its sibling -- usually means an API name is buried in a regex on the unhoisted side.

**Acceptance:** every divergence has a written justification (in a docstring or a memory entry). Undocumented divergences are findings.

---

## Section 5: Spec compliance

If the arc has a spec (`docs/superpowers/specs/`) and a plan (`docs/superpowers/plans/`), validate against them, not against memory.

- [ ] Every entity type listed in the spec is present in the DB with non-zero rows.
- [ ] Every claim in the spec about row counts, ranges, or invariants is checked against live DB.
- [ ] Every claim in `OUT_OF_SCOPE.md` is verified line-exact against the source (file path + line number + quoted code).
- [ ] Every line in any allowlist file is verified in both directions (Section 2.2).

When spec and live data diverge, trust the live data and flag the spec for update.

---

## Section 6: Quality grid

Run the full grid for ALL four projects, not just the one being validated. The post-v17 grid uses equality assertions for F1.*.count probes; any drift fails loudly.

```bash
for proj in mvdsv ezquake fte qwcl; do
  echo "=== $proj ==="
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project $proj --family both
done
```

**Acceptance:**
- All F1 (regression) probes PASS for all four projects.
- F2 (anomaly) probes are CLEAN OR every FOUND/FLAGGED entry is either (a) caused by the arc and intentional, or (b) pre-existing and tracked in HANDOVER.

**Pre-existing F2 anomalies (as of 2026-04-28):**
- ezquake `F2.doc_only_crosstab` -- 194 doc_only entities. Informational; tracked in HANDOVER.
- ezquake `F2.default_value_ping_pong` -- `gl_lightmode` oscillates across 15 versions. Informational; tracked in HANDOVER.

If new anomalies surface that aren't in this list, they're findings.

---

## Section 7: Determinism, multiprocessing, fork-mode safety

Confirms the extractor is safe to parallelize, safe to fork, and produces identical output across runs.

- [ ] Section 1.1's empty-diff check is the primary determinism proof. Do not skip.
- [ ] Read `_run_parallel` in the driver. Confirm `pool.map` preserves input order for the merge.
- [ ] Confirm finalize sorts by stable keys (typically `name`, sometimes `(name, source_file, source_line)`).
- [ ] Confirm worker emissions are plain-data only: dict/list/str/int/None. No clang cursors, closures, or file handles crossing the worker boundary.
- [ ] If the handler emits multiple row types per call (e.g., MVDSV commands' `_cmd` + `_fn_def` two-row pattern), confirm the merge in finalize is deterministic across worker counts (try `--workers 1` and `--workers 12`; outputs must be byte-identical).

---

## Section 8: Final integration checks

- [ ] `bunx tsc --noEmit` from `apps/qw-oracle/` -- clean exit.
- [ ] `python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); from <project> import _handler_*"` -- all handler modules import without error.
- [ ] MCP smoke test (`bun run scripts/verify-rewrite.ts` from `apps/qw-oracle/serve/mcp/`) -- passes.
- [ ] No stale generated files (e.g., outdated bundle JSONs in `apps/slipgate-app/src/lib/config/data/`) for projects that DO have bundle generation.

---

## Reporting

Produce a single report with one section per runbook section above. For each:

- **Verdict:** as-claimed / as-claimed-with-caveat / findings.
- **Findings (if any):** file:line, what's wrong, severity (critical / important / nit), proposed fix sketch.
- **Evidence:** command outputs, diff snippets, quoted source lines.

Severity guidance:
- **Critical:** silent data loss, wrong DB content, byte-reproducibility violation, schema drift between code and DB.
- **Important:** representation gap that breaks downstream queries, unclassified diff residual, undocumented divergence between sibling handlers.
- **Nit:** style inconsistency, redundant logic, doc/code contradiction with no behavioral consequence.

End the report with a follow-up action plan: per finding, decide drain-now / drain-in-arc / HANDOVER. No findings disappear without disposition.

---

## Forks (unezQuake, antilag-mvdsv, etc.)

Forks inherit the parent extractor with project-specific tweaks. The validation run for a fork:

1. Diff the fork's extractor against the parent's. Any divergence is a finding unless justified in a docstring.
2. Run Sections 1-8 against the fork's loaded DB.
3. Cross-project field-shape audit (Section 3.2) MUST include the fork -- divergence from the parent's representation is the most likely failure mode.

---

## KTX-specific validation

KTX is a libclang-based cross-codebase port (per `docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md` D2 + D3) -- not a fork. Extraction methodology mirrors ezQuake / FTE / QWCL / MVDSV (Sections 1-8 above apply); the differences below capture KTX-specific surfaces.

### Per-kind row counts

KTX exposes 14 kinds across the entities-table types and the qw-namespace gameplay tables. Counts are locked anchors per `docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md` (F1-F14); listed values are LIVE counts at Phase 6 ship (commit `e0133248`):

**Entities-table types (canonical-1.46 master HEAD):**

| Kind | Live count | Anchor | F1 probe |
|---|---:|---|---|
| cvar | 260 | F1 (192 k_-prefixed + ~68 non-k_ literal-name per Exhaustive Mapping Rule) | F1.ktx.floor.cvar_count + F1.ktx.floor.cvar_source_state |
| command | 358 | F2 amended (319 cmds[] + 14 std + 25 editor) | F1.ktx.floor.command_count + F1.ktx.floor.command_source_state |
| info_key | 7 | F3 amended (7 star-keys) | F1.ktx.floor.info_key_count + F1.ktx.floor.info_key_source_state |
| log_template | 1195 | F4 (1500-2000 unique format strings; live below band) | F1.ktx.floor.log_template_count + F1.ktx.floor.log_template_source_state |
| match_event | 7 | F14 (one per XSD event_name) | F1.ktx.floor.match_event_count + F1.ktx.floor.match_event_source_state + F1.ktx.anchor.match_event_count_7_with_attributes |

**Gameplay-table kinds (`gameplay_source_id='ktx'`):**

| Kind | Table | Live count | Anchor | F1 probe |
|---|---|---:|---|---|
| monster | gameplay_entity_defs | 13 | F9 amended (hp_for_kill source-faithful) | F1.ktx.gameplay_kind.monster_count + F1.ktx.anchor.monsters_have_hp_for_kill + F1.ktx.anchor.fish_first_in_monsters |
| game_mode | gameplay_mechanics | 27 | F5 (17 um_list peers + race + bloodfest + 8 mutators) | F1.ktx.gameplay_kind.game_mode_count |
| mode_default | gameplay_mechanics | 317 | F6 (~309 estimate; Phase 3 + 5.5 retrofit confirmed 317 across parallel + serial runs) | F1.ktx.gameplay_kind.mode_default_count |
| election_type | gameplay_mechanics | 5 | F7 (skip etNone sentinel) | F1.ktx.gameplay_kind.election_type_count |
| death_rule | gameplay_mechanics | 27 | F8 (skip dtNONE / dtUNKNOWN) | F1.ktx.gameplay_kind.death_rule_count |
| score_system | gameplay_mechanics | 3 | F10 (positions length=10 invariant) | F1.ktx.gameplay_kind.score_system_count + F1.ktx.anchor.score_system_positions_length_10 |
| drop_item | gameplay_mechanics | 31 | F11 amended (was 30; sp_sp added) | F1.ktx.gameplay_kind.drop_item_count |
| loc_macro | gameplay_mechanics | 15 | F12 | F1.ktx.gameplay_kind.loc_macro_count |
| teamplay_message | gameplay_mechanics | 21 | F13 (Pattern 9 banner harvest 0% per F27) | F1.ktx.gameplay_kind.teamplay_message_count |

Run probe family on the dev DB after every KTX extract:

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project ktx --family both
```

PASS condition: every `F1.ktx.*` probe returns PASS; F2 anomaly probes either CLEAN or carry a tracked HANDOVER deferral.

### JSONB-binding regression gate

D14 + F21: every JSONB column written by a KTX loader passes its JS value directly (or wrapped with `tx.json(...)`) -- no `JSON.stringify(...)` followed by TEXT bind. The regression gate `F1.jsonb_columns_not_strings` runs cross-project with KTX-relevant target columns:

- `match_event_versions.attributes_json`
- `match_event_versions.emission_call_sites_json`
- `gameplay_mechanics.props_json`
- `gameplay_mechanics.ruleset_gate_json`
- `gameplay_entity_defs.props_json`
- `gameplay_entity_defs.ruleset_gate_json`
- `log_template_versions.all_call_sites_json` (Pass 1 reuse; KTX rows must respect)

A FAIL means a KTX loader regressed to the legacy SQLite-era TEXT-with-stringify pattern. Diagnose by:

1. Run `SELECT table_name, column_name, COUNT(*) FROM (...)` for each target with `jsonb_typeof(col)='string'`; identify the offending loader.
2. Inspect the loader's `tx.json(...)` / direct-JS-value usage; fix the binding pattern.
3. Re-run the loader; re-run the probe.

### Idempotency

Per D15, every KTX loader is idempotent by construction. Re-run `extract-tag --project ktx --version <head> --ordinal <head_ordinal> --force` and confirm zero row-count delta + zero content-hash drift across all KTX-scoped tables (entities, cvar_versions, command_versions, info_key_versions, log_template_versions, match_event_versions, gameplay_mechanics, gameplay_entity_defs).

Operator runs the probe via:

```bash
cd apps/qw-oracle && bun run load-knowledge -- idempotency --project ktx
```

Exit 0 = idempotent. Exit 1 + diff output = drift; see Recovery (Section 7-style adapted for KTX) below.

### Per-migration validation probes

Three migrations land KTX schema deltas at `apps/qw-oracle/db/migrations/`:

- `009_ktx_log_template_logfile_channel.sql` -- `log_template_versions.channel` CHECK admits `'logfile'`.
- `010_ktx_match_event_type.sql` -- `entities.type` CHECK admits `'match_event'`; CREATE TABLE `match_event_versions` (PK + 2 indexes).
- `011_ktx_gameplay_kinds.sql` -- `gameplay_entity_defs.kind` += `'monster'`; `gameplay_mechanics.kind` += `'game_mode'`, `'election_type'`, `'score_system'`, `'drop_item'`, `'loc_macro'`, `'teamplay_message'`, `'mode_default'` (death_rule was already in the enum pre-KTX; not a KTX delta).

Each migration's CHECK widening and table/index existence is verified by the SQL probes below.

**Migration `009_ktx_log_template_logfile_channel.sql` (admits `'logfile'` channel):**

```sql
-- Positive insert: 'logfile' admitted.
BEGIN;
INSERT INTO entities (project, type, name, canonical_id, source_state, first_seen_version, last_seen_version, created_at, updated_at)
  VALUES ('ktx', 'log_template', 'STUB_LF_POS', 'ktx:log_template:STUB_LF_POS', 'source_backed', 'head', 'head', NOW(), NOW());
INSERT INTO log_template_versions (entity_id, version, channel, format_string, format_string_normalized, source_file, source_line, all_call_sites_json, extracted_at)
  SELECT id, 'head', 'logfile', 'STUB', 'stub', 'stub.c', 1, '[]'::jsonb, NOW()
  FROM entities WHERE name='STUB_LF_POS' AND project='ktx';
-- PASS: both inserts succeed.
ROLLBACK;

-- Negative shape: 'nonexistent_channel' rejected.
BEGIN;
INSERT INTO entities (project, type, name, canonical_id, source_state, first_seen_version, last_seen_version, created_at, updated_at)
  VALUES ('ktx', 'log_template', 'STUB_LF_NEG', 'ktx:log_template:STUB_LF_NEG', 'source_backed', 'head', 'head', NOW(), NOW());
INSERT INTO log_template_versions (entity_id, version, channel, format_string, format_string_normalized, source_file, source_line, all_call_sites_json, extracted_at)
  SELECT id, 'head', 'nonexistent_channel', 'STUB', 'stub', 'stub.c', 1, '[]'::jsonb, NOW()
  FROM entities WHERE name='STUB_LF_NEG' AND project='ktx';
-- PASS: second insert raises CHECK violation.
ROLLBACK;
```

**Migration `010_ktx_match_event_type.sql` (admits `'match_event'` entity type + creates `match_event_versions`):**

```sql
-- Table exists.
SELECT to_regclass('match_event_versions') IS NOT NULL AS exists;
-- PASS: returns t.

-- 3 indexes exist: PK index + idx_match_event_versions_complex_type + idx_match_event_versions_xsd_version.
SELECT indexname FROM pg_indexes
WHERE tablename='match_event_versions'
ORDER BY indexname;
-- PASS: returns 3 indexnames (the implicit PK index plus the 2 named indexes from the migration).

-- Positive insert: type='match_event' admitted; paired versions row inserts.
BEGIN;
INSERT INTO entities (project, type, name, canonical_id, source_state, first_seen_version, last_seen_version, created_at, updated_at)
  VALUES ('ktx', 'match_event', 'STUB_ME_POS', 'ktx:match_event:STUB_ME_POS', 'source_backed', 'head', 'head', NOW(), NOW());
INSERT INTO match_event_versions (entity_id, version, event_name, complex_type, xsd_path, attributes_json, extracted_at)
  SELECT id, 'head', 'pick_mapitem', 'mapitemtype', 'resources/extralog/ktxlog_0.1.xsd', '[{"name":"item_name","type":"xs:string","constraint":null}]'::jsonb, NOW()
  FROM entities WHERE name='STUB_ME_POS' AND project='ktx';
-- PASS: both inserts succeed.
ROLLBACK;

-- Negative shape: type='nonexistent_type' rejected.
BEGIN;
INSERT INTO entities (project, type, name, canonical_id, source_state, first_seen_version, last_seen_version, created_at, updated_at)
  VALUES ('ktx', 'nonexistent_type', 'STUB_ME_NEG', 'ktx:nonexistent_type:STUB_ME_NEG', 'source_backed', 'head', 'head', NOW(), NOW());
-- PASS: insert raises CHECK violation.
ROLLBACK;
```

**Migration `011_ktx_gameplay_kinds.sql` (admits 1 + 7 new kind values):**

```sql
-- Pre-flight: gameplay_sources['ktx'] row exists (Phase 1 obligation).
SELECT id FROM gameplay_sources WHERE id='ktx';
-- PASS: returns 1 row.

-- Positive inserts: 1 monster row in gameplay_entity_defs.
BEGIN;
INSERT INTO gameplay_entity_defs (gameplay_source_id, kind, name, source_ref, ruleset_gate_json, props_json)
  VALUES ('ktx', 'monster', 'STUB_MONSTER', 'stub.c:1', '{}'::jsonb, '{}'::jsonb);
-- PASS: insert succeeds.
ROLLBACK;

-- Positive inserts: 7 stub rows for new gameplay_mechanics.kind values.
-- Note: nested DO + ROLLBACK is invalid; use a savepoint loop instead.
BEGIN;
DO $$
DECLARE k text;
BEGIN
  FOR k IN VALUES ('game_mode'),('mode_default'),('election_type'),('score_system'),('drop_item'),('loc_macro'),('teamplay_message')
  LOOP
    BEGIN
      INSERT INTO gameplay_mechanics (gameplay_source_id, kind, name, source_ref, ruleset_gate_json, props_json)
        VALUES ('ktx', k, 'STUB_'||k, 'stub.c:1', '{}'::jsonb, '{}'::jsonb);
      RAISE NOTICE 'OK: %', k;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'FAIL: %', k;
    END;
  END LOOP;
END $$;
-- PASS: 7 NOTICE OK lines.
ROLLBACK;

-- Negative shape: kind='nonexistent_kind' rejected in both tables.
BEGIN;
INSERT INTO gameplay_entity_defs (gameplay_source_id, kind, name, source_ref, ruleset_gate_json, props_json)
  VALUES ('ktx', 'nonexistent_kind', 'STUB_ED_NEG', 'stub.c:1', '{}'::jsonb, '{}'::jsonb);
-- PASS: insert raises CHECK violation.
ROLLBACK;

BEGIN;
INSERT INTO gameplay_mechanics (gameplay_source_id, kind, name, source_ref, ruleset_gate_json, props_json)
  VALUES ('ktx', 'nonexistent_kind', 'STUB_GM_NEG', 'stub.c:1', '{}'::jsonb, '{}'::jsonb);
-- PASS: insert raises CHECK violation.
ROLLBACK;
```

### Cross-project audit (KTX-aware)

Run Section 4.4 (cross-project sibling-handler shape audit) with KTX added to the lineup. Five projects now: ezquake, fte, qwcl, mvdsv, ktx. Per D3, KTX handlers inherit only from `Visitor`; KTX is a port, not a fork. Verify:

- KTX `_handler_*.py` files extend `Visitor` only (per D3 + D6 -- match_events handler is the documented carve-out per the 2026-05-05 D3 amendment).
- No KTX handler subclasses an ezQuake / FTE / MVDSV / QWCL handler.
- Per-pattern lift candidates (Pattern 6 cross-header lift in `extractor_lib._source` from Phase 1; any new helpers introduced) are correctly placed in `extractor_lib/`, not duplicated under `ktx/`.
- `load-version.ts` transition-scan exclusion list reconciles against the full per-type versions table inventory: tables WITHOUT a `source_file` column (`asset_category_versions`, `match_event_versions`) MUST be in the exclusion list; tables WITH a `source_file` column MUST NOT be excluded. Future entity types with non-C-source truth grow this list (per F28).

Cross-project audit report at `docs/superpowers/reviews/2026-05-XX-ktx-onboarding-cross-project-audit.md`. The report documents the 5-engine lineup post-KTX, surfaces any new shape divergences, and confirms no prior-engine probe regressions.

---

## Out of scope

- **dusty-ktx (`qcsrc/` tree-sitter).** Different methodology -- only the `qcsrc/` QuakeC tree, not the canonical KTX C source. When dusty-ktx onboarding ships, write a parallel runbook (`VALIDATION-RUNBOOK-DUSTY-KTX.md`) covering tree-sitter-specific concerns. Canonical KTX is pure C; it uses this runbook (KTX onboarding arc lands in `docs/superpowers/plans/2026-05-04-ktx-onboarding/`).
- **Layer 2 (chat corpus).** Different validation domain (FTS5, message ID provenance). Not covered here.
- **Layer 3 (concept notes).** Hand-authored content; review process lives in `curated/concept-notes/OPERATIONS.md`.

---

## Revision history

- 2026-04-28: Initial draft. Methodology captured from MVDSV Phase 2e validation pass (2026-04-28) which found 4 important issues and 1 critical (info_key cross-scope silent drop). Codified as the post-ship discipline going forward.
- 2026-05-05: F22 doctrine corrections at lines 5 + 373 -- canonical KTX is libclang-based; tree-sitter framing reserved for the dusty-ktx fork. Landed via Phase 0 of the KTX onboarding arc.
- 2026-05-06: KTX-specific validation section added (Phase 7 of KTX onboarding arc). Per-kind row counts (14 kinds across entities + gameplay tables), JSONB regression cross-reference, idempotency probe pointer, per-migration validation probes inline (009/010/011), cross-project audit pointer. F1 quality-grid probes for KTX kinds shipped at `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`.
