# Docs System Redesign — Spec

**Date:** 2026-04-29
**Status:** Brainstormed and approved. Awaiting plan-writing.
**Replaces:** Implicit doctrine in `~/.claude/skills/docs-check/SKILL.md` (336 lines, accreted) plus ad-hoc HANDOVER intake.
**Driver:** docs-check is the #1 repeated-task per `/insights` (~12 mentions across 50 sessions). Heavy enough to skip on small sessions, which causes drift accumulation.

---

## Audience principle

**Project documentation exists for Claude's navigation, not for the operator's reading.** The operator (ParadokS) is a vibe-coder who depends on Claude as the implementation tool. Claude depends on a coherent codebase + accurate docs. Therefore docs are an instrument for Claude, by proxy serving the operator.

**Consequence:** the only justified content in any project doc is content that **cannot be reconstructed from the codebase at reasonable cost**. Detailed feature catalogs that mirror code state fail this test — they re-narrate what the code already says, while rotting whenever any feature ships. Design intent, attestation about parked-vs-cruft state, integration boundaries, and code landmarks pass the test — they live nowhere except in the doc.

This principle drives every redesign decision below.

---

## The five-part arc

The redesign is one coherent system delivered as five sequenced plans. Order matters: each step's output is the next step's input.

| # | Plan | Why this order |
|---|---|---|
| 1 | Doctrine update (`doc-philosophy.md` + `doc-template.md`) | Skill cannot enforce rules that don't exist yet; the rules drive everything below. |
| 2 | Slim existing OVERVIEW.md files across projects | Skill freshness sweep depends on docs already being slim. |
| 3 | HANDOVER docket migration | Skill's deferred-routing function depends on the new bucket structure existing. |
| 4 | docs-check skill redesign (one skill, two phases) | All upstream pieces in place. |
| 5 | CLAUDE.md directive standardization | Final connective tissue across project entry points. |

---

## Empirical grounding

This redesign is anchored on three pieces of evidence collected during brainstorm:

**1. Track A drains across 15 recent wrap-up reports** (`/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/*.jsonl`):
- ~30 Track A drains total. Dominant pattern: session ships X, OVERVIEW/CLAUDE/SCHEMA cite stale numbers/paths/sections about X, wrap fixes them.
- These are genuinely wrap-time discoveries (not "should have been caught during task") because they require comparing today's session delta against yesterday's docs — different mental mode from implementation.
- Numerical drift (status lines, version constants, tool counts, schema versions) is the dominant freshness pattern.
- **Section D (friction review) is yield-poor.** ~25 entries across 15 reports, ~2 actionable findings. Most are `[rejected: misfire — single occurrence]`.

**2. OVERVIEW.md content audit on slipgate-app/docs/OVERVIEW.md (461 lines, the strongest case):**
- ~80-100 lines load-bearing (parked-with-purpose attestation, design intent, code landmarks, integration boundaries, identity).
- ~280 lines feature-catalog narrative that mirrors code and rots constantly.
- The catalog serves no audience: Claude reads source faster than catalog entries that drift; operator does not read the doc.

**3. Directive layer audit across project CLAUDE.md files:**
- Inconsistent. `quad` and `slipgate-app` have explicit "Read OVERVIEW.md when starting work" directives. `qw-oracle` CLAUDE.md does not reference OVERVIEW.md at all. `matchscheduler` has a competing `context/ARCHITECTURE-MAP.md` predating the OVERVIEW doctrine.
- OVERVIEW.md is reachable but not auto-loaded; whether it gets read depends on directive strength and task shape.

---

## Plan 1 — Doctrine update

**File targets:** `~/.claude/skills/docs-check/references/doc-philosophy.md`, `~/.claude/skills/docs-check/references/doc-template.md`.

### Changes to `doc-philosophy.md`

Add the audience principle as **Principle 0 (foundational)** at the top of "Core principles":

> **Docs are for Claude's navigation, not the operator's bookshelf.** The operator depends on Claude to build; Claude depends on accurate docs. The only content that earns its keep is content that cannot be reconstructed from the codebase at reasonable cost. If a doc mirrors code state, it will rot every arc and provide less information than reading the code directly.

Update Principle 2 (intent vs state) to explicitly cite OVERVIEW.md as the asymmetric case in Layer 1:

> **Layer 1 is mandatory; most of it is conceptual; OVERVIEW.md is the technical exception.** VISION/README/CLAUDE.md describe identity and rules. OVERVIEW.md describes current state — but only the load-bearing slice (parked-with-purpose, design intent, code landmarks, integration boundaries), not a feature catalog.

