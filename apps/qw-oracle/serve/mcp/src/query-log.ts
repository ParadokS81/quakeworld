// apps/qw-oracle/serve/mcp/src/query-log.ts
//
// Phase 7 (Arc 1). Dispatcher-level wrapper for every MCP tool call.
// Writes one row to query_log per invocation. Failure to log NEVER affects
// the tool's response - the consumer is the source of truth, the journal is
// best-effort. The MCP handshake's clientInfo is captured via setConsumerHint
// from index.ts; for stdio transport that's a single global value, for
// HTTP/SSE Phase 6 owns whatever per-session capture it ships and calls the
// setter accordingly (see Open question 4).

import { db } from './db.ts';
import type { ToolResponse } from './types.ts';

let currentConsumerHint: string | null = null;

export function setConsumerHint(hint: string | null): void {
  currentConsumerHint = hint;
}

interface DispatchOptions {
  tool: string;
  // The most-relevant input string for this call. For lookup_*, args.name; for
  // search_*, args.query; for get_concept_note, args.id; for the filter-shaped
  // tools (search_maps / search_gameplay_entities / search_mechanics) pass a
  // JSON.stringify of the args envelope or a short structured summary so the
  // operator can read query_log without reconstructing the call. The
  // dispatcher decides; the wrapper is opinion-free here.
  queryText: string | null;
}

interface ScorableHit {
  match_score?: number;
}

// MCP content envelope shape returned to the SDK Server.
type CallToolResult = { content: { type: 'text'; text: string }[] };

export async function dispatchAndLog<R extends ToolResponse<unknown>>(
  opts: DispatchOptions,
  fn: () => Promise<R>,
): Promise<CallToolResult> {
  const start = Date.now();
  let response: R | null = null;
  let errorMessage: string | null = null;
  try {
    response = await fn();
    return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const resultCount = response?.results.length ?? 0;
    const topScore = response
      ? ((response.results[0] as ScorableHit | undefined)?.match_score ?? null)
      : null;
    const matchQuality = response?.match_quality ?? null;
    const latencyMs = Date.now() - start;
    try {
      await db`
        INSERT INTO query_log
          (tool, query_text, result_count, top_score, match_quality, latency_ms, error, consumer_hint)
        VALUES
          (${opts.tool}, ${opts.queryText}, ${resultCount}, ${topScore},
           ${matchQuality}, ${latencyMs}, ${errorMessage}, ${currentConsumerHint})
      `;
    } catch (logErr) {
      // Never throw from the logging path; the consumer already has its
      // response. Surface the failure to stderr so an operator running the
      // server interactively sees it.
      const m = logErr instanceof Error ? logErr.message : String(logErr);
      console.error(`[query-log] failed to record ${opts.tool}: ${m}`);
    }
  }
}
