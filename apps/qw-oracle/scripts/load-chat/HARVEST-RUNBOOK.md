# L2 harvest ritual (monthly)

Keeps the Discord corpus current. Closes Arc A's ongoing-harvest item.
First full execution: 2026-08-06 (session 6) -- every number below is measured, not estimated.

**Cadence: monthly, session-run.** Surfaced by `.claude/calendar-checks.txt`; no cron, no
daemon. Rationale in "Why not automated" at the bottom -- read it before wiring a scheduler.

## The two halves

**Ingestion** is cheap, idempotent, and safe (raw rows only, `ON CONFLICT (id) DO NOTHING`).
**Segmentation** costs money and needs a human at the gates.

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

    # --- re-fence the current year (~30-40 min, ~$2) ------------------------
    bun scripts/load-chat/backfill-batch.ts count-all   # reconcile ledger; ONLY current-year rows should move
    for ch in "#helpdesk" "#quakeworld" "#dev-corner" "#antilag"; do
      bash scripts/load-chat/run-backfill-batch.sh "$ch" <YEAR> 30
    done

Then: retrieval-probe a thread from the NEW window, update `backfill-ledger.md`, commit.

## Gotchas that have actually bitten

- **Import is not availability.** 2026-08-05 imported 12,265 messages; `count-all` returned
  byte-identical totals because `build-sessions.ts` had not re-run. The data sat invisible for a
  day. Segmentation is the gate, not ingestion.
- **Never run `build-sessions.ts` concurrently with a batch.** It TRUNCATEs `message_labels` and
  `sessions`; a `prep` inside that window chunks from half-populated labels and silently produces
  wrong chunk boundaries.
- **Re-prepping a grown year invalidates prior fence output.** Chunk ids are positional, so
  `helpdesk-2026-001` means something different at 61 chunks vs 106. `--resume` now refuses on a
  `manifestFingerprint` mismatch -- if you see that refusal, it is correct; move the stale output
  aside, do not force past it.
- **Parallel batches confound global counters.** The driver gates R5 batch-scoped for this
  reason. Two batches loading concurrently move the global total legitimately.
- **`chat_threads` survives the label rebuild** (threads reference message ids, not labels) --
  verified 38,598 before and after on 2026-08-06. Only the current-year batches need re-loading.

## Why not automated

Measured: the whole ritual is <1 h and ~$2/month. Splitting out the 2.5-minute ingestion to run
nightly buys nothing when segmentation is monthly.

The expensive half genuinely wants supervision. In two sessions the gates caught: a 38/72-chunk
batch reading 99% clean, an OOB hard-gate failure, a chunk duplicated 2x that passed both gates,
and a stale-resume that would have spliced fencing for the wrong messages. Several were HALTs a
cron would have had to interpret; loading past any of them corrupts the archive quietly.

If a scheduler is ever wanted, automate **ingestion only** (safe, idempotent, no gates) and leave
segmentation to the ritual. Ingestion needs `DISCORD_TOKEN` from `/mnt/user/appdata/quad/.env`,
which the cockpit already mounts rw; scheduling it would need a host cron entry from ops (this
container has neither cron nor systemd).
