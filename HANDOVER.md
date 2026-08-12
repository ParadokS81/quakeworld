# Handover

Row contract: one line per row — name, pointer(s), coarse status.
Detail lives in the linked anchors (target-workflow design W17). Arc
bodies live in `docs/superpowers/parking/<topic>.md`; shipped
retrospectives live in `docs/arc-history.md` (repo-scope; qw-oracle's
own arcs chronicle in `apps/qw-oracle/docs/arc-history.md`).

## Ongoing arcs

- **QWiki community-reference — Phase 4 LLM-extraction** — [plan](docs/superpowers/plans/2026-05-04-qwiki-community-reference/README.md) — paused, waiting on operator call (possible supersession by qwiki-v1-beta/qwiki-sandbox pivot).
- **docs.quake.world Phase 5 production** — [resume handoff](docs/superpowers/parking/2026-06-11-docs-quake-world-orchestrator-resume-phase5.md) — paused, waiting on vikpe DNS greenlight.
- **demand-driven L3 player-help concept authoring** — [plan](docs/superpowers/plans/2026-06-09-demand-driven-l3-concept-authoring/README.md) — paused, waiting on operator pickup (next note: rl/gl or textures).
- **Oracle web direction (Arc A + Arc B)** — [direction doc](docs/superpowers/parking/2026-08-04-oracle-web-direction.md) · [oracle-web-v1 plan](docs/superpowers/plans/2026-08-06-oracle-web-v1/README.md) — executing.
- **Asset-type curate skill arc — Phase 3 fan-out** — [parking](docs/superpowers/parking/2026-05-14-asset-type-phase-3-fanout.md) — paused, waiting on operator session to run queued fan-out waves.
- **Slipgate Managed Mode pivot** — [parking](docs/superpowers/parking/2026-04-28-slipgate-managed-mode.md) — paused, waiting on Browse+Manager UI brainstorm (gating step).
- **Layer 2 corpus reconstruction — Phase D (RRF recalibration) + buckets-E** — [plan](docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/README.md) — paused, waiting on operator pickup (Phase C shipped 2026-08-06; monthly harvest runbook continues on its own calendar cadence).

## Future arcs

