# Operator review — canonicalization edge cases

> Generated from the canonicalization supervisor over 214 rows × 5 year batches (2026-2022) under prompt v7. Working artifacts (JSON outputs + supervisor script) live at `/tmp/qwiki-probe/canonical/` and `/tmp/qwiki-probe/canonicalize.ts` (WSL-internal staging).
>
> This document strips out the supervisor's false positives (Kombat sub-format-lines as merge candidates, EQL split warnings) and surfaces only the cases that need operator judgment. Sections are organized by category. Decisions captured here become the source of truth for brand notes and the final canonicalization pass.

---

## A. Cross-batch role disagreements

When the same brand appears across multiple years with conflicting `tournament_role` values, one of the year's agents got it wrong. These are extraction errors, not real ambiguity — but the operator picks which year's classification is right.

### A.1 QHLAN — 2024 dissents from 2022 + 2026

| Year | Slug | Role | Notes |
|---|---|---|---|
| 2026 | QHLAN2026 | event | Multi-discipline LAN, sub-articles for 1on1/2on2/4on4/FFA |
| 2024 | QHLAN2024 | parent | Same wiki shape as 2026 — likely missed event-classification |
| 2022 | QHLAN2022 | event | Multi-discipline LAN |

**Recommendation:** auto-fix QHLAN2024 to `event`. Same `{{Infobox lan}}` template + multi-discipline body as the other two years.

**Decision:** ☑ accept auto-fix — operator confirmed clear extraction error (QHLAN2024 is the same shape as the 2022 + 2026 LAN events).

### A.2 QW LAN Party Poland — 2024 dissents from 2022 + 2023 + 2025

| Year | Slug | Role |
|---|---|---|
| 2025 | QW_LAN_Party_Poland_2025 | event |
| 2024 | QW_LAN_Party_Poland_2024 | parent |
| 2023 | QW_LAN_Party_Poland_2023 | event |
| 2022 | QW_LAN_Party_Poland_2022 | event |

**Recommendation:** auto-fix QW_LAN_Party_Poland_2024 to `event`. 2024 is the only year that diverges; it has 5 sub-event articles (1on1 Invitational, 1on1 Open, 1on1 TB3, 2on2, 4on4 Draft) which is the canonical `event` shape.

**Decision:** ☑ accept auto-fix — operator confirmed (same as A.1, clear error; 2024 has the strongest event case of all years given its 5 sub-event articles).

### A.3 UppsaLAN — 2024 vs 2025 disagreement

| Year | Slug | Role | Notes |
|---|---|---|---|
| 2025 | UppsaLAN_2 | event | Has multi-mode TBD, 4on4 played |
| 2024 | UppsaLAN | parent | Single-article, mode='1on1', no slash sub-articles in the snapshot |

**Possibility:** UppsaLAN 2024 might genuinely be a single-mode (1on1) LAN, while UppsaLAN 2 (2025) is a multi-discipline second edition. Or 2024 is also multi-discipline but the wiki article doesn't show it.

**Decision:** ☑ Operator domain knowledge: 2024 was 1on1-only (small first edition); 2025 was effectively 4on4-only (the 1on1/2on2 TBD sections are placeholders that didn't happen). **2024 stays as `parent` (correct). 2025 should be FIXED from `event` to `parent` (wrong direction from LLM's read).**

**v8 candidate rule:** if a discipline section in body has ONLY "TBD" (no bracket, no results, no players), it's a placeholder — don't count it toward multi-discipline classification. The LLM can't distinguish empty placeholder sections from real disciplines in raw wikitext; this is a structural blind spot.

---

## B. Series-name keep/strip variance

Same brand, different name across batches due to LLM marker keep/strip judgment variance.

### B.1 AYE AYE Monthly Cup

| Year | Slug | Series extracted |
|---|---|---|
| 2023 | AYE_AYE_Monthly_Cup_2 | "AYE AYE Monthly Cup" |
| 2022 | AYE_AYE_Monthly_Cup_1 | "AYE AYE" |

The 2022 agent stripped "Monthly Cup", the 2023 agent kept it. Per the v7 worked example for "TEC Elite Cup", brand-modifying language stays — so "AYE AYE Monthly Cup" is canonical.

**Recommendation:** canonical = "AYE AYE Monthly Cup". Lock in brand note.

**Decision:** ☐ "AYE AYE Monthly Cup" / ☐ "AYE AYE" / ☐ other

### B.2 Qenya War Tournament

| Year | Slug | Series extracted |
|---|---|---|
| 2024 | Qenya_War_Tournament_3 | "Qenya War Tournament" |
| 2023 | Qenya_War_Tournament_2 | "Qenya War" |
| 2022 | Qenya_War_Tournament_1 | "Qenya War" |

