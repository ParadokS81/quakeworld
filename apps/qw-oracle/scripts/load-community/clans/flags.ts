// apps/qw-oracle/scripts/load-community/clans/flags.ts
//
// Pure flag computation from a ParsedClan. No IO, no DB.

import type { ParsedClan } from './parse.ts';

export interface ClanFlags {
  is_substantive: boolean;
  has_note:       boolean;
  is_stub:        boolean;
  source_template: ParsedClan['source_template'];
}

export function computeClanFlags(c: ParsedClan): ClanFlags {
  // D6 adapted for clans: >= 2 of 5 structured-field signals.
  // Signals selected to mirror D6's spirit but for clan-shaped data:
  //   prefix replaces real_name as the load-bearing identity field (also drives L2 chat parser);
  //   founded_year replaces aliases (clans don't carry aka lists);
  //   founded_by is its own signal (often present even when other infobox fields are empty);
  //   irc_channel is structured-field signal (early-2000s clans reliably carry IRC info);
  //   narrative_byte_length >= 500 mirrors the player heuristic, computed across
  //     narrative_intro + history_section (clan narrative often lives in History).
  const hasPrefix         = c.prefix !== null && c.prefix.trim() !== '';
  const hasFounded        = c.founded_year !== null;
  const hasFoundedBy      = c.founded_by !== null && c.founded_by.trim() !== '';
  const hasIrc            = c.irc_channel !== null && c.irc_channel.trim() !== '';
  const hasNarrativeProse = c.narrative_byte_length >= 500;

  const substantiveSignals =
    Number(hasPrefix) +
    Number(hasFounded) +
    Number(hasFoundedBy) +
    Number(hasIrc) +
    Number(hasNarrativeProse);

  const is_substantive = substantiveSignals >= 2;

  // D7 has_note v1 rule -- page carries content the row schema cannot represent.
  // Tunable in T8 first-run inspection. Initial rule:
  const hasUniqueProse =
    c.narrative_byte_length >= 500 ||
    (c.has_history && c.history_section.length > 200) ||
    c.achievements_count >= 3 ||
    c.external_links_section.length > 0;

  const has_note = hasUniqueProse;

  // D20: is_stub = NOT is_substantive. Multi-signal heuristic; do not trust
  // the wiki's `Category:Clan stubs` tag (editorial intent, not "page is empty").
  const is_stub = !is_substantive;

  return { is_substantive, has_note, is_stub, source_template: c.source_template };
}
