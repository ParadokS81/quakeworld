# Layer 2 hygiene -- arc-scope design

**Status:** Awaiting operator review (research + scope only; no phase MDs).
**Author:** Claude (Opus 4.7) + ParadokS, fresh session 2026-05-02 acting on the parking prompt at `docs/superpowers/parking/2026-05-02-layer2-hygiene-sidequest-prompt.md`.
**Companion docs:** `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`, `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md`, `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-3-layer2-port.md`.

---

## Summary

The 10 quality issues raised in main session were measured against the live Discord-only corpus (`data/qw.db`, 717,389 messages, 88,214 sessions). Under D9-revised's IRC exclusion, six of those ten dissolve to rounding error or moot, two are Arc 3 enrichment territory, and only one (micro-session over-segmentation, 51% of Discord sessions) is both real and substantively design-y.

**Recommendation: option (c) -- fold cheap port-time fixes into Arc 1 Phase 3, defer the design-y micro-session reduction to a small post-Arc-1 sidequest (1-2 phases).** The pre-Arc-1 sidequest variant (option a) polishes SQLite code that's about to be deleted; the pure post-Arc-1 variant (option b) needlessly delays cheap fixes that cost a few lines inside an already-being-edited file. The hybrid lands the freebies during the port and reserves real arc shape for the one issue that actually needs design work.

The trade-off the rejected options surface: option (a) buys a very slightly cleaner port at the cost of churn on retiring code; option (b) buys one less phase-MD edit at the cost of carrying known noise into the public demo. Neither is worth the cost.

---

## Verified live state (2026-05-02)

`scripts/stats-tier1.mjs` re-run (full output cached at `/tmp/.../bb8ay2xfi.output`) plus targeted SQL probes confirm the prompt's combined numbers AND show the picture under D9-revised's Discord-only constraint.

### Combined-corpus numbers (match prompt)

| Metric | Value | Prompt claim | Match? |
|---|---|---|---|
| Total messages | 2,661,364 | 2.66M | yes |
| chat | 1,486,716 (55.9%) | 55.9% | yes |
| system | 1,005,844 (37.8%) | 37.8% | yes |
| reaction | 122,608 (4.6%) | 4.6% | yes |
| link | 26,303 (1.0%) | 1.0% | yes |
| bot | 19,893 (0.7%) | 0.7% | yes |
| Sessions 1-2 chat | 62,748 | 62,748 | yes |
| Sessions 11+ chat | 21,808 | 21,808 | yes |

Combined numbers verified. Every issue in the prompt traces back to true code state.

### Discord-only restated numbers (the picture Arc 1 actually faces)

| Metric | Discord-only | Combined | Discord share |
|---|---|---|---|
| Messages | 717,389 | 2,661,364 | 27.0% |
| chat (labeled) | 664,830 | 1,486,716 | 44.7% |
| system (labeled) | 144 | 1,005,844 | **0.014%** |
| reaction (labeled) | 25,878 | 122,608 | 21.1% |
| link (labeled) | 17,381 | 26,303 | 66.1% |
| bot (labeled) | 9,156 | 19,893 | 46.0% |
| Sessions total | 88,214 | 127,847 | 69.0% |
| Sessions empty (0 chat) | 4,272 (4.8%) | -- | -- |
| Sessions 1-2 chat | 45,213 (51.3%) | -- | -- |
| Sessions 26+ chat (substantive) | 5,376 (6.1%) | -- | -- |
| Distinct authors (by author_id) | 2,723 | -- | -- |
| Authors with 2+ usernames | 0 | -- | -- |
| Messages with referenced_message_id | 32,863 (4.6%) | -- | -- |

### Per-channel Discord inventory

| Channel | Messages | Sessions | Micro % | Date span |
|---|---|---|---|---|
| #quakeworld | 387,851 | 45,615 | 52.6% | 2016-04 -> 2026-02 |
| #dev-corner | 206,739 | 25,755 | 47.9% | 2016-05 -> 2026-02 |
| #helpdesk | 103,361 | 14,386 | 52.2% | 2020-05 -> 2026-02 |
| #antilag | 19,438 | 2,458 | 55.6% | 2021-06 -> 2026-02 |

