#!/usr/bin/env python3
"""PAK file reader for Quake pak0/pak1 archives.

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
import struct
import sys
from pathlib import Path
from typing import Iterable


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


def main() -> int:
    ap = argparse.ArgumentParser(description='Extract maps/*.bsp from Quake PAK archives.')
    ap.add_argument('--pak', action='append', required=True, type=Path,
                    help='Path to a pak0.pak / pak1.pak file. Repeatable.')
    ap.add_argument('--out', required=True, type=Path,
                    help='Output directory for extracted .bsp files.')
    args = ap.parse_args()
    extracted = extract_maps(args.pak, args.out)
    for name in extracted:
        print(name)
    print(f'\nExtracted {len(extracted)} maps to {args.out}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
