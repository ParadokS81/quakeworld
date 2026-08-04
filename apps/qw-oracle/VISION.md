# Vision - QW Oracle

## The problem

QuakeWorld has 30 years of accumulated knowledge - how to configure clients, how to run servers, how to play effectively, how the game engine works under the hood. But that knowledge is scattered: some of it lives in source code comments, some in Discord help channels, some in the heads of a handful of experts (ciscon, Spoike, meag), some in IRC logs from a decade ago that nobody reads, some on wiki pages that may or may not still be online.

When a player has a question - "how do I fix this rendering artifact?" or "what does this cvar actually do?" or "how did teams handle quad timing in the 2008 era?" - the answer usually exists somewhere. But finding it means knowing which person to ask, which channel to search, or which source code repo to grep. Most people don't know where to look, so they either ask in Discord and wait for someone knowledgeable to be online, or they give up.

## What this is

QW Oracle is a **knowledge service**, not a chatbot. It is the data foundation and the serving surfaces around it. Products that answer questions in chat, surface context in the desktop app, or power community dashboards are **consumers** of this service, not the service itself.

The distinction matters. Mistaking the service for one of its outlets causes wrong inferences about what changes affect what. A redesign of the Discord-bot answer format should not touch the Layer 1 schema. A new cvar-extraction pass should not wait on the Discord bot's release cycle. Two different problems, two different layers.

**Mental model.** A chatbot answering a QW question is a librarian; oracle is the library. The LLM (the librarian) hears the user's question, walks the shelves, and assembles the answer. Oracle's job is to keep the library well-stocked with QW-specific content -- source-grounded facts, community testimony, curated explanations -- so the librarian has somewhere good to start. A well-stocked library is a headstart, not a fence: the librarian still owns synthesis, still chooses what to use, and is free to draw on its own training-data knowledge when the library doesn't cover a question. The better-stocked the library, the easier the librarian's job, the better the answer for the human asking.

## The service shape

Three data layers plus the machinery that fills and serves them.

### Layers 1-3: the knowledge foundation

- **Layer 1** - Postgres (`qw_oracle`). Two kinds of facts side by side. **Engine facts** (source-extracted from the QW engine ports -- cvars, commands, macros, cmdline params, rulesets, match events, info keys, log templates, protocol messages, QC builtins, cross-engine cvar aliases, plus the internal-classifier types keynames / HUD elements / token primitives / flag bits / asset categories -- 16 types in all) carry a version arc and per-field blame; this is the authoritative "how does the engine actually work" tier. **Game-content facts** (the `qw` namespace -- maps as of 2026-04-27, future game-content domains as they land) live in flat tables outside the version arc; they describe the game itself, not any particular engine release. See `OVERVIEW.md` Section  "Domain inventory" for the live coverage table.
- **Layer 2** - Postgres (`qw_oracle`). 728,863 Quake.World Discord messages (2016-04 -> 2026-05); raw messages plus 8,621 topic-coherent reconstructed threads, each `tsvector`-indexed and embedded (voyage-4-large). The thread is the retrieval unit. Discord-only -- the QuakeNet IRC corpus (2005-2016) was excluded from Arc 1 (`decisions.md` D9-revised; may be revisited in Arc 3). This is the tribal-knowledge tier: debugging sessions, config discussions, gameplay debates, community history.
- **Layer 3** - hand-authored concept notes. Bootstrapped 2026-04-22 with two prototype notes. Intended to hold curated patterns, idioms, and explanations that synthesize Layer 1 + Layer 2 into usable guidance (e.g., "the weapon-script pattern," "the teamsay grammar," "the asset-override model"), plus consumer-facing classifier metadata that Layer 1 alone cannot produce (ecosystem provenance, file-type visibility axes). See `curated/concept-notes/README.md` for the authoring template.

### Backstage: extraction and loading

The extractor fleet reads authoritative engine source and emits structured JSON. Python + libclang covers the six C codebases (ezQuake / FTE / QWCL / MVDSV / KTX / QWFWD); QTV is Go, so its extractor is a Go program walking `go/parser` + `go/ast`; the `qw` namespace uses pure-stdlib Python BSP binary parsing -- no compiler. The loader pipeline (`scripts/load-knowledge/`) ingests JSON into Layer 1, diffs consecutive engine versions to produce per-field change events, and enriches change events with GitHub PR context. The qw-config dissolution (Half 1 + Half 2, shipped 2026-04-25) relocated extractors into `apps/qw-oracle/scripts/extractors/` and replaced the legacy slipgate-via-`packages/qw-config/` path with a `build-snapshot` CLI that emits enriched per-project JSONs directly into slipgate's data dir.

### Serving surfaces: MCP and snapshot distribution

A consumer reaches the knowledge foundation via one of two paths:

- **MCP** - live queries. Server v0.7.0 with thirteen tools today: engine-entity surface (`lookup_entity`, `search_entities`), Layer 3 retrieval (`get_concept_note`), Layer 2 chat search (`search_solved_issues`), `qw`-namespace surfaces (`lookup_map`, `search_maps`, `lookup_gameplay_entity`, `search_gameplay_entities`, `lookup_mechanic`, `search_mechanics`), Layer 3 hybrid search (`search_concepts`), honest-failure exit (`redirect_to_human`), and the KTX game-mode composite (`describe_mode`). Interactive, session-shaped, best for clients that want to ask arbitrary questions. Used by Claude Code today; future chatbots.
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
- **slipgate-app** - consumes per-project snapshot JSONs at `apps/slipgate-app/src/lib/config/data/` produced by oracle's `build-snapshot` CLI (qw-config dissolution Half 2, 2026-04-25). Today serves ezQuake (variables / commands / macros / cmdline params / asset bundle), FTE (variables + asset bundle), QWCL variables, KTX commands, and the `qw` namespace (maps + gameplay). MVDSV, QTV and QWFWD have no snapshot yet.
- **quad chatbot mode** (future) - quad is a voice-recording Discord bot today. A chat-over-oracle mode is a future capability on top of MCP.
- **New chatbot app** (future) - possibly separate from quad. Same MCP surface.
- **slipgate web help surfaces** (future) - the web-services-family direction (assets.quake.world, maps.quake.world cross-linked to the existing hub.quake.world) will consume oracle snapshots for anything that maps to knowledge-layer facts.

Digest / newsletter ("what happened while I was away") and time-machine ("what was the community arguing about in March 2008") products remain interesting but explicitly belong to the consumer tier - they are application features on top of Layer 2, not a separate architecture. When one of them becomes real work, it gets its own product doc and joins the consumer list above.

## Current reality

Layer 1 covers seven engine projects plus the `qw` game-content namespace. 11,081 entities in total:
- **ezQuake** -- 10 entity types + 4 asset relation tables; 4,192 entities across 18 versions (v3.0 -> 3.6.9 + head; pre-3.0 era de-scoped on community-security framing).
- **FTE** -- 6 entity types including cross-engine cvar aliases; build-6698 (engine + `plugin:ezhud` source root; mirrored as a `head` partition on the same commit) plus full asset bundle (28 categories + 61 extensions + 13 path rules + 25 cvar bindings + 717 loader sites). 3,279 entities total.
- **QWCL** -- 3 entity types (cvar / command / cmdline_param); single canonical version 2.33 (1996-vintage `cvar_t` shape carved out of the post-v17 `flags_raw` contract), carried as a `2.33` + `head` dual partition on one commit. 380 entities.
- **MVDSV** -- server-side; 7 entity types including the four MVDSV-introduced ones (protocol_message / info_key / log_template / qc_builtin); head snapshot at commit `18d0362180` (2026-04-07); 1,236 entities. No client snapshot (slipgate is the client).
- **KTX** -- 5 entity types (cvar / command / info_key / log_template / match_event); 1,892 entities at a `head`-only snapshot. Engine cvar/command extraction shipped via libclang (the tree-sitter framing was retired at the KTX-onboarding arc's Phase 0). KTX also owns the largest gameplay-content surface under gameplay_source 'ktx': 461 `gameplay_mechanics` rows across 11 kinds (317 mode_default settings, 27 game modes, 31 drop items, 27 death rules, 21 teamplay messages, 15 loc macros, 12 constants, 5 election types, 3 score systems, 2 env hazards, 1 powerup behavior) + 24 `gameplay_entity_defs` (15 monsters, 4 projectiles, 3 weapons, 2 items), served via search_mechanics / describe_mode / search_gameplay_entities.
- **QTV** -- the Go stream proxy; 2 entity types (cvar 40 / command 12); version 1.16-dev; 52 entities.
- **QWFWD** -- the C UDP forwarder/proxy; 4 entity types (cvar 13 / command 29 / cmdline_param 2 / info_key 6); version 1.40-dev; 50 entities.
- **`qw`** -- the game itself, outside the version arc. 254 maps + id1 baseline game content: 52 `gameplay_entity_defs` (25 items, 15 monsters, 8 weapons, 4 projectiles) + 53 `gameplay_mechanics` rows across 8 kinds (12 player stats, 9 constants, 9 death rules, 7 env hazards, 7 spawn rules, 4 dm-mode rules, 3 powerup behaviors, 2 armor models). Future game-content domains land here.

See `OVERVIEW.md` Section  "Domain inventory" for the live coverage table.

Layer 2 (the 728,863-message Discord corpus) is imported, thread-reconstructed and searchable; the remaining processing work -- FAQ-substrate enrichment and threshold recalibration on the full backfill -- has not been the current focus. Layer 3 has 46 concept rows loaded (29 KTX game-mode references + 12 domain guides + 2 security-policy + 2 classifier-metadata + 1 asset-lifecycle) backed by 45 authored note files plus stewardship playbook -- the 46th, `dryrun-fps-display`, is an empty-summary dry-run leftover with no backing file. Broader population is ongoing as consumer questions surface material Layer 1 alone cannot answer.

The MCP surface is live (local server, Claude Code consumer). Snapshot distribution is also live: slipgate-app reads per-project JSON snapshots at `apps/slipgate-app/src/lib/config/data/` produced by Oracle's `build-snapshot` CLI (qw-config dissolution Half 2 closed this loop 2026-04-25).

See `OVERVIEW.md` for the living lifecycle status and the code map.
