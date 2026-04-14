---
Doc type: current — Design spec. Delete/archive once the POC lands and the dev-server presentation is delivered, or once it's superseded by a phase-2 spec incorporating expert feedback.
---

# QW Knowledge Service — Design Spec

**Date:** 2026-04-14
**Status:** Draft — pending user review, then dev-server expert review
**Scope:** Cross-project foundation. Repurposes and expands `apps/qw-oracle`. Becomes the data backbone for Slipgate helper panel, Quad Discord bot, future community outlets, and any LLM-assisted QW tooling.
**Purpose of this document:** Two audiences.
1. **ParadokS + Claude** — the design we will build the POC against.
2. **Dev-server domain experts** (systems engineers, database experts, QW codebase experts) — the pitch they will review and contribute feedback on. The POC exists to make the pitch tangible, not to ship a finished system.

---

## Problem

QuakeWorld has 30+ years of accumulated knowledge spread across fundamentally different kinds of sources:

- **Source code** for multiple clients and servers (ezQuake, FTE, MVDSV, KTX, QWCL). Authoritative but inaccessible without reading C.
- **2.66M chat messages** from IRC (2005-2016) and Discord (2016-present), already imported into SQLite in `apps/qw-oracle/data/qw.db`. Tribal knowledge lives here, but finding a specific answer means knowing who said what, when, in which channel.
- **Human expertise** in a handful of heads — ciscon, Spoike, meag, vikpe, infiniti, nano — reachable by asking in the right Discord channel and hoping someone is online.
- **Match history** — 100K+ tournament records accessible via QWHub API, with decades of competitive history.
- **Community docs** — ezQuake docs, KTX docs, wiki pages, aging forum archives, guide articles that may or may not still be online.

Today, answering a QW question means knowing which of these silos to query. Most people don't know, so they either ask in Discord and wait, or they give up.

For ParadokS specifically, building Slipgate has exposed a second pain: **every tool builder repeats the same extraction work**. Slipgate's config viewer required manually extracting ezQuake cvar metadata from C source. Now FTE support needs the same effort from scratch. The next developer who tries to build a QW tool will hit the same wall. This is waste — the extraction work should be done once and served to every consumer.

**The insight driving this spec:** AI-assisted tooling changes the economics. An LLM can be a "supercharged Carmack-librarian" that knows the whole domain and connects the dots across it — but only if the underlying data is ingested, structured, and served in a form an LLM can query. The hard problem is not the LLM. The hard problem is the knowledge foundation underneath it.

## Vision

**Build a QW knowledge service.** One foundation that ingests, processes, stores, and serves QuakeWorld knowledge across multiple domains, exposed through a protocol that any modern LLM client can consume.

Not one product — one foundation with many outlets:

- **Personal force multiplier** — ParadokS (and any other QW developer) plugs the service into Claude Code or their own agent and gets expert-level QW assistance while building tools. No more manual extraction. Ask a question, get a cited answer, continue coding.
- **Community Q&A** — Quad Discord bot answers player questions in-channel with citations. Feels like a domain expert; points users to humans when it can't help.
- **Slipgate helper panel** — context-sensitive help inside the Slipgate desktop app: explain this cvar, summarize this bind, walk me through teamsay macros.
- **Digest / newsletter** — auto-generated summaries of community activity, match results, upcoming events. For players who can't follow 8+ Discord servers but want to stay in the loop.
- **Ecosystem lever** — any QW developer can load the service into their own LLM and accelerate their tooling. QW tool-building gets faster across the community, not just for one person.

### Core principle: LLM-agnostic foundation

The knowledge service **serves data, not inference**. Which LLM consumes that data is an *outlet-level* decision, not a foundation-level one. The same MCP layer can be queried by many kinds of consumers simultaneously:

- A developer's Claude Code running locally (personal force multiplier — developer pays their own inference)
- A hosted Claude or OpenAI API behind a slipgate web chatbot (community Q&A outlet — rate-limited, registered users only, funded by whoever runs slipgate web)
- A self-hosted Ollama instance on donated community hardware (zero-inference-cost hosted outlet)
- A Discord bot (Quad) calling whichever API is cheapest at the time
- Any future QW developer's agent of choice (ecosystem lever)

All of these can coexist. The foundation doesn't care.

Why this flexibility matters:

