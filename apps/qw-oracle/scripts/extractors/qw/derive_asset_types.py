#!/usr/bin/env python3
"""Derive consolidated asset-type catalog from seed YAML + L1 loader_sites + pak manifest.

Reads:
  - seeds/qw-asset-types.yaml          (curated seed)
  - ../ezquake/output/ezquake-asset-loader-sites-ast.json
  - ../fte/output/fte-asset-loader-sites-ast.json
  - output/qw-stock-paks.json

Writes:
  - output/qw-asset-types.json

For each seed asset_type, the derive step attaches:
  - l1_evidence.{ezquake,fte}: matching loader_site canonical_ids
  - stock_origins: matching entries from the stock-pak manifest
"""
import argparse
import datetime as dt
import fnmatch
import json
import sys
from pathlib import Path

import yaml


def load_loader_sites(path: Path) -> list[dict]:
    if not path.exists():
        return []
    data = json.loads(path.read_text())
    return data.get('loader_sites', [])


def match_l1_evidence(seed_type: dict, loader_sites: list[dict], engine: str) -> list[str]:
    """Match loader sites by function names or bare reads_category_id values."""
    function_names = set(seed_type.get('l1_hint_function_names') or [])
    bare_categories = set(seed_type.get('l1_hint_bare_categories') or [])
    full_cat_ids = {f'{engine}:asset_category:{c}' for c in bare_categories}

    matched: set[str] = set()
    for site in loader_sites:
        fn = site.get('function_name') or ''
        enc = site.get('enclosing_function') or ''
        cat = site.get('reads_category_id') or ''
        cid = site.get('canonical_id') or ''
        if (fn in function_names) or (enc in function_names) or (cat in full_cat_ids):
            matched.add(cid)
    return sorted(matched)


def match_stock_origins(seed_type: dict, pak_entries: list[dict]) -> list[dict]:
    """Match pak entries by path patterns (fnmatch; `*` matches across separators)."""
    patterns: list[str] = seed_type.get('stock_origin_paths') or []
    origins: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for pattern in patterns:
        for entry in pak_entries:
            if fnmatch.fnmatchcase(entry['path'], pattern):
                key = (entry['source'], entry['path'])
                if key in seen:
                    continue
                seen.add(key)
                origins.append({
                    'source': entry['source'],
                    'path': entry['path'],
                    'size': entry['size'],
                    'xxh3_128': entry['xxh3_128'],
                })
    return origins


def enrich(
    seed_type: dict,
    ezquake_sites: list[dict],
    fte_sites: list[dict],
    pak_entries: list[dict],
) -> dict:
    record = dict(seed_type)
    record['l1_evidence'] = {
        'ezquake': match_l1_evidence(seed_type, ezquake_sites, 'ezquake'),
        'fte':     match_l1_evidence(seed_type, fte_sites,     'fte'),
    }
    record['stock_origins'] = match_stock_origins(seed_type, pak_entries)
    # Drop the hint fields -- they're inputs to enrichment, not part of the
    # consumed catalog.
    for hint in ('l1_hint_function_names', 'l1_hint_bare_categories', 'stock_origin_paths'):
        record.pop(hint, None)
    return record


def main() -> int:
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser(description='Derive qw-asset-types.json from seed + L1 + paks.')
    ap.add_argument('--seed', type=Path, default=here / 'seeds' / 'qw-asset-types.yaml')
    ap.add_argument('--ezquake-sites', type=Path,
                    default=here.parent / 'ezquake' / 'output' / 'ezquake-asset-loader-sites-ast.json')
    ap.add_argument('--fte-sites', type=Path,
                    default=here.parent / 'fte' / 'output' / 'fte-asset-loader-sites-ast.json')
    ap.add_argument('--paks', type=Path, default=here / 'output' / 'qw-stock-paks.json')
    ap.add_argument('--out', type=Path, default=here / 'output' / 'qw-asset-types.json')
    args = ap.parse_args()

    seed_doc = yaml.safe_load(args.seed.read_text())
    seed_types: list[dict] = seed_doc.get('asset_types', [])

    ezq_sites = load_loader_sites(args.ezquake_sites)
    fte_sites = load_loader_sites(args.fte_sites)
    pak_doc = json.loads(args.paks.read_text())
    pak_entries: list[dict] = pak_doc.get('entries', [])

    enriched = [enrich(t, ezq_sites, fte_sites, pak_entries) for t in seed_types]

    types_with_ezq = sum(1 for r in enriched if r['l1_evidence']['ezquake'])
    types_with_fte = sum(1 for r in enriched if r['l1_evidence']['fte'])
    types_with_stock = sum(1 for r in enriched if r['stock_origins'])

    out_doc = {
        '_stats': {
            'asset_type_count': len(enriched),
            'types_with_l1_evidence_ezquake': types_with_ezq,
            'types_with_l1_evidence_fte':     types_with_fte,
            'types_with_stock_origin':        types_with_stock,
            'total_l1_evidence_refs_ezquake': sum(len(r['l1_evidence']['ezquake']) for r in enriched),
            'total_l1_evidence_refs_fte':     sum(len(r['l1_evidence']['fte'])     for r in enriched),
            'total_stock_origin_refs':        sum(len(r['stock_origins']) for r in enriched),
        },
        'project': 'qw',
        'extracted_at': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
        'asset_types': enriched,
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out_doc, indent=2) + '\n', encoding='utf-8')

    print(f'Wrote catalog to {args.out}', file=sys.stderr)
    print(f'  asset types: {len(enriched)}', file=sys.stderr)
    print(f'  with ezQuake L1 evidence: {types_with_ezq}', file=sys.stderr)
    print(f'  with FTE L1 evidence:     {types_with_fte}', file=sys.stderr)
    print(f'  with stock origin:        {types_with_stock}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
