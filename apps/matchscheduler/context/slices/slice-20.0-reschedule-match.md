# Slice 20.0: Reschedule Scheduled Match

**Dependencies:** Slice 8.0 (Match Proposals & Scheduling), Slice 8.3 (Matches Layout), Slice 18.0 (Quick Add Match)
**User Story:** As a team leader or delegated scheduler, I can change the time of a scheduled match so that when both teams agree on a new time (via Discord), I can update it in one action without cancelling and re-creating.
**Success Criteria:**
- [ ] Leader/scheduler sees "Edit" button on scheduled match cards (hover-revealed, next to Cancel)
- [ ] Clicking "Edit" opens a modal showing current time and a date+time picker for the new time
- [ ] Submitting updates the match in-place (same document, new slotId + scheduledDate)
- [ ] Old slot is unblocked, new slot is blocked (prevents double-booking)
- [ ] Event log entry created: `MATCH_RESCHEDULED`
- [ ] Discord notification sent to both teams: `match_rescheduled` type
- [ ] If match originated from a proposal, the proposal's `confirmedSlotId` is updated
- [ ] Non-leaders/non-schedulers do not see the "Edit" button

---

## Design Decisions

| Decision | Answer | Rationale |
|----------|--------|-----------|
| Opponent confirmation | **Not required** | Good-faith operation — same trust model as quick-add. Teams agreed on Discord already |
| Entry point | **"Edit" button on match card** | Contextual, hover-revealed alongside Cancel |
| Time input | **Date + time picker** | Same as QuickAddMatchModal — familiar pattern |
| Week change | **Allowed** | Match can move to a different week (e.g., postponed by a week) |
| Document update | **In-place update** | Same scheduledMatch doc — preserves ID, origin, proposal link |
| Discord notification | **New `match_rescheduled` type** | Both teams need to know the new time. Quad bot renders it |
| Proposal sync | **Update confirmedSlotId** | If proposal-backed, keep proposal in sync with actual match |
| Permissions | **Leaders + schedulers of EITHER team** | Same as cancel — either side can reschedule |

---

## PRD Mapping

```
PRIMARY SECTIONS:
- Scheduling: Edit/reschedule path for changing match times
- Scheduled Matches: Updates scheduledMatch document in-place

DEPENDENT SECTIONS:
- Team Management: Leader/scheduler permissions (isAuthorized pattern)
- Slot Blocking: Unblock old slot, block new slot
- Event Logging: MATCH_RESCHEDULED event type
- Discord Notifications: match_rescheduled notification type

IGNORED SECTIONS:
- Proposal workflow: No re-confirmation needed
- Availability comparison: Good-faith — leader picks the time
```

---

## 3. Full Stack Architecture

