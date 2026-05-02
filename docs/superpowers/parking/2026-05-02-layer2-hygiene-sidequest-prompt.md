# Layer 2 hygiene sidequest -- research + scope prompt

**Status:** Awaiting fresh session. Research + scope pass only -- NOT implementation.
**Created:** 2026-05-02 by operator after Layer 2 quality assessment in main session.
**Output:** A design doc at `docs/superpowers/specs/<date>-layer2-hygiene-design.md` proposing arc scope, ordering vs Arc 1, and a per-issue triage table. Operator reviews before any phase MDs are drafted.
**Halt point:** Design doc + arc proposal landed. NO phase MDs in this session. NO implementation.

---

## What this sidequest is

The QW Oracle Arc 1 (Postgres + hybrid retrieval) ports Discord-only Layer 2 as-is to Postgres + tsvector. Spec deliberately scopes Layer 2 enrichment (segment / classify / summarise / embed) to Arc 3.

But Layer 2 today has known quality problems that affect *gap-finding* -- the manual loop the operator runs (Discord question -> MCP -> no answer -> topic candidate). Better Layer 2 hygiene improves that loop *before* Arc 3 enrichment ships, materially helping post-Arc-1 detective work for both retroactive mining and forward freshness.

This sidequest scopes which of those problems are worth fixing in their own focused arc vs deferring to Arc 3 vs folding into Arc 1 Phase 3 at port time.

The operator is NOT in a hurry -- willing to insert a clean sidequest arc before Arc 1, after Arc 1, or fold cheap fixes into Phase 3. Decision content is the ordering and arc shape, not the speed.

Operator's leaning (per main-session 2026-05-02): a sidequest arc fits the spirit of the broader oracle work (quality of search results and output). Fresh session should validate that lean against the cost / risk picture, not just rubber-stamp it.

---

## Issues surfaced in main-session assessment (2026-05-02)

Live numbers from `apps/qw-oracle/data/qw.db`:

```
Messages by category (out of 2.66M total):
  chat       1,486,716  (55.9%)
  system     1,005,844  (37.8%)
  reaction     122,608   (4.6%)
  link          26,303   (1.0%)
  bot           19,893   (0.7%)

Sessions (127K total) by chat-msg count:
  1-2          62,748 sessions  <- 49% are micro-sessions
  3-5          26,345 sessions
  6-10         12,509 sessions
  11+          21,808 sessions  <- substantive zone
  101+          2,699 sessions  <- deep discussions
```

Note: above includes both Discord and IRC. D9-revised excludes IRC from Arc 1; this sidequest must restrict scope to Discord-only as well.

Issues in rough order surfaced:

1. **System message volume (37.8%)** -- 1M rows of join / pin / thread / boost noise. Correctly tagged 'system' so chat-stream queries skip them, but they sit in `messages` and would sit in Postgres after Arc 1 port. Wastes rows; if anything ever embeds them, wastes embedding budget.

2. **Micro-session over-segmentation (49%)** -- 15-min gap heuristic in `process-tier1.mjs` produces 62K sessions of 1-2 chat msgs. Mostly fragments, not real discussions. Drowns signal in `search_solved_issues`. LLM-summarising 62K micro-sessions in Arc 3 is wasteful and produces noise summaries.

3. **Bot detection brittle** -- hard-coded patterns at `process-tier1.mjs:26-30`: `^[!.]\w/`, specific bot names ('fishbot', 'logan', etc.). Misses any new bot, false-positives on `!important note here`. 19,893 messages flagged today; precision and recall both unverified.

4. **Reaction list hand-curated** -- ~30 English emoticons + Unicode emoji regex at `process-tier1.mjs:33-50`. Misses non-English reactions ("ja", "nej", "spasibo"), Discord custom emojis (`:smile:`), emote shorthands. 122K messages flagged today; quality unverified.

