# Handover

Thin docket of pending work. The index below points at lifecycle-grouped sub-sections; arc bodies live in `docs/superpowers/parking/<topic>.md` and shipped retrospectives live in each project's `arc-history.md`. Small-followup bodies stay inline.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state.

**How to work an item:** pick from the index below, jump to its destination (parking file or inline section), verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete BOTH the index line AND the destination content (parking file → `git rm`; inline section → Edit; arc-history entries are append-only and stay).

---

## Open items

### Small followups
- [Synthesis-report numerical-claim provenance gap](#synthesis-report-numerical-claim-provenance-gap-2026-04-29) — discipline note for future validation arcs; no retroactive fix.
- [`-nopriority` cmdline_param recovery (Windows SDK stubs)](#-nopriority-cmdline_param-recovery-windows-sdk-stubs) — deferred from Layer 1 doc_only audit; waits on first MVDSV/FTE same-wall hit before solving in one place.

### Sidequests
- **Plugin v-table asset detection (loader-sites handler)** — FTE plugins reach loaders through `cvarfuncs->...` v-table calls, not direct CALL_EXPR. Only `plugin:ezhud` affected; ezhud images ship bundled with FTE. Low pressure. (Engine-agnostic structural finding; no body to migrate.)
- **Cvar-binding handler indirection gap (snprintf chains + CVARFC callbacks)** — engine-agnostic limitation. Bundle reconciliation correctly treats these as `seedRetained`; only the AST-corroboration signal is partial. Low pressure.
- **Sub-pattern 2b: cmdline variant-matrix gaps** — partially resolved 2026-04-25; 2 ezQuake + 11 QWCL entries remain on the same SDK-stub-headers solve. Bundle with `-nopriority` followup when triggered.
- **Phase 2e follow-up arc residuals** — partially superseded by cross-extractor arc; remaining: 2 pre-existing ezquake F2 informational anomalies (`gl_lightmode` + 194 doc_only). Triage alongside next ezQuake deep-time refresh.
- **Map knowledge layer follow-ups** — slipgate map-browser UI; advanced `search_maps` filters; author seed-YAML curation; automated quarterly stats refresh; future `maps.quake.world` richer-metadata refactor. (Bundled from the Map knowledge SHIPPED retrospective's "Remaining" list; arc body now in `apps/qw-oracle/docs/arc-history.md`.)
- **matchscheduler doc system reconciliation** — 17-file `apps/matchscheduler/context/` predates monorepo doctrine. Earned its own brainstorm when matchscheduler work next surfaces friction with the existing system. Per docs-redesign spec Plan 2 narrowed scope (2026-04-29).

### Ongoing arcs
- [Phase 2d-2h: remaining QW knowledge rollout](docs/superpowers/parking/2026-04-18-qw-knowledge-rollout.md) — KTX is the only remaining engine port.
- [Slipgate Managed Mode pivot](docs/superpowers/parking/2026-04-28-slipgate-managed-mode.md) — **HIGH PRESSURE.** Pass 1+2+3 complete; Pass 4 brainstorm next. V1 = Arcs A+B+D+E+C-minimal.
- [Cross-extractor pattern audit follow-up arc](docs/superpowers/parking/2026-04-28-cross-extractor-pattern-audit.md) — five phases shipped + 13 audit-deferred residuals + 2 new follow-ups.
- [Per-project Mode B validation synthesis follow-ups](docs/superpowers/parking/2026-04-28-mode-b-validation-followups.md) — three Mode B validations shipped; some closed, some queued.
- [Help-JSON classification infrastructure — Tasks 5-8](docs/superpowers/plans/2026-04-30-help-json-classification-infrastructure.md) — Tasks 1-4 shipped 2026-05-01 (commits `bb092fc`..`26ae789`): schema/validator, single-pass git-pickaxe blame index, classify-help-json CLI, post-smoke similarity-gate fixes, and the 193-entry ezQuake seed YAML. Remaining: Task 5 (TS review-module integration + `--fail-on` gate), Task 6 (PR digest generator), Task 7 (extraction-review CLI bucket wire-up), Task 8 (PLAYBOOK + RUNBOOK doc updates). Fresh-session prompt at `docs/superpowers/parking/2026-05-01-help-json-classification-tasks-5-8-prompt.md`.

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
- [qw-oracle showcase site + contributor pipeline](docs/superpowers/parking/2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md) — collaborative concept-note authoring; trigger = operator commits to building the showcase site. Consolidates retired Workstream B + C sidequests.
- [L1-alpha: Ecosystem-tools registry](docs/superpowers/parking/2026-04-29-l1-alpha-ecosystem-tools.md) — Pass 3 carry-forward.
- [L1-beta: Cross-format binary fingerprinting](docs/superpowers/parking/2026-04-29-l1-beta-cross-format-fingerprinting.md) — Pass 3 carry-forward.
- [L1-gamma: Engine helpdoc / data-file recognition](docs/superpowers/parking/2026-04-29-l1-gamma-helpdocs.md) — Pass 3 carry-forward.
- [L1-delta: Stock asset catalog](docs/superpowers/parking/2026-04-29-l1-delta-stock-pak.md) — Pass 3 carry-forward.
- [Memory system consolidation](docs/superpowers/parking/2026-04-29-memory-system-consolidation.md) — **watching.** File count flat at 2026-04-29 post-trim baseline (~77); inflow controls in place via docs-check Phase 1 Step 5 + arc-history.md routing. Calendar check ~2026-05-20 per parking file trigger #3.

### Recently opened (this session)
- **New-doc_only-on-next-ezquake-bump alert** — when ezquake-source HEAD advances to a new tag and we re-walk, run `python3 apps/qw-oracle/scripts/classify-help-json.py --project ezquake --propose` from monorepo root. The seed already covers the 193 existing doc_only entries; the CLI will only print proposals for any newly-arrived doc_only names. Operator manually triages or seeds the new entries. No automatic alerting between sessions — Claude only runs when invoked.
- **Extractor improvement: `COM_CheckParm` bare-call cmdline_param recognition** — observed during help-JSON classification: `-nomouse` was in v3.0 source (`in_sdl2.c`) registered via `COM_CheckParm("-nomouse")` but our libclang extractor only recognizes `CMDLINE_DEF(...)` macros, so it silently became doc_only. Likely more cmdline params hidden by the same pattern. Folding `COM_CheckParm("...")` call sites into the cmdline-param extractor would surface them. Low pressure — bundle with future cmdline-param extractor work or with the existing `-nopriority` Windows-SDK-stubs sidequest.

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

---

## `-nopriority` cmdline_param recovery (Windows SDK stubs)

**Added:** 2026-04-25 (split from the "Layer 1 doc_only audit closed" retrospective during 2026-04-29 docs-system-redesign migration). Original audit body now in `apps/qw-oracle/docs/arc-history.md`.
**Status:** Open. One row remains unrecovered. Bundled with "Sub-pattern 2b: cmdline variant-matrix gaps" — same SDK-stubs solve.
**Verification first:** `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT name FROM entities WHERE project='ezquake' AND type='cmdline_param' AND source_state='source_backed' AND name='-nopriority'"` should return zero rows (entity remains doc_only / not source-recovered).

### What's missing

`-nopriority` cmdline_param at `research/repos/ezquake-source/src/sv_sys_win.c:645` remains unrecovered after the Layer 1 doc_only audit closure. The 4-variant parse architecture (Item A from that audit) is sound and reaches the file, but `sv_sys_win.c`'s `Sys_Init` function body references Windows SDK types (`VER_PLATFORM_WIN32_NT`, `GetCurrentProcess()`, `SetPriorityClass`, `HIGH_PRIORITY_CLASS`) via `#include <mmsystem.h>` and `<winsock2.h>` — headers not present in the Linux libclang environment. The Sys_Init body refuses to parse cleanly past the SDL.h / winsock2.h errors, so the COM_CheckParm at line 645 is never visited.

### Recovery options when this becomes pressure

1. **Stub Windows SDK headers.** A minimal directory of empty/declarative `.h` files for winsock2, mmsystem, SDL, etc. at `research/repos/ezquake-source/win-sdk-stubs/`, added to `clang_args_win_for` via `-I`. Adds env complexity; unblocks parsing of all Windows-specific TUs in one go.
2. **Hand-register the row in `help_cmdline_params.json`** upstream and treat Linux-side extraction as silent on Windows-SDK-dependent call sites.
3. **Source refactor upstream** — split Sys_Init so the COM_CheckParm call isn't intertwined with Windows-SDK type usage. Unlikely.

### Pressure

Low. Deferred until MVDSV or FTE hits the same wall — then solve in one place. Bundle with the "Sub-pattern 2b: cmdline variant-matrix gaps" sidequest.

### Related

- Origin: Layer 1 doc_only audit closure 2026-04-25 (now in `apps/qw-oracle/docs/arc-history.md`).
- Companion sidequest: "Sub-pattern 2b: cmdline variant-matrix gaps" (2 ezQuake + 11 QWCL entries on same solve).
- Source citation: `research/repos/ezquake-source/src/sv_sys_win.c:645`.

