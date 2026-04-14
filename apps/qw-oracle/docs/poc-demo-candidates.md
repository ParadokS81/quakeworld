# POC demo candidates (scratch)

Audit run: 2026-04-14 against Layer 1 tables after the first successful import (kb_cvars: 4815 rows, kb_commands: 849 rows).

## Primary demo pattern: pure KTX-injected commands

Commands that exist as `ktx:cmd:*` but have no ezQuake counterpart. Players see these in their configs (bound to keys, or dropped into console) but cannot find them in the ezQuake source or in ezQuake documentation. 321 of the 326 KTX commands fall into this bucket.

High-interest subset (verified present in kb_commands):

| id | description |
|---|---|
| `ktx:cmd:break` | unready / vote matchend |
| `ktx:cmd:list` | whonot to everyone |
| `ktx:cmd:mapcycle` | list map cycle |
| `ktx:cmd:next_best` | set pov to next best player |
| `ktx:cmd:next_map` | vote for next map |
| `ktx:cmd:ready` | when you feel ready |
| `ktx:cmd:rpickup` | vote random team pickup |
| `ktx:cmd:scores` | print match time/scores |
| `ktx:cmd:shownick` | pointed player's info |

Note: `maplist` was in the candidate list but is not in the KTX scraped JSON. Unsurprising given the scraper gaps. Not a blocker.

Any of these is a valid primary demo target. `rpickup`, `break`, and `next_map` all read as ambiguous to a player who doesn't know KTX.

## Secondary demo pattern: cross-project name collisions

Same name registered by both ezQuake and KTX, with different semantics. Exactly 5 rows:

| ezquake | ktx |
|---|---|
| `ezquake:cmd:autotrack` | `ktx:cmd:autotrack` |
| `ezquake:cmd:kick` | `ktx:cmd:kick` |
| `ezquake:cmd:kill` | `ktx:cmd:kill` |
| `ezquake:cmd:pause` | `ktx:cmd:pause` |
| `ezquake:cmd:speed` | `ktx:cmd:speed` |

Useful as a bonus demo: "when you type `pause` in your console, which one runs?" The answer is KTX when connected to a KTX server, because the server injects the command on connect. This is the same kind of "invisible server override" the primary pattern illustrates.

## Chosen primary demo query

**Query:** "I see `rpickup` bound to a key in my config. What does it do, and why isn't it in the ezQuake cvar list?"

**Expected MCP round-trip:**

1. `lookup_entity({ name: 'rpickup' })` returns:
   - 0 hits on `ezquake:*`
   - 1 hit on `ktx:cmd:rpickup` with `description: "vote random team pickup"`, `extraction_method: "scraped-json"`, and a `linked_concepts` array including `concept:ktx_matchstart_injection`
2. `get_concept_note({ id: 'concept:ktx_matchstart_injection' })` returns the concept body explaining how KTX `stuffcmd`s commands into the client on connect, why players confuse them for ezQuake commands, and which Layer 2 sessions discuss it
3. Optional: `search_solved_issues({ query: 'rpickup' })` may hit a chat session where a player asked about it; depends on whether the POC Layer 2 slice caught the right window

**Final narrated answer the LLM can produce:**

> "`rpickup` isn't an ezQuake command. It's a KTX command that the KTX server injects into your client's console on connect. In pickup mode it puts a random-team vote to the channel. The description in KTX source says 'vote random team pickup'. Here's a concept note explaining how the KTX injection mechanism works: [concept:ktx_matchstart_injection]. If you want to see the community discussion, I can also pull the chat sessions."

## Bonus query for the demo if time allows

**Query:** "What happens when I type `pause` in my console?"

**Expected:** both `ezquake:cmd:pause` and `ktx:cmd:pause` return. The LLM can explain the ambiguity: on a KTX server, the KTX-injected `pause` wins; on non-KTX servers, ezQuake's runs.

## Layer 3 concept notes needed for the primary demo

At minimum the hand-authored note `concept:ktx_matchstart_injection` must exist in `layers/concepts/` with frontmatter that cross-references `ktx:cmd:rpickup` (and ideally every command in the "primary demo" subset above). Task 6 will write this.

---

## Layer 2 session audit (Task 4 findings, 2026-04-14)

Run of `scripts/verify-layer2.mjs` against the existing `sessions` + `session_search` + `message_labels` tables in the live qw.db.

### Corpus stats

- **Sessions:** 128,084
- **Chat messages (signal):** 1,486,716
- **Noise (system + reaction + link + bot):** 1,174,648

### FTS5 hit counts per demo target

