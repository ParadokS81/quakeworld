# Probe report: <SOURCE CLASS NAME>

> Fixed schema. Every field is mandatory. One block per (source, domain) pair.
> Coverage denominators come from `probe-0-l1-baseline.md` -- read it first.

## Source: <exact path or URL>

### Domain: <one of: cvars | commands | info_keys | cmdline | modes | log_templates | match_events | gameplay_tables | gameplay_taxonomies | protocol | qc_builtins | freeform_prose>

- **Coverage count:** <N> of <M> <domain> carry an admin-facing description here (<P>%). Denominator M source: probe-0 (`<engine>` `<domain>` registered set = <M>).
- **Format:** <structured field | shipped-config // comment | man page | wiki prose | runtime output | other:_____>
- **Structure quality:** <is enum/range/type recoverable? e.g. "0=off,1=on,2=liquid -> parseable into dropdown" | "free prose only" | "n/a">
- **Overlap / conflict:** <which other source duplicates or contradicts this; name the file/page and the specific drift, or "none observed">
- **Extractability for a future L1 spine:** <mechanical | LLM-assisted | hand-curate> -- <one-line why>

<repeat the Domain block for every domain this source documents>

## Probe notes

<free text: anything that does not fit the schema but the synthesis needs -- dead ends, surprises, structurally-derived domains touched opportunistically, why a source was thinner/richer than expected>
