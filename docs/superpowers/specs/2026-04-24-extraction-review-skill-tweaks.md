# Extraction-review skill tweaks (Workstream A) -- design

**Date:** 2026-04-24
**Scope:** Eight improvements surfaced during the 2026-04-23 shakedown walk (`ezquake 3.6.5 -> 3.6.6`, 65/65 dispositioned). Decisions only -- no code.
**Supersedes nothing.** Extends:
- `docs/superpowers/specs/2026-04-23-layer3-pivot-design.md` Section  Workstream A (enumerated the 7 items; this spec adds item 8 and turns all 8 into executable design).
- `docs/superpowers/specs/2026-04-23-extraction-review-design.md` (original skill+CLI design -- Model B walk, side-effect routing, resume protocol).
- `~/.claude/skills/extraction-review/SKILL.md` (skill as shipped 2026-04-23).

**Gates:** Phase 2f historical backfill. Running 15-tag full-history walks without cluster detection would re-disposition clusters we could have caught up front.

## Context

The shakedown walk surfaced seven inefficiencies plus one vocabulary-precision gap:

- Two clusters forced mid-walk revisions because the walk was per-finding with no up-front grouping: the `cl_allow_downloads + cl_allow_uploads + cl_remote_capabilities` family (3 commits in a 3-second window) and the `smackdrive + 15 restrict_set*` semantic-crossings (cross-category: addition + semantic-crossings).
- Q5 (release-notes / source-invisible) bullets were manually batched before bulk disposition -- mechanizable.
- The `upstream_candidate` flag conflated reference coverage (auto) with guide coverage (human), masking gap signals.
- Concept-note scope matching during the walk was eyeballed, producing ad-hoc group extensions.
- Cross-codebase entities (e.g., `sv_*`, protocol-extension cvars with FTE/MVDSV/KTX analogs) biased toward concept-note without explicit signalling.
- Help-JSON "desc NULL" shorthand elided three distinct states (`absent` vs `null` vs `string`), which feed different upstream gap categories (ezQuake help PR vs ezquake.com guide PR).

This spec turns those into concrete changes to the review CLI (`review` subcommand), the SKILL.md walk protocol, and the draft-markdown shape.

## Decision summary

| Item | Decision | Thresholds |
|---|---|---|
| 1. Pre-walk mechanical cluster detection | CLI emits `clusters[]` alongside `findings[]`; each finding carries a `cluster_id` (or null) | Commit-sha exact / PR-number exact / commit-window TBD / entity-name prefix TBD / shared-author TBD |
| 2. Semantic clustering for Q5 bucket | Semantic pass runs after mechanical; matches release-note bodies to existing clusters + open concept-notes | LLM-driven, no mechanical threshold |
| 3. Cross-category clustering | A cluster is finding-category-agnostic; membership spans `addition`, `retirement`, `semantic-crossing`, `unclassified`, `source-invisible` | -- |
| 4. Cross-codebase hint | New field `cross_codebase_hint` on disposition records; surfaces in walk prompt as a bias toward concept-note when story-shape passes | LLM-driven (cue set: `sv_*`, `*_pext_*`, protocol-extension registrations, shared-header entities) |
| 5. Split `upstream_candidate` | Two fields: `upstream_cvar_reference` (auto surface) and `upstream_guide_candidate` (human surface) | -- |
| 6. Scope-tracking on open concept-notes | Skill loads concept-note frontmatter before walk; proposes group-extension when finding's scope matches an open note | Match by `related_entities` intersection or `topic` + keyword |
| 7. Cross-walk revision protocol | When a later walk finds a finding extending an earlier cluster, explicit "extend prior cluster / standalone" prompt; never silent | -- |
| 8. Help-JSON predicate vocabulary | Three predicates: `help_desc:absent` / `help_desc:null` / `help_desc:string`. Paired with `system-generated:true` for canonical upstream-doc-gap set | -- |

