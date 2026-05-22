# QWiki Phase 4 LLM-extraction side-quest -- design pass handoff

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.** This terminal runs a brainstorm/design pass on the Phase 4 LLM-extraction approach. It is NOT an execution session -- the deliverable is a design doc + redrafted Phase 4 MD.

The QWiki community-reference arc is paused at Phase 4 T2 boundary. Phases 0-3 shipped (players + clans + snapshot finalize + curated/ rename + migration 008). Phase 4 T1 (Opus MAX pilot) shipped a 30-column proposal at `docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md` (commit 98cc47be). Phase 4 T2 operator review surfaced two architectural pivots that necessitate a design pass before Phase 4 ships migration 009.

This side-quest's deliverable is a concrete LLM-extraction design that becomes input to a redrafted Phase 4 MD.

---

## Skill to invoke

`superpowers:brainstorming` (in the `superpowers` plugin set). Single-session, scoped, output is a design doc + redrafted Phase 4 MD. Not big enough to warrant `arc-brainstormer` (multi-pass).

If during the brainstorm it turns out the design is bigger than expected (e.g., needs Phase 5 amendments, Phase 6 amendments, or significant migration 009 reshape), escalate to `arc-brainstormer` mid-session.

## Recommended model + effort

**Sonnet MAX or Opus medium.** This is judgment-dense design work spanning prompt engineering, JSON schema design, runner architecture, provenance shape, and cross-phase impact analysis. Per `feedback_model_effort_range.md`, multi-file integration + judgment-dense work warrants Sonnet MAX or Opus medium.

## Context summary -- what triggered the pivot

### What was already done in Phase 4

- **T1 pilot (Opus MAX subagent):** read 58 stratified tournament articles; produced `phase-4-pilot-output.md` with 7 sections (sample composition / template variants / field-to-column proposal / edge cases / is_substantive heuristic / has_note v1 rule / open questions). Pilot proposed a 30-column migration 009 (deterministic 4-branch parser path).
- **T2 operator review gate:** uncovered TWO architectural problems with the deterministic path. Both stand resolved for Phase 4 only via the LLM pivot.

### Pivot 1: pilot's Q3 was over-broad

Pilot recommended option (a): "load all slash-title sub-events as independent rows." Cold check showed corpus has 553 slash-title articles globally. Suffix tally:

```
28 1on1     17 Playoffs      17 Div2       16 Div1       12 4on4    11 Division_3
26 bracket  17 Division_2    16 Rules      15 Division_1  7 playoff   6 rules
26 Information  26 2on2      ...           5 schedule     3 ranking
```

~150 are substantive sub-events (mode splits / divisions / playoffs / brackets); ~50-80 are wiki-internal tabs (rules / standings / teams / players / ranking) that pollute lookup_tournament if loaded. Pilot's blanket recommendation didn't distinguish them.

A naive denylist by suffix is feasible but brittle. **An LLM with autonomous classification handles this cleanly** -- LLM reads each page, judges `tournament_role: 'parent' | 'sub_event' | 'metadata_tab' | 'match_report'`, loader skips metadata_tab + match_report rows.

### Pivot 2: tournament heterogeneity exceeds deterministic comfort zone

Operator's framing: tournament pages are not players-or-clans-shaped. The variance is genuinely hostile to deterministic regex parsing:

- **Different types:** tournament / league / ladder / cup
- **Umbrella series with seasons** (EQL Season 1 through EQL Season 23 + EQL Cup 1-5 + EQL Ladder 1-6)
- **Results data lives in different places per page:** sometimes Infobox `teamfirst/teamsecond/teamthird` fields (~19% fill rate), sometimes body `==Results==` section (table OR bullet list OR ties), sometimes per-division podium splits in sub-pages, sometimes nowhere
- **Randomized formatting per page** (different editor styles across 25 years of wiki history)

The deterministic 4-branch parser the pilot proposed would handle the structured Infobox fields fine but would have low fill-rate ceilings on results data and require either complex multi-path body parsing or accepting null winner for 80% of rows.

**LLM-driven extraction with a checklist + provenance** is the right tool: the LLM reads the page, extracts what's available (Infobox + body Results), and outputs structured JSON. Field-by-field fill rate climbs from ~19% (Infobox-only) to ~60-80% (Infobox + body).

