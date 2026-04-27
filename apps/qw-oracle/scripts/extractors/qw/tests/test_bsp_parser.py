"""Tests for bsp_parser.py -- entity-lump and texture-lump readers.

Fixture BSPs are not committed; tests skip cleanly when absent.
Expected counts come from the brainstorm-session ground truth (parse_bsp.py).
"""
from pathlib import Path

import pytest

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from bsp_parser import parse_bsp_header, parse_entity_lump, parse_texture_names, summarize_map


FIXTURES = Path(__file__).parent / 'fixtures'


def fixture(name: str) -> Path:
    p = FIXTURES / f'{name}.bsp'
    if not p.exists():
        pytest.skip(f'fixture {p} missing; see test_bsp_parser.py docstring')
    return p


def test_parse_bsp_header_dm3_v29():
    info = parse_bsp_header(fixture('dm3').read_bytes())
    assert info['bsp_version'] == 'V29'
    assert info['entity_lump_offset'] > 0
    assert info['entity_lump_size'] > 0


def test_parse_entity_lump_dm3_has_six_dm_spawns():
    data = fixture('dm3').read_bytes()
    info = parse_bsp_header(data)
    ents = parse_entity_lump(data, info['entity_lump_offset'], info['entity_lump_size'])
    spawns = [e for e in ents if e.get('classname') == 'info_player_deathmatch']
    assert len(spawns) == 6
    worldspawn = next(e for e in ents if e.get('classname') == 'worldspawn')
    assert worldspawn.get('message') == 'The Abandoned Base'


def test_parse_entity_lump_aerowalk_has_lg_and_no_powerups():
    data = fixture('aerowalk').read_bytes()
    info = parse_bsp_header(data)
    ents = parse_entity_lump(data, info['entity_lump_offset'], info['entity_lump_size'])
    classes = [e.get('classname') for e in ents]
    assert classes.count('weapon_lightning') == 1
    assert classes.count('item_artifact_super_damage') == 0


def test_parse_texture_names_dm3_has_water_and_teleport():
    data = fixture('dm3').read_bytes()
    info = parse_bsp_header(data)
    names = parse_texture_names(data, info['texture_lump_offset'], info['texture_lump_size'])
    assert any('water' in n.lower() for n in names if n.startswith('*'))
    assert any('tele' in n.lower() for n in names if n.startswith('*'))


def test_parse_texture_names_end_has_lava():
    data = fixture('end').read_bytes()
    info = parse_bsp_header(data)
    names = parse_texture_names(data, info['texture_lump_offset'], info['texture_lump_size'])
    assert any('lava' in n.lower() for n in names if n.startswith('*'))


def test_parse_texture_names_povdmm4_has_no_liquid_textures():
    data = fixture('povdmm4').read_bytes()
    info = parse_bsp_header(data)
    names = parse_texture_names(data, info['texture_lump_offset'], info['texture_lump_size'])
    star = [n for n in names if n.startswith('*')]
    assert star == []


def test_summarize_map_aerowalk_normalized_items():
    summary = summarize_map(fixture('aerowalk'))
    assert summary['canonical_name'] == 'aerowalk'
    assert summary['display_name'] == 'Aerowalk'
    assert summary['bsp_version'] == 'V29'
    items = summary['item_summary']
    # aerowalk: 2 GA, 1 YA, 1 RA, 9 health, 0 powerups, 1 LG, 2 SNG, 2 RL, 1 GL, 0 SSG, 0 NG.
    assert items['ga'] == 2
    assert items['ya'] == 1
    assert items['ra'] == 1
    assert items['lg'] == 1
    assert items['sng'] == 2
    assert items['rl'] == 2
    assert items['gl'] == 1
    assert items['ssg'] == 0
    assert items['ng'] == 0
    assert items['quad'] == 0
    assert items['pent'] == 0
    assert items['mh'] == 1   # one megahealth (item_health spawnflags=2)
    assert items['h15'] == 0
    assert items['h25'] == 8  # eight rotting healths (default spawnflags)
    spawns = summary['spawn_summary']
    assert spawns['dm'] == 6
    features = summary['features']
    assert features['has_water'] is False
    assert features['has_lava'] is False
    assert features['has_slime'] is False
    assert features['teleporters'] == 4


def test_summarize_map_dm3_features():
    summary = summarize_map(fixture('dm3'))
    assert summary['features']['has_water'] is True
    assert summary['features']['has_lava'] is False
    assert summary['features']['teleporters'] == 2
    assert summary['display_name'] == 'The Abandoned Base'
    assert summary['bsp_sha256'].startswith(('a', 'b', 'c', 'd', 'e', 'f', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'))
    assert len(summary['bsp_sha256']) == 64


def test_summarize_map_povdmm4_arena_shape():
    summary = summarize_map(fixture('povdmm4'))
    items = summary['item_summary']
    # povdmm4 is an arena map: 2 yellow armors only, no health, no weapons, no powerups.
    assert items['ya'] == 2
    assert items['mh'] == 0
    assert items['h25'] == 0
    assert items['lg'] == 0
    assert items['rl'] == 0
    assert summary['spawn_summary']['dm'] == 4