Empirical thresholds under item 1 are **deliberately TBD** -- they calibrate after first Phase 2f pair, not before.

---

## 1. Cluster detection pipeline

Three passes, runs inside the `review` CLI subcommand, before findings are serialized to JSON.

### 1.1 Mechanical pass (items 1, 3)

Operates over the full findings list regardless of category. Each finding emits a set of "cluster keys"; findings that share a key belong to the same mechanical cluster.

**Signal taxonomy:**

| Signal | Cluster key | Strength | Threshold | Applies to |
|---|---|---|---|---|
| same commit-sha | `commit:<sha>` | strong | exact match | Any finding with `evidence.commit` |
| same PR number | `pr:<n>` | strong | exact match | Any finding enriched with `pr_number` |
| commit-window | `commit-window:<bucket>` | medium | TBD (60s initial, validated on 3.6.5->3.6.6). **Uses committer time (`%ct`), not author time (`%at`).** Rebased feature branches re-stamp `%ct` near-identical at merge; author time preserves original write times and would fragment clusters that landed together. | `addition`, `retirement`, `semantic-crossing` with `commit_timestamp` |
| shared entity-name prefix | `prefix:<token>` | medium | TBD (proposed >=2 underscore-delimited tokens shared, >=2 siblings; OR >=5 chars + >=3 siblings for prefixes without `_`) | `addition`, `retirement` on named entities |
| shared author + time window | `author-window:<author>:<bucket>` | weak | TBD (proposed <=1 day initial, likely tighten to <=1 hour) | Any finding with commit metadata |

**Cluster-key merge.** A finding may carry multiple keys. Clusters are the equivalence classes under "shares >=1 key with." Strong-signal-only clusters (commit-sha, PR) are surfaced with high confidence; medium/weak-only clusters are surfaced with a confidence note so the walk operator can split if the signal was coincidental.

**Anti-heuristics (prevent over-clustering):**

- Generic prefixes (`cl_`, `sv_`, `r_`, `cvar_`, `cmd_`) do NOT qualify as `prefix:` keys on their own -- they match thousands of unrelated entities. Require >=2 underscore-tokens OR strong co-signal (same commit) to suppress them.
- Commit-window alone (no other signal) is a weak cluster. A single weak signal does not group a cluster by itself -- surface as a hint only.
- Shared-author alone is not a cluster. Must pair with commit-window.

**Output per cluster:**

```
{
  "cluster_id": "<slug>",                  // auto-generated, e.g. "skywind-family" | "commit-d7e91ef3"
  "confidence": "strong" | "medium" | "weak",
  "signals": ["commit:d7e91ef3", "prefix:skywind"],
  "members": ["<finding_id>", ...]
}
```

Slug generation: prefer the strongest semantic cue -- shared name-prefix over commit-sha over PR. Ties broken alphabetically. Slug is mutable by the operator at preamble time.

**Name-prefix slug threshold (validated 2026-04-24):** use a prefix-derived slug (`<prefix>-family`) only when >=80% of cluster members share the primary semantic prefix. Below 80%, fall back to commit-sha (`commit-<short-sha>`). Examples:
- skywind family (5/6 = 83% share `skywind`; the 6th is `r_skywind` which tokenizes differently) -> `skywind-family`.
- hud_gun family (8 members: `hud_gun_frame_hide`, `hud_gun2_frame_hide`, ... `hud_gun8_frame_hide`; token-2 diverges so no >=80%-shared 2+-token prefix exists) -> `commit-2c7fd802`.

The 80% rule prevents "misleading specificity" -- a prefix slug that names only a subset of members is worse than the neutral commit-sha fallback.

### 1.2 Semantic pass (item 2)

Runs over the `source-invisible` (release-notes / Q5) bucket only. Matches release-note bodies against:

- (a) **Existing mechanical clusters from this walk** -- keyword overlap with cluster member entity names, commit-message prefixes (e.g., `SECURITY:`, `RENDERER:`, `PROTOCOL:`), or cross-name transforms (protocol-ext names like `FTE_PEXT_COLOURMOD` <-> cvar `cl_pext_colourmod`; `PEXT_TRANS` <-> `pext_ezquake_verfortrans`).
- (b) **Open concept-notes** -- load `apps/qw-oracle/concept-notes/*.md` frontmatter; match `related_entities` + `topic` + slug keywords.
- (c) **Already-dispositioned findings in this walk** -- if an earlier finding was dispositioned and a later Q5 bullet matches, propose joining that finding's cluster.

Output: `proposed_cluster_id` (nullable) + `match_rationale` (human-readable) on each `source-invisible` finding. Proposal, not mandate -- walk operator confirms.

This pass is LLM-driven (the review CLI calls Claude). No mechanical threshold.

### 1.3 Cross-category merge (item 3)

After mechanical + semantic passes, a cluster's membership is the union across all finding categories. A cluster can contain (e.g.) three `addition` findings + one `semantic-crossing` finding + four `source-invisible` findings. The cluster's cluster_id is stable across categories.

### 1.4 Walk-preamble shape

Before the per-finding walk begins, the skill presents a preamble that lists all detected clusters with members, signals, and a suggested collective disposition when derivable. Shape:

```
## Detected clusters

### cluster:skywind-family (confidence: strong)
Signals: commit:d7e91ef3, prefix:skywind, pr:978
Members (6):
- addition:ezquake:command:skywind
- addition:ezquake:command:skywind_load
- addition:ezquake:command:skywind_lookdir
- addition:ezquake:command:skywind_rotate
- addition:ezquake:command:skywind_save
- addition:ezquake:cvar:r_skywind

Suggested collective disposition: concept-note
Rationale draft: 6-entity family in one commit; material-depth test passes on
  alpha-channel skybox + sidecar config + cross-engine (IronWail) provenance.

### cluster:client-side-server-exec-allowlist (confidence: medium, cross-category)
Signals: commit-window:2024-12-31T22:02 (3 commits in 3s), semantic:SECURITY-theme
Members (7):
- addition:ezquake:cvar:cl_allow_downloads
- addition:ezquake:cvar:cl_allow_uploads
- addition:ezquake:cvar:cl_remote_capabilities
- source-invisible:release_notes:64 (qw:// url parser)   [semantic]
- source-invisible:release_notes:65 (remote capabilities validation)   [semantic]
- source-invisible:release_notes:66 (downloaded files exec prevention) [semantic]
- source-invisible:release_notes:79 (cbuf_svc aliases)   [semantic]

Suggested collective disposition: concept-note
Rationale draft: Client-side permission model for server-initiated execution;
  3-cvar core family + 4 related release-notes bullets, same 2024-12-31 threat model.

### cluster:hud-gun-frame-hide (confidence: strong)
...
```

Preamble actions (walk operator input at preamble time):

- **confirm-all** -- accept all clusters and suggested dispositions; enter walk with cluster membership locked.
- **review <cluster_id>** -- interactively review a single cluster's membership (add / remove members); adjust collective disposition.
- **split <cluster_id>** -- dissolve cluster; members walk individually.
- **merge <cluster_a> <cluster_b>** -- combine clusters (e.g., when two medium-confidence mechanical clusters share a semantic theme).
- **rename <cluster_id> <new_slug>** -- change slug (the slug carries into concept-note filenames when the cluster dispositions to `concept-note`).

After preamble confirmation, the walk begins.

### 1.5 Cluster-as-unit disposition flow

Within the walk, a cluster is traversed as one unit:

1. **Anchor finding** -- the cluster's first member by finding_id order. Full rationale written here.
2. **Sibling findings** -- same disposition, rationale points to anchor: `Grouped with cluster <cluster_id>. See <anchor_finding_id> for full rationale.`
3. **Collective approve / override / split** at cluster entry:
   - **approve** -- anchor rationale propagated to all siblings with the cross-reference shape above; side-effects run per member (e.g., all 6 skywind members still edit their own seed rows; concept-note file created once at anchor).
   - **override <kind>** -- user picks a new disposition for the whole cluster; anchor + siblings all updated.
   - **split** -- dissolve cluster during walk; fall back to per-finding walk for the cluster's members.
4. **Per-member override** -- the operator can still deviate on one member during a cluster walk ("these 5 get concept-note, this 6th gets classify"). Handled by walking the member out-of-band; cluster's other members proceed as unit.

**Draft markdown changes:**

- New `## Clusters` section before `## Findings`, one block per cluster listing members + final disposition + cluster-level rationale (anchor).
- Each finding's block gains a new line: `**Cluster:** <cluster_id> | none` under the three existing `**Proposed disposition / Rationale / Applied**` lines.
- Side-effect routing unchanged -- the routing table in SKILL.md still fires per finding.

**Review CLI change (sketch):**

- `review` subcommand runs mechanical + semantic + cross-category passes after `findings[]` assembly, before stdout emit.
- Output JSON gains `clusters[]`; each finding gains `cluster_id` (nullable).
- Draft markdown template gains `## Clusters` header with one block per cluster; finding blocks gain `**Cluster:**` line.

---

## 2. Cross-walk cluster revision protocol (item 7)

Problem: a later walk (e.g., 3.6.6 -> 3.6.7) surfaces a finding whose cluster-signal matches a cluster dispositioned in an earlier walk (e.g., 3.6.5 -> 3.6.6). Silent merge would erode review-history trust; blind duplication would create parallel concept-notes.

### 2.1 Detection

When the review CLI assembles clusters for walk N:

1. Load all prior walk drafts under `apps/qw-oracle/docs/reviews/*.md`.
2. Parse each for its `## Clusters` section; build an index of `(cluster_id, signals, members[], disposition)`.
3. For each cluster in walk N, check signal overlap with prior clusters:
   - Any shared commit-sha -> strong match.
   - Any shared PR-number -> strong match.
   - Any shared entity-prefix + >=1 shared member entity-ref -> strong match.
   - ~~Any shared `topic` / concept-note slug (when prior cluster dispositioned to concept-note) -> medium match.~~ **Deferred (2026-04-24, Session 2):** this rule duplicates Section 3 scope-tracking, which already matches clusters against open concept-notes via authoritative frontmatter (`related_entities`, `topic`, slug keywords) loaded fresh from disk -- richer signal than reconstructing from prior-draft parsing, which would require fragile `cluster_id` -> `concept-note slug` inference. Section 3 is the authoritative surface for "extends an existing concept-note"; Section 2.1 rules 1-3 remain the surface for "mechanical signals appeared in an earlier walk." Two different questions, no coverage gap. Revisit if Phase 2f data surfaces cases Section 3 alone misses.
4. Emit `prior_cluster_refs[]` on each walk-N cluster that matches.

### 2.2 Prompt at preamble

When the preamble renders a cluster with `prior_cluster_refs`, the skill shows:

```
### cluster:<slug> (confidence: strong, EXTENDS PRIOR WALK)

Prior cluster: <prior-cluster-slug>
  Walk: ezquake 3.6.5 -> 3.6.6 (2026-04-23)
  Disposition: concept-note (<concept-note-slug>)
  Prior members: N

New members in this walk (K):
- ...

Options:
  [E] extend prior -- add K members to prior cluster; update prior concept-note
  [N] new cluster -- treat as independent; create new concept-note
  [S] standalone -- dissolve this cluster; each finding walks on its own
```

### 2.3 Recording

