import MiniSearch from 'minisearch'

// One searchable entity. displayName + url are PRECOMPUTED so the component
// stays dumb (no codebaseLabel / template-string building at render).
export interface SearchRecord {
  id: string            // `${codebase}:${type}:${name}` -- unique across the corpus
  name: string
  description?: string
  codebase: string
  displayName: string   // codebaseLabel(codebase)
  type: string
  friendlyType?: string // derive.friendlyType(entry); undefined where absent (D11)
  anchor: string        // entityAnchor(name)
  url: string           // `/${codebase}/${type}#${anchor}`
}

export interface SearchResult {
  id: string; name: string; description?: string; codebase: string
  displayName: string; type: string; friendlyType?: string; anchor: string; url: string
}

// Client: wrap MiniSearch and return a query fn (mirrors filterEntries' shape).
// Pure of fs/Vue; safe in the browser.
export function createSearcher(records: SearchRecord[]): (query: string) => SearchResult[] {
  const ms = new MiniSearch<SearchRecord>({
    idField: 'id',
    fields: ['name', 'description'],
    storeFields: ['name', 'description', 'codebase', 'displayName', 'type', 'friendlyType', 'anchor', 'url'],
    searchOptions: { boost: { name: 3 }, prefix: true, fuzzy: 0.2, combineWith: 'AND' },
  })
  ms.addAll(records)
  return (query) => {
    const q = query.trim()
    if (q === '') return []
    return ms.search(q) as unknown as SearchResult[]
  }
}
