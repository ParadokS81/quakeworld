# Layer 3 - Curated concept notes

Hand-written markdown that cross-links Layer 1 (facts) and Layer 2 (claims) into human-level explanations. Each file is one concept. See `_schema.md` for the required frontmatter shape.

Concept notes are the glue layer. Their job is to say the thing the raw tables cannot: "these two rows in different projects are actually the same feature," "this cvar is a historical artifact from 2005 and you should not touch it," "this command only matters during match mode."

Authoring rules:

1. One concept per file. Filename matches the canonical id suffix (e.g. `ktx_matchstart_injection.md` for `concept:ktx_matchstart_injection`).
2. Frontmatter must validate against `_schema.md`.
3. Every `references` entry must be a real canonical id that exists in the database (or is a link to another concept file). Run `node scripts/verify-concepts.mjs` after editing.
4. Keep the body focused. 200-600 words is the typical range. Longer means you probably have two concepts mashed into one.