```
FRONTEND COMPONENTS:
- MatchesPanel (MODIFY)
  - Add "Edit" button next to Cancel on scheduled match cards
  - Button visible only when user is leader/scheduler on either team
  - Hover-revealed, same pattern as Cancel button
  - Click opens RescheduleMatchModal

- RescheduleMatchModal (NEW)
  - Firebase listeners: none (one-shot form)
  - Cache interactions: none (all data passed in from match object)
  - UI responsibilities:
    - Shows current match info: "Team A vs Team B"
    - Shows current time: "Wednesday 22:00"
    - Date picker (today or future dates only)
    - Time picker (dropdown: 30-min intervals, 12:00-23:30, user's timezone)
    - Pre-filled with current match date+time
    - Submit button with loading state ("Reschedule" label)
  - User actions: Submit → calls rescheduleMatch Cloud Function
  - Error handling: blocked slot → "This slot is blocked by another match"

FRONTEND SERVICES:
- ScheduledMatchService (MODIFY)
  - Add: rescheduleMatch(matchId, dateTime) → calls 'rescheduleMatch' Cloud Function
  - Method → Backend mapping: rescheduleMatch → functions/match-proposals.js:rescheduleMatch

BACKEND REQUIREMENTS:
⚠️ CLOUD FUNCTION MUST BE IMPLEMENTED IN /functions/match-proposals.js:
- Cloud Functions:
  - rescheduleMatch({ matchId, dateTime }):
    - File: /functions/match-proposals.js
    - Purpose: Update a scheduled match's time slot in-place
    - Auth: context.auth required
    - Permission: isAuthorized on EITHER team (same as cancel)
    - Validation:
      - Match exists and status === 'upcoming'
      - New dateTime is in the future
      - New slot is not blocked by OTHER matches for EITHER team
        (must exclude the current match from blocked-slot check)
    - Transaction:
      1. Read: scheduledMatch, both team docs, parent proposal (if exists)
      2. Derive: new weekId, slotId, scheduledDate from dateTime
      3. Check blocked slots (exclude this match's ID from the query)
      4. Update scheduledMatch: slotId, scheduledDate, blockedSlot, weekId,
         rescheduledAt, rescheduledBy, previousSlotId
      5. Update parent proposal (if exists): confirmedSlotId = new slotId
      6. Write eventLog: MATCH_RESCHEDULED
    - Post-transaction (best-effort):
      7. Write notification docs: type 'match_rescheduled' to both teams
    - Returns: { success: true, newSlotId, newScheduledDate }

INTEGRATION POINTS:
- QuickAddMatchModal: Reuse date+time picker HTML/logic
- CancelMatchModal: Follow same modal pattern (Revealing Module)
- TimezoneService: Convert user's local time to UTC for slotId
- getBlockedSlotsForTeam: Reuse but exclude current match
- computeScheduledDate: Compute new scheduledDate from weekId + slotId
- Discord bot (quad): Must handle new 'match_rescheduled' notification type
```

---

## 4. Schema Changes

### scheduledMatches/{matchId} — New fields

```javascript
{
  // ... existing fields ...

  // Reschedule tracking (optional — only present after reschedule)
  rescheduledAt: Date | null,          // When last rescheduled
  rescheduledBy: string | null,        // userId who rescheduled
  previousSlotId: string | null        // Slot before reschedule (for audit trail)
}
```

### notifications — New type

```javascript
{
  type: 'match_rescheduled',
  status: 'pending',
  scheduledMatchId: string,
  previousSlotId: string,              // Old time
  newSlotId: string,                   // New time
  weekId: string,
  gameType: string,

  // Team info (same pattern as match_sealed)
  proposerTeamId: string,
  proposerTeamName: string,
  proposerTeamTag: string,
  opponentTeamId: string,
  opponentTeamName: string,
  opponentTeamTag: string,

  // Recipient (one doc per team)
  recipientTeamId: string,
  recipientTeamName: string,
  recipientTeamTag: string,

  // Who rescheduled
  rescheduledByUserId: string,
  rescheduledByDisplayName: string | null,

  // Delivery
  delivery: {
    botRegistered: boolean,
    guildId: string | null
  },

  // Logos
  proposerLogoUrl: string | null,
  opponentLogoUrl: string | null,

  createdAt: Date,
  deliveredAt: Date | null
}
```

### eventLog — New event type

```javascript
{
  type: 'MATCH_RESCHEDULED',
  category: 'SCHEDULING',
  teamId: string,              // teamA (proposer)
  teamName: string,
  userId: string,              // Who rescheduled
  details: {
    matchId: string,
    proposalId: string | null,
    teamAId: string,
    teamAName: string,
    teamBId: string,
    teamBName: string,
    previousSlotId: string,
    newSlotId: string,
    previousWeekId: string,
    newWeekId: string
  }
}
```

---

## 5. Integration Code Examples

### Frontend: Edit button in MatchesPanel

```javascript
// In _renderUpcomingMatchCompact(match)
const canEdit = _canUserCancelMatch(match); // Same permission check

// Add Edit button before Cancel button:
${canEdit ? `
    <button class="text-xs text-blue-400/60 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
            data-action="reschedule-match" data-match-id="${match.id}">
        Edit
    </button>
` : ''}
```

### Frontend: Click handler in MatchesPanel

