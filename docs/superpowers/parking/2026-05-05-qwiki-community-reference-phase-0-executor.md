# Phase 0 executor prompt -- QWiki community-reference arc

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.** This terminal runs the `arc-executor` skill cold against Phase 0.

The orchestrator session (separate terminal) verified prerequisites + scaffolding, captured the snapshot's pre-Phase-0 state, and produced this prompt. Halt-and-report contract at the bottom; orchestrator does V1-V6 phase-boundary verification independently, then signs off Phase 0.

---

=== BEGIN EXECUTOR PROMPT ===

You are executing Phase 0 of the QWiki community-reference arc.

Working directory: `/home/paradoks/projects/quakeworld` (main tree, branch `main`).

## Skill to invoke

`arc-executor` (in `~/.claude/skills/arc-executor/`). The executor reads the phase MD cold, critically reviews the plan against decisions + review-findings BEFORE executing, executes each task per its declared execution mode (inline vs subagent), runs phase-boundary verification, and halts with a structured status report.

## Required reads (in priority order, before executing any task)

1. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-0-snapshot-finalize.md`** -- the phase MD. Read top-to-bottom. Contains full inline content for `snapshot.py`, the refetch scripts, and the manifest re-lock script. Five tasks (T1-T5), six phase-boundary verifications (V1-V6).

2. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md`** -- 20 cross-cutting commitments. Phase 0 is directly governed by D12 (snapshot dir permanent + commit policy), D13 (ASCII output discipline), D14 + amendment (Python carve-out for snapshotter alongside engine extractors), D16 (phase atomicity), D17 (verification at phase boundary).

3. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md`** -- F1-F5 are Phase-0-owned findings accrued during planning. Read them; they explain WHY the tasks are shaped as they are. F1 = slug-collision count exactly 4. F2 = ad-hoc snapshotter at /tmp at risk of loss. F3 = 503 slash-title articles use single-underscore slugs. F4 = redirect bug (invalid `arprop=target`). F5 = manifest articles_fetched overcount.

4. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/README.md`** -- phase index, status column, read-in-this-order guide. Phase 0 is the first phase; orchestrator handoff doc lives at `docs/superpowers/parking/2026-05-04-qwiki-community-reference-orchestrator-handoff.md`.

## Operator-confirmed decisions baked into the phase MD (do NOT re-litigate)

- **Path A locked (commit, NOT gitignore)** for snapshot directory -- operator confirmed 2026-05-05. T4 commits the snapshot AFTER T1-T3 + T5 ship clean. Do NOT execute Path B.
- **Refetch all 503 slash-title articles** with double-underscore slugs (NOT just the 4 collision victims) -- operator confirmed 2026-05-05. Cost ~2.5 min extra wall-clock; benefit = uniform slug scheme corpus-wide, no `slug_for_title()` mixed-scheme helper required downstream.
- **Python for the snapshotter + fix scripts** per D14 amendment 2026-05-05. Loader-pipeline scripts (Phase 2/3/4 parsers, Phase 5 backfill, Phase 7 primer build) remain Bun. The carve-out applies ONLY to snapshotter + engine extractors; per-phase one-off scripts (stratification helpers, ad-hoc selection) stay Bun.

## Recommended model + effort for the executor terminal

**Sonnet MAX** for this Phase 0 terminal.

Rationale: Phase 0 is well-bounded (the phase MD ships full inline content for every task) but carries judgment-dense responsibility -- critical-review pass against decisions + findings BEFORE executing, halt-and-report decisions, subagent-dispatch quality control. Sonnet medium is the floor for reasoning work per operator memory `feedback_model_effort_range.md`; Sonnet MAX adds the reasoning-depth headroom needed for the critical-review pass without the overkill of Opus on what is mostly mechanical execution.

Subagent dispatches within Phase 0 (T2 + T3 = network refetches with full Python scripts shipped inline) are annotated `Sonnet medium` in the phase MD itself -- those stay at Sonnet medium; do not bump them up.

