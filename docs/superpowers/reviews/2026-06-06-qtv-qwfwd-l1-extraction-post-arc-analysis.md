# QTV + QWFWD -> Layer 1 extraction -- post-arc analysis (2026-06-06)

**Reviewer:** post-arc fresh terminal (did NOT execute or orchestrate any phase; read the spec, decisions, findings, ledgers, and validation reports cold, then verified the shipped state against the live Postgres dev DB).

**Sources read:**
- Spec: `docs/superpowers/specs/2026-06-05-qtv-qwfwd-l1-extraction-design.md` (+ planner-handoff sibling)
- Seed: `docs/superpowers/parking/2026-05-31-qtv-qwfwd-documentation.md`
- Scaffold: `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/` -- `README.md`, `decisions.md` (D1-D13 + the dated D4 amendment), `review-findings.md` (F1-F18), `orchestrator-ledger.md`, and the phase index / executor prompts (phases 0-4)
- Validation reports: `docs/superpowers/reviews/2026-06-05-qtv-1.16-dev-validation.md`, `docs/superpowers/reviews/2026-06-05-qwfwd-1.40-dev-validation.md`
- Arc-history: `apps/qw-oracle/docs/arc-history.md` (checked for a qtv/qwfwd ship entry)
- Live verification: Postgres 16 dev DB (`qw-oracle-postgres-dev`) -- entity counts, source_state, description_origin, version rows, the `*version` drop, the F17 flags representation, migration 020, the project CHECK constraint; `quality-grid.ts` floor probes; the out-of-repo `describe-fill-synthesis` skill gate.

---

## Verdict

