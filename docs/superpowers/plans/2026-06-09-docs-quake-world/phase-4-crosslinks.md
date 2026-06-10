# Phase 4 -- Cross-links + Source-link Completion

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full -- D1-D22). Done.
> 2. Read `review-findings.md` and identify which findings apply to this phase. Done -- F6 is the
>    primary Phase-4 finding (qtv/qwfwd upstream_commit is a version string, not a SHA).
> 3. Read the relevant live source cold: `apps/docs-web/lib/source-link.ts`, `lib/anchor.ts`,
>    `lib/browse-types.ts`, `lib/browse.ts`, `lib/codebase-label.ts`, `lib/types.ts`,
>    `EntityCard.vue`, `EntityBrowse.vue`, and a sample of `apps/qw-oracle/curated/concept-notes/`
>    for the `related_entities` shape. Done.
> 4. Verification sub-agent: the orchestrator runs the Explore pass at the boundary (AUG note).
>    Drafter self-checks D19, D15, and AUG-1 F6 before declaring this ready.

---

## Recon notes (verified against live files)

These facts were read from live source before drafting; they ground every design decision below.

**Anchor scheme (D22):**
`lib/anchor.ts` -> `entityAnchor(name) = name.toLowerCase()`. Deep link target:
`/<codebase>/<type>#<entityAnchor(name)>`. Orchestrator-verified collision-free across 20 files.

**Description render today (EntityCard.vue:57):**
`<p v-if="row.descriptionFull !== undefined" style="white-space: pre-line">{{ row.descriptionFull }}</p>`
Plain text; no auto-linking. The comment on line 56 explicitly labels this "no auto-linking".

**"Used in" slot today (EntityCard.vue:116):**
`<!-- Phase 4 reverse-index slot: deliberately empty in v1 (no dead UI). -->`
The slot exists; nothing renders. Phase 4 populates it.

**BrowseRow today (lib/browse-types.ts):** Does not carry description segments or guide links.
Phase 4 adds two optional fields:
- `descriptionSegments?: DescriptionSegment[]` -- the pre-computed span array for auto-linking
- `usedInGuides?: GuideRef[]` -- the reverse-index entries (empty array in v1)

**browse.ts shapeBrowse:** Calls `sourceUrl(codebase, snap._meta, e.source_ref)` and attaches
the result. For ktx/mvdsv/qtv/qwfwd/qwcl, `sourceUrl` currently returns `undefined` (REPOS map
only has `ezquake`). Phase 4 fills the 5 remaining entries.

