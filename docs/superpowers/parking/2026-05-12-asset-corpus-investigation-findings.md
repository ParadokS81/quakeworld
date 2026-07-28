# Asset corpus investigation — findings (2026-05-12)

> Investigation pass over the qw.nu/gfx corpus dump (`gfx.tar.gz`, 1.41 GB, 587 catalog bundles + 11,173 individual files spanning 2007-2026). Goal: build a slipgate-consumable manifest + surface what slipgate's W-11 import classifier needs to handle in the real world.
>
> Pairs with `2026-05-12-gfx-corpus-inventory.md` (raw structural inventory). This doc focuses on **what we learned**, not just what we did. Designed for a fresh terminal to pick up — see the *Threads worth pulling* and *Artifact pointers* sections at the end.

---

## TL;DR — the 8 key learnings

1. **Path-pattern classification was the wrong axis.** Pass 1 hit 97% file-classification but 42% bundle-level MISMATCH because community authors don't follow `<bundle>/qw/<target>/` convention. Pass 2 used DB-category as the classifier axis and got 95.9% install-coverage + 100% MISMATCH recovery.
2. **The `gfx_faq` table is canonical authority for 5 of 10 top-level categories.** XantoM + co. wrote per-category install instructions there in 2007-2015. The DB tells us where things go.
3. **Conback bundles need filename renames.** 60% of conback bundles ship with non-canonical names (`dark.png`, `conback1.png`) — engine requires `conback.<ext>`. The role IS the install rule.
4. **MIXED bundles are normal, not anomalous.** 4.1% of files are "primary asset + companion config" (e.g., charset bundle ships a `.cfg` loader script alongside the charset image). Slipgate's classifier must treat bundles as potentially multi-role.
5. **28% blob dedup across the corpus** validates content-addressed storage. 11,173 files → 8,000 unique XXH3-128 hashes.
6. **Same blob shows up at different target_paths** — 799 hashes appear at multiple install locations across bundles. Per-(bundle, blob) records are necessary, not per-blob.
7. **Real-world data has 3.7% quality issues.** 23 corrupted bundles. 24+24 orphan IDs (file no DB / DB no file). Slipgate must handle gracefully.
8. **The `gfx_comment` table holds ad-hoc install instructions** that aren't in `gfx_faq`. 1,449 comments; some explicitly tell users where files go for categories the FAQ doesn't cover. **Not yet mined.**

---

## What we ran

- **Script 1** — parsed `gfx.sql` (MySQL dump) → `bundles.json` (587 bundles with metadata + categories)
- **Script 2** — XXH3-128 hashed every file in every zip/pk3 → `blobs.ndjson` (11,173 records)
- **Script 3 (Pass 1)** — path-pattern classifier + cross-validation against DB category
- **Script 4 (Pass 2)** — DB-category-driven classifier using `gfx_faq` install instructions as authority

All scripts live at `/home/paradoks/sandboxes/qw3-abab-gfx/scripts/`. All outputs at `/home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/`.

---

## The classification axis reframe (Pass 1 → Pass 2)

### Pass 1: path-pattern matching against zip-internal paths

Used path globs to classify each file:
- `*/qw/textures/wads/cs/*.png` → `user-asset:texture-charset`
- `*/qw/sound/**/*.wav` → `user-asset:sound`
- Plus ~25 other rules + bundle-meta detection (readme, src, preview)

**Result:** 97% file-classification rate (10,837 / 11,173). Quarantine rate 3%.

**But cross-validation against DB category showed:** only 39% of bundles MATCHED (231 / 587). 42% MISMATCHed (248 / 587). Most MISMATCHes collapsed into a single failure mode: bundles ship files at archive root or in non-`qw/` wrappers, so the broad fallback (`*/*.{png,tga,jpg,bmp}` → `texture-mapcontent`) swept up everything that should have been crosshair / charset / conback / HUD-element.

### The reframe

Operator's framing flipped the axis: **the DB knows what each bundle IS via its `category_cid` field. We use the DB's install instructions as authoritative, ignore most of the file's zip-internal path.**

Pass 2 algorithm:
1. Look up bundle's `category_path` → get `(role, install_path_template, confidence, source)`
2. For each file:
   - If file is bundle-meta (readme/preview/src/extras) → tag, no install
   - Else → format `install_path_template` with the file's basename to produce `target_path`
