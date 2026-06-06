# QTV + QWFWD L1 extraction -- locked cross-cutting decisions

These choices apply to every phase. Each phase MD must respect them. If a phase needs to deviate, surface a "deviation" section at the top of that phase MD and stop for operator review -- do not silently override. Mid-arc amendments land here as dated blocks under the original decision; never silently override in a phase MD.

Source of truth: the approved design `docs/superpowers/specs/2026-06-05-qtv-qwfwd-l1-extraction-design.md` (corrected at commit `2b64c68e`) plus planner pre-flight verification against live source (see `review-findings.md` for the evidence trail). Every fact below was grep/Read-verified during planning, not inferred.

---

## D1. Load via `load-version --json`; never invoke or extend `extract-tag.ts` for qtv/qwfwd

**Decision:** Both targets bypass `extract-tag.ts` completely. Each extractor runs as a standalone step (QWFWD: `python3 .../qwfwd/extract.py`; QTV: `go run` / built binary) writing per-type JSON to `apps/qw-oracle/scripts/extractors/<project>/output/`. Each type is then loaded with:

```
bun scripts/load-knowledge/index.ts load-version \
  --project <qwfwd|qtv> --version <label> --json <path> --commit <sha> --ordinal <n>
```

**Why:** `extract-tag.ts` exists to `git checkout` a ref, `git fetch --tags`, `rev-parse` a commit, and drive cross-version diff/blame, then shell to `python3` for extraction (verified: `extract-tag.ts:358-403`). qtv/qwfwd are **frozen vendored snapshots with no `.git`** (verified: no `.git` dir in either reference tree), and qtv's extractor is **Go**, not Python. Every reason-for-being of `extract-tag` is inapplicable. `load-version --json` is already the canonical direct-load entrypoint (`index.ts:27,60-63`), the same shape used by `load-assets`, `load-maps`, `load-ktx-modes`, `load-ktx-taxonomies`. Bypassing is the low-complexity path; extending `extract-tag` would add git-less/Go branching to a tool whose purpose does not apply here.

**Implication:**
- `extract-tag` is **never called** for qtv/qwfwd. Its `PROJECT_EXTRACTOR[qtv|qwfwd]` is `null` (extract-tag already throws on a null extractor by design: `extract-tag.ts:338-343` -- that throw is correct and intended for these projects).
- The real load path is `load-version` -> per-type adapters (`load-cvars`/`load-commands`/`load-cmdline-params`/`load-info-keys`, all project-agnostic) -> `natural-keys` (project-agnostic) -> `diff-versions` (needs a `Record` entry, see D3) -> `build-snapshot` (needs a `Record` entry, see D3).
- Do NOT add a bespoke `load-qtv`/`load-qwfwd` subcommand. The four standard entity types (cvar/command/cmdline_param/info_key) flow through the generic `load-version`; the bespoke `load-ktx-*` subcommands exist only because KTX has non-standard gameplay tables, which this arc does not.

---

## D2. Schema change = append-only migration `020`; ALTER the 10 project-CHECK clauses across 9 tables

**Decision:** Add one new file `apps/qw-oracle/db/migrations/020_qtv_qwfwd_projects.sql` that widens the project allow-list from `('ezquake','fte','mvdsv','ktx','qwcl')` to add `'qwfwd'` and `'qtv'`. Postgres `ALTER TABLE ... DROP CONSTRAINT ... ; ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)` per clause. **Never edit `002`** (the `schema_migrations` sha256 guard rejects edits to an applied migration; the convention is append-only -- `apps/qw-oracle/CLAUDE.md`).

**The 10 clauses to widen (verified, all in `002_layer1_schema.sql`):**

| Table | Column | Line in 002 |
|---|---|---|
| `versions` | `project` | 30 |
| `entities` | `project` | 50 |
| `asset_extensions` | `project` | 287 |
| `asset_path_rules` | `project` | 314 |
| `asset_cvar_bindings` | `project` | 332 |
| `asset_loader_sites` | `project` | 354 |
| `release_notes` | `project` | 384 |
| `relation_changes` | `project` | 421 |
| `cvar_alias_versions` | `target_project` | 461 |
| `cvar_alias_versions` | `mimics_project` | 467 |

