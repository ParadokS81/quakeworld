# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [qw-oracle/CLAUDE.md is 192 lines (over 150 hard ceiling)](#qw-oraclecladuemd-is-192-lines-over-150-hard-ceiling) — split into Layer 2 docs next time qw-oracle gets active work
- [ConfigKeyboardPanel polish backlog](#configkeyboardpanel-polish-backlog) — three minor cleanups surfaced during feature final review

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

## ConfigKeyboardPanel polish backlog

**Added:** 2026-04-15
**Status:** pending, feature is working well as of wrap-up — these are small cleanups surfaced during the final cross-cutting review and are safe to batch into a future iteration pass
**Verification first:** `wc -l apps/slipgate-app/src/components/ConfigViewer.tsx apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`. If ConfigViewer is under ~950 lines and ConfigKeyboardPanel no longer has duplicated `yourSelectedIds` / `theirSelectedIds`, the backlog items below have already been addressed.

Three minor items surfaced during the Task 11 final cross-cutting review. None block shipping, none are actual bugs. All three are worth bundling into one polish pass when the keyboard panel feature gets its next iteration.

### 1. ConfigViewer.tsx is at ~1045 lines and accreting orchestration

`apps/slipgate-app/src/components/ConfigViewer.tsx` was already ~910 lines before the keyboard panel plan and grew another ~130 lines through Tasks 6, 7, 9, and 11 (adding the Show-keyboard pref mirror, the three category-toggle mirrors, the `isBindsSectionFocused` memo, the bind selection lifted signal, and the three async toggle handlers). The file is not broken — each section is focused and the added code follows the existing signal/memo patterns — but the ratio of "ConfigKeyboardPanel plumbing" to "core ConfigViewer logic" is now high enough that the file is harder to hold in context.

**Fix shape:** extract the keyboard-panel plumbing block (six signals, three createEffect blocks, three async toggle handlers, the `isBindsSectionFocused` memo, the `isWeaponSelected` / `isLabelSelected` predicates) into a `useKeyboardPanelState(profile)` hook in a new `useKeyboardPanelState.ts` file, returning an object with all the props that get passed to `<ConfigKeyboardPanel>`. Then ConfigViewer's invocation becomes `<ConfigKeyboardPanel {...keyboardPanelState()} />`. Shrinks ConfigViewer by ~100 lines and moves the plumbing next to the component that owns it.

### 2. ConfigKeyboardPanel has ~40 lines of duplicated selected-id building

`apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx` has two near-identical memos: `yourSelectedIds` and `theirSelectedIds`. They differ only in which input (`primaryInput()` vs `compareInput()`) they read. Both iterate the selection array, call `resolveCommandKeys` per entry, then run a second loop that tints modifier keys for teamsay combos. Structurally identical, ~20 lines each.

**Fix shape:** extract `buildSelectedIds(input: HighlightInput, selection: BindSelection): Set<string>` into `keyboardHighlights.ts` alongside `resolveCommandKeys`. Both memos become one-line wrappers. Removes ~35 lines net. This fix was explicitly flagged by both the Task 8 review and the final cross-cutting review.

### 3. Three OKLCH values are hardcoded as literal strings instead of CSS custom properties

The keyboard panel's three semantic colors are hardcoded:

- Selection neon frame: `oklch(0.92 0.18 85)` — defined twice in `app.css` (`.sg-kb-key-selected` around line 1355, `.sg-domain-bind-row-selected` around line 2042)
- Owner-you frame: `oklch(0.65 0.18 230)` — defined twice (`sg-config-kb-frame-you` border + background)
- Owner-them frame: `oklch(0.7 0.18 40)` — defined twice (`sg-config-kb-frame-them` border + background)

These don't violate the project's "no hex/rgb" rule, but they do violate the spirit of "use CSS custom properties for all themed values" from DESIGN.md. They also prevent theme swapping from working for these specific colors.

**Fix shape:** promote the three values to `--sg-kb-selected`, `--sg-kb-owner-you`, `--sg-kb-owner-them` in the theme variable block at the top of `app.css`, then replace the literal uses. ~10 minutes of grep-and-replace.

### Why bundle these three together

All three are ConfigKeyboardPanel-adjacent, all three are well-understood, none require design decisions, and the `ConfigViewer.tsx` extraction in item 1 is the right moment to also land the other two because you'll be touching the panel component anyway. Doing them as three separate commits in one session is cleaner than three disconnected touches over three weeks.