- **extend prior** -- walk N's draft records the cluster with a `prior_cluster: <ref>` line. When the cluster dispositions to concept-note, the existing concept-note file is edited (new members added to `related_entities`, new body section for the delta) rather than a new file created. Concept-note frontmatter gains `last_updated: <walk N date>` + an entry in a `revisions:` list pointing to both walk drafts.
- **new cluster** -- independent concept-note created. Both drafts cross-reference each other (walk N draft mentions walk M's prior_cluster_slug; prior concept-note's `related concept notes` gains a sibling link).
- **standalone** -- cluster dissolved in walk N; no revision to prior.

### 2.4 Never-silent discipline

The cross-walk check runs on EVERY later walk. Even if the operator ends up picking `new cluster`, the choice is explicit and recorded. No code path skips the prompt when `prior_cluster_refs` is non-empty.

---

## 3. Scope-tracking on open concept-notes (item 6)

Concept-notes already carry `related_entities` + `topic` + slug. This item wires them into the walk.

### 3.1 Load-time

At walk start (before preamble rendering, after cluster detection), the skill reads all `apps/qw-oracle/concept-notes/*.md` frontmatter and builds a scope index:

```
{
  "client-side-server-exec-allowlist": {
    "topic": "security-policy",
    "related_entities": [
      "ezquake:cvar:cl_allow_downloads",
      "ezquake:cvar:cl_allow_uploads",
      "ezquake:cvar:cl_remote_capabilities",
      "ezquake:commit:41852d49...",
      ...
    ],
    "status": "draft"
  },
  ...
}
```

### 3.2 Match rule

A cluster (or an individual finding, if unclustered) matches an open concept-note when:

- Any `entity_ref` in the cluster's members exists in the note's `related_entities`, OR
- The cluster's dominant commit-sha appears in the note's `related_entities` (via `ezquake:commit:<sha>`), OR
- Topic + keyword match (semantic): cluster's semantic theme (e.g., `security-policy`) matches the note's `topic`, AND one of the cluster's member names / release-note bodies matches a slug keyword.

### 3.3 Prompt injection

When a cluster's suggested disposition is `concept-note` AND a scope match exists:

```
Suggested disposition: concept-note -- EXTENDS EXISTING NOTE
  Open note: <concept-note-slug>
  Shared entities: <list>
  Match signal: entity-ref intersection | commit-sha | topic-keyword

Options:
  [E] extend existing note -- add members to related_entities; add body delta
  [N] new note -- create <cluster-slug>.md alongside
```

This is the mechanized form of the walk operator's manual "we already opened a note for this" check during 3.6.5 -> 3.6.6. Same side-effect as cross-walk `extend prior` (section 2.3) -- but intra-walk, not across walks.

### 3.4 Status filter

Scope match runs only against concept-notes with `status: draft` or `status: curated`. Notes marked `status: deprecated` are not candidates for extension.

---

## 4. Cross-codebase hint (item 4)

Covered as a core decision in the layer3-pivot spec; this spec records the **implementation surface**.

### 4.1 New field on disposition records

```
**Cross-codebase hint:** likely-shared | ezquake-only | unknown
```

Optional fourth line on each finding's block, alongside `**Proposed disposition / Rationale / Applied**`. When present, indicates whether the entity's source region suggests analogs in not-yet-walked codebases (MVDSV, KTX, FTE, QWFWD).

### 4.2 Cue set (LLM-driven detection)

Fed to Claude during disposition research, not mechanical grep:

- `sv_*` cvars inside ezQuake source -> server-side surface, likely MVDSV/KTX analog.
- `*_pext_*` cvars -> FTE protocol extension family, FTE is source-of-truth.
- Protocol-extension registrations (`FTE_PEXT_*`, `PEXT_*`) -> FTE origin.
- Ruleset primitives (`restrict_*`, ruleset names) -> KTX origin, observed server-side; ezQuake is consumer.
- Shared-header entities (anything defined in `protocol.h` / `common.h` / `net_*.h`) -> likely cross-codebase.
- Network packet types, infoset keys, userinfo keys -> cross-codebase by definition.

### 4.3 Walk influence

