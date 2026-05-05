#!/usr/bin/env python3
"""QWiki full snapshot tool.

Captures all articles (ns=0), all redirects, all categories, all templates (ns=10)
from the quakeworld.nu MediaWiki 1.35 API. Writes one JSON file per page under:

  <out_dir>/articles/<slug>.json
  <out_dir>/templates/<slug>.json
  <out_dir>/redirects.json
  <out_dir>/categories.json
  <out_dir>/article-list.json
  <out_dir>/template-list.json
  <out_dir>/manifest.json

Usage:
  python3 snapshot.py [--out <path>] [--date <YYYY-MM-DD>]

Defaults:
  --out   apps/qw-oracle/data/wiki-snapshots/<today>
  --date  today (used only to name the output directory when --out is omitted)

Runtime: ~4 min wall-clock for a full snapshot. Polite rate-limiting (0.3s between calls).
Dependencies: Python 3.8+ stdlib only.
"""
import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API = "https://www.quakeworld.nu/w/api.php"
HEADERS = {"User-Agent": "qw-oracle-snapshot/1.1 (Layer3 community-reference; contact: oracle)"}
RATE_DELAY = 0.3


def api_get(params: dict, retries: int = 3) -> dict:
    """Single API GET with retry on transient errors."""
    params = {**params, "format": "json"}
    qs = urllib.parse.urlencode(params)
    last: Exception | None = None
    for i in range(retries):
        try:
            req = urllib.request.Request(f"{API}?{qs}", headers=HEADERS)
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            last = e
            time.sleep(2 + i * 2)
    raise last  # type: ignore[misc]


def paginated(params: dict, list_key: str) -> list:
    """Exhaust a paginated MediaWiki list query. Returns all rows."""
    rows = []
    cont: dict = {}
    while True:
        d = api_get({**params, **cont})
        if "error" in d:
            raise RuntimeError(f"API error: {d['error']}")
        rows.extend(d.get("query", {}).get(list_key, []))
        if "continue" in d:
            cont = d["continue"]
            time.sleep(RATE_DELAY)
        else:
            break
    return rows


def slugify(title: str) -> str:
    """Stable slug for a MediaWiki article title.

    Rules:
    - Spaces become single underscore.
    - Forward slashes become double underscore (avoids collision with space-only titles).
    - All other non-alphanumeric characters except _().,-  become underscore.
    - Capped at 200 characters to avoid FS limits.

    Example:
      'Quakeworld Eternal/Dm3' -> 'Quakeworld_Eternal__Dm3'
      'Quakeworld Eternal Dm3' -> 'Quakeworld_Eternal_Dm3'  (distinct -- no collision)
    """
    s = title.replace("/", "__").replace(" ", "_")
    s = re.sub(r"[^A-Za-z0-9_().,-]", "_", s)
    return s[:200]


def enumerate_articles() -> list[dict]:
    print("Step 1: enumerate articles (ns=0, non-redirects) ...")
    rows = paginated({
        "action": "query",
        "list": "allpages",
        "apnamespace": 0,
        "apfilterredir": "nonredirects",
        "aplimit": "max",
    }, "allpages")
    result = [{"pageid": r["pageid"], "title": r["title"]} for r in rows]
    print(f"  {len(result)} articles listed")
    return result


def enumerate_redirects() -> list[dict]:
    """List all redirect pages and their targets.

    Uses allredirects with arprop=ids|title (valid values). The API returns:
      - title: the TARGET page title
      - ar_from: pageid of the redirect source
      - fromtitle: title of the redirect source (with arprop=ids)

    This gives us source->target mapping for nick-recognition alias building.
    """
    print("Step 2: enumerate redirects ...")
    rows = paginated({
        "action": "query",
        "list": "allredirects",
        "arnamespace": 0,
        "arprop": "ids|title",
        "arlimit": "max",
    }, "allredirects")
    result = []
    for r in rows:
        src = r.get("fromtitle") or r.get("from") or r.get("title")
        tgt = r.get("title")
        if src and tgt and src != tgt:
            result.append({"from": src, "to": tgt})
    print(f"  {len(result)} redirects")
    return result


def enumerate_categories() -> list[dict]:
    print("Step 3: enumerate categories ...")
    rows = paginated({
        "action": "query",
        "list": "allcategories",
        "acprop": "size",
        "aclimit": "max",
    }, "allcategories")
    result = [
        {
            "title": r["*"],
            "pages": r.get("pages", 0),
            "subcats": r.get("subcats", 0),
        }
        for r in rows
    ]
    print(f"  {len(result)} categories")
    return result


def enumerate_templates() -> list[dict]:
    print("Step 4: enumerate templates (ns=10) ...")
    rows = paginated({
        "action": "query",
        "list": "allpages",
        "apnamespace": 10,
        "apfilterredir": "nonredirects",
        "aplimit": "max",
    }, "allpages")
    result = [{"pageid": r["pageid"], "title": r["title"]} for r in rows]
    print(f"  {len(result)} templates")
    return result


