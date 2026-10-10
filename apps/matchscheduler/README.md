# MatchScheduler

A Firebase web app for scheduling QuakeWorld 4on4 clan matches. Teams declare weekly availability on a 3x3 grid (prime / off-prime / weekend slots across seven days), propose matches in overlapping windows, and confirm them. The team browser's history and head-to-head tabs pull data from qw-stats, and the voice-replay page plays a demo with the team's voice recordings once Quad has uploaded them.

Discord is the social layer: match challenges, confirmations and sealed-match embeds reach team channels through Quad, which delivers what the scheduler writes to the `notifications` collection.

**Status:** Maintenance. Stable and in active use across the competitive 4on4 scene. Will eventually be rebuilt inside vikpe's slipgate web repo - this codebase will not receive a major rewrite here; new features land only when the community needs them urgently.

## What it does

- **Availability grids** - weekly per-team 3x3 layout (Mon-Sun, three slot bands per day). Slot IDs follow `'ddd_hhmm'`. Players join teams (max 4 per player), declare slot commitment per week.
- **Match proposal and confirmation** - the scheduler surfaces overlapping slots between two teams; either captain can propose a match; the other confirms. Sealed matches post embeds to Discord and live as Firestore docs thereafter.
- **H2H and form** - the team browser's history and head-to-head tabs show head-to-head results, map-specific form, roster and opponent stats from the qw-stats API (QWHub-derived, served from Unraid through a public Cloudflare tunnel).
- **Voice replay** - once Quad uploads a voice manifest to `voiceRecordings/{demoSha256}`, the match's replay link (`replay.html`) loads the Hub demo player (FTE in the browser) with per-player audio tracks synced to the demo timeline.
- **Find standin** - a grid selection filters players across teams by availability for the chosen slots (`StandinFinderService`, local only). The Discord DM loop designed around `standin_requests` has a listener in Quad but no writer on this side (root `HANDOVER.md`).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Vanilla JavaScript + Alpine.js + Tailwind CSS |
| Backend | Firebase (Firestore + Cloud Functions + Storage + Auth) |
| Auth | Google sign-in, or Discord OAuth via Cloud Function `discordOAuthExchange` (shared with slipgate-app) |
| Hosting | Firebase Hosting at `scheduler.quake.world` (custom domain; `matchscheduler-dev.web.app` serves the same site) |
| Dev environment | Firebase Emulators as designed; on the cockpit none runs (no Java, ports unpublished), so changes are verified live after deploy (`DEVELOPMENT.md`) |
| Layout | A fixed 3x3 grid using rem units only (the "sacred grid") |

## Who uses it

The QuakeWorld 4on4 community: ~300 active players, ~40 teams. Tournaments like the seasonal 4on4 leagues rely on the scheduler to coordinate weekly matches across European and American timezones.

## Learn more

- `CLAUDE.md` - always-on rules and tooling conventions (Firebase v11 modular imports, rem-only units, sacred grid, etc.)
- `VISION.md` - why this project exists, what problem the 3x3 grid was designed to solve, the slipgate-web graduation story
- `OVERVIEW.md` - current-state map: features that exist, Firestore collections, Discord integration, voice-pairing flow
- `DEPLOYMENT.md` - Firebase deploy flow (one project, `matchscheduler-dev`)
- `DEVELOPMENT.md` - run, build, test; the emulator workflow and why it does not run on the cockpit
- `context/ARCHITECTURE-MAP.md` - file-by-file architecture map (long-form; start here if you're modifying the codebase)
- `context/SCHEMA.md` - full Firestore document structures
- `context/Pillar*.md` - original architecture specifications (Pillars 1-4: PRD, performance/UX, technical architecture, tech stack)

This app is one of the apps in the [QuakeWorld monorepo workshop](../../README.md).
