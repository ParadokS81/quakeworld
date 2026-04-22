# Vision - Slipgate App

## The problem

QuakeWorld players maintain a mental map between three disconnected worlds:

1. **The game** - ezQuake client, servers, demos, configs
2. **Their computer** - system specs, display settings, peripherals
3. **The web** - community hub, match scheduling, stats, voice recordings

There is limited bridging between them. The hub website has click-to-play (ezQuake supports URL-based connect), and the web can display match stats. But the gap shows up when you want to do anything involving your local machine: share your system specs on your profile? Manually type them. Compare your config with a teammate's? Manually diff text files. See what custom textures you have installed? Dig through nested folders in Windows Explorer. The browser cannot reach into your filesystem or query your hardware.

## What this aims to be

Slipgate App is a lightweight desktop companion that sits in the system tray and closes those gaps. It is the piece that makes the QuakeWorld ecosystem feel integrated rather than fragmented - not a replacement for any of the existing pieces, just the glue between them.

The app's core advantage is direct local access: it can scan your hardware, read your quake directory, parse your configs, and manage your client install without requiring you to upload anything first. A web interface could theoretically do most of the same things with a headless helper or file uploads, but the desktop app makes it frictionless. Where the data gets *displayed and manipulated* (desktop app vs web interface) is a design question the team has different opinions on - vikpe leans toward keeping features in the web, ParadokS and infiniti see value in the app being a front for some of them. Regardless of that debate, the local-access utility is undisputed.

Some of the intended capabilities exist today (hardware scan, config parsing, client updater). Others are on the drawing board lower in this doc. For the current state of what is actually built, see `OVERVIEW.md`.

## Who it's for

All QuakeWorld players, but written from the perspective of a competitive player - the author plays 4on4 seriously and builds what he would want to have first. That keeps the feature direction grounded rather than speculative: every feature is chosen because the author, in a specific real-world situation, wanted it. The assumption is that other competitive players will want most of the same things, and that casual players get value from whatever subset applies to them.

This is a public repo inside the QuakeWorld monorepo workshop. Contributions, issues, and opinions are welcome even while the app is being actively shaped.

## Design intent

- **Invisible until needed.** A system tray app respects that gamers are in-game most of the time; a full-window companion would compete with their attention. Opens mini panels for quick actions when you need them.
- **Zero mandatory configuration.** Useful out of the box; power features unlock progressively. Onboarding friction kills experimentation - if it is not valuable in the first minute, most people will never reach the features that need setup.
- **Shared identity.** Same Discord login as the community web side. One community identity across desktop and web, so your setup data, matches, and profile come together without duplication.
- **Lightweight.** Tauri keeps the binary around 5-10 MB installed with minimal RAM usage. Gamers care about resource headroom; a 100 MB Electron companion would be a non-starter when the user is trying to hit 250+ FPS.
- **Cross-platform intent.** Windows, macOS, Linux. Windows-native in practice today - non-Windows code paths exist as stubs but are not yet supported. Cross-platform is the intent, not the current reality.

## What this is NOT

- **Not a game launcher.** ezQuake handles that. The app can launch ezQuake with arguments, but it does not try to replace the client.
- **Not a replacement for the website.** The (eventual) slipgate web hub is the full community experience; this app is the desktop extension of it.
- **Not a voice chat client.** Mumble and Discord handle that. The app integrates with both (via deep links and via Discord OAuth) but does not compete.
- **Not a server browser.** QW Hub handles that; the app may trigger quick-connect from the hub, but it is not the place you go to discover servers.

The app is glue: small, focused, connecting things that are currently disconnected.

## Where knowledge comes from

A lot of slipgate's value depends on knowing facts about ezQuake: what each cvar does, what valid values it accepts, which commands exist, which keys are recognized, how asset directories are organized. The ConfigViewer alone needs ~3000 cvar definitions to categorize binds, resolve aliases, and explain settings in the UI.

Today, those facts come from `packages/qw-config/src/data/*.json` - legacy JSON files produced by extractors originally written for this app's ConfigViewer. The facts are correct, but the path is pre-oracle.

The future state is **consumption from qw-oracle** via snapshot distribution. Oracle produces a slipgate-shaped JSON snapshot from its Layer 1 data (the same data it serves over MCP to Claude Code); slipgate ships with the snapshot and reads it locally, exactly as it reads qw-config JSON today. No runtime MCP dependency; same deterministic access pattern the app has always had.

The migration happens once oracle's extraction pipeline is feature-complete. At that point `packages/qw-config/` dissolves: its AST extractors relocate into oracle's build, and its legacy scraped JSON is replaced by oracle-produced snapshots. This app's code that reads cvar / command / macro definitions switches from qw-config loaders to oracle-snapshot loaders in the same refactor.

Until then, qw-config is the input path. The ConfigViewer does not block on this; current-reality features ship against the current-reality data source.

## The web-services family

The slipgate app is the desktop side of a larger ecosystem that also includes three community web services. All three consume the same qw-oracle knowledge foundation (directly, via snapshots, or via purpose-built APIs built on top of oracle).

- **hub.quake.world** - already exists. Played matches with browser replay. The upstream of this app's Matches domain.
- **maps.quake.world** - map catalog with custom textures / lits / locs / mapshots, cross-linked to tournament data from hub.
- **assets.quake.world** - catalog of custom content: skins, crosshairs, conchars, HUD overlays. Metadata, comments, provenance.

