import { listSnapshots } from '../lib/snapshot'

// One page per (codebase, type) pair on disk -- the 20 Phase-1 files. This is
// the route the Phase 2b browse view fills; the stable per-entity anchors
// (D22) hang off this route as `#<case-folded-name>` in 2b, so the route
// scheme is chosen now to be D22-compatible (clean /<codebase>/<type> URL).
export default {
  paths() {
    return listSnapshots().map(({ codebase, type }) => ({
      params: { codebase, type }
    }))
  }
}
