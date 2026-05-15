# L1 extractor entity-classification followups (from help-JSON audit probes)

**Status:** Gathering signal. Two of four help-JSON audit passes complete (cvar 2026-05-14, command 2026-05-15); macros and cmdline pending. Findings accumulate here until all four probes land, then this doc becomes the input for arc-planning the L1 extractor work.

**Genesis:** The ezQuake help-JSON empty-entries audit (parking doc `2026-05-14-ezquake-help-json-empty-entries-audit.md`) uses the qw-oracle Layer 1 entity DB as source of truth. Per-pass deep review surfaces L1 extractor weaknesses not visible without comparing audit verdicts against actual source.

**Why parking, not immediate fix:** the L1 extractor improvements warrant a proper arc (handler changes + schema migration + regression tests + queue regeneration). Full scope only emerges after all 4 audits. Audit deliverables (kick_to_ciscon questions, classifications.yaml appends, summary docs) are valid output independent of the extractor work -- they go upstream to ciscon regardless of when the extractor changes ship.

## Findings

### Cvar pass (2026-05-14) -- no extractor findings

The cvar pass surfaced curatorial issues in the audit's seeds yaml, not the extractor. The extractor correctly emitted no rows for absent cvars (`vid_depthbits` / `vid_stencilbits`); the audit caught these via help_variables.json drift. See "Related concerns" below.

### Command pass (2026-05-15) -- Cmd_AddLegacyCommand not distinguished from Cmd_AddCommand

> **Correction (2026-05-15, primary-source verified).** The finding below
> is **stale**. `_handler_commands.py` *does* detect `Cmd_AddLegacyCommand`
> (`REGISTRATION_APIS` L184) and *does* emit `legacy_alias_of` into the AST
> entry (derivation L234-239/251-252, AST emit L296-297). The real gap is
> **loader-side**: `legacy_alias_of` is not persisted (no schema column),
> so the alias relationship is dropped after extraction. That is arc work
> (schema migration + loader + consumer), **not a handler bug**. The
> recommended-extractor-change block below is partly already implemented;
> rescope to loader-persistence when this folds into the arc.

The L1 extractor's command handler does not differentiate `Cmd_AddLegacyCommand` from `Cmd_AddCommand`. Deprecated rename shims are extracted as commands without flag.

**Scope of impact (current command pass): 28 entries** -- full list in `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-empty-entries-commands.md` § "Kick-to-ciscon" and § "Family collapse" (fs.c block, snd_main.c s_restart, teamplay_locfiles.c block).

**Three usage patterns observed in source:**

a) **Target is a renamed cvar** -- host.c:559-595 block (26 entries: nosound → s_nosound, precache → s_precache, ..., con_sound_other_volume → s_otherchat_volume); hud_centerprint.c:57 (scr_printspeed → scr_centerspeed); vid_sdl2.c:1876 (vid_framebuffer_palette → vid_software_palette). These should NOT appear in the command entity DB at all. The audit treated them as kick_to_ciscon with the misclassification question.

b) **Target is a renamed command** -- fs.c block (loadpak → fs_loadpak, removepak → fs_removepak, dir → fs_dir, locate → fs_locate); snd_main.c:447 (snd_restart → s_restart); teamplay_locfiles.c:533-541 (loadloc → locations_loadfile, saveloc → locations_savefile, addloc → locations_add, removeloc → locations_remove, clearlocs → locations_clearall). These ARE legitimate aliases for real commands. The audit treated them as family_collapse rows (fs.c, snd_main.c) OR folded the alias into the canonical command's draft as a "Legacy alias: X" line (teamplay_locfiles.c).

c) **Empty target / warning suppression** -- snd_main.c:485 (`Cmd_AddLegacyCommand("play", "")`). Legacy name registered to silently suppress "unknown command" warnings when scripts still call it; no redirect target. Edge case.

**Recommended extractor change (proposal -- finalize in arc):**

Detect Cmd_AddLegacyCommand calls. Emit with explicit flags rather than filtering, so alias relationships remain queryable:

```
is_legacy_alias: true
legacy_target_name: <target name>
legacy_target_type: cvar | command | empty
```

Audit / consumer code filters by `is_legacy_alias=false` when "real commands only" is wanted; uses the flag when alias lookup is wanted ("what was X renamed to?"). This preserves discoverability without polluting the command entity table.

### s_stereo ghost classification + F2.flickering scoping (2026-05-15) -- RESOLVED, no extractor finding

Two issues triaged off the entity-state-retreat fix (`3be4d576`); both
closed, neither an extractor bug.

**Issue A -- `s_stereo` is `source_retired`, not `doc_only`.** Verified
no-op. `source_state` is loader-derived; `3be4d576`'s retreat logic is
purely temporal (latest surviving version-row below HEAD -> `source_retired`,
no provenance check). `s_stereo`'s latest row is 3.6.9 -> `source_retired`
is the intended output. It is functionally inert: `build-snapshot.ts`
excludes `doc_only` and `source_retired` identically; the MCP tools select
`source_state` as a label but never filter on it. Calling it `doc_only`
would be *wrong* under the model (`doc_only` = present at HEAD; s_stereo is
not at HEAD). A provenance-accurate ghost state (e.g. `doc_retired`) is a
deliberate schema/enum question, **not** this followup -- not opened.

