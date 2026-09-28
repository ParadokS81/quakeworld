#!/usr/bin/env python3
"""
classify-pass1.py -- Pass 1 cheap discovery probe for QW asset bundle corpus.

Inputs:
  output/bundles.json   -- 587 bundle records from gfx_item table
  output/blobs.ndjson   -- NDJSON, one line per file inside a bundle

Outputs:
  output/classifications.ndjson   -- per-file role classification
  output/cross-validation.json    -- per-bundle DB-vs-classified cross-validation
  output/pass1-coverage.md        -- human-readable coverage report
"""

import json
import re
import random
from collections import Counter, defaultdict
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
# The corpus lives outside git (sandbox); outputs stay there too so the repo holds only code.
SANDBOX = Path.home() / "projects/sandboxes/qw3-abab-gfx"
OUTPUT_DIR = SANDBOX / "scripts/output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

BUNDLES_PATH = OUTPUT_DIR / "bundles.json"
BLOBS_PATH = OUTPUT_DIR / "blobs.ndjson"
CLASSIFICATIONS_PATH = OUTPUT_DIR / "classifications.ndjson"
CROSS_VAL_PATH = OUTPUT_DIR / "cross-validation.json"
COVERAGE_PATH = OUTPUT_DIR / "pass1-coverage.md"


# ---------------------------------------------------------------------------
# Glob → regex conversion
# All matching is case-insensitive. The member_path is lowercased before
# matching but original case is preserved in output.
# ---------------------------------------------------------------------------

def _glob_to_regex(pattern: str) -> re.Pattern:
    """
    Convert a glob pattern to a compiled regex (case-insensitive, fullmatch).
    Supported: * (single-segment wildcard), ** (multi-segment wildcard),
    ?, {a,b,c} (brace expansion), [...] (character classes).
    Leading */ is optional (pattern matches anywhere in path).
    """
    # Expand {ext1,ext2,...} brace notation first
    brace_pat = re.compile(r'\{([^}]+)\}')

    def expand_braces(s):
        m = brace_pat.search(s)
        if not m:
            return [s]
        alts = m.group(1).split(',')
        prefix = s[:m.start()]
        suffix = s[m.end():]
        results = []
        for alt in alts:
            for expanded in expand_braces(prefix + alt + suffix):
                results.append(expanded)
        return results

    patterns = expand_braces(pattern)
    regexes = []
    for p in patterns:
        # Strip leading */ — pattern matches any position in path
        if p.startswith('*/'):
            p = p[2:]
        elif p.startswith('**/'):
            p = p[3:]

        parts = []
        i = 0
        while i < len(p):
            if p[i:i+2] == '**':
                parts.append('.*')
                i += 2
                if i < len(p) and p[i] == '/':
                    i += 1  # consume the trailing slash
            elif p[i] == '*':
                parts.append('[^/]*')
                i += 1
            elif p[i] == '?':
                parts.append('[^/]')
                i += 1
            elif p[i] == '[':
                j = p.index(']', i)
                parts.append(re.escape(p[i:j+1]).replace(r'\[', '[').replace(r'\]', ']'))
                i = j + 1
            elif p[i] == '.':
                parts.append(r'\.')
                i += 1
            else:
                parts.append(re.escape(p[i]))
                i += 1

        # Build: either the pattern matches the whole path, or is a suffix
        # (to handle patterns without leading */ that should match anywhere)
        regex_body = ''.join(parts)
        # Match from start OR after a slash (handles the "anywhere in path" case)
        full_regex = f'(?:.*/)?' + regex_body + '$'
        regexes.append(full_regex)

    combined = '|'.join(f'(?:{r})' for r in regexes)
    return re.compile(combined, re.IGNORECASE)


# ---------------------------------------------------------------------------
# Rule table  (glob_pattern, role, confidence)
# Applied in order; first match wins.
# ---------------------------------------------------------------------------

# Helper: image extensions
IMG = '{png,tga,jpg,bmp}'
IMG_T = '{png,tga}'

