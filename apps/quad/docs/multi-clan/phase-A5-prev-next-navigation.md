# Phase A5: Discord Prev/Next Day Navigation

## Context

When a user edits their availability via Discord, they select a day from the dropdown, toggle time slots, then click Save. The save shows a confirmation that auto-deletes after 5 seconds, returning them to the persistent message. To edit another day they must re-open the dropdown and select again. This is slow for users filling out multiple days.

This phase adds **Prev** and **Next** buttons alongside the Save button on the ephemeral day-editing message. They save the current day's changes and immediately show the adjacent day's toggle buttons — no round-trip to the persistent message.

Read `AVAILABILITY-ENHANCEMENT-CONTRACT.md` at the orchestrator level for the full contract.

---

## What Changes

1. **Add a navigation row** to the ephemeral slot-toggle message: `[◀ Prev] [Save] [Next ▶]`
2. **New handlers** for prev/next that save + re-render the adjacent day
3. **Helper function** in `time.ts` to compute prev/next valid day within a week
4. **Edge cases**: disable Prev on the first available day, disable Next on Sunday

---

## Files to Modify

### 1. `src/modules/availability/time.ts`

#### Add `getAdjacentDay()` helper

This function returns the next or previous valid CET day within a week. For the current week, it skips past days. For next week, all 7 days are valid.

Add after `getRemainingDays()` (line 161):

```typescript
/**
 * Get the adjacent valid day in a given direction within a week.
 * For current week, skips past days. For next week, all days are valid.
 * Returns null if no valid adjacent day exists (boundary reached).
 */
export function getAdjacentDay(
    cetDay: string,
    direction: 'prev' | 'next',
    weekId: string,
    isNextWeek: boolean,
): string | null {
    const dayIdx = DAY_ORDER.indexOf(cetDay);
    if (dayIdx === -1) return null;

    const step = direction === 'next' ? 1 : -1;
    let candidate = dayIdx + step;

    while (candidate >= 0 && candidate < DAY_ORDER.length) {
        const candidateDay = DAY_ORDER[candidate];
        // For next week, all days are valid. For current week, skip past days.
        if (isNextWeek || !isDayPast(candidateDay, weekId)) {
            return candidateDay;
        }
        candidate += step;
    }

    return null; // No valid day in this direction
}
```

Also export `DAY_ORDER` since the navigation handlers need it for boundary checks:

```typescript
export { DAY_ORDER };
```

Or simply add `DAY_ORDER` to the existing exports. Currently it's a module-level `const` but not exported.

---

### 2. `src/modules/availability/interactions.ts`

#### a) Update imports

Add the new `getAdjacentDay` import (line 25-34 area):

```typescript
import {
    getCurrentWeekId,
    getNextWeekId,
    getWeekDates,
    cetToUtcSlotId,
    isDayPast,
    isSlotPast,
    formatCetTime,
    CET_SLOT_TIMES,
    getAdjacentDay,    // NEW
} from './time.js';
```

#### b) Update button routing in `handleButton()` (line 58-70)

Add routes for the new custom IDs before the `else` fallback:

```typescript
export async function handleButton(interaction: ButtonInteraction): Promise<void> {
    const customId = interaction.customId;

    if (customId.startsWith('avail:clearWeek:')) {
        await handleClearWeek(interaction);
    } else if (customId.startsWith('avail:toggleSlot:')) {
        await handleSlotToggle(interaction);
    } else if (customId.startsWith('avail:saveSlots:')) {
        await handleSaveSlots(interaction);
    } else if (customId.startsWith('avail:prevDay:')) {     // NEW
        await handleNavDay(interaction, 'prev');
    } else if (customId.startsWith('avail:nextDay:')) {     // NEW
        await handleNavDay(interaction, 'next');
    } else {
        await interaction.reply({ content: 'Unknown button.', flags: MessageFlags.Ephemeral });
    }
}
```

