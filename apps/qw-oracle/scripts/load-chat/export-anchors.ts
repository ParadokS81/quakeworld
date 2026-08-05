// apps/qw-oracle/scripts/load-chat/export-anchors.ts
//
// Computes the Layer 2 corpus edge per Discord channel and writes the anchors
// JSON that quad's scripts/catchup.mjs consumes via --anchors. This is the seam
// of the harvest ritual: oracle knows its corpus edge, quad knows Discord.
//
// Anchor = MAX(created_at) per channel + 1 ms (the +1 ms matches catchup.mjs's
// documented convention: the generated snowflake must be strictly newer than the
// last imported message so the boundary message is not re-emitted; residual
// overlap is absorbed by the importer's ON CONFLICT (id) DO NOTHING).
//
// Usage (from apps/qw-oracle/):
//   bun scripts/load-chat/export-anchors.ts                      # print to stdout
//   bun scripts/load-chat/export-anchors.ts --out <path.json>    # write file
//
// Typical harvest sequence (anchors live in quad's ROOT, gitignored -- never in
// exports/, which import-discord.ts directory-scans for message files):
//   bun scripts/load-chat/export-anchors.ts --out ../quad/anchors-latest.json
//   (cd ../quad && node --env-file=/mnt/user/appdata/quad/.env scripts/catchup.mjs \
//      --anchors anchors-latest.json)
//   bun scripts/load-chat/import-discord.ts

import { writeFileSync } from 'node:fs';
import { db, closeDb } from '../../shared/db.ts';

const outIdx = process.argv.indexOf('--out');
const outPath = outIdx !== -1 ? process.argv[outIdx + 1] : null;

const rows = await db<{ channel_name: string; anchor: Date }[]>`
  SELECT channel_name, max(created_at) AS anchor
  FROM messages
  WHERE platform = 'discord'
  GROUP BY channel_name
  ORDER BY channel_name
`;

const anchors: Record<string, string> = {};
for (const r of rows) {
  const name = r.channel_name.replace(/^#/, '');
  anchors[name] = new Date(r.anchor.getTime() + 1).toISOString();
}

const json = JSON.stringify(anchors, null, 2);
if (outPath) {
  writeFileSync(outPath, json + '\n');
  console.log(`wrote ${outPath}`);
} else {
  console.log(json);
}
for (const [name, after] of Object.entries(anchors)) {
  console.error(`  ${name.padEnd(12)} from ${after}`);
}

await closeDb();