### Players + clans stay deterministic

The pivot is **scoped to tournaments only**. Phase 2 (players, 5,900 rows) and Phase 3 (clans, 822 rows) shipped clean with the 4-branch deterministic parser. They're not getting touched. D4 amendment will read:

> Deterministic extraction for players and clans (Phase 2/3); LLM-with-checklist extraction for tournaments (Phase 4). Reasoning: tournament page structure is genuinely heterogeneous in a way player/clan pages aren't.

## Reads required (priority order)

1. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md`** -- the 30-column proposal + edge cases + is_substantive heuristic + has_note v1 rule. Stays as the schema reference; pivot to LLM-extraction does NOT invalidate the pilot's findings, just reframes them as "the checklist the LLM follows" instead of "the spec the deterministic parser implements."

2. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md`** -- 20 cross-cutting decisions. D4 (deterministic extraction) needs an amendment for the tournament carve-out. D9 (tournament schema TBD until pilot drives it) is satisfied by pilot output. D14 (Bun runtime) governs the loader script. D19 (no JSONB) still applies.

3. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md`** -- 29 findings. Particularly load-bearing for the design pass:
   - **F6** -- spec DDL is pre-D5; pilot is authoritative for column shape.
   - **F8** -- `tournament_results.tournament_slug` has NO FK; preserved.
   - **F16** -- 26 slash-title articles have empty wikitext; LLM extractor must handle gracefully (output role='metadata_tab' or just empty payload).
   - **F17** -- `.devil.json` is hidden; loader walk uses `readdirSync` / Bun.Glob.
   - **F23** -- silent DB drift; design must include cold-verify discipline.
   - **F24** -- V-probe expected values prone to spec drift; verify against LLM output, not hand-written values.
   - **F26** -- D6 5-signal heuristic for clans omits achievements; same shape may apply to tournament heuristic; LLM has more flexibility here.
   - **F27** -- HTML comment trim issue in `extractSectionBody`; if LLM extractor receives raw wikitext it doesn't matter, but if it receives wiki-stripped body sections, the same trim issue could surface.
   - **F28** -- doc-transcription discipline; cold-verify wrap-up numbers.
   - **F29** -- Phase 3 missed 24+ Infobox 4on4team articles (empty categories); Black_Book / Milton_s_Mutants / FAgomatic / ELAK in missing set. Phase 3.5 patch deferred; not blocking.

4. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-tournaments.md`** -- the existing Phase 4 MD (deterministic-path). 27k tokens; read in chunks. Tasks T1-T12 with execution-mode annotations. The redrafted Phase 4 MD will replace this.

5. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-template.md`** -- mandatory section order for any phase MD revisions.

6. **`docs/superpowers/parking/2026-05-05-qwiki-community-reference-phase-4-executor.md`** -- the executor prompt for the deterministic path. SUPERSEDED but kept as historical record. Read for context on the original three-halt structure (HALT 1 column-list / HALT 2 has_note tuning / HALT 3 phase-boundary V1-V14); the LLM-path will likely have a similar shape with adjusted task numbering.

7. **Phase 5 MD: `docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-5-cross-link-backfill.md`** (38k tokens, read summary first or via Explore subagent) -- assess whether the LLM-extraction output shape impacts Phase 5's tournament-row-JOIN logic. If LLM produces extra fields (tournament_role, llm_confidence, etc.), Phase 5 may need filter logic.

8. **Phase 6 MD: `docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-6-mcp-tools.md`** (52k tokens, read summary via Explore) -- assess whether `lookup_tournament` / `search_tournaments` / `lookup_by_nick` need tournament_role filtering or other adjustments.

9. **Operator memory in `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/`:**
   - `feedback_no_subagents_for_mechanical_edits.md` (sharpened version: subagent for code synthesis; inline only for purely textual edits)
   - `feedback_model_effort_range.md` (model+effort selection per task)
   - `feedback_no_inference.md` (verify against primary sources)
   - `feedback_be_decisive.md` (lead with recommendations)
   - `feedback_planning_first.md` (read code, plan, get approval)
   - `feedback_plain_english_at_decision_points.md` (lead with plain English at sub-decisions)

## Design checklist -- what the brainstorm must produce

The deliverable is a design doc + redrafted Phase 4 MD. The design doc covers these load-bearing decisions:

### 1. Migration 009 column list (lean catalog + provenance)

**Catalog columns (lean, 12 fields):** `series TEXT`, `season_number INT`, `year INT`, `start_date DATE`, `end_date DATE`, `tournament_type TEXT` (CHECK), `format TEXT`, `mode TEXT` (CHECK), `prize_pool TEXT`, `organizers TEXT[]`, `admins TEXT[]`, `founder TEXT`.

**Optional results columns (LLM populates if found):** `winner TEXT`, `winner_flag TEXT` (CHECK), `runner_up TEXT`, `runner_up_flag TEXT` (CHECK), `third_place TEXT`, `third_place_flag TEXT` (CHECK).

**Provenance columns (always present, LLM-extraction-specific):**
- `extracted_via TEXT NOT NULL` -- e.g., `'haiku-4.5-temp0-prompt-v1'`
- `extraction_prompt_hash TEXT NOT NULL` -- SHA256 of the prompt template + JSON schema; enables auditing model+prompt drift across re-runs
- `extracted_at TIMESTAMPTZ NOT NULL` -- when LLM produced the row
- `llm_confidence_summary TEXT` -- LLM's per-row confidence rollup (e.g., `'high'`, `'medium'`, `'low'`); details in note body if useful
- `tournament_role TEXT NOT NULL CHECK (tournament_role IN ('parent', 'sub_event', 'metadata_tab', 'match_report'))` -- LLM's autonomous classification

**Decisions to lock in design pass:**
- Final column list (open: should `format` stay free-form prose or get tightened?)
- CHECK constraints on enums (tournament_type, mode, winner_flag, etc.)
- Index strategy (Phase 5 cross-link JOIN keys: series, year, mode)
- Whether to add `parent_slug TEXT` for sub_event rows pointing at parent (improves Phase 6 hierarchy queries; small cost)

### 2. LLM extraction prompt template + JSON schema

The prompt design is the load-bearing artifact. Components:

- **System role:** clear identity ("you are extracting structured tournament metadata from QuakeWorld wiki articles").
- **Input format:** raw wikitext + categories + slug + revision_id. (Decision: pass full wikitext or pre-clean? Recommendation: pass raw; LLM handles wikitext markup.)
- **Output JSON schema:** exact shape including all catalog fields + provenance fields + per-field confidence + tournament_role + null semantics.
- **Field-by-field instructions:** what counts as "organizer" vs "admin" vs "founder" (the OR-fold from pilot Q5); how to disambiguate Infobox `teamfirst` from body `==Results==` first place; how to handle multi-mode tournaments (Q2: mode='mixed'); how to handle date-format variants (ISO / dot-separated / range / month-only).
- **tournament_role classification rules:** explicit examples per role.
- **Anti-patterns:** what NOT to extract (don't infer; don't fill nulls with placeholder; don't merge data from sibling pages).
- **Output discipline:** ASCII-only (D13); strict JSON (no markdown fences in output); no commentary.

**Decision points:**
- Single-page prompt vs structured prompt with separate field instructions
- Few-shot examples (how many; which fixtures)
- Temperature (recommend 0)
- Token budget per call
- Retry-on-malformed-JSON strategy (re-prompt with error context vs hard-fail)

### 3. Runner architecture

The Phase 4 loader becomes:

```
walk articles directory --> filter to tournament-category articles 
  --> for each: dispatch LLM call --> parse JSON output 
    --> validate against schema --> upsert row (skip if role IN ('metadata_tab', 'match_report'))
      --> emit note if has_note=true (deterministic body-section grab)
