# Data Pipeline Strategy

## The Three-Layer Architecture

```
Layer 1: Raw Archive ──→ Layer 2: Clean Conversations ──→ Layer 3: Summaries
(immutable)               (filterable, reprocessable)      (regenerable)
```

Each layer is stored independently. You can regenerate any layer from the one below it.
When a better model comes out, you regenerate Layer 3 from Layer 2. When you improve
your filtering rules, you regenerate Layer 2 from Layer 1.

---

## Layer 1: Raw Archive

**What:** Every message exactly as Discord provided it. Never modified, never deleted.

**Schema:**
```sql
CREATE TABLE raw_messages (
    id TEXT PRIMARY KEY,              -- Discord snowflake (time-sortable, unique)
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    channel_type TEXT NOT NULL,       -- 'text', 'thread', 'forum_post', 'voice_text'
    parent_channel_id TEXT,           -- For threads: the parent channel
    author_id TEXT NOT NULL,
    author_username TEXT NOT NULL,
    author_display_name TEXT,
    author_is_bot INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL DEFAULT '',
    referenced_message_id TEXT,       -- Reply-to
    message_type TEXT NOT NULL,       -- 'default', 'reply', 'thread_created', 'join', etc.
    attachment_count INTEGER DEFAULT 0,
    attachments_json TEXT,            -- JSON array of {url, name, size, content_type}
    embed_count INTEGER DEFAULT 0,
    embeds_json TEXT,                 -- JSON array of {title, description, url}
    reaction_count INTEGER DEFAULT 0,
    reactions_json TEXT,              -- JSON array of {emoji, count}
    created_at TEXT NOT NULL,         -- ISO 8601 UTC from Discord
    edited_at TEXT,                   -- NULL if never edited
    is_deleted INTEGER DEFAULT 0,     -- Tracked via messageDelete event (forward only)
    ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
    source TEXT NOT NULL DEFAULT 'bot' -- 'bot' or 'export' (DiscordChatExporter)
);

-- Indexes for common query patterns
CREATE INDEX idx_raw_guild_date ON raw_messages(guild_id, created_at);
CREATE INDEX idx_raw_channel_date ON raw_messages(channel_id, created_at);
CREATE INDEX idx_raw_author ON raw_messages(author_id, created_at);

-- Backfill progress tracking
CREATE TABLE backfill_progress (
    channel_id TEXT PRIMARY KEY,
    channel_name TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    oldest_message_id TEXT,           -- How far back we've fetched
    newest_message_id TEXT,           -- Most recent fetched message
    total_fetched INTEGER DEFAULT 0,
    is_complete INTEGER DEFAULT 0,    -- 1 = reached beginning of channel
    last_updated TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Size estimate:** ~400 bytes/message average. 2M messages = ~800 MB. Trivial.

---

## Layer 2: Filtered Conversations

This is where the magic happens. Two steps: filter noise, then group into conversations.

### Step 1: Noise Filtering

**The smart approach: let an AI discover the rules from sample data.**

Instead of guessing what to filter, take a representative sample (e.g., 3 months
from a few active channels — maybe 50k messages) and ask a capable model:

```
Here are 1000 messages from a gaming community Discord channel.
I want to build a newsletter that surfaces interesting discussions,
community decisions, drama, announcements, and notable conversations.

Categorize each message into one of these buckets:
1. SIGNAL - Substantive content worth including in a summary
2. CONTEXT - Short but provides context (reactions to something, brief replies)
3. NOISE - No informational value (greetings, single emojis, "lol", bot spam)

Then suggest deterministic rules I can apply to categorize messages without
an LLM. Think about: message length, content patterns, author type,
message type, channel context, reply chains.
```

Run this on a few different channels to discover channel-specific patterns.
The output becomes your filtering ruleset.

**Expected deterministic rules (to be refined from sample analysis):**

```
DEFINITELY NOISE (auto-skip):
  - author.is_bot AND channel NOT IN (allowlist of useful bot channels)
  - message_type IN ('join', 'boost', 'pin_notification', 'thread_created')
  - content matches /^[\p{Emoji}\s]{1,5}$/  (just emojis)
  - content matches /^(lol|lmao|rofl|haha|xd|kek|gg|wp|nice|noice|
    true|same|this|based|\+1|ok|ye|ya|yep|nah|nope|rip|oof|bruh|
    damn|wow|omg|wtf|idk|np)$/i  (single-word reactions)

