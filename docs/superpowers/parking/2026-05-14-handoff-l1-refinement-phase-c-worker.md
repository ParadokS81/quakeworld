# Handoff: L1 extractor refinement Phase C worker (fresh terminal)

**Type:** worker-terminal handoff (returns updated FTE handler + extractor re-run output for oversight approval)
**Dispatched:** ready for dispatch by fresh oversight terminal
**Predecessor:** commit `d4c6f1ba` (Phase B: Cat 3 write-path leakage + NF1/NF3 inline adds; note: commit subject mis-titled as qwiki-v1-beta orchestrator work due to a parallel-session staging collision -- the Phase B file list is in the commit body).
**Parking doc to fulfill:** `docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md` Category 4 (FTE charset watchlist gap)

This terminal is a **worker**, not an orchestrator. The oversight session (separate terminal) reviews your diff + extractor output and handles commits. You execute the Phase C fix, re-run the FTE extractor, verify the diff, and halt for review. Do not commit, do not push.

**This is the smallest phase of the refinement arc (~30-60 min).** Once it ships, the arc closes.

---

## Prompt to paste

```
You are picking up Phase C of the L1 extractor refinement arc as a
worker session. The oversight session has dispatched you; it expects
an updated FTE handler + extractor re-run verification when you halt.

Working dir: /home/paradoks/projects/quakeworld

Read first (in priority order):

1. docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md
   -- the arc punch list. Phase A + Phase B status headers at the top
   summarize what already shipped. YOUR SCOPE is Category 4 only
   (1 entry: FTE charset watchlist gap). Categories 1, 2, 3 are
   closed; do NOT touch them.

2. apps/qw-oracle/scripts/extractors/fte/_handler_asset_loader_sites.py
   -- the only handler you are editing. Read the current
   LOADER_FUNCTIONS set + FUNCTION_TO_CATEGORY map + EXT_TO_CATEGORY
   (line 96 area, post-Phase B) before editing.

3. apps/qw-oracle/curated/asset-notes/charset-investigation.md
   -- the asset-type-curate investigation report. The "## Extractor
   gap -- FTE" section describes the gap in detail and names the
   three target functions.

4. Source-of-truth reads (verify each function against live source
   before adding it to the watchlist):
   - research/repos/fteqw/engine/gl/gl_font.c
     - R_LoadHiResTexture call at line 2629 with "fonts:charsets"
       (image-based charsets via gfx/charsets/ + textures/charsets/)
     - Font_LoadFontLump (WAD-style charset lump loading)
     - Font_LoadDefaultConchars at lines 2043 + 2048 reading
       `gfx/conchars.lmp` and `pics/conchars.pcx`

---

YOUR SCOPE: Category 4 from the arc (1 entry, FTE charset watchlist gap)

FTE currently has 1 charset L1 site (post-Phase A: Font_LoadHexen2Conchars
override). The expected count is ~5-10 sites covering FTE's font system
loading paths. Three functions are missing from the FTE watchlist:

1. R_LoadHiResTexture (called with "fonts:charsets" prefix at gl_font.c:2629)
2. Font_LoadFontLump (WAD-style charset lump loader)
3. Font_LoadDefaultConchars (reads gfx/conchars.lmp + pics/conchars.pcx at
   gl_font.c:2043,2048)

Add these to FTE LOADER_FUNCTIONS + FUNCTION_TO_CATEGORY (routing each to
`fte:asset_category:charset`).

If FUNCTION_TO_CATEGORY routing alone catches all relevant sites,
ENCLOSING_FN_CATEGORY_OVERRIDES is unnecessary. If some calls happen via
indirection (e.g., R_LoadHiResTexture is a generic loader called from
multiple categories), use an enclosing-fn override gated on the calling
context. Source reading decides which.

NOTE on R_LoadHiResTexture: this is a generic FTE image loader called
by many subsystems (not just charsets). Be careful -- adding it
unconditionally to FUNCTION_TO_CATEGORY as "charset" would mistag
texture-loading sites. Likely shape: add R_LoadHiResTexture to
LOADER_FUNCTIONS so it's watched, but route via an
ENCLOSING_FN_CATEGORY_OVERRIDES entry on the calling charset-loading
function (whichever function calls R_LoadHiResTexture with "fonts:charsets"
prefix). Read the source to find the calling chain.

Font_LoadFontLump and Font_LoadDefaultConchars are charset-specific
and can route via FUNCTION_TO_CATEGORY directly.

---

EXECUTION SEQUENCE:

1. Pre-flight: baseline FTE site count + charset count:
   ```bash
   jq '.loader_sites | length' \
     apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json
   jq '[.loader_sites[] | .reads_category_id] | group_by(.) | map({cat: .[0], count: length}) | sort_by(-.count)' \
     apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json > /tmp/baseline-c-fte.json
   grep -E "charset|Font" /tmp/baseline-c-fte.json
   ```

2. Source-verify each target function:
   - Open research/repos/fteqw/engine/gl/gl_font.c.
   - For each function (R_LoadHiResTexture call at 2629,
     Font_LoadFontLump definition, Font_LoadDefaultConchars at
     2043,2048): confirm it loads charset content and identify
     its caller context.
   - For R_LoadHiResTexture specifically: identify the enclosing
     function that calls it with "fonts:charsets" prefix. That's
     the right level for an enclosing-fn override.

3. Apply the FTE handler edits:
   - Add Font_LoadFontLump and Font_LoadDefaultConchars to
     LOADER_FUNCTIONS (with a comment marking them as Phase C
     charset additions).
   - Add the same two to FUNCTION_TO_CATEGORY routing to
     `fte:asset_category:charset`.
   - Add R_LoadHiResTexture to LOADER_FUNCTIONS (so the extractor
     watches it).
   - Add an ENCLOSING_FN_CATEGORY_OVERRIDES entry for the charset-
     loading caller of R_LoadHiResTexture, routing to charset.

4. Re-run the FTE extractor:
   ```bash
   python3 apps/qw-oracle/scripts/extractors/fte/extract.py
   ```

5. Re-run derive:
   ```bash
   python3 apps/qw-oracle/scripts/extractors/qw/derive_asset_types.py
   ```

6. Post-fix snapshot and verify:
   ```bash
   jq '[.loader_sites[] | .reads_category_id] | group_by(.) | map({cat: .[0], count: length}) | sort_by(-.count)' \
     apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json > /tmp/postfix-c-fte.json
   diff /tmp/baseline-c-fte.json /tmp/postfix-c-fte.json
   ```

   Expected:
   - FTE charset count: 1 -> ~5-10 (the new watchlist sites land here)
   - FTE total site count: increases by the number of new sites
   - Other categories: should be unchanged (the watchlist additions
     are additive, not reroutes). Especially: no texture / hud_overlay /
     skin sites should disappear -- the new entries are NEW emissions,
     not reclassifications.

7. Spot-check on derived asset-types:
   ```bash
   jq -r '.asset_types[] | select(.asset_type == "charset") | "charset: ez=\(.l1_evidence.ezquake | length) fte=\(.l1_evidence.fte | length)"' \
     apps/qw-oracle/scripts/extractors/qw/output/qw-asset-types.json
   ```
   Expected: charset FTE jumps from 1 to whatever the new total is.
   ezQuake charset should be unchanged from Phase B baseline (12).

---

CRITICAL RULES:

1. Do NOT commit. Do NOT push. Do NOT git add. Oversight reviews
   your diff + extractor output and handles commits.

2. Do NOT touch ezQuake handler. Do NOT touch FTE
   ENCLOSING_FN_CATEGORY_OVERRIDES entries from Phase A unless
   the R_LoadHiResTexture caller-context fix REQUIRES a new
   entry (which is in-scope) -- never modify existing entries.

3. Do NOT execute work outside Cat 4. If you find yourself reading
   write-path code or non-charset functions, you have drifted scope --
   stop and halt.

4. Trust source over the arc punch list. Verify each function claim
   against the actual source. If a function doesn't exist where the
   arc/investigation report says it does, surface it -- do NOT guess
   line numbers or invent signatures.

5. Surface new findings if you hit any. Examples: an unexpected
   indirection (a function loads charset via a v-table or callback);
   a charset path the gap report missed; the FTE map watchlist gap
   the Phase A halt summary flagged at gl_model.c:2274-2330 (this
   is OUT of Phase C scope -- it's post-refinement -- but if you
   notice anything else odd in gl_font.c, surface it).

6. ASCII only. Plain English. Decisive language.

7. THOROUGH, NOT RUSHED. Phase C is small, but the load-bearing
   verification is "nothing else shifted." Do not skip the
   snapshot diff.

---

HALT-AND-REPORT shape:

When you finish (or hit a blocker), produce a halt summary:

  STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED

  Functions added to LOADER_FUNCTIONS:
    - R_LoadHiResTexture
    - Font_LoadFontLump
    - Font_LoadDefaultConchars

  Routing strategy:
    - FUNCTION_TO_CATEGORY: <list>
    - ENCLOSING_FN_CATEGORY_OVERRIDES: <list, with caller-context>

  Source verification:
    R_LoadHiResTexture call at gl_font.c:2629: <"fonts:charsets" prefix confirmed | actual prefix: ...>
    Font_LoadFontLump definition: <gl_font.c:NNNN confirmed | actual location: ...>
    Font_LoadDefaultConchars at gl_font.c:2043,2048: <gfx/conchars.lmp + pics/conchars.pcx confirmed | actual: ...>
    Calling chain for R_LoadHiResTexture (fonts:charsets): <enclosing-fn name + line>

  Diff against baseline:
    FTE charset: 1 -> N (+M)
    FTE total sites: <baseline> -> <postfix> (+M)
    Other categories: <unchanged | list deltas>

  Spot-check on derived asset-types:
    charset: ez=<count> fte=<count> (was ez=12 fte=1 at Phase B baseline)

  Files modified:
    apps/qw-oracle/scripts/extractors/fte/_handler_asset_loader_sites.py

  New findings (if any): <one line each>
  Open questions for oversight: <list, or "none">

  Time spent: ~<minutes>

Then halt.
```

