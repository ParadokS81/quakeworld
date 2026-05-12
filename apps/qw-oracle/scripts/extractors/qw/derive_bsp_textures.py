#!/usr/bin/env python3
"""Derive a global BSP texture catalog from qw-maps-ast.json.

Reads the maps extract and emits {texture_name: [maps_that_reference_it]}.
Used by slipgate's asset classifier (filename-pattern tier for loose
.tga/.png/.bmp drops) and by texture-pack-vs-map attribution queries.

Quake texture-name prefixes are preserved verbatim:
  *<name>   liquid (water / lava / slime / teleporter)
  +<n><name> animated frame (+0buttn, +1buttn, ...)
  #<name>   special (e.g. #teleport per gfx_faq QID 22)
  sky*      sky textures
"""
import argparse
import datetime as dt
import json
import sys
from collections import defaultdict
from pathlib import Path


def derive_catalog(maps_path: Path) -> dict:
    maps = json.loads(maps_path.read_text())
    texture_to_maps: dict[str, set[str]] = defaultdict(set)
    for m in maps:
        canonical = m['canonical_name']
        for tex in m.get('textures', []):
            texture_to_maps[tex].add(canonical)

    sorted_textures = {tex: sorted(maps_list) for tex, maps_list in texture_to_maps.items()}

    total_refs = sum(len(v) for v in sorted_textures.values())
    shared = sum(1 for v in sorted_textures.values() if len(v) > 1)
    return {
        '_stats': {
            'source_maps': len(maps),
            'unique_textures': len(sorted_textures),
            'total_texture_references': total_refs,
            'shared_textures': shared,
            'unique_to_one_map': len(sorted_textures) - shared,
        },
        'project': 'qw',
        'extracted_at': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
        'textures': dict(sorted(sorted_textures.items())),
    }


def main() -> int:
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser(description='Derive global texture catalog from qw-maps-ast.json.')
    ap.add_argument('--maps', type=Path, default=here / 'output' / 'qw-maps-ast.json')
    ap.add_argument('--out', type=Path, default=here / 'output' / 'qw-bsp-textures.json')
    args = ap.parse_args()

    catalog = derive_catalog(args.maps)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(catalog, indent=2) + '\n', encoding='utf-8')

    stats = catalog['_stats']
    print(f'Wrote catalog to {args.out}', file=sys.stderr)
    print(f'  source maps: {stats["source_maps"]}', file=sys.stderr)
    print(f'  unique textures: {stats["unique_textures"]}', file=sys.stderr)
    print(f'  total references: {stats["total_texture_references"]}', file=sys.stderr)
    print(f'  shared (used in >1 map): {stats["shared_textures"]}', file=sys.stderr)
    print(f'  unique to one map: {stats["unique_to_one_map"]}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
