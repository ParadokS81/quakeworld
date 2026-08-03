# Divergent resolution rubric

Reference for the `asset-type-curate` skill. Covers what to do when sources disagree,
how to shape the draft body, and which flag fires. Companion to `status-flag-rubric.md`
(flag-level decisions live there; divergence-handling body shapes live here).

---

## 1. The architectural rule (D4)

**Source wins. Always.**

This is a load-bearing architectural commitment per `project_qw_oracle_source_truth`:
source code is the ground truth for "does this asset load in version X?" Help-JSON,
docs pages, and corpus conventions are biographical or descriptive evidence -- useful
context, never authoritative when they conflict with source.

The skill does NOT halt on divergence. Halting would force 21 round-trips for the 21-slug
fan-out; refining a draft is faster and less disruptive. The sub-agent produces a draft
that favors source-truth and notes the divergence prominently in the body. The operator
refines at review time if the gap needs operator judgment.

Retired-feature edge case: if source has fundamentally retired the feature, the draft
body says "no current note needed -- feature retired" rather than spinning up a separate
halt path (D4). Details in Section 3.

---

## 2. Divergence kinds

### 2.1 Source vs docs divergence

**What it looks like:** source code says the asset loads from path X or behaves as Y;
the documentation (ezquake.com/docs, local rip at `research/repos/ezquake-docs/`) says
path Z or behavior W. The operator has already flagged some docs pages as stale (e.g.,
the skybox textures page).

**How the draft handles it:**
- Body gets an explicit "Doc-divergence notes" subsection (or inline callout inside
  "Cross-engine differences" when it is engine-specific).
- Name the divergent claim and where it appears. Example:
  > `ezquake.com/docs/textures.html#skyboxes` states the path prefix is `env/` only;
  > source (`R_LoadSkyTexturePixels`, v3.6.9) probes four prefix variants. Source wins;
  > the docs page is flagged stale by the operator.
- Do not soften "docs say X" with hedging -- state it plainly so the reviewer can
  confirm or correct.

**Flag:** DIVERGENT.

### 2.2 Source vs corpus divergence

**What it looks like:** source code establishes canonical install paths or bundle
structure; the gfx community corpus (qw.nu/gfx dump, `pass2-manifest.ndjson`,
`gfx_comment` rows) shows bundles organized differently -- alternate directories,
alternate naming patterns, mix of sub-types in one bundle.

**How the draft handles it:**
- Corpus patterns go in the "Community conventions" body section, clearly labeled as
  descriptive evidence, not as a correction to source.
- Source canonical paths appear in frontmatter `engine_canonical_paths` and in the
  body's "Install layout" section; corpus patterns appear after, labeled explicitly:
  > Community bundles often package these under `qw/textures/env/<name>/` (corpus
  > observation) rather than the source-canonical `gfx/env/<name>/`. Both load
  > correctly; source path is the canonical reference.
- Never elevate corpus convention above source-truth in the frontmatter. If corpus
  reveals a path the seed is missing, propose it as a `## Suggested seed deltas`
  entry for the operator to evaluate -- do not rewrite frontmatter unilaterally.

**Flag:** DIVERGENT if the gap is material (would mislead a user reading either the
docs or the draft without context). CONFIDENT is acceptable if the corpus pattern
is a trivially cosmetic alias and the body already explains it.

### 2.3 Engine-A vs engine-B divergence

**What it looks like:** ezQuake and FTE implement the same logical asset_type but with
genuinely different behavior -- different load-path probes, different fallback sequences,
different cvar names, different format support. Both behaviors are valid for their
respective engines; neither is "wrong."

**How the draft handles it:**
- Body's "Cross-engine differences" section enumerates both behaviors with version
  anchors (engine name + version slug from L1 evidence). Example:
  > ezQuake (v3.6.9): probes `gfx/env/<name>_<face>.tga` across four prefix variants.
  > FTE (build-6698): accepts the same probe set plus bare-root `<name>_<face>.tga`.
- Do not merge the behaviors into a single statement that glosses over the gap -- name
  both explicitly so a user of either engine can act on the note.
- If the divergence is present in docs as well as source, the docs section describes
  it accurately (rare); if docs are silent or only cover one engine, that is the
  gap to note.

