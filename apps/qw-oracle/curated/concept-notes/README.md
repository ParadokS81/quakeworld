# Concept notes (Layer 3)

Hand-authored curated notes that synthesize Layer 1 facts and Layer 2 testimony into usable guidance. Not yet served over MCP - the `get_concept_note` tool will eventually read from this directory. For now the notes exist as plain markdown for humans and for Claude Code sessions to read directly.

See `../VISION.md` for the three-layer knowledge-service framing.

## Two feeding paths

Layer 3 accepts content from two distinct sources. Both produce notes in this directory; both live under the same MCP surface and the same frontmatter schema.

- **Imported** -- guide content already curated by the community elsewhere (primarily ezquake.com/docs guide pages). Mirrored into a concept note with entity links to Layer 1. Earned by 15+ years of community questions; no need to re-derive.
- **Authored-here** -- full-body notes written during review or deliberate investigation for gaps the community hasn't covered. Potential upstream PR candidates back to ezquake.com.

The "earn by question" principle below governs **authored-here** notes only. It does not reject imports.

## When to author a note (earn-the-note tests)

A finding warrants a concept note -- as opposed to cold Layer 1 data -- when at least one of these applies:

1. **User-visible artifacts still on disk.** Example: `.kmap` files ship in nQuake bundles even though ezQuake removed the loader in 2014.
2. **Orphan state in the current engine.** Example: `in_builtinkeymap` cvar surviving the rest of the removed keymap subsystem.
3. **Commonly referenced in Layer 2 chat testimony.** The community still asks about the topic.
4. **Cautionary / teaching example for current design patterns.** Example: server-side protocol version-gating pattern, generalizable across protocol extensions.
5. **Current feature with depth beyond a Layer 1 entity listing.** Material narrative, pattern, or synthesis across multiple entities -- a family story, not one cvar.

Otherwise: Layer 1 alone is sufficient; no note. **Layer 3 is guidance-for-today, not a museum. Layer 1 is the museum** -- version-aware facts with per-field blame already carry history. Removed features that leave no artifacts, no orphan state, no community volume, and no teaching value do not earn a note.

**Outside current Layer 3 scope:** opinionated community best-practice -- strategy guides, competitive performance tuning, teamplay culture on and off the field. That material lives in Layer 2 raw testimony today. A future authoring lane can crystallize it into Layer 3 notes once it stabilizes, but current scope stays factual: mechanics, workflows, patterns, conventions, not normative advice.

