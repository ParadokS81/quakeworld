# Asset-note template reference

Skeleton + frontmatter schema + voice cues for drafting `asset-notes/<slug>.md`.
Load this file when authoring or reviewing any slug output.

---

## Scope discipline

An asset-note is **substrate for downstream LLM-composed wiki pages**, not a
standalone encyclopedia. The three-layer feeder model:

- **L1** -- canonical facts (cvars, commands, loader-site IDs, defaults).
- **L3 asset-note** (this layer) -- file classification + cross-engine install
  surface + cvar-behavior one-liners + mechanism headlines.
- **L3 concept-note** (sibling) -- cross-domain synthesis (gameplay context,
  recipes, ruleset gates) for asset_types that earn one.
- **Wiki page** (future downstream) -- LLM-composed from the three layers.

Downstream consumers each pull different depth:
- MCP retrieval is multi-hop: LLM matches the note via `search_concepts`,
  reads the body, then follows up to L1 via `lookup_entity` using
  cvar/command IDs from `related_entities`.
- Slipgate asset-detection logic needs file-classification only.
- Wiki-page generation needs substrate across all three feeders.
- Concept-note authoring uses asset-notes as feeders.

### What stays in the asset-note

- File paths per engine (`engine_canonical_paths`)
- Filename patterns (suffix conventions, separator variants)
- File extensions accepted
- Companion sub-files (e.g., `_wind.cfg` paired with skybox)
- Cross-engine install-path differences (affects WHAT files exist)
- L1 anchors (canonical_ids for retrieval)
- `related_entities` (cvar/command names)
- **Cvar/command BEHAVIOR summaries (one line each)** -- not deep prose
- Edge cases that affect detection or installation

### Compressed in the asset-note (one-sentence headlines)

