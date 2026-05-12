# Slipgate Managed Mode -- Design Review Findings (Opus)

> Captured 2026-05-11 by Reviewer A (Opus 4.7). Cold-eyes review of the architecture spec post-Pass-6, two-reviewer mode (Sonnet review running in parallel). All file:line references are to `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md` unless prefixed with the vision spec or roadmap.

## Summary

The design is internally consistent at the **substrate layer** (content-addressed store + manifest-as-truth + per-role materialization + capture/swap pipeline). It is well-thought-out, has clearly absorbed real-world ezQuake source verification, and the seven-consumer clone modal is a strong UX collapse. The deepest risks I found are in three places: (1) **the watcher's behavior on tracked-config edits is ambiguous** -- the same Case 2 dispatch routes both "user saved their config" and "external editor write" through the cleanup notification, which (taken literally) would prompt the user every config save, contradicting Pass 2.5's "history is dense and worth keeping" living-file principle; (2) **mid-session engine-managed writes into the active tree** (auto-downloaded maps, server-pushed assets, ezQuake's cfg_save_onquit) collide with Defense 1 ("never process during engine session") in ways the spec under-specifies -- the user can crash slipgate during a session, leaving partial mid-session writes in `.pending-swap.json` shape that's not described; (3) **Light <-> Managed mode transition has zero coverage in the architecture spec** -- the vision spec says it's "reversible" via Managed -> export -> uninstall, but there is no design for "user runs Managed for a week, decides they want Light back without losing the warehouse history they accumulated." A handful of smaller items (stock-pak SHA gating during profile share, hub-moderation latency UX, disk-full handling, the manifest "unfiltered snapshot" wording contradiction) are below this top tier but worth surfacing.

Overall verdict: **proceed to arc-planner** after addressing the Critical findings via either spec amendment or a focused mini-brainstorm pass. The Important findings can be carried forward to arc-planner as known risks. None of the findings invalidate the core architecture; they're either contract ambiguities at well-understood seams or load-bearing-but-unverified items that need a spike before locking in implementation.

---

## Critical findings (must address before arc-planner)

### C1. Case 2 (tracked + real edit) doesn't specify what the user sees per config save

**File:line:** `architecture.md:787-789` (Case 2 dispatch) cross-referenced with `:885-905` (cleanup notification UX example) and `:1170-1196` (living-file principle + 500-version retention).

**Finding.** Case 2 says "tracked + real edit -> record (path, size, mtime) in .pending-swap.json (manifest update queued for Stage 2, not applied yet)." Stage 2's cleanup notification example (lines 889-903) shows surfaced items as map downloads, partial mods, unrecognized files -- but no example of a tracked config edit. The "per-entry actions" list (line 905) includes `Discard`, which makes sense for untracked new files but is dangerous for tracked edits: discarding a config edit would leave the manifest pointing at the old SHA while the materialized tree has the new bytes, putting tree-vs-manifest into a state the spec calls "always a bug."

What is the user supposed to see at engine-exit when they edited `config.cfg` in-game? Three plausible readings:

1. Case 2 tracked edits **auto-apply** at Stage 2 (no user prompt) because the manifest already authorized this entry's role. Cleanup notification only surfaces Cases 3 (new files), 4 (deletions), partial-mod patterns, and integrity failures.
2. Case 2 tracked edits **prompt the user every save** ("config.cfg changed -- accept new version?"). Friction-heavy; contradicts the living-file model.
3. Case 2 tracked edits **auto-apply but appear as a one-line "X tracked edits captured" summary** in the cleanup notification, dismissible.

Reading 1 is the most internally consistent (matches Pass 2.5's living-file principle and the implicit-version-history language at `:1175-1176`), but the spec never states it. Reading 2 is what a literal read of "for each pending entry the user opts to keep, Stage 2 performs..." (line 819) implies. The spec is load-bearing on which one is true.

**Why it matters.** Every config save touches this. If reading 2 is correct, every weapon-bind tweak triggers a modal -- the UX is destroyed. If reading 1 is correct, the "Discard" action on Case 2 entries needs explicit treatment (does it roll back the tree to the manifest's blob? does it restore from a prior version?). If reading 3 is correct, the spec needs to say so. Arc E (watcher) and Arc G (history) both depend on which is true.

**Suggested resolution.** Spec amendment naming the Case 2 default behavior explicitly. My recommendation is reading 1 (auto-apply for tracked edits in known-good roles; surface in cleanup notification only if integrity check fails or as an undo-able summary). The "Discard" action on a tracked edit should be specified as "restore the prior tree-resident SHA from history; tree drifts back to previous version."

---

### C2. Mid-session writes to the active tree by the engine collide with Defense 1 in under-specified ways

**File:line:** `architecture.md:471-484` (bucket 4 server-auto-downloaded content; "Hardlinked back into the active profile's tree for engine access during the session"); `:806-807` (Stage 1 records to .pending-swap.json only); `:832-834` (Defense 1 "never process during engine session"); `:1018-1021` (engine-exit fires Stage 2).

**Finding.** The architecture has at least three classes of mid-session writes by the engine *into the active profile tree*:

1. **Server auto-downloaded maps** at `qw/maps/<map>.bsp` (line 471). Spec says these "land in `mod-cache/`" (line 149) and are "hardlinked back into the active profile's tree for engine access during the session" (line 480). But the engine doesn't know about `mod-cache/` -- it just writes to its `-basedir`'s `qw/maps/`. So the actual flow has to be: engine writes to active tree's `qw/maps/<map>.bsp`; Stage 1 records as Case 3 (untracked + new file); at engine-exit, Stage 2 hashes, classifies as `cache-ephemera`, **moves** (not links) the file into `mod-cache/<mod>/qw/maps/<map>.bsp`. The "Hardlinked back into the active profile's tree" property at line 480 is the *result* of materialization, not the *source* of the file -- but the spec reads as if mod-cache is where the file arrives. This is a real ambiguity.

2. **Server-pushed sound/model replacements** (lines 472-473). Same shape.

3. **ezQuake `cfg_save_onquit`** at `:981` -- per Pass 5.1's source-walk, this runs on engine shutdown, mutating `qw/config.cfg`. For configs in copy-mode, this is fine (the engine writes to a private copy). But the timing matters: `cfg_save_onquit` is by definition *after* the user's last interaction with the engine. Stage 2 fires "when slipgate sees the launched engine instance terminate" (line 815). What's the sequencing? If Stage 2 fires immediately on engine PID exit, but `cfg_save_onquit` is still mid-flush, Defense 2 (stable-mtime, default 5s) should catch it -- but the spec doesn't connect these dots.

**Additional gap:** what if slipgate itself crashes during an engine session? The watcher is observing into `.pending-swap.json`. Then slipgate crashes. The engine keeps running and writes more files into the active tree. On next slipgate launch, `.pending-swap.json` exists with stale entries, AND there are *newer* changes in the tree the watcher never observed. The recovery path is unspecified.

**Why it matters.** Arc E's correctness depends on these flows. Server-pushed mod content arriving mid-session is the *whole point* of bucket 4 (the inbox) -- it's not an edge case. The cfg_save_onquit timing is the *primary* config-save path for many users. Slipgate-crash-during-session is a real failure mode and the spec's defenses are framed around engine writes, not slipgate writes/crashes.

**Suggested resolution.** Spec amendment that explicitly walks:
- The auto-downloaded-map flow from engine-write through Case 3 dispatch, .pending-swap.json shape, Stage 2 stable-mtime check, classifier output (`cache-ephemera`), and the *move* (not link) into mod-cache. Clarify that mod-cache materialization is the "hardlinked back into the active profile's tree" mechanism -- the file originates in the active tree and only gets canonicalized into mod-cache at Stage 2.
- The cfg_save_onquit -> Stage 2 sequencing (stable-mtime is the defense; spell it out).
- The slipgate-crash-during-session recovery: on slipgate re-launch, .pending-swap.json is replayed, mtime/size of each entry is re-checked against current tree state, divergence triggers re-classification.

---

### C3. Light <-> Managed transition has no architectural coverage

**File:line:** `vision.md:104-141` (two product modes); `vision.md:136` ("Mode is a single profile field: `mode: 'light' | 'managed'`"); architecture spec has 0 occurrences of the substring "Light mode" outside the third-persona enumeration at `:1047-1050`.

**Finding.** The vision spec defines two modes but the architecture spec is entirely a "Managed mode" architecture. The phrase "Mode is a single profile field" (vision line 136) is **wrong by the architecture spec's own model** -- mode can't be a profile field because Light mode profiles aren't managed by slipgate's profile system at all; in Light mode, there are no profiles, just a `<basedir>` the user owns. So either (a) "mode" is global (a slipgate-app-level setting, not a profile field) or (b) Managed-mode profiles all carry `mode: "managed"` and Light-mode is the absence of any profile system. The architecture doesn't say which.

What's actually missing:

1. **Where is the mode-toggle stored?** Not in `profile-roles.json` (the schema at :253-259 has no mode field). Not in a per-profile manifest (profile manifests are Managed-mode artifacts). Vision says "Mode is a single profile field" but profiles don't exist in Light mode.

2. **What does "explicitly opt into Managed when they're ready (typically by running the migration on-ramp)" actually mean?** First-launch onboarding (:1036-1050) has three branches: install fresh / restore from backup / skip into tool mode. None of those are "opt into Managed from existing Light usage." The Light-user-graduating-to-Managed flow is unspecified.

3. **Is the reverse reachable?** Vision says "Migration is reversible: Managed -> export -> uninstall -> original-shape dir." But "uninstall" is a heavy gesture (drops all manifest history, all forks, all checkpoints). What if a user wants to switch *back* to Light mode but keep the slipgate install (e.g., for the updater + analyzer features) and keep their managed warehouse around for "I might come back"? The architecture doesn't have a primitive for this. The only documented exit is `export -> uninstall`, which is destructive of slipgate state.

4. **Managed-mode user using Light-mode features.** A Managed-mode user runs the updater, which targets a specific binary in `<data-root>/binaries/`. Does that interfere with the managed install? Pass 3.5b shipped binary swapping; that's now part of the Managed substrate. But Light-mode users also use the updater. Does the updater behave differently in Light vs Managed? Not specified.

**Why it matters.** The vision spec's primary product-positioning statement is "Two product modes, both supported indefinitely." If the architecture doesn't define the boundary between them, V1 ships either as Managed-only (vision broken) or with an undefined Light interaction surface (footgun risk). The fact that nobody noticed this through 6 brainstorm passes is itself a signal -- the brainstormers were all Managed-mode-focused.

**Suggested resolution.** Either:
- **(Recommended)** A short Pass 7 mini-brainstorm scoped specifically to Light <-> Managed boundary: how mode is stored, how transitions are gestures (forward and reverse), what happens to Phase 3.5b functionality (binary swapping) under each mode, and what V1's actual mode-default is.
- Or accept that V1 ships *Managed-mode-only with Light as the V0 default for new users who haven't migrated yet*, and amend the vision spec to drop "two product modes" and reframe as "a Managed-mode app that respects the user's existing dir until they migrate." This is a bigger framing change and probably wrong given the vision-spec investment.

---

### C4. The stock-pak verification gate is a sharing-killer in disguise

**File:line:** `architecture.md:961-969` (stock pak handling); `:1339-1342` (migration stock baseline verification); `:1693` (Known-good stock pak SHAs table on sign-in + on-demand).

**Finding.** The known-good stock pak SHA list covers "vanilla 1996 Quake registered, Steam re-release, GOG release, nQuake bundled QuakeWorld free distribution" (line 963). When a user shares a profile manifest, the recipient's slipgate verifies the recipient has a matching SHA locally (line 969): "If they do, the import proceeds. If they don't, slipgate refuses (same recovery path: obtain stock paks legitimately)."

The failure mode: **two legitimate users with two legitimate-but-different stock pak SHAs cannot share profiles.** The user who hashes `pak0.pak` from a 1997 floppy redistribution + the user who hashes `pak0.pak` from a 2010 patched re-release + the user from a 2024 Steam re-release + the user from one of nQuake's seven historical bundle versions all have legitimately-different bytes. The catalog ships a known-good list, but:

1. The list's **completeness is unverified.** How comprehensive is the catalog's coverage of historical legitimate stock pak SHA variants? The "L1-delta" track (stock asset catalog) is V1+ qw-oracle scope (review-prep section 2). Without that track shipping, V1's known-good list could realistically be 3-5 SHAs, not 18+ as the example UI shows at line 1743.

2. The **sharing failure is silent to the publisher.** Publisher's manifest references their stock pak SHA. Recipient's slipgate sees a manifest-vs-local SHA mismatch and refuses. Publisher never sees the failure (they never know recipient tried). Recipient sees only "refused" -- they have a legitimate copy but it doesn't match.

3. The **error message tells the recipient to "obtain stock paks legitimately"** (line 966) when they already have them legitimately. This will read as an accusation.

**Why it matters.** Profile sharing is one of the load-bearing user-facing values of the entire architecture (Vision scenarios 3 + 5; "Try someone else's setup without committing to it"). If a meaningful fraction of users have legitimate-but-uncataloged stock paks, the share UX silently breaks.

**Suggested resolution.** Either:
1. **Accept the failure as Hub V1 baggage** and design the error UX so it doesn't read as "you pirated your game." Wording like "stock pak SHA <hash> isn't yet in the catalog's known-good registry -- this can happen with historical or patched legitimate copies. Continue with the profile import (stock paks won't be verified, but everything else proceeds) / Cancel."
2. **Decouple stock-pak verification from profile import.** Verify at first-launch (the user's own stock paks against the registry); after that, profile imports trust the user's local stock paks unconditionally. Reduces the share-fails-because-pak-mismatch failure mode to first-launch only.

I lean toward option 2 because it preserves the copyright gate where it matters (you must have *some* legitimate copy to play at all) without re-enforcing it on every profile share.

---

### C5. Manifest "unfiltered snapshot" wording vs publish rule is a real internal contradiction

**File:line:** `architecture.md:48-60` (manifest "Manifest is a complete unfiltered snapshot. When a profile is published or shared, the manifest captures the full state of the user's quakedir" vs three sentences later "Unclassified files never reach a manifest. User-content [...] never reaches a manifest. Library content [...] lives in the library manifest, not any profile manifest. Private files never reach a manifest.").

**Finding.** Line 48: "**Manifest is a complete unfiltered snapshot.** When a profile is published or shared, the manifest captures the full state of the user's quakedir." Line 60: "**Unclassified files never reach a manifest.** User-content (demos / screenshots / logs) never reaches a manifest. Library content [...] lives in the library manifest, not any profile manifest. Private files never reach a manifest."

These two statements directly contradict each other. The actual model (the publish rule at line 53-58) is that the manifest is "complete" in the sense of "every recognized-role profile-content entry," not "every byte in the quakedir." But a cold reader reading just the first paragraph believes the manifest *is* the quakedir state -- which has user-facing consequences (will my private notes get shared? will my demos get shared?).

**Why it matters.** This is the kind of phrasing that survives into UI copy and user docs. "Share your full setup" the marketing line vs "your private notes and demos are explicitly excluded" the actual behavior. The current language as written would make a user reasonably believe the wrong thing.

**Suggested resolution.** Spec amendment: rewrite line 48 to "**Manifest is a complete snapshot of recognized profile content.** When a profile is published or shared, the manifest captures every recognized-role profile-content entry -- not user-content (demos/screenshots/logs), not library content, not private files, not unclassified files. See the publish rule below for the exact filter." Same correction propagates to vision spec.

This is small but it's the kind of small-thing that escapes hygiene passes because both clauses individually make sense to the writer.

---

## Important findings (worth addressing before V1 ships, but not blocking arc-planner)

### I1. Hub-moderation latency UX is hand-waved

**File:line:** `architecture.md:1417-1419` ("manifests can reference hub-unknown SHAs as 'greyed-out until validated' UX; 'Notify me when this becomes available' workflow"); `:1421-1423` (retroactive enrichment).

**Finding.** The "greyed-out until validated" UX is the design for the moderation-pending case. But the spec never says how long moderation takes, what the user *can do* in the meantime ("notify me when available" implies notification, but nothing about whether the asset is *blocked* from local materialization), or what happens if moderation rejects an asset that's referenced in a published manifest. The hub-as-gravitational-center principle says "Recipients can never download a hub-unknown SHA directly from another user" (line 1417) -- so a manifest that references a *rejected* SHA effectively becomes unimportable forever for new users.

The retroactive-enrichment story works if moderation is a couple hours / days. If moderation is a couple weeks and the publisher meanwhile has 50 followers waiting, the share UX fails. Pass 6 ratified "Follow is post-hub-V1" so this is V1+ scope -- but V1 publishes still exist, and V1 publishes referencing hub-unknown SHAs will see this latency.

**Why it matters.** The published-manifest-is-unimportable-until-moderation-completes failure mode interacts badly with the operator's V1 sample-profile story ("paradoks-default, milton-classic" downloadable starter profiles in scenario 1, vision line 254). If the operator wants those starter profiles immediately usable at V1 launch, every asset in them must be pre-moderated and in the catalog before the first user signs up. That's a Hub V1 deployment-sequencing concern, not just a UX concern.

**Suggested resolution.** Either (a) document the assumed moderation-latency budget for V1 ("manual review within 48h"), or (b) carry-forward to Arc H planning as "Hub V1 SLA on moderation latency informs the UX wording around 'pending validation' -- design copy that survives multi-day delays."

### I2. Disk-full handling during materialization is silently undefined

**File:line:** searched architecture.md for "disk full", "ENOSPC", "out of space" -- 0 hits.

**Finding.** Materialization creates a sibling `tree.materializing/` and atomic-renames into place (line 619). It's "approximately zero disk cost" because both trees are hardlinks. But during materialization, slipgate may need to *copy* config files (per-role copy mode, line 617), download missing blobs from the catalog (line 635 "downloading missing blobs"), or extract files from migration source. Any of these can hit ENOSPC. What happens?

The atomic-swap protects against half-materialized trees (the rename is the commit point), so a mid-materialization ENOSPC leaves the live tree untouched. Good. But what about:

- Migration extraction halfway through copying 130MB of textures into blobs, then ENOSPC? Are the partial blob copies cleaned up, or do they leak as zero-refcount until GC?
- Stage 2 `link()` typically doesn't fail on ENOSPC (link is a directory-entry add, not a byte copy), but the file is the result of an engine write, so if THAT write hit ENOSPC the file is truncated/corrupt and the stable-mtime check should catch it -- but the spec doesn't say so.
- GitHub backup pushing 150MB to a 100MB-free disk? The local backup target is local-external; OneDrive paths could be involved.

**Why it matters.** This is the kind of edge case that produces "slipgate is broken" support tickets without giving the user actionable feedback. Single mention in the spec, scaffolded into the materialize / register / backup primitives, would suffice.

**Suggested resolution.** Carry to arc-planner. Arc A's brainstorm should cover ENOSPC handling for register/materialize/copy as a small section, even if the answer is "best-effort cleanup + clear user error." Same for Arc D (migration) and the Backup arc.

### I3. Stale lockfile detection is described but the recovery prompt is undefined

**File:line:** `architecture.md:397` ("Stale-lock detection: file age + PID liveness on same hostname; force-unlock prompt if stale.")

**Finding.** The stale-lock recovery is one sentence. The prompt language, the user's options, and what happens if the user force-unlocks a lock that turns out NOT to be stale (a slipgate instance is genuinely running, but the user can't see it because it's tray-only) aren't specified. The hostname check at line 397 doesn't help cross-machine: if a user mounts `<data-root>` from machine A on machine B, the PID-on-same-hostname check trivially says "not running here," and force-unlock proceeds -- but machine A's slipgate is still alive and writing.

Cross-machine `<data-root>` access is implicitly out of scope (no mention in the spec, multi-tree/multi-machine sync explicitly V1+ per review-prep section 2). But "implicit out of scope" is fragile -- a user with a network-mounted Quake dir hits this without intending to.

**Why it matters.** Two flavors. (1) Real stale lock (slipgate crashed, lockfile remains) -- the user *should* be able to force-unlock. (2) Apparent stale lock (slipgate is in tray on the user's other monitor) -- the user *should not* be able to force-unlock. The check at line 397 can't distinguish these in a multi-monitor / tray-only setup.

**Suggested resolution.** Arc A's brainstorm should resolve. Options:
- Two-stage force-unlock: "the lock looks stale. We tried to focus the existing slipgate window and couldn't. Proceed?" (uses the single-instance plugin's focus signal to detect ghost-running slipgate).
- Stale-lock has a stricter age threshold (file age > 24h means stale regardless of PID liveness).

Carry to arc-planner; not blocking.

### I4. FTE config-write semantics are unverified

**File:line:** `architecture.md:227` ("ezQuake's `cfg_save` ... use `fopen(path, "w")` truncate-write. With default `cfg_backup` = 0 (verified via subagent source-walk)"); review-prep doc item 3 ("Verified for ezQuake's `cfg_save` truncate-write; **NOT verified for FTE / QWFWD / mvdsv**").

**Finding.** Per-role copy mode is justified by ezQuake's truncate-write pattern. FTE has its own config-write code that hasn't been verified. If FTE writes configs differently (e.g., write-temp + atomic-rename, like git does for safety), the copy-mode rationale either becomes moot (FTE doesn't need copy-mode because its writes don't corrupt hardlinked blobs) or becomes wrong (FTE writes through hardlinks safely but slipgate forces a copy anyway, costing a few KB per profile per save). Both are minor in isolation -- the more concerning failure is if FTE has a *different* corruption pattern (e.g., `cfg_save_userhash` writing into a per-user subdir, breaking slipgate's target-path validation) that copy-mode doesn't actually defend against.

QWFWD and MVDSV are server-side (line 1144-1146) and don't materialize for slipgate-managed installs, so their write patterns don't matter. So the real verification gap is FTE.

**Why it matters.** Pass 5.1's per-role copy-mode is one of the loudest substrate decisions. It's justified by source-walk on one engine. The review-prep doc explicitly flags this as worth verification.

**Suggested resolution.** Subagent spike: source-walk the equivalent of `cfg_save` / `Cmd_SaveConfig_f` / `WriteConfig_f` in FTE (https://github.com/fte-team/fteqw, `engine/client/cl_main.c` or `engine/common/cmd.c` -- the operator's FTE checkout has the source already). Half-day-or-less verification. Result either confirms per-role copy-mode applies cleanly to FTE or flags a different corruption pattern that needs handling.

I'd hold arc-planner pending this spike since it's small, but it could also happen in parallel with Arc A scoping if needed.

### I5. "Primary cannot be deleted while other profiles exist" copy is backwards from intent

**File:line:** `architecture.md:719-722`.

**Finding.**
```
For primary profile delete:
- "Primary cannot be deleted while other profiles exist. Choose a new primary first, then retry."
- OR if it is the last profile: "This is your last profile. Deleting it leaves slipgate empty. [Confirm complete reset]."
```

Reading the first prompt cold: "Primary cannot be deleted while other profiles exist" reads as "Primary is deletable when other profiles do NOT exist" (and indeed the second prompt covers that case). But the *intent* (clear from context) is "Designate a different primary first, then delete the now-non-primary profile." The user is supposed to do: `make_primary(other_profile_id)` → `delete_profile(original_primary_id)`. The current copy says they "can't delete primary" period, which suggests demoting-then-deleting isn't an option. The user reads this as a hard block when in fact it's a two-step gesture.

**Why it matters.** Small but real UX bug-in-spec. Worth fixing because the prompt copy goes verbatim into UI strings.

**Suggested resolution.** Spec amendment: "To delete the primary profile while others exist, first designate a different profile as primary. [Choose new primary] [Cancel]."

### I6. Watcher cannot run when slipgate is closed -- engine runs anyway

**File:line:** `architecture.md:773` ("**Foreground-only for V1** (Pass 1 confirmed; slipgate must be open)"); `:1023-1028` (Scenario 5 app-close).

**Finding.** The spec is clear that V1 watcher is foreground-only. But Scenario 5 (app-close) implies the engine can still be running when slipgate closes. Then the engine writes to the active tree (configs, mid-session downloads, cfg_save_onquit) without any watcher present. On next slipgate launch, the watcher sees a tree-vs-manifest diff for every file the engine touched -- effectively a "what happened while I was away" reconciliation.

The spec doesn't describe this reconciliation. It says "`.pending-swap.json` state persists for any uncaptured engine writes" (line 1027) but doesn't say how slipgate handles tree-state that has *no* corresponding entry in `.pending-swap.json` -- because the watcher wasn't running.

**Why it matters.** Slipgate-in-tray (the natural Managed-mode resting state) is the default user flow. Users will routinely close slipgate while keeping engine running, especially for tournament/match play where they don't want slipgate's UI in the way. The reconciliation flow on slipgate re-launch is real V1 behavior.

**Suggested resolution.** Spec amendment: on slipgate launch, before clearing `.pending-swap.json`, slipgate compares current tree state against the active manifest. Any tracked file with a different mtime/size than the manifest's expected SHA gets *added* to `.pending-swap.json` as a Case 2 entry. Then the normal Stage 2 flow handles it. Essentially: slipgate-restart triggers a "I haven't been watching, scan now" pass.

This is small but it needs to be explicit. Could land as either spec amendment or Arc E brainstorm note.

### I7. ezQuake `gamedir` cvar handling under server push needs spec coverage

**File:line:** `architecture.md:149-152` (Server-pushed gamedirs); `:1011` (ezQuake handles server-driven gamedir changes natively).

**Finding.** The spec says ezQuake's runtime gamedir handling is "engine-native" -- slipgate doesn't intervene. The user joins a CTF server; ezQuake auto-downloads `ctf/progs/tfprogs.dat` and switches gamedir; slipgate doesn't care. But:

- Server-pushed CTF gamedir means files arrive at `<active-tree>/ctf/...`, **not** in `declared_gamedirs`. The library-materialization rule at line 547 says library entries materialize ONLY into declared gamedirs. So if the user has CTF in their library but their profile's `declared_gamedirs: ["qw"]`, the library's CTF content is gated out -- so the engine has to re-download it via server-push every time. That's a real waste of bandwidth and time for users who play CTF semi-regularly.

- After the session, Stage 2 sees a bunch of new files in the active tree under `ctf/`. The classifier outputs `cache-ephemera` for them, mod-fingerprint matches "ctf," and they get quarantined to `mod-cache/ctf/`. Fine. But then the user wants to play CTF *next* session against a different server. Server pushes the same files again. They land in active tree, classify as cache-ephemera, dedupe against mod-cache (since SHAs match)... or do they? The dedupe path isn't spelled out.

- Profile-overrides-library precedence (line 235) -- a profile manifest entry at the same target_path as a library entry wins. But mod-cache entries aren't in any manifest. What's the precedence ordering between mod-cache and library for `target_path = "ctf/maps/2fort5.bsp"`?

**Why it matters.** Gamedir handling is the most-engine-dependent part of the design and the operator note at line 1074 says "most ezQuake users don't use other gamedirs." But CTF servers ARE used in the QW community, and the friction case (download once per session) would be visible.

**Suggested resolution.** Arc E brainstorm should walk the CTF-server-join flow end-to-end, document the materialization-vs-library-vs-mod-cache precedence, and decide whether mod-cache promotion to library should be auto-prompted ("you've downloaded these CTF files 3 times -- keep in library?") or fully manual.

### I8. Hub-knowledge orthogonality breaks for L1-data refresh

**File:line:** `architecture.md:1429-1431` ("Hub-knowledge orthogonality. **Manifest entries are hub-knowledge-orthogonal.** A manifest entry's role + target_path + SHA are determined by what slipgate observed in the user's setup, not by what the hub knows about the asset."); `:1689-1697` (per-table cadence including "Layer 1 knowledge service data" with "bundled with slipgate release tied to oracle snapshot").

**Finding.** A profile manifest is portable -- it carries `role` values from the role registry. The role registry refreshes via the self-knowledge surface. If user A has slipgate v0.5 with role `user-asset:hud-overlay` (newly added), they publish a profile referencing that role. User B has slipgate v0.4 where `user-asset:hud-overlay` doesn't exist in their local role registry. Line 131 says: "Validation rule on manifest write: every entry's `role` must be in the currently-known registry. Importing a profile with a role not yet in the local registry triggers a refresh attempt or a user prompt."

This works for online users. For offline users (Pass 5.3 explicitly supports offline-fully-functional), the refresh fails. User B's only recourse is to update slipgate -- but that's a slipgate-release event, not a delta-sync event (the asset-roles registry refreshes via delta-sync per :1689). So an offline user can be locked out of importing a profile until they sign in once.

**Why it matters.** Light contradicts the two-growth-axes principle (:1763-1770), which claims code growth and catalog growth are independent. Asset-role addition is catalog growth -- it shouldn't require a slipgate code release. But manifest validation enforces a hard error on unknown roles, which means catalog growth is gated on whether the user has signed in recently. Offline-fully-functional and "two independent growth axes" can't both be true under this enforcement.

**Suggested resolution.** Soften manifest-import validation: an unknown role triggers a warning + an "import anyway, treat as `unclassified`" option. Or: the role registry ships an "unknown role catch-all" that any unrecognized role coerces to. The strict validation at line 131 is too strict for the offline-fully-functional pledge.

### I9. The "publish" UI surface itself is undefined for V1

**File:line:** searched architecture.md for "publish" -- many hits, but the actual *user gesture* is barely covered. Closest: `:1388-1395` (Profile export to catalog, four-step flow but each step is a bullet, not a UX walkthrough).

**Finding.** The spec describes the publish *mechanism* (slipgate sends manifest + novel blobs to the catalog, gets a handle back). It does not describe the publish *UX*:
- Where in the app does the user click "Publish"?
- Is publish a profile-level action, a bundle-level action, both?
- What modal does the user see? The pre-publish-review modal is listed as the second consumer of the clone modal (line 761) -- but Arc H is V1+, so does the modal not have a publish path in V1?
- What confirms the publish succeeded (URL handle, in-app share button, both)?
- Public-by-default vs friends-only vs private (roadmap line 361 lists this as Arc H open question -- so it's deferred)?

Combined with Arc H itself being V1+, the answer might be "publish UX doesn't exist in V1" -- but that contradicts the vision's premise of "sharing profiles is a first-class feature" (vision line 90).

**Why it matters.** This is in the "Arc H deferred to V1+" gap. V1 ships *without* publish UX. That's fine, but the architecture spec talks about publish flows extensively, which can mislead arc-planner into thinking the surface needs to exist in V1.

**Suggested resolution.** Spec amendment: add a one-line clarification in Cloud catalog interaction section: "V1 ships **without publish UX**. The pre-publish-review modal consumer (clone-modal consumer 2) lands in V1+ alongside Arc H. The V1 publish flow's *contract* is locked (manifest + novel blob upload, hub validates, returns handle) so Arc H implementation is constrained, but the user-facing 'Publish' button is V1+."

---

## Worth a closer look (load-bearing-but-unverified)

### W1. Multi-engine quakedir migration is an open question with no V1 fallback

**File:line:** `roadmap.md:243` ("Multi-engine quake dirs (user has both ezQuake and FTE in same dir): one profile or two?" -- open question listed for Arc D brainstorm).

**Finding.** This is on the Arc D open-questions list, so it's not "missed" -- but it IS load-bearing for V1 because TAIL-1 (FTE asset bundle wiring) just landed and FTE coverage is in V1 scope. The operator's own dir might have both ezQuake and FTE, since both have been worked on in this monorepo. If the migration extractor refuses to proceed on multi-engine dirs, the operator's first dogfood is broken.

**How to verify.** Subagent spike: walk the operator's actual `~/quake/` or equivalent path, count classifier outputs by engine, run the migration algorithm mentally against the result. Half-day; informs Arc D brainstorm directly.

### W2. exFAT/non-hardlink filesystem rejection user-population is unverified

**File:line:** review-prep doc item 2; `:614` (Install-time precondition rejects FAT32/exFAT/non-hardlink-capable mounts).

**Finding.** The review-prep flags this as worth verifying. The QW community is partly older players (1996-era Quake fans) who may have unusual setups (Quake on a USB stick they take to LAN events, on a network drive, on an exFAT external SSD). If even a few percent of target users have non-hardlink-capable storage, install-time rejection is a real blocker. The community has historical "portable Quake" muscle memory.

**How to verify.** Operator-side: a community-Discord poll or ask one or two players you trust who have unusual setups. Five minutes of social-channel checking gives 80% of the answer. If anyone says "yeah I keep my Quake on an exFAT drive for portability," the rejection has to be revisited.

### W3. The reload-cost registry rules for HUD images may be too coarse

**File:line:** `:1087-1099` (reload-cost registry table); `:1112` ("Empirical case-by-case growth ... more-specific registry rows get added in subsequent slipgate releases").

**Finding.** The registry's most-specific-pattern-wins rule routes a `user-asset:hud` change at `* (catch-all images)` to `vid_restart` (Class 2). But ezQuake's HUD-image reload behavior isn't uniform across HUD image types: status bar elements often DO reload on `vid_restart`, but scoreboard backgrounds and custom HUD shaders may need `hud_recalculate` followed by a draw refresh, or sometimes don't reload until mapchange. The spec acknowledges this growth at line 1112 but the V1 default pushes users into engine restart for cases that *might* work with a milder reload.

**How to verify.** Subagent spike: take a specific HUD pack (e.g., one of paradoks's customizations), enumerate which HUD-image roles need which reload class. Result feeds either the Pass 5.1 reload-cost registry baseline OR confirms "Class 2 vid_restart is the right default and finer registries can grow over time." Half-day-or-less.

### W4. The lockfile's hostname check assumes a stable hostname

**File:line:** `:397`.

**Finding.** "Stale-lock detection: file age + PID liveness on same hostname." For Tailscale users or workspaces that change hostnames (corporate laptops with names like `MININT-XYZ123`), the hostname can change without the user noticing. If a user takes a laptop home, hostname changes (DHCP rename or VPN-driven), tries to launch slipgate against a local data-root -- the lockfile has an old hostname; stale-detection fails because the OS reports a different hostname. Force-unlock prompt fires unnecessarily. Annoying but not catastrophic.

The mirror case is worse: same hostname, different machine (cloned VM, virtual machine snapshot rollback). Lockfile says PID 12345 is alive on hostname `X`; current machine has hostname `X` and PID 12345 happens to be `chrome.exe`. Force-unlock seems unnecessary (PID is alive on this host). But it's actually a stale lock.

**How to verify.** Quick subagent check: does Tauri's `app::Handle` expose machine UUID / installation-ID that survives hostname changes? If yes, lockfile carries that instead of hostname. If not, document the failure modes.

### W5. ezQuake `cfg_save_onquit` actually runs at quit, but other engines may not have this exact hook

**File:line:** `:227` (Pass 5.1 verified `cfg_save_onquit` at config_manager.c:981); `:1018-1021` (Stage 2 fires on engine-exit).

**Finding.** ezQuake's `cfg_save_onquit` is a verified hook. Stage 2's engine-exit trigger relies on the engine being *done* writing by the time slipgate sees the process terminate. If `cfg_save_onquit` finishes writing *after* the engine process exits (in a child process, in an OS buffer flush, etc.), Stage 2 might hash a partial file. Defense 2 (stable-mtime 5s) should catch it, but the engine is technically done by the time mtime stabilizes.

A bigger concern: FTE may not have `cfg_save_onquit`. If FTE doesn't auto-save on quit, the user's in-session config changes are lost when they quit -- different problem (engine-side, not slipgate-side), but it does mean Stage 2 sees nothing on engine-exit for FTE users while ezQuake users see config saves on every exit. The cleanup-notification cadence differs across engines.

**How to verify.** Half-day subagent: source-walk FTE's quit path to find any cfg-save-on-quit equivalent. Document the per-engine engine-exit behavior in the spec or carry to Arc E brainstorm.

### W6. The "private files survive rematerialization" pre-step is correct only if `private.json` is exhaustive

**File:line:** `:621` (private-file preservation pre-swap); `:510-514` (private.json schema, "No glob support in V1").

**Finding.** The pre-swap step copies `private.json` paths from live tree into temp tree. But:
- If a private file's *parent directory* doesn't exist in the new manifest, the copy needs to create the directory first. Spec doesn't say.
- If a private file's path collides with a manifest entry's target_path... wait, line 520 says collision is rejected at the private.json layer ("Remove from profile first, then mark private"). So that case is impossible by construction. Good.
- If the user marks a folder as private at `qw/notes/`, line 514 says "Marking a folder expands to the file set at mark-time; new files added inside that folder later don't auto-inherit privacy." But then if the user's engine writes a *new* file into `qw/notes/` (unlikely but possible via custom HUD output), it's NOT in private.json. The watcher treats it as Case 3 (untracked + new file). Stage 2 may classify it and try to warehouse it. The user's mental model is "the notes folder is private," but the substrate's model is "only the files I marked." This is a real divergence between user model and design model.

**How to verify.** Spec amendment or Arc E brainstorm note: explicitly document the no-glob limitation in user-facing language and add a "Hey, a new file appeared in qw/notes/ -- mark as private?" prompt to the cleanup notification when an untracked file appears within a previously-marked private folder.

---

## Spec navigation / clarity (low priority)

### S1. The reading guide is excellent but the "Skip on first read" advice may be too aggressive

**File:line:** `:26-27` ("Skip on first read: per-pass status retrospectives in `Open architectural questions` (read those when verifying decision lineage).")

The cold-eyes review benefited substantially from the reading guide. But "Open architectural questions" actually contains the cleanest per-pass synthesis of what each pass settled vs deferred, and the "Still open" section at the end is the cleanest list of "what's actually open." A cold reader who follows the "Skip on first read" advice will miss the at-a-glance lineage view. Consider rewording to "Skim on first read for decision lineage; deep-read when validating a specific pass's settlement against the body."

### S2. The clone-modal consumer count (5 -> 6 -> 7) is a useful through-line but is mentioned in too many places

The "seven consumers of the clone modal" pattern is one of the design's strongest collapses, and it's mentioned in roughly 10+ places. Many of those mentions are correct but redundant -- they each re-enumerate the seven consumers. Pass 5.3 has already taken hygiene passes; consider a single canonical list (in Primitive operations -- Clone modal section) and a short hyperlink-shape reference elsewhere ("[seventh consumer of clone modal]"). This is a minor doc-density issue and not load-bearing.

### S3. Catalog data shape and Bundles in slipgate-app overlap heavily

`:1433-1531` (Catalog data shape) and `:1534-1583` (Bundles in slipgate-app) both walk the same primitive (bundles ARE manifests) from different angles. A cold reader reading sequentially gets the same content twice. Consider folding the Bundles section into Cloud catalog interaction as a subsection -- "Bundles are first-class in slipgate-app (UI angle)." Small refactor, big readability win.

### S4. Pass-status retrospectives at the end repeat content already drained into the body

`:1779-1882` (Open architectural questions) is 100+ lines that are deliberately retrospective per the section's own note ("most of what's below is per-pass *retrospective*"). If everything's drained, the body should suffice. Consider moving the retrospective to a separate doc (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-pass-retrospectives.md`) and replacing this section with a single paragraph that says "all 6 passes closed; see retrospective doc for the chronology."

---

## Surprises / things that worked well

### + 1. The clone modal as V1 selector primitive is a load-bearing UX collapse

Seven user-facing flows (clone, pre-publish review, selective import, pre-extraction overview, export, drift import, backup/restore) reuse one modal grammar. The cognitive consistency is striking. The Pass 3.2 → 5.1 → 5.3 evolution shows the framing was *right* at Pass 3 and absorbed two more consumers without breaking. This is the kind of design where adding the 8th consumer feels easy by construction. Very strong.

### + 2. Manifest-as-truth + tree-as-derived-state is structurally sound for the lossless-export pledge

The GC-walks-manifests-not-tree decision (`:1230-1236`) is a one-line architectural commitment that prevents an entire failure class. nlink-as-truth would have broken Arc G (per-config history) silently; the spec sees this clearly. This kind of "do the structurally-correct thing even when the operational cost is slightly higher" instinct shows up throughout the design.

### + 3. Hard-fork-with-drift-detection is the right call vs overlay

Pass 5.1's rejection of overlay (with operational reasons spelled out at `:157`) reads as a strong, considered decision. Overlay's auto-propagation surprise is exactly the kind of user-trust-erosion that turns a power-user feature into a footgun. The drift-detection-at-three-trigger-points design respects user agency without sacrificing the "live link to parent" value.

### + 4. Two growth axes principle is a useful framing tool

The principle at `:1763-1770` ("code grows recognition, catalog grows corpus") gives arc-planner a clear sequencing rule: anything that grows the asset corpus is catalog work and shouldn't gate on slipgate releases. This is one of those framings that pays off for the *next* arc, not the current one. (See I8 above for the wrinkle where this principle and offline-fully-functional pull against each other.)

### + 5. The per-pass minutes + the retrospective section together give arc-planner a lineage map

A future arc-executor working on Arc D's classifier wants to know "which Pass settled what about the classifier?" The Pass-3.4 ratification, plus the retrospective in Open architectural questions, plus the inline references throughout the body, give the executor three independent ways to find the decision. Doc-redundancy as design. The volume isn't free -- per S4 above -- but the resilience is real.

### + 6. The capture/swap pipeline's two-stage shape is structurally elegant

Stage 1 is purely-observe (no bytes read, no hashing, no mutation). Stage 2 happens at safe-moments under user control. The result: an entire class of "engine still writing" problems is eliminated by structure, not by defense. Pass 3.4 deserves credit for this -- it's the kind of "split the operation along the right axis" insight that's hard to discover but obvious once written. Defenses 1-4 work in concert with the structural separation, not against it.
