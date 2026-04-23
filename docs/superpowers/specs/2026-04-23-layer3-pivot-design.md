# Layer 3 pivot — design (post-brainstorm)

**Date:** 2026-04-23 (late-day brainstorm, after the shakedown walk completed 65/65 dispositions)
**Supersedes:** `docs/superpowers/specs/2026-04-23-layer3-pivot-handover.md` as the authoritative source going forward. The handover primer framed the problem; this doc captures the decisions and the work they generate.

## Context

The extraction-review skill's first live walk (ezquake 3.6.5 -> 3.6.6) surfaced the skywind finding, which revealed that the disposition-research protocol was missing ezquake.com/docs as an authoritative Layer 3 source. The handover doc (see "Supersedes") captured the raw observation; this doc captures the post-brainstorm design outcomes. The 3.6.5 -> 3.6.6 walk then ran to completion under the updated protocol (65/65 dispositioned), producing four concept-note targets tracked in HANDOVER.md.

## Core decisions

### ezquake.com/docs and oracle are peer surfaces, not mirror-source vs mirror-target

The two serve different consumption modes: ezquake.com is human-browsable, oracle is LLM-queryable. Neither replaces the other. Mutually beneficial collaboration model — oracle extracts what's useful as Layer 3 baseline and feeds back gaps upstream; ezquake.com stays the community's go-to human reference.

Implication: oracle does not aim to subsume or replicate ezquake.com. It builds its own structured knowledge graph and uses ezquake.com/docs as one of several inputs.

### Two-halves asymmetry of ezquake.com/docs

Git-trail audit of the cloned `research/repos/ezquake-docs/` (done 2026-04-23):

| Content type | Source | Freshness | Oracle treatment |
|---|---|---|---|
| Reference lists (cvars, commands, cmdline, macros) | Auto-regenerated from `data/ezquake/*.json` via `chore(data)` commits | Current (last regen 2026-01-31) | L1 duplicate — **ignore** |
| Guide pages (`docs/docs/*.md`) | Hand-authored | 32/33 pages frozen at ~2022-11-21; only `hud.md` (2025-05) and `triggers.md` (2023-07) have later touches | L3 mirror targets |

Structural consequence: the staleness story is asymmetric and predictable. Reference content has automation and stays fresh; guides have no forcing function and go stale between human edits. Every feature added to ezQuake since 2022-11-21 (~3.5 years of development) has likely guide coverage gaps.

### Layer 3 has two feeding paths

- **Imported from ezquake.com/docs** — mirror guide-heavy pages into oracle concept-notes with entity links. First-class queryable content, not pointer stubs. (A pointer-only approach would break the "we did the hard labor upfront, structured and accessible" value proposition.)
- **Authored-here** — full-body notes for gaps ezquake.com doesn't cover. Potential upstream PR candidates.

The `concept-notes/README.md` "earn by question" principle governs new authoring from scratch. It does NOT reject importing content that was already earned by 15+ years of community questions.

### Earn-the-note tests

A finding warrants a concept note (vs cold L1 data) when at least one of:

1. **User-visible artifacts still on disk** (e.g., `.kmap` pattern — nQuake bundles it, engine removed it in 2014; users still see the files).
2. **Orphan state in the current engine** (e.g., `in_builtinkeymap` cvar surviving the rest of the removed keymap subsystem).
3. **Commonly referenced in L2 chat testimony.**
4. **Cautionary / teaching example for current design patterns** (e.g., server-side protocol version-gating pattern).
5. **Current feature with depth beyond L1 entity listing** — material narrative, pattern, or synthesis across multiple entities.

Otherwise: cold L1 data is sufficient; no L3 note. **L3 is guidance-for-today, not a museum. L1 is the museum.** Removed features that leave no current artifacts, no orphan state, no community volume, and no teaching value do not earn a note — L1's version-aware facts + per-field blame already carry that history.

### Updated disposition research protocol

Beyond the existing protocol (seeds, entity-types, concept-notes, commit log), the skill now also checks:

- `research/repos/ezquake-docs/data/ezquake/*.json` — reference coverage (usually present for post-automation entities).
- `research/repos/ezquake-docs/docs/docs/*.md` — guide coverage. For entities added since 2022-11-21, usually absent. Identify logical target guide page from the sidebar taxonomy (Features / Graphics / Reference / Settings reference / Misc).

