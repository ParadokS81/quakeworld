---
Doc type: current — Implementation plan. Delete/archive once all tasks land.
---

# Monorepo Doc Philosophy — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the three core artifacts approved in the doc philosophy spec: a philosophy reference doc, a template reference doc, and a refactored `docs-check` skill that uses both as its source of truth.

**Architecture:** Two reference docs become the skill's "knowledge base"; the refactored `SKILL.md` is the runtime that consults them. The skill splits into Mode 1 (Layer 2 trigger checklist) and Mode 2 (Layer 1 freshness checklist), reports results as a structured A/B/C/D block, and calibrates pressure by the touched project's lifecycle status.

**Tech Stack:** Markdown only. No code, no build, no tests. Verification is content-level (line counts, section presence, cross-references resolve to real files).

**Source of truth:** `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md` — the approved spec. When in doubt, read the spec; do not improvise doctrine.

**Out of scope for this plan (Phase 2, separate plan later):**
- Slimming the monorepo-root `CLAUDE.md` to <100 lines
- Writing monorepo-root `README.md`, `VISION.md`, `OVERVIEW.md`
- Creating `/.claude/skills/philosophy/grug-brain.md` and `/.claude/skills/philosophy/philosophy-of-software-design.md`
- Adding `@imports` and output-discipline rules to root `CLAUDE.md`
- Deleting `HANDOFF.md`
- Per-app migration (explicitly lazy per spec — happens when Claude next works in each project)

---

## File structure

| Path | Status | Purpose |
|---|---|---|
| `/home/paradoks/.claude/skills/docs-check/references/doc-philosophy.md` | Create | Short, opinionated doctrine. Loaded by the skill as source of truth for "what docs are for." ~50-80 lines. |
| `/home/paradoks/.claude/skills/docs-check/references/doc-template.md` | Create | Menu of all doc types (Layer 1 quartet + 8 Layer 2 + Layer 3 pattern) with question/content/voice/length for each. ~200-300 lines. |
| `/home/paradoks/.claude/skills/docs-check/SKILL.md` | Rewrite | v0.1 exists (196 lines). Refactor into Mode 1 + Mode 2 structure, add lifecycle-aware pressure, reference the two new docs. |
| `/home/paradoks/projects/quakeworld/docs/doc-philosophy-workshop.md` | Delete | Workshop handoff brief. Explicit instruction in its own header: "Delete this file once the workshop produces its deliverables." |

**Note on the skill location:** The spec keeps `docs-check` at `~/.claude/skills/` (user-global) where v0.1 already lives. The philosophy *reference* files go alongside it under `references/`, not in the monorepo. That's intentional per the spec. (The monorepo-scoped `/.claude/skills/philosophy/` files are a separate, Phase 2 concern.)

---

## Task 1: Create `doc-philosophy.md` reference

**Files:**
- Create: `/home/paradoks/.claude/skills/docs-check/references/doc-philosophy.md`

**Purpose:** Codify the 7 core principles from the spec into a short, opinionated doctrine that the skill loads as source of truth. This is a *reference* the skill reads; it is not a user-facing essay.

**Required sections (in order):**

1. **`# Doc Philosophy`** — one-sentence orientation: "Doctrine for the monorepo's documentation model. Loaded by the `docs-check` skill."
2. **`## Core principles`** — the 7 principles from spec §"Core principles", each as a bolded one-liner followed by one or two sentences of elaboration. Preserve spec wording closely; do not paraphrase loosely.
   1. Docs are optimized for Claude's navigation, not for the user's bookshelf.
   2. Docs preserve INTENT; code preserves STATE.
   3. Template is structure, not graduation.
   4. Conditional docs are a menu, not a checklist.
   5. `CLAUDE.md` bloat is a symptom.
   6. Skills and path-scoped rules are extensions, not replacements.
   7. The skill uses cognitive triggers, not regex.
3. **`## The layer model`** — three short paragraphs:
   - **Layer 1 (mandatory quartet):** `CLAUDE.md`, `README.md`, `VISION.md`, `OVERVIEW.md`. Every project has all four; content scales with project size.
   - **Layer 2 (conditional menu):** 8 standard docs, each with a trigger. Projects pick the subset their shape demands. No project has zero, no project has all eight.
   - **Layer 3 (domain reference):** Deep, permanent subsystem background. No fixed naming. Suggested, not enforced.
