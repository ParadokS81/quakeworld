# Handover

Thin docket of pending work. The index below points at lifecycle-grouped sub-sections; arc bodies live in `docs/superpowers/parking/<topic>.md` and shipped retrospectives live in each project's `arc-history.md`. Small-followup bodies stay inline.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state.

**How to work an item:** pick from the index below, jump to its destination (parking file or inline section), verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete BOTH the index line AND the destination content (parking file → `git rm`; inline section → Edit; arc-history entries are append-only and stay).

---

## Open items

### Small followups
- [Synthesis-report numerical-claim provenance gap](#synthesis-report-numerical-claim-provenance-gap-2026-04-29) — discipline note for future validation arcs; no retroactive fix.
- **qw-oracle DEPLOYMENT.md authoring** — Phase 8 of Arc 1 ships production Dockerfile + compose.prod.yml + nginx + CF Tunnel choreography but does not formalize a `DEPLOYMENT.md`. Author one alongside Phase 8 execution so the deploy mechanics have a documentation home. Lightweight; the content already exists scattered across the phase MD.

### Sidequests
- **Plugin v-table asset detection (loader-sites handler)** — FTE plugins reach loaders through `cvarfuncs->...` v-table calls, not direct CALL_EXPR. Only `plugin:ezhud` affected; ezhud images ship bundled with FTE. Low pressure. (Engine-agnostic structural finding; no body to migrate.)
- **Cvar-binding handler indirection gap (snprintf chains + CVARFC callbacks)** — engine-agnostic limitation. Bundle reconciliation correctly treats these as `seedRetained`; only the AST-corroboration signal is partial. Low pressure.
- **Phase 2e follow-up arc residuals** — partially superseded by cross-extractor arc and by 2026-05-01 help-JSON classification arc. Remaining: 1 pre-existing ezquake F2 informational anomaly (`gl_lightmode`). Triage alongside next ezQuake deep-time refresh.
- **Map knowledge layer follow-ups** — slipgate map-browser UI; advanced `search_maps` filters; author seed-YAML curation; automated quarterly stats refresh; future `maps.quake.world` richer-metadata refactor. (Bundled from the Map knowledge SHIPPED retrospective's "Remaining" list; arc body now in `apps/qw-oracle/docs/arc-history.md`.)
- **matchscheduler doc system reconciliation** — 17-file `apps/matchscheduler/context/` predates monorepo doctrine. Earned its own brainstorm when matchscheduler work next surfaces friction with the existing system. Per docs-redesign spec Plan 2 narrowed scope (2026-04-29).

### Ongoing arcs
- [qw-oracle Arc 1 — Postgres + hybrid retrieval](docs/superpowers/plans/2026-05-02-qw-oracle-arc1/README.md) — 8-phase per-phase MD plan. Phase 1 shipped (`610eb4e`); Phases 2-8 drafted and approved. Resume execution at Phase 2 (Layer 1 port — schema generator + loader port + entity-counts regression gate).
- [Phase 2d-2h: remaining QW knowledge rollout](docs/superpowers/parking/2026-04-18-qw-knowledge-rollout.md) — KTX is the only remaining engine port.
- [Slipgate Managed Mode pivot](docs/superpowers/parking/2026-04-28-slipgate-managed-mode.md) — **HIGH PRESSURE.** Pass 1+2+3 complete; Pass 4 brainstorm next. V1 = Arcs A+B+D+E+C-minimal.
- [qw-oracle showcase site + contributor pipeline](docs/superpowers/parking/2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md) — design landed 2026-05-01 (`docs/superpowers/specs/2026-05-01-qw-oracle-showcase-site-design.md`); next step is claude.ai/design mockups, then implementation plan.
- [Cross-extractor pattern audit follow-up arc](docs/superpowers/parking/2026-04-28-cross-extractor-pattern-audit.md) — five phases shipped + 13 audit-deferred residuals + 2 new follow-ups.
- [Per-project Mode B validation synthesis follow-ups](docs/superpowers/parking/2026-04-28-mode-b-validation-followups.md) — three Mode B validations shipped; some closed, some queued.

### Future arcs (waiting on trigger)
- [Cross-extractor Phase 6 residuals](docs/superpowers/parking/2026-04-28-cross-extractor-phase6-residuals.md) — D.1.8 lifecycle hooks + broader positive-contracts coverage + deep-time-walk obligation.
- [Cross-extractor Phase 6 ezquake exemptions: r_bloom_* shape](docs/superpowers/parking/2026-04-28-phase6-ezquake-r-bloom-shape.md) — convergent with QWCL 1996-vintage shape; joint positive-contract arc candidate.
- [Cross-engine alias scaffolding + slipgate version-awareness follow-ups](docs/superpowers/parking/2026-04-26-cross-engine-alias-followups.md) — sub-thread #4 (FTE asset bundle, superseded by Slipgate Managed Mode TAIL-1) + sub-thread #5 (slipgate version-awareness, tracked-by Quake Dir Control plan).
- [Retired cvars in snapshot + stale-config warning UX](docs/superpowers/parking/2026-04-26-retired-cvars-stale-config-warning.md) — coupled producer+consumer work blocked on UX design.
- [Slipgate SCHEMA.md for snapshot consumer interface](docs/superpowers/parking/2026-04-26-slipgate-schemamd.md) — gated on next slipgate UI arc surfacing version-arc badges.
- [Feed tab future content](docs/superpowers/parking/2026-04-27-feed-tab-content.md) — tournaments / dev landscape / GitHub monitoring / community announcements.
- [Screenshot POC → Profile picture generator](docs/superpowers/parking/2026-04-27-screenshot-profile-picture.md) — graduate POC into Profile.
- [Tray menu launch](docs/superpowers/parking/2026-04-27-tray-menu-launch.md) — optional arc; documented home if launch needs to come back.
- [Interactive HTML dashboard](docs/superpowers/parking/2026-04-XX-interactive-html-dashboard.md) — shelved with documented unshelve triggers.
- [qw_event_log as cross-validation oracle for Layer 1](docs/superpowers/parking/2026-04-XX-qw-event-log-cross-validation.md) — gated on KTX cvars + KTX gameplay overrides.
- [SCHEMA.md doc-style inconsistency](docs/superpowers/parking/2026-04-29-schemamd-style-refresh.md) — per-table body refresh + topical-vs-per-version style decision.
- [Layer 3 concept note: death rules](docs/superpowers/parking/2026-04-29-layer3-death-rules-concept-note.md) — gated on KTX gameplay overrides; three-anchor synthesis.
- [L1-alpha: Ecosystem-tools registry](docs/superpowers/parking/2026-04-29-l1-alpha-ecosystem-tools.md) — Pass 3 carry-forward.
- [L1-beta: Cross-format binary fingerprinting](docs/superpowers/parking/2026-04-29-l1-beta-cross-format-fingerprinting.md) — Pass 3 carry-forward.
- [L1-gamma: Engine helpdoc / data-file recognition](docs/superpowers/parking/2026-04-29-l1-gamma-helpdocs.md) — Pass 3 carry-forward.
- [L1-delta: Stock asset catalog](docs/superpowers/parking/2026-04-29-l1-delta-stock-pak.md) — Pass 3 carry-forward.
- [Memory system consolidation](docs/superpowers/parking/2026-04-29-memory-system-consolidation.md) — **watching.** File count flat at 2026-04-29 post-trim baseline (~77); inflow controls in place via docs-check Phase 1 Step 5 + arc-history.md routing. Calendar check ~2026-05-20 per parking file trigger #3.

### Recently opened (this session)
- [Layer 2 hygiene sidequest -- research + scope](docs/superpowers/parking/2026-05-02-layer2-hygiene-sidequest-prompt.md) -- fresh-session prompt to scope a focused arc fixing tier-1 noise (system rows, micro-sessions, brittle bot/reaction lists, language detection, threading, quality scoring, freshness path). Improves gap-finding signal before Arc 3 enrichment. Output: design doc + arc-ordering recommendation vs Arc 1; halt for operator review before any phase MDs.
- **New-doc_only-on-next-ezquake-bump alert** — when ezquake-source HEAD advances to a new tag and we re-walk, run `python3 apps/qw-oracle/scripts/classify-help-json.py --project ezquake --propose` from monorepo root. The seed already covers the 193 existing doc_only entries; the CLI will only print proposals for any newly-arrived doc_only names. Operator manually triages or seeds the new entries. No automatic alerting between sessions — Claude only runs when invoked.
- **Extractor improvement: `COM_CheckParm` bare-call cmdline_param recognition** — observed during help-JSON classification: `-nomouse` was in v3.0 source (`in_sdl2.c`) registered via `COM_CheckParm("-nomouse")` but our libclang extractor only recognizes `CMDLINE_DEF(...)` macros, so it silently became doc_only. Likely more cmdline params hidden by the same pattern. Folding `COM_CheckParm("...")` call sites into the cmdline-param extractor would surface them. Low pressure — bundle with future cmdline-param extractor work.
- **Upstream issue QW-Group/ezquake-source#1117** — opened 2026-05-01 proposing cleanup of 156 help-JSON drift entries (48 renamed / 93 retired / 15 never-implemented). Awaiting maintainer direction on PR shape (one PR vs three vs issue-per-category). Watch for response; on approval, generate PR(s) from `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-cleanup.md`.
- **Help-JSON classifier: retired-bucket commit-attribution heuristic looseness** — spot-check via subagents found that the blame heuristic in `extractor_lib/_help_json_blame.py` cites the last-touch commit for retired entries, which can be a default-value tweak (`s_alsa_latency`, `in_raw_allbuttons`) or a comment-out (`sv_highchars`) rather than the actual removal commit. Core "no live registration at HEAD" claim is sound; commit citations are 30-40% loose. Improvement: detect `-` registration-line removals specifically rather than any source-side touch. Low pressure — caveats noted in upstream PR digest cover the gap for now.

---

## Synthesis-report numerical-claim provenance gap (2026-04-29)

**Added:** 2026-04-29. **Status:** Open. Process-improvement note for future validation arcs.

Validation reports authored 2026-04-28 (synthesis report at `docs/superpowers/reviews/2026-04-28-per-project-validation-synthesis.md` plus per-project deep-validation reports) contain numerical claims (e.g., "230 trailing_comments", "2989 cvars at HEAD") with no preserved SQL. The numbers did not match live DB at the moment of writing during the 2026-04-29 zero-debt arc, costing ~90 minutes reconciling irreproducible figures.

### Process improvement

Future validation reports must inline the SQL (or other reproducible derivation) for every numerical claim, as a comment block in the report itself. Three formats are acceptable:

1. Inline ` ```sql ... ``` ` block immediately after the claim.
2. Footnote-style citation pointing at a script file checked into the repo with the report.
3. A "queries" appendix section at the bottom of the report listing every claim and its derivation.

Without this, downstream readers can't distinguish "stale snapshot at write-time" from "extractor regression since write-time" from "writer arithmetic error."

### Pressure

Low; aspirational rule for future arcs. No retroactive fix planned for the 2026-04-28 reports — rather, calibrate the next validation pass against this rule.
