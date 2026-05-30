# Handoff: MCP realignment to KTX-era data

**Date:** 2026-05-30. **Owner:** fresh terminal, model of your choice (this is audit + design + implementation; brainstorm the verb decision before planning).
**Why a handoff:** the qw-oracle MCP was set up before the KTX arc and hasn't been touched since. The KTX arc loaded a rich new L1 layer (`gameplay_mechanics`: `game_mode` + ~309–317 `mode_default` overlays + 5 more kinds) but the **serving** side was never built. The data is correctly shaped; the tool surface and orientation blob were never widened — so the newest L1 data is stranded, and the orientation blob actively over-promises capabilities the tools don't deliver. MVDSV is landing next and needs the same intake discipline. Goal: run the KTX-era data through the MCP's own new-dataset checklist, fix the tools, re-truth the governing docs.

## Verified this session — do NOT re-derive

**The core gap — KTX gameplay L1 data is not reachable through the MCP:**
- `gameplay_mechanics.kind` was widened (migration `011`, `SCHEMA.md:521`) to add `game_mode` / `mode_default` / `election_type` / `score_system` / `drop_item` / `loc_macro` / `teamplay_message`. `mode_default` carries ~309–317 per-line overlays, **gated by `ruleset_gate_json = {"mode":"<token>"}`** and tagged **`props_json.initstring_array = '<array>'`** (`SCHEMA.md:521`, `_methodology/.../concept-note-frontmatter-schema.md:58`). The data is built for "give me mode X's settings."
- `search_mechanics` (`serve/mcp/src/tools/search-mechanics.ts`): its `kind` filter enum lists **only the 8 original kinds** — the 7 KTX kinds aren't selectable. No `mode` / gate filter. Result rows = `{kind,name,value_numeric,value_text,source_ref}` — they don't return `ruleset_gate_json`/`props_json`, so results can't even be post-filtered by mode.
- `lookup_mechanic`: single row, by exact name, `LIMIT 1`. Can't enumerate a mode's overlay set.
- The L3 `mode_default_init_array` frontmatter pointer has **zero code consumers** (grep) — no resolver turns `carena_um_init` into its settings.
- `orientation.ts` **tells the consumer LLM to use `kind='mode_default'` / `'game_mode'` on `search_mechanics`/`lookup_mechanic`** — but the tool schema doesn't expose those kinds. Discovery contract is actively lying.
- `lookup_entity`/`search_entities` `ENTITY_TYPE_ENUM` = `[cvar,command,macro,cmdline_param,ruleset]` — the KTX `match_event` type (`entities.type='match_event'`) isn't in the filter enum. Findable by exact name (no type filter), but not advertised or filterable. **Verify scope** (may be intentional "user-facing five," may be a gap).

**Stale governing docs:** `VISION.md` "Current reality" still says *"KTX — engine port not started"* and *"ten tools"* (actual: 12). `API_CONTRACTS.md` "Open drift" lists 2 items, neither KTX.

**Related (already owned by the notes terminal — boundary, don't touch):** L3 concept search matches on **body chunks only** (`concept_chunks`, lexical+semantic RRF); frontmatter is the returned signal + graph wiring, not embedded (`search-concepts.ts`, `parse.ts`, `chunking.ts`). `activation_summary` frontmatter field has 0 consumers. The concept-note refactor (body-complete) is being handled in the originating terminal.

## Approach — run the contract's own checklist

`API_CONTRACTS.md` is the spec: three contracts (Discovery / Query / Storage) + a **new-dataset checklist**. The KTX data closed Storage and skipped Query. Work it:
1. **Verify the data first** (don't trust this doc blind): query `gameplay_mechanics` for a mode — confirm `{"mode":"carena"}`-gated rows exist with `props_json.initstring_array` set. Confirms the data is sound before building tools on it. **The fix is tools + docs, not data.**
2. **The key design fork (brainstorm this):** a game mode is **composite** (catalog row + N mode-gated overlays + related cvars/commands + L3 note). The existing verbs (lookup-by-name / filter-list) don't assemble composites. Options:
   - **(a)** Widen `search_mechanics`: add the missing kinds + a `mode` filter (on `ruleset_gate_json->>'mode'`) + return the gate in rows. Minimal; fits the existing verb.
   - **(b)** Add a small composite verb (`describe_mode` / `lookup_mode`) returning the catalog row + its overlays + related entities in one envelope. New verb, matches the dominant question "tell me about mode X," justified under the checklist's "new verb earns a tool" rule. Mind the ~15-tool ceiling.
   - Likely **both layered**, but decide deliberately.
3. **Close Discovery + Query:** update the orientation blob in the **same commit** as any tool change (`API_CONTRACTS.md` update rule). Define the `match_quality` story for the new surface. Recalibrate if a ranked tool changes.
4. **Re-truth the docs:** `VISION.md` current-reality + tool count; `API_CONTRACTS.md` Open-drift + tool catalog.

## First three actions
1. Read `API_CONTRACTS.md` (checklist + 3 contracts), `VISION.md` (intended shape), `serve/mcp/src/orientation.ts` (what's promised), and the mechanic tools (`search-mechanics.ts`, `lookup-mechanic.ts`).
2. Verify the live `mode_default` gate shape (action 1 above).
3. Brainstorm the verb fork (2a / 2b / both), then plan + execute against the checklist.

## Don'ts
- Don't change the **data** — verify it, don't repair it. Fix is tools + docs.
- Don't add a tool without the orientation-blob update in the same commit.
- Don't blow the tool-count discipline (~15 healthy / ~25 hard) — prefer a discriminator/filter on an existing tool unless the verb is genuinely new.
- Don't touch concept-note bodies — the originating terminal owns that refactor, running body-complete in parallel.

## Coordination
- **Notes refactor** (originating terminal): body-complete, MCP-independent — no collision.
- **MVDSV** (other terminal, early discovery): a caveat is being injected there to route its new L1 data through this same checklist.
