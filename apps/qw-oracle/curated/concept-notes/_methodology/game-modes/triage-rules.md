# Game-mode concept-note triage rules

## Purpose

Defines how to classify each mode's authoring path based on the quality of existing wiki content. The triage outcome -- `l3-upstream`, `wiki-upstream`, or `hybrid` -- determines whether to draft from L1 + source, harvest from wiki narrative, or combine both. The outcome is recorded in the concept-note frontmatter as `wiki_status` (per [[concept-note-frontmatter-schema]]).

This document gives the scoring rubric, the decision tree, and the path-specific authoring workflows.

## The three triage outcomes

| Outcome | What it means | When to choose |
|---|---|---|
| `l3-upstream` | No useful wiki content; the concept note IS the source. | Wiki page is absent, a stub, or so mechanically drifted from current KTX that using it would introduce errors. Draft from L1 + source + research folder. |
| `wiki-upstream` | Wiki has substantial, mechanically accurate content; harvest into concept note. | Wiki page is substantial (>1500 chars), mechanically consistent with current KTX source, and has narrative the L1 corpus can't synthesize on its own (history, strategy, community context). |
| `hybrid` | Wiki has some content but not enough alone OR has drifted in places. | Wiki provides narrative scaffolding worth keeping but requires verification against L1. Harvest selectively; draft the gaps; correct mechanical claims that don't match current source. |

## Wiki content scoring rubric

Score the wiki page on three dimensions independently. The combination drives the triage outcome.

### Dimension 1: Content length

Coarse signal that captures whether there is anything substantive to harvest.

| Length band | Bucket | Notes |
|---|---|---|
| 0 chars (no page) | absent | No wiki page exists in the snapshot for this mode |
| 1-499 chars | minimal | One paragraph or less; usually identity + activation command |
| 500-1499 chars | thin | Identity + a paragraph of rules; rarely more |
| 1500-3499 chars | medium | Lead + 2-3 sections; usable scaffold |
| 3500+ chars | substantial | Multiple sections; harvest-worthy on its own |

Boundaries are strict (< vs >=); when a wikitext length sits exactly on a boundary (within ~50 chars), default to **hybrid** regardless of which side the rule would otherwise route to. Wipeout's wikitext landed at ~1500 chars (boundary between thin and medium); the worked-example pair confirmed the default-to-hybrid rule -- hybrid handled both the thin-path harvesting (Lead + Rules from wiki) and the medium-path obligations (verify mechanical claims, draft missing sections) without forcing a clean classification call.

### Dimension 2: Mechanical accuracy vs current KTX

How well does the wiki page describe the *current* implementation of the mode?

| Score | Description |
|---|---|
| current | Claims match what L1 + source reflect. Confidence to harvest. |
| partially-current | Most claims accurate; some mechanical details outdated (specific cvar names changed, default values shifted, sub-rule modified). Harvestable with verification + corrections. |
| drifted | Substantial mechanical claims contradict current KTX (e.g., describes a mod's rules that KTX replaced; references cvars that don't exist or behave differently). Risk of propagating errors if harvested as-is. |
| wrong | Page is about a different thing entirely (e.g., describes how to install a server-side mod variant rather than how to play the mode). Don't harvest. |

Assessing this requires comparing wiki prose against L1 facts. Quick checks:
- Cvars named in the wiki text -- do they exist in L1 with the claimed behavior?
- Activation commands -- match the `mode_cmd[]` table or known cvar toggle?
- Version claims -- consistent with `gameplay_sources.commit_sha` or known introduction commits?

### Dimension 3: Substance type

What kind of content does the wiki page have? Determines which sections the harvest can populate.

| Substance | Description | Section coverage |
|---|---|---|
| mechanical | Rules + cvar lists + activation command | Lead / How to play / Rules |
| strategic | Tactics, play patterns, role advice | Strategy |
| historical | Origin, mod ancestry, design intent | History / origin |
| community | Map preferences, scene context, community conventions | Maps / Strategy / See also |
| installation | Server-side mod install instructions | Server setup (occasionally; often anti-pattern -- see edge cases) |
| mixed | Substantive content across multiple categories | Multiple |

## Decision tree

Apply the scoring, then walk the tree.

```
Wiki page absent OR minimal (<500 chars)?
  yes -> l3-upstream
  no -> continue

Wiki page DRIFTED or WRONG mechanically?
  yes (drifted) -> hybrid (harvest narrative selectively; verify aggressively; correct mechanical claims)
  yes (wrong)   -> l3-upstream (don't harvest; treat page as if absent)
  no -> continue

Wiki page SUBSTANTIAL (>3500 chars) AND mechanically current/partially-current?
  yes -> wiki-upstream
  no  -> continue

Wiki page THIN (500-1500 chars) AND mechanically current?
  yes -> hybrid (use as scaffold; draft the gaps from L1)
  no -> continue

Wiki page MEDIUM (1500-3500 chars) AND mechanically current?
  yes -> wiki-upstream (lighter harvest; primary substance comes from wiki)
  no -> hybrid
```

