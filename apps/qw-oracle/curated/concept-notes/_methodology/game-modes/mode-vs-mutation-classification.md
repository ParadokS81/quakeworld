# Mode vs mutation vs variant -- classification rules for KTX game-mode concept notes

## Purpose

The `gameplay_mechanics` table holds 27 rows with `kind='game_mode'`. They are not all the same shape: some are full standalone game modes, some are additive rule mutations layered on top of a base mode, and some are roster variants of a shared mechanical base. From a player browsing the wiki they all read as "game modes" -- from the LLM oracle answering a question about one of them they need to be distinguished in frontmatter so it can answer correctly.

This document defines the three categories, the source signals that pick one over the others, and applies the classification to all 27 modes with confidence verdicts.

## The three categories

### standalone

A full game mode with its own gameplay shape. Players activate it as the primary mode of play. Activation replaces the active mode; you are now "playing X."

**Source signals:**
- Registered in `mode_cmd[]` table at `commands.c:4537+` with its own `<mode>_um_init` array, OR
- Has its own dedicated activation command and code path (e.g., `race` via `race.c`)
- Behavior defines an entire match: spawns, scoring, loadout, win conditions, item rules
- Configuration: heavy -- the per-mode `_um_init` array sets dozens of cvars at activation

### mutation

An additive rule set layered on top of an existing base mode. Activation is orthogonal to the base mode -- you are still playing the base mode (e.g., 2on2), but with a mutation applied. Mutations stack.

**Source signals:**
- NOT registered in `mode_cmd[]`
- Activation: setting `k_<name>` cvar to non-zero (typically in server.cfg)
- Behavior modifies the active base mode rather than replacing it -- changes spawn behavior, item rules, time-window powerups, etc.
- Has cvars but no dedicated `<name>_um_init` array
- Often guarded by `if (cvar("k_<name>"))` or `if (k_<name>)` checks scattered through match/player/spawn code paths

### variant

Same mechanical base as another mode, differing primarily in roster size or a single tunable. The base mode plus the variant differ enough to justify separate `_um_init` arrays but share gameplay shape.

**Source signals:**
- Has its own `<mode>_um_init` array AND registered in `mode_cmd[]`
- Differs from sibling variants mainly by player count or single tunable
- Often shares internal `UM_*` identifier with siblings (e.g., blitz2v2 and blitz4v4 both = UM_1ON1HM)
- Mechanical content is mostly inherited from the family base

## Applied classification

Confidence: HIGH (clear source signals), MEDIUM (signals present but interpretation has nuance), AMBIGUOUS (operator review needed).

### Standalone modes (7)

| Mode | UM | Init array | Activation | Confidence |
|---|---|---|---|---|
| ctf | UM_CTF | `ctf_um_init` | `/ctf` | HIGH |
| ca | UM_4ON4 (4on4-based) | `carena_um_init` | `/ca` | HIGH |
| wipeout | UM_4ON4 (4on4-based) | `wipeout_um_init` | `/wipeout` | HIGH |
| tot | UM_FFA (ffa-based) | `tot_um_init` | `/tot` | HIGH |
| hoonymode | UM_1ON1HM (also family head -- see Hoonymode family below) | `_1on1hm_um_init` | `/hoonymode` | HIGH |
| ffa | UM_FFA | `ffa_um_init` | `/ffa` | HIGH |
| race | (race.c-specific) | (race.c init) | `/race` | HIGH (separate-activation pattern) |

### Variant families (11 entries in 2 families)

**XonX family** (UM_*ONX pattern, roster-size variants of team deathmatch):

| Mode | UM | Roster |
|---|---|---|
| 1on1 | UM_1ON1 | 1v1 |
| 2on2 | UM_2ON2 | 2v2 |
| 3on3 | UM_3ON3 | 3v3 |
| 4on4 | UM_4ON4 | 4v4 |
| 10on10 | UM_10ON10 | 10v10 |
| 2on2on2 | UM_2ON2ON2 | 3-team 2v2v2 |
| 3on3on3 | UM_3ON3ON3 | 3-team 3v3v3 |
| 4on4on4 | UM_4ON4ON4 | 3-team 4v4v4 |
| XonX | UM_XONX | variable (parent of family) |