RULES = [
    # --- Thumbs.db and system junk (strip early) ---
    ("**/Thumbs.db",                            "bundle-meta:junk",             "high"),
    ("**/.DS_Store",                            "bundle-meta:junk",             "high"),
    ("**/*.db",                                 "bundle-meta:junk",             "high"),

    # --- Bundle-meta: documentation and packaging artifacts ---
    (f"**/readme*.{{txt,md}}",                  "bundle-meta:readme",           "high"),
    (f"**/README*.{{txt,md}}",                  "bundle-meta:readme",           "high"),
    (f"**/changelog*.txt",                      "bundle-meta:changelog",        "high"),
    (f"**/CHANGELOG*",                          "bundle-meta:changelog",        "high"),
    (f"**/*.preview.{IMG}",                     "bundle-meta:preview-image",    "high"),
    (f"**/preview.{IMG}",                       "bundle-meta:preview-image",    "high"),
    (f"**/*_preview.{IMG}",                     "bundle-meta:preview-image",    "high"),
    (f"**/overview*.{IMG}",                     "bundle-meta:preview-image",    "high"),
    (f"**/src/**",                              "bundle-meta:source-dir",       "high"),
    (f"**/source/**",                           "bundle-meta:source-dir",       "high"),
    (f"**/sources/**",                          "bundle-meta:source-dir",       "high"),
    (f"**/*.{{psd,ai,xcf}}",                    "bundle-meta:source-file",      "high"),
    (f"**/extras/**",                           "bundle-meta:variant-bonus",    "high"),
    (f"**/extras with fixes/**",                "bundle-meta:variant-bonus",    "high"),
    (f"**/*.{{html,htm,url}}",                  "bundle-meta:doc-other",        "high"),

    # --- Nested archives (not engine-installable) ---
    (f"**/*.{{rar,7z,zip}}",                    "bundle-meta:nested-archive",   "high"),

    # --- PAK / PK3 files (opaque bundles; special handling) ---
    (f"**/*.pak",                               "bundle-meta:pak-archive",      "medium"),
    (f"**/*.pk3",                               "bundle-meta:pk3-archive",      "medium"),
    (f"**/*.wad",                               "bundle-meta:wad-archive",      "medium"),

    # =======================================================================
    # ENGINE-INSTALLABLE: paths with explicit qw/ anchor
    # (handles both qw/... and wrapper/qw/...)
    # =======================================================================

    # Charset textures (wads/cs subdirectory)
    (f"*/qw/textures/wads/cs/*.{IMG}",          "user-asset:texture-charset",   "high"),
    (f"*/qw/textures/wads/cs/*.{IMG}",          "user-asset:texture-charset",   "high"),

    # WAD replacement textures
    (f"*/qw/textures/wads/*.{IMG}",             "user-asset:texture-wad",       "high"),
    (f"*/qw/textures/wad/*.{IMG}",              "user-asset:texture-wad",       "high"),

    # Model textures
    (f"*/qw/textures/models/*.{IMG}",           "user-asset:texture-model",     "high"),

    # Weapon textures
    (f"*/qw/textures/weapons/*.{IMG}",          "user-asset:texture-weapon",    "high"),
    (f"*/qw/textures/weapon/*.{IMG}",           "user-asset:texture-weapon",    "high"),

    # Map textures
    (f"*/qw/textures/maps/*.{IMG}",             "user-asset:texture-map",       "high"),

    # Environment textures (lava, teleport)
    (f"*/qw/textures/lava*/*",                  "user-asset:texture-environment", "high"),
    (f"*/qw/textures/teleport*/*",              "user-asset:texture-environment", "high"),

    # Skybox (env subdirectory)
    (f"*/qw/env/*.{IMG}",                       "user-asset:skybox",            "high"),
    (f"*/qw/gfx/env/*.{IMG}",                   "user-asset:skybox",            "high"),

    # HUD textures (explicit hud/ paths under qw)
    (f"*/qw/hud/*.{IMG_T}",                     "user-asset:hud-element",       "high"),
    (f"*/qw/textures/hud/*.{IMG}",              "user-asset:hud-element",       "high"),

    # Bmodels (item brushmodel skins -- simple items)
    (f"*/qw/textures/bmodels/*.{IMG}",          "user-asset:texture-model",     "high"),
    (f"*/qw/bmodels/*.{IMG}",                   "user-asset:texture-model",     "high"),

    # Top-level textures/ (one level only)
    (f"*/qw/textures/*.{IMG}",                  "user-asset:texture-other",     "high"),

    # Per-map texture subdirs (one level deep)
    (f"*/qw/textures/*/*.{IMG}",                "user-asset:texture-mapcontent","high"),

    # Deeper texture paths
    (f"*/qw/textures/**/*.{IMG}",               "user-asset:texture-mapcontent","medium"),

    # Sounds
    (f"*/qw/sound/**/*.wav",                    "user-asset:sound",             "high"),
    (f"*/qw/sounds/**/*.wav",                   "user-asset:sound",             "high"),

    # Maps
    (f"*/qw/maps/*.bsp",                        "library:map",                  "high"),
    (f"*/qw/maps/*.lit",                        "library:map-lighting",         "high"),
    (f"*/qw/maps/*.ent",                        "library:map-entity",           "high"),

    # Location files
    (f"*/qw/locs/*.loc",                        "library:loc",                  "high"),
    (f"*/qw/maps/*.loc",                        "library:loc",                  "high"),

    # Skins
    (f"*/qw/skins/*.{{pcx,png}}",               "user-asset:skin",              "high"),

    # Models/progs
    (f"*/qw/progs/*.mdl",                       "user-asset:model",             "high"),

    # Crosshairs
    (f"*/qw/crosshairs/*.{IMG_T}",              "user-asset:crosshair",         "high"),

    # Charsets
    (f"*/qw/charsets/*.{IMG_T}",                "user-asset:charset",           "high"),

    # Conback
    (f"*/qw/gfx/conback.{{png,tga,lmp}}",       "user-asset:conback",           "high"),

    # Other GFX
    (f"*/qw/gfx/**/*.{{png,tga,lmp}}",          "user-asset:gfx-element",       "high"),
    (f"*/qw/gfx/*.{{png,tga,lmp}}",             "user-asset:gfx-element",       "high"),

    # Configs
    (f"*/qw/*.cfg",                             "user-asset:config",            "high"),
    (f"*/qw/cfg/*.cfg",                         "user-asset:config",            "high"),
    (f"*/qw/cfg_*.cfg",                         "user-asset:config",            "high"),

    # id1-targeted content
    (f"*/id1/maps/*.bsp",                       "library:map",                  "high"),
    (f"*/id1/**/*",                             "user-asset:id1-content",       "medium"),

    # ezquake/ config wrapper paths
    (f"*/ezquake/configs/*.cfg",                "user-asset:config",            "high"),
    (f"*/ezquake/hud.*",                        "bundle-meta:pak-archive",      "medium"),

    # =======================================================================
    # ENGINE-INSTALLABLE: paths WITHOUT explicit qw/ anchor
    # (bare path from archive root — no wrapper folder)
    # =======================================================================

    # Charset textures
    (f"textures/wads/cs/*.{IMG}",               "user-asset:texture-charset",   "high"),
    (f"textures/wads/cs/*.{IMG_T}",             "user-asset:texture-charset",   "high"),
    (f"charsets/*.{IMG_T}",                     "user-asset:charset",           "high"),
    # 512x512/ or resolution-named charset dirs
    (f"512x512/*.{IMG_T}",                      "user-asset:charset",           "medium"),
    (f"256x256/*.{IMG_T}",                      "user-asset:charset",           "medium"),
    (f"1024x1024/*.{IMG_T}",                    "user-asset:charset",           "medium"),

    # WAD textures
    (f"textures/wads/*.{IMG}",                  "user-asset:texture-wad",       "high"),
    (f"textures/wad/*.{IMG}",                   "user-asset:texture-wad",       "high"),
    (f"wad/*.{IMG}",                            "user-asset:texture-wad",       "high"),

    # Bmodels (simple items)
    (f"textures/bmodels/*.{IMG}",               "user-asset:texture-model",     "high"),
    (f"bmodels/*.{IMG}",                        "user-asset:texture-model",     "high"),

    # Scoreboard textures (flag textures and similar HUD/UI content)
    (f"textures/scoreboard/**/*.{IMG}",         "user-asset:hud-element",       "medium"),

    # Model textures
    (f"textures/models/*.{IMG}",                "user-asset:texture-model",     "high"),
    (f"models/*.{IMG}",                         "user-asset:texture-model",     "high"),

    # Per-map texture dirs (mapname/texture.ext)
    # Pattern: single segment (a map name) containing image files
    # We handle this with a broad catch below and separate logic

    # Generic textures/
    (f"textures/**/*.{IMG}",                    "user-asset:texture-other",     "medium"),

    # Sounds
    (f"sound/**/*.wav",                         "user-asset:sound",             "high"),
    (f"sounds/**/*.wav",                        "user-asset:sound",             "high"),

    # Maps
    (f"maps/*.bsp",                             "library:map",                  "high"),
    (f"*.bsp",                                  "library:map",                  "medium"),
    (f"*.lit",                                  "library:map-lighting",         "medium"),
    (f"*.loc",                                  "library:loc",                  "medium"),

    # Models/progs
    (f"progs/*.mdl",                            "user-asset:model",             "high"),
    (f"models/**/*.mdl",                        "user-asset:model",             "high"),
    (f"fortress/progs/*.{{mdl,spr}}",           "user-asset:model",             "high"),
    (f"*.mdl",                                  "user-asset:model",             "medium"),

    # GFX
    (f"gfx/**/*.{{png,tga,lmp}}",               "user-asset:gfx-element",       "high"),
    (f"gfx/*.{{png,tga,lmp}}",                  "user-asset:gfx-element",       "high"),

    # Crosshairs (explicit dir)
    (f"crosshairs/*.{IMG_T}",                   "user-asset:crosshair",         "high"),

    # HUD dirs
    (f"huds/*.{{png,tga,xml,json}}",            "user-asset:hud-element",       "high"),
    (f"hud/*.{IMG_T}",                          "user-asset:hud-element",       "high"),

    # Skyboxes
    (f"env/*.{IMG}",                            "user-asset:skybox",            "high"),
    # Skybox dir named after the skybox
    (f"skybox_*/*.{IMG}",                       "user-asset:skybox",            "medium"),

    # Skins (bare skins/ dir)
    (f"skins/*.{{pcx,png,tga}}",                "user-asset:skin",              "high"),

    # Conback
    (f"conback.{{png,tga,lmp}}",                "user-asset:conback",           "high"),

    # Configs (bare .cfg at root or in cfg/)
    (f"*.cfg",                                  "user-asset:config",            "medium"),
    (f"cfg/*.cfg",                              "user-asset:config",            "high"),
    (f"configs/*.cfg",                          "user-asset:config",            "high"),

    # Sounds at root
    (f"*.wav",                                  "user-asset:sound",             "low"),

    # fortress/ gamedir content
    (f"fortress/sound/**/*.wav",                "user-asset:sound",             "high"),

    # =======================================================================
    # FALLBACK BROAD PATTERNS
    # Per-map named texture dirs: first segment is a map name, contents are
    # images. This is how map texture packs are distributed without a
    # textures/ wrapper. Rule: single-segment dir + image extension.
    # =======================================================================
    # These must come AFTER the specific textures/ rules.
    (f"*/*.{IMG}",                              "user-asset:texture-mapcontent","low"),

    # Root-level images (no dir) — extremely common for crosshairs, charsets,
    # wad items that ships as bare files.
    (f"*.{IMG}",                                "user-asset:texture-other",     "low"),
]


