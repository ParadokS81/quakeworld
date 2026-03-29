# Phase U5: MatchScheduler Auto-Record UI Updates

> **Model:** Sonnet, thinking off
> **Project:** MatchScheduler
> **Depends on:** U1 (Schema understanding only — no code dependency)
> **Parallel with:** U2 (Discord Auto-Record), U3 (Mumble Migration)
> **Contract:** `UNIFIED-AUTO-RECORD-CONTRACT.md` at workspace root

---

## Goal

Update the auto-record settings UI to support the new `platform` field and wider `minPlayers` range. Redirect the Mumble tab's separate auto-record toggle to the unified Recording settings.

---

## Task 1: Cloud Function Validation

Update `functions/bot-registration.js` — the `_handleUpdateSettings` handler.

### Current validation:
- `minPlayers`: accepts only `3` or `4`
- No `platform` field

### New validation:
```javascript
// minPlayers: accept 2-6 (was: only 3 or 4)
if (autoRecord.minPlayers !== undefined) {
  const mp = Number(autoRecord.minPlayers);
  if (!Number.isInteger(mp) || mp < 2 || mp > 6) {
    throw new functions.https.HttpsError('invalid-argument', 'minPlayers must be 2-6');
  }
}

// platform: new field
if (autoRecord.platform !== undefined) {
  if (!['both', 'discord', 'mumble'].includes(autoRecord.platform)) {
    throw new functions.https.HttpsError('invalid-argument', 'platform must be both, discord, or mumble');
  }
}
```

### Backward compatibility:
- If `platform` is not provided in the update, don't overwrite existing value
- Existing docs without `platform` field → quad treats as `'both'`

---

## Task 2: Auto-Record Settings UI (Recordings Tab)

Update `public/js/components/TeamManagementModal.js` — the `_renderRecordingSettings()` function and related handlers.

### 2a: Replace minPlayers radio buttons with dropdown

**Current:** Two radio buttons (3+ players, 4+ players)

**New:** A dropdown selector with options 2-6:
```html
<select class="auto-record-min-players-select">
  <option value="2">2+ players</option>
  <option value="3" selected>3+ players</option>
  <option value="4">4+ players</option>
  <option value="5">5+ players</option>
  <option value="6">6+ players</option>
</select>
```

### 2b: Add platform dropdown

**New UI element** — shown ONLY when team has both Discord bot AND Mumble configured:

```html
<div class="auto-record-platform-row" style="display: none;">
  <label>Record on</label>
  <select class="auto-record-platform-select">
    <option value="both">Both platforms</option>
    <option value="discord">Discord only</option>
    <option value="mumble">Mumble only</option>
  </select>
</div>
```

**Visibility logic:**
```javascript
// Show platform selector only if team has both Discord and Mumble
const hasMumble = _mumbleConfig && _mumbleConfig.status === 'active';
const hasDiscord = _botRegistration && _botRegistration.status === 'active';
const showPlatform = hasMumble && hasDiscord;

platformRow.style.display = showPlatform ? '' : 'none';
```

If only one platform is configured, the platform selector is hidden (implied: that platform only).

### 2c: Event handlers

```javascript
// Min players change
async _handleAutoRecordMinPlayersChange(value) {
  const minPlayers = parseInt(value, 10);
  const currentAutoRecord = this._botRegistration?.autoRecord || {};
  await BotRegistrationService.updateSettings(this._teamId, {
    autoRecord: { ...currentAutoRecord, minPlayers }
  });
}

// Platform change
async _handleAutoRecordPlatformChange(value) {
  const currentAutoRecord = this._botRegistration?.autoRecord || {};
  await BotRegistrationService.updateSettings(this._teamId, {
    autoRecord: { ...currentAutoRecord, platform: value }
  });
}
```

Follow the existing pattern: optimistic UI update → call service → revert on error → show toast.

---

## Task 3: Mumble Tab Auto-Record Redirect

Update the Mumble tab section in `TeamManagementModal.js`.

### Current:
A toggle switch for Mumble auto-record that writes to `mumbleConfig/{teamId}.autoRecord`.

### New:
Replace the toggle with a read-only indicator that points to Recording settings:

```html
<div class="mumble-auto-record-redirect">
  <div class="flex items-center gap-2">
    <span class="text-sm text-gray-500">Auto-recording</span>
    <span class="badge badge-sm ${autoRecordEnabled ? 'badge-success' : 'badge-ghost'}">
      ${autoRecordEnabled ? 'Enabled' : 'Disabled'}
    </span>
  </div>
  <p class="text-xs text-gray-400 mt-1">
    Managed in Recording settings
  </p>
</div>
```

Read the current state from `_botRegistration.autoRecord.enabled` (not from mumbleConfig).

Remove or comment out the old `_handleMumbleAutoRecordToggle` handler that wrote to mumbleConfig.

---

## Task 4: Initialize Platform from Existing Data

When rendering the auto-record settings, read the current `platform` value:

```javascript
const autoRecord = _botRegistration?.autoRecord || {};
const platform = autoRecord.platform || 'both';  // Default if not set
const minPlayers = autoRecord.minPlayers || 3;
```

Set the dropdown values accordingly on render.

---

## Files to modify
- `functions/bot-registration.js` (Task 1: validation)
- `public/js/components/TeamManagementModal.js` (Tasks 2-4: UI)

## Files NOT to modify
- `public/js/services/BotRegistrationService.js` (already passes autoRecord object through)
- `firestore.rules` (writes go through CF/Admin SDK, no client writes)
- `public/js/services/MumbleConfigService.js` (keep for other Mumble settings, just stop using for auto-record)

## Verification
- `npm run dev` starts without errors
- Recordings tab:
  - minPlayers dropdown shows 2-6, defaults to current value
  - Platform dropdown appears only when both Discord and Mumble are configured
  - Changing settings writes correct values to Firestore (check in Firebase console)
- Mumble tab:
  - Shows "Enabled" or "Disabled" badge (read-only)
  - Shows "Managed in Recording settings" text
  - No toggle switch
- Cloud Function:
  - Accepts minPlayers 2-6
  - Accepts platform: both/discord/mumble
  - Rejects invalid values