### Split `upstream_candidate` flag

Replaced a single field with two:

- `upstream_cvar_reference: <page> | none` — which ezquake.com reference page covers the entity (automation-handled).
- `upstream_guide_candidate: <page> | new-page | none-today` — which guide page it belongs in. `new-page` when no existing guide is a natural home; `none-today` when too niche for a guide but a FAQ entry might fit.

The distinction matters because pretending a guide explainer belongs in an auto-generated settings reference masks that we're actually proposing ezquake.com needs a new page.

### Cross-codebase hint

Entities whose source lives in code oracle hasn't yet walked (e.g., `sv_*` code inside ezQuake referencing shared protocol surfaces, entities that have analogs in MVDSV / KTX / FTE) get a "half-picture likely" signal during disposition research. Bias toward concept-note when story-shape passes, because future cross-codebase walks can reference the existing note rather than duplicate it.

This is a semantic signal, not mechanical — probably requires LLM-driven rather than grep-driven detection. Implementation belongs in the disposition-research protocol, not the mechanical cluster detector.

## The four queued concept notes

See `HANDOVER.md` section "Author 4 concept-note bodies from the 3.6.5 -> 3.6.6 shakedown walk" for the full content-capture per note (findings covered, upstream shape, key teaching facts). That entry is the authoritative handoff for anyone picking up authoring; this doc only adds the ordering recommendation and rationale.

### Authoring order recommendation

Two orderings are defensible. HANDOVER's working order (1 -> 2 -> 3) follows user-facing priority. The alternative below follows template-shakedown-first logic.

**Alternative (template-shakedown-first):**

1. **Skywind first** (HANDOVER Track 3a). Smallest scope, single feature, not cross-codebase, no family-grouping complexity. Best shakedown of the template + provenance frontmatter + authored-here flow before bigger notes.
2. **Security family** (HANDOVER Track 1). Richest story, strongest teaching value, validates the family-grouping pattern.
3. **Ruleset** (HANDOVER Track 2). Big scope, cross-codebase, benefits from security note as precedent.
4. **FTE extensions** (HANDOVER Track 3b). Most niche, deepest protocol-archaeology.

Rationale: template-shakedown-first saves rework if the template or provenance scheme has issues.

Flag-don't-lock — either order works. User decides per session.

## Improvement-phase workstreams

Independent deliverables that enable the ongoing Phase 2f historical backfill. These are distinct from the note-authoring Tracks 1-3 in HANDOVER — those produce content; these produce infrastructure.

### Workstream A: Review-skill tweaks

Tracked in HANDOVER under "Review-skill tweaks from 3.6.5 -> 3.6.6 walk shakedown." Consolidates seven needs surfaced during the walk:

1. **Pre-walk mechanical cluster detection** — group findings by commit-sha, commit-window (<= 60s), PR number, entity-name prefix (>= 3 chars, >= 2 siblings), shared author. Surface clusters in a pre-walk preamble; walk processes clusters as units.
2. **Semantic clustering for the release-notes (Q5) bucket** — match bullets against open concept-notes' scopes and against entity names already classified. The manual Q5 batching during the walk showed the shape; this mechanizes it.
3. **Cross-category clustering** — additions + semantic-crossings can belong to one cluster (smackdrive + restrict_set* was the validating case). Cluster detector runs across all finding categories, not per-bucket.
4. **Cross-codebase hint** in disposition research — see "Cross-codebase hint" core decision.
5. **`upstream_candidate` split field** in disposition records — see "Split `upstream_candidate` flag" core decision.
6. **Scope-tracking on open concept-notes** — so group-extensions ("add to note X") are trivial rather than accidentally creating parallel notes.
7. **Cross-walk cluster revision protocol** — if a later walk finds a finding belonging to a cluster whose earlier members were already dispositioned, explicit revision prompt, never silent.

### Workstream B: Concept-note authoring scaffolding

Tracked in HANDOVER under "Concept-note authoring scaffolding." Note bodies aren't the review skill's job; they need their own small tooling before the first body is drafted.

