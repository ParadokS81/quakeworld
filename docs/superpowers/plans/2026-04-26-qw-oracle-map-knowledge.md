# QW Oracle Map Knowledge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add map awareness to qw-oracle's Layer 1: a flat `maps` table populated from BSP entity/texture lumps + maps.quakeworld.nu + stats.quakeworld.nu, with snapshot distribution to slipgate and two new MCP tools (`lookup_map`, `search_maps`).

**Architecture:** New project namespace `qw` (the game itself, distinct from any engine). Single-table additive schema migration v12→v13. Python extractors (PAK reader + BSP parser + downloader + stats scraper) emit one JSON; TypeScript loader upserts; existing snapshot pipeline gains an emitter; MCP gains two tools.

**Tech Stack:** Python 3 (stdlib only — no libclang for this layer; BSP parsing is pure binary), TypeScript on Bun, better-sqlite3, MCP SDK.

**Spec:** `docs/superpowers/specs/2026-04-26-qw-oracle-map-knowledge-design.md`

---

## File Structure

**New:**
- `apps/qw-oracle/scripts/extractors/qw/extract.py` — main orchestrator
- `apps/qw-oracle/scripts/extractors/qw/bsp_parser.py` — entity + texture lump readers
- `apps/qw-oracle/scripts/extractors/qw/pak_extract.py` — PAK file reader
- `apps/qw-oracle/scripts/extractors/qw/download_maps.py` — maps.qw.nu walker
- `apps/qw-oracle/scripts/extractors/qw/fetch_stats.py` — stats.qw.nu scraper
- `apps/qw-oracle/scripts/extractors/qw/seeds/qw-map-seed.yaml` — scaffolded empty
- `apps/qw-oracle/scripts/extractors/qw/seeds/qw-stats-cache.json` — populated by fetch_stats.py
- `apps/qw-oracle/scripts/extractors/qw/output/qw-maps-ast.json` — committed extractor output
- `apps/qw-oracle/scripts/extractors/qw/tests/test_bsp_parser.py` — pytest unit tests
- `apps/qw-oracle/scripts/extractors/qw/tests/test_pak_extract.py` — pytest unit tests
- `apps/qw-oracle/scripts/extractors/qw/tests/fixtures/` — small fixture BSPs
- `apps/qw-oracle/scripts/load-knowledge/load-maps.ts` — loader
- `apps/qw-oracle/scripts/load-knowledge/load-maps.test.ts` — bun:test
- `apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts`
- `apps/qw-oracle/serve/mcp/src/tools/search-maps.ts`
- `apps/qw-oracle/serve/mcp/src/tools/maps.test.ts` — bun:test for both tools

**Modified:**
- `apps/qw-oracle/scripts/load-knowledge/schema.ts` — add `SCHEMA_V13_ADDITIONS_SQL`, `migrateV12ToV13`, bump `SCHEMA_VERSION` to 13, append to dispatch chain in `applySchema`
- `apps/qw-oracle/scripts/load-knowledge/types.ts` — add `MapRow` interface
- `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts` — add `emitQwMaps` + `qw` project case + `'static'` sentinel
- `apps/qw-oracle/scripts/load-knowledge/index.ts` — register `load-maps` subcommand
- `apps/qw-oracle/serve/mcp/src/index.ts` — register both new tools in ListTools + CallTool dispatch
- `apps/qw-oracle/SCHEMA.md` — document the new `maps` table
- `apps/qw-oracle/CLAUDE.md` — add `qw` to the project list, update entity-types count
- `apps/qw-oracle/.gitignore` — add `data/bsp-cache/` and `data/pak-cache/`

---

## Task 1: Schema migration v12 → v13

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/schema.ts`

This is pure-additive (one new table, no CHECK widening, no FK changes). Pattern: same as the v10→v11 `source_root` migration — plain transaction, no `foreign_keys = OFF` dance.

- [ ] **Step 1: Bump `SCHEMA_VERSION` to 13**

In `schema.ts` near the top:

```ts
export const SCHEMA_VERSION = 13;
```

- [ ] **Step 2: Add `SCHEMA_V13_ADDITIONS_SQL` constant**

Place after `SCHEMA_V12_ADDITIONS_SQL` (around line ~1006):

```ts
const SCHEMA_V13_ADDITIONS_SQL = `
CREATE TABLE IF NOT EXISTS maps (
  canonical_name           TEXT PRIMARY KEY,
  file_name                TEXT NOT NULL,
  display_name             TEXT,
  author                   TEXT,
  bsp_version              TEXT NOT NULL,
  bsp_size_bytes           INTEGER NOT NULL,
  bsp_sha256               TEXT NOT NULL,
  worldspawn_json          TEXT NOT NULL,
  entity_count             INTEGER NOT NULL,
  class_counts_json        TEXT NOT NULL,
  item_summary_json        TEXT NOT NULL,
  spawn_summary_json       TEXT NOT NULL,
  features_json            TEXT NOT NULL,
  wads_referenced_json     TEXT NOT NULL,
  inferred_gamemodes_json  TEXT NOT NULL,
  popularity_total         INTEGER,
  popularity_by_mode_json  TEXT,
  popularity_rank          INTEGER,
  notes                    TEXT,
  source_bsp_url           TEXT NOT NULL,
  extracted_at             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_maps_popularity_rank ON maps(popularity_rank);
CREATE INDEX IF NOT EXISTS idx_maps_author          ON maps(author);
`;
```

- [ ] **Step 3: Add `migrateV12ToV13` function**

Place after `migrateV11ToV12` (around line ~1131):

```ts
function migrateV12ToV13(db: Database.Database): void {
  // Pure-additive: one new table, no CHECK changes, no FK touches.
  // Follows the v10->v11 pattern (plain transaction, no foreign_keys OFF).
  const txn = db.transaction(() => {
    db.exec(SCHEMA_V13_ADDITIONS_SQL);
    db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('13');
  });
  txn();
}
```

- [ ] **Step 4: Wire into `applySchema` dispatch chain**

In `applySchema`, after the v11→v12 block (around line ~1198):

```ts
    if (existingVersion === 12 && SCHEMA_VERSION >= 13) {
      migrateV12ToV13(db);
      existingVersion = 13;
    }
```

- [ ] **Step 5: Wire into fresh-DB stamping**

In `applySchema` after `db.exec(SCHEMA_V12_ADDITIONS_SQL);` (around line ~1216), add:

```ts
  db.exec(SCHEMA_V13_ADDITIONS_SQL);
```

So fresh DBs run the chain `SCHEMA_V1_SQL` + `SCHEMA_V12_ADDITIONS_SQL` + `SCHEMA_V13_ADDITIONS_SQL`.

- [ ] **Step 6: Run typecheck**

```bash
cd apps/qw-oracle && npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 7: Verify migration on a real DB**

Backup first:

```bash
cp apps/qw-oracle/data/knowledge.db apps/qw-oracle/data/knowledge.db.pre-v13.bak
```

Run a no-op CLI command that triggers `applySchema`:

```bash
cd apps/qw-oracle && node -e "import('./scripts/load-knowledge/db.js').then(m => { const db = m.openKnowledgeDb(); db.close(); })"
```

