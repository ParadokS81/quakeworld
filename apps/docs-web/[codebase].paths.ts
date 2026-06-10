import { listSnapshots } from './lib/snapshot'
import { shapeCodebaseLanding } from './lib/browse'

// One page per distinct codebase; each carries its per-type summary in params
// (a 7th codebase like FTE later is a Phase-1 emit, no change here; D2/D14).
export default {
  paths() {
    const codebases = [...new Set(listSnapshots().map((s) => s.codebase))]
    return codebases.sort().map((codebase) => ({
      params: { codebase, landing: shapeCodebaseLanding(codebase) }
    }))
  }
}