- **MCP reduces LLM burden, which makes hosted outlets economically viable.** A "cold" LLM asked a broad QW question has to guess, hallucinate, or web-search — expensive, slow, and unreliable. With the MCP in front, the LLM receives structured data and pre-fetched citations, and its job shrinks to *synthesize and format*. Per-query cost drops dramatically. This is what turns a hosted chatbot from "burns money answering random questions" into "viable with modest rate limits." Self-hosted Ollama on community hardware is the cheapest case — effectively free inference.
- **Economics that scale with the community.** Developers using their own LLM cost the project nothing. A rate-limited hosted outlet (e.g., registered slipgate web users, X questions per day) is cheap because of the MCP retrieval layer. Self-hosted is free after hardware. Three cost models, one foundation.
- **Leverage.** The hard work — extraction, curation, cross-domain linking — is done once and benefits every consumer forever, regardless of which LLM they use.
- **No vendor lock-in.** The protocol is open. Any outlet can switch LLMs (hosted API → self-hosted → different hosted provider → cheaper provider next year) without the foundation changing. As model prices fall or self-hosted gets better, outlet economics improve automatically.

The mechanism is **MCP — Model Context Protocol** — an open standard for LLM tool servers. An MCP server is a "plugin" any modern LLM client can load: it exposes tools like `lookup_entity`, `search_solved_issues`, `get_concept_note`. The LLM acts as the librarian; the MCP is the library. Whether that librarian runs on ParadokS's laptop, a community server, or a cloud API is an outlet choice, not a foundation choice.

---

## Core principles

**1. Polyglot persistence.** Different kinds of QW knowledge want different storage shapes. Do not force everything into one database. Let each live in its natural shape and join them at query time through the serve layer.

**2. Rigid vs soft is the key distinction.** Deterministic extraction (code → facts) and interpretive synthesis (conversations → claims) are fundamentally different engineering problems. Different pipelines, different trust models, different refresh cadences, different failure modes. Keep them separate.

**3. Curation is the glue.** Raw stores on their own are "three databases with a search box." A thin layer of hand-written concept notes that deliberately cross-link the raw layers is what turns the system into a librarian. Human expertise gets multiplied across every LLM that queries it.

**4. Citations over assertions.** Every answer traces back to a source: "ciscon explained this on 2020-10-19 in #dev-corner," "this cvar is defined at `cvar.c:142` in ezQuake `v4.0.1`," "concept note `ktx_matchstart_injection.md`." Users can verify and learn where knowledge lives.

**5. Ingestion is rerunnable.** Every pipeline is an idempotent job. Re-run when sources update, no manual steps. This is what keeps the knowledge base alive instead of rotting.

**6. Scope discipline is the biggest risk.** "Ingest everything" is unbounded. The POC proves the pattern end-to-end on a tiny slice. Only after the pattern works do we replicate.

**7. Canonical IDs early.** Every cvar, command, concept, and chat session has a stable canonical ID. Cross-domain joins depend on it. Cheap to design upfront, expensive to retrofit.

---

## The three-layer model

This is the central architectural decision. All knowledge in the service falls into one of three layers, each with a distinct nature and pipeline.

| Layer | Name | Nature | Source | Pipeline | Storage shape | Trust |
|---|---|---|---|---|---|---|
| **1** | **Extracted facts** | Deterministic ground truth | Source code, match APIs, structured files | Parser → normalize → SQL insert | SQL (SQLite) | High — source of truth |
| **2** | **Interpreted claims** | What the community said, distilled | Chat logs, forums, help channels | Filter → session group → LLM summarize → embed | SQLite + FTS5 + vector | Medium — provenance-tagged, weighted by author/recency |
| **3** | **Curated concepts** | Human-written cross-domain glue | ParadokS + LLM-assisted authoring | Hand-written markdown with canonical IDs | Markdown (Obsidian-compatible) | High — explicitly authored |

### Layer 1 — Extracted facts (rigid)

**What it is:** Deterministic facts extracted from authoritative sources — primarily client/server source code and structured APIs.

**Examples:**
- `ezquake:cvar:cl_bob` — name, type, default, min/max, source file, line number, description from source comments, introduced-in version
- `ezquake:cmd:say_team` — name, arg shape, description
- `ktx:cmd:k_matchlock` — name, arg shape, server version, set on client via stuffcmd
- `fte:cvar:cl_rollspeed` — FTE equivalent of ezQuake cl_rollspeed, with noted differences
- `qwhub:match:12345` — match metadata from QWHub API

