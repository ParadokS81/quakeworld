// apps/qw-oracle/scripts/load-community/players/flags.ts
//
// Pure flag computation from a ParsedPlayer. No IO, no DB.

import type { ParsedPlayer } from './parse.ts';

export interface PlayerFlags {
  is_substantive: boolean;
  has_note: boolean;
  is_stub: boolean;
  source_template: ParsedPlayer['source_template'];
}

export function computePlayerFlags(p: ParsedPlayer): PlayerFlags {
  // D6: is_substantive -- >=2 of 5 structured-field signals.
  const hasRealName     = p.real_name !== null && p.real_name.trim() !== ''
                          && p.real_name.trim() !== '???' && p.real_name.trim() !== '??';
  const hasAliases      = p.aliases.length > 0;
  const hasClanHistory  = p.clan_history.length >= 1;
  const hasAchievements = p.achievements.length >= 1;
  // Strip HTML comments before threshold check -- template boilerplate inflates raw length.
  const narrativeClean  = p.narrative_intro.replace(/<!--[\s\S]*?-->/g, '').trim();
  const hasProse500     = narrativeClean.length >= 500;

  const substantiveSignals = [hasRealName, hasAliases, hasClanHistory, hasAchievements, hasProse500]
    .filter(Boolean).length;

  const is_substantive = substantiveSignals >= 2;

  // D7: has_note v1 rule -- page carries content the row schema cannot represent.
  // Tunable in Task 9 (T9 operator inspection); this is the v1 starting rule.
  // Trim quotes_section before sentinel checks: extractSectionBody can return
  // "??\n" or "???\n" (with trailing newline) which must also be treated as no-data.
  const quotesContent = p.quotes_section.trim();
  const hasUniqueProse =
    narrativeClean.length >= 500 ||
    (quotesContent.length >= 5 && quotesContent !== '??' && quotesContent !== '???') ||
    p.trivia_section.length > 0 ||
    p.mouse_settings_present ||
    p.crosshair_present ||
    p.gallery_image_count > 1 ||
    p.media_section.length > 0;

  const has_note = hasUniqueProse;

  // D20: is_stub = NOT is_substantive. Multi-signal heuristic.
  // Do NOT use Category:Player stubs tag -- that is editorial intent, not "page is empty".
  const is_stub = !is_substantive;

  return {
    is_substantive,
    has_note,
    is_stub,
    source_template: p.source_template,
  };
}
