# Handover: KTX game-mode concept-note arc -- continuation (3 notes shipped, structure validated)

**Date:** 2026-05-29
**Owner:** fresh terminal, model of your choice (prior session retired ~400k context in Opus 4.8).
**Supersedes:** `2026-05-28-game-mode-experience-first-reframe-continuation.md` for current state. That doc still holds for the reframe rationale, the locked classification, and the verified findings -- read it for background; this doc is the current contract and corrects two things it got wrong (see "Corrections to the prior handover").

## What this session did (the headline)

Validated the experience-first uniform structure on real notes and shipped three:

- **`4on4`** (new) -- standard-game exemplar; operator-approved ("excellent by all measures").
- **`ca`** (new) -- arena; round-based elimination.
- **`wipeout`** (recast from a pre-existing v3 draft) -- arena; respawn-budget variant.

The uniform structure is now **locked and proven across two of the three major shapes** (standalone-standard, standalone-arena). The mutation shape is the one still untested.

## Corrections to the prior handover (it was wrong on two points)

1. **There are 6 pre-existing v3 notes, not 2.** The prior handover flagged only `killquad` + `blitz2v2` as v3 exemplars. In fact `ctf`, `hoonymode`, `wipeout`, `lgc` are *also* v3 drafts. `wipeout` is now recast; the other five remain v3.
2. **`killquad` / `blitz2v2` are NOT the calibration targets anymore.** Use **`4on4` / `ca` / `wipeout`** as the experience-first exemplars. The v3 notes use the retired kind-driven structure and one (wipeout's v3) carried a factual error -- they are anti-examples now.

## The locked structure (proven this session)

Fixed top-level section order, all modes:

1. `## Summary` -- core, always real (2-4 sentences; the experience + complete short answer)
2. `## How it plays` -- core; big modes extend with custom `##` here; modifiers/variants lead with the delta vs the base
3. `## Starting a game` -- core; the console command + activation
4. `## Strategy` -- conditional (only with real, verified content)
5. `## Maps` -- conditional
6. `## History` -- conditional (needs real story, not just an "introduced in" line)
7. `## Hosting & settings` -- core; admin block last
8. `## See also` -- core

**Rules that held up:** conditional sections appear *only when there's real content* (absent, not empty -- 4on4 had Maps no History; ca had History no Maps; wipeout had both). Admin block last (player-first). "How it plays" carries the whole experience in prose; `###` subsections inside it are the pressure-release for content-heavy modes (CTF will need this).

**Frontmatter (leaned out from the old schema):** `experience_group` + `deathmatch_flag` added; `kind` kept as metadata = the L1 `mode_class` value (`standalone` | `mutator`) -- the old three-bucket {standalone/variant/mutation} is collapsed to the L1 two-bucket, and the "variant/family" overlay is replaced by `experience_group` + `related_modes: similar-shape`. Dropped the heavy fields (`um_internal_id`, `team_count`, `items_on_map`, `respawn_behavior`, `score_system`-as-required, `shape_facets`, `family_*`). Kept the few useful queryable facts (`roster`, `loadout`, `objective`, `score_system`). See `4on4.md` / `ca.md` / `wipeout.md` for the exact shape.

## Verified findings this session (DO NOT re-derive)

All source-checked at KTX `1.47-2-g67253dc` (`research/repos/ktx/`):

- **Clan Arena's command is `/carena`, NOT `/ca`.** The `um_list[]` label is `ca` (= the slug), but the registered console command is `carena` (`commands.c:824` -> `UserMode` idx 16). `/ca` does nothing. **`ca` is the ONLY usermode whose command differs from its name** -- every other mode's command == its slug (verified `cmds[]` table, `commands.c:809-825`). When drafting any mode, take the activation command from `cmds[]`, not the slug.
- **Rocket Arena (`/arena`, `k_rocketarena`) is a separate mode** -- a 1on1 winner-stays duel, NOT Clan Arena, and NOT one of the 27 (it's a cvar toggle, like dmm4). Another missed mode for the command-table triage.
- **Team-size -> dmm split** (standard-game): per-team size <=2 runs `deathmatch 3` (weapons stay: 1on1/2on2/2on2on2); >=3 runs `deathmatch 1` (weapons don't: 3on3/4on4/.../XonX). Timelimit scales 10/15/20. Verified `commands.c:4216-4417`.
- **No self-damage in CA + wipeout.** Your own (and a teammate's) splash does no HP AND no armor damage; only knockback/velocity applies -> free rocket-jumps. Fall damage and drowning are also off. Mechanically the `teamplay 4` no-FF rule extended to self via `isCA()`. Verified `combat.c:567-572` + `:477-478`. (`isCA()` covers both ca and wipeout; `isWipeout` = `k_clan_arena == 2`.)
- **Wipeout respawn ladder:** 4v4 = 5/10/20/30s, 3v3 = 4/8/16/24, 2v2 = 3/6/12/18, solo = one free instant first respawn; out after `k_clan_arena_max_respawns` (4) deaths; suicide (`/kill`) forfeits remaining respawns. Verified `calc_respawn_time` `clan_arena.c:142-155` + `:955`/`:616`.
- **CA/wipeout spawn loadout** (shared, gated `isCA()`, `clan_arena.c:511-564`): 100 HP / 200 armor @ 0.8 (red, 80% absorb) / all 8 weapons / 200 nails, 100 shells, 50 rockets, 150 cells, 6 grenades / RL up.
- **Hosting default:** a standard KTX/nquake server defaults `k_allowed_free_modes` to `4095` (every standard mode); modes are available out of the box. The bitmask is set only to *restrict* a server. `UM_4ON4` = `(1<<3)` = 8, shared by 4on4/ca/wipeout (`g_local.h:696`). FFA-dedicated port uses 32 (`research/repos/nquake-distfiles/sv-ffa/ffa/port1.cfg`); standard template is `sv-gpl/ktx/port_template.cfg` (4095).
- **`game_mode` rows don't store the `initstring_array` name** -- you can't auto-join a mode to its `mode_default` rows; read the array name from source (`commands.c` `um_list[]`). The `mode_default` rows ARE keyed by `initstring_array` (e.g. `_4on4_um_init`, `carena_um_init`).
- **`ktx:command:ca` is genuinely absent** from `entities` (not an extraction gap -- there is no `ca` command, it's `carena`, which DOES exist). All other usermode commands have entities.

## Corpus state

| State | Count | Modes |
|---|---|---|
| Experience-first (done) | 3 | `4on4`, `ca`, `wipeout` |
| v3 drafts (need recast + re-verify) | 5 | `ctf`, `blitz2v2`, `killquad`, `hoonymode`, `lgc` |
| No note yet | 19 | 8 standard-game (`1on1` `2on2` `3on3` `10on10` `XonX` `2on2on2` `3on3on3` `4on4on4`), `ffa`, `blitz4v4`, `race`, `tot`, `bloodfest`, `midair`, `instagib`, `berzerk`, `freshteams`, `nosweep`, `yawnmode` |
| Extras (outside the 27) | ~3 | `deathmatch-modes` ref, `dmm4`, `rocket-arena` |

**v3 recasts are not just reformatting** -- treat v3 content as hypothesis and re-verify against source (wipeout's v3 had a wrong spawn-invuln claim; the methodology had the `/ca` error). Harvest the v3's genuine content (maps tables, history) but verify it.

## The methodology-reconciliation backlog (the main carry-forward)

The 4 docs at `_methodology/game-modes/` + the external skill `~/.claude/skills/game-mode-curate/SKILL.md` still describe the OLD kind-driven model. Drain this once the mutation shape is validated (see First actions). Accumulated items (all logged in this session's commit bodies):

1. **`SKILL.md`** -- reconcile to the uniform structure; fix pre-existing v2/v3 drift (length bands line ~29, "embrace short" line ~243). Also: the pre-flight SQL is stale -- `entities` has no `source_ref` column; `game_mode` rows lack `initstring_array`; activation must use the `cmds[]` command not the slug.
2. **`concept-note-section-structure.md`** -- collapse the 3 kind-specific section sets into the one uniform structure (documented above).
3. **`concept-note-frontmatter-schema.md`** -- add `experience_group` + `deathmatch_flag`; demote `kind` to L1 `mode_class`; retire the heavy/kind-specific fields; fix the stale "Configuration = 1-sentence pointer" line.
4. **`mode-vs-mutation-classification.md`** + **`experience-group-classification.md`** -- both say `/ca`; correct to `/carena`. Add the slug != command lesson (`ca` is the lone mismatch). Add Rocket Arena to the command-table triage as another missed mode.
5. **`triage-rules.md`** -- the applied table mis-predicts `ca` as l3-upstream/wrong-topic; it's actually hybrid (the wiki has a usable gameplay lead). Correct the entry.
6. **L1 gaps** -- `dmm1`-`dmm5` `ChangeDM` commands + Rocket Arena (`k_rocketarena`) aren't in `gameplay_mechanics`; `mode_default` join needs the array name from source. Decide whether to extend extraction.
7. **No relation enum for bit-sharing siblings** -- `ca`/`wipeout`/`4on4` share `UM_4ON4` but aren't `similar-shape`; kept in See-also prose, out of `related_modes`. The old `sibling-preset` open question -- decide or leave deferred.

## Open decisions for the next session

- **Maps: full table vs curated prose.** wipeout's v3 had the full 17-map roster matrix; the recast curated it to prose and dropped ~10 maps. Decide which map-heavy modes want the table back (esp. wipeout, race). This is a general corpus call.
- **Lean-on-sibling vs self-contained.** wipeout leans on `ca` for shared mechanics (DRY) at the cost of standalone readability. Confirm that's the right default for variant-like modes.
- **Sequencing of the three streams** (5 v3 recasts / 19 new / ~3 extras) -- operator's call; the prior session ran one mode at a time, no fan-out.

## Reads required (cold, in order)

1. This handover.
2. `apps/qw-oracle/curated/concept-notes/_methodology/game-modes/experience-group-classification.md` (the locked taxonomy -- the heart).
3. `apps/qw-oracle/curated/concept-notes/weapon-scripts.md` (the voice/quality bar).
4. The three experience-first notes -- **`4on4.md` (primary exemplar), `ca.md`, `wipeout.md`** -- as the calibration targets.
5. The 4 methodology docs at `_methodology/game-modes/`, knowing they're stale on structure (per the reconciliation backlog above).
6. `~/.claude/skills/game-mode-curate/SKILL.md` -- the per-mode workflow + verification discipline are still valid; the section-structure / length-band guidance is stale. Follow the workflow, apply the uniform structure (don't re-invoke it blindly -- it re-injects the retired model).

## Critical rules (don't drift)

- **Experience over mechanism; one uniform structure for all 27.** `kind` is frontmatter metadata (= L1 `mode_class`).
- **Activation command comes from the `cmds[]` table (`commands.c:809+`), not the slug.** `ca` -> `/carena` is the proven trap.
- **Every specific number/claim gets source-verified at the handler**, not the init array. Audit trail goes in the commit body, not the prose. The operator's hands-on QW knowledge catches things source-derivation misses -- surface a draft and invite per-mode corrections.
- **Treat v3 notes + methodology claims as hypotheses** -- re-verify on recast.
- **Slug = strict `gameplay_mechanics.name`** (`ca` not `clan-arena`); `gameplay_source_id: ktx`.
- **One mode at a time, operator polishes. No fan-out.** Commit each note with the audit-trail body + `Co-Authored-By: Claude Opus 4.8`. Stage only the note file (verify `git diff --cached --stat`; the working tree has unrelated pre-existing drift).

## First three actions

1. **Read this handover + `experience-group-classification.md` + `4on4.md`/`ca.md`/`wipeout.md` cold.** Form your own read of the structure before continuing.
2. **Recast `killquad`** (a v3 mutation) -- validates the **mutation shape** under the uniform structure (the untested one: the "Starting a game" / delta-vs-base question), clears a v3 note, and fixes its known imprecision (the v3's berzerk-interlock prose overstates the window-scoped `!k_berzerk` gate). Then the structure is proven on all three shapes.
3. **Run the methodology/skill reconciliation pass** (drain the backlog above) so the remaining ~22 notes are drafted against clean docs. Then grind: recast the 4 remaining v3 notes + draft the 19 new + the extras.

## Out of scope

- Reconciling every doc before continuing (do `killquad` first, then reconcile).
- L1 corpus changes (at recast_v2). The dmm/rocket-arena extraction gaps are flagged, not fixed.
- MVDSV / QWFWD / QTV forks (KTX-scoped). MVDSV describe-fill is the *next* arc, confirmed not a dependency for game-mode notes (base server cvars are discussed in prose, not cross-linked).
- Wiki page rendering / projection layer.

## Git state (2026-05-29)

- This session's commits on `main`: `04a6bc0d` (4on4), `03e7f251` (ca), `11e95922` (ca command fix + no-self-damage + hosting), `d76841dc` (wipeout recast). HEAD = `d76841dc`.
- Pushed to origin at session end (see wrap). 15 uncommitted working-tree files remain -- ALL pre-existing unrelated drift (matchscheduler, slipgate-app, fte-asset-bundle, etc.), not this arc's.
