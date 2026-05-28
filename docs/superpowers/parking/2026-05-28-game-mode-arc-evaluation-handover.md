# Handover: KTX game-mode concept-note arc -- evaluation + fan-out planning

**Date:** 2026-05-28
**Owner:** fresh terminal opened by operator (context budget on prior session hit ~400k)
**Estimated effort:** 30-90 min for evaluation + fan-out plan; days for the actual 22-mode fan-out

## Why this exists

The prior session built the KTX game-mode concept-note arc end-to-end: KTX L1 apply pass shipped (633 cvars/commands now `description_origin='recast_v2'`), 4 methodology docs locked, 4 worked-example notes drafted (killquad / wipeout / blitz2v2 / ctf), one stress-test in flight (hoonymode dispatched to a fresh terminal, may or may not have returned by the time you read this).

Prior session retired at ~400k context. Operator wants to **continue evaluation with you** on how the concept notes turned out and how to proceed with the remaining ~22 modes. Your job is to anchor that conversation against the actual shipped state.

## Where things are

**Shipped concept notes** (read at least 2-3 to ground the evaluation):
- `apps/qw-oracle/curated/concept-notes/killquad.md` -- mutation, l3-upstream, ~490w. Canonical `stacks_with_mutations: partial` + `incompatible-with` relation exemplar.
- `apps/qw-oracle/curated/concept-notes/wipeout.md` -- standalone, hybrid, ~1410w. Canonical UM bit-sharing prose pattern + Configuration HTML-comment placeholder.
- `apps/qw-oracle/curated/concept-notes/blitz2v2.md` -- variant, l3-upstream, ~395w. Canonical structural-variant exemplar (~9 cvar delta vs hoonymode).
- `apps/qw-oracle/curated/concept-notes/ctf.md` -- standalone, wiki-upstream, ~1796w + 2 Sub-systems sections. Canonical Sub-systems pattern exemplar (Grappling hook + Runes).
- `apps/qw-oracle/curated/concept-notes/hoonymode.md` -- pending fresh-terminal output. Check `git log -5` to see if it landed.

**Methodology** at `apps/qw-oracle/curated/concept-notes/_methodology/game-modes/`:
1. `mode-vs-mutation-classification.md` -- kind classification + 27 modes verdicts + mutation interlocks + L1 mode_class advisory note
2. `concept-note-frontmatter-schema.md` -- 3-layer YAML schema + worked examples (killquad / wipeout / blitz2v2) + UM bit-sharing patterns + namespace split (related_entities vs related_modes) + locked enums (stacks_with_mutations, relation)
3. `concept-note-section-structure.md` -- per-kind section sets + Sub-systems pattern + length bands + Configuration placeholder conventions
4. `triage-rules.md` -- wiki content scoring + decision tree + applied triage per mode

**Skill** at `~/.claude/skills/game-mode-curate/SKILL.md` -- production-ready, Sonnet 4.6 high locked, ~265 lines, references the 4 methodology docs.

**Indexes updated this session**:
- `apps/qw-oracle/curated/concept-notes/CLAUDE.md` -- now indexes `_methodology/game-modes/` subdir
- `HANDOVER.md` "Recently opened" -- has the arc entry pointing here

**Recent commits to skim** (`git log --oneline -20` from the project root):
- `950f23f8` -- KTX L1 apply pass shipped 633 v2 recasts to DB
- `2d06395d` / `65ced7b4` / `2172b026` / `01a158d1` -- 4 methodology docs (in order)
- `b23b872f` / `9eb1c9b2` -- killquad + wipeout shipped + 5 critical methodology backports
- `31ac3770` -- blitz2v2 shipped + 4 backports (gameplay_source_id fix etc.)
- `a7567e2d` -- ctf shipped + CTF-specific work
- `2817e28e` -- CTF post-ship backports (Sub-systems pattern + sibling-preset candidate)

## Reads required (cold, in this order)

1. **This handover** fully.
2. **`HANDOVER.md` "Recently opened" entry** for this arc -- summarizes arc state in one line.
3. **The 4 methodology docs at `apps/qw-oracle/curated/concept-notes/_methodology/game-modes/`** -- contracts. Read in numbered order.
4. **At least 2 worked-example notes** -- killquad + wipeout is the minimum (mutation + standalone). Add blitz2v2 if variant evaluation is on the table; add ctf if heavy-harvest standalone evaluation is on the table.
5. **The skill at `~/.claude/skills/game-mode-curate/SKILL.md`** -- workflow contract for fan-out.
6. **`apps/qw-oracle/CLAUDE.md`** -- project framing if you need to refresh on L1 / L2 / L3 layers + MCP contract.

## Critical rules (don't drift)

