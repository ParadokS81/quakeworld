// Fetch a small sample of messages from one channel and dump as JSON
// Usage: node --env-file=.env scripts/sample-fetch.mjs [channel_id] [count]
import { Client, GatewayIntentBits } from 'discord.js';
import { writeFileSync } from 'fs';

const CHANNEL_ID = process.argv[2] || '166866762787192833'; // #quakeworld
const COUNT = parseInt(process.argv[3] || '200');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);
  console.log(`Fetching ${COUNT} messages from #${channel.name}...`);

  const startTime = Date.now();
  const allMessages = [];
  let lastId = undefined;
  let fetched = 0;

  while (fetched < COUNT) {
    const limit = Math.min(100, COUNT - fetched);
    const options = { limit };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) {
      console.log('  Reached beginning of channel.');
      break;
    }

    for (const [, msg] of batch) {
      allMessages.push({
        id: msg.id,
        content: msg.content,
        author_id: msg.author.id,
        author_username: msg.author.username,
        author_display_name: msg.member?.displayName ?? msg.author.displayName,
        author_is_bot: msg.author.bot,
        channel_id: msg.channelId,
        channel_name: channel.name,
        message_type: msg.type,
        referenced_message_id: msg.reference?.messageId ?? null,
        attachments: msg.attachments.map(a => ({ url: a.url, name: a.name, size: a.size, type: a.contentType })),
        embeds: msg.embeds.map(e => ({ title: e.title, description: e.description?.slice(0, 200), url: e.url })),
        reactions: [...(msg.reactions?.cache?.values() ?? [])].map(r => ({
          emoji: r.emoji.name,
          count: r.count,
        })),
        created_at: msg.createdAt.toISOString(),
        edited_at: msg.editedAt?.toISOString() ?? null,
      });
    }

    fetched += batch.size;
    lastId = batch.last().id;
    console.log(`  Fetched ${fetched}/${COUNT} (oldest so far: ${batch.last().createdAt.toISOString().slice(0, 10)})`);
  }

  // Sort oldest first
  allMessages.sort((a, b) => a.id.localeCompare(b.id));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const outFile = `exports/sample-${channel.name}-${COUNT}.json`;

  writeFileSync(outFile, JSON.stringify(allMessages, null, 2));

  console.log(`\nDone in ${elapsed}s`);
  console.log(`Saved ${allMessages.length} messages to ${outFile}`);
  console.log(`Date range: ${allMessages[0].created_at.slice(0, 10)} → ${allMessages[allMessages.length - 1].created_at.slice(0, 10)}`);
  console.log(`File size: ${(Buffer.byteLength(JSON.stringify(allMessages, null, 2)) / 1024).toFixed(1)} KB`);

  // Quick stats
  const authors = new Set(allMessages.map(m => m.author_username));
  const bots = allMessages.filter(m => m.author_is_bot).length;
  const replies = allMessages.filter(m => m.referenced_message_id).length;
  const withAttachments = allMessages.filter(m => m.attachments.length > 0).length;
  const avgLength = (allMessages.reduce((s, m) => s + m.content.length, 0) / allMessages.length).toFixed(0);

  console.log(`\nQuick stats:`);
  console.log(`  Unique authors: ${authors.size}`);
  console.log(`  Bot messages: ${bots} (${((bots/allMessages.length)*100).toFixed(1)}%)`);
  console.log(`  Replies: ${replies} (${((replies/allMessages.length)*100).toFixed(1)}%)`);
  console.log(`  With attachments: ${withAttachments}`);
  console.log(`  Avg message length: ${avgLength} chars`);

  client.destroy();
});

client.login();
