# Handoff: L1 extractor refinement Phase B worker (fresh terminal)

**Type:** worker-terminal handoff (returns updated handler files + extractor re-run output for oversight approval)
**Dispatched:** ready for dispatch by fresh oversight terminal
**Predecessor:** commit `beb57c46` (Phase A: Cat 1 + Cat 2); decision doc at `docs/superpowers/specs/2026-05-14-l1-vocabulary-alignment-decisions.md` Phase 2 cases 2 + 5
**Parking doc to fulfill:** `docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md` Category 3 (write-path leakage)

This terminal is a **worker**, not an orchestrator. The oversight session (separate terminal) makes commit decisions and dispatches you. You execute the Phase B fix, re-run extractors, verify diffs, and halt for review. Do not commit, do not push, do not run Phase C work.

---

## Prompt to paste

```
You are picking up Phase B of the L1 extractor refinement arc as a
worker session. The oversight session has dispatched you; it expects
updated handler files + extractor re-run verification when you halt.

Working dir: /home/paradoks/projects/quakeworld

Read first (in priority order):

1. docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md
   -- the arc punch list. The Phase A status header at the top
   summarizes what already shipped. YOUR SCOPE is Category 3 only
   (15 sites of write-path leakage: screenshot 11 + log 4).
   Categories 1, 2, 4 are not your scope.

2. docs/superpowers/specs/2026-05-14-l1-vocabulary-alignment-decisions.md
   -- Phase 2 case 2 (screenshot write-path leakage) + Phase 2 case 5
   (log write-path leakage) ground the fix. Includes the nested
   FTE issue: Image_WriteKTXFile / Image_WriteDDSFile are texture-
   format encoders, NOT user screenshot writes, and the same regex
   prefix catches them.

3. apps/qw-oracle/scripts/extractors/ezquake/_handler_asset_loader_sites.py
   apps/qw-oracle/scripts/extractors/fte/_handler_asset_loader_sites.py
   -- the L1 extractor handler files you are editing. Key lines:
   - ezQuake line 314: the screenshot ENCLOSING_FN_CATEGORY_RULES
     regex `Image_Write|_WriteTGA|_WritePNG|_WriteJPEG|_OpenAPNG|SCR_ScreenShot`
   - FTE line 96: `.log` in EXT_TO_CATEGORY
   - FTE line 182: the screenshot regex
     `SCR_ScreenShot|Image_Write|_WriteTGA|_WritePNG|_WriteJPEG`
   - GENERIC_FS_PRIMITIVES handling at ezQuake line 822 / FTE line 657
     (the fall-through path that emits FS_OpenVFS sites with the
      enclosing-fn-rule category).

4. Source-of-truth reads (verify against live source):
   - ezQuake screenshot writers: research/repos/ezquake-source/src/image.c
     (Image_WritePNG, Image_OpenAPNG, Image_WriteTGA, Image_WriteJPEG;
     lines ~935-1484)
   - FTE screenshot writer: research/repos/fteqw/engine/client/cl_screen.c
     (SCR_ScreenShot_f) -- and the texture-format encoders are at
     research/repos/fteqw/engine/gl/gl_videgl.c or similar
     (Image_WriteKTXFile, Image_WriteDDSFile -- grep to find)
   - FTE log writers: research/repos/fteqw/engine/common/log.c
     (Log_String) + research/repos/fteqw/engine/qclib/pr_cmds.c
     (PF_logtext) + research/repos/fteqw/engine/server/sv_ccmds.c
     (SV_Fraglogfile_f)

---

YOUR SCOPE: Category 3 from the arc (write-path leakage)

Entry 11 -- screenshot (8 ezQuake + 3 FTE sites): all sites are
FS_OpenVFS calls inside Image_Write* / Image_OpenAPNG / SCR_ScreenShot
write paths. None are loader sites by definition (the extractor's
job is to find code that READS asset files, not writes them). Nested
issue (FTE only): Image_WriteKTXFile / Image_WriteDDSFile are
texture-format encoders (engine's compressed-texture writer pipeline),
not user-facing screenshot writes -- the regex catches them too.

Entry 12 -- log (0 ezQuake + 4 FTE sites): all 4 FTE sites are
FS_OpenVFS in Log_String / PF_logtext / SV_Fraglogfile_f. All
writes. The `.log` EXT_TO_CATEGORY entry serves no read-path
purpose (no user installs .log files).

---

ARCHITECTURAL DECISION (yours to make):

Two fix shapes are defensible per the decision doc:

OPTION A (regex-narrow): Remove or tighten the screenshot
ENCLOSING_FN_CATEGORY_RULES regex in both handlers so write
functions no longer match. The FS_OpenVFS sites inside write
functions then fall through GENERIC_FS_PRIMITIVES handling and
get tagged null (or whatever the next tier produces). Drop
`.log` from FTE EXT_TO_CATEGORY entirely.

OPTION B (branch-drop): At the GENERIC_FS_PRIMITIVES handling
layer (ezQuake line 822 / FTE line 657), add a filter that skips
write-side FS_OpenVFS sites entirely so they never emit. Detection
of "write-side" comes from the enclosing function name matching a
write-function regex.

PICK ONE based on source reading. Considerations:

- Option A is less invasive (just edits to the existing tier
  rules) but leaves the write-side FS_OpenVFS sites in the JSON
  with null category. Downstream consumers (derive, asset-type-
  curate) skip null sites, so behavior is correct -- but the
  JSON carries dead weight.
- Option B is more invasive (touches the merge/emit logic) but
  cleaner -- write-side sites never appear in the output. Reduces
  JSON size and removes a class of misleading rows.
- Either option must handle the FTE Image_WriteKTXFile /
  Image_WriteDDSFile texture-encoder cases. They are write functions
  too; they should not stay as `screenshot` and should not surface
  as legitimate texture-load sites (they are writes, not reads).

RECOMMEND if undecided after 20 min source reading: Option A
(narrower scope; downstream consumers already skip null).

---

EXECUTION SEQUENCE:

1. Pre-flight: take baseline snapshot of L1 site counts per
   asset_category for both engines:
   ```bash
   jq '[.loader_sites[] | .reads_category_id] | group_by(.) | map({cat: .[0], count: length}) | sort_by(-.count)' \
     apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-asset-loader-sites-ast.json > /tmp/baseline-b-ezquake.json
   jq '[.loader_sites[] | .reads_category_id] | group_by(.) | map({cat: .[0], count: length}) | sort_by(-.count)' \
     apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json > /tmp/baseline-b-fte.json
   ```

2. Verify the write-side claim. For each function the screenshot
   regex catches (ezQuake: Image_WritePNG/Image_OpenAPNG/Image_WriteTGA/
   Image_WriteJPEG/SCR_ScreenShot; FTE: same minus _OpenAPNG, plus
   Image_WriteKTXFile/Image_WriteDDSFile if present), read the
   source and confirm the FS_OpenVFS call inside opens for write
   (mode argument is FS_WRITE / "wb" / similar), not read. If any
   function turns out to open for read, surface it in your halt
   summary -- the regex catches a legitimate read site.

3. Apply your chosen option:
   - Option A: edit the screenshot regex in both handlers; drop
     `.log` from FTE EXT_TO_CATEGORY.
   - Option B: extend GENERIC_FS_PRIMITIVES handling with a write-
     function exclusion, document the regex.

4. Re-run both extractors:
   ```bash
   python3 apps/qw-oracle/scripts/extractors/ezquake/extract.py
   python3 apps/qw-oracle/scripts/extractors/fte/extract.py
   ```
   (Use the project's canonical entry point if different from
   the above.)

5. Take post-fix snapshot and diff:
   ```bash
   jq '[.loader_sites[] | .reads_category_id] | group_by(.) | map({cat: .[0], count: length}) | sort_by(-.count)' \
     apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-asset-loader-sites-ast.json > /tmp/postfix-b-ezquake.json
   diff /tmp/baseline-b-ezquake.json /tmp/postfix-b-ezquake.json
   # Same for FTE.
   ```

6. Verify the diff is clean per Phase B success criteria:
   - ezQuake `screenshot` count drops by 8 (Image_Write* sites).
     If Option A: those 8 sites become null. If Option B: those
     8 sites disappear.
   - FTE `screenshot` count drops by 3 (write sites) + however
     many texture-encoder sites the prefix was catching. Same
     option-A-vs-B behavior.
   - FTE `log` count drops to 0 (Option A: `.log` ext removed;
     Option B: log writes filtered out).
   - NOTHING ELSE shifts. Especially: no legitimate texture or
     model sites should disappear. The screenshot regex only
     applied to write functions; narrowing it should not affect
     unrelated reads.

7. Spot-check via derive_asset_types.py:
   ```bash
   python3 apps/qw-oracle/scripts/extractors/qw/derive_asset_types.py
   ```
   The 21 asset_types should be unaffected by Phase B (no slug
   bridges to screenshot or log). Confirm counts unchanged for:
   skybox, charset, hud_element, map, config, conback, player_skin,
   model_texture.

---

CRITICAL RULES:

1. Do NOT commit. Do NOT push. Do NOT git add. Oversight reviews
   your diff + extractor output, may revise, and handles commits.

2. Do NOT execute Category 4 (FTE charset watchlist gap). That is
   a separate worker dispatch (Phase C). If you find yourself
   editing FTE LOADER_FUNCTIONS or reading gl_font.c, you have
   drifted scope -- stop and halt.

3. Do NOT introduce a new `screenshot` category alias, partition
   shape, or read/write split unless you have a load-bearing source
   reason. Simpler is better.

4. Trust source over the arc punch list. Verify each write-function
   claim against the actual source. If any function in the regex
   does have a read path (FS_OpenVFS with read mode), surface it
   -- do NOT silently keep the wrong tagging.

5. Surface new findings if you hit any. Examples: a misroute that
   slipped past Phase A; an Image_Write* prefix collision (e.g.,
   a legit reader function named Image_WriteRGB_Read); the
   FTE texture-encoder cases needing a separate handling shape.
   Add a "## New findings" section at the bottom of your halt
   summary.

6. ASCII only. Plain English. Decisive language.

7. THOROUGH, NOT RUSHED. Do not skip the verification snapshot
   diffs. The "nothing else shifts" check is the load-bearing
   safety net.

---

HALT-AND-REPORT shape:

When you finish (or hit a blocker), produce a halt summary:

  STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED

  Option chosen: <A regex-narrow | B branch-drop>
  Reason: <one-line justification grounded in source>

  Diff against baseline (per engine):
    ezQuake: <category: count change list>
    FTE:     <same shape>

  Per-target status:
    1. screenshot ezQuake (8 sites): <DONE -- now null | DONE -- emitted | SKIPPED + reason>
    2. screenshot FTE (3 user + N texture-encoder sites): <same>
    3. log FTE (4 sites): <DONE | SKIPPED + reason>

  Source verification of write-only claims:
    Image_WritePNG (ezQuake):       <write-only confirmed | found read path: ...>
    Image_OpenAPNG (ezQuake):       <same>
    Image_WriteTGA (ezQuake):       <same>
    Image_WriteJPEG (ezQuake):      <same>
    SCR_ScreenShot (ezQuake):       <same>
    SCR_ScreenShot_f (FTE):         <same>
    Image_WriteKTXFile (FTE):       <same>
    Image_WriteDDSFile (FTE):       <same>
    Log_String (FTE):               <same>
    PF_logtext (FTE):               <same>
    SV_Fraglogfile_f (FTE):         <same>

  Files modified:
    apps/qw-oracle/scripts/extractors/ezquake/_handler_asset_loader_sites.py
    apps/qw-oracle/scripts/extractors/fte/_handler_asset_loader_sites.py

  Spot-check on derived asset-types (post derive_asset_types.py):
    All 21 asset_type counts: <unchanged | list deltas>

  New findings (if any): <one line each>
  Open questions for oversight: <list, or "none">

  Time spent: ~<minutes>

Then halt.
```

---

## Why fresh terminal

Phase B has one architectural decision (regex-narrow vs branch-drop) plus the FTE texture-encoder edge case. Oversight has Phase A context already loaded; a fresh worker reads the punch list + decision doc cold and applies the chosen option without unconscious priors. If the worker's option choice surprises oversight, that's signal worth examining.

## What oversight will check on return

- Baseline + post-fix snapshots show the expected drops (screenshot -8 ez, screenshot -3-N fte, log -4 fte) and nothing else shifted.
- Handler files modified contain ONLY the expected new edits (no scope creep into Cat 4).
- Option-A-vs-B decision is source-grounded and justified.
- All write-function source claims verified (the per-target table above).
- Spot-check on derive shows the 21 asset_type counts unchanged.
- "New findings" section: empty is fine; non-empty informs Phase C scope or post-refinement arc.
- No commits made.

## After this returns

Oversight reviews diff + extractor output. If clean, commits as a single Phase B commit. Then drafts Phase C handoff (FTE charset watchlist gap; the smallest phase) for the next worker dispatch. After Phase C ships, the refinement arc closes and we move to Step 4 (skybox re-walk) and Step 5 (concept-note partners).
