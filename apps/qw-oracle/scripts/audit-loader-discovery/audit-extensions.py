#!/usr/bin/env python3
"""
audit-extensions.py -- one-off script to surface file-extension string literals
in ezQuake source and compare against the seed extension catalog and actual
user-asset extensions in the gfx corpus.

Three data sources:
  1. Engine source (.c, .h files) -- string literals containing extensions
  2. Seed catalog -- EXT_TO_CATEGORY in _handler_asset_loader_sites.py (29 extensions)
  3. Gfx corpus -- /home/paradoks/sandboxes/qw3-abab-gfx/ (actual user asset files)

Outputs a markdown report comparing coverage across all three.
"""
from __future__ import annotations

import re
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

# -- path setup ---------------------------------------------------------------
HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent.parent  # quakeworld root
EZQ_SRC = REPO / "research" / "repos" / "ezquake-source" / "src"
GFX_CORPUS = Path("/home/paradoks/sandboxes/qw3-abab-gfx")
EXTRACTORS = REPO / "apps" / "qw-oracle" / "scripts" / "extractors"
sys.path.insert(0, str(EXTRACTORS))

# -- seed extensions ----------------------------------------------------------
# Hand-extracted from EXT_TO_CATEGORY in _handler_asset_loader_sites.py
SEED_EXTENSIONS: set[str] = {
    ".cfg", ".rc", ".pak", ".pk3", ".wad", ".bsp", ".mdl", ".md3",
    ".wav", ".ogg", ".qwd", ".mvd", ".dem", ".qtv", ".lmp", ".tga",
    ".png", ".jpg", ".jpeg", ".pcx", ".log", ".loc", ".lit", ".xml",
    ".dat", ".kmap", ".spr", ".qwz", ".dll",
}

# -- filter patterns ----------------------------------------------------------
# Extensions and patterns to skip (build artifacts, source code, etc.)
SKIP_EXTENSIONS = {
    ".c", ".h", ".cpp", ".hpp", ".cc", ".cxx", ".hh",
    ".o", ".obj", ".a", ".lib", ".so", ".dylib", ".dll",
    ".py", ".pyc", ".md", ".txt",
    ".git", ".exe", ".out", ".swp", ".tmp",
}

# Path prefixes that suggest non-asset files
SKIP_PATH_PREFIXES = {
    ".git/", ".vs/", "__pycache__/", "node_modules/", "build/",
    "dist/", "venv/", ".env",
}


def is_version_string(s: str) -> bool:
    """Heuristic: skip strings that look like version numbers (e.g., '1.0.0')."""
    return bool(re.match(r'^\d+\.\d+(\.\d+)?$', s))


def is_url_like(s: str) -> bool:
    """Heuristic: skip HTTP/HTTPS/file URLs."""
    return s.startswith(('http://', 'https://', 'ftp://', 'file://'))


def extract_extensions_from_source() -> dict[str, list[tuple[str, int, str]]]:
    """
    Scan all .c and .h files under EZQ_SRC for string literals containing
    file extensions. Returns a dict: extension -> list of (file, line, context).
    """
    extensions: dict[str, list[tuple[str, int, str]]] = defaultdict(list)

    # Pattern: quoted strings that may contain file extensions
    # Captures: "anything.ext" or '%s.ext' or similar
    ext_pattern = re.compile(r'"([^"]*\.([a-zA-Z0-9]{2,5}))"')

    c_files = sorted(EZQ_SRC.glob("**/*.c")) + sorted(EZQ_SRC.glob("**/*.h"))

    for c_file in c_files:
        try:
            src = c_file.read_text(errors='replace')
        except Exception:
            continue

        short_path = str(c_file.relative_to(EZQ_SRC))
        for line_num, line in enumerate(src.split('\n'), 1):
            # Skip comments
            if '//' in line:
                line = line.split('//')[0]

            for match in ext_pattern.finditer(line):
                full_literal = match.group(1)
                ext_str = '.' + match.group(2)

                # Skip extension if it's a known build artifact / source-code extension
                if ext_str.lower() in SKIP_EXTENSIONS:
                    continue

                # Skip version strings
                if is_version_string(full_literal):
                    continue

                # Skip URL-like patterns
                if is_url_like(full_literal):
                    continue

                # Normalize extension to lowercase
                ext_lower = ext_str.lower()
                extensions[ext_lower].append((short_path, line_num, full_literal))

    return extensions


