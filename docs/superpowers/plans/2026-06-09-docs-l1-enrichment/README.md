# docs-l1-enrichment -- arc plan (thin index, backfilled 2026-10-10)

**Spec:** `docs/superpowers/parking/2026-06-09-docs-l1-enrichment.md`. **Decisions record:** `taxonomy.md` (locked taxonomy + conventions, operator approved 2026-06-09). The arc had no README of its own; this one lists its files so the arc board can read the Status block below. Nothing else in the folder changed.

**Goal:** Make Layer 1 docs-ready for six codebases before docs.quake.world: categorize every MVDSV, QTV and QWFWD cvar and command into the 14 locked categories, give the two undescribed MVDSV antilag cvars source-grounded descriptions, and fill QWCL to 100% (descriptions borrowed from ezQuake where names match, light one-liners synthesized where they do not, plus the 72 command-line params). The durable artifact is the `category_inferred` column and the descriptions in Postgres; the SQL files here are the reproducible apply scripts, run in number order.

| File | What it is |
|---|---|
| `taxonomy.md` | Locked taxonomy, conventions and the cold-verified starting state (the decisions record) |
| `01-mvdsv-antilag-synth.sql` | Synthesized descriptions for the two undescribed MVDSV antilag cvars |
| `02-mvdsv-categories.sql` | MVDSV categorize: 291 entities (183 cvars + 108 commands) into the 14 categories |
| `03-qtv-qwfwd-categories.sql` | QTV (52) + QWFWD (42) categorize, written to every version row |
| `04-qwcl-borrow.sql` | QWCL borrow: ~263 descriptions copied from name-matching ezQuake entities |
| `05-qwcl-synth.sql` | QWCL light-synth: 45 one-line descriptions for QWCL-only entities + residual categorize |
| `06-qwcl-cmdline.sql` | QWCL command-line params: 20 borrowed + 52 synthesized (operator opt-in 2026-06-09) |

## Status (backfilled 2026-10-10)

- **Outcome:** Make Layer 1 docs-ready for six codebases: categorize MVDSV/QTV/QWFWD, describe the two MVDSV antilag cvars, fill QWCL to 100% (borrow + synth + cmdline); shipped 2026-06-09 in one day.
- **Phase:** closed 2026-06-09 -- shipped
- **Evidence:** last commit 2026-06-09 'docs-l1-enrichment SHIPPED -- HANDOVER + spec status'; taxonomy.md front matter reads 'status: shipped 2026-06-09'; the docs-quake-world README names it as its shipped precursor; no work-list row.
