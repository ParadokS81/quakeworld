# Slipgate Managed Mode -- Brainstorm Pass 5 Ratifications (PARTIAL)

> **Captured 2026-05-05; 5.2 appended 2026-05-06; 5.3 appended 2026-05-08.** Bridge document between the Pass 5 brainstorm session and the canonical drain pass. **COMPLETE: 5.1 + 5.2 + 5.3 all done. Drain pending in fresh session, batched with Pass 4.**
>
> **Status:** Brainstorm complete (5.1 + 5.2 + 5.3). Drain pending in fresh session.
>
> **Companion docs:**
> - Vision: `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`
> - Architecture: `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`
> - Roadmap: `docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`
> - Pass 3 minutes: `docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md`
> - Pass 4 minutes: `docs/superpowers/specs/2026-05-05-slipgate-managed-mode-pass4-ratifications.md`
>
> **Pass 5 generated meaningful substrate amendments back into Pass 1 + Pass 3.2.** The original 5.1 brainstorm uncovered: (a) ezQuake's `cfg_save` truncate-write corrupts hardlinked blobs, requiring per-role materialization mode; (b) overlay-manifest model added too much UX surprise risk, replaced with one-directional hard-fork-with-drift-detection; (c) per-role drift granularity (cvar-level for configs, file-level for others); (d) verified Class 1/2/3 reload semantics via ezQuake source-walk, leading to a registry-driven reload-cost lookup as the ninth self-knowledge surface table. All amendments captured below; drain instructions cover both Pass 4 and Pass 5 together.

---

## Pass 5 brainstorm shape

Three sub-questions:

- **5.1** Runtime swap class taxonomy + engine IPC scope -- **COMPLETE 2026-05-05**
- **5.2** Launch UX (app-open behavior, profile-switch, engine-launch, gamedir-model amendment, engine-exit, multi-instance) -- **COMPLETE 2026-05-06**
- **5.3** Manifest backup UX (V1 backup targets, backup state surface, restore flow, payload over time, cadence) -- **COMPLETE 2026-05-08**

---

## 5.1 -- Runtime swap class taxonomy + engine IPC scope

### 5.1a -- The swap unit (resolved by adopting hard-fork model)

Under hard-fork-with-drift-detection (locked in 5.1b substrate amendments below), "swap" = active-profile rematerialize. The materializer atomic-swap from Pass 2 is the engine; runtime swap class describes "did the engine notice the new tree." No separate preset primitive needed; presets are modeled as small profiles that fork from a parent, leveraging the existing fork primitive.

### 5.1b -- Substrate amendments uncovered during 5.1

Three substrate decisions fell out of pushing on swap-class taxonomy. They back-amend Pass 1 + Pass 3.2 + introduce a new Pass 5 surface.

#### Pass 1 amendment: per-role materialization mode

**Verified problem.** ezQuake's `cfg_save` (`src/config_manager.c:826`), `cfg_save_onquit` (`:981`), `hud_export` (`:894`), and `dev_dump_defaults` (`:266`) all use `fopen(path, "w")` truncate-write. The default `cfg_backup` is 0 (verified via subagent source-walk), so out of the box every save mutates the shared blob through any hardlink at the path. Content-addressed-store immutable-blob invariant violated.

**Locked decision.** Materialization mode is per-role:

| Role kind | Living-vs-immutable | Materialization mode |
|---|---|---|
| `user-asset:config` | Living | **copy** |
| `user-asset:texture` / `:skin` / `:sound` / `:hud` / `:script` | Immutable | hardlink |
| `library:map` / `:loc` / `:mod-content` | Immutable | hardlink |
| `stock:baseline` (paks) | Immutable | hardlink |

Configs are KB-scale; copy-mode cost is trivial (a few KB per profile per config file). Hardlinks remain the win for textures (MB), maps (tens of MB), sounds, paks (tens of MB). Rule rides on the existing role registry; no separate engine-writable allowlist.

This subsumes Pass 3.4's "files the engine writes" concern: writes go to a real copy; capture/swap pipeline catches new bytes; hash to fresh blob; manifest updates. No blob corruption possible.

#### Pass 3.2 amendment: hard-fork-with-drift-detection (replaces overlay-manifest proposal)

**Brainstormed alternatives.** Three models considered for fork semantics:
- **A** Hard-fork only (status quo Pass 3.2): clones are full snapshots, independent thereafter.
- **B** Overlay-by-default with per-section snapshot opt-in: clones inherit live from parent; tombstones for deletions; manifest schema gains `inherits_from_profile_id`.
- **C** Hard-fork-with-drift-detection: clones stay full snapshots (Pass 3.2 unchanged); add drift detection at fork launch; user reviews and accepts changes.

**Locked decision.** Adopt **C**. Substrate cost is one new field per fork manifest (`last_synced_parent_manifest_sha`), one diff routine at fork launch, and the clone modal becomes the import surface (its sixth consumer). No `inherits_from_profile_id`, no tombstones, no parent-chain walking at materialize, no overlay refcounts at GC, no flatten-on-share. Hard-fork's clean self-containment preserved.

**One-directional.** Parent -> fork only. Fork -> parent never. Fork is sandbox; main is ground truth.

**Comparison rejected B because.** Overlay's only structural win was auto-propagation. But auto-propagation is a feature with a hidden cost — users get surprised by changes they didn't actively consent to ("wait, why does my fork have main's new sensitivity? I forgot configs were inherited"). Drift detection trades zero-friction for zero-surprise; zero-surprise is the better default for a tool designed to give users confidence in their setups.

