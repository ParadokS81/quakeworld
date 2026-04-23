# Extraction-review skill + CLI — Design

**Date:** 2026-04-23
**Status:** Design (pre-implementation). Ships the skill + CLI that gate Phase 2f historical backfill.
**Related HANDOVER items:** #1 (Extraction-review skill + CLI — this spec resolves), #4 (Rebuild-and-load CLI subcommand — absorbed by `extract-tag`).

## Goal

Build a per-tag-pair review process that prevents Phase 2f historical backfill from silently absorbing novel findings (new entity types, retirements, category crossings, unclassified promotions, source-invisible release-note changes). Every finding gets forced into exactly one of five dispositions — classify / mark-orphan / concept-note / handover / reject-as-noise — so that walking backwards through 15+ ezQuake tags produces curated hygiene events, not a pile of uncaptured debt.

ezQuake is the sole target for the first-run validation. FTE / MVDSV / KTX ports come only after the ezQuake walk is fully satisfied.

## The problem this solves

Today's pipeline extracts-then-loads silently. Novel findings during a tag-pair diff pass unnoticed unless someone eyeballs the change_events stream. The schema-v7 `.kmap` finding (an orphaned-historical loader that survived as a bundled asset via nQuake) was surfaced by accident while auditing one specific extension. Without a deliberate review step, the next such finding — and there will be many across 15 tags of history — will absorb silently and the knowledge base will drift out of alignment with source truth.

The review skill + CLI is the forcing function that closes that gap.

## High-level shape

Two composable halves:

- **CLI** — mechanical. New `review` subcommand in `apps/qw-oracle/scripts/load-knowledge/` reads change_events, relation_changes, source_state_transitions, release_notes, seed YAMLs, entity-types.md, and concept-notes index. Emits a findings report as JSON on stdout and pre-seeds a markdown review draft at `apps/qw-oracle/docs/reviews/YYYY-MM-DD-<project>-<from>-to-<to>.md`. No decisions, no side-effects outside that draft file. A companion `extract-tag` subcommand encapsulates the mechanical prep (checkout + python extractor + load-version x9 + load-assets + release-notes) so skill pre-flight can call it atomically.
- **Skill** — judgment. User-global `~/.claude/skills/extraction-review/SKILL.md`. Orchestrates extraction pre-flight by shelling out to CLI subcommands (extract-tag, diff, release-notes, enrich) only when the DB state requires them, then calls `review` to produce findings, then walks findings interactively in a Model B shape: Claude proposes a disposition with rationale, user approves / overrides / skips / aborts. On approval, skill writes the disposition's side-effect (seed update, DB column stamp, concept-note stub, HANDOVER entry) and fills the matching block in the draft markdown. Commits at the end when all findings are non-pending.

The review log itself — `apps/qw-oracle/docs/reviews/<date>-<project>-<from>-to-<to>.md` — is process exhaust, not a knowledge layer. It records "we looked at this tag-pair, found N findings, these were the dispositions and why" for human re-read. Knowledge produced by the review (seeds, DB stamps, concept notes) flows into the correct existing layer; the review log only documents the paper trail.

## Scope — in

