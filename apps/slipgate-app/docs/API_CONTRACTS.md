# API Contracts - Slipgate App

External services, IPC boundaries, and third-party integrations that slipgate-app depends on. Each entry documents: what the boundary is, who talks to it, the shape, and the auth model.

For the full auth flow walkthrough, see `AUTH.md`. For config parsing internals, see `CFG-PARSER.md`. For the Tauri command table, see `OVERVIEW.md` (section "Tauri integration").

## External HTTPS services

### Discord OAuth

**Caller:** Frontend (`src/auth.ts`)
**Purpose:** Initiate Discord login.

- Open URL: `https://discord.com/api/oauth2/authorize`
- Query params: `client_id=1465332663152808031`, `redirect_uri=http://localhost:17420/callback`, `response_type=code`, `scope=identify`
- Auth: none (public OAuth flow)
- Response: Discord redirects to `http://localhost:17420/callback?code=<auth_code>` which the Rust backend catches
- Rate limits: standard Discord OAuth rate limits apply

### Firebase Cloud Function (discordOAuthExchange)

**Caller:** Frontend (`src/auth.ts`)
**Purpose:** Exchange Discord auth code for a Firebase custom token.

- URL: `https://europe-west3-matchscheduler-dev.cloudfunctions.net/discordOAuthExchange`
- Method: POST
- Body: `{ code: string, redirectUri: string }`
- Auth: none (the code itself is the credential)
- Response: `{ success: boolean, customToken: string, user: { uid, displayName, discordUsername, discordId, discordAvatar } }`
- Error: `{ success: false, error: string }`
- Notes: same cloud function used by the matchscheduler web app. Lives in `apps/matchscheduler/functions/`.

### Firebase Auth SDK

**Caller:** Frontend (`src/firebase.ts`)
**Purpose:** Sign in and track auth state.

- `signInWithCustomToken(auth, customToken)` - signs in with the token from the cloud function
- `onAuthStateChanged(auth, callback)` - subscribe to auth state changes
- Project: `matchscheduler-dev`
- Persistence: Firebase SDK persists the session in IndexedDB inside WebView2. Survives app restarts.

### QW Mapshot CDN

**Caller:** Frontend (`src/components/WhoBanner.tsx`)
**Purpose:** Map backdrop images for the profile header.

- URL pattern: `https://a.quake.world/mapshots/webp/lg/{mapName}.webp`
- Method: GET
- Auth: none (public CDN)
- Maps used: dm2, dm3, dm4, dm6, e1m2, ztndm3, aerowalk, skull, povdmm4
- Rate limits: none known

### EloShapes CDN

**Caller:** Frontend (`src/components/MouseLayout.tsx`)
**Purpose:** Mouse product photos for the gear section.

- URL pattern: `https://qyjffrmfirkwcwempawu.supabase.co/storage/v1/object/public/images/products/{handle}/render/large.png`
- Method: GET
- Auth: none (public Supabase storage bucket)
- Data source: 1441 mice + 647 mousepads from `src/data/mice.json` and `mousepads.json`. The `handle` is the EloShapes product handle.
- Rate limits: none known

### GitHub Releases API

**Caller:** Rust backend (`src-tauri/src/commands/updater.rs`)
**Purpose:** Check for updates and download new versions (stable channel).

- Releases URL: `https://api.github.com/repos/{owner}/{repo}/releases`
- Compare URL: `https://api.github.com/repos/{owner}/{repo}/compare/{tag}...HEAD`
- Method: GET
- Auth: none (public repos)
- User-Agent: `slipgate-app/0.1`
- Repos queried:

| Client | Owner | Repo | Installable |
|---|---|---|---|
| ezQuake | QW-Group | ezquake-source | yes (windows-x64 asset) |
| unezQuake | dusty-qw | unezquake | yes (windows-x64 asset) |
| KTX | QW-Group | ktx | no (changelog only) |
| MVDSV | QW-Group | mvdsv | no (changelog only) |
| QWFWD | QW-Group | qwfwd | no (changelog only) |

- Rate limits: GitHub unauthenticated = 60 requests/hour per IP. The "check all" button fires 5 releases queries in parallel. No retry or backoff implemented (see HEALTH.md).

### builds.quakeworld.nu (snapshot channel)

**Caller:** Rust backend (`src-tauri/src/commands/updater.rs`)
**Purpose:** Check for snapshot (nightly) builds of ezQuake.

- URL: `https://builds.quakeworld.nu/ezquake/snapshots/windows/x64/`
- Method: GET (HTML page, parsed to find latest .zip link)
- Auth: none
- Notes: this is HTML scraping, not a proper API. If the page layout changes, the parser breaks.

## Tauri IPC (frontend to Rust)

16 commands + 2 events. The full command table lives in `OVERVIEW.md` under "Tauri integration - frontend -> backend" to avoid duplication. The contracts to know:

### Events (Rust to frontend)

| Event | Payload | Emitter | Listener |
|---|---|---|---|
| `config-changed` | `{ exe_path: string, config_name: string }` | `watcher.rs` (500ms debounce) | `App.tsx` (triggers config re-parse) |
| `update-progress` | `{ stage: string, percent: number, message: string }` | `updater.rs` (during download) | `ClientsTab.tsx` (progress bar) |

## Local process boundaries

### ezQuake (filesystem)

**Caller:** Rust backend (`ezquake.rs`, `scanner.rs`, `archive.rs`, `watcher.rs`)
**Purpose:** Read configs, follow exec chains, detect version, manage installs.

- Reads: `{install_dir}/ezquake/configs/*.cfg`, `{install_dir}/ezquake.exe` (PE version)
- Watches: configs dir + outlier files (files in the exec chain that live outside `configs/`)
- Writes: only during update install (rename-backup existing .exe, write new .exe)
- No network involved. Pure filesystem access.

### ezQuake (mailslot IPC)

**Caller:** Rust backend (`screenshot.rs`)
**Purpose:** Puppet a running ezQuake instance for automated screenshots.

- Mailslot: `\\.\mailslot\ezquake`
- Protocol: write plain-text console commands (e.g. `gl_gamma 1`, `screenshot`, `quit`)
- Auth: none (any local process can write to the mailslot)
- Status: POC, not production. See OVERVIEW.md's "Screenshot POC" entry.

## What this doc does NOT cover

- **Full Discord OAuth walkthrough** - see `AUTH.md`
- **Config parser internals** (how exec chains are followed, how binds are classified) - see `CFG-PARSER.md`
- **Resolution computation** (the 3-layer absent=default model) - see `EZQUAKE-RESOLUTION.md`
- **Tauri command signatures and return types** - see `OVERVIEW.md` command table
