# QWiki Phase 4 LLM-extraction investigative session -- mid-flow resume

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.** This continues the investigative session started in the original parking doc (`docs/superpowers/parking/2026-05-05-qwiki-phase-4-llm-extraction-sidequest.md`). The brainstorm has been running and produced concrete artifacts; the prior session hit ~400k context and is handing off.

This is NOT an execution session for Phase 4 proper. It is the design-pass continuation. Deliverable still in flight: a converged extraction prompt + a method-focused design doc + a redrafted Phase 4 MD.

---

## Where things stand (2026-05-06)

The brainstorm reframed itself mid-flow with operator approval. The wiki data is too dirty for abstract design; the prompt + schema have to evolve through evidence. Current shape:

**Method:** investigative session, year-by-year. Run a year cohort through Sonnet + current prompt, eyeball outputs, refine prompt, move to next year. Schema grows organically as anomalies surface. Phase 4 splits into:

- **Phase 4a (active):** LLM-extract every tournament article into `/tmp/qwiki-probe/<year>/`. No DB writes, no migration. Just JSON files we eyeball.
- **Phase 4b (later):** once the prompt converges (signal: 2-3 consecutive years produce no new prompt edits), write migration 009 with the discovered columns + provenance, write the loader, batch-load all staged JSONs into `community.tournaments`.

**Years processed so far:**

| Year | Articles | Iteration | Model | Status |
|---|---|---|---|---|
| (8-article spike) | 8 | v0 | Haiku 4.5 | done -- baseline shape, 8 known bugs |
| 2026 | 24 | v1 | Haiku | done -- 6/8 fixed, 5 new bugs |
| 2026 | 24 | v2 | Haiku | done -- 4/5 fixed, organizer regressions |
| 2026 | 24 | v3 | Haiku | done -- regressions confirmed, switched models |
| 2026 | 24 | v4 | **Sonnet 4.6** | done -- clean, body-Results extraction working |
| 2025 | 63 | v4 | Sonnet | done -- nested-results + missing-nulls schema regression; normalized |

**Years remaining:** 2024 (59), 2023 (40), 2022 (26), 2021 (41), 2020 (13), 2019 down to ~2002 (single digits each year), then the **210 unknown-year articles** (series umbrella pages, untagged stubs) as a separate tail pass.

**Cost so far:** trivial (under $5 total in subagent dispatches via Claude Max). Full corpus completion projected at $15-25.

**Key headline finding:** Sonnet handles body-Results extraction (winners from `{{PrizepoolSE}}` templates, playoff brackets, prose Results sections). 2025 batch achieved **57% winner extraction** rate vs Haiku's near-zero. This is the load-bearing capability gain that justified the 3x model cost.

---

## Critical rules (don't violate)

- **DO NOT lock the schema yet.** It evolves per year. The design doc captures METHOD, not a frozen column list. Schema commits only at Phase 4b.
- **DO NOT write migration 009 yet.** No DB writes during 4a. Outputs stay in `/tmp/qwiki-probe/`.
- **DO NOT touch `community.tournaments` table.** Same reason.
- **DO NOT write the design doc to disk yet.** Wait until prompt converges (2-3 consecutive year batches with no prompt changes).
- **Use Sonnet, not Haiku.** Haiku regressed across iterations on this data. Sonnet's reasoning is load-bearing for the heterogeneity.
- **Year-by-year, newest first.** Don't batch all years. Each year is a HALT-and-review point.
- **Always run the normalizer on each year's output** before eyeballing -- ensures flat schema for cross-year comparison. Path: `/tmp/qwiki-probe/normalize.ts`.
- **Don't subagent-dispatch mechanical edits.** Apply v5 prompt fixes inline; only dispatch the actual extraction (which is expensive judgment work).
- **Strive for MORE data, not less.** Every column nullable; LLM fills what's there; never invents.
- **Goal is FACTS, not prose.** `has_note=true` is a FLAG; do NOT generate note bodies in Phase 4a (future arc).

---

## First three actions

