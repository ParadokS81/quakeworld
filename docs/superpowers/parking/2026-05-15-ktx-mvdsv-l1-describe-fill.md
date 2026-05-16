# KTX / MVDSV Layer-1 describe-fill (server-config KB foundation) -- arc capture

**Captured:** 2026-05-15 by arc-classifier mode W (operator override; invoked mid-brainstorm after the conceptual model converged).
**Status:** arc-brainstormer in progress. Passes 1-4 COMPLETE (P1 provenance + staleness schema D1-D4, P2 synthesis method + quality bar + review gate D5-D8 + constraints C1/C2 -- 2026-05-15; P3 mechanical-extract pipeline + drift/conflict policy + Phase-0 probe bundle D9-D12 + cross-cutting C3, amends D4/D6/D7 -- 2026-05-16; P4 multi-projection data contract + wiki-feed mechanism D13-D15 -- 2026-05-16; all in `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`). Pass 5 pending; resume cold via `docs/superpowers/parking/2026-05-16-ktx-mvdsv-l1-describe-fill-pass5-handoff.md`.
**Trigger to start:** operator-initiated; conceptual brainstorm already done (this is its capture). Cheap prerequisite probe (gap-findings thread #1) can run before or as arc Phase 0.

## Why this is arc-shaped

Six criteria fired (>=2 needed; 3+ is unambiguous):

- **(1) Multi-session.** Shared-discipline design + KTX fill + MVDSV fill + staleness/validation + upstream export + wiki projection exceeds one session at any reasonable context budget.
- **(2) Multi-phase deliverable.** Decomposes into phases that each ship runnable state (discipline scaffold -> KTX mechanical extract -> KTX source-synth -> MVDSV quantification probe -> MVDSV fill -> staleness/validation -> upstream export -> wiki projection).
- **(4) Spec required.** The provenance graduation rules, source-synthesis policy, staleness anchoring, L1-fact/L3-opinion boundary, and multi-projection data contract must be a design doc BEFORE an implementation plan can ship.
- **(5) Cross-cutting decisions.** 6+ commitments every phase respects: provenance graduation; source-synth method + quality bar; staleness anchoring; L1/L3 boundary; multi-projection contract; upstream one-way-export discipline; KTX-first sequencing.
- **(6) Verification regime per phase.** Each phase has its own gate (extract counts vs probe-0 denominators; synth descriptions anchored + stale-flagged; ezquake.com overlap quantified; projection round-trips clean).
- **(8) Post-arc review wanted.** Warrants a fresh-terminal walkthrough: did every admin-configurable entity get a provenance-stamped description; replay representative MCP queries.

## Scope sketch

The arc delivers the **foundation**: every admin-configurable KTX/MVDSV entity (cvars, commands, cmdline params, info_keys) carries a sensible, provenance-stamped description in Layer 1. That baseline is what the separately-docketed 27 game-mode concept notes, and the broader multi-consumer KB, build on. End state: an LLM via the MCP, the Slipgate JSON snapshot, a future web server-manager UI, and the wiki site can all answer "what does setting X do" from one source of truth, each description honestly tagged extracted-from-artifact / synthesized-from-source-behavior, with opinion structurally excluded from L1. This is the "deferred L1 server-config KB arc" `2026-05-15-ktx-mvdsv-doc-landscape/gap-findings.md` already named.

The grounding evidence already exists and must be the brainstorm's first read: the 2026-05-15 doc-landscape investigation proved (a) the configurable elements are ALREADY fully extracted -- the engineering-heavy half shipped during the ezquake/MVDSV extractor work; the gap is descriptions, not entities; (b) ~60% of KTX cvars already have human prose in shipped configs (in-repo + nQuake), with the residue legible from source behavior; (c) the structural tier is 100% complete and needs no prose.

The conceptual model is **operator-locked** (this conversation) and the brainstorm must NOT re-derive it -- it must turn it into an implementable spec: single source of truth with generated projections (MCP / Slipgate snapshot / web UI / wiki are render targets, never hand-edited); a three-tier description model (mechanical-extract from a real shipped artifact / source-synthesis from observable call-site behavior / opinion -> banished to L3); a provenance graduation path (a description is born `synthesized`, can graduate to `source_inline` ONLY on deliberate, logged upstream adoption, de-duplicated so our own contribution cannot echo back as independent source truth -- the ezquake comment-promotion-revert lesson); staleness anchoring (a synth description is pinned to the source version it was written against and auto-flagged for re-review when the underlying extracted fact drifts); and a hard L1-is-fact / L3-is-opinion boundary that keeps L1 trustworthy by construction.

Sequencing is **layered, not split by engine**. The discipline/method is identical for both engines and is the expensive part -- designed once. KTX goes first (cleanest case: shipped configs are the gold mechanical surface, no external blocker, and it unblocks the docketed game-mode concept notes which cite L1 anchors). MVDSV rides the same machinery second, after one cheap prerequisite probe (quantify ezquake.com/docs/settings/server.html overlap vs MVDSV's 183 cvars -- the single biggest unknown for the worst-covered domain; gap-findings thread #1). The verified one-line MVDSV-commands loader fix (gap-findings thread #2; root cause confirmed against live AST + `load-commands.ts`) is a free 28/108 win that can ride early.

## Open questions for the brainstorm

- Source-synthesis method + quality bar: how does Claude write a cvar description from call-site behavior; what is the citation/anchor format; what is the review gate before a synth description is committed?
- Provenance schema concretely: reuse `description_origin` as-is, or extend states/columns for the graduation path + upstream-contribution-frozen marker + staleness-anchor-version? What is the exact de-dup rule that prevents self-echo on re-extract after upstream adoption?
- Staleness mechanism concretely: which underlying-fact change triggers a synth-description re-review flag (default change / enum change / value-range / read-site move), and what is the re-review workflow?
- Mechanical-extract pipeline: parser for shipped-config enum tables into structured `{value,label}` + default + type + range; how does it resolve nQuake-vs-in-repo drift (provenance + source wins on behavior + config opinion becomes an L3 recommended-value note)?
- The ezquake.com quantification probe: arc Phase 0, or a pre-arc sidequest that gates only the MVDSV phase sizing?
- Multi-projection data contract: the exact structured shape the snapshot/UI consumers need (structured fields first-class) vs the MCP/embedding shape -- one schema, N serializers?
- Wiki-feed mechanism: bot-generated read-only renders (stamped auto-generated) or seeded-then-editable pages? How does the projection reach wiki.slipgate.me (qwiki-v1-beta) without dual maintenance?
- Upstream one-way export: which artifacts (empty GitHub wiki tabs / `// comment` PRs / repo `cvars.md`); attribution discipline (Assisted-by, operator signs, never Signed-off-by from AI); how is contributed text frozen so re-extraction does not re-import it as native source truth?
- Scope of "all entities": admin-configurable tier only (confirm structural tier excluded); is the KTX modes catalog handled here or deferred to the game-mode notes arc?
- Judgment-tier residue (k_fbskill_* bot cvars etc.): is "honest mechanism-only, no recommended value" an acceptable L1 description that satisfies the success criterion, with the recommended-value piece tracked to L3/community?
- Which specific ezquake/MVDSV hard-earned lessons become explicit arc constraints (comment-promotion revert / two-audience model / repair-via-reextract / exhaustive-mapping / F1 validation grid / upstream-PR attribution)?
- Relationship with the docketed game-mode L3 arc: hard dependency (this arc fully before that one) or can that arc's wiki-rich modes proceed in parallel once KTX L1 cvars/commands land?

## What is NOT in scope

- The structural tier (log_templates, protocol, qc_builtins, gameplay_tables/taxonomies, match_events) -- already ~100% complete in L1 from structured extraction; the investigation proved it needs no admin prose. Confirm-exclude, do not relitigate.
- Recommended-value / best-practice settings as L1 facts -- L3 concept-note content by the locked L1-is-fact / L3-is-opinion boundary. Not an L1 deliverable.
- The 27 game-mode concept notes themselves -- separately docketed (`2026-05-09-ktx-game-mode-l3-concept-notes.md`). This arc is their foundation, not their replacement.
- Re-extraction of the configurable element set -- already done (probe-0). This arc fills descriptions; it does not re-derive entities.
- Inventing a new documentation format (no `docs.json` analog) -- the qw-oracle L1 + L3 model IS the format. Locked this conversation.
- The Slipgate server-manager UI and the wiki rendering UX -- consumer surfaces. This arc defines the data contract they consume, not their UX.

## Operator notes

- Operator is a non-coder ("from a layman that is NOT a coder, but vibe coded these projects"). Plain-English-first at every decision point is mandatory, not calibration.
- Operator's core framing (verbatim): *"complete extraction of the configurable elements. And that each element will have a sensible description. which, together with our research, will be the building blocks for the concept notes. and in the end.. we have a deliverable product capable of serving multiple consumer surfaces."*
- Consumers named by operator: LLM via MCP; Slipgate JSON snapshot; a future web interface to set up / manage a server; the new wiki site (wiki.slipgate.me / qwiki-v1-beta). "all would benefit from proper documentation."
- Dual-maintenance principle (verbatim intent): *"we would feed the wiki, from our layer1/concept notes so we dont have to dual maintain."* Locked as: single source of truth, generated projections.
- Long-term hope: upstream KTX/MVDSV adopt it so descriptions flow back from source; short-term reality: we build it ourselves alongside. Captured as the provenance graduation path.
- Operator explicitly wants the hard-earned ezquake/MVDSV documentation lessons carried over as arc constraints (see Related).
- KTX-first sequencing is operator-aligned (this conversation), NOT a brainstorm-open question. The brainstorm sizes phases; it does not relitigate engine order or the locked conceptual model.
- ASCII-only / no em-dashes / no filler in committed docs and code (`feedback_output_discipline_sentiment.md`); natural voice fine in conversation. One question at a time in the multi-pass brainstorm (`feedback_one_question_at_a_time.md`). Operator pace estimates beat conservative ones; surface concrete blockers only (`feedback_trust_operator_pace_estimates.md`).

## Related

- `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/` -- the grounding evidence map. MANDATORY first read: `README.md` (picture), `gap-findings.md` (verdict + 7 prioritized threads; #1 ezquake.com quantification gates MVDSV, #2 verified loader fix), `coverage.ndjson` (machine manifest), `probe-0..5`.
- `docs/superpowers/parking/2026-05-09-ktx-game-mode-l3-concept-notes.md` -- the docketed game-mode L3 arc this is the foundation for (already cross-references gap-findings).
- `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md` -- the wiki projection target (Phases 1-3 shipped at wiki.slipgate.me).
- `apps/qw-oracle/curated/concept-notes/README.md` + `OPERATIONS.md` -- L3 surface this feeds.
- `apps/qw-oracle/API_CONTRACTS.md` -- Discovery/Query/Storage contracts + citation discipline the multi-projection contract must respect.
- Memory: `project_qw_oracle_source_truth`, `reference_ezquake_dual_doc_model` (the comment-promotion-revert lesson), `project_l1_seed_l3_layering`, `project_concept_notes_vertical_slice`, `project_layer3_two_path_curation`, `feedback_repair_by_reextract_not_sql_update`, `feedback_exhaustive_mapping`, `reference_upstream_pr_attribution`, `feedback_cheap_probes_inform_expensive_passes`, `project_extraction_pipeline_vision`.
- HANDOVER "Future arcs (waiting on trigger)" -- this realizes the "deferred L1 server-config KB arc" reference in gap-findings.
