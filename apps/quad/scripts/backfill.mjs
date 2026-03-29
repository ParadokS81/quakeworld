// Backfill full message history from selected channels
// Resumable — tracks progress in exports/backfill-progress.json
// Usage: node --env-file=.env scripts/backfill.mjs
import { Client, GatewayIntentBits } from 'discord.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const EXPORT_DIR = 'exports';
const PROGRESS_FILE = join(EXPORT_DIR, 'backfill-progress.json');

// Active channels to fetch (in priority order)
const CHANNELS = [
  { id: '166866762787192833', name: 'quakeworld' },
  { id: '709360526899150858', name: 'helpdesk' },
  { id: '854976516231397417', name: 'antilag' },
  { id: '179895022366228481', name: 'dev-corner' },
  { id: '607990484580827137', name: 'rookies-corner' },
];

// Load or initialize progress
function loadProgress() {
  if (existsSync(PROGRESS_FILE)) {
    return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return {};
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

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
  console.log('Bot ready. Starting backfill...\n');
  const progress = loadProgress();
  const grandStart = Date.now();
  let grandTotal = 0;

  for (const chDef of CHANNELS) {
    const channel = await client.channels.fetch(chDef.id).catch(() => null);
    if (!channel) {
      console.log(`⚠ Could not access #${chDef.name} — skipping`);
      continue;
    }

    const outFile = join(EXPORT_DIR, `${chDef.name}.json`);
    const chProgress = progress[chDef.id] || { oldest_id: null, total: 0, complete: false };

    if (chProgress.complete) {
      console.log(`✓ #${chDef.name} — already complete (${chProgress.total} messages)`);
      grandTotal += chProgress.total;
      continue;
    }

    // Load existing messages if resuming
    let existing = [];
    if (existsSync(outFile) && chProgress.total > 0) {
      existing = JSON.parse(readFileSync(outFile, 'utf-8'));
      console.log(`↻ #${chDef.name} — resuming from ${chProgress.total} messages (oldest: ${chProgress.oldest_date})`);
    } else {
      console.log(`→ #${chDef.name} — starting fresh`);
    }

    const startTime = Date.now();
    const newMessages = [];
    let lastId = chProgress.oldest_id || undefined;
    let requestCount = 0;
    let rateLimitHits = 0;

    while (true) {
      const batchStart = Date.now();
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const batch = await channel.messages.fetch(options);
      const batchMs = Date.now() - batchStart;
      requestCount++;

      if (batchMs > 2000) rateLimitHits++;

      if (batch.size === 0) {
        chProgress.complete = true;
        break;
      }

      for (const [, msg] of batch) {
        newMessages.push(formatMsg(msg));
      }

      lastId = batch.last().id;
      const oldest = batch.last().createdAt;
      chProgress.oldest_id = lastId;
      chProgress.oldest_date = oldest.toISOString().slice(0, 10);
      chProgress.total = existing.length + newMessages.length;

      // Save progress every 10 requests
      if (requestCount % 10 === 0) {
        progress[chDef.id] = chProgress;
        saveProgress(progress);

        // Also save messages incrementally
        const allMsgs = [...existing, ...newMessages].sort((a, b) => a.id.localeCompare(b.id));
        writeFileSync(outFile, JSON.stringify(allMsgs, null, 2));
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const total = existing.length + newMessages.length;

      // Print progress every 5 requests
      if (requestCount % 5 === 0) {
        console.log(`  #${chDef.name}: ${total} msgs | back to ${chProgress.oldest_date} | ${elapsed}s | ${rateLimitHits} throttles`);
      }
    }

    // Final save for this channel
    const allMsgs = [...existing, ...newMessages].sort((a, b) => a.id.localeCompare(b.id));
    writeFileSync(outFile, JSON.stringify(allMsgs, null, 2));

    progress[chDef.id] = chProgress;
    saveProgress(progress);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const fileSize = (Buffer.byteLength(JSON.stringify(allMsgs, null, 2)) / 1024 / 1024).toFixed(1);
    const dateRange = allMsgs.length > 0
      ? `${allMsgs[0].created_at.slice(0, 10)} → ${allMsgs[allMsgs.length - 1].created_at.slice(0, 10)}`
      : 'empty';

    console.log(`✓ #${chDef.name} — ${chProgress.complete ? 'COMPLETE' : 'partial'}: ${allMsgs.length} messages | ${dateRange} | ${fileSize} MB | ${elapsed}s | ${rateLimitHits} throttles\n`);
    grandTotal += allMsgs.length;
  }

  const grandElapsed = ((Date.now() - grandStart) / 1000 / 60).toFixed(1);
  console.log(`\n=== BACKFILL SUMMARY ===`);
  console.log(`Total messages: ${grandTotal.toLocaleString()}`);
  console.log(`Total time: ${grandElapsed} minutes`);
  console.log(`Files saved in: ${EXPORT_DIR}/`);

  client.destroy();
});

client.login();
