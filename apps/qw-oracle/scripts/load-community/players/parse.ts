// apps/qw-oracle/scripts/load-community/players/parse.ts
//
// Pure parser: WikiArticle -> ParsedPlayer.
// No IO, no DB. Deterministic regex/template-shape matching only (D4).

import {
  extractInfoboxBlock,
  parseInfoboxFields,
  extractSectionBody,
  stripWikiMarkup,
  extractCategoryNationality,
  extractFlagIso,
  splitCsv,
  splitWikiLinks,
  parseYear,
  normalizeDash,
  resolveWikiLink,
} from '../shared/wiki-text.ts';

import {
  countryToNationality,
  nationalityToIso,
} from '../shared/iso-country.ts';

import type { WikiArticle, ClanHistoryEntry, Achievement } from '../shared/wiki-types.ts';

// ---------------------------------------------------------------------------
// ParsedPlayer
// ---------------------------------------------------------------------------

export interface ParsedPlayer {
  // Identity
  slug: string;
  title: string;
  display_name: string;
  aliases: string[];

  // Demographic
  real_name: string | null;
  nationality: string | null;
  nationality_iso: string | null;

  // Affiliation
  current_clan: string | null;
  community_roles: string[];
  status: 'Active' | 'Retired' | 'Inactive' | 'Quit' | 'unknown';

  // Temporal
  active_year_start: number | null;
  active_year_end: number | null;

  // Provenance
  source_template: 'infobox_player' | 'player_info' | 'bullet_prose' | 'none';
  source_categories: string[];
  wiki_revision_id: number;
  wiki_fetched_at: string;

  // Cross-link inputs (Phase 5)
  clan_history: ClanHistoryEntry[];
  achievements: Achievement[];

  // Body content
  narrative_intro: string;
  info_section_extras: string;
  quotes_section: string;
  trivia_section: string;
  media_section: string;
  gallery_section: string;
  see_also_section: string;
  external_links_section: string;
  mouse_settings_present: boolean;
  crosshair_present: boolean;
  gallery_image_count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeStatus(s: string | undefined): 'Active' | 'Retired' | 'Inactive' | 'Quit' | 'unknown' {
  if (!s) return 'unknown';
  const lower = s.trim().toLowerCase();
  if (lower === 'active') return 'Active';
  if (lower === 'retired') return 'Retired';
  if (lower === 'inactive') return 'Inactive';
  if (lower === 'quit') return 'Quit';
  return 'unknown';
}

function stripSingleWikiLink(s: string | undefined): string | null {
  if (!s || !s.trim()) return null;
  const trimmed = s.trim();
  const resolved = resolveWikiLink(trimmed);
  // resolveWikiLink returns the input for both fields if no link syntax found
  const display = resolved.display.trim();
  return display.length > 0 ? display : null;
}

// Parse {{TH|year-range|[[Clan]]}} rows from a history field value.
function parseTHRows(historyText: string): ClanHistoryEntry[] {
  const results: ClanHistoryEntry[] = [];
  // Match {{TH|...|...}} -- two pipe-separated args inside.
  // Use matchAll for clean iteration (avoids the stateful RegExp exec pattern).
  const re = /\{\{TH\|([^|{}]+)\|([^{}]+)\}\}/g;
  for (const m of historyText.matchAll(re)) {
    const yearRaw = normalizeDash(m[1]!.trim());
    const clanField = m[2]!.trim();
    const clan_title = stripSingleWikiLink(clanField) ?? clanField;

    let start_year: number | null = null;
    let end_year: number | null = null;

    // Patterns: "2024 - Present", "2007 - 2010", "2010"
    const rangeMatch = /^(\d{4})\s*-\s*(\d{4}|[Pp]resent)/.exec(yearRaw);
    if (rangeMatch) {
      start_year = parseInt(rangeMatch[1]!, 10);
      const endStr = rangeMatch[2]!.toLowerCase();
      end_year = endStr === 'present' ? null : parseInt(rangeMatch[2]!, 10);
    } else {
      const singleMatch = /^(\d{4})$/.exec(yearRaw);
      if (singleMatch) {
        start_year = parseInt(singleMatch[1]!, 10);
        end_year = start_year;
      }
    }

    results.push({
      clan_title,
      clan_slug: null,
      start_year,
      end_year,
      flag_iso: null,
      source: 'wiki_TH',
    });
  }
  return results;
}

// Parse bullet-style clan history. Two sub-formats:
// - Year-grouped (Purity): '''2000''' header, then * [[Image:flag_xx.gif]] [[Clan]]
// - Flat (ParadokS): * [[Image:flag_xx.gif]] [[Clan]]
function parseClanHistoryBullets(sectionBody: string | null): ClanHistoryEntry[] {
  if (!sectionBody) return [];
  const lines = sectionBody.split('\n');
  const results: ClanHistoryEntry[] = [];
  let currentYear: number | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Year header: '''2000''' or ==2000== or similar
    const yearHeaderMatch = /^'''(\d{4})'''/.exec(trimmed);
    if (yearHeaderMatch) {
      currentYear = parseInt(yearHeaderMatch[1]!, 10);
      continue;
    }

    // Bullet line: * [[Image:flag_xx.gif]] [[ClanName]] or * [[ClanName]]
    if (!trimmed.startsWith('*')) continue;
    const content = trimmed.slice(1).trim();

    const flag_iso = extractFlagIso(content);

    // Remove image link entirely, then resolve the remaining wiki link
    const noImage = content.replace(/\[\[(?:Image|image|File|file):[^\]]*\]\]/gi, '').trim();
    const display = resolveWikiLink(noImage.trim()).display.trim();
    if (!display) continue;