Good triggers (examples that pass one or more tests):
- A fact that requires synthesizing multiple Layer 1 entities into a story (a removal commit plus a surviving cvar plus a distribution channel).
- A classifier or taxonomy question that crosses entity types (player-facing vs engine-internal).
- An ecosystem fact that source code has no access to (which community installer ships which files, what a file's cultural role is).
- A deprecation / transition story that a frozen Layer 1 snapshot misses because the knowledge lives in the diff, not the state.
- A cross-codebase pattern (an ezQuake feature with KTX or MVDSV counterpart) -- even if only one codebase is walked, create the note now so future walks can reference it rather than duplicate.

## Note shape

Each note has YAML frontmatter and a predictable section skeleton. The `<topic-specific>` sections between Summary and Consumer implications vary by note shape. Recognized shapes, with existing exemplars:

- **Narrative / history** -- sequential arc across origin, transition, removal, current state. Exemplars: `kmap-legacy-keymap-system.md`, `completing-legacy-fte-protocol-extensions.md`.
- **Taxonomy / classifier** -- axis defined, per-item placement, consumer implications per category. Exemplar: `engine-internal-vs-player-facing-files.md`.
- **Domain walkthrough** -- what-the-feature-does + per-entity breakdown + conventions + failure modes. Exemplar: `skywind-animated-skyboxes.md`.
- **Policy + iteration story** -- threat model / purpose + defenses + time-ordered iteration (e.g., follow-up commits tuning defaults) + current state. Exemplar: `client-side-server-exec-allowlist.md`.
- **Pattern library** -- single reusable script/config shape + one worked example + variations + constraints. Focuses narrowly on a pattern (version-gating, exec-allowlist, restriction primitives), not a feature area. Exemplars: the pattern sections of `client-side-server-exec-allowlist.md`, `ruleset-anti-script-restriction-pattern.md`, `completing-legacy-fte-protocol-extensions.md`.
- **Short how-to** -- 15-30 line task-oriented prose, numbered steps common. No current exemplars; incoming from guide-derived imports (e.g. `crosshairs`, `fakeshaft`).

Pick the closest shape; small hybrids are fine. Add a new shape to this list only when a note doesn't fit any existing one.

### Voice and length by shape

Voice register and length depend on shape. One skeleton, tiered voice. Evidence for the split -- and why forcing one voice across all shapes fights the source material -- lives in `docs/superpowers/specs/2026-04-24-layer3-role-map.md`.

| Shape | Voice | Length | Citation density |
|---|---|---|---|
| Narrative / history | Third-person factual, past tense for history | 60-120 lines | High: commit SHAs, PRs, file:line |
| Taxonomy / classifier | Third-person factual, axis-defining | 40-80 lines | High: file:line per category boundary |
| Domain walkthrough | Lighter imperative; journey-stage headings | 30-80 lines | Moderate: primary entities + key PRs |
| Policy + iteration story | Third-person factual, threat-model framing | 80-150 lines | High: commit SHAs + PR trail |
| Pattern library | "Here is a shape, with constraints, with one worked example" | 30-80 lines | Moderate: primary entities + 1-2 anchoring PRs |
| Short how-to | Imperative second-person; numbered steps common | 15-30 lines | Low: entity refs only |

Source-derived infrastructure notes (the first six in this directory) carry the highest citation density. Guide-derived feature-family and pattern notes use a lighter imperative register. Short how-tos don't force source-archaeology citations the original material doesn't contain.

### Progressive disclosure for notes over ~80 lines

Notes longer than approximately 80 lines structure their opening as a standalone short answer. The first ~30 lines (Summary + the section that follows it -- usually a Mental model, per-method glance, or taxonomy table) must be readable on its own: a reader who stops there has a usable answer to the topic. Everything below those two sections is drill-down depth.

The opener shape varies -- taxonomy table, three-method glance, summary + mechanical behavior, bucket+path table -- but the principle is consistent: short-answer-first, depth-after. This pairs with MCP serving: the default condense can return the first two sections without losing meaning, while a depth query can return the full note.

Notes under ~80 lines do not need the structural split -- they can be linear. The 30-line threshold is approximate; the test is whether a reader who stops after the first two sections has a usable answer.

Confirmed across `weapon-scripts.md` (R3+R7, three-method glance opener), `lightning-gun-customization.md` (R2+R7, summary + mechanical behavior opener), and `player-skins.md` (R2+R7, bucket+path table opener). See `OPERATIONS.md` Section  7 entry "Progressive-disclosure structure for long notes" for the rule-of-three trail.

### Authority grounding for R7 (opinionated best-practice) content

R7-flavored notes -- those carrying recommendations, named recipes, or "most players use X" claims -- must ground every recommendation in at least one of four labeled grounds. Bare assertion is disallowed.

1. **Engine mechanics** -- source-defensible. Cite file:line.
2. **Community consensus** -- via commit messages, PR threads, or Layer 2 testimony with message-ID citation.
3. **Operator SME** -- explicitly credited in the `primary_contributors` frontmatter.
4. **Hedged community knowledge** -- flagged inline as not-source-defensible field practice. The hedge must name its own status (e.g. *"community knowledge, not source-defensible"*) so a downstream consumer can weight the claim correctly.

A single recommendation can rest on more than one ground; the requirement is that at least one labeled ground supports each claim. This is what keeps R7 content useful rather than opinion-mining: a downstream consumer can trace any "you should do X" to a defensible source class even when measurement-grade evidence isn't available.

Confirmed across `weapon-scripts.md`, `lightning-gun-customization.md`, and `player-skins.md`. See `OPERATIONS.md` Section  7 entry "First R7 opinionated-best-practice note landed" for the rule-of-three trail.

Frontmatter:

```yaml
---
title: <short human title>
slug: <matches filename stem>
topic: <asset-lifecycle | classifier-metadata | domain-guide | security-policy | ...>
status: draft | curated | deprecated
authored_by: community | qw-oracle    # path-1 import vs path-2 authored-here
source_url: <upstream URL if imported>        # omit for authored-here
imported_from: <commit sha of upstream>       # omit for authored-here
last_imported_at: YYYY-MM-DD                  # omit for authored-here
upstream_status: imported | authored | gap-candidate | upstream-pending
upstream_target: <ezquake.com page slug> | new-page | none-today   # omit when upstream_status is imported or authored
primary_contributors:                         # upstream code authors the note documents (GitHub handles)
  - "@handle"
related_entities:
  - ezquake:cvar:<name>
  - ezquake:command:<name>
  - ezquake:extension:<ext>
  - ezquake:commit:<sha>
  - ezquake:pr:<number>
  - ezquake:ruleset:<name>
related_messages: []
last_updated: YYYY-MM-DD
---
```

Provenance fields distinguish imports from authored-here and track drift:

- `authored_by: community` + `source_url` + `imported_from` + `last_imported_at` -- the note is mirrored from ezquake.com/docs or another community source. Re-sync by checking if upstream commit sha has advanced past `imported_from`.
- `authored_by: qw-oracle` -- the note was written here. If it's a gap ezquake.com doesn't cover, `upstream_status: gap-candidate` + `upstream_target: <page>` flags it for eventual upstream PR. The target preserves finding-time intent (which ezquake.com page the gap belongs in) so a future upstream sweep doesn't have to re-derive it. Use `upstream_target: new-page` when no existing ezquake.com page is a natural home; when the new page would also require a new sidebar section (e.g., a "Security" section that doesn't exist), capture that scope expansion in the References section -- the upstream PR is larger than a single-file add.

