---
Doc type: current - Phase 2 implementation plan. Delete/archive once all tasks land.
---

# Monorepo Doc Philosophy - Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the monorepo-root doc scaffolding from the 2026-04-11 doc philosophy spec - philosophy skill files, root quartet (README/VISION/OVERVIEW), slim root CLAUDE.md, contracts README, and HANDOFF cleanup.

**Architecture:** Follow the template approved in Phase 1. Philosophy skill files copy verbatim from vikpe's slipgate web repo. Root quartet creates fresh content tailored to the monorepo's workshop framing. Root CLAUDE.md slims by moving integration content to OVERVIEW and project map content to README; workflow rules stay inline (trimmed); philosophy skills get `@import`ed; output discipline rules land inline.

**Tech Stack:** Markdown only. No code, no build, no tests. Verification is content-level (file existence, header presence, cross-reference integrity, line counts).

**Source of truth:**
- `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md` - approved spec
- `~/.claude/skills/docs-check/references/doc-template.md` - the Phase 1 template menu (what belongs in each doc type)
- `~/.claude/skills/docs-check/references/doc-philosophy.md` - the Phase 1 doctrine

**Clarifications from planning discussion (2026-04-11):**
- Philosophy files: copy verbatim from `research/repos/slipgate/llm/skills/` with a 1-line attribution header. Do not adapt.
- CLAUDE.md line count: lean, not militant. 100-150 lines is fine if content is honest.
- Workflow rules (Planning First / Bug Triage / Testing Philosophy / Security / Git): stay inline in root CLAUDE.md, trimmed where obvious.
- `people/README.md` is deferred (will be a later session).
- `packages/qw-knowledge/README.md` and `packages/qw-config/README.md` are lazy per spec - NOT in this plan.
- Per-app quartet migrations (slipgate-app README, quad/qw-stats/qw-oracle full quartets) are lazy per spec - NOT in this plan.

**Out of scope:**
- `people/README.md` (deferred by user)
- `packages/*/README.md` files (lazy per spec)
- Per-app migration (lazy per spec)
- Slimming per-app CLAUDE.md files (explicit spec non-goal: "Don't slim the other apps' CLAUDE.md files")
- Writing/adopting `docs-check` skill changes (landed in Phase 1)

---

## File structure

| Path | Status | Purpose |
|---|---|---|
| `/home/paradoks/projects/quakeworld/.claude/skills/philosophy/grug-brain.md` | Create | Copy of vikpe's grug-brain skill with attribution header. Monorepo-scoped philosophy doc loaded via `@import` from root CLAUDE.md. |
| `/home/paradoks/projects/quakeworld/.claude/skills/philosophy/philosophy-of-software-design.md` | Create | Copy of vikpe's philosophy-of-software-design skill with attribution header. Same loading pattern. |
| `/home/paradoks/projects/quakeworld/README.md` | Create | Monorepo elevator pitch. Answers "what is this repo, who is it for" for humans and cold Claude sessions. ~60-120 lines. |
| `/home/paradoks/projects/quakeworld/VISION.md` | Create | Why the monorepo exists as a container. Workshop framing. Extract key decisions from HANDOFF.md before it's deleted. ~80-150 lines. |
| `/home/paradoks/projects/quakeworld/OVERVIEW.md` | Create | Living map of the monorepo. Integration diagram, one paragraph per app, packages, contracts pointer, shared infrastructure references. ~150-250 lines. |
| `/home/paradoks/projects/quakeworld/contracts/README.md` | Create | Index for `active/` and `completed/` cross-project specs + pointer to CROSS-PROJECT-SCHEMA.md. ~30-60 lines. |
| `/home/paradoks/projects/quakeworld/CLAUDE.md` | Rewrite | Slim to lean core: status header, How We Work (trimmed), Where to find things, Output discipline, `@imports` for philosophy. Move project map / integration / shared infra content OUT to README+OVERVIEW. Currently 166 lines; target ~100-140 after slim. |
| `/home/paradoks/projects/quakeworld/HANDOFF.md` | Delete | Stale 2026-03-29 migration brief. Key context migrates to VISION.md before deletion. |
| `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_doc_philosophy.md` | Modify | Append "Phase 2 landed 2026-04-11" status block. |

---

## Task 1: Copy philosophy skill files

**Files:**
- Create: `.claude/skills/philosophy/grug-brain.md`
- Create: `.claude/skills/philosophy/philosophy-of-software-design.md`

**Purpose:** Lay down the two mindset documents the spec names. These are monorepo-scoped (not user-global) so a fresh clone of the repo brings them along. They will be `@import`ed from root CLAUDE.md in Task 6.

**Content source:** Copy verbatim from vikpe's slipgate web repo at `research/repos/slipgate/llm/skills/grug-brain.md` and `research/repos/slipgate/llm/skills/philosophy-of-software-design.md`. Both files are ~100 lines each and self-contained.

**Attribution header** (required, add at the top of each file before the existing title):

```markdown
> Adapted from vikpe's slipgate web repo (`research/repos/slipgate/llm/skills/`). Source content copied verbatim on 2026-04-11. Update from the upstream source rather than editing in place when the source changes.

```

Leave the original title line and the rest of the content untouched.

- [ ] **Step 1: Create the directory**

```bash
mkdir -p /home/paradoks/projects/quakeworld/.claude/skills/philosophy
```
Expected: no output, directory exists.

