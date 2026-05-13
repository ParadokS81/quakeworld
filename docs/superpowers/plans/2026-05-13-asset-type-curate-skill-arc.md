# Asset-type curate skill arc -- implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `asset-type-curate` user-global skill + new `asset-notes/` L3 bucket + scaffolding, then validate with skybox slice, then fan-out to 20 remaining asset types.

**Architecture:** Single skill with lean SKILL.md + 6 references/ files. Skill produces per-slug investigation.md + draft asset-note .md via 6-step pipeline. L1-GAP halts (no draft); all other flags produce a draft favoring source-truth. Frontmatter mirrors seed YAML stable fields per Path C precedent. Three phases gated on operator approval.

**Tech Stack:** Markdown authoring, YAML seed lookup, ezQuake/FTE/QWCL/MVDSV C source reading via libclang extractor output, postgres SQL (gfx corpus mining), bash file operations.

**Spec:** `docs/superpowers/specs/2026-05-13-asset-type-curate-skill-design.md`

**Reference materials:**
- `apps/qw-oracle/curated/concept-notes/README.md` + `OPERATIONS.md` + `CLAUDE.md` -- structural reference for new asset-notes/ scaffold files
- `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml` -- 21-entry seed (verified)
- `apps/qw-oracle/scripts/extractors/{ezquake,fte}/output/*-asset-loader-sites-ast.json` -- L1 evidence per engine
- `~/.claude/skills/guide-rewrite/SKILL.md` + references/ -- sibling skill, structural pattern reference
- `docs/superpowers/parking/2026-05-12-gfx-corpus-inventory.md` + `2026-05-12-asset-corpus-investigation-findings.md` -- corpus taxonomy + install conventions

---

## Phase 1 -- Scaffold + skill build

Phase 1 produces the asset-notes/ bucket, the docs/asset-curation/ sink, the player-skins migration, the API_CONTRACTS + CLAUDE.md edits, the SKILL.md, and the 6 references/ files. No skill invocation in this phase; this is pure file authoring + edits.

**Gate before Phase 2:** operator reviews scaffolding + skill files. Operator must explicitly approve before Phase 2 fires.

### Task 1.1: Create asset-notes/ bucket scaffolding

**Files:**
- Create: `apps/qw-oracle/curated/asset-notes/README.md`
- Create: `apps/qw-oracle/curated/asset-notes/OPERATIONS.md`
- Create: `apps/qw-oracle/curated/asset-notes/CLAUDE.md`

- [ ] **Step 1: Read concept-notes/ scaffold as structural reference**

Read these for structural pattern (NOT to copy verbatim; asset-notes is a different sub-shape):
- `apps/qw-oracle/curated/concept-notes/README.md` (162 lines -- authoring conventions, frontmatter, voice/length tiers, notes table)
- `apps/qw-oracle/curated/concept-notes/OPERATIONS.md` (349 lines -- stewardship playbook)
- `apps/qw-oracle/curated/concept-notes/CLAUDE.md` (22 lines -- pointer entry doc)

- [ ] **Step 2: Create `asset-notes/README.md`**

Required sections:
- Header explaining what asset-notes are (engine-data synthesis sub-shape per Path C; bounded set; one note per asset_type in `qw-asset-types.yaml`)
- Frontmatter schema per spec section "Asset-note frontmatter" (mirror seed stable fields + audit metadata; reference qwiki D18)
- Voice/length tiers (community-wiki shape; brief by default; depth only when warranted; cite `feedback_l3_concept_notes_wiki_shape`)
- Earn-the-note tests are NOT applicable here (bounded set, every asset_type earns a note by virtue of being engine-recognized)
- Notes table (initially empty except for `player_skin.md` from Task 1.3)

Approximate length: 80-150 lines. Match concept-notes/README.md tone.

- [ ] **Step 3: Create `asset-notes/OPERATIONS.md`**

Required sections:
- Authoring workflow (invoke `/asset-type-curate <slug>` skill; review investigation; refine draft; commit)
- Status-flag triage table (5 flags + what each implies for operator action; cross-reference SKILL.md)
- Update lifecycle (when source changes, last_verified bumps; new engine onboarding triggers re-walk)
- L1-GAP handling (defer drafts; harvest gap one-liners; route to next extractor arc)
- Companion-asset cross-reference convention (`companion_asset_types` field)

Approximate length: 150-250 lines. Match concept-notes/OPERATIONS.md tone.

- [ ] **Step 4: Create `asset-notes/CLAUDE.md`**

Short entry-doc pattern (~25 lines). Mirror `concept-notes/CLAUDE.md` shape:
- One-paragraph intro
- Documentation index (table pointing to README, OPERATIONS, individual notes)
- Tool surface note (eventual MCP exposure via `get_concept_note(type='asset')` once bucket populated)

- [ ] **Step 5: Verify against spec**

