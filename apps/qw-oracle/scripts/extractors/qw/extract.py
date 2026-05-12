#!/usr/bin/env python3
"""Main extractor: walk pak-cache (id1 stock) + bsp-cache (community), summarize
each BSP, join with stats and seed, emit qw-maps-ast.json for the loader.

Outputs an array of map records keyed in the same field shape the loader expects.
Source attribution: BSPs found in pak-cache get source_bsp_url='pak0/pak1 stock id1';
BSPs found in bsp-cache get source_bsp_url='https://maps.quakeworld.nu/base/<file>'.
If a name appears in both dirs, pak-cache wins (id1 canonical).
"""
import argparse
import datetime as dt
import json
import sys
from pathlib import Path

import yaml

from bsp_parser import summarize_map


def derive_inferred_gamemodes(
    spawn_dm: int,
    popularity_by_mode: dict[str, int] | None,
) -> list[str]:
    """Compute the gamemode list following the spec rules."""
    POP_THRESHOLD = 1000
    if popularity_by_mode:
        modes = [m for m in ('1on1', '2on2', '4on4', 'ffa')
                 if popularity_by_mode.get(m, 0) > POP_THRESHOLD]
        if modes:
            return modes
    # Fallback: spawn-count heuristic when no popularity data.
    if spawn_dm <= 4:
        return ['1on1']
    if spawn_dm <= 8:
        return ['2on2']
    return ['4on4', 'ffa']


def build_map_record(
    summary: dict,
    stats_entry: dict | None,
    seed_override: dict | None,
    source_bsp_url: str,
    extracted_at: str,
) -> dict:
    """Combine BSP summary + stats + seed-overrides into a loader-shaped record."""
    if seed_override:
        if seed_override.get('author'):
            summary['author'] = seed_override['author']
        notes = seed_override.get('notes')
    else:
        notes = None

    pop_by_mode = stats_entry['by_mode'] if stats_entry else None
    inferred = derive_inferred_gamemodes(summary['spawn_summary']['dm'], pop_by_mode)

    return {
        'canonical_name': summary['canonical_name'],
        'file_name': summary['file_name'],
        'display_name': summary['display_name'],
        'author': summary['author'],
        'bsp_version': summary['bsp_version'],
        'bsp_size_bytes': summary['bsp_size_bytes'],
        'bsp_sha256': summary['bsp_sha256'],
        'worldspawn': summary['worldspawn'],
        'entity_count': summary['entity_count'],
        'class_counts': summary['class_counts'],
        'item_summary': summary['item_summary'],
        'spawn_summary': summary['spawn_summary'],
        'features': summary['features'],
        'wads_referenced': summary['wads_referenced'],
        'textures': summary['textures'],
        'inferred_gamemodes': inferred,
        'popularity_total':   stats_entry['total'] if stats_entry else None,
        'popularity_by_mode': stats_entry['by_mode'] if stats_entry else None,
        'popularity_rank':    stats_entry['rank']  if stats_entry else None,
        'notes': notes,
        'source_bsp_url': source_bsp_url,
        'extracted_at': extracted_at,
    }


def collect_bsps(pak_dir: Path, base_dir: Path) -> list[tuple[Path, str]]:
    """Return [(bsp_path, source_bsp_url)] across both source dirs.

    pak-cache wins on conflict (id1 stock is canonical). bsp-cache entries
    that duplicate a pak-cache name are skipped silently.
    """
    seen: set[str] = set()
    out: list[tuple[Path, str]] = []
    if pak_dir.exists():
        for p in sorted(pak_dir.iterdir()):
            if p.suffix != '.bsp':
                continue
            seen.add(p.name.lower())
            out.append((p, 'pak0/pak1 stock id1'))
    if base_dir.exists():
        for p in sorted(base_dir.iterdir()):
            if p.suffix != '.bsp':
                continue
            if p.name.lower() in seen:
                continue
            seen.add(p.name.lower())
            out.append((p, f'https://maps.quakeworld.nu/base/{p.name}'))
    return out


def main() -> int:
    here = Path(__file__).resolve().parent
    # here = .../apps/qw-oracle/scripts/extractors/qw/
    # parents[2] = qw-oracle (the right anchor for `data/`).
    qw_oracle_root = here.parents[2]
    ap = argparse.ArgumentParser()
    ap.add_argument('--pak-dir', type=Path, default=qw_oracle_root / 'data' / 'pak-cache')
    ap.add_argument('--bsp-dir', type=Path, default=qw_oracle_root / 'data' / 'bsp-cache')
    ap.add_argument('--stats-cache', type=Path, default=here / 'seeds' / 'qw-stats-cache.json')
    ap.add_argument('--seed', type=Path, default=here / 'seeds' / 'qw-map-seed.yaml')
    ap.add_argument('--out', type=Path, default=here / 'output' / 'qw-maps-ast.json')
    args = ap.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)

    stats: dict[str, dict] = {}
    if args.stats_cache.exists():
        stats = json.loads(args.stats_cache.read_text())
    else:
        print(f'WARNING: stats cache missing at {args.stats_cache}; popularity columns will be NULL', file=sys.stderr)

    seed_doc = yaml.safe_load(args.seed.read_text()) or {}
    overrides: dict[str, dict] = seed_doc.get('overrides') or {}

    extracted_at = dt.datetime.utcnow().isoformat(timespec='seconds') + 'Z'
    bsps = collect_bsps(args.pak_dir, args.bsp_dir)
    print(f'walking {len(bsps)} bsps (pak={args.pak_dir.name}, base={args.bsp_dir.name})', file=sys.stderr)

    records: list[dict] = []
    errors: list[tuple[str, str]] = []
    for bsp_path, source_url in bsps:
        try:
            summary = summarize_map(bsp_path)
        except Exception as e:
            errors.append((bsp_path.name, str(e)))
            continue
        record = build_map_record(
            summary,
            stats_entry=stats.get(summary['canonical_name']),
            seed_override=overrides.get(summary['canonical_name']),
            source_bsp_url=source_url,
            extracted_at=extracted_at,
        )
        records.append(record)

    args.out.write_text(json.dumps(records, indent=2, sort_keys=False) + '\n', encoding='utf-8')
    print(f'wrote {len(records)} records to {args.out}', file=sys.stderr)
    if errors:
        print(f'  ERRORS: {len(errors)}', file=sys.stderr)
        for name, msg in errors[:10]:
            print(f'    {name}: {msg}', file=sys.stderr)
    return 0 if not errors else 1


if __name__ == '__main__':
    sys.exit(main())