Default when uncertain: `hybrid`. The harvest path is strictly more cautious than `wiki-upstream` (always verifies against L1) and strictly more thorough than `l3-upstream` (uses what wiki content exists).

## Applied triage -- 27 modes

Tentative classification using the rubric, based on the wiki snapshot scan summarized in [[mode-vs-mutation-classification]]. Per-mode mechanical-accuracy assessment is preliminary and gets verified during the actual authoring of each note.

| Mode | Wiki page | Chars | Mechanical | Tentative triage |
|---|---|---|---|---|
| ctf | Capture_the_Flag | 12434 | needs-check | wiki-upstream |
| lgc | LGC | 6289 | needs-check | wiki-upstream |
| instagib | Instagib | 3605 | needs-check | wiki-upstream |
| wipeout | Wipeout | ~3500 | likely current | wiki-upstream |
| race | Race | ~2400 | likely partially-current | hybrid |
| bloodfest | Bloodfest | 2204 | needs-check | hybrid |
| hoonymode | Hoonymode | ~2000 | likely current | hybrid |
| 4on4 | 4on4 | 1306 | likely current | hybrid |
| ca | Clan_Arena | 1198 | WRONG (page is about installing CACE mod, not playing ca) | l3-upstream |
| tot | ToT_Mode | 1161 | needs-check | hybrid |
| 1on1 | 1on1 | 753 | likely current but thin | hybrid |
| yawnmode | Yawnmode | 736 | needs-check | hybrid |
| 2on2 | 2on2 | 558 | likely current but thin | hybrid |
| ffa | Free_For_All | 241 | minimal stub | l3-upstream |
| Deathmatch | Deathmatch | ~5000 | drifted (enumerates KTPro modes 5-8 absent from KTX) | umbrella concept -- decide whether to author at all |
| Blitz | Blitz | 1820 | needs-check | depends on family-page decision |
| berzerk | -- absent -- | 0 | n/a | l3-upstream |
| freshteams | -- absent -- | 0 | n/a | l3-upstream |
| killquad | -- absent -- | 0 | n/a | l3-upstream |
| midair | -- absent -- | 0 | n/a | l3-upstream |
| nosweep | -- absent -- | 0 | n/a | l3-upstream |
| 10on10, 2on2on2, 3on3, 3on3on3, 4on4on4, XonX, blitz2v2, blitz4v4 | -- absent -- | 0 | n/a | l3-upstream (variant notes are short anyway; little to harvest) |

Distribution: 4 wiki-upstream + ~7-8 hybrid + ~14-15 l3-upstream. Skews L3-upstream because the missing modes (mutations + roster variants) collectively make up half the corpus.

## Path-specific workflows

### `l3-upstream` path

For modes with no usable wiki content (variants, mutations missing from wiki, modes where the wiki page is wrong like ca).

1. **Pre-flight** (per [[source-verification]] when written): load L1 mode entry + mode_default rows + source_ref
2. **Source read**: open the KTX init function (e.g., `commands.c:<line>` or `world.c:<line>`); read the surrounding context to understand the mode's mechanical shape
3. **Research folder check**: scan `research/repos/` (especially `dusty-ktx`, `ktx`, commit history) for mod-author context or design notes
4. **Draft from mechanical truth**: Lead + How to play + Rules + Server setup + Configuration + See also. Strategy / Maps / History sections only if research folder yielded curator-worthy material.
5. **Curator review gate**: standalone modes especially should get a curator pass before publishing; mutations can often ship at draft confidence

### `wiki-upstream` path

For modes with substantial, accurate wiki content (ctf, lgc, instagib, wipeout).

1. **Pre-flight**: same as above
2. **Wiki read**: open `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/<slug>.json` in full; identify natural sections (the wiki page may use unfamiliar section names; map them to our 9 sections)
3. **Mechanical verification**: walk every cvar / command / version claim in the wiki text; verify against L1; flag drifted claims for correction
4. **Section mapping**: each wiki section maps to one of our 9 sections (or contributes to multiple). Preserve narrative voice where possible; rewrite claims that drifted.
5. **L1 anchors**: ensure every cvar name / command name referenced in the prose links to its L1 canonical_id; ensure Configuration is the auto-projection (not hand-written)
6. **Gap fill**: sections the wiki didn't cover (often Server setup, Configuration, See also) get drafted from L1 same as l3-upstream path
7. **Curator review gate**: WIKI-upstream notes always need a curator review because the harvest involves judgment calls

