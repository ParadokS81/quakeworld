# Phase 0 -- Machinery (anti-confab guardrail + per-domain gate runner + `domain-concept-curate` skill)

> **Sibling-arc guard.** This is `2026-06-09-demand-driven-l3-concept-authoring`. The neighbor is `2026-06-09-docs-quake-world` (the L1 reference website). Nothing in this phase touches VitePress, `build-snapshot.ts`, per-codebase reference rendering, or `category_inferred`. Phase 0 builds the authoring + gating machinery for L3 concept notes. It builds no website.

> **AMENDMENT 2026-06-10 (D12 -- track the runner).** The *generalized* runner is TRACKED, not gitignored scratch. Apply this mapping throughout this MD:
> - The four NEW runner scripts (`faq-domains-resolve.ts`, `faq-gate-retrieve.ts`, `faq-answer-workflow.js`, `faq-gate-confab.ts`) + a tracked copy of `faq-clusters.json` live at **`apps/qw-oracle/scripts/calibration/faq-gate/`** (TRACKED) -- wherever the body writes or invokes `scripts/calibration/scratch/faq-hypothesis-test/<new-script>`, read `scripts/calibration/faq-gate/<new-script>`.
> - Run outputs live at **`faq-gate/outputs/`** but stay **gitignored** (regenerable run artifacts) -- add the ignore rule.
> - The POC scripts (`faq-retrieve.ts`, `faq-verify*.ts`, `faq-domains.ts`) stay untracked at `scripts/calibration/scratch/faq-hypothesis-test/` as the lift-source (unchanged).
> See decisions.md amendment log (2026-06-10).

## Goal

Phase 0 ships the three machinery deliverables that every later note-authoring phase depends on, as ONE atomic phase (D15): **(A)** an anti-confabulation guardrail folded into the place the answering LLM is oriented (so every Oracle answer benefits even before notes land, D5); **(B)** the per-domain acceptance runner -- the generalized hypothesis-test harness that gates each note dig/PARTIAL -> platter/NAILED with zero confabulation (D10, D12); and **(C)** the forked `domain-concept-curate` skill -- the authoring methodology that produces notes to the cross-arc structure contract and wires the gate as its acceptance step (D9). The runner-build (B) and skill-build (C) are delegated to separate subagent tasks so the executor's main-thread budget stays moderate.

**Runnable state at boundary:** the per-domain runner, invoked on `--domain weapon-scripts`, retrieves grounding for the weapon-scripts cluster's representative thread(s), dispatches a Workflow-subagent answer step (NOT the Anthropic SDK), and reports **weapon-scripts NAILED + zero confab**; the `domain-concept-curate` skill produces a structurally-valid note for one dry-run domain that loads via `bun run load-concepts` with 0 errors and carries the structure contract; and the anti-confab rule is present in `serve/mcp/src/orientation.ts` with the MCP instructions still well-formed. All three are verified against the **3 existing notes** -- no Phase-1 note is required (D15).

## Inputs from previous phase

Phase 0 is the first phase; its inputs are the operator-side prerequisites (`prerequisites.md`), all of which are already satisfied on the dev machine:

1. **qw-oracle dev Postgres up, full stack loaded** -- L1 (`entities` + `*_versions`), L2 (`chat_threads` + `thread_messages`), L3 (`concepts` + `concept_chunks`). The **3 existing concept notes** (`weapon-scripts`, `player-skins`, `lightning-gun-customization`) must be loaded -- they are the Phase-0 verification fixtures.
2. **`apps/qw-oracle/.env` configured** -- `DATABASE_URL` -> dev `qw_oracle`. Tests pin `qw_oracle_test`; never point them at dev.
3. **Bun installed** -- everything runs under Bun; npm is not an option in `apps/qw-oracle/` (D13).
4. **(Recommended) `VOYAGE_API_KEY` in `.env`** -- notes load + are FTS-retrievable without it (D13/F6), but the harness retrieval is hybrid (vector + FTS), so a key makes gate scoring reflect production. FTS-only is acceptable for a first pass; flag it in the gate output.
5. **Cluster JSON** at `apps/qw-oracle/scripts/calibration/scratch/faq-clusters.json` (K=48; `faq-cluster-coarse.ts` regenerates it deterministically, seed 42). **Carries `threadIds` per cluster** -- verified: each cluster is `{id, size, unresolved, rate, terms, medoid, samples, threadIds}`, `threadIds` an array of string IDs. This is the `domain -> threadIds` source. (Note: untracked on disk; see Open questions.)
6. **Harness scratch scripts** at `apps/qw-oracle/scripts/calibration/scratch/faq-hypothesis-test/` -- the POC (`faq-retrieve.ts`, `faq-verify.ts`, `faq-verify2.ts`, `faq-domains.ts`) + the `outputs/` run snapshot. Phase 0 generalizes these (D12), starting from them -- NOT a rewrite.
7. **Workflow capability** -- the programmatic answer step (D11) dispatches Workflow subagents from within the executing Claude Code session. A session capability, not an install. No API key, no SDK.

