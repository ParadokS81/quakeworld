# Game-mode concept-note section structure

**Reconciled to the experience-first model:** 2026-05-29. Anchored to KTX `1.47-2-g67253dc`. Proven on the four shipped notes (`4on4`, `ca`, `wipeout`, `killquad`). Supersedes the kind-driven section sets; see [[experience-group-classification]] for the reframe.

## Purpose

Defines the prose section skeleton for game-mode concept notes. The frontmatter (per [[concept-note-frontmatter-schema]]) carries structured facts; the body carries narrative in a predictable section order. The LLM oracle retrieves prose by section; a future wiki page projects from the same sections.

**There is ONE uniform structure for all 27 modes.** The earlier per-kind split (standalone 9 / mutation 6 / variant 4 sections) is retired: a player experiences a mode, not a mechanism, so every note — standalone, mutator, big or small — uses the same section order. What varies is which *conditional* sections carry real content, and whether a section leads with the mode itself or with its delta against a base game. The mechanism (`kind`) is a frontmatter fact, not a structural switch.

## The uniform structure

Fixed top-level order. **Core** sections ship in every note (content always real, never placeholder). **Conditional** sections appear only when there is real, verified content for them.

| # | Section | Core/conditional | Carries |
|---|---|---|---|
| 1 | `## Summary` | core | The hook + the complete short answer (2-4 sentences). |
| 2 | `## How it plays` | core | The whole experience, in prose. The mechanical heart. |
| 3 | `## Starting a game` | core | How a player starts/joins it — the console command + activation. |
| 4 | `## Strategy` | conditional | Player tactics — only with real, verified content. |
| 5 | `## Maps` | conditional | Map list + applicability — only for map-coupled modes. |
| 6 | `## History` | conditional | Origin/author/lineage — only when there's a real story. |
| 7 | `## Hosting & settings` | core | Admin block (last): activation bit + `server.cfg` snippet + the defining cvars. |
| 8 | `## See also` | core | Cross-references. |

This consolidates the old sets: the old `Lead` → `Summary`; `Rules` + `Sub-systems` + the mutation `What it does` all fold into `How it plays`; the old `How to play` + mutation `How to enable` (player half) → `Starting a game`; the old `Server setup` + `Configuration` merge into `Hosting & settings`.

### 1. `## Summary` (core)

2-4 sentences. A reader who reads only this gets a usable answer: the experience plus the central rule. Slightly longer than the `summary:` frontmatter; the rest of the note elaborates. Keep it tight — push detail down into `How it plays` (the killquad worked example: Summary is the "kill the carrier" hook, the seeding/30s detail lives below).

### 2. `## How it plays` (core)

The experience in prose — what the mode feels like to play, the defining mechanic, and why it plays the way it does. This is the longest core section for most modes and the substantive heart the oracle leans on.

- **Standalone modes** describe the mode directly (4on4's `deathmatch 1` → map-control game; ca's full-spawn no-items arena).
- **Match-modifiers and variant-like modes lead with the delta against the base game** — "In a normal game X; this changes it to Y." (killquad: "In a normal game the Quad spawns on a timer… KillQuad removes that and…"; wipeout leads with "Clan Arena with a respawn budget".)
- **Content-heavy modes use `###` subsections inside `How it plays`** as the pressure-release valve. CTF will need this — e.g. `### The grappling hook` and `### Runes`, each its own dedicated mechanic with its own cvar family and player-facing identity. This replaces the old top-level "Sub-systems" convention; the subsystems now live *within* How it plays rather than as sibling sections. Promote content to a `###` only when it's a distinct mechanic players talk about as its own thing with its own cvars/commands — otherwise keep it in the flowing prose.

### 3. `## Starting a game` (core)

How a player starts or joins the mode.

**This is the player's path in** -- it carries only what a player does: the console command or warmup toggle they type, a vote they cast, being on the right map, readying up. A `# server.cfg` block never appears here (a player does not edit server.cfg); server-side prerequisites get a one-line pointer ("needs the mode enabled / needs dmm4 -- see Hosting & settings"), not a re-explanation. Everything an admin does to make the mode available lives in `Hosting & settings`. (Actor-split: a step lives in the section matching who performs it; cross-reference, never duplicate.)

