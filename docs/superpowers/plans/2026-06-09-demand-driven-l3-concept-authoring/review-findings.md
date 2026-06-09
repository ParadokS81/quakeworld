# demand-driven L3 concept authoring -- review findings (evidence ledger)

No prior monolithic plan exists for this arc, so this is not a teardown of an earlier draft. But the brainstorm + two live-source digests (the harness and the loader) surfaced concrete hazards worth pinning before phases draft. Each finding maps to the decision that resolves it. New hazards found during phase drafting append here with the next F-number.

---

## F1. The harness is NOT in `/tmp` -- it is untracked scratch (verified)

**Severity:** medium (an executor following the parking doc would look in the wrong place).

**Evidence:** The parking doc says the harness is "currently in EPHEMERAL `/tmp`." Live-file verification (general-purpose agent, 2026-06-09) found the scripts at `apps/qw-oracle/scripts/calibration/scratch/faq-hypothesis-test/` (untracked; `git ls-files` returns 0), with a committed-by-copy run snapshot in `outputs/`. `/tmp/faq-test/` is only the scripts' I/O working dir.

**Resolved by:** D12 (points the plan at the verified scratch location).

## F2. The "fresh-Claude answer" step does not exist as code -- and must not use the SDK

**Severity:** high (the single biggest Phase-0 build item; the obvious implementation is the wrong one).

**Evidence:** The POC's answer step was 100% manual (a human read `q-<id>.md` and hand-wrote `answer-<id>.md`). Generalizing it means a programmatic dispatch -- which, per `reference_max_subscription_no_api_key`, MUST route through Workflow subagents, NOT `@anthropic-ai/sdk` (no API key exists on this Max subscription).

**Resolved by:** D10 (gate build) + D11 (Workflow-subagent mandate).

## F3. The docs-quake-world sibling arc was locked on the superseded "guides in the wiki" model

**Severity:** high (cross-arc contradiction; silent drift would split the two arcs).

**Evidence:** docs-quake-world `decisions.md` D1/D7/D19 (locked ~21:05, ~1h before the brainstorm) commit "narrative lives in the wiki" + entity->wiki cross-links. The brainstorm moved guides onto docs.quake.world (rendered from L3), wiki -> social/strategy only.

**Resolved by:** `contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md` (canonical record) + a dated amendment to the docs-quake-world arc (applied in its own terminal, 2026-06-09, to avoid a HEAD collision).

## F4. Loader is Bun-only, whole-dir-scan, `tx.json` JSONB

**Severity:** medium (npm or single-file or pre-stringify assumptions each break the load).

**Evidence:** Loader source digest -- `bun run load-concepts` only (npm rejects `workspace:*` even with `--no-workspaces`); the loader `readdirSync`s the whole `curated/concept-notes/` dir (no single-file arg); JSONB front-matter goes in via `tx.json` (pre-stringify stores a JSONB string scalar -- the SQLite-era TEXT bug; `F1.jsonb_columns_not_strings` is the live probe).

**Resolved by:** D13.

## F5. 4-part `related_entities` refs are classified EXTERNAL, not entity edges

**Severity:** low-medium (a note relying on such an edge for a cross-link silently gets none).

**Evidence:** Loader `partitionRefs` -- a 3-part `<project>:<kind>:<id>` ref becomes a `concept_entities` edge (unless `kind` in {commit, pr, extension}); a 4-part ref (e.g. `mvdsv:info_key:w_rank:userinfo`, which appears live in weapon-scripts.md) has `parts.length === 4` -> classified EXTERNAL, kept in frontmatter JSONB but NOT written to `concept_entities`. So the entity->guide reverse-index (the contract's cross-link) will not see it.

**Resolved by:** awareness (capture here). If a note needs a resolvable cross-link to such an entity, use the 3-part form. The `domain-concept-curate` skill (D9) should encode this rule.

## F6. Embeddings need `VOYAGE_API_KEY` -- but a missing key does not block the gate loop

**Severity:** low (it is a feature, not a bug -- worth stating so no one over-blocks on it).

**Evidence:** `embed-chunks.ts` throws if `VOYAGE_API_KEY` is unset, BUT it runs in its own try/catch after the upsert, and `concept_chunks.tsv` is a GENERATED tsvector -- so a note is FTS-retrievable the moment it is upserted, embeddings or not. The harness retrieval is hybrid (vector + FTS), so realistic gate scoring still WANTS embeddings; but authoring + loading + a first FTS-only retrieval do not block on the key.

**Resolved by:** D13 (states the FTS-on-upsert property) + prerequisites (lists the key as recommended-for-realistic-scoring).

## F7. The parking doc's "reuse guide-rewrite" lean was superseded by evidence

**Severity:** low (prevents re-litigation against a stale recommendation).

**Evidence:** The parking doc recommended reusing guide-rewrite's Path-2 pattern, "only fork if the demand-domain shape diverges." A detailed three-skill comparison (general-purpose agent, 2026-06-09) found it diverges (5/11 guide-rewrite phases assume an upstream page; ~10 domains have none; game-mode-curate is a better template with the acceptance discipline already built).

**Resolved by:** D9 (fork). The parking doc's lean explicitly conditioned on divergence, which the evidence confirmed -- so this resolves its open condition rather than contradicting it.

---

## Findings -> resolution map

| Finding | Severity | Resolved by | Phase |
|---|---|---|---|
| F1 harness location | medium | D12 | Phase 0 |
| F2 answer step + SDK ban | high | D10, D11 | Phase 0 |
| F3 cross-arc conflict | high | contract + docs-quake-world amendment | (pre-phase) |
| F4 Bun/dir-scan/JSONB | medium | D13 | Phase 0-3 |
| F5 4-part refs external | low-med | awareness + D9 skill | Phase 0 (skill), 1-3 |
| F6 embeddings optional | low | D13 + prerequisites | Phase 0-3 |
| F7 fork vs guide-rewrite | low | D9 | Phase 0 |