When `Cross-codebase hint: likely-shared` AND earn-the-note story-shape passes: bias toward `concept-note`. The rationale explicitly names the codebase where analogs are expected, so a future MVDSV/KTX/FTE walk can reference the existing note instead of duplicating.

No bias when `Cross-codebase hint: unknown` or `ezquake-only` -- earn-the-note tests stand on their own.

### 4.4 Deferral

If MVDSV/KTX/FTE extraction is years out, the hint still pays off at note-write time (forces cross-codebase framing in the note body). No need to defer the hint just because cross-codebase walks haven't started.

---

## 5. upstream_candidate flag split (item 5)

Already decided in layer3-pivot-design Section  "Split `upstream_candidate` flag." This spec records the record-shape change.

### 5.1 Replace single field

Old:
```
**Upstream candidate:** <page> | none
```

New (two fields, both optional, at least one populated when disposition is `concept-note`):
```
**Upstream cvar reference:** <page> | none
**Upstream guide candidate:** <page> | new-page | none-today
```

### 5.2 Semantics

- **`upstream_cvar_reference`** -- which ezquake.com reference page auto-includes this entity (via the automated `VariableList` / `CommandList` rendering). Usually present for post-automation entities (post-2022 cvars + commands). Populated from `research/repos/ezquake-docs/data/ezquake/*.json` presence.
- **`upstream_guide_candidate`** -- which ezquake.com guide page (under `docs/docs/*.md`) ought to explain the entity. Populated by classifier: existing-page vs `new-page` (no existing guide is a natural home) vs `none-today` (too niche for a guide; FAQ entry may suit).

### 5.3 Gap-report input

The gap-report surface (Workstream C) reads these two fields. Rows where `upstream_guide_candidate != none-today` AND the target page has no current mention of the entity are the authoritative guide-gap set.

---

## 6. help-JSON predicate vocabulary (item 8)

Problem: the review rationale and the skill's disposition logic both used "help_desc NULL" as a shorthand for "entity has no human-authored description." The actual JSON has three distinct states; conflating them masks upstream-gap categories.

### 6.1 The three predicates

| Predicate | Meaning | Upstream shape |
|---|---|---|
| `help_desc:absent` | Key not present in help_commands.json / help_variables_tree.json -- extractor emitted the row but upstream has no entry at all | Canonical `system-generated:true` + `desc:absent` gap -> ezQuake `help_*.json` PR needed |
| `help_desc:null` | Key present with explicit null value | Rare; treat as documented-but-empty. Usually indicates upstream placeholder. |
| `help_desc:string` | Key present with non-empty string | Documented upstream; no gap. |

`system-generated:true` is an orthogonal flag on the help-JSON row itself (emitted by the extractor when the row was auto-discovered from source without upstream description). The canonical upstream-documentation-gap predicate is `system-generated:true AND help_desc:absent`.

### 6.2 Review-skill implications

- Rationale-writing vocabulary: use `help_desc:absent` (not "help_desc NULL") throughout. Walk prompts that display `help_desc` state show the three-way distinction.
- Disposition logic that currently short-circuits on "help_desc NULL" must distinguish `absent` (gap candidate) from `null` (likely benign).
- The gap-report emitter (Workstream C) keys on `help_desc:absent AND system-generated:true` as the ezQuake-side gap set, and on entity-not-in-any-guide-page as the ezquake.com-side gap set. Two distinct categories, two distinct PR shapes.

### 6.3 Audit of the 3.6.5 -> 3.6.6 walk

Several rationales used "help_desc NULL" (`cl_allow_uploads`, `cl_pext_colourmod`, `pext_ezquake_verfortrans`, `hud_gun_frame_hide`, `scr_scoreboard_showclock`). When this spec lands, those rationales are frozen (historical). Going-forward rationales adopt the three-way vocabulary.

---

## 7. Regression target -- 3.6.5 -> 3.6.6 clusters must re-emerge

