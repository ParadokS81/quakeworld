#!/usr/bin/env python3
"""
classify-pass2.py -- Pass 2 DB-category-driven classifier for QW asset bundle corpus.

Reframe from Pass 1: the qw.nu/gfx database knows what each bundle IS via its
`category` field. We use the DB's per-category install instructions as the
authoritative role + target_path source, rather than trying to guess from zip paths.

Inputs:
  output/bundles.json        -- 587 bundle records (category_cid, category_path, etc.)
  output/blobs.ndjson        -- 11,173 file records (bundle_id, member_path, xxh3_128, size_bytes)

Outputs:
  output/pass2-manifest.ndjson  -- per-file install records
  output/pass2-coverage.md      -- coverage report
"""

import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path

# The corpus lives outside git (sandbox); outputs stay there too so the repo holds only code.
SANDBOX = Path.home() / "projects/sandboxes/qw3-abab-gfx"
OUTPUT_DIR = SANDBOX / "scripts/output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

BUNDLES_PATH = OUTPUT_DIR / "bundles.json"
BLOBS_PATH = OUTPUT_DIR / "blobs.ndjson"
MANIFEST_PATH = OUTPUT_DIR / "pass2-manifest.ndjson"
COVERAGE_PATH = OUTPUT_DIR / "pass2-coverage.md"

# Pass 1 cross-validation for MISMATCH recovery comparison
CROSS_VAL_PATH = OUTPUT_DIR / "cross-validation.json"


# ---------------------------------------------------------------------------
# Category mapping table
# Keyed by category_path (exact match from bundles.json).
# Source comments reference gfx_faq QIDs where applicable.
# ---------------------------------------------------------------------------

