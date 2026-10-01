#!/usr/bin/env python3
"""
hash-corpus.py
Compute XXH3-128 hashes for every member of every zip/pk3 bundle in the corpus.
Output: NDJSON at scripts/output/blobs.ndjson
"""

import json
import sys
import time
import zipfile
from pathlib import Path

import xxhash

# The corpus lives outside git (sandbox); outputs stay there too so the repo holds only code.
SANDBOX = Path.home() / "projects/sandboxes/qw3-abab-gfx"
CORPUS_DIR = SANDBOX / "files"
OUTPUT_DIR = SANDBOX / "scripts/output"
OUTPUT_FILE = OUTPUT_DIR / "blobs.ndjson"


def bundle_id_from_name(filename: str) -> int:
    """Extract integer prefix from '350.zip' or '0.pk3'."""
    stem = Path(filename).stem
    return int(stem)


def hash_bundle(bundle_path: Path, out_fh):
    """Hash all non-directory members of a zip/pk3 and write NDJSON lines."""
    bundle_file = bundle_path.name
    bid = bundle_id_from_name(bundle_file)
    count = 0

    with zipfile.ZipFile(bundle_path, "r") as zf:
        for info in zf.infolist():
            # Skip directory entries (zero-size or trailing slash)
            if info.is_dir():
                continue
            data = zf.read(info.filename)
            digest = xxhash.xxh3_128(data).hexdigest()
            record = {
                "bundle_id": bid,
                "bundle_file": bundle_file,
                "member_path": info.filename,
                "size_bytes": len(data),
                "xxh3_128": digest,
            }
            out_fh.write(json.dumps(record, separators=(",", ":")) + "\n")
            count += 1

    return count


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    bundles = sorted(
        [p for p in CORPUS_DIR.iterdir() if p.suffix.lower() in (".zip", ".pk3")],
        key=lambda p: bundle_id_from_name(p.name),
    )

    total_bundles = len(bundles)
    zip_count = sum(1 for p in bundles if p.suffix.lower() == ".zip")
    pk3_count = sum(1 for p in bundles if p.suffix.lower() == ".pk3")
    print(
        f"Found {total_bundles} bundles ({zip_count} zips, {pk3_count} pk3s)",
        file=sys.stderr,
    )

    total_files = 0
    corrupted = []
    start = time.monotonic()

    with open(OUTPUT_FILE, "w", encoding="utf-8") as out_fh:
        for i, bundle_path in enumerate(bundles, 1):
            try:
                n = hash_bundle(bundle_path, out_fh)
                total_files += n
            except (zipfile.BadZipFile, Exception) as exc:
                bid = bundle_id_from_name(bundle_path.name)
                corrupted.append((bid, type(exc).__name__, str(exc)))
                print(
                    f"  CORRUPTED bundle_id={bid} ({bundle_path.name}): {type(exc).__name__}: {exc}",
                    file=sys.stderr,
                )

            if i % 50 == 0 or i == total_bundles:
                elapsed = time.monotonic() - start
                print(
                    f"  [{i}/{total_bundles}] {total_files} files hashed so far  ({elapsed:.1f}s)",
                    file=sys.stderr,
                )

    elapsed = time.monotonic() - start
    print(f"\nDone in {elapsed:.1f}s", file=sys.stderr)
    print(f"Total bundles processed: {total_bundles - len(corrupted)}", file=sys.stderr)
    print(f"Total files hashed: {total_files}", file=sys.stderr)
    if corrupted:
        print(f"Corrupted bundles ({len(corrupted)}):", file=sys.stderr)
        for bid, exc_type, msg in corrupted:
            print(f"  bundle_id={bid}  {exc_type}: {msg}", file=sys.stderr)
    print(f"Output: {OUTPUT_FILE}", file=sys.stderr)


if __name__ == "__main__":
    main()
