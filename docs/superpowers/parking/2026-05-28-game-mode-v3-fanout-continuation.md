# Handover: KTX game-mode concept-note arc -- v3 fan-out continuation

**Date:** 2026-05-28
**Owner:** fresh terminal opened by operator, continuing in Opus 4.8 (prior session in Opus 4.7 hit context limits)
**Estimated effort:** 60-90 min for the 4 remaining v3 redrafts + fan-out planning; then days for the 22-mode mass fan-out itself

## Why this exists

The prior session (Opus 4.7) walked the methodology through three iterations -- **v1** (the original scaffolding-heavy shape) -> **v2** (tightened after LGC stress test + readability review) -> **v3** (reader-facing prose; rendering scaffolds + encyclopedic citations removed). Operator pushed back on v2 over-engineering ("we are flailing in the wind") and the session course-corrected.

Two of the six worked-example notes have been re-drafted under v3 cleanly (killquad, blitz2v2). Four remain under v2 conventions (hoonymode, wipeout, ctf, lgc) and need v3 refresh. Then the 22-mode mass fan-out can begin.

**Operator's framing for this fresh terminal**: bring fresh eyes to the v3 conventions before continuing. Spot drift, validate the shape, then proceed. Don't blindly execute the prior session's plan.

## How we got here (brief)

- **v1 (pre-this-session)**: HTML-comment Configuration placeholders, length bands, in-body triage HTML blocks. Authored 5 worked examples (killquad, wipeout, blitz2v2, ctf, hoonymode).
- **LGC stress test** surfaced: wrong-topic wiki page (Lightning Gun Competition tournament series, not the mutation rules); confirmed midair/lgc + lgc/instagib interlocks; `dmm4-only` enum value; mutation `family-cousin` enum direction gap.
- **v2** consolidated those + wipeout hot fix (100/100 HP/armor → verified 100 HP / 200 RA / 80% absorb at `clan_arena.c:511-564`; drafter had fabricated the loadout and self-attested verification). Added Step 0 content-type sanity check to triage rules. Killquad v2 re-draft validated v2 mechanically but operator surfaced two new concerns:
  1. v2 stripped the actionable server.cfg snippet (lost a useful convention)
  2. v2 added encyclopedic in-prose source-line citations that don't help the LLM-oracle consumer (MCP doesn't serve source code; citations are author/audit artifacts)
- **v3** reframed: concept notes are reader-facing prose (LLM substrate / wiki-page-quality), not authoring artifacts. Verification trail goes to commit body. Configuration is narrative prose on 3-7 key cvars. Server.cfg snippets restored. Length bands dropped (content drives). Voice exemplar = weapon-scripts.md.

## Where things are

### Methodology state (committed)

All in `apps/qw-oracle/curated/concept-notes/_methodology/game-modes/`:

- **`mode-vs-mutation-classification.md`** (v2) -- 27 modes classified at HIGH confidence. Confirmed mutation interlocks table: killquad/berzerk, midair/lgc, lgc/instagib.
- **`concept-note-frontmatter-schema.md`** (v2) -- relation enum `family-head / family-member / similar-shape / similar-loadout / derived-from / mutation-of / incompatible-with`; `applies_to` includes `dmm4-only`; `mode_default_init_array` explicitly load-bearing as the LLM/renderer pointer.
- **`concept-note-section-structure.md`** (v3) -- Configuration as narrative prose on 3-7 key cvars; server.cfg snippets mandatory in How-to-enable + Server-setup; length-band table REMOVED; "length follows content" framing.
- **`triage-rules.md`** (v2) -- Step 0 content-type sanity check before length scoring; LGC.json + Clan_Arena.json documented as confirmed wrong-topic.

### Skill (v3, outside this repo)

`~/.claude/skills/game-mode-curate/SKILL.md`:
- Configuration convention = narrative prose on key cvars (not pointer-only, not HTML placeholder)
- Server.cfg snippet mandatory
- Source verifications -> commit body (NOT in-prose)
- Triage HTML block retired -> `wiki_status` frontmatter + reasoning in commit body
- Voice exemplar pointer: `apps/qw-oracle/curated/concept-notes/weapon-scripts.md`
- "Length follows content" replaces "embrace short sections"
- Sonnet 4.6 high reasoning (locked)

### Concept notes at `apps/qw-oracle/curated/concept-notes/`