3. Flag MIXED bundles where some files don't fit the primary template
4. Flag UNMAPPED categories (none in the corpus, after we built the mapping table)

**Result:** 95.9% install-coverage (10,060 / 10,492 non-meta files). 100% MISMATCH recovery. 0% unmapped categories. 4.1% MIXED-secondary (legitimately multi-role bundles). 2.0% bundle-meta.

### Why this matters for slipgate's W-11 design

The reframe applies to slipgate's import classifier too:
- **When a bundle has authoritative metadata** (manifest from a sharer, or DB category in the qw.nu/gfx case): trust the metadata first.
- **Path-pattern matching is a fallback**, not primary. It runs when no bundle-level metadata is available (a user drops loose files into their quake dir).
- The W-11 three-tier model is right but needs reordering: **Tier 1 = bundle metadata (manifest / DB) → Tier 2 = hash-against-catalog → Tier 3 = path-pattern fallback → Tier 4 = quarantine.**

Today's W-11 design in the architecture spec implies hash-match is Tier 1 and source-evidence (path-pattern) is Tier 2. After this investigation, the better framing is: **bundle-metadata-first, hash-match-second, path-pattern-third.** Bundle metadata existed for 100% of the corpus we walked; assuming it'll exist for some future imports too.

---

## Real-world packaging patterns

Three dominant bundle shapes observed:

### Shape A — drop-in installable (community-correct)

```
encrusted_axe/                              (~25% of bundles)
├── encrusted_axe.preview.jpg
├── encrusted_axe.readme.txt
├── qw/textures/models/v_axe_0.tga         ← target path encoded in zip structure
├── qw/textures/models/v_axe_0_luma.tga
└── src/v_axe_0.psd
```

This is the "correct" shape the original spec assumed.

### Shape B — bare files at archive root (very common)

```
charset_babylon5.zip/                        (~30% of bundles)
└── charset_babylon5.png                    ← no path structure; filename + category drive install
```

Single file at root. Common for crosshairs, charsets, conbacks, individual HUD elements. **This is the shape that broke Pass 1.**

### Shape C — variant-pack with extras

```
0.zip/                                       (~10% of bundles)
├── changelog.txt
├── extras/
│   ├── tf_medic v.1.22.bmp
│   ├── tf_medic v.1.22.pcx
│   └── ...
└── extras with fixes/
    └── ...
```

Multi-variant skin packs especially. User picks which variant to install.

### Shape D — single-purpose with companion config (MIXED)

```
my_charset.zip/                              (~5% of bundles)
├── my_charset.png
└── load_charset.cfg                        ← exec script alongside the asset
```

Bundles where the author packages a config alongside the asset. Slipgate's import must offer to install both, not just the primary.

### Implications

- Slipgate's W-11 classifier **cannot rely on path structure alone**. Shapes B and D have no useful path information; the install rule comes from filename + category.
- **Bundle import UX matters:** for Shape C (variants) the user needs a "pick which variant" step. For Shape D the user needs an "install companion config?" confirmation.

---

## Filename-as-role-signal: the conback case (and others)

### Conbacks

Engine requirement (per `gfx_faq` QID 20): **file must be named `conback.png`.** Engine loads it automatically at startup.

But community bundles ship under arbitrary names: `dark.png`, `quake3.png`, `conback1.png`, `nin_conback.png`. The role's install rule **must rename the file** during materialization.

**Pass 2 implementation:** 79 conback files across 38 bundles got the rename applied. 51 were already correctly named.

### Generalizing: what other roles have rename semantics?

Worth investigating for W-11:

- **Crosshairs**: `/crosshairimage <filename>` loads by filename — preserve name. **No rename.**
- **Charsets**: `/loadcharset <filename>` — preserve name. **No rename.**
- **Skins (PCX)**: `/teamskin <skinname>` + `/enemyskin <skinname>` — filename matters. **No rename.**
- **Conbacks**: `conback.<ext>` — **MUST rename.**
- **HUD/WADs**: bundles often ship as `.wad` files at the root — engine reads `qw/<name>.wad`. Probably no rename, but the `.wad` extension matters.
- **Configs**: filename matters for `/exec <filename>` — preserve.
- **Skyboxes**: `/loadsky <filename>` — preserve name.

