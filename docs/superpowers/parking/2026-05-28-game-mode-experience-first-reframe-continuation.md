# Handover: KTX game-mode concept-note arc -- experience-first reframe continuation

**Date:** 2026-05-28 (later session, same day)
**Owner:** fresh terminal, continuing in a model of your choice (prior session retired ~400k context in Opus 4.8)
**Supersedes:** `2026-05-28-game-mode-arc-evaluation-handover.md` and `2026-05-28-game-mode-v3-fanout-continuation.md` -- both were built on the kind-driven "v3 methodology" that this session reframed. Read them only for deep history; this doc is the current contract.

## What changed this session (the headline)

The arc **pivoted from a kind-driven methodology to a user-facing, experience-first one.** Operator's framing: *"the user experiences a mode, not a mechanism."*

- **Before:** notes were structured three ways by engine `kind` -- standalone got a 9-section set, mutation a 6-section set, variant a 4-section set.
- **After:** **one uniform note structure for all 27 modes**, with `standalone`/`variant`/`mutation` demoted to a frontmatter metadata field. A reader of the `midair` note and the `4on4` note sees the same skeleton.

This came out of a long, careful brainstorm that also corrected several factual/landscape errors (instagib mis-grouped as aim practice; the FFA two-forms distinction; dmm4 being a real played mode the L1 extraction missed; the `freeze`/`practice` polarity). The operator's bar for the eventual notes: **structurally complete + factually correct + prose close enough that they lightly rephrase for naturalness and spot-check** -- not one-shot perfection. And explicitly **no mass fan-out** for modes (fan-out was for the 600-entity L1 grind); modes are done **one at a time, adjusting as we go**, because they matter and are worth getting right.

## Where things are

### The locked artifact (committed)

`apps/qw-oracle/curated/concept-notes/_methodology/game-modes/experience-group-classification.md` -- commit `eb1f6b3d`. This is the heart of the session. It carries:

- **10 experience groups over the 27 modes** (full per-mode assignment in the appendix, verified against the live `gameplay_mechanics` table):
  - `standard-game` (9): 1on1, 2on2, 3on3, 4on4, 10on10, XonX, 2on2on2, 3on3on3, 4on4on4
  - `free-for-all` (1): ffa
  - `arena` (2): ca, wipeout
  - `spawn-rotation` (3): hoonymode, blitz2v2, blitz4v4
  - `objective` (1): ctf
  - `movement` (1): race
  - `solo-pve` (2): tot, bloodfest
  - `aim-practice` (2): midair, lgc
  - `match-modifier` (5): berzerk, killquad, freshteams, nosweep, yawnmode
  - `novelty` (1): instagib
- **The "How modes are run" section** (operational model): KTX modes are dynamic (one server, console-switched `/4on4` etc., match-based); matchless public FFA is the lone dedicated/continuous form.
- **Command-table triage** (beyond the 27): `dmm4` is a real played mode (the `dmm4` `ChangeDM` command, `commands.c:728`) the L1 extraction missed -- gets its own note; `practice`/`freeze` are prewar utility toggles and `rpickup` is an election feature -- NOT modes.
- **Carry-forward + L1-gap notes** baked into the doc.

### Verified findings (don't re-derive these -- they're source-checked at HEAD `1.47-2-g67253dc`)

