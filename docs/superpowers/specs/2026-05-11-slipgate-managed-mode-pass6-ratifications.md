# Slipgate Managed Mode -- Brainstorm Pass 6 Ratifications

> **Captured 2026-05-11.** Bridge document for Pass 6 (Arc H pre-implementation -- catalog data shape). All sub-questions resolved; drained into architecture spec body in same session.
>
> **Companion docs:**
> - Vision: `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`
> - Architecture: `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`
> - Roadmap: `docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`
> - Pass 3 minutes: `docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md`
> - Pass 4 minutes: `docs/superpowers/specs/2026-05-05-slipgate-managed-mode-pass4-ratifications.md`
> - Pass 5 minutes: `docs/superpowers/specs/2026-05-05-slipgate-managed-mode-pass5-ratifications.md`
>
> **Pass 6 closed and drained.** Pass 6 collapsed several open questions: bundles ARE manifests (single primitive), metadata divergence configs-vs-assets dissolves into single-asset-vs-bundle (still single schema), library distribution reuses the same bundle-as-manifest primitive. The original Pass 3.1 "configs thin / assets rich" framing was wrong; reframed as single-schema-with-optional-fields.

---

## Pass 6 brainstorm shape

Pass 6 was scoped from Pass 3 carry-forwards: catalog data shape for Arc H pre-implementation. Three sub-questions named upfront; one new sub-question surfaced mid-pass and was inserted in dependency order.

- **6.1** Standalone-shareable-config dual lifecycle (catalog -> profile copy semantics) -- COMPLETE
- **6.2** Bundle lifecycle in slipgate-app (NEW; surfaced when 6.3 framing failed; inserted before 6.3) -- COMPLETE
- **6.3** Catalog metadata divergence configs-vs-assets -- COMPLETE
- **6.4** Library separate-catalog-distribution path -- COMPLETE (collapsed via bundles=manifests)

---

## 6.1 -- Standalone-shareable-config dual lifecycle

### 6.1a -- Lifecycle model: "you got a copy, it's yours" (flavor 1)

Three flavors considered:

- **(1) "You got a copy. It's yours now."** Catalog entry and downloaded copy diverge after download. No notify, no auto-pull.
- **(2) "You're subscribed."** Live link to the catalog's "latest"; user nudged on update.
- **(3) "You forked it."** Lineage tracked forever; user can see diff against catalog updates.

**Locked: flavor 1.** The catalog is a publishing surface, not a subscription surface. Reasoning: matches how QW assets are shared today (forum posts, Discord pastes); flavor 2/3 imply notify-and-merge UI we don't need at V1.

### 6.1b -- All configs get the Pass 2.5 history ring

Pass 2.5 locked 500-version history for `config.cfg`. Pass 6.1b extends to ALL configs: `spec.cfg`, `demoviewer.cfg`, weapon scripts, alias bundles, frag-message packs -- anything classified as a config role uses the same 500-deep ring.

500 is a CAP, not a target. Most configs (e.g., `demoviewer.cfg`) will accumulate 5-10 versions over a profile's lifetime; the cap costs nothing for cheap text files.

### 6.1c -- Delete UX is two-tier

Delete dialog offers:

- **"Delete this config"** -- active entry gone; history retained; blobs may stay around for GC.
- **"Delete this config AND its history"** -- explicit checkbox / second-tier choice for users who really want it gone.

Mirrors how IDEs and git handle "this file is gone but recoverable" vs "really gone." Default behavior is "active gone, history retained" (less destructive); the second option is opt-in.

### 6.1d -- No `added_via` field on the manifest entry; provenance is computed at display time

Original Pass 3.1 sketch suggested tagging downloaded files with `added_via: catalog-download:<asset-handle>`. **Rejected at 6.1d.** Cleaner approach:

- Catalog stores SHAs.
- The manifest entry just carries `{sha256, role, target_path}` (no provenance field).
- Provenance shows up in the **history view**: when slipgate displays the rollback list for a file, any version whose SHA matches a known catalog entry gets a UI label like "Milton's spec.cfg -- original state."
- Recognition happens at display time via a hub lookup (or local cache thereof), not stored on the file.

After edit -> new SHA becomes active; Milton's SHA drops to history (still labeled "original state" in rollback). No special handling at first edit.

This eliminates a catalog-handle abstraction (originally considered as `catalog-config:milton-spec-cfg/v3` -- decoupled handle from SHA). Catalog stores SHAs; lineage is computed.

### 6.1e -- Bundles ARE manifests (collapses tag-system proposal)

Operator spitballed a tag system: each shareable file has tags; "follow slackers-teamplay" subscribes to all files tagged that way. Pushed further:

**A bundle IS a manifest -- same primitive we already have for profiles, scoped smaller.**

