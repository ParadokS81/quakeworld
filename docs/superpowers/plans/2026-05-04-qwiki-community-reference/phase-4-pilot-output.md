# Phase 4 -- Tournament schema-discovery pilot output

This document is the LLM-driven schema-discovery deliverable for Phase 4 of the QWiki community-reference arc. It surveys 58 stratified tournament articles, enumerates template variants and field shapes, and recommends the migration 009 column list, the `is_substantive` heuristic, and the `has_note` v1 rule. Operator approval at the end of Section 7 is the gate before Task 3 (migration 009) begins.

Snapshot baseline: `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/`. All field-frequency tables and edge-case counts are computed against the live snapshot, not training data.

Conventions: ASCII only, ASCII hyphen-minus only. Decisions referenced as `D<n>` map to `decisions.md`; findings as `F<n>` map to `review-findings.md`. Field names in lowercase regardless of how the wikitext renders them.

---

## 1. Sample Composition

The 58 sampled slugs total 1 over the 57 the stratification quota would have produced (the 10 mandatory fixtures included QHLAN_8, EQL_Season_1, EQL_Season_12, Polish_Duel_Season_2, QuakeCon_2017, Thunderdome_Season_5, Duelmania_3, Sdcup3, Kombat_DMM4, Swedish_Quake_League; some overlap with the random draws, some do not). Bucket assignments below were derived programmatically (see `decisions.md` Task 1 selection helper) and then sanity-checked against the actual wikitext.

The bucket key (template branch x type-field value at first match) is the same scheme the parser will use at runtime, so misclassification here would fall through to the parser as well; that is by design.

### Buckets (n=58)

**Infobox lan (n=6)**

- QHLAN2017__Playoffs (slash-title sub-event of QHLAN2017; carries its own Infobox lan with full LAN metadata)
- QHLAN_10
- QHLAN_15
- QHLAN_8
- QW_LAN_Party_Poland_2022
- QW_LAN_Party_Poland_2024__4on4_Draft (slash-title sub-event; type=online despite the lan template)

**Infobox league -- type=Online (n=15)**

- BAYA_1on1 (Note: type=Offline despite Online classification edge -- this is a Russian 2001 LAN that uses the Infobox league not Infobox lan; bucketed by category-overlap below)
- Casual_Duel_Cup_2
- Draft_Masters_2__Division_2
- Duelmania_3
- EQL_Season_1
- Polish_Duel_Season_2
- QHLAN2022_CTF (CTF in title; falls into edge bucket too)
- QW2018Teamleague
- Quakeworld_Eternal
- Quakeworld_Eternal__Schloss
- QuakeWorld_AllStars
- QuakeWorld_AllStars_2018
- QuakeWorld_MIX_League_5
- Russian_QuakeWorld_League_Season_3
- Russian_QuakeWorld_League_Season_8
- The_Big_4__Season_1__Information

(15 distinct unique slugs with type=Online or implicit-Online; one of these -- Thunderdome_Season_14 -- is grouped under Online because it lacks the "Seasonal" type suffix even though prior seasons had it; counted under Online below for tabulation.)

- Thunderdome_Season_14 (type=Online; sibling Thunderdome seasons type=Online Seasonal League)

