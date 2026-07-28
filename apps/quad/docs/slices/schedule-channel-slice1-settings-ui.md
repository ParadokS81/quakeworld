# Slice 1: Schedule Channel Settings UI (MatchScheduler)

> **Project**: MatchScheduler
> **Effort**: Small (~30 min)
> **Dependencies**: None
> **PRD**: `/home/paradoks/projects/quake/SCHEDULE-CHANNEL-PRD.md`

## Goal

Team leader can select a "Schedule channel" from the Discord tab in team settings. This is the channel where the Quad bot will post and maintain the persistent availability grid.

---

## Changes (3 files)

### 1. `functions/bot-registration.js` — Cloud Function

Add `scheduleChannel` handling to `_handleUpdateSettings()` (line 143, after `const { notifications, autoRecord } = data;`):

```js
const { notifications, autoRecord, scheduleChannel } = data;

// ... existing notifications and autoRecord blocks ...

if (scheduleChannel !== undefined) {
    updateData.scheduleChannel = {
        channelId: scheduleChannel.channelId ?? null,
        channelName: scheduleChannel.channelName ?? null,
    };
}
```

No validation beyond null-coalescing needed — channelId is a Discord snowflake string selected from the dropdown, and clearing sets it to null.

### 2. `public/js/components/TeamManagementModal.js` — Frontend UI

**Clone the notification channel pattern exactly.** Reference:
- `_renderNotificationSettingsSection()` (lines ~839-894) — the template to clone
- `_handleNotificationChannelChange()` (lines ~1158-1198) — the handler to clone
- Wiring in `_attachVoiceBotListeners()` (line ~1004)

#### a) Add `_renderScheduleChannelSection()`

Place it after the notification settings section in the active bot state render. It should:

- Read `_botRegistration?.scheduleChannel?.channelId` for the currently selected value
- Use the same `_botRegistration?.availableChannels` array as notification dropdown
- Default `<option>`: `"— No schedule channel —"` (value `""`)
- Channel options: same format as notification dropdown (# prefix, lock icon if no permission)
- Permission warning: same pattern (`canPost` check)
- Select element ID: `schedule-channel-select`
- Section header: "Schedule Channel" with small description: "Post availability grid in this channel"

#### b) Add `_handleScheduleChannelChange()`

Clone `_handleNotificationChannelChange()` but:
- Read from `document.getElementById('schedule-channel-select')`
- Build: `{ channelId, channelName }` (no `enabled` field — it's enabled when a channel is selected)
- Optimistic update: `_botRegistration.scheduleChannel = newScheduleChannel`
- Service call: `BotRegistrationService.updateSettings(_teamId, { scheduleChannel: newScheduleChannel })`
- Success toast: `'Schedule channel updated'`
- Rollback pattern: same as notification handler

#### c) Wire in `_attachVoiceBotListeners()`

```js
const scheduleChannelSelect = document.getElementById('schedule-channel-select');
scheduleChannelSelect?.addEventListener('change', _handleScheduleChannelChange);
```

### 3. `public/js/services/BotRegistrationService.js` — Cache update

In `updateSettings()`, after the existing cache update lines for `notifications` and `autoRecord`, add:

```js
if (settings.scheduleChannel !== undefined) cached.scheduleChannel = settings.scheduleChannel;
```

### 4. (Optional) Bot invite permissions

In `getBotInviteUrl()`, update the permissions integer from `3148800` to `3181568` (adds `AttachFiles` = 32768). This is needed for the bot to upload PNG images. Not blocking for this slice but good to do now.

---

## Verification

1. Start dev environment, open team settings → Discord tab (bot must be connected/active)
2. See "Schedule Channel" dropdown below notification settings
3. Select a channel → check Firestore `botRegistrations/{teamId}` → `scheduleChannel.channelId` and `scheduleChannel.channelName` are set
4. Select "No schedule channel" → `scheduleChannel.channelId` is `null`
5. Refresh page → selection persists (read from Firestore)
