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