**Why:** The DB is **Postgres 16** (verified: `package.json` uses `postgres`/`DATABASE_URL=postgresql://`; `db/migrate.ts` runs on `postgres.Sql`; `data/knowledge.db` is 0 bytes -- the SQLite era ended with Arc 1). Postgres can drop/add a CHECK constraint in place; no table rebuild. The spec's "one additive migration" is exactly right; the spec's "~5 per-version tables" was an undercount (the true surface is 10 clauses on 9 tables, including the non-version asset/release/relation tables and `cvar_alias_versions`'s two columns). See `review-findings.md` F1.

**Implication:**
- Postgres auto-names inline CHECKs `<table>_<column>_check` (e.g. `entities_project_check`, `cvar_alias_versions_target_project_check`). The Phase-0 drafter MUST verify the actual constraint names against the live catalog before writing the `DROP CONSTRAINT`s:
  ```sql
  SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid)
  FROM pg_constraint WHERE contype='c' AND pg_get_constraintdef(oid) ILIKE '%project%';
  ```
- The `012_description_origin.sql` hits on `project IN ('ezquake','fte')` are **CASE-expression backfill logic, not CHECK constraints** -- out of scope; do not touch them (qtv/qwfwd have no ezquake/fte help-JSON origin).
- `SCHEMA.md` is updated in the same phase (append: projects 6-7 are qtv/qwfwd; note the migration that added them).

---

## D3. Widen the `Project` union; `tsc` then forces all 12 `Record<Project,...>` sites

**Decision:** Add `'qtv'` and `'qwfwd'` to the `Project` union at `scripts/load-knowledge/types.ts:8`. This is the single source of truth; the moment it widens, `bunx tsc --noEmit` errors on every exhaustive `Record<Project, ...>` until each gains the two new keys. Fill all of them in Phase 0.

**The 12 sites (verified):**

| File | Line | Constant | qtv/qwfwd value |
|---|---|---|---|
| `extract-tag.ts` | 36 | `PROJECT_REPO_PATH` | vendored ref path (extract-tag won't run them, but `Record<Project,string>` needs a string) |
| `extract-tag.ts` | 48 | `PROJECT_EXTRACTOR` | `null` (D1) |
| `extract-tag.ts` | 57 | `PROJECT_EXTRACTOR_OUTPUT_DIR` | `scripts/extractors/<project>/output` |
| `extract-tag.ts` | 73 | `PROJECT_DEFAULT_BRANCH` | sentinel (unused; e.g. `'main'`) |
| `extract-tag.ts` | 88 | `PROJECT_VERSION_ALIASES` | `{}` |
| `extract-tag.ts` | 102 | `PROJECT_HAS_ASSET_BUNDLE` | `false` |
| `extract-tag.ts` | 235 | `ENTITY_JSON_FILES` | per-type output filenames (used only if extract-tag drove them; safe to populate or `{}`) |
| `extract-tag.ts` | 282 | `ASSET_BUNDLE_FILE` | sentinel (unused) |
| `build-snapshot.ts` | 685 | `PROJECT_DEFAULT_SNAPSHOT_VERSION` | the frozen version label (D4) |
| `diff-versions.ts` | 51 | `PROJECT_SRC_PREFIX_FALLBACK` | source root prefix (e.g. `'src/'` qwfwd, `''`/`'pkg/'` qtv) |
| `enrich-prs.ts` | 14 | `PROJECT_REPOS` | `null` (no PR-enrich flow) |
| `load-release-notes.ts` | 28 | `PROJECT_REPOS` | `null` (no release-notes flow) |

**Why:** Exhaustive `Record<Project,...>` typing turns completeness into a compile error -- a feature. The MCP `serve/` side has **zero** `Record<Project>` (its project filters are raw `AND project = ${args.project}` passthrough), so no MCP filter code changes are needed; only the optional human-facing project list in `serve/mcp/src/orientation.ts` / tool descriptions may be updated for accuracy.

**Implication:** Phase 0's gate is `bunx tsc --noEmit` green. The table above is the starting checklist; the drafter trusts `tsc`, not this list, to find every site (robust to drift since planning).

---

## D4. Frozen-snapshot version label + provenance (the `--commit` fallback)

**Decision:** The `--version` label = each tool's internal version constant (QWFWD `QWFWD_VERSION`; QTV the `*version` cvar/build string). Insert exactly one `versions` row per target. For the required `--commit <sha>` arg: use the **upstream commit sha the snapshot was vendored from if it was recorded**; otherwise **fall back to the version constant string** as the commit sentinel. The vendored-copy date is recorded as snapshot provenance in the version/run metadata.

**Why:** No `.git` -> there is no commit to `rev-parse`. The version constant is the stable identity for a frozen snapshot; the snapshot date is the provenance. (Operator-flagged during slicing lock.)

**Implication:** Only one version per target exists (frozen), so the first `load-version` has no prior version to diff against -- diff/blame is a clean first-load no-op (the normal first-version case). The Phase-1/2 drafters pin the exact version constant via live recon (grep the version string in each tree). If a re-vendor happens later, that is a new version row with a new snapshot date.

**Amendment 2026-06-06 (F12 -- supersedes "insert exactly one versions row"):** A single frozen vendored snapshot needs TWO `versions` rows, not one -- a `head` row (ordinal `HEAD_ORDINAL` = 999999) AND the labeled tag row (`--version <label> --ordinal 1`), both at the same `--commit <label>`. Reason: `load-version` marks an entity `source_backed` only if its `*_versions` rows reach `HEAD_ORDINAL` (the entity-state-retreat block in `diff-versions.ts` retires any entity whose max ordinal is below head to `source_retired`); a tag-only load retires every entity (V5 would fail). Load `head` FIRST, then the tag (tag-first works but logs spurious `removed_from_head` -> `re_added` churn). Matches the established **qwcl** precedent (`versions = {2.33 ord233, head ord999999}`). D4's version-LABEL intent is unchanged -- `<label>` stays the identity; the `head` row is the mechanical source-backed anchor. The "only one version / no prior version to diff" framing above is SUPERSEDED: head and tag share one commit, so the first load is still a clean no-op diff. Per-type load recipe is therefore 8 calls for qwfwd (4 types x {head, tag}) and 4 for qtv (2 types x {head, tag}). LOAD-BEARING for Phase 2. Verified live at the Phase-1 boundary: all 50 qwfwd entities `source_backed`; `versions = {1.40-dev ord1, head ord999999}`.

---

## D5. No new entity types -- map everything to `cvar` / `command` / `cmdline_param` / `info_key`

**Decision:** Both extractors emit the existing per-type JSON shapes the loader already consumes. QWFWD serverinfo keys map to `info_key`; QWFWD positional args map to `cmdline_param`. No schema-type invention, no new `*_versions` table.

**Why:** Spec-locked. The whole arc is a pipeline re-run; the downstream (adapters, snapshot, MCP) is unchanged.

**Implication:** The JSON each extractor emits must match the adapter contract exactly: top-level payload field (`vars` / `commands` / `params` / `info_keys`) and the per-entity `{ "name": ..., "ast": { ... } }` shape. The per-phase drafter cross-checks the emitted field names against `load-cvars.ts` / `load-commands.ts` / `load-cmdline-params.ts` / `load-info-keys.ts` before declaring the extractor done. QTV has no serverinfo-key surface (0 info_keys, 0 cmdline_params expected per the spec's knob inventory); QWFWD carries all four types.

---

## D6. The C-vs-Go QTV config trap -- load-bearing describe-phase guard

**Decision:** nQuake ships a **C-QTV** config (`mvdport`, `admin_password`, `floodprot`, `allow_http`). These knobs **do not exist in the Go QTV target** (they live only in `fteqtv/`). nQuake's QTV config is a divergence signal to NOTE, never a describe-seed to fold in. The Go QTV equivalents are `qtv_password`, `listen_address`, the `fp_*` triplet, and `http_*`. QWFWD has no such split.

**Why:** Spec-locked, load-bearing. Seeding a Go-QTV description from a C-QTV config line would invent a knob that the source does not have -- a silent correctness failure.

**Implication:** This guard is carried verbatim into the Phase-3 describe MD. The describe pass is **source-register-site verified** (the comment/config is a hint; the `qvs.Reg`/`qvs.RegEx` call-site in the Go source is ground truth). Deployment-default divergences to flag-not-adopt: QTV `maxclients` source=1000 vs nquake template=100; QWFWD `masters` source=3 vs nquake=4. Describe the source default; the divergence may be noted in reasoning, never folded into the description.

---

## D7. Output discipline -- ASCII only, comments explain why

ASCII-only. No emoji. No em-dash / en-dash -- ASCII hyphen-minus only. No marketing voice. Code comments explain WHY, not WHAT (`apps/qw-oracle/CLAUDE.md` + the auto-loaded philosophy docs). Enforced because the operator runs `docs-check`-style validation and these patterns trigger noise.

---

## D8. Describe-fill model + effort is spec-locked (Opus MAX); not a planner dial

**Decision:** The Phase-3 describe pass uses the `describe-fill-synthesis` skill per knob. That skill hard-codes its model + effort (Opus 4.7 MAX for synthesis and independent review). The planner does NOT re-select it. "Cheap/fast" inside that skill means effort-routing within the Opus-MAX invocation (early-exit on a good comment), not a cheaper model tier.

**Why:** Consistency with the sibling KTX/MVDSV describe arc (`2026-05-16-ktx-mvdsv-l1-describe-fill`) and the skill's locked contract. Per-knob source-verified judgment is the highest-rigor task shape in the arc.

**Implication:** Phase 3 dispatches one knob per sub-agent invocation of the skill, fanned out under the mother-ledger (D10). The planner's model/effort selection applies to the OTHER phases (extractor synthesis, schema, validation), not to the describe synthesis itself.

---

## D9. Concept-note authoring is deferred -- decide in Phase 4

**Decision:** No concept notes are authored in this arc's committed scope. The describe pass produces breadcrumbs; the if/which decision is made in Phase 4 against the three named candidates (master-server registration/heartbeat; MVD streaming + `parse_delay` ghosting; `qtv_password` cross-codebase auth matrix), all See-also-linkable to the already-shipped MVDSV `qtv_*` rows.

**Why:** Spec-locked. Evidence (the describe pass) should precede the authoring decision.

**Implication:** Phase 4's deliverable includes a written if/which recommendation, not authored notes. If the operator greenlights authoring, that is a follow-on arc, not a Phase-4 task.

---

## D10. Mother-ledger execution for the describe phase

**Decision:** Phase 3 runs the operator's mother-ledger pattern: a mother terminal owns a living prep + learnings ledger; disposable per-batch workers read it warm, do one batch of knobs, and return a tight DELTA the mother appends. Ledgers are committed append-only -- they are the contract, never edited in place.

**Why:** Spec-locked execution pattern; proven on the KTX notes work and the sibling describe arc. Keeps each batch better-calibrated without bloating the mother's context.

**Implication:** Phase 3's MD encodes the ledger-file shape (mirror the sibling arc's per-knob ledger: header metadata, halt verdict, final description, per-clause enforce-trace table, rationale, D6Record JSON). Batch dispatch is ~4-6 parallel sub-agent invocations of `describe-fill-synthesis` per wave. Operator gates batch approval at the phase boundary (D11).

---

## D11. Phase atomicity + YES/NO verification at every boundary

Each phase ends with a commit that leaves the system runnable. Each phase MD ends with a Verification section of copy-paste probes that return YES/NO, not interpretive prose (e.g. a SQL count with an expected number, a `tsc --noEmit` exit code, an MCP smoke query returning a known row). The executor does NOT auto-proceed; the operator reviews at each boundary. Verification must be self-contained -- a phase's probes may not depend on a later phase existing (no regime collisions).

---

## D12. Validation runs against Postgres, not sqlite; add F1 floor probes

**Decision:** Phase 4 uses the `validate-extractor` skill / `VALIDATION-RUNBOOK.md` methodology but executes every DB query against **Postgres** (psql / postgres-js), not the runbook's stale `sqlite3 knowledge.db` examples. New F1 floor-count + source-state probes for `qtv` and `qwfwd` are added to `quality-grid.ts` (mirror the existing `makeFloorCountProbe` / `makeFloorSourceStateProbe` pattern), with expected counts captured AFTER the first successful load of each.

**Why:** The runbook predates the Postgres port; its sqlite commands no longer apply (see `review-findings.md` F3). F1 probes are equality assertions post-v17, so the baseline counts are recorded once both extractors have loaded.

**Implication:** Phase 4 verification = a validation report per project at `docs/superpowers/reviews/` + green F1 probes for both new projects.

---

## D13. Non-goals (scope fence)

If a phase touches one of these, that is scope creep -- flag it, do not proceed.

- `fteqtv` as an extraction target (protocol-origin / historical reference only; document via concept-note xref at most, and only in a future arc).
- The `hub.quakeworld.nu` web QTV viewer (TS/React frontend; different concern).
- Re-opening the MVDSV `qtv_*` L1 rows -- they are the See-also anchors, not to be re-litigated.
- The pending MVDSV `qtv_password` description trim (a separate micro-decision tracked in the parking doc).
- Concept-note authoring (deferred; D9).
- `qqshka/qtv-go` (Go 1.19 predecessor) -- byte-identical config to the canonical target; no extraction value.

---

*End of decisions. A future phase that needs to override one of these lands the override here as a dated amendment with reason -- never silently in a phase MD.*
