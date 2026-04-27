#!/usr/bin/env python3
"""BSP entity-lump + texture-lump reader for Quake 1 BSPs (V29 / BSP2).

Format reference: https://www.gamers.org/dEngine/quake/spec/quake-spec34/qkspec_4.htm
Validated during brainstorm against 8 sample BSPs (parse_bsp.py).

Header (124 bytes):
  bytes [0..4]   = version: int32 = 29 ('V29') or ASCII "BSP2"
  bytes [4..]    = 15 lump entries, each int32 offset + int32 size = 8 bytes

Lump 0 = entities  (ASCII text dictionaries: { "key" "value" ... })
Lump 2 = textures  (int32 count + int32[] offsets + per-texture 16-byte name)
"""
import hashlib
import json
import re
import struct
from collections import Counter
from pathlib import Path
from typing import Any


# Item-classname -> normalized-key mapping for item_summary.
# Health uses spawnflags to distinguish mh/h25/h15 (handled separately).
ITEM_NORMALIZED_KEYS: dict[str, str] = {
    'item_armor1': 'ga',          # green armor (100 armor, 30% absorb)
    'item_armor2': 'ya',          # yellow armor (150 armor, 60% absorb)
    'item_armorInv': 'ra',        # red armor (200 armor, 80% absorb)
    'item_artifact_super_damage': 'quad',
    'item_artifact_invulnerability': 'pent',
    'item_artifact_invisibility': 'ring',
    'item_artifact_envirosuit': 'bio',
    'item_cells': 'cells',
    'item_rockets': 'rockets',
    'item_spikes': 'spikes',
    'item_shells': 'shells',
    'weapon_supershotgun': 'ssg',
    'weapon_nailgun': 'ng',
    'weapon_supernailgun': 'sng',
    'weapon_grenadelauncher': 'gl',
    'weapon_rocketlauncher': 'rl',
    'weapon_lightning': 'lg',
}

ITEM_SUMMARY_KEYS: list[str] = [
    'ra', 'ya', 'ga', 'mh', 'h25', 'h15',
    'quad', 'pent', 'ring', 'bio',
    'ssg', 'ng', 'sng', 'gl', 'rl', 'lg',
    'cells', 'rockets', 'spikes', 'shells',
]

SPAWN_CLASSES: dict[str, str] = {
    'info_player_deathmatch': 'dm',
    'info_player_team1': 'team1',
    'info_player_team2': 'team2',
    'info_player_coop': 'coop',
    'info_player_start': 'start',
    'info_intermission': 'intermission',
}

SPAWN_SUMMARY_KEYS: list[str] = ['dm', 'team1', 'team2', 'coop', 'start', 'intermission']


def parse_bsp_header(data: bytes) -> dict[str, Any]:
    """Parse the 124-byte BSP header. Returns version, entity-lump and texture-lump offsets/sizes."""
    if data[:4] == b'BSP2':
        version = 'BSP2'
    else:
        v = struct.unpack('<I', data[:4])[0]
        version = f'V{v}'  # 'V29' for stock Quake BSPs

    # Lump dir starts at byte 4; each entry is (offset:int32, size:int32) = 8 bytes.
    # Lump 0 = entities (byte 4), Lump 2 = textures (byte 20).
    ent_off, ent_sz = struct.unpack('<II', data[4:12])
    tex_off, tex_sz = struct.unpack('<II', data[20:28])
    return {
        'bsp_version': version,
        'entity_lump_offset': ent_off,
        'entity_lump_size': ent_sz,
        'texture_lump_offset': tex_off,
        'texture_lump_size': tex_sz,
    }


_ENT_BLOCK_RE = re.compile(r'\{([^}]*)\}', re.DOTALL)
_ENT_KV_RE = re.compile(r'"([^"]*)"\s*"([^"]*)"')


def parse_entity_lump(data: bytes, offset: int, size: int) -> list[dict[str, str]]:
    """Decode the entity lump into a list of key-value dicts (one per entity).

    Latin-1 rather than UTF-8 because some older maps have non-ASCII bytes in
    worldspawn messages; latin-1 is a lossless 8-bit->unicode round-trip.
    """
    raw = data[offset:offset + size].rstrip(b'\x00')
    text = raw.decode('latin-1', errors='replace')
    entities: list[dict[str, str]] = []
    for block in _ENT_BLOCK_RE.findall(text):
        ent: dict[str, str] = {}
        for k, v in _ENT_KV_RE.findall(block):
            ent[k] = v
        entities.append(ent)
    return entities


def parse_texture_names(data: bytes, offset: int, size: int) -> list[str]:
    """Decode the texture lump into a list of texture names (16-byte NUL-terminated).

    Entries with offset=-1 are WAD references with no inlined data; we skip them
    because they carry no name in the BSP itself.
    """
    if size == 0:
        return []
    lump = data[offset:offset + size]
    n = struct.unpack('<i', lump[:4])[0]
    if n <= 0:
        return []
    offsets = struct.unpack(f'<{n}i', lump[4:4 + 4 * n])
    names: list[str] = []
    for o in offsets:
        if o < 0:
            continue  # -1 sentinel: texture data lives in a WAD, not the BSP
        if o + 16 > len(lump):
            continue
        raw = lump[o:o + 16]
        nm = raw.split(b'\x00', 1)[0].decode('latin-1', errors='replace')
        names.append(nm)
    return names


