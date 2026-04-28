# Slipgate Managed Mode — Vision and Principles

> **Captured 2026-04-28** from a design conversation immediately following the Phase 3.5b ship. This document reframes slipgate's product positioning. It is load-bearing for the Managed Mode arc roadmap (`docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`) and the architecture spec (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`).
>
> **Status:** Vision approved by operator. Implementation arcs queued. Phase 3.5b's binary management remains valid as Light-mode functionality; Managed mode is the new product surface being built on top of the same warehouse substrate.

> **Update 2026-04-28 (pre-Pass-1 anchor):** Three product properties added during orchestrator briefing before the Arc A+B brainstorm:
>
> - **Sixth content category — user-private files.** Slipgate respects user-private content in the materialized tree (private notes, personal folders, half-finished experiments) without warehousing or exporting it. Not all files in the tree are profile content; users can keep personal assets the system leaves alone. (Detailed in architecture spec.)
> - **Mod / singleplayer / expansion launcher anchored.** Profile manifests declare which gamedirs they expect (`declared_gamedirs`); launcher gains a per-launch gamedir picker. Future-extensible to mod/expansion management without architectural rework. (Detailed in architecture spec.)
> - **Offline-first classifier.** The watcher's asset classifier ships fully functional offline using local heuristics; cloud catalog augments with SHA-keyed lookups when online. User-confirmed unknown-SHA classifications flow back to the catalog as moderated submission candidates. Cloud is opt-in; offline mode never degrades to non-functional. (Detailed in architecture spec.)
>
> The body of this document remains accurate; these items extend the design surface and will be integrated after the Arc A+B brainstorm passes complete.

---

## TL;DR

**Slipgate IS your Quake install. Not a companion app to your install. THE install.**

The data warehouse IS the quakedir. The user's "Quake directory" — historically a messy folder somewhere on disk that accumulates configs, custom textures, demos, half-downloaded mod content, screenshots, server-cached maps, and orphaned junk over years of play — is replaced by a slipgate-managed structure where every asset is content-addressed, every profile is a manifest pointing at shared blobs, and the directory the engine launches against is a materialized view computed from a profile manifest.

This collapse resolves a stack of architectural questions that the prior "companion app to your existing dir" framing left ambiguous: where to write, how to handle multiple versions, how to share setups between users, how to back up cleanly, how to roll back changes, how to dedupe content across users and profiles. All become natural consequences of the content-addressed-storage + manifest-as-profile + materialization-as-view architecture.

---

## The architectural collapse