**The arc shipped clean on substance, with the wrap-up ritual incomplete.** All five phases (0-4) landed in commit order; every spec section is DELIVERED. I independently re-verified the Phase-4 shipped state against the live DB and it matches the validation reports exactly: qtv = 52 entities (40 cvar + 12 command), qwfwd = 50 entities (13 cvar + 29 command + 2 cmdline_param + 6 info_key), **all 102 `source_backed` with `description_origin='synthesized'`**; versions are head+tag for both; migration 020 is applied; the `entities_project_check` admits both new projects; the 12 new F1 floor probes are present and their underlying data matches. **Zero MISSING items.** Three sections are DELIVERED-DIFFERENT (knob counts refined downward by the extractor per F13/F14 -- the spec's own "extractor is source of truth" clause anticipated this; the "MCP-queryable" promise is true at the data layer but the deployed MCP is still PROD-scoped and returns empty for qtv/qwfwd; and the D4 "one versions row" framing was superseded by the F12 head+tag recipe).

The honest gap is **bookkeeping, not engineering**: the arc is **not tagged** (`arc-qtv-qwfwd-l1-shipped` was the orchestrator's stated next step and does not exist), **arc-history.md has no entry** for it, the **orchestrator-ledger ends at "Phase 4 -- PREP DONE"** (its independent Phase-4 boundary-verification log entry was never written, even though the executor committed Phase 4 at `9318e0d5`), and **no post-arc handoff doc** was produced. None of this changes the shipped correctness -- my own cold live-DB pass stands in for the missing orchestrator re-gate and confirms the boundary -- but the closing ritual needs to be finished. Five findings remain open as operator-judgment YELLOWs (F13/F14, F17, F18, the MCP PROD-refresh gap), none of them blocking.

---

## Spec section walkthrough

### Goal / end-state

Status: **DELIVERED-DIFFERENT** (data-layer complete; deployed-MCP refresh outstanding).

Evidence: live DB -- 52 qtv + 50 qwfwd entities, 100% `source_backed`, 100% `description IS NOT NULL`, 100% `description_origin='synthesized'`. Each phase shipped as its own runnable commit (`bf944a3f` P0, `161c6c1a` P1, `cc80ea6a` P2, `c5aa4092..14b1e2d2` P3, `9318e0d5` P4). Concept-note authoring correctly deferred and decided (see below).

Notes: "MCP-queryable" is the one soft spot. The data is present and correct in the dev Postgres, but the live session MCP is PROD-scoped (ezquake/fte/mvdsv/ktx/qwcl) and returns empty for qtv/qwfwd -- the known, ledger-documented PROD-refresh gap that every phase hit. The arc verified at the data layer throughout (correct given the constraint), but "first-class L1 citizens, MCP-queryable" is not fully true until the served MCP/snapshot is refreshed. Tracked as a YELLOW, not a MISSING -- the deliverable is built; the deploy is a separate concern.

### Targets (locked)

Status: **DELIVERED**.

Evidence: QTV = Go `QW-Group/qtv` at version label `1.16-dev`; QWFWD = C qqshka at `1.40-dev`. Both loaded as frozen vendored snapshots with `commit_sha` = the version-constant sentinel (D4/F5 -- no `.git`). Live `versions`: `qtv {1.16-dev ord1, head ord999999}`, `qwfwd {1.40-dev ord1, head ord999999}`, all `parse_state='ok'`. The non-targets (`qqshka/qtv-go`, `fteqtv`, the hub web viewer) were not touched.

### Knob surface (approximate)

Status: **DELIVERED-DIFFERENT** (counts refined by the extractor, exactly as the spec licensed).

Evidence: the spec's hand-counts (QWFWD ~13-14 cvars/~30 cmds; QTV ~41 cvars/~12 cmds) resolved to QWFWD 13 cvar / 29 command / 2 cmdline_param / 6 info_key and QTV 40 cvar / 12 command. The two downward deltas are both the `*version` starred-name drop (F13 qwfwd: 14 emitted -> 13 loaded; F14 qtv: 41 emitted -> 40 loaded), and qwfwd command 29-not-30 is the `#ifdef CVAR_DEBUG` `cvar_hash_print` correctly absent. Live DB confirms 0 `*`-prefixed cvars across both projects. The spec explicitly said "the extractor output supersedes [hand-counts]" (F7), so this is the designed behavior, not a deviation. "No new entity types" held -- `SELECT DISTINCT type` is exactly `{cvar,command}` (qtv) and `{cvar,command,cmdline_param,info_key}` (qwfwd).

### Schema change

Status: **DELIVERED** (with a documented +1 to the compiler-forced site count).

Evidence: `db/migrations/020_qtv_qwfwd_projects.sql` exists (applied 2026-06-05, recorded in `schema_migrations`). The live `entities_project_check` reads `ARRAY['ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv']` -- both new projects admitted across the 10 CHECK clauses / 9 tables (F1). The `Project` union widened; `tsc --noEmit` is the gate. F10 surfaced a 13th `Record<Project>` site the F4 grep missed (`idempotency.ts`'s derived `Exclude` type) -- correctly narrowed to exclude qtv/qwfwd (they bypass extract-tag per D1) rather than adding crashing config entries. SCHEMA.md updated in-phase.

### Toolchain (locked)

Status: **DELIVERED** -- and this was the arc's real technical risk, retired cleanly.

Evidence: QWFWD shipped as a libclang port on `extractor_lib` rails (4 handlers + `clang_config` + `extract.py`); QTV shipped as a native `go/ast` extractor (`extract.go`, Go 1.24.4) -- **the pipeline's first non-C front-end**. Both emit the same per-type JSON the existing adapters consume. The load-integration unknown (the spec's promoted Phase-1 crux: `extract-tag.ts` cannot drive a no-`.git` Go snapshot, F2) was resolved by D1 -- bypass `extract-tag`, load via the canonical `load-version --json`. Phase 1 fired the tracer bullet through the lower-risk C extractor first; Phase 2 added the Go novelty on the proven path. Both extractors verified reproducible (re-extract -> empty git diff) and idempotent (re-load -> 0 transitions).

### Describe pass (reuse describe-fill-synthesis)

Status: **DELIVERED**.

Evidence: all 102 knobs carry `synthesized` descriptions (live-confirmed). The load-bearing D6 C-vs-Go QTV config guard held on independent re-run: V6 Probe A = 0 (no C-only knob name -- `mvdport`/`admin_password`/`floodprot`/`allow_http` -- appears in any qtv description) and Probe B = 0 (every qtv knob anchors `pkg/%`). The mother-ledger pattern (D10) drove a QWFWD half + a fresh-mother QTV half. Spot-verified the source-register-site discipline: F11's `net_ip`/`net_port` dynamically-computed defaults are correctly surfaced in prose ("listens on every IP address"; "Default: 30000" + cmdline-override) rather than the raw variable-name `default_value`. The skill's `{ktx,mvdsv}` pre-flight gate was widened to `{ktx,mvdsv,qtv,qwfwd}` (F8/Q-SKILL Option A -- an out-of-repo user-global edit, verified live at SKILL.md line 103).

### Verify pass (reuse validate-extractor)

Status: **DELIVERED** (Postgres-translated per D12/F3).

Evidence: two validation reports under `docs/superpowers/reviews/`, both PASS. 12 new `F1.{qtv,qwfwd}.floor.*` probes added to `quality-grid.ts` (8 qwfwd + 4 qtv, count + source_state each) -- present in source and their expected values match live data. Section 2 (runtime cross-validation) is a documented precondition-driven N/A (frozen snapshots, no live build / runtime dump), consistent with `project_qw_dev_head_not_releases` -- not a silent omission. F10's reproducibility-method implication was honored: qtv/qwfwd use standalone-rerun + git-diff, not the extract-tag-coupled `idempotency --project` probe (which deliberately rejects them).

### Concept notes (deferred -- decide after describe)

Status: **DELIVERED** (decision made; authoring correctly out of scope per D9).

Evidence: the Phase-4 deliverable is a documented if/which decision grounded in 11 live `[L3 breadcrumb]` tags harvested from `description_reasoning` (the SR-5 convention). Decision: **(a) master-server registration/heartbeat = AUTHOR (strong, 6 knobs, widest cross-codebase span); (b) MVD streaming + parse_delay ghosting = AUTHOR (4-knob rich harvest -- the "defer if thin" trigger did not fire); (c) qtv_password auth matrix = DEFER (1 knob, already See-also-wired to the shipped MVDSV ledger).** No notes authored (correct -- D9 says decide, a follow-on arc authors). Operator ratifies at sign-off.

### Execution pattern (mother-ledger)

Status: **DELIVERED**. Phase 3 ran the mother-ledger pattern (D10) -- `mother-ledger.md` + per-knob ledgers committed append-only. The arc also added the orchestrator-ledger as the cross-phase memory board.

### Out of scope (D13 fence)

Status: **DELIVERED** -- the fence held. No phase drifted into fteqtv extraction, the hub web viewer, re-opening the MVDSV `qtv_*` rows, the MVDSV `qtv_password` trim, or `qqshka/qtv-go`. No scope-creep flag was raised in any ledger.

### Phasing sketch (Phase 0-4)

Status: **DELIVERED**. The five-phase slice (schema -> QWFWD tracer bullet -> QTV second slice -> describe-fill -> validate+decide) shipped exactly as planned, one new variable per phase, each a runnable commit, each operator-gated at the boundary.

---

## Shipped beyond spec

- **The Go `go/ast` extractor as a reusable asset.** The spec named the toolchain; what shipped is the pipeline's first non-C front-end with a const-fold pre-pass (resolves named-constant defaults like `qtvRelease`), flag bit-OR handling, and deterministic sorted output. This is a durable capability for any future Go QW tooling, not just qtv. *Recommend: note in `project_extraction_pipeline_vision` memory that the pipeline is now polyglot (C/libclang + Go/go-ast + KTX/tree-sitter).*

- **The F12 head+tag recipe for single-version frozen snapshots (D4 amendment).** Execution discovered that a tag-only load retires every entity to `source_retired` (the entity-state-retreat block requires a HEAD_ORDINAL row). The fix -- load `head` first, then the labeled tag, same commit -- matches the qwcl precedent and is now a load-bearing rule for any frozen-snapshot onboarding. *Recommend: fold "single-version projects load head+tag" into the EXTRACTOR-PLAYBOOK / `onboard-extractor` skill so the next frozen onboarding doesn't re-derive it (the executor surfaced this; it was not done -- shared-tooling change, operator's call).*

- **The out-of-repo `describe-fill-synthesis` skill gate widening.** F8 -> Q-SKILL Option A widened the user-global skill from `{ktx,mvdsv}` to `{ktx,mvdsv,qtv,qwfwd}` (functional gate + 5 doc refs). Safe-additive, verified live. Because it lives outside the repo, it is invisible to git history -- recorded only in the orchestrator-ledger. *Recommend: keep this in mind as a standing "the skill now serves four projects" fact; a future fork needs the same edit.*

- **The SR-5 `[L3 breadcrumb]` convention.** A new convention (absent from the sibling KTX/MVDSV arc): describe workers tag `description_reasoning` with `[L3 breadcrumb: <candidate>]` so the Phase-4 concept-note decision has live evidence to harvest instead of re-deriving. This is what turned candidate (b) from "author-lean, defer if thin" into a confident AUTHOR. *Recommend: promote to the describe-fill methodology for any arc that ends in a concept-note decision.*

- **The cross-front-end adapter audit (validation sub-agent 4c).** A validation check the runbook didn't have, added because this arc introduced the first non-C front-end: confirm the Go and C extractors emit the same loader contract. It is what surfaced F17. *Recommend: bake a "cross-front-end contract parity" section into `VALIDATION-RUNBOOK.md` now that the pipeline is polyglot.*

---

## Open YELLOWs from sign-off

- **F17 -- QTV `flags_raw` is NULL where the C extractors emit the `''` sentinel.** Live-confirmed: 54 qtv cvar-version rows (27 unflagged cvars x 2 versions) carry `flags_raw IS NULL`, 0 sentinel; qwfwd carries 10 sentinel, 0 NULL. Investigated (root cause known): the Go `resolveFlags` returns nil for the no-flag `Reg(name,default)` form; `load-cvars.ts:52` preserves it. **Not data loss** (`flag_names=[]` correctly encodes "no flags") and caught by no quality-grid probe -- visible only via the runbook's manual 3.2.1 negative bar. Recommendation: small follow-up -- `resolveFlags` returns `""` for the no-flags case, then re-extract/re-load/re-verify; or a documented qtv carve-out. **Operator decision.**

- **F13 / F14 -- `*version` captured in neither cvar nor info_key (both projects).** Investigated: `*`-prefixed names are info_key-only by the established loader convention, so the cvar-registered `*version` is correctly dropped; but neither tool sets it via `Info_*`, so it falls between the two handlers. Low impact -- the proxy version is already surfaced via the `versions` row (and `*qwfwd:userinfo` for qwfwd). Recommendation: a small cross-handler enhancement (route `*`-prefixed `Cvar_Get`/`qvs.RegEx` names into the info_keys output) for cross-engine `*version:serverinfo` parity, OR accept the deferral. **Paired operator judgment.**

- **F18 -- pre-existing ezquake floor-baseline drift (NOT this arc).** The full 7-project V6 grid surfaced 8 ezquake floor failures (cvar 2996 vs 2992, command 699 vs 693, doc_only/source_retired shifts, stale `first_seen_min_ordinal`). Verified not arc-caused: the Phase-4 quality-grid edit is purely additive (0 lines touch ezquake) and no ezquake load ran in this phase. This is the recurring "floor counts are snapshots" situation (`reference_qw_oracle_floor_vs_clean_reload`). Recommendation: a dedicated ezquake re-baseline pass (source-walk to confirm legitimate dev-head growth, then bump). **Surfaced for routing.**

- **MCP PROD-refresh gap.** qtv/qwfwd exist in the dev DB but not in the deployed (PROD-scoped) MCP, so `lookup_entity(qtv|qwfwd, ...)` returns empty in the live session. Known and documented across all phases; verified at the data layer instead. Recommendation: refresh/redeploy the served MCP so the new projects are queryable through the tool surface (closes the "MCP-queryable" half of the Goal section).

- **F16 -- ADDRESSED.** The QTV floodprot triplet was mis-named in planning prose (`fp_time`/`fp_limit`/`fp_message` -> real `fp_messages`/`fp_persecond`/`fp_secondsdead`). The descriptions were written against the real knobs (V-pass traced clean; the `fp_persecond` seconds-window-not-rate trap was actively caught). The orchestrator applied the doc-only correction to the phase MD + qtv-mother-handoff with dated `[F16]` notes (operator-approved); the append-only mother-ledger was correctly left untouched. No residual.

- **(advisory) `load-cmdline-params.ts` reads no `description` column.** The qwfwd cmdline extractor emits a per-param `description` the adapter silently drops. Not user-facing loss (both `ip`/`port` carry authoritative `synthesized` descriptions in `entities.description`, the MCP surface). Cosmetic; no action.

---

## Findings during review (cross-checks)

These are the cold-read cross-checks the skill mandates; they catch what a section walk can miss.

- **Arc-history drift -- NO entry exists.** `apps/qw-oracle/docs/arc-history.md` has no qtv/qwfwd ship paragraph; its newest entry is 2026-06-05 (KTX game-mode v2), and the file was last modified before the phases shipped. The arc-history append (normally a wrap-up/docs-check step) was never done. **This is the load-bearing bookkeeping gap** -- a future cold Claude reading arc-history would not know this arc shipped.

- **No arc tag.** `git tag | grep qtv` is empty. The orchestrator-ledger's stated closing sequence was "tag `arc-qtv-qwfwd-l1-shipped`, push, write the post-arc handoff to arc-reviewer." None of the three happened; arc-reviewer (this terminal) was launched directly.

- **Orchestrator-ledger Phase-4 entry missing.** The boundary-verification log ends at "Phase 4 -- PREP DONE (prompt drafted, awaiting dispatch)." There is no recorded independent orchestrator re-gate of the Phase-4 boundary, even though the executor committed Phase 4 (`9318e0d5`) and produced both validation reports. **Mitigation:** my own cold live-DB verification (this review) independently confirms every Phase-4 claim, so the shipped state is sound regardless -- but the orchestrator's own "I re-ran the boundary" record is absent from the ledger. If the operator did re-gate, it just wasn't logged; if not, this review is the substitute.

- **decisions.md amendments captured correctly.** The single amendment (D4, dated 2026-06-06, F12 head+tag) is a proper dated block under the original decision with full reasoning and the qwcl precedent cited. No silent overrides.

- **review-findings.md fully routed.** All F1-F18 are resolved-by-a-decision, fixed-in-a-phase, or routed to operator judgment with an explicit disposition. No silent F-numbers. F6/F7 are advisory-by-design. The phase-ownership table at the bottom is complete.

- **Executor prompts preserved.** `phase-{0,1,2,3,4}-executor-prompt.md` are committed under the scaffold (not transient) -- durable for future-arc onboarding, including the Phase-4 prompt's 4 load-bearing overrides.

---

## Recommendations for Arc N+1 prep

Ordered smallest scope first. The operator picks what fits.

1. **Finish the wrap-up ritual (small; do this first).** Write the arc-history.md entry (one paragraph, the convention), create + push `git tag -a arc-qtv-qwfwd-l1-shipped`, and append the Phase-4 boundary line to the orchestrator-ledger (or accept this review as the boundary record). This is pure bookkeeping but it is what makes the arc legible to the next cold session. Source: the cross-checks above.

2. **Refresh the served MCP for qtv/qwfwd (small-medium; deploy).** Close the "MCP-queryable" half of the Goal section by redeploying/refreshing the PROD MCP (or its snapshot) so `lookup_entity(qtv|qwfwd,...)` resolves. Source: the MCP PROD-refresh YELLOW. Dependency: whatever the normal qw-oracle MCP deploy/refresh path is.

3. **ezQuake floor re-baseline pass (small; source-walk-gated).** Confirm the 8 drifted ezquake floors are legitimate dev-head growth, then bump `EZQUAKE_FLOOR_PROBES` (KTX 2026-06-04 bump precedent). Source: F18. Independent of qtv/qwfwd.

4. **F17 qtv `resolveFlags` sentinel normalization (small).** `resolveFlags` returns `""` not nil for the no-flag case -> sentinel parity with the C front-ends -> re-extract/re-load/re-run V1-V6. Touches shipped Phase-2 code, so it is its own small cycle. Source: F17. Alternative: a documented carve-out.

5. **F13/F14 `*version:serverinfo` cross-handler parity (small).** Route `*`-prefixed cvar registrations into the info_keys output for both tools, for cross-engine parity. Source: F13/F14. Low impact -- could equally be accepted-and-documented.

6. **Fold the head+tag single-version rule into shared tooling (small; tooling doc).** Add "single-version frozen snapshots load head+tag, head-first" to the EXTRACTOR-PLAYBOOK / `onboard-extractor` skill. Source: the F12/D4 shipped-beyond-spec item.

7. **Concept-note authoring follow-on arc (its own arc; medium).** Author the two greenlit notes -- (a) master-server registration/heartbeat and (b) MVD streaming + parse_delay ghosting -- See-also-linked to the shipped MVDSV `qtv_*` rows, pending operator ratification of the Phase-4 recommendation. This is brainstorm + author, not a fill, so it earns its own arc. Source: the D9 concept-note decision. Dependency: operator greenlight.

---

The arc shipped clean -- 0 MISSING, all spec sections delivered, every Phase-4 claim independently re-verified against the live DB -- but it is **not yet closed**: no tag, no arc-history entry, no post-arc handoff. Recommendation #1 is the gap to mind before this arc can be called done.

---

## Post-arc disposition (2026-06-07)

Close-out session after the cold review. Arc-history entry added + `arc-qtv-qwfwd-l1-shipped` tag pushed; the two pre-prod fixes (embed 102 + orientation) committed; prod deploy deliberately bundled with the imminent Phase-C L2 deploy (operator: no real MCP consumers yet). The three open YELLOWs were dispositioned:

- **F17 -- FIXED** (`caebc96b`). qtv `extract.go` now defaults `cvarAst.FlagsRaw` to the `''` sentinel (RegEx with real flags still overrides), re-extracted + re-loaded qtv cvars head+tag. Live: 54 cvar-version rows flipped NULL->`''`, runbook 3.2.1 negative bar 54->0 violations, counts unchanged (40/12), descriptions intact, quality-grid 147/147 clean. No re-embed (descriptions unchanged).
- **F13/F14 -- ACCEPTED as-is** (no code). `*version` stays captured-in-neither-type. Rationale: the version is already surfaced via the `versions` row (`1.16-dev`/`1.40-dev`) and, for qwfwd, `*qwfwd:userinfo`; a dedicated `*version:serverinfo` would be redundant and would require cross-handler routing in two languages (Go + Python libclang) touching shipped extractor code for near-zero consumer value. Decision recorded so it is not re-flagged.
- **F18 -- FILED, not blind-fixed.** Pre-existing ezquake floor-baseline drift, not qtv/qwfwd-caused. Bumping `EZQUAKE_FLOOR_PROBES` is source-walk-gated (confirm the +4 cvar / +6 command drift is legitimate dev-head growth, not a regression, before baking it into the baseline -- `feedback_idempotency_before_staleness`). Routed to HANDOVER as a standalone ezquake re-baseline task.

With F17 fixed and F13/F14/F18 dispositioned, the arc is **closed**. Remaining forward items (prod deploy bundled with Phase C; concept-note authoring arc for candidates a+b; QWCL describe-fill seed; the ezquake re-baseline) live in HANDOVER as backlog, not arc work.
