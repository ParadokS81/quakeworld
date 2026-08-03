# Entity pre-fetch

Acquire the per-entity input bundle for every entity in the category. Each
entity contributes ONE sub-agent invocation downstream, so the pre-fetch
shape must match the sub-agent's input contract.

## Per-entity output shape (one record per entity)

```
{
  entity_name: <exact L1 entity name, e.g. "k_lockmap">,
  entity_type: <"cvar" | "command" | "cmdline_param" | "info_key">,
  category: <category passed to dispatcher; same for all entities in batch>,
  existing_description: <current L1 entities.description text, may be NULL>,
  source_ref: <"<source_file>:<source_line>" from L1>,
  catalog_line: <line number in the rendered HTML catalog>,
  anchor_version: <passed through from dispatcher arg>,
  batch_date: <passed through from dispatcher arg>
}
```

The per-card sub-agent consumes this record directly as its arg bundle.

## Source 1: direct Postgres query (PRIMARY, authoritative)

Run the helper script:

```bash
cd /home/paradoks/projects/quakeworld
bun apps/qw-oracle/scripts/list-entities-by-category.ts \
  --project ktx --category '<category>' --format json
```

Output is JSON: `[{name, type, description, source_ref, category_inferred, category_inferred_origin}, ...]`. Build the per-entity record above by combining each row with the dispatcher's pass-through args (`anchor_version`, `batch_date`, `catalog_line`). The `catalog_line` lookup is via the rendered catalog HTML (see Source 2).

NULL-description entities ARE returned by this script -- they show up with `description: null`. The dispatcher must handle them: typically by aborting the batch with `needs-synthesis` routing for the NULL-desc subset (route through `describe-fill-synthesis` first), or by passing them through to the per-card skill which will abort with `needs-synthesis` per its own pre-flight gate. The per-card skill's gate is the safety net; the dispatcher should catch this at pre-fetch time and surface the split to operator before fan-out.

## Source 2: catalog HTML metadata (secondary, for `catalog_line` lookup)

The rendered catalog at `apps/qw-oracle/docs/reviews/<YYYY-MM-DD>-<project>-l1-catalog.html` carries each entity's line number in the catalog. Parse this once at pre-fetch time and zip the line numbers into the records from Source 1.

The catalog HTML is generated from the same DB Source 1 reads, so the two are content-equivalent for entity rosters -- but HTML may be stale relative to current DB state. ALWAYS treat Source 1 as the authoritative roster; use HTML only for `catalog_line` enrichment.

## Source 3: MCP `mcp__qw-oracle__search_entities` -- DO NOT USE for enumeration

MCP `search_entities` is a hybrid retrieval tool (lexical tsvector + semantic pgvector + Reciprocal Rank Fusion) tuned for consumer-facing knowledge queries ("how do I X" / "what does Y do"). It is **structurally unsuitable for category enumeration**:

- No `category` parameter -- the schema accepts `query`, `project`, `type`, `limit` only.
- 25-result hard cap -- many categories have >25 entities (Frogbot 78, Match flow 70, etc.).
- Lexical path requires non-NULL `description_tsv`; semantic path requires non-NULL `description_embedding`. NULL-description entities are structurally invisible to both paths.

A 2026-05-27 post-mortem found 16 entities silently skipped because the dispatcher's documented MCP path didn't actually work and the operator workaround (semantic-intuition entity lists from the catalog HTML) made conceptual cuts that didn't match the DB's literal `category_inferred` membership. The MCP path is REMOVED from this dispatcher's pre-fetch contract. Internal arc workflows query DB directly; MCP stays in its lane (consumer-facing knowledge query).

If a future MCP tool offers true category enumeration (e.g. `list_entities_by_category`), it MAY return here as Source 1's complement -- but the current `search_entities` does not.

## When `entity_pre_fetch` arg is present

MAIN may pre-fetch entities and pass them directly to skip Source 1 above. In that case: validate the arg's shape against the per-entity output schema, then **still run the authoritative category-enumeration audit gate** (see SKILL.md pre-flight gate #5). The audit gate exists precisely to catch the pattern that broke the KTX arc -- a semantically-assembled list missing entities that DB rows would have surfaced.

`entity_pre_fetch` is a performance optimization (skip the Source 1 query), NOT a scope override. The audit gate is mandatory regardless of how the list was assembled.

## Validation

Before proceeding to fan-out:

- Every record has all 8 fields populated EXCEPT `existing_description` (which may legitimately be NULL); a null in any other field is a malformed record.
- `entity_name` is unique within the batch.
- `category` matches the dispatcher's `category` arg for all entities.
- `source_ref` parses as `<file>:<line>` (sub-agents will grep this).
- The category-enumeration audit gate passes (DB roster matches the pre-fetch list).

A malformed pre-fetch is a dispatcher bug, not a sub-agent bug. Catch it here, before fan-out, to avoid N sub-agents producing N abort reports.