**Flag:**
- DIVERGENT if docs (cross-engine docs or single-engine docs) miss or misrepresent the
  cross-engine divergence.
- CONFIDENT if docs accurately describe both engines' behavior and source confirms.
  This is the less common path; most engine-A vs engine-B gaps go undocumented.

---

## 3. Retired-feature shape

Source has retired the feature: the asset_type or loading mechanism described by docs
or corpus no longer loads in any active code path.

### 3.1 Hard retirement

Feature is fully gone -- no load-site remains in any engine at HEAD.

**Draft body:** Short. Required content:
- Status declaration: "This asset_type was retired in <commit or version range>."
- What the feature was (one paragraph -- enough for historical orientation).
- Successor (if any): what replaced it, or confirmation there is no replacement.
- Source evidence: the function or handler that was removed, referencing the L1
  evidence (absence of a loader site is the evidence).

Example body opener:
> **Status: retired.** The `<asset_type>` loading path (`<fn_name>`) was removed in
> <version/commit>. No current note needed for active installation guidance. Historical
> summary follows for context.

**Flag:** DIVERGENT. The investigation.md body must contain an explicit "Retirement
note" subsection with the same evidence summary. The slug stays in the index (seed
YAML is not modified) but the asset-note draft is short and flagged retired.

Frontmatter `status` field: DIVERGENT. `authority_grounds`: engine_mechanics.

### 3.2 Soft retirement / deprecated

The asset_type still loads but is marked deprecated in source, or the primary code
path has been superseded (legacy path still active for compatibility).

**Draft body:** Full note, not a retirement stub. Required content:
- Current loading behavior (still works).
- Deprecation marker: where in source the deprecation is signaled (compiler warning,
  `Con_Warning`, comment block, or operator-provided context).
- Successor path: what the user should use instead, with install-path guidance for the
  successor asset_type.
- Version anchors for both paths (deprecated + successor).

**Flag:** DIVERGENT (docs typically describe the deprecated path as current; source
reveals the deprecation signal).

---

## 4. Worked example -- skybox legacy 6-face shader path

**Asset_type:** skybox
**Function in question:** `Shader_ParseSkySides` (FTE source)

**Situation (2026-05-13):** FTE source retains the 6-face `_ft/_bk/_lf/_rt/_up/_dn`
shader path via `Shader_ParseSkySides`. The operator may flag this as deprecated in
FTE in favor of the cubemap path. The ezQuake side probes 4 prefix variants for the
same 6-face convention.

**Investigation surfaces:**
1. Both FTE and ezQuake load 6-face skyboxes (confirmed active in source at HEAD).
2. FTE also supports a cubemap path (`Shader_ParseSkyBox` or equivalent) that the
   6-face path does not expose.
3. ezquake.com/docs textures page is operator-flagged "recommended-not-complete" --
   docs may not describe the FTE cubemap path.

**Draft body handles it as follows:**

"Cross-engine differences" subsection:
> ezQuake probes four prefix variants (`gfx/env/`, `env/`, `gfx/`, bare-root) for
> 6-face skyboxes. FTE accepts the same probe set via `Shader_ParseSkySides` and
> additionally supports a cubemap path; the 6-face path remains active in FTE at
> HEAD (build-6698) but may be superseded by the cubemap path in future FTE builds.
> Operator context: the 6-face shader path is considered soft-deprecated in FTE;
> use the cubemap path for new content targeting FTE.

"Doc-divergence notes" subsection:
> ezquake.com/docs textures page is flagged stale by the operator. Source was
> consulted directly; docs were not used as authoritative input for this note.

**Flag:** DIVERGENT. Docs miss the FTE cubemap divergence; operator deprecation framing
is present but not yet confirmed in source as a hard deprecation signal (soft retirement
shape per Section 3.2).

---

## Cross-references

- `status-flag-rubric.md` -- when each of the 5 flags fires, trigger conditions,
  and what the investigation.md frontmatter should say. This file covers what the
  body says and how the draft is shaped; that file covers the flag-level decision.
- D4 in `docs/superpowers/specs/2026-05-13-asset-type-curate-skill-design.md`
- `project_qw_oracle_source_truth` memory -- the full source-wins architectural
  rationale (source_state column / per-version source_file / help-JSON as
  biographical breadcrumb).
