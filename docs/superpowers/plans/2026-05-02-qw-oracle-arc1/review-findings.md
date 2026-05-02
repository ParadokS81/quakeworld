# Review findings against the legacy monolithic plan

These issues were found during the 2026-05-02 review of `_legacy-monolithic-plan.md` against the current codebase, schema, and architecture spec. They are pinned here so the fresh terminal drafting per-phase MDs treats them as a checklist while writing each phase.

The fixes for the structural issues are encoded as decisions in `decisions.md`. This file is the evidence trail.

---

## How to use this doc

While drafting each phase MD:
1. Identify which findings touch the phase you're drafting.
2. Verify the relevant decision in `decisions.md` resolves the issue.
3. If the phase doesn't naturally resolve a finding that touches it, surface that in the phase's "Open questions" section.
4. Phase 2 (Layer 1 port) touches the most findings — it's where the highest density of grave issues lived in the legacy plan.

Findings are tagged with which decision in `decisions.md` resolves them. If a finding is unresolved, mark it.

---

## Grave issues (would break execution)

### F1 — FK convention break

**Resolved by:** D1 (keep `entity_id INTEGER`).

**Evidence:** Legacy plan's `002_layer1_entities.sql` made `canonical_id TEXT PRIMARY KEY` and FK'd version tables on `canonical_id`. Real schema (`apps/qw-oracle/scripts/load-knowledge/schema.ts:82`) has `entity_id INTEGER NOT NULL REFERENCES entities(id)` everywhere. Spec (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md:349`) says "preserved structurally."

**Affected files in current code:** `serve/mcp/src/tools/search-entities.ts:83`, `scripts/load-knowledge/build-snapshot.ts:106`, `diff-versions.ts:288-292`, `enrich-prs.ts`, `backfill-version-bookkeeping.ts`, every `load-*.ts` adapter, `transitions.ts`. ~17 files.

### F2 — Wrong CHECK enum values

**Resolved by:** D3 (generate from `schema.ts`).

**Evidence:** Legacy plan invented `'asset_consumption'` (real: `'asset_category'`), `'cross_engine_alias'` (real: `'cvar_alias'`), `source_state` values `'active'`/`'retired'` (real: `'source_backed'`/`'dynamically_registered'`). Verified against `schema.ts:60-71`.

### F3 — Missing tables

**Resolved by:** D4 (port all 31).

**Evidence:** Legacy migrations 002/003/004 covered ~10 tables out of 31. Missing: `versions`, `change_events` (with its `UNIQUE` constraint — see F6), `source_state_transitions`, `release_notes`, `cvar_alias_versions`, `asset_category_versions`, `gameplay_sources`, `source_overrides`. Inventory verified in `apps/qw-oracle/SCHEMA.md:18-29`.

### F4 — Wrong column lists in CREATE TABLE sketches

**Resolved by:** D3 (generator instead of hand-typing).

**Evidence:** Legacy plan's `cvar_versions` had 7 columns including a `description` field. Real has 19 columns and no `description` — uses `help_desc`, `help_remarks`, `help_values`, `help_group_id`, `help_type`, plus 14 more. `schema.ts:81-110`.

### F5 — `import.meta.main` doesn't work in Node 20

**Resolved by:** D2 (Bun for everything).

**Evidence:** Verified `node v20.20.0` — `import.meta.main` is undefined. Bun-only feature. Legacy plan ran scripts via `tsx` (Node) but used `if (import.meta.main)` guards on every CLI script. All silently no-op.

**Affected scripts in legacy plan:** migrate.ts, embed-entities.ts, embed-chunks.ts, eval.ts, calibrate.ts, load-concepts/index.ts, import-discord.ts, import-irc.ts, build-sessions.ts.

### F6 — `entity_change_events` lacks idempotency UNIQUE

**Resolved by:** D4 (port all 31, including the real `change_events` with its UNIQUE).

**Evidence:** Legacy plan's `entity_change_events` had no UNIQUE constraint. Real `change_events` has `UNIQUE (entity_id, to_version, field_name, change_kind)` (`schema.ts:180-181`). This is the diff pipeline's idempotency guarantee. Without it, re-running diffs against the same tag-pair duplicates rows. Violates "Layer 1 extractors are idempotent" per `apps/qw-oracle/CLAUDE.md:48`.

### F7 — `entities.description` is referenced but not populated

**Resolved by:** D6 (derivation step).

**Evidence:** Legacy plan added `description TEXT` + `description_tsv` + `description_embedding` on `entities` but the existing loader never writes `description` on the `entities` row — it lives per-version. Without derivation: tsvector empty, embeddings of empty strings, `search_entities` returns nothing.

---

## Substantive risks (would ship buggy behavior)

### F8 — qw-namespace tables renamed and `gameplay_sources` missing

**Resolved by:** D4 (preserves real names: `maps`, `gameplay_sources`, `gameplay_entity_defs`, `gameplay_mechanics`).

**Evidence:** Legacy plan said `qw_maps` / `qw_entity_defs` / `qw_mechanics` (3 tables). Real (`SCHEMA.md:25`) is 4 tables. `gameplay_sources` is the project/version anchor that the entity-defs and mechanics tables FK to.

### F9 — tsvector English stemming on mixed-language chat

**Resolved by:** D7 (`'simple'` config for chat tsvectors). Still applies under D9-revised: Discord itself has multi-language content (Swedish / Russian / German handles and snippets), so `'simple'` config remains the right call even with IRC excluded.

**Evidence:** Legacy plan used `to_tsvector('english', content)` on `messages` and `session_search`. SQLite FTS5 was language-agnostic; English stemming is a regression for any non-English content in the corpus.

### F10 — Calibration → eval feedback loop overfits

**Resolved by:** D10 (disjoint calibration vs eval sets).

**Evidence:** Legacy plan's `calibrate.ts` swept thresholds against `eval/queries.json`; legacy `eval.ts` then gated deploy on recall@3 ≥ 70% computed against the same `eval/queries.json`. After calibration the gate is tuned-to-pass.

### F11 — Eval out-of-corpus metric is broken

**Resolved by:** D11 (score by `match_quality`, not hit count, for empty-expected queries).

**Evidence:** Legacy plan's `eval.ts:3163` made out-of-corpus success conditional on `allHits.length === 0`. Hybrid retrieval almost always returns something; the metric punishes the tool for retrieving chunks even when it correctly labels them as `match_quality: 'none'`.

### F12 — HTTP/SSE transport sketch is unimplementable

**Status:** UNRESOLVED — flagged for Phase 6.

**Evidence:** Legacy plan Task 30 left `/messages POST` empty with comment `(Engineer follows MCP SDK examples; current API may have evolved...)`. SSEServerTransport requires bidirectional wiring through that POST channel. The whole public-MCP deploy gate (Task 38) depends on this working.

**Action for Phase 6 drafter:** Read current `@modelcontextprotocol/sdk` HTTP/SSE transport docs (use Context7 MCP via `mcp__plugin_context7_context7__query-docs`) and inline the actual transport code. Don't punt with "engineer follows examples." If the SDK has multiple transport options (SSE, Streamable HTTP), pick one explicitly.

### F13 — IRC encoding gap silently preserved

**Status:** DISSOLVED by D9-revised (2026-05-02). IRC is excluded from Arc 1 entirely; the encoding gap doesn't apply to a corpus that doesn't contain IRC.

**Original framing (kept for reference):** Legacy plan's Task 13 said "v1 ships with whatever the existing .mjs script produced." Memory `project_qw_oracle_irc_encoding_gap.md` documents the corruption. The original D9 said "accept it, document it, defer fix to Arc 3." The revised D9 goes further: drop IRC entirely.

**Action for the Phase 3 redraft:** No mojibake baseline gate, no `import-irc.ts`, no IRC-shaped tests. The Phase 3 already-drafted (commit `81f84d4`) is superseded; redraft per the recovery prompt in `handoff-prompt.md`.

### F14 — Voyage shared-embedding-space unverified

**Resolved by:** D8 (startup similarity check).

**Evidence:** Spec asserts shared space; legacy plan trusts it without testing. Dimension match is necessary, not sufficient. Silent geometric divergence = garbage retrieval with no error.

### F15 — Test files missed in MCP rewrite

**Status:** UNRESOLVED — flagged for Phase 6.

**Evidence:** Legacy plan Task 24 mentioned `maps.test.ts`. Also exist: `scripts/load-knowledge/load-maps.test.ts`, `scripts/load-knowledge/quality-grid.test.ts`. Both currently use `better-sqlite3`. Phase 6 (or whichever phase touches the loader test files — could be Phase 2) must port or delete them.

**Action for drafter:** When listing files to modify in a phase, run `grep -rln 'better-sqlite3\|bun:sqlite' apps/qw-oracle/` to confirm complete coverage.

### F16 — `schema.ts` exports beyond schema constants

**Status:** UNRESOLVED — flagged for Phase 2.

**Evidence:** `schema.ts` exports `SCHEMA_VERSION`, `HEAD_ORDINAL`, `INFO_KEY_SCOPES`, `LOG_TEMPLATE_CHANNELS` as runtime constants. Used by `extract-tag.ts` (HEAD_ORDINAL as ordinal sentinel for `head` version). Legacy plan deleted `schema.ts` wholesale.

**Action for Phase 2 drafter:** Decide where these constants relocate — likely `db/constants.ts` or similar — and add the relocation as an explicit task. Don't lose them.

### F17 — Plan-stated entity counts may be made-up

**Status:** UNRESOLVED — flagged for Phase 2 verification step.

**Evidence:** Legacy plan Task 10 expected "ezquake=4042, fte=3279, qwcl=380, mvdsv=1236" with a 5%-drift abort gate. SCHEMA.md shows partial counts (cvars 2901, commands 522, etc.) but no source for the per-project totals. If the numbers are estimated, the regression gate fires falsely.

**Action for Phase 2 drafter:** Replace "match these specific numbers" with "match counts in the current `data/knowledge.db` (run `SELECT project, count(*) FROM entities GROUP BY project` against SQLite first, write the numbers down, use them as the regression gate)." Phase 2 verification step records the actual numbers.

### F18 — Loader file list is incomplete

**Resolved by:** D4 (D4 implies all loader files get ported).

**Evidence:** Legacy plan named 6 adapter files. Real directory has 17+ adapter files plus several utility files. Verified by listing `apps/qw-oracle/scripts/load-knowledge/`.

**Action for Phase 2 drafter:** Phase 2 lists every `.ts` file in `scripts/load-knowledge/` (run the `ls` and paste the result; don't curate). Each gets a port checkbox.

---

## Phase ownership of findings

| Phase | Findings to verify before sign-off |
|---|---|
| Phase 1 (Foundation) | F5, F16 partial (constants relocation can start here) |
| Phase 2 (Layer 1 port) | F1, F2, F3, F4, F6, F7, F15 (load-knowledge tests), F16, F17, F18 |
| Phase 3 (Layer 2 port) | F9 (still applies — Discord has multi-language content); F13 dissolved by D9-revised (IRC excluded) |
| Phase 4 (Layer 3 + graph) | (none — legacy plan got Layer 3 mostly right) |
| Phase 5 (Embedding pipeline) | F14 |
| Phase 6 (MCP rewrite) | F12, F15 (mcp tests) |
| Phase 7 (Observability) | (none) |
| Phase 8 (Eval + deploy) | F10, F11 |

---

## Findings the legacy plan got right

For balance — these were good calls and should carry forward:

- Hand-rolled migrator over a framework (`node-pg-migrate` would be over-engineering for ~8 SQL files).
- `schema_meta` (renamed `schema_migrations` per D4) tracks applied migrations by sha256, refusing to re-apply modified migrations. Catches mid-migration edits.
- Hash-based incremental embedding (skip rows whose `*_sha256` matches the body hash) — minimises Voyage spend on re-runs.
- RRF k=60 default per literature.
- Markdown-heading chunker capped at 500 tokens with sentence-split fallback.
- Bind dev Postgres to `127.0.0.1:5432` so accidental network exposure is impossible.
- `pgvector/pgvector:pg16` Docker image (saves CREATE EXTENSION setup pain).
- `BIGSERIAL` for log/event tables (avoids INTEGER overflow in long-running deployments).
- `consumer_hint` column on `query_log` (per-MCP-client telemetry).
- Partial index on `query_log` for `match_quality IN ('weak', 'none')` — small index for the most-queried operator question ("what failed retrieval?").

These are not findings; they're commendations. They explain why the plan is recoverable instead of needing a from-scratch rewrite.

---

*End of review findings. New findings discovered during phase drafting append to this file with sequential F-numbers.*
