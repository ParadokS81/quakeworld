# L1 extractor entity-classification followups (from help-JSON audit probes)

**Status:** Gathering signal. Two of four help-JSON audit passes complete (cvar 2026-05-14, command 2026-05-15); macros and cmdline pending. Findings accumulate here until all four probes land, then this doc becomes the input for arc-planning the L1 extractor work.

**Genesis:** The ezQuake help-JSON empty-entries audit (parking doc `2026-05-14-ezquake-help-json-empty-entries-audit.md`) uses the qw-oracle Layer 1 entity DB as source of truth. Per-pass deep review surfaces L1 extractor weaknesses not visible without comparing audit verdicts against actual source.

**Why parking, not immediate fix:** the L1 extractor improvements warrant a proper arc (handler changes + schema migration + regression tests + queue regeneration). Full scope only emerges after all 4 audits. Audit deliverables (kick_to_ciscon questions, classifications.yaml appends, summary docs) are valid output independent of the extractor work -- they go upstream to ciscon regardless of when the extractor changes ship.

## Findings

### Cvar pass (2026-05-14) -- no *coverage* extractor findings (SUPERSEDED on the provenance axis -- see Cvar provenance pass 2026-05-15 below)

The cvar pass surfaced curatorial issues in the audit's seeds yaml, not the extractor. The extractor correctly emitted no rows for absent cvars (`vid_depthbits` / `vid_stencilbits`); the audit caught these via help_variables.json drift. See "Related concerns" below.

> This "no extractor findings" verdict was about *source-coverage* (does the extractor emit the right rows). It stands on that axis. It does **not** cover the *description/provenance* axis -- the 2026-05-15 source-comment-promotion fix (`2edce42b`) introduced a provenance defect that the next section documents. The two are independent; both can be true.

### Cvar provenance pass (2026-05-15) -- comment-promotion launders coder notes into the user-doc field and mislabels provenance

**Plain English.** ezQuake keeps two description surfaces *on purpose, for different readers* (confirmed by slime, active ezQuake dev, 2026-05-15): `help_*.json` is user documentation (WHAT a cvar does); the source `// trailing comment` is coder rationale (WHY the code is the way it is). They are **not** meant to mirror each other -- that separation is the modern norm; legacy code is inconsistent. The 2026-05-15 fix (`2edce42b`, `_handler_cvars.py`) promotes the trailing comment into the user-doc `desc` field whenever help-JSON has none. Under the two-audience model this is wrong for ezQuake: it copies coder notes/FIXMEs into the user-facing description, **mislabels their provenance as `help_json`** (curated user doc) when they are really code comments, and **masks the exact gap the help-JSON audit exists to find** (the cvar still has no user doc; we filled the field and stopped flagging it).

**THE open question is settled -- answer #2 (provenance bug), primary-sourced both sides, across all tags.** Not a faithful capture of upstream junk.

- Upstream `git -C research/repos/ezquake-source show <ref>:help_variables.json`, key `desc` (the field the extractor reads, `_handler_cvars.py:570`): for `extralogname` / `skill` / `mvd_info_setup` / `qtv_sayenabled` **and the "legit-looking" control `cl_voip_demorecord`**, `desc` is **absent / `system-generated:true` / `desc=None` at every extracted tag** (v3.0, v3.0.1, 3.1, 3.6.0, HEAD). Upstream never carried these strings as user doc.
- Our Postgres: all five have `help_desc` byte-identical to `trailing_comment` at **every** version row, all labeled `description_origin='help_json'`. The strings exist only in the source comment. The control case is the proof: the handoff flagged `cl_voip_demorecord` as a "legitimate mirror" -- it is a *promotion artifact too* (upstream `system-generated:true`, no `desc`). "Legit-mirror vs coder-junk" is a content-quality axis; on the **provenance** axis every promoted entity is mislabeled.

**Mechanism (two layers, each individually reasonable, defective composed -- information leakage across the extractor/loader boundary):**

