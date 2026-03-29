# Availability Enhancement — Cross-Project Contract

> Simplifies the template system to one-per-user, adds recurring auto-apply,
> Discord prev/next navigation, and repeat-last-week. Spans quad + MatchScheduler.
> Reference copies should be placed in each project's `docs/multi-clan/` folder.

---

## Overview

The availability template system is underused (2 real users out of ~300). The current multi-template model is over-engineered and has zero Discord integration. This contract:

1. **Simplifies templates** — one template per user, flat field on user doc (was: subcollection with up to 3)
2. **Adds recurring auto-apply** — toggle on a template to auto-fill new weeks
3. **Adds repeat-last-week** — one-click copy of previous week's availability
4. **Adds Discord prev/next day** — save + navigate to adjacent day without returning to dropdown
5. **Adds Discord template actions** — save template + recurring toggle from Discord

**Key principles:**
- One template per user across both platforms (frontend saves/loads the same data as Discord)
- Recurring = pre-fill, not lock. Auto-applied weeks can still be edited
- Discord UX kept simple: minimal buttons, no modals, ephemeral options message
- Frontend stays the power-user tool; Discord is the quick-access tool

---

## Schema Changes

### Modified: `/users/{userId}`

New `template` field replaces the `users/{userId}/templates/{templateId}` subcollection:

```typescript
interface UserDocument {
  // --- Existing fields (unchanged) ---
  displayName: string;
  qwName: string;
  teams: { [teamId: string]: true };
  discordUserId?: string;
  // ... etc

  // --- NEW field ---
  template?: {
    slots: string[];              // UTC slot IDs: ["mon_1900", "tue_2000", ...]
    recurring: boolean;           // Auto-apply to new weeks
    lastAppliedWeekId: string;    // ISO week last auto-applied to (e.g., "2026-10")
    updatedAt: Timestamp;
  };
}
```

**Notes:**
- `slots` uses the same UTC `{day}_{HHMM}` format as the old subcollection
- `recurring: false` by default
- `lastAppliedWeekId` set to current next-week when recurring is toggled on, updated by cron
- Field is `undefined`/absent if user has never saved a template

### Deprecated: `/users/{userId}/templates/{templateId}`

The subcollection is replaced by the flat field above. Migration script handles existing data. Subcollection docs can be deleted after migration.

### Firestore Rules Update

```
match /users/{userId} {
  // Existing rules unchanged — users can read/write their own doc
  // The template field is just another field on the user doc
  // Cloud Functions use Admin SDK (bypasses rules) for recurring auto-apply
}
```

No new collection-level rules needed since `template` lives on the existing user doc.

---

## Feature 1: Discord Prev/Next Day Navigation

### Current Flow
```
Persistent message → [Edit day... ▾] → select "Wednesday" →
  Ephemeral message with slot toggle buttons + [Save] →
  Save confirmation (auto-deletes 5s) → back to persistent message
```

### New Flow
```
Persistent message → [Edit day... ▾] → select "Wednesday" →
  Ephemeral message with slot toggle buttons + [◀ Prev] [Save] [Next ▶] →
  Click [Next ▶] → saves Wednesday + shows Thursday's buttons →
  Click [Next ▶] → saves Thursday + shows Friday's buttons →
  Click [Save] → saves Friday + shows confirmation (auto-deletes 5s)
```

### Button Layout (ephemeral message)

```
Row 1: [19:00] [19:30] [20:00] [20:30] [21:00]    ← existing slot toggles
Row 2: [21:30] [22:00] [22:30] [23:00]              ← existing slot toggles
Row 3: [◀ Prev]  [Save]  [Next ▶]                   ← navigation row
```

### Behavior

| Button | Action |
|--------|--------|
| **◀ Prev** | Save current day's slots → show previous day's toggle buttons |
| **Save** | Save current day's slots → show confirmation → auto-delete 5s (existing behavior) |
| **Next ▶** | Save current day's slots → show next day's toggle buttons |

### Edge Cases

