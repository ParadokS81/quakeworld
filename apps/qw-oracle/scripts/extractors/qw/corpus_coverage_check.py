#!/usr/bin/env python3
"""Corpus coverage check: validate qw-asset-types.json against the gfx.quakeworld.nu corpus.

Reads:
  - output/qw-asset-types.json                                                (catalog)
  - /home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/bundles.json         (corpus)

Writes:
  - output/qw-asset-types-coverage.md

Maps every corpus bundle's category_path to a catalog asset_type via each
type's corpus_categories field. Surfaces:
  - Coverage rate (bundles matched / total)
  - Per-asset-type bundle counts
  - Unmatched corpus categories (gaps to fold in or add as new types)
"""
import argparse
import datetime as dt
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

DEFAULT_CORPUS = Path('/home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/bundles.json')


def build_category_to_type(catalog: dict) -> dict[str, str]:
    """Build {corpus_category -> asset_type}, warning on duplicate claims."""
    mapping: dict[str, str] = {}
    for record in catalog['asset_types']:
        for cat in record.get('corpus_categories') or []:
            if cat in mapping and mapping[cat] != record['asset_type']:
                print(f'WARNING: corpus_category "{cat}" claimed by both '
                      f'{mapping[cat]} and {record["asset_type"]}; keeping {mapping[cat]}',
                      file=sys.stderr)
                continue
            mapping[cat] = record['asset_type']
    return mapping


def main() -> int:
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser(description='Coverage check: catalog vs corpus.')
    ap.add_argument('--catalog', type=Path, default=here / 'output' / 'qw-asset-types.json')
    ap.add_argument('--corpus', type=Path, default=DEFAULT_CORPUS)
    ap.add_argument('--out', type=Path, default=here / 'output' / 'qw-asset-types-coverage.md')
    args = ap.parse_args()

    if not args.corpus.exists():
        print(f'ERROR: corpus file not found at {args.corpus}', file=sys.stderr)
        return 2

    catalog = json.loads(args.catalog.read_text())
    bundles = json.loads(args.corpus.read_text())

    cat_to_type = build_category_to_type(catalog)

    bundles_by_type: Counter[str] = Counter()
    unmatched_cats: Counter[str] = Counter()
    seen_cats: set[str] = set()
    total_with_category = 0
    total_matched = 0

    for bundle in bundles:
        cat = bundle.get('category_path')
        if not cat:
            continue
        seen_cats.add(cat)
        total_with_category += 1
        if cat in cat_to_type:
            bundles_by_type[cat_to_type[cat]] += 1
            total_matched += 1
        else:
            unmatched_cats[cat] += 1

    pct_matched = (total_matched / total_with_category * 100) if total_with_category else 0.0

    type_to_cats: dict[str, list[str]] = defaultdict(list)
    for cat, t in cat_to_type.items():
        type_to_cats[t].append(cat)

    lines = [
        '# Asset Type Catalog: Corpus Coverage Report',
        '',
        f'Generated: {dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")}',
        f'Corpus source: `{args.corpus}`',
        f'Catalog source: `{args.catalog}`',
        '',
        '## Summary',
        '',
        f'- Catalog asset types: **{len(catalog["asset_types"])}**',
        f'- Corpus bundles with category: **{total_with_category}**',
        f'- Bundles matched to a catalog type: **{total_matched}** ({pct_matched:.1f}%)',
        f'- Bundles unmatched: **{total_with_category - total_matched}** ({100 - pct_matched:.1f}%)',
        f'- Unique corpus categories seen: **{len(seen_cats)}**',
        f'- Unmatched unique categories: **{len(unmatched_cats)}**',
        '',
        '## Coverage by Asset Type',
        '',
        'Sorted by bundle count descending. Types with zero bundles are kept '
        'as no-corpus-evidence rows (still valid asset types in the engine, '
        'just absent from this particular corpus).',
        '',
        '| asset_type | bundle count | corpus categories covered |',
        '|---|---|---|',
    ]

    all_types_sorted = sorted(
        ((t['asset_type'], bundles_by_type.get(t['asset_type'], 0)) for t in catalog['asset_types']),
        key=lambda x: (-x[1], x[0]),
    )
    for asset_type, count in all_types_sorted:
        cats = sorted(type_to_cats.get(asset_type, []))
        cats_display = '<br>'.join(cats) if cats else '_(none in catalog)_'
        lines.append(f'| `{asset_type}` | {count} | {cats_display} |')

    lines += [
        '',
        '## Unmatched Corpus Categories',
        '',
        'Categories present in the corpus but not claimed by any catalog asset_type. '
        'Each row is a candidate for (a) folding into an existing type via its '
        '`corpus_categories` field, or (b) adding a new asset_type.',
        '',
        '| corpus category | bundle count |',
        '|---|---|',
    ]
    if unmatched_cats:
        for cat, count in sorted(unmatched_cats.items(), key=lambda x: -x[1]):
            lines.append(f'| {cat} | {count} |')
    else:
        lines.append('| _(none -- 100% coverage)_ | -- |')

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text('\n'.join(lines) + '\n', encoding='utf-8')

    print(f'Wrote coverage report to {args.out}', file=sys.stderr)
    print(f'  bundles matched: {total_matched}/{total_with_category} ({pct_matched:.1f}%)', file=sys.stderr)
    print(f'  unmatched categories: {len(unmatched_cats)}', file=sys.stderr)
    if unmatched_cats:
        for cat, c in sorted(unmatched_cats.items(), key=lambda x: -x[1])[:10]:
            print(f'    {cat}: {c} bundles', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