```javascript
// In _setupEventListeners, add delegation:
if (action === 'reschedule-match') {
    const matchId = target.dataset.matchId;
    const match = ScheduledMatchService.getMatchFromCache(matchId);
    if (!match) return;

    RescheduleMatchModal.show(match, async (confirmedMatchId, newDateTime) => {
        try {
            const result = await ScheduledMatchService.rescheduleMatch(confirmedMatchId, newDateTime);
            if (result.success) {
                ToastService.showSuccess('Match rescheduled.');
            } else {
                ToastService.showError(result.error || 'Failed to reschedule match');
            }
        } catch (error) {
            console.error('Reschedule failed:', error);
            ToastService.showError('Network error — please try again');
        }
    });
}
```

### Frontend: RescheduleMatchModal

```javascript
const RescheduleMatchModal = (function() {
    'use strict';

    let _matchId = null;
    let _onConfirm = null;

    function show(match, onConfirm) {
        _matchId = match.id;
        _onConfirm = onConfirm;

        // Pre-fill date+time from current match
        const currentDate = match.scheduledDate; // "2026-02-26"
        const display = TimezoneService.formatSlotForDisplay(match.slotId);

        // Build modal with date picker + time dropdown
        // Same pattern as QuickAddMatchModal._buildTimeOptions()
        // Pre-select current date and time

        // On submit: validate → call _onConfirm(matchId, newDateTime)
    }

    function close() { /* remove modal, cleanup listeners */ }

    return { show, close };
})();
```

### Frontend: ScheduledMatchService addition

```javascript
// In ScheduledMatchService, add:
async function rescheduleMatch(matchId, dateTime) {
    return TeamService.callFunction('rescheduleMatch', { matchId, dateTime });
}
```

### Backend: rescheduleMatch Cloud Function

```javascript
exports.rescheduleMatch = functions
    .region('europe-west3')
    .https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = context.auth.uid;
        const { matchId, dateTime } = data;

        // Validate inputs
        if (!matchId || typeof matchId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'matchId is required');
        }
        if (!dateTime || typeof dateTime !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'dateTime is required');
        }

        const parsedDate = new Date(dateTime);
        if (isNaN(parsedDate.getTime())) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid dateTime');
        }
        if (parsedDate <= new Date()) {
            throw new functions.https.HttpsError('invalid-argument', 'New time must be in the future');
        }

        // Derive new slot info
        const newSlotId = computeSlotId(parsedDate);
        const newWeekId = computeWeekId(parsedDate);
        const newScheduledDate = computeScheduledDate(newWeekId, newSlotId);

        let result = {};

        await db.runTransaction(async (transaction) => {
            // READ PHASE
            const matchRef = db.collection('scheduledMatches').doc(matchId);
            const matchDoc = await transaction.get(matchRef);

            if (!matchDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Match not found');
            }
            const matchData = matchDoc.data();

            if (matchData.status !== 'upcoming') {
                throw new functions.https.HttpsError('failed-precondition', 'Only upcoming matches can be rescheduled');
            }

            // Authorization
            const [teamADoc, teamBDoc] = await Promise.all([
                transaction.get(db.collection('teams').doc(matchData.teamAId)),
                transaction.get(db.collection('teams').doc(matchData.teamBId))
            ]);
            if (!isAuthorized(teamADoc.data(), userId) && !isAuthorized(teamBDoc.data(), userId)) {
                throw new functions.https.HttpsError('permission-denied', 'Only leaders or schedulers can reschedule');
            }

            // Read parent proposal if exists
            let proposalRef = null;
            let proposalDoc = null;
            if (matchData.proposalId) {
                proposalRef = db.collection('matchProposals').doc(matchData.proposalId);
                proposalDoc = await transaction.get(proposalRef);
            }

            // Check blocked slots — exclude THIS match from the check
            // (non-transactional, same pattern as confirmSlot)
            const [teamABlocked, teamBBlocked] = await Promise.all([
                getBlockedSlotsForTeam(matchData.teamAId, newWeekId, matchId),
                getBlockedSlotsForTeam(matchData.teamBId, newWeekId, matchId)
            ]);

            if (teamABlocked.has(newSlotId) || teamBBlocked.has(newSlotId)) {
                throw new functions.https.HttpsError('failed-precondition',
                    'This slot is blocked by another match for one of the teams');
            }

            // WRITE PHASE
            const now = new Date();
            const previousSlotId = matchData.slotId;
            const previousWeekId = matchData.weekId;

            // 1. Update the match in-place
            transaction.update(matchRef, {
                slotId: newSlotId,
                weekId: newWeekId,
                scheduledDate: newScheduledDate,
                blockedSlot: newSlotId,
                rescheduledAt: now,
                rescheduledBy: userId,
                previousSlotId
            });

            // 2. Update parent proposal if exists
            if (proposalDoc && proposalDoc.exists) {
                transaction.update(proposalRef, {
                    confirmedSlotId: newSlotId,
                    updatedAt: now
                });
            }

            // 3. Event log
            const eventId = generateEventId(matchData.teamAName, 'match_rescheduled');
            transaction.set(db.collection('eventLog').doc(eventId), {
                eventId,
                teamId: matchData.teamAId,
                teamName: matchData.teamAName,
                type: 'MATCH_RESCHEDULED',
                category: 'SCHEDULING',
                timestamp: now,
                userId,
                details: {
                    matchId,
                    proposalId: matchData.proposalId,
                    teamAId: matchData.teamAId,
                    teamAName: matchData.teamAName,
                    teamBId: matchData.teamBId,
                    teamBName: matchData.teamBName,
                    previousSlotId,
                    newSlotId,
                    previousWeekId,
                    newWeekId
                }
            });

            result = { previousSlotId, previousWeekId, matchData };
        });

        // Post-transaction: Discord notifications (best-effort)
        // ... write 2 notification docs (one per team) with type: 'match_rescheduled'

        return { success: true, newSlotId, newScheduledDate };
    } catch (error) {
        console.error('❌ Error rescheduling match:', error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError('internal', 'Failed to reschedule match: ' + error.message);
    }
});
```

