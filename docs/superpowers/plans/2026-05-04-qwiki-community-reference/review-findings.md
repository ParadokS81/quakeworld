# Review findings -- evidence ledger

This file is the audit trail of issues surfaced during plan drafting and execution. Each finding cites evidence and tags which decision in `decisions.md` resolves it (or which phase resolves it, if no decision needed).

The file decoupling: `decisions.md` carries the FIX; this file carries the WHY. Phase drafters consult both.

---

## How to use this doc

While drafting each phase MD:
1. Skim the findings table at the bottom for findings tagged with the phase you're drafting.
2. Verify the relevant decision in `decisions.md` resolves the issue. If a finding has no decision tag, either the phase resolves it directly or it remains open (operator review).
3. If the phase doesn't naturally resolve a finding that touches it, surface that in the phase's "Open questions" section.
4. New findings discovered during phase drafting append here with sequential F-number.

---

## Status: no prior plan attempt

This arc has not been planned before; there is no monolithic-plan precursor with bugs to enumerate. Findings will accrue during phase MD drafting and during execution.

The brainstorm pass produced a design spec (`docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md`) that is the source of truth for scope and ratified decisions. The spec is well-scoped; per-phase drafters should not need to re-derive structural choices.

---

## Findings

**F1 -- Slug collision count verified at exactly 4.**
Python analysis of article-list.json against the actual slugify scheme (spaces -> `_`, `/` -> `_`) confirms exactly 4 collisions, all involving `Quakeworld Eternal/<Map>` vs `Quakeworld Eternal <Map>`. The spec's "4 article-pair collisions" claim is accurate. No other collisions exist in the 9178-article corpus.
Resolves via: Phase 0, Task 2. Phase 0.

**F2 -- Snapshotter script is ad-hoc and not committed; at risk of loss.**
The full snapshot was produced by `/tmp/qwiki-pilot/full-scrape.py`. This path is in /tmp and will be lost when the originating shell session ends. Phase 0 must commit it (as `scripts/snapshot-wiki/snapshot.py`) before it disappears.
Resolves via: Phase 0, Task 1. Phase 0.

**F3 -- 503 slash-title articles use single-underscore slugs; only 4 need re-fetch.**
The original slugify treated `/` identically to ` `, producing single-underscore slugs for all slash-title pages. Of 503 slash-title articles, only 4 collided. The other 499 are stored correctly (no collision partner) under single-underscore slugs. Phase 2/3/4 parsers need a slug-lookup helper that resolves both slug schemes (single-underscore historical, double-underscore for the 4 re-fetched articles).
Resolves via: Phase 0, Task 2 + manifest note. Phase 0 (Q2 in Open questions for operator decision on full re-fetch).

**F4 -- Redirect bug: arprop='target' is not a valid MediaWiki allredirects property.**
The original full-scrape.py called `arprop=target|fragment`. The value `target` is not a valid allredirects arprop (valid: `ids`, `title`, `fragment`, `interwiki`). MediaWiki returned an error JSON without a "query" key; the paginated wrapper treated the missing key as an empty list, silently writing `[]` to redirects.json. Correct call: `arprop=ids|title` returns `fromtitle` (source) and `title` (target) for each redirect.
Resolves via: Phase 0, Task 3. Phase 0.

**F5 -- manifest.json articles_fetched=9178 overcounts by 4.**
The original script incremented its `fetched` counter for every page written, including the 4 slug-clobbered writes. Actual unique article files: 9174 (confirmed via os.listdir). The manifest count is misleading. Task 5 corrects it.
Resolves via: Phase 0, Task 5. Phase 0.

**F6 -- Spec DDL is pre-D5-refinement; missing `is_substantive` columns.**
The spec's "Schema" section (`docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md`) shows `community.players`, `community.clans`, and `community.tournaments` with `has_note BOOLEAN` and `is_stub BOOLEAN` only. D5 (added during planning) requires `is_substantive BOOLEAN` as a separate flag from `has_note`. Phase 1 migration correctly adds all three booleans. **Drafters of Phase 4 (tournament schema discovery) must treat `decisions.md` as authoritative for column shape, NOT the spec's column lists**. The spec is the scope/intent source of truth; decisions.md is the column-shape source of truth.
Resolves via: drafter awareness; no migration change required. Phase 4 awareness item.

