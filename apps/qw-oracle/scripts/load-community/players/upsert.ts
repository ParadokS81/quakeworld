// apps/qw-oracle/scripts/load-community/players/upsert.ts
//
// Atomic per-slug UPSERT into community.players. Idempotent.
// TEXT[] columns (aliases, community_roles, source_categories) bind as
// plain JS string arrays -- postgres-js handles the protocol encoding.
// No JSONB columns in this schema; D19 JSONB rule is dormant.

import { db } from '../../../shared/db.ts';
import type { ParsedPlayer } from './parse.ts';
import type { PlayerFlags } from './flags.ts';

export async function upsertPlayer(p: ParsedPlayer, f: PlayerFlags): Promise<void> {
  await db.begin(async (tx) => {
    await tx`
      INSERT INTO community.players (
        slug, title, display_name, aliases, real_name,
        nationality, nationality_iso, current_clan,
        active_year_start, active_year_end, status,
        community_roles, has_note, is_substantive, is_stub,
        source_template, source_categories, wiki_revision_id, wiki_fetched_at
      ) VALUES (
        ${p.slug}, ${p.title}, ${p.display_name}, ${p.aliases}, ${p.real_name},
        ${p.nationality}, ${p.nationality_iso}, ${p.current_clan},
        ${p.active_year_start}, ${p.active_year_end}, ${p.status},
        ${p.community_roles}, ${f.has_note}, ${f.is_substantive}, ${f.is_stub},
        ${f.source_template}, ${p.source_categories}, ${p.wiki_revision_id}, ${p.wiki_fetched_at}
      )
      ON CONFLICT (slug) DO UPDATE SET
        title             = EXCLUDED.title,
        display_name      = EXCLUDED.display_name,
        aliases           = EXCLUDED.aliases,
        real_name         = EXCLUDED.real_name,
        nationality       = EXCLUDED.nationality,
        nationality_iso   = EXCLUDED.nationality_iso,
        current_clan      = EXCLUDED.current_clan,
        active_year_start = EXCLUDED.active_year_start,
        active_year_end   = EXCLUDED.active_year_end,
        status            = EXCLUDED.status,
        community_roles   = EXCLUDED.community_roles,
        has_note          = EXCLUDED.has_note,
        is_substantive    = EXCLUDED.is_substantive,
        is_stub           = EXCLUDED.is_stub,
        source_template   = EXCLUDED.source_template,
        source_categories = EXCLUDED.source_categories,
        wiki_revision_id  = EXCLUDED.wiki_revision_id,
        wiki_fetched_at   = EXCLUDED.wiki_fetched_at
    `;
  });
}
