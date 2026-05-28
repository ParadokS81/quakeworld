# Game-mode concept-note section structure

## Purpose

Defines the section skeleton for game-mode concept notes. The frontmatter (per [[concept-note-frontmatter-schema]]) carries structured factual data; the prose body carries narrative organized into a predictable set of sections. The LLM oracle retrieves prose by section key; the wiki page renders projected from the same sections.

Section sets vary by `kind` (per [[mode-vs-mutation-classification]]):

- **Standalone modes**: 5 mandatory + 4 optional sections, player-first ordering with admin block at end
- **Mutations**: smaller set; no Strategy / Maps; focused on activation + interaction effects
- **Variants**: short delta-style; most content inherited from the family head's standalone note

Family-aggregator pages (e.g., a unified "XonX family" overview) are deferred to v2 -- the per-variant pages cross-link laterally via `related_modes` for v1.

## Section design principles

Five principles shape every section:

1. **Player-first ordering.** Casual reader reads top-down; server admin uses the table of contents to jump to the admin block at the bottom. The most common reader is a player or curious onlooker -- they take precedence in page order. Wiki convention (Wikipedia, Arch wiki, ezquake.com/docs) is the same.

2. **Mandatory sections enforce a baseline.** Every mode of a given kind ships the same mandatory sections so cold readers know where to look. A stub can be 200 words across 5 sections; a full page can be 2000 across 9.

3. **Section size follows content, not template.** "Server setup" for hoonymode is one sentence; CTF's "Strategy" can be 1500 words. The template provides slots; slots fill with what's real. Don't pad; don't truncate.

4. **Optional sections appear only when warranted.** Don't emit empty headings. If a mode has no maps to recommend, no Maps section.

5. **Mechanical content takes precedence over decorative prose.** Configuration tables, source-anchored facts, and L1 entity references are the substance the LLM oracle leans on. Narrative wraps and contextualizes; it doesn't replace the mechanical anchor.

## Standalone modes -- 9 sections

Player-first ordering with admin block at the bottom. Mandatory unless marked optional.

### 1. Lead (mandatory)

One paragraph (~2-4 sentences) defining the mode and its central rule. Mirrors the `summary` frontmatter field at slightly more length. Establishes objective and the one most-distinctive mechanic.

Example (Wipeout):
> Wipeout is a round-based team mode in KTX where players spawn with a full weapon loadout and items are absent from the map. A round ends when all members of one team are eliminated; consecutive deaths increase a player's respawn time up to 30 seconds. Introduced by Dusty in KTX 1.41 as a QuakeWorld take on Diabotical's Wipeout mode.

### 2. How to play (mandatory)

Player-facing activation: how a player joins or starts the mode. The command, the version requirement when relevant, what happens on activation.

Example:
> Type `/wipeout` in the console on a KTX server (1.41 or later) where the admin has enabled the wipeout bit in `k_allowed_free_modes`. Players then ready up; the round begins when all players are ready.

### 3. Rules (mandatory)

Bullets or short paragraphs covering: spawns, loadout, items, respawn behavior, win conditions, round/time structure. The substantive mechanical core for the player.

This is the longest mandatory section for most standalone modes.

### Sub-systems (optional, between Rules and Strategy)

For standalones with substantive mechanical sub-systems that have their own cvars + commands + cultural anchor, author one top-level section PER sub-system, positioned between Rules and Strategy. Name each section after the sub-system (not generic "Sub-systems"). Keep each ~100-200 words.

This is NOT a free pass to fragment Rules. The threshold for promoting content to a sub-system section: the sub-system has its own dedicated cvar family (e.g., `k_ctf_hook*`, `k_ctf_rune*`), its own commands, its own player-facing mechanic that experienced players talk about as a distinct thing, AND the prose would be ~100+ words on that one sub-system if forced into Rules. If any of those is missing, the content goes in Rules instead.

Canonical exemplars (drafted 2026-05-28):