The 2024 agent kept "Tournament", 2022/2023 stripped. Operator clarified earlier that the community calls it "Quenya War" but the wiki spells it "Qenya". Marker question is keep vs strip "Tournament".

**Recommendation:** lean toward "Qenya War Tournament" (matches the title format, parallels "Qlan War Tournament" as a sibling brand).

**Decision:** ☐ "Qenya War Tournament" / ☐ "Qenya War" / ☐ other

### B.3 Locked decisions (operator already confirmed)

**Qlan War** = own series, distinct from Qenya War (per wiki listing showing Qlan War Elite + Qlan War Tournament 1-5 as a unified family). Canonical = "Qlan War Tournament" (matches the article-list shape; "Qlan War Elite" is its own format-line under the brand).

**QWSL** = simple brand like EQL with multiple format-lines. Canonical = "QWSL". Format-lines: Draft (Draft format), TB3 (different map pool), DIV2 (skill-limited variant), Season (regular).
- Affected rows: 2025 has QWSL / QWSL-TB3 / QWSL DIV2 / QWSL_2 / QWSL_TB3 — all collapse to series="QWSL"
- 2024 had QWSL with hallucinated season_number=1 (see D.2)
- 2026 had QWSL_Draft series="QWSL" — already correct

---

## C. Brand boundary questions still open

Cases where 1-vs-N brand identity isn't clear yet.

### C.1 DM2 Duel vs OnemapDuel

| Year | Slug | Series extracted | Article context |
|---|---|---|---|
| 2024 | DM2_Duel_Tournament | "DM2 Duel" | Title-prefix, agent ignored Navbox |
| 2025 | Aerowalk_Duel_Tournament | "OnemapDuel" | Navbox `{{OnemapDuel Navbox}}` |

Two articles in two years, both about one-map duel tournaments. Different naming approaches by the agent. Possibly a single brand "OnemapDuel" with map-specific instances (DM2, Aerowalk, future maps), OR two separate one-off tournaments.

**Question:** is OnemapDuel a series with map-specific instances, or are these standalone tournaments named after their map?

**Decision:** ☐ one brand "OnemapDuel" / ☐ each is its own series / ☐ check wiki Navbox

### C.2 Duelmania vs Duelmania Down Under vs Duelmania Pacific

| Year | Slug | Series extracted |
|---|---|---|
| 2024 | Duelmania_Pacific_2024 | "Duelmania" |
| 2023 | Duelmania_DownUnder_2023 | "Duelmania Down Under" |

Possibly all under a "Duelmania" umbrella brand with regional editions (Pacific, Down Under, Europe, etc.), OR separate one-off branded events.

**Decision:** ☐ "Duelmania" with regional editions / ☐ separate brands / ☐ check wiki

### C.3 Kombat one-offs

These appear once each in the corpus, all clearly under the Kombat brand but as distinct format-lines:
- Kombat DM Heaven (2023)
- Kombat League (2022)
- Kombat Summer Duel (2022, with Summer_Duel_2 also)
- Kombat 2on2on2 (2022)
- Kombat 4on4 (2025)
- Kombat Weekly (2025) — note: the agent assigned series="Kombat Duel" not "Kombat Weekly"

