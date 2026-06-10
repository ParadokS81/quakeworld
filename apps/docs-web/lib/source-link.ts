// Derives a GitHub source URL for a given entity (D8/D11). Only ezQuake is
// wired in Phase 2b; other codebases return undefined and the card shows
// file:line as plain text (D11 graceful degradation). Pure -- no framework
// imports.
import type { SnapshotMeta, SourceRef } from './types'

// Per-codebase GitHub repo + path prefix. ktx/mvdsv/qtv/qwfwd/qwcl are wired
// in Phase 4 (qtv/qwfwd use a version string as upstream_commit, not a SHA --
// their URL is tag-based and needs a different shape).
const REPOS: Record<string, { repo: string; prefix: string }> = {
  ezquake: { repo: 'QW-Group/ezquake-source', prefix: 'src/' },
  // ktx/mvdsv/qtv/qwfwd/qwcl: Phase 4 (also handles the qtv/qwfwd
  // version-string-not-SHA case; their URL is tag-based).
}

export function sourceUrl(
  codebase: string,
  meta: SnapshotMeta,
  ref: SourceRef
): string | undefined {
  const cfg = REPOS[codebase]
  if (cfg === undefined) return undefined
  return `https://github.com/${cfg.repo}/blob/${meta.upstream_commit}/${cfg.prefix}${ref.file}#L${ref.line}`
}
