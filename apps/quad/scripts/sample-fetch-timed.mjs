// Fetch messages with detailed timing to show rate limiting behavior
// Supports both count-based and date-based fetching
// Usage: node --env-file=.env scripts/sample-fetch-timed.mjs [channel_id] [count] [after_date]
// Example: node --env-file=.env scripts/sample-fetch-timed.mjs 166866762787192833 5000
// Example: node --env-file=.env scripts/sample-fetch-timed.mjs 166866762787192833 all 2025-01-01
import { Client, GatewayIntentBits, SnowflakeUtil } from 'discord.js';
import { writeFileSync } from 'fs';

const CHANNEL_ID = process.argv[2] || '166866762787192833';
const COUNT_ARG = process.argv[3] || '2000';
const AFTER_DATE = process.argv[4]; // optional: fetch everything after this date
const MAX_COUNT = COUNT_ARG === 'all' ? Infinity : parseInt(COUNT_ARG);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);

  let afterId = undefined;
  if (AFTER_DATE) {
    // Convert date to a Discord snowflake (messages after this date)
    const ts = new Date(AFTER_DATE).getTime();
    afterId = SnowflakeUtil.generate({ timestamp: ts }).toString();
    console.log(`Fetching from #${channel.name} after ${AFTER_DATE} (up to ${MAX_COUNT === Infinity ? 'all' : MAX_COUNT} messages)...`);
  } else {
    console.log(`Fetching ${MAX_COUNT} most recent messages from #${channel.name}...`);
  }

  const startTime = Date.now();
  const allMessages = [];
  let lastId = afterId ? undefined : undefined; // for backward pagination
  let requestCount = 0;
  let batchTimes = [];

  if (AFTER_DATE) {
    // Forward pagination (oldest to newest) using 'after'
    let currentAfterId = afterId;
    while (allMessages.length < MAX_COUNT) {
      const batchStart = Date.now();
      const limit = Math.min(100, MAX_COUNT - allMessages.length);
      const batch = await channel.messages.fetch({ limit, after: currentAfterId });
      const batchMs = Date.now() - batchStart;
      requestCount++;

      if (batch.size === 0) break;

      // batch comes newest-first, we want oldest-first
      const sorted = [...batch.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      for (const msg of sorted) {
        allMessages.push({
          id: msg.id,
          content: msg.content,
          author_username: msg.author.username,
          author_display_name: msg.member?.displayName ?? msg.author.displayName,
          author_is_bot: msg.author.bot,
          message_type: msg.type,
          referenced_message_id: msg.reference?.messageId ?? null,
          reactions: [...(msg.reactions?.cache?.values() ?? [])].map(r => ({
            emoji: r.emoji.name, count: r.count,
          })),
          created_at: msg.createdAt.toISOString(),
        });
      }

      // Move forward: use the newest message ID from this batch
      currentAfterId = sorted[sorted.length - 1].id;
      batchTimes.push(batchMs);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (allMessages.length / ((Date.now() - startTime) / 1000)).toFixed(0);
      const oldest = sorted[0].createdAt.toISOString().slice(0, 10);
      const newest = sorted[sorted.length - 1].createdAt.toISOString().slice(0, 10);
      console.log(`  Req #${requestCount}: +${batch.size} msgs (${batchMs}ms) | Total: ${allMessages.length} | ${oldest}→${newest} | ${rate} msg/s | ${elapsed}s elapsed`);
    }
  } else {
    // Backward pagination (newest to oldest) using 'before'
    while (allMessages.length < MAX_COUNT) {
      const batchStart = Date.now();
      const limit = Math.min(100, MAX_COUNT - allMessages.length);
      const options = { limit };
      if (lastId) options.before = lastId;

      const batch = await channel.messages.fetch(options);
      const batchMs = Date.now() - batchStart;
      requestCount++;

      if (batch.size === 0) break;

      for (const [, msg] of batch) {
        allMessages.push({
          id: msg.id,
          content: msg.content,
          author_username: msg.author.username,
          author_display_name: msg.member?.displayName ?? msg.author.displayName,
          author_is_bot: msg.author.bot,
          message_type: msg.type,
          referenced_message_id: msg.reference?.messageId ?? null,
          reactions: [...(msg.reactions?.cache?.values() ?? [])].map(r => ({
            emoji: r.emoji.name, count: r.count,
          })),
          created_at: msg.createdAt.toISOString(),
        });
      }

      lastId = batch.last().id;
      batchTimes.push(batchMs);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (allMessages.length / ((Date.now() - startTime) / 1000)).toFixed(0);
      const oldest = batch.last().createdAt.toISOString().slice(0, 10);
      console.log(`  Req #${requestCount}: +${batch.size} msgs (${batchMs}ms) | Total: ${allMessages.length} | back to ${oldest} | ${rate} msg/s | ${elapsed}s elapsed`);
    }
  }

  // Sort oldest first
  allMessages.sort((a, b) => a.id.localeCompare(b.id));

  const totalMs = Date.now() - startTime;
  const avgBatch = (batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length).toFixed(0);
  const maxBatch = Math.max(...batchTimes);
  const minBatch = Math.min(...batchTimes);

  console.log(`\n=== Results ===`);
  console.log(`Messages: ${allMessages.length}`);
  console.log(`Date range: ${allMessages[0]?.created_at.slice(0, 10)} → ${allMessages[allMessages.length - 1]?.created_at.slice(0, 10)}`);
  console.log(`Requests: ${requestCount}`);
  console.log(`Total time: ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`Throughput: ${(allMessages.length / (totalMs / 1000)).toFixed(0)} messages/sec`);
  console.log(`Batch timing: avg ${avgBatch}ms, min ${minBatch}ms, max ${maxBatch}ms`);

  if (maxBatch > 1000) {
    console.log(`\n⚠ Rate limiting detected! Some batches took ${maxBatch}ms (discord.js auto-queued)`);
  } else {
    console.log(`\nNo rate limiting hit — requests were fast enough`);
  }

  // Save (lightweight — no attachments/embeds in this version)
  const outFile = `exports/sample-${channel.name}-${allMessages.length}.json`;
  writeFileSync(outFile, JSON.stringify(allMessages, null, 2));
  console.log(`\nSaved to ${outFile} (${(Buffer.byteLength(JSON.stringify(allMessages, null, 2)) / 1024).toFixed(0)} KB)`);

  client.destroy();
});

client.login();
