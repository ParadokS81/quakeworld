# QWiki content analysis

**Date:** 2026-05-09. **Status:** strategic-decision input for the qwiki-sandbox arc (X / Y / Z framing -- modernize / reconstruct / hybrid).
**Method:** SQL queries against the imported dump (`apps/qwiki-sandbox/dumps/qwiki.sql.gz`) running in a one-off `mariadb:11` container. No MediaWiki spun up.
**Scope:** content distribution, age, size, link health, edit attribution, KTX-mode coverage, EQL coverage. Used to settle whether the sandbox arc should continue as "modernize the wiki," pivot to "reconstruct integrated with quake.world," or land somewhere hybrid.

---

## TL;DR -- headline numbers

| Metric | Value | Notes |
|---|---|---|
| Total pages | 17,924 | All namespaces, includes redirects |
| Content pages, all NS | ~16,000 | Excludes redirects |
| Content pages, Main NS | 9,179 | What operator was thinking of as "9000" |
| Substantial articles (5KB+, Main NS) | 679 (7.4%) | The actual content tail |
| Stub-or-tiny pages (<1KB, Main NS) | 4,726 (51%) | Half of "articles" are stubs |
| Pages stale 10+ years | 7,202 (40%) | Untouched since 2016 or earlier |
| Pages stale 5+ years | 11,367 (63%) | Untouched since 2021 or earlier |
| Pages edited in last 12 months | 1,560 (8.7%) | Recent activity is thin |
| Internal-link breakage | 6.61% | 7,584 broken links of 114,776 total |
| Edit attribution preserved | NO | `rev_actor = 0` for all 78,377 revisions in dump |

---

## Critical findings (5)

### 1. Player pages dominate, most are stubs

The wiki is structurally a player directory.

- 5,903 pages in `Category:Players` (66% of Main NS content)
- 3,353 of those are `Category:Player_stubs` (57% of player pages flagged as stubs)
- 316 `Category:Players_with_no_profile_picture`
- 168 main-NS pages have `page_len = 0` or under 100 bytes (entirely empty stubs like `Damage_(Swedish_Player)`, `Choke`, `Xenex`)

Implication: most of the "9000 articles" the operator references are thin player profiles. Hub V2 will have richer, structured player data sourced from xantom's demo parser + tournament databases. The wiki's player-profile role is what hub V2 most directly obsoletes.

### 2. Substantial content tail is narrow

Real articles (5KB+) in the Main namespace = 679 pages. The top 25 by size:

- Tournament reports: `QuakeWorld_Duel_League_Season_1/EU_Div3` (102KB), `Ownage_Cup` (81KB), `Kombat_2on2_5` (76KB), `QHLAN2017/1on1` (54KB), `EQL_Season_23/Division_1` (46KB), `QuakeCon_2020`, `QHLAN2024/1on1`, multiple Polish_Duel_Season pages, etc.
- Encyclopedic: `Quake_(Game)` (58KB), `ELO` (43KB)
- Outliers: `Columns_Purity` (280KB!), `Columns_Purity_2004-now` (219KB) -- a community essay or historical archive worth investigating

Tournament season-pages and historical encyclopedic articles are where the wiki actually does work that hub V2 + oracle don't naturally replicate.

### 3. Severe staleness in the long tail

| Bucket | Page count | % of total |
|---|---|---|
| Pages last edited 2007 | 2,444 | 14% |
| Pages last edited 2008 | 1,348 | 8% |
| Pages last edited 2010 | 1,406 | 8% |
| Pages stale 10+ years | 7,202 | 40% |
| Pages stale 5+ years | 11,367 | 63% |
| Pages edited 2024-2026 | 4,741 | 26% |

The 2007 / 2010 spikes are likely artifacts of bulk imports or migrations (operator can confirm). The 2024-2026 activity (4,741 pages, mostly tournament + ongoing-event pages) is where the wiki is *currently* useful. Everything else is read-mostly archive material.

### 4. Edit attribution is severed in the dump

All 78,377 revisions have `rev_actor = 0`. The `actor` table is preserved (1,243 named actors including D0PESK1LLZ / Bps / LocKtar / Praxismo / Jehar / Hooraytio / etc.) but the link from revision to actor is broken.

