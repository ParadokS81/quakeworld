# L1 universal shape v2 (Layer A)

L1 `entities.description` is user-facing prose -- not source-trace explanation.
This is the Layer A skeleton; pairs with the Layer B KTX shape catalog in
`shape-catalog.md` and the layer-architecture summary in
`layer-architecture.md`.

Originally locked 2026-05-21 (during the KTX describe-fill arc, after 96 rows
shipped overloaded with file:line refs + engine jargon); refined to v2 on
2026-05-23 during KTX L1 catalog visual review session 2 to split
permission + match-state, add explicit Effect / Prerequisites slots, and
formalize action-level discipline.

## The universal card shape

Use for every L1 card. Sections collapse when they don't apply.

```
<Headliner -- one sentence: what is this entity?>

Effect:
  <concrete rule/state change 1>
  <concrete rule/state change 2>
  ...
[or single-line prose if there's just one Effect]

Prerequisites: <what must already be true for this to fire>

Permission:    <who can invoke -- any player / player+admin spectator / admin only / server config only>
Match-state:   <when -- pre-match only / any time / mid-match only>  [omit when "any time"]
Default:       <X>.  [cvars only; commands have no default]

Example: <user-flow showing typical activation path; multi-line OK>

See also: <peer1 (relationship)>, <peer2 (relationship)>, ...
```

**Mandatory**: Headliner + Permission.

**Optional / collapses**:
- **Effect** -- atomic value cvars (e.g. `dmm4_invinc_time`) have nothing to
  list. The value-enum below the headliner IS the effect description.
- **Prerequisites** -- most cvars have none. Common for paired-toggle commands
  (Shape 1c) and gated commands (Shape 4).
- **Match-state** -- omit when "any time" (most cvars, most one-shot player
  commands).
- **Default** -- commands have no default. Cvars always list it.
- **Example** -- skip only for trivial toggles where the value enum + Default
  makes invocation self-evident.
- **See also** -- orphan entities have no peers (rare).

## Section semantics

- **Headliner** -- one sentence. Plain QW terms; the user describes the
  in-game effect. No engine/code jargon. No mechanism narration.
- **Effect** -- the concrete rules/state changes. For preset commands, list
  the cvars they set (the bundle). For paired-toggle commands, name the cvar
  they flip. For dispatchers (mmode-style), describe the state set + name the
  consumer ("ClientSay reads this to route ..."). For atomic cvars, the value
  enum + Default is the entire effect.
- **Prerequisites** -- what must be true for the entity to fire. Common cases:
  required base mode (1on1 for `arena`; dmm4 for `totmode`), required gating
  cvar (`k_admins 1` for `/admin`), required serverinfo key (`*cheats` for
  `giveme`). Phrase as "X must be active/set" or quote the refusal message
  verbatim.
