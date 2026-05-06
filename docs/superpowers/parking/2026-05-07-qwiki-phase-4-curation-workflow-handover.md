# QWiki Phase 4 curation-workflow brainstorm -- fresh terminal handover

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.** The prior session (2026-05-06 evening through 2026-05-07 early hours) completed the brand-pages schema design + built a curation tool; ran into ~400k context. Fresh terminal needed for the curation-workflow brainstorm.

This is a BRAINSTORM session, not implementation. Use `superpowers:brainstorming` skill. Goal: agree on the operator's working method for sorting ~300 real tournaments into brands over a multi-week, on-and-off cadence.

---

## The pivot in one paragraph

Phase 4 of the qwiki-community-reference arc started as LLM-extraction of tournament data into `community.tournaments`. After 5 year cohorts of v7 extraction (214 rows), a deterministic canonicalization supervisor was built; it produced false positives on multi-format brands and couldn't resolve cross-batch ambiguity. Operator pointed out the wiki ALREADY has brand-overview pages + Navbox templates that organize tournaments into brand groupings. The pivot: **drop fuzzy clustering; use wiki cross-links as ground truth**. This session converged the schema for `community.tournament_brands` and built a curation tool because operator preferred manual-with-pre-fill over more deterministic-script attempts ("weeks-long project on/off; with this method I'd be 20% done already").

---

## What's built (committed to main)

### Schema spec (committed)
`docs/superpowers/specs/2026-05-06-tournament-brands-schema-design.md`

Locked design. New table `community.tournament_brands` + cross-table additions to `community.tournaments`:
- **Brand row:** slug / title / display_name / short_name / aliases / eras (JSONB array of `{sdate, edate}`) / founder / admins / venue_type (online|lan|hybrid) / prize_category (glory|real_money|mixed) / format_default / region (na|eu|sa|au|other) / website / competition_types[] / modes[] / format_line_labels[] / summary / description / has_note / is_substantive / is_stub / source_wiki_slug / source_template / wiki_revision_id / wiki_fetched_at
- **Tournament row additions:** brand_slug (FK) / format_line_label / competition_type (league|cup|ladder|tournament) / mode (1on1|2on2|4on4|ffa|multi|ctf) / status (upcoming|ongoing|completed)
- **Three orthogonal classification axes** instead of fuzzy `brand_type` enum: venue (where), competition_type per format-line (what), mode per format-line (player count)
- Markdown frontmatter mirrors the row (profile-notes pattern, like `community.players` / `community.clans`)
- Top 5 brands get LLM-authored bodies; smaller brands stay as stubs

### Curation tool (committed at `apps/qw-oracle/scripts/curate-brands/`)
- **`pre-fill.ts`** -- Bun script that reads the wiki snapshot, identifies tournament-shape articles + Navbox templates (content-based detection, not filename), pre-assigns articles to brands via Navbox membership. Outputs `brand-pre-fill.json` + `brand-pre-fill.js` (gitignored).
- **`index.html`** -- single-file two-pane curation UI. Loads `brand-pre-fill.js` directly (no fetch / CORS). Left pane: filterable unassigned tournaments. Right pane: brand cards (color-coded: green = wiki brand-page, purple = synthesized, orange = empty). Persists to localStorage. Export-to-JSON button.
- **`README.md`** -- usage doc.

