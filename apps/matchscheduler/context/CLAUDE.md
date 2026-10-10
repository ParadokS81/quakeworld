# MatchScheduler `context/` -- specs, schema and slices

The design corpus the scheduler was built from, mostly pre-monorepo: the four Pillar specifications, the Firestore schema, the roadmap that sequenced 84 vertical slices, and the slice specs themselves. Current rules live in the app `CLAUDE.md`; the living map is `OVERVIEW.md`. Nothing here is a plan: the slices are the record of how each feature was specified, kept as history.

Rules in this scope:
- `SCHEMA.md` is current law; a schema change edits it in the same commit.
- `ARCHITECTURE-MAP.md` and `QWHUB-API-REFERENCE.md` are current reference and are kept true to the code.
- Pillars, roadmap, design docs and slices are chronicle: cite, never rewrite. Where a Pillar contradicts the code, the code and `OVERVIEW.md` win.

## Documentation index

| When you need... | Read... |
|---|---|
| Firestore collections, fields, rules summary, version history (Layer 2, current) | `SCHEMA.md` |
| File-by-file map and subsystem guide (Layer 3, current) | `ARCHITECTURE-MAP.md` |
| QWHub Supabase and CDN endpoints, response shapes (Layer 3, current) | `QWHUB-API-REFERENCE.md` |
| Product requirements, the sacred grid, the scheduling model (Pillar 1) | `Pillar 1 - PRD.md` |
| Hot/cold paths, performance targets, UX blueprint (Pillar 2) | `Pillar 2 - performance and ux.md` |
| Patterns, security model, data flow (Pillar 3) | `Pillar 3 - technical architecture.md` |
| Tech choices and rationale; its WSL tooling section is history (Pillar 4) | `Pillar 4 - technology stack.md` |
| Slice sequencing and progress as it was tracked | `PROJECT_ROADMAP.md` |
| How a slice spec was written | `PROJECT_SLICE_TEMPLATE.md` |
| Discord bridge and challenge lifecycle v2 design (shipped as slices 19.0a-d) | `DISCORD-BRIDGE-DESIGN.md` |
| Head-to-head tab design (shipped as slices 11.0a-c) | `H2H-FEATURE-DESIGN.md` |
| Resolved incidents: the past-slot hiding bug; the mobile blank screen | `analysis-past-slot-bug.md`, `debug-mobile-blank-screen.md` |
| The 84 vertical slice specs, `slice-<n>-<topic>.md`: 1.2 to 22.0 in roadmap order, A1-A5 admin, M1.0 mobile home calendar, P3.1-P5 voice-replay privacy and playback | `slices/` |
| UI screenshots and the logo seed list (not documents) | `UI_examples/` |

## Subsystem scopes

None. `slices/` is indexed above at folder grain; a per-file index is the remainder of the doc-reconciliation decision in the root `HANDOVER.md`.