# Pre-compile all rules
COMPILED_RULES = []
for glob, role, confidence in RULES:
    COMPILED_RULES.append((_glob_to_regex(glob), role, confidence, glob))


def classify_path(member_path: str) -> tuple[str, str, str, str]:
    """
    Returns (role, target_path, rule_glob, confidence).
    Falls through to quarantine if no rule matches.
    """
    lpath = member_path.lower()

    # Skip directory entries
    if lpath.endswith('/'):
        return "dir-entry", member_path, "skip-dir", "high"

    # Determine target_path: strip leading wrapper dir if path contains /qw/ or /id1/
    target_path = member_path
    lpath_for_target = member_path.lower()
    if '/qw/' in lpath_for_target:
        idx = lpath_for_target.index('/qw/')
        target_path = member_path[idx + 1:]  # from 'qw/' onward
    elif lpath_for_target.startswith('qw/'):
        target_path = member_path
    elif '/id1/' in lpath_for_target:
        idx = lpath_for_target.index('/id1/')
        target_path = member_path[idx + 1:]
    elif '/ezquake/' in lpath_for_target:
        idx = lpath_for_target.index('/ezquake/')
        target_path = member_path[idx + 1:]

    # Apply rules in order
    for pattern, role, confidence, glob in COMPILED_RULES:
        if pattern.search(lpath):
            return role, target_path, glob, confidence

    # No match
    return "quarantine", target_path, "no-match", "low"


