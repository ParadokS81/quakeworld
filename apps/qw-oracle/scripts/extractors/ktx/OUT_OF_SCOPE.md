# KTX Extractor Out-of-Scope Findings

This file documents extraction decisions where canonical KTX (https://github.com/QW-Group/ktx) source surfaces something a phase-N handler chooses NOT to extract, with rationale. Future maintainers + arc-reviewer + cross-project audits all consult this when a "missing entity" question surfaces.

Format: per-item section with `## <token>`, `**Why skip:**`, `**Source:**` (file:line for the consumer / declaration), `**Related (if any):**` (Layer 3 concept-note candidate or sibling row).

The seven Phase-0 entries below capture pre-decided SKIPs from the design spec at `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` (Pass 1.1 buckets + Pass 4.3 / 4.4 deferrals). Subsequent phases (1-8) append entries here as their handlers run.

---

## k_motd1-9 / k_ml_0-5 (Bucket-3 indexed-family cvars)

**Why skip:** Sprintf-built at runtime via `va("k_motd%d", i)` and `snprintf(mapid, ..., "k_ml_%d", i)`. Operator-defined via configs; iterate by index. No `RegisterCvar*` registration site by design (Pass 1.1 Bucket 3 classification). Layer 1 cannot statically enumerate the family without a synthetic family-row design (deferred, low pressure).

**Source:**
- Consumer (k_motd*): `research/repos/ktx/src/motd.c:56` -- `cvar_string(va("k_motd%d", i))`.
- Consumer (k_ml_*): `research/repos/ktx/src/maps.c:566`, `:596`, `:612`, `:667` -- `snprintf(mapid, sizeof(mapid), "k_ml_%d", i)`.

**Related:** none. If a future arc decides to surface family templates, do it as one row per template name (not one per resolved index).

## k_666 / k_dm2mod / k_no_vote_break / k_specktalk (Truly orphaned drift cvars)

**Why skip:** Zero `RegisterCvar*` site in source; named only in `resources/example-configs/ktx/` files. Upstream config drift candidates (configs reference cvars that no longer exist or never did).

**Source:** none in source. Documented as upstream drift in the spec at Pass 1.1 cross-validation findings.

**Related:** consider QW-Group/ktx issue or PR on the example configs to drop these. Future contributor-handoff task; not arc-bound.

## lsType_t (post-match scoreboard formatting classifier)

**Why skip:** Derived classification, not a registry-shaped entity. Consumers compute the active `lsType_t` value at scoreboard-display time from active mode + cvar state; persisting per-value Layer 1 rows would not represent stable truth (Pass 4.3 deferral).

**Source:**
- Definition: `research/repos/ktx/include/g_local.h:202` -- `} lsType_t; // lastscores type`.
- Example consumers: `research/repos/ktx/src/commands.c:6746`, `:6802`, `:6988`, `:6989` (lastscores formatting paths).

**Related:** Layer 3 concept note on scoreboard interpretation could cite `lsType_t` semantics if such a note is later authored.

## gameType_t (game-type classifier enum)

**Why skip:** Subsumed into the `game_mode` catalog row's `props_json.game_type` field (Phase 3). Standalone Layer 1 rows would duplicate per-mode data already carried on game_mode (Pass 4.3 deferral).

**Source:**
- Definition: `research/repos/ktx/include/g_local.h:169` -- `} gameType_t;`.
- Example consumer: `research/repos/ktx/src/world.c:1553` -- `gameType_t km = k_mode = cvar("k_mode");`.

**Related:** Phase 3 emits `props_json.game_type` per `game_mode` row; `gameType_t` semantics live there.

## fb_spawn_t stdSpawnFunctions[] / itemSpawnFunctions[] (bot-subsystem dispatch tables)

**Why skip:** Pure path-finding-init registration. Tables map classnames to spawn-function pointers; entries are dispatch glue rather than gameplay behavior worth a Layer 1 entity (Pass 4.4 deferral).

**Source:**
- Struct definition: `research/repos/ktx/include/fb_globals.h:24` -- `} fb_spawn_t;`.
- `stdSpawnFunctions[]`: `research/repos/ktx/src/bot_loadmap.c:170`.
- `itemSpawnFunctions[]`: `research/repos/ktx/src/bot_items.c:938`.

**Related:** Layer 3 concept note on bot subsystem internals could cite the dispatch shape if interest emerges.

## stats_format_t file_formats[] (xml + json formatter dispatch)

**Why skip:** Pure infrastructure -- one entry per output format with handler-function pointer. No gameplay semantics; loader does not extract dispatch infrastructure (Pass 4.4 deferral).

**Source:**
- Struct definition: `research/repos/ktx/include/stats.h:51` -- `} stats_format_t;`.
- Array site: `research/repos/ktx/src/stats.c:10` -- `static stats_format_t file_formats[]`.

**Related:** `match_event` entity rows (Phase 6) carry the actual extralog event semantics; `file_formats[]` is rendering glue around them.

## fixed_maps_list[] (MVDSV-engine-compat workaround)

**Why skip:** All 38 names already exist as `qw.maps` rows. Re-extracting via KTX would double-count and add no new information (Pass 4.4 deferral).

**Source:** `research/repos/ktx/src/maps.c:24` -- `static char *fixed_maps_list[]` (38 entries; consumer at `:175` via `Map_AddMapToList`).

**Related:** `qw.maps` table rows are the authoritative source for these map names.
