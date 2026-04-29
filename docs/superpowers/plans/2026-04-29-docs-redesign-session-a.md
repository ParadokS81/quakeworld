# Docs Redesign — Session A (Plans 1+2+3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Plans 1+2+3 from the docs-system-redesign spec — update the doctrine (doc-philosophy.md + doc-template.md), slim every OVERVIEW.md in the monorepo, and migrate HANDOVER.md from a 1615-line hot-pot into a thin docket with bodies routed to lifecycle-appropriate destinations (parking files for arcs, arc-history.md for shipped retrospectives, inline for small followups).

**Architecture:** Pure doc-restructure work, no code edits. Doctrine update lands first because the slimming pass and migration both consult the new template. OVERVIEW slimming runs second so the freshness sweep that follows in Session B has slim docs to sweep against. HANDOVER migration is mechanical execution against the pre-classified table in Task 17 — no per-entry classification work happens during execution.

**Tech Stack:** Markdown editing via Edit/Write tools, git for commits. No code, tests, or build steps. Verification is grep / wc -l / visual scan of structure.

**Spec reference:** `docs/superpowers/specs/2026-04-29-docs-system-redesign-design.md` — Plans 1, 2, 3.

**Out of scope for Session A:** docs-check skill rewrite (Plan 4) and CLAUDE.md directive standardization (Plan 5) — those land in Session B. Memory directory consolidation is deferred to its own brainstorm per the spec's Out-of-scope section.

---

## Plan 1 — Doctrine update (Tasks 1-4)

### Task 1: Add Principle 0 to doc-philosophy.md

**Files:**
- Modify: `/home/paradoks/.claude/skills/docs-check/references/doc-philosophy.md`

- [ ] **Step 1: Read the current doc-philosophy.md to confirm structure**

Run: `cat /home/paradoks/.claude/skills/docs-check/references/doc-philosophy.md`
Expected: file exists, has `## Core principles` section with principles numbered 1-7.

- [ ] **Step 2: Insert Principle 0 at the top of "Core principles"**

Find the line `## Core principles` and the next line `**1. Docs are optimized for Claude's navigation, not for the user's bookshelf.** ...`. Insert a new Principle 0 before Principle 1, AND renumber existing principles 1-7 to 1-8 (Principle 0 is foundational, the existing seven shift).

Actually — do NOT renumber. Spec line 61 says "Add the audience principle as **Principle 0 (foundational)** at the top". Treat it as a foundational preamble principle distinct from the numbered list. Insert as a new Principle 0 entry that reads:

```markdown
**0. Docs are for Claude's navigation, not the operator's bookshelf.** The operator depends on Claude to build; Claude depends on accurate docs. The only content that earns its keep is content that cannot be reconstructed from the codebase at reasonable cost. If a doc mirrors code state, it will rot every arc and provide less information than reading the code directly.
```

Use Edit with `old_string` = the entire `## Core principles\n\n**1. Docs are...`  block beginning so the insertion lands cleanly at the top of the principles list, before the existing Principle 1.

- [ ] **Step 3: Verify Principle 0 reads cleanly above Principle 1**

Run: `head -15 /home/paradoks/.claude/skills/docs-check/references/doc-philosophy.md`
Expected: `## Core principles` header, then **0.** block, then **1.** block.

- [ ] **Step 4: Commit**

```bash
git -C /home/paradoks/projects/quakeworld add /home/paradoks/.claude/skills/docs-check/references/doc-philosophy.md
```

Note: doc-philosophy.md lives under `~/.claude/`, NOT under the monorepo. It's a user-global skill file. Commits do NOT cover it from inside the monorepo's git tree — the file edit lands but isn't tracked by the monorepo repo. Document this in the commit body. The commit covers any monorepo-side changes (none in Task 1; Tasks 2, 3, 4 will accumulate).

Skip the commit until the doctrine task batch (Tasks 1+2) is done — no value in micro-committing user-global skill edits one principle at a time. Move to Task 2 directly.

### Task 2: Update Principle 2 and Principle 3 of doc-philosophy.md

**Files:**
- Modify: `/home/paradoks/.claude/skills/docs-check/references/doc-philosophy.md`

- [ ] **Step 1: Update Principle 2 to call OVERVIEW.md the asymmetric Layer 1 case**

Find the existing Principle 2 line:

```
**2. Docs preserve INTENT; code preserves STATE.** Code answers "what is this doing?" Git log answers "when did this change?" Docs answer "why is this the way it is?", "what were we trying to build?", "what did we try and reject?" If a doc's content could be fully reconstructed from code, it is redundant scaffolding. If it cannot, it is load-bearing.
```

Append a follow-up paragraph after Principle 2's body:

```
**Layer 1 is mandatory; most of it is conceptual; OVERVIEW.md is the technical exception.** VISION/README/CLAUDE.md describe identity and rules. OVERVIEW.md describes current state — but only the load-bearing slice (parked-with-purpose, design intent, code landmarks, integration boundaries), not a feature catalog.
```

Use Edit with the full Principle 2 line as `old_string` and append the new paragraph in `new_string`.

- [ ] **Step 2: Update Principle 3 to drop the "exhaustive feature map" implication**

Find the existing Principle 3 line:

```
**3. Template is structure, not graduation.** Every project has the mandatory docs, period. A 30-line OVERVIEW and a 363-line OVERVIEW are both valid. The structure is constant; the content scales with project size.
```

Replace the "30-line OVERVIEW and a 363-line OVERVIEW are both valid" example with new ranges that match the slimmed reality:

```
**3. Template is structure, not graduation.** Every project has the mandatory docs, period. A 30-line OVERVIEW and a 150-line OVERVIEW are both valid; OVERVIEW.md is now expected to fit within ~150 lines (see `doc-template.md` for the role definition). The structure is constant; the content scales with project size, but the role is bounded.
```

- [ ] **Step 3: Verify both principles read cleanly**

Run: `grep -n "OVERVIEW" /home/paradoks/.claude/skills/docs-check/references/doc-philosophy.md`
Expected: Principle 2's appended paragraph + Principle 3's updated example both visible.

- [ ] **Step 4: Skip commit (still in batch with Task 1)**

Continue to Task 3.

### Task 3: Rewrite OVERVIEW.md section in doc-template.md

**Files:**
- Modify: `/home/paradoks/.claude/skills/docs-check/references/doc-template.md`

- [ ] **Step 1: Read current OVERVIEW.md section**

Run: `sed -n '/^### OVERVIEW.md$/,/^### /p' /home/paradoks/.claude/skills/docs-check/references/doc-template.md | head -30`
Expected: shows the existing OVERVIEW.md template entry (under `## Layer 1 - Mandatory quartet`).

- [ ] **Step 2: Rewrite the OVERVIEW.md section**

Replace the entire `### OVERVIEW.md` section (from the heading down to the next `### README.md` style heading — the next entry is the start of `## Layer 2 - Conditional menu`, so OVERVIEW.md is the last Layer 1 entry) with this new content:

```markdown
### OVERVIEW.md

**Question answered:** What's load-bearing about this project's current shape that I cannot reconstruct from the code in two minutes?

**Audience:** Claude returning to the project, needing the slice of state that grep + a fast source read won't surface.

**What goes in:**
- One-paragraph identity: what is this and what isn't it (4 does / 4 doesn't shape works well)
- Parked-with-purpose attestation table — items that exist in code but are intentionally not yet fully alive
- True cruft attestation — items the operator has confirmed safe to delete
- Design-intent paragraphs — rules that would be expensive to reverse-engineer (store merge priority, integration boundaries, never-do invariants)
- Code landmarks — "I want to change X → look at Y" Q&A list
- Integration boundaries — sibling-app or external-service contact points with trust shape
- Pointer table for what this doc does NOT cover (links to Layer 2 / Layer 3 docs)

**What does NOT go in:**
- Per-tab / per-route / per-component feature breakdowns (catalog content; rots constantly; reproducible from grep)
- File-by-file walkthroughs of source modules
- Detailed Tauri/MCP/API command tables that mirror handler registration
- Operator-readable narrative for self-orientation (operator does not read this; do not maintain a second audience)

**Litmus test for "load-bearing vs catalog":** for each candidate paragraph, ask *"could a future Claude re-derive this content by grep + reading 1-2 source files in under 2 minutes?"* If yes → catalog → cut. If reproducing it requires cross-session memory, operator input, or attestation about parked-vs-cruft state → load-bearing → keep.

**Voice example:** *"The ConfigViewer subsystem is the biggest feature in the app by far — 20+ components, ~3,000 lines. Lives in src/components/Config*.tsx + CvarRow.tsx + CvarTooltip.tsx + configMerger.ts + AliasChainResolver.tsx. Rendered inside MyQuakeTab's 'Config' sub-tab."* (from `apps/slipgate-app/docs/OVERVIEW.md` — code-landmark style)

**Target length:** 80-150 lines. No project's OVERVIEW.md needs to be larger. If you're tempted to grow past 150, you're back-sliding into catalog narrative — apply the litmus test and cut.

**Update cadence:** When a load-bearing fact changes (parked item ships, integration boundary moves, attestation changes). Not every feature ship.
```

- [ ] **Step 3: Verify the new section reads cleanly**

Run: `grep -A5 "^### OVERVIEW.md" /home/paradoks/.claude/skills/docs-check/references/doc-template.md | head -10`
Expected: new section opens with the new "Question answered" line.

Run: `wc -l /home/paradoks/.claude/skills/docs-check/references/doc-template.md`
Expected: file size shifted (the rewrite trims some content, adds litmus test — net change small).

- [ ] **Step 4: Skip commit (still in batch).**

Continue to Task 4.

### Task 4: Verify Plan 1 acceptance criteria + commit doctrine batch

**Files:**
- Modify: none (verification + commit)

- [ ] **Step 1: Verify Plan 1 acceptance**

Per spec Plan 1 acceptance criteria (lines 92-96):

Run: `grep -nE "^\*\*0\." /home/paradoks/.claude/skills/docs-check/references/doc-philosophy.md`
Expected: one match for Principle 0.

