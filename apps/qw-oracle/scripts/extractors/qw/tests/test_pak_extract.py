"""Tests for pak_extract.py -- Quake PAK format reader."""
import struct
import tempfile
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from pak_extract import list_pak_entries, extract_maps


def make_synthetic_pak(target: Path) -> None:
    """Build a tiny PAK with two synthetic 'maps/*.bsp' entries plus a non-map file."""
    payload_a = b'BSP_A_DATA__contents_of_synthetic_a'
    payload_b = b'BSP_B_DATA__contents_of_synthetic_b'
    payload_c = b'NOT_A_MAP_PAYLOAD'
    # File header is 12 bytes; dir starts after payloads.
    header_len = 12
    body = payload_a + payload_b + payload_c
    dir_off = header_len + len(body)
    dir_entries = [
        (b'maps/synth_a.bsp', header_len, len(payload_a)),
        (b'maps/synth_b.bsp', header_len + len(payload_a), len(payload_b)),
        (b'progs/notmap.mdl', header_len + len(payload_a) + len(payload_b), len(payload_c)),
    ]
    dir_blob = b''
    for name, off, sz in dir_entries:
        padded = name + b'\x00' * (56 - len(name))
        dir_blob += padded + struct.pack('<II', off, sz)
    header = b'PACK' + struct.pack('<II', dir_off, len(dir_blob))
    target.write_bytes(header + body + dir_blob)


def test_list_pak_entries_returns_all_files(tmp_path: Path):
    pak = tmp_path / 'fixture.pak'
    make_synthetic_pak(pak)
    entries = list_pak_entries(pak)
    names = [e[0] for e in entries]
    assert names == ['maps/synth_a.bsp', 'maps/synth_b.bsp', 'progs/notmap.mdl']


def test_extract_maps_filters_b_models_and_writes_files(tmp_path: Path):
    pak = tmp_path / 'fixture.pak'
    make_synthetic_pak(pak)
    out_dir = tmp_path / 'out'
    extracted = extract_maps([pak], out_dir)
    # Synthetic file names don't start with 'b_' so all map entries should pass.
    assert sorted(extracted) == ['synth_a.bsp', 'synth_b.bsp']
    assert (out_dir / 'synth_a.bsp').read_bytes().startswith(b'BSP_A_DATA')
    assert (out_dir / 'synth_b.bsp').read_bytes().startswith(b'BSP_B_DATA')
    # progs/notmap.mdl must NOT be extracted (filter only matches maps/*.bsp).
    assert not (out_dir / 'notmap.mdl').exists()


def test_extract_maps_skips_b_prefix_models(tmp_path: Path):
    """b_*.bsp are ammo box models, filtered out as non-playable maps."""
    pak = tmp_path / 'fixture.pak'
    # Build a PAK whose only map entry is 'maps/b_shell0.bsp' (the b_ prefix marks
    # a non-playable model).
    payload = b'fake_bsp_data'
    header_len = 12
    dir_off = header_len + len(payload)
    name = b'maps/b_shell0.bsp'
    padded = name + b'\x00' * (56 - len(name))
    dir_blob = padded + struct.pack('<II', header_len, len(payload))
    header = b'PACK' + struct.pack('<II', dir_off, len(dir_blob))
    pak.write_bytes(header + payload + dir_blob)

    out_dir = tmp_path / 'out'
    extracted = extract_maps([pak], out_dir)
    assert extracted == []
    assert not (out_dir / 'b_shell0.bsp').exists()
