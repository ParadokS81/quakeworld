# Fresh-terminal kickoff -- QTV + QWFWD L1 extraction (arc-planner)

Paste the block below as the first message in a fresh `claude` terminal. (Or just tell that terminal: "read this file and follow it.")

---

Plan the **QTV + QWFWD Layer 1 extraction arc**. The brainstorm is done and the design is approved (commit `bbe7ffbf`). Your job is to scaffold the arc -- phases, decisions, verification regimes, per-task execution modes -- via the **`arc-planner`** skill. Do NOT re-open the locked decisions; scaffold around them.

**Invoke the `arc-planner` skill.**

**Required reads (cold, in order):**
1. `docs/superpowers/specs/2026-06-05-qtv-qwfwd-l1-extraction-design.md` -- the approved design. Every decision is locked here.
2. `docs/superpowers/parking/2026-05-31-qtv-qwfwd-documentation.md` -- the arc seed (codebase landscape, operator notes, the mother-ledger execution pattern).
3. `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` + `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` -- canonical extractor onboarding + validation methodology to plan against.
4. `apps/qw-oracle/scripts/extractors/mvdsv/` (closest analog for the QWFWD phase) + `apps/qw-oracle/scripts/load-knowledge/` (the loader-adapter contract a new extractor's JSON must satisfy).
5. Sibling describe arc `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/` -- the describe methodology + the MVDSV `qtv_*` ledgers that are the See-also anchors.

**Locked constraints (do not re-litigate -- arc-planner scaffolds around these):**
- Targets: `QW-Group/qtv` (Go, slug **`qtv`**) + qqshka **QWFWD** (C, slug `qwfwd`), both vendored under `apps/slipgate-app/reference/`. `fteqtv` is reference-only, NOT a target.
- Toolchain: QTV = native **`go/ast`** (new ~150-line extractor at `scripts/extractors/qtv/`, the pipeline's first non-C front-end); QWFWD = **libclang** fresh cross-codebase port on the `extractor_lib/` rails.
- **No new entity types** -- everything maps to `cvar` / `command` / `cmdline_param` / `info_key`. One additive migration extends the `project` CHECK allow-list across `entities` + the ~5 per-version tables (confirm the full set by grepping `db/migrations/002_layer1_schema.sql`).
- Both targets are vendored snapshots (no `.git`): version-label from each tool's internal version constant (qwfwd `QWFWD_VERSION`, qtv `*version`), snapshot provenance in run metadata.
- **The C-vs-Go QTV config trap is a load-bearing guard** for the describe phase -- nquake's QTV config is C-QTV (`mvdport`/`floodprot`/`admin_password`), which does NOT exist in the Go target. Carry this guard into the describe phase MD verbatim; it must not seed Go-QTV descriptions.
- Concept-note authoring is **DEFERRED** (3 candidates named in the spec); not in this arc's committed scope.
- Execution shape: the operator's **mother-ledger** pattern -- a mother terminal owns a living prep+learnings ledger; disposable per-batch workers read it warm, do one batch, return a tight DELTA the mother appends.

**Operator working preferences (CLAUDE.md + memory):** plain-English-first at every decision point; one question at a time; be decisive (recommend, don't poll); ASCII-only in prose/code/regex; per-subagent model+effort selection with rationale; NO git merge-menu ceremony (commit to main, the operator does not touch git).

**First action:** read spec #1 cold, confirm you've absorbed the locked decisions, then invoke `arc-planner` and begin the slicing analysis. The phasing sketch in the spec's last section is indicative only -- set the real slices, verification regimes, and execution modes yourself.

---

When the planner terminal finishes, the brainstorm terminal (this one) stays open as eyes-on: paste back the phase scaffold / decisions.md and it will review against the approved spec.
