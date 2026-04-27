# Phase 3.5a — IA restructure: split Clients tab into Feed + MyQuake → Domains → Clients

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Information-architecture restructure surfaced during the Phase 3.5b second-pass review. The standalone Clients tab is dissolved: its content is split between (a) a trimmed Clients sub-tab inside MyQuake → Domains, and (b) a new top-level Feed tab. Four sections are dropped from the surface entirely (Input, Video, Launch, Screenshot POC). The 6-tab sidebar stays at 6 tabs but its composition changes (Clients → Feed). No new Tauri commands, no new Rust code, no schema changes. Pure frontend restructure.

**Position in roadmap:** First half of the Phase 3.5 split. Sequenced before Phase 3.5b (the bulk-import + fingerprinter feature work captured in `docs/superpowers/plans/2026-04-26-add-quake-client.md`). 3.5a establishes the surface that 3.5b builds the new flow inside. Two-phase split keeps the IA change isolated from the feature work — easier to verify, easier to roll back if something subtle breaks.

**Scope:** Frontend restructure. No new components beyond the new Feed tab. No behavior changes for sections that survive (Updates / Installation / Versions still work exactly as Phase 3 shipped them). Four sections (Input / Video / Launch / Screenshot POC) get dropped from the user-facing surface — code stays in place but is not surfaced anywhere in 3.5a; future arcs may resurface them elsewhere (see HANDOVER's "Feed tab future content," "Screenshot POC → Profile," and "Tray menu launch" entries).

---

## Critical context for the engineer

1. **The four-tier opt-in ladder reframe** (memory `project_slipgate_tier_ladder.md`) is the load-bearing rationale. Slipgate's product is "your relationship to your quake dir." MyQuake is the surface for that relationship. Client management belongs inside MyQuake the same way Configs management does. Phase 3.5a makes the IA reflect the framing.

2. **The 7 sections currently inside the Clients tab** (per operator's screenshot 2026-04-27 17:03 + `apps/slipgate-app/src/components/ClientsTab.tsx`):

| Section | Content | Disposition in 3.5a |
|---|---|---|
| **Installation** | Path, config dropdown, player name | Keep — moves to Clients-Domain |
| **Updates** | ezQuake / KTX / MVDSV / QWFWD updater + Check Now | Extract — moves to new Feed tab |
| **Versions** | Phase 3 VersionWarehouse with Switch / Delete / Add Quake client (stubbed) | Keep — moves to Clients-Domain |
| **Input** | Sensitivity, m_yaw, m_pitch, effective, raw input, mouse accel — read-only parsed from active config | Drop — redundant with Profile's mouse data row |
| **Video** | FOV, resolution, max FPS — read-only parsed from active config | Drop — redundant with Profile's specs cards |
| **Launch** | Server input + Join / Spec / Launch buttons | Drop — slipgate is not a game launcher per VISION; users launch via ezQuake's own shortcut. Future tray menu may resurface |
| **Screenshot POC** | Internal-only demo screenshot automation, hardcoded path | Drop from Clients-Domain — Rust `screenshot.rs` command stays callable; future Profile integration will resurface as the profile-picture-generator feature |

3. **The Clients tab has internal navigation today** — the screenshot shows a `← Clients` breadcrumb suggesting at least one level of sub-page (probably "list view → ezQuake detail view"). Whatever that internal nav is, it's preserved wholesale during the move into MyQuake → Domains → Clients. Don't flatten it.

4. **MyQuake's two modes** (`apps/slipgate-app/src/components/MyQuakeTab.tsx`): Browse (Explorer-style three-pane file view) and Domains (curated dashboards). Domains today contains: Configs (alive — hosts the full ConfigViewer), Maps (disabled placeholder), Matches (disabled placeholder), Assets (disabled placeholder). After 3.5a: Clients (alive, kept-sections only), Configs (alive), Maps, Matches, Assets. Clients first because it's the primary-everyday surface.

5. **The new Feed tab.** Top-level sidebar entry, sibling to Schedule / Profile / Tools / MyQuake / Settings. Initial content in 3.5a: just the extracted Updates section. Future content (HANDOVER entry "Feed tab future content"): tournament info, developer landscape, GitHub monitoring of active Quake projects, community announcements. Feed is the "what's happening in QW right now" surface — distinct from MyQuake (your local quake stuff) and Profile (you).

6. **No store schema changes.** `setups[0].client.exe_path` etc. stay where they are. Phase 3.5b adds `setups[0].quake_dir` later; not in 3.5a.

7. **SideNav composition** (final): Schedule / Profile / Feed / Tools / MyQuake / Settings (6 tabs). Schedule stays as a placeholder — operator confirmed the matchscheduler-website integration is parked until the app is closer to ship-ready (per VISION's "Partial: auth built, notifications planned"). Don't merge Schedule into Feed; they're conceptually distinct (Schedule = your scheduled matches; Feed = community + tooling activity).

8. **App.tsx tab routing migration** has two pieces:
   - Drop `"clients"` from valid `activeTab` values; add `"feed"`.
   - One-time persisted-state migration: if `activeTab="clients"` was persisted (from before this phase), redirect to `activeTab="myquake"` with MyQuake mode `"domains"` and Domain selection `"clients"`. The Updates section's persistence (if any — e.g. last-viewed updater sub-tab) survives via the new Feed tab.

9. **Tools tab stays separate.** Operator clarification 2026-04-27: Tools is intentionally not Quake-only (FPS optimizer for 77 Hz tick alignment IS Quake-specific, but sensitivity recalc and FOV recalc are general FPS-gamer tools). Future Tools additions might be non-Quake. Don't absorb Tools into MyQuake.

10. **No drag-drop relocation.** The Configs sub-tab's drag-drop zone for `.cfg`/`.zip`/`.pak`/`.pk3` stays inside Configs.

11. **No Browse-view changes.** No "Clients filter category in Browse." That idea was dropped per 2026-04-27 second-pass review. Browse is for filesystem inspection; Domains → Clients is for client management.

12. **No Tauri command changes.** No new commands, no removed commands, no signature changes. Pure frontend refactor. The `screenshot.rs` Rust command is intentionally LEFT in place even though no UI surface fires it — when Profile integration ships (future arc), it'll wire into the same command.

13. **Verify-before-completion** (memory `superpowers:verification-before-completion` skill). After the move: launch app, navigate to (a) Feed → confirm Updates sub-tabs render and Check Now works, (b) MyQuake → Domains → Clients → confirm path picker, version warehouse, switch/delete/add-client-stub all work. Check that dropped sections (Input/Video/Launch/Screenshot) are not visible anywhere.

14. **Git workflow** (CLAUDE.md § Git workflow): commit to main directly. Single commit covering the IA restructure is fine — it's a coherent unit. Push at the end. No PR ceremony.

15. **The src-tauri rsync hook should NOT fire** during this phase. If it does, you've accidentally touched Rust code outside the IA restructure scope.

16. **Component naming convention.** When extracting Updates from ClientsTab.tsx, name the new component `UpdatesPanel.tsx` (or similar) and import it into `FeedTab.tsx`. When trimming the surviving sections, rename `ClientsTab.tsx` → `ClientsDomain.tsx`. Document the rename(s) in the commit message.

17. **Dropped-section code disposition.** Don't delete Input/Video/Launch/Screenshot UI code from `ClientsTab.tsx` — leave it in version control for reference, just don't render it in the new ClientsDomain.tsx component. Future Claude sessions doing the Profile integration of Screenshot POC, or restoring Launch as a tray menu, will reference these existing sections. Mark dropped sections with a brief inline comment naming the future arc that may resurface them (one of: "Feed future content," "Screenshot POC → Profile," "Tray menu launch").

---

## Sub-phase A: IA restructure execution

**Sessions:** 1 (~3-4 hours)
**Goal:** Sidebar restructure + Feed tab creation + Updates extraction + Clients-Domain creation + section drops + state migration. Verified end-to-end.

### Task A.1: Survey current state

- [ ] Read `apps/slipgate-app/src/components/SideNav.tsx` end-to-end. Locate the Clients entry: how it's defined (icon, label, tab id), what consumers reference its tab id.
- [ ] Read `apps/slipgate-app/src/App.tsx` end-to-end. Locate: (a) the `activeTab` signal definition, (b) the Switch/Match block routing tabs to components, (c) any persistence layer for `activeTab` (localStorage, store.ts, or memory-only), (d) which props/signals get passed into ClientsTab today.
- [ ] Read `apps/slipgate-app/src/components/MyQuakeTab.tsx` end-to-end. Locate: (a) the Browse-vs-Domains mode signal, (b) the Domains sub-tab list and how each Domain renders, (c) any signal tracking the active Domain.
- [ ] Read `apps/slipgate-app/src/components/ClientsTab.tsx` end-to-end. Identify the 7 sections by JSX. Note which sub-components each delegates to (e.g. updater pieces, VersionWarehouse, screenshot-trigger).
- [ ] Identify any shared signals between Clients-tab sections (e.g. does Updates share state with Versions? Does Installation's path picker affect Input/Video?).

### Task A.2: Extract Updates into a new component

- [ ] Create `apps/slipgate-app/src/components/UpdatesPanel.tsx` containing the Updates section's UI + state.
- [ ] Move the relevant logic out of ClientsTab.tsx — JSX, signals scoped to the section, helper functions.
- [ ] Verify TypeScript compiles after the extraction (`bunx tsc --noEmit`).

### Task A.3: Create the Feed tab

- [ ] Create `apps/slipgate-app/src/components/FeedTab.tsx`. Initial content: render `<UpdatesPanel ... />` with appropriate props.
- [ ] Future-content placeholder is optional; don't add disabled placeholders for tournaments / developer landscape / GitHub monitoring in 3.5a. Keep it minimal: Updates only.

### Task A.4: Trim ClientsTab.tsx → ClientsDomain.tsx

- [ ] Rename `ClientsTab.tsx` → `ClientsDomain.tsx`. Update component name accordingly.
- [ ] Drop the JSX rendering for Input, Video, Launch, Screenshot POC sections. Per critical-context #17, do NOT delete the underlying logic — wrap those sections in a comment block referencing the future arc that may resurface them, OR move them into a separate `_dropped-sections.tsx` reference file. Operator's choice; document in commit message.
- [ ] Keep Installation and Versions sections wired exactly as they are.
- [ ] Preserve any internal navigation (the `← Clients` breadcrumb pattern visible in the screenshot).

### Task A.5: Wire Feed into SideNav + App.tsx

- [ ] Modify `SideNav.tsx`: drop the Clients entry, add a Feed entry. Final sidebar order: Schedule, Profile, Feed, Tools, MyQuake, Settings.
- [ ] Modify `App.tsx`: drop `"clients"` from the activeTab Switch/Match block; add `"feed"` arm rendering `<FeedTab ... />`.
- [ ] Pipe whatever signals/props FeedTab needs (likely whatever the existing Updates section needed — exe path, version state, etc.).

### Task A.6: Wire ClientsDomain into MyQuake → Domains

- [ ] Modify `MyQuakeTab.tsx` to add a Clients sub-tab to Domains mode. Sub-tab order: Clients, Configs, Maps, Matches, Assets.
- [ ] The Clients sub-tab renders `<ClientsDomain ... />` with the props/signals it needs (same set ClientsTab took, minus anything unique to dropped sections).

### Task A.7: Migrate App.tsx persisted activeTab state

- [ ] On App mount, check whether persisted state has `activeTab="clients"`. If yes, set `activeTab="myquake"`, set MyQuake mode to `"domains"`, set active Domain to `"clients"`. Persist the migrated state.
- [ ] Edge case: if `activeTab` doesn't persist at all, the migration is a no-op. Document either way in the commit.
- [ ] Test cold-start: launch app, confirm no console errors. Set activeTab to "clients" programmatically (devtools or temporary code), reload, confirm migration fires and lands user at MyQuake → Domains → Clients.

### Task A.8: Sweep for stale references

- [ ] `grep -rn "clients" apps/slipgate-app/src/ --include="*.tsx" --include="*.ts" | grep -v node_modules` — identify all references to the `"clients"` tab id, `ClientsTab` component, the now-dropped sections. Resolve each.
- [ ] `grep -rn "ClientsTab" apps/slipgate-app/src/` — should return zero hits after the rename. Update remaining imports.
- [ ] `grep -rn "Updates" apps/slipgate-app/src/ --include="*.tsx" --include="*.ts" | grep -v node_modules` — check that Updates references all point at the new UpdatesPanel.

### Task A.9: Verify nothing else broke

Run all of these. Fix anything that fails.

- [ ] `cd apps/slipgate-app && bunx tsc --noEmit` — should be clean (memory `feedback_verify_typescript.md`: Vite build does not enforce types; tsc is mandatory).
- [ ] `cd apps/slipgate-app && bun test` — all ConfigViewer, store, simulator, swap, warehouse tests still pass.
- [ ] `cd apps/slipgate-app/src-tauri && cargo build --quiet` — clean. No Rust changes in this phase, so warnings should match the pre-phase baseline.
- [ ] Manual smoke (Windows operator's box if dev'd in WSL):
  - Launch slipgate
  - Confirm SideNav shows: Schedule / Profile / Feed / Tools / MyQuake / Settings
  - Click Feed → see Updates with ezQuake / KTX / MVDSV / QWFWD sub-tabs + Check Now
  - Click MyQuake → Domains mode → Clients sub-tab
  - Confirm Installation section shows path, config dropdown, player name
  - Confirm Versions section shows warehoused versions with Switch / Delete / Add Quake client (stubbed)
  - Confirm Input / Video / Launch / Screenshot POC are NOT visible anywhere
  - Tab navigation works (no console errors)
  - Persisted-state migration: if testing fresh, simulate prior state with `activeTab="clients"` and confirm it migrates to MyQuake → Domains → Clients on next launch

### Task A.10: Commit + push

- [ ] Single commit. Suggested message:

```
refactor(slipgate): split Clients tab → Feed + MyQuake → Domains → Clients (Phase 3.5a)

Phase 3.5a IA restructure surfaced during 3.5b second-pass review.
Standalone Clients tab dissolved into:

- New Feed top-level tab: hosts the extracted Updates section (ezQuake /
  KTX / MVDSV / QWFWD updater). Future Feed content (tournaments, dev
  landscape, GitHub monitoring) tracked in HANDOVER.
- MyQuake → Domains → Clients sub-tab: hosts Installation + Versions
  (the Phase 3 VersionWarehouse). Sibling to Configs / Maps / Matches /
  Assets domains.

Four sections dropped from surface (code retained in version control):
- Input + Video (redundant with Profile's mouse / specs surfaces)
- Launch (slipgate is not a game launcher per VISION; tray menu is the
  future home if launch ever needs to come back)
- Screenshot POC (future Profile integration will resurface as the
  profile-picture generator)

SideNav: 6 tabs → 6 tabs (Schedule / Profile / Feed / Tools / MyQuake /
Settings). Schedule stays as placeholder (matchscheduler integration
parked until the app is closer to ship-ready).

Phase 3.5b builds the new bulk-import + fingerprinter flow inside MyQuake
→ Domains → Clients on top of this restructure.

[note any decisions made: rename ClientsTab → ClientsDomain, dropped-section
code disposition (inline comment vs separate reference file), etc.]

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

- [ ] `git push origin main` after verification.

---

## Self-review against goal

Goal restated: Clients tab dissolves into Feed (Updates extracted) + MyQuake → Domains → Clients (Installation + Versions kept). Four sections dropped. No behavior change for surviving sections.

A.1 surveys. A.2-A.4 do the component splits. A.5-A.6 rewire the navigation. A.7 migrates persisted state. A.8 sweeps for stale references. A.9 verifies. A.10 commits.

The four-tier opt-in ladder framing is preserved: Tier 1 users see slipgate's read-only surfaces (MyQuake Browse, ConfigViewer, Profile); Tier 2 users see slipgate's managed-content surfaces (Domains → Clients with the warehouse, Feed → Updates). Same product, cleaner navigation.

Reviewer's F1 finding (entry-point ambiguity in 3.5b) dissolves under this restructure: 3.5b's AddClientPanel will live inside MyQuake → Domains → Clients, not as a router-jump or modal overlay. F2-F14 + the four open decisions remain in scope for 3.5b's pass-2 plan revision.

---

## What this plan does NOT cover

- **Fingerprinter, release_cache, AddClientPanel, bulk-import flow.** All Phase 3.5b. See `docs/superpowers/plans/2026-04-26-add-quake-client.md` (which needs a pass-2 revision after 3.5a ships).
- **Tools tab absorption.** Per critical-context #9, Tools stays separate.
- **VersionWarehouse component changes.** Stays exactly as Phase 3 shipped it. No new buttons, no new sub-components, no row changes.
- **Updater consolidation onto release_cache.** Still deferred per Phase 3.5b D3.
- **Profile screenshot-generator integration.** Future arc; HANDOVER entry "Screenshot POC → Profile picture generator." Not 3.5a scope.
- **Tray menu launch button.** Future arc; HANDOVER entry "Tray menu launch." Not 3.5a scope.
- **Feed future content** (tournaments / dev landscape / GitHub monitoring of QW projects). Future arc; HANDOVER entry "Feed tab future content." 3.5a ships Feed with Updates only.
- **Schedule tab implementation.** Stays as today's 11-line placeholder; matchscheduler integration is parked per operator decision.
- **Cross-Domain navigation polish.** If the new Domain sub-tab nav looks awkward in 3.5a, hold it; 3.5b's bulk-import flow may inform the right polish.
- **Browse-view changes.** No "Clients filter category in Browse" — that idea was dropped per 2026-04-27 second-pass review.
- **Component renames inside surviving sections.** Internal components (path-picker, individual updater pieces, VersionWarehouse, etc.) keep their current file names and component names. Only the top-level container renames (ClientsTab → ClientsDomain).
- **Store schema migration.** Profile schema stays at v2. No new fields. Phase 3.5b adds `setups[0].quake_dir` later.
- **Any Rust changes.** Pure frontend refactor.

---

## Execution handoff

Plan ready for execution in a fresh terminal.

1. Open a fresh Claude session with the prompt provided in the wrap-up message of the prior session (or paste the prompt block from there).
2. Verify Phase 3 + the canonical-only revisions + the IA-restructure plan commits are in HEAD: `git log --oneline | head -10` should show recent commits including `f6fe481` (canonical-mode revert), `01e4081` (Phase 3.5b first-pass plan revision), `475d59e` (Phase 3.5a/b split), and the most recent commit (3.5a-revised plan).
3. Read this plan in full plus `MyQuakeTab.tsx`, `ClientsTab.tsx`, `SideNav.tsx`, `App.tsx`, `store.ts`.
4. Use `superpowers:executing-plans` (or `superpowers:subagent-driven-development` if subagents make sense — the work is bigger than the prior estimate but still a single coherent refactor).
5. Single commit covering the IA restructure. Push to main when verified.
6. Report back to operator: what changed, any tricky decisions made (component naming, dropped-section code disposition, migration logic), anything surprising about the existing code, whether 3.5b is ready to launch the pass-2 plan revision on top.

---

## Related

- **Parent plan:** `docs/superpowers/plans/2026-04-26-quake-dir-control.md` (the 6-phase Quake Dir Control plan; Phases 0+1+2+3 shipped 2026-04-27)
- **Sibling plan (3.5b):** `docs/superpowers/plans/2026-04-26-add-quake-client.md` (the bulk-import + fingerprinter feature work that runs after 3.5a; will get a pass-2 revision after 3.5a ships, absorbing the reviewer's findings + four open decisions)
- **Memory:** `project_slipgate_tier_ladder.md` (the load-bearing four-tier opt-in ladder framing this restructure embodies)
- **HANDOVER:** "Tier 3 future arcs" entry (the post-3.5 future arcs that all live inside Domains alongside Clients)
- **HANDOVER:** "Feed tab future content" entry (tournaments, dev landscape, GitHub monitoring of QW projects)
- **HANDOVER:** "Screenshot POC → Profile picture generator" entry (where the dropped Screenshot POC section eventually graduates)
- **HANDOVER:** "Tray menu launch" entry (where the dropped Launch section may eventually resurface)
- **Reference:** `apps/slipgate-app/docs/OVERVIEW.md` § The 6 tabs (current IA before 3.5a ships)
- **Reference:** `apps/slipgate-app/VISION.md` "Not a game launcher" (rationale for dropping Launch from the user-facing surface)
- **Memory:** `feedback_verify_typescript.md` (mandatory `bunx tsc --noEmit` for slipgate frontend changes)
