# Extractor discipline catch-up -- locked cross-cutting decisions

These choices apply to every phase. Each phase MD must respect them. If any phase needs to deviate, surface a "deviation" section at the top of that phase MD and stop for operator review -- do not silently override.

The decisions here pin the commitments closed across the two-pass arc-brainstormer (parking doc at `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md` -- Pass 1 + Pass 2 outcomes, locked 2026-05-08). They are NOT open questions; they are commitments. Most are direct lifts from the brainstorm's lock-shape sub-decisions; a few are arc-shape conventions paired with operator memory that phase drafters need to consume up-front.

Mid-arc amendments land here as dated amendment blocks under the original decision; never silently override in a phase MD.

---

## D1. The brainstorm spec is source of truth -- do not relitigate

**Decision:** Pass 1 + Pass 2 commitments at `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md` are LOCKED. Phase MDs implement those commitments; they do not revisit shape questions ("should the idempotency probe also handle Stage 3 snapshot probes?", "should the audit cadence be calendar-based instead of trigger-based?", etc.).

**Why:** Two-pass arc-brainstormer closed cleanly with operator sign-off at each pass close. The brainstorm covers gate inventory, per-gate universal-shape design, CI-readiness conventions, catch-up audit pattern, skill update shape, and the seven-phase roadmap. Re-opening shape questions in a phase MD risks fragmenting the commitments and shipping a half-aligned product.

**Implication:** When a phase MD's drafter encounters something the parking doc doesn't cover, they list it under "Open questions" with a documented best-guess default and proceed -- they do NOT reach back for a brainstorm pass. If the question turns out to be brainstorm-shaped (a NEW shape question, not implementation-shaped), surface explicitly: "this is a shape question, not a planning question. Want to re-open arc-brainstormer for one more pass?" and halt for operator decision.

If a phase reveals that a `decisions.md` decision is wrong (rare but possible), land the amendment as a dated block under the original decision. Strong "do not revert" commentary in the code AND in the decision text. If the amendment changes the shape of later phases, those phases need re-drafting.

---

## D2. CI-readiness conventions apply to ALL runtime probes

**Decision:** Every runtime probe shipped in this arc respects the seven-item lock-shape table from Pass 1.2:

| Convention | Rule |
|---|---|
| Exit codes | 0 = pass; non-zero = fail. No "hmm" codes. |
| Per-project flag | `--project <p>` drives per-project dispatch; `--all` optional for sequential cross-project run. |
| Structured output | `--json` flag emits structured output for future CI parsing (~5 lines per probe). |
| Self-documentation | `--help` self-documents flags; RUNBOOK references the canonical command line. |
| DB config | env-var driven (`DATABASE_URL`); no host-tooling assumptions, no `docker exec`, no host-`psql`. |
| Path resolution | No CWD assumptions; absolute paths via `import.meta.url` (`path.resolve(import.meta.dir, ...)`). |
| Determinism | No flakiness; probes are by design idempotent and offline. |

**Why:** Makes future CI integration mechanical -- the next arc wires probes into a workflow YAML rather than refactoring scripts to be CI-able. "Baby steps toward CI": bake conventions now, ship CI later.

**Implication:** Every phase implementing a probe respects all seven conventions. Phase MD verification section includes copy-paste probes confirming each (e.g., `bun run load-knowledge -- idempotency --help` exits 0 and prints flag list; `--json` output parses as valid JSON; running with `DATABASE_URL` unset exits non-zero with a clear error).

---

## D3. Per-project config dict per gate, NOT unified registry

**Decision:** Each universal gate file carries its own small per-project config dict. Onboarding a new project adds 4-5 small entries (one per gate file). NOT a unified `projects.ts` registry across all gates.

| Gate file | Per-project config keys (illustrative) |
|---|---|
| `idempotency.ts` | volatile-column-strip list, `*_versions` table list, scoping convention |
| `reproducibility-check.ts` | source root, optional `--workers <N>` overrides |
| `parallel_serial_helpers.py` | per-handler test entrypoints (under `<project>/tests/`) |
| `migration-probes.ts` registry | n/a -- migration probes don't need per-project config |

