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

---

## 2. Feeding paths

Two distinct paths produce entries. Both land in this directory under the same frontmatter schema; both are served over the same MCP surface.

### Path 1 — community-curated imports

Guide content already written by the community elsewhere (primarily ezquake.com/docs), mirrored and adapted into a concept note. The original author earned the note by 15+ years of answering community questions; we don't re-derive that labor, we just normalize the format and add cross-links to Layer 1 entities.

**When applicable:** the upstream source covers material that (a) belongs in Layer 3 (not Layer 1 reference duplicates), (b) the author has consented to reuse (explicitly or via an open license), (c) the content is current or can be made current with light editing.

**Authoring cost:** low — structure is given, we adapt to template.

**Attribution:** `authored_by: community` + `source_url` pointing to the original + `primary_contributors` listing the upstream author.

### Path 2 — authored-here

Full-body notes written during deliberate investigation — typically during a Phase 2f historical walk where a finding raises a question the community hasn't yet answered, or during an ad-hoc research session.

**When applicable:** no community source covers the material adequately, AND the entry passes one of the earn-the-note tests documented in `README.md`.

**Authoring cost:** high — every note is investigation + synthesis + writing.

**Attribution:** `authored_by: qw-oracle`. If the note documents work an upstream contributor did, credit them in `primary_contributors`. If the note could close a gap on ezquake.com, flag `upstream_status: gap-candidate` with a `upstream_target` for eventual PR back.

### Choosing a path

When a topic arises, check both paths before writing. Path 1 is the default when upstream coverage exists and is current. Path 2 is the default when no upstream coverage exists or upstream is stale on the specific point.

A single note can acknowledge both paths in references: Path-1 import can cite additional investigation that extended the original, and Path-2 authored can cite upstream sources that informed but didn't cover.

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

### 2026-04-25 — Gap-report output format (inherited from Workstream C)

When Path 1 imports + Phase 2f walks run, they will emit entities that are reference-present in Layer 1 but guide-absent in ezquake.com/docs. The output format for this gap report is undecided (JSON? Markdown PR-ready? Both?). See HANDOVER.md Workstream C Item 3.

### 2026-04-25 — Cross-linking between concept notes

When a note's scope overlaps an existing note's scope, we link via "Related concept notes" prose. No machine-readable cross-reference field yet. If the MCP serving layer needs to traverse note-graph relationships (e.g., "notes that depend on this concept"), we'll add a `related_notes: [<slug>]` frontmatter field. Not needed today; captured here so a future need has a home.

---

## 8. References

- Entry template: `README.md` (sibling in this directory).
- Doc philosophy: `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md` § OPERATIONS.md (added 2026-04-25).
- Two-path curation memory: `memory/project_layer3_two_path_curation.md`.
- Workstream C pipeline prep: `HANDOVER.md` § Workstream C.
- License context: Discord 2026-04-24 with vikpe; operator decision to treat as CC-BY-4.0 recorded in HANDOVER.md Workstream C Item 2.
