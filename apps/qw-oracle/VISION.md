# Vision - QW Oracle

## The problem

QuakeWorld has 30 years of accumulated knowledge - how to configure clients, how to run servers, how to play effectively, how the game engine works under the hood. But that knowledge is scattered: some of it lives in source code comments, some in Discord help channels, some in the heads of a handful of experts (ciscon, Spoike, meag), some in IRC logs from a decade ago that nobody reads, some on wiki pages that may or may not still be online.

When a player has a question - "how do I fix this rendering artifact?" or "what does this cvar actually do?" or "how did teams handle quad timing in the 2008 era?" - the answer usually exists somewhere. But finding it means knowing which person to ask, which channel to search, or which source code repo to grep. Most people don't know where to look, so they either ask in Discord and wait for someone knowledgeable to be online, or they give up.

## What this is

QW Oracle is a **knowledge service**, not a chatbot. It is the data foundation and the serving surfaces around it. Products that answer questions in chat, surface context in the desktop app, or power community dashboards are **consumers** of this service, not the service itself.

The distinction matters. Mistaking the service for one of its outlets causes wrong inferences about what changes affect what. A redesign of the Discord-bot answer format should not touch the Layer 1 schema. A new cvar-extraction pass should not wait on the Discord bot's release cycle. Two different problems, two different layers.

## The service shape

Three data layers plus the machinery that fills and serves them.

### Layers 1-3: the knowledge foundation

- **Layer 1** - `data/knowledge.db`. Source-extracted engine facts. cvars, commands, macros, cmdline params, keynames, HUD elements, rulesets, token primitives, asset consumption, flag bits. Every fact carries a version range and per-field blame. This is the authoritative "how does the engine actually work" tier.
- **Layer 2** - `data/qw.db`. 2.66M community chat messages from QuakeNet IRC (2005-2016, 1.94M) and Quake.World Discord (2016-present, 717K). Raw + FTS5 search index. This is the tribal-knowledge tier: debugging sessions, config discussions, gameplay debates, community history.
- **Layer 3** - hand-authored concept notes. Not yet populated. Intended to hold curated patterns, idioms, and explanations that synthesize Layer 1 + Layer 2 into usable guidance (e.g., "the weapon-script pattern," "the teamsay grammar," "the asset-override model").

### Backstage: extraction and loading

The extractor fleet (Python + libclang for ezQuake today; AST for FTE / MVDSV / KTX as those ports land) reads authoritative engine source and emits structured JSON. The loader pipeline (`scripts/load-knowledge/`) ingests that JSON into Layer 1, diffs consecutive versions to produce per-field change events, and enriches change events with GitHub PR context.

This machinery is oracle's responsibility even though the extractor scripts currently live in `packages/qw-config/scripts/` for historical reasons (slipgate-app originally scraped ezQuake there; the AST extractors grew in the same folder). When oracle's extraction pipeline is feature-complete, the scripts relocate into oracle's build. See root `VISION.md` § "The emerging ecosystem" for the broader context.

### Serving surfaces: MCP and snapshot distribution

A consumer reaches the knowledge foundation via one of two paths:

- **MCP** - live queries. Tools: `lookup_entity`, `search_entities`, `get_concept_note`, `search_solved_issues`. Interactive, session-shaped, best for clients that want to ask arbitrary questions. Used by Claude Code today; future chatbots.
- **Snapshot distribution** - consumer-tailored JSON snapshots pre-computed from the foundation. Deterministic, shipped with the consumer, no runtime dependency on the oracle. Best for clients that need the same facts repeatedly and want fast, predictable access. slipgate-app's ConfigViewer is the canonical case: it doesn't query MCP on every user action; it ships with a snapshot of the cvar / command / macro facts its features need.

Both surfaces serve the same underlying facts. A consumer picks the surface that fits its access pattern.

## Answer-shape philosophy (active assistance)

When the service responds to a question - whether through MCP to a live chatbot or through a snapshot baked into a consumer app - the response shape matters as much as the content. The philosophy is **active assistance**: the service constructs an answer from its foundation rather than just retrieving a blob.

Three elements hold across MCP answers and across consumer products built on top:

- **Cite over assert.** "ciscon explained this on 2020-10-19" is more trustworthy than "the AI says." Every answer traces back to Layer 1 code lines, Layer 2 message IDs, or Layer 3 concept notes. Consumers know where the answer came from.
- **Weight trust.** Not all community voices carry equal expertise on all topics. Answers from known experts (engine developers, long-time server admins, competitive veterans) weight higher in relevant domains. Weighting lives in the service, not re-implemented per consumer.
- **Know when to redirect.** When the service cannot help, it should know which person, channel, or resource is most likely to have the answer, and say so. Community memory augmenting community experts, not replacing them.

This shape is what keeps the service honest regardless of which consumer product asks. A Discord chatbot, a slipgate help panel, and a future web chat interface all get the same citation discipline and the same redirect behavior without re-implementing it three times.

## Consumers (present and planned)

The service is the hard part; the consumer products are each straightforward once the foundation exists.

- **Claude Code** (live) - every coding session in the monorepo consumes MCP. Primary consumer today.
- **slipgate-app** (transitional) - reads `packages/qw-config/src/data/*.json` directly today for its ConfigViewer. Migrates to oracle-snapshot consumption once the extraction pipeline is feature-complete.
- **quad chatbot mode** (future) - quad is a voice-recording Discord bot today. A chat-over-oracle mode is a future capability on top of MCP.
- **New chatbot app** (future) - possibly separate from quad. Same MCP surface.
- **slipgate web help surfaces** (future) - the web-services-family direction (assets.quake.world, maps.quake.world cross-linked to the existing hub.quake.world) will consume oracle snapshots for anything that maps to knowledge-layer facts.

Digest / newsletter ("what happened while I was away") and time-machine ("what was the community arguing about in March 2008") products remain interesting but explicitly belong to the consumer tier - they are application features on top of Layer 2, not a separate architecture. When one of them becomes real work, it gets its own product doc and joins the consumer list above.

## Current reality

Layer 1 extraction for ezQuake is active and shipping. The schema is stable at v6; head is fully loaded across 10 entity types (3899 entities total) plus 4 asset relation tables. Historical backfill across ezQuake's ~15 release tags is the next major push and is unblocked by the recent extraction-pipeline speedups. FTE, MVDSV, and KTX ports come after.

Layer 2 (the 2.66M-message chat corpus) is imported and searchable but its processing pipeline - tier classification, session segmentation, summarization - has not been the current focus. Layer 3 is planned but not populated.

The MCP surface is live (local server, Claude Code consumer). Snapshot distribution is a forward commitment; slipgate's current qw-config JSON consumption is the pre-snapshot state.

See `OVERVIEW.md` for the living lifecycle status and the code map.