1. **Provenance frontmatter schema decision** — lock these fields before the first note: `source_url`, `imported_from`, `last_imported_at`, `authored_by`, `upstream_status`. Applies to both imported and authored-here notes.
2. **Template MDX-compatibility test** — generate one test note in the current template shape, check it renders through ezquake.com's vitepress pipeline. Fix template before writing four notes in a shape that won't PR cleanly upstream.
3. **Authoring ritual** — session prompt shape, disposition-record handoff (skill -> author), source-citation discipline, cross-reference handling. Possibly a small skill or slash command.

### Workstream C: /docs ingest pipeline prep

Tracked in HANDOVER under "/docs ingest pipeline prep." Non-code preparation before any mirror content lands.

1. **Per-page audit of the 33 guide pages** — classification table: {mirror / ignore (L1 duplicate) / split / historical}. Half-day of reading work, no writes.
2. **License check on ezquake.com repo** — verify reuse terms before mirroring.
3. **Short note to nano** (Daniel Svensson, maintainer) describing the approach and gap-report intent. Relationship framing before any upstream PR activity.
4. **Gap-report output format** — machine-readable digest emitted per review run. Could live in the skill (Workstream A) or as a separate command; decide when scoping.

## Sequencing

1. **2026-04-23 session wrap-up** — done. Commit range `55b869e..e56bc3e`, pushed to `origin/main`.
2. **Scoping session** — turn each workstream into a mini-spec. No code yet.
3. **Skywind note (HANDOVER Track 3a)** — validates template + provenance frontmatter; informs Workstream B ritual design.
4. **Workstream B scaffolding** — informed by skywind-drafting experience.
5. **Workstream A implementation** (cluster-detection spec -> code) — regression-test against the completed 3.6.5 -> 3.6.6 walk (all manually-spotted clusters should re-emerge from mechanical detection).
6. **Workstream C preparation** — parallelizable with Workstream A if desired.
7. **Sanity-sample pairs** — run diffs on 2-3 additional pairs (including oldest-known and one middle pair), no walks, just eyeball counts. Validates extraction trust on older tags under the improved skill.
8. **Remaining three concept notes** (HANDOVER Track 1, Track 2, Track 3b).
9. **Phase 2f proper** — oldest-pair backfill, full historical walk.

**Key discipline:** do not start Phase 2f until Workstream A is in. Running full-history walks without cluster detection means re-dispositioning clusters we could have caught up front — exactly the cost we established is worth avoiding.

## Open questions / explicit non-decisions

- **Note-authoring order** (skywind-first vs security-first) — flagged in both orderings above; not locked.
- **Cluster-signal thresholds** (entity-prefix length, commit-window duration, shared-author strictness) — decide empirically after first Workstream A implementation on real pair data.
- **Gap-report cadence** (always-on per review vs on-demand) — lean always-on; final call deferred.
- **Concept-note directory layout** (flat + frontmatter distinction vs `imported/` + `authored/` subdirs) — lean flat; frontmatter distinguishes.
- **When to enable the cross-codebase hint** — it's semantic enough to require LLM-driven detection; may defer until MVDSV/KTX extraction is closer.
- **Relationship framing with ezquake.com maintainers** — short message to nano pending before any upstream PR activity; no deadline.

## Related artifacts

- **Pre-brainstorm primer:** `docs/superpowers/specs/2026-04-23-layer3-pivot-handover.md`
- **Shakedown walk review draft:** `apps/qw-oracle/docs/reviews/2026-04-23-ezquake-3.6.5-to-3.6.6.md` (65/65 dispositioned, grouped rationale per concept-note target)
- **Concept-note authoring template:** `apps/qw-oracle/concept-notes/README.md` (earn-the-note tests + two-path curation + provenance schema, updated 2026-04-23)
- **Two existing concept notes as style reference:** `apps/qw-oracle/concept-notes/kmap-legacy-keymap-system.md` (narrative/history shape), `apps/qw-oracle/concept-notes/engine-internal-vs-player-facing-files.md` (classifier shape)
- **Memory:** `memory/project_layer3_two_path_curation.md`
- **ezquake.com docs repo (cloned):** `research/repos/ezquake-docs/`
- **Session commits:** 55b869e..e56bc3e (2026-04-23, 22 commits)