**F7 -- 129 case-variant article pairs in snapshot are intentionally distinct.**
Live recon found 129 article pairs that differ only by letter case (e.g., `AGAIN` vs `Again`, `Immortal` vs `IMMORTAL`). These are NOT slug bugs -- the slugify intentionally preserves case, so case-variant titles produce distinct slugs and are stored as separate files. Phase 2/3/4 parsers must treat slugs as case-sensitive distinct identities. Do NOT collapse case-variant pages during stub detection or alias building -- they may be different community entities.
Resolves via: drafter awareness in Phase 2/3 parsers.

**F8 -- `tournament_results.tournament_slug` is deliberately a soft reference (no FK).**
Phase 1 migration creates `community.tournament_results.tournament_slug TEXT NULL` with NO `REFERENCES community.tournaments(slug)` clause. Reason: Phase 5 backfill loads cross-link rows from achievements lists BEFORE Phase 4's tournament parser populates `community.tournaments`, so a hard FK would cause insertion failures. The spec's DDL comment "references where matchable" was prose intent, not a SQL constraint. Cross-link integrity is enforced by post-load join queries, not FK constraints.
Resolves via: Phase 1 migration design; Phase 5 awareness.

**F10 -- `{{Infobox 4on4team}}` is an undocumented fourth clan template variant (44 articles / 5.4% of clans).**
Live recon of Category:Clans articles in the 2026-05-04 snapshot found 44 articles using
`{{Infobox 4on4team}}` -- this template is not mentioned in the spec's "two template branches +
Infobox clan rare" framing. Field names differ from Clan-info: `team` (prefix), `flag` (2-letter
ISO directly, not demonym), `created` (year or "YYYY, Month" format), `irc-channel` (hyphenated
key), `founder` (may contain nested `{{player|Nick|flag=xx}}` templates). No disbanded field.

**Resolution applied 2026-05-05 (BEFORE Phase 1 executes):** Phase 1 migration 008 amended to
widen `community.clans.source_template` CHECK enum from
`('infobox_clan', 'clan_info', 'bullet_prose', 'none')` to
`('infobox_clan', 'clan_info', 'infobox_4on4team', 'bullet_prose', 'none')`. Phase 3 parser
writes the value directly. No coercion shim, no migration 010, no two-step deploy. Same pattern
as F9 (catch-and-amend Phase 1 schema before execution).

Resolves via: Phase 1 migration 008 (amended); Phase 3 Q2 (resolved-by-Phase-1-amendment).

**F11 -- Actual Category:Clans count is 822 in the snapshot, not the spec's stated 829.**
Live recon counted 822 article files tagged `Category:Clans` in the 2026-05-04 snapshot. The
spec's 829 figure was likely from article-list.json enumeration which may include redirects or
talk pages not stored as article-content files. The 7-article discrepancy does not indicate a
snapshot defect -- the file-system count is the ground truth for loader input. Phase 3 V1 PASS
condition is set to 822. Phase 0 executor can verify by cross-referencing article-list.json with
actual file count if desired.
Resolves via: Phase 3 V1 (822 accepted as accurate). Phase 3.

**F9 -- `player_clan_eras` PK redesign: surrogate id + UNIQUE; year-absent rows representable.**
Surfaced during Phase 2 drafting (Phase 2 Q1). The original Phase 1 migration set PK `(player_slug, clan_title, start_year)` which forced `start_year NOT NULL`. The Phase 2 parser, faithful to wiki source, produces year-absent rows for bullet-list Clan-history sections (ParadokS-style). These would have failed Phase 5 INSERT.

**Resolution applied to Phase 1 BEFORE execution** (so no migration 010 is needed): switched to surrogate `id BIGSERIAL PRIMARY KEY`, nullable `start_year`, added `era_seq INT` for list-order preservation across re-loads, added `UNIQUE (player_slug, clan_title, start_year, source)` for idempotency. Year-known rows dedupe deterministically; year-absent rows are uncommon and Phase 5 truncates-and-rebuilds the table per re-run regardless. Bullet-list clan eras (ParadokS, Crit, the older Player-info pages) keep recognition signal.

Trade-off accepted: Postgres treats NULL distinctly per row in UNIQUE indexes, so a re-run could in theory duplicate year-absent rows for the same (player, clan, source). In practice Phase 5 truncates-and-rebuilds, so this is harmless. If a future arc switches to incremental upsert, revisit with a `COALESCE(start_year, -1)`-based unique index.