CATEGORY_MAP: dict[str, dict] = {
    # --- Crosshairs ---
    # gfx_faq QID 15: "Put the crosshair files in quake/qw/crosshairs/"
    "Crosshairs": {
        "role": "user-asset:crosshair",
        "install_path_template": "qw/crosshairs/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 15",
        "filename_constraint": None,
        "notes": "Drop in qw/crosshairs/, load with /crosshairimage",
    },
    "Crosshairs / Transparent": {
        "role": "user-asset:crosshair",
        "install_path_template": "qw/crosshairs/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 15",
        "filename_constraint": None,
        "notes": "Transparent variant; same install path as opaque crosshairs",
    },

    # --- Skins ---
    # gfx_faq QID 17: "Put the skins in folder: /quake/qw/skins/"
    "Skins": {
        "role": "user-asset:skin",
        "install_path_template": "qw/skins/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 17",
        "filename_constraint": None,
        "notes": "Top-level skins (player model skins); set via /teamskin /enemyskin",
    },
    "Skins / Player Model": {
        "role": "user-asset:skin",
        "install_path_template": "qw/skins/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 17",
        "filename_constraint": None,
        "notes": None,
    },
    "Skins / Monster": {
        "role": "user-asset:skin-monster",
        "install_path_template": "qw/skins/{filename}",
        "confidence": "medium",
        "source": "inferred from QID 17",
        "filename_constraint": None,
        "notes": "Monster skins go into qw/skins/ like player skins",
    },
    "Skins / Gib": {
        "role": "user-asset:skin-gib",
        "install_path_template": "qw/skins/{filename}",
        "confidence": "medium",
        "source": "inferred",
        "filename_constraint": None,
        "notes": "Gib skins (h_player, h_zombie etc.) stored in qw/skins/ OR qw/textures/models/",
    },
    "Skins / Team Fortress": {
        "role": "user-asset:skin-tf",
        "install_path_template": "fortress/skins/{filename}",
        "confidence": "low",
        "source": "inferred TF convention",
        "filename_constraint": None,
        "notes": "TF uses fortress/ gamedir; skin path mirrors standard skins/ layout",
    },

    # --- Charsets ---
    # gfx_faq QID 19: "Put the charset file in /quake/qw/textures/charsets/"
    "Charsets": {
        "role": "user-asset:charset",
        "install_path_template": "qw/textures/charsets/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 19",
        "filename_constraint": None,
        "notes": "Load with /loadcharset filename",
    },
    "Charsets / 512x512": {
        "role": "user-asset:charset",
        "install_path_template": "qw/textures/charsets/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 19",
        "filename_constraint": None,
        "notes": "512x512 resolution variant",
    },
    "Charsets / 128x128": {
        "role": "user-asset:charset",
        "install_path_template": "qw/textures/charsets/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 19",
        "filename_constraint": None,
        "notes": "128x128 resolution variant",
    },
    "Charsets / 256x256": {
        "role": "user-asset:charset",
        "install_path_template": "qw/textures/charsets/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 19",
        "filename_constraint": None,
        "notes": "256x256 resolution variant",
    },
    "Charsets / 1024x1024 or larger": {
        "role": "user-asset:charset",
        "install_path_template": "qw/textures/charsets/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 19",
        "filename_constraint": None,
        "notes": "1024x1024+ high-res variant",
    },

    # --- Conbacks ---
    # gfx_faq QID 20: "Put in /quake/qw/gfx/. File must be named conback.png."
    # NOTE: file extension can vary (png, jpg, tga); we keep original ext but rename to conback.<ext>
    "Conbacks": {
        "role": "user-asset:conback",
        "install_path_template": "qw/gfx/conback.{ext}",
        "confidence": "high",
        "source": "gfx_faq QID 20",
        "filename_constraint": "conback.{ext}",
        "notes": "Must be renamed to conback.<ext>; loaded automatically at engine start",
    },

    # --- HUD ---
    # gfx_faq QID 23: "HUD files are placed in qw/textures/wad/"
    # Also gfx_faq QID 18: "Face and numbers, armor, powerup icons: /quake/qw/textures/wad/"
    "HUD": {
        "role": "user-asset:hud-element",
        "install_path_template": "qw/textures/wad/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 23",
        "filename_constraint": None,
        "notes": "Top-level HUD category",
    },
    "HUD / Sets": {
        "role": "user-asset:hud-element",
        "install_path_template": "qw/textures/wad/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 23",
        "filename_constraint": None,
        "notes": "Complete HUD sets (face, armor, numbers, etc.)",
    },
    "HUD / Numbers": {
        "role": "user-asset:hud-element",
        "install_path_template": "qw/textures/wad/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 23 (specifically numbers)",
        "filename_constraint": None,
        "notes": "Ammo/health number glyphs (anum_0..9, snum_0..9, etc.)",
    },
    "HUD / Face and Armor": {
        "role": "user-asset:hud-element",
        "install_path_template": "qw/textures/wad/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 23",
        "filename_constraint": None,
        "notes": "Face icons and armor icons (face_p*, face_inv*, etc.)",
    },
    "HUD / Weapon": {
        "role": "user-asset:hud-element",
        "install_path_template": "qw/textures/wad/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 23",
        "filename_constraint": None,
        "notes": "Weapon icons displayed in HUD",
    },
    "HUD / Icons": {
        "role": "user-asset:hud-element",
        "install_path_template": "qw/textures/wad/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 23",
        "filename_constraint": None,
        "notes": "Miscellaneous HUD icons (powerup, item, etc.)",
    },
    "HUD / WADs": {
        # WAD files themselves (binary WAD archives), not textures from a WAD
        "role": "user-asset:wad",
        "install_path_template": "qw/{filename}",
        "confidence": "medium",
        "source": "inferred (WAD files go at quake root or qw/)",
        "filename_constraint": None,
        "notes": "Binary WAD archives; ezquake loads from qw/ or can specify path",
    },

    # --- Textures ---
    # gfx_faq QID 18: "Weapon textures: /quake/qw/textures/models/"
    # gfx_faq QID 18: "Health and ammunition: /quake/qw/textures/bmodels/"
    # gfx_faq QID 22 (QID 22 is about teleport, path varies by map)
    "Textures": {
        "role": "user-asset:texture",
        "install_path_template": "qw/textures/{filename}",
        "confidence": "medium",
        "source": "gfx_faq QID 18 (multi-path)",
        "filename_constraint": None,
        "notes": "Top-level Textures: exact install path depends on content; medium confidence",
    },
    "Textures / Sets": {
        "role": "user-asset:texture-set",
        "install_path_template": "qw/textures/{filename}",
        "confidence": "low",
        "source": "inferred (collections)",
        "filename_constraint": None,
        "notes": "Multi-type texture sets; content determines exact path",
    },
    "Textures / Weapon": {
        "role": "user-asset:texture-weapon",
        "install_path_template": "qw/textures/models/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 18",
        "filename_constraint": None,
        "notes": "Weapon model textures (v_* family) → qw/textures/models/",
    },
    "Textures / Lava and Teleport": {
        "role": "user-asset:texture-environment",
        "install_path_template": "qw/textures/{filename}",
        "confidence": "medium",
        "source": "gfx_faq QID 22 (path varies by map)",
        "filename_constraint": None,
        "notes": "For all maps: qw/textures/#teleport.tga; per-map: qw/textures/MAPNAME/#teleport.tga",
    },
    "Textures / Armor": {
        "role": "user-asset:texture-armor",
        "install_path_template": "qw/textures/bmodels/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 18 (bmodels)",
        "filename_constraint": None,
        "notes": "Armor brushmodel textures → qw/textures/bmodels/",
    },
    "Textures / Megahealth": {
        "role": "user-asset:texture-pickup",
        "install_path_template": "qw/textures/bmodels/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 18",
        "filename_constraint": None,
        "notes": "Health pack brushmodel textures → qw/textures/bmodels/",
    },
    "Textures / Ammunition": {
        "role": "user-asset:texture-pickup",
        "install_path_template": "qw/textures/bmodels/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 18",
        "filename_constraint": None,
        "notes": "Ammo brushmodel textures → qw/textures/bmodels/",
    },
    "Textures / Backpack": {
        "role": "user-asset:texture-pickup",
        "install_path_template": "qw/textures/models/{filename}",
        "confidence": "medium",
        "source": "inferred from backpack=v_model convention",
        "filename_constraint": None,
        "notes": "Backpack is a v_model in QW, not a bmodel; textures/models/ rather than bmodels/",
    },
    "Textures / Map textures": {
        "role": "user-asset:texture-map",
        "install_path_template": "qw/textures/{mapname}/{filename}",
        "confidence": "medium",
        "source": "inferred; mapname needs extraction",
        "filename_constraint": None,
        "notes": "Map-specific texture set; mapname extracted from bundle title or zip paths",
    },
    "Textures / Team Fortress": {
        "role": "user-asset:texture-tf",
        "install_path_template": "fortress/textures/{filename}",
        "confidence": "low",
        "source": "inferred TF convention",
        "filename_constraint": None,
        "notes": "TF uses fortress/ gamedir; mirrors standard textures/ path layout",
    },

    # --- Models ---
    # Quake convention: progs/*.mdl
    "Models": {
        "role": "user-asset:model",
        "install_path_template": "qw/progs/{filename}",
        "confidence": "medium",
        "source": "quake-convention",
        "filename_constraint": None,
        "notes": "Top-level Models; exact progs subpath may vary",
    },
    "Models / Weapon": {
        "role": "user-asset:model",
        "install_path_template": "qw/progs/{filename}",
        "confidence": "medium",
        "source": "quake-convention",
        "filename_constraint": None,
        "notes": "View-model weapons (v_*.mdl, w_*.mdl) → qw/progs/",
    },
    "Models / Monster": {
        "role": "user-asset:model-monster",
        "install_path_template": "qw/progs/{filename}",
        "confidence": "medium",
        "source": "quake-convention",
        "filename_constraint": None,
        "notes": "Monster model replacements → qw/progs/",
    },
    "Models / Item": {
        "role": "user-asset:model-item",
        "install_path_template": "qw/progs/{filename}",
        "confidence": "medium",
        "source": "quake-convention",
        "filename_constraint": None,
        "notes": "Item model replacements (v_*.mdl, item pickups) → qw/progs/",
    },
    "Models / Armor": {
        "role": "user-asset:model-armor",
        "install_path_template": "qw/progs/{filename}",
        "confidence": "medium",
        "source": "quake-convention",
        "filename_constraint": None,
        "notes": "Armor model replacements → qw/progs/",
    },
    "Models / Team Fortress": {
        "role": "user-asset:model-tf",
        "install_path_template": "fortress/progs/{filename}",
        "confidence": "low",
        "source": "inferred",
        "filename_constraint": None,
        "notes": "TF model replacements → fortress/progs/",
    },
    "Models / Sets": {
        "role": "user-asset:model-set",
        "install_path_template": "qw/progs/{filename}",
        "confidence": "low",
        "source": "inferred",
        "filename_constraint": None,
        "notes": "Model set packs containing multiple models",
    },

    # --- Configs ---
    # Quake convention: .cfg files live in qw/
    "Configs": {
        "role": "user-asset:config",
        "install_path_template": "qw/{filename}",
        "confidence": "high",
        "source": "quake-convention",
        "filename_constraint": None,
        "notes": "Top-level config files → qw/",
    },
    "Configs / Teamplay": {
        "role": "user-asset:config",
        "install_path_template": "qw/{filename}",
        "confidence": "high",
        "source": "quake-convention",
        "filename_constraint": None,
        "notes": "Teamplay-specific cfg files",
    },
    "Configs / Eyecandy": {
        "role": "user-asset:config",
        "install_path_template": "qw/{filename}",
        "confidence": "high",
        "source": "quake-convention",
        "filename_constraint": None,
        "notes": "Visual preference configs (particles, colors, etc.)",
    },
    "Configs / Performance": {
        "role": "user-asset:config",
        "install_path_template": "qw/{filename}",
        "confidence": "high",
        "source": "quake-convention",
        "filename_constraint": None,
        "notes": "Performance/FPS optimization configs",
    },
    "Configs / Software": {
        "role": "user-asset:config",
        "install_path_template": "qw/{filename}",
        "confidence": "high",
        "source": "quake-convention",
        "filename_constraint": None,
        "notes": "Software renderer configs (sw_* cvars)",
    },
    "Configs / HUD": {
        "role": "user-asset:config-hud",
        "install_path_template": "qw/{filename}",
        "confidence": "medium",
        "source": "likely a .cfg file that exec's HUD bindings",
        "filename_constraint": None,
        "notes": "HUD-specific configs; may bundle HUD image assets as well",
    },
    "Configs / Scripts": {
        "role": "user-asset:config-script",
        "install_path_template": "qw/{filename}",
        "confidence": "medium",
        "source": "aliases/scripts file",
        "filename_constraint": None,
        "notes": "Alias/script cfg files (weapon scripts, tp scripts, etc.)",
    },

    # --- Other ---
    # gfx_faq QID 16: "Put the skybox files in /quake/qw/env/"
    "Other / Skyboxes": {
        "role": "user-asset:skybox",
        "install_path_template": "qw/env/{filename}",
        "confidence": "high",
        "source": "gfx_faq QID 16",
        "filename_constraint": None,
        "notes": "Load with /loadsky filename",
    },
    # ezQuake-specific: levelshots shown during map load
    "Other / Levelshots": {
        "role": "user-asset:levelshot",
        "install_path_template": "qw/textures/levelshots/{filename}",
        "confidence": "medium",
        "source": "ezquake-specific convention",
        "filename_constraint": None,
        "notes": "Map loading screen screenshots",
    },
    "Other / Sounds": {
        "role": "user-asset:sound",
        "install_path_template": "qw/sound/{filename}",
        "confidence": "medium",
        "source": "inferred; many sounds are nested",
        "filename_constraint": None,
        "notes": "Custom sound replacements; nested paths (e.g. weapons/ric1.wav) preserved via filename",
    },
    "Other": {
        "role": "user-asset:other",
        "install_path_template": "qw/{filename}",
        "confidence": "low",
        "source": "fallback",
        "filename_constraint": None,
        "notes": "Catch-all for uncategorized content",
    },

    # --- Maps ---
    "Maps": {
        "role": "library:map",
        "install_path_template": "qw/maps/{filename}",
        "confidence": "medium",
        "source": "quake-convention",
        "filename_constraint": None,
        "notes": "Top-level Maps category; BSP/LIT/ENT files → qw/maps/",
    },
    "Maps / Trick maps": {
        "role": "library:map",
        "install_path_template": "qw/maps/{filename}",
        "confidence": "medium",
        "source": "quake-convention",
        "filename_constraint": None,
        "notes": "Trick/jump/practice maps",
    },
    "Maps / DMM4": {
        "role": "library:map",
        "install_path_template": "qw/maps/{filename}",
        "confidence": "medium",
        "source": "quake-convention",
        "filename_constraint": None,
        "notes": "DMM4-only maps (telefragger variant)",
    },
    "Maps / Map textures": {
        "role": "user-asset:texture-map",
        "install_path_template": "qw/textures/{mapname}/{filename}",
        "confidence": "medium",
        "source": "inferred; mapname-extraction needed",
        "filename_constraint": None,
        "notes": "Map-specific texture replacement packs; mapname from title or paths",
    },
}


