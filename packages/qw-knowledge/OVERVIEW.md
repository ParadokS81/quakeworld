# qw-knowledge - Overview

Living map of contents, consumers, and lifecycle. This document updates alongside the files it describes.

## Contents by directory

### `terminology/`

- **`qw_glossary.yaml`** - 353 lines. Voice-first QW terminology: slang, nicknames, map call-outs, position names, team-specific vocabulary. Tuned for whisper-model `initial_prompt` to improve transcription of QW voice chat. Structured as `items:` list with fields for term + context + aliases.

### `maps/`

- Five `.loc` files: `dm2.loc`, `dm3.loc`, `e1m2.loc`, `phantombase.loc`, `schloss.loc`. Each maps game-world coordinates to human position names (e.g. `ra`, `ya`, `rl`, `water`, `mega`). Format matches ezQuake's `TP_LoadLocFile` expectations. Consumed at runtime in-game via `loc_name` cvar and (in this repo) by slipgate's simulator for position-aware state evaluation.

### `players/`

- **`player_mappings.yaml`** - Canonical Discord-username -> QuakeWorld-name registry. Includes `team_tag` field. Cross-project authoritative lookup for match-stats tooling, demo-parsing, and chat-corpus normalization.

### `weapon-scripts/`

- **`README.md`** - 122 lines. Reference for ezQuake weapon-script patterns: quickfire vs manual firing, priority chains, `+alias`/`-alias` hybrids, generic vs weapon-specific fire keys. Cites ezquake.com docs and `src/cl_input.c`.
- **`examples/`** - fixture configs showing real-world patterns in use.

### `teamsays/`

- **`README.md`** - 445 lines. Reference for ezQuake teamsay-script patterns: `Cmd_If_Old` / `Cmd_If_New` grammar, runtime token families, tp_msg cvar family, common alias-chain shapes (report/coming/lost/need/point/kill-me). Cites `src/cmd.c`, `src/parser.h`, `packages/qw-config/src/data/ezquake-macros.json`, and slipgate's bundled fixture configs.

### `strategies/`

- **`map-report-quad.yaml`** + **`map_report.yaml`** - Claude-analysis output templates for per-map voice-analysis reports (inherited from the quad project).
- **`map-strategies-quad.yaml`** + **`map_strategies.yaml`** - Per-map tactical notes used as analysis context.

## Consumers today

| Consumer | What it reads |
|---|---|
| voice-analysis (whisper + Claude) | `terminology/qw_glossary.yaml`, `strategies/*.yaml`, `players/player_mappings.yaml` |
| slipgate player-state simulator | `maps/*.loc` |
| slipgate bind/teamsay parser dev | `weapon-scripts/README.md`, `teamsays/README.md` |
| qw-oracle | none (Layer 3 infrastructure pending; will consume concept-note content once it lands) |

## Lifecycle

- **Active (reference data):** `terminology/`, `maps/`, `players/` - maintained in place as consumers evolve.
- **Active (concept notes):** `weapon-scripts/`, `teamsays/` - updated when slipgate's parser development surfaces new patterns to document.
- **Legacy:** `strategies/` - inherited from quad during the monorepo consolidation. Not updated unless the user explicitly asks.

## Migration path

When qw-oracle Layer 3 infrastructure ships (storage schema, ingestion pipeline, MCP surface):

- `weapon-scripts/`, `teamsays/`, `strategies/` -> migrate to Layer 3 as concept notes.
- `terminology/`, `maps/`, `players/` -> stay here. Their consumers need structured lookup shapes, not prose notes.

This is a future move. Layer 3 does not exist yet; nothing migrates today.