**Conbacks are the only canonical-name-required role in the FAQ.** This is the curveball; everything else is "filename as identifier."

(Open question: are there others where engine convention forces a specific filename? Stock pak0 / pak1 themselves come to mind — but those are stock content, not custom assets in this corpus.)

---

## The MIXED bundle phenomenon

432 files (4.1% of total) were flagged MIXED in Pass 2. Examples:

| Bundle | DB category | Primary role | Secondary role(s) |
|---|---|---|---|
| 19 | Charsets / 512x512 | `user-asset:charset` | `user-asset:config` (a `.cfg` exec script) |
| 115 | HUD / Sets | `user-asset:hud-element` | `user-asset:config` (HUD loader script) |
| 74 | Conbacks | `user-asset:conback` | `user-asset:other` (a `.gif` variant) |
| 208 | Maps / Map textures | `user-asset:texture-map` | `user-asset:other` (stray `.txt`) |
| 244 | Maps / Map textures | `user-asset:texture-map` | `user-asset:other` (`pak.lst` index file) |

### Patterns observed

1. **Charset + .cfg loader**: charset author ships `load_<charset>.cfg` so user can `/exec load_<charset>.cfg` instead of remembering `/loadcharset <name>`. Genuine usability enhancement.
2. **HUD/Sets + HUD loader cfg**: same pattern for HUD elements — bundle ships the config that wires the textures into HUD bindings.
3. **Variant images**: Conback bundles sometimes ship multiple versions (`.png` + `.gif`); user picks which to use.
4. **Map texture lighting**: Map texture packs sometimes include `pak.lst` (index files for the textures within).

### Slipgate W-11 implications

- A "bundle" is not always single-role. The classifier must produce one record per file, and the bundle is the unit of import-decision, not classification.
- **Import UX needs a per-file install toggle** for MIXED bundles. Not "import the bundle" → it's "import asset.png to qw/textures/charsets/, import asset.cfg to qw/?" with explicit consent for the secondary.
- **Companion configs are a UX opportunity, not a footgun.** A user who installs a charset + companion .cfg gets the asset + the loader automatically. Worth surfacing in slipgate's import flow.

---

## Hash dedup observations

| Metric | Value |
|---|---|
| Total files hashed | 11,173 |
| Unique XXH3-128 hashes | 8,000 |
| Dedup rate | 28% (3,173 duplicate file instances) |
| Hashes appearing at multiple target_paths | 799 |
| Hashes appearing in multiple bundles | (not directly computed, but ≥ 799) |

### Validates the content-addressed model

Every duplicate is storage saved + integrity guaranteed by the same hash. Confirms the architecture's "one blob, many manifest references" design has real-world payoff at the catalog scale.

### Multi-target_path cases need explicit handling

799 hashes at multiple target_paths means the same bytes are legitimately installed at different paths across different bundles. Examples (would need a small script to surface concrete cases — see *Threads worth pulling*):

- Same wall texture used in two different map texture packs with different naming
- Same HUD icon shipped in two different HUD sets with different names
- Same charset re-uploaded by a different author

The slipgate manifest schema **already accommodates this** (each manifest entry has its own target_path, the blob is content-addressed). Confirmed working.

---

## Data quality findings

### Corrupted bundles (23, or 3.7%)

22 × `BadZipFile` — not valid zips at all. Likely upload corruption or wrong file uploaded.
1 × unsupported PKZIP compression — bundle 190 uses an ancient compression method (implode/shrink) Python's zipfile module doesn't support.

**Slipgate impact:** W-11 needs to handle "bundle exists but can't be opened" gracefully. Quarantine the bundle reference with a clear error message.

### Orphan IDs

- **24 files-on-disk-without-DB-record** — bundle present in `files/` directory, no row in `gfx_item`. Likely deleted from the site but file remained.
- **24 DB-records-without-files** — `gfx_item` row exists but corresponding `<iid>.zip` missing. Likely upload failure or deletion.