# ---------------------------------------------------------------------------
# Known QW map names for mapname extraction from titles/paths
# Covers the maps seen in this corpus; used as a lookup set for disambiguation
# ---------------------------------------------------------------------------

KNOWN_MAPNAMES = {
    # Standard deathmatch maps
    "dm1", "dm2", "dm3", "dm4", "dm5", "dm6",
    # Single-player episodes (occasionally texture-replaced)
    "e1m1", "e1m2", "e1m3", "e1m4", "e1m5", "e1m6", "e1m7",
    "e2m1", "e2m2", "e2m3", "e2m4", "e2m5", "e2m6", "e2m7",
    "end",
    # Common community maps
    "aerowalk", "aero",
    "ztndm3", "ztn", "ztn2dm3",
    "povdmm4", "povdm4", "pov",
    "aggressor", "ztndm1",
    "e1m6qw", "e3m7qw",
    "skull", "skull2",
    "vdm3",
    "2bfree",
    "cfree1b2",
    "jqfs3",
    "endif",
    "bravado", "excessiveplus", "bravado2",
    "cmt1", "cmt1b", "cmt2", "cmt3", "cmt4",
    "hub3aero",
}


def extract_mapname_from_title(title: str) -> tuple[str | None, bool]:
    """
    Try to extract a mapname from a bundle title.
    Returns (mapname_or_None, was_inferred_from_known_list).
    Strategy:
    1. Scan title words for known mapnames (highest confidence)
    2. Use first 'word' (letters/digits, no spaces) if it looks like a map name
       (starts with known prefix patterns: dm, e[0-9], ztn, aero, pov, etc.)
    """
    title_lower = title.lower()
    # Strip common noise words that appear in map texture bundle titles
    noise = {"textures", "texture", "pack", "set", "alternative", "new", "custom",
             "for", "the", "of", "with", "and", "by", "a", "an", "grey", "greyish",
             "blue", "red", "green", "pink", "orange", "dark", "light", "cozier",
             "rocky", "mixed", "high", "quality", "hd", "color", "colour", "lit",
             "lighting", "lights", "modified", "modified", "clean", "replacement"}

    # First pass: look for known mapnames as substrings.
    # A title naming several known maps is ambiguous: picking one used to follow
    # set iteration order, so the answer changed per run (bundle 597 "aero ztn
    # dm2 reskins", which actually holds aerowalk + ztndm3 dirs). Return None so
    # the caller falls back to the member paths, which name the real map dirs.
    hits = [
        mapname for mapname in KNOWN_MAPNAMES
        # word-boundary match: mapname surrounded by non-alphanumeric
        if re.search(r'(?:^|[\s_\-/])' + re.escape(mapname) + r'(?:$|[\s_\-/])', title_lower)
    ]
    if len(hits) == 1:
        return hits[0], True
    if len(hits) > 1:
        return None, False

    # Second pass: tokenize and look for map-shaped tokens
    tokens = re.findall(r'[a-z0-9]+', title_lower)
    tokens = [t for t in tokens if t not in noise]
    for token in tokens:
        # Looks like a map name if: starts with dm, e[0-9], end, pov, ztn, aero, etc.
        if re.match(r'^(dm\d|e\dm\d|end|pov|ztn|aero|skull|vdm|cmt|hub|qw\d)', token):
            return token, True
        # 2bfree, cfree-style names (starts with digit or c+free pattern)
        if re.match(r'^(2b|cf|jq)', token):
            return token, True
        # Short alphanumeric slugs that look like map names (not English words)
        # e.g. efdm8, pkeg1, ultrav, utressor, bravadob5, monsoon, schloss
        # Heuristic: <= 12 chars, contains at least one digit OR is an all-lowercase
        # slug with no vowel clusters (vowel-sparse = map-name-like)
        if re.match(r'^[a-z][a-z0-9]{2,11}$', token):
            has_digit = any(c.isdigit() for c in token)
            # Count vowels; low vowel ratio suggests an acronym/map-slug
            vowel_ratio = sum(1 for c in token if c in 'aeiou') / len(token)
            if has_digit or vowel_ratio < 0.4:
                return token, False

    # Third pass: if only a single non-noise word remains and title is short
    if len(tokens) == 1 and len(tokens[0]) <= 12:
        return tokens[0], False

    return None, False


