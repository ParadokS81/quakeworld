# Orchestrator resume -- demand-driven L3 concept authoring (mid-arc, 2026-06-16)

**For:** a FRESH terminal to RESUME ORCHESTRATING this arc. Routes to `arc-orchestrator`. Supersedes the 2026-06-10 resume doc. **Everything load-bearing is committed + pushed -- read the artifacts; do not rely on this doc's narrative for anything you can verify against live source.** (This session's one durable lesson: a "verified" claim is a hypothesis -- see Critical rules.)

## Where things are

- **Branch `main`, all arc commits pushed, 0 unpushed / 0 behind.** Uncommitted tree = pre-existing sibling drift only (slipgate bundles, unrelated parking docs); none is this arc's.
- **Notes #1-3 SHIPPED + orchestrator-boundary-verified** (each: all related_entities resolve in L1 + as concept_entities edges, source file:line claims spot-checked exact, confab re-run clean, gate NAILED on owned threads, commits scoped):
  - #1 `hud-configuration.md` (decision-first + preferential-honesty + F11 own-answer-first-section exemplar)
  - #2 `network-connection.md` (rec-first command-list exemplar for objective domains)
  - #3 `match-recording-playback.md` (objective domain; scope grew demos -> full match recording via operator consults; the mvdsv `dl`/`dlist` L1 gap surfaced -> HANDOVER small-followup)
  - All three now indexed in `curated/concept-notes/README.md` `## Current notes`.
- **The skill was refined twice this session** (`~/.claude/skills/domain-concept-curate/SKILL.md`, user-global): (a) Step 7 **3-way lead selector** -- mode-gate -> lead with gate / objective -> lead with the recommendation / preferential -> "this is preference"; (b) **voice-tier-by-objectivity** (objective = terse command-lists, judgment = prose); (c) **family stem-sweep** discipline anchor (sweep `match_*` siblings before drafting). Apply these to every future note.
- **MAJOR development -- the taxonomy reshaped + the data foundation arrived:**
  - The rank-1 `visual-projectile` demand slot is **superseded** by a **game-object note family** (operator brainstorm): weapons by ammo-pair (`sg/ssg`, `rl/gl`, `ng/sng`, `lg` exists) + `powerups` + `resources` (armor/health/ammo incl. mega) + `movement/physics`. Mirrors the maps item taxonomy. Full direction (verified decisions: megahealth=health, stats-inline-in-L3, no bare-stats overview): `docs/superpowers/parking/2026-06-11-game-content-notes-and-catalog-direction.md` (carries a CORRECTION banner -- read it).
  - The **id1 game-content catalog EXISTS** and was COMPLETED by a parallel arc (shipped 2026-06-14, post-arc analysis `docs/superpowers/reviews/2026-06-15-game-content-catalog-post-arc-analysis.md`, clean ship). Live in `gameplay_entity_defs` (id1: 8 weapons / 25 items / 4 projectiles / 15 monsters + KTX overlays) + `gameplay_mechanics`. The "data gap" premise this orchestrator originally asserted was WRONG (verification miss -- queried `gameplay_mechanics`, never `gameplay_entity_defs`); the catalog brainstorm's pre-flight caught it, so the arc COMPLETED rather than rebuilt.
  - **Sequencing FLIPPED:** the game-object notes now **CONSUME the live catalog** (cite the `gameplay_entity_defs` rows), they do NOT author stats-from-QC-prose. Gaps a note hits feed targeted YAML backfills. rl/gl is no longer a "schema probe" -- it's a consumer + the rank-1 demand win + the first of a new archetype.

## The open tracks to carry forward

