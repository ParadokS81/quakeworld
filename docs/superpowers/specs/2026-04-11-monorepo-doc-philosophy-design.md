---
Doc type: current — Design spec. Delete/archive once implementation plan and deliverables land.
---

# Monorepo Documentation Philosophy — Design Spec

**Date:** 2026-04-11
**Status:** Approved — ready for implementation plan
**Scope:** Unified doc template for all apps + monorepo root + refactor of the `docs-check` skill
**Supersedes:** `docs/doc-philosophy-workshop.md` (delete after this spec lands its artifacts)

---

## Problem

The monorepo hosts five apps (`matchscheduler`, `quad`, `qw-stats`, `slipgate-app`, `qw-oracle`) that were built independently and merged into this monorepo ~2 weeks ago. Each app evolved its own doc structure. A thin audit across all five + the cross-project layer revealed:

- **`CLAUDE.md` is universal (5/5)** — uncontroversial.
- **`OVERVIEW` is the biggest real gap.** Only slipgate-app has a dedicated living map. The other four have nothing that answers "what's in this project right now, where do I find things?" When Claude cold-starts in any of them, it reconstructs the map from code every session.
- **`VISION` is fragmented.** No project has a clean, dedicated vision file. It's either absent, aspirational-drifting, or buried inside a 2339-line `Pillar 1 - PRD.md` or mixed into a `plan.md`.
- **`CLAUDE.md` bloat is diagnostic of missing conditional docs.** `qw-stats` is 332 lines because it absorbs DEVELOPMENT + HEALTH + architecture + data-model content that should be separate files. `qw-oracle` is 192 lines for the same reason. Healthy projects (`mss` 58, `quad` 76, `slipgate` 79) split content across conditional docs.
- **Feature specs, slice docs, and phase docs** accumulate organically and don't fit a flat `docs/` model — `mss` has 84 slice files in `context/slices/`, `quad` has `docs/multi-clan/` + `mumble/` + `auto-record/` trees with phases and contracts. These aren't docs in the template sense; they're work artifacts.
- **Cross-project docs have no consistent home.** `contracts/CROSS-PROJECT-SCHEMA.md` does real work (mss↔quad data contract) but `packages/qw-knowledge` and `packages/qw-config` have no README at all despite being consumed across apps.

The deeper problem: ParadokS is a vibe coder. He doesn't know what docs software projects traditionally have, so he can't ask Claude to maintain them. Without a fixed template, every session invents its own conventions, and the docs drift or don't exist. Without a maintenance skill, even good docs rot.

The fix is **one template for all projects** (content scales, structure is constant) **plus one skill** (end-of-session ritual that keeps docs honest using cognitive triggers, not regex).

## Goals

1. Define a universal doc template that all five apps can adopt without forcing identical shapes.
2. Give ParadokS concrete vocabulary for conditional docs so the "which docs do I need?" decision stops being opaque.
3. Define a `docs-check` skill that runs at end-of-session and uses Claude's own session context (not diff regex) to decide what needs updating.
4. Stay compatible in spirit with the emerging slipgate web framework (`github.com/quakeworld/slipgate`, cloned to `research/repos/slipgate` for reference) so there's no rival-religion clash when ParadokS eventually contributes there.
5. Keep migration lazy — no retrofitting all five apps today. The skill nudges projects into compliance when Claude next works in them.

## Non-Goals

- **Slipgate web alignment or replication** — that's a separate repo with its own framework being built by vikpe + infiniti. We stay compatible in spirit (philosophy skills, voice, README convention) but we don't copy their structure wholesale.
- **Matchscheduler doc cleanup** — matchscheduler is effective-legacy. It will be rebuilt inside slipgate web. No retroactive doc work here.
- **Retrofitting all apps today** — the skill handles migration lazily when Claude next enters each project.
- **Defining feature spec conventions** — how `slices/`, `phases/`, `pillars/`, `contracts/` are organized is project-specific. The template only requires that the project's `CLAUDE.md` points to the folder.
- **Replacing the superpowers plugin** — this is an addition, not a replacement. Skills like brainstorming, writing-plans, and executing-plans remain in use.

---

## Core principles

**1. Docs are optimized for Claude's navigation, not for the user's bookshelf.** ParadokS is the product owner; Claude is the engineer. Docs exist to help Claude do better work, not to decorate the repo.