- [ ] **Step 2: Copy grug-brain.md with attribution**

Read `research/repos/slipgate/llm/skills/grug-brain.md` via the Read tool. Use the Write tool to create `/home/paradoks/projects/quakeworld/.claude/skills/philosophy/grug-brain.md` with:
1. The attribution blockquote above
2. A blank line
3. The complete verbatim content of the source file

- [ ] **Step 3: Copy philosophy-of-software-design.md with attribution**

Same pattern as Step 2. Source: `research/repos/slipgate/llm/skills/philosophy-of-software-design.md`. Destination: `/home/paradoks/projects/quakeworld/.claude/skills/philosophy/philosophy-of-software-design.md`.

- [ ] **Step 4: Verify both files**

```bash
ls -la .claude/skills/philosophy/
wc -l .claude/skills/philosophy/*.md
head -3 .claude/skills/philosophy/grug-brain.md
head -3 .claude/skills/philosophy/philosophy-of-software-design.md
```

Expected:
- Both files listed.
- Line counts: grug-brain.md between 100 and 130 lines; philosophy-of-software-design.md between 55 and 80 lines (source sizes + 2 extra lines for attribution).
- First non-blank line of each file is the `> Adapted from vikpe's...` attribution block.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add .claude/skills/philosophy/grug-brain.md .claude/skills/philosophy/philosophy-of-software-design.md
git commit -m "$(cat <<'EOF'
docs(philosophy): adopt vikpe's grug-brain + ousterhout skills

Monorepo-scoped mindset docs, copied verbatim from
research/repos/slipgate/llm/skills/. Will be @imported from root
CLAUDE.md in the next commit. Attribution header added so the
source is findable if upstream changes.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Write monorepo-root README.md

**Files:**
- Create: `/home/paradoks/projects/quakeworld/README.md`

**Purpose:** The elevator pitch. Answers "what is this repo, who is it for" in one scroll. Humans and cold Claude sessions landing on the repo read this first. Points to VISION for intent, OVERVIEW for the map, CLAUDE.md for rules.

**Target length:** 60-120 lines.

**Required sections (in order):**

1. **`# QuakeWorld Monorepo`** - title
2. **One-line identity + status badge** - "Workshop monorepo for the QuakeWorld community. Five apps under active development. **Status: Active.**"
3. **`## What's in here`** - Short bullet list of the 5 apps with their one-line identity. Pull wording from existing per-app descriptions. Each line: **app name** — one-line description with tech stack.
4. **`## How it fits together`** - One paragraph describing that these apps share QW Hub data and a Firebase project, and that the integration diagram lives in `OVERVIEW.md`.
5. **`## Using this repo`** - Three pointers:
   - `VISION.md` - why this monorepo exists, its framing as a workshop, what it's converging toward
   - `OVERVIEW.md` - the current map: integration diagram, per-app status, packages, contracts
   - `CLAUDE.md` - always-on rules for Claude sessions working in this repo
6. **`## Working with Claude`** - One short paragraph acknowledging the repo is optimized for Claude-assisted development, pointing to `CLAUDE.md` for session rules and `~/.claude/skills/docs-check/` for the wrap-up ritual. Mention `docs-check` specifically because it's the session-end discipline that keeps docs honest.
7. **`## License / ownership`** - One line. ParadokS maintains this monorepo. Individual apps may have their own license terms (point to per-app README when it exists).

**Voice guidance:** Match vikpe's slipgate-web CLAUDE.md voice - direct, ASCII only, no marketing fluff, no em dashes. Two-line paragraphs max. Hyphen-minus for dashes.

**Content sources to pull from:**
- `CLAUDE.md` (current, 166 lines) - Project Map section has the 5-app list with one-liners. Use those.
- `apps/*/CLAUDE.md` - cross-check each app's identity line matches the current root CLAUDE.md

**Hard constraints:**
- ASCII only (no em dashes, smart quotes, Unicode)
- No `**Doc type:**` frontmatter tag (this is the root README, not under `docs/`)
- No emojis unless the user adds them later

- [ ] **Step 1: Draft the sections outline**

Before writing, list the 5 apps and their one-liners (from current root CLAUDE.md lines 60-76):
- matchscheduler — Firebase web app (vanilla JS, Alpine.js, Tailwind)
- quad — Discord voice recording bot (TypeScript, discord.js)
- qw-stats — Stats API + ranking research (Express, PostgreSQL)
- slipgate-app — Desktop companion (Tauri v2, SolidJS, Rust)
- qw-oracle — Community knowledge base (Node.js, SQLite)

- [ ] **Step 2: Write README.md**

Use the Write tool at `/home/paradoks/projects/quakeworld/README.md`. Implement the 7 required sections. Keep it lean.

- [ ] **Step 3: Verify structure**

```bash
wc -l README.md
grep -E '^##? ' README.md
```

Expected:
- Line count: 60-120
- Headings (exactly): `# QuakeWorld Monorepo`, `## What's in here`, `## How it fits together`, `## Using this repo`, `## Working with Claude`, `## License / ownership`

- [ ] **Step 4: Verify the file is pure ASCII**

