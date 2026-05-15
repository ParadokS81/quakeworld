# KTX / MVDSV Server-Doc Landscape -- Gap Findings + Verdict

> Phase-2 synthesis over probe-0..5 + `coverage.ndjson`. Read `README.md` first
> (the picture); this is the verdict and the so-what.

## Verdict

**Yes -- with caveats.** The evidence coheres into a foundation solid enough to
build an L1 KTX/MVDSV server-config knowledge base, because the only tier that
matters for that KB -- the admin-configurable tier -- has a mostly-mechanical,
structured extraction path for the documented majority (KTX cvars ~60% from
shipped configs with parseable enum tables; KTX commands already 87% in L1;
MVDSV cmdline 82% from the man page; MVDSV commands 26% one loader-line away),
and the structurally-derived tier is already 100% complete in L1 and provably
needs no prose. The caveats are bounded and named, not diffuse: (1) one
must-quantify-first thread (ezquake.com/docs server.html vs MVDSV M=183) gates
MVDSV-cvar sizing and is the single largest swing factor; (2) a residual ~40%
KTX-cvar and ~74% MVDSV-command gap is genuine -- no prose source exists
anywhere -- and needs synthesis/community input, not extraction; (3) provenance
must be a first-class field because the two richest cvar surfaces (in-repo vs
nQuake configs) are drifted with concrete value conflicts and one intentional
omission, so a naive merge would silently corrupt the KB. This is not a "No"
(the majority is mechanically extractable and structured) and not an unqualified
"Yes" (the ezquake.com quantification gates the biggest single domain and two
real research gaps remain).

## Gap size per domain tier

### Admin-configurable tier (the KB-relevant tier)

| domain | M | documented somewhere | genuinely missing | shape |
|---|---|---|---|---|
| KTX cvars | 260 | ~157 (60%): in-repo union 136 + 21 nQuake-unique | ~103 (40%), incl. 38 `k_fbskill_*` bot cvars documented NOWHERE | mechanical from shipped-config; residue needs synthesis |
| KTX commands | 358 | 311 (87%) already in L1 (CD_ macros) | 47 `CD_NODESC` -- no source anywhere | near-done; residue genuine |
| KTX info_keys | 7 | 7 (100%) in L1 | 0 | done |
| KTX modes | 27 | catalog 27/27 structural in L1; prose 13/27 usermodes + 12/27 wiki | mode *purpose* prose partial; +317 mode_default structural-only (no prose) | structural backbone solid; prose = L3 concept-note work |
| MVDSV cvars | 183 | floor 34% (nQuake 63) + 35 L1; **ezquake.com 124 unquantified** | 148 NULL today; true gap unknown until thread #1 | swing domain -- gated on #1 |
| MVDSV commands | 108 | 28 (26%) in AST, load-blocked (verified) | 80 (74%) -- no prose source anywhere | 26% is a loader fix; 74% genuine gap |
| MVDSV cmdline | 11 | 9 (82%) man page | 2 Windows-only flags (in source, not man) | near-done, mechanical/LLM import |

The admin-configurable tier is **solid for the documented majority and the
structural backbone**; the genuine missing slice is concentrated and named
(KTX bot cvars, MVDSV commands tail), not spread thin across everything.

### Structurally-derived tier (do they need prose at all?)

KTX log_templates (1195), match_events (7), gameplay_tables (83),
gameplay_taxonomies (32); MVDSV log_templates (691), protocol (105),
qc_builtins (93), info_keys (45) -- all ~100% structurally complete in L1, and
**no external prose source exists for any of them in any probe**. This is not a
gap: log_templates are machine output formats, protocol/qc_builtins are
developer-facing (the signature IS the doc), gameplay_* are structured props.
**They do not need admin prose.** For a server-config KB they are done by
construction. The only nuance: KTX `mode_default` (317 cvar-overlay rows) is
structurally complete but has zero prose -- acceptable, since "what mode X sets"
is answerable from the structured rows; only "why" needs prose (L3, not L1).

## Source overlaps and conflicts

The two richest KTX-cvar surfaces -- in-repo `example-configs/ktx/ktx.cfg` and
nQuake `sv-configs/ktx/ktx.cfg` -- are **drifted, not identical** (probe-3): 73
cvars shared, 22 nQuake-only, 19 in-repo-only. Concrete value conflicts:
`sv_maxrate` 50000/500000, `k_exclusive` 0/1, `k_exttime` 3/5, `k_vp_admin`
75/51, `maxclients` 32/8, `maxspectators` 12/4, `fpd` 206/222 (different
security posture, not an error), `sv_reliable_sound` 1/0. Polarity-label drift:
`k_noframechecks` comment inverts meaning between the two files. `sv_antilag` is
in-repo-only -- nQuake's omission is an **intentional operational choice**, not
missing data. Implication for the KB: provenance must be a first-class column
and conflicts must NOT be auto-resolved; the merge layer needs a source-priority
policy and a conflict-surfacing path, or it will encode one distribution's
opinion as universal fact.

