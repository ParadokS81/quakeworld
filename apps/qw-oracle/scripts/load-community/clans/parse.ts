// apps/qw-oracle/scripts/load-community/clans/parse.ts
//
// Pure parser: WikiArticle -> ParsedClan.
// No IO, no DB. Deterministic regex/template-shape matching only (D4).

import {
  extractInfoboxBlock,
  parseInfoboxFields,
  extractSectionBody,
  stripWikiMarkup,
  splitCsv,
  parseYear,
  normalizeDash,
} from '../shared/wiki-text.ts';

import {
  nationalityToIso,
  isoToNationality,
  countryToNationality,
} from '../shared/iso-country.ts';

import type { WikiArticle } from '../shared/wiki-types.ts';

// ---------------------------------------------------------------------------
// ParsedClan
// ---------------------------------------------------------------------------

export interface ParsedClan {
  // Identity
  slug: string;
  title: string;

  // Structured row fields
  prefix: string | null;
  nationality: string | null;
  nationality_iso: string | null;
  founded_year: number | null;
  founded_month: number | null;
  founded_day: number | null;
  founded_by: string | null;
  disbanded: string | null;
  status: 'Active' | 'Inactive' | 'Disbanded' | 'unknown';
  irc_channel: string | null;
  irc_network: string | null;
  website: string | null;

  // Provenance
  source_template: 'clan_info' | 'infobox_clan' | 'infobox_4on4team' | 'bullet_prose' | 'none';
  source_categories: string[];
  wiki_revision_id: number;
  wiki_fetched_at: string;

  // Body content (consumed by emit-note)
  narrative_intro: string;
  history_section: string;
  info_section: string;
  achievements_section: string;
  members_section: string;
  see_also_section: string;
  external_links_section: string;

  // Flags-input fields
  narrative_byte_length: number;
  has_history: boolean;
  achievements_count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeClanStatus(s: string | undefined): 'Active' | 'Inactive' | 'Disbanded' | 'unknown' {
  if (!s) return 'unknown';
  const lower = s.trim().toLowerCase();
  if (lower === 'active') return 'Active';
  if (lower === 'inactive') return 'Inactive';
  if (lower === 'disbanded') return 'Disbanded';
  return 'unknown';
}

const MONTH_TO_NUM: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function parseMonth(s: string | undefined): number | null {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  if (!t) return null;
  if (MONTH_TO_NUM[t] !== undefined) return MONTH_TO_NUM[t]!;
  const n = parseInt(t, 10);
  if (Number.isFinite(n) && n >= 1 && n <= 12) return n;
  return null;
}

// Parse Infobox 4on4team's `created` field: "1997, April" or "1997".
function parseCreated(s: string | undefined): { year: number | null; month: number | null } {
  if (!s) return { year: null, month: null };
  const t = s.trim();
  const yearMatch = /(?:19|20)\d{2}/.exec(t);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : null;
  // Look for month name anywhere in the string.
  let month: number | null = null;
  for (const [name, num] of Object.entries(MONTH_TO_NUM)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(t)) { month = num; break; }
  }
  return { year, month };
}

// Extract nick names from {{player|Nick|...}} templates; fall back to stripWikiMarkup.
function parseFounderField(s: string | undefined): string | null {
  if (!s) return null;
  const nicks: string[] = [];
  for (const m of s.matchAll(/\{\{player\|([^|}]+)(?:\|[^}]*)?\}\}/gi)) {
    const nick = m[1]!.trim();
    if (nick) nicks.push(nick);
  }
  if (nicks.length > 0) return nicks.join(', ');
  // Fallback: strip wiki markup and return plain text.
  const stripped = stripWikiMarkup(s).trim();
  return stripped.length > 0 ? stripped : null;
}

// Resolve nationality ISO from shortnationality + nationality fields.
// shortnationality may be a 2-letter code, a demonym, or a country name.
function resolveIso(shortNat: string | null, nat: string | null): string | null {
  if (shortNat) {
    const s = shortNat.trim().toLowerCase();
    // Already a 2-letter ISO code.
    if (/^[a-z]{2}$/.test(s)) return s;
    // Try as a demonym directly.
    const direct = nationalityToIso(s);
    if (direct) return direct;
    // Try as a country name -> demonym -> ISO.
    const demo = countryToNationality(s);
    if (demo) {
      const fromDemo = nationalityToIso(demo);
      if (fromDemo) return fromDemo;
    }
  }
  if (nat) {
    const fromNat = nationalityToIso(nat);
    if (fromNat) return fromNat;
  }
  return null;
}

