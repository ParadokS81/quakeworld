# Side-quest: L1 vocabulary alignment audit (seed vs extractor category names)

**Type:** small audit (1 session, ~1-2 hours)
**Surfaced:** 2026-05-14, during asset-type-curate Round 3 calibration
**Pressure:** MEDIUM-HIGH. Should land before Phase 3 fan-out (16 remaining slugs) to avoid every runner re-discovering the same mismatch.
**Predecessor:** Round 3 calibration commit 03449c65; skill rubric patch 45617006

---

## Why this arc exists

The asset-type-curate skill's seed YAML and the L1 extractors use slightly divergent vocabularies for some categories. The hud_element calibration discovered this cold: seed slug `hud_element` but L1 category `hud_overlay`. The skill now patches around it (Step 1 fallback via `l1_hint_bare_categories`), but the underlying mismatch should be audited and either reconciled or formally documented as intentional.

Additionally, the L1 extractors emit categories that have NO corresponding seed slug. Slipgate-app and downstream consumers will need to know whether these L1-only categories are:
(a) Missing seed entries that should be added
(b) Intentional internal categorizations that don't map to a user-facing asset_type
(c) Bugs in the extractor's category vocabulary

---

## Concrete inputs

### Known seed-vs-L1 name mismatches

| Seed slug | L1 category name | Engine |
|---|---|---|
| `hud_element` | `hud_overlay` | ezquake + fte |
| `player_skin` | `skin` | ezquake + fte |
| `wad_file` | `wad` | ezquake + fte |
| `model_q1` | `model` | ezquake + fte |

### L1 categories with no seed slug

From the post-audit L1 distribution (2026-05-14 measurement):

| L1 category | Sites (ezquake / fte) | Question |
|---|---|---|
| `shader` | 0 / 133 | FTE-only. Should `shader` be its own seed slug? Or is this an FTE-internal categorization unsuited for user-facing asset_type? |
| `screenshot` | 8 / 3 | Reads vs writes -- is the L1 category "screenshot" for image loading (read) or image writing (write)? Cross-reference `reference_screenshot_regex_pattern_bug`. |
| `quakec_progs` | 11 / 2 | progs.dat / QC bytecode loading. Should this be a seed slug? Currently L1-only. |
| `sprite` | 2 / 0 | ezQuake sprite loader. Should be a seed slug? Or covered by `model_q1`? |
| `log` | 0 / 4 | FTE log file writing. Probably writes not reads -- screenshot-regex pattern bug? |
| `other` | 3 / 31 | Catch-all bucket. Should be empty if categorization is clean -- the 34 sites here are a smell. |

---

## Approach

### Phase 1: Confirm name mismatches (15 min)

Read the seed YAML; grep the extractor handler files for the category names that emerge from L1. Confirm each mismatch is real (not a typo somewhere).

Decision per mismatch:
- **Option A:** Rename seed slug to match L1 (`hud_element` -> `hud_overlay`, etc.). Breaking change for any consumer that referenced the seed slug name; trivial for ours since we just shipped.
- **Option B:** Rename L1 category to match seed (`hud_overlay` -> `hud_element`, etc.). Touches the extractor handlers; potentially many sites need re-categorization.
- **Option C:** Keep both vocabularies; document the bridge via `l1_hint_bare_categories` (current state). Long-term carrying cost in skill text.

**Recommendation:** Option A (rename seed slugs to match L1). The L1 category names came from the L1 vocabulary the extractor was designed against; renaming the seed is cheaper than renaming the extractor. Downstream consumers (slipgate-app etc.) haven't shipped against the seed yet, so a rename now is free.

### Phase 2: Audit L1-only categories (45 min)

For each L1-only category (`shader`, `screenshot`, `quakec_progs`, `sprite`, `log`, `other`):

1. Inspect 3-5 sample sites: which loader function, which enclosing function, what's loaded.
2. Decide:
   - **New seed slug warranted** (e.g., `shader` should probably be a slug -- 133 FTE sites is real territory).
   - **Already covered by existing slug** (e.g., `sprite` might fold into `model_q1`).
   - **Extractor bug / intentional miscategorization** (e.g., `log` writes are probably the screenshot-regex pattern bug -- writes routed to a reads vocabulary).
3. For warranted new slugs, draft minimal seed entries (description + l1_hint_function_names + corpus_categories TBD).
4. For bugs, route to the L1 extractor refinement arc (sibling parking doc).

### Phase 3: Decision document (15 min)

Write a short decision record:
- Naming decision per mismatch (seed-rename vs L1-rename vs document-bridge)
- New seed slugs added (if any) with rationale
- Extractor-side bugs routed to extractor refinement arc
- Phase 3 fan-out unblocked

---

## Success criteria

- All 4 seed-vs-L1 name mismatches resolved (renamed or documented).
- L1-only categories triaged (new slug / existing slug / extractor bug).
- Decision record landed at `docs/superpowers/specs/2026-05-14-l1-vocabulary-alignment-decisions.md`.
- Phase 3 fan-out can proceed without runners hitting the mismatch cold.

---

## Pointers

- Seed: `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml`
- L1 extractor handlers: `apps/qw-oracle/scripts/extractors/{ezquake,fte}/_handler_asset_loader_sites.py`
- L1 output (for site counts): `apps/qw-oracle/scripts/extractors/{ezquake,fte}/output/{engine}-asset-loader-sites-ast.json`
- Quick site-count command:
  ```bash
  jq '[.loader_sites[] | .reads_category_id] | group_by(.) | map({cat: .[0], count: length}) | sort_by(-.count)' \
    apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-asset-loader-sites-ast.json
  ```
- Round 3 calibration commits: 3d2a1867, 03449c65, 45617006
- Sibling arc: `2026-05-14-l1-extractor-refinement-arc.md`
- Memory anchors: `reference_role_override_tier_design`, `reference_screenshot_regex_pattern_bug`