def extract_mapname_from_paths(paths: list[str]) -> tuple[str | None, bool]:
    """
    Try to infer mapname from member paths when title extraction fails.
    Look for patterns like 'dm2/texture.png' or 'qw/textures/dm3/foo.png'.
    Also handles bare files in a mapname-named dir (bravadob5/tex.png).
    """
    # Skip these as mapname candidates -- they are gamedir or category names
    _SKIP_DIRS = {"qw", "id1", "fortress", "textures", "models", "progs", "sound",
                  "skins", "maps", "env", "gfx", "crosshairs", "charsets", "wad",
                  "bmodels", "levelshots", "locs", "cfg", "hud", "sounds", "ezquake"}

    # Pass 1: known mapnames in any path segment
    for path in paths[:30]:
        parts = path.replace("\\", "/").split("/")
        for part in parts:
            part_lower = part.lower().split(" ")[0]
            clean = re.split(r'[_\s]', part_lower)[0]
            if clean in KNOWN_MAPNAMES:
                return clean, True
            if re.match(r'^(dm\d|e\dm\d|end|pov|ztn|aero|skull|vdm|cmt|endif|2bfree|cfree|jqfs)', clean):
                return clean, True

    # Pass 2: if most paths share a common first directory segment that looks
    # like a mapname (short alphanumeric slug, not a reserved dir name), use it.
    # This handles community maps like bravadob5, efdm8, monsoon, etc.
    first_segments: Counter = Counter()
    for path in paths[:30]:
        parts = path.replace("\\", "/").split("/")
        if len(parts) >= 2:
            seg = parts[0].lower()
            # Strip trailing descriptors: 'aerowalk   blue curve' → 'aerowalk'
            seg_clean = re.split(r'[\s_\-]', seg)[0]
            if (seg_clean and seg_clean not in _SKIP_DIRS
                    and re.match(r'^[a-z0-9]{2,16}$', seg_clean)
                    and not seg_clean.isdigit()):
                first_segments[seg_clean] += 1

    if first_segments:
        best, count = first_segments.most_common(1)[0]
        # Require the segment to appear in the majority of paths
        if count >= max(2, len(paths) * 0.5):
            return best, False  # inferred=False since not in known list

    return None, False


# ---------------------------------------------------------------------------
# Step A: bundle-meta detection (independent of DB category)
# Applied first; these rules override category-based classification.
# Returns (role, target_path) or (None, None) if not a meta file.
# ---------------------------------------------------------------------------

# Compiled patterns for step A
_JUNK_FILES = {"thumbs.db", ".ds_store"}
_JUNK_EXTS = {".tmp", ".bak", ".dat", ".ini", ".wav_", ".db"}
_SOURCE_EXTS = {".psd", ".ai", ".xcf"}
_DOC_EXTS = {".html", ".htm", ".url"}
_META_DIRS_SOURCE = {"src", "source", "sources"}
_META_DIRS_VARIANT = {"extras", "extras with fixes"}

_PREVIEW_RE = re.compile(
    r'(?:^|/)(?:.*\.preview\.|preview\.|.*_preview\.)'
    r'(?:jpg|jpeg|png)$', re.IGNORECASE)

_CHANGELOG_RE = re.compile(
    r'(?:^|/)changelog[^/]*$', re.IGNORECASE)

_README_RE = re.compile(
    r'(?:^|/)readme[^/]*\.(?:txt|md)$', re.IGNORECASE)

# Conback's cconback.* names are NOT meta; handled in step B
_CONBACK_PREVIEW_RE = re.compile(
    r'(?:^|/)(?:.*_preview\.|preview\.)(?:jpg|jpeg|png)$', re.IGNORECASE)


def classify_bundle_meta(member_path: str) -> tuple[str | None, None]:
    """Returns (role, None) if the file is bundle-meta, else (None, None)."""
    lower = member_path.lower()
    basename = os.path.basename(lower)
    ext = os.path.splitext(basename)[1]

    # Junk: exact filename matches
    if basename in _JUNK_FILES:
        return "bundle-meta:junk", None

    # Junk: extension matches
    if ext in _JUNK_EXTS:
        return "bundle-meta:junk", None

    # Readme
    if _README_RE.search(lower):
        return "bundle-meta:readme", None

    # Changelog
    if _CHANGELOG_RE.search(lower):
        return "bundle-meta:changelog", None

    # Preview image
    if _PREVIEW_RE.search(lower):
        return "bundle-meta:preview-image", None

    # Source files (.psd, .ai, .xcf)
    if ext in _SOURCE_EXTS:
        return "bundle-meta:source-file", None

    # Doc-other
    if ext in _DOC_EXTS:
        return "bundle-meta:doc-other", None

    # Source directory
    path_parts = lower.replace("\\", "/").split("/")
    if len(path_parts) > 1:
        first_dir = path_parts[0]
        # Check source dirs (exact dir name match)
        if first_dir in _META_DIRS_SOURCE:
            return "bundle-meta:source-dir", None
        # Check variant/bonus dirs
        if first_dir in _META_DIRS_VARIANT:
            return "bundle-meta:variant-bonus", None
        # Also check second level for wrapped bundles (wrapper/src/...)
        if len(path_parts) > 2 and path_parts[1] in _META_DIRS_SOURCE:
            return "bundle-meta:source-dir", None
        if len(path_parts) > 2 and path_parts[1] in _META_DIRS_VARIANT:
            return "bundle-meta:variant-bonus", None

    return None, None


