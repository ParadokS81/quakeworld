# Recording Module

Per-speaker voice recording from Discord voice channels: capture per-user Opus audio, write it as OGG/Opus files to disk, write `session_metadata.json` at the end. No transcription or analysis here (that is `../processing/`); the only outside call is a fire-and-forget `recordingSessions` write to Firestore so the MatchScheduler admin panel can see live sessions. The Mumble recorder is a separate module (`../mumble/`) that shares the `src/shared/session-registry.ts` seam with this one.

## Files
- `index.ts` -- BotModule export (commands, events, lifecycle hooks)
- `commands/record.ts` -- `/record start|stop|status|reset`; `start` routes to the Mumble recorder when asked
- `auto-record.ts` -- starts a session when enough registered members join a channel, stops after a grace period (per-team `autoRecord` setting on `botRegistrations`)
- `session.ts` -- `RecordingSession`: one session's tracks, timing, output dir
- `track.ts` -- `UserTrack`: per-user OGG stream pipeline (Opus -> OGG -> file)
- `silence.ts` -- silent Opus frame generation + caching
- `metadata.ts` -- writes `session_metadata.json`
- `firestore-tracker.ts` -- fire-and-forget `recordingSessions` writes; a Firestore outage never fails a recording

## Rules in this scope
- Never transcode, never buffer in memory, never fragment: one continuous OGG per speaker (the app `CLAUDE.md` non-negotiables).
- Never modify `core/` from here; never import from other modules (the shared registry is not a module).
- prism-media is `2.0.0-alpha.0` and must stay so: the OGG muxer exists only in v2. The recording flow, the muxer snippet and the fallbacks are in `.claude/rules/recording-module.md`, which loads automatically for files under this folder.

## Documentation index
None beyond this file; the module's technical reference is `.claude/rules/recording-module.md` at the app root.

## Subsystem scopes
None.
