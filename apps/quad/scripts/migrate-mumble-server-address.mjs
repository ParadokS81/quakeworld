// One-shot migration: rewrite mumbleConfig.serverAddress on every active team
// to the value of MUMBLE_PUBLIC_HOST. Use after the quad host migration so
// existing already-active teams pick up the new endpoint without having to
// disable+re-enable Mumble.
//
// Usage:
//   node --env-file=.env scripts/migrate-mumble-server-address.mjs           # dry run
//   node --env-file=.env scripts/migrate-mumble-server-address.mjs --apply   # write
//
// Reads:
//   MUMBLE_PUBLIC_HOST           target hostname (required, e.g. mumble.slipgate.me)
//   FIREBASE_SERVICE_ACCOUNT     path to service account JSON (default: ./service-account.json)

import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const apply = process.argv.includes('--apply');

const targetHost = process.env.MUMBLE_PUBLIC_HOST;
if (!targetHost) {
  console.error('MUMBLE_PUBLIC_HOST is required');
  process.exit(1);
}

const credPath = process.env.FIREBASE_SERVICE_ACCOUNT || './service-account.json';
const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const snap = await db.collection('mumbleConfig').where('status', '==', 'active').get();

console.log(`Found ${snap.size} active mumbleConfig docs.`);
console.log(`Target serverAddress: ${targetHost}`);
console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
console.log('');

let unchanged = 0;
let toUpdate = 0;
const updates = [];

for (const doc of snap.docs) {
  const data = doc.data();
  const current = data.serverAddress || '(unset)';
  const teamTag = data.teamTag || '(no tag)';

  if (current === targetHost) {
    unchanged++;
    continue;
  }

  toUpdate++;
  console.log(`  ${teamTag.padEnd(12)} ${current}  ->  ${targetHost}`);
  updates.push(doc.ref);
}

console.log('');
console.log(`Summary: ${unchanged} already correct, ${toUpdate} need update.`);

if (!apply) {
  console.log('Dry run complete. Re-run with --apply to write.');
  process.exit(0);
}

if (toUpdate === 0) {
  console.log('Nothing to do.');
  process.exit(0);
}

const batch = db.batch();
for (const ref of updates) {
  batch.update(ref, { serverAddress: targetHost, updatedAt: new Date() });
}
await batch.commit();
console.log(`Wrote ${toUpdate} updates.`);
