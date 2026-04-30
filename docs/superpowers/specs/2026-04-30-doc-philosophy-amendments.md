# Doc Philosophy Amendments — Spec

**Date:** 2026-04-30
**Status:** Brainstormed and approved. Awaiting docs-check skill update + qw-oracle pilot session.
**Extends:** `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md` (origin doctrine — quartet, Layer 2 menu, lifecycle states) and `docs/superpowers/specs/2026-04-29-docs-system-redesign-design.md` (Mode→Phase rewrite, HANDOVER docket, parking/). Neither prior spec is modified; this one is additive.
**Driver:** A 2026-04-30 housekeeping pass surfaced doc scatter in `apps/qw-oracle/` — Layer 3 refs scattered across `docs/` with mixed lifecycles (`arc-history.md` forever + `entity-types.md` Layer 3 + `game-mechanics-preplan.md` ephemeral + `reviews/` artifacts), zero nested `CLAUDE.md` despite four multi-doc subfolders, a stale `plan.md` from February that nobody decommissioned. The origin doctrine left Claude too much freedom for Layer 3 placement and didn't address subfolder discoverability or doc death. Multi-session entropy × LLM-median guesses = scatter. These ten amendments close those specific gaps.

---

## Audience principle (carried forward unchanged)

Docs are for Claude's navigation, not the operator's bookshelf. The operator works through Claude in the terminal and rarely browses folders directly, so silent doc rot is the real failure mode. The spider-web index pattern (amendment #5) makes rot mechanically detectable rather than relying on cognitive triggers alone.

---

## The ten amendments

| # | Amendment | One-line shape |
|---|---|---|
| 1 | Artifacts category | Tool emissions default to `<scope>/output/`; out of CLAUDE.md graph; out of freshness sweep. |
| 2 | Layer 2 placement | App-wide default; scope-bound exception when "delete-the-subsystem" test fires. |
| 3 | Layer 3 placement | Same delete-the-subsystem test; app-wide refs in `<app>/docs/`, subsystem-coupled refs near the code. |
| 4 | Subfolder CLAUDE.md trigger | ≥1 authored doc → subfolder gets its own `CLAUDE.md`. |
| 5 | Spider-web index pattern | Two-table grammar in app `CLAUDE.md`: "Documentation index" + "Subsystem scopes". |
| 6 | Decommission doctrine | Superseding arcs decommission the old in the same arc; lean delete; two narrow archive exceptions. |
| 7 | Classification at creation | 3-field announcement (Layer / path / index) before `.md` Write. |
| 8 | Strictness — scope of consequence | Decide-alone for single-scope; consult for cross-scope or decommission outside an arc. |
| 9 | docs-check structural triggers | Four checks (index walk / orphan / birth / decommission) layered onto Phase 1 + Phase 2. |
| 10 | Sequencing | Housekeeping → this spec → skill update → qw-oracle pilot → lazy rollout. |

Each amendment has its own section below.

---

## Amendment 1 — Artifacts category

### Rule

An **artifact** is a file that a tool can regenerate from code + inputs. Not authored by hand.

**Default placement:** `<scope>/output/`.

**Grandfather clause:** existing artifact-shaped folders that already serve the role (`apps/qw-oracle/docs/reviews/`, others discovered during retrofit) stay where they are. No rename pressure. The rule applies to NEW artifact emissions.

**Commit policy is independent of the artifact category.** Per artifact-type:
- If a downstream consumer needs the file in git (e.g., extractor JSON snapshots consumed by slipgate; review reports consumed as retrospective record) → commit.
- If purely transient (debug logs, throwaway build outputs) → gitignore.

**`_*.md` is NOT an artifact convention.** Underscore-prefixed `.md` files are a SEPARATE convention for authored seed / draft / in-progress content (e.g., `apps/qw-oracle/concept-notes/_gap-report.md` is hand-authored seed material, not tool output). Both are excluded from the docs-check freshness sweep, but for different reasons.

### Recognition

Test: "Can a tool regenerate this file deterministically from code + inputs?" If yes → artifact, default to `<scope>/output/`. If no → authored content, classify per Layer 1 / 2 / 3 rules.

### docs-check exclusions

The freshness sweep + orphan detection skip:
- Anything under `<scope>/output/`, `<scope>/reports/`, `<scope>/reviews/` (artifact dirs, default + grandfathered).
- Anything matching `_*.md` (seed/draft markers — not load-bearing yet, exempt from rot pressure).

These exclusions also flow through to amendment #9's structural checks.

---

## Amendment 2 — Layer 2 placement

### Rule

**App-wide Layer 2 docs** (default): live at app root.

**Scope-bound Layer 2 docs** (exception): live next to the subsystem they govern.

### Recognition test

> "If I deleted this subsystem, would the doc still have content?"
> - **Yes** → app-wide. Place at app root.
> - **No** → scope-bound. Place with the subsystem.

**Worked examples:**
- `apps/qw-oracle/concept-notes/OPERATIONS.md` — delete `concept-notes/` and OPERATIONS has nothing left to govern → scope-bound, placed correctly.
- `apps/qw-oracle/SCHEMA.md` (hypothetical) — describes the whole-app data model → app-wide, lives at app root.
- A hypothetical `apps/slipgate-app/src-tauri/DEPLOYMENT.md` — if it ONLY covered the Rust build, scope-bound; if it described the whole-app deploy pipeline (which it would), app-wide.

### Partial overlap

If a Layer 2 doc is partly app-wide and partly subsystem-coupled (rare): default to app-wide placement; reference the subsystem-specific bits inline. Don't pre-engineer split strategies.

### Future-scope hedge

If a second subsystem later needs the same Layer 2 doc, the split-vs-unify question reopens at that point — not pre-designed today.

---

## Amendment 3 — Layer 3 placement

### Rule

Layer 3 (domain reference docs) follow the same delete-the-subsystem test as Layer 2:
- **App-wide refs** (covers cross-cutting domain background) → `<app>/docs/`.
- **Subsystem-coupled refs** (covers one subsystem's deep background) → with the subsystem's code.

### Worked examples (existing pattern)

Subsystem-coupled, already correctly placed:
- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` — only meaningful for the extractor pipeline.
- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` — same.
- `apps/qw-oracle/scripts/extractors/<project>/OUT_OF_SCOPE.md` — per-project handler scope, fully scope-bound.
- `apps/qw-oracle/scripts/load-knowledge/e2e-verify.md` — only meaningful for the load pipeline.

App-wide, correctly placed in `<app>/docs/`:
- `apps/qw-oracle/docs/entity-types.md` — describes the whole knowledge graph's entity model.
- `apps/qw-oracle/docs/layer1-extraction-roadmap.md` — covers the multi-extractor roadmap, not one project.
- `apps/qw-oracle/docs/arc-history.md` — chronicle of all shipped arcs in the app.

### Closing the qw-oracle scatter gap

The reason Layer 3 docs landed in `apps/qw-oracle/docs/` without coordination is that the origin doctrine (2026-04-11 spec) gave Layer 3 freedom to live anywhere. Amendment 3 + amendment 5 (subsystem table makes placement visible) close that gap. Future Layer 3 docs land in one of the two recognized homes.

---

## Amendment 4 — Subfolder CLAUDE.md trigger

### Rule

> Any subfolder containing **≥1 authored doc** gets its own `CLAUDE.md`.

**Authored doc** = anything not under `output/`, `reviews/`, `reports/`, and not prefixed with `_`. Tool-emitted artifacts and seed/draft markers don't count toward the threshold.

### Why ≥1, not ≥2

The only mechanism guaranteeing Claude reads a subfolder doc when working in that scope is `CLAUDE.md` auto-load. Anthropic's memory system loads `CLAUDE.md` automatically when Claude operates in the directory. No other file gets that treatment. A `≥2` threshold would force a "does this small doc count?" judgment call without buying anything — single docs benefit from the same auto-discovery enrichment.

### CLAUDE.md vs README

These are different roles even when colocated:
- **`CLAUDE.md`** — auto-loaded by the memory system. Index + scope-specific rules for Claude.
- **`README.md`** — human-facing entry point. Doesn't auto-load.

In subfolders that already have a README (e.g. `apps/qw-oracle/concept-notes/README.md`): **add a CLAUDE.md alongside it; do not repurpose the README.** The README stays as the human-facing entry, the CLAUDE.md handles auto-load + index.

### Worked examples (qw-oracle subfolders)

Trigger fires (gets a CLAUDE.md):
- `concept-notes/` — 11 authored docs (README + OPERATIONS + 9 concept notes; `_gap-report.md` doesn't count).
- `scripts/extractors/` — multiple authored docs + heavy scope conventions.
- `scripts/extractors/ezquake/`, `.../fte/`, `.../mvdsv/`, `.../qwcl/` — each carries `OUT_OF_SCOPE.md` (and per-project notes); each gets its own thin CLAUDE.md.
- `scripts/extractors/extractor_lib/` — has README → trigger fires.
- `scripts/load-knowledge/` — has `e2e-verify.md` (single authored doc) → trigger fires.
- `docs/` — multi-lifecycle: arc-history + Layer 3 refs (after restructure moves `game-mechanics-preplan.md` to `docs/superpowers/preplans/` per amendment #10) → trigger fires.

Estimated nested CLAUDE.md count for qw-oracle pilot: **8-9 files** (concept-notes/ + scripts/extractors/ + 4 per-extractor folders + extractor_lib/ + load-knowledge/ + docs/), each 5-15 lines. Cheap.

### Each subfolder CLAUDE.md carries

- Index of the subfolder's authored docs (its own "Documentation index" table — the spider-web sub-hub).
- Any scope-specific conventions (file naming, handler patterns, doc shape rules) that don't apply outside.
- A pointer back up to the parent `CLAUDE.md` if useful (not required).

---

## Amendment 5 — Spider-web index pattern

### Rule

App `CLAUDE.md` carries TWO tables with **standardized header strings** for mechanical detectability by docs-check:

**Table 1 — `## Documentation index`** (root-level docs in this scope)

```markdown
## Documentation index

| When you need... | Read... |
|---|---|
| Elevator pitch | `README.md` |
| Why this exists | `VISION.md` |
| Living map of features + landmarks | `OVERVIEW.md` |
| Data model | `SCHEMA.md` |
| ...etc | ... |
```

**Table 2 — `## Subsystem scopes`** (subfolder spider-web pointers)

```markdown
## Subsystem scopes

| Subfolder | Entry doc | What's there |
|---|---|---|
| `concept-notes/` | `concept-notes/CLAUDE.md` | Layer 3 corpus + OPERATIONS playbook |
| `scripts/extractors/` | `scripts/extractors/CLAUDE.md` | Per-extractor handler conventions, PLAYBOOK + RUNBOOK |
| `docs/` | `docs/CLAUDE.md` | Long-form Layer 3 refs + arc-history |
```

The header strings **`## Documentation index`** and **`## Subsystem scopes`** are required (case-sensitive). docs-check's index integrity walk identifies the tables by these headers.

### Why two tables

They answer different navigation questions:
- "Documentation index" → *"I want to read about X."*
- "Subsystem scopes" → *"What subsystems exist + where do I look for their conventions?"*

Single-doc subfolders aren't in the subsystem table — their one doc goes in the top "Documentation index" table at app-root level, with the path showing the subfolder.

### Subfolder CLAUDE.md mirrors the pattern

Each nested CLAUDE.md carries its own `## Documentation index` table for the docs in its scope. If it has nested subfolders that themselves carry CLAUDE.md (rare but possible), it adds a `## Subsystem scopes` table too. Recursion is mechanical.

### Existing root CLAUDE.md compatibility

The monorepo-root `CLAUDE.md` already has a "Where to find things" table. **Rename it to `## Documentation index`** during the lazy retrofit pass on the root (per amendment #10). Same applies to per-app CLAUDE.md files as each is touched. No big-bang rename needed.

---

## Amendment 6 — Decommission doctrine

### Rule

**Docs have lifecycles including death.** When an arc supersedes prior work, **the same arc decommissions the old.** No "we'll clean up later."

### Mechanics

Every spec that replaces existing docs:
1. Declares `**Replaces:**` (the old paths are being removed/superseded) OR `**Extends:**` (the prior spec stays as trail; this one is additive — the convention used by this spec's own frontmatter) in the spec frontmatter.
2. Includes explicit decommission steps in its plan for each `Replaces:` entry. (`Extends:` adds nothing to delete.)
3. Doesn't ship until decommission lands.

### Lean toward delete

Git history preserves prior content. Archive directories (`docs/archive/`, `_old/`) are scaffolding that rots. Two narrow exceptions where archive is preferred over delete:

1. **Doc has biographical value separate from the new arc** (e.g., the philosophy workshop doc had value as a record of process). → Migrate one paragraph to the relevant `arc-history.md`, then delete the original.
2. **Doc is public-facing** (README, public docs site). → Operator confirms delete vs replace; default is replace-in-place rather than delete.

### Mechanical signals

docs-check Phase 2 fires on two signals (per amendment #9):
- **Spec with `Replaces:` frontmatter shipped this arc** → verify each replaced path is gone (or migrated to `arc-history.md`).
- **Orphan in the CLAUDE.md / HANDOVER graph** → file exists on disk, isn't reached from any indexed graph, isn't in artifact dirs or chronicle dirs. Surfaced as decommission candidate per amendment #8's rule.

### Same-session create-then-delete is not decommission

If a doc is created and removed within the same conversation (typo in filename, course correction during drafting), no consult needed. The decommission rule applies to docs that **survived past initial creation** into a committed state.

---

## Amendment 7 — Classification at creation

### Rule

When Claude is about to create a new authored `.md` file outside artifact / spec / plan / parking / preplan dirs, it announces a one-liner BEFORE the Write tool fires:

> Creating Layer 2 OPERATIONS.md at `apps/qw-oracle/concept-notes/OPERATIONS.md`, indexed from `concept-notes/CLAUDE.md`. Sound right?

Three required fields, always:
- **Layer** — 1 / 2 / 3 / artifact / seed
- **Path** — full file path
- **Index location** — which CLAUDE.md gets the new pointer row

### Soft, not hard

Operator can adjust in one sentence; default is to proceed if the announcement gets a green light or no objection. If the conversation is moving fast and the announcement gets skipped, **docs-check Phase 1 catches it**: the index integrity walk lists files that exist on disk but aren't in any CLAUDE.md graph. Each becomes a finding with category `[needs classification]`.

### What this prevents

The qw-oracle scatter that motivated this whole arc — Layer 3 refs landing in `apps/qw-oracle/docs/` without any "what bucket is this" thought. The 3-field announcement forces the classification thinking to happen at creation time, not at retrospective cleanup.

### What this doesn't do

- Doesn't fire on plain code files. `.md` only.
- Doesn't fire on tool-emitted artifacts (auto-generated, classification rule already known).
- Doesn't fire on superpowers convention dirs (`docs/superpowers/specs/`, `plans/`, `parking/`, `preplans/`) — those have their own conventions.

### Specs / plans / parking / preplans are excluded from THIS ritual but still subject to decommission

See amendment #6: the decommission doctrine applies to all docs including superpowers convention dirs. They get classification by directory convention; they get decommission discipline by the same rule as everything else.

---

## Amendment 8 — Strictness calibration (scope of consequence)

### Rule

The bar: **does the decision shape how OTHER docs/apps will be treated?**
- **If only this scope** → decide alone.
- **If cross-scope** → consult.

### Decision table

| Decision shape | Mode |
|---|---|
| Layer 1 freshness drift fix in one app | Decide alone |
| New Layer 2 doc in one app, doctrine-conformant placement | Decide alone |
| New Layer 3 ref next to its subsystem | Decide alone |
| Artifact placement (output / reports / inline `_`) | Decide alone |
| Subfolder CLAUDE.md creation per the trigger rule | Decide alone |
| Cross-app pattern change ("standardize all OVERVIEWs to do X") | Consult |
| Decommission of any doc — **unless** part of a shipping arc with `Replaces:` frontmatter declaring it | Consult |
| New Layer 1 doc (would expand the quartet) | Consult — philosophy-amendment-shaped |
| Two interpretations of philosophy genuinely conflict in this case | Consult |
| Rule the philosophy doesn't cover at all | Consult + propose amendment |

### Decommission is self-policing via Replaces frontmatter

The decommission row above replaces the original "7-day age threshold" idea. Rationale: a doc could be 7 days old and obviously dead (stale plan replaced same-week by a new spec); a doc could be 2 years old and still load-bearing (VISION). Age isn't the right primitive. **Whether the deletion is part of a declared arc** is the right primitive.

If you didn't declare you're replacing it in the spec frontmatter, you don't get to delete it solo. Period. This makes the doctrine self-policing — doctrine gates can't be sidestepped by skipping the declaration.

### Goal

Close enough gaps that consultation is rare. The "consult" rows above should fire maybe 1-2× per month, not per session.

---

## Amendment 9 — docs-check structural triggers

This amendment specifies **what the new structural checks are and how they interact**. The actual skill rewrite happens in a separate session (see amendment #10's sequencing). Skill-detail items called out under "For the docs-check skill update" near the end of this spec.

### Four structural checks

**1. Index integrity walk** (Phase 2)
- Roots from BOTH `<app>/CLAUDE.md` AND root `HANDOVER.md`.
- Follows the two-table grammar (per amendment #5): pointer rows in `## Documentation index` + `## Subsystem scopes` tables.
- Recurses into nested `CLAUDE.md` files via the subsystem table.
- Builds the doc graph (set of indexed file paths).
- Verifies each indexed path exists. Dead pointers → finding `[broken index pointer]`.

**2. Orphan detection** (Phase 2)
- Filesystem walk: every `.md` file in the touched project(s).
- **Exclusion lists (split by chronicle vs ephemeral):**

  *Append-only chronicle (excluded from orphan detection — old entries stay as record):*
  - `docs/superpowers/specs/` — each spec extends prior ones; old specs stay as historical reference.
  - `docs/superpowers/plans/` — same; plans ship and stay as record.

  *Active / ephemeral (INCLUDED in orphan detection, with HANDOVER as an additional graph root):*
  - `docs/superpowers/parking/` — should be deleted when arc ships and migrates to `arc-history.md`. Forgotten parking files are rot.
  - `docs/superpowers/preplans/` — should be deleted when spec lands (per amendment #6 + amendment #10). Abandoned pre-plans are rot.
  - HANDOVER's ongoing-arcs / future-arcs / recently-opened sections reference live parking files; HANDOVER's recently-opened or in-progress sections reference live pre-plans. Files NOT reached from HANDOVER → finding `[orphan — design content without active intent, decommission or revive]`.

  *Other always-excluded:*
  - `<scope>/output/`, `<scope>/reports/`, `<scope>/reviews/` — artifact dirs (per amendment #1).
  - `_*.md` — seed/draft markers (per amendment #1).
  - `node_modules/`, `dist/`, `build/` — vendored / build outputs.
  - `arc-history.md` — referenced from CLAUDE.md but its CONTENTS aren't sub-graph entries.

- Anything outside exclusions but not in graph → finding `[orphan — needs classification or decommission]`.

**3. Birth check** (session-time, not wrap-up)
- Fires at `.md` Write tool invocation (during the session, before the file lands), outside the exclusion list (artifact / chronicle / ephemeral / vendored).
- Triggers amendment #7's 3-field announcement requirement (Layer / path / index location).
- If skipped during session, Phase 1 wrap-up's index walk catches missing classification as `[needs classification]`.
- Skill mechanics question (deferred to skill-session): tool-hook vs convention. Either works; the doctrine is the announcement, not the enforcement mechanism.

**4. Decommission check** (Phase 2)
- For any spec shipped this session with `Replaces:` frontmatter: verify each replaced path is gone (or migrated to `arc-history.md`).
- For any orphan from check #2 surviving past current arc: surface as decommission candidate per amendment #8's rule (operator consult required).

### Self-policing parking + preplans

Concretely: HANDOVER's ongoing-arcs and recently-opened sections reference live parking files; HANDOVER's recently-opened or in-progress sections reference live pre-plans. The orphan check walks: parking/preplan files NOT reached from HANDOVER → "[orphan — design content without active intent, decommission or revive]."

This makes parking + preplans self-policing: start one, add a HANDOVER reference; stop working, the next docs-check surfaces it.

### Mapping onto Phase 1 / Phase 2

The 2026-04-29 spec's Phase 1 / Phase 2 split is preserved. Structural checks layer on:
- **Birth check** runs at `.md` Write time during the session, NOT at wrap-up. Phase 1 catches misses retrospectively via the index walk.
- Phase 2 conditional gets the **index integrity walk + orphan detection + decommission check** (only fires when arc-shipping signals justify the cost).

---

## Amendment 10 — Sequencing

The full rollout sequence (most already done; remaining steps in execution order):

1. **Housekeeping** — DONE 2026-04-30. Deleted relics (`apps/qw-oracle/docs/plan.md`, two pre-philosophy relics), fixed staleness items, slimmed `apps/qw-oracle/CLAUDE.md`. Cleared the deck for the spec.
2. **This spec** — IN PROGRESS (this document).
3. **docs-check skill update** — own session, after this spec ships. See "For the docs-check skill update" section below.
4. **qw-oracle pilot** — own session, after the skill update. Adds **8-9 nested CLAUDE.md files** (per amendment #4 worked-example list), restructures `apps/qw-oracle/docs/` (move `game-mechanics-preplan.md` to `docs/superpowers/preplans/`, leave Layer 3 refs + arc-history at `docs/`, leave `reviews/` as grandfathered artifact dir), creates `docs/CLAUDE.md` as router for the cleaned folder, demonstrates the spider-web pattern.
5. **Lazy rollout** — as Claude touches each other app:
   1. slipgate-app (active, most likely next)
   2. quad / qw-stats / matchscheduler (when next worked; matchscheduler stays passive-flag per legacy status)
   3. Monorepo root — naturally surfaces via docs-check Phase 1+Phase 2 once the new skill ships; no HANDOVER entry needed.
   4. `packages/qw-knowledge/` and `packages/qw-version-resolution/` — when next touched.

### HANDOVER does NOT track lazy retrofit

The amendments themselves trigger downstream sessions. Operator decides cadence. No HANDOVER entry per app.

### qw-oracle is the mandatory pilot

Establishes the working pattern before lazy rollout to other apps. If pilot surfaces a problem in the doctrine, the spec re-opens before further apps adopt.

---

## For the docs-check skill update (skill-session work, not this spec's scope)

These items are doctrine the skill must implement but are flagged here so the skill-update session doesn't re-derive them. Each is a skill-mechanic detail, not a doctrine question.

### First-run orphan check produces a backlog

When the new skill first runs against existing projects, the orphan check will surface a one-time backlog (qw-oracle alone has multiple uncovered docs today). This is expected, not a bug. Surface as a single **`[pre-existing orphans]`** finding category that the operator can bulk-classify or schedule cleanup for. After bootstrap, subsequent runs stay quiet.

### Graph walk roots from BOTH CLAUDE.md AND HANDOVER.md

The orphan check needs both roots:
- `<app>/CLAUDE.md` reaches the indexed authored-doc graph (Layer 1 / 2 / 3 + nested CLAUDE.md spider-web).
- `HANDOVER.md` reaches the live parking + preplan graph (ongoing arcs / future arcs / recently-opened reference parking files; in-progress sections reference preplans).

Without HANDOVER as a root, parking and preplan files would always look orphaned.

### Header-string detection for the spider-web walk

The two-table grammar uses standardized header strings (`## Documentation index`, `## Subsystem scopes`). The walk identifies tables by these headers (case-sensitive). Markdown table parsing is straightforward once the header anchors are locked.

### Phase 1 / Phase 2 step placement for the new checks

| Check | Phase | Step suggestion |
|---|---|---|
| Birth check (3-field announcement on `.md` Write) | Session-time at Write | Implementation choice: tool-use hook OR convention enforced by Claude. Phase 1 wrap-up catches misses via index walk. |
| Index integrity walk | Phase 2 | New step between current Step 1 (existence check) and Step 2 (lifecycle pressure) |
| Orphan detection | Phase 2 | Same as index walk; runs in same step or immediately after |
| Decommission check | Phase 2 | New step at end of Phase 2, before memory updates |

Exact step numbering is the skill-session's call; what matters is the ordering relationships.

### The four structural checks layer ON TOP of existing Phase 1 + Phase 2 steps

The 2026-04-29 spec's Phase 1 + Phase 2 structure is preserved. Structural checks add to it; they don't replace the existing freshness sweep / HANDOVER triage / friction journal / memory hygiene / git state / existence check / lifecycle pressure / OVERVIEW diagnostic / memory updates flow.

---

## Out of scope

- **The docs-check skill update itself.** Doctrine is here; mechanics are deferred to the skill-session per amendment #10.
- **The qw-oracle pilot CLAUDE.md files.** Restructure + nested CLAUDE.md authoring happens in a dedicated qw-oracle session after the skill update lands.
- **Editing the 2026-04-11 or 2026-04-29 specs.** Both are the trail of doctrine evolution. This spec extends them; neither gets modified.
- **Auditing other monorepo apps (slipgate / quad / qw-stats / matchscheduler / packages).** Lazy adoption per amendment #10's rollout sequence.
- **Migrating existing artifact-shaped folders.** Grandfather clause per amendment #1; no rename pressure on `apps/qw-oracle/docs/reviews/` or any future discoveries.
- **Retroactively classifying existing authored docs.** The 3-field announcement (amendment #7) is forward-going. Existing authored docs surface via the first-run orphan check (skill-session detail) and get classified in bulk.
- **Memory directory consolidation.** Sibling concern from the 2026-04-29 spec, deferred to its own brainstorm. Not coupled to this arc.
- **Cross-app standardization beyond what amendment #5 mandates.** The two-table grammar + standardized headers are required; any further uniformity (section ordering, length caps, voice norms) is out of scope unless an amendment explicitly calls for it.
- **Replacing the auto-memory four-type model.** Memory continues per the harness's auto-memory section; nothing in this spec changes how user / feedback / project / reference memories work.

---

## Related docs and dependencies

- **Origin doctrine** — `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md` (quartet, Layer 2 menu, lifecycle states). Extended, not modified.
- **Mode→Phase rewrite** — `docs/superpowers/specs/2026-04-29-docs-system-redesign-design.md` (Phase 1 + Phase 2, HANDOVER docket, parking/). Extended, not modified.
- **Current docs-check skill** — `~/.claude/skills/docs-check/SKILL.md`. Will be updated in the skill-session per amendment #10 step 3.
- **Doctrine reference loaded by the skill** — `~/.claude/skills/docs-check/references/doc-philosophy.md` and `references/doc-template.md`. Will be updated in the skill-session.
- **Memory pointer** — `project_doc_philosophy.md` in the user's auto-memory dir. Will be updated post-spec to flip "Pending amendments arc 2026-04-30" to "Shipped amendments arc 2026-04-30" and add a pointer to this spec.
- **Brainstorm origin** — 2026-04-30 housekeeping session that surfaced the qw-oracle scatter. Captured in `project_doc_philosophy.md` "Pending amendments arc" section; this spec resolves that section.
