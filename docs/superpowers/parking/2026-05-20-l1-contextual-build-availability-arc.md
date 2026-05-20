# L1 contextual build-availability -- relevance at answer time

**Status:** parked future arc-shaped work, surfaced during enforce-L1-runtime-truth Phase 5 slime review (2026-05-20). NOT yet brainstormed -- this is the capture, not a plan. Ready for arc-classifier when picked up.

**Mode hint:** Mode W (work-shaped, multi-phase). Path 1 below may be tractable as a focused single-phase plan via `superpowers:writing-plans` without arc scaffold; Path 2 needs `arc-brainstormer`. Operator decides at arc-classifier time.

## The problem

L1 today is **build-agnostic**: it records "this cvar is registered in source at HEAD" as a binary fact. But the user's question is **build-specific**: "is this cvar relevant for *my* ezQuake build, on *my* platform, with *my* renderer choice?"

The enforce-L1-runtime-truth arc's truth-cleanup is correct and sufficient for its scope (don't lie: ship the 2 truly-dead-everywhere; recover the 129 truly-hidden-but-live; annotate the rest level-2). But the slime review process surfaced a different concern: the oracle / MCP / LLM, when asked about a build-conditional cvar, has no way to tell the user "this exists in source but is renderer-scoped / server-only / a legacy alias / may not be in your build." It just presents the cvar as a flat fact. That makes the answer dishonest by omission for build-conditional code, which on this pin is the vast majority of build-excluded entities (164 of the 166-pool, ~99% of the 2788-cvar Track-A signal).

Concrete instances surfaced, primary-source-verified during the slime review:

- `gl_program_sky` -- registered in classic-GL's `GLC_Initialise()` (glc_main.c:144 / :155); only active after `vid_renderer 0 + vid_restart`. Both renderers default-ON in one binary (`CMakeLists.txt:10-11`).
- `cache_print` -- inside `#ifdef SERVERONLY` (zone.c:324 guard, Cmd_AddCommand at :584); only in dedicated-server builds.
- `chmod` -- nested `#ifdef SERVERONLY` + `#ifndef _WIN32` (sv_ccmds.c:1857); only in non-Windows dedicated-server builds.
- `addloc` / `cl_truelightning` -- `Cmd_AddLegacyCommand` aliases (teamplay_locfiles.c:537, host.c:580); fully live but invisible to `cmdlist` enumeration because legacy commands live in a separate `legacycmds` linked list (cmd.c:1070).

A user looking up any of these via the oracle today sees a flat fact ("this cvar exists, registered at <cite>") with no signal that it is mode-conditional or platform-conditional or alias-redirected.

## Two paths this capture proposes

### Path 1 -- cheap interim (no new mechanism, no new arc shape)

The L1 Track-A signal already carries `conclusion in {genuine-dead, build-excluded}` and `dump_confirmation in {dump-confirmed, high-confidence-generalized}` per cvar / command. The oracle today returns build-excluded level-2 entities **as if they were ordinary live entities** -- the level-2 signal exists in the row but isn't surfaced in the answer.

The cheap fix: when the oracle answers about an entity whose Track-A `conclusion == "build-excluded"`, the answer text carries a one-line caveat derived from the per-variant evidence + the declaring file's path + a small heuristic table:

- declaring file starts with `glc_*` -> "registered only when `vid_renderer 0` is active (classic-GL renderer)"
- declaring file starts with `glm_*` -> "registered only with the modern-GL renderer (the default)"
- build condition contains `SERVERONLY` -> "dedicated-server build only -- not present in client builds"
- registration line contains `Cmd_AddLegacyCommand` -> "legacy alias for `<modern_name>` -- works at runtime but not enumerated by `cmdlist`"
- build condition contains `_WIN32` / `__APPLE__` -> "platform-conditional"
- otherwise -> "build-conditional -- may not be in your build"

Heuristic, uses data already in L1, no new extraction work. The deterministic rule was already prototyped today as the `scope_label` field in `/mnt/c/Users/Administrator/Downloads/enforce-l1-pop1-triage.html` (per-row) -- that rule is the seed.