# ---------------------------------------------------------------------------
# Step C: fallback path-pattern classifier for mixed-bundle secondary role
# Simplified subset of Pass 1 rules, used only for secondary classification.
# ---------------------------------------------------------------------------

_IMG_RE = re.compile(r'\.(png|tga|jpg|bmp)$', re.IGNORECASE)
_IMG_T_RE = re.compile(r'\.(png|tga)$', re.IGNORECASE)

def classify_fallback(member_path: str) -> str:
    """Simplified path-pattern classification for mixed-secondary detection."""
    lower = member_path.lower().replace("\\", "/")
    basename = os.path.basename(lower)
    ext = os.path.splitext(basename)[1]

    # Configs
    if ext == ".cfg":
        return "user-asset:config"

    # Maps
    if ext == ".bsp":
        return "library:map"
    if ext == ".lit":
        return "library:map-lighting"

    # Models
    if ext == ".mdl":
        return "user-asset:model"

    # Sounds
    if ext == ".wav":
        return "user-asset:sound"

    # PAK/PK3/WAD archives
    if ext == ".pak":
        return "bundle-meta:pak-archive"
    if ext == ".pk3":
        return "bundle-meta:pk3-archive"
    if ext in (".wad",):
        return "bundle-meta:wad-archive"

    # Nested archives
    if ext in (".zip", ".rar", ".7z"):
        return "bundle-meta:nested-archive"

    if _IMG_RE.search(lower):
        # Specific path-based image classification
        if "/textures/wad/" in lower or "/textures/wads/" in lower:
            return "user-asset:hud-element"
        if "/textures/models/" in lower:
            return "user-asset:texture-weapon"
        if "/textures/bmodels/" in lower:
            return "user-asset:texture-pickup"
        if "/textures/charsets/" in lower:
            return "user-asset:charset"
        if "/env/" in lower:
            return "user-asset:skybox"
        if "/crosshairs/" in lower:
            return "user-asset:crosshair"
        if "/skins/" in lower:
            return "user-asset:skin"
        if "/gfx/" in lower:
            if "conback" in lower:
                return "user-asset:conback"
            return "user-asset:gfx-element"
        if "/textures/" in lower:
            return "user-asset:texture-map"
        # Root-level or single-dir image
        return "user-asset:texture-other"

    # PCX = almost always a skin
    if ext == ".pcx":
        return "user-asset:skin"

    return "user-asset:other"


# ---------------------------------------------------------------------------
# Expected extension sets per primary role
# Used to detect MIXED secondary files in a bundle
# ---------------------------------------------------------------------------

ROLE_EXPECTED_EXTS: dict[str, set[str]] = {
    "user-asset:crosshair":         {".png", ".tga"},
    "user-asset:skin":              {".pcx", ".png", ".tga"},
    "user-asset:skin-monster":      {".pcx", ".png", ".tga"},
    "user-asset:skin-gib":          {".pcx", ".png", ".tga"},
    "user-asset:skin-tf":           {".pcx", ".png", ".tga"},
    "user-asset:charset":           {".png", ".tga"},
    "user-asset:conback":           {".png", ".jpg", ".tga", ".bmp", ".lmp"},
    "user-asset:hud-element":       {".png", ".tga", ".jpg"},
    # HUD/WADs bundles contain either .wad archives OR the extracted PNG textures
    "user-asset:wad":               {".wad", ".png", ".tga", ".jpg"},
    "user-asset:texture":           {".png", ".tga", ".jpg"},
    "user-asset:texture-set":       {".png", ".tga", ".jpg"},
    "user-asset:texture-weapon":    {".png", ".tga", ".jpg"},
    "user-asset:texture-environment": {".png", ".tga", ".jpg"},
    "user-asset:texture-armor":     {".png", ".tga", ".jpg"},
    "user-asset:texture-pickup":    {".png", ".tga", ".jpg"},
    # map texture bundles also contain .lit (map lighting), .pak (packed textures),
    # .pk3 (packed textures), .bsp (occasionally bundled), .loc
    "user-asset:texture-map":       {".png", ".tga", ".jpg", ".lit", ".pak", ".pk3", ".bsp", ".loc"},
    "user-asset:texture-tf":        {".png", ".tga", ".jpg"},
    # model bundles routinely contain companion textures (v_*_0.png luma files, etc.)
    # and the category is really "replacement for this model family including its textures"
    "user-asset:model":             {".mdl", ".spr", ".png", ".tga", ".jpg"},
    "user-asset:model-monster":     {".mdl", ".spr", ".png", ".tga", ".jpg"},
    "user-asset:model-item":        {".mdl", ".spr", ".png", ".tga", ".jpg"},
    "user-asset:model-armor":       {".mdl", ".spr", ".png", ".tga", ".jpg"},
    "user-asset:model-tf":          {".mdl", ".spr", ".png", ".tga", ".jpg"},
    "user-asset:model-set":         {".mdl", ".spr", ".png", ".tga", ".jpg"},
    "user-asset:config":            {".cfg"},
    "user-asset:config-hud":        {".cfg", ".png", ".tga"},
    "user-asset:config-script":     {".cfg"},
    "user-asset:skybox":            {".png", ".tga", ".jpg"},
    "user-asset:levelshot":         {".png", ".tga", ".jpg"},
    "user-asset:sound":             {".wav", ".ogg"},
    "user-asset:other":             set(),  # anything goes
    "library:map":                  {".bsp", ".lit", ".ent", ".loc"},
}


# ---------------------------------------------------------------------------
# Main classification logic
# ---------------------------------------------------------------------------