| Term | Sessions hit |
|---|---|
| `rpickup` | 97 |
| `break` | 2,023 |
| `next_map` | 102 |
| `ready` | 1,506 |
| `scores` | 1,070 |
| `mapcycle` | 41 |
| `shownick` | 176 |

### Chosen rpickup demo sessions (primary path)

**Primary: session 72163** (`#dev-corner` Discord, **2017-11-22**, 290 chat messages, 8 participants).

Substantive discussion between a confused player (`psyzq`) and core devs including `meag.qw` (ezQuake/KTX maintainer) and `ake_vader`. Key lines FTS-extractable from the session:

- `psyzq`: "the command to sort out the teams is rpickup"
- `ake_vader`: "generally in mix all players vote for rpickup, when it goes through everyone goes /ready and game starts"
- `psyzq`: "a guy that doesnt know what rpickup is so the game takes forever to start while people tell him 'hey you need to do rpickup in the console'"
- `meag.qw`: "they don't have to type `/rpickup` though? just `/agree`?"
- `pointed.dice`: "it also shouldnt be called rpickup, not too intuitive"
- `ake_vader`: "perhaps nQuake should have an rpickup bind too"

This is the cleanest possible demo evidence: a player asking, a core dev answering, UX critique, and a workflow-completion tip (`/agree` alias) all in one session.

**Backup: session 72162** (`#dev-corner` Discord, 2017-11-22, 227 chat messages). Adjacent session, 6 rpickup mentions, 6 ready mentions, 4 agree mentions. Same cluster of speakers. Use if 72163's top lines need additional context.

### Why not the larger IRC sessions

The FTS hits include IRC session 100015 (`#ktx` IRC, 2007, 752 chat messages) and session 99726 (`#ktx` IRC, 2007, 406 chat messages). These are **KTX developer discussions in the actual KTX dev channel** — on paper the ideal demo evidence — but the message bodies were originally Cyrillic (Russian KTX devs `Set`, `qqshka`, `Tonik`, `deurk`, `disconnect|bla`) and got corrupted at import time: the non-ASCII bytes are stored as UTF-8 replacement characters (`0xef 0xbf 0xbd`), so only isolated Latin-alphabet tokens (`rpickup`, `stuffcmd`, `mapcycle`, protocol words) are readable. One surviving fragment: `Tonik: ... rpickup ... stuffcmd ...` — the `stuffcmd` mention confirms the real conversation was about exactly the injection mechanism the demo wants to explain, but the full sentences are unrecoverable.

**Layer 2 data-quality gap to document for phase 2:** IRC logs from non-English channels likely suffered systematic encoding corruption during import. The original mIRC log files in `/home/paradoks/projects/quake/quad/exports/mirc-logs/` probably still have the correct bytes — a re-import with proper encoding detection (cp1251 / koi8-r / latin1 vs utf-8) would recover a large amount of content across several years of IRC history. Low priority for the POC (Discord sessions give us everything we need) but worth a memory entry.

### Final demo target decision

**Primary demo: `rpickup`, using session 72163 as Layer 2 evidence.**

The MCP round-trip for the demo:

1. `lookup_entity({ name: 'rpickup' })` → returns `ktx:cmd:rpickup` row (Layer 1) + `linked_concepts: ['concept:ktx_matchstart_injection']`
2. `search_solved_issues({ query: 'rpickup' })` → returns session 72163 with the chat transcript filtered to category='chat' via `formatSessionForMcp()`. The outlet LLM reads the `psyzq`/`ake_vader`/`meag.qw` lines directly.
3. `get_concept_note({ id: 'concept:ktx_matchstart_injection' })` → returns the hand-written explanation of KTX stuffcmd injection, authored in Task 6.

**The pitch-friendly narrative** the outlet LLM can produce from that:

> "`rpickup` isn't an ezQuake command. It's a KTX server command — when you connect to a KTX match server, KTX injects it into your client via `stuffcmd`, so it looks like a native command but is actually server-owned. In the `#dev-corner` Discord channel on 2017-11-22, ezQuake developer meag explained to a new player that you don't even have to type `/rpickup` — `/agree` is enough. Here's the concept note that explains how KTX match-start injection works: [concept:ktx_matchstart_injection]. Full session: [session:discord:#dev-corner:2017-11-22T13:41:...]."

Three layers cited in one answer. That's the money shot.

### Bonus session for `break` if the demo wants secondary evidence

Session 105771 (`#helpdesk` Discord, 2021-12-21, 1,375 chat messages, 15 participants). #helpdesk is the literal "answer questions here" channel and is 5x larger than the typical dev-corner session. Good fallback if the rehearsal wants a second data point.