## Files touched

- **Created:**
  - `apps/qw-oracle/scripts/calibration/scratch/faq-hypothesis-test/faq-domains-resolve.ts` -- the `domain -> threadIds` resolver (lifts the `R` rank->domain map + `META` from `faq-domains.ts`; adds the threadIds union). *(Untracked scratch -- gitignored, dev tooling per D12.)*
  - `apps/qw-oracle/scripts/calibration/scratch/faq-hypothesis-test/faq-gate-retrieve.ts` -- Stage 1 (deterministic retrieve), generalized from `faq-retrieve.ts`. *(Untracked scratch.)*
  - `apps/qw-oracle/scripts/calibration/scratch/faq-hypothesis-test/faq-gate-confab.ts` -- Stage 3 confab check, generalized from `faq-verify.ts`. *(Untracked scratch.)*
  - `apps/qw-oracle/scripts/calibration/scratch/faq-hypothesis-test/faq-answer-workflow.js` -- Stage 2 (+ optional Stage-3 judge) Workflow script invoked via the Workflow tool's `scriptPath`. *(Untracked scratch; plain JS, not TS -- Workflow scripts are JS.)*
  - `apps/qw-oracle/scripts/calibration/scratch/faq-hypothesis-test/outputs/<domain>/` -- per-domain output dirs (`q-<id>.md`, `truth-<id>.md`, `answer-<id>.md`, `grounding.json`, `gate-<domain>.json`), replacing `/tmp/faq-test/`. *(Untracked scratch.)*
  - `~/.claude/skills/domain-concept-curate/SKILL.md` -- the forked authoring skill (C).
  - *(Conditional, C)* `apps/qw-oracle/curated/concept-notes/_methodology/domains/` -- a thin methodology doc, ONLY if the cross-arc contract + `weapon-scripts.md` exemplar leave a structural gap the skill cannot reference directly. Default: reference the existing contract, do not duplicate (own-your-layer-and-link, D6).
  - *(Dry-run fixture, C)* one `apps/qw-oracle/curated/concept-notes/<dry-run-slug>.md` produced by the skill's dry run -- may be a throwaway used only to prove structural validity + clean load, then kept or removed at operator discretion.
- **Modified:**
  - `apps/qw-oracle/serve/mcp/src/orientation.ts` -- insert the anti-confab rule into `ORIENTATION_INSTRUCTIONS` (A). The canonical rule text lives here; B and C embed copies.
