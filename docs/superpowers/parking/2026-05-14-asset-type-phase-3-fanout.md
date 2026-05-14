# Side-quest: Asset-type-curate Phase 3 fan-out (remaining 16 slugs)

**Type:** medium arc (1-2 sessions, ~3-5 hours dispatch + review)
**Surfaced:** 2026-05-14, after Round 3 calibration cleared 3 different slug shapes
**Pressure:** MEDIUM. The substrate (skill + L1 + seed) is calibrated; production work is ready when operator is.
**Predecessor:** Round 3 calibration commits 3d2a1867, 03449c65, 45617006; skill patches A-J landed user-global

---

## Why this arc exists

The asset-type-curate skill has been calibrated across 5 slug shapes (player_skin / skybox / charset / hud_element / map) covering 4 status flags (CONFIDENT / DIVERGENT / DOC-GAP / + skybox's DIVERGENT-Rich). The skill produces consistent, source-verified, LLM-feeder-shaped notes when dispatched cold against any of those shapes. The remaining 16 slugs in the seed need notes; the substrate is ready to support parallel fan-out.

The asset-type-curate parking doc (`2026-05-13-asset-type-curate-skill-arc.md`) describes Phase 3 as the production run. This handoff is the Phase 3 kickoff.

---

## Calibrated and shipped (5 slugs, do not redispatch)

| Slug | Flag | Lines | Notes |
|---|---|---|---|
| player_skin | CONFIDENT | -- | Earlier; concept-note partner at `../concept-notes/player-skins.md` |
| skybox | DIVERGENT | 283 body | Multi-mechanism; companion `_wind.cfg`; partner not warranted |
| charset | CONFIDENT | 44 body | Brief tier; FTE has no parallel L1 category |
| hud_element | DIVERGENT | 240 total | Bulk-L1 (129 -> 8 curated); companion `wad_file`; partner warranted |
| map | DOC-GAP | 203 total | Hub slug; 4 cross-type companions; partner warranted |

---

## Remaining 16 slugs

Pre-flight scan via the L1 site counts (2026-05-14 measurement). The first column is the **predicted flag** based on L1 + corpus signals; the runner may shift this in triage.

| Slug | Predicted flag | ez L1 | fte L1 | Predicted shape | Notes |
|---|---|---|---|---|---|
| `wad_file` | CONFIDENT | 7 | 3 | Brief | Container shape; companion to hud_element |
| `model_q1` | DIVERGENT | 17 | 86 | Rich | Bulk-L1 on FTE; companion `model_texture` |
| `model_texture` | DIVERGENT | 11 | (in texture) | Moderate | Sibling to map_texture; both share `textures/<x>/` install convention |
| `map_texture` | DIVERGENT | 10 | (in texture) | Moderate | Sibling to map_lighting / map_entities; skybox already references it (`Mod_LoadExternalSkyTexture`) |
| `map_lighting` | SPARSE | 7 | 0 | Brief-Moderate | .lit colored lighting sidecar |
| `map_entities` | SPARSE | (in null/12) | (in null) | Brief | .ent entity override sidecar |
| `sound` | DIVERGENT? | 22 | 3 | Moderate | Multi-format (.wav / .ogg) |
| `conback` | CONFIDENT? | (in screenshot 8) | ? | Brief | Console background image |
| `levelshot` | CONFIDENT? | 1 | 1 | Brief | Map intermission preview |
| `crosshair` | CONFIDENT? | 1 | 1 | Brief | Crosshair texture/image |
| `palette` | SPARSE | 3 | 0 | Brief | Engine-internal, rarely overridden |
| `colormap` | L1-GAP candidate | 0 | 0 | (halt) | First L1-GAP test; the L1 extractor may need the watchlist entry |
| `config` | DIVERGENT? | 6 | 19 | Moderate | Multi-engine; companion to many slugs |
| `demo` | SPARSE | 8 | 0 | Brief | User-recorded, not authored |
| `demo_archive` | SPARSE | 1 | 0 | Brief | .mvd.gz compressed demos |
| `locfile` | SPARSE/DOC-GAP | 3 | 2 | Brief | Teamplay location markers; co-installed with map (NOT a trigger companion per OPERATIONS.md) |

---

## Approach

### Recommended order (3 waves)

**Wave 1 -- low-risk Brief slugs (4 slugs in parallel):**
levelshot / crosshair / conback / palette

These are predicted CONFIDENT or SPARSE Brief slugs. Easy warmup; validates skill on the simplest shapes. Each runner ~15-25 min.

**Wave 2 -- the L1-GAP test (1 slug):**
colormap

Dispatch alone to test the L1-GAP halt flow cold. The skill should halt without producing a draft and route the extractor gap to HANDOVER.md / extractor refinement arc. If colormap surprisingly DOES have L1 evidence, drop into Wave 1 retroactively.

**Wave 3 -- the rest (11 slugs in parallel):**
wad_file / model_q1 / model_texture / map_texture / map_lighting / map_entities / sound / config / demo / demo_archive / locfile

Mix of shapes. Runner-time variable; cap at parallel-dispatch capacity. Each runner ~30-45 min.

### Dispatch shape

Each runner: fresh terminal, Sonnet 4.6 default effort, invocation `/asset-type-curate <slug>`. The skill is calibrated -- runners should produce clean output cold without orchestrator hand-holding. Per-slug handoff docs probably NOT needed for waves 1 and 3 (skill knows what to do); colormap (wave 2) may benefit from a 1-paragraph context note.

### Orchestrator role

Per-wave triage:
1. Verify draft against the skill's pre-submit checklist (template `## Pre-submit checklist`).
2. Spot-check for L1-CAT-AMBIGUOUS findings (route to L1 extractor refinement arc).
3. Commit by wave (or per-slug if territory diverges significantly).
4. Append concept-note partner findings to the concept-note partner authoring arc backlog.

### Concept-note partners likely surfaced

From the predicted shapes:
- `sound` may earn a partner (audio configuration, codec preferences, voice chat, recording).
- `config` may earn a partner (autoexec / scripts / aliases ecosystem).
- `model_q1` may earn a partner (custom models, MD3 support, weapon visualization).

These augment the existing concept-note partner authoring queue (sibling arc).

---

## Success criteria

- All 16 remaining asset-notes shipped (or L1-GAP-halted with extractor follow-up routed).
- README "Current notes" table populated with all 21 slugs.
- L1-CAT-AMBIGUOUS findings from fan-out routed to L1 extractor refinement arc.
- Concept-note partner findings routed to concept-note partner authoring arc.
- Bucket is feeder-ready for slipgate-app asset detection / management.

---

## Pointers

- Skill: `~/.claude/skills/asset-type-curate/SKILL.md` + references/ (patched 2026-05-14 with Round 3 findings)
- Seed: `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml`
- L1 outputs: `apps/qw-oracle/scripts/extractors/{ezquake,fte}/output/`
- Asset-notes bucket: `apps/qw-oracle/curated/asset-notes/`
- Investigation reports: `apps/qw-oracle/docs/asset-curation/`
- Bucket README + OPERATIONS: `apps/qw-oracle/curated/asset-notes/{README,OPERATIONS}.md`
- Calibration history: commits 3d2a1867, 03449c65, 45617006
- Sibling arcs:
  - L1 extractor refinement: `2026-05-14-l1-extractor-refinement-arc.md`
  - L1 vocabulary alignment audit: `2026-05-14-l1-vocabulary-alignment-audit.md`
  - Concept-note partner authoring: `2026-05-14-concept-note-partners-authoring.md`
- Original arc spec: `docs/superpowers/specs/2026-05-13-asset-type-curate-skill-design.md`
- Original arc parking: `docs/superpowers/parking/2026-05-13-asset-type-curate-skill-arc.md`
