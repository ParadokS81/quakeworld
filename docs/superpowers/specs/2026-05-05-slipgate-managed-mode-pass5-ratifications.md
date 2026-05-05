# Slipgate Managed Mode -- Brainstorm Pass 5 Ratifications (PARTIAL)

> **Captured 2026-05-05.** Bridge document between the Pass 5 brainstorm session and the canonical drain pass. **PARTIAL: 5.1 complete; 5.2 (Launch UX) and 5.3 (Manifest backup UX) pending.** This doc is a save point — append remaining sub-questions in a future session, then drain Pass 4 + Pass 5 together.
>
> **Status:** 5.1 brainstorm complete; 5.2 + 5.3 not yet started; drain pending.
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

- **5.1** Runtime swap class taxonomy + engine IPC scope -- **COMPLETE**
- **5.2** Launch UX (multi-instance launch, gamedir picker, default-launch-target, primary/active interaction) -- **PENDING**
- **5.3** Manifest backup UX (backup state surface, backup targets, restore flow) -- **PENDING**

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

## Pass 5 carry-forwards

### V1+ refinements within slipgate Managed Mode arcs

- **ConfigViewer-as-cvar-level-editor.** Surgical writes to fork's config.cfg from slipgate's UI; bypasses engine `cfg_save` whole-config-dump behavior. Cvar-level inheritance UX without engine-side magic.
- **Gamedir live-swap recipe.** `gamedir X; vid_restart; s_restart; reconnect` may work seamlessly in practice. V1 defaults to Class 3 (engine restart); V1+ revisit if empirical evidence supports the live recipe. Operator note: most ezQuake users don't use other gamedirs; KTX ships 25+ modes inside `qw/`. Real demand is FTE single-player community.
- **FTE-IPC scope.** Currently mailslot is ezQuake-only. FTE adds Class 1 swap once FTE-IPC ships. Will need its own brainstorm on what FTE's IPC mechanism is (named pipe, dbus, file-watched control file, etc.).
- **Mailslot ruleset-gating verification.** Pass 1 anchor item 5 flagged that some commands are gated by active ruleset (MTFL etc.); tournament-context features need verification against ezQuake source via qw-oracle. V1 = no awareness, document the limitation; V1+ = ruleset-gating before sending mailslot commands during a tournament match.
- **Empirical reload-cost registry growth.** Specific HUD images that don't reload correctly via vid_restart, texture path patterns that need special handling, etc. Content-shaped V1+ work.
- **Two-way drift (fork -> parent).** V1 is one-directional only. V1+ if user demand surfaces.

### Out-of-scope long-term (not Managed Mode arcs)

- **Mod browser.** "One-click install expansion packs / mods to try" -- mostly FTE single-player community use case (hipnotic / rogue / Painkeep / custom singleplayer mods). Adjacent to library content but distinct: catalog-distributed mod packs that install to a new gamedir. Out of scope for Managed Mode V1; could be a future Slipgate arc on top of the existing library + gamedir primitives once FTE support is mature.

---

## Drain instructions for fresh session

A fresh session (or continuation in the current session if context budget allows) should drain Pass 4 + Pass 5 (5.1 portion) ratifications into the canonical docs together. Pass 5.2 + 5.3 will be appended to this doc in a future session and drained in the same drain pass.

### Step 1 -- Load context

Read in this order:
1. This Pass 5 ratifications doc (the 5.1 portion is complete).
2. Pass 4 ratifications doc (`docs/superpowers/specs/2026-05-05-slipgate-managed-mode-pass4-ratifications.md`).
3. Pass 3 ratifications doc.
4. Architecture spec.
5. HANDOVER index entry "Slipgate Managed Mode pivot."
6. Memory: `project_slipgate_managed_mode_passes.md`.

### Step 2 -- Architecture spec body edits

Pass 4 + Pass 5 (5.1) edits are summarized above. Cross-section consistency to watch for:
- Pass 1 anchor item 1 amendment (per-role materialization mode) cascades to materializer description in Storage Layout + Primitive operations.
- Pass 3.2 amendment (drift detection) cascades to Manifest as Profile schema, fork primitive, clone modal docs.
- Pass 5 (5.1) full taxonomy replaces Pass 1 anchor item 5 placeholder; affects Engine integration section + Slipgate self-knowledge surface (ninth table).

### Step 3 -- Roadmap edits

- Pass 4 + Pass 5 (5.1) marked complete in brainstorm-progress block.
- Arc B: gains per-role materialization mode (configs copy, others hardlink); gains `last_synced_parent_manifest_sha` field; gains drift detection at fork launch.
- Arc C-minimal: clone modal grows the drift-import consumer (sixth).
- Arc E: gains the reload-cost registry as a watcher-adjacent surface (slipgate consults it at swap time).
- New: Class 1/2/3 swap implementation lands in Arc B (or its own sub-arc) using the registry + parser.
- Arc H: keep mod-browser as a long-term "out of scope; potential future arc" note.

### Step 4 -- HANDOVER edits

- Update "Slipgate Managed Mode pivot" entry: mark Pass 4 COMPLETE 2026-05-05 and Pass 5 PARTIAL 2026-05-05 (5.1 done; 5.2 + 5.3 pending).

### Step 5 -- Memory edits

- Update `project_slipgate_managed_mode_passes.md`: add Pass 4 row + Pass 5-partial row to the pass-by-pass table; add new locked principles (per-role materialization mode; hard-fork-with-drift-detection; per-role drift granularity; reload-cost registry as ninth self-knowledge table; verified Class 1/2/3 boundaries from ezQuake source-walk).

### Step 6 -- Verify and commit

- Read modified architecture spec end-to-end for cross-section consistency.
- Commit message:
  ```
  docs(slipgate): drain Managed Mode brainstorm Pass 4 + Pass 5 (5.1) -- per-role materialization, hard-fork-with-drift-detection, reload-cost registry, verified Class 1/2/3 from ezQuake source-walk
  ```
- Push to origin.

### Step 7 -- Continue Pass 5

After drain (or in parallel if context budget allows), append 5.2 (Launch UX) and 5.3 (Manifest backup UX) sections to this doc and continue the brainstorm.

---

## Provenance

This doc is the partial output of a Pass 5 brainstorm session on 2026-05-05. The 5.1 portion brainstormed extensively, generating substrate amendments back into Pass 1 + Pass 3.2 plus a new Pass 5 surface (reload-cost registry). Two subagent verification passes anchored the brainstorm: (1) ezQuake `cfg_save` write semantics confirming truncate-write through hardlinks corrupts blobs (`src/config_manager.c:826` etc.); (2) ezQuake runtime asset-reload semantics across `vid_restart` / `s_restart` / `gamedir` / `exec` / `cfg_load` / `fs_restart` / `skins` / `loadcharset` / `loadsky` / `hud_recalculate` / `vid_reload`. Both verifications grounded design decisions in primary-source evidence rather than speculation, per the operator's verification-discipline preference.

5.2 + 5.3 remain pending. Resumed-session work should append to this doc rather than starting a new bridge doc.