1. **Read this doc + the original parking doc + the prompt v4 artifact.**
   - Original parking: `docs/superpowers/parking/2026-05-05-qwiki-phase-4-llm-extraction-sidequest.md`
   - Converged prompt: `/tmp/qwiki-probe/prompt-v4.md` (full schema + v5 fixes inlined)

2. **Survey the artifact tree at `/tmp/qwiki-probe/`:**
   ```
   v0-initial-8/             8 articles, Haiku, baseline spike
   2026-v1/ ... 2026-v3-haiku/   Haiku iterations on 2026 (24 each)
   2026/                     v4 Sonnet outputs (converged baseline)
   2026-normalized/          v4 outputs in flat-schema form
   2025/                     v4 Sonnet outputs (raw; nested results)
   2025-normalized/          v4 outputs flattened by normalize.ts
   normalize.ts              the schema normalizer (reusable)
   prompt-v4.md              converged prompt + v5 additions
   OBSERVATIONS.txt          earlier observations (mostly superseded)
   ```
   Spot-check a few `2026-normalized/*.json` and `2025-normalized/*.json` to anchor on data shape.

3. **Build the v5 prompt and dispatch 2024 batch.**
   - v5 = v4 + 3 additions (already drafted in `/tmp/qwiki-probe/prompt-v4.md` last section): flat-schema rule, LAN venue override, date-plausibility flag.
   - Get the 2024 article list (see "Year-cohort selector" below).
   - Dispatch single Sonnet subagent, sequential, output to `/tmp/qwiki-probe/2024/`.
   - Wall clock ~16 min. Run in background.

---

## Reads required (priority order)