---

## Why fresh terminal

Phase C is mechanical (watchlist additions) but the R_LoadHiResTexture caller-context decision needs careful source reading. Oversight has Phase A + Phase B context already loaded; a fresh worker reads gl_font.c cold and decides the routing shape without unconscious priors. If the worker's routing choice surprises oversight, that's signal worth examining.

## What oversight will check on return

- FTE charset count jumped from 1 to a defensible number (~5-10).
- Other FTE category counts unchanged (no reclassification leakage).
- R_LoadHiResTexture is in LOADER_FUNCTIONS but does NOT route to charset universally -- the routing is gated on caller context.
- Source verification claims are concrete (line numbers cited, function names verified).
- ezQuake handler untouched.
- charset asset_type spot-check: ezQuake unchanged (12), FTE up to the new count.
- "New findings" section: empty is fine; non-empty surfaces post-refinement-arc candidates.
- No commits made.

## After this returns

Oversight reviews diff + extractor output. If clean, commits as a single Phase C commit. After Phase C commits:
- The **refinement arc closes** (all 4 categories shipped).
- Arc retrospective gets appended to `apps/qw-oracle/docs/arc-history.md`.
- HANDOVER.md entry for the refinement arc gets retired.
- Next up: Step 4 (skybox re-walk -- compare cold against shipped skybox.md to confirm patches changed behavior cleanly), then Step 5 (concept-note partners), then Step 6 (next small batch of Phase 3 fan-out).