These are roughly cosmetic for slipgate (filter them when generating the manifest). But they're a real signal that the qw.nu/gfx site has data hygiene issues. Worth surfacing if/when Xantom builds `assets.quake.world`.

### Empty bundles (32)

Bundles where all files were classified bundle-meta or quarantined — no engine content found. Could be:
- Documentation-only uploads
- Bundles where the actual asset is in a non-standard sub-path the classifier didn't recognize
- Uploads where author forgot to include the actual asset

**Worth a manual look** — see *Threads worth pulling*.

---

## The gfx_faq table as canonical authority

**8 useful entries** authored 2007-2015 by `XantoM`, `bps`, and others. Each tied to a `category` (FK to `gfx_category`). The `answer` field carries plain-English install instructions with `[b]` and `[code]` BBCode formatting.

### Categories with explicit FAQ install instructions

| QID | Category covered | Install path |
|---|---|---|
| 15 | Crosshairs | `qw/crosshairs/<filename>` |
| 16 | Other / Skyboxes (parented to Other) | `qw/env/<filename>` |
| 17 | Skins | `qw/skins/<filename>` |
| 18 | Textures (multi-path) | `qw/textures/wad/` (HUD-adjacent), `qw/textures/models/` (weapons), `qw/textures/bmodels/` (health/ammunition) |
| 19 | Charsets | `qw/textures/charsets/<filename>` |
| 20 | Conbacks | `qw/gfx/conback.<ext>` (rename!) |
| 22 | Textures / Lava and Teleport | `qw/textures/#teleport.tga` or per-map `qw/textures/<mapname>/#teleport.tga` |
| 23 | HUD (placement clarification) | `qw/textures/wad/<filename>` |

### Categories without FAQ entries (inferred from Quake convention)

- Models (Weapon / Monster / Item / Armor / TF / Sets) → inferred `qw/progs/<filename>`
- Configs (Teamplay / Eyecandy / Performance / Software / HUD / Scripts) → inferred `qw/<filename>` (loaded via `/exec`)
- Other / Levelshots → inferred `qw/textures/levelshots/` (ezQuake-specific)
- Other / Sounds → inferred `qw/sound/<varies>`
- Maps / Trick maps + DMM4 → inferred `qw/maps/<filename>`
- Maps / Map textures → inferred `qw/textures/<mapname>/<filename>` (mapname extraction required)

**These inferences need verification** against (a) Fuh's ezquake.com/docs (the operator has a local rip), (b) `apps/qw-oracle/scripts/extractors/{ezquake,fte}/output/*-asset-path-rules-verified.json` (the Layer 1 asset-loader-sites data — already source-walked against ezQuake head). See *Threads worth pulling*.

### The gfx_comment table (1,449 rows) — NOT YET MINED

The comments table holds 1,449 user comments per asset, including **ad-hoc install instructions** authored by community members. Example from c_id 1927:

> "textures go in /textures/models/\r\nmdl file goes in /progs\r\n\r\ni've re-upped them in a PAK file so just put the pak in your gamedir of choice."

This is a model-bundle comment explaining install paths the FAQ doesn't cover. There may be 20-50+ such comments. **A grep over `c_txt` for terms like `/textures/`, `/progs/`, `/sound/`, "goes in", "put the", "folder" would surface them.** Could fill gaps in the inferred-install-path mapping.

---

## Slipgate W-11 design implications

The corpus walk surfaced 7 design refinements for the W-11 import classifier (to fold into the spec amendment cluster):

### 1. Tier reordering: bundle-metadata first

Today's W-11 design in `architecture.md`:
- Tier 1: SHA-match against catalog
- Tier 2: source-evidence (path/filename pattern from extractor data)
- Tier 3: quarantine

