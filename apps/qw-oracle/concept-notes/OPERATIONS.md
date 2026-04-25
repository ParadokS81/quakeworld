# Layer 3 Operations — stewardship playbook for `concept-notes/`

This is the operational playbook for qw-oracle's Layer 3 corpus (the hand-authored concept notes at `apps/qw-oracle/concept-notes/`). It governs how the corpus grows, ages, revises, and sunsets entries — distinct from the entry template itself (which lives in `README.md` next to this file).

Living doc. Updated whenever a session surfaces a learning the existing playbook didn't cover. Each change captures the *why*, not just the *what*.

**Scope boundary:**

- `README.md` — the entry template and shape catalog. *What each note looks like.*
- `OPERATIONS.md` (this file) — how we steward the corpus over time. *How the whole directory behaves.*
- Individual notes (`*.md`) — the corpus content itself.

---

## 1. Purpose and scope

Layer 3 is **retrieval augmentation for current guidance**, not a changelog. Its job is to answer "what should a user, tool, or agent understand about feature X today?" — where "today" means the live ezQuake codebase and the current community consensus on best practice.

What Layer 3 is:

- Curated synthesis across Layer 1 (source-extracted facts) and Layer 2 (20-year chat corpus) that would otherwise require re-derivation every query.
- The home for concepts that live in the *diff* between code states (deprecations, transitions, feature stories) rather than in any single state.
- The carrier for ecosystem facts that source code has no access to (distribution channels, cultural roles, community conventions).

What Layer 3 is NOT:

- A museum of historical features with no current relevance. That's Layer 1's job — version-aware facts with per-field git blame already carry history.
- A mirror of every wiki / forum / Discord snippet. Content is earned (see §2).
- A place to dump speculative notes about features nobody has asked about.

The **"guidance-for-today, not a museum"** principle is the load-bearing test when a question arises about whether a note earns its place.

### Relationship to ezquake.com/docs

Initially framed as "we import from the authoritative site." Updated understanding (2026-04-25, from Discord with vikpe) flips this:

- **Only one person has edited ezquake.com/docs in 6 years** (vikpe; "1 edit beyond myself submitted in 6 years"). The corpus is effectively single-maintainer-plus-stepped-back.
- **Oracle's Layer 1 is the ground truth** for current engine state. Extraction runs against head; every commit is known; every cvar/command/macro has a verifiable provenance.
- **Oracle's Layer 3 is fresher than ezquake.com/docs on new material.** For post-2022 additions (most of what's changed since the last guide-content edit), Oracle is the more current source.

The practical consequence: **Oracle is the producer; ezquake.com/docs is a downstream human-readable surface.** Not the other way around. The "gap-report" we emit isn't just a PR queue for our own contributions — it's a **contributor onboarding kit**. Anyone who wants to help update ezquake.com can consume Oracle's Layer 1 facts + Layer 2 testimony + Layer 3 guidance and write the missing pages from solid ground rather than from scratch.

This is the Oracle project's core value proposition in one frame: produce authoritative, version-aware, source-backed current-state knowledge that downstream consumers (ezquake.com/docs today, chatbots + slipgate-app + future web-services tomorrow) can draw from.

---

## 2. Feeding paths

Two distinct paths produce entries. Both land in this directory under the same frontmatter schema; both are served over the same MCP surface.

### Path 1 — community-curated imports

Guide content already written by the community elsewhere (primarily ezquake.com/docs), mirrored and adapted into a concept note. The original author earned the note by 15+ years of answering community questions; we don't re-derive that labor, we just normalize the format and add cross-links to Layer 1 entities.

**When applicable:** the upstream source (a) covers material that belongs in Layer 3 (not Layer 1 reference duplicates), (b) the content is current or can be made current with light editing — meaning the guide accurately describes present-day engine mechanisms. A page describing features that have since been replaced, or missing substantial material added after the guide was written, is NOT a Path 1 candidate — it becomes source material for Path 2 instead (see below).

**Authoring cost:** low — structure is given, we adapt to template.

**Attribution:** `authored_by: community` + `source_url` pointing to the original + `primary_contributors` listing the upstream author.