PROBABLY NOISE (skip unless in a reply chain):
  - content.length < 10 AND no referenced_message AND no attachments
  - content is only a URL with no comment

ALWAYS KEEP:
  - Messages with 3+ reactions (community found it notable)
  - Messages over 100 characters (someone took time to write it)
  - Messages that are replied to by 2+ different people (sparked discussion)
  - Messages from specific roles/users (admins, tournament organizers)
  - Messages in announcement/important channels
```

**Store the filter result alongside the raw data:**

```sql
CREATE TABLE message_filter (
    message_id TEXT PRIMARY KEY REFERENCES raw_messages(id),
    category TEXT NOT NULL,           -- 'signal', 'context', 'noise'
    rule_applied TEXT NOT NULL,       -- Which rule triggered this classification
    filter_version INTEGER NOT NULL,  -- Bump when rules change → reprocess
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

When you improve rules, bump filter_version and reprocess. Layer 1 is untouched.

### Step 2: Conversation Grouping

Group messages into coherent conversations using:

1. **Explicit reply chains** — Discord provides `referenced_message_id`. Follow the chain.
2. **Temporal clustering** — Messages in the same channel within 5-10 minutes of each
   other, by overlapping participants, are likely one conversation.
3. **Gap detection** — A gap of 30+ minutes with no messages = conversation boundary.

```sql
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    message_count INTEGER NOT NULL,
    signal_count INTEGER NOT NULL,    -- Messages classified as 'signal'
    participant_count INTEGER NOT NULL,
    participants_json TEXT NOT NULL,   -- JSON array of {author_id, author_name, message_count}
    -- The actual content, formatted for LLM consumption:
    formatted_text TEXT NOT NULL,      -- Human-readable chat log format
    token_estimate INTEGER NOT NULL,   -- Approximate token count
    filter_version INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_conv_channel_date ON conversations(channel_id, start_time);
CREATE INDEX idx_conv_guild_date ON conversations(guild_id, start_time);
```

**The `formatted_text` is what the LLM actually sees:**

```
=== #4on4 — 2024-03-15 19:23-19:52 (6 messages, 4 participants) ===

[19:23] ParadokS: anyone up for 4on4 tonight? we need a standin
[19:24] razor: I can play, what time?
[19:25] ParadokS: 21 CET, dm2 dm3 e1m2
[19:31] grisling: I'm in
[19:45] zero: same, who's the 4th?
  -> ParadokS: razor said he can play
[19:52] razor: confirmed, see you at 21
```

This format is:
- Easy for the LLM to parse
- Token-efficient (~30% less than JSON)
- Human-readable for debugging
- Preserves reply context with `->` notation
- Includes metadata header (channel, time range, participant count)

---

## Layer 3: Hierarchical Summaries

Generated by the LLM, stored for reuse. Four levels:

### Level 1: Conversation Summaries
- One summary per conversation (from Layer 2)
- Generated by: local 8B model (fast, cheap, good enough)
- Optional: skip this level and go straight to channel-day if conversations are short

### Level 2: Channel-Day Summaries
- All conversations from one channel on one day → one summary
- Generated by: local 8B model
- This is the workhorse level — the bulk of processing happens here

### Level 3: Daily Digest
- All channel-day summaries → cross-channel newsletter
- Generated by: 70B local or Claude Sonnet API (quality matters)
- Includes: topic extraction, highlights, drama meter, ongoing threads
- References previous day's digest for continuity

### Level 4: Weekly Rollup
- 7 daily digests → "week in review"
- Generated by: Claude Sonnet (quality matters, small input, cheap)
- Broader themes, trend identification, notable events

```sql
CREATE TABLE summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,               -- 'conversation', 'channel_day', 'daily', 'weekly'
    guild_id TEXT NOT NULL,
    channel_id TEXT,                   -- NULL for daily/weekly (cross-channel)
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    input_ids TEXT NOT NULL,           -- JSON array of conversation/summary IDs that fed this
    content TEXT NOT NULL,             -- The summary text
    structured_json TEXT,              -- Optional: parsed topics, quotes, etc.
    model_used TEXT NOT NULL,          -- 'llama3.1-8b-q8', 'claude-sonnet-4', etc.
    prompt_version TEXT NOT NULL,      -- Track which prompt generated this
    input_tokens INTEGER,
    output_tokens INTEGER,
    generation_time_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_summaries_level_date ON summaries(level, period_start);
CREATE INDEX idx_summaries_guild_level ON summaries(guild_id, level, period_start);
```

---

## Reprocessing

The whole point of this architecture is making reprocessing cheap and easy.

### When to reprocess

| Trigger | What to regenerate |
|---------|--------------------|
| Better model available | Layer 3 from Layer 2 |
| Improved prompts | Layer 3 from Layer 2 |
| Better filtering rules | Layer 2 from Layer 1, then Layer 3 |
| New channel added to scope | Layer 2 + 3 for that channel only |
| Bug found in formatting | Layer 2 from Layer 1, then Layer 3 |

### Reprocessing is always incremental

- Tag every summary with `model_used` and `prompt_version`
- Query: "give me all channel-day summaries where model != current_model"
- Regenerate only those → roll up into new daily/weekly digests
- Keep old summaries (mark superseded) for comparison

### Cost of reprocessing (full archive, ~5 years)

| Approach | Time | Cost |
|----------|------|------|
| Layer 3 only, local 8B | ~3 days | Free |
| Layer 3 only, local 70B | ~15 days | Free |
| Layer 3 only, API (Haiku + Sonnet) | ~1 hour | ~$80-130 |
| Layer 2 + 3, local | ~4 days | Free |
| Everything from scratch, local | ~5 days | Free |

With multiple 4090 machines, divide these times accordingly.

---

## Filter Rule Discovery Process

**This is the key insight: use AI to write the rules, then apply rules without AI.**

### Phase 1: Sample Export
- Export 3-6 months from 3-5 active channels (DiscordChatExporter or bot fetch)
- This gives you a representative sample: ~50k-150k messages

### Phase 2: AI Analysis
- Feed batches of ~1000 messages to Claude Opus or Sonnet (quality matters here)
- Prompt: "Categorize each message. Then generalize into deterministic rules."
- Do this for different channel types (#general, #4on4, #offtopic, #announcements)
- Compare rules across channels — some rules are universal, some channel-specific

### Phase 3: Rule Validation
- Apply the discovered rules to a held-out sample
- Check: how many signal messages did the filter incorrectly mark as noise?
- Check: how much noise got through?
- Iterate: adjust thresholds, add/remove patterns

### Phase 4: Apply at Scale
- Run the finalized rules against the full archive
- Store results in message_filter table
- Generate Layer 2 conversations from filtered messages
- Process through the LLM pipeline

### Phase 5: Ongoing Refinement
- The daily pipeline uses the same rules on new messages
- Periodically review: ask the LLM "were any of these filtered messages actually important?"
- Adjust rules, bump filter_version, reprocess if needed

---

## Practical First Steps

1. **Today:** Install DiscordChatExporter, export 3-6 months from the main QW server
2. **This week:** Load into SQLite, run basic stats (messages/day, messages/channel, top authors)
3. **This week:** Feed sample batches to Claude to discover filtering rules
4. **Next week:** Apply filters, generate test summaries with Ollama locally
5. **Iterate:** Tune prompts, compare models, refine filters
6. **Then:** Build the Quad module to automate everything

The export gives us data to play with immediately, before writing any bot code.
The bot module comes later once we know what the pipeline should look like.