# ---------------------------------------------------------------------------
# DB-category → expected roles mapping
# ---------------------------------------------------------------------------

CATEGORY_EXPECTED_ROLES: dict[str, list[str]] = {
    "Crosshairs":                       ["user-asset:crosshair"],
    "Crosshairs / Transparent":         ["user-asset:crosshair"],
    "Charsets":                         ["user-asset:charset", "user-asset:texture-charset"],
    "Charsets / 1024x1024 or larger":   ["user-asset:charset", "user-asset:texture-charset"],
    "Charsets / 256x256":               ["user-asset:charset", "user-asset:texture-charset"],
    "Charsets / 512x512":               ["user-asset:charset", "user-asset:texture-charset"],
    "Conbacks":                         ["user-asset:conback", "user-asset:gfx-element"],
    "Configs":                          ["user-asset:config"],
    "Configs / Eyecandy":               ["user-asset:config"],
    "Configs / HUD":                    ["user-asset:config"],
    "Configs / Performance":            ["user-asset:config"],
    "Configs / Teamplay":               ["user-asset:config"],
    "Skins":                            ["user-asset:skin"],
    "Skins / Gib":                      ["user-asset:skin"],
    "Skins / Player Model":             ["user-asset:skin"],
    "Textures":                         ["user-asset:texture-weapon", "user-asset:texture-map",
                                         "user-asset:texture-mapcontent", "user-asset:texture-other",
                                         "user-asset:texture-model", "user-asset:texture-environment",
                                         "user-asset:texture-wad", "user-asset:texture-charset"],
    "Textures / Armor":                 ["user-asset:texture-model", "user-asset:texture-mapcontent",
                                         "user-asset:texture-other"],
    "Textures / Backpack":              ["user-asset:texture-model", "user-asset:texture-mapcontent",
                                         "user-asset:texture-other"],
    "Textures / Lava and Teleport":     ["user-asset:texture-environment",
                                         "user-asset:texture-mapcontent"],
    "Textures / Sets":                  ["user-asset:texture-mapcontent", "user-asset:texture-other",
                                         "user-asset:texture-map"],
    "Textures / Team Fortress":         ["user-asset:texture-mapcontent", "user-asset:texture-other"],
    "Textures / Weapon":                ["user-asset:texture-weapon", "user-asset:texture-model"],
    "HUD":                              ["user-asset:hud-element", "user-asset:texture-wad",
                                         "user-asset:gfx-element"],
    "HUD / Face and Armor":             ["user-asset:hud-element", "user-asset:texture-wad"],
    "HUD / Icons":                      ["user-asset:hud-element", "user-asset:texture-wad"],
    "HUD / Numbers":                    ["user-asset:hud-element", "user-asset:texture-wad"],
    "HUD / Sets":                       ["user-asset:hud-element", "user-asset:texture-wad",
                                         "user-asset:gfx-element"],
    "HUD / WADs":                       ["user-asset:texture-wad"],
    "HUD / Weapon":                     ["user-asset:hud-element", "user-asset:texture-wad"],
    "Models":                           ["user-asset:model"],
    "Models / Armor":                   ["user-asset:model"],
    "Models / Item":                    ["user-asset:model"],
    "Models / Sets":                    ["user-asset:model"],
    "Models / Team Fortress":           ["user-asset:model"],
    "Models / Weapon":                  ["user-asset:model"],
    "Maps":                             ["library:map"],
    "Maps / DMM4":                      ["library:map"],
    "Maps / Map textures":              ["user-asset:texture-map", "user-asset:texture-mapcontent"],
    "Maps / Trick maps":                ["library:map"],
    "Other":                            [],  # no prediction
    "Other / Levelshots":               ["user-asset:gfx-element"],
    "Other / Skyboxes":                 ["user-asset:skybox", "user-asset:texture-other"],
    "Other / Sounds":                   ["user-asset:sound"],
}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # ---- Load inputs ----
    with open(BUNDLES_PATH) as f:
        bundles = json.load(f)

    blobs: list[dict] = []
    with open(BLOBS_PATH) as f:
        for line in f:
            line = line.strip()
            if line:
                blobs.append(json.loads(line))

    print(f"Loaded {len(bundles)} bundles, {len(blobs)} blobs")

    bundle_iids = {b["iid"] for b in bundles}
    blob_bundle_ids = {rec["bundle_id"] for rec in blobs}

    # ---- Classify all blobs ----
    classifications = []
    with open(CLASSIFICATIONS_PATH, "w") as out:
        for rec in blobs:
            member_path = rec["member_path"]
            role, target_path, rule, confidence = classify_path(member_path)

            # Skip dir entries from output
            if role == "dir-entry":
                continue

            entry = {
                "bundle_id":   rec["bundle_id"],
                "member_path": member_path,
                "xxh3_128":    rec["xxh3_128"],
                "role":        role,
                "target_path": target_path,
                "rule":        rule,
                "confidence":  confidence,
            }
            out.write(json.dumps(entry) + "\n")
            classifications.append(entry)

    print(f"Classified {len(classifications)} files (dir entries skipped)")

    # ---- Cross-validation ----
    # Group classifications by bundle_id
    bundle_files: dict[int, list[dict]] = defaultdict(list)
    for c in classifications:
        bundle_files[c["bundle_id"]].append(c)

    # Build per-bundle cross-val
    cross_val = []
    bundle_map = {b["iid"]: b for b in bundles}

    for bundle in bundles:
        bid = bundle["iid"]
        cat_path = bundle["category_path"]
        expected_roles = CATEGORY_EXPECTED_ROLES.get(cat_path)  # None if not in map

        files = bundle_files.get(bid, [])

        all_roles = [f["role"] for f in files]
        role_counts = Counter(all_roles)

        # Non-meta roles = exclude bundle-meta:* and quarantine
        non_meta_roles = [r for r in all_roles if not r.startswith("bundle-meta:") and r != "quarantine"]
        non_meta_role_set = set(non_meta_roles)

        # Determine primary role (most common non-meta role)
        non_meta_counter = Counter(non_meta_roles)
        primary_role = non_meta_counter.most_common(1)[0][0] if non_meta_counter else None

        if not files:
            status = "NO-FILES"
        elif expected_roles is None:
            status = "UNCLASSIFIED-DB-CATEGORY"
        elif len(expected_roles) == 0:
            # Category has no prediction (Other)
            status = "UNCLASSIFIED-DB-CATEGORY"
        elif not non_meta_roles:
            status = "EMPTY"
        else:
            has_expected = bool(non_meta_role_set & set(expected_roles))
            has_other_engine = bool(non_meta_role_set - set(expected_roles))

            if has_expected and has_other_engine:
                status = "MIXED"
            elif has_expected:
                status = "MATCH"
            else:
                status = "MISMATCH"

        found_roles = sorted(set(all_roles))

        cross_val.append({
            "bundle_id":           bid,
            "db_category_path":    cat_path,
            "status":              status,
            "expected_roles":      expected_roles or [],
            "found_roles":         found_roles,
            "primary_role":        primary_role,
            "file_count":          len(files),
        })

    with open(CROSS_VAL_PATH, "w") as f:
        json.dump(cross_val, f, indent=2)

    print(f"Cross-validation written: {CROSS_VAL_PATH}")

    # ---- Orphan IDs ----
    # Bundles in blobs but NOT in bundles.json
    orphan_blobs = sorted(blob_bundle_ids - bundle_iids)
    # Bundles in bundles.json but NOT in blobs
    orphan_db = sorted(bundle_iids - blob_bundle_ids)

    print(f"Orphan blob IDs (files on disk, not in DB): {len(orphan_blobs)}")
    print(f"Orphan DB IDs (in DB, no files hashed):     {len(orphan_db)}")

    # ---- Coverage report ----
    _write_coverage_report(
        classifications, cross_val, bundles, blobs,
        orphan_blobs, orphan_db
    )

    print(f"Coverage report written: {COVERAGE_PATH}")


