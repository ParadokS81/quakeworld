# Post-Review Fixes — quad

Cross-project review found 3 bugs that need fixing. Fix in order — #1 blocks #2.

---

## Fix 1 (HIGH): Pipeline crashes on Mumble recordings — null guild

`pipeline.ts` accesses `session.guild.id` in multiple places, but Mumble recordings have `guild: null` in `session_metadata.json`. This crashes the entire processing pipeline for any Mumble recording.

### Where to fix

Check these files for `session.guild` or `.guild.` access:

- `src/modules/processing/pipeline.ts` — lines ~181, ~199, ~299 (guild.id used for botRegistration lookup, logging, etc.)
- `src/modules/processing/stages/audio-splitter.ts` — line ~382 (guild.name in logging)

### How to fix

For Mumble recordings (`session.source === 'mumble'`), the guild is null. The pipeline should:
1. Skip the `botRegistrations` lookup (Mumble gets team info from `session.team.teamId` directly, or from `mumbleConfig`)
2. Use `session.team?.teamId` for team resolution instead of `session.guild.id`
3. Guard all `session.guild.*` accesses with null checks
4. For logging/display where guild name is used, fall back to `session.team?.tag` or `'mumble'`

The key insight: Discord recordings identify the team via `guild.id → botRegistrations → teamId`. Mumble recordings already have `team.teamId` directly in the metadata. The pipeline needs both paths.

### Verify
- `npx tsc --noEmit` — no compile errors
- Process an existing Discord recording — should work exactly as before (regression check)
- If you have a Mumble test recording, process it — should not crash

---

## Fix 2 (MEDIUM): voice-uploader missing `recordingSource` field

`voice-uploader.ts` writes the `voiceRecordings/{demoSha256}` Firestore doc but doesn't include a `recordingSource` field. MatchScheduler reads this field (`VoiceReplayService.js:561`) and shows a source badge (Discord purple vs Mumble green). Without it, all Mumble recordings show the wrong "Discord" badge.

### Where to fix

`src/modules/processing/stages/voice-uploader.ts` — in the Firestore document write (around line ~333-357).

### How to fix

Add `recordingSource` to the document:

```typescript
recordingSource: metadata.source === 'mumble' ? 'mumble' : 'discord',
```

**CRITICAL**: Do NOT touch the existing `source` field. That field means "storage backend" (`'firebase_storage'`) and is used by MatchScheduler's VoiceReplayService to know how to load audio files. The `recordingSource` field is separate.

### Verify
- Check that existing Discord recordings still have `source: 'firebase_storage'` (not overwritten)
- New recordings should have both `source: 'firebase_storage'` AND `recordingSource: 'discord'` (or `'mumble'`)

---

## Fix 3 (MEDIUM): auto-record ignores per-team Firestore toggle

MatchScheduler has a working auto-record toggle in the Mumble tab that writes `autoRecord: boolean` to `mumbleConfig/{teamId}`. But quad's `auto-record.ts` only reads the `MUMBLE_AUTO_RECORD` env var — it never checks the per-team setting from Firestore.

### Where to fix

- `src/modules/mumble/auto-record.ts` — where it decides whether to start recording
- `src/modules/mumble/index.ts` — line ~120 where `MUMBLE_AUTO_RECORD` env var is read

### How to fix

When a user joins a team channel and auto-record is considering whether to start:
1. Look up the `mumbleConfig` for that team's channel (the config-listener already caches these)
2. Check `config.autoRecord` — if `false`, don't start recording
3. The env var `MUMBLE_AUTO_RECORD` can serve as a global default/override, but the per-team Firestore setting should take precedence

The config-listener already watches active mumbleConfig docs. auto-record should read from that cached data rather than the env var.

### Verify
- Set `autoRecord: false` on a team's mumbleConfig in Firestore → joining that channel should NOT trigger recording
- Set `autoRecord: true` → joining should trigger recording
- Other teams with `autoRecord: true` should still record normally
