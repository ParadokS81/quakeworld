# ConfigViewer Keyboard Panel — Design Spec

**Date:** 2026-04-14
**Status:** Approved design, ready for implementation plan
**Area:** `apps/slipgate-app` — ConfigViewer, MyQuake tab

## Summary

Add a right-side keyboard visualization panel to the ConfigViewer that renders when the user is focused on a Binds domain section (Weapons > Binds, Teamplay > Binds, or the new Movement > Binds). In compare mode, the panel stacks two keyboards — yours over theirs — sharing a single toggle bar and a single selection state. A click-to-pin interaction links keyboard keys to text-list rows bidirectionally, matching binds by command rather than by key position so users can see at a glance that "their SAFE is on U, mine is on Q."

The goal is to give players a spatial view of their binds alongside the authoritative text list, and in compare mode, to make muscle-memory differences visible in a way a column-diff cannot.

## Motivation

The current ConfigViewer shows binds as text rows with a compare column. This answers "what" — exact commands, aliases, args — but not "where." Players reason about binds spatially (clusters, hand position, which finger covers which key), and the current view can hide insights like "their whole weapon cluster is shifted left" or "they put SAFE on a key I never use."

Profile already has a keyboard visualization with Movement / Weapons / Teamplay toggles. It proves the pattern works. This spec extends it into the ConfigViewer and adds compare-mode stacking plus linked selection between the text list and the keyboards.

## Non-goals

- **Numpad support.** Rare in practice (mostly timing scripts) and would consume too much horizontal space at 1080p. Deferred.
- **Mouse visualization on the right panel.** Profile already shows a mouse; ConfigViewer defers until it's clear the keyboard alone isn't enough.
- **Hover-preview cross-linking.** Click-to-pin only in v1. Hover can be added later if the click model feels too heavy.
- **Multi-select.** Single selection at a time.
- **Filter-aware click gating.** If the current filter tab (e.g. "Only yours") hides a row, clicking a matching key will still expand that row. We'll revisit only if it feels wrong in use.
- **Extraction pipeline changes.** The spec assumes the current cfg parser continues to correctly classify bind domains. No parser work is scoped here.

## UI layout

### Single view (no compare)

- Right panel renders one keyboard.
- Toggle bar sits above the keyboard: three independent toggles — **Movement**, **Weapons**, **Teamplay** — each controlling whether that category's binds are visible on the keyboard.
- A single "Show keyboard" control in the top-right of the right panel lets the user hide the panel to reclaim horizontal space (useful at 1080p). State persists across sessions.

### Compare view

- Right panel renders two keyboards stacked vertically. Yours on top, the comparison config below.
- One toggle bar above the upper keyboard. Toggles apply to both keyboards simultaneously.
- **Orientation cue:** each keyboard has a subtle frame tint and a small label above it. Yours uses one theme accent; theirs uses another. Label text: "You" for the top, filename of the comparison config for the bottom (e.g. `hangtime.cfg`).
- The frame tint is subtle enough that it does not compete with the selection highlight (see Selection model below).

### Panel visibility rules

- The right panel is only populated when the focused sidebar section is a Binds section (Weapons > Binds, Teamplay > Binds, Movement > Binds).
- When the user focuses a non-Binds section (Settings, Aliases, Macros, etc.), the keyboard panel hides — its space can be used by whatever the target section uses the right panel for.
- The "Show keyboard" toggle state is remembered per user and applies whenever a Binds section is focused.

## Component reuse

Profile currently owns the keyboard rendering. This spec extracts the rendering into a shared component and has both Profile and ConfigViewer compose it.

- **Shared component:** `<KeyboardLayout />` — renders a single keyboard given a set of binds and a set of active category filters. Stateless with respect to selection (selection is a prop in). Emits key-click events upward. No knowledge of compare mode, no knowledge of whether it's in Profile or ConfigViewer.
- **Profile wrapper:** wraps `<KeyboardLayout />` in its existing single-instance container with its own toggle bar and selection state (if any). Profile's current behavior is unchanged from the user's perspective.
- **ConfigViewer wrapper:** a new container that renders one or two `<KeyboardLayout />` instances sharing a single toggle bar, a single selection state, and orientation frames/labels. In compare mode, both instances receive the same active-category filters and the same selection, but different bind sets.

The extraction is the first implementation step. Profile's existing behavior is a regression target — any change that breaks Profile fails the step.

## Domains sidebar change

Add **Movement > Binds** as a new domain section in the sidebar, matching the existing Teamplay and Weapons pattern. This gives the text list a natural home for movement binds (+forward, +back, +moveleft, +moveright, +jump, +movedown, and their chained variants) and lets the keyboard panel's Movement toggle operate on a first-class data source instead of being a special case.

The text list in the Movement > Binds section follows the same layout as Teamplay > Binds and Weapons > Binds. No novel UX there.

## Click-to-pin selection

Selection is a single piece of shared state owned by the ConfigViewer keyboard panel container. It applies to both keyboards in compare mode and to the text list on the left.

### Click a key on either keyboard

1. Look up the command bound to that key on that keyboard.
2. Highlight the matching key (by command, not by key position) on both keyboards. If the other keyboard does not bind that command, nothing lights up there.
3. Expand the matching row in the left text list and auto-scroll it into view. If compare mode is showing a filtered tab ("Different", "Same", "Only yours", "Only theirs") and the matching row is hidden by the filter, still expand it — the click is authoritative.
4. If the user clicks the same key again, the selection clears.