Resolves via: Phase 1 migration 008 (amended); Phase 2 Q1 (resolved); Phase 5 awareness (era_seq computed at upsert time from list-position).

**F12 -- Phase 5 title-matcher Pass 2 depends on Phase 0 redirect refetch shipping before Phase 5 runs.**
Surfaced during Phase 5 drafting. The Phase 5 drafter initially read `redirects.json = []` in the current snapshot and concluded "the wiki has no redirects; alias expansion is permanently inactive." Reframed during groom pass: the empty file is the pre-Phase-0 state (per F4 -- the original snapshotter used invalid `arprop=target` and silently wrote `[]`). Phase 0 Task 3 refetches with `arprop=ids|title` and V4 PASS condition expects ~900-2,700 entries.

By dependency order Phase 5 runs after Phase 0, so `redirects.json` will be populated by then. Phase 5's `title-match.ts` Pass 2 (redirect-alias lookup) is coded to consume the populated file; the CLI logs `redirects loaded: N entries` at startup so the executor can verify Phase 0's data is in place. If by accident Phase 5 runs against an empty `redirects.json`, Pass 2 is simply a no-op for that run -- not catastrophic; pass 1 (exact slug match) and pass 3 (series + year + mode fuzzy) still operate.

Resolves via: Phase 5 Q1 (executor verifies Phase 0 has shipped). Phase 5 awareness.

**F13 -- L2 reconstruction spec defers primer artifact shape + location to its own Pass 2.**
Surfaced during Phase 7 drafting. The L2 corpus reconstruction design spec (`docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md`) is at Pass 1 close. The Stage 0 "primer artifact location + shape" decision is explicitly deferred to Pass 2 -- the spec does NOT specify a primer JSON shape or output path that Phase 7 must conform to.

Phase 7 ships a sensible default: structured JSON at `apps/qw-oracle/data/l2-primer/<YYYY-MM-DD>.json` with top-level keys `players` / `clans` / `tournaments` / `alias_index` mirroring `community.*` row shape + a denormalized recognition lookup. If L2 Pass 2 specifies a different shape after Phase 7 ships, Phase 7's primer-build script is small enough to refactor or wrap with a thin adapter -- not catastrophic.

**Cross-arc note for the L2 reconstruction planner:** when Pass 2 reaches the primer-shape decision, consult Phase 7's default (`phase-7-l2-primer.md` Task 2 + Task 3) BEFORE proposing alternative shapes. If the default works, lock it; if not, the L2 arc ships an adapter or a primer-rebuild migration.

Resolves via: Phase 7 sensible default; L2 arc Pass 2 confirms or adjusts. Phase 7 + L2 arc cross-reference.

