#!/usr/bin/env python3
"""Fetch the map-popularity table from stats.quakeworld.nu and write a JSON cache.

The page is paginated (30 rows per page). The default top-200 we want is
covered by pages 1-7. Output: seeds/qw-stats-cache.json with shape
{ "name": { "total": int, "by_mode": { "1on1": int, "2on2": int, "4on4": int, "ffa": int }, "rank": int } }.
Manual run; refresh quarterly.
"""
import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

UA = 'Mozilla/5.0 (qw-oracle map-knowledge stats fetcher)'
INDEX_URL = 'http://stats.quakeworld.nu/index.php?a=maps&order=&page={page}&sort=totalMatches&sortOrder=desc'


def fetch_page(page: int) -> str:
    req = urllib.request.Request(INDEX_URL.format(page=page), headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode('utf-8', errors='replace')


_ROW_RE = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL)
_NAME_RE = re.compile(r'currentMap=([a-z0-9_-]+)"')
_TD_RE = re.compile(r'<td[^>]*>(.*?)</td>', re.DOTALL)
_TAG_STRIP = re.compile(r'<[^>]+>')


def parse_page(html: str) -> list[tuple[str, list[int]]]:
    """Return [(map_name, [matches, frags, time, 1on1, 2on2, 4on4, ffa]), ...] for this page."""
    out: list[tuple[str, list[int]]] = []
    seen: set[str] = set()
    for row in _ROW_RE.findall(html):
        if 'currentMap=' not in row:
            continue
        name_match = _NAME_RE.search(row)
        if not name_match:
            continue
        name = name_match.group(1)
        if name in seen:
            continue
        seen.add(name)
        cells = _TD_RE.findall(row)
        nums: list[int] = []
        for c in cells:
            text = _TAG_STRIP.sub('', c).strip().replace(',', '')
            m = re.match(r'^(\d+)', text)
            if m:
                nums.append(int(m.group(1)))
        out.append((name, nums))
    return out


def fetch_top_n(n: int) -> dict[str, dict]:
    """Fetch enough pages to cover the top N maps; return rank-keyed cache."""
    cache: dict[str, dict] = {}
    rank = 0
    page = 1
    while rank < n:
        html = fetch_page(page)
        rows = parse_page(html)
        if not rows:
            break  # past last page
        for name, nums in rows:
            if rank >= n:
                break
            if len(nums) < 7:
                continue  # malformed row
            rank += 1
            cache[name] = {
                'total':   nums[0],
                'by_mode': {'1on1': nums[3], '2on2': nums[4], '4on4': nums[5], 'ffa': nums[6]},
                'rank':    rank,
            }
        page += 1
        if page > 20:
            break  # safety
    return cache


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--top', type=int, default=200, help='How many top-ranked maps to fetch.')
    ap.add_argument('--out', type=Path,
                    default=Path(__file__).parent / 'seeds' / 'qw-stats-cache.json')
    args = ap.parse_args()
    cache = fetch_top_n(args.top)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(cache, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(f'wrote {len(cache)} maps to {args.out}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
