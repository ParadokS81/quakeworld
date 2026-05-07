# Cross-engine description borrow (QWCL <- ezquake) -- parking

**Date opened:** 2026-05-07
**Status:** Parked. Designed; awaiting trailing-comment fix to ship first per "narrow arc before broad" sequencing.
**Sibling thread:** `docs/superpowers/parking/2026-05-07-ktx-postreview-investigation-and-prod-prep.md` (KTX post-review work; the trailing-comment fix is part of that thread).

## Problem

QWCL has 187 cvars in our DB and **0 of them have descriptions**. Two reasons compound:
1. QWCL handler at `apps/qw-oracle/scripts/extractors/qwcl/_handler_cvars.py:129` hardcodes `"trailing_comment": None` -- same shape as the KTX handler bug we're fixing in the trailing-comment fix arc. Could be fixed similarly, but...
2. QWCL is 1996-vintage source with very minimal inline commenting. Even if the handler harvested trailing comments, yield would be near-zero. So the trailing-comment fix doesn't help QWCL meaningfully.

But: QWCL is a Quake 1 engine ancestor of modern ezquake. Many cvars have names that match documented ezquake cvars exactly. Those names share semantics -- `bgmvolume` is CD music volume in both; `bottomcolor` is pants color in both; `cl_bob` is weapon bob in both; etc.

## Opportunity (quantified on dev DB, 2026-05-07)

- **156 of 187** QWCL cvars (83%) have a name-match with a documented ezquake cvar.
- Sample of borrowed descriptions looks high-quality -- Quake-era cvars are stable across forks (verified by inspection of 15-row sample including bgmvolume / bottomcolor / cl_anglespeedkey / cl_bob / cl_bobcycle / cl_chasecam / cl_crossx / cl_forwardspeed / cl_hightrack / cl_hudswap).
- Remaining 31 (17%) are QWCL-specific or have no ezquake equivalent with description.

## Design

**Schema delta** (single column on `cvar_versions`):

```sql
ALTER TABLE cvar_versions
  ADD COLUMN description_inherited_canonical_id TEXT NULL;
```

Stores a pointer to the source-of-truth entity (e.g. `ezquake:cvar:bgmvolume`), not the borrowed text. Deriver fallback resolves the pointer at derive time, so if ezquake's description ever updates, the borrow auto-refreshes on the next re-derive sweep -- no stale-text problem.

**Deriver extension** in `apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts`'s `deriveCvar`. Add a final fallback after own-sources:

```sql
description = COALESCE(
  NULLIF(CONCAT_WS('. ', help_desc, help_remarks, help_values_synth), ''),
  NULLIF(TRIM(trailing_comment), ''),
  (SELECT description FROM entities src
   WHERE src.canonical_id = cv.description_inherited_canonical_id)
)
```

**Backfill**: one-shot script that, for each QWCL cvar, finds the matching ezquake cvar by name (case-insensitive) and populates `description_inherited_canonical_id`. Re-runnable; idempotent.

**Embedding**: stays clean text. Voyage embeds the borrowed description as-is. No markers in description text. Provenance lives in the column, not in the embedded content -- so no semantic skew, no "ezquake" string accidentally pulled into QWCL embeddings.

**MCP retrieval**: no change. Operator decided the LLM doesn't need to know the description was borrowed; it's just the description. The DB knows where it came from (column populated) for any future audit / debugging needs.

## Voyage cost

156 short-string embeddings at voyage-4-large rates: well under $0.05. Negligible against the ~134k of 200M lifetime grant.

## Open questions before implementation

1. **Apply to MVDSV?** MVDSV has 35 cvars covered by trailing-comment fix and 148 without trailing comments. How many of those 148 have name-matches in ezquake? Worth a quick SQL check before this arc starts. Could fold MVDSV borrow into the same migration.
2. **Apply to FTE?** FTE has 1883 with help_desc but 599 without. How many of those 599 have name-matches in ezquake? Similar check.
3. **Apply to KTX?** KTX has 0 with descriptions today. After the trailing-comment fix, KTX will have ~75 with descriptions. The remaining 185 are mostly k_-prefixed ruleset cvars with no ezquake equivalent. Borrow is unlikely to help materially -- spot-check before deciding.
4. **Cross-borrow shape?** Could ezquake also borrow from MVDSV for any sv_-prefixed cvars where MVDSV has trailing_comment but ezquake has no description? Edge case; probably rare.

## Next-session pickup

1. Read this parking doc and the sibling parking doc (the KTX post-review one).
2. Confirm trailing-comment fix has shipped (parent arc).
3. Run the borrow-coverage queries for MVDSV, FTE, KTX to scope which engines get the borrow.
4. Draft the migration + deriver extension + backfill script in one commit per D16.
5. Operator review before implementation per "Planning First -- Non-Negotiable" CLAUDE.md.

## Related

- Sibling thread: trailing-comment fix (KTX post-review investigation parking doc).
- Discovery context: today's session's investigation of KTX cvar embedding gap surfaced this opportunity (operator's detective brain on the 28 ezquake CODE_ONLY cvars led to the cross-engine borrow idea).
- Provenance discussion (operator preference for column-based, not text-marker): captured live during the brainstorm.