## Why it is not in the repo

Four compounding reasons, all grounded in probe evidence:

1. **Distribution-layer split (by design).** MVDSV's own repo is build/install
   only -- probe-2 confirms "configuration documentation lives in community
   resources, not in the repo itself." The richest cvar prose lives in nQuake
   distfiles (the dominant installer) and shipped example-configs, not source.
2. **Tribal / community knowledge.** Admin know-how lives in nQuakesv configs,
   QWiki `How_to_server`, and operator practice (the dmm4 per-map override
   convention, the matchless workflow). The wiki documents player-facing modes,
   not admin cvars -- only ~1/260 KTX cvars appear in the entire wiki corpus.
3. **Installer opacity.** The real nQuake interactive installer (admin email,
   rcon password, the "settings that matter at install time") lives in a
   separate uncloned repo; only addon sub-installers are visible. That knowledge
   is encoded in installer logic, never written as docs.
4. **Link-rot / dead pointers.** The KTX wiki "complete guide" link is a dead
   301 to `qwassoc/mvdsv` (no content ever existed there); both GitHub wiki tabs
   are empty; the QWiki MVDSV page is a 3-sentence 2022 stub; the Antilag wiki
   page is mis-scoped to ezQuake client cvars. The community's own pointers to
   KTX config docs lead nowhere -- which is precisely why this knowledge never
   consolidated into one place.

## Prioritized thread list

| # | Thread | Effort | Unblocks |
|---|---|---|---|
| 1 | **Quantify ezquake.com/docs/settings/server.html vs MVDSV M=183** (fetch + cvar-name cross-match) | S (~1-2h) | MVDSV-cvar arc sizing -- the single biggest unknown; decides 34% slog vs 70%+ mechanical. **Do first.** |
| 2 | **Fix `load-commands.ts`** (`entry.ast?.description` mapping; verified root cause) | XS (one line + reload) | 28/108 MVDSV commands into L1 immediately, free, no re-extract |
| 3 | **Mechanical extractor: in-repo + nQuake `ktx.cfg` -> KTX cvar descriptions + enum tables** | M (~1 session) | ~157/260 KTX cvars (60%) with structured enum -> GUI dropdowns; the core KTX KB spine. Needs provenance + conflict policy from probe-3 |
| 4 | **Import `mvdsv.6` man page -> MVDSV cmdline** | S | 9/11 cmdline (82%); optional extractor extension for 8 macro-wrapped flags (separate S) |
| 5 | **Extract nQuake `mvdsv.cfg` -> MVDSV cvars** (sequence after #1) | S-M | 34%+ floor; superseded by ezquake.com extraction if #1 shows that surface is richer |
| 6 | **KTX modes prose pass** (usermodes 13 + wiki 12 -> L3) | M | feeds the docketed KTX game-mode L3 concept notes (structural 27+317 already anchors them) |
| 7 | **Community-outreach + behavior-synthesis pass** for genuine residue | L | 38 `k_fbskill_*` bot cvars (no source anywhere), ~103 residual KTX NULL, ~74 MVDSV commands tail -- NOT mechanically solvable |

## Recommendation for downstream

**The L1 server-config KB arc is viable.** Shape it as a *provenance-aware
extraction arc*, not a research project: (a) loader fix #2 (free win), (b) a
shipped-config mechanical extractor for KTX cvars that parses the `N = label`
enum tables into structured choices (#3) with per-source provenance and an
explicit conflict policy (probe-3 drift is real), (c) the MVDSV-cvar approach
*gated on thread #1* -- do not size or start the MVDSV-cvar sub-arc until the
ezquake.com/docs overlap is quantified, because it swings the whole approach,
(d) man-page import for cmdline (#4). The structural tier needs nothing -- do
not spend effort manufacturing prose for log_templates/protocol/qc_builtins/
gameplay_*.

**Feeds the docketed KTX game-mode L3 concept notes:** the modes structural
data already in L1 (27 game_mode + 317 mode_default) plus the usermodes/wiki
prose (thread #6) is sufficient to author them; this gap-findings doc should be
read before authoring (cross-referenced from the concept-note parking doc).

**Deferred to the community-outreach pass (explicitly out of the mechanical arc
scope):** the genuine-gap residue in thread #7. These need humans or
source-behavior synthesis, not extraction; carrying them into the mechanical arc
would stall it. Track them, do not block on them.

### Scoping decisions made during synthesis (tracked, not silently dropped)

- `coverage.ndjson` records where coverage *exists* (non-zero vs a real probe-0
  M, plus the 100%-structural domains to mirror the README). Coverage *absence*
  is captured in this document's tier tables, not as zero-rows in the manifest.
- The ezquake.com/docs "124 MVDSV cvars" figure is **deliberately excluded** from
  `coverage.ndjson` -- probe-5 did not cross-match it against M=183, so emitting
  `124/183/67.8%` would inject a fabricated metric into a reusable artifact. It
  is thread #1 instead. The quantified MVDSV-cvar floor on record is nQuake
  63/183 (34%).