def extract_extensions_from_corpus() -> dict[str, int]:
    """
    Recursively scan the gfx corpus directory and tally file-extension counts.
    Returns a dict: extension -> count.
    """
    extensions: dict[str, int] = defaultdict(int)

    if not GFX_CORPUS.exists():
        print(f"WARNING: corpus directory not found: {GFX_CORPUS}", file=sys.stderr)
        return extensions

    for file_path in GFX_CORPUS.rglob("*"):
        if not file_path.is_file():
            continue

        # Skip known non-asset patterns
        rel_path = file_path.relative_to(GFX_CORPUS)
        if any(rel_path.as_posix().startswith(p) for p in SKIP_PATH_PREFIXES):
            continue

        # Extract extension
        suffix = file_path.suffix.lower()
        if suffix:
            extensions[suffix] += 1

    return extensions


def format_extension_list(
    ext_list: list[tuple[str, int, str]],
) -> str:
    """Format a list of extension occurrences as a compact markdown snippet."""
    if not ext_list:
        return "_none_"
    # Show first 2 occurrences
    samples = ext_list[:2]
    parts = []
    for fpath, line, literal in samples:
        parts.append(f"`{fpath}:{line}` ({literal})")
    result = "; ".join(parts)
    if len(ext_list) > 2:
        result += f"; +{len(ext_list) - 2} more"
    return result


def main() -> None:
    print("Scanning ezQuake source for file-extension literals...", flush=True)
    source_exts = extract_extensions_from_source()
    print(f"  Found {len(source_exts)} unique extensions in source", flush=True)

    print("Scanning gfx corpus for actual asset files...", flush=True)
    corpus_exts = extract_extensions_from_corpus()
    print(f"  Found {len(corpus_exts)} unique extensions in corpus", flush=True)

    # Compute sets for comparison
    source_set = set(source_exts.keys())
    corpus_set = set(corpus_exts.keys())
    seed_set = SEED_EXTENSIONS

    # Relationships
    new_in_source = source_set - seed_set  # Source but not in seed
    corpus_not_in_source = corpus_set - source_set  # Corpus but not referenced by source
    seed_not_in_either = seed_set - (source_set | corpus_set)  # Seed but nowhere else

    print("\n" + "=" * 70)
    print(f"Summary:")
    print(f"  Source extensions (unique): {len(source_set)}")
    print(f"  Seed extensions (catalogued): {len(seed_set)}")
    print(f"  Corpus extensions (actual files): {len(corpus_set)}")
    print(f"  NEW in source (not in seed): {len(new_in_source)}")
    print(f"  Corpus-only (not in source): {len(corpus_not_in_source)}")
    print(f"  Seed-only (not in source OR corpus): {len(seed_not_in_either)}")
    print("=" * 70 + "\n")

    # Build markdown report
    output_dir = HERE / "output"
    output_dir.mkdir(exist_ok=True)
    report_path = output_dir / "ezquake-extension-coverage.md"

    lines: list[str] = []
    lines.append("# ezQuake extension coverage audit\n")
    lines.append(f"**Generated:** {date.today().isoformat()}")
    lines.append(f"**Source:** research/repos/ezquake-source/src/")
    lines.append(f"**Seed reference:** apps/qw-oracle/scripts/extractors/ezquake/_handler_asset_loader_sites.py EXT_TO_CATEGORY")
    lines.append(f"**Corpus:** /home/paradoks/sandboxes/qw3-abab-gfx/")
    lines.append("")

    lines.append("## Summary\n")
    lines.append(f"- Extensions in source: {len(source_set)} (unique, post-filter)")
    lines.append(f"- Extensions in seed: {len(seed_set)}")
    lines.append(f"- Extensions in corpus: {len(corpus_set)}")
    lines.append(f"- NEW extensions surfaced (source not in seed): {len(new_in_source)}")
    lines.append(f"- Corpus-only extensions (corpus not in source): {len(corpus_not_in_source)}")
    lines.append(f"- Seed-only (not in source OR corpus): {len(seed_not_in_either)}")
    lines.append("")

    # Section 1: Source-NOT-in-seed
    if new_in_source:
        lines.append("## Source-NOT-in-seed (potential missed asset_types)\n")
        for ext in sorted(new_in_source):
            count = len(source_exts[ext])
            corpus_count = corpus_exts.get(ext, 0)
            samples = format_extension_list(source_exts[ext])
            lines.append(f"### `{ext}`")
            lines.append(f"- **Source occurrences:** {count}")
            lines.append(f"- **Corpus occurrences:** {corpus_count}")
            lines.append(f"- **Sample contexts:** {samples}")
            lines.append("")
    else:
        lines.append("## Source-NOT-in-seed (potential missed asset_types)\n")
        lines.append("_None -- all source-referenced extensions are catalogued in seed._\n")

    # Section 2: Corpus-NOT-in-source
    if corpus_not_in_source:
        lines.append("## Corpus-NOT-in-source (user files engine doesn't reference)\n")
        for ext in sorted(corpus_not_in_source):
            count = corpus_exts[ext]
            lines.append(f"### `{ext}`")
            lines.append(f"- **Corpus occurrences:** {count}")
            hint = _infer_corpus_hint(ext)
            if hint:
                lines.append(f"- **Hint:** {hint}")
            lines.append("")
    else:
        lines.append("## Corpus-NOT-in-source (user files engine doesn't reference)\n")
        lines.append("_None -- all corpus extensions are referenced in source._\n")

    # Section 3: Seed-NOT-in-either
    if seed_not_in_either:
        lines.append("## Seed-NOT-in-source-OR-corpus (potentially dead seed entries)\n")
        for ext in sorted(seed_not_in_either):
            lines.append(f"### `{ext}`")
            lines.append(f"- **Status:** Catalogued in seed but not referenced by source code or found in corpus.")
            hint = _infer_seed_hint(ext)
            if hint:
                lines.append(f"- **Hint:** {hint}")
            lines.append("")
    else:
        lines.append("## Seed-NOT-in-source-OR-corpus (potentially dead seed entries)\n")
        lines.append("_None -- all catalogued seed extensions appear in source and/or corpus._\n")

    # Section 4: Path-prefix observations
    lines.append("## Path-prefix observations\n")
    lines.append("Common path prefixes from source-code string literals (indicating asset categories):\n")
    prefix_counts: dict[str, int] = defaultdict(int)
    for ext, occs in source_exts.items():
        for _, _, literal in occs:
            # Extract prefix before the extension
            if '/' in literal:
                prefix = literal.split('/')[0]
                prefix_counts[prefix] += 1
    if prefix_counts:
        for prefix in sorted(prefix_counts.keys(), key=lambda x: -prefix_counts[x])[:15]:
            count = prefix_counts[prefix]
            lines.append(f"- `{prefix}/` -- {count} occurrences")
    else:
        lines.append("_No path prefixes detected in string literals._")
    lines.append("")

    report_text = "\n".join(lines)
    report_path.write_text(report_text, encoding="utf-8")
    print(f"Report written to: {report_path}")