```

**Decisions:**
- Batch size (1 article/call vs N articles/call). Recommend 1/call for clean error isolation; batched if cost/latency matters.
- Concurrency (sequential vs parallel; rate-limit handling).
- Idempotency: rerun-safe via UPSERT + provenance comparison (skip if `extraction_prompt_hash` unchanged AND `wiki_revision_id` unchanged).
- Failure handling: malformed JSON, model API errors, schema-validation failures.
- Cost monitoring: estimated $5 corpus-wide; ground-truth via Voyage-style embedding_api_log (or equivalent).

### 4. Verification posture

- **Spot-check sample:** N random articles (recommend 50) compared against wiki page; precision target (95%+).
- **Cold V-probes** at phase boundary: row count, role distribution, source-template (LLM-output) distribution, internal-consistency cross-checks.
- **Reproducibility test:** re-run on 10 articles with same prompt+model; compare outputs; expect byte-identical or near-identical (provenance hash must match).
- **F1-style regression gate:** new probe `F1.tournaments_provenance_present` -- every row has non-null `extracted_via`, `extraction_prompt_hash`, `extracted_at`.

### 5. Phase 5 + Phase 6 impact analysis

Walk the existing Phase 5 + Phase 6 MDs against the new tournament row shape. Surface any contract drift:

- Phase 5 cross-link backfill: does its fuzzy-match logic need to filter by `tournament_role='parent'` or `tournament_role IN ('parent', 'sub_event')`? (Recommend the latter.)
- Phase 6 MCP tools: does `lookup_tournament` / `search_tournaments` need a role filter param? Or default-filter to parent+sub_event?
- Phase 5 + 6 may need small amendments; document them as part of the design doc.

### 6. has_note rule

Pilot proposed 8 clauses with bracket_section >= 600B threshold. With LLM extraction, has_note can be:
- (a) deterministic: emitted from wiki-section presence + length thresholds (T9 emit-note.ts grabs body sections deterministically; LLM doesn't decide has_note).
- (b) LLM-driven: LLM judges has_note based on content uniqueness.

Recommend **(a) -- deterministic has_note + deterministic note body** (option (a) from prior conversation). Notes stay regenerable from wikitext alone; rows get LLM enrichment. Cleanest split.

### 7. Operator-confirmed Q1-Q7 from pilot output

T2 operator decisions (from this conversation, to be locked in design doc):
- Q1 match-report exclusion: option (a) -- skip via tournament_role='match_report'.
- Q2 multi-mode: mode='mixed', single row.
- Q3 slash-title sub-events: LLM autonomously classifies (parent / sub_event / metadata_tab); loader skips metadata_tab.
- Q4 JSONB: option (a) -- TEXT[] only.
- Q5 founder OR-fold: option (a) -- organizers ∪ admins ∪ founder.
- Q6 bullet-prose markers: deferred (LLM doesn't need bullet-prose detection; it reads the page).
- Q7 LAN biographical fields: option (a) -- preserve in note body, not row columns.

### 8. Redrafted Phase 4 MD

Output: a new `phase-4-tournaments.md` (or `phase-4-tournaments-v2.md` to preserve history) following `phase-template.md` shape. Tasks restructured:

| T# | What | Execution mode |
|---|---|---|
| T1 | Pilot (Opus MAX subagent) | DONE -- pilot output is schema reference |
| T2 | Operator review gate | DONE -- this conversation |
| T3 | Migration 009 (lean catalog + provenance fields) | subagent (Sonnet medium) |
| T4 | LLM extraction prompt + JSON schema design | subagent (Sonnet MAX) -- judgment-dense |
| T5 | LLM extraction script (`extract.ts` -- runner with retry/validation) | subagent (Sonnet medium) |
| T6 | Golden-output tests (10 fixture articles, expected JSON) | subagent (Sonnet medium) |
| T7 | flags.ts (is_substantive computed from LLM-output structured fields) | subagent (Sonnet medium) |
| T8 | upsert.ts (LLM JSON --> DB rows) | subagent (Sonnet medium) |
| T9 | emit-note.ts (deterministic body-section grab; D18) | subagent (Sonnet medium) |
| T10 | index.ts CLI dispatcher (LLM extraction --> upsert --> notes) | subagent (Sonnet medium) |
| T11 | First full run + 50-sample spot-check + has_note tuning | inline (operator-in-the-loop) |
| T12 | SCHEMA.md + decisions.md D4 amendment + commit | inline |

V-probes restructured to validate role distribution, provenance presence, sample correctness; specifics derived from new schema.

## Open questions for the design pass to resolve

These should be answered in the design doc, with rationale:

- **Q-DESIGN-1:** Single LLM call per article (clean error isolation, ~1150 calls for parents+sub-pages) vs batched (N articles per call, fewer API requests, but error-handling more complex)?
- **Q-DESIGN-2:** Pass raw wikitext to LLM, or pre-clean (strip templates, decode wikilinks)? Recommend raw; LLM is fine with wikitext markup.
- **Q-DESIGN-3:** Retry-on-malformed-JSON strategy: re-prompt with error context (one retry) vs hard-fail to a quarantine list for operator review?
- **Q-DESIGN-4:** Should `parent_slug` column be added (improves Phase 6 hierarchy queries; LLM populates it for sub_event rows from title pattern)?
- **Q-DESIGN-5:** Reproducibility gate: when does Phase 4 re-run? (a) when wiki snapshot updates (`wiki_revision_id` changes); (b) when prompt/model changes (`extraction_prompt_hash` changes); (c) both? Idempotency strategy.
- **Q-DESIGN-6:** Cost-tracking: should there be a `tournament_extraction_log` table (similar to `embedding_api_log` from Arc 1) tracking per-call cost and timing? Or rely on Anthropic API logs?
- **Q-DESIGN-7:** Sub-page coverage decision: load all 553 slash-title pages and let LLM filter (clean autonomy) vs operator-curated allowlist (smaller corpus, less LLM cost)? Recommend former.
- **Q-DESIGN-8:** Should the LLM extract player/team mentions from the body (for Phase 5 alias indexing) or stay scoped to row-shape data only? Recommend latter for v1; player-mention extraction is a future enrichment.
- **Q-DESIGN-9:** Phase 5 amendment: filter cross-link logic by `tournament_role IN ('parent', 'sub_event')`? Lock in design pass.
- **Q-DESIGN-10:** Phase 6 amendment: `lookup_tournament` default-filters to parent+sub_event roles? Add `--include-all-roles` flag for power users?

## Edge cases to address

- **Empty-wikitext articles (F16):** ~26 slash-title articles with empty body. LLM should output role='metadata_tab' (or similar minimal-payload state); loader skips.
- **Match-report pages (Q1):** 3-of-3 marker rule (`Competition` + `Round` + `Match`). LLM classifies as role='match_report'; loader skips.
- **Multi-division tournaments (EQL Cup 3 has 3 podiums):** LLM outputs primary winner from the parent's Infobox if filled, else NULL. Per-division podiums live in sub_event rows (Division_1, Division_2, Division_3) if the wiki has them.
- **Non-ASCII content in wiki (Russian/Finnish/Swedish names):** preserved as-is; only LLM script output (logs, JSON keys, etc.) is ASCII per D13.
- **Year-only / month-only date strings:** LLM extracts what it can; nulls the rest. Don't infer years from context.
- **Currency variants in prize_pool:** raw text passthrough; no parser for SEK/EUR/USD/Yes/Fame & Glory.

## Recommended brainstorm shape

The design pass is one extended brainstorming session, not multi-pass. Recommended structure:

1. **Read scaffold + pilot output cold** (30 min). Anchor on what's done.
2. **Walk Q-DESIGN-1 through Q-DESIGN-10** (1 hour). Decision per question with rationale; capture as locked decisions in the design doc.
3. **Draft prompt template + JSON schema** (45 min). Include 2-3 few-shot examples from pilot fixture articles. Field-by-field extraction instructions.
4. **Walk Phase 5 + Phase 6 MDs for impact** (30 min). Surface any amendments; capture as small inline edits to those phase MDs OR as Q-DESIGN-9/10 decisions for executor to apply.
5. **Draft redrafted Phase 4 MD** (45 min). Following phase-template.md. Restructured T1-T12 with new execution modes.
6. **Self-verification subagent dispatch** (30 min). Sonnet medium Explore-shape subagent reads design doc + redrafted MD against decisions.md + review-findings; reports drift.

Total estimated time: 3-4 hours including verification.

## Output paths

- **Design doc:** `docs/superpowers/specs/2026-05-05-qwiki-tournament-llm-extraction-design.md` -- frozen reference; captures the prompt template, JSON schema, runner architecture, provenance shape, sub-page classification rules, Phase 5/6 impact, Q-DESIGN-1..10 decisions.
- **Redrafted Phase 4 MD:** `docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-tournaments.md` -- replaces the existing file. Old version preserved in git history.
- **D4 amendment:** appended to `docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md` as a dated amendment block under the original D4 entry.
- **Pilot output preservation:** `phase-4-pilot-output.md` stays unchanged. Reframed as schema reference, not deterministic-parser spec.

## Halt-and-report contract

When the design pass converges, halt and report back to the operator with:

- **Status code:** READY_FOR_REVIEW | NEEDS_CONTEXT | BLOCKED.
- Path to design doc + redrafted Phase 4 MD.
- Plain-English summary of the design (column list, prompt approach, runner architecture, sub-page handling).
- Q-DESIGN-1..10 decisions + rationale.
- Phase 5 + Phase 6 impact summary (amendments needed; severity).
- Any new findings (F30+) that surfaced during the pass.
- Recommendation: "ready to fire orchestrator session #3" or "needs another design pass."

The operator reviews the design doc + redrafted MD, signs off (or revises), then opens a fresh terminal as orchestrator session #3 to execute the amended Phase 4 plan.

## When in doubt

- **Pilot output contradicts a Q-DESIGN decision** -> Q-DESIGN wins (this is the design pass's job; pilot output is reference, not constraint).
- **Decision crosses Phase 5/6 contract** -> capture as a Phase 5/6 amendment; don't bury inside Phase 4.
- **Design grows beyond Phase 4** (e.g., needs schema changes touching multiple phases) -> escalate to `arc-brainstormer` mid-session; signal intent to operator before changing course.
- **Cost estimate diverges substantially from $5** -> surface; operator decides.
- **Reproducibility is hard to guarantee** (Haiku 4.5 has non-trivial output variance even at temp=0) -> document the variance ceiling; design provenance to detect and re-run on drift.

---

## Orchestrator notes (not part of brainstorm prompt)

This handoff was written by orchestrator session #2 at 2026-05-05, ~150k context, Phase 4 paused at T2 boundary.

**Pause-state captured artifacts** (committed alongside this handoff):
- F29 in `review-findings.md` (Phase 3 missed 24+ infobox_4on4team articles).
- README "Where we are right now" updated to reflect pause + side-quest state.
- `phase-4-executor.md` parking doc marked SUPERSEDED with a banner pointing here.
- HANDOVER.md entry added to "Recently opened" (will move to "Active arcs" on side-quest pickup).
- This parking doc.

**After the design pass completes, orchestrator session #3:**
1. Reads the design doc + redrafted Phase 4 MD cold.
2. Updates README "Where we are right now" to reflect Phase 4 ready-for-execution.
3. Drafts a new Phase 4 executor parking doc following the LLM-extraction path.
4. Surfaces sign-off + execution recommendation to operator.
5. Operator opens fresh terminal, pastes new executor prompt, runs `arc-executor` skill.
6. Three halts: HALT 1 after T6 golden tests (operator reviews fixture extraction quality), HALT 2 after T11 first full run + sample spot-check (operator reviews 50-sample correctness + tunes has_note if needed), HALT 3 at phase boundary V-probes.

**Context budget projection:**
- This brainstorm session: ~80-150k expected (heavy on schema reads + design synthesis).
- Orchestrator session #3 to draft executor + drive Phase 4: ~120-180k expected.
- Phase 4 executor terminal: ~150-220k expected.
- All comfortably under 350k smell zone.

## Mid-flow resume artifacts (2026-05-06)

The brainstorm session hit ~400k context after producing concrete intermediate artifacts (5 year cohort extractions under prompt v7 + canonicalization supervisor). Resume handoffs + review work product preserved at:

- `docs/superpowers/parking/2026-05-06-qwiki-phase-4-investigative-resume.md` — mid-flow investigative session resume prompt.
- `docs/superpowers/parking/2026-05-06-qwiki-phase-4-brand-discovery-resume.md` — fresh-terminal resume for the canonicalization pivot that surfaced after the investigative session.
- `docs/superpowers/parking/2026-05-06-qwiki-phase-4-canonical/` — companion folder with README + `operator-review.md` (214 rows × 5 year batches of canonicalization edge cases needing operator judgment) + `supervisor-design.md` (canonicalization supervisor design sketch).

Review for relevance when Phase 4 resumes; some decisions in `operator-review.md` may already have been made or rendered moot by D4 pivot to LLM-with-checklist extraction.