- **Take the activation command from the `cmds[]` table, not the slug.** `ca` activates via `/carena` — the lone slug≠command case in KTX (see [[experience-group-classification]]). Every other mode's command equals its slug, but verify rather than assume.
- Note the version requirement when relevant and what happens on activation (pre-match only; teams ready up; etc.).
- **For match-modifiers this is "enable, then play any base mode," not "start a match."** A player enables it with the warmup command (`/<name>`); the admin's `server.cfg` toggle (`k_<name> 1`) belongs in `Hosting & settings`, pointed to in one line here. Then start whatever base mode you want -- the modifier layers on top. (killquad's worked example is the template.)

### 4. `## Strategy` (conditional)

Player-facing tactics. Ship only when there's real, verified or curator-worthy content. Fold a single strategic implication into `How it plays` rather than spinning up a thin section (killquad: the hunt-the-carrier point sits in How it plays, no Strategy section).

### 5. `## Maps` (conditional)

Map list with applicability notes. Ship for genuinely map-coupled modes — 4on4's classic set (`dm3`/`dm2`/`e1m2`/…), wipeout's roster-graded arena maps, race's per-map routes, midair's airborne-friendly arenas. Omit for modes that play on standard maps without preference, and for modifiers (which inherit the base mode's maps). For map-heavy modes the per-roster suitability table from the wiki is a good shape (wipeout).

### 6. `## History` (conditional)

Origin, author, inspiration, mod lineage. Ship only when there's a real story to tell — not just an "introduced in 1.41" line (that belongs in the `introduced_in_version` frontmatter). ca has a History (the CACE-mod era → folded into KTX) but no Maps; 4on4 has History (KTPro → KTX, the leagues) and Maps; both are real.

### 7. `## Hosting & settings` (core — admin block, last)

Admin-facing, placed last so players read the experience first and admins jump here from the TOC. Absorbs the old `Server setup` + `Configuration`. **This is the only section that carries a `# server.cfg` block**, and it owns all server-side setup -- the enable cvar/bit, server prerequisites (dmm4, votecoop, a compatible map), and the defining cvars. Contents:

- **A concrete `# server.cfg` code block** showing the literal activation an admin types. Mandatory — do not replace with prose-only instructions. For standalones, show the `k_allowed_free_modes` bit context; for modifiers, the toggle cvar.

  ```
  # server.cfg -- the standard default; the 8 bit covers 4on4 / ca / wipeout
  set k_allowed_free_modes 4095
  ```

- **The defining cvars** — the 3-7 that shape the mode's character, as prose or a small bulleted list. Pick: **discriminators** (`k_clan_arena 2` for wipeout), **defining tunables** an admin might change (`k_clan_arena_rounds`, `k_clan_arena_max_respawns`), and **surprising values** vs the base mode (arena's `deathmatch 5`). Skip housekeeping cvars (`k_lockmin`, baseline `teamplay`, default `timelimit`) — the full init array is reachable via the `mode_default_init_array` frontmatter pointer (oracle resolves it through L1 MCP tools); the note curates the load-bearing subset and explains it.
- **Any admin-relevant interaction notes** — e.g. killquad's Berzerk-window interaction lives here.

Explain bit-sharing in prose where it applies (`UM_4ON4` value 8 shared by 4on4/ca/wipeout). `k_allowed_free_modes` defaults to `4095` (every standard mode) on a stock KTX/nquake server; it's set explicitly only to *restrict* — say so, so admins don't think they must enable each mode.

### 8. `## See also` (core)

Cross-references: related modes (with the `relation` tag from `related_modes`), key commands, related concept notes (`deathmatch-modes`, etc.). **Bit-sharing siblings go here in prose, not in `related_modes`** — ca/wipeout mention sharing 4on4's `UM_4ON4` bit in See-also prose while listing only the genuine gameplay sibling in `related_modes`.

## Section design principles

