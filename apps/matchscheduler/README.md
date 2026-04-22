# MatchScheduler

A Firebase web app for scheduling QuakeWorld 4on4 clan matches. Teams declare weekly availability on a 3x3 grid (prime / off-prime / weekend slots across seven days), propose matches in overlapping windows, and confirm them. Match pages pull head-to-head data from qw-stats and auto-embed voice recordings from Quad once a demo is uploaded.

Discord is the social layer: match challenges, confirmations, and sealed-match embeds post to team channels; the standin request flow polls availability via DM.

**Status:** Maintenance. Stable and in active use across the competitive 4on4 scene. Will eventually be rebuilt inside vikpe's slipgate web repo - this codebase will not receive a major rewrite here; new features land only when the community needs them urgently.

## What it does

- **Availability grids** - weekly per-team 3x3 layout (Mon-Sun, three slot bands per day). Slot IDs follow `'ddd_hhmm'`. Players join teams (max 2 per player), declare slot commitment per week.
- **Match proposal and confirmation** - the scheduler surfaces overlapping slots between two teams; either captain can propose a match; the other confirms. Sealed matches post embeds to Discord and live as Firestore docs thereafter.
- **H2H and form pages** - per-match page embeds head-to-head, map-specific form, and roster stats from the qw-stats API (`hub.quakeworld.nu`-derived, served from Unraid).
- **Voice replay integration** - once Quad uploads a voice manifest to `voiceRecordings/{demoSha256}`, the match page auto-loads an FTE web demo player with per-player audio tracks synced to the demo timeline.
- **Standin request flow** - teams request substitutes through the app; Quad DMs candidates and writes availability back to `standin_requests/{requestId}`.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Vanilla JavaScript + Alpine.js + Tailwind CSS |
| Backend | Firebase (Firestore + Cloud Functions + Storage + Auth) |
| Auth | Discord OAuth via Cloud Function `discordOAuthExchange` |
| Hosting | Firebase Hosting |
| Dev environment | Firebase Emulators (Firestore UI on :8080, Functions logs on :5001) |
| Layout | A fixed 3x3 grid using rem units only (the "sacred grid") |

The emulator is always running during dev. Do not restart it.

## Who uses it

The QuakeWorld 4on4 community: ~300 active players, ~40 teams. Tournaments like the seasonal 4on4 leagues rely on the scheduler to coordinate weekly matches across European and American timezones.

## Learn more

- `CLAUDE.md` - always-on rules and tooling conventions (Firebase v11 modular imports, rem-only units, sacred grid, etc.)
- `VISION.md` - why this project exists, what problem the 3x3 grid was designed to solve, the slipgate-web graduation story
- `OVERVIEW.md` - current-state map: features that exist, Firestore collections, Discord integration, voice-pairing flow
- `DEPLOYMENT.md` - Firebase deploy flow (dev, staging, prod projects)
- `docs/DEV-SETUP.md` - local emulator setup, fixed UIDs, direct writes, WSL networking
- `context/ARCHITECTURE-MAP.md` - file-by-file architecture map (long-form; start here if you're modifying the codebase)
- `context/SCHEMA.md` - full Firestore document structures
- `context/Pillar*.md` - original architecture specifications (Pillars 1-4: PRD, performance/UX, technical architecture, tech stack)

This app is one of five in the [QuakeWorld monorepo workshop](../../README.md).
