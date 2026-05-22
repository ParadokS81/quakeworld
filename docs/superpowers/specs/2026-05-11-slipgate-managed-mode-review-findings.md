# Slipgate Managed Mode -- Design Review Findings (Consolidated)

> Reconciled 2026-05-11 from two parallel cold-eyes reviews (two-reviewer mode):
>
> - **Reviewer A (Opus 4.7)** -- full findings at `2026-05-11-slipgate-managed-mode-review-findings-opus.md`
> - **Reviewer B (Sonnet 4.6)** -- full findings at `2026-05-11-slipgate-managed-mode-review-findings-sonnet.md`
>
> Both reviewers ran independently against the same prompt. This doc de-duplicates overlapping findings, preserves unique items from each, and credits each finding by reviewer. Source docs remain available for the per-finding deep detail.

## Summary

Both reviewers converged on the same overall verdict: the substrate (content-addressed store + manifest-as-truth + per-role materialization + two-stage capture/swap) is structurally sound and internally consistent; six brainstorm passes did close most surface-area gaps. Neither reviewer flagged a finding that would invalidate the core architecture. The Critical findings are all either contract ambiguities at known seams or load-bearing-but-unverified items, addressable via spec amendment / mini-brainstorm / verification spike before locking in implementation.

The three largest risk clusters:

1. **Defense 1 ("never process during engine session") has multiple under-specified holes** -- shortcut-launched engines, mid-session server-pushed mod content arriving in the active tree, `cfg_save_onquit` timing, and slipgate-crash-during-session recovery. Both reviewers found different angles. The capture/swap pipeline's correctness depends on Defense 1 holding; spec must walk these failure modes explicitly.

2. **Light <-> Managed mode boundary is architecturally absent** (Opus, unique). Vision spec promises two modes; architecture spec designs only Managed. The mode-toggle has no specified storage; the Light-to-Managed gesture isn't designed; the reverse isn't reachable without destroying slipgate state. Missed in all 6 brainstorm passes because every pass was Managed-focused.

3. **Profile-sharing has two silent-failure modes** -- the stock-pak SHA verification gate breaks for users with legitimate-but-different stock paks (Opus C4); the GitHub backup architecture conflates per-file vs repo-total limits and will fail to push individual large blobs (Sonnet C-2). Both surface as "the user thinks they're protected/sharing but they aren't."

**Post-review addendum (C-7):** A substrate-level finding surfaced via a side-conversation after the two-reviewer pass: **SHA-256 as content-address hash is over-specified for slipgate's actual trust model; XXH3-128 is the right primitive.** Neither cold-eyes reviewer flagged this -- both read SHA-256 as locked. Flagged here because hash choice is one of the hardest things to change later (every blob filename, every manifest reference, every backup-format version).

**Tally:**
- **Critical:** 7 (1 from both, 4 Opus-unique, 1 Sonnet-unique, 1 post-review side-conversation)
- **Important:** 13 (4 from both, 6 Opus-unique, 3 Sonnet-unique)
- **Worth a closer look:** 10
- **Spec clarity:** 6 (2 from both, 2 Opus-unique, 2 Sonnet-unique)
- **Positive observations:** 8 (4 from both, 2 Opus-unique, 2 Sonnet-unique)

---

## Post-conversation status (2026-05-12)

> Two design discussions on 2026-05-12 between the operator and Claude settled the full Critical and Important tiers via conversation rather than separate Pass 7 brainstorm sessions. Each finding below carries a STATUS line; full settled outcomes are captured in the *Resolution log (2026-05-12 design discussions)* section near the end of this doc.

**Critical tier (status):**

- **C-1** Defense 1 failure modes — **SETTLED**. Engine-process scan + Defense 2 stable-mtime + startup reconciliation + clarified mod-cache promotion flow. **I-7** (mod-cache-vs-library precedence) and **I-2** (slipgate-closed reconciliation) fold into this resolution.
- **C-2** Light↔Managed mode boundary — **SETTLED**. Mode marker per data-root; Managed-only watcher; asset import in Light with hash-dedup; minimal Light state; mode demotion preserves warehouse + tree; OS-level read-only blobs.
- **C-3** Case 2 tracked-edit ambiguity — **SETTLED**. Auto-apply silently (reading 1); user's `cfg_save` is implicit-intent-declared.
- **C-4** Stock-pak SHA gate — **SETTLED**. Strip stock-pak SHAs from manifests entirely; per-asset SHA matching with origin tagging at first-launch; free-baseline install path filed as V1+ starter-kit exploration.
- **C-5** GitHub 100MB per-file — **SETTLED**. Explode-everything defuses the limit; per-asset origin tagging; engine doesn't require paks (verified by operator); pak-rebuild not needed; lossless-export targets byte-identical pak0/pak1 rebuild from warehouse.
- **C-6** Manifest "unfiltered snapshot" wording — **PENDING SPEC AMENDMENT**. Mechanical rewrite, no design decision required.
- **C-7** SHA-256 → XXH3-128 — **PENDING SPEC AMENDMENT**. Substantively settled in operator-vikpe side-conversation; amendment touches every `sha256` reference site.
- **C-8** Engine homedir as second data-root — **SETTLED**. ezQuake on Windows mounts `~/Documents/ezQuake/` at highest lookup precedence; data-root model extends to observe it. Scan-and-import to warehouse, no materialize-back; `-nohome` injection for slipgate-launched runs; one-time migration of homedir-resident configs at take-over. Surfaced during this session via Layer 1 path-rule verification.

**Important tier (status):**

- **I-2** (slipgate-closed reconciliation) and **I-7** (mod-cache-vs-library precedence) — folded into C-1's resolution.
- **I-11** (server-pushed gamedir bandwidth) — folded into C-1's mod-cache materialization story.
- **I-3** Hub-moderation latency UX — **SETTLED**. Two-reality framing (Reality 1 = today, no hub, manifest+local-asset-import; Reality 2 = V1+ hub-as-delivery + moderation UX). V1 ships hub-vetted starter profiles + peer-share bundles + manifest-only-import-with-greyed-out-fillable. P2P pin-code transfer captured as V1+ roadmap item.
- **I-5** `.pending-swap.json` write integrity — **SETTLED**. Atomic-replace on every write (same discipline as `manifest.json`). Perf concern was theoretical; not real for slipgate's actual write cadence.
- **I-6** `profile-roles.json` corruption recovery — **SETTLED**. Atomic write + `profile-roles-history.json` peer artifact + three-step recovery (parse → history-replay → safe-default). Discipline lifted verbatim from `manifest.json`.
- **I-8** Multi-engine quakedir policy — **SETTLED**. Single merged profile per data-root; engine compartments via role tags; manager filters per-engine view; runtime engine selection at launch; clone-modal-at-import lets recipients filter by bucket; user-initiated extract-subset for bespoke per-engine setups.
- **I-9** Primary-delete prompt copy — **PENDING SPEC AMENDMENT**. Mechanical wording fix; resolution wording locked.
- **I-10** Stale lockfile recovery — **SETTLED**. Simpler than originally framed. Tauri `single_instance` plugin handles same-machine case; documented single-mount contract handles cross-machine; atomic-write discipline (I-5/I-6/manifest.json) handles crash recovery; optional `running.json` diagnostic file. W-9 becomes moot.
- **I-12** Offline role validation strictness — **SETTLED**. Soft-fallthrough: unknown role → `unclassified` with Manager warning badge; manifests import without blocking; next registry sync self-heals. Generalizes to a substrate principle (see metadata-enrichment principle below).
- **I-13** Publish UX V1 surface — **PENDING SPEC AMENDMENT**. Spec amendment to clarify V1 ships without publish UX; publish contract is locked; publish gesture + pre-publish-review modal land V1+ alongside Arc H.

**New artifacts captured this session:**

- **W-11** Import-classification handler UX — new Worth-a-closer-look. Three-tier classifier (SHA-match → source-evidence-match from extractor data → quarantine residue). Lifts Layer 1 asset-loader-sites + reserved-subdirs as evidence base.
- **Substrate principle: metadata enrichment is delta-sync-driven, not user-driven.** Generalizes I-12's self-healing pattern. Blob identity (XXH3-128) is immutable; metadata (role, author, provenance, bundle, license) grows via catalog sync.
- **V1+ roadmap items consolidated:** P2P pin-code transfer (Reality-2 enhancement to peer-share), free-baseline install (per C-4 resolution), pak-builder script (per C-5 resolution).

**Net:** all 7 (now 8) Criticals and all 13 Important findings settled. Next concrete actions are the spec amendment cluster (C-1 through C-8 + I-9 + I-13 + W-11 capture) and the I-1/I-4 spikes.

---

## Critical findings (must address before arc-planner)

### C-1. Defense 1 has multiple under-specified failure modes
**Source:** both reviewers (Opus C2 + Sonnet C-1; convergent from different angles)
**STATUS (2026-05-12):** SETTLED in design discussion. Resolution: engine-process scan replaces handle-based detection; Defense 2 stable-mtime catches in-flush timing; startup reconciliation pass handles slipgate-crash and slipgate-closed cases; spec amendment clarifies mod-cache as an index (not a physical move destination). Folds in I-2 and I-7. Full details in Resolution log below.

The watcher's Defense 1 invariant -- "never process during an engine session" -- has at least four distinct holes the spec doesn't address:

1. **Shortcut-launched engines** (Sonnet). User launches engine via OS shortcut (`architecture.md:1869` confirms this is supported); slipgate has no process handle and cannot enforce Defense 1. Stage 2's idle-nudge can fire during an active engine session, hashing a partially-written config.
2. **Server-pushed mid-session writes** (Opus). The "Hardlinked back into the active profile's tree" property at `:480` is the *result* of materialization, not the source. Engine writes new map/sound/model files to the active tree; spec reads as if mod-cache is where the file arrives, but the actual flow is engine-write -> active tree -> Stage 2 -> quarantine. Not spelled out.
3. **`cfg_save_onquit` timing** (Opus). Spec verifies ezQuake's `cfg_save_onquit` at `:227`, but the sequencing of "engine process exits -> Stage 2 fires -> `cfg_save_onquit` still mid-flush" is not connected through Defense 2 (stable-mtime).
4. **Slipgate-crash-during-session** (Opus). Watcher writes to `.pending-swap.json`; slipgate crashes; engine keeps writing files; on re-launch there are tree changes the watcher never observed. Recovery is unspecified.

**Why it matters:** The entire capture/swap pipeline safety model rests on Defense 1 holding. Each of these failure modes can produce silent data divergence between tree and manifest -- exactly the "always a bug" state the design pledges to never reach. Per-session mod-cache promotion via server-push is the *whole point* of bucket 4, not an edge case.

**Resolution:** Spec amendment that walks each failure mode through Defense 2 and the recovery path. For shortcut-launched: either disable watcher on shortcut sessions, or scan for engine processes by PID/name before each Stage 2 trigger. For slipgate-crash: on re-launch, replay `.pending-swap.json` and reconcile against current tree state. For `cfg_save_onquit`: explicit sequencing note that stable-mtime catches the in-flush window. For mid-session mod content: clarify that mod-cache *materialization* (hardlink) is post-classification, not pre-engine-write.

**Spec locations:** `architecture.md:471-484`, `:806-807`, `:815`, `:832-834`, `:1018-1021`, `:1869`.

---

### C-2. Light <-> Managed mode transition has no architectural coverage
**Source:** Opus (unique; Sonnet did not flag)
**STATUS (2026-05-12):** SETTLED in design discussion. Resolution: mode lives on a per-data-root marker; V1 default = Light; watcher is Managed-only; asset import works in Light with on-demand hash-dedup; mode demotion preserves warehouse + manifests + tree-with-hardlinks; OS-level read-only on warehouse blobs prevents in-place corruption; re-promote walks tree for drift detection; updater is the only mode-split feature. Full details in Resolution log below.

Vision spec defines two product modes (Light, Managed) at `vision.md:104-141`, with "Mode is a single profile field" at line 136. Architecture spec has zero design for the boundary:

- **Mode storage:** "Mode is a single profile field" is mechanically impossible by the architecture's own model -- Light-mode users don't have profiles in slipgate's profile system. Either mode is global (slipgate-app-level setting) or Managed profiles all carry `mode: "managed"` and Light is profile-system-absent. Spec doesn't say which.
- **Light-to-Managed gesture:** First-launch onboarding (`:1036-1050`) covers three branches -- install fresh, restore from backup, skip into tool mode. None is "user has been running Light, decide to opt into Managed today."
- **Managed-to-Light gesture:** Vision says migration is "reversible: Managed -> export -> uninstall -> original-shape dir." But uninstall is destructive (drops all manifest history, all forks, all checkpoints). No primitive for "switch back to Light, keep the slipgate install, keep the warehouse around for if I come back."
- **Cross-mode features:** Updater + analyzer features are used by both modes. Pass 3.5b shipped binary swapping as part of the Managed substrate. Does the updater behave differently across modes? Spec doesn't say.

**Why it matters:** Vision's primary product-positioning statement is "Two product modes, both supported indefinitely." If V1 ships with no Light↔Managed boundary design, V1 is either Managed-only (vision broken) or has an undefined Light interaction surface (footgun risk). Missed in 6 brainstorm passes because every pass was Managed-mode-focused -- the brainstormers' anchored expectations were the cold-eyes review's signal here.

**Resolution (recommended):** Short Pass 7 mini-brainstorm scoped specifically to Light↔Managed boundary -- mode storage, transition gestures both directions, cross-mode feature behavior, V1 mode-default. Alternative (less likely correct): drop "two product modes" from vision, reframe as "a Managed-mode app that respects existing dirs until migrated."

**Spec locations:** `vision.md:104-141`, `:136`; `architecture.md:1036-1050`; architecture spec is otherwise silent on Light mode.

---

