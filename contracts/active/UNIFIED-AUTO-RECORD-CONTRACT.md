# Unified Auto-Record — Cross-Project Contract

> Source of truth for unified auto-record across Discord and Mumble.
> Updated as each phase lands. Both projects reference this for schema decisions.
> Reference copies should be placed in each project's `docs/auto-record/CONTRACT.md`.

---

## Overview

Unifying auto-record behavior across Discord and Mumble voice platforms, with shared per-team settings managed from MatchScheduler's web UI and Discord's `/record` command.

**Current state:**
- **Discord recording**: Manual only (`/record start`/`/record stop`). No auto-record.
- **Mumble recording**: Auto-record exists (`auto-record.ts`) but untested. Starts on ANY user join, 30-min idle timeout, simple boolean toggle on `mumbleConfig`.
- **MatchScheduler UI**: Has auto-record settings on `botRegistrations` (`enabled`, `minPlayers` 3|4, `mode`) + separate Mumble toggle on `mumbleConfig`.

**Target state:**
- Both platforms auto-record when enough registered team members are present
- Single settings source on `botRegistrations/{teamId}.autoRecord`
- Platform preference: both, discord-only, or mumble-only
- 5-second grace period after last member leaves (session over = pipeline runs)
- Manual stop suppresses auto-record until channel empties
- `/record` auto-detects which platform to record, with explicit override

**Why this matters:**
- Teams transitioning from Discord to Mumble need seamless recording on both
- Manual `/record start` friction reduces adoption — auto-record removes it
- Split settings (botRegistrations vs mumbleConfig) creates confusion

---

## Schema Change: `botRegistrations/{teamId}.autoRecord`

The existing `autoRecord` sub-document is extended with a `platform` field. The `mumbleConfig/{teamId}.autoRecord` boolean is **deprecated** — quad reads from `botRegistrations` for both platforms.

```typescript
interface AutoRecordSettings {
  enabled: boolean;                              // Master toggle (default: false)
  minPlayers: number;                            // Threshold to start recording (default: 3, range: 2-6)
  platform: 'both' | 'discord' | 'mumble';      // Which platforms to auto-record (default: 'both')
  mode: 'all' | 'official' | 'practice';        // Match type filter (existing, unchanged)
}
```

### Who writes what

| Field | Written by | When |
|-------|-----------|------|
| `autoRecord.enabled` | MatchScheduler CF | User toggles in Recordings tab |
| `autoRecord.minPlayers` | MatchScheduler CF | User changes in Recordings tab |
| `autoRecord.platform` | MatchScheduler CF | User selects in Recordings tab |
| `autoRecord.mode` | MatchScheduler CF | User selects in Recordings tab |

**Reader:** quad reads all `autoRecord` fields via Firestore listener on `botRegistrations`.

### Backward compatibility

- If `platform` field is missing → treat as `'both'` (existing teams upgrade seamlessly)
- If `minPlayers` is 3 or 4 (old radio values) → still valid, just now part of a wider range
- During transition, if `botRegistrations` has no `autoRecord` for a team but `mumbleConfig.autoRecord` is true, quad falls back to old behavior

### Deprecation: `mumbleConfig/{teamId}.autoRecord`

This field is no longer the source of truth. quad will stop reading it for auto-record decisions (it will still read `mumbleConfig` for channel→team mapping). MatchScheduler's Mumble tab will show a read-only indicator pointing to Recording settings.

---

## Session Registry (New Shared State in quad)

A lightweight in-memory registry tracking all active recording sessions across platforms. Enables cross-platform `/record stop` and suppression logic.

```typescript
// quad/src/shared/session-registry.ts

type Platform = 'discord' | 'mumble';
type SessionOrigin = 'manual' | 'auto';

interface RegisteredSession {
  platform: Platform;
  origin: SessionOrigin;
  sessionId: string;
  channelId: string;          // Discord channel ID or Mumble channel ID (as string)
  guildId: string;            // Discord guild ID (for lookup)
  teamId?: string;            // From botRegistration
  startTime: Date;
  suppressed?: boolean;       // Set when manual stop on auto session
}
```

**Suppression logic:**
1. User runs `/record stop` on an auto-started session → `suppressed = true`
2. Auto-record checks `isSuppressed` before starting → skips if true
3. When channel fully empties (0 registered members) → `clearSuppression`
4. Manual `/record start` ignores suppression (explicit intent)

---

## Discord Auto-Record Behavior (NEW)