5. **No language detection** -- multi-language corpus (D7 in Arc 1 decisions handles tsvector via `'simple'` config). But Arc 3 LLM summarisation will need real per-message language detection to route correctly. Today: nothing.

6. **No reply-thread awareness** -- `messages.referenced_message_id` IS captured at import, but `process-tier1.mjs` ignores it for session segmentation. Real Q&A threads have asker -> responder structure; today everything is flat by timestamp.

7. **No quality / signal-density scoring** -- "lol" and "the bind for `+fire_ar` changed in 3.6.6 because of issue #1117" both score equal as chat. Arc 3 enrichment will need a weight to know which messages carry signal.

8. **Author attribution drift** -- `messages.author_name` captured but no normalisation across Discord display-name changes. Same person can become two authors in stats. Low-pressure but affects authority weighting in answer-shape.

9. **One-shot ingest -- no live freshness path.** Today's pipeline is one-shot: Discord export JSON -> import. Staying current with live Discord requires either re-export-then-re-import or building a bot-live ingest path. Not addressed in Arc 1 (which ports the existing one-shot model). Affects ongoing freshness for gap-finding. Tied to broader operational-triangle question (local dev / Unraid / Xerial) deferred from main session.

10. **Channel allowlist implicit** -- `import-discord.mjs` ingests every JSON file in the export dir. Showcase parking doc (2026-04-30) mentions "channel allowlist" as a future filter for Layer 2 mining. Not built today. Affects whether off-topic channels (e.g., off-game social) dilute the corpus.

Operator may add issues during the research pass -- these 10 are what the main session surfaced; not exhaustive. Fresh session should explicitly look for additional gaps when reading the code.

---

## What the fresh session does

1. **Read current state** -- files listed below.
2. **Verify live numbers** -- re-run `node scripts/stats-tier1.mjs` from `apps/qw-oracle/`; spot-check sample sessions across categories with random-sampling SQL; confirm the 10 issues above against current code.
3. **Expand the issue list** -- surface anything missed during main-session assessment. Prefer SQL probes against `data/qw.db` over inference. For each new issue, attach evidence (a query result, a code grep, a sample row).
4. **Per issue, propose a triage decision:**
   - **Port-time filter** -- add as a WHERE clause in Arc 1 Phase 3's port script. Cheap, deterministic, no design pass needed.
   - **Sidequest arc** -- focused enough to design + ship in a small arc; doesn't belong in Arc 3's bigger enrichment design pass.
   - **Arc 3 enrichment** -- needs LLM-driven design pass; defer to Arc 3 brainstorm.
   - **Reject** -- not worth fixing; document reason.
5. **Recommend arc ordering vs Arc 1** -- three options to consider:
   - **(a) Pre-Arc-1 sidequest** -- fix tier-1 first, then Arc 1 ports the cleaner state. Reduces Postgres-side cleanup work, but pushes Arc 1's start.
   - **(b) Post-Arc-1 sidequest** -- Arc 1 ships, then sidequest improves Layer 2 in Postgres. Postgres tooling (window functions, GIN, language detection extensions) may make cleanup easier than in SQLite.
   - **(c) Fold into Arc 1 Phase 3** -- Phase 3 absorbs cheap port-time filters; harder fixes defer to a small sidequest arc later or to Arc 3.
   
   Pick one; defend it; name the trade-off the rejected options surface.
6. **Halt for operator review** -- present the design doc + arc proposal. Operator decides arc ordering. NO phase MDs are drafted by this session.

---

## Files to read at start

**Architecture and arc context:**
- `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md` -- the Arc 1 spec. Especially Layer 2 sections + Arc 3 sketch + D9-revised on Discord-only.
- `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md` -- locked decisions, especially D7 (`'simple'` tsvector for L2) + D9-revised (Discord-only).
- `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/README.md` -- phase index.
- `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-3-layer2-port.md` -- what Phase 3 already plans. Critical: read this to know what Phase 3 covers before proposing port-time additions.
- `apps/qw-oracle/VISION.md` -- mental model + answer-shape philosophy + library-as-headstart framing (added 2026-05-02).

