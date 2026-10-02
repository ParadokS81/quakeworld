# QW Oracle Eval - operator runbook

Two disjoint query files back the calibration sweep and the deploy gate. They MUST not share queries: per `decisions.md` D10, calibration tunes thresholds against `calibration-queries.json` only; the eval gate then runs against `eval-queries.json` only. Sharing queries would let calibration overfit to the gate.

## File shapes

`eval-queries.json` - the deploy gate. Recall@3 must be >= 70% before public DNS opens.

```json
[
  {
    "id": 1,
    "category": "concept-anchored | vague-natural-language | exact-name | out-of-corpus",
    "query": "the user-facing question",
    "expected_top_3": [
      "<canonical-id>",
      "concept:<slug>",
      "session:discord:<channel>:<started_at>"
    ],
    "tools": ["search_concepts", "search_entities", "search_solved_issues", "lookup_entity"]
  }
]
```

- `expected_top_3` is empty for `out-of-corpus` queries; the eval scores those by `match_quality`, not by hit count (D11 / F11). Pass condition: no tool returned `match_quality: 'strong'`.
- `expected_top_3` is populated for the other three categories; pass condition: at least one expected ID appears in the top-3 of the merged hit list.
- Layer 2 session hits use the canonical session id `session:<platform>:<channel>:<started_at>` exactly as `search_solved_issues` returns it. Do NOT add an extra `session:` prefix; the eval emits the canonical string verbatim and compares.
- `tools` is the list of MCP tools the eval will call for this query. Order is irrelevant; the eval merges hits across all tools called.

`calibration-queries.json` - cut-off sweep input for the closeness grade (`serve/mcp/src/grade.ts`).

```json
[
  {
    "id": 1,
    "query": "the user-facing question",
    "tool": "search_entities | search_concepts | search_solved_issues | lookup_entity",
    "expected": "strong | weak | none",
    "answers": ["ezquake:cvar:con_fragmessages", "concept:hud-configuration", "<chat thread_key>", "ezquake:cvar:hud_fps_*"],
    "source": "query_log:<id> | control | original:<n>",
    "note": "optional: why this label"
  }
]
```

- `expected` is what an honest label says given what the corpus HAS, not what search happens to find: `strong` = the answer is in the corpus, `weak` = part of it or something closely related, `none` = nothing on it. Judging coverage, not retrieval, is what lets the report separate search misses (`[answer not in top 3]`) from real gaps.
- `answers` are the ids that count as a right answer (entity `canonical_id`, `concept:<slug>`, chat `thread_key`; a trailing `*` matches a family). Empty for vague or uncovered questions.
- `lookup_entity` rows exercise the lookup fallback and are reported pass/fail; they do not feed the sweep.
- Most rows are real questions from prod's `query_log` (2026-08-06..09-29), labeled 2026-10-02; questions that name community members were left out. Thread keys can change when a (channel, year) is re-fenced -- re-check the chat rows after a harvest re-fence.
- The sweep is per corpus (entities / concepts / threads) and minimises a cost matrix in which `strong` on an uncovered question is the most expensive error. Copy the printed cut-offs into `DEFAULT_CUTOFFS` in `grade.ts`; the `*_MATCH_STRONG` / `*_MATCH_WEAK` env vars override them.

## Running

```bash
# From apps/qw-oracle/, dev DB:
bun run calibrate                                         # per-corpus report + best cut-offs
bun run eval                                              # runs the deploy gate

# Cut-offs printed by calibrate.ts go into DEFAULT_CUTOFFS in
# serve/mcp/src/grade.ts (shipped with the image). To override without a
# rebuild, set the printed *_MATCH_STRONG / *_MATCH_WEAK vars in
# /mnt/user/appdata/qw-oracle/.env and recreate mcp (up -d, not restart).
```

## How to extend

1. Open `#helpdesk` on the Quake.World Discord. Browse 30 minutes of recent history; find recurring questions.
2. For each, decide a category:
   - **concept-anchored** - answerable from a Layer 3 concept note. Add the slug + the most-relevant Layer 1 cvars to `expected_top_3`.
   - **vague-natural-language** - the user describes a symptom without naming the cvar. Same shape, but `expected_top_3` may include both Layer 3 and Layer 1.
   - **exact-name** - the user already knows the entity name; the query is a fact lookup. `expected_top_3` is a single canonical_id; `tools` is just `lookup_entity`.
   - **out-of-corpus** - the query is genuinely outside the corpus. `expected_top_3` is `[]`; the eval rewards the tool for labeling the response weak/none rather than confabulating.
3. Add to `eval-queries.json` (deploy gate) OR `calibration-queries.json` (threshold sweep), never both.
4. Re-run calibrate (if you extended the calibration file) or eval (if you extended the eval file).

The eval set is alive, not frozen - per the architecture spec (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md` lines 459-475). When the eval surfaces something *better* than the operator's `expected_top_3` guess, update the expected list to reflect the new understanding. The eval also doubles as a concept-note authoring queue: queries that should hit a concept note but don't are the prioritised list of new notes to author.