// Extract IRC channel name from a bullet line (Morituri style: [irc://host/channel #channel]).
function extractIrcChannelFromBullet(rawLine: string): string | null {
  // Try irc://host/channel pattern first.
  const m = /irc:\/\/[^/\s\]]+\/([^\s\]]+)/i.exec(rawLine);
  if (m) return m[1]!.trim();
  // Fallback: text after "IRC channel:" label, up to first whitespace; strip leading #.
  const after = rawLine.replace(/.*?IRC[\s-]*channel[\s:]*/i, '').trim();
  if (!after) return null;
  const first = after.split(/[\s,([/]/)[0]!;
  return first.replace(/^#/, '') || null;
}

const IRC_HOST_TO_NETWORK: Record<string, string> = {
  'quakenet.org': 'QuakeNet',
  'efnet.org': 'EFnet',
  'freenode.net': 'Freenode',
  'gamesurge.net': 'GameSurge',
};

function extractIrcNetworkFromBullet(rawLine: string): string | null {
  // Try [[NetworkName]] wikilink first -- captures human-friendly network names.
  const wm = /\[\[([A-Za-z][A-Za-z0-9 -]*)\]\]/g;
  for (const m of rawLine.matchAll(wm)) {
    const name = m[1]!.trim();
    if (/quakenet|efnet|freenode|gamesurge/i.test(name)) return name;
  }
  // Try irc://host -> known network mapping.
  const hostMatch = /irc:\/\/([^/\s\]]+)/i.exec(rawLine);
  if (hostMatch) {
    const host = hostMatch[1]!.toLowerCase();
    for (const [domain, network] of Object.entries(IRC_HOST_TO_NETWORK)) {
      if (host.includes(domain)) return network;
    }
    return host; // Unknown network: preserve the host as-is.
  }
  return null;
}

// Extract nationality from a bullet-list line (flag image + demonym text).
// Falls back to flag image suffix with uk->gb normalization.
function resolveBulletIso(line: string): { nationality: string | null; iso: string | null } {
  // Strip image link first to isolate the demonym text.
  const noImg = line.replace(/\[\[Image:flag_[a-z]{2,3}\.gif\]\]\s*/gi, '');
  const demo = stripWikiMarkup(noImg).trim();
  const nationality = demo || null;
  // Prefer demonym lookup (authoritative, handles British -> gb cleanly).
  let iso: string | null = null;
  if (demo) iso = nationalityToIso(demo);
  // Fall back to flag image suffix; normalize uk -> gb (wiki uses uk.gif; ISO 3166 is gb).
  if (!iso) {
    const fm = /flag_([a-z]{2,3})\.gif/i.exec(line);
    if (fm) {
      const code = fm[1]!.toLowerCase();
      iso = code === 'uk' ? 'gb' : (code.length === 2 ? code : null);
    }
  }
  return { nationality, iso };
}

// Best-effort prefix extraction from article title when the infobox field is absent.
// Matches trailing [TAG] or (TAG) where TAG is 2-6 alphanumerics.
function extractPrefixFromTitle(title: string): string | null {
  const m = /\s+([\[(])([A-Za-z0-9]{2,6})([\])])$/.exec(title);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  return null;
}

// Remove the first balanced {{templateName|...}} block from a wikitext string.
// Used to clean infobox blocks out of the lead section before measuring narrative prose.
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
  return wikitext; // Unclosed block -- return unchanged.
}

// Strip clan-stub boilerplate from the External links section body. Three
// drop patterns: (1) {{chtv}} / {{clan-stub}} convention templates, (2)
// standalone [[Category:...]] wiki-link lines that survive extractSectionBody's
// trailing-meta-trim when interrupted by HTML comments (F27), (3) blank-line
// runs collapsed. Counting any of these as "external links" inflates has_note
// for stubs whose only "link" content is wiki-editorial boilerplate. This
// strip runs at parse time so flag computation, note body, and length checks
// all see the same cleaned content.
function stripClanStubBoilerplate(body: string): string {
  if (!body) return '';
  return body
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t) return true; // preserve blank lines so downstream trim/length is honest
      if (/^\{\{(?:chtv|clan-stub)\s*\}\}$/i.test(t)) return false;
      if (/^\[\[Category:[^\]]*\]\]$/i.test(t)) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Extract prose before the first == heading, minus any infobox template block.
