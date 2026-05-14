# Handoff: L1 extractor refinement Phase A worker (fresh terminal)

**Type:** worker-terminal handoff (returns updated handler files + extractor re-run output for oversight approval)
**Dispatched:** ready for dispatch by fresh oversight terminal
**Predecessor:** commit `b0b736be` (vocab audit closure + refinement arc reorg); decision doc at `docs/superpowers/specs/2026-05-14-l1-vocabulary-alignment-decisions.md`
**Parking doc to fulfill:** `docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md` Categories 1 + 2

This terminal is a **worker**, not an orchestrator. The oversight session (separate terminal) makes commit decisions and dispatches you. You execute the fixes for Phase A scope, re-run extractors, verify diffs, and halt for review. Do not commit, do not push, do not run Phase B or C work.

---

## Prompt to paste

```
You are picking up Phase A of the L1 extractor refinement arc as a
worker session. The oversight session has dispatched you; it expects
updated handler files + extractor re-run verification when you halt.

Working dir: /home/paradoks/projects/quakeworld

Read first (in priority order):

1. docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md
   -- the full arc punch list. YOUR SCOPE is Categories 1 + 2 only
   (10 misroutes + 4 console reroutes = 14 entries). Categories 3
   and 4 are SEPARATE worker dispatches; do NOT touch them.

2. apps/qw-oracle/scripts/extractors/ezquake/_handler_asset_loader_sites.py
   apps/qw-oracle/scripts/extractors/fte/_handler_asset_loader_sites.py
   -- the L1 extractor handler files you are editing. Read the
   current FUNCTION_TO_CATEGORY, ENCLOSING_FN_CATEGORY_RULES, and
   ENCLOSING_FN_CATEGORY_OVERRIDES tier definitions before editing.

3. docs/superpowers/specs/2026-05-14-l1-vocabulary-alignment-decisions.md
   -- decision doc that grounds the Category 2 routing (new internal
   asset_category labels `inline_chat_url` and `console_window_ui`,
   not folding into seed `conback`).

4. Investigation reports (source for each case; read selectively per
   entry):
   - apps/qw-oracle/docs/asset-curation/skybox-investigation.md
   - apps/qw-oracle/docs/asset-curation/charset-investigation.md
   - apps/qw-oracle/docs/asset-curation/hud_element-investigation.md
   - apps/qw-oracle/docs/asset-curation/map-investigation.md

5. Extractor source-of-truth reads for the FTE hud_overlay 5-case
   cluster (the tier-fix vs per-site override question):
   - research/repos/fteqw/engine/client/r_2d.c (R2D_Conback_Callback)
   - research/repos/fteqw/engine/gl/gl_font.c (Font_LoadHexen2Conchars)
   - research/repos/fteqw/engine/client/m_single.c (M_Menu_LoadSave_Preview_Draw)
   - research/repos/fteqw/engine/common/com_mesh.c (Mod_ParseMD5MeshModel)
   - research/repos/fteqw/engine/client/m_multi.c (MSetup_TransDraw)

---

YOUR SCOPE (Categories 1 + 2 from the arc):

CATEGORY 1 -- 10 misroutes (mechanical handler-override fixes):

ezQuake (4 entries):
1. skybox `Mod_LoadExternalSkyTexture` -- operator decision per the
   arc: re-route to `map_texture` OR keep at `skybox` with dual-
   mechanism documented in the asset-note (current state). DEFAULT:
   keep at skybox if the operator hasn't already decided otherwise;
   the asset-note already documents both mechanisms. Flag the
   decision in your halt summary.
2. skybox `Skywind_Load_f` -- add override:
   `(re.compile(r"^Skywind_Load_f$"), "ezquake:asset_category:skybox")`
3. charset `Load_LMP_Charset` -- add override:
   `(re.compile(r"^Load_LMP_Charset$"), "ezquake:asset_category:charset")`
4. config `LoadFragFile` -- add override:
   `(re.compile(r"^LoadFragFile$"), "ezquake:asset_category:config")`

FTE 5-case hud_overlay cluster (the tier-fix question):
5. R2D_Conback_Callback -> conback
6. Font_LoadHexen2Conchars -> charset
7. M_Menu_LoadSave_Preview_Draw -> levelshot
8. Mod_ParseMD5MeshModel -> model_texture
9. MSetup_TransDraw -> player_skin

   The arc's open question: is this a tier-level routing precision
   issue (the FTE hud_overlay tier catches too broadly) or 5 per-
   site overrides? Inspect FTE handler's categorization logic.
   Look at what discriminator currently routes these to hud_overlay
   -- if they share a common signal (e.g., R_RegisterPic call
   pattern catching everything), tighten the tier. If each is
   independently a one-off, ship 5 per-site overrides.

   RECOMMEND: per-site overrides if tier-fix isn't cleanly
   discoverable in 15-20 min. Don't over-engineer; the 5 cases
   are well-named.

Map (1 entry):
10. FTE Mod_LoadBrushModel -> map -- add override:
    `(re.compile(r"^Mod_LoadBrushModel$"), "fte:asset_category:map")`

CATEGORY 2 -- 4 console reroutes (with new internal categories):

The decision doc settled this: new internal `asset_category` labels,
not null and not folded into seed `conback`. Apply these in FTE
handler:

```python
# In FTE _handler_asset_loader_sites.py, add to ENCLOSING_FN_CATEGORY_OVERRIDES:
(re.compile(r"^Con_DrawConsoleLines$"), "fte:asset_category:inline_chat_url"),
(re.compile(r"^Con_DrawConsole$"),      "fte:asset_category:console_window_ui"),
```

Note: Con_DrawConsoleLines has 2 R_RegisterPic sites currently
hud_overlay AND 2 R_RegisterShader sites currently `shader`. ALL 4
should route to `inline_chat_url` via the enclosing-fn override
(check that the override tier fires before the function-tier shader
mapping). Con_DrawConsole has 2 sites currently hud_overlay.

---

EXECUTION SEQUENCE:

1. Pre-flight: take a baseline snapshot of L1 site counts per
   asset_category for both engines:
   ```bash
   jq '[.loader_sites[] | .reads_category_id] | group_by(.) | map({cat: .[0], count: length}) | sort_by(-.count)' \
     apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-asset-loader-sites-ast.json > /tmp/baseline-ezquake.json
   jq '[.loader_sites[] | .reads_category_id] | group_by(.) | map({cat: .[0], count: length}) | sort_by(-.count)' \
     apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json > /tmp/baseline-fte.json
   ```

2. Apply Category 1 overrides to ezQuake handler (4 entries).
3. Apply Category 1 FTE handler edits (5 hud_overlay reroutes via
   per-site overrides OR a tier fix per your investigation).
4. Apply Category 1 map entry (FTE Mod_LoadBrushModel).
5. Apply Category 2 FTE handler edits (2 enclosing-fn overrides with
   new asset_category labels).
6. Re-run both extractors:
   ```bash
   python3 apps/qw-oracle/scripts/extractors/ezquake/extract.py
   python3 apps/qw-oracle/scripts/extractors/fte/extract.py
   ```
   (Use whatever command the project canonical entry-point is; if
   different, follow the project's convention.)

7. Take a post-fix snapshot:
   ```bash
   jq '[.loader_sites[] | .reads_category_id] | group_by(.) | map({cat: .[0], count: length}) | sort_by(-.count)' \
     apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-asset-loader-sites-ast.json > /tmp/postfix-ezquake.json
   diff /tmp/baseline-ezquake.json /tmp/postfix-ezquake.json
   # Same for FTE.
   ```

8. Verify the diff is clean: only the targeted sites moved
   categories; nothing else shifted. Per the arc's success criteria
   for Category 1:
   - hud_element L1 `hud_overlay` site count drops by ~5 ezQuake + 5
     FTE = 10 (those sites move to correct categories).
   - map L1 gains ~5-10 FTE `map` sites.
   - `quakec_progs` loses 1 ezQuake site to `config`.

   Category 2: 4 sites move out of `hud_overlay` (2 from
   Con_DrawConsoleLines + 2 from Con_DrawConsole) plus 2 move out
   of `shader` (Con_DrawConsoleLines shader sites) to the 2 new
   asset_category labels.

9. Spot-check affected slugs by re-running `derive_asset_types.py`
   and reading the relevant `qw-asset-types.json` entries:
   ```bash
   python3 apps/qw-oracle/scripts/extractors/qw/derive_asset_types.py
   ```
   Slugs to spot-check: skybox, charset, hud_element, map, config.

---

CRITICAL RULES:

1. Do NOT commit. Do NOT push. Do NOT git add. The oversight session
   reviews your diff + extractor output, may revise, and handles
   commits.

2. Do NOT execute Category 3 (write-path leakage) or Category 4
   (FTE charset watchlist gap). Those are separate worker dispatches.
   If you find yourself reading the write-path entries or
   gl_font.c, you have drifted scope -- stop and halt.

3. Do NOT dispatch other terminals or invoke skills that fan out.

4. Surface NEW findings if you hit any. Examples: a misroute I
   missed; an override that produces unexpected diff (sites moving
   that shouldn't); a tier rule that suggests a different fix shape;
   anything that smells off. Add a "## New findings" section at the
   bottom of your halt summary.

5. The FTE 5-case hud_overlay decision is YOURS to make. Either
   tier-fix or 5 per-site overrides -- decide based on source
   reading, justify in halt summary. If you go tier-fix, verify it
   doesn't accidentally re-route OTHER FTE hud_overlay sites that
   are correctly tagged.

6. Trust source over the arc punch list. Every override entry must
   be source-grounded. If you read the source and find the arc's
   claim wrong, surface it -- do NOT silently apply the override
   and move on.

7. ASCII only. Plain English. Decisive language.

8. Operator preference: THOROUGH, NOT RUSHED. Do not skip the
   verification snapshot diffs. They are the load-bearing check
   that the fixes did what they should and nothing else.

---

HALT-AND-REPORT shape:

When you finish (or hit a blocker), produce a halt summary in your
terminal:

  STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED

  Diff against baseline (per engine):
    ezQuake: <category: count change list -- e.g.,
             "hud_overlay: -5; charset: +1; config: +1; skybox: +1; ...">
    FTE:    <same shape>

  Per-entry status (14 total: 10 Cat 1 + 4 Cat 2):
    1. skybox/Mod_LoadExternalSkyTexture: <kept-at-skybox | rerouted-to-map_texture>
    2. skybox/Skywind_Load_f: <DONE | SKIPPED + reason>
    [...]
    14. Con_DrawConsole reroute: <DONE | SKIPPED + reason>

  FTE 5-case hud_overlay decision: <tier-fix | per-site overrides>
  Reason: <one-line justification>

  Files modified:
    apps/qw-oracle/scripts/extractors/ezquake/_handler_asset_loader_sites.py
    apps/qw-oracle/scripts/extractors/fte/_handler_asset_loader_sites.py

  New asset_category labels registered in FTE handler:
    fte:asset_category:inline_chat_url
    fte:asset_category:console_window_ui

  Spot-check on derived asset-types (post derive_asset_types.py):
    skybox: <site counts before -> after>
    charset: <same>
    hud_element: <same>
    map: <same>
    config: <same>

  New findings (if any): <one line each>
  Open questions for oversight: <list, or "none">

  Time spent: ~<minutes>

Then halt. Operator + oversight review and decide whether to dispatch
Phase B + C immediately, or take a pause.
```

---

## Why fresh terminal

Phase A is mechanical work but with one judgment call (FTE 5-case tier-fix vs per-site). Oversight has a heavy context already (vocab audit closure + arc reorg). A fresh worker reads the punch list cold and applies the changes without unconscious priors about which override style is "right." If the worker's tier-fix decision disagrees with oversight's intuition, that's signal.

## What oversight will check on return

- Baseline + post-fix snapshots match expected category-count deltas.
- Handler files modified contain ONLY the expected new entries (no scope creep).
- 5-case FTE decision is justified.
- New `inline_chat_url` and `console_window_ui` asset_category labels are properly registered.
- Spot-check on derive_asset_types.py output shows expected slug-level shifts.
- "New findings" section: empty is fine; non-empty informs Phase B+C scope.
- No commits made.

## After this returns

Oversight reviews diff + extractor output. If clean, commits as a single Phase A commit. Then drafts Phase B handoff (write-path leakage architecture decision -- regex narrow vs branch drop) for next worker dispatch.

If unclean (unexpected diffs, surprises), oversight either revises with the worker still loaded or sends them back for fixes.
