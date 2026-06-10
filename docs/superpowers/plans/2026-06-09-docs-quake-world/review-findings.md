# docs.quake.world -- review findings (evidence ledger)

**No prior plan attempt exists for this arc.** Unlike qw-oracle Arc 1 (which had a 3596-line monolithic plan to mine for bugs), docs.quake.world goes straight from spec to scaffold. So this ledger is NOT a post-mortem of a prior draft. It is seeded with the **known hazards** arc-planner found while reading the live producer (`build-snapshot.ts`), the schema, and the precursor's verified notes -- the things a phase drafter must design around. Further findings accrue here (sequential F-numbers) as phases are drafted and verified.

Each finding: what it is, the evidence, severity, and which decision resolves it.

---

## F1. build-snapshot extension must not break slipgate's snapshot consumption (HARD GATE)

**What:** `build-snapshot.ts` is the producer Phase 1 extends. It already writes slipgate-shaped JSON into `apps/slipgate-app/src/lib/config/data/` for ezquake, qwcl, and qw (maps/gameplay), and slipgate's loaders read those exact files. Extending the producer to emit the other codebases for docs must not perturb those files' shape.

**Evidence:** `build-snapshot.ts:43` (`DEFAULT_OUTPUT_DIR` = slipgate data dir), `:723-744` (per-project dispatch; `:743` THROWS for any project other than ezquake/qwcl/qw). The ezquake emitters (`emitEzqVariables` etc.) and `emitQwclVariables` produce the precise legacy shapes slipgate depends on (the file header comment, lines 1-29, states "Shape parity with the legacy JSONs is preserved so slipgate's loaders need zero structural change").

**Severity:** CRITICAL. A shape regression silently breaks slipgate's config viewer.

