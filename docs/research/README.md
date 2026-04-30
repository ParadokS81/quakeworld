# Research outputs

Closed investigations: paper-shaped docs capturing findings from focused work that produced knowledge but no implementation arc. The findings ARE the artifact.

## Filename convention

`YYYY-MM-DD-<slug>.md` (date-prefixed, lowercase-hyphenated, matches the superpowers convention).

## Placement rule

- **Ecosystem-scope** (cross-app, QW-community, upstream tooling) → here, at monorepo root `docs/research/`.
- **App-internal** (specific to one app's domain) → `apps/<app>/docs/research/`.

When in doubt: ecosystem-scope. Most QW-domain research transcends one app's boundary.

## Distinctions

- **vs `docs/superpowers/parking/`** — parking is parked-with-revival-intent. Research is closed (no revival intent). If you can articulate revival intent ("we'll come back to this when X"), write parking instead.
- **vs Layer 3 concept notes** — Layer 3 is ongoing pattern guidance. Research is a snapshot of one investigation at a point in time. Promotion possible but operator-decided.
- **vs `docs/superpowers/specs/`** — specs lead to implementation. Research is the artifact itself; no implementation arc forthcoming.

## Skill behavior

`docs/research/` is a recognized special-conventions space (parallel to the superpowers convention dirs). Excluded from birth check and orphan detection. Indexed via dir-level pointer in root `CLAUDE.md`, not per-file.

## Doctrine

`docs/superpowers/specs/2026-04-30-doc-philosophy-research-outputs.md` § Amendment 11.
