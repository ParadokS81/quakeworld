# Corpus mining recipes

## Orientation

Step 4 of the asset-type-curate pipeline mines the qw.nu/gfx corpus sandbox at
`/home/paradoks/sandboxes/qw3-abab-gfx/` for two things: community framing of each
asset type (what the QW community calls it, how they package it) and install-path
conventions that source code alone cannot give us (gfx_faq authority, ad-hoc
comments with path advice). This corpus is good for community consensus and observed
install layouts; it is NOT a source of engine-mechanism evidence -- engine loading
logic lives in C source, not in user comment threads. Treat it as confirmatory /
supplementary, not authoritative.

---

## Section 1 -- NDJSON manifest recipes (bash + jq)

### Manifest location and shape

The deliverable manifest is at:

    /home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/pass2-manifest.ndjson
    (11,173 lines -- one JSON object per file-in-bundle)

Confirmed field names from `head -3` (2026-05-12 pass2 run):

    xxh3_128               content hash (XXH3-128, hex)
    bundle_id              integer; FK to gfx_item.IID
    bundle_title           string or null (bundle 0 is an orphan pk3 with no DB row)
    bundle_category_path   string like "Other / Skyboxes" or null for orphans
    source_member_path     path of the file inside the zip/pk3
    role                   classified role string (see role vocabulary below)
    target_path            resolved install path (e.g. "qw/env/purple_chaos_bk.png")
    install_confidence     "high" | "medium" | "low" | "none"
    install_source         authority ("gfx_faq QID 16", "inferred", null)
    mixed_bundle           boolean -- true when bundle has >1 role
    target_filename_renamed  boolean -- true when conback rename was applied
    mapname_inferred       string or null (for map-texture bundles)
    size_bytes             integer
    author_id              integer or null
    author_org             string or null (free-text original-creator field)
    date_added_iso         ISO date string or null
    downloads              integer or null

Role vocabulary (observed values):

    user-asset:skybox          user-asset:charset        user-asset:crosshair
    user-asset:conback         user-asset:hud-element    user-asset:wad
    user-asset:texture-map     user-asset:texture-set    user-asset:texture
    user-asset:texture-weapon  user-asset:skin           user-asset:model
    user-asset:sound           user-asset:config-hud     user-asset:other
    bundle-meta:source-file    bundle-meta:junk          library:map
    mixed-secondary            orphan

### Recipe 1 -- filter by corpus_categories to find bundles for an asset_type

Each seed entry carries a `corpus_categories` field. Use it to filter the manifest.
Example for `skybox` (corpus_categories: ["Other / Skyboxes"]):

    jq 'select(.bundle_category_path == "Other / Skyboxes" and .target_path != null) |
        {bundle_id, bundle_title, role, target_path, install_confidence, install_source}' \
      /home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/pass2-manifest.ndjson

Example for `hud_element` (corpus_categories include multiple subcategories):

    jq 'select(
          (.bundle_category_path | test("^HUD")) and
          .target_path != null
        ) |
        {bundle_id, bundle_title, role, target_path, install_confidence}' \
      /home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/pass2-manifest.ndjson | head -40

For multi-category asset types (charset has 4 corpus_categories), use alternation:

    CATS='["Charsets","Charsets / 256x256","Charsets / 512x512","Charsets / 1024x1024 or larger"]'
    jq --argjson cats "$CATS" \
       'select((.bundle_category_path // "") as $cat | $cats | map(. == $cat) | any) and .target_path != null |
        {bundle_id, bundle_title, role, target_path}' \
      /home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/pass2-manifest.ndjson

### Recipe 2 -- surface install_path_template per role

To see the set of target_path patterns for a given role (confirms what install
templates the community actually uses):

    jq -r 'select(.role == "user-asset:skybox" and .target_path != null) |
           .target_path' \
      /home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/pass2-manifest.ndjson | sort -u | head -20

Sample output for skybox:

    qw/env/black_sky_bk.png
    qw/env/black_sky_dn.png
    qw/env/purple_chaos_bk.png
    qw/env/purple_chaos_ft.png
    ...

All confirm the gfx_faq QID 16 install template: `qw/env/<skyname><suffix>.<ext>`.

For conback (rename semantics -- `target_filename_renamed` tells you rename was applied):

    jq 'select(.role == "user-asset:conback") |
        {bundle_id, bundle_title, target_path, target_filename_renamed}' \
      /home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/pass2-manifest.ndjson | head -20

### Recipe 3 -- list representative bundles for spot-checking (5-10, diverse paths)

Pull the first N distinct bundles by category (favor diverse install_path shapes):

    jq -r 'select(.bundle_category_path == "Other / Skyboxes" and .target_path != null) |
           [.bundle_id, .bundle_title, .install_confidence, .install_source] |
           @tsv' \
      /home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/pass2-manifest.ndjson |
    sort -u -k1,1 | head -10

Known skybox bundle ids for manual spot-check: 24, 36, 46, 153, 165, 208, 232.
Zip files at `/home/paradoks/sandboxes/qw3-abab-gfx/files/<bundle_id>.zip`.

