// apps/qw-oracle/scripts/load-chat/thread-loader-core.ts
//
// Shared staging + idempotent-write core for Phase A (load-threads.ts) and
// Phase C (backfill-batch.ts `load` subcommand). Both callers supply their own
// chunk-reader and embed function; the core owns the DB write contract.
//
// WHY the delete is version-agnostic-range:
//
//   The production retrieval index wants exactly ONE reconstruction_version per
//   (channel, date) range. Phase A's 'fence-sonnet-v1' threads are
//   increment-1 probe scaffolding (cap 750 / 3h gap) to be REPLACED by
//   production 'fence-sonnet-v2' (12h / 1500), not coexist. A range-scoped
//   (version-agnostic) delete means the reset-day full-year-2021 v2 batch
//   automatically supersedes A's v1 probe threads. The version-scoped
//   batchScopeClause in thread-key.ts remains for any future safe-coexistence
//   migration; the production load deliberately does not use it.
//
//   Idempotency is preserved: re-running the same batch deletes the date range
//   (including what it just inserted) then re-inserts identically. The
//   thread_key UNIQUE constraint is the tie-breaker -- same source data, same
//   key, same vector (from embed fn). The range-delete removes ALL versions so
//   no orphaned v1 rows remain after a v2 reset-day run.

import { db } from '../../shared/db.ts';
import { threadKey } from './thread-key.ts';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CoreThread {
  topic_label: string;
  member_indices: number[];
  resolution_status?: 'solved' | 'unresolved' | 'informational';
}

export interface CoreFenced {
  chunkId: string;
  abstained: boolean;
  threads: CoreThread[];
}

export interface CoreChunkMsg {
  idx: number;   // 1-based
  id: string;
  author: string;
  content: string;
}

// embed returns one entry per input content, aligned by index:
export type EmbedFn = (
  contents: string[]
) => Promise<({ vector: number[]; stale: false } | { vector: null; stale: true })[]>;

export interface CoreDeleteScope {
  channel: string;
  rangeStart: string; // ISO timestamptz, inclusive
  rangeEnd: string;   // ISO timestamptz, exclusive (EXCLUSIVE boundary)
}

export interface CoreParams {
  fenced: CoreFenced[];
  loadChunk: (chunkId: string) => Promise<{ channel: string; messages: CoreChunkMsg[] }>;
  reconstructionVersion: string;
  deleteScopes: CoreDeleteScope[];
  embed: EmbedFn;
}

export interface CoreResult {
  threadsInserted: number;
  junctionRows: number;
  truncations: number;
  oobDrops: number;
  missingMsgWarnings: number;
  staleEmbeds: number;
}

// ---------------------------------------------------------------------------
// Internal staging shape (filled before the DB write)
// ---------------------------------------------------------------------------

interface StagedThread {
  threadKey: string;
  channelName: string;
  topicLabel: string;
  content: string;           // fullText -- byte-identical to 03-embed-and-retrieve.ts:55
  messageCount: number;
  participants: string[];    // distinct authors, first-seen order
  participantCount: number;
  memberIds: string[];       // deduped message.id list for junction rows
  resolutionStatus: 'solved' | 'unresolved' | 'informational' | undefined;
  vector: number[] | null;   // null when embed returned stale
  isStale: boolean;
  // Filled after Postgres created_at lookup:
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
}

// ---------------------------------------------------------------------------
// Core loader
// ---------------------------------------------------------------------------

