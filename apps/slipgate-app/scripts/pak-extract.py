#!/usr/bin/env python3
"""Extract a Quake .pak file to a directory.

Pak format (per Quake source):
  Header (12 bytes):
    id[4]      "PACK"
    diroffset  int32 LE  - offset to file table from start of file
    dirlen     int32 LE  - length of file table in bytes
  Each directory entry (64 bytes):
    name[56]   null-padded relative path
    filepos    int32 LE  - offset to file data
    filelen    int32 LE  - length of file in bytes
"""

import os
import struct
import sys


def extract_pak(pak_path, output_dir):
    with open(pak_path, 'rb') as f:
        magic = f.read(4)
        if magic != b'PACK':
            sys.exit(f"Not a pak file: bad magic {magic!r}")

        diroffset, dirlen = struct.unpack('<ii', f.read(8))
        num_files = dirlen // 64
        if dirlen % 64 != 0:
            print(f"Warning: directory length {dirlen} not divisible by 64", file=sys.stderr)

        f.seek(diroffset)
        entries = []
        for _ in range(num_files):
            entry = f.read(64)
            name_bytes = entry[:56]
            null_idx = name_bytes.find(b'\x00')
            if null_idx >= 0:
                name_bytes = name_bytes[:null_idx]
            name = name_bytes.decode('ascii', errors='replace')
            filepos, filelen = struct.unpack('<ii', entry[56:64])
            if name:
                entries.append((name, filepos, filelen))

        os.makedirs(output_dir, exist_ok=True)
        for name, filepos, filelen in entries:
            if '..' in name.split('/'):
                print(f"Skipping suspicious path: {name}", file=sys.stderr)
                continue
            target = os.path.join(output_dir, name)
            target_parent = os.path.dirname(target)
            if target_parent:
                os.makedirs(target_parent, exist_ok=True)
            f.seek(filepos)
            data = f.read(filelen)
            with open(target, 'wb') as out:
                out.write(data)

        print(f"Extracted {len(entries)} files to {output_dir}")
        for name, _, length in entries[:10]:
            print(f"  {name} ({length} bytes)")
        if len(entries) > 10:
            print(f"  ... and {len(entries) - 10} more")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <pak-file> <output-dir>", file=sys.stderr)
        sys.exit(1)
    extract_pak(sys.argv[1], sys.argv[2])