Drop or rewrite the existing OVERVIEW.md description in Principle 3 to remove any implication that OVERVIEW carries an exhaustive feature map.

### Changes to `doc-template.md`

Rewrite the OVERVIEW.md section. New "What goes in" list:

- One-paragraph identity: what is this and what isn't it (4 does / 4 doesn't shape works well)
- Parked-with-purpose attestation table — items that exist in code but are intentionally not yet fully alive
- True cruft attestation — items the operator has confirmed safe to delete
- Design-intent paragraphs — rules that would be expensive to reverse-engineer (store merge priority, integration boundaries, never-do invariants)
- Code landmarks — "I want to change X → look at Y" Q&A list
- Integration boundaries — sibling-app or external-service contact points with trust shape
- Pointer table for what this doc does NOT cover (links to Layer 2 / Layer 3 docs)

New "What does NOT go in" list:

- Per-tab / per-route / per-component feature breakdowns
- File-by-file walkthroughs of source modules
- Detailed Tauri/MCP/API command tables that mirror handler registration
- Operator-readable narrative for self-orientation (operator does not read this; do not maintain a second audience)

New target length: **80-150 lines.** No project's OVERVIEW.md needs to be larger. If you're tempted to grow past 150, you're back-sliding into catalog narrative.

### Acceptance criteria for Plan 1

- `doc-philosophy.md` carries Principle 0 (audience).
- `doc-template.md`'s OVERVIEW.md section reflects the new role.
- Both files committed to the docs-check skill's references directory.

---

## Plan 2 — Slim existing OVERVIEW.md files across projects

**Scope:** every OVERVIEW.md in the monorepo. Inventory at brainstorm time:

| Path | Lines | Slimmable? |
|---|---|---|
| `/OVERVIEW.md` (root) | 199 | Likely 100-130 after slim |
| `apps/slipgate-app/OVERVIEW.md` | 70 | Already thin; review only |
| `apps/slipgate-app/docs/OVERVIEW.md` | 461 | Slim to 100-130 |
| `apps/qw-oracle/OVERVIEW.md` | 252 | Slim to 100-130 |
| `apps/quad/OVERVIEW.md` | 241 | Slim to 100-130 |
| `apps/qw-stats/OVERVIEW.md` | 130 | Review and slim if catalog content present |
| `apps/matchscheduler/OVERVIEW.md` | 97 | Already thin; review and reconcile with `context/ARCHITECTURE-MAP.md` |
| `packages/qw-knowledge/OVERVIEW.md` | 55 | Already thin; review only |
| `packages/qw-version-resolution/OVERVIEW.md` | 54 | Already thin; review only |

### Per-file slimming method

For each OVERVIEW.md:

1. Read the existing doc.
2. Categorize each section against the new template: load-bearing keep, useful-but-derivable trim or merge, theater drop.
3. Write the slimmed version. Preserve language and voice from the load-bearing sections.
4. Verify: parked-with-purpose attestation, cruft attestation, design intent, code landmarks all preserved.
5. Verify: feature catalogs, file walkthroughs, command tables that mirror code are gone.

### Special case: matchscheduler

`apps/matchscheduler/CLAUDE.md` references `context/ARCHITECTURE-MAP.md` as "READ FIRST for orientation" — predates the OVERVIEW doctrine. Reconcile during slim:

- Read `context/ARCHITECTURE-MAP.md`.
- Decide: absorb its load-bearing content into `OVERVIEW.md`, or keep ARCHITECTURE-MAP.md as a Layer 3 reference doc and delete the implicit duplication.
- Update CLAUDE.md to remove the competing pointer; standardize on OVERVIEW.md per the doctrine.

### Acceptance criteria for Plan 2

- Every OVERVIEW.md fits the new template (≤150 lines, content matches new "What goes in").
- No file-by-file source walkthroughs remain.
- No detailed feature catalogs remain.
- Parked-with-purpose and cruft attestation preserved.

---

## Plan 3 — HANDOVER docket migration

**Goal:** convert `HANDOVER.md` from a hot-pot of mixed-lifecycle entries (1496 lines, 34 active items) into a docket — a thin index of pending work, with bodies routed to lifecycle-appropriate destinations.

### The five-category routing model

