# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [qw-oracle/CLAUDE.md is 179 lines (still over 150 ceiling)](#qw-oracleclaudemd-is-179-lines-still-over-150-ceiling) — improved by Task 1 rewrite, remaining bloat is raw messages schema
- [ConfigViewer compare tab counts are global](#configviewer-compare-tab-counts-are-global) — counts show total across all cvars regardless of active section
- [qw-oracle VISION.md needs active-assistance reframe](#qw-oracle-visionmd-needs-active-assistance-reframe) — current VISION.md talks Oracle Bot / Digest / Time Machine but not the broader constructive-query / version-aware vision
- [Alias chain pretty view](#alias-chain-pretty-view) — inline variable substitution + color code rendering; spec exists + simulator dep shipped, implementation not started
- [Player state simulator -- follow-ups](#player-state-simulator----follow-ups) — .loc dropdowns, visual polish, minor carry-overs

---

## qw-oracle/CLAUDE.md is 179 lines (still over 150 ceiling)

**Added:** 2026-04-14, **Updated:** 2026-04-16
**Status:** improved by Task 1 rewrite (192 -> 179), still 29 lines over hard ceiling
**Verification first:** `wc -l /home/paradoks/projects/quakeworld-poc/apps/qw-oracle/CLAUDE.md`. If under 150, resolved.

The monorepo doc philosophy puts a soft ceiling at 120 lines and a hard ceiling at 150 lines on any `CLAUDE.md`. Bloat is diagnostic: the cause is almost always a missing Layer 2 doc that should be holding the overflow content. `apps/qw-oracle/CLAUDE.md` is currently 192 lines, 28% over the hard ceiling.

The POC implementation plan at `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` includes rewriting `apps/qw-oracle/CLAUDE.md` in Task 1 as part of the three-layer scaffolding. That task will naturally trim the file AND create the Layer 2 docs (`layers/README.md`, `serve/README.md`, etc.) that should hold the content currently stuffed into CLAUDE.md.

### Fix shape

Don't split preemptively. The POC plan already handles it — Task 1 in `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` rewrites `apps/qw-oracle/CLAUDE.md` to the three-layer structure and creates the overflow docs. When that task lands, this handover item should resolve automatically. Only revisit if the POC plan stalls and qw-oracle/CLAUDE.md stays bloated for an extended period.

### Related

- The POC plan: `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` Task 1
- The doc philosophy: `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`
- The memory: `project_doc_philosophy.md`

---

## ConfigViewer compare tab counts are global

**Added:** 2026-04-16
**Status:** open
**Verification first:** open ConfigViewer in compare mode, click Domains > Teamplay > Binds. If the compare bar still shows "All (2748)" etc., the issue persists.

The "All (2748) / Different (331) / Same (191) / Only yours (0) / Only theirs (2112)" counts at the top of ConfigViewer always show the total across ALL cvars, regardless of which section/domain the user is viewing. When viewing Teamplay Binds, seeing "2748" is confusing because that's cvar rows, not teamsay rows. Scoping the counts to the active section requires knowing which section type is active (cvars vs weapon binds vs teamsay vs aliases) and computing counts per type.

Note: the related issue of Domain Teamplay Macros showing fewer items than Settings Macros was resolved in 2026-04-16 session (switched from alias-chain extraction to database-category sourcing).

### Related

- `apps/slipgate-app/src/components/ConfigViewer.tsx` (compareCounts memo)

---

## qw-oracle VISION.md needs active-assistance reframe

**Added:** 2026-04-16
**Status:** pending, next qw-oracle session
**Verification first:** read `apps/qw-oracle/VISION.md` in the poc worktree. If it mentions "active assistance" / "constructive queries" / "version-aware retrieval", this is resolved.

The current VISION.md (light-edited 2026-04-14 to add three-layer block) still frames the project around the original three paths: Oracle Bot, Digest, Time Machine. The 2026-04-15 conversation with ParadokS crystallized a broader vision:

1. **Active assistance, not just retrieval.** The end product is a system that can *construct* configs (weapon priority chains, teamsay macros, hybrid binds) from Layer 3 pattern guides, not just look up cvars. This is a qualitative shift from "smart search" to "domain copilot."
2. **Version-aware retrieval.** Once the AST extractor version-walk ships, every cvar/command carries first_seen_version/last_seen_version. Cross-referencing Layer 2 session dates against those ranges gives temporal relevance filtering: "this advice predates the 3.6 rewrite."
3. **Layer 2 as FAQ signal for Layer 3.** Chat is not primarily a direct answer source — it's a compass for what concept notes to write. Mine the chat for frequent questions, author targeted Layer 3 notes for the top topics, link back into the sessions.
4. **ezquake.com docs conversion pipeline.** The existing curated guides (weapon-scripts.html, scripting.html, etc.) are the natural input for Layer 3. Each page gets adapted into 1-3 concept notes with canonical ID references.

All four points are captured in `project_qw_oracle_product_vision.md` memory, but VISION.md itself (the file other devs would read) does not reflect them yet. Low urgency — the memory carries the knowledge across sessions, and the VISION.md rewrite is best done alongside the presentation prep when the framing is most fresh.

---

## Alias chain pretty view

**Added:** 2026-04-16, **Updated:** 2026-04-17
**Status:** spec written, simulator dependency shipped, implementation not started
**Verification first:** check `apps/slipgate-app/src/components/AliasChainResolver.tsx` — if it has a `mode: "pretty" | "raw"` prop or similar, implementation has started.

An alternative rendering mode for alias chain expansion that replaces raw code with readable output. Full design shipped 2026-04-16 at `apps/slipgate-app/docs/superpowers/specs/2026-04-16-alias-chain-pretty-view-design.md`. Three parsing layers per the spec:

1. **Variable substitution** — replace `$tp_name_rl` with its resolved value inline, colored to indicate it's a variable.
2. **Color code rendering** — interpret ezQuake `&cRGB` codes and `{}` brace scoping as actual colored text.
3. **Runtime token labeling** — `%location`, `%health` etc. shown as labeled placeholders by default; when the Simulator mode toggle is active, resolved to real values via the `SimulatorResolver` (see Player State Simulator in the slipgate OVERVIEW map).

The spec's section 3.5 defines a `RuntimeResolver` interface with two implementations:
- **LabelResolver** (default) — maps tokens to human-readable labels from `ezquake-macros.json`.
- **SimulatorResolver** (ready to plug in) — `createSimulatorResolver` from `apps/slipgate-app/src/lib/simulator/resolver.ts`. Ships PlayerState + condition evaluator + teamsay walker. Integration is literally one import and one line of mode-toggle wiring.

When picking this up:
- Start by reading the spec. It is fully fleshed, tiers 1 + 2 are specified, tier 3 (conditional collapsing) is outlined.
- The 92 simulator tests at `apps/slipgate-app/src/lib/simulator/*.test.ts` exercise the full surface the pretty-view will consume.
- Tier 3 work (which-branch-is-active rendering) benefits directly from `evaluateTeamsay`'s trace output — each TraceStep carries `activeBranch: "then" | "else"` for conditions.

### Related

- Spec: `apps/slipgate-app/docs/superpowers/specs/2026-04-16-alias-chain-pretty-view-design.md`
- Simulator module: `apps/slipgate-app/src/lib/simulator/` (shipped 2026-04-17)
- Integration point: `apps/slipgate-app/src/components/AliasChainResolver.tsx` (existing macro ref extraction stays as-is; the pretty view lives alongside it)

---

## Player state simulator -- follow-ups

**Added:** 2026-04-17
**Status:** v1 shipped; polish and extension items parked
**Verification first:** `bun test src/lib/simulator` from `apps/slipgate-app/` — expect 92 pass. `src/components/StatePanel.tsx` exists. Right-rail toolbar has `[Keyboard] [State]` buttons on the far left.

The Player State Simulator (PlayerState model + ezQuake `if` evaluator + `evaluateTeamsay` walker + StatePanel UI + persistence) shipped 2026-04-17 across ~25 commits. OVERVIEW.md has the full feature description. This handover item captures deferred polish and extensions that didn't make v1.

### Sub-groups

**1. `.loc`-driven location dropdowns.** Currently all location fields in StatePanel are free-form text inputs. Real utility comes from scanning the user's `qw/locs/` directory, parsing each `.loc` file (plain-text `x y z name` per line), and building `{ map → [location names] }`. Replace the free-form `location` / `mapname` / `lastloc` / `deathloc` / `pointloc` / `tookloc` / `droploc` text inputs with linked dropdowns: map picker filters the location dropdown. Keep a fallback free-form text input on each so users can test unlisted locations or work without loc files. Requires a small Rust-side `.loc` scanner + Tauri command (adjacent to the existing scanner at `src-tauri/src/commands/scanner.rs`). Probably 3-4 tasks worth of work.

**2. Visual polish per the HUD sketch.** User has a rough sketch (weapon ring with 8 weapon circles around the top, central figure with HP box, armor pips RA/YA/GA, powerup stack PENT/QUAD/RING/BIOSUIT, ammo indicators). v1 is text-based on purpose — polish should wait until the pretty-view integration lands and real use patterns surface what the visual actually needs to communicate. Then redesign from an informed position rather than guessing.

**3. Minor carry-overs from v1 code review.**
- `useKeyboardPanelState.ts` error log messages: some use "Failed to X:" prefix, others use "X:" (the new simulator handlers are shorter-form). Cosmetic, 3-min fix. Files `apps/slipgate-app/src/components/useKeyboardPanelState.ts` lines 159/180/186/193/199/205.
- `resolveWeaponName` export from `src/lib/simulator/derivations.ts` is unused externally — safe to un-export (Task 4 implementer exported it unnecessarily during implementation). Minor API-surface cleanup.
- `useKeyboardPanelState.ts` is now ~236 lines. Not a problem but worth an eye if simulator features grow; may be worth extracting a `useSimulatorState` hook in future.

**4. Input behavior polish.** Debouncing, tab order, focus behavior in StatePanel form controls. Surface specific issues when using it in anger.

### Related

- Spec: `apps/slipgate-app/docs/superpowers/specs/2026-04-17-player-state-simulator-design.md`
- Plan: `apps/slipgate-app/docs/superpowers/plans/2026-04-17-player-state-simulator.md`
- OVERVIEW.md has the full feature description and Code landmarks pointers.

---