```bash
python3 -c "
with open('README.md', 'rb') as f:
    content = f.read()
non_ascii = [(i, b) for i, b in enumerate(content) if b > 127]
if non_ascii:
    print(f'FOUND {len(non_ascii)} non-ASCII bytes. First 5 positions+bytes: {non_ascii[:5]}')
    raise SystemExit(1)
print('OK - ASCII clean')
"
```

Expected: `OK - ASCII clean`. If non-ASCII bytes found, open the file at those byte positions and replace with ASCII equivalents (em dash U+2014 -> hyphen-minus `-`, smart quotes -> regular quotes, Unicode box-drawing -> ASCII box art using `+`, `-`, `|`).

---

## Task 3: Write monorepo-root VISION.md

**Files:**
- Create: `/home/paradoks/projects/quakeworld/VISION.md`

**Purpose:** Answers "why does this monorepo exist?" It is about the *monorepo as a container*, not about any individual app's vision. Each app gets its own VISION.md lazily.

**Target length:** 80-150 lines.

**Key framing (from `HANDOFF.md` and `project_doc_philosophy.md` memory):**
- Workshop framing: the monorepo is NOT the final home for all apps. It is a workshop where projects incubate. Some apps will eventually graduate to vikpe's slipgate-web repo (quad, slipgate-app are mentioned as candidates). matchscheduler will be rebuilt inside slipgate-web in SolidJS.
- No git history preserved when apps were merged in (2026-03-29 migration). Forward velocity over archaeology.
- Solo developer (ParadokS) + Claude as engineer. Optimized for Claude's navigation, not for a team.
- Monorepo exists because the 5 apps share QW Hub data, Firebase infrastructure, and cross-app contracts. Keeping them in one repo makes cross-project coordination trivial.

**Required sections (in order):**

1. **`# Vision - QuakeWorld Monorepo`** - title
2. **`## What this is`** - One paragraph. "A workshop monorepo where five QuakeWorld community apps share Claude sessions, shared data schemas, and cross-project contracts. Not the final home - some apps will graduate to the slipgate web repo eventually."
3. **`## Why a monorepo`** - Bullet list of reasons:
   - Shared Firebase project (`matchscheduler-dev`) means Firestore collections and Storage paths cross app boundaries and need one source of truth
   - Shared QW Hub API and ktxstats consumption across multiple apps
   - Cross-project contracts (voiceRecordings, standin_requests, etc.) need a shared home
   - Claude sessions benefit from being able to explore and edit all five apps from a single working directory
   - Solo developer maintaining all five apps - context switching is cheaper when everything is in one place
4. **`## Who it's for`** - Short paragraph. ParadokS as product owner and vibe coder. Claude as the engineer doing most of the keyboard work. Anthropic's Claude Code harness is the runtime.
5. **`## Graduation paths`** - Bullet list. Which apps are expected to graduate, which stay workshop-only, and why:
   - **slipgate-app** - candidate to graduate to slipgate-web repo eventually (as the desktop companion to the web hub). Currently active, most of the day-to-day work happens here.
   - **quad** - candidate to graduate. Stable, integration-critical, Discord bot with a clear boundary.
   - **matchscheduler** - will NOT graduate as-is. Will be rebuilt inside slipgate-web in SolidJS. Effective-legacy today.
   - **qw-stats** - uncertain graduation. The production API (Unraid-deployed) is useful today; the ranking research half is stalled. Paused.
   - **qw-oracle** - workshop-only for now. Idea-stage community knowledge base. Paused.
6. **`## What this repo is NOT`** - Non-goals as bullets:
   - Not a production monorepo in the "everyone clones this to build" sense - it's a solo workshop
   - Not the final home for graduated apps - slipgate-web supersedes it for web-destined work
   - Not a multi-contributor repo with formal processes (no CODE_OF_CONDUCT, no PR templates, no issue templates)
   - Not a historical archive - git history starts at 2026-03-29 migration
7. **`## Values and philosophy`** - Short list of the values this monorepo is built around:
   - Docs optimized for Claude's navigation, not for a bookshelf
   - Planning-first workflow enforced in `CLAUDE.md`
   - Vibe coding is legitimate - guardrails should work with the style, not against it
   - Git is history breadcrumbs, not ceremony
   - Philosophy skills (grug-brain, Ousterhout) are adopted as always-on mindset - see `.claude/skills/philosophy/`

**Content sources to pull from:**
- `HANDOFF.md` - particularly the "Key Decisions Made" section (lines 111-130). Migrate those decisions into this file BEFORE deleting HANDOFF in Task 7.
- `project_doc_philosophy.md` memory file - the principles section
- `project_monorepo.md` memory file - the workshop framing

**Hard constraints:**
- ASCII only
- Do NOT duplicate OVERVIEW.md content (feature lists, integration diagram) - this file is about WHY, not WHAT
- Do NOT duplicate per-app vision content - that belongs in each app's own eventual VISION.md

- [ ] **Step 1: Re-read HANDOFF.md key decisions section**

Use the Read tool on `/home/paradoks/projects/quakeworld/HANDOFF.md`, focusing on lines 111-130. Note which decisions still apply today and which have been superseded.

- [ ] **Step 2: Write VISION.md**

Use the Write tool at `/home/paradoks/projects/quakeworld/VISION.md`. Implement the 7 required sections. Keep it focused on WHY, not WHAT.

- [ ] **Step 3: Verify structure**

```bash
wc -l VISION.md
grep -E '^##? ' VISION.md
```

