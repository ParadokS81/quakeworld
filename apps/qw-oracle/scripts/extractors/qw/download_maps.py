#!/usr/bin/env python3
"""Download BSPs from maps.quakeworld.nu.

Strategy:
  1. Walk /base/ index -- server-admin-curated baseline (~216 BSPs).
  2. For every name in seeds/qw-stats-cache.json that's NOT in /base/,
     try /all/ (~30-40 supplemental adds).
  3. Manual seeds in seeds/qw-map-seed.yaml under the 'extra_maps:' key
     get pulled too (overrides allow naming a specific path).

Idempotent: skips files already present in the cache dir with non-zero size.
"""
import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

UA = 'Mozilla/5.0 (qw-oracle map-knowledge downloader)'
BASE_URL = 'https://maps.quakeworld.nu/base/'
ALL_URL  = 'https://maps.quakeworld.nu/all/'

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
    ap.add_argument('--stats-cache', type=Path,
                    default=Path(__file__).parent / 'seeds' / 'qw-stats-cache.json')
    args = ap.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)

    base_files = list_index(BASE_URL)
    print(f'/base/ has {len(base_files)} bsps', file=sys.stderr)

    base_names = set(f.lower() for f in base_files)
    new_count = 0
    for name in base_files:
        url = BASE_URL + name
        dest = args.cache_dir / name
        if download_one(url, dest):
            new_count += 1
            print(f'  +base {name}', file=sys.stderr)
    print(f'  base: {new_count} new', file=sys.stderr)

    if args.stats_cache.exists():
        stats = json.loads(args.stats_cache.read_text())
        wanted = sorted(stats.keys())
        supp_count = 0
        for stem in wanted:
            bsp_name = f'{stem}.bsp'
            if bsp_name.lower() in base_names:
                continue
            dest = args.cache_dir / bsp_name
            if dest.exists() and dest.stat().st_size > 0:
                continue
            try:
                if download_one(ALL_URL + bsp_name, dest):
                    supp_count += 1
                    print(f'  +supp {bsp_name}', file=sys.stderr)
            except Exception as e:
                print(f'  miss {bsp_name}: {e}', file=sys.stderr)
        print(f'  supplement: {supp_count} new', file=sys.stderr)
    else:
        print(f'  stats cache missing at {args.stats_cache}; skipping supplement', file=sys.stderr)

    total = sum(1 for p in args.cache_dir.iterdir() if p.suffix == '.bsp')
    print(f'cache now holds {total} bsps in {args.cache_dir}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
