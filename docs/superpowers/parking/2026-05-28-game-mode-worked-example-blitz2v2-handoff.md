# Handoff: KTX game-mode concept-note worked example -- blitz2v2 (variant kind)

**Date:** 2026-05-28
**Owner:** fresh terminal (single-session execution; output is 1 concept note)
**Estimated effort:** 30-60 minutes (variant notes are the smallest of the three kinds)

## Why this exists

The killquad + wipeout worked-example pair (committed earlier today: `b23b872f` + `9eb1c9b2`) validated and sharpened the methodology for `kind: mutation` and `kind: standalone`. The third kind (`kind: variant`) is structurally simpler -- mostly delta-style content -- but its frontmatter shape + section pattern haven't been stress-tested yet.

blitz2v2 is the cheapest variant to validate:
- `kind: variant`, family head = hoonymode (UM_1ON1HM)
- Triage: `l3-upstream` (no wiki page; the blitz family has only `Blitz.json` which is the umbrella page, not per-variant)
- Smallest section set: 4 sections (Lead / Family delta / Configuration / See also)
- Family head's concept note does NOT yet exist (hoonymode.md not drafted) -- this is the first test of the "family_slug points at not-yet-drafted family head" case. Per the schema doc, the slug ref is allowed; the loader resolves it once hoonymode is drafted.

