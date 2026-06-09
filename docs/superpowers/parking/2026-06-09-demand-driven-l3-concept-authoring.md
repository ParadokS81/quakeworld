# Demand-driven Layer 3 player-help concept authoring -- arc capture

**Captured:** 2026-06-09 by arc-classifier mode W (operator confirmed arc-shape mid-brainstorm).
**Status:** captured (awaiting arc-brainstormer pass).

## Why this is arc-shaped

- **Multi-session:** ~12-18 deep concept notes; the 3 existing exemplars are 17-28k chars each, fact-checked. Will not fit one session.
- **Multi-phase deliverable:** notes batch by demand tier; each batch ships + is independently measurable.
- **Spec required:** needs a domain taxonomy (48 clusters -> ~N player-help domains), a value-ranking formula, a per-note authoring methodology, and an acceptance gate BEFORE the first note is written.
- **Verification regime per phase:** the hypothesis-test harness is the per-note acceptance gate (does the note convert its cluster's representative threads from dig/PARTIAL to platter/NAILED).
- **Cross-cutting decisions:** taxonomy, ranking formula, methodology/skill choice, scope guards, the Claude-drafts/operator-reviews split.

## Scope sketch

Turn the #helpdesk demand map into a finite, demand-ranked set of **player-facing config/help concept notes**. Claude drafts each note from the now-complete L1 descriptions (8915 across 7 codebases) + full live codebase access (source truth) + the L2 demand threads; the operator reviews the prose; each note is gated by the test harness.

**Validated product context (2026-06-09 test, see below):** the MCP engine already answers the *majority* of player-config questions *today*, because L2 (chat) retrieval is strong and the LLM reconstructs answers from raw threads on the fly. That is the **fallback** working, not the design. The design is **note-primary** (a single concept-note retrieval = precomputed, fact-checked "gold on a platter") with L2 as spice/validation. Concept notes upgrade the engine good->great on two axes: (1) no digging through mixed/dirty/high-volume chat, (2) no confabulation (an authoritative note names the exact cvars so the model has nothing to invent). There are **no MCP users yet** (online but unannounced), so live usage cannot rank the notes -- the demand map is the ranking signal.

## Resolved this session: domain taxonomy + ranking

Method: K-means at the fine grain (K=48, the demand map) mapped to note-coherent domains, cross-checked against an independent coarse re-cluster (K=18) which surfaced the same top domains. Demand = real thread counts summed per domain from `faq-clusters.json`. **5028 FAQ-candidate threads -> 24 note-able domains (89% of demand) + an 11% noise tail.** Ranking falls out: **rank by size for the clean wins; treat high unresolved-rate as a "this one is hard, the note gives a checklist not a fix" flag, NOT a priority multiplier** (the high-unres domains are the hard/niche ones + noise; the clean high-demand domains have LOW unres).

**Tier 1 -- clean, high-value (9 domains, 2285 threads = 45% of demand; 2 already noted -> 7 to write = ~41%):**

| Domain | Threads | Unres% | |
|---|---|---|---|
| HUD configuration (frags/sbar/ibar/team-score/notify) | 544 | 22% | |
| Onboarding & install (new player, download, pak files, fragfile.dat) | 397 | 17% | |
| World rendering & brightness (drawflat/outlines/gamma/palette) | 309 | 23% | |
| Textures & models (HD packs, simpleitems, pk3) | 232 | 23% | |
| Network & connection (packet loss, antilag, proxies, cl_c2sdupe) | 211 | 32% | |
| Projectile/powerup cosmetics (rocket/grenade/LG colors, trails) | 200 | 20% | |
| Demo recording & playback (record/stop, qwd/mvd) | 149 | 26% | |
| Weapon scripts | 134 | 17% | **HAS NOTE** |
| Player skins & colors | 109 | 23% | **HAS NOTE** |

**Tier 2 -- solid, note-able (~10 domains):**

| Domain | Threads | Unres% |
|---|---|---|
| Display config (resolution, conscale/conwidth, fov, refresh/maxfps) | 185 | 24% |
| Mouse & input (sensitivity, m_pitch, in_raw, accel) | 135 | 25% |
| Audio config (sound, ambient, SDL_AUDIODRIVER, s_khz) | 119 | 50% |
| Ruleset & legality (f_modified, what is allowed, "is X a cheat") | 105 | 33% |
| Maps & loc files (loc packs, custom maps) | 103 | 18% |
| Config files & management (cfg_save, exec, file locations) | 102 | 17% |
| Finding & joining games (server browser, sources.txt, connect) | 83 | 22% |
| Binds & aliases (general scripting, console) | 69 | 12% |
| Teamplay comms (tp_msg, teamsay, colored text) | 64 | 28% |
| Spectating & QTV (autotrack, following) | 58 | 38% |
| Fonts & charset | 61 | 16% | (fold into HUD or console)

**Separate-audience / caveated (scope decision -- see open questions):**

| Domain | Threads | Unres% | Why flagged |
|---|---|---|---|
| Server admin / hosting (KTX/mvdsv, ports, bots) | 408 | 21% | Different audience (server operators, not players); `server-setup` note already adjacent. Candidate separate arc. |
| Performance troubleshooting (fps/stutter) | 296 | 39% | A note = honest diagnostic checklist + the right cvars (kills the confab); cannot guarantee a fix. |
| Linux platform (build, WM, wayland) | 236 | 29% | Niche; note-able for Linux users. |
| Crash troubleshooting | 147 | 50% | Checklist not guaranteed fix. |

**NOT note-able (~572 threads, 11%):** noise (unanswered/spam-for-mix), community pointers (discord invite), transient status (server-down), hardware-buying recommendations (which GPU/monitor), out-of-domain (GIMP editing, bootable-USB tooling).

**Core player-help program = ~16-17 notes** (Tier 1 + Tier 2, fonts folded) -- matches the operator's ~12-18 estimate. Tier-1-new (7 notes) alone blankets ~41% of all FAQ demand.

## What the 2026-06-09 brainstorm already established (do NOT re-derive)

**Hypothesis test** -- 11 stratified #helpdesk threads, REAL MCP retrieval against the dev DB (search_entities + search_concepts + search_solved_issues, self-thread excluded) -> fresh-context Claude answers from grounding only -> scored vs the community resolution:
- **7 NAILED / 4 PARTIAL / 0 confidently-wrong.** Gotcha-caught (QW-specific lore the model says it would NOT reliably know): 11/11. Oracle-added-value: 11/11.
- **2 confabulations** (invented cvar names: `cl_showfps` for the real `show_fps`; `scr_showframetime` does not exist) -- BOTH in the single hardest thread (unsolvable Ryzen FPS-stutter), BOTH exactly where L1 retrieval came back weak. This is the anti-confabulation guarantee leaking when grounding is thin.
- Retrieval-quality pattern: **L2 strong on 10/11** (the workhorse today). **L3 weak on all 11**, and the top match was usually the WRONG domain note -- EXCEPT weapon-alias -> `weapon-scripts`, which nailed it with a single retrieval (= the "platter" model proven on the one domain that has its note). **L1 weak on natural-language questions** (semantic search on a whole sentence rarely surfaces the exact cvar; exact lookups only fired when the asker named a cvar).

**L3 inventory** (concepts table = 42 rows, `shape` column all null):
- **~3 player-help domain notes** (the domain #helpdesk demand lives in): `weapon-scripts` (22k), `player-skins` (28k), `lightning-gun-customization` (17k = the operator's "fakeshaft" note). The program halted here.
- **~8 adjacent substantial notes** = byproducts of OTHER arcs (engine internals, protocol, server-admin, ruleset enforcement, FTE extensions, skyboxes): `engine-internal-vs-player-facing-files`, `qw-userinfo-serverinfo-protocol`, `completing-legacy-fte-protocol-extensions`, `client-side-server-exec-allowlist`, `ruleset-anti-script-restriction-pattern`, `kmap-legacy-keymap-system`, `skywind-animated-skyboxes`, `server-setup`. Real but NOT the player-help domain.
- **~30 game-mode notes** (1on1, ca, ctf, race, ...) + 1 `test-qwiki-harvest-probe`.

**Assets available for authoring:** complete L1 descriptions (8915 entities, 7 codebases); full live codebase access (source truth); the 3 existing player-help notes as the template/shape; the L2 demand corpus (6623 #helpdesk threads, all embedded + retrievable).

**The test harness** (built this session, currently in EPHEMERAL `/tmp` -- promote before relying on it):
- `/tmp/faq-retrieve.ts` -- runs the 3 retrieval tools against dev for a thread list, excludes self, writes `q-<id>.md` (question + grounding, no answer) + `truth-<id>.md` (community answer). Imports the real tool fns from `serve/mcp/src/tools/` (absolute paths); run from `apps/qw-oracle/` so `.env` loads.
- `/tmp/faq-verify.ts`, `/tmp/faq-verify2.ts` -- confabulation check (extract claimed cvar tokens from answers, verify existence in L1).
- `/tmp/faq-test/` -- the q/truth/answer files for the 11-thread run.
- ACTION for the arc: promote these to the gitignored scratch (`apps/qw-oracle/scripts/calibration/scratch/`) and generalize, so each authored note can be acceptance-tested against its cluster's threads.

## Open questions remaining (for arc-planner)

RESOLVED this session: domain taxonomy (see "Resolved" section above), value-ranking (size-rank for wins; unresolved-rate = hardness flag, NOT a priority multiplier), batching (Tier-1 7-new first = 41% of demand, then Tier-2), scope (player-help core ~16-17 notes; server-admin + caveated-trio decisions below).

Still open for the planning pass:

- **Per-note authoring methodology:** extend an existing skill (`guide-rewrite` Path-2 authoring is the closest fit -- the 3 existing notes were authored this way) or a new "domain-concept-curate" skill? Codify the shape the 3 existing notes establish. Honor the vertical-slice framing (L1 anchors + L3 substance + optional L2 garnish) and earn-the-note discipline. RECOMMENDATION: reuse the guide-rewrite Path-2 pattern + add the harness as a new acceptance gate; only fork a new skill if the demand-domain shape diverges from guide pages.
- **Acceptance gate (mostly settled):** the harness is the per-note acceptance test -- the note must move its domain's representative threads dig/PARTIAL -> platter/NAILED in the 11-thread-style run; operator prose review is the second gate. Planner formalizes the regime + promotes the harness out of `/tmp`.
- **Anti-confab guardrail:** fold the orientation-prompt rule ("never name a cvar absent from the grounding") into this arc as a Phase 0, or split it? It helps every answer even before notes land, and concept notes also address it structurally. RECOMMENDATION: Phase 0 of this arc -- cheap, and it makes the whole engine safer regardless of note progress.
- **Batch fan-out shape:** notes are independent within a tier -> how many drafted in parallel per batch, at what model/effort (the existing notes are Sonnet-high-class work).

## What is NOT in scope

- **The bridge / delivery surface** (Discord `!ask` bot, support.quake.world form, slipgate chatbot). Deferred. The slipgate built-in chatbot is the EOY north star; with no users today, delivery is not the gate yet. The interim-surface choice is a separate future decision.
- **Server admin / hosting (408 threads -- its own future arc).** Deferred by operator decision 2026-06-09. It is a DIFFERENT audience (server operators, not players) and cross-engine (mvdsv + ktx + qtv + qwfwd). Operator's framing: from the admin's view it is one coherent need ("stand up a functional server and maintain it"), but big enough that **install/setup vs maintain/manage are likely separate notes** -- so a small CLUSTER of notes, not one, and likely its own arc with its own framing. An adjacent `server-setup` note already exists as a seed. Trigger to start: after the player-help arc ships, or operator-initiated.
- **Prod MCP deploy/rewire.** Dev DB has the full stack; prod is the post-arc deploy step.
- **buckets-E** (9-bucket taxonomy LLM labeling) -- deferred, not needed (clustering + resolution_status already rank authoring priority).
- **The paused #quakeworld / #dev-corner / #antilag backfill** -- separate, budget-paused at a clean checkpoint.
- Hardware-support / out-of-domain / extreme-niche clusters that no concept note can resolve.

## Operator notes

- **Drafts/review split:** "you can actually create most of them, and i can help review the prose." Claude authors the notes; operator is the prose-review gate.
- **No current MCP users except testing** -- online but unannounced. Hence demand map = ranking signal, not live usage. (This is why ship-first was retracted in favor of content-first.)
- Operator reasons through systems/architecture as **plain prose** (not a visual-companion topic); concept-note prose review is his gate. Momentum over ceremony; decisive recommendations over polls.
- The 3 existing player-help notes are **high quality** and are the template to match.
- Pace is operator-judged; operator pace estimates beat Claude's conservative ones.

## Related

- Kickoff: `docs/superpowers/parking/2026-06-09-helpdesk-faq-product-brainstorm-kickoff.md`
- Demand map (48 clusters, sizes, unresolved-rates): `docs/superpowers/parking/2026-06-09-helpdesk-faq-landscape.md`
- L2 corpus arc: `docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/`
- Existing template notes: `apps/qw-oracle/curated/concept-notes/{weapon-scripts,player-skins,lightning-gun-customization}.md`
- Memories: `project_qw_oracle_product_vision` (active-assistance = grounding; this test is its empirical validation), `project_layer3_two_path_curation`, `project_l3_sub_shape_patterns`, `project_concept_notes_vertical_slice`, `reference_layer3_concept_note_template`, `feedback_prose_brainstorm_for_architecture`.
- Authoring skills to consider extending: `guide-rewrite`, `asset-type-curate`, `game-mode-curate`.
