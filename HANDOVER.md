# Handover

Thin docket of pending work. The index below points at lifecycle-grouped sub-sections; arc bodies live in `docs/superpowers/parking/<topic>.md` and shipped retrospectives live in each project's `arc-history.md`. Small-followup bodies stay inline.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state.

**How to work an item:** pick from the index below, jump to its destination (parking file or inline section), verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete BOTH the index line AND the destination content (parking file → `git rm`; inline section → Edit; arc-history entries are append-only and stay).

---

## Open items

### Small followups
- [Synthesis-report numerical-claim provenance gap](#synthesis-report-numerical-claim-provenance-gap-2026-04-29) — discipline note for future validation arcs; no retroactive fix.
- [Semantic-pass abbreviation-bridge heuristic](#semantic-pass-abbreviation-bridge-heuristic) — low pressure. Spec-ready fix in `semantic-match.ts`.
- [`-nopriority` cmdline_param recovery (Windows SDK stubs)](#-nopriority-cmdline_param-recovery-windows-sdk-stubs) — deferred from Layer 1 doc_only audit; waits on first MVDSV/FTE same-wall hit before solving in one place.
- [`.claude/` canonical exclusion gap](#claude-canonical-exclusion-gap-2026-04-30) — orphan check surfaces `apps/<app>/.claude/commands/*.md` as orphans. Cross-app pattern change → operator consult per amendment 8 before adding `.claude/` to canonical exclusion list in `~/.claude/skills/docs-check/SKILL.md`.

### Sidequests
- **Plugin v-table asset detection (loader-sites handler)** — FTE plugins reach loaders through `cvarfuncs->...` v-table calls, not direct CALL_EXPR. Only `plugin:ezhud` affected; ezhud images ship bundled with FTE. Low pressure. (Engine-agnostic structural finding; no body to migrate.)
- **Cvar-binding handler indirection gap (snprintf chains + CVARFC callbacks)** — engine-agnostic limitation. Bundle reconciliation correctly treats these as `seedRetained`; only the AST-corroboration signal is partial. Low pressure.
- **Sub-pattern 2b: cmdline variant-matrix gaps** — partially resolved 2026-04-25; 2 ezQuake + 11 QWCL entries remain on the same SDK-stub-headers solve. Bundle with `-nopriority` followup when triggered.
- **Workstream B: concept-note authoring scaffolding** — template MDX-compatibility test against ezquake.com vitepress + authoring-ritual shape. Polish; not blocking.
- **Workstream C: /docs ingest pipeline prep** — gap-report output format as contributor onboarding kit; next guide-rewrite candidate (`scripting.md` for ROI, `player-skins.md` for tighter scope).
- **Phase 2e follow-up arc residuals** — partially superseded by cross-extractor arc; remaining: 2 pre-existing ezquake F2 informational anomalies (`gl_lightmode` + 194 doc_only). Triage alongside next ezQuake deep-time refresh.
- **Map knowledge layer follow-ups** — slipgate map-browser UI; advanced `search_maps` filters; author seed-YAML curation; automated quarterly stats refresh; future `maps.quake.world` richer-metadata refactor. (Bundled from the Map knowledge SHIPPED retrospective's "Remaining" list; arc body now in `apps/qw-oracle/docs/arc-history.md`.)
- **matchscheduler doc system reconciliation** — 17-file `apps/matchscheduler/context/` predates monorepo doctrine. Earned its own brainstorm when matchscheduler work next surfaces friction with the existing system. Per docs-redesign spec Plan 2 narrowed scope (2026-04-29).

### Ongoing arcs
- [Phase 2d-2h: remaining QW knowledge rollout](docs/superpowers/parking/2026-04-18-qw-knowledge-rollout.md) — KTX is the only remaining engine port.
- [Slipgate Managed Mode pivot](docs/superpowers/parking/2026-04-28-slipgate-managed-mode.md) — **HIGH PRESSURE.** Pass 1+2+3 complete; Pass 4 brainstorm next. V1 = Arcs A+B+D+E+C-minimal.
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
- [Memory system consolidation](docs/superpowers/parking/2026-04-29-memory-system-consolidation.md) — **trigger fired 2026-04-30 (Phase 1 hygiene flag: 78 files ≥ 30 threshold).** Activate when operator bandwidth opens; new docs-system structure may have closed the inflow but file count still high.

### Recently opened (this session)
- (none — catch-all section for items added during this wrap-up; triaged into the right section next session.)

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

## Semantic-pass abbreviation-bridge heuristic

**Added:** 2026-04-24 (sanity-sample calibration P3)
**Status:** Spec-ready. Not a Phase 2f blocker — operators catch these at walk time. Worth fixing during or before Phase 2f walks reach the affected pairs for better automation.
**Verification first:** `grep -nE "prefix_signature|abbreviationBridge|abbreviation.bridge|prefix_match" apps/qw-oracle/scripts/load-knowledge/review/semantic-match.ts` — if any match surfaces, this entry has been acted on and should be removed or updated.

The semantic pass in `apps/qw-oracle/scripts/load-knowledge/review/semantic-match.ts` currently matches release-note bodies to clusters via (a) entity-name token overlap, (b) commit-message prefix tags (SECURITY:, RENDERER:, etc.), and (c) cross-name transforms for protocol extensions (`FTE_PEXT_*` <-> `cl_pext_*`). It does not bridge **abbreviation <-> expansion**.

### Concrete case that failed during calibration

3.6.1 → 3.6.2 has a 55-member cluster (PR 567 by ewhac, "INPUT: Restore joystick support") containing entities `joyadvanced`, `joyflysensitivity`, `joypitchsensitivity`, `joyindex`, `joyname`, `aux1`-`aux32`, etc. The associated release-note bullet reads *"Restore joystick support (ewhac)"*. The semantic pass did not propose cluster membership because no entity token literally equals "joystick" — they tokenize as `joy*` single-token names (no underscore) and `aux*`.

A human would bridge trivially: "joystick" starts with "joy", which is the common prefix of N cluster members. The detector should do the same.

### Proposed heuristic

Add to `semantic-match.ts` a fourth match path after (a)-(c):

1. For each cluster, compute a `prefix_signature`: the set of first-3-char substrings shared by at least 3 cluster members' first token. Example: joy-cluster → `{'joy'}`; hud_ammo cluster → `{'hud'}`; gl_outline → `{'gl_'}` (rejected, contains underscore — single-token only).
2. For each release-note body, tokenize to words (split on whitespace + punctuation).
3. For each word W of length >= 6, test whether W starts with any cluster's `prefix_signature` entry.
4. When match, propose cluster membership with rationale: *"abbreviation match: release-note word 'joystick' starts with cluster prefix 'joy' (N members share prefix)"*.

### Guard rails

- Min word length >= 6 (avoids short-word coincidences).
- Min shared-prefix char length >= 3 (avoids 2-char noise).
- Min members sharing prefix >= 3 (avoids 2-member coincidences).
- Single-token names only (gl_outline-family already clusters via `prefix:gl_outline` in the mechanical pass).
- Over-proposal is the designed failure mode — operator confirms at walk time.

### Pressure

Low. Not blocking Phase 2f. Real walks will catch the gap at operator judgment time.

### Related

- Modify: `apps/qw-oracle/scripts/load-knowledge/review/semantic-match.ts`
- Verify: re-run `review --project ezquake --from 3.6.1 --to 3.6.2` and confirm `release_notes:25` gains `proposed_cluster_id` pointing at the joystick cluster.

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

---

## `.claude/` canonical exclusion gap (2026-04-30)

**Added:** 2026-04-30 (slipgate retrofit wrap-up). **Status:** Open. Cross-app doctrine gap surfaced by Phase 2 orphan check.
**Verification first:** `find . -path '*/.claude/commands/*.md' -not -path '*/node_modules/*' -not -path '*/dist/*'` — these surface as orphans because `.claude/` isn't in the canonical exclusion list.

### What's missing

The Phase 2 Step 2 exclusion table in `~/.claude/skills/docs-check/SKILL.md` doesn't list `.claude/` directories. Slash commands authored under `apps/<app>/.claude/commands/*.md` (and other harness state) are loaded by Claude Code natively, not by the docs-check spider-web walk. Strict orphan detection surfaces them as `[orphan — needs classification or decommission]` even though they shouldn't be in the spider-web at all.

Slipgate has 2 such files (`.claude/commands/cfg-parser.md`, `.claude/commands/restart.md`). Other apps likely similar.

### Proposed fix

Add `.claude/` to canonical exclusions in SKILL.md Phase 2 Step 2 exclusion table, alongside `node_modules/`, `dist/`, `build/`, `.pytest_cache/`. Rationale: harness state loaded by Claude Code natively, not authored content for the docs-check spider-web. Universal across all apps.

Per amendment 8's strictness rule, extending the canonical exclusion list is a cross-app pattern change → operator consults before adding (matches the precedent set by `_*` directory + `.pytest_cache/` extensions on 2026-04-30).

### Pressure

Low. Slipgate retrofit completed without blocking on this; the surfaced files are correctly authored, just incorrectly classified by the strict orphan walk. Resolves with a one-line addition to SKILL.md after operator consult.