1. `_handler_cvars.py:573-584` -- `elif cv["trailing_comment"]:` writes the comment verbatim into `entry["desc"]`, the help-JSON-shaped output field. Downstream cannot distinguish it from a genuine help-JSON desc.
2. `derive-entity-description.ts:104-111` -- `description_origin = CASE WHEN help_desc non-null ... THEN (ezquake/fte -> 'help_json')`. The loader's own `source_inline` branch (L109) was *designed* to catch exactly these code-only cvars, but the extractor pre-filled `help_desc`, so for ezQuake L109 is now **dead code**. The loader comment at L82-85 documents the *intended* behavior ("ezquake cvars with BOTH ... keep the JSON description") -- written for a world where the extractor does NOT pre-promote, which `2edce42b` ended.

**Blast radius (project-scoped, primary-source):**

- **Live product surface: 24 head-alive ezQuake cvars** -- upstream `help_variables.json` has no `desc`, our DB `help_desc` == the comment verbatim, all 24 mislabeled `description_origin='help_json'`. The list is a deliberate mix of clear coder-junk (`extralogname` <- `// no sv_ prefix? WTF!`; `mvd_info_setup` <- `// FIXME: non-ascii chars`; `skill` <- `// dont delete this variable - it used by mods`; `sv_unfake` <- `// bliP: 24/9 kickfake to unfake`) and serviceable-looking text (`r_drawhud` <- `// disables hud rendering`; `timeout` <- `// seconds without any message`). The point: once promoted+mislabeled the field cannot tell them apart, and the docs-triage now counts all 24 as "documented". ~14 of the 24 are `sv_*` (MVDSV-provenance per `reference_ezquake_dual_doc_model`; comment-only is *expected by convention* there -- but the mislabel still corrupts routing and the "documented" signal).
- **Full historical footprint: 47 distinct ezQuake cvar entities** ever had a byte-identical `help_desc==trailing_comment` row, across **502 entity x version rows**. This *reconciles the handoff's "498 byte-identical / 2110 both-present"*: those were row counts (entity x version pairs); actual 502 / 2114 post the all-15-tag re-walk. The entity-level truth is **47**, not ~498. 45 labeled `help_json`; 2 NULL origin (`sv_cpserver`, `sv_progtype` -- deriver did not stamp; ghost-adjacent edge, noted not chased).

**Does the data support slime's two-audience-by-design claim? Yes, decisively.** Of 118 ezQuake HEAD cvars that have **both** a genuine upstream help-JSON `desc` **and** a code comment: **3% (3) are identical text, 97% (115) are genuinely different**. The 3 identical are all `cl_voip_*` -- one contributor's local habit in one subsystem, not a general convention. And the *kind* of difference confirms the model: comments are WHY / code-archaeology / mnemonic (`cl_net_clientport // Was PORT_CLIENT in protocol.h`; `cl_nolerp // 0 is good for indep-phys, 1 is good for old-phys`; `cl_demoteamplay // for NQ demos where we need to say it is teamplay rather than FFA`), docs.json is user-facing WHAT. The "they just didn't bother rephrasing / both served both audiences" hypothesis is the ~3% exception, not the rule.

**SHIPPED 2026-05-15 (foundation gate -- promoted to a focused fix, NOT deferred to the diffuse L1 arc, because every downstream consumer + the help-JSON audit re-frame were gated on it).** Commits `dc50b3ef` (handler), `1f0227f5` (regression guard + floor recompute). All 15 ezQuake tags re-walked through the corrected extractor. Verification, primary-sourced post-walk:

- Bug signature (ezQuake cvar, `help_desc==trailing_comment`, origin `help_json`) collapsed **502 rows / 47 entities -> 39 rows / 3 entities**; the residual 3 are exactly the genuine upstream mirrors `cl_voip_micamp` / `cl_voip_vad_delay` / `cl_voip_vad_threshhold` (upstream `help_variables.json` genuinely carries that `desc`), correctly `help_json`.
- `extralogname` is `source_inline` at every version (3.1 / 3.6.9 / head), `help_desc` NULL, comment retained in `trailing_comment`; `skill` is correctly `help_json` (derives from genuine upstream enum-value docs, not the "dont delete this variable" comment).
- No idempotency inflation (0 duplicate `(entity,version)` rows; 2997 distinct = 2997 entities). Code-only engines untouched (KTX `source_inline`=68, MVDSV=35, unchanged).
- New regression gate `F1.ezquake.anchor.no_comment_promotion` pins the bug signature at the genuine-mirror baseline of 3 (PASS). typecheck clean.
- 2 regression-floor failures surfaced during verification (`cvar_count` 2992->2997, `source_retired` 204->209) were proven PRE-EXISTING and orthogonal: the floor was set at `b9b9b0c4` (00:57) before the prior session's all-15 re-walk; the `3be4d576` retreat scan is a deterministic temporal rule yielding 209 on a full walk; `source_backed`/`doc_only` unchanged. Re-baselined to verified-correct values -- this discharges the retreat-corrected-entity-set recompute the RESCAN banner flagged as owed (it was never my desc-only change).