| Category | HANDOVER index entry | Body location | Tag |
|---|---|---|---|
| Small followup | One-liner pointing inline | Inline section in HANDOVER | Verified, days-weeks lifecycle |
| Sidequest | One-liner only | None (escalates to arc if it grows) | Soon-ish, emerged during active work |
| Ongoing arc | One-liner pointing to parking file | `docs/superpowers/parking/<topic>.md` | Multi-session, in-flight |
| Future arc | One-liner pointing to parking file | `docs/superpowers/parking/<topic>.md` | Multi-session, not started, waiting on trigger |
| Shipped retrospective | **Not indexed** | `apps/<project>/docs/arc-history.md` | Historical log |

### HANDOVER.md "Open items" structure

Five sub-sections under the index header, lifecycle-state grouped:

```markdown
## Open items

### Small followups
- [name](anchor) — one-line description
- ...

### Sidequests
- short title — one-line description (no anchor; no body section)
- ...

### Ongoing arcs
- [name](parking/<file>.md) — one-line status
- ...

### Future arcs (waiting on trigger)
- [name](parking/<file>.md) — one-line description with trigger condition
- ...

### Recently opened (this session)
- ... (catch-all for items added this wrap-up; triaged into the right section next session)
```

### One-time migration

The current HANDOVER.md (1496 lines) needs to be migrated. Per-entry decisions:

- **Currently inline body for an arc** (e.g., Slipgate Managed Mode pivot): move body to `docs/superpowers/parking/<topic>.md`. Replace HANDOVER body with a one-line index entry pointing at the parking file.
- **Shipped arc with retained body for retrospective context** (e.g., Map knowledge layer SHIPPED, Zero-debt-before-KTX arc SHIPPED): move body to the relevant project's `arc-history.md`. Delete the HANDOVER index entry entirely.
- **Currently inline body for a small followup** (e.g., extract-tag CLI quality-of-life): keep body inline.
- **Currently a sidequest-shaped one-liner** (e.g., qw-oracle DEVELOPMENT.md missing): trim to clean one-liner, drop the body section if it has one.

After migration, expected HANDOVER.md size: 150-250 lines (mostly index + small followup bodies).

### Parking directory

Create `docs/superpowers/parking/` (sibling to `specs/` and `plans/`). Each ongoing or future arc gets one file:

- Filename: `YYYY-MM-DD-<topic>.md` (date is when the entry was opened, not last-touched)
- Body shape: status, motivation, what's done if anything, what's next, dependencies/triggers, related specs/plans

When an arc graduates from "future" to "ongoing," update the parking file's status; the HANDOVER index entry moves between sub-sections.

When an arc ships, the parking file's content gets harvested into `arc-history.md` (project-level). The parking file itself can be deleted or kept as a seed-record — operator preference.

### Acceptance criteria for Plan 3