Monitors `voiceStateUpdate` events for guilds with active bot registrations.

### Start conditions (ALL must be true):
1. `autoRecord.enabled === true`
2. `autoRecord.platform` is `'both'` or `'discord'`
3. No active recording session for this guild (in session registry)
4. Channel not suppressed (no recent manual stop)
5. Count of registered members in voice channel >= `autoRecord.minPlayers`
6. NOT a multi-team guild (safety — auto-record disabled for community servers)

### Registered member counting:
- Use `knownPlayers` from `botRegistrations` (maps Discord user ID → QW name)
- For each voice channel in the guild, count members whose Discord ID is a key in `knownPlayers`
- Pick the voice channel with the highest count (if multiple channels have users)

### Stop conditions:
- Registered member count in the recording channel drops to 0 → start 5-second grace timer
- Grace timer expires → stop recording, trigger pipeline
- If a registered member rejoins during grace → cancel timer, continue recording

### No text channel notifications:
Auto-record start/stop is silent. The Firestore session tracker provides visibility. This prevents spam in team text channels.

---

## Mumble Auto-Record Migration

Existing `auto-record.ts` is updated to:
1. Read settings from `botRegistrations` instead of `mumbleConfig.autoRecord`
2. Add `minPlayers` threshold (currently starts on ANY user join)
3. Change 30-min idle timeout to 5-second grace after last user leaves
4. Register sessions in shared session registry
5. Respect `platform` field (`'both'` or `'mumble'` → enabled)
6. Support manual stop suppression

---

## Unified `/record` Command

### Subcommands
| Subcommand | Behavior |
|-----------|----------|
| `/record start` | Auto-detect platform (see below), start recording |
| `/record start platform:discord` | Record in Discord voice channel |
| `/record start platform:mumble` | Record in team's Mumble channel |
| `/record stop` | Stop ALL active recordings for the team (both platforms) |
| `/record status` | Show active recordings: platform, channel, duration, participants, origin |
| `/record reset` | Force-reset (existing behavior) |

### Auto-detect logic (no platform specified):
1. Is invoking user in a Discord voice channel? → signal for Discord
2. Does the team's Mumble channel have users? → signal for Mumble
3. Both signals → prefer Discord (user physically chose to be there)
4. One signal → use that platform
5. Neither → error: "No active voice channel found"

### Permission model:
- Discord recording: invoking user must be in voice channel (existing) OR platform explicitly set to mumble
- Mumble recording from Discord: user must be a registered team member (in `knownPlayers` or team roster)
- Any team member can `/record stop` (not just the starter)

### Manual stop suppression:
- `/record stop` on an auto-started session sets suppression flag
- Suppression clears when channel empties
- `/record start` (manual) ignores suppression

---

## MatchScheduler UI Changes

### Recordings tab (auto-record settings):
- `minPlayers`: Number dropdown (2-6) replacing 3|4 radio buttons
- `platform`: Dropdown — "Both platforms" / "Discord only" / "Mumble only"
  - Only shown if team has both Discord bot AND Mumble configured
  - If only one platform configured → don't show dropdown (implied)
- `enabled` and `mode`: Unchanged

### Mumble tab:
- Replace auto-record toggle with read-only indicator
- Text: "Auto-record is managed in Recording settings"
- Shows current auto-record state (enabled/disabled, platform)

### Cloud Function validation:
- `minPlayers`: accept 2-6 (was: only 3 or 4)
- `platform`: validate as `'both'` | `'discord'` | `'mumble'`
- Default `platform` to `'both'` if not provided

---

## Phase Plan

### Dependency graph

```
U1 (Session Registry + Bug Fixes) ──┬── U2 (Discord Auto-Record) ──┐
                                     │                               ├── U4 (Unified /record)
                                     ├── U3 (Mumble Migration) ─────┘
                                     │
                                     └── U5 (MatchScheduler UI) [independent]
```

### Phases & Model Recommendations