export async function loadThreadsCore(p: CoreParams): Promise<CoreResult> {
  let oobDrops = 0;
  let truncations = 0;
  let missingMsgWarnings = 0;
  let staleEmbeds = 0;

  // -------------------------------------------------------------------------
  // Step 1: STAGE -- read each chunk and build thread staging rows.
  // -------------------------------------------------------------------------

  // Collect contents for batch embed (emit in source order).
  const contentOrder: string[] = [];

  // Intermediate shape before embed result is merged in.
  interface PreStaged {
    threadKey: string;
    channelName: string;
    topicLabel: string;
    content: string;
    messageCount: number;
    participants: string[];
    participantCount: number;
    memberIds: string[];
    resolutionStatus: 'solved' | 'unresolved' | 'informational' | undefined;
    contentIdx: number; // index into contentOrder
  }
  const preStaged: PreStaged[] = [];

  for (const fenced of p.fenced) {
    if (fenced.abstained) continue;

    const chunk = await p.loadChunk(fenced.chunkId);

    // Build 1-based index map for this chunk's messages.
    const byIdx = new Map<number, CoreChunkMsg>(
      chunk.messages.map((m) => [m.idx, m]),
    );

    for (let ti = 0; ti < fenced.threads.length; ti++) {
      const thread = fenced.threads[ti]!;

      // R8: drop OOB member indices defensively; count drops for audit.
      const valid: number[] = [];
      for (const i of thread.member_indices) {
        if (byIdx.has(i)) {
          valid.push(i);
        } else {
          oobDrops++;
        }
      }
      if (valid.length === 0) continue;

      // Dedup surviving indices to avoid duplicate junction PK violations.
      // Preserve first-seen order.
      const seenIdx = new Set<number>();
      const dedupedIdx: number[] = [];
      for (const i of valid) {
        if (!seenIdx.has(i)) {
          seenIdx.add(i);
          dedupedIdx.push(i);
        }
      }

      const members = dedupedIdx.map((i) => byIdx.get(i)!);

      // BYTE-IDENTICAL text construction (mirrors 03-embed-and-retrieve.ts:55).
      // NO slice here -- fullText is used as the cache key basis in Phase A.
      // The 30000-char truncation is applied only at the Voyage call site in
      // the embed fn (Phase A: in the cache-miss branch; Phase C: inline in
      // the batch builder). The truncation counter tracks long threads.
      const fullText = members.map((m) => `${m.author}: ${m.content}`).join('\n');

      if (fullText.length > 30000) {
        truncations++;
      }

      // Distinct participants in first-seen order.
      const seenAuthors = new Set<string>();
      const participants: string[] = [];
      for (const m of members) {
        if (!seenAuthors.has(m.author)) {
          seenAuthors.add(m.author);
          participants.push(m.author);
        }
      }

      const tk = threadKey({
        channel: chunk.channel,
        reconstructionVersion: p.reconstructionVersion,
        chunkId: fenced.chunkId,
        threadIndex: ti,
      });

      const contentIdx = contentOrder.length;
      contentOrder.push(fullText);

      preStaged.push({
        threadKey: tk,
        channelName: chunk.channel,
        topicLabel: thread.topic_label,
        content: fullText,
        messageCount: members.length,
        participants,
        participantCount: participants.length,
        memberIds: members.map((m) => m.id),
        resolutionStatus: thread.resolution_status,
        contentIdx,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Step 2: EMBED -- call embed fn with all content strings at once.
  // -------------------------------------------------------------------------

  const embedResults = await p.embed(contentOrder);

  // Merge embed results into staged threads.
  const staged: StagedThread[] = preStaged.map((ps) => {
    const er = embedResults[ps.contentIdx]!;
    return {
      threadKey: ps.threadKey,
      channelName: ps.channelName,
      topicLabel: ps.topicLabel,
      content: ps.content,
      messageCount: ps.messageCount,
      participants: ps.participants,
      participantCount: ps.participantCount,
      memberIds: ps.memberIds,
      resolutionStatus: ps.resolutionStatus,
      vector: er.stale ? null : er.vector,
      isStale: er.stale,
    };
  });

  // -------------------------------------------------------------------------
  // Step 3: DATE RANGES -- one Postgres query for all member message ids.
  // -------------------------------------------------------------------------

  const allMemberIds = [...new Set(staged.flatMap((t) => t.memberIds))];
  const createdAtRows = await db<{ id: string; created_at: Date }[]>`
    SELECT id, created_at FROM messages WHERE id = ANY(${allMemberIds}::text[])
  `;
  const createdAtMap = new Map<string, Date>(
    createdAtRows.map((r) => [r.id, r.created_at]),
  );

  for (const t of staged) {
    const dates: number[] = [];
    for (const mid of t.memberIds) {
      const ca = createdAtMap.get(mid);
      if (!ca) {
        console.warn(
          `[thread-loader-core] WARNING: message id=${mid} NOT FOUND in messages table ` +
          `(thread_key=${t.threadKey}). Indicates corpus drift; FK insert will fail.`,
        );
        missingMsgWarnings++;
      } else {
        dates.push(ca.getTime());
      }
    }
    if (dates.length === 0) {
      // Fall back to epoch so the insert does not fail on the NOT NULL
      // constraint; the loud warnings above identify the problem rows.
      t.dateRangeStart = new Date(0);
      t.dateRangeEnd = new Date(0);
    } else {
      t.dateRangeStart = new Date(Math.min(...dates));
      t.dateRangeEnd = new Date(Math.max(...dates));
    }
  }

  // -------------------------------------------------------------------------
  // Step 4: WRITE -- single transaction, version-agnostic range-delete then insert.
  // -------------------------------------------------------------------------

  let threadsInserted = 0;
  let junctionRows = 0;

  await db.begin(async (tx) => {
    // VERSION-AGNOSTIC RANGE DELETE: removes all reconstruction_version values
    // in the date window, not just the one this batch will write. See the
    // header comment for why this is intentional (supersede semantics).
    // ON DELETE CASCADE on thread_messages drops junction rows automatically.
    for (const s of p.deleteScopes) {
      await tx`
        DELETE FROM chat_threads
        WHERE channel_name = ${s.channel}
          AND date_range_start >= ${s.rangeStart}::timestamptz
          AND date_range_start <  ${s.rangeEnd}::timestamptz
      `;
    }

    for (const t of staged) {
      // Two INSERT paths: with and without vector literal, because the
      // pgvector `::vector` cast must be embedded as raw SQL (not a
      // parameter), and postgres-js cannot interpolate raw SQL fragments
      // conditionally within a single template. Branching here avoids a
      // helper that would obscure the intent.
      // postgres-js returns BIGINT IDENTITY columns as strings by default.
      let inserted: { id: string }[];

      if (t.vector !== null) {
        // pgvector literal -- same pattern as embed-entities.ts line 102.
        const vecLiteral = `[${t.vector.join(',')}]`;
        inserted = await tx<{ id: string }[]>`
          INSERT INTO chat_threads (
            thread_key,
            channel_name,
            platform,
            date_range_start,
            date_range_end,
            participant_count,
            participants_json,
            message_count,
            topic_label,
            content,
            topic_embedding,
            embedding_stale,
            resolution_status,
            buckets_question,
            buckets_answer,
            reconstruction_version
          ) VALUES (
            ${t.threadKey},
            ${t.channelName},
            'discord',
            ${t.dateRangeStart!.toISOString()}::timestamptz,
            ${t.dateRangeEnd!.toISOString()}::timestamptz,
            ${t.participantCount},
            ${tx.json(t.participants as never)},
            ${t.messageCount},
            ${t.topicLabel},
            ${t.content},
            ${vecLiteral}::vector,
            FALSE,
            ${t.resolutionStatus ?? null},
            NULL,
            NULL,
            ${p.reconstructionVersion}
          )
          RETURNING id
        `;
      } else {
        // Stale embed: vector is NULL; embedding_stale=TRUE signals retry.
        staleEmbeds++;
        inserted = await tx<{ id: string }[]>`
          INSERT INTO chat_threads (
            thread_key,
            channel_name,
            platform,
            date_range_start,
            date_range_end,
            participant_count,
            participants_json,
            message_count,
            topic_label,
            content,
            topic_embedding,
            embedding_stale,
            resolution_status,
            buckets_question,
            buckets_answer,
            reconstruction_version
          ) VALUES (
            ${t.threadKey},
            ${t.channelName},
            'discord',
            ${t.dateRangeStart!.toISOString()}::timestamptz,
            ${t.dateRangeEnd!.toISOString()}::timestamptz,
            ${t.participantCount},
            ${tx.json(t.participants as never)},
            ${t.messageCount},
            ${t.topicLabel},
            ${t.content},
            NULL,
            TRUE,
            ${t.resolutionStatus ?? null},
            NULL,
            NULL,
            ${p.reconstructionVersion}
          )
          RETURNING id
        `;
      }

      const threadId = inserted[0]!.id;
      threadsInserted++;

      // Junction rows -- deduped memberIds prevent duplicate PK violations.
      for (const mid of t.memberIds) {
        await tx`
          INSERT INTO thread_messages (thread_id, message_id)
          VALUES (${threadId}::bigint, ${mid})
        `;
        junctionRows++;
      }
    }
  });

  return {
    threadsInserted,
    junctionRows,
    truncations,
    oobDrops,
    missingMsgWarnings,
    staleEmbeds,
  };
}
