# Worked example: weapon-scripts rewrite

Illustrative walkthrough of the ten phases, drawn from the 2026-04-25 session that surfaced the need for this skill. Real invocations would produce similar-shaped output.

Source guide: `research/repos/ezquake-docs/docs/docs/weapon-scripts.md` (55 lines, last content-edited 2022-10-26).

---

## Phase 1 — Intake

- User names `weapon-scripts`. File confirmed at `research/repos/ezquake-docs/docs/docs/weapon-scripts.md`.
- Guide content loaded.
- Existing note check: nothing in `concept-notes/` matches → **fresh rewrite path**.
- Stale-date: 2022-10-26 (last content edit). Well before the 2022-11-21 cutoff; presumed stale.

## Phase 2 — Entity extraction

```
cvars: [cl_weaponpreselect, cl_weaponhide]
commands: [weapon, impulse, +attack]
macros: []
keynames: [q, mouse1]
```

## Phase 3 — Layer 1 verification

| Entity | Type | Result |
|---|---|---|
| cl_weaponpreselect | cvar | exists_in_layer1 (3.6.1, source_backed) |
| cl_weaponhide | cvar | exists_in_layer1 (3.6.1, source_backed) |
| weapon | command | exists_in_layer1 (3.6.1, source_backed) |
| impulse | command | exists_in_layer1 (3.6.1, source_backed — built-in) |
| +attack | command | exists_in_layer1 (3.6.1, source_backed) |
| q, mouse1 | keyname | exists_in_layer1 |

All exists. Good. No phase 4 work needed for these.

## Phase 4 — Source corroboration (not invoked for weapon-scripts phase 3 results)

N/A for these entities. Phase 4 would fire if phase 3 had returned `not_in_layer1` or `different_form`.

## Phase 5 — Coverage gap detection

Topic area: weapon-selection commands. Source file(s) to scan: `src/cl_input.c`.

Layer 1 query for weapon-related commands:
```
SELECT name FROM entities WHERE project='ezquake' AND type='command'
AND (name LIKE '%fire%' OR name LIKE '%weapon%');
```

Results include: `+fire`, `-fire`, `+fire_ar`, `-fire_ar`, `weapon`.

Diff against guide mentions: **guide omits `+fire`, `-fire`, `+fire_ar`, `-fire_ar`.**

Layer 1 query for weapon-related macros:
```
SELECT name FROM entities WHERE project='ezquake' AND type='macro'
AND (name LIKE '%weapon%' OR name LIKE '%best%');
```

Results: `bestweapon`, `bestammo`, `weapon`, `weaponnum`, `weapons`.

Diff against guide mentions: **guide omits all five macros.**

Coverage gaps (priority order):
1. `+fire` / `-fire` — core weapon-select-and-fire command. Added 2011. **15 years of missing coverage.**
2. `+fire_ar` / `-fire_ar` — anti-rollover variant. Added 2021.
3. `bestweapon` / `bestammo` macros — core for script authors building auto-selection logic.
4. `cl_weaponforgetorder` — related cvar controlling cross-shot persistence. Added 2014.

## Phase 6 — Cross-engine check

Guide doesn't explicitly state "works in FTE," but weapon scripting is historically a cross-engine concept. Run grep:

```
grep -rn "cl_weaponpreselect\|+fire" research/repos/fte-source/ | head -5
```

If FTE source tree is present but has no match: the mechanisms are ezQuake-specific. If present with matches: record cross_engine_covered. In the 2026-04-25 session the FTE source was not loaded for Layer 1 but FTE's client source had no direct `+fire` equivalent.

Classification: **cross_engine_tbd_pending_phase_2d** — we'll verify when Phase 2d FTE Layer 1 lands. For now, note in frontmatter `scope: engine-specific, engines_covered: [ezquake]` and add hold-for-later marker in References.

## Phase 7 — Classification and path decision

Findings summary:
- 0 entity errors (phase 3).
- 0 Layer 1 extraction gaps (phase 4).
- **4 major coverage gaps** (phase 5) representing 15 years of missing coverage.
- Cross-engine status: TBD.
- Guide framing ("In older QuakeWorld clients you had to write a script") is dated — the alternative has existed since 2006, and the `+fire` path since 2011.

Classification: **substantial-rewrite**.

Path decision: **Path 2 (rewrite with guide as source material)**. Rationale: light editing would produce a Frankenstein — vikpe's voice saying things vikpe didn't say. Cleaner to author from scratch, cite vikpe as primary_contributor + original impulse-era authors from Layer 1 blame, produce a coherent current-reality note.

## Phase 8 — Authoring

File: `apps/qw-oracle/curated/concept-notes/weapon-scripting-in-ezquake.md`

