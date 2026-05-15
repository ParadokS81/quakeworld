# KTX / MVDSV Server-Doc Landscape -- Investigation Output

**Status:** IN PROGRESS. Spec: `docs/superpowers/specs/2026-05-15-ktx-mvdsv-doc-landscape-investigation-design.md`.

This folder is the assembled evidence map. Read order: this README (the picture) -> `gap-findings.md` (the verdict) -> individual probes (the evidence).

## Nav index

- `probe-0-l1-baseline.md` -- authoritative domain roster + current L1 per-domain counts/provenance (the denominator)
- `probe-1-ktx-in-repo.md` -- research/repos/ktx
- `probe-2-mvdsv-in-repo.md` -- research/repos/mvdsv
- `probe-3-nquake-distfiles.md` -- research/repos/nquake-distfiles
- `probe-4-wiki-corpus.md` -- live wiki + local QWiki SQL dump
- `probe-5-dangling-threads.md` -- link-rot, GitHub wiki tabs, runtime self-docs
- `coverage.ndjson` -- machine-readable (engine,domain,source) records
- `gap-findings.md` -- Phase-2 synthesis + verdict on the success criterion

## Assembled coverage

Best admin-facing prose source per rostered domain. "Best coverage" = highest
single-source N vs probe-0 M; unions/alternatives in the notes column. The
~100% structural domains (info_keys / log_templates / match_events / protocol /
qc_builtins / gameplay_*) are already complete in L1 from structured extraction
-- the open question for them is whether prose is even needed, not where to find it.

### KTX (probe-0 roster: 8 domains)

| domain | M | best source | best coverage | format | structure quality | extractability | other sources / notes |
|---|---|---|---|---|---|---|---|
| cvars | 260 | nQuake `sv-configs/ktx/ktx.cfg` | 95 (37%) | shipped-config // comment | high -- enum/bitmask parseable | mechanical | in-repo ktx.cfg 90; union w/ world.c = **136/260 (52%)**; nQuake adds 21 unique among the NULLs; port_template 7; wiki ~1. **124 NULL** incl 38 `k_fbskill_*` bot cvars undocumented everywhere |
| commands | 358 | `src/commands.c` CD_ table | 311 (87%) | structured field (CD_ macros) | free prose (short labels) | mechanical (already in L1) | wiki Race ~12; 47 `CD_NODESC` have no in-repo source |
| info_keys | 7 | L1 source_inline (SetUserInfo sites) | 7 (100%) | structured field | n/a (star-keys) | mechanical (already in L1) | no external prose surface |
| log_templates | 1195 | L1 structural only (printf fmt-string) | 1195 (100%) | structured field | n/a | mechanical (already in L1) | no prose source; ktxlog XSD covers match_events only |
| match_events | 7 | `resources/extralog/ktxlog_0.1.xsd` -> L1 synthesized | 7 (100%) | structured field (XSD types) | enum/type recoverable, no prose semantics | mechanical (already in L1) | none |
| modes | 27¹ | in-repo `configs/usermodes/` presets | 13 (48%) | shipped-config | low (most dirs empty/near-empty) | LLM-assisted | live wiki 12/27 substantive = best **prose** (player-facing, not cvar-level); nQuake `modes/` 4. ¹+317 `mode_default` overlay rows structural-only in L1, **no prose anywhere** |
| gameplay_tables | 83 | L1 structural only (X-macro/init arrays) | 83 (100% struct / 0% prose) | structured field | structured props, no prose | mechanical (already in L1) | wiki/nQuake/man all silent -- tier-2 (may not need prose) |
| gameplay_taxonomies | 32 | L1 structural only (enum/X-macro) | 32 (100% struct / 0% prose) | structured field | structured taxonomy, no prose | mechanical (already in L1) | silent everywhere -- tier-2 (may not need prose) |

### MVDSV (probe-0 roster: 7 domains)

| domain | M | best source | best coverage | format | structure quality | extractability | other sources / notes |
|---|---|---|---|---|---|---|---|
| cvars | 183 | ezquake.com `/docs/settings/server.html` | <=124 (est.; overlap vs M=183 unquantified) -- **quantified floor: nQuake mvdsv.cfg 63/183 (34%)** | structured field (type+default+prose) | high -- type/default/enum | mechanical | source_inline 35; nQuake +10 unique; wiki ~2. **148 NULL in L1 today** (87 `sv_*`). ezquake-docs overlap is the top open quantification thread |
| commands | 108 | source_inline via AST banner harvest | 28 (26%) -- **blocked by `load-commands.ts` loader bug (verified)** | structured field (Doom banners, already in AST) | free prose (1-3 sentences) | mechanical (one-line loader fix, no re-extract) | none -- other 80 have no prose source anywhere |
| cmdline | 11 | `docs/man/man6/mvdsv.6` | 9 (82%) | man page (roff .TP) | free prose; `-progtype` inline enum | LLM-assisted | none; +8 more man-page flags not yet in L1 (extractor `server.h` macro gap) |
| info_keys | 45 | L1 source_inline | 45 (100%) | structured field | n/a; nQuake `fpd` bitmask parseable | mechanical (already in L1) | nQuake mvdsv.cfg 3 (fpd / pm_ktjump / maxfps) |
| log_templates | 691 | L1 structural only (printf fmt-string) | 691 (100%) | structured field | n/a | mechanical (already in L1) | none; AST 692, 1 deduped at load |
| protocol | 105 | L1 source_inline (`protocol.h` comments) | 105 (100%) | structured field | free prose / signature | mechanical (already in L1) | none; wiki silent |
| qc_builtins | 93 | L1 source_inline (QC signature) | 93 (100%) | structured field (QC sig) | type-structured signature, no prose | mechanical (already in L1) | none; AST 97, 4 deduped at load |

### Cross-source conflicts (probe-3; verdict detail in `gap-findings.md`)

nQuake `sv-configs/ktx` vs in-repo `example-configs/ktx` are drifted, not
identical. Concrete value conflicts: `sv_maxrate` (50000 vs 500000),
`k_exclusive` (0 vs 1), `k_exttime` (3 vs 5), `maxclients` (32 vs 8),
`maxspectators` (12 vs 4), `fpd` (206 vs 222 -- different security posture),
`sv_reliable_sound` (1 vs 0). Polarity-label drift: `k_noframechecks` comment
inverts meaning between the two. `sv_antilag` is in-repo-only -- nQuake's
omission is an intentional operational choice, not missing data. Any merged L1
spine must treat config provenance as a first-class field, not collapse sources.

## Verdict (filled in Task 6)

_The one-line answer to the spec's success criterion lands here, pointing at `gap-findings.md`._
