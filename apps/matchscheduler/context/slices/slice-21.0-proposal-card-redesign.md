# Slice 21.0: Proposal Card Redesign — Slot Toggles & Simplified Layout

**Dependencies:** Slice 8.0 (Match Proposals & Scheduling), Slice 8.3 (Matches Layout)
**User Story:** As a team leader, I want the expanded proposal card to clearly show which team confirmed which slots using visual toggles with team logos, so I can instantly see the confirmation state without parsing text labels. I also want "Cancel" renamed so I don't accidentally cancel an entire proposal when I just want to dismiss a view.
**Trigger:** A user cancelled a proposal by accident because "Cancel" read as "close this view" rather than "destroy this proposal."

**Success Criteria:**
- [ ] "Cancel" button renamed to "Withdraw Proposal" with confirmation modal
- [ ] Slot rows redesigned: `[Day] [Time] [OurLogo] [Toggle] [XvX] [TheirLogo] [Indicator]`
- [ ] Our toggle is interactive (green = confirmed, click to withdraw; muted = click to confirm)
- [ ] Their indicator is read-only (green = confirmed, muted = waiting)
- [ ] Header simplified: remove "Min XvX", "W##", "You confirmed N slots" line
- [ ] Official/Practice badge moves to header row after team names
- [ ] "Load Grid View" button removed
- [ ] Discord contact moves to bottom row as "Contact [OpponentLogo] [DiscordIcon]"
- [ ] Bottom row layout: `[Contact ...] .................. [Withdraw Proposal]`
- [ ] Mobile (MobileProposalDetail.js) updated to match new slot row pattern

---

## Design Decisions

| Decision | Answer | Rationale |
|----------|--------|-----------|
| "Cancel" rename | **"Withdraw Proposal"** | "Cancel" is ambiguous — users read it as "dismiss/close" not "destroy proposal". "Withdraw" is unambiguous |
| Confirmation modal | **Yes, before withdraw** | One-click destructive action on proposals has no undo path. Reuse CancelMatchModal pattern |
| Slot row layout | **Logo + toggle pattern** | Team logos eliminate need for "you"/"them" labels. Toggles show state at a glance |
| Our toggle | **Interactive pill/dot** | Green bg = confirmed (click withdraws). Muted = not confirmed (click confirms). Pointer cursor + hover effect |
| Their indicator | **Read-only dot** | Same visual as toggle but no hover/cursor. Teams can only confirm for themselves |
| Game type per-slot display | **Remove "OFFI"/"PRAC" from each row** | Game type is a card-level setting shown in header, redundant on every slot row |
| Load Grid View | **Remove** | Slot rows already show XvX counts. The grid view is one click away via team browser if needed |
| Header simplification | **Remove meta line entirely** | Min filter and week number are internal details. Confirmed count is now visually obvious from toggles |
| Official/Practice | **Move to header row, after team names** | Keeps it visible without a dedicated meta row. Same toggle buttons, just relocated |
| Discord contact | **Bottom row with opponent logo** | "Contact [Logo] [Discord]" — clear who you're contacting. Replaces the header discord icon |
| Collapsed card | **Minimal changes** | Remove slot count badge (toggles make it obvious when expanded). Keep discord icon in header for collapsed state only |

---

## Visual Spec

### Expanded Card — Before

```
┌─────────────────────────────────────────────────────────────┐
│ [SD] Suddendeath vs Tribe of Tjernobyl [ToT]  2  💬  ▲    │
│ Min 4v4 · W10 · [Official] [Practice] · You confirmed 2    │
│                                                             │
│ Tuesday   22:00   5v4   ✓ you              OFFI  Withdraw  │
│ Tuesday   22:30   5v4   ✓ you              OFFI  Withdraw  │
│                                                             │
│ [Load Grid View]  [Cancel]                                  │
└─────────────────────────────────────────────────────────────┘
```

### Expanded Card — After

```
┌─────────────────────────────────────────────────────────────┐
│ [SD] Suddendeath vs Tribe of Tjernobyl [ToT]               │
│ [Official] [Practice]                                ▲      │
│                                                             │
│ Tuesday  22:00   [SD] [●]  5v4  [ToT] [○]                  │
│ Tuesday  22:30   [SD] [●]  5v4  [ToT] [○]                  │
│                                                             │
│ [Contact [ToT] 💬]                   [Withdraw Proposal]   │
└─────────────────────────────────────────────────────────────┘
```

**Toggle states:**
- `[●]` = Green dot/pill — confirmed. If ours: click to withdraw. If theirs: read-only.
- `[○]` = Muted dot/pill — not confirmed. If ours: click to confirm (requires game type set). If theirs: read-only.
- `[●●]` = Both confirmed same slot — row gets green tint background (existing behavior preserved).

**Confirm flow (clicking muted our-toggle):**
1. Game type must be selected (Official/Practice buttons in header)
2. If not set → tooltip "Select Official or Practice first" (existing behavior)
3. If set → calls ProposalService.confirmSlot() → toggle turns green
4. If both sides now confirmed → MatchSealedModal fires (existing behavior)

**Withdraw flow (clicking green our-toggle):**
1. Click green toggle → calls ProposalService.withdrawConfirmation()
2. Toggle turns muted
3. Toast: "Confirmation withdrawn"

---

## Full Stack Architecture