    results.push({
      clan_title: display,
      clan_slug: null,
      start_year: currentYear,
      end_year: currentYear,
      flag_iso,
      source: 'wiki_bullet',
    });
  }

  return results;
}

// Parse bullet-style achievements from a section body.
// Format: * [[2007]] - Winner: [[Event]] with [[Image:flag_xx.gif]] [[Team]] - ([[Match report]])
function parseAchievementBullets(sectionBody: string | null): Achievement[] {
  if (!sectionBody) return [];
  const lines = sectionBody.split('\n');
  const results: Achievement[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('*')) continue;
    const content = trimmed.slice(1).trim();

    // Extract year: [[1999]] or bare 1999 at the start
    let year: number | null = null;
    const yearLinkMatch = /^\[\[(\d{4})\]\]/.exec(content);
    const yearBareMatch = /^(\d{4})\b/.exec(content);
    if (yearLinkMatch) {
      year = parseInt(yearLinkMatch[1]!, 10);
    } else if (yearBareMatch) {
      year = parseInt(yearBareMatch[1]!, 10);
    }

    // Strip the year prefix and leading separator
    const afterYear = content.replace(/^\[\[\d{4}\]\]\s*-?\s*/, '').replace(/^\d{4}\s*-\s*/, '').trim();

    // Extract place from common patterns: "1st", "2nd", "Winner", "Runner-up", "Semifinalist", etc.
    let place: string | null = null;
    const placeMatch = /^(\d+(?:st|nd|rd|th)(?:\s+place)?|Winner|Runner-up|Semifinalist|Quarterfinalist|Eighthfinalist|\d+th\s+place|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|[A-Z][a-z]+finalis[t])\b[:\s-]*/i.exec(afterYear);
    if (placeMatch) {
      place = placeMatch[1]!.trim();
    }

    // Extract event title: first [[WikiLink]] target or plain text up to "with" or end
    let event_title = '';
    const afterPlace = placeMatch ? afterYear.slice(placeMatch[0]!.length).trim() : afterYear;
    const eventLinkMatch = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(afterPlace);
    if (eventLinkMatch) {
      event_title = (eventLinkMatch[2] ?? eventLinkMatch[1]!).trim();
    } else {
      // Plain text up to " with " or end
      const withIdx = afterPlace.toLowerCase().indexOf(' with ');
      event_title = withIdx > 0 ? afterPlace.slice(0, withIdx).trim() : afterPlace.trim();
    }

    // Extract team and team flag (after "with [[Image:flag_xx.gif]] [[Team]]")
    let team: string | null = null;
    let team_flag: string | null = null;
    const withMatch = /\bwith\s+(.*)/i.exec(content);
    if (withMatch) {
      const withPart = withMatch[1]!;
      team_flag = extractFlagIso(withPart);
      // Find the team: last [[...]] before the match report link " - ([[..."
      const teamLinks = [...withPart.matchAll(/\[\[(?!Image|image|File|file)([^\]|]+)(?:\|([^\]]+))?\]\]/g)];
      if (teamLinks.length > 0) {
        const last = teamLinks[teamLinks.length - 1]!;
        team = (last[2] ?? last[1]!).trim();
      }
    }

    if (event_title) {
      results.push({
        year,
        place,
        event_title,
        event_slug: null,
        mode: null,
        team,
        team_flag,
        additional: null,
        prize: null,
        source: 'wiki_achievement',
      });
    }
  }

  return results;
}

