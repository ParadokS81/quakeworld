// apps/qw-oracle/scripts/load-community/clans/upsert.ts
//
// Atomic per-slug UPSERT into community.clans. Idempotent.
// community.clans uses TEXT[] only for source_categories (no JSONB columns).
// D19 (JSONB binding) does not apply -- postgres-js binds JS arrays directly to TEXT[].
//
// source_template values accepted by migration 008's CHECK enum (post-F10 amendment):
//   'infobox_clan' | 'clan_info' | 'infobox_4on4team' | 'bullet_prose' | 'none'

import { db } from '../../../shared/db.ts';
import type { ParsedClan } from './parse.ts';
import type { ClanFlags } from './flags.ts';

export async function upsertClan(c: ParsedClan, f: ClanFlags): Promise<void> {
  await db.begin(async (tx) => {
    await tx`
      INSERT INTO community.clans (
        slug, title, prefix, nationality, nationality_iso,
        founded_year, founded_month, founded_day, founded_by,
        disbanded, status, irc_channel, irc_network, website,
        has_note, is_substantive, is_stub,
        source_template, source_categories, wiki_revision_id, wiki_fetched_at
      ) VALUES (
        ${c.slug}, ${c.title}, ${c.prefix}, ${c.nationality}, ${c.nationality_iso},
        ${c.founded_year}, ${c.founded_month}, ${c.founded_day}, ${c.founded_by},
        ${c.disbanded}, ${c.status}, ${c.irc_channel}, ${c.irc_network}, ${c.website},
        ${f.has_note}, ${f.is_substantive}, ${f.is_stub},
        ${f.source_template}, ${c.source_categories}, ${c.wiki_revision_id}, ${c.wiki_fetched_at}
      )
      ON CONFLICT (slug) DO UPDATE SET
        title             = EXCLUDED.title,
        prefix            = EXCLUDED.prefix,
        nationality       = EXCLUDED.nationality,
        nationality_iso   = EXCLUDED.nationality_iso,
        founded_year      = EXCLUDED.founded_year,
        founded_month     = EXCLUDED.founded_month,
        founded_day       = EXCLUDED.founded_day,
        founded_by        = EXCLUDED.founded_by,
        disbanded         = EXCLUDED.disbanded,
        status            = EXCLUDED.status,
        irc_channel       = EXCLUDED.irc_channel,
        irc_network       = EXCLUDED.irc_network,
        website           = EXCLUDED.website,
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
