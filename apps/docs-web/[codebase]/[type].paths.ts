import { listSnapshots } from '../lib/snapshot'
import { shapeBrowse } from '../lib/browse'

// One page per (codebase, type) pair on disk. Each page carries its OWN
// render-ready slice in params (the VitePress dynamic-route data mechanism):
// shapeBrowse pre-resolves friendly types, categories, source links, version
// walks and anchors at build time, so the browse component derives nothing.
// The clean /<codebase>/<type> route is the D22 anchor host (#<case-folded-name>).
export default {
  paths() {
    return listSnapshots().map(({ codebase, type }) => ({
      params: { codebase, type, browse: shapeBrowse(codebase, type) }
    }))
  }
}
