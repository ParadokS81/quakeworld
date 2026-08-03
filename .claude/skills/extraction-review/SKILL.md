---
name: extraction-review
description: Use this skill when the user wants to review a QW knowledge-service tag-pair (Phase 2f or any ad-hoc pair). Triggers on "extraction review", "phase 2f review", "review tag pair", "/extraction-review", or any request to walk findings between two QW-engine tags. Orchestrates CLI pre-flight (extract-tag / diff / release-notes / enrich), invokes the review CLI to produce findings + mechanically-detected clusters, renders a preamble (with cross-walk and scope-tracking prompts) for operator confirmation, then walks clusters as units (Model B: Claude proposes, operator approves / overrides / skips).
---

# extraction-review

One tag-pair per invocation. Judgment layer on top of the mechanical CLI.

The walk has two phases: **preamble** (confirm mechanically-detected clusters, surface cross-walk extensions and open concept-note scope matches) then **walk** (cluster-as-unit disposition, falling back to per-finding for unclustered findings).

## Inputs

Ask the user for any missing value:
- `project` — default `ezquake`. First-ship only supports ezquake; FTE / MVDSV / KTX error out.
- `from` — the older tag.
- `to` — the newer tag.

Enforce monorepo root: `pwd` should end in `quakeworld` or a worktree of it. If not, tell the user to cd there.

All CLI commands below run from `apps/qw-oracle/` via `npm run load-knowledge -- <subcommand>`. Prefix with `cd apps/qw-oracle && ` if the current shell is at monorepo root.

## Pre-flight protocol

Execute in order. Each check is a single SQL query via `sqlite3 apps/qw-oracle/data/knowledge.db` or the absence of a file on disk. On a miss, run the paired CLI command and move on.

| Check                                                               | Remedy on miss                                                     |
|---------------------------------------------------------------------|--------------------------------------------------------------------|
| `versions` has a row for (project, from)                            | `extract-tag --project <p> --version <from> --ordinal <n>`        |
| `versions` has a row for (project, to)                              | `extract-tag --project <p> --version <to> --ordinal <n+1>`        |
| `change_events` or `relation_changes` exist for (from -> to)         | `diff --project <p> --from <from> --to <to>`                       |
| `release_notes` exist for (project, to)                              | `release-notes --project <p> --version <to> --github-token $GITHUB_TOKEN` |
| Enrichment fresh (any entity change_events lacking pr_number for the last 50 commits) | `enrich --project <p> --limit 50` |

Ordinal picker: if `extract-tag` is needed, look up the max `ordinal` in the `versions` table for that project and add 1 per new tag.

## Review generation

Once pre-flight passes:

```
cd apps/qw-oracle && npm run load-knowledge -- review \
  --project <p> --from <from> --to <to>
```

Parse the JSON printed on stdout. Expect fields: `project`, `from_version`, `to_version`, `generated_at`, `draft_path`, `counts`, `findings[]`, `clusters[]`.

Each finding carries:
- `cluster_id` (nullable) — mechanical cluster membership.
- `proposed_cluster_id` (nullable) + `match_rationale` — Q5 semantic-pass proposal (§1.2). Source-invisible findings only; the semantic matcher suggests joining a non-Q5 cluster via entity-name overlap or shared commit-message theme. Proposal, not mandate — confirm at preamble.
- `cross_codebase_hint` — CLI-computed from entity-name cues (`sv_*`, `*_pext_*`, ruleset type, `restrict_*`). One of `likely-shared` / `ezquake-only` / `unknown`. Biases toward `concept-note` when `likely-shared` AND earn-the-note story-shape passes (§4).

Each cluster carries `cluster_id`, `confidence`, `signals[]`, `members[]`, and optionally `prior_cluster_refs[]` when signals overlap an earlier walk's cluster. Cross-walk detection is purely mechanical in the CLI; scope-tracking against open concept-notes runs here in the skill.

If the CLI exits non-zero, surface its error verbatim and stop. Pre-flight should already have handled the common misses, so a review-time error means something else.

## Phase 1 — Preamble

### 1a. Build the scope index

Before rendering cluster blocks, read the frontmatter of every `apps/qw-oracle/curated/concept-notes/*.md` (skip `README.md`). Build an in-memory index:

```
<slug> -> { topic, status, related_entities[], title }
```

Filter to `status: draft` or `status: curated` only — `status: deprecated` notes are not candidates for extension. Hold this index for section 1b's scope-match check and for §2.3 cross-walk `extend prior` resolution.

