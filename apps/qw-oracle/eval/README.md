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

`calibration-queries.json` - threshold sweep input.

```json
[
  {
    "id": 1,
    "query": "the user-facing question",
    "expected_in_corpus": true,
    "primary_tool": "search_concepts"
  }
]
```

- `expected_in_corpus` is `true` if the corpus should answer the query; `false` if not. The sweep maximises label accuracy across both classes.
- `primary_tool` is currently `search_concepts` only; calibration only probes `search_concepts` because the same env-var thresholds (`MATCH_QUALITY_STRONG_THRESHOLD` / `MATCH_QUALITY_WEAK_THRESHOLD`) apply across `search_concepts` and `search_entities` (Phase 6 imports them in both tools). If the two tools diverge in the future, calibration becomes per-tool.

## Running

```bash
# From apps/qw-oracle/, dev DB:
bun run calibrate                                         # prints best STRONG / WEAK thresholds
bun run eval                                              # runs the deploy gate

# Threshold values printed by calibrate.ts are written to:
#   - apps/qw-oracle/.env (dev DB)
#   - /mnt/user/appdata/qw-oracle/.env (Unraid prod DB; see deploy/README.md)
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