Proposed refinement:
- **Tier 0: bundle-level metadata** (sharer-supplied manifest, category tag, install instructions). When available, this is authoritative.
- Tier 1: SHA-match against catalog (still useful for individual files inside an unannotated bundle)
- Tier 2: path-pattern AND filename-pattern (filename is load-bearing — see #3 below)
- Tier 3: quarantine

### 2. Filename-as-role-signal is first-class

Pass 1 only had path-pattern rules. Pass 2 effectively used "bundle category → role + install_path" but didn't need filename-pattern fallbacks because the DB-category covered everything.

For real-world slipgate imports without DB context, **filename-pattern rules become important**:
- `*crosshair*.{tga,png}` → crosshair
- `charset*.{tga,png,bmp,pcx}` → charset
- `conback*.{lmp,png,tga,jpg}` → conback
- `*.pcx` (low-confidence fallback) → skin (software-renderer-era format)

### 3. Rename rules are part of role metadata

For roles like Conback, the role definition must carry a `filename_constraint` field: "conback.<ext>". Slipgate's materializer honors it during the install-from-warehouse step.

### 4. MIXED bundles need explicit support

Each bundle import can produce N manifest entries with N different roles. The UI must show "this bundle contains: 1 charset, 1 config — install both? install just the charset?"

### 5. Same-hash, multi-target case is real

The schema already handles this. The W-11 classifier just needs to know: don't deduplicate target_paths during import. Each `(blob, profile, target_path)` is its own manifest reference.

### 6. Corruption + orphan handling

W-11 needs explicit error paths for:
- Bundle is not a valid zip
- Bundle uses unsupported compression
- Bundle references file IDs not in any manifest the user has imported

### 7. Low-confidence categories surface to user

For Pass 2's low-confidence install paths (Textures/Sets, Skins/Gib, etc.), slipgate's import UX should surface "couldn't fully determine install path — please confirm or correct."

---

## Threads worth pulling next

In rough priority order. Each is bounded; pick one or two for the next investigation session.

### High-value

1. **Mine `gfx_comment` for install-instruction patterns** (~30 min). Grep `c_txt` for path-like patterns (`/textures/`, `/progs/`, `/sound/`, "goes in", "put the", "folder"). Could fill the 7 inferred-install-path categories with community-sourced confirmations. The 1,449-row table is small enough to skim.

2. **Verify inferred install paths against Layer 1 asset-loader-sites data.** The qw-oracle extractor output at `apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-asset-path-rules-verified.json` is source-walked against ezQuake head. Cross-reference our inferred paths (Models → `qw/progs/`, etc.) against it. This is the strongest possible verification — engine source disagrees with no one.

3. **Look at the 32 EMPTY bundles by hand.** Are they genuinely doc-only, or are we missing real asset sub-paths? A 10-bundle spot-check would tell us if the classifier has a blind spot or if these are author errors.

4. **Examine the 799 multi-target_path hash cases.** Pull 10-20 random ones, see what's actually going on. Same blob, different bundles, different install names — is it always legitimate (re-bundling by other authors) or does it surface curveballs (file with same hash going to wildly different roles)?

### Medium-value

5. **Cross-reference Pass 2 install paths against Fuh's ezquake.com/docs.** The operator has a local rip. Fuh's authoritative docs may correct or extend the FAQ-derived install paths. Particularly for: Models (multiple kinds), Configs (loading conventions), HUD (modern texture-replacement system).

6. **Pull the qw.nu/gfx site's PHP code for install-instruction templates.** The `qw.nu-gfx/app/` directory has the site's source. If the site rendered install instructions inline per category, that template logic might reveal install rules the DB doesn't carry explicitly.

7. **Time-distribution analysis.** Plot bundle uploads over time. Is the corpus dominated by 2007-2010 nostalgia uploads, or is there steady contribution through 2026? Affects "is this corpus representative of current state?" for slipgate's import detection.

8. **Author-attribution patterns.** Some bundles have `author_org` (free-text "original author") differing from `author_id` (the uploader). What fraction of bundles are uploaded by someone other than the original creator? Affects metadata-enrichment thinking.

### Lower-value / exploratory

9. **Are there other QW asset dumps to compare against?** Discord-shared bundles, kreml.org, qw.nu (non-gfx subsite), private mirrors. Validates representativeness.

10. **What does a real-world player quakedir look like vs the corpus?** The corpus is curated-uploaded content. Player dirs have stock + custom + accumulated junk. The differences inform W-11's classifier design for the "user runs slipgate against an existing dir" case.

11. **The `gfx_item_backup` table** — we didn't parse it. Could be a partial backup that surfaces categories or items the live table lost. Probably low-value but quick to check.

---

## Artifact pointers

### Where everything lives

- **Corpus tarball:** `/home/paradoks/sandboxes/qw3-abab-gfx/gfx.tar.gz` (1.41 GB; outside repo)
- **Extracted content:** `/home/paradoks/sandboxes/qw3-abab-gfx/files/` (the 647 zip/pk3/jpg/gif files)
- **MySQL dump:** `/home/paradoks/sandboxes/qw3-abab-gfx/gfx.sql` (258 KB, parseable with `sed`/`grep`)
- **Scripts:**
  - `parse-gfx-sql.py` — Script 1
  - `hash-corpus.py` — Script 2
  - `classify-pass1.py` — Script 3
  - `classify-pass2.py` — Script 4
  - All at `/home/paradoks/sandboxes/qw3-abab-gfx/scripts/`

### Output files (all in `/home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/`)

- `bundles.json` — 587 bundle records with metadata + category breadcrumb (347 KB)
- `blobs.ndjson` — 11,173 per-file hash records (1.6 MB)
- `classifications.ndjson` — Pass 1 per-file classifications (2.6 MB)
- `cross-validation.json` — Pass 1 per-bundle MATCH/MIXED/MISMATCH (190 KB)
- `pass1-coverage.md` — Pass 1 coverage report
- `pass2-manifest.ndjson` — **THE DELIVERABLE** — 11,173 per-(bundle, file) install records (6.2 MB)
- `pass2-coverage.md` — Pass 2 coverage report

### How to query interactively from a fresh terminal

```bash
cd /home/paradoks/sandboxes/qw3-abab-gfx/scripts/output

# Get manifest record count by role
jq -r .role pass2-manifest.ndjson | sort | uniq -c | sort -rn | head

# Find MIXED-secondary records
jq 'select(.mixed_bundle == true)' pass2-manifest.ndjson | jq -s 'length'

# Find bundles with no install records
python3 -c "
import json
bundles = {b['iid'] for b in json.load(open('bundles.json'))}
seen = set()
for line in open('pass2-manifest.ndjson'):
    rec = json.loads(line)
    if rec.get('target_path'): seen.add(rec['bundle_id'])
print('Bundles in DB with zero install records:', sorted(bundles - seen)[:20])
"

# Find hashes at multiple target_paths
python3 -c "
import json
from collections import defaultdict
d = defaultdict(set)
for line in open('pass2-manifest.ndjson'):
    rec = json.loads(line)
    if rec.get('target_path'): d[rec['xxh3_128']].add(rec['target_path'])
multi = {h: paths for h, paths in d.items() if len(paths) > 1}
print(f'Hashes at multiple paths: {len(multi)}')
for h, paths in list(multi.items())[:5]:
    print(f'  {h[:12]} → {sorted(paths)[:3]}')
"
```

### Sample concrete bundles to investigate

- **Bundle 350** — `encrusted_axe` (the example in our inventory doc). Clean Shape A.
- **Bundle 19** — Charsets bundle with companion `.cfg` (MIXED case).
- **Bundle 627** — Crosshairs that Pass 1 misclassified.
- **Bundle 0** — `.pk3` (FTE-flavor), has scoreboard texture pack. Not in DB.
- **Bundle 190** — unsupported PKZIP compression. Real corruption case.
- **Bundle 244** — Map textures with `pak.lst` index (MIXED case).

---

## Status

The asset-library investigation is **session-shaped, not arc-shaped**. Roughly 3 hours of focused dispatch produced:
- A working slipgate-consumable manifest with 95.9% install-coverage
- 7 concrete W-11 design refinements grounded in 587 real-world bundles
- 11 threads worth pulling for deeper investigation

The manifest can ship as `starter-content/qw3-abab-gfx.manifest.json` in slipgate-V1 (one translation pass to slipgate's exact manifest schema; ~1 hour of work). The W-11 refinements feed the spec amendment cluster + arc-planner.

**Next sessions to consider:**
- Investigation: pull one or more of the 11 threads above (especially #1 mining gfx_comment + #2 verifying against Layer 1)
- Or move forward: Browse + Manager UI brainstorm using corpus findings as input
- Or move forward: spec amendment cluster (fold W-11 refinements + simplifications + cross-platform)

All three are unblocked. Operator's call which to pick up.