### 1b. Render cluster blocks

For every cluster in `clusters[]` (in the order the CLI emits), compose and render:

```
### cluster:<cluster_id> (confidence: <strong|medium|weak>[, EXTENDS PRIOR WALK][, EXTENDS EXISTING NOTE])
Signals: <signals joined>
Members (<n>):
- <finding_id> ...
- ...

Suggested collective disposition: <kind>
Rationale draft: <2-4 lines synthesized from member evidence — commit messages, from/to values, bucket, cross-references to seeds + entity-types.md + concept-notes>

<EXTENDS PRIOR WALK block — see 1c if present>
<EXTENDS EXISTING NOTE block — see 1d if present>
```

The suggested disposition is derived from the same evidence set the Model B walk would use, scaled to cluster level: commit-message theme across members, whether the cluster crosses multiple buckets, whether any member has a cross-reference in the seed YAMLs under `packages/qw-config/seeds/`, whether `entity-types.md` already describes the type. A family of source-backed cvars in one commit with an IronWail-style narrative warrants `concept-note`; a family of hud variants on a single commit with no story warrants `classify`.

### 1c. EXTENDS PRIOR WALK block (§2.2)

When the cluster has `prior_cluster_refs[]`, append this block to its preamble entry — one sub-block per ref:

```
EXTENDS PRIOR WALK
  Prior cluster: <prior_cluster_id>
  Walk: <walk_label>              (e.g. "ezquake 3.6.5 -> 3.6.6 (2026-04-23)")
  Disposition: <majority_disposition> [<prior_member_count> members]
  Match: <match_signals> [<match_strength>]

  Options:
    [E] extend prior  — add new members to the prior cluster; edit the
                         existing concept-note file in place.
    [N] new cluster   — treat as independent; create new concept-note;
                         cross-reference both notes.
    [S] standalone    — dissolve this cluster; members walk individually.
```

The check must run on EVERY cluster that carries `prior_cluster_refs[]`. Never skip silently — even if the operator picks `N`, the choice is recorded.

### 1d. EXTENDS EXISTING NOTE block (§3.3)

For each cluster whose suggested disposition is `concept-note`, scan the scope index from 1a and test three match rules:

- **entity-ref intersection** — any `entity_ref` derived from the cluster's members appears in the note's `related_entities`.
- **commit-sha match** — the cluster's dominant commit-sha (any `commit:<short>` signal) appears in the note's `related_entities` as `ezquake:commit:<full-sha>`.
- **topic + keyword** — the cluster's semantic theme (inferred from commit messages or bucket) matches the note's `topic`, AND one member's entity name or release-note body matches a note keyword (title words, slug tokens).

When at least one rule fires:

```
EXTENDS EXISTING NOTE
  Open note: <slug>               (<title>)
  Topic: <topic>                  Status: <status>
  Shared entities: <list>         (or: shared commit, or: topic keyword)
  Match signal: <entity-ref | commit-sha | topic-keyword>

  Options:
    [E] extend existing — add cluster members to related_entities;
                           add body delta section.
    [N] new note        — create new <cluster_slug>.md alongside;
                           cross-reference both.
```

This is the intra-walk counterpart to 1c. Same side-effect shape at walk time; different signal source.

### 1e. Q5 semantic proposals (§1.2)

Source-invisible findings that carry `proposed_cluster_id` + `match_rationale` are candidates to join a non-Q5 cluster. The CLI runs the matcher mechanically; the skill surfaces each proposal for operator confirmation.

For every cluster with ≥1 pending Q5 proposal, append a `PROPOSED Q5 EXTENSIONS` sub-block to its preamble entry (under the cluster signals / members block, alongside any EXTENDS blocks):

```
PROPOSED Q5 EXTENSIONS
  Q5 findings the matcher proposes joining this cluster:
  - source-invisible:release_notes:<id>
      Body: <first 120 chars of release_note_body>
      Rationale: <match_rationale>
  - ...

  Options (per-proposal or all-at-once):
    [A] accept all        — add every proposed Q5 finding to this cluster.
    [a <id>] accept one   — add one Q5 finding; others stay standalone.
    [R] reject all        — leave all proposed Q5 findings standalone.
    [r <id>] reject one   — leave one finding standalone; accept the rest.
```

The matcher is a proposal, not a mandate. Reject when the thematic link is coincidental (same `SECURITY:` tag on unrelated subsystems, matching English word colliding with a code identifier, etc.). Use the release-note body's sub-domain as the tiebreaker.