**Current Layer 2 code:**
- `apps/qw-oracle/scripts/db.mjs` -- schema (messages + sessions + message_labels + session_search FTS5).
- `apps/qw-oracle/scripts/import-discord.mjs` -- raw ingest.
- `apps/qw-oracle/scripts/import-irc.mjs` -- IRC ingest (excluded under D9-revised, but useful context).
- `apps/qw-oracle/scripts/process-tier1.mjs` -- segmentation + classification (the load-bearing file for issues 1-7).
- `apps/qw-oracle/scripts/build-search-index.mjs` -- FTS5 build.
- `apps/qw-oracle/scripts/stats-tier1.mjs` -- stats + sample dumps.
- `apps/qw-oracle/scripts/sample-helpdesk.mjs` -- gap-finding raw-material dumper.
- `apps/qw-oracle/scripts/helpdesk-coverage.mjs` -- channel-stats dumper.

**Memory worth checking:**
- `feedback_no_inference.md` -- verify before asserting.
- `feedback_idempotency_before_staleness.md` -- DB row-count anomalies are usually re-run bugs.
- `project_qw_oracle_irc_encoding_gap.md` -- the IRC codepage story (informs why D9-revised dropped IRC).
- `project_qw_oracle_product_vision.md` -- active-assistance framing.

**Live DB to query:**
- `apps/qw-oracle/data/qw.db` -- Layer 2 SQLite, ~1.6 GB. Read-only probes via the existing `getDb()` in `scripts/db.mjs`. Do NOT modify it -- this is the corpus the Arc 1 port will read.

---

## Output shape

Single design doc at `docs/superpowers/specs/<date>-layer2-hygiene-design.md` with:

1. **Summary** -- one paragraph, the proposed arc shape + ordering recommendation.
2. **Verified live state** -- re-run `stats-tier1.mjs` numbers + any new probes; assert against existing claims; flag any drift from this prompt's numbers.
3. **Issue triage table** -- one row per issue: name, current evidence (file:line or SQL), proposed fix (one-line), ordering bucket (port-time / sidequest / Arc 3 / reject), rationale (one-line).
4. **Arc proposal** -- if a sidequest is warranted, name it, list its phases, list its dependencies on Arc 1, list its successors (post-arc handoff to Arc 3). Use `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-template.md` as the per-phase shape if the arc is multi-phase.
5. **Discord-only scope confirmation** -- explicitly state that all proposed work respects D9-revised; IRC stays out.
6. **Open questions for operator** -- bottom of doc, explicit decisions the operator needs to make before any phase MDs are drafted.

After landing the design doc, halt for operator review. Do NOT draft phase MDs in this session. Do NOT touch `data/qw.db`.

---

## Operator preferences (apply throughout)

- **Verify before asserting.** Hit `data/qw.db` directly for any numeric or shape claim. No inference passed off as fact.
- **Plain English first, technical chain second.** Decision content goes first; mechanism only where it carries decision weight.
- **Be decisive.** Recommendations, not polls. If two options are close, pick one and explain why.
- **One question at a time** during any operator interaction.
- **ASCII output discipline.** No em / en dashes; use `--`. No emoji. No marketing voice.
- **Comments explain WHY, not WHAT.**
- **Trust operator pace estimates** -- don't pad estimates conservatively.
- **No subagents for execution.** Subagents fine for verification (re-running stats, spot-checking samples). All design synthesis stays in main session.

---

## Halt-for-review trigger

Stop and surface the design doc to the operator when:
- Issue triage is complete (all 10 above + any new issues found).
- Arc proposal is written.
- Open questions for operator are listed.
- Discord-only scope is explicitly confirmed.

The operator decides arc ordering vs Arc 1. The fresh session does not draft phase MDs and does not start implementation.

---

*End of prompt.*