ciscon's sanitization scope went beyond just user accounts -- it scrubbed who-edited-what too. This means:
- Edit timestamps preserved (we know *when* a page changed)
- Edit counts preserved (we know *how often* it changed)
- Authorship lost (we don't know *who*)

For the modernization arc, this matters because:
- "Show contributors" features won't work on the sandbox without un-sanitized data
- If we want to credit contributors during phase-6 showcase, we need ciscon to ship a less-sanitized version
- For the X/Y/Z decision, this lowers the value of "preserving the existing wiki" because one of the wikis' core values (provenance, edit history) is already half-gone in the artifact ciscon controls.

### 5. KTX-mode coverage is exactly the operator's pain point

Operator said: KTX has 27 game modes; source code links 15 wiki URLs (12 broken); of the 15 working, half are sparse.

What we found:
- `KTX` page itself: 3,379 bytes (moderate)
- `Race` (the mode): 2,210 bytes (moderate)
- Race1-Race20 individual map pages: 500-600 bytes each (stubs)
- `CTF-2on2`: 7,214 bytes (substantial)
- `CTF_Showdown`: 8,391 bytes (substantial)
- CTF1, CTF5, CTF8, CTF2M1, CTF2M8: 500-650 bytes (stubs)
- `Hoonymode`: 1,653 bytes (moderate-stub)

The wiki has *some* mode pages but most are stubs. The narrative-form descriptions the source code links to are exactly what wikis are good at, but in this wiki they're underdeveloped. This is the canonical "wiki-belongs-here" content shape that's failing.

---

## Per-namespace breakdown

Excluding redirects.

| NS ID | Inferred name | Content pages | Substantial 5K+ | Notes |
|---|---|---|---|---|
| 0 | Main (articles) | 9,179 | 679 | Players + Clans + Tournaments + Maps + concepts |
| 1 | Talk | 112 | 0 | Discussion pages, mostly thin |
| 2 | User | 89 | 9 | User profile pages |
| 3 | User_talk | 26 | 4 | |
| 4 | Project (`QuakeWorld:`) | 7 | 1 | Wiki self-references |
| 6 | File | 5,027 | 0 | File description pages, all <1KB |
| 8 | MediaWiki | 19 | 6 | System messages |
| 10 | Template | 768 | 68 | The template machinery (load-bearing for any modernization) |
| 12 | Help | 5 | 2 | |
| 14 | Category | 254 | 2 | |
| 15 | Category_talk | 5 | 1 | |
| 102 | SMW (`Property:`) | 9 | 0 | SMW property declarations |
| 108 | (custom; only `Bps_tournament_results`) | 1 | 0 | |
| 112 | SMW (`Concept:`) | 2 | 0 | SMW concept declarations |
| 3000 | **Xerial (sandbox area)** | 29 | 7 | xantom's experimental tournament structures: `Test`, `E2EWizard`, `Saga`, `The_Big_4`, `SkillTest`, `EvalTest` -- somebody's been prototyping inside the wiki |

The `Xerial` namespace finding (NS 3000) is interesting: someone (likely xantom or a Xerial collaborator) has been using the wiki as a sandbox for tournament data structures. Pages like `Xerial/E2EWizard/Division_1`, `Xerial/Saga/E2E-Cup-S1/Division_1` suggest active testing of structured tournament templates inside MediaWiki.

---

## Top categories (top 15)

| Category | Members |
|---|---|
| Players | 5,903 |
| Player_stubs | 3,353 |
| Swedish_Players | 1,230 |
| Clans | 829 |
| Finnish_Players | 668 |
| Polish_Players | 655 |
| British_Players | 655 |
| Leagues | 650 |
| Russian_Players | 519 |
| German_Players | 445 |
| **InfoboxComplete** | **444** |
| Matchreports | 369 |
| Online_Tournaments | 346 |
| Clan_stubs | 339 |
| Players_with_no_profile_picture | 316 |

Notable: `InfoboxComplete` only has 444 pages -- meaning the community already has a "completed-quality" tag and only ~5% of articles meet it. Someone has been curating quality, but the long tail is overwhelming.

---

## SMW usage

SMW is heavily wired in:

- 32,218 SMW objects in Main NS (vs 9,179 main-NS pages -- average ~3.5 subobjects per page)
- 5,054 in File namespace
- 346 in Categories
- 280 in User namespace

Tournament pages are the likely heavy users (subobjects per match / participant). SMW is *the* lever for turning this into queryable data, but it's only useful if pages adopt the property scheme consistently (and `InfoboxComplete: 444` says they don't).

---

## Files / images