Run: `grep -nE "Layer 1 is mandatory" /home/paradoks/.claude/skills/docs-check/references/doc-philosophy.md`
Expected: one match (Principle 2's appended Layer 1 paragraph).

Run: `grep -A1 "Litmus test" /home/paradoks/.claude/skills/docs-check/references/doc-template.md | head -5`
Expected: shows the litmus test in the OVERVIEW.md section.

- [ ] **Step 2: Note that doctrine files are user-global, not in the monorepo**

The two edited files (`doc-philosophy.md` and `doc-template.md`) live under `~/.claude/skills/docs-check/references/`, outside the monorepo. They do NOT need a monorepo commit. The edits are session-persistent against the user's home directory. If those files are themselves under git tracking elsewhere (e.g., a dotfiles repo), the operator handles that separately.

- [ ] **Step 3: No monorepo commit yet (no monorepo files changed in Plan 1)**

Plan 1's output lives outside the monorepo's git tree. Move directly to Plan 2 — the next monorepo commit will land at the end of Plan 2's first slim batch.

---

## Plan 2 — Slim every OVERVIEW.md (Tasks 5-13)

### Task 5: Slim apps/slipgate-app/docs/OVERVIEW.md (the big one)

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/apps/slipgate-app/docs/OVERVIEW.md` (currently 461 lines)

- [ ] **Step 1: Read the existing doc and inventory sections**

Run: `grep -nE "^## |^### " /home/paradoks/projects/quakeworld/apps/slipgate-app/docs/OVERVIEW.md`
Expected: list of all H2/H3 sections.

- [ ] **Step 2: Apply the litmus test section by section**

Walk through each section asking *"could a future Claude re-derive this by grep + reading 1-2 source files in under 2 minutes?"* Drop catalog content; keep load-bearing content.

**Sections that pass the test (KEEP):**
- The "What the app is" four-does-/-four-doesn't paragraph (identity, design intent — not in code)
- "Stubs, POCs, and planned-but-unbuilt" → "Parked with real purpose (not dead code)" table — attestation, not in code
- "Stubs, POCs, and planned-but-unbuilt" → "True cruft (safe to delete — confirmed with user)" table — attestation
- "Code landmarks — where to find things" Q&A list — load-bearing because it captures intent of "if you want to change X, look at Y"
- "External integration map" — boundary attestation (which sibling apps over which transport)
- "What this doc intentionally does NOT cover" pointer table

**Sections that fail the test (CUT or radically slim):**
- "The 6 tabs" with per-tab feature catalogs — every line is reproducible from grep + 30s file read. CUT entirely; replace with one paragraph naming the six tabs and pointing at `src/components/SideNav.tsx`.
- "The ConfigViewer subsystem" walkthrough — same. CUT to one paragraph naming it as the biggest subsystem with a code-landmark pointer; the deep architecture lives in `docs/CFG-PARSER.md`.
- "The Player State Simulator" walkthrough — CUT. The detailed module breakdown is grep-able. Replace with one line saying the simulator lives at `src/lib/simulator/` with a pointer to its spec/plan docs.
- "The Rust backend — Tauri commands" with per-command tables — CUT. The handler registration is the source of truth. Replace with one paragraph naming the major command modules + line counts.
- "App shell & data flow" walkthrough including the ProfileData store schema in code-block form — CUT. Schema lives in `store.ts` and `STATE.md`.
- "Tauri integration — frontend ↔ backend" command tables — CUT. The `generate_handler!` macro is the source of truth.

- [ ] **Step 3: Write the slimmed OVERVIEW.md**

Use Write tool to replace the entire file with the slimmed version. Target: 100-130 lines (well under the 150 cap).

Skeleton structure:
```
# Slipgate App — Overview

[1-paragraph identity: "Windows-first desktop companion for QuakeWorld..." + "It does four things a web browser can't" + "It does NOT yet do" — keep as-is]

## Map at a glance

[1-paragraph naming the six tabs + Rust commands surface + ConfigViewer + simulator. Each item points at its grep-anchor: "Tabs: see `src/components/SideNav.tsx` and the `*Tab.tsx` siblings." etc.]

## Parked with real purpose

[Existing table: Schedule tab / Browse mode PCX-TGA-WAD / Maps subtab / Matches subtab / Assets subtab / Screenshot automation / equipment_history / View as Primary / Linux/macOS parity. KEEP verbatim — this is attestation.]

## True cruft (safe to delete)

[Existing table: greet / TabNav.tsx / ConfigCategoryBar.tsx / md-5 crate / debug console.log. KEEP verbatim — attestation.]

## Code landmarks — where to find things

[Existing Q&A list — KEEP verbatim. This is load-bearing intent capture.]

## External integration map

[Existing table — KEEP verbatim. Boundary attestation.]

## What this doc intentionally does NOT cover

[Existing pointer table — KEEP verbatim, update any line that points at a section that just got cut.]

---
*Last slimmed: 2026-04-29 per docs-system-redesign spec.*
```

- [ ] **Step 4: Verify the slim**

Run: `wc -l /home/paradoks/projects/quakeworld/apps/slipgate-app/docs/OVERVIEW.md`
Expected: 80-150 lines. Hard fail if > 150.

Run: `grep -cE "^### " /home/paradoks/projects/quakeworld/apps/slipgate-app/docs/OVERVIEW.md`
Expected: small count (≤ 8 H3s). If > 10, you're still carrying catalog narrative — re-apply litmus test.

Run: `grep -nE "tab|Tab" /home/paradoks/projects/quakeworld/apps/slipgate-app/docs/OVERVIEW.md | head`
Expected: one or two mentions only (the "Map at a glance" paragraph). Not 50+ catalog lines.

- [ ] **Step 5: Commit**

```bash
git -C /home/paradoks/projects/quakeworld add apps/slipgate-app/docs/OVERVIEW.md
git -C /home/paradoks/projects/quakeworld commit -m "$(cat <<'EOF'
docs(slipgate): slim docs/OVERVIEW.md per docs-redesign spec Plan 2

461 lines → ~120. Drop per-tab/per-component catalog narrative
(grep-reproducible). Keep parked-with-purpose attestation, cruft
attestation, code landmarks, integration map. Litmus test applied per
spec.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 6: Slim apps/qw-oracle/OVERVIEW.md

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/apps/qw-oracle/OVERVIEW.md` (currently 252 lines)

- [ ] **Step 1: Read existing doc**

Run: `cat /home/paradoks/projects/quakeworld/apps/qw-oracle/OVERVIEW.md | head -60`
Expected: structure visible.

- [ ] **Step 2: Apply litmus test**

Same approach as Task 5. Walk each H2/H3 section. Catalog content ("here are all the entity types", "here are all the MCP tools") fails the test — `apps/qw-oracle/SCHEMA.md` and the MCP tools registration in `apps/qw-oracle/serve/mcp/src/tools/` are the sources of truth. Keep:
- Identity paragraph
- Three-layer model paragraph (load-bearing design intent — this isn't grep-able from code)
- Parked-with-purpose / cruft attestation if any exists
- Code landmarks (where to find what)
- Integration boundaries
- Pointer table for what this doc doesn't cover

Drop:
- Per-entity-type rosters (SCHEMA.md is canonical)
- Per-MCP-tool descriptions (the tool source files are canonical)
- Per-extractor walkthroughs (`scripts/extractors/<project>/` is canonical, plus `EXTRACTOR-PLAYBOOK.md`)

- [ ] **Step 3: Write the slimmed version**

Target 80-130 lines. Use Write tool.

- [ ] **Step 4: Verify**

Run: `wc -l /home/paradoks/projects/quakeworld/apps/qw-oracle/OVERVIEW.md`
Expected: ≤ 150 lines.

- [ ] **Step 5: Commit**

```bash
git -C /home/paradoks/projects/quakeworld add apps/qw-oracle/OVERVIEW.md
git -C /home/paradoks/projects/quakeworld commit -m "$(cat <<'EOF'
docs(qw-oracle): slim OVERVIEW.md per docs-redesign spec Plan 2

252 → target ≤150. Drop entity-type and MCP-tool catalogs (canonical
in SCHEMA.md and the MCP tools source). Keep three-layer design intent,
landmarks, integration map.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 7: Slim apps/quad/OVERVIEW.md

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/apps/quad/OVERVIEW.md` (currently 241 lines)

- [ ] **Step 1: Read existing doc**

Run: `cat /home/paradoks/projects/quakeworld/apps/quad/OVERVIEW.md | head -80`
Expected: structure visible.

- [ ] **Step 2: Apply litmus test, write slimmed version, target ≤ 150 lines**

Same method as Tasks 5-6. Drop module / command catalog narrative; keep design intent, attestation, landmarks, integrations.

- [ ] **Step 3: Verify**

Run: `wc -l /home/paradoks/projects/quakeworld/apps/quad/OVERVIEW.md`
Expected: ≤ 150 lines.

- [ ] **Step 4: Commit**

```bash
git -C /home/paradoks/projects/quakeworld add apps/quad/OVERVIEW.md
git -C /home/paradoks/projects/quakeworld commit -m "$(cat <<'EOF'
docs(quad): slim OVERVIEW.md per docs-redesign spec Plan 2

241 → target ≤150. Drop module / command catalog narrative; keep
landmarks, attestation, integrations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 8: Slim root /OVERVIEW.md

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/OVERVIEW.md` (currently 199 lines)

- [ ] **Step 1: Read existing doc**

Run: `cat /home/paradoks/projects/quakeworld/OVERVIEW.md`
Expected: full content visible (199 lines fits in one read).

- [ ] **Step 2: Apply litmus test**

Root OVERVIEW.md serves the monorepo identity / integration-diagram role. Keep:
- Integration diagram (cross-app contact map — not grep-able)
- Per-app status snapshot (active/maintenance/etc.) — design intent
- Packages roster — load-bearing index, not catalog
- Cross-cutting contracts pointer

Drop:
- Per-app feature narratives (each app has its own OVERVIEW.md now slimmed)
- Anything that mirrors per-app docs

- [ ] **Step 3: Write slimmed version, target 100-130 lines**

- [ ] **Step 4: Verify**

Run: `wc -l /home/paradoks/projects/quakeworld/OVERVIEW.md`
Expected: ≤ 150 lines.

- [ ] **Step 5: Commit**

```bash
git -C /home/paradoks/projects/quakeworld add OVERVIEW.md
git -C /home/paradoks/projects/quakeworld commit -m "$(cat <<'EOF'
docs(root): slim OVERVIEW.md per docs-redesign spec Plan 2

199 → target 100-130. Keep cross-app integration diagram, per-app
status snapshot, packages roster. Drop per-app feature mirrors (each
app's OVERVIEW.md owns its own slice).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 9: Review apps/qw-stats/OVERVIEW.md

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/apps/qw-stats/OVERVIEW.md` (currently 130 lines)

- [ ] **Step 1: Read full doc**

Run: `cat /home/paradoks/projects/quakeworld/apps/qw-stats/OVERVIEW.md`
Expected: 130 lines fits in one read.

- [ ] **Step 2: Apply litmus test**

130 lines is already inside the target. Look for catalog content that fails the litmus test — research-doc rosters, API endpoint tables that mirror the source. If the doc is mostly load-bearing, the slim is a no-op or trim of 10-30 lines.

- [ ] **Step 3: Slim if needed**

If you can defensibly cut even 20 lines while keeping all load-bearing content, do. If everything passes the litmus test, leave alone.

- [ ] **Step 4: Verify**

Run: `wc -l /home/paradoks/projects/quakeworld/apps/qw-stats/OVERVIEW.md`
Expected: ≤ 150 lines (was already there). If reduced, note new line count in commit.

- [ ] **Step 5: Commit (only if changes were made)**

If unchanged, skip the commit and note in the Task 13 final report that qw-stats was reviewed as already-compliant.

```bash
git -C /home/paradoks/projects/quakeworld add apps/qw-stats/OVERVIEW.md
git -C /home/paradoks/projects/quakeworld commit -m "$(cat <<'EOF'
docs(qw-stats): trim OVERVIEW.md per docs-redesign spec Plan 2

Litmus-test pass; minor catalog content removed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 10: Review apps/matchscheduler/OVERVIEW.md (NARROW SCOPE)

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/apps/matchscheduler/OVERVIEW.md` (currently 97 lines)
- Out of scope: any file under `/home/paradoks/projects/quakeworld/apps/matchscheduler/context/` (16+ files, deferred to its own arc per spec line 130 — the "matchscheduler doc system reconciliation" sidequest will be added to HANDOVER in Task 17/19)

- [ ] **Step 1: Read full doc**

Run: `cat /home/paradoks/projects/quakeworld/apps/matchscheduler/OVERVIEW.md`
Expected: 97 lines visible.

- [ ] **Step 2: Apply litmus test**

97 lines is already within target. Walk through and apply litmus. The matchscheduler `context/` directory is OUT OF SCOPE — do not analyze, do not propose changes, do not relocate any of its 17 files. The CLAUDE.md pointer to `context/ARCHITECTURE-MAP.md` will be removed in Plan 5 (Session B), not here.

- [ ] **Step 3: Slim if needed**

If unchanged, skip the commit. If trimmed, commit.

- [ ] **Step 4: Verify**

Run: `wc -l /home/paradoks/projects/quakeworld/apps/matchscheduler/OVERVIEW.md`
Expected: ≤ 150 lines.

Run: `ls /home/paradoks/projects/quakeworld/apps/matchscheduler/context/ | wc -l`
Expected: 17 (unchanged — context/ is out of scope).

- [ ] **Step 5: Commit (only if changes were made)**

```bash
git -C /home/paradoks/projects/quakeworld add apps/matchscheduler/OVERVIEW.md
git -C /home/paradoks/projects/quakeworld commit -m "$(cat <<'EOF'
docs(matchscheduler): trim OVERVIEW.md per docs-redesign spec Plan 2

Narrow scope: only OVERVIEW.md. The 17-file context/ directory stays
untouched — its reconciliation gets its own brainstorm arc (HANDOVER
sidequest added in Plan 3).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 11: Review apps/slipgate-app/OVERVIEW.md (the thin app-root one)

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/apps/slipgate-app/OVERVIEW.md` (currently 70 lines — distinct from `apps/slipgate-app/docs/OVERVIEW.md` which is the deep one slimmed in Task 5)

- [ ] **Step 1: Read full doc**

Run: `cat /home/paradoks/projects/quakeworld/apps/slipgate-app/OVERVIEW.md`
Expected: 70 lines visible. This is the "thin app-root map" per slipgate's CLAUDE.md.

- [ ] **Step 2: Apply litmus test**

70 lines is already well within target. Verify it correctly fills the "thin app-root" role and points at `docs/OVERVIEW.md` (now slimmed) for the deeper map. No catalog content expected at this size.

- [ ] **Step 3: Light edits only (or no-op)**

If pointers in this doc reference sections of `docs/OVERVIEW.md` that got cut in Task 5, fix the pointers. Otherwise leave alone.

- [ ] **Step 4: Verify and commit if changed**

```bash
git -C /home/paradoks/projects/quakeworld add apps/slipgate-app/OVERVIEW.md
git -C /home/paradoks/projects/quakeworld commit -m "docs(slipgate): refresh app-root OVERVIEW.md pointers post-slim

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
"
```

If unchanged, note in Task 13 report.

### Task 12: Review packages/qw-knowledge/OVERVIEW.md and packages/qw-version-resolution/OVERVIEW.md

**Files:**
- Modify (potentially): `/home/paradoks/projects/quakeworld/packages/qw-knowledge/OVERVIEW.md` (currently 55 lines)
- Modify (potentially): `/home/paradoks/projects/quakeworld/packages/qw-version-resolution/OVERVIEW.md` (currently 54 lines)

- [ ] **Step 1: Read both**

Run: `cat /home/paradoks/projects/quakeworld/packages/qw-knowledge/OVERVIEW.md /home/paradoks/projects/quakeworld/packages/qw-version-resolution/OVERVIEW.md`
Expected: ~110 lines total visible.

- [ ] **Step 2: Apply litmus test to each**

Both are already thin. Verify content is load-bearing. Most likely no-op.

- [ ] **Step 3: Edit only if catalog content found**

- [ ] **Step 4: Commit if changed**

If both unchanged, note in Task 13 report and skip commit.

### Task 13: Plan 2 acceptance verification + report

**Files:**
- Modify: none (verification step)

- [ ] **Step 1: Verify line counts across the fleet**

Run: `wc -l /home/paradoks/projects/quakeworld/OVERVIEW.md /home/paradoks/projects/quakeworld/apps/*/OVERVIEW.md /home/paradoks/projects/quakeworld/apps/*/docs/OVERVIEW.md /home/paradoks/projects/quakeworld/packages/*/OVERVIEW.md`
Expected: every file ≤ 150 lines (acceptance per spec line 136).

- [ ] **Step 2: Spot-check for residual catalog narrative**

Run: `grep -lE "tab|Tab" /home/paradoks/projects/quakeworld/apps/*/OVERVIEW.md /home/paradoks/projects/quakeworld/apps/*/docs/OVERVIEW.md`
Expected: hits only where "tab" is genuinely load-bearing (not 50-line per-tab feature dumps).

- [ ] **Step 3: Confirm parked-with-purpose / cruft attestation preserved**

For each project, grep for the attestation language:

Run: `grep -lE "[Pp]arked|[Cc]ruft|[Ss]afe to delete" /home/paradoks/projects/quakeworld/apps/*/docs/OVERVIEW.md /home/paradoks/projects/quakeworld/apps/*/OVERVIEW.md`
Expected: at minimum slipgate-app/docs/OVERVIEW.md still carries this. Other projects only if they had the content originally.

- [ ] **Step 4: Note Plan 2 done; no commit (verification only)**

---

## Plan 3 — HANDOVER docket migration (Tasks 14-22)

### Task 14: Create the parking directory

**Files:**
- Create: `/home/paradoks/projects/quakeworld/docs/superpowers/parking/.gitkeep` (or any seed file to make the directory committable)

- [ ] **Step 1: Verify the directory does not exist yet**

Run: `ls /home/paradoks/projects/quakeworld/docs/superpowers/parking 2>&1`
Expected: "No such file or directory".

- [ ] **Step 2: Create the directory and seed it with a README explaining its role**

Use Write tool to create `/home/paradoks/projects/quakeworld/docs/superpowers/parking/README.md`:

```markdown
# Parking

Per-arc and per-future-arc body files indexed from `HANDOVER.md`. Each file describes one ongoing or future arc using HANDOVER's existing template:

- `**Added:**` — date the entry was opened
- `**Status:**` — one-line current state (ongoing / future / blocked-on-X)
- `**Verification first:**` — the cheap check to run before starting work, in case state has drifted
- Body sections — what's done, what's next, dependencies, sub-threads
- `**Pressure:**` — relative urgency
- `**Related:**` — pointers to specs / plans / memory / source files

When an arc graduates from "future" to "ongoing", update the parking file's `**Status:**`. The HANDOVER index entry moves between sub-sections.

When an arc ships, harvest the parking file's content into the relevant project's `arc-history.md` and either delete or keep the parking file as a seed-record (operator preference). The HANDOVER index entry is removed entirely.

Filename convention: `YYYY-MM-DD-<topic>.md` where the date is when the entry was opened, not last-touched.
```

- [ ] **Step 3: Verify**

Run: `ls /home/paradoks/projects/quakeworld/docs/superpowers/parking/`
Expected: `README.md`.

- [ ] **Step 4: Commit (defer until end of Task 17 batch)**

Skip commit; the parking dir + first batch of parking files commits together.

### Task 15: Verify the orphan index reference

**Files:**
- Read-only check on `/home/paradoks/projects/quakeworld/HANDOVER.md`

- [ ] **Step 1: Check for the orphan "Layer 3 concept note: death rules" body**

The HANDOVER index references `[Layer 3 concept note: death rules](#layer-3-concept-note-death-rules)` at line ~27, but the H2 anchor list does not include a `## Layer 3 concept note: death rules` body section.

Run: `grep -nE "^## .*[Dd]eath rules" /home/paradoks/projects/quakeworld/HANDOVER.md`
Expected: no output (confirms orphan).

Run: `grep -n "Layer 3 concept note: death rules" /home/paradoks/projects/quakeworld/HANDOVER.md`
Expected: one match — the index reference at line ~27, with no corresponding H2 body.

- [ ] **Step 2: Decide handling**

Since there's no body, treat as a future arc with a stub: it's a known intent ("write a Layer 3 concept note about death rules, gated on KTX gameplay overrides"). Create a short parking file in Task 17 capturing this stub, OR drop from the index entirely if the operator prefers.

Decision: create a stub parking file `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-XX-XX-layer3-death-rules-concept-note.md` with a `**Status:**` note that the body was orphaned in HANDOVER (no detail to migrate; intent only).

If the operator prefers to drop entirely instead, the executor should ask before creating the stub.

### Task 16: Bootstrap parking files for ongoing arcs (4 files)

**Files:**
- Create:
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-18-qw-knowledge-rollout.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-28-slipgate-managed-mode.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-28-cross-extractor-pattern-audit.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-28-mode-b-validation-followups.md`

For each file, the content is the corresponding HANDOVER body section, copied verbatim with no rewriting. The HANDOVER body is the source of truth; parking is the new home.

- [ ] **Step 1: Migrate "Phase 2d-2h: remaining QW knowledge rollout"**

Read HANDOVER lines 418 through the line just before the next `## ` heading (roughly to line 471). Copy the entire body — `**Added:** ... **Status:** ... **Updated:** ... ### What shipped through Phase 2c.6 ... etc. ... ### Pressure` — verbatim into:

`/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-18-qw-knowledge-rollout.md`

Prepend a top-level H1: `# Phase 2d-2h: remaining QW knowledge rollout` (the HANDOVER's H2 becomes the parking file's H1).

- [ ] **Step 2: Migrate "Slipgate Managed Mode pivot — multi-arc project opened"**

Read HANDOVER lines 1199 through the line just before the next `## ` heading (~1327). Copy verbatim into:

`/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-28-slipgate-managed-mode.md`

Prepend H1: `# Slipgate Managed Mode pivot — multi-arc project opened`.

- [ ] **Step 3: Migrate "Cross-extractor pattern audit follow-up arc"**

Read HANDOVER lines 1328 through the line just before the next `## ` heading (~1408). Copy verbatim into:

`/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-28-cross-extractor-pattern-audit.md`

Prepend H1: `# Cross-extractor pattern audit follow-up arc`.

- [ ] **Step 4: Migrate "Per-project Mode B validation synthesis follow-ups"**

Read HANDOVER lines 1409 through the line just before the next `## ` heading (~1457). Copy verbatim into:

`/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-28-mode-b-validation-followups.md`

Prepend H1: `# Per-project Mode B validation synthesis follow-ups`.

- [ ] **Step 5: Verify each parking file**

Run: `wc -l /home/paradoks/projects/quakeworld/docs/superpowers/parking/*.md`
Expected: 5 files (4 above + README.md), each non-trivial line count matching the source HANDOVER section size.

- [ ] **Step 6: Defer commit until parking-files batch ends in Task 17.**

### Task 17: Bootstrap parking files for future arcs (12-13 files)

**Files:**
- Create:
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-26-cross-engine-alias-followups.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-26-retired-cvars-stale-config-warning.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-26-slipgate-schemamd.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-27-feed-tab-content.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-27-screenshot-profile-picture.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-27-tray-menu-launch.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-28-cross-extractor-phase6-residuals.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-28-phase6-ezquake-r-bloom-shape.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-XX-interactive-html-dashboard.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-XX-qw-event-log-cross-validation.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-29-schemamd-style-refresh.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-29-l1-alpha-ecosystem-tools.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-29-l1-beta-cross-format-fingerprinting.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-29-l1-gamma-helpdocs.md`
  - `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-29-l1-delta-stock-pak.md`
  - (optional) `/home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-XX-XX-layer3-death-rules-concept-note.md` (per Task 15 decision)

For each file, fetch the date from the HANDOVER `**Added:**` line (the filename's date should match) and copy the body verbatim.

- [ ] **Step 1: For each future-arc HANDOVER section, copy body to its parking file**

Mechanical: open HANDOVER at the section's line range (per the table below), copy the entire H2 body section into the named parking file, prepend H1. **Use the actual `**Added:**` date in the filename when it differs from your guess** — read the body's `**Added:**` line first.

| HANDOVER section | HANDOVER line range (approx) | Parking filename |
|---|---|---|
| Cross-extractor Phase 6 residuals | 185-213 | `2026-04-28-cross-extractor-phase6-residuals.md` |
| Cross-extractor Phase 6 ezquake exemptions | 214-277 | `2026-04-28-phase6-ezquake-r-bloom-shape.md` |
| Cross-engine alias scaffolding + slipgate version-awareness | 316-373 | `2026-04-26-cross-engine-alias-followups.md` |
| Retired cvars in snapshot + stale-config warning UX | 374-417 | `2026-04-26-retired-cvars-stale-config-warning.md` |
| Slipgate SCHEMA.md for snapshot consumer interface | 582-609 | `2026-04-26-slipgate-schemamd.md` |
| Feed tab future content | 610-645 | `2026-04-27-feed-tab-content.md` |
| Screenshot POC -> Profile picture generator | 646-690 | `2026-04-27-screenshot-profile-picture.md` |
| Tray menu launch | 691-737 | `2026-04-27-tray-menu-launch.md` |
| Interactive HTML dashboard (deferred) | 906-947 | (read body to get exact date) `2026-04-XX-interactive-html-dashboard.md` |
| qw_event_log as cross-validation oracle for Layer 1 | 1052-1114 | (read body) `2026-04-XX-qw-event-log-cross-validation.md` |
| SCHEMA.md doc-style inconsistency | 1115-1162 | `2026-04-29-schemamd-style-refresh.md` |
| L1-alpha: Ecosystem-tools registry | 1521-1546 | `2026-04-29-l1-alpha-ecosystem-tools.md` |
| L1-beta: Cross-format binary fingerprinting | 1547-1567 | `2026-04-29-l1-beta-cross-format-fingerprinting.md` |
| L1-gamma: Engine helpdoc / data-file recognition | 1568-1590 | `2026-04-29-l1-gamma-helpdocs.md` |
| L1-delta: Stock asset catalog | 1591-1615 | `2026-04-29-l1-delta-stock-pak.md` |

For Cross-engine alias scaffolding (line 316-373): the body is large — note that the `## ` headers inside its body are H2; preserve them as is when copied. The H1 prepend is only for the section title itself.

- [ ] **Step 2: Verify all parking files exist and are non-trivial**

Run: `wc -l /home/paradoks/projects/quakeworld/docs/superpowers/parking/*.md`
Expected: ~16-20 files total (4 ongoing from Task 16 + 12-13 future from Task 17 + README + optional death-rules stub).

Run: `for f in /home/paradoks/projects/quakeworld/docs/superpowers/parking/*.md; do head -1 "$f"; done`
Expected: each file's first line is `# <Title>` (H1).

- [ ] **Step 3: Commit the parking directory + all parking files in one batch**

```bash
git -C /home/paradoks/projects/quakeworld add docs/superpowers/parking/
git -C /home/paradoks/projects/quakeworld commit -m "$(cat <<'EOF'
docs(superpowers): bootstrap docs/superpowers/parking/ with arc bodies

Migrate ongoing-arc and future-arc bodies from HANDOVER.md to parking
files per docs-redesign spec Plan 3. HANDOVER restructure follows in
the next commit.

Bodies copied verbatim using HANDOVER's existing template
(Added/Status/Verification first/body/Pressure/Related). Parking files
become the source of truth; HANDOVER becomes a thin index.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 18: Append shipped retrospectives to qw-oracle's arc-history.md

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/arc-history.md` (currently 87 lines)

The three "shipped retrospective" HANDOVER sections (Zero-debt-before-KTX, Map knowledge layer, Layer 1 doc_only audit) all belong to qw-oracle. Two of them (Zero-debt + Map knowledge) already have one-paragraph entries in arc-history.md per the current head of that file. The Layer 1 doc_only audit doesn't appear there yet.

- [ ] **Step 1: Read current arc-history.md**

Run: `cat /home/paradoks/projects/quakeworld/apps/qw-oracle/docs/arc-history.md`
Expected: append-only chronicle with prepend-on-top convention. Verify Zero-debt-before-KTX and Map knowledge entries are present (they are per the earlier read — first two sections).

- [ ] **Step 2: Decide whether to expand existing arc-history entries**

The existing entries are one-paragraph summaries. The HANDOVER bodies are several screens of detail (Zero-debt is ~32 lines of body; Map knowledge is ~38 lines).

Decision: **do NOT expand the existing entries.** arc-history.md's convention is "one paragraph per arc, oldest at the bottom." Bloating the existing entries would break the chronicle's scan-ability. The HANDOVER bodies retain their detail by living in `git log` (the commits that shipped them) and the spec/plan files referenced from each HANDOVER body's Related section.

If the operator wants the HANDOVER bodies preserved as raw text, store them as `apps/qw-oracle/docs/_history/2026-04-29-zero-debt-shipped.md` etc. — but that's not part of this plan unless the operator asks.

- [ ] **Step 3: Add a new entry for "Layer 1 doc_only audit -- closed"**

Prepend (newest-on-top) to arc-history.md. Use the chronicle's voice — one tight paragraph capturing what shipped + the deferred row. The existing entries are the style template.

Insert before the existing top entry ("2026-04-29 -- Zero-debt-before-KTX arc"):

```markdown
## 2026-04-25 -- Layer 1 doc_only audit closed

Audit of 269 doc_only ezquake entities reduced to 194 across 7 shipped patterns: P5a SERVER_ONLY clang arg fix (+1 cvar); P1 Cmd_AddLegacyCommand alias detection (+40 commands); P2 struct-literal table walker (+7 commands); P3 nested cvar_t tables (+10 cvars); P6 #define resolution at Cmd_AddCommand sites (+1); 4-variant parse architecture for win/apple TUs (+7 cvars + bonus rows); loader-side help-JSON type-mismatch dedup (-22 orphans). Pattern 4 reclassified as legitimate cat2 drift (mp3-feature deprecation). One row deferred: `-nopriority` cmdline_param at sv_sys_win.c:645 needs Windows SDK stub headers — re-considered when MVDSV/FTE hit the same wall. Commits c6fdcf3 / a099231 / 8f67843 / 0f8f170 / 5dd466c / 146cd73. HANDOVER follow-up: "-nopriority cmdline_param recovery (Windows SDK stubs)" sidequest.

```

Position the entry chronologically (between the existing 2026-04-28 entries and any older 2026-04-25 entries — read the current file first to find the right insertion point).

- [ ] **Step 4: Verify**

Run: `wc -l /home/paradoks/projects/quakeworld/apps/qw-oracle/docs/arc-history.md`
Expected: ~95-100 lines (was 87, added one paragraph).

Run: `grep -c "^## " /home/paradoks/projects/quakeworld/apps/qw-oracle/docs/arc-history.md`
Expected: count increased by 1.

- [ ] **Step 5: Commit (defer until HANDOVER restructure batch in Task 19).**

### Task 19: Restructure HANDOVER.md to the docket shape

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/HANDOVER.md` (currently 1615 lines → target ≤ 300 lines)

This is the big mechanical pass. Use Write tool — fully replace the file.

- [ ] **Step 1: Compose the new HANDOVER.md**

The new file structure:

```markdown
# Handover

Thin docket of pending work. The index below points at lifecycle-grouped sub-sections; arc bodies live in `docs/superpowers/parking/<topic>.md` and shipped retrospectives live in each project's `arc-history.md`. Small-followup bodies stay inline.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state.

**How to work an item:** pick from the index below, jump to its destination (parking file or inline section), verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete BOTH the index line AND the destination content (parking file → `git rm`; inline section → Edit; arc-history entries are append-only and stay).

## Open items

### Small followups
- [Synthesis-report numerical-claim provenance gap](#synthesis-report-numerical-claim-provenance-gap-2026-04-29) — discipline note for future validation arcs; no retroactive fix.
- [ezquake variables-ast.json non-determinism](#ezquake-variables-astjson-non-determinism-2026-04-29) — medium pressure. Stable-key sort or `PYTHONHASHSEED`. Affects validation runbook Section 1.1.
- [extract-tag CLI quality-of-life](#extract-tag-cli-quality-of-life-issues-2026-04-29) — low pressure. Loader-summary 2-row gap + `--ordinal` lookup.
- [Semantic-pass abbreviation-bridge heuristic](#semantic-pass-abbreviation-bridge-heuristic) — low pressure. Spec-ready fix in `semantic-match.ts`.
- [qw-oracle DEVELOPMENT.md missing](#qw-oracle-developmentmd-missing) — discoverability gap; one new doc.
- [`-nopriority` cmdline_param recovery (Windows SDK stubs)](#-nopriority-cmdline_param-recovery-windows-sdk-stubs) — deferred from Layer 1 doc_only audit; waits on first MVDSV/FTE same-wall hit before solving in one place.

### Sidequests
- Plugin v-table asset detection (loader-sites handler) — FTE plugins reach loaders through `cvarfuncs->...` v-table calls. Only `plugin:ezhud` affected; ezhud images ship bundled. Low pressure.
- Cvar-binding handler indirection gap (snprintf chains + CVARFC callbacks) — engine-agnostic; reconciliation correctly treats as `seedRetained`; only AST-corroboration is partial. Low pressure.
- Sub-pattern 2b: cmdline variant-matrix gaps — 2 ezQuake + 11 QWCL entries on the same SDK-stub-headers solve. Bundle with `-nopriority` followup when triggered.
- Workstream B: concept-note authoring scaffolding — template MDX-compatibility test + authoring-ritual shape. Polish; not blocking.
- Workstream C: /docs ingest pipeline prep — gap-report output format as contributor onboarding kit. Polish; not blocking.
- Phase 2e follow-up arc residuals — 2 informational anomalies (gl_lightmode + 194 doc_only). Triage at next ezQuake deep-time refresh.
- Map knowledge layer follow-ups — slipgate map-browser UI; advanced search_maps filters; author seed-YAML curation; automated quarterly stats refresh; future maps.quake.world richer-metadata refactor.
- matchscheduler doc system reconciliation — 17-file `apps/matchscheduler/context/` predates monorepo doctrine. Earned its own brainstorm when matchscheduler work next surfaces friction with the existing system.

### Ongoing arcs
- [Phase 2d-2h: remaining QW knowledge rollout](docs/superpowers/parking/2026-04-18-qw-knowledge-rollout.md) — KTX is the only remaining engine port.
- [Slipgate Managed Mode pivot](docs/superpowers/parking/2026-04-28-slipgate-managed-mode.md) — **HIGH PRESSURE.** Pass 1+2+3 complete; Pass 4 brainstorm next.
- [Cross-extractor pattern audit follow-up arc](docs/superpowers/parking/2026-04-28-cross-extractor-pattern-audit.md) — five phases shipped + 13 audit-deferred residuals + 2 new follow-ups.
- [Per-project Mode B validation synthesis follow-ups](docs/superpowers/parking/2026-04-28-mode-b-validation-followups.md) — three Mode B validations shipped; some closed, some queued.

### Future arcs (waiting on trigger)
- [Cross-extractor Phase 6 residuals](docs/superpowers/parking/2026-04-28-cross-extractor-phase6-residuals.md) — D.1.8 lifecycle hooks + broader positive-contracts coverage + deep-time-walk obligation.
- [Cross-extractor Phase 6 ezquake exemptions: r_bloom_* shape](docs/superpowers/parking/2026-04-28-phase6-ezquake-r-bloom-shape.md) — convergent with QWCL 1996-vintage shape; joint positive-contract arc candidate.
- [Cross-engine alias scaffolding + slipgate version-awareness follow-ups](docs/superpowers/parking/2026-04-26-cross-engine-alias-followups.md) — sub-thread #4 (FTE asset bundle, superseded by Slipgate Managed Mode TAIL-1) + sub-thread #5 (slipgate version-awareness, tracked-by Quake Dir Control plan).
- [Retired cvars in snapshot + stale-config warning UX](docs/superpowers/parking/2026-04-26-retired-cvars-stale-config-warning.md) — coupled producer+consumer work blocked on UX design.
- [Slipgate SCHEMA.md for snapshot consumer interface](docs/superpowers/parking/2026-04-26-slipgate-schemamd.md) — gated on next slipgate UI arc surfacing version-arc badges.
- [Feed tab future content](docs/superpowers/parking/2026-04-27-feed-tab-content.md) — tournaments / dev landscape / GitHub monitoring / community announcements.
- [Screenshot POC → Profile picture generator](docs/superpowers/parking/2026-04-27-screenshot-profile-picture.md) — graduate POC into Profile.
- [Tray menu launch](docs/superpowers/parking/2026-04-27-tray-menu-launch.md) — optional arc; documented home if launch needs to come back.
- [Interactive HTML dashboard](docs/superpowers/parking/2026-04-XX-interactive-html-dashboard.md) — shelved with documented unshelve triggers.
- [qw_event_log as cross-validation oracle for Layer 1](docs/superpowers/parking/2026-04-XX-qw-event-log-cross-validation.md) — gated on KTX cvars + KTX gameplay overrides.
- [SCHEMA.md doc-style inconsistency](docs/superpowers/parking/2026-04-29-schemamd-style-refresh.md) — per-table body refresh + topical-vs-per-version style decision.
- [L1-alpha: Ecosystem-tools registry](docs/superpowers/parking/2026-04-29-l1-alpha-ecosystem-tools.md) — Pass 3 carry-forward.
- [L1-beta: Cross-format binary fingerprinting](docs/superpowers/parking/2026-04-29-l1-beta-cross-format-fingerprinting.md) — Pass 3 carry-forward.
- [L1-gamma: Engine helpdoc / data-file recognition](docs/superpowers/parking/2026-04-29-l1-gamma-helpdocs.md) — Pass 3 carry-forward.
- [L1-delta: Stock asset catalog](docs/superpowers/parking/2026-04-29-l1-delta-stock-pak.md) — Pass 3 carry-forward.

### Recently opened (this session)
- (none — catch-all section for items added during this wrap-up; triaged into the right section next session.)

---

## Synthesis-report numerical-claim provenance gap (2026-04-29)

[paste the existing inline body verbatim from current HANDOVER lines 111-131]

---

## ezquake variables-ast.json non-determinism (2026-04-29)

[paste from current HANDOVER lines 133-165]

---

## extract-tag CLI quality-of-life issues (2026-04-29)

[paste from current HANDOVER lines 167-183]

---

## Semantic-pass abbreviation-bridge heuristic

[paste from current HANDOVER lines 472-522]

---

## qw-oracle DEVELOPMENT.md missing

[paste from current HANDOVER lines 779-823]

---

## `-nopriority` cmdline_param recovery (Windows SDK stubs)

**Added:** 2026-04-25 (split from "Layer 1 doc_only audit closed" retrospective during 2026-04-29 docs-system-redesign migration).
**Status:** Open. One row remains unrecovered. Bundled with "Sub-pattern 2b: cmdline variant-matrix gaps" — same SDK-stubs solve.
**Verification first:** `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT COUNT(*) FROM entities WHERE project='ezquake' AND type='cmdline_param' AND name='-nopriority'"` should return `0` (entity doc_only / not source-recovered).

### What's missing

`-nopriority` cmdline_param at `research/repos/ezquake-source/src/sv_sys_win.c:645` remains unrecovered after the Layer 1 doc_only audit closure. The 4-variant parse architecture (Item A) is sound and reaches the file, but `sv_sys_win.c`'s `Sys_Init` function body references Windows SDK types (`VER_PLATFORM_WIN32_NT`, `GetCurrentProcess()`, `SetPriorityClass`, `HIGH_PRIORITY_CLASS`) via `#include <mmsystem.h>` and `<winsock2.h>` — headers not present in the Linux libclang environment. The Sys_Init body refuses to parse cleanly past the SDL.h / winsock2.h errors, so the COM_CheckParm at line 645 is never visited.

### Recovery options when this becomes pressure

1. **Stub Windows SDK headers.** A minimal directory of empty/declarative `.h` files for winsock2, mmsystem, SDL, etc. at `research/repos/ezquake-source/win-sdk-stubs/`, added to `clang_args_win_for` via `-I`. Adds env complexity; unblocks parsing of all Windows-specific TUs in one go.
2. **Hand-register the row in `help_cmdline_params.json`** upstream and treat Linux-side extraction as silent on Windows-SDK-dependent call sites.
3. **Source refactor upstream** — split Sys_Init so the COM_CheckParm call isn't intertwined with Windows-SDK type usage. Unlikely.

### Pressure

Low. Deferred until MVDSV or FTE hits the same wall — then solve in one place. Bundle with the "Sub-pattern 2b: cmdline variant-matrix gaps" sidequest.

### Related

- Origin: Layer 1 doc_only audit closure 2026-04-25 (now in `apps/qw-oracle/docs/arc-history.md`).
- Companion sidequest: "Sub-pattern 2b: cmdline variant-matrix gaps" (2 ezQuake + 11 QWCL entries on same solve).
- Source citation: `research/repos/ezquake-source/src/sv_sys_win.c:645`.
```

The placeholder `[paste ... verbatim from current HANDOVER lines X-Y]` markers in the skeleton above mean: read the current HANDOVER's body for that section and copy it as-is into the new HANDOVER, preserving the H2 title and all sub-sections. Use Read with offset/limit, then paste into the Write call.

Verify before saving: every index entry in "Small followups" maps to an inline H2 section below; every index entry in "Ongoing arcs" / "Future arcs" maps to a parking file that exists. Sidequests have NO body (one-liner only). Shipped retrospectives are NOT in the index.

- [ ] **Step 2: Verify after writing**

Run: `wc -l /home/paradoks/projects/quakeworld/HANDOVER.md`
Expected: ≤ 300 lines (acceptance per spec line 210).

Run: `grep -cE "^## " /home/paradoks/projects/quakeworld/HANDOVER.md`
Expected: ~7 H2 sections (1 "Open items" header + 6 small-followup body sections).

Run: `grep -cE "^### " /home/paradoks/projects/quakeworld/HANDOVER.md`
Expected: 5 H3 sub-sections in the Open items index (Small followups / Sidequests / Ongoing arcs / Future arcs / Recently opened).

Run: `grep -nE "Wrap-up split brainstorm" /home/paradoks/projects/quakeworld/HANDOVER.md`
Expected: no output. The brainstorm entry is resolved by this spec and removed entirely.

- [ ] **Step 3: Verify all parking-file links resolve**

Run: `grep -oE "docs/superpowers/parking/[a-zA-Z0-9-]+\.md" /home/paradoks/projects/quakeworld/HANDOVER.md | sort -u | while read p; do test -f "/home/paradoks/projects/quakeworld/$p" && echo "OK: $p" || echo "MISSING: $p"; done`
Expected: every line says `OK:`. Any `MISSING:` is a broken link to fix before commit.

- [ ] **Step 4: Commit the HANDOVER restructure + arc-history append in one commit**

```bash
git -C /home/paradoks/projects/quakeworld add HANDOVER.md apps/qw-oracle/docs/arc-history.md
git -C /home/paradoks/projects/quakeworld commit -m "$(cat <<'EOF'
docs(handover): migrate to docket shape per docs-redesign spec Plan 3

1615 lines → ~280. Five-section index (small followups / sidequests /
ongoing arcs / future arcs / recently opened). Arc bodies live in
docs/superpowers/parking/; shipped retrospectives live in each
project's arc-history.md (qw-oracle's gets a Layer 1 doc_only audit
entry). Small followup bodies stay inline. Sidequests are one-liners.

Resolves: Wrap-up split brainstorm (2026-04-29) HANDOVER entry —
this commit IS the resolution.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 20: Update MEMORY.md pending-count pointer

**Files:**
- Modify: `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/MEMORY.md`

The MEMORY.md anchor that references HANDOVER.md should reflect the new pending count.

- [ ] **Step 1: Read MEMORY.md anchor**

Run: `grep -n -i "Open handover items\|HANDOVER" /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/MEMORY.md`
Expected: line in the `## Anchors` section that points at HANDOVER.

- [ ] **Step 2: Update the line to reflect the new structure**

The current line:
> - **[Open handover items](/home/paradoks/projects/quakeworld/HANDOVER.md)** — active backlog, check at session start. Categorized index in the file's `## Open items` section.

Update to:

> - **[Open handover items](/home/paradoks/projects/quakeworld/HANDOVER.md)** — active backlog, check at session start. Five-section docket: small followups (inline), sidequests (one-liners), ongoing/future arcs (linked to `docs/superpowers/parking/`), recently opened. Shipped retrospectives are NOT here — see each project's `arc-history.md`.

- [ ] **Step 3: Verify**

Run: `grep "Open handover items" /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/MEMORY.md`
Expected: line updated.

- [ ] **Step 4: No commit (memory dir is not under monorepo git tracking).**

The memory dir at `~/.claude/projects/.../memory/` lives under the user's home, separate from the monorepo. Edit lands without a commit step.

### Task 21: Plan 3 acceptance verification

**Files:**
- Modify: none (verification step)

- [ ] **Step 1: Acceptance per spec lines 207-212**

Run: `ls /home/paradoks/projects/quakeworld/docs/superpowers/parking/ | wc -l`
Expected: ~16-20 files (one per ongoing/future arc + README + optional death-rules stub).

Run: `wc -l /home/paradoks/projects/quakeworld/HANDOVER.md`
Expected: ≤ 300 lines.

Run: `grep -cE "^## " /home/paradoks/projects/quakeworld/HANDOVER.md`
Expected: ~7 H2 sections (1 index header + 6 small-followup bodies).

Run: `ls /home/paradoks/projects/quakeworld/apps/qw-oracle/docs/arc-history.md`
Expected: exists (was 87 lines, now ~95-100).

Run: `for proj in slipgate-app quad qw-stats matchscheduler; do test -f /home/paradoks/projects/quakeworld/apps/$proj/docs/arc-history.md && echo "$proj: exists" || echo "$proj: not bootstrapped (correct per spec)"; done`
Expected: each one says "not bootstrapped" — only qw-oracle has arc-history.md, per spec rule.

- [ ] **Step 2: Spot-check one parking file end-to-end**

Pick `docs/superpowers/parking/2026-04-28-slipgate-managed-mode.md`.

Run: `head -10 /home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-28-slipgate-managed-mode.md`
Expected: H1 title + `**Added:**` line + `**Status:**` line per HANDOVER's existing template.

Run: `grep -c "^### " /home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-04-28-slipgate-managed-mode.md`
Expected: non-zero (has body sub-sections).

- [ ] **Step 3: Verify no orphan index entries in HANDOVER**

For each link in the new HANDOVER index, follow it. Inline anchors (small followups) should resolve to a `## ` body in the same file. Parking file links should resolve to existing files in `docs/superpowers/parking/`.

Run: `grep -oE "\[[^]]+\]\(#[a-z0-9-]+\)" /home/paradoks/projects/quakeworld/HANDOVER.md | head`
Expected: shows the inline-anchor links.

Run: `grep -oE "\(#([a-z0-9-]+)\)" /home/paradoks/projects/quakeworld/HANDOVER.md | sed 's/[()#]//g' | while read anchor; do grep -qE "^## .*$anchor|^## " /home/paradoks/projects/quakeworld/HANDOVER.md && echo "OK: $anchor" || echo "MISSING: $anchor"; done | head -20`
Expected: all OK. (This grep is approximate — the operator should also visually scan that the slug-form anchors match the body section titles.)

### Task 22: Final Session A report

**Files:**
- Modify: none

- [ ] **Step 1: Push the session's commits**

```bash
git -C /home/paradoks/projects/quakeworld push origin main
```

- [ ] **Step 2: Print summary report**

Report shape (free-form, to operator):

```
Session A complete. Plans 1-3 shipped.

Plan 1 — Doctrine update:
  - doc-philosophy.md: Principle 0 added; Principle 2 + 3 updated.
  - doc-template.md: OVERVIEW.md section rewritten with litmus test.
  - Files live under ~/.claude/, not in the monorepo git tree.

Plan 2 — OVERVIEW.md fleet slim:
  - slipgate-app/docs/OVERVIEW.md: 461 → <X> lines
  - qw-oracle/OVERVIEW.md: 252 → <X>
  - quad/OVERVIEW.md: 241 → <X>
  - root /OVERVIEW.md: 199 → <X>
  - qw-stats/OVERVIEW.md: 130 → <X> (or unchanged)
  - matchscheduler/OVERVIEW.md: 97 → <X> (or unchanged)
  - slipgate-app/OVERVIEW.md: 70 → <X>  (or unchanged)
  - packages/qw-knowledge/OVERVIEW.md: 55 → <X>  (or unchanged)
  - packages/qw-version-resolution/OVERVIEW.md: 54 → <X>  (or unchanged)
  - All ≤ 150 lines acceptance: PASS.

Plan 3 — HANDOVER docket migration:
  - HANDOVER.md: 1615 → <X> lines (target ≤300)
  - Parking files created: <N> ongoing + <M> future + 1 README
  - Shipped retrospectives migrated: 3 (Zero-debt and Map knowledge already in arc-history; Layer 1 doc_only audit added)
  - Sidequests added: matchscheduler doc system reconciliation (per Plan 2 special case)
  - Resolved: "Wrap-up split brainstorm (2026-04-29)" entry (this work IS the resolution).
  - MEMORY.md anchor line updated.

Session B (Plans 4 + 5) is the next focused session — fresh context recommended per spec line 357 ("rewriting a skill while the skill is supposed to keep working risks self-modification race conditions").
```

- [ ] **Step 3: Done.**

---

## Self-review notes (for plan-writer use only — execution can ignore)

**Spec coverage check:** Every Plan 1-3 acceptance criterion has a verification step in this plan (Tasks 4, 13, 21). Plan 1's three criteria (Principle 0, template OVERVIEW.md rewrite, both files committed) → covered in Task 4. Plan 2's four criteria (≤150 lines, no walkthroughs, no catalogs, attestation preserved) → covered in Task 13. Plan 3's four criteria (parking dir, docket shape, ≤300 lines, no inline arc bodies, arc-history exists per project that ships) → covered in Task 21.

**Pre-classification table coverage:** All 35 HANDOVER H2 anchors classified in Tasks 16-19 (4 ongoing arcs in Task 16; 12-15 future arcs in Task 17; 6 small followups + 8 sidequests inline in Task 19; 3 shipped retrospectives via Task 18 + Task 19's deletion-from-HANDOVER; 1 deletion = Wrap-up split brainstorm). Death rules orphan caught in Task 15.

**Litmus test guidance:** Task 5 spells out which sections in the slipgate-app docs/OVERVIEW.md fail vs pass — concrete enough that a subagent doesn't re-derive. Tasks 6-8 reuse the same method without re-spelling.

**Task ordering:** Plan 1 → Plan 2 → Plan 3 matches spec sequencing. Within Plan 3, parking-dir creation (Task 14) → parking-file population (Tasks 16-17) → arc-history append (Task 18) → HANDOVER restructure (Task 19) → MEMORY pointer (Task 20) → verification (Task 21). All dependencies satisfied.

**No placeholders:** All "[paste from HANDOVER lines X-Y]" markers in Task 19 are explicit instructions about what to read and what to write — not "TBD". Subagent reads + pastes mechanically.

**Type consistency:** Parking file naming convention (`YYYY-MM-DD-<topic>.md`) consistent across Tasks 16-17. arc-history.md prepend-on-top convention consistent in Task 18. HANDOVER docket structure consistent between Task 19's skeleton and Task 21's verification.