- Mechanism step-by-step (don't enumerate every function call)
- Source-line citations to mechanism (keep 1-2 anchor cites; rest live in
  investigation report)
- Deprecation lineage (one sentence is enough)

### Moves out of the asset-note

- Competitive recipes ("competitive players set `r_fastsky 1`") -- concept-note
- Author personality / trivia -- investigation-only color
- Behavior of unrelated subsystems
- Multi-paragraph mode mechanics -- compress to one paragraph per engine

### Test for inclusion

When in doubt: **does this affect what files the user installs, where they go,
how a tool identifies them, OR does it answer "how does this cvar behave in
this asset's context" in one line?** If yes, in. If no, concept-note or
investigation-only.

### Length

Body length follows shape. Guidelines, not ceilings:

- **Simple** (single-engine single-mechanism, or with concept-note partner) -- ~40-70 body lines. Examples: conback, palette, player_skin.
- **Moderate** (multi-engine OR multi-mechanism) -- ~70-110 body lines. Examples: charset, levelshot.
- **Rich** (multi-engine AND multi-mechanism, AND/OR multi-file) -- ~100-160 body lines. Examples: skybox, map.

The LLM reads the whole note. Don't drop load-bearing content to hit a
number. Frontmatter is excluded -- it grows with the entity surface.

**Investigation report length: uncapped.**

---

## Frontmatter schema

Frontmatter is the join key to L1. The LLM follows up via `lookup_entity`
using cvar/command IDs from `related_entities`. Under-list and the LLM
cannot follow up.

Mirror seed stable fields; body carries unique prose the seed cannot represent
(qwiki D18).

```yaml
---
slug: <asset_type_slug>             # e.g. player_skin, skybox, charset
asset_type: <asset_type_canonical>  # matches slug; explicit for tooling clarity
engine_canonical_paths:             # mirrored from qw-asset-types.yaml
  ezquake: []                       # path templates, e.g. "skins/<name>.pcx"
  fte: []
  qwcl: []
  mvdsv: []
user_install_paths: []              # where users drop custom content; from seed
corpus_categories: []               # community-imposed tags from qw.nu/gfx
related_entities:                   # engine-prefixed canonical IDs
  - ezquake:cvar:<name>
  - ezquake:command:<name>
  - fte:cvar:<name>
  - ezquake:flag_bit:<name>         # for FPD bits or similar flag registers
companion_asset_types: []           # optional; cross-type pairs (e.g. charset -> config)
l1_canonical_ids:                   # extractor loader-site canonical IDs per engine
  ezquake: []                       # pull from ezquake-asset-loader-sites-ast.json
  fte: []                           # pull from fte-asset-loader-sites-ast.json
  qwcl: []
  mvdsv: []
status: <CONFIDENT|DOC-GAP|DIVERGENT|SPARSE>  # L1-GAP halts before draft
last_verified: <YYYY-MM-DD>         # date this note last re-walked source
authority_grounds: <engine_mechanics|community_consensus|operator_sme|hedged>
---
```

### Field notes

- **`engine_canonical_paths`** -- path templates with placeholders where the
  engine uses variable parts: `"textures/env/<name><face>.<ext>"`. Mirror from
  seed. **Seed-shape translation:** the seed YAML may carry
  `engine_canonical_paths` as a flat list (applies-to-all-engines) while the
  asset-note frontmatter always uses per-engine keys. When the seed has a
  flat list, populate the same list under each engine that loads the asset
  (verify by source-read); split per-engine when source verification surfaces
  engine-specific paths (e.g., ezQuake's `textures/<mapname>/...` paths from
  `Mod_LoadExternalSkyTexture` are ezQuake-only). Omit an engine key when
  that engine does not load this asset type (e.g., MVDSV is server-side and
  renders no client-side assets).

- **`related_entities`** -- **exhaustive list** of every cvar/command the
  engine recognizes for this asset_type. Engine-prefixed:
  `ezquake:cvar:r_skyname`, `ezquake:command:loadsky`. The LLM uses these
  to follow up to L1 via `lookup_entity` -- a missing entry means the LLM
  cannot find that cvar's default or help text from this note. Include
  companion-file commands (e.g. the full skywind* family for skybox, not
  just the primary load command). List once per engine.

  **Use the user-facing cvar/command name** (what the user types at the
  console), NOT the C source variable name. For FTE specifically, cvar
  declarations using macros like `CVARFC(name, default, ...)` or
  `CVARFD(name, default, flags, desc)` have the **first argument as the
  user-facing name** -- list that. Example: FTE source has
  `cvar_t r_skybox_orientation = CVARFD("r_glsl_skybox_orientation", ...)`
  -- the related_entities entry is `fte:cvar:r_glsl_skybox_orientation`,
  not `fte:cvar:r_skybox_orientation`. ezQuake-style declarations
  (`cvar_t r_skyname = {"r_skyname", "", ...}`) usually match the C var.

  **Verify each entry against source via grep before adding it.** Don't
  speculate that "engine X probably has cvar Y because engine Y does."
  Asymmetric cross-engine entity surfaces are common and OK (FTE has
  rotation cvars ezQuake doesn't; ezQuake has the `_wind.cfg` family FTE
  doesn't). Asset-notes are user-facing references; the file/cvar/command
  layer must match what users actually type.

  **Adjacency-cutoff rule.** "Exhaustive" applies to cvars/commands the
  engine recognizes for this asset, but the line between "for this asset"
  and "adjacent" can be fuzzy (`r_fastsky` gates the skybox display but
  isn't a skybox loader; `scr_coloredText` affects charset rendering but
  isn't a charset loader). Use this two-part test:

  - **In:** cvars/commands declared in the same source file as the
    asset's loader AND that affect how the asset behaves (load, render,
    gate, or display).
  - **Out:** cvars/commands that touch the same subsystem but live in a
    different source file and have no direct effect on this asset
    (`r_skycolor` is the fast-sky-mode flat color; it doesn't affect
    skybox loading or rendering -- exclude from skybox even though
    `r_fastsky` is included).
  - **Tiebreaker:** include if a user asking "why doesn't my <asset>
    show up?" would need this cvar to debug.

  **Procedural-family scope.** When the cvar family is engine-registered
  dynamically (e.g., `hud_<element>_<property>` per-element properties
  generated at registration time by `Hud_Register*` calls; per-track
  music cvars generated at song-load time), the family is not statically
  enumerable. List the **registration commands** and **system-level
  cvars** (e.g., `scr_newhud`, `hud_planmode`, `hud_editor`,
  `hud_recalculate`) but NOT the per-element dynamic properties. The
  registration surface is what a user types at the console; the
  per-element properties are the result of running it.

  See `player_skin.md` for canonical shape.

- **`companion_asset_types`** -- slugs only; `[]` when none. Use when the type
  pairs with a different-typed file the engine treats as a distinct loadable
  (charset + config loader; hud_element + HUD .cfg). See `OPERATIONS.md`
  Section 6 for cross-type vs within-type distinction.

- **`l1_canonical_ids`** -- pull from
  `apps/qw-oracle/scripts/extractors/<engine>/output/<engine>-asset-loader-sites-ast.json`.
  Include only correctly-categorized sites. When sites are mis-categorized
  (common on FTE side), note the gap in the body's "Cross-engine notes"
  section AND in the investigation's `## L1 extractor follow-up` section
  per the L1-CAT-AMBIGUOUS pattern (see `references/status-flag-rubric.md`).
  Empty list is valid; invented IDs are not.

  **Bulk-L1 selection rule.** When the slug's site count exceeds ~20
  (e.g., `hud_overlay` 129 in ezQuake), enumerating each site overwhelms
  the frontmatter and provides no incremental retrieval value. Apply the
  **one-per-distinct-enclosing-function** rule: select one representative
  canonical_id per distinct enclosing function that covers a unique
  loading mechanism, prioritized by load trigger (startup-init >
  on-demand subsystem-init > dynamic on-demand loaders). Cap at 8-12
  entries covering the full mechanistic surface; do not enumerate
  per-file granularity (e.g., 62 individual sbar lumps all loaded by
  `Sbar_Init` collapse to one `Sbar_Init` canonical_id). Document the
  selection in the investigation report's L1 evidence section so the
  curation is auditable.

- **`status`** -- from triage Step 5. L1-GAP never reaches draft; the four
  values here are CONFIDENT, DOC-GAP, DIVERGENT, SPARSE.

- **`authority_grounds`** -- `engine_mechanics` for source-verifiable behavior;
  `community_consensus` for corpus-supported convention; `operator_sme` for
  operator-validated practice; `hedged` for inferred claims. Use the lowest
  ground that applies to any opinionated claim in the body.

---

## Body section skeleton

### Required sections (every note)

```markdown
## Description

<2-4 sentences. What is this asset type and what role does it play?
Factual, present tense. No cvar names -- that belongs in "How it loads".>

## How it loads

<Engine mechanism. Cite source: file:function:line or file:line-range.
Name the cvar(s) or command(s) that trigger the load. For multi-mechanism
types (skybox: r_skyname + /loadsky + worldspawn.sky push), enumerate each.
5-15 lines typical; skybox-class types run longer. Hedge explicitly when a
mechanism cannot be source-verified.>

## Install layout

<Where users drop custom files. Imperative: "Drop the file at qw/skins/...".
Explain the path template from engine_canonical_paths. 3-8 lines.>

## Cross-engine differences

<Per-engine breakdown. Include this section whenever the engine surface is
asymmetric -- either engines diverge on mechanism / path / cvar surface,
OR one engine has the category and another simply doesn't (single-engine
asset, asymmetric L1 surface). Skip only when all engines load this
asset_type identically (rare). When divergent, lead with the dimension
(path, format, mechanism, fallback). 10-30 lines when divergent; one or
two lines per engine when one is absent (e.g., "FTE: routes charset
loading through gl_font.c font system; user-replaceable via con_textfont
and gl_font cvars" is a complete entry). When source is absent for an
engine (QWCL / MVDSV not yet fully extracted), say so rather than
inferring.>
```

### Optional sections -- multi-file asset types

Include when the type ships as multiple sub-files (skybox 6 faces, charset
variants, map + .lit + .ent).

```markdown
## Files involved

<Per-file listing: what each sub-file is, its path template, accepted
extensions. Skybox: _rt, _lf, _up, _dn, _ft, _bk + optional .shader.
List or table. 5-15 lines.>

## Companion files

<When companion_asset_types is non-empty: name the companion slug(s),
describe the pairing, explain where the companion installs. Cross-reference
the companion slug's own note for the reverse framing.>
```

### Optional sections -- rich evidence

Include when evidence justifies depth; omit when sparse.

```markdown
## Community conventions

<How the community packages this type. Draw from corpus mining (gfx sandbox
+ gfx_comment rows). Name install conventions (subfolder structure, naming
patterns). Cite corpus_categories from seed. 5-15 lines.>

## Edge cases

<Itemized, one paragraph max each. Candidates: fallback when file missing,
version-specific differences, server-side restrictions (FPD bits, serverinfo
keys), interactions with other asset types or cvars. 5-20 lines.>

## Doc-divergence notes

<Only when status is DIVERGENT. Name the divergence: what the doc says, what
source says, why source wins. Cite both locations (file:function:line). One
paragraph per divergence point.>

## Related

<Optional. Cross-pointers within the note that are NOT concept-note partners.
Use for: adjacent mechanisms in the same engine, sub-mechanisms documented
elsewhere, alias asset_types, related but distinct render paths. When a
concept-note partner exists, also link to it here. One line per item with
file:line or note-pointer. Not a "see also" dumping ground -- each entry
must earn its place by being load-bearing for understanding this note.>
```

---

## Length and voice cues

**Length.** See "Scope discipline" above for shape-based guidelines. Brief
is correct on simple slugs; depth on rich ones. Don't drop load-bearing
content to hit a line count.

**Chunk-first answer for notes over ~80 lines.** Retrieval is chunk-based
(per the concept-notes precedent in `API_CONTRACTS.md`). The first chunk
an LLM sees may be the only one it consumes for common queries. Structure
the first ~30 lines (Description + How it loads + Install layout) as a
complete "how does this work" answer.

**Voice -- LLM-feeder shape.**
- Present tense, plain English, active voice.
- Density over polish.
- Source citations inline at the sentence level: "Verified at
  `src/r_sky.c:342` (`R_LoadSkyTexturePixels`)."
- Recommendations ground the authority: "Community convention" or
  "source-verified: `src/...`".
- Narrative is welcome for motive or intent that structured data can't
  carry -- mode-priority reasoning, cross-engine philosophical contrast,
  deprecation lineage, version-evolution context.
- Some overlap with L1 is correct: one-line cvar behavior summaries in the
  body resolve common one-hop queries; exact defaults / source lines stay
  in L1 for two-hop queries.
- No em dashes. ASCII hyphens throughout.

---

## Representative voice excerpt

The following paragraph from `apps/qw-oracle/curated/asset-notes/player_skin.md`
is the canonical voice anchor for asset-notes. When drafting a note, read
this excerpt first to calibrate register, citation density, and the balance
between mechanism detail and plain-English framing.

---

> `r_dynamic <0|1|2>` controls dynamic lighting on world surfaces -- how
> muzzle flashes, rocket trails, explosions, and powerup auras paint colored
> light onto walls, floors, and ceilings. The three modes are computation-path
> choices:
>
> - `0` -- no dynamic lighting. Surfaces stay flat-lit regardless of nearby
>   effects. The model halo from `r_powerupglow` still draws, but you lose
>   the *room lights up red* effect that announces a quad carrier rounding
>   the corner.
> - `1` -- software (CPU-computed) lighting. The classic path. Works on every
>   renderer.
> - `2` -- hardware (GPU-computed) lighting via GLSL. Only valid when the
>   modern-OpenGL renderer is active. The OnChange handler at
>   `src/r_rmain.c:108` rejects this value with `"Hardware lighting not
>   supported when not using GLSL"` when the immediate-mode renderer is
>   loaded.
>
> Default depends on the renderer build: `"2"` on builds that include
> modern-OpenGL (`EZ_MULTIPLE_RENDERERS` or `RENDERER_OPTION_MODERN_OPENGL`);
> `"1"` on immediate-mode-only builds (`src/r_rmain.c:151-153`).

---

**Why this excerpt.** Plain-English framing first, mechanism second. Inline
source citation at the sentence level, not deferred. Concrete behavioral
consequence per mode, not just a label. Version-conditional behavior in prose.

---

## Pre-submit checklist

- [ ] All frontmatter fields present; engine_canonical_paths mirrors seed;
      l1_canonical_ids from extractor JSON (empty valid; invented not).
- [ ] related_entities engine-prefixed (`ezquake:cvar:r_skyname`), not bare.
      EXHAUSTIVE: every cvar/command the engine recognizes for this asset.
- [ ] Description: 2-4 sentences, no cvar names.
- [ ] How it loads: source-cited; every mechanism listed; hedged when uncertain.
- [ ] Install layout: path template explained in plain English.
- [ ] Cross-engine: present when engines differ; skipped or one-liner when not.
- [ ] Chunk-first answer: first ~30 lines self-contained (notes >80 lines).
- [ ] Status matches triage flag from Step 5; last_verified is today.
- [ ] authority_grounds reflects the body's lowest-ground claim.
- [ ] ASCII only; no em dashes, no emoji.
