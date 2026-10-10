# MatchScheduler -- Development

How to run, build and test the scheduler. Deploys are in `DEPLOYMENT.md`; the data model is `context/SCHEMA.md`; the file map is `context/ARCHITECTURE-MAP.md`.

## Where this runs

The checkout lives in the dev-cockpit container on the Unraid box, and the operator reaches it over Tailscale (`http://100.114.81.91:<port>`), never `localhost`. Two facts shape local work here:

- **No Firebase emulator runs on the cockpit.** `npm run dev` starts `firebase emulators:start --only auth,firestore,functions,hosting,storage,eventarc` (`package.json`). The Firestore emulator needs a Java runtime, and the container has none (`java: command not found`); nothing listens on the emulator ports and no emulator jar cache exists on this box. The Firebase CLI itself is installed (via mise, beside Node 22).
- **The emulator ports are not published.** Only 5173 and 5174 reach the operator's thin client. The emulator UI (4000), hosting (5000), functions (5001), Firestore (8080) and Auth (9099) need a compose addition by ops before anyone can open them; `firebase.json` already binds every emulator to `0.0.0.0`, so nothing on the app side changes when they are.

Until Java and the ports land (one ops letter each), changes are verified on the live site after a deploy (`DEPLOYMENT.md`). The 2026-09-11 sign-in fixes shipped that way from the cockpit. The rest of this document describes the emulator workflow as it was built, for when those gaps close.

## Quick start (emulator workflow)

```bash
# Terminal 1: Firebase emulators + Tailwind watcher
npm run dev

# Terminal 2: seed test data (once, or after clearing emulator data)
npm run seed:quick
```

Then open `http://100.114.81.91:5000` (once port 5000 is published).

## Build

- **CSS:** `npm run css:build` (minified, always before a hosting deploy) or `npm run css:watch` (what `npm run dev` runs beside the emulators). Source is `src/css/input.css`; `public/css/main.css` is generated and never edited by hand (a PreToolUse hook in `.claude/settings.json` blocks it). The PostToolUse hook meant to rebuild CSS after an `input.css` edit still points at the WSL-era path and prints "rebuilt" without running (HANDOVER small followup), so run `npm run css:build` yourself.
- **Version stamp:** `npm run version` writes `public/js/version.js` via `scripts/generate-version.js`.
- **`npm run build`** = version + `css:build` + a placeholder `build:js`. There is no JS bundling: the frontend ships as plain files under `public/`.

## Test

`npm test` runs Jest inside `functions/`, and there are no test files, so it passes vacuously. Verification is manual, against the emulator or the live site; `docs/TESTING-8.0.md` shows the shape of a walkthrough.

## How the emulator workflow works

### Firebase emulators
The app runs against local emulators instead of production:
- **Firestore**: port 8080 (UI at port 4000, `/firestore`)
- **Auth**: port 9099
- **Functions**: port 5001
- **Hosting**: port 5000
- **Storage**: port 9199; **Eventarc**: port 9299

### Dev mode detection
The app detects dev mode via `window.firebase.isLocalDev` (set in `index.html` when connecting to emulators).

In dev mode:
- **AvailabilityService** writes directly to Firestore (bypasses Cloud Functions)
- **AuthService** auto-signs in to a pre-seeded dev user
- **DevToolbar** appears in the bottom-left corner for user switching

### Fixed UIDs
**Critical**: the seed script and AuthService use matching fixed UIDs so the browser's authenticated user matches the seeded Firestore data.

| User | UID | Email | Password |
|------|-----|-------|----------|
| ParadokS (you) | `dev-user-001` | dev@matchscheduler.test | devmode123 |

All seeded users share password `devmode123`. Player UIDs follow the pattern `qw-{tag}-{name}` (e.g., `qw-sr-zero` for zero on Slackers).

### Seeded data
The seed script creates:
- 24 real QuakeWorld teams across 3 divisions (you're leader of Slackers)
- ~110 players with randomized availability patterns
- 4 weeks of availability data
- Discord IDs on leaders who have them (for contact feature testing)
- Auth emulator accounts for all users (for user switching)
- Team logos (skipped with `seed:quick`)

### Dev user switcher
A red "DEV" button appears in the bottom-left corner in dev mode. Click it to switch between seeded users without refreshing the page.

**Use cases:**
- Test the team-joining flow (switch to Alex, join a team, see the roster update)
- Test multi-user real-time updates (two browser tabs as different users)
- Test role-based UI (leader vs member views)

**How it works:**
1. Click the red "DEV" button
2. Select a different user from the dropdown
3. The app re-authenticates and refreshes data for the new user
4. The selection persists across page refreshes (localStorage)

## Common issues

### "Must be signed in" error
The Auth emulator user doesn't match the seeded data. Fix:
```bash
npm run seed:quick
```
Then refresh the browser.

### UID mismatch warning in console
```
⚠️ DEV MODE: UID mismatch! Expected: dev-user-001 Got: xxx
```
The Auth emulator has a stale user. The seed script fixes this; run it again.

### Changes not showing in the UI
1. Check the browser console for errors
2. Verify you're connected to emulators (look for "Connected to Firestore emulator" in the console)
3. Hard refresh (Ctrl+Shift+R)

### Seeding an emulator on another host
The seed script accepts a host parameter:
```bash
npm run seed:quick -- <host>
```
Inside the cockpit the emulator and the seed script share a container, so the default (localhost) is right.

### Seed commands
```bash
npm run seed           # Full: 24 QW teams + logos + availability
npm run seed:quick     # Quick: same data, skip logo downloads
npm run seed:prod      # Production: full reseed (requires service-account.json)
npm run seed:prod:quick # Production: skip logos
npm run seed:prod:leaders # Production: leaders only
```

## File locations

| Purpose | File |
|---------|------|
| Emulator config | `firebase.json` |
| Seed script | `scripts/seed.js` |
| Dev mode auth | `public/js/services/AuthService.js` (DEV_USERS array) |
| User switcher UI | `public/js/components/DevToolbar.js` |
| Direct Firestore writes | `public/js/services/AvailabilityService.js` (_isDevMode check) |
| Emulator connections | `public/index.html` (bottom of file) |

## Production vs dev mode

| Feature | Production | Dev Mode |
|---------|------------|----------|
| Auth | Google or Discord sign-in | Auto sign-in to a seeded user |
| User switching | N/A | DevToolbar in bottom-left |
| Availability writes | Cloud Functions | Direct Firestore writes |
| Data | Real Firestore | Local emulator |
| Validation | Cloud Functions enforce rules | Relaxed for rapid iteration |

## Resetting data

To start fresh:
1. Stop the emulators (Ctrl+C)
2. Run `npm run dev` again (emulator data is ephemeral)
3. Run `npm run seed:quick`