`primary_contributors` lists the upstream code authors the note documents (GitHub handles, e.g., `@dsvensson`, `@osm`) -- distinct from `authored_by`, which is about the note's provenance, not the feature's. Populated for both imported and authored-here notes. Useful for MCP "who landed X" queries and for upstream-PR coordination (crediting and notifying the original contributor). Multiple handles when the documented work genuinely spans multiple contributors.

Entity-ref format in `related_entities`: `<project>:<kind>:<identifier>`. Supported kinds per project follow the Layer 1 entity-type vocabulary (`cvar`, `command`, `macro`, `cmdline_param`, `keyname`, `hud_element`, `ruleset`, `token_primitive`) plus cross-referenceable artifacts (`commit`, `pr`, `extension`). PRs are load-bearing provenance -- cite `ezquake:pr:<n>` whenever a finding traces to a specific PR via the enrichment pipeline. Multiple PRs in one note are fine when the story genuinely spans them (e.g., a feature landing across an initial merge + follow-up fixes); single-PR notes are the common case.

Topic vocabulary (`topic:` field) is intentionally broad. `domain-guide` covers narrative / walkthrough content regardless of audience -- player-facing, operator-facing, and tool-author-facing notes all use it. `asset-lifecycle` and `classifier-metadata` are reserved for the specific shapes named. Add a new topic value only when a third note in a truly distinct shape (e.g., `protocol-archaeology`, `security-policy`) would be actively miscategorized under the existing ones; don't split the vocabulary speculatively.

Body:

```
## Summary           -- 2-4 sentences, elevator of the note
## <topic-specific>  -- 2-4 sections, varies by shape
## Consumer implications  -- what a downstream tool can do with this
## References        -- commits, file:line, cross-doc pointers, testimony cites
## Related concept notes  -- sibling links and forward references
```

Tone: factual, third-person, present tense for current state, past tense for history. Cite liberally. Community testimony (e.g. "per ParadokS, 2026-04-22") is a legitimate source for facts that Layer 1 cannot verify.

Length: ~15-150 lines depending on shape -- see the voice-and-length table above. Shorter notes tend to be under-justified when they hold infrastructure content; longer notes in any shape usually want splitting.

## Current notes

| Slug | Title | Topic | Status |
|---|---|---|---|
| `kmap-legacy-keymap-system` | The `.kmap` legacy keymap system and its persistence via nQuake | asset-lifecycle | draft |
| `engine-internal-vs-player-facing-files` | Engine-internal vs player-facing files in a QuakeWorld install | classifier-metadata | draft |
| `skywind-animated-skyboxes` | Skywind: animated skyboxes ported from IronWail | domain-guide | draft |
| `completing-legacy-fte-protocol-extensions` | Completing legacy FTE protocol extensions in ezQuake 3.6.6 | domain-guide | draft |
| `client-side-server-exec-allowlist` | Client-side server-exec allowlist: guarding the client against hostile servers | security-policy | draft |
| `ruleset-anti-script-restriction-pattern` | QW competitive ruleset anti-script restriction pattern | security-policy | draft |
| `weapon-scripts` | QuakeWorld weapon scripts: the three practical methods | domain-guide | draft |
| `lightning-gun-customization` | Customizing the Lightning Gun in QuakeWorld | domain-guide | draft |

## Candidate future notes

Surfaced during prior work but not yet written. Each earns a note only when a concrete consumer question is posed against it.

- **Extension to provenance confidence** - bridge between "the engine can write this extension" and "this specific file on disk came from the engine." Distinct from the player-facing axis.
- **nQuake bundle staleness pattern** - parent note for `.kmap` and any other cases where the curated bundle carries content whose engine-side referent was removed. Only justified once a second instance surfaces to generalize the pattern.
- **`.qwz` external decoder dependency** - the engine has a first-class hook for `.qwz`, but actual decoding happens in external `qwdtools`. Relevant for consumers classifying files that look loaded but depend on a separate tool chain.
- **The ezQuake + nQuake + ezQuake (again) ecosystem** - how the same binary can be installed via different channels, and why the resulting quake dir looks different between install methods. Pre-requisite to the provenance note.