**source-link.ts (live):**
```ts
const REPOS: Record<string, { repo: string; prefix: string }> = {
  ezquake: { repo: 'QW-Group/ezquake-source', prefix: 'src/' },
  // ktx/mvdsv/qtv/qwfwd/qwcl: Phase 4
}
export function sourceUrl(codebase, meta, ref): string | undefined {
  const cfg = REPOS[codebase]
  if (cfg === undefined) return undefined
  return `https://github.com/${cfg.repo}/blob/${meta.upstream_commit}/${cfg.prefix}${ref.file}#L${ref.line}`
}
```

**AUG-1 recon -- per-codebase repo slug, prefix, SHA/version:**

| Codebase | GitHub repo | source_ref prefix | upstream_commit shape | URL branch |
|---|---|---|---|---|
| ktx | QW-Group/ktx | src/ | SHA (67253dc9...) | /blob/{sha}/src/{file}#L{line} |
| mvdsv | QW-Group/mvdsv | src/ | SHA (18d03621...) | /blob/{sha}/src/{file}#L{line} |
| qtv | QW-Group/qtv | (empty) | version string "1.16-dev" | F6: omit (no tag; vendored, no .git) |
| qwfwd | QW-Group/qwfwd | src/ | version string "1.40-dev" | F6: omit (no tag; vendored, no .git) |
| qwcl | id-Software/Quake | QW/client/ | SHA (bf4ac424...) | /blob/{sha}/QW/client/{file}#L{line} |

Sources: repo slugs from `research/repos/*/` git remotes + `docs/research/2026-03-25-qwfwd-security.md`
+ `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/README.md`; prefixes from docs-web
`data/*-cvar.json` `source_ref.file` values cross-checked against live repo directory layouts;
upstream_commit values from `apps/docs-web/data/*-cvar.json` `_meta.upstream_commit`; SHA vs
version-string classification from `lib/types.ts` comment (F6) and the vendored snapshots having
no `.git` dir (verified by `ls -la`). QTV module name confirmed `github.com/qw-group/qtv`
(go.mod), mapping to GitHub org `QW-Group`. QWCL is the historic id-Software/Quake repo; `bf4ac424`
is HEAD of that repo (verified: `git -C research/repos/qwcl-original log --oneline` shows it as
the top SHA). The `enrich-prs.ts` `null` for qwcl means "no GitHub Releases API integration",
not "no repo" -- the repo and commit both exist.

**F6 branch for qtv/qwfwd:** Both are frozen vendored snapshots with no `.git` dir
(`ls -la apps/slipgate-app/reference/qtv/.git` -> "No such file"; same for qwfwd). The version
strings `1.16-dev` / `1.40-dev` are NOT git tags in the upstream repos (no tag evidence, no git
context). Per F6/D11: omit the source link for qtv/qwfwd (return `undefined`; card shows plain
`file:line`). This is the safe/correct path -- NEVER ship a broken link.

**Concept-note corpus (AUG-3) -- CORRECTED at the orchestrator boundary:**
- `apps/qw-oracle/curated/concept-notes/*.md` -- the directory `lib/guide-index.ts` reads.
- `related_entities` shape: YAML list of strings, one per line, format
  `<project>:<kind>:<name>` (e.g., `ktx:cvar:k_mode`, `ezquake:command:weapon`). Some entries
  carry a 4th segment e.g. `mvdsv:info_key:w_rank:userinfo` -- the reverse-index key is the
  3-segment `<project>:<kind>:<name>` portion only (the 4th is a scope qualifier irrelevant
  to entity matching). Some entries use `commit` as kind (e.g. `ezquake:commit:7c328aa4`) --
  these do NOT match any docs-surface entity and are silently skipped.
- **The corpus is NON-EMPTY and DOES resolve to real docs entities (verified cold at the
  orchestrator boundary).** 52 notes carry `related_entities`, with 286 unique refs of the form
  `<codebase>:<cvar|command|...>:<name>` that resolve to entities present in `apps/docs-web/data/`.
  Spot-verified: `ktx:cvar:k_mode` and `ktx:cvar:k_pow` are both present in
  `apps/docs-web/data/ktx-cvar.json`. So `buildGuideIndex()` returns a NON-EMPTY map and
  `getGuideRefs()` returns refs for those entities.
- **Consequence (D7/D21 hazard):** if those refs flowed through to render, `EntityCard` would
  emit "Used in:" links to `/guides/<slug>` -- pages that DO NOT EXIST in v1 (the guides portal
  is a LATER docs-web arc). That is up to 286 dead 404 links: a direct D7 ("no dead links") +
  D21 ("no guides portal in v1") violation. The earlier "empty/sparse corpus -> emits nothing"
  premise was FALSE.
- **Resolution (BY CONSTRUCTION, not operator-decided):** Phase 4 introduces an explicit
  `GUIDES_PORTAL_LIVE = false` flag in `guide-index.ts`. The reverse-index is still BUILT and
  unit-tested now (proving the mechanism + the D22 stable-anchor wiring), but render is
  SUPPRESSED at the `browse.ts` wiring point: `usedInGuides` is set to `[]` for every entity
  while the flag is false. v1 therefore renders ZERO "Used in" links by construction (D7), not
  by accident of an empty corpus. The arc that ships the guides portal flips the flag to `true`.

**D14/D15 grep gates (AUG-2 carry-forward):**
Phase-boundary check #5: `grep -nE "ezquake|'cvar'|'command'|'macro'" .../components/Entity*.vue`
must stay empty. Phase-boundary check #6: `fetch|readFileSync|.filter(|.map(|.reduce(` in
components must stay empty. Phase 4 adds two new lib/ modules -- these checks must stay green
over the modified EntityCard.vue (new segments `v-for` is not a filter/map/reduce on data;
it's a Vue template loop over pre-shaped prop data -- D15 clean).

---

## Goal

Phase 4 ships three enhancements to the build-time data layer and the entity card, all
governed by D8/D11/D14/D15/D19/D22:

1. **(primary deliverable) cvar->cvar auto-links:** A new `lib/cvar-link.ts` module resolves
   cvar names mentioned inside an entity's description text against the same codebase's entity
   name set, pre-computing a `DescriptionSegment[]` array (plain text spans and link spans)
   at build time. `browse.ts` calls this at shape time; the result is carried on `BrowseRow`
   and rendered via `EntityCard`'s new segments `v-for` loop. The template-level loop replaces
   the current plain-text `{{ row.descriptionFull }}` with per-segment rendering.

2. **Entity->guide reverse-index (built + tested now, render suppressed in v1):** A new
   `lib/guide-index.ts` module reads `apps/qw-oracle/curated/concept-notes/*.md` front-matter
   at build time, parses `related_entities`, and builds a `Map<'<codebase>:<type>:<name>',
   GuideRef[]>` reverse index. The corpus is NON-EMPTY -- it resolves 286 refs to real docs
   entities -- so the index IS non-empty. Because the `/guides/<slug>` link targets do NOT
   exist in v1 (the guides portal is a later arc), rendering those links would ship dead 404s
   (D7/D21 violation). Phase 4 therefore gates render behind an explicit
   `GUIDES_PORTAL_LIVE = false` flag: the index is built and unit-tested now (mechanism +
   D22 wiring proof), but `browse.ts` sets `usedInGuides = []` for every entity while the flag
   is false, so v1 renders ZERO "Used in" links BY CONSTRUCTION (D7). The module also handles
   an empty or absent corpus gracefully (D11). The flag flips to `true` in the arc that ships
   the portal -- no reference rework needed (D22).

3. **Source links for ktx/mvdsv/qwcl (AUG-1):** Populate the `REPOS` map in `lib/source-link.ts`
   with verified entries for ktx, mvdsv, and qwcl (SHA-based URL -- these have real commit SHAs).
   qtv/qwfwd continue to return `undefined` (F6 branch: version-string upstream_commit cannot
   produce a valid GitHub blob URL; D11 graceful degradation). The module already supports this:
   an entry not in REPOS returns `undefined` and the card renders plain `file:line`.

At phase boundary: an expanded ezQuake cvar card shows cvar names in the description as clickable
links to those cvars' own rows (same codebase, same page anchor -- the primary deliverable);
ktx/mvdsv/qwcl source links resolve to GitHub (no longer plain text); qtv/qwfwd remain plain
text for source (F6 branch); the "Used in" slot renders nothing in v1 because
`GUIDES_PORTAL_LIVE` is false (the index resolves real refs but render is suppressed -- D7/D21);
`pnpm --dir apps/docs-web build` exits 0; 23/23+ unit tests pass; D14/D15 grep gates clean.

---

## Inputs from previous phase

- Phase 3 complete: all 6 codebases browse-able with graceful degradation operator-confirmed;
  23/23 unit tests pass; `pnpm --dir apps/docs-web build` exits 0 and emits 28 routes; the two
  F14 theme collision bugs fixed (nav `.menu`, card `.vp-doc h2`); `lib/codebase-label.ts`
  seam in place.
- `apps/docs-web/lib/source-link.ts` exists with the `REPOS` seam comment for Phase 4.
- `apps/docs-web/lib/anchor.ts` exists with `entityAnchor(name)`.
- `apps/docs-web/lib/browse-types.ts` `BrowseRow` is the render contract.
- `apps/docs-web/lib/browse.ts` `shapeBrowse` is the build-time shaper that calls `sourceUrl`.
- `apps/docs-web/.vitepress/theme/components/EntityCard.vue` has the dormant "Phase 4 reverse-
  index slot" comment at line 116 and the current plain-text description render at line 57.
- `apps/qw-oracle/curated/concept-notes/*.md` exist (NON-EMPTY corpus -- 52 notes / 286
  resolvable refs; the reverse-index reads these but render is suppressed in v1, AUG-3).
- `apps/docs-web/data/*.json` exist for all 6 codebases (the entity name sets for cvar-linking).

---

## Files touched

### Created

```
apps/docs-web/lib/cvar-link.ts          # new: cvar->cvar resolver module (D15, D19)
apps/docs-web/lib/guide-index.ts        # new: entity->guide reverse-index module (D15, D19)
apps/docs-web/lib/cvar-link.test.ts     # new: unit tests for cvar-link
apps/docs-web/lib/guide-index.test.ts   # new: unit tests for guide-index
```

### Modified

```
apps/docs-web/lib/source-link.ts        # populate REPOS for ktx/mvdsv/qwcl; F6 comment for qtv/qwfwd
apps/docs-web/lib/browse-types.ts       # add DescriptionSegment type; add usedInGuides? to BrowseRow; add GuideRef type
apps/docs-web/lib/browse.ts             # call cvarLink() + guideIndex().get() in shapeBrowse
apps/docs-web/.vitepress/theme/components/EntityCard.vue   # replace plain-text description with segments v-for; populate "Used in" slot
```

### Deleted

```
n/a
```

---

## Tasks

### Task 1 -- Populate source-link REPOS for ktx/mvdsv/qwcl; document F6 omissions

**Goal:** Wire the three SHA-bearing codebases (ktx/mvdsv/qwcl) into `lib/source-link.ts`;
leave qtv/qwfwd explicitly `undefined` with a comment explaining the F6 constraint.

**Files:**
- `apps/docs-web/lib/source-link.ts` (modified)

**Steps:**

- [ ] Edit `apps/docs-web/lib/source-link.ts` to replace the placeholder REPOS map and add
  the F6 explanation. Full new file content:

```ts
// Derives a GitHub source URL for a given entity (D8/D11). Pure -- no framework
// imports. Returns undefined when the URL cannot be constructed (D11 graceful
// degradation); the card then shows plain file:line as text.
import type { SnapshotMeta, SourceRef } from './types'

// Per-codebase GitHub repo + source-path prefix. Prefix is the repo-relative
// directory that must be prepended to source_ref.file to reach the file at repo
// root. Verified 2026-06-10 against live source_ref values in docs-web/data/ and
// the research/repos/ git remotes:
//
//   ezquake: repo QW-Group/ezquake-source, source_ref starts 'src/', prefix 'src/'
//   ktx:     repo QW-Group/ktx,            source_ref starts 'src/', prefix 'src/'
//   mvdsv:   repo QW-Group/mvdsv,          source_ref starts 'src/', prefix 'src/'
//   qwcl:    repo id-Software/Quake,       source_ref is flat filename,
//            actual path = QW/client/<file>, prefix 'QW/client/'
//
// qtv and qwfwd are OMITTED because their upstream_commit is a version STRING
// ('1.16-dev' / '1.40-dev'), not a git SHA -- the /blob/{ref}/ template would
// produce a broken link. Both are frozen vendored snapshots with no .git dir
// (no tag resolution possible). Per F6/D11 they degrade to plain file:line text.
const REPOS: Record<string, { repo: string; prefix: string }> = {
  ezquake: { repo: 'QW-Group/ezquake-source', prefix: 'src/' },
  ktx:     { repo: 'QW-Group/ktx',            prefix: 'src/' },
  mvdsv:   { repo: 'QW-Group/mvdsv',          prefix: 'src/' },
  qwcl:    { repo: 'id-Software/Quake',       prefix: 'QW/client/' },
  // qtv:  omitted -- upstream_commit '1.16-dev' is not a SHA (F6)
  // qwfwd: omitted -- upstream_commit '1.40-dev' is not a SHA (F6)
}

export function sourceUrl(
  codebase: string,
  meta: SnapshotMeta,
  ref: SourceRef
): string | undefined {
  const cfg = REPOS[codebase]
  if (cfg === undefined) return undefined
  return `https://github.com/${cfg.repo}/blob/${meta.upstream_commit}/${cfg.prefix}${ref.file}#L${ref.line}`
}
```

**Verification:**
- [ ] `pnpm --dir apps/docs-web exec tsc --noEmit` exits 0.
- [ ] Spot-check by constructing a sample URL manually:
  - ktx: `https://github.com/QW-Group/ktx/blob/67253dc9ab4f643f1e6523a923a41caab9ea587f/src/world.c#L945`
    (first KTX cvar entry from `data/ktx-cvar.json`). Navigate in browser: should return HTTP 200.
  - qwcl: `https://github.com/id-Software/Quake/blob/bf4ac424ce754894ac8f1dae6a3981954bc9852d/QW/client/snd_dma.c#L82`
    (first QWCL cvar entry from `data/qwcl-cvar.json`). Navigate in browser: should return HTTP 200.
  - PASS: URLs resolve without 404. FAIL: 404 -> recheck repo slug or prefix.

**Execution mode:** `inline` -- the full source-link.ts content is shipped above (the REPOS
map is a fixed config, not synthesis); the only judgment was the AUG-1 recon, already done.
Per F12, a task that ships full locked file content is `inline`; the HTTP spot-check is
verification, not code synthesis.

---

### Task 2 -- Extend browse-types.ts with DescriptionSegment, GuideRef, and BrowseRow additions

**Goal:** Add the two new types and the two new optional fields to `BrowseRow` so downstream
modules (cvar-link.ts, guide-index.ts, browse.ts, EntityCard.vue) share a common contract.

**Files:**
- `apps/docs-web/lib/browse-types.ts` (modified)

**Steps:**

- [ ] Edit `apps/docs-web/lib/browse-types.ts` to add the two types and two new fields.
  The additions slot into the existing file; do not rewrite unchanged lines. Add BEFORE the
  `BrowseRow` interface:

```ts
// One span in a pre-computed description segment array (D15, D19). Either plain
// text or a resolved cvar link (within the same codebase). Built at shape time
// by lib/cvar-link.ts; consumed by EntityCard's v-for segments loop.
export type DescriptionSegment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; name: string; anchor: string }

// One entry in the entity->guide reverse-index (D7/D19 amendment 2026-06-09).
// Carries the guide's slug (the concept note's front-matter slug field) and a
// stable URL path on the docs guides portal (e.g., '/guides/<slug>'). In v1
// this array is always empty (no guides-portal surface exists yet).
export interface GuideRef {
  slug: string
  path: string
}
```

  Then add two new optional fields at the end of the `BrowseRow` interface (after `scope?`):

```ts
  // Phase 4 cross-links. Both optional; degrade gracefully (D11).
  descriptionSegments?: DescriptionSegment[]  // pre-computed spans; absent when description has no cvar links
  usedInGuides?: GuideRef[]                   // reverse-index entries; [] in v1 (render suppressed, GUIDES_PORTAL_LIVE=false)
```

**Verification:**
- [ ] `pnpm --dir apps/docs-web exec tsc --noEmit` exits 0.
- [ ] `grep -c "DescriptionSegment\|GuideRef\|usedInGuides\|descriptionSegments" apps/docs-web/lib/browse-types.ts`
  returns 4 (each name appears once in the declaration).

**Execution mode:** `inline` -- pure type additions into a locked file; no code synthesis,
full content specified above.

---

### Task 3 -- Write lib/cvar-link.ts (cvar->cvar resolver module)

**Goal:** Implement the build-time cvar-link resolver that takes a codebase's entity-name set
and an entity's description text, and returns an array of `DescriptionSegment` spans with cvar
names replaced by link spans wherever the name appears as a whole token.

**Files:**
- `apps/docs-web/lib/cvar-link.ts` (created)
- `apps/docs-web/lib/cvar-link.test.ts` (created)

**Steps:**

- [ ] Write `apps/docs-web/lib/cvar-link.ts` with full content:

```ts
// Build-time cvar-to-cvar link resolver (D7/D15/D19). Takes the set of entity
// names for one codebase and a description text, returns pre-computed spans so
// EntityCard renders cvar names as clickable anchors without v-html (D15 / AUG-2).
//
// D19 constraint: resolution is WITHIN one codebase only. Cross-fork auto-link
// would assert a false equivalence (forks share names but differ in meaning).
//
// Detection rule: a cvar name is recognized when it appears as a whole token --
// preceded by a word boundary (start-of-string, whitespace, or punctuation) and
// followed by a word boundary. Most cvar names use underscores (treated as
// word characters for this purpose: a match must be exact).
//
// Performance: name set is sorted longest-first so a longer name wins over a
// shorter prefix when both match at the same position (e.g., 'cl_weaponhide_axe'
// beats 'cl_weaponhide').
//
// Pure -- no fs, no Vue, no framework imports (D15).
import type { DescriptionSegment } from './browse-types'
import { entityAnchor } from './anchor'

// Build a resolver for one codebase's entity-name set. Returns a function that
// accepts a description string and produces the segment array. The set is compiled
// once (call buildCvarLinker) and reused across all entities in the codebase.
export function buildCvarLinker(
  entityNames: string[]
): (description: string) => DescriptionSegment[] {
  if (entityNames.length === 0) {
    return (text) => [{ kind: 'text', text }]
  }

  // Sort longest-first: a greedy scan at each position picks the longest match,
  // preventing a shorter prefix from winning when both overlap.
  const sorted = [...entityNames].sort((a, b) => b.length - a.length)

  // Escape each name for use in a regex alternation.
  const escaped = sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  // Word-boundary pattern: a cvar name must be preceded/followed by a character
  // that is NOT a word character (letter, digit, underscore). Start/end of
  // string also qualifies. We use lookahead/lookbehind for zero-width matching.
  const pattern = new RegExp(
    `(?<![\\w])(?:${escaped.join('|')})(?![\\w])`,
    'g'
  )

  return function linkDescription(text: string): DescriptionSegment[] {
    const segments: DescriptionSegment[] = []
    let last = 0

    for (const match of text.matchAll(pattern)) {
      const start = match.index!
      const name = match[0]

      if (start > last) {
        segments.push({ kind: 'text', text: text.slice(last, start) })
      }
      segments.push({ kind: 'link', name, anchor: entityAnchor(name) })
      last = start + name.length
    }

    if (last < text.length) {
      segments.push({ kind: 'text', text: text.slice(last) })
    }

    // If no links were found, return undefined-signal: a single text segment
    // is equivalent to no linking having occurred. Browse.ts omits the field
    // when the result is a single-text-only segment (optimization: card skips
    // segment render and falls back to descriptionFull plain text).
    return segments
  }
}
```

- [ ] Write `apps/docs-web/lib/cvar-link.test.ts` with full content:

```ts
import { describe, it, expect } from 'vitest'
import { buildCvarLinker } from './cvar-link'

describe('buildCvarLinker', () => {
  const names = ['cl_weaponhide', 'cl_weaponhide_axe', 'sensitivity', 'r_drawviewmodel']

  it('returns a single text segment when no cvar names appear', () => {
    const link = buildCvarLinker(names)
    expect(link('Nothing matches here.')).toEqual([
      { kind: 'text', text: 'Nothing matches here.' }
    ])
  })

  it('links a cvar name in the middle of text', () => {
    const link = buildCvarLinker(names)
    const result = link('Use sensitivity to adjust mouse speed.')
    expect(result).toEqual([
      { kind: 'text', text: 'Use ' },
      { kind: 'link', name: 'sensitivity', anchor: 'sensitivity' },
      { kind: 'text', text: ' to adjust mouse speed.' }
    ])
  })

  it('prefers the longer name over a shorter prefix at the same position', () => {
    // cl_weaponhide_axe starts with cl_weaponhide; the longer name must win.
    const link = buildCvarLinker(names)
    const result = link('Set cl_weaponhide_axe to 0.')
    expect(result.find((s) => s.kind === 'link' && s.name === 'cl_weaponhide_axe')).toBeTruthy()
    expect(result.find((s) => s.kind === 'link' && s.name === 'cl_weaponhide')).toBeUndefined()
  })

  it('does not link a name that is a substring of a non-word boundary token', () => {
    // "sensitivity_scale" contains "sensitivity" but the boundary check must block it.
    const link = buildCvarLinker(names)
    const result = link('Affects sensitivity_scale calculation.')
    expect(result.every((s) => s.kind === 'text')).toBe(true)
  })

  it('links multiple occurrences in one description', () => {
    const link = buildCvarLinker(names)
    const result = link('See r_drawviewmodel and sensitivity.')
    const links = result.filter((s) => s.kind === 'link')
    expect(links).toHaveLength(2)
    expect(links[0]).toMatchObject({ kind: 'link', name: 'r_drawviewmodel' })
    expect(links[1]).toMatchObject({ kind: 'link', name: 'sensitivity' })
  })

  it('returns a single text segment when entity-name set is empty', () => {
    const link = buildCvarLinker([])
    expect(link('some text')).toEqual([{ kind: 'text', text: 'some text' }])
  })

  it('anchor is the case-folded name (D22)', () => {
    const link = buildCvarLinker(['R_DrawViewmodel'])
    const result = link('See R_DrawViewmodel.')
    const seg = result.find((s) => s.kind === 'link')
    expect(seg).toMatchObject({ kind: 'link', name: 'R_DrawViewmodel', anchor: 'r_drawviewmodel' })
  })
})
```

**Verification:**
- [ ] `pnpm --dir apps/docs-web test` -- all tests pass (the new test file runs under vitest).
- [ ] `pnpm --dir apps/docs-web exec tsc --noEmit` exits 0.
- [ ] `grep -nE "fetch|readFileSync|\.filter\(|\.map\(|\.reduce\(" apps/docs-web/lib/cvar-link.ts`
  returns empty (the matchAll loop is NOT a `.filter()/.map()/.reduce()` call -- it is an
  explicit for-of loop; the grep gate stays green).

**Execution mode:** `subagent (Sonnet MAX)` -- the resolver involves a judgment-dense regex
design (longest-first, word-boundary semantics, matchAll per CLAUDE.md convention, single-vs-
multiple-segment optimization), plus a test suite with 7 edge-case cases. Synthesis from spec
+ existing anchor.ts + the CLAUDE.md `matchAll` convention; multi-file judgment.

---

### Task 4 -- Write lib/guide-index.ts (entity->guide reverse-index module)

**Goal:** Implement the build-time guide reverse-index that reads `apps/qw-oracle/curated/
concept-notes/*.md` front-matter at docs-build time, parses `related_entities`, and exposes
a lookup by `<codebase>:<kind>:<name>`. Handles empty/absent corpus as the DEFAULT path (D11,
D19 amendment, AUG-3).

**Files:**
- `apps/docs-web/lib/guide-index.ts` (created)
- `apps/docs-web/lib/guide-index.test.ts` (created)

**Steps:**

- [ ] Write `apps/docs-web/lib/guide-index.ts` with full content:

```ts
// Build-time entity->guide reverse-index (D7/D15/D19 amendment 2026-06-09).
//
// Reads apps/qw-oracle/curated/concept-notes/*.md front-matter at docs-build
// time, parses each note's `related_entities` list (format: '<project>:<kind>:<name>'
// or '<project>:<kind>:<name>:<scope>'), and builds a reverse lookup map keyed
// by '<project>:<kind>:<name>' (3 segments only; the 4th scope segment is dropped
// -- it is a qualifier on the entity ref, not part of the stable identity used
// by the docs reverse-index). Entries with kind == 'commit' are silently skipped
// (not a docs-surface entity type).
//
// ABSENT corpus is handled gracefully (D11): if the curated/ directory is absent,
// readdirSync throws and the function returns an empty Map. But note: the LIVE
// corpus is NON-EMPTY -- 52 notes resolve 286 refs to real docs entities (verified
// cold). So buildGuideIndex() normally returns a NON-EMPTY map.
//
// RENDER SUPPRESSION (D7/D21, the load-bearing v1 constraint):
// The guides portal (the /guides/<slug> link target) is a LATER docs-web arc.
// Until it ships, rendering any "Used in" link would be a dead 404 (D7 "no dead
// links" + D21 "no guides portal in v1"). The reverse-index is BUILT + unit-tested
// now (wiring proof, D22-style), but render is SUPPRESSED via the flag below. The
// browse.ts wiring point reads GUIDES_PORTAL_LIVE and sets usedInGuides = [] for
// every entity while it is false, so v1 renders ZERO "Used in" links BY
// CONSTRUCTION -- not because the corpus is empty (it isn't). Flip to true in the
// arc that ships the portal. See D7/D19/D21 amendment 2026-06-09.
//
// Uses Node fs/path (build-time only); the module is imported by browse.ts (a
// build-time module), never by a Vue component. D15 clean: logic lives here,
// not in the card.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { GuideRef } from './browse-types'

// Render gate (D7/D21). FALSE in docs v1: the guides portal does not exist yet,
// so any "Used in" link would 404. The reverse-index is built + tested regardless
// (the mechanism is proven independent of this flag); only RENDER is gated. The
// arc that ships the guides portal flips this to true.
export const GUIDES_PORTAL_LIVE = false

// Minimal YAML front-matter extractor: strips the leading/trailing '---' fences
// and returns the block as a string. Returns null if the file does not start
// with '---'. Does NOT use a full YAML parser -- the related_entities list is
// structurally simple (a YAML list of strings), parseable with split/trim.
function extractFrontmatter(content: string): string | null {
  if (!content.startsWith('---')) return null
  const end = content.indexOf('\n---', 3)
  if (end === -1) return null
  return content.slice(4, end)
}

// Parse the `related_entities:` YAML list from a raw front-matter string.
// Returns an array of entry strings. Handles the YAML list-item format:
//   related_entities:
//     - project:kind:name
// Returns empty array when the key is absent or the list is empty.
function parseRelatedEntities(fm: string): string[] {
  const lines = fm.split('\n')
  const startIdx = lines.findIndex((l) => l.trimStart().startsWith('related_entities:'))
  if (startIdx === -1) return []

  const entries: string[] = []
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    // A list item starts with optional whitespace + '- '
    if (/^\s+-\s+/.test(line)) {
      entries.push(line.replace(/^\s+-\s+/, '').trim())
    } else if (line.trimStart().length > 0 && !/^\s/.test(line) && !line.startsWith(' ')) {
      // A non-indented non-empty line signals a new top-level YAML key; stop.
      break
    } else if (line.trim() === '') {
      // Blank lines between items are OK; a blank line after the block stops.
      if (entries.length > 0) break
    }
  }
  return entries
}

// Normalize a related_entities entry to a 3-segment key. Drops the 4th scope
// segment if present. Returns null for entries that are not valid docs-surface
// entity references (fewer than 3 segments, or kind == 'commit').
function toIndexKey(entry: string): string | null {
  const parts = entry.split(':')
  if (parts.length < 3) return null
  const [project, kind, name] = parts
  if (kind === 'commit') return null
  if (!project || !kind || !name) return null
  return `${project}:${kind}:${name}`
}

// Parse a note's slug from its front-matter string. Falls back to null.
function parseSlug(fm: string): string | null {
  const m = fm.match(/^slug:\s*(.+)$/m)
  return m ? m[1].trim() : null
}

// Absolute path to the concept-notes directory. Resolved relative to this
// module's location at apps/docs-web/lib/ via the SAME fileURLToPath pattern
// lib/snapshot.ts uses (consistency; no import.meta.dirname Node-version risk).
// qw-oracle is a SIBLING of docs-web under apps/, so the climb is TWO '..':
// lib/ -> docs-web/ -> apps/, then into qw-oracle/curated/concept-notes/.
// Verified 2026-06-10: this resolves to
// /home/paradoks/projects/quakeworld/apps/qw-oracle/curated/concept-notes (exists).
// (An earlier draft used three '..', overshooting to a nonexistent
// monorepo-root/qw-oracle -- that would have silently emptied the index.)
const NOTES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'qw-oracle',
  'curated',
  'concept-notes'
)

// Build the reverse index. Exported for testing (pass a custom notesDir to
// test against fixture content). build-time callers use the default.
export function buildGuideIndex(
  notesDir: string = NOTES_DIR
): Map<string, GuideRef[]> {
  const index = new Map<string, GuideRef[]>()

  let files: string[]
  try {
    files = readdirSync(notesDir).filter((f) => f.endsWith('.md') && !f.startsWith('_'))
  } catch {
    // Directory absent -- graceful empty-corpus path (D11, AUG-3).
    return index
  }

  for (const file of files) {
    const content = readFileSync(join(notesDir, file), 'utf-8')
    const fm = extractFrontmatter(content)
    if (!fm) continue

    const slug = parseSlug(fm)
    if (!slug) continue

    const entries = parseRelatedEntities(fm)
    for (const entry of entries) {
      const key = toIndexKey(entry)
      if (!key) continue

      const ref: GuideRef = {
        slug,
        path: `/guides/${slug}`,
      }

      const existing = index.get(key)
      if (existing) {
        existing.push(ref)
      } else {
        index.set(key, [ref])
      }
    }
  }

  return index
}

// Convenience lookup: returns the GuideRef array for a given entity, or an
// empty array when the entity has no guide associations (the default in v1).
export function getGuideRefs(
  index: Map<string, GuideRef[]>,
  codebase: string,
  type: string,
  name: string
): GuideRef[] {
  return index.get(`${codebase}:${type}:${name}`) ?? []
}
```

- [ ] Write `apps/docs-web/lib/guide-index.test.ts` with full content:

```ts
import { describe, it, expect } from 'vitest'
import { buildGuideIndex, getGuideRefs, GUIDES_PORTAL_LIVE } from './guide-index'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdtempSync, writeFileSync } from 'node:fs'

function makeFixtureDir(notes: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'guide-index-test-'))
  for (const [name, content] of Object.entries(notes)) {
    writeFileSync(join(dir, name), content, 'utf-8')
  }
  return dir
}

describe('buildGuideIndex', () => {
  it('returns empty map for absent directory', () => {
    const idx = buildGuideIndex('/nonexistent/path')
    expect(idx.size).toBe(0)
  })

  it('returns empty map when no notes carry related_entities', () => {
    const dir = makeFixtureDir({
      'plain.md': '---\ntitle: "No entities"\nslug: plain\n---\n\nBody.',
    })
    const idx = buildGuideIndex(dir)
    expect(idx.size).toBe(0)
  })

  it('indexes a note that has related_entities', () => {
    const dir = makeFixtureDir({
      'weapon-scripts.md': [
        '---',
        'slug: weapon-scripts',
        'related_entities:',
        '  - ezquake:cvar:cl_weaponpreselect',
        '  - ezquake:command:weapon',
        '---',
        '',
        'Body.',
      ].join('\n'),
    })
    const idx = buildGuideIndex(dir)
    expect(idx.size).toBe(2)
    expect(idx.get('ezquake:cvar:cl_weaponpreselect')).toEqual([
      { slug: 'weapon-scripts', path: '/guides/weapon-scripts' }
    ])
  })

  it('drops commit-kind entries', () => {
    const dir = makeFixtureDir({
      'a.md': [
        '---',
        'slug: a',
        'related_entities:',
        '  - ezquake:commit:7c328aa4',
        '  - ezquake:cvar:sensitivity',
        '---',
      ].join('\n'),
    })
    const idx = buildGuideIndex(dir)
    expect(idx.has('ezquake:commit:7c328aa4')).toBe(false)
    expect(idx.has('ezquake:cvar:sensitivity')).toBe(true)
  })

  it('normalizes 4-segment entries to 3-segment keys', () => {
    const dir = makeFixtureDir({
      'b.md': [
        '---',
        'slug: b',
        'related_entities:',
        '  - mvdsv:info_key:w_rank:userinfo',
        '---',
      ].join('\n'),
    })
    const idx = buildGuideIndex(dir)
    // 4th segment ':userinfo' is dropped; key is 3 segments
    expect(idx.has('mvdsv:info_key:w_rank')).toBe(true)
    expect(idx.has('mvdsv:info_key:w_rank:userinfo')).toBe(false)
  })

  it('skips files starting with underscore', () => {
    const dir = makeFixtureDir({
      '_private.md': '---\nslug: private\nrelated_entities:\n  - ezquake:cvar:x\n---\n',
    })
    const idx = buildGuideIndex(dir)
    expect(idx.size).toBe(0)
  })

  it('accumulates multiple notes referencing the same entity', () => {
    const dir = makeFixtureDir({
      'note1.md': '---\nslug: note1\nrelated_entities:\n  - ezquake:cvar:sensitivity\n---\n',
      'note2.md': '---\nslug: note2\nrelated_entities:\n  - ezquake:cvar:sensitivity\n---\n',
    })
    const idx = buildGuideIndex(dir)
    const refs = idx.get('ezquake:cvar:sensitivity')
    expect(refs).toHaveLength(2)
  })
})

describe('getGuideRefs', () => {
  it('returns empty array for unknown entity', () => {
    const idx = new Map()
    expect(getGuideRefs(idx, 'ezquake', 'cvar', 'cl_weaponpreselect')).toEqual([])
  })
})

describe('GUIDES_PORTAL_LIVE (render suppression, D7/D21)', () => {
  it('is false in docs v1 -- the guides portal does not exist yet', () => {
    // This is the BY-CONSTRUCTION no-dead-links guarantee. While false, browse.ts
    // sets usedInGuides=[] for every entity even though buildGuideIndex resolves
    // real refs. Do NOT flip until the guides portal arc ships.
    expect(GUIDES_PORTAL_LIVE).toBe(false)
  })
})

describe('live corpus (proves the mechanism against real notes)', () => {
  it('builds a NON-EMPTY index from the real concept-notes dir', () => {
    // The default-arg path reads apps/qw-oracle/curated/concept-notes. The live
    // corpus carries 286 resolvable refs, so the index is non-empty -- which is
    // exactly WHY render must be suppressed (GUIDES_PORTAL_LIVE) rather than
    // relying on an empty corpus.
    const idx = buildGuideIndex()
    expect(idx.size).toBeGreaterThan(0)
    // Spot-check a ref verified present in apps/docs-web/data/ktx-cvar.json.
    expect(getGuideRefs(idx, 'ktx', 'cvar', 'k_mode').length).toBeGreaterThan(0)
  })
})
```

**Verification:**
- [ ] `pnpm --dir apps/docs-web test` -- all tests pass (10 tests in guide-index.test.ts:
  7 buildGuideIndex + 1 getGuideRefs + 1 GUIDES_PORTAL_LIVE + 1 live-corpus; plus the 7 in
  cvar-link.test.ts).
- [ ] The live-corpus test asserts `buildGuideIndex().size > 0` AND `getGuideRefs(...,'ktx',
  'cvar','k_mode').length > 0` -- this is BOTH the proof the path resolves correctly (DEFECT 2:
  a wrong path would silently return an empty index and FAIL this test) AND the proof the corpus
  is non-empty (DEFECT 1 premise).
- [ ] `pnpm --dir apps/docs-web exec tsc --noEmit` exits 0.
- [ ] `grep -nE "fetch\b" apps/docs-web/lib/guide-index.ts` returns empty (only `readFileSync`
  / `readdirSync` are used, not `fetch` -- the D15 grep for `fetch(` should not match the
  declaration `readdirSync`).

**Execution mode:** `subagent (Sonnet MAX)` -- the module involves multi-judgment decisions:
minimal front-matter parsing without a full YAML library, the `fileURLToPath(import.meta.url)`
path resolution (matching lib/snapshot.ts's proven pattern -- TWO '..' to reach the sibling
qw-oracle under apps/, NOT three), the GUIDES_PORTAL_LIVE render-suppression flag (D7/D21:
the corpus IS non-empty so render must be gated by construction), empty-corpus graceful
degradation, the 4-segment normalization rule, commit-kind filtering, and the test fixture
pattern using tmpdir plus a live-corpus assertion. The reasoning density justifies MAX tier.

---

### Task 5 -- Wire cvar-link and guide-index into browse.ts + update BrowseRow assembly

**Goal:** Call `buildCvarLinker` inside `shapeBrowse` in `lib/browse.ts` so that `BrowseRow`
entries carry `descriptionSegments` (where cvar links exist), and wire `usedInGuides` through
the `GUIDES_PORTAL_LIVE` gate so that v1 attaches `[]` for every entity (render suppressed,
D7/D21) while keeping the reverse-index call ready behind the flag.

**Files:**
- `apps/docs-web/lib/browse.ts` (modified)

**Steps:**

- [ ] Read `apps/docs-web/lib/browse.ts` cold and insert at the marked positions below.
- [ ] Edit `browse.ts`:
  1. Add two new imports after the existing import block:
     ```ts
     import { buildCvarLinker } from './cvar-link'
     import { buildGuideIndex, getGuideRefs, GUIDES_PORTAL_LIVE } from './guide-index'
     ```
  2. Inside `shapeBrowse`, before the `snap.entries.map(...)` call, add:
     ```ts
     // Build the cvar-link resolver for this codebase's entity-name set (D19:
     // within-codebase only). Entity names come from the snapshot entries.
     const allNames = snap.entries.map((e) => e.name)
     const linkDescription = buildCvarLinker(allNames)

     // Build the guide reverse-index ONLY when the guides portal is live (D7/D21).
     // In v1 GUIDES_PORTAL_LIVE is false, so we skip the per-page note reads
     // entirely and attach [] below -- zero "Used in" links render by construction
     // (the corpus is NON-EMPTY; rendering its refs would be 286 dead 404s).
     const guideIdx = GUIDES_PORTAL_LIVE ? buildGuideIndex() : undefined
     ```
  3. Inside the `snap.entries.map((e) => {...})` body, after `scope: e.scope,` add the
     gated reverse-index lookup. While `GUIDES_PORTAL_LIVE` is false this is always `[]`:
     ```ts
     // D7/D21: suppressed in v1. When the portal ships (flag true), guideIdx is
     // built and this returns the entity's real guide refs.
     usedInGuides: guideIdx ? getGuideRefs(guideIdx, codebase, type, e.name) : [],
     ```
  4. After `usedInGuides`, add the description segments field. The segments are only
     attached when linking actually occurred (more than one segment, or the single segment
     is a link):
     ```ts
     descriptionSegments: (() => {
       if (!e.description) return undefined
       const segs = linkDescription(e.description)
       // A single text-only segment means no links found; omit the field so
       // EntityCard falls back to plain descriptionFull (no performance penalty).
       if (segs.length === 1 && segs[0].kind === 'text') return undefined
       return segs
     })(),
     ```

**Verification:**
- [ ] `pnpm --dir apps/docs-web exec tsc --noEmit` exits 0.
- [ ] `pnpm --dir apps/docs-web build` exits 0 (no build error; all 28 routes emitted).
- [ ] `grep -rl "/guides/" apps/docs-web/.vitepress/dist` returns empty -- the rendered HTML
  carries ZERO `/guides/<slug>` links (the D7/D21 no-dead-link guarantee, enforced by
  GUIDES_PORTAL_LIVE=false). PASS: empty. FAIL: any match -> the flag gate was bypassed.
- [ ] `grep -nE "fetch\(|readFileSync|\.filter\(|\.map\(|\.reduce\(" apps/docs-web/lib/browse.ts`
  -- `readFileSync` and `.map(` calls in browse.ts are expected (browse.ts is a build-time
  module that calls `snap.entries.map(...)` and calls modules that use `readFileSync`).
  The D15 grep gate applies to Vue COMPONENTS, not to lib/ modules. Confirm no grep leakage
  into Entity*.vue components.

**Execution mode:** `subagent (Sonnet medium)` -- targeted single-file integration: read one
live file, add 2 import statements + 3 code blocks (incl. the GUIDES_PORTAL_LIVE render gate)
in well-defined positions; the positions and content are fully specified above; bounded
single-file judgment.

---

### Task 6 -- Update EntityCard.vue: description segments loop + "Used in" slot

**Goal:** Replace the current plain-text description paragraph in `EntityCard.vue` with a
segments `v-for` loop that renders text spans and `<a>` link spans, and populate the dormant
"Phase 4 reverse-index slot" with a "Used in" display gated on `usedInGuides.length > 0`. In
v1 that array is always `[]` (browse.ts suppresses it via GUIDES_PORTAL_LIVE), so the slot
renders nothing -- but the card markup is ready for when the portal ships. The card carries
NO flag logic itself (D15: the suppression decision lives in browse.ts; the card only checks
whether the pre-shaped array is non-empty).

**Files:**
- `apps/docs-web/.vitepress/theme/components/EntityCard.vue` (modified)

**Steps:**

- [ ] Read `EntityCard.vue` cold. The description is at line 57:
  ```html
  <!-- Full description: plain text in v1, line breaks preserved (no auto-linking) -->
  <p v-if="row.descriptionFull !== undefined" style="white-space: pre-line">{{ row.descriptionFull }}</p>
  ```
  And the dormant slot is at line 116:
  ```html
  <!-- Phase 4 reverse-index slot: deliberately empty in v1 (no dead UI). -->
  ```

- [ ] Replace the description block (lines 56-57) with:
  ```html
  <!-- Full description: segments rendered where cvar links were resolved at build
       time (D7/D15/D19); falls back to plain text when no links exist (D11). -->
  <template v-if="row.descriptionSegments !== undefined">
    <p style="white-space: pre-line">
      <template v-for="seg in row.descriptionSegments" :key="seg.kind === 'text' ? seg.text.slice(0, 16) : seg.name">
        <a
          v-if="seg.kind === 'link'"
          :href="'#' + seg.anchor"
          class="text-primary underline decoration-dotted"
          @click.stop
        >{{ seg.name }}</a>
        <template v-else>{{ seg.text }}</template>
      </template>
    </p>
  </template>
  <p v-else-if="row.descriptionFull !== undefined" style="white-space: pre-line">{{ row.descriptionFull }}</p>
  ```

- [ ] Replace the "Phase 4 reverse-index slot" comment (line 116) with:
  ```html
  <!-- Entity->guide reverse-index (D7/D19/D21 amendment 2026-06-09). Renders only
       when usedInGuides is non-empty. In v1 browse.ts always passes [] (render
       suppressed via GUIDES_PORTAL_LIVE -- the guides portal does not exist yet,
       so a /guides/<slug> link would be a dead 404), so this slot shows nothing.
       The markup is ready for when the portal arc flips the flag. -->
  <div v-if="row.usedInGuides !== undefined && row.usedInGuides.length > 0" class="mt-3">
    <span class="font-semibold">Used in:</span>
    <span v-for="(g, i) in row.usedInGuides" :key="g.slug">
      <template v-if="i > 0">, </template>
      <a :href="g.path" class="underline">{{ g.slug }}</a>
    </span>
  </div>
  ```

- [ ] Do NOT change the `import type` line. The existing
  `import type { BrowseRow, ColumnKey } from '../../../lib/browse-types'` is sufficient: the
  template reads `seg.kind`/`seg.name`/`seg.text` and `g.slug`/`g.path` through the `row` prop,
  whose type (`BrowseRow`) already carries `descriptionSegments` and `usedInGuides`. The card
  references neither `DescriptionSegment` nor `GuideRef` by name, so importing them would be
  dead imports -- leave them out (verified: property access on `row` only).
- [ ] NOTE on type-checking scope: `tsconfig.json` `include` is `["lib/**/*.ts"]` -- it does
  NOT cover `.vue` files, so `tsc --noEmit` (Check 1) does not type-check this template. The
  `.vue` type-safety net is the VitePress build (Check 3): a template type error (e.g. accessing
  a field not on `BrowseRow`) surfaces as a build failure. This matches how Phase 2b/3 verified
  components; no change to the verification regime.

