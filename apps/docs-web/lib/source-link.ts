// Derives a GitHub source URL for a given entity (D8/D11). Pure -- no framework
// imports. Returns undefined when the URL cannot be constructed (D11 graceful
// degradation); the card then shows plain file:line as text.
import type { SnapshotMeta, SourceRef } from './types'

// Per-codebase GitHub repo + source-path prefix. `prefix` is prepended to
// source_ref.file to form the repo-root-relative blob path. The prefix DIFFERS
// by codebase because the extractors record source_ref.file differently --
// verified 2026-06-10 against live data/*-*.json (all entity types) + HTTP-200
// spot-checks of the constructed URLs:
//
//   ezquake: repo QW-Group/ezquake-source -- source_ref.file is a BARE filename
//            (e.g. 'sv_main.c'); the files live under src/, so prefix 'src/'.
//   ktx:     repo QW-Group/ktx            -- source_ref.file is ALREADY repo-
//            relative (e.g. 'src/world.c'), so prefix is '' (empty). A 'src/'
//            prefix here would double to 'src/src/world.c' -> 404 (F15).
//   mvdsv:   repo QW-Group/mvdsv          -- same as ktx: source_ref.file is
//            already 'src/...', so prefix is '' (empty) (F15).
//   qwcl:    repo id-Software/Quake       -- source_ref.file is a BARE filename
//            (e.g. 'snd_dma.c'); the file lives at QW/client/<file>, so prefix
//            'QW/client/'.
//
// qtv and qwfwd are OMITTED because their upstream_commit is a version STRING
// ('1.16-dev' / '1.40-dev'), not a git SHA -- the /blob/{ref}/ template would
// produce a broken link. Both are frozen vendored snapshots with no .git dir
// (no tag resolution possible). Per F6/D11 they degrade to plain file:line text.
const REPOS: Record<string, { repo: string; prefix: string }> = {
  ezquake: { repo: 'QW-Group/ezquake-source', prefix: 'src/' },
  ktx:     { repo: 'QW-Group/ktx',            prefix: '' },
  mvdsv:   { repo: 'QW-Group/mvdsv',          prefix: '' },
  qwcl:    { repo: 'id-Software/Quake',       prefix: 'QW/client/' },
  // qtv:  omitted -- upstream_commit '1.16-dev' is not a SHA (F6)
  // qwfwd: omitted -- upstream_commit '1.40-dev' is not a SHA (F6)
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