---

## 6. Performance Classification

| Path | Classification | Approach |
|------|---------------|----------|
| Edit button render | **Hot** | Already in DOM via template literal, hover CSS only |
| Modal open | **Cold** | One-time modal construction, acceptable latency |
| Reschedule submit | **Cold** | Cloud Function call with loading state on button |
| Match card update | **Hot** | Existing Firestore listener auto-updates the card |

---

## 7. Data Flow Diagram

```
User clicks "Edit" on match card
    ↓
RescheduleMatchModal.show(match)
    ↓
User picks new date + time, clicks "Reschedule"
    ↓
ScheduledMatchService.rescheduleMatch(matchId, dateTime)
    ↓
Cloud Function: rescheduleMatch
    ├─ Transaction:
    │   ├─ Validate: auth, permission, future date, slot not blocked
    │   ├─ Update scheduledMatches/{matchId}: slotId, weekId, scheduledDate, blockedSlot
    │   ├─ Update matchProposals/{proposalId}: confirmedSlotId (if proposal-backed)
    │   └─ Write eventLog/{eventId}: MATCH_RESCHEDULED
    │
    └─ Post-transaction (best-effort):
        └─ Write notifications: type 'match_rescheduled' × 2 (one per team)
    ↓
Return { success, newSlotId, newScheduledDate }
    ↓
Frontend: Toast "Match rescheduled." + listener auto-updates card
    ↓
Quad bot: picks up 'match_rescheduled' notification → Discord message
```

---

## 8. Blocked Slot Exclusion

The `getBlockedSlotsForTeam` function currently queries ALL upcoming matches for a team+week. When rescheduling, the current match must be excluded or its own slot will appear blocked.

**Approach:** Add an optional `excludeMatchId` parameter:

```javascript
async function getBlockedSlotsForTeam(teamId, weekId, excludeMatchId = null) {
    const snapshot = await db.collection('scheduledMatches')
        .where('blockedTeams', 'array-contains', teamId)
        .where('weekId', '==', weekId)
        .where('status', '==', 'upcoming')
        .get();

    const blocked = new Set();
    snapshot.forEach(doc => {
        if (excludeMatchId && doc.id === excludeMatchId) return; // Skip self
        const slot = doc.data().blockedSlot;
        blocked.add(slot);
        const before = prevSlot(slot);
        if (before) blocked.add(before);
        const after = nextSlot(slot);
        if (after) blocked.add(after);
    });
    return blocked;
}
```