- **rl/gl is a NEW archetype** -- "stats + usage + customization + cosmetics," consuming the catalog -- different from the demand-domain config notes (#1-3). It will be the **template** for the weapon family. Author it with the existing skill + heavy augmentation; do NOT fork a `weapon-curate` skill until rl/gl proves the shape (grug: wait for it to emerge). The gate only tests the cosmetic-demand part; stats/usage rely on operator review (D4).
- **F12 (judge rigor)** -- still the gate's blind spot for construction-heavy/script domains. rl/gl is mostly factual (LOW risk); but if a weapon note carries a construction-heavy script section, the judge-hardening pass is still owed first. Lookup/factual domains stay safe.
- **F9 weapon-scripts press-to-cycle gap** -- still open, Phase-1 authoring call, not urgent.
- **Two parallel surfaces (other terminals, not this arc):** F18 -- the catalog is live in **dev** but not on PROD MCP (`oracle.slipgate.me`); rides the standing QTV+QWFWD deploy. F9-catalog (describe_mode override surfacing) routed into the open "MCP realignment to KTX-era data" HANDOVER entry. Neither blocks note authoring.
- **Deferred memory:** write the project memory "L3 corpus = demand-domain + game-object axes; the finite id1 game-content catalog is the data foundation" when rl/gl SHIPS (per the direction doc's trigger -- catalog half is firm, first weapon note pending).

## Reads required (in order)

1. Scaffold: `docs/superpowers/plans/2026-06-09-demand-driven-l3-concept-authoring/` -- `README.md`, `decisions.md` (D1-D16 + D12 amendment), `review-findings.md` (F1-F14; F9 open, F12 track), `phase-template.md`, `contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md`.
2. The skill: `~/.claude/skills/domain-concept-curate/SKILL.md` (the 3-way lead selector + voice-tier + stem-sweep are LIVE).
3. Exemplars: the 3 shipped notes (`hud-configuration` / `network-connection` / `match-recording-playback`) -- network is the voice model for objective domains.
4. The game-object direction + the catalog: the direction doc (above, read the CORRECTION banner) + the catalog post-arc analysis + the movement-physics seed (`2026-06-11-movement-physics-note-seed.md`).
5. The gate: `apps/qw-oracle/scripts/calibration/faq-gate/README.md` + the 4 scripts (F11 full-body grounding live; F13 alias-def-name fix live).
6. Memories: `feedback_orchestrator_terminal_pattern`, `feedback_operator_not_technical_review_gate`, `feedback_one_at_a_time_template_first`, `feedback_be_decisive`, `feedback_handover_claims_decay`, `reference_max_subscription_no_api_key`, `reference_workflow_rate_limit_and_args`.

## Critical rules

- **You are the technical gate; operator reviews PROSE + intent + domain SME.** Verify EVERY executor claim against live source at the boundary -- re-run the gate probes, query the DB, spot-check source file:line. Do NOT trust "PASS."
- **VERIFICATION LESSON (this session's scar):** a single errored query on a guessed table name is NOT "verified absent." Before asserting a data gap: list the tables (`\dt gameplay*` / information_schema), check `arc-history.md`, query ALL plausible homes. The "data gap" premise that spawned the catalog arc was a one-table miss; the pre-flight re-verify caught it (the methodology working -- a handoff claim is a hypothesis).
- **Working rhythm:** ONE note at a time; each round's lesson folds into the skill BEFORE the next note; operator paces + runs the prose gate.
- **Sibling-arc guard:** docs-quake-world + other arcs commit to `main` concurrently. NEVER `git add -A`; scope every add; `git diff --cached --stat` before commit; **prefer fresh commits over amend** (HEAD moves under you).
- **No SDK -- Workflow `agent()` only** for gate LLM steps; Bun not npm; 3-part `related_entities`; ASCII hyphens.
- **Decisions + contract are law;** amend via dated blocks, never a silent override.

## First three actions

1. Confirm git clean/pushed + the catalog is live: `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc "SELECT gameplay_source_id, kind, count(*) FROM gameplay_entity_defs GROUP BY 1,2 ORDER BY 2,1;"` (expect id1 weapon=8/item=25/projectile=4/monster=15 + ktx). Confirm the skill's 3-way lead selector + stem-sweep are in `SKILL.md`.
2. **Pick the next note with the operator:** `rl/gl` (game-object archetype + rank-1 demand, CONSUMES the catalog -- proves the weapon-family template) OR `textures` (rank-2 demand-domain, same-archetype-as-#1-3, cleaner). Operator leans rl/gl; either is LOW F12 risk.
3. Prep the executor prompt (fresh terminal, `domain-concept-curate <domain>` + augmentation). For rl/gl, the augmentation MUST specify: the new archetype shape, "consume the catalog (query `gameplay_entity_defs`/`gameplay_mechanics`, cite the rows), do NOT author stats-from-QC-prose," the DRY trail mechanism (explain in rl/gl, ng/sng links it), the D7 grounded-role-not-tactics line, the weapon-scripts boundary. Gate it, verify at the boundary.

## When in doubt

Route to the operator with plain-English consequences at intent/SME level; decisions + contract resolve most; technical calls are yours. Track executor context; fresh-terminal handoff near ~350k. Before any construction-heavy/script-class domain, resolve F12 (judge hardening) first.
