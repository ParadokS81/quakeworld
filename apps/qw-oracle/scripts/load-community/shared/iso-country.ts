// apps/qw-oracle/scripts/load-community/shared/iso-country.ts
//
// Nationality string -> 2-letter ISO code lookup, plus country name -> demonym table.
// Pure: no IO, no DB.

export const NATIONALITY_TO_ISO: Record<string, string> = {
  finnish: 'fi', swedish: 'se', danish: 'dk', norwegian: 'no', dutch: 'nl',
  english: 'gb', british: 'gb', 'united kingdom': 'gb', german: 'de',
  polish: 'pl', russian: 'ru', american: 'us', canadian: 'ca', spanish: 'es',
  portuguese: 'pt', italian: 'it', french: 'fr', czech: 'cz', slovak: 'sk',
  hungarian: 'hu', romanian: 'ro', bulgarian: 'bg', ukrainian: 'ua',
  austrian: 'at', swiss: 'ch', belgian: 'be', irish: 'ie', scottish: 'gb',
  welsh: 'gb', icelandic: 'is', estonian: 'ee', latvian: 'lv', lithuanian: 'lt',
  australian: 'au', 'new zealander': 'nz', japanese: 'jp', chinese: 'cn',
  korean: 'kr', brazilian: 'br', argentine: 'ar', mexican: 'mx',
  croatian: 'hr', serbian: 'rs', slovenian: 'si', greek: 'gr',
  turkish: 'tr', israeli: 'il',
};

// Build reverse lookup: ISO -> first demonym that maps to it (alphabetical for determinism).
export const ISO_TO_NATIONALITY: Record<string, string> = {};
for (const [demonym, iso] of Object.entries(NATIONALITY_TO_ISO)) {
  if (!(iso in ISO_TO_NATIONALITY)) {
    ISO_TO_NATIONALITY[iso] = demonym;
  }
}

// Country name -> demonym. Milton uses country=Finland; this maps it to the demonym Finnish
// so the category lookup can then resolve 'Finnish' -> 'fi'.
export const COUNTRY_TO_NATIONALITY: Record<string, string> = {
  finland: 'finnish', sweden: 'swedish', denmark: 'danish', norway: 'norwegian',
  netherlands: 'dutch', 'united kingdom': 'british', england: 'english',
  germany: 'german', poland: 'polish', russia: 'russian', 'united states': 'american',
  usa: 'american', canada: 'canadian', spain: 'spanish', portugal: 'portuguese',
  italy: 'italian', france: 'french', 'czech republic': 'czech', czechia: 'czech',
  slovakia: 'slovak', hungary: 'hungarian', romania: 'romanian', bulgaria: 'bulgarian',
  ukraine: 'ukrainian', austria: 'austrian', switzerland: 'swiss', belgium: 'belgian',
  ireland: 'irish', iceland: 'icelandic', estonia: 'estonian', latvia: 'latvian',
  lithuania: 'lithuanian', australia: 'australian', 'new zealand': 'new zealander',
  japan: 'japanese', china: 'chinese', korea: 'korean', brazil: 'brazilian',
  argentina: 'argentine', mexico: 'mexican', croatia: 'croatian', serbia: 'serbian',
  slovenia: 'slovenian', greece: 'greek', turkey: 'turkish', israel: 'israeli',
};

/** Resolve a demonym to its 2-letter ISO code. Case-insensitive. */
export function nationalityToIso(s: string): string | null {
  return NATIONALITY_TO_ISO[s.toLowerCase()] ?? null;
}

/** Resolve a 2-letter ISO code to its primary demonym. Case-insensitive. */
export function isoToNationality(iso: string): string | null {
  return ISO_TO_NATIONALITY[iso.toLowerCase()] ?? null;
}

/** Resolve a country name to its demonym. Case-insensitive. */
export function countryToNationality(country: string): string | null {
  return COUNTRY_TO_NATIONALITY[country.toLowerCase()] ?? null;
}