This is backward-compatible — existing callers pass no `excludeMatchId` and get current behavior.

---

## 9. Test Scenarios

### Frontend
- [ ] Edit button visible only for leaders/schedulers
- [ ] Edit button hidden for non-authorized users
- [ ] Modal pre-fills with current match date and time
- [ ] Cannot submit without changing the time
- [ ] Loading state on submit button
- [ ] Success toast and modal closes
- [ ] Error toast if slot blocked
- [ ] Match card updates in real-time after reschedule

### Backend
- [ ] Rejects unauthenticated requests
- [ ] Rejects non-leader/non-scheduler
- [ ] Rejects cancelled/completed matches
- [ ] Rejects past dateTime
- [ ] Rejects slot blocked by another match
- [ ] Updates match document with new slot fields
- [ ] Preserves all other match fields (origin, gameType, rosters, etc.)
- [ ] Updates parent proposal confirmedSlotId if proposal-backed
- [ ] Creates MATCH_RESCHEDULED event log
- [ ] Creates match_rescheduled notification docs

### Integration
- [ ] Match moves from old time to new time in scheduled matches list
- [ ] Old slot is unblocked (can be used by other matches)
- [ ] New slot is blocked (prevents double-booking)
- [ ] Both teams see the updated match via their listeners
- [ ] Quad bot receives and renders reschedule notification

---

## 10. Common Integration Pitfalls

1. **Forgetting to exclude self from blocked slots** — Without `excludeMatchId`, the current match's slot appears blocked and you can't reschedule to an adjacent time
2. **Not updating proposal confirmedSlotId** — If proposal-backed, the proposal will show the old slot as confirmed while the match is at the new slot
3. **Week change not handled** — If rescheduling to a different week, `weekId` must also update (not just slotId)
4. **Timezone confusion in pre-fill** — Modal must convert stored UTC slotId back to user's local timezone for the date+time pickers
5. **Missing `blockedSlot` update** — Must update both `slotId` AND `blockedSlot` (they're the same value but stored separately)

---

## 11. Implementation Notes

### Files to Create
| File | Purpose |
|------|---------|
| `public/js/components/RescheduleMatchModal.js` | Modal with date+time picker |

### Files to Modify
| File | Change |
|------|--------|
| `public/js/components/MatchesPanel.js` | Add Edit button + click handler |
| `public/js/services/ScheduledMatchService.js` | Add `rescheduleMatch()` method |
| `functions/match-proposals.js` | Add `rescheduleMatch` Cloud Function, update `getBlockedSlotsForTeam` |
| `functions/index.js` | Export new function |
| `public/index.html` | Add `<script>` tag for RescheduleMatchModal.js |

### Patterns to Follow
- **Modal pattern**: CancelMatchModal (Revealing Module, backdrop click to close, Escape key)
- **Date+time picker**: QuickAddMatchModal (same HTML structure, `_buildTimeOptions`, `_localToUTC`)
- **Cloud Function**: quickAddMatch (same validation pattern, `computeSlotId`, `computeWeekId`)
- **Notification**: match_sealed (same doc structure, 2 docs per event, best-effort post-transaction)
- **Permission check**: `_canUserCancelMatch` reuse or extract to `_canUserEditMatch` (same logic)

### Implementation Order
1. Backend: `getBlockedSlotsForTeam` — add `excludeMatchId` param (backward-compatible)
2. Backend: `rescheduleMatch` Cloud Function (transaction + event log)
3. Backend: Post-transaction notification writes
4. Frontend: `RescheduleMatchModal.js` component
5. Frontend: `ScheduledMatchService.rescheduleMatch()` method
6. Frontend: MatchesPanel — Edit button + click handler
7. Wire up: `index.html` script tag, `functions/index.js` export
