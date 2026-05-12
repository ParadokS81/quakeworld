# QWiki sandbox -- arc-planner handoff (post-Pass-6, brainstorm DONE)

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

The qwiki-sandbox brainstorm is DONE. Six conceptual passes locked across 2026-05-09 through 2026-05-12. Vision spec is the load-bearing artifact. Arc-planner takes over from arc-brainstormer at this handoff: scaffold the first downstream arc (baseline substrate), then the Modes mini-arc, then subsequent per-domain mini-arcs as priorities decide.

This replaces the Pass 6 handoff (`2026-05-12-qwiki-sandbox-pass6-handoff.md`) as the active entry point. The pass-tracker memory `project_qwiki_sandbox_passes.md` Active-handoff pointer points here now.

---

## Where things are

**Brainstorm output (load-bearing inputs to arc-planner):**

- **Vision spec:** `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` -- 6 passes LOCKED end-to-end. Pass 6 closed 2026-05-12.
- **Visual companion:** `docs/superpowers/specs/2026-05-11-qwiki-nav-and-page-structure-sketch.html` (v3 2026-05-12) -- 6-tile nav + Modes Layer B example + Hoonymode Layer C mockup with bones+slots tagged.
- **Old architecture spec (superseded by pivot):** `docs/superpowers/specs/2026-05-09-qwiki-sandbox-architecture.md` -- modernize-in-place plan; obsolete.
- **Pass tracker memory:** `project_qwiki_sandbox_passes.md` (full locked-principles cross-pass list; brainstorm DONE status).
- **Content analysis:** `docs/research/2026-05-09-qwiki-content-analysis.md` -- empirical wiki state (51% stubs / 63% stale 5+ years / 5,903 player pages / 679 substantial articles). Drove the fresh-build pivot.
- **Original parking doc:** `docs/superpowers/parking/2026-05-09-qwiki-sandbox-arc-planning-handover.md` -- pre-brainstorm arc-classifier output.

**Arc-planner-relevant exemplar:** `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` -- canonical six-artifact arc scaffold (README / decisions / phase-template / handoff-prompt / prerequisites / per-phase MDs). Crib the shape.

---

## What's locked from Passes 1-6 (don't relitigate)

**Pass 1-3 substrate (load-bearing summary):**

- Federation-with-peers ecosystem. quake.world umbrella hosts wiki / hub / assets / servers / tools / tournaments / frontpage. Oracle + parsers + Discord + (deprioritized) forum are peers.
- Three-category wiki role: Cat 1 cede fully (clans / players / tournaments / maps / per-asset; wiki transitional only where dual-purpose) / Cat 2 wiki permanent (modes / mechanics / distributions / tutorials / lore / columns) / Cat 3 no knowledge ownership (servers / tools).
- Author-once-harvest-many. Wiki is upstream of Oracle Layer 3 / hub / future AI services.
- (C-prime) loose-coupling: v1 link-only, no sync; schema-bones in transitional pages designed sync-shaped for future opt-in.
- 2-4 active editors, NOT 30 organic. Thin-but-active.
- Concrete contributor pool: Alice / Link / Carapace / mystery Russian / tournament organizers.

**Pass 4 (SHOULD list + page-types):**

- 6-entry SHOULD list = 6-tile main-page nav 1:1: Modes / Game Content / Distributions / The Scene / Tutorials / Community & Lore.
- Cut-axis: cross-entity OR no entity-owner.
- Baseline-plus-deviations pattern. External-match-link slot (hub game ID).
- 12 page-types from 4.3 (mode / mechanic / item / weapon-baseline / distribution / server-admin-overview / hof-league / player / clan / tutorial / article / glossary).
- 5 schema-enforced page-type exclusions (per-Map / per-Asset / News / per-Season-Historical-Tournament / per-Match).
- Track C manual-curator-friendly disciplines (section-as-atom / self-contained / L1-L3 cross-refs / citations).
- URL preservation policy locked in 4.6.

