# demand-driven L3 player-help concept authoring -- locked cross-cutting decisions

These choices apply to every phase. If any phase needs to deviate, surface a
"Deviation" section at the top of that phase MD and stop for operator review.
Mid-arc amendments land here as dated amendment blocks; never silently override
in a phase MD.

**D1-D8 are product decisions** -- resolved in the 2026-06-09 arc-classifier/brainstorm session (`docs/superpowers/parking/2026-06-09-demand-driven-l3-concept-authoring.md`) and the operator+vikpe documentation-architecture brainstorm the same evening (captured in `contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md`). **D9-D16 are build/execution decisions** added by arc-planner, derived from the harness + loader source digests and operator memory.

---

## Product decisions (locked at brainstorm exit)

## D1. Demand-ranked taxonomy + scope

**Decision:** Author the bounded, demand-ranked set of **player-help** concept notes -- ~16-17 notes across Tier-1 (7 new) + Tier-2 (~10). The 24-domain taxonomy and tiering in the parking doc are the menu. Server-admin/hosting (408 threads) is its OWN future arc. The ~11% noise tail is not note-able.

**Why:** 5028 FAQ-candidate threads cluster to 24 note-able domains (89% of demand). Tier-1-new alone blankets ~41% of all FAQ demand. The set is finite and front-loaded, not endless.

**Implication:** No phase invents domains outside the taxonomy. No phase authors server-admin notes (different audience, cross-engine -- deferred). The taxonomy here IS the docs.quake.world guides-portal menu (D6).

## D2. Value-ranking: size for wins, unresolved-rate is a hardness flag

**Decision:** Rank authoring priority by demand **size**. Treat a high unresolved-rate as a "this domain is hard -- the note gives a checklist, not a guaranteed fix" flag, NOT a priority multiplier.

**Why:** The clean high-demand domains have LOW unresolved-rate; the high-unres domains are the hard/niche ones + noise. Size-ranking surfaces the clean wins first.

**Implication:** Tier order follows thread count. The caveated trio (performance/crash/Linux -- high unres) is explicitly deferred (D16), not promoted.

## D3. Note-primary design (platter, not dig)

**Decision:** The design is **note-primary**: a single `search_concepts` retrieval returns precomputed, fact-checked "gold on a platter." L2 (chat) retrieval is the *fallback* that works today, kept as spice/validation, not the substance.

**Why:** The 2026-06-09 hypothesis test proved the engine already answers the majority via L2-fallback (7 NAILED / 4 PARTIAL / 0 wrong), but with 2 confabulations exactly where L1 retrieval was thin. Notes upgrade good->great on two axes: no digging through dirty/high-volume chat, and no confabulation (the note names the exact entities so the model has nothing to invent). weapon-scripts already proved the platter model -- it NAILED its thread with a single retrieval.

**Implication:** Each note must be self-sufficient as the primary answer for its domain. L2 garnish is optional (often skipped).

## D4. Drafts/review split

**Decision:** Claude authors the notes; the **operator reviews the prose** (his gate). The automated draft + the automated acceptance gate (D10) get the note most of the way; operator polish is the final gate before a note is considered done.

**Why:** Operator's framing: "you can actually create most of them, and i can help review the prose." No MCP users yet, so the demand map is the ranking signal, not live usage.

**Implication:** Every note passes TWO gates: the harness (automated) AND operator prose review. Neither alone ships a note. Expect human tweaks on all of them; the automation is the long first draft, not the final word.

## D5. Source-truth synthesis, never confabulate

**Decision:** Notes synthesize from **source truth** -- the complete L1 descriptions (8915 entities, 7 codebases) + full live codebase access + the L2 demand threads. Every claim cites code line / message ID / entity. Never name a cvar/command absent from the grounding.

**Why:** The arc's central value is killing confabulation. The anti-confab guardrail (Phase 0) makes this structural.

**Implication:** A note that names an entity not present in L1 fails the gate (D10 confab-check). Citation discipline is load-bearing, not stylistic.

## D6. Note architecture + single-source-of-truth (per the cross-arc contract)