**Realistic frequency:** **rare.** Given ezquake.com/docs has been single-maintainer with near-zero external contribution for 6 years, most upstream guides are stale enough that Path 1 doesn't apply cleanly. Discovered during the `weapon-scripts.md` first-import evaluation (2026-04-25): the guide omits `+fire` (15 years of coverage missing) and frames `weapon`+preselect as novel when they're 20 years old. Light editing couldn't fix it without producing a Frankenstein. Outcome: the first "import" became a Path 2 authoring that cited vikpe's guide as source material. Expect most imports to follow that pattern.

### Path 2 — authored-here

Full-body notes written during deliberate investigation — typically during a Phase 2f historical walk where a finding raises a question the community hasn't yet answered, during an ad-hoc research session, or during a first-import evaluation that reveals the upstream guide has substantial staleness.

**When applicable:** (a) no community source covers the material adequately, OR (b) the community source is stale / incomplete / selective enough that faithful mirroring would introduce misleading content, AND the entry passes one of the earn-the-note tests documented in `README.md`.

**Authoring cost:** high — every note is investigation + synthesis + writing.

**Attribution:** `authored_by: qw-oracle`. When the note builds on upstream source material (guides, forum posts, vikpe's work, pre-vikpe-era impulse-script authors), credit them in `primary_contributors` even though the note's own provenance is oracle. If the note could close a gap on ezquake.com, flag `upstream_status: gap-candidate` with a `upstream_target` for eventual upstream offer.

### Choosing a path

Given the ezquake.com/docs staleness reality, the default is Path 2. Path 1 applies only when the upstream page genuinely describes present-day engine mechanisms without substantial omissions — rare in practice. The validation step: before committing to Path 1, grep the guide's mentioned entities against Layer 1 (does every cvar/command exist?) and check for post-guide engine additions in the same domain (does the guide cover what's current?). If either test fails, escalate to Path 2 with the guide as source material.

A single note can acknowledge both paths in references: Path-2 authored typically cites upstream sources that informed but didn't fully cover the topic.

---

## 3. Template and shape catalog

The entry template (frontmatter + section skeleton) lives in `README.md`. Four shapes are recognized there:

- Narrative / history
- Taxonomy / classifier
- Domain walkthrough
- Policy + iteration story

**Growing the catalog.** A new shape is added when a note genuinely doesn't fit any existing one. The test: if forcing the content into an existing shape would mislead or truncate meaningfully, propose a new shape. Otherwise use the closest existing one and don't split the vocabulary speculatively.

Candidate shapes that may emerge from future imports or authoring:

- **Tutorial / how-to** — step-by-step procedure with concrete commands and expected outputs. Likely surfaces when Path 1 imports start (ezquake.com/docs has tutorial-style pages like `weapon-scripts.md` and `scripting.md`).
- **Reference + walkthrough hybrid** — constants / tables / equations alongside prose explanation. Likely from `multiview.md` style content.

When a new shape is added, the process is:

1. First note of the new shape lands with a prose rationale in its References section: "this is a new shape because [reason]."
2. Update `README.md`'s shape catalog to list the new shape with the exemplar.
3. Capture the decision in §7 of this doc with a date and rationale.

---

## 4. Attribution and license policy

### License

**Operator decision 2026-04-24:** mirrored content from `QW-Group/ezquake.com` is treated as CC-BY-4.0 for oracle's purposes, on vikpe's verbal consent (Discord, 2026-04-24) and rational community-scale risk assessment. Full context in HANDOVER.md Workstream C Item 2. This is not a formal license grant — QW-Group has not committed a LICENSE file — but is operationally sufficient.

If a future consumer ever needs cleaner legal footing, revisit. Until then:

