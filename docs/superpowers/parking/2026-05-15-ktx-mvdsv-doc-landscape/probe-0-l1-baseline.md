# Probe-0: L1 baseline -- the denominator

> Authoritative domain roster + current L1 per-domain registered counts (M) and
> description provenance. Every coverage count in probes 1-5 is `N of M` where M
> comes from the "Denominators to cite" list at the bottom of this file.
>
> Produced inline by the orchestrator (not a subagent): probes 1-5 depend on
> these denominators and the synthesis must hold them in context.

## (a) Handler roster per engine + drift vs spec snapshot

Enumerated from `apps/qw-oracle/scripts/extractors/{ktx,mvdsv}/_handler_*.py`:

- **KTX (8):** commands, cvars, gameplay_tables, gameplay_taxonomies, info_keys, log_templates, match_events, modes
- **MVDSV (7):** cmdline, commands, cvars, info_keys, log_templates, protocol, qc_builtins

**Drift vs spec snapshot (KTX 8 / MVDSV 7): NONE.** Live handler set matches the
spec exactly. Roster is the source of truth.

## Handler -> storage mapping (explicit)

Five KTX handlers map to `entities.type` (singular). All 7 MVDSV handlers map to
`entities.type`. **Three KTX handlers do NOT live in `entities`** -- they are
extracted into the dedicated gameplay tables (`gameplay_mechanics`,
`gameplay_entity_defs`), which have no `description_origin` column (provenance is
tracked via `source_ref` + `notes` + `props_json`, i.e. structurally extracted,
not prose-described).

| engine | handler | storage | discriminator |
|---|---|---|---|
| ktx | commands | entities | type=command |
| ktx | cvars | entities | type=cvar |
| ktx | info_keys | entities | type=info_key |
| ktx | log_templates | entities | type=log_template |
| ktx | match_events | entities | type=match_event |
| ktx | modes | gameplay_mechanics | kind IN (game_mode, mode_default), src=ktx |
| ktx | gameplay_tables | gameplay_mechanics + gameplay_entity_defs | score_system, drop_item, loc_macro, teamplay_message, + monster |
| ktx | gameplay_taxonomies | gameplay_mechanics | kind IN (election_type, death_rule), src=ktx |
| mvdsv | cmdline | entities | type=cmdline_param |
| mvdsv | commands | entities | type=command |
| mvdsv | cvars | entities | type=cvar |
| mvdsv | info_keys | entities | type=info_key |
| mvdsv | log_templates | entities | type=log_template |
| mvdsv | protocol | entities | type=protocol_message |
| mvdsv | qc_builtins | entities | type=qc_builtin |

**Deviation from plan Task 2 Step 5 ("record M=0 and flag it" for handlers with
no matching `entities.type`):** the three KTX gameplay handlers have a real,
non-zero registered set in `gameplay_mechanics`/`gameplay_entity_defs`. Recording
M=0 would be factually wrong and would give downstream probes a broken
denominator. Per the plan's own rule ("if the live set differs, the live set
wins and you note the drift"), the real denominators from the gameplay tables
are used and the storage divergence is flagged here.

## (b) Registered counts M + description provenance

`entities` domains -- query (verified against live `\d entities`; columns
`project, type, description_origin` confirmed present, migration 012):

```sql
SELECT project, type, count(*) AS m
FROM entities WHERE project IN ('ktx','mvdsv') GROUP BY project, type;

SELECT project, type, COALESCE(description_origin,'(NULL)') AS origin, count(*)
FROM entities WHERE project IN ('ktx','mvdsv')
GROUP BY project, type, description_origin;
```

| engine | domain | M | help_json | source_inline | synthesized | NULL | % described |
|---|---|---|---|---|---|---|---|
| ktx | commands | 358 | 0 | 311 | 0 | 47 | 87% |
| ktx | cvars | 260 | 0 | 68 | 0 | 192 | **26%** |
| ktx | info_keys | 7 | 0 | 7 | 0 | 0 | 100% |
| ktx | log_templates | 1195 | 0 | 1195 | 0 | 0 | 100% |
| ktx | match_events | 7 | 0 | 0 | 7 | 0 | 100% (synth) |
| mvdsv | cmdline | 11 | 0 | 0 | 0 | 11 | **0%** |
| mvdsv | commands | 108 | 0 | 0 | 0 | 108 | **0%** |
| mvdsv | cvars | 183 | 0 | 35 | 0 | 148 | **19%** |
| mvdsv | info_keys | 45 | 0 | 45 | 0 | 0 | 100% |
| mvdsv | log_templates | 691 | 0 | 691 | 0 | 0 | 100% |
| mvdsv | protocol | 105 | 0 | 105 | 0 | 0 | 100% |
| mvdsv | qc_builtins | 93 | 0 | 93 | 0 | 0 | 100% |

No `help_json` provenance exists for KTX/MVDSV (help_json is an ezQuake-only
artifact). Origin values observed: `source_inline`, `synthesized`, NULL.

KTX gameplay domains -- query against `gameplay_mechanics` /
`gameplay_entity_defs` (no `description_origin`; structurally extracted, every
row carries `source_ref` + structured `props_json`):

| engine | domain | M | composition |
|---|---|---|---|
| ktx | modes | 344 | game_mode catalog 27 + mode_default cvar-overlay 317 |
| ktx | gameplay_tables | 83 | score_system 3 + drop_item 31 + loc_macro 15 + teamplay_message 21 + monster 13 (entity_defs) |
| ktx | gameplay_taxonomies | 32 | election_type 5 + death_rule 27 |

Cross-check: gameplay_mechanics(ktx)=446 + gameplay_entity_defs(ktx,monster)=13
= 459 = modes 344 + tables 83 + taxonomies 32. Exact.

## Gap signals visible from provenance (context for synthesis + probes)

- **KTX cvars: 192 of 260 (74%) have NO description at all (NULL).** This is the
  central gap the investigation is built around. Probes 1/3 (ktx.cfg shipped
  configs, nQuake sv-configs) are the primary hunt for those 192.
- **MVDSV cvars: 148 of 183 (81%) NULL.** Secondary gap; probe-2 (man page) +
  probe-1/3 cross-coverage are the hunt.
- **MVDSV commands (108) and cmdline (11): 100% NULL.** Entirely undescribed in
  L1 today -- worst-covered admin-configurable domains.
- **KTX commands: 311/358 (87%) source_inline** -- already well covered.
- **info_keys / log_templates / protocol / qc_builtins / match_events: ~100%**
  already described (structurally-derived / internal; not the gap).
- KTX gameplay domains (modes/tables/taxonomies) are structurally complete with
  props but carry no admin-prose `description` -- the question for them is
  whether prose is even needed (synthesis tier-2 question).

## (c) Denominators to cite (probes 1-5 read THIS list)

Every coverage count in a probe report is `N of M` using the M below.

- ktx cvars M=260
- ktx commands M=358
- ktx info_keys M=7
- ktx log_templates M=1195
- ktx match_events M=7
- ktx modes M=27 (game_mode catalog; +317 mode_default cvar-overlay rows -- use 27 for "how many modes", 317 for per-mode setting granularity)
- ktx gameplay_tables M=83 (score_system 3 / drop_item 31 / loc_macro 15 / teamplay_message 21 / monster 13)
- ktx gameplay_taxonomies M=32 (election_type 5 / death_rule 27)
- mvdsv cvars M=183
- mvdsv commands M=108
- mvdsv cmdline M=11
- mvdsv info_keys M=45
- mvdsv log_templates M=691
- mvdsv protocol M=105
- mvdsv qc_builtins M=93
