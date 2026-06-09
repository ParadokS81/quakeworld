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
| F8 root npm `workspaces` glob includes docs-web (pnpm-subtree isolation) | ADVISORY | Phase 2a (own `pnpm-workspace.yaml`) | D20 |

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
