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

The `mode_default` cvar table for this mode -- auto-projected from `gameplay_mechanics` via the `mode_default_init_array` frontmatter field. Shows every cvar the mode sets at activation, with current value, default, and link to the cvar's own L1 description.

This is the LLM oracle's structured anchor for "what cvars does X mode apply?" queries. It's also the killer feature that the old wiki never had.

Wiki-projection note: the rendered wiki table reads from the live L1 join, so it never drifts from source. Curators don't hand-edit this section.

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

The cvars involved: `activation_cvar` + `auxiliary_cvars`. Small table (not a full mode_default projection -- mutations have no `_um_init` array). Each cvar's L1 description is linkable.

### 6. See also (mandatory)

Cross-references: related mutations, base modes commonly paired, related concept notes.

## Variants -- 4 sections (typically very short)

Variants live in families. The family head's standalone note carries the shared content; the variant note carries only the deltas.

### 1. Lead (mandatory)

One paragraph: "This is the Nv variant of [family head]." Roster, distinguishing tunable, one-line summary of the delta.

Example (blitz2v2):
> Blitz 2v2 is the two-team roster variant of Hoonymode. Players experience the same spawn-rotation mechanics as in regular hoonymode but in a 2-on-2 configuration rather than the duel format.

### 2. Family delta (mandatory)

The substance: what differs from the family head. Often just 1-3 bullets (roster size, specific cvars that differ, win condition tweaks).

For pure roster variants (1on1 / 2on2 / 4on4 / 10on10 / XonX -- all team-deathmatch family) the delta may be only "Roster: NvN." Note that this is *enough* -- a stub variant page is the right size.

### 3. Configuration (mandatory)

The variant's `_um_init` array projected as a table -- just the cvars that differ from the family head's table, when computable. Otherwise the full variant table with annotation "shared with family head except where noted."

### 4. See also (mandatory)

Family head + sibling variants + any cross-family related modes.

## Section ordering -- canonical position

```
Standalone:    Lead | How to play | Rules | (Strategy) | (Maps) | (History) | Server setup | Configuration | See also
Mutation:      Lead | What it does | How to enable | Interaction with base modes | Configuration | See also
Variant:       Lead | Family delta | Configuration | See also
```

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

1. **Wiki rendering of the auto-projected Configuration table.** The wiki page reads from L1 at render time; concept-note authoring doesn't write cvar values into the note prose. Question: does the concept-note .md show the table at all, or just a placeholder like `<!-- configuration table auto-projected from gameplay_mechanics WHERE initstring_array = '<value>' -->`? Resolve during first worked example.
2. **Section heading style.** Markdown `##` heading or YAML-driven structured sections? Existing concept notes use markdown headings; this convention extends. Worth confirming the wiki-projection tooling handles markdown -> MediaWiki markup cleanly.
3. **Family head's section delta.** When a standalone is ALSO a family head (hoonymode), should the standalone note include a "Family variants" sub-section listing the variants and their deltas? Or leave to See also? Resolve during hoonymode's authoring.
4. **Maps section convention for race / midair.** These modes are intrinsically map-coupled. The Maps section here may be denser than for other modes (per-map route lists for race; tested-airborne maps for midair). May warrant a sub-shape note for "map-coupled standalone" but defer until LGC / race drafting surfaces real friction.

None of these are blockers for the first two worked examples (killquad as mutation, LGC as mutation).