// Parse {{Achievement|...}} templates from a section body.
function parseAchievementTemplates(sectionBody: string | null): Achievement[] {
  if (!sectionBody) return [];
  const results: Achievement[] = [];

  const re = /\{\{Achievement\|([^{}]*(?:\{\{[^{}]*\}\}[^{}]*)*)\}\}/g;
  for (const m of sectionBody.matchAll(re)) {
    const inner = m[1]!;
    // Parse as pipe-separated key=value pairs (no nested braces in these)
    const fields: Record<string, string> = {};
    // Split on | but not inside {{}}
    const parts = inner.split('|');
    for (const part of parts) {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) continue;
      const key = part.slice(0, eqIdx).trim();
      const val = part.slice(eqIdx + 1).trim();
      if (key) fields[key] = val;
    }

    const yearStr = fields['year'] ?? '';
    const year = yearStr ? parseYear(yearStr) : null;
    const place = fields['place'] ? fields['place'].trim() : null;
    const event_title = fields['event'] ? fields['event'].trim() : '';
    const mode = fields['mode'] ? fields['mode'].trim() : null;
    const team_flag = fields['flag'] ? fields['flag'].trim() || null : null;
    const team = fields['team'] ? fields['team'].trim() || null : null;
    const additional = fields['additional'] ? fields['additional'].trim() || null : null;
    const prize = fields['prize'] ? fields['prize'].trim() || null : null;

    if (event_title) {
      results.push({
        year,
        place,
        event_title,
        event_slug: null,
        mode: mode || null,
        team: team || null,
        team_flag: team_flag || null,
        additional: additional || null,
        prize: prize || null,
        source: 'wiki_achievement',
      });
    }
  }

  return results;
}

// Split a string on & or , separators, resolve wiki links, filter empty.
function splitWikiLinksAmpersand(s: string): string[] {
  // Replace & separators with , then use splitWikiLinks logic
  const normalized = s.replace(/\s*&\s*/g, ',');
  return splitWikiLinks(normalized);
}

// Extract the narrative intro: everything before the first == heading,
// minus any infobox template block.
function extractNarrativeIntro(wikitext: string): string {
  // Find the first == heading line
  const headingIdx = wikitext.search(/^==[^=]/m);
  const leadSection = headingIdx > 0 ? wikitext.slice(0, headingIdx) : wikitext;

  // Remove infobox blocks (Infobox player or Player-info)
  let prose = leadSection;

  // Remove the {{Infobox player|...}} block if present
  const infoboxBlock = extractInfoboxBlock(leadSection, 'Infobox player');
  if (infoboxBlock !== null) {
    // The full template including braces
    const fullTemplate = `{{${infoboxBlock}}}`;
    // Use the stripped version from extractInfoboxBlock which handles nesting
    // We need to remove the raw {{Infobox player ... }} from the lead.
    // Find and remove by scanning for the opening.
    prose = removeFirstTemplateBlock(prose, 'Infobox player');
  }

  const playerInfoBlock = extractInfoboxBlock(leadSection, 'Player-info');
  if (playerInfoBlock !== null) {
    prose = removeFirstTemplateBlock(prose, 'Player-info');
  }

  return stripWikiMarkup(prose).trim();
}

// Remove the first {{templateName|...}} block from a wikitext string.
// Handles nested {{ }} depth correctly.
function removeFirstTemplateBlock(wikitext: string, templateName: string): string {
  const needle = `{{${templateName}`;
  const lower = wikitext.toLowerCase();
  const needleLower = needle.toLowerCase();
  const start = lower.indexOf(needleLower);
  if (start === -1) return wikitext;

  let depth = 0;
  let i = start;
  while (i < wikitext.length) {
    if (wikitext[i] === '{' && wikitext[i + 1] === '{') {
      depth++;
      i += 2;
    } else if (wikitext[i] === '}' && wikitext[i + 1] === '}') {
      depth--;
      if (depth === 0) {
        return wikitext.slice(0, start) + wikitext.slice(i + 2);
      }
      i += 2;
    } else {
      i++;
    }
  }
  return wikitext;
}

// Extract the == Information == section body, minus the infobox block within it.
function extractInfoSectionExtras(wikitext: string): string {
  const body = extractSectionBody(wikitext, 'Information');
  if (!body) return '';

  // Remove the Player-info or Infobox player block if present within the section
  let extras = body;
  if (extractInfoboxBlock(body, 'Player-info')) {
    extras = removeFirstTemplateBlock(extras, 'Player-info');
  }
  if (extractInfoboxBlock(body, 'Infobox player')) {
    extras = removeFirstTemplateBlock(extras, 'Infobox player');
  }

  return extras.trim();
}

// Build an emptyPlayer for articles with no wikitext (F16).
function emptyPlayer(article: WikiArticle): ParsedPlayer {
  const parentheticalMatch = article.title.match(/\s*\(([^)]*)\)\s*$/);
  const display_name = article.title.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return {
    slug: article.slug,
    title: article.title,
    display_name,
    aliases: [],
    real_name: null,
    nationality: null,
    nationality_iso: null,
    current_clan: null,
    community_roles: [],
    status: 'unknown',
    active_year_start: null,
    active_year_end: null,
    source_template: 'none',
    source_categories: article.categories,
    wiki_revision_id: article.revid,
    wiki_fetched_at: article.timestamp,
    clan_history: [],
    achievements: [],
    narrative_intro: '',
    info_section_extras: '',
    quotes_section: '',
    trivia_section: '',
    media_section: '',
    gallery_section: '',
    see_also_section: '',
    external_links_section: '',
    mouse_settings_present: false,
    crosshair_present: false,
    gallery_image_count: 0,
  };
}