- **First available day** (Monday, or first non-past day for current week): Prev button disabled (style: Secondary, disabled: true)
- **Sunday**: Next button disabled
- **Past days** (current week only): If Prev would land on a past day, keep stepping back until a valid day is found — or disable if none exist
- **No changes to save**: Prev/Next still navigate (save is a no-op if nothing changed, matching current Save behavior)

### Custom ID Format

Existing: `avail:saveSlots:{teamId}:{cetDay}:{weekId}`
New: `avail:prevDay:{teamId}:{cetDay}:{weekId}` and `avail:nextDay:{teamId}:{cetDay}:{weekId}`

### Key Files (quad)

| File | Changes |
|------|---------|
| `src/modules/availability/interactions.ts` | New handlers: `handlePrevDay()`, `handleNextDay()`. Modify `buildSlotButtonGrid()` to add nav row. Logic to determine prev/next valid day. |
| `src/modules/availability/time.ts` | Helper: `getAdjacentDay(currentDay, direction, weekId)` — returns next/prev valid CET day |

---

## Feature 2: Single Template Model (Schema Migration)

### Migration Script

One-time Node.js script (run locally or as a Cloud Function):

1. Query `collectionGroup('templates')` — currently 6 docs across 5 users
2. For each user, pick the template with the **most slots** (tiebreak: most recently updated)
3. Write to `users/{userId}.template = { slots, recurring: false, lastAppliedWeekId: '', updatedAt }`
4. Delete all subcollection docs under `users/{userId}/templates/`

### Cloud Functions Changes

**Replace** `saveTemplate`, `deleteTemplate`, `renameTemplate` functions with:

| Function | Signature | Behavior |
|----------|-----------|----------|
| `saveTemplate` | `{ slots: string[] }` | Validates slot format, writes `users/{uid}.template` (overwrite). Max 49 slots (7 days × 7 slots is generous). |
| `clearTemplate` | `{}` | Deletes `users/{uid}.template` field |
| `setRecurring` | `{ recurring: boolean }` | Sets `template.recurring`. On `true`: also triggers immediate apply to current + next week (see Feature 4). |

### TemplateService.js Changes (Frontend)

- `loadUserTemplates()` → `loadTemplate()` — listen to `users/{uid}` doc, extract `template` field
- `saveTemplate(name, slots)` → `saveTemplate(slots)` — no name needed
- Remove `renameTemplate()`, `getTemplateCount()`, `canSaveMore()`
- Add `setRecurring(boolean)`
- `getTemplate()` returns single template object or null

### Key Files

| Project | File | Changes |
|---------|------|---------|
| MatchScheduler | `functions/templates.js` | Rewrite: simplified CRUD on user doc field |
| MatchScheduler | `public/js/services/TemplateService.js` | Rewrite: single template, recurring toggle |
| MatchScheduler | `firestore.rules` | Remove subcollection rules if any exist |
| MatchScheduler | `context/SCHEMA.md` | Document new `template` field on user doc |

---

## Feature 3: Frontend Template UI Simplification

### Current UI (TemplatesModal)

```
┌─ Availability Templates ──────── ✕ ─┐
│                                      │
│  normal week            W1  W2  ✏ 🗑 │
│  default                W1  W2       │
│                                      │
│  + Save Current Selection as Template│
│                                      │
│  Clear All Availability              │
└──────────────────────────────────────┘
```

### New UI (TemplatesPopover or simplified modal)

```
┌─ Template ─────────────────────── ✕ ─┐
│                                      │
│  28 slots saved            [Update]  │
│  ─────────────────────────────────── │
│  Load to:   [Week 1]  [Week 2]      │
│  ─────────────────────────────────── │
│  Recurring  ○ OFF                    │
│  ─────────────────────────────────── │
│  [Repeat Last Week → W2]            │
│  ─────────────────────────────────── │
│  Clear Template    Clear Availability│
└──────────────────────────────────────┘
```

**Or if no template saved yet:**

```
┌─ Template ─────────────────────── ✕ ─┐
│                                      │
│  No template saved                   │
│  [Save Current Selection]            │
│  ─────────────────────────────────── │
│  [Repeat Last Week → W2]            │
│  ─────────────────────────────────── │
│  Clear Availability                  │
└──────────────────────────────────────┘
```

