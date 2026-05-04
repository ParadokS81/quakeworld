# KTX map / game-mode support relation -- Maphub v2 capture

**Added:** 2026-05-04 (during arc-brainstormer for KTX Layer 1 Onboarding; operator soft-capture before maps.quake.world richer dataset comes online).
**Status:** Soft capture. OUT OF SCOPE for the active KTX onboarding arc (which extracts engine-shape entities from KTX C source). Trigger to act on this: either (a) maps.quake.world richer-metadata integration arc starts, or (b) Layer 3 candidate #2 ("KTX game modes index") authoring needs per-mode map lists.
**Source:** https://www.quakeworld.nu/wiki/Maphub_v2 (documents the contents of bps's `maphub_v2` map -- a navigable QW map with 185 teleporters where players walk around and warp to selected maps). The wiki page lists the map's contents; the map IS the curation. Authority: bps is a known QW community figure (KTX logo author per the KTX README, generally trusted curator).

**Provenance qualifier:** this list is NOT exhaustive. It is bps's selection of "canonical top" maps per mode at the time he built the map. Many more maps support each mode in practice (especially bloodfest -- the 13 listed are the well-known ones; servers run dozens more). Treat this as a high-confidence canonical-baseline, not as a closed set.

---

## Why this matters

Maps already exist in qw-oracle Layer 1 (`qw.maps` table, 254 maps loaded 2026-04-27). KTX game modes will exist in Layer 1 post-this-arc (UserModes_t enum + lsType_t enum surfaced via discovery sweep, ~12 distinct modes inventoried). The RELATION between them -- which maps support which modes -- doesn't exist anywhere in our database today.

This relation is real and load-bearing: a server admin running KTX in bloodfest mode needs maps that support bloodfest spawn structures (entities for monster placement). 4on4 needs maps with the right size + item layout. Race / slide / trick are mode-specific by construction. Wipeout is variant-of-clan-arena but only on certain maps.

Maphub v2 is the closest thing to a community-canonical mapping. Not authoritative -- it's a curated short-list, not exhaustive (e.g., probably more bloodfest-capable maps exist on individual servers than the 13 listed). But it's the best publicly-available data point until maps.quake.world comes online with the full pipeline.

---

## Maphub v2 data (captured 2026-05-04)

Map names normalized to lowercase to match qw-oracle convention (case-insensitive lookups per operator preference). Cross-mode duplicates preserved (a map appearing in two modes counts in both lists).

### 4ON4 (24 maps)

dm2, dm3, e1m2, e2m2tdm, schloss, obsidian, rock, phantombase, aztek, steam, cmt1b, cmt3, cmt4, cmt5pro, ctl5, ctl6, ctl8, stroggopolis, anwalk2, italy, mirage, nuke, qobblestone, dust2

### 1ON1 (26 maps)

dm2, dm4, dm6, aerowalk, ztndm3, bravado, skull, shifter, rwild, monsoon, travelert6, doomed, dad2, toxicity, chute, axe, metron, zeta, spitfire, pocket, catalyst, dm2frost, dm4frost, dm6frost, aerowalkfrost, ztndm3frost

### AIM / DMM4 (18 maps)

povdmm4, povdmm4a, povdmm4b, end, end2, amphi, endif, dm2dmm4, hellspit, dm3hill, oldcrat, newcrat, dmm4_1, noentry, hammerv3, outpost, anarena3, nacmidair

### BLOODFEST (13 maps)

bloodfest, barrel, dm4ish, e1m7, genocide, hohoho, kenya, q1dm17, arena3, arena5, death6, fragyard, pillar

### RACE (21 maps)

race1, race2, race3, race4, race5, race6, race7, race8, race9, race10, race32c, race11, race12, race13, race14, race15, race16, race17, race18, race19, race20

### SLIDE (14 maps)

slide1, slide2, slide3, slide4, slide5, slide6, slide7, slide8, slide9, slidefox, slstart, rawspeed, speedrush, subslide

### TRICK (25 maps)

ssj, trix, trix2, ztricks, ztricks2, jqdf1, ztrain, ztrain2, zjumps, trick1, trick11, tr3_b1, v_kjump, v_kjump2, trickj1-beta, 2bfree, way2ez, way2ez2, hoppa2, zediit, zediit2t1, zediit2t2, tr2, ninerooms, escape2a

### BIG (4 maps)

death32c, superdm32, bloodwalk, schobble

### FUN (10 maps)