Frontmatter:
```yaml
---
title: "Weapon scripting in ezQuake: preselect, +fire, and macro helpers"
slug: weapon-scripting-in-ezquake
topic: domain-guide
status: draft
authored_by: qw-oracle
source_url: https://ezquake.com/docs/weapon-scripts
imported_from: <sha of weapon-scripts.md at import time>
last_imported_at: 2026-04-25
upstream_status: gap-candidate
upstream_target: weapon-scripts
primary_contributors:
  - "@vikpe"
  - "@speedy"           # pre-vikpe weapon-command author (2006, from Layer 1 blame)
related_entities:
  - ezquake:cvar:cl_weaponpreselect
  - ezquake:cvar:cl_weaponhide
  - ezquake:cvar:cl_weaponforgetorder
  - ezquake:command:weapon
  - ezquake:command:+fire
  - ezquake:command:+fire_ar
  - ezquake:macro:bestweapon
  - ezquake:macro:bestammo
scope: engine-specific
engines_covered: [ezquake]
last_updated: 2026-04-25
---
```

Shape: **domain walkthrough** (covers feature overview + per-entity breakdown + conventions + failure modes).

Body outline (sketched — actual writing happens in real session):

- `## Summary` — three scripts-era approaches + the modern trio (weapon + preselect + hide) + the atomic +fire. Two sentences.
- `## The three concerns` — separable: preselect (virtual vs immediate), +fire (atomic select+fire), hide (post-shot).
- `## Recommended patterns` — +fire binds for competitive play; weapon+preselect for careful selection; impulse-based for universal compatibility.
- `## Failure modes` — impulse-only scripts fail in edge cases; cl_weaponhide axe quirks; cross-shot order persistence.
- `## Consumer implications` — slipgate-app bind parser needs to recognize +fire as a script shape.
- `## References` — source guide citation, Layer 1 blame for key commits, hold-for-later marker for FTE, pre-vikpe attribution.
- `## Related concept notes` — none yet; forward-point to a future "weapon selection cross-engine" note.

## Phase 9 — Breadcrumb capture

**Gap-report entries** (appended to `_gap-report.md`):

```markdown
### +fire (command)

- **Oracle Layer 1 first_seen:** 3.6.1 (command existed since ezQuake 2011)
- **Current desc:** Select best-available weapon from priority list and fire it in one atomic action
- **Upstream page:** weapon-scripts
- **Suggested placement:** new section after "Using the weapon command" titled "The +fire shortcut"
- **Notes:** Guide omits this command entirely despite 15 years of availability. Primary modern scripting pattern.

### +fire_ar (command)

- **Oracle Layer 1 first_seen:** 3.6.1 (command added 2021)
- **Current desc:** Anti-rollover +fire variant
- **Upstream page:** weapon-scripts
- **Suggested placement:** sub-bullet within the +fire section
- **Notes:** Solves key-rollover edge cases in fast switching.

### bestweapon (macro)

- **Oracle Layer 1 first_seen:** 3.6.1
- **Current desc:** Macro returning impulse number of best-available weapon
- **Upstream page:** weapon-scripts (or macros)
- **Suggested placement:** new "Macros for custom scripts" subsection
- **Notes:** Load-bearing for any user-authored weapon-selection logic.
```

(plus entries for `bestammo`, `cl_weaponforgetorder`, `+fire_ar`)

**Hold-for-later markers** in the note's References section:
```
- Cross-engine coverage (FTE/MVDSV/KTX): TBD pending Phase 2d/2e Layer 1 extraction. See HANDOVER.md § Phase 2d-2h.
```

**OPERATIONS.md learning candidates:**
- Attribution pattern: pre-vikpe-era authors identified via Layer 1 blame; add a concrete example to OPERATIONS.md §4 credit norm once a second case surfaces.
- Path 1 vs Path 2 decision rule: guide omitting 15+ years of core coverage is a clear Path 2 signal. Add as an example in OPERATIONS.md §2's choosing-a-path section once a second similar case surfaces.

One-data-point rule: propose the pattern, don't commit yet. Wait for second instance in a future session.

## Phase 10 — Review and commit

User reviews drafts. When approved:

```
docs(qw-oracle): weapon-scripting-in-ezquake — Path 2 rewrite from ezquake.com/docs/weapon-scripts

Classified as substantial-rewrite: guide omits +fire (15 years of coverage) and the
five bestweapon/bestammo macros. Rewrote as Path 2 with vikpe + speedy (pre-vikpe-era
weapon command author, 2006) as primary_contributors. Scope: ezquake engine-specific
with FTE equivalents marked TBD-Phase-2d. Gap-report entries added for +fire, +fire_ar,
bestweapon, bestammo, cl_weaponforgetorder — contributor onboarding kit for eventual
upstream PR to ezquake.com.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Push when user confirms.
