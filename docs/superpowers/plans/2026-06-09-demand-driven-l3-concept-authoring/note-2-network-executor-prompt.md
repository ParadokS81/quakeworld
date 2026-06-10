# Executor prompt -- note #2: `network` (demand-driven-l3 arc, Phase 1)

**You are the EXECUTOR for ONE player-help L3 concept note.** Fresh terminal, no prior context. Author the `network` domain note, gate it, report back to the orchestrator. The orchestrator will verify every claim against live source at the boundary -- so do real checks, not asserted ones.

## First action

Invoke the **`domain-concept-curate`** skill (it is the spine -- 9 steps: pre-flight / demand-corpus + upstream triage / source-truth verify / ruleset scan / mode-gating scan / cross-engine + userinfo hub / operator-consult gate / draft / acceptance gate / write). Run it for:

- **Domain key:** `network`
- **Label:** "Network & connection (packet loss, antilag, proxies)" -- Tier 1, cluster ranks 19 + 28
- **Suggested slug:** `network-connection` (you finalize in Step 1 per the skill; match the filename stem)
- **No overlapping note exists** -- verified by orchestrator. The skill will not HALT on classification here.

## Where you are in the arc

This is **note #2 of Phase 1**, one-note-at-a-time cadence (NOT the parallel fan-out the original plan sketched). **Note #1 (HUD) shipped** as `curated/concept-notes/hud-configuration.md`. Read it AND `weapon-scripts.md` as your two voice exemplars -- they are different shapes:
- `weapon-scripts.md` -- the original: decision-first three-method table, per-method support, R7-grounded recommendations.
- `hud-configuration.md` (note #1) -- **decision-first + preferential-honesty** exemplar (leads with the `scr_newhud` mode-gate; says "this is preference" plainly instead of fabricating "most players use X"); also the **F11 mitigation** exemplar (a high-demand micro-topic promoted into its OWN answer-first `##` section so its snippet leads with the answer).

## Prior-note learnings to apply (already folded into the skill -- this is reinforcement)

1. **Decision-first when there's a gate; preferential-honesty when there isn't.** Network has real engine-optimal grounds in places (e.g. rate/antilag defaults) -- lead with the recommended value and ground it (R7). Where it's genuinely preference, say so; don't manufacture consensus.
2. **F11 (SHIPPED):** the gate now grounds the answer-agent on the **full note body** for the top concept hit (commit `0ba3c840`), not a truncated snippet. Still author so each demand-cluster's headline answer is snippet-reachable (own section or leading sentence) -- belt and suspenders.
3. **F12 (TRACK -- low risk for THIS domain):** a NAILED gate certifies "looks right + grounded," NOT "actually runs." That gap is HIGH for script/state-machine domains and LOW for lookup/factual ones like `network` (single-cvar answers the judge can verify by reading). Do not treat a NAILED as ship-ready on its own -- **operator prose review (D4) is the real correctness gate.**
4. **Source-truth, anti-confab (D5):** every cvar/command verified in L1 before it appears in prose. `network` will pull cross-engine (ezQuake client cvars like the rate/cl_ family + MVDSV/KTX antilag + QWFWD proxy) -- check `source_state` per entity and tag cross-engine support in prose, not per-entity engine labels. Userinfo hub: if anything reads/writes a userinfo key (`rate` is a classic userinfo key), cross-link `qw-userinfo-serverinfo-protocol.md` rather than restating the plumbing.

## Gate procedure (skill Step 8 -- the executor session runs the Workflow answer step)

After writing the note:
```sh
cd apps/qw-oracle
bun run load-concepts          # whole-dir scan; confirm "loaded N" includes your note, skipped 0, warnings 0
bun run embed:chunks           # backfill vectors so hybrid retrieval (VOYAGE key is set in dev) sees the note
bun scripts/calibration/faq-gate/faq-gate-retrieve.ts --domain network   # Stage 1
# Stage 2: dispatch faq-answer-workflow.js via the Workflow tool (agent() path -- NO SDK, no API key)
bun scripts/calibration/faq-gate/faq-gate-confab.ts --domain network      # Stage 3
# assemble outputs/network/gate-network.json
```
Gate passes when every representative thread is NAILED **and** zero hard confab. Re-run the probes yourself; don't trust a stale "PASS".

## Guards (hard)

- **Sibling-arc guard:** a sibling arc (`2026-06-09-docs-quake-world`) shares this tree with ~11 unrelated uncommitted changes (slipgate bundles, parking docs). **NEVER `git add -A`.** Scope every `git add` to YOUR files (the new note + any skill tweak you surface to the orchestrator). Run `git diff --cached --stat` before committing. If a prompt mentions VitePress / build-snapshot / per-codebase reference rendering, you are in the WRONG arc.
- **Bun, never npm** (the `workspace:*` dep breaks npm). **3-part `related_entities`** only (4-part refs become EXTERNAL, no edge -- F5). **ASCII hyphens** in all output. JSONB via `tx.json`, never pre-stringified (D13).
- **Commit trailer:** `Co-Authored-By: Claude <your-model-id> <noreply@anthropic.com>`. Per-claim source verifications go in the **commit body** (skill Step 9 shape), not the note prose.

## Operator-consult gate (skill Step 6) is real

`network` is R7-flavored (it WILL carry recommendations -- rate values, antilag on/off, proxy use). **HALT at Step 6** and present the compact consult (entity set, ruleset verdict, cross-engine verdict, mode-gating verdict, proposed title + sections + R-label) to the operator before drafting the recommendation layer. The operator paces this and runs the final prose gate.

## Halt + report

HALT (return without writing) on: classification uncertainty, L1-GAP (a core entity absent from BOTH L1 and source grep), or open operator-consult questions. Otherwise draft favoring source-truth.

Report back in the skill's **return-to-operator shape** (status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED) with: L1 anchors (verified/declared), ruleset scan result, mode-gating result, cross-engine coverage, sections + line count, **gate result with the actual artifacts**, pending refs, open items, file path, commit SHA, and methodology feedback (contract/voice gaps). The orchestrator re-runs the gate probes and spot-checks your source verifications against live source before the note is considered shipped.
