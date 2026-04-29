# qw-knowledge - Rules for Claude

Shared QW domain knowledge. Read `VISION.md` for identity, `OVERVIEW.md` for what's here, `README.md` for the elevator pitch.

**Start with `OVERVIEW.md` when working in this package — it's the load-bearing module map (what's here, what depends on what, what's stable vs in-flight).**

## Always-on rules

- **Do not add new content speculatively.** This package is parked pending qw-oracle Layer 3. New concept notes should wait for Layer 3; new reference data should have a named consumer before landing.
- **Content categories are distinct.** Structured reference data (yaml, .loc) is consumed programmatically and must keep its shape. Concept notes (README + fixtures) are prose + examples and follow a different authoring style. Do not mix the two inside one file.
- **The terminology glossary is voice-first.** `terminology/qw_glossary.yaml` is tuned for whisper-model transcription. Do not reshape it to serve prose contexts without checking with the user -- voice-analysis consumers depend on its current structure.
- **Player mappings are a canonical registry.** `players/player_mappings.yaml` is cross-project authoritative. Do not edit aliases without a direct user instruction; speculative additions have broken match-stats downstream before.
- **Strategies came from quad.** `strategies/*.yaml` files were inherited during monorepo consolidation. Treat them as legacy unless the user explicitly asks for updates.

## Things that do NOT belong here

- Engine-source facts (cvars, commands, macros, etc.) -> those live in qw-oracle Layer 1, populated by the `packages/qw-config/` extraction pipeline.
- Chat corpus messages -> qw-oracle Layer 2 (`apps/qw-oracle/data/qw.db`).
- Per-app configuration -> each app's own config.
- Code (parsers, extractors, tools) -> an app package, not here. This package is data + notes only.

## When working on content here

- Cite sources. `weapon-scripts/README.md` references ezquake.com docs and ezQuake source files; follow that pattern.
- When touching `.loc` files, verify format against what slipgate's simulator expects (`apps/slipgate-app/src/lib/simulator/` is the consumer).
- When touching `qw_glossary.yaml`, preserve the YAML shape -- whisper prompt assembly reads specific fields.

## Output discipline

Monorepo-wide rules apply (see root `CLAUDE.md`): ASCII only, no filler, comments explain why not what.