**Question:** confirm each is its own format-line under the Kombat brand (so the brand note's `format_lines` array has 11+ entries), OR collapse some? E.g., is "Kombat Weekly" really a Kombat Duel sub-format, or its own format-line?

**Decision:** ☐ each is its own format-line / ☐ collapse selected / ☐ list any specific decisions inline

---

## D. Specific data errors

Individual rows that have wrong values, not classification ambiguity.

### D.1 Blitzkrieg duel — wrong competition_type

- Slug: `Blitzkrieg_duel` (2024)
- Current: `competition_type='cup'`
- Should be: `competition_type='tournament'`
- Reason: title is "Blitzkrieg duel" with no Cup keyword. Single-elim 1on1 bracket per the article body. The agent picked 'cup' for unclear reasons.

**Action:** ☐ accept fix to 'tournament' / ☐ leave as-is

### D.2 QWSL — hallucinated season_number

- Slug: `QWSL` (2024)
- Current: `season_number=1`
- Should be: `season_number=null`
- Reason: title is just "QWSL", no Season N marker. The agent invented a season number.

**Action:** ☐ accept fix to null / ☐ leave as-is

### D.3 Quakeworld_Eternal_E1m2 — orphan parent_slug

- Slug: `Quakeworld_Eternal_E1m2` (2025)
- Current: `tournament_role='sub_event'`, `parent_slug=null`
- Issue: no parent article exists in the snapshot. Should this be `role='parent'` (standalone brand instance) or stay as orphan sub_event?
- Note: Eternal Dm2 (2024) and Eternal Schloss (2024) are both `role='parent'`, suggesting Eternal sub-tournaments are PARENTS, not sub_events.

**Recommendation:** reclassify all Quakeworld Eternal map-specific articles as `role='parent'`. Each map gets its own parent row. The "Quakeworld Eternal" series exists in the `series` field across all rows.

**Action:** ☐ reclassify Eternal map articles to parent / ☐ keep sub_event with cluster-pointer / ☐ other

### D.4 Quakeworld_Eternal_Dm3 — sibling-pointing parent_slug

- Slug: `Quakeworld_Eternal_Dm3` (2025)
- Current: `parent_slug='Quakeworld_Eternal_E1m2'` (points at sibling, not parent)
- Issue: same as D.3 — no real parent exists. Sibling-pointing is wrong.

**Action:** ☐ same fix as D.3 / ☐ other

### D.5 The_Big_4__Season_1 — self-referential parent_slug

- Slug: `The_Big_4__Season_1` (2025)
- Current: `tournament_role='sub_event'`, `parent_slug='The_Big_4__Season_1'` (self)
- Should be: `tournament_role='parent'`, `parent_slug=null`
- Reason: The Big 4 / Season 1 IS the parent article (mirrors The_Big_4__Season_2 in 2026 batch which is `role='parent'`).

**Action:** ☐ accept fix to parent / ☐ leave as-is

### D.6 QHLAN2022_CTF — orphan, should be sub_event of QHLAN2022

- Slug: `QHLAN2022_CTF` (2022)
- Current: `tournament_role='parent'`, `series=null`, `parent_slug=null`
- Should be: `tournament_role='sub_event'`, `series='QHLAN'`, `parent_slug='QHLAN2022'`
- Reason: this is the CTF discipline of QHLAN2022 LAN event. The wiki uses underscore-not-slash convention here (`QHLAN2022_CTF` vs `QHLAN2017__Playoffs`), so the parser missed it.

**Action:** ☐ accept fix to sub_event of QHLAN2022 / ☐ leave as-is

### D.7 NA_QuakeWorld_Draft_2 — date plausibility flagged across batches

- 2024 batch: `NA_QuakeWorld_Draft_2__bracket` and `__rules` were classified as year=2025 (correct — actual tournament is 2025).
- 2025 batch: `NA_QuakeWorld_Draft_2` parent and 4 sub-pages all year=2025. Sub-pages have |sdate=2024-02-16 with |year=2025; agent applied date plausibility (within +/-1 year, kept dates).

Cross-batch consistent. No action needed.

---

## E. Pending operator decisions for brand notes

Once these are locked, brand notes can be drafted.

| # | Question | Default if no answer |
|---|---|---|
| E.1 | Auto-fix policy on cross-batch role disagreements (A.1, A.2)? | Auto-fix when 2+ siblings agree |
| E.2 | Canonical name for AYE AYE family? (B.1) | "AYE AYE Monthly Cup" |
| E.3 | Canonical name for Qenya War family? (B.2) | "Qenya War Tournament" |
| E.4 | OnemapDuel: brand or singletons? (C.1) | Operator must decide |
| E.5 | Duelmania: brand or singletons? (C.2) | Operator must decide |
| E.6 | Kombat sub-formats — confirm all 11 are distinct format-lines? (C.3) | Yes, all 11 listed |
| E.7 | Accept the 6 specific data fixes (D.1 - D.6)? | Operator must approve each |

---

## F. Closed decisions (logged for brand notes)

- **Qlan War** = own series, canonical "Qlan War Tournament", format_lines includes "Elite" and numbered "Tournament N" instances. Distinct from Qenya War.
- **QWSL** = simple brand with multiple format-lines (Draft, TB3, DIV2, Season). All 2025 QWSL family rows collapse to series="QWSL"; format_line distinguishes.
- **EQL** = brand with format_lines: Season (league), Cup (cup), Ladder (ladder).
- **Eternal** = canonical name for Quakeworld Eternal / QW Eternal / eeNternal Fights 4on4 family. Map-specific instances (Dm2, Dm3, Schloss, E1m2) are parent-role rows under series="Eternal".

---

## Next steps after operator review

1. Operator marks decisions in Sections A-D and answers E.4, E.5, E.6.
2. I update brand notes to reflect locked decisions.
3. I patch the supervisor: load brand notes as authoritative reference, suppress false-positive merge suggestions on multi-format brands, apply auto-fix policy from E.1.
4. Re-run supervisor on the 214-row corpus. Verify clean output (zero false positives, zero unresolved disagreements).
5. Move on to 2021 batch (next year forward).