// ---------------------------------------------------------------------------
// Branch A: Infobox player (Milton-style)
// ---------------------------------------------------------------------------

interface BranchResult {
  real_name: string | null;
  aliases: string[];
  nationality: string | null;
  nationality_iso: string | null;
  current_clan: string | null;
  community_roles: string[];
  status: 'Active' | 'Retired' | 'Inactive' | 'Quit' | 'unknown';
  spawned_year: number | null;
  foundquake_year: number | null;
  retired_year: number | null;
  clan_history: ClanHistoryEntry[];
  achievements: Achievement[];
}

function parseInfoboxPlayerBranch(wikitext: string, display_name: string): BranchResult {
  const block = extractInfoboxBlock(wikitext, 'Infobox player');
  const fields = block ? parseInfoboxFields(block) : {};

  const real_name = fields['name'] ? fields['name'].trim() || null : null;

  // Aliases: from ids field (comma-separated), plus id if differs from display_name
  const aliases: string[] = [];
  if (fields['ids']) {
    aliases.push(...splitCsv(fields['ids']));
  }
  if (fields['id'] && fields['id'].trim() !== display_name) {
    const idVal = fields['id'].trim();
    if (idVal && !aliases.includes(idVal)) {
      aliases.push(idVal);
    }
  }

  // Nationality from country field
  let nationality: string | null = null;
  let nationality_iso: string | null = null;
  if (fields['country']) {
    const demonym = countryToNationality(fields['country'].trim());
    if (demonym) {
      nationality = demonym.charAt(0).toUpperCase() + demonym.slice(1);
      nationality_iso = nationalityToIso(demonym);
    }
  }

  const current_clan_raw = fields['clan'] ? fields['clan'].trim() : null;
  let current_clan = current_clan_raw ? (stripSingleWikiLink(current_clan_raw) ?? current_clan_raw) : null;
  if (!current_clan && current_clan_raw) current_clan = current_clan_raw;

  let status = normalizeStatus(fields['status']);

  const spawned_year = fields['spawned'] ? parseYear(fields['spawned']) : null;

  // Clan history from TH rows
  const clan_history = fields['history'] ? parseTHRows(fields['history']) : [];

  // Achievements from ==Achievements== section
  const achievementBody = extractSectionBody(wikitext, 'Achievements');
  const achievements = parseAchievementTemplates(achievementBody);

  // community_roles: not in infobox; handled in post-processing
  return {
    real_name,
    aliases,
    nationality,
    nationality_iso,
    current_clan,
    community_roles: [],
    status,
    spawned_year,
    foundquake_year: null,
    retired_year: null,
    clan_history,
    achievements,
  };
}

// ---------------------------------------------------------------------------
// Branch B: Player-info (ParadokS / Purity-style)
// ---------------------------------------------------------------------------

function parsePlayerInfoBranch(wikitext: string, display_name: string): BranchResult {
  const block = extractInfoboxBlock(wikitext, 'Player-info');
  const fields = block ? parseInfoboxFields(block) : {};

  const real_name = fields['realname'] ? fields['realname'].trim() || null : null;

  // Aliases from aka / alias / otheraliases
  const aliasSource = fields['aka'] ?? fields['alias'] ?? fields['otheraliases'] ?? '';
  const aliases = aliasSource ? splitCsv(aliasSource) : [];
  // Dedup against display_name (case-sensitive)
  const filteredAliases = aliases.filter(a => a !== display_name);

  // Nationality from nationality field
  let nationality: string | null = null;
  let nationality_iso: string | null = null;
  if (fields['nationality']) {
    const raw = fields['nationality'].trim();
    // Capitalize first letter to get demonym form
    nationality = raw.length > 0 ? raw.charAt(0).toUpperCase() + raw.slice(1) : null;
    nationality_iso = nationalityToIso(raw);
  }
  // Fallback: shortnationality as ISO
  if (!nationality_iso && fields['shortnationality']) {
    const shortIso = fields['shortnationality'].trim().toLowerCase();
    if (shortIso.length === 2) {
      nationality_iso = shortIso;
    }
  }

  // Current clan
  let current_clan: string | null = null;
  let status: 'Active' | 'Retired' | 'Inactive' | 'Quit' | 'unknown' = 'unknown';

  if (fields['currentclan']) {
    const rawClan = fields['currentclan'].trim();
    const resolved = stripSingleWikiLink(rawClan) ?? rawClan;
    if (resolved.toLowerCase() === 'quit' || resolved === '-') {
      current_clan = null;
      status = 'Quit';
    } else {
      current_clan = resolved || null;
    }
  }

  // Retired year
  let retired_year: number | null = null;
  if (fields['retired'] && fields['retired'].trim()) {
    retired_year = parseYear(fields['retired']);
    if (retired_year !== null) {
      status = 'Retired';
    }
  }

  // foundquake year
  const foundquake_year = fields['foundquake'] ? parseYear(fields['foundquake']) : null;

  // Community roles from adminof and crewmemberof
  const community_roles: string[] = [];
  if (fields['adminof']) {
    const roles = splitWikiLinksAmpersand(fields['adminof']);
    for (const r of roles) {
      if (r && !community_roles.includes(r)) community_roles.push(r);
    }
  }
  if (fields['crewmemberof']) {
    const roles = splitWikiLinksAmpersand(fields['crewmemberof']);
    for (const r of roles) {
      if (r && !community_roles.includes(r)) community_roles.push(r);
    }
  }

  // Clan history from ==Clan history== section
  const clanHistoryBody = extractSectionBody(wikitext, 'Clan history');
  const clan_history = parseClanHistoryBullets(clanHistoryBody);

  // Achievements from ==Achievements== section
  const achievementBody = extractSectionBody(wikitext, 'Achievements');
  const achievements = parseAchievementBullets(achievementBody);

  return {
    real_name,
    aliases: filteredAliases,
    nationality,
    nationality_iso,
    current_clan,
    community_roles,
    status,
    spawned_year: null,
    foundquake_year,
    retired_year,
    clan_history,
    achievements,
  };
}