**Resolved by:** D12 (docs export is a separate emit path writing to a docs-owned dir; existing emitters untouched). Phase 1 verification regime MUST carry a slipgate-parity probe (the ezquake/qwcl/qw files in slipgate's data dir are shape-identical pre/post the Phase 1 change). Record the pre-change file hashes in `prerequisites.md` Task 0.

## F2. Non-ezQuake export shape is consumer-validated only at Phase 3 (regime smell)

**What:** The spec's phasing exports all 6 codebases in Phase 1 but renders only ezQuake in Phase 2; the other 5 codebases' JSON is not exercised by a real consumer (the renderer) until Phase 3. If Phase 1 freezes a shape that does not actually render for, say, KTX `log_template` or MVDSV `protocol_message`, that surfaces in Phase 3, not Phase 1 -- a "phase N verification depends on phase N+1" smell.

**Evidence:** Spec section 12 (phasing) + section 13 (data appendix: KTX/MVDSV/QTV/QWFWD carry entity types ezQuake does not -- log_template, protocol_message, qc_builtin, info_key, match_event).

**Severity:** SUBSTANTIVE. Not a regime COLLISION (Phase 1 has a self-contained verification: the JSON is well-formed and the uniform-shape contract holds), but a latent integration risk.

**Resolved by:** D13 (uniform record shape -- absent fields omitted, so non-ezQuake types are SUBSETS of the union shape) + D14 (type-generic renderer -- Phase 2 builds the renderer against the generic record, not an ezQuake-special path). Mitigation baked into slicing: Phase 1 emits the uniform shape for ALL types across all 6 codebases AND ships a schema-shape probe (every emitted record validates against the uniform shape); Phase 2's renderer consumes the generic record so that Phase 3 is data-only. If Phase 3 needs new component code, that is a Phase 2 failure (D14 implication) -- escalate.

## F3. category-version inversion (qtv/qwfwd/qwcl read frozen, not head)

**What:** The precursor wrote `category_inferred` to ALL version rows per entity. But qtv/qwfwd/qwcl carry TWO version rows each (frozen + `head`), and the snapshot reads the frozen one (`1.16-dev` / `1.40-dev` / `2.33`). An emitter that reads `head` for those three would diverge from the slipgate convention and risk reading the wrong row.

**Evidence:** Precursor `taxonomy.md` ("`category_inferred` write target: ALL version rows per entity ... the snapshot reads the frozen one ... writing only head would be invisible to the snapshot") + `build-snapshot.ts:683-692` (`PROJECT_DEFAULT_SNAPSHOT_VERSION`: qtv `1.16-dev`, qwfwd `1.40-dev`, qwcl `2.33`).

**Severity:** SUBSTANTIVE. Wrong-version read yields empty or mismatched categories for three codebases.

**Resolved by:** D16 (emit at the per-codebase frozen version) + a Phase 1 probe asserting non-empty category coverage for qtv/qwfwd/qwcl at their frozen versions.

## F4. ezQuake category + groups taxonomy depend on extractor AST output (not just the DB)

**What:** ezQuake's category render needs the `groups` taxonomy block, which `build-snapshot.ts` reads from the extractor AST output JSON (`scripts/extractors/ezquake/output/ezquake-variables-ast.json`), not from Postgres. If that file is absent, the ezQuake emit throws.

**Evidence:** `build-snapshot.ts:29` (comment: "Group taxonomies ... live in the extractor AST output, not knowledge.db"), `:299-305` (`readExtractorAst` throws if the file is missing), `:316` (ezQuake variables emit reads it).

**Severity:** ADVISORY (it is a prerequisite, not a design flaw). The file exists today (slipgate's ezquake emit already uses it).

**Resolved by:** D17 (ezQuake reads `groups`; others read `category_inferred`) + `prerequisites.md` Task 0 (confirm the extractor AST output JSONs are present before Phase 1). The docs emitter for the OTHER 5 codebases avoids the AST dependency (they use `category_inferred` from the DB).

## F5. Category exists only on cvar + command (other types are uncategorized)

**What:** `category_inferred` lives only on `cvar_versions` and `command_versions`. Other entity types (info_key, cmdline_param, log_template, protocol_message, qc_builtin, match_event, macro, ...) have no category. A drafter expecting per-type categories everywhere would build a filter that is always empty for those types.

**Evidence:** SCHEMA.md `cvar_versions` / `command_versions` carry `category_inferred` (migration 016); no other `*_versions` table does.

**Severity:** ADVISORY. Handled by graceful degradation.

**Resolved by:** D17 implication (uncategorized types degrade to a single "(uncategorized)" group; the Flat/Grouped toggle still works, Grouped just shows one group). D11.

---

## Findings-to-phase ownership

| Finding | Severity | Owned by phase | Resolving decision |
|---|---|---|---|
| F1 slipgate-parity gate | CRITICAL | Phase 1 | D12 + parity probe |
| F2 non-ezQuake shape validated late | SUBSTANTIVE | Phase 1 (emit uniform + probe) + Phase 2 (generic renderer) | D13, D14 |
| F3 category-version inversion | SUBSTANTIVE | Phase 1 | D16 + coverage probe |
| F4 ezQuake AST-groups dependency | ADVISORY | Phase 1 (+ prereqs Task 0) | D17 |
| F5 category only on cvar+command | ADVISORY | Phase 2 (renderer) / Phase 3 (fan-out) | D17, D11 |
| F6 qtv/qwfwd upstream_commit is a version-string, not a SHA | ADVISORY | Phase 4 (source links) | D8, D11 |
| F7 ezQuake's 129 uncategorized commands are ~all HUD (L1 categorization gap) | ADVISORY | qw-oracle L1 enrichment (pre-launch); renders fine in docs v1 | D17, D11 |
| F8 docs-web npm/pnpm workspace isolation | ADVISORY | Phase 2a (own pnpm-workspace.yaml) | D20 |
| F9 missing typescript/@types/node devDeps | ADVISORY | Phase 2a (drained) | augmentation #1 |
| F10 daisyUI include omitted `card` | SUBSTANTIVE | Phase 2a (drained) + Phase 2b (include-vs-usage) | D10, D11 |
| F11 D15 grep false-positives on comments | ADVISORY | Phase 2a (drained) + Phase 2b (gate hardening) | D15 |
| F12 execution-mode annotations should be content-conditional | ADVISORY (process) | Phase 2a (ratified) + Phase 2b (annotate) | feedback_no_subagents_for_mechanical_edits |
| F8 root npm `workspaces` glob includes docs-web (pnpm-subtree isolation) | ADVISORY | Phase 2a (own `pnpm-workspace.yaml`) | D20 |
| F13 fan-out structurally pre-shipped by 2b's generic loaders (D14 payoff) | ADVISORY (reshape) | Phase 3 (reduced to verify + display polish) | D14, D2, D11 |
| F14 visual-polish scope gap + 2 theme collisions (nav .menu, card .vp-doc h2) | SUBSTANTIVE (bugs fixed; scope gap open) | Phase 3 (bugs) + pre-deploy design pass (gap) | D10, D11, D15 |

New findings append below with the next sequential F-number and a phase owner.

---

## F6. qtv/qwfwd `upstream_commit` carries the version string, not a git SHA (surfaced in Phase 1 execution)

**What:** The docs export writes `_meta.upstream_commit` from `versions.commit_sha` for each (codebase, frozen version). For qtv and qwfwd that column holds the version string itself (`"1.16-dev"` / `"1.40-dev"`) rather than a 40-char git commit SHA. Phase 4 builds source-link URLs from `_meta.upstream_commit` + `source_ref.{file,line}`; a URL template that assumes a SHA (e.g. `github.com/<repo>/blob/<sha>/<file>#L<line>`) will produce a broken link for those two codebases.

**Evidence (verified against live DB, 2026-06-09):** `SELECT commit_sha FROM versions` -> ezquake `e4a2c20a...`, ktx `67253dc9...`, mvdsv `18d03621...`, qwcl `bf4ac424...` (all real SHAs); qtv@1.16-dev = `1.16-dev`, qwfwd@1.40-dev = `1.40-dev` (NOT SHAs). Phase 1 emits the column verbatim as instructed (the phase MD said emit `versions.commit_sha`), so this is a Phase 4 consumer concern, not a Phase 1 emit bug -- Phase 1 ships the correct raw value.

**Severity:** ADVISORY. Phase 1 is correct; the risk is latent in Phase 4.

**Resolved by:** Phase 4's source-URL builder branches on whether `upstream_commit` looks like a SHA vs a version tag, OR resolves qtv/qwfwd to a tag-based URL (`/blob/<tag>/...`). If neither resolves, omit the source link (graceful degradation, D11). No Phase 1 action.

## F7. ezQuake's 129 uncategorized commands are ~all HUD-element commands (an L1 categorization gap, not a missing group)

**What:** 129 of ezQuake's 624 commands carry no `help_group_id`, so the docs render places them in the single "(uncategorized)" group (D11/D17 -- correct + graceful). On inspection ~128 of the 129 are HUD-element commands: 46 are `+hud_*` / `-hud_*` show/hide action pairs (23 elements), and ~82 are the bare HUD-element registration commands (`health`, `fps`, `ammo`, `gun1`-`gun8`, `group1`-`group9`, `score_*`, `radar`, `tracking`, `sigil1`-`sigil4`, `teamholdbar`, ...). The lone genuine outlier is `qtv_buffer` (a QTV command). ezQuake ALREADY HAS a `hud` command group (one of its 14), so this is a categorization GAP, not a missing group: these commands are registered by `HUD_Register` / recovered by the Track-B HUD command handler (`load-hud-commands.ts`), which does not stamp `help_group_id`.

**Evidence (`apps/docs-web/data/ezquake-command.json`, 2026-06-09):** 495/624 categorized; the 129 uncategorized enumerated above. Existing command groups include `hud = HUD`. The Track-B HUD loader knows each recovered command's `hud_family` + `hud_element` (SCHEMA `command_versions.track_b_hud_recovery`), so the HUD identity is available at extraction time -- the group is simply not written.

**Severity:** ADVISORY. v1 renders correctly with the "(uncategorized)" bucket (this is the bucket-as-worklist payoff; D21's "category-granularity curation -- later refinement"). The risk is launch polish: shipping 128 HUD commands in a junk bucket.

**Resolved by:** A small L1 enrichment in **qw-oracle (NOT a docs-arc phase)** -- and CRITICALLY it must be LOADER CODE, not a manual SQL stamp. `command_versions.help_group_id` is regenerated from `EXCLUDED` on every load (`upsertCommandVersion`, natural-keys.ts:257), so a one-time `UPDATE ... SET help_group_id='hud'` would be CLOBBERED on the next extraction. The persistent fix: `load-hud-commands.ts` (the Track-B handler, which already knows these are HUD via `hud_family`/`hud_element`) sets `help_group_id='hud'` in the `CommandVersionRow` it writes, so every re-extraction re-applies it deterministically (the idempotent-loader / repair-via-corrected-loader pattern, NOT an in-place SQL repair). Ensure load-ordering so no later same-run pass overwrites it. Use the `help_group_id` lane, NOT `category_inferred` -- ezQuake docs read `help_group_id` (D17). `qtv_buffer` -> `demo` is a 1-off (handle separately or leave uncategorized). This belongs in L1 (these ARE HUD -- benefiting docs + slipgate + MCP), NOT a docs-side override. Recommended BEFORE launch (Phase 5); NOT blocking Phases 2a-4. Until then Phase 2b/3's Grouped view renders "(uncategorized)" as a first-class group (D11).

**Persistence model (verified natural-keys.ts, 2026-06-10):** Enrichment survives re-extraction by being EXCLUDED from the loader upsert -- `entities.description` (`upsertEntity` writes only name/last_seen, :146-148) and `*_versions.category_inferred` (absent from both `upsertCvarVersion`/`upsertCommandVersion` SET lists), which is why curated descriptions AND the precursor's `category_inferred` (the other 5 codebases' docs categories) persist. `help_group_id` is the opposite -- loader-regenerated -- so ezQuake's HUD categorization MUST live in loader code, not a manual UPDATE.

## F8. The monorepo-root `package.json` globs `apps/*` as npm workspaces -- docs-web's pnpm isolation rests on its own workspace file (surfaced in Phase 2a drafting)

**What:** D20 makes `apps/docs-web` its own pnpm-workspaces subtree, isolated from qw-oracle's `npm --no-workspaces` backend. But the monorepo-root `package.json` declares npm `workspaces: ["apps/*", "packages/*"]`, which already globs `apps/docs-web`. So two package managers nominally claim the subtree: npm (via the root glob) and pnpm (the intended manager). A naive scaffold that omits a docs-web-local workspace file, or a stray root-level `npm install`, could cross-contaminate the subtree (root npm pulling docs-web's deps into a root `node_modules`, or a lockfile fight).

**Evidence (verified 2026-06-10):** monorepo-root `package.json` = `{ "name": "quakeworld", "private": true, "workspaces": ["apps/*", "packages/*"] }`. No root `pnpm-workspace.yaml` exists. pnpm defines its workspace ONLY from `pnpm-workspace.yaml` (it ignores the package.json `workspaces` field), so a `pnpm-workspace.yaml` placed at `apps/docs-web/` makes pnpm root there and keeps the subtree isolated. The existing apps (qw-oracle, slipgate-app) already live under the same `apps/*` glob and coexist fine via the `npm --no-workspaces` convention -- docs-web is no more exposed.

**Severity:** ADVISORY. Isolation holds as long as (a) docs-web has its own `pnpm-workspace.yaml` and is pnpm-managed (`pnpm --dir apps/docs-web ...`), and (b) nobody runs a bare root `npm install` expecting it to manage docs-web (the standing `npm --no-workspaces` convention covers this).

**Resolved by:** D20 + Phase 2a Task 1 (create `apps/docs-web/pnpm-workspace.yaml`). Phase 2a deliberately does NOT modify the root `package.json` (Chesterton's fence -- the existing apps rely on the current glob; the convention already handles it). Belt-and-suspenders option, operator's call: add `"!apps/docs-web"` to the root `workspaces` array to exclude it from npm entirely. Phase 2a boundary verification asserts the install creates `apps/docs-web/node_modules` and touches no file outside the subtree.

**Operator decision 2026-06-10:** belt-and-suspenders REJECTED. Root `package.json` stays byte-unchanged; isolation rests on docs-web's own `pnpm-workspace.yaml` + the `npm --no-workspaces` convention. Orchestrator re-verified at the Phase 2a boundary: commit `945a3292` touches root `package.json` zero times; all 17 files in-subtree.

## F9. Phase-2a package.json omitted typescript + @types/node -- Task 3's tsc verification was unrunnable (surfaced + drained in Phase 2a execution)

**What:** The Phase-2a MD locked a `package.json` devDependencies block (vitepress / vue / tailwindcss / @tailwindcss/vite / daisyui) but omitted `typescript` and `@types/node`. Task 3's own verification command (`tsc --noEmit` on `lib/`) therefore could not run as written. (Orchestrator augmentation #1 had specified a `tsconfig.json` but not the missing devDeps -- the executor caught the gap the augmentation left.)

**Evidence (Phase 2a execution, 2026-06-10):** the locked devDeps list; `tsc` absent from node_modules until added.

**Severity:** ADVISORY. Self-contained, in-subtree, drained at execution time.

**Resolved by:** executor added `typescript ^5.7.0` + `@types/node ^20.0.0` to devDependencies and a scoped `apps/docs-web/tsconfig.json`. Independently re-verified by the orchestrator: `pnpm --dir apps/docs-web exec tsc --noEmit` exits 0. No carry-forward.

## F10. daisyUI `include:` list omitted `card` while CodebaseGrid.vue used `.card` (locked-content coordination gap; surfaced + drained in Phase 2a)

**What:** The locked `style.css` daisyUI `include:` list (the curated component subset) omitted `card`, but the locked `CodebaseGrid.vue` landing component uses `.card` / `.card-body` / `.card-title`. daisyUI v5 emits CSS only for INCLUDED components, so the landing cards rendered without the daisyUI card component (no card-body padding/border).

**Evidence (Phase 2a execution, 2026-06-10):** the two locked files disagreed. The orchestrator's 2a paper review verified the data contract rigorously but did NOT cross-check the include list against the component's class usage -- that is the gap that let it reach execution.

**Severity:** SUBSTANTIVE. Visible render defect (un-styled cards), non-breaking.

**Resolved by:** executor added `card` to the include list; `.card`/`.card-body` now compile. Orchestrator re-verified (`grep card style.css` -> present; build exits 0). **Carry-forward (Phase 2b):** the 2b browse/card components introduce more daisyUI classes (collapse for inline-expand, input for filter, toggle for Flat/Grouped, tab); the 2b drafter MUST keep every component class it uses in the `include:` list, and 2b verification should grep component class usage against the include list (an include-vs-usage probe catches this mechanically).

## F11. D15 decoupling grep false-positives on descriptive comments (surfaced + drained in Phase 2a)

**What:** Boundary check #5 (the D15 decoupling gate) greps components for `fetch(|readFileSync|readdirSync|.filter(|.map(|.reduce(`. The locked `CodebaseGrid.vue` carried a comment literally stating "no fetch ... no .filter()/.map() derivation here" -- the verbatim grep matched the COMMENT and reported a false-positive FAIL, though the component logic is clean.

**Evidence (Phase 2a execution, 2026-06-10):** mirrors the repo's matchAll-vs-RegExp scanner lesson (CLAUDE.md misc conventions) -- literal-substring verification greps trip on descriptive text.

**Severity:** ADVISORY. A verification-gate artifact, not a code defect.

**Resolved by:** executor reworded the comment to convey the same intent without the trigger tokens; logic unchanged. Orchestrator re-verified (grep empty). **Carry-forward (Phase 2b + future render phases):** either (a) keep component comments free of the trigger tokens, or (b) harden the gate to ignore comment lines (strip `//` and `/* */` before grepping). The reword is the cheap fix shipped; gate-hardening is the durable one.

## F12. Execution-mode annotations should be content-conditional, not tier-by-task-shape (Phase 2a execution-mode deviation, ratified)

**What:** The Phase-2a MD annotated Task 2 = `subagent (Sonnet MAX)` and Tasks 3/4/5 = `subagent (Sonnet medium)`. The executor ran ALL tasks inline and surfaced the deviation with rationale: every file's content was fully locked/verified in the MD, so dispatching subagents to transcribe locked content is ceremony not value (operator memory `feedback_no_subagents_for_mechanical_edits` + momentum-over-ceremony); the one genuine MAX-tier judgment (the Tailwind-v4 preflight gotcha) was met inline with a correct evidence-based CSS-cascade analysis.

**Evidence (orchestrator boundary verification, 2026-06-10):** all six boundary checks independently re-verified GREEN (tsc exit 0; build exit 0 + 28 routes; D15 grep empty; isolation clean -- 17 in-subtree files, root untouched). Output quality is verified-good -- this is NOT the qw-oracle Arc 1 inline-crowding defect (which degraded quality silently); it is a reasoned, surfaced, correct call.

**Severity:** ADVISORY (process).

**Ratified ruling (orchestrator 2026-06-10):** ACCEPTED for Phase 2a. The annotation was over-cautious -- a task that ships FULL locked file content in the MD should be annotated `inline` regardless of nominal complexity tier; subagent dispatch is for genuine code SYNTHESIS (from-scratch, multi-file judgment), not transcribing locked content. **Carry-forward (Phase 2b):** 2b is DIFFERENT -- the type-generic browse/card renderer, the friendly-type derivation, the category resolver, and the filter module are genuine synthesis (the D14/D15 win-or-lose work, NOT locked content). Those SHOULD be `subagent (Sonnet medium; the generic renderer possibly Sonnet MAX)`. The 2b drafter annotates execution mode content-conditionally: `inline` only for truly-locked stubs/config; `subagent` for the synthesis modules. The 2b executor honors the annotations (no blanket inline -- the synthesis benefits from isolated context).

## F13. The 5-codebase fan-out was structurally pre-shipped by 2b's generic loaders -- Phase 3 reduces to verify + display polish (surfaced in Phase-3 orchestrator boundary verification)

**What:** Phase 3 was planned as the fan-out: "wire the other 5 codebases through the SAME components as data + config + landing pages." Cold verification of the shipped 2b build (orchestrator, 2026-06-10) found the wiring is ALREADY DONE by construction: the route loaders (`[codebase]/[type].paths.ts`, `[codebase].paths.ts`, `codebases.data.ts`) are `listSnapshots()`-driven (every codebase, not just ezQuake), and the components are codebase/type-agnostic (D14). So `docs:build` already generates all 28 routes -- all 6 codebases, all 20 type pages, all 6 landings -- and they render with correct graceful degradation (verified cold: Type column only on ezquake+qwcl cvar; Default on all cvar pages; Flat/Grouped toggle gated on `category_inferred` presence; info_key `scope` render path present; version-walk + source-link URLs ezQuake-only; `choice` unreachable for QWCL). The nav (`config.ts`) already lists all 6 with friendly display names, and local search (D9) is wired. This is the D14 payoff landing exactly as designed: "adding a codebase is a data + config addition, never new component code" -- and here it was not even a config addition, because the loaders enumerate from disk.

**Evidence (orchestrator cold verification, 2026-06-10):** `find .vitepress/dist -name '*.html'` = 28 routes incl. ktx/mvdsv/qtv/qwfwd/qwcl pages with real rows (ktx/cvar ~281, qwcl/cvar ~193, ...); column-header grep across pages confirms Type/Default drop per the matrix; toggle-presence grep confirms `hasCategories` per the matrix; `EntityCard.vue` carries the `scope` render path; `config.ts` nav has all 6 friendly names.

**Severity:** ADVISORY (a reshape, not a hazard). The slicing is not broken -- Phase 3 is still a coherent unit, just lighter than a naive reading of "fan-out" implied. The deliverable ("all 6 codebases browse-able, graceful degradation visibly correct") is met at the static level; the live click-through is the operator floor-check.

**Resolved by:** D14 (the design that pre-shipped the wiring) + D2 / D11. Phase 3 reframed (operator-approved 2026-06-10, "verify + light polish") to: Task 1 = verify graceful degradation across the 5 non-ezQuake codebases (the gate -- cold checks + operator floor-check); Task 2 = codebase display names so page headings match the nav casing (a build-time `lib/codebase-label.ts` seam passed via the render contract -- D15-clean, codebase-generic, FTE degrades to its slug); Task 3 = swap the lone `&mdash;` to ASCII. The D14 escalation contract stands: if a degradation defect needs NEW component code, that is a 2b design gap (escalate + amend `decisions.md`), NOT a Phase-3 component fork. See `phase-3-fanout.md`.

## F14. docs v1 ships on the VitePress presentation layer with no visual-polish phase -- two scaffold-era theme collisions fixed, broader styling deferred (surfaced in Phase-3 operator floor-check)

**What:** The Phase-3 operator floor-check (live click-through, 2026-06-10) confirmed data + interactions + graceful degradation correct across all 6 codebases, but surfaced that the scaffold theme, while functional, carried two theme-integration BUGS (not data defects) and is otherwise plain: (a) the top-nav stacked vertically and clipped off the right edge; (b) every landing-grid card showed an empty band + a faint horizontal line above the codebase name. Both were daisyUI-vs-VitePress class-name collisions, both scaffold-era (config.ts + style.css last touched by `945a3292`; CodebaseGrid card markup from `f2f167b7`), neither introduced by Phase 3 (the display-name change only improved the card text). The structural point: docs v1 DEPLOYS (Phase 5) on this VitePress presentation layer -- the infiniti Solid+daisyUI port (D15) is post-v1 -- yet NO phase in the arc is scoped to visual polish, so the launch look is the scaffold's, and "adopt vikpe's theme" (D10) is only partially realized (a custom `quakeworld` daisyUI theme, not a vikpe-derived one).

**Evidence (verified against compiled CSS + rendered DOM, 2026-06-10):**
- BUG A (nav): rendered nav is `class="VPNavBarMenu menu"`; daisyUI `.menu` (emitted because `menu` was in the style.css `include:` list) sets `flex-flow:column wrap` in `@layer utilities`. VitePress sets `display:flex` on `.VPNavBarMenu` but relies on the default `flex-direction:row`, so daisyUI's layered `column` applied unopposed (cascade layers do not beat a *missing* declaration -- the initial `row` is not a rule). Our components use no daisyUI `.menu` (grep: only badge/card/divider/input/label/toggle). FIX (`96971ced`): removed `menu` from the `include:` list -> compiled CSS emits no `.menu` rule (`flex-flow:column wrap` count 0); operator-confirmed horizontal nav.
- BUG B (card band): `.vp-doc h2{margin:48px 0 16px;border-top:1px solid var(--vp-c-divider);padding-top:24px}` -- VitePress prose styling for any `<h2>` inside `.vp-doc`. CodebaseGrid's card title was `<h2 class="card-title">` rendered inside `.vp-doc`, so it inherited the top margin (the band) + border-top (the line). CodebaseLanding already used `<div class="card-title">` and was immune. FIX (`96971ced`): CodebaseGrid `<h2>` -> `<div>` (root-cause + consistency with CodebaseLanding); rendered index now has 6 `<div class="card-title">`, zero `<h2 class="card-title">` site-wide; operator-confirmed no band.

**Severity:** The two bugs were SUBSTANTIVE (visible render defects) -- FIXED + operator-confirmed (`96971ced`). The scope gap (no visual-polish phase before a v1 that ships on this layer) is SUBSTANTIVE and OPEN -- routed to the orchestrator.

**Resolved by:** Bugs: the fixes above (operator-authorized live during the floor-check). Scope gap: operator chose 2026-06-10 "fix the bugs now + plan a small dedicated visual pass before Phase 5 deploy." RECOMMENDATIONS for that pass (presentation-layer only -- respects the D15 logic/presentation decoupling, NOT a D14/D15 violation): (1) trim the daisyUI `include:` list to the components actually used (badge/card/divider/input/label/toggle) -- shrinks CSS and removes other latent generic-classname collisions (`list`/`tab`/`dropdown`/`collapse` are unused and collision-prone); (2) decide whether "adopt vikpe's theme" (D10) means importing vikpe's actual daisyUI theme vs the current custom one; (3) general density/spacing polish on the browse tables + landing cards. Owner: a new pre-deploy phase the orchestrator slots, or a Phase 5 pre-step.

## F15. ktx/mvdsv `source_ref.file` is already repo-relative (`src/...`) -- the Phase-4 source-link prefix must be EMPTY for them, not `src/` (surfaced + drained in Phase 4 execution pre-flight)

**What:** Phase 4 Task 1 ships a locked `REPOS` map with `prefix: 'src/'` for BOTH ktx and mvdsv. But those two codebases' `source_ref.file` values ALREADY carry the `src/` segment (ktx `src/world.c`, mvdsv `src/sv_main.c`), whereas ezquake (`sv_main.c`) and qwcl (`snd_dma.c`) carry BARE filenames. Applying `prefix: 'src/'` to ktx/mvdsv double-prefixes to `src/src/world.c` -> a 404. The phase MD's OWN Check 6 expects the single-`src/` URL (`.../src/world.c#L945`), so the locked config contradicted the phase's own verification.

**Evidence (verified 2026-06-10, live data + HTTP):** the `data/*-*.json` `source_ref.file` convention is uniform per codebase across ALL entity types -- ezquake + qwcl BARE; ktx + mvdsv + qwfwd `src/`-prefixed; qtv MIXED (`pkg/qtv/...`, a Go project). HTTP spot-checks against the live commits: ktx double-prefix `.../src/src/world.c` -> 404; ktx single `.../src/world.c` -> 200; mvdsv `.../src/sv_main.c` -> 200; qwcl `.../QW/client/snd_dma.c` -> 200; ezquake `.../src/sv_main.c` -> 200. (qtv/qwfwd omitted anyway per F6 -- and qtv would ALSO need a non-`src/` prefix.)

**Severity:** SUBSTANTIVE. Would have shipped 2 of the 4 wired codebases' source links as dead 404s (a D7 "no dead links" regression on the source-link surface) and failed boundary Check 6.

**Resolved by:** Executor corrected the locked Task-1 content to `prefix: ''` for ktx and mvdsv (ezquake `src/` and qwcl `QW/client/` unchanged), with a comment documenting the per-codebase asymmetry, BEFORE writing the file. Evidence-forced correction (not a design deviation): the fix aligns the config with the phase MD's own Check 6. Flagged to operator + orchestrator at execution start. Root cause: the recon (phase MD lines 54-73) recorded `src/` for ktx/mvdsv without noticing their `source_ref.file` already contained it; the orchestrator boundary review inherited the same blind spot.

## F16. Boundary Check 9's `grep -rl "Used in:" dist` is over-broad -- it matches the DORMANT compiled template label in the theme JS bundle, not a rendered row (surfaced + drained in Phase 4 execution)

**What:** Phase 4 Check 9 greps all of `dist/` for `/guides/` and `Used in:` to enforce the D7/D21 no-dead-link gate. `/guides/` is clean everywhere (the path is data-driven via `usedInGuides=[]`, and guide-index.ts is a build-time module never client-bundled). But `Used in:` is a STATIC template label in EntityCard.vue, so VitePress compiles it into the theme JS chunk (`dist/assets/chunks/theme.*.js`) as part of the v-if-gated render function -- the markup deliberately "ready for when the portal ships" (Task 6). So `grep -rl "Used in:" dist` matches the JS bundle even though NO row renders it -- a false positive of the same class as F11 (literal-substring greps trip on non-rendered occurrences).

**Evidence (Phase 4 execution, 2026-06-10):** `grep -rl "Used in:" dist` -> `dist/assets/chunks/theme.*.js` (the compiled dormant template: `...,"Used in:",-1)),(a(!0),i(V,null,M(e.row...` -- a v-if-gated createVNode + v-for over usedInGuides). The RENDERED-HTML gate is clean: `find dist -name '*.html' | xargs grep -l "Used in:"` -> empty; same for `/guides/`; 0 of 28 HTML pages contain either. The cvar-link `decoration-dotted` class is likewise absent from static HTML (0/28) because both it and the Used-in slot live inside the `v-if="expanded"` panel, rendered client-side.

**Severity:** ADVISORY. The D7/D21 gate HOLDS (no dead UI renders); only the probe wording over-matches. No code change.

**Resolved by:** Scope Check 9 to rendered pages -- `find <dist> -name '*.html' | xargs grep -l "Used in:"` and `... grep -l "/guides/"` (both must be empty), NOT `grep -rl ... dist`. The future guides-portal arc that flips GUIDES_PORTAL_LIVE re-runs this check and must use the .html-scoped form or it will see the same benign JS-bundle hit. Executor verified the rendered-HTML gate empty at the Phase-4 boundary.