1. **`/tmp/qwiki-probe/prompt-v4.md`** -- canonical extraction prompt (paste into next year's dispatch with the v5 additions at the top).
2. **`docs/superpowers/parking/2026-05-05-qwiki-phase-4-llm-extraction-sidequest.md`** -- original brainstorm framing (10 Q-DESIGN questions, the pivot rationale, the 30-column pilot output reference).
3. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md`** -- 20 cross-cutting decisions. D4 amendment for tournament-LLM carve-out is still pending (lands when prompt converges).
4. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md`** -- 29 findings; F6/F8/F16/F17/F23/F24/F26/F27/F28/F29 most relevant for Phase 4.
5. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md`** -- the 30-column proposal that anchors the schema. Reframed in this brainstorm as "the checklist the LLM follows," not a deterministic-parser spec.
6. **`/tmp/qwiki-probe/2026-normalized/EQL_Season_1.json`** + a couple others -- look at the actual data shape Sonnet produces (clean baseline).
7. **`/tmp/qwiki-probe/2025-normalized/EQL_Season_23.json`** + `QW_LAN_Party_Poland_2025.json` (LAN venue bug self-flagged by the model) + `NA_QuakeWorld_Draft_2.json` (no-navbox, series=null) -- typical 2025 cases.

---

## Continuation method (year-by-year loop)

For each year batch:

### Step 1 -- Year-cohort selector

Build the article list with this Bun one-liner (replace `<YEAR>`):

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/ && bun -e '
import { readdirSync, readFileSync } from "node:fs";
const TOURNAMENT_CATS = new Set([
  "Category:Online Tournaments", "Category:Team Tournaments", "Category:Leagues",
  "Category:Offline Tournaments", "Category:LAN Tournaments",
  "Category:Online Seasonal League Tournaments", "Category:Online Draft Tournaments",
]);
const YEAR = "<YEAR>";
const matches = [];
for (const f of readdirSync(".")) {
  if (!f.endsWith(".json")) continue;
  let o; try { o = JSON.parse(readFileSync(f, "utf8")); } catch { continue; }
  const cats = new Set(o.categories || []);
  let isT = false;
  for (const c of cats) if (TOURNAMENT_CATS.has(c)) { isT = true; break; }
  if (!isT) continue;
  const hasYear = cats.has(`Category:${YEAR}`);
  const sdateY = new RegExp(`\\\\|sdate\\\\s*=\\\\s*${YEAR}`).test(o.wikitext || "");
  const titleY = new RegExp(`\\\\b${YEAR}\\\\b`).test(o.title || "");
  if (hasYear || sdateY || titleY) matches.push(f.replace(".json", ""));
}
console.log("count:", matches.length);
for (const m of matches.sort()) console.log(m);
'
```

### Step 2 -- Dispatch Sonnet subagent

Pattern (paste prompt-v4.md content + v5 additions at the top):

```
Agent({
  subagent_type: "general-purpose",
  model: "sonnet",
  prompt: <v4 prompt + v5 additions + article list>,
  run_in_background: true (for 30+ article batches)
})
```

Background dispatch produces a notification when complete (~13-15 sec/article).

### Step 3 -- Normalize

```bash
bun /tmp/qwiki-probe/normalize.ts /tmp/qwiki-probe/<YEAR> /tmp/qwiki-probe/<YEAR>-normalized
```

### Step 4 -- Eyeball + capture anomalies

Spot-check 5-10 outputs directly via Read or `python3 -c "import json; ..."`. Verify:
- Schema discipline (all 38 fields, no nesting): `bun -e` schema-check loop
- Body-Results extraction rate (% with non-null winner)
- New shapes the prompt struggled with
- Any regressions from prior years

### Step 5 -- Decide

- If clean: move to next year.
- If new bugs: refine prompt to v6/v7/etc., re-fire affected year (cheap).
- If a new column type emerges: capture in extraction_notes; defer schema decision to Phase 4b.

### Step 6 -- Repeat

Go newer-to-older. Stop the active year-loop when 2-3 consecutive years produce no prompt changes -- prompt has converged. Then handle the 210 unknown-year articles as a tail pass.

---

## Anomalies log (cumulative across iterations)

Things the prompt now handles correctly (don't break these in v5+):

- 3-level parent_slug hierarchies (`The Big 4/Season 2/Division 1`)
- Year-as-suffix exclusion (`QHLAN2026` -> series=QHLAN, season=null)
- Multi-Player template splitting in organizers/admins (`{{Player|A}}{{Player|B}}` -> `["A","B"]`)
- Plain-text non-template organizer fields (`Black Molly Entertainment` -> `["Black Molly Entertainment"]`, NOT split mid-word)
- Diacritic stripping in name fields (`Åke Vader` -> `Ake Vader`)
- Nested template map exclusion (don't extract `|map1=` from inside `{{BracketMatchSummary}}`)
- Marker keep-vs-strip consistency (Cup/Draft/Race/Duel kept in series; Season/Division/Group/Playoffs stripped)
- Trailing-digit-as-season strip when no other marker (`NAQL 2on2 2` -> series=`NAQL 2on2`)
- Body-Results extraction (winners from PrizepoolSE / playoff brackets)
- Empty stub handling (BesMella.Custom -> is_substantive=false, mode=Kenya from body)
- Field-termination discipline (youtube_handle doesn't overrun into body content)
- Map-specific sub-events (`Quakeworld_Eternal_Dm3` -> sub_event of `Quakeworld_Eternal`)
- InfoRules combined metadata_tab (`QWSL-TB3__InfoRules` correctly classified)
- Group A/B as sub_event (not metadata_tab)
- LAN bug self-flagged in extraction_notes (model knows `|type=online` is wrong for `{{Infobox lan}}`)

Open issues (v5 fixes pending; details in `prompt-v4.md`):

1. Schema discipline regression in 2025 batch (nested `results` key + missing-null fields). v5 flat-schema rule fixes for future runs; existing data normalized via `normalize.ts`.
2. LAN venue override (use `{{Infobox lan}}` template presence as the structural signal, not `|type=` field).
3. Date plausibility (flag wiki-typo dates whose year mismatches article year by more than 1).

Future considerations (don't block 4a; capture for 4b):

- Tied placements (`teamthird` + `teamthird2`): currently flattened to fourth_place. May want explicit `places_tied` or just live with current behavior.
- Duplicate-page deduplication (`EQL Season 18` stub vs `European Quake League Season 18` full): Phase 5 fuzzy-dedup logic, not Phase 4.
- 210 unknown-year articles: tail pass after year-loop; series-umbrella pages (`The_Big_4`, `Polish_Duel_Championship`, `European_Quake_League`) and old-era stubs.

---

## Operator preferences (from prior session)

- **Decisive recommendations**, not option menus -- lead with plain English + my call, ask for confirmation.
- **One question at a time** during interactive scoping.
- **Plain English at decision points**; technical detail follows only where load-bearing.
- **Investigative > mechanical** -- the data is too dirty for abstract design; let evidence drive iteration.
- **Momentum over ceremony** -- run year batch, eyeball, refine, move on. Don't over-document mid-flow.
- **Sonnet for messy data**, Haiku for cleanly-shaped tasks. Confirmed during this session.
- **Schema evolves**, doesn't get pre-locked.
- **Reverse-flow vision**: structured DB eventually canonical; wiki cleaned from it (long-term). Affects column naming -- prefer canonical forms.
- **Project standards** (project CLAUDE.md): Bun runtime, postgres-js, ASCII-only, append-only migrations, no JSONB pre-stringify.

---

## When in doubt

- **Anomaly that doesn't fit any v4 rule** -> capture in extraction_notes; surface to operator at year-batch review; may become a v(N+1) prompt addition.
- **Tempted to lock schema** -> resist; we're still in 4a; schema commits only after convergence signal.
- **Tempted to write migration 009** -> resist; same reason. Schema isn't stable yet.
- **Year batch shows >5% regressions vs prior year** -> halt, re-run prior year with current prompt to validate, debug before continuing.
- **Cost spikes unexpectedly** -> surface to operator; we're targeting <$30 total; if a single year costs >$5, something's wrong.
- **210 unknown-year articles surface mid-loop** -> defer; they're a separate tail pass, not part of year cohorts.
- **Operator asks to write design doc / spec** -> only after prompt has converged across 2-3 years. The doc captures METHOD (year-by-year, prompt evolution, /tmp staging, normalizer, stabilization criterion), starter prompt, current schema, Phase 5/6 amendments. Not a frozen column list.

---

## Halt-and-report contract (per year batch)

When a year batch finishes:
- Run the normalizer.
- Surface to operator: count of parents/sub_events/metadata_tabs, % winners extracted, list of new shapes, any v5+ candidate fixes.
- Recommend: continue to next year / halt for prompt revision / escalate.

When prompt has CONVERGED (2-3 consecutive years stable):
- Halt the active loop.
- Switch context to design-doc authoring + redrafted Phase 4 MD.
- The design doc lives at `docs/superpowers/specs/2026-05-05-qwiki-tournament-llm-extraction-design.md` (path from original parking doc).
- The redrafted phase-4 MD replaces `docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-tournaments.md`.
- Phase 5 + Phase 6 amendments captured (from impact analysis already done; see notes in original parking doc).

---

## Appendix: Phase 5 + Phase 6 impact analysis (already done)

From the brainstorm's impact pass:

**Phase 5 (cross-link backfill):**
- `buildTournamentIndex()` must filter `tournament_role IN ('parent', 'sub_event')` -- skip metadata_tab + match_report rows.
- Open question: parent-slug fallback "pass 3.5" for sub_event matching when achievement strings only specify the parent series + year.
- `extracted_via` / `extraction_prompt_hash` / `llm_confidence_summary` columns are metadata-only; do NOT affect Phase 5 matching logic.

**Phase 6 (MCP tools):**
- `lookup_tournament` / `search_tournaments` should default-filter `tournament_role IN ('parent', 'sub_event')`. Optional `--include-all-roles` escape hatch for power users.
- `llm_confidence_summary` and `extracted_at` are candidates for visibility (operator decision deferred).
- `lookup_by_nick` is unaffected (tournaments out of scope per D11).

These amendments land at Phase 4b time when the redrafted MDs ship.