| Note | Shape | Commit | Notes |
|---|---|---|---|
| `killquad.md` | **v3** | `7cd8cbb0` | Mutation l3-upstream exemplar. Read this first. |
| `blitz2v2.md` | **v3** | `33caff98` | Variant l3-upstream exemplar. Read this second. |
| `wipeout.md` | v2 + hot fix | `7af2932a` | Standalone hybrid. HTML Configuration placeholder still present. Loadout claim hot-fixed to source-verified values. Needs v3 redraft. |
| `hoonymode.md` | v2 | `3a54eda3` | Standalone hybrid + family head of UM_1ON1HM. Uses retired `family-cousin` enum -- update to `family-member` on v3 redraft. |
| `ctf.md` | v2 | `a7567e2d` | Standalone wiki-upstream. Largest note (~2000w). Needs v3 redraft. |
| `lgc.md` | v2 | `e96e3b9d` | Mutation l3-upstream (wrong-topic wiki). Needs v3 redraft. |

Backup of all 6 pre-v2 versions at `apps/qw-oracle/curated/concept-notes/_backup-pre-methodology-v2/` for A/B comparison.

### Recent commits (most recent first)

```
33caff98 ktx game-mode notes: blitz2v2 concept note (variant, l3-upstream) -- v3 exemplar
7cd8cbb0 ktx game-mode notes: killquad concept note (mutation, l3-upstream) -- v3 exemplar
912905da ktx game-mode notes: methodology v3 simplification (drop scaffolding from concept notes)
80f347c9 ktx game-mode notes: killquad re-draft under methodology v2 (later superseded by v3)
338d9b7c ktx game-mode notes: backup 6 worked examples pre-methodology-v2 redraft
7af2932a ktx game-mode notes: methodology v2 consolidation pass + wipeout hot fix
e96e3b9d ktx game-mode notes: lgc concept note (mutation, l3-upstream)
3a54eda3 ktx game-mode notes: hoonymode concept note (standalone, hybrid)
```

## Reads required (cold, in this order)

1. **This handover** fully.
2. **`apps/qw-oracle/curated/concept-notes/weapon-scripts.md`** -- the L3 concept-note voice exemplar. ~3000 words; confident declarative prose, source-line citations only when load-bearing, community vernacular when earned. This is the voice target.
3. **The 4 methodology docs at `apps/qw-oracle/curated/concept-notes/_methodology/game-modes/`** -- contracts, in the order listed in "Methodology state" above.
4. **The 2 v3 exemplars + commit bodies**:
   - `apps/qw-oracle/curated/concept-notes/killquad.md` + `git show 7cd8cbb0`
   - `apps/qw-oracle/curated/concept-notes/blitz2v2.md` + `git show 33caff98`
   The commit bodies carry the verification-trail shape that v3 expects.
5. **The skill at `~/.claude/skills/game-mode-curate/SKILL.md`** -- workflow contract for sub-agent dispatch.
6. **The arc-genesis handover** at `docs/superpowers/parking/2026-05-28-game-mode-arc-evaluation-handover.md` (~120 lines) -- the document the prior session opened with. Provides arc-wide context.

## Critical rules (don't drift)

- **Concept notes are reader-facing prose** -- LLM substrate / wiki-page-quality. No HTML triage comments, no encyclopedic in-prose source-line citations, no rendering scaffolds.
- **Verification trail goes to commit message body** -- every specific number / interlock / cvar-existence claim in body prose has a source-line cite in the commit body. Drafter-honesty discipline applies (wipeout pre-fix had fabricated 100/100 HP/armor with self-attested verification — caught when operator pushed).
- **Server.cfg snippets mandatory** in How-to-enable / Server-setup. Concrete copy-paste beats inference. Format: `# server.cfg` code block with literal cvars.
- **Length follows content** -- no word-count targeting. weapon-scripts.md (3000w) and killquad.md (~340w) are both correct.
- **Configuration body section** = narrative prose on 3-7 key cvars (discriminator + defining tunables + surprising values vs base mode). NOT a full table dump. NOT a pointer-only sentence. Mutations use a small hand-written table on `activation_cvar` + `auxiliary_cvars`.
- **Voice match weapon-scripts.md** -- confident declarative, community vernacular when it earns its place, source-comment quotes only when load-bearing.
- **Slug = strict `gameplay_mechanics.name`** (so `ca` not `clan-arena`, `tot` not `tribe-of-tjernobyl`, `1on1` as-is).
- **`gameplay_source_id: ktx`** (no version composite).
- **Methodology v3 is the contract** -- don't extend unilaterally during redrafts. Surface gaps for explicit operator approval.