- **KTX admin/messaging L3 concept notes** — two L3 notes never authored (admin-and-user-management; qw-player-messaging) — trigger: operator-initiated — apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog-findings.md#follow-up-work-surfaced.
- **qwiki-v1-beta Phases 5-8 (Modes vertical slice)** — unstarted, deferred until picked up — trigger: operator-initiated — docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md (README's own status block is stale — reads Phase 4 pending; Phases 1–4 shipped 2026-05-14 per apps/qw-oracle/docs/arc-history.md).
- **Phase 8 eval q5/q8 L3 authoring leads** — Windows HDR-flicker + Linux sys_highpriority/CPU-affinity recipe notes lack coverage — trigger: next L3 authoring pass — docs/superpowers/parking/2026-05-03-layer3-multidomain-bucket-framework.md.
- **Cron-based upstream-drift detector for Layer 1 codebases** — operator-poll sufficient today — trigger: cadence increase / non-operator contributors / admin-panel arc — docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md.
- **Map knowledge layer follow-ups** — map-browser UI / advanced search_maps filters / seed-YAML curation / quarterly stats refresh / maps.quake.world refactor — trigger: operator-initiated — apps/qw-oracle/docs/arc-history.md (2026-04-27 entry; Remaining list appended at the 2026-08-11 migration).
- **matchscheduler doc system reconciliation** — 17-file context/ predates monorepo doctrine — trigger: next matchscheduler friction — docs/superpowers/plans/2026-04-29-docs-redesign-session-a.md.
- **qw-oracle Layer 1 database design audit** — index coverage / storage shape / CHECK sprawl / pgvector tuning / dead columns — trigger: MET (KTX onboarding shipped 2026-05-05), ready to run — docs/superpowers/parking/2026-08-11-qw-oracle-l1-database-design-audit.md (NEW).
- **Cross-extractor pattern audit follow-up arc — residuals** — 13 audit-deferred residuals + 2 new follow-ups after 5 shipped phases — trigger: operator-initiated — docs/superpowers/parking/2026-04-28-cross-extractor-pattern-audit.md.
- **Oracle effectiveness eval** — DeepSeek-run helpdesk simulation + showcase captures, folds in MCP Tailscale followup — trigger: operator-initiated, IMMINENT — docs/superpowers/parking/2026-08-06-oracle-eval-simulation.md.
- **QTV/QWFWD concept-note authoring** — author master-server heartbeat + MVD-streaming/parse_delay notes (D9), defer qtv_password — trigger: pending operator greenlight — docs/superpowers/reviews/2026-06-06-qtv-qwfwd-l1-extraction-post-arc-analysis.md.
- **ezQuake contributor map** — per-subsystem authorship/maintainer lookup for PR routing — trigger: next non-trivial routing question or operator-initiated — docs/superpowers/parking/2026-05-23-ezquake-contributor-map.md.
- **MCP tool upgrades** (version param / get_entity_history / date filters) — deprioritized, verified absent 2026-05-21 — trigger: operator-initiated on version-aware demand — no parking doc (pre-contract item).
- **L1 contextual build-availability arc** — relevance-at-answer-time framing (build-agnostic L1 vs build-specific question) — trigger: operator-initiated — docs/superpowers/parking/2026-05-20-l1-contextual-build-availability-arc.md.
- **quad Discord-surface enhancements** — auto-channel-topic / auto-mirror Discord Events / subscribable feeds — trigger: after auto-record UX soaks one matchday cycle — docs/superpowers/parking/2026-05-20-quad-discord-surfaces.md.
- **Cross-project Unraid scoping convergence** — lift qwiki-v1-beta's scoped non-root convention to quad/qw-stats/qw-oracle — trigger: operator-initiated — docs/superpowers/parking/2026-05-14-unraid-scoping-convergence.md.
- **dusty-* antilag fork L1 onboarding** — behavior/description fork, entity surface identical to mainline — trigger: operator-initiated (backlog) — docs/superpowers/parking/2026-05-16-dusty-antilag-fork-l1.md.
- **Layer 3 multi-domain expansion + bucket framework** — 9-bucket player-as-system taxonomy, Arc 3 architecture — trigger: operator-initiated — docs/superpowers/parking/2026-05-03-layer3-multidomain-bucket-framework.md.
- **Cross-extractor Phase 6 residuals** — D.1.8 lifecycle hooks + positive-contracts coverage + deep-time-walk — trigger: operator-initiated — docs/superpowers/parking/2026-04-28-cross-extractor-phase6-residuals.md.
- **Cross-extractor Phase 6 ezquake r_bloom_* exemption shape** — convergent with QWCL 1996-vintage shape — trigger: joint positive-contract arc candidate — docs/superpowers/parking/2026-04-28-phase6-ezquake-r-bloom-shape.md.
- **Cross-engine alias scaffolding + slipgate version-awareness follow-ups** — sub-thread #4 (superseded by Managed Mode TAIL-1) + #5 (tracked by Quake Dir Control) — trigger: operator-initiated — docs/superpowers/parking/2026-04-26-cross-engine-alias-followups.md.
- **Retired cvars in snapshot + stale-config warning UX** — coupled producer+consumer work — trigger: UX design unblocked — docs/superpowers/parking/2026-04-26-retired-cvars-stale-config-warning.md.
- **Slipgate SCHEMA.md for snapshot consumer interface** — document the snapshot's consumer contract so UI version-arc badges have a stable interface — trigger: next slipgate UI arc surfacing version-arc badges — docs/superpowers/parking/2026-04-26-slipgate-schemamd.md.
- **Feed tab future content** — tournaments / dev landscape / GitHub monitoring / community announcements — trigger: operator-initiated — docs/superpowers/parking/2026-04-27-feed-tab-content.md.
- **Screenshot POC to Profile picture generator** — graduate POC into Profile — trigger: operator-initiated — docs/superpowers/parking/2026-04-27-screenshot-profile-picture.md.
- **Tray menu launch** — optional arc, documented home if launch needs to come back — trigger: operator-initiated — docs/superpowers/parking/2026-04-27-tray-menu-launch.md.
- **Interactive HTML dashboard** — shelved with documented unshelve triggers — trigger: per doc — docs/superpowers/parking/2026-04-XX-interactive-html-dashboard.md.
- **qw_event_log as cross-validation oracle for Layer 1** — gate CLEARED 2026-08-04, NEW blocker: source artifact path gone (WSL-era) — trigger: operator confirms artifact fate — docs/superpowers/parking/2026-04-XX-qw-event-log-cross-validation.md.
- **SCHEMA.md doc-style inconsistency** — per-table body refresh + topical-vs-per-version decision — trigger: operator-initiated — docs/superpowers/parking/2026-04-29-schemamd-style-refresh.md.
- **L3 concept note: death rules** — gate CLEARED 2026-08-04, ready for authoring — trigger: operator-initiated — docs/superpowers/parking/2026-04-29-layer3-death-rules-concept-note.md.
- **L1-alpha: Ecosystem-tools registry** — Pass 3 carry-forward — trigger: operator-initiated — docs/superpowers/parking/2026-04-29-l1-alpha-ecosystem-tools.md.
- **L1-beta: Cross-format binary fingerprinting** — Pass 3 carry-forward — trigger: operator-initiated — docs/superpowers/parking/2026-04-29-l1-beta-cross-format-fingerprinting.md.
- **L1-gamma: Engine helpdoc / data-file recognition** — Pass 3 carry-forward — trigger: operator-initiated — docs/superpowers/parking/2026-04-29-l1-gamma-helpdocs.md.
- **L1-delta: Stock asset catalog** — scope narrower now (qw-stock-paks.json is a manifest, not per-file classification) — trigger: operator-initiated — docs/superpowers/parking/2026-04-29-l1-delta-stock-pak.md.
- **Memory system consolidation** — 158 files (first decline recorded 2026-08-07), ~617KB corpus — trigger: schedule when convenient — docs/superpowers/parking/2026-04-29-memory-system-consolidation.md.
- **Promote methodology learnings to served concept notes** — dmm-flags + server-setup.md now served; player+admin game-modes overview still unwritten — trigger: admin-facing query stream or wiki restructuring — docs/superpowers/parking/2026-05-29-served-admin-knowledge-from-methodology.md.
- **frogbots.md concept note** — bots run under the hood in tot/LGC/practice, undocumented — trigger: operator-initiated — docs/superpowers/parking/2026-05-30-game-mode-hosting-reframe-and-bots-gap-handoff.md.
- **Concept-note: map-selection-workflow** — hud-configuration.md shipped via a different arc (demand-driven-l3), this one remains unauthored — trigger: operator-initiated — docs/superpowers/parking/2026-05-14-concept-note-partners-authoring.md.
- **KTX handler class-name shape cosmetic cleanup** — 9 handlers, 3 naming conventions, no behavioral consequence — trigger: bundled with cross-extractor audit D.5.1/D.5.2 FTE nits — docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md.

## Small followups

Reviewed through: 2026-08-11.

- `[agent-food]` **MVDSV L1 findings backlog** — cvar/command/cmdline/info_keys/MCP passes complete (sv_antilag_no_pred raw-comment residual tracked at dusty-antilag parking); ~53 of 74 logged findings still open (secondary candidates #64/#70/#71 next) — docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-describe-fill-findings.md + docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/workflow-chunk-campaign-brief.md.
- `[agent-food]` **oracle-reentry-plumbing residuals (a)-(f)** — GHCR publish/letter, F13 credential rotation, F8 cindex-preflight fix, sweep-feed doc staleness, dump deletions — full ledger docs/superpowers/plans/2026-08-03-oracle-reentry-plumbing.md.
- `[agent-food]` **Verify pip clang bake at next cockpit recreate**, then retire interim workaround doc (F10 oracle-reentry plan).
- `[agent-food]` **GHCR `latest` tag stale** — retag/push at next deploy touchpoint (also closes oracle-reentry residual (a)).
- `[agent-food]` **Post-migration doc sweep (WSL-era claims)** — root CLAUDE.md WSL section confirmed still present 2026-08-11; qw-oracle DEVELOPMENT.md npm/localhost claim not re-confirmed this pass.
- `[decision]` **workstation-sweep merge artifacts** — decommission or bless as chronicle: docs/superpowers/parking/2026-05-27-ktx-l1-apply-pass-strategy-handoff.md + docs/superpowers/parking/2026-07-28-workstation-sweep/.
- `[agent-food]` **mvdsv L1 extraction gap: `ucmds[]` table not walked** — `dl`/`dlist`/`demolist` absent from L1; extend extractor (research/repos/mvdsv/src/sv_user.c:3336,3348,3351).
- `[agent-food]` **KTX L1 cross-card polish sweep** — 4 bundled single-card fixes (FPS-kick wording, kick/break See-also gaps, dmgfrags/silence permission mislabels) — docs/superpowers/parking/2026-08-11-ktx-l1-cross-card-polish-sweep.md (NEW).
- `[agent-food]` **L3 concept note: QW team-chat visibility across the stack** — cross-codebase synthesis (KTX/MVDSV/ezQuake/fteqtv), ~30-45 min — apps/qw-oracle/curated/concept-notes/qw-team-chat-visibility.md (not yet authored) (ingredients + audit commits: docs/superpowers/parking/2026-05-21-ktx-mvdsv-followup-triage-handoff.md).
- `[agent-food]` **describe-fill-synthesis skill folds** — 2 of 3 open: ENGINE-BOUNDARY-HEDGED-OK verdict subclass + commented-out-runtime-check pattern — .claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md.
- `[agent-food]` **quad auto-record suppression-stuck bug** — bound suppression by timeout, ~5 lines — apps/quad/src/modules/mumble/auto-record.ts:stopForTeam.
- `[decision]` **ezQuake help_variables.json mis-lists commands as variables** — upstream PR, route nano/slime — feeds docs/superpowers/plans/2026-05-15-help-json-doc-consistency-gate.md + apps/qw-oracle/docs/upstream-prs/.
- `[agent-food]` **Extend F-D4a owned-row guard to remaining derivers** — 5 of 14 guarded, add per-deriver only when a synthesis arc claims that type — apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts.
- `[agent-food]` **F-D4a reconciliation for ezquake help-JSON PRs** — all 4 PRs merged, none reconciled; per-type readiness varies — docs/superpowers/parking/2026-08-11-fd4a-helpjson-reconciliation.md (NEW).
- `[agent-food]` **rulesets.c PR #1132 `-ruleset` description follow-up** — still lists 3 of 6 working values — docs/superpowers/parking/2026-05-26-handoff-ezquake-bugfix-prs-rulesets-sys_posix-investigate.md (PRs MERGED 2026-06-06; handoff pre-dates merge).
- `[agent-food]` **sys_posix.c PR #1133 `-nostdout` description follow-up** — generic pre-fix wording needs sharpening — docs/superpowers/parking/2026-05-26-handoff-ezquake-bugfix-prs-rulesets-sys_posix-investigate.md (PRs MERGED 2026-06-06; handoff pre-dates merge).
- `[agent-food]` **mp3 dead-enum cleanup PR (`macro_ids.h`)** — `macro_mp3info`/`macro_mp3_volume` orphaned, ~2-line deletion — research/repos/ezquake-source/src/macro_ids.h (upstream target).
- `[agent-food]` **Per-project conftest.py for extractor pytest** — sys.path pollution, 3 pre-existing collection errors — F1 in docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md; conftest.py confirmed still absent 2026-08-11.
- `[agent-food]` **Cross-project audit cadence OVERDUE** — new projects/entity-types/migrations fired since 2026-05-06 — apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md "Cross-project audit cadence" section; last audit: docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md.
- `[decision]` **MW_ADMIN_PASSWORD rotation (qwiki-v1-beta)** — unverifiable from repo, operator confirm-or-do via Special:ChangePassword.
- `[agent-food]` **qwiki-v1-beta Phase 3 cosmetic followups** — Discord username literal "User"; two MediaWiki interface-message pages missing — docs/superpowers/parking/2026-08-11-qwiki-v1-beta-phase3-cosmetic-followups.md (NEW).
- `[decision]` **mvdsv PR #210 remaining action: ping nexus to re-test** — pause-duration block framing fix MERGED 2026-06-07, can't verify Discord-side from repo.
- `[agent-food]` **`pm_rampjump` description for mvdsv help-JSON (if/when mvdsv grows one)** — description text pre-drafted, parked in PR #1120 side findings.
- `[agent-food]` **`cl_voip_demorecord` is dead code** — zero read sites in source, flagged in PR #1120 body; slime's call (snd_voip.c:53).
- `[agent-food]` **`cl_pext_serversideweapon` OnChange handler missing** — forward-declared, definition absent from tree; slime's call (cl_main.c:86).
- `[agent-food]` **ezQuake F1 floor re-baseline** — 8 pre-existing floor failures from qtv-qwfwd Phase-4 grid run, NOT arc-caused — source-walk-gate before bumping EZQUAKE_FLOOR_PROBES.
- `[agent-food]` **L1 extractor trailing-comment harvester precision** — only open residual of the 2026-05-15 classification arc — docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md.
- `[agent-food]` **L1 extractor refinement arc Phase C** — Cat 4 FTE charset watchlist gap, ~30-60 min, closes the arc — docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md + docs/superpowers/parking/2026-05-14-handoff-l1-refinement-phase-c-worker.md.
- `[decision]` **QWiki sandbox modernization arc (spawned 2026-05-09)** — likely superseded by shipped qwiki-v1-beta — operator to confirm-and-delete or revive. apps/qwiki-sandbox/ scaffold confirmed still present 2026-08-11; handover doc: docs/superpowers/parking/2026-05-09-qwiki-sandbox-arc-planning-handover.md.
- `[decision]` **Phase B drain brainstorm (paused mid-session 2026-05-09)** — sister-arc dependency to the QWiki sandbox modernization row above — operator to confirm-and-delete or revive (same coupling); pause doc: docs/superpowers/parking/2026-05-09-qwiki-phase-b-brainstorm-pause.md.
- `[agent-food]` **Re-walk obligation (2026-05-13)** — 15 ezQuake tags + 1 FTE version still carry pre-fix asset_loader_sites rows — Task 3.6 sidecar in docs/superpowers/plans/2026-05-13-asset-type-curate-skill-arc.md, ~10 min idempotent.
- `[agent-food]` **F29 — Phase 3 missed 24+ Infobox 4on4team articles** — `isClanArticle` filter category-driven, falls through on empty categories — one-line broaden fix in apps/qw-oracle/scripts/load-community/clans/index.ts; F29 in docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md.
- `[agent-food]` **New-doc_only-on-next-ezquake-bump alert (standing instruction)** — run `classify-help-json.py --propose` when ezquake HEAD advances; operator manually triages. apps/qw-oracle/scripts/classify-help-json.py confirmed present.
- `[agent-food]` **Help-JSON classifier retired-bucket commit-attribution heuristic looseness** — 30-40% loose commit citations, core claim sound — apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_blame.py confirmed present.
- `[agent-food]` **Synthesis-report numerical-claim provenance discipline** — future validation reports must inline SQL/derivation for every numerical claim (3 acceptable formats) — docs/superpowers/parking/2026-04-29-synthesis-report-numerical-claim-provenance.md (NEW, full body relocated whole).
- `[agent-food]` **docs-web doc-hygiene gap** — apps/docs-web has no CLAUDE.md and is absent from root CLAUDE.md Subsystem scopes + OVERVIEW — add all three (oracle-web-v1 phase docs still cite this as open) — docs/superpowers/plans/2026-08-06-oracle-web-v1/phase-2-scaffold-hello-production.md.
- `[decision]` **docs-web front-page/design brainstorm** — fresh-session brainstorm pending; centerpiece (oracle coverage map) is now Arc B's seed — decide whether front-page work folds into Arc B or runs standalone — docs/superpowers/parking/2026-08-04-oracle-web-direction.md.

## Sidequests

- **Berlin server `dl` fails on 2 newest demos** — unblocks: none (standalone, deferred, no urgency) — rcon sv_demoMaxSize/sv_demoUseCache/sv_demoCacheSize tuning on Berlin; context in the mvdsv PR #210 small-followup row.
- **Lift nginx resolver + variable-upstream pattern to qwiki/qw-stats/phoenix fronts** — unblocks: none (general infra hygiene) — pattern shipped at commit 8f1dfd82 (qw-oracle nginx); audit + lift ~5 min each remaining front; mechanism: startup DNS cache + container-IP drift after Synology backups → silent 502s.
- **Plugin v-table asset detection (loader-sites handler)** — unblocks: none (engine-agnostic finding, no body to migrate) — only plugin:ezhud affected, low pressure — no doc anchor (engine-agnostic finding, no body to migrate).
- **Cvar-binding handler indirection gap (snprintf chains + CVARFC callbacks)** — unblocks: none (engine-agnostic limitation) — bundle reconciliation treats as seedRetained, AST-corroboration signal partial — no doc anchor (engine-agnostic finding).
- **Phase 2e follow-up arc residuals** — unblocks: none (partially superseded) — 1 pre-existing ezquake F2 anomaly (gl_lightmode), triage alongside next ezQuake deep-time refresh.
- **gfx corpus investigation (2026-05-12)** — unblocks: Slipgate Managed Mode (Browse+Manager UI brainstorm input) — docs/superpowers/parking/2026-05-12-gfx-corpus-inventory.md + docs/superpowers/parking/2026-05-12-asset-corpus-investigation-findings.md; raw tarball + working manifest still missing (WSL-era paths gone).