What shipped (the recommended action, executed):

1. **Remove the ezQuake-side promotion in `_handler_cvars.py:573-584`.** Keep the comment in `trailing_comment` only; do not write it into `entry["desc"]`. The loader's existing project-gated fallback (`derive-entity-description.ts:102/109`) *already* surfaces `trailing_comment` as the description for code-only engines (KTX/MVDSV/QWCL, no help-JSON by design) and *already* stamps that `source_inline` correctly. Removing the extractor pre-promotion restores that path for ezQuake and lets the correct `source_inline` label flow -- it does **not** regress code-only engines (verify with an F1 probe on KTX/MVDSV description coverage before/after).
2. **Provenance invariant:** a description derived from a `// comment` is `source_inline`, never `help_json`, in *every* project. `help_json` must mean "came from a genuine help-`*`.json user-doc field". Add a regression gate asserting no ezQuake cvar has `description_origin='help_json'` while its `help_desc` is byte-identical to its `trailing_comment` and upstream `help_variables.json` lacks a `desc` for it.
3. **Audit-predicate correction (folded into the RESCAN banner -- see below).** "Documented" for the docs-triage = a genuine help-JSON user-doc surface (`desc`/`remarks`/`values`) is non-empty. A trailing comment -- even when surfaced as a fallback description -- must NOT suppress a user-doc-gap flag. The comment may *inform* the human's `needs_doc` vs `no_doc` call; it is not itself the documentation. "Coder-only, user doesn't need it" is the `no_doc` verdict (a per-entity curatorial judgment recorded in `help_json_classifications.yaml`), never an extractor auto-decision.

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