```
FRONTEND COMPONENTS:
- MatchesPanel.js (MODIFY)
  - _renderExpandedProposal(): Rewrite slot rows to toggle layout
  - _renderProposalCard(): Simplify header, relocate Official/Practice
  - Remove _handleLoadGridView() and all references
  - Rename cancel-proposal action to withdraw-proposal
  - Add confirmation modal before _handleCancelProposal()
  - Move discord contact button from header to expanded bottom row
  - New bottom row: [Contact [logo] discord] ... [Withdraw Proposal]

- CancelMatchModal.js (REUSE pattern)
  - Either extend to handle proposals OR create lightweight confirm dialog
  - Message: "Withdraw this proposal? Both teams will lose their confirmations."
  - Buttons: "Keep Proposal" / "Withdraw Proposal"

- MobileProposalDetail.js (MODIFY)
  - Update slot rows to toggle layout (same pattern, touch-friendly sizing)
  - Rename cancel to "Withdraw Proposal" + confirmation
  - Move Official/Practice to header area
  - Bottom bar: [Contact [logo] discord] [Withdraw Proposal]

BACKEND: No changes needed
  - All existing Cloud Functions work as-is
  - confirmSlot, withdrawConfirmation, cancelProposal — same API
  - The "Withdraw Proposal" button still calls cancelProposal()

FIRESTORE: No schema changes
  - All data structures remain the same
  - Toggle states derived from existing proposerConfirmedSlots / opponentConfirmedSlots
```

---

## Implementation Details

### Slot Row HTML Structure

```html
<div class="slot-row flex items-center gap-2 px-3 py-1.5 rounded {rowBgClass}">
  <!-- Day + Time -->
  <span class="slot-day text-sm text-muted-foreground w-20">{day}</span>
  <span class="slot-time text-sm font-medium w-14">{time}</span>

  <!-- Our team: logo + toggle -->
  <img src="{ourLogoUrl}" class="w-5 h-5 rounded-full" alt="{ourTag}">
  <button class="slot-toggle slot-toggle-ours w-5 h-5 rounded-full
    {weConfirmed ? 'bg-green-500 hover:bg-green-400 cursor-pointer' : 'bg-muted hover:bg-muted/80 cursor-pointer'}"
    data-action="{weConfirmed ? 'withdraw' : 'confirm'}"
    data-proposal-id="{proposalId}" data-slot="{slotId}"
    {!canAct ? 'disabled' : ''}>
  </button>

  <!-- Availability count -->
  <span class="text-xs text-muted-foreground w-8 text-center">{ourCount}v{theirCount}</span>

  <!-- Their team: logo + indicator -->
  <img src="{theirLogoUrl}" class="w-5 h-5 rounded-full" alt="{theirTag}">
  <div class="slot-indicator w-5 h-5 rounded-full
    {theyConfirmed ? 'bg-green-500' : 'bg-muted'}"
    title="{theyConfirmed ? theirTag + ' confirmed' : 'Waiting for ' + theirTag}">
  </div>
</div>
```

### Confirmation Modal for Withdraw Proposal

```javascript
// In _handleCancelProposal(), add modal before calling backend:
async function _handleCancelProposal(proposalId, btn) {
    const proposal = ProposalService.getProposal(proposalId);

    // Show confirmation modal (reuse CancelMatchModal pattern)
    const confirmed = await showConfirmDialog({
        title: `Withdraw proposal?`,
        description: `${proposal.proposerTeamName} vs ${proposal.opponentTeamName} — both teams will lose their confirmed slots.`,
        confirmText: 'Withdraw Proposal',
        cancelText: 'Keep Proposal',
        destructive: true
    });

    if (!confirmed) return;

    // Existing logic continues...
    btn.disabled = true;
    btn.textContent = 'Withdrawing...';
    const result = await ProposalService.cancelProposal(proposalId);
    // ...
}
```

### Determining "Our" vs "Their" Team

```javascript
// Already available in MatchesPanel — use existing logic:
const userTeamIds = TeamService.getUserTeamIds();
const isProposer = userTeamIds.includes(proposal.proposerTeamId);
const isOpponent = userTeamIds.includes(proposal.opponentTeamId);

// "Our" team = the side the current user belongs to
const ourTeamId = isProposer ? proposal.proposerTeamId : proposal.opponentTeamId;
const theirTeamId = isProposer ? proposal.opponentTeamId : proposal.proposerTeamId;

// Confirmation lookup
const weConfirmed = isProposer
  ? !!proposal.proposerConfirmedSlots?.[slotId]
  : !!proposal.opponentConfirmedSlots?.[slotId];
const theyConfirmed = isProposer
  ? !!proposal.opponentConfirmedSlots?.[slotId]
  : !!proposal.proposerConfirmedSlots?.[slotId];
```

### Edge Case: User on Both Teams

If a user is leader on both sides of a proposal (rare but possible):
- Show both toggles as interactive
- "Our" = proposer side, "Their" = opponent side
- Both toggles are clickable

### Standin Indicator

Currently standin adds "+1" in cyan next to the count. Preserve this:
```
[SD] [●]  4+1v3  [ToT] [○]
```
The "+1" renders inline with the count, same as today.

---

## Files to Modify

| File | Change | Scope |
|------|--------|-------|
| `public/js/components/MatchesPanel.js` | Rewrite expanded card rendering, slot rows, header, bottom row, add confirm modal | Major |
| `public/js/mobile/MobileProposalDetail.js` | Same slot row + header + bottom bar changes for mobile | Major |
| `src/css/input.css` | Add `.slot-toggle` and `.slot-indicator` styles if needed beyond Tailwind | Minor |
| `public/js/components/CancelMatchModal.js` | Optional: extend to support proposal withdrawal, or create inline confirm dialog | Minor |

---

## Out of Scope

- Archived proposal restore (separate slice if needed)
- Changes to collapsed proposal card (minimal — just remove slot count badge if desired)
- Changes to scheduled match cards (different component, different flow)
- Backend/Cloud Function changes (none needed)
- Mobile gesture changes