def _normalize_health_counts(entities: list[dict[str, str]]) -> tuple[int, int, int]:
    """Return (mh, h25, h15) from item_health entities + their spawnflags.

    Quake QC item_health spawnflags (from progs/items.qc):
      H_ROTTEN = 1  -> small health (h15)
      H_MEGA   = 2  -> megahealth (mh)
      default  0    -> rotting health 25
    Bit-or test order: H_MEGA wins if both bits are set (defensive -- should not occur
    in well-formed maps, but matches the QC IF/ELSEIF order).
    """
    mh = h25 = h15 = 0
    for e in entities:
        if e.get('classname') != 'item_health':
            continue
        try:
            flags = int(e.get('spawnflags', '0') or '0')
        except ValueError:
            flags = 0
        if flags & 2:
            mh += 1
        elif flags & 1:
            h15 += 1
        else:
            h25 += 1
    return mh, h25, h15


def _heuristic_author(message: str | None) -> str | None:
    """Best-effort author extraction from worldspawn.message (e.g. 'Bravado - by foogs [remake]').

    Not reliable enough for assertion-level tests; used as a convenience field.
    """
    if not message:
        return None
    m = re.search(r'by\s+([^\s\[\(\n]+)', message, re.IGNORECASE)
    if not m:
        return None
    raw = m.group(1).strip().rstrip('.,;')
    if not raw or raw.isdigit():
        return None
    return raw


def _parse_wads(wad_field: str | None) -> list[str]:
    """Split worldspawn.wad into a list of WAD filenames (basename only).

    The wad field uses semicolons as separators and often contains full Windows
    paths (e.g. 'c:\\wad\\preach.wad;gfx/base.wad').
    """
    if not wad_field:
        return []
    parts = re.split(r'[;,]', wad_field)
    out: list[str] = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        # Normalise separators and keep only the filename portion.
        p = p.replace('\\', '/').rsplit('/', 1)[-1]
        out.append(p)
    return out


def summarize_map(bsp_path: Path) -> dict[str, Any]:
    """Parse a BSP into the summary record shape required by the map loader.

    The returned dict maps 1:1 to the maps table columns in schema v13; JSON-
    serializable sub-dicts (worldspawn, class_counts, item_summary, spawn_summary,
    features, wads_referenced) are JSON.stringify-ed by the TS loader.
    """
    bsp_path = Path(bsp_path)
    data = bsp_path.read_bytes()
    header = parse_bsp_header(data)
    entities = parse_entity_lump(data, header['entity_lump_offset'], header['entity_lump_size'])
    textures = parse_texture_names(data, header['texture_lump_offset'], header['texture_lump_size'])

    classes = Counter(e.get('classname', '') for e in entities)
    classes.pop('', None)

    worldspawn = next((e for e in entities if e.get('classname') == 'worldspawn'), {})

    # Item summary: normalize classname -> short key, then overlay health counts.
    item_summary: dict[str, int] = {k: 0 for k in ITEM_SUMMARY_KEYS}
    for cls, key in ITEM_NORMALIZED_KEYS.items():
        item_summary[key] = classes.get(cls, 0)
    mh, h25, h15 = _normalize_health_counts(entities)
    item_summary['mh'] = mh
    item_summary['h25'] = h25
    item_summary['h15'] = h15

    # Spawn summary: count each spawn-point classname into a fixed key set.
    spawn_summary: dict[str, int] = {k: 0 for k in SPAWN_SUMMARY_KEYS}
    for cls, key in SPAWN_CLASSES.items():
        spawn_summary[key] = classes.get(cls, 0)

    # Liquid detection: '*'-prefixed textures are animated (water/lava/slime).
    # Teleporter count comes from trigger_teleport entities, not textures.
    star_textures = [n for n in textures if n.startswith('*')]
    features = {
        'teleporters': classes.get('trigger_teleport', 0),
        'has_water': any('water' in n.lower() for n in star_textures),
        'has_lava':  any('lava'  in n.lower() for n in star_textures),
        'has_slime': any('slime' in n.lower() for n in star_textures),
    }

    # Worldspawn payload: drop classname (redundant), keep everything else verbatim.
    ws_payload = {k: v for k, v in worldspawn.items() if k != 'classname'}

    canonical_name = bsp_path.stem.lower()
    display_name = worldspawn.get('message')
    author = _heuristic_author(display_name)

    return {
        'canonical_name': canonical_name,
        'file_name': bsp_path.name,
        'display_name': display_name,
        'author': author,
        'bsp_version': header['bsp_version'],
        'bsp_size_bytes': len(data),
        'bsp_sha256': hashlib.sha256(data).hexdigest(),
        'worldspawn': ws_payload,
        'entity_count': len(entities),
        'class_counts': dict(classes),
        'item_summary': item_summary,
        'spawn_summary': spawn_summary,
        'features': features,
        'wads_referenced': _parse_wads(worldspawn.get('wad')),
    }


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser(description='Summarize one BSP file.')
    ap.add_argument('bsp', type=Path)
    args = ap.parse_args()
    print(json.dumps(summarize_map(args.bsp), indent=2))