**Pipeline (rigid):** Write an AST-based extractor per source codebase. Run it against each version of the source to produce a normalized row set. Insert into SQL tables. Re-run on source update. No interpretation, no LLM involvement.

**Storage:** SQLite. Relational. One table per entity type with foreign keys to sources.

**Why rigid:** Source code is unambiguous. `cvar_t cl_bob = {"cl_bob", "0.02"};` parses the same way every time. The extractor is boring, deterministic, and deeply valuable.

**Why it's reusable work:** ParadokS is already doing this manually for Slipgate. Doing it inside the knowledge service means the work benefits every consumer, not just Slipgate, and replicates cleanly to FTE, KTX, MVDSV without rewriting the interpretation logic.

### Layer 2 — Interpreted claims (soft)

**What it is:** Distilled knowledge from conversations — what did the community say, when, with what confidence, in what context.

**Examples:**
- A session where ciscon walked a new player through fixing a rendering artifact in 2020
- A debate about quad timing strategies in 2008
- A recurring pattern of complaints about a specific cvar behavior across multiple years

**Pipeline (soft):** Filter noise (joins, quits, single-word reactions, bot spam) → group messages into conversation sessions based on time gaps and conversational cues → run each session through an LLM summarization pass to produce structured output (topics, entities, sentiment, notable quotes, identified question/answer pairs) → store summaries in SQLite linked back to raw messages → index for FTS5 and (optionally) vector embeddings for semantic search.

**Storage:** SQLite + FTS5 + vector index. The existing `qw-oracle/data/qw.db` already holds the raw messages and an FTS5 layer across 123K sessions.

**Why soft:** The chat log itself is just text. *What it means* is interpretive. An LLM has to read it and extract claims. Those claims are tagged with provenance (who, when, where, how confident) so downstream consumers can reason about trust.

**Trust model:** Claims carry weights — author expertise in the relevant domain (ciscon on rendering, vikpe on web tooling, nano on servers), recency (old claims about current behavior are lower-trust), corroboration (does this claim agree with other sources). The first version just captures provenance; weighted trust is a phase-2 concern but must be designable on top of this schema.

### Layer 3 — Curated concepts (glue)

**What it is:** Hand-written markdown notes that explicitly cross-link Layer 1 and Layer 2 to explain *what's going on* at a higher level than any single row can. The Karpathy LLM-wiki pattern applied to QW.

**Examples:**
- `concept:ktx_matchstart_injection.md` — "When you connect to a KTX server, it injects server commands into your client via stuffcmd. This means cvars like `k_*` look like they belong to ezQuake but are actually set and owned by KTX. See `ezquake:cvar:k_*`, `ktx:cmd:stuffcmd`, and this debugging session: `session:2020-10-19-helpdesk-ciscon-001`."
- `concept:quad_timing.md` — "Quad timing is a team coordination skill that has evolved across eras. See match examples, classic debates, recommended commands."
- `concept:weapon_rebind_hybrid.md` — "Old-school QW players combine weapon rebinding with firing logic..." with links to cvars, chat discussions, and a real config example.

**Pipeline (hand-written with LLM assist):** ParadokS writes each note. LLM helps draft, suggest links, check for inconsistencies. Notes follow a fixed frontmatter schema with canonical IDs for all references.

**Storage:** Plain markdown files in a directory tree. Obsidian-compatible (so ParadokS can browse them with his visual-first tools if he wants). One concept per file. Versioned in git.

**Why glue:** Layer 1 is facts, Layer 2 is conversations. Neither layer can say *"by the way, this ezQuake cvar is actually owned by KTX — they look like one thing but are really two."* That's human synthesis. A handful of well-written concept notes transforms the system from "three databases with a search box" into a Carmack-librarian experience. Ten notes is enough to demonstrate the value. A hundred is enough to change the whole tool-building culture in the community.

**Ongoing cost:** This is the layer that needs sustained human effort. Budget for it or accept that the glue layer stays thin. The good news: it can start tiny and grow incrementally, and each note is independently valuable.

---

## Architecture