- **team-size -> dmm split:** team size <=2 runs `deathmatch 3` (weapons stay); >=3 runs `deathmatch 1` (weapons don't stay). So 1on1/2on2/2on2on2 are dmm3; 3on3/4on4/10on10/XonX/3on3on3/4on4on4 are dmm1. (`commands.c:4216-4416`.)
- **instagib = novelty/for-fun**, not aim practice -- Quake 1 has no rail; it's a Q2/3 gimmick FFA, rarely played.
- **dmm4 = aim-practice baseline** (full arsenal spawn, no items, 1on1 on aim maps like povdmm4); `midair`/`lgc` layer rules on it. Not in the 27 (L1 gap -- the `dmm1`-`dmm5` `ChangeDM` commands at `commands.c:725-729` were never extracted).
- **FFA has two forms:** matchless public FFA (continuous, the living experience) vs the `ffa` command (a timed match). One note covers both, leading with matchless.
- **dmm5 wiki claim is stale:** QWiki says "dmm5 absent from KTX," but KTX uses `deathmatch 5` as the clan-arena/wipeout ruleset (`items.c:1347/2604`, `client.c:2308`, set by `carena_um_init`/`wipeout_um_init`). Correct this in the deathmatch-modes note.
- **`freeze` LOCKS the map** (doors/lifts/trains/triggers) during prewar; default `0` = live. `ktx.cfg:74`: "freeze platforms and doors before matchstart (0 = no, 1 = yes)." `k_practice` bypasses it and additionally enables items. (Operator initially recalled the polarity inverted; source settled it.)

### The proposed uniform note structure (NOT yet locked -- prototype it on 4on4)

```
1. Summary            -- the experience in 2-4 sentences (frontmatter hook; complete short answer)
2. How it plays       -- objective, match flow, win condition, what's distinctive
                         (modifiers / dmm-variants lead with the delta vs the base)
3. Starting a game    -- "on a KTX server, /<mode> to start a match" (FFA notes its matchless form)
4. Hosting & settings -- # server.cfg snippet + the 3-7 defining cvars in prose (dmm flag, roster, scoring)
5. (optional) Strategy / Maps / History -- only with real content
6. See also           -- same-experience-group siblings + related notes (e.g. deathmatch-modes)
```

Frontmatter carries: `kind` (metadata now), `experience_group`, `deathmatch_flag`, roster, activation, source_refs, `related_modes`/`related_entities`.

## Reads required (cold, in order)

1. **This handover.**
2. **`experience-group-classification.md`** (the locked doc) -- the heart.
3. **`apps/qw-oracle/curated/concept-notes/weapon-scripts.md`** -- the voice/quality bar. Notes should read like this: a confident *guide*, not a flat reference. (Progressive disclosure: complete short answer up top, drill-down below.)
4. **The 4 existing methodology docs** at `_methodology/game-modes/` -- BUT read them knowing **`concept-note-section-structure.md` + `concept-note-frontmatter-schema.md` are partially superseded** (the kind-driven split is being replaced by the uniform structure). `mode-vs-mutation-classification.md` survives as the mechanism/source-signal reference. `triage-rules.md` is unaffected.
5. **`killquad.md` + `blitz2v2.md`** -- the two prior "v3" exemplars. Fine as notes, but **bad calibration targets** (unplayed modes, terse mechanical style). Use 4on4 as the new exemplar instead. (killquad was spot-checked factually sound; one minor known imprecision: its berzerk-interlock prose reads as total mutual exclusion, but the `!k_berzerk` gate is window-scoped to the late-match berzerk window -- not worth fixing now.)
6. **`~/.claude/skills/game-mode-curate/SKILL.md`** -- the per-mode authoring contract. Needs reconciliation (see below). External to the repo -- edits won't show in repo git status.

## The reconciliation TODO (the main carry-forward)

The supporting docs + skill still describe the OLD kind-driven model. They need bringing into line with the uniform experience-first structure. Suggested order (or fold into the 4on4 prototype as you go -- operator's call on sequencing):

1. **`~/.claude/skills/game-mode-curate/SKILL.md`** (highest priority -- it's what per-mode authoring executes against). Reconcile to the uniform structure. ALSO fix pre-existing v2/v3 drift found at session start: line ~29 still lists v2 length-bands + "pointer-prose Configuration" in its methodology-contract summary; line ~243 still says "embrace short" (v3 replaced it with "length follows content"). The skill body (152-217) is already v3-correct, so it self-contradicts.
2. **`concept-note-section-structure.md`** -- collapse the three kind-specific section sets into the one uniform structure above. (Its v3 "narrative Configuration" + "length follows content" guidance survives; only the kind-split changes.)
3. **`concept-note-frontmatter-schema.md`** -- add `experience_group` + `deathmatch_flag`; demote `kind`; retire the kind-specific structural layers. ALSO fix pre-existing drift: line ~57 still says Configuration is "a 1-sentence pointer" (stale v2); the blitz2v2 worked example models the pure-roster anti-pattern the section-structure doc warns against.
4. **`mode-vs-mutation-classification.md`** -- reframe its role as mechanism-metadata (secondary to experience-group), not the structural driver. Mostly a framing edit.
5. **L1 gap** -- the `dmm1`-`dmm5` `ChangeDM` commands aren't in `gameplay_mechanics`. Decide whether to extend extraction. `dmm4` needs its own note regardless.

## First three actions

1. **Read this handover + the locked `experience-group-classification.md` + weapon-scripts.md cold.** Form your own take on the experience-first reframe and the proposed uniform structure before executing.
2. **Surface any concerns with the operator**, then get a go on the uniform structure (it's proposed, not locked).
3. **Prototype the structure by drafting `4on4`** -- most-played, standard-game, exercises dmm1 + the team-size->dmm fact + the dynamic-mode "how to start" + the frontmatter. React to the real note, adjust the skeleton if needed; if it lands, it's the first real note and the standard-game exemplar. Then proceed one mode at a time.

## Parked candidates (not the 27)

- **`deathmatch-modes` reference note** -- wiki-seeded (dmm0-5) + the dmm5 correction + the team-size->dmm finding. The standard-game / arena / aim-practice notes link to it instead of re-explaining the flags.
- **`dmm4` own note** -- the aim-practice baseline.
- **"how KTX game modes work" foundational note** -- the dynamic-mode model + history (dedicated per-mode ports -> dynamic KTX). Operator's call; pairs with the per-mode notes without them depending on it.
- **matchless FFA** -- covered within the `ffa` note (lead with it), not a separate note.

## Critical rules (don't drift)

- **Experience over mechanism.** Organize and structure notes by playing experience; `kind` is frontmatter metadata.
- **One uniform structure** for all 27. No reverting to kind-specific section sets.
- **Wiki is a reference, source is the authority.** Verify every wiki claim against KTX source (the dmm5 catch is the cautionary example). triage-rules already encodes this.
- **Specific numbers/claims get source-verified**; audit citations go in the commit body, not the prose (carries over from the prior methodology + weapon-scripts voice).
- **Slug = strict `gameplay_mechanics.name`** (`ca` not `clan-arena`); `gameplay_source_id: ktx`.
- **One mode at a time, operator polishes.** No fan-out.
- **Don't extend the methodology unilaterally** -- surface gaps for operator approval.

## Out of scope

- Reconciling every doc in one big pass before drafting (do it incrementally / as part of the 4on4 prototype unless operator wants a dedicated pass first).
- L1 corpus changes (already at recast_v2).
- MVDSV / QWFWD / QTV forks (KTX-scoped).
- Wiki page rendering / projection layer.

## Session-end git state (2026-05-28, later session)

- One commit on main this session: `eb1f6b3d` (the locked classification doc). HEAD.
- 25 commits unpushed to origin/main (origin is a clean fast-forward behind -- prior sessions deferred the push).
- 15 uncommitted working-tree files are ALL pre-existing unrelated drift (matchscheduler, slipgate-app, fte-asset-bundle, etc.) -- not this session's, not blocking.
- `MEMORY.md` at 204 lines (over the 200 soft limit) -- memory-consolidation arc parked at `docs/superpowers/parking/2026-04-29-memory-system-consolidation.md`; pressure increasing.