**Verification:**
- [ ] `pnpm --dir apps/docs-web exec tsc --noEmit` exits 0.
- [ ] `pnpm --dir apps/docs-web build` exits 0.
- [ ] `grep -nE "ezquake|'cvar'|'command'|'macro'" apps/docs-web/.vitepress/theme/components/Entity*.vue`
  returns empty (D14 grep gate; the new `<a>` renders `seg.name` from a prop, no codebase/type
  literals in the template).
- [ ] `grep -nE "fetch\(|readFileSync|\.filter\(|\.map\(|\.reduce\(" apps/docs-web/.vitepress/theme/components/Entity*.vue`
  returns empty (D15 grep gate; `v-for` over a pre-shaped prop is not a `.map()` call).

**Execution mode:** `subagent (Sonnet medium)` -- targeted single-file Vue edit; two precise
replace operations with full replacement content specified above; the judgment is minimal
(confirm no codebase literal leaks into the template).

---

## Verification (phase boundary)

Run each check in order. Report PASS or FAIL with the output.

**Check 1 -- TypeScript compiles clean:**
```sh
pnpm --dir apps/docs-web exec tsc --noEmit
```
PASS condition: exits 0, zero errors.
FAIL condition: any type error -> diagnose at the type boundary (most likely BrowseRow
field mismatch between browse.ts and browse-types.ts).