- `review` subcommand in `apps/qw-oracle/scripts/load-knowledge/` that produces findings JSON + pre-seeded markdown for a single (project, from, to) tuple.
- `extract-tag` subcommand that encapsulates the mechanical prep for one tag (absorbs HANDOVER item #4).
- `extraction-review` user-global skill at `~/.claude/skills/extraction-review/SKILL.md`.
- New directory `apps/qw-oracle/docs/reviews/` for committed review logs.
- ezQuake as the sole first-run target.

## Scope — out (deferred)

- Schema v9 widening `verification_status` to `asset_loader_sites` / `asset_cvar_bindings`. Only add when a Phase 2f finding on a non-extension relation demands it.
- MCP integration for reading review logs (they are process exhaust; consumers should not need them).
- FTE / MVDSV / KTX support in `extract-tag`. ezQuake-only stub; other projects added when their extractors ship and after the ezQuake walk is fully validated.
- Dashboard regen on review commits (dashboard itself is shelved — HANDOVER item #3).
- Automated tests. First live review run is the validation.

## Architecture

### Data flow per invocation

```
user                skill                   CLI                      DB / filesystem
  |                   |                       |                          |
  | /extraction-review|                       |                          |
  |------------------>|                       |                          |
  |                   | preflight queries     |                          |
  |                   |--------------------------------------------->    |
  |                   | if tag not loaded:    |                          |
  |                   | npm run ... extract-tag                          |
  |                   |---------------------->|                          |
  |                   |                       | checkout + python + load |
  |                   |                       |------------------------->|
  |                   | (diff, release-notes, |                          |
  |                   |  enrich as needed)    |                          |
  |                   |---------------------->|                          |
  |                   | review --from X --to Y|                          |
  |                   |---------------------->|                          |
  |                   |                       | SELECT ... emit JSON     |
  |                   |                       |   + write draft .md      |
  |                   |                       |------------------------->|
  |                   | JSON findings         |                          |
  |                   |<----------------------|                          |
  | per finding: "I   |                       |                          |
  |  propose classify"|                       |                          |
  |<------------------|                       |                          |
  | approve/override  |                       |                          |
  |------------------>| apply disposition     |                          |
  |                   |  (write seed / stamp  |                          |
  |                   |   DB / add note /     |                          |
  |                   |   HANDOVER entry),    |                          |
  |                   |  fill in .md          |                          |
  |                   |------------------------------------------------->|
  | (repeat per finding until done)           |                          |
  | commit                                    |                          |
  |<------------------|                       |                          |
```

### Boundary rule

CLI never writes anywhere except its own draft markdown file + stdout. Skill is the only thing that writes to seeds, concept-notes, HANDOVER, or DB hygiene columns. This keeps the judgment layer (skill prompt) separate from the mechanics layer (TypeScript).

## CLI shape

### `review` subcommand

**Signature:**

```
npm run load-knowledge -- review \
  --project <ezquake|fte|mvdsv|ktx> \
  --from <v1> --to <v2> \
  [--out <path>] [--force]
```

- `--out` defaults to `apps/qw-oracle/docs/reviews/YYYY-MM-DD-<project>-<from>-to-<to>.md` using today's date.
- `--force` overwrites an existing draft; without it, the CLI errors if the file already has any filled-in disposition blocks.

**Pre-flight checks (all hard-error):**

1. Both versions exist in `versions` table.
2. `change_events` has rows keyed to `to_version`.
3. `release_notes` has rows for the to-version.
4. Output path does not exist with partial dispositions unless `--force`.

Errors point at the prerequisite subcommand to run first. No auto-run from the CLI side — the skill decides when to trigger prerequisites.

### `review/` subdirectory layout

```
apps/qw-oracle/scripts/load-knowledge/review/
├── index.ts                        # runReview dispatcher
├── types.ts                        # Finding, Bucket, DraftFinding
├── findings-additions.ts           # Q1
├── findings-retirements.ts         # Q2
├── findings-semantic-crossings.ts  # Q3
├── findings-unclassified.ts        # Q4
├── findings-source-invisible.ts    # Q5
└── draft-writer.ts                 # markdown emitter
```

Each `findings-*.ts` exports `find(db, project, from, to): Finding[]`. `index.ts` concatenates results, stamps the `bucket` field, writes JSON to stdout and markdown to `--out`.

### The Finding contract (JSON)

```ts
type Bucket = 'addition' | 'retirement' | 'semantic-crossing' | 'unclassified' | 'source-invisible';

interface Finding {
  id: string;                     // stable hash: bucket + natural key
  bucket: Bucket;
  summary: string;                // one-line human description
  evidence: {
    entity_ref?: string;
    relation_row_key?: string;
    commit_sha?: string;
    source_file?: string;
    source_line?: number;
    from_value?: string;
    to_value?: string;
    release_note_body?: string;   // Q5 only
  };
  proposed_disposition?: {
    kind: 'classify' | 'mark-orphan' | 'concept-note' | 'handover' | 'reject-as-noise';
    rationale: string;
  };
}
```

The CLI populates `proposed_disposition` only for trivial cases (whitespace-only source_file changes, new cvar matching an existing family pattern). Most dispositions are proposed by the skill with full cross-source context.

### JSON envelope on stdout

```json
{
  "project": "ezquake",
  "from_version": "3.5.0",
  "to_version": "3.6.0",
  "generated_at": "2026-04-23T...",
  "draft_path": "apps/qw-oracle/docs/reviews/2026-04-23-ezquake-3.5.0-to-3.6.0.md",
  "counts": { "addition": 12, "retirement": 1, "semantic-crossing": 4, "unclassified": 0, "source-invisible": 2 },
  "findings": [ /* Finding[] */ ]
}
```

### `extract-tag` subcommand

**Signature:**

```
npm run load-knowledge -- extract-tag \
  --project ezquake \
  --version <tag> \
  [--github-token <t>]
```

**Steps (atomic, any failure leaves DB in pre-call state via transaction):**

1. Checkout tag in the ezQuake repo at `research/repos/ezquake-source`.
2. Run `packages/qw-config/scripts/extract-ezquake-unified.py` against the checkout; writes JSON outputs to `packages/qw-config/src/data/`.
3. Call `loadVersion` for each of the 9 entity types with the appropriate JSON path.
4. Call `loadAssets` for the asset bundle.
5. Call `loadReleaseNotes` if a GitHub token is provided (or the env var is set); otherwise leave release_notes empty and let the review pre-flight catch it.

Errors halt on step failure. Re-running is safe — all underlying loaders are idempotent on (project, version) keys.

## Skill shape

### Location

`~/.claude/skills/extraction-review/SKILL.md` — user-global, peer to `docs-check`. Skill invocation via `/extraction-review` or trigger phrases like "extraction review", "review tag pair", "phase 2f review".

### Pre-flight protocol (skill drives, CLI executes)

Skill pre-flight is self-healing. On invocation with (project, from, to):

| Check | Action on miss |
|---|---|
| `versions` row for `<from>` | `extract-tag --version <from>` |
| `versions` row for `<to>`   | `extract-tag --version <to>`   |
| `change_events` for `to_version=<to>` | `diff --from <from> --to <to>` |
| `release_notes` for `version=<to>`    | `release-notes --project <p> --version <to>` |
| PR enrichment freshness               | `enrich --project <p> --limit 50` |

Only after all five pass does the skill invoke `review`.

### Interactive walk (Model B)

For each finding in the JSON response with disposition still pending:

1. Show `summary` + key evidence fields.
2. If `proposed_disposition` is present → show it with rationale and ask "approve / override / skip?"
3. If absent → skill reads seeds, entity-types.md, concept-notes/, and runs `git log <commit_sha>` to derive its own proposal, then presents "I propose X because Y — approve / override / skip?"

User responses:

- **approve** — apply side-effect, record disposition in draft markdown with `Applied:` timestamp.
- **override** — user picks a different disposition; re-apply.
- **skip** — leave finding as `pending` in draft; do not commit.
- **abort** — halt the walk, leave partial draft on disk (resumable).

### Side-effect routing

| Bucket | Disposition | Side-effect |
|---|---|---|
| addition | classify | Edit `packages/qw-config/seeds/<appropriate>.yaml` or prose update to `entity-types.md` |
| addition | concept-note | Create `apps/qw-oracle/concept-notes/<slug>.md` from the README template, frontmatter pre-filled |
| addition | reject-as-noise | Record reason in draft; no file change |
| retirement | mark-orphan | `UPDATE asset_extensions SET verification_status='orphaned_historical', verification_reason=?` — widen to peer tables (schema v9) only when a real non-extension case appears |
| retirement | classify | Update entity-types.md taxonomy prose; entity row `source_retired` is already stamped by diff pipeline |
| retirement | concept-note | Same as addition variant |
| semantic-crossing | classify | Edit appropriate seed |
| semantic-crossing | concept-note | Category shifts are the canonical Layer 3 source |
| semantic-crossing | reject-as-noise | Record; rare |
| unclassified | classify | Promote `confidence='unclassified'`/`'heuristic'` → `'certain'`, edit notes |
| unclassified | handover | Defer as HANDOVER entry if extractor work is needed |
| source-invisible | concept-note | Release-note facts that don't fit Layer 1 shape |
| source-invisible | handover | Implies extractor-missing-feature |
| any | reject-as-noise | No file change; rejection recorded in draft |

### Draft markdown structure

CLI emits, skill fills:

```markdown
---
project: ezquake
from_version: 3.5.0
to_version: 3.6.0
generated_at: 2026-04-23T14:00:00Z
reviewer: claude-opus-4-7 + ParadokS
status: draft | complete
---

# Extraction review: ezquake 3.5.0 -> 3.6.0

## Summary

- Additions: 12 (0 pending)
- Retirements: 1 (0 pending)
- Semantic crossings: 4 (0 pending)
- Unclassified promotions: 0
- Source-invisible changes: 2 (0 pending)

## Findings

### F-001 addition · cvar · cl_newfeature

**Summary:** New cvar `cl_newfeature` added at `cl_cmd.c:1340`.

**Evidence:**
- commit: abc123 (Add cl_newfeature toggle #2847)
- entity_ref: ezquake:cvar:cl_newfeature
- from_value: -
- to_value: "0"

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
```

Once the skill has approved a disposition, the three `_(pending)_` lines fill in.

### Commit protocol

After walking all findings:

- If all findings are non-pending: `git add` the draft, any modified seeds, entity-types.md changes, new concept notes, HANDOVER.md changes, and the knowledge.db file (if DB stamps were applied). Single commit: `review(qw-oracle): ezquake <from> -> <to> -- N findings`.
- If some findings still pending (skip or abort): no commit; skill tells user which finding IDs are still pending and how to resume.

### Resume protocol

Finding IDs are stable hashes (bucket + natural-key). Re-running `review` on the same (project, from, to) produces identical IDs. Skill detects an existing draft, loads prior dispositions from the markdown, and only walks findings still marked `pending`.

## Schema evolution

No new schema version for this feature. The review process reads existing tables (change_events, relation_changes, source_state_transitions, release_notes) and writes to the existing `asset_extensions.verification_status` column.

A schema v9 widening of `verification_status` to `asset_loader_sites` or `asset_cvar_bindings` may be triggered by a Phase 2f finding where a `mark-orphan` disposition applies to a non-extension relation. That migration is deferred until a real case demands it — the review skill itself does not pre-empt the schema evolution.

## Testing strategy

- **Compile gate:** `bunx tsc --noEmit` from `apps/qw-oracle/` must pass.
- **Manual verification:** first live Phase 2f tag-pair (user's choice) is the end-to-end test. Covers pre-flight self-healing, review generation, interactive walk, every disposition path, commit, and resume.
- **Idempotency check:** running `review` twice against the same DB state produces byte-identical JSON output (modulo timestamp).
- **No automated tests.** Judgment paths are non-deterministic by design; mechanical paths are thin SQL adapters that will fail loudly.

Observations from the first review become inputs to the second pair — tight feedback loop, not a big-bang validation.

## File inventory

### New files

```
apps/qw-oracle/scripts/load-knowledge/extract-tag.ts
apps/qw-oracle/scripts/load-knowledge/review/index.ts
apps/qw-oracle/scripts/load-knowledge/review/types.ts
apps/qw-oracle/scripts/load-knowledge/review/findings-additions.ts
apps/qw-oracle/scripts/load-knowledge/review/findings-retirements.ts
apps/qw-oracle/scripts/load-knowledge/review/findings-semantic-crossings.ts
apps/qw-oracle/scripts/load-knowledge/review/findings-unclassified.ts
apps/qw-oracle/scripts/load-knowledge/review/findings-source-invisible.ts
apps/qw-oracle/scripts/load-knowledge/review/draft-writer.ts
apps/qw-oracle/docs/reviews/.gitkeep
~/.claude/skills/extraction-review/SKILL.md
```

### Modified files

```
apps/qw-oracle/scripts/load-knowledge/index.ts   # register extract-tag + review subcommands; update usage banner
apps/qw-oracle/CLAUDE.md                          # add extract-tag + review to commands block
HANDOVER.md                                       # remove items #1 and #4 on ship
```

### Deletions

None.

## Implementation order

Smallest-unit-first so each step compiles in isolation:

1. `review/types.ts` — interfaces only. Compiles standalone.
2. `review/draft-writer.ts` — pure function emitting markdown from Finding[] + metadata.
3. Five `findings-*.ts` modules — each exports a single `find` function against existing schema. Exercised one at a time against the live DB.
4. `review/index.ts` — composes finders, calls draft-writer, emits JSON.
5. `extract-tag.ts` — orchestrates checkout + python extractor + 9 load-version calls + load-assets + release-notes via existing loader modules.
6. `index.ts` subcommand registration for `extract-tag` and `review`.
7. `SKILL.md` — skill prompt with pre-flight protocol, Model B walk template, side-effect routing, commit protocol, resume protocol.
8. **First live run** — Phase 2f first ezQuake tag-pair. Replaces automated tests.
9. HANDOVER cleanup: delete items #1 and #4.

## Acceptance criteria

- `bunx tsc --noEmit` clean from `apps/qw-oracle/`.
- `npm run load-knowledge -- review --project ezquake --from <v1> --to <v2>` produces JSON on stdout + writes a draft markdown to `apps/qw-oracle/docs/reviews/`.
- `/extraction-review` walks the full interactive flow on that pair and produces a committed review log + populated side-effect files.
- HANDOVER items #1 and #4 are deleted.

## Open questions

None. All five design questions closed during brainstorm:

1. Disposition model: **B** — Claude proposes, user approves.
2. Audit trail location: **A** — markdown at `apps/qw-oracle/docs/reviews/`, not a knowledge layer.
3. Release-notes coverage: **C** — CLI hard-errors if `release_notes` missing for to-version.
4. Skill cadence: **A** — one tag-pair per invocation.
5. CLI output shape: **B** — stdout JSON + pre-seeded markdown draft.
6. Extraction orchestration: **C** — new `extract-tag` CLI subcommand; skill orchestrates decisions via CLI calls.
