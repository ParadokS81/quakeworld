// Forward catch-up exporter for Discord channel history.
// Walks each channel from a per-channel anchor timestamp up to "now",
// using the same JSON shape as backfill.mjs (so import-discord.mjs accepts it).
// Usage: node --env-file=.env scripts/catchup.mjs [channel_name_filter]
//   channel_name_filter: optional substring; when supplied, only matching channels run.
import { Client, GatewayIntentBits, SnowflakeUtil } from 'discord.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const EXPORT_DIR = 'exports';
if (!existsSync(EXPORT_DIR)) mkdirSync(EXPORT_DIR, { recursive: true });

const FILTER = process.argv[2]?.toLowerCase() ?? null;

// Range suffix in output filenames. Importer keys on filename, so a new suffix
// here ensures import-discord.mjs does not early-skip due to a prior import_log row.
const RANGE_SUFFIX = '2026-02-to-2026-05';

// Anchors are MAX(created_at) per channel from apps/qw-oracle/data/qw.db (platform='discord').
// 1 ms is added so the snowflake we generate is strictly newer than the last imported message;
// this avoids re-emitting the boundary message itself. Any residual overlap is harmless because
// import-discord.mjs uses INSERT OR IGNORE on the snowflake primary key.
const CHANNELS = [
  { id: '166866762787192833', name: 'quakeworld', after: '2026-02-11T00:53:24.304Z' },
  { id: '179895022366228481', name: 'dev-corner', after: '2026-02-11T01:31:53.767Z' },
  { id: '709360526899150858', name: 'helpdesk',   after: '2026-02-11T00:27:36.754Z' },
  { id: '854976516231397417', name: 'antilag',    after: '2026-02-09T16:03:58.014Z' },
];

function formatMsg(msg) {
  return {
    id: msg.id,
    content: msg.content,
    author_id: msg.author.id,
    author_username: msg.author.username,
    author_display_name: msg.member?.displayName ?? msg.author.displayName,
    author_is_bot: msg.author.bot,
    channel_id: msg.channelId,
    message_type: msg.type,
    referenced_message_id: msg.reference?.messageId ?? null,
    attachments: msg.attachments.map(a => ({ url: a.url, name: a.name, size: a.size, type: a.contentType })),
    embeds: msg.embeds.map(e => ({ title: e.title, description: e.description?.slice(0, 300), url: e.url })),
    reactions: [...(msg.reactions?.cache?.values() ?? [])].map(r => ({ emoji: r.emoji.name, count: r.count })),
    created_at: msg.createdAt.toISOString(),
    edited_at: msg.editedAt?.toISOString() ?? null,
  };
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', async () => {
  console.log(`Bot ready as ${client.user.tag}. Starting catch-up...\n`);
  const grandStart = Date.now();
  let grandTotal = 0;
  const results = [];

  for (const ch of CHANNELS) {
    if (FILTER && !ch.name.toLowerCase().includes(FILTER)) continue;

    const channel = await client.channels.fetch(ch.id).catch((e) => {
      console.log(`! could not access #${ch.name} (${ch.id}): ${e.message}`);
      return null;
    });
    if (!channel) continue;

    const anchorTs = new Date(ch.after).getTime();
    let currentAfterId = SnowflakeUtil.generate({ timestamp: anchorTs }).toString();

    const outFile = join(EXPORT_DIR, `${ch.name}-${RANGE_SUFFIX}.json`);
    console.log(`-> #${ch.name} - catching up from ${ch.after} (anchor snowflake ${currentAfterId})`);

    const startTime = Date.now();
    const newMessages = [];
    let requestCount = 0;
    let rateLimitHits = 0;

    while (true) {
      const batchStart = Date.now();
      const batch = await channel.messages.fetch({ limit: 100, after: currentAfterId });
      const batchMs = Date.now() - batchStart;
      requestCount++;
      if (batchMs > 2000) rateLimitHits++;

      if (batch.size === 0) break;

      // Discord returns the oldest 100 after the anchor (no guaranteed Collection order),
      // so sort ascending by createdTimestamp and advance the cursor to the newest one.
      const sorted = [...batch.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      for (const msg of sorted) newMessages.push(formatMsg(msg));
      currentAfterId = sorted[sorted.length - 1].id;

      if (requestCount % 5 === 0 || batch.size < 100) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const newest = sorted[sorted.length - 1].createdAt.toISOString().slice(0, 10);
        console.log(`  #${ch.name}: ${newMessages.length} msgs | up to ${newest} | ${elapsed}s | last batch ${batchMs}ms`);
      }
    }

    // Snowflakes are time-ordered, but sort by id explicitly to match backfill.mjs convention.
    newMessages.sort((a, b) => a.id.localeCompare(b.id));
    writeFileSync(outFile, JSON.stringify(newMessages, null, 2));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const sizeMB = (Buffer.byteLength(JSON.stringify(newMessages, null, 2)) / 1024 / 1024).toFixed(2);
    const range = newMessages.length
      ? `${newMessages[0].created_at.slice(0, 10)} -> ${newMessages[newMessages.length - 1].created_at.slice(0, 10)}`
      : 'empty';
    console.log(`= #${ch.name} done: ${newMessages.length} msgs | ${range} | ${sizeMB} MB | ${elapsed}s | ${requestCount} requests | ${rateLimitHits} throttles\n`);

    results.push({ channel: ch.name, file: outFile, count: newMessages.length, range, sizeMB });
    grandTotal += newMessages.length;
  }

  const grandMin = ((Date.now() - grandStart) / 1000 / 60).toFixed(1);
  console.log(`=== CATCH-UP SUMMARY ===`);
  console.log(`Total new messages: ${grandTotal.toLocaleString()}`);
  console.log(`Total time: ${grandMin} minutes`);
  console.log(`Files saved in: ${EXPORT_DIR}/`);
  for (const r of results) {
    console.log(`  ${r.file}  ${r.count} msgs  ${r.range}  ${r.sizeMB} MB`);
  }

  client.destroy();
});

client.login();
