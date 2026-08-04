# qw.nu/gfx corpus inventory

> Captured 2026-05-12 from `gfx.tar.gz` (1.41 GB, 1938 entries) shared by ciscon. Stored at `/home/paradoks/sandboxes/qw3-abab-gfx/`. Outside repo — too large to commit.

## What this corpus actually is

NOT a raw player quake-dir. This is the **qw.nu/gfx asset-sharing site dump** — a curated community asset catalog with the site code, the MySQL database, asset bundles (one zip per asset), and preview/thumbnail JPGs.

Roughly:
- **`files/`** — 647 numbered asset bundles (`0.zip` through `647.zip`) + preview JPG (`N.jpg`) + thumbnail (`N_thumb.jpg`). 8 of the bundles are `.pk3` instead of `.zip` (FTE-flavor packaging).
- **`qw.nu-gfx/`** — the PHP web application + git history that ran the site.
- **`gfx.sql`** — the MySQL database export (258 KB, 1641 lines). The schema gold mine.

## Why it's useful (despite not being a raw player dir)

The corpus answers a different question than "what does a real-world quake dir look like" — it answers **"how has the QW community converged on cataloging shared assets after 20+ years?"** That's a stronger input for several downstream decisions:

- **Browse UI brainstorm (Arc Z):** the category taxonomy is community-converged, not invented. These are the buckets QW players actually think in.
- **W-11 import-classifier (Arc D/E):** the asset-zip packaging conventions tell us what Tier 2 (source-evidence) patterns look like in the wild.
- **Future `assets.quake.world` schema:** the 11-field `gfx_item` schema is battle-tested across hundreds of community uploads spanning ~15 years.
- **L1-delta stock asset catalog:** distinguishes custom-content path patterns from stock — useful negative-example training.

## Schema (`gfx_item` — the asset row)

```sql
CREATE TABLE `gfx_item` (
  `IID`          mediumint(9)  NOT NULL AUTO_INCREMENT,  -- asset id
  `category`     mediumint(9)  NOT NULL DEFAULT 0,        -- FK to gfx_category
  `date_added`   bigint(15)    DEFAULT NULL,              -- unix timestamp
  `date_updated` bigint(15)    DEFAULT NULL,
  `author`       int(6)        DEFAULT NULL,              -- FK to user
  `author_org`   varchar(255)  NOT NULL DEFAULT '',       -- original creator (free text)
  `title`        varchar(255)  NOT NULL DEFAULT '',
  `description`  text          NOT NULL,
  `screenshot`   tinyint(1)    NOT NULL DEFAULT 0,        -- has preview?
  `filesize`     bigint(20)    NOT NULL DEFAULT 0,
  `downloads`    int(11)       NOT NULL DEFAULT 0,        -- popularity signal
  PRIMARY KEY (`IID`)
);
```

Fields slipgate would want to add for `assets.quake.world`:
- Content hash (XXH3-128 per C-7 resolution) — the dedup key
- License / attribution tag
- Engine-version compatibility (which forks / which versions)
- Manifest-reference back-pointers (which published profiles reference this asset)
- Required-game-content marker (stock vs custom-only)
- Origin (pak0 / pak1 / loose-file / pk3-bundled per C-5 resolution)

## Category taxonomy (10 top-level + 30 subcategories)

| Top-level | Subcategories | Notes |
|---|---|---|
| **Models** | Monster, Weapon, Item, Armor, Team Fortress, Sets | 3D models |
| **HUD** | Sets, Numbers, Face and Armor, Weapon, Icons, WADs | HUD elements; WADs called out as software-renderer specific |
| **Charsets** | 512x512, 256x256, 128x128, 1024+ | **Sub-categorized by RESOLUTION** — community-converged convention |
| **Crosshairs** | Transparent | |
| **Skins** | Player Model, Monster, Team Fortress, Gib | |
| **Textures** | Sets, Lava and Teleport, Weapon, Backpack, Armor, Megahealth, Ammunition, Team Fortress, Map textures | Heavy sub-categorization by gameplay role |
| **Configs** | Eyecandy, Teamplay, Performance, Software, HUD, Scripts | Configs as a domain alongside assets |
| **Conbacks** | (none) | Console backgrounds — meaningful distinct category |
| **Maps** | Map textures, Trick maps, DMM4 | |
| **Other** | Skyboxes, Levelshots, Sounds | Catch-all for non-fitting categories |