| Phase | Project | Description | Model | Effort | Thinking | Rationale |
|-------|---------|-------------|-------|--------|----------|-----------|
| **U1** | quad | Session registry + pipeline bug fix | Sonnet | High | On | New module + multi-file bug fix. Clear requirements, moderate data-flow tracing. Sonnet+thinking handles this well. |
| **U2** | quad | Discord auto-record engine (NEW) | Opus | Max | — | Most complex phase. Extracting reusable logic from interaction-coupled code, designing event-driven auto-record, handling edge cases (channel moves, bot kicks, race conditions). Opus justified. |
| **U3** | quad | Mumble auto-record migration | Sonnet | High | On | Migrating data source + adding threshold/grace logic to existing code. Clear before/after, but multi-concern changes benefit from thinking. |
| **U4** | quad | Unified /record command | Sonnet | High | On | Command restructure + cross-module imports + auto-detect logic. Each piece is clear but the combination needs careful reasoning about state. |
| **U5** | MatchScheduler | Auto-record UI updates | Sonnet | High | Off | Mechanical UI changes: swap radio→dropdown, add field, update CF validation. Well-defined patterns exist. Thinking adds no value. Could even use Haiku but Sonnet is safer for the MatchScheduler's large modal file. |

**Why not Haiku for U5?** TeamManagementModal.js is ~2500 lines with interleaved render/handler/state logic. Haiku might lose track of the render flow. Sonnet at normal effort handles it fine.

**Why Opus for U2 specifically?** This is the only phase where the implementer needs to make non-obvious architectural decisions: how to split `handleStart` without breaking the DAVE handshake retry logic, where to draw the line between auto-record engine and existing voiceStateUpdate handler, how to handle the race between manual `/record start` and auto-record triggering simultaneously. These are judgment calls, not execution tasks.

### Execution plan

| Session | Phase | Opens in | Model Config | Can Parallel |
|---------|-------|----------|-------------|--------------|
| 1 | U1 | `quad/` terminal | Sonnet, effort high, thinking on | — |
| 2a | U2 | `quad/` terminal | Opus, effort max | U3, U5 |
| 2b | U3 | `quad/` terminal | Sonnet, effort high, thinking on | U2, U5 |
| 2c | U5 | `MatchScheduler/` terminal | Sonnet, effort high, thinking off | U2, U3 |
| 3 | U4 | `quad/` terminal | Sonnet, effort high, thinking on | — |

### File conflict check (parallel phases)
- **U2 vs U3:** Safe. U2 touches `recording/*`, U3 touches `mumble/*`.
- **U2 vs U5:** Safe. Different projects.
- **U3 vs U5:** Safe. Different projects.
- **U4 after U2+U3:** Required. U4 modifies files touched by both.

---

## Key File Locations

### quad

| Concern | File |
|---------|------|
| Session registry (NEW) | `src/shared/session-registry.ts` |
| Discord auto-record (NEW) | `src/modules/recording/auto-record.ts` |
| Discord recording session | `src/modules/recording/session.ts` |
| /record command | `src/modules/recording/commands/record.ts` |
| Recording module init | `src/modules/recording/index.ts` |
| Mumble auto-record | `src/modules/mumble/auto-record.ts` |
| Mumble module init | `src/modules/mumble/index.ts` |
| Processing pipeline | `src/modules/processing/pipeline.ts` |
| Voice uploader | `src/modules/processing/stages/voice-uploader.ts` |
| Registration (knownPlayers) | `src/modules/registration/register.ts` |

### MatchScheduler

| Concern | File |
|---------|------|
| Bot registration CF | `functions/bot-registration.js` |
| Team settings modal | `public/js/components/TeamManagementModal.js` |
| Bot registration service | `public/js/services/BotRegistrationService.js` |
| Mumble config service | `public/js/services/MumbleConfigService.js` |
| Firestore rules | `firestore.rules` |
| Schema docs | `context/SCHEMA.md` |

---

## Verification Checklist

### Per-phase
- [ ] U1: `npm run build` passes. Bug fixes verified via code review.
- [ ] U2: Auto-record triggers when minPlayers join Discord voice. Stops after 5s grace. Suppression works.
- [ ] U3: Mumble auto-record reads from botRegistrations. minPlayers threshold enforced. 5s grace.
- [ ] U4: `/record start` auto-detects. `/record stop` stops both. `/record status` shows both.
- [ ] U5: Platform dropdown appears when both configured. minPlayers 2-6 works. Mumble tab shows redirect.

### End-to-end
- [ ] Enable auto-record (MatchScheduler UI), minPlayers=3, platform=both
- [ ] 3 members join Discord voice → bot auto-joins and records
- [ ] All leave → stop after 5s, pipeline runs
- [ ] 3 members join Mumble → bot auto-records
- [ ] `/record stop` → both stop, suppression active
- [ ] Channel empties → suppression clears
- [ ] Members rejoin → auto-record resumes
