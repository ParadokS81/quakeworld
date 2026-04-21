# QW Knowledge - Vision

## What this package is for

`packages/qw-knowledge/` holds cross-project QuakeWorld domain knowledge that multiple apps in this monorepo consume. It exists so matchscheduler, quad, qw-stats, slipgate, qw-oracle, and any voice-analysis work can share one canonical copy of the vocabulary, patterns, and reference data the community uses -- instead of each app maintaining its own.

Content spans two distinct categories:

**Reference data (structured, consumed programmatically):**
- `terminology/qw_glossary.yaml` - voice-first slang / nickname / call-out vocabulary, used by whisper-model voice transcription and by any natural-language surface (oracle MCP answers, slipgate help text).
- `maps/*.loc` - location files defining map-position names (e.g. `dm3.loc` maps coordinates to `ra`, `ya`, `rl`, `water`). Consumed by slipgate's player-state simulator and by any app rendering match events.
- `players/player_mappings.yaml` - canonical player-name alias registry. Consumed by match-stats tooling, demo parsing, and chat-corpus normalization.

**Concept notes (prose + fixtures, explain community patterns):**
- `weapon-scripts/` - README + example fixtures covering weapon-script patterns (quickfire vs manual, priority chains, +alias/-alias hybrids, kill-me prep).
- `teamsays/` - README + fixture style guide covering teamsay-script patterns (if-grammar, tp_msg families, runtime token families, common alias chain shapes).
- `strategies/` - map-level tactical notes inherited from the quad project (map-report-quad.yaml, map-strategies-quad.yaml).

## Relationship to qw-oracle Layer 3

qw-oracle's planned Layer 3 is "curated concept notes adapted from ezquake.com docs and community wisdom." The concept-note category above maps directly onto that frame. `weapon-scripts/`, `teamsays/`, and `strategies/` are textbook Layer 3 material.

**When Layer 3 infrastructure exists** (storage schema, ingestion pipeline, MCP surface), the concept-note content migrates there. That's a future move; Layer 3 doesn't exist yet, and moving now would have nowhere to land.

**The reference-data category stays here regardless.** `terminology/`, `maps/*.loc`, and `players/` are structured lookup tables that cross-cut all three Oracle layers and have consumers (voice transcription, slipgate simulator, match-stats) that need the structured shape -- not prose notes. Folding them into Layer 3 would lose that.

## What is NOT in scope

- Engine-source facts (cvars, commands, macros, hud elements) -- those live in qw-oracle Layer 1 via the `packages/qw-config/` extraction pipeline. This package carries **community knowledge**, not extracted engine facts.
- Chat corpus -- qw-oracle Layer 2.
- Per-app configuration or feature flags -- those live in each app.

## Lifecycle status

Parked but active. Several files are still consumed in production workflows, and content was consolidated here during the monorepo migration (strategies came from quad, other bits from early slipgate work). No new additions are planned until Layer 3 lands and the migration path is clear; existing content is maintained in place.