Run `grep -l asset-notes apps/qw-oracle/curated/asset-notes/*.md` -- expect 3 files matching. Run `wc -l` on each, confirm targets above.

- [ ] **Step 6: Commit**

```bash
git add apps/qw-oracle/curated/asset-notes/README.md apps/qw-oracle/curated/asset-notes/OPERATIONS.md apps/qw-oracle/curated/asset-notes/CLAUDE.md
git commit -m "feat(qw-oracle/l3): scaffold asset-notes/ bucket (sibling to concept-notes/)"
```

### Task 1.2: Create docs/asset-curation/ stub

**Files:**
- Create: `apps/qw-oracle/docs/asset-curation/README.md`

- [ ] **Step 1: Create stub README**

Required sections:
- Purpose: directory holds per-slug investigation.md outputs from `asset-type-curate` skill
- Lifecycle: sub-agent writes; orchestrator reviews; commits alongside reviewed drafts
- Naming: `<slug>-investigation.md` (one per asset_type)
- Status: indexed via status flag in each file's frontmatter

Approximate length: 30-60 lines.

- [ ] **Step 2: Commit**

```bash
git add apps/qw-oracle/docs/asset-curation/README.md
git commit -m "feat(qw-oracle/docs): add asset-curation/ investigation-report sink"
```

### Task 1.3: Migrate concept-notes/player-skins.md -> asset-notes/player_skin.md

**Files:**
- Read: `apps/qw-oracle/curated/concept-notes/player-skins.md` (full file; 533 lines incl. frontmatter)
- Read: `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml` (player_skin entry only)
- Create: `apps/qw-oracle/curated/asset-notes/player_skin.md`
- Delete: `apps/qw-oracle/curated/concept-notes/player-skins.md`
- Modify: `apps/qw-oracle/curated/concept-notes/README.md` (remove player-skins row from notes table)

- [ ] **Step 1: Read source files**

```bash
# Confirm both files exist
ls apps/qw-oracle/curated/concept-notes/player-skins.md
grep -A 40 "asset_type: player_skin" apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml | head -60
```

- [ ] **Step 2: Compose new frontmatter (mirror seed stable fields + audit metadata)**

Replace concept-notes-shaped frontmatter with asset-notes shape per spec:

```yaml
---
slug: player_skin
asset_type: player_skin
engine_canonical_paths:
  ezquake: [...]      # mirror from seed entry
  fte: [...]
user_install_paths: [...]
corpus_categories: [...]
related_entities: [...] # preserve existing cvar list from original file
companion_asset_types: []
l1_canonical_ids:
  ezquake: [...]      # pull from ezquake-asset-loader-sites-ast.json
  fte: [...]
status: CONFIDENT
last_verified: 2026-05-13
authority_grounds: engine_mechanics
---
```

Pull each seed field by reading the player_skin entry in `qw-asset-types.yaml`. Pull l1_canonical_ids by grepping the extractor JSONs for player_skin category sites.

- [ ] **Step 3: Compose new body (preserve existing prose, restructure if needed)**

The original file's body is good content. Restructure if the asset-notes "Files involved" / "Install layout" sections improve clarity. Preserve all cvar references and authoritative grounds.

Sections to ensure present:
- What is this asset type
- How it loads (engine mechanism)
- Where users install custom content (install layout)
- Files involved (if multi-file; for player_skin: .pcx software + .png/.tga GL)
- Cross-engine differences (ezQuake / FTE / QWCL / MVDSV behavior)
- Community conventions / corpus packaging notes
- Edge cases (force-skin, gibs, dead bodies, powerup glow interactions)

- [ ] **Step 4: Write the new file**

Create `apps/qw-oracle/curated/asset-notes/player_skin.md` with new frontmatter + body.

- [ ] **Step 5: Grep for MCP consumer references to old slug**

```bash
grep -rn "player-skins" apps/qw-oracle/ --include="*.ts" --include="*.md" --include="*.yaml" | grep -v "curated/concept-notes/player-skins.md"
```

If any references exist (likely in `apps/qw-oracle/serve/mcp/` source), update them to `player_skin`. Note: `apps/qw-oracle/serve/mcp/src/orientation.ts` may reference the slug in the orientation blob.

- [ ] **Step 6: Delete old file**

```bash
git rm apps/qw-oracle/curated/concept-notes/player-skins.md
```

- [ ] **Step 7: Remove player-skins row from concept-notes/README.md table**

Edit `apps/qw-oracle/curated/concept-notes/README.md`. Find the row in the notes table that references `player-skins.md` and remove it.

- [ ] **Step 8: Commit**

```bash
git add apps/qw-oracle/curated/asset-notes/player_skin.md apps/qw-oracle/curated/concept-notes/README.md
# git rm already staged the deletion
git commit -m "refactor(qw-oracle/l3): migrate player-skins.md to asset-notes/player_skin.md

Slug rename (kebab to snake) to match qw-asset-types.yaml seed.
Frontmatter restructured to asset-notes shape (mirror seed stable
fields + audit metadata) per Path C / qwiki D18 precedent. Body
content preserved."
```

