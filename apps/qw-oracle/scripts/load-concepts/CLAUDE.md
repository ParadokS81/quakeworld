# scripts/load-concepts/

Layer 3 loader. Walks `apps/qw-oracle/concept-notes/*.md`, parses each into a normalised `ParsedConcept`, and upserts into Postgres atomically per slug. The MCP `get_concept_note` tool reads `concepts` / `concept_chunks` / `concept_entities` / `concept_concepts` after Phase 6 cuts over.

## Files

- `parse.ts` -- pure: frontmatter parse via `gray-matter`, body chunked via `shared/chunking.ts`, `related_entities:` partitioned into entity refs vs external refs (commits / PRs / extensions), per-chunk sha256 computed.
- `upsert.ts` -- one transaction per slug: UPSERT `concepts`, DELETE+INSERT `concept_entities`, DELETE+INSERT `concept_concepts`, conditionally DELETE+INSERT `concept_chunks` (only when `body_sha256` changed).
- `index.ts` -- CLI walker: reads the directory, runs the body-link drift check, calls upsert, prints a summary.
- `parse.test.ts` / `upsert.test.ts` -- bun test; the upsert test hits `qw_oracle_test` per D13 and refuses to run against any other DB.

## Partition rule

`related_entities:` in note frontmatter mixes real entity refs (`ezquake:cvar:cl_bob`) with external artifact refs (`ezquake:commit:7c328aa4`, `ezquake:pr:1234`, `ezquake:extension:fbsp`). Only the entity refs land in `concept_entities`; external refs stay only in `concepts.frontmatter` JSONB so the original frontmatter shape is recoverable.

The partition rule is "3-part canonical_id where parts[1] is NOT in `{commit, pr, extension}` -> entity." Broader than the `serve/mcp/src/concept-loader.ts` set (which is the user-surface filter for the in-memory map). The graph table is the source of truth for `lookup_entity(id).linked_concepts` across all Layer 1 entity types after Phase 6.

## Body-link drift check

Loader pre-flight: any markdown link in a body that points at a concept slug (`[text](concept-notes/<slug>.md)` or `[text](<slug>.md)`) emits a warning if that slug is not in the note's `related_concepts:` frontmatter. No current note carries `related_concepts:`, so the warning fires once per cross-link until operator backfills.

## Always-on rules

- **JSONB columns receive JS values, not pre-stringified JSON.** Pass via `tx.json(value as never)`. Pre-stringifying stores a JSONB string scalar (the legacy SQLite-era TEXT bug). Probe `F1.jsonb_columns_not_strings` is the regression gate; Phase 4's verification step 9b is the Layer 3 instance.
- **tsvector config is `'english'` (D7).** Layer 3 corpus is curated English content where stemming improves recall. Layer 2 chat stays on `'simple'` because that corpus is mixed-language; the configs are intentionally different.
- **Atomic per-slug upsert.** All four writes (concepts, concept_entities, concept_concepts, concept_chunks) happen in one `db.begin(...)` transaction so a partial failure rolls back; the MCP never sees a half-rebuilt concept.
- **Hash-skip on chunks.** When a note's body sha256 hasn't changed, the loader skips the DELETE+INSERT on `concept_chunks` so Phase 5's embeddings survive. Graph rows always rebuild (cheap; drift-proof).

## What Phase 5 will add

- `embed-chunks.ts` worker that reads `concept_chunks WHERE embedding IS NULL OR embedding_stale = TRUE`, calls Voyage `voyage-4-large`, writes the vector back, clears the stale flag.
- Per-call `embedding_api_log` row.
- Batch sizing per Voyage's API rate limits.

Phase 4 does NOT integrate embeddings -- the column is created NULL and embedding_stale defaults FALSE.

## What Phase 6 will add

- `search_concepts` MCP tool over RRF(tsv_score, vector_score) on `concept_chunks`.
- Bidirectional graph reads: `lookup_entity` adds `linked_concepts: [...]` from `concept_entities`.
- Reads concepts directly from Postgres (retiring `serve/mcp/src/concept-loader.ts`'s in-memory map).
- `redirect_to_human` MCP tool seeded against `redirect_targets` (Phase 4 ships the table empty).
