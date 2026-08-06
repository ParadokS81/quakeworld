# L2 harvest ritual (monthly)

Keeps the Discord corpus current. Closes Arc A's ongoing-harvest item.
First full execution: 2026-08-06 (session 6) -- every number below is measured, not estimated.

**Cadence: monthly, session-run.** Surfaced by `.claude/calendar-checks.txt`; no cron, no
daemon. Rationale in "Why not automated" at the bottom -- read it before wiring a scheduler.

## The two halves

**Ingestion** is cheap, idempotent, and safe (raw rows only, `ON CONFLICT (id) DO NOTHING`).
**Segmentation** costs money and needs a human at the gates -- but only for the NEW chunks.

    # --- ingestion (~2.5 min, $0) -------------------------------------------
    cd apps/qw-oracle
    bun scripts/load-chat/export-anchors.ts          # corpus edge per channel, +1ms -> ../../quad/anchors-latest.json
    cd ../quad
    node --env-file=/mnt/user/appdata/quad/.env scripts/catchup.mjs --anchors anchors-latest.json
    cd ../qw-oracle
    bun scripts/load-chat/import-discord.ts          # per-file skip via import_log; per-row ON CONFLICT

    # --- segmentation (~75 s, $0) ------------------------------------------
    bun scripts/load-chat/build-sessions.ts --force  # REQUIRED: without it the new messages have
                                                     # no message_labels and are INVISIBLE to the
                                                     # chunker (pullMsgs joins message_labels)
    bun scripts/load-chat/build-session-references.ts
    bun scripts/load-chat/build-search-index.ts

    # --- extend the current year (INCREMENTAL -- only NEW chunks are fenced) --
    bun scripts/load-chat/backfill-batch.ts count-all   # reconcile ledger; ONLY current-year rows should move
    for ch in "#helpdesk" "#quakeworld" "#dev-corner" "#antilag"; do
      bash scripts/load-chat/run-backfill-batch.sh "$ch" <YEAR> 30
    done

**This is incremental, not a re-fence.** The driver runs `fence --resume`, which reuses any
chunk whose message list still hashes the same and fences only what actually changed. Expect
output like `--resume: 61 chunk(s) reused (content-verified), 0 re-fenced`.

Why that is safe: `lullChunks` is a pure left-fold, so appending newer messages cannot move
earlier cut points -- only the trailing chunk can grow or split. Verified on the 2026-08-06
catch-up: #helpdesk-2026 went 61 -> 106 chunks with **all 61 originals byte-identical**. Reuse is
still gated on a per-chunk content hash rather than on that argument, so a non-append-only
import (a gap-fill of older messages) simply re-fences the chunks it disturbs.

Cost therefore scales with NEW chat, not with year size. A typical month is tens of new chunks,
well under $1; the 2026-08-06 catch-up absorbed three months (12,265 msgs) for ~$2 -- and even
that re-fenced everything, because per-chunk fingerprints did not exist yet.

**The load step is still whole-year**, and that is correct: the loader's range-DELETE is
`(channel, year)`-scoped, so it replaces the year atomically from the merged fence output. Only
the FENCING is incremental. Embedding cost tracks threads re-inserted, not chunks fenced.

Then: retrieval-probe a thread from the NEW window, update `backfill-ledger.md`, commit.

## Gotchas that have actually bitten

- **Import is not availability.** 2026-08-05 imported 12,265 messages; `count-all` returned
  byte-identical totals because `build-sessions.ts` had not re-run. The data sat invisible for a
  day. Segmentation is the gate, not ingestion.
- **Never run `build-sessions.ts` concurrently with a batch.** It TRUNCATEs `message_labels` and
  `sessions`; a `prep` inside that window chunks from half-populated labels and silently produces
  wrong chunk boundaries.
- **Chunk ids are positional, so reuse must be content-verified.** `helpdesk-2026-001` means
  something different at 61 chunks vs 106. `--resume` reuses a prior chunk only when its
  message-id list still hashes the same; anything else re-fences. An output predating per-chunk
  fingerprints reuses NOTHING and says so loudly -- that is correct, not a bug.
- **Parallel batches confound global counters.** The driver gates R5 batch-scoped for this
  reason. Two batches loading concurrently move the global total legitimately.
- **`chat_threads` survives the label rebuild** (threads reference message ids, not labels) --
  verified 38,598 before and after on 2026-08-06. Only the current-year batches need re-loading.

## Why not automated

Measured: the whole ritual is well under an hour, and fencing cost scales with new chat only
(the ~$2 figure is the 2026-08-06 run, which absorbed THREE months and predated incremental
reuse). Splitting out the 2.5-minute ingestion to run nightly buys nothing when segmentation is
monthly.

The expensive half genuinely wants supervision. In two sessions the gates caught: a 38/72-chunk
batch reading 99% clean, an OOB hard-gate failure, a chunk duplicated 2x that passed both gates,
and a stale-resume that would have spliced fencing for the wrong messages. Several were HALTs a
cron would have had to interpret; loading past any of them corrupts the archive quietly.

If a scheduler is ever wanted, automate **ingestion only** (safe, idempotent, no gates) and leave
segmentation to the ritual. Ingestion needs `DISCORD_TOKEN` from `/mnt/user/appdata/quad/.env`,
which the cockpit already mounts rw; scheduling it would need a host cron entry from ops (this
container has neither cron nor systemd).