> **`macro.teamplay_restricted` "inversion" -- VERIFIED NON-FINDING (2026-05-15), do NOT propagate.** A paused side-project terminal reported the L1 DB marks `$weapon/$weaponnum/$lastip/$latency/$ping` teamplay-restricted and `$powerups/$location/$deathloc/$took` unrestricted, "exactly backwards for all 9". Checked against primary source: `src/teamplay.c` HEAD registers `weapon/weaponnum/lastip/latency/ping` via plain `Cmd_AddMacro` (-> MACRO_NORULES -> not restricted) and `powerups/location/deathloc/took` via `Cmd_AddMacroEx(..., teamplay)` (-> restricted). The current DB shows `weapon..ping = f`, `powerups..took = t` -- i.e. it **matches source truth, not backwards**. `_handler_macros.py:_derive_teamplay_restricted` derives from the AST registration form (its docstring explicitly calls help-JSON's `teamplay-restricted` unreliable). The terminal's claim does not reproduce on current L1 (likely a pre-fix/stale read). This is a dispatched-terminal claim that failed primary-source verification (`feedback_verify_dispatched_terminal_claims`); it must NOT enter the arc as a finding.

### Cmdline pass (TBD)

Findings appended after cmdline audit completes.

### Reachability brainstorm Pass 1 -- HUD dynamic-name family + command case-fold harness gap (2026-05-16)

From the libclang-callgraph-reachability arc brainstorm (Pass 1, spec
`docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`).
**AMENDED 2026-05-16 -- pulled INTO the arc.** Originally banked here as
siblings. On operator decision the HUD dynamic-name family is now **Track B**
of the enforce-L1-runtime-truth arc, and the command case-fold harness gap is
its **shared foundational prerequisite** (VERIFIED: it also injects >=3 false
ghosts -- `loadfragfile`, `unignoreall`, `unignoreall_team` -- into Track A's
pool, so it blocks both tracks). See spec
`docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`.
Only `Cmd_AddLegacyCommand` persistence + trailing-comment harvester
precision remain siblings for a future L1-extractor arc. The verified
mechanism detail below now informs Track B. Verified primary-source this
session.

**HUD dynamic-name command family (the reverse-diff "~129/132").** ezQuake
registers HUD-element commands with names built at runtime, invisible to the
literal-keyed AST extractor:

- `src/hud.c:1232` -- `Cmd_AddCommand(name, HUD_Func_f)` registers the bare
  `<name>` command (`radar`, `speed`, `gun`, `gun2`, ...). `name` is the
  `HUD_Register` first parameter, not a literal at the call site.
- `src/hud.c:1271-1278` -- builds `cmdname = "+hud_" + name` in a
  `char[128]`, flips byte 0 to `-`, then `Cmd_AddRemCommand(cmdname, ...)`.
  Registers `+hud_<name>`/`-hud_<name>` when the `HUD_PLUSMINUS` flag is set.
  The string `"+hud_radar"` is never a contiguous literal anywhere.
- The element-name literals exist one call up: `HUD_Register("radar", ...,
  HUD_PLUSMINUS, ...)` (`src/hud_radar.c:1422`), `"speed"`
  (`hud_speed.c:679`), `"gun2"` (`hud_guns.c:367`).
- Verified absent from L1 (Postgres, case-insensitive, ezquake/command,
  HEAD): bare `radar`/`speed`/`gun`/`clock`/`face`/`frags` and all
  `+hud_*`/`-hud_*`. Known-answer gate PASSES: literal-named HUD commands
  `hud_recalculate`/`togglehud` ARE in L1 -- the miss is isolated precisely
  to variable-named registrations, not a broad HUD-parse failure.
- Sibling-arc design lean (operator, Pass 1): reliably AST-discoverable by
  modeling the `HUD_Register` contract (literal first arg + the fixed
  internal registration template). Lightweight known-answer drift guard only
  (assert `+hud_radar` rediscovered each run); do NOT build speculative
  change-detection -- HUD has been stable for years; cross the rewrite bridge
  if/when it happens.

**Command-direction case-fold harness gap.** The runtime-vs-L1 reverse-diff
for COMMANDS was computed case-sensitively (`/tmp/src-command.txt`
non-case-folded vs `/tmp/rt-cmds.txt`); the cvar pool had a `-cf`
case-folded variant, the command direction did not. Effect: every camelCase
command (stored lowercase in L1, dumped camelCase at runtime) is a false
"runtime-not-in-L1" positive, inflating the ~132 figure. The command
reverse-diff needs the same case-fold normalization the cvar pool already has
before its count is trustworthy.

**RETRACTED -- do not propagate.** An earlier same-session claim that
`unignoreAll` / `loadFragfile` were *missed literal* `Cmd_AddCommand`
registrations (a real extractor bug) is FALSE. They are present in L1
lowercased (`unignoreall`, `loadfragfile`); the runtime dump preserves source
camelCase. It was the case-fold artifact above, caught by direct DB
verification. No missed-literal finding exists; this must not re-enter as a
tracked finding.

## Related concerns (may warrant separate followups)

**Help-JSON drift detection.** Cvar pass null-source bucket (8 entries) and command pass null-source bucket (5 entries) surface drift between help_*.json and current source HEAD. Some are PR #1120 (drift cleanup) survivors; some are subsystem-removal residue (e.g., mp3_volume from deleted mp3_player.c); some are name transpositions (loadfont vs fontload). A periodic drift-detection pass would catch these automatically -- could be a standalone tool comparing help_*.json keys against entity DB names per project per version, or folded into the load-knowledge pipeline as a warning.

**Trailing-comment harvester precision (secondary, surfaced during the provenance pass).** A few `trailing_comment` values are not prose comments but code tokens the closer-anchored harvester over-captured: `cl_camera_death` -> `1` (a default), `cl_confirmquit` -> `, CVAR_INIT` (a flag-arg fragment). Low frequency, separate from the provenance finding (these are not promoted into user docs once the promotion is removed), but the L1-refinement arc that touches `_handler_cvars.py:637-672` (`_attach_trailing_comments`) should tighten the closer anchoring so non-comment tail tokens are not captured. Not a standalone workstream.

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