- `docs/superpowers/parking/` exists with one file per ongoing or future arc currently in HANDOVER.
- HANDOVER.md is restructured to the five-section docket shape.
- HANDOVER.md is < 300 lines after migration.
- No arc bodies remain inline in HANDOVER (other than small followup bodies).
- Each project that has shipped arcs has an `arc-history.md` (or the migration confirms one already exists, like qw-oracle's).

---

## Plan 4 — docs-check skill redesign

**File target:** `~/.claude/skills/docs-check/SKILL.md` (replaces the current 336-line version).

### Invocation model

**One skill, two phases, auto-escalation.** The operator's trigger phrases stay exactly what they are today ("wrap up", "lets stop for now", "lets push and commit", etc.). The skill internally branches:

1. **Phase 1 (always runs)** — light, mechanical, ~30 seconds for small sessions.
2. **Boundary check** — scan for arc-shipping signals.
3. **Phase 2 (conditional)** — heavy, doctrine-loading, only fires when signals justify it OR operator explicitly requests.

The skill announces its decision: *"Light wrap done — no doctrine sweep needed"* or *"Arc-shipping signals detected — running doctrine sweep."* Operator can override either direction in one sentence.

### Phase 1 — always runs

Steps in order:

1. **Scope detection** — what was touched this session (file paths, branches, project mentions). Same logic as today.
2. **Slim-doc freshness sweep** — for each touched project, scan the slim Layer 1 + Layer 2 docs for numerical drift, path drift, count drift. Track A drains applied inline if mechanical. This is the dominant high-yield function per the wrap-history analysis.
3. **HANDOVER triage with 5-category routing** — for each finding not Track-A-drained, dispatch to small followup / sidequest / ongoing arc / future arc / shipped retrospective per Plan 3's model. Four categories index into HANDOVER; retrospectives go to `arc-history.md` and skip HANDOVER entirely.
4. **Friction journal append** — one question: *"did this session reveal anything friction-shaped?"* If yes, append one line to `~/.claude/friction-log.md` (or per-project; TBD during plan-writing) under the appropriate category (tool/infra, reference gap, repeated manual work, communication). No 6-pattern checklist; the cross-session aggregation is `/insights`'s job.
5. **Memory hygiene quick check** — `wc -c MEMORY.md` byte-size, project memory count. Trigger heavier consolidation only if 20KB / 150 lines / 30 project memories crossed. Otherwise skip.
6. **Git state review** — same five checks as today (uncommitted, unpushed, branch drift, stale merged branches, remote main drift). Pure read; never mutates.

### Boundary signal scan

After Phase 1, check for arc-shipping signals:

- Files touched > 15 across the session
- Branch ahead of main by > 5 commits
- New top-level file, package, or app shipped
- A doc-philosophy mandatory file is missing on a touched project (forces Phase 2)
- OVERVIEW.md last touched > 3 sessions ago AND features landed since
- Operator explicitly stated arc-shipping language ("the arc is done", "we shipped X")
- Operator explicitly requested full sweep ("do a full wrap")

If zero signals: announce light-wrap complete, finish at the report.
If any signal: announce escalation, proceed to Phase 2.

### Phase 2 — conditional

Steps in order:

1. **Existence check (Mode 1 reframed)** — for each Layer 2 trigger, did the session do something that requires a Layer 2 doc that doesn't exist yet? This is the rare but high-value catch (e.g., new package shipped, no quartet yet; new auth flow shipped, no AUTH.md). Fires maybe once per arc-shipping session.
2. **Lifecycle pressure calibration** — read the project's CLAUDE.md `**Status:**` line; calibrate how forcefully to push findings (Active = strict; Maintenance = normal; Paused = passive; Legacy = none; Planning = normal).
3. **Heavier triage on findings** — Phase 2 findings get the full Track A / Track B / rejection treatment with dispatch to the 5-category routing model.
4. **Memory updates** — capture session-surfaced facts into auto-memory per the existing system. Same as today's Step 9.

### Step ordering

The full step sequence (Phase 1 + boundary + Phase 2) preserves the critical ordering rule from today's skill: **memory updates run LAST**, after doc updates and friction capture, so newly-surfaced facts flow into memory in the same pass.

### Report shape

The wrap-up report keeps a similar shape to today's six-section format, but adapted:

- Section A — Freshness drains (Phase 1 numerical-drift work; was Mode 1+2 mixed)
- Section B — Existence checks (Phase 2 only; absent if Phase 2 didn't run)
- Section C — Memory updates
- Section D — **Replaced.** No more skill-opportunity prompting. Just a one-line "friction journal: appended N entries today" or "no entries today."
- Section E — HANDOVER state (resolved, added, currently pending count by category)
- Section F — Git state

### What gets dropped from the current skill

- Step 7 (six-pattern friction review) — replaced with one-question journal append.
- Mode 1 / Mode 2 mode language — replaced with Phase 1 / Phase 2 phase language.
- The "should I make a new skill?" prompting — operator confirmed skills emerge naturally from repeated patterns, not from prompted introspection.
- The single-bucket Track A / Track B language — replaced with 5-category routing (4 indexed in HANDOVER + retrospectives to `arc-history.md`).

### Acceptance criteria for Plan 4

- `~/.claude/skills/docs-check/SKILL.md` is rewritten to the new structure.
- Skill is < 200 lines (down from 336; the simplifications make this easy).
- Frontmatter trigger phrases unchanged.
- The skill announces phase decisions out loud so the operator sees what's happening.
- Phase 1 timing on a small session: realistically ~30-60 seconds of skill execution, not 5+ minutes.

---

## Plan 5 — CLAUDE.md directive standardization

**Scope:** every `CLAUDE.md` in the monorepo (root + per-app + per-package).

### Standard directive line

Each CLAUDE.md gains a consistent line in the "Where to find things" section:

> **Start with `OVERVIEW.md` when working in this project — it's the load-bearing orientation map (parked-with-purpose, design intent, code landmarks, integration boundaries).**

For projects with two-tier OVERVIEW (slipgate-app has both `OVERVIEW.md` and `docs/OVERVIEW.md`), keep the same explicit two-tier framing already in slipgate-app's CLAUDE.md.

### arc-history.md pointer

Each project that has an `arc-history.md` (per Plan 3's migration) gains a pointer in its CLAUDE.md "Where to find things" table:

> **Chronological log of shipped arcs** | `apps/<project>/docs/arc-history.md`

Not a "READ FIRST" directive — the file is reference material for digging into "what did we ship and when" during a conversation, not orientation. Just findable, not auto-read.

### Per-project audit

| File | Current state | Action |
|---|---|---|
| `/CLAUDE.md` (root) | Passive lookup-table pointer | Add explicit "Start with OVERVIEW.md" line |
| `apps/matchscheduler/CLAUDE.md` | Has competing `context/ARCHITECTURE-MAP.md` directive | Standardize on OVERVIEW.md (after Plan 2 reconciliation) |
| `apps/quad/CLAUDE.md` | Already has explicit directive | Verify wording matches standard |
| `apps/qw-oracle/CLAUDE.md` | **No reference at all** | Add explicit directive |
| `apps/qw-stats/CLAUDE.md` | Passive bullet | Upgrade to explicit directive |
| `apps/slipgate-app/CLAUDE.md` | Already has explicit two-tier directive | Verify wording matches standard |
| `packages/qw-knowledge/CLAUDE.md` | (audit at plan-writing time) | Add directive if missing |
| `packages/qw-version-resolution/CLAUDE.md` | (audit at plan-writing time) | Add directive if missing |

### Acceptance criteria for Plan 5

- Every project CLAUDE.md has a consistent, explicit "Start with OVERVIEW.md" directive.
- Every project that has an `arc-history.md` has a CLAUDE.md pointer to it (reference, not READ-FIRST).
- No project has competing pointers to other "READ FIRST" docs.
- Directive wording is uniform across the fleet.

---

## Out of scope / explicit non-goals

- **No automated drift detection.** The numerical-drift sweep stays a cognitive checklist Claude runs, not a regex/AST tool. Future improvement, not part of this arc.
- **No new skill files beyond rewriting docs-check.** The friction-journal redirect is just a markdown file with append discipline; no skill needed.
- **No new doc templates beyond what already exists in `doc-template.md`.** The Layer 2 menu is unchanged in structure (still 9 options); only OVERVIEW.md's role is redefined.
- **No retrofitting of dropped catalog content into Layer 3 docs.** If detail had value, it's already in code; if it didn't, it's gone. Don't relocate dead weight.
- **No change to the auto-memory system.** Memory continues to work as defined in the harness's auto-memory section. The four memory types (user/feedback/project/reference) are unchanged.
- **Memory directory consolidation is a known sibling concern, deferred to its own brainstorm session.** The current `MEMORY.md` and project memory directory have grown unmanageable per a passing operator note in the brainstorm. That work is structurally coupled to this arc (arc-receipt memories logically belong in `arc-history.md` once Plan 3 establishes that destination), but the consolidation itself wasn't brainstormed in this session. It earns its own first-principles design pass in a fresh terminal. The new skill's Phase 1 memory hygiene check still catches forward-going drift even without the one-time backward consolidation.

---

## Migration notes

This is the largest single-arc doctrine change since the doc-philosophy spec was written (2026-04-11). Estimated total effort across the five plans: probably one focused full-day session, possibly stretched to two if the OVERVIEW.md slimming surfaces edge cases.

**Sequencing recommendation for execution:**

- **Session A: Plans 1 + 2 + 3** — doctrine + OVERVIEW slimming + HANDOVER migration. One coherent doc-restructure session.
- **Session B: Plans 4 + 5** — skill rewrite + CLAUDE.md directive standardization. Plan 4 should run in a fresh session (rewriting a skill while the skill is supposed to keep working risks self-modification race conditions). Plan 5 folds in naturally since both touch CLAUDE.md territory.

---

## Related docs and dependencies

- **Existing docs-check skill** — `~/.claude/skills/docs-check/SKILL.md` (will be rewritten in Plan 4)
- **Existing doctrine** — `~/.claude/skills/docs-check/references/doc-philosophy.md` and `doc-template.md` (will be updated in Plan 1)
- **Brainstorm parking entry** — `HANDOVER.md` § "Wrap-up split brainstorm (2026-04-29)" (this spec resolves it; HANDOVER entry can be removed when this spec is approved)
- **/insights data** — `/home/paradoks/.claude/usage-data/report.html` (the data that drove the priority)
- **Wrap-history analysis** — extracted to `/tmp/wrapup-extracts/recent-15-wrapups.md` during brainstorm (transient artifact; not committed)
- **Auto-memory feedback memory** — `feedback_rule_intent_over_literal.md` (the lesson driving "verify intent, not literal compliance" — applies to this redesign as a meta-principle)
