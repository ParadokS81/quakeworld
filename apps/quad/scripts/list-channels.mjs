// List all text channels the bot can see on a given guild
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';

const GUILD_ID = '166866762787192833'; // Quake.World

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) {
    console.log('Guild not found!');
    client.destroy();
    return;
  }

  console.log(`\n=== ${guild.name} (${guild.memberCount} members) ===\n`);

  const channels = await guild.channels.fetch();

  // Group by category
  const categories = new Map();
  const uncategorized = [];

  for (const [id, ch] of channels) {
    if (!ch) continue;
    if (ch.type === ChannelType.GuildCategory) {
      categories.set(id, { name: ch.name, channels: [] });
    }
  }

  for (const [id, ch] of channels) {
    if (!ch) continue;
    const isText = [
      ChannelType.GuildText,
      ChannelType.GuildAnnouncement,
      ChannelType.GuildForum,
      ChannelType.GuildVoice, // voice channels have text too
    ].includes(ch.type);

    if (!isText) continue;

    const typeLabel = {
      [ChannelType.GuildText]: 'text',
      [ChannelType.GuildAnnouncement]: 'announce',
      [ChannelType.GuildForum]: 'forum',
      [ChannelType.GuildVoice]: 'voice',
    }[ch.type] || 'other';

    const entry = `  #${ch.name} (${typeLabel}, id: ${ch.id})`;

    if (ch.parentId && categories.has(ch.parentId)) {
      categories.get(ch.parentId).channels.push(entry);
    } else {
      uncategorized.push(entry);
    }
  }

  if (uncategorized.length) {
    console.log('[No Category]');
    uncategorized.forEach(e => console.log(e));
    console.log();
  }

  for (const [, cat] of categories) {
    if (cat.channels.length === 0) continue;
    console.log(`[${cat.name}]`);
    cat.channels.forEach(e => console.log(e));
    console.log();
  }

  client.destroy();
});

client.login();