**Issue B -- F2.flickering_presence false-positived on `s_stereo`.** Fixed
in commit `9a5a0c2d`. Root cause: F2 excluded ghosts via the `doc_only`
label; `3be4d576` moved 126 never-source-backed ezquake cvar ghosts
`doc_only -> source_retired`, re-admitting them. Fix: exclude by the
provenance fact (no `source_file` at any version) alongside the unchanged
`doc_only` filter; skip the clause for `asset_category` (no source_file
column). Verified: ezquake F2.flickering FOUND 1 -> CLEAN (anomalies
3 -> 2); fte/mvdsv/qwcl/ktx unchanged.

**`s_stereo` lifecycle (primary-source, settles the prior hallucination).**
Real Linux/ALSA cvar 2005 (`b8236019`) -> 2013; removed by SDL2 import
(`0538d9ae`/`1215c7c3`), last ref cleaned 2015 (`38845510`). Earliest
extracted tag v3.0 = 2016 -- *after* the purge. Zero `s_stereo` in source
at any tag or in `upstream/master`. The extractor is **not** blind to
Linux code (4-variant parse; `__linux__` is the libclang baseline). Commit
`291268bd`'s "live Linux-only cvar invisible to the extractor" claim is
retracted in `docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md`.

### Macros pass (TBD)

Findings appended after macros audit completes.

### Cmdline pass (TBD)

Findings appended after cmdline audit completes.

## Related concerns (may warrant separate followups)

**Help-JSON drift detection.** Cvar pass null-source bucket (8 entries) and command pass null-source bucket (5 entries) surface drift between help_*.json and current source HEAD. Some are PR #1120 (drift cleanup) survivors; some are subsystem-removal residue (e.g., mp3_volume from deleted mp3_player.c); some are name transpositions (loadfont vs fontload). A periodic drift-detection pass would catch these automatically -- could be a standalone tool comparing help_*.json keys against entity DB names per project per version, or folded into the load-knowledge pipeline as a warning.

**Classification quality (in seeds yaml, not extractor).** Cvar pass operator review renamed `server_mirror_or_obsolete` to plain `obsolete` for vid_*bits. The classification name was conflating two distinct concepts (server-mirror means client carries a metadata-only entry; obsolete means feature removed). Curatorial seed at `apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml`. Out of scope for this parking doc -- noted here so the arc-planning step considers whether the classification taxonomy itself wants a tightening pass.

**`kick_to_ciscon` routing vocabulary mis-addressed (separate workstream).** Per memory `reference_ezquake_dual_doc_model` / `reference_ezquake_dev_team`: ezquake-source doc fixes route to nano/slime, `sv_*` to MVDSV source; ciscon is QWiki/community, not ezquake-dev. The audit's `kick_to_ciscon` verdict is mis-addressed across 4 generated deliverables (`apps/qw-oracle/docs/upstream-prs/ezquake-help-json-empty-entries{,-commands,-cmdline,-macros}.md`) + the audit parking doc (`docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md`). **Verified 2026-05-15:** the string is *not* in `help_json_classifications.yaml` nor `build-help-json-pr-digest.py` -- its true source is unlocated, so a blind find-replace is unsafe. This is a **semantic re-bucketing** (per-entry: ezquake-native -> nano/slime; sv_* -> MVDSV; genuine-community -> ciscon stays), part of the help-JSON empty-entries audit workstream, not the s_stereo/F2 topic. Tracked for that audit's next pass; do not couple to extractor/loader changes.

**mvdsv (35) / ktx (68) help_desc-empty-with-trailing-comment counts UNVERIFIED.** Carried from the handoff as a *hypothesis, not a finding*. mvdsv/ktx/fteqw have **no help-JSON** (only ezquake runs the dual-doc system -- memory `reference_ezquake_dual_doc_model`), so empty `help_desc` for single-source engines may be normal-by-design and `derive-entity-description.ts` may already surface their trailing comment. The earlier "same bug exists in mvdsv/ktx" statement was walked back. Verify per-engine before treating as a cross-project bug.

## Carry-forwards

- `docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md` -- audit parking doc that surfaces these findings.
- `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-empty-entries.md` -- cvar pass deliverable.
- `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-empty-entries-commands.md` -- command pass deliverable (full Cmd_AddLegacyCommand detail in § "Kick-to-ciscon").
- `docs/superpowers/parking/2026-05-13-l1-extractor-asset-loader-enhancements.md` -- neighbor in the L1 extractor improvement space; arc-planning step may consider consolidating.
- `docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md` -- L1 extractor refinement arc (Phase A+B shipped, Phase C pending). Possibly the same arc absorbs this work when the time comes.
- `apps/qw-oracle/scripts/extractors/ezquake/_handler_*.py` -- primary targets for the eventual changes (the command handler specifically for Cmd_AddLegacyCommand handling).