**Top 10 categories by item count:**

1. Map textures — 111 items
2. Conbacks — 108
3. Charsets 512x512 — 58
4. Lava and Teleport textures — 47
5. Weapon textures — 39
6. HUD Numbers — 38
7. Crosshairs — 35
8. Charsets 256x256 — 32
9. HUD Face and Armor — 31
10. Weapon models — 29

Tail-end of the catalog is very long (lots of categories with single-digit counts).

## Asset bundle packaging conventions

Sampled bundles show two common shapes:

**Shape A — drop-in installable (texture pack, model, etc.):**
```
encrusted_axe/
├── encrusted_axe.preview.jpg
├── encrusted_axe.readme.txt
├── qw/
│   └── textures/
│       └── models/
│           └── v_axe_0.tga      ← actual game-installable path
└── src/
    └── v_axe_0.psd              ← optional Photoshop source
```

The `qw/<target_path>` convention mirrors the game's filesystem — the user can extract the zip into their quake dir and the asset lands where the engine expects it.

**Shape B — multi-variant pack (TF skins, etc.):**
```
0.zip/
├── changelog.txt
├── extras/
│   ├── tf_medic v.1.22.bmp
│   ├── tf_medic v.1.22.pcx
│   └── ...
└── extras with fixes/
    └── ...
```

Variants packaged as parallel folders; user picks which to install.

**Implications for W-11 classifier (Tier 2):**
- Path-pattern `<bundle_name>/qw/<target_path>` → strong signal for Shape A
- Path-pattern `<bundle_name>/<variant_dir>/<files>` → Shape B
- `<name>.preview.jpg` / `<name>.readme.txt` sibling files → bundle markers
- `src/*.psd` → quarantine (source file, not engine-installable)
- Mixed BMP+PCX → software-renderer-era content

## What's NOT in this corpus

- **No `id1/` or `qw/` stock content.** No pak0/pak1 baseline.
- **No demos, screenshots, logs, configs from actual gameplay.** This is "uploaded-to-share" content, not user-content.
- **No engine binaries or DLLs.** Just visual/audio assets and configs.
- **No private/personal content.** All public-share.

So this corpus is the **"published custom content" universe**, not the "what's actually in my quake-dir" universe. Different but complementary inputs.

## File-size distribution (from tarball metadata)

- Largest single asset zip: 24.86 MB (`files/350.zip` — encrusted_axe texture pack with PSDs)
- Most zips: 1-20 MB range
- All under 100 MB — confirms S-5 (pre-push validation never fires in normal operation; >100 MB blob = exception state)

## Operator's stated purpose vs. what the corpus delivers

| Operator's stated goal | Corpus delivers |
|---|---|
| "Analyze real world assets accumulated over decades" | ✅ 647 community-shared assets, 2010-2024 dates |
| "Create a strong baseline" | ✅ Category taxonomy + schema fields + packaging conventions |
| "How a future assets dataware house could look like" | ✅ Direct schema + category model to extend |
| "What fields we need" | ✅ 11-field starting set + clear extension axes |
| "Expand detection capability in the app" | ✅ Path-pattern conventions for Tier 2 classifier |

## Downstream consumers (where this inventory gets cited)

- **Arc Z (Browse + Manager UI brainstorm)** — category taxonomy as input
- **Arc D/E (W-11 classifier)** — packaging conventions as Tier 2 evidence base
- **Future `assets.quake.world` schema spec** — 11-field schema as starting point
- **L1-delta stock asset catalog** — negative-example training (these are NOT stock)

## Where the corpus lives

- Tarball: `/home/paradoks/sandboxes/qw3-abab-gfx/gfx.tar.gz` (1.41 GB)
- Extracted SQL: `/home/paradoks/sandboxes/qw3-abab-gfx/gfx.sql` (258 KB)
- Sample extracted assets: `/home/paradoks/sandboxes/qw3-abab-gfx/files/0.zip`, `files/350.zip`, etc.
- Filelist cache: `/home/paradoks/sandboxes/qw3-abab-gfx/filelist.txt` (36 KB, 1938 entries)

Outside repo. Reference from arc brainstorms / planning docs as needed.