**Hoonymode family** (UM_1ON1HM, hoony-style spawn-rotation variants; hoonymode itself is the family head and is listed under Standalone):

| Mode | UM | Roster |
|---|---|---|
| blitz2v2 | UM_1ON1HM | 2v2 |
| blitz4v4 | UM_1ON1HM | 4v4 |

XonX family: 9 entries. Hoonymode family: 2 entries (variants only; head listed under Standalone). Variant total: 11. All confidence HIGH.

### Mutations (9)

| Mode | Activation cvar(s) | Confidence | Notes |
|---|---|---|---|
| berzerk | `k_bzk` (toggle) + `k_btime` (duration) | HIGH | Quad damage applied to all players in last N seconds of match. Internal state `k_berzerk` int. |
| bloodfest | `k_bloodfest` | HIGH | Source: `world.c:971`. Used as condition throughout match flow. |
| freshteams | `k_freshteams` + family | HIGH | Source: `world.c:894`. Additive ruleset to dmm1. ~15 sub-cvars tuning ammo and weapon-time. |
| instagib | `k_instagib_*` family | HIGH | No master `k_instagib` toggle in world.c, but instagib-cvars scattered. Activation likely via custom server.cfg setting `k_instagib_*` cvars. |
| killquad | `k_killquad` | HIGH | Source: `world.c:969` |
| lgc | `k_lgcmode` | HIGH | Source: `world.c:1083`. Cvar name is `k_lgcmode`, not `k_lgc`. |
| midair | `k_midair` (+ `k_midair_minheight`) | HIGH | Source: `world.c:966`. Damage only when target is airborne above min-height. |
| nosweep | `k_nosweep` | HIGH | Source: `world.c:909` (registered in freshteams block). Sister of freshteams; prevents pickup of carried weapons in dmm1. |
| yawnmode | `k_yawnmode` | HIGH | Source: `world.c:1011` "implementation by Molgrum". Used in 7+ files (admin, match, player, bot_items, etc.) as gameplay-mode condition. |

All mutations follow the cvar-toggle pattern.

### Total: 7 standalone + 11 variants + 9 mutations = 27 ✓

## Implications for concept-note authoring

The category determines section structure and frontmatter shape:

- **Standalone** -- full 9-section structure: Lead / How to play / Rules / Strategy / Maps / History / Server setup / Configuration / See also. Configuration table is the full `mode_default` projection.
- **Mutation** -- smaller section set: Lead / What it does / How to enable / How it interacts with base modes / Configuration (just the few cvars, not a full table) / See also. No Strategy or Maps section (mutations layer on whatever mode is active).
- **Variant** -- one family page covers shared mechanics; per-variant pages cover deltas (roster size, slight rule tweaks, map list). Per-variant pages may be very short (a "stub" pointing at the family page plus 1-2 paragraphs of variant-specific notes).

The frontmatter `kind` field captures the category. The section structure spec (separate document) defines per-`kind` mandatory sections.

## Family-page authoring decisions

- **XonX family** -- one family page ("XonX / Team Deathmatch") covering shared mechanics. Per-variant pages exist where community convention warrants (1on1, 2on2, 4on4 already have wiki pages; 10on10 + 3on3 + 2on2on2 etc. likely just stubs initially).
- **Hoonymode family** -- one page covers hoonymode + blitz2v2 + blitz4v4, since they share UM_1ON1HM and the variants differ only in roster.

This keeps per-variant work proportional to community demand. The XonX family gets ~3 substantial per-variant pages + ~6 stubs + 1 family page.

## L1 `mode_class` is advisory; methodology classification governs

The Layer 1 extractor populates `gameplay_mechanics.props_json.mode_class` with a two-bucket signal: `standalone` or `mutator`. As of 2026-05-28 the live values are:

| L1 `mode_class` | Count | Modes |
|---|---|---|
| `standalone` | 7 | 1on1, blitz2v2, blitz4v4, ca, hoonymode, race, wipeout (sampled) |
| `mutator` | 2+ | berzerk, killquad (sampled) |