1. **Player-first ordering.** The common reader is a player or onlooker; they take precedence in page order. The admin block (`Hosting & settings`) sits at the bottom for the reader who jumps to it. Matches wiki convention (Wikipedia, Arch wiki, ezquake.com/docs).
2. **Core sections enforce a baseline.** Every note ships the five core sections (`Summary`, `How it plays`, `Starting a game`, `Hosting & settings`, `See also`) so cold readers know where to look — but their content is always real, never a placeholder heading.
3. **Section size follows content, not a template.** "Hosting & settings" for a simple modifier is a few lines; CTF's `How it plays` runs long with `###` subsections. Slots fill with what's real; don't pad, don't truncate.
4. **Conditional sections appear only when warranted.** No empty headings. No Maps section for a mode without map preferences; no History without a story; no Strategy without verified tactics. Absent, not empty.
5. **Mechanical accuracy, reader-facing voice.** The substance is source-verified facts (cvars, loadouts, timings), but presented as confident expert prose — not an audit log. Source-line citations live in the commit body, not the prose (quote a source line in-prose only when the line itself is the evidence). Match the `weapon-scripts.md` voice bar.

## Section ordering — canonical position

```
Summary | How it plays (+ optional ### subsections) | Starting a game | (Strategy) | (Maps) | (History) | Hosting & settings | See also
```

Sections in parentheses are **conditional** — they appear in this position *if* they have real content, and are omitted entirely otherwise. The order tells you WHERE a section goes IF you have one; it never requires a stub. The four shipped notes demonstrate the spread: 4on4 (Maps, no Strategy, has History), ca (History, no Maps), wipeout (both Maps and History), killquad (neither — a lean modifier: Summary / How it plays / Starting a game / Hosting & settings / See also).

## Section length

**Length follows content, not a target.** There is no word-count band (the old per-kind bands are retired). A section is the right length when removing more would lose substance and adding more would pad. A lean modifier note may be ~400 words; CTF may run to several thousand. Both are correct when the content is real.

Two failure modes to avoid:

- **Padding** — explaining the obvious, enumerating cvars the L1 pointer already covers, restating the Summary later, hypothetical examples that don't reflect real play.
- **Skipping substance** — omitting a key rule, dropping the `server.cfg` snippet, glossing an interlock or surprising value because "the section is getting long."

## Anti-patterns

Content that does NOT belong in a given section:

| Section | Anti-pattern |
|---|---|
| Summary | Cvar names, source-file references, detailed rules. (Save for How it plays / Hosting & settings.) |
| How it plays | Admin setup details / `server.cfg` snippets. (Save for Hosting & settings.) |
| Starting a game | The full ruleset. (Just activation — the rules are How it plays.) |
| Strategy | Mechanical rule statements. (Those are How it plays.) |
| Hosting & settings | Player-facing "how do I start it." (That's Starting a game.) Citation-dense audit prose. |
| See also | Bit-sharing as a `related_modes` entry. (Bit-sharing is See-also prose; `related_modes` is gameplay relations.) |

When tempted to violate one, the fix is usually to extend `How it plays` or `Hosting & settings` rather than mix reader paths.

## Exemplars

Calibrate against the shipped notes at `apps/qw-oracle/curated/concept-notes/`:

- **`4on4.md`** — primary standard-game exemplar (Maps + History, no Strategy).
- **`ca.md`** — arena standalone (History, no Maps).
- **`wipeout.md`** — arena, variant-like: leads `How it plays` with the delta vs ca and leans on ca for shared mechanics.
- **`killquad.md`** — match-modifier: the lean shape, delta-led, `Starting a game` = enable-then-play, no conditional sections.

Avoid the `_backup-pre-methodology-v2/` copies — they use the retired kind-driven sections (`## Lead` / `## What it does` / `## How to enable` / `## Configuration`).

## Open questions

1. **Map-coupled modes (race / midair).** The `Maps` section for these may be denser than elsewhere (per-map route lists for race; tested-airborne maps for midair). May warrant a sub-shape convention; defer until race/midair drafting surfaces real friction.
2. **CTF `How it plays` `###` depth.** CTF is the first mode that will need multiple `###` subsections (grappling hook, runes). Confirm the within-section subsection convention holds up at CTF's scale during its drafting; if the section gets unwieldy, reconsider whether a mechanic earns a top-level section after all.

(Resolved by the reconciliation: the per-kind section sets, the per-kind length bands, and the auto-projected Configuration table are all retired in favor of the uniform structure + content-driven length + curated-cvars-in-Hosting above.)