When the operator accepts a Q5 proposal, update the finding's `**Cluster:**` line in the draft to the cluster_id, in addition to the usual cluster-walk side-effects. When rejecting, leave `**Cluster:** none` and strip the `**Proposed cluster:**` line (it served its purpose).

### 1f. Operator actions (preamble-level)

After all cluster blocks render, ask the operator (plain-text input, match Model B style):

```
Preamble actions:
  confirm-all             — accept all clusters + suggested dispositions; enter walk.
  review <cluster_id>     — interactive membership edit + disposition adjustment.
  split <cluster_id>      — dissolve one cluster; members walk individually.
  merge <a> <b>           — combine two clusters; new slug defaults to <a>, ask to rename.
  rename <id> <slug>      — change slug (carries into concept-note filename).
  abort                   — leave the draft untouched.

Per-cluster extension choices (E/N/S or E/N) are captured inline in the
EXTENDS blocks above, not at this prompt. Collect those before
`confirm-all`.
```

When the operator runs `review`, `split`, `merge`, or `rename`, re-render the affected cluster block(s) and re-prompt until the operator types `confirm-all` or `abort`.

### 1g. Preamble state handover

After `confirm-all`, hold the following state for the walk:

- Final cluster set (after any split / merge / rename).
- Per-cluster extension choice (extend-prior / extend-existing / new / standalone / none).
- Per-cluster Q5 proposal choices (accept / reject per proposed source-invisible finding).
- Suggested collective disposition per cluster.

## Phase 2 — Walk (cluster-as-unit, §1.5)

Traverse the confirmed clusters in the order they appeared in the preamble, then unclustered findings in finding-id order.

### 2a. Cluster entry

For each cluster whose members are still pending (per `**Proposed disposition:** _(pending)_` in the draft):

1. Show the cluster header + final suggested disposition + rationale draft (as confirmed in the preamble).
2. Identify the **anchor finding** — first member by finding_id lexical order. The anchor carries the full rationale. Siblings cross-reference the anchor.
3. Ask the operator (plain text):

```
Cluster <cluster_id>:
  approve                     — propagate anchor rationale to all members.
  override <kind>             — pick new disposition for the whole cluster.
  split                       — dissolve cluster, walk members per-finding.
  member <finding_id>         — walk one member out-of-band (per-finding),
                                 others proceed as unit.
  skip                        — leave all cluster members pending.
  abort                       — stop walk; partial draft on disk.
```

- **approve** — apply the cluster-level side-effect (section 2c). For each member:
  - Anchor: fill the three `_(pending)_` lines with full rationale.
  - Siblings: fill with `Grouped with cluster <cluster_id>. See <anchor_finding_id> for full rationale.`
  - All members get the same disposition kind and applied-timestamp.
- **override `<kind>`** — user picks one of `classify`, `mark-orphan`, `concept-note`, `handover`, `reject-as-noise`; re-apply for the new kind as above.
- **split** — drop the cluster membership; each member walks individually via the per-finding flow (section 2d).
- **member `<id>`** — walk one member as a per-finding, then return to cluster flow for the remainder.
- **skip** — leave all members pending; cluster re-surfaces on resume.
- **abort** — stop; partial draft remains on disk.

### 2b. Unclustered findings (cluster_id = null)

Walk per-finding (Model B unchanged from pre-Session 2):

1. Show summary + evidence.
2. If `proposed_disposition` is present from the CLI: show kind + rationale, ask approve / override / skip.
3. Otherwise: derive a proposal from evidence + cross-references (seed YAMLs, entity-types.md, concept-notes/README.md, `git log -1 <commit_sha>`). Ask approve / override / skip.
4. On approve / override: apply the routing-table side-effect, fill the three `_(pending)_` lines.

### 2c. Cluster-level side-effect shapes

The finding-level routing table (section 3) still fires per member. Cluster-level additions on top:

- **concept-note disposition, no extension chosen** — create ONE file at `apps/qw-oracle/curated/concept-notes/<cluster_slug>.md` (not per member). Frontmatter `related_entities` lists every member's entity-ref. Body left as a prompt for the user to draft.
- **concept-note disposition, extend-existing chosen (§3.3 "E")** — edit the matched open note in place (section 2e).
- **concept-note disposition, extend-prior chosen (§2.3 "E")** — resolve the prior concept-note (section 2d), edit in place.
- **concept-note disposition, new chosen (§2.3 "N" or §3.3 "N")** — create a new note AND add a "Related concept notes" sibling link in the related/prior note (section 2f).
- **concept-note disposition, standalone chosen (§2.3 "S")** — cluster dissolved; members walk individually; no cross-walk revision.
- **classify / handover / mark-orphan / reject-as-noise** — routing table applies per member with no cluster-level addition.