- **Methodology classification is HIGH confidence for all 27 modes** -- override only with explicit contrary source signals; surface the signals first.
- **Slug = strict `gameplay_mechanics.name`** (so `ca` not `clan-arena`, `tot` not `tribe-of-tjernobyl`, `1on1` as-is). The locked schema doc lists this; don't relitigate.
- **Namespace split**: `related_entities` for cvars/commands (entities-table refs only -- the load-concepts loader silently skips game_mode IDs); `related_modes` for game-mode cross-refs with typed relation.
- **UM bit-sharing groups** (load-bearing for activation_summary prose): `UM_4ON4` shared by 4on4/ca/wipeout; `UM_FFA` shared by ffa/tot; `UM_1ON1HM` shared by hoonymode/blitz2v2/blitz4v4. Do NOT write "the wipeout bit" / "the ca bit" / "the tot bit" -- those bits do not exist.
- **`gameplay_source_id: ktx`** (just the gameplay_sources.id value; do NOT invent `ktx@<version>` -- that won't join).
- **Don't extend the relation enum without 2+ cases confirming the pattern.** The `sibling-preset` candidate (open Q 2a in the schema doc) is in this category -- re-evaluate after ca/tot/ffa authoring confirms or rejects.
- **Prose body grep is just as important as frontmatter audit** when correcting factual claims. The tot-in-UM_4ON4 error survived the first frontmatter fix because it was repeated in 2 prose sections.

## First three actions

1. **Read this handover + the 4 methodology docs cold.** No anchored expectations from prior sessions; the methodology has been through 7 refinement rounds.
2. **Check hoonymode status**: `git log --oneline -5` -- did hoonymode land? If yes, read the note + report. If no, decide whether to wait or move on.
3. **Sample 2-3 of the shipped notes** with the operator. Discuss: are they quality? What patterns do you see across them? Are there latent issues that the fan-out should avoid?

## Open methodology questions (status snapshot)

In `_methodology/game-modes/concept-note-frontmatter-schema.md` "Open questions":

1. ~~RESOLVED~~ relation enum lock (after killquad+wipeout)
2. **OPEN** `shape_facets` taxonomy -- lock after ~3-5 standalones drafted
2a. **CANDIDATE** `sibling-preset` relation (surfaced 2026-05-28 during CTF) -- re-evaluate after ca/tot/ffa
3. **OPEN** `family_slug` self-reference for hoonymode -- hoonymode draft (when it lands) resolves this
4. **OPEN** `mode_default_init_array` indirection -- verify variant init arrays populated as `gameplay_mechanics` rows during per-variant drafting
5. **DEFERRED** concept-loader directory recursion -- v1 ships flat; future arc question

## Fan-out planning (the conversation operator wants)

After hoonymode lands (or you decide to proceed without), 22 modes remain to draft. Group them:

| Triage | Modes | Notes |
|---|---|---|
| **wiki-upstream (2)** | lgc, instagib | Both mutations. lgc has 6289 chars wiki + likely interlock with midair/dmgfrags. instagib has classification ambiguity (community calls it mode; source signals say mutation). |
| **hybrid (7-8)** | race, bloodfest, 4on4, tot, 1on1, 2on2, yawnmode (hoonymode if not yet drafted) | Mixed standalone+variant+mutation. Race has the route-system sub-systems candidate. |
| **l3-upstream (13)** | ca, ffa, berzerk, freshteams, midair, nosweep, 10on10, 2on2on2, 3on3, 3on3on3, 4on4on4, XonX, blitz4v4 | Most are variants (roster family) + mutations. ca is interesting -- l3-upstream because the wiki page is about CACE install, not playing ca. |

Conversation prompts for the evaluation:
- Are the shipped 4-5 notes good enough as exemplars for fan-out? Any patterns to standardize on?
- Sequential or parallel fan-out? (~5 min per mode; do-overs cheap per operator.)
- Build a `game-mode-batch-dispatcher` (parallel to ktx-l1-batch-dispatcher)? Or ad-hoc dispatch?
- Methodology questions surfaced by ctf (sibling-preset candidate, Sub-systems pattern) -- defer until pattern recurs, or address now?
- LGC stress test (mutation+wiki-upstream cell -- the one untested cell in the kind x triage matrix)?

## When in doubt

- The methodology is authoritative -- don't extend it casually
- Fresh-terminal-driven fan-out is the proven pattern (4 worked examples drafted that way already)
- ~5 min per mode via the skill is the wall-time anchor operator named
- If a methodology gap surfaces, surface it for orchestrator review -- don't backport unilaterally during fan-out
- The CLAUDE.md / methodology docs cover most cases; deviating requires explicit signal

## Out of scope for this session

- Drafting more concept notes yourself (delegate to fresh terminals via the skill)
- Extending the methodology without explicit operator approval
- Touching the L1 corpus (it's already at recast_v2; embedding refresh is a separate async job)
- Wiki page rendering / MCP `get_concept_note` plumbing (downstream)
- Building MVDSV / QWFWD variant skills (engine-scoped to KTX for this arc)

## Session-end git state (prior session, 2026-05-28)

- 14 unpushed commits on main, 8 of which are this session's game-mode arc work
- Working tree has unrelated pre-existing drift (matchscheduler, slipgate-app, etc.) -- not blocking
- `MEMORY.md` at 21.9KB / 151 files -- consolidation arc parked at `docs/superpowers/parking/2026-04-29-memory-system-consolidation.md`; PRESSURE INCREASING

Operator may want to push at session start (`git push origin main` -- read-only review first via `git log @{upstream}..HEAD --oneline`).