## First three actions

1. **Read this handover + weapon-scripts.md + the 2 v3 exemplars (killquad.md, blitz2v2.md) + their commit bodies cold.** Form a fresh take on whether the v3 shape lands.
2. **Sanity-check the v3 methodology against the 2 exemplars**: do killquad and blitz2v2 actually match the conventions in `concept-note-section-structure.md` and the skill? Any drift the prior session missed?
3. **Surface your fresh-eyes take with the operator** before executing: any v3 shape concerns, any voice/structure concerns, anything you'd refine before continuing. Then proceed per operator direction.

## Open decisions (operator-driven)

After the fresh-eyes review converges:

1. **Re-draft sequencing**: refresh the remaining 4 v2 notes (hoonymode / wipeout / ctf / lgc) BEFORE the 22-mode mass fan-out (path 1, coherent exemplar set), OR mix into the fan-out (path 2)? Prior session leaned path 1 but operator hadn't locked.
2. **Redraft parallelism**: if path 1, sequential (operator reads each) or parallel (4 at once)? Operator's [[feedback_one_question_at_a_time]] suggests sequential by default, but v3 is now stable enough that parallel may be fine.
3. **Mass fan-out shape**: build a `game-mode-batch-dispatcher` skill (parallel to `ktx-l1-batch-dispatcher`), or ad-hoc dispatch? Per-batch grouping by triage / kind?
4. **Open methodology questions still pending**:
   - `sibling-preset` candidate relation (CTF surfaced; not yet locked) -- re-evaluate after ca/tot/ffa authoring
   - `shape_facets` taxonomy lock-in -- after ~3-5 standalones drafted
   - Family head -> child Sub-systems question for hoonymode -- partially resolved (it shipped without Sub-systems; pickspawn stays inline in Rules)

## Watchouts

- **hoonymode.md still uses `family-cousin` enum** (retired in v2). The v3 redraft must update to `family-member` for the blitz2v2/blitz4v4 cross-refs. Surfaced by the blitz2v2 v3 sub-agent.
- **Prose body grep when correcting** -- if you fix a factual claim, grep the whole file for related claims. The tot-in-UM_4ON4 wipeout error survived the first frontmatter fix because it was repeated in 2 prose sections.
- **Verify sub-agent claims if you dispatch** -- their source-grep results are hypotheses; spot-check 2-3 against actual files. Drafter-honesty discipline is enforceable only by spot-check.
- **The skill is outside this repo** at `~/.claude/skills/game-mode-curate/SKILL.md`. Updating it doesn't show in this repo's git status. Coordinate carefully.

## When in doubt

- weapon-scripts.md is the voice anchor -- when in doubt about prose style, peek at it
- killquad.md v3 + blitz2v2.md v3 are the shape anchors per kind -- mutation and variant respectively; the standalones (wipeout, hoonymode, ctf) don't yet have v3 exemplars
- Methodology v3 docs are authoritative
- Mass fan-out target: ~5 min per mode via the skill (operator's prior wall-clock anchor)
- Sub-agent redraft dispatches use Sonnet 4.6 high (skill-locked); orchestration in main session uses whatever model is active

## Out of scope for this session

- Re-drafting all 22 not-yet-authored modes (that's the mass fan-out, planned but not executed)
- Modifying L1 corpus (already at recast_v2)
- Building MVDSV / QWFWD / QTV variant skills (engine-scoped to KTX)
- Wiki page rendering / projection layer (downstream concern)
- Extending methodology unilaterally without operator approval

## Session-end git state (prior session, 2026-05-28)

- 6 commits on main from the v2 + v3 work: `7af2932a` / `338d9b7c` / `80f347c9` / `912905da` / `7cd8cbb0` / `33caff98`
- Plus the 2 earlier v1 commits: `e96e3b9d` (lgc) / `3a54eda3` (hoonymode)
- All committed; nothing dirty on the concept-notes side
- Working tree may have pre-existing unrelated drift (matchscheduler, slipgate-app, fte-asset-bundle) -- not blocking
- Push to origin at next checkpoint if operator wants

## Tasks at session-handover

Per task tracker:
- #1-#4, #6-#9 completed
- **#5 Plan 22-mode mass fan-out** -- pending, now unblocked