- **CTF** has two: "The grappling hook" (`k_ctf_hook` + 4 hook-style variants + `+hook`/`-hook` controls + Threewave-era cultural anchor) and "Runes" (4 named runes + `k_ctf_runes` toggle + tossrune/dropquad commands + balance impact).
- Future likely cases: **race** has the route-system story (route cvars, route_switch/show_route commands, per-map curated routes). Note: Sub-systems is a standalone-only convention; mutations expand their mechanics in the "What it does" section instead. LGC is a mutation (despite its weapon-mod depth) -- its weapon-mod story lives in the mutation section set, not in a Sub-systems section.

A standalone can have 0, 1, or 2+ sub-system sections. Most standalones (ffa, 1on1, 4on4) have none -- the Rules section carries the full mechanical picture without subdivision.

### 4. Strategy / tactics (optional)

Player-facing tactical advice. Curator-authored or community-imported. Skip for modes where strategy hasn't been documented or where the mode is too obscure to support real strategy notes (yawnmode, killquad).

### 5. Maps (optional)

Map list with applicability notes. Some modes are tightly map-coupled (race -- per-map routes; midair -- airborne-friendly arenas; wipeout -- compact maps for arena rounds). For modes that play on standard QW maps without preference, omit this section.

Convention from existing wiki pages (Wipeout): table with columns for each roster size showing map suitability.

### 6. History / origin (optional)

When the mode was introduced, who authored it, what game it was inspired by, what mod (KTPro / KTX / dusty-ktx) it originated in. Include only when there's a story to tell.

### 7. Server setup (mandatory)

Admin-facing prerequisites: KTX version, `k_allowed_free_modes` bit, hosting notes, master server registration. Often very short (1-2 sentences for hoonymode-style: "Add 128 to k_allowed_free_modes").

Self-contained; admins jump here from the TOC.

### 8. Configuration (mandatory)

The full enforced-settings table lives in L1 (`gameplay_mechanics` rows with `kind='mode_default'` and `props_json.initstring_array = <init array>`). The LLM oracle fetches it on demand via MCP L1 tools; concept-note prose does NOT duplicate the table.

**Authoring convention -- standalone / variant:** a single pointer-sentence orienting the reader to where the full settings live. The frontmatter `mode_default_init_array` is the load-bearing pointer; the Configuration section's body is a 1-2 sentence orientation, not a duplicated data table. Format:

```markdown
## Configuration

Mode-specific overrides live in `<init_array>` (N cvars on top of `common_um_init`'s 52-cvar baseline). The full enforced-settings table can be fetched from the `gameplay_mechanics` rows with `kind='mode_default'` and `props_json->>'initstring_array' = '<init_array>'`.
```

Example (wipeout):