4. **`## Size limits`** — three short bullets:
   - `CLAUDE.md`: target <100 lines, hard ceiling 150. Bloat is diagnostic of a missing Layer 2 doc.
   - Other Layer 1 docs: no cap (`OVERVIEW.md` scales with project size).
   - Layer 2 / Layer 3: as long as they need to be.
5. **`## How the skill uses this doc`** — three sentences: the skill loads this file at session-end, consults it to calibrate what each touched project needs, and does not paraphrase it back to the user unless asked.

**Hard constraints:**
- ASCII only (no em dashes, smart quotes, or Unicode decorations — this is already in the spec's output discipline rules).
- Total length: 50-100 lines inclusive of headings and blank lines. Err on the short side.
- Do NOT duplicate the spec's full argumentation. This is a reference, not a re-derivation.
- Do NOT include a "doc type" frontmatter tag — this file lives under `~/.claude/skills/`, outside the monorepo's tagging convention.

- [ ] **Step 1: Create the directory**

Run:
```bash
mkdir -p /home/paradoks/.claude/skills/docs-check/references
```
Expected: no output, directory exists.

- [ ] **Step 2: Write `doc-philosophy.md`**

Use the Write tool. File path: `/home/paradoks/.claude/skills/docs-check/references/doc-philosophy.md`. Content matches the "Required sections" list above. Pull principle wording directly from the spec's §"Core principles" — do not rewrite.

- [ ] **Step 3: Verify line count and section presence**

Run:
```bash
wc -l /home/paradoks/.claude/skills/docs-check/references/doc-philosophy.md
```
Expected: a number between 50 and 100.

Then verify all 5 required sections are present:
```bash
grep -E '^##? ' /home/paradoks/.claude/skills/docs-check/references/doc-philosophy.md
```
Expected output (exactly 6 lines, one `#` and five `##`):
```
# Doc Philosophy
## Core principles
## The layer model
## Size limits
## How the skill uses this doc
```

If line count is off or a section is missing, fix before moving on.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add -A
git commit -m "docs(skill): add doc-philosophy reference for docs-check"
```

Note: `/home/paradoks/.claude/skills/` is OUTSIDE the monorepo, so `git add -A` from the monorepo root will NOT stage it. The skill references live in the user-global `~/.claude/` tree and are not tracked by the monorepo. This commit will only stage the plan file itself (and any workshop-file deletion from Task 4). If `git status` shows nothing staged from this task, that is expected — skip this commit and move on.

---

## Task 2: Create `doc-template.md` reference

**Files:**
- Create: `/home/paradoks/.claude/skills/docs-check/references/doc-template.md`

**Purpose:** A menu the skill consults when deciding whether a touched project needs a new Layer 2 doc or whether an existing doc matches the template. One entry per doc type, with a consistent structure so Claude can look up "what does a `SCHEMA.md` need to contain?" in one read.

**Required structure:**

```
# Doc Template Menu

Short orientation paragraph: "This is a menu, not a rigid form. The docs-check skill consults it to check whether a touched project has the docs its shape demands, and whether existing docs match the template's intent."

## Layer 1 — Mandatory quartet

### CLAUDE.md
### README.md
### VISION.md
### OVERVIEW.md

## Layer 2 — Conditional menu

### DEVELOPMENT.md
### DEPLOYMENT.md
### SCHEMA.md
### API_CONTRACTS.md
### AUTH.md
### DESIGN.md
### STATE.md
### HEALTH.md

## Layer 3 — Domain reference (pattern, not a single doc)
```

**Each Layer 1 + Layer 2 entry must have these five sub-headings, in order:**

- **Question answered:** one sentence
- **Audience:** one phrase (who reads this, when)
- **What goes in:** bulleted list, 3-6 items
- **What does NOT go in:** bulleted list, 2-4 items with pointer to the correct doc
- **Voice example:** one block-quoted snippet showing tone. For existing docs in the monorepo, pull from the real file and cite it inline. For docs that don't exist yet, write a 2-sentence plausible example.
- **Target length:** one line (concrete numbers or "no cap, scales with project")
- **Update cadence:** one phrase

**The Layer 3 entry is different:** it's one section describing the pattern — what qualifies, how naming works (named for what it explains, no fixed convention), how the skill treats it (may suggest, does not enforce), and 2-3 examples from the current monorepo (e.g., `CFG-PARSER.md`, `EZQUAKE-RESOLUTION.md`).

**Additional required sub-section under `### CLAUDE.md`:** after the "Update cadence" line, add a one-paragraph note titled **When rules should live elsewhere:** that covers spec §"Nested `CLAUDE.md` and path-scoped rules" — nested `CLAUDE.md` for whole-directory subsystems, `.claude/rules/*.md` with `paths:` frontmatter for narrow file-level rules, and the "<20 lines of rules, keep them in root" guidance. Three sentences max.

**Where to pull voice examples from:**

| Doc | Source file for voice example |
|---|---|
| CLAUDE.md | `apps/slipgate-app/CLAUDE.md` (79 lines, already slim) |
| README.md | Write a fresh 2-sentence example (no existing good reference) |
| VISION.md | `apps/slipgate-app/docs/VISION.md` (60 lines) — pick 2 sentences |
| OVERVIEW.md | `apps/slipgate-app/docs/OVERVIEW.md` — reuse the spec's ConfigViewer block quote |
| DEVELOPMENT.md | `apps/slipgate-app/docs/DEVELOPMENT.md` |
| DEPLOYMENT.md | `apps/slipgate-app/docs/DEPLOYMENT.md` if it exists, else `apps/quad/docs/DEPLOYMENT.md` |
| SCHEMA.md | `apps/matchscheduler/context/SCHEMA.md` or `apps/qw-stats/docs/DATABASE-SCHEMA.md` |
| API_CONTRACTS.md | `apps/qw-stats/docs/API-GUIDE.md` (will be renamed later per spec) |
| AUTH.md | `apps/slipgate-app/docs/AUTH.md` |
| DESIGN.md | `apps/slipgate-app/docs/DESIGN.md` (107 lines) |
| STATE.md | No existing file — write a 2-sentence plausible example oriented around SolidJS + tauri-plugin-store |
| HEALTH.md | `apps/slipgate-app/docs/HEALTH.md` (233 lines) |

For each source file, use the Read tool to pick a representative 2-sentence block. Do not fabricate quotes.

**Trigger language for Layer 2 entries:** each Layer 2 entry should also have a **Trigger** line (one sentence) immediately after **Audience**, copying from the spec's Layer 2 section. The skill's Mode 1 checklist maps directly to these triggers.

**Hard constraints:**
- ASCII only.
- Total length: 200-300 lines. This is the spec's stated range; landing at ~250 is fine.
- Every Layer 1 + Layer 2 entry has all required sub-headings. No skipping.
- Voice examples are real quotes from real files (cite the source inline after the quote) OR explicitly labeled "illustrative example" if fabricated.

- [ ] **Step 1: Read all source files to extract voice examples**

Use the Read tool on each file in the "Where to pull voice examples from" table above. For each file, note a 2-sentence block that exemplifies the doc's voice.

- [ ] **Step 2: Write `doc-template.md`**

Use the Write tool. File path: `/home/paradoks/.claude/skills/docs-check/references/doc-template.md`. Follow the required structure exactly. For each Layer 2 entry's Trigger line, copy from the spec's §"Layer 2" triggers verbatim.

- [ ] **Step 3: Verify structure**

Run:
```bash
wc -l /home/paradoks/.claude/skills/docs-check/references/doc-template.md
```
Expected: 200-300.

Verify every Layer 1 + Layer 2 doc has its sub-headings:
```bash
grep -c '\*\*Question answered:\*\*' /home/paradoks/.claude/skills/docs-check/references/doc-template.md
```
Expected: 12 (4 Layer 1 + 8 Layer 2).

```bash
grep -c '\*\*Voice example:\*\*' /home/paradoks/.claude/skills/docs-check/references/doc-template.md
```
Expected: 12.

```bash
grep -c '\*\*Trigger:\*\*' /home/paradoks/.claude/skills/docs-check/references/doc-template.md
```
Expected: 8 (Layer 2 only).

If any count is off, fix before moving on.

- [ ] **Step 4: Commit**

Same commit-scope caveat as Task 1 step 4: this file is outside the monorepo, so only plan-file changes will be staged from the monorepo root. Skip the commit if nothing is staged.

---

## Task 3: Refactor `docs-check/SKILL.md`

**Files:**
- Modify: `/home/paradoks/.claude/skills/docs-check/SKILL.md` (full rewrite of most of the body)

**Purpose:** Turn the v0.1 draft into the production skill described in the spec §"The `docs-check` skill — two modes". The rewrite is mostly: (a) rip out the v0.1-pending-workshop disclaimer, (b) split the drift check into Mode 1 + Mode 2, (c) add lifecycle-aware pressure, (d) restructure the report to match the spec's A/B/C/D scheme, (e) reference the two new files as source of truth.

**Frontmatter changes:**
- Remove `version: 0.1.0` (or bump to `1.0.0`).
- Keep the `name` and the trigger-phrase list in `description`.
- Shorten the description so it does not re-explain the whole skill.

**Sections to preserve from v0.1 (keep verbatim or with minor edits):**
- "Why it runs in the main context, not a sub-agent"
- "Critical override: memory updates happen LAST"
- Step 1 (Scope detection)
- Step 3 (Session review) — keep unchanged
- Step 6 (Memory gap check) — renumber
- Step 9 (Apply memory updates) — renumber
- The Edge cases section at the bottom — keep but drop any v0.1-specific language

**Sections to DELETE from v0.1:**
- The `⚠️ v0.1 DRAFT` callout block at the top (lines 9-10 in v0.1)
- Step 2's full "doc-type tag classification table" (replaced — see below)
- Step 5 (New doc candidates) — the spec folds this into Mode 1

**Sections to REWRITE:**

- **New intro block (replacing v0.1 lines 7-34):** A three-paragraph explanation of what the skill does: (1) runs at session-end, (2) checks each touched project using two modes, (3) calibrates pressure by lifecycle status. End with one line: "Source of truth: `references/doc-philosophy.md` and `references/doc-template.md`. Read those before making judgments."

- **Step 2 — Doc inventory + lifecycle read.** Replace v0.1's tag-classification table with a simpler per-project checklist:
  - Read the project's `CLAUDE.md` header and extract the `**Status:**` line (Active / Maintenance / Paused / Legacy / Planning). If no status line, note it as a gap and treat as Active for pressure purposes.
  - Check whether each Layer 1 quartet doc exists: `CLAUDE.md`, `README.md`, `VISION.md`, `OVERVIEW.md`. Any missing one is a Mode 2 finding.
  - Check `CLAUDE.md` line count; flag if >150.
  - List the Layer 2 docs that currently exist in `docs/` (for later Mode 1 comparison).
  - (Remove the v0.1 doc-type-tag table entirely — the tagging convention was slipgate-specific and is superseded by the layer model.)

- **Step 4 — Mode 1 (Layer 2 trigger checks).** Replace v0.1's drift check with the 8 trigger questions from spec §"Mode 1 — Trigger-based enforcer (Layer 2)". Copy each question verbatim. After listing the 8 questions, add: "For each 'yes,' consult `references/doc-template.md` to verify the corresponding doc exists and matches the template. If missing or stale, add to Section A of the report. Do NOT auto-write. The operator decides."

- **Step 5 — Mode 2 (Layer 1 freshness checks).** New step. Insert the 5 freshness questions from spec §"Mode 2 — Freshness-based cartographer (Layer 1)" verbatim. After listing them, add: "Findings go to Section B of the report. If OVERVIEW drift is clear, offer to rebuild the affected section. If VISION needs an addendum, propose it."

- **Step 7 (was self-improvement review) — keep the content but rename.** Rename to "Step 7 — Session friction review" and note that findings feed Section D of the report (not "self-review" — the spec uses "skill opportunities / frictions").

- **Step 8 — Apply doc updates with lifecycle-aware pressure.** Rewrite to include a pressure table:

  | Status | Pressure |
  |---|---|
  | Active | Strict — fix before wrap-up. Block close-out on material gaps. |
  | Maintenance | Normal — propose fixes, apply with approval. |
  | Paused | Passive — note the gap in the report, do not push to fix. |
  | Legacy | None — do not nudge. Note in report only if trivially fixable. |
  | Planning | Normal — the project is pre-code but docs can still be wrong. |

- **Step 10 — Report.** Rewrite the report template to match the spec's A/B/C/D:

  ```
  ## Wrap-up report

  ### Section A — Layer 2 trigger checks (Mode 1)
  - [doc name]: [finding — missing / stale / OK]
  - ...

  ### Section B — Layer 1 freshness checks (Mode 2)
  - [finding about OVERVIEW / VISION / CLAUDE.md bloat / quartet gaps]
  - ...

  ### Section C — Memory updates
  - [memory name] — what was saved and category
  - ...

  ### Section D — Skill opportunities / session frictions
  - [friction or opportunity] — short description with a suggestion
  - ...
  (Suggestions only, not actions taken.)
  ```

  Note at the bottom: "Do NOT auto-commit. Doc changes land as regular edits the operator reviews before committing." (Preserved from v0.1.)

**Target length for the whole file:** 180-260 lines. v0.1 is 196; the rewrite should land in a similar range. If you cross 260, something is probably duplicated from the reference docs.

- [ ] **Step 1: Read v0.1 to orient**

Run:
```bash
wc -l /home/paradoks/.claude/skills/docs-check/SKILL.md
```
Expected: ~196.

Then use the Read tool to load the file into context. Identify the blocks to preserve vs. rewrite per the section list above.

- [ ] **Step 2: Write the new `SKILL.md`**

Use the Write tool to overwrite `/home/paradoks/.claude/skills/docs-check/SKILL.md` with the refactored content. Preserve frontmatter structure (yaml), preserve the preserved sections verbatim where noted, and insert the new sections per the spec.

**Key requirements the rewrite must satisfy (this is your self-check list):**
- Frontmatter has no `v0.1.0` version string.
- No "⚠️ v0.1 DRAFT" block anywhere in the file.
- Intro block ends with the "Source of truth" line pointing to both reference files with relative paths (`references/doc-philosophy.md`, `references/doc-template.md`).
- Step 2 checks the Layer 1 quartet by filename and reads the `**Status:**` line.
- Step 4 has all 8 Mode 1 trigger questions from the spec, verbatim, numbered 1-8.
- Step 5 has all 5 Mode 2 freshness questions from the spec, verbatim, numbered 1-5.
- Step 8 has the lifecycle-pressure table.
- Step 10's report template has exactly four sections labeled `Section A`, `Section B`, `Section C`, `Section D` in that order, matching the spec's labels (Mode 1 / Mode 2 / Memory / Skill opportunities).
- No reference to the old v0.1 doc-type tags (`current`, `snapshot`, `reference`, `future`, `external`).
- No reference to the workshop file at `docs/doc-philosophy-workshop.md`.

- [ ] **Step 3: Verify rewrite**

Run the following checks. Every one must pass.

```bash
wc -l /home/paradoks/.claude/skills/docs-check/SKILL.md
```
Expected: 180-260.

```bash
grep -c 'v0.1' /home/paradoks/.claude/skills/docs-check/SKILL.md
```
Expected: 0.

```bash
grep -c 'doc-philosophy-workshop' /home/paradoks/.claude/skills/docs-check/SKILL.md
```
Expected: 0.

```bash
grep -c 'references/doc-philosophy.md' /home/paradoks/.claude/skills/docs-check/SKILL.md
```
Expected: ≥1.

```bash
grep -c 'references/doc-template.md' /home/paradoks/.claude/skills/docs-check/SKILL.md
```
Expected: ≥1.

```bash
grep -E '^### Section [ABCD]' /home/paradoks/.claude/skills/docs-check/SKILL.md
```
Expected output (exactly 4 lines, in order):
```
### Section A — Layer 2 trigger checks (Mode 1)
### Section B — Layer 1 freshness checks (Mode 2)
### Section C — Memory updates
### Section D — Skill opportunities / session frictions
```

```bash
grep -c 'Mode 1' /home/paradoks/.claude/skills/docs-check/SKILL.md
```
Expected: ≥2.

```bash
grep -c 'Mode 2' /home/paradoks/.claude/skills/docs-check/SKILL.md
```
Expected: ≥2.

If any check fails, fix the rewrite before moving on.

- [ ] **Step 4: Commit**

Same commit-scope caveat as Tasks 1 and 2. Only plan-file edits and workshop-file deletion will be staged from the monorepo. The skill rewrite itself lives in `~/.claude/` and is not tracked here.

---

## Task 4: Validate against spec checklist and clean up

**Files:**
- Delete: `/home/paradoks/projects/quakeworld/docs/doc-philosophy-workshop.md`

**Purpose:** Walk the subset of the spec's validation checklist that applies to Phase 1, confirm all three artifacts are live, and remove the workshop handoff file per its own deletion instruction.

**Phase 1 validation subset (from spec §"Validation checklist"):**

- [ ] `docs-check` skill reads the philosophy + template reference files as its source of truth (verified by Task 3 Step 3's `grep` for `references/`)
- [ ] `docs-check` skill produces an A/B/C/D structured report when invoked (verified by Task 3 Step 3's section header grep)
- [ ] The old `doc-philosophy-workshop.md` is deleted (this task's step 2)

**Phase 2 checklist items NOT validated here** (they belong to the second plan):
- Every app with Layer 1 quartet
- No `CLAUDE.md` exceeds 150 lines
- Monorepo-root `@imports` for philosophy skills
- Output discipline rules in root `CLAUDE.md`
- Lifecycle status in every `CLAUDE.md`
- `HANDOFF.md` deleted
- `research/repos/slipgate/` gitignored or covered by `update-repos.sh`

- [ ] **Step 1: Run the Phase 1 subset of the validation checklist**

Re-run these three commands from Task 3 Step 3:

```bash
grep -c 'references/doc-philosophy.md' /home/paradoks/.claude/skills/docs-check/SKILL.md
grep -c 'references/doc-template.md' /home/paradoks/.claude/skills/docs-check/SKILL.md
grep -E '^### Section [ABCD]' /home/paradoks/.claude/skills/docs-check/SKILL.md
```

Expected: same pass conditions as Task 3 Step 3. If any fail, return to Task 3 and fix.

Also confirm both reference files exist:
```bash
ls -l /home/paradoks/.claude/skills/docs-check/references/
```
Expected: two files listed — `doc-philosophy.md` and `doc-template.md`.

- [ ] **Step 2: Delete the workshop file**

Confirm the three artifacts are live before deleting (the workshop file's own deletion criterion is "once the workshop produces its deliverables"). Then:

```bash
rm /home/paradoks/projects/quakeworld/docs/doc-philosophy-workshop.md
```

Verify:
```bash
ls /home/paradoks/projects/quakeworld/docs/doc-philosophy-workshop.md 2>&1
```
Expected: `No such file or directory`.

- [ ] **Step 3: Commit the workshop deletion and this plan**

```bash
cd /home/paradoks/projects/quakeworld
git add docs/doc-philosophy-workshop.md docs/superpowers/plans/2026-04-11-monorepo-doc-philosophy.md
git status
```

Expected in `git status`: the workshop file as deleted, the plan file as new. If Tasks 1-3 also staged anything (unlikely since those files are outside the monorepo), include them.

```bash
git commit -m "docs(philosophy): land phase 1 artifacts; retire workshop brief"
```

- [ ] **Step 4: Update project memory**

Update `project_doc_philosophy.md` in auto-memory to reflect that Phase 1 landed. Use the Edit or Write tool on `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_doc_philosophy.md` — add a line: "Phase 1 landed 2026-04-11: doc-philosophy.md, doc-template.md, refactored docs-check SKILL.md. Phase 2 (root CLAUDE.md slim + quartet) is the next plan."

---

## Post-plan: what comes after

**Phase 2 (separate plan, separate session):**
- Copy/write the two philosophy skill files into `/.claude/skills/philosophy/` (monorepo-scoped)
- Slim monorepo-root `CLAUDE.md` to <100 lines
- Add `@imports` for philosophy skills + output discipline rules + `**Status: Active**` header
- Write monorepo-root `README.md`, `VISION.md`, `OVERVIEW.md`
- Delete `HANDOFF.md`
- Verify `research/repos/slipgate/` gitignore coverage

**Phase 3 (lazy, per spec):**
- Per-app migration happens when Claude next works in each app, in the priority order from spec §"Migration plan". The refactored `docs-check` skill is the enforcement mechanism; it will nudge each project into compliance as they're touched.