def _infer_corpus_hint(ext: str) -> str:
    """One-liner hint for extensions found in corpus but not in source."""
    ext_lower = ext.lower()
    if ext_lower in {".md", ".txt", ".README", ".readme"}:
        return "Documentation / metadata files"
    if ext_lower in {".json", ".yaml", ".yml", ".cfg", ".ini"}:
        return "Configuration or metadata (may not be loaded by engine directly)"
    if ext_lower in {".zip", ".rar", ".7z"}:
        return "Compressed archives (user distribution formats, not loaded at runtime)"
    if ext_lower in {".sh", ".bat", ".cmd"}:
        return "Scripts (may be used for asset preparation, not loaded at runtime)"
    if ext_lower in {".xcf", ".psd", ".blend"}:
        return "Source-file formats for asset creation tools (not deployed at runtime)"
    if ext_lower in {".map", ".vmf"}:
        return "Map editor sources (superseded by compiled .bsp)"
    if ext_lower in {".txt", ".doc", ".docx"}:
        return "Documentation or metadata"
    if ext_lower in {".tmp", ".bak", ".swp"}:
        return "Temporary or backup files"
    return ""


def _infer_seed_hint(ext: str) -> str:
    """One-liner hint for extensions in seed but not in source or corpus."""
    ext_lower = ext.lower()
    if ext_lower == ".dll":
        return "Plugin binaries (loaded conditionally; may not be used in default builds)"
    if ext_lower == ".qwz":
        return "Demo archive format (specialized; rarely seen in modern distributions)"
    if ext_lower == ".dat":
        return "QuakeC progs/gamedll (loaded on server, may not appear in client corpus)"
    if ext_lower in {".log", ".loc"}:
        return "Runtime-generated or server-provided (not part of prebuilt asset corpus)"
    return ""


if __name__ == "__main__":
    main()
