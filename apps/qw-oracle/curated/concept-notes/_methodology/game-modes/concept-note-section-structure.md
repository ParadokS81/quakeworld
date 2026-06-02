# Game-mode concept-note section structure

**Reconciled to the experience-first model:** 2026-05-29; refined to the audience-split structure 2026-05-31; modifier shape + structured-settings refinement 2026-06-01. Anchored to KTX `1.47-2-g67253dc`. Proven on the v2 exemplars (`ctf` + `4on4` standalone, `berzerk` modifier); the earlier notes (`ca`, `wipeout`, `killquad`, and `4on4`'s first cut) used the superseded v1 section set and are pending migration. Supersedes the kind-driven section sets; see [[experience-group-classification]] for the experience-first reframe.

## Purpose

Defines the prose section skeleton for game-mode concept notes. The frontmatter (per [[concept-note-frontmatter-schema]]) carries structured facts; the body carries narrative in a predictable section order. The LLM oracle retrieves prose by section; a future wiki page projects from the same sections.

**There is ONE uniform structure for all 27 modes.** The earlier per-kind split (standalone 9 / mutation 6 / variant 4 sections) is retired: a player experiences a mode, not a mechanism, so every note — standalone, mutator, big or small — uses the same section order. What varies is which *conditional* sections carry real content, and whether a section leads with the mode itself or with its delta against a base game. The mechanism (`kind`) is a frontmatter fact, not a structural switch.

## The uniform structure

Fixed top-level order. **Core** sections ship in every note (content always real, never placeholder). **Conditional** sections appear only when there is real, verified content for them.

| # | Section | Core/conditional | Carries |
|---|---|---|---|
| 1 | `## Summary` | core | The hook + objective + a bare command teaser. The complete short answer (2-4 sentences). |
| 2 | `## Activate` | core | The console command(s) only — how a player turns the mode on. |
| 3 | `## Basic ruleset` | core / cond | The enforced defaults the mode locks in, scannable. **Body-complete.** Core for standalones; conditional for modifiers (omit when the single delta is already in `Summary`). |
| 4 | `## Settings to tune` | conditional | The **player** commands the mode unlocks beyond the locked ruleset — in-game console commands any player can type. Omit when it has none. |
| 5 | `## How it plays` | core | The whole experience, in prose. The mechanical heart — Strategy folds in here. |
| 6 | `## Maps` | conditional | Map list + applicability — only for map-coupled modes. |
| 7 | `## History` | conditional | Origin / author / lineage — only when there's a real story. |
| 8 | `## Hosting & settings` | core | Admin block (last): availability + the server-side cvars worth editing for this mode + its hosting wrinkle. |
| 9 | `## See also` | core | Cross-references. |

This refines the v1 set proven 2026-05-29 (`Summary` / `How it plays` / `Starting a game` / `Strategy` / `Maps` / `History` / `Hosting & settings` / `See also`). Three changes came out of the `ctf` + `4on4` restructure:

1. **`Starting a game` → `Activate`, moved up to position 2** and narrowed to *just the command(s)*. A reader's first two questions are "what is it" (`Summary`) and "how do I turn it on" (`Activate`); the rules and the experience follow.
2. **The mode's settings split by audience and access.** The v1 "defining cvars (3-7)" bullet lived inside `Hosting & settings` and mixed enforced presets with tunable knobs, deferring the remainder to an L1 pointer that does not resolve. v2 splits them by *who can reach the setting*: **`Basic ruleset`** = the enforced defaults the mode locks (body-complete, listed once); **`Settings to tune`** = the *player* commands a mode unlocks (in-game, conditional); **`Hosting & settings`** = the *admin* surface (availability + the `server.cfg` cvars worth editing). The access test decides the split: a player typing a console command → `Settings to tune`; a setting that needs `server.cfg`/rcon → `Hosting & settings`.
3. **`Strategy` folds into `How it plays`.** A standalone Strategy section invited thin tactics; the experience, objective, and strategy now live in one prose section, with a distinct named mechanic promoted to a `###` subsection only when it earns it.

### 1. `## Summary` (core)

2-4 sentences. A reader who reads only this gets a usable answer: the experience, the central rule, and a *bare* command teaser (`/4on4`) — the name of the command, not the procedure. **No cvar names** (save them for `Basic ruleset` / `Settings to tune`) and **no activation steps** (those are `Activate`). Slightly longer than the `summary:` frontmatter; the rest of the note elaborates. (Kept as `## Summary` per the concept-notes convention — no body H1.)

### 2. `## Activate` (core)

The command(s) a player types to turn the mode on, and nothing more — `/ctf`, `/4on4`, optionally the match-tag form (`ctf EQL`).

- **Take the activation command from the `cmds[]` table, not the slug.** `ca` activates via `/carena` — the lone slug≠command case in KTX (see [[experience-group-classification]]). Every other mode's command equals its slug, but verify rather than assume.
- **Deep activation mechanics live in `server-setup`, not here.** The full pre-match gate (`is_rules_change_allowed`) and the ready-up machinery are the same for every mode -- the exhaustive version lives in `server-setup`. A note's `Activate` carries the command, its match-tag form, any per-mode refusal, and -- fine -- a *one-line* practical ready-up mention (both players `ready` to start the countdown). A brief practical line is not bloat; a paragraph re-explaining the universal flow is.
- **For cvar-toggle modes this is "get into the base, then toggle," not "start a match."** The player enables it with the warmup command (`/<name>`) on the required base mode — `/dmm4` then `/midair`, `/1on1` then `/arena`. There is **no** admin `server.cfg` step to point to: these toggle cvars are reset on every mode change (`common_um_init`), so the command is the only activation — never tell the reader to "set `k_<name> 1` in server.cfg."

### 3. `## Basic ruleset` (core for standalones; conditional for modifiers)

The enforced defaults the mode locks in when it activates — the fixed preset, listed scannably so a reader sees the shape of the game at a glance. Each enforced value (the `deathmatch` flag, `teamplay`, `timelimit`, `maxclients`, the mode's signature locks) appears **once**, here; its *effect or feel* goes to `How it plays`.

- **Body-complete — never defer to the L1 pointer.** The `mode_default_init_array` frontmatter pointer (`ctf_um_init`, `_4on4_um_init`) has **no MCP resolver today** (verified: zero code consumers), so a reader cannot follow it to the settings. Write the key enforced values into this section in full; do not write "see the init array" or lean on the pointer to carry the ruleset.
- **Enforced, not tunable.** This section is what the mode *fixes*; what a *player* can change goes to `Settings to tune`, and the server cvars an *admin* edits go to `Hosting & settings`. A value that is both surprising and locked (CTF's `deathmatch 3`, arena's `deathmatch 5`) belongs here, with its rationale deferred to `How it plays`.
- **Curate the defining values, not the whole array.** The 5-8 enforced values that characterise the mode, not every housekeeping cvar (`k_lockmin`, baseline timers). The pointer stays in frontmatter as latent metadata for a future resolver; this section is the source of truth until one exists.
- **Conditional for modifiers (resolved 2026-06-01 on `berzerk`).** A match-modifier carries `Basic ruleset` only when it locks **several distinct changes** worth listing scannably (killquad: no map quad / one-at-a-time / drop-on-death / fresh-30s / powerups-forced-on). When the whole delta is a **single rule already stated in `Summary`**, omit the section — repeating it just duplicates the Summary (berzerk's "quad for everyone in the closing window" *is* the entire ruleset, so berzerk has no `Basic ruleset`). Standalone modes always carry it (their preset is always multi-valued).

### 4. `## Settings to tune` (conditional)

The **player** commands a mode unlocks beyond its locked ruleset — the in-game console commands any player can type during a game, each with what it does. **This section is for the player, not the admin.** **Omit it entirely when the mode unlocks no player commands of its own** (4on4 applies a fixed competitive preset with no extra player toggles → no section).

- **The access test decides which home.** If a player changes it by typing a console command, it lives here; if it needs `server.cfg` or rcon, it is an admin setting and lives in `Hosting & settings`. The "gamehost" trap: typing `/4on4` or `/dmm4` does not make a player a host — they are still a player, and these are the commands available to them.
- **The player command, not the cvar behind it.** Where an in-game command and a server cvar are two faces of one setting, the *command* lives here and the *cvar* lives in `Hosting & settings`. dmm4's `no_lg` / `no_gl` live here — aliases for `noweapon lg` / `noweapon gl`, and the general `noweapon <weapon>` can ban any weapon (worth naming the option even though lg and gl are what players actually disable). The `k_disallow_weapons` cvar an admin sets in `server.cfg` lives in Hosting.
- **Unlocked, not enforced; command, not feel.** What a command *does* lives here; the locked defaults live in `Basic ruleset`; how it *feels in play* lives in `How it plays`.
- **Render as a structured list, not prose.** One line per command — name then what it does — so the reader sees the menu, not a story (same shape as `Basic ruleset` and the Hosting cvar list).

### 5. `## How it plays` (core)

The experience in prose — what the mode feels like to play, the defining mechanic, the objective, the strategy, and why it plays the way it does. The v1 `Strategy` section folds in here. This is the longest core section for most modes and the substantive heart the oracle leans on.

- **Ground it in the local wiki rip, not inherited prose.** Inherited gameplay prose can be subtly or flatly wrong — 4on4's original "weapon denial" framing was wrong (dmm1 weapons respawn on a ~30s timer; the real game is armour control, powerup running, item timing, and reporting). Consult the mode's wiki page plus `Deathmatch.json` / `Teamplay_Guide.json` under `data/wiki-snapshots/2026-05-04/` before writing. **Restructuring an existing note is not a license to trust its prose** — re-verify each claim as you reshape it (berzerk's inherited "spectator-friendly free-for-all" was wrong: frags still count in a team base mode, so it's a blood-frenzy, not an FFA).
- **Standalone modes** describe the mode directly (4on4's `deathmatch 1` → a map-control game).
- **Match-modifiers and variant-like modes lead with the delta against the base game** — "In a normal game X; this changes it to Y."
- **Content-heavy modes use `###` subsections** as the pressure-release valve. Promote a mechanic to a `###` only when it's a distinct thing players talk about as its own, with its own cvar family and identity — CTF's `### The grappling hook` and `### Runes`. (Proven at CTF's scale; this resolves the v1 open question about within-section subsection depth.) Otherwise keep it in flowing prose.

### 6. `## Maps` (conditional)

Map list with applicability notes. Ship for genuinely map-coupled modes — 4on4's classic pool, CTF's dedicated vs adapted sets, wipeout's roster-graded arenas, race's per-map routes. Omit for modes that play on standard maps without preference, and for modifiers (which inherit the base mode's maps).

- **Community-tiered and structured.** Group by category and name the scene's tiers as the wiki frames them — 4on4's "TB3 / the big three" core vs the wider "Kenya" pool; CTF's dedicated Threewave set vs adapted episode maps vs modern competitive. Keep it parseable for future automation.
- **Format (provisional):** comma-separated lists under bolded category labels, as `ctf` + `4on4` ship it. Whether to move to one-per-row or a per-roster suitability table is an open operator decision at fan-out (see Open questions); follow the exemplars until it's locked.

### 7. `## History` (conditional)

Origin, author, inspiration, mod lineage. Ship only when there's a real story — not an "introduced in 1.41" line (that belongs in `introduced_in_version` frontmatter). CTF has a rich one (Zoid's Threewave → PureCTF → KTX, the 2022 revival); 4on4 has KTPro → KTX and the leagues. A lean modifier may have none.

### 8. `## Hosting & settings` (core — admin block, last)

Admin-facing, placed last so players read the experience first. This is the home for everything that needs **server-side access** — `server.cfg` or rcon — which a player cannot reach. It answers two admin questions: *is this mode available, and which server-side settings shape it?*

- **Availability -- the practical restrict-line, not bitmask prose.** On a stock server every mode is already reachable (`k_allowed_free_modes` defaults to `4095`). So availability is one line plus the *practical* code block for pinning a single-mode server:
  ```
  set k_defmode <mode>              // boot into it
  set k_allowed_free_modes <bit>    // allow nothing else  (default 4095 = all modes)
  ```
  Give the mode's bit value (1on1 `1`, 2on2 `2`, 3on3 `4`, 4on4 `8`, ...) and any bit-sharing caveat as a half-clause (4on4/ca/wipeout share bit `8`; CTF owns `64` alone). **Do not** narrate the bitmask mechanics, the `4095`-from-config nuance, or the read-at-map-load caveat -- those live once in `server-setup`, and the per-note line just points there.
- **The server-side cvars worth editing for this mode.** The mode's `k_<name>` config cvars an admin sets in `server.cfg` — the admin counterpart to the player commands in `Settings to tune` (CTF's `set k_ctf_hook 1` / `set k_ctf_runes 1` to turn the hook and rune families on; dmm4's `set k_disallow_weapons <mask>`). Curate the mode-relevant ones, not housekeeping. A **config cvar** that shapes an already-running mode (sticks in `server.cfg`) is different from a **mode-activation toggle** (`k_midair`, reset by `common_um_init`): config cvars belong here; **never tell a reader to "set `k_<name> 1`" to *enable a mode*** — that does not stick, and the command in `Activate` is the only activation. **Render the cvars as a structured list:** one line each — name, default/range (or, for an enum, each value's meaning), one-line effect — names from L1, but for KTX `k_*` cvars the values come from the source at the L1 `source_ref` (L1 carries no help text for them), not narrated in a paragraph with the values buried in it.
- **This mode's hosting wrinkle, if any.** A genuine prerequisite; the per-usermode `configs/usermodes/<mode>/*.cfg` exec hook; a real constraint (CTF cannot run with bots). For a **gimmick toggle** (berzerk, yawnmode) **omit the always-on / dedicated-server path entirely** — nobody runs a permanent berzerk server, and surfacing it just hands a newbie a bad default. **Never restate gameplay rules here**, not even to call them "hardcoded" (killquad's one-quad / ten-second rules live in `How it plays`, not repeated in Hosting to note they aren't tunable). **Never the enforced-defaults list** (`Basic ruleset`) **and never the player commands** (`Settings to tune`).

The deep hosting model — `k_defmode`, the full `k_allowed_free_modes` bitmask mechanics, the force-a-dedicated-server path — lives once in **server-setup** and is never repeated per mode.

### 9. `## See also` (core)

Cross-references: related modes (with the `relation` tag from `related_modes`), key commands, related concept notes (`deathmatch-modes`, `server-setup`). **Bit-sharing siblings go here in prose, not in `related_modes`** — ca/wipeout mention sharing 4on4's `UM_4ON4` bit in See-also prose while listing only the genuine gameplay sibling in `related_modes`. **Keep entries terse** — a cross-ref and a few words, not a gameplay summary; the related mode has its own note, so don't re-explain it here.

## Section design principles

1. **Player-first ordering.** The common reader is a player or onlooker, so the note front-loads the quick reference they want — what it is, how to start it, the rules it locks, the dials it offers — then the long-form experience, with the admin block (`Hosting & settings`) last for the reader who jumps to it. Matches wiki convention (Wikipedia, Arch wiki, ezquake.com/docs).
2. **Core sections enforce a baseline.** Every note ships the core sections (`Summary`, `Activate`, `How it plays`, `Hosting & settings`, `See also`) so cold readers know where to look — content always real, never a placeholder heading. `Basic ruleset` is core for standalones but conditional for modifiers (a one-rule modifier omits it).
3. **Section size follows content, not a template.** `Hosting & settings` for a simple modifier is a couple of lines; CTF's `How it plays` runs long with `###` subsections. Slots fill with what's real; don't pad, don't truncate.
4. **Conditional sections appear only when warranted.** No empty headings: no `Settings to tune` for a mode with no tunables of its own, no `Maps` for a mode without map preferences, no `History` without a story. Absent, not empty.
5. **Mechanical accuracy, reader-facing voice.** The substance is source-verified facts (cvars, loadouts, timings) and wiki-grounded gameplay, presented as confident expert prose — not an audit log. Source-line citations live in the commit body, not the prose (quote a source line in-prose only when the line itself is the evidence). Match the `weapon-scripts.md` voice bar.
6. **One fact, one home; no audience whiplash.** Each fact appears in exactly one section. The player sections (`Summary` / `Basic ruleset` / `How it plays`) carry gameplay; the admin section (`Hosting & settings`) carries server-side setup and never reaches back into gameplay; `See also` is cross-refs, not summaries. A reader moves player-first → admin once, not bouncing between audiences.
7. **Describe this mode, not the others.** A note explains *its own* mode; comparisons that explain how a *different* mode works are noise that drown the subject ("if I want 4on4 I'll read 4on4"). A one-clause distinctive contrast is fine ("weapons stay, unlike the larger rosters"); a sentence re-explaining another mode's economy is not. Cross-references belong in `See also`, terse -- a pointer and a few words, never a re-explanation.

## Section ordering — canonical position

```
Summary | Activate | Basic ruleset | (Settings to tune) | How it plays (+ optional ### subsections) | (Maps) | (History) | Hosting & settings | See also
```

Sections in parentheses are **conditional** — they appear in this position *if* they have real content, and are omitted entirely otherwise. The order tells you WHERE a section goes IF you have one; it never requires a stub. The two v2 exemplars demonstrate the spread: `ctf` carries all three conditional sections (a rich `Settings to tune`, tiered `Maps`, a deep `History`); `4on4` omits `Settings to tune` (its preset isn't tuned per match) and keeps `Maps` + `History`.

## Section length

**Length follows content, not a target.** There is no word-count band (the old per-kind bands are retired). A section is the right length when removing more would lose substance and adding more would pad. A lean modifier note may be ~400 words; CTF runs to several thousand. Both are correct when the content is real.

Two failure modes to avoid:

- **Padding** — explaining the obvious, enumerating every housekeeping cvar in the init array (curate the defining ones into `Basic ruleset`), restating the Summary later, hypothetical examples that don't reflect real play.
- **Skipping substance** — omitting a key enforced value from `Basic ruleset`, dropping a real `Settings to tune` knob, glossing an interlock or surprising value because "the section is getting long."

## Anti-patterns

Content that does NOT belong in a given section:

| Section | Anti-pattern |
|---|---|
| Summary | Cvar names, source-file references, full activation steps, detailed rules. (Save for `Activate` / `Basic ruleset` / `Settings to tune` / `How it plays`.) |
| Activate | The ruleset, or a `server.cfg` step for a toggle mode. (Just the command; the rules are `Basic ruleset` + `How it plays`.) |
| Basic ruleset | Deferring enforced values to the `mode_default_init_array` pointer (it has no resolver). Tunable knobs (those are `Settings to tune`). Effect/feel prose (that's `How it plays`). |
| Settings to tune | Server-side cvars set via `server.cfg`/rcon — players can't change those (they are `Hosting & settings`). Enforced/locked values (those are `Basic ruleset`). Effect/feel prose (that is `How it plays`). |
| How it plays | Admin setup details / `server.cfg` snippets (`Hosting & settings`). Inherited gameplay prose not checked against the wiki rip. |
| Maps | An unstructured dump. (Keep it tiered and parseable.) |
| Hosting & settings | The enforced-defaults list (`Basic ruleset`). Player console commands (those are `Settings to tune`). Player-facing "how do I start it" (`Activate`). "Set `k_<name> 1` to enable" a toggle *mode* (`Activate`'s command is the only activation — though config cvars that shape a *running* mode do belong here). Citation-dense audit prose. |
| See also | Bit-sharing as a `related_modes` entry. (Bit-sharing is See-also prose; `related_modes` is gameplay relations.) |

When tempted to violate one, the fix is usually to extend `How it plays` or to move the line to its rightful section rather than mix reader paths.

## Exemplars

Calibrate against the v2 exemplar notes at `apps/qw-oracle/curated/concept-notes/`:

- **`ctf.md`** — the rich standalone and the player/admin split in action: player toggles (`nohook` / `norunes` / `noga` / `mctf` + hook-style votes) under `Settings to tune`, the `k_ctf_*` server cvars as a structured list (including the `k_ctf_hookstyle` enum) under `Hosting & settings`, plus tiered `Maps`, a deep `History`, and `###` subsections inside `How it plays` for the grappling hook and runes. The calibration point for content-heavy modes.
- **`4on4.md`** — the lean standalone: a fixed competitive preset (no `Settings to tune`), `Maps` + `History`, and a `How it plays` grounded in the wiki rip (armour and powerup control, not "weapon denial").
- **`berzerk.md`** — the lean modifier: a single-rule delta, so **no `Basic ruleset`** (the rule is the Summary), a one-paragraph `How it plays`, and a `Hosting & settings` that is just the structured `k_btime` line. The calibration point for match-modifiers.

The notes still on the **v1 section set** are pending migration; don't calibrate against them yet. (`killquad` is already on the v2 structure but predates the 2026-06-01 de-dup rules — its `Hosting & settings` restates gameplay — so touch it up alongside ctf.) Avoid the `_backup-pre-methodology-v2/` copies entirely (retired kind-driven sections: `## Lead` / `## What it does` / `## How to enable` / `## Configuration`).

## Open questions

1. **Maps format.** comma-by-category-with-tiers (what `ctf` + `4on4` ship) vs one-per-row vs a per-roster suitability table. An operator decision at fan-out planning; follow the exemplars until it's locked.
2. **Mutator `Basic ruleset` / `Settings to tune`** — *resolved 2026-06-01 on `berzerk`.* `Basic ruleset` is conditional for modifiers: keep it for a multi-rule delta (killquad), omit it for a single-rule delta already in `Summary` (berzerk). A modifier carries `Settings to tune` only if it unlocks a player command of its own (berzerk/killquad don't).
3. **`server-setup` completeness (prerequisite for fan-out).** Per-mode `Hosting & settings` defers the universal mechanics to `server-setup`, but it's a WIP draft; deferral drops facts it doesn't yet hold (the `k_allowed_free_modes` read-at-map-load → restart caveat, the universal pre-match gate). Complete `server-setup` before fanning out.

4. **Re-check the two v2 exemplars against the access split** — *resolved 2026-06-01.* 4on4 had no `Settings to tune` (unaffected); ctf's hook/rune server cvars moved to `Hosting & settings` as a structured list (and the `k_ctf_hookstyle` enum was corrected from the note's `1 classic / 3 smooth` to the source's `1` smooth / `2` fast / `3` classic / `4` crhook), leaving the player toggles (`nohook` / `norunes` / `noga` / `mctf` + the hook-style votes) under `Settings to tune`.

(Resolved by the v2 refinement: the v1 CTF `###`-depth question — it held at CTF's scale. The per-kind section sets, per-kind length bands, and the auto-projected Configuration table — retired earlier, not revived.)
