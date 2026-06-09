# #helpdesk FAQ-discovery -> product: brainstorm kickoff (fresh terminal)

**For:** a FRESH terminal to brainstorm *"how do we make the #helpdesk FAQ-discovery actually useful"* -- turning the demand signal into L3 concept-notes / active assistance. This is a BRAINSTORM (plain prose; systems/product, NOT UI mockups). Use `superpowers:brainstorming`; `arc-classifier` will intercept if it turns out arc-shaped.
**Date:** 2026-06-09.

## Where things are

- **L2 corpus reconstruction arc** (`docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/`): the #helpdesk backfill is **COMPLETE (7/7 years, 6623 threads)**, fenced + embedded + cold-verified into the dev DB. The other channels (#quakeworld / #dev-corner / #antilag) are **PAUSED at a clean checkpoint** (weekly budget -- the fence fan-out was the cost) -- resumable from `apps/qw-oracle/scripts/load-chat/backfill-ledger.md`.
- **Pivoted to FAQ-discovery on #helpdesk** (highest-yield channel + cheap to analyze): clustered the 5028 solved+unresolved threads into **48 topic clusters** (free, deterministic k-means on the voyage embeddings) and built an offline HTML browser to inspect them.
- **The product question is now open:** the FAQ landscape shows real DEMAND (what people ask, ~21% unresolved). How does that drive the actual product?

## Reads required (in order)

1. `docs/superpowers/parking/2026-06-09-helpdesk-faq-landscape.md` -- the FAQ landscape: 48 clusters with sizes, unresolved-rates, terms, representative threads. **START HERE** -- it's the demand map.
2. Memory: `project_qw_oracle_product_vision` (the real product is *construction not retrieval*; L3 encodes patterns), `project_layer3_two_path_curation`, `project_l3_sub_shape_patterns`, `project_concept_notes_vertical_slice`, and `feedback_prose_brainstorm_for_architecture` (plain prose for systems brainstorming).
3. `apps/qw-oracle/VISION.md` + the L2 arc `decisions.md` (esp. D8 -- buckets-E deferred; the FAQ-discovery framing).
4. For how L3 notes get authored TODAY: the `guide-rewrite`, `asset-type-curate`, `game-mode-curate` skills + `reference_layer3_concept_note_template`.

## Live resources (you have full access)

- **Dev DB** (`DATABASE_URL` -> Postgres `qw_oracle`): query ANYTHING -- thread content, `resolution_status`, 1024-d embeddings. This is the ground truth, richer than any snapshot. Connect via `apps/qw-oracle/shared/db.ts` (run a bun script from `apps/qw-oracle/`). **Do NOT use the `mcp__qw-oracle__*` tools for this corpus -- they hit pre-rewire PROD, not this dev DB.**
- **The browser:** `C:\Users\Administrator\Downloads\qw-faq\faq-browser.html` (open in a Windows browser). Clusters -> threads -> full conversations + resolution labels.
- **Tooling** (gitignored scratch at `apps/qw-oracle/scripts/calibration/scratch/`): `faq-cluster.ts`, `faq-export.ts`, `faq-browser.html`, `faq-clusters.json`, `faq-data.js` -- re-run / re-slice / re-cluster freely.

## The brainstorm (open questions -- do NOT pre-decide)

- How does the demand signal (cluster size x unresolved-rate) drive L3 concept-note **authoring priority**? Top clusters first? Weight unresolved more?
- What's the **authoring flow** -- a new helpdesk-FAQ-driven track, or feed the existing L3 skills? One note per cluster, or finer/coarser?
- How do authored notes **surface to users** (MCP `search_concepts`; the "active assistance" vision)? Do the *unresolved* threads define what a note must answer (the gaps)?
- Is this an **ARC** (a sustained authoring program) or a lighter effort? (let `arc-classifier` decide.)
- The **noise**: the informational threads + the "nobody replied" clusters -- filtered/handled how?

## Critical context / scope guards

- **buckets-E** (the 9-bucket taxonomy LLM labeling) is DEFERRED -- it's an expensive fan-out and is NOT needed for FAQ-discovery (clustering + `resolution_status` already rank authoring priority).
- Backfill is **DEV-only**; the prod MCP rewire + deploy is a separate post-arc step (out of scope here).
- **Budget:** the expensive line was the fence fan-out (now stopped). Clustering/analysis is ~free; L3 authoring is paced, targeted LLM work (operator-judged, a few at a time).

## First actions

1. Read the landscape doc + the `project_qw_oracle_product_vision` memory.
2. Open the browser (or query the DB) and read a few clusters' threads -- get the texture of real #helpdesk Q&A before theorizing.
3. Brainstorm with the operator -- ONE question at a time, plain English, prose (this is systems/product, not UI). The operator is the intent-gate.

## When in doubt

The operator is a visual learner, but this is systems/product brainstorming = **plain prose, not diagrams/mockups**. Momentum over ceremony. The goal is turning a demand map into useful knowledge output (and an active-assistance product), not building more tooling for its own sake.