- **Deleted:** none. (The POC scripts `faq-retrieve.ts` / `faq-verify*.ts` / `faq-domains.ts` are left in place as the lift source + a fallback reference; the generalized scripts are new siblings. Do not delete the POC -- Chesterton's fence.)

## Tasks

Author order: **A first** (it defines the canonical anti-confab rule text), then **B and C in parallel** (each embeds A's text -- B in its answer-subagent prompt, C in the skill). A is a one-edit inline task; B and C are independent subagent tasks.

---

### Task A -- anti-confab guardrail

- **Goal:** Insert one rule -- "never name a cvar/command/entity absent from the grounding" -- where the answering LLM is oriented, so every Oracle answer inherits it (D5). This is the structural fix for the POC's 2 confabulations (`cl_showfps` for the real `show_fps`; a non-existent `scr_showframetime`), both of which appeared exactly where L1 retrieval came back thin.
- **Files:** `apps/qw-oracle/serve/mcp/src/orientation.ts` (primary). The same rule text is consumed by Task B (answer-subagent prompt) and Task C (skill) -- not edited there by Task A, but A owns the canonical wording so B/C copy it verbatim.
- **Steps:**
  1. Open `serve/mcp/src/orientation.ts`. The instructions are the `ORIENTATION_INSTRUCTIONS` template literal returned at MCP `initialize` via the `Server` constructor's `instructions` field (confirmed by the file header comment + wired in `serve/mcp/src/index.ts`). The existing blocks are: intro + three layers / "Recommended iteration" / "Honest failure" (match_quality strong/weak/none) / "Citation discipline".
  2. Insert the following sentence **immediately after the existing `Citation discipline:` line** (it sharpens, does not replace, the existing rules -- additive prose, no behavior of the existing instructions changes):

     > Grounding discipline: never name a cvar, command, or other entity that is not present in a tool result you received in this conversation. If the exact name is not in the returned grounding, say the corpus does not surface it and offer to redirect -- do not reconstruct a plausible name from training data. A plausible-but-wrong name (`cl_showfps` for the real `show_fps`, or a non-existent `scr_showframetime`) is exactly the failure this prevents.

  3. Keep the leading/trailing `\n` discipline of the template literal intact (the export ends with `.trim()`); add the block as one more paragraph separated by a blank line, matching the existing paragraph spacing.
  4. Record the exact inserted text in this MD (done, step 2) so B and C copy it verbatim as "the anti-confab rule (A)."
- **Verification (YES/NO):**
  - The `Grounding discipline:` sentence is present in `ORIENTATION_INSTRUCTIONS` (`grep -n "Grounding discipline" serve/mcp/src/orientation.ts` returns the line).
  - The MCP instructions still build / parse -- `bunx tsc --noEmit` (or the serve/mcp typecheck) passes, and the template literal is unbroken (no stray backtick). A server smoke-start is sufficient but not required; the typecheck + grep is the gate.
- **Execution mode:** `inline` -- a single textual edit, full rule text shipped inline above, no logic. (D14: the guardrail prompt-rule edit is inline.)

---

### Task B -- per-domain acceptance runner

- **Goal:** Generalize the POC scratch scripts into a per-domain gate runner: bind a domain to its cluster threads, retrieve grounding, generate a fresh-Claude answer **via Workflow subagents** (D11/F2), confab-check the answer against L1, and score it dig/PARTIAL -> platter/NAILED (80/20, D10). The runner is the acceptance gate Phases 1-3 run on every note.
- **Files:** all under `apps/qw-oracle/scripts/calibration/scratch/faq-hypothesis-test/` (untracked scratch, per D12) -- `faq-domains-resolve.ts`, `faq-gate-retrieve.ts`, `faq-answer-workflow.js`, `faq-gate-confab.ts`, and per-domain `outputs/<domain>/`. Lift source: `faq-retrieve.ts`, `faq-verify.ts`, `faq-domains.ts`.

The runner is **three stages glued by the executing Claude Code session** -- this shape is forced by the constraints (Workflow scripts have no filesystem/DB/Bun access; a plain Bun script cannot dispatch Workflow subagents). Do NOT try to make one Bun script do the LLM step, and do NOT try to make one Workflow script do the DB step. The executor session is the orchestrator.

#### Stage 1 -- Retrieve (deterministic, Bun) -- `faq-gate-retrieve.ts`

  - **LIFT AS-IS from `faq-retrieve.ts`:**
    - the `splitQ` + `cvarToks` helpers (lines 24-31);
    - the four-tool retrieval block (lines 41-49): `searchConcepts` + `searchSolvedIssues` (with self-exclusion `String(r.thread_id)!==String(t.id)`) + `searchEntities` + the `lookupEntity` loop over `cvarToks`;
    - the grounding-bundle assembler (lines 55-65: the `let b = ...` block that emits `## USER QUESTION` / `## search_concepts` / `## search_entities` / `## lookup_entity` / `## search_solved_issues`).
    - the imports of the live MCP tool fns from `serve/mcp/src/tools/` (absolute paths); run from `apps/qw-oracle/` so `.env` loads.
  - **BUILD NEW:**
    1. **Domain -> threadIds** via `faq-domains-resolve.ts` (new). Lift the `R` (rank->domain) map + `META` from `faq-domains.ts` (lines 7-45). Export `resolveDomainThreads(domainKey, {limit})`: load `faq-clusters.json`, **sort clusters by `size` desc** (this is how `faq-domains.ts` derives rank -- `rank = sortedIndex + 1`; the cluster's own `id` field is NOT the rank), select clusters where `R[rank] === domainKey`, union their `threadIds`. Coerce string threadIds to number for the SQL `WHERE id = ...`. Default `limit` = a small representative sample per domain (e.g. 3) to keep the answer-subagent budget bounded; accept an explicit `--threads <id,id>` override.
    2. **Per-domain output dirs** -- write `outputs/<domain>/q-<id>.md` (question + grounding) + `outputs/<domain>/truth-<id>.md` (community answer) + a machine-readable `outputs/<domain>/grounding.json` = `[{threadId, question, grounding, truth}]` for Stage 2. Replaces the hardcoded `/tmp/faq-test/` writes.
  - **Invocation:** `bun scripts/calibration/scratch/faq-hypothesis-test/faq-gate-retrieve.ts --domain weapon-scripts [--threads 12393]`. For the verification probe, target thread **12393** (the POC's `CONSTRUCTIVE/weapon-alias` rep that NAILED `weapon-scripts` with a single retrieval) so the gate result is directly comparable to the POC.

#### Stage 2 -- Answer (LLM, Workflow subagents -- NEVER the SDK) -- `faq-answer-workflow.js`

  - The executor reads `outputs/<domain>/grounding.json` (Bash/Read) and invokes the **Workflow** tool with `faq-answer-workflow.js`, passing the grounding array via `args`.
  - The Workflow script: for each `{threadId, question, grounding}` in `args`, one `agent()` call with:
    - **prompt** = the answer-subagent prompt: *"You are the QW Oracle answering a QuakeWorld player's config question. Use ONLY the grounding below. [anti-confab rule (A), verbatim]. GROUNDING: <grounding>. QUESTION: <question>. Answer concisely, as the Oracle would relay to the player."*
    - **schema** = `{answer: string, claimedEntities: string[]}` (the subagent self-reports the entity tokens it named; Stage 3 also extracts independently -- belt and suspenders).
    - **model:** Sonnet (the POC used a fresh Claude; Sonnet is the analog -- judgment but bounded). Keep concurrency LOW and pace the dispatch (`reference_workflow_rate_limit_and_args`: Opus fan-out trips the shared throttle and starves terminals; Sonnet + low concurrency + honest counts).
  - The Workflow returns `[{threadId, answer, claimedEntities}]`; the executor writes each to `outputs/<domain>/answer-<id>.md` (mirrors the POC's `answer-<id>.md`, so Stage 3 + operator review can read them).
  - **`args` handling:** pass the grounding as a JSON value. Defensively handle both forms at the top of the script -- `const items = typeof args === 'string' ? JSON.parse(args) : args;` (memory `reference_workflow_rate_limit_and_args` notes args may arrive as a JSON string; the current Workflow contract passes JSON values -- the defensive parse covers both).
  - **HARD CONSTRAINT (F2/D11):** no `@anthropic-ai/sdk`, no API key, no `fetch` to api.anthropic.com. The answer step routes through Workflow `agent()` only. This is the single biggest build item and the easiest to get wrong.

#### Stage 3 -- Confab check + score (Bun confab + 80/20 judge) -- `faq-gate-confab.ts`

  - **Confab check (deterministic, Bun) -- LIFT from `faq-verify.ts`:** read `outputs/<domain>/answer-*.md`, extract claimed entity-like tokens (backtick-wrapped `` `tok` `` + underscore-cvar shapes, lines 11-12), check existence in L1 (`SELECT lower(name) FROM entities WHERE lower(name) = ANY(...)`, case-insensitive, any project, lines 18-20). **Sharpen the classification** (the POC's NOT-FOUND bucket mixed genuine confab with multi-word/syntax false-positives): classify each claimed token as
    - **(a) hard confab** -- absent from L1 AND not a multi-word/syntax artifact (the `cl_showfps` case). **Any hard confab fails the gate.**
    - **(b) soft flag** -- present in L1 but absent from the thread's grounding text (a real entity named from training, not retrieval). Worth a flag, not an automatic gate-fail.
    - Cross-check against the Stage-2 `claimedEntities` self-report to reduce false positives.
  - **Score (80/20, D10 -- NO full auto-scorer for v1):** default = a **judge-subagent** (one more Workflow `agent()` per thread, in `faq-answer-workflow.js` or a sibling): *"Community resolution: <truth>. Oracle answer: <answer>. Did the answer resolve the question to the same substance with no dig required? Verdict: NAILED (platter) / PARTIAL (needs follow-up) / WRONG. One-line justification."* Returns `{threadId, verdict, justification}`. This is a single coarse verdict, NOT a weighted rubric (stays within D10's "no full auto-scorer"). **Fallback** = operator eyeball -- the executor presents `answer-<id>.md` beside `truth-<id>.md` and the operator labels. Either path is acceptable for v1.
  - **Gate verdict (assembled by the executor):** write `outputs/<domain>/gate-<domain>.json` = `{domain, threads: [{id, verdict, hardConfab, softFlags}], pass}`. A domain PASSES iff every representative thread is **NAILED/platter** AND there is **zero hard confab**. Note in the JSON whether retrieval was hybrid (VOYAGE key set) or FTS-only (F6).
- **Verification (YES/NO):**
  - Stage 1 resolves `weapon-scripts` -> thread 12393 (and any sampled siblings) and writes `outputs/weapon-scripts/q-12393.md` + `truth-12393.md` + `grounding.json`.
  - Stage 2 produces `answer-12393.md` via a Workflow subagent (confirm the run dispatched `agent()`, not an SDK call -- the script contains no `@anthropic-ai/sdk` import).
  - Stage 3 reports `weapon-scripts` **NAILED + zero hard confab** for thread 12393 in `gate-weapon-scripts.json` (`pass: true`).
- **Execution mode:** `subagent (Sonnet MAX)` -- multi-file code synthesis lifting + generalizing existing scripts, with the Workflow-dispatch shape as the judgment-dense part. (D14: Phase-0 code synthesis = Sonnet MAX | Opus medium; Sonnet MAX chosen -- the lift is well-specified, the risk is in the Workflow wiring which this MD spells out.)

---

### Task C -- fork `domain-concept-curate` skill

- **Goal:** Fork a new authoring skill modeled structurally on `game-mode-curate` (synthesize-from-facts, optional-upstream-source triage, HALT/PROCEED rubric, per-claim source-line citation in the commit body, externalized methodology) -- NOT on `guide-rewrite`'s document-conversion spine (D9/F7). It encodes the note architecture + discipline rules (D6 + the cross-arc contract), the anti-confab rule (A), the 3-part-ref rule (F5), and wires the Task-B harness as its acceptance step.
- **Files:** `~/.claude/skills/domain-concept-curate/SKILL.md` (new). Conditional: `apps/qw-oracle/curated/concept-notes/_methodology/domains/` (only if the contract leaves a structural gap -- default reference, don't duplicate). One dry-run note under `curated/concept-notes/` for verification.
- **Required reads for the building subagent:** `game-mode-curate/SKILL.md` (the spine to model on), `guide-rewrite/SKILL.md` (the four phases to LIFT -- see below), `contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md` (the note-structure contract), `apps/qw-oracle/curated/concept-notes/weapon-scripts.md` (the voice + shape exemplar), `apps/qw-oracle/curated/concept-notes/README.md` (frontmatter schema), `decisions.md` D5-D8 + D13, `review-findings.md` F5.
- **Steps -- the skill's phase spine** (game-mode-curate's shape, with guide-rewrite verification steps GRAFTED as named steps -- NOT guide-rewrite's 11-phase intake/gap-report spine):
  1. **Pre-flight** -- resolve the domain key -> note slug + taxonomy metadata (from the parking-doc taxonomy / `faq-domains.ts` META). Load the domain's candidate L1 anchors (the cvars/commands the domain centers on) and the domain's representative L2 demand threads (what players actually ask -- the `samples`/`threadIds` from the cluster JSON). **HALT on classification uncertainty** (the domain doesn't map cleanly to the locked taxonomy) rather than inventing a domain (D1).
  2. **Demand-corpus check** (analog to game-mode-curate's wiki-check; source is the L2 demand corpus, not a wiki snapshot) -- read the domain's representative threads to scope what the note must answer. **Optional upstream-source triage:** IF an `ezquake.com/docs` page exists for this domain (`research/repos/ezquake-docs/docs/docs/<page>.md`), triage it as source material (most domains have NO upstream page -- that is the D9 rationale for forking, not extending guide-rewrite). Conditional, not mandatory.
  3. **Source-truth verification (LIFT guide-rewrite Phase 3 + 4)** -- every cvar/command named in the draft is verified in L1 before it appears in prose; `source_state` is load-bearing (`source_backed | doc_only | source_retired | dynamically_registered`); for entities not in L1, grep source to distinguish extraction-gap vs guide-error vs cross-engine-confusion. **HALT on L1-GAP** (a core entity the domain needs is absent from L1 and from source) rather than guessing.
  4. **Ruleset-restriction scan (LIFT guide-rewrite Phase 5b)** -- when any entity could plausibly be ruleset-affected, run the six-mechanism scan (`disabled_cvars[]` / `CVAR_RULESET_MIN|MAX` / `Rulesets_OnChange_*` / behavior gates / read-site clamps / declaration flags). Never claim "free under all rulesets" without all six checked.
  5. **Cross-engine + userinfo-hub check (LIFT guide-rewrite Phase 6 + 6b)** -- per-method support across engines (the contract's per-method support-sets, prose convention per weapon-scripts' "Cross-engine:" lines); if the feature reads/writes userinfo/serverinfo keys, cross-link the `qw-userinfo-serverinfo-protocol` hub note (don't duplicate the plumbing).
  6. **Operator-consult gate (LIFT guide-rewrite Phase 7.5)** -- focused, role-keyed; **HALT until operator answers land** (the recommendation/best-practice layer needs operator SME input -- D4/D8). Present entity set + coverage gaps + per-ruleset verdict + proposed title/sections; ask only the questions matching the note's role.
  7. **Draft** -- synthesize from facts into the note architecture (D6 + contract):
     - **name-by-domain, never by-engine** (one domain guide, not per-engine variants);
     - **audience-delineated sections** (player / admin / both) -- powers the read-time audience lens;
     - **per-method support annotation** in prose (baseline once, deltas tagged -- weapon-scripts style);
     - **typed `related_entities`** as 3-part `<project>:<kind>:<id>` refs. **F5 rule (encode explicitly):** a cross-link edge MUST be 3-part -- a 4-part ref (e.g. `mvdsv:info_key:w_rank:userinfo`) is classified EXTERNAL by the loader's `partitionRefs` and is NOT written to `concept_entities`, so it produces no resolvable cross-link. Use the 3-part form for any ref you need as an entity edge; 4-part refs survive only in frontmatter JSONB.
     - **`best_practices_reviewed: <date>`** frontmatter (D8 -- the recommendation layer's separate human-review trigger);
     - **asset references** where visual surfaces apply (notes stay text, MCP-friendly);
     - **anti-confab rule (A):** every named entity traces to an L1 row; the note names nothing it cannot ground.
  8. **Gate (wire Task B)** -- run the per-domain harness on the note's domain; the note must move its representative threads dig/PARTIAL -> platter/NAILED with zero hard confab. THEN operator prose review (D4) -- the second, non-automatable gate. Neither gate alone ships a note.
  9. **Write + commit** -- reader-facing prose in the `.md` (no HTML triage comments, no citation-dense audit prose); the audit trail (per-claim source verifications, triage reasoning) goes in the **commit body** (game-mode-curate's convention). Upstream-PR attribution discipline applies if any upstream page was used.
  - **HALT/PROCEED rubric** (game-mode-curate's shape): HALT (return without writing) on classification uncertainty (step 1), L1-GAP (step 3), or open operator-consult questions (step 6). PROCEED-WITH-FLAG on padded sections, re-triage candidates, pending cross-link refs.
  - **Methodology doc decision:** default to referencing the cross-arc contract + `weapon-scripts.md` directly from SKILL.md (own-your-layer-and-link). Create `_methodology/domains/` ONLY if the building subagent finds the contract under-specifies a load-bearing structural rule the skill would otherwise have to inline (which is how game-mode-curate's skill went stale). If created, keep it thin.
- **Verification (YES/NO):**
  - `~/.claude/skills/domain-concept-curate/SKILL.md` exists, has valid frontmatter (`name` + `description` with triggers), and its phase spine names the four guide-rewrite lifts (P3/P5b/P6/P7.5) + the anti-confab rule + the F5 3-part-ref rule + the Task-B gate as the acceptance step.
  - A dry run of the skill on one domain produces a `curated/concept-notes/<slug>.md` that **loads via `bun run load-concepts` with 0 errors** and carries the structure contract (typed `related_entities`, audience-tagged sections, per-method support annotation, `best_practices_reviewed`). FTS-retrievable on upsert (D13) -- confirm the loader reports it loaded.
- **Execution mode:** `subagent (Sonnet MAX | Opus medium)` -- skill authoring is judgment-dense synthesis (mapping game-mode-curate's spine + four guide-rewrite lifts + the contract into a coherent methodology). Sonnet MAX is the default (matches the existing-notes class, D14); Opus medium is acceptable if the building subagent wants more headroom on the spine-mapping. The dry-run note the skill produces is itself note-drafting = Sonnet MAX (D14).

## Verification at phase boundary

YES/NO probes confirming the whole phase landed (D15 -- verified against the **3 existing notes**, no Phase-1 note required):

- **Runner gate passes on the fixture:** `bun scripts/calibration/scratch/faq-hypothesis-test/faq-gate-retrieve.ts --domain weapon-scripts --threads 12393` -> Stage 2 Workflow answer -> Stage 3 reports **weapon-scripts NAILED** for thread 12393. Capture `gate-weapon-scripts.json` (`pass: true`).
- **Zero confab on the fixture:** the Stage-3 confab check finds **zero hard confab** in the weapon-scripts answer (every claimed cvar/command present in L1).
- **No SDK path:** `grep -rn "anthropic-ai/sdk\|api.anthropic.com" scripts/calibration/scratch/faq-hypothesis-test/` returns nothing; the answer step is a Workflow `agent()` dispatch (D11/F2).
- **Guardrail in place:** `grep -n "Grounding discipline" serve/mcp/src/orientation.ts` returns the line; the MCP instructions still typecheck (template literal unbroken).
- **Skill produces a valid note:** the `domain-concept-curate` dry-run note loads via `bun run load-concepts` (0 errors) and carries the structure contract (typed `related_entities` 3-part, audience sections, per-method support, `best_practices_reviewed`).
- **Retrieval realism flag (F6):** the gate output records whether `VOYAGE_API_KEY` was set (hybrid) or absent (FTS-only). FTS-only is acceptable for this boundary; flag it so Phases 1-3 know the gate's strength.
- **Operator prose review (second gate, D4 -- non-automatable):** named explicitly here even though the operator runs it. Phase 0's machinery does not need operator prose review (it ships no player-facing note except a throwaway dry-run fixture); Phases 1-3's notes do.

## Outputs to next phase

Phases 1-3 may assume:
- The anti-confab guardrail is live in the MCP instructions (every gate run + every Oracle answer inherits it).
- The per-domain runner exists and is invokable as `--domain <key>` against the dev stack; the gate criterion is **representative threads NAILED + zero hard confab**, with the Workflow answer step as the LLM path (no SDK).
- The `domain-concept-curate` skill exists and is the authoring methodology -- each Phase-1/2/3 note is drafted by it (Sonnet MAX, D14), gated by the runner, then operator-prose-reviewed.
- The `domain -> threadIds` resolver (`faq-domains-resolve.ts`) maps any taxonomy domain key to its cluster threads, so each note's gate targets its own domain's representative threads.

## Open questions / deferred items

- **Runner lives in gitignored scratch (D12).** Verified: `git ls-files apps/qw-oracle/scripts/calibration/scratch/` returns 0 -- the whole subtree (including the generalized runner and `outputs/`) is untracked. **RESOLVED 2026-06-10: tracked at `scripts/calibration/faq-gate/` (D12 amendment; see top block).** Original default was to leave in scratch -- it is dev-gate tooling, not a shipped artifact, and persists on the solo-dev machine. *Resolvable by operator:* if the gate logic deserves version history (it is, after all, machinery every later phase depends on), promote to a tracked `scripts/calibration/faq-gate/` dir. This is a decision contradicting the literal D12 "stays in scratch" only if the operator wants tracking; **decisions win** unless the operator amends D12.
- **`prerequisites.md` items 5 + 6 call the scratch artifacts "committed" -- they are not.** `git ls-files` shows the whole `scripts/calibration/scratch/` subtree untracked (gitignored) -- this covers both `faq-clusters.json` (item 5) and the `outputs/` run snapshot (item 6). They exist on disk, so Phase 0 is unaffected, but the doc wording is inaccurate. *Default:* low-severity -- flag both for a `prerequisites.md` correction ("present on disk; untracked scratch" not "committed"). Does not block execution.
- **Workflow `args` shape (string vs JSON value).** The current Workflow contract passes `args` as a JSON value; memory `reference_workflow_rate_limit_and_args` records it arriving as a JSON string. *Default:* the Stage-2 script defensively handles both (`typeof args === 'string' ? JSON.parse(args) : args`). Resolvable by the executor confirming the live shape on first run.
- **Scoring path: judge-subagent vs operator-eyeball.** Both are within D10's 80/20. *Default:* judge-subagent (coarse single verdict) for unattended runs; operator-eyeball as the fallback / tie-breaker. The executor may pick per run; neither is a "full auto-scorer."
- **All-in-Workflow vs glued architecture.** This MD specs the glued shape (Bun retrieve + Workflow answer/judge + Bun confab, orchestrated by the executor) because Workflow scripts have no DB/filesystem access. *Alternative:* an all-in-Workflow runner where a `Bash`-capable `agent()` runs the Bun retrieve step. *Default:* glued -- it keeps the deterministic DB work in plain Bun (testable, cheap) and uses Workflow only for the LLM steps. Recorded for the executor; not a blocker.
- **`_methodology/domains/` doc: create or reference?** *Default:* reference the cross-arc contract + `weapon-scripts.md` from SKILL.md; create a thin methodology doc only if the contract under-specifies a load-bearing structural rule. The Task-C subagent decides during the build and flags if it created one.

*(No sub-agent finding has been rejected against `decisions.md` yet. If the post-draft verification sub-agent surfaces a finding that contradicts a decision, record it here with a one-line rationale -- decisions win.)*

## Recovery

Per anticipatable failure mode (not speculative):

- **Gate fails (still PARTIAL) on weapon-scripts.** The fixture is a known-good note that NAILED its thread in the POC, so a PARTIAL here means the **runner machinery** is wrong, not the note. Diff the grounding the runner assembled (`outputs/weapon-scripts/q-12393.md`) against the POC's `outputs/q-12393.md` snapshot -- the retrieval lift or the self-exclusion likely drifted. Do NOT "fix" by lowering the bar.
- **Confab false-positive on weapon-scripts.** The POC's confab check flags multi-word/syntax tokens as NOT-FOUND. If the gate fails on a soft flag (real entity, not in grounding) treat it as a flag, not a fail; only a **hard confab** (absent from L1) fails the gate. Re-check the classification sharpening (Stage 3 (a) vs (b)).
- **Workflow answer step errors / no API path.** If the answer subagent dies on a credential error, the SDK trap (F2) has leaked in -- grep the script for `anthropic-ai/sdk` / `fetch` to the API and remove it; the answer step is a Workflow `agent()` only. If it dies on rate-limit, drop concurrency and pace (Sonnet, low concurrency -- `reference_workflow_rate_limit_and_args`).
- **Load error on the dry-run note.** Check Bun (not npm -- the `workspace:*` dep breaks npm, D13); `tx.json` for any new JSONB write; and that the slug is present in frontmatter (the loader skips slug-less files via `parseConceptFile` returning null). The loader scans the whole `curated/concept-notes/` dir -- there is no single-file interface.
- **Skill produces a by-engine note.** If the dry-run note is named/structured per-engine instead of by-domain, the contract's name-by-domain rule (D6) was dropped -- re-author the frontmatter + section structure; do not ship a per-engine note.