Expected:
- Line count: 80-150
- Headings: `# Vision - QuakeWorld Monorepo`, `## What this is`, `## Why a monorepo`, `## Who it's for`, `## Graduation paths`, `## What this repo is NOT`, `## Values and philosophy`

- [ ] **Step 4: Verify no em dashes**

Run the same ASCII-check from Task 2 Step 4 but with `VISION.md` as input. Expected: `OK - ASCII clean`.

---

## Task 4: Write monorepo-root OVERVIEW.md

**Files:**
- Create: `/home/paradoks/projects/quakeworld/OVERVIEW.md`

**Purpose:** The living map of the monorepo. Answers "what's in this monorepo right now, and how does it fit together?" This is the file Claude reads when returning to the monorepo and needing to orient itself on current state.

**Target length:** 150-250 lines.

**Required sections (in order):**

1. **`# QuakeWorld Monorepo - Overview`** - title
2. **Orientation paragraph** - "What this document is: the living map of what's actually in this monorepo right now. If you want to know why it exists, see `VISION.md`. If you want the rules for working here, see `CLAUDE.md`. When in doubt, the code is the source of truth; this is the map."
3. **`## The five apps`** - One subsection per app. Each subsection has:
   - `### <app-name>` heading with the app's one-line identity
   - Status (Active / Maintenance / Paused / Legacy / Planning) pulled from `project_doc_philosophy.md` memory
   - 2-3 sentences on what the app does and where it lives in `apps/<name>/`
   - A pointer line: "Full context: `apps/<name>/CLAUDE.md`" (and the app's OVERVIEW.md if one exists, which is only true for slipgate-app today)
4. **`## Integration map`** - Redraw the integration diagram from current root `CLAUDE.md` lines 80-103 **in pure ASCII box art** (using `+`, `-`, `|`, `v`, `>` instead of the Unicode box-drawing characters `┌─┐│▼` in the current file - those violate the output discipline rule). Preserve the topology exactly: QW Hub API (Supabase) feeds match history into quad and ktxstats into qw-stats; quad and qw-stats both write to Firestore / Postgres; MatchScheduler reads from both. Add one-sentence preamble: "How the apps share data." Example of acceptable ASCII box art:

```
    +------------------+
    | QW Hub (Supabase)|
    +--------+---------+
             |
       +-----+-----+
       |           |
       v           v
    +------+   +--------+
    | quad |   |qw-stats|
    +--+---+   +---+----+
       |           |
       +-----+-----+
             v
    +--------+--------+
    | MatchScheduler  |
    +-----------------+
```
Exact layout is the implementer's call as long as the topology is right and all characters are ASCII.
5. **`## Shared Firestore collections`** - Move the table from current root `CLAUDE.md` lines 105-111 verbatim. Add a pointer line to `contracts/CROSS-PROJECT-SCHEMA.md` for the detailed contract.
6. **`## Shared Firebase Storage`** - Move the table from current root `CLAUDE.md` lines 113-118 verbatim.
7. **`## Packages`** - One section per shared package:
   - `### qw-knowledge` - "Shared QW domain knowledge: maps, terminology, strategies, player mappings. Consumed by quad and potentially slipgate-app. No README yet; will be written lazily when next touched."
   - `### qw-config` - "Shared cvar definitions database for ezQuake and FTE. Consumed by slipgate-app's ConfigViewer. No README yet; will be written lazily when next touched."
8. **`## Contracts and cross-project specs`** - Short section pointing to `contracts/README.md` (which Task 5 creates) for the index of active and completed cross-project specs. Also mention `CROSS-PROJECT-SCHEMA.md` as the authoritative data-shape contract.
9. **`## Shared infrastructure`** - Quick pointers (not deep content):
   - QW Hub API at `hub.quakeworld.nu` - Supabase REST + ktxstats CDN, read-only
   - Firebase project `matchscheduler-dev` - shared between matchscheduler and slipgate-app
   - The `deploy` skill - invoke with "deploy" or `/deploy` for deployment details across apps
10. **`## Tooling and docs infrastructure`** - Quick pointers:
    - `.claude/skills/philosophy/` - always-loaded mindset docs (grug-brain, Ousterhout)
    - `~/.claude/skills/docs-check/` - session-end doc-check ritual (user-global, lives outside the monorepo)
    - `docs/superpowers/specs/` - approved design specs (one per major feature)
    - `docs/superpowers/plans/` - implementation plans derived from specs
11. **`## What this doc intentionally does NOT cover`** - Short bullet list with pointers:
    - Per-app feature details -> each app's own `docs/OVERVIEW.md` (slipgate-app has one; others will have theirs written lazily)
    - Why any of this exists -> `VISION.md`
    - Session rules -> `CLAUDE.md`
    - Deploy details -> the `deploy` skill / per-app `DEPLOYMENT.md`

**Content sources to pull from:**
- Current root `CLAUDE.md` (166 lines) - project map, integration diagram, shared Firestore / Storage tables. Copy the tables verbatim (they are already ASCII); redraw the integration diagram in ASCII box art per the topology described above. Do this before Task 6 removes these sections from CLAUDE.md.
- `project_doc_philosophy.md` memory - lifecycle status for each app (slipgate-app=Active, matchscheduler=Maintenance, quad=Maintenance, qw-stats=Paused, qw-oracle=Paused)
- `apps/slipgate-app/docs/OVERVIEW.md` - voice example for how to write an overview (plain English, concrete file paths, no marketing fluff)

**Hard constraints:**
- ASCII only - **this includes redrawing the integration diagram** in ASCII box art (the current version in root CLAUDE.md uses Unicode box-drawing characters which violate the output discipline)
- Do NOT include every feature of every app - one paragraph per app is enough
- Do NOT duplicate VISION content (why) - focus on WHAT and WHERE

- [ ] **Step 1: Re-read current root CLAUDE.md integration content**

Use the Read tool on `/home/paradoks/projects/quakeworld/CLAUDE.md` focused on lines 57-118 (Project Map through Shared Firebase Storage). Copy the exact content you will port over.

- [ ] **Step 2: Write OVERVIEW.md**

Use the Write tool at `/home/paradoks/projects/quakeworld/OVERVIEW.md`. Implement the 11 sections above. Redraw the integration diagram in ASCII box art (see Section 4 above for the topology and example). Copy the Firestore / Storage tables verbatim from the current root `CLAUDE.md` - those are already ASCII.

- [ ] **Step 3: Verify structure**

```bash
wc -l OVERVIEW.md
grep -c '^## ' OVERVIEW.md
grep -c '^### ' OVERVIEW.md
```

Expected:
- Line count: 150-250
- `^## ` count: 10 (10 Level-2 section headings, since `# QuakeWorld Monorepo - Overview` is Level-1)
- `^### ` count: at least 7 (5 apps + 2 packages + possibly more)

- [ ] **Step 4: Verify integration diagram is intact**

```bash
grep -c 'QW Hub API' OVERVIEW.md
grep -c 'MatchScheduler' OVERVIEW.md
```

Expected: Both >= 1. If the diagram got dropped, restore it.

- [ ] **Step 5: Verify no em dashes**

Run the ASCII-check from Task 2 Step 4 against `OVERVIEW.md`. Expected: `OK - ASCII clean`.

- [ ] **Step 6: Commit README + VISION + OVERVIEW together**

```bash
git add README.md VISION.md OVERVIEW.md
git commit -m "$(cat <<'EOF'
docs(root): add monorepo quartet (README + VISION + OVERVIEW)

First three of the root-level Layer 1 quartet from the doc
philosophy spec. README is the elevator pitch, VISION is the
workshop framing, OVERVIEW is the living map with the integration
diagram and per-app status. CLAUDE.md slim follows in the next
commit.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Write contracts/README.md

**Files:**
- Create: `/home/paradoks/projects/quakeworld/contracts/README.md`

**Purpose:** Index for the cross-project spec directory. The spec section on the cross-project doc layer calls this out explicitly. Not a deep doc - just an index.

**Target length:** 30-60 lines.

**Required sections (in order):**

1. **`# Cross-project contracts`** - title
2. **Orientation paragraph** - "This directory holds cross-project design specs and data contracts. Active work lives in `active/`; shipped work is archived in `completed/`. The monorepo-wide data contract (shared Firestore collections and Storage paths) lives in `CROSS-PROJECT-SCHEMA.md`."
3. **`## Active`** - Bulleted list of files currently in `contracts/active/`:
   - `UNIFIED-AUTO-RECORD-CONTRACT.md` - one-line summary (read the file for its purpose)
   - `UNIFIED-AUTO-RECORD-LAUNCH.md` - one-line summary
4. **`## Completed`** - Bulleted list of files currently in `contracts/completed/`:
   - `AVAILABILITY-ENHANCEMENT-CONTRACT.md`
   - `COMMUNITY-SERVER-CONTRACT.md`
   - `DISCORD-ROSTER-CONTRACT.md`
   - `MUMBLE-INTEGRATION-CONTRACT.md`
   - `RECORDING-MANAGEMENT-CONTRACT.md`
   - `SCHEDULE-CHANNEL-PRD.md`
   - `VOICE-REPLAY-CONTRACT.md`
   - (One-line summary each, pulled from the first heading of each file)
5. **`## Data contracts`** - One line pointing at `CROSS-PROJECT-SCHEMA.md` for the authoritative cross-app data shape contract.
6. **`## Adding a new contract`** - Three lines:
   - Draft in `contracts/active/<FEATURE-NAME>-CONTRACT.md`
   - When the feature ships and stabilizes, move the file to `contracts/completed/`
   - Update this README's Active and Completed sections in the same commit

**Content sources:** Read the first 5-10 lines of each file in `active/` and `completed/` to extract a one-line summary. Do not fabricate. If a file has no clear one-line summary, use its title and note "see file for detail."

- [ ] **Step 1: Read summaries of each contract file**

Use the Read tool with `limit: 15` on each of these 9 files:
- `contracts/active/UNIFIED-AUTO-RECORD-CONTRACT.md`
- `contracts/active/UNIFIED-AUTO-RECORD-LAUNCH.md`
- `contracts/completed/AVAILABILITY-ENHANCEMENT-CONTRACT.md`
- `contracts/completed/COMMUNITY-SERVER-CONTRACT.md`
- `contracts/completed/DISCORD-ROSTER-CONTRACT.md`
- `contracts/completed/MUMBLE-INTEGRATION-CONTRACT.md`
- `contracts/completed/RECORDING-MANAGEMENT-CONTRACT.md`
- `contracts/completed/SCHEDULE-CHANNEL-PRD.md`
- `contracts/completed/VOICE-REPLAY-CONTRACT.md`

For each file, extract one line describing its purpose.

- [ ] **Step 2: Write contracts/README.md**

Use the Write tool at `/home/paradoks/projects/quakeworld/contracts/README.md`. Implement the 6 sections. Use the extracted summaries from Step 1.

- [ ] **Step 3: Verify**

```bash
wc -l contracts/README.md
grep -c 'CONTRACT\|PRD' contracts/README.md
```

Expected:
- Line count: 30-60
- CONTRACT/PRD count: at least 9 (the 9 indexed files)

- [ ] **Step 4: Commit**

```bash
git add contracts/README.md
git commit -m "$(cat <<'EOF'
docs(contracts): add README index for cross-project specs

Indexes the 2 active + 7 completed contracts and points at
CROSS-PROJECT-SCHEMA.md for the data contract. Per the doc
philosophy spec's cross-project doc layer requirement.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Slim root CLAUDE.md

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/CLAUDE.md` (rewrite most of the body)

**Purpose:** Rewrite the 166-line root CLAUDE.md into a lean rules+index file. Move project map / integration / shared infra content OUT (they live in README and OVERVIEW now). Keep workflow rules (planning-first, bug triage, testing, security, git) inline but trimmed. Add the status header, Where-to-find-things table, Output discipline rules, and `@imports` for the philosophy skills.

**Target length:** 100-140 lines (lean, not militant).

**Structural skeleton (write in this order):**

```markdown
# QuakeWorld Monorepo

**Status:** Active development. Workshop monorepo hosting five QuakeWorld community apps. Solo-developer, Claude-assisted.

## Where to find things

| When you need... | Read... |
|---|---|
| Elevator pitch, what's in here | `README.md` |
| Why this monorepo exists, workshop framing, graduation paths | `VISION.md` |
| Living map: integration diagram, per-app status, packages, contracts | `OVERVIEW.md` |
| Cross-project specs index | `contracts/README.md` |
| Always-loaded mindset docs | `.claude/skills/philosophy/` (auto-imported below) |
| Session wrap-up ritual | `~/.claude/skills/docs-check/` (user-global skill) |
| Deploy any project | `deploy` skill ("deploy" or `/deploy`) |

## How We Work

### Planning First - Non-Negotiable

When I ask you to build something:
1. Read the code that will be affected FIRST - use Explore agents if needed
2. Tell me what will break or get complicated
3. Ask me the questions I'm not asking myself
4. Present a plan with specific files and changes. Don't start coding until I say "go"

If my idea conflicts with existing patterns, say so.
If the scope is bigger than I think, say so.
If there's a simpler way, say so.
Stop being agreeable. Be useful.

### Quality Standards

- Inference is a tool for directing investigation, not a substitute for it
- When results don't match expectations, verify - don't explain away the gap
- If you can't determine the cause, say so and ask for direction
- Read before writing. Explore before planning. Plan before building
- After implementation, verify the changes work - don't assume

### Bug Triage Protocol

Reproduce - Locate - Understand - Hypothesize - Verify - Fix minimally. Don't refactor around a broken thing; fix the specific failure.

### Testing Philosophy

Compile/build first. Manual verification second. Automated tests only when the project already has them or when explicitly asked. Don't add test infrastructure speculatively.

### Security

- NEVER commit .env files, service-account.json, or any file containing API keys/tokens
- If you see credentials in code, flag it immediately - don't wait to be asked
- Pre-commit scanning is configured - don't bypass it

### Git

Commit after each meaningful change, not at the end of a session. Commit messages: what changed and why, one line. Don't push unless asked.

## Per-app entry points

Each app has its own CLAUDE.md with architecture, patterns, and conventions. Read the relevant app's CLAUDE.md before working in it.

- `apps/matchscheduler/CLAUDE.md`
- `apps/quad/CLAUDE.md`
- `apps/qw-stats/CLAUDE.md`
- `apps/slipgate-app/CLAUDE.md`
- `apps/qw-oracle/CLAUDE.md`

## WSL development environment

All projects except slipgate-app run in WSL Ubuntu.

- **slipgate-app**: Source lives in WSL monorepo, builds run from Windows terminal (Tauri needs Windows toolchain for native .exe)
- **SSH keys**: WSL `~/.ssh/` - `id_rsa` (Unraid), `qwvoice_key` (Xerial)
- **Tailscale**: Required for Unraid access (100.114.81.91)
- **Firebase emulators**: MatchScheduler dev on `localhost:5000`

## Output discipline

- Answer briefly and objectively.
- Never guess - if unsure, say so.
- ASCII only in code and docs: no em dashes, smart quotes, or Unicode decorations.
- Never express emotions; no filler sentences.
- Comments explain *why*, not *what*.

(These rules apply literally in code and docs. In conversation with the user, follow the spirit - direct, honest, no filler - but a natural voice is fine. See the feedback memory `feedback_output_discipline_sentiment.md` for context.)

## Shared philosophy

@.claude/skills/philosophy/philosophy-of-software-design.md
@.claude/skills/philosophy/grug-brain.md
```

**What's removed from the old CLAUDE.md:**
- Old "Project Map" section -> moved to `README.md` and `OVERVIEW.md`
- Old "Integration Map" ASCII diagram -> moved to `OVERVIEW.md`
- Old "Shared Firestore Collections" table -> moved to `OVERVIEW.md`
- Old "Shared Firebase Storage" table -> moved to `OVERVIEW.md`
- Old "Shared Infrastructure" section (deploy skill + QW Hub API pointers) -> `deploy` skill pointer lives in the Where-to-find-things table; QW Hub API lives in `OVERVIEW.md`'s shared-infrastructure section
- Old "Community Experts" section -> removed entirely (people/ directory is deferred; add a pointer later when it exists)
- Verbose prose in Bug Triage and Testing Philosophy -> condensed to one-line summaries

**What's kept:**
- Title (expanded with Status line)
- Planning First workflow rules (kept verbatim - these are the #1 rules)
- Quality Standards bullets (verbatim)
- Bug Triage as one line
- Testing Philosophy as one paragraph
- Security bullets (verbatim, critical)
- Git bullets (verbatim)
- WSL Development Environment section (verbatim - it's the environment rule)
- Per-app CLAUDE.md pointers (simplified - just the paths, no one-liners)

**What's new:**
- `**Status:** Active development...` line
- Where to find things table (top of file)
- Output discipline section with the 5 rules
- `@import`s for the two philosophy skills (always-loaded via Anthropic's memory system)

- [ ] **Step 1: Read current root CLAUDE.md one more time**

Use the Read tool on `/home/paradoks/projects/quakeworld/CLAUDE.md`. Confirm the sections you plan to remove match what's actually there (the current file is 166 lines).

- [ ] **Step 2: Write the new CLAUDE.md**

Use the Write tool to overwrite `/home/paradoks/projects/quakeworld/CLAUDE.md` with the structural skeleton above. Preserve the Planning First / Quality Standards / Security / Git blocks verbatim from the current file where the skeleton says "(verbatim)". Trim Bug Triage and Testing Philosophy to the one-line / one-paragraph versions shown in the skeleton.

- [ ] **Step 3: Verify line count and critical content**

```bash
wc -l CLAUDE.md
grep -c '^\*\*Status:\*\*' CLAUDE.md
grep -c '@\.claude/skills/philosophy/' CLAUDE.md
grep -c 'Output discipline' CLAUDE.md
grep -c 'Planning First' CLAUDE.md
grep -c 'Where to find things' CLAUDE.md
```

Expected:
- Line count: 100-140
- `**Status:**` count: 1 (the status line near the top)
- `@.claude/skills/philosophy/` count: 2 (both `@import`s)
- `Output discipline` count: at least 1 (the section heading)
- `Planning First` count: at least 1
- `Where to find things` count: at least 1

- [ ] **Step 4: Verify the @imports point to real files**

```bash
ls .claude/skills/philosophy/grug-brain.md .claude/skills/philosophy/philosophy-of-software-design.md
```

Expected: both files listed (created in Task 1). If either is missing, fix before committing.

- [ ] **Step 5: Verify no em dashes**

Run the ASCII-check from Task 2 Step 4 against `CLAUDE.md`. Expected: `OK - ASCII clean`.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs(root): slim CLAUDE.md per doc philosophy spec

Target: lean rules-and-index file. Moves project map to README,
integration diagram and shared Firestore/Storage tables to
OVERVIEW. Keeps workflow rules inline (trimmed for Bug Triage
and Testing Philosophy). Adds Status header, Where-to-find-things
table, Output discipline section, and @imports for the two
philosophy skills (grug-brain + Ousterhout).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Delete HANDOFF.md + verify gitignore + update memory

**Files:**
- Delete: `/home/paradoks/projects/quakeworld/HANDOFF.md`
- Modify: `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_doc_philosophy.md`

**Purpose:** Retire the 2026-03-29 migration handoff (its key decisions now live in VISION.md per Task 3). Verify the `research/repos/*/` gitignore coverage (validation checklist item). Update project memory to note Phase 2 landed.

**Pre-check:** VISION.md from Task 3 must have captured the following HANDOFF decisions before deletion:
- Workshop monorepo framing (not the final home)
- No git history preserved (2026-03-29 migration, forward velocity over archaeology)
- Solo vibe coder + Claude-as-engineer model
- Graduation paths for quad and slipgate-app to slipgate-web
- matchscheduler rebuild plan inside slipgate-web

If VISION.md is missing any of these, return to Task 3 and add them before deleting HANDOFF.

- [ ] **Step 1: Verify VISION.md captured HANDOFF's key decisions**

```bash
grep -c 'workshop' VISION.md
grep -c 'graduate\|graduation' VISION.md
grep -c 'slipgate' VISION.md
```

Expected: each >= 1. If any is 0, go back to Task 3 and add the missing content before proceeding.

- [ ] **Step 2: Verify research/repos gitignore coverage**

```bash
grep -E '^research/repos' .gitignore
```

Expected: `research/repos/*/`. This is the validation-checklist item "`research/repos/slipgate/` is in `.gitignore` or covered by `update-repos.sh`." The pattern already exists from the initial monorepo setup - this step just confirms it.

- [ ] **Step 3: Delete HANDOFF.md**

```bash
rm HANDOFF.md
ls HANDOFF.md 2>&1
```

Expected: `ls: cannot access 'HANDOFF.md': No such file or directory`.

- [ ] **Step 4: Update project_doc_philosophy.md memory**

Use the Edit tool on `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_doc_philosophy.md`.

Find the existing Status section (near the top of the file - the "Phase 1 landed 2026-04-11" block landed in the previous session) and add a "Phase 2 landed" block immediately after it.

Add this new block:

```markdown
**Phase 2 landed 2026-04-11.** Monorepo-root quartet + philosophy skills + slim CLAUDE.md + contracts index all live:
- `.claude/skills/philosophy/grug-brain.md` and `philosophy-of-software-design.md` (monorepo-scoped, copied from vikpe's slipgate web repo)
- Root `README.md`, `VISION.md`, `OVERVIEW.md` created from scratch
- Root `CLAUDE.md` slimmed from 166 lines; now has Status header, Where-to-find-things table, Output discipline section, and @imports for the two philosophy skills
- `contracts/README.md` indexes the 2 active + 7 completed cross-project specs
- `HANDOFF.md` deleted (key decisions migrated to VISION.md)

**Phase 3 (lazy, per spec)** is per-app migration. Priority order from spec: slipgate-app first (needs README), then quad (full quartet + SCHEMA + API_CONTRACTS), then qw-stats (split bloated CLAUDE.md), then qw-oracle (full quartet + SCHEMA). Each is a separate session, driven by the `docs-check` skill's Mode 2 when Claude next works in that app.
```

Remove the old "Phase 2 (next)" block from the same Status section (the block that says "is a separate plan: slim root CLAUDE.md...") - it's superseded by the Phase 2 landed block.

- [ ] **Step 5: Verify memory update**

```bash
grep -c 'Phase 2 landed 2026-04-11' /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_doc_philosophy.md
grep -c 'Phase 3 (lazy' /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_doc_philosophy.md
grep -c 'Phase 2 (next' /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_doc_philosophy.md
```

Expected:
- `Phase 2 landed 2026-04-11` count: 1
- `Phase 3 (lazy` count: 1
- `Phase 2 (next` count: 0 (the old block was removed)

- [ ] **Step 6: Commit HANDOFF deletion + this plan file**

```bash
git add HANDOFF.md docs/superpowers/plans/2026-04-11-monorepo-doc-philosophy-phase2.md
git status
```

Expected `git status` output: `HANDOFF.md` as deleted, the phase 2 plan file as new. Anything else staged is unexpected - stop and investigate.

```bash
git commit -m "$(cat <<'EOF'
docs: retire HANDOFF.md and land phase 2 plan

HANDOFF.md was the 2026-03-29 migration brief. Its key decisions
(workshop framing, no history preserved, graduation paths,
vibe-coder model) migrated to VISION.md in the prior commit.
Phase 2 plan file is committed alongside as the historical
record of this work.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 completion summary

After Task 7 lands, verify the spec's full validation checklist (the ones that apply to Phase 2's scope):

- [ ] Monorepo-root `CLAUDE.md` has `@imports` for the two philosophy skills (verified in Task 6 Step 3)
- [ ] Monorepo-root `CLAUDE.md` has the output discipline rules (verified in Task 6 Step 3)
- [ ] Monorepo-root `CLAUDE.md` declares lifecycle status in the first 2 lines (verified in Task 6 Step 3)
- [ ] `HANDOFF.md` deleted (verified in Task 7 Step 3)
- [ ] `research/repos/slipgate/` gitignored or covered by `update-repos.sh` (verified in Task 7 Step 2)

Still pending (Phase 3, lazy):
- Every app with Layer 1 quartet - per-app migration
- Every `CLAUDE.md` declares lifecycle status - lazy per app
- No per-app `CLAUDE.md` exceeds 150 lines - mostly done; qw-stats (332) and qw-oracle (192) pending

---

## Post-plan: what comes after

**Phase 3 (lazy, per-app, driven by the `docs-check` skill):**

Per the spec's migration plan section, each app gets its quartet written when Claude next works in it. Priority order:

1. **slipgate-app** - needs `README.md` (has VISION, OVERVIEW, lean CLAUDE.md already). Smallest remaining work; could happen next session if user wants.
2. **quad** - needs full quartet: README + VISION + OVERVIEW. Also needs `SCHEMA.md` (Firestore collections) and `API_CONTRACTS.md` (Discord gateway + Firestore boundary). Existing CLAUDE.md is healthy, just needs status header.
3. **qw-stats** - needs quartet. CLAUDE.md split: 332 lines -> lean + `DEVELOPMENT.md` + `HEALTH.md` + `VISION.md`. `API-GUIDE.md` renames to `API_CONTRACTS.md`. `DATABASE-SCHEMA.md` renames to `SCHEMA.md`. Biggest Phase 3 session.
4. **qw-oracle** - needs quartet. `CLAUDE.md` split into lean + `DEVELOPMENT.md` + `SCHEMA.md`. Existing `plan.md` content merges into `VISION.md` + `OVERVIEW.md`.
5. **matchscheduler** - no migration. Legacy. Skill runs in passive-flag mode only.

**Deferred items (not Phase 3, separately pending):**
- `people/README.md` - user requested this as a later separate session
- `packages/qw-knowledge/README.md` - lazy per spec, when next touched
- `packages/qw-config/README.md` - lazy per spec, when next touched