xmastree, hohoho2, hohoho, xm00s19, hippos, hottub, sm4, pm4, dm2back, dm4back

### CTF (20 maps)

e1m5, e2m2, e2m5, e4m3, rctf1, rctf2, rctf3, mammoth, pound, capit, boom, gym, head, ctf1, ctf5, ctf8, ctf2m1, ctf2m3, ctf2m8, ctf3m2

### WIPEOUT (14 maps)

bloodwalk, q3dm6qw, dm3, cmt3, cmt4, schloss, stroggopolis, vaporize_beta103, shifter, qtdm3, a2, rwild, naked6, ht_almostlost

### Note on the 185-vs-186 discrepancy

bps's map has 185 teleporters; the wiki header says 186 maps. Likely off-by-one accounting (one teleporter is probably a hub-return / exit, or one map gets two teleporters in different categories without separate per-category counting). Doesn't affect the data's usefulness.

### Cross-mode duplicates observed

Maps appearing in multiple modes (validates the many-to-many join model):
- dm3: 4ON4 + WIPEOUT
- cmt3, cmt4, schloss, stroggopolis, rwild, shifter: 4ON4 (or 1ON1) + WIPEOUT
- bloodwalk: BIG + WIPEOUT
- hohoho: BLOODFEST + FUN

---

## Schema-enhancement options (for the future arc that acts on this)

The data is a many-to-many relation between maps and modes. Two viable schema shapes:

### Option A -- JSON column on qw.maps

Add `mode_support_json JSONB` to the existing `qw.maps` table. Per row, a list like `["1on1", "4on4", "wipeout"]`. Cheap to add (additive migration), trivially queryable for "which maps support 4on4" via `WHERE mode_support_json @> '["4on4"]'`. Downside: not normalized; harder to query the inverse ("which modes does dm3 support?" works but "show all (mode, map) pairs" is awkward).

### Option B -- Separate join table qw.map_mode_support

```sql
CREATE TABLE qw.map_mode_support (
    map_name TEXT NOT NULL REFERENCES qw.maps(name),
    mode TEXT NOT NULL,        -- '1on1' | '4on4' | 'bloodfest' | ...
    source TEXT NOT NULL,      -- 'maphub_v2' | 'mapsqw' | 'community' | ...
    captured_at TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (map_name, mode, source)
);
```

Properly normalized. Easy bidirectional queries. Source column allows multiple datasets to coexist (Maphub v2 today, maps.quake.world later, server-specific custom lists eventually).

**Recommendation when this arc activates:** Option B. Forward-compatible with maps.quake.world richer-data integration; cleaner querying; native multi-source provenance. The `source` column is especially load-bearing here -- bps's curated-top is one source ('maphub_v2'), maps.quake.world will be another ('mapsqw'), per-server actually-played evidence from qwhub match history will be a third ('qwhub_played'). Each source has different confidence + completeness characteristics. Querying "what mode does X support?" should let consumers union across sources or filter to a single trusted source.

---

## Related work

- **Map knowledge layer (shipped 2026-04-27):** `apps/qw-oracle/docs/arc-history.md` -- 254 maps loaded, schema v13. Foundation for any qw.map_* extension.
- **HANDOVER sidequest "Map knowledge layer follow-ups":** mentions "future maps.quake.world richer-metadata refactor" -- this map-mode capture is one of the data points that refactor would absorb.
- **Slipgate web services vision (memory `project_slipgate_web_services_vision.md`):** maps.quake.world is part of the assets/maps/hub triad.
- **qwhub-api integration (memory `reference_qwhub_api.md`):** match-history data may carry mode tags that cross-validate which maps were actually played in which modes (empirical complement to the curated Maphub v2 list).
- **Layer 3 concept-note candidate #2 ("KTX game modes index"):** the per-mode map lists captured here are direct content for that note's per-mode sections.

---

## Trigger to act

This data is captured but inert. It activates when:

1. **Maps.quake.world richer-data integration arc starts** -- ingest both Maphub v2 and the richer maps.quake.world dataset under a unified `source` discriminator.
2. **Layer 3 concept note "KTX game modes index" authored** -- per-mode map lists are needed; the curator pulls from this file (and from any newer dataset available at authoring time).
3. **Server-admin tool surface in slipgate** -- if slipgate ever surfaces "maps that work for mode X" as a UI affordance, this is the seed data.

Until then, leaving as parking-doc capture. No DB columns added, no extraction work, no consumer integration.