The L1 signal is a structural classifier: anything registered in `mode_cmd[]` with its own `_um_init` array reads as `standalone`; anything activated via cvar toggle without a `_um_init` reads as `mutator`. The L1 extractor doesn't see family relationships (UM-shared variants like blitz2v2 reading as standalone because they ARE structurally standalone in source) or umbrella concepts.

The methodology's three-bucket classification (standalone / variant / mutation) is a **user-facing curation overlay** on top of the L1 signal:

- L1 `standalone` -> methodology `standalone` OR `variant` depending on whether the mode is a family head or a family member
- L1 `mutator` -> methodology `mutation` (no further distinction)

This means **the concept-note `kind` field can disagree with `props_json.mode_class`** -- intentionally. Concept-note authoring follows the methodology classification (the table earlier in this doc), not the L1 signal. The L1 signal answers "is this in `mode_cmd[]` with an init array?"; the methodology answers "what user-facing category does this belong to?" Both are valid abstractions answering different questions.

Surfaced by the blitz2v2 worked example (2026-05-28): L1 classes blitz2v2 + blitz4v4 + hoonymode all as `standalone`; methodology classes blitz2v2 + blitz4v4 as `variant` (with hoonymode as standalone + family head). No L1-side change required; the existing L1 signal remains useful for "tell me the mutators" queries.

## Cross-classification quirks

- **`race`** is standalone but uses a separate-activation pattern (own `/race` command, own code in `race.c`), not the `mode_cmd[]` + `_um_init` pattern. Its `mode_default` rows are minimal compared to other standalones.
- **`hoonymode`** is both a standalone mode AND the head of a family (blitz2v2 + blitz4v4 share its UM). The standalone page IS the family page for this family.
- **`ca` / `wipeout` / `tot`** are standalones built on a base UM (UM_4ON4 or UM_FFA) but differ enough in rules that they merit standalone treatment, not variant treatment. Source signal: they have their own `_um_init` arrays with substantial overrides, not minimal deltas.
- **`instagib`** activation cvar appears to be a custom server setup pattern -- no master `k_instagib` toggle; servers set `k_instagib_*` family cvars to activate. Worth verifying during instagib's own concept-note drafting.

## Mutation interlocks (cross-mutation conflicts)

Mutations are not always orthogonal -- some pairs have hard source-level interlocks that prevent stacking. The killquad + wipeout worked-example pair surfaced the first confirmed case: killquad's drop-quad behavior is hard-gated by `!k_berzerk` at `items.c:1974`, so enabling both `k_killquad` and `k_bzk` simultaneously silently breaks killquad's drop path.

Capture interlocks in two places:

- **`stacks_with_mutations` frontmatter field** (per [[concept-note-frontmatter-schema]]) -- set to `partial` when the mutation has documented incompatibilities; set to `yes` when it stacks freely.
- **`related_modes` with `relation: incompatible-with`** -- name the specific other mutation(s) it conflicts with.

Per-mutation audit during authoring: grep the mutation's primary use-site code path for `!k_<other-mutation>` guards. Similar patterns likely exist for:

- `freshteams` and `nosweep` (both dmm1-tuned -- may share or conflict; worth checking)
- `midair` and `lgc` (both change movement/damage profiles)
- `bloodfest` against several mutations (it's a heavy ruleset)

These conflicts are NOT classification gates -- they don't change a mutation into a non-mutation. They are content for the mutation's own concept note. Surface them during per-mutation authoring; do not pre-populate this section speculatively.

## Open questions for operator

None at HIGH confidence -- all 27 modes are classifiable from source signals. Items to confirm during per-mode authoring:

1. **`instagib` activation** -- master cvar name (or is it really activated via setting the `k_instagib_*` family cvars in server.cfg)?
2. **`bloodfest` -- is it really a mutation or a small standalone?** Source treats it as a cvar toggle (mutation pattern), but community may treat it as standalone. Worth checking the wiki page narrative for framing.
3. **`berzerk` -- duration semantics**: operator said "quad in last 30s of game." Source has `k_btime` for duration -- default? Operator behavior may differ.
4. **`lgc` semantics** -- only the cvar name is verified; full mechanical reading deferred to lgc's own concept-note drafting (wiki has 6289 chars; harvest path).

These are not classification blockers; they are content questions for the per-mode concept-note draft.
