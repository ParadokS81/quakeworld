# snapshot-wiki

Full QWiki snapshot tool. Captures all articles, redirects, templates, and
categories from the quakeworld.nu MediaWiki API.

Usage:
  python3 snapshot.py [--out <path>] [--date <YYYY-MM-DD>]

Output lands at apps/qw-oracle/data/wiki-snapshots/<YYYY-MM-DD>/ by default.
Runs in ~4 minutes. No dependencies beyond Python 3.8+ stdlib.

Slug scheme: spaces -> '_', forward slashes -> '__'. This ensures 'A/B' slugs
as 'A__B' and 'A B' slugs as 'A_B' -- no collision between the two forms.

Re-run for a new snapshot: pass --date YYYY-MM-DD to name the output directory.
Past snapshots are retained as siblings; nothing is overwritten unless you point
--out at the same path.

Note on the 2026-05-04 snapshot: this was originally captured before the
double-underscore fix. Phase 0 re-fetched all 503 slash-title articles with
double-underscore slugs and removed the stale single-underscore versions. The
4 collision-victim spaceless-title files (e.g., Quakeworld_Eternal_Dm3.json,
holding the title "Quakeworld Eternal Dm3" with no slash) were preserved.
The post-Phase-0 snapshot has a uniform slug scheme; downstream parsers can
derive slugs deterministically with no helper.
