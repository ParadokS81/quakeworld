---
name: game-mode-curate
description: Use this skill to investigate one KTX game-mode entry (gameplay_mechanics rows with kind='game_mode') and produce a Layer 3 concept note at apps/qw-oracle/curated/concept-notes/<slug>.md. Triggers on "/game-mode-curate <slug>", "curate game mode <name>", "draft concept note for <mode>", "next game-mode slice", or per-mode sub-agent dispatch from a fan-out orchestrator. One mode per invocation. Walks pre-flight (load L1) / wiki-check / research-check / source-verify / triage / draft / commit. Sonnet 4.6 high reasoning (locked) -- matches ktx-l1-rewrite per-card discipline. HALTS on classification mismatch (mode source signals contradict the methodology classification) or L1-GAP (gameplay_mechanics row missing) rather than guessing. Engine-scoped to KTX; future MVDSV/QWFWD variants fork the skill if those projects acquire distinct game-mode concepts.
---

# game-mode-curate

Author one KTX game-mode concept note from L1 + wiki snapshot + KTX source. One slug per invocation. Designed for sub-agent fan-out across the 27-mode corpus.

## Scope

- **Input**: one game-mode slug, matching `gameplay_mechanics.name` strictly (so `ca` not `clan-arena`, `tot` not `tribe-of-tjernobyl`, `1on1` as-is)
- **Output**: one concept-note `.md` file at `apps/qw-oracle/curated/concept-notes/<slug>.md` (flat layout; loader is non-recursive per the methodology doc's open Q5)
- **Engine**: KTX only. MVDSV / QWFWD variants fork the skill if those projects acquire game-mode concepts.

NOT in scope:
- Family-aggregator pages (XonX umbrella, etc.) -- deferred to v2
- Modifying the methodology docs (surface findings; orchestrator backports)
- Drafting multiple modes in one invocation

## Methodology contract (read all four BEFORE drafting)

The model is **experience-first**: one uniform note structure for all 27 modes; the engine mechanism (`kind`) is frontmatter metadata, not a structural switch. All docs at `apps/qw-oracle/curated/concept-notes/_methodology/game-modes/`:

1. **`experience-group-classification.md`** -- THE heart. The 10 experience groups over the 27 modes (the `experience_group` axis) + the appendix assigning all 27 + the command-table triage (dmm4 / Rocket Arena are played modes outside the 27; practice/freeze/rpickup are non-modes) + the `kind` = L1 `mode_class` two-bucket (standalone | mutator) as metadata + the mutation-interlocks authoring check (with the killquad/berzerk coexist correction). Replaces the retired `mode-vs-mutation-classification.md`.

2. **`concept-note-frontmatter-schema.md`** -- one uniform field set for all 27 (no kind-specific layers). `experience_group` is the primary axis; `kind` is L1 `mode_class` metadata. Queryable gameplay facts (`deathmatch_flag` / `roster` / `loadout` / `objective` / `mode_default_init_array`) use absent-not-empty: standalones carry them, modifiers omit them (inherit the base). Namespace split (`related_entities` = cvar/command entities-table refs ONLY; `related_modes` = game-mode cross-refs). Relation enum: `similar-shape` (primary, same experience_group) / `similar-loadout` / `derived-from` / `incompatible-with` (source-verified toggle exclusions ONLY -- killquad/berzerk are NOT incompatible). Bit-sharing is See-also prose, not a relation. `mode_default_init_array` is the load-bearing L1 pointer.

3. **`concept-note-section-structure.md`** -- the ONE uniform structure + the **per-section contract** (what each section holds, what it must NOT hold, how it's formatted). Order: `Summary` / `Activate` / `Basic ruleset` / (`Settings to tune`) / `How it plays` / (`Maps`) / (`History`) / `Hosting & settings` / `See also`. Core vs conditional (absent-not-empty). Load-bearing format rules: `Basic ruleset` is **cvar-led, one per line** (behavioral-rule modes use bold prose labels); `Hosting & settings` is **show-and-tell** (availability line -> code block -> cvar list -> wrinkle, never a prose blob); activation lives **only** in `Activate` (never restated in `Summary`/`Hosting`, never "how NOT to start"). De-dup is **cross-section** -- each bucket has one job; describe the mode once, spread across buckets. Length follows content -- no word-count bands. **This doc is the authority: apply its contract directly; do not draft from a section list memorized in this skill (that is how the skill went stale).**

4. **`triage-rules.md`** -- wiki content scoring (length / mechanical accuracy / substance type) + decision tree + applied triage per mode + default-to-hybrid on boundary. (Orthogonal to the experience-first reframe -- the scoring rubric is unchanged.)

**Voice reference (mandatory read before drafting)**:

- `apps/qw-oracle/curated/concept-notes/weapon-scripts.md` -- not a game-mode note (it's a cross-engine guide), but the L3 concept-note voice exemplar. Confident declarative prose, source-line citations only when load-bearing (quoting a source comment that IS the evidence), community vernacular when it earns its place ("walking backpack"), length driven by content, code blocks for canonical forms (not citation-decoration). The body reads like an expert wrote it for a wiki. Match this voice.

**Game-mode shape reference (read the one matching your mode before drafting)**:

The full v2 corpus at `apps/qw-oracle/curated/concept-notes/` is calibration-ready (only `rocket-arena` is still v1 -- skip it). Canonical exemplars per the structure doc:

- **`ctf.md`** -- the rich standalone: player/admin split, tiered `Maps`, deep `History`, `###` subsections in `How it plays`. Calibration point for content-heavy modes.
- **`4on4.md`** -- the lean standalone: fixed competitive preset (no `Settings to tune`), `Maps` + `History`, wiki-grounded `How it plays`.
- **`berzerk.md`** -- the lean modifier: single-rule delta so **no `Basic ruleset`**, one-paragraph `How it plays`, a `Hosting & settings` that is just the structured `k_btime` line. Calibration point for match-modifiers.
- Also good: **`race.md`** (rich standalone + `Settings to tune`), **`midair.md`** (mutator + show-and-tell `Hosting`), **`bloodfest.md`** / **`tot.md`** (solo-pve, per-map configs).

Avoid the backup at `_backup-pre-methodology-v2/` (retired kind-driven sections). `killquad` is on v2 but pending a de-dup touch-up -- don't calibrate its `Hosting` (it restates gameplay).

## 7-step workflow

### 1. Pre-flight (load L1, classify kind)

```sql
-- A. Mode entity exists?
SELECT name, source_ref, props_json
FROM gameplay_mechanics
WHERE kind='game_mode' AND name='<slug>';
-- empty? HALT (L1-GAP -- mode not in extractor output; operator decides if this is wrong slug or extractor gap)

-- B. Activation-side L1 entry
SELECT name, description, source_ref
FROM entities
WHERE project='ktx' AND name_fold=lower('<slug>');
-- for standalones: the command entity (e.g., ktx:command:carena -- take the command from the cmds[] table, NOT the slug; ca's command is carena)
-- for mutators: usually empty here (the cvar is named differently, e.g., k_killquad -- search separately)

-- C. For standalones (incl. roster modes): the init array's mode_default rows
SELECT name, value_text, source_ref, notes
FROM gameplay_mechanics
WHERE kind='mode_default'
  AND props_json->>'initstring_array' = '<init_array_name>'
ORDER BY name;
-- init array names per the appendix in experience-group-classification.md / the mode_cmd[] table: _4on4_um_init / carena_um_init / wipeout_um_init / tot_um_init / ctf_um_init / etc.

-- D. For a variant-like mode that leads with a delta vs a sibling (e.g. wipeout vs ca): ALSO load the sibling's init array to compute the delta
SELECT name, value_text, source_ref
FROM gameplay_mechanics
WHERE kind='mode_default'
  AND props_json->>'initstring_array' = '<family_head_init_array>'
ORDER BY name;
```

Determine the mode's `experience_group` + `kind` per the appendix in [[experience-group-classification]]. **If your source-verification disagrees with the doc, HALT** -- do not silently re-classify. The doc's verdicts are HIGH confidence from source signals; a contradiction means either the doc is wrong (methodology backport) or the L1 has drifted.

### 2. Wiki check

Read `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/<slug>.json` AND known aliases. Common aliases:

| Slug | Wiki page filename |
|---|---|
| `ca` | `Clan_Arena.json` |
| `ctf` | `Capture_the_Flag.json` |
| `ffa` | `Free_For_All.json` |
| `tot` | `ToT_Mode.json` |
| `lgc` | `LGC.json` |
| `wipeout` | `Wipeout.json` |
| (others) | match the slug case-insensitively |

For modes with multi-page coverage (especially CTF, which has 9+ related pages including map pages CTF2M1/CTF5/CTF8 and competition pages CTF_Showdown_*): treat the gameplay overview page as primary; satellite pages contribute to Maps / History sections.

Score per `triage-rules.md`: length band + mechanical accuracy + substance type. Default to `hybrid` on a boundary.

### 3. Research check

`research/repos/` carries author repos + commit history:

- `research/repos/dusty-ktx/` -- Dusty's KTX fork; load-bearing for wipeout's history
- `research/repos/ktx/` -- main KTX repo; `git log --grep="<mode>"` surfaces chronological evolution + PR numbers + design intent in commit messages
- `research/repos/dusty-mvdsv/`, `research/repos/ezquake-docs/` -- secondary

Most useful for the History section of substantial standalones. For mutators and roster modes, often nothing surfaces -- record "no research-folder material found" and move on.

### 4. Source verify

Read the KTX source at the mode's source_ref. Verify:

- **For standalones (incl. roster modes)**: mode_default rows match what the init array actually sets. If the `_um_init` array is in `commands.c` (line numbers per the appendix in [[experience-group-classification]]), read the C source at that line. Compare against the `mode_default` rows from pre-flight step 1C. If they diverge, that's an L1 extractor gap -- flag for operator.

- **For mutators**: grep for `!k_<other>` / `&& !k_<other>` guards in the use-site code paths. A guard is a *candidate* interlock -- but VERIFY what it gates before marking `incompatible-with`; a gate is not always a mutual-exclusion. Confirmed mutual-exclusions (symmetric toggle guards): midair <-> lgc, lgc <-> instagib (`commands.c` toggle paths). NOT an interlock: killquad <-> berzerk -- the `!k_berzerk` gate at `items.c:1974` is window-scoped (`k_berzerk` is 0 until the final Berzerk window, `match.c:1265`/`:700`), so they coexist; mark them `similar-shape` with the interaction in prose. Full interlocks table in [[experience-group-classification]]. Audit candidates: `freshteams`/`nosweep`, `bloodfest`/various, `midair`/`instagib`.

- **UM bit verification (standalones)**: read `include/g_local.h:693-704` for the bit definitions. Find your mode's UM bit from the `mode_cmd[]` table (`commands.c:4537+`). Determine the bit-sharing group. The `Hosting & settings` prose MUST name the actual shared bit AND list siblings that share it -- do NOT write "the <mode> bit" for shared-bit modes (ca / wipeout / tot / blitz2v2 / blitz4v4 share their bit with siblings).

- **Specific-number verification (all kinds)**: every specific NUMBER you write in the body (HP, armor amount + type, ammo counts, default weapon, timing values, round counts, frag limits, respawn-delay scaling values) requires source verification at the **actual handler function**, NOT just the init array. The init array carries cvar values; the handler carries the live runtime numbers that include items granted, weapon defaults, armor type, etc.

  Where to look:
  - CA / wipeout spawn loadout: `CA_PutClientInServer` at `clan_arena.c:511+`. Source: 100 HP / 200 RA at 80% absorb / all 8 weapons / 100 shells, 200 nails, 50 rockets, 150 cells, 6 grenades / default weapon RL.
  - Respawn-delay scaling: `calc_respawn_time` at `clan_arena.c:125`.
  - Round / frag / time limits: `cvar_set` at activation time AND any per-round override in the round-end handler.
  - Suicide rules, spawn-protection windows, win-condition thresholds: the live event handler, not the init.

  **You must be able to cite the source line for any specific number in your draft.** Record citations in the **commit message body** (step 7), NOT in the .md prose -- concept notes are reader-facing. Prose carries citations only when load-bearing, e.g., when the source comment itself is the evidence ("source comment at `cl_input.c:555`: 'This is the same command as impulse...'"). Otherwise, the claim stands on its own and the audit trail lives in git history. If you cannot find a source for a number, remove it or replace with a verifiable statement. Do NOT extrapolate from "standard Quake conventions" without source backing.

### 5. Triage

Decide `wiki_status: l3-upstream | wiki-upstream | hybrid` per the decision tree in `triage-rules.md`. Record the decision in the frontmatter `wiki_status` field. Record the reasoning (what wiki had / what was harvested / what was rejected and why) in the **commit message body** (step 7), NOT in an HTML comment in the .md.

Concept notes are reader-facing prose; the triage chain is auditor-facing metadata. Git log preserves the chain across the file's history.

### 6. Draft

**Frontmatter** -- populate per the schema doc, using the worked example matching your mode's `kind` (ca = standalone, killquad = mutator) as a template. Discipline reminders:

- `slug` matches `gameplay_mechanics.name` strictly (no expansion)
- `canonical_id`: `ktx:game_mode:<slug>`
- `gameplay_source_id`: `ktx` (just the gameplay_sources.id; do NOT invent `ktx@<version>`)
- `note_anchor_version`: the current KTX version string (e.g., `1.47-2-g67253dc`)
- `experience_group`: the primary axis -- one of the 10 slugs from [[experience-group-classification]]
- `kind`: L1 `mode_class` metadata -- `standalone` | `mutator` (verify against `props_json.mode_class`)
- `related_entities`: cvars + commands ONLY (no `ktx:game_mode:*` entries; no self-reference)
- `related_modes`: typed game-mode cross-refs; relation enum `similar-shape` (primary, same experience_group) / `similar-loadout` / `derived-from` / `incompatible-with`
- **Do NOT carry `activation_summary`** -- retired field; the body `## Activate` section is the home for how to start the mode. (A recast of an older note must drop it.)
- **Standalone**: carry the queryable facts (`deathmatch_flag` / `roster` / `loadout` / `objective` / `mode_default_init_array`). **Mutator**: omit them -- a modifier inherits the base mode's (absent, not `n/a`).
- For a mutator interlock: `related_modes: incompatible-with` ONLY for a source-verified toggle mutual-exclusion (midair/lgc, lgc/instagib). A coexisting pair like killquad/berzerk is `similar-shape`, interaction explained in prose -- do NOT mark it incompatible.

**Sections** -- apply the **per-section contract** in `concept-note-section-structure.md` directly (what each section holds / must NOT hold / how it's formatted). Do not draft from a section list memorized here -- that is exactly how this skill went stale. Canonical order:

```
## Summary | ## Activate | ## Basic ruleset | (## Settings to tune) | ## How it plays | (## Maps) | (## History) | ## Hosting & settings | ## See also
```

The load-bearing rules from the contract:
- **`Basic ruleset`** -- cvar-led, one per line; behavioral-rule modes (handler-set rules, no cvar to lead with) use bold prose labels. Conditional for modifiers: omit when the single delta already IS the `Summary` (berzerk).
- **`Hosting & settings`** -- show-and-tell, never a prose blob: availability line -> code block -> cvar list (one per line) -> optional wrinkle. Admin surface only.
- **Activation lives only in `Activate`** -- the command(s) from `cmds[]` (not the slug); never restated in `Summary` or `Hosting`; never document "how NOT to start."
- **De-dup is cross-section** -- each bucket has one job; describe the mode once, spread across the buckets, never re-explained in each.
- **Content-heavy standalones** use `###` subsections in `How it plays` only for a mechanic with its own identity + cvar family (ctf's hook / runes).
- **Conditional sections are absent-not-empty** -- no `Settings to tune` without player commands, no `Maps` without map-coupling, no `History` without a real story.

**`Hosting & settings` is show-and-tell** (see the contract in `concept-note-section-structure.md` section 8). The fixed shape:

- A one-line **availability** statement -- the practical restrict-line for pinning a single-mode server (`set k_defmode <mode>` + `set k_allowed_free_modes <bit>`, noting 4095 = all modes). Give the mode's bit + any bit-sharing caveat as a half-clause; do NOT narrate the bitmask mechanics (those live once in `server-setup`).
- A **code block** -- the `server.cfg` lines, or the per-usermode config path.
- A **cvar list, one per line** -- the mode's `k_*` config cvars an admin sets (name, default/range or per-enum meaning, one-line effect). KTX `k_*` carry no L1 help text, so values come from source at the L1 `source_ref`. Curate the mode-relevant ones; skip housekeeping (`k_lockmin`, baseline `teamplay`).
- An optional **one-line wrinkle** -- a prerequisite, the per-map config hook, a real constraint.

**Never** restate gameplay rules, the enforced preset (`Basic ruleset`), or player commands (`Settings to tune`) here. For a gimmick toggle (berzerk, yawnmode) omit the always-on / dedicated-server path entirely. NO HTML-comment placeholders, NO auto-projected tables -- reader-facing prose.

### 7. Write + commit

Write to `apps/qw-oracle/curated/concept-notes/<slug>.md`. The .md carries frontmatter + reader-facing prose only -- NO HTML triage comments, NO encyclopedic source citations.

Commit body carries the audit trail. Shape:

```
ktx game-mode notes: <slug> concept note (<kind>, <wiki_status>)

<1-2 sentence summary of what this mode is>

Kind:               <standalone | mutator>
Experience group:   <one of the 10 experience-group slugs>
Triage:             <l3-upstream | wiki-upstream | hybrid> -- <1-sentence reasoning>
Sections:           <list>
L1 anchors:         <count> related_entities (all verified in DB)
Wiki harvest:       <none | partial: which sections from wiki | full>

Source verifications (every specific number / interlock / cvar-existence claim in body prose):
  - <claim or section>: <source_file>:<line>
  - <claim or section>: <source_file>:<line>
  - ...

Methodology gaps surfaced: <list, or "none">

Co-Authored-By: Claude <model-id> <noreply@anthropic.com>
```

The verification list is what an auditor reads when spot-checking the .md against source. Operator/orchestrator may spot-check a few; drafter-honesty discipline applies.

## Discipline anchors

- **Source-truth before synthesis** -- verify every cvar / command / version claim against L1 before referencing in prose. `SELECT name FROM entities WHERE project='ktx' AND name_fold='<lower>'` is the cheap check.
- **Specific numbers require source-anchor** -- HP / armor / ammo / timing values come from handler functions, not from extrapolation. Per step 4 above. If you cannot cite the source line, do not write the number.
- **Drafter-honesty in commit-body verifications** -- if your commit message body lists "Source verifications: ..." then every entry must be a real verification you performed (read the file, found the value, copied the cite). Self-attestation without the check is grounds for rejection. The pre-v3 wipeout example surfaced this: the original triage block claimed "all mechanical claims verified against clan_arena.c source," but the spawn loadout was fabricated (100/100 HP/armor; source has 100 HP / 200 RA / 80% absorb). The commit body is auditor-readable; operator/orchestrator may spot-check. Honesty is yours.
- **No editorial scope-creep in user-facing prose** -- `Activate` / `Hosting & settings` are for the player/admin who wants to start or host the mode. Do NOT add parentheticals contrasting your mode's bit-sharing with unrelated modes (e.g., a wipeout note should NOT say "ToT uses UM_FFA instead" -- ToT is irrelevant to a wipeout reader). The bit-sharing pattern belongs in the methodology docs; in `Hosting` prose, name the shared bit + list the siblings that share it, period.
- **Reader-facing prose, not citation-dense audit prose** -- the concept note's body is what an LLM oracle relays to a user, what a wiki page eventually renders. It reads like a wiki page authored by an expert -- confident, declarative, source-comments quoted only when they're the actual evidence. Citations belong in the commit body, not seeded through every paragraph.
- **Prose body grep is just as important as frontmatter audit** -- if you correct a factual claim (e.g., bit-sharing prose), grep the whole file for related claims. The tot-in-UM_4ON4 error survived the first frontmatter fix because it was repeated in two prose sections.
- **Verify drafter-subagent claims if you dispatch nested sub-agents** -- their source-grep results are hypotheses; spot-check 2-3 against actual files.
- **Length follows content; omit empty optional sections** -- a section is the right length when removing more would lose substance, and adding more would pad. No word-count target. Conditional sections (`Settings to tune` / `Maps` / `History`) ship ONLY when you have real content; skip them otherwise. Content-heavy standalones use `###` subsections inside How it plays for distinct sub-mechanics.
- **Plain English at decision points** -- when surfacing ambiguity to operator, 1-sentence statement + concrete options. Don't fire option menus without context.

## Halt-and-report rules

HALT (return to operator without writing the .md file) if:

1. **L1-GAP** -- gameplay_mechanics row for the slug doesn't exist
2. **Classification mismatch** -- source signals contradict [[experience-group-classification]]'s verdict (e.g., a mode you'd classify `mutator` turns out to have its own `_um_init` array)
3. **Wiki materially contradicts L1** -- wiki names cvars/commands that don't exist in L1, or describes behavior that current source doesn't implement, in a way that needs operator decision
4. **Frontmatter field genuinely missing** -- a real field needed for this mode is not in the schema (methodology gap, not invent-in-place)
5. **L1 extractor gap surfaced** -- mode_default rows don't match the init array as it appears in source (extractor missed something)
6. **Init array empty in DB** -- for standalones where it should be populated

PROCEED-WITH-FLAG (write the .md file, surface in report) if:

- A core section reads padded, or substance was cut to keep a section short
- Wiki has substantial harvest-worthy content for a mode classified l3-upstream (re-triage candidate)
- Pending `related_modes` slug ref (normal when a sibling mode isn't drafted yet; flag for orchestrator-awareness)
- Curator-extrapolation in `How it plays` / `Maps` sections without Layer 2 testimony (flag with `<!-- verify: ... -->` inline)

## When in doubt

- File location: `apps/qw-oracle/curated/concept-notes/<slug>.md` (flat)
- `gameplay_source_id`: `ktx`
- Triage uncertain: default `hybrid`
- Section length: follows content; omit empty conditional sections
- Mode kind / experience-group unclear: trust [[experience-group-classification]]; override only with HIGH-confidence contrary source signals
- Wiki claim vs L1 conflict: flag, do not silently choose
- A `related_modes` sibling doesn't yet have a concept note: pending ref is fine; do not refuse to draft

## Return-to-operator report shape

```
game-mode-curate <slug> -- status: <COMPLETE | HALTED | PARTIAL>

Kind:               <standalone | mutator>
Experience group:   <one of the 10 experience-group slugs>
Triage:             <l3-upstream | wiki-upstream | hybrid> -- <1-sentence reasoning>
Frontmatter:        <fully populated | partial -- list missing fields>
Sections drafted:   <list with word counts>
Total body words:   <N>
L1 anchors:         <count of related_entities | count verified vs L1 -- mismatches listed>
Pending refs:       <related_modes slugs that don't resolve yet>
Wiki harvest:       <none | partial -- which sections came from wiki | full> (for wiki-upstream / hybrid only)
Source verifications: <count of cvar/command/version claims cross-checked against L1>
Open items:         <list>
File at:            apps/qw-oracle/curated/concept-notes/<slug>.md
Commit SHA:         <sha if committed; else "not committed">

Methodology feedback:
  Gaps in experience-group-classification.md:  <list or "none">
  Gaps in concept-note-frontmatter-schema.md:  <list or "none">
  Gaps in concept-note-section-structure.md:   <list or "none">
  Gaps in triage-rules.md:                      <list or "none">

Time spent: <minutes>
```