The previous framing positioned slipgate as a "desktop companion to your QuakeWorld install" — the user has a `D:\Games\QuakeWorld\` directory that is THEIR Quake install, and slipgate sits next to it providing analysis, version management, and updater services. The companion model treated the user's dir as sacred external state that slipgate writes to only on explicit user action, and never owns.

The collapse: **dissolve the distinction between "the user's quake dir" and "slipgate's data root."** They are the same thing. Slipgate's data root is the user's Quake install. The active profile's materialized tree IS the directory the engine launches against. Every asset the user has ever added to their setup lives in slipgate's content-addressed warehouse. Every profile they care about is a manifest in that warehouse.

This is structurally identical to how Git, NixOS, OSTree, IPFS, and similar content-addressable systems treat their domain. It is a known-good shape applied to a domain (Quake's filesystem-overlay engine model) that happens to fit the shape exceptionally well. The Quake-specific application is novel; the underlying pattern is mature.

### What it makes possible (and what the companion model couldn't)

- **Multiple full setups coexisting at near-zero disk cost.** Profiles share the heavy stock content (id1/pak0.pak, id1/pak1.pak) as hardlinks to a single warehoused blob. A user can have their default profile, a tournament-clean profile, an experimental-visuals profile, and three downloaded community profiles all materialized simultaneously, with disk cost = (sum of unique-to-each-profile bytes), not (number of profiles × full setup size).
- **Try someone else's setup without committing to it.** Download Milton's profile manifest, fetch only the blobs you don't already share with him, materialize it as a sibling profile, switch between yours and his with a click. Selective import (just his visuals, not his configs) is a manifest-overlay operation, not a file-swap dance.
- **Edit history that looks like an IDE's local-history feature.** Every config save creates a new immutable warehouse blob; the manifest update points at the new SHA. Old blobs remain referenced by historical manifest versions. Walking backwards through manifest history gives "everything I've changed in this profile, ever" with restore-from-any-point.
- **Lossless export at any time.** Materialize any profile to a path of the user's choosing using the copy fallback, hand them a normal directory they can zip, take anywhere, run without slipgate. The architecture refuses to lock anyone in by construction.
- **Backup is trivial and useful.** A profile manifest is KB-scale and represents the user's entire setup. Sync that manifest plus warehouse blobs to cloud storage; restore on any machine by reinstalling slipgate, importing the manifest, fetching missing blobs. Demos and screenshots stay in `user-content/`, profile-orthogonal, backed up separately if desired.
- **The "share my setup" use case becomes a first-class feature.** Today, sharing a Quake setup requires the sharer to manually find their custom textures, configs, sound replacements, scoreboard banners, skins; zip them up; explain to the recipient where each file goes; assume the recipient has compatible engine versions. With profile manifests, "share my setup" is "send a JSON file." The recipient's slipgate fetches what they don't have, materializes the rest, done.

### What it eliminates as concerns

- **"Where is my quake dir."** The slipgate data root is the only filesystem location the user needs to know about. Engines launch against subtrees of it.
- **Cross-volume disk cost.** Single data root means hardlinks always work for non-pathological setups. Profiles are subdirs of the data root; materialization is intra-volume by construction.
- **Steam pin / shortcut breakage on switch.** Each profile's tree path is stable. Shortcuts target a specific profile's tree, or the profile-aware launcher with a `--profile` arg picks at runtime.
- **The "two installs side-by-side" power-user problem.** It's just two profiles. Or N profiles. Same primitive.
- **Silent file mutation under the user's feet.** Warehouse blobs are immutable. Edits create new versioned blobs; manifests update. The user always sees what they've done; they can roll back any of it.
- **Absolute-path config traps.** Slipgate-managed paths are relative to the data root. Profiles survive moves between machines without `demo_dir`/`sshot_dir`/`log_dir` cvars breaking. Migration from an external dir rewrites those cvars during the clean-room extraction.

---

## Two product modes

Slipgate ships two stable product modes, both supported indefinitely:

### Light mode

Slipgate operates as an **opt-in tool against the user's existing quake directory.** It is read-only by default and writes only when the user clicks a button.

Capabilities (as currently shipped or in-flight):
- Read-only analysis: ConfigViewer, weapon-script intelligence, alias-chain debugger, hardware scan, MyQuake → Browse filesystem inspection
- Updater: 1-click ezQuake / KTX / MVDSV / QWFWD updates against the user's existing canonical exe (Phase 1+ shipped)
- Version warehouse + version swap: bulk-import multiple binary versions from the user's existing dir, switch between them, delete (Phase 3 + 3.5 shipped)

Light mode is the natural surface for users who:
- Just want the analyzer / updater value without committing to slipgate as their install authority
- Have an unusual setup they don't want slipgate to second-guess
- Are evaluating slipgate before going all-in
- Run portable / multi-install topologies that don't fit the single-managed-root model

### Managed mode

Slipgate IS the install. The data warehouse is the source of truth. Profiles are the unit of "a Quake setup." Engines launch against materialized profile trees under the slipgate data root.

Capabilities (the new arc):
- Asset warehouse: content-addressed storage for textures, sounds, configs, custom HUDs, scoreboard banners, every user asset
- Profiles: manifests pointing at warehouse blobs; multiple profiles coexist; switching is materialization-not-copy
- Clean-room migration: non-destructive extraction of the user's existing dir into a managed install
- Filesystem watcher with mod-fingerprint classifier: ambient management of server-pushed content, demo auto-routing, screenshot/log routing
- Cloud catalog hookup: download community profiles, upload your own deltas, sync against the global asset corpus
- Per-config version history with IDE-shaped restore UX
- Lossless export: walk away with a portable Quake dir whenever you want

Mode is a single profile field: `mode: "light" | "managed"`. Users start in Light by default (analyzer + updater value with zero commitment), explicitly opt into Managed when they're ready (typically by running the migration on-ramp). Migration is reversible: Managed → export → uninstall → original-shape dir.

### What's NOT a third mode

- "Slipgate managing some files in my dir but not others" was the implicit middle-ground in earlier designs. It dissolves under the two-mode framing: that's just Light mode with the version-swap feature exercised.
- "Cloud-only no-desktop" is xantom's headless-web proposal. It's not a slipgate mode because slipgate's value is precisely the local-filesystem-aware role. The cloud catalog (assets.quake.world) is a separate web service that slipgate consumes; it's not a slipgate alternative.

---

## Load-bearing product properties

These are the principles that any future feature decision must respect. Together they define what slipgate is and what it isn't.

### 1. Lossless export / no vendor lock-in

> **At any time, the user can press one button and produce a fully-functional standalone Quake directory at a path of their choosing, with zero slipgate dependency. They can zip it, walk away, never use slipgate again. Nothing breaks.**

This is structural, not a marketing claim. Profiles are JSON manifests. Warehouse blobs are ordinary files. Materialization produces a normal directory tree. The export operation is `materialize_profile(target=<user-chosen>, hardlink=false_force_copy)` — same primitive as Managed-mode materialization, different target path.

Corollaries:
- Migration to Managed mode is reversible (export the active profile, uninstall slipgate, original-shape dir is back)
- Profiles can be shared with non-slipgate users (export, send the zip, recipient unzips and plays)
- Slipgate's marketing pledge "leave any time" is structurally true, not aspirational

This property must never be compromised. Any feature that would lock users in (proprietary asset format, slipgate-only encryption, server-side-only state, etc.) is rejected by construction.

### 2. Non-destructive migration

> **The clean-room migration that extracts a user's existing quake dir into Managed mode is COPY, not MOVE. The source directory is never modified.**

If the user runs migration and doesn't like the result, they close slipgate and the original dir is untouched. This builds trust with users coming from the messy-dir tradition who have reasonable wariness of "let me clean this up for you" tools.

Corollary: migration is double-reversible. Run it, don't like it, close slipgate → original dir is still there. Run it, use Managed mode for a week, decide to leave → export profile → uninstall → still have the original dir AND the export. Two ways back to the prior state.

### 3. SHA256 as identity, governance as quality control

> **Every asset in the warehouse is identified by its SHA256. Two files have the same identity if and only if their bytes are identical. Format conversions, recompressions, and metadata rewrites produce new identities — they are new assets.**

The SHA-256 primary identity is non-negotiable. Concerns about "polluting" the cloud catalog with format-converted variants of existing assets are real but addressed at the governance layer, not the identity layer:
- Submission-time normalization: when a user submits a texture, the catalog normalizes to a canonical lossless form (PNG metadata stripping, etc.) and hashes that. Two submissions of the same logical asset in different formats land at the same canonical SHA.
- Perceptual hashing as moderation aid only, not identity. Image dHash / pHash / audio fingerprinting flag potential duplicates at submission time so human moderators can review.
- Manual review for new submissions. Once known-good assets are in the catalog, future SHA hits dedupe automatically.

The cloud catalog stores user-generated assets only. **Stock id1 paks (id1/pak0.pak, id1/pak1.pak) are NEVER cloud-distributed** — they are id Software's copyrighted game data. The catalog stores known-good SHAs of legitimate stock paks for verification; users must obtain stock paks from a legitimate source themselves (purchase via Steam/GOG, use the QuakeWorld free distribution as nQuake bundles, etc.).

### 4. Web/desktop split

> **The cloud is the catalog. The desktop is the filesystem-companion. They are joined by SHA256 IDs and a Discord-OAuth-Firebase-token bridge. Neither is a substitute for the other.**

Web's role:
- assets.quake.world catalog (textures, configs, profiles, bundles)
- Social: profile sharing, browsing strangers' setups before deciding to grab them, community curation
- Authentication: Discord OAuth, slipgate identity bridge

Desktop's role:
- Local filesystem authority (the user's actual Quake install)
- Binary fingerprinting (PE strings via `windows::Win32` APIs)
- Hash-and-warehouse (multi-GB asset trees never round-trip through upload)
- Hardlink/symlink/copy materialization
- Native process launch (`-basedir` argument, engine launching)
- Hardware scan (WMI / SetupAPI / EDID parsing)
- Tray icon, notifications, sleep/resume handling

These are not interchangeable roles. Browser sandboxes physically cannot do most of the desktop work. The "complexity is the enemy, why duplicate" critique of the desktop app is misframed: the duplication doesn't exist because the two surfaces have minimal overlap.

### 5. Opt-in by design

> **Slipgate respects the user's choice of how much they want it involved. Every tier of involvement (Light read-only, Light with updater, Managed) is reachable by which buttons the user clicks, never by a global switch.**

This was the original four-tier ladder framing in `project_slipgate_tier_ladder` memory. Under the two-mode reframe it becomes simpler: Light vs Managed. But the principle is unchanged — slipgate never assumes ownership of the user's content; the user grants slipgate authority by opting in, and that authority is bounded by which features they exercise.

The migration on-ramp specifically must always offer a "review and accept" step, never auto-anything. Pre-extraction overview is non-negotiable.

---

## What this is NOT

To prevent confusion as the architecture lands and team conversations happen:

- **Not a game launcher.** Slipgate doesn't launch games as a primary product surface. The launcher is incidental — it's how Managed mode ensures the engine sees the right materialized tree. Light-mode users can use whatever launcher they want; Managed-mode users press play in slipgate or use a profile-bound shortcut.
- **Not a competitor to assets.quake.world.** Slipgate is the desktop bridge to that catalog. The catalog is on the web; slipgate consumes it.
- **Not a closed ecosystem.** The lossless-export property guarantees this. Anyone can export their profile and use it without slipgate.
- **Not requiring login.** Light mode and Managed mode both work fully offline. Cloud catalog integration is opt-in; users who don't want to sign in get every feature except community-content download/upload.
- **Not opinionated about which engine.** ezQuake, FTE, KTX, MVDSV, QWFWD — slipgate manages each as a binary family in its warehouse. Profiles can declare engine compatibility hints but aren't engine-locked.
- **Not a config validator.** Slipgate parses configs to inform features (intel, history, sanitization), but doesn't refuse user-set values that look "wrong." The user is the authority on their config.

---

## What replaces (the old model)

The "messy quake dir" tradition that slipgate replaces:

| Old way | New way |
|---|---|
| Manually find/move/zip files when sharing a setup | Export profile manifest |
| Absolute paths in `demo_dir`/`sshot_dir`/etc. break on machine moves | Slipgate-managed paths survive moves |
| Multiple ezQuake binaries cluttering one dir, named ad-hoc | Warehouse with named version slots, canonical filenames |
| "Try Milton's setup" requires hours of file-swapping | Download manifest, materialize, switch with a click |
| Backup = zip the whole dir + figure out what's portable | Backup = sync manifest + blobs to cloud |
| Edit a config, break it, no way back | Per-save version history, IDE-shaped restore |
| Server-cached cruft accumulates forever | Mod-fingerprint classifier quarantines + offers cleanup |
| `/qw/screenshots/` mixed with current play artifacts | Routed to `user-content/screenshots/<profile>/<date>/` |
| Multiple installs need separate Quake folders, separate Steam pins | One install, multiple profiles, one Steam pin |
| Fork-with-modifications requires duplicating the whole dir | Manifest fork, zero-cost beyond the diff |

The new way IS more complex in implementation. The user-facing experience is simpler at every step.

---

## How users experience it

End-to-end scenarios that the architecture must serve:

### Scenario 1: New user, fresh install

1. User downloads slipgate, runs installer, opens the app
2. App detects no existing slipgate data root
3. App asks: "Do you have an existing Quake install you'd like to import? (Recommended for first-time slipgate users) — Yes / No"
4. **No path:** App prompts for stock paks (id1/pak0.pak + id1/pak1.pak). User points at a legitimate copy. App verifies SHAs against known-good list. Warehouse is seeded with stock baseline. App offers a default profile shell + downloadable starter profiles (paradoks-default, milton-classic) for first-launch demonstration. Done.
5. **Yes path:** Migration on-ramp. (See Scenario 2.)

### Scenario 2: Existing user, migration on-ramp

1. User points slipgate at their existing `D:\Games\QuakeWorld\`
2. Slipgate runs the clean-room extractor: parses active config chain, traces what's loaded at runtime, classifies every file in the dir into stock / user-asset / user-content / cache-ephemera / engine-runtime
3. Pre-extraction overview: "I'll extract these N assets (size MB). I'll skip these M unreferenced files. I'll rewrite these K cvars during migration. Source dir untouched."
4. User reviews line-by-line, accepts (or per-file declines), confirms
5. Slipgate copies extracted assets into the warehouse, builds a profile manifest, materializes the tree
6. Result: a working Managed-mode install with their existing setup as a profile, cleanly extracted, source dir still intact for safety
7. App offers to bundle a sample alternate profile for switching demonstration

### Scenario 3: Try someone else's profile

1. User browses assets.quake.world, finds Milton's published profile
2. Click "Try in slipgate"
3. Slipgate downloads Milton's manifest, computes which blobs the user already has (deduplicated against existing warehouse), fetches only the missing ones
4. Materializes Milton's profile as a sibling to the user's profile
5. User can switch between profiles, or use the side-by-side compare view to see exactly what differs (configs, custom textures, sound replacements)
6. User can selectively import just Milton's visuals into their own profile, keeping their configs intact (manifest-overlay operation)

### Scenario 4: Edit a config, roll back

1. User edits `config.cfg` in slipgate's ConfigEditor (or external editor — watcher mediates)
2. New blob registered, manifest updated, view reflects new state
3. User notices something's broken, opens History panel for the file
4. Sees a list of previous versions with timestamps and one-line diffs
5. Selects "2 minutes ago" version, clicks Restore
6. New manifest version writes the old bytes as the current state. Forward-linear: history is preserved, restoration is a new edit that happens to match an earlier state.

### Scenario 5: Walk away

1. User decides slipgate isn't for them
2. Click Export Profile, choose target path on disk
3. Slipgate materializes the active profile to that path using copy fallback (so it survives slipgate uninstall)
4. Result: a normal Quake dir at the chosen path, fully functional with their configured engine
5. Uninstall slipgate. Original dir (if they migrated from one) still there. Export there too. Everything intact.

These scenarios are what the implementation arcs serve. Every architectural decision should be checked against "does this enable Scenario X cleanly?"

---

## Provenance

This vision was formed in a single design conversation on 2026-04-28 immediately following the Phase 3.5b ship. Key turns:

- Operator raised the question of headless-web vs desktop-app. Desktop justified by filesystem-companion role.
- Operator independently arrived at the profile-as-bundle idea from observing the data warehouse pattern shipped in Phase 3.5b.
- The architectural collapse (slipgate-IS-quakedir) emerged when operator empirically verified that a minimal Quake install requires only `id1/pak0.pak` + `id1/pak1.pak` + a client. Everything else was reframed as content layered on top.
- The two-mode product framing emerged as the simplification of the prior four-tier opt-in ladder.
- The clean-room extraction migration emerged as the natural consequence of the non-destructive principle.
- The version-history-for-free observation emerged when the immutable-blob + manifest-versioning architecture was traced through the implications.

Every load-bearing decision in this document was approved by operator during the conversation. The architecture spec and roadmap that accompany this document make these decisions concrete.

---

## Related documents

- **Architecture:** `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md` — data model, storage layout, content taxonomy, watcher contract, primitive operations
- **Roadmap:** `docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md` — implementation arc dependency graph, v1 scope, per-arc summaries, status
- **Prior framing (now superseded):** `project_slipgate_tier_ladder` memory — the four-tier opt-in ladder. The two-mode framing in this document is the cleaner distillation; the ladder framing remains valid as the underlying intuition.
- **Phase 3.5b binary management:** `docs/superpowers/plans/2026-04-26-add-quake-client.md` — the binary-side implementation that established the warehouse substrate. Asset warehouse generalizes from this.
- **Asset bundle classifier:** Phase 2d-bundle (qw-oracle, shipped). Provides the per-engine path rules and asset-category catalog that the migration's classifier consumes.