- **Permission** -- who can invoke. Phrasing MUST match the actual CF_*
  registration flag(s) from `include/g_local.h:647-658`, not the verbal
  assumption that the command "looks admin-y." Mapping (added 2026-05-26
  after Mode selection batch F1):

  | Source CF flags | Permission line wording |
  |---|---|
  | `CF_PLAYER` (alone) | `any player (spectators excluded)` |
  | `CF_SPECTATOR` (alone) | `any spectator` |
  | `CF_BOTH` (= `CF_PLAYER \| CF_SPECTATOR`) | `any player or spectator` |
  | `CF_PLAYER \| CF_SPC_ADMIN` | `any player or admin spectator` |
  | `CF_BOTH_ADMIN` (= `CF_PLR_ADMIN \| CF_SPC_ADMIN`) | `admin only` |
  | `CF_PLR_ADMIN` (alone, rare) | `admin only (player slot)` |
  | `CF_SPC_ADMIN` (alone) | `admin spectator only` |
  | (cvar, no command-side toggle) | `server config only` |
  | (vote-gated via `k_vp_xxx`) | `vote (k_vp_xxx threshold)` |

  **Critical**: `CF_PLAYER \| CF_SPC_ADMIN` is NOT admin-only. `CF_PLAYER`
  (bit 0) = "command valid for players" (any player). `CF_SPC_ADMIN`
  (bit 3) = "client is spectator, so this command requires admin rights."
  OR'd together: "any player slot, OR admin spectator." The verbal label
  "Admin command" for this flag combination is incorrect. `CF_PLR_ADMIN`
  (bit 2, "client is player, so this command requires admin rights") is a
  DIFFERENT flag and is rare. Lesson learned 2026-05-26: prior batches'
  Shape 1 command-side cards inherited an "Admin command" prose
  prescription from `shape-catalog.md` that was based on this misread;
  corrected after the Mode selection batch F1 cross-card finding (silent
  miss in Scoring & stats batch's `dmgfrags`).

  Runtime gating (e.g. mid-match admin-only via `match_in_progress &&
  !is_adm(self)` check inside the handler) may add an admin requirement on
  top of the CF flag. Surface this as a two-phase Permission line
  ("pre-match: X; mid-match: admin only") rather than collapsing into
  "admin only" (see `silence` for the canonical example).
- **Match-state** -- when. Standard phrasings: `pre-match only` (refused while
  match in progress, the typical admin-toggle case), `any time` (default;
  omit), `mid-match only` (only fires during a live match, rare).
- **Default** -- cvar default value. Add `Recommended: Y` only when convention
  differs from default.
- **Example** -- the user-flow. Multi-line OK. Use pedagogically-tuned values
  that make the mechanism self-evident (e.g. comma placement in `postmsg`
  reveals wrap structure).
- **See also** -- peer entity links with inline-parenthetical relationship
  tags. Cap at 4-5; if more, the entity is begging for a concept note.

## Why each section earns its place

The four user questions a card must answer (in order):

| User question | Answered by |
|---|---|
| "What is this?" | Headliner |
| "What does it do?" | Effect |
| "Why isn't it working?" | Prerequisites |
| "Can I use it?" | Permission + Match-state |

Everything else (Default / Example / See-also) is reader-comfort: concrete
activation flow, peer navigation, default-aware mental model.

## The v1 template (superseded -- recognize it during recast)

The earlier template (locked 2026-05-21) was:

```
<1-line what-it-does>
<value> = <meaning>
Default: <X>
Set by: <method>
Example: ...
See also: ...
```

The skill will encounter many v1-shape descriptions during recast (sessions 1
+ early session 2 cards, ~32 entities). Content is correct; the recast is
mostly mechanical -- split `Set by` into Permission + Match-state, add an
Effect slot if missing, add Prerequisites if relevant. The v1 cards exist
because v2 was locked only on 2026-05-23.

## Discipline rules (every recast must respect these)

- **Action-level, not implementation-level.** Include in L1 only what changes
  the user's *action plan*. The user typing `totmode` cares that ToT mode
  toggles on and that it requires dmm4 -- they don't care that the runtime
  flag flips a branch in `combat.c:545` that swaps the quad multiplier. Defer
  mechanism, implementation detail, and runtime control-flow to the L3
  concept note. L1 = what happens; concept note = how.

- **Prerequisites must be user-actionable or surprise-bearing.** Each
  prerequisite earns its place by *changing the reader's action plan*. Two
  flavors qualify: (a) user-actionable -- the user can check, change, or
  work around it (server-config dependency, mode-precondition, cooldown,
  competing global state); (b) surprise-bearing -- hidden state the user
  can't predict (per-player cooldowns, mutually-exclusive elections). A
  prerequisite that's *logically implied by the user-action itself* is
  noise: "you are not already an admin" assumes someone running `elect` is
  *trying* to become admin -- if they were already admin they wouldn't type
  it. Cut self-state refusals where the user's intent implies they don't
  meet them.

- **Subsequent-invocation toggle.** Some commands behave differently on a
  second invocation by the same caller -- `elect` started while your own
  election is pending aborts the election instead of starting another. This
  is neither a refusal nor the primary effect; it's an alternate behavior
  triggered by caller state. Surface it as a labeled bullet in Effect (e.g.
  "Re-running 'elect' while your own election is pending aborts it
  (subsequent-invocation toggle, not a refusal)").

- **Minimum viable information (MVI) is the default discipline.** Every line
  in an L1 description must earn its place by answering one of: "what does
  this do?" or "how to enable/use it?". Lines that fail this test -- status
  metadata, lore, editorial commentary, design-intent speculation -- are
  cut by default. Include only when a specific usage decision turns on the
  information.

- **Prose answers "what is this?"; Example answers "how do I use it,
  including optional knobs."** Optional customizations (override userinfo
  keys, alternate invocation patterns, fallback dirs) belong in Example
  with an `(Optional: ...)` annotation -- not in the prose. The prose stays
  focused on the core feature; the example shows the full invocation
  surface including knobs the user can ignore.

- **Examples often beat prose, and pedagogically-tuned examples beat random
  ones.** Once the example is concrete, the prose can drop mechanism
  narration -- the example IS the explanation. *Tune* the example: choose
  sample values, punctuation placement, and configuration-set order that
  demonstrate the mechanism through the example itself. E.g. for a
  prefix/suffix-wrapping command (KTX `victim` / `killer` / `newcomer`),
  putting the comma in `postmsg` (not `premsg`) makes the wrapping
  structure self-evident. Cluster configuration calls in invocation order
  (`setinfo premsg ...` + `setinfo postmsg ...` + `bind <key> <command>`)
  to show the typical setup flow. Show the resulting chat output as the
  user would see it (`<yournick>: <wrapped_message>`), not the literal
  stuffed `say` command.

- **Examples that name related entities boost retrievability for free.**
  When the example for entity A names entity B (e.g. ksound1's example
  names `setinfo kf 1`; k_admincode's example names `k_admins 1` and the
  `/admin` command), an LLM searching for B surfaces A's record via lexical
  hits in the example body -- the example doubles as a hidden cross-
  reference index.

- **Duplication discipline follows the consumer.** For whole-record
  consumers (Oracle MCP `lookup_entity`, catalog HTML, Slipgate UI), the
  prose and Example are returned together in one block -- duplication
  between them is just bloat. Default: minimize duplication. If an
  instruction appears in Example, drop it from prose unless dropping breaks
  prose grammar.

- **Never duplicate the match-state constraint in prose AND Match-state
  line.** Pick one location; the Match-state line is the standard.
  Standardized 2026-05-23 after observing inconsistent placement across
  `discharge` (in prose), `droppack` (in both), `hdptoggle` (in prose tail).

- **L1 is a graph node; edges encode relationships.** Three edge types are
  built into the shape: Prerequisites = incoming edges (what this needs),
  Effect = outgoing edges (what this changes; cvar/command names in Effect
  are implicit references), See-also = peer edges (siblings / paired /
  mutually-exclusive / gated-by). The L3 concept note represents a
  subgraph-with-narrative across these nodes.

- **See-also discipline.** (i) Don't repeat what's already in Effect or
  Prerequisites -- the cvar/command name in those sections is itself an
  implicit reference. (ii) Cap at 4-5 most load-bearing peers; if more, the
  entity is begging for an L3 concept note. (iii) Order by relationship
  strength: pair > prereq > sibling > exclusive > concept. (iv) Use
  inline-parenthetical relationship hints (`tot (preset that bundles
  this)`) -- more scannable than tagged groups, more informative than plain
  lists.

- **Never insert `[X -- pending]` forward references into L1 prose.** Two
  failure modes: (i) the concept note never gets written -> perpetual TODO
  in production data; (ii) the note gets written but the L1 cards that
  point to it don't get updated. The skill MUST NOT emit forward
  references. Track planned concept notes in the findings file under
  "Follow-up work surfaced" instead.

- **Dispatcher entities need an "Effect describes state-set + consumer"
  pattern.** For entities like `mmode` that don't directly change game
  rules but instead set state (`*mm` userinfo) that another command
  (`ClientSay`) reads to dispatch behavior, the Effect section should
  describe the state set + name the consumer. Example: "Sets `*mm`
  userinfo to the chosen recipient-mode (player / team / multi / rcon /
  name / off). `ClientSay` reads `*mm` to route subsequent `say`
  messages." Don't conflate with regular setter entities. (Shape 6 in the
  KTX shape catalog.)