// ---------------------------------------------------------------------------
// Branch C: Bullet-prose (Crit / Bomkia / Acid-style)
// ---------------------------------------------------------------------------

function parseBulletProseBranch(wikitext: string, display_name: string): BranchResult {
  const lines = wikitext.split('\n');
  let real_name: string | null = null;
  let nationality: string | null = null;
  let nationality_iso: string | null = null;
  let current_clan: string | null = null;
  let status: 'Active' | 'Retired' | 'Inactive' | 'Quit' | 'unknown' = 'unknown';
  const aliases: string[] = [];
  const community_roles: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('*')) continue;
    const content = trimmed.slice(1).trim();

    // Real name (triple-tick bold optional)
    const realNameMatch = /^\s*(?:''')?[Rr]eal\s*[Nn]ame:(?:''')?\s*(.*)/.exec(content);
    if (realNameMatch) {
      const val = realNameMatch[1]!.trim();
      real_name = (val === '???' || val === '??' || val === '?' || val === '') ? null : val;
      continue;
    }

    // Date of birth / Born -- IGNORE (D8)
    if (/^\s*(?:''')?[Dd]ate\s+of\s+[Bb]irth:(?:''')?/.test(content)) continue;
    if (/^\s*(?:''')?[Bb]orn:(?:''')?/.test(content)) continue;

    // Nationality (triple-tick bold optional)
    const natMatch = /^\s*(?:''')?[Nn]ationality:(?:''')?\s*(.*)/.exec(content);
    if (natMatch) {
      const val = natMatch[1]!.trim();
      // Extract flag ISO from [[Image:flag_xx.gif]]
      const iso = extractFlagIso(val);
      if (iso) nationality_iso = iso;
      // Remove image links and strip markup to get demonym text
      const textOnly = stripWikiMarkup(val.replace(/\[\[(?:Image|image|File|file):[^\]]*\]\]/gi, '')).trim();
      if (textOnly) {
        nationality = textOnly;
        if (!nationality_iso) {
          nationality_iso = nationalityToIso(textOnly);
        }
      }
      continue;
    }

    // Current clan (triple-tick bold optional)
    const clanMatch = /^\s*(?:''')?[Cc]urrent\s+[Cc]lan:(?:''')?\s*(.*)/.exec(content);
    if (clanMatch) {
      const val = clanMatch[1]!.trim();
      // Remove flag images
      const noFlag = val.replace(/\[\[(?:Image|image|File|file):[^\]]*\]\]/gi, '').trim();
      const resolved = stripSingleWikiLink(noFlag) ?? noFlag;
      if (resolved.toLowerCase() === 'quit' || resolved === '-') {
        current_clan = null;
        status = 'Quit';
      } else {
        current_clan = resolved || null;
      }
      continue;
    }

    // Aliases (triple-tick bold optional)
    const aliasMatch = /^\s*(?:''')?(?:[Aa]lso\s+[Kk]nown\s+[Aa]s|AKA|[Aa]liases?|[Aa]ka):(?:''')?\s*(.*)/.exec(content);
    if (aliasMatch) {
      const parts = splitCsv(aliasMatch[1]!);
      for (const p of parts) {
        if (p !== display_name && !aliases.includes(p)) aliases.push(p);
      }
      continue;
    }

    // Status (triple-tick bold optional)
    const statusMatch = /^\s*(?:''')?[Ss]tatus:(?:''')?\s*(.*)/.exec(content);
    if (statusMatch) {
      const s = normalizeStatus(statusMatch[1]!.trim());
      if (s !== 'unknown') status = s;
      continue;
    }

    // Community roles: Former X admin / Former admin of X (triple-tick bold optional)
    const formerAdminMatch = /^\s*(?:''')?[Ff]ormer\s+(.+?)\s+[Aa]dmin(?:''')?/.exec(content);
    if (formerAdminMatch) {
      const what = stripWikiMarkup(formerAdminMatch[1]!.trim());
      const role = `Former ${what} admin`;
      if (!community_roles.includes(role)) community_roles.push(role);
      continue;
    }
    const formerAdminOfMatch = /^\s*(?:''')?[Ff]ormer\s+[Aa]dmin\s+[Oo]f\s+(.+?)(?:''')?/.exec(content);
    if (formerAdminOfMatch) {
      const target = stripWikiMarkup(formerAdminOfMatch[1]!);
      const role = `Former admin of ${target}`;
      if (!community_roles.includes(role)) community_roles.push(role);
      continue;
    }

    // Captain
    const captainMatch = /^\s*(?:''')?[Cc]aptain:(?:''')?\s*(.*)/.exec(content);
    if (captainMatch) {
      const target = stripSingleWikiLink(captainMatch[1]!.trim()) ?? captainMatch[1]!.trim();
      const role = `Captain of ${target}`;
      if (target && !community_roles.includes(role)) community_roles.push(role);
      continue;
    }

    // Co-founder / Founder
    const coFounderMatch = /^\s*(?:''')?[Cc]o-[Ff]ounder\s+[Oo]f:(?:''')?\s*(.*)/.exec(content);
    if (coFounderMatch) {
      const target = stripSingleWikiLink(coFounderMatch[1]!.trim()) ?? coFounderMatch[1]!.trim();
      const role = `Co-founder of ${target}`;
      if (target && !community_roles.includes(role)) community_roles.push(role);
      continue;
    }
    const founderOfMatch = /^\s*(?:''')?[Ff]ounder\s+[Oo]f\s*(?:''')?(.+?)(?:''')?$/.exec(content);
    if (founderOfMatch) {
      const target = stripWikiMarkup(founderOfMatch[1]!);
      const role = `Founder of ${target}`;
      if (target && !community_roles.includes(role)) community_roles.push(role);
      continue;
    }
  }

  // Clan history from ==Clan history== section
  const clanHistoryBody = extractSectionBody(wikitext, 'Clan history');
  const clan_history = parseClanHistoryBullets(clanHistoryBody);

  // Achievements from ==Achievements== section
  const achievementBody = extractSectionBody(wikitext, 'Achievements');
  const achievements = parseAchievementBullets(achievementBody);

  return {
    real_name,
    aliases,
    nationality,
    nationality_iso,
    current_clan,
    community_roles,
    status,
    spawned_year: null,
    foundquake_year: null,
    retired_year: null,
    clan_history,
    achievements,
  };
}

// ---------------------------------------------------------------------------
// Branch D: Prose fallback (Vo0-style)
// ---------------------------------------------------------------------------

function parseProseFallbackBranch(
  wikitext: string,
  display_name: string,
  categories: string[],
): BranchResult {
  // Nationality from categories
  const catNat = extractCategoryNationality(categories);
  const nationality = catNat ? catNat.nationality : null;
  const nationality_iso = catNat ? catNat.iso : null;

  // Real name: scan the lead section (before first == heading) for '''...''' patterns.
  // Not just the first paragraph -- some articles have a preamble line before the bold text.
  const headingIdx = wikitext.search(/^==[^=]/m);
  const leadSection = headingIdx > 0 ? wikitext.slice(0, headingIdx) : wikitext;
  const boldMatches = [...leadSection.matchAll(/'''([^']+)'''/g)].map(m => m[1]!.trim());
  const realNameCandidates = boldMatches.filter(b => b !== display_name);
  const real_name = realNameCandidates.length > 0 ? (realNameCandidates[0] ?? null) : null;

  // Aliases: "also goes by the pseudonym '''X'''" or "also known as '''X'''"
  const aliases: string[] = [];
  const pseudonymRe = /\b(?:also\s+goes\s+by\s+the\s+pseudonym|also\s+known\s+as)\s+'''([^']+)'''/gi;
  for (const m of wikitext.matchAll(pseudonymRe)) {
    const alias = m[1]!.trim();
    if (alias !== display_name && !aliases.includes(alias)) {
      aliases.push(alias);
    }
  }

  // Status: scan for retired/quit
  let status: 'Active' | 'Retired' | 'Inactive' | 'Quit' | 'unknown' = 'unknown';
  const lower = wikitext.toLowerCase();
  if (lower.includes('retired') || lower.includes('retire')) status = 'Retired';
  else if (lower.includes('quit')) status = 'Quit';

  // Achievements from ==Notable achievements== or ==Achievements== section
  const notableAchievementBody = extractSectionBody(wikitext, 'Notable achievements');
  const achievementBody = extractSectionBody(wikitext, 'Achievements');
  const achievements = parseAchievementBullets(notableAchievementBody ?? achievementBody);

  return {
    real_name,
    aliases,
    nationality,
    nationality_iso,
    current_clan: null,
    community_roles: [],
    status,
    spawned_year: null,
    foundquake_year: null,
    retired_year: null,
    clan_history: [],
    achievements,
  };
}

