# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [qw-oracle/CLAUDE.md is 192 lines (over 150 hard ceiling)](#qw-oraclecladuemd-is-192-lines-over-150-hard-ceiling) — split into Layer 2 docs next time qw-oracle gets active work
- [Modular keyboard panel: Windows manual verification](#modular-keyboard-panel-windows-manual-verification) — implementation complete, only Task 16 visual pass remains

---

## qw-oracle/CLAUDE.md is 192 lines (over 150 hard ceiling)

**Added:** 2026-04-14
**Status:** pending, expect to address when qw-oracle gets its next active session
**Verification first:** `wc -l apps/qw-oracle/CLAUDE.md`. If under 150, this item is resolved (someone already split it or trimmed it).

The monorepo doc philosophy puts a soft ceiling at 120 lines and a hard ceiling at 150 lines on any `CLAUDE.md`. Bloat is diagnostic: the cause is almost always a missing Layer 2 doc that should be holding the overflow content. `apps/qw-oracle/CLAUDE.md` is currently 192 lines, 28% over the hard ceiling.

The POC implementation plan at `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` includes rewriting `apps/qw-oracle/CLAUDE.md` in Task 1 as part of the three-layer scaffolding. That task will naturally trim the file AND create the Layer 2 docs (`layers/README.md`, `serve/README.md`, etc.) that should hold the content currently stuffed into CLAUDE.md.

### Fix shape

Don't split preemptively. The POC plan already handles it — Task 1 in `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` rewrites `apps/qw-oracle/CLAUDE.md` to the three-layer structure and creates the overflow docs. When that task lands, this handover item should resolve automatically. Only revisit if the POC plan stalls and qw-oracle/CLAUDE.md stays bloated for an extended period.

### Related

- The POC plan: `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` Task 1
- The doc philosophy: `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`
- The memory: `project_doc_philosophy.md`

---

## Modular keyboard panel: Windows manual verification

**Added:** 2026-04-15 (replaces earlier "Execute modular keyboard panel plan" entry)
**Status:** all 15 implementation tasks committed to `main`; two review-driven fixes also committed; docs update committed. Only Task 16 visual verification on Windows is outstanding.
**Verification first:** `git log --oneline -20` should show the feature commits `aa07408` through `e5c1b7f`. If `wc -l apps/slipgate-app/src/components/KeyboardLayout.tsx` is still ~331, execution has NOT happened and this entry is stale - read the git log before acting.

### What's done

Full modular right-slot keyboard: MAIN_BLOCK + swappable nav/numpad/mouse modules, ConfigViewer segmented control, ProfileTab two-button overlay, auto-reveal effect, persistence via two new `ProfilePrefs` fields, mouse decoration (outline + wheel glyphs). `bunx tsc --noEmit` and `bun run build` both clean. See the 15 feature commits plus:
- `3694db7` fix: lazy-init moduleOf to avoid circular-import TDZ on first render
- `8c8f106` fix: narrow brand label + correct overlay position (F12 gap was only 0.25u, not enough for a toggle - label now starts at 15.25u when a toggle is present)
- `e5c1b7f` docs: STATE.md updated with the two new prefs fields (DESIGN.md intentionally left alone - it is a philosophy doc, not a CSS variable reference)

### Task 16 checklist (Windows only - Tauri will not build from WSL)

From the spec's §10. Run `bun run tauri dev` from a Windows terminal at the slipgate-app path.

1. **ConfigViewer module toggle.** Segmented control shows Nav / Numpad / Mouse. Click each, verify keyboard swaps with NO visible size snap (TOTAL_W_U is pinned to 19.5u).
2. **Compare mode sync.** Load two configs in compare mode. Both stacked keyboards swap together.
3. **Click-to-pin auto-reveal.** Set to nav. Click a bind whose key is on the numpad - module swaps to numpad automatically. Repeat with a mouse bind -> mouse.
4. **Main-block keys do not auto-swap.** Click a bind on e.g. `F` - module stays, F lights up on the current view.
5. **Numpad renders.** Config with `bind kp_5 ...` lights up the 5 cell.
6. **Mouse renders.** Config with `bind mouse1 ...`, `mwheelup ...`, etc.
7. **Mouse6 reserved.** Unbound mouse6 renders dim; binding it makes it light up.
8. **Profile toggle placement.** Two-button Nav / Num overlay sits in the reserved slot at 14u..15.25u (71.8%..78.2% of keyboard width), immediately right of F12 and immediately left of the narrowed "NuPhy Field75 HE" brand label. If the overlay visibly overlaps the label or sits over F12, the brand-label-narrowing change in KeyboardLayout.tsx didn't take effect - check the `props.rightModuleToggle ? 15.25 : 14` conditional in the `<Show when={props.keyboardName}>` block.
9. **Persistence independence.** Set ConfigViewer=mouse and Profile=numpad. Close app. Relaunch. Both remembered independently.
10. **Decoration pointer-events.** In mouse mode, clicking cells still works (pointer-events: none on `.sg-kb-mouse-decoration` keeps the outline/wheel glyphs out of the click path).

### If any item fails

The plan's Task 16 Step 3 covers the usual tweaks. Common ones already anticipated:
- Overlay position off: adjust `left`/`width` on `.sg-keyboard-module-toggle-overlay` in app.css. Brand-label start point is controlled in KeyboardLayout.tsx via the `labelStart` variable.
- Auto-reveal fires when it shouldn't: check the "stay if current module already has a match" gate in the `createEffect` in ConfigKeyboardPanel.tsx.
- Mouse decoration outline looks wrong: adjust path coordinates in `renderMouseDecoration` in `keyboardModules/mouseModule.tsx`. The plan explicitly flagged this as likely to need visual tuning.

### After Task 16

- Push `origin main` once everything looks right.
- Remove this handover entry (and its index line).

### Related

- Spec: `apps/slipgate-app/docs/superpowers/specs/2026-04-15-modular-keyboard-panel-design.md`
- Plan: `apps/slipgate-app/docs/superpowers/plans/2026-04-15-modular-keyboard-panel.md`
- Brief (superseded): `apps/slipgate-app/docs/superpowers/plans/2026-04-15-modular-keyboard-panel-brief.md`
- Relevant memories: `project_slipgate_architecture.md`, `project_config_architecture.md`, `feedback_fresh_context_for_execution.md`
