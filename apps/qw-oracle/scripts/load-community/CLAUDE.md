# scripts/load-community/

Layer 3 community-reference loader. Walks `apps/qw-oracle/data/wiki-snapshots/<date>/articles/*.json`, parses each article via the per-type parser (`players/parse.ts`, `clans/parse.ts`, `tournaments/parse.ts`), upserts row + (conditionally) markdown note. Each per-type subdirectory ships its own CLI; a shared/ subdirectory holds helpers reused across types.

## Layout

- `shared/wiki-text.ts` -- generic wikitext helpers (strip templates, resolve `[[Foo|Bar]]` links, extract `==Section==` body, normalize whitespace).
- `shared/wiki-types.ts` -- shared TypeScript shapes (ParsedTH, ParsedAchievement, ClanHistoryEntry, etc.) used by all three per-type parsers.
- `shared/iso-country.ts` -- nationality string -> 2-letter ISO code lookup table.
- `players/` -- Phase 2 player loader (parse, flags, upsert, emit-note, CLI).
- `clans/` -- Phase 3 clan loader (parse, flags, upsert, emit-note, CLI).
- `tournaments/` -- Phase 4 tournament loader (added in Phase 4).

## Loader pattern (per type)

Each per-type subdirectory follows this shape:

- `parse.ts` -- pure parser. Input: raw wikitext + categories. Output: rich `Parsed<Type>` object with structured fields (row data + cross-link inputs for Phase 5). No IO, no DB.
- `flags.ts` -- pure flag computation. Input: parsed object. Output: `{ is_substantive, has_note, is_stub, source_template }`. Heuristic-driven; tunable per D6 / D7.
- `upsert.ts` -- single-row idempotent UPSERT into `community.<type>` via postgres-js. Mirrors the load-concepts pattern: one transaction per slug.
- `emit-note.ts` -- pure markdown emitter. Input: parsed object + flags. Output: `{ slug, body }` written to `curated/<type>-notes/<slug>.md` only when `has_note=true`.
- `<type>.test.ts` -- bun tests using snapshot articles as fixtures (read from `data/wiki-snapshots/<date>/articles/`).
- `index.ts` -- CLI dispatcher: walk snapshot directory, parse each, upsert, emit. Supports `--dry-run` (parse only, no DB / no note write), `--limit N` (cap the count for smoke runs), `--slug <slug>` (single-article rerun).

## Always-on rules

- **Deterministic extraction (D4).** No LLM in the per-page loop. Regex / template-shape matching only. The Phase 4 tournament pilot is the one LLM-shaped task in the arc and is scoped to schema discovery, not parsing.
- **Two outputs per type (D1).** Every article in scope produces a row. Markdown notes are emitted only when has_note=true (D5).
- **Two-threshold flag model (D5).** is_substantive (recognition) and has_note (prose-content) are independent booleans. Do not conflate.
- **Bun runtime (D14).** All scripts run via `bun apps/qw-oracle/scripts/load-community/<type>/index.ts`. Use `import.meta.main` guards on CLI entry points. Tests use `bun test`.
- **Append-only migrations (D15).** New schema work lands as new migrations. This loader does not edit migrations 008+.
- **JSONB binding (D19).** Pass JS values to postgres-js via `tx.json(value as never)` for any JSONB column. The Phase 2/3 row schemas use TEXT[] arrays exclusively (no JSONB), so this rule is dormant for now; restated for Phase 4 awareness if a tournament JSONB column appears post-pilot.
- **Atomic per-slug upsert.** Row + (conditional) note are produced as a single logical unit. The DB UPSERT runs in a transaction; the markdown file write is best-effort outside the transaction (filesystem failure does not roll back the row, but the loader logs it for re-run).