#### c) Add `handleNavDay()` handler

This is the core new function. It saves the current day (reusing save logic) then shows the adjacent day's toggle buttons. Add after `handleSaveSlots()` (after line 253):

```typescript
/**
 * Handle Prev/Next navigation: save current day, show adjacent day's buttons.
 * Custom ID format: avail:prevDay:{teamId}:{cetDay}:{weekId} (or avail:nextDay:...)
 */
async function handleNavDay(interaction: ButtonInteraction, direction: 'prev' | 'next'): Promise<void> {
    await interaction.deferUpdate();

    // Parse custom ID — same format as saveSlots
    const parts = interaction.customId.split(':');
    const teamId = parts[2];
    const cetDay = parts[3];
    const weekId = parts[4] ?? getCurrentWeekId();
    const isNextWeek = weekId !== getCurrentWeekId();

    const user = await resolveUser(interaction.user.id, teamId);
    if (!user) return replyNotLinked(interaction, teamId);

    // ── Save current day (same logic as handleSaveSlots) ──
    const selectedCetTimes: string[] = [];
    for (const row of interaction.message.components.filter(r => r.type === ComponentType.ActionRow)) {
        for (const component of row.components) {
            if (component.type !== ComponentType.Button) continue;
            if (!component.customId?.startsWith('avail:toggleSlot:')) continue;
            if (component.style === ButtonStyle.Success) {
                const cetTime = component.customId.split(':')[5];
                if (cetTime) selectedCetTimes.push(cetTime);
            }
        }
    }

    const currentSlots = getUserSlotsForWeek(teamId, user.uid, cetDay, weekId);
    const toAdd = selectedCetTimes.filter(t => !currentSlots.includes(t));
    const toRemove = currentSlots.filter(t => !selectedCetTimes.includes(t));

    // Write changes if any
    if (toAdd.length > 0 || toRemove.length > 0) {
        const docId = `${teamId}_${weekId}`;
        const updateData: Record<string, any> = {
            lastUpdated: FieldValue.serverTimestamp(),
        };

        for (const cetTime of toAdd) {
            const utcSlotId = cetToUtcSlotId(cetDay, cetTime);
            updateData[`slots.${utcSlotId}`] = FieldValue.arrayUnion(user.uid);
            updateData[`unavailable.${utcSlotId}`] = FieldValue.arrayRemove(user.uid);
        }
        for (const cetTime of toRemove) {
            const utcSlotId = cetToUtcSlotId(cetDay, cetTime);
            updateData[`slots.${utcSlotId}`] = FieldValue.arrayRemove(user.uid);
        }

        try {
            const db = getDb();
            const docRef = db.collection('availability').doc(docId);
            const doc = await docRef.get();
            if (!doc.exists) {
                await docRef.set({ teamId, weekId, slots: {}, unavailable: {}, ...updateData });
            } else {
                await docRef.update(updateData);
            }
        } catch (err) {
            logger.error('Failed to save during nav', {
                teamId, userId: user.uid, direction,
                error: err instanceof Error ? err.message : String(err),
            });
            await interaction.editReply({ content: 'Failed to save — try again.', components: [] });
            return;
        }

        logger.info('Availability saved via nav', {
            teamId, userId: user.uid, cetDay, weekId, direction,
            added: toAdd.length, removed: toRemove.length,
        });
    }

    // ── Navigate to adjacent day ──
    const nextDay = getAdjacentDay(cetDay, direction, weekId, isNextWeek);
    if (!nextDay) {
        // Shouldn't happen (button should be disabled), but handle gracefully
        await interaction.editReply({ content: 'No more days in this direction.', components: [] });
        setTimeout(() => { interaction.deleteReply().catch(() => {}); }, 3000);
        return;
    }

    // Build the new day's button grid
    const newSlots = getUserSlotsForWeek(teamId, user.uid, nextDay, weekId);
    const visibleSlots = CET_SLOT_TIMES
        .filter(time => isNextWeek || !isSlotPast(cetToUtcSlotId(nextDay, time), weekId));

    if (visibleSlots.length === 0) {
        await interaction.editReply({ content: 'All time slots for this day have passed.', components: [] });
        setTimeout(() => { interaction.deleteReply().catch(() => {}); }, 3000);
        return;
    }

    const components = buildSlotButtonGrid(visibleSlots, newSlots, teamId, nextDay, weekId);
    const dayLabel = formatDayLabel(nextDay, weekId);
    const weekLabel = isNextWeek ? ' (next week)' : '';

    await interaction.editReply({
        content: `**${dayLabel}${weekLabel}**\nTap to toggle your availability, then save:`,
        components,
    });
}
```