**Why:** Each gate's needs differ (idempotency wants volatile-column-list; reproducibility wants source-root; migration probes don't need project config at all). A unified registry would be a junk drawer -- per `grug-brain.md`, copy-paste with small variations beats premature unification. VALIDATION-GATES.md (D9) locks "per-project config dict shape" as a section so the convention is documented.

**Implication:** Phase MDs implementing gates ship the per-project config dict shape inline (5 entries: ezquake / FTE / QWCL / MVDSV / KTX). Phase 5's onboard-extractor SKILL.md update teaches "add 5 small entries per gate" pattern (per D10).

---

## D4. Universal gate dispatch mirrors F1 quality-grid pattern

**Decision:** Every new TypeScript gate is added as a subcommand under `bun run load-knowledge --`, dispatched via a `case` in `scripts/load-knowledge/index.ts`. Same shape as `quality-grid.ts` -- which is the model gate.

**Why:** F1 quality-grid is the universal-shape exemplar. Consistency reduces cognitive load, makes contributor onboarding linear, and means VALIDATION-GATES.md (D9) can describe one dispatch pattern that covers all TS gates.

**Implication:** Each TS-probe phase (P1 / P2 / P4) adds a dispatcher case in `index.ts`. Phase MD includes the dispatcher diff verbatim in the "Files touched" / Modified section. P3 (pytest pattern) is a different dispatch shape (`pytest apps/qw-oracle/scripts/extractors/`) -- pytest IS its own universal dispatcher; the pytest helper lives in `extractor_lib/tests/parallel_serial_helpers.py`. VALIDATION-GATES.md documents both dispatch shapes as Convention 1 (TS subcommand) and Convention 2 (pytest test file).

---

## D5. Manual probes, not auto-invoked

**Decision:** Each gate is invoked manually via `bun run load-knowledge -- <gate> --project <p>` (or `pytest apps/qw-oracle/scripts/extractors/` for the parallel-vs-serial pattern). NOT auto-run on every load-knowledge call.

**Why:** Some gates are slow (reproducibility re-runs `extract.py`). Auto-invoking would slow the dev loop. Mirrors the existing F1 quality-grid pattern -- F1 isn't auto-invoked either; it's a deliberate operator-discipline gate.

**Implication:** Phase MDs do NOT add auto-invocation hooks (e.g., post-load-knowledge auto-run). CI integration -- the future arc that wires probes into a workflow YAML -- is the place where bundling happens. Dev workflow keeps gates surgical.

---

## D6. Each gate ships its own catch-up audit

**Decision:** Per-gate done-criterion: "ran against all 5 projects (ezquake / FTE / QWCL / MVDSV / KTX); findings inline in commit body." No central living audit doc.

**Why:** Catch-up IS the gate-by-gate ship rather than a separate audit pass. Per-gate findings are small enough to triage cleanly; bundling all gates into a separate audit pass would batch findings and lose the close coupling between "gate ships" and "what the gate found." Matches `feedback_narrow_arc_before_broad.md`. Final cert doc (P7) consolidates pass state across all gates as a graduation artifact written once at arc close.

**Implication:** Each phase MD's "Verification (phase boundary)" section includes "run probe against all 5 projects" as a YES/NO probe. Commit body captures findings inline (not a separate audit file). Phase 7's cert doc summarizes pass state once at arc close; Phase 6's audit cadence rule covers ongoing audits after this arc.

---

## D7. Real-bug-fix rides the same phase commit

**Decision:** If a gate surfaces a real loader/extractor bug in any of the 5 projects, the bugfix rides the gate's commit -- one logical unit (D13 coherent-unit principle inherited from KTX onboarding D16).

**Why:** Per `feedback_every_finding_gets_a_track.md` -- fix-later is an anti-pattern. The gate that found the bug also ships the fix; future readers can `git blame` the bug, find the gate that surfaced it, and understand the discipline lift in one commit.

**Implication:** Phase scope grows by ~1 day for any real bug found. Phase MD's "Recovery (if verification fails)" section captures expected bug shapes and their drain-now path. Bugfixes are NOT punted to followups. Where a fix would explode scope (e.g., a real loader rewrite), surface to operator and let them choose drain-now-with-scope-growth vs explicit-defer-to-HANDOVER (per D8).

---