For MIXED bundles (to verify multi-role packaging -- relevant for charset + config):

    jq 'select(.mixed_bundle == true and
               (.bundle_category_path | test("Charset"))) |
        {bundle_id, bundle_title, role, target_path, source_member_path}' \
      /home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/pass2-manifest.ndjson | head -30

---

## Section 2 -- SQL recipes for gfx.sql / gfx_comment

### gfx.sql location and size

    /home/paradoks/sandboxes/qw3-abab-gfx/gfx.sql
    (263,727 bytes -- verified 2026-05-13; spec said 258KB, actual is 263KB)

The file is a MySQL dump. No live DB is needed. Mine it with grep and Python.

### gfx_comment table schema (from CREATE TABLE at line 107):

    c_id       smallint(5)  AUTO_INCREMENT  -- comment ID
    c_item     smallint(5)  -- FK to gfx_item.IID (the bundle being commented on)
    c_date     bigint(15)   -- unix timestamp
    c_author   smallint(5)  -- FK to user (0 = anonymous / unregistered)
    c_author2  varchar(50)  -- free-text author name (often populated when c_author=0)
    c_txt      mediumtext   -- the comment text (BBCode, HTML-encoded entities, \r\n line endings)
    c_ip       varchar(20)  -- commenter IP address

Row format in the INSERT block (1,449 rows):

    (c_id, c_item, c_date, c_author, c_author2, c_txt, c_ip)

### Recipe 4 -- grep c_txt for install-path patterns

Find comments mentioning file install locations:

    grep -i "textures\|/progs\|/sound\|/env\|/skins\|/crosshairs\|goes in\|install in\|put.*in\|folder" \
      /home/paradoks/sandboxes/qw3-abab-gfx/gfx.sql | \
    grep "^(" | head -30

This surfaces comments like:

    (1927,...,'textures go in /textures/models/\r\nmdl file goes in /progs\r\n...',...)
    (252,...,'need to change the filename...qw/textures/wad/anum_8.PNG -> qw/textures/wad/anum_8.png',...)

The path strings are HTML-entity-encoded in places (& -> &amp;, / -> /, etc.) -- read
with that in mind. A Python pass decodes cleanly:

```python
import re, html

SQL = "/home/paradoks/sandboxes/qw3-abab-gfx/gfx.sql"
TERMS = re.compile(r"/textures|/progs|/sound|/env|/skins|goes in|install in|put.{0,20}in|gamedir", re.I)

with open(SQL, encoding="latin-1") as f:
    content = f.read()

# Pull the gfx_comment INSERT block
block_start = content.find("INSERT INTO `gfx_comment` VALUES")
block = content[block_start:content.find(";\n", block_start)+1]

# Each row: (c_id, c_item, c_date, c_author, c_author2, c_txt, c_ip)
# c_txt is the 6th field (index 5). Simplest approach: grep rows containing TERMS.
for line in block.splitlines():
    line = html.unescape(line)
    if TERMS.search(line):
        print(line[:200])
```

### Recipe 5 -- filter comments by bundle_id for a given category

Combine the manifest (to get bundle_ids for a category) with gfx.sql (to extract
matching comments):

```python
import json, re, html

MANIFEST = "/home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/pass2-manifest.ndjson"
SQL      = "/home/paradoks/sandboxes/qw3-abab-gfx/gfx.sql"
CATEGORY = "Other / Skyboxes"   # change per asset_type slice

# Step 1: collect bundle_ids for this category
bundle_ids = set()
with open(MANIFEST) as f:
    for line in f:
        rec = json.loads(line)
        if rec.get("bundle_category_path") == CATEGORY:
            bundle_ids.add(rec["bundle_id"])

print(f"Bundle IDs for '{CATEGORY}': {sorted(bundle_ids)}")

# Step 2: grep gfx.sql comments where c_item (field 1) is in bundle_ids
with open(SQL, encoding="latin-1") as f:
    content = f.read()

block_start = content.find("INSERT INTO `gfx_comment` VALUES")
block = content[block_start:content.find(";\n", block_start)+1]

# Row pattern: leading ( followed by c_id,c_item,...
ROW = re.compile(r"\((\d+),(\d+),\d+,\d+,[^,]*,'(.*?)','\d+[\.\d]*'\)", re.DOTALL)
for m in ROW.finditer(block):
    c_id, c_item, c_txt = int(m.group(1)), int(m.group(2)), m.group(3)
    if c_item in bundle_ids:
        print(f"c_id={c_id} c_item={c_item}: {html.unescape(c_txt[:200])}")
```

### Scope note

The gfx_comment table has 1,449 rows total. Full extraction against `gfx.sql` takes
under a second with grep; the Python script above completes in 2-3 seconds on the
263KB file. No live DB needed; no intermediate output file required.

Engine-internal asset types (palette, colormap, map_lighting, map_entities, locfile,
demo, demo_archive) have empty `corpus_categories` in the seed -- skip corpus mining
for those and expect SPARSE from the triage step.
