# Concept notes (Layer 3)

Hand-authored curated notes that synthesize Layer 1 facts and Layer 2 testimony into usable guidance. Not yet served over MCP - the `get_concept_note` tool will eventually read from this directory. For now the notes exist as plain markdown for humans and for Claude Code sessions to read directly.

See `../VISION.md` for the three-layer knowledge-service framing.

## Two feeding paths

Layer 3 accepts content from two distinct sources. Both produce notes in this directory; both live under the same MCP surface and the same frontmatter schema.

- **Imported** — guide content already curated by the community elsewhere (primarily ezquake.com/docs guide pages). Mirrored into a concept note with entity links to Layer 1. Earned by 15+ years of community questions; no need to re-derive.
- **Authored-here** — full-body notes written during review or deliberate investigation for gaps the community hasn't covered. Potential upstream PR candidates back to ezquake.com.

The "earn by question" principle below governs **authored-here** notes only. It does not reject imports.

## When to author a note (earn-the-note tests)

A finding warrants a concept note — as opposed to cold Layer 1 data — when at least one of these applies:

1. **User-visible artifacts still on disk.** Example: `.kmap` files ship in nQuake bundles even though ezQuake removed the loader in 2014.
2. **Orphan state in the current engine.** Example: `in_builtinkeymap` cvar surviving the rest of the removed keymap subsystem.
3. **Commonly referenced in Layer 2 chat testimony.** The community still asks about the topic.
4. **Cautionary / teaching example for current design patterns.** Example: server-side protocol version-gating pattern, generalizable across protocol extensions.
5. **Current feature with depth beyond a Layer 1 entity listing.** Material narrative, pattern, or synthesis across multiple entities — a family story, not one cvar.

Otherwise: Layer 1 alone is sufficient; no note. **Layer 3 is guidance-for-today, not a museum. Layer 1 is the museum** — version-aware facts with per-field blame already carry history. Removed features that leave no artifacts, no orphan state, no community volume, and no teaching value do not earn a note.

Good triggers (examples that pass one or more tests):
- A fact that requires synthesizing multiple Layer 1 entities into a story (a removal commit plus a surviving cvar plus a distribution channel).
- A classifier or taxonomy question that crosses entity types (player-facing vs engine-internal).
- An ecosystem fact that source code has no access to (which community installer ships which files, what a file's cultural role is).
- A deprecation / transition story that a frozen Layer 1 snapshot misses because the knowledge lives in the diff, not the state.
- A cross-codebase pattern (an ezQuake feature with KTX or MVDSV counterpart) — even if only one codebase is walked, create the note now so future walks can reference it rather than duplicate.

## Note shape

Each note has YAML frontmatter and a predictable section skeleton. See `kmap-legacy-keymap-system.md` for the narrative / history shape and `engine-internal-vs-player-facing-files.md` for the taxonomy / classifier shape.

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

- `authored_by: community` + `source_url` + `imported_from` + `last_imported_at` — the note is mirrored from ezquake.com/docs or another community source. Re-sync by checking if upstream commit sha has advanced past `imported_from`.
- `authored_by: qw-oracle` — the note was written here. If it's a gap ezquake.com doesn't cover, `upstream_status: gap-candidate` + `upstream_target: <page>` flags it for eventual upstream PR. The target preserves finding-time intent (which ezquake.com page the gap belongs in) so a future upstream sweep doesn't have to re-derive it.

Entity-ref format in `related_entities`: `<project>:<kind>:<identifier>`. Supported kinds per project follow the Layer 1 entity-type vocabulary (`cvar`, `command`, `macro`, `cmdline_param`, `keyname`, `hud_element`, `ruleset`, `token_primitive`) plus cross-referenceable artifacts (`commit`, `pr`, `extension`). PRs are load-bearing provenance — cite `ezquake:pr:<n>` whenever a finding traces to a specific PR via the enrichment pipeline. Multiple PRs in one note are fine when the story genuinely spans them (e.g., a feature landing across an initial merge + follow-up fixes); single-PR notes are the common case.

Topic vocabulary (`topic:` field) is intentionally broad. `domain-guide` covers narrative / walkthrough content regardless of audience — player-facing, operator-facing, and tool-author-facing notes all use it. `asset-lifecycle` and `classifier-metadata` are reserved for the specific shapes named. Add a new topic value only when a third note in a truly distinct shape (e.g., `protocol-archaeology`, `security-policy`) would be actively miscategorized under the existing ones; don't split the vocabulary speculatively.

Body:

```
## Summary           -- 2-4 sentences, elevator of the note
## <topic-specific>  -- 2-4 sections, varies by shape
## Consumer implications  -- what a downstream tool can do with this
## References        -- commits, file:line, cross-doc pointers, testimony cites
## Related concept notes  -- sibling links and forward references
```

Tone: factual, third-person, present tense for current state, past tense for history. Cite liberally. Community testimony (e.g. "per ParadokS, 2026-04-22") is a legitimate source for facts that Layer 1 cannot verify.

Length: ~40-150 lines. Shorter notes tend to be under-justified; longer notes usually want splitting.

## Current notes

| Slug | Title | Topic | Status |
|---|---|---|---|
| `kmap-legacy-keymap-system` | The `.kmap` legacy keymap system and its persistence via nQuake | asset-lifecycle | draft |
| `engine-internal-vs-player-facing-files` | Engine-internal vs player-facing files in a QuakeWorld install | classifier-metadata | draft |
| `skywind-animated-skyboxes` | Skywind: animated skyboxes ported from IronWail | domain-guide | draft |
| `completing-legacy-fte-protocol-extensions` | Completing legacy FTE protocol extensions in ezQuake 3.6.6 | domain-guide | draft |

## Candidate future notes

Surfaced during prior work but not yet written. Each earns a note only when a concrete consumer question is posed against it.

- **Extension to provenance confidence** - bridge between "the engine can write this extension" and "this specific file on disk came from the engine." Distinct from the player-facing axis.
- **nQuake bundle staleness pattern** - parent note for `.kmap` and any other cases where the curated bundle carries content whose engine-side referent was removed. Only justified once a second instance surfaces to generalize the pattern.
- **`.qwz` external decoder dependency** - the engine has a first-class hook for `.qwz`, but actual decoding happens in external `qwdtools`. Relevant for consumers classifying files that look loaded but depend on a separate tool chain.
- **The ezQuake + nQuake + ezQuake (again) ecosystem** - how the same binary can be installed via different channels, and why the resulting quake dir looks different between install methods. Pre-requisite to the provenance note.