**Decision:** A note is a **single cross-codebase container**: engine-agnostic core + per-method support-sets + audience-delineated sections (player/admin/both) + per-client deltas + a grounded best-practices layer, with progressive disclosure. Discipline rules: **name-by-domain** (never by-engine), **own-your-layer-and-link** (don't restate primitives another guide owns), **default-to-dominant-client** presentation with deltas as progressive disclosure. L3 notes are the single source of truth for guides; docs.quake.world **renders** them (deterministically, not via an LLM). Full spec: `contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md`.

**Why:** The notes feed a downstream renderer; pulling structure to authoring-time keeps render-time mechanical and preserves the Oracle auto-sync property. weapon-scripts already embodies the shape.

**Implication:** Notes carry the renderer-structure contract (typed `related_entities`, per-method support annotation in prose, audience-tagged sections, asset references). The phase drafters MUST read the contract.

## D7. Normativity boundary

**Decision:** **Grounded** best-practice (engine-optimal form, community consensus) belongs in notes; deep strategy / competitive-tuning / culture / lore goes to the **wiki**.

**Why:** weapon-scripts already gives grounded recommendations ("the recommended form is quickfire via `+fire_ar`") justified by engine-optimal-form, not taste. The concept-notes README's "stay factual" line is honored by keeping recommendations source-grounded; the soft/normative layer is the wiki's.

**Implication:** A note recommends, but every recommendation is grounded in one of the four labeled authority grounds. Pure strategy/tactics is out of scope -> wiki.

## D8. Soft-staleness review trigger

**Decision:** The typed entity-wires auto-flag **fact** drift (a cvar renamed/retired by an extraction-walk). The **best-practices** layer needs a SEPARATE human-review trigger -- a per-note `best_practices_reviewed: <date>` and/or a re-review when a new client onboards.

**Why:** A new client (Xantom's rust port) can land a better idiom that makes a recommendation stale even though every cited cvar is still valid -- the entity-wires won't catch it.

**Implication:** Note frontmatter carries `best_practices_reviewed`. Facts are guarded by architecture; opinions are guarded by a dated review trigger.

---

## Build / execution decisions (arc-planner; derived)

## D9. Methodology = fork `domain-concept-curate` (do NOT extend guide-rewrite)

**Decision:** Fork a new `domain-concept-curate` skill, modeled structurally on **`game-mode-curate`** (synthesize-from-facts, optional-upstream-source triage, HALT/PROCEED rubric, per-claim source-line citation, externalized methodology doc). Lift guide-rewrite's source-truth verification phases -- P3 (L1 verify), P5b (ruleset-restriction scan), P6 (cross-engine + userinfo-hub), P7.5 (operator-consult gate). Do NOT extend `guide-rewrite`.

**Why:** guide-rewrite is a document-conversion skill -- ~5 of its 11 phases assume a pre-existing ezquake.com page (intake validates the file; gap-detection = "what the guide omits"; the gap-report feeds ezquake.com upstream). ~10 of this arc's domains have NO upstream page. game-mode-curate is the authored-from-facts pattern with the acceptance discipline this arc needs already built. Extending guide-rewrite would carry the doc-conversion spine + ezquake.com gap-report as dead weight AND still require building the gate from scratch. This supersedes the parking doc's "reuse guide-rewrite" lean (which predated the detailed skill comparison -- F7).

**Implication:** Phase 0 builds the skill. The skill enforces the note architecture (D6), the discipline rules, the anti-confab guardrail (D5), and wires the harness gate (D10).

## D10. Acceptance gate = 80/20 harness

**Decision:** The per-note acceptance gate is the generalized hypothesis-test harness, built 80/20:
- **Deterministic + lifted from the POC:** domain -> its cluster threadIds, the four-tool retrieval, the grounding-bundle assembler, the confabulation-check (claimed-entity tokens verified against L1).
- **Workflow-subagent** generates the fresh-Claude answer from grounding only (D11).
- **Scoring** by a judge-subagent OR operator eyeball. A full auto-scorer is a stretch goal, NOT gate-v1.

**Gate criteria:** the note moves its domain's representative threads dig/PARTIAL -> platter/NAILED AND introduces **zero** confabulated entities. Operator prose review is the second gate (D4).

**Why:** The confab-check is the high-value deterministic guard and lifts cleanly; the auto-scorer is the speculative part. Human review is the final gate anyway, so the automation does not need to be perfect to be worth a lot.

**Implication:** Phase 0 builds the runner. Phases 1-3 gate every note through it before operator review.

## D11. Programmatic answers route through Workflow subagents (NOT the Anthropic SDK)

**Decision:** The harness's "fresh-Claude answer" step (and any other batch/programmatic LLM call in this arc) routes through **Workflow subagents**, never `@anthropic-ai/sdk`.

**Why:** Operator runs Max x20 subscription, **no API key** (`reference_max_subscription_no_api_key`). An SDK path has no credential and would fail. This is the single biggest build item in Phase 0 and the easiest to get wrong.

**Implication:** The runner is invoked from within a Claude Code session that can dispatch Workflow subagents. Respect the rate-limit + honest-count discipline (`reference_workflow_rate_limit_and_args`).

## D12. Harness location + generalization (verified)

**Decision:** The harness scripts already live at `apps/qw-oracle/scripts/calibration/scratch/faq-hypothesis-test/` (untracked scratch), with a committed run snapshot in `outputs/`. Generalize them into a per-domain runner: replace the hardcoded 11-thread list + the rank->domain map with **domain -> threadIds from the cluster JSON** (`scripts/calibration/scratch/faq-clusters.json`), and replace the `/tmp/faq-test/` I/O with stable per-domain output dirs.

**Why:** Source-verified (the parking doc's "in /tmp" framing is stale -- F1). The grounding-bundle assembler, retrieval calls, and confab primitive lift as-is; domain-binding, the Workflow answer step, and scoring are the new build.

**Implication:** Phase 0's runner-build subagent starts from the existing scratch scripts, not from scratch.

## D13. Loader + runtime constraints

**Decision:** Honor the `load-concepts` contract: **Bun only** (never npm -- the `@qw/version-resolution: workspace:*` dep breaks npm even with `--no-workspaces`); JSONB via `tx.json` (never pre-stringify); the loader **scans the whole `curated/concept-notes/` dir** (no single-file interface); a note is **FTS-retrievable the moment it is upserted** (the `tsv` column is GENERATED) -- embeddings are an optional separate pass, so the load->gate loop does not hard-block on `VOYAGE_API_KEY`.

**Why:** Verified from the loader source digest. The FTS-on-upsert property de-risks the gate loop. The Bun/JSONB rules have named regression scars.

**Implication:** `bun run load-concepts` after authoring; `bun run embed:chunks` to backfill vectors when the key is present. Tests pin `qw_oracle_test` -- never point them at dev/prod.

## D14. Fan-out shape + model/effort

**Decision:** Notes are independent within a tier -> draft them as **parallel subagents at Sonnet MAX** (judgment-dense multi-source synthesis; matches the existing notes' class). Phase-0 code synthesis (runner + skill build) = Sonnet MAX or Opus medium. Cross-cutting / architectural / post-arc analysis = Opus MAX. The guardrail prompt-rule edit = inline / Haiku.

**Why:** Operator memory `feedback_model_effort_range` -- Sonnet-medium floor for reasoning, Opus MAX ceiling, calibrate per task shape. The existing notes are Sonnet-high-class work.

**Implication:** Each note-draft subagent runs in independent context, keeping the orchestrating main thread's budget moderate.

## D15. Phase 0 is one atomic machinery phase

**Decision:** Phase 0 ships the three machinery deliverables (anti-confab guardrail + per-domain harness runner + `domain-concept-curate` skill) as ONE phase, with runner-build and skill-build delegated to **separate subagent tasks**. Split into 0a/0b only if the executor budget projects past ~400k.

**Verification (no regime collision):** Phase 0 is verified against the **3 existing notes** -- the runner must score weapon-scripts NAILED + zero-confab on its domain threads, and the skill must produce a structurally-valid note. It does NOT require any Phase-1 note to exist.

**Why:** All three are prerequisites for authoring a single gated note; keeping them atomic preserves phase atomicity; subagent delegation manages context. weapon-scripts already passed the gate's manual precursor, so it is the ready-made fixture.

**Implication:** Phases 1-3 may assume the guardrail, runner, and skill exist.

## D16. Caveated trio deferred

**Decision:** The caveated trio (performance/stutter, crash, Linux) is NOT committed as Phase 3 yet. Defer the in/out decision until Phase 1-2 ship.

**Why:** They are lower-demand and high-unresolved-rate (honest checklists, not fixes). Bank the clean wins first, then decide with momentum data.

**Implication:** Phase 3 is a decision-point, not a deliverable, until revisited. The README phase index marks it provisional.

---

## Amendment log

(Mid-arc amendments land here as dated blocks under the relevant D-number. None yet.)
