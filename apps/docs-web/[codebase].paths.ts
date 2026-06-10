import { listSnapshots } from './lib/snapshot'

// One page per distinct codebase, enumerated from the data dir (data-driven --
// a 7th codebase like FTE later is a Phase-1 emit, no change here; D2/D14).
export default {
  paths() {
    const codebases = [...new Set(listSnapshots().map((s) => s.codebase))]
    return codebases.sort().map((codebase) => ({ params: { codebase } }))
  }
}