- **Canonical-card pattern for N-sibling fan-outs.** When N near-identical
  sibling entities exist (ksound1..6; hook_smooth / hook_fast /
  hook_classic / hook_crhook), centralize the description on ONE canonical
  card; the other N-1 cards are short reference cards that point at it.
  Layout in the `shape-catalog.md` Shape 7 fan-out section. Use only for
  *near-identical* siblings.

## Anti-patterns (never in L1 description)

- Engine / code jargon ("think handler", "cf_flags", "stuffcmd", "fpd bit
  64").
- File:line refs (`world.c:1442-1469`) in the prose.
- Code citation prose ("the function returns true at...", "the registration
  sets...").
- Source-trace synthesis ("MVDSV's spec-filter records into the MVD
  dem_multiple bitmask...").

All of those belong in `description_reasoning` (audit trail) OR in an L3
concept note. The L1 description is user-facing.

## How to apply v2 to a recast

- Identify the Layer B shape (see `shape-catalog.md`). The shape tells you
  which Layer A sections are populated and what they contain.
- Headliner: one sentence, plain QW terms.
- Effect: source-verified concrete behavior, action-level.
- Prerequisites: user-actionable / surprise-bearing only; cut logically-
  implied refusals.
- Permission + Match-state: from the registration's CF_* flag +
  match_in_progress check.
- Default: from `RegisterCvar` (cvars only).
- Example: pedagogically tuned, including optional knobs as
  `(Optional: ...)` annotations.
- See-also: 4-5 max, ordered by relationship strength, inline-parenthetical
  hints.
