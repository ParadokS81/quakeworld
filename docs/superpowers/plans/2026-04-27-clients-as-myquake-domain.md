# Phase 3.5a — Absorb Clients tab into MyQuake → Domains → Clients

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Information-architecture restructure with NO behavior change. The standalone Clients tab is dissolved into a Clients sub-tab inside MyQuake → Domains. The 6-tab sidebar becomes 5 tabs. Every feature currently on the Clients tab keeps working — same components, same Tauri commands, same store shape — just rendered inside MyQuake.

**Position in roadmap:** First half of the original Phase 3.5 split. Sequenced before Phase 3.5b (the bulk-import + fingerprinter feature work captured in `docs/superpowers/plans/2026-04-26-add-quake-client.md`). 3.5a establishes the surface that 3.5b builds the new flow inside. Two-phase split keeps the IA change isolated from the feature work — easier to verify, easier to roll back if something subtle breaks.

**Scope:** Pure relocation. No new components built. No behavior changed. No new Tauri commands. No store schema changes.

---

## Critical context for the engineer

1. **The four-tier opt-in ladder reframe** (memory `project_slipgate_tier_ladder.md`) is the load-bearing rationale. Slipgate's product is "your relationship to your quake dir." MyQuake is the surface for that relationship. Client management belongs inside MyQuake the same way Configs management does. Phase 3.5a makes the IA reflect the framing.

2. **MyQuake currently has two modes** (`apps/slipgate-app/src/components/MyQuakeTab.tsx`): Browse (Explorer-style three-pane file view) and Domains (curated dashboards). Domains today contains: Configs (alive — hosts the full ConfigViewer), Maps (disabled placeholder), Matches (disabled placeholder), Assets (disabled placeholder). This phase adds Clients as a first-class Domain alongside them.

3. **The Clients tab today** lives at `apps/slipgate-app/src/components/ClientsTab.tsx` (~674 lines per docs/OVERVIEW). It contains: ezQuake path picker, config dropdown, live parsed display, updater (4 sub-tabs across stable + snapshot channels), launcher with Join/Spec/Launch buttons, screenshot POC, foreign-exe Import affordance, VersionWarehouse panel (Phase 3 shipped). All of this relocates wholesale. The component itself stays intact.

4. **No component rewrites in this phase.** `ClientsTab.tsx` (rename optional — see Task A.2) renders inside MyQuake's Domains mode without internal changes. Children (VersionWarehouse, individual updater pieces, launcher, etc.) stay completely untouched.

5. **Domain ordering after this phase:** Clients, Configs, Maps, Matches, Assets. Clients first because it's the primary-everyday surface (path picker + updater + warehouse). Configs second (the other alive Domain). Then the disabled placeholders.

6. **No store schema changes.** `setups[0].client.exe_path` etc. stay where they are. Phase 3.5b adds `setups[0].quake_dir` later; not in 3.5a.

7. **SideNav reduction:** 6 tabs → 5 tabs. New order: Schedule / Profile / Tools / My Quake / Settings. The Clients icon disappears.

8. **App.tsx tab routing:** the `activeTab` signal currently has `"clients"` as a valid value. After this phase it isn't. A one-time migration is needed: if a user's persisted state has `activeTab="clients"`, redirect to `activeTab="myquake"` with the MyQuake mode set to `"domains"` and the Domain selection set to `"clients"`. Concrete location lives wherever active-tab persistence lands (App.tsx mount, store.ts migration, or both — survey first).

9. **Tools tab stays separate.** Operator clarification 2026-04-27: Tools is intentionally not Quake-only (FPS optimizer for 77 Hz tick alignment IS Quake-specific, but sensitivity recalc and FOV recalc are general FPS-gamer tools). Future Tools additions might be non-Quake. Don't absorb Tools into MyQuake.

10. **No drag-drop relocation.** The Configs sub-tab's drag-drop zone for `.cfg`/`.zip`/`.pak`/`.pk3` stays inside Configs.

11. **No Browse-view changes.** No "Clients filter category in Browse." That idea was dropped during the 2026-04-27 second-pass review. Browse is for filesystem inspection; Domains → Clients is for client management. Different mental models, no overlap.

12. **No Tauri command changes.** No new commands, no removed commands, no signature changes. Pure frontend refactor.

13. **Verify-before-completion rule applies** (memory `superpowers:verification-before-completion` skill). After the move, manual smoke on Windows operator's box: launch app, navigate to MyQuake → Domains → Clients, verify path picker still works, version warehouse still displays known versions, update check still works (test against ezQuake stable), launcher still launches.

