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

## F8. Confab check self-report cross-check manufactured a false hard-confab (FIXED in Phase 0)

**Severity:** medium (a false hard-confab fails the gate on a genuinely confab-free answer).

**Evidence:** The first live gate run (weapon-scripts/12393, 2026-06-10) flagged `fire_ar` as hard confab while `+fire_ar` sat in the `ok` bucket. Cause: `faq-gate-confab.ts`'s Stage-2 self-report cross-check stripped the `+`/`-` prefix from `claimedEntities` (`+fire_ar` -> `fire_ar`), and bare `fire_ar` is absent from L1 (only `+fire_ar`/`-fire_ar` exist). The prose extractor handles this via `appearsOnlyPrefixed`; the self-report path bypassed it. The Task-B build subagent's isolated self-test did NOT catch it -- it ran the confab script against the POC answer with no `answers-<domain>.json` present, so the self-report path was never exercised. Only the real glued run (which writes that file) surfaced it.

**Resolved by:** inline fix -- preserve the agent's named form, gate the add on the bare form's shape. Re-run: `hardConfab: []`, gate confab-clean. **Lesson:** the confab classifier's two token sources (prose vs self-report) must apply identical prefix normalization; future per-domain runs in Phases 1-3 inherit the fix.

## F9. The anti-confab gate diverges from the POC's human-patched baseline -- weapon-scripts/12393 scores PARTIAL, not NAILED (OPERATOR DISPOSITION NEEDED)

**Severity:** high (recalibrates the arc baseline + the Phase-0 boundary criterion; touches D3 and D15 and the Phase 1-3 expectations).

**Evidence:** First live gate run scored weapon-scripts/12393 **PARTIAL + zero confab** (`gate-weapon-scripts.json`). Investigation ruled out machinery fault and pinned the cause:
- (a) the runner's grounding is **byte-identical** to the POC `q-12393.md` (no retrieval/self-exclusion drift -- the MD Recovery's hypothesised cause is excluded);
- (b) the grounding contains **no press-to-cycle method** (0 mentions of cycle/self-redefining-alias) -- the weapon-scripts note documents quickfire / manual-select / hold-modifier only;
- (c) the thread's own community resolution (toma0183's shift-state press-toggle alias config) is **correctly self-excluded** from grounding;
- (d) the POC's NAILED came from a **human hand-writing the cycle pattern from training knowledge** -- the POC `answer-12393.md` SELF-REPORT explicitly says the self-redefining-alias cycle came from training, not the oracle.

The Task-A anti-confab guardrail -- **working exactly as designed** -- suppresses that training-patch, so the disciplined, grounding-only gate honestly returns PARTIAL. Two sub-findings: (i) the weapon-scripts note has a real **coverage gap** (no press-to-cycle / self-redefining-alias method); (ii) the answer-agent read "pattern absent from grounding" conservatively and declined to synthesise the cycle from real commands (`alias`/`bind`/`+fire_ar`, all in grounding) -- which would NOT have confabulated.

**Proposed disposition (OPERATOR DECISION -- not resolved unilaterally):** options, not mutually exclusive --
1. Accept the machinery as done and recognise the gate correctly distinguishes platter from dig (12393 is a genuine *dig* for the note as it stands);
2. Add the press-to-cycle method to `weapon-scripts.md` (Phase-1 authoring) so it NAILs grounding-only;
3. Demonstrate the NAILED path on a different fixture the note already covers grounding-only;
4. Revisit **D3** ("weapon-scripts already proved the platter model -- it NAILED its thread with a single retrieval") and **D15**'s "NAILED" boundary criterion in light of what the anti-confab rule changed: the POC's 7-NAILED baseline was partly human training-patching; the disciplined gate is stricter and more honest.

**Phase:** Phase 0 (surfaced) -> affects Phases 1-3. **See F10** -- the NAILED-demo run reframes this: the judge (not the note, not the agent) is the dominant scoring problem; 12393's over-decline was situational, not systematic.

## F10. The gate's judge over-anchors on the community resolution as literal gold -- grades correct answers WRONG/PARTIAL (OPERATOR DISPOSITION NEEDED)

**Severity:** high (the judge, as prompted, systematically *under*-scores; a good note producing a correct answer fails the gate whenever the community truth differs in form -- this would block Phases 1-3 from passing the gate honestly).

**Evidence:** the orchestrator-approved NAILED-demo run (2026-06-10) on three weapon-scripts threads the note covers exhaustively returned **0 NAILED + zero hard confab** -- yet all three answers are correct:
- **9096** ("bind switch+shoot to one button") -> WRONG. Oracle gave `+fire_ar` quickfire + a manual-select alternative (correct). Judge penalized `+fire_ar` vs the community's `+fire` (*equivalent* quickfire commands) and the omission of companion settings (`cl_weaponhide`/`w_switch`/`b_switch`) the user did not ask for.
- **9244** ("simple weapon script, press key + fire + back to boomstick") -> WRONG. Oracle gave `+fire_ar` + `cl_weaponhide 1` -- a complete, correct answer to the exact ask. Judge penalized it because the community *deflected to an external cfg link* + a TDM impulse-transfer tangent, so the Oracle's self-contained answer "does not appear in the thread."
- **16591** ("always have the axe when idle") -> PARTIAL. Oracle gave `cl_weaponhide_axe 1` -- literally the precise answer. Judge penalized "unrequested depth ... cvars the community never mentioned" -- but that depth *is* the answer (the community only linked docs).

**Root cause:** the judge prompt asks "did the Oracle resolve the question to the same substance as the **community resolution**" -- a leaky proxy for "did it correctly resolve the **user's question**." Community resolutions are frequently diffuse (external links), thin (docs links), or use equivalent-but-different commands; anchoring on them as the literal gold standard penalizes correct, complete, or *better* answers.

**Construct-vs-decline read (orchestrator asked):** the answer-agent constructs well from real primitives -- on 16591 it confidently produced the precise cvar (`cl_weaponhide_axe`) rather than declining; on 9096/9244 it produced complete correct scripts. The 12393 over-decline (F9) was **situational** (the cycle method is genuinely absent from the note + the anti-confab framing nudged caution), not systematic.

**Proposed disposition (OPERATOR DECISION):** recalibrate the judge prompt to score "did the Oracle correctly and completely resolve the **user's question**, using the community resolution as ONE reference (not the literal gold standard); an answer may be more complete or use equivalent commands and still NAIL." Optionally give the judge the user QUESTION explicitly (currently it sees only truth + answer) and allow a "better-than-community" path. Re-run the demo after recalibration to confirm the pass-path. Until then, the gate's SCORING half under-scores; the CONFAB half is sound (zero hard confab across all 4 threads tested).

**Phase:** Phase 0 (surfaced) -> blocks Phase 1-3 gate scoring until resolved.

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
| F8 confab self-report false-confab | medium | inline fix (faq-gate-confab.ts) | Phase 0 (drained) |
| F9 anti-confab gate vs POC NAILED baseline (12393 PARTIAL) | high | **OPERATOR disposition pending** (reframed by F10) | Phase 0 -> 1-3 |
| F10 judge over-anchors on community truth (0/3 NAILED on correct answers) | high | **OPERATOR disposition pending** -- recalibrate judge prompt | Phase 0 -> blocks 1-3 scoring |