def _write_coverage_report(
    classifications: list[dict],
    cross_val: list[dict],
    bundles: list[dict],
    blobs: list[dict],
    orphan_blobs: list[int],
    orphan_db: list[int],
):
    total = len(classifications)
    quarantine_count = sum(1 for c in classifications if c["role"] == "quarantine")
    meta_count = sum(1 for c in classifications if c["role"].startswith("bundle-meta:"))
    engine_count = total - quarantine_count - meta_count

    classified_pct = 100.0 * (total - quarantine_count) / total if total else 0
    quarantine_pct = 100.0 * quarantine_count / total if total else 0

    # Per-role counts
    role_counts = Counter(c["role"] for c in classifications)

    # Quarantine analysis
    quarantine_recs = [c for c in classifications if c["role"] == "quarantine"]
    q_exts = Counter()
    q_prefixes = Counter()
    for c in quarantine_recs:
        p = c["member_path"]
        ext = p.rsplit(".", 1)[-1].lower() if "." in p else "(no-ext)"
        q_exts[ext] += 1
        seg = p.split("/")[0]
        q_prefixes[seg] += 1

    # Cross-val totals
    cv_totals = Counter(cv["status"] for cv in cross_val)

    # MISMATCH examples (up to 5 random)
    mismatches = [cv for cv in cross_val if cv["status"] == "MISMATCH"]
    random.seed(42)
    mismatch_sample = random.sample(mismatches, min(5, len(mismatches)))

    # MIXED examples (up to 5 random)
    mixed = [cv for cv in cross_val if cv["status"] == "MIXED"]
    mixed_sample = random.sample(mixed, min(5, len(mixed)))

    # Build bundle -> files lookup for examples
    bundle_files: dict[int, list[dict]] = defaultdict(list)
    for c in classifications:
        bundle_files[c["bundle_id"]].append(c)

    def top_paths(bid, n=5):
        recs = bundle_files.get(bid, [])
        # prefer engine-installable first
        engine = [r for r in recs if not r["role"].startswith("bundle-meta:") and r["role"] != "quarantine"]
        other = [r for r in recs if r["role"].startswith("bundle-meta:") or r["role"] == "quarantine"]
        combined = engine + other
        return [r["member_path"] for r in combined[:n]]

    # Suggestions based on quarantine top prefixes
    suggestions = _suggest_pass2_rules(quarantine_recs, classifications)

    lines = []
    lines.append("# Pass 1 Coverage Report")
    lines.append("")
    lines.append("## Headline")
    lines.append("")
    lines.append(f"- Total classified files: **{total:,}**")
    lines.append(f"- Classified (non-quarantine): **{total - quarantine_count:,}** ({classified_pct:.1f}%)")
    lines.append(f"  - Engine-installable: {engine_count:,}")
    lines.append(f"  - Bundle-meta: {meta_count:,}")
    lines.append(f"- Quarantine (no rule matched): **{quarantine_count:,}** ({quarantine_pct:.1f}%)")
    lines.append("")

    lines.append("## Per-Role File Counts (sorted desc)")
    lines.append("")
    lines.append("| Role | Count |")
    lines.append("|------|-------|")
    for role, count in role_counts.most_common():
        lines.append(f"| `{role}` | {count:,} |")
    lines.append("")

    lines.append("## Quarantine Breakdown")
    lines.append("")
    lines.append("### Top 10 quarantined extensions")
    lines.append("")
    lines.append("| Extension | Count |")
    lines.append("|-----------|-------|")
    for ext, count in q_exts.most_common(10):
        lines.append(f"| `.{ext}` | {count:,} |")
    lines.append("")

    lines.append("### Top 10 quarantined path prefixes (first path segment)")
    lines.append("")
    lines.append("| Prefix | Count |")
    lines.append("|--------|-------|")
    for prefix, count in q_prefixes.most_common(10):
        lines.append(f"| `{prefix}` | {count:,} |")
    lines.append("")

    lines.append("## Cross-Validation Totals")
    lines.append("")
    lines.append("| Status | Count |")
    lines.append("|--------|-------|")
    for status in ["MATCH", "MIXED", "MISMATCH", "EMPTY", "UNCLASSIFIED-DB-CATEGORY", "NO-FILES"]:
        lines.append(f"| {status} | {cv_totals.get(status, 0):,} |")
    lines.append("")

    lines.append("## Mismatch Examples")
    lines.append("")
    lines.append("Bundles where zero files matched the DB-category expected roles. These are the curveballs.")
    lines.append("")
    for cv in mismatch_sample:
        bid = cv["bundle_id"]
        lines.append(f"### Bundle {bid} — `{cv['db_category_path']}`")
        lines.append(f"- Expected roles: {cv['expected_roles']}")
        non_meta = [r for r in cv["found_roles"] if not r.startswith("bundle-meta:")]
        lines.append(f"- Found roles (non-meta): {non_meta[:5]}")
        lines.append(f"- Top file paths:")
        for p in top_paths(bid, 5):
            lines.append(f"  - `{p}`")
        lines.append("")

    lines.append("## Mixed Examples")
    lines.append("")
    lines.append("Bundles with both expected and unexpected engine-installable roles.")
    lines.append("")
    for cv in mixed_sample:
        bid = cv["bundle_id"]
        lines.append(f"### Bundle {bid} — `{cv['db_category_path']}`")
        lines.append(f"- Expected roles: {cv['expected_roles']}")
        lines.append(f"- All unique roles: {cv['found_roles']}")
        lines.append(f"- Top file paths:")
        for p in top_paths(bid, 5):
            lines.append(f"  - `{p}`")
        lines.append("")

    lines.append("## Orphan IDs")
    lines.append("")
    lines.append(f"**Files-on-disk but not in DB (blob bundle_id not in bundles.json):** {len(orphan_blobs)}")
    if orphan_blobs:
        lines.append(f"First 10 IDs: {orphan_blobs[:10]}")
    lines.append("")
    lines.append(f"**DB records with no hashed files (iid not in blobs):** {len(orphan_db)}")
    if orphan_db:
        lines.append(f"First 10 IDs: {orphan_db[:10]}")
    lines.append("")

    lines.append("## Suggestions for Pass 2")
    lines.append("")
    for s in suggestions:
        lines.append(f"- {s}")
    lines.append("")

    COVERAGE_PATH.write_text("\n".join(lines))