### Task 1.4: Edit API_CONTRACTS.md (3 edits)

**Files:**
- Modify: `apps/qw-oracle/API_CONTRACTS.md`

- [ ] **Step 1: Read current contracts doc**

```bash
wc -l apps/qw-oracle/API_CONTRACTS.md
# Expect ~138 lines per session-start snapshot
```

- [ ] **Step 2: Edit 1 -- add asset-notes row to L3 expansion pattern table**

Locate the L3 expansion pattern table (around line 109-113). Add a new row after the `tournament-notes` row:

```markdown
| asset-notes | `curated/asset-notes/` | TBD (`concepts` + `concept_chunks` with `type='asset'` discriminator likely) | TBD (`get_concept_note(type='asset')` + `search_concepts(type='asset')` likely; `lookup_asset_type` for richer envelope if proven) | Authoring in flight (asset-type-curate skill arc 2026-05-13); MCP exposure deferred until bucket populated. |
```

- [ ] **Step 3: Edit 2 -- generalize Path C framing prose**

Below the L3 expansion pattern table, find the prose paragraph that starts "**Decision (Path C):** profiles get a dedicated schema..."

Add a paragraph BEFORE that decision paragraph, lifting the sub-shape patterns explicitly:

```markdown
**L3 sub-shapes (three patterns observed so far):**

- **Free-form synthesis** (concept-notes) -- authored deep, hand-tuned, slug + frontmatter + prose body. Open-ended topics.
- **Wiki-import biographical** (profile-notes: player / clan / tournament) -- structured rows + optional unique-content body. Bounded sets imported from community wikis.
- **Engine-data synthesis** (asset-notes) -- bounded set, seed-mirrored frontmatter, prose body for unique content the row schema cannot represent. Bridges L1 facts to L3 narrative.

Future sub-buckets pick the closest sub-shape; new sub-shapes earn their own pattern documentation here when they emerge.
```

- [ ] **Step 4: Edit 3 -- lift D18 frontmatter rule into Storage contract section**

In the "Storage" row of the three-contract table (around line 11-16), the current cell reads:
`Postgres schema + Voyage 4 embedding pipeline + frontmatter discipline on L3`

After the three-contract table (around line 17-21), find the "Decay symptoms" prose. After "Storage decay" bullet, add a new sub-section:

```markdown
### Storage contract: L3 frontmatter discipline

For any L3 sub-bucket with row-shaped data underneath (profile-notes, asset-notes, future structured sub-buckets), the rule is:

> **Frontmatter mirrors the row's stable fields; body carries unique prose / quotes / settings that the row schema cannot represent.**

Source: qwiki-community-reference arc D18 (2026-05-08). The open-drift item #2 below (920 player/clan note files not exposed via MCP) is the cautionary tale of authoring a sub-bucket without this discipline. New sub-buckets in the L3 expansion pattern table inherit this rule by default.
```

- [ ] **Step 5: Verify edits**

```bash
grep -c "asset-notes" apps/qw-oracle/API_CONTRACTS.md  # expect >=2
grep -c "L3 sub-shapes" apps/qw-oracle/API_CONTRACTS.md  # expect 1
grep -c "L3 frontmatter discipline" apps/qw-oracle/API_CONTRACTS.md  # expect 1
```

- [ ] **Step 6: Commit**

```bash
git add apps/qw-oracle/API_CONTRACTS.md
git commit -m "docs(qw-oracle/contracts): add asset-notes row + generalize Path C framing + lift D18 frontmatter rule"
```

### Task 1.5: Edit apps/qw-oracle/CLAUDE.md subsystem-scopes row

**Files:**
- Modify: `apps/qw-oracle/CLAUDE.md`