**2. Docs preserve INTENT; code preserves STATE.** Code answers "what is this doing?" Git log answers "when did this change?" Docs answer "why is this the way it is?", "what were we trying to build?", "what did we try and reject?" If a doc's content could be fully reconstructed from code, it's redundant scaffolding. If it can't, it's load-bearing.

**3. Template is structure, not graduation.** Every project has the mandatory docs, period. A 30-line OVERVIEW and a 363-line OVERVIEW are both valid — the structure is constant, the content scales. Recipe book analogy: a one-egg recipe and a 20-ingredient recipe use the same template.

**4. Conditional docs are a menu, not a checklist.** No project gets zero Layer 2 docs. No project gets all of them. Each project picks the subset its actual shape demands, based on concrete triggers.

**5. `CLAUDE.md` bloat is a symptom.** When it grows past ~150 lines, the cause is almost always "a conditional doc that should exist, doesn't." The skill treats bloat as diagnostic, not cosmetic.

**6. Skills and path-scoped rules are extensions, not replacements.** A project that has subsystem-specific rules uses `.claude/rules/*.md` or a nested `CLAUDE.md`, not a bloated root `CLAUDE.md`.

**7. The skill uses cognitive triggers, not regex.** Diff parsing is fragile (false positives, false negatives, no intent). The skill prompts session-end Claude with a checklist and lets Claude's session context answer.

---

## Layer 1 — The mandatory quartet

Every project has ALL four files. The template is constant; content scales with project size.

### `CLAUDE.md` — rules + index

**Question answered:** What rules apply when I work here, and where do I find things?

**Audience:** Claude, every session (loaded automatically).

**Target length:** Under 150 lines. Under 100 ideally.