def build_target_path(
    mapping: dict,
    basename: str,
    ext: str,
    mapname: str | None,
) -> tuple[str, bool, str | None, bool]:
    """
    Build the target_path from the mapping entry + file metadata.
    Returns (target_path, target_filename_renamed, mapname, mapname_inferred).
    """
    template = mapping.get("install_path_template", "")
    constraint = mapping.get("filename_constraint")
    role = mapping["role"]
    renamed = False
    mapname_inferred = None

    if not template:
        return None, False, None, None

    # Conback special case: rename to conback.<ext>
    if constraint == "conback.{ext}":
        ext_clean = ext.lstrip(".")
        # Decide whether we actually need to rename
        # Only skip rename flag if the file is already the exact canonical name
        if not basename.lower().startswith("conback."):
            renamed = True
        install_filename = f"conback.{ext_clean}"
        target = template.replace("{ext}", ext_clean)
        return target, renamed, None, None

    # Map texture case: inject mapname
    if "{mapname}" in template:
        if mapname:
            target = template.replace("{mapname}", mapname).replace("{filename}", basename)
            mapname_inferred = True
        else:
            target = f"qw/textures/_unknown_map/{basename}"
            mapname_inferred = False
        return target, False, mapname, mapname_inferred

    # Model bundle with texture file: reroute to qw/textures/models/ instead of qw/progs/
    # Model bundles include companion luma/skin textures alongside .mdl files.
    if role.startswith("user-asset:model") and ext in (".png", ".tga", ".jpg"):
        target = f"qw/textures/models/{basename}"
        return target, False, None, None

    # HUD/WADs bundle with image file: these are extracted WAD textures → qw/textures/wad/
    # The WAD archive itself goes to qw/{filename} per the mapping, but the individual
    # PNG/TGA textures inside (or bundled instead of the WAD) belong in wad/.
    if role == "user-asset:wad" and ext in (".png", ".tga", ".jpg"):
        target = f"qw/textures/wad/{basename}"
        return target, False, None, None

    # Standard case
    target = template.replace("{filename}", basename)
    return target, False, None, None