The app and the web services share a frontend stack, so features flow between them. The MyQuake tab's 2-mode pattern (Browse = flat quake-dir lens; Domains = curated concept dashboards) is the app-side counterpart: Configs domain is built, Maps domain consumes maps.quake.world, Matches consumes hub.quake.world, Assets consumes assets.quake.world.

A **content hash** (sha256 of file bytes) is the universal join key across local-dir, central-catalog, and GitHub-backup contexts. The app authors no metadata beyond the hash; all descriptive metadata lives centrally and is fetched by hash lookup. This enables curated bundle subscriptions (e.g., "Tournament Maps 2026"): the catalog pins a hash list per bundle version; slipgate diffs local hashes against the manifest, pulls missing entries, optionally prunes stale. Clean, Git-like, zero-config for the user.

## On the drawing board

The feature set today is not the app's final shape. Here is what is on the author's mind for where it goes next, and why each idea matters.

### Config converter (ezQuake to FTE)

The ConfigViewer already knows how to parse an ezQuake config. The next step is translating that config into FTE's cvar format, with a per-cvar mapping report showing what transferred, what was mapped to an equivalent, what has no equivalent, and which binds came across cleanly.

*Why it matters:* ezQuake is dominant in 4on4 but some players use FTE for other formats or personal preference. Today, moving a config between clients is a manual chore. A converter removes the friction and makes it trivial to experiment with other clients without losing a painstakingly-built setup.

### Asset browser

A better explorer for your quake dir than Windows Explorer. Browse the custom things you have under `/qw/`: skins, conchars, crosshairs, weapon textures, custom paks. Preview them visually. See what is overriding what.

*Why it matters:* quake dirs accumulate custom content over years and most of it becomes invisible - you forget what you installed, what is being used, and what is overriding the vanilla assets. An asset browser turns the dir into a managed collection instead of a mystery pile, and helps players who want to share or clean up their setup.

### Match browser

Parse your `/qw/matches/` folder for the demos and screenshots normally recorded there. Show per-match stats, let you browse games you played, cross-reference with QW Hub and qw-stats for opponents and outcomes.

*Why it matters:* every QW player has a pile of demos they never revisit because there is no way to quickly see what is in them. A viewer turns that pile into a history players can actually use - review your own games, find that match where you pulled off something memorable, compare performance over time.

### GitHub-backed QW backup

Log in with GitHub (as a second auth provider alongside Discord), auto-create a `quakeworld-setup-{username}` repo, and upload the minimal viable set of files that define a setup (configs, key bindings, custom textures, HUD overlays, crosshair packs). Exclude the heavy and ephemeral stuff (custom maps, recorded demos, generated state, crash dumps). Show diffs on subsequent syncs.

This backup vertical is separate from the web-services family above but shares the content-hash substrate: the same sha256 that joins local files to the central catalogs also stabilizes the backup. Heavy assets (maps, custom content) don't need to be stored in the backup repo because they are addressable by hash via the catalogs.

*Why it matters:* three distinct use cases stack into the same feature, and any one of them would justify building it:

- **Disaster recovery.** Rolling back a bad config edit, comparing your binds from 6 months ago, restoring a setup you accidentally broke.
- **Portability.** Setting up a new machine (or a LAN rig) in minutes by cloning your own repo instead of hand-copying files.
- **Shareable.** Public repos let teammates see each other's setups directly or fork them as a starting point. Community value: browsing how top players configure their game, sparking discussions about mouse / keyboard / config choices.

The interesting engineering piece is the "minimal viable set" - deciding what actually defines a setup versus what is ephemeral clutter.

## Intended relationships with other projects

Not all of these relationships are built yet. Marked *(built)* where the integration exists today and *(planned)* where it is intent.

| Project | Slipgate App's role |
|---|---|
| **Slipgate web** | Desktop extension of the web hub. Same auth, same data, different capabilities. *(Planned - slipgate web does not exist yet.)* |
| **matchscheduler** | Shared Firebase project for auth today. Eventually: receive match notifications, quick availability toggle. *(Partial: auth built, notifications planned.)* |
| **quad** | No direct integration planned today; both projects live in the same monorepo for cross-app context but slipgate-app does not talk to the Discord bot. |
| **qw-oracle** | Future knowledge source. Today: reads `packages/qw-config/src/data/*.json` directly for ConfigViewer. Future: consumes oracle-produced snapshots (same access pattern, oracle-managed content) once oracle's extraction pipeline is feature-complete and qw-config dissolves. *(Transitional - legacy path today, oracle-snapshot path future.)* |
| **ezQuake** | Reads configs, detects version, manages install, launches with args, screenshot puppet via mailslot IPC. *(Built.)* |
| **Mumble** | Eventually quick-join team channel via `mumble://` deep link. *(Planned.)* |
| **GitHub** | Eventually second auth provider for the backup feature above. *(Planned.)* |

---

## Status note (2026-04-11)

**Slipgate web does not exist yet.** It is in the planning phase, gated on infiniti's OKLCH Harmonizer ramp landing. That is why the desktop app is getting all the attention first - the desktop app is the concrete thing people can use while the web side is still being designed.

Some features being built in the app today may eventually migrate to the web; others will stay desktop-only (anything touching local filesystem, hardware, or ezQuake process). When the web side starts, each feature will be placed where it naturally belongs. Until then, treat any mention of "Slipgate web" in this doc as aspirational.

For the current reality of what is built in the app, see `OVERVIEW.md`.
