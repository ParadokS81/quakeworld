# Concept notes (Layer 3)

Hand-authored curated notes that synthesize Layer 1 facts and Layer 2 testimony into usable guidance. Not yet served over MCP - the `get_concept_note` tool will eventually read from this directory. For now the notes exist as plain markdown for humans and for Claude Code sessions to read directly.

See `../VISION.md` for the three-layer knowledge-service framing.

## When to write a concept note

Earn the note by answering a concrete consumer question that Layer 1 alone cannot answer. If a question reduces to "what cvar does X" or "which source line implements Y", it is a Layer 1 lookup, not a concept-note topic.

Good triggers:
- A fact that requires synthesizing multiple Layer 1 entities into a story (a removal commit plus a surviving cvar plus a distribution channel).
- A classifier or taxonomy question that crosses entity types (player-facing vs engine-internal).
- An ecosystem fact that source code has no access to (which community installer ships which files, what a file's cultural role is).
- A deprecation / transition story that a frozen Layer 1 snapshot misses because the knowledge lives in the diff, not the state.

## Note shape

Each note has YAML frontmatter and a predictable section skeleton. See `kmap-legacy-keymap-system.md` for the narrative / history shape and `engine-internal-vs-player-facing-files.md` for the taxonomy / classifier shape.

Frontmatter:

```yaml
---
title: <short human title>
slug: <matches filename stem>
topic: <asset-lifecycle | classifier-metadata | domain-guide | ...>
status: draft | curated | deprecated
related_entities:
  - ezquake:cvar:<name>
  - ezquake:extension:<ext>
  - ezquake:commit:<sha>
related_messages: []
last_updated: YYYY-MM-DD
---
```

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

## Candidate future notes

Surfaced during prior work but not yet written. Each earns a note only when a concrete consumer question is posed against it.

- **Extension to provenance confidence** - bridge between "the engine can write this extension" and "this specific file on disk came from the engine." Distinct from the player-facing axis.
- **nQuake bundle staleness pattern** - parent note for `.kmap` and any other cases where the curated bundle carries content whose engine-side referent was removed. Only justified once a second instance surfaces to generalize the pattern.
- **`.qwz` external decoder dependency** - the engine has a first-class hook for `.qwz`, but actual decoding happens in external `qwdtools`. Relevant for consumers classifying files that look loaded but depend on a separate tool chain.
- **The ezQuake + nQuake + ezQuake (again) ecosystem** - how the same binary can be installed via different channels, and why the resulting quake dir looks different between install methods. Pre-requisite to the provenance note.
