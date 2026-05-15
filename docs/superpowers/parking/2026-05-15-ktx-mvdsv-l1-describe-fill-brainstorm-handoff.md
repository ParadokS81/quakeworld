# Fresh-terminal handoff: KTX/MVDSV L1 describe-fill -- arc-brainstormer

> Paste everything below as the first message in a fresh `claude` terminal.

---

We are running the multi-pass brainstorm for the **KTX/MVDSV Layer-1 describe-fill arc** (the server-config knowledge-base foundation). This arc was captured 2026-05-15 by arc-classifier mode W after its conceptual brainstorm already converged in a prior session -- your job is NOT to re-derive the concept; it is to turn the operator-locked conceptual model into an implementable design spec across multiple passes, because the surface area (KTX vs MVDSV, synthesis policy, provenance graduation, staleness anchoring, multi-projection contract, wiki-feed mechanism, upstream one-way export) is too large for a single brainstorm.

Orientation in one paragraph: every admin-configurable KTX/MVDSV entity (cvars, commands, cmdline, info_keys) must end up with a sensible, provenance-stamped Layer-1 description, forming the baseline the docketed 27 game-mode concept notes and a multi-consumer KB (MCP / Slipgate snapshot / future web server-manager / wiki.slipgate.me) build on. The configurable elements are ALREADY fully extracted; the gap is descriptions. ~60% of KTX cvars already have human prose in shipped configs; the residue is legible from source behavior; opinion/recommended-values are excluded from L1 by design and live in L3.

**Invoke the skill:** `arc-brainstormer` (custom skill at `~/.claude/skills/arc-brainstormer/`; it is shipped). If for any reason it is unavailable, fall back to `superpowers:brainstorming` single-pass and tell the operator you are doing so.

**Required reads (in this order, before asking anything):**
1. `docs/superpowers/parking/2026-05-15-ktx-mvdsv-l1-describe-fill.md` -- this arc's capture (why arc-shaped, scope, the operator-LOCKED conceptual model, open questions, NOT-in-scope, operator notes). The "Scope sketch" + "Operator notes" sections are load-bearing; the conceptual model is locked, do not relitigate it.
2. `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/gap-findings.md` -- the verdict + 7 prioritized threads. Then `README.md` (coverage tables) and skim `probe-0-l1-baseline.md` (the denominators) + `coverage.ndjson` (machine manifest).
3. `docs/superpowers/parking/2026-05-09-ktx-game-mode-l3-concept-notes.md` -- the downstream arc this is the foundation for.
4. `apps/qw-oracle/API_CONTRACTS.md` + `apps/qw-oracle/curated/concept-notes/README.md` -- the contracts and L3 surface this must respect.
5. Memory entries: `project_qw_oracle_source_truth`, `reference_ezquake_dual_doc_model`, `project_l1_seed_l3_layering`, `project_concept_notes_vertical_slice`, `feedback_repair_by_reextract_not_sql_update`, `feedback_exhaustive_mapping`, `reference_upstream_pr_attribution`, `feedback_cheap_probes_inform_expensive_passes`.

**Operator preferences carried forward (non-negotiable):**
- Operator is a non-coder. Plain-English-first at every decision point; lead with what changes and the recommendation, technical chain only where it carries decision content.
- One question at a time during the brainstorm passes. No multi-question dumps.
- ASCII only, no em-dashes, no filler in any committed doc/spec.
- Be decisive: give the architectural recommendation, do not poll for agreement. Operator pace estimates beat conservative ones; surface only concrete blockers.
- The conceptual model in the capture doc is LOCKED (single source of truth + generated projections; three-tier description model; provenance graduation; staleness anchoring; L1-fact/L3-opinion boundary; KTX-first sequencing). Passes refine HOW, not WHETHER.

**First action on cold start:**
1. Do the Required reads.
2. Invoke `arc-brainstormer`.
3. Name the brainstorm passes up front (suggested seed, the skill will refine): Pass 1 = provenance + staleness schema (graduation path, de-dup, anchor-version, re-review trigger); Pass 2 = source-synthesis method + quality bar + review gate; Pass 3 = mechanical-extract pipeline + nQuake-vs-in-repo drift resolution + the ezquake.com Phase-0 probe; Pass 4 = multi-projection data contract (one schema, N serializers) + wiki-feed mechanism; Pass 5 = upstream one-way-export discipline + carryover-lessons-as-constraints + KTX/MVDSV phase sizing + relationship to the game-mode arc.
4. Confirm the pass plan with the operator (one message), then begin Pass 1 with one question.
