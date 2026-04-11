# Authentication

> **Doc type: current** — Describes the authentication flow as actually built. Also captures a future auth-adjacent feature idea at the bottom.

## What's built today

**Discord OAuth via MatchScheduler's cloud function, resulting in a Firebase Auth user.** Same identity as (eventually) the Slipgate web hub — one Discord user → one Firebase UID across desktop and web.

### The flow

```
┌──────────────┐     1. openUrl()          ┌──────────────┐
│  Slipgate    │ ────────────────────────> │   Browser    │
│  App         │                           │              │
│  (Tauri)     │                           │  Discord     │
│              │     2. User authorizes    │  OAuth page  │
│              │                           │              │
│  localhost   │  <──────────────────────  │  3. Redirect │
│  :17420      │     ?code=abc123          │  to callback │
│  /callback   │                           └──────────────┘
│              │
│  4. Exchange code via cloud function     ┌──────────────┐
│  ─────────────────────────────────────>  │  Firebase    │
│     (MatchScheduler                      │  Cloud Fn    │
│      discordOAuthExchange)               │              │
│  5. Receive Firebase custom token   <─── │  → Discord   │
│                                          │  → Firebase  │
│  6. signInWithCustomToken()              └──────────────┘
│     via Firebase JS SDK
└──────────────┘
```

### Where the code lives

| Step | File | What |
|---|---|---|
| Open Discord URL | `src/auth.ts:22` — `startDiscordAuth()` | Uses `@tauri-apps/plugin-opener` to launch the system browser |
| Await callback | `src-tauri/src/commands/auth.rs:17` — `await_oauth_callback` | Listens on `127.0.0.1:17420` for 300s, parses the `code` query param, returns `{ code, redirect_uri }` |
| Exchange code | `src/auth.ts:37-50` | POST to `https://europe-west3-matchscheduler-dev.cloudfunctions.net/discordOAuthExchange` with `{ code, redirectUri }` |
| Sign in | `src/firebase.ts:20` — `signInWithDiscord(customToken)` | Firebase JS SDK `signInWithCustomToken` |
| Auth state | `src/firebase.ts:31` — `onAuthChange(callback)` | Subscribe to Firebase Auth state changes |
| Trigger | `src/components/SettingsTab.tsx:90` | User-facing "Sign in with Discord" button |

### Constants (hardcoded today)

```typescript
// src/auth.ts:6-8
const DISCORD_CLIENT_ID = "1465332663152808031";
const REDIRECT_URI      = "http://localhost:17420/callback";
const CLOUD_FUNCTION_URL = "https://europe-west3-matchscheduler-dev.cloudfunctions.net/discordOAuthExchange";
```

The Discord client ID is the same one MatchScheduler web uses. The localhost redirect URI must be whitelisted in the Discord developer portal's OAuth2 redirect URIs.

### Why it works

- **System browser, not webview** — the app can't see credentials. User sees the real `discord.com` domain
- **Fixed localhost port** — registered in the Discord dev portal
- **Cloud function exchange** — the Discord token never touches the client; the cloud function validates, fetches the Discord profile, creates/finds the Firebase Auth user, and returns only a Firebase custom token
- **Same Firebase project as MatchScheduler** — `matchscheduler-dev` — so Discord UID → Firebase UID mapping is consistent across all apps that ever auth against this project

### What the cloud function does

Lives in `MatchScheduler/functions/` as `discordOAuthExchange` (region: `europe-west3`):
1. Validates the incoming `code` + `redirectUri`
2. Exchanges the code with Discord for an access token
3. Fetches the Discord user profile (username, ID, avatar)
4. Creates or finds a Firebase Auth user for this Discord ID
5. Handles phantom account claims + email merging (carry-over from MatchScheduler's existing flows)
6. Returns `{ success: true, customToken, user }` to the caller

The slipgate-app treats this as a black box — it just sends the code and gets back a token + Discord metadata.

### Token lifecycle

Firebase custom tokens turn into session tokens via `signInWithCustomToken`. After that, the Firebase JS SDK handles refresh automatically — the desktop app doesn't have to do anything. Auth state persists across app restarts via Firebase's own persistence layer (stored in IndexedDB inside the WebView2).

---

## Known issue: no CSRF `state` parameter

The current flow does NOT include an OAuth `state` parameter. The `state` param is the standard CSRF defense — you generate a random value locally, pass it to Discord in the auth URL, and verify it matches when the callback fires. If it doesn't match, someone else started the flow and you bail.

**Practical risk today:** low. Auth is user-initiated from a local desktop app — there's no hidden iframe or remote origin that could trick the user into completing someone else's flow. But it's a best-practice gap that a code auditor would flag.

**Fix:** generate a random state in `auth.ts` before opening the Discord URL, stash it in memory, pass it as `state=` in the URL, and have `await_oauth_callback` either return the received state so the frontend can verify, or verify it Rust-side. ~15 lines of work.

---

## Future: GitHub OAuth + quake-dir backup

**Idea:** add GitHub as a second auth provider and build a "back up your QW setup to a private GitHub repo" feature on top of it.

### The feature concept

One button: "Back up my quake dir to GitHub." The app:

1. Authenticates to GitHub via OAuth (same pattern as Discord — localhost callback, system browser)
2. Creates (or links) a repo on the user's account, e.g. `quakeworld-setup-{username}`
3. Walks the user's ezQuake install directory
4. Builds a curated include list — **only the minimal viable set of files that define a setup**:
   - ✅ `configs/*.cfg` — all saved configs
   - ✅ `autoexec.cfg`, `config.cfg` at the root
   - ✅ Custom `.pak` / `.pk3` content (anything not in the vanilla distribution)
   - ✅ Custom textures, skins, HUD overlays, crosshair packs
   - ✅ Key settings files the user explicitly opts into
   - ❌ `demos/` — too big, not setup-related
   - ❌ `screenshots/` — ephemeral
   - ❌ `qw/sound/` — either vanilla or huge custom soundpacks
   - ❌ Crash dumps, generated state, `qconsole.log`
   - ❌ Anything over a size threshold
5. Commits and pushes
6. Shows a diff on subsequent syncs ("these files changed since your last backup")

### Why it's worth building

- **Version history of a player's setup** — rollback a bad config edit, compare your binds from 6 months ago
- **Portable identity** — set up a new machine in minutes by cloning your own repo
- **Shareable** — public repos let teammates see your setup directly, or fork it as a starting point
- **Community engagement** — people can browse each other's curated setups, spark discussions about mouse/kb/config choices

### What would need to be built

- A second OAuth provider alongside Discord — GitHub app registration, add callback handling to `auth.rs`
- A "curated file walker" that understands the ezQuake directory structure and applies the include/exclude rules
- Git operations — either shell out to `git` (requires git installed) or use a Rust git library (`git2`, `gix`) to operate directly
- A conflict resolution UI for subsequent syncs
- An opt-in consent flow since uploading any file to a third party needs explicit user action

### Not yet designed

Just an idea parked here so it doesn't get lost. The immediate work is finishing the ConfigViewer FTE converter and making the screenshot POC production-quality. This is a Tier-3 future feature.
