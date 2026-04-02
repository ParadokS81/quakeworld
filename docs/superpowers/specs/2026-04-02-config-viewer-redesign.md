# Config Viewer Redesign

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Redesign CvarRow, add hover tooltip, merge ConfigCompare into ConfigViewer

## Problem

The current config viewer is visually cluttered: inline descriptions, cfg badges, and colored dots make rows noisy. The compare view is a separate component with its own layout that doesn't share category filtering. Users need a clean, scannable list with details on demand.

## Design

### 1. Clean CvarRow

Strip rows to two columns: **cvar name** and **value**. No inline description, no cfg badge, no colored dot.

- **Changed cvars**: highlighted name (primary color) + bold value
- **Default cvars**: dimmed (opacity 0.45)
- **Column headers**: "Cvar" and "Value" (or "Your config" + "Comparison" in compare mode)
- Grid layout: `grid-template-columns: 280px 1fr` (2-col) or `240px 1fr 1fr` (3-col compare)

### 2. Hover Tooltip

A tooltip that appears **below the hovered row**, left-aligned, with `max-width: 480px`.

**Contents:**
- Header: cvar name (primary color) + category breadcrumb (right-aligned, e.g. "HUD > Inventory")
- Description: wrapping text, sans-serif
- Metadata grid (2 or 3 columns depending on compare mode):
  - Your value, Default, Type
  - Comparison value (if compare config loaded)
  - FTE equivalent, QWCL equivalent

**Behavior:**
- Appears on mouse enter after a short delay (~200ms) to avoid flickering while scrolling
- Disappears on mouse leave
- Does NOT appear if the row is click-expanded (expanded view replaces tooltip)

### 3. Click-to-Expand

Clicking a row pins the same content as the tooltip below the row (like current CvarDetail). Only one row can be expanded at a time. Clicking again collapses it.

The expanded view uses the same content/layout as the tooltip but is embedded in the document flow (not absolutely positioned). When a row is expanded, hovering it does NOT show the tooltip.

### 4. Compare Integration

Compare mode is absorbed into ConfigViewer. No separate view/component.

**How it works:**
- "Compare" button (already exists in top bar) opens a paste textarea
- Pasting a config and clicking "Compare" adds a third column to the grid
- A second filter row appears below the category pills with compare-specific filters:
  - All, Different, Same, Only yours, Only theirs
  - "Clear compare" button to exit compare mode
- Category pills (first row) continue to work, filtering across both configs
- Compare filter pills use the same multi-select toggle behavior as categories

**Data flow:**
- Left values: from `props.config.raw_cvars` (existing)
- Right values: from `parseConfig(pasteText).cvars` (existing logic from ConfigCompare)
- Merged key list: union of both cvar sets
- `lookupCvar(name)` for metadata (same as current)

### 5. Files

| File | Action |
|------|--------|
| `CvarRow.tsx` | Rewrite — strip to name + value grid |
| `CvarDetail.tsx` | Rewrite — shared layout for tooltip and expanded view |
| `ConfigViewer.tsx` | Modify — add compare state, compare filters, tooltip, paste UI |
| `ConfigCompare.tsx` | Delete — functionality merged into ConfigViewer |

### 6. Component Structure

```
ConfigViewer
  ├── Top bar (config info, stats, Compare/Convert buttons)
  ├── Category filter pills (existing multi-select)
  ├── Compare filter pills (shown only when compare config loaded)
  ├── Column headers (2-col or 3-col)
  ├── Cvar list (scrollable)
  │   └── For each cvar:
  │       ├── CvarRow (name + value + optional compare value)
  │       │   └── onMouseEnter/Leave → show/hide tooltip
  │       ├── CvarTooltip (absolutely positioned below row, shown on hover)
  │       └── CvarDetail (expanded view, shown on click, replaces tooltip)
  └── Paste textarea (shown when entering compare mode)
```

### 7. Tooltip Positioning

- Positioned absolutely, below the hovered row
- Left-aligned with the row content
- `max-width: 480px`
- `z-index` above other rows but below modals
- If the tooltip would extend below the viewport, it could appear above the row instead (nice-to-have, not required for v1)

### 8. What This Does Not Change

- ConfigConverter stays as a separate view mode (convert is fundamentally different from compare)
- Category multi-select toggle behavior (already implemented)
- Hide defaults checkbox behavior
- Search behavior
- Top bar layout