def run():
    # Load bundles
    with open(BUNDLES_PATH) as f:
        bundles = json.load(f)
    bundle_by_id = {b["iid"]: b for b in bundles}

    # Load blobs
    blobs = []
    with open(BLOBS_PATH) as f:
        for line in f:
            line = line.strip()
            if line:
                blobs.append(json.loads(line))

    # Group blobs by bundle_id for mapname extraction
    blobs_by_bundle: dict[int, list[dict]] = defaultdict(list)
    for blob in blobs:
        blobs_by_bundle[blob["bundle_id"]].append(blob)

    # ---------------------------------------------------------------------------
    # Pre-compute per-bundle mapname (for Maps/Map textures category)
    # ---------------------------------------------------------------------------
    bundle_mapnames: dict[int, tuple[str | None, bool]] = {}
    for bid, bundle in bundle_by_id.items():
        if bundle.get("category_path") == "Maps / Map textures":
            title = bundle.get("title", "")
            mapname, inferred = extract_mapname_from_title(title)
            if not mapname:
                paths = [b["member_path"] for b in blobs_by_bundle.get(bid, [])]
                mapname, inferred = extract_mapname_from_paths(paths)
            bundle_mapnames[bid] = (mapname, inferred)

    # Load pass 1 cross-validation for MISMATCH recovery analysis
    mismatch_ids: set[int] = set()
    try:
        with open(CROSS_VAL_PATH) as f:
            cv = json.load(f)
        mismatch_ids = {r["bundle_id"] for r in cv if r.get("status") == "MISMATCH"}
    except Exception:
        pass  # non-critical

    # ---------------------------------------------------------------------------
    # Classify each blob
    # ---------------------------------------------------------------------------
    records: list[dict] = []
    # Track bundle-level primary roles for MIXED detection
    bundle_primary_roles: dict[int, str] = {}
    for bid, bundle in bundle_by_id.items():
        cp = bundle.get("category_path", "")
        mapping = CATEGORY_MAP.get(cp)
        if mapping:
            bundle_primary_roles[bid] = mapping["role"]

    for blob in blobs:
        bid = blob["bundle_id"]
        bundle = bundle_by_id.get(bid)

        # Handle orphan blobs (bundle_id not in bundles.json)
        if bundle is None:
            record = {
                "xxh3_128": blob["xxh3_128"],
                "bundle_id": bid,
                "bundle_title": None,
                "bundle_category_path": None,
                "source_member_path": blob["member_path"],
                "role": "orphan",
                "target_path": None,
                "install_confidence": "none",
                "install_source": None,
                "mixed_bundle": False,
                "target_filename_renamed": False,
                "mapname_inferred": None,
                "size_bytes": blob["size_bytes"],
                "author_id": None,
                "author_org": None,
                "date_added_iso": None,
                "downloads": None,
            }
            records.append(record)
            continue

        member_path = blob["member_path"]
        basename = os.path.basename(member_path)
        ext = os.path.splitext(basename)[1].lower()
        category_path = bundle.get("category_path", "")
        mapping = CATEGORY_MAP.get(category_path)

        # -------------------------------------------------------------------
        # Step A: bundle-meta detection (takes priority over everything)
        # -------------------------------------------------------------------
        meta_role, _ = classify_bundle_meta(member_path)
        if meta_role:
            record = {
                "xxh3_128": blob["xxh3_128"],
                "bundle_id": bid,
                "bundle_title": bundle["title"],
                "bundle_category_path": category_path,
                "source_member_path": member_path,
                "role": meta_role,
                "target_path": None,
                "install_confidence": "high",
                "install_source": "bundle-meta-rule",
                "mixed_bundle": False,
                "target_filename_renamed": False,
                "mapname_inferred": None,
                "size_bytes": blob["size_bytes"],
                "author_id": bundle.get("author_id"),
                "author_org": bundle.get("author_org", ""),
                "date_added_iso": bundle.get("date_added_iso"),
                "downloads": bundle.get("downloads"),
            }
            records.append(record)
            continue

        # -------------------------------------------------------------------
        # Step D: unmapped DB category
        # -------------------------------------------------------------------
        if not mapping:
            record = {
                "xxh3_128": blob["xxh3_128"],
                "bundle_id": bid,
                "bundle_title": bundle["title"],
                "bundle_category_path": category_path,
                "source_member_path": member_path,
                "role": "unmapped",
                "target_path": None,
                "install_confidence": "none",
                "install_source": None,
                "mixed_bundle": False,
                "target_filename_renamed": False,
                "mapname_inferred": None,
                "size_bytes": blob["size_bytes"],
                "author_id": bundle.get("author_id"),
                "author_org": bundle.get("author_org", ""),
                "date_added_iso": bundle.get("date_added_iso"),
                "downloads": bundle.get("downloads"),
            }
            records.append(record)
            continue

        # -------------------------------------------------------------------
        # Step B: DB-category-driven installation
        # -------------------------------------------------------------------
        primary_role = mapping["role"]
        mapname_info = bundle_mapnames.get(bid, (None, None))
        mapname_val, mapname_inferred_flag = mapname_info

        target_path, renamed, mapname_used, mapname_inferred = build_target_path(
            mapping, basename, ext, mapname_val
        )

        # -------------------------------------------------------------------
        # Step C: MIXED detection
        # Is this file's extension outside what's expected for this category?
        # -------------------------------------------------------------------
        expected_exts = ROLE_EXPECTED_EXTS.get(primary_role, set())
        is_mixed = False
        final_role = primary_role
        fallback_role = None

        if expected_exts and ext and ext not in expected_exts:
            # File extension doesn't fit the expected type for this category
            # Use fallback classifier to assign a secondary role
            fallback_role = classify_fallback(member_path)
            # Only flag as mixed if the fallback role is a real installable one
            # (not meta, orphan, etc.) and differs from primary
            if (not fallback_role.startswith("bundle-meta:") and
                    fallback_role != primary_role):
                is_mixed = True
                final_role = "mixed-secondary"

        record = {
            "xxh3_128": blob["xxh3_128"],
            "bundle_id": bid,
            "bundle_title": bundle["title"],
            "bundle_category_path": category_path,
            "source_member_path": member_path,
            "role": final_role if is_mixed else primary_role,
            "target_path": target_path if not is_mixed else None,
            "install_confidence": mapping["confidence"] if not is_mixed else "low",
            "install_source": mapping["source"] if not is_mixed else f"mixed-secondary:{fallback_role}",
            "mixed_bundle": is_mixed,
            "target_filename_renamed": renamed,
            "mapname_inferred": mapname_inferred if mapname_inferred is not None else None,
            "size_bytes": blob["size_bytes"],
            "author_id": bundle.get("author_id"),
            "author_org": bundle.get("author_org", ""),
            "date_added_iso": bundle.get("date_added_iso"),
            "downloads": bundle.get("downloads"),
        }
        records.append(record)

    # Write manifest
    with open(MANIFEST_PATH, "w") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")

    print(f"Wrote {len(records)} records to {MANIFEST_PATH}")

    # ---------------------------------------------------------------------------
    # Build coverage report
    # ---------------------------------------------------------------------------
    total = len(records)
    meta_roles = {r for r in {rec["role"] for rec in records} if r.startswith("bundle-meta:")}
    meta_files = [r for r in records if r["role"].startswith("bundle-meta:")]
    install_files = [r for r in records if r["target_path"] is not None]
    unmapped_files = [r for r in records if r["role"] == "unmapped"]
    mixed_files = [r for r in records if r["mixed_bundle"]]
    orphan_files = [r for r in records if r["role"] == "orphan"]

    # Non-meta files = all except bundle-meta:* and orphan
    non_meta = [r for r in records if not r["role"].startswith("bundle-meta:") and r["role"] != "orphan"]
    install_coverage = len(install_files) / len(non_meta) * 100 if non_meta else 0
    unmapped_rate = len(unmapped_files) / total * 100 if total else 0
    meta_rate = len(meta_files) / total * 100 if total else 0
    mixed_rate = len(mixed_files) / len(non_meta) * 100 if non_meta else 0

    # Per-role counts
    role_counts = Counter(r["role"] for r in records)

    # Per-confidence breakdown (install records only)
    conf_counts = Counter(r["install_confidence"] for r in install_files)

    # Unmapped categories
    unmapped_cats = set(r["bundle_category_path"] for r in unmapped_files if r["bundle_category_path"])

    # Mixed bundles: collect examples
    mixed_bundles_info: dict[int, dict] = {}
    for r in mixed_files:
        bid = r["bundle_id"]
        if bid not in mixed_bundles_info:
            mixed_bundles_info[bid] = {
                "title": r["bundle_title"],
                "category": r["bundle_category_path"],
                "primary_role": bundle_primary_roles.get(bid, "?"),
                "secondary_roles": set(),
                "example_paths": [],
            }
        sec = r["install_source"].replace("mixed-secondary:", "") if r["install_source"] else "?"
        mixed_bundles_info[bid]["secondary_roles"].add(sec)
        if len(mixed_bundles_info[bid]["example_paths"]) < 3:
            mixed_bundles_info[bid]["example_paths"].append(r["source_member_path"])

    # Conback rename impact
    conback_files = [r for r in records if r["bundle_category_path"] == "Conbacks"
                     and not r["role"].startswith("bundle-meta:")]
    renamed_files = [r for r in conback_files if r["target_filename_renamed"]]
    conback_bundles_renamed = len({r["bundle_id"] for r in renamed_files})

    # Map texture mapname extraction
    mt_bundles_all = [b for b in bundles if b.get("category_path") == "Maps / Map textures"]
    mt_with_mapname = [(bid, info) for bid, info in bundle_mapnames.items() if info[0] is not None]
    mt_without_mapname = [(bid, info) for bid, info in bundle_mapnames.items() if info[0] is None]

    # Per-bundle stats
    files_per_bundle = Counter(r["bundle_id"] for r in records if r["bundle_id"] is not None)
    non_meta_per_bundle = Counter(r["bundle_id"] for r in non_meta)
    fpb_vals = sorted(files_per_bundle.values())
    nmpb_vals = sorted(non_meta_per_bundle.values())
    def median(lst):
        n = len(lst)
        if not n:
            return 0
        return lst[n // 2] if n % 2 else (lst[n // 2 - 1] + lst[n // 2]) / 2

    # Hash-dedup at install level
    install_hash_target: dict[str, set[str]] = defaultdict(set)
    for r in install_files:
        install_hash_target[r["xxh3_128"]].add(r["target_path"])
    distinct_hash_target = sum(
        len(targets) for targets in install_hash_target.values()
    )
    multi_target_hashes = {h: list(t) for h, t in install_hash_target.items() if len(t) > 1}

    # MISMATCH recovery: of the 248 Pass 1 MISMATCH bundles, how many now have
    # a valid install record in Pass 2?
    mismatch_recovered = 0
    mismatch_still_bad = 0
    for mid in mismatch_ids:
        bundle_records = [r for r in records if r["bundle_id"] == mid]
        has_install = any(r["target_path"] is not None for r in bundle_records
                          if not r["role"].startswith("bundle-meta:"))
        if has_install:
            mismatch_recovered += 1
        else:
            mismatch_still_bad += 1

    # Write coverage report
    with open(COVERAGE_PATH, "w") as f:
        f.write("# Pass 2 Coverage Report\n\n")
        f.write("## Headline\n\n")
        f.write(f"- Total files in corpus: **{total:,}**\n")
        f.write(f"- Bundle-meta files: **{len(meta_files):,}** ({meta_rate:.1f}%)\n")
        f.write(f"- Non-meta files: **{len(non_meta):,}**\n")
        f.write(f"- Install-coverage (non-meta with target_path): **{len(install_files):,}** ({install_coverage:.1f}%)\n")
        f.write(f"- Unmapped DB category files: **{len(unmapped_files):,}** ({unmapped_rate:.1f}%)\n")
        f.write(f"- Mixed-secondary files: **{len(mixed_files):,}** ({mixed_rate:.1f}% of non-meta)\n")
        f.write(f"- Orphan files (bundle_id not in DB): **{len(orphan_files):,}**\n\n")

        f.write("## Per-Role File Counts (top 20)\n\n")
        f.write("| Role | Count |\n|------|-------|\n")
        for role, cnt in role_counts.most_common(20):
            f.write(f"| `{role}` | {cnt:,} |\n")
        f.write("\n")

        f.write("## Per-Confidence Breakdown (install records)\n\n")
        f.write("| Confidence | Count |\n|------------|-------|\n")
        for conf in ["high", "medium", "low", "none"]:
            f.write(f"| {conf} | {conf_counts.get(conf, 0):,} |\n")
        f.write("\n")

        f.write("## Unmapped DB Categories\n\n")
        if unmapped_cats:
            for cat in sorted(unmapped_cats):
                cnt = sum(1 for r in unmapped_files if r["bundle_category_path"] == cat)
                f.write(f"- `{cat}` ({cnt} files)\n")
        else:
            f.write("_None — all DB categories in corpus have a mapping entry._\n")
        f.write("\n")

        f.write("## Mixed Bundle Examples (up to 10)\n\n")
        for bid, info in list(mixed_bundles_info.items())[:10]:
            f.write(f"### Bundle {bid} — `{info['category']}`\n")
            f.write(f"- Title: {info['title']}\n")
            f.write(f"- Primary role: `{info['primary_role']}`\n")
            f.write(f"- Secondary roles: {', '.join(f'`{r}`' for r in sorted(info['secondary_roles']))}\n")
            f.write("- Sample paths:\n")
            for p in info["example_paths"]:
                f.write(f"  - `{p}`\n")
            f.write("\n")

        f.write("## Conback Rename Impact\n\n")
        f.write(f"- Conbacks bundles with renamed files: **{conback_bundles_renamed}**\n")
        f.write(f"- Total Conback files renamed to `conback.<ext>`: **{len(renamed_files)}**\n")
        f.write(f"- Already named `conback.*` (no rename needed): **{len(conback_files) - len(renamed_files)}**\n\n")

        f.write("## Map Texture Mapname Extraction\n\n")
        f.write(f"- Total Maps / Map textures bundles: **{len(mt_bundles_all)}**\n")
        f.write(f"- Mapname successfully inferred: **{len(mt_with_mapname)}** ({len(mt_with_mapname)/len(mt_bundles_all)*100:.1f}%)\n")
        f.write(f"- Mapname not inferred (→ `_unknown_map`): **{len(mt_without_mapname)}**\n\n")

        if mt_with_mapname:
            f.write("### Sample inferred mapnames\n\n")
            for bid, (mn, _) in list(mt_with_mapname)[:15]:
                b = bundle_by_id.get(bid, {})
                f.write(f"- Bundle {bid} `{b.get('title','?')}` → `{mn}`\n")
            f.write("\n")

        f.write("## Per-Bundle Stats\n\n")
        f.write(f"| Metric | All files | Non-meta files |\n|--------|-----------|----------------|\n")
        if fpb_vals:
            f.write(f"| Mean | {sum(fpb_vals)/len(fpb_vals):.1f} | {sum(nmpb_vals)/len(nmpb_vals) if nmpb_vals else 0:.1f} |\n")
            f.write(f"| Median | {median(fpb_vals):.1f} | {median(nmpb_vals) if nmpb_vals else 0:.1f} |\n")
            f.write(f"| Max | {max(fpb_vals)} | {max(nmpb_vals) if nmpb_vals else 0} |\n")
        f.write("\n")

        f.write("## Hash-Dedup at Install Level\n\n")
        f.write(f"- Total install records: **{len(install_files):,}**\n")
        f.write(f"- Distinct (xxh3_128, target_path) pairs: **{distinct_hash_target:,}**\n")
        f.write(f"- Unique xxh3_128 hashes appearing at multiple target_paths: **{len(multi_target_hashes):,}**\n\n")
        if multi_target_hashes:
            f.write("### Sample multi-target blobs (same blob, different install paths)\n\n")
            for h, paths in list(multi_target_hashes.items())[:10]:
                f.write(f"- `{h[:16]}...` → {', '.join(f'`{p}`' for p in paths[:3])}\n")
            f.write("\n")

        f.write("## Pass 1 → Pass 2 MISMATCH Recovery\n\n")
        f.write(f"- Pass 1 MISMATCH bundles: **{len(mismatch_ids)}**\n")
        f.write(f"- Now have valid install record in Pass 2: **{mismatch_recovered}** ({mismatch_recovered/len(mismatch_ids)*100:.1f}% recovery)\n")
        f.write(f"- Still without valid install record: **{mismatch_still_bad}**\n\n")

    print(f"Wrote coverage report to {COVERAGE_PATH}")

    # Print summary to stdout
    print(f"\n=== Pass 2 Summary ===")
    print(f"Total files: {total:,}")
    print(f"Install coverage (non-meta with target_path): {len(install_files):,} / {len(non_meta):,} = {install_coverage:.1f}%")
    print(f"Bundle-meta rate: {len(meta_files):,} ({meta_rate:.1f}%)")
    print(f"Unmapped rate: {len(unmapped_files):,} ({unmapped_rate:.1f}%)")
    print(f"Mixed-secondary: {len(mixed_files):,} ({mixed_rate:.1f}% of non-meta)")
    print(f"MISMATCH recovery: {mismatch_recovered}/{len(mismatch_ids)} ({mismatch_recovered/len(mismatch_ids)*100:.1f}%)" if mismatch_ids else "")
    print(f"\nTop 10 roles:")
    for role, cnt in role_counts.most_common(10):
        print(f"  {cnt:5,}  {role}")
    print(f"\nConfidence breakdown (install records):")
    for conf in ["high", "medium", "low", "none"]:
        print(f"  {conf:8}: {conf_counts.get(conf, 0):,}")
    print(f"\nConback renames: {len(renamed_files)} files across {conback_bundles_renamed} bundles")
    print(f"Map texture mapname inference: {len(mt_with_mapname)}/{len(mt_bundles_all)} ({len(mt_with_mapname)/len(mt_bundles_all)*100:.1f}%)" if mt_bundles_all else "")
    print(f"Multi-target blobs: {len(multi_target_hashes)}")


if __name__ == "__main__":
    run()