### Behavior

| Element | Action |
|---------|--------|
| **Update** | Overwrites template with currently selected cells (same as old "Save") |
| **Load to Week 1/2** | Selects cells matching template slots on target week (same as old W1/W2) |
| **Recurring toggle** | Calls `setRecurring()` — on toggle-on, auto-fills current + next week |
| **Repeat Last Week → W2** | Copies user's availability from Week 1 to Week 2 (see Feature 5) |
| **Clear Template** | Deletes the template |
| **Clear Availability** | Existing behavior — removes user from all slots (confirmation required) |

### Mobile (MobileBottomBar)

Same structure but compact. The bottom-bar popup already supports this layout pattern.

### Key Files

| File | Changes |
|------|---------|
| `public/js/components/TemplatesModal.js` | Rewrite: single template UI with recurring toggle |
| `public/js/components/GridActionButtons.js` | Update "Templates" button interaction |
| `public/js/components/MobileBottomBar.js` | Update mobile template popup |

---

## Feature 4: Recurring Auto-Apply

### Toggle-On Behavior (Immediate)

When user enables recurring (frontend or Discord):

1. Cloud Function `setRecurring(true)` is called
2. Function reads `users/{uid}.template.slots`
3. Computes current weekId and next weekId
4. For each team in `users/{uid}.teams`:
   - For each target week (current, next):
     - Read `availability/{teamId}_{weekId}`
     - Check if user already has ANY slots in this doc
     - If not: add user to all template slots via `arrayUnion`
     - If yes: skip (don't overwrite manual edits)
5. Set `template.lastAppliedWeekId` to the next weekId
6. Set `template.recurring = true`

### Weekly Cron (Cloud Function)

**Schedule**: Every Monday at 04:00 UTC (05:00 CET — before anyone checks the grid)

**Logic**:
1. Query all user docs where `template.recurring == true`
2. Compute the new "next week" weekId (the week after the one that just started)
3. For each user:
   - If `template.lastAppliedWeekId >= newNextWeekId`: skip (already applied)
   - For each team in `users.teams`:
     - Read `availability/{teamId}_{newNextWeekId}`
     - If user has no slots in this doc: apply template via `arrayUnion`
   - Update `template.lastAppliedWeekId = newNextWeekId`

**Cloud Function type**: Scheduled (Cloud Scheduler via Firebase). `functions.pubsub.schedule('every monday 04:00').timeZone('UTC')`

### Toggle-Off Behavior

- Sets `template.recurring = false`
- Does NOT remove already-applied availability (user can clear manually if needed)
- `lastAppliedWeekId` preserved (so re-enabling doesn't double-apply)

### Key Files

| Project | File | Changes |
|---------|------|---------|
| MatchScheduler | `functions/templates.js` | `setRecurring` function + immediate apply logic |
| MatchScheduler | `functions/recurring.js` (new) | Scheduled function for weekly auto-apply |

---

## Feature 5: Repeat Last Week

### Frontend

**Button**: "Repeat Last Week → W2" in the template popover/modal.

**Behavior**:
1. Read `availability/{teamId}_{currentWeekId}` — extract all slots where current user is present
2. Apply those slots to `availability/{teamId}_{nextWeekId}` via `arrayUnion`
3. Skip slots where user is already present in the target week
4. Show toast: "Copied X slots from this week to next week"

**Disabled when**: User has no availability in the current week (show tooltip: "No availability this week to copy")

**Note**: This copies actual marked availability, not the template. It's a "do what I did last week" action. The button label says "→ W2" because the common case is copying the current (displayed) week forward to next week.

**Edge case**: What about copying W2 → W1? This is less common (why would you copy next week backward?). Start with W1→W2 only. If requested, add W2→W1 later.

### Key Files

| File | Changes |
|------|---------|
| `public/js/services/AvailabilityService.js` | New method: `repeatLastWeek(teamId, sourceWeekId, targetWeekId)` |
| `public/js/components/TemplatesModal.js` | Button in the template UI |

---

## Feature 6: Discord Template Actions

### Persistent Message Layout (Updated)

```
┌──────────────────────────────────────┐
│  [Grid PNG - weekly schedule]        │
│                                      │
├──────────────────────────────────────┤
│  Row 1: [ Edit day... ▾ ]           │  ← existing dropdown
│  Row 2: [Save Template] [⚙ Options] │  ← NEW action row
└──────────────────────────────────────┘
```

Both current-week and next-week persistent messages get the new row.

### Save Template Button

**Custom ID**: `avail:saveTemplate:{teamId}:{weekId}`

**Behavior**:
1. Read `availability/{teamId}_{weekId}` — extract all slots where this user is present
2. Convert to week-agnostic slot list (already in `{day}_{HHMM}` format)
3. Write to `users/{uid}.template = { slots, recurring: <preserve existing>, updatedAt }`
4. Ephemeral reply: "✓ Template saved (X slots from this week)"

**Edge case**: User has no availability marked → ephemeral reply: "Mark some availability first, then save as template."

### Options Button

**Custom ID**: `avail:options:{teamId}:{weekId}`

**Behavior**: Sends an ephemeral message with template status + recurring toggle:

```
Your template: 28 slots
Recurring: OFF

[Toggle Recurring]  [Clear Template]
```

Or if no template:
```
No template saved. Use [Save Template] to save your current week.
```

**Toggle Recurring button**: `avail:toggleRecurring:{teamId}`
- Calls same `setRecurring(!current)` logic as frontend
- Updates ephemeral message to show new state
- If toggling ON: ephemeral followup "✓ Recurring ON — applied to current + next week"

**Clear Template button**: `avail:clearTemplate:{teamId}`
- Deletes `users/{uid}.template` field
- Updates ephemeral message: "Template cleared."

### Key Files (quad)

| File | Changes |
|------|---------|
| `src/modules/availability/interactions.ts` | New handlers: `handleSaveTemplate()`, `handleOptions()`, `handleToggleRecurring()`, `handleClearTemplate()` |
| `src/modules/availability/message.ts` | Add action row 2 to persistent message builder |

---

## Dependency Graph

```
                    A1 (Schema Migration)
                   MatchScheduler Functions
                  ┌──────────┼──────────┐
                  │          │          │
                  ▼          ▼          ▼
            A2 (Frontend   A4 (Cron)  A6 (Discord
             Template UI)  MS Funcs    Template)
                  │                     quad
                  ▼
            A3 (Repeat      A5 (Prev/Next)
             Last Week)     quad — INDEPENDENT
             MS Frontend    (can start immediately)
```

**Parallel opportunities:**
- **A5** has zero dependencies — can start immediately, in parallel with everything
- After **A1** lands: **A2**, **A4**, and **A6** can all start in parallel (different files/projects)
- **A3** should follow **A2** (same UI area in frontend)

---

## Phase Execution Plan

### Phase A5: Discord Prev/Next Navigation (quad)
- **When**: Start immediately (no dependencies)
- **Project**: quad
- **Model**: Sonnet, thinking off — clear before/after, mechanical button additions
- **Session**: quad terminal
- **Files**: `interactions.ts`, `time.ts`

### Phase A1: Schema Migration (MatchScheduler)
- **When**: Start immediately (parallel with A5)
- **Project**: MatchScheduler
- **Model**: Sonnet, extended thinking — multi-file refactor, migration script, Cloud Functions
- **Session**: MatchScheduler terminal
- **Files**: `functions/templates.js`, `TemplateService.js`, `firestore.rules`, `SCHEMA.md`
- **Includes**: Migration script (run once), delete old subcollection

### Phase A2: Frontend Template UI (MatchScheduler)
- **When**: After A1 lands
- **Project**: MatchScheduler
- **Model**: Sonnet, extended thinking — UI redesign across desktop + mobile
- **Session**: MatchScheduler terminal
- **Files**: `TemplatesModal.js`, `GridActionButtons.js`, `MobileBottomBar.js`

### Phase A3: Repeat Last Week (MatchScheduler)
- **When**: After A2 lands (same UI area)
- **Project**: MatchScheduler
- **Model**: Sonnet, thinking off — straightforward data copy + button
- **Session**: MatchScheduler terminal
- **Files**: `AvailabilityService.js`, `TemplatesModal.js`

### Phase A4: Recurring Cron (MatchScheduler)
- **When**: After A1 lands (parallel with A2)
- **Project**: MatchScheduler
- **Model**: Sonnet, extended thinking — scheduled function, batch writes
- **Session**: MatchScheduler terminal (or separate)
- **Files**: `functions/recurring.js` (new), `functions/index.js`

### Phase A6: Discord Template Actions (quad)
- **When**: After A1 (schema) and A5 (same codebase area)
- **Project**: quad
- **Model**: Sonnet, extended thinking — new interaction handlers + persistent message changes
- **Session**: quad terminal
- **Files**: `interactions.ts`, `message.ts`

### Execution Timeline

```
Week 1:
  ├── A5 (Prev/Next) ──────────── quad terminal
  ├── A1 (Schema Migration) ───── MatchScheduler terminal
  │
  ├── A4 (Recurring Cron) ──┐
  │                          ├─── MatchScheduler terminal (after A1)
  ├── A2 (Frontend UI) ─────┘
  │
  ├── A3 (Repeat Last Week) ───── MatchScheduler terminal (after A2)
  ├── A6 (Discord Templates) ──── quad terminal (after A1 + A5)
```

### File Conflict Check

| Phase pair | Shared files | Conflict? |
|-----------|-------------|-----------|
| A5 + A6 | `interactions.ts`, `message.ts` | Yes — sequence A6 after A5 |
| A2 + A3 | `TemplatesModal.js` | Yes — sequence A3 after A2 |
| A1 + A4 | `functions/templates.js` | Minimal — A4 creates new file `recurring.js`, A1 modifies `templates.js`. Safe to parallel but cleaner sequential |
| A2 + A4 | None | Safe to parallel |
| A5 + A1 | None (different projects) | Safe to parallel |

---

## Deployment Order

1. **A1**: Deploy Cloud Functions + rules first (backward compatible — old frontend still works)
2. **A5**: Deploy quad with prev/next (independent)
3. **A2 + A3**: Deploy MatchScheduler hosting (new frontend uses new schema)
4. **A4**: Deploy recurring cron function
5. **A6**: Deploy quad with template actions
6. **Migration script**: Run after A1 is deployed, before or after A2

---

## Testing Checklist

### A5: Prev/Next
- [ ] Navigate forward through all 7 days, verify each save
- [ ] Navigate backward, verify saves
- [ ] Prev disabled on Monday (or first available day for current week)
- [ ] Next disabled on Sunday
- [ ] Current week: past days skipped correctly
- [ ] Next week: all 7 days navigable

### A1: Schema Migration
- [ ] Migration script converts existing 6 templates correctly
- [ ] `saveTemplate` Cloud Function writes to user doc
- [ ] `clearTemplate` removes field
- [ ] Old subcollection docs deleted

### A2: Frontend UI
- [ ] Save template from grid selection
- [ ] Load template to Week 1 / Week 2
- [ ] Update template (overwrite)
- [ ] Clear template
- [ ] Recurring toggle visible and functional
- [ ] Mobile layout works

### A3: Repeat Last Week
- [ ] Copies W1 availability to W2
- [ ] Doesn't overwrite existing W2 slots
- [ ] Button disabled when W1 is empty
- [ ] Toast feedback

### A4: Recurring Cron
- [ ] Toggle ON: applies to current + next week
- [ ] Toggle ON: skips weeks where user already has slots
- [ ] Cron applies to new next week on Monday
- [ ] Cron skips users with recurring OFF
- [ ] Cron skips already-applied weeks (lastAppliedWeekId check)
- [ ] Toggle OFF: doesn't remove existing availability

### A6: Discord Template
- [ ] Save Template captures current week's availability
- [ ] Save Template with no availability shows error
- [ ] Options shows template status + recurring state
- [ ] Toggle Recurring ON/OFF from Discord
- [ ] Clear Template from Discord
- [ ] Persistent message shows new action row
