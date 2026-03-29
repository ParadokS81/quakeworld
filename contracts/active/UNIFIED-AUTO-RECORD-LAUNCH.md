# Unified Auto-Record — Launch Pad

> Copy-paste prompts for each phase. Open the specified project folder, set the model/effort/thinking, paste the prompt.
>
> **Contract:** `UNIFIED-AUTO-RECORD-CONTRACT.md`
> **Schema:** `CROSS-PROJECT-SCHEMA.md`, `MatchScheduler/context/SCHEMA.md`

---

## Execution Order

### Step 1 — U1 alone
Open `quad/` → Sonnet, High effort, Thinking on

### Step 2 — U2 + U3 + U5 in parallel (3 sessions)
Open `quad/` → **Opus, Max effort** (for U2 — Discord auto-record)
Open `quad/` → Sonnet, High effort, Thinking on (for U3 — Mumble migration)
Open `MatchScheduler/` → Sonnet, High effort, Thinking off (for U5 — UI updates)

### Step 3 — U4 alone (after U2 + U3 both finish)
Open `quad/` → Sonnet, High effort, Thinking on

---

## Phase Reference

| # | Phase | Project | Model | Effort | Thinking | Why |
|---|-------|---------|-------|--------|----------|-----|
| U1 | Session Registry + Bug Fix | quad/ | Sonnet | High | On | New shared module + multi-file bug fix. Clear requirements, moderate tracing. |
| U2 | Discord Auto-Record Engine | quad/ | **Opus** | **Max** | — | Extracting reusable session logic from interaction-coupled code, event-driven design, race conditions. Judgment calls. |
| U3 | Mumble Auto-Record Migration | quad/ | Sonnet | High | On | Data source migration + threshold/grace logic. Clear before/after but multi-concern. |
| U4 | Unified /record Command | quad/ | Sonnet | High | On | Command restructure + cross-module state. Each piece clear, combination needs care. |
| U5 | MatchScheduler UI Updates | MatchScheduler/ | Sonnet | High | Off | Mechanical UI changes. Well-defined patterns. Large file but no ambiguity. |

---

## U1 — Session Registry + Bug Fix

**Open:** `quad/` | **Sonnet** | High | Thinking on

### Prompt

```
Read docs/auto-record/phase-U1-session-registry.md — it contains the full implementation spec.

Summary: Create a shared session registry (src/shared/session-registry.ts) for tracking active recording sessions across Discord and Mumble platforms. Fix the remaining pipeline bug where Mumble recordings crash on null guild access (pipeline.ts lines 206/224 use session.guild! non-null assertions).

Also wire the registry into the existing recording command (register on start, unregister on stop).

Reference the contract at the workspace parent: ../UNIFIED-AUTO-RECORD-CONTRACT.md

After implementation, run /build to verify compilation.
```

---

## U2 — Discord Auto-Record Engine

**Open:** `quad/` | **Opus** | Max | —

### Prompt

```
Read docs/auto-record/phase-U2-discord-auto-record.md — it contains the full implementation spec.

Summary: This is the biggest piece. Three tasks:

1. Extract reusable session-start logic from handleStart() in recording/commands/record.ts into an exported startRecordingSession() function. handleStart becomes a thin wrapper that validates the interaction then calls it.

2. Create src/modules/recording/auto-record.ts — a Discord auto-record engine that monitors voiceStateUpdate events, counts registered team members (knownPlayers) in voice channels, and auto-starts recording when count >= minPlayers. 5-second grace period after last member leaves. Reads settings from botRegistrations Firestore listener.

3. Wire the auto-record engine into recording/index.ts — initialize on ready, feed voiceStateUpdate events, shutdown cleanup.

Key design constraints:
- The existing activeSessions Map stays as-is. Session registry (from U1) is an additional metadata layer.
- Multi-team guilds: skip auto-record entirely (safety).
- Auto-record start/stop is silent (no text channel messages).
- Suppression: if someone /record stops an auto session, suppress until channel empties.

Reference the contract at the workspace parent: ../UNIFIED-AUTO-RECORD-CONTRACT.md

After implementation, run /build to verify compilation.
```