- Path-1 notes carry `source_url` pointing to the original page, `primary_contributors` listing the upstream author, and frontmatter fields `imported_from` + `last_imported_at` for drift tracking.
- Attribution at note level is sufficient; directory-wide LICENSE file not added because the corpus mixes imported (CC-BY-4.0-treated) and authored-here (oracle's own, likely MIT when oracle picks a license) content.

Authored-here content's license follows qw-oracle's eventual project license (TBD when slipgate migrates from `packages/qw-config`; the corpus itself stays plain-text Markdown either way).

### Credit norm

The `primary_contributors` field names the upstream code / guide authors whose work the note documents, regardless of whether the note is Path 1 or Path 2. This is distinct from `authored_by`, which names the note's own provenance.

Example: `skywind-animated-skyboxes.md` is authored-here (Path 2, `authored_by: qw-oracle`) but documents code written by the skywind feature author, so that handle appears in `primary_contributors`. A future Path-1 import of a vikpe-written guide would have `authored_by: community` + `primary_contributors: [vikpe]`.

**Single-maintainer context for ezquake.com/docs.** Per vikpe on Discord 2026-04-25, "1 edit beyond myself submitted in 6 years" — meaning vikpe has curated effectively alone since ~2019-2020. When a Layer 3 note builds on guide material from that corpus, the attribution chain is typically:

- `vikpe` as the curator who assembled and maintained the guide in its current form
- Pre-vikpe-era feature authors whose original work predates the guide (impulse-script authors from 2000s, weapon-command author from 2006, `+fire` author from 2011, etc.) when the note covers material with identifiable original implementers
- Layer 1 commit/PR provenance in `related_entities` as the machine-readable audit trail

When the original implementer is unknown or the history is genuinely collective, list vikpe alone with a "pre-vikpe era authors unknown" note in References.

### Authority statements vs population claims

Recommendations from named QW devs (vikpe, BLooD_DoG, johnnycz, meag, etc.) are **authority statements**, not distribution claims. A note saying "the recommended form is `+fire_ar`" is correct; a note saying "most players use `+fire_ar`" is a fabricated frequency claim — Layer 1 + Layer 2 + Layer 3 today contain zero population data. Phrases to avoid: *"most players,"* *"most competitive configs,"* *"typical setup,"* *"the common choice,"* *"many players bind X."* Phrase recommendations as recommendations from named expertise, or as mechanical / design-intent statements, not as projections onto user populations.

A future Layer 4 (opt-in config telemetry from real slipgate-app users) would justify some defensible frequency claims with actual data. Until that ships, none. Surfaced from a 2026-04-25 LLM-side audit of `weapon-scripts.md` that caught six soft frequency claims; cleaned in the same session.

---

## 5. Lifecycle handling

This is the temporal dimension: how notes age, when they transition, when they're sunset.

### Four lifecycle categories

Entries fall into one of four states. The state is carried in the `status` frontmatter field + whichever additional fields the category demands.

**current** — the note reflects present-day ezQuake and current best practice. Default state for new notes. No special handling.

**deprecated** — the feature or practice still works but is no longer recommended; a modern alternative exists and is preferred. Examples: old-school weapon impulse scripts when `cl_weaponpreselect` is the modern path. Notes in this state should cross-reference the successor (via `related_entities` + prose) and say *why* it's deprecated. MCP queries return deprecated notes with a callout.

**historical** — the feature no longer exists in current ezQuake but the note has ongoing value (nQuake bundles still ship user-visible artifacts, Layer 2 testimony still references it, it's a teaching example of an architectural pattern). The `kmap-legacy-keymap-system.md` bootstrap is the exemplar. MCP queries return historical notes only when the query explicitly asks about past state, not when the query asks current-state questions.

**superseded** — the note's entire purpose is covered better by a newer note. Archive the superseded note (see §5.3); don't leave two notes that disagree.

### Detection mechanisms

*Reactive, not prospective.* We don't pre-audit the corpus for lifecycle drift. Transitions happen at two moments:

**During Phase 2f walks** — when the extraction-review skill surfaces a retirement-bucket finding and the retired entity appears in an existing note's `related_entities`, the walk prompts: *"this feature was retired in commit X; the note `<slug>` references it. Mark historical / archive / revise / reject?"* This is the primary detection path.

**During Path 1 re-imports** — when a mirrored note's upstream source has advanced past `imported_from`, the re-sync process surfaces the delta. If the upstream author deprecated the feature or rewrote the guide, reflect that in the mirror.

**Ad-hoc** — any session can propose a lifecycle transition based on evidence. No automation required.

### Frontmatter fields for lifecycle

The current `README.md` template has `status: draft | curated | deprecated`. For proper lifecycle tracking we add two more on next template revision:

- Extend `status:` values to include `historical` and `superseded`.
- New optional field `applies_to_versions:` for version-scoped applicability (e.g., `[">=3.6.0"]`). MCP queries can filter by default to notes covering the queried version.
- New optional field `superseded_by: <slug>` when status is `superseded` — points to the replacement note.

(These fields are proposed here. Actual addition happens during the first note that needs them; see §6 feedback-loop protocol.)

### Archival mechanism

**superseded** notes move to `concept-notes/_archive/` with a terminal `last_updated:` and a `superseded_by:` field. Files are not deleted — the superseded note may still be useful for understanding the transition history — but they leave the active MCP set.

**historical** notes stay in the main directory. They're part of the active corpus because they carry current teaching value; their `status: historical` field is what modulates their retrieval.

---

## 6. Feedback-loop protocol

This is the mechanism that keeps the playbook honest as we learn.

### When a session surfaces a learning

Sessions that touch the corpus (import a note, author a note, walk a Phase 2f finding, revise a template, etc.) may surface learnings that belong in this doc:

- A frontmatter field we need but don't have (example: the `applies_to_versions` proposal in §5).
- A shape catalog addition (example: tutorial/how-to if Path 1 imports start stressing the template).
- A lifecycle decision that doesn't fit the current categories cleanly.
- An attribution edge case.
- A new feeding path we hadn't anticipated.

The protocol:

1. **Capture in the running note / commit message.** Don't lose the learning mid-session.
2. **Decide if generalizable.** One instance isn't a pattern — wait for the second unless the first is clearly general. (Grug-brain: "rule of three.")
3. **Update this doc** when the pattern confirms. Include date + rationale + the session that surfaced it.
4. **Propagate to `README.md`** if the learning touches the entry template (new field, new shape).
5. **Update the root `apps/qw-oracle/CLAUDE.md`** if the learning changes how sessions should discover the corpus.

### What NOT to do

- Don't speculatively add fields / shapes / categories before the first real need. Every addition costs future cognitive load. Premature factoring is the enemy.
- Don't silently break existing notes when adding fields. New fields are optional; existing notes acquire them only when a reason arises.
- Don't split the vocabulary in a fit of enthusiasm. Each existing topic / shape / status value is a commitment to maintain.

---

## 7. Open questions and known gaps

Running list. Items graduate out as they resolve. Items captured here carry date + rationale; if a dated item is >3 months old and still open, it's a signal to either drain it or reject it explicitly.

### 2026-04-25 — `applies_to_versions` field (proposed, not yet adopted)

Proposed in §5 for version-scoped applicability. Not yet added to `README.md` frontmatter because no note has concretely needed it. **Trigger for adoption:** the first note where "when does this apply" cannot be answered cleanly from `related_entities` commit refs alone.

### 2026-04-25 — `historical` and `superseded` status values

Same as above. Proposed in §5; added to `README.md` when the first note enters either state. The `kmap-legacy-keymap-system.md` bootstrap is currently `status: draft` but would be `status: historical` under the proposed schema — that migration happens when the status-value expansion lands.

### 2026-04-25 — Tutorial / how-to shape

Proposed in §3 as a likely catalog addition when Path 1 imports begin. Not added yet because no imported note exists. **Trigger for adoption:** first Path 1 import whose content doesn't fit the four existing shapes.

### 2026-04-25 — First Path 1 import as template-calibration exercise

User raised 2026-04-24: the first mirror import should treat the template as a *test surface*, not a fixed constraint. Imports will stress the template differently than the 4 Path-2 notes already drafted; gaps will surface and revise the template. Planned first import: `weapon-scripts.md` (55 lines, user knows domain deeply). Outcomes to feed back into this doc + `README.md`.

### 2026-04-25 — Gap-report output format as contributor-onboarding kit (inherited from Workstream C)

When Phase 2f walks run, they will emit entities reference-present in Layer 1 but guide-absent in ezquake.com/docs. Reframed 2026-04-25 after vikpe's Discord confirmation that the guide corpus is single-maintainer-plus-stepped-back: the gap report isn't just a PR queue — it's a **contributor onboarding kit**. Someone wanting to help update ezquake.com should be able to consume the gap report + Oracle's Layer 1/2/3 and write a missing page from solid ground.

That reframes the output requirements:

- **Per-gap entry carries everything needed to write the missing page**, not just the entity list. Layer 1 facts (when added, by whom, related cvars/macros), Layer 2 testimony references (community discussion excerpts), Layer 3 concept-note link if we've already written one.
- **Output should be usable by a non-Oracle contributor.** Target shape is probably Markdown (human-readable) with a machine-readable sidecar (JSON) for future tooling.
- **Explicit "suggested page target"** per gap (new page, existing page + section, multi-page split) to lower the onboarding friction.

See HANDOVER.md Workstream C Item 3.

### 2026-04-25 — Cross-linking between concept notes

When a note's scope overlaps an existing note's scope, we link via "Related concept notes" prose. No machine-readable cross-reference field yet. If the MCP serving layer needs to traverse note-graph relationships (e.g., "notes that depend on this concept"), we'll add a `related_notes: [<slug>]` frontmatter field. Not needed today; captured here so a future need has a home.

### 2026-04-24 — First R7 opinionated-best-practice note landed

Weapon-scripts Path-2 rewrite completed 2026-04-24 as the first Layer 3 note carrying opinionated best-practice guidance (three-method taxonomy + recommended canonical form per method). Earlier role-map work (`docs/superpowers/specs/2026-04-24-layer3-role-map.md`) had parked R7 as an open bucket with no exemplars. This note is the first.

**Authority-grounding pattern observed:** every recommendation grounds in at least one of:
- **Engine mechanics** (e.g., "`+fire` closes the one-frame exposure window" — defensible from `cl_input.c`).
- **Community consensus** via commit messages or Layer 2 testimony (johnnycz's 2011 commit: *"inbuilt weapon select+fire scripts"* articulates design intent).
- **Operator SME** explicitly credited in `primary_contributors` (for this note: @ParadokS for the user-facing taxonomy derived from slipgate classifier work).

Not bare assertion. If a recommendation can't be traced to one of these three grounds, either it's not ready for Layer 3 or the authoring authority needs to be surfaced.

**Trigger for formalizing as a rule:** the second R7 note's authoring experience.

**Second instance landed 2026-04-25:** `lightning-gun-customization.md` is R2+R7 flavored (feature-family workflow with opinionated competitive recipe). Authority-grounding rule held cleanly — every recommendation traced to engine mechanics (source-cited), operator SME (@ParadokS for recipe + silent-override gotcha), or both. Community-consensus-via-commit-message wasn't required this time because the other two grounds were strong; the rule as written ("at least one of") covered the case. No rule change. Confirming instance, hold for third.

**Third instance landed 2026-04-25 (late):** `player-skins.md` is R2+R7 flavored (same role mix as lightning-gun-customization but a different domain shape — five-bucket taxonomy + competitive recipe). Authority-grounding rule held across all sections, with one new lane surfacing: **explicitly-hedged community knowledge** (the color-picker conventions section: white safe, red collides with damage flash, etc., explicitly labeled in-prose as *"community knowledge, not source-defensible — based on operator practice and field reports rather than measured palette overlap"*). This is a meaningful fourth ground beyond engine-mechanics / community-consensus-via-commit / operator-SME: the prose-level hedge that names the claim's status as field-verified-but-not-authority-grounded.

**Promotion to README rule (rule of three cleared).** Per §6 feedback-loop protocol: three instances of the same authoring discipline across two distinct R-mixes (R3+R7 weapon-scripts, R2+R7 lightning-gun + player-skins). Promoted to `README.md` § "Voice and length by shape" as an R7-authoring requirement. The four labeled grounds:

1. **Engine mechanics** — source-defensible, cite file:line.
2. **Community consensus** — via commit messages, PR threads, or Layer 2 testimony with message-ID citation.
3. **Operator SME** — explicitly credited in `primary_contributors` frontmatter.
4. **Hedged community knowledge** — flagged inline as not-source-defensible field practice. Names its own status so a downstream consumer can weight the claim correctly.

Bare assertion remains disallowed.

### 2026-04-24 — Progressive-disclosure structure for long notes

Weapon-scripts note (230 lines) structures its opening ~20 lines as a standalone answer (Summary + three-methods-glance table). The rest is drill-down depth. Rationale: MCP delivery can condense regardless of note length, so the note stays comprehensive while default serving stays short.

**Trigger for formalizing as a rule:** a second note intentionally using the same structure, ideally of a different shape (R5 infrastructure + R7 advice). If the pattern holds across 2+ notes, promote to a Layer 3 authoring rule in §3 (note shape) or §5 (template). Until then, treat as weapon-scripts-specific observation.

**Second instance landed 2026-04-25:** `lightning-gun-customization.md` (Domain walkthrough shape, R2+R7 flavor — different from weapon-scripts' Domain walkthrough + R3+R7 mix) intentionally uses the same structure: Summary + Mechanical behavior together stand alone as a ~60-line default-serve answer. Visual / Audio / Ruleset / Cross-engine are drill-downs. Pattern holds across 2 notes of different role mixes. Confirming instance, holding for third before promoting to a `README.md` template rule per rule-of-three discipline.

**Third instance landed 2026-04-25 (late):** `player-skins.md` (Domain walkthrough shape, R2+R7 flavor) opens with Summary + a five-bucket-and-two-paths Mental Model table; everything from § "Identification — file-based path" onward is drill-down depth. Different opener shape (bucket+path table vs three-method-glance vs summary+mechanical-behavior), same structural principle: the first ~30 lines form a complete short answer, the rest is depth. Pattern now holds across 3 notes of two distinct R-mixes (R3+R7 once, R2+R7 twice).

**Promotion to README rule (rule of three cleared).** Per §6: three confirming instances across multiple R-mixes is the bar. Promoted to `README.md` § "Voice and length by shape" as a structural requirement for notes longer than ~80 lines:

> *For notes over ~80 lines, structure the first ~30 lines (Summary + the next section, typically a Mental model or per-method-glance table) as a standalone short answer that a reader can stop after with the gist of the topic. Everything below is drill-down depth. The opener shape varies (taxonomy table, three-method glance, summary + mechanics, bucket+path table) but the principle is consistent: short-answer-first.*

Notes under ~80 lines do not need the structural split — they can be linear. The 30-line threshold is approximate; the test is whether a reader who stops after the first two sections has a usable answer.

### 2026-04-25 — Chat-trigger auto-responses (fcheck family) at a Layer 1 modeling boundary

Surfaced during `lightning-gun-customization.md` authoring. The `f_fakeshaft` chat trigger and siblings (`f_scripts`, `f_version`, `f_skins`, `f_cmdline`, `f_system`) register via `Util_F_Match` in `fchecks.c`, not `Cmd_AddCommand`. Layer 1's current schema (`cvar | command | macro | cmdline_param | keyname | hud_element | ruleset | token_primitive | flag_bit | asset_category`) has no category for chat-triggered auto-response handlers. Related commands `f_ruleset`, `f_server`, `f_modified` DO appear in Layer 1 because they're dual-form (also registered as console commands); the chat-trigger-only siblings sit at a modeling boundary rather than in any extractor gap set.

Not an extractor bug, not a schema change proposal yet. One instance. Captured so a future note touching the same family doesn't re-derive the distinction. If a second note independently references chat-trigger handlers as a first-class concept, promote to a schema-evolution discussion.

### 2026-04-25 — All-datasets-verified gate before drafting (guide-rewrite process)

Surfaced during `lightning-gun-customization.md` session. First draft went out with (a) incomplete Phase 5 ruleset data — the scan only checked `disabled_cvars[]` arrays in `rulesets.c` and missed the `CVAR_RULESET_MIN | CVAR_RULESET_MAX` declaration-clamp pattern + behavior-gate mechanisms (`Rulesets_RestrictParticles()` short-circuits in render code) — and (b) no operator consultation on the competitive recipe. Result: draft recommended a ruleset-prohibited cvar (`r_shaftalpha`) and a movie-maker cvar (`gl_lightning 1`) for competitive play. Operator caught both on first read.

**Process rule the session derived:** Phase 7 classification is the gate. Before drafting, verify all five datasets are complete:

1. Entity set complete (Phase 2).
2. Ruleset scan covers ALL six restriction mechanisms — `disabled_cvars[]`, `CVAR_RULESET_MIN | CVAR_RULESET_MAX` at declaration, `Rulesets_OnChange_*` handlers, behavior gates (`Rulesets_RestrictX()` checks at read sites), hard-coded clamps in cvar read paths, CVAR flag-based restrictions at declaration.
3. Layer 1 `desc` field pulled verbatim for each entity.
4. Cross-engine scan complete (Phase 6).
5. Operator recipe captured when the note carries opinionated recommendations (R7-flavored notes).

If any of the five are incomplete, cycle back — don't draft speculatively.

**Implementation:** captured at the skill level as Phase 7.5 — Operator consult — in `~/.claude/skills/guide-rewrite/SKILL.md`, with role-keyed question templates so the consult is focused, not open-ended chat. Phase 5 also expanded to enumerate the six ruleset-restriction mechanisms exhaustively rather than surface-scanning the first one that matches.

**Rationale for OPERATIONS-level capture:** the *why* belongs in OPERATIONS so future skill maintainers understand what the gate prevents. The *how* lives in the skill file. Both pointers cross-reference each other.

**Confirming instance, 2026-04-25 (late) — `player-skins.md`:** Phase 7.5 caught a likely-wrong scope claim before drafting. Pre-consult, my proposed scope listed `cl_name_as_skin` as an active-player cvar (matching the upstream guide's framing of it). Operator answer surfaced: it's spec/demo-only — `Skin_ForcingType` in `src/skin.c:93` only honors it when `cls.demoplayback || cl.spectator`, and `OnChangeSkinForcing` short-circuits the same way at `src/skin.c:946`. Without the consult, the note would have shipped recommending `cl_name_as_skin` as part of an active-player config — a non-obvious source quirk that source-only data wouldn't have surfaced because the cvar IS source-backed and the per-mechanism scan didn't find ruleset restrictions. Same shape of save as the lightning-gun-customization session (the silent-override gotcha class). Consult cost: 1 turn from operator. No rule change; gate works as designed. Hold for fourth instance before considering whether the consult template needs new role-keyed questions.

### 2026-04-25 (late late) — Graphics-cvar taxonomy organizing axes

Surfaced during `player-skins.md` post-commit discussion. The cshift family (`v_quadcshift` et al.) was cited in player-skins as a "first-person POV self-state indicators" candidate. Operator framing widens the question: the broader graphics-cvar surface decomposes along several axes, not just POV-vs-everyone-else.

**Candidate axes (operator-surfaced):**

1. **POV / what-I-see** — cvars that paint or filter the player's view: cshift family (powerup hues), damage-flash, content-blend (water/slime/lava), bonusflash (item pickup), gamma, contrast, brightness, viewmodel positioning, fov.
2. **World materials and rendering** — how the world itself looks: textures, lighting (`r_dynamic`, `r_fullbright`), sky, fog, fastsky/fastturb, content of `gl_*` and `r_*` cvars that govern how surfaces render.
3. **Special effects** — generated by world events: explosions, particles, rocket trails, teleporter visuals, gib effects, blood.
4. **HUD layout** — separate axis: how UI elements (frag totals, ammo, health, scoreboard, message log) are arranged. Geometry, not graphics.

**Open questions:**

- Does the cshift family belong with damage-flash + bonusflash in one axis-1 note ("how the engine paints your state onto your screen"), or do they split further by trigger (state-driven vs event-driven)?
- Does `r_powerupglow` belong in axis 1 (POV: it's a halo on others *as seen by me*) or axis 2 (world: it's a model effect)? Currently lives in `player-skins.md` because the player-identification topic anchors it; the axis taxonomy might pull it elsewhere.
- Where do crosshair cvars sit? They're POV but they're also UI overlay — possibly a fifth axis or a sub-axis of HUD.

**Trigger for adoption:** when a second graphics-cvar concept independently surfaces (probable candidates: a particles note from the upstream `particles.md` guide, a HUD note from `hud.md`, a textures note from `textures.md`), evaluate whether the operator's three-axis-plus-HUD cut is the natural one or whether a different organizing principle emerges. One data point is a heads-up; rule of three before formalizing the taxonomy.

**Currently captured:** cshift family cited inline in `player-skins.md` § "Powerup-carrier visibility — dynamic lights and glow"; gap-report candidate `first-person-pov-self-state-indicators` reframed 2026-04-25 to flag this open question.

**What NOT to do:** don't pre-write an architecture spec for the graphics-cvar taxonomy. Premature factoring. The shape will emerge from the second and third concrete notes that touch the surface — at that point, either the axis cut holds, or a better organizing principle becomes obvious from real material.

---

## 8. References

- Entry template: `README.md` (sibling in this directory).
- Doc philosophy: `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md` § OPERATIONS.md (added 2026-04-25).
- Two-path curation memory: `memory/project_layer3_two_path_curation.md`.
- Workstream C pipeline prep: `HANDOVER.md` § Workstream C.
- License context: Discord 2026-04-24 with vikpe; operator decision to treat as CC-BY-4.0 recorded in HANDOVER.md Workstream C Item 2.
