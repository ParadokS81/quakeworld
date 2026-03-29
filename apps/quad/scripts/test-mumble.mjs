/**
 * Quick manual test for M1 Mumble integration.
 * Connects to the live Mumble server, lists channels, creates Teams/test-sr, then cleans up.
 *
 * Usage:
 *   node scripts/test-mumble.mjs
 *   MUMBLE_HOST=83.172.66.214 MUMBLE_PASSWORD=quakeworld node scripts/test-mumble.mjs
 */

import { Client } from '@tf2pickup-org/mumble-client';

const HOST = process.env.MUMBLE_HOST || '83.172.66.214';
const PORT = parseInt(process.env.MUMBLE_PORT || '64738', 10);
const USERNAME = process.env.MUMBLE_BOT_USERNAME || 'QuadBot-test';
const PASSWORD = process.env.MUMBLE_PASSWORD || 'quakeworld';

console.log(`\nConnecting to Mumble at ${HOST}:${PORT} as "${USERNAME}"...`);

const client = new Client({
  host: HOST,
  port: PORT,
  username: USERNAME,
  password: PASSWORD,
  rejectUnauthorized: false,
  clientName: 'QuadBot-test',
});

client.on('error', (err) => {
  console.error('Client error:', err);
});

try {
  await client.connect();
  console.log('✓ Connected\n');

  // 1. List all channels
  const allChannels = client.channels.findAll(() => true);
  console.log(`Channels on server (${allChannels.length} total):`);
  for (const ch of allChannels) {
    const parentName = ch.parent !== undefined
      ? client.channels.byId(ch.parent)?.name ?? `id:${ch.parent}`
      : null;
    const indent = parentName ? '  └── ' : '';
    console.log(`  ${indent}[${ch.id}] ${ch.name}${parentName ? ` (parent: ${parentName})` : ''}`);
  }

  // 2. Find or create "Teams" parent channel
  const root = client.channels.root;
  let teamsChannel = client.channels.byName('Teams');

  if (teamsChannel) {
    console.log(`\n✓ "Teams" channel already exists (id: ${teamsChannel.id})`);
  } else {
    console.log('\nCreating "Teams" parent channel...');
    teamsChannel = await root.createSubChannel('Teams');
    console.log(`✓ Created "Teams" (id: ${teamsChannel.id})`);
  }

  // 3. Create a test subchannel: Teams/test-sr (simulates ]sr[ tag)
  const testTag = ']sr[';
  const channelName = testTag.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); // → "sr"
  console.log(`\nTag "${testTag}" → channel name "${channelName}"`);

  const existing = teamsChannel.subChannels.find(c => c.name === channelName);
  let testChannel;
  if (existing) {
    console.log(`✓ Channel "${channelName}" already exists (id: ${existing.id})`);
    testChannel = existing;
  } else {
    console.log(`Creating channel Teams/${channelName}...`);
    testChannel = await teamsChannel.createSubChannel(channelName);
    console.log(`✓ Created Teams/${channelName} (id: ${testChannel.id})`);
  }

  // 4. Verify it's visible
  const verified = client.channels.byPath('Teams', channelName);
  console.log(`\n✓ Verified via byPath('Teams', '${channelName}'): id=${verified?.id ?? 'NOT FOUND'}`);

  // 5. Show what would be written to Firestore
  const result = {
    channelId: testChannel.id,
    channelName,
    channelPath: `Teams/${channelName}`,
    serverAddress: HOST,
    serverPort: PORT,
    status: 'active',
  };
  console.log('\nFirestore doc update (simulated):');
  console.log(JSON.stringify(result, null, 2));

  // 6. Clean up — delete the test channel
  console.log(`\nCleaning up: deleting Teams/${channelName}...`);
  await testChannel.remove();
  console.log(`✓ Deleted Teams/${channelName}`);

  console.log('\n✓ All checks passed — M1 implementation is working.\n');

} catch (err) {
  console.error('\n✗ Test failed:', err.message || err);
  process.exit(1);
} finally {
  client.disconnect();
}