**Check 2 -- All unit tests pass:**
```sh
pnpm --dir apps/docs-web test
```
PASS condition: exits 0; test count >= 30 (23 existing + 7 cvar-link + 7 guide-index = 37).
FAIL condition: any test failure -> fix before proceeding.

**Check 3 -- VitePress build exits 0 and emits 28 routes:**
```sh
pnpm --dir apps/docs-web build
find apps/docs-web/.vitepress/dist -name '*.html' | wc -l
```
PASS condition: build exits 0; HTML count >= 28.
FAIL condition: any build error OR HTML count < 28 -> diagnose in build log.

**Check 4 -- D14 grep gate (no codebase/type literals in components):**
```sh
grep -nE "ezquake|'cvar'|'command'|'macro'" apps/docs-web/.vitepress/theme/components/Entity*.vue
```
PASS condition: empty output.
FAIL condition: any match -> remove the literal; use a data-derived value from props.

**Check 5 -- D15 grep gate (no logic in components):**
```sh
grep -nE "fetch\(|readFileSync|\.filter\(|\.map\(|\.reduce\(" apps/docs-web/.vitepress/theme/components/Entity*.vue
```
PASS condition: empty output.
FAIL condition: any match -> relocate the logic to a lib/ module.

**Check 6 -- Source link spot-check (ktx, qwcl):**