The mechanical + semantic + cross-category pipeline must produce at least the following clusters when run against the 3.6.5 -> 3.6.6 findings JSON.

| Cluster | Primary signal | Expected members | Confidence |
|---|---|---|---|
| `cluster:skywind-family` | `commit:d7e91ef3a4f7d396bc5001d9be6f8bc34aabb971` + `prefix:skywind` | 6: skywind, skywind_load, skywind_lookdir, skywind_rotate, skywind_save, r_skywind | strong |
| `cluster:client-side-server-exec-allowlist` | `commit-window` (3 commits in 3s, 2024-12-31) + semantic Q5 (4 release-notes, SECURITY theme) | 7: cl_allow_downloads, cl_allow_uploads, cl_remote_capabilities + release_notes 64, 65, 66, 79 | medium (mechanical), strong (after semantic merge) |
| `cluster:hud-gun-frame-hide` | `commit:2c7fd80237947cbe4b9bfcece369f6602ae9d654` + `prefix:hud_gun` | 8: hud_gun_frame_hide + hud_gun2_frame_hide ... hud_gun8_frame_hide | strong |
| `cluster:ruleset-anti-script-restriction-pattern` | `commit:2dbb3f1d8d3c68e3fe984bd55684919d3263324e` (groups the 15 semantic-crossings) + shared-author/topic merge to smackdrive addition (commit 22b5b6c2) | 16: smackdrive addition + (qcon, smackdown, thunderdome) x (restrict_exec, restrict_ipc, restrict_setcalc, restrict_seteval, restrict_setex) | medium (needs cross-commit merge; semantic fallback if author+window don't match) |
| `cluster:completing-legacy-fte-protocol-extensions` | Cross-category + semantic Q5 (release-notes mention FTE_PEXT_TRANS / PEXT_MODELDBL / alpha plumbing) | 4: pext_ezquake_verfortrans addition + release_notes 53, 77, 85 | medium (semantic-only; no mechanical signal links the cvar addition to the release-note bullets) |

**Negative test -- non-cluster:**

| Would-be cluster | Suggestion signal | Expected outcome |
|---|---|---|
| `scr_scoreboard_*` family | `prefix:scr_scoreboard`, 3 siblings, but 3 different commits | Preamble SUGGESTS cluster; operator splits (per walk rationale: each is independent toggle, no shared feature story). The detector should surface the possibility -- the value of surfacing-plus-split is higher than of hiding. |

**Acceptance:** all five positive clusters must appear in the preamble output when the updated `review` CLI is run against `from=3.6.5 to=3.6.6`. The ruleset cluster and the FTE cluster may surface as two clusters that require an operator `merge` action -- acceptable outcome; the goal is surfacing, not perfect auto-merge.

**Non-acceptance:** any of the five clusters *entirely missed* by the detector (no preamble entry, member findings walk individually). That is the failure mode Workstream A exists to prevent.

---

## 8. Open questions & TBD thresholds

Decide empirically after first Workstream A implementation + first real Phase 2f pair. Do not hardcode before data exists.

- **commit-window threshold.** Starting value: 60s. Real-world feature branches may merge commits minutes apart -- tighten or loosen after observing false-positive / false-negative rates.
- **entity-name prefix threshold.** Starting value: >=2 underscore-delimited tokens shared + >=2 siblings. Revisit with data from rulesets (`restrict_*`), keybinds (`bind_*` if any), etc.
- **shared-author window.** Starting value: <=1 day. Likely too loose for active contributors (dsvensson lands many unrelated commits per day). Probably tighten to <=1h + require secondary signal.
- **Semantic-pass prompt shape.** How the LLM pass receives cluster context + open concept-note index + prior-walk cross-references -- single prompt vs multi-step. Defer to implementation; start with the simplest single-call shape.
- **Cluster-slug clash across walks.** When two walks independently slug `cluster:hud-gun-frame-hide`, that's the intended cross-walk-revision signal (section 2). When two DIFFERENT clusters happen to slug-collide (e.g., "security-family" in different contexts), need a disambiguator. Defer: revisit if the collision actually occurs.
- **Cross-walk revision member-update mechanics.** When extending a prior cluster whose concept-note is already PR'd upstream, the note's body may have been edited by nano / the ezquake.com maintainer -- how to merge new members without clobbering upstream edits. Probably manual conflict resolution; defer until first occurrence.
- **Detector output verbosity.** Whether to show all weak / medium clusters in the preamble (risks noise) or hide weak-only clusters behind a `--all-clusters` flag. Lean: show all with confidence labels; operator can split in one keystroke.
- **Interactive confirmation UI.** Preamble confirmation shape inside the Model B walk (CLI-friendly plain text vs checkbox-style). Defer to skill implementation.

---

## 9. Sequencing & non-goals

### Sequencing

1. Spec lands (this document).
2. `review` CLI changes: mechanical cluster pass + `clusters[]` JSON output + draft-markdown `## Clusters` section. Can ship in isolation -- no skill changes required if CLI output is backward-compatible (findings still appear individually; preamble is a new section).
3. Skill changes: preamble rendering + cluster-as-unit walk + cross-walk detection + scope-tracking load.
4. Semantic pass (item 2): LLM-driven Q5 matching inside the CLI.
5. Cross-codebase hint (item 4): fourth line in disposition records + LLM cue prompt in walk research.
6. upstream_candidate split (item 5): record-shape change + rationale-writing discipline in walk prompts.
7. help-JSON vocabulary (item 8): rationale-writing + gap-report predicate definition.
8. Regression run: re-execute `review` on 3.6.5 -> 3.6.6 with the new CLI; confirm all five clusters from section 7 appear. Dispositions remain the operator's; we are not re-running the walk, only validating detection.
9. Sanity-sample pairs: 2-3 additional tag pairs (no walks, just eyeball the cluster preamble + finding counts). Calibrate thresholds.
10. Phase 2f proper.

Items 2-7 can partially parallelize. Items 2 + 8 can ship independently of 3; item 3 depends on 2 (skill reads CLI output).

### Non-goals

- **Not re-walking 3.6.5 -> 3.6.6.** The dispositions in the existing draft are canonical; this spec only requires the cluster *detection* to re-emerge. Re-walking is explicitly out of scope.
- **Not automating cluster dispositions.** Every cluster still walks through operator approve / override / split. The goal is reducing the cost of judgment (no re-disposition mid-walk, no parallel concept-notes), not removing judgment.
- **Not building the gap-report emitter.** That's Workstream C. This spec only locks the predicate vocabulary it reads from.
- **Not writing tests.** Per `extraction-review-design.md`, the live run is the test.
- **Not changing the side-effect routing table.** Routing is per-finding; cluster-as-unit is a walk-time concept. A cluster dispositioned to `concept-note` still fires one concept-note side-effect (at the anchor) + per-member seed/entity-types edits -- same as six individual findings would.

---

## Related artifacts

- **Predecessor design:** `docs/superpowers/specs/2026-04-23-layer3-pivot-design.md` Section  Workstream A.
- **Original skill+CLI design:** `docs/superpowers/specs/2026-04-23-extraction-review-design.md`.
- **Regression data:** `apps/qw-oracle/docs/reviews/2026-04-23-ezquake-3.6.5-to-3.6.6.md` (65 dispositioned findings; 5 positive + 1 negative regression clusters in section 7 above).
- **Skill as-shipped:** `~/.claude/skills/extraction-review/SKILL.md` (Model B walk, pre-flight protocol, side-effect routing).
- **Concept-note authoring template:** `apps/qw-oracle/concept-notes/README.md` (frontmatter schema used by section 3's scope index).
- **Handover entry being drained:** `HANDOVER.md` Section  Workstream A.