- [ ] **Step 1: Locate the subsystem-scopes table row for curated/**

Find this row (the third row in the Subsystem scopes table):

```markdown
| `curated/` | `curated/concept-notes/CLAUDE.md` | Layer 3 curated knowledge layer: concept-notes/ (existing), player-notes/, clan-notes/, tournament-notes/ (new this arc) |
```

- [ ] **Step 2: Update description to add asset-notes/**

Replace with:

```markdown
| `curated/` | `curated/concept-notes/CLAUDE.md` | Layer 3 curated knowledge layer: concept-notes/ (existing), player-notes/, clan-notes/, tournament-notes/ (qwiki arc), asset-notes/ (asset-type-curate arc 2026-05-13) |
```

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/CLAUDE.md
git commit -m "docs(qw-oracle): add asset-notes/ to subsystem-scopes table"
```

### Task 1.6: Build asset-type-curate SKILL.md

**Files:**
- Create: `~/.claude/skills/asset-type-curate/SKILL.md`

- [ ] **Step 1: Read sibling skill as structural reference**

```bash
ls ~/.claude/skills/guide-rewrite/
cat ~/.claude/skills/guide-rewrite/SKILL.md | head -100  # peek at YAML frontmatter + trigger section
```

- [ ] **Step 2: Compose SKILL.md per spec "Skill shape" section**

Target: under 300 lines.

Required sections (in order):

1. **YAML frontmatter** -- name, description, type (per skill-creator convention):
```yaml
---
name: asset-type-curate
description: |
  Use this skill to investigate one QuakeWorld asset_type from qw-asset-types.yaml
  and produce a Layer 3 concept note. Triggers on "/asset-type-curate <slug>",
  "curate asset type <name>", "next asset-type slice", or "run asset-type-curate
  on <slug>". The skill walks pre-flight / source-verify / docs-cross-ref /
  corpus-mine / triage / output for one slug. L1-GAP halts; all other flags
  produce a draft favoring source-truth.
---
```

2. **Trigger phrases** -- enumerated (mirror description).

3. **Inputs the skill expects** -- slug (asset_type from qw-asset-types.yaml), engine list (default: all 4 + qw), audit date (default: today).

4. **6-step workflow** -- numbered checklist matching spec's "Per-slug workflow" section. Each step terse (1-3 sentences); detailed rubric externalized to references/.

5. **5-flag status definitions (terse)** -- one line each. Full rubric in `references/status-flag-rubric.md`.

6. **Flag-gated output branch** -- L1-GAP: investigation.md only; others: investigation.md + asset-notes/<slug>.md.

7. **Output locations** -- table mirroring spec's "Output artifacts" section.

8. **Pointers to references/** -- table listing the 6 reference files with one-line purpose each.

9. **Halt contract** -- final line of skill output format: `<slug>: <FLAG> -- <one-line summary> -- artifacts: <paths>`.

- [ ] **Step 3: Verify length**

```bash
wc -l ~/.claude/skills/asset-type-curate/SKILL.md  # expect <300
```

- [ ] **Step 4: Commit (in user-global skills repo if versioned; otherwise leave uncommitted -- it's a user-level artifact, not in the monorepo)**

If `~/.claude/skills/` is a git repo, commit there. Otherwise no commit step -- it's a runtime artifact.

```bash
ls -la ~/.claude/.git 2>/dev/null && echo "REPO" || echo "NOT-REPO"
```

If REPO: commit per that repo's conventions. If NOT-REPO: skip the commit (skill lives as untracked filesystem state).

### Task 1.7: Build 6 references/ files

**Files:**
- Create: `~/.claude/skills/asset-type-curate/references/asset-note-template.md`
- Create: `~/.claude/skills/asset-type-curate/references/status-flag-rubric.md`
- Create: `~/.claude/skills/asset-type-curate/references/corpus-mining-recipes.md`
- Create: `~/.claude/skills/asset-type-curate/references/seed-patch-format.md`
- Create: `~/.claude/skills/asset-type-curate/references/cross-engine-loader-grep.md`
- Create: `~/.claude/skills/asset-type-curate/references/divergent-resolution-rubric.md`

Each file is 50-200 lines of focused reference material loaded on demand by the sub-agent running the skill.

- [ ] **Step 1: Build `asset-note-template.md`**

Content:
- The complete frontmatter schema (verbatim from spec section "Asset-note frontmatter")
- Body section skeleton with required + optional sections:
  - **Required:** Description, How it loads, Install layout, Cross-engine differences
  - **Optional (multi-file types):** Files involved, Companion files (cross-reference to `companion_asset_types`)
  - **Optional (rich evidence):** Community conventions, Edge cases, Doc-divergence notes
- Voice/length cues (community-wiki shape, brief by default, depth only when warranted)
- A representative excerpt (1 paragraph showing the voice) for the executor to anchor on -- pull from `apps/qw-oracle/curated/concept-notes/lightning-gun-customization.md` or similar as voice exemplar

- [ ] **Step 2: Build `status-flag-rubric.md`**

Content:
- For each of the 5 flags (CONFIDENT / L1-GAP / DOC-GAP / DIVERGENT / SPARSE):
  - Trigger conditions (what evidence pattern produces this flag)
  - Concrete examples (one per flag, drawn from likely asset_types)
  - What goes in investigation.md body for this flag
  - Whether a draft is produced (D5: L1-GAP halts; others produce)
- Retired-feature edge case: draft says "no current note needed -- feature retired in <commit>"; the slug remains in the index but the note body is short

- [ ] **Step 3: Build `corpus-mining-recipes.md`**

Content:
- Bash + jq recipes for `/home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/pass2-manifest.ndjson`:
  - Filter by role/category to find bundles relevant to an asset_type
  - Surface install_path_template per asset role
  - List representative bundles for spot-checking
- SQL recipes for `gfx.sql` / `gfx_comment` table:
  - Grep `c_txt` for path-like patterns (`/textures/`, `/progs/`, "goes in", etc.)
  - Filter comments by `c_id` referencing bundles in a category
- Reference: `/home/paradoks/sandboxes/qw3-abab-gfx/gfx.sql` is 258KB; mine with `grep` + small Python scripts

- [ ] **Step 4: Build `seed-patch-format.md`**

Content:
- Inline format for `## Suggested seed deltas` section in investigation.md:
  ```yaml
  # Proposed delta to qw-asset-types.yaml asset_type: <slug>
  field_name:
    old: <current value>
    new: <proposed value>
    rationale: <one sentence>
  ```
- Promote-to-file criteria (D6 exception): >5 fields OR schema-shape change -> write `<slug>.yaml` patch under `apps/qw-oracle/scripts/extractors/qw/seeds/_patches/`
- Example: a Skins/Monster vs Skins/Gib seed split would be a promote-to-file case

- [ ] **Step 5: Build `cross-engine-loader-grep.md`**

Content:
- The multi-use-loader pattern per `project_multi_use_loader_pattern` memory: one generic image-load function dispatched to 8+ asset categories via enclosing-function routing
- Signature grep patterns per engine:
  - ezQuake: `R_Load`, `Image_Load`, `Tex_Load`, `Pic_Load`, `Image_Get` in `apps/qw-oracle/scripts/extractors/ezquake/output/`
  - FTE: same primitives in `apps/qw-oracle/scripts/extractors/fte/output/`
  - QWCL / MVDSV: bare grep over source roots (handlers may not be fully built; corpus is sparser)
- Verification step: any function called from >=4 distinct enclosing-function families is a multi-use loader candidate
- Cross-reference: `reference_screenshot_regex_pattern_bug` for the adjacent regex bug to watch for in QWCL / MVDSV handlers

- [ ] **Step 6: Build `divergent-resolution-rubric.md`**

Content:
- Source-vs-docs divergence: source wins per D4 (`project_qw_oracle_source_truth`); draft notes the divergence prominently in body; flag is DIVERGENT
- Source-vs-corpus divergence: source wins; corpus is descriptive evidence not prescriptive
- Engine-A-vs-engine-B divergence: both describe valid behavior for their respective engines; body enumerates both with version anchors; flag depends on doc coverage of the divergence
- Retired-feature shape: source has fundamentally retired the feature (docs describe a removed system); draft says "no current note needed -- feature retired in <commit>"; flag is DIVERGENT with explicit retirement note in investigation.md
- Worked example: skybox `Shader_ParseSkySides` legacy 6-face shader path -- still in FTE source but operator may flag as deprecated; investigation surfaces both, draft describes both

- [ ] **Step 7: Verify all references created**

```bash
ls ~/.claude/skills/asset-type-curate/references/
# Expect 6 files
```

- [ ] **Step 8: Commit (or skip, per Task 1.6 Step 4 outcome)**

---

**Phase 1 gate:** operator reviews:
1. `apps/qw-oracle/curated/asset-notes/` scaffolding (3 files)
2. `apps/qw-oracle/docs/asset-curation/README.md`
3. `apps/qw-oracle/curated/asset-notes/player_skin.md` (migration result)
4. `apps/qw-oracle/API_CONTRACTS.md` (3 edits)
5. `apps/qw-oracle/CLAUDE.md` (subsystem-scopes row)
6. `~/.claude/skills/asset-type-curate/SKILL.md` (under 300 lines)
7. `~/.claude/skills/asset-type-curate/references/` (6 files)

Operator must explicitly approve Phase 1 before Phase 2 fires.

---

## Phase 2 -- First slice (skybox)

Phase 2 is a solo skill invocation on `skybox` to stress-test the template. No fan-out yet. Output is reviewed; SKILL.md + references/ get refined from the experience; the resulting skybox.md becomes the canonical template stored as memory.

**Gate before Phase 3:** operator approves first slice + any skill refinements.

### Task 2.1: Invoke `/asset-type-curate skybox` (solo)

**Files:**
- Will create: `apps/qw-oracle/docs/asset-curation/skybox-investigation.md`
- Will create: `apps/qw-oracle/curated/asset-notes/skybox.md`

- [ ] **Step 1: Operator runs the skill**

The operator (or current session) invokes:

```
/asset-type-curate skybox
```

The skill walks the 6-step pipeline against `skybox` slug:
- Pre-flight: load skybox entry from `qw-asset-types.yaml`; pull L1 anchors
- Source verification: read `R_LoadSkyTexturePixels` (ezQuake), `R_SetSky` + `Shader_ParseSkySides` (FTE), verify probe behavior
- Docs cross-reference: `research/repos/ezquake-docs/docs/docs/textures.md#skyboxes`; jina-reader fallback to ezquake.com
- Corpus mining: query gfx sandbox for "Other / Skyboxes" bundles
- Triage: expected flag is DIVERGENT or DOC-GAP (docs known-stale; ENCLOSING_FN_CATEGORY_OVERRIDES recently surfaced)
- Output: investigation.md + draft skybox.md

- [ ] **Step 2: Verify both artifacts exist**

```bash
ls apps/qw-oracle/docs/asset-curation/skybox-investigation.md
ls apps/qw-oracle/curated/asset-notes/skybox.md
```

Investigation should have status flag in frontmatter. Draft should have asset-notes frontmatter mirroring seed fields.

### Task 2.2: Review skill output

**Files:**
- Read: `apps/qw-oracle/docs/asset-curation/skybox-investigation.md`
- Read: `apps/qw-oracle/curated/asset-notes/skybox.md`

- [ ] **Step 1: Read investigation.md**

Check:
- Status flag matches evidence (expected: DIVERGENT or DOC-GAP)
- All 4 loading mechanisms surfaced (r_skyname, /loadsky, /skygroup, worldspawn.sky)
- Cross-engine path divergence captured (ezQuake 4 probes + FTE bare-root)
- ENCLOSING_FN_CATEGORY_OVERRIDES referenced
- Any seed-deltas proposed in `## Suggested seed deltas`
- Any extractor-gap one-liners in `## Extractor gap` (if static-array path-pattern extractor capability surfaces here, that's the next L1-GAP follow-up arc seed)

- [ ] **Step 2: Read draft skybox.md**

Check:
- Frontmatter mirrors seed stable fields correctly
- `engine_canonical_paths` populated for ezquake + fte
- `corpus_categories` from seed
- `related_entities` includes `cvar:r_skyname`, `command:loadsky`, `command:skygroup`, `command:worldspawn`
- `l1_canonical_ids` populated for ezquake + fte (from extractor JSONs)
- Body sections present: Description, How it loads, Files involved (6 faces), Install layout, Cross-engine differences, Edge cases (skygroups, mvd per-map, fallback)
- Voice is community-wiki, brief, anchored to source

### Task 2.3: Refine SKILL.md + references/ from experience

**Files:**
- Modify (as needed): `~/.claude/skills/asset-type-curate/SKILL.md`
- Modify (as needed): `~/.claude/skills/asset-type-curate/references/*.md`

- [ ] **Step 1: Identify refinements**

From the skybox slice experience, identify:
- Wording in SKILL.md or references/ that confused the sub-agent
- Gaps in the asset-note-template (sections that should have been mandatory but weren't)
- Missing flag examples in status-flag-rubric
- Corpus-mining recipes that didn't work as written
- Cross-engine grep patterns that need adjustment

- [ ] **Step 2: Apply refinements inline**

Edit the affected files. Document each change with a brief comment so the fan-out runs see consistent behavior.

- [ ] **Step 3: If refinements were substantial, append "Post-first-slice refinements" section to spec**

Edit `docs/superpowers/specs/2026-05-13-asset-type-curate-skill-design.md` to capture material changes so the spec stays honest.

### Task 2.4: Save canonical-template memory

**Files:**
- Create: `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/reference_asset_note_template_skybox.md`
- Modify: `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/MEMORY.md`

- [ ] **Step 1: Write the memory file**

Frontmatter:
```yaml
---
name: asset-note-template-canonical-skybox
description: The canonical skybox.md that emerged from the first asset-type-curate slice (Phase 2 of the asset-type-curate skill arc, 2026-05-13). Use as voice/structure reference when authoring or refining future asset-notes.
metadata:
  type: reference
---
```

Body:
- One-paragraph context (where the slice was run, what triage flag landed, what skill refinements landed)
- Pointer to the file (`apps/qw-oracle/curated/asset-notes/skybox.md`)
- 3-5 key voice/structure observations worth carrying forward to other slices

- [ ] **Step 2: Add MEMORY.md entry**

Add a one-line index entry under the "## qw-oracle" subsection of `MEMORY.md`:

```markdown
- [Asset-note template canonical (skybox)](reference_asset_note_template_skybox.md) — first-slice canonical example for asset-notes/ voice + structure.
```

### Task 2.5: Commit slice outputs + skill refinements

- [ ] **Step 1: Commit slice outputs (monorepo)**

```bash
git add apps/qw-oracle/docs/asset-curation/skybox-investigation.md apps/qw-oracle/curated/asset-notes/skybox.md
# Plus any spec edits from Task 2.3
git commit -m "feat(qw-oracle/l3): first asset-type slice -- skybox (asset-type-curate Phase 2)

Stress-tests the template across cross-engine paths, multi-mechanism
loading, stale docs, role-override evidence. <status flag landed>.
Skill refinements landed in same commit if any spec change."
```

- [ ] **Step 2: Commit skill refinements (user-global skills repo if versioned)**

Per Task 1.6 outcome -- if `~/.claude/` is a repo, commit refinements; otherwise leave as untracked filesystem state.

---

**Phase 2 gate:** operator reviews:
1. `skybox-investigation.md` (status flag justified by evidence)
2. `skybox.md` (frontmatter + body meet template; voice is right)
3. SKILL.md + references/ refinements (if any)
4. Canonical-template memory

Operator must explicitly approve Phase 2 before Phase 3 fires.

---

## Phase 3 -- Fan-out

Phase 3 dispatches sub-agents for the remaining 20 asset_types in parallel, walks the status table, reviews each output, and harvests L1-GAP findings for the next extractor arc. Estimated cost: $10-20 total; wall-clock ~10 min for dispatch + 1-2 hours for review.

### Task 3.1: Enumerate remaining asset_types

**Files:**
- Read: `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml`

- [ ] **Step 1: List the 20 remaining slugs (skybox already shipped in Phase 2)**

```bash
grep -E "^  - asset_type:" apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml | sed 's/.*: //' | grep -v "^skybox$"
```

Expected 20 slugs:
```
conback, charset, crosshair, palette, colormap, hud_element, wad_file,
levelshot, player_skin, model_q1, model_texture, map, map_texture,
map_lighting, map_entities, locfile, sound, config, demo, demo_archive
```

Note: `player_skin` is in this list. The skill should run on it (re-author from scratch using post-Phase-2 refined template) rather than skip-because-migrated; the Task 1.3 migration was structural, not a fresh authoring pass.

### Task 3.2: Dispatch 20 sub-agents in parallel

**Files:**
- Will create: 20 x `apps/qw-oracle/docs/asset-curation/<slug>-investigation.md`
- Will create: 16-20 x `apps/qw-oracle/curated/asset-notes/<slug>.md` (some halt on L1-GAP)

- [ ] **Step 1: Dispatch the fan-out**

In an Opus orchestrator session, dispatch 20 sub-agents in parallel (Sonnet medium-effort per slice). Each sub-agent receives:
- The slug it's responsible for
- The skill name: `asset-type-curate`
- Halt contract: "Run the skill end-to-end. Output the halt-line (slug + flag + summary + artifacts) when done. Don't commit -- orchestrator handles that."

Sub-agent prompt template:
```
Run the asset-type-curate skill on slug <SLUG>.
Read: ~/.claude/skills/asset-type-curate/SKILL.md
Run the full 6-step pipeline end-to-end.
Halt with the one-line status report. Do not commit.
```

Use a single message with 20 parallel Agent tool calls. Sonnet medium-effort per call.

- [ ] **Step 2: Wait for completion**

The harness will notify when sub-agents finish. Estimated ~10 min wall-clock.

### Task 3.3: Walk status table; triage

- [ ] **Step 1: Collect 20 status lines**

Each sub-agent's halt-line goes into a status table:

```
<slug>: <FLAG> -- <one-line summary> -- artifacts: <paths>
```

Compile into a 20-row markdown table for operator visibility.

- [ ] **Step 2: Triage**

| Flag | Action |
|------|--------|
| CONFIDENT | 30-second draft skim -> commit or kick back |
| DIVERGENT | Deep-read investigation.md + draft, refine, commit |
| DOC-GAP | Deep-read, refine, commit |
| SPARSE | Verify SPARSE is correct (engine-internal types expected here); commit short draft |
| L1-GAP | Skip draft (per D5); harvest extractor-gap one-liner |

Expected SPARSE outcomes (engine-internal types per spec context): `palette`, `colormap`, `map_lighting`, `map_entities`, `locfile`, `demo`, `demo_archive` -- 7 of the 20.

### Task 3.4: Light-review CONFIDENT; deep-read non-CONFIDENT; commit batched

- [ ] **Step 1: CONFIDENT slices**

For each CONFIDENT slice:
- Open the draft .md
- 30-second skim: frontmatter present, body has required sections, voice is right
- If acceptable: stage for batched commit
- If issues: kick back to a refresh sub-agent for one fixup pass

- [ ] **Step 2: DIVERGENT / DOC-GAP / SPARSE slices**

For each:
- Read investigation.md fully (status flag justification, evidence summary)
- Read draft .md
- Refine inline (don't dispatch sub-agent for refinements; operator-direct edits per `feedback_no_subagents_for_mechanical_edits`)
- Stage for batched commit

- [ ] **Step 3: Batched commit**

```bash
git add apps/qw-oracle/docs/asset-curation/ apps/qw-oracle/curated/asset-notes/
git commit -m "feat(qw-oracle/l3): asset-type-curate fan-out -- 20 slices (Phase 3)

<N> CONFIDENT, <N> DIVERGENT, <N> DOC-GAP, <N> SPARSE, <N> L1-GAP.
L1-GAP slices have investigation.md only (no draft per D5); their
extractor-gap one-liners harvested into HANDOVER.md for next
extractor arc."
```

### Task 3.5: Harvest L1-GAP findings for follow-up arc

**Files:**
- Modify: `HANDOVER.md` (root)
- Possibly: create `docs/superpowers/parking/2026-05-XX-extractor-capability-followup.md`

- [ ] **Step 1: Collect extractor-gap one-liners**

```bash
grep -A 2 "^## Extractor gap" apps/qw-oracle/docs/asset-curation/*-investigation.md
```

- [ ] **Step 2: Append to HANDOVER.md**

Under the appropriate section (sidequests or ongoing/future arcs), add a one-line entry pointing to a new parking doc.

- [ ] **Step 3: Write parking doc for next arc**

`docs/superpowers/parking/2026-05-XX-extractor-capability-followup.md` (use actual date).

Content:
- Origin: asset-type-curate Phase 3 (this arc)
- Surfaced L1-GAP findings (verbatim from `## Extractor gap` sections)
- Suggested next-arc shape: scoped extractor capability extension (e.g., static-array path-pattern extractor, watchlist additions)
- Suggested first session: fresh terminal -> arc-classifier or arc-brainstormer

- [ ] **Step 4: Commit handover updates**

```bash
git add HANDOVER.md docs/superpowers/parking/
git commit -m "docs(handover): asset-type-curate arc Phase 3 surfaced <N> L1-GAP findings; route to follow-up extractor arc"
```

### Task 3.6 (sidecar): Re-walk obligation

**Files:**
- Will modify (in DB): 15 ezQuake tag rows + 1 FTE version row in `asset_loader_sites` Layer 1 table

**Background:** The 2026-05-13 handler edits (R_LoadImagePixels watchlist + screenshot regex narrowing + role-override tier) only re-extracted HEAD checkouts. Existing rows for 15 ezQuake tags (v3.0 -> v3.6.9 + head) and 1 FTE version (build-6698) still carry pre-fix categorization. Run extractors per tag to backfill.

This task runs ALONGSIDE Phase 3, not after -- they don't interact (Phase 3 reads from extractor JSON output; re-walk updates Postgres DB rows).

- [ ] **Step 1: Identify tags to re-walk**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
bun scripts/load-knowledge/list-versions.ts --project ezquake
bun scripts/load-knowledge/list-versions.ts --project fte
```

Expect 15 ezQuake tag rows + 1 FTE version.

- [ ] **Step 2: Re-extract per tag**

For ezQuake (15 tags):
```bash
for tag in $(bun scripts/load-knowledge/list-versions.ts --project ezquake --slugs-only); do
  bun scripts/extractors/load-version.ts --project ezquake --version "$tag" --type asset_loader_sites
done
```

For FTE (1 version):
```bash
bun scripts/extractors/load-version.ts --project fte --version build-6698 --type asset_loader_sites
```

(Verify exact CLI flag names before running -- `--type` is a placeholder; check `bun scripts/extractors/load-version.ts --help`.)

- [ ] **Step 3: Verify regression-guard pass**

The `load-version` script's regression-guard aborts if entity counts drop >50%. If any tag aborts, investigate -- a row-count drop may signal a handler regression.

- [ ] **Step 4: Spot-check 2 random tags**

```bash
# Pick 2 random ezQuake tags
psql qw_oracle -c "
SELECT version_slug, reads_category_id, COUNT(*)
FROM asset_loader_sites
WHERE project = 'ezquake' AND version_slug IN ('v3.6.3', 'v3.6.9')
GROUP BY 1, 2
ORDER BY 1, 2;
"
```

Expect skybox + texture rows populated correctly per the corrected handler.

- [ ] **Step 5: Mark obligation closed in HANDOVER.md**

Strike or remove the re-walk line item from HANDOVER.md.

```bash
git add HANDOVER.md
git commit -m "chore(qw-oracle): close re-walk obligation -- 15 ezQuake tags + 1 FTE version re-extracted through corrected handlers"
```

---

**Phase 3 gate:** operator confirms:
1. 20 slice outputs reviewed + committed
2. L1-GAP findings harvested into follow-up arc parking doc
3. Re-walk obligation closed (sidecar)

Arc closure: operator can run arc-reviewer skill in a fresh terminal for the spec-vs-shipped post-arc review if desired.

---

## Out of scope (captured for follow-up, not this plan)

- MCP tool routing for asset-notes/ (defer until bucket has >=10 populated entries; capture envelope decision after fan-out)
- L1-GAP follow-up arc (next extractor-capability arc, parking doc seeded in Task 3.5)
- gfx_comment SQL mining beyond per-slice usage (1,449 rows; corpus-mining-recipes.md covers ad-hoc usage)
- Skins / Monster vs Skins / Gib seed split decision (Task 3.4 will surface during `player_skin` and `model_texture` slices; seed-patch inline if proposed)