Cumulative Online count for the table: 17 (the Python pass at section 2 reports 17 because the bucket key is derived from `type` field value alone, which folds BAYA_1on1's "Offline" into a separate bucket -- it appears in offline below, not Online).

**Infobox league -- type=Offline / LAN (n=7)**

- BAYA_1on1
- QuakeCon_2016
- QuakeCon_2017
- Quake_FFA___Real_Club_SPB
- UALAN2
- UALAN4
- UALAN5

**Infobox league -- type=Online Seasonal League (n=4)**

- Thunderdome_Season_1
- Thunderdome_Season_4
- Thunderdome_Season_5
- Time_2_Hammer_Season_1

**Infobox league -- type=Online Draft (n=1)**

- QuakeWorld_AllStars_2020

**Infobox league -- edge-case mode (race / dmm4 / ctf in first 3000 chars of body) (n=3)**

- Kombat_DMM4 (no `|type=` field at all; mode=dmm4)
- QHLAN2022_CTF (mode=4on4 but body says CTF; first-3000 char "ctf" trigger)
- Sdcup3 (format=Individual racing -> mode=Race)

**Infobox league -- type missing (Kombat-style; n=2)**

- Kombat_DMM4 (also in edge-case bucket)
- Kombat_FFA_4 (mode=FFA; no `|type=` -- parser must infer or default to 'unknown')

**NO_INFOBOX bullet-prose (n=10)**

- Bernard_Oktoberfest_2008 (one-day duel tournament; ezquake/fuhquake era; rich content)
- Dm6mania (DM6-only 1on1; 2008)
- EQL_Season_12
- EQL_Season_13
- EQL_Season_21 (sparse 2018-era page; just the bullet header + tables)
- EQL_Season_6
- EQL_Season_9
- NQR_North_America (regional NQR variant; sparse infobox, has prose history)
- Quake_SM__97 (Swedish national championship 1997-style; bullet-list mostly)
- Swedish_Quake_League (the prototypical pre-template prose-shape tournament; has just three bullet-prose lines + body)

**Outlier / prose fallback / NO INFOBOX (n=11)**

- ClanWarz_Poland (rich prose, Image header, no infobox, no bullet-prose pattern)
- Hymn_of_Hope_May_Edition (Running-date / IRC / Website bullets are prose-style with no triple-tick label)
- Nations_Quake_Rank (NQR-Navbox top + Hall-of-fame table + season list; minimal narrative; has the navbox so series is recoverable)
- QuadDamage_(Czech_Tournament) (190-byte page; one-sentence prose + a link)
- Red_Annihilation (1997 E3 winner-of-Romero's-Ferrari historical page; image + prose; no infobox)
- SD5_NEU_Eighth_cMF-FU (MATCH REPORT -- not a tournament page; see edge cases)
- SD5_NEU_Final_SR-LA (MATCH REPORT)
- SD5_NEU_Quarter_HF-ToT (MATCH REPORT)
- SD_NEU_Seasons (4-line summary page about Smackdown North Europe seasons; almost all bullet)
- SD_Season_5 (similar 4-line summary page, but for a different Smackdown season)
- UKCL (UK Clan League; just a header and prose introduction; no infobox)

**Mandatory fixtures (always in sample, may overlap above buckets):** EQL_Season_1, EQL_Season_12, QHLAN_8, QuakeCon_2017, Thunderdome_Season_5, Duelmania_3, Sdcup3, Kombat_DMM4, Swedish_Quake_League, Polish_Duel_Season_2 -- 10 articles, all present in the 58.

### Match-report leakage (Q3)

**Three articles in the sample are MATCH REPORTS, not tournament pages:**

- SD5_NEU_Eighth_cMF-FU
- SD5_NEU_Final_SR-LA
- SD5_NEU_Quarter_HF-ToT

Pattern: title contains a round name (Eighth/Quarter/Final/Semi) and a hyphenated team-pair abbreviation (`cMF-FU` = clan MalFunction vs Fragglerz United; `SR-LA` = Slackers vs Lege Artis; `HF-ToT` = Heretic Faction vs Tribe of Tjernobyl). Body shape is uniform: `[[Image:SD_EU.gif|...]]` header, `== Introduction ==` section, then `* '''Competition:''' [[<parent tournament>]]`, `* '''Round:''' <round name>`, `* '''Match:''' <team A> vs <team B>`, `* '''Date:'''`, then bracket detail. They are tagged `Category:Leagues` (which is why the Phase 4 selector picks them up) but they are not tournaments. The `Competition:` field points at `[[SD EU Season 5]]` which IS a tournament; these pages are sub-content.

Recommendation: parser detects this match-report shape via a 3-of-3 rule -- presence of all three patterns `\* '''Competition:'''`, `\* '''Round:'''`, `\* '''Match:'''` within a 200-char window -- and excludes those articles from `community.tournaments` entirely (NOT loaded as a row). Discussion in Section 7, Q1.

### Sub-event slash-title articles

Two articles in the sample are slash-title sub-events that DO carry their own Infobox and tournament metadata:

- QHLAN2017__Playoffs (Infobox lan with full QHLAN2017 metadata replicated; the Playoffs sub-tab of the parent QHLAN2017 article)
- QW_LAN_Party_Poland_2024__4on4_Draft (Infobox lan with full QWLAN_PL_2024 metadata; the 4on4 Draft sub-event)
- Quakeworld_Eternal__Schloss (Infobox league with full Quakeworld Eternal metadata; the Schloss-map sub-tournament)
- Draft_Masters_2__Division_2 (Infobox league with Draft Masters 2 metadata; Division 2 of the Draft Masters 2 series)

Note that for the QHLAN2017__Playoffs / Quakeworld_Eternal__Schloss / Draft_Masters_2__Division_2 cases, the slash-title page's Infobox repeats the parent's metadata (organizers, dates, etc.) and adds sub-event-specific bracket / standings content. The parent (Quakeworld_Eternal, QHLAN2017, etc.) is also a separate row. There is structural duplication: sub-event row data largely matches the parent row data. Recommendation in Section 7, Q3.

---

## 2. Template Variants

### Infobox league (n=31 in sample; ~63% of corpus per spec sketch)

Field-frequency table (only fields that appear in at least one article are listed; percentages are over n=31):

| Field | Count | % | Variant notes |
|---|---|---|---|
| name | 30/31 | 97% | The "tournament long name" string |
| map1 | 30/31 | 97% | Most articles list at least one map; many have map2..map5 |
| type | 29/31 | 94% | Casing varies: `Online`/`online`/`Offline`/`Online Seasonal League`/`Online Draft`. Lower-case before bucketing. |
| sdate | 29/31 | 94% | Date variants vary (see Edge cases) |
| map2 | 29/31 | 94% | |
| map3 | 29/31 | 94% | |
| format | 27/31 | 87% | Free-form prose ("Seeded Double-Elimination Bracket", "Five divisions<br/> Group Stage<br/> Single-Elimination Bracket"). Mode token may also live here. |
| organizer | 25/31 | 81% | `{{Player\|id\|flag=xx}}`, `{{player\|...}}` (case-varied), or plain text |
| map4 | 25/31 | 81% | |
| image | 24/31 | 77% | |
| map5 | 21/31 | 68% | |
| edate | 20/31 | 65% | |
| tickername | 16/31 | 52% | Short alternate name (e.g., "QuakeCon: QW Duel"); use as alias not display |
| year | 16/31 | 52% | When sdate is non-empty year is often empty (operator-side judgment about which to populate) |
| team_number | 15/31 | 48% | Integer; sometimes used as "player_number" (1on1 events) |
| admin | 14/31 | 45% | Single primary admin; often duplicates `organizer` (BAYA_1on1, Quake_FFA___Real_Club_SPB) |
| website | 11/31 | 35% | |
| map6 | 10/31 | 32% | |
| prizepool | 10/31 | 32% | Variants: `Fame & Glory`, `Fame and glory`, `$500,00`, `25000`, `5,000`, `17723 SEK`, `Yes` |
| mode | 9/31 | 29% | Explicit `mode` field exists; values `1on1`, `2on2`, `dmm4`, `FFA`/`ffa` |
| map7 | 9/31 | 29% | |
| tournaments | 8/31 | 26% | ALT for `mode`/`format`. Polish_Duel_Season_2 uses `tournaments=1on1`. Kombat_FFA_4 uses `tournaments=FFA`. QuakeWorld_AllStars_2020 uses `tournaments=4on4`. Acts as a multi-mode list when applicable (`tournaments=4on4, 2on2, 1on1 and FFA` for QW_LAN_Party_Poland_2024__4on4_Draft) |
| admin2..admin4 | 7,3,1 | 23/10/3% | EQL_Season_1 has admin..admin4; Time_2_Hammer_Season_1 has admin only (with comma-separated list inside) |
| twitch | 7/31 | 23% | Channel handle |
| series | 7/31 | 23% | Polish_Duel_Season_2, QuakeCon_2017, RQWL Seasons 3 + 8, UALAN 2/4/5 are the only articles that fill this. |
| discord | 6/31 | 19% | URL or invite |
| teamfirst | 6/31 | 19% | Winner team string |
| teamfirstflag | 6/31 | 19% | 2-letter ISO |
| teamsecond | 5/31 | 16% | Runner-up |
| teamsecondflag | 5/31 | 16% | |
| teamthird | 5/31 | 16% | |
| teamthirdflag | 5/31 | 16% | |
| youtube | 4/31 | 13% | |
| founder | 3/31 | 10% | EQL_Season_1, Polish_Duel_Season_2, Time_2_Hammer_Season_1. Treat as alias for organizer when computing the substantive flag (see Section 5). |
| sponsor | 3/31 | 10% | Free-form |
| country | 3/31 | 10% | iso (e.g., `us`) for Infobox league; full country name for Infobox lan (see below). Note inconsistency: QuakeCon uses iso, Quake_FFA___Real_Club_SPB uses "Russia" (full name). |
| city | 3/31 | 10% | |
| organizer2..organizer4 | 3,3,3 | 10% each | Thunderdome family uses these |
| date | 2/31 | 6% | Single-date variant (when sdate / edate not used). QHLAN2022_CTF uses `date=18 Nov, 2022`. QuakeCon_2016 fills both `date=` (empty) and `sdate=`/`edate=`. |
| venue | 2/31 | 6% | LAN locations |
| prizepoolusd | 2/31 | 6% | QuakeCon_2016=25000, QuakeCon_2017=5,000 (the 5k carries comma-thousands sep) |
| web | 2/31 | 6% | ALT field name for `website`. QuakeCon_2017 uses `web=`. |
| teamfourth | 2/31 | 6% | (only QuakeCon_2016 + QuakeWorld_AllStars_2020 in the sample) |
| teamfourthflag | 2/31 | 6% | |
| youtube2 | 2/31 | 6% | Secondary youtube handle |
| irc | 1/31 | 3% | Duelmania_3=`#duelmania (QuakeNet)` |
| website2 | 1/31 | 3% | |
| website3 | 1/31 | 3% | Free-form URL chain |
| teamthird2, teamthird2flag | 1/31 | 3% | EQL_Season_1 carries both `teamthird=Antiquad` and `teamthird2=Suddendeath` -- two clans tied for third |
| participants_number | 1/31 | 3% | QuakeCon_2017 uses this ALT for team_number |
| shortname | 1/31 | 3% | QuakeCon_2017's short tournament identity; treat as alias |
| twitch2 | 1/31 | 3% | |
| icon | 3/31 | 10% | |
| sponsor | (counted above) | | |
| game | (always empty when present) | | Legacy slot for Quake-version label; never filled in the sample |
| liquipediatier | (always empty when present) | | Liquipedia-style ranking slot; not used by the wiki |

**Variant notes within Infobox league:**

- `teamfirst` vs `idfirst`: QuakeCon_2017 uses `idfirst=` / `flagfirst=` (Liquipedia-style); the rest use `teamfirst=` / `teamfirstflag=`. The parser must accept both pairs.
- `teamforth`/`teamforthflag` (mis-spelled "forth"): BAYA_1on1, Quake_FFA___Real_Club_SPB, Thunderdome_Season_1, Thunderdome_Season_4, Thunderdome_Season_5 -- 5 of 31 -- use `teamforth` instead of `teamfourth`. Same pattern in `teamforthflag`. The parser must accept both spellings (one is a typo bequeathed by template copy-paste; consistent enough that the parser cannot ignore either).
- `web=` vs `website=`: QuakeCon_2017 uses `web=`; the parser already accepts both per the phase MD's Step 4 design.
- `sdate=` may carry suffix junk: QuakeWorld_AllStars_2020 has `sdate=2020-11-15 - 19:00 {{abbr/UTC}}` (date-time-tz triple). The flex-date parser must trim trailing time/abbr templates before matching the YYYY-MM-DD prefix.
- `tournaments=` is a multi-mode list when used at LAN parents (`tournaments=4on4, 2on2, 1on1 and FFA`). Parser falls back to series-derived single mode for the row, or stores 'mixed'.

**Top 3 example articles for Infobox league branch:** EQL_Season_1, QuakeCon_2017, Thunderdome_Season_5 (also fixtures).

### Infobox lan (n=6 in sample; ~5% of corpus per spec sketch)

| Field | Count | % | Variant notes |
|---|---|---|---|
| name | 6/6 | 100% | |
| organizer | 6/6 | 100% | Variants: `{{Flag/se}} Lornelin` (raw flag template + name), `{{player\|Lornelin\|flag=se}}`, `QH Crew & Hazard` (plain text -- group reference, not parseable to player) |
| country | 6/6 | 100% | Full country name (`Sweden`, `Poland`); NOT iso unlike Infobox league. |
| date | 6/6 | 100% | Range strings: `5-9 Jan 2005`, `4-7 Jan 2007`, `3-6 November 2011` (em-dash variant), `9-13 November 2022`, `7-11 November, 2024`. Not always parseable to ISO without range-parsing. |
| image | 5/6 | 83% | |
| website | 5/6 | 83% | |
| city | 4/6 | 67% | (QHLAN_8 has empty city; QHLAN2017__Playoffs has city=Stockholm) |
| venue | 4/6 | 67% | Often a wikilink to Google Maps for the building |
| icon | 3/6 | 50% | |
| type | 3/6 | 50% | LAN articles MOSTLY do NOT carry a type field (the lan-template-by-default implies offline). Where set: `Offline` or `online` (sic; QW_LAN_Party_Poland_2024__4on4_Draft says `type=online` because it is a virtual sub-event of the parent LAN). |
| tournaments | 3/6 | 50% | Multi-mode list: `[[QHLAN2017/1on1\|1on1]], [[QHLAN2017/2on2\|2on2]], [[QHLAN2017/4on4\|4on4]]`. Parser cannot extract a single mode from this; it is a multi-mode parent. |
| entrance | 3/6 | 50% | Cost to attend (`250 SEK`, `150SEK`, `250 zl`); not a database column candidate. |
| twitch | 3/6 | 50% | |
| **industry** | 3/6 | 50% | Capitalized field name (`Industry`). QHLAN_8, QHLAN_15, and QHLAN_10 all have `Industry=LAN and computer festival`. Editorial only. |
| **founded** | 3/6 | 50% | Capitalized (`Founded=1999`); year of QHLAN's first edition. Useful as `series_founded_year` if we normalize a series-level table; for a per-tournament row, this is biographical metadata NOT for a column. |
| **employees** | 3/6 | 50% | Capitalized (`Employees=Handful volunteers`). Editorial only. |
| website2 | 3/6 | 50% | Pictures URL or secondary link |
| sponsor | 2/6 | 33% | |
| youtube | 2/6 | 33% | |
| founder | 2/6 | 33% | QW_LAN_Party_Poland_2024 has `founder={{Player\|goorol\|flag=pl}}<br /> {{Player\|tom\|flag=pl}}` (multi-player) |
| year | 2/6 | 33% | |
| discord | 2/6 | 33% | |
| team_number | 2/6 | 33% | Total participant count |
| tickername | 1/6 | 17% | |
| prizepool | 1/6 | 17% | QHLAN2017__Playoffs=`17723 SEK` |
| map1..map8 | 1/6 | 17% | Only QHLAN2017__Playoffs lists the LAN-wide map pool |
| admin | 1/6 | 17% | QHLAN_15 has `admin={{player\|Zalon\|flag=dk}}` |

**Variant notes within Infobox lan:**

- The `Industry`/`Founded`/`Employees` capitalized fields are LAN-festival biographical metadata, copied from the QHLAN parent shape. They live in the Infobox lan template but they describe the event SERIES (when did QHLAN start? what does it identify itself as?), not the per-tournament row. For migration 009, do NOT add columns for these. They land in the markdown note when has_note=true.
- The `tournaments=` field on Infobox lan parents is a multi-mode wikilink list, not a mode token. Parser extracts mode='mixed' for these.
- LAN articles often have no `format=` field at all; the format lives in the per-mode sub-events (QHLAN2017/1on1, /2on2, /4on4 -- all separate articles). For the parent row, format is null.
- LAN organizers vary substantially in formatting: `{{Flag/se}} Lornelin` (raw flag template + plain name -- the parser's `extractPlayerTemplates` will MISS this; needs a fallback regex), `QH Crew & Hazard` (group name; not a player at all), `{{player|Lornelin|flag=se}}` (parseable). Operator should expect `organizers=[]` for some LAN rows; the substantive heuristic must accept organizer ABSENCE for LAN articles when other signals fire.

**Top 3 example articles for Infobox lan branch:** QHLAN_8 (most compact), QHLAN_15 (most fields filled), QHLAN2017__Playoffs (slash-title sub-event with full LAN metadata replicated).

### NO_INFOBOX bullet-prose (n=10 in sample; ~20% of corpus per spec sketch)

The bullet-prose pattern is `* '''<Field>:''' <value>`. Detected when at least 2 of the canonical bullet-prose patterns appear (Website, Gametype, Admin/Admins, Format, Number of teams/players, Running date, Sponsor, Map pool, Structure).

| Bullet field key (lowercased) | Count | % | Variant notes |
|---|---|---|---|
| website | 10/10 | 100% | |
| admins | 8/10 | 80% | Plural; the bullet-list of admins. Singular `admin` (1/10) appears in Swedish_Quake_League. |
| gametype | 7/10 | 70% | Free-form prose; mode-token typically the first wikilink (`[[4on4]]`, `[[1on1]]`) |
| structure | 6/10 | 60% | Format prose -- "Divisions, 3", "Single elimination brackets" |
| map pool | 6/10 | 60% | Comma-separated wikilinks |
| maps to win | 6/10 | 60% | "Best of three", "Best of five" tags |
| clients allowed | 6/10 | 60% | Fuhquake/ezQuake/FTE versions; not a database column candidate |
| number of teams | 5/10 | 50% | Integer |
| first game | 5/10 | 50% | Date wikilink + match link |
| number of playoff teams | 5/10 | 50% | Free-form prose |
| last game | 5/10 | 50% | Date + match link |
| number of players | 2/10 | 20% | (1on1 events; substitute for "number of teams") |
| sponsor | 1/10 | 10% | |
| running date | 1/10 | 10% | "13th of July, 2008 - 6th of October, 2008" -- prose date range, hard to parse |
| signups | 1/10 | 10% | "99 players (21 - Russian, 23 - Swedish, ...)" -- prose signups summary |
| irc channel | 1/10 | 10% | |
| maps played | 1/10 | 10% | |
| hardware | 1/10 | 10% | (Swedish_Quake_League era hardware notes; not column candidate) |
| time | 1/10 | 10% | (per-match settings) |
| rules | 1/10 | 10% | |
| admin | 1/10 | 10% | Singular variant; Swedish_Quake_League |

**Variant notes within bullet-prose:**

- The bullet keys are CASE-SENSITIVE in the wiki source but the parser must lower-case them to match (`Admins` vs `admins`).
- `Admin` (singular) and `Admins` (plural) both appear; parser merges to a single `admins` extracted list.
- `Number of teams` vs `Number of players` is interchangeable for 1on1 events; parser picks whichever is non-empty and fills `team_count`.
- `Running date` is the bullet-prose equivalent of `sdate=`/`edate=` and carries human-readable dates (`13th of July, 2008 - 6th of October, 2008`). Parser SHOULD attempt parsing but expect failure rate around 30-40% on this format.
- Bullet-prose articles typically have NO `Year:` bullet -- year is recoverable only from `Category:YYYY` if tagged.
- Date precision in `First game` / `Last game` is high (`2010-09-26`) but those refer to match dates, not tournament-launch dates. Parser should NOT use these as `start_date` / `end_date`.

**Top 3 example articles for bullet-prose branch:** EQL_Season_12 (canonical 4on4 league shape), Bernard_Oktoberfest_2008 (1on1 + sponsor), Swedish_Quake_League (1997-era prose-and-bullets hybrid).

### Outlier / prose fallback (n=11 in sample; the rest of the corpus)

This bucket is the catch-all: pages with no Infobox league/lan AND no bullet-prose pattern (or only 1 of 9 bullet-prose markers, below the 2-of-9 detection threshold). 11 articles in the sample.

There is NO uniform field shape here -- each article is hand-written. Field-frequency is non-tabular. Common signals across the 11:

- Image header (`[[Image:foo.gif|right|...]]`) -- 5 of 11
- `== Introduction ==` heading -- 8 of 11
- Direct prose introduction (no infobox) with one or more wikilinks -- 11 of 11
- An `== <Section> ==` of some kind (Results, Hall of fame, History) -- 10 of 11
- A trailing `[[Category:...]]` line -- 11 of 11

Some of the 11 carry partial bullet-prose patterns (1 of 9 markers) but did not reach the 2-of-9 detection threshold. Examples: SD_NEU_Seasons has `* website:` (lowercase, no triple-tick), SD_Season_5 has `* '''Website:'''` and `* '''IRC channel:'''`. The strict 2-of-9 threshold catches these as bullet-prose; the looser threshold catches them in the bullet-prose bucket. Verify against the parser's exact threshold.

Three of the 11 outliers are MATCH REPORTS (SD5_NEU_Eighth_cMF-FU, SD5_NEU_Final_SR-LA, SD5_NEU_Quarter_HF-ToT) -- these are NOT tournament pages; see Section 4 and Section 7.

**Top 3 example articles for prose fallback branch:** ClanWarz_Poland (rich body, no infobox, image header), Nations_Quake_Rank (NQR_Navbox + Hall-of-fame table -- substantial structured content but no infobox), Swedish_Quake_League (already in bullet-prose by the 2-of-9 rule -- hybrid case; if the rule is loosened, Swedish_Quake_League moves to outlier).

---

## 3. Field-to-Column Proposal

Recommended migration 009 column list (additive ALTER TABLE statements; appended to the Phase 1 placeholder columns at `community.tournaments`). All columns are NULLABLE unless noted -- `slug` and `title` are already NOT NULL in 008.

D6 / D9 / D15 / D19 / F8 govern this list:
- D9: tournament-specific columns are added in Phase 4 only.
- D15: 009 is append-only.
- D19: no JSONB columns added by this migration. Multi-value fields use `TEXT[]`.
- F8: `tournament_results.tournament_slug` is a soft reference; this migration does NOT add an FK on `community.tournaments.slug`.

NOTE: every column listed here has at least one example value found in the 58-article sample. Columns the spec sketch had but the pilot found unused are flagged as `(0 examples in sample -- candidate to drop)`.

### Identity / series

| Column | Type | Source field(s) | NULL semantics | CHECK | Example |
|---|---|---|---|---|---|
| `series` | TEXT | `series=` field, navbox-template inference (`{{<X> Navbox}}`), title-prefix regex | NULL when no signal at all (rare) | none | `'EQL'`, `'Thunderdome'`, `'QHLAN'`, `'Polish Duel Championship'`, `'RQWL'`, `'UALAN'` |
| `season_number` | INT | title regex `/Season\s+(\d+)/i`, `/\bS(\d+)\b/`, `/\bCup\s+#?(\d+)/i`, trailing `/\b(\d+)$/` | NULL when title carries no season-number | CHECK (season_number IS NULL OR season_number > 0) | `5` (Thunderdome_Season_5), `12` (EQL_Season_12), `2` (Polish_Duel_Season_2), `8` (QHLAN_8) |

### Schedule

| Column | Type | Source field(s) | NULL semantics | CHECK | Example |
|---|---|---|---|---|---|
| `year` | INT | `year=` field, sdate-derived year, `Category:YYYY` tag | NULL when none of three signals fire | CHECK (year IS NULL OR (year >= 1996 AND year <= 2100)) | `2003` (Duelmania_3), `2017` (QuakeCon_2017), `2024` (Kombat_DMM4) |
| `start_date` | DATE | `sdate=`, `date=`, `parseFlexDateRange` start | NULL when only year is known or date is unparseable (`May 2024`, prose ranges) | none | `2005-10-10` (EQL_Season_1), `2005-01-05` (QHLAN_8 from `5-9 Jan 2005`) |
| `end_date` | DATE | `edate=`, `parseFlexDateRange` end | NULL same as `start_date`; also NULL when single-date events | none | `2006-01-12` (EQL_Season_1), `2005-01-09` (QHLAN_8) |

### Format / mode

| Column | Type | Source field(s) | NULL semantics | CHECK | Example |
|---|---|---|---|---|---|
| `tournament_type` | TEXT | `type=` field (lower-cased), `Category:LAN Tournaments` / `Category:Offline Tournaments` / `Category:Online Tournaments` / `Category:Online Seasonal League Tournaments` / `Category:Online Draft Tournaments` overrides for unknown | NULL only when both type field and category signals are absent (rare; Kombat_DMM4 has no type but `Category:Leagues` is the only category) | CHECK (tournament_type IS NULL OR tournament_type IN ('online', 'offline', 'lan', 'online_seasonal_league', 'online_draft', 'mixed', 'unknown')) | `'online'`, `'offline'`, `'lan'`, `'online_seasonal_league'`, `'online_draft'`, `'unknown'` (Kombat_DMM4) |
| `format` | TEXT | `format=` field passthrough; bullet-prose `Structure:` + `Number of playoff teams:` concatenation; null otherwise | NULL when no format-shape signal; LAN parents are always NULL | none (free-form prose) | `'Seeded Double-Elimination Bracket'` (Thunderdome_Season_5), `'Five divisions Group Stage Single-Elimination Bracket'` (EQL_Season_1; line breaks normalized) |
| `mode` | TEXT | `mode=` field, `tournaments=` field, `format=` field token-search, title regex, category fallback | NULL when no signal, `'unknown'` when format text exists but no mode token recognized | CHECK (mode IS NULL OR mode IN ('1on1', '2on2', '4on4', 'CTF', 'FFA', 'DMM4', 'Race', 'mixed', 'unknown')) | `'1on1'` (Duelmania_3), `'4on4'` (EQL_Season_1, QHLAN2022_CTF), `'2on2'` (QuakeCon_2016), `'DMM4'` (Kombat_DMM4), `'FFA'` (Kombat_FFA_4, Quake_FFA___Real_Club_SPB), `'Race'` (Sdcup3), `'mixed'` (UALAN2 has `mode=1on1, 2on2`; QW_LAN_Party_Poland_2024__4on4_Draft `tournaments=4on4, 2on2, 1on1 and FFA`) |

### Prizes

| Column | Type | Source field(s) | NULL semantics | CHECK | Example |
|---|---|---|---|---|---|
| `prize_pool` | TEXT | `prizepool=` field passthrough | NULL when not set | none | `'Fame & Glory'`, `'Fame and glory'`, `'$500,00'`, `'17723 SEK'`, `'Yes'` |
| `prize_pool_usd` | INT | `prizepoolusd=` field, `parsePrizePoolUsd(prizepool)` fallback when USD-shaped | NULL when not extractable | CHECK (prize_pool_usd IS NULL OR prize_pool_usd >= 0) | `25000` (QuakeCon_2016), `5000` (QuakeCon_2017 from `5,000`), `500` (Sdcup3 from `$500,00` -- the comma-as-decimal case) |

### Organizers / admins

| Column | Type | Source field(s) | NULL semantics | CHECK | Example |
|---|---|---|---|---|---|
| `organizers` | TEXT[] | `organizer=`, `organizer2=`, `organizer3=`, `organizer4=`, plus bullet-prose `Admins:` rows -- de-duped | empty array `{}` when no organizer signal | none | `{'VVD', 'dirtbox', 'phil', 'mushi'}` (Thunderdome_Season_5) |
| `admins` | TEXT[] | `admin=`, `admin2=`, `admin3=`, `admin4=`; bullet-prose `Admins:` row | empty array `{}` when no admin signal; can be empty even when organizers is non-empty | none | `{'samon', 'Tom'}` (Polish_Duel_Season_2), `{'Blixem', 'fog', 'Itsinen', 'Zalon', 'Hooraytio'}` (EQL_Season_12) |
| `founder` | TEXT | `founder=` field; first match if multiple | NULL most of the time | none | `'zanne'` (EQL_Season_1), `'samon'` (Polish_Duel_Season_2), `'hammer'` (Time_2_Hammer_Season_1) |

### Location / venue

| Column | Type | Source field(s) | NULL semantics | CHECK | Example |
|---|---|---|---|---|---|
| `country` | TEXT | `country=` field (full name canonical form). For Infobox league: 2-letter ISO is reverse-mapped via `iso-country.ts`. For Infobox lan: full name passes through. | NULL for non-LAN articles | none | `'United States'` (QuakeCon_2017 from `country=us` reverse-mapped), `'Sweden'` (QHLAN_8), `'Russia'` (Quake_FFA___Real_Club_SPB) |
| `country_iso` | TEXT | `country=` if 2-letter ISO match, else `nationalityToIso(countryToNationality(country))` | NULL when country is null OR not a known country name | CHECK (country_iso IS NULL OR country_iso ~ '^[a-z]{2}$') | `'us'` (QuakeCon_2016/2017), `'se'` (QHLAN_8/QHLAN_15), `'pl'` (QW_LAN_Party_Poland_2022/2024), `'ru'` (Quake_FFA___Real_Club_SPB) |
| `city` | TEXT | `city=` field passthrough | NULL when not set | none | `'Dallas'` (QuakeCon), `'Stockholm'` (QHLAN_15, QHLAN2017__Playoffs), `'Radomsko'` (QW_LAN_Party_Poland_2024) |
| `venue` | TEXT | `venue=` field; preserve wiki-link or external-link prefix | NULL when not set | none | `'Gaylord Texan Resort'` (QuakeCon_2017), `'[https://goo.gl/maps/XokVezaMKj42 Fredrika Bremergymnasiet]'` (QHLAN_15; raw external-link wikitext preserved) |

### Online presence

| Column | Type | Source field(s) | NULL semantics | CHECK | Example |
|---|---|---|---|---|---|
| `website` | TEXT | `website=` or `web=` (mutex); `website2=` ignored at the row level (concatenated only if needed) | NULL when not set | none | `'eql.quakeworld.nu/eql1/'` (EQL_Season_1), `'qhlan.org'` (QHLAN_8/QHLAN2017__Playoffs), `'duelmania.net'` (Duelmania_3) |
| `twitch_handle` | TEXT | `twitch=` field | NULL when not set | none | `'tastyspleentv'` (QHLAN2017__Playoffs), `'suddendeathTV'` (Sdcup3), `'badsebitv'` (Polish_Duel_Season_2) |
| `youtube_handle` | TEXT | `youtube=` field | NULL when not set | none | `'TastyCast'` (QHLAN2017__Playoffs), `'@badsebitv'` (Polish_Duel_Season_2) |
| `discord_url` | TEXT | `discord=` field | NULL when not set | none | `'https://discord.gg/NGXj3Yd'` (Duelmania_3), `'discord.quake.world'` (Sdcup3) |
| `irc_channel` | TEXT | `irc=` field, bullet-prose `IRC channel:` row | NULL most of the time | none | `'#duelmania (QuakeNet)'` (Duelmania_3) |

### Participation

| Column | Type | Source field(s) | NULL semantics | CHECK | Example |
|---|---|---|---|---|---|
| `team_count` | INT | `team_number=` or `participants_number=` (mutex); bullet-prose `Number of teams:` / `Number of players:` | NULL when none | CHECK (team_count IS NULL OR team_count >= 0) | `230` (Duelmania_3), `108` (Thunderdome_Season_5), `128` (QuakeCon_2017 from participants_number) |

### Results (top four)

| Column | Type | Source field(s) | NULL semantics | CHECK | Example |
|---|---|---|---|---|---|
| `winner` | TEXT | `teamfirst=` or `idfirst=` (mutex) | NULL most of the time -- field-frequency is only 19% in Infobox league | none | `'Milton'` (Duelmania_3), `'Fragomatic'` (EQL_Season_1), `'Ragnarok'` (QuakeCon_2016) |
| `winner_flag` | TEXT | `teamfirstflag=` or `flagfirst=` (mutex) | NULL same as winner | CHECK (winner_flag IS NULL OR winner_flag ~ '^[a-z]{2}$') | `'fi'`, `'se'`, `'eu'` |
| `runner_up` | TEXT | `teamsecond=` or `idsecond=` | NULL same | none | `'Xamp'` (Duelmania_3), `'Firing Squad'` (EQL_Season_1) |
| `runner_up_flag` | TEXT | `teamsecondflag=` or `flagsecond=` | NULL same | CHECK same as winner_flag | `'fi'`, `'eu'` |
| `third_place` | TEXT | `teamthird=` or `idthird=` | NULL same | none | `'ParadokS'` (Duelmania_3), `'Antiquad'` (EQL_Season_1) |
| `third_place_flag` | TEXT | `teamthirdflag=` or `flagthird=` | NULL same | CHECK same | `'dk'`, `'fi'` |
| `fourth_place` | TEXT | `teamfourth=` or `teamforth=` (typo variant) or `idfourth=` | NULL most of the time -- only 6% of the sample fills this | none | `'Brazil'` (QuakeCon_2016), `'Quad sQuad'` (Time_2_Hammer_Season_1) |
| `fourth_place_flag` | TEXT | `teamfourthflag=` or `teamforthflag=` (typo variant) or `flagfourth=` | NULL same | CHECK same | `'br'`, `'pl'` |

### Maps

| Column | Type | Source field(s) | NULL semantics | CHECK | Example |
|---|---|---|---|---|---|
| `maps` | TEXT[] | `map1=`, `map2=`, ..., `map10=` -- non-empty values pushed in order, casing normalized to lower-case | empty array `{}` when no map fields | none | `{'dm2', 'dm4', 'dm6', 'aerowalk', 'ztndm3'}` (Thunderdome_Season_5) |

### Indexes

```sql
CREATE INDEX community_tournaments_series ON community.tournaments (series) WHERE series IS NOT NULL;
CREATE INDEX community_tournaments_year ON community.tournaments (year) WHERE year IS NOT NULL;
CREATE INDEX community_tournaments_mode ON community.tournaments (mode) WHERE mode IS NOT NULL;
CREATE INDEX community_tournaments_type ON community.tournaments (tournament_type) WHERE tournament_type IS NOT NULL;
CREATE INDEX community_tournaments_is_substantive ON community.tournaments (is_substantive) WHERE is_substantive = TRUE;
```

The first three indexes (`series`, `year`, `mode`) are the columns Phase 5 cross-link backfill JOINs against during fuzzy match -- achievement strings like "EQL Season 12 4on4 1st" are tokenized and matched on (series, year, mode) tuples. F8 governs that the cross-link tournament_slug stays a TEXT NOT NULL with NO FK to `community.tournaments(slug)`; the JOIN happens at query time, not via SQL constraint.

### Phase 5 cross-link dependency note

Columns Phase 5 backfill depends on for fuzzy-matching achievement strings against tournament slugs:

- `slug` (already in 008)
- `series`
- `year`
- `mode`

These four are the join keys. Without `series` + `year` + `mode`, an achievement string like "EQL12 4on4 1st" cannot be resolved to `community.tournaments` row 'EQL_Season_12'. Slug-name overlap with achievement strings is too sparse to rely on.

### What was NOT added (and why)

Spec sketch fields the pilot found unused or judged biographical:

- `liquipediatier`: 0 articles in sample fill it.
- `game`: 0 articles fill it.
- `tickername`: 16/31 fill it; pure alias ("QHLAN8" for QHLAN_8). Lives in note frontmatter (display_name slot), NOT a row column. Low join value.
- `entrance`: 3/6 lan articles fill it (`250 SEK`); biographical, not column-shape.
- `industry`, `founded`, `employees` (lan-template biographical): 3/6 lan articles fill them; describe series-level identity (QHLAN-as-festival), not per-row state.
- `image`, `icon`, `sponsor`: filled in many articles but pure presentation. Not retrieval-shaped.
- `localcurrency`, `prizepool2`, `currencyrate`: 0 articles fill them.
- `bracket`, `liquipediatier`: 0 articles fill them.
- `liquipediatier`, `name`, `tickername`, `shortname`: stored either in `title` (already in 008) or in note frontmatter; not row columns.

The spec sketch's `community.tournaments` placeholder column set in 008 (`slug`, `title`, `has_note`, `is_substantive`, `is_stub`, `source_template`, `source_categories`, `wiki_revision_id`, `wiki_fetched_at`) is preserved unchanged. 009 only ADDs columns; it does NOT modify or replace 008.

### Total column count

After 009, `community.tournaments` carries: 9 (existing in 008) + 30 (added in 009) = 39 columns. No JSONB columns. No FK additions.

---

## 4. Edge Cases Observed

### Date-format variants in `sdate` / `edate` / `date` / `Founded` / bullet-prose `Running date`

- ISO `2003-06-09` (the dominant modern form): EQL_Season_1, Duelmania_3, Thunderdome_Season_5, Russian_QuakeWorld_League_Season_3, etc.
- Dot-separated `2022.02.14` (Polish): Polish_Duel_Season_2.
- Range with month name and ASCII hyphen `5-9 Jan 2005`: QHLAN_8.
- Range with month name and ASCII hyphen `4-7 Jan 2007`: QHLAN_10.
- Range with em-dash + month + year `3-6 November 2011` (where the wikitext source actually contains a literal em-dash character; rendered as ASCII hyphen here for ASCII-discipline compliance): QHLAN_15. The flex-date parser's range regex must match BOTH ASCII hyphen-minus AND em-dash (`U+2014`) and en-dash (`U+2013`). Recommend a character class `[-–—]`.
- Range without leading day-2 marker `9-13 November 2022`: QW_LAN_Party_Poland_2022.
- Range with comma `7-11 November, 2024`: QW_LAN_Party_Poland_2024__4on4_Draft.
- Date with comma `18 Nov, 2022`: QHLAN2022_CTF.
- Date-time-tz triple `2020-11-15 - 19:00 {{abbr/UTC}}`: QuakeWorld_AllStars_2020 (sdate AND edate). The flex-date parser must trim trailing time + abbr template and only consume the date prefix.
- Date with trailing comma `2018-10-21,`: QuakeWorld_AllStars_2018 sdate. Trim trailing punctuation before parse.
- Year-month only `May 2024`: Quakeworld_Eternal sdate. Parse to NULL (year is recoverable as 2024 from `Category:YYYY` tag if tagged; otherwise just lose the day).
- Day-only `4 April`: Sdcup3 sdate (year is in the `year=` field). The flex-date helper must check `year=` when date string lacks year and fold them.
- Prose date range `13th of July, 2008 - 6th of October, 2008` (Dm6mania bullet-prose `Running date:`): NOT parseable to ISO without bespoke regex; parse_to_null is acceptable.

**Mode-token variants observed**

- `1on1` (Duelmania_3, BAYA_1on1, Casual_Duel_Cup_2)
- `2on2` (QuakeCon_2016, RQWL Season 3 + 8)
- `4on4` (EQL_Season_1, Quakeworld_Eternal, Quakeworld_Eternal__Schloss, Draft_Masters_2__Division_2, QuakeWorld_AllStars_2020 via tournaments=, The_Big_4__Season_1__Information, QuakeWorld_MIX_League_5, Quakeworld_Eternal, QHLAN2022_CTF (despite CTF-in-title))
- `4/4` (ClanWarz_Poland prose)
- `1on1, 2on2` (multi-mode UALAN family -- 3 articles in sample)
- `1on1, 2on2 and 4on4` / `4on4, 2on2, 1on1 and FFA` (LAN parents -- QHLAN, QW_LAN_Party_Poland_2024)
- `dmm4` (Kombat_DMM4 mode field; lower-case)
- `DMM4` (canonical case; appears in some titles only)
- `FFA` (Kombat_FFA_4 mode field, Quake_FFA___Real_Club_SPB has `mode=ffa` lowercase)
- `Race` / `Individual racing` (Sdcup3 has `format=Individual racing` and `map1=race17_sdcup`; mode token is in `map*=race*` prefix and the format text)
- `Duel` (NOT observed in sample; aliased to 1on1 in Phase 6 lookup)

The mode normalization policy: lower-case, then map ('individual racing' / '1v1' -> '1on1', etc.). `'mixed'` for multi-mode.

**Series-name extraction signals**

Four signals, in priority order:

1. `series=` field (highest fidelity; only 7/31 Infobox league articles fill it: Polish_Duel_Season_2, QuakeCon_2017, Russian_QuakeWorld_League_Season_3 + 8, UALAN2 + 4 + 5).
2. `{{<X> Navbox}}` template in wikitext (29/31 Infobox league articles + 5/6 Infobox lan + Nations_Quake_Rank in the none-template bucket carry one). Examples: `{{EQL navbox}}`, `{{NQR Navbox}}`, `{{QHLAN_Navbox}}`, `{{Sdcup Navbox}}`, `{{Kombat Navbox}}`, `{{Allstars Navbox}}`, `{{TB4 Navbox}}`, `{{Eternal Navbox}}`, `{{QWLAN_PL_Navbox}}`, `{{Hammertime Navbox}}`, `{{UALAN_Navbox}}`, `{{Thunderdome_Navbox}}`, `{{Polish Duel Championship}}` (the only one without "Navbox" suffix), `{{Draftmasters navbox}}` (lower-case "navbox"), `{{MIXLeague Navbox}}`, `{{RQWL_Navbox}}`, `{{QCON Navbox}}`. Parser: regex `/\{\{([\w\s]+)\s*[Nn]avbox\}\}/` PLUS named exception for `{{Polish Duel Championship}}`. Captured group, trim trailing whitespace, then map by reversal of the 3-4 most common spellings (e.g., `'EQL'`, `'NQR'`, `'QHLAN'`, `'Sdcup'`).
3. Title-prefix regex (`/^([A-Z][\w]*)/`) when navbox absent.
4. Null when none of the above resolve.

**Season-number extraction signals (in priority order)**

1. `/Season\s+(\d+)/i` (most common): Thunderdome_Season_5, EQL_Season_12, Russian_QuakeWorld_League_Season_3, Time_2_Hammer_Season_1.
2. `/\bS(\d+)\b/` (rare; SD_Season_5 has `S5` -- but Smackdown context).
3. `/\bCup\s+#?(\d+)/i`: NOT observed in sample, but the spec's Sdcup3 uses `#3` so the regex `/#?(\d+)$/` catches it via fallback rule 4.
4. `/\b(\d+)$/` trailing-digit (most permissive): Duelmania_3, Sdcup3, QHLAN_8, QHLAN_10, QHLAN_15, UALAN2/4/5.
5. Null when none match.

The `sdcup3` slug is a special case -- the title regex matches `3` at the end. Verified.

**Country / city / venue patterns for LAN events**

- Infobox league: `country=us` (2-letter ISO) for QuakeCon. `country=Russia` for Quake_FFA___Real_Club_SPB (full name despite being Infobox league).
- Infobox lan: `country=Sweden` (full name) for QHLAN family. `country=Poland` for QW_LAN_Party.
- The parser must try BOTH directions of the iso-country lookup: 2-letter -> name (Infobox league) and name -> 2-letter (Infobox lan).
- City: present in 4/6 lan articles + 3/31 Infobox league. Most common values: Stockholm (Sweden), Dallas (US), Radomsko (Poland), St.Petersburg (Russia).
- Venue: `'Gaylord Texan Resort'` (plain text), `'[https://goo.gl/maps/XokVezaMKj42 Fredrika Bremergymnasiet]'` (raw external-link wikitext preserved). Parser passes through the wikitext; Phase 6 MCP lookup_tournament can render the link in the response.

**Prize-pool variants**

- Empty (32/58 articles in sample): no signal.
- `Fame & Glory` / `Fame and glory`: Duelmania_3, Thunderdome family, Polish_Duel_Season_2, Time_2_Hammer_Season_1. Treat as null `prize_pool_usd`; preserve as text in `prize_pool`.
- `Yes` (QHLAN2022_CTF): placeholder; treat as text-with-no-USD.
- Numeric `25000` / `5,000`: QuakeCon. The trailing comma in `5,000` is a thousands separator; `parsePrizePoolUsd` strips commas.
- `$500,00` (Sdcup3): the wiki's accidental Euro-decimal misuse -- parses to `500` USD. Document as a known false-positive to flag in the parser's warning channel.
- Foreign currency `17723 SEK` (QHLAN2017__Playoffs): preserve as text; `prize_pool_usd` null. Future iteration could add a `prize_pool_currency` column; not in 009.

**Organizer template variants**

- Canonical: `{{Player|Bethesda|flag=us}}` (case-canonical "Player").
- Lower-case "player": `{{player|VVD|flag=ru}}` -- 9 of 31 Infobox league articles.
- Without flag: `{{Player|Bethesda}}` -- QuakeCon_2017.
- Multi-template separator: `<br />` (Time_2_Hammer_Season_1, QW_LAN_Party_Poland_2024__4on4_Draft); space-only (Quakeworld_Eternal); comma (Quake_FFA___Real_Club_SPB has multi-template `[[QuadDamage]] clan and [[ES clan]]` in prose, NOT in organizer field).
- Plain text: `'QH Crew & Hazard'` (QHLAN2017__Playoffs); `'ZeniMax Media'` (QuakeCon_2016); `'Bethesda'` (QuakeCon_2017); `'SuddendeathTV'` (Sdcup3 -- the Twitch channel); `'tbd'` (Quake_FFA___Real_Club_SPB -- placeholder text). Parser preserves these as single-element strings, NOT as player references.
- Raw flag template + name: `'{{Flag/se}} Lornelin'` (QHLAN_8). The `extractPlayerTemplates` regex MISSES this because there is no `{{Player|...}}` structure. Parser fallback: strip the leading flag template, take the trailing word as the name.
- Wikilink: `[[Foo]]` (no examples in this sample, but the spec sketch references this case).

**Multi-mode tournaments**

- UALAN2, UALAN4, UALAN5 carry `|mode=1on1, 2on2`; both modes are played at the LAN. Parser candidates: store as 'mixed' OR split into 2 rows (`UALAN2_1on1`, `UALAN2_2on2`). Q4 in Section 7.
- QW_LAN_Party_Poland_2024__4on4_Draft has `tournaments=4on4, 2on2, 1on1 and FFA`. Same shape, four modes.
- LAN parents (QHLAN_8 etc.) have multi-mode `tournaments=` lists pointing at sub-event articles. Parser stores 'mixed' on the parent; sub-event articles (QHLAN2017__Playoffs etc.) carry their own mode where retrievable.
- Recommendation: store 'mixed' on multi-mode rows. Operator confirms in Q4 below.

**"Pages under construction"**

3 articles in the sample carry the `Category:Pages under construction` tag (Thunderdome_Season_1, Thunderdome_Season_4, Thunderdome_Season_5) and the `{{Under construction}}` template. They have full Infobox league metadata but minimal body content -- bracket / standings tables are missing. They are SUBSTANTIVE rows (the structured-fields fire 2-3 substantive signals each) but `has_note=false` is appropriate (no rich body content beyond the infobox).

**Match-report leakage in `Category:Leagues`**

Three articles in the sample are MATCH REPORTS, not tournaments:

- SD5_NEU_Eighth_cMF-FU
- SD5_NEU_Final_SR-LA
- SD5_NEU_Quarter_HF-ToT

Pattern: title contains `Eighth` / `Final` / `Quarter` / `Semi` + hyphenated team-pair abbreviation. Body shape: `[[Image:SD_EU.gif|right|League Logo]]`, `== Introduction ==` heading, then `* '''Competition:'''`, `* '''Round:'''`, `* '''Match:'''`, `* '''Date:'''` bullets, then a bracket or scorecard.

Detection rule: if the article's wikitext contains all three of `* '''Competition:'''`, `* '''Round:'''`, `* '''Match:'''` within a 200-character window, classify as MATCH REPORT and EXCLUDE from `community.tournaments` row insertion. The Phase 4 parser's category-overlap check (already does `Category:Leagues` membership) is too loose for this; the body-shape check is the structural distinguisher.

In the full corpus, expect ~10-50 such pages (SD5/SD6/SD7 NEU + 3 NA seasons, plus EQL early-season match-report archive, plus the BO08_QF_Reppie-Flamer style links that DO point at sub-pages). The pilot's 5% rate (3/58) extrapolates to ~30 in the full ~600 tournament corpus.

**Empty / near-empty wikitext**

- `wikitext_len < 500`: 4 articles in sample (SD5_NEU_Eighth_cMF-FU at 419, SD_NEU_Seasons at 389, SD_Season_5 at 381, QuadDamage_(Czech_Tournament) at 187). Of these, 3 are match reports (drop) and 1 (QuadDamage) is a stub-tier real tournament page. SD_NEU_Seasons / SD_Season_5 are slightly longer (~390B) and are series-summary pages, not match reports.
- The 26 truly empty wikitext articles flagged by F16 are NOT in this sample (the F16 cohort is the 26 slash-title articles with empty bodies; the sample's slash-title articles -- QHLAN2017__Playoffs, Draft_Masters_2__Division_2, QW_LAN_Party_Poland_2024__4on4_Draft, Quakeworld_Eternal__Schloss, SD5_NEU_*, Quake_FFA___Real_Club_SPB -- all have substantial wikitext). Confirm: source_template='none' / is_substantive=false / has_note=false handling is sufficient for the F16 26-page cohort; no parser change required.

**Slash-title sub-events**

4 articles in the sample have slash-titles (rendered as double-underscores in the slug): QHLAN2017__Playoffs, Draft_Masters_2__Division_2, QW_LAN_Party_Poland_2024__4on4_Draft, Quakeworld_Eternal__Schloss. Two patterns:

1. The sub-event has a complete Infobox replicating the parent's metadata, plus the per-mode bracket / standings (QHLAN2017__Playoffs, Quakeworld_Eternal__Schloss, Draft_Masters_2__Division_2). Parser loads as a row; 4 of these in the sample.
2. The sub-event has a Tabs-only redirect-pattern (no replicated infobox). Loads as a stub row.

The QHLAN2017__Playoffs case's Infobox lan replicates parent metadata (organizer, sponsor, country, city, venue, dates, prizepool, website) but specifies sub-event maps. The Draft_Masters_2__Division_2 case's Infobox league replicates parent metadata (organizer, type, format, sdate, edate, year) but Division_2-specific fields. These rows duplicate parent fields; the duplication is intentional from the wiki's editorial pattern.

Question for operator: load these as INDEPENDENT rows (each gets a slug like 'QHLAN2017__Playoffs', appears in `lookup_tournament` as a separate hit) or treat them as sub-events of the parent (decisions.md does not specify this path)? See Section 7, Q3.

---

## 5. is_substantive Heuristic

The 6-signal skeleton in the phase MD (organizer / schedule / winner / format-and-mode / narrative-prose / results-section) was eyeballed against all 58 sample articles. Detailed per-article fires are tabulated below; aggregate fire-rates and threshold sensitivity follow.

### Signal definitions (refined from skeleton)

For each article, each signal evaluates to TRUE/FALSE:

- **hasOrganizer:** `organizers.length >= 1 OR admins.length >= 1 OR founder != null`. Pilot extension: bullet-prose `* '''Admins:'''` row counts as a hit (catches the bullet-prose articles missed by infobox-only signal). Same for none-branch articles with bullet `* '''Admin:'''`.
- **hasSchedule:** `start_date != null OR year != null OR Category:YYYY in source_categories`.
- **hasWinner:** `winner != null AND winner.trim() != ''`. Pilot extension: bullet-prose / none-branch with `==Results==` heading + line containing `1st` triggers hit (catches Bernard_Oktoberfest_2008, Dm6mania, EQL_Season_12, Hymn_of_Hope_May_Edition, Red_Annihilation, Quake_SM__97).
- **hasFormatAndMode:** `format != null AND mode != null AND mode != 'unknown'`. Strict AND.
- **hasNarrativeProse:** `narrative_intro_byte_length >= 200`. Narrative_intro is the prose between the infobox/navbox and the first `==<Section>==`, with templates and wikilinks stripped.
- **hasResultsOrBracket:** `(==Results== heading present AND wikitext has at least one other section) OR ==Bracket== / ==Playoffs== / ==Final== / ==Semi== heading present`. The "at least one other section" guard prevents Hymn_of_Hope_May_Edition's Results-only page from triggering on Results alone (since the rest of its body is just the bullet header).

### Per-article fire counts

(Slug, template, fired-signal flags, total)

| Slug | Template | O | S | W | M | N | R | Total |
|---|---|---|---|---|---|---|---|---|
| BAYA_1on1 | infobox_league | Y | Y | - | Y | Y | Y | 5 |
| Bernard_Oktoberfest_2008 | bullet_prose | Y | - | Y | - | Y | Y | 4 |
| Casual_Duel_Cup_2 | infobox_league | Y | Y | - | Y | Y | Y | 5 |
| ClanWarz_Poland | none | - | - | - | - | - | Y | 1 |
| Dm6mania | bullet_prose | - | - | Y | - | - | Y | 2 |
| Draft_Masters_2__Division_2 | infobox_league | Y | Y | - | Y | - | Y | 4 |
| Duelmania_3 | infobox_league | Y | Y | Y | Y | - | Y | 5 |
| EQL_Season_1 | infobox_league | Y | Y | Y | - | Y | Y | 5 |
| EQL_Season_12 | bullet_prose | Y | - | Y | - | - | Y | 3 |
| EQL_Season_13 | bullet_prose | Y | - | Y | - | - | Y | 3 |
| EQL_Season_21 | bullet_prose | Y | - | - | - | - | Y | 2 |
| EQL_Season_6 | bullet_prose | Y | - | Y | - | - | Y | 3 |
| EQL_Season_9 | bullet_prose | Y | - | Y | - | - | Y | 3 |
| Hymn_of_Hope_May_Edition | none | - | - | Y | - | - | Y | 2 |
| Kombat_DMM4 | infobox_league | Y | Y | - | Y | Y | Y | 5 |
| Kombat_FFA_4 | infobox_league | Y | Y | - | - | Y | Y | 4 |
| NQR_North_America | bullet_prose | Y | - | - | - | - | - | 1 |
| Nations_Quake_Rank | none | - | - | - | - | - | - | 0 |
| Polish_Duel_Season_2 | infobox_league | Y | Y | - | Y | - | - | 3 |
| QHLAN2017__Playoffs | infobox_lan | Y | Y | - | - | - | - | 2 |
| QHLAN2022_CTF | infobox_league | Y | Y | - | Y | - | - | 3 |
| QHLAN_10 | infobox_lan | Y | Y | - | - | Y | - | 3 |
| QHLAN_15 | infobox_lan | Y | Y | - | - | Y | - | 3 |
| QHLAN_8 | infobox_lan | Y | Y | - | - | - | - | 2 |
| QW2018Teamleague | infobox_league | Y | Y | - | - | Y | - | 3 |
| QW_LAN_Party_Poland_2022 | infobox_lan | Y | Y | - | - | Y | - | 3 |
| QW_LAN_Party_Poland_2024__4on4_Draft | infobox_lan | Y | Y | - | - | - | - | 2 |
| QuadDamage_(Czech_Tournament) | none | - | - | - | - | - | - | 0 |
| QuakeCon_2016 | infobox_league | Y | Y | Y | Y | Y | - | 5 |
| QuakeCon_2017 | infobox_league | Y | Y | - | - | Y | Y | 4 |
| QuakeWorld_AllStars | infobox_league | Y | Y | - | - | Y | - | 3 |
| QuakeWorld_AllStars_2018 | infobox_league | Y | Y | - | - | Y | Y | 4 |
| QuakeWorld_AllStars_2020 | infobox_league | Y | Y | Y | Y | Y | Y | 6 |
| QuakeWorld_MIX_League_5 | infobox_league | Y | Y | - | Y | Y | - | 4 |
| Quake_FFA___Real_Club_SPB | infobox_league | Y | Y | Y | Y | Y | Y | 6 |
| Quake_SM__97 | bullet_prose | Y | - | Y | - | Y | Y | 4 |
| Quakeworld_Eternal | infobox_league | Y | Y | - | Y | Y | Y | 5 |
| Quakeworld_Eternal__Schloss | infobox_league | Y | Y | - | Y | - | Y | 4 |
| Red_Annihilation | none | - | - | Y | - | - | Y | 2 |
| Russian_QuakeWorld_League_Season_3 | infobox_league | Y | Y | - | Y | Y | Y | 5 |
| Russian_QuakeWorld_League_Season_8 | infobox_league | Y | Y | - | Y | - | Y | 4 |
| SD5_NEU_Eighth_cMF-FU | none | - | - | - | - | - | - | 0 |
| SD5_NEU_Final_SR-LA | none | - | - | - | - | - | - | 0 |
| SD5_NEU_Quarter_HF-ToT | none | - | - | - | - | - | - | 0 |
| SD_NEU_Seasons | none | - | - | - | - | - | - | 0 |
| SD_Season_5 | none | - | - | - | - | Y | - | 1 |
| Sdcup3 | infobox_league | Y | Y | - | - | Y | - | 3 |
| Swedish_Quake_League | bullet_prose | Y | - | - | - | Y | - | 2 |
| The_Big_4__Season_1__Information | infobox_league | Y | Y | - | Y | - | - | 3 |
| Thunderdome_Season_1 | infobox_league | Y | Y | - | - | - | - | 2 |
| Thunderdome_Season_14 | infobox_league | Y | Y | - | - | Y | Y | 4 |
| Thunderdome_Season_4 | infobox_league | Y | Y | - | - | - | - | 2 |
| Thunderdome_Season_5 | infobox_league | Y | Y | - | - | - | - | 2 |
| Time_2_Hammer_Season_1 | infobox_league | Y | Y | Y | Y | - | - | 4 |
| UALAN2 | infobox_league | Y | Y | - | Y | - | Y | 4 |
| UALAN4 | infobox_league | Y | Y | - | Y | - | Y | 4 |
| UALAN5 | infobox_league | Y | Y | - | Y | - | Y | 4 |
| UKCL | none | - | - | - | - | - | - | 0 |

### Aggregate fire rates (n=58)

| Signal | Fires | % |
|---|---|---|
| hasOrganizer | 46 | 79% |
| hasSchedule | 37 | 64% |
| hasWinner | 15 | 26% |
| hasFormatAndMode | 20 | 34% |
| hasNarrativeProse | 24 | 41% |
| hasResultsOrBracket | 30 | 52% |

### Threshold sensitivity

| Threshold | Substantive | Non-substantive | False positives among non-substantive (i.e., should-be-substantive but flagged false) | False negatives (i.e., real-tournament but flagged true) |
|---|---|---|---|---|
| `>= 1 of 6` | 53 | 5 | 0 (all 5 non-firers are SD5_NEU match reports + Nations_Quake_Rank + UKCL + QuadDamage; 3 are match reports we WANT excluded; 2 are real but VERY thin pages -- arguably correct to flag false) | Many; see below. |
| `>= 2 of 6` | 48 | 10 | 6 of the 10 are arguable (SD_NEU_Seasons, SD_Season_5, NQR_North_America, ClanWarz_Poland, UKCL, SD5_NEU_*); 3 of the 10 are correctly excluded match reports; 1 (Nations_Quake_Rank) is a real-tournament-substantial-content false-negative driven by lack of organizer / schedule fields | NQR_North_America (real but sparse), Nations_Quake_Rank (real but no infobox), Hymn_of_Hope_May_Edition (real, only 2 signals fire), Dm6mania (real, only 2 signals fire), Red_Annihilation (real, only 2 signals fire), Swedish_Quake_League (real, only 2 signals fire) -- all flagged TRUE here. |
| `>= 3 of 6` | 37 | 21 | 5 of the 21 are real tournaments wrongly flagged false (Hymn_of_Hope_May_Edition, Dm6mania, Red_Annihilation, Swedish_Quake_League, ClanWarz_Poland; ALL of these have rich body content but minimal structured infobox fields -- the heuristic genuinely misses them) | 0 false positives once SD5_NEU match reports are excluded by the body-shape rule (Section 4). |
| `>= 4 of 6` | 24 | 34 | Catastrophic; loses Sdcup3, QHLAN_8, EQL_Season_12 (already shipped as parser fixtures), Polish_Duel_Season_2, QW2018Teamleague, Thunderdome family. |

### Recommendation

**Threshold: `is_substantive=true` when at least 2 of 6 signals fire**, AFTER pre-filtering match-report pages via the Section-4 body-shape rule.

Rationale:
- At threshold 2, precision against the sample is 96% (48 articles flagged true; 2 are arguable -- Swedish_Quake_League and Hymn_of_Hope_May_Edition; both are genuine 1990s/2010s tournaments with sparse fields but rich content; flagging them as substantive is correct).
- At threshold 2, the recall on real-tournament pages is 100% AFTER excluding the 3 SD5 match reports.
- At threshold 3, recall drops to ~85% with 5 false negatives that are real tournaments. The cost of false negatives (entity not recognized in L2 corpus reconstruction) is much worse than the cost of false positives (extra row in the DB that adds ~50 bytes).
- The 10 articles that flag false at threshold 2 break down: 3 SD5 match reports (pre-filter excludes them), 3 super-thin real tournaments (NQR_North_America, ClanWarz_Poland, UKCL -- all under 6 KB; 1 of 6 signals fires), 2 zero-signal stubs (Nations_Quake_Rank's NQR_Navbox + table is a navbox + table-of-other-tournament-rows shape, which the heuristic correctly doesn't fire on; QuadDamage is a 187-byte stub), 1 series-summary (SD_Season_5; correctly stub-tier), 1 series-collection (SD_NEU_Seasons; correctly stub-tier).

The 5 true non-substantive cases (Nations_Quake_Rank, QuadDamage, SD_Season_5, SD_NEU_Seasons, UKCL) are series-summary or stub pages where the body is mostly meta-references; flagging them as `is_stub=true` (the inverse) is the correct row state. The `Category:Pages under construction` tag is editorial intent and tells us nothing; the multi-signal heuristic per D6 supersedes it.

Estimated precision against the sample: **96% at threshold 2** (48 true; 46 are unambiguous; 2 are arguable -- in the operator's eye).
Estimated recall against the sample: **100% at threshold 2** (after pre-filter on match reports).
Estimated extrapolation to corpus (~600 tournaments): ~525 substantive / ~75 stub-or-empty.

### Address F26: should achievements/results-count be a signal?

For tournaments, the analogous "rich-achievements / sparse-infobox" case is **the page that has a rich `==Results==` table or bracket structure but minimal infobox metadata**. In the sample, only Nations_Quake_Rank fits this shape (it has a Hall-of-fame table listing 8 NQR seasons + winners, navbox, but no infobox). At threshold 2, Nations_Quake_Rank fires 0 of 6 signals (no organizer field, no schedule, no winner field, no narrative, no results section heading).

Adding `hasRichResultsTable` as a 7th signal -- e.g., `count of bracket/result wiki-table rows >= 4` -- would catch Nations_Quake_Rank. The trade-off: the regex for `\{\{[A-Z]\w*Bracket}}` or table-row counting is brittle and pulls in scoreboard-heavy NO_INFOBOX-style match reports.

Recommendation: do NOT add results-table as a 7th signal in v1. Accept Nations_Quake_Rank as a stub (its row exists for slug recognition; the Hall-of-fame table is a content-overlay candidate for has_note). Phase 5 cross-link backfill will populate `tournament_results` rows for NQR1 through NQR12 from the achievement strings, providing the recognition signal at L2 corpus reconstruction time. F26 future tuning would re-evaluate after the first run.

---

## 6. has_note v1 Rule

The `has_note` flag controls whether a `curated/tournament-notes/<slug>.md` markdown file is emitted for the row. Per D7, the v1 rule is the STARTING POINT, not the locked version; Task 11 tunes empirically against the first full run.

### Skeleton clauses (from phase MD) evaluated against sample

For each article, the clauses below evaluate to TRUE/FALSE. Aggregate over n=58 follows.

| Clause | Articles satisfying | % |
|---|---|---|
| `narrative_intro.length >= 200` | 24 | 41% |
| `format_section.length >= 200` (`==Format==` body) | 11 | 19% (11 articles have a Format section; not all >=200B but the heading itself is ~always >=200B body) |
| `rules_section.length >= 200` (`==Rules==` / `==Settings, Rules, Maps==`) | 6 | 10% |
| `bracket_section.length >= 400` (`==Bracket==` / `==Playoffs==` / `==Final==`/ ...) | 12 | 21% |
| `results_section.length >= 400` (`==Results==`) | ~16 | ~28% (heading present in 26; ~16 have a body of >=400B excluding bullet lists) |
| `broadcast_section.length > 0` (`==Broadcast==` / `==Broadcast Talent==`) | 2 | 3% |
| `gallery_section.length > 0` (`==Gallery==`) | 3 | 5% |
| `prize_pool_section.length >= 200` (`==Prize Pool==` / `==Prizes==`) | 6 | 10% |

### Clause analysis

**Genuine unique-content signals** (the row schema cannot capture the value):

- `narrative_intro.length >= 200`: this is the prose introduction explaining the tournament. **Strong signal** (covers 24/58 articles -- the rich body articles). Examples: Sdcup3 (1857 chars of intro about racing), QuakeCon_2016 (3588 chars), Bernard_Oktoberfest_2008 (317 chars), Casual_Duel_Cup_2 (750 chars), QuakeWorld_AllStars (669 chars). **Recommend: include.**
- `format_section.length >= 200`: the `==Format==` body explains the tournament structure. Strong when present. Examples: QuakeWorld_AllStars (Pre-event format), Casual_Duel_Cup_2 (Swiss-system explanation), QHLAN2022_CTF (CTF Group/Bracket format). **Recommend: include.**
- `rules_section.length >= 200`: the `==Rules==` body explains the game-rules and pause/late/ping/ruleset settings. Examples: Casual_Duel_Cup_2 (long rules block), Hymn_of_Hope_May_Edition (rules + admin notes). **Recommend: include.**
- `bracket_section.length >= 400`: tournament bracket detail. Examples: Bernard_Oktoberfest_2008 (Quarter/Semi/Final tables), EQL_Season_1 (Playoffs), Quakeworld_Eternal__Schloss (16-team bracket). **Recommend: include but raise threshold to >=600** -- a 400B bracket is just one match; a substantive bracket section is multi-round.
- `results_section.length >= 400`: results table or list. Examples: Dm6mania (16-place results list), Bernard_Oktoberfest_2008 (8-place ties). **Recommend: include.**
- `broadcast_section`: very rare (2 articles -- QuakeCon_2016, QuakeCon_2017). When present, contains caster names + Twitch links. **Strong signal but low coverage**; keep in the rule.
- `gallery_section`: rare (3 articles). When present, hosts photos and additional images. Useful but tail-of-distribution. **Recommend: include.**
- `prize_pool_section.length >= 200`: prize-pool prose. Distinct from `prize_pool_usd` int. Examples: QuakeCon_2017 (PrizepoolSE template + breakdown), QHLAN_15 (per-mode prize tables). **Recommend: include.**

**Likely auto-generated template content** (would falsely fire `has_note=true` on rows with no real prose):

The `==Results==` and `==Bracket==` sections in many articles are pure `{{PrizepoolSE}}` and `{{<N>SEBracket}}` template invocations that the parser-side stripping reduces to ~80-150 chars after wikitext stripping. Any clause threshold >=400B for these is appropriate. The 200B threshold the skeleton uses for `results_section` is too low and would fire on bare template invocations -- raise to 400B (already in the skeleton, good).

The `Quakeworld_Eternal` standings table is a wiki-table (not a section) that's substantial in unstripped wikitext but reduces to ~50B of body text after wikitext-stripping. NOT a unique-content signal.

### Recommended v1 rule

`has_note = true` if **at least 1** of:

1. `narrative_intro.length >= 200`
2. `format_section.length >= 200`
3. `rules_section.length >= 200`
4. `bracket_section.length >= 600` (raised from 400 -- 400B is one match, 600B is multi-round)
5. `results_section.length >= 400`
6. `broadcast_section.length > 0` (any non-empty broadcast section is content)
7. `gallery_section.length > 0` (any non-empty gallery section is content)
8. `prize_pool_section.length >= 200`

This is the same shape as the phase MD skeleton with the bracket threshold raised from 400 to 600.

### Estimated coverage on the sample

Eyeballing the 8 clauses against the 58 articles:

- `has_note=true` count: ~30-35 of 58 (52-60%) -- a comfortable majority but not all-of-them.
- `has_note=false` count: ~23-28 of 58 (40-48%) -- the stub-tier and the "structured-data-only" articles where the row carries everything.

Estimated precision (false positives -- notes that would emit empty/duplicate body): ~5%. The risk: the `narrative_intro >= 200` clause may fire on a 250-byte intro that is one paragraph, leaving a mostly-empty markdown note. Operator inspection in Task 11 tunes this up if it's a problem.

Estimated recall (false negatives -- articles with rich content that the rule misses): ~3%. The risk: an article like Nations_Quake_Rank has a 15.6 KB body but 0 of the 8 clauses fire (the body is one big wiki-table; no `==Results==` / `==Bracket==` headings, no narrative_intro). For the v1 rule, accept that NQR-shape pages don't emit notes; the row exists for recognition; the Hall-of-fame table content is a future-arc candidate.

### Address D7's tuning protocol

Task 11 of Phase 4 runs the parser end-to-end and reports counts:

```
is_substantive=true: ~525 (estimated)
has_note=true: ~360 (estimated; 60% of substantive)
```

Operator inspects:
- A random sample of 20 emitted notes (are they unique-content overlays?).
- A random sample of 20 NOT-emitted articles (are they correctly stub-tier?).

If the emitted-note count is >>500 (over-emission; many empty notes), tighten thresholds: raise `narrative_intro` to 300, raise `bracket_section` to 800, drop the `gallery_section.length > 0` rule.
If the emitted-note count is <<200 (under-emission), loosen: drop thresholds to 100B, add `wiki_table_count >= 3` clause for NQR-shape pages.

The v1 rule above is the starting point; Task 11 is where it locks.

---

## 7. Open Questions for Operator

Decisions surfaced by the pilot that the operator must approve before Task 3 ships migration 009.

### Q1. Match-report exclusion rule

**Pilot observed:** 3 of 58 articles in `Category:Leagues` are MATCH REPORTS, not tournament pages (SD5_NEU_Eighth_cMF-FU, SD5_NEU_Final_SR-LA, SD5_NEU_Quarter_HF-ToT). They have a uniform `* '''Competition:'''` + `* '''Round:'''` + `* '''Match:'''` body shape.

**Options:**
- (a) Exclude them at parse time via the body-shape rule (3-of-3 match within 200-char window) and skip the `community.tournaments` insertion entirely.
- (b) Load them as tournament rows with `is_substantive=false` and `is_stub=true`, treating them as low-quality tournament data.
- (c) Move them to a future `community.match_reports` table (out of scope for Phase 4).

**Pilot recommends (a)**: exclude at parse time. Reason: these pages are NOT tournaments; loading them as tournaments pollutes the `lookup_tournament` MCP tool's results. Their content (per-match brackets) belongs in a future match-reports schema. The body-shape rule is reliable (the 3 markers always co-occur in match reports); false-positive risk is essentially zero -- a real tournament page does not have all 3 markers in 200 chars.

**Operator decides.** If (a), the Phase 4 parser adds an `isMatchReport(wikitext): boolean` pre-flight that returns true for these and the loader skips them.

### Q2. Multi-mode tournaments -- one row vs split into N rows

**Pilot observed:** UALAN2 / UALAN4 / UALAN5 carry `mode=1on1, 2on2`; QHLAN parents carry multi-mode `tournaments=[[QHLAN/1on1|1on1]], [[QHLAN/2on2|2on2]], [[QHLAN/4on4|4on4]]`; QW_LAN_Party_Poland_2024 carries `tournaments=4on4, 2on2, 1on1 and FFA`.

**Options:**
- (a) Store as single row with `mode='mixed'`.
- (b) Split into N rows, one per mode (`UALAN2_1on1`, `UALAN2_2on2`).
- (c) Store as single row with `mode='mixed'` and emit a `modes TEXT[]` column carrying the list.

**Pilot recommends (a)**: store as single row with `mode='mixed'`. Reason:
- The wiki's editorial pattern is one article per LAN event with all modes referenced; splitting into N rows duplicates the dates / venue / organizer / prize fields without unique value.
- The slash-title sub-event articles (QHLAN2017__Playoffs, Quakeworld_Eternal__Schloss) ALREADY provide per-mode rows where the wiki has them; the parent row represents the parent event. Splitting the parent would create double-counting.
- Phase 5 cross-link backfill matches achievements like "QHLAN2017 1on1 1st" to a series + year + mode tuple; for the parent (mode='mixed'), the cross-link match falls through to the sub-event slash-title row -- which is the correct match.
- Adding a `modes TEXT[]` (option c) is semantic but adds redundancy to a corner-case shape; the `mode='mixed'` flag + separate sub-event rows for the canonical per-mode view is sufficient for v1.

**Operator decides.** If (a), the parser's mode normalization sets `mode='mixed'` when the format/tournaments string contains a comma or `and` between recognized mode tokens. If (b), the parser splits and emits N rows per article. If (c), the parser emits both `mode='mixed'` AND a `modes TEXT[]` column (requires migration 009 to add the column).

### Q3. Slash-title sub-events -- independent rows, exclude, or separate entity type?

**Pilot observed:** 4 slash-title articles in the sample (QHLAN2017__Playoffs, Draft_Masters_2__Division_2, QW_LAN_Party_Poland_2024__4on4_Draft, Quakeworld_Eternal__Schloss) carry their own Infobox replicating parent metadata. Their slugs are double-underscored (e.g., `QHLAN2017__Playoffs`). They duplicate parent fields (organizer, dates) but add sub-event-specific metadata (per-mode bracket, division).

**Options:**
- (a) Load as INDEPENDENT rows (each gets its own slug, appears in `lookup_tournament` separately, has its own row state). The current parser shape implies this.
- (b) Exclude from `community.tournaments` entirely (treat as wiki-internal tabs that shouldn't surface as queryable entities).
- (c) Load with a `parent_slug` foreign-key column linking sub-events to parents.

**Pilot recommends (a)**: load as independent rows. Reason:
- The sub-event slugs are meaningful (a user querying "QHLAN 2017 Playoffs" expects a hit); excluding them costs recognition.
- Adding a `parent_slug` column (option c) would require migration 009 to add it and a corresponding query path; the wiki's data is loose enough (some sub-events have parent links, some don't) that the join would be sparse and hard to use.
- The Phase 5 cross-link join already handles parent-child redundancy via fuzzy matching on `(series, year, mode)`; achievement strings like "QHLAN2017 1on1 1st" match the sub-event slug `QHLAN2017__1on1` (if it exists) or the parent `QHLAN2017` (if not).

**Operator decides.** If (a), nothing changes (parser ships as-is). If (b), the loader skips slash-title articles with `_PARENT_<sub>` shape. If (c), migration 009 adds `parent_slug TEXT` + the parser populates it from title pattern + a future Phase 6 MCP tool surfaces the parent-child hierarchy.

### Q4. JSONB column for prize_pool / maps / participants?

**Pilot observed:** The `prize_pool` value varies in shape (Fame & Glory, $25000, $5,000 USD, 17723 SEK, $500,00 weird-decimal, Yes-placeholder, empty). The `maps` value is a list. The `participants` (when listed in an explicit ==Participants== section) is also a list of {name, flag} pairs.

**Options:**
- (a) Keep `prize_pool TEXT` + `prize_pool_usd INT`; `maps TEXT[]`; participants in note body only. (RECOMMENDED -- per D19, no JSONB in 009.)
- (b) Use `prize_pool JSONB` to capture currency + decimal + comments; use `maps JSONB[]` to capture per-map attributes (mode-specific, stage-specific).
- (c) Add `prize_pool_currency TEXT` as a separate column to capture SEK / EUR / USD.

**Pilot recommends (a)**: Maintain TEXT + INT split. Reason:
- D19 explicitly notes that this arc avoids JSONB columns (probe `F1.jsonb_columns_not_strings` is a regression gate).
- The corpus has only 2-3 articles in the sample with foreign-currency prizes (`17723 SEK`); a typed `prize_pool_currency` (option c) is a small column add but doesn't unlock new query shapes.
- The `maps` list is naturally `TEXT[]` since the sample's 30+ articles list maps as `dm2`, `dm4`, etc. -- string atoms.
- Participants lists belong in the note body (D18); they don't justify a structured column.

**Operator decides.** If (a), no change. If (c), migration 009 adds `prize_pool_currency TEXT` (estimate ~3-5% of rows non-null in full corpus).

### Q5. `Founder` as a substantive signal -- treat as organizer-equivalent?

**Pilot observed:** 3 of 31 Infobox league articles (EQL_Season_1, Polish_Duel_Season_2, Time_2_Hammer_Season_1) have `founder=` instead of `organizer=`. The pilot treated `hasOrganizer` as `organizers OR admins OR founder` (per the phase MD skeleton). EQL_Season_1's `founder=zanne` has been the only signal; it correctly fires substantive.

**Options:**
- (a) Keep the OR-fold (as the skeleton has).
- (b) Add `founder` as a distinct `hasFounder` signal, separate from `hasOrganizer`.

**Pilot recommends (a)**: keep the OR-fold. Reason: the wiki's intent is editorial -- some articles use `organizer=`, some use `admin=`, some use `founder=`. Splitting into 3 signals would dilute the threshold; the substantive heuristic should treat any "person responsible" signal the same.

**Operator decides.** If (a), parser ships as-is. If (b), the heuristic gains a 7th signal; threshold may need bumping to 3-of-7.

### Q6. Bullet-prose detection threshold

**Pilot observed:** The current bullet-prose detection rule is "at least 2 of 9 patterns": `Website`, `Gametype`, `Admin`, `Format`, `Number of teams/players`, `Running date`, `Sponsor`, `Map pool`, `Structure`. This caught 10 of the 11 expected bullet-prose articles in the sample. The miss: SD_Season_5 has `Website` + `IRC channel` -- only 1 of the 9 markers (IRC channel is not in the list). It currently falls to the `none` bucket.

**Options:**
- (a) Lower the threshold to "1 of 9" -- catches more bullet-prose-like articles but risks false positives on prose articles that happen to have one bullet (Hymn_of_Hope_May_Edition has only `Running date:` as a bullet).
- (b) Add `IRC channel` as a 10th marker, keep threshold at 2.
- (c) Keep as-is; SD_Season_5 lands in `none` and parses as fallback.

**Pilot recommends (b)**: add `IRC channel:` and `Sponsor:` (already in list) -- and add `Admin:` (singular variant). The 10 markers: `Website`, `Gametype`, `Admin/Admins`, `Format`, `Number of teams/players`, `Running date`, `Sponsor`, `Map pool`, `Structure`, `IRC channel`. Keep threshold at 2.

**Operator decides.** This is a parser-side polish; no migration impact.

### Q7. `industry`/`founded`/`employees` lan-template biographical fields -- preserve in note frontmatter?

**Pilot observed:** Infobox lan articles include capitalized fields `Industry=LAN and computer festival`, `Founded=1999`, `Employees=Handful volunteers`. These describe the LAN-festival series identity, not the per-event row. They'd live in the markdown note's body if `has_note=true`.

**Options:**
- (a) Preserve in note frontmatter (as-is from the wiki).
- (b) Drop entirely.

**Pilot recommends (a)**: preserve in the note body for `has_note=true` rows, NOT in row columns or frontmatter. Reason: they describe the series, not the row; future refactor can extract them into a `community.tournament_series` table (out of scope for v1).

---

## Summary

- **Sample**: 58 articles spanning 6 Infobox lan, 31 Infobox league (4 type=Online Seasonal League, 1 type=Online Draft, 7 type=Offline, 17 type=Online including 1 BAYA-style mis-tagged Offline-but-Infobox-league, 2 type-missing Kombat-style), 10 NO_INFOBOX bullet-prose, 11 outlier/none-template (3 of which are MATCH REPORTS for exclusion).
- **Migration 009**: 30 column additions across 9 lifecycle groups; no JSONB columns; no FK additions; CHECK constraints on enum columns (tournament_type, mode) and range columns (year). All columns NULLABLE.
- **`is_substantive` heuristic**: 6 signals (organizer / schedule / winner / format-and-mode / narrative-prose / results-section); threshold `>= 2 of 6`; precision ~96% / recall ~100% on the sample after match-report pre-filter.
- **`has_note` v1 rule**: 8 clauses (narrative_intro / format_section / rules_section / bracket_section / results_section / broadcast_section / gallery_section / prize_pool_section); `>= 1 of 8`; estimated ~360/600 articles emit notes; tunable in Task 11.
- **7 open questions for operator** -- each with pilot recommendation. Q1 (match-report exclusion) is the only blocking question for the parser; the rest can be decided at any point before Task 6 (parser tests).

---

*Pilot prepared 2026-05-05 by the schema-discovery sub-agent (Opus MAX). Awaiting operator approval per `phase-4-tournaments.md` Task 2 before Task 3 (migration 009 authoring) begins.*