(If that import path doesn't exist, run any existing CLI subcommand that opens the DB; the `quality-grid --list` is a safe one.)

Then verify:

```bash
sqlite3 apps/qw-oracle/data/knowledge.db "SELECT value FROM schema_meta WHERE key='schema_version'"
sqlite3 apps/qw-oracle/data/knowledge.db ".schema maps"
```

Expected: `13`, and the `maps` table definition prints.

- [ ] **Step 8: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/schema.ts
git commit -m "feat(qw-oracle): schema v13 - maps table

Pure-additive: one new table for the qw-namespace map knowledge layer.
No CHECK widening, no FK changes. Follows v10->v11 pattern.
Spec: docs/superpowers/specs/2026-04-26-qw-oracle-map-knowledge-design.md"
```

---

## Task 2: MapRow type definition

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/types.ts`

- [ ] **Step 1: Add `MapRow` interface**

Append to `types.ts`:

```ts
export interface MapRow {
  canonical_name: string;
  file_name: string;
  display_name: string | null;
  author: string | null;
  bsp_version: 'V29' | 'BSP2';
  bsp_size_bytes: number;
  bsp_sha256: string;
  worldspawn_json: string;
  entity_count: number;
  class_counts_json: string;
  item_summary_json: string;
  spawn_summary_json: string;
  features_json: string;
  wads_referenced_json: string;
  inferred_gamemodes_json: string;
  popularity_total: number | null;
  popularity_by_mode_json: string | null;
  popularity_rank: number | null;
  notes: string | null;
  source_bsp_url: string;
  extracted_at: string;
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd apps/qw-oracle && npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/types.ts
git commit -m "feat(qw-oracle): MapRow type for the new maps table"
```

---

## Task 3: Gitignore the cache dirs

**Files:**
- Modify: `apps/qw-oracle/.gitignore`

- [ ] **Step 1: Append cache-dir lines**

```bash
cat >> apps/qw-oracle/.gitignore <<'EOF'

# Map knowledge layer caches (BSPs and PAKs are not committed)
data/bsp-cache/
data/pak-cache/
scripts/extractors/qw/seeds/qw-stats-cache.json
EOF
```

Note the stats cache is gitignored too — it's a derived artifact, regenerable from `fetch_stats.py`. The seed YAML (manual overrides) IS committed.

- [ ] **Step 2: Commit**

```bash
git add apps/qw-oracle/.gitignore
git commit -m "chore(qw-oracle): gitignore map cache dirs"
```

---

## Task 4: PAK extractor + tests

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/qw/pak_extract.py`
- Create: `apps/qw-oracle/scripts/extractors/qw/tests/__init__.py` (empty)
- Create: `apps/qw-oracle/scripts/extractors/qw/tests/test_pak_extract.py`
- Create: `apps/qw-oracle/scripts/extractors/qw/tests/fixtures/.gitkeep`

The PAK format: `"PACK"` magic + int32 dir_offset + int32 dir_size, then `dir_size / 64` entries each = 56-byte NUL-padded path + int32 offset + int32 size. Validated empirically during brainstorm.

- [ ] **Step 1: Write the failing test**

Create `apps/qw-oracle/scripts/extractors/qw/tests/test_pak_extract.py`:

```python
"""Tests for pak_extract.py — Quake PAK format reader."""
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/qw-oracle/scripts/extractors/qw && python3 -m pytest tests/test_pak_extract.py -v
```

Expected: FAIL — `ModuleNotFoundError: pak_extract`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/qw-oracle/scripts/extractors/qw/pak_extract.py`:

```python
#!/usr/bin/env python3
"""PAK file reader for Quake pak0/pak1 archives.

PAK format (12-byte header + flat directory):
  char[4]  magic = "PACK"
  int32    dir_offset
  int32    dir_size           # bytes; entry count = dir_size // 64
  ...
  per-entry (64 bytes each, at dir_offset):
    char[56] path  (NUL-padded)
    int32    file_offset
    int32    file_size
"""
import argparse
import struct
import sys
from pathlib import Path
from typing import Iterable


def list_pak_entries(pak_path: Path) -> list[tuple[str, int, int]]:
    """Return [(path, offset, size), ...] for every file in the PAK."""
    data = Path(pak_path).read_bytes()
    if data[:4] != b'PACK':
        raise ValueError(f'Not a PAK file (magic {data[:4]!r}): {pak_path}')
    dir_off, dir_size = struct.unpack('<II', data[4:12])
    entries: list[tuple[str, int, int]] = []
    n = dir_size // 64
    for i in range(n):
        rec = data[dir_off + i * 64 : dir_off + (i + 1) * 64]
        name = rec[:56].split(b'\x00', 1)[0].decode('latin-1')
        off, sz = struct.unpack('<II', rec[56:64])
        entries.append((name, off, sz))
    return entries


def extract_maps(pak_paths: Iterable[Path], out_dir: Path) -> list[str]:
    """Extract every maps/*.bsp from the given PAK files into out_dir.

    Filters out b_*.bsp (Quake ammo-box models, not playable maps).
    Returns the basenames extracted.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    extracted: list[str] = []
    for pak_path in pak_paths:
        pak_path = Path(pak_path)
        data = pak_path.read_bytes()
        for name, off, sz in list_pak_entries(pak_path):
            if not name.startswith('maps/') or not name.endswith('.bsp'):
                continue
            basename = name.split('/', 1)[1]
            if basename.startswith('b_'):
                continue
            (out_dir / basename).write_bytes(data[off:off + sz])
            extracted.append(basename)
    return extracted


def main() -> int:
    ap = argparse.ArgumentParser(description='Extract maps/*.bsp from Quake PAK archives.')
    ap.add_argument('--pak', action='append', required=True, type=Path,
                    help='Path to a pak0.pak / pak1.pak file. Repeatable.')
    ap.add_argument('--out', required=True, type=Path,
                    help='Output directory for extracted .bsp files.')
    args = ap.parse_args()
    extracted = extract_maps(args.pak, args.out)
    for name in extracted:
        print(name)
    print(f'\nExtracted {len(extracted)} maps to {args.out}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
```

Also create empty fixture marker:

```bash
touch apps/qw-oracle/scripts/extractors/qw/tests/__init__.py
mkdir -p apps/qw-oracle/scripts/extractors/qw/tests/fixtures
touch apps/qw-oracle/scripts/extractors/qw/tests/fixtures/.gitkeep
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/qw-oracle/scripts/extractors/qw && python3 -m pytest tests/test_pak_extract.py -v
```

Expected: 3 passed.

- [ ] **Step 5: Smoke-test against the operator's real pak0**

```bash
cd apps/qw-oracle && python3 scripts/extractors/qw/pak_extract.py \
  --pak /mnt/c/Games/QuakeWorld/QuakeWorld/id1/pak0.pak \
  --pak /mnt/c/Games/QuakeWorld/QuakeWorld/id1/pak1.pak \
  --out data/pak-cache/
ls -la data/pak-cache/ | wc -l
ls data/pak-cache/ | grep -c '\.bsp$'
```

Expected: stderr says "Extracted ~38 maps to data/pak-cache/" (8 from pak0 + 30 from pak1 minus the 13 b_* ammo boxes).

- [ ] **Step 6: Commit**

```bash
git add apps/qw-oracle/scripts/extractors/qw/pak_extract.py \
        apps/qw-oracle/scripts/extractors/qw/tests/__init__.py \
        apps/qw-oracle/scripts/extractors/qw/tests/test_pak_extract.py \
        apps/qw-oracle/scripts/extractors/qw/tests/fixtures/.gitkeep
git commit -m "feat(qw-oracle): PAK extractor for id1 stock maps

Reads pak0/pak1, extracts maps/*.bsp, filters b_*.bsp ammo boxes.
3 unit tests against synthetic fixture PAKs."
```

---

## Task 5: BSP parser core (entity + texture lumps)

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/qw/bsp_parser.py`
- Create: `apps/qw-oracle/scripts/extractors/qw/tests/test_bsp_parser.py`

BSP format (validated during brainstorm): 4-byte version (`b'BSP2'` or int 29 = `'V29'`), then 15-lump dir of (offset, size) pairs at byte 4. Lump 0 = entities (`{ "k" "v" ... }` text blocks); lump 2 = textures (int32 count, int32[] offsets, then per-texture 16-byte name + mip data — many entries have offset=-1 sentinel for "no inlined data, look in WAD").

- [ ] **Step 1: Copy real fixture BSPs into the test fixtures dir**

These are needed for the tests below. We don't commit BSPs; we let pytest skip when they're absent. The brainstorm session staged them at `/tmp/qw-bsp-samples/`.

```bash
mkdir -p apps/qw-oracle/scripts/extractors/qw/tests/fixtures
# If /tmp samples still exist, copy them; otherwise re-fetch the small ones.
for m in dm3 dm6 end povdmm4 aerowalk ztndm3 schloss bravado; do
  if [ -f /tmp/qw-bsp-samples/$m.bsp ]; then
    cp /tmp/qw-bsp-samples/$m.bsp apps/qw-oracle/scripts/extractors/qw/tests/fixtures/
  fi
done
ls apps/qw-oracle/scripts/extractors/qw/tests/fixtures/
```

If the /tmp samples were lost, run:

```bash
cd apps/qw-oracle/scripts/extractors/qw/tests/fixtures
for m in povdmm4 aerowalk ztndm3 schloss bravado; do
  curl -sk -L "https://maps.quakeworld.nu/base/${m}.bsp" -o "${m}.bsp"
done
for m in dm3 dm6; do
  curl -sk -L "https://maps.quakeworld.nu/gpl/${m}.bsp" -o "${m}.bsp"
done
curl -sk -L "https://maps.quakeworld.nu/all/end.bsp" -o end.bsp
```

These fixtures are gitignored via `tests/fixtures/.gitkeep` already in place; nothing to commit.

- [ ] **Step 2: Add fixtures dir contents to gitignore**

```bash
cat >> apps/qw-oracle/scripts/extractors/qw/tests/fixtures/.gitignore <<'EOF'
*.bsp
EOF
```

- [ ] **Step 3: Write the failing test**

Create `apps/qw-oracle/scripts/extractors/qw/tests/test_bsp_parser.py`:

```python
"""Tests for bsp_parser.py — entity-lump and texture-lump readers.

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
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd apps/qw-oracle/scripts/extractors/qw && python3 -m pytest tests/test_bsp_parser.py -v
```

Expected: ImportError on `bsp_parser`.

- [ ] **Step 5: Write minimal implementation**

Create `apps/qw-oracle/scripts/extractors/qw/bsp_parser.py`:

```python
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


# Item-classname -> normalized-key mapping for item_summary_json.
# Health uses spawnflags to distinguish mh/h25/h15.
ITEM_NORMALIZED_KEYS: dict[str, str] = {
    'item_armor1': 'ga',          # green armor (100 armor, 30% absorb)
    'item_armor2': 'ya',          # yellow armor (150 armor, 60% absorb)
    'item_armorInv': 'ra',        # red armor / armorInv (200 armor, 80% absorb)
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
    """Parse the 124-byte BSP header. Returns {bsp_version, lump_offsets, lump_sizes, ...}."""
    if data[:4] == b'BSP2':
        version = 'BSP2'
    else:
        v = struct.unpack('<I', data[:4])[0]
        version = f'V{v}'  # "V29" for stock Quake
    # Lump 0 = entities, Lump 2 = textures.
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
    """Decode the entity lump into a list of key-value dicts (one per entity)."""
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
    """Decode the texture lump into a list of texture names (16-byte NUL-terminated)."""
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
            continue  # -1 sentinel: no inlined texture data (WAD reference)
        if o + 16 > len(lump):
            continue
        raw = lump[o:o + 16]
        nm = raw.split(b'\x00', 1)[0].decode('latin-1', errors='replace')
        names.append(nm)
    return names


def _normalize_health_counts(entities: list[dict[str, str]]) -> tuple[int, int, int]:
    """Return (mh, h25, h15) from item_health entities + their spawnflags.

    Quake item_health spawnflags:
      0  = default rotting health (h25)
      1  = SPAWNFLAG_SUPERHEALTH (mh, megahealth +100 over time)
      2  = SPAWNFLAG_ROTTEN (h15)
    Some maps use bit-or values; treat any spawnflag containing bit 1 = mh,
    bit 2 = h15, otherwise h25.
    """
    mh = h25 = h15 = 0
    for e in entities:
        if e.get('classname') != 'item_health':
            continue
        try:
            flags = int(e.get('spawnflags', '0') or '0')
        except ValueError:
            flags = 0
        if flags & 1:
            mh += 1
        elif flags & 2:
            h15 += 1
        else:
            h25 += 1
    return mh, h25, h15


def _heuristic_author(message: str | None) -> str | None:
    """Best-effort author extraction from worldspawn.message (e.g. 'Bravado - by foogs [remake]')."""
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
    """Split worldspawn.wad into a list of WAD filenames (basename only)."""
    if not wad_field:
        return []
    parts = re.split(r'[;,]', wad_field)
    out: list[str] = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        # Strip drive prefix and any path; keep only the filename.
        p = p.replace('\\', '/').rsplit('/', 1)[-1]
        out.append(p)
    return out


def summarize_map(bsp_path: Path) -> dict[str, Any]:
    """Parse a BSP into the summary record shape required by the loader."""
    bsp_path = Path(bsp_path)
    data = bsp_path.read_bytes()
    header = parse_bsp_header(data)
    entities = parse_entity_lump(data, header['entity_lump_offset'], header['entity_lump_size'])
    textures = parse_texture_names(data, header['texture_lump_offset'], header['texture_lump_size'])

    classes = Counter(e.get('classname', '') for e in entities)
    classes.pop('', None)

    worldspawn = next((e for e in entities if e.get('classname') == 'worldspawn'), {})

    # Item summary normalized.
    item_summary: dict[str, int] = {k: 0 for k in ITEM_SUMMARY_KEYS}
    for cls, key in ITEM_NORMALIZED_KEYS.items():
        item_summary[key] = classes.get(cls, 0)
    mh, h25, h15 = _normalize_health_counts(entities)
    item_summary['mh'] = mh
    item_summary['h25'] = h25
    item_summary['h15'] = h15

    # Spawn summary.
    spawn_summary: dict[str, int] = {k: 0 for k in SPAWN_SUMMARY_KEYS}
    for cls, key in SPAWN_CLASSES.items():
        spawn_summary[key] = classes.get(cls, 0)

    # Features from textures + entity counts.
    star_textures = [n for n in textures if n.startswith('*')]
    features = {
        'teleporters': classes.get('trigger_teleport', 0),
        'has_water': any('water' in n.lower() for n in star_textures),
        'has_lava':  any('lava'  in n.lower() for n in star_textures),
        'has_slime': any('slime' in n.lower() for n in star_textures),
    }

    # Worldspawn JSON: drop classname (redundant), keep the rest verbatim.
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
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd apps/qw-oracle/scripts/extractors/qw && python3 -m pytest tests/test_bsp_parser.py -v
```

Expected: 7 passed (or skipped if fixtures absent — all should pass if they are present).

- [ ] **Step 7: Eyeball one summary against in-game knowledge**

```bash
cd apps/qw-oracle && python3 scripts/extractors/qw/bsp_parser.py \
  scripts/extractors/qw/tests/fixtures/dm3.bsp | head -60
```

Expected: dm3 with `display_name = "The Abandoned Base"`, 6 dm spawns, RA + YA, all weapons including LG, water but not lava, 2 teleporters.

- [ ] **Step 8: Commit**

```bash
git add apps/qw-oracle/scripts/extractors/qw/bsp_parser.py \
        apps/qw-oracle/scripts/extractors/qw/tests/test_bsp_parser.py \
        apps/qw-oracle/scripts/extractors/qw/tests/fixtures/.gitignore
git commit -m "feat(qw-oracle): BSP entity + texture lump parser

Parses Quake 1 BSP V29/BSP2: entity lump as kv-dicts, texture lump as
names. Normalizes items (RA/YA/GA/mh/h25/h15/quad/pent/ring/bio/SSG/NG/
SNG/GL/RL/LG/cells/rockets/spikes/shells), spawn summary, liquid+
teleporter features, WAD references, heuristic author from worldspawn
message. 8 unit tests against real fixture maps."
```

---

## Task 6: Stats scraper (popularity table)

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/qw/fetch_stats.py`

This is one-shot scraper code; we don't unit-test it (the upstream HTML can change, and the data is a derived cache). Smoke-test by running it against the live site.

- [ ] **Step 1: Write the implementation**

Create `apps/qw-oracle/scripts/extractors/qw/fetch_stats.py`:

```python
#!/usr/bin/env python3
"""Fetch the map-popularity table from stats.quakeworld.nu and write a JSON cache.

The page is paginated (30 rows per page). The default top-100 we want is
covered by pages 1-4. Output: seeds/qw-stats-cache.json with shape
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
```

- [ ] **Step 2: Smoke-test against live stats site**

```bash
cd apps/qw-oracle && python3 scripts/extractors/qw/fetch_stats.py --top 200
sqlite3 :memory: <<'SQL'
.mode list
.echo on
SQL
python3 -c "
import json
c = json.load(open('apps/qw-oracle/scripts/extractors/qw/seeds/qw-stats-cache.json'))
print(f'rows={len(c)}')
top5 = sorted(c.items(), key=lambda kv: kv[1]['rank'])[:5]
for n, r in top5:
    print(n, r['rank'], r['total'])
"
```

Expected: 200 rows; top 5 are `povdmm4 / end / dm4 / aerowalk / dm2` (matches brainstorm-session ground truth).

- [ ] **Step 3: Commit**

The cache file itself is gitignored (Task 3); only the script gets committed.

```bash
git add apps/qw-oracle/scripts/extractors/qw/fetch_stats.py
git commit -m "feat(qw-oracle): stats.quakeworld.nu scraper for map popularity

Fetches top-200 by totalMatches with per-mode breakdown into a JSON
cache. Manual run; refresh quarterly. Cache file is gitignored."
```

---

## Task 7: Map downloader (maps.quakeworld.nu/base + supplement)

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/qw/download_maps.py`

- [ ] **Step 1: Write the implementation**

Create `apps/qw-oracle/scripts/extractors/qw/download_maps.py`:

```python
#!/usr/bin/env python3
"""Download BSPs from maps.quakeworld.nu.

Strategy:
  1. Walk /base/ index — server-admin-curated baseline (~216 BSPs).
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
```

- [ ] **Step 2: Smoke-test against live site**

```bash
cd apps/qw-oracle && python3 scripts/extractors/qw/download_maps.py
ls data/bsp-cache/ | wc -l
```

Expected: ~250 BSPs (216 from /base/ + ~30 supplements + the existing fixtures).

This is network-heavy and might take a few minutes; it's idempotent so re-runs are cheap.

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/scripts/extractors/qw/download_maps.py
git commit -m "feat(qw-oracle): map downloader for maps.quakeworld.nu

Walks /base/ (server-admin baseline) plus the top-N stats supplement
from /all/ for entries not in /base/. Idempotent re-runs."
```

---

## Task 8: Main extract.py orchestrator

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/qw/extract.py`
- Create: `apps/qw-oracle/scripts/extractors/qw/seeds/qw-map-seed.yaml`

- [ ] **Step 1: Create the empty seed YAML**

```bash
mkdir -p apps/qw-oracle/scripts/extractors/qw/seeds
cat > apps/qw-oracle/scripts/extractors/qw/seeds/qw-map-seed.yaml <<'EOF'
# qw-map-seed.yaml — manual overrides for the map knowledge layer.
#
# Schema:
#   overrides:
#     <canonical_name>:
#       author: "..."   # set when heuristic from worldspawn.message gets nothing or wrong
#       notes:  "..."   # free-form, surfaced by lookup_map
#
#   extra_maps:
#     - <bsp_filename>  # e.g. "ag2.bsp" — pulled into bsp-cache from /all/ even if
#                       # not in /base/ and not in stats.qw.nu top-N
#
# Empty for v1; entries get added as corrections surface.
overrides: {}
extra_maps: []
EOF
```

- [ ] **Step 2: Write extract.py**

Create `apps/qw-oracle/scripts/extractors/qw/extract.py`:

```python
#!/usr/bin/env python3
"""Main extractor: walk bsp-cache, summarize each BSP, join with stats and seed,
emit qw-maps-ast.json for the loader.

Outputs an array of map records keyed in the same field shape the loader expects.
"""
import argparse
import datetime as dt
import json
import sys
from pathlib import Path

import yaml

from bsp_parser import summarize_map


def derive_inferred_gamemodes(
    spawn_dm: int,
    popularity_by_mode: dict[str, int] | None,
) -> list[str]:
    """Compute the gamemode list following the spec rules."""
    POP_THRESHOLD = 1000
    if popularity_by_mode:
        modes = [m for m in ('1on1', '2on2', '4on4', 'ffa')
                 if popularity_by_mode.get(m, 0) > POP_THRESHOLD]
        if modes:
            return modes
    # Fallback: spawn-count heuristic when no popularity data.
    if spawn_dm <= 4:
        return ['1on1']
    if spawn_dm <= 8:
        return ['2on2']
    return ['4on4', 'ffa']


def build_map_record(
    summary: dict,
    stats_entry: dict | None,
    seed_override: dict | None,
    source_bsp_url: str,
    extracted_at: str,
) -> dict:
    """Combine BSP summary + stats + seed-overrides into a loader-shaped record."""
    if seed_override:
        if seed_override.get('author'):
            summary['author'] = seed_override['author']
        notes = seed_override.get('notes')
    else:
        notes = None

    pop_by_mode = stats_entry['by_mode'] if stats_entry else None
    inferred = derive_inferred_gamemodes(summary['spawn_summary']['dm'], pop_by_mode)

    return {
        'canonical_name': summary['canonical_name'],
        'file_name': summary['file_name'],
        'display_name': summary['display_name'],
        'author': summary['author'],
        'bsp_version': summary['bsp_version'],
        'bsp_size_bytes': summary['bsp_size_bytes'],
        'bsp_sha256': summary['bsp_sha256'],
        'worldspawn': summary['worldspawn'],
        'entity_count': summary['entity_count'],
        'class_counts': summary['class_counts'],
        'item_summary': summary['item_summary'],
        'spawn_summary': summary['spawn_summary'],
        'features': summary['features'],
        'wads_referenced': summary['wads_referenced'],
        'inferred_gamemodes': inferred,
        'popularity_total':   stats_entry['total'] if stats_entry else None,
        'popularity_by_mode': stats_entry['by_mode'] if stats_entry else None,
        'popularity_rank':    stats_entry['rank']  if stats_entry else None,
        'notes': notes,
        'source_bsp_url': source_bsp_url,
        'extracted_at': extracted_at,
    }


def map_source_url(name: str, source_origin: str) -> str:
    """Best-effort source URL for the BSP we ingested."""
    if source_origin == 'pak':
        return 'pak0/pak1 stock id1'
    if source_origin == 'base':
        return f'https://maps.quakeworld.nu/base/{name}.bsp'
    if source_origin == 'all':
        return f'https://maps.quakeworld.nu/all/{name}.bsp'
    return source_origin


def main() -> int:
    here = Path(__file__).resolve().parent
    monorepo_root = here.parents[3]
    ap = argparse.ArgumentParser()
    ap.add_argument('--bsp-dir', type=Path, default=monorepo_root / 'apps' / 'qw-oracle' / 'data' / 'bsp-cache')
    ap.add_argument('--stats-cache', type=Path, default=here / 'seeds' / 'qw-stats-cache.json')
    ap.add_argument('--seed', type=Path, default=here / 'seeds' / 'qw-map-seed.yaml')
    ap.add_argument('--out', type=Path, default=here / 'output' / 'qw-maps-ast.json')
    args = ap.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)

    stats: dict[str, dict] = {}
    if args.stats_cache.exists():
        stats = json.loads(args.stats_cache.read_text())
    else:
        print(f'WARNING: stats cache missing at {args.stats_cache}; popularity columns will be NULL', file=sys.stderr)

    seed_doc = yaml.safe_load(args.seed.read_text()) or {}
    overrides: dict[str, dict] = seed_doc.get('overrides') or {}

    extracted_at = dt.datetime.utcnow().isoformat(timespec='seconds') + 'Z'
    bsps = sorted(p for p in args.bsp_dir.iterdir() if p.suffix == '.bsp')
    print(f'walking {len(bsps)} bsps in {args.bsp_dir}', file=sys.stderr)

    records: list[dict] = []
    errors: list[tuple[str, str]] = []
    for bsp in bsps:
        try:
            summary = summarize_map(bsp)
        except Exception as e:
            errors.append((bsp.name, str(e)))
            continue
        cname = summary['canonical_name']
        # Source-URL heuristic: stock id1 vs community.
        if cname in {'start', 'end',
                     'dm1', 'dm2', 'dm3', 'dm4', 'dm5', 'dm6'} or cname.startswith(('e1m', 'e2m', 'e3m', 'e4m')):
            origin = 'pak'
        else:
            origin = 'base'  # downloader pulls into the same dir; we don't track per-file origin
        record = build_map_record(
            summary,
            stats_entry=stats.get(cname),
            seed_override=overrides.get(cname),
            source_bsp_url=map_source_url(cname, origin),
            extracted_at=extracted_at,
        )
        records.append(record)

    args.out.write_text(json.dumps(records, indent=2, sort_keys=False) + '\n', encoding='utf-8')
    print(f'wrote {len(records)} records to {args.out}', file=sys.stderr)
    if errors:
        print(f'  ERRORS: {len(errors)}', file=sys.stderr)
        for name, msg in errors[:10]:
            print(f'    {name}: {msg}', file=sys.stderr)
    return 0 if not errors else 1


if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 3: Confirm pyyaml is available**

```bash
python3 -c "import yaml; print(yaml.__version__)"
```

If not installed:

```bash
pip3 install --user pyyaml
```

(pyyaml is already used by the existing libclang extractors; this should be a no-op.)

- [ ] **Step 4: Smoke-test against fixtures dir**

```bash
cd apps/qw-oracle && python3 scripts/extractors/qw/extract.py \
  --bsp-dir scripts/extractors/qw/tests/fixtures \
  --out scripts/extractors/qw/output/qw-maps-ast-smoketest.json
python3 -c "
import json
arr = json.load(open('apps/qw-oracle/scripts/extractors/qw/output/qw-maps-ast-smoketest.json'))
print(f'records: {len(arr)}')
for r in arr:
    print(r['canonical_name'], r['display_name'], r['inferred_gamemodes'])
"
rm apps/qw-oracle/scripts/extractors/qw/output/qw-maps-ast-smoketest.json
```

Expected: 8 records (one per fixture); each has reasonable display_name + inferred_gamemodes.

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/scripts/extractors/qw/extract.py \
        apps/qw-oracle/scripts/extractors/qw/seeds/qw-map-seed.yaml
git commit -m "feat(qw-oracle): extract.py orchestrator + scaffolded seed YAML

Walks bsp-cache, joins each map with stats cache + seed overrides,
emits qw-maps-ast.json. Inferred gamemodes use 1000-match popularity
threshold with spawn-count fallback when not in stats."
```

---

## Task 9: Bootstrap end-to-end and produce real qw-maps-ast.json

**Goal:** Run the bootstrap chain against real data so we have a committable extractor output for the loader to consume.

- [ ] **Step 1: Extract id1 stock maps**

```bash
cd apps/qw-oracle && python3 scripts/extractors/qw/pak_extract.py \
  --pak /mnt/c/Games/QuakeWorld/QuakeWorld/id1/pak0.pak \
  --pak /mnt/c/Games/QuakeWorld/QuakeWorld/id1/pak1.pak \
  --out data/bsp-cache/
ls data/bsp-cache/ | grep -c '\.bsp$'
```

Expected: ~38 BSPs (8 from pak0 + 30 from pak1).

- [ ] **Step 2: Refresh stats cache**

```bash
cd apps/qw-oracle && python3 scripts/extractors/qw/fetch_stats.py --top 200
ls -la scripts/extractors/qw/seeds/qw-stats-cache.json
```

Expected: ~200 entries.

- [ ] **Step 3: Download community maps**

```bash
cd apps/qw-oracle && python3 scripts/extractors/qw/download_maps.py
ls data/bsp-cache/ | grep -c '\.bsp$'
```

Expected: ~250 BSPs total in cache (id1 + /base/ + /all/-supplements).

- [ ] **Step 4: Run extractor**

```bash
cd apps/qw-oracle && python3 scripts/extractors/qw/extract.py
python3 -c "
import json
arr = json.load(open('apps/qw-oracle/scripts/extractors/qw/output/qw-maps-ast.json'))
print(f'records: {len(arr)}')
print(f'with popularity: {sum(1 for r in arr if r[\"popularity_rank\"] is not None)}')
print(f'with author:     {sum(1 for r in arr if r[\"author\"] is not None)}')
"
```

Expected: ~250 records; ~150-180 with popularity (top 200 minus those not on disk); ~30-50 with heuristic author.

- [ ] **Step 5: Eyeball a few records**

```bash
python3 -c "
import json
arr = json.load(open('apps/qw-oracle/scripts/extractors/qw/output/qw-maps-ast.json'))
by_name = {r['canonical_name']: r for r in arr}
for n in ['dm3', 'aerowalk', 'povdmm4', 'end']:
    r = by_name.get(n)
    if not r:
        print(f'{n}: MISSING')
        continue
    print(f'{n}: rank={r[\"popularity_rank\"]} dm_spawns={r[\"spawn_summary\"][\"dm\"]} '
          f'modes={r[\"inferred_gamemodes\"]} lg={r[\"item_summary\"][\"lg\"]} '
          f'water={r[\"features\"][\"has_water\"]}')
"
```

Expected: dm3 rank in top-15, 6 dm spawns, has lg + water; aerowalk rank in top-5, 6 spawns, has lg, no water; povdmm4 rank #1, 4 spawns, 0 lg; end no rank in top-200 (it's an FFA classic but not the highest), 4 dm spawns, has lava.

- [ ] **Step 6: Commit the extractor output**

```bash
git add apps/qw-oracle/scripts/extractors/qw/output/qw-maps-ast.json
git commit -m "feat(qw-oracle): bootstrap qw-maps-ast.json (~250 maps)

Extracted from id1 pak0/pak1 + maps.quakeworld.nu/base/ + top-200
stats supplement. Each record carries BSP-derived facts (entities,
items, spawns, features, WAD refs) joined with stats.quakeworld.nu
popularity. ~250 records committed."
```

---

## Task 10: Loader (load-maps.ts)

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/load-maps.ts`
- Create: `apps/qw-oracle/scripts/load-knowledge/load-maps.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/qw-oracle/scripts/load-knowledge/load-maps.test.ts`:

```ts
// @ts-expect-error - bun:test types not registered in tsconfig
import { describe, expect, test } from 'bun:test';
import Database from 'better-sqlite3';
import { applySchema } from './schema.js';
import { loadMapsFromArray, type MapAstRecord } from './load-maps.js';

function newDb(): Database.Database {
  const db = new Database(':memory:');
  applySchema(db);
  return db;
}

const SAMPLE: MapAstRecord = {
  canonical_name: 'dm3',
  file_name: 'dm3.bsp',
  display_name: 'The Abandoned Base',
  author: null,
  bsp_version: 'V29',
  bsp_size_bytes: 1348355,
  bsp_sha256: 'a'.repeat(64),
  worldspawn: { message: 'The Abandoned Base', wad: 'gfx/base.wad' },
  entity_count: 211,
  class_counts: { worldspawn: 1, info_player_deathmatch: 6, light: 50 },
  item_summary: {
    ra: 0, ya: 1, ga: 0, mh: 1, h25: 8, h15: 1,
    quad: 1, pent: 1, ring: 1, bio: 0,
    ssg: 1, ng: 1, sng: 1, gl: 1, rl: 1, lg: 1,
    cells: 3, rockets: 7, spikes: 11, shells: 9,
  },
  spawn_summary: { dm: 6, team1: 0, team2: 0, coop: 0, start: 1, intermission: 4 },
  features: { teleporters: 2, has_water: true, has_lava: false, has_slime: false },
  wads_referenced: ['base.wad'],
  inferred_gamemodes: ['4on4'],
  popularity_total: 49789,
  popularity_by_mode: { '1on1': 2741, '2on2': 1109, '4on4': 39037, ffa: 6902 },
  popularity_rank: 10,
  notes: null,
  source_bsp_url: 'pak0/pak1 stock id1',
  extracted_at: '2026-04-26T00:00:00Z',
};

describe('loadMapsFromArray', () => {
  test('inserts a single record', () => {
    const db = newDb();
    const result = loadMapsFromArray(db, [SAMPLE]);
    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(0);
    const row = db.prepare(`SELECT canonical_name, display_name, popularity_rank
                            FROM maps WHERE canonical_name = ?`).get('dm3') as any;
    expect(row.canonical_name).toBe('dm3');
    expect(row.display_name).toBe('The Abandoned Base');
    expect(row.popularity_rank).toBe(10);
  });

  test('upsert is idempotent and updates an existing row', () => {
    const db = newDb();
    loadMapsFromArray(db, [SAMPLE]);
    const updated = { ...SAMPLE, popularity_rank: 12, popularity_total: 50000 };
    const result = loadMapsFromArray(db, [updated]);
    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(1);
    const row = db.prepare(`SELECT popularity_rank, popularity_total
                            FROM maps WHERE canonical_name = ?`).get('dm3') as any;
    expect(row.popularity_rank).toBe(12);
    expect(row.popularity_total).toBe(50000);
  });

  test('JSON columns are stringified arrays/objects', () => {
    const db = newDb();
    loadMapsFromArray(db, [SAMPLE]);
    const row = db.prepare(`SELECT item_summary_json, features_json, inferred_gamemodes_json
                            FROM maps WHERE canonical_name = ?`).get('dm3') as any;
    const items = JSON.parse(row.item_summary_json);
    expect(items.lg).toBe(1);
    const features = JSON.parse(row.features_json);
    expect(features.has_water).toBe(true);
    const modes = JSON.parse(row.inferred_gamemodes_json);
    expect(modes).toEqual(['4on4']);
  });

  test('NULL popularity columns when stats absent', () => {
    const db = newDb();
    const noPop = { ...SAMPLE, canonical_name: 'unknownmap',
                    popularity_total: null, popularity_by_mode: null, popularity_rank: null };
    loadMapsFromArray(db, [noPop]);
    const row = db.prepare(`SELECT popularity_rank, popularity_by_mode_json
                            FROM maps WHERE canonical_name = ?`).get('unknownmap') as any;
    expect(row.popularity_rank).toBeNull();
    expect(row.popularity_by_mode_json).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
cd apps/qw-oracle && bun test scripts/load-knowledge/load-maps.test.ts
```

Expected: failure — `Cannot find module './load-maps.js'` or similar.

- [ ] **Step 3: Implement load-maps.ts**

Create `apps/qw-oracle/scripts/load-knowledge/load-maps.ts`:

```ts
// apps/qw-oracle/scripts/load-knowledge/load-maps.ts
//
// Loader for the schema-v13 `maps` table. Reads the qw extractor's
// JSON output and upserts each record by canonical_name.

import { readFileSync } from 'node:fs';
import type Database from 'better-sqlite3';

export interface MapAstRecord {
  canonical_name: string;
  file_name: string;
  display_name: string | null;
  author: string | null;
  bsp_version: 'V29' | 'BSP2';
  bsp_size_bytes: number;
  bsp_sha256: string;
  worldspawn: Record<string, string>;
  entity_count: number;
  class_counts: Record<string, number>;
  item_summary: Record<string, number>;
  spawn_summary: Record<string, number>;
  features: { teleporters: number; has_water: boolean; has_lava: boolean; has_slime: boolean };
  wads_referenced: string[];
  inferred_gamemodes: string[];
  popularity_total: number | null;
  popularity_by_mode: Record<string, number> | null;
  popularity_rank: number | null;
  notes: string | null;
  source_bsp_url: string;
  extracted_at: string;
}

const UPSERT_SQL = `
INSERT INTO maps (
  canonical_name, file_name, display_name, author,
  bsp_version, bsp_size_bytes, bsp_sha256,
  worldspawn_json, entity_count, class_counts_json,
  item_summary_json, spawn_summary_json, features_json,
  wads_referenced_json, inferred_gamemodes_json,
  popularity_total, popularity_by_mode_json, popularity_rank,
  notes, source_bsp_url, extracted_at
) VALUES (
  @canonical_name, @file_name, @display_name, @author,
  @bsp_version, @bsp_size_bytes, @bsp_sha256,
  @worldspawn_json, @entity_count, @class_counts_json,
  @item_summary_json, @spawn_summary_json, @features_json,
  @wads_referenced_json, @inferred_gamemodes_json,
  @popularity_total, @popularity_by_mode_json, @popularity_rank,
  @notes, @source_bsp_url, @extracted_at
)
ON CONFLICT(canonical_name) DO UPDATE SET
  file_name               = excluded.file_name,
  display_name            = excluded.display_name,
  author                  = excluded.author,
  bsp_version             = excluded.bsp_version,
  bsp_size_bytes          = excluded.bsp_size_bytes,
  bsp_sha256              = excluded.bsp_sha256,
  worldspawn_json         = excluded.worldspawn_json,
  entity_count            = excluded.entity_count,
  class_counts_json       = excluded.class_counts_json,
  item_summary_json       = excluded.item_summary_json,
  spawn_summary_json      = excluded.spawn_summary_json,
  features_json           = excluded.features_json,
  wads_referenced_json    = excluded.wads_referenced_json,
  inferred_gamemodes_json = excluded.inferred_gamemodes_json,
  popularity_total        = excluded.popularity_total,
  popularity_by_mode_json = excluded.popularity_by_mode_json,
  popularity_rank         = excluded.popularity_rank,
  notes                   = excluded.notes,
  source_bsp_url          = excluded.source_bsp_url,
  extracted_at            = excluded.extracted_at
;
`;

function recordToParams(r: MapAstRecord): Record<string, unknown> {
  return {
    canonical_name: r.canonical_name,
    file_name: r.file_name,
    display_name: r.display_name,
    author: r.author,
    bsp_version: r.bsp_version,
    bsp_size_bytes: r.bsp_size_bytes,
    bsp_sha256: r.bsp_sha256,
    worldspawn_json: JSON.stringify(r.worldspawn),
    entity_count: r.entity_count,
    class_counts_json: JSON.stringify(r.class_counts),
    item_summary_json: JSON.stringify(r.item_summary),
    spawn_summary_json: JSON.stringify(r.spawn_summary),
    features_json: JSON.stringify(r.features),
    wads_referenced_json: JSON.stringify(r.wads_referenced),
    inferred_gamemodes_json: JSON.stringify(r.inferred_gamemodes),
    popularity_total: r.popularity_total,
    popularity_by_mode_json: r.popularity_by_mode ? JSON.stringify(r.popularity_by_mode) : null,
    popularity_rank: r.popularity_rank,
    notes: r.notes,
    source_bsp_url: r.source_bsp_url,
    extracted_at: r.extracted_at,
  };
}

export interface LoadMapsResult {
  inserted: number;
  updated: number;
  total: number;
}

export function loadMapsFromArray(db: Database.Database, records: MapAstRecord[]): LoadMapsResult {
  const upsert = db.prepare(UPSERT_SQL);
  const existing = new Set<string>(
    (db.prepare(`SELECT canonical_name FROM maps`).all() as Array<{ canonical_name: string }>)
      .map((r) => r.canonical_name),
  );
  let inserted = 0;
  let updated = 0;
  const txn = db.transaction((rows: MapAstRecord[]) => {
    for (const r of rows) {
      upsert.run(recordToParams(r));
      if (existing.has(r.canonical_name)) updated += 1;
      else inserted += 1;
    }
  });
  txn(records);
  return { inserted, updated, total: records.length };
}

export function loadMapsFromFile(db: Database.Database, jsonPath: string): LoadMapsResult {
  const records = JSON.parse(readFileSync(jsonPath, 'utf-8')) as MapAstRecord[];
  return loadMapsFromArray(db, records);
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
cd apps/qw-oracle && bun test scripts/load-knowledge/load-maps.test.ts
```

Expected: 4 pass.

- [ ] **Step 5: Run repo-wide typecheck**

```bash
cd apps/qw-oracle && npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/load-maps.ts \
        apps/qw-oracle/scripts/load-knowledge/load-maps.test.ts
git commit -m "feat(qw-oracle): load-maps loader for v13 maps table

Idempotent upsert keyed on canonical_name. JSON-blob columns serialized
on the loader side. 4 bun:test cases covering insert, update, JSON
shape, and NULL popularity fallthrough."
```

---

## Task 11: Wire `load-maps` CLI subcommand

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/index.ts`

- [ ] **Step 1: Read current index.ts to find dispatch site**

```bash
grep -n "case 'load-version'\|case 'load-assets'\|case 'build-snapshot'" apps/qw-oracle/scripts/load-knowledge/index.ts
```

Note the surrounding pattern.

- [ ] **Step 2: Add `load-maps` subcommand**

In `index.ts`, near the top with the other imports:

```ts
import { loadMapsFromFile } from './load-maps.js';
```

Then in the subcommand dispatch (next to `load-version`, `load-assets`):

```ts
    case 'load-maps': {
      const json = arg('--json') ?? join(__dirname, '..', 'extractors', 'qw', 'output', 'qw-maps-ast.json');
      const db = openKnowledgeDb();
      try {
        const result = loadMapsFromFile(db, json);
        console.log(`load-maps: inserted=${result.inserted} updated=${result.updated} total=${result.total}`);
      } finally {
        db.close();
      }
      break;
    }
```

(Match the existing helper-call shape — `openKnowledgeDb` and `arg` helpers should already exist in this file. If the file uses different helper names, adapt to the local convention.)

- [ ] **Step 3: Update the `usage` printout in index.ts**

Add a `load-maps` line where the existing subcommands are listed.

- [ ] **Step 4: Run typecheck**

```bash
cd apps/qw-oracle && npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Run loader against the real extractor output**

```bash
cd apps/qw-oracle && npm run load-knowledge -- load-maps
```

Expected: `load-maps: inserted=~250 updated=0 total=~250`.

- [ ] **Step 6: Verify rows in DB**

```bash
sqlite3 apps/qw-oracle/data/knowledge.db <<'SQL'
SELECT COUNT(*) AS total FROM maps;
SELECT canonical_name, popularity_rank, json_extract(item_summary_json, '$.lg') AS lg
FROM maps
WHERE popularity_rank <= 10
ORDER BY popularity_rank;
SQL
```

Expected: total ≈ 250, top-10 list with povdmm4/end/dm4/aerowalk/dm2/etc., with lg counts.

- [ ] **Step 7: Re-run loader to verify idempotency**

```bash
cd apps/qw-oracle && npm run load-knowledge -- load-maps
```

Expected: `inserted=0 updated=~250 total=~250`.

- [ ] **Step 8: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/index.ts
git commit -m "feat(qw-oracle): load-maps CLI subcommand"
```

---

## Task 12: build-snapshot emitter for `qw` project

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`

- [ ] **Step 1: Read existing emitter shape**

```bash
sed -n '480,580p' apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts
```

Note the meta + emitter pattern (writeJson helper, SnapshotMeta).

- [ ] **Step 2: Add `qw` to project type and default-version map**

If `Project` is defined locally via union (in `types.ts`), check if it already includes `'qw'`. If not, widen it. Then in `build-snapshot.ts`:

```ts
const PROJECT_DEFAULT_SNAPSHOT_VERSION: Record<Project, string> = {
  ezquake: 'head',
  fte:     'head',
  mvdsv:   'head',
  ktx:     'head',
  qwcl:    '2.33',
  qw:      'static',
};
```

- [ ] **Step 3: Add `emitQwMaps` function**

Place near the existing emitters (`emitQwclVariables` etc.):

```ts
function emitQwMaps(
  db: Database.Database,
  meta: SnapshotMeta,
  outputDir: string,
): { count: number; bytes: number } {
  const rows = db.prepare(`
    SELECT canonical_name, file_name, display_name, author,
           bsp_version, bsp_size_bytes, bsp_sha256,
           worldspawn_json, entity_count, class_counts_json,
           item_summary_json, spawn_summary_json, features_json,
           wads_referenced_json, inferred_gamemodes_json,
           popularity_total, popularity_by_mode_json, popularity_rank,
           notes, source_bsp_url, extracted_at
    FROM maps
    ORDER BY canonical_name
  `).all() as Array<Record<string, unknown>>;

  const maps = rows.map((r) => ({
    canonical_name: r.canonical_name,
    file_name: r.file_name,
    display_name: r.display_name,
    author: r.author,
    bsp_version: r.bsp_version,
    bsp_size_bytes: r.bsp_size_bytes,
    bsp_sha256: r.bsp_sha256,
    worldspawn: JSON.parse(r.worldspawn_json as string),
    entity_count: r.entity_count,
    class_counts: JSON.parse(r.class_counts_json as string),
    item_summary: JSON.parse(r.item_summary_json as string),
    spawn_summary: JSON.parse(r.spawn_summary_json as string),
    features: JSON.parse(r.features_json as string),
    wads_referenced: JSON.parse(r.wads_referenced_json as string),
    inferred_gamemodes: JSON.parse(r.inferred_gamemodes_json as string),
    popularity_total: r.popularity_total,
    popularity_by_mode: r.popularity_by_mode_json ? JSON.parse(r.popularity_by_mode_json as string) : null,
    popularity_rank: r.popularity_rank,
    notes: r.notes,
    source_bsp_url: r.source_bsp_url,
    extracted_at: r.extracted_at,
  }));
  const out = { ...meta, maps };
  return writeJson(join(outputDir, 'qw-maps.json'), out, maps.length);
}
```

- [ ] **Step 4: Add `qw` dispatch in `buildSnapshot`**

In the body of `buildSnapshot`, alongside the `if (opts.project === 'qwcl')` and `else if (opts.project === 'ezquake')` branches:

```ts
    } else if (opts.project === 'qw') {
      const r = emitQwMaps(db, meta, outputDir);
      files.push({ file: 'qw-maps.json', entities: r.count, bytes: r.bytes });
```

- [ ] **Step 5: Bypass the `versions` table check for `qw`**

`qw` has no row in `versions` (the table is for engine versions, not the game itself). The existing `buildSnapshot` does `SELECT 1 FROM versions WHERE project=? AND version=?` and throws if missing. Wrap that check:

```ts
    // qw is the static-version namespace (the game itself, not an engine).
    // It has no row in `versions`; skip the existence check.
    if (opts.project !== 'qw') {
      const ver = db.prepare(`SELECT 1 FROM versions WHERE project=? AND version=?`).get(opts.project, version);
      if (!ver) {
        throw new Error(`No versions row for ${opts.project}@${version}; run extract-tag first.`);
      }
    }
```

- [ ] **Step 6: Run typecheck**

```bash
cd apps/qw-oracle && npm run typecheck
```

Expected: 0 errors. If `Project` union doesn't include `'qw'` somewhere, fix that — search for `Project` definitions:

```bash
grep -rn "^type Project\|^export type Project\|: Project\b" apps/qw-oracle/scripts/load-knowledge/types.ts
```

Add `'qw'` to the union type.

- [ ] **Step 7: Run snapshot for project=qw**

```bash
cd apps/qw-oracle && npm run load-knowledge -- build-snapshot --project qw
ls -la ../slipgate-app/src/lib/config/data/qw-maps.json
python3 -c "
import json
d = json.load(open('apps/slipgate-app/src/lib/config/data/qw-maps.json'))
print(f'maps: {len(d[\"maps\"])}')
print(f'meta keys: {[k for k in d if k != \"maps\"]}')
print(f'first map: {d[\"maps\"][0][\"canonical_name\"]} display={d[\"maps\"][0][\"display_name\"]}')
"
```

Expected: ~250 maps, sensible meta block, first map (alphabetical) like `2bfree` or `a2`.

- [ ] **Step 8: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts \
        apps/qw-oracle/scripts/load-knowledge/types.ts \
        apps/slipgate-app/src/lib/config/data/qw-maps.json
git commit -m "feat(qw-oracle): build-snapshot emitter for qw project (maps)

Adds 'qw' to Project union with 'static' default version, emits
qw-maps.json with full per-map record. Bypasses versions-table check
since qw is the version-less game-itself namespace."
```

---

## Task 13: MCP tool — lookup_map

**Files:**
- Create: `apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts`
- Create: `apps/qw-oracle/serve/mcp/src/tools/maps.test.ts` (shared file for both map tools)

- [ ] **Step 1: Write the failing test**

Create `apps/qw-oracle/serve/mcp/src/tools/maps.test.ts`:

```ts
// @ts-expect-error - bun:test types not registered
import { describe, expect, test, beforeAll } from 'bun:test';
import Database from 'better-sqlite3';
import { applySchema } from '../../../../scripts/load-knowledge/schema.js';
import { loadMapsFromArray, type MapAstRecord } from '../../../../scripts/load-knowledge/load-maps.js';

import { lookupMap } from './lookup-map.js';
// (search-maps imports come in Task 14)

function withSampleDb(): Database.Database {
  const db = new Database(':memory:');
  applySchema(db);
  const samples: MapAstRecord[] = [
    {
      canonical_name: 'dm3',
      file_name: 'dm3.bsp',
      display_name: 'The Abandoned Base',
      author: null,
      bsp_version: 'V29',
      bsp_size_bytes: 1348355,
      bsp_sha256: 'a'.repeat(64),
      worldspawn: { message: 'The Abandoned Base', wad: 'gfx/base.wad' },
      entity_count: 211,
      class_counts: { worldspawn: 1, info_player_deathmatch: 6 },
      item_summary: {
        ra: 0, ya: 1, ga: 0, mh: 1, h25: 8, h15: 1,
        quad: 1, pent: 1, ring: 1, bio: 0,
        ssg: 1, ng: 1, sng: 1, gl: 1, rl: 1, lg: 1,
        cells: 3, rockets: 7, spikes: 11, shells: 9,
      },
      spawn_summary: { dm: 6, team1: 0, team2: 0, coop: 0, start: 1, intermission: 4 },
      features: { teleporters: 2, has_water: true, has_lava: false, has_slime: false },
      wads_referenced: ['base.wad'],
      inferred_gamemodes: ['4on4'],
      popularity_total: 49789,
      popularity_by_mode: { '1on1': 2741, '2on2': 1109, '4on4': 39037, ffa: 6902 },
      popularity_rank: 10,
      notes: null,
      source_bsp_url: 'pak0/pak1 stock id1',
      extracted_at: '2026-04-26T00:00:00Z',
    },
    {
      canonical_name: 'aerowalk',
      file_name: 'aerowalk.bsp',
      display_name: 'Aerowalk',
      author: 'Preacher',
      bsp_version: 'V29',
      bsp_size_bytes: 632040,
      bsp_sha256: 'b'.repeat(64),
      worldspawn: { message: 'Aerowalk' },
      entity_count: 345,
      class_counts: { info_player_deathmatch: 6 },
      item_summary: {
        ra: 1, ya: 1, ga: 2, mh: 0, h25: 9, h15: 0,
        quad: 0, pent: 0, ring: 0, bio: 0,
        ssg: 0, ng: 0, sng: 2, gl: 1, rl: 2, lg: 1,
        cells: 4, rockets: 4, spikes: 4, shells: 0,
      },
      spawn_summary: { dm: 6, team1: 0, team2: 0, coop: 0, start: 1, intermission: 1 },
      features: { teleporters: 4, has_water: false, has_lava: false, has_slime: false },
      wads_referenced: ['preach.wad'],
      inferred_gamemodes: ['1on1', '2on2'],
      popularity_total: 317194,
      popularity_by_mode: { '1on1': 248640, '2on2': 46708, '4on4': 34, ffa: 21827 },
      popularity_rank: 4,
      notes: null,
      source_bsp_url: 'https://maps.quakeworld.nu/base/aerowalk.bsp',
      extracted_at: '2026-04-26T00:00:00Z',
    },
    {
      canonical_name: 'povdmm4',
      file_name: 'povdmm4.bsp',
      display_name: 'DMM4 Arena\nBy Povo-Hat',
      author: 'Povo-Hat',
      bsp_version: 'V29',
      bsp_size_bytes: 130920,
      bsp_sha256: 'c'.repeat(64),
      worldspawn: { message: 'DMM4 Arena\nBy Povo-Hat' },
      entity_count: 26,
      class_counts: { info_player_deathmatch: 4, item_armor2: 2 },
      item_summary: {
        ra: 0, ya: 2, ga: 0, mh: 0, h25: 0, h15: 0,
        quad: 0, pent: 0, ring: 0, bio: 0,
        ssg: 0, ng: 0, sng: 0, gl: 0, rl: 0, lg: 0,
        cells: 0, rockets: 0, spikes: 0, shells: 0,
      },
      spawn_summary: { dm: 4, team1: 0, team2: 0, coop: 0, start: 1, intermission: 0 },
      features: { teleporters: 0, has_water: false, has_lava: false, has_slime: false },
      wads_referenced: [],
      inferred_gamemodes: ['1on1'],
      popularity_total: 674619,
      popularity_by_mode: { '1on1': 672239, '2on2': 738, '4on4': 23, ffa: 1619 },
      popularity_rank: 1,
      notes: null,
      source_bsp_url: 'https://maps.quakeworld.nu/base/povdmm4.bsp',
      extracted_at: '2026-04-26T00:00:00Z',
    },
  ];
  loadMapsFromArray(db, samples);
  return db;
}

describe('lookupMap', () => {
  let db: Database.Database;
  beforeAll(() => { db = withSampleDb(); });

  test('returns full record for known map', () => {
    const r = lookupMap(db, { name: 'dm3' });
    expect(r.found).toBe(true);
    if (!r.found) throw new Error('unreachable');
    expect(r.record.canonical_name).toBe('dm3');
    expect(r.record.display_name).toBe('The Abandoned Base');
    expect(r.record.item_summary.lg).toBe(1);
    expect(r.record.features.has_water).toBe(true);
    expect(r.record.popularity?.rank).toBe(10);
    expect(r.record.author).toBe('unknown');
  });

  test('case-insensitive name match', () => {
    const r = lookupMap(db, { name: 'AeroWalk' });
    expect(r.found).toBe(true);
    if (!r.found) throw new Error('unreachable');
    expect(r.record.canonical_name).toBe('aerowalk');
  });

  test('returns found:false with suggestion for typo', () => {
    const r = lookupMap(db, { name: 'aerowalk2' });
    expect(r.found).toBe(false);
    if (r.found) throw new Error('unreachable');
    expect(r.suggestion).toBe('aerowalk');
  });

  test('NULL author surfaced as "unknown"', () => {
    const r = lookupMap(db, { name: 'dm3' });
    expect(r.found).toBe(true);
    if (!r.found) throw new Error('unreachable');
    expect(r.record.author).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run test and confirm it fails**

```bash
cd apps/qw-oracle && bun test serve/mcp/src/tools/maps.test.ts
```

Expected: failure — `lookup-map` not found.

- [ ] **Step 3: Implement lookup-map.ts**

Create `apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts`:

```ts
// apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts
import type Database from 'better-sqlite3';

const SERVER_VERSION = '0.3.0';

export interface MapRecordRow {
  canonical_name: string;
  file_name: string;
  display_name: string | null;
  author: string;
  bsp_version: 'V29' | 'BSP2';
  bsp_size_bytes: number;
  bsp_sha256: string;
  worldspawn: Record<string, string>;
  entity_count: number;
  class_counts: Record<string, number>;
  item_summary: Record<string, number>;
  spawn_summary: Record<string, number>;
  features: { teleporters: number; has_water: boolean; has_lava: boolean; has_slime: boolean };
  wads_referenced: string[];
  inferred_gamemodes: string[];
  popularity: { total: number; by_mode: Record<string, number>; rank: number } | null;
  notes: string | null;
  source_bsp_url: string;
  extracted_at: string;
}

export type LookupMapResponse =
  | { found: true; record: MapRecordRow; meta: { tool: string; server_version: string; queried_at: string } }
  | { found: false; name: string; suggestion: string | null; meta: { tool: string; server_version: string; queried_at: string } };

interface Args {
  name: string;
}

interface MapsTableRow {
  canonical_name: string;
  file_name: string;
  display_name: string | null;
  author: string | null;
  bsp_version: string;
  bsp_size_bytes: number;
  bsp_sha256: string;
  worldspawn_json: string;
  entity_count: number;
  class_counts_json: string;
  item_summary_json: string;
  spawn_summary_json: string;
  features_json: string;
  wads_referenced_json: string;
  inferred_gamemodes_json: string;
  popularity_total: number | null;
  popularity_by_mode_json: string | null;
  popularity_rank: number | null;
  notes: string | null;
  source_bsp_url: string;
  extracted_at: string;
}

function rowToRecord(row: MapsTableRow): MapRecordRow {
  const popularity = row.popularity_rank != null && row.popularity_total != null && row.popularity_by_mode_json != null
    ? {
        total: row.popularity_total,
        by_mode: JSON.parse(row.popularity_by_mode_json) as Record<string, number>,
        rank: row.popularity_rank,
      }
    : null;
  return {
    canonical_name: row.canonical_name,
    file_name: row.file_name,
    display_name: row.display_name,
    author: row.author ?? 'unknown',
    bsp_version: row.bsp_version as 'V29' | 'BSP2',
    bsp_size_bytes: row.bsp_size_bytes,
    bsp_sha256: row.bsp_sha256,
    worldspawn: JSON.parse(row.worldspawn_json) as Record<string, string>,
    entity_count: row.entity_count,
    class_counts: JSON.parse(row.class_counts_json) as Record<string, number>,
    item_summary: JSON.parse(row.item_summary_json) as Record<string, number>,
    spawn_summary: JSON.parse(row.spawn_summary_json) as Record<string, number>,
    features: JSON.parse(row.features_json) as MapRecordRow['features'],
    wads_referenced: JSON.parse(row.wads_referenced_json) as string[],
    inferred_gamemodes: JSON.parse(row.inferred_gamemodes_json) as string[],
    popularity,
    notes: row.notes,
    source_bsp_url: row.source_bsp_url,
    extracted_at: row.extracted_at,
  };
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j;
  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j += 1) prev[j] = curr[j];
  }
  return prev[n];
}

function suggestClosest(db: Database.Database, name: string): string | null {
  const rows = db.prepare(`SELECT canonical_name FROM maps`).all() as Array<{ canonical_name: string }>;
  let best: { name: string; dist: number } | null = null;
  const target = name.toLowerCase();
  for (const r of rows) {
    const d = levenshtein(target, r.canonical_name);
    if (best == null || d < best.dist) best = { name: r.canonical_name, dist: d };
  }
  if (!best) return null;
  // Only suggest if we're within reasonable typo distance.
  if (best.dist > Math.max(2, Math.floor(target.length / 3))) return null;
  return best.name;
}

export function lookupMap(db: Database.Database, args: Args): LookupMapResponse {
  const meta = {
    tool: 'lookup_map',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const row = db
    .prepare(`SELECT * FROM maps WHERE canonical_name = ? COLLATE NOCASE`)
    .get(args.name) as MapsTableRow | undefined;
  if (!row) {
    return { found: false, name: args.name, suggestion: suggestClosest(db, args.name), meta };
  }
  return { found: true, record: rowToRecord(row), meta };
}
```

- [ ] **Step 4: Run test and confirm it passes**

```bash
cd apps/qw-oracle && bun test serve/mcp/src/tools/maps.test.ts
```

Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts \
        apps/qw-oracle/serve/mcp/src/tools/maps.test.ts
git commit -m "feat(qw-oracle): MCP lookup_map tool

Returns the full map record by canonical_name (case-insensitive).
NULL author surfaces as 'unknown'. Levenshtein-based typo suggestion
when not found."
```

---

## Task 14: MCP tool — search_maps

**Files:**
- Create: `apps/qw-oracle/serve/mcp/src/tools/search-maps.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/maps.test.ts` (extend)

- [ ] **Step 1: Append failing tests**

Add to `maps.test.ts`:

```ts
import { searchMaps } from './search-maps.js';

describe('searchMaps', () => {
  let db: Database.Database;
  beforeAll(() => { db = withSampleDb(); });

  test('lacks_weapon: lg returns povdmm4 (no LG)', () => {
    const r = searchMaps(db, { lacks_weapon: ['lg'] });
    const names = r.results.map((x) => x.canonical_name);
    expect(names).toContain('povdmm4');
    expect(names).not.toContain('dm3');
    expect(names).not.toContain('aerowalk');
  });

  test('has_powerup: quad returns dm3 only (only one with quad)', () => {
    const r = searchMaps(db, { has_powerup: ['quad'] });
    const names = r.results.map((x) => x.canonical_name);
    expect(names).toContain('dm3');
    expect(names).not.toContain('aerowalk');
    expect(names).not.toContain('povdmm4');
  });

  test('gamemode: 4on4 returns dm3 only', () => {
    const r = searchMaps(db, { gamemode: '4on4' });
    const names = r.results.map((x) => x.canonical_name);
    expect(names).toEqual(['dm3']);
  });

  test('gamemode: 1on1 returns aerowalk + povdmm4 ordered by popularity_rank', () => {
    const r = searchMaps(db, { gamemode: '1on1' });
    const names = r.results.map((x) => x.canonical_name);
    expect(names[0]).toBe('povdmm4');  // rank 1
    expect(names).toContain('aerowalk');
  });

  test('has_water: true returns dm3', () => {
    const r = searchMaps(db, { has_water: true });
    const names = r.results.map((x) => x.canonical_name);
    expect(names).toEqual(['dm3']);
  });

  test('max_dm_spawns: 4 returns povdmm4', () => {
    const r = searchMaps(db, { max_dm_spawns: 4 });
    const names = r.results.map((x) => x.canonical_name);
    expect(names).toContain('povdmm4');
    expect(names).not.toContain('dm3');
    expect(names).not.toContain('aerowalk');
  });

  test('limit caps results', () => {
    const r = searchMaps(db, { limit: 1 });
    expect(r.results).toHaveLength(1);
  });

  test('limit defaults to 25', () => {
    const r = searchMaps(db, {});
    expect(r.results.length).toBeLessThanOrEqual(25);
  });

  test('result row carries items_compact summary string', () => {
    const r = searchMaps(db, { has_powerup: ['quad'] });
    expect(r.results[0].items_compact).toContain('quad');
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
cd apps/qw-oracle && bun test serve/mcp/src/tools/maps.test.ts
```

Expected: lookup tests pass; new search tests fail with import error.

- [ ] **Step 3: Implement search-maps.ts**

Create `apps/qw-oracle/serve/mcp/src/tools/search-maps.ts`:

```ts
// apps/qw-oracle/serve/mcp/src/tools/search-maps.ts
import type Database from 'better-sqlite3';

const SERVER_VERSION = '0.3.0';
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export interface SearchMapsArgs {
  has_weapon?: string[];
  lacks_weapon?: string[];
  has_powerup?: string[];
  lacks_powerup?: string[];
  has_armor?: string[];
  has_water?: boolean;
  has_lava?: boolean;
  has_slime?: boolean;
  has_teleporters?: boolean;
  gamemode?: '1on1' | '2on2' | '4on4' | 'ffa';
  min_popularity_rank?: number;
  max_popularity_rank?: number;
  min_dm_spawns?: number;
  max_dm_spawns?: number;
  limit?: number;
}

export interface SearchMapsRow {
  canonical_name: string;
  display_name: string | null;
  popularity_rank: number | null;
  popularity_total: number | null;
  dm_spawns: number;
  inferred_gamemodes: string[];
  items_compact: string;
}

export interface SearchMapsResponse {
  results: SearchMapsRow[];
  count: number;
  meta: { tool: string; server_version: string; queried_at: string };
}

const ARMOR_ORDER: Array<[string, string]> = [['ra', 'RA'], ['ya', 'YA'], ['ga', 'GA']];
const POWERUP_ORDER: Array<[string, string]> = [['quad', 'quad'], ['pent', 'pent'], ['ring', 'ring'], ['bio', 'bio']];
const WEAPON_ORDER: Array<[string, string]> = [['ssg', 'SSG'], ['ng', 'NG'], ['sng', 'SNG'], ['gl', 'GL'], ['rl', 'RL'], ['lg', 'LG']];

function buildItemsCompact(item_summary: Record<string, number>, features: { has_water: boolean; has_lava: boolean; has_slime: boolean }): string {
  const armors = ARMOR_ORDER.filter(([k]) => (item_summary[k] ?? 0) > 0).map(([, label]) => label);
  const powerups = POWERUP_ORDER.filter(([k]) => (item_summary[k] ?? 0) > 0).map(([, label]) => label);
  const weapons = WEAPON_ORDER.filter(([k]) => (item_summary[k] ?? 0) > 0).map(([, label]) => label);
  const liquids: string[] = [];
  if (features.has_water) liquids.push('water');
  if (features.has_lava)  liquids.push('lava');
  if (features.has_slime) liquids.push('slime');
  const parts: string[] = [];
  if (armors.length || powerups.length) {
    parts.push([...armors, ...powerups].join(' '));
  }
  if (weapons.length) {
    parts.push(weapons.join(' '));
  }
  if (liquids.length) {
    parts.push(liquids.join('+'));
  }
  return parts.join(' | ');
}

interface RawRow {
  canonical_name: string;
  display_name: string | null;
  popularity_rank: number | null;
  popularity_total: number | null;
  spawn_summary_json: string;
  inferred_gamemodes_json: string;
  item_summary_json: string;
  features_json: string;
}

export function searchMaps(db: Database.Database, args: SearchMapsArgs): SearchMapsResponse {
  // Pull every map's filterable columns, then filter in TS. Map count is
  // small (~250) so this beats building dynamic JSON-extract WHERE clauses.
  const rows = db.prepare(`
    SELECT canonical_name, display_name, popularity_rank, popularity_total,
           spawn_summary_json, inferred_gamemodes_json, item_summary_json, features_json
    FROM maps
  `).all() as RawRow[];

  const limit = Math.min(Math.max(args.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  const filtered: SearchMapsRow[] = [];
  for (const row of rows) {
    const items = JSON.parse(row.item_summary_json) as Record<string, number>;
    const features = JSON.parse(row.features_json) as { teleporters: number; has_water: boolean; has_lava: boolean; has_slime: boolean };
    const spawns = JSON.parse(row.spawn_summary_json) as Record<string, number>;
    const modes = JSON.parse(row.inferred_gamemodes_json) as string[];

    if (args.has_weapon?.length && !args.has_weapon.every((w) => (items[w] ?? 0) > 0)) continue;
    if (args.lacks_weapon?.length && args.lacks_weapon.some((w) => (items[w] ?? 0) > 0)) continue;
    if (args.has_powerup?.length && !args.has_powerup.every((p) => (items[p] ?? 0) > 0)) continue;
    if (args.lacks_powerup?.length && args.lacks_powerup.some((p) => (items[p] ?? 0) > 0)) continue;
    if (args.has_armor?.length && !args.has_armor.every((a) => (items[a] ?? 0) > 0)) continue;
    if (args.has_water  != null && features.has_water  !== args.has_water)  continue;
    if (args.has_lava   != null && features.has_lava   !== args.has_lava)   continue;
    if (args.has_slime  != null && features.has_slime  !== args.has_slime)  continue;
    if (args.has_teleporters != null && (features.teleporters > 0) !== args.has_teleporters) continue;
    if (args.gamemode && !modes.includes(args.gamemode)) continue;
    if (args.min_popularity_rank != null && (row.popularity_rank == null || row.popularity_rank < args.min_popularity_rank)) continue;
    if (args.max_popularity_rank != null && (row.popularity_rank == null || row.popularity_rank > args.max_popularity_rank)) continue;
    if (args.min_dm_spawns != null && (spawns.dm ?? 0) < args.min_dm_spawns) continue;
    if (args.max_dm_spawns != null && (spawns.dm ?? 0) > args.max_dm_spawns) continue;

    filtered.push({
      canonical_name: row.canonical_name,
      display_name: row.display_name,
      popularity_rank: row.popularity_rank,
      popularity_total: row.popularity_total,
      dm_spawns: spawns.dm ?? 0,
      inferred_gamemodes: modes,
      items_compact: buildItemsCompact(items, features),
    });
  }

  // Sort: popularity_rank ASC NULLS LAST, then canonical_name ASC.
  filtered.sort((a, b) => {
    if (a.popularity_rank == null && b.popularity_rank == null) return a.canonical_name.localeCompare(b.canonical_name);
    if (a.popularity_rank == null) return 1;
    if (b.popularity_rank == null) return -1;
    return a.popularity_rank - b.popularity_rank;
  });

  return {
    results: filtered.slice(0, limit),
    count: filtered.length,
    meta: {
      tool: 'search_maps',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
```

- [ ] **Step 4: Run all map tests, confirm they pass**

```bash
cd apps/qw-oracle && bun test serve/mcp/src/tools/maps.test.ts
```

Expected: all 13 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/serve/mcp/src/tools/search-maps.ts \
        apps/qw-oracle/serve/mcp/src/tools/maps.test.ts
git commit -m "feat(qw-oracle): MCP search_maps tool with rich filters

Filters across has_/lacks_ weapon+powerup+armor sets, liquid+teleporter
features, gamemode, popularity rank, spawn count. Sorts by popularity
rank ASC NULLS LAST. items_compact one-liner gives the LLM a renderable
summary without unpacking JSON. 9 bun:test cases."
```

---

## Task 15: Register MCP tools in server index

**Files:**
- Modify: `apps/qw-oracle/serve/mcp/src/index.ts`

- [ ] **Step 1: Add imports near the top**

After the existing tool imports:

```ts
import { lookupMap } from './tools/lookup-map.ts';
import { searchMaps } from './tools/search-maps.ts';
```

- [ ] **Step 2: Add tool definitions to the ListToolsRequestSchema handler**

In the `tools: [...]` array (alongside `lookup_entity`, `search_entities`, `get_concept_note`, `search_solved_issues`):

```ts
    {
      name: 'lookup_map',
      description:
        'Look up a QuakeWorld map by canonical name (case-insensitive). Returns rich Layer 1 record: display name, author (when known), BSP version + size + hash, full worldspawn property dump, every entity-classname count, normalized item summary (RA/YA/GA/mh/h25/h15/quad/pent/ring/bio/SSG/NG/SNG/GL/RL/LG/cells/rockets/spikes/shells), spawn-point counts (dm/team1/team2/coop/start/intermission), feature flags (teleporter count, has_water/has_lava/has_slime), referenced WAD textures, inferred gamemodes (1on1/2on2/4on4/ffa from popularity + spawn-count fallback), and popularity stats from stats.quakeworld.nu. Use this when you have a specific map name. For "what map has X" or "maps without X" questions, use search_maps instead.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Map canonical name (file basename without .bsp), e.g. dm3, aerowalk, povdmm4. Case-insensitive.',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'search_maps',
      description:
        'Filter QuakeWorld maps by item layout, features, gamemode, popularity, or player capacity. Returns compact rows ordered by popularity rank. Use this for questions like "maps without lightning gun" (lacks_weapon: [lg]), "4on4 maps with quad" (gamemode: 4on4, has_powerup: [quad]), "small 1on1 maps" (gamemode: 1on1, max_dm_spawns: 4), "maps with lava" (has_lava: true). For full record details on a single map, follow up with lookup_map.',
      inputSchema: {
        type: 'object',
        properties: {
          has_weapon: {
            type: 'array',
            items: { type: 'string', enum: ['ssg', 'ng', 'sng', 'gl', 'rl', 'lg'] },
            description: 'Match maps that contain ALL listed weapons. Item codes: ssg (super shotgun), ng (nailgun), sng (super nailgun), gl (grenade launcher), rl (rocket launcher), lg (lightning gun).',
          },
          lacks_weapon: {
            type: 'array',
            items: { type: 'string', enum: ['ssg', 'ng', 'sng', 'gl', 'rl', 'lg'] },
            description: 'Match maps that contain NONE of the listed weapons.',
          },
          has_powerup: {
            type: 'array',
            items: { type: 'string', enum: ['quad', 'pent', 'ring', 'bio'] },
            description: 'Match maps that contain ALL listed powerups. quad=quad damage, pent=pentagram of protection, ring=ring of shadows, bio=biosuit.',
          },
          lacks_powerup: {
            type: 'array',
            items: { type: 'string', enum: ['quad', 'pent', 'ring', 'bio'] },
            description: 'Match maps that contain NONE of the listed powerups.',
          },
          has_armor: {
            type: 'array',
            items: { type: 'string', enum: ['ra', 'ya', 'ga'] },
            description: 'Match maps that contain ALL listed armors. ra=red armor, ya=yellow armor, ga=green armor.',
          },
          has_water:       { type: 'boolean', description: 'Match maps that contain water (true) or maps without water (false).' },
          has_lava:        { type: 'boolean', description: 'Match maps that contain lava (true) or maps without lava (false).' },
          has_slime:       { type: 'boolean', description: 'Match maps that contain slime/acid (true) or maps without slime (false).' },
          has_teleporters: { type: 'boolean', description: 'Match maps that have at least one teleporter (true) or no teleporters (false).' },
          gamemode: {
            type: 'string',
            enum: ['1on1', '2on2', '4on4', 'ffa'],
            description: 'Match maps that are popular (or have appropriate spawn count) in this gamemode.',
          },
          min_popularity_rank: { type: 'number', description: 'Minimum popularity rank (1 = most popular). Use with max_popularity_rank for ranges.' },
          max_popularity_rank: { type: 'number', description: 'Maximum popularity rank. Use 50 to limit to top-50 maps.' },
          min_dm_spawns:       { type: 'number', description: 'Minimum count of info_player_deathmatch entities. Higher = larger maps.' },
          max_dm_spawns:       { type: 'number', description: 'Maximum count of info_player_deathmatch entities. 4 or fewer = small 1on1 layouts.' },
          limit:               { type: 'number', description: 'Max results to return. Default 25, max 100.' },
        },
      },
    },
```

- [ ] **Step 3: Add CallToolRequestSchema dispatch**

Find the existing `CallToolRequestSchema` handler (the `switch` or `if` chain that dispatches by `request.params.name`) and add:

```ts
    if (name === 'lookup_map') {
      const result = lookupMap(knowledgeDb, args as { name: string });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'search_maps') {
      const result = searchMaps(knowledgeDb, args as Parameters<typeof searchMaps>[1]);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
```

(Match the surrounding pattern — exact dispatch shape depends on the existing code. Read the file before editing.)

- [ ] **Step 4: Bump server version**

```ts
const server = new Server(
  { name: 'qw-oracle', version: '0.3.0' },
  ...
);
```

- [ ] **Step 5: Run typecheck**

```bash
cd apps/qw-oracle/serve/mcp && bunx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Smoke-test the MCP server end-to-end**

Use the existing `verify-rewrite.ts` script (or successor). If it exists at `apps/qw-oracle/serve/mcp/scripts/verify-rewrite.ts`, append two assertions; otherwise write a one-shot script.

Quick command-line probe via the MCP stdio protocol:

```bash
cd apps/qw-oracle/serve/mcp && cat <<'EOF' | bun run src/index.ts 2>&1 | head -50
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"lookup_map","arguments":{"name":"dm3"}}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_maps","arguments":{"lacks_weapon":["lg"],"limit":5}}}
EOF
```

Expected: tool list contains `lookup_map` + `search_maps`; `lookup_map dm3` returns the dm3 record; `search_maps lacks_weapon:[lg]` returns povdmm4 in the result.

- [ ] **Step 7: Commit**

```bash
git add apps/qw-oracle/serve/mcp/src/index.ts
git commit -m "feat(qw-oracle): register lookup_map + search_maps in MCP server

Bumps server version to 0.3.0. Tool schemas carry self-documenting
descriptions (item codes, gamemode enum, semantics for has_/lacks_)
so the calling LLM picks filters without prompting."
```

---

## Task 16: Documentation updates

**Files:**
- Modify: `apps/qw-oracle/SCHEMA.md`
- Modify: `apps/qw-oracle/CLAUDE.md`
- Modify: `HANDOVER.md` — close the implementation, record any open follow-ups

- [ ] **Step 1: Add the maps section to SCHEMA.md**

Read the existing structure:

```bash
sed -n '15,30p' apps/qw-oracle/SCHEMA.md
```

Add `maps` to the Table-map-at-a-glance row count and add a new section. Bump table count from 21 to 22, schema version from 12 to 13. Add this new top-level section after the last per-type table section (before the relation tables, or as a new top-level "Map knowledge" section — pick the location that reads cleanly in the file's existing flow):

```markdown
---

## Map knowledge layer

### `maps`

The `qw` namespace — facts about QuakeWorld maps as game content (not engine entities). One row per canonical map name. Schema v13. Distinct from the entity/version model — maps don't change across engine versions.

| Column | Type | Notes |
|---|---|---|
| `canonical_name` | TEXT PK | lowercased BSP basename (`dm3`, `aerowalk`) |
| `file_name` | TEXT | full filename (`dm3.bsp`) |
| `display_name` | TEXT NULL | from `worldspawn.message` |
| `author` | TEXT NULL | heuristic from message + manual seed override; NULL = unknown |
| `bsp_version` | TEXT | `V29` or `BSP2` |
| `bsp_size_bytes` | INTEGER | |
| `bsp_sha256` | TEXT | full hex |
| `worldspawn_json` | TEXT | full worldspawn property dump |
| `entity_count` | INTEGER | total entity count |
| `class_counts_json` | TEXT | `{classname: count}` for every classname in the map |
| `item_summary_json` | TEXT | normalized 20-key dict (RA/YA/GA/mh/h25/h15/quad/pent/ring/bio/SSG/NG/SNG/GL/RL/LG/cells/rockets/spikes/shells) |
| `spawn_summary_json` | TEXT | `{dm,team1,team2,coop,start,intermission}` |
| `features_json` | TEXT | `{teleporters,has_water,has_lava,has_slime}` |
| `wads_referenced_json` | TEXT | parsed WAD basenames |
| `inferred_gamemodes_json` | TEXT | one or more of `1on1`/`2on2`/`4on4`/`ffa` |
| `popularity_total` | INTEGER NULL | from stats.quakeworld.nu |
| `popularity_by_mode_json` | TEXT NULL | `{1on1, 2on2, 4on4, ffa}` |
| `popularity_rank` | INTEGER NULL | 1 = most popular |
| `notes` | TEXT NULL | seed-curated free-form |
| `source_bsp_url` | TEXT | where extracted from |
| `extracted_at` | TEXT | ISO timestamp |

**Natural key:** `canonical_name`. Re-running the loader is idempotent.

**Populated by:** `load-maps.ts` ← `apps/qw-oracle/scripts/extractors/qw/extract.py` → `qw-maps-ast.json`. Inputs: BSP files in `data/bsp-cache/` (extracted from pak0/pak1 via `pak_extract.py` and downloaded from maps.quakeworld.nu via `download_maps.py`); popularity from `seeds/qw-stats-cache.json` (refreshed by `fetch_stats.py`); manual overrides from `seeds/qw-map-seed.yaml`.

**Consumed by:** MCP tools `lookup_map` + `search_maps`; slipgate via `qw-maps.json` snapshot file.

Indexes: `idx_maps_popularity_rank ON (popularity_rank)`, `idx_maps_author ON (author)`.

**Spec:** `docs/superpowers/specs/2026-04-26-qw-oracle-map-knowledge-design.md`.
```

Update the "Total: 21 tables at schema v12" line to "Total: 22 tables at schema v13" and update the v13 description in the conventions section.

- [ ] **Step 2: Update CLAUDE.md**

In `apps/qw-oracle/CLAUDE.md`, update:

- The `Status:` line: bump schema reference to v13, mention the new `qw` namespace + maps layer
- The `## What this is` table: add `maps` reference where appropriate
- The supported-entity-types line near the bottom — add a note that `maps` is a flat table (not in the entity/version model)
- The "Where to find things" section: add `Map extractor (qw namespace)` row pointing at `scripts/extractors/qw/`

- [ ] **Step 3: Update HANDOVER.md**

Add a closing entry under "Open items" — mark this work shipped, list any deferred follow-ups (slipgate UI, advanced search filters, author research, automated quarterly stats refresh, future maps.quake.world metadata-pass refactor).

- [ ] **Step 4: Run docs typecheck**

```bash
cd apps/qw-oracle && npm run typecheck
```

Expected: 0 errors. (Sanity check; doc edits shouldn't affect TS.)

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/SCHEMA.md \
        apps/qw-oracle/CLAUDE.md \
        HANDOVER.md
git commit -m "docs(qw-oracle): document maps layer (schema v13, qw namespace)

SCHEMA.md gains the maps-table section. CLAUDE.md updated with v13 +
the new qw namespace. HANDOVER.md records the shipped work and any
deferred follow-ups (slipgate UI, advanced filters, author research)."
```

---

## Task 17: Final verification + cleanup

- [ ] **Step 1: Run all tests**

```bash
cd apps/qw-oracle && npm run typecheck
cd apps/qw-oracle/scripts/extractors/qw && python3 -m pytest tests/ -v
cd apps/qw-oracle && bun test scripts/load-knowledge/load-maps.test.ts serve/mcp/src/tools/maps.test.ts
```

Expected: 0 typecheck errors; 11 pytest pass; 13 bun:test pass.

- [ ] **Step 2: Verify the snapshot file shipped**

```bash
ls -la apps/slipgate-app/src/lib/config/data/qw-maps.json
python3 -c "
import json
d = json.load(open('apps/slipgate-app/src/lib/config/data/qw-maps.json'))
print(f'maps in slipgate snapshot: {len(d[\"maps\"])}')
"
```

Expected: ~250 maps in the snapshot.

- [ ] **Step 3: Run the support-channel motivating query**

```bash
cd apps/qw-oracle/serve/mcp && cat <<'EOF' | bun run src/index.ts 2>&1 | tail -40
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_maps","arguments":{"lacks_weapon":["lg"],"limit":10}}}
EOF
```

Expected: result list includes povdmm4 and other no-LG maps. The original "how do I hide cells when playing maps without LG" question now has data behind it.

- [ ] **Step 4: Push to origin**

```bash
git push origin main
```

- [ ] **Step 5: Final summary commit (only if any docs are still loose)**

If there are any loose un-tracked changes from documentation edits:

```bash
git status
git add -p
git commit -m "docs(qw-oracle): final tidy after maps-layer ship"
```

Otherwise skip.

---

## Self-review

**Spec coverage check:**
- ✅ New `maps` table at schema v13 — Task 1
- ✅ MapRow types — Task 2
- ✅ Cache dirs gitignored — Task 3
- ✅ PAK extractor — Task 4
- ✅ BSP entity + texture parser — Task 5
- ✅ Stats scraper — Task 6
- ✅ Map downloader (base + supplement) — Task 7
- ✅ Main extract.py orchestrator — Task 8
- ✅ Bootstrap end-to-end — Task 9
- ✅ Loader + tests — Task 10
- ✅ Loader CLI subcommand — Task 11
- ✅ build-snapshot emitter for `qw` — Task 12
- ✅ MCP `lookup_map` — Task 13
- ✅ MCP `search_maps` — Task 14
- ✅ MCP server registration — Task 15
- ✅ Documentation — Task 16
- ✅ Final verification — Task 17

**Placeholder scan:** clean — every step contains the actual content (SQL, code, command, expected output).

**Type consistency:**
- `MapRow` (DB row shape) and `MapAstRecord` (extractor JSON shape) are deliberately distinct: the loader bridges them.
- `MapRecordRow` (MCP response shape) carries `popularity` as a nullable nested object, not the three flat columns.
- `Project` union widened to include `'qw'` in Task 12.
- `SCHEMA_VERSION` bumped to 13 in Task 1; all migration code references the same constant.