Output: one concept-note .md file written to `apps/qw-oracle/curated/concept-notes/blitz2v2.md` (flat layout per the loader-recursion finding in the schema doc's open questions). Plus a structured report back to the orchestrator capturing what the variant authoring surfaced about the methodology.

This phase does NOT:
- Draft hoonymode (the family head) -- variant ships pointing at a pending family-head slug; hoonymode draft comes later
- Draft blitz4v4 or any other variants
- Build the `game-mode-curate` skill itself
- Modify the methodology docs (surface findings instead; orchestrator backports)

## Reads required (cold)

Read in this order before drafting. The methodology docs were updated today after killquad + wipeout; do NOT read from cached memory of an earlier version.

1. **`apps/qw-oracle/curated/concept-notes/_methodology/game-modes/mode-vs-mutation-classification.md`** -- confirms blitz2v2 is variant, family head hoonymode, UM_1ON1HM shared with blitz4v4. Mutation interlocks subsection irrelevant here (blitz2v2 is variant, not mutation).
2. **`apps/qw-oracle/curated/concept-notes/_methodology/game-modes/concept-note-frontmatter-schema.md`** -- has the worked variant frontmatter for blitz2v2 already (under "Variant: blitz2v2"). USE THAT AS YOUR TEMPLATE; the recent backport corrected the related_entities/related_modes namespace split for it.
3. **`apps/qw-oracle/curated/concept-notes/_methodology/game-modes/concept-note-section-structure.md`** -- variant section set is 4 sections (Lead / Family delta / Configuration / See also). Variant Lead is 1 paragraph; Family delta is the SUBSTANCE; Configuration is the auto-projection placeholder; See also lists family head + sibling variants.
4. **`apps/qw-oracle/curated/concept-notes/_methodology/game-modes/triage-rules.md`** -- blitz2v2 is `l3-upstream` (no wiki page for the variant; `Blitz.json` is umbrella).
5. **Worked examples for cross-reference**:
   - `apps/qw-oracle/curated/concept-notes/wipeout.md` -- shows standalone Configuration HTML-comment placeholder convention
   - `apps/qw-oracle/curated/concept-notes/killquad.md` -- shows mutation Configuration small-table convention
   - (No variant exemplar yet -- you are writing it)

## Pre-flight queries (run before drafting)

Run against the local dev Postgres (`docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`):

```sql
-- 1. The mode entity
SELECT name, source_ref, props_json FROM gameplay_mechanics
WHERE kind='game_mode' AND name='blitz2v2';

-- 2. The _2on2hm_um_init mode_default rows (variant's Configuration data)
SELECT name, value_text, source_ref, notes FROM gameplay_mechanics
WHERE kind='mode_default'
  AND props_json->>'initstring_array' = '_2on2hm_um_init'
ORDER BY name;

-- 3. The hoonymode family head's _1on1hm_um_init for delta comparison
SELECT name, value_text, source_ref FROM gameplay_mechanics
WHERE kind='mode_default'
  AND props_json->>'initstring_array' = '_1on1hm_um_init'
ORDER BY name;

-- 4. The activation command L1 entity
SELECT name, description, source_ref FROM entities
WHERE project='ktx' AND name_fold='blitz2v2';
```

Shell:

```bash
# Source context for the mode_cmd[] entry (line 4545 per the methodology doc)
sed -n '4530,4560p' /home/paradoks/projects/quakeworld/research/repos/ktx/src/commands.c

# UM bit definitions (load-bearing for the activation prose)
sed -n '685,720p' /home/paradoks/projects/quakeworld/research/repos/ktx/include/g_local.h

# Hoonymode + blitz2v2 + blitz4v4 share UM_1ON1HM -- verify by grep
grep -n "UM_1ON1HM\|_2on2hm_um_init\|_4on4hm_um_init\|_1on1hm_um_init" /home/paradoks/projects/quakeworld/research/repos/ktx/src/commands.c | head -10
```

## Drafting workflow

1. **Pre-flight** -- run the queries above. Note especially the delta between `_2on2hm_um_init` and `_1on1hm_um_init` (which cvars differ between the 2v2 variant and the duel-format head). That delta IS the substance of the Family delta section.
2. **No wiki harvest** -- blitz2v2 is `l3-upstream`; skip to source-truth.
3. **Triage record**: `wiki_status: l3-upstream`. No `wiki_page_slug` field.
4. **Frontmatter** -- copy the worked variant example from the schema doc verbatim; verify each value against your pre-flight queries. Particularly:
   - `mode_default_init_array: _2on2hm_um_init`
   - `um_internal_id: UM_1ON1HM`
   - `family_slug: hoonymode` (pending; hoonymode.md doesn't yet exist)
   - `family_head_canonical_id: ktx:game_mode:hoonymode` (resolves in L1 even though concept-note doesn't exist yet)
   - `related_entities: [ktx:command:blitz2v2]` -- NO game_mode IDs; NO self-ref
   - `related_modes: [{slug: hoonymode, relation: family-head}, {slug: blitz4v4, relation: family-cousin}]`
5. **Lead** (~50-100 words) -- One paragraph: "Blitz 2v2 is the 2v2 roster variant of Hoonymode..." Frame the variant relationship explicitly.
6. **Family delta** (~100-200 words; this is the substance) -- Bullets or short paragraphs listing:
   - Roster size (2v2 vs hoonymode's 1v1)
   - Specific cvars that differ between _2on2hm_um_init and _1on1hm_um_init (from your pre-flight diff)
   - Win condition tweaks if any
   - Spawn-rotation behavior changes (often "same as hoonymode, just over 2 players per team")
7. **Configuration** -- HTML-comment placeholder per the standalone/variant convention:
   ```
   ## Configuration
   <!-- configuration table auto-projected from gameplay_mechanics WHERE props_json->>'initstring_array' = '_2on2hm_um_init'. Variant of _1on1hm_um_init; see hoonymode for shared baseline. Key delta cvars: [list 2-4 from your pre-flight diff]. -->
   ```
8. **See also** -- `[[hoonymode]]` (family head), `[[blitz4v4]]` (sibling variant), plus any related_entities cross-refs that warrant prose mention.
9. **Self-review** -- this is a short note. Read top-to-bottom; if it's under 400 words total body, that's correct -- variants are stubs by design.
10. **Write to disk** at `apps/qw-oracle/curated/concept-notes/blitz2v2.md`.

## Discipline anchors

- **Source-truth before synthesis** -- verify the `_2on2hm_um_init` array exists and the cvars it sets are real before claiming them in prose. The delta vs `_1on1hm_um_init` should be source-derivable, not narrative-derived.
- **Embrace short** -- a variant page is supposed to be small. If your Lead is 50 words and your Family delta is 120 words, you are at the right size for the smallest variants. Do not pad.
- **Pending family-head slug is OK** -- the schema explicitly allows it. Do not refuse to draft because hoonymode.md doesn't exist; ship with the pending ref.
- **Don't invent a family-page** -- the schema defers family-aggregator pages to v2. Do NOT draft "XonX family" or "Hoonymode family" pages.

## Halt-and-report rules

- **Classification mismatch** -- blitz2v2 shows source signals that contradict its variant classification (e.g., turns out to have its own UM bit not shared with UM_1ON1HM). Surface the signals; do not silently re-classify.
- **Delta doesn't compute** -- if the _2on2hm_um_init rows are empty in the DB (Layer 1 extractor gap), that breaks the Family delta section. Halt and report.
- **Frontmatter field genuinely missing from schema** -- if you find a real variant-specific field that's needed and not in the schema, surface as a methodology-doc gap.
- **Section structure feels wrong** -- if 4 sections is genuinely insufficient for blitz2v2 (or if any of the 4 is impossible to populate meaningfully), surface as a methodology question.

## Out of scope

- Drafting hoonymode (the family head)
- Drafting blitz4v4 or any other XonX family variant
- Drafting an XonX or Hoonymode family-aggregator page
- Modifying the methodology docs
- Building the `game-mode-curate` skill

## Return-to-orchestrator report shape

```
Worked example -- status: <COMPLETE | HALTED | PARTIAL>

blitz2v2:
  Triage decision:    l3-upstream -- <1-sentence reasoning>
  Frontmatter:        <fully populated | partial -- list missing fields>
  Family delta -- delta cvars surfaced from _2on2hm_um_init vs _1on1hm_um_init: <list, with values>
  Sections drafted:   Lead Nw | Family delta Nw | Configuration (placeholder) | See also Nw
  Total body words:   <number>
  L1 anchors:         <count of related_entities | count verified vs L1>
  Pending refs:       <family_slug + related_modes slugs that don't resolve yet -- hoonymode at minimum>
  Open items:         <list>
  File at:            apps/qw-oracle/curated/concept-notes/blitz2v2.md

Cross-cutting methodology feedback:
  Gaps in concept-note-frontmatter-schema.md:  <list -- particularly anything variant-specific>
  Gaps in concept-note-section-structure.md:   <list -- particularly variant section pattern>
  Other docs:                                   <list>
  (Nothing missing = note that explicitly)

Time spent: <minutes>
```

## When in doubt

- **Section length unclear**: embrace short; variants are stubs by design
- **Family-head reference unresolved**: ship the slug ref anyway; it's by-design pending
- **Configuration placeholder content**: copy the wipeout.md convention; substitute init array names
- **Variant-vs-roster ambiguity**: blitz2v2 is variant per the classification doc; do not override
