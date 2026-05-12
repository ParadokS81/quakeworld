#!/usr/bin/env python3
"""PAK file reader for Quake pak0/pak1 archives.

Two modes:
  --out DIR        Extract playable maps/*.bsp into DIR.
  --manifest FILE  Write XXH3-128 + SHA-256 hash manifest of every PAK entry to FILE.

PAK format (12-byte header + flat directory):
  char[4]  magic = "PACK"
  int32    dir_offset
  int32    dir_size           # bytes; entry count = dir_size // 64
  ...
  per-entry (64 bytes each, at dir_offset):
    char[56] path  (NUL-padded)
    int32    file_offset
    int32    file_size
"""
import argparse
import hashlib
import json
import struct
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import xxhash


def list_pak_entries(pak_path: Path) -> list[tuple[str, int, int]]:
    """Return [(path, offset, size), ...] for every file in the PAK."""
    data = Path(pak_path).read_bytes()
    if data[:4] != b'PACK':
        raise ValueError(f'Not a PAK file (magic {data[:4]!r}): {pak_path}')
    dir_off, dir_size = struct.unpack('<II', data[4:12])
    entries: list[tuple[str, int, int]] = []
    n = dir_size // 64
    for i in range(n):
        rec = data[dir_off + i * 64 : dir_off + (i + 1) * 64]
        name = rec[:56].split(b'\x00', 1)[0].decode('latin-1')
        off, sz = struct.unpack('<II', rec[56:64])
        entries.append((name, off, sz))
    return entries


def extract_maps(pak_paths: Iterable[Path], out_dir: Path) -> list[str]:
    """Extract every maps/*.bsp from the given PAK files into out_dir.

    Filters out b_*.bsp (Quake ammo-box models, not playable maps).
    Returns the basenames extracted.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    extracted: list[str] = []
    for pak_path in pak_paths:
        pak_path = Path(pak_path)
        data = pak_path.read_bytes()
        for name, off, sz in list_pak_entries(pak_path):
            if not name.startswith('maps/') or not name.endswith('.bsp'):
                continue
            basename = name.split('/', 1)[1]
            # b_*.bsp are ammo box pickup models (b_shell0, b_rock1, etc.),
            # not playable maps -- skip them.
            if basename.startswith('b_'):
                continue
            (out_dir / basename).write_bytes(data[off:off + sz])
            extracted.append(basename)
    return extracted


def hash_pak_contents(pak_path: Path, label: str) -> list[dict]:
    """Hash every entry inside a PAK. Returns one record per file.

    Each record: {source, path, size, xxh3_128, sha256}.
    XXH3-128 is the primary blob identity (matches slipgate's content-addressing);
    SHA-256 is a secondary integrity hash.
    """
    data = Path(pak_path).read_bytes()
    if data[:4] != b'PACK':
        raise ValueError(f'Not a PAK file (magic {data[:4]!r}): {pak_path}')
    dir_off, dir_size = struct.unpack('<II', data[4:12])
    records: list[dict] = []
    n = dir_size // 64
    for i in range(n):
        rec = data[dir_off + i * 64 : dir_off + (i + 1) * 64]
        name = rec[:56].split(b'\x00', 1)[0].decode('latin-1')
        off, sz = struct.unpack('<II', rec[56:64])
        blob = data[off:off + sz]
        records.append({
            'source': label,
            'path': name,
            'size': sz,
            'xxh3_128': xxhash.xxh3_128(blob).hexdigest(),
            'sha256': hashlib.sha256(blob).hexdigest(),
        })
    return records


def build_stock_manifest(pak_specs: list[tuple[Path, str]]) -> dict:
    """Build the stock-pak hash manifest from labeled PAKs.

    pak_specs is [(pak_path, label), ...].
    """
    all_records: list[dict] = []
    per_pak_counts: dict[str, int] = {}
    for pak_path, label in pak_specs:
        records = hash_pak_contents(pak_path, label)
        all_records.extend(records)
        per_pak_counts[label] = len(records)

    unique_xxh = len({r['xxh3_128'] for r in all_records})
    return {
        '_stats': {
            'pak_entry_counts': per_pak_counts,
            'total_entries': len(all_records),
            'unique_xxh3_128': unique_xxh,
            'duplicate_blobs': len(all_records) - unique_xxh,
        },
        'project': 'qw',
        'extracted_at': datetime.now(timezone.utc).isoformat(),
        'entries': all_records,
    }


def _derive_label(pak_path: Path) -> str:
    """Derive a default label like 'id1/pak0' from .../id1/pak0.pak."""
    return f'{pak_path.parent.name}/{pak_path.stem}'


def main() -> int:
    ap = argparse.ArgumentParser(
        description='Quake PAK archive tool: extract maps or build a stock-pak hash manifest.',
    )
    ap.add_argument('--pak', action='append', required=True, type=Path,
                    help='Path to a pak0.pak / pak1.pak file. Repeatable.')
    grp = ap.add_mutually_exclusive_group(required=True)
    grp.add_argument('--out', type=Path,
                     help='Map-extraction mode: output directory for extracted .bsp files.')
    grp.add_argument('--manifest', type=Path,
                     help='Manifest mode: output JSON path for the stock-pak hash manifest.')
    args = ap.parse_args()

    if args.out is not None:
        extracted = extract_maps(args.pak, args.out)
        for name in extracted:
            print(name)
        print(f'\nExtracted {len(extracted)} maps to {args.out}', file=sys.stderr)
    else:
        pak_specs = [(p, _derive_label(p)) for p in args.pak]
        manifest = build_stock_manifest(pak_specs)
        args.manifest.parent.mkdir(parents=True, exist_ok=True)
        args.manifest.write_text(json.dumps(manifest, indent=2))
        stats = manifest['_stats']
        print(f'Wrote manifest to {args.manifest}', file=sys.stderr)
        print(f'  total entries: {stats["total_entries"]}', file=sys.stderr)
        print(f'  unique blobs (XXH3-128): {stats["unique_xxh3_128"]}', file=sys.stderr)
        print(f'  duplicate blobs: {stats["duplicate_blobs"]}', file=sys.stderr)
        for label, count in stats['pak_entry_counts'].items():
            print(f'  {label}: {count} entries', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