### Click a row in the left text list

Symmetric to the above. The row expands (as it already does), and additionally the matching key(s) on both keyboards are highlighted.

### Multi-bind keys

Some keys carry more than one binding via modifiers (e.g. `F` bound to SAFE, `Ctrl+F` bound to LOST). When the user clicks F:

- Highlight both `F` and `Ctrl` on the owner's keyboard (so the user can see the modifier is part of the story).
- Highlight the corresponding keys on the other keyboard, matched by command (so if their SAFE is on U and their LOST is on I, both U and I light up).
- Expand both matching rows in the left text list.

A "multi" indicator on the key itself is not required for v1 — the modifier lighting up is enough signal.

### Commands bound on one side only

Click a key whose command exists only in your config. Expand the row on your side, highlight only your key. The other keyboard shows nothing lit — the absence is the information. The user sees immediately that the opponent has no equivalent bind.

### Dismissing a selection

- Click the selected key or row again.
- Click any empty area of a keyboard.
- Press Escape.

### Highlight style

The selection highlight is a "neon frame" around the keycap — same accent color the key already uses for its category tint, but phatter and brighter than the default outline, so it reads as "selected" even against the subtle owner-frame tint on each keyboard. The exact visual tuning is an iterate-and-see step during implementation; the rule is "unambiguously brighter than the category tint and owner tint."

## Toggles

Three toggles on the panel's toggle bar: **Movement**, **Weapons**, **Teamplay**. Each is independent and binary (on/off). State persists across sessions.

- "Weapons on" means weapon bind keys are visibly rendered and interactive on the keyboard(s).
- "Weapons off" means weapon binds are rendered as neutral/unbound keys (or whatever the component's "no bind" style is).
- In compare mode, the single toggle bar controls both keyboards.
- Toggles are independent of whichever sidebar section is focused. The user can focus Teamplay > Binds in the left text list while having only Weapons enabled on the keyboard — this is allowed and expected.

## Dependencies and risk

### Parser accuracy

The correctness of the keyboard visualization depends on the cfg parser correctly classifying each bind's domain (movement vs weapons vs teamplay). Current state: the parser has been tuned against 4-5 test configs and is considered good enough to build against. This spec does not extend the parser. If anomalies surface when more configs are loaded, the fix is a parser-side change, not a spec-side change.

**Mitigation:** when the keyboard panel lights up the wrong key on a real user's config, that is a parser bug and a ticket. The panel itself is not the bug surface.

### Profile regression

The Profile tab currently owns the keyboard rendering and is the only place users see it today. The extraction step must not break Profile. The implementation plan's first checkpoint is "Profile still works the same way after the extraction, verified by opening Profile and toggling each category."

### 1080p layout

At 1440p, two stacked keyboards plus a toggle bar plus orientation labels comfortably fit in the right panel. At 1080p, the fit is tighter but still viable based on image 3 in the brainstorm. If it feels cramped in practice, the "Show keyboard" toggle lets 1080p users hide the panel entirely. A "compact" keyboard variant (smaller keycaps, fewer per-key labels) is a possible fallback but is out of scope for v1.

### Accessibility and keyboard navigation

Click-to-pin is mouse-only in v1. Keyboard navigation of the visualization itself is not in scope. The text list on the left remains fully navigable via the existing ConfigViewer interactions.

## Open questions deferred to implementation

- Exact pixel sizes for the "phatter neon frame" — iterate during build.
- Whether the orientation frame on each keyboard in compare mode sits outside the keyboard bounding box or inside the right-panel container. Decide when wiring up the component.
- Whether the "Show keyboard" toggle should remember state per-user-globally or per-config. Default: per-user globally. Revisit only if users complain.

## Success criteria

A player in compare mode can:

1. Open two configs, click a weapon bind row in the left text list, and see the matching key light up on both stacked keyboards — including cases where the two players bound the same weapon to different keys.
2. Click a key on their own keyboard and have the row in the left list expand and scroll into view, with the matching key on the opponent's keyboard lighting up if the opponent has that command bound.
3. Toggle off Movement and Teamplay and see a clean weapons-only view of both keyboards, with the left text list still reflecting whatever sidebar section is focused.
4. Hide the right panel entirely via the "Show keyboard" toggle and have the text list reclaim the full width.
5. All of the above at 1080p without obvious visual breakage.

And a player in single view can:

6. Do all of the above with one keyboard instead of two, including clicking keys and rows to cross-link selection.

## File pointers (informational, for the implementation plan)

- `apps/slipgate-app/src/components/SectionMinimap.tsx` — uncommitted changes already present; the keyboard panel will live alongside the minimap in the right rail.
- `apps/slipgate-app/src/components/configMerger.ts` — uncommitted changes already present; compare-mode data flow likely touches this.
- Profile tab source (to be located during extraction step) — current home of the keyboard rendering.
- `apps/slipgate-app/docs/CFG-PARSER.md` — parser architecture, domain classification.
- `apps/slipgate-app/docs/STATE.md` — signals and persistence rules for the "Show keyboard" toggle and any selection state that needs to survive tab switches.
