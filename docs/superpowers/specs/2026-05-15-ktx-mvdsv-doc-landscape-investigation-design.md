# KTX / MVDSV Server-Documentation Landscape Investigation -- Design

**Date:** 2026-05-15
**Status:** Design (brainstorming output). Pending user review, then writing-plans.
**Type:** Investigation / evidence-gathering pass. NOT a build.

## Problem

ezQuake is "knowable" because Layer 1 extracts its structured help-JSON, which
feeds the slipgate Config Viewer and the Oracle. KTX and MVDSV (the server side:
the mod plus the engine) have no equivalent. The Oracle's KTX L1 extraction
pulled cvar descriptions from `world.c` source comments -- the worst available
surface (~32% coverage, developer-flavored rationale, not user docs). Recon on
2026-05-15 showed the real admin-facing documentation does exist but is
fragmented across the distribution layer (shipped commented configs, the MVDSV
man page, nQuake distfiles, the wiki, tribal knowledge), and the one canonical
"complete KTX config guide" the wiki points to is link-rotted.

Before committing to build a KTX/MVDSV server-config knowledge base in Layer 1
(which would feed Oracle answers, the docketed KTX game-mode concept notes, and
an eventual slipgate graphical server-config builder), we need evidence: how big is
the gap, where is the documentation hiding, why is it not in the repo, and does
the gathered evidence cohere into a foundation solid enough to build on.

## Success criterion

The output must answer one question:

> Does the evidence across all sources cohere into a foundation solid enough to
> build a KTX/MVDSV server-config knowledge base in Layer 1 -- covering the full
> per-engine L1 domain roster each extractor emits (enumerated in Scope below)
> -- and if so, what is the shape, size, and source-map of that foundation; if
> not, where exactly does it fall short?

Game-mode concept notes (the docketed 2026-05-09 arc) and the slipgate
server-config GUI are downstream of this foundation and out of scope here. The
findings doc must state whether the foundation is solid enough to anchor them,
but does not author them.

## Approach

Two-phase: cheap quantified inventory, then informed gap synthesis. Phase 1 fans
out as parallel read-only probes against a fixed report schema; Phase 2 is
single-synthesizer.

Overlap between sources is expected and acceptable. The goal is evidence density
plus corroboration/conflict detection, not a deduplicated catalogue.

## Scope: domains measured

The authoritative domain roster is whatever each engine's extractor actually
emits -- the `scripts/extractors/<engine>/_handler_*.py` set -- NOT a
hand-picked subset. Verified 2026-05-15:

- **KTX (8 domains):** cvars, commands, info_keys, log_templates, match_events,
  modes, gameplay_tables, gameplay_taxonomies.
- **MVDSV (7 domains):** cvars, commands, info_keys, cmdline (command-line
  params), log_templates, protocol, qc_builtins.

For reference ezQuake emits ~10 entity types (cvar, command, macro,
cmdline_param, keyname, hud_element, ruleset, token_primitive, flag_bit,
asset_category) per `docs/entity-types.md`. KTX/MVDSV differ because they are
the server side: no client macros/HUDs, but they add server-mod domains.

`info_keys` has exactly THREE sub-domains, verified in the info_keys handlers:
**userinfo** (per-client; set via the `setinfo` command), **serverinfo**
(server-wide, public), **localinfo** (server-side, private). No hidden fourth.

For the findings synthesis the domains split into two tiers:

- **Admin-configurable foundation** -- what a server admin actually sets and
  what a future GUI / Oracle answer must explain: `cvars`, `commands`,
  `info_keys`, `cmdline`, plus `modes` (KTX). Doc coverage is measured hardest
  here.
- **Structurally-derived domains** -- already extracted from source structure,
  not hand-configured: `log_templates`, `match_events`, `gameplay_tables`,
  `gameplay_taxonomies`, `protocol`, `qc_builtins`. The inventory still records
  their coverage, but the findings doc judges whether they need admin-facing
  prose at all or are self-sufficient as structured L1 rows.

Plus two synthesis layers the findings doc characterizes (not L1 entities; they
are the cohesion test):

- **mode-semantics** -- the KTX mode set (operator estimate ~27; the exact
  count and roster is a P1 deliverable): which cvars each flips and why
  (foundation for the concept-note arc).
- **connective / admin-workflow** -- how settings interact, the setup flow (the
  genuinely thin layer).

## Source decomposition (Phase 1 probes)

Each probe is a read-only subagent producing a report against this FIXED SCHEMA
(per source, per entity-type where applicable):

- Source path/URL
- Domains covered (any of the Scope roster: cvars / commands / info_keys /
  cmdline / modes / log_templates / match_events / gameplay_tables /
  gameplay_taxonomies / protocol / qc_builtins / freeform prose)
- Coverage count: "N of M KTX cvars carry an admin-facing description here"
  (absolute + percent), with the denominator stated (e.g. vs the L1-registered
  KTX cvar set from the cross-cut baseline)