### 2d. Resolving the prior concept-note (extend-prior)

When the operator picked `E` for EXTENDS PRIOR WALK:

1. Scan `apps/qw-oracle/curated/concept-notes/*.md` frontmatter.
2. Find notes whose `related_entities` intersect the prior cluster's member entity-refs (derivable from the prior cluster's `members[]` by stripping the bucket prefix).
3. **Unique match** — use that slug.
4. **Multiple matches** — show the candidates and ask the operator which slug.
5. **Zero matches** — surface to the operator: the prior cluster's concept-note isn't in this directory. Options: treat as `N` (new) or `S` (standalone).

### 2e. Edit-in-place mechanics (extend-existing or extend-prior)

Both extension shapes edit a target file the same way:

1. Append new member entity-refs to `related_entities:` in the frontmatter (preserve existing entries, alphabetize or append at end — pick the file's existing convention).
2. Update `last_updated: YYYY-MM-DD` to today's date.
3. Update `primary_contributors:` with any new handles the new members introduce (derive from the cluster findings' enrichment data when present; skip when unknown).
4. For cross-walk extensions only (extend-prior): add to or create `revisions:` in the frontmatter as a YAML list of `{ walk: <walk_label>, cluster: <new cluster_id>, date: <today> }`. Intra-walk extensions do NOT add a revisions entry.
5. Append a new body section near the end:
   ```
   ## Extended in <walk_label>
   <2-4 sentence delta rationale for the new members — what they add, how they fit the note's scope>
   ```
   Place before `## References` when a References section exists, otherwise at end.
6. In the current walk draft, each extended-cluster member's `**Applied:**` line notes the extension: `2026-MM-DDTHH:MM:SSZ (extend: <slug>)`.

### 2f. Cross-reference linking (new-alongside-existing)

When a cluster picks `N` at EXTENDS PRIOR WALK or EXTENDS EXISTING NOTE, create the new note as usual (section 2c), then:

1. Under the new note's `## Related concept notes` section, add a bullet pointing to the related/prior slug with a one-line rationale ("Shares commit abc123 but covers a distinct surface; see there for X").
2. Open the related/prior note and add the reciprocal bullet under its `## Related concept notes` section.

This keeps both notes discoverable without merging their bodies.

## Side-effect routing (per-finding)

When a disposition is applied to a member (cluster-level or per-finding), the matching side-effect fires once per member:

| Bucket              | Disposition        | Side-effect                                                                                                                                              |
|---------------------|--------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| addition            | classify           | Edit the appropriate seed YAML under `packages/qw-config/seeds/`. If a new entity type: prose update in `apps/qw-oracle/docs/entity-types.md`.           |
| addition            | concept-note       | Cluster-level: see section 2c. Per-finding (unclustered): create `apps/qw-oracle/curated/concept-notes/<slug>.md` from the template in `concept-notes/README.md`. |
| addition            | reject-as-noise    | No file change. Record the reason inside the finding's block in the draft markdown so the rejection doesn't re-surface on re-run.                        |
| retirement          | mark-orphan        | `UPDATE asset_extensions SET verification_status='orphaned_historical', verification_reason=? WHERE project=? AND version=? AND extension=? AND path_hint=?` — run via sqlite3 on `apps/qw-oracle/data/knowledge.db`. If the retirement hits `asset_loader_sites` or `asset_cvar_bindings`, surface a handover instead (schema v9 work). |
| retirement          | classify           | Entity row is already stamped `source_retired` by the diff pipeline; add a prose note to `entity-types.md` explaining the retirement if taxonomy-relevant. |
| retirement          | concept-note       | Same as addition variant.                                                                                                                                |
| semantic-crossing   | classify           | Edit the seed YAML that owns the field's domain (category_id -> categories; load_trigger -> cvar bindings; etc.).                                        |
| semantic-crossing   | concept-note       | Category crossings are the canonical Layer 3 source.                                                                                                     |
| semantic-crossing   | reject-as-noise    | Record.                                                                                                                                                  |
| unclassified        | classify           | For `asset_loader_sites`: `UPDATE asset_loader_sites SET confidence='certain', notes=? WHERE canonical_id=?`. For `asset_cvar_bindings`: promote to `seed` and add to the seed YAML. |
| unclassified        | handover           | Append a new entry to the repo-root `HANDOVER.md` (follow the existing section template). Reason: extractor-side work is needed for promotion.           |
| source-invisible    | concept-note       | Cluster-level: see section 2c. Per-finding: create `apps/qw-oracle/curated/concept-notes/<slug>.md` with the release_note_body captured in the body.             |
| source-invisible    | handover           | Append to `HANDOVER.md`.                                                                                                                                 |
| any                 | reject-as-noise    | No file change; rejection recorded in draft.                                                                                                             |

## Draft markdown block format

Each finding's block has up to seven tagged lines. Three are filled during the walk; the other four are CLI-emitted (`**Cluster:**`, `**Cross-codebase hint:**`) or CLI-emitted pending-filled (`**Upstream cvar reference:**`, `**Upstream guide candidate:**`). A final optional line `**Proposed cluster:**` appears on source-invisible findings with a semantic match.

```
**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** <cluster_id or "none">
**Cross-codebase hint:** <likely-shared | ezquake-only | unknown>
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** <cluster_id> — <match_rationale>    # only on source-invisible with semantic match
```

Walk responsibility per line:
- **Proposed disposition / Rationale / Applied** — filled on approve / override via exact-match Edit on `_(pending)_`. Same mechanics as before Session 3.
- **Cluster** — CLI-set. Preamble may mutate via `accept` on a `PROPOSED Q5 EXTENSIONS` prompt; otherwise untouched at walk time.
- **Cross-codebase hint** — CLI-computed from entity-name cues. Edit only to override the classifier's judgment (e.g., flip `likely-shared` to `ezquake-only` when research rules out analogs). Do not edit when the value is already correct.
- **Upstream cvar reference** — fill with the ezquake.com reference page that auto-surfaces this entity via `VariableList` / `CommandList` (check `research/repos/ezquake-docs/data/ezquake/*.json`). Use `none` when absent. Trivial for every finding — fill even on classify-disposition ones.
- **Upstream guide candidate** — fill with the ezquake.com `docs/docs/*.md` guide page that ought to explain the entity. Values: `<page>` (existing page), `new-page` (no existing home on ezquake.com), `none-today` (too niche for a dedicated guide; FAQ-shape at best). For classify-disposition findings the answer is almost always `none-today`. For concept-note-disposition findings at least one of the two upstream lines must be populated (not `none`/`none-today`).
- **Proposed cluster** — written by the CLI. At preamble time, if the operator accepted the proposal (§1e), update the finding's `**Cluster:**` line to the proposed id AND strip this line; if rejected, strip this line and leave `**Cluster:** none`.

The finding's `id` line (`### <id>`) is the unique anchor. Do NOT rewrite the block's evidence or summary.

Example (anchor finding, cluster-level approve):

```
**Proposed disposition:** concept-note
**Rationale:** 6-entity skywind family (PR #978, commit d7e91ef3) porting IronWail's animated-skybox feature. Material depth: alpha-channel skybox + sidecar `gfx/env/<name>_wind.cfg` + cross-engine provenance.
**Applied:** 2026-04-23T14:22:10Z
**Cluster:** skywind-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** settings/hud.md
**Upstream guide candidate:** textures.md
```

Example (sibling finding):

```
**Proposed disposition:** concept-note
**Rationale:** Grouped with cluster skywind-family. See addition:ezquake:command:skywind for full rationale.
**Applied:** 2026-04-23T14:22:10Z
**Cluster:** skywind-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** settings/hud.md
**Upstream guide candidate:** textures.md
```

Example (source-invisible finding joined to a cluster via Q5 semantic proposal):

```
**Proposed disposition:** concept-note
**Rationale:** Grouped with cluster commit-41852d49 (client-side server-exec allowlist). See addition:ezquake:cvar:cl_allow_downloads for full rationale.
**Applied:** 2026-04-23T14:25:33Z
**Cluster:** commit-41852d49
**Cross-codebase hint:** unknown
**Upstream cvar reference:** none
**Upstream guide candidate:** new-page
```

(The `**Proposed cluster:**` line is removed once the proposal is resolved at preamble time.)

## Vocabulary conventions for rationales

### help-JSON state (§6)

The extractor-side help coverage for a cvar or command has three distinct states, not two. Use the three-way predicate in rationales; do not use the pre-Session-3 shorthand "help_desc NULL" (it conflates `absent` with `null`).

| Predicate         | Meaning                                                                   | Upstream shape                                               |
|-------------------|---------------------------------------------------------------------------|--------------------------------------------------------------|
| `help_desc:absent`   | Key not present in `help_commands.json` / `help_variables_tree.json`   | Canonical upstream-doc gap when paired with `system-generated:true` — ezQuake `help_*.json` PR needed |
| `help_desc:null`     | Key present with explicit `null` value                                 | Rare; documented-but-empty placeholder                       |
| `help_desc:string`   | Key present with non-empty string                                      | Documented upstream; no gap                                  |

`system-generated:true` is an orthogonal flag on the help-JSON row emitted when the extractor discovered the row from source with no upstream description. The canonical upstream-documentation-gap predicate is `system-generated:true AND help_desc:absent` — those are the cvars / commands where reference pages auto-render with empty descriptions.

When writing rationales, state help-JSON coverage plainly using the three predicate strings. Do not paraphrase ("empty", "missing", "NULL") — the precise predicate feeds Workstream C gap-report predicate definitions.

### Cross-codebase hint bias (§4)

When a finding's `**Cross-codebase hint:**` is `likely-shared` AND earn-the-note story-shape passes (material depth + teaching value + concept-note-worthy surface), bias the proposed disposition toward `concept-note` rather than `classify`. The rationale should explicitly name the codebase(s) where analogs are expected (MVDSV, KTX, FTE, QWFWD), so a future walk against that codebase references this note instead of duplicating.

When the hint is `ezquake-only` or `unknown`, earn-the-note tests stand on their own — no bias.

### Upstream split (§5)

`**Upstream cvar reference:**` and `**Upstream guide candidate:**` are not interchangeable. Conflating them masks whether the entity needs a new ezquake.com guide page.

- **cvar reference** is automation-surfaced (post-2022 entities auto-render on `settings/*.md` via `VariableList` / `CommandList`). This is coverage the ezquake.com maintainer does not need to author by hand.
- **guide candidate** is the hand-authored explainer page an ezquake.com reader expects to find. Values:
  - `<page>` — guide exists that should / does mention the entity.
  - `new-page` — no existing home on ezquake.com; filing a new page (possibly under a new sidebar section) is the right upstream shape.
  - `none-today` — entity too niche for a dedicated guide; a FAQ entry or inline mention on a broader page is the upstream shape, if any.

When `**Proposed disposition:**` is `concept-note`, at least one of the two lines must be populated (not `none` / `none-today`). A concept-note that names neither a reference nor a guide target is a red flag — re-examine whether the note passes earn-the-note.

## Commit protocol

After the walk:

- If every finding has a non-pending disposition, stage and commit:
  ```
  git add apps/qw-oracle/docs/reviews/<draft>.md \
    packages/qw-config/seeds/*.yaml \
    apps/qw-oracle/docs/entity-types.md \
    apps/qw-oracle/curated/concept-notes/ \
    HANDOVER.md \
    apps/qw-oracle/data/knowledge.db
  git commit -m "review(qw-oracle): <project> <from> -> <to> — N findings, M clusters"
  ```
  (Only stage paths that actually changed in this review.)

- If any finding was skipped, do NOT commit. Tell the user which finding IDs are still pending and that re-running the skill will resume from them.

## Resume protocol

Finding IDs are stable hashes. Re-invoking the skill against the same (project, from, to) reads the existing draft and treats filled dispositions as done. The CLI regenerates clusters each run; operators can `confirm-all` immediately when the preamble matches the prior confirmation.

Only findings with `**Proposed disposition:** _(pending)_` get walked again, cluster or not.

Pass `--force` to the review CLI only if the user explicitly wants to regenerate from scratch (discards prior dispositions).

## Non-goals

- Do not run `extract-tag` or `diff` or `release-notes` on your own initiative outside the pre-flight table. Skill scope = pre-flight self-healing + preamble + walk.
- Do not write tests. The testing strategy is the live run itself (per spec).
- Do not auto-pick between `concept-note` and `handover` for source-invisible findings. Ask.
- Do not re-run the semantic matcher on your own — the CLI emits `proposed_cluster_id` / `match_rationale` on source-invisible findings and those are the authoritative proposals to surface. Never invent an extra proposal the CLI did not emit.
- Do not retroactively rewrite prior walks' rationales to use the Session 3 vocabulary (three-way `help_desc`, split upstream lines, cross-codebase hint). Existing drafts stay frozen; new walks adopt the new shape.