function extractNarrativeIntro(wikitext: string): string {
  const headingIdx = wikitext.search(/^==[^=]/m);
  const leadSection = headingIdx > 0 ? wikitext.slice(0, headingIdx) : wikitext;

  // Remove any infobox blocks from the lead so only prose remains.
  let prose = leadSection;
  for (const name of ['Clan-info', 'Infobox Clan', 'Infobox 4on4team']) {
    if (extractInfoboxBlock(prose, name) !== null) {
      prose = removeFirstTemplateBlock(prose, name);
    }
  }

  return stripWikiMarkup(prose).trim();
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function parseClan(article: WikiArticle): ParsedClan {
  const wikitext = article.wikitext ?? '';

  // F16: empty wikitext returns a zero-field clan with safe defaults.
  if (wikitext.trim() === '') {
    return {
      slug: article.slug,
      title: article.title,
      prefix: null,
      nationality: null,
      nationality_iso: null,
      founded_year: null,
      founded_month: null,
      founded_day: null,
      founded_by: null,
      disbanded: null,
      status: 'unknown',
      irc_channel: null,
      irc_network: null,
      website: null,
      source_template: 'none',
      source_categories: article.categories ?? [],
      wiki_revision_id: article.revid,
      wiki_fetched_at: article.timestamp,
      narrative_intro: '',
      history_section: '',
      info_section: '',
      achievements_section: '',
      members_section: '',
      see_also_section: '',
      external_links_section: '',
      narrative_byte_length: 0,
      has_history: false,
      achievements_count: 0,
    };
  }

  // Strip HTML comments before template detection (same pattern as players/parse.ts).
  const wikitextNoComments = wikitext.replace(/<!--[\s\S]*?-->/g, '');

  // Detect template branch (case-insensitive). Order matters: more specific before generic.
  let source_template: ParsedClan['source_template'];
  if (/\{\{clan-info/i.test(wikitextNoComments)) {
    source_template = 'clan_info';
  } else if (/\{\{infobox clan/i.test(wikitextNoComments)) {
    source_template = 'infobox_clan';
  } else if (/\{\{infobox 4on4team/i.test(wikitextNoComments)) {
    source_template = 'infobox_4on4team';
  } else if (wikitextNoComments.trim().length > 0) {
    // Any non-empty article with no recognized template is bullet_prose.
    // This covers both the Information-section bullet-list pattern AND pure-prose articles
    // like Firing Squad that have no structured Information section at all.
    source_template = 'bullet_prose';
  } else {
    source_template = 'none';
  }

  // Field state -- populated by branch dispatch below.
  let prefix: string | null = null;
  let nationality: string | null = null;
  let nationality_iso: string | null = null;
  let founded_year: number | null = null;
  let founded_month: number | null = null;
  let founded_day: number | null = null;
  let founded_by: string | null = null;
  let disbanded: string | null = null;
  let status: 'Active' | 'Inactive' | 'Disbanded' | 'unknown' = 'unknown';
  let irc_channel: string | null = null;
  let irc_network: string | null = null;
  let website: string | null = null;

  // ---------------------------------------------------------------------------
  // Branch A + B: clan_info and infobox_clan (identical field set)
  // ---------------------------------------------------------------------------
  if (source_template === 'clan_info' || source_template === 'infobox_clan') {
    const templateName = source_template === 'clan_info' ? 'Clan-info' : 'Infobox Clan';
    const block = extractInfoboxBlock(wikitext, templateName);
    const fields = block ? parseInfoboxFields(block) : {};

    prefix = fields['prefix']?.trim() || null;

    const rawNat = fields['nationality']?.trim() || null;
    // Normalize to title-case (Swedish, Finnish, Dutch -- not 'swedish' or 'DUTCH').
    nationality = rawNat
      ? rawNat.charAt(0).toUpperCase() + rawNat.slice(1).toLowerCase()
      : null;

    // Resolve ISO: shortnationality may be a 2-letter code, demonym, or country name.
    nationality_iso = resolveIso(
      fields['shortnationality'] || null,
      nationality?.toLowerCase() || null,
    );

    founded_year = parseYear(fields['foundedyear'] ?? '');

    founded_month = parseMonth(fields['foundedmonth']);

    // parseInt naturally strips ordinal suffixes ('11th' -> 11, '13th' -> 13).
    const dayRaw = parseInt(fields['foundedday'] ?? '', 10);
    founded_day = Number.isFinite(dayRaw) ? dayRaw : null;

    // founders (Infobox Clan plural) takes precedence; fall back to foundedby (Clan-info).
    const rawFoundedBy = fields['founders'] || fields['foundedby'] || null;
    if (rawFoundedBy) {
      const cleaned = normalizeDash(stripWikiMarkup(rawFoundedBy)).trim();
      founded_by = cleaned.length > 0 ? cleaned : null;
    }

    // disbanded: preserve as freeform text (year, date, or note like "merged with X").
    disbanded = fields['disbanded']?.trim() || null;

    status = normalizeClanStatus(fields['status']);

    irc_channel = fields['ircchannel']?.trim().replace(/^#/, '') || null;

    // Prefer friendly network name (ircnetworkname) over host string (ircnetwork).
    irc_network = fields['ircnetworkname']?.trim() || fields['ircnetwork']?.trim() || null;

    website = fields['website']?.trim() || null;
  }

  // ---------------------------------------------------------------------------
  // Branch C: infobox_4on4team
  // ---------------------------------------------------------------------------
  else if (source_template === 'infobox_4on4team') {
    const block = extractInfoboxBlock(wikitext, 'Infobox 4on4team');
    const fields = block ? parseInfoboxFields(block) : {};

    // 'team' field holds the clan tag (e.g. "[E]", "D#", "Book").
    prefix = fields['team']?.trim() || null;

    // 'flag' is a 2-letter ISO code directly.
    const flagRaw = fields['flag']?.trim().toLowerCase() || null;
    nationality_iso = flagRaw && /^[a-z]{2}$/.test(flagRaw) ? flagRaw : null;

    // Reverse-lookup demonym from ISO code; normalize to title-case.
    if (nationality_iso) {
      const demo = isoToNationality(nationality_iso);
      if (demo) {
        nationality = demo.charAt(0).toUpperCase() + demo.slice(1).toLowerCase();
      }
    }

    const created = parseCreated(fields['created']);
    founded_year = created.year;
    founded_month = created.month;
    founded_day = null; // Infobox 4on4team carries no day.

    founded_by = parseFounderField(fields['founder']);

    disbanded = null; // Infobox 4on4team has no disbanded field.

    status = normalizeClanStatus(fields['status']);

    // Note: hyphenated key 'irc-channel'.
    irc_channel = fields['irc-channel']?.trim().replace(/^#/, '') || null;

    irc_network = null; // Infobox 4on4team does not carry ircnetwork.

    website = fields['website']?.trim() || null;
  }

  // ---------------------------------------------------------------------------
  // Branch D: bullet_prose (Information-section bullet list OR pure prose)
  // ---------------------------------------------------------------------------
  else if (source_template === 'bullet_prose') {
    const infoBody = extractSectionBody(wikitext, 'Information') ?? '';
    const lines = infoBody.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('*')) continue;
      const content = trimmed.slice(1).trim();

      // Founded: parse year/month/day from the value.
      const foundedMatch = /^\s*(?:''')?Founded:(?:''')?\s*(.*)/i.exec(content);
      if (foundedMatch) {
        const val = foundedMatch[1]!.trim();
        // Only try to extract a year; '???' maps to null naturally via parseYear.
        if (!/^\?+$/.test(val)) {
          founded_year = parseYear(val);
          // Attempt month from the string too.
          for (const [name, num] of Object.entries(MONTH_TO_NUM)) {
            if (new RegExp(`\\b${name}\\b`, 'i').test(val)) {
              founded_month = num;
              break;
            }
          }
        }
        continue;
      }

      // Nationality: [[Image:flag_uk.gif]] British
      const natMatch = /^\s*(?:''')?Nationality:(?:''')?\s*(.*)/i.exec(content);
      if (natMatch) {
        const { nationality: n, iso } = resolveBulletIso(natMatch[1]!);
        nationality = n;
        nationality_iso = iso;
        continue;
      }

      // Clan prefix: value
      const prefixMatch = /^\s*(?:''')?Clan\s+prefix:(?:''')?\s*(.*)/i.exec(content);
      if (prefixMatch) {
        prefix = stripWikiMarkup(prefixMatch[1]!).trim() || null;
        continue;
      }

      // IRC channel: [irc://host/channel #channel] ([[QuakeNet]])
      const ircMatch = /^\s*(?:''')?IRC\s+channel:(?:''')?\s*(.*)/i.exec(content);
      if (ircMatch) {
        irc_channel = extractIrcChannelFromBullet(ircMatch[1]!);
        irc_network = extractIrcNetworkFromBullet(ircMatch[1]!);
        continue;
      }

      // Website: URL or wiki-link
      const websiteMatch = /^\s*(?:''')?Website:(?:''')?\s*(.*)/i.exec(content);
      if (websiteMatch) {
        // Strip external link markup: [http://foo.com http://foo.com] -> http://foo.com
        const raw = websiteMatch[1]!.trim();
        const extLinkMatch = /^\[(\S+)\s+[^\]]*\]$/.exec(raw);
        website = extLinkMatch ? extLinkMatch[1]! : stripWikiMarkup(raw).trim() || null;
        continue;
      }
    }

    // Category fallback for founded_year: e.g. "Category:Clans started in 2001".
    // Slackers and Firing Squad carry this even without an Information section.
    if (founded_year === null) {
      for (const cat of article.categories ?? []) {
        const m = /^Category:Clans started in (\d{4})$/i.exec(cat);
        if (m) { founded_year = parseInt(m[1]!, 10); break; }
      }
    }

    // founded_by not carried consistently in bullet-list Information sections.
    // disbanded: not in the bullet pattern set.
    // status: default 'unknown' (no status field in bullet-list articles).
  }

  // ---------------------------------------------------------------------------
  // Title-fallback prefix (all branches)
  // ---------------------------------------------------------------------------
  if (prefix === null) {
    prefix = extractPrefixFromTitle(article.title);
  }

  // ---------------------------------------------------------------------------
  // Body-section extraction (always run regardless of branch)
  // ---------------------------------------------------------------------------

  const narrative_intro = extractNarrativeIntro(wikitext);

  // History section: Slackers uses "]SR[ History" as the heading.
  const history_section =
    extractSectionBody(wikitext, 'History') ??
    extractSectionBody(wikitext, ']SR[ History') ??
    '';

  // Info section: strip the infobox block from within (only prose/bullets remain).
  let info_section = extractSectionBody(wikitext, 'Information') ?? '';
  for (const name of ['Clan-info', 'Infobox Clan', 'Infobox 4on4team']) {
    if (extractInfoboxBlock(info_section, name) !== null) {
      info_section = removeFirstTemplateBlock(info_section, name);
    }
  }
  info_section = info_section.trim();

  const achievements_section = extractSectionBody(wikitext, 'Achievements') ?? '';

  // Members section: accept "Lineup" as an alias (observed in Infobox 4on4team articles).
  const members_section =
    extractSectionBody(wikitext, 'Members') ??
    extractSectionBody(wikitext, 'Lineup') ??
    '';

  const see_also_section = extractSectionBody(wikitext, 'See also') ?? '';
  // Strip clan-stub boilerplate templates ({{chtv}}, {{clan-stub}}) from the
  // External links body. These appear at the bottom of stub clan articles as
  // wiki-editorial markers rather than real outbound links; counting them as
  // "unique content" inflates has_note for clans whose only "external link" is
  // boilerplate. Tuned during T8 first-run review (operator-confirmed).
  const external_links_section = stripClanStubBoilerplate(
    extractSectionBody(wikitext, 'External links') ?? '',
  );

  // ---------------------------------------------------------------------------
  // Computed flag-input fields
  // ---------------------------------------------------------------------------

  // narrative_byte_length: combined prose + history stripped of markup.
  // Clans often put their narrative in ==History==, not just the intro paragraph.
  const combinedNarrative = stripWikiMarkup(
    narrative_intro + '\n' + history_section,
  ).trim();
  const narrative_byte_length = combinedNarrative.length;

  const has_history = stripWikiMarkup(history_section).trim().length > 100;

  // Count {{AchievementStripped| rows in the achievements section (case-insensitive).
  let achievements_count = 0;
  const achRe = /\{\{achievementstripped\|/gi;
  for (const _ of achievements_section.matchAll(achRe)) {
    achievements_count++;
  }

  return {
    slug: article.slug,
    title: article.title,
    prefix,
    nationality,
    nationality_iso,
    founded_year,
    founded_month,
    founded_day,
    founded_by,
    disbanded,
    status,
    irc_channel,
    irc_network,
    website,
    source_template,
    source_categories: article.categories ?? [],
    wiki_revision_id: article.revid,
    wiki_fetched_at: article.timestamp,
    narrative_intro,
    history_section,
    info_section,
    achievements_section,
    members_section,
    see_also_section,
    external_links_section,
    narrative_byte_length,
    has_history,
    achievements_count,
  };
}