- Format (structured field / shipped-config `//` comment / man page / wiki prose
  / runtime output)
- Structure quality: is enum/range/type recoverable
  (e.g. `0 = off, 1 = on, 2 = liquid` -> parseable into a dropdown)
- Overlap / conflict with other sources (e.g. repo `ktx.cfg` vs nQuake
  `ktx.cfg` drift)
- Extractability for a future L1 spine (mechanical / LLM-assisted / hand-curate)

Probes:

- **P1 -- KTX in-repo** (`research/repos/ktx`): `world.c` RegisterCvar* comment
  coverage; shipped `resources/example-configs/ktx/{ktx,mvdsv,server}.cfg`
  comment coverage; the `CD_*` command-description table in `commands.c`;
  `configs/usermodes/*.cfg` (enumerate the modes and what each sets);
  enum/range prose density in `ktx.cfg`.
- **P2 -- MVDSV in-repo** (`research/repos/mvdsv`):
  `docs/man/man6/mvdsv.6` (cvars/commands documented vs the MVDSV L1 set),
  README, any sv_* coverage. MVDSV is already in L1 -- measure the delta.
- **P3 -- nQuake distfiles**
  (`research/repos/nquake-distfiles/sv-configs/` and siblings):
  `SETUP_FFA_CTF.txt` plus any other prose, the `modes/DONT EDIT` canonical
  mode defs, the installer's interactive prompt/script logic (what it asks and
  sets), drift vs the repo example-configs.
- **P4 -- Wiki corpus**: live `How_to_server`, `KTX`, and linked mode/setting
  pages (which exist / redlink / stale); AND the local QWiki SQL dump at
  `apps/qwiki-sandbox/dumps/` -- query for ALL KTX/MVDSV/server-config/mode/
  setinfo pages (the dump may hold more than live nav exposes). Use the Jina
  reader for live pages (WebFetch fails on JS-rendered MediaWiki).
- **P5 -- Dangling threads**: the rotted wiki -> `github.com/qwassoc/mvdsv`
  "complete KTX guide" link (is there a `qwassoc` org / a lost KTX wiki / a KTX
  or MVDSV GitHub *wiki tab* distinct from the repo?); ezquake.com/docs for any
  server/client parity; runtime self-documentation surfaces (`commands`,
  `serverinfo`, `cmdlist`, in-game `k_*` help) -- characterize what they expose;
  execution is optional.
- **Cross-cut -- Oracle L1 baseline**: first, from each engine's
  `_handler_*.py` set, enumerate the authoritative domain roster -- the
  extraction script is the source of truth for "what domains exist", not this
  spec's snapshot. Then query Postgres for current KTX + MVDSV per-domain entity
  counts and description provenance (source_inline vs synthesized vs help_json).
  Every coverage number in the inventory is expressed as a delta against what L1
  already has, not from zero.

Coverage focus: P1-P5 measure the admin-configurable domains hardest (cvars /
commands / info_keys / cmdline / modes), since that is where scattered prose
documentation actually lives. The structurally-derived domains (log_templates /
match_events / gameplay_* / protocol / qc_builtins) are swept opportunistically
-- whichever probe's source touches them records what it finds -- and their
primary assessment is the cross-cut L1 baseline plus the findings doc's judgment
on whether the structured rows are self-sufficient without prose.

## Output artifacts

1. `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape-inventory.md`
   -- structural inventory: every source, the fixed-schema reports assembled,
   hard coverage tables per entity type per engine.
2. `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-gap-findings.md`
   -- synthesis: gap size per foundation layer, source overlaps/conflicts, the
   "why it is not in the repo" narrative, a prioritized thread list, and the
   explicit verdict on the success criterion (is the foundation solid enough;
   recommended shape of an L1 server-config KB arc; what remains for a later
   community-outreach pass).

Both docs are self-pointed-to from the HANDOVER docket and cross-reference the
existing KTX game-mode concept-note parking doc.

## Sizing and non-goals

- 1-2 sessions. Phase 1 parallel dispatch plus inventory assembly is ~1 session;
  Phase 2 synthesis is ~0.5-1 session. No human dependency.
- Non-goals: authoring documentation; building or altering the L1 dataset or
  schema; designing the slipgate GUI; community outreach. Each is downstream and
  named in the findings doc's recommendations.

## Relationship to existing docket

- Feeds the deferred structured server-config spine (the dataset the operator
  wants eventually for slipgate plus Oracle, modeled on the ezQuake
  snapshot.json -> Config Viewer precedent).
- Prerequisite evidence for the docketed KTX game-mode L3 concept notes
  (`docs/superpowers/parking/2026-05-09-ktx-game-mode-l3-concept-notes.md`):
  confirms whether the L1 foundation is solid enough to anchor them.
- Advances "Phase 2d-2h: remaining QW knowledge rollout" (KTX is the last engine
  port; this characterizes its true documentation surface).
- The community-outreach tier (server admins: ciscon / meag / etc.) is the named
  follow-on, informed by this pass.