Later phases get their own recommendation in their respective executor prompts. Phase 4 (tournament pilot) is the most likely candidate for Opus medium or higher because schema discovery is genuinely architectural; Phase 2 (heaviest mechanical phase) likely also Sonnet MAX. Phases 1, 3, 5, 6, 7 default to Sonnet MAX unless specific shape suggests otherwise.

## Critical rules for this phase

1. **ASCII-only output discipline (D13).** No emoji, no em-dashes, no en-dashes -- ASCII hyphen-minus only. Applies to script output, doc additions, commit messages. The wiki articles themselves contain non-ASCII content; that's preserved verbatim in the artifact (data, not output).

2. **Phase atomicity (D16).** Each task ends in a runnable state. T4 commit happens AFTER T1-T3 + T5 ship clean; do NOT commit a partial snapshot.

3. **Verification before declaring DONE (D17).** V1-V6 are YES/NO probes at phase boundary. Run all six. Do not skip; do not interpret a fail as "close enough."

4. **Critical-review BEFORE executing.** Read the phase MD top-to-bottom and cross-check against decisions.md + review-findings.md. If you spot drift between the phase MD and decisions (e.g., a step contradicts D14 amendment), halt and surface to operator BEFORE executing -- do NOT silently amend.

5. **Subagent dispatch per execution-mode annotations.** T2 + T3 are subagent (Sonnet medium) per the phase MD. T1, T4, T5 are inline. Don't deviate -- if a task feels wrong-shaped for its mode, surface.

## Execution-mode annotations (from phase MD)

| Task | Mode | What |
|------|------|------|
| T1 | inline | Write `apps/qw-oracle/scripts/snapshot-wiki/snapshot.py` + `README.md` (full content shipped in MD; no synthesis). |
| T2 | subagent (Sonnet medium) | Refetch all 503 slash-title articles with `__` slugs + cleanup 499 stale `_` slug files (4 collision-victim files preserved). Network I/O ~3 min wall-clock; full Python script shipped in MD. |
| T3 | subagent (Sonnet medium) | Refetch redirects with `arprop=ids|title` (was broken `arprop=target`). Network I/O; full Python script shipped in MD. |
| T4 | inline | `git add apps/qw-oracle/data/wiki-snapshots/2026-05-04/` + commit. AFTER T1-T3 + T5 ship clean. |
| T5 | inline | Re-lock manifest with phase0_fixes block. Pure JSON read-write; full script shipped in MD. |

## Pre-flight state already verified by orchestrator (do not re-verify; trust the snapshot)

- Snapshot exists at `apps/qw-oracle/data/wiki-snapshots/2026-05-04/`. Subdirs: `articles/` (9173 files), `templates/` (767 files), plus `article-list.json`, `categories.json`, `manifest.json`, `redirects.json`, `template-list.json`.
- `redirects.json` currently `[]` (matches F4 -- invalid arprop).
- `manifest.json` shows `articles_fetched: 9178` (matches F5 overcount; T5 corrects this).
- `/tmp/qwiki-pilot/full-scrape.py` (8830 bytes, mod May 4) is still present -- safe to reference if helpful, but NOT required: T1's `snapshot.py` content is fully inlined in the phase MD as a clean rewrite with the slugify bug fixed.
- Last applied migration: `007_query_log.sql`. No schema changes in Phase 0.

**Doc inconsistency you may notice:** the phase MD says "9174 unique files (4 clobbered)"; actual filesystem count is 9173. Off-by-one in the MD's prose; not load-bearing -- the V probes verify by structure (all 503 slash titles have `__` slugs, redirects > 100, manifest has phase0_fixes block), not by absolute file count. Do not flag as a finding unless V probes actually fail because of it.

## First three actions

1. **Read all four scaffold docs** (phase-0 MD, decisions, review-findings, README) top-to-bottom. Take notes on any task that seems to drift from a decision or finding.

2. **Critical review pass.** Walk Tasks 1-5. For each: does it align with D12-D17 + F1-F5? Are the inlined scripts complete and self-contained? Any "engineer fills in X" smell? If clean, proceed. If drift surfaced, halt and surface BEFORE executing.