// ---------------------------------------------------------------------------
// Post-processing: community_roles prose scan
// ---------------------------------------------------------------------------

function scanProseRoles(wikitext: string, existing: string[]): string[] {
  const roles = [...existing];

  const addRole = (role: string) => {
    const trimmed = role.trim();
    if (trimmed && !roles.includes(trimmed)) roles.push(trimmed);
  };

  // Strip image links from a value string before resolving the wiki link.
  const resolveRoleTarget = (raw: string): string | null => {
    const noImage = raw.replace(/\[\[(?:Image|image|File|file):[^\]]*\]\]/gi, '').trim();
    return stripSingleWikiLink(noImage) ?? (stripWikiMarkup(noImage).trim() || null);
  };

  // Co-founder of: [[X]] or '''Co-founder of:''' [[X]]
  const cofounderRe = /'''\s*[Cc]o-[Ff]ounder\s+[Oo]f:?\s*'''\s*(.+)/g;
  for (const m of wikitext.matchAll(cofounderRe)) {
    const raw = m[1]!.split('\n')[0]!.trim();
    const display = resolveRoleTarget(raw);
    if (display) addRole(`Co-founder of ${display}`);
  }

  // Founder: [[X]]
  const founderRe = /'''\s*[Ff]ounder:?\s*'''\s*(.+)/g;
  for (const m of wikitext.matchAll(founderRe)) {
    const raw = m[1]!.split('\n')[0]!.trim();
    const display = resolveRoleTarget(raw);
    if (display) addRole(`Founder of ${display}`);
  }

  // Captain: [[X]] or Captain of [[X]]
  const captainRe = /'''\s*[Cc]aptain(?:\s+[Oo]f)?:?\s*'''\s*(.+)/g;
  for (const m of wikitext.matchAll(captainRe)) {
    const raw = m[1]!.split('\n')[0]!.trim();
    const display = resolveRoleTarget(raw);
    if (display) addRole(`Captain of ${display}`);
  }

  // Captain of [[X]] (prose, no bold)
  const captainProse = /\b[Cc]aptain\s+of\s+\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  for (const m of wikitext.matchAll(captainProse)) {
    const display = (m[2] ?? m[1]!).trim();
    if (display) addRole(`Captain of ${display}`);
  }

  // Former ... admin (strip wiki links from the "what" portion)
  const formerAdminRe = /'''\s*[Ff]ormer\s+(.+?)\s+[Aa]dmin\s*'''/g;
  for (const m of wikitext.matchAll(formerAdminRe)) {
    const what = stripWikiMarkup(m[1]!.trim());
    addRole(`Former ${what} admin`);
  }

  return roles;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function parsePlayer(article: WikiArticle): ParsedPlayer {
  // F16: empty wikitext must not crash
  if (!article.wikitext || article.wikitext.trim() === '') {
    return emptyPlayer(article);
  }

  const wikitext = article.wikitext;
  const slug = article.slug;
  const title = article.title;

  // Title decomposition
  const parentheticalMatch = title.match(/\s*\(([^)]*)\)\s*$/);
  const disambiguator = parentheticalMatch ? parentheticalMatch[1]! : null;
  const display_name = title.replace(/\s*\([^)]*\)\s*$/, '').trim();

  // Strip HTML comments before template detection (but use original wikitext for parsing)
  const wikitextNoComments = wikitext.replace(/<!--[\s\S]*?-->/g, '');

  // Template detection -- order matters
  let source_template: ParsedPlayer['source_template'];
  if (/\{\{Infobox player/i.test(wikitextNoComments)) {
    source_template = 'infobox_player';
  } else if (/\{\{Player-info/i.test(wikitextNoComments)) {
    source_template = 'player_info';
  } else {
    // Bullet-prose: at least 2 of these patterns present.
    // Triple-tick bold is optional -- some articles use bare `* Real name:` without markup.
    const bulletPatterns = [
      /^\*\s*(?:''')?Real name:(?:''')?/im,
      /^\*\s*(?:''')?Nationality:(?:''')?/im,
      /^\*\s*(?:''')?Current clan:(?:''')?/im,
    ];
    const matchCount = bulletPatterns.filter(re => re.test(wikitextNoComments)).length;
    source_template = matchCount >= 2 ? 'bullet_prose' : 'none';
  }

  // Branch dispatch
  let branchResult: BranchResult;
  if (source_template === 'infobox_player') {
    branchResult = parseInfoboxPlayerBranch(wikitext, display_name);
  } else if (source_template === 'player_info') {
    branchResult = parsePlayerInfoBranch(wikitext, display_name);
  } else if (source_template === 'bullet_prose') {
    branchResult = parseBulletProseBranch(wikitext, display_name);
  } else {
    branchResult = parseProseFallbackBranch(wikitext, display_name, article.categories);
  }

  // Post-processing 1: alias dedup + parenthetical capture
  const aliases = [...branchResult.aliases];

  // Add nationalities from disambiguator tokens (e.g. "Finnish" from "Finnish Player")
  if (disambiguator) {
    const skipTokens = new Set(['player', 'clan', 'team', 'the', 'a']);
    const tokens = disambiguator.split(/\s+/);
    for (const token of tokens) {
      if (skipTokens.has(token.toLowerCase())) continue;
      const iso = nationalityToIso(token);
      if (iso !== null) {
        // Add the nationality token if not already present
        if (!aliases.includes(token)) aliases.push(token);
      }
    }
  }

  // Dedup aliases (case-sensitive), remove display_name
  const seenAliases = new Set<string>();
  const dedupedAliases: string[] = [];
  for (const a of aliases) {
    if (a !== display_name && !seenAliases.has(a)) {
      seenAliases.add(a);
      dedupedAliases.push(a);
    }
  }

  // Post-processing 2: community_roles prose scan
  const community_roles = scanProseRoles(wikitext, branchResult.community_roles);

  // Post-processing 3: active_year_start (D8 -- no birth_date)
  const yearCandidates: number[] = [];
  if (branchResult.spawned_year !== null) yearCandidates.push(branchResult.spawned_year);
  if (branchResult.foundquake_year !== null) yearCandidates.push(branchResult.foundquake_year);
  for (const e of branchResult.clan_history) {
    if (e.start_year !== null) yearCandidates.push(e.start_year);
  }
  for (const a of branchResult.achievements) {
    if (a.year !== null) yearCandidates.push(a.year);
  }
  const active_year_start = yearCandidates.length > 0 ? Math.min(...yearCandidates) : null;

  // Post-processing 4: active_year_end
  let active_year_end: number | null = null;
  const status = branchResult.status;
  if (status !== 'Active') {
    const endCandidates: number[] = [];
    if (branchResult.retired_year !== null) endCandidates.push(branchResult.retired_year);
    for (const e of branchResult.clan_history) {
      if (e.end_year !== null) endCandidates.push(e.end_year);
    }
    for (const a of branchResult.achievements) {
      if (a.year !== null) endCandidates.push(a.year);
    }
    active_year_end = endCandidates.length > 0 ? Math.max(...endCandidates) : null;
  }

  // Post-processing 5: body sections
  const narrative_intro = extractNarrativeIntro(wikitext);
  const info_section_extras = extractInfoSectionExtras(wikitext);

  let quotes_section = extractSectionBody(wikitext, 'Quotes') ?? '';
  if (quotes_section === '??' || quotes_section === '???') quotes_section = '';

  const trivia_section = extractSectionBody(wikitext, 'Trivia') ?? '';
  const media_section = extractSectionBody(wikitext, 'Media') ?? '';
  const gallery_section = extractSectionBody(wikitext, 'Gallery') ?? '';
  const see_also_section = extractSectionBody(wikitext, 'See also') ?? '';
  const external_links_section = extractSectionBody(wikitext, 'External links') ?? '';

  // Post-processing 6: equipment/media probes
  const mouse_settings_present = /\{\{Mouse settings table/i.test(wikitext);
  const crosshair_present = /\{\{crosshair table/i.test(wikitext);
  const gallery_image_count = [...(wikitext.matchAll(/<gallery[\s\S]*?<\/gallery>/gi) ?? [])]
    .reduce((acc, m) => acc + (m[0]!.match(/^File:/gim)?.length ?? 0), 0);

  return {
    slug,
    title,
    display_name,
    aliases: dedupedAliases,
    real_name: branchResult.real_name,
    nationality: branchResult.nationality,
    nationality_iso: branchResult.nationality_iso,
    current_clan: branchResult.current_clan,
    community_roles,
    status,
    active_year_start,
    active_year_end,
    source_template,
    source_categories: article.categories,
    wiki_revision_id: article.revid,
    wiki_fetched_at: article.timestamp,
    clan_history: branchResult.clan_history,
    achievements: branchResult.achievements,
    narrative_intro,
    info_section_extras,
    quotes_section,
    trivia_section,
    media_section,
    gallery_section,
    see_also_section,
    external_links_section,
    mouse_settings_present,
    crosshair_present,
    gallery_image_count,
  };
}
