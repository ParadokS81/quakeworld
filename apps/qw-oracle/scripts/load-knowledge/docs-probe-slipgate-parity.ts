// docs-probe-slipgate-parity.ts
//
// F1/D12 hard-gate probe: proves the docs emit does NOT perturb any file
// that slipgate consumes.
//
// This probe is SELF-CONTAINED -- it captures its OWN before-image at run
// time, so it does not depend on any pre-recorded baseline. The semantic gate
// is "the docs emit did not touch slipgate's dir," which holds by construction
// (the docs path writes only to apps/docs-web/data/ and never calls the
// slipgate emitters); the probe is the belt-and-suspenders proof against a
// shared-helper mutation that might accidentally write to DEFAULT_OUTPUT_DIR.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, '..', '..', '..', '..');
const SLIPGATE_DATA = join(MONOREPO_ROOT, 'apps', 'slipgate-app', 'src', 'lib', 'config', 'data');

// The 9 files slipgate consumes from the snapshot build.
const SLIPGATE_FILES = [
  'ezquake-variables.json',
  'ezquake-commands.json',
  'ezquake-macros.json',
  'ezquake-cmdline-params.json',
  'ezquake-asset-bundle.json',
  'qwcl-variables.json',
  'qwcl-variables-meta.json',
  'qw-maps.json',
  'qw-gameplay.json',
].map((name) => join(SLIPGATE_DATA, name));

const ABSENT_SENTINEL = 'ABSENT';

function sha256(filePath: string): string {
  if (!existsSync(filePath)) {
    return ABSENT_SENTINEL;
  }
  const bytes = readFileSync(filePath);
  return createHash('sha256').update(bytes).digest('hex');
}

function capture(): Map<string, string> {
  const hashes = new Map<string, string>();
  for (const f of SLIPGATE_FILES) {
    hashes.set(f, sha256(f));
  }
  return hashes;
}

if (import.meta.main) {
  console.log('--- slipgate parity probe ---');
  console.log('CAPTURE phase: hashing 9 slipgate-consumed files...');
  const before = capture();

  console.log('RUN phase: invoking buildDocsSnapshot({}) in-process...');
  const { buildDocsSnapshot } = await import('./build-snapshot.js');
  await buildDocsSnapshot({});
  console.log('RUN phase complete.');

  console.log('RE-CAPTURE phase: hashing 9 slipgate-consumed files...');
  const after = capture();

  let anyDiff = false;

  for (const f of SLIPGATE_FILES) {
    const bHash = before.get(f)!;
    const aHash = after.get(f)!;
    const name = f.replace(SLIPGATE_DATA + '/', '');
    if (bHash === aHash) {
      console.log(`  PASS  ${name}  (${bHash})`);
    } else {
      console.log(`  FAIL  ${name}`);
      console.log(`        before: ${bHash}`);
      console.log(`        after:  ${aHash}`);
      anyDiff = true;
    }
  }

  if (anyDiff) {
    console.log('\nPARITY FAIL -- docs emit perturbed slipgate files (see above)');
    process.exitCode = 1;
  } else {
    console.log('\nPARITY OK');
    process.exitCode = 0;
  }
}