3. **Execute T1.** Write the two files at `apps/qw-oracle/scripts/snapshot-wiki/`. Run T1 verification probes. If PASS -> dispatch T2 subagent. After T2 PASS -> dispatch T3 subagent. After T3 PASS -> run T5 (inline). After T5 PASS -> run T4 (inline git commit). Then run V1-V6 at phase boundary.

## Halt-and-report contract

When V1-V6 are run (whether PASS or FAIL), halt and report back to the operator with:

**Status code (pick one):**
- `DONE` -- all tasks shipped, V1-V6 all PASS.
- `DONE_WITH_CONCERNS` -- shipped but flagged doubts. List them in the body.
- `NEEDS_CONTEXT` -- blocked by missing information. Specify exactly what is needed.
- `BLOCKED` -- cannot complete. Specify the blocker; route to operator.

**Body must include:**
- The commit hash from T4.
- The actual outputs of V1-V6 (counts, query results, sample lines) -- not "PASS" alone. The orchestrator will re-run probes independently; your output is the executor's audit trail.
- The redirect count from V4 (actual number, e.g., "1,847 redirects loaded"). Sample 3 redirect entries from `redirects.json` (raw JSON) so the orchestrator can audit shape.
- The actual count of slash-title articles refetched (T2 reports this).
- The actual count of stale single-underscore files deleted (T2 reports this).
- Any new findings (cross-app contract drift, library API gotcha, deploy-shape adaptation) to append to `review-findings.md` with sequential F-numbers (F14+). Surface; do NOT append to review-findings.md yourself -- the orchestrator owns cross-phase memory captures.
- Any decisions.md amendments needed. Surface; do NOT amend yourself.
- Doc-inconsistency observations (e.g., the 9173 vs 9174 off-by-one) -- advisory only.

**Do NOT:**
- Proceed to Phase 1.
- Mark Phase 0 complete in any tracking system.
- Append to `review-findings.md`, `decisions.md`, `arc-history.md`, or `README.md`.
- Commit anything beyond T4's snapshot commit (the snapshotter script commit is a separate commit included in T1's verification).

The orchestrator session does the phase-boundary verification (re-runs V1-V6 cold), captures cross-phase memory (findings, amendments, arc-history append), updates the README status column, and signs off Phase 0 before opening Phase 1's executor terminal.

## When in doubt

- **Phase MD says X but live state says Y** -> surface; do not silently amend the MD or skip the step.
- **A new template variant, status enum value, or schema-shape surfaces** -> append a finding draft to your status report (F14+); the orchestrator decides whether to amend the upcoming Phase 1 migration before it ships.
- **V4 redirect count is < 100** -> investigate (broken arprop variant? auth required? rate-limited?) before concluding "low count is the real number." The phase MD's expected range is ~900-2,700.
- **Network is unreachable** -> halt with `BLOCKED` status; do not retry indefinitely.
- **Verification probe is ambiguous** -> read the phase MD's Recovery section; if unclear after that, surface with `NEEDS_CONTEXT`.
- **Subagent dispatch returns confused-looking output** -> read the subagent's report carefully; if its work shows the script ran correctly, accept; if it ran something different from the inlined script, halt and surface.

=== END EXECUTOR PROMPT ===

---

## Orchestrator notes (not part of executor prompt)

This prompt was drafted on 2026-05-05 by the orchestrator session for QWiki Phase 0 execution. After the executor terminal halts and reports back, the orchestrator:

1. Re-runs V1-V6 cold (read-only -- ls, Read, git ls-files, python3 -c, no project code modification).
2. Audits the executor's report against re-run output.
3. If clean: appends an arc-history entry, updates `README.md` "Where we are right now" + phase index status, captures any surfaced findings to `review-findings.md` (F14+), captures any decisions.md amendments as dated blocks.
4. Drafts the Phase 1 executor prompt (next parking doc).
5. Surfaces sign-off + Phase 1 launch recommendation to operator.

If the executor returns BLOCKED or DONE_WITH_CONCERNS: the orchestrator triages, resolves what's resolvable, surfaces unresolvable items to operator with plain-English consequences.