> Mode-specific overrides live in `wipeout_um_init` (22 cvars on top of `common_um_init`'s 52-cvar baseline). The full enforced-settings table can be fetched from the `gameplay_mechanics` rows with `kind='mode_default'` and `props_json->>'initstring_array' = 'wipeout_um_init'`.

Count N from your pre-flight L1 query against the init array (do not approximate). Do NOT inline any "key values" preview prose -- the LLM fetches the full table on demand; a partial preview just risks drift.

**Rationale**: concept notes optimize for one consumer (the LLM oracle, which already has MCP L1 tools to fetch the table). Duplicating the table in prose creates a drift vector (committed values vs live L1 values diverge). Any future wiki/rendering skill projects the full table from frontmatter pointer + live L1 join -- that responsibility belongs to the renderer, not the concept note.

### 9. See also (mandatory)

Cross-references: related modes (with `relation` tag from `related_modes` frontmatter), key commands, related concept notes (weapon-scripts, ruleset patterns, etc.). Wiki page renders this as link list; LLM oracle uses it for retrieval expansion.

## Mutations -- 6 sections

Mutations are additive; they don't replace a base mode. The section set focuses on activation, interaction effects, and the few cvars involved. No Strategy or Maps (those depend on the base mode, not the mutation).

### 1. Lead (mandatory)

One paragraph: what the mutation does, what the user-observable effect is. Establishes the "I'm playing X with this mutation on" framing.

### 2. What it does (mandatory)

Mechanical description: the effect on gameplay. Distinct from Lead in that it gets into specifics. May include before/after framing ("Without this mutation: normal weapon pickup. With this mutation on: pickup of weapons you're already carrying is blocked.").

### 3. How to enable (mandatory)

Admin-facing activation. Typically: "Set `k_<name>` to 1 in server.cfg." May include the auxiliary cvars (e.g., for berzerk: "`k_bzk 1` enables; `k_btime <seconds>` sets the duration window").

### 4. Interaction with base modes (mandatory)

Which base modes the mutation can layer on (the frontmatter `applies_to` field, expanded into prose). Notes on whether the mutation behaves differently on different base modes (e.g., freshteams is a dmm1-tuned ruleset; meaningless outside dmm1).

If `stacks_with_mutations: yes` -- note which other mutations are commonly combined and which combinations are documented as broken or weird.

### 5. Configuration (mandatory)

The cvars involved: `activation_cvar` + `auxiliary_cvars`. Small hand-written table (mutations have no `_um_init` array, so the auto-projection placeholder does NOT apply here). Each cvar's L1 description is linkable. Common shape:

```markdown
## Configuration

| Cvar | Default | Purpose |
|---|---|---|
| `k_killquad` | 0 | Activation toggle (1 = enabled) |
```

For mutations with no auxiliary cvars (e.g., killquad), a 1-row table is the right size -- explicitly call out "no auxiliary cvars" in a sentence below the table rather than padding it. For mutations with rich tuning (e.g., freshteams, which has ~15 sub-cvars), the table grows accordingly; do not split into sub-sections.

### 6. See also (mandatory)

Cross-references: related mutations, base modes commonly paired, related concept notes.

## Variants -- 4 sections (typically very short)

Variants live in families. The family head's standalone note carries the shared content; the variant note carries only the deltas.

### 1. Lead (mandatory)

One paragraph: "This is the Nv variant of [family head]." Roster, distinguishing tunable, one-line summary of the delta.

Example (blitz2v2):
> Blitz 2v2 is the two-team roster variant of Hoonymode. Players experience the same spawn-rotation mechanics as in regular hoonymode but in a 2-on-2 configuration rather than the duel format.

### 2. Family delta (mandatory)

The substance: what differs from the family head. The length band depends on variant sub-shape:

- **Pure roster variants** (1on1 / 2on2 / 3on3 / 4on4 / 10on10 / 2on2on2 / 3on3on3 / 4on4on4 / XonX -- all team-deathmatch family). The delta is just "Roster: NvN." 1-3 bullets, ~30-80 words is the right size. Padding past this is anti-pattern.
- **Structural variants** (blitz2v2 / blitz4v4 -- vary from hoonymode along multiple axes: roster, teamplay model, time/frag scoring, round structure, powerups). The delta is the substantive content; 5-9 bullets covering each differing axis, ~150-250 words is the right size. The blitz family is the canonical example -- it differs from hoonymode across ~9 cvars, not just roster.

Sub-shape is decided per variant during authoring, not declared upfront in the schema. If the per-pre-flight diff of the variant's `_<variant>_um_init` vs the family head's init array shows >3 cvars differing on axes other than roster (team-count cvars), it's a structural variant.

Avoid the trap of forcing structural variants into the pure-roster band -- the resulting delta will mislead readers about how distinctively the variant plays.

### 3. Configuration (mandatory)

The variant's `_um_init` array projected as a table -- just the cvars that differ from the family head's table, when computable. Otherwise the full variant table with annotation "shared with family head except where noted."

### 4. See also (mandatory)

Family head + sibling variants + any cross-family related modes.

## Section ordering -- canonical position

```
Standalone:    Lead | How to play | Rules | (Sub-system N...) | (Strategy) | (Maps) | (History) | Server setup | Configuration | See also
Mutation:      Lead | What it does | How to enable | Interaction with base modes | Configuration | See also
Variant:       Lead | Family delta | Configuration | See also
```

`(Sub-system N...)` is zero or more optional sections per sub-system, positioned between Rules and Strategy. CTF has two (Grappling hook + Runes); most standalones have zero.

**Optional sections in parentheses above (`(Strategy)`, `(Maps)`, `(History)`, `(Sub-system N...)`) are OMITTED if you have no real content for them.** The canonical ordering above tells you WHERE to put a section IF you have one -- it does NOT require you to ship a stub heading with a placeholder line. An empty section header is anti-pattern; a skipped optional section is correct. Mandatory sections (`Lead`, `How to play`, `Rules`, `Server setup`, `Configuration`, `See also` for standalone) ship in every note even when terse -- but their content is always real, never placeholder.

Standalone has the most reader paths (player skim, player deep, admin setup, LLM retrieval). The 7-then-admin-block ordering serves all four. Mutation has fewer paths and a smaller section set. Variant is the shortest -- mostly defers to the family head.

## Section length guidance

Stub vs full page bands per section (approximate, not enforced):

| Section | Stub | Full page |
|---|---|---|
| Lead | 50-100 words | 100-200 words |
| How to play | 30-80 words | 100-300 words |
| Rules | 100-300 words | 500-1500 words |
| Strategy | -- (omit) | 200-2000 words |
| Maps | -- (omit) | 100-1000 words |
| History | -- (omit) | 50-500 words |
| Server setup | 20-50 words | 100-300 words |
| Configuration | Auto-projected | Auto-projected |
| See also | 30-50 words | 50-200 words |

Stub example (Yawnmode mutation): Lead (60w) + What it does (120w) + How to enable (30w) + Interaction (80w) + Configuration (auto) + See also (40w) ~= ~330 words + auto-projected config table.

Full page example (CTF standalone): Lead + How to play + Rules + Strategy + Maps + History + Server setup + Configuration (auto) + See also = 1500-2500 words. CTF's existing wiki page is 12434 chars (~2000 words). Harvest path keeps that scale, anchored with mechanical Configuration.

## Anti-patterns

Section content rules -- things that DO NOT belong in particular sections, surfaced to prevent drift:

| Section | Anti-pattern |
|---|---|
| Lead | Cvar names. Source-file references. Detailed rules. (Save for Rules / Configuration.) |
| How to play | Server admin setup details. (Save for Server setup.) |
| Rules | Strategy advice. ("Best to rush mid" goes in Strategy.) |
| Strategy | Mechanical rule statements. (Save for Rules.) |
| Server setup | Player-facing activation. ("Type /wipeout" goes in How to play.) |
| Configuration | Editorial prose. (This section is the auto-projected cvar table; explanatory text goes in Rules or footnotes.) |

When a curator is tempted to violate one of these, the right move is usually to extend Rules or Strategy rather than mix concerns into a section meant for a different reader path.

## Open questions

1. **~~Wiki rendering of the auto-projected Configuration table.~~** RESOLVED 2026-05-28 (post-readability review). Convention locked: standalone/variant use a 1-2 sentence pointer prose to the init array (NO HTML-comment placeholder, NO inline cvar values -- concept notes don't carry rendering scaffolding); the LLM oracle fetches the full table via MCP L1 tools, and any future wiki/rendering skill projects from the frontmatter pointer + live L1 join. Mutation uses a small hand-written table over `activation_cvar` + `auxiliary_cvars`. The earlier HTML-comment-placeholder convention (locked after the killquad + wipeout pair) was retired when readability review surfaced the SQL-syntax-in-prose smell. Documented inline above.
2. **Section heading style.** Markdown `##` heading or YAML-driven structured sections? Existing concept notes use markdown headings; this convention extends. Worth confirming the wiki-projection tooling handles markdown -> MediaWiki markup cleanly.
3. **Family head's section delta.** When a standalone is ALSO a family head (hoonymode), should the standalone note include a "Family variants" sub-section listing the variants and their deltas? Or leave to See also? Resolve during hoonymode's authoring.
4. **Maps section convention for race / midair.** These modes are intrinsically map-coupled. The Maps section here may be denser than for other modes (per-map route lists for race; tested-airborne maps for midair). May warrant a sub-shape note for "map-coupled standalone" but defer until LGC / race drafting surfaces real friction.

None of these are blockers for the first two worked examples (killquad as mutation, LGC as mutation).
