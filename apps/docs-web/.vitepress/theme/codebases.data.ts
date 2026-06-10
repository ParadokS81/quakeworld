import { defineLoader } from 'vitepress'
import { listSnapshots, loadSnapshot } from '../../lib/snapshot'

// VitePress build-time data loader: the ONLY VitePress-coupled data glue
// (D15). It does ALL the shaping (group by codebase, count entries, capture
// the snapshot version) so the consuming component does zero derivation. A
// later Solid port replaces THIS file with a Solid-side loader; lib/ and the
// component's render logic are untouched.
export interface CodebaseTypeSummary {
  type: string
  count: number
  snapshot_version: string
}
export interface CodebaseSummary {
  codebase: string
  types: CodebaseTypeSummary[]
}

declare const data: CodebaseSummary[]
export { data }

export default defineLoader({
  watch: ['../../data/*.json'],
  load(): CodebaseSummary[] {
    const byCodebase = new Map<string, CodebaseTypeSummary[]>()
    for (const { codebase, type } of listSnapshots()) {
      const snap = loadSnapshot(codebase, type)
      const list = byCodebase.get(codebase) ?? []
      list.push({
        type,
        count: snap.entries.length,
        snapshot_version: snap._meta.snapshot_version
      })
      byCodebase.set(codebase, list)
    }
    return [...byCodebase.entries()]
      .map(([codebase, types]) => ({
        codebase,
        types: types.sort((a, b) => a.type.localeCompare(b.type))
      }))
      .sort((a, b) => a.codebase.localeCompare(b.codebase))
  }
})