---

## U3 — Mumble Auto-Record Migration

**Open:** `quad/` | **Sonnet** | High | Thinking on

### Prompt

```
Read docs/auto-record/phase-U3-mumble-migration.md — it contains the full implementation spec.

Summary: Migrate Mumble auto-record to use unified settings from botRegistrations instead of mumbleConfig. Five tasks:

1. Add Firestore listener on botRegistrations for autoRecord settings (keep existing mumbleConfig listener for channel→team mapping)
2. Add minPlayers threshold — don't start recording until enough users in channel (currently starts on ANY user join)
3. Change 30-minute idle timeout to 5-second grace period after last user leaves
4. Integrate with shared session registry (from U1) — register/unregister sessions, check/clear suppression
5. Export functions from mumble/index.ts for cross-module access: startMumbleRecording, stopMumbleRecording, getMumbleChannelUsers

Backward compat: if botRegistrations has no autoRecord config but mumbleConfig.autoRecord is true, fall back to old behavior.

Reference the contract at the workspace parent: ../UNIFIED-AUTO-RECORD-CONTRACT.md

After implementation, run /build to verify compilation.
```

---

## U4 — Unified /record Command

**Open:** `quad/` | **Sonnet** | High | Thinking on

### Prompt

```
Read docs/auto-record/phase-U4-unified-record-command.md — it contains the full implementation spec.

Summary: Make /record platform-aware with auto-detection and cross-platform stop/status. Changes to recording/commands/record.ts:

1. Add optional `platform` choice (discord/mumble) to /record start subcommand
2. Add /record status subcommand
3. Auto-detect logic when no platform specified: check if user is in Discord voice + check if Mumble channel has users. Prefer Discord if user is physically there. Error if neither.
4. /record stop now stops ALL active sessions for the team (both Discord and Mumble). Sets suppression flag on auto-started sessions.
5. /record status shows active recordings per platform with duration, participants, origin.

Cross-module: import startMumbleRecording/stopMumbleRecording/getMumbleChannelUsers from mumble module (exported in U3).

Permission model: Discord recording requires user in voice channel. Mumble recording from Discord requires user to be a registered team member (in knownPlayers).

Reference the contract at the workspace parent: ../UNIFIED-AUTO-RECORD-CONTRACT.md

After implementation, run /build to verify compilation.
```

---

## U5 — MatchScheduler UI Updates

**Open:** `MatchScheduler/`
**Open:** `MatchScheduler/` | **Sonnet** | High | Thinking off

### Prompt

```
Read docs/auto-record/phase-U5-matchscheduler-ui.md — it contains the full implementation spec.

Summary: Update the auto-record settings UI for unified platform support. Three areas:

1. Cloud Function (functions/bot-registration.js): Update _handleUpdateSettings validation — accept minPlayers 2-6 (was 3|4 only), add platform field validation ('both'|'discord'|'mumble'), default platform to 'both' if not provided.

2. Recordings tab UI (TeamManagementModal.js): Replace minPlayers 3/4 radio buttons with a dropdown (2-6). Add platform dropdown ("Both platforms" / "Discord only" / "Mumble only") — only shown when team has both Discord bot AND Mumble configured.

3. Mumble tab: Replace the auto-record toggle with a read-only indicator showing current state + "Managed in Recording settings" text.

Follow existing patterns: optimistic UI update → call BotRegistrationService.updateSettings → revert on error → show toast.

The contract is at the workspace parent: ../UNIFIED-AUTO-RECORD-CONTRACT.md

After implementation, verify with the dev server.
```

---

## Post-Implementation

After all phases complete:
1. Copy contract to both projects: `quad/docs/auto-record/CONTRACT.md`, `MatchScheduler/docs/auto-record/CONTRACT.md`
2. Verify end-to-end (see contract Verification Checklist)
3. Deploy quad first (Xerial), then MatchScheduler (Firebase hosting + functions)
