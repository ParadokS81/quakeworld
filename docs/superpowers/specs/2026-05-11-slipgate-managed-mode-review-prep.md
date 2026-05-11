# Slipgate Managed Mode -- Review Prep

> **Captured 2026-05-11.** Companion doc to the architecture spec, written for the fresh-eyes design reviewer that will read the spec cold after Pass 6 closed. Two sections: (1) **Load-bearing decisions** -- the foundational locks where if any one is wrong, the rest of the design collapses. The reviewer should scrutinize these hardest. (2) **Deliberately-deferred carry-forwards** -- features and refinements explicitly pushed to V1+ or later arcs. The reviewer should NOT flag these as "missing"; they are deferred on purpose with rationale.
>
> **Does NOT replace** the architecture spec or the per-pass minutes. This is a navigation aid for the reviewer, not a substitute for reading the spec body.
>
> **Companion docs:**
> - Vision: `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`
> - Architecture: `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`
> - Roadmap: `docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`
> - Pass minutes: 2026-04-29-pass3 / 2026-05-05-pass4 / 2026-05-05-pass5 / 2026-05-11-pass6 ratifications.md

---

## Section 1 -- Load-bearing decisions (scrutinize these hardest)

These are the foundational locks across all 6 brainstorm passes. If any one of them is wrong (i.e., the assumption behind it doesn't hold under scrutiny), the parts of the design that depend on it collapse. The reviewer should challenge these specifically: are they actually true under all the user-flows we care about, or is there a hidden case that breaks them?

### Substrate (everything depends on these)

1. **Slipgate-IS-quakedir collapse** -- the data warehouse IS the Quake install, not a companion to one. Profiles are manifests; switching profiles is materialization-not-copy.
   - Architecture: see "Foundational concepts" + Vision spec entirely.
   - **Risk if wrong:** if users actually need slipgate to coexist with an external untouched Quake dir, the whole architecture is the wrong shape.

2. **Single-volume hardlink invariant** -- active tree + blobs both under `<data-root>` on the same volume. Install-time precondition rejects FAT32 / exFAT / non-hardlink-capable mounts.
   - Architecture: "Storage layout" + "Layout decisions ratified in Pass 1."
   - **Risk if wrong:** if a meaningful slice of users have their Quake on a non-hardlink filesystem (USB drives, network mounts, exFAT external drives), install-time rejection blocks them entirely. Need to verify: how common is non-hardlink filesystem usage in the target audience?

3. **Per-role materialization mode (configs copy, others hardlink)** -- ezQuake's `cfg_save` truncate-write would corrupt hardlinked blobs. Configs use copy-mode; everything else hardlinks.
   - Architecture: "Materialization as view" + "Primitive operations -- materialize."
   - **Risk if wrong:** any other engine that does similar truncate-write to non-config files would similarly corrupt blobs. Verified for ezQuake; **NOT verified for FTE / QWFWD / other forks**. Reviewer should check whether the per-role mode covers the actual write surface of all V1-supported engines.

4. **Manifest as truth, tree as derived state** -- the materialized tree is a cached view; the manifest + retained history is the source of truth. GC walks manifests, not tree.
   - Architecture: "Foundational concepts -- Manifest as profile" + "Garbage collection."
   - **Risk if wrong:** if any user-facing or engine-facing code path treats the tree as canonical (e.g., a backup tool that snapshots tree but not manifests), the lossless-export pledge is violated.

5. **Single-process invariant + lockfile** -- only one slipgate instance owns the data-root at a time; `.lock` file enforces.
   - Architecture: "Storage layout -- Process model."
   - **Risk if wrong:** if Tauri's single-instance enforcement has a hole (e.g., elevated-vs-non-elevated processes both starting), concurrent writes to manifest history could corrupt state.

### Manifest layer

6. **Manifest publish rule (4-condition filter)** -- entry iff role recognized AND not user-content-roles AND not library-roles AND path not in `private.json`. Unclassified files NEVER reach a manifest.
   - Architecture: "Filesystem watcher contract -- Capture/swap pipeline" + "Content taxonomy."
   - **Risk if wrong:** if a recognized role accidentally captures a file that should have been private, sharing a profile leaks private content. Or, if the classifier mis-routes a file (e.g., calls a config a script), the wrong retention policy applies. Reviewer should walk the four-condition filter against edge-case files (executables in qw/, symlinks, Unicode-named files, etc.).

7. **Three-role profile pointer (primary / active / launched)** -- separable concepts; `profile-roles.json` carries primary + active. Active is durably persisted across sessions (Pass 5.2).
   - Architecture: "Foundational concepts -- Primary, active, and launched profiles."
   - **Risk if wrong:** if any user-flow assumes "active = launched" (e.g., the launcher reads `active` instead of explicit launch target), profile-switch behavior breaks under multi-instance launching scenarios. Multi-instance is V1+ but the underlying model needs to NOT preclude it.

8. **Hard-fork-with-drift-detection (NOT overlay-manifest)** -- forks remain full snapshots; new `last_synced_parent_manifest_sha` field tracks divergence. Overlay-by-default explicitly rejected (Pass 5.1) for surprise-minimization.
   - Architecture: "Manifest as profile -- Drift detection on forks."
   - **Risk if wrong:** users who think "fork = live link to parent, automatic updates" will be surprised by hard-fork semantics. Drift detection at three trigger points mitigates, but doesn't eliminate. Worth a review of the user-mental-model assumption.

### Catalog / Hub

9. **Hub-as-gravitational-center (NO P2P)** -- bytes flow only when hub validates and serves; manifests can reference hub-unknown SHAs as "greyed-out until validated."
   - Architecture: "Cloud catalog interaction -- Hub as gravitational center" + "No P2P."
   - **Risk if wrong:** if the hub takes a long time to validate a submission, recipients of a manifest sharing those SHAs see "greyed out" indefinitely. Worth thinking about the hub-moderation latency UX.

10. **Bundles ARE manifests (single primitive at all sizes)** -- single-asset publish = one-entry manifest, bundle = multi-entry, profile = full. Tags + versioning fall out of name + publisher + publish-order.
    - Architecture: "Cloud catalog interaction -- Catalog data shape" + "Bundles in slipgate-app."
    - **Risk if wrong:** if a real-world bundle use case turns out to NOT fit the manifest primitive (e.g., bundles need first-class fields the profile manifest schema doesn't have, OR bundles need different lifecycle semantics than profile imports), the collapse breaks. Reviewer should pressure-test: walk through 3-4 concrete real bundle examples (slackers_teamplay, a weapon-script pack, a frag-message pack, a pure map collection) and verify the manifest-primitive handles each.

11. **No `added_via` on manifest entry; provenance computed at display time** -- catalog stores SHAs only; lineage shows up in history view via hub lookup.
    - Architecture: "Cloud catalog interaction -- Catalog data shape -- Provenance lives in version history."
    - **Risk if wrong:** offline UX for "where did this come from" depends on local cache or local download log. If the local cache is stale or missing, the meta panel can't render lineage. Acceptable tradeoff in V1 (operator confirmed local download log handles the bundle case), but worth verifying offline UX expectations match.

### Slipgate self-knowledge

12. **Single-class self-knowledge surface (schema as only coupling event)** -- 9 tables (10th candidate Pass 6.3e), all use the same delta-sync protocol; schema bumps are the only oracle <-> slipgate coupling moment.
    - Architecture: "Slipgate self-knowledge surface."
    - **Risk if wrong:** if a single new table requires a different cadence model or coupling shape (e.g., needs streaming updates rather than delta-sync), the single-class collapses and we have two-class machinery again. Reviewer should walk through the 10th-table candidate and any near-future tables to verify they fit.

13. **Two growth axes (code grows recognition, catalog grows corpus)** -- code releases ship recognition vocabulary; catalog delta-sync grows asset corpus + taxonomies. Independent cadences.
    - Architecture: "Slipgate self-knowledge surface -- Two growth axes."
    - **Risk if wrong:** if code-side recognition vocabulary needs to grow faster than slipgate release cadence (e.g., a new mod takes 3 months from emergence to slipgate releasing recognition for it), users see the "other" / unrecognized bucket grow rather than shrink. Worth thinking about the recognition-velocity expectation.

### Other invariants

14. **Lossless-export pledge (3 tests)** -- round-trip integrity, zero slipgate residue, post-uninstall launch smoke. The user can always walk away with a portable Quake dir.
    - Architecture: "Versioning and history -- Lossless-export pledge protection."
    - **Risk if wrong:** any feature that creates state slipgate-uniquely-owns (e.g., a hidden cache, a database-only artifact) violates the pledge. Reviewer should sanity-check: do any of the 9 self-knowledge tables, the local download log, or any V1+ planned feature accidentally create slipgate-only state that's not in the lossless-export?

15. **Capture/swap two-stage pipeline** -- Stage 1 observes (writes `.pending-swap.json` only; no bytes read, no hashing, no mutation); Stage 2 processes at safe moment. Defenses 1-4 against partial-file capture.
    - Architecture: "Filesystem watcher contract -- Capture/swap pipeline" + "Defenses against partial-file capture."
    - **Risk if wrong:** any engine-write pattern not covered by Defenses 1-4 (e.g., engine writes via mmap + msync; engine writes to a temp file then atomic-renames into place but the rename-target was already in our watch set) could result in partial-file capture or false escalation. Reviewer should walk through the file-write patterns of all V1-supported engines, not just ezQuake.

16. **Mailslot is ezQuake-only (FTE Class 3 fallback)** -- runtime swap classes 1/2 use mailslot (ezQuake-specific); FTE swaps fall back to Class 3 (engine restart) until FTE-IPC ships.
    - Architecture: "Engine integration -- Mailslot is ezQuake-only."
    - **Risk if wrong:** if FTE users do a lot of profile-switching and Class 3 (engine restart) is too slow / disruptive, FTE feels worse than ezQuake. Worth verifying with empirical FTE-restart timing.

---

## Section 2 -- Deliberately-deferred carry-forwards (don't flag as "missing")

These items are explicitly NOT in V1 scope (or are in V1+ scope) by deliberate decision, with rationale captured in the pass minutes. The reviewer should NOT flag them as "missing." They are roadmap, not gaps.

### Pass 5 carry-forwards (V1+ within Managed Mode arcs)

- **ConfigViewer-as-cvar-level-editor** -- surgical writes to fork's config.cfg from slipgate's UI; bypasses engine `cfg_save`. Useful for advanced users; V1+ feature.
- **Gamedir live-swap recipe revisit** -- V1 defaults to Class 3 (engine restart) for gamedir change; V1+ if empirical evidence supports `gamedir X; vid_restart; s_restart; reconnect` mailslot sequence.
- **FTE-IPC scope** -- a mailslot-equivalent IPC for FTE would lift FTE swaps from Class 3. Requires upstream FTE work or a slipgate-side IPC plugin. V1+.
- **Mailslot ruleset-gating verification** -- tournament-context features require gating before sending mailslot commands during a match. V1+ verification work.
- **Empirical reload-cost registry growth** -- specific HUD images / texture path patterns that don't reload correctly via vid_restart. V1+ tuning as users encounter cases.
- **Two-way drift (fork -> parent)** -- V1 is one-directional only (parent -> fork). V1+ if user demand surfaces for "merge my fork's improvements back to the parent."
- **Auto-cadence flavors for backup** -- on-app-close, weekly auto, on-significant-change. V1 is manual-only with change-count drift-badge nudge.
- **GitHub-as-private-only payload refactor (V2 path)** -- when hub.quake.world ships, GitHub backup payload shrinks to private-content-only. V2 architecture; V1 is full-warehouse on GitHub.
- **GitHub auth mechanic refinement** -- token rotation, scope minimization, 2FA flow polish. V1+ polish.
- **Repo validation and restore-collision UX polish** -- V1+ polish.

### Pass 6 carry-forwards (V1+ within Arc H or beyond)

- **Per-asset-type detail views** -- BSP parser, image preview, sound waveform, etc. UI design work alongside Arc H V1.
- **Pre-seeded popular-asset details** -- 10th self-knowledge surface table (top N popular maps' BSP details, popular paks' file lists). Same machinery as the other 9. V1+.
- **Config converter cvar carry-over detection as engine-tag enrichment** -- analyzes a config and suggests engine tags based on which cvars resolve in each engine's known cvar set (from qw-oracle Layer 1). Builds on planned config converter work. V1+.
- **Hub-side bundle-aware UX (subscription state + notification + diff display) for Hub V2 follow feature** -- when "follow" lands (Hub V2), the catalog needs subscription state per user, notification mechanism, diff display. V2 Arc H feature.
- **Local download log UX design** -- the data model is locked (per-user, machine-local, separate from manifest); the render is open. V1+ UI design.
- **Bundle apply selector defaults** -- which files in a bundle should default-on / default-off at apply time? Tunable per-role; safe defaults vs explicit-opt-in. V1+ tuning.

### L1-alpha / -beta / -gamma / -delta tracks (qw-oracle scope, NOT slipgate Managed Mode arcs)

These are qw-oracle-side data-extraction arcs; each lands more Layer 1 data via delta-sync; none gate slipgate V1.

- **L1-alpha** -- Ecosystem-tools registry: new Layer 1 `ecosystem_tools` table + curator-authored seeds (qizmo, pakexpl, frikbot, demo-tools, AVI-encoder bundles, server-rcon clients).
- **L1-beta** -- Cross-format binary fingerprinting: extend Phase 3.5b PE flow to AppImage / ELF / Mach-O.
- **L1-gamma** -- Engine helpdoc / data-file recognition: extend Phase 2d-bundle with `engine-asset:helpdoc-schema` / `helpdoc-content` / `engine-meta` roles.
- **L1-delta** -- Stock asset catalog: new `stock_pak_contents` table + per-pak file-inside-pak listing with semantic roles.

### Out-of-scope long-term (NOT Managed Mode arcs at all; potential future projects)

- **Mod browser** -- one-click install of expansion packs / mods to try. Mostly FTE single-player community use case. Not Managed Mode scope.
- **Cross-machine sync** -- desktop <-> laptop direct sync between two Slipgate installs; implies multi-tree substrate. Not V1 or V2.
- **Cloud-provider-API backup** (S3 / Dropbox / Google Drive / OneDrive) -- provider-taxonomy work; doesn't earn V1 or V2 scope. Local-external covers offline-target case; GitHub covers cloud case.
- **Multi-instance launching** (multiple engine processes simultaneously, different profiles) -- V1 = single-instance only. V1+ if user demand surfaces.

---

## Section 3 -- Scope boundary reminders for the reviewer

When critiquing the design, the reviewer should keep these boundaries in mind:

1. **Implementation details are NOT in scope for this review.** "Should this primitive use postgres-js or pg?" "Test setup: TRUNCATE-and-rebuild or per-suite DB?" -- these are arc-planner decisions, not design-review concerns.

2. **Locked decisions are not for relitigation, only for testing.** If a decision is locked in the spec, the reviewer's job is to find cases where the decision breaks under user-flows we haven't considered -- not to re-propose the alternative that was already weighed and rejected.

3. **The deferred carry-forwards above are out of scope as "missing."** They are roadmap. The reviewer should focus on whether V1 is internally coherent and load-bearing, not whether V1 has feature X that is explicitly V1+.

4. **The L1 tracks are qw-oracle scope, not slipgate scope.** The reviewer should not flag "slipgate is missing X recognition" if X is being delivered via an L1 track.

5. **The reviewer SHOULD surface:** missed user-flows that break load-bearing decisions; load-bearing-but-unverified assumptions (especially Items 2, 3, 9, 10, 14, 15 above); internal contradictions; concepts where the spec is ambiguous about behavior; cases where the user mental model could diverge from the design model; integration points between subsystems that aren't spelled out.