### C-3. Case 2 (tracked + real edit) dispatch is the highest-frequency user gesture, and the spec doesn't say what happens
**Source:** Opus (unique)
**STATUS (2026-05-12):** SETTLED in design discussion. Resolution: reading 1 (auto-apply silently). The user's `cfg_save` invocation is implicit-intent-declared; no slipgate confirmation required. `Discard` action only applies to Case 3 (untracked-new-file) entries. Generalizes to a principle: any engine-mediated write through a known-good role is implicit-intent-declared. Full details in Resolution log below.

The watcher's five-case dispatch routes both "user saved their config in-game" and "external editor write" through Case 2 -> cleanup notification. The cleanup notification UX example (`:885-905`) shows map downloads, partial mods, unrecognized files -- but no example of a tracked config edit. The "per-entry actions" list (`:905`) includes `Discard`, which is dangerous for a tracked edit: discarding would leave the manifest pointing at the old SHA while the tree has the new bytes, putting tree-vs-manifest into "always a bug" state.

Three plausible readings of the spec, each producing different V1 behavior:

1. **Auto-apply for tracked edits in known-good roles** -- matches Pass 2.5's living-file principle and the implicit-version-history language at `:1175-1176`.
2. **Prompt the user every save** ("config.cfg changed -- accept new version?") -- friction-heavy; contradicts living-file model.
3. **Auto-apply but surface in cleanup notification as a one-line "X tracked edits captured" summary**, dismissible.

**Why it matters:** Every config save touches this. Reading 2 destroys the UX; reading 1 leaves `Discard`'s semantics undefined; reading 3 is unstated. Arc E (watcher) and Arc G (history) both depend on which is true.

**Resolution:** Spec amendment naming the default explicitly. Opus recommends reading 1 (auto-apply for tracked edits in known-good roles; surface only if integrity check fails). `Discard` on a tracked edit needs explicit semantics ("restore prior tree-resident SHA from history; tree drifts back to previous version").

**Spec locations:** `architecture.md:787-789`, `:885-905`, `:905`, `:1170-1196`.

---

### C-4. Stock-pak SHA verification gate is a silent sharing-killer
**Source:** Opus (unique)
**STATUS (2026-05-12):** SETTLED in design discussion. Resolution: strip stock-pak SHAs from manifests entirely; verification happens at first-launch only, via per-asset SHA matching against the known-good registry; off-registry-but-legit paks take a "user-provided, unverified" path with non-accusatory messaging; free-baseline install (nQuake-equivalent starter kit) is filed as a V1+ exploration arc, not V1 scope. Full details in Resolution log below.

The known-good stock pak SHA list (`:961-969`) covers vanilla 1996 Quake registered + Steam re-release + GOG + nQuake bundled QW. When a recipient imports a published manifest, their local stock pak SHAs are checked against the registry; mismatch -> import refused with "obtain stock paks legitimately" wording.

Failure mode: **two legitimate users with two legitimate-but-different stock pak SHAs cannot share profiles.** Users with 1997 floppy redistributions, 2010 patched re-releases, 2024 Steam re-release variants, or one of nQuake's seven historical bundle versions all have legitimately-different bytes. The catalog's coverage is unverified (L1-delta stock asset catalog is V1+ qw-oracle scope per review-prep section 2) -- V1's known-good list could realistically be 3-5 SHAs, not the 18+ the example UI at `:1743` shows. Failure is silent to the publisher; error wording reads as an accusation.

**Why it matters:** Profile sharing is one of the load-bearing user-facing values (Vision scenarios 3 + 5). If a meaningful fraction of users have legitimate-but-uncataloged stock paks, the share UX silently breaks at V1.