### Pre-fill current stats (after the latest run, including piped-wikilink fix)
- 629 tournament-shape articles found (in wiki tournament categories)
- 35 navbox templates discovered (content-based; includes non-"Navbox"-filename templates like `Polish Duel Championship` and `HAMMER-TIME_QUAKEWORLD_LEAGUE`)
- 29 brands pre-filled (22 with wiki brand-pages / 7 synthesized)
- 248 tournaments auto-assigned (~40% via Navbox membership)
- 385 tournaments unassigned (~60% needs manual curation)
- 119 of the 385 unassigned are sub-pages with `__` slugs (URL-encoded slashes)
- 11 navboxes flagged as "no brand-overview match" (combined-brand cases like QWar, special-character cases like GetQuad! / Mom's Basement)

### Top 5 brands by member count
EQL (35) -- Kombat (27) -- QHLAN (20) -- RQWL (19) -- NQR (19). All have wiki brand-overview articles + Navbox templates. Five different shapes:
- EQL: multi-format league (Seasons + Cups + Ladders), 4on4
- Kombat: multi-mode tournament series (1on1 / 2on2 / FFA), online
- QHLAN: annual LAN, multi-discipline editions
- RQWL: pure season league, Russian, 4on4
- NQR: foundational league, Main Seasons + 8 Side Events

---

## Open questions for this brainstorm session

### Sub-page filtering (mid-decision when prior session ended)

119 of 385 unassigned are sub-pages (slug contains `__`, the URL-encoded slash). Of those:
- ~85 are CLEAR sub-pages with metadata-tab suffixes: `Division_N` (35), `Information` (12), `Playoffs` (10), `Rules` / `InfoRules` / `rules` (8), `standings` / `Standings` / `results` (4), `Group_X` / `Groups` (3), `Teams`/`teams`/`players`/`Schedule`/`signups`/`bracket` (small counts each)
- ~30 are real tournaments with hierarchical names (e.g., `The_Big_4__Season_2`, `Quakeworld_Eternal__Dm3`, `GetQuad__Draft_3`, `True_Damage_International_2`)

Two implementation options offered, awaiting operator nod:
- **(A) Pre-fill filters them out entirely.** Sub-pages get a separate `sub_pages` array in the JSON output for the future loader. They never appear in the curation UI. **My recommendation.**
- **(B) Tool toggles them.** Pre-fill includes them with `is_subpage: true` flag; UI defaults to hiding; toggle reveals.

Detection rule (either option): slug has `__` AND last segment matches the metadata-tab regex (Division_\d+ | Group_[A-Z] | Information | Playoffs | Rules | InfoRules | standings | Standings | results | Schedule | signups | Teams | teams | players | bracket).

### QWar reversal (operator correction during prior session)

Earlier `operator-review.md` decision: "Qlan War distinct from Qenya War" -- LOCKED. Reversed during prior session: the QWar Navbox groups them as ONE brand with TWO format-lines (Clan: Qlan War family, Kenya: Qenya War family), confirmed via screenshot of the navbox. Operator wants a one-line reversal note appended to the parking doc but it's not been written yet.

### Hammer Time bug fix (resolved during prior session)

`Template:HAMMER-TIME QUAKEWORLD LEAGUE` had a piped-wikilink title `[[HAMMER-TIME QUAKEWORLD EVENTS|Hammer Time]] Events` that broke the field-extraction regex (it stopped at the inner `|`). Fixed in `pre-fill.ts` (committed). Hammer Time now correctly resolves to its brand-overview article. Operator may need to "Reset state" in the tool OR manually edit the Hammer Time card to absorb the fix.

### The actual brainstorm topic: curation workflow

The operator estimates this is a multi-week project, on-and-off. Specific questions for the brainstorm:
1. **Ordering strategy.** Work biggest-brand-first (top 5 done in 30 minutes; momentum)? By year? By category? By "easy wins" (clean wiki brand-pages first, synthesized brands last)?
2. **Sub-page handling.** Is option A (filter at pre-fill) actually right, or is there a workflow case where seeing them in-tool helps?
3. **Synthesized brands (Path B).** Operator may collaborate with alice (wiki maintainer) to create proper brand pages on the wiki for QWSL et al. -- if those land mid-flow, do we re-snapshot + re-pre-fill, or absorb manually?
4. **Tool gaps.** Is the current tool good enough for a multi-week effort, or are there UX additions (drag-drop? keyboard shortcuts? brand-card auto-fill from wiki article on hover?) that would meaningfully speed things up?
5. **Halt-and-report rhythm.** When operator pauses for the day, what state do we want preserved for next session (export JSON each time? localStorage only? both)?
6. **Next concrete deliverable.** After curation is "done enough" (top 30-50 brands assigned, the rest as singletons or back-burner), what ships next: migration 012 + loader script, or LLM-prose pass for top 5 brand notes, or something else?

---

## Critical rules (don't violate)

- **DO NOT write to DB.** Migration `012_tournament_brands.sql` is NOT written yet (deferred until curated JSON ships). Spec at `docs/superpowers/specs/2026-05-06-tournament-brands-schema-design.md` is the source of truth.
- **DO NOT modify the spec without operator sign-off.** It's a draft for review; current state is what was approved during prior session.
- **DO NOT extend the schema mid-brainstorm.** Schema is locked. Workflow questions are about TOOL and PROCESS, not data shape.
- **Curation state lives in BROWSER localStorage.** The operator may have made progress in the tool. Don't blow it away. If the operator wants to "reset state", that's their call, not Claude's.
- **Sub-pages do NOT get assigned to brands directly.** They inherit from parent. The 119 `__`-slug articles are NOT individual curation units.
- **Wiki is source of truth for brand identity.** Don't LLM-cluster what the wiki authoritatively states. The brand-pages methodology is validated.
- **No re-extraction of tournament articles.** The v7 corpus exists at `/tmp/qwiki-probe/<year>-v7-normalized/`; tournament-row extraction is a separate concern, downstream of brand curation.
- **Operator memory rules are load-bearing.** Momentum over ceremony / plain English at decisions / one question at a time / decisive recommendations / no subagents for mechanical edits / ASCII-only in code and shared docs. Auto-loaded from MEMORY.md.

---

## First three actions

1. Read this handover (you're reading it).
2. Read the schema spec: `docs/superpowers/specs/2026-05-06-tournament-brands-schema-design.md`. ~200 lines, captures the full design.
3. Read the curation tool README + skim pre-fill.ts: `apps/qw-oracle/scripts/curate-brands/README.md` then `pre-fill.ts`. Understand what fields the tool surfaces and what's NOT in the data yet.

Then invoke `superpowers:brainstorming` and walk through the open questions section above with the operator. Lead with the question that has the highest leverage on the workflow shape (probably: "ordering strategy" -- biggest-first vs other -- because it determines what the operator does session 1 vs session 30).

---

## Reads required (priority order)

1. **This file (handover).**
2. **`docs/superpowers/specs/2026-05-06-tournament-brands-schema-design.md`** -- schema spec, locked.
3. **`apps/qw-oracle/scripts/curate-brands/README.md`** -- tool usage.
4. **`apps/qw-oracle/scripts/curate-brands/pre-fill.ts`** -- to understand what fields are in the JSON.
5. **`apps/qw-oracle/scripts/curate-brands/index.html`** -- to understand UI capabilities (filter + bulk-assign + create new + edit).
6. **`docs/superpowers/parking/2026-05-06-qwiki-phase-4-brand-discovery-resume.md`** -- original pivot resume from start of prior session.
7. **`docs/superpowers/parking/2026-05-06-qwiki-phase-4-canonical/operator-review.md`** -- earlier 14-decision review. Mostly superseded; QWar reversal pending.
8. **`apps/qw-oracle/API_CONTRACTS.md`** -- profile-notes pattern; D18 frontmatter-mirrors-row convention.

If short on time: 1, 2, 3 are mandatory. 4-5 useful for tool questions. 6-8 for context if needed.

---

## Operator preferences (carried, in addition to MEMORY.md)

- **Investigative tool over more scripting attempts.** Operator picked the curation-tool path explicitly because they felt scripted-only would never finish. Don't propose pure-deterministic alternatives unless evidence demands it.
- **Sub-pages are noise, not curation units.** They inherit from parent. Verified during prior session.
- **Wiki ground truth wins over operator recall.** The QWar reversal demonstrated this -- operator misremembered Qlan/Qenya as separate brands; brand-pages discovery showed the wiki groups them as one.
- **Synthesized brands are first-class.** QWSL has no wiki brand-page; it's still a real brand. Operator may collaborate with alice to create wiki brand-pages, but the synthesized path is always available as a fallback.
- **Multi-week project assumption.** Operator estimates weeks of on-and-off work. Workflow design should accommodate pause / resume / partial-done states gracefully.

---

## When in doubt

- **New ambiguity class encountered (e.g., a sub-page suffix not in the regex)** -> flag as operator-review item, don't auto-decide.
- **Tempted to add LLM to the discovery layer** -> don't. The wiki structures it; we surface it. LLM is for prose authoring, not classification.
- **Tempted to scope-creep into the loader** -> defer until curation is done. The curated JSON is the deliverable from this phase.
- **Tempted to build a heavier tool (drag-drop, real-time sync, server-side state)** -> keep it simple. Operator wants a tracker, not a CRM. The current tool is single-file vanilla JS by design.
- **Operator pauses mid-brainstorm and wants to test something in the tool** -> that's expected; absorb the feedback when they return.
- **Curation localStorage gets corrupted somehow** -> operator can "Reset state" + re-import previously exported JSON if they exported one. Make sure they export before any risky operation.

---

## Halt-and-report contract

After the brainstorm:
- Surface to operator: agreed workflow shape, any spec amendments needed (probably none -- schema is locked), next concrete deliverable to ship.
- If sub-page filtering decision is reached: implement option A (or B if chosen), commit, re-run pre-fill, surface updated stats.
- If "next deliverable" is the migration file (012): ask operator before writing -- spec sign-off was implicit but not formal.
- If "next deliverable" is the LLM-prose pass for top 5: that's a separate planning conversation; defer to its own session.

After implementation work (if any):
- Don't write code without operator sign-off on the workflow first.
- Commit each meaningful change separately (one-line messages).
- Don't push without explicit operator request.

---

## Context budget projection

Brainstorm session itself: ~30-50k tokens. Light, mostly conversation.

If sub-page filtering implementation lands in same session: +20-30k tokens (small code change + re-run pre-fill).

If migration file 012 also lands: +30-50k tokens (DDL + spec amendment + testing).

Total expected: 80-130k for a "brainstorm + immediate next-step ship" session. Comfortable.

If approaching 300k while still in brainstorm: handoff again. Brainstorm shouldn't exceed 60k.
