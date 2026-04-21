# qw-knowledge

Shared QuakeWorld domain knowledge consumed across apps in this monorepo. Two kinds of content live here: structured reference data (glossary, .loc files, player mappings) and prose concept notes (weapon-scripts, teamsays, strategies).

See `VISION.md` for the identity and relationship to qw-oracle Layer 3. See `OVERVIEW.md` for the living map of contents and consumers.

## Layout

```
packages/qw-knowledge/
├── CLAUDE.md              Rules for Claude when working in this package
├── VISION.md              Purpose and long-term relationship to oracle Layer 3
├── OVERVIEW.md            Living map: contents, consumers, lifecycle
├── README.md              This file
├── terminology/           qw_glossary.yaml - 353-line voice-first vocabulary
├── maps/                  *.loc files (dm2, dm3, e1m2, phantombase, schloss)
├── players/               player_mappings.yaml - canonical alias registry
├── weapon-scripts/        README + fixture examples for weapon-script patterns
├── teamsays/              README + fixture style guide for teamsay patterns
└── strategies/            Map-level tactical notes (quad-originated)
```

## Consumers

- **voice-analysis work** -> `terminology/qw_glossary.yaml` (whisper prompt), `players/player_mappings.yaml`, `strategies/*.yaml`
- **slipgate player-state simulator** -> `maps/*.loc`
- **slipgate bind/teamsay parser development** -> `weapon-scripts/`, `teamsays/`
- **qw-oracle** -> none yet; concept-note content migrates to Layer 3 when that ships

## Package ownership

Parked but active. No new additions planned until qw-oracle Layer 3 infrastructure exists; existing files are maintained in place as their consumers evolve.