**F14 -- snapshot.py `enumerate_redirects` bug: MW 1.35.10 `allredirects` does not return `fromtitle` with `arprop=ids|title`.**
Surfaced during Phase 0 execution. The original `arprop=ids|title` approach (drafted in Phase 0 MD as the fix for F4's broken `arprop=target`) assumed `fromtitle` would be in the response. On quakeworld.nu MediaWiki 1.35.10 the `allredirects` API returns only `fromid` (source pageid), not `fromtitle` -- evidence: `{'fromid': 6321, 'ns': 0, 'title': '-Molle-'}`. The fallback chain `src = r.get("fromtitle") or r.get("from") or r.get("title")` set `src = title` (the target), the `if src != tgt` guard then dropped every row, producing `[]` -- the same silent-empty-result shape as the original F4 bug. Fix shipped inline at execution time as a two-step approach: enumerate redirect source pages via `allpages?apfilterredir=redirects`, then batch-resolve each source to its target via `query?redirects=1`. The Phase 0 T3 subagent independently discovered the same issue and used the same fix.

Resolves via: Phase 0 inline fix (commit 296efc67). `snapshot.py` is now correct for any future re-scrape.

**F15 -- V3a probe (`ls | grep -c "__"`) is miscalibrated; expected 503, returned 553.**
Surfaced during Phase 0 V3 verification. The snapshot directory contains ~50 non-slash-title articles whose slugs contain `__` from non-slash special-character replacements -- e.g., `Nemocn___Ryt____i.json` derived from a title with multiple non-alphanumeric characters that the slugify rule replaces individually. V3a's `ls | grep -c "__"` therefore reports a count higher than the 503 slash-title articles. The V3b Python probe (which counts only `__` files whose titles actually contain `/`) is the accurate gate and PASSed at exactly 503.

Resolves via: future re-runs treat V3a as advisory or remove from phase MD; V3b is the structural gate. Captured here so the V3a calibration question doesn't resurface as a defect.

**F16 -- 26 slash-title articles have legitimately empty `wikitext` (verified live).**
Surfaced during Phase 0 V3b verification. 26 of the 503 refetched slash-title articles return valid `pageid` + `revid` but empty `wikitext`. Examples: `MSKLAN2003/4on4(Playoffs)`, `Polish Duel Championship 3/Division 1` through `Division 5`. Confirmed against live API -- these tournament sub-pages exist as titled redirects/stubs with no body content on the wiki. Not a fetch defect.

Resolves via: Phase 2/3/4 parsers must handle empty wikitext gracefully. The two-threshold model (D5) already covers this -- empty wikitext produces `is_substantive=false` and `has_note=false`, which is the correct row shape.

**F17 -- `.devil.json` is a hidden file; `ls | wc -l` undercounts the articles directory by 1.**
Surfaced during Phase 0 verification. One wiki article is titled `.devil`; its slug is `.devil.json`. On Linux, `ls` without `-a` skips dotfiles, so `ls apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/ | wc -l` returns 9177 instead of the actual 9178. `find -name "*.json" | wc -l` and Python `Path.iterdir()` correctly count 9178.

Resolves via: future phase verification probes that count files use `find -name "*.json" | wc -l` or Python iterdir() instead of `ls | wc -l`. Phase 2/3/4 awareness item -- their parser-loop iteration must use a directory-walk that includes dotfiles.

**F18 -- Phase 1 V3 probe `grep -r "concept-notes" --include="*.ts" | grep -v "curated/concept-notes"` is miscalibrated; expects "no output" but legitimately returns 6 lines.**
Surfaced during Phase 1 V3 verification. The probe filters out `curated/concept-notes` literal but does not filter (a) the `CONCEPT_LINK_RE` backward-compat regex literal in `parse.ts:26` which contains `curated\/` (escaped slash, not literal `curated/`); (b) intentional backward-compat test strings in `parse.test.ts:65,66,76,86` that exercise the legacy `concept-notes/` form; (c) `CONCEPTS_DIR = resolve('curated', 'concept-notes')` in `index.ts:18` (the directory name segment, not a stale path prefix). All six lines are correct, intentional, and not stale. The probe's PASS condition reads as FAIL to a cold verifier.

Resolves via: future phase MDs use a tighter V3 probe (e.g., `grep -rn "apps/qw-oracle/concept-notes" --include="*.ts"` for stale absolute paths only, or `| grep -v parse.test.ts` to exclude backward-compat test strings). Phase 1's structural correctness is verified via tsc + load-concepts smoke (V7 + V8). No re-execution needed.

**F19 -- Phase 1 V8 PASS condition says "skipped 3" but actual is "skipped 4"; off-by-one in the phase MD.**
Surfaced during Phase 1 V8 verification. The phase MD's expected output names `OPERATIONS.md`, `README.md`, `_gap-report.md` as the three skipped files. Actual loader output is "skipped 4" because `CLAUDE.md` (in `concept-notes/` since before the rename) also has no `slug:` frontmatter and is correctly skipped. The phase MD undercounted by 1. Loaded N=9 satisfies the >= 9 gate; no functional issue.

Resolves via: phase MD's PASS condition should have said "skipped 4". No re-execution needed; the gate is N >= 9 which is the meaningful signal.

**F21 -- Actual Category:Players count is 5,900 in the snapshot (with Vo0 recovered), not spec's 5,903.**
Spec estimated 5,903 players; actual Category:Players article count is 5,896. One additional article (Vo0) was in `Category:Dutch Players` only (wiki editorial omission -- all other 170 Dutch players are in both categories). After expanding `isPlayerArticle` to also accept nationality sub-categories (`/^Category:.+ Players$/`), final loaded count is 5,900. The 3-article discrepancy from 5,903 is unexplained (likely redirects or talk pages counted in the original estimate). Same class of issue as F11 (clans: 822 vs 829). Phase 2 V1 PASS condition adjusts to accept any count in the 5,800-6,100 range.
Resolves via: Phase 2 execution (isPlayerArticle expanded inline). Phase 2.

**F22 -- 15 `none`-branch articles; 6 have bogus `real_name` values from fallback parser; advisory only.**
15 articles fall to the `none` branch after Phase 2 execution (originally captured as "13"; corrected to 15 during Phase 2 reconciliation 2026-05-05). Of these, ~3 use `* '''Label''': value` format (colon AFTER closing triple-tick, e.g. `* '''Real name''': Anton`) which is not matched by bullet-prose detection (needs 2/3 patterns). Six articles have bogus `real_name` values (Ender_(Russian_Player)='Real name', Ginzberg='Nationality:', HARDKORE='Hardkore', Medar='Nationality:', Ponk='Real name', Talker='real name') where the `parseProseFallbackBranch` incorrectly captures the label text. These are low-severity: 15 rows out of 5,900 (0.25%); row data is usable for recognition except for the bogus `real_name`. The operator classified as advisory (future cleanup arc; not Phase 2 or Phase 3 scope).
Resolves via: future cleanup arc or Phase 5 polish pass. Phase 2 (advisory capture).

**F23 -- Silent DB drift between phase ship and orchestrator cold audit; no automated regression gate.**
Surfaced during Phase 2 reconciliation 2026-05-05. Phase 2 shipped at commit `d6efa1cd` with correct code + correct emitted `.md` files. Between ship and orchestrator's cold audit on the same day, the live `community.players` DB drifted to a partially-corrupted state: 5,896 rows (vs shipped 5,900); `has_note=TRUE` flags inflated to 833 (vs shipped 571); source_template distribution shifted ~780 rows from `bullet_prose` to `none` (15 -> 793); Vo0 row absent despite Vo0.md on disk. Most likely cause: an intermediate aborted/partial loader re-run (executor diagnostic context) updated some rows under different intermediate code state but never completed. `INSERT ... ON CONFLICT DO UPDATE` only fixed rows touched by the aborted run; rows untouched kept their stale state. Reconciliation via `TRUNCATE` + fresh run from HEAD restored the DB to match the shipped state (commit `a0e3ec67`).

Resolves via: orchestrator-level cold audit at every phase boundary (current mechanism). Future improvement candidate: a probe in `apps/qw-oracle/scripts/load-knowledge/probes/` that verifies live row counts against the most recent commit message's claims, treated as a regression gate (small arc; deferred). Phase 2 advisory; future arc-orchestrator skill update could include "before phase sign-off, run the probe set" as a structural step.

**F24 -- Phase MD V5 status-field expectations drift from parser rules.**
Surfaced during Phase 2 reconciliation 2026-05-05. The Phase 2 phase MD's V5 spot-check expected `status='unknown'` for `Acid_(Finnish_Player)` and Vo0. The parser correctly produces `status='Quit'` for Acid (per Task 3 step 8: "if `Current clan: -` parse as Quit") and `status='Retired'` for Vo0 (per Task 3 step 8: "scan prose for retired keyword"). The phase MD's V5 expected values were hand-written and drifted from the parser specification. Not a code defect; a doc-correction in phase MD V5 expected values. Phase 2's reconciliation accepted the parser output as authoritative (parser rules win over hand-written expectations).

Resolves via: future phase MDs derive V-probe expected values from the parser spec, not hand-write them. The mechanism: when the verification subagent runs at phase MD draft time, cross-check V-probe expected values against the spec's documented parser rules. Procedural lesson; no functional impact.

**F25 -- Phase 3 fixture-article misclassification: Firing_Squad and Slackers contain buried `{{Clan-info}}` templates.**
Surfaced during Phase 3 execution. Phase 3 phase MD's T3 (parse.test.ts) assumed Firing_Squad and Slackers were NO_INFOBOX bullet-prose articles. Live wikitext recon found `{{Clan-info}}` templates buried at offset 5699 (Firing_Squad) and 17313 (Slackers). Parser correctly classifies both as `clan_info`. Test assertions for Firing_Squad rewritten to `clan_info` reality (prefix=[fs], nationality=Dutch, iso=nl, founded_year=1995); Xband added as 6th fixture for genuine pure-prose `bullet_prose` coverage. V8 spot-check expectation for Slackers also corrected.
Resolves via: Phase 3 inline test revisions. Phase 3 advisory; same shape as F24 (phase MD spec drift -- live data wins over hand-written expectations).

**F26 -- D6 5-signal heuristic for clans omits achievements_count; rich-achievements/sparse-infobox clans flagged is_substantive=false.**
Surfaced during Phase 3 execution. The 5-signal D6 heuristic for clans is `hasPrefix / hasFounded / hasFoundedBy / hasIrc / hasNarrativeProse(>=500B)`. Achievements are NOT a signal. Clans with rich achievement rows but sparse infobox fields are flagged is_substantive=false even when their structured data is meaningful (e.g., Flaming_Fist has 7 `{{AchievementStripped|}}` rows but 0 D6 signals firing). After Phase 3 ship, 19 of 822 clans (2.3%) sit in the legitimate "Not substantive, has note" D5 outlier band per V3 -- some of these would flip to is_substantive=true if achievements were added as a 6th signal.

Operator deferred to future tuning round (does not block Phase 4). Future-tuning candidate: add `achievements_count >= 2` as a 6th signal, OR replace `hasNarrativeProse` with achievements (achievements are arguably stronger structured-content signal than 500-byte prose threshold). Same shape applies to player heuristic (D6 originally for players; same 5-signal-set-without-achievements limitation).

Resolves via: future tuning arc. Phase 3 advisory + future improvement; not blocking.

**F27 -- HTML comments inside section bodies interrupt `extractSectionBody` trailing-meta-trim; orphan `[[Category:...]]` lines survive.**
Surfaced during Phase 3 T8 second sample inspection. The `extractSectionBody` helper in `shared/wiki-text.ts` walks backward from the section end dropping trailing meta lines (blank, `__MAGIC__`, `[[Category:...]]`) via `isTrailingMeta` regex. The regex does NOT match HTML comment lines, so when an External links section has the pattern `{{chtv}} -> HTML comment -> {{clan-stub}} -> [[Category:Clans]] -> HTML comment -> [[Category:Swedish Clans]]`, the trim stops at the first HTML comment walking backward and leaves `[[Category:Clans]]` (18 chars) alive in the body. This caused 64 stub clans to have `external_links_section.length > 0` triggering has_note=TRUE.

**Local fix applied (27a):** Phase 3 `clans/parse.ts:stripClanStubBoilerplate` extended to drop standalone `[[Category:...]]` lines from the External links body during clan parsing. Dropped V3 from 64 to 19 and V4 from 430 to 350. Local-scope fix; preserved Phase 2 player parsing unchanged.

**Broader fix (27b) deferred:** extending `shared/wiki-text.ts:isTrailingMeta` to also match HTML comment lines would benefit Phase 2 player parsing if the same pattern surfaces there. Not part of Phase 3's bounded edit; future small arc candidate.

Resolves via: Phase 3 inline 27a fix (`clans/parse.ts`). Future improvement candidate: 27b shared fix.

**F20 -- D15 (append-only migrations) applies to the entire file, not just functional SQL; comment edits also fail the migrator's SHA256 hash check.**
Surfaced during Phase 1 T2 path-reference sweep. The phase MD's T2 listed updating a header comment in `005_layer3_concepts.sql` from `concept-notes/*.md` to `curated/concept-notes/*.md`. Executing that edit caused `bun apps/qw-oracle/db/migrate.ts` to throw `Error: Migration 005_layer3_concepts.sql was modified after it was applied` because the runner stores SHA256 of the entire file in `schema_migrations.sha256` and re-checks on every run. The executor reverted the edit; live SHA256 now matches the DB hash (`d45171ae...`). The 005 comment retains the historical pre-rename path, which is correct for an applied migration.

Resolves via: future arc-planner phase MDs do NOT propose comment edits in applied migration files. D15's "append-only" semantics extend to the file's hash, not just its functional SQL. The comment in 005 is permanently a historical record of the pre-rename path; new schema arcs may add a "see 008 for current path" pointer in the relevant CLAUDE.md instead. Procedural lesson; no functional impact.

**F28 -- Phase 3 wrap-up docs cite `is_substantive=397` for clans; live cold audit returns 688. Doc-transcription error (T8 calibration trial number transcribed instead of post-tune ship value); code and DB are in sync.**
Surfaced during orchestrator session #2 cold-verify, 2026-05-05 (post-orchestrator-handoff at 21:53). README "Where we are right now", arc-history Phase 3 entry, and the orchestrator-resume parking doc all cite `is_substantive=397` for clans. Live cold audit (`SELECT count(*) FILTER (WHERE is_substantive) FROM community.clans`) returns **688**. Reflog shows zero DB-touching activity between Phase 3 ship (commit 2a467645 at 21:37) and the cold audit; working tree clean; `flags.ts` and `parse.ts` have only the Phase 3 ship commit.

Audit trail: `flags.ts:36` at HEAD implements `substantiveSignals >= 2` per D6 spec. Bucketing live clans by persisted-D6-signal density (4 of 5 signals are persisted; the 5th `narrative_byte_length>=500B` lives in the parser only) reveals that **397 is the count under a `>=3 of 5` threshold** (273 with 3 persisted + 121 with 4 persisted + ~3 narrative-fired-from-2-bucket = ~397). The wrap-up docs are internally inconsistent: the "19 V3 stub-with-note outliers" count is only consistent with `>=2 of 5` (a `>=3 of 5` threshold would push that count past 200), so the docs paired the `>=2`-derived outlier number with a `>=3`-derived substantive number. Most likely scenario: at T8 the executor demonstrated threshold sensitivity by running both `>=2` (=688) and `>=3` (=397); the spec's `>=2` was committed and the DB was loaded under `>=2`; the wrap-up doc transcription captured the `>=3` trial number into final docs.

Cross-check via the 4 visually-verified stub clans from the operator's end-of-Phase-3 audit (Frag_Messengers, Imperial_Icemarines, Masters_of_Fire, KMFC): all four show `is_substantive=FALSE, has_note=FALSE` in live DB, consistent with the post-tune `>=2 of 5` ship state and the Option 2 + F27 27a stub-template strip fixes.

**Resolution applied 2026-05-05 (orchestrator session #2):** doc-correct README + arc-history + resume handoff from `397 -> 688`. No DB intervention, no code change. Captured here as a doc-transcription error class adjacent to F23 (which was a runtime DB drift class).

**Procedural lesson:** orchestrator cold audit at session-boundary catches doc-transcription errors as well as runtime drift. Cross-check internal consistency of wrap-up numbers (substantive count vs outlier count vs has_note count) when verifying. F23's "always re-run V probes cold" discipline applies to phase wrap-up docs themselves, not just the DB.

Resolves via: orchestrator session #2 doc correction (this finding). No code or DB change.

---

## Phase ownership of findings

| F# | Finding | Resolves via | Phase |
|----|---------|--------------|-------|
| F1 | Slug collisions exactly 4 (confirmed) | Phase 0, Task 2 | 0 |
| F2 | Snapshotter not committed; at risk of loss | Phase 0, Task 1 | 0 |
| F3 | Slash-title slug scheme mixed (now resolved by refetch-all-503) | Phase 0, Task 2 | 0 |
| F4 | Redirect bug: invalid arprop='target' caused silent empty result | Phase 0, Task 3 | 0 |
| F5 | manifest.json articles_fetched overcounts by 4 | Phase 0, Task 5 | 0 |
| F6 | Spec DDL pre-D5; decisions.md authoritative for column shape | drafter awareness | 4 |
| F7 | 129 case-variant article pairs intentionally distinct | drafter awareness | 2, 3 |
| F8 | tournament_results.tournament_slug is soft reference (no FK) | Phase 1 migration; Phase 5 awareness | 1, 5 |
| F9 | player_clan_eras PK redesigned: surrogate id + UNIQUE; year-absent rows representable | Phase 1 migration 008 amended; Phase 2 Q1 resolved | 1, 2, 5 |
| F10 | Infobox 4on4team is fourth clan template (44 articles / 5.4%); CHECK enum widened in Phase 1 amendment | Phase 1 migration 008 amended; Phase 3 Q2 resolved | 1, 3 |
| F11 | Actual Category:Clans count is 822, not spec's 829; discrepancy from redirects/talk-page enumeration | Phase 3 V1 PASS condition set to 822 | 3 |
| F12 | Phase 5 title-matcher Pass 2 depends on Phase 0 redirect refetch shipping first | Phase 5 executor verifies redirects.json non-empty before run | 5 |
| F13 | L2 spec defers primer artifact shape + location to its own Pass 2; Phase 7 ships sensible default | Phase 7 default + L2 arc Pass 2 confirm/adjust | 7, L2 |
| F14 | snapshot.py redirect-enumeration bug; allredirects on MW 1.35.10 returns only fromid not fromtitle; fixed via two-step allpages+batch-query approach (commit 296efc67) | Phase 0 inline fix | 0 |
| F15 | V3a probe miscalibration (553 vs 503); ~50 non-slash-title files have `__` slugs from other special-char replacements; V3b is the accurate gate | Phase 0 V3b PASS | 0 |
| F16 | 26 slash-title articles have legitimately empty wikitext (verified live); D5 two-threshold model handles natively (`is_substantive=false`, `has_note=false`) | Phase 2/3/4 awareness | 2, 3, 4 |
| F17 | `.devil.json` is a hidden file; `ls | wc -l` undercounts by 1; phase verification + parser-loop directory walks use `find -name "*.json"` or Python `iterdir()` | Phase 2/3/4 awareness | 2, 3, 4 |
| F18 | Phase 1 V3 probe miscalibrated; expects "no output" but legitimately returns 6 lines (regex literal + backward-compat test strings + CONCEPTS_DIR resolve segment) | future phase MDs use tighter V3 probe | 1 |
| F19 | Phase 1 V8 PASS condition off-by-one ("skipped 3" vs actual "skipped 4"); CLAUDE.md is also skipped (no slug frontmatter) | N>=9 gate is the meaningful signal | 1 |
| F20 | D15 append-only applies to entire migration file (hash-checked), not just functional SQL; comment edits fail migrator | future phase MDs avoid editing applied migration files | all future arcs |
| F21 | Actual Category:Players count 5,900 (not spec's 5,903); Vo0 was only in Category:Dutch Players (wiki omission); isPlayerArticle expanded to accept nationality sub-categories | Phase 2 execution (inline fix) | 2 |
| F22 | 15 none-branch articles (count amended from 13); 6 have bogus real_name from fallback parser; `* '''Label''': value` colon-after-triple-tick format missed by detection; advisory only (future cleanup) | future cleanup arc | 2 (advisory) |
| F23 | Silent DB drift between phase ship and orchestrator cold audit; no automated regression gate; reconciliation via TRUNCATE + fresh run | orchestrator cold audit + future probe | 2 (advisory; future improvement) |
| F24 | Phase MD V5 status-field expectations drift from parser rules; future phase MDs derive V-probe expected values from parser spec | future phase MD authoring discipline | 2 (advisory) |
| F25 | Phase 3 fixture-article misclassification: Firing_Squad + Slackers have buried Clan-info templates; tests revised to match parser reality + Xband added as bullet_prose fixture | Phase 3 inline test revision | 3 |
| F26 | D6 5-signal heuristic omits achievements_count; rich-achievements/sparse-infobox clans (and players) flagged is_substantive=false; future tuning candidate (add 6th signal or replace narrative_prose with achievements) | future tuning arc | 3 (advisory; future improvement) |
| F27 | HTML comments interrupt extractSectionBody trailing-meta-trim; orphan `[[Category:...]]` lines survive in section bodies; Phase 3 local fix (27a) applied; broader shared fix (27b) deferred | Phase 3 inline 27a; future small arc for 27b | 3 (27a applied; 27b deferred) |
| F28 | Phase 3 wrap-up docs cite is_substantive=397; live DB returns 688; doc-transcription error (T8 `>=3 of 5` trial value transcribed instead of post-tune `>=2 of 5` ship value); code + DB are in sync | orchestrator session #2 doc correction (README + arc-history + resume handoff `397 -> 688`) | 3 (advisory; doc-only) |

(F1-F5 accrued during Phase 0 drafting, 2026-05-05. F6-F8 accrued during planner groom pass, 2026-05-05. F9 accrued during Phase 2 drafting + groom pass, 2026-05-05. F10-F11 accrued during Phase 3 drafting, 2026-05-05. F12 accrued during Phase 5 drafting + groom pass, 2026-05-05. F13 accrued during Phase 7 drafting + groom pass, 2026-05-05. F14-F17 accrued during Phase 0 execution, 2026-05-05. F18-F20 accrued during Phase 1 execution, 2026-05-05. F21-F22 accrued during Phase 2 execution, 2026-05-05. F23-F24 accrued during Phase 2 reconciliation, 2026-05-05. F25-F27 accrued during Phase 3 execution, 2026-05-05. F28 accrued during orchestrator session #2 cold-verify, 2026-05-05.)

---

## Notes for the orchestrator

When wave 2 (arc-orchestrator) drives execution, mid-arc findings (issues discovered while a phase is shipping) append here in the same shape. The orchestrator may also append "deviation from decision" findings if a phase ships with a documented deviation that needs to be tracked across the rest of the arc.

The post-arc-reviewer (wave 2 / arc-reviewer skill) consumes this file as the audit trail input alongside `decisions.md` amendments and `arc-history.md`.