**What goes in:**
- Project name and one-line identity
- **Lifecycle status header** (line 1 or 2): `Status: Active / Maintenance / Paused / Legacy / Planning`
- "Where to find things" table pointing to README, VISION, OVERVIEW, and any Layer 2 / Layer 3 docs that exist
- Tech stack table
- Always-on rules (tooling conventions, code style, naming, never-do's)
- Any `@imports` for always-loaded skills (philosophy or project-specific)

**What does NOT go in:**
- Project map / feature list → that's `README.md` / `OVERVIEW.md`
- Detailed architecture → that's `OVERVIEW.md` or Layer 3 reference docs
- Historical context → that's `VISION.md`
- Multi-step procedures → those become skills
- Subsystem-specific rules → path-scoped `.claude/rules/*.md` or nested `CLAUDE.md`

**Update cadence:** Rarely. When a core rule changes or a doc is added to the index.

### `README.md` — elevator pitch

**Question answered:** What is this project, who is it for?

**Audience:** Humans and cold Claude sessions landing on the repo for the first time.

**Target length:** 50-150 lines. One scroll.

**What goes in:**
- One-line description
- Tech stack summary
- Status badge / life-stage
- A brief "what it does" paragraph or bullet list
- Pointers to VISION, OVERVIEW, and any public docs
- If the project is public: install/quickstart

**What does NOT go in:**
- Detailed feature lists (that's OVERVIEW)
- Rationale and history (that's VISION)
- Code landmarks (that's OVERVIEW)

**Update cadence:** Rarely. The pitch doesn't change unless the project's identity changes.

### `VISION.md` — why this exists

**Question answered:** Why does this project exist? What were we trying to build and for whom? What constraints shaped it?

**Audience:** Future Claude sessions, future collaborators, ParadokS after a three-month break.

**Target length:** 50-200 lines. Written once.

**What goes in:**
- The problem statement
- Who the project is for (personas, community)
- The design intent (what we chose and why)
- Alternatives considered and rejected
- Non-goals (what this is intentionally NOT)
- Values / philosophy specific to this project

**What does NOT go in:**
- Current feature state (that's OVERVIEW)
- Roadmap / what's next (that's OVERVIEW or a separate roadmap)
- Implementation details (those are code)

**Update cadence:** Once at project start. Update only when the fundamental intent changes (rare).

### `OVERVIEW.md` — living map

**Question answered:** What's in this project right now, where do I find things?

**Audience:** Claude returning to the project, needing to reason about current state.

**Target length:** No cap. Scales with project size. qw-oracle's might be 30 lines, slipgate-app's is 363.

**What goes in:**
- "What the project is" summary (1 paragraph)
- Features that currently exist (grouped by area, not flat list)
- Code landmarks — "if I want to change X, look at Y"
- Parked-with-purpose items (stubs, POCs, deferred work) with rationale
- True cruft (safe to delete) if identified
- Integration points with siblings
- Tech landmarks (the files that matter most)
- What this doc intentionally does NOT cover (with pointers to the docs that do)

**What does NOT go in:**
- Why it exists (that's VISION)
- Tech debt severity (that's HEALTH)
- Historical decisions (that's VISION or commit messages)

**Update cadence:** When features land or the map changes materially. The skill's Mode 2 (freshness) is responsible for keeping this honest.

**Voice example (from `slipgate-app/docs/OVERVIEW.md`):**
> *"The ConfigViewer subsystem is the biggest feature in the app by far — 20+ components, ~3,000 lines. Lives in `src/components/Config*.tsx` + `CvarRow.tsx` + `CvarTooltip.tsx` + `configMerger.ts` + `AliasChainResolver.tsx`. Rendered inside MyQuakeTab's 'Config' sub-tab."*

Plain English. Names the files. Doesn't hide from size. Reads naturally top-to-bottom.

---

## Layer 2 — Standard conditional docs

A menu of eight. Each project picks the subset that matches its shape. Triggers are cognitive (the skill asks Claude to answer), not regex. No project has zero; no project has all eight.

### `DEVELOPMENT.md` — run/build/test locally

**Trigger:** Dev setup is non-trivial (WSL/Windows split, emulators, GPU deps, specific runtime versions, package managers beyond defaults).

**Content:** Prerequisites, setup steps, common commands (run/build/test/lint), environment variables, gotchas, troubleshooting. Assume the reader is a fresh Claude session trying to verify the project builds.

**Which projects need one:** Slipgate-app ✓ (WSL+Windows rsync hook). Mss ✓. Quad needs one (only has CLI command stubs). qw-stats needs one (currently folded into bloated CLAUDE.md). qw-oracle needs one.

### `DEPLOYMENT.md` — ship to production

**Trigger:** Project has a real deploy target.

**Content:** Target platform, build commands, required env vars and secrets, release flow, verification steps, rollback. If secrets live in a vault or .env file, document WHERE (not the secret itself).

**Which projects need one:** Slipgate-app ✓, mss ✓, quad ✓, qw-stats ✓ (currently gitignored for secrets). qw-oracle no (local-only).

### `SCHEMA.md` — data model

**Trigger:** Project has a database or durable data model — SQL tables, Firestore collections, SQLite schema, protocol buffers, profile file format.

**Content:** Entity list, relationships, field types, constraints, indexes, migrations policy. Name the tool/ORM used (Prisma, Drizzle, raw SQL, Firestore SDK).

**Which projects need one:** Mss ✓ (867-line context/SCHEMA.md). Qw-stats ✓ (DATABASE-SCHEMA.md). Quad needs one (Firestore collections are scattered across phase docs). Qw-oracle needs one (currently folded into CLAUDE.md). Slipgate-app no (Tauri + local JSON, no DB).

### `API_CONTRACTS.md` — API boundaries

**Trigger:** Project exposes or depends on an API surface — HTTP endpoints, gRPC, IPC channels, third-party SDKs (Discord gateway, Firebase SDK, GitHub Releases API, ezQuake mailslot), Tauri commands.

**Content:** Each boundary: what it is, who talks to it, the exact shape (URL + method + request/response schemas, or command signature + args/return), error contract, rate limits, auth model.

**Which projects need one:** Qw-stats ✓ (has API-GUIDE.md doing this job). Slipgate-app needs one (external API deps scattered across AUTH.md + CFG-PARSER.md + implicit in updater.rs). Quad needs one (Discord gateway + Firestore boundary). Mss ✓ (partially via SCHEMA + cross-project contracts). Qw-oracle no (no API boundary yet).

### `AUTH.md` — login, sessions, permissions

**Trigger:** Project has login, user sessions, or role-based access control.

**Content:** Auth provider (Discord OAuth, Firebase Auth, etc.), token/session lifecycle, user roles, what happens to unauthorized access, how tokens are stored client-side, CSRF/state protection, refresh flow.

**Which projects need one:** Slipgate-app ✓. Mss ✓ (Firebase Auth). Quad no (bot identity, not user auth). Qw-stats no. Qw-oracle no.

### `DESIGN.md` — UI design system

**Trigger:** Project has a UI with visual rules worth protecting (color tokens, typography, layout primitives, component library).

**Content:** Design tokens (colors, spacing, type), layout primitives, component conventions, what to use vs. what to avoid ("no hardcoded hex", "use DaisyUI semantic classes"), theming approach.

**Which projects need one:** Slipgate-app ✓ (OKLCH tokens). Mss ✓ (sacred 3x3 grid layout, CSS/JS ownership). Quad no. Qw-stats no. Qw-oracle no.

### `STATE.md` — frontend state management

**Trigger:** Frontend has complex cross-page or shared state (stores, global signals, persistent local state, sync patterns with backend).

**Content:** Which tool manages state (Zustand, Solid store, Alpine store, Pinia, Redux, React Context), store shape, update rules, derived state patterns, persistence rules, the "don't do X because it'll break reactivity" gotchas.

**Which projects need one:** Slipgate-app ✓ (SolidJS + tauri-plugin-store with schema migration). Mss potentially (Alpine + Firestore listener cache pattern, already partially documented in public/CLAUDE.md). Quad no (backend). Qw-stats no (backend). Qw-oracle no.

### `HEALTH.md` — tech debt snapshot

**Trigger:** Project has accumulated enough state that a one-shot audit produces real value.

**Content:** A point-in-time snapshot. Risks / debt / nice-to-have with severity. NOT maintained in place — regenerate a new one when you want a fresh snapshot.

**Which projects need one:** Slipgate-app ✓ (as of 2026-04-10). None of the others have earned one yet — they're either too small, too stable, or too paused.

---

## Layer 3 — Domain reference docs

**Conceptually:** deep permanent background on subsystems or domains that are specific enough to need their own file, but not in Layer 2's standard menu.

**No fixed naming convention.** Each doc is named for what it explains.

**What qualifies:**
- Deep subsystem background that is irreducible (can't be split into smaller docs)
- Permanent — doesn't rot unless the subsystem is rewritten
- Referenced from the subsystem's code and from `CLAUDE.md`'s index

**Examples from the current monorepo:**
- slipgate-app: `CFG-PARSER.md`, `EZQUAKE-RESOLUTION.md`, `SYSTEM-SPECS.md`, `PERIPHERAL-SELECTOR.md`
- qw-stats: `RESEARCH-RANKING.md`, `RESEARCH-IDENTITY.md`, `ALIAS-RESOLUTION-RESEARCH.md`, `IDENTITY-SEEDS.md`

**How the skill treats them:** Mode 1 does not enforce Layer 3. It may *suggest* one when the session reveals a subsystem is getting too dense for the OVERVIEW to carry — but creation is the operator's call.

---

## Nested `CLAUDE.md` and path-scoped rules

When a project has subsystem-specific rules that don't belong in the root `CLAUDE.md`:

**Option A — Nested `CLAUDE.md`**: Place a `CLAUDE.md` inside the subsystem directory (e.g., `apps/matchscheduler/public/CLAUDE.md`). Anthropic's memory system loads it automatically when Claude works in that directory, concatenated with the project-root `CLAUDE.md`.

**Option B — Path-scoped rules file**: Place a file under `.claude/rules/*.md` with `paths:` frontmatter (e.g., `paths: ["src-tauri/src/commands/ezquake.rs"]`). Loaded only when matching files are touched.

**When to use which:**
- Nested `CLAUDE.md` for subsystems that are whole directories (`public/`, `rust/`, `web/`)
- Path-scoped rules for individual large files or narrow subsystems

**When to just use the root:** If the subsystem has fewer than ~20 lines of rules, keep them in the root `CLAUDE.md`. Don't fragment prematurely.

---

## Cross-project documentation layer

The monorepo root itself is treated as a "project" for template purposes, but with adjustments:

- **`CLAUDE.md`** (root) — the orchestrator. Rules that apply across ALL apps + a project map + integration overview + pointers to per-app CLAUDE.md files. **Target length: <100 lines** (currently 166; needs slimming).
- **`README.md`** (root) — the monorepo's elevator pitch.
- **`OVERVIEW.md`** (root) — the integration map: how apps relate, which shared collections exist, cross-project data flow.
- **`VISION.md`** (root) — why the monorepo exists and what it's converging toward.

**What moves OUT of the root `CLAUDE.md`** to shrink it:
- The full project map → into `README.md` (landing) and `OVERVIEW.md` (map)
- The integration diagram → into `OVERVIEW.md` or `contracts/README.md`
- Planning-first workflow / bug triage / testing rules → into a monorepo-level skill (see `docs-check` section below)
- Community experts list → into `people/README.md`

**`contracts/`** stays as-is. It holds cross-project data contracts (`CROSS-PROJECT-SCHEMA.md`), active cross-project specs (`contracts/active/`), and completed specs (`contracts/completed/`). Add a `contracts/README.md` as the index.

**`packages/*`** currently has no READMEs. Every shared package gets its own README (at minimum), following the same template. `packages/qw-knowledge/README.md` and `packages/qw-config/README.md` should be created when those packages are next touched.

---

## Philosophy skills (adopted from slipgate web)

Two always-loaded mindset documents, copied from vikpe's slipgate web repo under a compatible license (public-principles-level content, not proprietary).

**`/.claude/skills/philosophy/grug-brain.md`** — Principles from grugbrain.dev: complexity is the apex predator, factor slowly, don't over-DRY, Chesterton's fence, fear concurrency, grug-brained development wins.

**`/.claude/skills/philosophy/philosophy-of-software-design.md`** — Principles from John Ousterhout's book: strategic vs. tactical, deep modules, information hiding, pull complexity downward, define errors out of existence, comments explain why.

Both are referenced via `@import` from the monorepo-root `CLAUDE.md`:
```
## Shared philosophy

@/.claude/skills/philosophy/philosophy-of-software-design.md
@/.claude/skills/philosophy/grug-brain.md
```

**Why adopt these:** They encode good thinking patterns that apply to every project. They're short (~50-100 lines each). They give the monorepo instant philosophical alignment with slipgate web (same sources). They counter Claude's default bias toward over-abstraction.

---

## Output discipline rules

Added to the monorepo-root `CLAUDE.md` under `## Output discipline`:

```
- Answer briefly and objectively.
- Never guess — if unsure, say so.
- ASCII only: no em dashes, smart quotes, or Unicode decorations.
- Never express emotions; no filler sentences.
- Comments explain *why*, not *what*.
```

These fight Claude's default verbosity. Adopted wholesale from slipgate web's root `CLAUDE.md`. The user has agreed to stricter output discipline — including in how Claude addresses him in conversation, not just in code comments.

---

## Lifecycle status header

Every `CLAUDE.md` (project-level AND monorepo-root) declares its lifecycle status in the first 1-2 lines:

```
**Status:** Active development.  (90% focus, expect rapid churn)
**Status:** Maintenance.          (stable, occasional patches)
**Status:** Paused.               (on hold, will return)
**Status:** Legacy.               (will be replaced; don't invest)
**Status:** Planning.             (no code yet, only intent)
```

**Why this matters:** The docs-check skill uses this to calibrate pressure. Active projects get strict nudges ("you shipped a feature but OVERVIEW wasn't touched — fix now"). Paused projects get passive flagging ("noted gap, will remind when you return"). Legacy projects get zero nudges.

**Current states (as of 2026-04-11):**
- slipgate-app: Active
- matchscheduler: Maintenance (effective-legacy, will be rebuilt in slipgate web)
- quad: Maintenance (stable, integration-critical)
- qw-stats: Paused (returning eventually)
- qw-oracle: Paused (ambitious, planning-heavy before next push)
- monorepo root: Active (this spec IS the active work)

---

## The `docs-check` skill — two modes

The existing `docs-check` skill (v0.1 draft at `~/.claude/skills/docs-check/SKILL.md`) is refactored to run at end-of-session with two distinct checking modes.

### Mode 1 — Trigger-based enforcer (Layer 2)

Uses a cognitive checklist, not regex. The skill prompts session-end Claude with each Layer 2 trigger and lets Claude's session context answer.

**Checklist (Claude answers each from session memory):**
1. Did this session add or change a database schema, Firestore collection, or durable data model? → If yes, ensure `SCHEMA.md` exists and reflects the change.
2. Did this session touch an API boundary, new external SDK, Tauri command, or cross-project IPC? → Ensure `API_CONTRACTS.md` exists and is current.
3. Did this session touch auth, sessions, tokens, or role checks? → Ensure `AUTH.md` covers it.
4. Did this session add UI components, color tokens, or layout rules? → Ensure `DESIGN.md` reflects them.
5. Did this session add global state, store migrations, or cross-page sync logic? → Ensure `STATE.md` exists.
6. Did this session change how to run, build, or test the project? → Ensure `DEVELOPMENT.md` is current.
7. Did this session touch deploy config, CI, or release flow? → Ensure `DEPLOYMENT.md` is current.
8. Did this session reveal tech debt worth a snapshot? → Offer to generate a fresh `HEALTH.md`.

**Action:** If Claude answers "yes" and the corresponding doc is missing or stale, the skill prompts to create/update BEFORE closing out. It does NOT auto-write — the operator decides.

### Mode 2 — Freshness-based cartographer (Layer 1)

Handles the living map (OVERVIEW.md). Instead of triggers, it uses momentum.

**Checklist (Claude answers each):**
1. Was `OVERVIEW.md` touched in this session?
2. Did features land in this session that belong on the OVERVIEW map?
3. Did Claude reconstruct the project layout from code more than twice this session? (Symptom: OVERVIEW is stale or incomplete.)
4. Was anything learned this session that should go in `VISION.md`? (Rare — intent changes.)
5. Were there session frictions worth capturing as memory or as a new skill?

**Action:** If OVERVIEW drift is detected, the skill offers to rebuild the relevant section. If VISION needs an addendum, propose it. If frictions surfaced, offer to save memory updates or flag a skill opportunity.

### Shared behavior

- **Runs at end-of-session** when the user signals wrap-up (per the skill's existing trigger language).
- **Respects lifecycle status** — active = strict, paused = passive flagging, legacy = no nudging.
- **Saves memory updates AFTER doc updates** so anything surfaced during the ritual feeds into memory.
- **Reports with structured sections** — A. Trigger checks (Layer 2), B. Freshness checks (Layer 1), C. Memory updates, D. Skill opportunities / frictions.
- **Never auto-commits.** Doc changes land as regular edits the operator can review before committing.

---

## Migration plan

**No retrofitting today.** The skill handles migration lazily as Claude enters each project.

**Priority order when Claude next works in a project:**

1. **slipgate-app** (Active): Already has most of the quartet via today's audit (`CLAUDE.md`, `VISION.md`, `OVERVIEW.md`, plus Layer 2 docs). Needs: write `README.md`, add `STATE.md` (SolidJS store + tauri-plugin-store schema migration cross the complexity threshold), verify existing docs against this final template. `DESIGN.md` stays as-is (no rename).
2. **Monorepo root** (Active): Apply the slim target (root `CLAUDE.md` → <100 lines). Move project map to root `README.md` + `OVERVIEW.md`. Add philosophy skills via `@import`. Add output discipline rules. Write monorepo `VISION.md` and `OVERVIEW.md`.
3. **quad** (Maintenance): Next session there should produce `README.md` + `VISION.md` + `OVERVIEW.md`. The existing `CLAUDE.md` is healthy. Add `SCHEMA.md` (Firestore collections, currently scattered across phase docs) and `API_CONTRACTS.md` (Discord + Firestore boundary).
4. **qw-stats** (Paused): When next touched — split the 332-line `CLAUDE.md` into `CLAUDE.md` (lean rules) + `DEVELOPMENT.md` + `HEALTH.md` + `VISION.md`. `API-GUIDE.md` renames to `API_CONTRACTS.md`. Existing `DATABASE-SCHEMA.md` renames to `SCHEMA.md`.
5. **qw-oracle** (Paused): When next touched — add `README.md` + `VISION.md` + `OVERVIEW.md`. Split `CLAUDE.md` into lean rules + `DEVELOPMENT.md` + `SCHEMA.md`. Existing `plan.md` content merges into `VISION.md` + `OVERVIEW.md`.
6. **matchscheduler** (Legacy): No active migration. Skill runs in passive-flag mode only. The project will be rebuilt inside slipgate web.

**Cross-project:**
- Add `packages/qw-knowledge/README.md` and `packages/qw-config/README.md` when those packages are next touched.
- Delete `HANDOFF.md` at monorepo root (stale scaffolding from migration).
- Delete `docs/doc-philosophy-workshop.md` once this spec's deliverables are live.

---

## Deliverables

**Three artifacts to produce from this spec:**

1. **Philosophy reference** → `~/.claude/skills/docs-check/references/doc-philosophy.md`. Short, opinionated. ~50-80 lines. Codifies the 7 core principles, the quartet, the layer model, and how the skill uses cognitive triggers. Referenced by the docs-check skill.

2. **Template reference** → `~/.claude/skills/docs-check/references/doc-template.md`. A menu: for each doc in Layer 1 + Layer 2 + Layer 3 pattern — question answered, what goes in, what doesn't, voice example, approximate length. ~200-300 lines.

3. **Refactored `docs-check` skill** → `~/.claude/skills/docs-check/SKILL.md`. Rewritten to implement the two modes described above, with lifecycle-aware pressure and a structured A/B/C/D report. References artifacts (1) and (2) as its source of truth.

**Out-of-band:**
- Copy (or write from scratch, crediting vikpe) the two philosophy skill files into `/.claude/skills/philosophy/`.
- Slim the monorepo-root `CLAUDE.md` to <100 lines; add output discipline + `@imports` for philosophy.
- Write monorepo-root `README.md`, `VISION.md`, and `OVERVIEW.md`.
- Delete `docs/doc-philosophy-workshop.md` and `HANDOFF.md` once the spec deliverables are live.

---

## Validation checklist

Before marking this spec implemented, verify:

- [ ] Every app that's been touched post-spec has the Layer 1 quartet
- [ ] No `CLAUDE.md` exceeds 150 lines (target <100)
- [ ] Monorepo-root `CLAUDE.md` has `@import`s for the two philosophy skills
- [ ] Monorepo-root `CLAUDE.md` has the output discipline rules
- [ ] Every `CLAUDE.md` declares lifecycle status in the first 2 lines
- [ ] `docs-check` skill produces an A/B/C/D structured report when invoked
- [ ] `docs-check` skill reads the philosophy + template reference files as its source of truth
- [ ] The old `doc-philosophy-workshop.md` and `HANDOFF.md` are deleted
- [ ] `research/repos/slipgate/` is in `.gitignore` or covered by `update-repos.sh` (it was cloned for reference; treat same as other research repos)

---

## Resolved decisions

All previously-open questions were resolved during spec review:

- **Philosophy skills location:** Monorepo-scoped at `/.claude/skills/philosophy/`. Rationale: the repo must be self-contained so a fresh clone on another machine (or a human contributor) works without depending on `~/.claude` user-global state. Environment drift is the bigger risk.
- **Philosophy skills copy-vs-symlink:** Copied, not symlinked. Symlinks inside monorepos break across OS boundaries (relevant here because of the WSL/Windows split for slipgate-app).
- **`DESIGN.md` vs `DESIGN_SYSTEM.md`:** Stays `DESIGN.md`. Shorter, zero migration cost, slipgate-app already uses it.
- **`qw-stats/API-GUIDE.md` rename to `API_CONTRACTS.md`:** Yes, but lazily — next time Claude touches qw-stats. Consistency across monorepo Layer 2 vocabulary is worth the small rename.
- **Does slipgate-app need `STATE.md`?** Yes. SolidJS stores + `tauri-plugin-store` schema migrations cross the complexity threshold. A cold agent needs to know how the frontend state syncs with the Rust backend without breaking reactivity. Added to the slipgate-app migration step above.

---

## What comes next

After this spec is approved:

1. **Implementation plan** via `writing-plans` skill — breaks the deliverables into ordered, reviewable steps.
2. **Execution** of that plan via `executing-plans` or `subagent-driven-development`.
3. **Lazy migration** as Claude returns to each project in the migration priority order.

The three deliverables (philosophy ref, template ref, refactored skill) should be producible in a single focused session after plan approval. The monorepo-root doc cleanup (slim CLAUDE.md, write README/VISION/OVERVIEW) is a second session. Per-app migration is lazy.