def _suggest_pass2_rules(
    quarantine_recs: list[dict],
    all_classifications: list[dict],
) -> list[str]:
    """
    Analyze quarantine bucket and propose concrete new rules for Pass 2.
    """
    suggestions = []

    # Analyze quarantine by extension and first-segment
    q_paths = [c["member_path"] for c in quarantine_recs]

    # Group by extension
    by_ext: dict[str, list[str]] = defaultdict(list)
    for p in q_paths:
        ext = p.rsplit(".", 1)[-1].lower() if "." in p else "(no-ext)"
        by_ext[ext].append(p)

    # Group by first path segment
    by_seg: dict[str, list[str]] = defaultdict(list)
    for p in q_paths:
        seg = p.split("/")[0].lower()
        by_seg[seg].append(p)

    # Find bundle_ids for each quarantine path
    q_bids: dict[str, set[int]] = defaultdict(set)
    for c in quarantine_recs:
        seg = c["member_path"].split("/")[0].lower()
        q_bids[seg].add(c["bundle_id"])

    # Top quarantine segments that look like real engine assets
    image_exts = {"png", "tga", "jpg", "bmp", "pcx"}

    # Check: segments that contain mostly image files (likely map-texture or custom dirs)
    engine_looking_segs = {}
    for seg, paths in by_seg.items():
        if len(paths) < 3:
            continue
        ext_counts = Counter(p.rsplit(".", 1)[-1].lower() if "." in p else "" for p in paths)
        image_total = sum(ext_counts[e] for e in image_exts)
        if image_total >= 3 and image_total / len(paths) > 0.6:
            engine_looking_segs[seg] = (len(paths), sorted(q_bids[seg]))

    # Sort by count
    top_engine = sorted(engine_looking_segs.items(), key=lambda x: -x[1][0])

    if top_engine:
        examples = top_engine[:3]
        ex_strs = [f"`{seg}/` ({count} files, bundles {bids[:3]}{'...' if len(bids)>3 else ''})"
                   for seg, (count, bids) in examples]
        suggestions.append(
            "Engine asset dirs without a recognized prefix: top quarantine segments that are "
            "mostly images look like per-map texture packs distributed without a `textures/` "
            "wrapper. Segments like " + ", ".join(ex_strs) + ". "
            "Adding a broad fallback `*/*.{png,tga,jpg,bmp}` (single-segment dir + image) "
            "would capture these as `user-asset:texture-mapcontent` (low confidence). "
            "The current `*/*.{IMG}` low-confidence fallback may already cover this once "
            "the rule ordering is confirmed -- verify against the quarantine output."
        )

    # Check .gif files
    gif_count = len(by_ext.get("gif", []))
    if gif_count > 0:
        bids_gif = sorted(set(c["bundle_id"] for c in quarantine_recs
                              if c["member_path"].lower().endswith(".gif")))
        suggestions.append(
            f"**.gif** ({gif_count} files in bundles {bids_gif[:5]}): "
            "GIF files are used as preview images and occasionally as in-engine textures "
            "in older bundles. Add `**/preview*.gif` → `bundle-meta:preview-image` and "
            "`**/*.gif` → `user-asset:texture-other` (low) to classify these."
        )

    # Check .json files
    json_count = len(by_ext.get("json", []))
    if json_count > 0:
        sample_json = by_ext["json"][:3]
        bids_json = sorted(set(c["bundle_id"] for c in quarantine_recs
                               if c["member_path"].lower().endswith(".json")))
        suggestions.append(
            f"**.json** ({json_count} files, e.g. `{sample_json[0]}`): "
            "Seen in `textures/scoreboard/flags.json` (flag texture manifest) and HUD definition "
            "files. Add `textures/scoreboard/**/*.json` → `user-asset:hud-element` and "
            "`**/*.json` → `bundle-meta:doc-other` (low) for unrecognized JSON."
        )

    # Check .spr files
    spr_count = len(by_ext.get("spr", []))
    if spr_count > 0:
        suggestions.append(
            f"**.spr** ({spr_count} files): Quake sprite files (explosion/particle effects). "
            "Add `*/qw/progs/*.spr` and `fortress/progs/*.spr` → `user-asset:model` (sprites "
            "are classified alongside models in the engine install convention)."
        )

    # Check .pcx files at root
    pcx_root = [p for p in by_ext.get("pcx", []) if "/" not in p]
    if len(pcx_root) >= 3:
        suggestions.append(
            f"**Root-level .pcx** ({len(pcx_root)} files): PCX files at root with no "
            "directory are almost certainly skins. Add `*.pcx` → `user-asset:skin` (low) "
            "as a fallback after the explicit `qw/skins/*.pcx` rule."
        )

    # Check defs_* or Def/ or similar HUD definition dirs
    hud_def_segs = {seg: info for seg, info in engine_looking_segs.items()
                    if "defs" in seg.lower() or "def" == seg.lower() or "hud" in seg.lower()}
    if hud_def_segs:
        seg_list = list(hud_def_segs.keys())[:3]
        suggestions.append(
            "**HUD definition directories** like `" + "`, `".join(seg_list) + "`: "
            "These match names like `defs_degeneration_hud/` and `Def/` -- bundles that "
            "contain HUD definition files (PNG icon sheets + config). "
            "Add `defs_*/*.{png,tga}` and `Def/**/*.{png,tga}` → `user-asset:hud-element` "
            "(medium) for bundle-specific HUD dirs."
        )

    # Ensure we always return at least 3 suggestions
    while len(suggestions) < 3:
        suggestions.append(
            "Review quarantine records with `.cfg` extension not under any recognized "
            "config path (bare root .cfg files are already handled by `*.cfg` low rule -- "
            "verify these are actually being caught or if the rule ordering blocks them)."
        )

    return suggestions[:6]


if __name__ == "__main__":
    main()