### `hybrid` path

For modes where wiki has partial content (most thin / medium pages, and most drifted-but-salvageable pages).

1. **Pre-flight + wiki read + research check**: full breadth
2. **Triage at section level**: for each of our 9 sections, decide:
   - Section is in wiki AND mechanically current -> harvest
   - Section is in wiki BUT drifted -> harvest narrative, rewrite claims
   - Section is absent from wiki -> draft from L1
3. **Verification discipline**: even harvested sections get L1 cross-check on cvar / command / version claims
4. **Curator review gate**: HYBRID notes need curator review at the section-by-section level (not the whole-page level)

## Edge cases

Surfaced from the 27-mode triage. These cases need operator awareness during authoring.

### Multi-page modes

CTF has 9+ wiki pages: `Capture_the_Flag` (12434 chars, the gameplay overview), `CTF-2on2` (variant rules), `CTF_Showdown` / `CTF_Showdown_2` / `CTF_Showdown_3` (competition pages), plus map pages (`CTF2M1`, `CTF2M8`, `CTF5`, `CTF8`).

Authoring decision: the main concept note draws from `Capture_the_Flag` for Lead / Rules / Strategy; map pages contribute to the Maps section if relevant; competition pages contribute to History / scene context.

Apply this pattern generically: when multiple wiki pages relate to one mode, the gameplay overview page is primary; satellite pages are supplemental.

### Wrong-topic wiki pages

`Clan_Arena.json` (1198 chars) is mostly about installing the CACE server-side modification, not about playing the ca game mode. Triage outcome: `l3-upstream` (don't harvest the install content; that's a separate concern -- maybe a `cace-server-setup.md` concept note someday).

The author who wrote the wiki page was solving a different problem (how do I host CA?) than our note (what is CA?). Recognize and skip.

### Umbrella / catch-all pages

`Deathmatch.json` (~5000 chars) covers the umbrella concept "deathmatch" and enumerates KTPro modes (5-8) absent from KTX. It is not a per-mode page.

Authoring decision: probably no per-mode "deathmatch" concept note (deathmatch is a category, not a single mode in the KTX `game_mode` enumeration). The substantive content about dmm1 / dmm2 / dmm3 / dmm4 may warrant a separate concept note on "Deathmatch mode flags (dmm0-4)" or merge into the relevant per-mode pages (most QW modes are dmm3-based).

Same pattern for `Blitz.json` if it covers the umbrella concept rather than a specific blitz variant.

### Wiki page exists but is for a different game/era

If a wiki page describes the QuakeWorld-era mode but the entity we have in L1 is a KTX-specific evolution, there is a temporal mismatch. Harvest the historical/origin section to History / origin; verify the Rules section against current KTX; treat partial-current with care.

### Multiple modes share community framing

Roster variants of the same family (1on1 / 2on2 / 4on4) share strategic frames. The wiki has separate pages for each; the strategy advice in 4on4.json may apply equally to 2on2 and 1on1 with tweaks. Harvest carefully; per-variant pages can reference the family base or each other rather than duplicating.

## Decision-recording in the note

When the triage decision is made, record it:

- `wiki_status` frontmatter field: `l3-upstream` / `wiki-upstream` / `hybrid`
- `wiki_page_slug` frontmatter field: the page filename in the snapshot (e.g., `Capture_the_Flag`), present when wiki content was consulted regardless of triage outcome
- A brief note in the prose-body footer (or `<!-- triage notes -->` HTML comment) recording: what the wiki had, what was harvested, what was rejected and why

The recording lets stewardship re-visit the decision when wiki content changes or when L1 evolves.

## Open questions

1. **Mechanical-accuracy assessment requires source familiarity.** The triage decision often hinges on "is this cvar still real?" or "do these rules match current behavior?" -- which requires reading both wiki prose and KTX source. Skill instructions need to give the per-card sub-agent (or curator) a verification checklist.
2. **Umbrella-page decision.** Deathmatch + Blitz umbrella pages don't map to per-mode notes cleanly. Whether they get their own concept notes, get absorbed into a dmm-flags reference, or are dropped is a content-strategy decision that gets resolved during the first wave of authoring.
3. **Multi-page harvest discipline.** When 9+ wiki pages relate to one mode (CTF), the harvest is non-trivial. The skill workflow may need an explicit "satellite-page scan" step rather than assuming one wiki page per mode.
4. **CACE / CA-Champion-Edition split.** Clan_Arena's install-focused wiki content is real and useful (just for a different concept note). Confirm this gets parked as a separate future concept note rather than lost during the ca authoring.

Resolved during first 2 worked examples (killquad as l3-upstream mutation, LGC as wiki-upstream mutation -- the worked-examples pair tests both ends of the triage path).
