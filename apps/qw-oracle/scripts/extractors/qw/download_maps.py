#!/usr/bin/env python3
"""Download BSPs from maps.quakeworld.nu/base/.

Strategy: walk the /base/ index (server-admin-curated baseline, ~216 BSPs)
and download every .bsp into the local cache dir. /base/ is the right scope:
it's the curated set most server admins keep, the maps the QW community
actually plays. The /all/ archive (~6600 files) is out of scope; /gpl/ has
id1 stock, but those come from the user's pak0/pak1 via pak_extract.py.

Idempotent: skips files already present in the cache dir with non-zero size.
"""
import argparse
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

UA = 'Mozilla/5.0 (qw-oracle map-knowledge downloader)'
BASE_URL = 'https://maps.quakeworld.nu/base/'

_HREF_RE = re.compile(r'href="([^"]+\.bsp)"')


def list_index(url: str) -> list[str]:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        html = resp.read().decode('utf-8', errors='replace')
    return [m for m in _HREF_RE.findall(html) if not m.endswith('/')]


def download_one(url: str, dest: Path, *, retries: int = 2) -> bool:
    """Download url to dest. Returns True if downloaded, False if skipped (already present)."""
    if dest.exists() and dest.stat().st_size > 0:
        return False
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    last_err: Exception | None = None
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = resp.read()
            dest.write_bytes(body)
            return True
        except urllib.error.URLError as e:
            last_err = e
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f'download failed for {url}: {last_err}')


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache-dir', type=Path,
                    default=Path(__file__).resolve().parents[3] / 'data' / 'bsp-cache')
    args = ap.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)

    base_files = list_index(BASE_URL)
    print(f'/base/ has {len(base_files)} bsps', file=sys.stderr)

    new_count = 0
    for name in base_files:
        url = BASE_URL + name
        dest = args.cache_dir / name
        if download_one(url, dest):
            new_count += 1
            print(f'  +base {name}', file=sys.stderr)
    print(f'  base: {new_count} new', file=sys.stderr)

    total = sum(1 for p in args.cache_dir.iterdir() if p.suffix == '.bsp')
    print(f'cache now holds {total} bsps in {args.cache_dir}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