**Drift mechanics:**
- **What drift detects:** files added in parent since last sync (candidates for new-asset import); files modified in parent at same target_path (candidates for version replace); files removed in parent (candidates for fork removal); files modified in fork at those target_paths since last sync (conflict candidates).
- **Granularity:** drift prompt batches by section (Configs / HUD / Textures / Sounds / etc.) like the clone modal; drill-down to per-file. Same UX primitive.
- **What "import" does:** accepted entries copy from parent's manifest into fork's at the same target_path; bumps fork's `last_synced_parent_manifest_sha` to parent's current; next materialize picks up changes.
- **Skippable when no drift:** if `last_synced_parent_manifest_sha == parent_manifest.sha`, no prompt, engine launches normally. Zero friction in the common case.
- **Two-way drift (fork -> parent)?** V1+ at most. V1 = parent -> fork only.
- **Orphaned forks:** if parent is deleted while fork survives, `forked_from_profile_id` dangles; drift detection silently no-ops; fork stays self-contained. Profile-delete-prompt (Pass 3.2) gains a warning ("X profiles fork from this; deleting will end their drift detection").

#### Pass 5 new: per-role drift granularity

**Locked decision.** Drift granularity is per-role:
- **`user-asset:config` role: cvar-level drift.** Three-way semantic diff using slipgate's existing engine-agnostic config parser (`apps/slipgate-app/src/lib/config/parser/config-parser.ts`, 150 lines) plus oracle-fed cvar metadata (`data/ezquake-variables.json`, `data/fte-variables.json`). For each cvar main changed since last sync: if fork has not customized that cvar -> default-on import; if fork HAS customized that cvar -> default-off import (opt-in). Conflict UX renders both groups distinctly in the drift prompt.
- **All other roles: file-level drift.** Per-file inheritance and per-file override at file granularity. No semantic diff needed.

**Both engines (ezQuake and FTE) get cvar-level config drift in V1.** The parser is engine-agnostic; oracle's Phase 2 FTE Layer 1 extraction (closed in commit `a5e060e5 feat(qw-oracle): close FTE Phase 2d-bundle (Phase 2 final)`) feeds the FTE cvar metadata snapshot. Remaining FTE-side ConfigViewer parity work (macros, triggers UI sections from the older 9-day-old memory note) is orthogonal to drift detection.

**Surgical write back.** When user accepts a cvar import: parser finds the cvar line in fork's config.cfg, replaces its value, writes new file -> new SHA -> new blob -> fork manifest entry updated -> bumps `last_synced_parent_manifest_sha`. No engine involvement.

**ConfigViewer-as-cvar-level-editor stays as a complementary V1+ feature** -- lets users tweak cvars in slipgate's UI directly, which writes surgically without going through engine cfg_save. Nice-to-have, not load-bearing for drift.

### 5.1b -- Class boundary table (verified from ezQuake source-walk)

Subagent walked ezQuake source 2026-05-05 to determine actual reload semantics per console command. Findings:

**Class 1 (mailslot console command, no engine restart, no vid_restart):**
- Cvars / aliases / binds (any) -- via `set` / `bind` / `alias` / `exec <delta-script>` (NOT `cfg_load`; `cfg_load` is destructive to existing binds/aliases per `LoadConfig_f` at `src/config_manager.c:1041`)
- Player skins (`skins/*.pcx`) -- via `skins` command (`src/cl_cmd.c:941`)
- Charset (`gfx/conchars.lmp`, `textures/charsets/*`) -- via `loadcharset <name>` (`src/r_draw_charset.c:682`)
- Skybox (`env/*.tga`) -- via `loadsky <name>` (`src/r_brushmodel_sky.c:537`)
- HUD layout positions -- via `hud_recalculate` (`src/hud.c:821`)

**Class 2 (vid_restart / s_restart / mapchange):**
- World/brush textures, alias models (`progs/*.mdl`), sprites, simple-item textures, conback, palette, gfx.wad, all 2D HUD images, crosshair textures, particle textures, fonts -- via `vid_restart` (or lighter `vid_reload` at `src/vid_sdl2.c:1801` keeps GL context)
- Sound buffers (`sound/**/*.wav`), ambient sounds -- via `s_restart` (legacy alias `snd_restart`, `src/snd_main.c:396`)
- Active map content (BSP, lit, loc, precached models/sounds) -- via mapchange (`map`, `devmap`, or `reconnect`)