**Pass 5 (contributor model):**

- V1 = invite-only beta, not low-barrier signup. Low-barrier is end-state.
- MW PluggableAuth + Discord OAuth extension handles auth. Quad does NOT provision MW accounts.
- `wiki-contributor` MW group auto-assigned via Discord-role-as-OAuth-claim (`@wiki-beta` -> `wiki-contributor`).
- Gate-level taxonomy per page-type: 3 strict-form / 8 form+slots / 1 free-form. Slot specifics iterate post-mockup.
- `wiki-curator` MW group with elevated permissions. v1 = 1-2 curators.
- Curator scope: content quality / cross-page coherence / currency review / Layer 3 harvest / spam response / template maintenance. NOT structural drift (forms handle).
- Quality-tag system: `Category:Needs review` / `Category:Stale` / `Category:Draft`.

**Pass 6 (content strategy) -- the immediate input to arc-planning:**

- **6.1 Workflow shape.** Per-domain analyze -> plan-target -> plan-migration -> migrate -> verify cycle, backed by state-backed curator tooling cribbed from `apps/qw-oracle/scripts/curate-brands/` (three-column inventory -> triage -> sign-off, JSON-sidecar state, pauseable + resumable).
- **6.2 Priority order.** Modes first (vertical-slice proof; 27 pages bounded; full triage diversity; KTX source-code reference target). Subsequent order deferred post-Modes; candidate-next is Game Content. Pass 4 4.2 priority field = durable starting hypothesis.
- **6.3 Baseline substrate (4 items, reusable across all domains).**
  1. Wiki substrate: MW 1.39 LTS + Citizen + Page Forms + SMW + PluggableAuth + Discord OAuth + groups + quality-tag categories.
  2. URL slug discipline (authoring rule; redirect-from-old-domain infra is cutover-event work, not baseline).
  3. Layer 3 harvest path observable end-to-end (workflow exists per oracle's CLAUDE.md; baseline verifies via oracle MCP query).
  4. Hosting: MW Docker on Unraid + Cloudflare Tunnel + TLS + restricted URL (e.g. `wiki-beta.quake.world`). Backup inherited from existing Unraid -> Synology weekly cycle.
- **Skipped from baseline:** generic per-domain-tool framework (Modes curator becomes de-facto pattern).
- **Modes mini-arc (NOT baseline):** Mode page-type form + Modes Layer B category page + Modes curator instance + 27-mode triage cycle.

**Full locked-principles list lives in `project_qwiki_sandbox_passes.md`** (memory) and in the vision spec LOCKED sections.

---

## Arc-planning scope

**Plain English.** Two arcs to scaffold in immediate succession; subsequent arcs deferred.

**Arc 1 -- baseline substrate.** Scopes the 4 items in Pass 6 6.3. Phases likely:
- Phase A: MW + extensions Docker stack on Unraid (MW 1.39 + Citizen + PF + SMW; reachable via Cloudflare Tunnel at a restricted URL).
- Phase B: Auth + groups (PluggableAuth + Discord OAuth + `wiki-contributor` / `wiki-curator` + quality-tag categories).
- Phase C: URL slug discipline (template + form validation enforcing same-slug policy).
- Phase D: Layer 3 harvest path observable end-to-end (verify a manually-authored test page -> harvested .md -> oracle MCP query result).

**Arc 2 -- Modes mini-arc (vertical-slice).** Scopes the per-domain workflow on Modes specifically. Phases likely:
- Phase A: Mode page-type form + template + Modes Layer B category page.
- Phase B: Modes curator tool instance (cribbed from brand-curator pattern; populates with the 27 KTX modes inventory from the old wiki dump).
- Phase C: Triage 27 modes (extract / new-build / merge / abandon per-page).
- Phase D: Author Pass 1 (substantial v1 mode pages -- KTX flagship modes first).
- Phase E: Layer 3 harvest (curator distills mode-page sections into oracle concept-notes).
- Phase F: Vertical-slice verification (oracle MCP query returns harvested mode content).

**Slicing decision for arc-planner.** Two open candidates:
1. **Two separate arcs** (baseline as Arc 1; Modes as Arc 2). Cleaner unit-of-work boundaries; Modes arc starts only after baseline ships.
2. **One combined "v1 beta" arc** (baseline + Modes as phases in a single arc). Argues that baseline alone delivers no user-visible value; v1 beta is "wiki with Modes content," not "wiki with no content."

Arc-planner's call after slicing analysis (verification-regime + context-budget per phase + cross-phase coordination cost). Operator should weigh in at scaffold time.

**Subsequent per-domain mini-arcs (deferred):** Game Content / Distributions / The Scene (HoF + Players + Clans) / Tutorials / Community & Lore + Glossary. Each becomes its own arc-classifier candidate when prioritized post-Modes. Pass 4 4.2 priority field is durable starting hypothesis; actual order calcifies after Modes mini-arc teaches us.

---

## Reads required (priority order)

1. **This file (handoff).**
2. **`docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md`** -- full 6-pass LOCKED spec. MANDATORY.
3. **Memory: `project_qwiki_sandbox_passes.md`** -- pass-tracker + locked-principles cross-pass. MANDATORY.
4. **`docs/superpowers/plans/2026-05-02-qw-oracle-arc1/`** -- canonical six-artifact arc scaffold exemplar. Read `README.md` + `decisions.md` + `phase-template.md` + at least one phase MD + `handoff-prompt.md` for shape.
5. **`docs/superpowers/specs/2026-05-11-qwiki-nav-and-page-structure-sketch.html`** -- visual companion; reference for page-type shapes during slicing.
6. **`docs/research/2026-05-09-qwiki-content-analysis.md`** -- empirical wiki state; informs Modes-mini-arc inventory phase scope.
7. **`apps/qw-oracle/scripts/curate-brands/README.md`** + `index.html` -- curator-tool pattern; reference for Modes curator phase.
8. **`apps/qw-oracle/curated/concept-notes/CLAUDE.md`** -- Layer 3 harvest workflow; reference for vertical-slice verification phase.
9. **`/home/paradoks/projects/unRAID/docs/server/backup.md`** -- existing backup cycle; reference for hosting phase.

If short on time: 1, 2, 3, 4 are the minimum to scaffold.

---

## Critical rules (carry-forward + new)

**From Pass 6 reframe (durable):**

- **Per-domain content-source decisions don't pre-lock in arc-planning.** Each per-domain mini-arc has its own brainstorm pass with inventory in hand. Arc-planner names mini-arcs but does not pre-specify their per-page disposition.
- **Modes is the vertical-slice proof.** End-to-end pipeline observable from oracle MCP. Don't separate "wiki authoring" from "Layer 3 harvest" -- they ship together.
- **Backup is inherited from existing Unraid -> Synology cycle.** Do NOT scaffold a new backup phase.

**From Passes 1-5 (durable):**

- 6-entry SHOULD list = 6-tile nav 1:1. Locked direction.
- 12 page-types from Pass 4 4.3. Locked shape.
- 5 schema-enforced page-type exclusions. Locked.
- Track C 4 authoring disciplines bake into form/template/help-text. Locked.
- V1 = invite-only beta. Quad does NOT provision MW accounts. Locked.
- `wiki-contributor` + `wiki-curator` MW groups via Discord-role-as-OAuth-claim. Locked.
- Quality-tag system 3-tag set. Locked.
- Drop 5,000 player stubs entirely. Locked.

**Operator preferences (memory-anchored):**

- Momentum over ceremony.
- Plain English at decision points; technical chain after only where load-bearing.
- One question at a time during interactive scoping (multi-question turns allowed only at scaffold + plan-confirmation moments).
- Decisive recommendations with tradeoff, not multi-option menus.
- No subagents for mechanical edits (`feedback_no_subagents_for_mechanical_edits.md`). Apply when phase MDs are mechanical-edit-shaped.
- Scaffold-then-fan-out for multi-phase plans (`feedback_scaffold_then_fanout_for_multi_phase_plans.md`).
- ASCII-only in code and shared docs.
- Commit early.

**Arc-classifier mode for subsequent per-domain mini-arcs:** Mode D (direct -- operator already knows it's an arc), since the per-domain shape is established by Pass 6 6.1 workflow and each domain follows the same shape. arc-brainstormer pass within each mini-arc handles content-source decisions for that domain.

---

## First three actions

1. **Read this handoff (you're reading it).**
2. **Read the vision spec Pass 6 LOCKED + pass-tracker memory's Pass 6 summary** -- the immediate input to arc-planning.
3. **Invoke arc-planner.** Confirm the two-arc-vs-one-arc slicing question with the operator (Arc 1 baseline + Arc 2 Modes as separate, or one combined v1-beta arc with baseline+Modes phases). Then scaffold the six-artifact arc shape for the chosen unit(s).

---

## When in doubt

- **Tempted to reopen any Pass 1-6 locked decision** -> don't. Brainstorm is DONE. If a genuine conflict surfaces (Pass-K commitment contradicts arc-planning need), surface to operator before changing.
- **Tempted to pre-decide per-domain content-source / per-page disposition during arc-planning** -> halt. That's per-domain mini-brainstorm territory (within each mini-arc). Arc-planner names the mini-arcs, not their internal content decisions.
- **Tempted to scaffold subsequent per-domain mini-arcs (Game Content / Distributions / etc.) right now** -> don't. Order is deferred post-Modes. Arc-planner's immediate scope is baseline + Modes only.
- **Tempted to bundle backup tooling into baseline** -> don't. Existing Unraid -> Synology cycle handles it; new containers auto-included.
- **Tempted to bundle AI-agent steering into baseline** -> don't. Future architecture concern. `llms.txt` is the only candidate v1 add and it's optional.
- **Tempted to scaffold a custom CMS or bypass MW** -> don't. MW + Page Forms + SMW is the locked substrate. Liquipedia confirms the patterns are achievable.
- **Tempted to design "the perfect generic per-domain curator framework"** -> don't. Pass 6 explicitly skipped this from baseline. Modes curator is the de-facto pattern; later domains crib.

---

## Tooling state at handoff

- **mariadb container `qwiki-analysis`** still running locally with imported QWiki dump. Architecture passes will likely want it for inventory queries during Modes mini-arc's analyze phase. Operator can `docker rm -f qwiki-analysis` when ready to retire it.
- **Image tarball** at `apps/qwiki-sandbox/dumps/wiki-images.tar.gz` (6.4G), unextracted. Per-domain image migration is downstream; Modes may need a few screenshots, mass import deferred.
- **No fresh MW stack running yet.** Arc 1 (baseline substrate) Phase A kicks that off.
- **Brand-curator** at `apps/qw-oracle/scripts/curate-brands/` with `brand-curation-state.json` -- live precedent for per-domain curator tooling pattern.
- **Pass 4 visual companion HTML** at `docs/superpowers/specs/2026-05-11-qwiki-nav-and-page-structure-sketch.html` -- visual reference for page-type shapes.

---

## Context budget projection

Arc-planner scaffold for baseline + Modes (two arcs or one combined): ~40-60k token range typical for arc-planner sessions. Single-session aim: scaffold both arcs (or one combined arc with baseline+Modes phases) with the full six-artifact shape, then commit + hand off to arc-orchestrator / arc-executor for Phase A.

After arc-planner closes: **arc-orchestrator takes over** for cross-phase coordination once Phase A executor terminal kicks off.
