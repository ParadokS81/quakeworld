# Cross-project contracts

This directory holds cross-project design specs and data contracts. Active work lives in `active/`; shipped work is archived in `completed/`. The monorepo-wide data contract (shared Firestore collections and Storage paths) lives in `CROSS-PROJECT-SCHEMA.md`.

## Active

- **`active/UNIFIED-AUTO-RECORD-CONTRACT.md`** - unifying auto-record behavior across Discord and Mumble with shared per-team settings managed from matchscheduler and from Discord's `/record` command
- **`active/UNIFIED-AUTO-RECORD-LAUNCH.md`** - execution launch pad with copy-paste prompts for each phase of the unified auto-record rollout

## Completed

- **`completed/VOICE-REPLAY-CONTRACT.md`** - evolves voice replay from single-clan PoC to multi-clan production with Firestore-rules-based privacy and per-team visibility control
- **`completed/COMMUNITY-SERVER-CONTRACT.md`** - extends bot registration from "one guild = one team" to "one guild = many teams" so community Discord servers like RetroRockets can host multiple squads
- **`completed/DISCORD-ROSTER-CONTRACT.md`** - Discord-driven roster management where team leaders add server members as phantom roster entries that auto-upgrade when the person logs in via Discord OAuth
- **`completed/MUMBLE-INTEGRATION-CONTRACT.md`** - Mumble voice server as a second voice platform alongside Discord, with per-team private channels and certificate-based identity
- **`completed/RECORDING-MANAGEMENT-CONTRACT.md`** - recording management UI with series-grouped cards, cross-system deletion (Firebase + quad server), downloads, and per-map privacy
- **`completed/AVAILABILITY-ENHANCEMENT-CONTRACT.md`** - simplifies availability templates to one per user, adds recurring auto-apply, Discord prev/next navigation, and repeat-last-week
- **`completed/SCHEDULE-CHANNEL-PRD.md`** - dedicated `#schedule` Discord channel per registered team, bridging matchscheduler availability and match visibility directly into Discord

## Data contracts and investigations

- **`CROSS-PROJECT-SCHEMA.md`** - authoritative Firestore collections and Firebase Storage paths shared across apps. The OVERVIEW.md "Shared Firestore collections" and "Shared Firebase Storage" tables are derived from this. Update here first when a shape changes.
- **`AUDIO-SYNC-INVESTIGATION.md`** - standalone investigation doc for an audio sync issue affecting voice replay. Not a contract per se; kept here because the investigation crosses quad and matchscheduler.

## Adding a new contract

- Draft the new contract at `contracts/active/<FEATURE-NAME>-CONTRACT.md`. Use existing contracts as structural templates.
- When the feature ships and stabilizes, move the file to `contracts/completed/`.
- Update this README's Active and Completed sections in the same commit so the index stays accurate.