- Profile manifest = everything to recreate your install.
- Bundle manifest = "these files go together" -- e.g., slackers-teamplay v1.0 = teamplay.cfg + 6 .loc files + skins.pak.

Catalog stores both as manifests. The difference is just what's in them.

Tags fall out for free: a manifest has a name + publisher, so "slackers-teamplay by vikpe" IS effectively the tag. Versioning falls out: v1.0 / v1.1 are two manifests with the same name+author and a publish-time ordering.

Why manifest beats tag system operationally:
- One list beats N tags. Bundle integrity is detectable -- if the manifest says 8 files, "incomplete" is a clear concept; with tags you can never tell if you have all of them.
- Mixed-content (config + locs + skins in one cohesive thing) is natural: same manifest entry shape works for any role.
- Single-primitive at the data layer; no separate tag store, no separate bundle object type.

### 6.1f -- Follow is post-hub-V1 (Hub-V2 territory)

Following a bundle / a user / a category is a real product axis. When an update lands, you'd get a manifest diff and decide per-file (keep mine / take theirs / merge per file -- reuses the Pass 5.1 drift-detection UX, just pointed at a catalog parent instead of a local one).

**But: V1 of the hub ships browse + download + publish only. Follow is V1+.**

Reason: at V1 there are ~10 users on the hub. "Follow" is the wrong feature when there's almost nothing to follow yet. Browse-and-grab is the demo-able flow that proves the catalog works end-to-end. Once content exists and people start saying "I wish I knew when Milton updates," ship follow.

This nests inside the larger truth: Arc H itself is V1+ for slipgate (V1 ships without any catalog hookup; V1 backup uses GitHub which is dumb storage, no catalog). Pass 6 is locking catalog data shape NOW so Arc H has its contracts when the hub starts taking shape.

---

## 6.2 -- Bundle lifecycle in slipgate-app (NEW sub-question)

This sub-question wasn't on the original Pass 3 carry-forward list. It surfaced when an attempt to anchor 6.3 in "imagine the hub.quake.world catalog page" failed -- the operator had no mental model for a hub UI yet (and reasonably so; the hub doesn't exist). Reframed: what's the lifecycle of a downloaded bundle inside slipgate-app? Once that's settled, the catalog metadata schema follows from "what does slipgate need to render the lifecycle?"

Inserted before 6.3 (dependency: 6.2 informs 6.3).

### 6.2a -- Bundle as first-class "downloaded pack" object (option 1 of 3)

Three options considered:

- **(1) Bundle as first-class "downloaded pack" object.** New surface in slipgate -- "Bundles" entry in the left domain list. Bundles sit here unapplied after download. User picks "apply this pack to profile X" -> the bundle's files distribute into their natural domains in profile X.
- **(2) Bundle as profile fragment / sub-profile.** Half-manifest; "merge into profile" reuses the existing merge primitive.
- **(3) Bundle as library item.** Extend bucket 7 (library) to include "asset packs" alongside maps/locs/mod-content.

**Locked: option 1.** Reasons: operator already reached for that mental model when describing a "downloaded assets history" view; update tracking is natural (the pack stays a coherent thing across apply events; v1.0 -> v1.1 makes sense); mixed content (cfg + loc + skins) doesn't fit cleanly into bucket 7 alone; bundles are user-visible objects worth their own UI surface, not buried in a manifest detail view.

### 6.2b -- Bundle inspection UI (operator's sketch)

The Bundles surface mirrors the rest of slipgate's browse pattern (left domain list + main content + right meta panel):

- **Left side:** "Bundles" entry expandable to list small-domain entries (one per downloaded bundle).
- **Click a bundle:** main body shows the bundle's contents browsable like a normal explorer view, scoped to that bundle's files.
- **Domain filter:** highlighting a domain within the expanded bundle filters main body to just files of that domain (configs / maps / skins / etc.). Optional UX -- overkill for small bundles (a couple of configs), useful for big ones.
- **Right meta panel:** clicking a file in the bundle shows per-file info, including "from bundle X v1.0."
- **SHA collision case:** if you already had the same file before downloading the bundle, the meta panel says "you already had this file; it's also in this bundle." Falls out of content addressing for free.
- **Per-asset-type detail views** (BSP parser output, image preview, sound waveform, etc.) are V1+ design work. Operator hasn't designed these yet.

### 6.2c -- Local download log (separate from manifest)

The "from bundle X v1.0" meta info means slipgate-app needs to know per-file lineage even after the bundle's files have been distributed into a profile. But Pass 6.1d locked "no `added_via` field on the manifest entry."

**Resolution:** local download log. Per-user, machine-local data. Records each download event:

- Bundle manifest sha (the bundle's identity)
- Bundle name + version
- Download timestamp
- File list (with role, target_path, sha for each)

Powers the "downloaded assets history" view. Doesn't pollute the shared manifest schema. Survives offline (it's local-only). Doesn't travel when the user exports a profile.

This preserves the 6.1d clean separation: manifest entries are universal/portable; lineage is per-user UI sugar layered on top.

### 6.2d -- Apply-bundle-to-profile distributes into natural domains

When the user applies a downloaded bundle to a profile, the bundle's files distribute into their natural domains in the target profile:

- Configs -> `user-asset:config` role -> profile manifest entries
- Maps -> `library:map` role -> library manifest entries (Pass 3.3 library-overrides handling applies)
- Locs -> `library:loc` role -> library manifest entries
- Skin paks -> `library:mod-content` or `user-asset:skin` per classifier
- Custom HUD images -> `user-asset:hud` per classifier

The clone-modal-as-V1-selector-primitive (Pass 3.2 + Pass 5.1 + Pass 5.3) handles the apply UI: user can opt into / out of individual files at apply time, same selector grammar as profile import / pre-publish review / pre-extraction overview / drift import / backup-restore.

Bundle identity persists in the local download log so v1.1 updates can re-trigger an apply (drift-prompt for any locally-edited files in the bundle's set).

---

## 6.3 -- Catalog metadata divergence (reframed)

### 6.3a -- Pass 3.1's "configs thin / assets rich" framing was wrong

Original sketch: configs are intrinsically thin at catalog (no author/license/curation across users); assets are rich (author, license, curated category, perceptual-hash neighbors, moderation history). Two metadata schemas at the catalog layer.

**Replaced.** With bundles=manifests (6.1e), the dichotomy isn't configs-vs-assets; it's **single-asset entries vs manifest-bundle entries.** A bundle can contain both configs AND maps and the slipgate UI handles them uniformly via per-file meta in the right panel.

### 6.3b -- Single schema (manifest entry shape) at all sizes

Catalog-side schema collapses to one thing: the manifest entry shape locked in 6.1.

**Per-file inside any catalog manifest:** sha + role + target_path. Optional: size.

**Per-manifest at publish:**

| Field | Mandatory at publish? | Notes |
|---|---|---|
| `name` | Yes | "untitled" is fine, but the field exists |
| `publisher` | Yes | The hub user account doing the upload |
| `author` | No | May differ from publisher; often blank in QW community |
| `description` | No | Often blank |
| `license` | No | Rarely filled in QW community; was originally listed as mandatory but operator pushed back -- license is hub-side optional, not slipgate-required |
| `version` + `changelog` | No | Relevant for bundles; for one-off single-asset publishes, often skipped |
| `engine_compat` | No | User-tagged, not auto-derived (see 6.3d) |

Slipgate's UI handles "no description / no author / no license / no engine tag" as the **common case**, not the edge case. Catalog page renders what's there and stays quiet about what isn't.

### 6.3c -- Rich asset metadata is derived/layered, not part of the schema

File-format-specific stuff -- BSP entity counts, image dimensions, sound waveform, perceptual hash, etc. -- is NOT in the manifest entry schema. It's derived data that can come from any of:

- **Local parser at view time.** Click a map; parser runs in background; details appear in right panel within ~1s. No API call.
- **Local cache after first parse.** Slipgate stores parsed details locally so repeat views are instant.
- **Pre-seeded knowledge bundle.** Popular assets ship with the app (e.g., top 250 maps with parsed details bundled at install). Reduces hub API load.
- **Hub API fetch.** When online, slipgate can pull richer metadata from hub (curated categories, user ratings, etc.).

Slipgate-app is free to mix-and-match these strategies and evolve them over time. **The catalog only ships the bedrock; everything else layers on top.**

This means we don't have to settle the local-parse-vs-API split at brainstorm time -- the decision can wait for empirical numbers (parser speed, hub API latency) at implementation. Catalog schema stays stable.

### 6.3d -- Engine compatibility is user-tagged, not auto-derived

Rejected: trying to auto-determine "this file works with ezQuake / FTE." There's no robust mechanical signal for most asset types.

Reframe: engine compat is a **user-tagged optional field**. A user marking "I use this with ezQuake" is the real signal. Slipgate UI surfaces these tags on catalog pages.

For configs specifically, the operator's planned **config converter** (cvar carry-over detection) is the future enrichment layer: it can analyze a config and suggest engine tags based on which cvars resolve in each engine's known cvar set (from qw-oracle Layer 1). V1+ enrichment.

### 6.3e -- Pre-seeded popular-asset details = new self-knowledge surface table

The "pre-seeded knowledge bundle" idea (6.3c) reuses Pass 3.5's slipgate self-knowledge surface pattern (bundled baselines + delta-sync; 9 tables now post-Pass 5).

A new table -- "popular-asset-parsed-details" or similar -- would land as the 10th entry in the self-knowledge surface taxonomy:
- Bundled baseline ships with slipgate (top N popular maps' BSP details, popular paks' file lists, etc.)
- Delta-sync from hub keeps it fresh
- User overrides at `<data-root>/overrides/<table>.json` per the existing pattern
- Same machinery as the other 9; not a new architectural concept

V1+ feature; not blocking V1.

---

## 6.4 -- Library separate-catalog-distribution path (collapsed via 6.1e)

Pass 3.3 already locked: "Library has separate catalog-distribution path (NOT bundled-into-profile-manifests). Hub-side analytics fall out of SHA frequency aggregates for free." The architecture spec's `Library has a separate catalog-distribution path` cross-link from `Cloud catalog interaction` reflects this.

Pass 6 carry-forward asked: "share my map collection / import this curated loc set as a catalog primitive distinct from share my profile."

**Collapsed.** With bundles=manifests (6.1e):

- "Share my map collection" = publish a bundle manifest containing `library:map` roles.
- "Import this curated loc set" = download a bundle manifest containing `library:loc` roles.

Same primitive. Specific roles. No separate library-distribution mechanism needed.

The Pass 3.3 lock still stands -- you don't ship library content as part of a profile export -- but the publish/download mechanism for library uses the same bundle-as-manifest primitive locked in 6.1e.

---

## Drain destinations

- **Architecture spec body** (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`):
  - `Cloud catalog interaction` section: amend with bundles=manifests collapse (6.1e), single-schema metadata (6.3b), rich-metadata-as-derived (6.3c), engine-compat-as-user-tag (6.3d), follow-is-V2 (6.1f), library-uses-same-primitive (6.4 collapse).
  - New subsection within `Cloud catalog interaction`: `Catalog data shape (Pass 6 ratified)` consolidating the locks.
  - Bucket 7 (User-library) section: cross-link the bundle-as-manifest collapse for library distribution.
  - Slipgate self-knowledge surface section: add note about 10th-table candidate (popular-asset-parsed-details) as Pass 6 carry-forward to V1+.
  - Add a new top-level section `Bundles in slipgate-app` (or fold into existing UX section): the first-class Bundles surface (6.2a-d) including local download log.
  - Open architectural questions: mark Q7 (configs-vs-assets divergence) as RESOLVED; mark Q9 (Arc H catalog data shape) as RESOLVED.

- **Pass 6 minutes doc** (this file): captured.

- **Parking doc** (`docs/superpowers/parking/2026-04-28-slipgate-managed-mode.md`): mark Pass 6 COMPLETE in status block; update "Recommended next-session sequence" to reflect arc-planner for Arc A as next move.

- **Memory** (`project_slipgate_managed_mode_passes.md`): add Pass 6 row to status table; update "Key locked principles" with Pass 6 additions; clear "next session sequence" to point at arc-planner for Arc A.

- **Roadmap** (`docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`): no immediate amendment needed -- Arc H summary already named the carry-forwards Pass 6 was scoped to settle. Arc H summary may benefit from a "Pass 6 ratified" marker pointing at the architecture spec for the contract details.

---

## Carry-forwards (V1+ refinements within Arc H)

- **Per-asset-type detail views** -- BSP parser, image preview, sound waveform, etc. UI design work, runs alongside Arc H V1.
- **Pre-seeded popular-asset details table** -- 10th self-knowledge surface table; ships when the bundled baseline grows enough to matter. V1+.
- **Config converter cvar carry-over detection as engine-tag enrichment** -- builds on planned config converter work; auto-suggests engine tags for configs. V1+.
- **Hub-side bundle-aware UX** -- once "follow" lands (Hub V2), the catalog needs subscription state per user + notification mechanism + diff display. V2 Arc H feature.
- **Local download log UX** -- the "downloaded bundles history" surface is a slipgate UI feature that needs design; data model is locked, render is open.
- **Bundle apply selector defaults** -- which files in a bundle should default-on / default-off at apply time? Tunable per-role; safe defaults vs explicit-opt-in. V1+ tuning.

---

## Pass 6 close

All four sub-questions resolved; bundles=manifests collapse simplified the surface significantly. Catalog data shape is locked at the schema layer; per-asset rich-metadata strategy stays open (deliberately, can wait for empirical data at implementation). Local download log clean separation preserves Pass 6.1d's "no provenance field on the shared manifest" lock without losing the user-facing lineage UX.

**Next move:** all brainstorm passes (1-6) are now COMPLETE. Hand off to arc-planner for Arc A (asset warehouse substrate) -- first implementation arc, smallest scope (1-2 days), good shape for validating the arc-planner / arc-orchestrator / arc-executor workflow before bigger arcs.
