// apps/qw-oracle/serve/mcp/src/tools/redirect-to-human.ts
//
// The hardest of the three honest-failure layers: gives the consumer LLM a
// non-confabulating action to take when the corpus does not cover a query.
// Static seed list (db/seeds/redirect_targets.sql); the tool reads them all
// and lets the consumer LLM pick. A future iteration could rank by topic_hint;
// v1 returns everything sorted by topic.

import { db } from '../db.ts';
import type { RedirectTarget, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

interface Args {
  topic_hint?: string;
}

export async function redirectToHuman(_args: Args): Promise<ToolResponse<RedirectTarget>> {
  const rows = await db<RedirectTarget[]>`
    SELECT topic, display_name, url, description
    FROM redirect_targets
    ORDER BY topic
  `;
  return {
    results: rows,
    match_quality: rows.length > 0 ? 'strong' : 'none',
    suggested_fallback:
      rows.length === 0
        ? 'redirect_targets table is empty - run `bun run seed:redirect-targets` to populate.'
        : null,
    meta: {
      tool: 'redirect_to_human',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