14. **Git workflow** (CLAUDE.md § Git workflow): commit to main directly. One commit for this phase is fine — it's a coherent unit. Push at the end. No PR ceremony.

15. **The src-tauri rsync hook should NOT fire** during this phase. If it does, you've accidentally touched Rust code outside the IA restructure scope.

---

## Single sub-phase: IA restructure

**Sessions:** 1 (~1-2 hours)
**Goal:** Clients-tab content rendered as MyQuake → Domains → Clients sub-tab. Sidebar reduced to 5 tabs. Tab routing migrates persisted `activeTab="clients"` to the new location.

### Task A.1: Survey current state

- [ ] Read `apps/slipgate-app/src/components/SideNav.tsx` end-to-end. Locate the Clients entry: how it's defined (icon, label, tab id), what consumers reference its tab id.
- [ ] Read `apps/slipgate-app/src/App.tsx` end-to-end. Locate: (a) the `activeTab` signal definition, (b) the Switch/Match block routing tabs to components, (c) any persistence layer for `activeTab` (localStorage, store.ts, or memory-only).
- [ ] Read `apps/slipgate-app/src/components/MyQuakeTab.tsx` end-to-end. Locate: (a) the Browse-vs-Domains mode signal, (b) the Domains sub-tab list and how each Domain renders, (c) any signal tracking the active Domain.
- [ ] Read `apps/slipgate-app/src/components/ClientsTab.tsx` first 50 lines + its props/export shape. Note what signals/props the parent App.tsx passes to it.

### Task A.2: Decide component naming

- [ ] Choose: rename `ClientsTab.tsx` → `ClientsDomain.tsx` (recommended for clarity; matches the Domain framing) OR leave the file name and import it into MyQuakeTab unchanged (lower-churn). Document the choice in the commit message.

### Task A.3: Wire Clients into MyQuake → Domains

- [ ] Modify `MyQuakeTab.tsx` to render the Clients sub-tab in Domains mode. Sub-tab list order: Clients, Configs, Maps, Matches, Assets.
- [ ] The Clients sub-tab renders the (renamed-or-not) Clients component, passing through the same props/signals App.tsx currently passes to ClientsTab. If the Clients component takes signals via props, pipe them through MyQuakeTab. If it imports them directly from a global module, no plumbing needed.
- [ ] Verify the existing path picker, config dropdown, updater (all 4 sub-tabs), launcher, VersionWarehouse, foreign-exe Import affordance all render correctly inside the new location.

### Task A.4: Remove Clients from SideNav

- [ ] Modify `SideNav.tsx` to drop the Clients entry. Final tab order: Schedule, Profile, Tools, MyQuake, Settings.
- [ ] Search the codebase for hardcoded references to the `"clients"` tab id (or whatever the SideNav uses): `grep -rn "clients" apps/slipgate-app/src/ --include="*.tsx" --include="*.ts"`. Resolve any consumers.

### Task A.5: Migrate App.tsx tab routing

- [ ] Remove `"clients"` from the `activeTab` Switch/Match block in App.tsx.
- [ ] Add a one-time migration: on App mount, check whether persisted state (localStorage / store / wherever activeTab persists) has `activeTab="clients"`. If yes, set `activeTab="myquake"` AND set the MyQuake mode to `"domains"` AND set the active Domain to `"clients"`. Persist the migrated state.
- [ ] Edge case: if `activeTab` doesn't persist at all (always defaults to a starting tab on launch), the migration is a no-op. Document either way.
- [ ] Test cold-start: launch app, confirm no console errors. Set activeTab to clients programmatically (via devtools or temporary code), reload, confirm migration fires.

### Task A.6: Verify nothing else broke

Run all of these. Fix anything that fails.

- [ ] `cd apps/slipgate-app && bunx tsc --noEmit` — should be clean (per memory feedback `feedback_verify_typescript.md`, Vite build does not enforce types; tsc is mandatory).
- [ ] `cd apps/slipgate-app && bun test` — all ConfigViewer, store, simulator, swap, warehouse tests still pass.
- [ ] `cd apps/slipgate-app/src-tauri && cargo build --quiet` — should be clean. No Rust changes in this phase, so warnings should match the pre-phase baseline.
- [ ] Manual smoke (Windows operator's box if dev'd in WSL): launch, navigate to MyQuake → Domains → Clients, verify (1) path picker shows the configured ezquake.exe, (2) version warehouse displays known versions with switch + delete buttons, (3) updater check finds the latest stable release, (4) launcher's Join/Spec/Launch buttons fire correctly.

### Task A.7: Commit + push

- [ ] Single commit. Suggested message:

```
refactor(slipgate): absorb Clients tab into MyQuake → Domains → Clients (Phase 3.5a)

[1-2 lines: what moved + the rationale (four-tier opt-in ladder; client
management belongs inside the "your quake dir" surface)]

No behavior changes; pure information-architecture restructure. Phase 3.5b
builds the new bulk-import + fingerprinter flow on top of this foundation.

[note any decision made in Task A.2 — file rename or not]
```

- [ ] `git push origin main` after verification.

---

## Self-review against goal

Goal restated: standalone Clients tab dissolves into MyQuake → Domains → Clients with no behavior change.

Task A.1 surveys what moves. A.2 decides component naming. A.3 wires the new location. A.4 removes the old surface. A.5 handles tab-routing migration. A.6 verifies nothing else broke. A.7 commits + pushes.

The four-tier opt-in ladder framing is preserved: Tier 1 users see slipgate's read-only surfaces (MyQuake Browse, ConfigViewer); Tier 2 users see slipgate's managed-content surfaces (Domains → Clients with the warehouse + updater inside it). Same product, cleaner navigation. Future Tier 3 arcs (asset warehouse, bundle install) plug into the same Domains framework alongside Clients.

The reviewer's F1 finding (entry-point ambiguity between AddClientPanel-as-modal vs router-jump-to-Browse) dissolves under this framing: 3.5b's AddClientPanel will live inside Domains → Clients, not as a router-jump or modal overlay. The reviewer's F2 finding (scan_quake_dir doesn't detect clients) is irrelevant for 3.5a because we don't touch scan logic. The reviewer's F11 finding ("Delete from disk" referenced but never specified) is deferred to 3.5b alongside the rest of the action grammar work.

---

## What this plan does NOT cover

- **Fingerprinter, release_cache, bulk-import flow, AddClientPanel.** All Phase 3.5b. See `docs/superpowers/plans/2026-04-26-add-quake-client.md` (which will be revised during the 3.5b second-pass review to absorb the reviewer's F-series findings + the four open decisions).
- **Tools tab absorption.** Per critical-context #9, Tools stays separate.
- **VersionWarehouse component changes.** Stays exactly as Phase 3 shipped it. No new buttons, no new sub-components, no row changes.
- **Cross-Domain navigation polish.** If the new Domain sub-tab nav looks awkward in 3.5a, hold it. 3.5b's bulk-import flow may inform the right polish.
- **Browse-view changes.** No "Clients filter category in Browse." That idea was dropped per 2026-04-27 second-pass review.
- **Component renames inside the Clients UI.** The internal components (path-picker, updater, launcher, etc.) keep their current file names and component names.
- **Store schema migration.** Profile schema stays at v2. No new fields. Phase 3.5b adds `setups[0].quake_dir` later.
- **Any Rust changes.** Pure frontend refactor.

---

## Execution handoff

Plan ready for execution in a fresh terminal.

1. Open a fresh Claude session with the prompt provided in the wrap-up message of the prior session (or paste the prompt block from there).
2. Verify Phase 3 + the canonical-only revisions are in HEAD: `git log --oneline | head -20` should show commits including `f6fe481` (canonical-mode revert) and `01e4081` (Phase 3.5 plan revision).
3. Read this plan in full plus `MyQuakeTab.tsx`, `ClientsTab.tsx`, `SideNav.tsx`, `App.tsx`.
4. Use `superpowers:executing-plans` (or `superpowers:subagent-driven-development` if subagents make sense for this — the work is small enough that subagents may be overkill).
5. Single commit covering the IA restructure. Push to main when verified.
6. Report back to operator: what changed, any tricky decisions made (e.g. component naming, migration logic), anything surprising about the existing code, whether 3.5b is ready to launch on top.

---

## Related

- **Parent plan:** `docs/superpowers/plans/2026-04-26-quake-dir-control.md` (the 6-phase Quake Dir Control plan; Phases 0+1+2+3 shipped 2026-04-27)
- **Sibling plan (3.5b):** `docs/superpowers/plans/2026-04-26-add-quake-client.md` (the bulk-import + fingerprinter feature work that runs after 3.5a; will get a pass-2 revision after 3.5a ships, absorbing the reviewer's findings + four open decisions)
- **Memory:** `project_slipgate_tier_ladder.md` (the load-bearing four-tier opt-in ladder framing this restructure embodies)
- **HANDOVER:** "Tier 3 future arcs" entry (the post-3.5 future arcs that all live inside Domains alongside Clients)
- **Reference:** `apps/slipgate-app/docs/OVERVIEW.md` § The 6 tabs (current IA before this phase ships)
- **Reference:** memory `feedback_verify_typescript.md` (mandatory `bunx tsc --noEmit` on slipgate frontend work)