def fetch_pages(titles: list[dict], label: str, out_dir: Path, batch: int = 50) -> tuple[int, list[dict]]:
    """Fetch wikitext for a list of {pageid, title} dicts. One JSON file per page."""
    out_dir.mkdir(parents=True, exist_ok=True)
    total = len(titles)
    fetched = 0
    failed: list[dict] = []
    t0 = time.time()
    for i in range(0, total, batch):
        chunk = titles[i : i + batch]
        try:
            d = api_get({
                "action": "query",
                "prop": "revisions|categories",
                "rvprop": "content|ids|timestamp",
                "rvslots": "main",
                "cllimit": "max",
                "titles": "|".join(t["title"] for t in chunk),
            })
        except Exception as e:
            print(f"  batch {i}-{i + batch} FAILED: {e}")
            failed.extend(chunk)
            continue
        if "error" in d:
            print(f"  batch {i}-{i + batch} API error: {d['error']}")
            failed.extend(chunk)
            continue
        pages = (d.get("query") or {}).get("pages") or {}
        for p in pages.values():
            title = p.get("title")
            if not title:
                continue
            revs = p.get("revisions") or [{}]
            content = revs[0].get("slots", {}).get("main", {}).get("*", "")
            cats = [c["title"] for c in p.get("categories", [])]
            rec = {
                "title": title,
                "pageid": p.get("pageid"),
                "revid": revs[0].get("revid"),
                "timestamp": revs[0].get("timestamp"),
                "wikitext": content,
                "categories": cats,
            }
            (out_dir / f"{slugify(title)}.json").write_text(
                json.dumps(rec, ensure_ascii=False)
            )
            fetched += 1
        time.sleep(RATE_DELAY)
        if (i // batch) % 20 == 0:
            elapsed = time.time() - t0
            rate = fetched / max(elapsed, 0.1)
            eta = (total - fetched) / max(rate, 0.1)
            print(f"  [{label}] {fetched}/{total} ({rate:.1f}/s, ~{eta / 60:.1f}min)")
    return fetched, failed


def main() -> None:
    parser = argparse.ArgumentParser(description="QWiki full snapshot")
    parser.add_argument("--out", help="Output directory (default: data/wiki-snapshots/<date>)")
    parser.add_argument("--date", default=datetime.now().strftime("%Y-%m-%d"))
    args = parser.parse_args()

    out = Path(args.out) if args.out else Path(f"apps/qw-oracle/data/wiki-snapshots/{args.date}")
    out.mkdir(parents=True, exist_ok=True)
    started = datetime.now(timezone.utc).isoformat()

    # Enumerate phase (cached if already done)
    article_list_path = out / "article-list.json"
    if article_list_path.exists():
        article_list = json.loads(article_list_path.read_text())
        print(f"Step 1: skipped (cached: {len(article_list)} articles)")
    else:
        article_list = enumerate_articles()
        article_list_path.write_text(json.dumps(article_list, ensure_ascii=False))

    redirects = enumerate_redirects()
    (out / "redirects.json").write_text(json.dumps(redirects, ensure_ascii=False, indent=2))

    categories = enumerate_categories()
    (out / "categories.json").write_text(json.dumps(categories, ensure_ascii=False, indent=2))

    template_list = enumerate_templates()
    (out / "template-list.json").write_text(json.dumps(template_list, ensure_ascii=False))

    # Fetch phase
    print(f"\nStep 5: fetch wikitext for {len(article_list)} articles ...")
    a_fetched, a_failed = fetch_pages(article_list, "articles", out / "articles")

    print(f"\nStep 6: fetch wikitext for {len(template_list)} templates ...")
    t_fetched, t_failed = fetch_pages(template_list, "templates", out / "templates")

    finished = datetime.now(timezone.utc).isoformat()
    manifest = {
        "snapshot_started": started,
        "snapshot_finished": finished,
        "source": "https://www.quakeworld.nu",
        "api": API,
        "mediawiki_version": "1.35.10",
        "counts": {
            "articles_listed": len(article_list),
            "articles_fetched": a_fetched,
            "articles_failed": len(a_failed),
            "articles_unique_files": len(article_list) - sum(
                1 for t in article_list
                if (out / "articles" / f"{slugify(t['title'])}.json").exists()
                and json.loads((out / "articles" / f"{slugify(t['title'])}.json").read_text()).get("title") != t["title"]
            ),
            "templates_listed": len(template_list),
            "templates_fetched": t_fetched,
            "templates_failed": len(t_failed),
            "redirects": len(redirects),
            "categories": len(categories),
        },
        "failed_articles": [t["title"] for t in a_failed],
        "failed_templates": [t["title"] for t in t_failed],
        "slugify_notes": (
            "Spaces -> single underscore. Forward slashes -> double underscore (__). "
            "This prevents collision between 'A/B' (slug: A__B) and 'A B' (slug: A_B)."
        ),
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(f"\nDone. Snapshot at: {out}")


if __name__ == "__main__":
    main()
