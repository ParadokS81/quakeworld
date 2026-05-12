# Slipgate Managed Mode -- Design Review Findings

> Captured 2026-05-11 by Reviewer B (Claude Sonnet 4.6). Cold-eyes review of the architecture spec post-Pass-6. Written independently from any prior brainstorm session context.

## Summary

The design is architecturally coherent and internally consistent at the macro level. The foundational primitives (content-addressed storage, manifest-as-profile, materialization-as-view, hard-fork-with-drift-detection) are well-reasoned and mutually consistent. Six passes of brainstorming have closed most obvious surface-area gaps.

The main risks fall into three clusters: (1) several load-bearing-but-unverified assumptions about engine behavior that the spec correctly flags but hasn't verified empirically (particularly FTE config write behavior and the Class 1 `exec` delta-script path resolution); (2) a handful of missing "Defense 1 assumption held" prerequisites for the capture/swap pipeline that break when the user launches the engine outside slipgate's control; and (3) the GitHub backup architecture has an unacknowledged hard file size constraint (GitHub's 100 MB per-file limit blocks large paks/maps) that can silently cause push failures for a non-trivial slice of users.

None of these are design-level breaks -- they are spec gaps, unverified assumptions, and underspecified edge cases that arc-planner needs to carry. There are no contradictions that would require a Pass 7 re-brainstorm.

---

## Critical findings (must address before arc-planner)

### C-1: Defense 1 breaks when user launches engine via OS shortcut

**Finding:** Defense 1 ("never process during engine session") gates Stage 2 processing on whether slipgate has a running engine handle. The spec confirms both paths: (a) slipgate-launched, where slipgate holds the process handle and sees engine-exit; and (b) OS-shortcut-launched, where slipgate does not hold the handle and cannot know whether an engine session is active.

Architecture spec line 815: "Engine-exit (auto): when slipgate sees the launched engine instance terminate, surface the cleanup notification." This implies slipgate must have launched the engine to see its exit. Line 1869 confirms "users can also create OS-level shortcuts pointing at engine.exe with `-basedir` set." These two facts create a gap: if a user launches via an OS shortcut, slipgate's process-tracking has no handle, and Defense 1's "never process during engine session" cannot be enforced. The watcher will still observe file events (Stage 1), and the idle-nudge Stage 2 trigger (architecture spec line 817) could fire while the engine is actively running and writing configs.

**Why it matters:** The entire capture/swap pipeline safety model depends on Defense 1 holding. A Stage 2 processing run while the engine is mid-write on a config file will read a partially-written blob (Defense 2's stable-mtime check mitigates but doesn't eliminate this -- a file written in two syscalls with an idle gap between them passes the stable-mtime check). This is precisely the failure class the two-stage pipeline was designed to eliminate.

**Suggested resolution path:** Either (a) spec must state that shortcut-launched sessions disable the watcher entirely until slipgate can confirm engine exit via polling, or (b) slipgate must scan for running engine processes on watcher-init and on every Stage 2 trigger (PID scan for `ezquake.exe` / `fteqw.exe` processes using the active profile's basedir). Option (b) is more robust since it catches engine restarts that didn't go through slipgate. Needs a spec amendment before Arc E implementation.

**Relevant spec locations:** Architecture spec: "Filesystem watcher contract -- Defense 1" (line 834), "Engine integration -- Launch UX" (line 988), "Open architectural questions item 4" (line 1869).

---

### C-2: GitHub backup hits hard 100 MB per-file limit for large blobs

**Finding:** Architecture spec (line 1602) states: "~100 MB Quake dir (operator's measured ~130 MB textures dir alone) fits in a single GitHub repo without LFS." This conflates two different GitHub limits. GitHub enforces a **100 MB per-file limit** (hard; push is refused) separate from the repo total size limit. A single large blob -- e.g., a big pak file, a texture-heavy map `.bsp`, or even the id1/pak0.pak at ~18 MB -- is not the problem. But users who have accumulated large custom paks (possible in the 50-200 MB range) or large map compilations will have individual blobs that exceed 100 MB. More concretely: the textures dir the operator measured at ~130 MB may contain individual `.tga` or `.png` files or `.pak` archives that exceed 100 MB individually.

The spec currently says ">1 GB users fall back to local-external" -- but the actual threshold for failure is a single file exceeding 100 MB, not repo total. This can silently fail for a user whose total dir is 200 MB but has one 110 MB pak.

**Why it matters:** A backup that silently fails or requires LFS setup is worse than a backup that doesn't exist -- the user believes they're protected. The lossless-export pledge and the backup architecture are the two recovery paths; if backup silently fails, the user may have no cloud safety net.

**Suggested resolution path:** (a) Pre-push validation: before each backup, scan all blob files for the per-file threshold and fail fast with a clear "N blobs exceed GitHub's 100 MB per-file limit. Use local-external target or enable GitHub LFS." (b) Or spec explicitly adds GitHub LFS as V1 option when blobs exceed the limit. Either way the spec must acknowledge the per-file limit, not just the repo-total envelope.

**Relevant spec locations:** Architecture spec: "Backup and Restore UX -- V1 backup targets" (line 1602), "Backup payload over time" (line 1648).

---

## Important findings (worth addressing before V1 ships, but not blocking arc-planner)

### I-1: FTE config write behavior unverified (per-role materialization mode assumption)

**Finding:** The per-role materialization mode decision (copy for configs, hardlink for everything else) is specifically verified for ezQuake's `cfg_save` truncate-write behavior (source-walked at `src/config_manager.c:826` etc.). The spec explicitly flags in review-prep item 3: "NOT verified for FTE / QWFWD / other forks."

Architecture spec line 227 explains the rationale entirely in terms of ezQuake behavior. If FTE uses a different config write pattern -- e.g., it writes to a new temp file and atomic-renames, or it writes via a different API that does not truncate-write -- then the copy-mode decision is correct but the hardlink exemption for FTE configs might be incorrect OR the whole per-role mode decision is too conservative for FTE. More importantly, if FTE writes to non-config files via truncate-write (HUD state files, skins cache, etc.), those files would corrupt their hardlinked warehouse blobs.

**Why it matters:** FTE is a V1-supported engine. The per-role materialization mode decision is foundational (it affects Arc A/B's materializer). Getting it wrong for FTE means either silent blob corruption (if FTE writes to hardlinked non-config files) or unnecessarily conservative copy-mode application.

**Suggested resolution path:** Source-walk FTE's config save code (`sv_save` / `Cmd_WriteConfig` or equivalent) to verify write pattern, same as the ezQuake source-walk done for Pass 5.1. Flag any FTE-written non-config files that use truncate-write semantics. Add those roles/paths to the copy-mode table or to the engine-runtime allowlist as appropriate.

**Relevant spec locations:** Architecture spec: "Materialization as view -- Per-role materialization mode" (line 218), review-prep item 3.

---

### I-2: Class 1 delta-script `exec` path resolution is unverified

**Finding:** The Class 1 swap sends mailslot commands including `exec <delta-script>`, where `<delta-script>` is written to a temp file (architecture spec line 1108: "write to a temp file, send `exec <path>` via mailslot"). The problem: ezQuake's `exec` command resolves paths relative to the engine's search path (relative to `-basedir`). A temp file written by slipgate to an OS temp directory (e.g., `C:\Users\user\AppData\Local\Temp\delta-12345.cfg`) is outside the engine's search path and will not be found by `exec`.

The spec verifies that `exec` is additive (line 1078, `Cmd_Exec_f` at `src/cmd.c:552`), but does not verify or specify where the delta script is written. If it's written to an OS temp path, `exec` will fail silently (command not found = no error, no cvars applied). If it must be written inside the profile tree under a known path, that adds complexity (temp file cleanup, name collision avoidance, path sanitization).

**Why it matters:** Class 1 swaps are the "zero-restart config push" feature that makes ezQuake profile-switching seamless. If the exec path is broken, all Class 1 swaps silently fail and degrade to needing a full manual config reload by the user -- the feature appears to work but does nothing.

**Suggested resolution path:** Verify via ezQuake source whether `exec` accepts absolute paths or only search-path-relative paths. If search-path-relative only: spec must document that the delta script is written to a known path inside the profile tree (e.g., `qw/.slipgate-swap.cfg`) and cleaned up after delivery. This is a V1 implementation detail that needs to be settled before Arc B/E, not left to arc-planner to discover.

**Relevant spec locations:** Architecture spec: "Engine integration -- Runtime swap classes -- Class boundary computation" (line 1108), "Search-path resolution" (line 1128).

---

### I-3: `.pending-swap.json` write integrity is underspecified

**Finding:** The watcher appends to `.pending-swap.json` continuously (Stage 1 observe loop). The spec specifies atomic write for `manifest.json` (line 108: `manifest.json.tmp` -> fsync -> atomic rename), but does not specify how `.pending-swap.json` writes are handled for integrity. It is described as a "notebook" the watcher "appends" to (line 812), but append-to-a-file is not atomic on Windows (no O_APPEND equivalent that serializes across processes; NTFS doesn't guarantee append atomicity).

If slipgate crashes mid-append to `.pending-swap.json`, the file may be corrupt (incomplete JSON). On next launch, reading a corrupt `.pending-swap.json` either produces a silent loss of pending entries (if slipgate ignores parse errors) or blocks startup (if it throws on the corrupt file).

**Why it matters:** The capture/swap pipeline depends on `.pending-swap.json` as a durable record of what needs processing. Loss of this file means the user loses the record of file changes that need warehousing -- they might not notice until a config update is silently dropped.

**Suggested resolution path:** Spec should explicitly state the `.pending-swap.json` write strategy: either (a) atomic-replace (write full new content to `.pending-swap.json.tmp` then rename, same as manifest) on every watcher event (potential perf concern for high-frequency events), or (b) structured append with per-entry length prefix so partial-entry corruption is detectable, or (c) explicit tolerance: on corrupt-parse, log warning, discard corrupt entries, recover partial state. Arc E needs a chosen strategy.

**Relevant spec locations:** Architecture spec: "Storage layout" (line 273), "Capture/swap pipeline -- Stage 1" (line 811).

---

### I-4: Profile-roles.json corruption recovery not specified

**Finding:** The spec details manifest corruption recovery (lines 108-113: try history, then hash-walk-tree rebuild, then surface error). But `<data-root>/profile-roles.json` -- which holds `primary_profile_id` and `active_profile_id` -- has no corruption recovery path specified.

If `profile-roles.json` is corrupted (truncated write, disk error), slipgate has no spec'd fallback. It doesn't know which profile is primary or active. The spec notes it is written atomically for manifest.json but does not say the same for `profile-roles.json`. The profile-roles-history.json (line 275) exists as an audit log, which could be used for recovery, but no recovery path is documented.

**Why it matters:** `profile-roles.json` is written on every profile switch and every "Make this primary" action. High-frequency write file with no recovery spec means an obscure failure mode produces an unrecoverable state (all profiles exist in the warehouse but slipgate doesn't know which is active or primary).

**Suggested resolution path:** (a) Specify atomic write for `profile-roles.json` (same `tmp -> rename` pattern as manifest.json), and (b) specify recovery: on corrupt load, walk `profile-roles-history.json` to find the most recent valid state; if history is also corrupt, default to "first profile found in `profiles/` directory is primary and active, with a warning." Amend spec before Arc B.

**Relevant spec locations:** Architecture spec: "Primary, active, and launched profiles" (line 239), Storage Layout (line 274), "Atomic write + corruption recovery" (line 108).

---

### I-5: Hub moderation latency for greyed-out SHAs is unbounded and unrecoverable in the UX

**Finding:** Architecture spec line 1418: "manifest references N assets not in catalog. Slipgate will notify when they become available." There is no UX path specified for "what if these SHAs are never validated?" If a user submits a profile with SHA references that the hub moderators reject (or simply never process due to capacity), the recipient's greyed-out entries have no expiry, no appeal path, and no fallback. The "Notify me when this becomes available" workflow (line 1418) has no spec for what "notify" means (push notification? in-app badge? periodic polling?).

More specifically: if a user shares a manifest of their own local, non-hub-known assets (e.g., a custom map they made and haven't published), the recipient sees greyed-out entries indefinitely with no path to acquire them. The no-P2P constraint means there's no workaround.

**Why it matters:** This is the "share my friend's setup before they've published anything" use case that the spec says "works without any handshake" (line 1423). But for assets the friend never publishes to hub, it doesn't work at all -- greyed-out forever. This is a user mental model divergence: the user thinks "I got their manifest, I can use their setup" but greyed-out assets are functionally absent.

**Suggested resolution path:** (a) UX spec should state the maximum wait time before the "Notify me when available" flow converts to "This asset is unavailable. [Request from sender / remove from profile]." (b) Or spec should explicitly state that sharing a manifest with hub-unknown SHAs is a valid partial-use case ("you get everything the hub knows; the rest is future enrichment") and the UX must communicate this clearly at import time rather than presenting it as a temporary state. Either way, arc-planner needs a spec position before Arc H.

**Relevant spec locations:** Architecture spec: "No P2P -- manifests carry placeholders for hub-unknown SHAs" (line 1415), "Retroactive metadata enrichment" (line 1421).

---

### I-6: Migration classifier must handle multi-engine dirs without a specified decision policy

**Finding:** The roadmap's Arc D section (line 243) lists "Multi-engine quake dirs (user has both ezQuake and FTE in same dir): one profile or two?" as an open question for Arc D's brainstorm. This is listed under "Open questions for arc brainstorm" -- meaning it's explicitly deferred.

However, this is not a V1+-deferrable item. The classifier is shared between Arc D and Arc E (Arc D/E invariant). If a user's existing dir has both `ezquake.exe` and `fteqw.exe` plus engine-specific configs, the migration classifier cannot correctly route them without a policy for multi-engine dirs. The per-role materialization mode decision also diverges by engine (configs are copy-mode regardless of engine, but engine-runtime allowlists are engine-specific). If the user ends up with one merged profile, which engine's runtime allowlist governs? If two profiles, which profile gets which assets?

**Why it matters:** This question is listed as open in the roadmap but it is load-bearing for Arc D. A user with both engines (not unusual in the QW community -- ezQuake for competitive play, FTE for recording/spectating) cannot be migrated correctly without this policy. Arc D's brainstorm cannot be safely deferred until implementation starts.

**Suggested resolution path:** Spec or Arc D brainstorm should lock: (a) one profile per detected engine (two profiles from one source dir), where assets used by both engines are shared as manifest entries in both profiles; or (b) one merged profile with engine-compatibility tags on engine-specific entries (but the spec dropped engine_compatibility field). Either way, this needs a decision before Arc D implementation, not during it.

**Relevant spec locations:** Roadmap: "Arc D -- Open questions for arc brainstorm" (line 240).

---

### I-7: Watcher foreground-only assumption creates a silent gap when user edits config while slipgate is closed

**Finding:** The watcher is foreground-only for V1 (confirmed line 773). This means if a user edits their config file while slipgate is closed (editing `qw/config.cfg` in a text editor while no slipgate process is running), the watcher is not running and those changes are not observed by Stage 1. When slipgate next opens, there is no re-scan of the tree to detect changes that occurred while it was closed.

The spec does not specify what happens on slipgate-open with respect to pending-tree-vs-manifest divergence. The trust-existing-tree fast path (line 623) checks hashes at rematerialization time, but rematerialization isn't necessarily triggered on app-open. If rematerialization is NOT triggered on app-open (reasonable for startup performance), then slipgate's view of config.cfg's SHA will be stale (it thinks the old SHA is current) until the next time it hashes the file.

**Why it matters:** This creates a window where the user's live config is ahead of the manifest -- slipgate's "last known version" is wrong, drift detection operates on stale data, and the per-config history view will not show the version the user edited while slipgate was closed.

**Suggested resolution path:** Spec should state that on app-open, slipgate performs a lightweight "changed files since last-seen-mtime" scan of the active profile's tree (using stored per-file mtimes from the manifest's known state) and queues any divergences into `.pending-swap.json` for Stage 2 processing before the user sees the Browse view. This is a standard "startup reconciliation pass" pattern. Add to Arc E spec.

**Relevant spec locations:** Architecture spec: "Engine integration -- Scenario 1: app-open" (line 994), "Filesystem watcher contract -- Foreground-only for V1" (line 773).

---

## Worth a closer look (load-bearing-but-unverified)

### V-1: Windows hardlink semantics in the profile tree (cross-platform implementation gap)

The spec notes at line 603: "Cross-platform decision (Windows / Linux / macOS hardlink semantics) deferred to Arc A/B implementation work." This is correctly deferred -- but the platform is Windows (Tauri desktop app), and Windows hardlinks have behavioral differences from POSIX that are worth flagging:

- Windows `CreateHardLink` requires the source and target to be on the same volume AND the same drive letter (not just the same physical disk via mount points). If the data root is on a volume accessible via different drive letters in different sessions, hardlinks will fail.
- Windows Defender and other AV products sometimes interfere with hardlink creation in directories they're actively scanning. The blob store's two-char fanout could trigger directory enumeration heuristics.
- Windows enforces a maximum hardlink count per file (1023 on NTFS). At 1023 profiles all sharing the same pak0.pak blob, the next profile materialization fails. For a community catalog-heavy user this might actually be reachable for popular shared assets.

**Verification approach:** Arc A source-walk of the Windows `CreateHardLink` documentation + test with a mock data root under Windows Defender real-time protection. The hardlink-count limit requires a mitigation plan (spec should state the fallback: copy if `CreateHardLink` returns ERROR_TOO_MANY_LINKS).

**Relevant spec locations:** Architecture spec: "Storage layout -- Layout decisions ratified in Pass 1" (line 386), "`register` -- Implementation may use `link()` directly" (line 603), "Materialization as view" (line 194).

---

### V-2: Bundle-as-manifest collapse: version ordering without explicit version field

**Finding:** Pass 6.1e locked: "Versioning falls out of name + publisher + publish ordering (v1.0 / v1.1 are two manifests sharing name+author)." The catalog data shape (line 1445) shows `version` field as optional. When `version` is absent (common case in QW community), versioning falls out of publish order.

This assumption holds as long as the catalog sorts and presents manifests by publish-time. But: (a) What is the canonical version ordering for a user who downloaded v1.0 of a bundle and then discovers v1.1 exists? The local download log records the download event but not the catalog-relative ordering. (b) If hub moderation accepts v1.1 before v1.0 (delayed moderation), publish-order doesn't reflect semantic version order.

**Verification approach:** Quick design check: does the catalog store a monotonic publish-sequence-number alongside each manifest submission? If yes, version ordering via publish-order is reliable. If no (only a timestamp, which can drift for moderated submissions), the ordering assumption needs a tiebreaker.

**Relevant spec locations:** Architecture spec: "Catalog data shape -- Bundles ARE manifests" (line 1437), "Lifecycle: you got a copy, it's yours" (line 1489).

---

### V-3: Refcount index staleness window creates a GC safety risk

**Finding:** The refcount index (`.refcounts.json`) is described as "updated on every manifest add/remove" (line 1234). This implies it is written as a side effect of every manifest write. But the spec does not specify that the refcount index write is atomic with the manifest write. If slipgate crashes between the manifest atomic-rename succeeding and the refcount index being updated, the index is stale (lower refcount than reality). A subsequent GC sweep could incorrectly identify a blob as unreferenced and move it to trash.

The 30-day trash retention (line 1244) provides a recovery window, but the spec should explicitly note this crash window exists and that the "rebuildable from a full manifest walk if corrupted" (line 1234) recovery path applies here.

**Verification approach:** Design review during Arc A implementation: ensure the refcount update is either (a) applied immediately after the manifest fsync (within the same mutex hold), or (b) the GC is documented to trust manifest-walk over index when the index is suspiciously low. Currently the spec says "GC reads the index, deletes anything with refcount zero" (line 1234) without a validity check.

**Relevant spec locations:** Architecture spec: "Garbage collection -- Refcount index for performance" (line 1233), "GC safety" (line 1240).

---

### V-4: `exec` delta-script works at Class 1 but only if path is in engine search path

(Detailed in I-2 above.) The specific unverified assumption: does `Cmd_Exec_f` in ezQuake accept absolute filesystem paths, or only search-path-relative paths? If the answer is "only search-path-relative," the temp-file delivery mechanism fails silently. This is critical for Arc B/E and needs a targeted source-walk of `Cmd_Exec_f` path handling.

**Verification approach:** Single-file source-walk of `src/cmd.c` around `Cmd_Exec_f` to confirm path resolution semantics, then verify FTE's equivalent. 30-minute spike.

---

### V-5: FTE user profile-switch frequency and Class 3 UX impact

Review-prep item 16 flags: "if FTE users do a lot of profile-switching and Class 3 (engine restart) is too slow / disruptive, FTE feels worse than ezQuake." This is explicitly flagged as unverified. The design decision is locked (FTE falls back to Class 3 for all swaps in V1), but the user experience impact has not been empirically assessed.

**Verification approach:** Short empirical test: time a FTE engine restart on the target hardware (the Windows dev machine). If restart time is < 5 seconds, Class 3 is acceptable for most users. If > 10 seconds, it becomes a product differentiator that should be called out in the UI ("FTE profiles switch requires engine restart, ~Xs"). This affects the V1 launch UX messaging.

---

### V-6: `link()` on Windows: behavior when blob is already open by another process

The inode-share via `link()` (line 596) creates a second directory entry pointing at the same inode. On Windows, `CreateHardLink` succeeds even if the target file is open by another process -- the new hardlink is created immediately. But the reverse scenario matters: when Stage 2 runs `link(tree_path, blob_path)` while the engine is NOT running (Defense 1), the tree file might still be open by another process (e.g., a text editor, Windows Explorer thumbnail cache). On Windows, a file opened with a non-shareable file lock would cause `CreateHardLink` to fail. The spec does not specify error handling for `link()` failure during Stage 2.

**Verification approach:** Arc A/E implementation: wrap `link()` calls in error handling that falls back to copy when `CreateHardLink` fails with ERROR_SHARING_VIOLATION, with a log entry. The spec should document this fallback.

---

## Spec navigation / clarity (low priority)

### S-1: "Open architectural questions" section name is misleading

Architecture spec line 1780: "Note for cold readers: despite the section title, most of what's below is per-pass retrospective, not actually-open items." This note is present but the section name "Open architectural questions" still causes confusion on first read. A cold reader not seeing the note until they reach it will spend time reading retrospectives expecting to find open items. Suggestion: rename to "Architectural decisions log (per-pass retrospectives)" and demote the "Still open" subsection.

---

### S-2: Watcher Case 4 (tracked + file deleted) UX path is thin

Architecture spec line 788 and the five-case dispatch (Case 4): "tracked + file deleted -> surface at next cleanup notification: 'Tracked file <path> was deleted. Restore from warehouse, or remove from manifest?'" This case is documented in the five-case dispatch table but not in the Cleanup notification UX section (lines 885-903), which shows example UI for maps/mods/unrecognized but not for deleted-tracked files. It's also not in the Defenses section. Arc E implementation may treat this case ad-hoc rather than designing it deliberately. Worth a one-paragraph clarification of the cleanup notification UX for Case 4.

---

### S-3: The seven clone-modal consumers are scattered across the spec

The clone modal has seven consumers (lines 757-767), which is a key architectural decision about UI reuse. But the consumers are defined in "Primitive operations" and then each consumer is cross-referenced individually throughout the spec (Arc B line 165, Arc C line 182, Arc D line 224, Arc F line 299, etc.). A single-location table of all seven consumers with their use-site and role-specific behavior (default toggles, what they do with the output) would significantly improve the reading experience for arc-planner. Currently the full picture requires mentally assembling seven scattered cross-references.

---

### S-4: Materialization order and library-override precedence are stated but not illustrated

Architecture spec line 233: "Materialization order: stock baseline -> profile content -> library content." Line 235: "Profile-overrides-library precedence: if a profile manifest entry and a library manifest entry resolve to the same target_path, the profile entry wins." These rules are clear in isolation, but the interaction between them (especially when library content fills paths the profile didn't claim) could use a 3-row example table showing three target paths: one claimed by profile, one by library, one by both. This would prevent arc-planner from misinterpreting "library fills remaining target paths" as library running before profile content.

---

## Surprises / things that worked well

**The two-stage capture/swap pipeline is well-designed.** The separation between observe (Stage 1, safe anytime) and process (Stage 2, safe moments only) is a genuinely elegant solution to the "engine mid-write" problem. The three trigger points (engine-exit, user-invoked Cleanup, idle-nudge) provide good coverage without requiring background service complexity.

**Clone modal as seven-consumer UI primitive is a strong decision.** Using a single selector grammar for clone / pre-publish / selective-import / pre-extraction-overview / export / drift-import / backup-restore is the right call. It means users learn one UI pattern that generalizes across the most important workflows. The consistency benefit compounds over time as users encounter more flows.

**Hard-fork-with-drift-detection is the right tradeoff.** The overlay-manifest alternative would have been simpler to implement but would surprise users with auto-propagated changes. The "three trigger points with graduated blocking" (non-blocking on app-open, blocking on profile-switch, light-prompt on engine-launch) is a well-calibrated UX response to the tradeoff.

**Manifest-as-truth GC is the correct design.** The explicit decision to make GC consult manifests (not nlink counts) and to store historical manifest versions that reference older blobs is what makes the IDE-shaped restore feature viable. This is a non-obvious consequence of the content-addressed model and it's handled correctly.

**The lossless-export pledge tests (Tests 1, 2, 3) are appropriately operationalized.** Encoding the pledge as three automated tests (round-trip integrity, zero slipgate residue, post-uninstall launch smoke) is the right way to protect a product property that could easily be violated by a future feature. Test 3 running an engine against the export is unusually thorough.

**Single-class self-knowledge surface is the right collapse.** The earlier two-class (code-bundled vs catalog-refreshable) distinction was a leaky abstraction. Collapsing to one class with per-table cadences (some tables refresh on sign-in, some bundle with releases) is simpler and correctly acknowledges that the difference between them is operational policy, not architectural kind.
