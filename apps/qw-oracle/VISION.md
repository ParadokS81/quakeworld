# Vision - QW Oracle

## The problem

QuakeWorld has 30 years of accumulated knowledge -- how to configure clients, how to run servers, how to play effectively, how the game engine works under the hood. But that knowledge is scattered: some of it lives in source code comments, some in Discord help channels, some in the heads of a handful of experts (ciscon, Spoike, meag), some in IRC logs from a decade ago that nobody reads, some on wiki pages that may or may not still be online.

When a player has a question -- "how do I fix this rendering artifact?" or "what does this cvar actually do?" or "how did teams handle quad timing in the 2008 era?" -- the answer usually exists somewhere. But finding it means knowing which person to ask, which channel to search, or which source code repo to grep. Most people don't know where to look, so they either ask in Discord and wait for someone knowledgeable to be online, or they give up.

## What this aims to be

A comprehensive QuakeWorld knowledge engine. Not a single product, but a foundation that powers multiple interfaces:

- **Discord bot** -- the most obvious outlet. Players ask questions in their team's Discord server and get informed answers. The community already lives on Discord, so this is where the knowledge base has the most immediate reach. Quad (the existing Discord bot) is the natural front-end.
- **Web chatbot** -- when slipgate web launches as a community website, a chat interface there can tap the same engine.
- **Desktop app helper** -- the slipgate desktop app could embed a knowledge assistant for context-sensitive help (e.g., "what does this cvar do?" while browsing your config).

Same knowledge engine, different outlets. The engine is the hard part; the interfaces are relatively straightforward once the foundation exists.

## Foundation first

The outlets above are the eventual surface. Today the work is **Layer 1**: extracting every useful fact from the engine source (cvars, commands, macros, HUD elements, asset consumption, flag bits, etc.), then backfilling that across the engine's release history so every fact carries a version range. Two consequences fall out of this that are not obvious until you build it:

- **Other apps in the monorepo consume Layer 1 directly, right now.** Slipgate already reads the ezQuake asset bundle to classify files on disk. Every Layer 1 addition (new entity type, new relation table, new seed) becomes a coupling point with a consumer. Consumer-facing coupling is handled as it surfaces, not speculatively.
- **Version-awareness falls out of the extractor, not out of the Q&A layer.** Once each fact carries `first_seen_version` / `last_seen_version` from the AST extraction walk across tags, every future outlet inherits temporal relevance for free -- no separate system.

The Q&A interfaces are a concern for when the foundation is complete. Right now: finish Layer 1 extraction, keep existing consumers unblocked as coverage expands.

## The data

The raw material is unusually rich for a niche community:

- **2.66 million chat messages** already imported into SQLite -- 1.94M from QuakeNet IRC (2005-2016) and 717K from the Quake.World Discord (2016-present). This is where the tribal knowledge lives: debugging sessions, config discussions, gameplay debates, community history.
- **Source code repos** -- ezQuake, MVDSV, KTX, FTE, QWCL. The authoritative ground truth for how things actually work.
- **100,000+ match records** from the qw-stats database. Tournament results, player statistics, team histories spanning years.
- **QW Hub match data** -- modern match history with full stats, accessible via API.
- **Community documentation** -- ezQuake docs, KTX docs, wiki pages, guide articles.

Future sources could include forum databases from historical QW community sites, news articles, match reports, and demo analysis data.

## Design intent

- **Citations over assertions.** "ciscon explained this on 2020-10-19" is more trustworthy than "the AI says." Every answer should cite its sources so users can verify and learn where knowledge lives.
- **Weighted trust.** Not all community voices carry equal expertise on all topics. Answers from known experts (engine developers, long-time server admins, competitive veterans) should be weighted higher in relevant domains.
- **Self-correcting.** Trusted community members can flag bad answers. Corrections feed back into the system so the same mistake does not repeat.
- **Community memory, not replacement.** The goal is to make existing knowledge accessible, not to replace the community's experts. When the system cannot help, it should know where to direct the user -- which person, channel, or resource is most likely to have the answer.

## Three paths

### Path 1: Oracle Bot (started)

AI-powered Q&A that searches community knowledge + documentation to answer questions. The search layer (FTS5 across 123K conversation sessions) works. Needs the context builder and LLM layer to produce real answers.

Early benchmarking suggests roughly a third of questions are directly answerable from docs, another quarter from community tribal knowledge (past debugging sessions), and the rest need interactive human help -- but the system can still triage and point people in the right direction.

### Path 2: Digest / Newsletter (future)

"What happened while I was away?" -- AI-generated summaries of Discord activity. Solves the Discord overwhelm problem: 8+ servers, too many channels, nobody reads them all. Daily or weekly digests, topic tracking, community highlights.

### Path 3: Time Machine (future)

Explore 20 years of community history. Drama, milestones, eras, forgotten gems. "What was the community arguing about in March 2008?" -- a way for the community to rediscover its own past.

## Current reality

Layer 1 extraction for ezQuake is active and shipping. The schema is stable at v6; head is fully loaded; historical backfill across the ~15 tags is the next major push. FTE, MVDSV, and KTX ports come after. Layer 2 (the 2.66M-message chat corpus) is imported and searchable but its processing pipeline has not been the focus recently. Layer 3 (curated pattern notes adapted from community docs) is planned but not populated.

See `OVERVIEW.md` for the living lifecycle status.
