import { defineLoader } from 'vitepress'
import { buildSearchRecords } from '../../lib/search-builder'
import type { SearchRecord } from '../../lib/search-index'

declare const data: SearchRecord[]
export { data }

export default defineLoader({
  watch: ['../../data/*.json'],
  load(): SearchRecord[] {
    return buildSearchRecords()
  },
})
