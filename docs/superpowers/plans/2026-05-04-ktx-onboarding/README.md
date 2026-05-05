# KTX Layer 1 Onboarding -- arc plan

**Spec:** `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` (closed five-pass arc-brainstorm)

**Sibling spec:** `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md` (Pass 2 -- prod-MCP update lifecycle, generalised to all codebases)

**Goal:** Onboard canonical KTX (https://github.com/QW-Group/ktx) -- the C-language QuakeWorld server modification -- into QW Oracle Layer 1. Includes Pass 1 first-class entity types (cvar / command / info_key / log_template), Pass 5 gameplay-content surface (5 enum taxonomies + 5 struct-array tables + 7 XSD-defined match-event types), three pure-additive migrations, and the cross-header Pattern 6 lift that all future engines benefit from.

**Status:** Planning. Per-phase MDs are drafted by fresh terminals following the per-phase drafter prompts (`phase-N-drafter-prompt.md`). Each phase MD is verified by a sub-agent before operator review. Phases land in commit order; each phase boundary is operator-reviewed before the next phase begins.

**Total schema impact:** 9 CHECK widenings + 1 new table (`match_event_versions`), split across migrations 008 / 009 / 010.

**Total row impact (per KTX tag):** Pass 1 first-class entity rows (cvars / commands / info_keys / log_templates -- counts in spec) + ~450 qw-namespace gameplay rows + 7 match_event entity rows.

---

## Where we are right now

- **Stage:** planning-drafting (per-phase MD drafts in progress).
- **Last action:** 2026-05-05 -- Phase 0 MD approved (1 ADVISORY, 0 CRITICAL, 0 SUBSTANTIVE; F22 added during drafting -- VALIDATION-RUNBOOK.md is the 5th doctrine site).
- **Next action:** open fresh terminal, paste contents of `phase-1-drafter-prompt.md`.

Update these three lines whenever a phase boundary changes state. They are the source of truth for "where am I" when picking the arc back up cold.

---

## Read in this order

If you're new to this arc, read top-to-bottom:

1. **[`prerequisites.md`](prerequisites.md)** -- Operator-side one-shot setup. Verify Arc 1 inheritance + KTX-specific items.
2. **[`decisions.md`](decisions.md)** -- 20 locked cross-cutting decisions (spec-is-truth, libclang-not-tree-sitter, cross-header lift, three migrations, handler grouping, etc.). Every phase respects these.
3. **[`review-findings.md`](review-findings.md)** -- Locked count anchors + spec callouts. Phase drafters must reproduce the count anchors verbatim; the audit trail explains why each is load-bearing.
4. **[`phase-template.md`](phase-template.md)** -- Mandatory shape for each phase MD.
5. **Per-phase MDs** (drafted in order; see "Phase index" below).

If you're the fresh terminal that's about to draft a phase, also read:

6. **[`handoff-prompt.md`](handoff-prompt.md)** -- Your orientation. Tells you what this arc is, what context you'll need, what sub-agent verification looks like, and how to halt for review.

---

## Phase index

Phases land in order. Each phase commits a coherent unit (per `decisions.md` D16). Operator reviews at phase boundaries before the next phase starts.

Phases 2 / 3 / 4 / 5 / 6 are mutually independent at the data level after Phase 1 lands the foundation; they CAN draft in parallel (orchestrator decides).

| Phase | Status | MD | Drafter prompt | Deliverable | Runnable state at end |
|---|---|---|---|---|---|
| 0 | approved | `phase-0-doctrine-fixes.md` | (drafted; n/a) | KTX-is-libclang doctrine fixes across 5 reference sites (F19 + F22) + delete obsolete `scripts/extractors/ktx/commands.ts` + create OUT_OF_SCOPE.md | Repo doctrine matches reality; obsolete TS regex extractor gone; KTX SKIP catalog established |
| 1 | not started | `phase-1-foundation.md` | `phase-1-drafter-prompt.md` | Pattern 6 cross-header lift in `extractor_lib._source` (depth-1 #include walk) + migrations 008/009/010 + new `gameplay_sources` row for `'ktx'` | Schema admits all KTX content; cross-header macros resolve for any engine |
| 2 | not started | `phase-2-pass1-entity-handlers.md` | `phase-2-drafter-prompt.md` | Pass 1 first-class entity handlers (cvars + commands + info_keys + log_templates) + 4 loader wirings + KTX dispatch wiring in `extract-tag.ts` | KTX cvars + commands + info_keys + log_templates queryable in dev DB |
| 3 | not started | `phase-3-modes-handler.md` | `phase-3-drafter-prompt.md` | `_handler_modes.py` + `load-modes.ts` (game_mode catalog 27 rows + mode_default overlays ~309 rows) | game_mode + mode_default rows queryable; mode-aware queries possible |
| 4 | not started | `phase-4-taxonomies-handler.md` | `phase-4-drafter-prompt.md` | `_handler_gameplay_taxonomies.py` + `load-gameplay-taxonomies.ts` (election_type 5 + death_rule 27) | election_type + death_rule rows queryable; qw-event-log validation harness anchor available |
| 5 | not started | `phase-5-tables-handler.md` | `phase-5-drafter-prompt.md` | `_handler_gameplay_tables.py` + `load-gameplay-tables.ts` (monster 13 + score_system 3 + drop_item 30 + loc_macro 15 + teamplay_message 21) | All 5 Group-B struct-array kinds queryable |
| 6 | not started | `phase-6-match-event-handler.md` | `phase-6-drafter-prompt.md` | `_handler_match_events.py` (XSD-driven; not libclang) + `load-match-events.ts` (7 entity rows + 13 emission sites) | match_event entity type populated; qw-event-log validation harness fully unblocked at schema level |
| 7 | not started | `phase-7-validation.md` | `phase-7-drafter-prompt.md` | F1 quality-grid probes for all KTX kinds + JSONB-binding regression gate + validation runbook + cross-project audit | KTX onboarding has same auditability as the 4 prior engines |
| 8 | not started | `phase-8-end-of-arc-docs.md` | `phase-8-drafter-prompt.md` | SCHEMA.md slim-doc Arc 1 refresh sweep (absorbs HANDOVER backlog item) + EXTRACTOR-PLAYBOOK additions (Pre-Port Discovery Sweep + Pre-Commit Discovery Cross-Check + Handler-grouping rationale + Pattern 15 STRING_LITERAL-array walker) | Docs caught up; arc done |

When a phase MD lands, change `not started` -> `drafted (awaiting review)` -> `approved` -> `in execution` -> `shipped`.

---

## Phase dependency map

```
Phase 0 (doctrine fixes; markdown-only)
   |
   v
Phase 1 (foundation: Pattern 6 lift + 3 migrations + gameplay_sources row)
   |
   +---> Phase 2 (Pass 1 entity handlers + loaders)
   +---> Phase 3 (modes handler; needs Pattern 6 lift from Phase 1)
   +---> Phase 4 (taxonomies handler)
   +---> Phase 5 (tables handler)
   +---> Phase 6 (match_event handler; XSD-driven)
              |
              v
         Phase 7 (validation: F1 probes + runbook + cross-project audit)
              |
              v
         Phase 8 (end-of-arc obligations)
```

Phases 2 / 3 / 4 / 5 / 6 are mutually independent. Phase 3 has a soft dependency on Phase 1's Pattern 6 lift (cross-header macros must resolve before `_handler_modes.py` runs); other phases are foundation-only.

---

## Slicing rationale (load-bearing for orchestrator)

The arc is **horizontal-foundation-then-fan-out**: a 5th codebase added to a working extraction pipeline. Verification regimes are self-contained at each phase boundary (per-handler row counts, F1 probes, doc-state) -- no regime collisions where Phase N depends on Phase N+1 to verify.

**Why 9 phases (not 7-8 or 10+):**
- Phase 0 separated from Phase 1 to keep the inline-only doctrine sweep clear of Phase 1's Python/SQL work (preserves the `feedback_no_subagents_for_mechanical_edits.md` rule).
- Pass 5's four gameplay handlers (Phases 3 / 4 / 5 / 6) are split into four phases instead of bundled because each handler has a distinct walking strategy (STRING_LITERAL-array vs enum-decl vs INIT_LIST_EXPR vs XSD), distinct loader file, and distinct kinds. Bundling would push Phase context budget past the 350k smell zone (per `references/arc-phase-archetypes.md` projections).
- Phase 7 and Phase 8 separated because validation (Phase 7) is code/runbook work; doc obligations (Phase 8) are markdown work. The execution-mode boundary stays clean.
- Phase 8 absorbs the HANDOVER backlog item ("qw-oracle slim-doc Arc 1 refresh sweep") -- sequencing rationale: KTX adds the 5th `log_template_versions.channel` value; doing the sweep BEFORE KTX migrations would document 4 channels and re-stale immediately.

**Estimated context budgets per phase** (with subagent-default; <350k smell zone):

| Phase | Budget projection | Subagent vs inline |
|---|---|---|
| 0 | ~80k | Mostly inline (markdown sweep + 1 deletion) |
| 1 | ~250k | Subagent for Pattern 6 lift (Sonnet medium); migrations + gameplay_sources INSERT inline |
| 2 | ~350k | 4 subagents for handlers (Sonnet medium each); loader wirings inline |
| 3 | ~300k | Subagent for modes handler (Sonnet MAX -- depends on cross-header + ~336 rows); loader subagent (Sonnet medium) |
| 4 | ~200k | Subagent for taxonomies handler (Sonnet medium); loader inline |
| 5 | ~250k | Subagent for tables handler (Sonnet MAX -- 5 kinds); loader subagent (Sonnet medium) |
| 6 | ~150k | Subagent for match_event handler (Sonnet medium -- XSD parse + grep); loader inline |
| 7 | ~250k | Subagents for F1 probes (Sonnet medium) + cross-project audit (Opus medium) |
| 8 | ~150k | Mostly inline (markdown sweep across 3 slim docs + 4 PLAYBOOK additions) |

---

## Other artifacts in this directory

- (None yet -- no legacy plan to migrate. The five-pass arc-brainstormer closed without a prior plan attempt.)

---

## Why split into per-phase MDs?

Two reasons:

1. **Context window discipline.** A monolithic plan would crowd the executor's working memory across 9 phases of ~250k average context each. Per-phase MDs land independently with their own verification probes; executor terminals stay under the smell zone.

2. **Verification at boundaries.** Each phase MD gets a dedicated sub-agent verification pass before operator review. The qw-oracle Arc 1 monolithic plan's 18 review findings (wrong CHECK enums, missing tables, wrong column lists, FK convention break) all came from cross-cutting hand-typed SQL the author hadn't checked. Per-phase MDs + targeted sub-agent verification catches drift mechanically.

The split is structural, not just cosmetic. See `decisions.md` D5 (three migration files split semantically) and D6 (handler grouping by walking strategy) for the accompanying philosophy.

---

## What this arc deliberately does NOT cover

Per `decisions.md` D1 + the spec preamble's "Out of scope":

- **Dusty-ktx fork** -- separate fork-onboarding arc; will subclass canonical KTX handlers + add tree-sitter for `qcsrc/`.
- **KTX QuakeC client modules** -- none exist in canonical repo; `dusty-ktx/qcsrc/` is fork-add-on.
- **Bucket-3 indexed-family cvars** (k_motd1-9, k_ml_0-5) -- documented in OUT_OF_SCOPE.md per Pass 1.1.
- **Truly orphaned drift cvars** (k_666, k_dm2mod, k_no_vote_break, k_specktalk) -- documented in OUT_OF_SCOPE.md.
- **lsType_t / gameType_t / fb_spawn_t / stats_format_t / fixed_maps_list[]** -- documented in OUT_OF_SCOPE.md per Pass 4.3 / 4.4.
- **Layer 3 concept notes** for KTX content (game-modes index, matchlog format, mutators) -- get rich Layer 1 anchors from this arc but stay Layer 3 work; tracked at `docs/superpowers/parking/2026-05-04-ktx-layer3-concept-note-candidates.md`.
- **Mode-vs-map support relation modeling** -- soft-captured at `docs/superpowers/parking/2026-05-04-ktx-map-mode-support-maphub.md`; future arc.
- **Layer 1 database design audit** -- HANDOVER sidequest, runs AFTER KTX onboarding ships.
- **Retroactive extractor-rationale audit** for ezQuake / FTE / QWCL / MVDSV -- HANDOVER sidequest from Pass 5.3 close.
- **Embeddings + description derivation for KTX rows** -- inherited from Arc 1's existing pipeline; no new work in this arc.
- **Consumer-snapshot regen** -- decoupled per the prod-update-lifecycle spec; out of band, operator-discretion.
- **Prod deploy** -- the dump-restore mechanism per the lifecycle spec is the canonical path; nothing arc-specific.

If a phase drifts into one of these, that's a scope creep -- flag it.

---

## Operator quick-reference

- **Kicking off a fresh phase-drafting session:** open a new terminal, paste the contents of the relevant `phase-N-drafter-prompt.md` (pre-rendered per-phase prompt; no edits needed). Phase 0 is already drafted; start with `phase-1-drafter-prompt.md` if you're picking up after Phase 0 review.
- **Reviewing a drafted phase:** read the phase MD top-to-bottom, run the verification queries listed at the bottom, eyeball the file lists / SQL / source-walked count anchors, sign off. Update the phase index "Status" column AND the "Where we are right now" lines at top of this README.
- **A finding resolves but conflicts with a decision:** the decision wins; reject the finding with a one-line rationale in the phase MD's "Open questions" section. If the decision itself is wrong, amend `decisions.md` with a dated block before re-running the phase draft.
- **A new finding emerges during phase drafting:** append to `review-findings.md` with a sequential F-number and tag which phase resolves it.
- **A spec commitment turns out to be wrong during phase drafting:** halt and surface to operator; the spec is locked per D1 but amendments via the operator's explicit decision are possible. The amendment lands in the spec's relevant pass section + a `decisions.md` amendment block.

---

## Post-arc handoff

After all 9 phases ship and `arc-reviewer` runs the spec-vs-shipped walkthrough (per `arc-reviewer` skill), the arc is done. Layer 3 concept notes and the Layer 1 database design audit are follow-ons (separate arcs).

The qw-event-log validation harness parking doc (`2026-04-XX-qw-event-log-cross-validation.md`) becomes unblocked at the schema level the moment Phase 6 ships -- match_event rows are the Layer 1 anchors it needs.