Construct and navigate to:
- ktx: `https://github.com/QW-Group/ktx/blob/67253dc9ab4f643f1e6523a923a41caab9ea587f/src/world.c#L945`
- qwcl: `https://github.com/id-Software/Quake/blob/bf4ac424ce754894ac8f1dae6a3981954bc9852d/QW/client/snd_dma.c#L82`

PASS condition: both URLs return HTTP 200 and show the expected source line.
FAIL condition: 404 -> recheck REPOS entry in source-link.ts.

**Check 7 -- Verify qtv/qwfwd still degrade to plain text:**

From the built site, open an expanded qtv cvar card and confirm:
- Source shows plain `<file>:<line>` with no `<a>` tag.
- No broken link renders.

PASS condition: plain text fallback confirmed. FAIL condition: broken link visible.

**Check 8 -- cvar->cvar links present on an ezQuake card with a cross-referencing description:**

Open the built site, navigate to `ezquake/cvar`, expand a cvar whose description mentions another
cvar name (e.g., `cl_weaponhide_axe` mentions `cl_weaponhide`). Confirm the mentioned cvar name
renders as a clickable `<a>` link pointing to `#cl_weaponhide` on the same page.

PASS condition: link renders, clicking scrolls to the correct row.
FAIL condition: no link visible -> debug the cvar-link resolver and the browse.ts wiring.

