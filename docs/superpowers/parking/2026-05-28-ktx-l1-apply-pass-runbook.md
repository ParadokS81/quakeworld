# KTX L1 apply pass -- Phase 1 runbook

**Date:** 2026-05-28
**Owner:** fresh terminal (this is the handoff doc -- single-session execution)
**Estimated effort:** 1-2 hours (mostly script-runs + verification)

## What this phase does

Applies 633 KTX cvar+command v2 recasts to `entities.description` in
`qw_oracle` Postgres, along with provenance stamps:

- `description` -- the v2 recast text
- `description_origin = 'recast_v2'` -- new vocab entry
- `description_anchor_version = <draft anchor>` -- e.g. `v1.36-1633-g67253dc`
- `description_embedding_stale = TRUE` -- forces Voyage re-embed on next pass
- `description_rereview = FALSE` -- recast is the current intent, not flagged
- `shape_classification` -- Layer B typology (new column from migration 018)

**This phase does NOT:**

- Touch the Layer B `entity_relations` table (Phase 2 work, separate brainstorm)
- Re-deepen cards with thin descriptions (accepted as 80% yield; community
  feedback iterates from there)
- Refresh embeddings (separate Voyage refresh job picks up
  `description_embedding_stale = TRUE` rows asynchronously)

## Prior context (cold-read these in order)

1. **`docs/superpowers/parking/2026-05-27-ktx-l1-apply-pass-strategy-handoff.md`**
   -- the brainstorm handoff that produced THIS runbook. Read for arc context,
   the spot-check decision, and the per-batch yield distribution.
2. **`docs/superpowers/reviews/2026-05-27-ktx-l1-chunked-mode-dispatch-arc-post-arc-analysis.md`**
   sections YELLOW 2 (apply pass not yet run) + Recommendations #2/#6 -- the
   apply pass arc reasoning.
3. **`apps/qw-oracle/docs/reviews/2026-05-28-spot-check-digest-ktx-l1-apply-phase1.md`**
   -- the 32-card stratified spot-check that informed the GO/NO-GO + the two
   surgical fixes already applied (k_vp_map factual + k_no_vote_map bloat trim).
4. **`apps/qw-oracle/SCHEMA.md`** -- `entities` table shape, especially the
   `description_origin` vocab block.

## Pre-flight gate

Before running the apply script, all of the following MUST hold:

1. **Migration 018 applied.** Check:
   ```bash
   cd apps/qw-oracle
   bun db/migrate.ts                          # idempotent; applies 018 if missing
   # then verify:
   psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='entities' AND column_name='shape_classification'"
   # expect: one row
   ```

2. **Postgres reachable.** Default `DATABASE_URL` is
   `postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle` (local dev container at
   `apps/qw-oracle/db/docker-compose.dev.yml`). Production uses Unraid Postgres
   per `DEPLOYMENT.md`.

3. **Drafts files present + uncommitted-clean.** `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-*.md`
   -- 18 files. Verify `git status` is clean on these (the surgical fixes from
   2026-05-28 were already committed in `fb63ea2f`).

4. **Apply script present.** `apps/qw-oracle/scripts/load-knowledge/apply-ktx-l1-recasts.ts`
   -- written 2026-05-28. Type-check first:
   ```bash
   cd apps/qw-oracle && bunx --bun tsc --noEmit -p tsconfig.json 2>&1 | head -20
   ```
   (No errors expected; the script is self-contained against existing `db.ts`.)

## Execution

**Step 1 -- dry-run all 18 batches.** Confirms parsing + DB resolution work
end-to-end before touching anything:

```bash
cd /home/paradoks/projects/quakeworld
bun apps/qw-oracle/scripts/load-knowledge/apply-ktx-l1-recasts.ts --all
```

Expected output: per-batch lines + a TOTAL summary at the end. Look for:

- **Scanned ~= 640** (633 cvar+command + parks-handdraft + structural re-drafts)
- **Matched (DB) close to Scanned** -- any "not_found" cards need investigation
  before --apply
- **Errors = 0** (any error needs investigation; common cause: postgres-js type
  mismatch on long-text payloads -- if seen, surface to operator)

If "not_found" or errors > 0: STOP. Do not proceed to --apply. Report to
operator with the not-found list and error class.

**Step 2 -- per-batch apply with commits.** Process one batch at a time so each
batch lands as its own commit (cheap revert if anything surfaces later):

```bash
bun apps/qw-oracle/scripts/load-knowledge/apply-ktx-l1-recasts.ts --all --apply
```

Note: the apply script is **DB-write-only**. It does NOT modify the drafts
markdown files. Per-batch commits aren't needed for the apply step itself --
the audit trail is in:

- The drafts files (committed pre-apply)
- The git log of the migration applied
- A single post-apply commit recording what was done (Step 4 below)

So the for-loop can simplify to:

```bash
bun apps/qw-oracle/scripts/apply-ktx-l1-recasts.ts --all --apply
```

**Step 3 -- verification.** After --all --apply:

```bash
# Confirm the row count of v2 recasts in DB matches the drafts file count
psql $DATABASE_URL -c "
  SELECT description_origin, COUNT(*) FROM entities
  WHERE project='ktx' AND type IN ('cvar','command')
  GROUP BY description_origin ORDER BY 2 DESC;
"
# expect: recast_v2 ~= 633; remainder = source_inline/synthesized/NULL for older rows
```

Sanity-check 3 entities via MCP-equivalent SQL (sample one cvar, one command,
one shape-less):

```bash
psql $DATABASE_URL -c "
  SELECT name, description_origin, description_anchor_version, shape_classification,
         LEFT(description, 80) as desc_preview
  FROM entities
  WHERE project='ktx' AND name IN ('k_vp_map', 'votemap', 'yes')
  ORDER BY name;
"
# expect: all 3 carry description_origin='recast_v2', non-null anchor,
# shape_classification populated, description starts with the v2 headliner.
```

Also confirm the embedding-staleness flag was set:

```bash
psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM entities
  WHERE project='ktx' AND type IN ('cvar','command')
    AND description_embedding_stale = TRUE;
"
# expect: ~633 -- next Voyage refresh job re-embeds them
```

**Step 4 -- record the apply.** One commit covering the migration + the apply
fact (no markdown changes; just the migration file landing in git):

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/db/migrations/018_entities_shape_classification.sql
git add apps/qw-oracle/scripts/load-knowledge/apply-ktx-l1-recasts.ts
git add docs/superpowers/parking/2026-05-28-ktx-l1-apply-pass-runbook.md
git commit -m "$(cat <<'EOF'
ktx-l1: apply v2 recasts to L1 (Phase 1) -- 633 cvar+command + migration 018 shape_classification

Applies the 633 v2-shape recasts from apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-*.md to entities.description, with provenance stamps (description_origin='recast_v2', description_anchor_version, description_embedding_stale=TRUE, shape_classification). Closes YELLOW 2 from the KTX L1 chunked-mode dispatch arc post-arc analysis.

Schema: migration 018 adds entities.shape_classification (TEXT, probe-enforced vocab); first writer is this apply pass; future MVDSV/QWFWD/QTV forks reuse the column.

Apply script: apps/qw-oracle/scripts/apply-ktx-l1-recasts.ts (idempotent; --dry-run default; --apply writes).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Halt-and-report rules

Halt the apply and report back to operator if any of the following:

- **Dry-run "not_found" > 5 cards.** Could indicate name-fold mismatch
  (sub-namespace suffixes on KTX commands -- `<name>:frogbot:std` etc.). The
  apply script uses `name_fold` natural-key match; the drafts files use the
  bare name in the header. Frogbot batches may need a name-resolution
  adjustment.
- **Dry-run errors > 0.** Surface the error to operator. Common: postgres-js
  type binding on long TEXT, schema column missing (= migration not applied).
- **shape_classification empty for > 20 cards.** Means the shape normalizer
  failed to extract from the header. Operator decides whether to relax the
  normalizer or hand-fix the headers.
- **Any UPDATE affects 0 rows AFTER dry-run reported it would update.** Means
  the entity disappeared between dry-run and apply (shouldn't happen on a
  stable DB; report immediately).

## Out of scope for this session

- **Phase 2 (entity_relations table)** -- separate brainstorm session.
  Captures relational typology (paired/gate/election/side-channel/family
  links). Worth designing AFTER seeing Phase 1's apply land cleanly so the
  relations design can be informed by what's in L1.
- **Voyage embedding refresh** -- separate async job already in place
  (runs over `description_embedding_stale = TRUE` rows).
- **Cold-deepen the 20-30 "state/mode" cards** -- operator accepted 80%
  yield; community feedback or a future targeted pass closes those gaps.
- **F1 probe update for the new `recast_v2` origin value and shape vocab** --
  small follow-up; can be a quick PR after this lands.
- **JSON snapshot for website distribution** -- separate brainstorm (likely
  rides `scripts/load-knowledge/build-snapshot.ts` with an audit for v2 +
  shape_classification flow-through).

## Return-to-orchestrator report shape

When done (or halted), report back to the main session with:

```
Phase 1 apply pass -- status: <COMPLETE | HALTED | PARTIAL>

Numbers:
  Scanned:        <N>
  Updated:        <K>
  Unchanged:      <U>
  Not found:      <list of names if non-empty>
  Errors:         <count + first 3 messages if non-empty>

Verification:
  description_origin='recast_v2' count: <number>
  description_embedding_stale=TRUE count: <number>
  shape_classification populated: <yes / partial / no>
  Sample lookups verified: <which ones, output snippet>

Commits:
  <SHA> -- migration 018 + apply script + runbook
  (no per-batch commits since apply is DB-only and idempotent)

Open items / surprises:
  <anything noteworthy>
```

The orchestrator session will verify a few entities via lookup_entity and
consolidate the result into Phase 2 spec-shaping.