- 5,024 file records
- 2,799 MB total media (matches what the dump's `image` table tracks)
  - 4,832 BITMAP (jpg/png), 2,061 MB
  - 182 UNKNOWN, 731 MB -- includes the 178 QW demos (qwz/qwd/mvd) the handover mentioned. Demos are fat.
  - 8 DRAWING (svg)
  - 2 VIDEO

Note: the 6.4G tarball includes thumbnails + variants (sharded under `images/<hash>/<sub>/`) which aren't all `image`-table rows. The 2.8G in `image` is the originals only.

---

## Implications for the X / Y / Z framing

### X (modernize) reads weaker than expected

- 51% of Main-NS pages are stubs or tiny. Modernizing these is mostly busywork (low value per page).
- 63% are stale 5+ years. They're not actively maintained; modernization tooling won't reach them organically.
- Edit attribution is already gone in our artifact -- one of wikis' core values (provenance) doesn't survive into the sandbox without a less-sanitized dump.
- Player-page-dominated structure (5,903 / 9,179 = 64% of Main NS) is precisely what hub V2 + xantom's structured data will obsolete. Modernizing player pages is investment toward a future-obsoleted store.

### Y (reconstruct) reads stronger than expected, but partial

- For player pages + tournament results (the bulk of stubs): yes, reconstruct. Hub V2 + structured data + automatic demo-to-tournament linkage produces objectively better data than 5,903 stub player pages.
- For file/image hosting: keep wiki (5,024 files including 178 demos isn't trivial to migrate; the wiki's File: namespace + thumbnail rendering is mature).
- For the substantial content tail (~679 pages 5KB+, plus the 768 templates and 254 categories): this is the wiki's actual value. Reconstructing it as quake.world prose pages would lose 19+ years of organic context.

### Z (hybrid) is what the data supports

The split:

**Wiki retains:** mode descriptions (KTX modes, gameplay mechanics), historical narrative (tournament writeups, "how this thing worked in 2009"), encyclopedic articles (Quake_(Game), ELO), community memory, player bios for *substantial* players (the InfoboxComplete-444 set), file/image hosting. Modernization investment goes here. Page Forms + Cleanup pilot apply to the substantial tail and the 768 templates.

**Quake.world owns:** tournament results / brackets / player achievements / team rosters / map BSP-derived data / demo references. Sourced from xantom's parsers + structured databases. Oracle consumes from quake.world directly, not wiki.

**Stub player pages:** abandoned in place. The 3,353 stubs aren't worth modernizing OR migrating; quake.world will produce richer player profiles automatically. The wiki's stub pages remain as historical record but stop being the canonical store.

---

## Recommendations

### Immediate

- **Do not abandon the qwiki-sandbox arc, but rescope it to Z.** The arc as currently scoped (X = modernize the whole wiki) has poor ROI. The arc as Z (modernize the substantial-content tail + templates + the narrative role) is high-value and aligns with the broader ecosystem.
- **Phase 4 (Page Forms) scopes only to the substantial-content + active-tournament path.** Form-driven editing for tournament season pages, KTX mode pages, map articles, encyclopedic articles. Skip form authoring for player profiles (let those decay; quake.world replaces).
- **Phase 5 (cleanup pilot) demos two flows:** (a) backfill / clean a single KTX mode page from stub to substantial -- proves the operator can fix the source-code-pointed-here pain. (b) form-driven entry for an ongoing tournament -- alice's hook.
- **Phase 6 (showcase / cutover proposal) reframes:** cutover proposal isn't "migrate to modern MW, life as before with prettier chrome." It's "wiki retains the narrative role; quake.world takes over structured data; here's the modernized wiki demonstrating its smaller-but-load-bearing role."

### Medium-term

- Ask ciscon for a less-sanitized dump (or just `revision_actor` mappings) so edit attribution is preserved -- at least for the modernization sandbox. Without this, "show contributor history" demos are impossible.
- Investigate `Columns_Purity` (280KB main-NS page) -- biggest article on the wiki, content unknown. May or may not be worth preserving.
- Look at NS 3000 (Xerial sandbox) -- xantom is already prototyping structured tournament data there. Coordinate with him; this is convergent.

### Open questions for the next conversation

- For the substantial-content tail (679 pages 5KB+): operator manually picks the "must-survive" subset (probably 100-200 pages of tournaments + encyclopedic articles + mode descriptions) for modernization investment.
- Cutover-proposal positioning: do we frame it as "wiki gets a haircut" (reduce active scope to narrative-only) or "wiki gets modernized" (full upgrade, but with the understanding that quake.world takes over structured data)? Different conversation with bps + ciscon.
- For player-page abandonment: do we redirect old stubs to quake.world profiles automatically post-cutover, or leave them as historical pages with a "see quake.world for current data" banner?

---

## Reproducibility

To re-run this analysis:

```
cd /home/paradoks/projects/quakeworld/apps/qwiki-sandbox
docker run -d --name qwiki-analysis \
  -e MARIADB_ROOT_PASSWORD=analyze -e MARIADB_DATABASE=qwiki \
  -v "$(pwd)/dumps/qwiki.sql.gz:/docker-entrypoint-initdb.d/qwiki.sql.gz:ro" \
  mariadb:11
# wait ~30s for auto-import
docker exec qwiki-analysis mariadb -uroot -panalyze qwiki -e "SELECT ..."
```

Container left running at session end (operator's call to `docker rm -f qwiki-analysis` when done).