**Check 9 -- "Used in" slot renders NOTHING because GUIDES_PORTAL_LIVE is false (D7/D21):**

This is the no-dead-link guarantee. The corpus is NON-EMPTY (it resolves 286 refs), so the
slot is suppressed BY CONSTRUCTION (the flag), not by an empty corpus.
```sh
grep -rl "/guides/" apps/docs-web/.vitepress/dist
grep -rl "Used in:" apps/docs-web/.vitepress/dist
```
Also open an expanded ktx cvar card (e.g. `k_mode`, which IS anchored by a concept note) and
confirm no "Used in:" row appears.

PASS condition: both greps return empty AND no "Used in" row is visible on the `k_mode` card.
FAIL condition: any `/guides/` link OR any "Used in:" row in the dist -> the GUIDES_PORTAL_LIVE
gate was bypassed in browse.ts (Task 5) or EntityCard.vue (Task 6). This would ship dead 404s
(D7/D21 violation). Do NOT proceed to Phase 5 until zero.

**Check 10 -- guide-index path resolves to the live corpus (DEFECT-2 regression guard):**

The guide-index unit test `live corpus` (Task 4) asserts `buildGuideIndex().size > 0` and
`getGuideRefs(...,'ktx','cvar','k_mode').length > 0`. A wrong NOTES_DIR path (the three-'..'
overshoot the earlier draft had) silently returns an EMPTY index and FAILS this test. Confirm
the test passes as part of Check 2.