Micro-session ratio is consistent across all 4 channels (47.9-55.6%) -- structural to the 15-min gap heuristic, not a per-channel artifact.

### Bot category audit (Discord only, 9,156 rows)

| Source | Count | Share |
|---|---|---|
| author_is_bot=1 (Discord's own flag) | 8,797 | 96.1% |
| Pattern-flagged from humans (`^[!.]\w` etc.) | 359 | 3.9% |

Random sample of pattern-flagged human messages shows mostly false positives: `.qwd`, `.zip`, `.lbm?`, `.026 / .022 * 10.3`, `!Voteban woods`, `.tar.gz starts working`, `.a for mingw32 and .lib for msvc`. These are content, not commands. Precision on the human-pattern slice is poor; volume is small.

### Reaction audit (Discord only, 25,878 rows)

Top entries by frequency: emoji and short emoticons -- correctly tagged. Hand-curated list does miss non-English short responses ("ja", "nej", "spasibo"), but the Discord corpus has thousands of multi-character chat messages already short-listed correctly. No evidence of large-volume miss on Discord.

---

## Issue triage table

The 10 issues from main session, plus 4 surfaced during this research pass. Each row: where the issue lives, what the evidence says under Discord-only, the proposed disposition, and rationale.

| # | Issue | Evidence (file / SQL) | Disposition | Rationale |
|---|---|---|---|---|
| 1 | System message volume (prompt: 37.8% / 1M rows) | combined 1,005,844 (37.8%); Discord-only 144 (0.02%) | **reject** | Under D9-revised the issue evaporates. 144 system-tagged Discord messages are noise-level; Phase 3 already filters them via `message_type` mapping in `import-discord.mjs:13-25` and `process-tier1.mjs:58-60`. |
| 2 | Micro-session over-segmentation (51%) | `process-tier1.mjs:21` (`GAP_THRESHOLD_MINUTES=15`); 45,213/88,214 Discord sessions are 1-2 chat msgs | **sidequest** | Real, design-y. 51% of session-rows are 1-2 chat msgs but only 7% of chat-msg mass. Hurts (a) result counting in `search_solved_issues`, (b) Arc 3 enrichment budget (45k summary calls), (c) plausibly retrieval ranking. Mitigation needs design (dynamic gap; reply-chain merging; reaction-only filtering); not mechanical. |
| 3 | Bot detection brittle | `process-tier1.mjs:26-30`; 359 false-positive candidates Discord-only | **port-time** | 96% of Discord bot-tagged rows trust `author_is_bot` (correct). The 4% pattern-flagged human slice is mostly false positives. Cheap fix at port: skip `BOT_COMMAND_PATTERNS` for Discord rows (trust author_is_bot only) -- Discord exposes a reliable bot flag, IRC was the original audience for the patterns. |
| 4 | Reaction list hand-curated | `process-tier1.mjs:33-50`; Discord-only 25,878 (4.6%) | **reject (port-time accept current shape)** | Top reactions on Discord are correctly tagged emoji / lol / haha / hehe / etc. Non-English short-response gap is real but small in absolute terms. Phase 3 ports the list 1:1; better coverage is Arc 3's per-message language-detection territory. Don't expand the list at port. |
| 5 | No language detection | `process-tier1.mjs` has none; `messages.content` mixed-language | **Arc 3** | Arc 3's segment / classify / summarise pipeline needs per-message language tagging to route correctly. Search-time language is already addressed by D7 (tsvector `'simple'`). No port-time work. |
| 6 | No reply-thread awareness | `import-discord.mjs:90` captures `referenced_message_id`; `process-tier1.mjs` ignores it; 32,863 Discord messages have replies; micro-sessions have 11.7% reply rate vs 4.0% for larger sessions | **sidequest (folds with #2)** | Reply-aware merging is one design knob for the micro-session reduction work. ~5,300 micro-sessions are replies and could merge with their reference's session. Same arc as #2. |
| 7 | No quality / signal-density scoring | `process-tier1.mjs` has nothing | **Arc 3** | Arc 3 enrichment territory; needs LLM scoring. Out of port-time and out of small-sidequest scope. |
| 8 | Author attribution drift | `messages.author_id` and `author_name` columns; SQL probe shows 0 Discord authors with 2+ usernames, 1 with 2+ display names | **reject** | Discord author_id is a stable snowflake. Drift is an IRC concern, dissolved under D9-revised. |
| 9 | One-shot ingest -- no live freshness | `import-discord.mjs:7` (`EXPORTS_DIR`); no live bot path | **out of scope** | Operational / architecture question (re-export vs bot-live ingest, deploy topology, who runs the bot). Not a Layer 2 *hygiene* issue. Tied to the deferred operational-triangle question. |
| 10 | Channel allowlist implicit | `import-discord.mjs:49-50`; live state shows 4 Discord channels (#antilag #dev-corner #helpdesk #quakeworld), all QW-relevant | **reject** | Implicit-but-correct under D9. The export-dir filter (`!startsWith('sample-')`, `!startsWith('backfill-')`) plus the operator-curated set of 4 channels is sufficient. A formal allowlist adds nothing today. |
| A1 | Empty-chat sessions exist | 4,272 sessions with chat_message_count=0 contain only bot/reaction/system content (4,877 bot + 1,142 reaction + 2 system rows) | **port-time** | `build-search-index.mjs:23` already filters them, so they don't pollute search. They consume rows in `sessions` and `message_labels` for no benefit. Cheap fix: skip session creation when `sessionChatCount==0`. Schema implication: `message_labels.session_id` may need to allow NULL to keep label rows for non-chat messages -- see Open question 1. |
| A2 | Bot pattern false positives | sample shows `.qwd`, `.zip`, `.026 / .022 * 10.3`, `!Voteban` mis-flagged | **port-time** | Same fix as #3: trust `author_is_bot` only on Discord. Folds into one port-time edit. |
| A3 | Duplicate `'xd'` in reaction list | `process-tier1.mjs:39` and `:43` both contain `'xd'` | **port-time** | Cosmetic (Set dedupes), but the freebie removal at port (`scripts/load-chat/classify.ts`) is one keystroke. |
| A4 | session_search content includes author names | `build-search-index.mjs:53` formats lines as `${author_name}: ${content}` | **reject (intentional)** | Phase 3 ports this 1:1 (`phase-3-layer2-port.md:951`). A query "spoike cl_bob" will match sessions Spoike participated in, which is desirable. Flag if Phase 6 changes search_solved_issues output shape -- not a hygiene issue. |

### Disposition counts

- **port-time** (fold into Phase 3): 4 -- A1, A2 (= #3 mechanism), A3, plus the explicit clarification that #3's pattern slice goes away
- **sidequest** (post-Arc-1, 1-2 phases): 2 -- #2 and #6 (one arc, two angles)
- **Arc 3** (defer to LLM enrichment design): 2 -- #5, #7
- **reject / out of scope**: 6 -- #1, #4, #8, #9, #10, A4

The collapse from 10 prompt issues to ~2 substantive ones is the single most decision-relevant finding here. Most of the original picture's weight came from IRC-scale volumes (system messages, IRC reactions, IRC author renames) that D9-revised already excluded.

---

## Arc proposal

### Port-time hygiene (NOT a sidequest -- fold into Arc 1 Phase 3)

These are 4 changes inside files Phase 3 is already creating from the SQLite originals. Estimated total edit size: 10-25 lines across `scripts/load-chat/classify.ts` and `scripts/load-chat/build-sessions.ts`. No schema change beyond Open question 1. Suggest the operator add a "hygiene tightening at port" task to Phase 3's task list, OR amend `decisions.md` with a small D-section pointing at the changes. Either is cheap.

The four changes:

1. **Trust `author_is_bot` only on Discord; remove the `BOT_COMMAND_PATTERNS` regex slice.** In `classify.ts` (the Phase 3 port of `process-tier1.mjs:23-93`), drop the `BOT_COMMAND_PATTERNS` check after `if (msg.author_is_bot) return 'bot';`. Reduces false-positive bot tags from 359 to 0 on Discord. Patterns were originally for IRC, which is excluded under D9-revised.
2. **Skip empty-session creation.** In `build-sessions.ts` (the port of `process-tier1.mjs:117-144`), make `flushSession` a no-op when `sessionChatCount === 0`. Drops 4,272 Discord sessions of pure noise. Schema implication: see Open question 1.
3. **Remove duplicate `'xd'`** from the reaction list. Cosmetic.
4. **Document the four hygiene tightenings in Phase 3's `tasks` and verification gates.** The migration baseline in `phase-3-layer2-port.md` Task 3 will need session count adjusted downward by ~4,272 and label count adjusted accordingly (or by however Open question 1 resolves).

### Sidequest arc: "Layer 2 segmentation hygiene" (post-Arc-1)

Scope: address Issue #2 (micro-session over-segmentation, 45,213 Discord sessions of 1-2 chat msgs) and Issue #6 (reply-thread awareness, 32,863 referenced messages) as one design pass.

**When:** After Arc 1 ships (Phase 8 verified, public MCP live). Before Arc 3 starts (so Arc 3 doesn't pay the LLM-summary tax on 45k orphan sessions).

**Why post-Arc-1 not pre:** Postgres affords cleaner approaches than SQLite. Window functions over `messages` ordered by `created_at`, recursive CTEs over `referenced_message_id` chains, and GIN-indexed `participants` arrays all work better in Postgres than the SQLite-era pipeline. Arc 1 Phase 3's port lands the new shape; the sidequest builds on it.

**Why a sidequest, not Arc 3 prep:** This is segmentation, not enrichment. No LLM call, no embedding, no taxonomy. It reshapes how `sessions` rows are derived from `messages`. Same column shape, same consumer interface (`search_solved_issues` keeps its current contract from Phase 6); fewer rows, cleaner shape. Arc 3 then sits on top of that cleaner shape and pays a smaller summary bill.

**Sketched phases (one or two; final shape decided when phase MDs are drafted in a future session, NOT this one):**

- **Phase 1: Investigation.** Profile micro-sessions: how many are reply chains? how many are orphan utterances? how many are reaction-only follow-ups to previous sessions? Decide which combination of three knobs to apply: (a) extend gap threshold (15min -> ?), (b) merge reply chains across sessions, (c) drop reaction-only follow-ups into their reference's session. Output: a decision doc + recommended algorithm.
- **Phase 2: Re-segmentation.** Implement the chosen algorithm in `scripts/load-chat/build-sessions.ts` (or a successor). Add a `version='v2'` (or whatever next semantic-version label fits) and run on the live `qw_oracle`. Verify Discord session count drops to a defensible target. Verify `search_solved_issues` recall doesn't regress against Phase 8's eval set.

**Estimated cost:** Two phases, ~3-5 days operator+Claude time including the eval-regression check. Net: smaller `sessions` table, cleaner Arc 3 input.

**Phase shape:** Use `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-template.md` as the per-phase template. Each phase MD ends with verification commands the operator runs to confirm landing.

**Dependencies on Arc 1:** Phase 3 ships first (Postgres + tsvector + Discord-only corpus loaded). Phase 8's eval set exists (Arc 1 deploy gate). The sidequest reads both as inputs.

**Successors:** Arc 3 inherits the cleaner `sessions` table and budgets summary calls accordingly.

### What this design doc explicitly does NOT propose

- A pre-Arc-1 sidequest. Polishing soon-to-be-deleted SQLite code costs more than it saves.
- A multi-phase arc. The substantive scope is one design + one implementation phase. Inflating that with classifier-rewrites or language-detection passes is scope creep onto Arc 3.
- Adding Issue #5 / #7 / #9 to the sidequest. Each is a separate domain concern with its own design pass. Sidequest stays focused on segmentation.

---

## Discord-only scope confirmation

Every proposed change in this doc respects D9-revised:

- All numeric claims (counts, percentages, samples) use `WHERE platform = 'discord'` filters or come from Discord-specific tables.
- The port-time hygiene changes target `scripts/load-chat/` (the Phase 3 Discord port). No IRC importer is mentioned, no `mirc-logs/` traversal, no `'irc'` value is added to any CHECK.
- The sidequest arc operates on `qw_oracle` Postgres tables that Phase 3 locks to `platform='discord'` via CHECK constraints (`phase-3-layer2-port.md:117`). No re-introduction of IRC.
- IRC re-import remains parked under Arc 3 reconsideration per `decisions.md` D9-revised, gated on (a) successful codepage re-import AND (b) operator demand. This sidequest does not change that gate.

---

## Open questions for operator

These are decisions the operator makes before the port-time hygiene tightenings or any sidequest phase MDs are drafted. None are blocking the design doc's recommendation; all should land before execution.

1. **Empty-session policy:** Today's `process-tier1.mjs` produces 4,272 sessions with `chat_message_count=0` (only reactions/bots/links/system content rolled up). Phase 3's migration declares `message_labels.session_id BIGINT NOT NULL`. To drop empty sessions at port time we need ONE of:
   - (a) Allow `message_labels.session_id` NULL; non-chat messages get labeled with NULL session_id (preserves the "every imported message has a row in message_labels" invariant).
   - (b) Don't create message_labels rows for non-chat messages whose surrounding session has zero chat content (loses some retrievability of those rows).
   - (c) Keep the empty sessions (current behavior, 4.8% row bloat, no schema change needed).
   
   Recommendation: **(a)** -- nullable session_id, preserve label rows. Cleanest semantics; small migration cost.

2. **Bot-pattern removal scope:** The recommendation is to drop `BOT_COMMAND_PATTERNS` entirely on Discord. This trusts Discord's `author_is_bot` flag exclusively. Edge case: a human user typing a bot-shaped command (e.g. `!ttop10` to interact with a bot) is currently flagged 'bot'; under the change they'd be flagged 'chat'. Is that the right call? (Recommendation: **yes** -- the human's intent is to chat with the bot, and the message itself is human-authored content that may carry conversational signal.)

3. **Phase 3 amendment vs new phase:** Should the four port-time hygiene changes (#3+A2, A1, A3, plus baseline-gate adjustment) be a NEW task (e.g. "Task 4.5: hygiene tightening") inside `phase-3-layer2-port.md`, or an amendment in `decisions.md` with the changes listed, applied across Tasks 4-6? (Recommendation: **a new task.** Keeps the three existing tasks unchanged, isolates the hygiene changes for review, lets the verification commands in the new task target the specific deltas.)

4. **Sidequest timing:** Run the sidequest immediately after Arc 1 Phase 8 ships (public MCP live) or wait until Arc 3 brainstorm starts? Recommendation: **immediately after Arc 1.** The Postgres tooling is fresh, the demo is live so any retrieval-quality regression is immediately visible, and Arc 3 then starts on cleaner input.

5. **Who owns the post-Arc-1 sidequest's Phase 1 investigation?** Two viable shapes: (a) ParadokS + Claude in a brainstorm session (matches the operator-led pattern of recent arcs), (b) a fresh terminal does the investigation pass autonomously and surfaces a decision doc for operator review (matches the parking-prompt pattern of this very session). Recommendation: **(a)** -- the choice between gap-extension / reply-merging / reaction-folding has subjective weighting (what does the operator value more in the eval set?) that benefits from interactive scoping rather than a fresh-terminal handoff.

6. **Sidequest naming and parking location:** This sidequest does not yet have a docked parking doc. When operator approves the arc, the prompt should be parked at `docs/superpowers/parking/<date>-layer2-segmentation-hygiene-prompt.md` and indexed in `HANDOVER.md`'s ongoing-arcs section.

---

*End of design doc. Halt for operator review per parking-prompt instructions. No phase MDs drafted in this session. `data/qw.db` not modified -- read-only probes only.*
