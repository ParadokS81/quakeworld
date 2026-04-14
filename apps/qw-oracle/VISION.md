# Vision - QW Oracle

## The problem

QuakeWorld has 30 years of accumulated knowledge -- how to configure clients, how to run servers, how to play effectively, how the game engine works under the hood. But that knowledge is scattered: some of it lives in source code comments, some in Discord help channels, some in the heads of a handful of experts (ciscon, Spoike, meag), some in IRC logs from a decade ago that nobody reads, some on wiki pages that may or may not still be online.

When a player has a question -- "how do I fix this rendering artifact?" or "what does this cvar actually do?" or "how did teams handle quad timing in the 2008 era?" -- the answer usually exists somewhere. But finding it means knowing which person to ask, which channel to search, or which source code repo to grep. Most people don't know where to look, so they either ask in Discord and wait for someone knowledgeable to be online, or they give up.

## The three-layer model

The knowledge engine has three layers, each with different truth properties and storage:

- **Layer 1 - Extracted facts.** Deterministic ground truth from source code. Cvars, commands, macros, match records. SQLite tables with canonical IDs (`ezquake:cvar:cl_bob`, `ktx:cmd:rpickup`).
- **Layer 2 - Interpreted claims.** LLM-summarised community chat, preserving who said what when. "In October 2020, ciscon explained rpickup by saying X." SQLite + FTS5.
- **Layer 3 - Curated concepts.** Hand-written markdown notes that cross-link Layers 1 and 2. Human expertise, LLM-multiplied across every client that queries the service.

A serve layer (MCP) exposes tools over all three, so any LLM client (Claude Code, the Quad Discord bot, a web chatbot, a local Ollama on donated hardware) can consume the same knowledge foundation. See `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md` for the architecture and `CLAUDE.md` for the implementation shape.

## What this aims to be

A comprehensive QuakeWorld knowledge engine. Not a single product, but a foundation that powers multiple interfaces:

- **Discord bot** -- the most obvious outlet. Players ask questions in their team's Discord server and get informed answers. The community already lives on Discord, so this is where the knowledge base has the most immediate reach. Quad (the existing Discord bot) is the natural front-end.
- **Web chatbot** -- when slipgate web launches as a community website, a chat interface there can tap the same engine.
- **Desktop app helper** -- the slipgate desktop app could embed a knowledge assistant for context-sensitive help (e.g., "what does this cvar do?" while browsing your config).

Same knowledge engine, different outlets. The engine is the hard part; the interfaces are relatively straightforward once the foundation exists.

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

This project is paused. The data foundation is solid (2.66M messages imported, search layer functional), but building the full knowledge engine requires sustained effort that competes with the other active projects in the monorepo. The vision is clear and the raw material is there; it is a matter of time and hands.

The important thing is that the vision does not get lost. When the time comes to pick this up -- whether after slipgate web launches, or when the demo parser unlocks new analysis possibilities, or when a motivated contributor appears -- the foundation and the direction are documented here.