PASS condition: the `live corpus` test passes (the path resolves; index is non-empty).
FAIL condition: `buildGuideIndex().size` is 0 against the real corpus -> the NOTES_DIR climb
is wrong (must be TWO '..' to reach the sibling qw-oracle under apps/, matching lib/snapshot.ts).

---

## Outputs to next phase

- All 6 codebases have source links wired (ktx/mvdsv/qwcl via GitHub blob; ezquake as before;
  qtv/qwfwd degrade gracefully per F6/D11).
- cvar->cvar auto-linking is live: expanded ezQuake cvar cards (and any other codebase cvar
  cards whose descriptions mention cvar names) show clickable dotted-underline links.
- The entity->guide reverse-index module is built, unit-tested against the live (non-empty)
  corpus, and integrated -- but render is SUPPRESSED via `GUIDES_PORTAL_LIVE=false`, so v1
  renders zero "Used in" links by construction (no dead links, D7/D21).
- The `BrowseRow` contract carries `descriptionSegments?` and `usedInGuides?` -- the guides
  portal surface (a later arc) only needs to flip `GUIDES_PORTAL_LIVE` to `true` (and confirm
  the `/guides/<slug>` paths match the portal's actual routes); the card slot, the reverse-index,
  and the wiring are already in place.
- All 30+ tests pass (23 existing + 7 cvar-link + 10 guide-index); `tsc --noEmit` and
  `docs:build` are clean.
- Phase 5 (deploy) can proceed: the site is feature-complete for v1.

---

## Open questions / deferred items

**Q1: RESOLVED -- guide-index.ts path resolution.**
- Question (closed): how to resolve the concept-notes directory path robustly at VitePress
  build time, without the `import.meta.dirname` Node-version risk.
- Resolution: use `fileURLToPath(import.meta.url)` + `dirname` -- the SAME pattern lib/snapshot.ts
  already uses (proven in the shipped build). The climb is TWO '..' (lib/ -> docs-web/ -> apps/,
  then into qw-oracle/curated/concept-notes/); verified to resolve to the existing directory.
  The earlier `import.meta.dirname` + three-'..' draft is replaced. No open question remains;
  recorded for audit.
- Who can resolve: n/a (closed at boundary).

**Q2: `key` attribute on the segments v-for loop.**
- Question: the `key` for text segments uses `seg.text.slice(0, 16)` as a proxy. If two
  consecutive text segments share the same first 16 characters, Vue may misidentify them.
  In practice this is unlikely in cvar descriptions (each text segment surrounds a cvar name
  and the surrounding context differs), but it is not zero-risk.
- Default chosen for now: the `slice(0, 16)` approach ships; if a duplicate-key Vue warning
  appears in the browser console, add an index: `v-for="(seg, i) in row.descriptionSegments" :key="i"`.
  Index keys are safe here (the segment array is fully stable at render time -- no in-place
  mutation).
- Who can resolve: Phase 4 executor during floor-check.

**Q3: v-html avoidance -- the segment loop introduces a per-segment `v-if` branch.**
- Question: the AUG-2 note recommends the segments approach over v-html (XSS + logic hiding).
  The current plan implements this exactly. No open question; recording for audit.
- Default: CONFIRMED -- no v-html anywhere in this phase.
- Who can resolve: n/a.

**Q4: RESOLVED -- qtv/qwfwd source links omitted by construction (F6/D11).**
- Question (closed): AUG-1 says "version-tag -> a tag-based ref IFF that tag exists in the
  repo, else omit (D11)". The vendored copies have no `.git` dir and no tag evidence; their
  `upstream_commit` is a version string (`1.16-dev`/`1.40-dev`), not a SHA.
- Resolution: OMIT qtv/qwfwd from REPOS -> `sourceUrl` returns `undefined` -> the card shows
  plain `file:line`. This is the safe path: shipping a `/blob/1.16-dev/` URL with no
  corresponding git tag would be a broken link (the exact failure F6 warns about). Boundary
  Check 7 confirms qtv/qwfwd render plain text with no `<a>`. Not deferred to a mid-flight
  operator call -- the omit is the by-construction default. (If a future arc confirms an
  upstream git TAG named `1.16-dev`/`1.40-dev` exists, that arc adds the entry with a
  tag-aware URL builder; out of scope here.)
- Who can resolve: n/a (closed at boundary).

**Q5: gray-matter vs hand-rolled front-matter parsing in guide-index.ts.**
- Question: `gray-matter` is used in qw-oracle for front-matter parsing but is NOT in
  docs-web's `package.json`. The plan uses a minimal hand-rolled parser to avoid adding a
  dep. The hand-rolled parser handles the specific YAML structure of related_entities (a flat
  list of strings); it is not a general YAML parser and would fail on multi-line values or
  complex nesting. No concept notes today use complex front-matter in related_entities.
- Default chosen for now: hand-rolled parser (no new dep, simpler, handles the actual corpus
  shape). If the corpus later uses complex YAML in related_entities, add `gray-matter` then.
- Who can resolve: Phase 4 executor, if the hand-rolled parser fails during unit tests.

**Q6: AUG-4 scope boundary -- cvar-link styling is in scope; broader visual polish is NOT.**
- Note (settled, recorded for audit): Phase 4 adds `text-primary underline decoration-dotted`
  to cvar link `<a>` tags. This is the spec-prescribed visual signal ("rendered green-dotted",
  spec section 6 cross-links bullet) -- a FUNCTIONAL part of the cvar->cvar deliverable, not
  decorative polish. It is therefore in Phase-4 scope and NOT a drift into the F14 pass.
- The deferred F14 pre-deploy visual-polish pass (daisyUI include trim, D10 "adopt vikpe's
  theme", density/spacing) is NOT addressed here and stays a separate pre-Phase-5 task (AUG-4).
- Who can resolve: n/a (in-scope decision settled; F14 pass owned elsewhere).

---

## Recovery (if verification fails)

**If Check 1 (tsc) fails:**
Most likely: a type mismatch on `descriptionSegments` or `usedInGuides` between browse.ts
and browse-types.ts. Check that the IIFE in browse.ts returns `DescriptionSegment[] | undefined`
and the `BrowseRow` field is typed `descriptionSegments?: DescriptionSegment[]`. Ensure
`DescriptionSegment` is imported by browse.ts.

**If Check 2 (tests) fails:**
The cvar-link tests are the most likely failure point. If the longest-first regex fails to
prefer `cl_weaponhide_axe` over `cl_weaponhide`, verify the sort in `buildCvarLinker` is
`b.length - a.length` (descending). If the word-boundary test fails, check the lookbehind/
lookahead syntax against the Node.js version (lookbehind requires Node >= 10.x; the harness
uses Node LTS so this should be fine).

**If Check 2 (tests) -- the `live corpus` guide-index test fails (`buildGuideIndex().size` is 0):**
The NOTES_DIR path does not resolve to the real corpus. The climb must be TWO '..'
(lib/ -> docs-web/ -> apps/, then qw-oracle/curated/concept-notes/), using
`fileURLToPath(import.meta.url)` + `dirname` like lib/snapshot.ts. A three-'..' climb overshoots
to a nonexistent monorepo-root/qw-oracle and silently returns an empty index. Fix the path; do
NOT relax the test to accept an empty index.

**If Check 3 (build) fails with an error:**
Check whether `buildGuideIndex()` throws -- but note it is only CALLED when GUIDES_PORTAL_LIVE
is true, so in v1 it does not run during build. If a path/fs error appears, confirm Task 5's
gate `GUIDES_PORTAL_LIVE ? buildGuideIndex() : undefined` is intact (v1 must skip the call).

**If Check 6 (source link spot-check) fails with 404:**
For ktx/mvdsv: re-verify the SHA in `data/<codebase>-cvar.json` `_meta.upstream_commit` and
cross-check against `research/repos/<codebase>` git log. For qwcl: verify the id-Software/Quake
repo still hosts `bf4ac424` (it is a stable historic commit; this should not regress).

**If Check 8 (cvar links) shows no links on ezQuake cards:**
Check whether `browse.ts` calls `buildCvarLinker(allNames)` with the correct entity-name array
(must include ALL entities' names for the codebase, not just the current entity's). Verify
`shapeBrowse` computes `allNames` from `snap.entries.map((e) => e.name)` BEFORE the `.map()`
call that builds rows, and that `linkDescription` is called inside the map body.

**If Check 9 (a "Used in" row OR a `/guides/` link renders in v1):**
The GUIDES_PORTAL_LIVE gate was bypassed -- this is a D7/D21 violation (dead 404 links) and
MUST be fixed before Phase 5, not deferred. Two enforcement points must both hold:
1. browse.ts (Task 5): `const guideIdx = GUIDES_PORTAL_LIVE ? buildGuideIndex() : undefined`
   and `usedInGuides: guideIdx ? getGuideRefs(...) : []`. While the flag is false, every row's
   `usedInGuides` is `[]`.
2. guide-index.ts (Task 4): `export const GUIDES_PORTAL_LIVE = false`.
   Verify the flag is literally `false` (the unit test `GUIDES_PORTAL_LIVE === false` guards
   this). The corpus IS non-empty, so render suppression cannot rely on an empty index -- it
   rests entirely on the flag. Re-assert the gate; do not "leave it and document" -- v1 ships
   zero "Used in" links by construction.

Unanticipated failures route to operator.

---

## Verification sub-agent note

Per AUG (phase-4-drafter-prompt.md ORCHESTRATOR AUGMENTATIONS section): the ORCHESTRATOR
runs the Explore verification pass on this draft at the boundary. No nested sub-agent is
dispatched by the drafter. The standard verification template from `phase-template.md`
(the 11-point checklist) applies at boundary; the orchestrator checks items 6/7/8/9/10/11
against this MD.