**Class 3 (engine restart):**
- Engine binary (no in-process update path -- confirmed)
- Stock pak swap -- technically `fs_restart` (`src/fs.c:1956`) is Class 2, but it forces disconnect+reconnect (`:2998`); session-disruptive enough that V1 treats as Class 3
- Gamedir change -- technically `gamedir <name>` + `vid_restart` + `s_restart` + mapchange recipe could work (Class 2 with caveats); session-disruptive enough that V1 treats as Class 3 (per operator note: most ezQuake users don't use other gamedirs; KTX ships 25+ modes inside `qw/`; FTE single-player community is the main gamedir audience and is V1+ scope anyway)

**Two important verified mechanics:**
1. `exec` is purely additive (`Cmd_Exec_f` at `src/cmd.c:552` -- no clearing); `cfg_load` is destructive (resets binds/aliases first then re-execs). For Class 1 cvar/bind/alias deltas, slipgate must use `exec <generated-delta-script>`, NOT `cfg_load`. Preserves other state.
2. `gamedir` alone leaves GL textures from old gamedir resident in GPU memory; clean recipe needs `vid_restart` + `s_restart`. V1+ revisit if the recipe proves seamless in practice.

### 5.1b -- Reload-cost registry (NEW Pass 5 substrate)

**Locked decision.** Reload-cost lookup is registry-driven, not role-baked. Adds the **ninth table** to slipgate's self-knowledge surface (Pass 3.5).

**Registry shape.** Maps `(role, target_path_pattern) -> reload_command`. Most-specific-pattern wins; catch-all rows are fallbacks.

| Role | Path pattern | Reload command | Class |
|---|---|---|---|
| `user-asset:config` / `:script` | * | `exec <delta-script>` (cvar/bind/alias deltas) | 1 |
| `user-asset:skin` | `skins/*.pcx` | `skins` | 1 |
| `user-asset:texture` | `gfx/charsets/*` or `gfx/conchars.lmp` | `loadcharset <name>` | 1 |
| `user-asset:texture` | `env/*.tga` (skybox) | `loadsky <name>` | 1 |
| `user-asset:hud` | (layout configs only) | `hud_recalculate` | 1 |
| `user-asset:texture` | * (catch-all) | `vid_restart` | 2 |
| `user-asset:hud` | * (catch-all images) | `vid_restart` | 2 |
| `user-asset:sound` | * | `s_restart` | 2 |
| `library:map` / `:loc` | * | mapchange | 2 |
| `stock:baseline` | * | engine restart (V1) | 3 |
| (engine binary or `declared_gamedirs` change) | n/a | engine restart | 3 |

**Cadence.** Code-bundled at V1; oracle-authored delta-sync at V1+. Same shape as the file-integrity-check registry (Pass 4) and asset-roles registry (Pass 3.5).

**Class boundary computation at swap time.**
1. Compute manifest diff (active profile A -> target profile B).
2. For each diff entry: look up `(role, target_path)` in reload-cost registry -> get `reload_command` and class.
3. The class of the swap is the **highest** class any diff entry triggers (worst-case wins).
4. If only Class 1 commands: emit them via mailslot in the right order. For cvar/bind/alias diffs, generate a delta script (using slipgate's existing parser to compute cvar/bind/alias-level deltas), write to a temp file, send `exec <path>` via mailslot.
5. If any Class 2: trigger `vid_restart` and/or `s_restart` after all file-level changes are in place.
6. If any Class 3: prompt user for engine restart (default UX per Pass 1 anchor item 5).

**Empirical case-by-case growth.** As edge cases surface (specific HUD images that don't reload correctly via vid_restart, texture path patterns that need special handling, etc.), more-specific registry rows get added in subsequent slipgate releases. The "Class 2 empirical case-by-case" guidance from Pass 1 anchor item 5 now means "extend the registry as we verify cases" -- content-shaped V1+ work, not engineering-shaped.

### 5.1b -- Synergy with drift-detection parser

The same engine-agnostic config parser used for cvar-level drift detection (per-role drift granularity, above) powers Class 1 swap script generation. Slipgate parses A's and B's configs, computes cvar/bind/alias deltas, emits a delta script, sends via mailslot. One parser; two consumers.

### 5.1b -- Engine asymmetry (mailslot ezQuake-only)

Mailslot IPC is ezQuake-specific (`\\.\mailslot\ezquake`). FTE-IPC TBD per Pass 1 anchor item 5. **V1 implication:** Class 1 swaps are ezQuake-only. FTE swaps fall back to engine restart (Class 3) until FTE-IPC ships V1+.

Cvar-level drift detection itself works for both engines (parser is engine-agnostic; both cvar metadata snapshots ship from oracle). Only the runtime push-via-IPC is ezQuake-only.

### Affected canonical docs (5.1)

- **Architecture spec Pre-Pass anchor block:** add `> **Pass 5 status: PARTIAL (5.1 COMPLETE 2026-05-05; 5.2 + 5.3 pending).**` line.
- **Architecture spec anchor item 1 (materializer modes):** amend to per-role mode (configs copy, others hardlink). Reference verified ezQuake truncate-write source-walk.
- **Architecture spec Storage Layout / Manifest as Profile:** add `last_synced_parent_manifest_sha?: string` field to fork manifests (nullable; null for non-fork or fully-synced).
- **Architecture spec Primitive operations `fork`:** clarify that fork is full-snapshot (Pass 3.2 unchanged); add drift detection at fork-launch as the import-from-parent gesture; clone modal becomes the sixth consumer.
- **Architecture spec Cloud catalog interaction / Manifest as Profile:** add per-role drift granularity (cvar-level for configs via parser+oracle metadata; file-level for everything else).
- **Architecture spec Engine integration:** REPLACE the placeholder for Pass 1 anchor item 5 with the verified runtime swap class taxonomy: Class 1 / 2 / 3 boundaries, reload-cost registry as ninth self-knowledge table, exec-vs-cfg_load mechanics, mailslot-ezQuake-only V1 + FTE-Class-3-fallback, gamedir + stock-pak default-Class-3 in V1.
- **Architecture spec Slipgate self-knowledge surface (Pass 3.5 table):** add ninth row for the reload-cost registry. Code-bundled at V1; oracle-authored delta-sync at V1+.
- **Open architectural questions section:** mark Pass 5 anchor item 5 resolved (runtime swap class taxonomy verified). Pass 5.2 + 5.3 + Pass 6/Arc H + L1-alpha/beta/gamma/delta tracks remain open.

---

## 5.2 -- Launch UX

### Mental model recalibration

5.2 brainstorm reframed slipgate's role: the app primarily controls the quakedir; engine launch is one button among many, not the primary surface. Most app interactions don't involve booting the engine. This collapsed an over-engineered "launch pipeline" proposal into a simpler scenario-driven model with five distinct surfaces (app-open / profile-switch / engine-launch / engine-exit / app-close).

Operator framing: "an app that i use to control my quakedir basically. once i have installed/imported my quake setup ... next time i open my app, thats it. if i goto my quake it just shows the browse mode and i can browse around."

### Locked decisions: app-open behavior

- **Default surface on app open:** last view in Browse mode of active profile. No engine auto-launch.
- **Active profile persists across slipgate sessions** via `active_profile_id` in `profile-roles.json` (Pass 3.2 already locked the field; this confirms persistence semantic). Closing slipgate while on a fork -> reopening on the fork. Forks are not session-scoped.
- **Drift detection on app open is non-blocking.** If active profile is a fork with parent-drift available, slipgate runs drift detection in the background. If drift exists, a small non-intrusive UI indicator surfaces ("Drift from main: X cvars, Y assets -- review"). User reviews when ready; never blocks daily flow.
- If active is primary or fork-without-drift: no indicator, no prompt.

### Locked decisions: profile-switch behavior

- **Drift detection on profile switch is blocking.** When user picks a different profile from the profile manager and the new active is a fork with drift, drift prompt fires HERE -- at the moment of intentional context change. User reviews/imports/skips before switch completes.
- Switching to primary or to a fork-without-drift: instant switch; tree rematerializes to match new active manifest; UI updates.
- Active profile updates persistently.

### Locked decisions: engine-launch behavior

- **Engine launch is a separate gesture from app-open.** User explicitly clicks Launch (or hits hotkey).
- **Drift on engine launch:** if drift indicator was visible from app-open and user has not reviewed, light one-liner prompt -- "Pending drift from main. [Review now] [Skip and launch]". Not the full drift dialog; just two buttons.
- **Default gamedir is always `qw`.** No picker; no `+gamedir` command-line arg in V1. ezQuake handles server-pushed gamedir changes natively at runtime (auto-download into mod-cache; Pass 3.3 bucket 4 + Pass 3.4 Case 3 capture/swap territory).
- **Launch-prep step:** copy `user-asset:config` role entries from blob to tree (per-role materialization mode, Pass 5.1b). Configs are KB; trivial cost.
- **Engine command-line:** working-dir = `<data-root>/active-tree/`. No additional args V1.
- Slipgate connects to mailslot once engine is ready.

### Locked decisions: gamedir model amendment (Pass 1 anchor item 3)

5.2 brainstorm uncovered a wrong mental-model assumption baked into Pass 1 anchor item 3 ("Launcher offers a per-launch gamedir picker when length > 1"). The picker is wrong UX for QW.

**How QW gamedirs actually work** (operator's correction, 2026-05-06):
- Engine starts with default gamedir (`qw`).
- When client joins a server, the server tells the client which gamedir is required; engine switches automatically.
- Files for the new gamedir auto-download on the fly if missing.
- User does NOT pre-select gamedir at launch in normal play.
- Pre-selecting a gamedir is ONLY relevant for offline single-player mods / expansions (hipnotic, rogue, Painkeep, custom SP). Niche use case; mostly served by FTE single-player community.

**V1 amendments to Pass 1 anchor item 3:**
- **`declared_gamedirs` field stays as manifest metadata** -- but its meaning is "what gamedirs does this profile have content for" (so library mod-content materializes into the right places when a server later pushes a gamedir change), NOT "what gamedir to launch with."
- **Per-launch gamedir picker is dropped** from V1 entirely. Likely V1+ scope as well; gamedir UX as a prominent surface waits for the future mod-browser arc.
- **Pass 5.1b "gamedir change -> Class 3"** interpretation refined: applies only to RARE user-initiated cases (user switches profiles where new profile's primary gamedir differs and they want to start in that gamedir for offline SP play). Common case (server pushes gamedir change at runtime) is engine-native; slipgate doesn't intervene.

### Locked decisions: engine-exit behavior (downstream of Pass 3.4)

- Stage 2 capture/swap pipeline fires immediately on engine exit.
- If slipgate UI in focus: cleanup notification surfaces immediately in slipgate.
- If slipgate in tray: tray icon badges; cleanup notification queues for next slipgate-focus.
- Auto-mode opt-in (Pass 3.4) skips cleanup prompt for high-confidence + integrity-pass entries.

### Locked decisions: app-close behavior

- Active profile persists (no auto-reset to primary).
- Pending drift remains pending; re-checks on next slipgate open.
- `.pending-swap.json` state persists for any uncaptured engine writes.
- Capture/swap doesn't auto-fire on slipgate close (engine isn't running anyway; pipeline stages on engine-exit, not slipgate-close).

### Locked decisions: multi-instance + auto-launch

- **Multi-instance V1 = single-instance only.** Launching while engine already runs prompts "Engine is already running for profile <X>. [Bring to focus] [Quit and relaunch] [Cancel]". Multi-instance with concurrent active trees is V1+ substrate work (would need multi-tree support).
- **Auto-launch engine on app-open: no by default.** V1+ opt-in for power users.

### Affected canonical docs (5.2)

- **Architecture spec Pre-Pass anchor block:** update Pass 5 status to "5.1 + 5.2 COMPLETE 2026-05-06; 5.3 pending."
- **Architecture spec anchor item 3 (`declared_gamedirs`):** amend -- field stays as manifest metadata for "gamedirs this profile has content for"; per-launch picker dropped from V1; server-pushed gamedir handling clarified as engine-native runtime behavior.
- **Architecture spec Engine integration / Launch UX:** add the five-scenario walkthrough (app-open / profile-switch / engine-launch / engine-exit / app-close) as the canonical mental model. Note non-blocking-on-app-open drift + blocking-on-profile-switch drift + light-prompt-on-engine-launch drift as the three drift-trigger points.
- **Architecture spec Active vs Launched:** confirm `active_profile_id` is durably persisted across slipgate sessions (no session-scoped reset).
- **Architecture spec Open architectural questions:** mark Pass 5.2 resolved.

---

## 5.3 -- Manifest backup UX

### Pass 5.3 brainstorm shape

Four sub-questions resolved over the 2026-05-08 session, plus a V1 scope confirmation that landed early when the operator pushed back on hub-as-primary-backup (hub doesn't exist yet; cannot rely on it for V1 byte recovery):

- **Pre-5.3a** -- V1 backup targets (resolved: GitHub OAuth + local-external; hub deferred to V2)
- **5.3a** -- Backup state surface UX placement (resolved: Settings + first-launch + change-count drift-badge)
- **5.3b** -- Restore flow grammar (resolved: symmetric selector modal)
- **5.3c** -- Backup payload over time (resolved: snapshot model + include manifest-history/)
- **5.3d** -- Backup cadence policy (resolved: manual only PoC; auto-flavors V1+)

### V1 scope (locked pre-5.3a): backup targets

| Target | Payload | V2 when hub.quake.world ships |
|---|---|---|
| **GitHub OAuth** (primary, cloud) | full warehouse -- manifest + state + configs + ALL blobs + manifest history | payload shrinks back toward "private content only" (sovereignty argument: private-by-definition shouldn't sit on community-hosted infra) |
| **Local-external** (offline, manual) | full warehouse copy to USB / NAS | unchanged |

**V1 reality check (load-bearing reframe):**
- Hub doesn't exist yet -> no hub-known-SHA byte recovery on restore.
- Manifest-only GitHub backup would land a list of SHAs nobody serves. Useless.
- Therefore GitHub MUST carry the bytes in V1, not just the manifest. GitHub IS the proof-of-concept that demonstrates the content-addressed warehouse model end-to-end.

**Sizing fits** the typical user: ~100MB Quake dir (operator's measured ~130MB textures dir alone) fits in a single GitHub repo without LFS; <= 1GB stays in GitHub's preferred envelope; >1GB users fall back to local-external. Content-addressed blob layout maps cleanly onto git's object store -- blobs are added once and never mutate, manifests change over time, git history captures snapshots naturally.

**V1 -> V2 migration path:**
- V1 (now): GitHub carries the full warehouse. Hub absent.
- V2 (when hub.quake.world ships): hub takes over the mass (small payload: manifest + state + configs; hub serves blobs via hub-as-gravitational-center per Pass 3.5). GitHub payload shrinks to private-content-only OR deprecates depending on the privacy-sovereignty story. Local-external unchanged.

### 5.3a -- Backup state surface UX placement

**Locked decisions:**

- **Steady-state surface:** Settings -> Backup pane. Backup is system-maintenance UX, not a daily-product surface. Settings is the semantic home.
- **Always-visible drift-badge:** slipgate header/footer surfaces "X changes since last backup" (content-delta, NOT time-based). "12 changes since last backup" is a sharper signal than "7 days since last backup" -- meaningful regardless of elapsed days; "0 changes" means no nudge.
- **First-launch onboarding surface:** when slipgate is installed with no existing data root, the install flow surfaces three branches front-and-center:
  1. **Install fresh Quake** -- slipgate seeds from scratch (uses existing migration / fresh-start substrate from Pass 1).
  2. **Restore from backup** -- choose GitHub repo (paste URL / OAuth) or local-external path; clone / copy warehouse; rematerialize active tree.
  3. **Skip into tool mode** -- slipgate runs as analysis tool (drop-a-zip-and-inspect; no warehouse, no profiles).

**Settings -> Backup pane V1 minimum surface:**
- Per-target list (GitHub repo URL, local-external path; "Add target" / "Remove target" gestures).
- Per-target last-backup timestamp + drift-badge with thresholds (defaults: yellow > 7 days OR > N changes; red > 30 days OR > M changes; user-configurable).
- "Back up now" button per target -> opens selector modal (sixth consumer of Pass 3.2 primitive).
- "Restore from this target" button per target -> opens selector modal (symmetric grammar; see 5.3b).

**Third slipgate persona surfaced:**
The "Skip into tool mode" branch surfaces a third slipgate persona distinct from Managed Mode's primary user: an **analysis-tool user** (drop in a zip, inspect contents, check SHA-known status, identify mod fingerprints). Not Managed Mode V1 core, but the install flow accommodates it cleanly. Worth a note in the architecture spec under install flow.

### 5.3b -- Restore flow grammar

**Locked decisions:**

- **Restore uses the same selector modal as backup -- symmetric grammar.** User sees "this backup contains: Configs (200KB), HUD (12MB), Textures (130MB), Private files (3KB)" and ticks what to restore.
- **Selector modal becomes the sixth consumer** of Pass 3.2's clone-modal-as-V1-selector primitive (BACKUP gesture) AND extends the existing "selective import from another profile" consumer to include "import from backup target" (RESTORE gesture). Could equivalently be framed as the seventh independent consumer; either framing works.
- **Granular partial restore is supported by default.** User who broke a config can restore yesterday's configs only without bringing back textures or other content.
- **Modal defaults at backup time tuned to "save their setup"** -- the operator's framing for what the typical user wants protected:

| Section | Default at backup | Reason |
|---|---|---|
| Configs | ON | Identity-defining, KB-scale |
| HUD | ON | Custom HUDs are setup |
| Player skins | ON | Setup |
| User-asset textures (custom) | ON (user can deselect) | Setup, but heavy -- may be 100+ MB |
| User-asset sounds (custom) | ON | Setup, typically small |
| Scripts (weapon scripts, frag-msg packs, etc.) | ON | Identity-defining |
| Private files | ON | User chose to keep these |
| Library (maps / locs / mod-content) | OFF | Recoverable via server auto-download (V1) or hub (V2) |
| Stock baseline | OFF | Recoverable from user's existing ezQuake install |
| User-content (demos / screenshots / logs) | OFF | Profile-orthogonal; user opts in |

Typical "setup-only" payload lands at maybe 5-30MB; with custom textures included, ~150MB. Both fit GitHub easily.

### 5.3c -- Backup payload over time

**Locked decisions:**

- **Snapshot model.** Each "Back up now" = git commit with timestamp. Restore can target HEAD (latest) OR any prior commit ("restore from 3 days ago"). Git's native model is snapshots; working with git's grain beats fighting it.
- **Content-addressed dedup:** blobs are stored once in git's object store regardless of how many backup commits reference them. A 130MB texture stored once stays 130MB across 50 weekly backup commits; repo size grows with manifest changes (small JSON diffs), not blob churn.
- **Include manifest-history/ in payload.** GitHub backup carries `<data-root>/profiles/<id>/manifest-history/` (Pass 2's 500 config versions / 10 asset snapshots / checkpoints). Slipgate's internal "Versions" UI for configs works on a freshly-restored machine -- the "I broke this 200 versions ago" rollback survives machine swap.

**Reasoning:** Pass 2's retention policy is a load-bearing slipgate promise. Honoring it across machine swaps requires backing up manifest-history/. Byte cost is small (text-shaped JSON, mostly small diffs against parent manifests; dedup-friendly under git).

**Implication:** GitHub backup is a **two-layered time-machine**:
- Per-backup snapshots via git commits (coarse-grained; one snapshot per backup gesture).
- Per-config / per-asset-version via included manifest-history/ (fine-grained; matches slipgate's internal versioning).

### 5.3d -- Backup cadence policy

**Locked decisions:**

- **V1 PoC: manual only.** "Back up now" button per target; user triggers when they want.
- **Drift-badge is the always-visible nudge.** Surfaces "X changes since last backup" (content-delta, not time). Color-graded by threshold (configurable; default green / yellow > 7 days or > N changes / red > 30 days or > M changes).
- **Click-on-badge or "Back up now" opens the selector modal** (sixth consumer of Pass 3.2 primitive). User sees what would be backed up; deselects heavy or unwanted sections; commits.
- **Auto-cadences deferred to V1+:**
  - On-app-close (gotcha: Tauri lifecycle work for graceful-vs-immediate close + background completion of a 150MB push).
  - Time-based auto (gotcha: Tauri background-scheduling daemon).
  - On-significant-change (gotcha: smart-trigger logic; footgun risk).

**Reasoning:** PoC ships fastest with one trigger to test (button click; deterministic state; easy to iterate). Drift-badge covers the "user forgot" failure mode without auto-trigger complexity. Auto-cadences earn V1+ scope once the basic loop is proven.

### Affected canonical docs (5.3)

- **Architecture spec Pre-Pass anchor block:** update Pass 5 status to "5.1 + 5.2 + 5.3 COMPLETE 2026-05-08." Mark Pass 5 entirely closed.
- **Architecture spec NEW section (Backup and Restore UX):** add a top-level section covering V1 targets (GitHub + local-external), payload-vs-target table, snapshot model + manifest-history inclusion, settings-pane minimum surface, drift-badge with change-count, V1 manual-only cadence, V1+ auto-cadence carry-forwards, V2 hub-as-primary migration path. Cross-references Pass 3.2 selector primitive (sixth + symmetric-restore consumer).
- **Architecture spec Engine integration / install flow:** add three-branch first-launch flow (install fresh / restore / skip-into-tool-mode). Note third slipgate persona (analysis-tool user) surfaced via skip-into-tool-mode branch.
- **Architecture spec Storage Layout:** no new state files (backup is a target-shaped operation, not a state-storage primitive).
- **Architecture spec Primitive operations:** extend selector-modal subsection to note backup as sixth consumer + restore as symmetric-grammar seventh consumer (or extension of selective-import-from-another-profile).
- **Architecture spec Cloud catalog interaction:** note V1 GitHub-as-full-warehouse vs V2 hub-as-primary migration path. Hub-as-gravitational-center triangle stays unchanged; backup adds a parallel path that shrinks when hub takes over.
- **Architecture spec Open architectural questions:** mark Pass 5.3 resolved. Pass 5 entirely closed. Pass 6 / Arc H pre-impl + L1-alpha/beta/gamma/delta tracks remain open.
- **Roadmap brainstorm-progress block:** mark Pass 5 COMPLETE 2026-05-08 (replacing PARTIAL).
- **Roadmap NEW or extended arc:** Backup arc (could be Arc B sub-section or its own arc; arc-planner decides slicing). Key decisions: V1 = GitHub + local-external + manual cadence + symmetric selector modal + snapshot-with-manifest-history payload. V1+ = auto-cadences. V2 = hub-as-primary refactor.
- **HANDOVER:** update "Slipgate Managed Mode pivot" entry: Pass 5 COMPLETE 2026-05-08; mention V1 = GitHub OAuth + local-external + manual cadence + symmetric selector modal + snapshot-with-manifest-history-included.
- **Memory:** update `project_slipgate_managed_mode_passes.md` with Pass 5 COMPLETE row and new locked principles (V1 backup targets; symmetric selector modal for backup+restore; snapshot model + include manifest-history/; manual-only V1 cadence + change-count drift-badge; first-launch three-branch flow + third persona).

---

## Pass 5 carry-forwards

### V1+ refinements within slipgate Managed Mode arcs

- **ConfigViewer-as-cvar-level-editor.** Surgical writes to fork's config.cfg from slipgate's UI; bypasses engine `cfg_save` whole-config-dump behavior. Cvar-level inheritance UX without engine-side magic.
- **Gamedir live-swap recipe.** `gamedir X; vid_restart; s_restart; reconnect` may work seamlessly in practice. V1 defaults to Class 3 (engine restart); V1+ revisit if empirical evidence supports the live recipe. Operator note: most ezQuake users don't use other gamedirs; KTX ships 25+ modes inside `qw/`. Real demand is FTE single-player community.
- **FTE-IPC scope.** Currently mailslot is ezQuake-only. FTE adds Class 1 swap once FTE-IPC ships. Will need its own brainstorm on what FTE's IPC mechanism is (named pipe, dbus, file-watched control file, etc.).
- **Mailslot ruleset-gating verification.** Pass 1 anchor item 5 flagged that some commands are gated by active ruleset (MTFL etc.); tournament-context features need verification against ezQuake source via qw-oracle. V1 = no awareness, document the limitation; V1+ = ruleset-gating before sending mailslot commands during a tournament match.
- **Empirical reload-cost registry growth.** Specific HUD images that don't reload correctly via vid_restart, texture path patterns that need special handling, etc. Content-shaped V1+ work.
- **Two-way drift (fork -> parent).** V1 is one-directional only. V1+ if user demand surfaces.
- **Auto-cadence flavors for backup** (on-app-close, weekly auto, on-significant-change). Each adds Tauri lifecycle / scheduling work. V1 ships manual-only PoC; V1+ layers auto-cadences as opt-in toggles per target.
- **GitHub-as-private-only payload refactor (V2 path).** When hub.quake.world ships and takes over backup-mass, GitHub payload shrinks to private-content-only (private.json + bytes). Sovereignty argument: private-by-definition shouldn't sit on community-hosted infra.
- **Hub-as-primary-backup migration (V2).** Hub becomes primary backup target with small payload (manifest + state + configs); hub serves blobs via hub-as-gravitational-center. Local-external unchanged. GitHub repurposed (private-only) or deprecated.
- **GitHub auth mechanic refinement.** V1 ships OAuth-in-Tauri-webview or PAT (arc-planner decides slicing). V1+ adds token rotation, scope minimization (repo-only), 2FA flow polish.
- **Repo validation and restore-collision UX polish.** V1 ships minimal verification and a simple "warn before overwrite" flow; V1+ adds richer pre-flight (manifest-shape verification, dry-run preview, branch-into-sibling-root option) per real user feedback.

### Out-of-scope long-term (not Managed Mode arcs)

- **Mod browser.** "One-click install expansion packs / mods to try" -- mostly FTE single-player community use case (hipnotic / rogue / Painkeep / custom singleplayer mods). Adjacent to library content but distinct: catalog-distributed mod packs that install to a new gamedir. Out of scope for Managed Mode V1; could be a future Slipgate arc on top of the existing library + gamedir primitives once FTE support is mature.
- **Cross-machine sync** (desktop <-> laptop direct sync between two Slipgate installs). Implies multi-tree substrate; conflict resolution; LAN discovery. Could be a future Slipgate arc once V1 + V2 ship.
- **Cloud-provider-API backup** (S3 / Dropbox / Google Drive / OneDrive). Provider-taxonomy work; doesn't earn V1 or V2 scope. Local-external covers the offline-target case; GitHub covers the cloud case.

---

## Drain instructions for fresh session

A fresh session (or continuation in the current session if context budget allows) should drain Pass 4 + Pass 5 (5.1 portion) ratifications into the canonical docs together. Pass 5.2 + 5.3 will be appended to this doc in a future session and drained in the same drain pass.

### Step 1 -- Load context

Read in this order:
1. This Pass 5 ratifications doc (all sub-questions 5.1 + 5.2 + 5.3 complete).
2. Pass 4 ratifications doc (`docs/superpowers/specs/2026-05-05-slipgate-managed-mode-pass4-ratifications.md`).
3. Pass 3 ratifications doc.
4. Architecture spec.
5. HANDOVER index entry "Slipgate Managed Mode pivot."
6. Memory: `project_slipgate_managed_mode_passes.md`.

### Step 2 -- Architecture spec body edits

Pass 4 + Pass 5 (5.1 + 5.2 + 5.3) edits are summarized above. Cross-section consistency to watch for:
- Pass 1 anchor item 1 amendment (per-role materialization mode) cascades to materializer description in Storage Layout + Primitive operations.
- Pass 1 anchor item 3 amendment (drop per-launch gamedir picker; field stays as metadata) cascades to Engine integration + Manifest as Profile.
- Pass 3.2 amendment (drift detection) cascades to Manifest as Profile schema, fork primitive, clone modal docs.
- Pass 5 (5.1) full taxonomy replaces Pass 1 anchor item 5 placeholder; affects Engine integration section + Slipgate self-knowledge surface (ninth table).
- Pass 5 (5.2) Launch UX scenario walkthrough lands in Engine integration; non-blocking-on-app-open + blocking-on-profile-switch + light-prompt-on-engine-launch drift triggers cross-reference Pass 3.2's drift detection mechanics.
- Pass 5 (5.3) Backup and Restore UX is a NEW top-level architecture spec section. Cross-references: Pass 3.2 selector primitive (backup as 6th consumer; restore as 7th or extension of selective-import); Pass 3.5 hub-as-gravitational-center (V1->V2 migration path); Pass 1 fresh-install + migration substrate (three-branch first-launch flow). Three slipgate personas surfaced (Managed Mode user / drop-zip-and-analyze tool user / install-flow chooser).
- Pass 5 (5.3) install flow note (three branches: install fresh / restore / skip-into-tool-mode) lands in Engine integration section under install flow. Surfaces a third slipgate persona (analysis-tool user) via skip-into-tool-mode branch.

### Step 3 -- Roadmap edits

- Pass 4 + Pass 5 (5.1 + 5.2 + 5.3) marked complete in brainstorm-progress block.
- Arc B: gains per-role materialization mode (configs copy, others hardlink); gains `last_synced_parent_manifest_sha` field; gains drift detection at fork launch.
- Arc C-minimal: clone modal grows the drift-import consumer (sixth) AND the symmetric backup/restore consumers (sixth + seventh, or extension of selective-import-from-another-profile).
- Arc E: gains the reload-cost registry as a watcher-adjacent surface (slipgate consults it at swap time).
- New: Class 1/2/3 swap implementation lands in Arc B (or its own sub-arc) using the registry + parser.
- New: Backup arc (V1 = GitHub OAuth + local-external + manual cadence + symmetric selector modal + snapshot-with-manifest-history payload). Could be Arc B sub-section or its own arc; arc-planner decides slicing. V1+ adds auto-cadences (on-close / weekly / threshold). V2 refactors to hub-as-primary backup + GitHub-as-private-only.
- Arc H: keep mod-browser as long-term "out of scope; potential future arc" note. Add cross-machine sync + cloud-provider-API backup as additional out-of-scope future-arc notes.

### Step 4 -- HANDOVER edits

- Update "Slipgate Managed Mode pivot" entry: mark Pass 4 COMPLETE 2026-05-05 and Pass 5 COMPLETE 2026-05-08 (5.1 + 5.2 + 5.3 all done). Mention key Pass 5 outcomes: per-role materialization mode + hard-fork-with-drift-detection + reload-cost registry + verified Class 1/2/3 boundaries (5.1); five-scenario launch UX + gamedir model amendment (5.2); V1 backup architecture = GitHub OAuth + local-external + symmetric selector modal + snapshot-with-manifest-history + manual cadence + change-count drift-badge + first-launch three-branch flow (5.3).

### Step 5 -- Memory edits

- Update `project_slipgate_managed_mode_passes.md`: add Pass 4 row + Pass 5 COMPLETE row to the pass-by-pass table. Add new locked principles:
  - From 5.1: per-role materialization mode; hard-fork-with-drift-detection; per-role drift granularity; reload-cost registry as ninth self-knowledge table; verified Class 1/2/3 boundaries from ezQuake source-walk.
  - From 5.2: five-surface launch UX (app-open / profile-switch / engine-launch / engine-exit / app-close); drift-trigger differentiation (non-blocking on app-open, blocking on profile-switch, light-prompt on engine-launch); gamedir mental-model corrected (per-launch picker dropped, declared_gamedirs stays as content-metadata for "what gamedirs profile has content for").
  - From 5.3: V1 backup targets (GitHub OAuth full-warehouse + local-external; hub-as-primary deferred to V2 because hub doesn't exist yet); symmetric selector-modal grammar for backup AND restore (sixth + seventh consumer of Pass 3.2 primitive); snapshot model + include manifest-history/ for two-layered time-machine; manual-only V1 cadence + change-count drift-badge nudge; first-launch three-branch flow (install fresh / restore / skip-into-tool-mode) surfaces third slipgate persona (analysis-tool user).

### Step 6 -- Verify and commit

- Read modified architecture spec end-to-end for cross-section consistency.
- Commit message:
  ```
  docs(slipgate): drain Managed Mode brainstorm Pass 4 + Pass 5 (5.1 + 5.2 + 5.3) -- per-role materialization, hard-fork-with-drift-detection, reload-cost registry, verified Class 1/2/3 boundaries, five-surface launch UX, gamedir model amendment, V1 backup architecture (GitHub + local-external + symmetric selector modal + snapshot-with-manifest-history)
  ```
- Push to origin.

---

## Provenance

This doc is the output of a multi-session Pass 5 brainstorm. **5.1 (2026-05-05)** brainstormed extensively, generating substrate amendments back into Pass 1 + Pass 3.2 plus a new Pass 5 surface (reload-cost registry). Two subagent verification passes anchored 5.1: (1) ezQuake `cfg_save` write semantics confirming truncate-write through hardlinks corrupts blobs (`src/config_manager.c:826` etc.); (2) ezQuake runtime asset-reload semantics across `vid_restart` / `s_restart` / `gamedir` / `exec` / `cfg_load` / `fs_restart` / `skins` / `loadcharset` / `loadsky` / `hud_recalculate` / `vid_reload`. Both verifications grounded design decisions in primary-source evidence rather than speculation, per the operator's verification-discipline preference.

**5.2 (2026-05-06)** reframed launch UX around the operator's mental model of slipgate as a quakedir manager (not an engine-launch ceremony). Five distinct surfaces locked (app-open / profile-switch / engine-launch / engine-exit / app-close); drift-detection trigger points differentiated per surface; gamedir mental-model corrected (Pass 1 anchor item 3 amended -- per-launch picker dropped, field stays as metadata); auto-launch + multi-instance deferred to V1+.

**5.3 (2026-05-08)** locked V1 backup architecture in PoC-shape. Key reframes: (1) hub-as-primary-backup deferred to V2 because hub.quake.world doesn't exist yet -- V1 GitHub MUST carry full warehouse bytes, not just manifest, otherwise restore is broken; (2) GitHub OAuth + local-external as the V1 target pair; (3) symmetric selector-modal grammar for backup AND restore (sixth + symmetric-seventh consumer of Pass 3.2 primitive); (4) snapshot model + include manifest-history/ in payload (two-layered time-machine: per-backup git commits coarse, per-config manifest-history fine); (5) manual-only V1 cadence + change-count drift-badge as nudge; auto-cadences deferred to V1+; (6) third slipgate persona (analysis-tool user) surfaced via three-branch first-launch flow (install fresh / restore / skip-into-tool-mode).

Pass 5 entirely complete. Pass 4 + Pass 5 (5.1 + 5.2 + 5.3) drain remains pending in fresh session.