```
[Sources]             [Ingest pipelines]        [Stores]                  [Serve layer]           [Consumers]
-------------         -------------------       ----------------------    --------------------    --------------------
ezQuake repo    -->   AST extractor       -->   SQL (L1: cvars/cmds)      MCP server               Claude Code (CLI/IDE)
KTX repo        -->   AST extractor       -->   SQL (L1: ktx cmds)         |- lookup_entity         ChatGPT + MCP
FTE repo        -->   AST extractor       -->   SQL (L1: fte cvars)        |- search_solved_issues  Slipgate helper panel
MVDSV repo      -->   AST extractor       -->   SQL (L1: server cvars)     |- get_concept_note      Quad Discord bot
Discord + IRC   -->   session grouper     -->   SQLite + FTS5 + vec (L2)   |- explain_bind (future) Web chatbot (future)
  logs              + LLM summarizer                                       |- get_citation (future) Any QW dev's agent
QWHub API       -->   fetch + normalize   -->   SQL (L1: matches)          |- list_sources (future)
Forum archives  -->   parser              -->   SQL + FTS5 (L2)
Curated wiki    -->   (hand-written)      -->   Markdown vault (L3)
```

**Ingestion** — idempotent, rerunnable jobs. Each pipeline logs what it has processed (pattern already in `qw-oracle`'s `import_log` table) and only works on new or changed sources.

**Stores** — polyglot. L1 uses SQL because facts are relational. L2 uses SQLite + FTS5 + vector because conversations need full-text and semantic search. L3 uses markdown because curation is authoring, not data entry. **They share canonical IDs so cross-layer joins work at query time.**

**Serve layer** — a single MCP server is the only thing consumers talk to. It hides the polyglot mess underneath. Each MCP tool may query one or more stores internally and return a unified, citation-tagged response. Adding a new store means adding new tools; existing consumers don't break.

**Consumers** — anything that speaks MCP. On day one this is Claude Code running against a local MCP server. Later it's Quad, the Slipgate helper panel, a web chatbot, or any other QW developer's agent.

---

## Canonical ID scheme

Every entity in the system has a stable canonical ID of the form:

```
<project>:<type>:<name>[@<version>]
```

**Examples:**
- `ezquake:cvar:cl_bob` — latest known definition
- `ezquake:cvar:cl_bob@v4.0.1` — version-pinned, for when behavior changed across versions
- `ktx:cmd:k_matchlock` — KTX command
- `fte:cvar:cl_rollspeed` — FTE cvar
- `mvdsv:cmd:say_team` — server-side command
- `qwhub:match:12345` — match record
- `session:2020-10-19-helpdesk-ciscon-001` — a chat session (Layer 2)
- `concept:ktx_matchstart_injection` — a curated note (Layer 3)
- `author:ciscon` — a community member identity (needed for trust weighting; identity unification is a known hard problem across IRC ↔ Discord ↔ in-game names)

**Why this shape:** Human-readable, stable, parseable, unambiguous across projects. The `@version` suffix is optional — the un-suffixed form means "current / most recent" and is what most queries use.

**Cross-references:** Layer 2 session records and Layer 3 concept notes reference Layer 1 IDs in their metadata. Layer 3 notes can reference Layer 2 session IDs. Layer 1 rows do not reference Layer 2 or Layer 3 (keeps the rigid layer clean).

**Open question for experts (flagged in the Open Questions section below):** is this naming scheme sufficient, or do we need a proper URI / IRI scheme with namespacing? First-pass answer: the string form is fine until a concrete need forces something heavier. Ship the simple thing.

---

## The POC — scope, ruthlessly bounded

The POC exists for **one purpose**: to make the pitch tangible. A 30-second live demo where ParadokS asks Claude Code a question, Claude queries the MCP, and the MCP fetches from all three layers and returns a cited answer. That demo is worth more than any architecture diagram.

### Hard scope limits

**In scope:**

- **Layer 1:** ezQuake cvar + command extractor → one SQL schema with populated data. Small KTX companion extractor (or even a hand-curated ~20-row KTX command table if the extractor is too much for the POC) to demonstrate cross-project linking.
- **Layer 2:** one narrow chat slice — e.g., 50-100 helpdesk or `#ezquake` sessions about cvars. Run the existing qw-oracle session data through a basic LLM summarization pass. Store the summaries with provenance.
- **Layer 3:** 3-5 hand-written concept notes. **At least one** must deliberately cross-link an ezQuake cvar to its KTX counterpart to a chat discussion. This is the money shot of the demo.
- **Serve layer:** A minimal MCP server with 3 tools:
  - `lookup_entity(name, project?, type?)` — unified lookup across Layer 1 cvars AND commands. Returns rows with a `type: 'cvar' | 'command'` discriminator plus any linked Layer 2 sessions and Layer 3 notes. One tool serving both entity kinds keeps the POC at three tools total while supporting demo queries about either a cvar (`cl_bob`) or a KTX-injected command (`rpickup`).
  - `search_solved_issues(query)` — queries Layer 2 FTS and returns matching sessions with provenance.
  - `get_concept_note(id)` — returns a Layer 3 note with all its resolved cross-references.
- **Tool response shape principle:** Every tool response carries explicit emptiness and confidence signals so consumer-side outlets can implement their own fallback policy. Example shape: `{"results": [...], "match_quality": "strong" | "weak" | "none", "suggested_fallback": "ask in #ezquake" | null}`. This lets a strict outlet say "MCP returned nothing, stop here and tell the user" while a permissive outlet says "MCP was weak, let me combine it with general knowledge" — without either needing to change the MCP. Policy lives at the outlet; the MCP just answers honestly.
- **First consumer:** Claude Code itself, running locally against the MCP server. The first validation is ParadokS feeling the difference in daily Slipgate development.

**Out of scope for the POC** (and that is okay):

- FTE extractor (replicate after POC validates)
- MVDSV and QWCL extractors
- QWHub match data ingestion
- Forum archive ingestion
- Newsletter / digest generation
- Hot-topic tracking
- Weighted trust model (just capture provenance; weighting is phase 2)
- Identity unification across IRC / Discord / in-game names
- Quad Discord bot integration
- Slipgate helper panel UI integration (the data is ready; the UI comes later)
- Web chatbot
- Correction / feedback loop for wrong answers
- Vector / semantic search (FTS5 is enough for the POC; add embeddings when search quality demands it)
- Pretty frontend of any kind
- Processing all 2.66M messages (that is a week of GPU time; the POC uses a hand-picked slice)

### Why this scope is enough

This exercises **all three layers** and the serve layer, with **real cross-layer joins** happening in a real demo. Every architectural claim in this document is validated by running the demo once. If the demo works, the pattern replicates. If the demo fumbles, the architectural assumption is wrong and we learn something specific.

### Rough effort estimate

Not a commitment, just a gut check that the POC is actually small:

- Layer 1 extractor (ezQuake cvars + commands): leveraging existing Slipgate work, ~1 session
- Layer 1 KTX companion: ~half a session for a hand-curated starter table, more for a real extractor
- Layer 2 slice processing: ~1 session to pick the slice, run the summarizer, store results
- Layer 3 concept notes: a few hours for 3-5 notes, assuming the cross-link one is the user's existing KTX-injection knowledge
- MCP server with 3 tools: ~1 session (TypeScript; reuses existing MCP SDK patterns)
- Demo script and rehearsal: ~half a session

Total: **1-2 weeks of intermittent work**, paced to whatever ParadokS has bandwidth for.

---

## Repurposing `apps/qw-oracle`

qw-oracle is the natural home. Its existing `VISION.md` already describes the broader picture (source repos, 100K+ match records, forum archives, community docs). The chat-log work is not being replaced — it is being reframed as Layer 2 of a bigger architecture.

### What changes

- **`apps/qw-oracle/CLAUDE.md`** — rewrite to reflect the three-layer model. The current content (chat import, pipeline plans, database schema, identity problem) becomes the "Layer 2" section.
- **`apps/qw-oracle/VISION.md`** — light edit. Promote the three-layer framing to the top. Most of the existing prose survives as the "what this aims to be" narrative.
- **New subdirectories (added as the POC lands):**
  - `layers/facts/` — Layer 1 extractors and SQL schemas
  - `layers/claims/` — Layer 2 session grouping and summarization (existing `scripts/import-*.mjs` moves here or stays and is reframed)
  - `layers/concepts/` — Layer 3 curated markdown notes
  - `serve/mcp/` — the MCP server
- **Existing artifacts stay put:**
  - `scripts/db.mjs`, `scripts/import-discord.mjs`, `scripts/import-irc.mjs`, `scripts/stats.mjs`
  - `data/qw.db` (the 1.1GB SQLite database with 2.66M messages + FTS5 index)
  - `docs/` (existing research on pipelines, local LLM, backfill)
  - `package.json` and Node toolchain

### What does not change

- **Project name.** "qw-oracle" reads well enough, the community will recognize it, and renaming for aesthetics is pure churn. The Oracle *is* the knowledge service; the Q&A bot was just the first imagined outlet.
- **Graduation path.** qw-oracle stays in the monorepo workshop. If and when parts of it graduate to Slipgate as the backing service for the helper panel, that narrative still fits.
- **Non-negotiable rules** from the current CLAUDE.md (raw data immutable, all processing regenerable from raw, tag outputs with model+prompt version, scripts over frameworks, SQLite over Postgres, local-first processing, source citation) — all apply to every layer, not just Layer 2.

---

## Presentation plan — the dev-server pitch

The design doc doubles as the pitch content. ParadokS does not write slides separately; he renders slides *from* this doc.

### Artifacts for the dev-server presentation

1. **This design doc.** Shared as the canonical reference. Experts read it at their own pace.
2. **Architecture diagram (Excalidraw).** Visual rendering of the Sources → Ingest → Stores → Serve → Consumers diagram in the Architecture section. Excalidraw is chosen because it is ParadokS-native (visual-first) and because the community will recognize the style. There are MCP servers for Excalidraw — we will verify this works end-to-end when we get to the presentation phase; if it doesn't, Excalidraw's web app is a 30-minute manual job. **(Verification deferred, not assumed.)**
3. **Live demo (or screencap if live is fragile).** Claude Code query → MCP tool calls across all three layers → cited answer. This is the part that shifts the conversation from "would this work?" to "how do we make this bigger?"
4. **Open questions section** (see below). Deliberately left unsolved so experts can contribute rather than just approve.
5. **Deferred roadmap** (see below). So nothing feels missing, but nothing has been over-committed to.

### How the pitch flows

Rough suggested flow for when ParadokS presents:

1. **The pain** — 30+ years of QW knowledge scattered, every tool builder repeats extraction work, new players wait in Discord for an expert to be online. (Problem section.)
2. **The insight** — AI changes the economics. A Carmack-librarian is possible now, but only if we feed it the right foundation. LLM-agnostic foundation + cheap structured-data serving = multiple outlets (personal, hosted with rate limits, self-hosted Ollama) all powered by the same foundation. Scalable for a tiny community. (Vision section.)
3. **The architecture** — three layers, polyglot, MCP serve, any LLM can be a consumer. Show the Excalidraw diagram. (Architecture + three-layer model.)
4. **The demo** — here, watch Claude answer a real QW question by querying my MCP. All three layers. Real citations. (POC.)
5. **What's next, and what we want from you** — here's the deferred roadmap, here are the open questions where expert input would change the design, here's how you can contribute. (Open questions + deferred roadmap.)

The ask at the end is input, not approval. Experts love being consulted; they disengage when they feel pitched.

---

## Deferred roadmap (what's NOT in the POC)

Captured here so nothing is forgotten and nothing is built prematurely. Ordered roughly by natural next steps after POC validation.

**Layer 1 expansion:**
- FTE cvar + command extractor
- MVDSV extractor (server-side cvars and commands)
- KTX full extractor (replace the hand-curated POC starter table)
- QWFWD extractor
- QWHub match data ingestion
- Cross-project reference linking (e.g. ezQuake cvar that shadows a KTX-injected command)
- Version-aware schema (multiple versions of the same entity coexist)

**Layer 2 expansion:**
- Process all 2.66M messages (not just the POC slice)
- Forum archive ingestion (historical community sites)
- Wiki and documentation article ingestion
- Weighted trust model — author expertise by domain, recency decay, corroboration boosts
- Vector / semantic search in addition to FTS5
- Identity unification across IRC nicks ↔ Discord usernames ↔ in-game names (this is its own hard problem, other QW community projects are working on it)
- Correction / feedback loop so trusted community members can flag bad answers
- **Scaling: entity-mentions junction table.** Replace the POC's `LIKE '%"id"%'` pattern in `lookup_entity` (which scans `kb_sessions.mentioned_cvar_ids_json` / `mentioned_cmd_ids_json` as JSON-in-text) with a proper junction table `kb_entity_mentions(session_id, entity_id, PRIMARY KEY(entity_id, session_id))` indexed on `entity_id`. At 10K+ summarized sessions the LIKE scan becomes a hot path; the junction turns it into an O(log n) index lookup. Populated by the Layer 2 summarizer at summarize-time from the same resolved-canonical-IDs the POC already computes.

**Layer 3 expansion:**
- Grow concept notes from 3-5 to a hundred and beyond
- LLM-assisted drafting workflow for new notes
- Consistency checks across notes (do two notes contradict each other?)
- Notes that reference other notes (concept graph)
- **Proper curated QW glossary.** The POC reuses `packages/qw-knowledge/terminology/qw_glossary.yaml`, which was originally built for voice-replay analysis and is voice-first — rich on spoken callouts, spoken weapon aliases, map-specific slang. It works well enough for Layer 2 chat-log summarization because the core weapon/powerup/armor vocabulary overlaps, but the timing-pattern and communication-meta sections are less directly useful for text summarization and add tokens. Post-POC, produce a properly curated glossary with clear schema (canonical term + alternates + context + citation), split by usage (voice vs chat vs config), and cross-referenced to Layer 1 canonical IDs where applicable. Likely lives as a structured dataset in `packages/qw-knowledge/` with its own schema doc.

**Serve layer expansion:**
- More MCP tools: `get_match_report`, `list_community_topics`, `get_bind_explanation`, `who_should_i_ask`
- Digest / newsletter generation tool
- Hot-topic tracker tool (for the "what is the community talking about this week" use case)

**Outlets:**
- Slipgate helper panel (the UI side that consumes the MCP from inside the desktop app; uses the user's own LLM or the app's configured default)
- Quad Discord bot integration (MCP-backed replies with citations; LLM of choice, can switch over time)
- Web chatbot on slipgate web — registered users only, per-user daily rate limit, LLM pluggable (hosted Claude/OpenAI for quality, or self-hosted Ollama for cost). The same outlet can change LLMs over time as pricing and self-hosted capability evolves.
- Self-hosted Ollama deployment on donated community hardware — zero-inference-cost variant of the web chatbot; same MCP foundation, cheaper model, slightly lower answer quality
- Auto-generated newsletters for community members who can't follow 8+ Discord servers (runs on batch schedule, any LLM)

**Operational:**
- Continuous ingestion (watch source repos, re-run extractors on commits)
- Public hosting of the MCP server (if anyone wants to consume it without running it locally)
- Monitoring and quality metrics (how often do answers cite nothing, how often do users say an answer was wrong)

---

## Open questions for the dev-server experts

Deliberately unsolved. These are where expert input would most change the design, and where ParadokS is explicitly inviting contribution rather than presenting a finished answer.

**1. Canonical ID scheme — is `project:type:name[@version]` enough?**
First-pass answer is yes. But identity unification across IRC ↔ Discord ↔ in-game names is known-hard, and version-aware schemas get complicated when the same cvar changes meaning across releases. Database experts may have opinions on URI schemes, namespacing, or whether we should use something heavier from day one.

**2. Layer 1 extractor strategy — AST vs regex vs documentation scraping?**
The pragmatic answer today is "whatever works fastest for ezQuake's specific C patterns," but a systems engineer may have a more durable approach (tree-sitter, proper compiler front-ends, clang tooling). The question is: what investment in extractor infrastructure pays off across 4-5 different client and server codebases?

**3. Layer 2 summarization — which LLM, which prompt, which granularity?**
Ollama + Llama 3.1 on a 4090 is the existing plan. But what session granularity is right? Per-message? Per-conversation? Per-day? What do we lose or gain by using a bigger model for an initial pass and a smaller one for bulk? Local LLM experts may have strong opinions.

**4. Trust weighting — how do we design the schema so weighted trust can be added later without reshaping everything?**
The POC just captures provenance. But experts who have built recommendation or trust systems may want the schema to make room for author weights, domain-specific expertise, recency decay, and corroboration from day one, even if the weights are all 1.0 at launch.

**5. Ingestion reliability — how do we prevent the knowledge base from rotting?**
Idempotent rerunnable jobs is the principle, but in practice this means watching source repos, handling schema migrations when extractors change, detecting stale data, and having a story for "something upstream changed and now my extractor is broken." Systems engineers likely have patterns.

**6. Storage future-proofing — SQLite forever, or do we plan for Postgres / DuckDB / something else?**
The current answer is "SQLite until it hurts." But match data, ingestion logs, and embeddings all have shapes that might eventually outgrow SQLite. Database experts may have strong opinions on when to cross the bridge and how to avoid painful migrations.

**7. Community contribution workflow — how do experts contribute to Layer 3 (curated notes)?**
Git PRs are the obvious answer but have a high barrier for non-developers in the community. Is there a low-friction path for domain experts who want to contribute a note about how quad timing worked in the 2008 era?

**8. Licensing and sourcing — what are the constraints on ingesting Discord logs, IRC logs, forum archives, and third-party docs?**
Legal-ish question. The Discord data is already imported under informal community consent. Wider distribution or public hosting may need clearer rules.

---

## Risks and non-goals

**Risks:**

- **Scope creep is the biggest one.** "Ingest everything" is how this stalls. Mitigation: the POC is ruthlessly bounded, and the deferred roadmap captures-without-committing.
- **Curation fatigue.** Layer 3 requires sustained authoring by ParadokS. If that stops, the glue layer thins out. Mitigation: start tiny, make each note independently valuable, accept a thin Layer 3 as still useful.
- **Extractor maintenance.** Every source codebase that gets an extractor is a thing that can break when the upstream changes. Mitigation: idempotent rerunnable jobs, automated detection of extractor failures, deferred until the POC proves value.
- **Trust / citation quality.** If the system cites an answer that is actually wrong, users lose trust faster than no-answer would. Mitigation: citations always point to raw sources users can verify, explicit "I don't know" responses are preferred over confabulation, correction loop is on the deferred roadmap.
- **Expert disengagement.** If the pitch fails to land, the feedback loop from the dev server stalls. Mitigation: the demo is the persuasion, not the slides. And the pitch ask is "help me design this" not "please approve this."

**Non-goals:**

- **Replacing the community's human experts.** The goal is to make existing knowledge accessible, not to replace ciscon or Spoike or vikpe. When the system cannot help, it should know where to direct the user.
- **Making a hosted chatbot the center of the vision.** Hosted outlets (Quad Discord bot, slipgate web chatbot with rate-limited registered users, self-hosted Ollama on donated hardware) are legitimate and on the deferred roadmap — *not* ruled out, and economically viable precisely because the MCP layer reduces per-query inference burden. The principle is that the foundation does not *depend* on a hosted outlet existing. Any developer can plug in their own LLM and get value on day one. Hosted outlets are built on top of the same MCP layer when they make sense, with rate limiting and auth appropriate to each outlet's abuse surface.
- **Shipping a polished product.** This is workshop work. The POC is ugly, the presentation is scrappy, the goal is to validate the pattern and invite expert contribution.
- **Unifying the 2.66M messages into a perfect knowledge graph.** The POC uses a hand-picked slice. Scale comes later, if at all.
- **Boiling the ocean on ontology.** Canonical IDs are a string convention, not a formal taxonomy. First-pass is simple. Heavier ontology work is deferred.
- **Solving identity unification.** That is a hard, community-wide problem with parallel work already happening elsewhere. This project benefits when that work lands; it does not block on it.

---

## Next step after this doc is approved

1. **User reviews this spec.** ParadokS reads through, flags anything missing or wrong, approves the direction.
2. **Invoke the writing-plans skill.** Produce a concrete implementation plan for the POC — ordered tasks, files to touch, verification criteria, sequencing. The plan scope is limited to the POC as defined above.
3. **Execute the plan in a separate session** (probably using `subagent-driven-development` or `executing-plans`). Build the three layers + MCP server + demo.
4. **Repurpose `apps/qw-oracle`** as part of POC execution — CLAUDE.md and VISION.md edits, new subdirectory structure, existing scripts reframed rather than moved.
5. **Assemble presentation artifacts** — architecture diagram (Excalidraw), demo rehearsal, open-questions document for the dev server.
6. **Present to the dev-server experts.** Collect input. Phase 2 scope is decided by what they say, not what this doc predicts.

---

## Glossary (for non-systems-engineer readers)

- **MCP (Model Context Protocol)** — an open standard that lets an LLM client (like Claude Code, ChatGPT, or a local agent) load "tool servers" and call their functions as part of answering a question. MCP servers are essentially plugins that expose a typed API an LLM can discover and use.
- **AST (Abstract Syntax Tree)** — the structured representation of code after a parser reads it. AST-based extractors read code structurally (instead of with fragile regex), so they are robust to formatting changes.
- **FTS5** — SQLite's built-in full-text search extension. Fast keyword and phrase search across text columns.
- **Vector / semantic search** — search based on meaning rather than keywords, using LLM embeddings. Complements FTS5 for queries where the user's wording differs from the document's wording.
- **Polyglot persistence** — using multiple different storage technologies in the same system, each chosen to fit the shape of its data. The opposite of "one database for everything."
- **Idempotent** — an operation that produces the same result whether you run it once or a hundred times. Rerunnable ingestion pipelines are idempotent.
- **Provenance** — the trail of "where did this claim come from, who said it, when, in what context." A cited answer carries provenance.