## D8. Per-finding triage: drain-now / HANDOVER followup / explicit reject

**Decision:** Per `feedback_every_finding_gets_a_track.md`. Every finding from a gate's catch-up run goes into one of three buckets:

- **Drain-now:** real bug found -> bugfix rides phase commit (D7).
- **HANDOVER small followup:** defer with explicit reason in the commit body (e.g., "pre-existing F2 anomaly, not gate-introduced; tracked in HANDOVER for separate work").
- **Reject explicitly:** rationale captured in commit body. No "we'll figure that out later" prose.

**Why:** Avoids moving-target findings docs and silent debt accumulation. Every finding has a track at the moment it's discovered.

**Implication:** Phase commits document each finding's disposition. Sub-agent verification cross-checks this -- any finding without an explicit triage track is flagged. `review-findings.md` accumulates drain-now and HANDOVER-bound findings during execution; explicit-reject findings live in commit body only.

---

## D9. Authoring guide doc is sibling to VALIDATION-RUNBOOK, NOT extension

**Decision:** New doc at `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md`. RUNBOOK at `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` stays unchanged structurally (gets a one-line cross-link in Phase 5).

**Why:** RUNBOOK is consumer-perspective ("how do I validate output for project X"); VALIDATION-GATES is producer-perspective ("how do I author a new gate"). Clean separation. Two-doc model is sturdier than one mega-doc; future extensions don't conflate audiences.

**Implication:** Phase 5 lands VALIDATION-GATES.md with sections 1-7 per Pass 1.2.6:

