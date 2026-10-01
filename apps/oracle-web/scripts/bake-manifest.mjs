// Bakes the committed Phase-1 manifest into the bundle as the P3
// build-time fallback. Shape-asserts so a pre-Phase-1 (old-shape) file
// fails the build loudly instead of baking a contract violation.
import { copyFileSync, readFileSync } from 'node:fs'
const SRC = new URL('../../qw-oracle/snapshots/brain-manifest.json', import.meta.url)
const DEST = new URL('../src/data/baked-manifest.json', import.meta.url)
const prev = JSON.parse(readFileSync(SRC, 'utf8'))
if (prev.schema_version !== 'brain-manifest-v1') {
  console.error(`bake-manifest: source schema_version is ${JSON.stringify(prev.schema_version)}, not brain-manifest-v1 -- run Phase 1's emitter first`)
  process.exit(1)
}
copyFileSync(SRC, DEST)
console.log(`bake-manifest: baked copy generated_at ${prev.generated_at}`)