Cost: small. MCP answer-shape change (`packages/qw-knowledge` / `apps/qw-oracle/src/mcp` adapter) + a small derivation pass. Days, not weeks. Sized for `superpowers:writing-plans` directly; does not need arc scaffolding.

### Path 2 -- proper contextual-availability arc (the actual capability)

Path 1 is honest but coarse. The real capability is: the oracle / slipgate-app accepts a **client profile** at query time -- `{platform: win|linux|mac, build_target: client|dedicated_server|bundled_mvdsv, renderer: classic|modern|both, ...}` -- and filters or annotates entities by whether they are *available* in that exact profile.

This needs explicit modeling the enforce-L1 arc's call-graph cannot produce on its own. From the D5 / F9 / 2026-05-19 amendment: `not-compiled` is locked to preprocessor-derivable exclusion only; ezQuake-source has one CMake target, so the per_variant signal does not surface CMake-option exclusion. The lived consequence verified today: **2786 of 2788 cvar Track-A signals read `client:reachable`** for the per_variant cell. Per_variant is too coarse to power a per-profile filter.

The relevance dimensions a real solution must model are heterogeneous:

- preprocessor `#ifdef` (SERVERONLY / _WIN32 / __APPLE__) -- already partially captured
- CMake options (`RENDERER_CLASSIC_OPENGL` / `MODERN_OPENGL`, others) -- requires CMakeLists parsing
- runtime renderer dispatch (`GLC_Initialise` vs `GLM_Initialise` registration tables) -- a third "renderer-scoped" axis, distinct from `#ifdef`
- `Cmd_AddLegacyCommand` legacy-alias chain expansion -- not a build dimension at all, a registration-mechanism dimension
- bundled-MVDSV gate (ezQuake's `SERVERONLY` build path) -- already partially captured but conflated with general server-side
- (later) cross-engine: ezQuake vs MVDSV vs FTE vs QWCL provenance routing

A real solution probably blends: CMake-options-aware extraction (parse the option matrix as data); explicit renderer / dispatch-table modeling as first-class L1 attributes; legacy-alias chain captured at extraction so the oracle can return both the old name's redirect and the modern target; a per-fork build-profile model that consumers query against.

Cost: substantial. Multi-week arc. Needs its own brainstorm pass and design spec.

## Evidence from enforce-L1 that shaped this

- **D5 / F9 / 2026-05-19 amendment** locks `not-compiled` to preprocessor-derivable exclusion only -- the foundational reason `per_variant` cannot answer "which build is this in" for entities excluded by CMake options or runtime dispatch.
- **F19 (2026-05-19)**: `gl_program_sky` is correctly build-excluded by the arc despite being absent from the operator's modern-GL-only runtime dump -- the call-graph refused to auto-accuse it. D3 conservatism vindicated. The gap is upstream of the arc, at the consumer answer layer.
- **The audience-routed triage (2026-05-20)** made the heterogeneity concrete: the 100 "WIRED-BUILD-CONDITIONAL" entities split per-row, via a deterministic rule, into classic-renderer-scoped / SERVERONLY / legacy-alias / file-scope-conditional. The split is real and meaningful, but the labels were after-the-fact extraction from declared paths + the build_condition heuristic -- they should be first-class L1 attributes, not derived ad hoc per consumer.
- **The whole-signal categorization** (2026-05-20 read-only SQL): out of 2788 cvar + 514 command Track-A rows, 2786 cvar + 511 command read `client:reachable` via per_variant, 3 commands read SERVERONLY-only, 0 read platform-only. The Track-A signal alone cannot drive contextual filtering.

## Adjacent finding -- population-2 case from this pool: zero unknown

Folded in because it directly bears on planning whether a separate population-2 (consumer-liveness, "registered but never read") arc is worth proposing.

The enforce-L1 candidate pool's REGISTERED-NO-READ-SITE bucket (64 entries pre-split) was independently the candidate surface for a future population-2 arc. After splitting out the 54 doc_only ghosts -> ciscon, the residue is **exactly the 10 `internal0`-`internal9` cvars**, all proven wired via `re_subi[i].integer` array indexing (tp_triggers.c:864-872) -- name-grep blind spot, not inert. The grep recipe is just blind to array indexing.

**Net unknown population-2 candidates from this 166 pool: zero.**

That doesn't kill a future population-2 arc -- the broader 2788-cvar set was not audited for read-sites here, and consumer-liveness across the full registered set may still surface signal. But it does say: don't justify population-2 on "the enforce-L1 pool surfaced N unknown candidates." That's 0 from this pool. The justification needs to come from a sample of the broader set, or from a specific product need. The contextual-availability arc above is the more concrete and well-motivated next direction.

## Carry-forwards (read when picking this up)

- `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/decisions.md` -- D5 + the 2026-05-19 amendment + D15 (per-variant evidence shape) + D20 / D21 (the two-output structure).
- `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/review-findings.md` -- F9 (D5 amendment cause), F19 (gl_program_sky lesson and the read-site-liveness future detection note).
- `/mnt/c/Users/Administrator/Downloads/enforce-l1-pop1-triage.html` -- the audience-routed triage with per-row `scope_label`. The deterministic rule there is the seed for Path 1.
- `/mnt/c/Users/Administrator/Downloads/enforce-l1-slime-review.html` + `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md` -- the upstream PR set.
- `apps/qw-oracle/SCHEMA.md` -- the L1 schema; Path 2 will extend it.
- `apps/qw-oracle/VISION.md` -- the active-assistance product vision; contextual relevance is the natural next step in that arc.
- Memory `reference_libclang_compiled_means_parsed_not_linked.md` -- the foundational reason per_variant is coarse.
- Memory `reference_rigor_bar_follows_consumer.md` -- the consumer's strict-bar shapes the contract; for an LLM-answer consumer, "may not be in your build" is part of the honest contract.

## Open questions for the next arc-brainstormer terminal

- **Path 1 vs Path 2 sequencing**: do Path 1 first (small, immediate honesty improvement at the answer layer, the operator already saw the prototype rule work) then justify Path 2 from real-usage data; or commit straight to Path 2 and skip the interim? My read: Path 1 first -- it delivers honesty *now* and the data it surfaces (how often does the oracle answer about build-excluded entities?) is the strongest justification for Path 2.
- **Where does the build-profile live?**: per-user setting (slipgate detects the user's build and ships it with queries), per-query parameter (oracle accepts profile in the MCP call), or per-snapshot (oracle ships profile-filtered snapshots per build target)?
- **How many forks at design time**: ezQuake-only first (per D2), or design Path 2 for FTE / QWCL / MVDSV from day one? FTE has a much larger CMake-option surface; designing only for ezQuake risks a structural redo when forks are added.
- **CMake-option modeling**: parse `CMakeLists.txt` directly into an option matrix, model it as data, or both? The matrix would be small for ezQuake (~10 options) but grows for FTE.
- **Renderer dispatch as a separate axis**: `GLC_Initialise` / `GLM_Initialise` are runtime dispatch tables, not preprocessor exclusion. Does this need a new "renderer-scoped" first-class attribute in the schema, or a separate dispatcher-aware passenger on the call-graph, or both?
- **Legacy-alias chain expansion**: the oracle currently returns `cl_truelightning` as a command. Should it instead return "redirects to `cl_fakeshaft`; that is the canonical name" with the legacy redirect carried as a sibling attribute? That is a small L1 schema addition with high product value.

## NOT in scope here

- Re-doing the enforce-L1-runtime-truth arc. That arc's output (2 prune, 129 recover, level-2 annotation on the rest) is correct for its scope and ships as-is.
- Touching ezQuake-source. The product is consumer-side relevance, not upstream code changes.
- Cross-engine availability (ezQuake-MVDSV bundle, FTE forks) until ezQuake-only contextual is shipped.
- Population-2 consumer-liveness as its own arc -- the adjacent finding above says don't justify it on this pool; justify it later from broader data or a specific product need.