1. CLI shape conventions (`bun run load-knowledge -- <gate> --project <p>`, `--help`, `--json`, exit codes).
2. Reuse the F1 quality-grid pattern (`quality-grid.ts` is the model; new gates mirror its dispatch shape).
3. Env-var driven DB config (`DATABASE_URL`, postgres-js, no `docker exec` or host-psql).
4. Volatile-column strip pattern (the `to_jsonb(row) - 'key'` chain from idempotency-ktx.sh's just-fixed shape).
5. Per-project config dict shape (how to add a new project's table-set entry without forking a script).
6. Test pattern conventions (pytest equivalence-tests for parallel-vs-serial, naming, where they live).
7. CI-readiness checklist (the conventions table from D2; consolidates the must-haves and `--json` recommendation).

Phase 5 also adds a one-line cross-link to VALIDATION-GATES from the top of VALIDATION-RUNBOOK ("For gate authoring, see `scripts/load-knowledge/VALIDATION-GATES.md`.").

---

## D10. onboard-extractor SKILL.md update is part of arc, split across Phase 5 + Phase 6

**Decision:** The skill at `~/.claude/skills/onboard-extractor/SKILL.md` (user-global, not project-local) is updated as part of this arc's deliverables. Updates split across Phase 5 + Phase 6 per Pass 2.2's three concrete changes:

| Phase | SKILL.md edit |
|---|---|
| Phase 5 | New step (between scaffolding and validation): "register the new project in each universal gate's config dict." Cross-references VALIDATION-GATES.md section 5. |
| Phase 5 | Validation step expansion: smoke-validation grows from "re-run extract, confirm zero diff" to "run ALL universal gates against the new project; all must pass before declaring onboarding done." 4-5 probes (idempotency / reproducibility / parallel-vs-serial pytest / migration-probes if relevant). |
| Phase 6 | Explicit "no per-project bash scripts" callout: KTX-style `idempotency-ktx.sh` pattern is gone. Universal gates handle this; per-project bash extracts are an anti-pattern. |

**Why:** Future onboarders inherit the gate set by default (no re-authoring per-project). Skill update IS the arc deliverable, not a side-edit.

**Implication:** Phase 5 + Phase 6 phase MDs ship full SKILL.md edit content inline (markdown editing is inline execution per D15). Skill location is `~/.claude/skills/onboard-extractor/SKILL.md`; the edits are NOT confined to the project repo. Sub-agent verification confirms the path; operator runs `cat ~/.claude/skills/onboard-extractor/SKILL.md | grep <new step header>` post-execution to verify.

---

## D11. Cross-project audit cadence is trigger-based

**Decision:** The cross-project audit cadence rule (Phase 6) drains into:

- **EXTRACTOR-PLAYBOOK.md** new section on audit cadence.
- **HANDOVER.md** entry tracking "next audit fires when X" (with a parking-doc-style anchor).
- **operator memory `feedback_retrofit_later_discipline.md`** -- already encodes the principle; Phase 6 adds a cross-link to this doc.

**Trigger set (run cross-project audit after every arc that):**

- adds a new project, OR
- adds a new entity type, OR
- ships a schema migration, OR
- modifies `extractor_lib/` or `load-version.ts` (cross-cutting infrastructure).

**Skip for** per-handler tweaks within a single project that don't touch shared infrastructure. Audit doc lands at `docs/superpowers/reviews/YYYY-MM-DD-<arc>-cross-project-audit.md`.

**Why:** Extraction work isn't calendar-based; it's arc-based. These are the cases where prior-engine regressions are actually possible. Per-project tweaks can't break siblings.

**Implication:** Phase 6 lands the rule. Future arcs (CI setup, contributor onboarding doc, future engine ports) respect the trigger set.

---

## D12. Code-level disciplines inherited from Arc 1 / KTX onboarding

**Decision:** The following project-wide disciplines apply to any code this arc ships:

- **JSONB binding** (per Arc 1 D8 + KTX onboarding D14): pass JS values directly to postgres-js or wrap with `tx.json(...)`. NEVER pre-stringify with `JSON.stringify(...)` then bind as TEXT. Applies if any probe writes JSONB (e.g., migration-probes sentinel inserts).
- **Idempotent loaders + regression guards stay armed** (per KTX onboarding D15): existing F1.jsonb_columns_not_strings probe and load-version >50% drop guard apply unchanged. New probes verify these continue to work; new probes do NOT bypass the existing guards.

**Why:** Project-wide invariants. Probe authoring should not regress them. The qw-oracle Arc 1 Phase 2 surfaced the JSONB-string-scalar bug; F1.jsonb_columns_not_strings is the regression gate that catches recurrence.

**Implication:** Phase MD verification probes confirm existing F1 / load-version guards still pass post-phase. Migration-probes (P4) sentinel inserts respect JSONB binding rule -- if a migration introduces or constrains a JSONB column, the probe's sentinel write uses postgres-js direct binding or `tx.json(...)`, never `JSON.stringify(...)` to TEXT.

---

## D13. Phase atomicity + boundary verification -- each phase commits a working state

**Decision:** Each phase ends with a single commit that leaves the system runnable (mirrors KTX onboarding D16). Phase MD's "Outputs to next phase" section names the runnable state. Phase MD's "Verification (phase boundary)" section lists copy-paste YES/NO probes the operator runs to confirm the phase landed correctly.

**Why:** If a phase mid-task leaves the system in a broken state, that's a phase-internal concern; phase boundaries must be green so the operator can pause / resume / hand off without inheriting partial state.

**Implication:** Verification probes return YES/NO answers, not interpretive prose. SQL queries with expected row counts; CLI invocations with expected exit codes; `bun run load-knowledge -- <gate> --help` runs without error. If verification FAILs, phase MD's "Recovery" section is consulted.

---

## D14. Operator review at every phase boundary

**Decision:** Each phase ships only after operator review (mirrors KTX onboarding D17). The drafter terminal does NOT auto-proceed. README.md's status column (`drafted (awaiting review)` -> `approved` -> `in execution` -> `shipped`) is the source of truth for "what's approved vs in-flight."

**Why:** Per `feedback_fresh_context_for_execution.md` + arc-planner skill structural step. Auto-proceeding loses the operator's check on phase-MD shape and execution outputs; defeats the per-phase fresh-terminal discipline.

**Implication:**
- After draft: drafter halts, replies with phase MD path + sub-agent finding count + open questions + recommendation ("ready for review" or "needs another pass").
- After execution: executor halts with structured status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED) per `arc-executor` skill.
- Operator can revise mid-phase by returning the phase MD to the same drafter terminal with feedback. If the phase MD is fundamentally wrong (drafter context polluted), open a new fresh terminal for redraft.

---

## D15. Subagent-vs-inline default + model + effort matrix

**Decision:** Per-task execution mode declared in each phase MD's task table (mirrors KTX onboarding D18; sharpened version of `feedback_no_subagents_for_mechanical_edits.md`):

- **Inline** when: the task is purely textual edits AND the plan ships full file content / per-file diffs inline AND the change has no logic. Markdown, doc edits, config files with no logic. Edit/Write/Bash directly.
- **Subagent (default for everything else)** when: the task involves code synthesis, multi-file integration, exploratory implementation, schema/migration writing, test authoring.

Model + effort selection per task shape (per `feedback_model_effort_range.md`):

| Task shape | Recommended model + effort |
|---|---|
| Architecture / design / cross-cutting review / post-arc analysis | Opus MAX |
| Multi-file integration, judgment-dense, plan drafting | Sonnet MAX or Opus medium |
| Mechanical implementation requiring reasoning (clear spec, 1-2 files, code synthesis) | Sonnet medium |
| Plan verification (read code, compare, report against decisions/findings) | Sonnet medium, Explore-shape sub-agent |
| Pure text shuffling (deletions, renames, doc edits with full content shipped inline) | Haiku, or skip subagent entirely and direct-edit |

**Why:** Operator's MAX x20 subscription means compute is not a billing concern; constraints are quality fit and "wrong tool for the job" effect of overshooting. Sonnet medium for architectural decisions under-resources; Opus MAX for pure text shuffling over-resources. Calibration matters per task shape.

**Implication:**
- P1-P4 are code-synthesis-heavy; default to subagent dispatch with Sonnet medium floor; bump to Sonnet MAX or Opus medium when judgment density warrants (e.g., P3 cross-handler test reasoning; P4 migration-probe authoring grouped into sub-batches).
- P5-P7 are markdown-heavy; default to inline execution for most tasks (full SKILL.md content + VALIDATION-GATES.md content + cert doc shipped in phase MD).
- Honest test for picking model size: would a Stack Overflow answer suffice? Yes -> Haiku. Synthesis from 4+ files or non-obvious judgment? Sonnet medium minimum. Architectural? Opus MAX.

---

## D16. ASCII output discipline + plain English at decision points

**Decision:** ASCII only in code, commits, and shared docs (mirrors KTX onboarding D19). No emoji. No em-dashes / en-dashes / smart quotes -- use ASCII hyphen-minus. Plain-English first at sub-decision sign-offs; SQL DDL / JSON schemas / full column lists go to the spec or phase MD body, not into the conversation when asking the operator for approval.

**Why:** Operator memory `feedback_output_discipline_sentiment.md` + `feedback_plain_english_at_decision_points.md`. The operator runs `docs-check` validation that pattern-matches em-dashes; ASCII discipline keeps the noise channel clean. Plain-English-first calibrates to where decisions actually live (design intent, not field names).

**Implication:**
- Every phase MD respects ASCII. Verification probes' inline SQL respects ASCII.
- When asking operator to approve a sub-decision, structure: (1) plain-English what-it-means; (2) recommendation; (3) load-bearing trade-off; (4) one or two field-level details ONLY if they affect the decision; (5) "drain to spec" where the full DDL / JSON / regex lives.

---

## D17. Git workflow -- main tree default, no PR ceremony

**Decision:** All execution happens in the main tree (`/home/paradoks/projects/quakeworld/`, branch `main`). No worktrees. No PRs. No 4-option merge menus. Each phase commits directly to main; push to origin at natural checkpoints (mirrors KTX onboarding D20).

**Why:** Project CLAUDE.md "Git workflow" section + operator memory `feedback_minimize_branch_ceremony.md` + `feedback_worktree_per_terminal.md`. The operator does not touch git; Claude runs all git operations silently. Worktrees only for parallelism (none active for this arc).

**Implication:**
- Each phase commits a working state with a one-line message naming the phase + change.
- `superpowers:finishing-a-development-branch` overridden -- no menus.
- `superpowers:using-git-worktrees` overridden -- no fresh worktree per phase.
- Verification of clean tree at phase start; commit at phase end; push at phase boundary OR at session-wrap (whichever comes first).

---

*End of decisions. If a future phase needs to override one of these, that override goes here as an amendment with date + reason -- not silently in the phase MD.*
