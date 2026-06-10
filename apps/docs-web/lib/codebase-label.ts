// Friendly display labels for codebase slugs -- the same casing the nav in
// .vitepress/config.ts uses. A codebase with no entry here (a 7th like FTE,
// later) degrades to its raw slug: a lookup with a fallback, never a
// per-codebase branch (D2/D14). Pure -- no fs, no Vue -- so it ports to the
// Solid platform untouched (D15).
const CODEBASE_LABELS: Record<string, string> = {
  ezquake: 'ezQuake',
  ktx: 'KTX',
  mvdsv: 'MVDSV',
  qtv: 'QTV',
  qwfwd: 'QWFWD',
  qwcl: 'QWCL',
}

export function codebaseLabel(slug: string): string {
  return CODEBASE_LABELS[slug] ?? slug
}
