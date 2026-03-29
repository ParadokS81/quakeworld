# Backfill Strategy — Getting Years of Discord History

## Can We Do This?

**Yes.** Discord's API has no limit on how far back you can fetch. A bot with `View Channels`
and `Read Message History` permissions can read every message ever sent in every channel it
can see, going back to the server's creation.

## Two Approaches

### Option A: Bot-Based Fetch (Recommended)

The Quad bot itself fetches history using discord.js's `channel.messages.fetch()`.

**How it works:**
- Paginate backwards: fetch 100 messages at a time using the `before` parameter
- Each request returns up to 100 messages (hard Discord limit)
- discord.js handles rate limiting automatically (~5 requests/5 seconds per channel)
- Can parallelize across channels (each channel has its own rate limit bucket)

**Speed estimates:**

| Server Size | Messages | Time (sequential) | Time (parallel, 10 channels) |
|-------------|----------|-------------------|------------------------------|
| Small       | 100k     | ~20 min           | ~5 min                       |
| Medium      | 500k     | ~1.5 hours        | ~15 min                      |
| Large       | 2M       | ~6 hours          | ~1 hour                      |
| Very large  | 5M       | ~15 hours         | ~2.5 hours                   |

**Advantages:**
- Built into the bot — no external tools
- Uses the bot token (clean, ToS-compliant)
- Can run incrementally (track last fetched message ID per channel, resume on restart)
- Data goes directly into our SQLite schema

**Implementation sketch:**
```
For each channel the bot can see:
  1. Check: what's the newest message we already have for this channel?
  2. If none: start from the most recent message, paginate backwards to the beginning
  3. If exists: fetch forward from our newest stored message to catch up
  4. Store each message in the raw archive (Layer 1)
  5. Track progress: { channel_id, oldest_fetched, newest_fetched, total_count }
```

The bot can do this in the background on startup, or via a `/backfill` admin command.

### Option B: DiscordChatExporter (Bulk Export Tool)

**DiscordChatExporter** (github.com/Tyrrrz/DiscordChatExporter) is a well-known
open-source tool that can export full Discord server history.

- Supports bot tokens (ToS-compliant)
- Exports to JSON, HTML, CSV, or plaintext
- Can export entire servers at once
- GUI and CLI versions available
- .NET-based, runs on Windows/Linux

**When to use this:**
- One-time bulk export before the bot is even built
- If you want to explore the data before committing to a pipeline
- As a backup/verification of the bot's own backfill

**JSON export format** (simplified):
```json
{
  "guild": { "id": "...", "name": "..." },
  "channel": { "id": "...", "name": "..." },
  "messages": [
    {
      "id": "...",
      "timestamp": "2020-03-15T14:23:00+00:00",
      "content": "anyone up for 4on4?",
      "author": { "id": "...", "name": "paradoks", "nickname": "ParadokS" },
      "attachments": [],
      "embeds": [],
      "reactions": [],
      "reference": { "messageId": "..." }
    }
  ]
}
```

This can be imported into our SQLite database with a simple script.

## Recommended Strategy

1. **Start with DiscordChatExporter** — do a full JSON export of the server(s) right now.
   This gives us sample data to work with immediately, before writing any bot code.

2. **Build bot-based backfill** — the bot catches up on anything missed and handles
   ongoing ingestion. On first run, it checks what's already in the DB and fills gaps.

3. **Import the export** — write a one-time script to import DiscordChatExporter JSON
   into our SQLite schema. This seeds the database with full history.

This way we have sample data to experiment with TODAY, and the bot handles everything
going forward.

## What We Get Per Message

From either approach, each message includes:
- Unique message ID (snowflake — encodes creation timestamp)
- Full text content
- Author: user ID, username, display name/nickname
- Channel: ID, name
- Timestamp (ISO 8601)
- Reply reference (which message this is replying to)
- Attachments (URLs, filenames, sizes)
- Embeds (link previews, rich embeds)
- Reactions (emoji + count)
- Message type (normal, reply, thread created, user joined, boost, etc.)

## Things to Watch For

- **Deleted messages**: Can't be fetched. If they were deleted before we fetch, they're gone.
  Going forward, the bot can track `messageDelete` events.

- **Edited messages**: The API returns the CURRENT version. Edit history is not available
  through the API. Going forward, the bot can track `messageUpdate` events.

- **Threads**: Archived threads need separate fetching. Active threads are accessible.
  Very old archived threads (>7 days for non-boosted servers) need `ManageThreads` permission.

- **Rate limits**: discord.js handles these automatically, but a full backfill of a large
  server will take hours. Run it overnight, track progress, make it resumable.

- **Private channels**: The bot only sees channels it has permission for. For a public
  community server, this should be most channels. Admin/mod channels will be excluded
  unless the bot is explicitly given access (probably don't want those in newsletters anyway).

## Next Step

Export a few months of data from one QW Discord server using DiscordChatExporter.
Use this sample to:
1. Understand the actual data volume and message patterns
2. Let an LLM analyze the sample and suggest filtering rules
3. Test summarization prompts before building the full pipeline