**Resolution (recommended):** Decouple stock-pak verification from profile import. Verify at first-launch (user's own stock paks against registry); after that, profile imports trust local stock paks unconditionally. Preserves the copyright gate where it matters (you must have *some* legitimate copy to play) without re-enforcing on every share. Alternative: keep gate but reword error UX to not read as "you pirated your game."

**Spec locations:** `architecture.md:961-969`, `:1339-1342`, `:1693`, `:1743`.

---

### C-5. GitHub backup conflates per-file limit with repo-total limit
**Source:** Sonnet (unique)
**STATUS (2026-05-12):** SETTLED in design discussion. Resolution: the explode-everything storage model (warehouse holds individual exploded assets, not monolithic paks) defuses the 100MB per-file limit naturally — individual exploded assets are KB-MB scale. Engine doesn't require paks (operator-verified: ezQuake works with loose files in id1/); no pak-rebuild step at materialization needed. Per-asset origin tagging (`role` + `origin` fields) categorizes content as pak0 / pak1 / custom for the Manager browser. Lossless-export targets byte-identical pak0.pak / pak1.pak rebuild from warehouse blobs. Pre-push validation stays as a safety net for the rare oversized blob. Full details in Resolution log below.

`architecture.md:1602`: "~100 MB Quake dir (operator's measured ~130 MB textures dir alone) fits in a single GitHub repo without LFS." This conflates two GitHub limits. GitHub enforces a **100 MB per-file limit** (hard; push is refused) separate from any repo total. A single large blob -- big pak file, texture-heavy `.bsp`, custom pak in 50-200 MB range -- exceeds the per-file limit and silently fails to push. The spec's ">1 GB users fall back to local-external" guard checks repo-total, not per-file.

**Why it matters:** A backup that silently fails or requires LFS is worse than no backup -- the user believes they're protected. Lossless-export pledge + backup architecture are the two recovery paths; if backup silently fails, the user may have no cloud safety net.

**Resolution:** (a) Pre-push validation that scans all blob files for per-file threshold and fails fast with clear messaging ("N blobs exceed GitHub's 100 MB per-file limit"). (b) Or spec explicitly adds GitHub LFS as a V1 option for over-limit blobs. Either way the spec must acknowledge the per-file limit.

**Spec locations:** `architecture.md:1602`, `:1648`.

---

### C-6. Manifest "unfiltered snapshot" wording directly contradicts publish rule three sentences later
**Source:** Opus (unique)
**STATUS (2026-05-12):** PENDING SPEC AMENDMENT. Mechanical one-line rewrite; no design decision required. The proposed resolution wording in this finding can be applied verbatim.

`architecture.md:48-60`: line 48 says "**Manifest is a complete unfiltered snapshot.** When a profile is published or shared, the manifest captures the full state of the user's quakedir." Line 60 says "**Unclassified files never reach a manifest.** User-content (demos / screenshots / logs) never reaches a manifest. Library content [...] lives in the library manifest, not any profile manifest. Private files never reach a manifest."

These contradict. The actual model (publish rule at `:53-58`) is that the manifest is "complete" in the sense of "every recognized-role profile-content entry," not "every byte in the quakedir." A cold reader reading just the first paragraph reasonably believes the manifest *is* the full quakedir state -- with user-facing consequences ("will my private notes get shared?").

**Why it matters:** Small but the kind of phrasing that survives into UI copy and user docs. "Share your full setup" the marketing line vs "your private notes and demos are explicitly excluded" the actual behavior. Survived the hygiene passes because both clauses individually make sense to the writer.

**Resolution:** Rewrite line 48 to "**Manifest is a complete snapshot of recognized profile content.** When a profile is published or shared, the manifest captures every recognized-role profile-content entry -- not user-content (demos/screenshots/logs), not library content, not private files, not unclassified files. See the publish rule below for the exact filter." Propagate to vision spec.

**Spec locations:** `architecture.md:48-60`.

---

### C-7. SHA-256 as content-address hash is over-specified for the threat model; XXH3-128 is the right primitive
**Source:** post-review side-conversation (operator + vikpe pushback). Both cold-eyes reviewers read SHA-256 as locked and did not surface this.
**STATUS (2026-05-12):** PENDING SPEC AMENDMENT. Substantively settled. Amendment is a mechanical sweep touching every `sha256` reference site across the architecture spec.

Spec uses SHA-256 as the content-address hash for every blob (every entry's `sha256` field, blob filenames at `blobs/<sha[:2]>/<sha>.bin`, manifest references, parent-manifest-sha fingerprints, backup format). The choice is *defensible* on "cryptographic tamper detection" grounds, but slipgate's actual trust model doesn't rely on cryptographic hash properties:

- **Hub-to-user trust:** mediated by TLS, not by content hash. MITM doesn't substitute blobs in flight because the transport is encrypted.
- **Publisher-to-hub trust:** mediated by hub moderation, not by content hash. Adversarial publishers are caught by review, not by hash collision resistance.
- **Theoretically-adversarial case:** stock-pak verification (bypassing copyright gating) -- effort vs payoff is so mismatched no one runs that attack.

The content hash is a **dedup key**, not a signature. SHA-256-as-insurance-for-hypothetical-Arc-H-trust is the "design for hypothetical future requirements" anti-pattern CLAUDE.md explicitly warns against.

**XXH3-128 is the right primitive** for slipgate's actual surface:

- ~30 GB/s throughput (vs SHA-256's ~1 GB/s without SHA-NI, ~2 GB/s with). 128-bit and 64-bit halves are computed in the same parallel pass per xxhash docs -- 128-bit is "free" once you've paid for the streaming pass.
- XXH3-64 alone hits birthday collisions at ~2^32 (~4B files), too tight for hub-scale CAS across publishers/years. XXH3-128 is ~2^64 -- practically unreachable for the hub's lifetime.
- Storage cost: 8 extra bytes per hash entry vs XXH3-64 -- negligible. ~16 bytes *less* per entry vs SHA-256.
- One CAS collision = silent correctness bug (two files map to the same address; second write overwrites first). XXH3-128 makes this practically unreachable.

**Bonus dividend** (vikpe's actual design argument): migration scan and backup re-verify see a real perf-and-simplicity win. Small-file overhead is where XXH3 actually beats SHA-NI hardest; large-file streaming closes the gap but XXH3 still wins. Some spec "fast path" patterns simplify (though many of those exist for Defense 1 correctness, not hash perf -- so the simplification dividend is real but narrower than it first appears).

**Why it matters:** Hash choice is one of the hardest things to change later. Every blob filename uses the hash; every manifest entry references it; backup format versions are pinned to it; the catalog data shape carries `sha256` per file. Both cold-eyes reviewers read this as locked and did not surface -- the finding came from a parallel side-conversation channel. Settling now is high-leverage; settling later means a migration.

**Resolution:** Pass 7 mini-brainstorm or spec amendment swapping SHA-256 -> XXH3-128 across the substrate. Field-name migration (`sha256` -> `content_address` or `xxh3_128`), blob-filename format (`blobs/<addr[:2]>/<addr>.bin` shape preserved, just shorter), backup-format version bump, parent-manifest-sha rename. Could combine with the Light↔Managed Pass 7 -- both are substrate-level pre-arc-planner decisions.

**Spec locations:** `architecture.md:3`, `:22`, `:34`, `:46`, `:77-89` (manifest schema), `:104` (parent_manifest_sha fingerprint), `:117` (required fields), `:425` (stock pak hashes), `:592-594` (`register` primitive), `:623-625` (trust-existing-tree fast path), `:930-957` (SHA256 governance section), `:964` (stock pak hashing), `:1456` (catalog per-file shape), `:1503` (`{sha256, role, target_path}` shape), `:1743` (known-good stock pak SHAs UI), `:1797`, `:1855`. The SHA256 governance section name itself becomes the most visible rename.

---

### C-8. Engine homedir is a second read/write location for ezQuake-on-Windows; data-root model must extend to cover it
**Source:** 2026-05-12 second design discussion (surfaced via Layer 1 path-rule verification — operator was unaware their Windows ezQuake install had a homedir at `~/Documents/ezQuake/`). Both cold-eyes reviewers focused on basedir behavior and did not flag this.
**STATUS (2026-05-12):** SETTLED in design discussion. Resolution: data-root model extends to observe homedir as a second location; scan-and-import to warehouse, no materialize-back; `-nohome` injection for slipgate-launched runs; one-time migration of homedir-resident configs at take-over. Full details in Resolution log below.

ezQuake on Windows mounts FOUR base directories per source-walked path rules (`fs.c:775`, `FS_InitFilesystemEx`): `id1/` → `ezquake/` → `qw/` → home directory (`~/Documents/ezQuake/` on Windows, `~/.ezquake/` on POSIX). Effective lookup order (LIFO): **homedir > qw > ezquake > id1**. So the homedir sits at the TOP of the lookup stack — any file there overrides basedir's equivalent.

FTE's base stack is just `id1/ qw/ *fte/` — no homedir convention. So this is ezQuake-Windows-specific.

The homedir is where ezQuake writes:
- **Always (engine-hardcoded):** `qw/save/*.sav` (single-player saves), `servers_data` (server browser cache, ~750KB binary), `temp/` (runtime ephemera).
- **Configurable via `cfg_use_home 1`:** configs land at `<homedir>/<gamedir>/<name>` instead of basedir's `<basedir>/ezquake/configs/<name>`. Default is `cfg_use_home 0` (basedir-side configs); homedir-side configs are opt-in.

**Why it matters:** slipgate's data-root model assumes one watched location per managed dir, but ezQuake-on-Windows has TWO read locations. If a user has homedir-side content, slipgate's basedir-only watcher misses it. Specifically: saves get auto-written to homedir by default, so the durable user state slipgate is supposed to manage isn't even being captured. The operator was personally unaware they had a homedir at all — strong signal that many users have homedir state they don't know about.

**Why both reviewers missed:** both ran cold-eyes against basedir-focused architecture; the homedir is referenced as a path-rule fact at `architecture.md:1869` but not connected to the data-root model anywhere. The finding came from operator-Claude path-rule verification this session.

**Resolution:** see Resolution log below.

**Spec locations:** `architecture.md:1869` (homedir referenced as a fact, not connected to data-root); also `<no current model>` for the data-root + homedir relationship.

---

## Important findings (worth addressing before V1 ships, but not blocking arc-planner)

### I-1. FTE config write semantics are unverified
**Source:** both reviewers (Opus I4 + Sonnet I-1; convergent)

Per-role materialization mode (copy for configs, hardlink for everything else) is justified by ezQuake's `cfg_save` truncate-write behavior (source-walked at `config_manager.c:826` in Pass 5.1). FTE's equivalent (`Cmd_SaveConfig_f` / `WriteConfig_f` or similar in fteqw `engine/client/cl_main.c` or `engine/common/cmd.c`) is not verified. If FTE writes configs differently (write-temp + atomic-rename, like git) or writes to non-config files via truncate-write (HUD state, skins cache), per-role mode is either over-conservative or under-conservative for FTE. QWFWD/MVDSV are server-side and don't materialize, so the gap is FTE-only.

**Why it matters:** FTE is a V1-supported engine. Per-role copy mode is one of the loudest substrate decisions.

**Resolution:** Subagent spike: source-walk FTE's config save code. Half-day. Could happen in parallel with Arc A scoping. Both reviewers flagged this as the smallest, lowest-cost spike to land before arc-planner.

**Spec locations:** `architecture.md:218-232`; review-prep item 3.

---

### I-2. Watcher cannot run when slipgate is closed -- engine writes go unobserved
**Source:** both reviewers (Opus I6 + Sonnet I-7; convergent)

Watcher is foreground-only for V1 (`architecture.md:773`). Scenario 5 (`:1023-1028`) implies engine can be running when slipgate closes. While slipgate is closed, engine writes to active tree (configs, mid-session downloads, `cfg_save_onquit`) without any watcher. On slipgate re-launch, there's a tree-vs-manifest diff for every file the engine touched; spec doesn't specify how this is reconciled. The fast-path trust-existing-tree check at `:623` runs at rematerialization time, but rematerialization isn't necessarily triggered on app-open.

**Why it matters:** Slipgate-in-tray-only is the natural Managed-mode resting state. Users routinely close slipgate while engine runs (tournament/match play). The "I haven't been watching, scan now" reconciliation pass is real V1 behavior.

**Resolution:** Spec amendment: on slipgate launch, before clearing `.pending-swap.json`, compare current tree state against active manifest. Any tracked file with different mtime/size gets added to `.pending-swap.json` as a Case 2 entry. Normal Stage 2 handles it.

**Spec locations:** `architecture.md:773`, `:994`, `:1023-1028`.

---

### I-3. Hub-moderation latency UX is unbounded with no recovery path
**Source:** both reviewers (Opus I1 + Sonnet I-5; convergent, different emphasis)
**STATUS (2026-05-12):** SETTLED in design discussion. Resolution: two-reality framing (Reality 1 = today, no hub, manifest + local-asset-import-with-greyed-out-fillable; Reality 2 = V1+ hub-as-delivery + moderation UX + "Notify me" + sender-never-publishes recovery). V1 import surface = hub-vetted starter profiles + peer-share bundles + standalone manifests; greyed-out entries fill via local asset-import with SHA auto-match. P2P pin-code transfer captured as V1+ roadmap item. Full details in Resolution log below.

`architecture.md:1417-1419`: "greyed-out until validated" UX for hub-unknown SHAs in shared manifests. Spec doesn't specify moderation latency budget, what "notify me when this becomes available" means in practice (push notification? in-app badge? polling?), or what happens if moderation rejects the asset. Sonnet adds: for assets the sender never publishes to hub (custom map made and never shared), recipient sees greyed-out entries indefinitely with no path -- the "share before publishing" case silently fails.

**Why it matters:** The published-manifest-unimportable-until-moderation case interacts with the operator's V1 sample-profile story (vision `:254`) -- starter profiles like "paradoks-default" must be fully pre-moderated and cataloged before launch. Hub V1 deployment-sequencing concern, not just UX concern.

**Resolution:** (a) Document assumed moderation-latency budget for V1 (e.g., "manual review within 48h"). (b) Spec UX for max wait before "Notify me" converts to "This asset is unavailable. [Request from sender / remove from profile]." (c) Carry to Arc H planning -- Hub V1 SLA informs UX copy.

**Spec locations:** `architecture.md:1417-1419`, `:1421-1423`.

---

### I-4. Class 1 delta-script `exec` path resolution is unverified
**Source:** Sonnet (unique; flagged in both Sonnet's I and W tiers)

`architecture.md:1108`: Class 1 swap "writes a temp file, sends `exec <path>` via mailslot." ezQuake's `exec` resolves paths relative to engine search path (relative to `-basedir`). A temp file in OS temp dir (e.g., `C:\Users\user\AppData\Local\Temp\delta-12345.cfg`) is outside engine search path; `exec` will silently fail (command not found, no error reported, no cvars applied). Spec verifies `exec` is additive at `:1078` but doesn't specify or verify where the delta script is written.

**Why it matters:** Class 1 swaps are the zero-restart config push feature that makes ezQuake profile-switching seamless. If exec path is broken, all Class 1 swaps silently degrade to needing a full manual config reload -- feature appears to work but does nothing.

**Resolution:** Single-file source-walk of `Cmd_Exec_f` in `src/cmd.c` to confirm whether absolute paths are accepted, or only search-path-relative. 30-min spike. If search-path-relative only: spec must document that delta-script is written inside the profile tree at a known path (e.g., `qw/.slipgate-swap.cfg`) and cleaned up after delivery. Needed before Arc B/E.

**Spec locations:** `architecture.md:1108`, `:1128`.

---

### I-5. `.pending-swap.json` write integrity is underspecified
**Source:** Sonnet (unique)
**STATUS (2026-05-12):** SETTLED in design discussion. Resolution: atomic-replace pattern (tmp + fsync + rename) on every write, same discipline as `manifest.json`. Perf concern was theoretical; actual write cadence (handful of writes per typical session; ~50 in spike cases like server-pushed gamedir) handles atomic-replace well under a second on modern hardware. Length-prefixed append-only log rejected as over-engineered for slipgate's write profile. Full details in Resolution log below.

`architecture.md:108` specifies atomic write for `manifest.json` (tmp -> fsync -> atomic rename). Spec doesn't specify how `.pending-swap.json` writes are handled. It's described as a notebook the watcher "appends to" (`:812`); append-to-a-file is not atomic on Windows (no O_APPEND equivalent that serializes across processes; NTFS doesn't guarantee append atomicity). Slipgate crash mid-append could corrupt the file. On next launch, slipgate either silently loses pending entries or blocks startup.

**Why it matters:** `.pending-swap.json` is the durable record of what needs processing. Loss -> user loses pending file change records -> config update silently dropped.

**Resolution:** Spec should state strategy: (a) atomic-replace on every watcher event (perf concern at high frequency), (b) structured append with per-entry length prefix so partial-entry corruption is detectable, or (c) explicit tolerance: corrupt-parse -> log warning, discard corrupt entries, recover partial state. Arc E needs a chosen strategy.

**Spec locations:** `architecture.md:108`, `:273`, `:811`.

---

### I-6. profile-roles.json corruption recovery not specified
**Source:** Sonnet (unique)
**STATUS (2026-05-12):** SETTLED in design discussion. Resolution: atomic write (same tmp + fsync + rename as `manifest.json`) + peer artifact `profile-roles-history.json` (append-only log, 50-entry rotation) + three-step recovery on launch (parse `profile-roles.json` → walk history backward for most recent valid entry → safe default = first-profile-found-in-profiles-dir if both corrupt). History retention size and safe-default behavior tunable at Arc B implementation + perf testing. Full details in Resolution log below.

`manifest.json` has documented corruption recovery (`:108-113`: try history -> hash-walk-tree rebuild -> surface error). `<data-root>/profile-roles.json` (which holds `primary_profile_id` and `active_profile_id`) has no recovery spec. It's written on every profile switch and every "Make this primary" action -- high-frequency. If corrupted (truncated write, disk error), slipgate doesn't know which profile is primary or active.

**Why it matters:** Obscure failure mode produces unrecoverable state (all profiles exist in warehouse but slipgate doesn't know which is active or primary).

**Resolution:** (a) Specify atomic write for `profile-roles.json` (same tmp -> rename as manifest). (b) Specify recovery: on corrupt load, walk `profile-roles-history.json` for most recent valid state; if history also corrupt, default to "first profile found in `profiles/` is primary and active, with warning." Amend before Arc B.

**Spec locations:** `architecture.md:239`, `:274-275`, `:108`.

---

### I-7. Disk-full handling during materialization / migration is silently undefined
**Source:** Opus (unique)

Searched architecture for "disk full" / "ENOSPC" / "out of space" -- 0 hits. Atomic-swap protects against half-materialized trees, but spec doesn't address: migration extraction halfway through copying 130MB of textures into blobs hits ENOSPC (partial blob copies leak as zero-refcount until GC?); `link()` rarely fails on ENOSPC but if the source was a corrupted engine write (truncated), stable-mtime should catch it but spec doesn't say so; GitHub backup pushing 150MB to 100MB-free disk.

**Why it matters:** Edge case that produces "slipgate is broken" support tickets without actionable user feedback.

**Resolution:** Carry to arc-planner. Arc A brainstorm should cover ENOSPC handling for register/materialize/copy as a small section (best-effort cleanup + clear user error). Same for Arc D (migration) and Backup arc.

**Spec locations:** searched -- no hits.

---

### I-8. Multi-engine quakedir migration is listed as Arc D open question but is load-bearing for Arc D *brainstorm*
**Source:** both reviewers, with tier disagreement (Sonnet I-6 = Important; Opus W1 = Worth-a-closer-look)
**STATUS (2026-05-12):** SETTLED in design discussion. Resolution: single merged profile per data-root, NOT one-profile-per-engine. Operator's Layer 1 path-rule verification confirmed `/qw` and `/id1` are shared base dirs both engines read; engine-specific content lives in `/ezquake` and `/fte` with no filesystem collisions. Engine compartments expressed via role tags on manifest entries (`ezquake-config`, `fte-config`, `shared-asset:*`); manager filters per-engine view; runtime engine selection at launch ("Launch ezQuake / Launch FTE" buttons next to active profile); clone-modal-at-import lets recipients filter by bucket; user-initiated extract-subset for bespoke "different setup per engine" case. Aligns with long-term FTE-as-browser-quake vision: merged profile lets a recipient try FTE with pre-converted configs in one import. Full details in Resolution log below.

Roadmap (`:243`) lists "Multi-engine quake dirs (user has both ezQuake and FTE in same dir): one profile or two?" as an Arc D brainstorm open question. Sonnet argues this is NOT safely deferrable because the classifier is shared Arc D/E and per-role materialization mode diverges by engine; without a multi-engine policy, the migration classifier cannot correctly route users with both engines. Opus agrees it's load-bearing but argues it's spike-worthy for V1 dogfood (operator's own dir may have both engines). Substance agreed; tier differs.

**Why it matters:** Not unusual in QW community to run both ezQuake (competitive) and FTE (recording/spectating) in same dir. Operator's V1 dogfood may hit this immediately.

**Resolution:** Spec or Arc D brainstorm should lock: (a) one profile per detected engine (two profiles from one source dir, shared assets as manifest entries in both); or (b) one merged profile with engine-compat tags. Either way: decision before Arc D implementation. Pair with subagent spike walking operator's actual dir to inform the decision.

**Spec locations:** `roadmap.md:243`.

---

### I-9. Primary-profile-delete prompt copy is backwards from intent
**Source:** Opus (unique)
**STATUS (2026-05-12):** PENDING SPEC AMENDMENT. Mechanical wording fix; resolution wording locked: *"To delete the primary profile while others exist, first designate a different profile as primary."* [Choose new primary] [Cancel]. Drops into the spec amendment cluster.

`architecture.md:719-722` for primary profile delete: "Primary cannot be deleted while other profiles exist. Choose a new primary first, then retry." Read cold, this reads as "Primary is deletable when other profiles do NOT exist" -- suggesting demoting-then-deleting isn't an option. The actual intent is "designate a different profile as primary, then delete the now-non-primary profile."

**Why it matters:** Small but real UX bug-in-spec. Prompt copy goes verbatim into UI strings.

**Resolution:** Spec amendment: "To delete the primary profile while others exist, first designate a different profile as primary. [Choose new primary] [Cancel]."

**Spec locations:** `architecture.md:719-722`.

---

### I-10. Stale lockfile recovery prompt is undefined; tray-only and cross-machine cases break it
**Source:** Opus (I3)
**STATUS (2026-05-12):** SETTLED in design discussion — simpler than originally framed. Resolution: Tauri's `single_instance` plugin handles the same-machine case fully (second launch focuses existing window via IPC). Cross-machine network mounts documented as out-of-scope ("slipgate's data-root must not be mounted on multiple machines simultaneously"). Atomic-write discipline (already settled by I-5, I-6, manifest.json) handles crash recovery without lockfile-based defenses. Optional `running.json` diagnostic file for debug breadcrumbs (`{pid, hostname, started_at, version}`) — not a defense, just an info artifact. **W-9 (hostname instability) becomes moot** — there's no hostname check to fail. Full details in Resolution log below.

`architecture.md:397` ("Stale-lock detection: file age + PID liveness on same hostname; force-unlock prompt if stale.") is one sentence. The prompt language is undefined. Cross-machine mounts (data-root accessible from machine A and B) trivially pass the PID-on-same-hostname check on the second machine -- force-unlock proceeds while machine A is still writing. Tray-only slipgate: second instance attempt sees lock, user force-unlocks, real instance keeps writing.

**Why it matters:** Two flavors of false-positive: legitimate force-unlock succeeds; apparent force-unlock corrupts. The check can't distinguish them.

**Resolution:** Two-stage force-unlock: use single-instance plugin's focus signal to attempt focusing existing slipgate window first; only allow force-unlock if focus fails. Stricter age threshold (file age > 24h means stale regardless of PID liveness). Carry to Arc A brainstorm. (See also W-9 below for the related hostname-instability case.)

**Spec locations:** `architecture.md:397`.

---

### I-11. Server-pushed gamedir creates bandwidth-waste + mod-cache-vs-library precedence gap
**Source:** Opus (unique)

`architecture.md:149-152` (Server-pushed gamedirs) + `:1011` (ezQuake handles server-driven gamedir changes natively) + `:547` (library materializes only into declared_gamedirs). User has CTF in library but profile's `declared_gamedirs: ["qw"]` -> library's CTF content is gated out -> engine re-downloads via server-push every time. Wasteful. After session, Stage 2 quarantines to `mod-cache/ctf/`. Next session, server pushes same files; dedupe against mod-cache *should* happen but path isn't spelled out. Plus: profile-overrides-library precedence is spec'd (`:235`) but mod-cache-vs-library precedence isn't.

**Why it matters:** Operator note at `:1074` says most ezQuake users don't use other gamedirs, but CTF servers ARE used in the QW community. Download-once-per-session friction is visible.

**Resolution:** Arc E brainstorm should walk the CTF-server-join flow end-to-end, document materialization-vs-library-vs-mod-cache precedence, decide whether mod-cache->library promotion should be auto-prompted ("you've downloaded these CTF files 3 times -- keep in library?") or fully manual.

**Spec locations:** `architecture.md:149-152`, `:235`, `:547`, `:1011`, `:1074`.

---

### I-12. Strict manifest-import role validation contradicts offline-fully-functional pledge
**Source:** Opus (unique)
**STATUS (2026-05-12):** SETTLED in design discussion. Resolution: soft-fallthrough — unknown role → entry imports as `unclassified` with Manager-surfaced warning badge ("unrecognized role — registry sync may resolve"); materialization still works (target_path known, SHA known); safe defaults for role-derived behavior (copy mode for materialization, Class 3 for swaps). Next registry sync self-heals if the role is now known. Reframed during discussion: well-formed manifests rarely produce unknown-role entries (publisher's slipgate already validated); this is the rare-edge-case safety net, not a common failure mode. **Generalizes to substrate principle: metadata enrichment is delta-sync-driven, not user-driven** (see new substrate principle in architecture-principles section). Full details in Resolution log below.

`architecture.md:131` validates manifest entries against the local role registry on import; unknown role -> "refresh attempt or user prompt." For online users this works. For offline users (Pass 5.3's offline-fully-functional pledge), refresh fails -> only recourse is updating slipgate -> but role registry refreshes via delta-sync per `:1689`, not a release event. So an offline user is locked out of importing a profile until they sign in once. This contradicts the two-growth-axes principle (`:1763-1770`, "code grows recognition, catalog grows corpus") -- asset-role addition is catalog growth but the strict validation makes it gated on a sign-in event.

**Why it matters:** Offline-fully-functional and "two independent growth axes" can't both be true under the current strict-validation rule.

**Resolution:** Soften manifest-import validation: unknown role triggers a warning + "import anyway, treat as `unclassified`" option. Or role registry ships an "unknown role catch-all" coercion. The strict validation at `:131` is too strict for the offline pledge.

**Spec locations:** `architecture.md:131`, `:1429-1431`, `:1689-1697`, `:1763-1770`.

---

### I-13. Publish UI surface is undefined for V1
**Source:** Opus (unique)
**STATUS (2026-05-12):** PENDING SPEC AMENDMENT. Resolution wording locked: V1 ships **without user-facing publish UX**. The publish *contract* (manifest schema, parent_manifest_sha lineage, blob upload format) is locked at V1 so hub-side admin tooling can publish starter profiles. The *user gesture* (Publish button, pre-publish-review modal consumer, public/friends-only/private toggle, manifest-vs-bundle export choice) lands V1+ alongside Arc H. V1 user-facing sharing surface = (a) import hub-vetted starter profiles, (b) import peer-share bundles, (c) import standalone manifests with greyed-out-fillable assets.

Spec describes the publish *mechanism* extensively but not the *user gesture*: where the user clicks "Publish," whether publish is profile-level or bundle-level or both, what modal appears (clone modal consumer 2 is the pre-publish-review modal, but Arc H is V1+), what confirms publish succeeded. Public-by-default vs friends-only vs private is listed as Arc H open question.

**Why it matters:** Combined with Arc H being V1+, V1 ships without publish UX. That's fine, but the spec talks about publish flows extensively, which could mislead arc-planner into thinking the surface needs to exist in V1.

**Resolution:** Spec amendment: add one-line clarification in Cloud catalog interaction: "V1 ships **without publish UX**. The pre-publish-review modal consumer lands in V1+ alongside Arc H. The V1 publish *contract* is locked, but the user-facing 'Publish' button is V1+."

**Spec locations:** `architecture.md:1388-1395`.

---

## Worth a closer look (load-bearing-but-unverified)

### W-1. Windows hardlink edge cases (volume / AV / 1023-link limit)
**Source:** Sonnet (V-1)

Spec defers cross-platform hardlink decisions to Arc A/B (`:603`). Windows-specific concerns:

- `CreateHardLink` requires same volume AND same drive letter (not just same physical disk via mount points).
- Windows Defender / AV products sometimes interfere with hardlink creation during real-time scanning of blob-store fanout dirs.
- NTFS hardlink limit is 1023 per file. At 1023 profiles sharing the same `pak0.pak` blob, the next profile materialization fails. Catalog-heavy community user might reach this for popular shared assets.

**Verification approach:** Arc A source-walk of `CreateHardLink` docs + test under Windows Defender real-time protection. Document fallback when `CreateHardLink` returns ERROR_TOO_MANY_LINKS (copy instead of link).

**Spec locations:** `architecture.md:386`, `:603`, `:194`.

---

### W-2. Bundle version ordering without explicit `version` field
**Source:** Sonnet (V-2)

Pass 6.1e locked: "Versioning falls out of name + publisher + publish ordering." Catalog data shape (`:1445`) shows `version` field as optional. Open questions: (a) what is the canonical version-ordering for a user who downloaded v1.0 and then discovers v1.1 -- local download log records the download event but not catalog-relative ordering. (b) If hub moderation accepts v1.1 before v1.0 (delayed moderation), publish-order doesn't reflect semantic version order.

**Verification approach:** Quick design check: does catalog store a monotonic publish-sequence-number per submission? If yes, ordering is reliable. If no (only a timestamp, which can drift for moderated submissions), need a tiebreaker.

**Spec locations:** `architecture.md:1437`, `:1445`, `:1489`.

---

### W-3. Refcount index staleness crash window
**Source:** Sonnet (V-3)

`.refcounts.json` is updated on every manifest add/remove (`:1234`) but spec doesn't specify atomicity with the manifest write itself. Crash between manifest atomic-rename succeeding and refcount index update -> index is stale (lower than reality) -> subsequent GC could move an in-use blob to trash. 30-day trash retention (`:1244`) provides recovery, but spec doesn't note the crash window exists.

**Verification approach:** Arc A implementation: either (a) refcount update is immediately after manifest fsync under same mutex hold, or (b) GC trusts manifest-walk over index when index is suspiciously low.

**Spec locations:** `architecture.md:1233-1244`.

---

### W-4. FTE engine-exit save hook may not exist
**Source:** Opus (W5)

ezQuake's `cfg_save_onquit` is verified. If FTE doesn't have an equivalent, FTE users' in-session config changes are lost on quit -- different problem (engine-side, not slipgate-side), but Stage 2 sees nothing on FTE engine-exit while ezQuake users see config saves on every exit. The cleanup-notification cadence differs across engines.

**Verification approach:** Half-day subagent: source-walk FTE's quit path for cfg-save-on-quit equivalent. Document per-engine engine-exit behavior in spec or Arc E brainstorm.

**Spec locations:** `architecture.md:227`, `:1018-1021`.

---

### W-5. FTE profile-switch via Class 3 (engine restart) UX impact unverified
**Source:** Sonnet (V-5)

Review-prep item 16 flags this; decision is locked (FTE -> Class 3 for all swaps in V1) but UX impact is empirically unassessed.

**Verification approach:** Time a FTE engine restart on target hardware. < 5s = acceptable. > 10s = product differentiator that should be called out in UI ("FTE profile switch requires engine restart, ~Xs").

---

### W-6. `link()` failure when blob is held open by another process
**Source:** Sonnet (V-6)

`CreateHardLink` succeeds on Windows even if target is open. But during Stage 2, when slipgate tries `link(tree_path, blob_path)` while engine is NOT running (Defense 1 held), the tree file might still be open by another process (text editor, Explorer thumbnail cache). Non-shareable file lock -> `CreateHardLink` fails with ERROR_SHARING_VIOLATION. Spec doesn't specify error handling.

**Verification approach:** Arc A/E implementation: wrap `link()` calls in error handling that falls back to copy on ERROR_SHARING_VIOLATION, with a log entry. Document fallback in spec.

---

### W-7. exFAT / non-hardlink filesystem rejection user-population
**Source:** Opus (W2; review-prep item 2)

Install-time precondition rejects FAT32/exFAT/non-hardlink-capable mounts (`:614`). QW community has older players with unusual setups (USB sticks for LAN events, network drives, exFAT external SSDs). If even a few percent of target users have non-hardlink-capable storage, rejection is a real blocker.

**Verification approach:** Operator-side -- community-Discord poll or ask a couple of players with unusual setups. Five minutes of social-channel checking gets 80% of the answer.

---

### W-8. HUD-image reload-cost registry may be too coarse
**Source:** Opus (W3)

Reload-cost registry (`:1087-1099`) routes `user-asset:hud` change at `* (catch-all images)` to `vid_restart` (Class 2). ezQuake's HUD-image reload behavior isn't uniform: status bar elements often DO reload on `vid_restart`, but scoreboard backgrounds and custom HUD shaders may need `hud_recalculate` followed by draw refresh, or sometimes don't reload until mapchange. V1 default pushes users into engine restart for cases that might work with a milder reload.

**Verification approach:** Half-day subagent: take a specific HUD pack (e.g., one of paradoks's), enumerate reload class per HUD-image role. Feeds the Pass 5.1 reload-cost registry baseline or confirms Class 2 is the right V1 default.

**Spec locations:** `architecture.md:1087-1099`, `:1112`.

---

### W-9. Lockfile hostname check assumes stable hostname
**Source:** Opus (W4)

`architecture.md:397`'s hostname-based stale-lock detection fails for Tailscale users / DHCP renames / VMs where hostname changes without notice. Mirror failure: same hostname different machine (cloned VM, VM snapshot rollback) -- lockfile says PID X is alive on hostname H, current machine *is* hostname H and PID X happens to be `chrome.exe`. Force-unlock seems unnecessary but lock is actually stale.

**Verification approach:** Does Tauri's `app::Handle` expose machine UUID / installation-ID that survives hostname changes? If yes, lockfile carries that instead of hostname.

**Spec locations:** `architecture.md:397`.

---

### W-10. Private-folder mark vs new-file-in-folder mental model
**Source:** Opus (W6)

`private.json` has no glob support in V1 (`:510-514`). User marks `qw/notes/` as private; line 514 says "expands to file set at mark-time; new files don't auto-inherit." If user's engine writes a new file into `qw/notes/` later (unlikely but possible via custom HUD output), it's NOT in `private.json`. Watcher treats as Case 3; Stage 2 may classify and warehouse. User mental model: "the notes folder is private." Substrate model: "only the files I marked." Real user/design divergence.

**Verification approach:** Spec amendment or Arc E brainstorm: explicit no-glob user-facing documentation + cleanup-notification prompt ("Hey, a new file appeared in qw/notes/ -- mark as private?") when an untracked file appears within a previously-marked private folder.

**Spec locations:** `architecture.md:510-514`, `:621`.

---

### W-11. Import-classification handler UX (loose-files / bad-directory-structure case)
**Source:** 2026-05-12 second design discussion (surfaced while walking I-3's V1 manifest-import surface and the "import my whole quake dir" gesture).

The architecture has the primitives (catalog data shape, role registry, asset-loader-sites extractor data) but doesn't fully walk the *user-facing classification handler* — the path a dropped zip / pak / folder / "consume my whole quake dir" gesture takes from input bytes to classified manifest entries. Three-tier classifier locked in discussion:

1. **SHA-match** against baseline registry → classified by registry-tagged role.
2. **Source-evidence match** = filetype + path-pattern from extractor data (`asset-loader-sites` + `reserved-subdirs`) → classified by the role the engine source implies. New blob registered, metadata tagged "engine-source-inferred."
3. **Quarantine** = anything that doesn't match either. Original folder structure preserved (`<warehouse>/quarantine/<import-id>/<original-path>/<filename>`). Not materialized to tree; Manager has a Quarantine view where user can classify or discard later.

NO speculative heuristics (no sister-file inference, no filename-only guessing) — the distinction is between *source-evidence-grounded derivation* (Layer 1 extractor data tells us what the engine actually loads from which path) and *speculative inference* (filename patterns, sister-file proximity). Only the former is in scope.

Storage model: recognized content + source-evidence-inferred → warehouse + hardlink (copy cross-volume); user-content (demos/screenshots/saves/logs by path-pattern) → warehouse + hardlink; cache-ephemera (servers_data, temp/) → tree-only observe-only; quarantine residue → warehouse subdir, NOT in tree.

V1 ships a baseline registry covering stock paks + nQuake-bundled + canonical community packs (~60-70% recognition coverage for typical user dirs); hub-as-delivery is V1+; the "smart" version with full SHA-registry + sister-file inference + structured prompts is V1+ if real usage shows demand.

**Why it matters:** the "import my whole quake dir" gesture is operator's dogfood entry point and a load-bearing V1 capability. Without an opinionated classifier, users get noise (random `.txt` files in their profile, demos mixed with assets, etc.).

**Verification approach:** carry to Arc D (migration extractor) and Arc E (watcher Stage 2) brainstorms; the classifier is shared across both. The baseline registry (V1's recognition floor) is its own pre-arc spike: hash and catalog stock paks + nQuake-bundled content + 3-5 canonical community packs.

**Spec locations:** `<no current section>` — needs new architecture spec section: "Import classifier and quarantine model." Touches `architecture.md:1433-1531` (catalog data shape) and the watcher Stage 2 section.

---

## Spec navigation / clarity (low priority)

### N-1. "Open architectural questions" section name is misleading
**Source:** both reviewers (Opus S1 + Sonnet S-1; convergent)

`architecture.md:1780` has a note "despite the title, most of what's below is per-pass retrospective, not actually-open items." The note exists but the section name still causes friction on first read. Sonnet suggests renaming to "Architectural decisions log (per-pass retrospectives)" and demoting the "Still open" subsection. Opus suggests changing the reading-guide "Skip on first read" advice to "Skim on first read for decision lineage; deep-read when validating a specific pass's settlement."

### N-2. Clone-modal consumers scattered / over-repeated
**Source:** both reviewers (Opus S2 + Sonnet S-3; convergent)

The "seven consumers of the clone modal" pattern is mentioned in ~10 places, each re-enumerating the seven. Single canonical list in Primitive operations + short hyperlink references elsewhere would significantly improve readability for arc-planner.

### N-3. Watcher Case 4 (tracked + file deleted) UX is thin
**Source:** Sonnet (S-2)

Case 4 is in the five-case dispatch table but not in the cleanup notification UX section (`:885-905`), which shows examples for maps/mods/unrecognized but not for deleted-tracked files. Arc E may treat ad-hoc rather than designing deliberately. One-paragraph clarification suffices.

### N-4. Catalog data shape and Bundles-in-slipgate-app overlap heavily
**Source:** Opus (S3)

`:1433-1531` (Catalog data shape) and `:1534-1583` (Bundles in slipgate-app) walk the same primitive (bundles ARE manifests) from different angles. Sequential read gets the same content twice. Consider folding Bundles section into Cloud catalog interaction as a subsection.

### N-5. Pass-status retrospectives at end duplicate body content
**Source:** Opus (S4)

`:1779-1882` is 100+ lines of per-pass retrospective. If everything's drained into the body, the retrospective could move to a separate doc (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-pass-retrospectives.md`) with the architecture spec retaining a single-paragraph pointer.

### N-6. Materialization order / library precedence stated but not illustrated
**Source:** Sonnet (S-4)

`:233-235` states the rules but the interaction between them could use a 3-row example table showing three target paths (one claimed by profile, one by library, one by both) to prevent arc-planner from misinterpreting "library fills remaining target paths" as "library runs before profile content."

---

## Surprises / things that worked well

Both reviewers independently surfaced overlapping positive observations. Cross-cutting themes:

**Clone modal as V1 selector primitive (both).** Seven user-facing flows reuse one modal grammar. The cognitive consistency is striking; the Pass 3.2 -> 5.1 -> 5.3 evolution absorbed two more consumers without breaking. Adding the 8th feels easy by construction.

**Manifest-as-truth + tree-as-derived-state (both).** GC-walks-manifests-not-tree (`:1230-1236`) is a one-line architectural commitment that prevents an entire failure class -- nlink-as-truth would have broken Arc G (per-config history) silently. The "do the structurally-correct thing even when the operational cost is slightly higher" instinct shows up throughout.

**Hard-fork-with-drift-detection (both).** Overlay's auto-propagation surprise is exactly the kind of user-trust-erosion that turns power-user features into footguns. Drift-detection at three trigger points (non-blocking on app-open, blocking on profile-switch, light-prompt on engine-launch) respects user agency without sacrificing the live-link-to-parent value.

**Two-stage capture/swap pipeline (both).** Stage 1 purely-observe + Stage 2 at safe-moments = an entire class of "engine still writing" problems eliminated by structure, not defense. Defenses 1-4 work in concert with the structural separation. Pass 3.4 deserves credit -- "split the operation along the right axis" insight that's obvious once written but hard to discover.

**Lossless-export Tests 1/2/3 (Sonnet).** Encoding the lossless-export pledge as three automated tests (round-trip integrity, zero residue, post-uninstall engine smoke) is the right way to protect a product property that could easily be violated by a future feature. Test 3 running an engine against the export is unusually thorough.

**Single-class self-knowledge surface collapse (Sonnet).** Earlier two-class (code-bundled vs catalog-refreshable) distinction was a leaky abstraction; collapsing to one class with per-table cadences (some refresh on sign-in, some bundle with releases) is simpler and correctly acknowledges that the difference is operational policy, not architectural kind.

**Two growth axes principle (Opus).** `:1763-1770` ("code grows recognition, catalog grows corpus") gives arc-planner a clear sequencing rule. Pays off for the *next* arc, not the current one. (See I-12 for the wrinkle where this principle and offline-fully-functional pull against each other.)

**Per-pass minutes + retrospective triple-source lineage (Opus).** A future arc-executor working on Arc D's classifier gets three independent ways to find each decision: per-pass ratification, retrospective in Open architectural questions, inline references throughout the body. Doc-redundancy as design. Volume isn't free (see N-5) but resilience is real.

---

## Where the reviewers disagreed

- **Multi-engine quake dirs tier (I-8):** Sonnet -> Important (not safely deferrable); Opus -> Worth-a-closer-look (spike-worthy). Substance agreed; tier differs. Reconciled at Important tier in this doc with both framings preserved.
- **Reading-guide "Skip on first read" advice (N-1):** Opus suggests softening to "Skim for lineage"; Sonnet suggests renaming the entire section. Different remedies, same underlying friction. Both folded into N-1.

No substantive disagreements on findings themselves.

---

## Resolution log (2026-05-12 design discussions)

> Captures the full settled outcomes for findings closed in two 2026-05-12 design discussions between the operator and Claude. First discussion settled C-1 through C-5 (followed by C-6 and C-7 as PENDING SPEC AMENDMENT). Second discussion settled C-8 (newly surfaced this session) + all 8 remaining Important findings (I-3, I-5, I-6, I-8, I-9, I-10, I-12, I-13). Pairs with the STATUS markers on individual findings above.

### C-1: Defense 1 failure modes — RESOLVED

The four sub-cases identified by the cold-eyes reviewers each have a clean resolution:

1. **Shortcut-launched engines.** Slipgate runs a periodic engine-process scan. Filter: any running process whose image path is a known engine binary (ezquake.exe, fteqw.exe, etc.) at the active profile's basedir. Cost is sub-millisecond on Windows (process-enumeration walk). Could run before each Stage 2 trigger, or continuously every 1-2s if a UI "engine running" indicator is wanted. Replaces the "did slipgate launch it via process handle" check entirely — scan is the source of truth either way.

2. **Server-pushed mid-session writes.** Spec amendment clarifies that mod-cache is an *index* over warehouse blobs (categorizing them as `cache-ephemera`), not a physical destination files are moved into. Flow: engine writes to active tree → watcher captures as Case 3 → at engine-exit Stage 2 hashes, registers a blob in the warehouse, indexes the entry in mod-cache's table. The file at the tree path becomes a hardlink to the warehouse blob (same materialization mechanic as everything else). From the user's POV the file stays at the path the engine wrote it. Materialization of mod-cache content is uniform with profile + library materialization.

3. **cfg_save_onquit timing.** Two parts: (a) identical-byte writes (the common case for users who haven't changed anything in-session) hash to the same SHA as the manifest's current entry → silent no-op (no new blob, no manifest version bump, no clutter). (b) In-flush timing is caught by Defense 2 (stable-mtime check, 5s default) — if the file's mtime hasn't stabilized when Stage 2 starts, Stage 2 defers and re-checks. Defense 2 already exists; the spec amendment just connects the dots.

4. **Slipgate-crash-during-session.** Startup reconciliation pass. On slipgate launch, before clearing `.pending-swap.json`, walk active profile's tree: for each tracked file, hash and compare against manifest's expected SHA; for each untracked file (new files the engine downloaded mid-session), classify and present as Case 3. Divergences surface in cleanup notification.

**Defense 1 reframed:** "process only when no engine session is detected AND no pending writes are in flight." Detection becomes scan-based rather than process-handle-based.

**Folded-in findings:**
- **I-2 (slipgate-closed reconciliation):** same startup reconciliation pass as sub-case 4 above.
- **I-7 (mod-cache-vs-library precedence):** mod-cache and library both materialize via hardlinks from warehouse blobs. The distinction is policy on the entry, not storage location. Library = kept indefinitely, curated, shareable-via-manifest. Mod-cache = transient, auto-managed, subject to GC (time-based, 60-90 days unused as default), not shareable. User gesture "promote mod-cache item to library" moves an entry between the two policy classes. Surfaced in the cleanup notification at engine-exit ("you downloaded X CTF files — keep ephemeral / promote to library / discard").
- **I-11 (server-pushed gamedir bandwidth waste):** also folds in — content downloaded mid-session is preserved across subsequent sessions via mod-cache materialization; engine doesn't re-download.

---

### C-2: Light↔Managed mode boundary — RESOLVED

Full Light↔Managed model:

- **Mode storage:** per-data-root marker (`<data-root>/.slipgate-mode` or equivalent field in existing `profile-roles.json`). On point-at-dir, slipgate reads the marker. No marker = unmanaged-yet → first-launch onboarding for this dir. Per-data-root means one user can have one Light dir + one Managed dir simultaneously.
- **V1 default:** Light. New-user landing is the "skip into tool mode" branch of first-launch. Managed is opt-in via the migration on-ramp. UI pitch: *"Slipgate is observing your Quake dir. When you want to share/clone/version your setup, [Manage this dir]."*
- **Watcher:** Managed-only. Config history, Defense 1-4 stack, drift detection switch on at Managed promotion.
- **Asset import in Light:** allowed. On-demand hash-compare at import time eliminates duplicate-asset friction — when a target path is occupied, hash both the existing file and incoming bytes; matching hashes → silent no-op ("you already have this"); differing hashes → "overwrite?" prompt fires.
- **Light state (persisted):** minimal `<data-root>/.slipgate-light/` holding `import-log.json` (catalog handles + target paths for assets the user imported) and `observations.json` (last-seen engine versions / mtimes). Consumed by Arc D's migration extractor on Light → Managed for known catalog provenance. No warehouse, no manifest in the Managed sense.
- **Light → Managed:** via the existing migration on-ramp. No separate "upgrade from Light" gesture. The migration extractor reads the Light-state log to skip re-classifying items with known catalog provenance.
- **Managed → Light (mode demotion):** flip mode marker `managed` → `light`. Watcher stops. Active profile becomes "last-active-when-demoted." Warehouse + manifests + materialized tree stay untouched (no copy, no removal). Reversible.
- **Demote prompt:** offers "Want to export this profile to a fresh independent dir first, then run Light against the new dir?" Enables Managed-as-temporary-cleaning-tool workflow (import messy dir → Managed sorts → export clean → demote).
- **OS-level read-only on warehouse blobs:** universal (not demotion-specific). Set read-only attribute on every blob file when registered. Hardlinked non-config files in tree inherit read-only via the shared inode → in-place edits fail with OS error rather than silently corrupting blobs. Configs in tree are independent copies (per-role copy-mode), remain editable. Managed-mode operations that produce new versions always create a fresh blob (new inode, new hash, new directory entry) — read-only-on-old-blobs doesn't block anything.
- **Re-promote:** walk tree, hash each file against last-active manifest. Drift detected → surface in cleanup notification (treat as new versions / revert from warehouse / discard).
- **Cross-mode features:** Updater is the only mode-split feature — Managed-mode updater is warehouse-aware (manifest update + rematerialize); Light-mode updater is the traditional rename-backup-replace at the file site. Analyzer, screenshot capture, config viewer, FTE converter are all mode-agnostic.

---

### C-3: Case 2 tracked-edit dispatch — RESOLVED

**Reading 1 (auto-apply silently).** Stage 2 hashes the new bytes, registers a new blob, updates manifest's config.cfg entry to point at the new SHA. No prompt, no cleanup notification surfacing the entry. User sees the new version on next launch as if nothing happened.

**Rationale:** the user already declared intent with `cfg_save` (or cfg_save_onquit=1); the engine-side gesture is sufficient implicit-intent declaration; slipgate doesn't need to re-confirm. Matches Pass 2.5's living-file principle.

**Generalized principle (for the spec amendment):** any write the user explicitly invoked through the engine, in a known-good role, is implicit-intent-declared and doesn't require slipgate confirmation. Generalizes beyond cfg_save; applies to any engine-mediated write through a known-good role.

**`Discard` action semantics:** only applies to Case 3 (untracked + new file) entries where the user can say "don't import this." For tracked edits, the model is "every save is automatically captured; if you want to revert, use per-config history (Arc G)."

---

### C-4: Stock-pak SHA gate — RESOLVED

**Strip stock-pak SHAs from manifests entirely.** Profile manifests reference custom content; stock content is implicit (every user has it, verified at first-launch).

**First-launch verification (the only verification gate):** user has SOME legitimate stock pak set, verified via per-asset SHA matching against the catalog's known-good registry. Three first-launch paths:

- User has paks (or loose-files equivalent) in registry → verified, origin-tagged.
- User has paks not in registry → "user-provided, unverified" path with non-accusatory messaging ("stock pak SHAs aren't yet in the catalog's known-good registry — this happens with historical or patched legitimate copies. Continue (stock paks unverified) / Cancel").
- User has no Quake content at all → V1: blocked at first-launch with clear messaging. V1+: offer free-baseline install (filed below).

**V1+ free-baseline install (parked, not in V1 scope):** recreates the curation/bundling decisions nQuake made. Bundles: shareware pak0 + GPL maps (textureless by themselves) + Quake Retexturing Project (textures) + Plagued MonkeyRat (weapon models) + Frogbot Clan Arena (single-player deathmatch practice) + ezQuake config tweaks (`gl_externaltextures_world` etc.). Both objective inputs (compatibility verification, legal vetting) and subjective inputs (which textures look best, which mods to include). Sized for its own arc. Positioned not as a fallback but as a positive adoption lever for new-to-Quake users entering the QW community.

**Edge case:** custom-modded pak0 (modder shipping their own variant) is classified as `user-asset:pak` not `stock-asset:*`, referenced by specific SHA in the manifest like any other custom content. Stock-asset special-casing only kicks in for roles classified as stock content.

---

### C-5: GitHub 100MB per-file limit — RESOLVED (with structural reframe)

**Storage model: explode-everything.** Slipgate doesn't store paks as monolithic blobs. At first-launch (or import), pak0.pak / pak1.pak / custom paks / pk3 files are all exploded into individual asset blobs in the warehouse. Re-bundling happens only at export time.

**This defuses C-5's original concern.** Individual exploded assets are KB-MB scale; the GitHub 100MB per-file limit basically never triggers. Pre-push validation stays as a safety net for the rare oversized blob (e.g., very large individual .bsp).

**Engine compatibility:** verified by operator (2026-05-12) — ezQuake works with loose files in id1/, no pak0.pak / pak1.pak file required. No pak-rebuild step at materialization needed. Uniform model: stock paks materialize as loose files just like custom content.

**Per-asset origin tagging.** Orthogonal `role` + `origin` fields on each manifest entry:

- `role: stock-asset:texture` (or `:sound`, `:model`, `:map`, `:wad`, etc.)
- `origin: pak0` (or `pak1`, unset for custom content)

Role stays focused on "what kind of asset"; origin captures "where it came from." Keeps classification clean — `stock-asset:texture` vs `user-asset:texture` is a one-field distinction, with origin as the further refinement for stock content.

**Classifier behavior at first-launch:**

- If user has pak0.pak / pak1.pak as paks → explode them into individual blobs.
- If user has loose stock files → walk the gamedir, hash each file.
- For each blob produced (either path), SHA-match against the catalog's known-good per-asset registry. Match → assign `role` + `origin: pak0|pak1`. No match → `role: stock-asset:*` with `origin: unverified` (per C-4's user-provided-unverified path).

SHA is the ground truth; the storage form the user came from (pak vs loose) doesn't matter to the classifier.

**Manager browser implication:** content groups by origin. Natural buckets — *Original Quake (pak0)*, *Registered Quake (pak1)*, *Custom content*, *Unverified stock*. Each bucket is "manifest entries with this origin tag" — a pure query against the warehouse.

**Known-good registry scope:** V1 covers one canonical distribution's per-asset SHAs (Steam or nQuake-bundled — TBD). The L1-delta stock asset catalog (V1+ qw-oracle scope per review-prep section 2) expands coverage to all legit distribution variants.

**Lossless-export pledge — operationalized:** the export flow can rebuild pak0.pak / pak1.pak from the warehouse with byte-identical SHAs (target: SHA equality vs the user's original paks). pak-builder is the reverse of the existing pak-extract.py — ~40 lines of code; 1-hour write. pk3 building uses standard zip libraries. Round-trip verification (extract → rebuild → SHA compare) lands as a verification step at Arc A.

**Export UX (sketched; not V1-blocking):** modal with "domains" (warehouse queries by role/origin) on the left, "containers" (pak/pk3 build targets) on the right. User drags content into containers, then builds. Common shapes: vanilla restore (two paks), single-pk3 share, multi-pk3 split by category, flat export. Fits the seven-consumer clone-modal pattern as an extension.

**Pre-push validation:** still the safety net for the rare blob exceeding 100MB. Three options surfaced in the UX when validation finds an over-limit blob: (a) use local-external backup target (zero-config default), (b) enable GitHub LFS (opt-in; LFS has separate billing/quota considerations), (c) exclude these specific blobs from this backup.

---

### C-8: Engine homedir as second data-root — RESOLVED

**The discovery.** Operator was unaware their Windows ezQuake install had a homedir. We verified Layer 1 path-rule data from `apps/qw-oracle/scripts/extractors/{ezquake,fte}/output/*-asset-path-rules-verified.json` (source-walked against ezQuake head and FTE build-6698):

| Path | ezQuake | FTE | Status |
|---|---|---|---|
| `id1/` | reads | reads | shared |
| `qw/` | reads | reads | shared |
| `ezquake/` | reads | not mounted | ezQuake-specific (basedir-side) |
| `*fte/` private gamedir | not mounted | reads | FTE-specific (basedir-side) |
| home dir (`~/Documents/ezQuake/`, `~/.ezquake/`) | reads (top of LIFO stack) | not mounted | ezQuake-specific (cross-volume from basedir) |

ezQuake's full LIFO lookup order: **homedir > qw > ezquake > id1**. The homedir sits at the TOP — any file there silently overrides basedir's equivalent.

**Operator's actual homedir contents (verified live):** `~/Documents/ezQuake/qw/save/s0.sav` (193KB SP save), `~/Documents/ezQuake/servers_data` (746KB server browser cache), `~/Documents/ezQuake/temp/` (empty).

**Configs only land in homedir if `cfg_use_home 1`** (source-walked at `config_manager.c:798-816`, `Cfg_GetConfigPath`). Default is `cfg_use_home 0` → configs go to `<basedir>/ezquake/configs/`. Operator's case matched the default. `cfg_use_home 1` is a pre-slipgate-era opt-in workaround for the exact problem slipgate solves.

**Cross-volume constraint:** Windows `CreateHardLink` rejects cross-volume operations. If warehouse is on `D:\` and homedir is on `C:\Users\...`, materialization to homedir can only be a copy, not a hardlink. This shapes the resolution.

**The model: scan-and-import, no materialize-back. Three motions:**

1. **At slipgate-take-over (first managed-mode promotion):** scan homedir, copy each file into the warehouse, classify, add manifest entries with `source_root: homedir` annotation. One-time migration.

2. **Ongoing homedir scan (event-driven, not real-time):** triggered at engine-exit (Stage 2 equivalent for homedir) and at slipgate app-startup (catches the "user closed slipgate during engine session" case). Walk homedir, hash, register any new/changed files into the warehouse, update manifest. Catches shortcut-launched-ezQuake writes per C-1's pattern. No periodic timer needed.

3. **Slipgate-launched ezQuake gets `-nohome` injected:** for runs slipgate controls, homedir is unmounted, eliminating dual-location reads. Reduces homedir activity to "only when user launches ezQuake outside slipgate." Combined with motion 2, shortcut-launched cases still get captured.

**No materialization back to homedir from warehouse.** Profile-switch doesn't repaint homedir. The warehouse is the durable record; homedir's actual filesystem state drifts but is always re-captured at next scan. Export and backup pull from warehouse, so durable state travels with the user across reinstalls.

**Role classification for homedir contents:**

- `qw/save/*.sav` → `user-content:save`. Durable, profile-bound, private (not published with profile-share). Imported to warehouse with version history.
- `servers_data` → `cache-ephemera`. Server browser's internal cache; ezQuake-specific binary format; rebuilds itself if deleted. Snapshot at scan-time so it travels in backup; no version history (it'd churn constantly).
- `temp/` → ignore entirely.
- `cfg_use_home 1` config files (if present) → at take-over, surface a migration prompt: *"Found `config.cfg` in homedir — this takes precedence over basedir. Migrate to slipgate management?"* Default yes; copy to basedir-side, delete homedir copy, push `cfg_use_home 0` going forward via slipgate's startup injection script.

**FTE side:** FTE's base stack is `id1/ qw/ *fte/` — no homedir convention. So this is ezQuake-Windows-specific. Manifest entries tagged with `target_root` are naturally per-entry; FTE entries always carry `target_root: basedir`.

**Why both reviewers missed this:** both ran cold-eyes against basedir-focused architecture; the homedir is referenced as a path-rule fact at `architecture.md:1869` but not connected to the data-root model anywhere. Came from operator-Claude path-rule verification this session.

---

### I-3: Hub-moderation latency UX — RESOLVED (two-reality framing)

**Reframed during discussion: two realities slipgate must handle.**

**Reality 1 (today, V1):** no hub exists. Asset sharing is manual. Users distribute manifests via Discord/email/forums; recipients import. If recipient lacks a referenced asset, entry is greyed-out indefinitely until they obtain it from somewhere.

**Reality 2 (V1+):** assets.quake.world exists with rich registry; users publish manifests; hub becomes a delivery surface. Moderation latency, "Notify me," sender-never-publishes recovery all become meaningful at this point.

**V1 import surface = three paths, all designed to avoid the failure mode:**

1. **Hub-vetted starter profile import.** Operator (and other admins pre-V1-launch) manually publish starter profiles to hub — every blob uploaded before manifest registers, atomic publish. No moderation queue at user-facing time; 100% blob availability by design.

2. **Peer-share bundle import.** Clone-modal consumer accepting `.slipgate-bundle.zip` (manifest + all blobs zipped together). Recipient unzips; blobs land in warehouse; manifest imports cleanly. Self-contained; no hub round-trip; works for Discord-attachment-sized shares or Drive/Dropbox-hosted larger bundles. Heavy bundles (100MB+ texture-heavy) are sender's transport problem.

3. **Standalone manifest import with greyed-out fillable.** Recipient receives just the `manifest.json`; matches each entry's SHA against their local warehouse. Matches → live. Misses → greyed-out, *fillable*. User drags a zip / folder / pak into slipgate that contains the missing assets; W-11's three-tier classifier hashes them, auto-matches by SHA to greyed-out entries; entries flip from grey to live. **SHA is the universal connector** — manifest can come from one source, blobs from another.

**What this avoids at V1:** no manifest-only-hub-delivery path, no moderation queue, no greyed-out-with-no-recourse state. Greyed-out entries are explicit "you don't have this asset locally and there's no hub source slipgate knows about — drop in a zip with it to fill."

**Reality 2 elements (V1+, deferred to Arc H):**

- Hub becomes a delivery surface — greyed-out entries gain "Request from hub" action.
- Moderation latency UX: budget (operator picks 24h / 48h / week), "Notify me when available" in-app badge (no push notifications, per minimalism pattern), sender-never-publishes recovery ("ask sender to bundle and send directly").
- Moderation-rejection handling: "asset rejected, [remove from profile / replace with alternative]."

**Send-anywhere-style P2P (Reality-2 enhancement; V1+ roadmap):** drag-and-drop with PIN code, WebRTC NAT-bypass relay (like send-anywhere.com). Captures "share this with one specific person, not the world" case without going through hub moderation. Beautiful fit for Reality-2 peer-share; out of V1 scope.

**Spec amendment (V1):** "V1 import surface = hub-vetted starter profiles + peer-share bundles + standalone manifests with locally-fillable greyed-out entries. Hub-as-delivery, moderation latency UX, 'Notify me' mechanic, sender-never-publishes recovery, moderation-rejection handling — all land V1+ alongside Arc H."

---

### I-5: `.pending-swap.json` write integrity — RESOLVED

**Resolution: atomic-replace on every write, same discipline as `manifest.json` and (per I-6) `profile-roles.json`.**

Write pattern: tmp file (`.pending-swap.json.tmp`) → fsync → atomic rename to `.pending-swap.json`. Crash always leaves the previous version intact; no corruption window.

**Why this over the alternatives:**

- **Length-prefixed append** (rejected as over-engineered): would be the right shape if writes happened hundreds of times per second. Slipgate's actual write cadence is sparse — handful of writes per typical session, ~50 in spike cases (rapid screenshot burst, server-pushed gamedir downloads). Modern hardware handles 50 atomic-replace operations under a second. The perf concern flagged in the original finding was theoretical, not real.
- **Tolerate-and-recover** (rejected as silent-failure): "discard corrupt entries without detection" is exactly the "always a bug" state the design pledges to never reach. Atomic-replace eliminates the corruption window entirely; nothing to detect.

**Operator-provided context that reframed the calculus:** "a normal quake session produces not that many files most of what it produces is screenshots demos and logs, which is quite slow, unless a user wants to take several screenshots rapidly. OR if user joins a server that downloads files from a gamedir." Spike cases bounded; atomic-replace cost is bounded.

**Net benefit beyond perf:** one consistent write-discipline pattern across all critical files (`manifest.json`, `.pending-swap.json`, `profile-roles.json`) — simpler to reason about, simpler to test, ~10 lines of code instead of ~100 for custom-format alternatives.

---

### I-6: `profile-roles.json` corruption recovery — RESOLVED

**Resolution: lift `manifest.json` discipline verbatim onto `profile-roles.json`.**

**Atomic write:** every change to `profile-roles.json` uses the same tmp-fsync-rename pattern as `manifest.json` and `.pending-swap.json`. One consistent pattern for all critical write paths.

**History file:** peer artifact `profile-roles-history.json` — append-only log of `{timestamp, primary_profile_id, active_profile_id, gesture}` records. Every change appends a new entry before the atomic-write of the main file. Bounded (last N=50 entries, rotated; tunable at Arc B perf testing).

**Corruption recovery on launch (three-step):**

1. Try to load `profile-roles.json`. If parse succeeds → done.
2. If parse fails → walk `profile-roles-history.json` backward, find the most recent valid entry → rebuild `profile-roles.json` from it. Surface warning: *"Recovered profile state from history; last action may have been lost."*
3. If `profile-roles-history.json` is also corrupt → default to "first profile found in `profiles/` is primary and active." Surface explicit warning: *"Profile state corrupted; using safe default. Pick your primary in settings."*

**Why history-replay over warehouse-walk:** for `manifest.json`, history-replay walks the manifest version chain (which encodes content), with a final fallback being hash-walk-tree-rebuild. For `profile-roles.json`, there's no "content" to rebuild — just two pointer values. History-replay is the natural recovery primitive. Warehouse walking doesn't help (it doesn't know which profile was primary).

**Edge case:** single-profile users hit step 3's "first-profile-found" path naturally (the only profile = primary + active by definition).

**Tunables deferred to Arc B implementation + perf testing:** history retention size, safe-default behavior when both files are corrupt.

---

### I-8: Multi-engine quakedir policy — RESOLVED

**Resolution: single merged profile per data-root, NOT one-profile-per-engine.**

**Discussion arc:** initial Claude recommendation was "one profile per detected engine with a paired_with relationship." Operator pushed back: *"if you import a quakedir that has both clients, paths don't collide — why force two profiles?"* Layer 1 path-rule verification confirmed the operator's claim (see C-8's table above): `/qw` and `/id1` are shared base dirs both engines read; engine-specific content lives in `/ezquake` and `/fte` with no filesystem collisions for content reads. Claude's earlier reasoning conflated "the role classifier must know which engine" with "the profile must be split per engine" — those are different concerns. Pivoted to merged.

**The merged model:**

- One profile per identity-in-this-data-root. Manifest carries ezQuake-side entries (`ezquake/configs/*`, `ezquake/huds/*`, `ezquake.exe`), FTE-side entries (`fte/configs/*`, FTE DLLs + binary), and shared content (`qw/*`, `id1/*`) — all role-tagged.
- Manager groups by engine for browsing ("ezQuake-side / FTE-side / shared" filters). Filesystem stays one quake dir; per-engine view is pure UI.
- "Different content per engine" → user creates a second profile via clone-and-customize. Common case (shared identity across both engines) gets the default; bespoke case has a clear path.

**Rejected alternative: "two virtual dirs underneath one profile."** Operator floated this. It's the merged model with a per-engine view in the manager — same architecture, different UX presentation. No need to model two physical dirs.

**Launcher:** runtime selection. Profile manager shows the active profile; engine launcher buttons live next to it ("Launch ezQuake / Launch FTE"). Profile doesn't preference one engine.

**Migration UX:** classifier scans, detects engines, creates one profile. No "merge or split?" prompt during migration. Domain inspection at import shows engine-side and shared buckets so user can include/exclude per bucket.

**Recipient with only one engine:** clone-modal-at-import has per-bucket include/exclude (operator's existing pattern). Recipient with only ezQuake unchecks FTE-side buckets; manifest doesn't carry them. Backup-bloat dies at the same gesture.

**FTE-vision alignment (operator's long-term play):** a new player trying FTE-in-browser can import a published profile (e.g., paradoks-default) and get *both* the ezQuake setup AND the FTE setup pre-converted by the publisher. One gesture, two engines ready. That's the friction-zero bridge story — only works if profile-as-cross-engine-identity is the default. Per-engine profiles would force the new FTE user to hunt down a separately-published FTE profile, re-introducing friction the long-term vision pledges to eliminate.

**Engine-coupling reframe (correction to original Claude reasoning):**

- *"Per-role materialization mode diverges by engine"* — wrong frame. Mode is `copy` vs `hardlink` based on whether the engine truncate-writes the file; both ezQuake and FTE truncate-write configs. Mode is per-role, and the role *already encodes the path*; no extra disambiguation needed.
- *"Reload-cost registry differs (ezQuake Class 1, FTE Class 3)"* — true but runtime-only. Swap mechanism picks the right class based on which engine is currently running, regardless of profile model.
- *"Forking semantics"* — Arc G's per-config history covers within-profile experimentation via checkpointing. Fork is the heavy gesture; checkpoint is the light one.

---

### I-9: Primary-profile-delete prompt copy — PENDING SPEC AMENDMENT

Mechanical wording fix from the original finding. Resolution wording locked:

> *"To delete the primary profile while others exist, first designate a different profile as primary."*
> [Choose new primary] [Cancel]

Drops into the spec amendment cluster. No design content beyond the prompt copy.

---

### I-10: Stale lockfile recovery — RESOLVED (simpler than originally framed)

**Resolution: drop the four-layer defense; use Tauri's `single_instance` plugin + documented data-root contract + atomic-write discipline.**

**Discussion arc:** initial Claude recommendation was "heartbeat + two-stage force-unlock + cross-machine warning copy" — four mechanisms. Operator pushed back: *"is it that complicated to prevent the app from running multiple instances? it requires 4 levels of defense?"* That reframing exposed over-engineering — the four-layer tower was solving problems Tauri's plugin already solves (same-machine multi-launch) or that don't really apply at V1 (cross-machine mounts on a network share).

**The simpler model:**

1. **Tauri's `single_instance` plugin** handles the same-machine case completely. Second launch fires a callback that focuses the existing window via IPC. User sees their already-running instance pop to front. Standard pattern. No lockfile, no prompt, no heartbeat.

2. **Cross-machine network mounts** (rare, self-inflicted) — documented as out-of-scope: *"slipgate's data-root must not be mounted on multiple machines simultaneously."* Niche, easy to document, not worth four layers of defense.

3. **Crash recovery** — already handled by atomic-write discipline (I-5, I-6, `manifest.json`). A crashed slipgate leaves no partial state visible; next launch starts cleanly. No lockfile detection needed.

4. **Optional `running.json` diagnostic file** — low-cost info artifact. Records `{pid, hostname, started_at, version}` for debug breadcrumbs. *Not* a defense mechanism; useful when a user reports "slipgate did something weird" and developer wants to know what state was active. Operator confirmed: "lets add the running.json we might be able to get use out of that during future development as well."

**Net: one mechanism instead of four.**

**W-9 (hostname instability) becomes moot** — there's no hostname check to fail.

---

### I-12: Offline role validation strictness — RESOLVED

**Resolution: soft-fallthrough (don't block import on unknown role).**

- Known role → proceed normally.
- Unknown role → import-succeeds-with-warning. Entry imported as `unclassified` (catch-all class). Manifest still imports; entry visible in Manager with warning badge: *"unknown role: `<role-name>` — your slipgate doesn't recognize this yet."*
- Materialization still works (target_path known, SHA known); safe defaults for role-derived behavior: copy mode for materialization (safer, no truncate-write corruption risk for unknowns), Class 3 for swaps (engine restart, safest).
- **Next registry sync self-heals.** If the registry contains the previously-unknown role, the entry's classification self-heals (re-tagged with the real role). No user gesture required.
- If the role never gets recognized (publisher used a custom/experimental role that didn't propagate), entry stays `unclassified` indefinitely — equivalent to quarantine class. Backed up, materialized, but no role-specific handling.

**Why this is the right shape:**

1. **Offline pledge holds.** No sign-in gate on profile import.
2. **Two-growth-axes works.** Catalog can add roles freely; old slipgates absorb them via delta-sync without breaking.
3. **No silent failure mode.** Unknown-role entries are visible and labelled, not dropped.
4. **Self-healing.** Most unknowns resolve when registry catches up; user doesn't have to take any action.
5. **Quarantine integration.** Same `unclassified` fallthrough class W-11 uses for unrecognized residue covers this case too. One bucket, two source paths.

**Reframed during discussion** (operator framing): well-formed manifests rarely produce unknown-role entries — publisher's slipgate already validated the roles before publishing. This is the rare-edge-case safety net, not a common failure mode. Three failure modes that trigger it: (a) publisher's registry is ahead of recipient's by a sync (most common), (b) experimental/custom role, (c) corruption.

**Bad-actor analysis** (operator-driven): CAS protects against blob tampering (recipient hashes locally; mismatch = drop). User-gesture protects against unwanted import (drag-and-import requires explicit consent). Remaining attack surface is social engineering — *"I trick you into importing my profile, then my malicious autoexec.cfg rebinds your keys."* That's a trust-the-source concern, not a manifest-validation concern. Hub moderation (V1+) addresses public-import; peer-import remains "trust your friend." Standard sharing-economy risk.

**Generalizes to a substrate principle** (see metadata-enrichment principle near the architecture-principles section):

> *Metadata enrichment is delta-sync-driven, not user-driven.* Blob identity (XXH3-128) is immutable; metadata (role, author, provenance, bundle, license) grows via catalog sync. User actions add or remove blobs in profiles; metadata accuracy is a catalog-axis concern that self-heals over time.

**Implicit answer from operator's framing on materialization:** `unclassified` entries materialize to tree by default (target_path is known, SHA is known); only entries with missing SHAs get greyed-out per I-3's V1 surface.

---

### I-13: Publish UX V1 surface — PENDING SPEC AMENDMENT

Spec amendment to clarify V1 ships without publish UX. The publish *contract* (manifest schema, parent_manifest_sha lineage, blob upload format) is locked at V1 so that hub-side admin tooling can publish starter profiles. The *user gesture* lands V1+.

**Locked amendment wording** (drop near `architecture.md:1388-1395` in the Cloud catalog interaction section):

> **V1 publishing surface:** V1 ships **without user-facing publish UX**. The publish *contract* (manifest schema, parent_manifest_sha lineage, blob upload format) is locked at V1 so that hub-side admin tooling can publish starter profiles. The *user gesture* — "Publish" button, pre-publish-review modal consumer (the 7th clone-modal consumer), public/friends-only/private toggle, manifest-vs-bundle export choice — all land V1+ alongside Arc H.
>
> V1 user-facing sharing surface is: (a) import hub-vetted starter profiles, (b) import peer-share bundles (`.slipgate-bundle.zip`), (c) import standalone manifests (greyed-out entries fill via local asset-import per I-3 resolution). Profile *export* and *publish* are V1+ gestures.

No design content beyond the clarification. Drops into the spec amendment cluster.

---

## Architecture principles — additions

### Substrate principle: metadata enrichment is delta-sync-driven, not user-driven

Surfaced during 2026-05-12 second design discussion. Generalizes the I-12 self-healing pattern.

> **Blob identity is immutable; metadata grows.** A blob is identified by its content address (XXH3-128). Metadata about that blob — role, author, provenance, bundle membership, license, classification confidence — is mutable and grows over time via catalog delta-sync from hub. User actions add or remove blobs in profiles; metadata accuracy is a *catalog-axis concern* that self-heals over time.

**Concrete examples:**

- Today: user imports a folder with paradoks's custom walls. Tier-2 classifier (W-11) classifies them as `texture:wall` via path-pattern evidence from extractor data. Metadata = "engine-source-inferred." Anonymous blob in warehouse.
- Tomorrow: paradoks publishes the pack to hub with full metadata. Delta-sync brings metadata.
- User's slipgate sees: "your `texture:wall` blob (XXH3 X) is now identified as `paradoks-custom-walls-v1` by paradoks. Bundle metadata updated."
- Manager UI now shows it in a "From paradoks" group.

**Implications:**

- Metadata fields are append-only growth via sync; user actions never *reduce* metadata accuracy (they may move blobs between profiles, but never strip metadata).
- Unknown-role entries (I-12) and engine-source-inferred entries (W-11) are *bridging states* — they get more accurate as the catalog catches up.
- The two-growth-axes principle (`architecture.md:1763-1770`, *"code grows recognition, catalog grows corpus"*) extends to: **catalog also enriches existing-blob metadata, not just adds new blobs.**

---

## Second-pass review (2026-05-12 evening): simplifications + cross-platform commitment

> Captured 2026-05-12 evening from a third design pass with two lenses applied in sequence: (1) "find over-engineering" — did each resolution pick the simplest viable solution? — and (2) "is this actually cross-platform?" — `apps/slipgate-app/VISION.md:33` pledges Windows + macOS + Linux but current resolutions implicitly assume Windows. Both lenses surfaced amendments smaller than full findings; they're captured here for inclusion in the C-1 through I-13 amendment cluster.

### Simplification candidates (S-1 through S-5)

Each below is a PROPOSED follow-on to the original resolution. Adopting drops scaffolding the resolution invented while staying within the design constraints; rejecting keeps the existing resolution verbatim.

**S-1 — Drop `profile-roles-history.json` (I-6 follow-on).**

*Plain English:* if the small file tracking "which profile is your primary / active" ever gets corrupted on disk (extremely rare), don't maintain a separate 50-entry history file with rotation logic just to replay pointer states. Atomic-write the main file, and on corruption surface a one-time "pick your primary again" prompt. You lose nothing meaningful.

*Why it's safe:* I-6 framed the history file as "discipline lifted verbatim from `manifest.json`." That framing doesn't hold up — `manifest.json`'s history is *structural* (the `parent_manifest_sha` lineage encodes content versions), while `profile-roles.json` is two pointers and a timestamp with no content to chain. The history file is invented mechanism, not a lift. Atomic-write alone closes the corruption window.

*Cost saved:* ~40 LOC (history walk + rotation + tunables), one file off disk, one Arc B perf-testing tunable.

**S-2 — Drop `.slipgate-light/import-log.json` + `observations.json` (C-2 follow-on).**

*Plain English:* Light mode should remember nothing. When you upgrade Light → Managed, the migration code already knows how to scan a dir from scratch; that's the same code path every other "managed an existing dir" case uses. The Light-mode state file just optimizes a one-time event.

*Why it's safe:* C-2 pitched Light as having "minimal state," then invented two persistent state files in `.slipgate-light/`. The contradiction was hiding inside the resolution. Migration's classifier walk is fast (hash-match against catalog registry); re-classifying at promotion time is the same path the classifier already runs for every never-managed dir. Optimization-without-real-payoff.

*Cost saved:* two files off disk, persistence layer, Arc D consumer logic for reading the Light state.

**S-3 — Collapse C-8 motion 1 + motion 2 into one `scan_homedir()` primitive.**

*Plain English:* talk about homedir-scan as one operation that fires at certain triggers, not as "take-over migration" plus "ongoing scan" (which is the same scan, just at different times).

*Why it's safe:* C-8 named three motions; motions 1 (take-over) and 2 (ongoing) are the same code path. First invocation at first-managed-promotion does the heavy lift; subsequent invocations are mtime-delta-only and effectively free. Motion 3 (`-nohome` injection) is separately a CLI-flag inject, not a scan — it stays distinct.

*Cost saved:* wording cleanup, not code reduction. The spec currently reads as if there are three things to build; there are two.

**S-4 — Drop `source_root: homedir` manifest annotation (C-8 follow-on).**

*Plain English:* don't tag manifest entries with "this came from homedir." The role tag already says what kind of file it is, and slipgate never writes back to homedir, so the tag is metadata-only with no consumer.

*Why it's safe:* with no materialize-back to homedir (per C-8's resolution), there's no runtime decision that consults `source_root`. The role (`user-content:save`, `cache-ephemera`) carries all classification info. Same-target collisions between basedir and homedir resolve via C-2's hash-dedup primitive at scan time — no annotation needed.

*Cost saved:* one schema field with zero consumers.

**S-5 — Reframe C-5 pre-push validation as exception assertion, not user UX.**

*Plain English:* if a blob ever exceeds GitHub's 100MB limit, that's a bug state, not a routine user-facing choice. Don't show a three-option modal asking the user to pick between local-external, LFS, and exclude. Just auto-route to local-external and surface a clear "this shouldn't happen — please report" diagnostic.

*Why it's safe:* operator data point (2026-05-12 evening): largest legitimate asset in a manifest is ~30MB (a single map). Demos/screenshots/logs (which can run gigabytes for bloodfest world-record attempts) are excluded from backup by the publish rule. After explode-everything (C-5), monolithic paks are gone — individual exploded assets are KB-MB. A >100MB blob in a manifest is structurally impossible in normal operation; the pre-push validation is an invariant assertion that ~never fires.

*Cost saved:* three-option modal UX, LFS authentication/billing handling, "exclude these blobs" path (which silently lost backup coverage anyway). Keep the validation as a defensive log + fall-back; drop the user-facing surface.

### Cross-platform commitment (Path B)

**Decision: spec for cross-platform now, ship Windows-only V1, Linux/macOS implementation lands in later arcs.**

Rationale: the spec absorbs cross-platform almost for free (~30 minutes of amendment work). The expensive part is implementation (build + test on each OS), and that cost lands in arc execution regardless of when the spec becomes portable. Capturing the portable shape now avoids the "shoehorn-Linux-into-Windows-shaped-spec" tax later, and keeps the VISION.md cross-platform pledge honest without forcing pre-V1 build expansion.

- **V1 ships:** Windows-native build, full feature coverage.
- **V1 spec captures:** portable mechanisms with per-platform implementation notes.
- **Lands later:** actual Linux/macOS builds and arc-level testing on each platform.

### Cross-platform mechanism table

Per-platform implementation choices for items the current resolutions underspecify. Windows column is V1; Linux / macOS columns are spec-captured-now-implemented-later.

| Concern | Windows V1 | Linux | macOS | Notes |
|---|---|---|---|---|
| Engine binary names (C-1 process-scan) | `ezquake.exe`, `fteqw.exe`, `ktx.exe`, `mvdsv.exe` | `ezquake-linux-x86_64`, `fteqw-sdl`, `ktx`, `mvdsv` | (TBD when build target lands) | Per-platform binary-name table consulted by Defense-1 process scan |
| ezQuake homedir path (C-8) | `~/Documents/ezQuake/` | `~/.ezquake/` | `~/Library/Application Support/ezQuake/` (likely) | Path resolves per-platform via Tauri's `app_data_dir`-equivalent; FTE has no homedir convention |
| Hardlink primitive | `CreateHardLink` | `link(2)` | `link(2)` | Both reject cross-volume / cross-filesystem; same constraint, different vocabulary |
| Hardlink-cap failure mode | `ERROR_TOO_MANY_LINKS` (1023 default) | `EMLINK` (~65k on ext4) | `EMLINK` (varies by FS) | Fallback to copy-mode on failure (per W-1) |
| OS-level read-only on blobs (C-2) | `SetFileAttributesW` + `FILE_ATTRIBUTE_READONLY` | `chmod 444` | `chmod 444` (+ optional `uchg` flag) | Per-platform syscall. Linux mode-444 is visible to all OS users; data-root sits under per-user home so practical impact zero |
| Filesystem watcher (Defense 1 backend) | `ReadDirectoryChangesW` (single recursive handle) | `inotify` (one watch per dir; library walks tree) | `FSEvents` (file-level coalescing) | All handled by `notify-debouncer-mini`; no spec-level concern |
| Single-instance enforcement (I-10) | `tauri-plugin-single-instance` | same | same | Cross-platform plugin; behavior consistent |
| Path separators in manifest | Forward-slash (translated to backslash at materialize) | Forward-slash native | Forward-slash native | Manifest always stores forward-slash regardless of platform |
| Case sensitivity | Case-insensitive | Case-sensitive | Case-insensitive default (APFS configurable) | Manifest preserves original case; comparison is lowercase. QW content convention is lowercase, collisions ~never |
| Max-path constraint | 260 (MAX_PATH default) / 32K with `\\?\` prefix | 4096 (PATH_MAX) | 1024 | ~200-char manifest cap covers all platforms with headroom |
| File-lock semantics | Exclusive locks held by writers | Advisory (`flock`); rarely used by Quake engines | Advisory | Defense-1 uses process-scan + stable-mtime as universal signals; lock-detection-as-bonus is Windows-only |
| inotify watch budget (Linux only) | n/a | `fs.inotify.max_user_watches` default 8192 on older distros, 524288 on modern | n/a | Quake-dir scope (~100 folders typical, ~1000 worst-case heavy mods) sits well under all limits; non-issue per operator-verified file-count (84 folders / 9.2K files / 23GB real-world dir) |

### Issues addressed

The cross-platform commitment closes the X-1 through X-6 gaps surfaced in the prior session:

- **X-1** (C-8 mis-scoped as Windows-only) — fixed by parameterizing the ezQuake homedir path per the table above. Linux ezQuake users get the same scan-and-import + `-nohome` injection coverage as Windows users.
- **X-2** (engine-process scan hardcoded `.exe`) — fixed by the per-platform engine-binary-name table above.
- **X-3** (inotify watch-descriptor limits on Linux) — dismissed as non-issue. Quake-dir scope sits well under limits even on older distros; documented in the table for future-reference.
- **X-4** (case-insensitive lowercase normalization is Windows-shaped) — acknowledged in table. Practical impact zero for QW content (lowercase convention since 1996).
- **X-5** (OS-level read-only mechanism per platform) — captured in table; per-platform syscall noted.
- **X-6** (lock semantics asymmetry) — acknowledged in table. Defense-1 uses universal signals; lock-detection-as-bonus is Windows-only and not load-bearing.

---

## Recommended next steps for the operator

> Updated 2026-05-12 (second design discussion) to reflect post-discussion state. The original review's recommended sequence has been substantively overtaken; what follows reflects current reality.

### Immediate (V1 prep)

1. **Spec amendment cluster — Critical findings.** All 8 Criticals (C-1 through C-8) are settled in design. Amendment work is mostly mechanical; design content lives in the *Resolution log* section above.

   Sub-clusters:
   - **C-1:** Defense 1 reframe + four failure-mode walks + mod-cache-as-index clarification. Connect Defense 2 stable-mtime to cfg_save_onquit timing. Folds I-2 / I-7 / I-11.
   - **C-2:** Light↔Managed mode section. Mode marker storage, Light capability surface, mode demotion gesture, OS-level read-only blobs, updater mode-split, V1 default = Light. Apply S-2 (drop `.slipgate-light/` state files; Light is zero-state) from the second-pass section.
   - **C-3:** Case 2 dispatch default (auto-apply); generalize to "engine-mediated writes in known-good roles are implicit-intent-declared."
   - **C-4:** Stock-pak handling rewrite — strip stock SHAs from manifests; per-asset origin tagging at first-launch; off-registry "user-provided unverified" path.
   - **C-5:** Explode-everything storage model section; per-asset `role` + `origin` schema; lossless-export operationalization with byte-identical pak rebuild as the target. Apply S-5 (pre-push validation is exception-assertion, not user UX; drop the three-option modal) from the second-pass section.
   - **C-6:** One-line manifest "unfiltered snapshot" rewrite per the original finding's proposed wording.
   - **C-7:** SHA-256 → XXH3-128 sweep. Touches every `sha256` reference site across the architecture spec, the SHA256 governance section, schema field names, and downstream references.
   - **C-8:** New "Engine homedir as second data-root" section. Path-rule table (basedir + homedir per engine); scan-and-import model; `-nohome` injection; role classification (`user-content:save`, `cache-ephemera`, ignore). ezQuake-specific (FTE has no homedir); homedir path resolves per-platform via the cross-platform mechanism table below (Windows: `~/Documents/ezQuake/`, Linux: `~/.ezquake/`, macOS: `~/Library/Application Support/ezQuake/`). Apply S-3 (one `scan_homedir()` primitive, not "take-over + ongoing") and S-4 (no `source_root` annotation) from the second-pass section.

2. **Spec amendment cluster — Important findings (mechanical).** Most are now design-settled; amendments are mostly wording / spec-clarification:
   - **I-3:** Two-reality framing section. V1 import surface = hub-vetted starter profiles + peer-share bundles + standalone manifests with greyed-out-fillable. Reality-2 (V1+ Arc H) elements deferred.
   - **I-5:** Add `.pending-swap.json` to atomic-write discipline section (alongside `manifest.json`).
   - **I-6:** Add `profile-roles.json` to atomic-write discipline section. Apply S-1 (drop `profile-roles-history.json`; corruption recovery is one-time re-pick-your-primary prompt, not history-replay) from the second-pass section.
   - **I-8:** New "Multi-engine quakedir policy" section in Arc D / migration scope. Single-merged-profile model + role-tag-based engine compartments + runtime engine selection.
   - **I-9:** Mechanical wording fix per the resolution log entry.
   - **I-10:** Replace stale-lockfile section with simpler Tauri-`single_instance` + documented single-mount contract + `running.json` diagnostic file note.
   - **I-12:** Soften manifest-import role validation per the resolution log entry; reference the new metadata-enrichment substrate principle.
   - **I-13:** Add "V1 publishing surface" clarification per the resolution log entry's locked wording.

3. **New substrate principle to spec.** Add the *metadata enrichment is delta-sync-driven, not user-driven* principle to the architecture-principles section. Frames the I-12 self-healing pattern and the W-11 source-evidence-inferred classification as bridging states that get more accurate over time.

4. **New Worth-a-closer-look item (W-11) for arc-planner consideration.** Import-classification handler UX (three-tier classifier + quarantine). Carries to Arc D (migration) and Arc E (watcher) brainstorms; the classifier is shared.

5. **Verification spike: ezQuake `Cmd_Exec_f` path resolution (I-4).** 30 minutes. Confirms whether Class 1 delta-script can live in OS temp or must be inside the profile tree.

6. **Verification spike: FTE `cfg_save` source-walk (I-1).** Half-day. Confirms whether per-role copy-mode applies cleanly to FTE.

7. **Cross-platform spec amendment (Path B).** New top-level spec section capturing the cross-platform mechanism table from the second-pass review. Touches: C-1 (engine-binary-name table), C-2 (per-platform read-only syscall), C-8 (per-platform homedir path), filesystem-watcher backend notes, single-instance plugin, path/case-sensitivity rules, lock-semantics asymmetry. V1 builds Windows-only; spec stays portable. ~30 minutes of writing.

Spikes 5–6 can happen in parallel with the amendment cluster.

### Folded by C-1's resolution

- **I-2** (slipgate-closed reconciliation) — covered by startup reconciliation pass
- **I-7** (mod-cache-vs-library precedence) — covered by mod-cache-as-index model with policy-on-entry distinguishing transient vs kept
- **I-11** (server-pushed gamedir bandwidth waste) — covered by mod-cache materialization story (content stays available across sessions; no re-download)

### Folded by I-10's resolution

- **W-9** (lockfile hostname check assumes stable hostname) — moot; no hostname check in the simpler model.

### Worth-a-closer-look findings (carry forward)

W-1 through W-8 + W-10 carry into Arc A and Arc E brainstorms; each is bounded and tagged with which arc owns it. **W-11 (import-classification handler) is new and carries to Arc D + Arc E shared classifier work.**

### Doc hygiene (N-1 through N-6)

Deferred to a final pre-arc-planner doc-hygiene pass. Low priority.

### Parked for V1+

- **Free-baseline install / nQuake-equivalent starter kit** (per C-4 resolution). Recreates nQuake's bundling decisions — objective compatibility verification + legal vetting + subjective curation (which textures, which mods). Sized for its own arc. Positioned as a positive adoption lever for new-to-Quake users entering the QW community.
- **pak-builder script** (companion to the existing pak-extract.py) — 1-hour write whenever Arc A starts. Used for round-trip verification (extract → rebuild → SHA compare) to confirm byte-identical pak0/pak1 rebuild capability.
- **P2P send-anywhere-style transfer** (per I-3 resolution). Drag-and-drop with PIN code, WebRTC NAT-bypass relay. Captures "share with one specific person, not the world" case without going through hub moderation. Reality-2 enhancement to peer-share; V1+ arc.
- **Smart import classifier** (per W-11). The V1+ version with full SHA-registry sweep + sister-file inference + structured prompts — extension beyond the V1 source-evidence + quarantine baseline. Lands when usage shows demand.
- **Hub-as-delivery surface** (per I-3 Reality-2). Moderation latency UX, "Notify me when available," sender-never-publishes recovery, moderation-rejection handling. Lands at Arc H alongside publish UX.

### Net status

The design is **ready for arc-planner after the C-1 through C-8 + I-3/I-5/I-6/I-8/I-9/I-10/I-12/I-13 spec amendment cluster lands**, with the I-1 and I-4 spikes folded in, the second-pass simplifications (S-1 through S-5) absorbed into their parent C/I sub-bullets above, and the cross-platform amendment (item 7) added. **All Critical and all Important findings are now settled** — no remaining design-tier work before arc-planning. Worth-a-closer-look items (W-1 through W-8, W-10, W-11) carry into the relevant arc brainstorms as known-but-bounded design questions, with arc ownership tagged on each.