#### d) Modify `buildSlotButtonGrid()` to add navigation buttons (lines 262-300)

Replace the save row at the bottom with a navigation row containing Prev, Save, and Next:

```typescript
function buildSlotButtonGrid(
    visibleSlots: string[],
    currentSlots: string[],
    teamId: string,
    cetDay: string,
    weekId: string,
): ActionRowBuilder<ButtonBuilder>[] {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    let currentRow = new ActionRowBuilder<ButtonBuilder>();

    for (let i = 0; i < visibleSlots.length; i++) {
        const cetTime = visibleSlots[i];
        const isAvailable = currentSlots.includes(cetTime);

        const button = new ButtonBuilder()
            .setCustomId(`avail:toggleSlot:${teamId}:${cetDay}:${weekId}:${cetTime}`)
            .setLabel(formatCetTime(cetTime))
            .setStyle(isAvailable ? ButtonStyle.Success : ButtonStyle.Secondary);

        currentRow.addComponents(button);

        // 5 buttons per row
        if (currentRow.components.length === 5 || i === visibleSlots.length - 1) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder<ButtonBuilder>();
        }
    }

    // Navigation row: [◀ Prev] [Save] [Next ▶]
    const isNextWeek = weekId !== getCurrentWeekId();
    const prevDay = getAdjacentDay(cetDay, 'prev', weekId, isNextWeek);
    const nextDay = getAdjacentDay(cetDay, 'next', weekId, isNextWeek);

    const navRow = new ActionRowBuilder<ButtonBuilder>();

    navRow.addComponents(
        new ButtonBuilder()
            .setCustomId(`avail:prevDay:${teamId}:${cetDay}:${weekId}`)
            .setLabel('◀ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!prevDay),
    );

    navRow.addComponents(
        new ButtonBuilder()
            .setCustomId(`avail:saveSlots:${teamId}:${cetDay}:${weekId}`)
            .setLabel('Save')
            .setStyle(ButtonStyle.Primary),
    );

    navRow.addComponents(
        new ButtonBuilder()
            .setCustomId(`avail:nextDay:${teamId}:${cetDay}:${weekId}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!nextDay),
    );

    rows.push(navRow);

    return rows;
}
```

**Important**: The `handleSlotToggle()` function (line 136-163) rebuilds rows from the message components. It filters for `ComponentType.ActionRow` and rebuilds buttons. This already works correctly — it preserves all buttons including the nav buttons because it iterates all components. The toggle only flips the button matching `clickedId`. No changes needed to `handleSlotToggle()`.

---

## Verification

After implementing, compile and verify:

```bash
npx tsc --noEmit
```

Then test in Discord:
1. Select a day from the dropdown → verify Prev/Save/Next appear on the bottom row
2. Toggle some slots, click Next → verify the current day is saved and next day appears
3. Toggle some slots on the new day, click Prev → verify it saves and goes back
4. On Monday (or first non-past day): Prev should be disabled/grayed out
5. On Sunday: Next should be disabled/grayed out
6. Click Save → verify it still works as before (confirmation + auto-delete)
7. For current week: verify past days are skipped when navigating
